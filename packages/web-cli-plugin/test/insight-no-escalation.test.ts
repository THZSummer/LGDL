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
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { PLUGIN_RISK_DEFAULTS } from '../src/security/policy.js';
import { AUTO_AUTH_DEFAULTS, decideAutoAuthorization } from '../src/security/auto-authorize.js';

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

/** V2-3: `git diff --quiet HEAD -- <paths>` (worktree vs the last commit). */
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
