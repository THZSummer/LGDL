/**
 * V3-1 TASK-108 / ADR-V3-019 — the **supersession ledger gate** (AC-V3-011 / AC-V3-012 / AC-V3-014).
 *
 * Turns「删除行必须命中台账否则 FAIL」into a machine fact, and keeps the claim
 * honest in the only direction that matters: *the ledger can shrink, the
 * assertions cannot*.
 *
 * What it enforces, per requirement:
 *
 *   1. **line ↔ ledger (per-line, NOT per-hunk)** — for every protected file,
 *      every line DELETED or REWRITTEN by `git diff -U0 <base>` must either
 *      (a) match an `entries[].oldTitle` string, or (b) fall **inside** a
 *      `modifiedRanges` interval recorded for that file (its base line number is
 *      contained in `oldRange`). Otherwise the gate fails and prints the escaped
 *      line with its base line number (this is what stops "delete first, explain
 *      later").
 *
 *      **Closeout round (2026-09-16, validate R1 F1).** The judge used to be
 *      *hunk-overlap*: a hunk passed as soon as it overlapped a registered range,
 *      so a neighbouring registered line carried 3 unregistered deletions
 *      (`size-budget.test.ts` old 272/273, `insight-archive.test.ts` old 771)
 *      through and AC-V3-011 lost its machine force. Per-line containment is
 *      strictly stronger than hunk overlap (every line inside ⇒ hunk overlaps;
 *      the converse does not hold), and the 3 lines are now registered
 *      (`V31-MR-F1`).
 *   2. **protected byte ranges** — designated regions (journey `#15a~#15q`,
 *      binding `#21*`/`#22*`) are pinned by **byte-range sha256**, not by line
 *      numbers, so they survive unrelated insertions above them.
 *   3. **zero-diff set** — files that must not change at all (hardening, the
 *      static DOM contract test, the perf/646-floor guards, `manifest.json`,
 *      `options.html`, `src/content/**`, `src/security/{policy,auto-authorize}.ts`).
 *   4. **`newTitle` must be locatable** — a ledger entry whose replacement text
 *      cannot be found in the target file is a rubber stamp and fails.
 *   5. **count floors** — every caliber used in `counts` / `staticCalibers` is
 *      defined in `countCalibers` and the numbers are kept **per caliber**
 *      (runtime `check(...)` calls, runtime node test registrations, static
 *      `test(` registrations); `counts.*.currentRuntime ≥ gateFloors.*`, and every
 *      v3 gate file keeps at least the number of runtime `check(...)` calls the
 *      ledger recorded. The caliber module (`density-metrics.mjs`) has no
 *      `check()` at all, so it is registered as **literal content pins**
 *      (`v3CaliberPins`) instead of a meaningless `floor: 0`;
 *   6. **pure-addition files** (review I4②) are listed in `pureAdditionFiles` and
 *      excluded from the per-hunk check *explicitly*; the "zero deleted lines"
 *      claim itself is asserted, and `pure-addition` entries must carry
 *      `oldTitle: null` (no fabricated "superseded text");
 *   7. **`--files-override <path>`** — RP-V3-05's seam: the named file is judged
 *      against the ledger floor of the ledger file with the same basename, so
 *      deleting one assertion from a copy FAILS the gate.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));

/**
 * V4-1 (ADR-V4-009 / ADR-V4-011 第 1 条) — **the dual-ledger judgement**.
 *
 * `docs/v3-supersession-ledger.json` is frozen history: its own segment
 * (`base → v3 head`) is judged exactly as before and the file itself must not
 * change. `docs/v4-supersession-ledger.json` is the v4 segment
 * (`v4 base → worktree`). A deletion caused *today* can therefore be registered in
 * the v4 ledger **without** touching the frozen v3 one — the union of the two
 * registrations is what the judge accepts, and both halves stay verbatim sets.
 */
const V4_LEDGER_PATH = resolve(packageRoot(), 'docs/v4-supersession-ledger.json');

/**
 * 〖v4-3 收口轮 N-01〗`leafBases[].summary` —— 叶段的**自描述读数**。
 *
 * validate R1 N-01 的缺陷形态：v4-3 段 `registeredLines` 停在 72（review I-05 追加 55 行后
 * 未回填）、v4-1 段停在 729（实际 761），而门禁当时只判「每组 `count == 清单长度`」与 scope
 * 复算 —— **没有任何断言读这个字段**，于是自描述可以长期滞后而全绿。下面把它变成机核对象。
 */
interface V4LeafSummary {
  /** 有非空 `registeredUncoveredLines` 的**文件数**（需逐字登记的删除面文件数）。 */
  filesWithUnregisteredLeafDeletions: number;
  /** Σ 各组 `registeredUncoveredLines.length`（逐字登记行数之和）。 */
  registeredLines: number;
  /** 可选：两个读数的口径声明（由下面的判据要求非空，防止「读数无口径」）。 */
  caliber?: string;
  note: string;
  /** 订正历史的逐字保留（只追加，不改写历史）。 */
  noteHistory?: string;
}
interface V4LeafBase {
  leaf: string;
  leafBase: string;
  why: string;
  scope: { files: string[]; why: string };
  registeredUncoveredLines?: Array<{ file: string; count: number; reason: string; registeredUncoveredLines: string[] }>;
  summary?: V4LeafSummary;
}
interface V4LedgerShape {
  version: string;
  feature: string;
  base: string;
  countMethod: string;
  takesOverFrom?: { file: string; relation: string; why: string; v3FileSha256: string };
  leafBases?: V4LeafBase[];
  entries?: Array<{ id: string; file: string; oldTitle: string | null; newTitle: string; reason: string; modificationType: string }>;
  modifiedRanges?: Array<{ file: string; reason: string; oldRange?: [number, number]; newRange?: [number, number] }>;
  protectedRanges?: Array<{
    file: string;
    startAnchor: string;
    endAnchor: string;
    startByte: number;
    endByte: number;
    sha256: string;
    status: string;
    /** V4-1（ADR-V4-008 八步 ⑤）：被本 pin 取代的旧 pin sha256（换锚声明）。 */
    supersededFrom?: string;
    /** V4-1：旧 pin 的复核版本（`git show <leafBase>:<file>`）。 */
    leafBase?: string;
    /**
     * V4.5-1（TASK-V45-113 / ADR-V45-004 裁决 A）：**pin 链**。每节自带
     * `sha256` / `supersededFrom` / `supersededOn` / `leafBase` / `note`，
     * `supersededFrom` 指向直接前驱（首节 `null`）——「链式前驱语义」与
     * 「任意历史 pin 仍可逐字节复算」因此同时成立（`supersededFrom` 只指直接前驱，
     * 更早的 pin 由链节承载）。
     */
    supersessionChain?: Array<{
      sha256: string;
      supersededFrom: string | null;
      supersededOn: string;
      leafBase: string;
      note: string;
    }>;
  }>;
  protectedSupersession?: {
    old: { file: string; sha256: string };
    decision: string;
    eightSteps?: string[];
    /** review 修复轮 I1：与 `knownGap` 必须一致的完成度标记。 */
    status?: string;
    knownGap?: string;
    /** review 修复轮 I1：历史现场（R2 阶段）逐字保留字段。 */
    knownGapHistory?: string;
    /** V4.5-1（TASK-V45-113 八步 ⑤）：本轮的 new pin（与 protectedRanges[0] 同源）。 */
    newPin?: { file: string; sha256: string; startByte: number; endByte: number };
    /**
     * V4.5-1：被取代轮的**逐字记录**（八步 ①「先记录 old 再更新顶层字段」）。
     * `history[0]` = v4-1 段原文，其中 `old.sha256` 即 v3 pin。
     */
    history?: Array<{
      round: string;
      recordedOn: string;
      note: string;
      pin: { file: string; sha256: string; startByte: number; endByte: number };
      old: { file: string; sha256: string };
      decision?: string;
      eightSteps?: string[];
      status?: string;
      knownGap?: string;
    }>;
  };
  redlineRemap?: Array<{ redline: string; from: string; to: string; reason: string; status?: string; evidence?: string }>;
  zeroDiffFiles?: string[];
  /** review 修复轮 I2：条目既可以是纯字符串，也可以是带 status 的对象。 */
  pureAdditionFiles?: Array<string | { file: string; reason?: string; status?: string }>;
  toolbarAdmissions?: unknown[];
  unfrozenZeroDiffFiles?: Array<{ file: string; reason: string }>;
  /** V4-1：v3「纯新增」归类可被 v4 段显式重新归类（换段判定，必须写明理由）。 */
  unfrozenPureAdditionFiles?: Array<{ file: string; reason: string }>;
  staticCalibers?: { nodeTestStatic?: { readings?: Record<string, { regex: string; count: number }> } };
  /** 收口轮 N-04：每个 counts 条目可带 `source`（门禁 + 日志 + 正则 + 观测行），使「计数 == 门禁实测」可机核。 */
  counts?: Record<string, V4Count>;
  v4GateFloors?: Record<string, number>;
  /** 收口轮 N-01~N-08：validate R1 观察项的处置登记（disposition + 可定位锚点）。 */
  validateFindings?: ValidateFinding[];
  /** 收口轮 N-02/N-07/N-08：登记型局限（双层防线 / flake 复跑纪律 / sha 非不变量）。 */
  knownLimitations?: Array<{ id: string; topic: string; note: string; status?: string; noteHistory?: string }>;
  /**
   * v4-2 review 修复轮 I-01（plan ADR-V4-028 dec.5 / TASK-605/606 验收）：**声称截断必须登记**。
   * 每条规则声明「哪一档降级、保留哪些事实字段、丢掉什么」，并与 `stream-digest.ts#DIGEST_FIELDS`
   * 逐字段机核（登记与源码脱钩即 FAIL）。
   */
  truncationRules?: TruncationRule[];
}

/** v4-2 review I-01：一条显式登记的截断规则。 */
interface TruncationRule {
  scope: string;
  carrier: string;
  kept: string[];
  degraded: string[];
  reason: string;
  registeredOn: string;
  registeredBy?: string;
  scopeLimit?: string;
}

/** 收口轮 N-04：`counts.<key>.source` —— 数字的来源必须可机核，不得只有散文。 */
interface CountSource {
  gate: string;
  log: string;
  pattern: string;
  observedLine: string;
  observed: number;
  measuredOn: string;
}
interface V4Count {
  currentRuntime: number;
  floor?: number;
  countMethod?: string;
  note?: string;
  source?: CountSource;
}

/** 收口轮 N-01~N-08：validate 观察项的处置登记。 */
interface ValidateFinding {
  id: string;
  severity: string;
  disposition: string;
  title: string;
  evidence: string;
  anchor: { file: string; contains: string };
}

function readV4Ledger(): V4LedgerShape {
  assert.ok(existsSync(V4_LEDGER_PATH), `v4 取代台账必须存在（${V4_LEDGER_PATH}）`);
  return JSON.parse(readFileSync(V4_LEDGER_PATH, 'utf8')) as V4LedgerShape;
}

/** v4's verbatim registrations for one file (the "按行" half of the dual judge). */
function v4RegisteredLines(file: string): string[] {
  const v4 = readV4Ledger();
  return (v4.leafBases ?? [])
    .flatMap((l) => l.registeredUncoveredLines ?? [])
    .filter((r) => r.file === file)
    .flatMap((r) => r.registeredUncoveredLines);
}

/**
 * v4-segment misses for **one registered leaf segment**:
 * `deletionLines(file, leafBase)` minus the v4 `entries[].oldTitle` registrations minus
 * the verbatim `leafBases[].registeredUncoveredLines` registrations.
 *
 * V4-3（TASK-711 R2）: the segment is a **parameter**, not `leafBases[0]`. v4-3 appends
 * its own `leafBase` (0f8a1fb) and the judge must run over **every** registered segment —
 * a line introduced after `187c205` and removed inside v4-3 is invisible to the v4-1
 * segment (N-09's blind spot), so「只判第一段」would leave the new segment unaudited.
 */
function v4LeafMissesFor(leafBase: string, file: string, extraLines: string[] = []): string[] {
  const v4 = readV4Ledger();
  const titles = (v4.entries ?? []).filter((e) => e.file === file).map((e) => e.oldTitle);
  const lines = [...deletionLines(file, leafBase).map((d) => d.text), ...extraLines];
  const uncovered = lines.filter((text) => !titles.some((t) => t !== null && t !== undefined && text.includes(t)));
  const registered = new Set(v4RegisteredLines(file));
  return uncovered.filter((text) => !registered.has(text));
}

/** Back-compat wrapper: the **first** registered leaf segment (v4-1 @ 187c205). */
function v4LeafMisses(file: string, extraLines: string[] = []): string[] {
  const v4 = readV4Ledger();
  const leaf = (v4.leafBases ?? [])[0];
  assert.ok(leaf, 'v4 台账必须登记本叶的 leafBase');
  return v4LeafMissesFor(leaf.leafBase, file, extraLines);
}

/** Every v4 leaf-segment deletion line for `file` (the union the entries must be judged against). */
function v4SegmentDeletions(file: string): string[] {
  const v4 = readV4Ledger();
  return (v4.leafBases ?? []).flatMap((l) => deletionLines(file, l.leafBase).map((d) => d.text));
}

function packageRoot(): string {
  let dir = HERE;
  for (let i = 0; i < 6; i += 1) {
    if (existsSync(resolve(dir, 'package.json')) && existsSync(resolve(dir, 'src', 'ui', 'sidepanel'))) return dir;
    dir = resolve(dir, '..');
  }
  throw new Error(`package root not found from ${HERE}`);
}

const PKG = packageRoot();
const REPO = resolve(PKG, '..', '..');
const LEDGER_PATH = resolve(PKG, 'docs/v3-supersession-ledger.json');

interface ModifiedRange {
  file: string;
  oldRange: [number, number];
  newRange: [number, number];
  deletedLines: number;
  oldId: string;
  reason: string;
}
interface LedgerEntry {
  id: string;
  file: string;
  gate: string;
  oldId: string;
  /**
   * The superseded text. `null` **only** for `modificationType === 'pure-addition'`
   * entries (review I4①: V31-S1/S2 claimed to replace a line that the real `git
   * diff -U0` never deleted — a pure insertion has no "old title", and pretending
   * it does is unverifiable bookkeeping).
   */
  oldTitle: string | null;
  newId: string;
  newTitle: string;
  reason: string;
  replacementExists: boolean;
  modificationType: string;
}
interface ProtectedRange {
  file: string;
  startAnchor: string;
  endAnchor: string;
  startByte: number;
  endByte: number;
  sha256: string;
  lineCount: number;
}
interface StaticReading {
  regex: string;
  count: number;
  /** `true` when the regex also counts regex-method calls (the dotted form). */
  includesRegexMethodCalls?: boolean;
  note?: string;
}
interface Ledger {
  version: string;
  feature: string;
  base: string;
  metric: string;
  /** Human-readable definition of every caliber that appears in `counts`. */
  countCalibers: Record<string, string>;
  counts: Record<string, { baselineRuntime?: number; currentRuntime: number; countMethod: string; floor: number; note: string }>;
  staticCalibers: Record<string, { countMethod: string; baselineStatic: number; currentStatic: number; floor: number; note: string; readings?: Record<string, StaticReading> }>;
  gateFloors: Record<string, number>;
  v3GateFloors: Record<string, number>;
  v3CaliberPins: Record<string, { countMethod: string; note: string; pins: string[] }>;
  /** Files whose diff vs `base` deletes ZERO lines (hunk↔ledger is inapplicable). */
  pureAdditionFiles: string[];
  pureAdditionNote: string;
  protectedRanges: ProtectedRange[];
  modifiedRanges: ModifiedRange[];
  entries: LedgerEntry[];
  zeroDiffFiles: string[];
  /**
   * Closeout round (validate R1 N-09): per-leaf build start commits. The base-relative
   * per-line judge cannot see a line that was **introduced after `base` and removed
   * inside the leaf** (it is neither an addition nor a deletion in `base→worktree`);
   * registering each leaf's start commit lets the gate judge `leafBase→worktree` too.
   */
  leafBases?: LeafBase[];
}

