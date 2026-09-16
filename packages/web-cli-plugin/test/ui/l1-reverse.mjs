// @ts-check
/**
 * V3-2 fix round (2026-09-16) — **per-assertion reverse proofs** for the L1 leaf
 * (TASK-210 follow-up; orchestrator requirement "逐断言反证实跑").
 *
 * What it proves, per key assertion of this leaf: a perturbation injected into the
 * **artifact the gate really reads** (`dist/sidepanel.js` / `dist/sidepanel.html`,
 * loaded by `test/ui/l1.mjs` into Chromium) makes that gate **FAIL**; restoring the
 * artifact **byte-for-byte** (sha256 equality against the pristine build) makes it
 * **PASS** again.
 *
 * Why artifact-level: `test/ui/l1.mjs` drives the shipped `dist/` product
 * (`window.__v3.testing.l1(...)` is the product's own test surface), so patching the
 * artifact is patching exactly the bytes the judge reads — this is *not* a
 * side-channel or a `/tmp` copy proving itself. The perturbation is only accepted
 * if it flips the gate's verdict, which is itself the proof that the gate read it.
 *
 * Assertions covered (one perturbation each, 1:1 with the leaf's key assertions):
 *
 *   RP-L1-A 五维引用失效的可读原因（逐字）       FR-V3-036/037
 *   RP-L1-B 5 个 `unknown` 场景的「无法确认…按失效处理」 FR-V3-036（fail-closed）
 *   RP-L1-C 失效态**阻断**（命令发送计数增量 = 0）  FR-V3-037
 *   RP-L1-D 非空转对照（resolved 放行计数真的 +1）  FR-V3-037 / D1 反证
 *   RP-L1-E 恢复路径①「改用描述」打开既有兜底输入   FR-V3-038
 *   RP-L1-F 恢复路径②「重新拾取」产生 NEW id + 回到 valid FR-V3-038
 *   RP-L1-G 回执三件套「重拉为真」（refreshSeq 1→2） FR-V3-039
 *   RP-L1-H 8 类就地展开「≤1 次交互」（DOM 契约）   FR-V3-031
 *   RP-L1-C2 内层阻断 guard 的产物字节 pin（只关内层 ⇒ 门禁必须 FAIL） FR-V3-037 内层 / NFR-V3-013
 *            （I-02：内层的**行为**在唯一调用点下不可观测，故运行期 pin 落在产物字节结构 +
 *             `test/l1-ref-validity.test.ts` 的 Node 运行时行为用例；本条把该 pin 的可失败性做实）
 *
 * Usage: `npm run test:l1-reverse` / `node test/ui/l1-reverse.mjs [RP-L1-X ...]`
 * Logs: prints the exact perturbation + the failing check + the restore hash.
 */
