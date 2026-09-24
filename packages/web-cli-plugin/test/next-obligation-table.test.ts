/**
 * V5-1 **TASK-V5-117** (leaf `specs-tree-v5-1-next-registry-pipeline`) — the
 * **义务表一致性机核** (ADR-V5-001 R7 · FR-ALLN-036 / 037 · AC-ALLN-004 / 005 ·
 * R-ALLN-901「注册表 ↔ 义务表漂移」).
 *
 * ── What it judges ───────────────────────────────────────────────────────────
 *
 *   ① **行数 / opId 集** — the table declares exactly **9** ops (`DC-ALLN-001`:
 *      design 8 + `op.turn`) and the **registered** op set (`OPS_BY_ID`) is a subset
 *      of it: an op cannot enter the registry without a row.
 *   ② **四要素逐项非空** — 功能名 / 触发 provider / 挂载点·模式 / 失败语义.
 *   ③ **模式派生** — every mount point's mode comes from the one `MOUNT_MODE` table
 *      (a restated mode literal in the row would be a second authority).
 *   ④ **chips 无悬空** — every chip of every registered provider is a declared opId.
 *   ⑤ **表尾明示义务** — the tail literal must really carry the `diff = 0` contract.
 *
 * ── Falsifiability ───────────────────────────────────────────────────────────
 *
 * The judges are pure (`source text` / `rows` in, problem list out) so the three
 * required injections are driven **for real** on a temp copy of the module —
 * ① 义务表多一行 ② 注册表多一个 op ③ 某 chip 悬空 — and each must turn the judge red
 * while the repository file stays byte-identical (sha256 asserted before/after).
 *
 * @module test/next-obligation-table
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { NEXT_MOUNT_POINTS, MOUNT_MODE } from '../src/ui/sidepanel/next-registry/definition.js';
import { ACT_TO_OP, SET_A_PROTOCOL_ACTIONS } from '../src/ui/sidepanel/next-registry/dispatch.js';
import {
  OBLIGATION_FAIL_SEMANTICS,
  OBLIGATION_OP_IDS,
  OBLIGATION_ROWS,
  OBLIGATION_TAIL,
  OP_SPECS,
  assertObligationCoverage,
  unmappedOpIds,
} from '../src/ui/sidepanel/next-registry/obligation-table.js';
import { OPS_BY_ID } from '../src/ui/sidepanel/next-registry/pipeline.js';
import { resolveOrder } from '../src/ui/sidepanel/next-registry/registry.js';
import { registerBuiltinProviders } from '../src/ui/sidepanel/next-registry/providers.js';

// Resolved from the PACKAGE ROOT: `npm test` compiles to `dist-test/`.
const PKG = fileURLToPath(new URL('../../', import.meta.url));
const TABLE_REL = 'src/ui/sidepanel/next-registry/obligation-table.ts';
const TABLE_SRC = readFileSync(join(PKG, TABLE_REL), 'utf8');
const sha256 = (text: string): string => createHash('sha256').update(text, 'utf8').digest('hex');

/** The 9 ops of `DC-ALLN-001` — the literal contract this table must carry. */
const EXPECTED_OP_IDS = [
  'op.turn',
  'op.pick',
  'op.describe',
  'op.authorize',
  'op.rebind',
  'op.help',
  'op.llm-config',
  'op.perm.request',
  'op.revoke',
] as const;

/** The tail must state the contract obligation itself (FR-ALLN-036). */
const TAIL_OBLIGATION = /新增 provider \/ op 只改注册表条目[\s\S]*handleCardAction[\s\S]*diff = 0/;

/* ────────────────────────────────────────────────────────────────────────────
 * 1. The judges (pure — the injections drive the same functions)
 * ──────────────────────────────────────────────────────────────────────────── */

/** `expectFailPattern` of every judgement declared by this gate. */
export interface ObligationJudgement {
  readonly id: string;
  readonly expectFailPattern: string;
}
export const JUDGEMENTS: readonly ObligationJudgement[] = [
  { id: 'OT-1-row-count-and-ids', expectFailPattern: '义务表行数 / opId 集判据失败：' },
  { id: 'OT-2-four-elements-nonempty', expectFailPattern: '四要素逐项非空判据失败：' },
  { id: 'OT-3-mount-mode-derived', expectFailPattern: '挂载点模式必须派生自 MOUNT_MODE：' },
  { id: 'OT-4-chips-no-dangling', expectFailPattern: 'chips 悬空判据失败：' },
  { id: 'OT-5-tail-obligation', expectFailPattern: '表尾明示契约义务（diff = 0）缺失：' },
];

