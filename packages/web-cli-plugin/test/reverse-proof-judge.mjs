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
 * Usage:
 *   import { judgeReverseProof } from '../reverse-proof-judge.mjs';
 *   node test/reverse-proof-judge.mjs --selftest     # the judge's own reverse proof
 */

/** Markers that a *test-level* failure happened (not merely a non-zero exit). */
export const FAILURE_MARKERS = ['✖', 'not ok', 'AssertionError', 'FAILED ('];

/** Markers that the process died before/while loading the harness itself. */
export const LAUNCH_ERROR_MARKERS = [
  'ERR_MODULE_NOT_FOUND',
  'Cannot find module',
  'MODULE_NOT_FOUND',
  'ERR_UNKNOWN_FILE_EXTENSION',
  'ERR_INVALID_URL',
  'ERR_DLOPEN_FAILED',
  'EADDRINUSE',
  'No such file or directory',
  'SyntaxError',
];

/** @param {string | RegExp} pattern */
export function toRegExp(pattern) {
  if (pattern instanceof RegExp) return pattern;
  // A plain string is matched as a *literal* (escaped): the declared evidence is the
  // exact failure sentence, not a loose pattern.
  return new RegExp(String(pattern).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
}

/** @param {string} text @returns {string | null} */
export function launchErrorKind(text) {
  for (const marker of LAUNCH_ERROR_MARKERS) if (text.includes(marker)) return marker;
  return null;
}

/** @param {string} output @param {string | RegExp} pattern */
export function matchLine(output, pattern) {
  const re = toRegExp(pattern);
  for (const line of output.split('\n')) if (re.test(line)) return line.trim();
  return null;
}

/** @param {string} output */
export function hasFailureMarker(output) {
  return FAILURE_MARKERS.some((marker) => output.includes(marker));
}

/**
 * @typedef {{ id?: string, expectFailPattern: string | RegExp, exitCode: number, output: string }} ReverseProofRun
 * @typedef {{ valid: boolean, reason: string, matchedLine: string | null, launchError: string | null }} Judgement
 */

/**
 * Judge ONE reverse-proof FAIL segment.
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
  if (matchedLine === null) {
    return {
      valid: false,
      reason: `${id}: FAIL 段未命中预期失败文本（${String(run.expectFailPattern)}）—— 因错而红/错红不算反证`,
      matchedLine: null,
      launchError,
    };
  }
  const lineError = launchErrorKind(matchedLine);
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
        `${id}: FAIL 段虽命中了预期文本（${matchedLine.slice(0, 80)}），但同一输出里存在启动/加载错误（${launchError}）` +
        '—— 「红」可以被启动错误解释，反证无效（F-01 形态）',
      matchedLine,
      launchError,
    };
  }
  return { valid: true, reason: `${id}: 因该红而红（命中「${matchedLine.slice(0, 80)}」，exit=${run.exitCode}）`, matchedLine, launchError: null };
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
    id: 'SELFTEST-3（真实反证：override 判据命中）',
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
];

if (process.argv.includes('--selftest')) {
  let bad = 0;
  for (const test of SELFTEST) {
    const verdict = judgeReverseProof(test.run);
    const ok = verdict.valid === test.expectValid;
    if (!ok) bad += 1;
    console.log(`  ${ok ? '✔' : '✖'} ${test.id} → valid=${verdict.valid}（期望 ${test.expectValid}）`);
    console.log(`      ${verdict.reason}`);
  }
  console.log(`\n▶ reverse-proof-judge selftest: ${SELFTEST.length - bad} passed / ${bad} failed`);
  if (bad > 0) {
    console.error('✖ 判定器自身反证失败：因错而红未被判无效（防呆失效）');
    process.exit(1);
  }
  console.log('✔ 判定器自身反证 PASS：因错而红被判无效，真反证被判有效');
  process.exit(0);
}