import { createHash } from 'node:crypto';
import { copyFileSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const GATE = resolve(ROOT, 'test/ui/l1.mjs');
const JS = resolve(ROOT, 'dist/sidepanel.js');
const HTML = resolve(ROOT, 'dist/sidepanel.html');

const sha = (path) => createHash('sha256').update(readFileSync(path)).digest('hex');

/** Byte-exact backups live outside the artifact dir; the restore target is `dist/`. */
const BACKUP_DIR = '/tmp/opencode/l1-reverse-backup';
mkdirSync(BACKUP_DIR, { recursive: true });
const backupOf = (path) => resolve(BACKUP_DIR, path.split('/').pop() + '.pristine');

/**
 * @typedef {{ id: string, artifact: string, assertion: string, requirement: string,
 *   from: string, to: string, count?: number, expectFail: RegExp, note: string }} Case
 */
/** @type {Case[]} */
const CASES = [
  {
    id: 'RP-L1-A',
    artifact: JS,
    assertion: '⑦ 五维 → 可读原因逐字（`r.text === REASON[dim]`）',
    requirement: 'FR-V3-036 / FR-V3-037',
    // `目标元素已不存在` — append one byte inside the reason literal so the verbatim
    // comparison (gate-side expected string) can no longer match.
    from: '\\u76EE\\u6807\\u5143\\u7D20\\u5DF2\\u4E0D\\u5B58\\u5728',
    to: '\\u76EE\\u6807\\u5143\\u7D20\\u5DF2\\u4E0D\\u5B58\\u5728X',
    expectFail: /可读原因指到该维（逐字）/,
    note: '注入后：五维的可读原因与门禁逐字期望不再相等 → 该维 FAIL',
  },
  {
    id: 'RP-L1-B',
    artifact: JS,
    assertion: '⑦ 不确定场景 → 可读原因写明「无法确认…按失效处理」',
    requirement: 'FR-V3-036（不确定即失效）',
    from: '\\u65E0\\u6CD5\\u786E\\u8BA4\\u5F15\\u7528',
    to: '\\u65E0\\u6CD5\\u6838\\u5BF9\\u5F15\\u7528',
    expectFail: /可读原因写明「无法确认/,
    note: '注入后：unknown 文案改写 → 5 个场景的原因断言 FAIL',
  },
  {
    id: 'RP-L1-C',
    artifact: JS,
    assertion: '⑧ 失效引用被阻断：命令发送计数增量为 0',
    requirement: 'FR-V3-037（阻断）',
    from: 'function evaluateRefValidity(ref, env) {',
    to: 'function evaluateRefValidity(ref, env) {\n    return { verdict: "valid" };',
    expectFail: /失效引用被阻断|判定 invalid|按失效处理/,
    note: '注入后：**唯一判定权威**恒返回 valid → 阻断（以及五维/unknown 的失效判定）全部失效 → 门禁 FAIL。'
      + '注：阻断是**双层**实现（panels 侧 `isRefUsable` + ref-store 侧 `dispatch` 重新判定）；'
      + '只关掉其中一层（例如把 ref-store 的 `view.verdict !== "valid"` 改成 `false`）门禁**仍 PASS** —— '
      + '实测证据见 13-rp-l1-reverse-round0.log（纵深防御有效）；本反证从判定权威单点入手，两层同时失效。',
  },
  {
    id: 'RP-L1-D',
    artifact: JS,
    assertion: '⑧ 有效引用可动作（非空转对照：计数真的会动）',
    requirement: 'FR-V3-037（非空转对照 / D1 反证）',
    from: 'sends += 1;',
    to: 'sends += 0;',
    expectFail: /有效引用可动作/,
    note: '注入后：放行路径不再计数 → 对照「before ≥ 1」FAIL（证明对照不是恒真）',
  },
  {
    id: 'RP-L1-E',
    artifact: JS,
    assertion: '⑨ 「改用描述」走既有 #ask 兜底输入',
    requirement: 'FR-V3-038（恢复路径①）',
    from: 'el2("l1-ref-describe").addEventListener("click", () => deps.revealFallback());',
    to: 'el2("l1-ref-describe").addEventListener("click", () => void 0);',
    expectFail: /「改用描述」走既有 #ask 兜底输入/,
    note: '注入后：改用描述不再打开兜底输入 → 该恢复路径 FAIL',
  },
  {
    id: 'RP-L1-F',
    artifact: JS,
    assertion: '⑨ 「重新拾取」产生 NEW id（失效 id 不重用）+ 恢复后 valid',
    requirement: 'FR-V3-038（恢复路径②）',
    from: '        store.retireUnusable();\n        const fresh = store.create(facts);',
    to: '        store.retireUnusable();\n        const fresh = { facts: previous.facts };',
    expectFail: /「重新拾取」产生 NEW id/,
    note: '注入后：重新拾取不再 mint 新引用（fresh = 上一条记录）→ 不产生新 id → 「NEW id」断言按名字 FAIL（N-04 收口轮把锚点从 `repick()` 头部移到 `store.create(facts)`：旧的头部锚点会先让 `fresh.facts` 抛 TypeError，令具名断言根本不执行）',
  },
  {
    id: 'RP-L1-G',
    artifact: JS,
    assertion: '⑩ 证据来自真实重拉（refreshSeq 单调递增 1 → 2）',
    requirement: 'FR-V3-039（重拉为真）',
    from: 'refreshSeq += 1;',
    to: 'refreshSeq += 0;',
    expectFail: /证据来自真实重拉/,
    note: '注入后：重拉不再递增 → seq 断言 FAIL（证明「重拉为真」可被打破）',
  },
  {
    id: 'RP-L1-H',
    artifact: HTML,
    assertion: '① 8 类 L1 面板可枚举 + 默认 hidden + 逐类 ≤1 次交互',
    requirement: 'FR-V3-031（8 类就地展开）',
    from: 'data-l1-panel=',
    to: 'data-l1-panel-x=',
    count: 8,
    expectFail: /恰好 8 个 \[data-l1-panel\]/,
    note: '注入后：DOM 契约属性改名 → 枚举断言 FAIL（门禁读的正是这份 HTML）',
  },
  {
    id: 'RP-L1-C2',
    artifact: JS,
    assertion: '⑧ 内层阻断 guard（ref-store.dispatch 侧）存在于产物字节中且位于唯一 sends 自增之前',
    requirement: 'FR-V3-037（双层阻断的内层）+ NFR-V3-013（门禁必须能 FAIL）',
    // I-02（R1 修复轮）：只弱化**内层**在**行为上不可观测** —— 外层
    // `panels.dispatchRefAction` 的 `isRefUsable()` 与内层 `store.dispatch()` 的
    // `evaluateRefValidity()` 在产品的唯一调用点下同源同参（同一函数、同一 env、
    // 同一 record），且外层先判先返回。因此「内层被删/被弱化」不会被任何行为断言
    // 看到（这正是 RP-L1-C 必须从两层共同依赖的判定权威入手的原因）。
    // 本反证把内层**结构**纳入运行时门禁：门禁 ⑧ 直接读产物字节核对 guard 的形状
    // 与「guard 在唯一 `sends += 1` 之前」；只关内层 ⇒ 该断言立刻 FAIL。
    from: 'if (view.verdict !== "valid") {',
    to: 'if (false) {',
    expectFail: /内层阻断 guard 在产物字节中存在且唯一|内层 guard 位于/,
    note: '注入后：内层 guard 从产物字节中消失 ⇒ 门禁 ⑧ 的产物字节 pin FAIL（行为侧同源的 '
      + '`test/l1-ref-validity.test.ts` Node 运行时用例仍独立 pin 其行为，含「valid 放行计数真的动」的非空转对照）。',
  },
];

function runGate() {
  try {
    const out = execFileSync('node', [GATE], { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
    return { code: 0, out };
  } catch (err) {
    const e = /** @type {{ status?: number, stdout?: string, stderr?: string }} */ (err);
    return { code: e.status ?? 1, out: `${e.stdout ?? ''}${e.stderr ?? ''}` };
  }
}

/** Patch `from` → `to`, requiring exactly `count` occurrences. */
function patch(path, from, to, count = 1) {
  const text = readFileSync(path, 'utf8');
  const occurrences = text.split(from).length - 1;
  if (occurrences !== count) {
    throw new Error(`perturbation anchor 命中 ${occurrences} 次（期望 ${count}）：${JSON.stringify(from.slice(0, 60))}`);
  }
  writeFileSync(path, text.split(from).join(to), 'utf8');
}

const results = [];
const failures = [];
const requested = process.argv.slice(2).filter((a) => a.startsWith('RP-L1-'));
const selected = requested.length > 0 ? CASES.filter((c) => requested.includes(c.id)) : CASES;

if (selected.length === 0) {
  console.error(`未匹配任何反证用例：${requested.join(', ')}`);
  process.exit(2);
}

// ── pristine state ──────────────────────────────────────────────────────────
const pristine = {
  [JS]: { bytes: statSync(JS).size, sha: sha(JS) },
  [HTML]: { bytes: statSync(HTML).size, sha: sha(HTML) },
};
const hashes = Object.keys(pristine);
for (const path of hashes) copyFileSync(path, backupOf(path));
console.log(`▶ dist/sidepanel.js  ${pristine[JS].bytes} B  sha256=${pristine[JS].sha}`);
console.log(`▶ dist/sidepanel.html ${pristine[HTML].bytes} B  sha256=${pristine[HTML].sha}`);
console.log('▶ 扰动施加在门禁真读的产物上（test/ui/l1.mjs 载入的就是这两个文件），非旁路/副本自证。\n');

// 基线必须是 PASS（否则「还原后 PASS」无意义）。
const baseline = runGate();
if (baseline.code !== 0) {
  console.error('❌ 前置失败：未扰动时 test/ui/l1.mjs 已不 PASS，反证无意义。');
  console.error(baseline.out.slice(-3000));
  process.exit(1);
}
console.log(`✔ 前置：未扰动时 test/ui/l1.mjs PASS（exit=${baseline.code}）\n`);

try {
  for (const [index, c] of selected.entries()) {
    console.log(`▶ ${c.id}（${index + 1}/${selected.length}）：${c.assertion}`);
    console.log(`  · 需求：${c.requirement}`);
    console.log(`  · 注入：${JSON.stringify(c.from.slice(0, 70))} → ${JSON.stringify(c.to.slice(0, 70))}`);
    const before = sha(c.artifact);
    patch(c.artifact, c.from, c.to, c.count ?? 1);
    const after = sha(c.artifact);
    if (after === before) {
      failures.push(`${c.id} 注入未改变字节（扰动未生效）`);
      continue;
    }
    const patchedBytes = statSync(c.artifact).size;
    const failRun = runGate();
    // A check NAME shows up in the passing output too — the FAIL段 evidence must be
    // a line carrying the gate's **failure** marker `✖` *and* matching the assertion.
    const markedFail = failRun.out.includes('✖');
    const failHit = failRun.out
      .split('\n')
      .some((line) => line.includes('✖') && c.expectFail.test(line));
    const failedChecks = failRun.out
      .split('\n')
      .filter((line) => line.includes('✖'))
      .map((line) => line.trim())
      .slice(0, 4);
    console.log(
      `  · FAIL 段：exit=${failRun.code} · 断言命中=${failHit} · 出现 ✖=${markedFail}` +
        (failRun.code === 0 ? ' ← 扰动未让门禁 FAIL' : ''),
    );
    for (const line of failedChecks) console.log(`      ${line}`);

    // ── byte-exact restore ───────────────────────────────────────────────────
    for (const path of hashes) copyFileSync(backupOf(path), path);

    const restoreOk = hashes.every((p) => sha(p) === pristine[p].sha);
    const restoreBytes = hashes.map((p) => statSync(p).size).join('/');
    console.log(`  · 还原：sha256 复原=${restoreOk} · 字节=${restoreBytes}`);

    const passRun = runGate();
    const passOk = passRun.code === 0;
    console.log(`  · PASS 段：exit=${passRun.code} · ${passOk ? 'PASS' : 'FAIL'}`);
    console.log('');

    results.push({
      id: c.id,
      assertion: c.assertion,
      requirement: c.requirement,
      injected: `${c.from.slice(0, 40)} → ${c.to.slice(0, 40)}`,
      failExit: failRun.code,
      failHit,
      markedFail,
      restoreOk,
      passExit: passRun.code,
      patchedBytes,
      failedChecks,
      note: c.note,
    });

    if (failRun.code === 0 || !failHit) failures.push(`${c.id} FAIL 段未按预期失败（命中判据=false）`);
    if (!restoreOk) failures.push(`${c.id} 还原 sha256 不一致`);
    if (!passOk) failures.push(`${c.id} 还原后门禁未 PASS`);
  }
} finally {
  // Never leave a perturbed artifact behind, even on an unexpected throw.
  for (const path of hashes) copyFileSync(backupOf(path), path);
}

console.log('| 反证 | 断言 | 需求 | 注入 | FAIL 段 exit | FAIL 段命中 | sha256 复原 | 还原后 PASS |');
console.log('|---|---|---|---|---:|---|---|---|');
for (const r of results) {
  console.log(
    `| ${r.id} | ${r.assertion} | ${r.requirement} | ${r.injected} | ${r.failExit} | ${r.failHit ? '✔' : '✘'} | ${r.restoreOk ? '✔' : '✘'} | ${r.passExit === 0 ? '✔' : '✘'} |`,
  );
}
console.log('');
console.log('逐条 FAIL 证据（门禁 `✖` 行）：');
for (const r of results) {
  console.log(`  · ${r.id} → exit=${r.failExit}；失败断言：`);
  for (const line of r.failedChecks) console.log(`      ${line}`);
}
console.log('');
console.log(`反证注记：`);
for (const r of results) console.log(`  · ${r.id}：${r.note}（扰动后产物 ${r.patchedBytes} B）`);

const finalOk = hashes.every((p) => sha(p) === pristine[p].sha);
console.log(`\n最终产物复原核对：${finalOk ? '✔ sha256 与原始构建逐字一致' : '✘ 未复原'}`);
if (failures.length > 0 || !finalOk) {
  console.error(`\n✘ 反证全套 FAIL（${failures.length + (finalOk ? 0 : 1)} 项）：`);
  for (const f of failures) console.error(`  - ${f}`);
  if (!finalOk) console.error('  - 最终产物未逐字复原');
  process.exit(1);
}
console.log(`\n✔ 反证全套 PASS：${results.length} 条断言全部「注入 → FAIL → 逐字节还原（sha256 复原）→ PASS」`);
