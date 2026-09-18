// @ts-check
/**
 * V3-3 fix round (2026-09-16) — **per-case reverse proofs for the L2 leaf**, with the
 * review's F-01 discipline: *every* reverse proof must be red **because the judgement
 * says so**, never because the harness itself blew up.
 *
 * Review R1 (F-01) found that `RP-V33-03`'s FAIL segment came from a broken invocation
 * (`node --test <test> --files-override <copy>`): node executed the trailing positional
 * argument as an extra test file, which died with `ERR_MODULE_NOT_FOUND`, and the exit
 * code 1 had nothing to do with the ledger floor the case claims to falsify. This
 * harness therefore:
 *
 *   1. runs each case in the **correct invocation form** (`node <test-file>
 *      --files-override <copy>` — the flag must reach `process.argv`), and asserts the
 *      override branch **really executed** (its `override ok (` line must be present);
 *   2. declares an **`expectFailPattern`** per case and judges the FAIL segment with
 *      `test/reverse-proof-judge.mjs` — a red without the expected text (or a red that
 *      a launch/loading error can explain) is **invalid** and fails this harness;
 *   3. keeps the historical wrong invocation as a **negative control**
 *      (`RP-V33-03-NEG`): it must be judged INVALID by the same judge — proving the
 *      anti-foolproof itself can fail;
 *   4. restores every perturbed artifact **byte-for-byte** (sha256) and re-runs the
 *      gate to prove the PASS segment.
 *
 * Injections land on the artifact the gate really reads (`dist/sidepanel.html`,
 * `dist/sidepanel.js`, `src/ui/sidepanel/l2/counts.ts` + a rebuild) — not on a copy
 * that proves itself.
 *
 * Usage: `npm run test:l2-reverse` / `node test/ui/l2-reverse.mjs [RP-V33-XX ...]`
 * Logs: `$L2_REVERSE_LOG_DIR` (default `/tmp/opencode/v3-gate-logs/v3-3-fix/rp`).
 */
import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { judgeReverseProof, judgeReverseProofInvalid } from '../reverse-proof-judge.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const LOG_DIR = process.env.L2_REVERSE_LOG_DIR ?? '/tmp/opencode/v3-gate-logs/v3-3-fix/rp';
const BACKUP_DIR = '/tmp/opencode/l2-reverse-backup';
mkdirSync(LOG_DIR, { recursive: true });
mkdirSync(BACKUP_DIR, { recursive: true });

const L2_GATE = resolve(ROOT, 'test/ui/l2.mjs');
const HTML = resolve(ROOT, 'dist/sidepanel.html');
const JS = resolve(ROOT, 'dist/sidepanel.js');
const COUNTS_TS = resolve(ROOT, 'src/ui/sidepanel/l2/counts.ts');
const SUPERSESSION = resolve(ROOT, 'dist-test/test/supersession-ledger.test.js');
const SIZE_BUDGET = resolve(ROOT, 'dist-test/test/size-budget.test.js');
const GATE_INTEGRITY = resolve(ROOT, 'dist-test/test/gate-integrity.test.js');
/**
 * The RP-V33-06 (N-09) victim: a **gate** file whose registered per-line judge is the
 * supersession ledger. The injected line must be an *existing* line that the ledger's
 * base (c2c0e0d) never saw — i.e. introduced by v3-1/v3-2 and still present — so that
 * removing it is invisible to the base-relative judge and can only be caught by the
 * new leaf-segment judgement (`leafBases`).
 */
const LEAF_LEDGER_VICTIM = resolve(ROOT, 'test/ui/l0.mjs');
const LEAF_LEDGER_VICTIM_LINE = '    // N must follow the real option list (change truth → change N)';
/**
 * The shared judge's own source — perturbed by the RP-V33-07/08/09 **self-proofs**
 * (one per hardening: failure-line anchoring, case-folded marker table, completion
 * marker). The meta-gate reads it from the worktree, so it is a restore target too.
 */
const JUDGE_MJS = resolve(ROOT, 'test/reverse-proof-judge.mjs');

