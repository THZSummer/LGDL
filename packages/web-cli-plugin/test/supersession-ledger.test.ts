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
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));

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

/** Count runtime `check(...)` calls in a gate file (the ledger's single metric). */
const countChecks = (text: string) => (text.match(/\bcheck\(/g) ?? []).length;

/** `-U0` hunks that delete or rewrite at least one line. */
function deletionHunks(file: string, rev: string = ledger.base) {
  const diff = runGit(['diff', '-U0', rev, '--', file]);
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
    if (actual !== reading.count) {
      mismatches.push(`${key} (/${reading.regex}/gm): 实测 ${actual} ≠ 登记 ${reading.count}`);
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
  for (const file of ledger.pureAdditionFiles) {
    assert.ok(existsSync(resolve(REPO, file)), `${file} 不存在`);
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
    const ranges = ledger.modifiedRanges.filter((r) => r.file === file);
    const titles = ledger.entries.filter((e) => e.file === file).map((e) => e.oldTitle);
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
test('ledger: protectedRanges 字节区间 hash 不变（禁行号锚定）', () => {
  for (const range of ledger.protectedRanges) {
    const path = resolve(REPO, range.file);
    assert.ok(existsSync(path), `${range.file} 不存在`);
    const text = readFileSync(path, 'utf8');
    const i = text.indexOf(range.startAnchor);
    const j = text.indexOf(range.endAnchor, i);
    assert.ok(i >= 0 && j >= 0, `${range.file} 的锚点已变化（start=${i} end=${j}）`);
    const chunk = text.slice(i, j + range.endAnchor.length);
    assert.equal(
      createHash('sha256').update(chunk, 'utf8').digest('hex'),
      range.sha256,
      `${range.file} 受保护区间字节已变（${range.startAnchor.slice(0, 30)}…${range.endAnchor.slice(-30)}）`,
    );
    assert.equal(
      Buffer.byteLength(text.slice(0, i), 'utf8'),
      range.startByte,
      `${range.file} 受保护区间起始字节偏移变化`,
    );
  }
});

// ── 3. zero-diff set ────────────────────────────────────────────────────────
test('ledger: zeroDiffFiles 必须 0 行 diff（零注入 / 零权限 / 零依赖红线）', () => {
  const dirty: string[] = [];
  for (const file of ledger.zeroDiffFiles) {
    const out = runGit(['diff', '--numstat', ledger.base, '--', file]).trim();
    if (out) dirty.push(`${file}: ${out}`);
  }
  assert.deepEqual(dirty, [], `以下文件本轮不得改动：\n${dirty.join('\n')}`);
});

// ── 4. newTitle must be locatable (anti rubber-stamp) ───────────────────────
test('ledger: entries[].newTitle 必须能在目标文件定位（防橡皮图章）', () => {
  const missing: string[] = [];
  for (const entry of ledger.entries) {
    if (entry.file.includes('*')) continue;
    const path = resolve(REPO, entry.file);
    if (!existsSync(path)) {
      missing.push(`${entry.id}: 目标文件不存在 ${entry.file}`);
      continue;
    }
    const text = readFileSync(path, 'utf8');
    if (!text.includes(entry.newTitle)) missing.push(`${entry.id}: 在 ${entry.file} 中找不到 newTitle`);
  }
  assert.deepEqual(missing, [], `台账条目无法定位新断言：\n${missing.join('\n')}`);
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
      const registered = (leaf.registeredUncoveredLines ?? []).filter((r) => r.file === file).flatMap((r) => r.registeredUncoveredLines);
      judgedFiles += 1;
      judgedLines += actual.length;
      registeredTotal += registered.length;
      const missing = actual.filter((t) => !registered.includes(t));
      const phantom = registered.filter((t) => !actual.includes(t));
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
