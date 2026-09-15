/**
 * V3-1 TASK-107 / ADR-V3-003 / ADR-V3-004 — the **no-Chromium** density gate.
 *
 * This is the fast feedback layer of the three-piece density gate:
 *   ① caliber constants + matrix shape  (this file, seconds, no browser)
 *   ② real-product Chromium matrix       (`test/ui/density.mjs`, `npm run test:density`)
 *   ③ static DOM contract                (this file, the "back door" plug)
 *
 * It plugs the four back doors that a browser measurement alone cannot see:
 *   - the thresholds drifting away from spec §9.2 (verbatim equality);
 *   - the caliber being re-implemented somewhere else (matrix + selector set);
 *   - the measurement source secretly consulting computed styles / layout boxes
 *     (which would let `display:none` buy density budget — RP-V3-03);
 *   - the static DOM re-nesting a risk row inside a foldable container.
 *
 * Everything here is asserted on files, so it runs in the memory-tight serial
 * chain without ever launching a browser (NFR-V3-012).
 *
 * Supersession: NEW file, zero deletions (V31-S4).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  BANNED_MEASURE_APIS,
  CHARS_PER_LINE,
  DENSITY_LIMITS,
  DENSITY_MATRIX_SIZE,
  DENSITY_MEASURE_SOURCE,
  DENSITY_TIER_ORDER,
  DENSITY_VIEWPORTS,
  DENSITY_VIEWPORT_HEIGHT,
  RISK_SUBSCENARIOS,
  bannedApisInMeasureSource,
  evaluateDensity,
  evaluateDelta,
} from './ui/density-metrics.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));

/** Walk up from `dist-test/test/` (or the source dir) to the package root. */
function packageRoot(): string {
  let dir = HERE;
  for (let i = 0; i < 6; i += 1) {
    if (existsSync(resolve(dir, 'package.json')) && existsSync(resolve(dir, 'src', 'ui', 'sidepanel'))) return dir;
    dir = resolve(dir, '..');
  }
  throw new Error(`package root not found from ${HERE}`);
}
const PKG = packageRoot();
const INDEX_HTML = resolve(PKG, 'src/ui/sidepanel/index.html');
const BASELINE_JSON = resolve(PKG, 'docs/v3-density-baseline.json');

/**
 * The **54 id baseline** frozen at the v1 contract (ADR-V3-017 / ADR-V3-009).
 * `index.html` must remain a superset: renaming an id is a hard FAIL, because
 * three existing browser gates address these ids directly and are protected by
 * the supersession ledger.
 */
const V1_ID_BASELINE: readonly string[] = Object.freeze([
  'panel-top', 'status', 'llm-status', 'session-label', 'topbar', 'open-settings', 'authorize',
  'more-actions', 'revoke', 'rebind', 'audit', 'audit-count', 'session-box', 'session-list',
  'group-name', 'group-create', 'group-select', 'group-add', 'llm-test-result', 'panel-main',
  'log', 'scroll-bottom', 'tree-fab', 'tree-drawer', 'panel-bottom', 'env-guard', 'site-hint',
  'site-hint-title', 'site-hint-detail', 'site-hint-action', 'onboarding', 'discovery-notice',
  'discovery-title', 'discovery-detail', 'notice', 'confirm', 'confirm-summary', 'confirm-allow',
  'confirm-deny', 'ask', 'ask-prompt', 'ask-options', 'ask-input', 'ask-submit', 'ask-cancel',
  'send-reason', 'consent-slot', 'composer', 'input', 'send', 'settings-view', 'settings-header',
  'settings-back', 'settings-root',
]);

/** C1's tag whitelist, verbatim from spec §9.1. */
const C1_TAGS = ['BUTTON', 'A', 'INPUT', 'SELECT', 'TEXTAREA'] as const;

/** v3 L0 containers that must exist and stay foldable-independent. */
const L0_CONTAINERS = ['risk-rail', 'l0-decision', 'l0-statusbar', 'view-host', 'l0-status-band', 'l1-more', 'l1-ref', 'l2-entries'];

// ── a tiny, dependency-free tag scanner (good enough for our own HTML) ───────
interface TagInfo {
  tag: string;
  attrs: Record<string, string | true>;
  parent: number;
  children: number[];
}

const VOID_TAGS = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']);