const sha = (path) => createHash('sha256').update(readFileSync(path)).digest('hex');
const backupOf = (path) => resolve(BACKUP_DIR, `${path.split('/').pop()}.pristine`);

/**
 * @typedef {{ id: string, assertion: string, requirement: string, note: string,
 *   expectFailPattern: string | RegExp, expectAlsoPresent?: string[],
 *   negativeControl?: boolean, restoreRebuild?: boolean, leafSegment?: boolean,
 *   judgeRevert?: { label: string, from: string, to: string } }} Case
 */
/** @type {Case[]} */
const CASES = [
  {
    id: 'RP-V33-01',
    assertion: '① 四视图默认零占用（`#view-host` 默认 `hidden`）',
    requirement: 'FR-V3-045 / AC-V3-005 · NFR-V3-013（门禁必须能 FAIL）',
    expectFailPattern: '默认 hidden（视图宿主不是常驻 chrome）',
    note: '注入：`dist/sidepanel.html` 去掉 `#view-host` 的 `hidden` ⇒ 默认态驻留视图 ⇒ `test:l2` ① 必须红。',
  },
  {
    id: 'RP-V33-02',
    assertion: '③ 计数真值派生（改真值 → 计数必须随之变化；不变即硬编码）',
    requirement: 'FR-V3-046 / ADR-V3-026 · NFR-V3-013',
    expectFailPattern: '计数**确实随之变化**',
    restoreRebuild: true,
    note:
      '注入：`src/ui/sidepanel/l2/counts.ts#treeNodeCount` 直接返回常量 113 + `npm run build`（注入落在**真值源**上）；' +
      '还原源码（sha256 校验）后把 `dist` 逐字节还原 ⇒ 运行时 ③ 的「改真值后计数不动」断言必须红。',
  },
  {
    id: 'RP-V33-03',
    assertion: '取代台账 `v3GateFloors["test/ui/l2.mjs"]` 下界（删 5 条 `check(` ⇒ 台账必须红；v4-1 计数 72 / 下界 68）',
    requirement: 'AC-V3-011 / AC-V3-012 · NFR-V3-013（F-01 订正后的正确调用形态 = 形态 B）',
    expectFailPattern: '67 < 台账下界 68 —— 删除断言未登记',
    expectAlsoPresent: ['--files-override '],
    note:
      '注入：`test/ui/l2.mjs` 的**同 basename 副本**删掉 5 条 `check(`（72 → 67，低于下界 68）；**正确形态** = 直接执行测试文件（不带 `--test`）' +
      '`node dist-test/test/supersession-ledger.test.js --files-override <副本>` —— 判据真的走 override 分支（`override ok (` 必须出现），' +
      '且失败文本必须是「运行时 check 计数 67 < 台账下界 68 —— 删除断言未登记」。真文件未改。',
  },
  {
    id: 'RP-V33-03-NEG',
    assertion: '负控：F-01 的历史错误调用形态（`node --test <test> --files-override <副本>`）必须被判**无效**',
    requirement: 'NFR-V3-013 / 本轮防呆（expectFailPattern 的自身反证）',
    expectFailPattern: 'test failed',
    negativeControl: true,
    note:
      '负控：同一副本 + 历史形态 ⇒ FAIL 段的非零退出由 `ERR_MODULE_NOT_FOUND`（副本被 node 当额外测试文件执行）产生，' +
      '`--files-override` 判据**根本没跑**。判定器必须判它**无效**（若判有效，说明防呆失效 ⇒ 本 harness 自己红）。',
  },
  {
    id: 'RP-V33-04',
    assertion: '元门禁 R1a（失败块内第一条独立 await 前未定死退出码）',
    requirement: 'NFR-V3-013 · v3-2 F-01 的类别（门禁自身完整性）',
    // Closeout round (N-01): the round-1 pattern was `[R1a]`, which node:test prints on
    // a *continuation* line of the assertion message — i.e. NOT on a failure-marked
    // line. Now that the judge requires the hit to sit on a failure line (which is what
    // makes ATK-02/03/12 impossible), the declared text is the assertion's own header
    // (`AssertionError [ERR_ASSERTION]: 门禁自身完整性缺陷 @ …`), a strictly *more*
    // precise anchor that still proves the R1a detector fired.
    expectFailPattern: '门禁自身完整性缺陷',
    note: '注入：把 `test/ui/l2.mjs` 复制到注入根并加入 F-01 形态（失败块内 `await` 抢在退出码前），`SDC_GATES_ROOT` 指向它 ⇒ 元门禁必须红；真实根仍 9/9 PASS。',
  },
  {
    id: 'RP-V33-05',
    assertion: '体积守卫：产物 +1 B ⇒ 必须按真实产物重登记（登记值 ≠ 实测产物）',
    requirement: 'NFR-V3-005 / AC-V3-016 · ADR-V3-011',
    expectFailPattern: '必须按真实产物重登记',
    note:
      '注入：`dist/sidepanel.js` 追加 1 字节 ⇒ size 守卫（`test/size-budget.test.js` —— 该门禁的真读产物断言在此文件）必须红；' +
      '还原产物（sha256 逐字节）后必须 PASS。',
  },
  {
    id: 'RP-V33-06',
    assertion:
      '取代台账**叶段**判据（`leafBases=bf5773d`）：在 v3-3 叶起点之后删除一条未登记的既有行 ⇒ 台账必须红',
    requirement: 'AC-V3-011 / AC-V3-012 · 收口轮 N-09（base 相对判据的叶相对盲区）',
    expectFailPattern: '叶段（leafBase bf5773d）删除行未逐条命中台账',
    note:
      '注入：从 `test/ui/l0.mjs` 删除一条**既有**（非空白）行 —— 该行在 base(c2c0e0d)→HEAD 的判据里根本不是「删除行」' +
      '（它由 v3-1/v3-2 引入，v3-3 之前就在文件里），只在 `bf5773d` 叶段可见 ⇒ 旧判据完全看不到，新叶段判据必须红。' +
      '还原（sha256 逐字节）后台账必须 PASS。',
    leafSegment: true,
  },
  // ── N-01 / N-02 / 判据 c 的**自身反证**（收口轮）────────────────────────────
  // 「防呆必须能失败」：把判定器的每条加固逐条**回退**（只改判定器源码，不改夹具），
  // 元门禁 R4c（它实跑 `--selftest`）必须因此变红；还原后必须再次变绿。三条加固各一条。
  {
    id: 'RP-V33-07',
    assertion: 'N-01 加固自身反证：判定器回退「命中行必须本身是失败行」⇒ 元门禁必须红',
    requirement: 'NFR-V3-013 · validate R1 N-01（ATK-02/03/12 的判据）',
    expectFailPattern: '判定器 --selftest 未通过',
    judgeRevert: {
      label: 'matchLine 去掉 `&& lineHasFailureMarker(line)`（恢复 ATK-02/03/12 可绕过形态）',
      from: 'for (const line of output.split(\'\\n\')) if (re.test(line) && lineHasFailureMarker(line)) return line.trim();',
      to: 'for (const line of output.split(\'\\n\')) if (re.test(line)) return line.trim();',
    },
    note: '回退后 SELFTEST-6/7/8（ATK-02/03/12 负控）会被判为有效 ⇒ `--selftest` exit=1 ⇒ R4c 断言「--selftest 未通过」变红。',
  },
  {
    id: 'RP-V33-08',
    assertion: 'N-02 加固自身反证：判定器回退「大小写折叠」⇒ 元门禁必须红',
    requirement: 'NFR-V3-013 · validate R1 N-02（ATK-06 的判据）',
    expectFailPattern: '判定器 --selftest 未通过',
    judgeRevert: {
      label: 'lineLaunchErrorKind 恢复大小写敏感比对（恢复 ATK-06 可绕过形态）',
      from:
        '  const folded = line.toLowerCase();\n' +
        "  for (const marker of LAUNCH_ERROR_MARKERS) if (folded.includes(marker.toLowerCase())) return marker;",
      to: '  for (const marker of LAUNCH_ERROR_MARKERS) if (line.includes(marker)) return marker;',
    },
    note: '回退后 SELFTEST-9（小写 `err_module_not_found`）会被判为有效 ⇒ `--selftest` exit=1 ⇒ R4c 变红。',
  },
  {
    id: 'RP-V33-09',
    assertion: '判据 c 自身反证：判定器回退「门禁必须正常走完」⇒ 元门禁必须红',
    requirement: 'NFR-V3-013 · validate R1 N-02 ③（中途被杀不得冒充断言失败）',
    expectFailPattern: '判定器 --selftest 未通过',
    judgeRevert: {
      label: 'hasCompletionMarker 恒真（恢复「中途被杀也能冒充反证」形态）',
      from: '  return COMPLETION_MARKERS.some((re) => re.test(output));',
      to: '  return COMPLETION_MARKERS.some((re) => re.test(output)) || true;',
    },
    note: '回退后 SELFTEST-14（命中失败行但无完成标记）会被判为有效 ⇒ `--selftest` exit=1 ⇒ R4c 变红。',
  },
];

