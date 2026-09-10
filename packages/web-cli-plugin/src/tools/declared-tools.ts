/**
 * Declared site tools → `ToolEntry` (FR-011 / FR-017, ADR-003).
 *
 * `descriptor.tools` becomes plugin tools in the `site` namespace; the executor
 * is the postMessage RPC to the page world. The site's `riskHint` is advisory
 * only — the plugin recomputes the effective risk and fails closed when unknown.
 */
import type { ToolEntry, ToolResult, ToolRisk } from '@lgdl/web-cli-base';
import { isToolRisk, type WebCliDescriptor, type WebCliToolDecl } from '../protocol/descriptor.js';

export const SITE_NAMESPACE = 'site';

export interface SiteRpcRequest {
  origin: string;
  tool: string;
  subcommand: string;
  args: Record<string, string>;
}

/** Site RPC transport (content script → page world) injected by the background host. */
export interface SiteRpc {
  invoke(req: SiteRpcRequest): Promise<ToolResult>;
}

/** Build the JSON-schema parameters block for a declared tool. */
export function paramsToSchema(decl: WebCliToolDecl): Record<string, unknown> {
  const properties: Record<string, unknown> = {
    subcommand: {
      type: 'string',
      description: decl.subcommands?.length
        ? `子命令（可选：${decl.subcommands.join(' / ')}）`
        : '子命令（可选）',
    },
  };
  const argProps: Record<string, unknown> = {};
  const required: string[] = [];
  for (const [name, p] of Object.entries(decl.params ?? {})) {
    argProps[name] = { type: p.type, ...(p.desc ? { description: p.desc } : {}) };
    if (p.required) required.push(name);
  }
  properties.args = {
    type: 'object',
    ...(Object.keys(argProps).length ? { properties: argProps } : {}),
    ...(required.length ? { required } : {}),
  };
  return { type: 'object', properties };
}

/**
 * Recompute the effective risk from the (advisory) site hint.
 * Unknown/missing hint → undefined, which the S2/S3 strategies deny (fail-closed).
 */
export function effectiveRisk(decl: WebCliToolDecl): ToolRisk | undefined {
  return isToolRisk(decl.riskHint) ? decl.riskHint : undefined;
}

/** Build a readable help text for a declared site tool. */
export function declaredToolHelp(decl: WebCliToolDecl, origin: string): string {
  const lines = [`site.${decl.id} —— ${decl.summary}`, `来源站点：${origin}（站点声明，默认 untrusted）`];
  if (decl.params && Object.keys(decl.params).length) {
    lines.push('参数：');
    for (const [k, p] of Object.entries(decl.params)) {
      lines.push(`  --${k} (${p.type})${p.required ? ' 必填' : ''}${p.desc ? `：${p.desc}` : ''}`);
    }
  }
  if (decl.subcommands?.length) lines.push(`子命令：${decl.subcommands.join(' / ')}`);
  lines.push('执行经站点 postMessage RPC；敏感档位需用户确认。');
  return lines.join('\n');
}

/** Convert one declared tool into a plugin `ToolEntry`. */
export function toToolEntry(decl: WebCliToolDecl, origin: string, rpc: SiteRpc): ToolEntry {
  const risk = effectiveRisk(decl);
  const subcommandRisks = decl.subcommands?.length && risk
    ? Object.fromEntries(decl.subcommands.map((s) => [s, risk])) as Record<string, ToolRisk>
    : undefined;
  return {
    name: decl.id,
    namespace: SITE_NAMESPACE,
    summary: decl.summary,
    schema: {
      name: `${SITE_NAMESPACE}.${decl.id}`,
      description: decl.summary,
      parameters: paramsToSchema(decl),
    },
    ...(risk ? { risk } : {}),
    ...(subcommandRisks ? { subcommandRisks } : {}),
    group: 'site',
    help: () => declaredToolHelp(decl, origin),
    executor: async (tc, ctx) => {
      const targetOrigin = typeof ctx?.origin === 'string' && ctx.origin ? ctx.origin : origin;
      return rpc.invoke({
        origin: targetOrigin,
        tool: decl.id,
        subcommand: tc.subcommand,
        args: tc.args,
      });
    },
  };
}

/** Convert all declared tools in a descriptor. */
export function toToolEntries(descriptor: WebCliDescriptor, origin: string, rpc: SiteRpc): ToolEntry[] {
  return descriptor.tools.map((t) => toToolEntry(t, origin, rpc));
}
