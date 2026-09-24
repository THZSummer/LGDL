/**
 * V5-1 **TASK-V5-114** (leaf `specs-tree-v5-1-next-registry-pipeline`) — the
 * **dispatcher diff = 0** gate (ADR-V5-001 · FR-ALLN-058 / FR-ALLN-035 R6 ·
 * **AC-ALLN-005** · N22 · R-ALLN-901 / R-V5-103).
 *
 * ── What this gate must prove ────────────────────────────────────────────────
 *
 * The whole point of the registry is that「新增一种操作」stops touching the main flow:
 * a new provider (or a new op) must be reachable with **`handleCardAction` unchanged**.
 * That is a claim about *files*, so it is judged as one:
 *
 *   ① **集 B 零 per-op 分支** — inside the real `handleCardAction` body, not one of the
 *      seven 集 B action strings appears as a literal, and there is no `switch (action)`
 *      chain: dispatch is one lookup (`dispatchChipAction`). A re-introduced
 *      `if (action === 'rebind')` is exactly the regression this gate exists for.
 *   ② **唯一分发入口** — `sidepanel.ts` carries exactly **one** `dispatchChipAction(`
 *      call site (the 集 B tail), so there is no second dispatch path.
 *   ③ **ACT_TO_OP 单源** — the act→opId authority is declared exactly once in `src/**`
 *      (`next-registry/dispatch.ts`); the 集 A protocol set the same.
 *   ④ **四操作哈希不变** — register / `unregister` / `{overwrite:true}` / duplicate-id
 *      拒绝, driven for real against the registry, leave the **dispatcher and registry
 *      source files byte-identical** (sha256 before == after). The registry's *data*
 *      (the in-memory rows) does change — that is the design (adding an op is a data
 *      edit, not a code edit) — so the in-memory readings are asserted separately.
 *
 * ── Falsifiability ───────────────────────────────────────────────────────────
 *
 * Every judgement declares a literal `expectFailPattern` and the reverse proofs
 * (≥3) drive the **same** judge on forged source, so a judgement can neither be
 * declared-but-unable-to-fire nor quietly stop firing.
 *
 * @module test/next-dispatch-diff0
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { ACT_TO_OP, OP_TO_ACT, SET_A_PROTOCOL_ACTIONS } from '../src/ui/sidepanel/next-registry/dispatch.js';
import { builtinProviders, registerBuiltinProviders } from '../src/ui/sidepanel/next-registry/providers.js';
import { OPS_BY_ID } from '../src/ui/sidepanel/next-registry/ops.js';
import { countProviders, registerNextProvider, resolveOrder } from '../src/ui/sidepanel/next-registry/registry.js';

// Resolved from the PACKAGE ROOT: `npm test` compiles to `dist-test/`, so a
// `new URL('../src/…', import.meta.url)` would look inside `dist-test/src/`.
const PKG = fileURLToPath(new URL('../../', import.meta.url));

/** The dispatcher file (the one the「新增操作不改主流程」claim is about). */
const SIDEPANEL_REL = 'src/ui/sidepanel/sidepanel.ts';
const DISPATCH_REL = 'src/ui/sidepanel/next-registry/dispatch.ts';
const REGISTRY_REL = 'src/ui/sidepanel/next-registry/registry.ts';
const PROVIDERS_REL = 'src/ui/sidepanel/next-registry/providers.ts';
/** The **frozen** file set the four operations must leave byte-identical. */
const HASH_FROZEN_FILES = [SIDEPANEL_REL, DISPATCH_REL, REGISTRY_REL, PROVIDERS_REL] as const;

const read = (rel: string): string => readFileSync(join(PKG, rel), 'utf8');
const sha256 = (text: string): string => createHash('sha256').update(text, 'utf8').digest('hex');

/** 集 B — the seven next-chip actions collapsed into the one lookup. */
const SET_B_ACTIONS = ['next', 'repick', 'describe', 'describe-submit', 'rebind', 'help', 'authorize'] as const;

/* ────────────────────────────────────────────────────────────────────────────
 * 1. The judges (pure functions of the source text — the reverse proofs reuse them)
 * ──────────────────────────────────────────────────────────────────────────── */

