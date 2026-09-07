import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveDialogAction, isDestructiveText, DESTRUCTIVE_PATTERNS, DIALOG_POLICY_NOTE } from './dialog-policy.js';
import type { PlatformDialogRuleSpec } from './platform.js';

const noRules: PlatformDialogRuleSpec[] = [];

test('dialog-policy: 缺省保守三路（alert 记录即返回 / confirm·prompt 无匹配 dismiss 否定值，EC-005）', () => {
  const alertD = resolveDialogAction(noRules, { type: 'alert', text: '你好', trusted: false });
  assert.equal(alertD.action, 'accept');
  assert.match(alertD.by, /缺省保守/);
  const confirmD = resolveDialogAction(noRules, { type: 'confirm', text: '继续吗', trusted: false });
  assert.equal(confirmD.action, 'dismiss');
  const promptD = resolveDialogAction(noRules, { type: 'prompt', text: '输入：', trusted: false });
  assert.equal(promptD.action, 'dismiss');
});

test('dialog-policy: 显式 trusted accept 规则命中放行（confirm 返回确认值）', () => {
  const rules: PlatformDialogRuleSpec[] = [
    { type: 'confirm', pattern: '退出编辑器', action: 'accept', trusted: true },
  ];
  const d = resolveDialogAction(rules, { type: 'confirm', text: '退出编辑器？有未保存更改', trusted: true });
  assert.equal(d.action, 'accept');
  // 非 trusted 上下文命中同一规则（规则 trusted 已显式）仍 accept —— 护栏语义在「规则声明」而非调用态
  const d2 = resolveDialogAction(rules, { type: 'confirm', text: '退出编辑器？', trusted: false });
  assert.equal(d2.action, 'accept');
});

test('dialog-policy: 破坏性文案无 trusted accept 规则 → deny-accept（永不自动 accept，EC-006）', () => {
  assert.equal(isDestructiveText('确认删除该文件？'), true);
  assert.equal(isDestructiveText('Are you sure you want to delete this?'), true);
  assert.equal(isDestructiveText('确定清除全部数据？'), true);
  assert.equal(isDestructiveText('保存修改？'), false);
  // 破坏性 + 非 trusted accept 规则 → 护栏 deny-accept
  const loose: PlatformDialogRuleSpec[] = [{ type: 'confirm', action: 'accept', trusted: false }];
  const d = resolveDialogAction(loose, { type: 'confirm', text: '确认删除文件？' });
  assert.equal(d.action, 'dismiss');
  assert.match(d.by, /护栏 deny-accept/);
  // 显式 trusted accept 规则命中破坏性文案 → 放行（EC-006 尾句）
  const trustedRules: PlatformDialogRuleSpec[] = [{ type: 'confirm', pattern: '确认删除', action: 'accept', trusted: true }];
  const ok = resolveDialogAction(trustedRules, { type: 'confirm', text: '确认删除文件？' });
  assert.equal(ok.action, 'accept');
  assert.ok(DESTRUCTIVE_PATTERNS.length > 0);
});

test('dialog-policy: prompt 自动输入仅 trusted 规则显式提供 text 生效（FR-017）', () => {
  const trustedInput: PlatformDialogRuleSpec[] = [{ type: 'prompt', pattern: '密码', action: 'promptText', text: 'secret-answer', trusted: true }];
  const ok = resolveDialogAction(trustedInput, { type: 'prompt', text: '请输入密码', trusted: true });
  assert.equal(ok.action, 'promptText');
  assert.equal(ok.text, 'secret-answer');
  // untrusted promptText 规则 → 忽略 dismiss
  const loose: PlatformDialogRuleSpec[] = [{ type: 'prompt', action: 'promptText', text: 'hack', trusted: false }];
  const d = resolveDialogAction(loose, { type: 'prompt', text: '请输入', trusted: false });
  assert.equal(d.action, 'dismiss');
  // trusted 规则缺 text → dismiss（无输入可答）
  const noText: PlatformDialogRuleSpec[] = [{ type: 'prompt', action: 'promptText', trusted: true }];
  const d2 = resolveDialogAction(noText, { type: 'prompt', text: '请输入', trusted: true });
  assert.equal(d2.action, 'dismiss');
});

test('dialog-policy: 规则匹配按类型 + 文本/URL glob；alert 也可被规则命中 dismiss', () => {
  const rules: PlatformDialogRuleSpec[] = [{ type: 'alert', pattern: '稍等', action: 'dismiss' }];
  const d = resolveDialogAction(rules, { type: 'alert', text: '系统稍等片刻', trusted: false });
  assert.equal(d.action, 'dismiss');
  assert.match(DIALOG_POLICY_NOTE, /缺省保守/);
});
