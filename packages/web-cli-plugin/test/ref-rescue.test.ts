/**
 * Defect fix round **R3**（2026-09-17，作者真机确认；HEAD `131f546`）—「引用重锚救援」的
 * Node 运行时判据。
 *
 * ── 缺陷 ─────────────────────────────────────────────────────────────────────
 *
 * SPA 重渲染 / 插入兄弟节点后，位置链选择器断链，但目标文字仍在页面上；冻结的判定链判
 * `dom-gone` ⇒ 引用死亡。修法**不放松 fail-closed**：判定结论仍是 `invalid/dom-gone`，
 * 只是给失效原因挂一份**只读**救援元数据（候选数 / 唯一性 / 路径是否变化），唯一匹配时
 * 由用户显式确认才能重锚。
 *
 * 本文件 pin 四组事实（缺一即 FAIL）：
 *
 *   ① 文本候选定位（`background/ref-rescue.ts#rescueProbe`）的三态：0 / 唯一 / 多候选；
 *   ② **同源**：注入函数对同一棵树给出的 selector / semanticPath / textDigest 必须与冻结
 *      的 `content/ref-capture.ts#selectorFor/semanticPathFor/textDigestFor` **逐字符相等**；
 *   ③ 救援 payload 只作为 `dom-gone` 的**元数据**（结论枚举不扩；0 候选维持原文案；
 *      多候选不给一键重锚；跨路径带提示）；
 *   ④ 只读 + 同 origin + 已授权：SW 的 `ref-rescue` 路由逐出口 fail-closed；一键重锚只在
 *      `唯一 ∧ 路径未变` 时可用，且经与手工拾取同一条摄取管线（`withDeclaration()`）。
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

import {
  RESCUE_REASON,
  evaluateRefValidity,
  reasonFor,
  type RefEnv,
  type RefFacts,
} from '../src/ui/sidepanel/l1/ref-validity.js';
import { createRefStore } from '../src/ui/sidepanel/l1/ref-store.js';
import { canReanchor } from '../src/ui/sidepanel/l1/panels.js';
import { rescuePathOf, rescueProbe } from '../src/background/ref-rescue.js';
import { fromElement, semanticPathFor, selectorFor, textDigestFor } from '../src/content/ref-capture.js';
import { mountPickInput } from '../src/ui/sidepanel/pick-input.js';

const PKG = fileURLToPath(new URL('../../', import.meta.url));
const read = (rel: string): string => readFileSync(join(PKG, rel), 'utf8');

// ── a minimal（无 jsdom）fake DOM ─────────────────────────────────────────────
interface FakeEl {
  tagName: string;
  id: string;
  children: FakeEl[];
  parentElement: FakeEl | null;
  attrs: Record<string, string>;
  own: string;
  textContent: string;
  getAttribute(name: string): string | null;
  contains(other: FakeEl): boolean;
}

function mkEl(tag: string, attrs: Record<string, string> = {}, own = '', children: FakeEl[] = []): FakeEl {
  const el: FakeEl = {
    tagName: tag.toUpperCase(),
    id: attrs.id ?? '',
    children,
    parentElement: null,
    attrs,
    own,
    textContent: '',
    getAttribute(name: string): string | null {
      return Object.prototype.hasOwnProperty.call(this.attrs, name) ? this.attrs[name] : null;
    },
    contains(other: FakeEl): boolean {
      if (other === this) return true;
      return this.children.some((c) => c.contains(other));
    },
  };
  for (const child of children) child.parentElement = el;
  const inner = children.map((c) => c.textContent).join('');
  el.textContent = `${own}${inner}`;
  return el;
}

/** A fake `document`-like root: `querySelectorAll('*')` returns every descendant. */
function mkRoot(children: FakeEl[]): ParentNode {
  const all: FakeEl[] = [];
  const walk = (el: FakeEl): void => {
    for (const c of el.children) {
      all.push(c);
      walk(c);
    }
  };
  for (const c of children) {
    all.push(c);
    walk(c);
  }
  return { querySelectorAll: () => all } as unknown as ParentNode;
}

/** `textContent` flattened + cut at 80（与摘要同源；测试用它构造 digest）。 */
const digestOf = (el: FakeEl): string => textDigestFor(el as unknown as Element);

// ── ① 三态：0 / 唯一 / 多候选 ────────────────────────────────────────────────

