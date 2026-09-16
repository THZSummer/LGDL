/**
 * V3-2 fix round 2 (2026-09-16) — **the meta-gate (元门禁)**: integrity of the gates
 * themselves.
 *
 * ── Why this file exists ────────────────────────────────────────────────────
 *
 * Review R1 found **F-01**: `test/ui/binding.mjs` shipped an assertion failure
 * ("`binding FAILED (4)`") while the process still exited **0**, because the
 * failure branch did `await dumpDiagnostics(...)` *before* `process.exit(1)` and
 * `dumpDiagnostics → captureRuntimeSummary → evaluate → cdp.send()` had **no
 * timeout and no `close` listener** — so on a CLOSED CDP socket the awaited
 * Promise never settled, `process.exit(1)` was unreachable, the event loop drained
 * and Node exited with its default code **0**. A failing gate was reported green.
 *
 * Fixing that one file is not enough: the *class* of defect must be unable to come
 * back. This gate therefore audits the gate scripts themselves, with no Chromium
 * and no fixtures (it runs inside `npm test`):
 *
 *   R1a  **exit-code primacy** — inside a failure block (`if (…failures.length…)
 *        {` / `main().catch(async …)`), the **first standalone `await` of the
 *        block** must already come *after* an exit-code-fixing statement
 *        (`process.exitCode = N`, `process.exit(N)`, `finish()`). The body is
 *        taken as an **indentation-delimited block window**, not as "the line
 *        immediately above the exit" — that one-line lookback was bypassable by
 *        inserting any statement between the `await` and the exit (closeout round
 *        N-01, demonstrated red with the historical F-01 shape plus an extra
 *        `console.error`). A standalone `await` immediately above an exit is
 *        still checked by the original adjacency rule, kept as a second clause.
 *   R1b  **bounded diagnostics** — an `await` that relies on R1a's "exit code is
 *        already fixed" clause must call a **self-bounding callee**: a function
 *        defined in the same file whose body installs a `setTimeout(...)` that
 *        exits the process (a hard wall-clock escape). Comments are **stripped
 *        before** the test and the callee body is the real indentation-delimited
 *        function body — a *commented-out* `setTimeout(... process.exit ...)`
 *        used to satisfy this rule (closeout round N-02).
 *   R2   **failure → exit coupling** — a file that records failures (`FAILED (` /
 *        `failures.push(` / `✖`) must have an explicit exit path
 *        (`process.exit(1)` / `process.exitCode = N` / `finish()` from
 *        `./_v3-helpers.mjs`, whose own failure branch exits 1).
 *   R3   **bounded CDP sends** — **every** CDP `send(method, params …)`
 *        implementation must carry a `readyState` guard **and** a `setTimeout`
 *        round-trip bound, and the socket must reject the **pending map of its
 *        own scope** on `close`. The earlier version inspected only the *first*
 *        `send(` in the file and accepted a file-global `close`+`reject(` pair,
 *        so a second unbounded client — or a close handler rejecting an unrelated
 *        object — went unnoticed (closeout round N-03).
 *
 * ── Falsifiability (a gate that cannot fail is not a gate) ──────────────────
 *
 *  * **Synthetic fixtures** — hand-written bad/good sources prove each rule fires
 *    on the bad shape and stays silent on the good one (in-process).
 *  * **Injected copy** — a real copy of the gate scripts is written to a temp root,
 *    a defect shape is injected into it, and the auditor must report it there
 *    while reporting nothing for the real root. The same root can be pointed at
 *    with `SDC_GATES_ROOT=<dir>`, which is how the fix/closeout rounds drove the
 *    meta-gate **red** out-of-process (see `build.md §10` / §11).
 *
 * ── The audited set is **derived by directory scan** (closeout round N-12) ──
 *
 * The set used to be `[...CHROMIUM_GATES, …]` — a constant derived from another
 * constant, which made the "the audited set is complete" assertion nearly
 * tautological: a ninth Chromium gate could be added and never be audited. It is
 * now computed by {@link discoverGateFiles} — every `test/ui/*.mjs` /
 * `test/e2e/*.mjs` that carries a CDP `send(method, params` implementation, a
 * `failures.push(` record, or the shared `_v3-helpers.mjs`底座 — so a new gate is
 * **automatically audited and must pass**. A literal
 * {@link EXPECTED_AUDITED_FILES} list is asserted to be a *subset* of the scan, so
 * renaming/deleting a known gate still fails (the set may grow, never shrink).
 *
 * ── Honest coverage limits (registered, not papered over) ───────────────────
 *
 *  * Static analysis is *structural*: it recognises the defended shapes, it does
 *    not execute the gates. `test/ui/l1.mjs` gets a real FAIL-段 dynamic proof from
 *    `test/ui/l1-reverse.mjs` (RP-L1-A~H + RP-L1-C2, each `FAIL 段 exit=1`);
 *    `test/ui/binding.mjs` gets a real dynamic proof from the F-01 reverse run
 *    (`build.md §10.2`, forced red → non-zero exit → restore → 192 PASS).
 *  * The remaining gates are **statically covered only** — proving each of them
 *    red would need one Chromium run per gate (~4 min each, ~1.5 GB RAM budget).
 *    They are listed in {@link STATIC_ONLY_GATES} and printed so the limitation is
 *    visible in the log, not buried here.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));

function packageRoot(): string {
  let dir = HERE;
  for (let i = 0; i < 6; i += 1) {
    const pkg = resolve(dir, 'package.json');
    try {
      readFileSync(pkg);
      if (readFileSync(pkg, 'utf8').includes('web-cli-plugin')) return dir;
    } catch {
      /* keep walking up */
    }
    dir = resolve(dir, '..');
  }
  throw new Error(`package root not found from ${HERE}`);
}