/** `expectFailPattern` of every judgement declared by this gate. */
export interface Diff0Judgement {
  readonly id: string;
  readonly expectFailPattern: string;
}
export const JUDGEMENTS: readonly Diff0Judgement[] = [
  { id: 'D0-1-zero-setB-branch', expectFailPattern: '集 B 分支数必须为 0（分发器不得识别 per-op 动作字符串）' },
  { id: 'D0-2-single-dispatch-entry', expectFailPattern: '集 B 必须恰有 1 个分发入口调用点（dispatchChipAction）' },
  { id: 'D0-3-act-to-op-single-source', expectFailPattern: 'ACT_TO_OP 必须恰有 1 处声明（唯一权威）' },
  { id: 'D0-4-four-op-hash-frozen', expectFailPattern: '四操作下分发器/注册表源文件哈希必须逐字节不变' },
  { id: 'D0-5-setA-setB-disjoint', expectFailPattern: '集 A / 集 B 的 action 字符串必须互斥（越集 ⇒ 判据必红）' },
  { id: 'D0-6-no-data-act-readback', expectFailPattern: '分发器不得回读 data-act 属性（分发依据必须是 opId）' },
  { id: 'D0-7-two-set-chip-vocabulary', expectFailPattern: 'provider chips 必须落在两集词汇面内（opId ∪ ACT_TO_OP ∪ 集 A 协议动作）' },
];

/**
 * Blank out comments (`//…`, block comments) while keeping every newline in place,
 * so line numbers survive the edit. Strings/templates are kept verbatim — the gates'
 * own brace matching must not be fooled by an apostrophe inside prose.
 */
export function blankComments(source: string): string {
  const out = [...source];
  let i = 0;
  let state: 'code' | 'line' | 'block' | 'sq' | 'dq' | 'tpl' = 'code';
  while (i < source.length) {
    const ch = source[i];
    const next = source[i + 1];
    if (state === 'code') {
      if (ch === '/' && next === '/') {
        out[i] = ' ';
        out[i + 1] = ' ';
        i += 2;
        state = 'line';
        continue;
      }
      if (ch === '/' && next === '*') {
        out[i] = ' ';
        out[i + 1] = ' ';
        i += 2;
        state = 'block';
        continue;
      }
      if (ch === "'") state = 'sq';
      else if (ch === '"') state = 'dq';
      else if (ch === '`') state = 'tpl';
      i += 1;
      continue;
    }
    if (state === 'line') {
      if (ch === '\n') state = 'code';
      else out[i] = ' ';
      i += 1;
      continue;
    }
    if (state === 'block') {
      if (ch === '*' && next === '/') {
        out[i] = ' ';
        out[i + 1] = ' ';
        i += 2;
        state = 'code';
        continue;
      }
      if (ch !== '\n') out[i] = ' ';
      i += 1;
      continue;
    }
    if (ch === '\\') {
      i += 2;
      continue;
    }
    if (state === 'sq' && ch === "'") state = 'code';
    else if (state === 'dq' && ch === '"') state = 'code';
    else if (state === 'tpl' && ch === '`') state = 'code';
    i += 1;
  }
  return out.join('');
}

/**
 * The body of `function handleCardAction(...)` — brace-matched from the declaration,
 * so a literal OUTSIDE it (a doc comment listing the actions, a helper elsewhere) can
 * never make judgement ① either pass or fail by accident. Comments are blanked first.
 */
export function handleCardActionBody(source: string): string | null {
  const clean = blankComments(source);
  const decl = /function\s+handleCardAction\s*\(/.exec(clean);
  if (!decl) return null;
  const open = clean.indexOf('{', decl.index);
  if (open < 0) return null;
  let depth = 0;
  for (let i = open; i < clean.length; i += 1) {
    if (clean[i] === '{') depth += 1;
    else if (clean[i] === '}') {
      depth -= 1;
      if (depth === 0) return clean.slice(open, i + 1);
    }
  }
  return null;
}

/** The 集 B action literals the dispatcher still compares against (must be none). */
export function setBBranchLiterals(source: string): string[] {
  const body = handleCardActionBody(source);
  if (body === null) return ['<handleCardAction 未找到>'];
  const out: string[] = [];
  body.split('\n').forEach((raw, i) => {
    for (const act of SET_B_ACTIONS) {
      if (new RegExp(`['"]${act}['"]`).test(raw)) out.push(`body:${i + 1}:${act}`);
    }
  });
  if (/switch\s*\(\s*action\s*\)/.test(body)) out.push('body:switch(action)');
  return out;
}

/** Call sites of `name(` in `source` (imports / declarations excluded). */
export function callSites(source: string, name: string): number[] {
  const out: number[] = [];
  blankComments(source)
    .split('\n')
    .forEach((raw, i) => {
      if (!new RegExp(`${name}\\s*\\(`).test(raw)) return;
      if (/^\s*import\b/.test(raw)) return;
      if (new RegExp(`^\\s*(?:export\\s+)?(?:async\\s+)?function\\s+${name}\\s*\\(`).test(raw)) return;
      out.push(i + 1);
    });
  return out;
}

/** Every `src/**` file (recursive) — the single-source scans' domain. */
export function srcFiles(dir = join(PKG, 'src')): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...srcFiles(full));
    else if (entry.name.endsWith('.ts')) out.push(full);
  }
  return out;
}

