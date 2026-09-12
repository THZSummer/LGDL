/**
 * 活跃标签控制器：发现原因持久化（TASK-019 任务 B）。
 *
 * 关联：`background/controller.ts` 的 `setDiscovery(state, descriptor?, reason?)`
 * 让侧栏能对 `unknown`（探测失败）给出可读原因 + 重试入口，而不是笼统「未知」。
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createController } from '../src/background/controller.js';

test('controller: setDiscovery persists a readable reason for unknown states', () => {
  const c = createController();
  c.bindTab(3, 'https://a.test');
  c.setDiscovery('unknown', undefined, '声明文件获取失败：HTTP 500');
  const s = c.get();
  assert.equal(s?.discoveryState, 'unknown');
  assert.equal(s?.discoveryReason, '声明文件获取失败：HTTP 500');
});

test('controller: a later successful discovery clears a stale reason', () => {
  const c = createController();
  c.bindTab(3, 'https://a.test');
  c.setDiscovery('unknown', undefined, 'transient');
  c.setDiscovery('supported', { protocolVersion: '1.0', tools: [] } as never);
  const s = c.get();
  assert.equal(s?.discoveryState, 'supported');
  assert.equal(s?.discoveryReason, undefined);
});

test('controller: navigation and snapshot/restore keep the reason semantics', () => {
  const c = createController();
  c.bindTab(3, 'https://a.test');
  c.setDiscovery('unknown', undefined, 'version mismatch');
  const snap = c.snapshot();
  assert.equal(snap.discoveryReason, 'version mismatch');

  c.markNavigated();
  assert.equal(c.get()?.discoveryReason, undefined, 'navigation clears the stale reason');

  const c2 = createController();
  c2.restore({ tabId: 3, origin: 'https://a.test', discoveryState: 'unknown', discoveryReason: 'r', invalidated: false, updatedAt: 1 });
  assert.equal(c2.get()?.discoveryReason, 'r');
});

// D-065: switching tabs marks the session stale but must NOT tear down a working
// binding (no tabs permission → the new tab's URL is unreadable, so a switch from
// the extension's own options/panel tab must not look like a site change).
test('controller: markStale keeps origin/discovery/descriptor and only flags invalidation', () => {
  const c = createController();
  c.bindTab(3, 'https://a.test');
  c.setDiscovery('supported', { protocolVersion: '1.0', tools: [] } as never);
  c.markStale();
  const s = c.get();
  assert.equal(s?.invalidated, true);
  assert.equal(s?.origin, 'https://a.test');
  assert.equal(s?.tabId, 3);
  assert.equal(s?.discoveryState, 'supported');
  assert.ok(s?.descriptor, 'the working descriptor survives a tab switch');
});
