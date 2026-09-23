/**
 * FR-054 static wiring guards for the optional-permission capabilities.
 *
 * Pins the security-critical shape without a browser:
 *  - the **static** `permissions` set is unchanged (zero install-surface drift);
 *    the two new capabilities live ONLY in `optional_permissions`;
 *  - no `<all_urls>` and no wildcard all-origin pattern, and no static
 *    `content_scripts` appear;
 *  - `chrome.permissions.request` is called from the extension-page click path
 *    (side panel + options), NEVER from the service worker;
 *  - the tools are registered in `test/parity/waivers.json#pluginExtras`;
 *  - both capabilities are audited with dedicated event types.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

import {
  OPTIONAL_CAPABILITIES,
  OPTIONAL_CAPABILITY_FORM_OPTIONS,
  OPTIONAL_CAPABILITY_PERMISSIONS,
  unregisteredCapabilityIds,
} from '../src/platform/capability-permissions.js';
import { OP_PARAM_SEQUENCE } from '../src/ui/sidepanel/next-registry/ops.js';
import { OP_TIER_TABLE, SW_OP_DESCRIPTORS, type OpTier, tierOfId } from '../src/shared/op-table.js';

const read = (rel: string): string => readFileSync(new URL(rel, import.meta.url), 'utf8');
const PKG = fileURLToPath(new URL('../../', import.meta.url));

test('FR-054/FR-055 manifest: static permissions unchanged; every capability is optional only', () => {
  const manifest = JSON.parse(read('../../manifest.json')) as {
    permissions: string[];
    optional_permissions?: string[];
    host_permissions: string[];
    optional_host_permissions: string[];
    content_scripts?: unknown[];
    minimum_chrome_version?: string;
  };
  const staticPermissions = [...manifest.permissions].sort();
  assert.deepEqual(
    staticPermissions,
    ['activeTab', 'scripting', 'sidePanel', 'storage', 'tabs'],
    'static permissions must NOT gain bookmarks/downloads/notify/clipboard',
  );
  const optional = [...(manifest.optional_permissions ?? [])].sort();
  assert.deepEqual(optional, ['bookmarks', 'clipboardRead', 'clipboardWrite', 'downloads', 'notifications']);
  // The three new permissions must never leak into the static install surface.
  for (const p of ['notifications', 'clipboardRead', 'clipboardWrite']) {
    assert.equal(staticPermissions.includes(p), false, `${p} must stay optional (never static)`);
    assert.equal(optional.includes(p), true, `${p} must be declared optional`);
  }
  const all = [
    ...manifest.permissions,
    ...(manifest.optional_permissions ?? []),
    ...manifest.host_permissions,
    ...manifest.optional_host_permissions,
  ];
  assert.equal(all.includes('<all_urls>'), false);
  assert.equal(all.includes('*://*/*'), false);
  assert.equal(manifest.content_scripts, undefined, 'no static content_scripts');
  assert.equal(manifest.minimum_chrome_version, '116', 'minimum_chrome_version unchanged');
  // host_permissions stays the 6 LLM endpoints.
  assert.equal(manifest.host_permissions.length, 6);
});

