/**
 * V3-1 TASK-105 / ADR-V3-016 — pure-Node unit tests for the disclosure
 * controller and the risk-rail templates.
 *
 * These run in the existing `npm test` (node --test) pipeline with **zero new
 * dependencies**: the "DOM" is a ~60 line stub that implements exactly the
 * surface `disclosure.ts` / `l0/risk-rail.ts` declare. No jsdom, no Playwright,
 * no Chromium — so the "risk rail can never be folded" invariant gets a fast
 * feedback channel on a 1.5 GB machine (NFR-V3-012 / NFR-V3-013).
 *
 * Supersession: this file is NEW — no existing assertion is deleted or
 * downgraded by it (NFR-V3-014; ledger entry V31-S4).
 *
 * v3-1 review fix round (I2/I3/I9): the dead `partitionDecisionOptions` block was
 * replaced by the PRODUCT partition rule (`l0ViewModel`), the terminal-label
 * constants are now pinned equal to each other, and the tautological
 * `assert.ok(… || true)` became a real equality assertion. No `test(...)`
 * registration was removed — the suite only grew.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

import {
  COLLAPSIBLE_TARGETS,
  DISCLOSURE_WIRING,
  NEVER_FOLDABLE,
  DisclosureError,
  assertFoldable,
  createDisclosure,
  installDisclosure,
  isFoldable,
  normalizeId,
} from '../src/ui/sidepanel/disclosure.js';
import {
  OTHER_OPTION_LABEL,
  RISK_CLASSES,
  RISK_COPY,
  RiskRowError,
  assertNoAllowControls,
  assertThreeChannels,
  renderRiskRail,
  renderRiskRow,
} from '../src/ui/sidepanel/l0/risk-rail.js';
// The PRODUCT copy of the terminal label (what `decision-card.ts` renders) plus
// the single product partition rule (`l0ViewModel`) — review I2/I3: the previous
// version only pinned the rail-side copy and exercised a product-unused
// `partitionDecisionOptions()` with a conflicting `MAX_VISIBLE_RECOMMENDED = 1`.
import { L0_OTHER_OPTION_LABEL } from '../src/ui/sidepanel/l0/shell.js';
import {
  L0_VISIBLE_RECOMMENDED,
  OTHER_OPTION_LABEL as VIEW_MODEL_OTHER_OPTION_LABEL,
  l0ViewModel,
  moreOptionsLabel,
} from '../src/ui/sidepanel/view-model.js';

// ── a deliberately tiny DOM stub ─────────────────────────────────────────────
class StubEl {
  hidden = false;
  className = '';
  children: StubEl[] = [];
  attrs = new Map<string, string>();
  listeners: Record<string, Array<() => void>> = {};
  private innerText = '';
  /** Assigning textContent drops every child — same semantics as the real DOM,
   *  which is what `renderRiskRail()` relies on to clear the rail. */
  get textContent(): string {
    return this.innerText;
  }
  set textContent(value: string | null) {
    this.innerText = value ?? '';
    this.children = [];
  }
  setAttribute(name: string, value: string) {
    this.attrs.set(name, value);
    // Mirror the HTML-element behaviour the module relies on (`class` writes are
    // readable back through `className`); SVG elements behave differently in the
    // real DOM, which is exactly why the module writes the attribute.
    if (name === 'class') this.className = value;
  }
  getAttribute(name: string) {
    return this.attrs.get(name) ?? null;
  }
  hasAttribute(name: string) {
    return this.attrs.has(name);
  }
  append(...nodes: StubEl[]) {
    this.children.push(...nodes);
  }
  appendChild(node: StubEl) {
    this.children.push(node);
    return node;
  }
  remove() {
    this.children = [];
  }
  addEventListener(type: string, listener: () => void) {
    (this.listeners[type] ??= []).push(listener);
  }
  click() {
    for (const listener of this.listeners.click ?? []) listener();
  }
}

