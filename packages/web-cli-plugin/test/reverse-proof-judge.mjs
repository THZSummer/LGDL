// @ts-check
/**
 * v3-3 fix round (2026-09-16) — **the reverse-proof validity judge** (review F-01).
 *
 * ── Why this module exists ──────────────────────────────────────────────────
 *
 * Review R1 found **F-01**: the `RP-V33-03`「delete one assertion ⇒ the ledger floor
 * FAILS」reverse proof was recorded as valid, but its FAIL segment came from a
 * *broken invocation* (`node --test <test> --files-override <copy>`): the trailing
 * positional argument was executed by node as an extra test file, which died with
 * `ERR_MODULE_NOT_FOUND: _v3-helpers.mjs`, and the run exited 1 **for that reason** —
 * the `--files-override` judgement never even ran (the log printed the *real* file's
 * `68 ≥ 68`). A perturbation that is red *because the harness is broken* proves
 * nothing about the assertion it claims to falsify: it is "红色因为出错" (red-because-
 * wrong), not "红色因为该红".
 *
 * The class of defect must be unable to come back, so every reverse proof must now
 * declare an **`expectFailPattern`** — the text its FAIL segment must actually
 * contain — and the run is judged by this module:
 *
 *   1. **non-zero exit** — a green run is not a reverse proof;
 *   2. **the expected failure text must be present** — matched *and* reported;
 *   3. **the matched evidence may not be a launch/loading error** — a line carrying
 *      `ERR_MODULE_NOT_FOUND` / `Cannot find module` / `SyntaxError` / `EADDRINUSE`
 *      … means "the harness never reached the judgement", so the red is invalid **even
 *      if the declared pattern would match some other line of the same output** (this
 *      is rule 4's job: the historical shape is reproduced as a *negative control*
 *      and must be judged INVALID — see `--selftest`).
 *
 * A reverse proof whose failure text is genuinely environment-dependent must be
 * registered as an **exception with a reason** instead of being silently allowed —
 * see `docs/v3-supersession-ledger.json#v3ReverseProofExpectations`.
 *
 * ── Closeout round (2026-09-16, validate R1 N-01/N-02/N-03) ──────────────────
 *
 * Validate's adversarial harness (`attack-judge.mjs`, 14 probes) bypassed the judge
 * in 9 of 14 shapes, none of which the round-1 evidence had actually exploited. Two
 * of them are *the same* defect this module exists to prevent, in a neighbouring
 * domain, so the judge is hardened with **three** independent criteria:
 *
 *   a. **the matched line must itself be a failure line** (N-01) — a passing `✔`
 *      line, an `ℹ` echo line, or the note line *under* a `✖` no longer counts,
 *      even when a *different* assertion really failed (the shape is reproducible:
 *      `test/ui/l2.mjs`'s `check()` prints the title on passing lines too, and the
 *      declared `expectFailPattern` *is* the title, so "injection missed the target
 *      while another test went red" used to be judged valid);
 *   b. **the launch/environment marker table is expanded + case-folded** (N-02) —
 *      Chromium/CDP death (`CDP socket not open`, `Failed to launch`), connect/port
 *      errors (`ECONNREFUSED` / `EACCES` / `EADDRINUSE` …) and resource exhaustion
 *      (`FATAL ERROR`, `heap out of memory`) are exactly v3-2 F-01's shape in
 *      another failure domain, and a lower-cased marker is still the same marker;
 *   c. **the run must have completed normally** — the FAIL segment must carry the
 *      gate's own completion summary (`… passed / N failed`, `ℹ fail N`, …), so a
 *      process that died mid-way cannot masquerade as an assertion failure.
 *
 * Every criterion ships with its **negative control** in `--selftest` (the shapes
 * validate used: ATK-02/03/06/08/09/10/12 + the missing-completion-marker shape); a
 * judge that cannot fail is not a judge. `--list-cases` exposes the inventory so the
 * meta-gate checks the *list* instead of counting declarations in the source text.
 *
 * Usage:
 *   import { judgeReverseProof } from '../reverse-proof-judge.mjs';
 *   node test/reverse-proof-judge.mjs --selftest     # the judge's own reverse proof
 *   node test/reverse-proof-judge.mjs --list-cases   # the selftest inventory (JSON)
 */
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