test('R3 救援①：文本候选三态——0 候选 / 唯一候选 / 多候选（最内层去重）', () => {
  const leafA = mkEl('span', { id: 'a' }, '目标文本');
  const wrapper = mkEl('div', { id: 'wrap' }, '', [leafA]);
  const dup1 = mkEl('p', { class: 'x' }, '重复文本');
  const dup2 = mkEl('p', { class: 'x' }, '重复文本');
  const root = mkRoot([wrapper, dup1, dup2]);
  const digestUnique = digestOf(leafA);

  const zero = rescueProbe('根本不存在的文本', root);
  assert.equal(zero.candidates, 0, '页面上没有该文本 ⇒ 0 候选（真没了）');
  assert.equal(zero.facts, undefined, '0 候选不得给出任何「新事实」');

  const unique = rescueProbe(digestUnique, root);
  // 父 `#wrap` 的 textContent 与子相同 ⇒ 若不取「最内层」会伪造成 2 候选。
  assert.equal(unique.candidates, 1, '父/子同文本必须去重为唯一候选');
  assert.ok(unique.facts, '唯一候选必须给出全新捕获事实');
  assert.equal(unique.facts?.textDigest, digestUnique, '新事实的摘要 = 探测用的摘要（同源）');

  const multiple = rescueProbe(digestOf(dup1), root);
  assert.equal(multiple.candidates, 2, '两个并列同文本元素 ⇒ 多候选（歧义）');
  assert.equal(multiple.facts, undefined, '多候选不得给出可自动锚定的事实');
});

// ── ② 同源：与冻结 capture 口径逐字符相等 ────────────────────────────────────

test('R3 救援②同源：探测函数给出的 selector / semanticPath / textDigest 与 ref-capture 冻结口径逐字符相等', () => {
  // 稳定的 `#id` 路径 / `data-key` 路径 / 只能靠 `:nth-of-type` 的位置链（正是断链的场景）。
  const stableId = mkEl('div', { id: 'target-id', class: 'a b' }, '唯一文本甲');
  const stableKey = mkEl('div', { 'data-key': 'k1', class: 'c' }, '唯一文本乙');
  const nth1 = mkEl('div', { class: 'row' }, '位置文本丙');
  const nth2 = mkEl('div', { class: 'row' }, '位置文本丁');
  const posParent = mkEl('section', { class: 'wrap' }, '', [nth1, nth2]);
  const root = mkRoot([stableId, stableKey, posParent]);

  for (const target of [stableId, stableKey, nth2]) {
    const digest = digestOf(target);
    const report = rescueProbe(digest, root);
    assert.equal(report.candidates, 1, `${target.tagName}: 期望唯一候选`);
    const real = target as unknown as Element;
    assert.equal(report.facts?.selector, selectorFor(fromElement(real)), 'selector 必须与冻结口径逐字符相等');
    assert.equal(report.facts?.semanticPath, semanticPathFor(fromElement(real)), 'semanticPath 必须与冻结口径逐字符相等');
    assert.equal(report.facts?.textDigest, textDigestFor(real), 'textDigest 必须与冻结口径逐字符相等');
  }
});

/**
 * R4（2026-09-22）—— 同源面的**深链**扩展。
 *
 * 缺陷：两侧都把 >120 字的选择器截断成 `slice(0,120)+'…'`，救援给出的「完整选择器」其实
 * 也是坏的 ⇒ 面板拿它替换后再判定仍是死引用。本用例把逐字符对拍推到**深链**上：救援侧
 * （SW 注入的等价副本）与捕获侧（页面口径）必须给出**同一个、>120 字、不含省略号**的选择器。
 */
