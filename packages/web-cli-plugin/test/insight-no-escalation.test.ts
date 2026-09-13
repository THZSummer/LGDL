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

const insightDir = fileURLToPath(new URL('../../src/insight', import.meta.url));

function insightSources(): { name: string; text: string }[] {
  return readdirSync(insightDir)
    .filter((f) => f.endsWith('.ts'))
    .map((f) => ({ name: f, text: readFileSync(`${insightDir}/${f}`, 'utf8') }));
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

test('V2-1 no-escalation: frozen surfaces have zero git diff (policy / auto-authorize / manifest / parity / base)', () => {
  assert.equal(gitDiffStatus(['src/security/policy.ts']), 0, 'security/policy.ts must be zero-diff');
  assert.equal(gitDiffStatus(['src/security/auto-authorize.ts']), 0, 'security/auto-authorize.ts must be zero-diff');
  assert.equal(gitDiffStatus(['manifest.json']), 0, 'manifest.json must be zero-diff');
  assert.equal(gitDiffStatus(['test/parity.test.ts', 'test/parity']), 0, 'v1 parity gate/baseline must be zero-diff');
  assert.equal(gitDiffStatus(['../web-cli-base']), 0, 'packages/web-cli-base must be zero-diff');
});