interface LeafBase {
  leaf: string;
  leafBase: string;
  leafBaseLabel?: string;
  leafBaseCommitSubject?: string;
  registeredOn?: string;
  registeredBy?: string;
  why: string;
  scope: { rule: string; files: string[]; why: string };
  registeredUncoveredLines: Array<{
    file: string;
    leafDeletions?: number;
    registeredUncoveredLines: string[];
    count: number;
    reason: string;
  }>;
  summary?: { filesWithUnregisteredLeafDeletions: number; unregisteredLeafDeletionLines: number; note: string };
  reverseProof?: string;
}

const ledger = JSON.parse(readFileSync(LEDGER_PATH, 'utf8')) as Ledger;

/** `--files-override <path>` — RP-V3-05's seam (see the module doc). */
const argv = process.argv.slice(2);
const overrideIdx = argv.indexOf('--files-override');
const FILES_OVERRIDE = overrideIdx >= 0 ? argv[overrideIdx + 1] : null;

const runGit = (args: string[]) => {
  try {
    return execFileSync('git', args, { cwd: REPO, encoding: 'utf8' });
  } catch (err) {
    return (err as { stdout?: string }).stdout ?? '';
  }
};

const diffText = (file: string) => runGit(['diff', '-U0', ledger.base, '--', file]);

/**
 * I-05 (review R1): the files `git diff <rev>` really touches under `test/`.
 *
 * The per-line deletion judge used to take its file set from the ledger alone, which
 * made「未登记文件里的删除行」永久不可见（C41(b)：v3-4 删改了
 * `test/insight-protocol.test.ts` 的 4 行而台账零出现）。Union-ing this measured set
 * into the judge closes that loop without relaxing anything: every line the judge already
 * covered stays covered, and files that were invisible now have to be registered.
 */
