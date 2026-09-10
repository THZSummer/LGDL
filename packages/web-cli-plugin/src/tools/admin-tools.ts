/**
 * Plugin management tools (FR-023 / FR-025, ADR-003).
 *
 * Six local tools in the `plugin` namespace:
 *   origin-authorize / origin-revoke / origin-list
 *   descriptor-show / audit-export / llm-config
 *
 * They run in the background (no RPC) and are the only way the LLM can manage
 * authorizations / inspect the current declaration / export the audit trail.
 */
import type { ToolEntry, ToolResult } from '@lgdl/web-cli-base';
import type { OriginStore } from '../security/origin-store.js';
import type { PluginAuditSink } from '../security/audit-sink.js';

export const ADMIN_NAMESPACE = 'plugin';

export interface AdminToolDeps {
  origins: OriginStore;
  audit: PluginAuditSink;
  /** Readable view of the currently active declaration (or a specific origin). */
  descriptorShow(origin: string): Promise<string>;
  /** Masked LLM configuration (never plaintext key). */
  llmConfig(): Promise<string>;
}

function requireOrigin(args: Record<string, string>): string | null {
  const origin = args.origin?.trim();
  return origin ? origin : null;
}

function ok(output: string): ToolResult {
  return { ok: true, output };
}
function fail(output: string): ToolResult {
  return { ok: false, output, error: output };
}

/** Build the six plugin management tool entries. */
export function createAdminToolEntries(deps: AdminToolDeps): ToolEntry[] {
  const entries: ToolEntry[] = [
    {
      name: 'origin-authorize',
      namespace: ADMIN_NAMESPACE,
      summary: '授权插件对某 origin 执行操作（per-origin 显式授权）',
      risk: 'write',
      group: 'plugin',
      schema: {
        name: `${ADMIN_NAMESPACE}.origin-authorize`,
        description: '显式授权某个站点 origin，使站点声明的工具可被调用。授权与信任分离。',
        parameters: {
          type: 'object',
          properties: { origin: { type: 'string', description: '站点 origin，如 https://example.com' } },
          required: ['origin'],
        },
      },
      executor: async (tc) => {
        const origin = requireOrigin(tc.args);
        if (!origin) return fail('✖ origin-authorize 需要 --origin');
        const rec = await deps.origins.authorize(origin);
        return ok(`✓ 已授权 ${rec.origin}（信任态 ${rec.trust}）`);
      },
    },
    {
      name: 'origin-revoke',
      namespace: ADMIN_NAMESPACE,
      summary: '撤销某 origin 的授权',
      risk: 'write',
      group: 'plugin',
      schema: {
        name: `${ADMIN_NAMESPACE}.origin-revoke`,
        description: '撤销某个站点 origin 的授权；后续调用将被门禁拒绝。',
        parameters: {
          type: 'object',
          properties: { origin: { type: 'string', description: '站点 origin' } },
          required: ['origin'],
        },
      },
      executor: async (tc) => {
        const origin = requireOrigin(tc.args);
        if (!origin) return fail('✖ origin-revoke 需要 --origin');
        const changed = await deps.origins.revoke(origin);
        return changed ? ok(`✓ 已撤销 ${origin} 的授权`) : fail(`✖ ${origin} 当前无授权记录`);
      },
    },
    {
      name: 'origin-list',
      namespace: ADMIN_NAMESPACE,
      summary: '列出已授权/已记录的 origin 及其信任态',
      risk: 'read',
      group: 'plugin',
      schema: {
        name: `${ADMIN_NAMESPACE}.origin-list`,
        description: '列出所有 origin 的授权状态与信任态。',
        parameters: { type: 'object', properties: {} },
      },
      executor: async () => {
        const list = await deps.origins.list();
        if (!list.length) return ok('（暂无 origin 记录）');
        return ok(
          list
            .map((r) => `${r.origin}\t授权=${r.authorized ? '是' : '否'}\t信任=${r.trust}`)
            .join('\n'),
        );
      },
    },
    {
      name: 'descriptor-show',
      namespace: ADMIN_NAMESPACE,
      summary: '查看当前站点声明（工具面/协议版本/来源）',
      risk: 'read',
      group: 'plugin',
      schema: {
        name: `${ADMIN_NAMESPACE}.descriptor-show`,
        description: '显示当前活跃站点的 web-cli 声明内容与来源信息。',
        parameters: {
          type: 'object',
          properties: { origin: { type: 'string', description: '可选：指定 origin；缺省当前活跃站点' } },
        },
      },
      executor: async (tc) => {
        const origin = tc.args.origin?.trim() || '';
        const text = await deps.descriptorShow(origin);
        deps.audit.recordPlugin({ type: 'descriptor-read', ts: Date.now(), origin: origin || undefined, detail: 'descriptor-show' });
        return ok(text);
      },
    },
    {
      name: 'audit-export',
      namespace: ADMIN_NAMESPACE,
      summary: '导出审计记录（JSON，零明文）',
      risk: 'read',
      group: 'plugin',
      schema: {
        name: `${ADMIN_NAMESPACE}.audit-export`,
        description: '导出全部审计事件（JSON 文本）。审计记录已脱敏，不含敏感明文。',
        parameters: { type: 'object', properties: {} },
      },
      executor: async () => {
        const events = await deps.audit.exportEvents();
        return ok(`审计记录（${events.length} 条）：\n${JSON.stringify(events, null, 2)}`);
      },
    },
    {
      name: 'llm-config',
      namespace: ADMIN_NAMESPACE,
      summary: '查看当前 LLM 配置（key 掩码）',
      risk: 'read',
      group: 'plugin',
      schema: {
        name: `${ADMIN_NAMESPACE}.llm-config`,
        description: '显示当前 LLM 厂商/模型配置；API key 仅以掩码显示，绝不回传明文。',
        parameters: { type: 'object', properties: {} },
      },
      executor: async () => {
        const text = await deps.llmConfig();
        deps.audit.recordPlugin({ type: 'llm-config', ts: Date.now(), detail: 'llm-config 查询（掩码）' });
        return ok(text);
      },
    },
  ];
  return entries;
}