class StubDoc {
  els = new Map<string, StubEl>();
  add(id: string, el = new StubEl()) {
    this.els.set(id, el);
    return el;
  }
  getElementById(id: string) {
    return this.els.get(id) ?? null;
  }
  querySelector(selector: string) {
    const m = /^\[aria-controls="(.+)"\]$/.exec(selector);
    if (!m) return null;
    for (const el of this.els.values()) if (el.getAttribute('aria-controls') === m[1]) return el;
    return null;
  }
  createElement(tag: string) {
    void tag;
    return new StubEl();
  }
  createElementNS(ns: string, tag: string) {
    void ns;
    return new StubEl();
  }
}

/** A stub that mirrors `src/ui/sidepanel/index.html`'s disclosure wiring. */
function buildPanel() {
  const doc = new StubDoc();
  for (const w of DISCLOSURE_WIRING) {
    const trigger = doc.add(w.triggerId);
    trigger.setAttribute('aria-expanded', 'false');
    trigger.setAttribute('aria-controls', w.targetId);
    doc.add(w.targetId).hidden = true;
  }
  doc.add('risk-rail').hidden = false;
  doc.add('confirm').hidden = true;
  doc.add('l0-decision').hidden = false;
  return doc;
}

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
const readSource = (rel: string) => readFileSync(resolve(packageRoot(), rel), 'utf8');

/** Strip comments before scanning code, so a *documented* ban is not a hit. */
const stripComments = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

// ── 1. whitelist: the risk rail / confirm card / decision area cannot fold ───
test('disclosure: 白名单外目标（含 #risk-rail）一律抛错', () => {
  assert.ok(COLLAPSIBLE_TARGETS.includes('topbar'));
  for (const forbidden of NEVER_FOLDABLE) {
    assert.equal(isFoldable(forbidden), false, `${forbidden} 必须在白名单外`);
    assert.throws(() => assertFoldable(forbidden), DisclosureError, `assertFoldable(#${forbidden}) 必须抛错`);
  }
  assert.equal(normalizeId('#risk-rail'), 'risk-rail');
  assert.equal(assertFoldable('topbar'), 'topbar');
  assert.equal(assertFoldable('#l1-more'), 'l1-more');
});

test('disclosure: collapseAll() 折叠白名单内目标且 #risk-rail 完全不受影响', () => {
  const doc = buildPanel();
  const rail = doc.getElementById('risk-rail')!;
  const controller = createDisclosure(doc);
  controller.open('topbar');
  controller.open('l1-more');
  controller.open('l2-entries');
  controller.collapseAll();
  for (const id of COLLAPSIBLE_TARGETS) {
    assert.equal(doc.getElementById(id)!.hidden, true, `#${id} 应被收起（hidden 属性）`);
  }
  assert.equal(rail.hidden, false, '风险位不得被 collapseAll() 影响');
  assert.equal(doc.getElementById('confirm')!.hidden, true, '破坏性确认卡默认由产品状态控制，不参与折叠');
  assert.throws(() => controller.toggle('risk-rail'), DisclosureError);
});

// ── 2. collapse is the `hidden` attribute, never CSS ────────────────────────
test('disclosure: 收起一律用 hidden 属性；源码零 CSS 隐身折叠', () => {
  const doc = buildPanel();
  const controller = createDisclosure(doc);
  controller.open('l1-ref');
  assert.equal(doc.getElementById('l1-ref')!.hidden, false);
  controller.close('l1-ref');
  assert.equal(doc.getElementById('l1-ref')!.hidden, true);
  const source = stripComments(readSource('src/ui/sidepanel/disclosure.ts'));
  assert.equal(/display\s*:\s*none/.test(source), false, '控制器源码不得出现 display:none');
  assert.equal(/visibility\s*:\s*hidden/.test(source), false, '控制器源码不得出现 visibility:hidden');
  assert.equal(/\bchrome\./.test(source), false, '控制器不得调用 chrome.* API');
});

