/**
 * V3-1 TASK-108 / ADR-V3-019 — the **supersession ledger gate** (AC-V3-011 / AC-V3-012 / AC-V3-014).
 *
 * Turns「删除行必须命中台账否则 FAIL」into a machine fact, and keeps the claim
 * honest in the only direction that matters: *the ledger can shrink, the
 * assertions cannot*.
 *
 * What it enforces, per requirement:
 *
 *   1. **hunk ↔ ledger** — for every protected file, every `git diff -U0 <base>`
 *      hunk that DELETES or REWRITES a line must either (a) contain an
 *      `entries[].oldTitle` string, or (b) overlap a `modifiedRanges` interval
 *      recorded for that file. Otherwise the gate fails and prints the deleted
 *      lines (this is what stops "delete first, explain later").
 *   2. **protected byte ranges** — designated regions (journey `#15a~#15q`,
 *      binding `#21*`/`#22*`) are pinned by **byte-range sha256**, not by line
 *      numbers, so they survive unrelated insertions above them.
 *   3. **zero-diff set** — files that must not change at all (hardening, the
 *      static DOM contract test, the perf/646-floor guards, `manifest.json`,
 *      `options.html`, `src/content/**`, `src/security/{policy,auto-authorize}.ts`).
 *   4. **`newTitle` must be locatable** — a ledger entry whose replacement text
 *      cannot be found in the target file is a rubber stamp and fails.
 *   5. **count floors** — `countMethod` is force-restricted to
 *      `runtime-check-calls` (the r2 ledger's static/runtime ambiguity is
 *      abolished), `counts.*.currentRuntime ≥ gateFloors.*`, and every v3 gate
 *      file keeps at least the number of runtime `check(...)` calls the ledger
 *      recorded.
 *   6. **`--files-override <path>`** — RP-V3-05's seam: the named file is judged
 *      against the ledger floor of the ledger file with the same basename, so
 *      deleting one assertion from a copy FAILS the gate.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
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
  oldTitle: string;
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
interface Ledger {
  version: string;
  feature: string;
  base: string;
  metric: string;
  counts: Record<string, { baselineRuntime: number; currentRuntime: number; countMethod: string; floor: number; note: string }>;
  gateFloors: Record<string, number>;
  v3GateFloors: Record<string, number>;
  protectedRanges: ProtectedRange[];
  modifiedRanges: ModifiedRange[];
  entries: LedgerEntry[];
  zeroDiffFiles: string[];
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
function deletionHunks(file: string) {
  const diff = diffText(file);
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

// ── 1. schema + count discipline ─────────────────────────────────────────────
test('ledger: schema 完整，countMethod 只能取 runtime-check-calls（消灭跨口径歧义）', () => {
  assert.equal(ledger.version, 'v3');
  assert.ok(ledger.feature.includes('v3-1'), ledger.feature);
  assert.equal(ledger.base, 'c2c0e0d', '台账 base 必须是本轮起点 c2c0e0d');
  for (const [gate, count] of Object.entries(ledger.counts)) {
    assert.equal(
      count.countMethod,
      'runtime-check-calls',
      `${gate}.countMethod 只能取 runtime-check-calls（实际 ${count.countMethod}）`,
    );
  }
  for (const key of ['journey', 'insight', 'binding', 'sidepanelView', 'nodeTestLowerBound']) {
    assert.ok(ledger.gateFloors[key] > 0, `gateFloors 缺 ${key}`);
    assert.ok(key in ledger.counts, `counts 缺 ${key}`);
  }
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
});

test('ledger: 既有门禁文件零删除——每个删除/改写 hunk 必须命中台账或 modifiedRanges', () => {
  const files = new Set<string>([
    ...ledger.modifiedRanges.map((r) => r.file),
    ...ledger.entries.map((e) => e.file).filter((f) => !f.includes('*')),
    ...ledger.protectedRanges.map((r) => r.file),
  ]);
  const failures: string[] = [];
  for (const file of files) {
    if (!existsSync(resolve(REPO, file))) continue;
    const ranges = ledger.modifiedRanges.filter((r) => r.file === file);
    const titles = ledger.entries.filter((e) => e.file === file).map((e) => e.oldTitle);
    for (const hunk of deletionHunks(file)) {
      const coveredByRange = ranges.some(
        (r) => hunk.oldStart + hunk.oldCount - 1 >= r.oldRange[0] && hunk.oldStart <= r.oldRange[1],
      );
      const coveredByTitle = hunk.deleted.some((line) => titles.some((t) => t && line.includes(t)));
      if (!coveredByRange && !coveredByTitle) {
        failures.push(`${file} @@ -${hunk.oldStart},${hunk.oldCount}: ${hunk.deleted.map((l) => l.trim()).join(' ⏎ ')}`);
      }
    }
  }
  assert.deepEqual(failures, [], `以下删除行未命中台账：\n${failures.join('\n')}`);
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
  const expected = ['test/ui/l0.mjs', 'test/ui/density.mjs', 'test/ui/density-metrics.mjs'];
  const keys = Object.keys(ledger.v3GateFloors);
  for (const file of expected) {
    assert.ok(
      keys.some((key) => key.endsWith(file)),
      `v3GateFloors 缺 ${file}（现有 ${keys.join(', ')}）`,
    );
  }
});