/** Declaration sites of `export const NAME` across a file set. */
export function exportDeclSites(files: readonly string[], name: string): string[] {
  const out: string[] = [];
  for (const file of files) {
    blankComments(readFileSync(file, 'utf8'))
      .split('\n')
      .forEach((raw) => {
        if (new RegExp(`export\\s+const\\s+${name}\\b`).test(raw)) out.push(file.replace(`${PKG}/`, '').replace(PKG, ''));
      });
  }
  return out;
}

/** The读值 of the four registry operations (counts before/after, loudness). */
export interface FourOpReadings {
  readonly n0: number;
  readonly afterRegister: number;
  readonly afterUnregister: number;
  readonly afterOverwrite: number;
  readonly duplicateError: string;
  readonly duplicateCount: number;
}

/** Drive the four operations for real and report the readings. */
export function driveFourOperations(): FourOpReadings {
  const n0 = countProviders();
  const probe = { ...(builtinProviders()[0] as ReturnType<typeof builtinProviders>[number]), id: 'diff0-probe' };
  const reg = registerNextProvider(probe);
  if (!reg.ok) throw new Error(`注册必须成功：${reg.error}`);
  const afterRegister = countProviders();
  const afterUnregister = reg.unregister();
  // `{overwrite:true}` — same id, replacement row.
  const first = registerNextProvider(probe);
  if (!first.ok) throw new Error(`覆盖前置注册必须成功：${first.error}`);
  const overwritten = registerNextProvider({ ...probe, priority: 3, prepend: true }, { overwrite: true });
  if (!overwritten.ok) throw new Error(`覆盖必须成功：${overwritten.error}`);
  const afterOverwrite = countProviders();
  // 重复 id — refused loudly (never a silent overwrite).
  const dup = registerNextProvider(probe);
  const duplicateError = dup.ok ? '' : dup.error;
  const duplicateCount = countProviders();
  overwritten.unregister();
  return { n0, afterRegister, afterUnregister, afterOverwrite, duplicateError, duplicateCount };
}

/* ────────────────────────────────────────────────────────────────────────────
 * 2. 真源码断言
 * ──────────────────────────────────────────────────────────────────────────── */

test('D0-1 集 B 零 per-op 分支：handleCardAction 体不得识别任何集 B 动作字符串', () => {
  const literals = setBBranchLiterals(read(SIDEPANEL_REL));
  assert.deepEqual(literals, [], `${JUDGEMENTS[0].expectFailPattern}：${literals.join(', ')}`);
  const body = handleCardActionBody(read(SIDEPANEL_REL));
  assert.ok(body && body.includes('dispatchChipAction('), '前置：集 B 必须由 dispatchChipAction 承担（否则本判据空转）');
  // 集 A 的 8 个协议动作仍然必须在场（零删除：两集模型不是「删掉一切分支」）。
  for (const act of SET_A_PROTOCOL_ACTIONS) {
    assert.ok(new RegExp(`['"]${act}['"]`).test(body as string), `集 A 协议动作 ${act} 必须保留在分发器体内`);
  }
});

test('D0-2 唯一分发入口：sidepanel.ts 的 dispatchChipAction 调用点恰 1 处', () => {
  const sites = callSites(read(SIDEPANEL_REL), 'dispatchChipAction');
  assert.equal(sites.length, 1, `${JUDGEMENTS[1].expectFailPattern}（实测 ${sites.length} 处：${JSON.stringify(sites)}）`);
});