/**
 * Closeout round (2026-09-16, validate R1 N-03): `--list-cases` is the **authoritative
 * inventory** the meta-gate executes (id + declared failure text + negative-control
 * flag) — a source-text regex count could be satisfied by a comment or a string
 * literal, which is exactly how R4a used to be decoratable.
 */
// Entry-point guard: the inventory mode must not fire when this module is
// imported (the flag would leak in through `process.argv`).
const IS_ENTRY = process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (IS_ENTRY && process.argv.includes('--list-cases')) {
  console.log(
    JSON.stringify(
      CASES.map((c) => ({
        id: c.id,
        expectFailPattern: String(c.expectFailPattern),
        assertion: c.assertion,
        requirement: c.requirement,
        negativeControl: Boolean(c.negativeControl),
      })),
      null,
      2,
    ),
  );
  process.exit(0);
}

/** Run a command, capturing stdout+stderr and the exit code (never throws). */
function run(command, args, options = {}) {
  try {
    const out = execFileSync(command, args, {
      cwd: ROOT,
      encoding: 'utf8',
      maxBuffer: 128 * 1024 * 1024,
      env: { ...process.env, ...(options.env ?? {}) },
    });
    return { code: 0, out };
  } catch (err) {
    const e = /** @type {{ status?: number, stdout?: string, stderr?: string }} */ (err);
    return { code: e.status ?? 1, out: `${e.stdout ?? ''}${e.stderr ?? ''}` };
  }
}

