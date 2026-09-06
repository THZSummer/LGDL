import { test } from 'node:test';
import assert from 'node:assert/strict';
import { McpClient, connectMcpSource } from './mcp-client.js';
import { createCommandRouter } from './router.js';
import { createMemoryAudit } from './audit.js';
import type { WebCliToolCall } from './llm.js';

function tc(name: string, args: Record<string, string> = {}, subcommand = ''): WebCliToolCall {
  return { id: 'call-1', name, subcommand, args, rawArguments: JSON.stringify(args) };
}

/** mock MCP HTTP 服务器：按 method 路由 JSON-RPC。 */
function mockMcpServer(opts: { list?: unknown; call?: unknown; failCall?: boolean } = {}) {
  const requests: Array<{ method: string; body: unknown }> = [];
  const fetchImpl = async (_url: string, init: { body?: string }): Promise<Response> => {
    const body = JSON.parse(init.body ?? '{}') as { id?: number; method: string; params?: Record<string, unknown> };
    requests.push({ method: body.method, body });
    let result: unknown;
    if (body.method === 'initialize') result = { protocolVersion: '2025-03-26' };
    else if (body.method === 'tools/list') result = opts.list ?? { tools: [] };
    else if (body.method === 'tools/call') result = opts.failCall ? { isError: true } : opts.call ?? { content: [{ type: 'text', text: `called:${JSON.stringify(body.params ?? {})}` }] };
    else result = { ok: true };
    return new Response(JSON.stringify({ jsonrpc: '2.0', id: body.id ?? 0, result }), { status: 200, headers: { 'content-type': 'application/json' } });
  };
  return { fetchImpl, requests };
}

test('mcp-client: initialize → tools/list → tools/call 全链（mock HTTP 服务器）', async () => {
  const server = mockMcpServer({ list: { tools: [{ name: 'search', description: '远程搜索', inputSchema: { type: 'object' } }] } });
  const client = new McpClient({ endpoint: 'https://mcp.example.com', fetchImpl: server.fetchImpl });
  const tools = await client.listTools();
  assert.equal(tools.length, 1);
  assert.equal(tools[0].name, 'search');
  const out = await client.callTool('search', { q: 'lgdl' });
  assert.match(out, /called:/);
  assert.match(out, /"q":"lgdl"/);
  const methods = server.requests.map((r) => r.method);
  assert.deepEqual(methods, ['initialize', 'tools/list', 'tools/call']); // initialize 幂等缓存
});

test('mcp-client: HTTP 错误 / RPC error / isError 转可读错误', async () => {
  const httpFail = async (): Promise<Response> => new Response('nope', { status: 503 });
  const c1 = new McpClient({ endpoint: 'https://e.com', fetchImpl: httpFail });
  await assert.rejects(() => c1.listTools(), /HTTP 503/);
  const rpcErr = async (): Promise<Response> => new Response(JSON.stringify({ jsonrpc: '2.0', id: 1, error: { message: 'nope-method' } }), { status: 200 });
  const c2 = new McpClient({ endpoint: 'https://e.com', fetchImpl: rpcErr });
  await assert.rejects(() => c2.listTools(), /nope-method/);
  const server = mockMcpServer({ list: { tools: [{ name: 't' }] }, failCall: true });
  const c3 = new McpClient({ endpoint: 'https://e.com', fetchImpl: server.fetchImpl });
  await c3.listTools();
  await assert.rejects(() => c3.callTool('t', {}), /返回错误/);
});

test('connectMcpSource: 动态注册 mcp:* 命名空间 + 审计（FR-038）+ 派发调用', async () => {
  const audit = createMemoryAudit();
  const router = createCommandRouter({ builtins: false, audit });
  const server = mockMcpServer({ list: { tools: [{ name: 'search', description: 'd', inputSchema: {} }, { name: 'fetch' }] } });
  const r = await connectMcpSource(router, { name: 'demo', endpoint: 'https://mcp.example.com', fetchImpl: server.fetchImpl, audit });
  assert.deepEqual(r, { ok: true, registered: 2 });
  assert.deepEqual(router.deriveTools().map((t) => t.name), ['mcp.demo.search', 'mcp.demo.fetch']);
  const out = await router.dispatch(tc('mcp.demo.search', { q: 'x' }));
  assert.equal(out.ok, true, out.error);
  assert.match(out.output, /called:/);
  // 审计：动态源注册事件（source=mcp:demo，ns=mcp）
  const regs = audit.events.filter((e) => e.type === 'extension-register');
  assert.equal(regs.length, 2);
  assert.ok(regs.every((e) => e.source === 'mcp:demo' && e.namespace === 'mcp'));
});

test('connectMcpSource: allowed-tools 授权过滤（FR-008）', async () => {
  const router = createCommandRouter({ builtins: false });
  const server = mockMcpServer({ list: { tools: [{ name: 'ok' }, { name: 'secret' }] } });
  const r = await connectMcpSource(router, {
    name: 'demo',
    endpoint: 'https://e.com',
    fetchImpl: server.fetchImpl,
    allowedTools: ['mcp.demo.ok'],
  });
  assert.equal(r.ok, true);
  assert.equal(r.registered, 1);
  assert.deepEqual(router.deriveTools().map((t) => t.name), ['mcp.demo.ok']);
});

test('connectMcpSource: 端点不可达 → 该源降级其余源不受影响（EC-012）', async () => {
  const router = createCommandRouter({ builtins: false });
  const bad = await connectMcpSource(router, {
    name: 'down',
    endpoint: 'https://unreachable.invalid',
    fetchImpl: async () => {
      throw new TypeError('Failed to fetch');
    },
  });
  assert.equal(bad.ok, false);
  assert.match(bad.error ?? '', /不可达|Failed to fetch/);
  assert.deepEqual(router.deriveTools(), []); // 未注册任何工具
  // 其余源正常注册
  const server = mockMcpServer({ list: { tools: [{ name: 'a' }] } });
  const good = await connectMcpSource(router, { name: 'up', endpoint: 'https://e.com', fetchImpl: server.fetchImpl });
  assert.equal(good.ok, true);
  assert.deepEqual(router.deriveTools().map((t) => t.name), ['mcp.up.a']);
});
