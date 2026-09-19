/**
 * V3-4 TASK-415 (本叶 `spec.md` §7.1 **AC-CONV-1 / AC-CONV-2**；来源 = v3-2 的
 * `validate-report.md` R1 §5.1 **N-06**) — the production-wiring gate.
 *
 * ── What N-06 was ────────────────────────────────────────────────────────────
 *
 * v3-2 shipped the reference judge as a pure module with a fail-closed state machine
 * and *a* test seam — but the ONLY `setEnv` / `dispatchRefAction` call sites were
 * inside `installV3TestHooks()`. Green gates therefore covered a **test seam**: in
 * production nothing injected the page-side facts (every reference stayed `unknown`)
 * and there was no entrance that used a reference to act.
 *
 * ── What is pinned here (both are hard ACs; either one missing blocks the leaf) ─
 *
 *   AC-CONV-1  a real env injection point exists on a production path, and the
 *              `setEnv` call sites are **NOT limited to** `installV3TestHooks()`;
 *   AC-CONV-2  the single reference-action entrance calls `dispatchRefAction` (whose
 *              first statement is the `isRefUsable` guard) and there is exactly ONE
 *              such call site in the whole repo — no bypass.
 *
 * The static analysis below is deliberately written as small **exported** functions so
 * the same code can be pointed at a forged source and shown to fail (a gate that
 * cannot fail is not a gate).
 */
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const PKG = fileURLToPath(new URL('../../', import.meta.url));
const read = (rel: string): string => readFileSync(join(PKG, rel), 'utf8');

/** Every `.ts` under `src/` (the production surface — `test/` is deliberately excluded). */
export function srcFiles(dir = join(PKG, 'src')): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...srcFiles(full));
    else if (name.endsWith('.ts')) out.push(full);
  }
  return out.sort();
}

/** `installV3TestHooks()`'s body, sliced at the next top-level `function`. */
export function testHookBody(source: string): string {
  const start = source.indexOf('function installV3TestHooks()');
  if (start < 0) return '';
  const rest = source.slice(start + 10);
  const end = rest.indexOf('\nfunction ');
  return end < 0 ? rest : rest.slice(0, end);
}

