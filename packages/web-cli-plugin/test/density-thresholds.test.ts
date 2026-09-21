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
  LOG_CLIENT_HEIGHT_FLOOR,
  RISK_SUBSCENARIOS,
  bannedApisInMeasureSource,
  evaluateDensity,
  evaluateDelta,
} from './ui/density-metrics.mjs';
import {
  SIDEPANEL_BASELINE_BYTES,
  SIDEPANEL_BASELINE_TOLERANCE,
  SIDEPANEL_CEILING,
  SIDEPANEL_CEILING_CAP,
  SIDEPANEL_CEILING_CAP_RECORD,
} from './size-baseline.js';

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
// V4-1（TASK-512 / 父 ADR-V4-010）：**当前**体积/密度的登记载体是 v4 基线；v3 基线冻结为历史。
const V4_BASELINE_JSON = resolve(PKG, 'docs/v4-density-baseline.json');
const CURRENT_BASELINE_JSON = existsSync(V4_BASELINE_JSON) ? V4_BASELINE_JSON : BASELINE_JSON;

/**
 * The **54 id baseline** frozen at the v1 contract (ADR-V3-017 / ADR-V3-009).
 * `index.html` must remain a superset: renaming an id is a hard FAIL, because
 * three existing browser gates address these ids directly and are protected by
 * the supersession ledger.
 *
 * **V4-1 (ADR-V4-017) registers exactly four retirements and one rename**:
 *   · retired containers — `panel-top` (element reused as `#region-toolbar`),
 *     `panel-main` (reused as `#region-stream`), `panel-bottom` (its children moved
 *     into `#stream` hosts / the status bar), `log` (**renamed** to `stream`);
 *   · everything else keeps its id. The two lists below make both halves a machine
 *     fact: a *fifth* retirement or a *second* rename fails immediately.
 */
const V4_RETIRED_IDS: readonly string[] = Object.freeze([
  'panel-top',
  'panel-main',
  'panel-bottom',
  // V4-3 (TASK-707 / ADR-V4-030 decision 6): the exclusive decision slot's static
  // ids are retired from `index.html`. The stream `askuser` / `auth` cards mint the
  // same id family **on the OPEN card only** (`cards/askuser.ts` / `cards/auth.ts`),
  // so the runtime selectors still resolve while the static markup is gone.
  'confirm',
  'confirm-summary',
  'confirm-allow',
  'confirm-deny',
  'ask',
  'ask-prompt',
  'ask-options',
  'ask-input',
  'ask-submit',
  'ask-cancel',
  // V4.5-1 W2（TASK-V45-105 / ADR-V45-001 §1）：五条提示带**真退役**（节点与包裹层移除）。
  // 它们的事实唯一载体 = 流内系统行（`[data-kind]`）+ `firstRunCard`；长文案走行 `title`。
  // `#send-reason` **不在退役面**（`#region-statusbar` 内保留），故不在此列。
  'env-guard',
  'site-hint',
  'site-hint-title',
  'site-hint-detail',
  'site-hint-action',
  'onboarding',
  'discovery-notice',
  'discovery-title',
  'discovery-detail',
  'notice',
  // V4.5-1 W3（TASK-V45-107~110 / ADR-V45-002）：4 个固定位置宿主与决策壳 / L1 组的
  // 静态容器一并**真退役**。事实面 = 流内卡（选项池 / 后果预演 / 引用证据 / 恢复区）+
  // `#view-host` 只读承载块 + 设置「帮助」分区；`#composer` / `#input` / `#send` /
  // `#send-reason` / `#rebind` **保留**（兼容读取面），故不在此列。
  'l0-decision',
  'l0-kicker',
  'l0-more',
  'l0-ref-toggle',
  'l0-ref-badge',
  'l0-receipt-summary',
  'l1-group',
  'l1-history-toggle',
  'l1-history',
  'l1-history-rows',
  'l1-local-tree-toggle',
  'l1-receipt-toggle',
  'l1-gestures-toggle',
]);
const V4_ID_RENAMES: Readonly<Record<string, string>> = Object.freeze({ log: 'stream' });

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

/**
 * Containers that must exist in the static markup (V4.5-1 W3 等价重锚): the retired
 * decision shell / L1 group ids are replaced by the **new carriers** — the two L2
 * read-only blocks (whose interiors keep the legacy content ids) — while the two
 * card-minted faces (`l1-more` / `l1-consequences`) are deliberately absent because
 * they are minted per decision card.
 */
const L0_CONTAINERS = ['risk-rail', 'risk-chips', 'risk-detail', 'view-host', 'l2-tree-attribution', 'l1-local-tree', 'l2-audit-evidence', 'l1-receipt', 'l2-audit-count', 'l2-entries', 'region-toolbar', 'region-stream', 'region-statusbar', 'stream', 'statusbar-text', 'theme-toggle'];

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
test('index.html: v1 id 基线除 4 处登记退役外全部保留（唯一重命名 #log → #stream）', () => {
  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
  assert.equal(new Set(ids).size, ids.length, 'id 不得重复');
  const survivors = V1_ID_BASELINE.filter((id) => !V4_RETIRED_IDS.includes(id) && !(id in V4_ID_RENAMES));
  const missing = survivors.filter((id) => !ids.includes(id));
  assert.deepEqual(missing, [], `v1 的 id 必须全部保留（除登记退役外）：缺失 ${missing.join(', ')}`);
  // 反证：退役项必须真的不在文档里（否则「退役」是空话）。
  for (const id of V4_RETIRED_IDS) assert.equal(ids.includes(id), false, `#${id} 必须已退役（id 零残留）`);
  for (const [oldId, next] of Object.entries(V4_ID_RENAMES)) {
    assert.equal(ids.includes(oldId), false, `#${oldId} 必须已被重命名`);
    assert.ok(ids.includes(next), `重命名目标 #${next} 必须存在`);
  }
  // 唯一性：v1 基线里除 log 外的每一个 id 都不允许被改写成别的名字。
  assert.equal(Object.keys(V4_ID_RENAMES).length, 1, 'V4-1 只允许一个 id 重命名');
  for (const id of L0_CONTAINERS) assert.ok(ids.includes(id), `缺少容器 #${id}`);
});

