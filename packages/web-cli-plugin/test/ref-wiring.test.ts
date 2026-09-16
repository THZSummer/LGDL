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
  const submit = sidepanel.slice(sidepanel.indexOf('function submitAsk('), sidepanel.indexOf('function dispatch('));
  assert.match(submit, /const refId = pendingRefId;/, '答复必须先取回绑定的引用 id');
  assert.match(submit, /if \(res && !refId\) void send\(makeMessage\('ask-user-response'/, '引用回合不得把动作当自由文本直接发出去');
  assert.match(submit, /applyRefAction\(refId, value\.trim\(\)\)/, '引用回合必须经唯一入口派发');
  // The test seam routes through the SAME entry (no second implementation).
  const hook = testHookBody(sidepanel);
  assert.match(hook, /return applyRefAction\(String\(args\[0\]\), String\(args\[1\] \?\? 'ref-action'\)\);/);
  assert.ok(!/case 'act':\s*\n\s*return handle\.dispatchRefAction\(/.test(hook), '测试 seam 不得直接调用 guard 方法（那会是第二套实现）');
});