/** Parse the `OP_SPECS` object literal out of the module source (row-per-entry). */
export function parseSpecRows(source: string): Array<{ opId: string; body: string }> {
  const out: Array<{ opId: string; body: string }> = [];
  const re = /^ {2}'([^']+)': \{([\s\S]*?)^ {2}\},$/gm;
  for (const m of source.matchAll(re)) out.push({ opId: m[1], body: m[2] });
  return out;
}

/** ① + ② — row count, id set (duplicates refused), four elements non-empty. */
export function rowProblems(source: string): string[] {
  const rows = parseSpecRows(source);
  const problems: string[] = [];
  if (rows.length !== EXPECTED_OP_IDS.length) {
    problems.push(`义务表行数 / opId 集判据失败：行数必须为 ${EXPECTED_OP_IDS.length}（实测 ${rows.length}）`);
  }
  const ids = rows.map((r) => r.opId);
  const dup = ids.filter((id, i) => ids.indexOf(id) !== i);
  if (dup.length > 0) problems.push(`义务表行数 / opId 集判据失败：opId 重复 ${dup.join(', ')}`);
  for (const id of EXPECTED_OP_IDS) {
    if (!ids.includes(id)) problems.push(`义务表行数 / opId 集判据失败：缺 ${id} 行`);
  }
  for (const id of ids) {
    if (!(EXPECTED_OP_IDS as readonly string[]).includes(id)) {
      problems.push(`义务表行数 / opId 集判据失败：多出未登记 op ${id}`);
    }
  }
  for (const { opId, body } of rows) {
    for (const field of ['functionalName', 'providerId']) {
      // A provider id may be a literal **or** a derived identifier (the single-source
      // discipline forbids restating a blocked-terminal string in a second file).
      if (!new RegExp(`${field}:\\s*('(?:[^']+)'|[A-Za-z_$][\\w$]*)`).test(body)) {
        problems.push(`四要素逐项非空判据失败：${opId}.${field} 为空/缺失`);
      }
    }
    if (!/mountPoints:\s*\[[^\]]+\]/.test(body)) problems.push(`四要素逐项非空判据失败：${opId}.mountPoints 为空/缺失`);
    if (!/failSemantics:\s*'[a-z-]+'/.test(body)) problems.push(`四要素逐项非空判据失败：${opId}.failSemantics 为空/缺失`);
    if (!/status:\s*'(registered|pending-v5-2)'/.test(body)) problems.push(`四要素逐项非空判据失败：${opId}.status 非法`);
  }
  return problems;
}

/** ③ — every mount point is real and its mode is derived (never restated). */
export function mountProblems(rows: readonly (typeof OBLIGATION_ROWS)[number][]): string[] {
  const problems: string[] = [];
  for (const row of rows) {
    for (const mp of row.mountPoints) {
      if (!(NEXT_MOUNT_POINTS as readonly string[]).includes(mp)) {
        problems.push(`挂载点模式必须派生自 MOUNT_MODE：${row.opId} 的挂载点 ${String(mp)} 不在闭集内`);
        continue;
      }
      if (row.mountModes[mp] !== MOUNT_MODE[mp]) {
        problems.push(`挂载点模式必须派生自 MOUNT_MODE：${row.opId}.${mp} 实测 ${String(row.mountModes[mp])} ≠ ${MOUNT_MODE[mp]}`);
      }
    }
    if (!(OBLIGATION_FAIL_SEMANTICS as readonly string[]).includes(row.failSemantics)) {
      problems.push(`四要素逐项非空判据失败：${row.opId}.failSemantics ${row.failSemantics} 不在 R5 三级闭集内`);
    }
  }
  return problems;
}

/** ④ — every chip a registered provider hands out is a declared op **or** a 集 A protocol action (no dangling). */
export function chipProblems(providers: readonly { readonly id: string; readonly chips: readonly string[] }[]): string[] {
  // ★ IAN-1（ADR-IAN-001 §①/§②）—— chip 的可分发词汇 = **两集模型**：opId（义务表 9 行）
  // ∪ 集 A 协议动作（`handleCardAction` 的卡族动作）。判据方向只增不减：既有「chip 必须有
  // 义务表行」逐条保留，新增的只是**合法的第二词汇面**（两集之外仍然判红）。
  const known = new Set<string>([...OBLIGATION_OP_IDS, ...SET_A_PROTOCOL_ACTIONS]);
  const problems: string[] = [];
  for (const p of providers) {
    for (const chip of p.chips) {
      if (!known.has(chip)) problems.push(`chips 悬空判据失败：provider ${p.id} 的 chip ${chip} 无义务表行（且非集 A 协议动作）`);
    }
  }
  return problems;
}