test('R4 救援②同源：>120 字深链的选择器与捕获口径逐字符相等（不截断 ∧ 不含省略号）', () => {
  const hash = (n: number): string => `_hash${n}${'a'.repeat(18)}`;
  const target = mkEl('em', { class: hash(4) }, '深链唯一文本-R4');
  const tSib = mkEl('em', { class: hash(4) }, '同层干扰');
  const span = mkEl('span', { class: hash(3) }, '', [target, tSib]);
  const spanSib = mkEl('span', { class: hash(3) }, '干扰');
  const div = mkEl('div', { class: hash(2) }, '', [span, spanSib]);
  const divSib = mkEl('div', { class: hash(2) }, '干扰');
  const section = mkEl('section', { class: hash(1) }, '', [div, divSib]);
  const sectionSib = mkEl('section', { class: hash(1) }, '干扰');
  const root = mkRoot([mkEl('div', { id: 'deep-anchor' }, '', [section, sectionSib])]);

  const digest = digestOf(target);
  const report = rescueProbe(digest, root);
  assert.equal(report.candidates, 1, '深链目标的文本在夹具里唯一');
  const real = target as unknown as Element;
  const captured = selectorFor(fromElement(real));
  // 前置（负控）：夹具真的落在缺陷区间（> 展示上限 120）。
  assert.ok(captured.length > 120, `夹具必须 >120 字（实测 ${captured.length}）`);
  assert.ok(!captured.includes('…'), `两侧都不得截断：${captured}`);
  assert.equal(report.facts?.selector, captured, '救援侧的深链选择器必须与捕获侧逐字符相等');
  assert.equal(report.facts?.semanticPath, semanticPathFor(fromElement(real)));
  assert.equal(report.facts?.textDigest, textDigestFor(real));
});

// ── ③ 判定链：payload 元数据，不扩结论枚举 ───────────────────────────────────

const FACTS: RefFacts = {
  refId: 'ref_1',
  selector: 'div._06da35f:nth-of-type(2) > div._03a4574:nth-of-type(2)',
  semanticPath: 'body › div › div',
  textDigest: '目标文本',
  origin: 'https://a.test',
  documentId: 'doc-1',
  navSeq: 1,
  declarationHash: 'decl-1',
  declaration: { status: 'absent' },
  capturedAt: 1,
};
const GOOD: RefEnv = {
  currentOrigin: 'https://a.test',
  authorized: true,
  documentId: 'doc-1',
  navSeq: 1,
  declarationStatus: 'absent',
  resolution: { status: 'missing' },
};

test('R3 判定③：救援只作 dom-gone 的 payload 元数据——结论仍是 invalid（不新增第四态）', () => {
  const env: RefEnv = { ...GOOD, rescue: { refId: 'ref_1', candidates: 1, unique: true, urlChanged: false } };
  const view = evaluateRefValidity(FACTS, env);
  assert.equal(view.verdict, 'invalid', '救援不得把失效引用变成可用');
  assert.equal(view.dimension, 'dom-gone');
  assert.deepEqual(view.rescue, { refId: 'ref_1', candidates: 1, unique: true, urlChanged: false }, 'payload 必须原样带上');
  assert.equal(view.readableReason, reasonFor(FACTS, 'dom-gone', GOOD) + RESCUE_REASON.unique);
  // 结论枚举未扩：只有 valid / invalid / unknown 三个取值。
  assert.ok(['valid', 'invalid', 'unknown'].includes(view.verdict));
});

test('R3 判定③：0 候选维持原文案；多候选提示多处匹配且不给一键重锚；跨路径带提示', () => {
  const base = reasonFor(FACTS, 'dom-gone', GOOD);
  const zero = evaluateRefValidity(FACTS, {
    ...GOOD,
    rescue: { refId: 'ref_1', candidates: 0, unique: false, urlChanged: false },
  });
  assert.equal(zero.readableReason, base, '0 候选 = 真没了 ⇒ 不得改变原文案');

  const multi = evaluateRefValidity(FACTS, {
    ...GOOD,
    rescue: { refId: 'ref_1', candidates: 3, unique: false, urlChanged: false },
  });
  assert.match(multi.readableReason ?? '', /文本多处匹配 3 处/, '多候选必须说明歧义');
  assert.match(multi.readableReason ?? '', /请手动重新拾取/, '多候选只能手动重拾');

  const moved = evaluateRefValidity(FACTS, {
    ...GOOD,
    rescue: { refId: 'ref_1', candidates: 1, unique: true, urlChanged: true },
  });
  assert.match(moved.readableReason ?? '', /页面路径已变化/, '跨路径必须带提示');
});

test('R3 判定③：救援与引用一一对应——别的引用的观测不得挂到本条上', () => {
  const view = evaluateRefValidity(FACTS, {
    ...GOOD,
    rescue: { refId: 'ref_2', candidates: 1, unique: true, urlChanged: false },
  });
  assert.equal(view.rescue, undefined, 'refId 不匹配 ⇒ 不挂 payload');
  assert.equal(view.readableReason, reasonFor(FACTS, 'dom-gone', GOOD), '不匹配的观测不得改写原因');
});