/**
 * `--selftest` / `--list-cases` are **entry-point** modes. Without this guard the
 * blocks below would fire on `import` too (the importing harness would inherit the
 * flag through `process.argv` and this module would print its own inventory and exit).
 */
const IS_ENTRY = process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

/** Markers that a *test-level* failure happened (not merely a non-zero exit). */
export const FAILURE_MARKERS = ['✖', 'not ok', 'AssertionError', 'FAILED ('];
/**
 * Markers that the process died **before/while loading the harness, launching the
 * browser, talking to CDP, or allocating memory** — i.e. the red has an explanation
 * other than "the assertion this reverse proof targets fired".
 *
 * Compared **case-insensitively**: validate's ATK-06 showed that a lower-cased
 * marker (`err_module_not_found`) used to walk straight through a case-sensitive
 * `includes()`.
 */
export const LAUNCH_ERROR_MARKERS = [
  // ── module loading / resolution (the original F-01 shape) ──────────────────
  'ERR_MODULE_NOT_FOUND',
  'Cannot find module',
  'MODULE_NOT_FOUND',
  'ERR_UNKNOWN_FILE_EXTENSION',
  'ERR_INVALID_URL',
  'ERR_DLOPEN_FAILED',
  'ERR_REQUIRE_ESM',
  'No such file or directory',
  'SyntaxError',
  'Syntax error',
  // ── process / port / permission ────────────────────────────────────────────
  'EADDRINUSE',
  'EACCES',
  'ECONNREFUSED',
  'ECONNRESET',
  'ETIMEDOUT',
  'EAI_AGAIN',
  // ── resource exhaustion ────────────────────────────────────────────────────
  'FATAL ERROR',
  'heap out of memory',
  'Reached heap limit',
  'Allocation failed',
  'JavaScript heap out of memory',
  // ── browser / CDP death (v3-2 F-01's shape, other failure domain) ──────────
  'CDP socket not open',
  'socket not open',
  'Failed to launch chromium',
  'Failed to launch',
  'browser has disconnected',
  'Target closed',
  'Session closed',
  'frame was detached',
  'Protocol error',
  'net::ERR_',
];

/**
 * Markers that the gate **ran to the end** and reported its own verdict. A FAIL
 * segment without one means the process was cut short — which is a *different*
 * statement from "this assertion failed" (criterion c).
 */
export const COMPLETION_MARKERS = [
  /passed \/ \d+ failed/, // test/ui/_v3-helpers.mjs#finish → `▶ …: N passed / M failed`
  /fail \d+/, // node:test summary (`ℹ tests N / pass M / fail K`)
  /FAILED \(\d+\)/, // build-round scripts → `gate FAILED (3):`
  /✖ .*FAIL/, // gate's own failure banner
];

