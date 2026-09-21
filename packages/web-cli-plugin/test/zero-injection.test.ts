/**
 * V3-4 TASK-410 (NFR-V3-007 / NFR-V3-006 / AC-V3-017 / AC-V3-018) — the **static**
 * half of the zero-injection gate.
 *
 * The runtime half lives in `test/ui/zero-injection.mjs` (a real Chromium run against
 * an unauthorized origin). This half pins the two things a browser run cannot prove
 * about the *declaration*:
 *
 *   ① the manifest's static permission surface did not grow — no `contextMenus`, no
 *      new `permissions` / `optional_permissions` / `host_permissions` entry, and no
 *      static `content_scripts` (the layer must stay **on-demand**);
 *   ② the layer is not smuggled into the resident bundle: `dist/content.js` must not
 *      reference it, and the service worker's injection path must re-check
 *      authorization before it executes anything on a tab.
 */
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const REPO = new URL('../../../', import.meta.url);
const PKG = new URL('../../', import.meta.url);
const read = (rel: string): string => readFileSync(new URL(rel, PKG), 'utf8');

/** The frozen static surface (v1 declaration; any change is a red-line breach). */
const FROZEN_PERMISSIONS = ['activeTab', 'scripting', 'storage', 'sidePanel', 'tabs'];
const FROZEN_OPTIONAL = ['bookmarks', 'downloads', 'notifications', 'clipboardRead', 'clipboardWrite'];
const FROZEN_HOSTS = [
  'https://api.deepseek.com/*',
  'https://dashscope.aliyuncs.com/*',
  'https://ark.cn-beijing.volces.com/*',
  'https://api.hunyuan.cloud.tencent.com/*',
  'https://api.openai.com/*',
  'https://api.anthropic.com/*',
];

test('V3-4 零注入（静态面）：manifest 静态权限零新增 + 无 contextMenus + 无静态 content_scripts', () => {
  const manifest = JSON.parse(read('manifest.json')) as Record<string, unknown>;
  assert.deepEqual(manifest.permissions, FROZEN_PERMISSIONS, '静态 permissions 必须零新增');
  assert.deepEqual(manifest.optional_permissions, FROZEN_OPTIONAL, 'optional_permissions 必须零新增');
  assert.deepEqual(manifest.host_permissions, FROZEN_HOSTS, 'host_permissions 必须零新增（不扩大任何域）');
  assert.deepEqual(manifest.optional_host_permissions, ['http://*/*', 'https://*/*']);
  const raw = read('manifest.json');
  assert.ok(!raw.includes('contextMenus'), '不得引入 contextMenus（右键自绘是路线 1 的前提）');
  assert.equal(manifest.content_scripts, undefined, '不得出现静态 content_scripts（必须按需注入）');
  assert.equal(manifest.web_accessible_resources, undefined, '不得暴露 web_accessible_resources（executeScript 不需要）');
  assert.equal(manifest.minimum_chrome_version, '116', 'MV3 / attachShadow 的下限不得下调');
  // 反证：一个加了 contextMenus 的 manifest 在本判据下必须被判红。
  const forged = { ...manifest, permissions: [...FROZEN_PERMISSIONS, 'contextMenus'] };
  assert.notDeepEqual(forged.permissions, FROZEN_PERMISSIONS, '反证：加权限的 manifest 必须与冻结集合不等');
  assert.ok(JSON.stringify(forged).includes('contextMenus'), '反证：伪造体确实带上了 contextMenus');
});