test('R3 判定③：一键重锚的边界（唯一 ∧ 路径未变 ∧ 恰一条匹配）', () => {
  assert.equal(canReanchor({ refId: 'r', candidates: 1, unique: true, urlChanged: false }), true);
  assert.equal(canReanchor({ refId: 'r', candidates: 2, unique: false, urlChanged: false }), false, '多候选不提供');
  assert.equal(canReanchor({ refId: 'r', candidates: 1, unique: true, urlChanged: true }), false, '跨路径不提供');
  assert.equal(canReanchor({ refId: 'r', candidates: 0, unique: false, urlChanged: false }), false);
  assert.equal(canReanchor(undefined), false, '无观测 ⇒ 无按钮（fail-closed）');
});

// ── ④ 摄取管线：与手工拾取同一条（withDeclaration + onCapture） ─────────────

test('R3 摄取④：一键重锚走同一摄取管线——新事实带声明快照、路径变化时拒绝并给出可读提示', async () => {
  const sent: Array<Record<string, unknown>> = [];
  const captured: Array<{ facts: Record<string, unknown>; resolution: { status: string; nodeCount?: number } }> = [];
  const notices: string[] = [];
  const fakeDoc = {
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    getElementById: () => null,
  } as unknown as Document;
  const handle = mountPickInput({
    doc: fakeDoc,
    send: async (message) => {
      sent.push(message);
      if (message.anchor === true) {
        return {
          ok: true,
          data: {
            rescue: { candidates: 1, unique: true, urlChanged: false },
            facts: { selector: '#re-anchored', semanticPath: 'body › #re-anchored', textDigest: '候选文本', capturedAt: 7 },
          },
        };
      }
      return { ok: true, data: { rescue: { candidates: 1, unique: true, urlChanged: false } } };
    },
    envInput: () => ({
      activeOrigin: 'https://a.test',
      authorized: true,
      declaration: { status: 'absent', hash: '' },
    }),
    onCapture: (facts, resolution) => captured.push({ facts: facts as unknown as Record<string, unknown>, resolution }),
    onPageHover: () => undefined,
    onUnavailable: () => undefined,
    notify: (text) => notices.push(text),
  });

  // 只读探测：不产生摄取、不带 anchor。
  const observation = await handle.rescue({ refId: 'ref_1', selector: '#old', textDigest: '候选文本', origin: 'https://a.test' });
  assert.deepEqual(observation, { candidates: 1, unique: true, urlChanged: false });
  assert.equal(captured.length, 0, '只读探测不得摄取任何引用');
  assert.equal(sent.at(-1)?.anchor, undefined, '只读探测不得索取可锚定的事实');

  // 一键重锚：索取 anchor 事实 → 经 withDeclaration 补状态 → onCapture。
  const ok = await handle.reanchor({ refId: 'ref_1', selector: '#old', textDigest: '候选文本', origin: 'https://a.test' });
  assert.equal(ok, true);
  assert.equal(captured.length, 1, '重锚必须走 onCapture（同一摄取管线）');
  const facts = captured[0].facts;
  assert.equal(facts.selector, '#re-anchored');
  assert.equal(facts.textDigest, '候选文本');
  assert.equal(facts.origin, 'https://a.test', 'origin 由面板补齐');
  assert.deepEqual(facts.declaration, { status: 'absent' }, '声明快照由 withDeclaration() 补全');
  assert.deepEqual(captured[0].resolution, { status: 'resolved', nodeCount: 1 });

  // 拒绝路径：多候选 / 跨路径 ⇒ 不摄取 + 可读提示。
  const refusing = mountPickInput({
    doc: fakeDoc,
    send: async () => ({
      ok: true,
      data: { rescue: { candidates: 2, unique: false, urlChanged: false } },
    }),
    envInput: () => ({ activeOrigin: 'https://a.test', authorized: true, declaration: null }),
    onCapture: () => assert.fail('拒绝路径不得摄取任何引用'),
    onPageHover: () => undefined,
    onUnavailable: () => undefined,
    notify: (text) => notices.push(text),
  });
  assert.equal(await refusing.reanchor({ refId: 'ref_1', selector: '#old', textDigest: 'x', origin: 'https://a.test' }), false);
  assert.ok(notices.some((n) => n.includes('多处匹配')), `拒绝必须可读：${notices.join(' | ')}`);
});

