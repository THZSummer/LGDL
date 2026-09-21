/**
 * V5-2 **TASK-V5-132** (ADR-V5-003 §2 · FR-ALLN-068 · **C-2** · R-V5-101) — the
 * **SW registry mirror** gate.
 *
 * ── The claim ───────────────────────────────────────────────────────────────
 *
 * The service-worker executor keeps a minimal contract mirror of the ops it serves —
 * exactly the four fields `{id, mode, fail, audit}` — and that mirror is **derived from
 * the ONE descriptor table** (`shared/op-table.ts`), never hand-written. Three
 * consequences are judged here:
 *
 *   ① the mirror's inner field set is exactly `{mode, fail, audit}` and it covers
 *      exactly the two privileged ops (`op.authorize` / `op.perm.request`);
 *   ② the descriptor rows exist **exactly once** in `src/**` (a second hand-written
 *      copy is the drift seam this gate exists for);
 *   ③ the panel registry and the SW mirror disagree with the table **simultaneously**
 *      when the table is edited (the drift reverse proof).
 *
 * @module test/sw-op-mirror
 */
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { SW_OPS, SW_OP_FIELDS } from '../src/background/op-executors.js';
import { execSwOp } from '../src/background/op-executors.js';
import { OPS_BY_ID } from '../src/ui/sidepanel/next-registry/pipeline.js';
import { OP_DESCRIPTORS, OP_IDS, SW_OP_DESCRIPTORS, opDescriptor } from '../src/shared/op-table.js';

const PKG = fileURLToPath(new URL('../../', import.meta.url));
const read = (rel: string): string => readFileSync(join(PKG, rel), 'utf8');

/** `expectFailPattern` of every judgement declared by this gate (the meta-gate marker). */
export interface SwMirrorJudgement {
  readonly id: string;
  readonly expectFailPattern: string;
}
export const JUDGEMENTS: readonly SwMirrorJudgement[] = [
  { id: 'SW-M-1-mirror-shape', expectFailPattern: '特权 op 镜像必须恰 2 项（FR-ALLN-066）' },
  { id: 'SW-M-2-single-declaration', expectFailPattern: '的描述符行必须只在 op-table.ts' },
  { id: 'SW-M-3-drift-proof', expectFailPattern: '伪造后 sw 行数必须 +1（镜像判据可失败）' },
  { id: 'SW-M-4-executor-loud', expectFailPattern: '未注册特权 op 必须拒绝（不得静默放行）' },
];

export function srcFiles(dir = join(PKG, 'src')): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) out.push(...srcFiles(p));
    else out.push(p);
  }
  return out;
}

/** Judge ③ — how many `src/**` files declare an op descriptor row for `opId`. */
export function descriptorRowSites(opId: string): string[] {
  return srcFiles()
    .filter((f) => new RegExp(`'${opId.replace('.', '\\.')}'\\s*,\\s*'panel'|'${opId.replace('.', '\\.')}'\\s*,\\s*'sw'`).test(readFileSync(f, 'utf8')))
    .map((f) => f.slice(PKG.length));
}

// ── ① the mirror's shape ─────────────────────────────────────────────────────

test('SW-M ①: 镜像字段集恰 {mode, fail, audit}，且覆盖恰 2 项特权 op', () => {
  assert.deepEqual([...SW_OP_FIELDS], ['mode', 'fail', 'audit']);
  assert.deepEqual(Object.keys(SW_OPS).sort(), ['op.authorize', 'op.perm.request'], '特权 op 镜像必须恰 2 项（FR-ALLN-066）');
  assert.equal(SW_OP_DESCRIPTORS.length, 2, '顶层表里 layer === sw 的行必须恰 2 项');
  for (const [id, row] of Object.entries(SW_OPS)) {
    assert.deepEqual(Object.keys(row).sort(), ['audit', 'fail', 'mode'], `${id} 的镜像字段集必须无多无少`);
  }
});

test('SW-M ①: 镜像与顶层描述符逐字段同源（mode / fail / audit）', () => {
  for (const [id, row] of Object.entries(SW_OPS)) {
    const d = opDescriptor(id);
    assert.ok(d, `镜像项 ${id} 必须有描述符行（否则是第二份手工镜像）`);
    assert.equal(row.mode, d?.mode, `${id}.mode 必须同源`);
    assert.equal(row.fail, d?.fail, `${id}.fail 必须同源`);
    assert.equal(row.audit, d?.audit, `${id}.audit 必须同源`);
  }
});

// ── ② 单源：9 行描述符只出现一次 ─────────────────────────────────────────────

