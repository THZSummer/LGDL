/**
 * V2-1 门禁 `insight-no-escalation`（TASK-009 基础段；ADR-V2-015；FR-V2-003/016/065）。
 *
 * 来源约束（**基础段**，V2-3-TASK-007 在其上**追加** tree 层断言，零删减）：
 *   - `src/insight/**` 无 `chrome.*`、无写 store 工厂导入、无 `apiKey`、无 bare `catch {}`；
 *   - `src/insight/**` 不导入 `../background/**`（不把运行态 store 拉进纯投影层）；
 *   - `PLUGIN_RISK_DEFAULTS` 判定表 **pinned**；
 *   - 禁改面 `git diff --quiet` 为零：`policy.ts` / `auto-authorize.ts` / `manifest.json` /
 *     `test/parity`（v1 已 validated 门禁）/ `packages/web-cli-base`。
 *
 * **新文件承载**；不修改 v1 任何既有测试。
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { PLUGIN_RISK_DEFAULTS } from '../src/security/policy.js';
import { AUTO_AUTH_DEFAULTS, decideAutoAuthorization } from '../src/security/auto-authorize.js';
import type { ToolRisk } from '@lgdl/web-cli-base';

const insightDir = fileURLToPath(new URL('../../src/insight', import.meta.url));
const treeDir = fileURLToPath(new URL('../../src/ui/tree', import.meta.url));

function insightSources(): { name: string; text: string }[] {
  return readdirSync(insightDir)
    .filter((f) => f.endsWith('.ts'))
    .map((f) => ({ name: f, text: readFileSync(`${insightDir}/${f}`, 'utf8') }));
}

/** V2-3 (TASK-007): the tree layer sources (same source-constraint discipline). */
function treeSources(): { name: string; text: string }[] {
  return readdirSync(treeDir)
    .filter((f) => f.endsWith('.ts'))
    .map((f) => ({ name: f, text: readFileSync(`${treeDir}/${f}`, 'utf8') }));
}

test('V2-1 no-escalation: src/insight/** never touches chrome.* / apiKey / a write store', () => {
  const files = insightSources();
  assert.ok(files.length >= 6, 'the insight layer must have its modules in place');
  for (const file of files) {
    assert.equal(/chrome\s*\./.test(file.text), false, `${file.name} must not touch chrome.*`);
    assert.equal(/chrome\.storage/.test(file.text), false, `${file.name} must not touch chrome.storage`);
    assert.equal(/apiKey/.test(file.text), false, `${file.name} must not reference apiKey`);
    assert.equal(
      /create(OriginStore|CapabilitySettingStore|TabsSettingStore|StorageAuditSink|ChromeAsyncKv|ChromeSessionKv)\b/.test(
        file.text,
      ),
      false,
      `${file.name} must not import a write store factory`,
    );
    assert.equal(
      /from\s+['"][^'"]*\.\.\/background\//.test(file.text),
      false,
      `${file.name} must not import runtime background stores`,
    );
  }
});

test('V2-1 no-escalation: src/insight/** has no bare catch {} (no silently swallowed errors)', () => {
  const bareCatch = /catch\s*(\([^)]*\))?\s*\{\s*\}/;
  for (const file of insightSources()) {
    assert.equal(bareCatch.test(file.text), false, `${file.name} has a bare catch {}`);
  }
});

test('V2-1 no-escalation: PLUGIN_RISK_DEFAULTS is pinned (read→allow / write·external·ui·state→ask / evaluate→deny)', () => {
  assert.deepEqual(PLUGIN_RISK_DEFAULTS, {
    read: 'allow',
    write: 'ask',
    external: 'ask',
    ui: 'ask',
    state: 'ask',
    evaluate: 'deny',
  });
});

test('V2-1 no-escalation: manifest static + optional permission faces are pinned (zero new permissions)', () => {
  const manifest = JSON.parse(
    readFileSync(new URL('../../manifest.json', import.meta.url), 'utf8'),
  ) as { permissions: string[]; optional_permissions: string[] };
  assert.deepEqual(manifest.permissions, ['activeTab', 'scripting', 'storage', 'sidePanel', 'tabs']);
  assert.deepEqual(manifest.optional_permissions, [
    'bookmarks',
    'downloads',
    'notifications',
    'clipboardRead',
    'clipboardWrite',
  ]);
});

