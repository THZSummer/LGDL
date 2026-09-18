/**
 * W2 修复轮（2026-09-13）：`insight-protocol.ts` 独立校验路径单测。
 *
 * 背景（review §2 C18 / §7 W2）：为守住 `content.js` 零增长红线（NFR-V2-002），
 * V2-1 把 `insight-*` 两种消息从共享 `KIND_SET`（会打进 content script）拆到
 * `src/background/insight-protocol.ts` 的第二校验路径。该路径此前**无任何单测**，
 * 与主路径的一致性也无门禁 —— 本文件补齐：
 *   ① 合法 insight 消息 → 通过；
 *   ② 未知 / 畸形 kind → 拒绝；
 *   ③ 缺字段 / 类型错 / 非对象 → 拒绝；
 *   ④ 与主 `KIND_SET`（`isPluginMessage`）路径的校验强度等价（同一批反例）；
 *   ⑤ 不存在「未校验即放行」：SW 入口并集守卫对畸形输入一律拒绝。
 *
 * **新文件承载**；不修改 v1 任何既有测试，不修改判定链。
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  INSIGHT_MESSAGE_KINDS,
  isInsightMessage,
} from '../src/background/insight-protocol.js';
import { isPluginMessage } from '../src/background/messaging.js';
// V3-4: the third (independently validated) message face — see `content/pick-protocol.ts`.
import { isPickLayerMessage } from '../src/content/pick-protocol.js';
// R3: the fourth independently-validated face (panel⇄SW rescue, background-only module).
import { isRefRescueMessage } from '../src/background/ref-rescue.js';

/** An independent oracle re-deriving the documented validation strength. */
function oracle(value: unknown): boolean {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { kind?: unknown }).kind === 'string' &&
    (INSIGHT_MESSAGE_KINDS as readonly string[]).includes((value as { kind: string }).kind)
  );
}

test('W2 insight-protocol: the additive kinds are exactly the two documented values', () => {
  assert.deepEqual([...INSIGHT_MESSAGE_KINDS], ['insight-tree', 'insight-changed']);
  // The two sets stay disjoint: these kinds must NOT be in the shared KIND_SET
  // (adding them there would bundle them into content.js — NFR-V2-002 red line).
  for (const kind of INSIGHT_MESSAGE_KINDS) {
    assert.equal(
      isPluginMessage({ kind }),
      false,
      `${kind} must NOT be accepted by the shared KIND_SET (content.js zero-growth)`,
    );
  }
});

test('W2 insight-protocol: valid insight messages pass (with or without a payload)', () => {
  assert.equal(isInsightMessage({ kind: 'insight-tree' }), true);
  assert.equal(isInsightMessage({ kind: 'insight-changed' }), true);
  assert.equal(isInsightMessage({ kind: 'insight-tree', requestId: 'r1', action: 'get' }), true);
  assert.equal(isInsightMessage({ kind: 'insight-changed', anything: { nested: [1, 2] } }), true);
});

test('W2 insight-protocol: unknown / malformed kinds are rejected', () => {
  const rejected: Array<[string, unknown]> = [
    ['unknown string kind', { kind: 'insight-unknown' }],
    ['case-mismatch kind', { kind: 'INSIGHT-TREE' }],
    ['prefix-only kind', { kind: 'insight' }],
    ['suffix-only kind', { kind: 'tree' }],
    ['empty kind', { kind: '' }],
    ['near-miss kind (trailing space)', { kind: 'insight-tree ' }],
    ['valid other-plugin kind is not an insight message', { kind: 'capability-changed' }],
    ['valid other-plugin kind is not an insight message (2)', { kind: 'tabs-setting' }],
  ];
  for (const [label, value] of rejected) {
    assert.equal(isInsightMessage(value), false, `${label} must be rejected`);
  }
});

test('W2 insight-protocol: missing field / wrong type / non-object are rejected', () => {
  const rejected: Array<[string, unknown]> = [
    ['missing kind', {}],
    ['kind is null', { kind: null }],
    ['kind is a number', { kind: 1 }],
    ['kind is a boolean', { kind: true }],
    ['kind is an object', { kind: { kind: 'insight-tree' } }],
    ['kind is an array', { kind: ['insight-tree'] }],
    ['value is null', null],
    ['value is undefined', undefined],
    ['value is a string', 'insight-tree'],
    ['value is a number', 42],
    ['value is a boolean', false],
    ['value is an array', ['insight-tree']],
    ['value is a function', () => 'insight-tree'],
  ];
  for (const [label, value] of rejected) {
    assert.equal(isInsightMessage(value), false, `${label} must be rejected`);
  }
});