test('index.html: V4 三区骨架（body 直挂 / 文档序 / 状态栏非流后代）与风险位的静态归属', () => {
  // ── 三区必须是 body 直挂，且文档序 = 工具栏 → 聊天流 → 状态栏（S7 结构保证） ──
  const zones = ['region-toolbar', 'region-stream', 'region-statusbar'];
  for (const id of zones) {
    const index = parsed.idsIndex.get(id);
    assert.notEqual(index, undefined, `#${id} 必须存在`);
    assert.equal(parsed.tags[index!].parent, parsed.bodyIndex, `#${id} 必须是 body 直接子元素`);
  }
  const bodyOrder = parsed.tags[parsed.bodyIndex].children
    .map((c) => parsed.tags[c].attrs.id)
    .filter((id): id is string => typeof id === 'string');
  const zoneOrder = bodyOrder.filter((id) => zones.includes(id));
  assert.deepEqual(zoneOrder, zones, 'body 文档序必须是 工具栏 → 聊天流 → 状态栏');
  // ── S7：状态栏不是 #stream 的后代（打开任意视图也触达不到风险位） ──
  const streamIndex = parsed.idsIndex.get('stream');
  assert.notEqual(streamIndex, undefined, '#stream 必须存在');
  const statusIndex = parsed.idsIndex.get('region-statusbar')!;
  assert.equal(ancestors(statusIndex).includes(streamIndex!), false, '#region-statusbar 不得是 #stream 的后代');
  // ── 风险 chips 双层容器：外层 #risk-chips（设计契约 id）> 内层 #risk-rail（v3 id 保留） ──
  const chipsIndex = parsed.idsIndex.get('risk-chips');
  const railIndex = parsed.idsIndex.get('risk-rail');
  assert.notEqual(chipsIndex, undefined, '#risk-chips 必须存在');
  assert.notEqual(railIndex, undefined, '#risk-rail 必须存在（v3 探针/归属判据的选择器入口）');
  assert.equal(ancestors(railIndex!).includes(chipsIndex!), true, '#risk-rail 必须是 #risk-chips 的后代');
  assert.equal(ancestors(chipsIndex!).includes(statusIndex), true, '#risk-chips 必须在 #region-statusbar 内');
  // ── J1（静态半）：状态栏本体永不带 hidden；#risk-chips 的 hidden 表达「零风险收缩」──
  assert.equal('hidden' in parsed.tags[statusIndex].attrs, false, '#region-statusbar 本体不得带 hidden（J1）');
  assert.equal('hidden' in parsed.tags[chipsIndex!].attrs, true, '#risk-chips 默认 hidden（零风险收缩为一行）');
  assert.equal('hidden' in parsed.tags[parsed.idsIndex.get('risk-detail')!].attrs, true, '#risk-detail 默认 hidden（不占默认密度）');
  // ── J3（静态半）：chips 的祖先闭包既无折叠容器、也无 aria-expanded 触发器 ──
  for (const index of [chipsIndex!, railIndex!]) {
    for (const ancestor of ancestors(index)) {
      const info = parsed.tags[ancestor];
      assert.equal('data-l1-panel' in info.attrs, false, 'chips 不得位于 L1 面板内');
      assert.equal('data-l2-view' in info.attrs, false, 'chips 不得位于 L2 视图内');
      assert.equal('data-disclose-panel' in info.attrs, false, 'chips 不得位于折叠面板内');
      assert.equal('aria-expanded' in info.attrs, false, 'chips 的祖先不得是折叠触发器');
    }
  }
  // ── 流内不得出现常驻控件（豁免子树不可承载 chrome；RP-V4-06 的静态半）──
  for (const index of [streamIndex!, ...descendants(streamIndex!)]) {
    assert.equal(
      'data-chrome-control' in parsed.tags[index].attrs,
      false,
      `#stream 子树内不得出现 [data-chrome-control]（<${parsed.tags[index].tag}>）`,
    );
  }
  // ── V4-4 收口（ADR-V4-040 §3 / R4-18）：过渡宿主计数必须为 0 ──
  // The v4-1「只建不销」obligation is now CLOSED: every displaced container was
  // either re-homed into a `li[data-host]` (structural, no transitional marker) or
  // retired outright. The assertion is inverted on purpose — a re-introduced
  // `[data-transitional-host]` is exactly the「过渡态永久化」the ruling forbids.
  const hosts = [...descendants(streamIndex!), streamIndex!].filter((i) => 'data-transitional-host' in parsed.tags[i].attrs);
  assert.equal(hosts.length, 0, '#stream 内不得再出现 data-transitional-host（v4 收口清零）');
  // V4.5-1 W3（TASK-V45-107 / ADR-V45-002 §2）：**零宿主**是终态 —— `li[data-host]` 任意深度
  // 都是回归（注册表降级为反向判据），`#stream` 的子节点只允许是卡或空态占位。
  const structuralHosts = [...descendants(streamIndex!), streamIndex!].filter((i) => 'data-host' in parsed.tags[i].attrs);
  assert.equal(structuralHosts.length, 0, '#stream 子树内 li[data-host] 计数必须为 0（零宿主终态）');
  const streamChildren = parsed.tags[streamIndex!].children.filter((i) => parsed.tags[i].tag !== '#text');
  assert.equal(streamChildren.length, 0, '#stream 静态子节点必须为空（卡由渲染器追加；空态占位由 setEmpty 铸造）');
  // ── 法一静态半：工具栏/状态栏内零一次性交互卡 ──
  for (const zone of ['region-toolbar', 'region-statusbar']) {
    for (const index of descendants(parsed.idsIndex.get(zone)!)) {
      const type = parsed.tags[index].attrs['data-msg-type'];
      assert.equal(
        typeof type === 'string' && ['askuser', 'auth', 'nextstep'].includes(type),
        false,
        `#${zone} 内不得出现一次性交互卡（法一）`,
      );
    }
  }
});