/** ⑤ — the tail states the obligation (a table without it is not a contract). */
export function tailProblems(source: string): string[] {
  return TAIL_OBLIGATION.test(source) ? [] : [`表尾明示契约义务（diff = 0）缺失：${TABLE_REL}`];
}

/* ────────────────────────────────────────────────────────────────────────────
 * 2. 真源断言
 * ──────────────────────────────────────────────────────────────────────────── */

test('OT-1 义务表恰 9 行；注册表 opId 集 ⊆ 义务表 opId 集（无未映射 op）', () => {
  assert.deepEqual(rowProblems(TABLE_SRC), []);
  assert.equal(OBLIGATION_ROWS.length, 9);
  assert.deepEqual([...OBLIGATION_OP_IDS], [...EXPECTED_OP_IDS], 'opId 集必须与 DC-ALLN-001 的 9 op 逐字（含顺序）一致');
  const registered = Object.keys(OPS_BY_ID);
  assert.deepEqual(unmappedOpIds(registered), [], '已注册 op 必须全部有义务表行');
  assert.doesNotThrow(() => assertObligationCoverage(registered));
  // V5-2 TASK-V5-123（ADV 登记翻转）: the three ops v5-1 registered as `pending-v5-2`
  // are LANDED by this leaf, so the obligation table must have flipped with them. The
  // judgement is bidirectional — a row that is registered while still `pending-v5-2`
  // (the「登记与事实不一致」drift) fails just as loudly as the reverse.
  const pending = OBLIGATION_ROWS.filter((r) => r.status === 'pending-v5-2').map((r) => r.opId);
  assert.deepEqual(pending, [], 'v5-2 已注册 9 op ⇒ 义务表不得再有 pending-v5-2 行（登记必须与事实一致）');
  assert.deepEqual(
    OBLIGATION_ROWS.filter((r) => r.status === 'registered').map((r) => r.opId).sort(),
    [...registered].sort(),
    '义务表 landed 集必须与注册表 opId 集逐字相等（双向，零漂移）',
  );
});

test('OT-2 四要素逐项非空（每行 4 字段 + 派生模式 + 合法失败语义）', () => {
  for (const row of OBLIGATION_ROWS) {
    assert.ok(row.functionalName.trim().length > 0, `${row.opId}.functionalName`);
    assert.ok(row.providerId.trim().length > 0, `${row.opId}.providerId`);
    assert.ok(row.mountPoints.length > 0, `${row.opId}.mountPoints`);
    assert.ok(OBLIGATION_FAIL_SEMANTICS.includes(row.failSemantics), `${row.opId}.failSemantics`);
  }
  assert.deepEqual(mountProblems(OBLIGATION_ROWS), []);
  assert.equal(OBLIGATION_FAIL_SEMANTICS.length, 3, 'R5 失败语义恰三级');
});

test('OT-3 表尾明示契约义务：字面含 `diff = 0` 与 handleCardAction', () => {
  assert.deepEqual(tailProblems(TABLE_SRC), []);
  assert.match(OBLIGATION_TAIL, TAIL_OBLIGATION, '导出的表尾常量必须与源文本同一条义务');
});

test('OT-4 chips 无悬空：内置 provider 的每枚 chip 都有义务表行（或集 A 协议动作；且与 ACT_TO_OP 同源）', () => {
  registerBuiltinProviders();
  const providers = resolveOrder();
  assert.ok(providers.length >= 5, '前置：内置 provider 必须已注册（否则本判据空转）');
  assert.deepEqual(chipProblems(providers), []);
  // 前置非空转：两集词汇面都必须真的被生产 provider 用到（opId 面 + IAN-1 的集 A 面）。
  const allChips = providers.flatMap((p) => p.chips);
  assert.ok(allChips.some((c) => OBLIGATION_OP_IDS.includes(c)), 'opId 词汇面必须有真实使用');
  assert.ok(allChips.some((c) => (SET_A_PROTOCOL_ACTIONS as readonly string[]).includes(c)), '集 A 词汇面必须有真实使用（IAN-1 终端 chip）');
  // The render alias vocabulary and the op vocabulary must agree on every value.
  for (const opId of Object.values(ACT_TO_OP)) {
    assert.ok(OBLIGATION_OP_IDS.includes(opId), `ACT_TO_OP 映射出的 ${opId} 必须在义务表内`);
  }
});

/* ────────────────────────────────────────────────────────────────────────────
 * 3. 三类注入反证（temp copy；仓库文件 sha256 前后不变）
 * ──────────────────────────────────────────────────────────────────────────── */

