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
 *   R1a  **exit-code primacy** — no standalone `await` statement may sit between a
 *        failure and the statement that fixes the exit code, unless that `await`
 *        is timeout-bounded (`Promise.race/all/allSettled`) or is *immediately*
 *        preceded by a non-zero `process.exitCode = N` assignment (the "the exit
 *        code is already fixed, a hung await can no longer make this green" case).
 *   R1b  **bounded diagnostics** — an `await` that relies on R1a's "exit code is
 *        already fixed" clause must call a **self-bounding callee**: a function
 *        defined in the same file whose body installs a `setTimeout(...)` that
 *        exits the process (a hard wall-clock escape). Otherwise a hang could still
 *        stall forever (exit code correct, but the run never finishes).
 *   R2   **failure → exit coupling** — a file that records failures (`FAILED (` /
 *        `failures.push(` / `✖`) must have an explicit exit path
 *        (`process.exit(1)` / `process.exitCode = N` / `finish()` from
 *        `./_v3-helpers.mjs`, whose own failure branch exits 1).
 *   R3   **bounded CDP sends** — every CDP `send()` implementation must carry a
 *        `readyState` guard **and** a `setTimeout` round-trip bound, and its socket
 *        must reject every pending request on `close` (that is precisely what made
 *        F-01 possible).
 *
 * ── Falsifiability (a gate that cannot fail is not a gate) ──────────────────
 *
 *  * **Synthetic fixtures** — hand-written bad/good sources prove each rule fires
 *    on the bad shape and stays silent on the good one (in-process).
 *  * **Injected copy** — a real copy of the gate scripts is written to a temp root,
 *    the historical defect shape (`await` before the exit) is injected into it, and
 *    the auditor must report it there while reporting nothing for the real root.
 *    The same root can be pointed at with `SDC_GATES_ROOT=<dir>`, which is how the
 *    fix round drove the meta-gate **red** out-of-process (see `build.md §10`).
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
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
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
 * lets the fix round point the *same* auditor at an injected copy (the meta-gate's
 * own reverse proof: injected copy ⇒ this test fails ⇒ exit non-zero).
 */
const ROOTS = (process.env.SDC_GATES_ROOT ?? PKG).split(':').filter((s) => s.length > 0);

/** The eight Chromium gate scripts (the user's list; `page-input.mjs` never existed). */
export const CHROMIUM_GATES = [
  'test/ui/journey.mjs',
  'test/ui/insight.mjs',
  'test/ui/binding.mjs',
  'test/ui/l0.mjs',
  'test/ui/l1.mjs',
  'test/ui/density.mjs',
  'test/ui/hardening.mjs',
  'test/e2e/fullchain.mjs',
] as const;

/**
 * Everything that carries a CDP client or a failure→exit path. The eight Chromium
 * gates + the L1 reverse driver (`l1-reverse.mjs`, which spawns the L1 gate and
 * judges its exit code) + the shared v3 CDP client (`_v3-helpers.mjs`, used by
 * l0/l1/density).
 */
export const AUDITED_FILES = [
  ...CHROMIUM_GATES,
  'test/ui/l1-reverse.mjs',
  'test/ui/_v3-helpers.mjs',
] as const;

/** Gates whose red-proof is static only (see the module doc's coverage limits). */
export const STATIC_ONLY_GATES = [
  'test/ui/journey.mjs',
  'test/ui/insight.mjs',
  'test/ui/l0.mjs',
  'test/ui/density.mjs',
  'test/ui/hardening.mjs',
  'test/e2e/fullchain.mjs',
] as const;

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

const isComment = (line: string): boolean => {
  const t = line.trim();
  return t.startsWith('//') || t.startsWith('*') || t.startsWith('/*');
};
const isBlank = (line: string): boolean => line.trim().length === 0;

/** Index of the nearest preceding substantive (non-blank, non-comment) line. */
function prevSubstantive(lines: string[], from: number): number {
  for (let i = from - 1; i >= 0; i -= 1) {
    if (isBlank(lines[i]) || isComment(lines[i])) continue;
    return i;
  }
  return -1;
}

/** `await foo(` → `foo`; `await Promise.race(` → `Promise.race`. */
function awaitedCallee(statement: string): string | null {
  const m = /^await\s+([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*)\s*\(/.exec(statement.trim());
  return m ? m[1] : null;
}

/** Does the callee's own definition install a hard `setTimeout(... process.exit ...)`? */
function calleeIsSelfBounding(source: string, callee: string): boolean {
  const name = callee.split('.')[0];
  const decl = source.search(new RegExp(`(?:async\\s+)?function\\s+${name}\\s*\\(`));
  if (decl < 0) return false;
  const body = source.slice(decl, decl + 4000);
  return /setTimeout\(\s*\(\)\s*=>\s*\{[\s\S]{0,240}?process\.exit\(/.test(body)
    || /setTimeout\([^)]{0,120}process\.exit\(/.test(body);
}

/**
 * The auditor. Pure function of `(file name, source text)` so the same rules can be
 * driven at the real files, at synthetic fixtures and at an injected temp copy.
 */
export function auditGateSource(file: string, source: string): Violation[] {
  const lines = source.split('\n');
  const out: Violation[] = [];

  // ── R1a: exit-code primacy ────────────────────────────────────────────────
  for (let i = 0; i < lines.length; i += 1) {
    if (isComment(lines[i])) continue;
    if (!EXIT_STATEMENT.test(lines[i])) continue;
    const j = prevSubstantive(lines, i);
    if (j < 0 || !STANDALONE_AWAIT.test(lines[j].trim())) continue;
    // `await Promise.race([...])` (or any explicitly bounded await) is fine ...
    const statement = lines.slice(j, i + 1).join('\n');
    if (BOUNDED_AWAIT.test(statement)) continue;
    // ... and so is an await that runs *after* the exit code is already fixed:
    // a hang can then no longer turn the failure green (it only delays it).
    const k = prevSubstantive(lines, j);
    const exitCodeFixed = k >= 0 && NONZERO_EXIT.test(lines[k]);
    if (exitCodeFixed) continue;
    out.push({
      file,
      line: i + 1,
      rule: 'R1a',
      detail: `第 ${j + 1} 行的独立 await 挡在退出码赋值之前且未加超时（前一行：${lines[k]?.trim() ?? '<无>'}）`,
    });
  }

  // ── R1b: the "exit code already fixed" escape must be a *bounded* await ───
  for (let i = 0; i < lines.length; i += 1) {
    if (isComment(lines[i])) continue;
    if (!STANDALONE_AWAIT.test(lines[i].trim())) continue;
    const k = prevSubstantive(lines, i);
    if (k < 0 || !NONZERO_EXIT.test(lines[k])) continue;
    // It relies on R1a's escape clause ⇒ the callee must self-terminate.
    const callee = awaitedCallee(lines[i]);
    if (!callee) continue;
    if (calleeIsSelfBounding(source, callee)) continue;
    out.push({
      file,
      line: i + 1,
      rule: 'R1b',
      detail: `第 ${i + 1} 行的 await ${callee}(...) 依赖「退出码已定死」，但 ${callee}() 自身没有 setTimeout 硬上限`,
    });
  }

  // ── R2: failure count ↔ exit code ────────────────────────────────────────
  if (FAILURE_MARKER.test(source)) {
    const hasExit =
      /process\.exit\s*\(\s*[1-9]/.test(source)
      || /process\.exitCode\s*=\s*[1-9]/.test(source)
      || /finish\(/.test(source);
    const usesHelper = /from\s+['"]\.\/_v3-helpers\.mjs['"]/.test(source);
    const helperOk = !/finish\(/.test(source) || usesHelper || file.endsWith('_v3-helpers.mjs');
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
    if (/finish\(/.test(source) && !file.endsWith('_v3-helpers.mjs')) {
      // The helper's own failure branch must really exit 1.
      const helperPath = resolve(PKG, 'test/ui/_v3-helpers.mjs');
      const helper = readFileSync(helperPath, 'utf8');
      if (!/if \(failures\.length\)[\s\S]{0,200}?process\.exit\(1\);/.test(helper)) {
        out.push({ file, line: 1, rule: 'R2', detail: 'finish() 的失败分支未同步 process.exit(1)' });
      }
    }
  }

  // ── R3: every CDP send() must be bounded + reject on close ───────────────
  if (/send\(method, params/.test(source)) {
    const at = source.indexOf('send(method, params');
    const body = source.slice(at, at + 1400);
    if (!/readyState/.test(body)) {
      out.push({ file, line: 1, rule: 'R3', detail: 'send() 缺 readyState 拒答（对 CLOSED socket 会静默挂死）' });
    }
    if (!/setTimeout\(/.test(body)) {
      out.push({ file, line: 1, rule: 'R3', detail: 'send() 缺 setTimeout 超时拒答' });
    }
    if (!/addEventListener\(\s*['"]close['"][\s\S]{0,240}?reject\(/.test(source)) {
      out.push({ file, line: 1, rule: 'R3', detail: 'socket close 未拒结 pending（F-01 的根因之一）' });
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

const fmt = (vs: Violation[]) => vs.map((v) => `  ${v.file}:${v.line} [${v.rule}] ${v.detail}`).join('\n');

// ── 0. the audited set itself must be complete (a rename may not shrink it) ──
test('元门禁：受审门禁集合完整（8 个 Chromium 门禁 + 反证驱动 + 共享 CDP 客户端）', () => {
  for (const root of ROOTS) {
    for (const file of AUDITED_FILES) {
      assert.ok(
        (() => {
          try {
            readFileSync(resolve(root, file), 'utf8');
            return true;
          } catch {
            return false;
          }
        })(),
        `${file} 不存在 —— 门禁被改名/删除时本元门禁必须失败（集合不得静默收缩）`,
      );
    }
  }
  assert.equal(CHROMIUM_GATES.length, 8, 'Chromium 门禁必须恰好 8 个（journey/insight/binding/l0/l1/density/hardening/e2e）');
  assert.ok(
    CHROMIUM_GATES.some((f) => f.endsWith('binding.mjs')) && CHROMIUM_GATES.some((f) => f.endsWith('l1.mjs')),
    'binding.mjs（F-01 现场）与 l1.mjs（本叶新门禁）都必须在受审集合内',
  );
});

// ── 1. the real gates pass the audit ────────────────────────────────────────
test('元门禁 R1a/R1b/R2/R3：真实门禁脚本全部通过（失败路径有界、失败计数耦合退出码、CDP send 有界）', () => {
  // `SDC_GATES_ROOT` is the meta-gate's own reverse-proof seam: pointing it at a
  // copy that carries the F-01 shape must turn THIS test red (non-zero exit).
  for (const root of ROOTS) {
    const violations = auditRoot(root, AUDITED_FILES);
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

// ── 3. the meta-gate itself must be able to fail: injected copy ─────────────
test('元门禁反证（真实脚本副本注入）：把 F-01 形态注入副本 ⇒ 审计必须报红；真实根必须干净', () => {
  const tmp = mkdtempSync(resolve(tmpdir(), 'sdc-gates-'));
  for (const file of AUDITED_FILES) {
    const dst = resolve(tmp, file);
    mkdirSync(dirname(dst), { recursive: true });
    copyFileSync(resolve(PKG, file), dst);
  }
  // The historical defect, injected into the *copy* (never into the repo):
  const victim = resolve(tmp, 'test/ui/binding.mjs');
  const text = readFileSync(victim, 'utf8').replace(
    '    process.exitCode = 1;\n    // T4:',
    "    await sleep(1);\n    // T4:",
  );
  writeFileSync(victim, text, 'utf8');

  const injected = auditRoot(tmp, AUDITED_FILES);
  assert.ok(
    injected.some((v) => v.rule === 'R1a' && v.file === 'test/ui/binding.mjs'),
    `注入副本必须被判 R1a：\n${fmt(injected)}`,
  );
  assert.deepEqual(auditRoot(PKG, AUDITED_FILES), [], '真实根在注入实验后仍必须干净（本测试不改仓库文件）');
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