/**
 * Remove anything that is not markup: comment bodies (our own docs mention
 * `<body>` in prose, which a naive scanner would read as an element) and the
 * inner text of `<style>` / `<script>` (CSS `>` combinators etc.).
 */
function sanitizeMarkup(source: string): string {
  return source
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/(<style[^>]*>)[\s\S]*?(<\/style>)/g, '$1$2')
    .replace(/(<script[^>]*>)[\s\S]*?(<\/script>)/g, '$1$2');
}

function parseTags(html: string): { tags: TagInfo[]; idsIndex: Map<string, number>; bodyIndex: number } {
  const tags: TagInfo[] = [];
  const stack: number[] = [];
  const idsIndex = new Map<string, number>();
  let bodyIndex = -1;
  const re = /<(\/?)([a-zA-Z][a-zA-Z0-9-]*)((?:\s+[^<>]*?)?)\/?>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const closing = m[1] === '/';
    const tag = m[2].toLowerCase();
    const rawAttrs = m[3] ?? '';
    if (closing) {
      for (let i = stack.length - 1; i >= 0; i -= 1) {
        if (tags[stack[i]].tag === tag) {
          stack.length = i;
          break;
        }
      }
      continue;
    }
    const attrs: Record<string, string | true> = {};
    const attrRe = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g;
    let a: RegExpExecArray | null;
    while ((a = attrRe.exec(rawAttrs))) {
      const name = a[1].toLowerCase();
      const value = a[2] ?? a[3] ?? a[4] ?? true;
      if (!(name in attrs)) attrs[name] = value;
    }
    const info: TagInfo = { tag, attrs, parent: stack.length ? stack[stack.length - 1] : -1, children: [] };
    const index = tags.length;
    tags.push(info);
    if (info.parent >= 0) tags[info.parent].children.push(index);
    const id = typeof attrs.id === 'string' ? attrs.id : undefined;
    if (id) idsIndex.set(id, index);
    if (tag === 'body') bodyIndex = index;
    if (!VOID_TAGS.has(tag) && !(attrs['data-self-closing'] === true)) stack.push(index);
  }
  return { tags, idsIndex, bodyIndex };
}

const html = readFileSync(INDEX_HTML, 'utf8');
const parsed = parseTags(sanitizeMarkup(html));
const descendants = (root: number): number[] => {
  const out: number[] = [];
  const walk = (i: number) => {
    for (const c of parsed.tags[i].children) {
      out.push(c);
      walk(c);
    }
  };
  walk(root);
  return out;
};
const ancestors = (index: number): number[] => {
  const out: number[] = [];
  let cur = parsed.tags[index].parent;
  while (cur >= 0) {
    out.push(cur);
    cur = parsed.tags[cur].parent;
  }
  return out;
};

// ── ① thresholds == spec §9.2 (verbatim) ────────────────────────────────────
test('density §9.2: 三档阈值逐字相等，且只允许收紧', () => {
  assert.deepEqual(DENSITY_LIMITS, {
    default: { clickables: 7, lines: 15 },
    firstRun: { clickables: 9, lines: 20 },
    risk: { clickables: 17, lines: 35 },
  });
  assert.equal(CHARS_PER_LINE, 34, 'C2 的 34 是 pin 常量');
  assert.deepEqual(DENSITY_VIEWPORTS, [320, 400, 520]);
  assert.equal(DENSITY_VIEWPORT_HEIGHT, 900);
});

// ── ② matrix shape: 3 tiers × 3 viewports = 9 mandatory cells + 5 risks ─────
test('density: 矩阵规模 = 3 档 × 3 视口 = 9 强制格，风险子场景 = 5', () => {
  assert.equal(DENSITY_TIER_ORDER.length, 3);
  assert.equal(DENSITY_MATRIX_SIZE, 9);
  assert.equal(DENSITY_MATRIX_SIZE, DENSITY_TIER_ORDER.length * DENSITY_VIEWPORTS.length);
  assert.equal(RISK_SUBSCENARIOS.length, 5);
  assert.deepEqual(
    RISK_SUBSCENARIOS.map((r) => r.key),
    ['unauthorized', 'probing', 'hardline', 'confirm', 'staleRef'],
  );
  for (const sub of RISK_SUBSCENARIOS) {
    assert.ok(sub.dataRiskClass && sub.productPath, `${sub.key} 必须带 data-risk-class 与构造通路`);
  }
});

