/**
 * mcp-client.ts —— MCP Streamable HTTP/SSE 轻量客户端（FR-037/FR-038/EC-012，P2 试点 S-07）。
 *
 * 生态位（§3.5/§3.3 F 组）：MCP stdio 不可承载（NG-001）→ **Streamable HTTP** 试点
 * 1-2 连接器：JSON-RPC 2.0 initialize / tools/list / tools/call + SSE 流预留。base 内置
 * 轻量客户端（fetch 自解析，零 @modelcontextprotocol/sdk 依赖，ADR-006/NFR-002）。
 *
 * 动态注册：命名空间 mcp:*（工具 fqn = `mcp.<源>.<工具名>`），allowed-tools 授权过滤 +
 * 全流程入审计（FR-038）。**端点不可达 → 该源降级（不注册）其余源/会话不受影响**
 * （EC-012）。CSP connect-src 约束：MCP 端点需放行（记录 help/注释，NFR-008）。
 *
 * 本文件零 LGDL/react import（NFR-001）。
 */
import type { CommandRouter, RegisterOptions, ToolEntry, ToolResult } from './router.js';
import type { AuditSink } from './audit.js';

/** JSON-RPC 消息。 */
export interface McpJsonRpc {
  jsonrpc: '2.0';
  id: number;
  method: string;
  params?: Record<string, unknown>;
}

export interface McpToolInfo {
  name: string;
  description?: string;
  inputSchema?: Record<string, unknown>;
}

export interface McpClientOptions {
  endpoint: string;
  fetchImpl?: typeof fetch;
  /** 鉴权（optional；Authorization: Bearer）。 */
  apiKey?: string;
  timeoutMs?: number;
}

/** 轻量 MCP Streamable HTTP 客户端（JSON-RPC over fetch）。 */
export class McpClient {
  private nextId = 1;
  private initialized = false;
  private readonly fetchImpl: typeof fetch;

  constructor(private opts: McpClientOptions) {
    this.fetchImpl = opts.fetchImpl ?? globalThis.fetch.bind(globalThis);
  }

  private async rpc<T>(method: string, params?: Record<string, unknown>): Promise<T> {
    const body: McpJsonRpc = { jsonrpc: '2.0', id: this.nextId++, method, ...(params ? { params } : {}) };
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.opts.timeoutMs ?? 15000);
    try {
      const res = await this.fetchImpl(this.opts.endpoint, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          accept: 'application/json, text/event-stream',
          ...(this.opts.apiKey ? { authorization: `Bearer ${this.opts.apiKey}` } : {}),
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(`MCP HTTP ${res.status}`);
      const data = (await res.json()) as { result?: T; error?: { message?: string } };
      if (data.error) throw new Error(`MCP RPC 错误：${data.error.message ?? 'unknown'}`);
      if (data.result === undefined) throw new Error('MCP 响应无 result');
      return data.result;
    } finally {
      clearTimeout(timer);
    }
  }

  /** initialize（协议握手；幂等）。 */
  async initialize(): Promise<void> {
    if (this.initialized) return;
    const r = await this.rpc<{ protocolVersion: string }>('initialize', {
      protocolVersion: '2025-03-26',
      capabilities: {},
      clientInfo: { name: 'web-cli-base-mcp', version: '0.1' },
    });
    this.initialized = true;
    void r;
  }

  /** tools/list。 */
  async listTools(): Promise<McpToolInfo[]> {
    await this.initialize();
    const r = await this.rpc<{ tools?: McpToolInfo[] }>('tools/list');
    return r.tools ?? [];
  }

  /** tools/call（返回首个 text 内容）。 */
  async callTool(name: string, args: Record<string, unknown> = {}): Promise<string> {
    await this.initialize();
    const r = await this.rpc<{ content?: Array<{ type: string; text?: string }>; isError?: boolean }>('tools/call', { name, arguments: args });
    if (r.isError) throw new Error('MCP 工具返回错误');
    return (r.content ?? []).filter((c) => c.type === 'text').map((c) => c.text ?? '').join('\n');
  }
}

export function createMcpClient(opts: McpClientOptions): McpClient {
  return new McpClient(opts);
}

// ---------- 动态注册 ----------

export interface ConnectMcpSourceOptions {
  /** 源标签（注册前缀 + 审计 source 用，如 "github"）。 */
  name: string;
  endpoint: string;
  fetchImpl?: typeof fetch;
  apiKey?: string;
  /** allowed-tools 授权集（FR-008：仅注册授权内工具；缺省全放行）。 */
  allowedTools?: string[];
  audit?: AuditSink;
  timeoutMs?: number;
}

export type ConnectMcpResult = { ok: true; registered: number } | { ok: false; error: string };

function sanitize(name: string): string {
  return name.replace(/[^\w.-]/g, '_').slice(0, 40);
}

/**
 * 连接 MCP 源并动态注册工具（命名空间 mcp；EC-012：失败 → 该源不注册，不影响其他源）。
 */
export async function connectMcpSource(router: CommandRouter, opts: ConnectMcpSourceOptions): Promise<ConnectMcpResult> {
  const client = new McpClient({ endpoint: opts.endpoint, fetchImpl: opts.fetchImpl, apiKey: opts.apiKey, timeoutMs: opts.timeoutMs });
  let tools: McpToolInfo[];
  try {
    tools = await client.listTools();
  } catch (err) {
    // EC-012：端点不可达/协议错误 → 该源降级（不注册）
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: `MCP 源 "${opts.name}" 不可达/协议错误：${msg}` };
  }
  const prefix = sanitize(opts.name);
  let registered = 0;
  for (const t of tools) {
    const fqn = `mcp.${prefix}.${t.name}`;
    if (opts.allowedTools && !opts.allowedTools.includes(fqn)) continue; // FR-008 授权过滤
    const entry: ToolEntry = {
      name: `${prefix}.${t.name}`,
      namespace: 'mcp',
      summary: t.description ?? `MCP 工具 ${t.name}`,
      schema: {
        name: fqn,
        description: `${t.description ?? `MCP 工具 ${t.name}`}（经 MCP Streamable HTTP 源 "${opts.name}"）`,
        parameters: (t.inputSchema ?? { type: 'object', properties: {} }) as Record<string, unknown>,
      },
      risk: 'external',
      group: 'mcp',
      executor: async (tc): Promise<ToolResult> => {
        try {
          const text = await client.callTool(t.name, tc.args);
          return { ok: true, output: text || '（MCP 返回空）' };
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          return { ok: false, output: `✖ MCP 调用失败：${msg}`, error: msg };
        }
      },
    };
    const regOpts: RegisterOptions = { source: `mcp:${opts.name}` };
    router.register(entry, regOpts); // 重复注册抛错由 router 承担；审计 FR-038
    registered += 1;
  }
  return { ok: true, registered };
}