function measuredTestFiles(rev: string = ledger.base): string[] {
  return runGit(['diff', '--name-only', rev, '--', 'packages/web-cli-plugin/test'])
    .split('\n')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/** Count runtime `check(...)` calls in a gate file (the ledger's single metric). */
const countChecks = (text: string) => (text.match(/\bcheck\(/g) ?? []).length;

/** `-U0` hunks that delete or rewrite at least one line. */
function parseDeletionHunks(diff: string) {
  const hunks: Array<{ oldStart: number; oldCount: number; deleted: string[] }> = [];
  let cur: { oldStart: number; oldCount: number; deleted: string[] } | null = null;
  for (const line of diff.split('\n')) {
    const m = /^@@ -(\d+)(?:,(\d+))? \+\d+(?:,\d+)? @@/.exec(line);
    if (m) {
      if (cur) hunks.push(cur);
      cur = { oldStart: Number(m[1]), oldCount: Number(m[2] ?? 1), deleted: [] };
      continue;
    }
    if (!cur) continue;
    if (line.startsWith('-') && !line.startsWith('---')) cur.deleted.push(line.slice(1));
  }
  if (cur) hunks.push(cur);
  return hunks.filter((h) => h.deleted.length > 0);
}

function deletionHunks(file: string, rev: string = ledger.base) {
  return parseDeletionHunks(runGit(['diff', '-U0', rev, '--', file]));
}

/**
 * V4-1（ADR-V4-009 双台账）：`base → v4 leafBase` 这一**段的**删除 hunk。
 *
 * v3 台账的「纯新增」归类只对 v3 段成立；v4 段可以显式重新归类（见
 * `unfrozenPureAdditionFiles`），此时判据**换段而不放宽**：v3 段仍必须 0 删除行。
 */
function deletionHunksBetween(file: string, from: string, to: string) {
  return parseDeletionHunks(runGit(['diff', '-U0', from, to, '--', file]));
}

/**
 * Every deleted/rewritten line of `file`, with its **base line number**.
 *
 * Closeout round (F1): the coverage judge is per-line, so it needs line numbers,
 * not hunk extents. `-U0` hunks only contain deletions, so within a hunk the
 * i-th `-` line is `oldStart + i`.
 */
function deletionLines(file: string, rev: string = ledger.base): Array<{ line: number; text: string }> {
  const out: Array<{ line: number; text: string }> = [];
  for (const hunk of deletionHunks(file, rev)) {
    hunk.deleted.forEach((text, i) => out.push({ line: hunk.oldStart + i, text }));
  }
  return out;
}

// ── 1. schema + count discipline ─────────────────────────────────────────────
test('ledger: schema 完整，口径显式分层（运行期 check / 运行期 node 用例 / 静态 test(）', () => {
  assert.equal(ledger.version, 'v3');
  assert.ok(ledger.feature.includes('v3-1'), ledger.feature);
  // N-04 (收口轮): the string must name **every** contributing leaf, not just the first
  // one — the assertion above is kept verbatim (only strengthened, never relaxed).
  for (const leaf of ['v3-1', 'v3-2', 'v3-3']) {
    assert.ok(ledger.feature.includes(leaf), `台账 feature 未登记贡献叶 ${leaf}：${ledger.feature}`);
  }
  assert.ok(
    (ledger as unknown as { featureHistory?: { previous?: string } }).featureHistory?.previous?.includes('v3-2'),
    'feature 的历史值必须原样保留在 featureHistory.previous（只追加，不改写历史）',
  );
  assert.equal(ledger.base, 'c2c0e0d', '台账 base 必须是本轮起点 c2c0e0d');
  // I4③ fix round: the r2-style「countMethod 只有一种合法值」套话被替换为**显式分口径**：
  // 每个 counts / staticCalibers 条目声明的 countMethod 必须能在 countCalibers 里找到定义，
  // 且必须与其数值口径一致 —— 646（node 静态）与 725（node 运行期）不得再混用。
  for (const [gate, count] of Object.entries(ledger.counts)) {
    assert.ok(
      ledger.countCalibers[count.countMethod],
      `${gate}.countMethod="${count.countMethod}" 未在 countCalibers 中定义（禁止口径悬空）`,
    );
  }
  for (const key of ['journey', 'insight', 'binding', 'sidepanelView']) {
    assert.equal(ledger.counts[key].countMethod, 'runtime-check-calls', `${key}.countMethod 只能是 runtime-check-calls`);
  }
  assert.equal(ledger.counts.nodeTestRuntime.countMethod, 'runtime-node-tests');
  assert.equal(ledger.staticCalibers.nodeTestStatic.countMethod, 'static-node-test-registrations');
  assert.notEqual(
    ledger.counts.nodeTestRuntime.currentRuntime,
    ledger.staticCalibers.nodeTestStatic.currentStatic,
    '两种口径的数字必须分列（若相等，说明口径声明与数值不一致）',
  );
  for (const key of ['journey', 'insight', 'binding', 'sidepanelView', 'nodeTestRuntime']) {
    assert.ok(ledger.gateFloors[key] > 0, `gateFloors 缺 ${key}`);
    assert.ok(key in ledger.counts, `counts 缺 ${key}`);
  }
  assert.ok(ledger.staticCalibers.nodeTestStatic.floor > 0, '静态口径下界必须登记');
});

test('ledger: 计数只增不减（currentRuntime ≥ gateFloors）', () => {
  for (const [gate, floor] of Object.entries(ledger.gateFloors)) {
    const count = ledger.counts[gate];
    assert.ok(count, `counts 缺 ${gate}`);
    assert.ok(
      count.currentRuntime >= floor,
      `${gate} 计数下降：currentRuntime=${count.currentRuntime} < floor=${floor}`,
    );
    assert.equal(count.floor, floor, `${gate}.floor 必须与 gateFloors 一致`);
  }
  // 静态口径同样只增不减（与运行期口径**分别**判定，不得互借）。
  const staticCaliber = ledger.staticCalibers.nodeTestStatic;
  assert.ok(
    staticCaliber.currentStatic >= staticCaliber.floor,
    `node 静态 test( 计数下降：${staticCaliber.currentStatic} < ${staticCaliber.floor}`,
  );
  assert.ok(
    staticCaliber.currentStatic >= staticCaliber.baselineStatic,
    `node 静态 test( 计数不得低于基线：${staticCaliber.currentStatic} < ${staticCaliber.baselineStatic}`,
  );

  // ── F3 (closeout round): a registered static count nobody can recompute is not a
  // caliber. Every `staticCalibers[*].readings` entry declares its EXACT regex and
  // count; the gate recompiles the regex over the same file set and requires the
  // numbers to match the ledger, and requires `currentStatic` to equal the reading
  // it claims to use. The regexes used to be described in prose ("含点号前缀 830 /
  // 排除点号前缀 740") and neither number was reproducible (measured: 833 / 741).
  const readings = staticCaliber.readings ?? {};
  const readingKeys = Object.keys(readings);
  assert.ok(readingKeys.length >= 2, `静态口径必须登记 ≥2 种可复算读法（实测 ${readingKeys.length}）`);
  const staticFiles = readdirSync(resolve(REPO, 'packages/web-cli-plugin/test'), { withFileTypes: true })
    .filter((e) => e.isFile() && e.name.endsWith('.test.ts'))
    .map((e) => resolve(REPO, 'packages/web-cli-plugin/test', e.name))
    .sort();
  assert.ok(staticFiles.length > 0, '静态口径的文件集合不得为空（否则复算是空转）');
  const staticText = staticFiles.map((f) => readFileSync(f, 'utf8')).join('\n');
  const mismatches: string[] = [];
  for (const [key, reading] of Object.entries(readings)) {
    assert.ok((reading.regex ?? '').length > 0, `${key} 必须给出确切正则（不得只写自然语言口径）`);
    const actual = (staticText.match(new RegExp(reading.regex, 'gm')) ?? []).length;
    // V4-1 双台账：v4 段**只增不减**，因此 v3 的「精确相等」在本段降级为「≥ 登记值 ∧
    // 精确值由 v4 台账 re-register」。方向性不变（少一条即 FAIL），且 v4 段的**精确**
    // 重新登记由下面的 v4 静态口径断言承担 —— 不是放宽，而是把「冻结的历史值」换成
    // 「当前段的精确值 + 历史下界」两段式判定。
    const v4Static = readV4Ledger().staticCalibers?.nodeTestStatic;
    if (actual < reading.count) {
      mismatches.push(`${key} (/${reading.regex}/gm): 实测 ${actual} < 登记下界 ${reading.count}（断言被删）`);
    } else if (actual !== reading.count) {
      // v3 的精确值在 v4 段降级为**下界**；v4 台账必须为同一读法登记自己的下界，
      // 且实测必须 ≥ 该下界（少一条即 FAIL，静默删断言不可能）。
      const v4Count = v4Static?.readings?.[key]?.count;
      if (typeof v4Count !== 'number') mismatches.push(`${key}: v4 段未登记该读法的下界`);
      else if (actual < v4Count) mismatches.push(`${key} (/${reading.regex}/gm): 实测 ${actual} < v4 登记下界 ${v4Count}（断言被删）`);
    }
  }
  assert.deepEqual(mismatches, [], `静态口径登记值不可复算（F3）：\n${mismatches.join('\n')}`);
  assert.equal(
    staticCaliber.currentStatic,
    readings.excludingDottedPrefix?.count,
    'currentStatic 必须等于它所声明的读法（excludingDottedPrefix）的复算值',
  );
});

// ── 1b. pure-addition files: the hunk↔ledger check does NOT apply (I4②) ─────
test('ledger: 纯新增（0 删除行）文件单独归类——hunk↔台账校验对其不适用，且「0 删除行」本身受断言', () => {
  assert.ok(Array.isArray(ledger.pureAdditionFiles) && ledger.pureAdditionFiles.length > 0, '必须显式登记纯新增文件集合');
  assert.ok((ledger.pureAdditionNote ?? '').length > 0, '纯新增归类必须写明理由（不得只给一个空数组）');
  // V4-1 双台账：v3 的「纯新增」归类只对 **v3 段**成立。v4 段可显式重新归类
  // （`unfrozenPureAdditionFiles[]`，必须写明理由 ≥40 字符），此时判据**换段而不放宽**：
  // `base → v4 leafBase` 仍必须 0 删除行，而 v4 段的删除行由 v4 叶段判据逐条判定。
  const v4ForPure = existsSync(V4_LEDGER_PATH) ? readV4Ledger() : null;
  const reclassified = new Map<string, string>(
    ((v4ForPure as { unfrozenPureAdditionFiles?: Array<{ file: string; reason: string }> } | null)
      ?.unfrozenPureAdditionFiles ?? []).map((u) => [u.file, u.reason]),
  );
  for (const file of ledger.pureAdditionFiles) {
    assert.ok(existsSync(resolve(REPO, file)), `${file} 不存在`);
    const reason = reclassified.get(file);
    if (reason !== undefined) {
      assert.ok(reason.trim().length >= 40, `v4 段重新归类 ${file} 必须写明理由（≥40 字符）`);
      const leafBase = (v4ForPure?.leafBases ?? [])[0]?.leafBase;
      assert.ok(leafBase, 'v4 段重新归类必须能取到 leafBase（否则换段判据不成立）');
      assert.deepEqual(
        deletionHunksBetween(file, ledger.base, leafBase),
        [],
        `${file} 在 v3 段（${ledger.base} → ${leafBase}）必须仍是 0 删除行 —— 换段判据不得被用作放宽`,
      );
      assert.ok(
        (v4ForPure?.entries ?? []).some((e) => e.file === file) ||
          (v4ForPure?.modifiedRanges ?? []).some((r) => r.file === file),
        `${file} v4 段重新归类后必须有台账条目（newTitle 可定位）`,
      );
      continue;
    }
    // The registered fact *is* the assertion: a pure-addition file must really
    // delete nothing. If it ever deletes a line, the classification is wrong and
    // the file must move back into the per-hunk covered set.
    assert.deepEqual(
      deletionHunks(file),
      [],
      `${file} 被登记为纯新增（0 删除行），但实测存在删除行 —— 归类失真，必须逐 hunk 登记`,
    );
    assert.ok(
      ledger.entries.some((e) => e.file === file) || ledger.modifiedRanges.some((r) => r.file === file),
      `${file} 即使纯新增也必须有台账条目（newTitle 可定位）`,
    );
  }
});

// ── 1c. pure-addition entries carry NO fabricated `oldTitle` (I4①) ─────────
test('ledger: modificationType=pure-addition 的条目 oldTitle 必须为 null（不得登记未被删除的「被取代文本」）', () => {
  const mislabelled: string[] = [];
  for (const entry of ledger.entries) {
    const pure = entry.modificationType === 'pure-addition';
    if (pure && entry.oldTitle !== null) mislabelled.push(`${entry.id}: oldTitle 必须为 null`);
    if (!pure && (typeof entry.oldTitle !== 'string' || entry.oldTitle.length === 0)) {
      mislabelled.push(`${entry.id}: 非纯新增条目必须给出可定位的 oldTitle`);
    }
  }
  assert.deepEqual(mislabelled, [], `台账条目字段与 modificationType 不一致：\n${mislabelled.join('\n')}`);
  // The oldTitle of a *superseding* entry must really be gone (a registered
  // supersession whose「被取代文本」is still present is not a supersession).
  const stillPresent: string[] = [];
  for (const entry of ledger.entries) {
    if (entry.modificationType === 'pure-addition') continue;
    if (entry.file.includes('*')) continue;
    const path = resolve(REPO, entry.file);
    if (!existsSync(path)) continue;
    const text = readFileSync(path, 'utf8');
    if (text.includes(entry.oldTitle as string)) stillPresent.push(`${entry.id}: oldTitle 仍存在于 ${entry.file}`);
  }
  assert.deepEqual(stillPresent, [], `以下「被取代文本」仍存在于目标文件（登记失真）：\n${stillPresent.join('\n')}`);
});

test('ledger: 既有门禁文件零删除——**每一条删除行**必须逐行命中台账或 modifiedRanges', () => {
  const files = new Set<string>([
    ...ledger.modifiedRanges.map((r) => r.file),
    ...ledger.entries.map((e) => e.file).filter((f) => !f.includes('*')),
    ...ledger.protectedRanges.map((r) => r.file),
    // I-05 (review R1): the set used to be derived **only** from the ledger itself, so a
    // deletion inside a file the ledger never mentioned was structurally invisible
    // (v3-4 deleted 4 lines in `insight-protocol.test.ts` and the judge could not see
    // them — the coverage claim was stronger than the coverage). Union with what
    // `git diff <base>` **actually touches** under `test/`: an omission from the ledger
    // can no longer double as an excuse for not judging the file.
    ...measuredTestFiles(),
  ]);
  const failures: string[] = [];
  let checkedFiles = 0;
  let checkedLines = 0;
  for (const file of files) {
    if (!existsSync(resolve(REPO, file))) continue;
    // I4②: pure-addition files (0 deleted lines) are excluded from the per-line
    // check **explicitly** (they are asserted by the 1b test instead). Registering
    // them here made the check vacuously true and looked like real coverage.
    if (ledger.pureAdditionFiles.includes(file)) continue;
    // V4-1 双台账：v4 段的 entries / modifiedRanges 同样是**合法登记**（v3 段冻结，
    // v4 段按行）。并集判定，方向性不变（仍逐行、仍按 base 行号）。
    const v4 = existsSync(V4_LEDGER_PATH) ? readV4Ledger() : null;
    const ranges = [
      ...ledger.modifiedRanges.filter((r) => r.file === file),
      ...((v4?.modifiedRanges ?? []).filter((r) => r.file === file && Array.isArray(r.oldRange)) as unknown as typeof ledger.modifiedRanges),
    ];
    const titles = [
      ...ledger.entries.filter((e) => e.file === file).map((e) => e.oldTitle),
      ...((v4?.entries ?? []).filter((e) => e.file === file).map((e) => e.oldTitle) as Array<string | null>),
    ];
    const lines = deletionLines(file);
    if (lines.length > 0) checkedFiles += 1;
    for (const deleted of lines) {
      checkedLines += 1;
      // Per-LINE containment (F1): the line's own base line number must sit inside
      // a registered interval — a *neighbouring* registered line no longer carries
      // it through.
      const coveredByRange = ranges.some(
        (r) => deleted.line >= r.oldRange[0] && deleted.line <= r.oldRange[1],
      );
      const coveredByTitle = titles.some((t) => t !== null && deleted.text.includes(t));
      if (!coveredByRange && !coveredByTitle) {
        failures.push(`${file} old ${deleted.line}: ${deleted.text.trim()}`);
      }
    }
  }
  assert.ok(checkedFiles > 0, '本检查必须真的覆盖到至少一个有删除行的文件（否则是空转）');
  // Anti-vacuity at LINE granularity too: a file set that yields zero deleted lines
  // would make the per-line judge pass without judging anything.
  assert.ok(checkedLines > 0, '本检查必须真的逐行判定至少一条删除行（否则是空转）');
  assert.deepEqual(failures, [], `以下删除行未按行命中台账（逐行判定）：\n${failures.join('\n')}`);
});

// ── 2. protected byte ranges ────────────────────────────────────────────────
/**
 * V4-1 TASK-513 八步 ⑤/⑧ — the protected-range pin judge, factored out so the
 * reverse proof below can drive it on a **perturbed string** without touching the
 * repository (`protectedPinFailures` is the single implementation; the runtime
 * judgement reads the real file and the RP-V4-08 in-gate proof reads a mutation).
 */
const sha256Of = (text: string) => createHash('sha256').update(text, 'utf8').digest('hex');
const byteOffsetOf = (text: string, charIndex: number) => Buffer.byteLength(text.slice(0, charIndex), 'utf8');

function protectedPinFailures(
  range: { startAnchor: string; endAnchor: string; startByte: number; endByte: number; sha256: string },
  text: string,
): string[] {
  const failures: string[] = [];
  const i = text.indexOf(range.startAnchor);
  const j = text.indexOf(range.endAnchor, i);
  if (i < 0 || j < 0) return [`锚点已变化（start=${i} end=${j}）`];
  const end = j + range.endAnchor.length;
  const chunk = text.slice(i, end);
  if (sha256Of(chunk) !== range.sha256) {
    failures.push(`受保护区间字节已变（sha ${sha256Of(chunk)} ≠ 登记 ${range.sha256}）`);
  }
  if (byteOffsetOf(text, i) !== range.startByte) {
    failures.push(`起始字节偏移变化（${byteOffsetOf(text, i)} ≠ ${range.startByte}）`);
  }
  if (byteOffsetOf(text, end) !== range.endByte) {
    failures.push(`结束字节偏移变化（${byteOffsetOf(text, end)} ≠ ${range.endByte}）`);
  }
  return failures;
}

test('ledger: protectedRanges 字节区间 hash 不变（禁行号锚定；v4 显式取代经台账换锚）', () => {
  const v4 = existsSync(V4_LEDGER_PATH) ? readV4Ledger() : null;
  for (const range of ledger.protectedRanges) {
    const path = resolve(REPO, range.file);
    assert.ok(existsSync(path), `${range.file} 不存在`);
    const text = readFileSync(path, 'utf8');
    const i = text.indexOf(range.startAnchor);
    const j = text.indexOf(range.endAnchor, i);
    assert.ok(i >= 0 && j >= 0, `${range.file} 的锚点已变化（start=${i} end=${j}）`);
    const chunk = text.slice(i, j + range.endAnchor.length);
    // V4-1（ADR-V4-008 八步 ⑤）：v3 pin 可被 v4 台账**显式取代**（`status:"active"` +
    // `supersededFrom` == 本 pin 的 sha256）。这不是「放宽」，而是换锚 + 补一条**更强**的
    // 机核：旧 pin 仍必须能从 v4 台账的 `leafBase` 版本逐字节复算出来（历史事实不是纸面
    // 声明），且当前字节必须命中 v4 的新 pin（旧 pin 与当前字节的关系被显式声明为「已被取代」）。
    //
    // V4.5-1（TASK-V45-113 / ADR-V45-004 §「门禁判据的等价升级」）：第二次取代后顶层
    // `supersededFrom` 指向**直接前驱**（v4-1 pin），v3 pin 不再等于它 —— 查找因此升级为
    // **链式**：`supersededFrom === range.sha256` ∨ `supersessionChain` 中任一节命中。
    // 判据只增不减：命中链节时，旧 pin 的复算版本取**该链节自己的 `leafBase`**（而不是顶层
    // `leafBase`），否则第二次取代后 v3 复算会用错版本 ⇒ 把「历史可复算」变成纸面声明。
    const legacyEqual = (r: { supersededFrom?: string }) => r.supersededFrom === range.sha256;
    const chainHit = (r: { supersessionChain?: Array<{ sha256: string }> }) =>
      (r.supersessionChain ?? []).some((l) => l.sha256 === range.sha256);
    const superseder = (v4?.protectedRanges ?? []).find(
      (r) => r.file === range.file && r.status === 'active' && (legacyEqual(r) || chainHit(r)),
    );
    if (!superseder) {
      assert.equal(
        sha256Of(chunk),
        range.sha256,
        `${range.file} 受保护区间字节已变（v3 pin 仍在生效；${range.startAnchor.slice(0, 30)}…${range.endAnchor.slice(-30)}）`,
      );
      assert.equal(
        byteOffsetOf(text, i),
        range.startByte,
        `${range.file} 受保护区间起始字节偏移变化（v3 pin 仍在生效）`,
      );
      continue;
    }
    // (1) 旧 pin 必须可机核：从 leafBase 版本按同一锚点复算。
    // V4.5-1：复算版本取**命中链节的 `leafBase`**（多链节时，顶层 `leafBase` 只描述
    // 「最近一次取代发生在哪里」，对更早的 pin 不再正确）。
    const matchedLink = (superseder.supersessionChain ?? []).find((l) => l.sha256 === range.sha256);
    const leafBase = matchedLink?.leafBase ?? (superseder as { leafBase?: string }).leafBase;
    assert.ok(leafBase, `${range.file} 的 v4 取代条目必须写明 leafBase（旧 pin 的复核版本）`);
    const oldText = runGit(['show', `${leafBase}:${range.file}`]);
    assert.ok(oldText.length > 0, `无法从 ${leafBase} 取出 ${range.file}（旧 pin 复核失败）`);
    const oi = oldText.indexOf(range.startAnchor);
    const oj = oldText.indexOf(range.endAnchor, oi);
    assert.ok(oi >= 0 && oj >= 0, `${range.file} 的锚点在 ${leafBase} 版本中已变化`);
    assert.equal(
      createHash('sha256').update(oldText.slice(oi, oj + range.endAnchor.length), 'utf8').digest('hex'),
      range.sha256,
      `${range.file} 的 v3 旧 pin 无法从 ${leafBase} 复核 —— 「已被取代」的历史事实失真`,
    );
    assert.equal(
      Buffer.byteLength(oldText.slice(0, oi), 'utf8'),
      range.startByte,
      `${range.file} 的 v3 起始字节偏移无法从 ${leafBase} 复核`,
    );
    // (2) 当前字节必须命中 v4 的新 pin（换锚后仍逐字节受保护）。
    assert.deepEqual(
      protectedPinFailures(superseder as never, text),
      [],
      `${range.file} 的 v4 新 pin 未命中当前字节（显式取代后保护段仍必须逐字节锁定）`,
    );
  }
});

test('ledger(V4 段): v4 protectedRanges 新 pin（status:active）必须命中当前字节', () => {
  const v4 = readV4Ledger();
  const ranges = v4.protectedRanges ?? [];
  assert.ok(ranges.length > 0, 'v4 protectedRanges 不得为空');
  let judged = 0;
  for (const range of ranges) {
    assert.equal(range.status, 'active', `${range.file} 必须是 active 的新 pin`);
    const path = resolve(REPO, range.file);
    assert.ok(existsSync(path), `${range.file} 不存在`);
    assert.deepEqual(
      protectedPinFailures(range as never, readFileSync(path, 'utf8')),
      [],
      `${range.file} 的 v4 保护段 pin 未命中当前字节`,
    );
    judged += 1;
  }
  assert.ok(judged > 0, '本判据必须真的判到至少一个保护段');
  console.log(`  ℹ v4 保护段新 pin：${judged} 段逐字节命中（含 journey 的 supersededFrom 换锚）`);
});

/**
 * V4.5-1（TASK-V45-113 / ADR-V45-004 §「门禁判据的等价升级」）—— **`supersessionChain` 判据**。
 *
 * 第二次取代把顶层 `supersededFrom` 改为指向**直接前驱**（v4-1 pin），于是「v3 pin 是否能
 * 找到 superseder」不再由 `supersededFrom` 等值承载，而由**链**承载。本判据逐条机核：
 *
 *   ① 链长 ≥2；② 链连续性 `chain[i].supersededFrom === chain[i-1].sha256`（首节 `null`）；
 *   ③ 链覆盖 v3 pin 与 v4-1 pin；④ 前任同源 `protectedRanges[0].supersededFrom === chain.at(-2).sha256`；
 *   ⑤ 末节 == 当前 pin == `protectedSupersession.newPin.sha256`（同源）；
 *   ⑥ `protectedSupersession.history` 保留 v4-1 段（`old.sha256 === v3 pin`）；
 *   ⑦ **链不是装饰**：v3 pin 用「仅 legacy 等值」找不到（若还能找到 ⇒ 链可被删掉而判据仍绿 = 恒真）；
 *   ⑧ 每个链节的 sha 都能从**该链节自己的 `leafBase`** 逐字节复算（历史事实不是纸面声明）。
 */
test('ledger(V4 段): supersessionChain 链长/连续性/覆盖/同源 + v3 段查找由链承载（非恒真）', () => {
  const v4 = readV4Ledger();
  const range = (v4.protectedRanges ?? [])[0];
  assert.ok(range, 'protectedRanges[0] 必须存在（链判据的对象）');
  const V3_PIN = '6b45c3fa4027f75a97bb84e0f5d80446a8c316ca4cd6dd83b2fe939c0eb6ba63';
  const V41_PIN = 'e2b500df9049f69979892076ad798fabfc4a638a3403902c7e57d7f1e1ac244f';
  const chain = range.supersessionChain ?? [];

  // ① 链长 ≥2
  assert.ok(chain.length >= 2, `supersessionChain 链长必须 ≥2（实测 ${chain.length}）`);

  // ② 链连续性（首节 null）
  assert.equal(chain[0].supersededFrom, null, '链首节的 supersededFrom 必须为 null');
  for (let i = 1; i < chain.length; i += 1) {
    assert.equal(
      chain[i].supersededFrom,
      chain[i - 1].sha256,
      `链节 ${i} 不连续（supersededFrom ≠ 上一节 sha256）—— 链式语义失真`,
    );
    assert.ok(chain[i].supersededOn.length >= 10, `链节 ${i} 必须写明 supersededOn（实测日期）`);
    assert.ok(chain[i].note.trim().length >= 10, `链节 ${i} 必须写明 note（该次取代是什么）`);
  }

  // ③ 链覆盖 v3 pin 与 v4-1 pin
  for (const sha of [V3_PIN, V41_PIN]) {
    assert.ok(
      chain.some((l) => l.sha256 === sha),
      `链必须覆盖历史 pin ${sha.slice(0, 8)}…（否则「v3 段仍可机核」只是纸面声明）`,
    );
  }

  // ④ 前任同源
  assert.equal(
    range.supersededFrom,
    chain[chain.length - 2].sha256,
    'protectedRanges[0].supersededFrom 必须等于链的倒数第二节（直接前驱语义）',
  );

  // ⑤ 末节 == 当前 pin == newPin（同源）
  assert.equal(chain[chain.length - 1].sha256, range.sha256, '链末节必须是当前 pin');
  assert.equal(
    v4.protectedSupersession?.newPin?.sha256,
    range.sha256,
    'protectedSupersession.newPin.sha256 必须与 protectedRanges[0].sha256 同源',
  );

  // ⑥ history 保留 v4-1 段（逐字记录，old.sha256 === v3 pin）
  const history = v4.protectedSupersession?.history ?? [];
  assert.ok(history.length >= 1, 'protectedSupersession.history 必须保留 v4-1 段（八步 ① 的记录）');
  assert.equal(history[0].old?.sha256, V3_PIN, 'history[0] 必须是 v4-1 段（其 old = v3 pin）');
  assert.equal(history[0].pin?.sha256, V41_PIN, 'history[0].pin 必须是被取代的 v4-1 pin');
  assert.ok(Array.isArray(history[0].eightSteps) && history[0].eightSteps.length >= 8, 'history[0] 必须逐字保留上一轮八步证据');

  // ⑦ 反证（非恒真）：v3 pin 已不能由 legacy 等值命中 ⇒ 链是**唯一**的承载。
  const legacyOnly = (v4.protectedRanges ?? []).find(
    (r) => r.file === range.file && r.status === 'active' && r.supersededFrom === V3_PIN,
  );
  assert.equal(
    legacyOnly,
    undefined,
    '第二次取代后 legacy 等值不得再命中 v3 pin（否则链可被删掉而判据仍绿 = 恒真判据）',
  );
  const chainOnly = (v4.protectedRanges ?? []).find(
    (r) =>
      r.file === range.file &&
      r.status === 'active' &&
      (r.supersessionChain ?? []).some((l) => l.sha256 === V3_PIN),
  );
  assert.ok(chainOnly, 'v3 pin 必须由链命中（legacy 等值命不中）—— 链式查找是判据的唯一入口');

  // ⑧ 每个**已取代**链节都能从自己的 `leafBase` 逐字节复算（不依赖顶层 leafBase）。
  // 末节 = 当前 pin：它在仓库里没有「更早的版本」可言，其正确性由「v4 保护段新 pin 必须
  // 命中当前字节」那条判据对**工作区**逐字节判定（不能拿一个不存在的 revision 去伪造复算）。
  const supersededLinks = chain.slice(0, -1);
  let reverified = 0;
  for (const link of supersededLinks) {
    const oldText = runGit(['show', `${link.leafBase}:${range.file}`]);
    if (oldText.length === 0) continue; // 该版本不可达时跳过（不制造假绿）
    const i = oldText.indexOf(range.startAnchor);
    const j = oldText.indexOf(range.endAnchor, i);
    if (i < 0 || j < 0) continue;
    const sha = createHash('sha256').update(oldText.slice(i, j + range.endAnchor.length), 'utf8').digest('hex');
    assert.equal(sha, link.sha256, `链节 ${link.sha256.slice(0, 8)}… 无法从其 leafBase ${link.leafBase} 逐字节复算`);
    reverified += 1;
  }
  assert.ok(reverified >= 1, `链节复算必须真的覆盖到已取代链节（实测 ${reverified}）`);
  assert.equal(chain[chain.length - 1].sha256, range.sha256, '链末节必须等于当前 pin（其验收面 = 工作区逐字节判定）');
  console.log(
    `  ℹ pin 链：${chain.map((l) => l.sha256.slice(0, 8)).join(' → ')} · 已取代链节逐节复算 ${reverified}/${supersededLinks.length} · legacy 等值命不中 v3 pin（链承载非恒真）`,
  );
});

/**
 * V4.5-1（TASK-V45-114 / ADR-V45-005）—— **binding 保段**判据 + 段外逐行登记判据。
 *
 * binding 保护段**没有 superseder**（`decision:"keep"`，`supersededFrom:null`），因此走 v3
 * 段判据的**严格路径**：当前 chunk 的 sha 必须等于 `be9ad0e9…` **且** `startAnchor` 的字节
 * 偏移必须逐字节等于 `107780`。本轮 binding.mjs 有**两处**读退役面的改写（段前 `#4b/#4c`
 * 字节中立避让 / 段后 `AP#4b`），所以：
 *
 *   ① 双绿（sha + 双字节偏移）；② `startByte === 107780` 显式断言；
 *   ③ 两条改写必须**逐行登记**（`modifiedRanges` 的 base 行号命中 ∧ `entries[].newTitle` 可在目标文件定位）；
 *   ④ 三反证：段内改 1 byte ⇒ sha 红；段前多加 1 byte 不补偿 ⇒ `startByte` 红；
 *      登记的删除行**改一字**（或换一条未登记行）⇒ hunk↔台账判据红。
 */
test('ledger(V4 段): binding 保段双绿（sha + startByte 107780）+ 两处段外改写逐行登记 + 3 反证', () => {
  const v4 = readV4Ledger();
  const bindingFile = 'packages/web-cli-plugin/test/ui/binding.mjs';
  const binding = (v4.protectedRanges ?? []).find((r) => r.file === bindingFile);
  assert.ok(binding, 'binding 保护段必须登记在 protectedRanges');
  const abs = resolve(REPO, bindingFile);
  const text = readFileSync(abs, 'utf8');

  // ① 双绿：段本体 sha + 双字节偏移（与 v3 段判据同一个 `protectedPinFailures` 实现）
  assert.deepEqual(
    protectedPinFailures(binding as never, text),
    [],
    'binding 保段双绿失败（段本体字节已变 / 起始或结束字节偏移已漂）',
  );
  assert.equal(binding.sha256, 'be9ad0e983670137d4233349aede1cae0f0b6fdf26a050083761d30d52c6b936', 'binding 段 sha 必须是登记值');
  assert.equal(binding.supersededFrom, null, 'binding 是保段（无 superseder），supersededFrom 必须为 null');

  // ② `startByte === 107780` 显式断言（段前等长补偿的**唯一**验收面）
  const i = text.indexOf(binding.startAnchor);
  assert.ok(i >= 0, 'binding 段 startAnchor 必须存在');
  assert.equal(byteOffsetOf(text, i), 107780, 'binding 段前补偿失败：startAnchor 字节偏移 ≠ 107780');

  // ③ 两条段外改写必须逐行登记（newTitle 可在目标文件定位）
  const bindingEntries = (v4.entries ?? []).filter((e) => e.file === bindingFile && e.id.startsWith('V45W2-E-1'));
  assert.ok(bindingEntries.length >= 2, `binding 的两处改写必须各有 entries 登记（实测 ${bindingEntries.length}）`);
  for (const e of bindingEntries) {
    assert.ok(text.includes(e.newTitle), `${e.id}: newTitle 在 ${bindingFile} 中定位不到 → 橡皮图章`);
    assert.ok(e.reason.trim().length >= 40, `${e.id}: reason 必须 ≥40 字符`);
  }
  const bindingRanges = (v4.modifiedRanges ?? []).filter((r) => r.file === bindingFile && String((r as { oldId?: string }).oldId ?? '').includes('V45W2-MR'));
  assert.ok(bindingRanges.length >= 2, 'binding 的两处改写必须在 modifiedRanges 留有 base 相对行号登记');

  // ④-a 反证：段内改 1 byte ⇒ sha 判据必须红（锚点保持完整）
  const insideToken = "'#22a 树内检索定位到可覆盖命令节点 tabs list（真实 DOM，逐层可操作）'";
  assert.ok(text.includes(insideToken), '段内扰动锚点必须存在（否则反证空转）');
  const insideMutated = text.replace(insideToken, "'#22A 树内检索定位到可覆盖命令节点 tabs list（真实 DOM，逐层可操作）'");
  assert.notEqual(insideMutated, text, '段内扰动必须真的改变字节');
  assert.ok(
    protectedPinFailures(binding as never, insideMutated).length > 0,
    'RP-V45-114(a) 段内改 1 byte 必须判 FAIL',
  );

  // ④-b 反证：段前多加 1 byte 且不补偿 ⇒ `startByte` 判据必须红
  const preMutated = `// +1 byte 段前扰动\n${text}`;
  const preFails = protectedPinFailures(binding as never, preMutated);
  assert.ok(
    preFails.some((f) => f.includes('起始字节偏移变化')),
    `RP-V45-114(b) 段前多加 1 byte 不补偿必须判 startByte FAIL（实测 ${JSON.stringify(preFails)}）`,
  );
  assert.ok(
    !preFails.some((f) => f.includes('受保护区间字节已变')),
    'RP-V45-114(b) 段前扰动不得改变段本体 sha（判据必须只锚保护段本身）',
  );

  // ④-c 反证：登记的删除行**改一字** ⇒ hunk↔台账判据必须红（登记不是橡皮图章）
  const coveredByLedger = (line: string) =>
    (v4.entries ?? [])
      .filter((e) => e.file === bindingFile)
      .some((e) => e.oldTitle !== null && line.includes(e.oldTitle));
  const realDeleted = "    const authNotice = await waitFor(ext, `(() => { const t = document.getElementById('notice').textContent; return /已授权/.test(t) ? t : ''; })()`, 40, 200);";
  assert.equal(coveredByLedger(realDeleted), true, '登记必须真的覆盖真实删除行（否则登记无效）');
  const verbatimPerturbed = realDeleted.replace('getElementById', 'getElementByID');
  assert.equal(
    coveredByLedger(verbatimPerturbed),
    false,
    'RP-V45-114(c) 删除行改一字后必须**不再**被登记覆盖（hunk↔台账判据非恒真）',
  );
  console.log('  ℹ binding 保段：sha be9ad0e9… + startByte 107780 双绿 · 两处段外改写逐行登记 · 3 反证实跑');
});
/**
 * V5-3 收口（TASK-V5-172 / 175 / ADR-V5-012 §4）—— **X5 逐行登记五要素 + 共享面「恰一次」**。
 *
 * 1. X5（`data-narrow` + 授权态载体重锚）在本叶的改写必须在 v4 台账的 `modifiedRanges[]` 里
 *    **逐行登记**：`oldRange` / `newRange` / `oldId` / `decision: 'equivalent-rewrite'` /
 *    `reason ≥40` 五项缺一即 FAIL（登记不是散文）。
 * 2. 体积面（`test/size-baseline.ts` 五要素 + 三叶合计）在 `v4-supersession-ledger.json#v3Vol3Closeout`
 *    的 `newBaselineBytes` 与源码常量**同源**（同一轮只登记一次：`SIDEPANEL_RE_REGISTRATIONS['v5-3-r2']`）。
 */
test('ledger(V4 段 · V5-3 收口): X5 逐行五要素齐备 + 体积「恰一次」登记（三值同源）', () => {
  const v4 = readV4Ledger();
  const x5 = (v4.modifiedRanges ?? []).filter((r) =>
    String((r as { oldId?: string }).oldId ?? '').startsWith('V53-MR-'),
  );
  assert.ok(x5.length >= 1, 'X5（v5-3 载体重锚）必须在 modifiedRanges[] 里逐行登记');
  const problems: string[] = [];
  for (const r of x5) {
    const row = r as { oldId?: string; decision?: string; reason?: string; oldRange?: number[]; newRange?: number[] };
    if (!Array.isArray(row.oldRange) || row.oldRange.length !== 2) problems.push(`${row.oldId}: 缺 oldRange`);
    if (!Array.isArray(row.newRange) || row.newRange.length !== 2) problems.push(`${row.oldId}: 缺 newRange`);
    if (row.decision !== 'equivalent-rewrite') problems.push(`${row.oldId}: decision 必须是 equivalent-rewrite（等价重锚）`);
    if ((row.reason ?? '').trim().length < 40) problems.push(`${row.oldId}: reason 必须 ≥40 字符`);
  }
  assert.deepEqual(problems, [], `X5 逐行五要素不全：\n${problems.join('\n')}`);

  // 体积「恰一次」：v3Vol3Closeout ⑤三值闭合 与源码常量同源（不得两处各改一次）。
  const baseline = readV4Ledger() as unknown as {
    v3Vol3Closeout?: { steps?: { '⑤三值闭合'?: { newBaselineBytes?: number; absoluteCeilingBytes?: number } } };
  };
  const closeout = baseline.v3Vol3Closeout?.steps?.['⑤三值闭合'];
  assert.ok(closeout, 'v3Vol3Closeout.⑤三值闭合 必须存在（体积收口的三值载体）');
  // 源码常量用**文本读取**（本文件不额外引入 size-baseline 模块，避免新增 import 面）。
  const sizeSrc = readFileSync(resolve(REPO, 'packages/web-cli-plugin/test/size-baseline.ts'), 'utf8');
  const literal = /export const SIDEPANEL_BASELINE_BYTES = ([\d_]+);/.exec(sizeSrc)?.[1] ?? '';
  const baselineBytes = Number(literal.replace(/_/g, ''));
  assert.ok(Number.isFinite(baselineBytes) && baselineBytes > 0, 'size-baseline.ts 的基线常量必须可读');
  assert.equal(
    closeout?.newBaselineBytes,
    baselineBytes,
    '⑤三值闭合.newBaselineBytes 必须与 size-baseline 源码常量同源（同一条目不得两叶各改一次）',
  );
  assert.equal(closeout?.absoluteCeilingBytes, 675_840, '绝对上限逐字（不下移；V5.5-2 小修轮升档后 = 675,840）');
  console.log(`  ℹ X5 逐行登记：${x5.length} 条五要素齐备 · 体积三值同源（${closeout?.newBaselineBytes} B）`);
});


/**
 * RP-V4-08 (TASK-513 八步 ⑧) — **the protected-pin judge must be able to go red
 * for the right reason, and only for the right reason.**
 *
 * Two halves, both driven through the SAME `protectedPinFailures` implementation
 * the runtime judgement uses (not a copy): a 1-byte change **inside** the range must
 * FAIL; a 1-byte change **outside** it must not turn red (the pin anchors the range,
 * not the whole file). The real file is restored byte-for-byte and its sha256 is
 * re-checked, so a failed restore cannot go unnoticed.
 */
test('ledger(V4 段)反证 RP-V4-08：保护段内改 1 字节 ⇒ FAIL；段外改 1 字节 ⇒ 不红；还原逐字节复核', () => {
  const v4 = readV4Ledger();
  const range = (v4.protectedRanges ?? [])[0];
  assert.ok(range, 'v4 protectedRanges[0] 必须存在（反证无对象）');
  const path = resolve(REPO, range.file);
  const original = readFileSync(path);
  const shaBefore = createHash('sha256').update(original).digest('hex');
  const text = original.toString('utf8');
  try {
    // (0) 未扰动时必须干净（否则下面的反证没有对照）。
    assert.deepEqual(protectedPinFailures(range as never, text), [], '未扰动时保护段 pin 必须不红');

    // (1) 段内改 1 字节（改保护段**内部**的一个标签字符，锚点本身保持完整）⇒ 必须 FAIL。
    const insideToken = '#15a 消息区为 flex 填充';
    assert.ok(text.includes(insideToken), '段内扰动锚点必须存在（判据真的能改到保护段）');
    const insideMutated = text.replace(insideToken, '#15A 消息区为 flex 填充');
    assert.notEqual(insideMutated, text, '段内扰动必须真的改变文件字节（否则 FAIL 段是空转）');
    const insideFails = protectedPinFailures(range as never, insideMutated);
    assert.ok(insideFails.length > 0, `RP-V4-08 (FAIL 段) 保护段内改 1 字节必须判 FAIL（实测 ${JSON.stringify(insideFails)}）`);
    assert.ok(
      insideFails.some((f) => /受保护区间字节已变/.test(f)),
      `RP-V4-08 FAIL 段诊断必须指出区间字节已变：${insideFails.join(' | ')}`,
    );

    // (2) 段外改 1 字节（文件头注释）⇒ 必须**不红**（判据只锚保护段，不是「凡改皆红」）。
    const headerToken = '/**\n * UI 旅程测试';
    assert.ok(text.includes(headerToken), '段外扰动锚点必须存在');
    const outsideMutated = text.replace(headerToken, headerToken.replace('UI', 'Ui'));
    assert.deepEqual(
      protectedPinFailures(range as never, outsideMutated),
      [],
      'RP-V4-08 (不红段) 保护段外改 1 字节不得把 pin 判据判红（否则判据锚的不是保护段）',
    );

    // (2b) 段外扰动必须**真的改到了文件**（否则「不红」是空转）。
    assert.notEqual(sha256Of(outsideMutated), sha256Of(text), '段外扰动必须真的改变文件字节（否则不红段是空转）');
  } finally {
    // (3) 逐字节还原 + sha 复核（写回原文，绝不留下扰动）。
    writeFileSync(path, original);
    assert.equal(
      createHash('sha256').update(readFileSync(path)).digest('hex'),
      shaBefore,
      'RP-V4-08 还原失败：journey.mjs 未逐字节复原',
    );
  }
  assert.deepEqual(protectedPinFailures(range as never, readFileSync(path, 'utf8')), [], 'RP-V4-08 还原后必须 PASS');
});

// ── 3. zero-diff set ────────────────────────────────────────────────────────
test('ledger: zeroDiffFiles 必须 0 行 diff（零注入 / 零权限 / 零依赖红线）', () => {
  const dirty: string[] = [];
  for (const file of ledger.zeroDiffFiles) {
    const out = runGit(['diff', '--numstat', ledger.base, '--', file]).trim();
    if (out) dirty.push(`${file}: ${out}`);
  }
  // V4-1 双台账：v3 的 zeroDiffFiles 可被 v4 台账 `unfrozenZeroDiffFiles[]` 显式解冻
  // （必须写明理由 ≥40 字符），否则不得改动 —— 解冻是**登记行为**，不是静默放开。
  const unfrozen = new Map<string, string>(
    (existsSync(V4_LEDGER_PATH) ? readV4Ledger().unfrozenZeroDiffFiles ?? [] : []).map((u) => [u.file, u.reason]),
  );
  const stillDirty = dirty.filter((d) => !unfrozen.has(d.split(':')[0].trim()));
  assert.deepEqual(stillDirty, [], `以下文件本轮不得改动（未在 v4 台账解冻）：\n${stillDirty.join('\n')}`);
  for (const [file, reason] of unfrozen) {
    assert.ok(String(reason ?? '').trim().length >= 40, `v4 解冻 ${file} 必须写明理由（≥40 字符）`);
  }
});

// ── 4. newTitle must be locatable (anti rubber-stamp) ───────────────────────
test('ledger: entries[].newTitle 必须能在目标文件定位（防橡皮图章；v4 接管处按链判定）', () => {
  const missing: string[] = [];
  let chained = 0;
  const v4 = existsSync(V4_LEDGER_PATH) ? readV4Ledger() : null;
  for (const entry of ledger.entries) {
    if (entry.file.includes('*')) continue;
    const path = resolve(REPO, entry.file);
    if (!existsSync(path)) {
      missing.push(`${entry.id}: 目标文件不存在 ${entry.file}`);
      continue;
    }
    const text = readFileSync(path, 'utf8');
    if (text.includes(entry.newTitle)) continue;
    // V4-1（ADR-V4-009 双台账）：v3 条目指向的文本可能被 v4 段再次取代。此时判据
    // 不放松，而是**换链**：v4 台账必须为同一文件留下一条「newTitle 可定位」的
    // 接管条目，否则视为橡皮图章（v3 条目悬空且无人接管）。
    const v4Chain = (v4?.entries ?? []).filter((e) => e.file === entry.file);
    const chainedOk = v4Chain.some((e) => existsSync(resolve(REPO, e.file)) && readFileSync(resolve(REPO, e.file), 'utf8').includes(e.newTitle));
    if (chainedOk) {
      chained += 1;
      continue;
    }
    missing.push(`${entry.id}: 在 ${entry.file} 中找不到 newTitle（且 v4 台账无接管条目）`);
  }
  assert.deepEqual(missing, [], `台账条目无法定位新断言：\n${missing.join('\n')}`);
  console.log(`  ℹ v3 entries 定位：${ledger.entries.length} 条中 ${chained} 条已由 v4 接管条目续链（其余逐字命中）`);
});

// ── 5. per-file runtime floors for the NEW v3 gates ─────────────────────────
test('ledger: v3 新增门禁的运行时 check 计数不低于台账下界（--files-override 的判据）', () => {
  const results: string[] = [];
  if (FILES_OVERRIDE) {
    const keys = Object.keys(ledger.v3GateFloors);
    assert.ok(
      keys.some((key) => basename(key) === basename(FILES_OVERRIDE)),
      `--files-override 的文件名必须与台账中的 v3 门禁文件同名（${basename(FILES_OVERRIDE)} 不匹配 ${keys.map((k) => basename(k)).join(', ')}）`,
    );
  }
  for (const [file, floor] of Object.entries(ledger.v3GateFloors)) {
    if (FILES_OVERRIDE) {
      // RP-V3-05: judge the override against the ledger file with the same basename.
      const ledgerBase = basename(file);
      if (basename(FILES_OVERRIDE) !== ledgerBase) continue;
      const text = readFileSync(FILES_OVERRIDE, 'utf8');
      const actual = countChecks(text);
      assert.ok(
        actual >= floor,
        `--files-override ${FILES_OVERRIDE}: 运行时 check 计数 ${actual} < 台账下界 ${floor} —— 删除断言未登记`,
      );
      results.push(`${file}: override ok (${actual} ≥ ${floor})`);
      continue;
    }
    const path = resolve(REPO, file);
    if (!existsSync(path)) {
      assert.fail(`${file} 不存在（台账指向的 v3 门禁文件必须存在）`);
    }
    const actual = countChecks(readFileSync(path, 'utf8'));
    assert.ok(actual >= floor, `${file} 运行时 check 计数 ${actual} < 台账下界 ${floor}`);
    results.push(`${file}: ${actual} ≥ ${floor}`);
  }
  assert.ok(results.length > 0, '至少校验一个 v3 门禁文件');
  console.log(`  ℹ 计数核对：${results.join(' | ')}`);
});

// ── 6. RP-V3-05 driver sanity: the override seam really is hooked ───────────
test('ledger: --files-override 未提供时，本门禁覆盖全部 v3 新增门禁', () => {
  if (FILES_OVERRIDE) return;
  const expected = ['test/ui/l0.mjs', 'test/ui/density.mjs'];
  const keys = Object.keys(ledger.v3GateFloors);
  for (const file of expected) {
    assert.ok(
      keys.some((key) => key.endsWith(file)),
      `v3GateFloors 缺 ${file}（现有 ${keys.join(', ')}）`,
    );
  }
  // 口径单源模块没有 `check(...)`（判据都在门禁侧），因此它的「下界」不是计数而是
  // **字面量 pin** —— 旧的 `density-metrics.mjs: 0` 是永不失败的登记项（I17）。
  assert.equal(
    Object.keys(ledger.v3GateFloors).some((key) => key.endsWith('density-metrics.mjs')),
    false,
    'density-metrics.mjs 不得再以 count floor 0 登记',
  );
  assert.ok(
    Object.keys(ledger.v3CaliberPins).some((key) => key.endsWith('density-metrics.mjs')),
    'density-metrics.mjs 必须登记为字面量 pin 集合',
  );
});

// ── 8. leaf segment: the base-relative judge's blind spot (N-09) ─────────────
/**
 * A line that was **introduced after `base`** and is **deleted inside the leaf** is
 * invisible to `diff base→worktree` (it is neither an addition nor a deletion there).
 * validate R1 measured the blind spot at 28 lines (insight 13 / l0 15 of 42 leaf
 * deletions). `ledger.leafBases` registers each leaf's start commit and the exact set
 * of leaf-segment deletions that the `entries[].oldTitle` judgement does not carry, so
 * the judge below can run **both segments** — and the registration is a *verbatim set
 * equality*, not a range allowance.
 */
const LEAF_SCOPE_RULE = (file: string) =>
  file.startsWith('packages/web-cli-plugin/test/') && (file.endsWith('.mjs') || file.endsWith('.ts'));

/** The file set the leaf judge must cover — recomputed from the ledger, never taken on trust. */
function leafScopeFiles(): string[] {
  const registered = new Set<string>([
    ...ledger.modifiedRanges.map((r) => r.file),
    ...ledger.entries.map((e) => e.file).filter((f) => !f.includes('*')),
    ...ledger.protectedRanges.map((r) => r.file),
  ]);
  return [...registered].filter(LEAF_SCOPE_RULE).sort();
}

/**
 * I-05 (v4-3 review) — **the diff-driven half of the scope rule**.
 *
 * `leafScopeFiles()` alone is **self-referential**: it is computed from the ledger's
 * own `modifiedRanges` / `entries` / `protectedRanges`, so a file that was *never
 * registered anywhere* can never enter the judged set — its leaf-segment deletions
 * are structurally invisible (measured: `test/ui/stream.mjs` was created in v4-2 and
 * had 8 lines deleted by v4-3, yet it entered no judged set and no base-relative
 * entry; `density-thresholds` / `size-ruling-vol3` / `supersession-ledger.test.ts`
 * were in the same hole).
 *
 * The scope of a leaf segment is by definition「the files this segment really deletes
 * from」, so it is now **derived from `git diff <leafBase>` itself** and unioned with
 * the registered set. The union (never a replacement) keeps every previously judged
 * file judged, and the added files make the segment's real deletion surface visible.
 */
function testFilesWithDeletions(leafBase: string): string[] {
  const out = runGit(['diff', '--numstat', leafBase, '--', 'packages/web-cli-plugin/test']);
  const files: string[] = [];
  for (const line of out.split('\n')) {
    const [added, deleted, file] = line.split('\t');
    if (!file || added === undefined || deleted === undefined) continue;
    if (!/^\d+$/.test(deleted) || Number(deleted) <= 0) continue;
    if (LEAF_SCOPE_RULE(file)) files.push(file);
  }
  return files;
}

/** The per-leaf scope (`leafScopeFiles()` ∪ the segment's own deletion surface). */
function leafScopeFilesFor(leafBase: string): string[] {
  return [...new Set([...leafScopeFiles(), ...testFilesWithDeletions(leafBase)])].sort();
}

/**
 * The leaf-segment judge, stage 1: every deletion line of `file` in `leafBase→worktree`
 * that the `entries[].oldTitle` supersession judgement does **not** carry. These are
 * precisely the lines the registration must enumerate.
 *
 * `extraLines` is the injection seam used by the reverse proof below.
 */
function leafUncoveredByEntries(leafBase: string, file: string, extraLines: string[] = []): string[] {
  const titles = ledger.entries.filter((e) => e.file === file).map((e) => e.oldTitle);
  const lines = [...deletionLines(file, leafBase).map((d) => d.text), ...extraLines];
  return lines.filter((text) => !titles.some((t) => t !== null && text.includes(t)));
}

/**
 * The leaf-segment judge, stage 2: stage-1 lines that the **verbatim registration**
 * does not enumerate — i.e. the failures. Empty means the segment is fully accounted
 * for; a single injected line must show up here (that is the N-09 reverse proof).
 */
function leafMisses(leafBase: string, file: string, extraLines: string[] = []): string[] {
  const registered = new Set<string>(
    (leafBaseEntry(leafBase)?.registeredUncoveredLines ?? [])
      .filter((r) => r.file === file)
      .flatMap((r) => r.registeredUncoveredLines),
  );
  return leafUncoveredByEntries(leafBase, file, extraLines).filter((text) => !registered.has(text));
}

function leafBaseEntry(leafBase: string): LeafBase | undefined {
  return (ledger.leafBases ?? []).find((l) => l.leafBase === leafBase);
}

test('ledger(叶段): leafBases 登记 schema + scope 规则复算（不得手工放宽）', () => {
  const bases = ledger.leafBases ?? [];
  assert.ok(bases.length > 0, 'leafBases 必须至少登记一个叶起点（N-09）');
  for (const leaf of bases) {
    assert.ok(leaf.leaf.length > 0, 'leafBases[].leaf 必填');
    assert.ok(leaf.why.trim().length >= 40, `${leaf.leaf} 必须写明该字段存在的理由`);
    assert.equal(
      runGit(['rev-parse', '--verify', `${leaf.leafBase}^{commit}`]).trim().length,
      40,
      `${leaf.leaf}.leafBase=${leaf.leafBase} 不是本仓库的一个 commit`,
    );
    assert.notEqual(leaf.leafBase, ledger.base, `${leaf.leaf}.leafBase 不得等于 base（否则叶段判据与 base 判据重合）`);
    // The scope list must be exactly what the rule computes from the ledger's own file
    // set — a hand-narrowed scope is how a blind spot would be re-introduced.
    const expected = leafScopeFiles();
    assert.deepEqual([...leaf.scope.files].sort(), expected, `${leaf.leaf}.scope.files 与规则复算结果不一致（不得手工放宽）`);
    assert.ok(leaf.scope.why.trim().length >= 40, `${leaf.leaf}.scope 必须写明范围的判据与理由`);
  }
  console.log(
    `  ℹ 叶段登记：${bases
      .map(
        (l) =>
          `${l.leaf} @ ${l.leafBase}（scope ${l.scope.files.length} 文件 / 未登记删除行 ${l.summary?.unregisteredLeafDeletionLines ?? '?'} 条）`,
      )
      .join(' | ')}`,
  );
});

test('ledger(叶段): 未登记删除行必须**逐字集合相等**（多一条/少一条/改一字都 FAIL）', () => {
  const bases = ledger.leafBases ?? [];
  assert.ok(bases.length > 0, 'leafBases 不得为空（否则本测试是空转）');
  const failures: string[] = [];
  let judgedFiles = 0;
  let judgedLines = 0;
  let registeredTotal = 0;
  for (const leaf of bases) {
    for (const file of leaf.scope.files) {
      if (!existsSync(resolve(REPO, file))) continue;
      const actual = leafUncoveredByEntries(leaf.leafBase, file);
      // V4-1 双台账：v3 段（冻结）∪ v4 段（按行）共同构成合法登记集合。
      const registered = [
        ...(leaf.registeredUncoveredLines ?? []).filter((r) => r.file === file).flatMap((r) => r.registeredUncoveredLines),
        ...v4RegisteredLines(file),
      ];
      judgedFiles += 1;
      judgedLines += actual.length;
      registeredTotal += registered.length;
      const missing = actual.filter((t) => !registered.includes(t));
      const v4Phase = readV4Ledger();
      const isV4Change = v4Phase.entries?.some((e) => e.file === file) === true;
      // 「登记失真」只对 v3 段的登记判：v4 段的登记针对的是**另一个** base，其额
      // 外删除行在 v3 段判据里当然「不存在」（这正是双台账的意义），因此 v4 登记
      // 的 phantom 判定由 v4 段自己的判据负责（下面那条独立测试）。
      const phantom = (leaf.registeredUncoveredLines ?? [])
        .filter((r) => r.file === file)
        .flatMap((r) => r.registeredUncoveredLines)
        .filter((t) => !actual.includes(t))
        .concat(isV4Change ? [] : []);
      assert.equal(typeof isV4Change, 'boolean');
      for (const t of missing) failures.push(`${leaf.leaf} ${file}: 叶段删除行未登记 → ${t.trim()}`);
      for (const t of phantom) failures.push(`${leaf.leaf} ${file}: 登记了并非叶段删除行的文本（登记失真）→ ${t.trim()}`);
      // The per-file counts must agree too (a count that drifts from its list is a
      // rubber stamp even when the lists happen to match).
      const entry = (leaf.registeredUncoveredLines ?? []).find((r) => r.file === file);
      if (entry && entry.count !== entry.registeredUncoveredLines.length) {
        failures.push(`${file}: count=${entry.count} ≠ 清单长度 ${entry.registeredUncoveredLines.length}`);
      }
      if (entry && entry.registeredUncoveredLines.length > 0 && entry.reason.trim().length < 40) {
        failures.push(`${file}: 叶段登记必须写明理由（≥40 字符）`);
      }
    }
  }
  // Anti-vacuity: the judge must really run over files and lines.
  assert.ok(judgedFiles > 0, '叶段判据必须真的覆盖到文件（否则是空转）');
  assert.ok(registeredTotal > 0, '叶段登记不得为空（若真无未登记删除行，也应登记一条说明该事实的条目）');
  assert.deepEqual(
    failures,
    [],
    `叶段（leafBase ${bases.map((b) => b.leafBase).join(', ')}）删除行未逐条命中台账：\n${failures.join('\n')}`,
  );
  console.log(
    `  ℹ 叶段判据：受判文件 ${judgedFiles} 个 · 未登记删除行 ${registeredTotal} 条（全部逐字登记）· 叶段删除行总数 ${judgedLines + registeredTotal}`,
  );
});

test('ledger(叶段)反证：注入一条未登记删除行必须判 FAIL（判据不是恒真）', () => {
  const leaf = (ledger.leafBases ?? [])[0];
  assert.ok(leaf, 'leafBases 不得为空（反证无对象）');
  const file = leaf.scope.files.find((f) => existsSync(resolve(REPO, f)));
  assert.ok(file, 'leafBases[].scope.files 必须至少有一个存在的文件');
  // (1) 未注入时必须是干净的（否则下面的反证没有对照）。
  assert.deepEqual(leafMisses(leaf.leafBase, file), [], `${file} 在 ${leaf.leafBase} 叶段应无未登记删除行`);
  // (2) 注入一条**台账里没有**的删除行 ⇒ 必须且只能报出它。
  const injected = '// RP-LEAF-SEGMENT injected: an unregistered deletion (must FAIL)';
  assert.deepEqual(
    leafMisses(leaf.leafBase, file, [injected]),
    [injected],
    '注入一条未登记删除行必须被判为未覆盖（判据若恒真，N-09 的盲区就仍在）',
  );
  // (3) 登记过的行不得被误报（判据不是「凡删除皆报」）。
  const registeredLine = (leaf.registeredUncoveredLines ?? []).find((r) => r.file === file)?.registeredUncoveredLines[0];
  if (registeredLine !== undefined) {
    assert.deepEqual(leafMisses(leaf.leafBase, file, [registeredLine]), [], '已逐字登记的行不得被误报为未登记');
  }
  // (4) 叶段判据不得被 base 判据替代：该文件在 base 相对判据下**看不到**这条注入行
  //     （行文本在 base 时刻不存在），这正是 N-09 的盲区本身。
  const baseLines = deletionLines(file, ledger.base).map((d) => d.text);
  assert.ok(
    !baseLines.includes(injected),
    '注入的哨兵行不得出现在 base 相对判据里（否则反证没有刻画「叶段盲区」）',
  );
  console.log(`  ℹ 叶段反证：注入未登记删除行 → 判 FAIL ✔；已登记行 → 不误报 ✔（${file} @ ${leaf.leafBase}）`);
});

// ── 7. I17: the caliber pins must really be present (not a decorative floor) ─
test('ledger: v3CaliberPins 的字面量必须逐条存在于目标文件（替代 count floor 0）', () => {
  let checked = 0;
  for (const [file, pin] of Object.entries(ledger.v3CaliberPins)) {
    assert.ok(
      ledger.countCalibers[pin.countMethod],
      `${file}.countMethod="${pin.countMethod}" 未在 countCalibers 中定义`,
    );
    assert.ok(pin.pins.length > 0, `${file} 必须至少一条 pin（否则等价于 floor 0）`);
    assert.ok((pin.note ?? '').length > 0, `${file} 必须写明为何用 pin 而非计数`);
    const path = resolve(REPO, file);
    assert.ok(existsSync(path), `${file} 不存在`);
    const text = readFileSync(path, 'utf8');
    for (const literal of pin.pins) {
      assert.ok(text.includes(literal), `${file} 缺少 pin 字面量：${literal}`);
      checked += 1;
    }
  }
  assert.ok(checked > 0, '至少校验一条 pin（否则本测试是空转）');
});

// ── 8b. V4-1 (ADR-V4-009 / ADR-V4-011): the v4 segment's own ledger judgement ──
test('ledger(V4 段): v4 台账 schema 齐备（接管声明 / 保护段 / 红线重映射 / 计数口径唯一）', () => {
  const v4 = readV4Ledger();
  assert.equal(v4.version, 'v4');
  assert.equal(v4.countMethod, 'runtime-check-calls', '计数口径唯一合法值');
  assert.ok(v4.takesOverFrom !== undefined || v4.feature.length > 0, '必须写明接管声明/takesOverFrom');
  assert.ok((v4.protectedSupersession?.eightSteps ?? []).length >= 8, 'journey 保护段必须登记八步流程');
  assert.ok((v4.redlineRemap ?? []).length >= 3, '红线重映射至少三条（≥65% / ≥488px / composer 贴底 / chars 跨视口）');
  // V4-3（TASK-711 R2）：叶段是**逐叶追加**的（v4-1 起，每个开工叶登记自己的 leafBase）。
  // 旧断言「恰好 1 个」在 v4-3 追加本叶段后必然失真。替换不是放宽：新判据要求
  // ①叶段非空 ②v4-1 历史保留 ③leafBase 互不相同，且**下方新增**「逐叶段 schema + scope
  // 复算」与「逐叶段逐字判定 + 逐叶段反证」三条独立判据（旧断言只数个数，新判据逐段判内容）。
  assert.ok((v4.leafBases ?? []).length >= 1, 'v4 台账必须登记叶段（v4-1 起逐叶追加；不得为空）');
  assert.ok(
    (v4.leafBases ?? []).some((l) => l.leaf.includes('v4-1')),
    'v4-1 叶段必须保留（历史不得被删除或改写）',
  );
  assert.equal(
    new Set((v4.leafBases ?? []).map((l) => l.leafBase)).size,
    (v4.leafBases ?? []).length,
    '每个叶段的 leafBase 必须互不相同（重复登记 = 换段判据空转）',
  );
  for (const r of v4.protectedRanges ?? []) {
    assert.equal(r.status, 'active', `保护段 ${r.file} 必须是 active 的新 pin`);
    assert.equal(typeof r.sha256, 'string');
  }
  assert.ok((v4.zeroDiffFiles ?? []).length > 0, '必须显式声明零改动文件（不动面）');
  assert.ok((v4.entries ?? []).length > 0, '取代条目不得为空');
  for (const e of v4.entries ?? []) {
    assert.ok(e.reason.trim().length >= 40, `${e.id} 必须写明理由（≥40 字符）`);
    assert.ok(e.newTitle.length > 0, `${e.id} 的 newTitle 不得为空（可定位性由下面的测试判）`);
  }
});

test('ledger(V4 段): entries 的 newTitle 可在目标文件定位，oldTitle 必须真的在**已登记叶段**被删除', () => {
  const v4 = readV4Ledger();
  const leaves = v4.leafBases ?? [];
  assert.ok(leaves.length > 0, 'v4 台账必须登记 leafBase（否则本判据悬空）');
  const problems: string[] = [];
  for (const e of v4.entries ?? []) {
    const abs = resolve(REPO, e.file);
    if (!existsSync(abs)) {
      problems.push(`${e.id}: 目标文件不存在 ${e.file}`);
      continue;
    }
    const text = readFileSync(abs, 'utf8');
    if (!text.includes(e.newTitle)) problems.push(`${e.id}: newTitle 在 ${e.file} 中定位不到 → 橡皮图章`);
    if (e.oldTitle === null) continue;
    // V4-3：oldTitle 可能在**后一叶段**被删除（v4-2 引入、v4-3 改写）—— 单看 `leafBases[0]`
    // 看不见（N-09 盲区），因此判据取**所有已登记叶段的并集**：多一个叶段 ⇒ 多一批必须为真的删除行。
    const deleted = v4SegmentDeletions(e.file);
    if (!deleted.some((t) => t.includes(e.oldTitle!))) {
      problems.push(`${e.id}: oldTitle 并未在任何已登记叶段被删除（声明失真）→ ${e.oldTitle}`);
    }
  }
  assert.deepEqual(problems, [], `v4 entries 可定位性/真实性未通过：\n${problems.join('\n')}`);
  console.log(
    `  ℹ v4 entries 可定位性：${(v4.entries ?? []).length} 条逐条命中（newTitle 可定位 ∧ oldTitle 真被删除，判据覆盖 ${leaves.length} 个叶段）`,
  );
});

test('ledger(V4 段): 每个叶段的 schema 与 scope 必须逐叶复算（不得手工收窄）', () => {
  const v4 = readV4Ledger();
  const problems: string[] = [];
  let judged = 0;
  for (const leaf of v4.leafBases ?? []) {
    // I-05: per-leaf scope — the registered set ∪ **this segment's own deletion surface**
    // (`git diff <leafBase>`). A single global set is exactly the self-reference that
    // left `test/ui/stream.mjs` (created in v4-2, 8 lines deleted by v4-3) unjudged.
    const expectedScope = leafScopeFilesFor(leaf.leafBase);
    judged += 1;
    if (!leaf.leaf || leaf.leaf.length === 0) problems.push('leafBases[].leaf 必填');
    if ((leaf.why ?? '').trim().length < 40) problems.push(`${leaf.leaf}: why 过短（≥40 字符说明该段存在的理由）`);
    const resolved = runGit(['rev-parse', '--verify', `${leaf.leafBase}^{commit}`]).trim();
    if (resolved.length !== 40) problems.push(`${leaf.leaf}: leafBase=${leaf.leafBase} 不是本仓库的 commit`);
    // v4-1 的 leafBase 就是 v4 段起点（187c205 == base，首叶的换段判据与 base 判据重合是历史事实）；
    // 但**追加**的叶段不得再与 base 重合 —— 否则「新叶段」是空转（判据与 base 判据完全重复）。
    const isFirst = (v4.leafBases ?? [])[0] === leaf;
    if (!isFirst && leaf.leafBase === v4.base) {
      problems.push(`${leaf.leaf}: 追加叶段的 leafBase 不得等于 base（否则换段判据与 base 判据重合 = 空转）`);
    }
    if ((leaf.scope?.why ?? '').trim().length < 40) problems.push(`${leaf.leaf}: scope.why 过短（≥40 字符）`);
    // The rule recomputes the file set from the ledger's own registrations — a hand-narrowed
    // scope is exactly how a blind spot would be re-introduced.
    assert.deepEqual(
      [...(leaf.scope?.files ?? [])].sort(),
      expectedScope,
      `${leaf.leaf}.scope.files 与规则复算结果不一致（不得手工放宽/收窄）`,
    );
    for (const file of leaf.scope?.files ?? []) {
      if (!existsSync(resolve(REPO, file))) problems.push(`${leaf.leaf}: scope 文件不存在 ${file}`);
    }
    for (const group of leaf.registeredUncoveredLines ?? []) {
      if (group.count !== group.registeredUncoveredLines.length) {
        problems.push(`${leaf.leaf} ${group.file}: count=${group.count} ≠ 清单长度 ${group.registeredUncoveredLines.length}`);
      }
      if (group.registeredUncoveredLines.length > 0 && (group.reason ?? '').trim().length < 40) {
        problems.push(`${leaf.leaf} ${group.file}: 逐字登记必须写明理由（≥40 字符）`);
      }
    }
  }
  assert.ok(judged > 0, '本判据必须真的判到至少一个叶段（否则是空转）');
  assert.deepEqual(problems, [], `v4 叶段 schema/scope 未通过：\n${problems.join('\n')}`);
  console.log(`  ℹ v4 叶段 schema：${judged} 个叶段的 scope 逐叶复算一致（逐叶规则集 ${(v4.leafBases ?? [])
    .map((l) => leafScopeFilesFor(l.leafBase).length)
    .join(' / ')} 文件）`);
});

/**
 * 〖v4-3 收口轮 N-01〗`leafBases[].summary` 的读数必须 == 分项之和。
 *
 * 判据（两个字段、逐字复算；口径写进 `summary.caliber` 并由本条要求非空）：
 *   · `registeredLines` = Σ 各组 `registeredUncoveredLines.length`；
 *   · `filesWithUnregisteredLeafDeletions` = 有非空登记的文件数（= v3 台账既有口径「需逐字
 *     登记的删除面文件数」，v3-3 段 = 8）。
 *
 * 为什么必须有：review 修复轮 I-05 把 v4-3 段的登记从 72 条扩到 127 条、v4-1 段实际 761 条，
 * 而 summary 仍写 72 / 729 —— **门禁全绿**（既有判据只判每组 `count` 与 scope 复算，没有一条
 * 断言读这个字段）。在「留痕即事实」的台账里，自描述滞后就是失真，故把它变成可红：反证见下一条。
 */
function leafSummaryProblems(leaf: V4LeafBase): string[] {
  const problems: string[] = [];
  const groups = leaf.registeredUncoveredLines ?? [];
  const expectedFiles = groups.filter((g) => g.registeredUncoveredLines.length > 0).length;
  const expectedLines = groups.reduce((n, g) => n + g.registeredUncoveredLines.length, 0);
  const summary = leaf.summary;
  if (!summary) {
    problems.push(`${leaf.leaf}: summary 缺失（自描述读数不得省略 —— 省略即漂移无从机核）`);
    return problems;
  }
  if (summary.filesWithUnregisteredLeafDeletions !== expectedFiles) {
    problems.push(
      `${leaf.leaf}: summary.filesWithUnregisteredLeafDeletions=${summary.filesWithUnregisteredLeafDeletions}` +
        ` ≠ 有非空登记的文件数 ${expectedFiles}（自描述滞后）`,
    );
  }
  if (summary.registeredLines !== expectedLines) {
    problems.push(`${leaf.leaf}: summary.registeredLines=${summary.registeredLines} ≠ 分项之和 ${expectedLines}（自描述滞后）`);
  }
  if ((summary.caliber ?? '').trim().length < 20) {
    problems.push(`${leaf.leaf}: summary.caliber 过短（≥20 字符：读数必须声明口径，否则数字不可复算）`);
  }
  if ((summary.note ?? '').trim().length < 40) problems.push(`${leaf.leaf}: summary.note 过短（≥40 字符）`);
  return problems;
}

test('ledger(V4 段): leafBases[].summary 的读数必须 == 分项之和（自描述不得滞后，N-01）', () => {
  const v4 = readV4Ledger();
  const leaves = v4.leafBases ?? [];
  assert.ok(leaves.length > 0, 'v4 台账必须登记 leafBase（否则本判据悬空）');
  const problems: string[] = [];
  let judgedFiles = 0;
  let judgedLines = 0;
  for (const leaf of leaves) {
    problems.push(...leafSummaryProblems(leaf));
    for (const g of leaf.registeredUncoveredLines ?? []) {
      if (g.registeredUncoveredLines.length > 0) judgedFiles += 1;
      judgedLines += g.registeredUncoveredLines.length;
    }
  }
  assert.deepEqual(problems, [], `leafBases[].summary 与分项不符（N-01：自描述滞后必须 FAIL）：\n${problems.join('\n')}`);
  // Anti-vacuity: 判据必须真的复算到非空登记，否则它是「对空集合恒真」。
  assert.ok(judgedFiles > 0 && judgedLines > 0, '本判据必须真的复算到非空登记（否则是空转）');
  console.log(
    `  ℹ 叶段自描述机核（N-01）：${leaves.length} 个叶段 · 逐字登记文件 ${judgedFiles} 个 / ${judgedLines} 行 == summary 逐项复算`,
  );
});

test('ledger(V4 段)反证: summary 读数滞后必须判 FAIL（N-01 判据不是恒真）', () => {
  const leaf: V4LeafBase = {
    leaf: 'synthetic',
    leafBase: '0f8a1fb',
    why: 'x'.repeat(50),
    scope: { files: [], why: 'y'.repeat(50) },
    registeredUncoveredLines: [
      { file: 'a.test.ts', count: 2, reason: 'z'.repeat(50), registeredUncoveredLines: ['line-1', 'line-2'] },
    ],
    summary: {
      filesWithUnregisteredLeafDeletions: 1,
      registeredLines: 2,
      caliber: 'registeredLines = Σ 分项；files = 非空登记文件数（合成用例）',
      note: 'n'.repeat(50),
    },
  };
  assert.deepEqual(leafSummaryProblems(leaf), [], '自洽 summary 不得误报');
  assert.ok(
    leafSummaryProblems({ ...leaf, summary: { ...leaf.summary!, registeredLines: 72 } }).some((p) => /registeredLines=72/.test(p)),
    'v4-3 段的真实形态（72 vs 127）必须判红',
  );
  assert.ok(
    leafSummaryProblems({ ...leaf, summary: { ...leaf.summary!, filesWithUnregisteredLeafDeletions: 10 } }).some((p) =>
      /filesWithUnregisteredLeafDeletions=10/.test(p),
    ),
    'v4-3 段的真实形态（10 vs 14）必须判红',
  );
  assert.ok(
    leafSummaryProblems({ ...leaf, summary: { ...leaf.summary!, filesWithUnregisteredLeafDeletions: 0 } }).some((p) =>
      /filesWithUnregisteredLeafDeletions=0/.test(p),
    ),
    'v4-1 段的真实形态（0 vs 19：旧读法 ≠ 现口径）必须判红',
  );
  assert.ok(
    leafSummaryProblems({ ...leaf, summary: undefined }).some((p) => /summary 缺失/.test(p)),
    'summary 缺失必须判红（不得用「没写」兜成「无漂移」）',
  );
  assert.ok(
    leafSummaryProblems({ ...leaf, summary: { ...leaf.summary!, caliber: '', note: 'short' } }).length >= 2,
    '口径缺失 + note 过短必须判红（读数不可复算 = 口径悬空）',
  );
  console.log('  ℹ N-01 反证：72 / 10 / 0（滞后与旧读法）→ FAIL ✔ / 缺失 → FAIL ✔ / 自洽 → 不误报 ✔');
});

test('ledger(V4 段): 每个叶段的删除行必须逐字集合相等（多一条/少一条/改一字都 FAIL）', () => {
  const v4 = readV4Ledger();
  const leaves = v4.leafBases ?? [];
  assert.ok(leaves.length > 0, 'v4 台账必须登记 leafBase');
  const failures: string[] = [];
  let judged = 0;
  for (const leaf of leaves) {
    for (const file of leaf.scope.files) {
      if (!existsSync(resolve(REPO, file))) continue;
      judged += 1;
      for (const t of v4LeafMissesFor(leaf.leafBase, file)) {
        failures.push(`${leaf.leaf}(${leaf.leafBase}) ${file}: v4 段删除行未登记 → ${t.trim()}`);
      }
    }
  }
  assert.ok(judged > 0, 'v4 段判据必须真的覆盖到文件');
  assert.deepEqual(
    failures,
    [],
    `v4 段（leafBase ${leaves.map((l) => l.leafBase).join(', ')}）删除行未逐条命中 v4 台账：\n${failures.join('\n')}`,
  );
  console.log(`  ℹ v4 叶段判据：${leaves.length} 个叶段 · 受判文件 ${judged} 个 · 全部逐字登记`);
});

test('ledger(V4 段)反证: 每个叶段注入一条未登记删除行必须判 FAIL（v4 判据不是恒真）', () => {
  const v4 = readV4Ledger();
  const leaves = v4.leafBases ?? [];
  assert.ok(leaves.length > 0, 'v4 台账必须登记 leafBase（反证无对象）');
  let proven = 0;
  for (const leaf of leaves) {
    const file = leaf.scope.files.find((f) => existsSync(resolve(REPO, f)));
    assert.ok(file, `${leaf.leaf}: scope.files 必须至少有一个存在的文件`);
    // (1) 未注入时必须干净（否则下面的反证没有对照）。
    assert.deepEqual(v4LeafMissesFor(leaf.leafBase, file), [], `${leaf.leaf} @ ${leaf.leafBase}: ${file} 应无未登记删除行`);
    // (2) 注入一条台账里没有的删除行 ⇒ 必须且只能报出它（**每个**叶段各自反证）。
    const injected = `// RP-V4-08 injected: an unregistered v4 deletion (must FAIL) @ ${leaf.leafBase}`;
    assert.deepEqual(
      v4LeafMissesFor(leaf.leafBase, file, [injected]),
      [injected],
      `${leaf.leaf} @ ${leaf.leafBase}: 注入的未登记删除行必须被判 FAIL（judge 若恒真，该叶段的盲区仍在）`,
    );
    // (3) 该注入行不得出现在 base 相对判据里（否则它没有刻画「叶段盲区」）。
    const baseLines = deletionLines(file, v4.base).map((d) => d.text);
    assert.ok(!baseLines.includes(injected), `${leaf.leaf}: 注入行不得出现在 base 相对判据里`);
    proven += 1;
  }
  assert.ok(proven > 0, '本反证必须真的驱动至少一个叶段');
  console.log(`  ℹ v4 叶段反证：${proven} 个叶段各自「注入未登记删除行 → FAIL ✔ / 未注入 → 干净 ✔」`);
});

// ── 8c. review 修复轮 I1/I2：台账字段的 status ↔ 内容一致性 ─────────────────
/**
 * review 修复轮 **I1**：`protectedSupersession` 曾同时带着 `status:"complete-steps-1-8"`
 * 与一条写「TASK-513 … **未完成** … 不得视为已取代」的 `knownGap` —— 同一对象自相矛盾，
 * 且没有任何门禁校验。下面的纯函数是唯一实现：真实台账与合成矛盾都用它判，因此
 * 「矛盾即 FAIL」是可驱动的，而不是纸面声明。
 */
function protectedSupersessionConflicts(ps: { status?: string; knownGap?: string } | undefined): string[] {
  const problems: string[] = [];
  if (!ps) return ['protectedSupersession 缺失'];
  const status = ps.status;
  if (typeof status !== 'string' || status.length === 0) problems.push('status 缺失');
  else if (!['complete-steps-1-8', 'incomplete'].includes(status)) problems.push(`status 非法值 ${status}`);
  if (status === 'complete-steps-1-8') {
    const gap = ps.knownGap ?? '';
    if (gap.trim().length === 0) problems.push('status=complete 时 knownGap 不得为空（必须显式声明闭环）');
    if (/未完成/.test(gap)) problems.push('status=complete-steps-1-8 与 knownGap 的「未完成」表述自相矛盾');
    else if (!/闭环|残余：无/.test(gap)) problems.push('status=complete 时 knownGap 必须写明闭环（含「闭环」或「残余：无」）');
  } else if (status === 'incomplete') {
    if ((ps.knownGap ?? '').trim().length < 10) problems.push('status=incomplete 时必须写明缺口');
  }
  return problems;
}

test('ledger(V4 段): protectedSupersession.status ↔ knownGap 必须一致（矛盾即 FAIL，I1）', () => {
  const v4 = readV4Ledger();
  const ps = v4.protectedSupersession;
  assert.deepEqual(
    protectedSupersessionConflicts(ps),
    [],
    `protectedSupersession 状态与缺口描述矛盾：${JSON.stringify(ps)}`,
  );
  // 历史现场不得被静默删除：R2 阶段的「未完成」原文必须逐字保留在独立字段里。
  assert.ok(
    typeof ps?.knownGapHistory === 'string' && ps.knownGapHistory.includes('未完成'),
    'R2 阶段的历史现场（knownGap 原文）必须逐字保留在 knownGapHistory，不得静默删除',
  );
});

test('ledger(V4 段)反证: protectedSupersession 一致性判据必须能红（I1 判据不是恒真）', () => {
  assert.ok(
    protectedSupersessionConflicts({ status: 'complete-steps-1-8', knownGap: 'TASK-513 在本轮 build 内**未完成**，不得视为已取代。' }).length > 0,
    'status=complete ∧ knownGap 含「未完成」必须 FAIL',
  );
  assert.ok(
    protectedSupersessionConflicts({ status: 'incomplete', knownGap: '' }).length > 0,
    'status=incomplete ∧ 空 knownGap 必须 FAIL',
  );
  assert.ok(
    protectedSupersessionConflicts({ status: 'half-done', knownGap: '闭环' }).length > 0,
    '非法 status 必须 FAIL',
  );
  assert.deepEqual(
    protectedSupersessionConflicts({ status: 'complete-steps-1-8', knownGap: 'R3 已闭环（残余：无）。' }),
    [],
    '合法组合不得误报',
  );
});

/**
 * review 修复轮 **I2**：`pureAdditionFiles` 的 `design-contract.test.ts` 在 R3 完成后
 * 仍带 `status:"pending"`。判据：status 必须在枚举内，且本叶收口后不得再有 pending。
 */
const PURE_ADDITION_STATUSES = ['complete', 'pending'];
function pureAdditionProblems(entries: Array<string | { file: string; reason?: string; status?: string }>): string[] {
  const problems: string[] = [];
  for (const entry of entries) {
    const file = typeof entry === 'string' ? entry : entry.file;
    const status = typeof entry === 'string' ? 'complete' : entry.status ?? 'complete';
    if (!file || file.length === 0) {
      problems.push('条目缺少 file');
      continue;
    }
    if (!PURE_ADDITION_STATUSES.includes(status)) problems.push(`${file}: 非法 status「${status}」（枚举 ${PURE_ADDITION_STATUSES.join(' | ')}）`);
    if (typeof entry !== 'string' && (entry.reason ?? '').trim().length < 20) {
      problems.push(`${file}: 必须写明理由（≥20 字符）`);
    }
    if (file.startsWith('packages/') && !existsSync(resolve(REPO, file))) problems.push(`${file}: 登记的文件不存在`);
  }
  return problems;
}

test('ledger(V4 段): pureAdditionFiles 的 status 枚举合法，且 R3 收口后无 pending（I2）', () => {
  const v4 = readV4Ledger();
  const files = v4.pureAdditionFiles ?? [];
  assert.ok(files.length > 0, 'pureAdditionFiles 不得为空');
  assert.deepEqual(pureAdditionProblems(files), [], 'pureAdditionFiles 的 status/reason 必须合法');
  const pending = files
    .map((e) => ({ file: typeof e === 'string' ? e : e.file, status: typeof e === 'string' ? 'complete' : e.status ?? 'complete' }))
    .filter((e) => e.status === 'pending')
    .map((e) => e.file);
  assert.deepEqual(
    pending,
    [],
    `R3 终收轮已闭环全部任务，纯新增文件不得再留 pending：${pending.join(', ')}`,
  );
  // design-contract.test.ts 必须真的落地（status=complete 的前提）。
  assert.ok(
    existsSync(resolve(REPO, 'packages/web-cli-plugin/test/design-contract.test.ts')),
    'design-contract.test.ts 必须存在（status=complete 的事实前提）',
  );
});

test('ledger(V4 段)反证: pureAdditionFiles 的 status 枚举判据必须能红（I2 判据不是恒真）', () => {
  assert.ok(
    pureAdditionProblems([{ file: 'packages/web-cli-plugin/test/design-contract.test.ts', reason: 'y'.repeat(30), status: 'half-done' }]).length > 0,
    '非法 status 必须被判出',
  );
  assert.ok(
    pureAdditionProblems([{ file: 'packages/web-cli-plugin/test/design-contract.test.ts', reason: '短', status: 'complete' }]).length > 0,
    '过短理由必须被判出',
  );
});

// ── 9. N-04（收口轮）：counts 必须与门禁日志同源（抽样机核） ────────────────────
/**
 * 〖N-04（收口轮，v4-1 validate R1）〗
 *
 * `counts.<key>.currentRuntime` 此前是**纯散文登记**：validate 复跑实测 `l0 = 210`，台账却
 * 一直写 `203`（R3 现场值），**没有任何门禁会因此变红**（floor 164 太低兜不住这类漂移）。
 * 处置：① 按实测订正（l0 203 → 210、density 169 → 171、nodeTestRuntime / supersession 重登）；
 * ② 抽样条目带 `source`（门禁 + 日志路径 + 正则 + **观测行**），由本判据机核「台账 == 日志实测」。
 *
 * 判据分两层（缺一不可）：
 *   · **恒在层**（任何机器都跑）：`source.pattern` 必须在 `source.observedLine` 上命中，且解析值
 *     == `source.observed` == `counts.<key>.currentRuntime`，并 ≥ `floor` —— 登记内部不得自相矛盾；
 *   · **同源层**（门禁日志在该路径存在时强制）：`pattern` 在**真实日志**上命中的值必须 == 台账值；
 *     日志不存在（如另一台机器 / 日志已清理）⇒ 显式 `skip`，不静默通过也不误报。
 */
const SAMPLED_COUNT_KEYS = ['l0', 'density', 'nodeTestRuntime', 'supersession'] as const;

function countSourceProblems(
  counts: Record<string, V4Count>,
  readLog: (path: string) => string | null,
): { problems: string[]; checked: string[]; skipped: string[] } {
  const problems: string[] = [];
  const checked: string[] = [];
  const skipped: string[] = [];
  for (const [key, count] of Object.entries(counts)) {
    const src = count.source;
    if (!src) {
      // 只有被抽样的四个口径强制带 source（其余口径的登记边界见 note）。
      if ((SAMPLED_COUNT_KEYS as readonly string[]).includes(key)) {
        problems.push(`${key}: 抽样口径必须带可核 source（数字不得只有散文）`);
      }
      continue;
    }
    if (src.pattern.trim().length === 0) problems.push(`${key}: source.pattern 不得为空`);
    let parsed: number | null = null;
    try {
      const m = src.observedLine.match(new RegExp(src.pattern));
      if (!m) problems.push(`${key}: source.pattern 在登记的 observedLine 上不命中（口径悬空）`);
      else parsed = Number(m[1]);
    } catch (err) {
      problems.push(`${key}: source.pattern 非法正则（${String(err)}）`);
    }
    if (parsed !== null) {
      if (parsed !== src.observed) problems.push(`${key}: observedLine 解析 ${parsed} ≠ source.observed ${src.observed}`);
      if (Number.isNaN(parsed)) problems.push(`${key}: observedLine 解析值不是数字（${src.observedLine}）`);
    }
    if (src.observed !== count.currentRuntime) {
      problems.push(`${key}: source.observed ${src.observed} ≠ currentRuntime ${count.currentRuntime}（抽样与计数脱钩）`);
    }
    if (typeof count.floor === 'number' && count.currentRuntime < count.floor) {
      problems.push(`${key}: currentRuntime ${count.currentRuntime} < floor ${count.floor}（计数下降）`);
    }
    if (src.gate.trim().length === 0) problems.push(`${key}: source.gate 不得为空（必须说明是哪条门禁）`);
    const logText = readLog(src.log);
    if (logText === null) {
      skipped.push(key);
      continue;
    }
    const lm = logText.match(new RegExp(src.pattern, 'm'));
    if (!lm) problems.push(`${key}: 门禁日志 ${src.log} 中找不到 source.pattern（日志与口径不对应）`);
    else if (Number(lm[1]) !== count.currentRuntime) {
      problems.push(`${key}: 日志实测 ${lm[1]} ≠ 台账 ${count.currentRuntime}（${src.log}）`);
    } else checked.push(key);
  }
  return { problems, checked, skipped };
}

test('ledger(V4 段): counts 抽样口径必须与门禁日志同源（N-04，非空转）', () => {
  const v4 = readV4Ledger();
  const counts = v4.counts ?? {};
  for (const key of SAMPLED_COUNT_KEYS) {
    assert.ok(counts[key], `counts 缺抽样口径 ${key}`);
    assert.ok(counts[key]!.source, `${key} 必须带 source（门禁 + 日志 + 正则 + 观测行）`);
  }
  const readLog = (path: string): string | null => {
    try {
      return existsSync(path) ? readFileSync(path, 'utf8') : null;
    } catch {
      return null;
    }
  };
  const { problems, checked, skipped } = countSourceProblems(counts, readLog);
  assert.deepEqual(problems, [], `counts 与门禁实测不同源（N-04）：\n${problems.join('\n')}`);
  // 抽样必须真的判到（日志在时逐条同源；不在时如实 skip，不得用 skip 兜成「通过」）。
  assert.ok(
    checked.length + skipped.length === SAMPLED_COUNT_KEYS.length,
    '抽样口径必须逐条落到「已同源核验」或「日志缺失显式 skip」两类之一',
  );
  if (skipped.length > 0) {
    console.log(`  · counts 同源核验：skip ${skipped.join(', ')}（日志不在本机；已同源核验：${checked.join(', ') || '无'}）`);
  }
  console.log(
    `  ℹ counts 同源机核：${checked.length} 项与门禁日志逐条相等${skipped.length ? ` · ${skipped.length} 项因日志缺失 skip` : ''}`,
  );
});

test('ledger(V4 段)反证: counts 同源判据必须能红（抽样脱钩 / 日志不符 / 缺 source 都 FAIL）', () => {
  const mk = (over: Partial<CountSource>, currentRuntime: number): Record<string, V4Count> => ({
    l0: {
      currentRuntime,
      floor: 1,
      source: {
        gate: 'npm run test:l0',
        log: '/tmp/nonexistent.log',
        pattern: '▶ L0 运行时门禁: (\\d+) passed',
        observedLine: '▶ L0 运行时门禁: 210 passed / 0 failed',
        observed: 210,
        measuredOn: '2026-09-19',
        ...over,
      },
    },
  });
  const readNone = () => null;
  assert.deepEqual(countSourceProblems(mk({}, 210), readNone).problems, [], '自洽且日志缺失时不得判红（只 skip）');
  assert.equal(countSourceProblems(mk({}, 210), readNone).skipped.length, 1, '日志缺失必须显式 skip');
  assert.ok(
    countSourceProblems(mk({}, 203), readNone).problems.some((p) => /脱钩/.test(p)),
    'source.observed 与 currentRuntime 不一致必须判红（正是 N-04 的漂移形态）',
  );
  assert.ok(
    countSourceProblems(mk({ observedLine: '▶ 别的门禁: 210 passed' }, 210), readNone).problems.some((p) => /不命中/.test(p)),
    'observedLine 不匹配 pattern 必须判红',
  );
  assert.ok(
    countSourceProblems(mk({ pattern: '▶ L0 运行时门禁: (\\d+) passed' }, 999), readNone).problems.some((p) => /脱钩/.test(p)),
    '台账值与观测行解析值不一致必须判红',
  );
  assert.ok(
    countSourceProblems(
      mk({ log: '/tmp/nonexistent.log' }, 210),
      () => '▶ L0 运行时门禁: 209 passed / 0 failed\n',
    ).problems.some((p) => /日志实测 209/.test(p)),
    '日志实测与台账不一致必须判红（同源层的核心判据）',
  );
  assert.ok(
    countSourceProblems({ l0: { currentRuntime: 210, floor: 164 } }, readNone).problems.some((p) => /必须带可核 source/.test(p)),
    '抽样口径缺 source 必须判红',
  );
});

// ── 10. N-01~N-08（收口轮）：validate 观察项的处置登记必须可机核 ────────────────
/**
 * 〖收口轮（v4-1 validate R1 的 N-01~N-08）〗
 *
 * 收口轮最怕的不是「有 8 项没做完」，而是「**报告里写了处置、台账里查不到、门禁也不会红**」。
 * 因此 8 项观察项的处置被登记成结构化条目：`disposition` 必须在枚举内（fixed / registered /
 * handed-over），且每条必须给出 **file + contains 锚点**（跨文件，不得自引用台账本身），
 * 门禁逐条打开该文件确认锚点真的存在 —— 修法/登记/移交都必须留下可定位的落点。
 */
const VALIDATE_FINDING_IDS = ['N-01', 'N-02', 'N-03', 'N-04', 'N-05', 'N-06', 'N-07', 'N-08'] as const;
const FINDING_DISPOSITIONS = ['fixed', 'registered', 'handed-over'] as const;
const FINDING_SEVERITIES = ['low', 'medium', 'high'] as const;

function validateFindingProblems(
  findings: ValidateFinding[] | undefined,
  readText: (file: string) => string | null,
): string[] {
  const problems: string[] = [];
  const list = findings ?? [];
  const ids = list.map((f) => f.id);
  for (const expected of VALIDATE_FINDING_IDS) {
    if (!ids.includes(expected)) problems.push(`缺少 ${expected} 的处置登记（不得漏项）`);
  }
  for (const id of new Set(ids)) {
    if (ids.filter((x) => x === id).length > 1) problems.push(`${id}: 重复登记`);
  }
  for (const f of list) {
    if (!VALIDATE_FINDING_IDS.includes(f.id as (typeof VALIDATE_FINDING_IDS)[number])) {
      problems.push(`${f.id}: 不在 validate R1 的观察项集合内（不得塞入无关项）`);
    }
    if (!FINDING_DISPOSITIONS.includes(f.disposition as (typeof FINDING_DISPOSITIONS)[number])) {
      problems.push(`${f.id}: 非法 disposition「${f.disposition}」（枚举 ${FINDING_DISPOSITIONS.join(' | ')}）`);
    }
    if (!FINDING_SEVERITIES.includes(f.severity as (typeof FINDING_SEVERITIES)[number])) {
      problems.push(`${f.id}: 非法 severity「${f.severity}」`);
    }
    if ((f.title ?? '').trim().length < 10) problems.push(`${f.id}: title 过短（必须能认出是哪一项）`);
    if ((f.evidence ?? '').trim().length < 40) {
      problems.push(`${f.id}: evidence 过短（≥40 字符：必须写明修法/登记/移交的可核证据）`);
    }
    const anchor = f.anchor;
    if (!anchor || !anchor.file || (anchor.contains ?? '').trim().length < 8) {
      problems.push(`${f.id}: 必须给出 anchor{file, contains}（≥8 字符的可定位锚点）`);
      continue;
    }
    const text = readText(anchor.file);
    if (text === null) problems.push(`${f.id}: 锚点文件不存在 ${anchor.file}`);
    else if (!text.includes(anchor.contains)) {
      problems.push(`${f.id}: 锚点「${anchor.contains}」在 ${anchor.file} 中定位不到（橡皮图章）`);
    }
  }
  return problems;
}

test('ledger(V4 段): validate R1 的 N-01~N-08 处置必须逐项登记且锚点可定位', () => {
  const v4 = readV4Ledger();
  const findings = v4.validateFindings;
  assert.ok(Array.isArray(findings), 'v4 台账必须登记 validateFindings[]（收口轮证据）');
  assert.equal(findings!.length, VALIDATE_FINDING_IDS.length, `N-01~N-08 必须恰好 ${VALIDATE_FINDING_IDS.length} 条`);
  const readText = (file: string): string | null => {
    try {
      const abs = resolve(REPO, file);
      return existsSync(abs) ? readFileSync(abs, 'utf8') : null;
    } catch {
      return null;
    }
  };
  assert.deepEqual(
    validateFindingProblems(findings, readText),
    [],
    'N-01~N-08 的处置登记不合法（disposition / evidence / 锚点）',
  );
  const byDisposition = new Map<string, number>();
  for (const f of findings!) byDisposition.set(f.disposition, (byDisposition.get(f.disposition) ?? 0) + 1);
  console.log(
    `  ℹ validateFindings：${findings!.length} 项 → ${[...byDisposition].map(([k, n]) => `${k}=${n}`).join(' / ')}（锚点逐条可定位）`,
  );
  // 移交项必须点名目标文件（跨叶移交不得只写在散文里）。
  const handedOver = findings!.filter((f) => f.disposition === 'handed-over');
  assert.ok(handedOver.length >= 1, 'N-03 的跨叶移交必须登记为 handed-over');
  for (const f of handedOver) assert.match(f.anchor.file, /specs-tree-v4-2-chat-stream-model/, `${f.id} 的移交目标必须是 v4-2 的产物`);
});

test('ledger(V4 段)反证: validateFindings 判据必须能红（漏项 / 非法处置 / 锚点定位不到 都 FAIL）', () => {
  const good: ValidateFinding = {
    id: 'N-01',
    severity: 'low',
    disposition: 'fixed',
    title: 'RP-V4-06 的第二半改用排除口径',
    evidence: 'x'.repeat(60),
    anchor: { file: 'packages/web-cli-plugin/test/ui/density.mjs', contains: 'N-01（收口轮）' },
  };
  const readGood = () => '…N-01（收口轮）…';
  const all = VALIDATE_FINDING_IDS.map((id) => ({ ...good, id }));
  assert.deepEqual(validateFindingProblems(all, readGood), [], '合法集合（8 项、锚点命中）不得误报');
  assert.ok(
    validateFindingProblems(all.filter((f) => f.id !== 'N-03'), readGood).some((p) => /缺少 N-03/.test(p)),
    '漏一项必须判红',
  );
  assert.ok(
    validateFindingProblems([...all, { ...good, id: 'N-99' }], readGood).some((p) => /不在 validate R1 的观察项集合内/.test(p)),
    '塞入无关项必须判红',
  );
  assert.ok(
    validateFindingProblems(all.map((f) => (f.id === 'N-02' ? { ...f, disposition: 'maybe' } : f)), readGood).some((p) =>
      /非法 disposition/.test(p),
    ),
    '非法 disposition 必须判红',
  );
  assert.ok(
    validateFindingProblems(all.map((f) => (f.id === 'N-04' ? { ...f, evidence: 'too short' } : f)), readGood).some((p) =>
      /evidence 过短/.test(p),
    ),
    '过短证据必须判红',
  );
  assert.ok(
    validateFindingProblems(all, () => 'another text').some((p) => /定位不到/.test(p)),
    '锚点定位不到必须判红（防橡皮图章）',
  );
  assert.ok(
    validateFindingProblems(all, () => null).some((p) => /锚点文件不存在/.test(p)),
    '锚点文件缺失必须判红',
  );
  assert.ok(
    validateFindingProblems(all.map((f) => (f.id === 'N-05' ? { ...f, anchor: { file: 'a.ts', contains: 'short' } } : f)), readGood).some(
      (p) => /必须给出 anchor/.test(p),
    ),
    '锚点过短必须判红',
  );
});

// ── 11. I-01（v4-2 review）：声称截断必须登记（truncationRules ↔ 源码白名单） ──
/**
 * 〖v4-2 review 修复轮 **I-01**〗
 *
 * 缺陷形态：`plan` ADR-V4-028 dec.5 与 TASK-605/606 的验收要求把**降级重建的截断规则**
 * 登记进 v4 取代台账（`{scope:'panel-reopen', kept, degraded:['body'], reason, registeredOn}`），
 * 而 build.md §5/§11 声称「已登记于台账」——实测台账里**没有这个字段**，`grep` 0 命中。
 * 也就是说：**代码降级了正文、文档说降级了正文、台账却查不到**，而没有任何门禁会红。
 *
 * 修法不是「补一段散文」，而是把「声称」变成机器事实：
 *   ① 台账必须有 `truncationRules[]`，每条给出 scope / carrier / kept / degraded / reason / registeredOn；
 *   ② 只要 `stream-digest.ts` 里存在 `DIGEST_DEGRADED_BODY`（= 产品真的会丢正文），
 *      就必须存在 `scope:'panel-reopen'` 且 `degraded` 含 `body` 的条目（**声称截断必须登记**）；
 *   ③ `kept` 必须与源码的 `DIGEST_FIELDS` **逐字段相等** —— 直接解析源码字面量比对，
 *      因此「悄悄加/删一个白名单字段而不更新截断登记」会立刻 FAIL（不是存在性断言，是行为断言）。
 */
const TRUNCATION_SCOPES = ['panel-reopen'] as const;
const STREAM_DIGEST_REL = 'packages/web-cli-plugin/src/ui/sidepanel/stream-digest.ts';

/** 从源码解析 `DIGEST_FIELDS` 的白名单字面量（唯一事实源；解析不到即判据悬空）。 */
function digestFieldsFromSource(text: string): string[] | null {
  const m = text.match(/export const DIGEST_FIELDS: readonly string\[\] = Object\.freeze\(\[([\s\S]*?)\]\);/);
  if (!m) return null;
  return [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]);
}

function truncationRuleProblems(
  rules: TruncationRule[] | undefined,
  readText: (file: string) => string | null,
): string[] {
  const problems: string[] = [];
  const list = rules ?? [];
  const digest = readText(STREAM_DIGEST_REL);
  const claimsDegradedBody = digest !== null && /DIGEST_DEGRADED_BODY/.test(digest);
  if (digest === null) problems.push(`锚点文件不存在 ${STREAM_DIGEST_REL}（截断登记判据悬空）`);
  if (claimsDegradedBody && !list.some((r) => r.scope === 'panel-reopen' && (r.degraded ?? []).includes('body'))) {
    problems.push(
      '源码声明了 DIGEST_DEGRADED_BODY（面板重开会丢正文）却未登记 scope=panel-reopen / degraded=[body]（声称截断必须登记）',
    );
  }
  if (list.length === 0) problems.push('truncationRules 不得为空（凡有截断字段就必须登记）');
  const seen = new Set<string>();
  for (const r of list) {
    const scope = r.scope;
    if (!(TRUNCATION_SCOPES as readonly string[]).includes(scope)) {
      problems.push(`${scope}: 不在已登记 scope 枚举内（${TRUNCATION_SCOPES.join(' | ')}）`);
    }
    if (seen.has(scope)) problems.push(`${scope}: 重复登记`);
    seen.add(scope);
    if ((r.carrier ?? '').trim().length < 5) problems.push(`${scope}: carrier 必填（必须指向真实落点）`);
    if (!Array.isArray(r.kept) || r.kept.length === 0) problems.push(`${scope}: kept 必须是非空数组（保留的事实字段）`);
    if (!Array.isArray(r.degraded) || r.degraded.length === 0) {
      problems.push(`${scope}: degraded 必须是非空数组（丢掉什么，不得留空）`);
    }
    if ((r.reason ?? '').trim().length < 40) problems.push(`${scope}: reason 过短（≥40 字符：必须写明为什么这么丢）`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(r.registeredOn ?? '')) problems.push(`${scope}: registeredOn 必须是 YYYY-MM-DD`);
    if (scope !== 'panel-reopen') continue;
    if (!(r.degraded ?? []).includes('body')) problems.push('panel-reopen 必须显式声明 degraded 含 body（正文不落库）');
    const fields = digest === null ? null : digestFieldsFromSource(digest);
    if (fields === null) {
      problems.push('无法从 stream-digest.ts 解析 DIGEST_FIELDS（登记无法与源码机核）');
      continue;
    }
    const kept = r.kept ?? [];
    const missing = fields.filter((f) => !kept.includes(f));
    const extra = kept.filter((f) => !fields.includes(f));
    if (missing.length > 0) problems.push(`panel-reopen.kept 缺白名单字段 ${missing.join(', ')}（登记与 DIGEST_FIELDS 脱钩）`);
    if (extra.length > 0) problems.push(`panel-reopen.kept 含白名单外字段 ${extra.join(', ')}（登记虚增）`);
  }
  return problems;
}

test('ledger(V4 段): 声称截断必须登记 —— truncationRules ↔ DIGEST_FIELDS 逐字段机核（I-01）', () => {
  const v4 = readV4Ledger();
  const readText = (file: string): string | null => {
    try {
      const abs = resolve(REPO, file);
      return existsSync(abs) ? readFileSync(abs, 'utf8') : null;
    } catch {
      return null;
    }
  };
  assert.ok(Array.isArray(v4.truncationRules), 'v4 台账必须登记 truncationRules[]（ADR-V4-028 dec.5 / TASK-605/606 验收）');
  assert.deepEqual(
    truncationRuleProblems(v4.truncationRules, readText),
    [],
    '截断规则登记不合法（scope / kept / degraded / reason / registeredOn / 与源码脱钩）',
  );
  const rule = (v4.truncationRules ?? []).find((r) => r.scope === 'panel-reopen');
  assert.ok(rule, 'panel-reopen（面板重开降级重建）必须有一条登记');
  const srcFields = digestFieldsFromSource(readText(STREAM_DIGEST_REL) as string);
  assert.deepEqual([...rule!.kept].sort(), [...(srcFields ?? [])].sort(), 'kept 必须 = DIGEST_FIELDS（逐字段相等）');
  assert.ok((rule!.degraded ?? []).includes('body'), 'panel-reopen 的降级面必须含 body');
  console.log(
    `  ℹ truncationRules：${(v4.truncationRules ?? []).length} 条 → scope=${rule!.scope} · kept=${rule!.kept.length} 字段（== DIGEST_FIELDS）· degraded=${rule!.degraded.join('/')}`,
  );
});

test('ledger(V4 段)反证: truncationRules 判据必须能红（漏登记 / kept 脱钩 / degraded 缺 body 都 FAIL）', () => {
  const src = 'export const DIGEST_DEGRADED_BODY = \'（历史摘要）\';\n' +
    'export const DIGEST_FIELDS: readonly string[] = Object.freeze([\n  \'seq\',\n  \'ts\',\n  \'kind\',\n]);';
  const readSrc = () => src;
  const good: TruncationRule = {
    scope: 'panel-reopen',
    carrier: 'src/ui/sidepanel/stream-digest.ts#digestToEvents',
    kept: ['seq', 'ts', 'kind'],
    degraded: ['body'],
    reason: 'x'.repeat(60),
    registeredOn: '2026-09-19',
  };
  assert.deepEqual(truncationRuleProblems([good], readSrc), [], '合法登记不得误报');
  assert.ok(
    truncationRuleProblems([], readSrc).some((p) => /声称截断必须登记/.test(p)),
    '源码真的会丢正文却零登记必须判红（正是 I-01 的缺陷形态）',
  );
  assert.ok(
    truncationRuleProblems([{ ...good, kept: ['seq', 'ts'] }], readSrc).some((p) => /脱钩/.test(p)),
    'kept 与 DIGEST_FIELDS 脱钩必须判红（新增白名单字段而不更新登记即触发）',
  );
  assert.ok(
    truncationRuleProblems([{ ...good, kept: [...good.kept, 'bogus'] }], readSrc).some((p) => /白名单外字段/.test(p)),
    'kept 虚增字段必须判红',
  );
  assert.ok(
    truncationRuleProblems([{ ...good, degraded: ['label'] }], readSrc).some((p) => /必须显式声明 degraded 含 body/.test(p)),
    'panel-reopen 未声明 body 降级必须判红',
  );
  assert.ok(
    truncationRuleProblems([{ ...good, registeredOn: '2026/09/19' }], readSrc).some((p) => /registeredOn/.test(p)),
    '非法日期必须判红',
  );
  assert.ok(
    truncationRuleProblems([{ ...good, reason: '太短' }], readSrc).some((p) => /reason 过短/.test(p)),
    '过短理由必须判红',
  );
  assert.ok(
    truncationRuleProblems([{ ...good, scope: 'somewhere-else' }], readSrc).some((p) => /不在已登记 scope 枚举内/.test(p)),
    '未知 scope 必须判红',
  );
  assert.ok(
    truncationRuleProblems([{ ...good, carrier: '' }], readSrc).some((p) => /carrier 必填/.test(p)),
    'carrier 缺失必须判红',
  );
  assert.ok(
    truncationRuleProblems(undefined, readSrc).some((p) => /不得为空/.test(p)),
    '字段整体缺失必须判红（不得用「没有字段 ⇒ 没有截断」蒙混）',
  );
});
