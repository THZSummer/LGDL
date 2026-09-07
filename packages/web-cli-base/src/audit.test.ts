import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createMemoryAudit, createConsoleAudit, createAudit } from './audit.js';
import type { AuditEvent, MemoryAuditSink } from './audit.js';

test('audit: memory sink records and exposes events', () => {
  const sink = createMemoryAudit();
  sink.record({ type: 'permission', ts: 1, tool: 'web-fetch', decision: 'allow' });
  assert.equal(sink.events.length, 1);
  assert.equal(sink.events[0].type, 'permission');
  sink.clear();
  assert.equal(sink.events.length, 0);
});

test('audit: 权限裁决事件（FR-005/009）', () => {
  const sink = createMemoryAudit();
  sink.record({ type: 'permission', ts: Date.now(), tool: 'doc-edit', decision: 'deny', reason: '权限被拒：命中规则', by: 'rule' });
  const ev = sink.events[0];
  assert.equal(ev.type, 'permission');
  assert.equal(ev.decision, 'deny');
  assert.equal(ev.by, 'rule');
});

test('audit: 工具调用事件（含 duration/trust，FR-010 标记随行）', () => {
  const sink = createMemoryAudit();
  sink.record({
    type: 'tool-call',
    ts: Date.now(),
    tool: 'web-fetch',
    ok: true,
    durationMs: 12,
    outputChars: 340,
    trust: { source: 'https://example.com', fetchedAt: Date.now(), level: 'untrusted' },
  });
  const ev = sink.events[0];
  assert.equal(ev.type, 'tool-call');
  assert.equal(ev.ok, true);
  assert.equal(ev.trust?.level, 'untrusted');
  assert.ok(ev.durationMs !== undefined);
});

test('audit: 扩展注册/卸载事件（FR-038：来源/时间/命名空间）', () => {
  const sink = createMemoryAudit();
  sink.record({ type: 'extension-register', ts: Date.now(), source: 'skill:my-skill', namespace: 'skill', name: 'skill.search' });
  sink.record({ type: 'extension-unregister', ts: Date.now(), source: 'skill:my-skill', namespace: 'skill', name: 'skill.search' });
  assert.equal(sink.events[0].type, 'extension-register');
  assert.equal(sink.events[0].source, 'skill:my-skill');
  assert.equal(sink.events[1].type, 'extension-unregister');
  assert.equal(sink.events[1].name, 'skill.search');
});

test('audit: 上下文压缩事件（NFR-009：前后体量）', () => {
  const sink = createMemoryAudit();
  sink.record({ type: 'context-compact', ts: Date.now(), tool: 'context', beforeTurns: 42, afterTurns: 9, detail: 'summarized by scene summarizer' });
  const ev = sink.events[0];
  assert.equal(ev.type, 'context-compact');
  assert.equal(ev.beforeTurns, 42);
  assert.equal(ev.afterTurns, 9);
});

test('audit: console sink 稳定前缀输出', () => {
  const lines: unknown[] = [];
  const fakeConsole = { info: (...a: unknown[]) => lines.push(a) } as unknown as Console;
  const sink = createConsoleAudit(fakeConsole);
  // ask 裁决经 permission 事件承载（decision 位；无独立 ask 事件类型，IMP-3）
  const ev: AuditEvent = { type: 'permission', ts: 1, tool: 'x', decision: 'deny', by: 'ask' };
  sink.record(ev);
  assert.equal(lines.length, 1);
  assert.match(String((lines[0] as unknown[])[0]), /\[audit:permission\]/);
});

test('audit: createAudit 工厂默认 memory / console 选项', () => {
  const m = createAudit() as unknown as MemoryAuditSink;
  m.record({ type: 'tool-call', ts: 0, tool: 't' });
  assert.equal(m.events.length, 1);
  const c = createAudit({ sink: 'console' });
  assert.equal(typeof c.record, 'function');
});

// ================= v4 FR-007 审计事件面扩展（TASK-002：字段无明文） =================