// ── ③ C1 selector set == spec §9.1 ──────────────────────────────────────────
test('density C1: 元素选择器集合与 §9.1 定义一致，且仅 hidden 祖先豁免', () => {
  const tagPattern = C1_TAGS.join('|');
  assert.ok(DENSITY_MEASURE_SOURCE.includes(tagPattern), 'C1 标签集合必须出现在测量源码中');
  assert.match(DENSITY_MEASURE_SOURCE, /tabindex/);
  assert.match(DENSITY_MEASURE_SOURCE, /!== '-1'|!== "-1"/);
  // the only visibility implementation is the `hidden` walk
  assert.match(DENSITY_MEASURE_SOURCE, /node\.hidden === true/);
  const definitions = DENSITY_MEASURE_SOURCE.split('const visibleIn =').length - 1;
  assert.equal(definitions, 1, 'visibleIn 只能有一处实现（结构上消灭双口径）');
  // no CSS-based exemption sneaks in
  assert.equal(bannedApisInMeasureSource().length, 0, `测量源码命中禁用 API：${bannedApisInMeasureSource().join(', ')}`);
  assert.deepEqual(BANNED_MEASURE_APIS, ['getComputedStyle', 'offsetParent', 'getBoundingClientRect', 'aria-hidden']);
});

// ── ④ anti-cheat: the banned APIs must be absent from the source string ─────
test('density 反作弊: 测量源码零命中 getComputedStyle / offsetParent / getBoundingClientRect / aria-hidden', () => {
  for (const needle of BANNED_MEASURE_APIS) {
    assert.equal(DENSITY_MEASURE_SOURCE.includes(needle), false, `测量源码不得包含 ${needle}`);
  }
  // and the *file* keeps them only in the ban list, never in the expression
  const file = readFileSync(resolve(PKG, 'test/ui/density-metrics.mjs'), 'utf8');
  const expression = /export const DENSITY_MEASURE_TEMPLATE = `([\s\S]*?)`;/.exec(file)?.[1] ?? '';
  assert.ok(expression.length > 400, '测量表达式必须真实存在');
  for (const needle of BANNED_MEASURE_APIS) {
    assert.equal(expression.includes(needle), false, `测量表达式内不得出现 ${needle}`);
  }
});

// ── ⑤ static DOM contract of index.html ────────────────────────────────────
test('index.html: 54 个 v1 id 全部保留（零重命名）且新增容器齐备', () => {
  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
  assert.equal(new Set(ids).size, ids.length, 'id 不得重复');
  const missing = V1_ID_BASELINE.filter((id) => !ids.includes(id));
  assert.deepEqual(missing, [], `v1 的 54 个 id 必须全部保留：缺失 ${missing.join(', ')}`);
  for (const id of L0_CONTAINERS) assert.ok(ids.includes(id), `缺少 v3 容器 #${id}`);
});

test('index.html: 风险位祖先闭包无 hidden / 无折叠触发器，且是 body 直接子元素', () => {
  const railIndex = parsed.idsIndex.get('risk-rail');
  assert.notEqual(railIndex, undefined, '#risk-rail 必须存在');
  const chain = [railIndex!, ...ancestors(railIndex!)];
  for (const index of chain) {
    const info = parsed.tags[index];
    assert.equal('hidden' in info.attrs, false, `#risk-rail 祖先 <${info.tag}> 不得带 hidden`);
    assert.equal('aria-expanded' in info.attrs, false, `#risk-rail 祖先 <${info.tag}> 不得带 aria-expanded`);
  }
  assert.equal(parsed.tags[railIndex!].parent, parsed.bodyIndex, '#risk-rail 必须是 body 直接子元素');
  // L0 ↔ L1/L2 must not interleave
  for (const index of descendants(railIndex!)) {
    const info = parsed.tags[index];
    assert.equal('data-l1-panel' in info.attrs, false, '风险位内不得出现 L1 面板');
    assert.equal('data-l2-view' in info.attrs, false, '风险位内不得出现 L2 视图');
  }
  for (const id of ['l0-decision', 'l0-statusbar', 'l0-status-band']) {
    for (const index of ancestors(parsed.idsIndex.get(id)!)) {
      const info = parsed.tags[index];
      assert.equal('data-l1-panel' in info.attrs, false, `#${id} 不得位于 L1 面板内`);
      assert.equal('data-l2-view' in info.attrs, false, `#${id} 不得位于 L2 视图内`);
    }
  }
});

