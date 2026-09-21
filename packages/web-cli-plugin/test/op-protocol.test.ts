/**
 * V5-2 **TASK-V5-130** (ADR-V5-003 §1 · FR-ALLN-067 / 111 · **X2** · AC-ALLN-010 ·
 * N8 · R-ALLN-002) — the `op-*` **type-only** message family's gate.
 *
 * ── The claim, and how it is judged ─────────────────────────────────────────
 *
 * The `op-*` kinds must reach both bundles **without growing the injected
 * `content.js`** (177,076 B / sha `52a82620…`, zero headroom). That is a claim about
 * `KIND_SET` membership and import edges, so it is judged on exactly those two:
 *
 *   ① `KIND_SET`'s literal block is **byte-identical** to its recorded baseline;
 *   ② `dist/content.js` matches the pin byte-for-byte (when the artifact is built);
 *   ③ `op-protocol.ts` exists as its OWN runtime validator and `src/content/**` has
 *      **zero** import edges into the family;
 *   ④ the judgment can FAIL: appending the three literals to `KIND_SET` is detected.
 *
 * @module test/op-protocol
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { OP_MESSAGE_KINDS, isOpMessage, opExecRequestProblems } from '../src/background/op-protocol.js';
import { isPluginMessage } from '../src/background/messaging.js';

// Resolved from the PACKAGE ROOT: `npm test` compiles to `dist-test/`, so a
// `new URL('../src/…', import.meta.url)` would look inside `dist-test/src/`.
const PKG = fileURLToPath(new URL('../../', import.meta.url));
const read = (rel: string): string => readFileSync(join(PKG, rel), 'utf8');

/** `expectFailPattern` of every judgement declared by this gate (the meta-gate marker). */
export interface OpProtocolJudgement {
  readonly id: string;
  readonly expectFailPattern: string;
}
export const JUDGEMENTS: readonly OpProtocolJudgement[] = [
  { id: 'OP-P-1-kindset-verbatim', expectFailPattern: 'KIND_SET 的字面量集合与顺序必须逐字不变' },
  { id: 'OP-P-2-content-bytes', expectFailPattern: 'content.js 尺寸必须逐字节命中 177,076 B' },
  { id: 'OP-P-3-single-validator', expectFailPattern: 'op-* 的运行期集合判定必须只出现在 op-protocol.ts' },
  { id: 'OP-P-4-reverse-proof', expectFailPattern: '注入后必须与基线不等（逐字判据可失败）' },
];

/** The pinned frozen artifacts (FR-ALLN-069, zero tolerance). */
export const CONTENT_PIN = {
  bytes: 177_076,
  sha256: '52a826205553b46a896ccad54225d63ba62f5f7fe7c969a9bc2e655448d5b5f6',
} as const;

/** Judge ① — the `KIND_SET` literal block (extracted verbatim). */
export function kindSetBlock(source: string): string | null {
  const start = source.indexOf('const KIND_SET');
  if (start < 0) return null;
  const end = source.indexOf(']);', start);
  return end < 0 ? null : source.slice(start, end + 3);
}

/**
 * The recorded `KIND_SET` baseline. It is asserted **verbatim**, so any new literal —
 * including an `op-*` one — is a hard failure with a readable reason.
 */
export const KIND_SET_BASELINE: readonly string[] = Object.freeze([
  'ping', 'state', 'discover', 'authorize', 'revoke', 'set-trust', 'invoke-site', 'site-invoke',
  'site-invoke-result', 'site-event', 'site-event-push', 'chat', 'chat-result', 'audit-export',
  'confirm-request', 'confirm-response', 'ask-user-request', 'ask-user-response', 'risk-control',
  'llm-config', 'llm-status', 'llm-test', 'reprobe', 'probe-changed', 'rebind', 'diag', 'hello',
  'whoami', 'sessions', 'session-switch', 'session-group', 'session-changed', 'tabs-setting',
  'capabilities', 'capability-changed', 'auto-auth', 'fetch-text', 'dom-op', 'file-save', 'clipboard-op',
]);

/** Every literal inside a `KIND_SET` block, in source order. */
export function kindSetLiterals(block: string): string[] {
  return [...block.matchAll(/'([^']+)'/g)].map((m) => m[1]);
}

/** Every `src/**` file (recursive) — the "no import edge" scan's domain. */
export function srcFiles(dir = join(PKG, 'src')): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) out.push(...srcFiles(p));
    else out.push(p);
  }
  return out;
}

/** Import targets of `src/content/**` (the frozen injected-bundle side). */
export function contentImportTargets(): string[] {
  const targets: string[] = [];
  for (const file of srcFiles(join(PKG, 'src/content'))) {
    for (const m of readFileSync(file, 'utf8').matchAll(/from\s+'([^']+)'/g)) targets.push(m[1]);
  }
  return targets;
}

const MESSAGING = read('src/background/messaging.ts');

// ── ① KIND_SET 逐字零新增 ─────────────────────────────────────────────────────