const PKG = packageRoot();

/**
 * The roots the audit runs against. Default = the real package. `SDC_GATES_ROOT`
 * lets a reverse proof point the *same* auditor at an injected copy (the
 * meta-gate's own reverse proof: injected copy ⇒ this test fails ⇒ exit non-zero).
 */
const ROOTS = (process.env.SDC_GATES_ROOT ?? PKG).split(':').filter((s) => s.length > 0);

/** The eight Chromium gate scripts (the user's list; `page-input.mjs` never existed). */
export const CHROMIUM_GATES = [
  'test/ui/journey.mjs',
  'test/ui/insight.mjs',
  'test/ui/binding.mjs',
  'test/ui/l0.mjs',
  'test/ui/l1.mjs',
  // v3-3: the L2 on-demand-views gate (same shared base, one Chromium instance).
  'test/ui/l2.mjs',
  'test/ui/density.mjs',
  'test/ui/hardening.mjs',
  'test/e2e/fullchain.mjs',
] as const;

/**
 * A **literal** expectation (not derived from anything): the gates + drivers this
 * leaf ships. The directory scan must be a superset of it — a rename/removal of a
 * known gate must FAIL the meta-gate instead of silently shrinking the audited set.
 */
export const EXPECTED_AUDITED_FILES = [
  ...CHROMIUM_GATES,
  'test/ui/l1-reverse.mjs',
  'test/ui/_v3-helpers.mjs',
] as const;

/** Gates whose red-proof is static only (see the module doc's coverage limits). */
export const STATIC_ONLY_GATES = [
  'test/ui/journey.mjs',
  'test/ui/insight.mjs',
  'test/ui/l0.mjs',
  'test/ui/l2.mjs',
  'test/ui/density.mjs',
  'test/ui/hardening.mjs',
  'test/e2e/fullchain.mjs',
] as const;

/**
 * The directories that hold executable gates, and the markers that make a script a
 * gate: its own CDP client, its own failure records, or the shared v3 base
 * (`check`/`finish`, whose failure branch exits 1).
 */