/** @param {string | RegExp} pattern */
export function toRegExp(pattern) {
  if (pattern instanceof RegExp) return pattern;
  // A plain string is matched as a *literal* (escaped): the declared evidence is the
  // exact failure sentence, not a loose pattern.
  return new RegExp(String(pattern).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
}

/** Case-folded marker scan (N-02 ②: a lower-cased marker is still the same marker). */
/**
 * Any marker occurrence **on one line** — no exemption. Used for the *matched* line:
 * if the text this reverse proof claims as evidence is itself a launch error, the red
 * is explained by the launch error (ATK-01), regardless of how it is indented.
 *
 * @param {string} line @returns {string | null}
 */
export function lineLaunchErrorKind(line) {
  const folded = line.toLowerCase();
  for (const marker of LAUNCH_ERROR_MARKERS) if (folded.includes(marker.toLowerCase())) return marker;
  return null;
}

/**
 * Lines the **runtime itself** prints when it dies — a stack frame, a `throw`, a node
 * internal path, or an `Error:`/`FATAL ERROR` report. These stay in scope for the
 * whole-output scan even when indented (node indents `throw` frames by 4).
 */
const RUNTIME_REPORT_RE = /^\s*(?:throw new |at |node:internal\/|Error[:\s]|TypeError:|ReferenceError:|RangeError:|FATAL ERROR)/i;

/**
 * Markers that can explain the red **for the whole output**.
 *
 * Quoted mentions are not launch errors: a report block legitimately *names* the
 * markers (the judge's own verdicts do exactly that, and the meta-gate embeds them),
 * so an indented line that is **not** a runtime report line is treated as quoted
 * diagnostic text. The runtime's own crash/loading output (`Error [ERR_MODULE_NOT_FOUND]: …`,
 * `FATAL ERROR: …`, `Error: connect ECONNREFUSED …`, `    throw new ERR_…(`) is where
 * the F-01 shape and the ATK-06/08/09/10 fixtures live, and the *matched* line is
 * always checked unconditionally (`lineLaunchErrorKind`, ATK-01).
 *
 * @param {string} text @returns {string | null}
 */
export function launchErrorKind(text) {
  for (const line of text.split('\n')) {
    if (/^\s{2,}\S/.test(line) && !RUNTIME_REPORT_RE.test(line)) continue;
    const kind = lineLaunchErrorKind(line);
    if (kind !== null) return kind;
  }
  return null;
}

/** @param {string} line */
export function lineHasFailureMarker(line) {
  return FAILURE_MARKERS.some((marker) => line.includes(marker));
}

/**
 * The **first line that both matches the declared pattern and is itself a failure
 * line** (N-01). Matching a passing/echo/note line proves the text is *present*,
 * not that the assertion *failed*.
 *
 * @param {string} output @param {string | RegExp} pattern
 */
export function matchLine(output, pattern) {
  const re = toRegExp(pattern);
  for (const line of output.split('\n')) if (re.test(line) && lineHasFailureMarker(line)) return line.trim();
  return null;
}

/** Diagnostic twin of `matchLine`: a matching line *regardless* of failure marking. */
/** @param {string} output @param {string | RegExp} pattern */
export function matchLineAny(output, pattern) {
  const re = toRegExp(pattern);
  for (const line of output.split('\n')) if (re.test(line)) return line.trim();
  return null;
}

/** @param {string} output */
export function hasFailureMarker(output) {
  return FAILURE_MARKERS.some((marker) => output.includes(marker));
}

/** @param {string} output */
export function hasCompletionMarker(output) {
  return COMPLETION_MARKERS.some((re) => re.test(output));
}

/**
 * @typedef {{ id?: string, expectFailPattern: string | RegExp, exitCode: number, output: string }} ReverseProofRun
 * @typedef {{ valid: boolean, reason: string, matchedLine: string | null, launchError: string | null,
 *   nonFailureMatch?: string | null, completed?: boolean }} Judgement
 */

/**
 * Judge ONE reverse-proof FAIL segment.
 *
 * Three independent criteria (closeout round, N-01/N-02/ criterion c):
 *   1. non-zero exit;
 *   2. the declared text must be hit **on a failure line**;
 *   3. no launch/environment/memory/CDP error may explain the red (case-folded), and
 *      the gate must have printed its own completion summary.
 *
 * @param {ReverseProofRun} run
 * @returns {Judgement}
 */
export function judgeReverseProof(run) {
  const id = run.id ?? '<unnamed>';
  const output = run.output ?? '';
  const launchError = launchErrorKind(output);
  if (run.exitCode === 0) {
    return { valid: false, reason: `${id}: FAIL 段 exit=0（扰动没有让门禁变红 ⇒ 不是反证）`, matchedLine: null, launchError };
  }
  if (!hasFailureMarker(output)) {
    return {
      valid: false,
      reason: `${id}: FAIL 段没有任何失败标记（${FAILURE_MARKERS.join(' / ')}）—— 非零退出不足以证明是断言失败`,
      matchedLine: null,
      launchError,
    };
  }
  const matchedLine = matchLine(output, run.expectFailPattern);
  const anyLine = matchedLine === null ? matchLineAny(output, run.expectFailPattern) : null;
  if (matchedLine === null) {
    // N-01: "the text appeared somewhere" is not evidence. Distinguish "missing" from
    // "present but on a non-failure line" so the reason names the real defect.
    return {
      valid: false,
      reason:
        anyLine === null
          ? `${id}: FAIL 段未命中预期失败文本（${String(run.expectFailPattern)}）—— 因错而红/错红不算反证`
          : `${id}: 预期文本只出现在**非失败行**（${anyLine.slice(0, 100)}）—— ` +
            '「文本出现过」不等于「该断言失败过」（通过行 / ℹ 回显行 / ✖ 下一行的备注行都不算证据，N-01）',
      matchedLine: null,
      launchError,
      nonFailureMatch: anyLine,
    };
  }
  const lineError = lineLaunchErrorKind(matchedLine);
  if (lineError !== null) {
    return {
      valid: false,
      reason: `${id}: 命中的「失败文本」是启动/加载错误（${lineError}），不是断言失败 —— 因错而红`,
      matchedLine,
      launchError: lineError,
    };
  }
  if (launchError !== null) {
    return {
      valid: false,
      reason:
        `${id}: FAIL 段虽命中了预期文本（${matchedLine.slice(0, 80)}），但同一输出里存在启动/加载/环境错误（${launchError}）` +
        '—— 「红」可以被启动错误解释，反证无效（F-01 形态；N-02 起含 Chromium/CDP/端口/OOM 类，大小写折叠）',
      matchedLine,
      launchError,
    };
  }
  if (!hasCompletionMarker(output)) {
    // Criterion c: a process that was cut short did not *report* an assertion failure.
    return {
      valid: false,
      reason:
        `${id}: FAIL 段命中失败行（${matchedLine.slice(0, 80)}），但输出里没有门禁**正常走完**的完成标记` +
        '（`… passed / N failed` / `ℹ fail N` / `FAILED (N)`）—— 进程可能中途死掉，红不是断言判出来的',
      matchedLine,
      launchError,
      completed: false,
    };
  }
  return {
    valid: true,
    reason: `${id}: 因该红而红（命中失败行「${matchedLine.slice(0, 80)}」，exit=${run.exitCode}）`,
    matchedLine,
    launchError: null,
    completed: true,
  };
}

/**
 * Negation wrapper for the **negative controls**: a run that must be judged INVALID.
 *
 * @param {ReverseProofRun} run
 * @returns {Judgement}
 */
export function judgeReverseProofInvalid(run) {
  const verdict = judgeReverseProof(run);
  const id = run.id ?? '<unnamed>';
  if (verdict.valid) {
    return {
      valid: false,
      reason: `${id}: 负控必须被判**无效**，但判定器判它有效 —— 防呆本身失效（${verdict.reason}）`,
      matchedLine: verdict.matchedLine,
      launchError: verdict.launchError,
    };
  }
  return { valid: true, reason: `${id}: 负控如期被判无效（${verdict.reason}）`, matchedLine: verdict.matchedLine, launchError: verdict.launchError };
}

// ── selftest: the judge's own reverse proof (a judge that cannot fail is not a judge) ──

const HISTORICAL_F01_OUTPUT = [
  "node:internal/modules/esm/resolve:271",
  '    throw new ERR_MODULE_NOT_FOUND(',
  '',
  "Error [ERR_MODULE_NOT_FOUND]: Cannot find module '/tmp/rp/_v3-helpers.mjs' imported from /tmp/rp/l2-deleted-one-check.mjs",
  '',
  '✖ /tmp/rp/l2-deleted-one-check.mjs',
  '  ℹ 计数核对：… l2.mjs: 68 ≥ 68',
  'ℹ tests 12 / pass 11 / fail 1',
  'test failed',
].join('\n');

const VALID_OVERRIDE_FAIL_OUTPUT = [
  '✔ ledger: zeroDiffFiles 必须 0 行 diff（零注入 / 零权限 / 零依赖红线）',
  '✖ ledger: v3 新增门禁的运行时 check 计数不低于台账下界（--files-override 的判据）',
  '  AssertionError [ERR_ASSERTION]: --files-override /tmp/rp/l2.mjs: 运行时 check 计数 67 < 台账下界 68 —— 删除断言未登记',
  'ℹ tests 11 / pass 10 / fail 1',
].join('\n');

const GREEN_OUTPUT = ['✔ ledger: 计数只增不减', 'ℹ tests 11 / pass 11 / fail 0'].join('\n');

/**
 * ── The adversarial shapes validate R1 drove (`attack-judge.mjs`, ATK-01~ATK-14) ──
 * 9 of the 14 bypassed round 1 *in the judge's own domain*; the 7 below are those
 * exact shapes, kept as **permanent negative controls**. `expectValid: false` for
 * every one of them — if a future edit re-opens a hole, `--selftest` fails and the
 * meta-gate R4c turns red with it.
 */
const ATK_02_PASSING_LINE_MATCH = [
  '  ✔ ① `#view-host` 默认 hidden（视图宿主不是常驻 chrome）',
  '  ✖ ⑦ 树视图：9 动作白名单顺序不符（expected a,b got b,a）',
  '▶ v3 gate: 60 passed / 1 failed',
  '   ✖ ⑦ 树视图：9 动作白名单顺序不符（expected a,b got b,a）',
].join('\n');

const ATK_03_INFO_ECHO_MATCH = [
  '  ℹ 判据：① `#view-host` 默认 hidden（视图宿主不是常驻 chrome）',
  '  ✖ ⑨ audit 行含非白名单字段（注入的明文出现在 DOM）',
  '▶ v3 gate: 61 passed / 1 failed',
].join('\n');

const ATK_06_LOWERCASE_LAUNCH_MARKER = [
  '  ✖ ① `#view-host` 默认 hidden（视图宿主不是常驻 chrome）',
  'node:internal/modules/esm/resolve:271',
  '    throw new err_module_not_found(',
  '▶ v3 gate: 0 passed / 1 failed',
].join('\n');

const ATK_08_CHROMIUM_LAUNCH_ERROR = [
  '  ✖ ① `#view-host` 默认 hidden（视图宿主不是常驻 chrome）',
  'Error: connect ECONNREFUSED 127.0.0.1:9222',
  'Failed to launch chromium: spawn /usr/bin/chromium EACCES',
  '▶ v3 gate: 0 passed / 1 failed',
].join('\n');

const ATK_09_OOM = [
  '  ✖ ① `#view-host` 默认 hidden（视图宿主不是常驻 chrome）',
  'FATAL ERROR: Reached heap limit Allocation failed - JavaScript heap out of memory',
  '▶ v3 gate: 0 passed / 1 failed',
].join('\n');

const ATK_10_CDP_DEATH = [
  '  ✖ ① `#view-host` 默认 hidden（视图宿主不是常驻 chrome）',
  'Error: CDP socket not open (readyState=3) after 15000ms',
  '▶ v3 gate: 0 passed / 1 failed',
].join('\n');

const ATK_12_NOTE_LINE_AFTER_FAILURE = [
  '  ✖ ① 默认态不存在任何可见的 L2 视图（四视图可见数 = 0）',
  '      备注：`#view-host` 默认 hidden（视图宿主不是常驻 chrome）',
  '▶ v3 gate: 60 passed / 1 failed',
].join('\n');

/** Positive control: the declared text is hit **on** the failing assertion's line. */
const ATK_13_TRUE_POSITIVE_WITH_COLLATERAL = [
  '  ✔ ① `#view-host` 默认 hidden（视图宿主不是常驻 chrome）',
  '  ✖ ③ 真值（新增一个已授权站点）变化后计数**确实随之变化**（计数不动 = 硬编码 → FAIL） — 0 ≠ 2',
  '  ✖ ④ 返回复位失败（#log 未复原）',
  '▶ v3 gate: 60 passed / 2 failed',
  '   ✖ ③ 真值（新增一个已授权站点）变化后计数**确实随之变化**（计数不动 = 硬编码 → FAIL）',
  '   ✖ ④ 返回复位失败（#log 未复原）',
].join('\n');

/** Criterion c negative control: the expected `✖` line exists, the run never finished. */
const KILLED_MIDWAY = [
  '  ✔ ⑧ 零提权：catalogue / audit 视图零表单控件',
  '  ✖ ① `#view-host` 默认 hidden（视图宿主不是常驻 chrome）',
].join('\n');

/**
 * ATK-01 kept strict: when the **matched failure line itself** carries a launch-error
 * marker, the red is still explained by that error. This is the guard against the
 * "indented lines are quoted text" refinement above being abused to smuggle a launch
 * error into the evidence line.
 */
const ATK_01_INDENTED_MARKER_ON_FAILURE_LINE = [
  '  ✖ ⑨ 注入的明文出现在 DOM — AssertionError: ERR_MODULE_NOT_FOUND 不应出现在此',
  '▶ v3 gate: 0 passed / 1 failed',
].join('\n');

/** @type {Array<{ id: string, run: ReverseProofRun, expectValid: boolean }>} */
const SELFTEST = [
  {
    id: 'SELFTEST-1（F-01 历史形态 + 精确期望文本）',
    run: { id: 'RP-X', expectFailPattern: '67 < 台账下界 68', exitCode: 1, output: HISTORICAL_F01_OUTPUT },
    expectValid: false,
  },
  {
    id: 'SELFTEST-2（F-01 历史形态 + 宽松期望文本「test failed」—— 必须仍被判无效）',
    run: { id: 'RP-X', expectFailPattern: 'test failed', exitCode: 1, output: HISTORICAL_F01_OUTPUT },
    expectValid: false,
  },
  {
    id: 'SELFTEST-3（真实反证：override 判据命中 AssertionError 行）',
    run: { id: 'RP-Y', expectFailPattern: '67 < 台账下界 68', exitCode: 1, output: VALID_OVERRIDE_FAIL_OUTPUT },
    expectValid: true,
  },
  {
    id: 'SELFTEST-4（全绿输出 / exit=0 —— 不是反证）',
    run: { id: 'RP-Z', expectFailPattern: '67 < 台账下界 68', exitCode: 0, output: GREEN_OUTPUT },
    expectValid: false,
  },
  {
    id: 'SELFTEST-5（非零退出但无任何失败标记 —— 不足以证明断言失败）',
    run: { id: 'RP-W', expectFailPattern: 'boom', exitCode: 1, output: 'thinking...\nboom\n' },
    expectValid: false,
  },
  // ── N-01 negative controls: the match must sit on a failure line ─────────────
  {
    id: 'SELFTEST-6（ATK-02：预期文本命中 ✔ 通过行 + 另一条断言真失败 —— 必须判无效）',
    run: { id: 'RP-N01a', expectFailPattern: '默认 hidden（视图宿主不是常驻 chrome）', exitCode: 1, output: ATK_02_PASSING_LINE_MATCH },
    expectValid: false,
  },
  {
    id: 'SELFTEST-7（ATK-03：预期文本命中 ℹ 说明性回显行 —— 必须判无效）',
    run: { id: 'RP-N01b', expectFailPattern: '默认 hidden（视图宿主不是常驻 chrome）', exitCode: 1, output: ATK_03_INFO_ECHO_MATCH },
    expectValid: false,
  },
  {
    id: 'SELFTEST-8（ATK-12：预期文本命中 ✖ 下一行的备注行 —— 必须判无效）',
    run: { id: 'RP-N01c', expectFailPattern: '默认 hidden（视图宿主不是常驻 chrome）', exitCode: 1, output: ATK_12_NOTE_LINE_AFTER_FAILURE },
    expectValid: false,
  },
  // ── N-02 negative controls: expanded + case-folded marker table ──────────────
  {
    id: 'SELFTEST-9（ATK-06：启动错误标记的小写变体 err_module_not_found —— 必须判无效）',
    run: { id: 'RP-N02a', expectFailPattern: '默认 hidden（视图宿主不是常驻 chrome）', exitCode: 1, output: ATK_06_LOWERCASE_LAUNCH_MARKER },
    expectValid: false,
  },
  {
    id: 'SELFTEST-10（ATK-08：ECONNREFUSED / Failed to launch chromium: EACCES —— 必须判无效）',
    run: { id: 'RP-N02b', expectFailPattern: '默认 hidden（视图宿主不是常驻 chrome）', exitCode: 1, output: ATK_08_CHROMIUM_LAUNCH_ERROR },
    expectValid: false,
  },
  {
    id: 'SELFTEST-11（ATK-09：FATAL ERROR … out of memory（OOM 类）—— 必须判无效）',
    run: { id: 'RP-N02c', expectFailPattern: '默认 hidden（视图宿主不是常驻 chrome）', exitCode: 1, output: ATK_09_OOM },
    expectValid: false,
  },
  {
    id: 'SELFTEST-12（ATK-10：CDP socket not open（v3-2 F-01 的 CDP 死亡形态）—— 必须判无效）',
    run: { id: 'RP-N02d', expectFailPattern: '默认 hidden（视图宿主不是常驻 chrome）', exitCode: 1, output: ATK_10_CDP_DEATH },
    expectValid: false,
  },
  // ── positive control + criterion c negative control ─────────────────────────
  {
    id: 'SELFTEST-13（ATK-13 / 真阳性：命中失败行 + 有连带的第二条失败 —— 必须判有效）',
    run: { id: 'RP-OK', expectFailPattern: '计数**确实随之变化**', exitCode: 1, output: ATK_13_TRUE_POSITIVE_WITH_COLLATERAL },
    expectValid: true,
  },
  {
    id: 'SELFTEST-14（判据 c：命中失败行但门禁中途被杀、无完成标记 —— 必须判无效）',
    run: { id: 'RP-N02e', expectFailPattern: '默认 hidden（视图宿主不是常驻 chrome）', exitCode: 1, output: KILLED_MIDWAY },
    expectValid: false,
  },
  {
    id: 'SELFTEST-15（ATK-01：命中行**本身**是启动错误行（缩进引用不得豁免）—— 必须判无效）',
    run: { id: 'RP-N02f', expectFailPattern: 'ERR_MODULE_NOT_FOUND', exitCode: 1, output: ATK_01_INDENTED_MARKER_ON_FAILURE_LINE },
    expectValid: false,
  },
];

/** The inventory the meta-gate checks (`--list-cases`) — never a source-text count. */
export const SELFTEST_INVENTORY = SELFTEST.map((test) => ({
  id: test.id,
  expectValid: test.expectValid,
  expectFailPattern: String(test.run.expectFailPattern),
}));

if (IS_ENTRY && process.argv.includes('--list-cases')) {
  console.log(JSON.stringify(SELFTEST_INVENTORY, null, 2));
  process.exit(0);
}

if (IS_ENTRY && process.argv.includes('--selftest')) {
  let bad = 0;
  for (const test of SELFTEST) {
    const verdict = judgeReverseProof(test.run);
    const ok = verdict.valid === test.expectValid;
    if (!ok) bad += 1;
    console.log(`  ${ok ? '✔' : '✖'} ${test.id} → valid=${verdict.valid}（期望 ${test.expectValid}）`);
    console.log(`      ${verdict.reason}`);
  }
  const negative = SELFTEST.filter((t) => !t.expectValid).length;
  console.log(`\n▶ 判定器反证清单：${SELFTEST.length} 条（负控 ${negative} 条 / 真阳性 ${SELFTEST.length - negative} 条）`);
  console.log(`▶ 判据：① 命中行必须本身是失败行（N-01）② 启动/环境/内存/CDP 错误大小写折叠（N-02）③ 门禁必须打印完成标记`);
  console.log(`\n▶ reverse-proof-judge selftest: ${SELFTEST.length - bad} passed / ${bad} failed`);
  if (bad > 0) {
    console.error('✖ 判定器自身反证失败：因错而红未被判无效（防呆失效）');
    process.exit(1);
  }
  console.log('✔ 判定器自身反证 PASS：因错而红被判无效，真反证被判有效');
  process.exit(0);
}