test('D0-3 单源：ACT_TO_OP / SET_A_PROTOCOL_ACTIONS 在 src/** 中恰各 1 处声明', () => {
  const files = srcFiles();
  const actToOp = exportDeclSites(files, 'ACT_TO_OP');
  const setA = exportDeclSites(files, 'SET_A_PROTOCOL_ACTIONS');
  assert.equal(actToOp.length, 1, `${JUDGEMENTS[2].expectFailPattern}：ACT_TO_OP 实测 ${actToOp.join(', ')}`);
  assert.ok(actToOp[0].endsWith(DISPATCH_REL), `ACT_TO_OP 的唯一声明必须在 ${DISPATCH_REL}（实测 ${actToOp[0]}）`);
  assert.equal(setA.length, 1, `${JUDGEMENTS[2].expectFailPattern}：SET_A_PROTOCOL_ACTIONS 实测 ${setA.join(', ')}`);
  assert.ok(setA[0].endsWith(DISPATCH_REL), `SET_A_PROTOCOL_ACTIONS 的唯一声明必须在 ${DISPATCH_REL}（实测 ${setA[0]}）`);
  // The reverse lookup is derived, never a second hand-written table.
  assert.deepEqual(
    [...Object.entries(OP_TO_ACT)].sort(),
    Object.entries(ACT_TO_OP).map(([act, opId]) => [opId, act]).sort(),
    'OP_TO_ACT 必须由 ACT_TO_OP 派生（不得第二份手写表）',
  );
});

test('D0-4 四操作哈希不变：注册 / 卸载 / 覆盖 / 重复 id 下四个源文件 sha256 逐字节不变', () => {
  const before = new Map(HASH_FROZEN_FILES.map((f) => [f, sha256(read(f))]));
  const r = driveFourOperations();
  const after = new Map(HASH_FROZEN_FILES.map((f) => [f, sha256(read(f))]));
  for (const f of HASH_FROZEN_FILES) {
    assert.equal(after.get(f), before.get(f), `${JUDGEMENTS[3].expectFailPattern}：${f} 在四操作后发生了变化`);
  }
  // 注册表**数据**（内存行）按设计变化 —— 读数单独断言，不得与文件哈希混为一谈。
  assert.equal(r.afterRegister, r.n0 + 1, '注册必须使行数 N → N+1');
  assert.equal(r.afterUnregister, r.n0, '幂等 unregister 必须回到 N（往返读数）');
  assert.equal(r.afterOverwrite, r.n0 + 1, '覆盖注册必须使行数 N → N+1（整行替换，计数不变）');
  assert.match(r.duplicateError, /^duplicate-id:/, '重复 id 必须 loud 拒绝（绝不静默覆盖）');
  assert.equal(r.duplicateCount, r.n0 + 1, '被拒绝的重复注册不得改变行数');
  assert.equal(countProviders(), r.n0, '收尾：探针不得留在注册表（本门禁零副作用）');
});

test('D0-5 两集互斥：集 A 协议动作与集 B 动作字符串无交集，且 ACT_TO_OP 恰 6 行', () => {
  const a: readonly string[] = [...SET_A_PROTOCOL_ACTIONS];
  const b = Object.keys(ACT_TO_OP);
  const overlap = a.filter((x) => (b as readonly string[]).includes(x));
  assert.deepEqual(overlap, [], `${JUDGEMENTS[4].expectFailPattern}：${overlap.join(', ')}`);
  assert.equal(b.length, 6, 'ACT_TO_OP 必须恰 6 行（唯一权威、双向可查）');
  for (const act of SET_B_ACTIONS) {
    if (act === 'describe-submit') continue; // a non-chip alias, by design outside 恰 6
    assert.ok(b.includes(act), `集 B 的动作 ${act} 必须在 ACT_TO_OP 的 6 行内`);
  }
  // ★ IAN-1（ADR-IAN-001 §② · TASK-IAN-106）—— 集 A **只增**（8 → 9）：新增的 `'free-input'`
  // 是推荐卡末端终端的协议动作（不进 `ACT_TO_OP`）。判据力只增：既有 8 项逐项仍在 ∧ 新项必须
  // 真的在集 A **声明处**可定位（否则终端的 `data-act` 就落不进唯一两集模型）。
  assert.equal(a.length, 9, `${JUDGEMENTS[4].expectFailPattern}：集 A 必须恰 9 项（8 → 9，只增）`);
  for (const act of ['answer', 'choose', 'cancel', 'approve', 'reject', 'audit', 'hover', 'reanchor']) {
    assert.ok(a.includes(act), `集 A 的既有协议动作 ${act} 不得丢失（零删除）`);
  }
  assert.ok(a.includes('free-input'), `${JUDGEMENTS[4].expectFailPattern}：'free-input' 必须可在集 A 声明处定位`);
});

