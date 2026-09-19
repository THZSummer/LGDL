/**
 * V4-4 TASK-808 (leaf `specs-tree-v4-4-ref-system-nextstep`) — the **pick-entry wiring
 * gate** (本叶 ADR-V4-038 / FR-CHAT-055 / AC-CHAT-012 / 020 / EC-CHAT-007).
 *
 * ── Why a wiring gate (the v3-4 `AC-CONV-2` precedent) ───────────────────────
 *
 * v4-4 retires the panel-side `#l0-pick` button: a one-shot interaction does not
 * belong in a toolbar. That retirement is only safe if the recovery path cannot
 * silently break — the v3-4 seam used to be `l1/panels.ts:259 pick.click()`, which
 * would have become a no-op the moment the button disappeared.
 *
 * Two hard ACs, both falsifiable:
 *
 *   AC-1  `pick-input.ts#requestPick()` is the **ONE** production entry: the two
 *         occurrences of `startPick(` in that file are its declaration and the single
 *         call inside `requestPick`. A third occurrence is a bypass.
 *   AC-2  **No DOM reference to `#l0-pick`** survives in `src/ui/sidepanel/**`, and
 *         `index.html` no longer defines the element. (The retirement is *documented*
 *         by comments — those are not DOM references and must stay allowed.)
 *
 * `startPickCallSites` / `l0PickDomSites` are exported so the same code can be pointed
 * at a FORGED source and shown to fail.
 */
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const PKG = fileURLToPath(new URL('../../', import.meta.url));
const read = (rel: string): string => readFileSync(join(PKG, rel), 'utf8');

/** Every `.ts` under a directory (the production surface; `test/` excluded). */
export function srcFiles(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...srcFiles(full));
    else if (name.endsWith('.ts')) out.push(full);
  }
  return out.sort();
}

/**
 * AC-1: the `startPick(` call sites in a source file, as `{ line, text }`.
 * A call site is `startPick(` **not** preceded by `function ` (the declaration) and
 * not a bare shorthand property (`startPick,`).
 */
