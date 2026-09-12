/**
 * 「环境自检 / 诊断」纯逻辑单测（TASK-019 任务 C）。
 *
 * 覆盖：✅/⚠/❌ 逐项分支、可读细节、一键复制文本、以及**绝不含 key 明文**的纵深脱敏。
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildReport,
  diagStatusIcon,
  extensionItem,
  llmItem,
  originsItem,
  renderDiagText,
  sanitizeDiagText,
  storageItem,
  summarizeReport,
  swItem,
  versionItem,
} from '../src/ui/settings/diagnostics.js';

test('diag icons: ok/warn/fail map to ✅/⚠/❌', () => {
  assert.equal(diagStatusIcon('ok'), '✅');
  assert.equal(diagStatusIcon('warn'), '⚠');
  assert.equal(diagStatusIcon('fail'), '❌');
});

test('diag extension item: ✅ inside extension, ❌ with reasons outside', () => {
  assert.equal(extensionItem(true, []).status, 'ok');
  const bad = extensionItem(false, ['chrome.runtime.id 不可用', 'chrome.storage.local 不可用']);
  assert.equal(bad.status, 'fail');
  assert.match(bad.detail, /不在扩展环境/);
  assert.match(bad.detail, /runtime\.id/);
});

test('diag version item: ok on match, warn on mismatch/unknown SW', () => {
  assert.equal(versionItem('0.8.0', '0.8.0', '2026-09-12T00:00:00Z').status, 'ok');
  const mismatch = versionItem('0.8.0', '0.7.0', 'dev');
  assert.equal(mismatch.status, 'warn');
  assert.match(mismatch.detail, /重新加载/);
  const noSw = versionItem('0.8.0', null, 'dev');
  assert.equal(noSw.status, 'warn');
  assert.match(noSw.detail, /未响应/);

  // same manifest version but a stale background build → reload hint (TASK-019)
  const stale = versionItem('0.8.0', '0.8.0', '2026-09-12T05:00:00Z', '2026-09-12T04:00:00Z');
  assert.equal(stale.status, 'warn');
  assert.match(stale.detail, /不一致/);
  assert.match(stale.detail, /重新加载/);
  const same = versionItem('0.8.0', '0.8.0', '2026-09-12T05:00:00Z', '2026-09-12T05:00:00Z');
  assert.equal(same.status, 'ok');
});

test('diag origins item: lists active + authorized origins (or 无)', () => {
  const empty = originsItem([], null);
  assert.equal(empty.status, 'ok');
  assert.match(empty.detail, /（无）/);
  const filled = originsItem(['https://b.test', 'https://a.test'], 'https://a.test');
  assert.match(filled.detail, /https:\/\/a\.test/);
  assert.match(filled.detail, /https:\/\/b\.test/);
});

test('diag llm item: warn when unconfigured, ok when configured — never the key', () => {
  assert.equal(llmItem(false, '', '').status, 'warn');
  const ok = llmItem(true, 'DeepSeek', 'deepseek-chat');
  assert.equal(ok.status, 'ok');
  assert.match(ok.detail, /DeepSeek/);
  assert.equal(/key/i.test(ok.detail.replace('Key 已配置', '')), false);
});

test('diag storage/sw items keep the supplied readable detail', () => {
  assert.equal(storageItem('ok', '写入测试键 → 读回一致 → 已清理').status, 'ok');
  assert.equal(swItem('fail', '无法连接 background：x').status, 'fail');
});

test('diag summary: fail > warn > all-ok labelling (never misleading)', () => {
  assert.equal(summarizeReport({ items: [storageItem('ok', 'x'), swItem('ok', 'y')] }).label, '✅ 全部通过');
  assert.match(summarizeReport({ items: [storageItem('warn', 'x')] }).label, /⚠/);
  const failed = summarizeReport({ items: [storageItem('ok', 'x'), swItem('fail', 'y')] });
  assert.equal(failed.fail, 1);
  assert.match(failed.label, /1 项未通过/);
});

test('diag render: includes every item + header and status icons', () => {
  const report = buildReport(
    [
      extensionItem(true, []),
      versionItem('0.8.0', '0.8.0', '2026-09-12T00:00:00Z'),
      storageItem('ok', '读回一致'),
      swItem('warn', '往返 12 ms'),
      originsItem(['https://a.test'], 'https://a.test'),
      llmItem(true, 'DeepSeek', 'deepseek-chat'),
    ],
    1_700_000_000_000,
  );
  const text = renderDiagText(report);
  for (const item of report.items) assert.match(text, new RegExp(item.label.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')));
  assert.match(text, /不含任何 API Key 明文/);
  assert.match(text, /✅/);
  assert.match(text, /结论：/);
});

test('diag sanitize: key-like tokens never survive into the copyable text', () => {
  const secret = 'sk-super-secret-1234567890';
  assert.equal(sanitizeDiagText(`apiKey=${secret}`).includes(secret), false);
  assert.equal(sanitizeDiagText(`Authorization: Bearer ${secret}`).includes(secret), false);
  assert.equal(sanitizeDiagText(`ark-abcdef123456`).includes('ark-abcdef123456'), false);
  assert.match(sanitizeDiagText(`apiKey=${secret}`), /已脱敏/);
});

test('diag render: even an accidentally-keyed detail is masked', () => {
  const report = buildReport([storageItem('ok', 'probe apiKey=sk-leaked-999999 done')], 0);
  const text = renderDiagText(report);
  assert.equal(text.includes('sk-leaked-999999'), false);
  assert.match(text, /已脱敏/);
});
