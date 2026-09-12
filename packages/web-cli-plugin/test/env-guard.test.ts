/**
 * 非扩展上下文守卫单测（TASK-019 任务 A）。
 *
 * 覆盖：chrome 缺省 / 仅有 window.chrome（runtime 缺）/ 有 runtime 但无 storage /
 * 完整扩展上下文；以及按钮禁用语义与输入框说明。
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  NOT_EXTENSION_BANNER,
  detectExtensionEnv,
  envGuardButtonState,
  envGuardInputNote,
} from '../src/platform/env-guard.js';

test('env-guard: fully missing chrome → not in extension with readable reasons', () => {
  const env = detectExtensionEnv(undefined);
  assert.equal(env.inExtension, false);
  assert.equal(env.hasChrome, false);
  assert.equal(env.hasRuntime, false);
  assert.equal(env.hasStorage, false);
  assert.equal(env.banner, NOT_EXTENSION_BANNER);
  assert.ok(env.reasons.some((r) => /未检测到 chrome/.test(r)));
  assert.match(envGuardInputNote(env), /无法读写/);
});

test('env-guard: plain web page (window.chrome present, no runtime/storage) → not in extension', () => {
  const env = detectExtensionEnv({});
  assert.equal(env.inExtension, false);
  assert.equal(env.hasChrome, true);
  assert.equal(env.hasRuntime, false);
  assert.equal(env.hasStorage, false);
  assert.ok(env.reasons.some((r) => /runtime\.id/.test(r)));
  assert.ok(env.reasons.some((r) => /storage\.local/.test(r)));
});

test('env-guard: runtime.id present but storage.local missing → still blocked (no silent save)', () => {
  const env = detectExtensionEnv({ runtime: { id: 'abc' } });
  assert.equal(env.inExtension, false);
  assert.equal(env.hasRuntime, true);
  assert.equal(env.hasStorage, false);
  assert.ok(env.reasons.some((r) => /storage\.local/.test(r)));
});

test('env-guard: storage.local present but runtime.id missing → still blocked', () => {
  const env = detectExtensionEnv({ storage: { local: { get() {}, set() {}, remove() {} } } });
  assert.equal(env.inExtension, false);
  assert.equal(env.hasStorage, true);
  assert.equal(env.hasRuntime, false);
});

test('env-guard: full extension context → in extension, empty banner/note', () => {
  const env = detectExtensionEnv({
    runtime: { id: 'extension-id' },
    storage: { local: { get() {}, set() {}, remove() {} } },
  });
  assert.equal(env.inExtension, true);
  assert.equal(env.hasRuntime, true);
  assert.equal(env.hasStorage, true);
  assert.equal(env.banner, '');
  assert.deepEqual(env.reasons, []);
  assert.equal(envGuardInputNote(env), '');
});

test('env-guard: buttons disabled outside the extension; save honours busy inside it', () => {
  const outside = detectExtensionEnv({});
  assert.deepEqual(envGuardButtonState(outside), { saveDisabled: true, testDisabled: true, clearDisabled: true });

  const inside = detectExtensionEnv({
    runtime: { id: 'x' },
    storage: { local: { get() {}, set() {}, remove() {} } },
  });
  assert.deepEqual(envGuardButtonState(inside), { saveDisabled: false, testDisabled: false, clearDisabled: false });
  assert.equal(envGuardButtonState(inside, true).saveDisabled, true, 'busy save is disabled');
  assert.equal(envGuardButtonState(inside, true).testDisabled, false, 'busy only affects save');
});

test('env-guard: a runtime object without an id string is not enough', () => {
  const env = detectExtensionEnv({ runtime: {}, storage: { local: { get() {}, set() {} } } });
  assert.equal(env.inExtension, false);
});