/** Patch `from` → `to` requiring exactly `count` occurrences (byte-changing, checked). */
function patch(path, from, to, count = 1) {
  const text = readFileSync(path, 'utf8');
  const occurrences = text.split(from).length - 1;
  if (occurrences !== count) {
    throw new Error(`扰动锚点命中 ${occurrences} 次（期望 ${count}）：${JSON.stringify(String(from).slice(0, 60))}`);
  }
  writeFileSync(path, text.split(from).join(to), 'utf8');
}

const failures = [];
const rows = [];
const requested = process.argv.slice(2).filter((a) => a.startsWith('RP-V33-'));
const selected = requested.length > 0 ? CASES.filter((c) => requested.includes(c.id)) : CASES;

if (selected.length === 0) {
  console.error(`未匹配任何反证用例：${requested.join(', ')}`);
  process.exit(2);
}

// ── pristine state (byte-exact restore targets) ──────────────────────────────
// `LEAF_LEDGER_VICTIM` is included because RP-V33-06 perturbs a *gate source* (the
// supersession ledger's per-line judge reads it from the worktree), not a build
// artifact — it must be restored byte-for-byte like the rest.
const ARTIFACTS = [HTML, JS, COUNTS_TS, LEAF_LEDGER_VICTIM, JUDGE_MJS];
for (const path of ARTIFACTS) {
  if (!existsSync(path)) {
    console.error(`✖ 前置失败：${path} 不存在（先 npm run build / npm test 生成 dist 与 dist-test）`);
    process.exit(1);
  }
  copyFileSync(path, backupOf(path));
}
const pristine = Object.fromEntries(ARTIFACTS.map((p) => [p, { bytes: statSync(p).size, sha: sha(p) }]));
const restoreAll = () => {
  for (const path of ARTIFACTS) copyFileSync(backupOf(path), path);
};
const restoredExactly = () => ARTIFACTS.every((p) => sha(p) === pristine[p].sha);

