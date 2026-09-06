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