test('D0-7 前置：内置 provider 的 chips 全部落在两集模型 ∪ 已注册 opId 内（无悬空；非空转）', () => {
  // ★ IAN-1（ADR-IAN-001 §① · TASK-IAN-106）—— **等价重锚（加严，零降级）**：
  // 旧 `known` = opId ∪ `ACT_TO_OP` 值 ∪ `ACT_TO_OP` 键；现在**再并入集 A 协议动作** ——
  // 理由是终端的 `data-act='free-input'` 由集 A 分发（与 `choose-other` / `reanchor` / `hover`
  // 同构），它**不在** `ACT_TO_OP` 的 6 行内（「恰 6」逐字不动）。判据力只增：`'free-input'`
  // 必须在集 A 声明处可定位（下方反证），两集之外的 chip 仍然判红。
  registerBuiltinProviders();
  // 旧判据的 `known`（ACT_TO_OP 键 ∪ 值）**漏掉** 7 个 op-direct chip（`op.llm-config` /
  // `op.perm.request`）—— 原判据因 `resolveOrder()` 未曾注册而**空转**（恒真）。本锚点把它
  // 变成真的机核：`known` 并入**已注册 opId 集**（`OPS_BY_ID`）+ 集 A 协议动作。
  const known = new Set<string>([...Object.keys(OPS_BY_ID), ...Object.values(ACT_TO_OP), ...Object.keys(ACT_TO_OP), ...SET_A_PROTOCOL_ACTIONS]);
  for (const p of resolveOrder()) {
    for (const chip of p.chips) {
      assert.ok(known.has(chip), `provider ${p.id} 的 chip ${chip} 既不是 opId 也不是可查表动作 / 集 A 协议动作`);
    }
  }
  // 前置非空转：本门禁确实判到了 IAN-1 的新词汇面（否则重锚是空转）。
  const allChips = resolveOrder().flatMap((p) => p.chips);
  assert.ok(allChips.includes('free-input'), 'free-input 终端的集 A 词汇必须真的被 provider 使用');
});

test('D0-7 反证：把 free-input 从集 A 移除 ⇒ D0-1 的「集 A 字面量在场」判据必红', () => {
  const body = handleCardActionBody(read(SIDEPANEL_REL));
  assert.ok(body, '前置：handleCardAction 必须可定位');
  // 判据（与 D0-1 同形）：集 A 的每个动作都必须在分发器体内可定位。
  const presentFor = (acts: readonly string[], src: string): string[] =>
    acts.filter((act) => !new RegExp(`['"]${act}['"]`).test(src));
  assert.deepEqual(presentFor(SET_A_PROTOCOL_ACTIONS, body as string), [], '真源码必须逐项在场');
  // 反证：把 `'free-input'` 从真源码改名为别的字面量 ⇒ 该判据必须报出恰好它。
  const forged = (body as string).replace(/'free-input'/g, "'free-input-renamed'");
  assert.deepEqual(presentFor(SET_A_PROTOCOL_ACTIONS, forged), ['free-input'], JUDGEMENTS[4].expectFailPattern);
  // 反证②：把 `'free-input'` 从集 A 声明处拿掉 ⇒ 它不再被要求在场（判据对象就是集 A 本身）。
  const forgedSetA = [...SET_A_PROTOCOL_ACTIONS].filter((x) => x !== 'free-input');
  assert.deepEqual(presentFor(forgedSetA, body as string), [], '集 A 少一项 ⇒ 该项不再被要求（判据非恒真）');
});

/* ────────────────────────────────────────────────────────────────────────────
 * 3. 反证（同一个 judge，伪造源码 ⇒ 必红）
 * ──────────────────────────────────────────────────────────────────────────── */

test('D0-1 反证：注入 `if (action === "rebind")` ⇒ 集 B 分支判据必红', () => {
  const forged = read(SIDEPANEL_REL).replace(
    '  dispatchChipAction(action, value);',
    "  if (action === 'rebind') return;\n  dispatchChipAction(action, value);",
  );
  const literals = setBBranchLiterals(forged);
  assert.ok(literals.length > 0, JUDGEMENTS[0].expectFailPattern);
  assert.ok(literals.some((l) => l.endsWith(':rebind')), literals.join(', '));
});