const GATE_DIRS = ['test/ui', 'test/e2e'] as const;
const GATE_MARKER = /failures\.push\(|send\(method, params|_v3-helpers\.mjs/;
/** The caliber-only module has no gate body — it must NOT be pulled in. */
const NON_GATE_FILES = ['test/ui/density-metrics.mjs'] as const;

/**
 * Derive the audited set from the filesystem (N-12). A ninth gate that carries any
 * gate marker is included automatically — and therefore must pass the audit.
 */
export function discoverGateFiles(root: string): string[] {
  const found: string[] = [];
  for (const dir of GATE_DIRS) {
    let names: string[];
    try {
      names = readdirSync(resolve(root, dir));
    } catch {
      continue;
    }
    for (const name of names) {
      if (!name.endsWith('.mjs')) continue;
      const rel = `${dir}/${name}`;
      const text = readFileSync(resolve(root, rel), 'utf8');
      if (GATE_MARKER.test(text)) found.push(rel);
    }
  }
  return found.sort();
}

/** The audited set for the real package (the reverse proofs re-scan their own root). */
export const AUDITED_FILES = discoverGateFiles(PKG);

export interface Violation {
  file: string;
  line: number;
  rule: 'R1a' | 'R1b' | 'R2' | 'R3';
  detail: string;
}

const NONZERO_EXIT = /process\.exitCode\s*=\s*[1-9]|process\.exit\s*\(\s*[1-9]/;
const EXIT_STATEMENT = /process\.exit\s*\(|process\.exitCode\s*=/;
const STANDALONE_AWAIT = /^await\b/;
const FAILURE_MARKER = /FAILED \(|failures\.push\(|✖ /;
const BOUNDED_AWAIT = /Promise\.(race|all|allSettled)\s*\(/;
/** Failure-block openers: `if (…failures.length…) {` and `…catch(async (…) => {`. */
const FAILURE_BLOCK_OPENER = /^\s*if\s*\(.*failures\.length.*\)\s*\{\s*$|\.catch\s*\(\s*async\b[^{]*\{\s*$/;

const isBlank = (line: string): boolean => line.trim().length === 0;

/** Indentation width of a line (spaces/tabs count 1 each — the gates use 2 spaces). */
function indentOf(line: string): number {
  const m = /^[ \t]*/.exec(line);
  return m ? m[0].length : 0;
}

/**
 * `openerIndex`'s body as line indices: every following line indented deeper than
 * the opener, stopping at the first non-blank line at the opener's indentation (the
 * closing brace / `});`). Indentation-based on purpose — the gates are consistently
 * formatted, and this avoids tokenising strings/templates that carry braces.
 */
function indentedBody(lines: string[], openerIndex: number): number[] {
  const base = indentOf(lines[openerIndex]);
  const idx: number[] = [];
  for (let k = openerIndex + 1; k < lines.length; k += 1) {
    const line = lines[k];
    if (isBlank(line)) {
      idx.push(k);
      continue;
    }
    if (indentOf(line) <= base) break;
    idx.push(k);
  }
  return idx;
}

/** Index of the nearest preceding named function declaration (the CDP client scope). */
function enclosingFunctionIndex(lines: string[], from: number): number {
  for (let k = from; k >= 0; k -= 1) {
    if (/^\s*(?:export\s+)?(?:async\s+)?function\s+[A-Za-z_$][\w$]*\s*\(/.test(lines[k])) return k;
  }
  return -1;
}

/**
 * Blank out comments (`//…`, `/*…*\/`) while preserving line structure, so a rule
 * can never be satisfied by *commented-out* code (N-02). String/template contents
 * are kept: the R3 close check legitimally matches `'close'`.
 */
function stripComments(source: string): string {
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
    // inside a string/template: keep it verbatim (no comment can start there)
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

/** Index of the nearest preceding substantive (non-blank) line. */
function prevSubstantive(lines: string[], from: number): number {
  for (let i = from - 1; i >= 0; i -= 1) {
    if (isBlank(lines[i])) continue;
    return i;
  }
  return -1;
}

/** `await foo(` → `foo`; `await Promise.race(` → `Promise.race`. */
function awaitedCallee(statement: string): string | null {
  const m = /^await\s+([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*)\s*\(/.exec(statement.trim());
  return m ? m[1] : null;
}

/**
 * Does the callee's own definition install a hard `setTimeout(... process.exit ...)`?
 * The body is the **real** indentation-delimited function body of the clean source.
 */
function calleeIsSelfBounding(clean: string, callee: string): boolean {
  const name = callee.split('.')[0];
  const lines = clean.split('\n');
  const decl = lines.findIndex((line) => new RegExp(`^\\s*(?:async\\s+)?function\\s+${name}\\s*\\(`).test(line));
  if (decl < 0) return false;
  const body = indentedBody(lines, decl).map((k) => lines[k]).join('\n');
  for (let at = body.indexOf('setTimeout('); at >= 0; at = body.indexOf('setTimeout(', at + 1)) {
    // The timer callback must itself exit the process (a wall-clock escape).
    if (/process\.exit\s*\(/.test(body.slice(at, at + 400))) return true;
  }
  return false;
}

/**
 * The auditor. Pure function of `(file name, source text)` so the same rules can be
 * driven at the real files, at synthetic fixtures and at an injected temp copy.
 */
export function auditGateSource(file: string, source: string): Violation[] {
  const clean = stripComments(source);
  const lines = clean.split('\n');
  const rawLines = source.split('\n');
  const out: Violation[] = [];

  // ── R1a: exit-code primacy ────────────────────────────────────────────────
  // (1) block/window scan: inside a failure block, the exit code must be fixed
  //     before the block's FIRST standalone await (N-01 — the one-line lookback
  //     used to be bypassable by inserting any statement between them).
  for (let i = 0; i < lines.length; i += 1) {
    if (!FAILURE_BLOCK_OPENER.test(lines[i])) continue;
    const body = indentedBody(lines, i);
    const firstAwait = body.find((k) => STANDALONE_AWAIT.test(lines[k].trim()));
    if (firstAwait === undefined) continue;
    const fixedBefore = body.some((k) => k < firstAwait && NONZERO_EXIT.test(lines[k]));
    if (fixedBefore) continue;
    out.push({
      file,
      line: firstAwait + 1,
      rule: 'R1a',
      detail: `失败块（第 ${i + 1} 行起）内第一条独立 await 之前未定死退出码（${rawLines[firstAwait]?.trim() ?? ''}）`,
    });
  }
  // (2) adjacency scan (kept): a standalone await directly above an exit is only
  //     acceptable when bounded or when the exit code is already fixed.
  for (let i = 0; i < lines.length; i += 1) {
    if (!EXIT_STATEMENT.test(lines[i])) continue;
    const j = prevSubstantive(lines, i);
    if (j < 0 || !STANDALONE_AWAIT.test(lines[j].trim())) continue;
    const statement = lines.slice(j, i + 1).join('\n');
    if (BOUNDED_AWAIT.test(statement)) continue;
    const k = prevSubstantive(lines, j);
    const exitCodeFixed = k >= 0 && NONZERO_EXIT.test(lines[k]);
    if (exitCodeFixed) continue;
    out.push({
      file,
      line: j + 1,
      rule: 'R1a',
      detail: `第 ${j + 1} 行的独立 await 挡在退出码赋值之前且未加超时（第 ${i + 1} 行才退出；前一行：${lines[k]?.trim() ?? '<无>'}）`,
    });
  }
  // The two R1a clauses may describe the same await — report each await once.
  const seenAwait = new Set<number>();
  const deduped: Violation[] = [];
  for (const v of out) {
    if (v.rule === 'R1a') {
      if (seenAwait.has(v.line)) continue;
      seenAwait.add(v.line);
    }
    deduped.push(v);
  }
  out.length = 0;
  out.push(...deduped);

  // ── R1b: the "exit code already fixed" escape must be a *bounded* await ───
  for (let i = 0; i < lines.length; i += 1) {
    if (!STANDALONE_AWAIT.test(lines[i].trim())) continue;
    const k = prevSubstantive(lines, i);
    if (k < 0 || !NONZERO_EXIT.test(lines[k])) continue;
    // It relies on R1a's escape clause ⇒ the callee must self-terminate.
    const callee = awaitedCallee(lines[i]);
    if (!callee) continue;
    if (calleeIsSelfBounding(clean, callee)) continue;
    out.push({
      file,
      line: i + 1,
      rule: 'R1b',
      detail: `第 ${i + 1} 行的 await ${callee}(...) 依赖「退出码已定死」，但 ${callee}() 自身没有 setTimeout 硬上限（注释内同字面量不算）`,
    });
  }

  // ── R2: failure count ↔ exit code ────────────────────────────────────────
  if (FAILURE_MARKER.test(clean)) {
    const hasExit =
      /process\.exit\s*\(\s*[1-9]/.test(clean)
      || /process\.exitCode\s*=\s*[1-9]/.test(clean)
      || /finish\(/.test(clean);
    const usesHelper = /from\s+['"]\.\/_v3-helpers\.mjs['"]/.test(clean);
    const helperOk = !/finish\(/.test(clean) || usesHelper || file.endsWith('_v3-helpers.mjs');
    if (!hasExit || !helperOk) {
      out.push({
        file,
        line: 1,
        rule: 'R2',
        detail: `存在失败计数标记（FAILED/✖/failures.push）但没有可用的退出码路径（exit(1)/exitCode=1/finish()${
          usesHelper ? ' + _v3-helpers 导入' : ''
        }）`,
      });
    }
    if (/finish\(/.test(clean) && !file.endsWith('_v3-helpers.mjs')) {
      // The helper's own failure branch must really exit 1.
      const helperPath = resolve(PKG, 'test/ui/_v3-helpers.mjs');
      const helper = stripComments(readFileSync(helperPath, 'utf8'));
      if (!/if \(failures\.length\)[\s\S]{0,200}?process\.exit\(1\);/.test(helper)) {
        out.push({ file, line: 1, rule: 'R2', detail: 'finish() 的失败分支未同步 process.exit(1)' });
      }
    }
  }

  // ── R3: EVERY CDP send() must be bounded + its own scope must reject on close ─
  for (let i = 0; i < lines.length; i += 1) {
    if (!/send\(method, params/.test(lines[i])) continue;
    const sendBody = indentedBody(lines, i).map((k) => lines[k]).join('\n');
    if (!/readyState/.test(sendBody)) {
      out.push({ file, line: i + 1, rule: 'R3', detail: `第 ${i + 1} 行的 send() 缺 readyState 拒答（对 CLOSED socket 会静默挂死）` });
    }
    if (!/setTimeout\(/.test(sendBody)) {
      out.push({ file, line: i + 1, rule: 'R3', detail: `第 ${i + 1} 行的 send() 缺 setTimeout 超时拒答` });
    }
    const fnIndex = enclosingFunctionIndex(lines, i);
    if (fnIndex < 0) {
      out.push({ file, line: i + 1, rule: 'R3', detail: `第 ${i + 1} 行的 send() 不在具名函数作用域内（无法证明 close 拒结作用于其 pending 表）` });
      continue;
    }
    const scope = indentedBody(lines, fnIndex).map((k) => lines[k]).join('\n');
    if (!/new Map\(\)/.test(scope) || !/pending/.test(scope)) {
      out.push({ file, line: i + 1, rule: 'R3', detail: `第 ${i + 1} 行的 send() 所属作用域（第 ${fnIndex + 1} 行）没有 pending Map` });
      continue;
    }
    const closeIdx = /addEventListener\(\s*['"]close['"]/.exec(scope)?.index ?? -1;
    if (closeIdx < 0) {
      out.push({ file, line: i + 1, rule: 'R3', detail: `第 ${i + 1} 行的 send() 所属作用域的 socket close 未拒结 pending（F-01 的根因之一）` });
      continue;
    }
    const end = scope.indexOf('});', closeIdx);
    const handler = scope.slice(closeIdx, end > closeIdx ? end + 3 : closeIdx + 300);
    if (!/pending/.test(handler) || !/reject\(/.test(handler)) {
      out.push({
        file,
        line: i + 1,
        rule: 'R3',
        detail: `第 ${i + 1} 行的 send() 所属作用域的 close 监听未拒结**本作用域的 pending**（拒结无关对象不算）`,
      });
    }
  }

  return out;
}

function auditRoot(root: string, files: readonly string[]): Violation[] {
  const out: Violation[] = [];
  for (const file of files) {
    const path = resolve(root, file);
    let source: string;
    try {
      source = readFileSync(path, 'utf8');
    } catch (err) {
      out.push({ file, line: 0, rule: 'R2', detail: `无法读取（${err instanceof Error ? err.message : String(err)}）` });
      continue;
    }
    out.push(...auditGateSource(file, source));
  }
  return out;
}

/** Audit every gate the root's directories declare (N-12: the set is scanned). */
function auditDiscovered(root: string): Violation[] {
  return auditRoot(root, discoverGateFiles(root));
}

const fmt = (vs: Violation[]) => vs.map((v) => `  ${v.file}:${v.line} [${v.rule}] ${v.detail}`).join('\n');

// ── 0. the audited set is DERIVED from the filesystem (N-12) ─────────────────
test('元门禁：受审集合由目录扫描推导（新门禁自动纳入；已知门禁改名/删除必须 FAIL）', () => {
  for (const root of ROOTS) {
    const discovered = discoverGateFiles(root);
    assert.ok(discovered.length > 0, `目录扫描不得为空 @ ${root}（否则受审集合是空转）`);
    // The set may grow (a new gate is auto-included) but never shrink: every known
    // gate/driver must still be found by the scan.
    for (const file of EXPECTED_AUDITED_FILES) {
      assert.ok(
        discovered.includes(file),
        `${file} 未被目录扫描纳入 —— 门禁被改名/删除时本元门禁必须失败（集合不得静默收缩）：实际 ${discovered.join(', ')}`,
      );
    }
    for (const file of discovered) {
      assert.ok(existsSync(resolve(root, file)), `${file} 不存在（目录扫描给出了幽灵条目）`);
    }
    for (const file of NON_GATE_FILES) {
      assert.ok(!discovered.includes(file), `${file} 是纯口径模块（无门禁体），不得被误纳入受审集合`);
    }
  }
  assert.equal(CHROMIUM_GATES.length, 9, 'Chromium 门禁必须恰好 9 个（journey/insight/binding/l0/l1/l2/density/hardening/e2e；v3-3 新增 l2）');
});

// ── 0b. N-12's own reverse proof: a fresh gate file is auto-audited ──────────
test('元门禁反证：目录中新增一个「有失败计数、无退出码」的门禁 ⇒ 自动纳入且必须报红', () => {
  const tmp = mkdtempSync(resolve(tmpdir(), 'sdc-gates-new-'));
  for (const file of AUDITED_FILES) {
    const dst = resolve(tmp, file);
    mkdirSync(dirname(dst), { recursive: true });
    copyFileSync(resolve(PKG, file), dst);
  }
  // A ninth gate that nobody registered: it is discovered by the marker scan and
  // must therefore be audited (and fail — it records failures with no exit path).
  writeFileSync(
    resolve(tmp, 'test/ui/zzz-ninth-gate.mjs'),
    ['const failures = [];', 'console.log(`zzz FAILED (${failures.length}):`);', 'failures.push("x");', ''].join('\n'),
    'utf8',
  );
  const discovered = discoverGateFiles(tmp);
  assert.ok(discovered.includes('test/ui/zzz-ninth-gate.mjs'), `新门禁未被自动纳入：${discovered.join(', ')}`);
  const violations = auditDiscovered(tmp);
  assert.ok(
    violations.some((v) => v.rule === 'R2' && v.file === 'test/ui/zzz-ninth-gate.mjs'),
    `自动纳入的新门禁必须被审计（R2）：\n${fmt(violations)}`,
  );
  assert.deepEqual(auditDiscovered(PKG), [], '真实根在扫描扩展试验后仍必须干净（本测试不改仓库文件）');
});

// ── 1. the real gates pass the audit ────────────────────────────────────────
test('元门禁 R1a/R1b/R2/R3：真实门禁脚本全部通过（失败路径有界、失败计数耦合退出码、CDP send 有界）', () => {
  // `SDC_GATES_ROOT` is the meta-gate's own reverse-proof seam: pointing it at a
  // copy that carries a defect shape must turn THIS test red (non-zero exit).
  for (const root of ROOTS) {
    const violations = auditDiscovered(root);
    assert.deepEqual(violations, [], `门禁自身完整性缺陷 @ ${root}：\n${fmt(violations)}`);
  }
});

// ── 2. falsifiability: the detector must fire on the historical F-01 shape ──
test('元门禁反证（合成夹具）：F-01 历史形态（await 挡在退出码之前）必须被判 R1a', () => {
  const bad = [
    'async function main() {',
    '  if (failures.length) {',
    "    console.error(`gate FAILED (${failures.length}):`);",
    "    await dumpDiagnostics('main: assertions failed');",
    '    process.exit(1);',
    '  }',
    '}',
  ].join('\n');
  const r1a = auditGateSource('synthetic-bad.mjs', bad).filter((v) => v.rule === 'R1a');
  assert.equal(r1a.length, 1, `历史形态必须恰好命中 1 条 R1a，实际 ${r1a.length}：\n${fmt(r1a)}`);

  const good = [
    'async function dumpDiagnostics(reason) {',
    '  const __hardStop = setTimeout(() => { process.exit(1); }, 15_000);',
    '  try {',
    '    await capture(reason);',
    '  } catch (err) {',
    '    console.error(err);',
    '  } finally {',
    '    clearTimeout(__hardStop);',
    '  }',
    '}',
    'async function main() {',
    '  if (failures.length) {',
    "    console.error(`gate FAILED (${failures.length}):`);",
    '    process.exitCode = 1;',
    "    await dumpDiagnostics('main: assertions failed');",
    '    process.exit(1);',
    '  }',
    '}',
  ].join('\n');
  const goodViolations = auditGateSource('synthetic-good.mjs', good);
  assert.deepEqual(goodViolations, [], `已防御形态不得误报：\n${fmt(goodViolations)}`);

  // ... and the "exit code fixed but the await is unbounded" shape must trip R1b.
  const badR1b = [
    'async function dumpDiagnostics(reason) {',
    '  console.error(reason);',
    '}',
    'async function main() {',
    '  if (failures.length) {',
    '    process.exitCode = 1;',
    "    await dumpDiagnostics('main: assertions failed');",
    '    process.exit(1);',
    '  }',
    '}',
  ].join('\n');
  const r1b = auditGateSource('synthetic-unbounded.mjs', badR1b).filter((v) => v.rule === 'R1b');
  assert.equal(r1b.length, 1, `依赖「退出码已定死」但没有硬上限的 await 必须命中 R1b：\n${fmt(r1b)}`);
});

// ── 2b. N-01/N-02: the two demonstrated blind spots must now be caught ──────
test('元门禁反证（合成夹具）：N-01 中间语句绕过 / N-02 注释满足有界性 必须被判红', () => {
  // N-01 — the *exact* shape validate drove green: no `process.exitCode`, a plain
  // `console.error` sits between the await and the exit, and the callee lost its
  // hard stop. The block scan (not the one-line lookback) must catch the await.
  const n01 = [
    'async function dumpDiagnostics(reason) {',
    '  console.error(reason);',
    '}',
    'async function main() {',
    '  if (failures.length) {',
    "    console.error(`gate FAILED (${failures.length}):`);",
    "    await dumpDiagnostics('main: assertions failed');",
    "    console.error('（诊断返回）');",
    '    process.exit(1);',
    '  }',
    '}',
  ].join('\n');
  const n01r1a = auditGateSource('synthetic-n01.mjs', n01).filter((v) => v.rule === 'R1a');
  assert.equal(n01r1a.length, 1, `N-01 形态必须命中 1 条 R1a（块级扫描），实际 ${n01r1a.length}：\n${fmt(n01r1a)}`);

  // N-02 — the real hard stop is gone; only a *comment* still spells it out. Comment
  // stripping must leave nothing for `calleeIsSelfBounding` to find.
  const n02 = [
    'async function dumpDiagnostics(reason) {',
    '  // const __hardStop = setTimeout(() => { process.exit(1); }, 15_000);',
    '  console.error(reason);',
    '}',
    'async function main() {',
    '  if (failures.length) {',
    '    process.exitCode = 1;',
    "    await dumpDiagnostics('main: assertions failed');",
    '    process.exit(1);',
    '  }',
    '}',
  ].join('\n');
  const n02r1b = auditGateSource('synthetic-n02.mjs', n02).filter((v) => v.rule === 'R1b');
  assert.equal(n02r1b.length, 1, `N-02 形态（注释充当硬上限）必须命中 1 条 R1b，实际 ${n02r1b.length}：\n${fmt(n02r1b)}`);
});

test('元门禁反证（合成夹具）：失败计数无退出码 / 无界 CDP send 必须被判 R2 / R3', () => {
  const noExit = [
    "console.error(`gate FAILED (2):`);",
    'failures.push("x");',
  ].join('\n');
  assert.equal(
    auditGateSource('synthetic-noexit.mjs', noExit).filter((v) => v.rule === 'R2').length,
    1,
    '有失败计数而无退出码路径必须命中 R2',
  );

  const unguardedSend = [
    'async function connectCdp(url) {',
    '  const ws = new WebSocket(url);',
    '  const pending = new Map();',
    '  return {',
    '    send(method, params = {}) {',
    '      return new Promise((res, rej) => {',
    '        const id = 1;',
    '        pending.set(id, { resolve: res, reject: rej });',
    '        ws.send(JSON.stringify({ id, method, params }));',
    '      });',
    '    },',
    '  };',
    '}',
  ].join('\n');
  const r3 = auditGateSource('synthetic-send.mjs', unguardedSend).filter((v) => v.rule === 'R3');
  assert.equal(r3.length, 3, `无界 send 必须命中 R3×3（readyState / setTimeout / close 拒结），实际 ${r3.length}`);
});

// ── 2c. N-03: EVERY send() is checked, and `close` is scoped to its own pending ─
test('元门禁反证（合成夹具）：N-03 第二处无界 send / 拒结无关对象 必须被判红', () => {
  const secondUnbounded = [
    'async function connectCdp(url) {',
    '  const pending = new Map();',
    '  ws.addEventListener("close", () => { for (const [, p] of pending) p.reject(new Error("closed")); });',
    '  return {',
    '    send(method, params = {}) {',
    '      return new Promise((res, rej) => {',
    '        if (ws.readyState !== 1) { rej(new Error("closed")); return; }',
    '        pending.set(1, { resolve: res, reject: rej });',
    '        setTimeout(() => {}, 1);',
    '        ws.send(JSON.stringify({ id: 1, method, params }));',
    '      });',
    '    },',
    '  };',
    '}',
  ].join('\n');
  assert.deepEqual(
    auditGateSource('synthetic-first-bounded.mjs', secondUnbounded).filter((v) => v.rule === 'R3'),
    [],
    '第一处 send() 有界时不得误报',
  );
  const appended = `${secondUnbounded}\nfunction decoyClient(url) {\n  const pending = new Map();\n  return {\n    send(method, params = {}) {\n      return new Promise((res, rej) => { pending.set(1, { resolve: res, reject: rej }); });\n    },\n  };\n}\n`;
  const second = auditGateSource('synthetic-second.mjs', appended).filter((v) => v.rule === 'R3');
  assert.equal(second.length, 3, `第二处无界 send 必须被逐处检查（3 条：readyState/setTimeout/close），实际 ${second.length}：\n${fmt(second)}`);

  const unrelatedClose = [
    'async function connectCdp(url) {',
    '  const pending = new Map();',
    '  const other = { reject() {} };',
    '  other.addEventListener("close", () => { other.reject(); });',
    '  return {',
    '    send(method, params = {}) {',
    '      return new Promise((res, rej) => {',
    '        if (ws.readyState !== 1) { rej(new Error("closed")); return; }',
    '        pending.set(1, { resolve: res, reject: rej });',
    '        setTimeout(() => {}, 1);',
    '        ws.send(JSON.stringify({ id: 1, method, params }));',
    '      });',
    '    },',
    '  };',
    '}',
  ].join('\n');
  const unrelated = auditGateSource('synthetic-unrelated-close.mjs', unrelatedClose).filter((v) => v.rule === 'R3');
  assert.equal(unrelated.length, 1, `拒结无关对象的 close 必须被判红（且只有 close 一条），实际 ${unrelated.length}：\n${fmt(unrelated)}`);
});

// ── 3. the meta-gate itself must be able to fail: injected copies ───────────
/** Copy every discovered gate into a temp root (the injection never touches the repo). */
function injectedCopyRoot(): string {
  const tmp = mkdtempSync(resolve(tmpdir(), 'sdc-gates-'));
  for (const file of AUDITED_FILES) {
    const dst = resolve(tmp, file);
    mkdirSync(dirname(dst), { recursive: true });
    copyFileSync(resolve(PKG, file), dst);
  }
  return tmp;
}

/** Inject ordered `[from, to]` pairs into a copied gate and re-audit the copy. */
function auditInjected(file: string, edits: readonly [string, string][]): Violation[] {
  const tmp = injectedCopyRoot();
  const victim = resolve(tmp, file);
  let text = readFileSync(victim, 'utf8');
  for (const [from, to] of edits) {
    assert.ok(text.includes(from), `注入锚点不存在于 ${file}：${from}`);
    text = text.replace(from, to);
  }
  writeFileSync(victim, text, 'utf8');
  return auditRoot(tmp, discoverGateFiles(tmp));
}

test('元门禁反证（真实脚本副本注入）：F-01 / N-01 / N-02 / R2 形态 ⇒ 审计必须报红；真实根必须干净', () => {
  const f01 = auditInjected('test/ui/binding.mjs', [
    ['    process.exitCode = 1;\n    // T4:', '    await sleep(1);\n    // T4:'],
  ]);
  assert.ok(f01.some((v) => v.rule === 'R1a' && v.file === 'test/ui/binding.mjs'), `F-01 注入副本必须被判 R1a：\n${fmt(f01)}`);

  // N-01: drop the exit-code fix and put a plain statement between await and exit.
  const n01 = auditInjected('test/ui/binding.mjs', [
    ['    process.exitCode = 1;\n    // T4:', '    // T4:'],
    ["    await dumpDiagnostics('main: assertions failed');\n    process.exit(1);", "    await dumpDiagnostics('main: assertions failed');\n    console.error('（诊断返回）');\n    process.exit(1);"],
  ]);
  assert.ok(n01.some((v) => v.rule === 'R1a' && v.file === 'test/ui/binding.mjs'), `N-01 注入副本必须被判 R1a（块级扫描）：\n${fmt(n01)}`);

  // N-02: the hard stop survives only as a comment.
  const n02 = auditInjected('test/ui/binding.mjs', [
    [
      '  const __hardStop = setTimeout(() => {\n    console.error(\'✖ binding 诊断超时（15s 硬上限）→ 立即以失败退出（退出码已定）\');\n    process.exit(1);\n  }, 15_000);',
      '  // const __hardStop = setTimeout(() => { process.exit(1); }, 15_000);',
    ],
  ]);
  assert.ok(n02.some((v) => v.rule === 'R1b' && v.file === 'test/ui/binding.mjs'), `N-02 注入副本必须被判 R1b：\n${fmt(n02)}`);

  // R3 (validate caseB): an existing client loses its round-trip timeout.
  const r3 = auditInjected('test/ui/_v3-helpers.mjs', [['        setTimeout(() => {\n', '        void (() => {\n']]);
  assert.ok(r3.some((v) => v.rule === 'R3' && v.file === 'test/ui/_v3-helpers.mjs'), `R3 注入副本必须被判 R3：\n${fmt(r3)}`);

  // R2 (validate caseC): a gate records failures but loses every exit path
  // (`finish()` + `process.exit(1)` both gone ⇒ failure count no longer couples to
  // the exit code).
  const r2 = auditInjected('test/ui/l0.mjs', [
    ["  finish('L0 运行时门禁');", "  console.log('L0 done');"],
    ['  process.exit(1);', '  return;'],
  ]);
  assert.ok(r2.some((v) => v.rule === 'R2' && v.file === 'test/ui/l0.mjs'), `R2 注入副本必须被判 R2：\n${fmt(r2)}`);

  assert.deepEqual(auditDiscovered(PKG), [], '真实根在注入实验后仍必须干净（本测试不改仓库文件）');
});

// ── 4. honest registration of the coverage limit ────────────────────────────
test('元门禁：动态证伪覆盖如实登记（哪些门禁只有静态覆盖）', () => {
  // The claim itself is checkable: the set of statically-covered-only gates must be
  // a subset of the audited gates, and must not silently include the two gates that
  // *do* have a dynamic red-proof.
  for (const file of STATIC_ONLY_GATES) {
    assert.ok((AUDITED_FILES as readonly string[]).includes(file), `${file} 不在受审集合内`);
  }
  assert.ok(!(STATIC_ONLY_GATES as readonly string[]).includes('test/ui/binding.mjs'), 'binding.mjs 有 F-01 动态反证，不得登记为「仅静态」');
  assert.ok(!(STATIC_ONLY_GATES as readonly string[]).includes('test/ui/l1.mjs'), 'l1.mjs 有 RP-L1-A~H/C2 动态反证，不得登记为「仅静态」');
  console.log(
    `  ℹ 动态证伪覆盖：binding.mjs（F-01 反证）+ l1.mjs（RP-L1-A~H/C2）；仅静态覆盖（如实登记）：${STATIC_ONLY_GATES.join(', ')}`,
  );
});