/** AC-CONV-1: `setEnv` call sites that are NOT inside the test seam. */
export function productionSetEnvSites(sidepanel: string): string[] {
  const hook = testHookBody(sidepanel);
  const sites = sidepanel.match(/setEnv\(/g) ?? [];
  const inHook = (hook.match(/setEnv\(/g) ?? []).length;
  return new Array(Math.max(0, sites.length - inHook)).fill('setEnv(');
}

/** Strip block + line comments (a doc block that *mentions* a call is not a call). */
export function codeOnly(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

/** AC-CONV-2: every `dispatchRefAction(` call site that is not the definition. */
export function dispatchCallSites(files: readonly [string, string][]): string[] {
  const sites: string[] = [];
  for (const [file, raw] of files) {
    const text = codeOnly(raw);
    if (file.endsWith('l1/panels.ts')) {
      // The definition itself (`dispatchRefAction(refId, action) {`) is not a call.
      const calls = (text.match(/\.dispatchRefAction\(/g) ?? []).length;
      if (calls > 0) sites.push(`${file}: ${calls}`);
      continue;
    }
    const calls = (text.match(/dispatchRefAction\(/g) ?? []).length;
    if (calls > 0) sites.push(`${file}: ${calls}`);
  }
  return sites;
}

test('AC-CONV-1：setEnv 的生产调用点不止 installV3TestHooks()（可 FAIL）', () => {
  const sidepanel = read('src/ui/sidepanel/sidepanel.ts');
  const production = productionSetEnvSites(sidepanel);
  assert.ok(
    production.length >= 1,
    '生产中必须存在 setEnv 的调用点（否则线上引用恒 unknown ⇒ N-06 未收敛）',
  );
  // 反证：把「生产调用点」抹掉的伪造源码必须被判红。
  const forged = sidepanel.replace(/^\s*l1\?\.setEnv\(pickInput[\s\S]*?\);/m, '');
  assert.equal(productionSetEnvSites(forged).length, 0, '反证：移除生产调用点后判据必须变为 0 ⇒ 本判据非恒真');
  // The production site is the render-time sync, and IT is what carries the facts.
  assert.match(sidepanel, /function syncRefEnv\(\): void \{/, '生产 env 注入点必须是一个具名函数（可被 review 定位）');
  assert.match(sidepanel, /\/\/ V3-4 \/ AC-CONV-1[\s\S]{0,400}?syncRefEnv\(\);/, 'render() 必须调用该注入点（否则它只是死代码）');
  assert.match(sidepanel, /pickInput\.judgeEnv\(\)/, '注入的 env 必须来自页面侧事实（不是常量）');
});

test('AC-CONV-1：env 的每个必需字段都来自真实来源（origin / 授权 / documentId / navSeq / 声明 hash）', () => {
  const pickInput = read('src/ui/sidepanel/pick-input.ts');
  const envFn = pickInput.slice(pickInput.indexOf('const judgeEnv = (): RefEnv => {'), pickInput.indexOf('const inject = async'));
  assert.ok(envFn.length > 0, 'judgeEnv 必须存在（这是生产 env 的唯一组装点）');
  for (const field of ['currentOrigin:', 'authorized:', 'documentId:', 'navSeq:', 'declarationHash:']) {
    assert.ok(envFn.includes(field), `env 必须携带 ${field.replace(':', '')}`);
  }
  // 缺字段时必须**保持缺失**（fail-closed），不得填默认值冒充已知。
  assert.match(pickInput, /if \(!state\.injected\) \{/, '页面侧不在场时必须走 fail-closed 分支');
  const failClosed = pickInput.slice(pickInput.indexOf('if (!state.injected) {'), pickInput.indexOf('return {\n      currentOrigin: base.activeOrigin, authorized: base.authorized,'));
  assert.ok(!failClosed.includes("documentId: ''"), 'fail-closed 分支不得伪造空 documentId 当「已知」');
  // 声明 hash 来自背景采纳的 descriptor（真实摘要），不是字面量。
  const sw = read('src/background/service-worker.ts');
  assert.match(sw, /async function declarationEnv\(/, '声明事实必须由 SW 计算');
  assert.match(sw, /await sha256Hex\(projection\)/, 'declarationHash 必须是对采纳声明的真实摘要（不得是 decl-1 之类的字面量）');
  assert.ok(!/declarationHash: 'decl-1'[\s\S]{0,200}syncRefEnv/.test(sidepanelSrcSafe()), '生产路径不得沿用测试夹具的字面量声明 hash');
});

/** The sidepanel source, read once (kept as a helper so the assertion above reads well). */
function sidepanelSrcSafe(): string {
  return read('src/ui/sidepanel/sidepanel.ts');
}

test('AC-CONV-2：唯一动作入口调用 dispatchRefAction（全仓唯一调用点，绕过 ⇒ FAIL）', () => {
  const files = srcFiles().map((full) => [full.slice(PKG.length), readFileSync(full, 'utf8')] as [string, string]);
  const sites = dispatchCallSites(files);
  assert.deepEqual(sites, ['src/ui/sidepanel/sidepanel.ts: 1'], `dispatchRefAction 必须只有一处调用点，实际 ${JSON.stringify(sites)}`);
  const sidepanel = read('src/ui/sidepanel/sidepanel.ts');
  const entry = sidepanel.slice(sidepanel.indexOf('function applyRefAction('), sidepanel.indexOf('/** Send the user\'s answer back'));
  assert.match(entry, /l1\?\.dispatchRefAction\(/, '唯一入口必须调用 guard 入口');
  // The guard itself is the panel's `dispatchRefAction`, whose first statement is
  // `isRefUsable` (v3-2) — assert that contract is still true rather than assuming it.
  const panels = read('src/ui/sidepanel/l1/panels.ts');
  const dispatchBody = panels.slice(panels.indexOf('dispatchRefAction(refId, action) {'), panels.indexOf('repick(facts, observed) {'));
  assert.match(dispatchBody, /if \(!record \|\| !isRefUsable\(record\.facts, envCurrent\)\) \{/, 'guard 必须是首句（fail-closed）');
  // 反证：伪造一个绕过 guard 的第二调用点 ⇒ 本判据必须 FAIL。
  const forged = [...files, ['src/ui/sidepanel/forged.ts', 'l1?.dispatchRefAction(refId, action);\n'] as [string, string]];
  assert.notDeepEqual(dispatchCallSites(forged), sites, '反证：多一处直接调用必须被检出');
});

test('AC-CONV-2：引用回合的选择答复走同一入口（不经自由文本通道）', () => {
  const sidepanel = read('src/ui/sidepanel/sidepanel.ts');
  // V4-3: the one resolution entry is `submitAskFor` (the legacy `submitAsk` wrapper
  // delegates to it), so the routing assertion is read from that function.
  const submit = sidepanel.slice(sidepanel.indexOf('function submitAskFor('), sidepanel.indexOf('function dispatch('));
  assert.match(submit, /const isRef = \(rid \?\? ''\)\.startsWith\(REF_ROUND_PREFIX\)/, '答复必须先判定是否引用回合');
  assert.match(submit, /if \(rid && !isRef\)/, '引用回合不得把动作当自由文本直接发出去');
  assert.match(submit, /makeMessage\('ask-user-response'/, '后台提问仍走 ask-user-response 通道');
  assert.match(submit, /applyRefAction\(refId, trimmed\)/, '引用回合必须经唯一入口派发');
  // The test seam routes through the SAME entry (no second implementation).
  const hook = testHookBody(sidepanel);
  assert.match(hook, /return applyRefAction\(String\(args\[0\]\), String\(args\[1\] \?\? 'ref-action'\)\);/);
  assert.ok(!/case 'act':\s*\n\s*return handle\.dispatchRefAction\(/.test(hook), '测试 seam 不得直接调用 guard 方法（那会是第二套实现）');
});

// ── R1（2026-09-17）：摄取时补全捕获事实的**布线反证** ────────────────────────
/**
 * 缺陷：普通站点（无有效声明）拾取的引用出生即死 —— 页面侧是**冻结**产物，只能写
 * `declarationHash: ''`；若摄取点不补上声明**状态**，判定链只能读到「缺失事实」。
 * 本判据是布线级的复现反证（端到端那一条在 `test/ui/page-input.mjs`）：把
 * `onCapture(withDeclaration(` 改回 `onCapture(`（= 回退修复）⇒ 计数归零 ⇒ FAIL。
 */
export function captureCompletionSites(source: string): number {
  return (codeOnly(source).match(/onCapture\(withDeclaration\(/g) ?? []).length;
}

test('R1/R3：拾取摄取点补全声明状态（三条落点各一次；回退修复即 FAIL）', () => {
  const pickInput = read('src/ui/sidepanel/pick-input.ts');
  // ① clicking a reference, ② dropping one on the panel, ③ R3's one-click re-anchor are
  // the three ingestion paths — all of them must complete the capture fact.
  assert.equal(captureCompletionSites(pickInput), 3, '三条摄取落点都必须经过 withDeclaration()');
  const forged = pickInput.replaceAll('onCapture(withDeclaration(', 'onCapture(');
  assert.equal(captureCompletionSites(forged), 0, '反证：回退摄取补全 ⇒ 判据必须归零（非恒真）');
  assert.match(pickInput, /const withDeclaration = \(facts: RawRefFacts\): RawRefFacts => \{/, '补全必须是显式具名步骤');
  assert.match(pickInput, /status: d\.status/, '写入的必须是 SW 单一事实源给出的状态');
  // The judge env must carry the state (not just the digest).
  const envFn = pickInput.slice(pickInput.indexOf('const judgeEnv = (): RefEnv => {'), pickInput.indexOf('const inject = async'));
  assert.ok(envFn.includes('declarationStatus:'), 'env 必须携带 declarationStatus');
  assert.ok(envFn.includes('declarationHash:'), 'env 仍须携带 declarationHash（valid 声明的摘要）');
  // The single source of the state is the SW's declaration environment.
  const sw = read('src/background/service-worker.ts');
  assert.match(sw, /function declarationStatusOf\(/, '状态必须由 SW 从既有声明状态机派生');
  assert.match(sw, /declarationStatus: 'valid' \| 'invalid' \| 'absent'/, 'declarationEnv 必须回传三态');
  // 面板侧不得自造状态机（只透传 SW 的值）。
  const sidepanel = read('src/ui/sidepanel/sidepanel.ts');
  assert.match(sidepanel, /decl\.declarationStatus === 'valid'/, '面板只做 SW 状态的映射/透传');
});

// ── R1（2026-09-17）：身份观测必须晚于身份标记（D1 的第二个「出生即死」缺口）────
/**
 * 缺陷：身份标记（`data-wcli-ref`）由**面板铸造 id 之后**才写回页面，因此**捕获时刻**
 * 的观测结构上不可能带上它 ⇒ D1 把每一条新拾取的引用判成「目标元素已被同类新元素
 * 替换」⇒ 真实站点上引用**仍然不可用**（与「缺失 declarationHash」是同一症状的两个
 * 缺口）。修法：标记回程（面板 → SW → 页面写标记）由 SW 在**写标记之后**重新读一次
 * 身份观测并交回面板，面板用它重判。本判据是布线级反证：回退新观测回写 ⇒ 计数归零。
 */
export function rejudgeSites(source: string): number {
  return (codeOnly(source).match(/if \(fresh\) l1\?\.setResolution\(fresh\)/g) ?? []).length;
}

test('R1：标记回程带回**新**身份观测并重判（回退即 FAIL；面板不得自证 resolved）', () => {
  const sidepanel = read('src/ui/sidepanel/sidepanel.ts');
  assert.equal(rejudgeSites(sidepanel), 1, '标记回程的新观测必须回写并重判');
  assert.equal(
    rejudgeSites(sidepanel.replace('if (fresh) l1?.setResolution(fresh);', '')),
    0,
    '反证：回退「新观测回写」⇒ 判据必须归零（非恒真）',
  );
  const pickInput = read('src/ui/sidepanel/pick-input.ts');
  assert.match(pickInput, /if \(mode !== 'mark' \|\| !res\.ok\) return undefined;/, '只有身份标记回程带回观测');
  assert.match(pickInput, /Promise<RefResolution \| undefined>/, 'highlight 必须把观测交回调用方');
  const sw = read('src/background/service-worker.ts');
  assert.match(sw, /async function observeIdentity\(/, '新观测必须由 SW 从页面读取');
  assert.match(sw, /mode === 'mark' && selector \? await observeIdentity\(target\.tabId, selector\)/, 'ref-highlight 的 mark 分支必须带新观测');
  assert.match(sw, /getAttribute\('data-wcli-ref'\)/, '身份判据必须是 `data-wcli-ref`（与 D1 同一判据）');
  assert.ok(
    !/setResolution\(\{\s*status: 'resolved'/.test(sidepanel),
    '生产路径不得自证 resolved（观测只能来自页面）',
  );
});