test('R3 摄取④：重锚产生新引用而旧引用零改动（append-only）', () => {
  const store = createRefStore();
  const old = store.create({
    selector: '#old',
    semanticPath: 'body › #old',
    textDigest: '候选文本',
    origin: 'https://a.test',
    documentId: 'doc-1',
    navSeq: 1,
    declarationHash: '',
    declaration: { status: 'absent' },
    capturedAt: 1,
  });
  const env: RefEnv = { ...GOOD, rescue: { refId: old.facts.refId, candidates: 1, unique: true, urlChanged: false } };
  store.judge(env);
  const before = store.get(old.facts.refId);
  assert.equal(before?.verdict, 'invalid', '旧引用必须先被判失效');

  const fresh = store.create({
    selector: '#re-anchored',
    semanticPath: 'body › #re-anchored',
    textDigest: '候选文本',
    origin: 'https://a.test',
    documentId: 'doc-1',
    navSeq: 1,
    declarationHash: '',
    declaration: { status: 'absent' },
    capturedAt: 7,
  });
  store.judge(env);
  const after = store.get(old.facts.refId);
  assert.equal(store.all().length, 2, '重锚是追加，不是替换');
  assert.notEqual(fresh.facts.refId, old.facts.refId, '新引用必须用新 id（序号递增）');
  assert.deepEqual(after?.facts, before?.facts, '旧引用的捕获事实零改动');
  assert.equal(after?.readableReason, before?.readableReason, '旧引用的失效原因零改动（留痕契约）');
});

// ── ⑤ 只读 / 同 origin / 已授权：路由逐出口 fail-closed（布线级） ────────────

test('R3 路由⑤：ref-rescue 逐出口 fail-closed——缺事实 / 跨站 / 未授权 / 不可达都报 0 候选', () => {
  const sw = read('src/background/service-worker.ts');
  const start = sw.indexOf("case 'ref-rescue':");
  const end = sw.indexOf('\n    }', start);
  const body = sw.slice(start, end);
  assert.ok(body.length > 0, 'ref-rescue 路由必须存在');
  assert.match(body, /if \(!refOrigin \|\| !digest\) return noRescue\(/, '缺事实 ⇒ 不救援');
  assert.match(body, /if \('error' in target\) return noRescue\(/, '无目标 tab ⇒ 不救援');
  assert.match(body, /if \(target\.origin !== refOrigin\) return noRescue\(/, '跨站 ⇒ 不救援（同 origin 硬前提）');
  assert.match(body, /if \(!env\.authorized\) return noRescue\(/, '未授权 ⇒ 零注入、不救援');
  assert.match(body, /if \(!probe\) return noRescue\(/, '页面不可达 ⇒ 不救援（不得伪造 0 候选以外的结论）');
  // 只读：探测只走 executeScript 的只读函数，路由本身不写页面、不建引用。
  assert.match(sw, /func: rescueProbe, args: \[digest\]/, '探测必须是 SW 注入的只读函数');
  assert.ok(!/sheet|setAttribute|appendChild/.test(body), '路由不得写页面（只读）');
  // 一键重锚的事实只在「唯一 ∧ 路径未变」时回传。
  assert.match(body, /wantFacts && unique && !urlChanged && probe\.facts/, '可锚定事实的出口必须同时满足唯一与路径未变');
});

test('R3 路由⑤：ref-rescue 是类型面 kind，绝不进入注入 content.js 的 KIND_SET', () => {
  const messaging = read('src/background/messaging.ts');
  assert.match(messaging, /\| 'ref-rescue';/, 'kind 必须登记在 PluginMessageKind');
  const kindSet = messaging.slice(messaging.indexOf('const KIND_SET'), messaging.indexOf(']);', messaging.indexOf('const KIND_SET')));
  assert.ok(!kindSet.includes("'ref-rescue'"), 'KIND_SET 会进冻结的 content.js ⇒ ref-rescue 不得进入');
});

test('R3 路径⑤：rescuePathOf 只做路径比较，不可解析 ⇒ null（不误报）', () => {
  assert.equal(rescuePathOf('https://a.test/app/deep'), '/app/deep');
  assert.equal(rescuePathOf('https://a.test/'), '/');
  assert.equal(rescuePathOf(''), null);
  assert.equal(rescuePathOf('not a url'), null);
});