test('index.html: 收起一律 hidden 属性；composer 迁 body 尾且保持 hidden；body 仍是 flex 列', () => {
  for (const id of ['view-host', 'settings-view', 'tree-fab', 'tree-drawer', 'composer', 'scroll-bottom', 'risk-chips', 'risk-detail']) {
    const index = parsed.idsIndex.get(id)!;
    assert.ok(index !== undefined, `#${id} 必须存在`);
    assert.equal('hidden' in parsed.tags[index].attrs, true, `#${id} 必须默认带 hidden 属性（不得用 CSS 隐身）`);
  }
  // ── V4.5-1 W3（TASK-V45-110 / ADR-V45-003）：`#composer` **出流** —— 它是 `body` 的
  //    最后一个元素并继续带 `hidden`（法四：默认屏无常驻输入框）；`#stream` 子树内不得
  //    再有 `#composer` / `#input` / `#send`（零宿主 + 纯卡序）。──
  const composerIndex = parsed.idsIndex.get('composer')!;
  const streamIndex = parsed.idsIndex.get('stream')!;
  assert.equal(parsed.tags[composerIndex].parent, parsed.bodyIndex, '#composer 必须是 body 直接子元素（出流）');
  const bodyChildren = parsed.tags[parsed.bodyIndex].children.filter((i) => parsed.tags[i].tag !== '#text');
  // The `<script src>` bootstrap stays the very last element (v1 contract); `#composer`
  // must be the last element BEFORE it — i.e. no layout-bearing node follows it.
  const afterComposer = bodyChildren.slice(bodyChildren.indexOf(composerIndex) + 1).filter((i) => parsed.tags[i].tag !== 'script');
  assert.deepEqual(afterComposer, [], '#composer 之后不得再有布局元素（它是 #settings-view 之后、<script> 之前的最后一个节点）');
  assert.equal(ancestors(composerIndex).includes(streamIndex), false, '#composer 不得再落在 #stream 内（零宿主）');
  for (const id of ['input', 'send']) {
    assert.equal(ancestors(parsed.idsIndex.get(id)!).includes(streamIndex), false, `#${id} 不得再落在 #stream 内`);
    assert.equal('hidden' in parsed.tags[parsed.idsIndex.get(id)!].attrs, false, `#${id} 自身不带 hidden（由 #composer 承载）`);
  }
  // 法四：默认屏不得出现可见常驻输入框 —— 静态半（唯一非 hidden 的 input 不允许存在）
  for (const index of [streamIndex, ...descendants(streamIndex)]) {
    if (parsed.tags[index].tag !== 'input') continue;
    const hiddenOnPath = [index, ...ancestors(index)].some((i) => 'hidden' in parsed.tags[i].attrs);
    assert.equal(hiddenOnPath, true, '默认屏不得出现非 hidden 的输入框（法四静态半）');
  }
  assert.match(html, /body\s*\{[^}]*display:\s*flex/, 'body 必须仍是 flex 容器');
  assert.match(html, /body\s*\{[^}]*flex-direction:\s*column/, 'body 必须仍是 flex 列（三区纵向堆叠）');
  assert.match(html, /body\s*\{[^}]*overflow:\s*hidden/, 'body 必须仍是 overflow:hidden');
  // 工具栏可点 == 5（静态半）：4 个 data-toolbar-slot="view" + 1 个 "theme"
  const slots = [...html.matchAll(/data-toolbar-slot="(view|theme)"/g)].map((m) => m[1]);
  assert.equal(slots.filter((s) => s === 'view').length, 4, '4 个视图入口必须带 data-toolbar-slot="view"');
  assert.equal(slots.filter((s) => s === 'theme').length, 1, '恰好 1 个主题控件带 data-toolbar-slot="theme"');
  assert.equal(slots.length, 5, '工具栏准入总数（可点）必须恰好 5');
  assert.match(html, /class="site-summary"[^>]*role="status"/, '站点摘要必须是只读 role=status');
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
  // I10 fix round: the old first line was `if (!existsSync(BASELINE_JSON)) return;`
  // — with the file missing, the WHOLE AC-V3-007 / C4 block silently "passed".
  // A missing registry is now a hard failure: the baseline is a deliverable of
  // this leaf (TASK-112), not an optional extra.
  assert.ok(existsSync(BASELINE_JSON), `密度基线必须存在（${BASELINE_JSON}）—— 缺失即 FAIL，不得静默跳过`);
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

// ── ⑦a registry self-consistency (I8 spin-off): ⌈chars ÷ 34⌉ must equal the
// registered `lines`, otherwise the registry contradicts itself. The v3-1
// registry shipped `risk(staleRef).lines = 7` next to `chars = 244`
// (⌈244 ÷ 34⌉ = 8) — a defect only the new stage-F machine comparison caught. ──
test('AC-V3-007/I8: 每个登记格自洽（lines = ⌈chars ÷ CHARS_PER_LINE⌉），登记不得自相矛盾', () => {
  assert.ok(existsSync(BASELINE_JSON), `密度基线必须存在（${BASELINE_JSON}）`);
  const baseline = JSON.parse(readFileSync(BASELINE_JSON, 'utf8'));
  const inconsistent: string[] = [];
  const checkCell = (label: string, cell: { chars?: number; lines?: number } | undefined): void => {
    assert.ok(cell, `缺登记格 ${label}`);
    assert.equal(typeof cell?.chars, 'number', `${label} 必须登记 chars（口径 C2 的分子）`);
    const want = Math.ceil((cell?.chars ?? 0) / CHARS_PER_LINE);
    if (want !== cell?.lines) inconsistent.push(`${label}: lines=${cell?.lines} 但 ⌈${cell?.chars} ÷ ${CHARS_PER_LINE}⌉ = ${want}`);
  };
  for (const tier of ['default', 'firstRun']) {
    for (const vp of ['320', '400', '520']) checkCell(`${tier}@${vp}`, baseline.tiers[tier][vp]);
  }
  for (const sub of RISK_SUBSCENARIOS) {
    for (const vp of ['320', '400', '520']) checkCell(`risk(${sub.key})@${vp}`, baseline.tiers.risk.subs[sub.key][vp]);
  }
  checkCell('risk.worst', baseline.tiers.risk.worst);
  assert.deepEqual(inconsistent, [], `登记格自相矛盾：\n${inconsistent.join('\n')}`);
  // 反证：故意构造一个矛盾格必须被检出。
  const tampered = { chars: 244, lines: 7 };
  assert.notEqual(Math.ceil(244 / CHARS_PER_LINE), tampered.lines, '反证：244 chars 的真实行数是 8，登记 7 即矛盾');
});

// ── ⑦b registry fidelity: the machine registry vs the single sources (I7/I8) ──
test('AC-V3-007/I7/I8: 基线登记值与门禁单源逐项一致（几何下界来源 + 体积登记 + 阈值）', () => {
  assert.ok(existsSync(BASELINE_JSON), `密度基线必须存在（${BASELINE_JSON}）`);
  const baseline = JSON.parse(readFileSync(BASELINE_JSON, 'utf8'));

  // 几何下界：登记值与 `density-metrics.mjs#LOG_CLIENT_HEIGHT_FLOOR` 必须同源，
  // 且**登记来源**必须是最终产物的最坏档实测值（I7：旧叙述写 498，实测 495）。
  assert.equal(baseline.logClientHeightFloor, LOG_CLIENT_HEIGHT_FLOOR, '基线几何下界必须等于单源常量');
  assert.equal(typeof baseline.logClientHeightMeasuredWorst, 'number', '必须登记「来源实测最坏值」字段（可机器比对）');
  assert.ok(
    baseline.logClientHeightMeasuredWorst >= baseline.logClientHeightFloor,
    `来源实测最坏值 ${baseline.logClientHeightMeasuredWorst} 不得低于登记下界 ${baseline.logClientHeightFloor}`,
  );
  assert.ok(
    baseline.logClientHeightFloorNote.includes(String(baseline.logClientHeightMeasuredWorst)),
    `下界来源叙述必须写明真实实测值 ${baseline.logClientHeightMeasuredWorst}`,
  );
  assert.equal(
    /实测\s*498/.test(baseline.logClientHeightFloorNote),
    false,
    '下界来源叙述不得再把 498px 当作实测来源（I7：最终产物实测为 495px；历史值可提及，但不得充当来源）',
  );
  assert.equal(
    /498px\s*[−-]\s*10/.test(baseline.logClientHeightFloorNote),
    false,
    '下界来源公式不得再是「498 − 10」（真实来源是 495 − 7）',
  );

  // 体积登记：与 `test/size-baseline.ts` 的登记值/上限必须同源（登记值 == 实测产物）。
  // v3-2 修复轮（2026-09-16，编排器裁决 V3-VOL-1 ②）：v3-1 I6 轮自加的「只降不升 cap」
  // 被**撤销** → ceiling 回到公式 floor(baseline × 1.05)。旧断言「ceiling ≤ cap」在该裁决
  // 下不再成立，故按裁决语义重 pin：ceiling 必须**等于公式值**，且记录 cap 不得参与判定
  // （断言只增不减：多了一条「记录 cap 之上必须 PASS」的可 FAIL 反证）。
  // V4-1：**当前**登记值以 v4 基线为准（v3 基线的 375,102 B 逐字冻结为历史 —— 见下面那条）。
  const current = JSON.parse(readFileSync(CURRENT_BASELINE_JSON, 'utf8'));
  assert.ok(current.volume, '当前基线必须与体积登记交叉引用（ADR-V3-011 第 4 条：分开登记、互相引用）');
  assert.equal(current.volume.artifact, 'dist/sidepanel.js');
  assert.equal(current.volume.registeredBaselineBytes, SIDEPANEL_BASELINE_BYTES, '体积登记值必须与 size-baseline 同源');
  assert.equal(current.volume.ceilingBytes, SIDEPANEL_CEILING, '体积上限必须与 size-baseline 同源');
  assert.equal(
    current.volume.ceilingBytes,
    Math.floor(SIDEPANEL_BASELINE_BYTES * 1.05),
    'ceiling 必须等于公式 floor(baseline × 1.05)（裁决 V3-VOL-1 ①：判定无 cap）',
  );
  assert.equal(current.volume.ceilingCapRole, 'record-only', 'cap 只能作记录、不参与判定（裁决 V3-VOL-1 ②）');
  assert.equal(current.volume.ceilingCapRecordBytes, SIDEPANEL_CEILING_CAP_RECORD);
  assert.equal(SIDEPANEL_CEILING_CAP, SIDEPANEL_CEILING_CAP_RECORD, '旧名字不得指向别的值（cap 已降级为记录）');
  assert.ok(
    current.volume.ceilingBytes > SIDEPANEL_CEILING_CAP_RECORD,
    'ceiling 必须严格高于记录 cap（撤销 cap 的落地证据；若 cap 仍生效本条立刻红灯）',
  );
  assert.equal(current.volume.tolerance, SIDEPANEL_BASELINE_TOLERANCE, '容差 5% 不得因重登记而变');
  // v3 基线冻结为历史：它的体积登记值必须**逐字**停在上一次重登记的值上（不得随本轮改写）。
  assert.equal(baseline.volume.registeredBaselineBytes, 375_102, 'v3 基线体积登记值必须冻结为历史 375,102 B');

  // 阈值：机读基线与单源常量逐字相等。
  assert.deepEqual(baseline.thresholds, JSON.parse(JSON.stringify(DENSITY_LIMITS)));
  // 反证：改一个字节的登记值必须让上面的比对 FAIL（避免该段成为恒真检查）。
  const tampered = { ...baseline, logClientHeightFloor: baseline.logClientHeightFloor + 1 };
  assert.notEqual(tampered.logClientHeightFloor, LOG_CLIENT_HEIGHT_FLOOR, '反证：篡改登记下界必须可被检出');
});

// ── ⑦c I17: the caliber module has no `check()` calls, so its "floor" is a set
// of literal-content pins (a real, failable assertion) instead of `floor: 0`. ──
test('ledger I17: 口径单源模块以字面量 pin 代替无意义的 count floor', () => {
  const source = readFileSync(resolve(PKG, 'test/ui/density-metrics.mjs'), 'utf8');
  const pins = [
    'default: Object.freeze({ clickables: 7, lines: 15 })',
    'firstRun: Object.freeze({ clickables: 9, lines: 20 })',
    'risk: Object.freeze({ clickables: 17, lines: 35 })',
    'export const LOG_CLIENT_HEIGHT_FLOOR = 488;',
    'export const DENSITY_VIEWPORTS = Object.freeze([320, 400, 520]);',
    'export const CHARS_PER_LINE = 34;',
  ];
  for (const pin of pins) {
    assert.ok(source.includes(pin), `口径单源必须逐字包含：${pin}`);
  }
  // 反证：pin 必须真的能 FAIL（改一个字符即命中不了）。
  assert.equal(source.includes('export const LOG_CLIENT_HEIGHT_FLOOR = 489;'), false);
});

// ══════════════════════════════════════════════════════════════════════════════
// V4-1 TASK-502 (ADR-V4-020) — the exemption scope + the anti-abuse budgets.
//
// These are the *static* halves of FR-CHAT-070~075. The runtime halves live in
// `test/ui/density.mjs` (31 cells + RP-V4-01~07).
// ══════════════════════════════════════════════════════════════════════════════
import {
  CANONICAL_EXCLUDED_SUBTREES,
  CANONICAL_SHELL_ROOTS,
  DENSITY_EXCLUDED_SUBTREES,
  DENSITY_SCOPE_TS,
  DENSITY_SHELL_ROOTS,
  MAX_CLICKABLES_PER_CARD,
  MAX_FIRST_SCREEN_CARDS,
  MAX_STREAM_RESIDENT_CLICKABLES,
  MAX_WELCOME_CARDS,
  MAX_WELCOME_LINES,
  STREAM_HEIGHT_RATIO_MIN,
  evaluateCardBudget,
  evaluateFirstScreen,
  evaluateStreamResidentBudget,
  readDensityScopeSource,
} from './ui/density-metrics.mjs';

test('V4 S2: 豁免子树单源（density-scope.ts）且字面量 == [\'#stream\']', () => {
  assert.deepEqual([...DENSITY_EXCLUDED_SUBTREES], ['#stream'], '豁免子树只能是 #stream');
  assert.deepEqual([...DENSITY_EXCLUDED_SUBTREES], [...CANONICAL_EXCLUDED_SUBTREES]);
  assert.deepEqual([...DENSITY_SHELL_ROOTS], [...CANONICAL_SHELL_ROOTS], '三区外壳常量必须逐字一致');
  // 单源：豁免集合的**字面量数组**只允许在 density-scope.ts 里出现一次。其他文件
  // 只能通过派生（从单源源码文本抽取）得到它 —— `Object.freeze(['#stream'])` 这类
  // 字面量声明一旦在别处出现，就是第二声明点，必须 FAIL（RP-V4-06 的静态半）。
  const literalDeclaration = /DENSITY_EXCLUDED_SUBTREES\s*(?::[^=]*)?=\s*Object\.freeze\(\[/g;
  const scopeSource = readDensityScopeSource();
  assert.equal((scopeSource.match(literalDeclaration) ?? []).length, 1, 'density-scope.ts 内字面量声明恰好一次');
  const violations: string[] = [];
  for (const rel of ['test/ui/density-metrics.mjs', 'test/density-thresholds.test.ts']) {
    const src = readFileSync(resolve(PKG, rel), 'utf8');
    const literal = src.replace(/readDensityScopeSource\(\)[\s\S]*?`/g, '');
    if (literalDeclaration.test(literal)) violations.push(rel);
    literalDeclaration.lastIndex = 0;
  }
  assert.deepEqual(violations, [], `以下文件出现了第二声明点（只允许从单源读取）→ ${violations.join(', ')}`);
  assert.ok(existsSync(DENSITY_SCOPE_TS), '单源文件必须存在');
});

test('V4 S1/S5: assertChromeNotInStream 存在 + 四个防滥用常量逐字', () => {
  const scopeSource = readDensityScopeSource();
  assert.match(scopeSource, /export function assertChromeNotInStream/, 'S1 的机器断言必须由产品承载');
  assert.match(scopeSource, /data-chrome-control/, 'S1 的标记属性必须写死在单源里');
  assert.equal(MAX_CLICKABLES_PER_CARD, 6, 'FR-CHAT-072: 单卡可点 ≤6');
  assert.equal(MAX_FIRST_SCREEN_CARDS, 2, 'FR-CHAT-073: 首屏卡片 ≤2');
  assert.equal(MAX_WELCOME_CARDS, 1, '§12 裁决 4: 欢迎卡 ≤1');
  assert.equal(MAX_WELCOME_LINES, 8, '§12 裁决 4: 欢迎卡 ≤8 行');
  // V4-2 TASK-613（收紧）：首屏卡**合计**可点上限 —— 单源常量 + 形态判据的标记集合。
  assert.equal(MAX_STREAM_RESIDENT_CLICKABLES, 8, 'TASK-613 收紧: 首屏卡合计可点 ≤8');
  assert.match(scopeSource, /export const RESIDENT_NAV_ATTRS/, 'TASK-613 ①: 常驻导航入口的形态判据必须由产品承载');
  assert.match(scopeSource, /TOOLBAR_SLOT_ATTR/, 'TASK-613 ①: `data-toolbar-slot` 形态必须在单源里（N-02 第一层反向判定）');
  // 反证：把一个常量改一位即必须失败（该段不是恒真检查）。
  const tampered = scopeSource.replace('export const MAX_CLICKABLES_PER_CARD = 6;', 'export const MAX_CLICKABLES_PER_CARD = 7;');
  assert.notEqual(tampered, scopeSource, '反证：常量必须逐字可定位');
});

test('V4 RP-V4-01/02/03（纯判定）: 单卡第 7 可点 / 首屏第 3 卡 / 第 2 欢迎卡 或 >8 行 ⇒ FAIL', () => {
  const cards = [
    { key: '#card-1', clickables: 6, lines: 3 },
    { key: '#card-2', clickables: 1, lines: 2 },
  ];
  assert.equal(evaluateCardBudget(cards).ok, true);
  assert.equal(evaluateCardBudget([{ key: '#card-1', clickables: 7, lines: 3 }]).ok, false, 'RP-V4-01：第 7 个可点必须 FAIL');
  assert.equal(evaluateCardBudget([{ key: null, clickables: 1, lines: 1 }]).ok, false, '无稳定键的卡必须 FAIL');
  assert.equal(evaluateFirstScreen([{ key: 'a' }, { key: 'b' }], 'default').ok, true);
  assert.equal(evaluateFirstScreen([{ key: 'a' }, { key: 'b' }, { key: 'c' }], 'default').ok, false, 'RP-V4-02：第 3 卡必须 FAIL');
  const twoWelcome = [{ key: 'w1', welcome: true, lines: 2 }, { key: 'w2', welcome: true, lines: 2 }];
  assert.equal(evaluateFirstScreen(twoWelcome, 'empty').ok, false, 'RP-V4-03：第 2 张欢迎卡必须 FAIL');
  const longWelcome = [{ key: 'w1', welcome: true, lines: MAX_WELCOME_LINES + 1 }];
  assert.equal(evaluateFirstScreen(longWelcome, 'empty').ok, false, 'RP-V4-03：>8 行必须 FAIL');
  assert.equal(evaluateFirstScreen(twoWelcome, 'risk').skipped, true, 'first-screen 判定只对 default / empty 档生效');

  // V4-2 TASK-613 ③（纯判定）：单卡全合规但**合计**超上限 ⇒ 必须 FAIL，且失败原因可归因到合计。
  const twoFives = [
    { key: 'a', clickables: 5, lines: 2 },
    { key: 'b', clickables: 5, lines: 2 },
  ];
  assert.equal(evaluateCardBudget(twoFives).ok, true, '前置：每卡 5 ≤6（单卡规则不红）');
  assert.equal(evaluateStreamResidentBudget(twoFives).ok, false, 'TASK-613 ③：合计 10 > 8 必须 FAIL');
  assert.equal(evaluateStreamResidentBudget(twoFives).total, 10);
  assert.match(evaluateStreamResidentBudget(twoFives).violations.join(' '), /流内卡合计可点 10 > 8/);
  assert.equal(evaluateFirstScreen(twoFives, 'default').ok, false, '首屏预算必须把合计上限纳入判定');
  const belowCap = [
    { key: 'a', clickables: 4, lines: 2 },
    { key: 'b', clickables: 4, lines: 2 },
  ];
  assert.equal(evaluateStreamResidentBudget(belowCap).ok, true, '合计 8 == 上限仍须 PASS（边界）');
  // 反证：上限未被悄悄放宽（改一位即红）。
  assert.equal(evaluateStreamResidentBudget(twoFives, 10).ok, true, '判据不是恒真 —— 放开上限才 PASS');
  assert.equal(evaluateStreamResidentBudget(twoFives, 9).ok, false, '上限 9 时 10 必须 FAIL');
});

test('V4 FR-CHAT-082: ≥65% 的流区占比下界来自 TASK-501 spike（只允许上调）', () => {
  assert.equal(STREAM_HEIGHT_RATIO_MIN, 0.65, '阈值逐字为 0.65（spike 12/12 PASS 后的结论）');
  assert.ok(STREAM_HEIGHT_RATIO_MIN >= 0.65, '只允许上调，禁止静默下调');
});

test('V4 AC-V3-007 冻结: v3 密度基线 schema 保真断言逐字保留（v4 不参与判定）', () => {
  // V4 只允许**新增**基线文件；v3 的 schema 保真断言（前面 ⑦ 段）继续生效。
  const baseline = JSON.parse(readFileSync(BASELINE_JSON, 'utf8'));
  assert.equal(baseline.version, 'v3', 'v3 基线必须逐字冻结为历史');
  assert.equal(baseline.direction, 'tighten-only');
  const v4 = resolve(PKG, 'docs/v4-density-baseline.json');
  if (existsSync(v4)) {
    const next = JSON.parse(readFileSync(v4, 'utf8'));
    assert.equal(next.version, 'v4', 'v4 基线必须自带版本号（口径不混）');
    assert.ok(next.differencesFromV3?.length > 0, '必须逐条登记与 v3 的口径差异（换口径不是放宽）');
  }
});

// ── BLOCK-02（V4-4 审查修复轮）：过渡宿主清零必须是**结构性**判据 ──────────────
/**
 * R2 的「清零」是通过**删掉 `data-transitional-host` 属性**达成的：容器原样留在
 * `#stream` 里，`hosts.length === 0` 因此恒真。修复轮把判据改回结构性：登记表必须逐条
 * 说明每个存活宿主的处置（`transitional:false` + 理由 + 通道绑定），退役容器必须**不在 DOM**
 * 里；任何未登记宿主 / 被重新引入的退役容器都必须 FAIL。
 */
test('index.html: 零宿主反向判据与退役真相册（任意宿主 / 复活退役容器必须 FAIL）', async () => {
  const hosts = await import('../src/ui/sidepanel/host-registry.js');
  // ① V4.5-1 W3（TASK-V45-111 / ADR-V45-010 §1）：注册表**清空为反向判据** —— 不再是
  //    「登记集合 == 实存集合」的双向比对，而是「实存集合 == ∅」。
  assert.equal(hosts.REGISTERED_STRUCTURAL_HOSTS.length, 0, '结构宿主注册表必须清空（零宿主是终态）');
  assert.equal(hosts.REGISTERED_HOST_ATTRS.length, 0, '派生的注册属性集合必须为空');
  assert.deepEqual([...hosts.RETIRED_HOST_ATTRS], ['decision', 'composer', 'l1-panels', 'strips']);
  assert.equal(hosts.RETIRED_CONTAINER_IDS.length, 14, '退役容器清单必须是 14 项');
  assert.equal(hosts.RETIRED_HOST_IDS.length, 18, '并集别名 = 4 宿主值 + 14 容器 id');
  // ② DOM 侧：index.html 内任意深度不得再有 li[data-host]（零宿主静态半）。
  const domHosts = [...html.matchAll(/<li[^>]*data-host="([^"]+)"/g)].map((m) => m[1]);
  assert.deepEqual(domHosts, [], 'index.html 不得再出现任何 data-host（零宿主）');
  // ③ 退役**容器 id** 必须零 DOM 残留（结构性：查 id，不查属性）。
  for (const id of hosts.RETIRED_CONTAINER_IDS) {
    assert.ok(!new RegExp(`id="${id}"`).test(html), `已退役容器 #${id} 仍在 index.html（删属性不改 DOM 不算退役）`);
  }
  // ③b 退役**宿主值**必须零 `data-host` 残留（值可能恰好也是别的容器 id，故用属性判）。
  for (const host of hosts.RETIRED_HOST_ATTRS) {
    assert.ok(!new RegExp(`data-host="${host}"`).test(html), `已退役宿主 data-host="${host}" 仍残留在 index.html`);
  }
  // ③c 保留面反证：`#input` / `#send` / `#send-reason` / `#rebind` **不得**在退役清单里。
  for (const kept of ['input', 'send', 'send-reason', 'rebind']) {
    assert.equal((hosts.RETIRED_HOST_IDS as readonly string[]).includes(kept), false, `保留面 #${kept} 不得进入退役清单`);
  }
  // `composer` 是**退役的宿主值**（`li[data-host="composer"]` 已移除）而 `#composer` 本体
  // 保留（迁 body 尾、继续 hidden）—— 两个语义必须分开：宿主值在退役册，兼容面 id 不在。
  assert.ok((hosts.RETIRED_HOST_ATTRS as readonly string[]).includes('composer'), '宿主值 composer 必须入退役册');
  assert.equal((hosts.RETIRED_CONTAINER_IDS as readonly string[]).includes('composer'), false, '兼容面 #composer 不得入退役容器册');
  assert.match(html, /<form id="composer" hidden>/, '#composer 本体必须保留（id / hidden 零变化）');
  // ③c 退役真相册：每项必须有 movedTo + 「重新引入即红」的反证（判据不得只删标记）。
  assert.equal(hosts.RETIRED_HOST_DISPOSITIONS.length, hosts.RETIRED_HOST_IDS.length);
  for (const d of hosts.RETIRED_HOST_DISPOSITIONS) {
    assert.ok(d.movedTo.trim().length >= 4, `${d.item}: 必须登记去向`);
    assert.match(d.counterProof, /红/, `${d.item}: 必须登记「重新引入即红」的反证`);
  }
  // ④ V4.5-1 W2（TASK-V45-106 §6）**归并矩阵新语义三条**（旧「legacy id 仍在 DOM」判据
  //    与退役正面矛盾，已按新形态重写；断言数只增不减）：
  //    ① 每个通道在**生产源文本**里恰有 1 个 emitter 调用点（唯一写入口）；
  //    ② 该通道的可见载体数 == 登记 `carrierCount`（恒 1：事实面唯一）；
  //    ③ `#send-reason` 仍在 `#region-statusbar` 内（保留要素，不随 strips 退役）。
  const sidepanelSrc = readFileSync(resolve(PKG, 'src/ui/sidepanel/sidepanel.ts'), 'utf8');
  const chatStateSrc = readFileSync(resolve(PKG, 'src/ui/sidepanel/chat-state.ts'), 'utf8');
  const productionSrc = `${sidepanelSrc}\n${chatStateSrc}`;
  const countOccurrences = (haystack: string, needle: string): number => haystack.split(needle).length - 1;
  const emitterCounts = hosts.STRIP_CHANNEL_KINDS.map((b) => ({
    channel: b.channel,
    count: countOccurrences(productionSrc, b.emitterSite),
  }));
  // ① 唯一 emitter（逐通道恰 1）—— 每个通道一条断言（`evaluateStripChannels` 汇总 + 逐条可读）。
  for (const binding of hosts.STRIP_CHANNEL_KINDS) {
    const site = emitterCounts.find((e) => e.channel === binding.channel);
    assert.equal(
      site?.count,
      1,
      `归并通道 ${binding.channel}（kind=${binding.kind}）的生产 emitter 必须恰 1 处，实测 ${site?.count} —— 双写路径必须收口（emitterSite=${binding.emitterSite}）`,
    );
  }
  // ② 载体数 == 1（显式常量；运行时 live 读数在 W4/TASK-V45-116 接入）。
  for (const binding of hosts.STRIP_CHANNEL_KINDS) {
    assert.equal(binding.carrierCount, 1, `归并通道 ${binding.channel}: carrierCount 必须显式为 1（事实面唯一）`);
  }
  // ③ `#send-reason` 保留：仍是 `#region-statusbar` 的后代（状态栏职责不变）。
  const statusbar = /<footer id="region-statusbar"[\s\S]*?<\/footer>/.exec(html)?.[0] ?? '';
  assert.ok(statusbar.length > 0, 'index.html 必须仍有 #region-statusbar（状态栏是常驻面）');
  assert.match(statusbar, /id="send-reason"/, '`#send-reason` 必须仍在 `#region-statusbar` 内（保留要素）');
  // ④ 退役面零残留：五条提示带的节点 id 与包裹层不得再出现在 index.html（真退役 ≠ hidden）。
  for (const retired of ['env-guard', 'site-hint', 'onboarding', 'discovery-notice', 'notice']) {
    assert.equal(
      new RegExp(`id="${retired}"`).test(html),
      false,
      `已退役提示带 #${retired} 仍在 index.html（真退役要求节点为 null，禁 hidden / 空壳充数）`,
    );
  }
  assert.equal(html.includes('class="strips"'), false, '`.strips` 包裹层必须随宿主一并退役');
  // ⑤ 判据汇总可 FAIL：伪造通道读数（emitter 缺 / 载体数 ≠ 1 / send-reason 不在状态栏）逐条必红。
  assert.deepEqual(
    hosts.evaluateStripChannels({ emitterCounts, observedCarriers: [], sendReasonInStatusbar: true }),
    [],
    '真实读数必须通过汇总判据（判据不得恒红）',
  );
  assert.ok(
    hosts.evaluateStripChannels({
      emitterCounts: emitterCounts.map((e) => (e.channel === 'env' ? { ...e, count: 2 } : e)),
      observedCarriers: [],
      sendReasonInStatusbar: true,
    }).some((p) => p.includes('emitter 调用点 = 2')),
    '伪造第二处 emitter 必须被判红',
  );
  assert.ok(
    hosts.evaluateStripChannels({
      emitterCounts,
      observedCarriers: [{ channel: 'notice', count: 2 }],
      sendReasonInStatusbar: true,
    }).some((p) => p.includes('可见载体数 = 2')),
    '伪造第二载体必须被判红（事实面唯一）',
  );
  assert.ok(
    hosts.evaluateStripChannels({ emitterCounts, observedCarriers: [], sendReasonInStatusbar: false }).length > 0,
    '`#send-reason` 离开状态栏必须被判红',
  );
  // ⑥ V4.5-1 W3（TASK-V45-111 / ADR-V45-010 §3）：**6 类问题串逐类可 FAIL**。
  //  ① 任意深度 li[data-host]（含改名前的等价形态）；
  {
    assert.ok(
      hosts.evaluateHostRegistry({ presentHosts: ['forged-host'], transitionalCount: 0, retiredPresent: [] }).some((p) => p.includes('零宿主判据')),
      '① 实存任意宿主必须判红',
    );
  }
  //  ② 退役宿主值存在；
  {
    assert.ok(
      hosts
        .evaluateHostRegistry({ presentHosts: ['decision'], transitionalCount: 0, retiredPresent: [] })
        .some((p) => p.includes('已退役宿主')),
      '② 退役宿主值存在必须判红',
    );
  }
  //  ③ 退役容器 id 存在；
  {
    assert.ok(
      hosts
        .evaluateHostRegistry({ presentHosts: [], transitionalCount: 0, retiredPresent: ['l0-pick'] })
        .some((p) => p.includes('已退役容器 #l0-pick')),
      '③ 退役容器残留必须判红',
    );
  }
  //  ④ 过渡标记 ≠ 0；
  {
    assert.ok(
      hosts
        .evaluateHostRegistry({ presentHosts: [], transitionalCount: 1, retiredPresent: [] })
        .some((p) => p.includes('data-transitional-host')),
      '④ 复活过渡标记必须判红',
    );
  }
  //  ⑤ 退役项反证元数据齐备（无 movedTo / counterProof 的退役登记必须判红）；
  {
    const forged = hosts.RETIRED_HOST_DISPOSITIONS.map((d) => ({ ...d, counterProof: d.item === 'strips' ? '' : d.counterProof }));
    assert.ok(
      hosts
        .evaluateHostRegistry({ presentHosts: [], transitionalCount: 0, retiredPresent: [] }, forged).some((p) => p.includes('反证')),
      '⑤ 缺反证的退役登记必须判红',
    );
  }
  //  ⑥ 源文本不含双写理由（FR-V45-011 的机器判据）。
  {
    assert.ok(
      hosts
        .evaluateHostRegistry({
          presentHosts: [],
          transitionalCount: 0,
          retiredPresent: [],
          sources: [{ path: 'forged.ts', text: '// ALSO append-recorded to the system channel' }],
        })
        .some((p) => p.includes('双写理由')),
      '⑥ 双写理由字面必须判红',
    );
  }
  // 干净读数必须通过（判据不得恒红）。
  assert.deepEqual(
    hosts.evaluateHostRegistry({ presentHosts: [], transitionalCount: 0, retiredPresent: [] }),
    [],
    '零宿主真实读数必须通过',
  );
});