/** `git diff --quiet` exit code for the given paths (0 = zero changes). */
function gitDiffStatus(paths: string[]): number {
  try {
    execFileSync('git', ['diff', '--quiet', '--', ...paths], { stdio: 'ignore' });
    return 0;
  } catch (err) {
    const status = (err as { status?: number }).status;
    // A real difference is exit 1; anything else (git missing, not a repo) must
    // surface as a failure — never be swallowed into a false "clean".
    if (typeof status === 'number') return status;
    throw err;
  }
}

/**
 * V2-3: `git diff --quiet HEAD -- <paths>` (worktree vs the last commit).
 *
 * ⚠️ **legacy 弱冻结（保留，不删）**：这是 worktree-vs-HEAD 语义——一旦改动被
 * `git commit`，该断言此后恒为退出码 0（提交后恒绿），是**弱安全网**。**真实冻结由
 * 本文件 §sha256 pin 承担**（`POLICY_TS_SHA256` / `AUTO_AUTHORIZE_TS_SHA256` /
 * `DECISION_TABLE_SNAPSHOT_SHA256`，内容哈希含空白/换行，改动即 FAIL）。此处**保留**该
 * worktree 断言以维持「断言只增不减」，并如实标注其弱语义（V2-4 收口 W4 遗留登记）。
 */
function gitDiffHeadStatus(paths: string[]): number {
  try {
    execFileSync('git', ['diff', '--quiet', 'HEAD', '--', ...paths], { stdio: 'ignore' });
    return 0;
  } catch (err) {
    const status = (err as { status?: number }).status;
    if (typeof status === 'number') return status;
    throw err;
  }
}

test('V2-1 no-escalation: frozen surfaces have zero git diff (policy / auto-authorize / manifest / parity / base)', () => {
  assert.equal(gitDiffStatus(['src/security/policy.ts']), 0, 'security/policy.ts must be zero-diff');
  assert.equal(gitDiffStatus(['src/security/auto-authorize.ts']), 0, 'security/auto-authorize.ts must be zero-diff');
  assert.equal(gitDiffStatus(['manifest.json']), 0, 'manifest.json must be zero-diff');
  assert.equal(gitDiffStatus(['test/parity.test.ts', 'test/parity']), 0, 'v1 parity gate/baseline must be zero-diff');
  assert.equal(gitDiffStatus(['../web-cli-base']), 0, 'packages/web-cli-base must be zero-diff');
});

// ---------------------------------------------------------------------------
// V2-3 (TASK-007) 追加段：tree 层来源约束 + 判定链冻结 + 白名单 + 零明文
// （**只追加，V2-1 基础段零删减**）
// ---------------------------------------------------------------------------