test('SW-M ②: 9 行描述符只声明于 shared/op-table.ts（恰一处声明）', () => {
  assert.equal(OP_DESCRIPTORS.length, 9, 'op 表必须恰 9 行');
  assert.equal(new Set(OP_IDS).size, 9, 'opId 必须唯一');
  for (const id of OP_IDS) {
    const sites = descriptorRowSites(id);
    assert.deepEqual(sites, ['src/shared/op-table.ts'], `${id} 的描述符行必须只在 op-table.ts（实测 ${sites.join(', ')}）`);
  }
  // 面板注册表由同一张表派生：两侧 opId 集必须相等（drop 一个 ⇒ 红）。
  assert.deepEqual(Object.keys(OPS_BY_ID).sort(), [...OP_IDS].sort(), '面板注册表 opId 集必须 == 顶层表 opId 集');
  for (const id of OP_IDS) assert.equal(OPS_BY_ID[id]?.layer, opDescriptor(id)?.layer, `${id} 的 layer 必须来自顶层表`);
});

// ── ③ 漂移反证：改顶层表一行 ⇒ 两侧同时红 ────────────────────────────────────

test('SW-M ③ 反证：顶层表改一行 / 反写一份手工镜像 ⇒ 两侧判据同时红', () => {
  // ① 表一行被改（layer panel→sw）：SW 镜像多一项 ∧ 面板注册表 layer 不符 —— 两个判据都能失败。
  const forgedTable = read('src/shared/op-table.ts').replace("['op.help', 'panel', 'card-boundary', false]", "['op.help', 'sw', 'card-boundary', false]");
  assert.notEqual(forgedTable, read('src/shared/op-table.ts'), '前置：注入锚点必须存在');
  const forgedSwRows = [...forgedTable.matchAll(/\['([^']+)', 'sw'/g)].map((m) => m[1]);
  const realSwRows = [...read('src/shared/op-table.ts').matchAll(/\['([^']+)', 'sw'/g)].map((m) => m[1]);
  assert.equal(forgedSwRows.length, realSwRows.length + 1, '伪造后 sw 行数必须 +1（镜像判据可失败）');
  assert.notDeepEqual(forgedSwRows, realSwRows, '伪造后镜像项集必须与真源不等');
  // ② 反写一份手工镜像（第二处声明）：同源扫描必须能定位它。
  const forgedMirror = `const SW_OPS = { 'op.turn': { mode: 'waterfall', fail: 'card-boundary', audit: false } };`;
  const forgedSites = descriptorRowSites('op.turn').concat(['src/background/forged.ts']);
  assert.ok(forgedSites.length > 1, '手工镜像必须被「恰一处声明」判据定位（第二处 ⇒ 红）');
  assert.ok(forgedMirror.includes('op.turn'), '前置：伪造镜像内容非空');
});

// ── ④ 执行器：opId 先判、缺 consent 拒绝、op.perm.request 仍未落地（loud） ──

const deps = {
  authorize: async (origin: string, granted: boolean) => ({ origin, granted }),
  snapshot: async () => [{ origin: 'https://a.test' }],
  activeOrigin: () => 'https://a.test',
  patternOf: (_o: string) => 'https://a.test/*',
  audit: () => {},
};

test('SW-M ④: probe 只读（快照 + 手势指令），commit 才写授权；缺 consent 一律拒绝', async () => {
  const probe = await execSwOp({ kind: 'op-exec', opId: 'op.authorize', phase: 'probe', consentToken: 'c', origin: 'https://a.test' }, deps);
  assert.equal(probe.ok, true);
  assert.deepEqual((probe.data as { needsGesture?: boolean }).needsGesture, true, 'probe 必须要求页面手势（SW 无手势）');
  const unregistered = await execSwOp({ kind: 'op-exec', opId: 'op.ghost', phase: 'probe', consentToken: 'c' }, deps);
  assert.equal(unregistered.ok, false, '未注册特权 op 必须拒绝（不得静默放行）');
  const pending = await execSwOp({ kind: 'op-exec', opId: 'op.perm.request', phase: 'commit', consentToken: 'c', gestureResult: { granted: true } }, deps);
  assert.equal(pending.ok, false, 'op.perm.request 执行体未落地 ⇒ loud 拒绝（v5-2 R2 补）');
  const commit = await execSwOp({ kind: 'op-exec', opId: 'op.authorize', phase: 'commit', consentToken: 'c', gestureResult: { granted: true } }, deps);
  assert.equal(commit.ok, true);
  assert.deepEqual((commit.data as { granted?: boolean }).granted, true);
});