test('index.html: 收起一律 hidden 属性；composer 默认 hidden 且仍是底区末元素；三区文档序不变', () => {
  for (const id of ['topbar', 'l1-more', 'l1-ref', 'l2-entries', 'view-host', 'settings-view', 'tree-fab', 'tree-drawer', 'composer', 'ask', 'confirm', 'scroll-bottom']) {
    const index = parsed.idsIndex.get(id)!;
    assert.ok(index !== undefined, `#${id} 必须存在`);
    assert.equal('hidden' in parsed.tags[index].attrs, true, `#${id} 必须默认带 hidden 属性（不得用 CSS 隐身）`);
  }
  const bottom = parsed.idsIndex.get('panel-bottom')!;
  const bottomChildren = parsed.tags[bottom].children;
  const lastChild = parsed.tags[bottomChildren[bottomChildren.length - 1]].attrs.id;
  assert.equal(lastChild, 'composer', '#composer 必须仍是 #panel-bottom 的末元素');
  const body = parsed.tags[parsed.bodyIndex];
  const zoneOrder = body.children
    .map((c) => parsed.tags[c].attrs.id)
    .filter((id): id is string => typeof id === 'string');
  assert.deepEqual(
    zoneOrder.filter((id) => ['panel-top', 'panel-main', 'panel-bottom', 'risk-rail', 'l0-statusbar'].includes(id)),
    ['risk-rail', 'panel-top', 'panel-main', 'l0-statusbar', 'panel-bottom'],
    'body 文档序：风险位最上层 → 三区 → 状态栏（composer 贴底契约不变）',
  );
  assert.match(html, /body\s*\{[^}]*display:\s*flex/, 'body 必须仍是 flex 容器');
  assert.match(html, /body\s*\{[^}]*overflow:\s*hidden/, 'body 必须仍是 overflow:hidden');
});