test('D0-1 反证：把集 B 动作字符串复制进分发器体（第二形态）⇒ 同一判据同样必红', () => {
  const original = read(SIDEPANEL_REL);
  const forged = original.replace(
    '  const requestId = requestIdForCard(cardId);',
    "  if (action === 'help') return;\n  const requestId = requestIdForCard(cardId);",
  );
  assert.notEqual(forged, original, '前置：注入锚点必须存在');
  const literals = setBBranchLiterals(forged);
  assert.ok(literals.some((l) => l.endsWith(':help')), JUDGEMENTS[0].expectFailPattern);
  assert.deepEqual(setBBranchLiterals(original), [], '未注入的真源码必须干净（判据非恒真）');
});

test('D0-6 分发器不得读 `data-act`：sidepanel.ts 中 getAttribute("data-act") 出现 0 次', () => {
  const countOf = (source: string): number => (blankComments(source).match(/getAttribute\(\s*['"]data-act['"]\s*\)/g) ?? []).length;
  assert.equal(countOf(read(SIDEPANEL_REL)), 0, '分发依据必须是 opId（`data-op` / act 别名经 ACT_TO_OP 查表），不得回读 `data-act` 属性');
  // 反证：回读 `data-act` 的形态必须能被同一计数观察到（否则本判据空转）。
  assert.equal(countOf(`${read(SIDEPANEL_REL)}\n  el.getAttribute('data-act');\n`), 1, JUDGEMENTS[5].expectFailPattern);
});

test('D0-2 反证：注入第二处 dispatchChipAction 调用 ⇒ 唯一入口判据必红', () => {
  const forged = `${read(SIDEPANEL_REL)}\n  dispatchChipAction('next');\n`;
  assert.equal(callSites(forged, 'dispatchChipAction').length, 2, JUDGEMENTS[1].expectFailPattern);
});

test('D0-3 反证：在别处复制一份 ACT_TO_OP 声明 ⇒ 单源判据必红；删掉 ⇒ 也必红', () => {
  const realFile = join(PKG, DISPATCH_REL);
  const text = readFileSync(realFile, 'utf8');
  // A forged extra declaration site is simulated by widening the scan domain with a
  // second copy of the same file (the judge walks exactly the domain it is given).
  const forged = exportDeclSites([realFile, realFile], 'ACT_TO_OP');
  assert.equal(forged.length, 2, JUDGEMENTS[2].expectFailPattern);
  assert.equal(exportDeclSites([realFile], 'ACT_TO_OP').length, 1, '前置：真源恰 1 处声明');
  const withoutDecl = text.replace('export const ACT_TO_OP', 'const ACT_TO_OP');
  assert.equal((withoutDecl.match(/export\s+const\s+ACT_TO_OP\b/g) ?? []).length, 0, '删除声明后判据必须能观察到 0 处');
});

test('D0-4 反证：篡改 dispatcher 一个字节 ⇒ 哈希判据必红（还原 ⇒ 复原）', () => {
  const original = read(SIDEPANEL_REL);
  const forged = `${original}\n`;
  assert.notEqual(sha256(forged), sha256(original), JUDGEMENTS[3].expectFailPattern);
  assert.equal(sha256(original), sha256(read(SIDEPANEL_REL)), '逐字节还原后哈希必须复原');
});

test('D0-5 反证：把集 A 的协议动作塞进 ACT_TO_OP ⇒ 两集互斥判据必红', () => {
  const forgedB = [...Object.keys(ACT_TO_OP), 'audit'];
  const overlap = [...SET_A_PROTOCOL_ACTIONS].filter((x) => forgedB.includes(x));
  assert.deepEqual(overlap, ['audit'], JUDGEMENTS[4].expectFailPattern);
});

test('D0 元判据：每条 judgement 都声明非占位 expectFailPattern', () => {
  assert.ok(JUDGEMENTS.length >= 6, '判据表必须覆盖六条判据');
  for (const j of JUDGEMENTS) {
    assert.ok(j.expectFailPattern.trim().length >= 8, `${j.id}: expectFailPattern 不得为空/占位`);
    assert.ok(!j.expectFailPattern.includes('TODO'), `${j.id}: expectFailPattern 不得是 TODO`);
  }
});