// ── 3. ARIA pairing ────────────────────────────────────────────────────────
test('disclosure: aria-expanded / aria-controls 必须成对，缺一即抛错', () => {
  const doc = buildPanel();
  const controller = createDisclosure(doc);
  controller.open('topbar');
  assert.equal(doc.getElementById('l0-status-band')!.getAttribute('aria-expanded'), 'true');
  assert.equal(doc.getElementById('l0-status-band')!.getAttribute('aria-controls'), 'topbar');
  controller.close('topbar');
  assert.equal(doc.getElementById('l0-status-band')!.getAttribute('aria-expanded'), 'false');

  const broken = buildPanel();
  broken.getElementById('l0-more')!.attrs.delete('aria-expanded');
  assert.throws(() => createDisclosure(broken).open('l1-more'), DisclosureError, '缺 aria-expanded 必须抛错');
});

// ── 4. expansion memory round trip (FR-V3-023) ─────────────────────────────
test('disclosure: 展开态记忆往返（open → 切走 → 返回后相等）', () => {
  const doc = buildPanel();
  const controller = createDisclosure(doc);
  controller.open('topbar');
  controller.close('l1-more');
  controller.open('l2-entries');
  const before = controller.snapshot();
  // V3-2 extended the whitelist with the five L1 content panels (ADR-V3-021); the
  // expected map is re-pinned to the FULL whitelist (a superset check, never a
  // narrowed one) so the round-trip claim still covers every foldable target.
  assert.deepEqual(before, {
    topbar: true,
    'l1-more': false,
    'l1-ref': false,
    'l2-entries': true,
    'l1-consequences': false,
    'l1-local-tree': false,
    'l1-history': false,
    'l1-receipt': false,
    'l1-gestures': false,
  });
  assert.equal(Object.keys(before).length, COLLAPSIBLE_TARGETS.length, '快照必须覆盖白名单全部目标');
  // simulate: enter an L2 view (everything folds) then come back
  controller.collapseAll();
  assert.equal(controller.isOpen('topbar'), false);
  controller.restore(before);
  assert.deepEqual(controller.snapshot(), before, '返回后展开态必须与进入前相等');
  assert.ok(controller.expandMemory instanceof Map);
  assert.equal(controller.expandMemory.get('topbar'), true);
  // wiring is the single source for trigger ↔ target pairs
  assert.equal(DISCLOSURE_WIRING.length, COLLAPSIBLE_TARGETS.length);
});

// ── 5. window.__v3.disclosure contract (ADR-V3-010) ────────────────────────
test('disclosure: window.__v3.disclosure 三方法齐备且幂等安装', () => {
  const doc = buildPanel();
  const win: { __v3?: unknown } = {};
  const first = installDisclosure(doc as never, win as never);
  const second = installDisclosure(doc as never, win as never);
  assert.equal(first, second, 'installDisclosure 必须幂等');
  const hooks = win.__v3 as { disclosure: Record<string, unknown> };
  for (const key of ['toggle', 'collapseAll', 'expandMemory']) {
    assert.ok(key in hooks.disclosure, `__v3.disclosure 缺少 ${key}`);
  }
  // I9 fix round: the old loop body was `assert.ok(targets instanceof Array || true)`
  // — a tautology that could never fail (and never touched the loop variable). The
  // contract is that the exposed list is exactly the controller's whitelist.
  assert.ok(Array.isArray(hooks.disclosure.targets), '__v3.disclosure.targets 必须是数组');
  assert.deepEqual(
    [...(hooks.disclosure.targets as string[])],
    [...COLLAPSIBLE_TARGETS],
    '__v3.disclosure.targets 必须是 COLLAPSIBLE_TARGETS 的逐项副本',
  );
});