console.log(`▶ 反证注入面（门禁真读的产物 + 真值源 + 台账逐行判据的受审门禁源）：`);
console.log(`  · dist/sidepanel.html ${pristine[HTML].bytes} B sha256=${pristine[HTML].sha.slice(0, 16)}…`);
console.log(`  · dist/sidepanel.js   ${pristine[JS].bytes} B sha256=${pristine[JS].sha.slice(0, 16)}…`);
console.log(`  · src/.../counts.ts   ${pristine[COUNTS_TS].bytes} B sha256=${pristine[COUNTS_TS].sha.slice(0, 16)}…`);
console.log(`  · test/ui/l0.mjs      ${pristine[LEAF_LEDGER_VICTIM].bytes} B sha256=${pristine[LEAF_LEDGER_VICTIM].sha.slice(0, 16)}…`);
console.log(`  · test/reverse-proof-judge.mjs ${pristine[JUDGE_MJS].bytes} B sha256=${pristine[JUDGE_MJS].sha.slice(0, 16)}…`);
console.log(`▶ 判定器：test/reverse-proof-judge.mjs（expectFailPattern 必须在**失败行**命中；启动/环境/CDP/OOM 错误 + 中途被杀一律判无效）`);
console.log(`▶ 判定器清单：node test/reverse-proof-judge.mjs --list-cases（元门禁执行并核对，不数源码声明）`);
console.log(`▶ 日志目录：${LOG_DIR}\n`);

// The judge's own reverse proof first: if the anti-foolproof cannot fail, nothing below
// means anything.
const judgeSelf = run('node', [resolve(ROOT, 'test/reverse-proof-judge.mjs'), '--selftest']);
writeFileSync(resolve(LOG_DIR, 'rp-v33-judge-selftest.log'), `${judgeSelf.out}\nSELFTEST_EXIT=${judgeSelf.code}\n`, 'utf8');
console.log(`${judgeSelf.code === 0 ? '✔' : '✖'} 判定器自身反证（因错而红必须被判无效）：exit=${judgeSelf.code}`);
console.log(judgeSelf.out.trimEnd());
console.log('');
if (judgeSelf.code !== 0) failures.push('判定器 --selftest 未通过（防呆自身不能证伪）');

// ── baseline must PASS (otherwise「还原后 PASS」is meaningless) ───────────────
const baseline = run('node', [L2_GATE]);
writeFileSync(resolve(LOG_DIR, 'rp-v33-baseline-l2.log'), `${baseline.out}\nBASELINE_EXIT=${baseline.code}\n`, 'utf8');
if (baseline.code !== 0) {
  console.error('✖ 前置失败：未扰动时 test/ui/l2.mjs 不 PASS，反证无意义。');
  console.error(baseline.out.slice(-3000));
  failures.push('前置：test/ui/l2.mjs 基线不 PASS');
} else {
  const summary = baseline.out.split('\n').filter((l) => l.includes('passed /')).pop() ?? '';
  console.log(`✔ 前置：未扰动时 test/ui/l2.mjs PASS（exit=0）· ${summary.trim()}\n`);
}