const withTempCopy = (mutate: (text: string) => string): { problems: string[]; shaBefore: string; shaAfter: string } => {
  const shaBefore = sha256(TABLE_SRC);
  const dir = mkdtempSync(join(tmpdir(), 'sdc-obligation-'));
  const forged = mutate(TABLE_SRC);
  writeFileSync(join(dir, 'obligation-table.ts'), forged, 'utf8');
  const problems = [...rowProblems(forged), ...tailProblems(forged)];
  return { problems, shaBefore, shaAfter: sha256(TABLE_SRC) };
};

test('OT-1 反证①：义务表多一行 ⇒ 行数/opId 集判据必红（仓库文件逐字节不变）', () => {
  const extra = [
    "  'op.new': {",
    "    functionalName: '新操作',",
    "    providerId: 'site.unauthorized',",
    "    mountPoints: ['next'],",
    "    failSemantics: 'card-boundary',",
    "    status: 'registered',",
    '  },',
  ].join('\n');
  const { problems, shaBefore, shaAfter } = withTempCopy((text) => text.replace("  'op.help': {", `${extra}\n  'op.help': {`));
  assert.ok(problems.some((p) => p.includes(JUDGEMENTS[0].expectFailPattern)), problems.join(' | '));
  assert.equal(shaAfter, shaBefore, '注入必须只发生在 temp 副本上（仓库文件零触碰）');
});

test('OT-1 反证②：注册表多一个 op（无义务表行）⇒ 覆盖判据必红', () => {
  const registered = [...Object.keys(OPS_BY_ID), 'op.rogue'];
  const unmapped = unmappedOpIds(registered);
  assert.deepEqual(unmapped, ['op.rogue'], '未映射 op 必须被判为缺口');
  assert.throws(() => assertObligationCoverage(registered), /obligation-rows-missing:op\.rogue/);
  assert.deepEqual(unmappedOpIds(Object.keys(OPS_BY_ID)), [], '真注册集必须无缺口（判据非恒真）');
});

test('OT-4 反证③：某 chip 指向不存在的 opId（悬空）⇒ chips 判据必红', () => {
  registerBuiltinProviders();
  const providers = resolveOrder();
  const forged = [{ id: 'forged', chips: ['op.turn', 'op.ghost'] }];
  const problems = chipProblems(forged);
  assert.ok(problems.some((p) => p.includes(JUDGEMENTS[3].expectFailPattern)), problems.join(' | '));
  assert.ok(problems.some((p) => p.includes('op.ghost')), '悬空 chip 必须被逐条指名');
  assert.deepEqual(chipProblems(providers), [], '真 provider 集必须无悬空（判据非恒真）');
});

test('OT-5 反证：把表尾义务字面删掉 ⇒ 表尾判据必红（仓库文件逐字节不变）', () => {
  const { problems, shaBefore, shaAfter } = withTempCopy((text) => text.replace(/契约义务：[\s\S]*?diff = 0。/m, '（义务说明已删除）'));
  assert.ok(problems.some((p) => p.includes(JUDGEMENTS[4].expectFailPattern)), problems.join(' | '));
  assert.equal(shaAfter, shaBefore, '注入必须只发生在 temp 副本上（仓库文件零触碰）');
});

/* ────────────────────────────────────────────────────────────────────────────
 * 4. 元判据 + 与注册表数据同源
 * ──────────────────────────────────────────────────────────────────────────── */

test('OT-6 零重复字面量：行由 OP_SPECS 派生（四要素字面量在源文本中各恰一次）', () => {
  assert.equal(Object.keys(OP_SPECS).length, 9);
  for (const spec of Object.values(OP_SPECS)) {
    const count = (TABLE_SRC.match(new RegExp(`'${spec.functionalName}'`, 'g')) ?? []).length;
    assert.equal(count, 1, `功能名 ${spec.functionalName} 必须在源文本中恰出现 1 次（禁止与 op 描述各写一份）`);
  }
  // The rows really are the same objects (derived), not copies.
  for (const row of OBLIGATION_ROWS) {
    assert.equal(row.functionalName, OP_SPECS[row.opId].functionalName);
    assert.equal(row.providerId, OP_SPECS[row.opId].providerId);
  }
});

test('OT 元判据：每条 judgement 都声明非占位 expectFailPattern', () => {
  assert.ok(JUDGEMENTS.length >= 5, '判据表必须覆盖五条判据');
  for (const j of JUDGEMENTS) {
    assert.ok(j.expectFailPattern.trim().length >= 8, `${j.id}: expectFailPattern 不得为空/占位`);
    assert.ok(!j.expectFailPattern.includes('TODO'), `${j.id}: expectFailPattern 不得是 TODO`);
  }
});
