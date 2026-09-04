import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classifyError, parseToolArguments } from './llm.js';

// 中性 provider 信息（断言与迁移前一致：迁移前用 ProviderConfig，这里用 LlmProviderInfo）
const providerOf = (id: string, name: string) => ({ id, name, baseURL: null });

test('classifyError: Connection error hints at CORS / browser-direct limits', () => {
  const p = providerOf('volc-coding', '火山方舟 · Coding');
  const err = classifyError(new Error('Connection error.'), p);
  assert.match(err.message, /浏览器直连失败/);
  assert.match(err.message, /CORS/);
});

test('classifyError: 401 hints at invalid key', () => {
  const p = providerOf('deepseek', 'DeepSeek');
  const err = classifyError({ status: 401 } as unknown as Error, p);
  assert.match(err.message, /API Key 可能无效/);
});

test('classifyError: 404 on volc suggests switching plan provider', () => {
  const p = providerOf('volc-coding', '火山方舟 · Coding');
  const err = classifyError({ status: 404 } as unknown as Error, p);
  assert.match(err.message, /火山方舟/);
  assert.match(err.message, /Coding/);
});

test('parseToolArguments: parses subcommand and args', () => {
  const tc = parseToolArguments('call_1', 'web-cli', '{"subcommand":"add-node","args":{"id":"user","label":"用户","kind":"entity"}}');
  assert.equal(tc.id, 'call_1');
  assert.equal(tc.subcommand, 'add-node');
  assert.deepEqual(tc.args, { id: 'user', label: '用户', kind: 'entity' });
});

test('parseToolArguments: args-nested web-fetch ({args:{path}})', () => {
  const tc = parseToolArguments('c', 'web-fetch', '{"args":{"path":"a.md"}}');
  assert.equal(tc.args.path, 'a.md');
});

test('parseToolArguments: args-nested sleep with string ms', () => {
  const tc = parseToolArguments('c', 'sleep', '{"args":{"ms":"5000"}}');
  assert.equal(tc.args.ms, '5000');
});

test('parseToolArguments: args-nested sleep with number ms is stringified', () => {
  const tc = parseToolArguments('c', 'sleep', '{"args":{"ms":5000}}');
  assert.equal(tc.args.ms, '5000');
});

test('parseToolArguments: tolerates malformed JSON', () => {
  const tc = parseToolArguments('call_2', 'web-cli', 'not json');
  assert.equal(tc.subcommand, '');
  assert.deepEqual(tc.args, {});
});