try {
  for (const [index, test] of selected.entries()) {
    console.log(`▶ ${test.id}（${index + 1}/${selected.length}）：${test.assertion}`);
    console.log(`  · 需求：${test.requirement}`);
    const failLog = resolve(LOG_DIR, `${test.id.toLowerCase()}-fail.log`);
    const passLog = resolve(LOG_DIR, `${test.id.toLowerCase()}-pass.log`);

    /** @type {{ id: string, exitCode: number, output: string }} */
    let failRun;
    let passRun;

    if (test.id === 'RP-V33-01') {
      patch(HTML, '<div id="view-host" hidden>', '<div id="view-host">', 1);
      console.log('  · 注入：dist/sidepanel.html `#view-host` 去掉 hidden');
      failRun = { id: test.id, ...run('node', [L2_GATE]) };
      restoreAll();
      passRun = { id: test.id, ...run('node', [L2_GATE]) };
    } else if (test.id === 'RP-V33-02') {
      patch(
        COUNTS_TS,
        'export function treeNodeCount(counts: SnapshotCounts | null): number | null {\n  if (!counts) return null;',
        'export function treeNodeCount(counts: SnapshotCounts | null): number | null {\n  return 113; // RP-V33-02 injected: a hard-coded count (must FAIL the gate)\n  if (!counts) return null;',
        1,
      );
      console.log('  · 注入：counts.ts 真值源写死 113 + npm run build');
      const built = run('npm', ['run', 'build']);
      if (built.code !== 0) failures.push(`${test.id} 注入后 npm run build 失败`);
      failRun = { id: test.id, ...run('node', [L2_GATE]) };
      restoreAll();
      const rebuilt = run('npm', ['run', 'build']);
      if (rebuilt.code !== 0) failures.push(`${test.id} 还原后 npm run build 失败`);
      // The rebuild re-stamps the build (a fresh BUILD_STAMP), so the artifact is
      // restored byte-for-byte from the backup BEFORE the PASS segment (the source
      // restore above is verified by sha below).
      restoreAll();
      passRun = { id: test.id, ...run('node', [L2_GATE]) };
    } else if (test.id === 'RP-V33-03' || test.id === 'RP-V33-03-NEG') {
      const copyDir = resolve(LOG_DIR, 'rp-v33-03-copy');
      mkdirSync(copyDir, { recursive: true });
      const copy = resolve(copyDir, 'l2.mjs');
      // V4-1 等价重锚：注入量 1 → 5 条（l2.mjs 计数 72、v3 台账下界 68；删 1 条不再越界），
      // 锚点改为按行取前 5 条 `check(` 调用行（不再绑定某条具体断言文本）。same basename as the ledger file, so the
      // `--files-override` seam matches it to `v3GateFloors["test/ui/l2.mjs"]`.
      const original = readFileSync(L2_GATE, 'utf8');
      const lines = original.split('\n');
      const checkLineIdx = lines.map((l, i) => (/^\s*check\(/.test(l) ? i : -1)).filter((i) => i >= 0);
      if (checkLineIdx.length < 5) {
        failures.push(`${test.id} 注入锚点不足（l2.mjs 仅 ${checkLineIdx.length} 条 check( 开头的调用行）`);
      }
      const dropIdx = checkLineIdx.slice(0, 5);
      const text = lines.filter((_, i) => !dropIdx.includes(i)).join('\n');
      writeFileSync(copy, text, 'utf8');
      const checksLeft = (text.match(/\bcheck\(/g) ?? []).length;
      console.log(`  · 注入：l2.mjs 同 basename 副本删 ${dropIdx.length} 条 check( ⇒ ${checksLeft} 条（真文件未动；v3 台账下界 68）`);

      if (test.id === 'RP-V33-03') {
        console.log('  · 形态 B（正确）：node dist-test/test/supersession-ledger.test.js --files-override <副本>');
        // Proof that the override branch really ran: the failure sentence must carry the
        // `--files-override <this copy>` prefix (the non-override branch prints the real
        // file path instead) — the F-01 defect was exactly that the flag never reached
        // the test process, so this prefix is the falsifiable evidence.
        test.expectAlsoPresent = ['--files-override ', copy];
        failRun = { id: test.id, ...run('node', [SUPERSESSION, '--files-override', copy]) };
    } else {
        console.log('  · 形态 A（历史错误形态，负控）：node --test dist-test/test/supersession-ledger.test.js --files-override <副本>');
        failRun = { id: test.id, ...run('node', ['--test', SUPERSESSION, '--files-override', copy]) };
      }
      passRun = { id: test.id, ...run('node', [SUPERSESSION]) };
    } else if (test.id === 'RP-V33-04') {
      const injected = resolve(LOG_DIR, 'rp-v33-04-inject-root');
      mkdirSync(resolve(injected, 'test/ui'), { recursive: true });
      mkdirSync(resolve(injected, 'test/e2e'), { recursive: true });
      copyFileSync(resolve(ROOT, 'test/ui/_v3-helpers.mjs'), resolve(injected, 'test/ui/_v3-helpers.mjs'));
      copyFileSync(L2_GATE, resolve(injected, 'test/ui/l2.mjs'));
      const victim = resolve(injected, 'test/ui/l2.mjs');
      // The anchor is `cdp.close();` — deliberately NOT the teardown call at the end of
      // l2.mjs, because the meta-gate's R2 rule treats the literal teardown-call text as
      // 「本文件使用共享底座」(its helperOk clause). Building an injected copy must not make
      // THIS harness look like a shared-base consumer it is not.
      const marker = '  cdp.close();';
      if (!readFileSync(victim, 'utf8').includes(marker)) failures.push(`${test.id} 注入锚点不存在（cdp.close() 已变）`);
      patch(
        victim,
        marker,
        '  if (failures.length > 0) {\n    await dumpDiagnostics(cdp);\n    process.exit(1);\n  }\n' + marker,
        1,
      );
      console.log('  · 注入：副本内 F-01 形态（失败块内 await 抢在退出码前）+ SDC_GATES_ROOT 指向注入根');
      failRun = { id: test.id, ...run('node', ['--test', GATE_INTEGRITY], { env: { SDC_GATES_ROOT: injected } }) };
      restoreAll();
      passRun = { id: test.id, ...run('node', ['--test', GATE_INTEGRITY]) };
    } else if (test.id === 'RP-V33-05') {
      const before = statSync(JS).size;
      writeFileSync(JS, `${readFileSync(JS, 'utf8')}x`, 'utf8');
      console.log(`  · 注入：dist/sidepanel.js ${before} B → ${statSync(JS).size} B`);
      failRun = { id: test.id, ...run('node', ['--test', SIZE_BUDGET]) };
      restoreAll();
      passRun = { id: test.id, ...run('node', ['--test', SIZE_BUDGET]) };
    } else if (test.id === 'RP-V33-06') {
      // ── N-09 reverse proof: an UNREGISTERED deletion that only the LEAF segment can
      // see. The line was introduced *after* the ledger's base (c2c0e0d) and is present
      // in the worktree, so the base-relative judge (diff base→worktree) is structurally
      // blind to its removal — precisely the 28-line blind spot validate found. The new
      // `leafBases` judgement must catch it, and the restore must be byte-exact.
      const pristineText = readFileSync(LEAF_LEDGER_VICTIM, 'utf8');
      const removed = `${LEAF_LEDGER_VICTIM_LINE}\n`;
      const hits = pristineText.split(removed).length - 1;
      if (hits !== 1) {
        failures.push(`${test.id} 注入锚点命中 ${hits} 次（期望 1）—— l0.mjs 的判据注释行已变`);
      }
      writeFileSync(LEAF_LEDGER_VICTIM, pristineText.replace(removed, ''), 'utf8');
      console.log(
        `  · 注入：test/ui/l0.mjs 删除 1 条**叶段**既有行（base 从未见过它）—— ${LEAF_LEDGER_VICTIM_LINE.trim().slice(0, 56)}…`,
      );
      failRun = { id: test.id, ...run('node', ['--test', SUPERSESSION]) };
      console.log('  · 形态：node --test dist-test/test/supersession-ledger.test.js（叶段判据必须红）');
      restoreAll();
      passRun = { id: test.id, ...run('node', ['--test', SUPERSESSION]) };
    } else if (test.judgeRevert) {
      // ── N-01 / N-02 / criterion c **self-proofs**: revert one hardening in the judge
      // and the meta-gate (which really executes `--selftest`) must go red. Only the
      // judge's own source is patched — the fixtures are untouched, so a green result
      // would mean the fixture cannot fail.
      const pristineJudge = readFileSync(JUDGE_MJS, 'utf8');
      const hits = pristineJudge.split(test.judgeRevert.from).length - 1;
      if (hits !== 1) {
        failures.push(`${test.id} 判定器锚点命中 ${hits} 次（期望 1）—— 判定器源码已变`);
      }
      writeFileSync(JUDGE_MJS, pristineJudge.replace(test.judgeRevert.from, test.judgeRevert.to), 'utf8');
      console.log(`  · 注入：判定器加固回退 —— ${test.judgeRevert.label}`);
      failRun = { id: test.id, ...run('node', ['--test', GATE_INTEGRITY]) };
      restoreAll();
      passRun = { id: test.id, ...run('node', ['--test', GATE_INTEGRITY]) };
    } else {
      failures.push(`${test.id} 未实现驱动`);
      continue;
    }

    writeFileSync(failLog, `${failRun.out}\nFAIL_SEG_EXIT=${failRun.code}\n`, 'utf8');
    writeFileSync(passLog, `${passRun.out}\nPASS_SEG_EXIT=${passRun.code}\n`, 'utf8');

    const judgedRun = { id: test.id, expectFailPattern: test.expectFailPattern, exitCode: failRun.code, output: failRun.out };
    const verdict = test.negativeControl ? judgeReverseProofInvalid(judgedRun) : judgeReverseProof(judgedRun);
    const alsoOk = (test.expectAlsoPresent ?? []).every((needle) => failRun.out.includes(needle));
    const restoreOk = restoredExactly();
    const passOk = passRun.code === 0;

    const matched = (failRun.out.split('\n').find((line) => new RegExp(String(test.expectFailPattern).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).test(line)) ?? '').trim();
    console.log(`  · FAIL 段：exit=${failRun.code} · 判定=${verdict.valid ? '有效（因该红而红）' : '无效'} · 本次匹配行：`);
    console.log(`      ${matched || '<无>'}`);
    console.log(`  · 追加证据（${(test.expectAlsoPresent ?? []).join(' / ') || '—'}）：${alsoOk ? '✔' : '✘'}`);
    console.log(`  · 还原：sha256 逐字节复原=${restoreOk}`);
    console.log(`  · PASS 段：exit=${passRun.code} · ${passOk ? 'PASS' : 'FAIL'}`);
    console.log(`  · 日志：${failLog} · ${passLog}`);
    console.log('');

    rows.push({
      id: test.id,
      assertion: test.assertion,
      pattern: String(test.expectFailPattern),
      failExit: failRun.code,
      judged: verdict.valid,
      matched,
      alsoOk,
      restoreOk,
      passExit: passRun.code,
      reason: verdict.reason,
    });

    if (!verdict.valid) failures.push(`${test.id} 反证判无效：${verdict.reason}`);
    if (!alsoOk) failures.push(`${test.id} 缺少追加证据（${(test.expectAlsoPresent ?? []).join(' / ')}）—— 判据分支未真的执行`);
    if (!restoreOk) failures.push(`${test.id} 还原 sha256 不一致`);
    if (!passOk) failures.push(`${test.id} 还原后 PASS 段未 PASS`);
  }
} finally {
  restoreAll();
}

console.log('| 反证 | 断言 | expectFailPattern | FAIL exit | 判定（因该红而红） | 追加证据 | sha256 复原 | PASS 段 |');
console.log('|---|---|---|---:|---|---|---|---|');
for (const r of rows) {
  console.log(
    `| ${r.id} | ${r.assertion} | \`${r.pattern}\` | ${r.failExit} | ${r.judged ? '✔ 有效' : '✘ 无效'} | ${r.alsoOk ? '✔' : '✘'} | ${r.restoreOk ? '✔' : '✘'} | ${r.passExit === 0 ? '✔' : '✘'} |`,
  );
}
console.log('');
console.log('逐条判定理由：');
for (const r of rows) console.log(`  · ${r.id}：${r.reason}`);

const finalOk = restoredExactly();
console.log(`\n最终产物复原核对：${finalOk ? '✔ sha256 与原始构建逐字一致' : '✘ 未复原'}`);
if (failures.length > 0 || !finalOk) {
  console.error(`\n✘ L2 反证全套 FAIL（${failures.length + (finalOk ? 0 : 1)} 项）：`);
  for (const f of failures) console.error(`  - ${f}`);
  if (!finalOk) console.error('  - 最终产物未逐字复原');
  process.exit(1);
}
console.log(`\n✔ L2 反证全套 PASS：${rows.length} 条全部「注入 → FAIL（命中 expectFailPattern）→ 逐字节还原（sha256）→ PASS」`);