test('V2-3 no-escalation: src/ui/tree/** never imports the judgment chain nor wields write stores', () => {
  const files = treeSources();
  assert.ok(files.length >= 4, 'the V2 tree layer must have tree-view/tree-drawer/tree-ops/tree-receipt');
  const names = files.map((f) => f.name).sort();
  assert.deepEqual(names, ['tree-drawer.ts', 'tree-ops.ts', 'tree-receipt.ts', 'tree-view.ts']);
  for (const file of files) {
    assert.equal(
      /from\s+['"][^'"]*security\/(policy|auto-authorize)/.test(file.text),
      false,
      `${file.name} must not import security/policy or security/auto-authorize`,
    );
    assert.equal(/riskDefaults\s*[:=]/.test(file.text), false, `${file.name} must not assign riskDefaults`);
    assert.equal(
      /createPluginPolicyConfig\s*\(/.test(file.text),
      false,
      `${file.name} must not construct the plugin policy config`,
    );
    assert.equal(/chrome\s*\./.test(file.text), false, `${file.name} must not touch chrome.*`);
    assert.equal(/apiKey/.test(file.text), false, `${file.name} must not reference apiKey`);
    assert.equal(/innerHTML/.test(file.text), false, `${file.name} must not use innerHTML (textContent only)`);
  }
});

test('V2-3 no-escalation: tree-ops.ts has NO write verb outside the closed whitelist (no grant/request)', () => {
  const ops = treeSources().find((f) => f.name === 'tree-ops.ts');
  assert.ok(ops, 'tree-ops.ts must exist');
  // No `grant` action id and no optional-permission `request` write path (revoke-only面).
  assert.equal(/['"]grant/.test(ops.text), false, 'tree-ops.ts must not contain a grant action id');
  assert.equal(/permissions\.request/.test(ops.text), false, 'tree-ops.ts must not request permissions');
  // The whitelist is a closed union of exactly 7 values.
  assert.equal(/TREE_ACTION_IDS/.test(ops.text), true);
  for (const id of ['revoke-origin', 'revoke-capability', 'set-capability-toggle', 'set-tabs-toggle', 'clear-auto-auth', 'disconnect-llm', 'dissolve-group']) {
    assert.equal(ops.text.includes(`'${id}'`), true, `tree-ops.ts must whitelist ${id}`);
  }
});

test('V2-3 no-escalation: src/ui/tree/** has no bare catch {} (no silently swallowed errors)', () => {
  const bareCatch = /catch\s*(\([^)]*\))?\s*\{\s*\}/;
  for (const file of treeSources()) {
    assert.equal(bareCatch.test(file.text), false, `${file.name} has a bare catch {}`);
  }
});

// ⚠️ legacy 弱冻结（W4 遗留登记，保留不删）：本断言为 worktree-vs-HEAD——提交后恒 0，
// 语义弱。**真实冻结由下面 W3 段的 §sha256 pin 承担**（内容哈希，任何字节漂移即 FAIL，
// 且带反证自测证明非虚绿）。保留本断言以维持「断言只增不减」。
test('V2-3 no-escalation: the judgment chain is frozen against HEAD (git diff --quiet HEAD -- policy/auto-authorize)', () => {
  assert.equal(
    gitDiffHeadStatus(['src/security/policy.ts', 'src/security/auto-authorize.ts']),
    0,
    'the full judgment chain must be zero-diff vs HEAD',
  );
});

test('V2-3 no-escalation: AUTO_AUTH_DEFAULTS pinned (read on / write off)', () => {
  assert.deepEqual(AUTO_AUTH_DEFAULTS, { read: true, write: false });
});

test('V2-3 no-escalation: decideAutoAuthorization hard floors are pinned verbatim', () => {
  const on = { read: true, write: true };
  // destructive write never auto-allowed (checked before the group filter)
  assert.deepEqual(decideAutoAuthorization({ origin: 'https://a.test', group: 'site', risk: 'write', destructive: true, settings: on }), {
    allow: false,
    reason: '破坏性写操作不纳入「写操作自动」，仍需人工确认',
  });
  // non-site tools never auto-allowed
  assert.equal(decideAutoAuthorization({ origin: 'https://a.test', group: 'plugin', risk: 'write', destructive: false, settings: on }).allow, false);
  // evaluate → hard deny (never delegated to the confirmation UI)
  const evaluate = decideAutoAuthorization({ origin: 'https://a.test', group: 'site', risk: 'evaluate', destructive: false, settings: on });
  assert.equal(evaluate.allow, false);
  assert.equal(evaluate.hardDeny, true);
  // unknown / missing risk → hard deny (S3 fail-closed)
  const unknown = decideAutoAuthorization({ origin: 'https://a.test', group: 'site', risk: undefined, destructive: false, settings: on });
  assert.equal(unknown.allow, false);
  assert.equal(unknown.hardDeny, true);
  // ui / state / external tiers have no auto switch → allow stays false. The
  // current (frozen) implementation reports them as a fail-closed hard deny.
  for (const risk of ['ui', 'state', 'external'] as const) {
    const d = decideAutoAuthorization({ origin: 'https://a.test', group: 'site', risk, destructive: false, settings: on });
    assert.equal(d.allow, false, `${risk} must never auto-allow`);
    assert.equal(d.hardDeny, true, `${risk} has no auto tier and must fail closed (deny)`);
  }
  // no origin → never auto
  assert.equal(decideAutoAuthorization({ group: 'site', risk: 'write', destructive: false, settings: on }).allow, false);
});

test('V2-3 no-escalation: zero plaintext in the projection/receipt surface (no key materials)', () => {
  // Machine-checkable zero-plaintext: the tree layer may only consume the masked
  // `OpResult.text` / `LlmStatusSummary`; it must never reference key materials or
  // the raw LLM settings shape.
  for (const file of [...insightSources(), ...treeSources()]) {
    assert.equal(/apiKey/.test(file.text), false, `${file.name} must not reference apiKey`);
    assert.equal(/LlmSettings/.test(file.text), false, `${file.name} must not reference the raw LLM settings shape`);
    assert.equal(/storage\.local/.test(file.text), false, `${file.name} must not read storage directly`);
  }
});

// ---------------------------------------------------------------------------
// W3 修复轮（2026-09-13）：判定链冻结从「worktree-vs-HEAD」升级为「内容哈希钉死」
//
// 为什么必须改：上面的 `git diff --quiet HEAD -- policy.ts auto-authorize.ts` 只比较
// **工作树 vs 最后一次提交**。一旦某个对判定链的改动被 `git commit`，该断言此后恒为
// 退出码 0 —— 一个**永不失效的假安全网**（review §7 W3 / §2 C7）。下面的 SHA-256
// 常量才是真正的冻结：判定链文件**任何一个字节**（含空白/换行）变动都 FAIL，除非
// 在本文件显式更新 pin 并写明带日期的理由。
//
// 同时把 `PLUGIN_RISK_DEFAULTS` / `AUTO_AUTH_DEFAULTS` / `decideAutoAuthorization`
// 的**判定表快照**整体哈希钉死（720 行真实输入 → 结论），防止「代码没改但语义漂移」
// （例如默认值对象被替换为等值新对象、reason 文案被弱化）。只增不减：原有断言全部保留。
// ---------------------------------------------------------------------------

/** 判定链冻结 pin 的登记信息（来源 commit / 日期 / 理由，可复核）。 */
const FROZEN_HASH_META = {
  pinnedOn: '2026-09-13',
  sourceCommit: '39cd0a1b91c5d41eae2d4079835a12b635e1ae1f',
  reason:
    'V2 P0 修复轮 W3：以内容哈希钉死替代提交后恒绿的 git diff 冻结；判定链为安全红线，任何改动必须显式改 pin。',
} as const;

/** `src/security/policy.ts` 的 SHA-256（pin 于 2026-09-13 / 39cd0a1）。 */
const POLICY_TS_SHA256 = 'bfcb2edeceae19a27384aef6608e9f2ae9c3a0f6c1e5d3618f277164bb3c89a8';

/** `src/security/auto-authorize.ts` 的 SHA-256（pin 于 2026-09-13 / 39cd0a1）。 */
const AUTO_AUTHORIZE_TS_SHA256 = '1096d065dac63d56e36285bf499eee041acdc3e323d4c7215df3981af7d0ef4b';

/** 判定表快照（默认值 + 720 行 decideAutoAuthorization 结论）的 SHA-256。 */
const DECISION_TABLE_SNAPSHOT_SHA256 =
  'd1667d24cbb8cfc422ce92e61af3701ebd70bf85a30224f3fc7c7ccf22a88b74';

function sha256(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

/** 读取包内相对路径文件的原始文本（编译后从 `dist-test/test/` 解析同样成立）。 */
function readPluginFile(relative: string): string {
  return readFileSync(new URL(`../../${relative}`, import.meta.url), 'utf8');
}

/**
 * The actual freeze assertion — factored out so the reverse proof below can prove
 * it **really throws** on drifted content (not a false-green helper).
 */
function assertPinnedHash(label: string, actualHash: string, pinnedHash: string): void {
  assert.equal(
    actualHash,
    pinnedHash,
    `${label} 内容哈希漂移：${actualHash} ≠ 钉死值 ${pinnedHash}。若为有意改动，请在测试内显式更新 pin 并注明日期与理由（来源 commit ${FROZEN_HASH_META.sourceCommit}）。`,
  );
}

/**
 * Canonical decision-table snapshot. Deterministic: fixed input matrix + fixed key
 * insertion order + `JSON.stringify` (no Set/Map, no Date, no randomness). 720
 * rows = 3 origins × 3 groups × 8 risks × 2 destructive × 5 settings.
 */
function decisionTableSnapshot(): string {
  const origins = [undefined, '', 'https://a.test'];
  const groups = [undefined, 'site', 'plugin'];
  const risks: Array<ToolRisk | 'bogus' | undefined> = [
    undefined, 'read', 'write', 'external', 'ui', 'state', 'evaluate', 'bogus',
  ];
  const destructives = [false, true];
  const settingsList = [
    undefined,
    { read: true, write: false },
    { read: true, write: true },
    { read: false, write: false },
    { read: false, write: true },
  ];
  const rows: Array<{ i: Record<string, unknown>; d: unknown }> = [];
  for (const origin of origins) {
    for (const group of groups) {
      for (const risk of risks) {
        for (const destructive of destructives) {
          for (const settings of settingsList) {
            const input: Record<string, unknown> = {};
            if (origin !== undefined) input.origin = origin;
            if (group !== undefined) input.group = group;
            if (risk !== undefined) input.risk = risk;
            input.destructive = destructive;
            if (settings !== undefined) input.settings = settings;
            rows.push({ i: input, d: decideAutoAuthorization(input as never) });
          }
        }
      }
    }
  }
  return JSON.stringify({
    riskDefaults: PLUGIN_RISK_DEFAULTS,
    autoAuthDefaults: AUTO_AUTH_DEFAULTS,
    rows,
  });
}

test('W3 no-escalation: judgment-chain source files are frozen by content hash (not just git diff)', () => {
  assert.equal(FROZEN_HASH_META.pinnedOn, '2026-09-13');
  assertPinnedHash('src/security/policy.ts', sha256(readPluginFile('src/security/policy.ts')), POLICY_TS_SHA256);
  assertPinnedHash(
    'src/security/auto-authorize.ts',
    sha256(readPluginFile('src/security/auto-authorize.ts')),
    AUTO_AUTHORIZE_TS_SHA256,
  );
});

test('W3 no-escalation: the whole decision table (defaults + decideAutoAuthorization) is frozen by content hash', () => {
  assertPinnedHash('decision-table snapshot', sha256(decisionTableSnapshot()), DECISION_TABLE_SNAPSHOT_SHA256);
});

test('W3 no-escalation REVERSE PROOF: a single-byte change to the frozen files FAILS the pin', () => {
  const policyText = readPluginFile('src/security/policy.ts');
  const autoText = readPluginFile('src/security/auto-authorize.ts');

  // Any change — including whitespace / a trailing newline — must move the hash.
  const tamperedPolicy = `${policyText} `;
  const tamperedAuto = autoText.replace('read: true', 'read: false');
  assert.notEqual(sha256(tamperedPolicy), POLICY_TS_SHA256, '追加一个空格也必须改变哈希');
  assert.notEqual(sha256(tamperedAuto), AUTO_AUTHORIZE_TS_SHA256, '改一个布尔值必须改变哈希');
  assert.equal(sha256(policyText), POLICY_TS_SHA256, '未改动的原文必须匹配 pin（反证自测本身非空洞）');

  // The real assertion path must throw on the tampered content.
  assert.throws(
    () => assertPinnedHash('src/security/policy.ts', sha256(tamperedPolicy), POLICY_TS_SHA256),
    /内容哈希漂移/,
    '反证：内容被改时 pin 断言必须真的抛错（否则就是虚绿门禁）',
  );
  assert.throws(
    () => assertPinnedHash('src/security/auto-authorize.ts', sha256(tamperedAuto), AUTO_AUTHORIZE_TS_SHA256),
    /内容哈希漂移/,
  );
});

test('W3 no-escalation REVERSE PROOF: a decision-table semantic change FAILS the snapshot pin', () => {
  const snapshot = decisionTableSnapshot();
  // Simulate a weakened default (read no longer auto-allow) without touching files.
  const weakened = snapshot.replace('"read":"allow"', '"read":"ask"');
  assert.notEqual(weakened, snapshot, 'fixture must actually change the canonical snapshot');
  assert.notEqual(sha256(weakened), DECISION_TABLE_SNAPSHOT_SHA256, '判定表语义漂移必须改变快照哈希');
  assert.throws(
    () => assertPinnedHash('decision-table snapshot', sha256(weakened), DECISION_TABLE_SNAPSHOT_SHA256),
    /内容哈希漂移/,
    '反证：判定表被弱化时快照 pin 必须 FAIL',
  );
  // A trailing whitespace must also move the snapshot hash (no silent normalization).
  assert.notEqual(sha256(`${snapshot}\n`), DECISION_TABLE_SNAPSHOT_SHA256);
});

// ---------------------------------------------------------------------------
// T2 修复轮（2026-09-13）：`pushInsightChanged` 去静默吞异常
// ---------------------------------------------------------------------------

test('T2 no-escalation: pushInsightChanged has no silent empty catch and logs a diagnostic', () => {
  const sw = readFileSync(new URL('../../src/background/service-worker.ts', import.meta.url), 'utf8');
  const raw = sw.slice(sw.indexOf('function pushInsightChanged'), sw.indexOf('async function buildInsightSnapshot'));
  assert.ok(raw.length > 0, 'pushInsightChanged must be found');
  // Check the executable body (comments mention the old pattern on purpose).
  const body = raw
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter((line) => !line.trim().startsWith('//'))
    .join('\n');
  // The old silent swallow is gone.
  assert.equal(/\.catch\(\s*\(\s*\)\s*=>\s*\{\s*\}\s*\)/.test(body), false, 'pushInsightChanged must not use a silent empty catch');
  // A diagnostic that names the failure is present (no fabricated success).
  assert.match(body, /console\.(debug|warn|error)\(/, 'pushInsightChanged must log a diagnostic');
  assert.match(body, /no receiver|failed/i, 'the diagnostic must explain the best-effort push outcome');
  assert.equal(/no state faked/.test(raw), true, 'the comment must state no state is faked');
});