test('OP-P ①: KIND_SET 逐字零新增（op-* 不是 kind set 成员）', () => {
  const block = kindSetBlock(MESSAGING);
  assert.ok(block, 'KIND_SET 必须存在（判据不得空转）');
  assert.deepEqual(kindSetLiterals(block as string), [...KIND_SET_BASELINE], 'KIND_SET 的字面量集合与顺序必须逐字不变');
  for (const kind of OP_MESSAGE_KINDS) {
    assert.ok(!(kindSetLiterals(block as string).includes(kind)), `op-* 成员 ${kind} 不得进入 KIND_SET（content.js 会增长）`);
    assert.equal(isPluginMessage({ kind }), false, `${kind} 不得被 isPluginMessage 接受（KIND_SET 是它的唯一判据）`);
  }
});

test('OP-P ①: PluginMessageKind 的 union 确实扩了 3 项（声明在类型面，不在运行时集合）', () => {
  for (const kind of ['op-exec', 'op-exec-result', 'op-audit'] as const) {
    assert.match(MESSAGING, new RegExp(`\\|\\s*'${kind}'`), `union 必须含 ${kind}`);
  }
  assert.deepEqual([...OP_MESSAGE_KINDS], ['op-exec', 'op-exec-result', 'op-audit']);
});

// ── ② content.js 逐字节（产物存在时） ────────────────────────────────────────

test('OP-P ②: dist/content.js 逐字节命中 pin（已构建时；缺失则跳过并注明）', () => {
  const artifact = join(PKG, 'dist/content.js');
  if (!existsSync(artifact)) {
    assert.ok(true, 'dist/content.js 未构建 ⇒ 本判据跳过（由 `npm run build` 后的门禁复跑覆盖）');
    return;
  }
  const buf = readFileSync(artifact);
  assert.equal(buf.length, CONTENT_PIN.bytes, 'content.js 尺寸必须逐字节命中 177,076 B');
  assert.equal(createHash('sha256').update(buf).digest('hex'), CONTENT_PIN.sha256, 'content.js sha256 必须命中 52a82620…');
});

// ── ③ 独立校验模块 + 零 import 边 ────────────────────────────────────────────

test('OP-P ③: isOpMessage 是本族唯一运行时校验，且 src/content/** 零 op-* import 边', () => {
  const validator = read('src/background/op-protocol.ts');
  assert.match(validator, /export function isOpMessage/, 'op-protocol.ts 必须导出运行期校验');
  // 「唯一运行时校验」：其它 src 文件不得各自再写一个 op-* 集合判定。
  const others = srcFiles()
    .filter((f) => !f.endsWith('op-protocol.ts'))
    .filter((f) => /new Set<string>\(\s*\[\s*'op-exec'/.test(readFileSync(f, 'utf8')));
  assert.deepEqual(others, [], 'op-* 的运行期集合判定必须只出现在 op-protocol.ts');
  const offending = contentImportTargets().filter((t) => /op-(protocol|table|executors)/.test(t));
  assert.deepEqual(offending, [], 'src/content/** 不得引用 op-* 模块（否则 content.js 会增长）');
  // 判据非恒真：一个真实的 op-* 校验请求可由该模块接受，而别的路径不接受。
  assert.equal(isOpMessage({ kind: 'op-exec' }), true);
  assert.equal(isPluginMessage({ kind: 'op-exec' }), false);
  assert.equal(isOpMessage({ kind: 'ping' }), false);
});

test('OP-P ③: op-exec 请求形状被 loud 校验（缺 consentToken ⇒ 拒绝，不静默放行）', () => {
  assert.deepEqual(opExecRequestProblems({ kind: 'op-exec', opId: 'op.authorize', phase: 'probe', consentToken: 'c' }), []);
  assert.ok(opExecRequestProblems({ kind: 'op-exec', opId: 'op.authorize', phase: 'probe' }).length > 0, '缺 consentToken 必须判红');
  assert.ok(opExecRequestProblems({ kind: 'op-exec', opId: 'op.authorize', phase: 'commit', consentToken: 'c' }).length > 0, 'commit 缺 gestureResult 必须判红');
  assert.deepEqual(
    opExecRequestProblems({ kind: 'op-exec', opId: 'op.authorize', phase: 'commit', consentToken: 'c', gestureResult: { granted: false } }),
    [],
  );
  assert.ok(opExecRequestProblems({ kind: 'ping' }).length > 0, '非 op-* 消息必须判红');
});

// ── ④ 反证：把 op-* 加进 KIND_SET ⇒ 判据必红 ─────────────────────────────────

test('OP-P ④ 反证：把 op-* 追加进 KIND_SET ⇒ 逐字零新增判据必红（并在内存中还原）', () => {
  const block = kindSetBlock(MESSAGING) as string;
  const forged = MESSAGING.replace(block, block.replace(']);', "  'op-exec',\n  'op-exec-result',\n  'op-audit',\n]);"));
  assert.notEqual(forged, MESSAGING, '前置：注入锚点必须存在');
  const forgedBlock = kindSetBlock(forged) as string;
  const forgedLiterals = kindSetLiterals(forgedBlock);
  assert.ok(
    forgedLiterals.length > KIND_SET_BASELINE.length,
    `伪造后字面量必须变多（判据能失败）：${forgedLiterals.length} vs ${KIND_SET_BASELINE.length}`,
  );
  assert.notDeepEqual(forgedLiterals, [...KIND_SET_BASELINE], '注入后必须与基线不等（逐字判据可失败）');
  // 还原：真实源文本仍与基线逐字相同（反证只发生在字符串上，磁盘零触碰）。
  assert.deepEqual(kindSetLiterals(kindSetBlock(MESSAGING) as string), [...KIND_SET_BASELINE]);
});