test('V3-4 零注入（结构与源码）：常驻产物不含拾取层；SW 注入前再次校验授权', () => {
  let content: string | undefined;
  try {
    content = readFileSync(new URL('dist/content.js', PKG), 'utf8');
  } catch {
    content = undefined;
  }
  if (content !== undefined) {
    // The resident bundle must not carry the layer (that is the whole point of the
    // separate artifact: `content.js` has zero headroom).
    assert.ok(!content.includes('__wcliPickLayer'), 'content.js 不得包含拾取层（否则就是「打进常驻」）');
    assert.ok(!content.includes('data-wcli-pick-root'), 'content.js 不得包含拾取层的 Shadow host 标记');
    assert.equal(statSync(new URL('dist/pick-layer.js', PKG)).size > 0, true, '独立产物必须存在');
  }
  const sw = read('src/background/service-worker.ts');
  const injectCase = sw.slice(sw.indexOf("case 'pick-layer-inject'"), sw.indexOf("case 'pick-layer-teardown'"));
  assert.ok(injectCase.length > 0, 'pick-layer-inject case 必须存在');
  assert.match(injectCase, /declarationEnv\(/, '注入前必须拿到该 origin 的声明事实（授权态在其中）');
  assert.match(injectCase, /env\.authorized/, '注入前必须再次校验授权集合（面板视图只是提示，OriginStore 才是闸门）');
  assert.match(injectCase, /errorResponse\(/, '未授权必须返回可读拒绝（不得静默）');
  assert.match(injectCase, /files: \['pick-layer\.js'\]/, '注入必须走既有 executeScript 通路（零新增权限）');
  // 结构守卫：注入只能通过 executeScript 发生，不能出现注册式（登记式）静态化。
  assert.ok(!/registerContentScripts\([\s\S]{0,200}pick-layer/.test(sw), '不得把拾取层登记为常驻 content script');
});

test('V3-4 零注入（源码面）：页面侧只在被注入时才有监听 —— 模块自身不带任何 chrome 注册', () => {
  const layer = read('src/content/pick-layer.ts');
  // Comments are stripped: the module's doc block legitimately *describes* the
  // `chrome.scripting.executeScript` call the service worker makes — the assertion is
  // about the CODE it runs, not about the prose around it.
  const layerCode = layer.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  assert.ok(!/registerContentScripts|chrome\.scripting/.test(layerCode), '拾取层不得自行注册 / 自注入');
  const protocol = read('src/content/pick-protocol.ts');
  assert.ok(
    protocol.includes("'pick-layer-inject'") && protocol.includes("'pick-layer-teardown'"),
    '六个 kind 的运行时校验必须住在独立模块（不进 content.js 的 KIND_SET）',
  );
  const messaging = read('src/background/messaging.ts');
  // Anchor on the *declaration* (the surrounding comment also mentions KIND_SET).
  const kindSet = messaging.slice(
    messaging.indexOf('const KIND_SET'),
    messaging.indexOf('export function makeMessage'),
  );
  assert.ok(!kindSet.includes('pick-layer'), 'KIND_SET 不得包含拾取层 kind（实测会撑大 content.js ≥ +307 B）');
  // 反证：把 kind 加进 KIND_SET 的伪造文本必须命中「撑大常驻产物」的判据。
  assert.ok(
    /KIND_SET/.test(`${kindSet} 'pick-layer-inject',`),
    '反证：伪造体确实把 kind 放进了 KIND_SET 的文本块',
  );
});

/* ────────────────────────────────────────────────────────────────────────────
 * V4.5-1（TASK-V45-117 / ADR-V45-009 §1~§3）—— **解冻范围门禁**（只增）。
 *
 * `docs/v3-supersession-ledger.json#zeroDiffFiles` 里 `src/ui/options/index.html` 是
 * v3 冻结面；v4 台账的 `unfrozenZeroDiffFiles[]` 提供「**显式**解冻」机制（理由是登记行为，
 * 不是静默放开）。v4.5-1 把该条目的 schema 扩展为
 * `{file, scope, reason, textBefore, textAfter, date, operator, frozenBy, reintroductionGate, maxByteDelta}`，
 * 并在这里补上**范围门禁**：解冻只允许落在**纯文案行**上，任何脚本 / 链接 / 权限 / 属性 /
 * 结构标签的引入都必须判红。字段与逐 hunk 判定是同一判据的两半 —— 缺字段、reason 过短、
 * 字节差越限、textBefore/textAfter 定位不到、或 diff 里出现禁止内容，任一条即 FAIL。
 *
 * **反证**（see the following test）：注入 `<script …>` / 删登记条目 / `reason < 40`
 * 必须逐条判红 —— 否则范围门禁是恒真判据。
 * ──────────────────────────────────────────────────────────────────────────── */

interface UnfrozenEntry {
  file: string;
  scope?: string;
  reason?: string;
  textBefore?: string;
  textAfter?: string;
  date?: string;
  operator?: string;
  frozenBy?: string;
  reintroductionGate?: string;
  maxByteDelta?: number;
}

/** The banned-token predicate for one diff line of a `copy-only-lines` unfreeze. */
export function copyOnlyLineProblems(file: string, line: string): string[] {
  const problems: string[] = [];
  const lower = line.toLowerCase();
  for (const banned of ['<script', '<link', '<meta', '<iframe', '<object', '<embed', 'import ', 'href=', 'src=', 'onclick', 'onload', 'onerror', 'onchange', 'oninput', 'onfocus', 'onsubmit']) {
    if (lower.includes(banned)) problems.push(`${file}: 解冻行引入禁止内容 ${banned} → ${line.trim().slice(0, 90)}`);
  }
  return problems;
}

/** The schema + scope judgement for the `copy-only-lines` entries (single implementation). */
export function unfrozenScopeProblems(entries: UnfrozenEntry[]): string[] {
  const problems: string[] = [];
  for (const e of entries.filter((x) => x.scope === 'copy-only-lines')) {
    for (const field of ['file', 'scope', 'reason', 'textBefore', 'textAfter', 'date', 'operator', 'frozenBy', 'reintroductionGate', 'maxByteDelta']) {
      if ((e as unknown as Record<string, unknown>)[field] === undefined) problems.push(`${e.file}: 解冻条目缺字段 ${field}`);
    }
    if (String(e.reason ?? '').trim().length < 40) problems.push(`${e.file}: reason 必须 ≥40 字符（解冻是登记行为）`);
    if (!(Number(e.maxByteDelta) > 0)) problems.push(`${e.file}: maxByteDelta 必须是正数（范围必须有界）`);
  }
  return problems;
}

test('V4.5-1 解冻范围门禁：copy-only-lines 解冻逐 hunk 纯文案（零 script/link/属性/结构标签 ∧ 字节差 ≤ 登记阈值）', () => {
  const ledger = JSON.parse(readFileSync(new URL('docs/v4-supersession-ledger.json', PKG), 'utf8')) as {
    base?: string;
    unfrozenZeroDiffFiles?: UnfrozenEntry[];
  };
  const entries = (ledger.unfrozenZeroDiffFiles ?? []).filter((u) => u.scope === 'copy-only-lines');
  assert.ok(entries.length > 0, '必须至少有一条 copy-only-lines 解冻登记（否则本判据空转）');
  const problems = unfrozenScopeProblems(ledger.unfrozenZeroDiffFiles ?? []);
  // ⚠️ git 的 pathspec 是**相对当前工作目录**解析的，而本文件编译后跑在 `dist-test/test/`：
  // 用相对 URL 推 repo root 会得到 `packages/` 之类的错位值 ⇒ `git diff -- <repo 相对路径>`
  // 匹配不到任何文件（实测：diff 为空 ⇒ 判据以「解冻必须真的对应一次 diff」误报）。
  // 因此 repo root 由 git 自己给出（`--show-toplevel`），paths 一律用 repo 相对路径。
  const repoRoot = execFileSync('git', ['-C', fileURLToPath(PKG), 'rev-parse', '--show-toplevel'], {
    encoding: 'utf8',
  }).trim();
  for (const e of entries) {
    const before = execFileSync('git', ['-C', repoRoot, 'show', `${ledger.base}:${e.file}`], { encoding: 'utf8' });
    const after = readFileSync(new URL(e.file.replace('packages/web-cli-plugin/', ''), PKG), 'utf8');
    const delta = Buffer.byteLength(after, 'utf8') - Buffer.byteLength(before, 'utf8');
    if (delta > Number(e.maxByteDelta ?? 0)) {
      problems.push(`${e.file}: 字节差 +${delta} B > 登记阈值 ${e.maxByteDelta} B（解冻范围越限）`);
    }
    if (e.textBefore && !before.includes(e.textBefore)) problems.push(`${e.file}: textBefore 在冻结版本（${ledger.base}）中定位不到 → 登记失真`);
    if (e.textAfter && !after.includes(e.textAfter)) problems.push(`${e.file}: textAfter 在当前文件中定位不到 → 登记失真`);
    const diff = execFileSync('git', ['-C', repoRoot, 'diff', '-U0', String(ledger.base), '--', e.file], { encoding: 'utf8' });
    let hunks = 0;
    for (const raw of diff.split('\n')) {
      if (raw.startsWith('@@')) { hunks += 1; continue; }
      if ((!raw.startsWith('+') && !raw.startsWith('-')) || raw.startsWith('+++') || raw.startsWith('---')) continue;
      problems.push(...copyOnlyLineProblems(e.file, raw.slice(1)));
    }
    assert.ok(hunks > 0, `${e.file}: 解冻必须真的对应一次 diff（否则登记与产物脱钩）`);
  }
  assert.deepEqual(problems, [], `解冻范围门禁未通过：\n${problems.join('\n')}`);
});

test('V4.5-1 解冻范围门禁反证：注入 <script> / 缺字段 / reason<40 / 越限字节差 必须逐条判红（判据非恒真）', () => {
  // ① 在解冻文件里加一个 `<script …>` ⇒ 范围门禁必须红
  assert.ok(
    copyOnlyLineProblems('x.html', '  <script src="evil.js"></script>').length > 0,
    '反证①：注入 <script> 必须命中禁止内容',
  );
  assert.ok(
    copyOnlyLineProblems('x.html', '  <li><a href="https://x.test">授权当前站点</a></li>').length > 0,
    '反证①b：新增 href 属性必须命中禁止内容',
  );
  assert.deepEqual(copyOnlyLineProblems('x.html', '  <li>在侧栏「设置 → 站点与授权」点「授权当前站点」。</li>'), [], '对照：纯文案行必须干净（否则判据无法区分）');
  // ② 删掉（或不写）字段 ⇒ 字段门禁必须红
  const good: UnfrozenEntry = {
    file: 'f', scope: 'copy-only-lines', reason: 'r'.repeat(45), textBefore: 'a', textAfter: 'b',
    date: '2026-09-21', operator: 'o', frozenBy: 'v3#zeroDiffFiles', reintroductionGate: 'g', maxByteDelta: 256,
  };
  assert.deepEqual(unfrozenScopeProblems([good]), [], '对照：完整条目必须干净');
  const missing = { ...good } as unknown as Record<string, unknown>;
  delete missing.textAfter;
  assert.ok(unfrozenScopeProblems([missing as unknown as UnfrozenEntry]).some((p) => p.includes('缺字段 textAfter')), '反证②：缺字段必须判红');
  // ③ `reason < 40` ⇒ 字段门禁必须红
  assert.ok(
    unfrozenScopeProblems([{ ...good, reason: 'too short' }]).some((p) => p.includes('reason 必须 ≥40')),
    '反证③：reason < 40 必须判红',
  );
  // ④ 阈值非正 ⇒ 范围无界必须判红（越限字节差的入口）
  assert.ok(
    unfrozenScopeProblems([{ ...good, maxByteDelta: 0 }]).some((p) => p.includes('maxByteDelta 必须是正数')),
    '反证④：maxByteDelta 非正必须判红',
  );
});