// ── 6. three channels (FR-V3-017) ──────────────────────────────────────────
test('risk-rail: 三通道非空——文字为空即抛错', () => {
  assert.throws(() => assertThreeChannels('', '未授权', 'lock'), RiskRowError);
  assert.throws(() => assertThreeChannels('   ', '未授权', 'lock'), RiskRowError);
  assert.throws(() => assertThreeChannels('x', '', 'lock'), RiskRowError);
  assert.throws(() => assertThreeChannels('x', 'b', ''), RiskRowError);
  assert.doesNotThrow(() => assertThreeChannels('x', 'b', 'lock'));

  const doc = new StubDoc();
  assert.throws(() => renderRiskRow(doc, { text: '', badge: 'x', icon: 'lock' }), RiskRowError);
  for (const cls of RISK_CLASSES) {
    const row = renderRiskRow(doc, cls) as unknown as StubEl;
    const classes = row.children.map((c) => c.className);
    assert.deepEqual(classes, ['risk-icon', 'risk-text', 'risk-badge'], `${cls} 必须三通道齐备`);
    assert.ok((row.children[1].textContent ?? '').length > 0, `${cls} 文字通道非空`);
    assert.ok((row.children[2].textContent ?? '').length > 0, `${cls} 徽标通道非空`);
    assert.ok(row.children[0].children.length > 0, `${cls} 图标通道有 path`);
    assert.equal(row.getAttribute('data-risk-class'), cls);
  }
  assert.equal(RISK_CLASSES.length, 5);
});

test('risk-rail: 五类风险渲染到 #risk-rail，无风险时给出平静摘要', () => {
  const doc = buildPanel();
  assert.equal(renderRiskRail(doc as never, []), 1);
  const rail = doc.getElementById('risk-rail')!;
  assert.equal(rail.children.length, 1);
  assert.equal(rail.children[0].getAttribute('data-risk-severity'), 'calm');
  assert.equal(renderRiskRail(doc as never, ['hardline', 'staleRef']), 2);
  assert.equal(rail.children.length, 2);
  assert.equal(rail.children[0].getAttribute('data-risk-class'), 'hardline');
  const empty = new StubDoc();
  assert.throws(() => renderRiskRail(empty as never, []), RiskRowError, '#risk-rail 缺失必须抛错');
});