test('W2 insight-protocol: validation strength is equivalent to the shared KIND_SET path', () => {
  // Same counterexample corpus → both predicates agree (neither is more lenient).
  const corpus: unknown[] = [
    null,
    undefined,
    0,
    1,
    '',
    'insight-tree',
    true,
    false,
    [],
    ['insight-tree'],
    {},
    { kind: null },
    { kind: 1 },
    { kind: true },
    { kind: {} },
    { kind: [] },
    { kind: '' },
    { kind: 'insight-tree' },
    { kind: 'insight-changed' },
    { kind: 'insight-unknown' },
    { kind: 'INSIGHT-TREE' },
    { kind: 'tree' },
    { kind: 'ping' },
    { kind: 'capability-changed' },
    { kind: 'insight-tree', requestId: 'r' },
    { kind: 'insight-tree ' },
  ];
  for (const value of corpus) {
    assert.equal(
      isInsightMessage(value),
      oracle(value),
      `isInsightMessage disagrees with the documented oracle for ${JSON.stringify(value)}`,
    );
  }

  // The disjunction (the SW entry guard) accepts exactly the union of both sets;
  // every structurally-invalid input is rejected by BOTH paths.
  const bothReject: unknown[] = [
    null,
    undefined,
    0,
    1,
    '',
    'insight-tree',
    true,
    false,
    [],
    ['insight-tree'],
    {},
    { kind: null },
    { kind: 1 },
    { kind: true },
    { kind: {} },
    { kind: [] },
    { kind: '' },
    { kind: 'insight-unknown' },
    { kind: 'INSIGHT-TREE' },
    { kind: 'tree' },
    { kind: 'insight-tree ' },
    { kind: 'not-a-kind' },
  ];
  for (const value of bothReject) {
    assert.equal(isInsightMessage(value), false, `invalid ${JSON.stringify(value)} must be rejected by isInsightMessage`);
    assert.equal(isPluginMessage(value), false, `invalid ${JSON.stringify(value)} must be rejected by isPluginMessage`);
  }
  // A valid other-plugin kind passes the shared path but NOT the insight path.
  assert.equal(isPluginMessage({ kind: 'capability-changed' }), true);
  assert.equal(isInsightMessage({ kind: 'capability-changed' }), false);
  // A valid insight kind is accepted by exactly one of the two paths (disjoint).
  assert.equal(isInsightMessage({ kind: 'insight-tree' }), true);
  assert.equal(isPluginMessage({ kind: 'insight-tree' }), false);
});

test('W2 insight-protocol: the SW entry guard has no unvalidated pass-through', () => {
  const sw = readFileSync(new URL('../../src/background/service-worker.ts', import.meta.url), 'utf8');
  // The union guard must reject anything that **no** predicate accepts. V3-4 added a
  // third, independently-validated face (the on-demand pick layer, kept out of the
  // shared `KIND_SET` because that set is bundled into the frozen `content.js`), and R3
  // added a fourth (`ref-rescue`, a panel⇄SW kind whose validator lives on a
  // background-only module for the same byte-freeze reason), so the guard now names four
  // predicates — the claim is unchanged and strictly stronger (it admits exactly the
  // faces that have validators, and nothing else).
  assert.match(
    sw,
    /if\s*\(\s*!isPluginMessage\(raw\)\s*&&\s*!isInsightMessage\(raw\)\s*&&\s*!isPickLayerMessage\(raw\)\s*&&\s*!isRefRescueMessage\(raw\)\s*\)\s*\{\s*return\s+undefined;\s*\}/,
    'service-worker must reject raw messages that fail every validator (no unvalidated pass-through)',
  );
  assert.match(sw, /import\s*\{\s*isInsightMessage\s*\}\s*from\s*'\.\/insight-protocol\.js';/);
  assert.match(sw, /import\s*\{\s*isPickLayerMessage\s*\}\s*from\s*'\.\.\/content\/pick-protocol\.js';/);
  assert.match(sw, /import\s*\{\s*isRefRescueMessage[^}]*\}\s*from\s*'\.\/ref-rescue\.js';/);
  // Re-derive the guard for a malformed corpus: all rejected.
  const unionGuard = (v: unknown) =>
    isPluginMessage(v) || isInsightMessage(v) || isPickLayerMessage(v) || isRefRescueMessage(v);
  for (const bad of [null, undefined, {}, { kind: 1 }, { kind: 'nope' }, { kind: 'insight-tree ' }]) {
    assert.equal(unionGuard(bad), false, `${JSON.stringify(bad)} must not pass the SW entry guard`);
  }
  // 反证：三个校验器都必须真的参与 —— 任一被移除，本语料里的某一条就会漏进来。
  assert.equal(isPickLayerMessage({ kind: 'pick-layer-inject' }), true, '拾取层 kind 必须由它自己的校验器接受');
  assert.equal(isPluginMessage({ kind: 'pick-layer-inject' }), false, '拾取层 kind 不在 KIND_SET 里（否则 content.js 会被撑大）');
  assert.equal(isInsightMessage({ kind: 'pick-layer-inject' }), false);
  // R3: the fourth face is admitted by its own validator and by no other path.
  assert.equal(isRefRescueMessage({ kind: 'ref-rescue' }), true, 'ref-rescue 必须由它自己的校验器接受');
  assert.equal(isPluginMessage({ kind: 'ref-rescue' }), false, 'ref-rescue 不在 KIND_SET 里（否则 content.js 会被撑大）');
  assert.equal(isInsightMessage({ kind: 'ref-rescue' }), false);
  assert.equal(isPickLayerMessage({ kind: 'ref-rescue' }), false, 'ref-rescue 不属页面侧面（不碰冻结 pick-protocol）');
  assert.equal(unionGuard({ kind: 'ref-rescue' }), true, 'ref-rescue 必须能通过 SW 入口并集守卫');
});
