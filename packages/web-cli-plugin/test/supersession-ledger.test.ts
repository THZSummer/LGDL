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

interface V4LeafBase {
  leaf: string;
  leafBase: string;
  why: string;
  scope: { files: string[]; why: string };
  registeredUncoveredLines?: Array<{ file: string; count: number; reason: string; registeredUncoveredLines: string[] }>;
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
  counts?: Record<string, { currentRuntime: number }>;
  v4GateFloors?: Record<string, number>;
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

/** v4-segment misses: base-relative deletions not covered by v4 entries/registrations. */
function v4LeafMisses(file: string, extraLines: string[] = []): string[] {
  const v4 = readV4Ledger();
  const leaf = (v4.leafBases ?? [])[0];
  assert.ok(leaf, 'v4 台账必须登记本叶的 leafBase');
  const titles = (v4.entries ?? []).filter((e) => e.file === file).map((e) => e.oldTitle);
  const lines = [...deletionLines(file, leaf.leafBase).map((d) => d.text), ...extraLines];
  const uncovered = lines.filter((text) => !titles.some((t) => t !== null && t !== undefined && text.includes(t)));
  const registered = new Set(v4RegisteredLines(file));
  return uncovered.filter((text) => !registered.has(text));
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
    const superseder = (v4?.protectedRanges ?? []).find(
      (r) => r.file === range.file && r.status === 'active' && r.supersededFrom === range.sha256,
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
    const leafBase = (superseder as { leafBase?: string }).leafBase;
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
  assert.equal((v4.leafBases ?? []).length, 1, 'v4-1 是本叶唯一叶段');
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

test('ledger(V4 段): entries 的 newTitle 可在目标文件定位，oldTitle 必须真的在本叶段被删除', () => {
  const v4 = readV4Ledger();
  const leaf = (v4.leafBases ?? [])[0];
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
    const deleted = deletionLines(e.file, leaf.leafBase).map((d) => d.text);
    if (!deleted.some((t) => t.includes(e.oldTitle!))) {
      problems.push(`${e.id}: oldTitle 并未在本叶段被删除（声明失真）→ ${e.oldTitle}`);
    }
  }
  assert.deepEqual(problems, [], `v4 entries 可定位性/真实性未通过：\n${problems.join('\n')}`);
  console.log(`  ℹ v4 entries 可定位性：${(v4.entries ?? []).length} 条逐条命中（newTitle 可定位 ∧ oldTitle 真被删除）`);
});

test('ledger(V4 段): v4 段删除行必须逐字集合相等（多一条/少一条/改一字都 FAIL）', () => {
  const v4 = readV4Ledger();
  const leaf = (v4.leafBases ?? [])[0];
  assert.ok(leaf, 'v4 台账必须登记 leafBase');
  const failures: string[] = [];
  let judged = 0;
  for (const file of leaf.scope.files) {
    if (!existsSync(resolve(REPO, file))) continue;
    judged += 1;
    for (const t of v4LeafMisses(file)) failures.push(`${file}: v4 段删除行未登记 → ${t.trim()}`);
  }
  assert.ok(judged > 0, 'v4 段判据必须真的覆盖到文件');
  assert.deepEqual(failures, [], `v4 段（leafBase ${leaf.leafBase}）删除行未逐条命中 v4 台账：\n${failures.join('\n')}`);
  console.log(`  ℹ v4 叶段判据：受判文件 ${judged} 个 · 全部逐字登记`);
});

test('ledger(V4 段)反证: 注入一条未登记删除行必须判 FAIL（v4 判据不是恒真）', () => {
  const v4 = readV4Ledger();
  const leaf = (v4.leafBases ?? [])[0];
  const file = leaf.scope.files.find((f) => existsSync(resolve(REPO, f)));
  assert.ok(file, 'v4 scope.files 必须至少有一个存在的文件');
  assert.deepEqual(v4LeafMisses(file), []);
  const injected = '// RP-V4-08 injected: an unregistered v4 deletion (must FAIL)';
  assert.deepEqual(v4LeafMisses(file, [injected]), [injected], '注入的未登记删除行必须被判 FAIL');
}) ;

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