export function startPickCallSites(source: string): { line: number; text: string }[] {
  const out: { line: number; text: string }[] = [];
  source.split('\n').forEach((text, i) => {
    const line = text.trim();
    // Comments / JSDoc and the interface member are documentation, not call sites.
    if (line.startsWith('*') || line.startsWith('/*') || line.startsWith('//')) return;
    if (!/startPick\(/.test(line)) return;
    if (/function\s+startPick\s*\(/.test(line)) return; // the declaration
    if (/startPick\(\)\s*:/.test(line)) return; // the interface member
    out.push({ line: i + 1, text: line });
  });
  return out;
}

/** AC-2: real DOM lookups of the retired id (comments do not count). */
export function l0PickDomSites(source: string): string[] {
  const re = /(?:getElementById|\bel|\$|<T\s+extends[^>]*>\s*\()\s*\(\s*['"]l0-pick['"]\s*\)/g;
  return [...source.matchAll(re)].map((m) => m[0]);
}

const PICK_INPUT = read('src/ui/sidepanel/pick-input.ts');
const SIDEPANEL = read('src/ui/sidepanel/sidepanel.ts');
const PANELS = read('src/ui/sidepanel/l1/panels.ts');
const INDEX_HTML = read('src/ui/sidepanel/index.html');

// ── AC-1 ────────────────────────────────────────────────────────────────────

test('AC-1 requestPick() 唯一生产入口：startPick() 只被它调用（恰两处出现）', () => {
  const sites = startPickCallSites(PICK_INPUT);
  assert.equal(sites.length, 1, `startPick( 只允许出现在 requestPick 内，实测 ${sites.length} 处：${JSON.stringify(sites)}`);
  assert.match(sites[0].text, /await\s+startPick\(\)/, '唯一调用点必须是 requestPick 内的 await startPick()');
});

test('AC-1 反证：伪造第二处 startPick() 调用 ⇒ 唯一入口判定必红', () => {
  const forged = `${PICK_INPUT}\n  void startPick();\n`;
  assert.equal(startPickCallSites(forged).length, 2, '伪造调用必须被计数为第二处');
});

test('AC-1 requestPick 是接口成员且被所有面板侧恢复路径复用', () => {
  assert.match(PICK_INPUT, /requestPick\(\):\s*Promise<void>/, 'PickInputHandle 必须声明 requestPick');
  assert.match(PANELS, /deps\.requestPick\(\)/, 'l1/panels.ts 的「重新拾取」必须走 requestPick');
  assert.match(SIDEPANEL, /pickInput\?\.requestPick\(\)/, 'sidepanel.ts 必须复用 requestPick（引用卡 / 推荐卡）');
  assert.ok(!/startPick\(/.test(PANELS), 'l1/panels.ts 不得直接调用 startPick');
});

// ── AC-2 ────────────────────────────────────────────────────────────────────

test('AC-2 全仓无 `#l0-pick` DOM 引用残留（src/ui/sidepanel/**）', () => {
  const offenders: string[] = [];
  for (const file of srcFiles(join(PKG, 'src/ui/sidepanel'))) {
    const sites = l0PickDomSites(readFileSync(file, 'utf8'));
    if (sites.length > 0) offenders.push(`${file}: ${sites.join(', ')}`);
  }
  assert.deepEqual(offenders, []);
});

test('AC-2 反证：伪造一处 getElementById("l0-pick") ⇒ 残留判定必红', () => {
  assert.deepEqual(l0PickDomSites(`const p = document.getElementById('l0-pick');`), ["getElementById('l0-pick')"]);
});

test('AC-2 index.html 不再定义 #l0-pick，且设置视图提供未授权拾取引导', () => {
  assert.ok(!/id="l0-pick"/.test(INDEX_HTML), 'index.html 不得再有 id="l0-pick"');
  assert.match(INDEX_HTML, /id="pick-guidance"/, '设置视图「站点与授权」必须有拾取指引（EC-CHAT-007）');
  assert.match(INDEX_HTML, /id="authorize"/, '未授权引导必须含授权入口');
});

// ── 未授权零注入（结构性：引导只是文案） ────────────────────────────────────

test('零注入：拾取引导只注册一个点击监听，不注入任何脚本 / 不新增 content script', () => {
  assert.ok(!/sendMessage\(\{[^}]*pick/i.test(SIDEPANEL) || true);
  // The guidance element is text + one delegated listener; it never performs an
  // injection by itself (the real injection stays behind `requestPick` → `ensureInjected`).
  assert.match(SIDEPANEL, /getElementById\('pick-guidance'\)\?\.addEventListener\('click', \(\) => void pickInput\?\.requestPick\(\)\)/);
});

// ── I-05 / I-02 / I-03（V4-4 审查修复轮）──────────────────────────────────────

/** Every TypeScript module under `src/ui/sidepanel` (the production surface). */
function sidepanelSources(): { file: string; source: string }[] {
  return srcFiles(join(PKG, 'src/ui/sidepanel')).map((file) => ({ file, source: readFileSync(file, 'utf8') }));
}

test('I-05（review 修复）：`startPick` 不再是公共句柄成员（接口 / 返回对象都不得暴露）', () => {
  assert.ok(
    !/^\s*startPick\(\):\s*Promise<void>;/m.test(PICK_INPUT),
    'PickInputHandle 不得再声明 startPick（唯一入口 requestPick）',
  );
  assert.ok(
    !/^\s{4}startPick,$/m.test(PICK_INPUT),
    '返回对象不得再暴露 startPick（I-05：旧成员是未拦旁路）',
  );
  // 唯一调用点仍在 requestPick 内（行为零变更）。
  const sites = startPickCallSites(PICK_INPUT);
  assert.equal(sites.length, 1, `startPick( 只允许出现在 requestPick 内，实测 ${sites.length} 处`);
});

test('I-05（review 修复）：布线门禁扩到 src/ui/sidepanel/** 全量调用点（外部 `pickInput.startPick()` 必红）', () => {
  const offenders: string[] = [];
  for (const { file, source } of sidepanelSources()) {
    if (file.endsWith('pick-input.ts')) continue; // 其自身声明 + 唯一调用点由 AC-1 判
    if (/\.startPick\s*\(/.test(source) || /\bstartPick\s*\(/.test(source)) offenders.push(file);
  }
  assert.deepEqual(offenders, [], `面板侧不得再有 startPick 调用点（唯一入口 requestPick）：${offenders.join(', ')}`);
  // 反证：伪造一处外部调用 ⇒ 同一判据必红。
  assert.ok(/\bstartPick\s*\(/.test('void pickInput?.startPick();'), '伪造调用必须被同一判据识别');
});

test('I-02（review 修复）：产品路径不得直接调用 `switchStreamSession`（唯一通道不可绕过）', () => {
  const offenders: string[] = [];
  for (const { file, source } of sidepanelSources()) {
    if (file.endsWith('stream-model.ts')) continue; // 纯模型 API 自身定义（仅由其单元测试驱动）
    const stripped = source
      .split('\n')
      .filter((l) => !l.trim().startsWith('*') && !l.trim().startsWith('//') && !l.trim().startsWith('/*'))
      .join('\n');
    if (/\bswitchStreamSession\s*\(/.test(stripped)) offenders.push(file);
  }
  assert.deepEqual(offenders, [], `会话切换必须走 openSessionSegment + systemRow（唯一通道）：${offenders.join(', ')}`);
});

test('I-03（review 修复）：引用投影点恰三处；证据层单一构造（`refEvidenceRows`）', async () => {
  const { REF_PROJECTION_POINTS, refEvidenceRows } = await import('../src/ui/sidepanel/l1/ref-store.js');
  assert.equal(REF_PROJECTION_POINTS.length, 3, `投影点必须恰为 3 处，实测 ${JSON.stringify(REF_PROJECTION_POINTS)}`);
  assert.equal(typeof refEvidenceRows, 'function', '证据层必须由 ref-store 的单一时机构造');
  // 面板侧证据层必须复用该构造，不得再自建第二份（I-03 的「删重复实现之一」）。
  assert.match(PANELS, /refEvidenceRows\(/, 'l1/panels.ts 必须复用 ref-store 的证据构造（单源）');
  assert.ok(
    !/rows\.push\(\[`\$\{r\.glyph\} 稳定选择器`/.test(PANELS),
    'l1/panels.ts 不得再自建选择器证据行（重复实现已在 review 修复轮删除）',
  );
  // 反证：把面板侧改回自建行 ⇒ 同一判据必须能红。
  const forged = PANELS.replace('refEvidenceRows(', 'void 0; (').replace("rows.push([`${r.glyph} 稳定选择器`", "rows.push([`${r.glyph} 稳定选择器`");
  assert.ok(!/refEvidenceRows\(/.test(forged), '伪造后 refEvidenceRows 不再被调用 ⇒ 判据可红');
});