test('index.html: 新增 token 在 :root 与暗色 @media 双处对称', () => {
  const rootBlock = /:root\s*\{([\s\S]*?)\}/.exec(html)?.[1] ?? '';
  const darkBlock = /@media \(prefers-color-scheme:\s*dark\)\s*\{([\s\S]*?)\n\s*\}/.exec(html)?.[1] ?? '';
  const v3Tokens = ['--l0-band-bg', '--l0-rail-bg', '--badge-bg', '--risk-bg', '--ok-badge-bg'];
  for (const token of v3Tokens) {
    assert.ok(rootBlock.includes(token), `:root 缺少 ${token}`);
    assert.ok(darkBlock.includes(token), `暗色主题缺少 ${token}`);
  }
  assert.match(html, /\[hidden\]\s*\{\s*display:\s*none\s*!important/, '[hidden] 必须强制 display:none');
});

// ── ⑥ RP-V3-02(a): the threshold provably participates in the judgement ────
test('RP-V3-02(a): 阈值 ±1 必然翻转判定（阈值不是被忽略的常量）', () => {
  assert.equal(evaluateDensity({ clickables: 7 }, 'default', { clickables: 6, lines: 15 }).ok, false);
  assert.equal(evaluateDensity({ clickables: 7 }, 'default').ok, true);
  assert.equal(evaluateDensity({ clickables: 7, lines: 15 }, 'default').ok, true);
  assert.equal(evaluateDensity({ clickables: 7, lines: 16 }, 'default').ok, false);
  const verdict = evaluateDensity({ clickables: 8, lines: 31 }, 'default');
  assert.equal(verdict.ok, false);
  assert.deepEqual(verdict.exceeds, ['C1 可点元素 8 > 7', 'C2 可见正文行 31 > 15']);
  assert.match(verdict.message, /C1 实测 8 \/ 上限 7/, 'message 必须含实测值 vs 上限 vs 口径');
  assert.match(verdict.message, /口径 C1/);
});

test('AC-V3-003: 风险增量只能被风险类元素占用；无稳定键元素直接 FAIL', () => {
  const base = {
    elementsWithKeys: [
      { key: '#l0-status-band', clickable: true, block: true, chars: 20, risk: false },
      { key: '#l0-pick', clickable: true, block: true, chars: 6, risk: false },
    ],
  };
  const ok = {
    elementsWithKeys: [
      ...base.elementsWithKeys,
      { key: '#risk-rail', clickable: false, block: true, chars: 20, risk: true },
      { key: '@risk-row-hardline', clickable: true, block: true, chars: 30, risk: true },
    ],
  };
  assert.deepEqual(evaluateDelta(base, ok).violations, []);
  const leaky = {
    elementsWithKeys: [...base.elementsWithKeys, { key: '#sneaky-button', clickable: true, block: true, chars: 3, risk: false }],
  };
  assert.equal(evaluateDelta(base, leaky).violations.length, 1, '非风险类新增可点必须 FAIL');
  const unkeyed = { elementsWithKeys: [...base.elementsWithKeys, { key: null, clickable: true, block: false, chars: 0, risk: true }] };
  assert.equal(evaluateDelta(base, unkeyed).violations.length, 1, '无稳定键元素必须直接 FAIL');
  assert.equal(evaluateDelta(undefined, ok).violations.length, 1);
});

// ── ⑦ C4 registration (baseline file, when it exists) ─────────────────────
test('AC-V3-007: C4 常驻分区变化显式登记（基线文件存在时校验形状与方向）', () => {
  if (!existsSync(BASELINE_JSON)) return; // written in TASK-112, after the first real measurement
  const baseline = JSON.parse(readFileSync(BASELINE_JSON, 'utf8'));
  assert.ok(baseline.measuredOn, '基线必须含日期');
  assert.ok(baseline.source, '基线必须含来源');
  assert.ok(baseline.designCaliber, '设计稿口径必须与真实产物口径分列（A-UI-001）');
  assert.ok(baseline.tiers?.default && baseline.tiers?.firstRun && baseline.tiers?.risk, '三档必须具备');
  assert.ok(baseline.regions, 'C4 变化登记（只登记不上限）');
  assert.ok(baseline.regions.note, 'C4 必须写明「分区数变化 ≠ 密度变差」的反直觉事实');
  for (const tier of ['default', 'firstRun']) {
    for (const vp of ['320', '400', '520']) {
      const cell = baseline.tiers[tier][vp];
      assert.ok(cell, `缺 ${tier} × ${vp} 登记格`);
      const limits = DENSITY_LIMITS[tier as keyof typeof DENSITY_LIMITS];
      assert.ok(cell.clickables <= limits.clickables, `${tier}@${vp} 可点实测必须 ≤ 上限`);
      assert.ok(cell.lines <= limits.lines, `${tier}@${vp} 行数实测必须 ≤ 上限`);
    }
  }
  // 风险档：15 登记格（5 子场景 × 3 视口）逐一登记；强制判定用 worst（最差值）。
  const risk = baseline.tiers.risk;
  assert.ok(risk.worst, '缺 risk.worst（15 格最差值）');
  assert.equal(Object.keys(risk.subs ?? {}).length, RISK_SUBSCENARIOS.length, '风险子场景登记格必须为 5 类');
  for (const sub of RISK_SUBSCENARIOS) {
    for (const vp of ['320', '400', '520']) {
      const cell = risk.subs[sub.key]?.[vp];
      assert.ok(cell, `缺 risk(${sub.key}) × ${vp} 登记格`);
      assert.ok(cell.clickables <= DENSITY_LIMITS.risk.clickables, `risk(${sub.key})@${vp} 可点必须 ≤ 上限`);
      assert.ok(cell.lines <= DENSITY_LIMITS.risk.lines, `risk(${sub.key})@${vp} 行数必须 ≤ 上限`);
    }
  }
  assert.ok(risk.worst.clickables <= DENSITY_LIMITS.risk.clickables, 'risk 最差值可点必须 ≤ 上限');
  assert.ok(risk.worst.lines <= DENSITY_LIMITS.risk.lines, 'risk 最差值行数必须 ≤ 上限');
  assert.ok(baseline.logClientHeightFloor > 0, '必须登记消息区下界（几何契约迁移的单一来源）');
  assert.equal(baseline.direction, 'tighten-only', '基线只允许收紧');
});