// ── 7. the decision card's option partition is the PRODUCT one (FR-V3-011/012) ─
test('risk-rail: 决策卡推荐位/折叠位由产品视图模型派生（唯一实现源）', () => {
  // I3 fix round: this block used to exercise `partitionDecisionOptions()`, a
  // product-unused second implementation in `risk-rail.ts` whose comment
  // contradicted both `view-model.L0_VISIBLE_RECOMMENDED = 2` and the measured
  // clickable budget. It is gone; the ONE partition rule (`l0ViewModel`) is
  // asserted here instead, so the test can no longer vouch for dead code.
  const ask = {
    prompt: '这一步先做什么？',
    options: ['查看声明', '重试探测', '撤销授权', '删除书签「工作」', '清空剪贴板'],
  };
  const view = l0ViewModel({ authorized: true, activeOrigin: 'https://a.test', ask });
  assert.equal(view.decision.visible, true);
  assert.equal(view.decision.prompt, ask.prompt);
  assert.ok(
    view.decision.visibleOptions.length <= L0_VISIBLE_RECOMMENDED,
    `可见推荐选项必须 ≤ ${L0_VISIBLE_RECOMMENDED}（实际 ${view.decision.visibleOptions.length}）`,
  );
  assert.ok(L0_VISIBLE_RECOMMENDED <= 2, 'FR-V3-011: 可见推荐选项 ≤2');
  assert.deepEqual(
    view.decision.visibleOptions.map((o) => o.label),
    ask.options.slice(0, view.decision.visibleOptions.length),
  );
  assert.deepEqual(view.decision.foldedOptions, ask.options.slice(view.decision.visibleOptions.length));
  // N is derived from the REAL option list, never hard-coded:
  assert.equal(view.decision.foldedCount, view.decision.foldedOptions.length + 1, 'N = 其余选项数 + 末项「其他…」');
  assert.equal(view.decision.foldedCount, 4, '5 选项 → 2 可见 + 3 收起 + 1 末项');
  const more = l0ViewModel({ authorized: true, activeOrigin: 'https://a.test', ask: { ...ask, options: [...ask.options, '第三个非推荐项'] } });
  assert.equal(more.decision.foldedCount, view.decision.foldedCount + 1, '真实选项变多 → N 必须随之变化');
  assert.equal(moreOptionsLabel(view.decision.foldedCount), `更多选项（还有 ${view.decision.foldedCount} 个）`);
  // No card ⇒ no entry point: the label is the honest「还有 0 个」, never「还有 1 个」
  // (foldedCount is always ≥ 1, which is exactly why `foldedCount <= 0` was the
  // wrong gate — see review I1 and `test/ui/l0.mjs` ②).
  const empty = l0ViewModel({ authorized: true, activeOrigin: 'https://a.test', ask: null });
  assert.equal(empty.decision.visible, false);
  assert.equal(empty.decision.foldedCount, 1, '无卡态 foldedCount 仍为 1（0 选项 + 末项）');
  assert.equal(moreOptionsLabel(0), '更多选项（还有 0 个）');
  assert.equal(moreOptionsLabel(empty.decision.visible ? empty.decision.foldedCount : 0), '更多选项（还有 0 个）');
  // FR-V3-018 keeps its structural half here: the destructive confirmation card is
  // its own target and lives in NEVER_FOLDABLE (asserted by test #1:
  // `assertFoldable('confirm')` throws); the runtime half — destructive options
  // never entering the「更多选项」pool — is asserted by `test/ui/l0.mjs` ⑤.
  assert.ok((NEVER_FOLDABLE as readonly string[]).includes('confirm'), '破坏性确认卡必须是「永不折叠」目标');
});

test('risk-rail: 末项文案逐字——两份常量相等且与产品渲染同源（FR-V3-012）', () => {
  // I2 fix round: two same-named constants used to exist with NO equality
  // assertion and NO rendered-DOM assertion, so a drift between the rail-side copy
  // (asserted by the old test) and the product copy (actually rendered) was
  // invisible to every gate.
  assert.equal(OTHER_OPTION_LABEL, '其他…（我来描述）');
  assert.equal(VIEW_MODEL_OTHER_OPTION_LABEL, '其他…（我来描述）');
  assert.equal(L0_OTHER_OPTION_LABEL, '其他…（我来描述）');
  assert.equal(
    OTHER_OPTION_LABEL,
    VIEW_MODEL_OTHER_OPTION_LABEL,
    'risk-rail.ts 与 view-model.ts 的同名末项常量必须逐字相等（否则渲染文案由哪一份决定不可判定）',
  );
  assert.equal(L0_OTHER_OPTION_LABEL, VIEW_MODEL_OTHER_OPTION_LABEL, 'shell.ts 的再导出必须指向产品常量');
  // The rendered text itself is asserted in `test/ui/l0.mjs` ② (real DOM).
});

test('risk-rail: 硬底线被拦时零「允许 / 放行」控件', () => {
  assert.doesNotThrow(() => assertNoAllowControls(['为什么', '查看声明', '拒绝']));
  assert.throws(() => assertNoAllowControls(['允许']), RiskRowError);
  assert.throws(() => assertNoAllowControls(['放行']), RiskRowError);
  const copy = RISK_COPY.hardline.text;
  assert.match(copy, /evaluate/);
  assert.match(copy, /不提供「允许」选项/);
  assert.ok(!/提供「允许」/.test(copy.replace('不提供「允许」选项', '')), '文案不得自相矛盾地提供允许入口');
});