test('audit v4: 订阅生命周期事件（subscribe/unsubscribe）字段 = subId/subKind/sensitive/计数', () => {
  const sink = createMemoryAudit();
  sink.record({ type: 'subscribe', ts: 1, tool: 'events', subId: 'sub-1', subKind: 'console', sensitive: true, detail: '订阅 console 观察（sensitive）' });
  sink.record({ type: 'unsubscribe', ts: 2, tool: 'events', subId: 'sub-1', subKind: 'console', count: 42 });
  assert.equal(sink.events[0].type, 'subscribe');
  assert.equal(sink.events[0].subId, 'sub-1');
  assert.equal(sink.events[0].subKind, 'console');
  assert.equal(sink.events[0].sensitive, true);
  assert.equal(sink.events[1].type, 'unsubscribe');
  assert.equal(sink.events[1].count, 42);
});

test('audit v4: 事件投递摘要事件（event-delivery-summary）字段 = subId/subKind/count/计数 detail（负载形状无事件文本/meta）', () => {
  const sink = createMemoryAudit();
  sink.record({ type: 'event-delivery-summary', ts: 1, tool: 'events', subId: 'sub-1', subKind: 'dom', count: 7, detail: '投递 7 · 丢弃 1 · 缓冲 200' });
  const ev = sink.events[0];
  assert.equal(ev.type, 'event-delivery-summary');
  assert.equal(ev.count, 7);
  assert.equal(ev.subId, 'sub-1');
  assert.equal(ev.subKind, 'dom');
  assert.equal(ev.detail, '投递 7 · 丢弃 1 · 缓冲 200');
  // 形状契约：投递摘要审计只承载计数语义 —— 不得携带事件负载字段（事件明文绝不进审计，FR-007/NFR-008）
  assert.equal('text' in ev, false, '无事件文本负载字段');
  assert.equal('meta' in ev, false, '无事件 meta 负载字段');
  assert.equal('target' in ev, false, '无事件 target 负载字段');
});

test('audit v4: dialog/cookie/net-intercept 事件面（动作/归类无明文值）', () => {
  const sink = createMemoryAudit();
  sink.record({ type: 'dialog', ts: 1, tool: 'dialog', domain: 'confirm', decision: 'dismiss', detail: '缺省保守应答（无匹配规则）' });
  sink.record({ type: 'cookie', ts: 2, tool: 'cookie', action: 'write', domain: '.example.com', decision: 'deny', detail: 'cookie 名已掩码（长度 5）' });
  sink.record({ type: 'net-intercept', ts: 3, tool: 'net', action: 'addHeader', decision: 'allow', count: 1, detail: 'URL 脱敏摘要命中规则 r1' });
  assert.equal(sink.events[0].domain, 'confirm');
  assert.equal(sink.events[0].decision, 'dismiss');
  assert.equal(sink.events[0].detail, '缺省保守应答（无匹配规则）');
  assert.equal(sink.events[1].action, 'write');
  assert.equal(sink.events[1].domain, '.example.com');
  assert.equal(sink.events[1].detail, 'cookie 名已掩码（长度 5）');
  assert.equal(sink.events[2].action, 'addHeader');
  assert.equal(sink.events[2].count, 1);
  assert.equal(sink.events[2].detail, 'URL 脱敏摘要命中规则 r1');
  // 形状契约：写面审计只承载动作/归类/掩码摘要位 —— 不得携带 cookie 值/URL/头名等明文负载字段
  assert.equal('value' in sink.events[1], false, 'cookie 审计无值明文字段');
  assert.equal('url' in sink.events[2], false, 'net 审计无 URL 明文字段');
  assert.equal('text' in sink.events[0], false, 'dialog 审计无消息文本字段');
});

test('audit v4: AuditEventType 联合扩展编译可达（订阅/投递/对话框/cookie/拦截全部可记录）', () => {
  const types = ['subscribe', 'unsubscribe', 'event-delivery-summary', 'dialog', 'cookie', 'net-intercept'] as const;
  for (const t of types) {
    const ev: AuditEvent = { type: t, ts: 0 };
    assert.equal(ev.type, t);
  }
});