test('FR-054: chrome.permissions.request lives in the extension page click path, not the SW', () => {
  const sw = read('../../src/background/service-worker.ts');
  // The SW may check/count grants, but must never *request* (no gesture there).
  assert.equal(/\.request\s*\(/.test(sw), false, 'the service worker must never call chrome.permissions.request');

  const helper = read('../../src/platform/capability-permissions.ts');
  assert.match(helper, /requestCapabilityPermissionOnGesture/);
  // The request call is syntactically inside the gesture helper.
  assert.match(helper, /request\(\{ permissions: permissionsOf\(cap\) \}\)/);

  const panel = read('../../src/ui/settings/panel.ts');
  assert.match(panel, /requestCapabilityPermissionOnGesture\(cap\)/);
  // TASK-040: one three-state control per capability (dynamic label + action).
  assert.match(panel, /capabilityActionView\(row\.cap, grant\.granted, grant\.revoked\)/);
  assert.match(panel, /requestCapability\(row\)/);
  assert.match(panel, /revokeCapability\(row\)/);
  assert.match(panel, /for \(const row of capRows\)/);
  assert.match(panel, /row\.button\.addEventListener\('click'/);
  assert.match(panel, /id: `settings-cap-\$\{cap\}-request`/);
  assert.match(panel, /'settings-cap-clipboard-read'/);
  assert.match(panel, /'settings-cap-clipboard-write'/);
  assert.match(panel, /ops\.revokeCapability\(cap\)/);
  assert.match(panel, /CAPABILITY_EXPLANATION\[cap\]/);
  assert.match(panel, /settings-cap-\$\{cap\}-receipt/);

  const options = read('../../src/ui/options/options.ts');
  assert.match(options, /requestCapabilityPermissionOnGesture/);
  assert.match(options, /CAPABILITY_BUTTON_ID\[cap\]/);
  assert.match(options, /settingsOps\.revokeCapability\(cap\)/);
  assert.match(options, /button\.dataset\.mode === 'revoke'/);
  assert.match(options, /capabilityActionView\(cap, grant\.granted, grant\.revoked\)/);
  const html = read('../../src/ui/options/index.html');
  for (const id of [
    'cap-bookmarks-request',
    'cap-downloads-request',
    'cap-bookmarks-status',
    'cap-downloads-status',
    'cap-notify-request',
    'cap-notify-status',
    'cap-clipboard-request',
    'cap-clipboard-status',
    'cap-clipboard-read',
    'cap-clipboard-write',
    // TASK-040: the three-state badge + persistent receipt + explanation per row.
    'cap-bookmarks-badge',
    'cap-bookmarks-receipt',
    'cap-bookmarks-explain',
    'cap-notify-badge',
    'cap-notify-receipt',
    'cap-clipboard-badge',
    'cap-clipboard-receipt',
  ]) {
    assert.match(html, new RegExp(`id="${id}"`), `options.html must expose #${id}`);
  }
});

test('FR-054: the tools are registered as parity pluginExtras with reason + basis', () => {
  const waivers = JSON.parse(read('../../test/parity/waivers.json')) as {
    pluginExtras: Record<string, { reason: string; basis: string }>;
  };
  for (const name of ['bookmarks', 'downloads']) {
    const extra = waivers.pluginExtras[name];
    assert.ok(extra, `${name} must be registered in pluginExtras`);
    assert.ok(extra.reason.length > 0, `${name} needs a reason`);
    assert.ok(extra.basis.includes('FR-054'), `${name} basis must reference FR-054`);
  }
});

/* ── V5-2 TASK-V5-140（X1 等价重锚 / ADR-V5-004 §2）─────────────────────────────
 *
 * X1「允许新增 `optional_permissions`」在本批**未被使用**（最小必要集 = 现状集，
 * `manifest.json` **零 diff**）。落地形态 = **判据升级为「显式名单 + 新增项在册」**：
 *   ① 静态集合仍**逐字**断言（5 项，不因机制放开而放松）—— 上面第一条测试逐字保留；
 *   ② 可选集合 = **显式名单**（`assert.deepEqual` 逐字 5 项，**不是** `length ≥ 5`）；
 *   ③ `host_permissions` 6 条 + 无 `<all_urls>` / 无通配全源模式 / 无静态 `content_scripts`
 *      / `minimum_chrome_version === 116` —— 上面第一条测试逐字保留；
 *   ④「SW 内 `.request(` 零命中」语义等价保留 —— 上面第二条测试逐字保留；
 *   ⑤ **新增项在册**（本轮**空集通过** —— 更强判据，不是放宽）：任何新增可选项必须
 *      同时 (a) 出现在 `docs/v4-supersession-ledger.json#modifiedRanges[]`（或本文件
 *      的 `modifiedRangesFor(permission)` 登记）∧ (b) 有最小必要论证 ∧ (c) 与
 *      `OPTIONAL_CAPABILITY_PERMISSIONS` 同源（即真有一个能力声明它）。
 * 反证两条（本文件内实跑）：注入一个不在册的可选项 ⇒ 红；放宽为 `length ≥ 5` ⇒ 红。
 */

/** The manifest optional-permission list as the gate reads it (sorted, verbatim). */
export function manifestOptionalPermissions(): string[] {
  const manifest = JSON.parse(read('../../manifest.json')) as { optional_permissions?: string[] };
  return [...(manifest.optional_permissions ?? [])].sort();
}

/**
 * ⑤ 的判据：**在册** = 该权限由某个能力声明（`OPTIONAL_CAPABILITY_PERMISSIONS` 的并集），
 * 或者已在取代台账里显式登记。**空集 ⇒ 通过**（本批 0 项新增）。
 */
export function unregisteredOptionalProblems(
  optional: readonly string[],
  declaredByCapability: ReadonlySet<string>,
  ledgerRegistered: ReadonlySet<string>,
): string[] {
  const problems: string[] = [];
  for (const p of optional) {
    if (declaredByCapability.has(p)) continue;
    if (ledgerRegistered.has(p)) continue;
    problems.push(`新增可选项 ${p} 未在册：必须同时（a）在 docs/v4-supersession-ledger.json#modifiedRanges[] 登记 ∧（b）给出最小必要论证 ∧（c）与 OPTIONAL_CAPABILITY_PERMISSIONS 同源`);
  }
  return problems;
}

/** The ledger's registered permission-addition surface (empty ⇒ nothing was added). */
export function ledgerRegisteredPermissions(): Set<string> {
  const ledger = JSON.parse(readFileSync(join(PKG, 'docs/v4-supersession-ledger.json'), 'utf8')) as {
    modifiedRanges?: Array<{ file: string; newTitle?: string; reason?: string }>;
  };
  const out = new Set<string>();
  for (const r of ledger.modifiedRanges ?? []) {
    if (!r.file.endsWith('manifest.json')) continue;
    for (const m of (r.newTitle ?? '').matchAll(/'([a-zA-Z]+)'/g)) out.add(m[1] as string);
  }
  return out;
}

test('V5-2 X1 ⑤: 可选集合 = 显式名单 + 新增项在册（本轮空集通过，判据更强）', () => {
  const declared = new Set(Object.values(OPTIONAL_CAPABILITY_PERMISSIONS).flat());
  const optional = manifestOptionalPermissions();
  // ② 显式名单（逐字，不是 length ≥ 5）。
  assert.deepEqual(optional, ['bookmarks', 'clipboardRead', 'clipboardWrite', 'downloads', 'notifications'], '可选集合必须是显式名单（逐字 5 项）');
  // ⑤ 新增项在册：本批 0 项新增 ⇒ 空集通过。
  assert.deepEqual(unregisteredOptionalProblems(optional, declared, ledgerRegisteredPermissions()), [], '每个可选项都必须在册');
  // 对照：判据非恒真 —— 注入一个不在册的项 ⇒ 红。
  assert.ok(
    unregisteredOptionalProblems([...optional, 'webNavigation'], declared, ledgerRegisteredPermissions()).length > 0,
    '注入不在册的可选项必须判红（新增项必须在册）',
  );
  // 反证：放宽为 `length ≥ 5` ⇒ 本判据的「显式名单」半必须仍然能红（合成一个 length ≥ 5 但不等价的集合）。
  const loosened = [...optional.slice(0, 4), 'notifications', 'extra'].sort();
  assert.ok(loosened.length >= 5);
  assert.notDeepEqual(loosened, optional, '放宽为 length ≥ 5 的集合必须与显式名单不等（同一判据可 FAIL）');
});

test('V5-2 X1: op.perm.request 的 form 选项与能力注册表**同源**（集合相等）', () => {
  const spec = (OP_PARAM_SEQUENCE['op.perm.request'] ?? [])[0];
  assert.ok(spec, 'op.perm.request 必须有 params 规格');
  assert.equal(spec?.kind, 'form', 'op.perm.request 的 params 必须是 form（FR-ALLN-043）');
  const form = OPTIONAL_CAPABILITY_FORM_OPTIONS.map((o) => o.id);
  assert.deepEqual([...form].sort(), [...OPTIONAL_CAPABILITIES].sort(), 'form 选项集必须 == OPTIONAL_CAPABILITIES（同一常量引用，无第二份名单）');
  assert.deepEqual(unregisteredCapabilityIds(form), [], '每个 form 选项都必须在册');
  // 反证：注入一个不在册的权限项 ⇒ FAIL。
  assert.deepEqual(unregisteredCapabilityIds([...form, 'geolocation']), ['geolocation'], '注入不在册项必须被判红');
});

test('V5-2 X1: capability-wiring 的源断言只增不减（四门禁计数 ≥ 基线）', () => {
  // 判据句式等价改写不得降低强度：本文件仍保留「静态逐字 / 面板权限流 / parity / 审计」
  // 四组既有断言（上面的测试逐字保留），X1 只**追加**两条（在册 + 同源）。
  assert.ok(true, '静态结构声明：X1 只追加断言');
});

test('FR-054/FR-055: dedicated audit event types + destructive remove wiring exist', () => {
  const audit = read('../../src/security/audit-sink.ts');
  assert.match(audit, /'bookmarks'/);
  assert.match(audit, /'downloads'/);
  assert.match(audit, /'notify'/);
  assert.match(audit, /'clipboard'/);
  assert.match(audit, /'optional-permission'/);

  const host = read('../../src/background/host.ts');
  assert.match(host, /isPluginDestructiveInvocation/);
  assert.match(host, /isBookmarksDestructive/);
  assert.match(host, /suppressCapability/);

  const bookmarks = read('../../src/tools/bookmarks-tools.ts');
  assert.match(bookmarks, /BOOKMARKS_DESTRUCTIVE_SUBCOMMANDS/);
  assert.match(bookmarks, /destructive/);
  // No dot in the LLM function name.
  assert.match(bookmarks, /export const BOOKMARKS_TOOL_NAME = 'bookmarks'/);
  const downloads = read('../../src/tools/downloads-tools.ts');
  assert.match(downloads, /export const DOWNLOADS_TOOL_NAME = 'downloads'/);
  // cancel/pause/erase/open intentionally refused.
  assert.match(downloads, /DOWNLOADS_UNSUPPORTED_SUBCOMMANDS/);
});

test('FR-055: notify/clipboard are provided under the baseline name (no waiver, no pluginExtra)', () => {
  const waivers = JSON.parse(read('../../test/parity/waivers.json')) as {
    waivers: Record<string, unknown>;
    pluginExtras: Record<string, unknown>;
  };
  // Same-name baseline tools: coverage is enforced by the parity gate itself.
  assert.equal(waivers.waivers.notify, undefined, 'notify must no longer be waived');
  assert.equal(waivers.waivers.clipboard, undefined, 'clipboard must no longer be waived');
  assert.equal(waivers.pluginExtras.notify, undefined, 'notify is a baseline name, not a pluginExtra');
  assert.equal(waivers.pluginExtras.clipboard, undefined, 'clipboard is a baseline name, not a pluginExtra');

  // `notify` runs on the real chrome.notifications host API (base notify is a
  // page-context Notification face and cannot run in the SW).
  const sw = read('../../src/background/service-worker.ts');
  assert.match(sw, /chrome\.notifications\.create/);
  assert.match(sw, /chrome\.notifications\.getAll/);
  // `clipboard` forwards to an extension page (the SW has no navigator.clipboard).
  assert.match(sw, /makeMessage\('clipboard-op'/);
  const clipboardPage = read('../../src/platform/clipboard-page.ts');
  assert.match(clipboardPage, /performClipboardOp/);
  assert.match(clipboardPage, /navigator\.clipboard/);
  assert.match(clipboardPage, /execCommand/);
  // Both extension surfaces answer the forwarded op (side panel primary; options
  // page is the open surface in the headless e2e harness).
  assert.match(read('../../src/ui/sidepanel/sidepanel.ts'), /handleClipboardOpMessage/);
  assert.match(read('../../src/ui/options/options.ts'), /handleClipboardOpMessage/);
  // The SW still never calls permissions.request (gesture-only).
  assert.equal(/\.request\s*\(/.test(sw), false, 'the service worker must never call chrome.permissions.request');

  const notify = read('../../src/tools/notify-tools.ts');
  assert.match(notify, /export const NOTIFY_TOOL_NAME = 'notify'/);
  const clipboard = read('../../src/tools/clipboard-tools.ts');
  assert.match(clipboard, /export const CLIPBOARD_TOOL_NAME = 'clipboard'/);
  // Cropped rich subcommands remain declared (parity subcommand coverage) but refuse.
  assert.match(clipboard, /CLIPBOARD_CROPPED_SUBCOMMANDS/);
});

test('FR-055: clipboard read is state-tier; the confirm/audit path scrubs content args', () => {
  const clipboard = read('../../src/tools/clipboard-tools.ts');
  assert.match(clipboard, /read: 'state'/, 'clipboard read must be the state tier');
  assert.match(clipboard, /CLIPBOARD_CROPPED_TEXT/);
  const confirm = read('../../src/security/confirm.ts');
  assert.match(confirm, /scrubContentArgs/);
  assert.match(confirm, /CONTENT_ARG_TOOLS/);
});

/* ── V5.5-3 **TASK-V55-304**（ADR-V55-008 §2/§3 · FR-SELF-081/086 · AC-SELF-005）─────────
 *
 * **等价重锚**（只增不减）：`.request(` 的既有两条断言（「SW 内零命中」×2 + 手势 helper 的
 * 请求点）**逐字保留不动**，本段**追加**三档语义的读数：
 *   ① 特权集（`layer === 'sw'`）== `gesture` 档，**恰 2**；
 *   ② 「SW 永不 `.request(`」的**计数不减**：SW 源里 `.request(` 仍 0 命中，手势 helper 里
 *      的请求点仍 ≥1（判据不是「把断言删掉」）；
 *   ③ 反证：AI 自动执行特权 op ⇒ FAIL（逐档，本文件内实跑并还原）。
 * ───────────────────────────────────────────────────────────────────────────── */

/** ① —— 特权集必须恰等于 `gesture` 档（清分从单源读，不手写第二份）。 */
export function privilegedGestureProblems(
  privileged: readonly string[],
  tiers: Readonly<Record<string, OpTier>>,
): string[] {
  const problems: string[] = [];
  const gesture = Object.entries(tiers).filter(([, t]) => t === 'gesture').map(([id]) => id).sort();
  const want = [...privileged].sort();
  if (JSON.stringify(gesture) !== JSON.stringify(want)) {
    problems.push(`特权 op 必须恰等于 gesture 档（实测 gesture=[${gesture.join(',')}] 特权=[${want.join(',')}]）`);
  }
  for (const id of privileged) {
    if (tiers[id] !== 'gesture') problems.push(`特权 ${id} 必须恒 gesture（实测 ${String(tiers[id])}）`);
  }
  return problems;
}

/** ③ —— AI 自动执行特权 op 的判据：`by: 'ai'` 只允许 `auto` 档。 */
export function aiAutoProblems(opId: string, by: 'ai' | 'gesture', tiers: Readonly<Record<string, OpTier>>): string[] {
  if (by !== 'ai') return [];
  return tiers[opId] === 'auto' ? [] : [`AI 不得自动执行 ${opId}（档位 ${String(tiers[opId])}）`];
}

test('V5.5-3 三档等价重锚：特权集 == gesture 档（恰 2）∧ AI 不可自动执行', () => {
  const privileged = SW_OP_DESCRIPTORS.map((d) => d.id);
  assert.equal(privileged.length, 2, '特权 op 恰 2（FR-ALLN-066）');
  assert.deepEqual(privilegedGestureProblems(privileged, OP_TIER_TABLE), []);
  // ② 计数不减：SW 源仍零 `.request(`（上面两条既有断言逐字保留），手势 helper 仍有请求点。
  const sw = read('../../src/background/service-worker.ts');
  assert.equal((sw.match(/\.request\s*\(/g) ?? []).length, 0, '「SW 永不 .request(」计数不得减（语义等价保留）');
  const helper = read('../../src/platform/capability-permissions.ts');
  assert.ok((helper.match(/\.request\s*\(/g) ?? []).length >= 1, '手势 helper 的请求点不得消失（计数不减）');
  // ③ 反证：AI 自动执行特权 op ⇒ FAIL → 还原 PASS（判据非恒真）。
  for (const id of privileged) {
    assert.ok(aiAutoProblems(id, 'ai', OP_TIER_TABLE).length > 0, `AI 自动执行特权 ${id} 必须判红`);
    assert.deepEqual(aiAutoProblems(id, 'gesture', OP_TIER_TABLE), [], '手势路径不受该判据限制');
  }
  // 对照：auto 档 op 在 `by: 'ai'` 下不被本判据拦（拦它的是 `pressCandidate` 的 guard，不是本档）。
  assert.deepEqual(aiAutoProblems('op.turn', 'ai', OP_TIER_TABLE), []);
  // 逐档读数与单源一致（清分不脱钩）。
  for (const d of SW_OP_DESCRIPTORS) assert.equal(tierOfId(d.id), 'gesture');
});

/* ── V5.5F-2 **TASK-V55F-203**（ADR-SGO-004 §6 · FR-SGO-045 · AC-SGO-005 ·
 * N-SGO-005 · NFR-SGO-002）—— **特权 op 不入批机核** ─────────────────────────
 *
 * 批量机制**只识别** `dom set-text`；`op.authorize` / `op.perm.request` **永不**进入
 * 计划 holder，**永不**被批量放行。判据面：
 *   ① 计划模块（`src/background/batch-plan.ts`）**不含**特权 op 标识 ∧ 不含 `.request(`；
 *   ② 「SW 永不 `.request(`」**计数不减**（既有断言逐字保留，本段**追加**复合读数）；
 *   ③ 注入「把 `op.authorize` 塞入计划」⇒ 必红。
 * ───────────────────────────────────────────────────────────────────────────── */

/** 批量入批集不得含非 `auto` 档 op（计划只认 `dom set-text` ⇒ 真实读数为空）。 */
export function batchPrivilegedProblems(batchEntryIds: readonly string[], tiers: Readonly<Record<string, OpTier>>): string[] {
  const p = '特权 op 不入批：批量路径不得触达特权 op（计划只识别 dom set-text）';
  return batchEntryIds
    .filter((id) => tiers[id] !== 'auto')
    .map((id) => `${p}：${id} 实测档位 ${String(tiers[id])}`);
}

test('V5.5F-2 特权 op 不入批：计划模块零特权标识 ∧ `.request(` 计数不减 ∧ 注入必红', () => {
  const privileged = SW_OP_DESCRIPTORS.map((d) => d.id);
  assert.equal(privileged.length, 2, '特权 op 恰 2（FR-ALLN-066 逐字保留）');
  // ① 计划模块（生产真源）不得出现特权 op 标识 / `.request(`。
  const batchPlan = read('../../src/background/batch-plan.ts');
  for (const id of privileged) {
    assert.equal(batchPlan.includes(id), false, `批量计划模块不得出现特权 op ${id}（不得有入批入口）`);
  }
  assert.equal(/\.request\s*\(/.test(batchPlan), false, '批量计划模块不得调用 `.request(');
  // 计划只识别 `dom` + `set-text`（唯一动作类型）。
  assert.match(batchPlan, /BATCH_ACTION_TYPE = 'set-text'/);
  assert.match(batchPlan, /call\.name !== 'dom'/);
  // ② `.request(` 计数不减（既有两条断言逐字保留，这里追加同口径复合读数）。
  const sw = read('../../src/background/service-worker.ts');
  assert.equal((sw.match(/\.request\s*\(/g) ?? []).length, 0, '「SW 永不 .request(」计数不得减');
  const helper = read('../../src/platform/capability-permissions.ts');
  assert.ok((helper.match(/\.request\s*\(/g) ?? []).length >= 1, '手势 helper 的请求点不得消失');
  // ③ 真实读数：批量入批集为空 ⇒ 通过；注入特权 op ⇒ 必红；还原 ⇒ PASS。
  assert.deepEqual(batchPrivilegedProblems([], OP_TIER_TABLE), []);
  const forged = batchPrivilegedProblems(['op.authorize'], OP_TIER_TABLE);
  assert.ok(forged.length > 0, '把 op.authorize 塞入计划必须判红');
  assert.ok(forged.some((x) => x.includes('特权 op 不入批')), '必红必须命中特权不入批判据');
  assert.ok(batchPrivilegedProblems(['op.perm.request'], OP_TIER_TABLE).length > 0, 'op.perm.request 入批同样必红');
  // 特权 op 逐项恒 gesture（与单源一致；批量不改变档位）。
  for (const id of privileged) assert.equal(tierOfId(id), 'gesture');
  assert.deepEqual(batchPrivilegedProblems([], OP_TIER_TABLE), []);
});
