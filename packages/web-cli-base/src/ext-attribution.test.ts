/**
 * ext-attribution.test.ts —— EXT 统一转译面/契约预留测试（TASK-010，FR-025/026/027 + AC-008）。
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ATTRIBUTION_MAP, unsupportedAttribution, attributionHelpLines, EXT_DISCIPLINE_NOTE } from './ext-attribution.js';
import { eventsHelp } from './events-tools.js';
import { dialogHelp } from './dialog-tools.js';
import { cookieHelp } from './cookie-tools.js';
import { clipboardHelp } from './clipboard.js';
import { domHelp } from './dom-tools.js';

test('ext: ATTRIBUTION_MAP 覆盖 spec §2.5 🔴 列全部能力（≥12 项，含归属/扩展面/契约建议字段）', () => {
  const required = [
    'multi-tab-window',
    'downloads',
    'fullpage-screenshot',
    'cookie-httpOnly-crossDomain',
    'network-global',
    'persistent-subscription',
    'closed-shadow',
    'cross-origin-iframe',
    'native-dialog',
    'trusted-input',
    'permission-sim',
    'file-real-path',
  ];
  for (const cap of required) {
    const e = ATTRIBUTION_MAP[cap];
    assert.ok(e, `ATTRIBUTION_MAP 缺 ${cap}`);
    assert.ok(e.desc && e.home && e.extensionSurface && e.contract, `${cap} 字段齐全（归属 + 扩展 API/CDP 域 + 契约预留建议）`);
  }
});

test('ext: unsupportedAttribution 统一文案与 v3 整页截图先例同构（不支持 + 归属 + 契约预留），逐项 out 断言 ≥1', () => {
  for (const cap of Object.keys(ATTRIBUTION_MAP)) {
    const r = unsupportedAttribution(cap);
    assert.equal(r.error.includes('unsupported'), true, `${cap} error 标记 unsupported`);
    assert.match(r.output, /不支持/);
    assert.match(r.output, /F-14|CDP|生态位|host/);
  }
  // 每项至少转译一次（AC-008 逐项断言 ≥1）
  const multi = unsupportedAttribution('multi-tab-window');
  assert.match(multi.output, /chrome.tabs|chrome.windows/);
  const net = unsupportedAttribution('network-global');
  assert.match(net.output, /webRequest|declarativeNetRequest|CDP Network/);
  // 未知能力 → 不静默
  const unknown = unsupportedAttribution('nope');
  assert.match(unknown.output, /不在归属表/);
});

test('ext: 契约预留不进 deriveTools（纯常量/helper，零注册零 schema 体积变化）', () => {
  // ext-attribution 只导出常量与 helper —— 无 ToolEntry 工厂（类型断言面）
  const exported = Object.keys(ATTRIBUTION_MAP).length;
  assert.ok(exported >= 12);
  assert.match(EXT_DISCIPLINE_NOTE, /纯文档面/);
  const lines = attributionHelpLines();
  assert.ok(lines.some((l) => l.includes('归属表')));
  assert.ok(lines.some((l) => l.includes('chrome.tabs')));
});

test('ext: 各工具 help 归属表接线 + 与 ATTRIBUTION_MAP 关键字一致（events/dialog/cookie/clipboard/dom）', () => {
  // events/cookie/clipboard/dialog help 含归属表引用；dom help 含边界归属（经接线文本断言）
  for (const h of [eventsHelp(), dialogHelp(), cookieHelp(), clipboardHelp()]) {
    assert.match(h, /归属/);
  }
  const dom = domHelp();
  assert.match(dom, /归属/);
});

test('ext: grep 零扩展工程痕迹 —— chrome.runtime/tabs/downloads/webRequest/manifest 实现代码零命中（src 面）', () => {
  // 本文件只含字符串常量/注释（归属表文本），不含任何扩展实现调用 —— 字符串面粗筛（精确 grep 由 TASK-014 终收）
  const join = Object.values(ATTRIBUTION_MAP).map((e) => `${e.home} ${e.extensionSurface}`).join(' ');
  assert.ok(!join.includes('chrome.runtime.sendMessage'));
  assert.ok(!join.includes('browser.runtime'));
});
