/**
 * LGDL site static/runtime declaration (FR-041, ADR-001/004).
 *
 * Produces the site-neutral web-cli descriptor consumed by the plugin. It does
 * NOT import any plugin package: the protocol shape is neutral, LGDL is just one
 * instance site (O-002).
 */
import type { CommandRouter, ToolEntry } from '@lgdl/web-cli-base';

export const WEB_CLI_PROTOCOL_VERSION = '1.0';
export const WEB_CLI_CHANNEL = 'web-cli';
export const WEB_CLI_SITE_NAME = 'LGDL Web Workbench';

export interface SiteDeclarationTool {
  id: string;
  summary: string;
  subcommands?: string[];
  riskHint?: ToolEntry['risk'];
}

export interface SiteDeclaration {
  protocolVersion: string;
  siteName: string;
  tools: SiteDeclarationTool[];
  transport: { kind: 'page-message'; channel: string };
}

function subcommandsOf(entry: ToolEntry): string[] | undefined {
  const params = entry.schema.parameters as { properties?: Record<string, unknown> } | undefined;
  const sub = params?.properties?.subcommand as { enum?: unknown } | undefined;
  if (sub && Array.isArray(sub.enum)) {
    const list = sub.enum.filter((s): s is string => typeof s === 'string');
    return list.length ? list : undefined;
  }
  if (entry.subcommandRisks) {
    const list = Object.keys(entry.subcommandRisks);
    return list.length ? list : undefined;
  }
  return undefined;
}

/** Build the LGDL declaration from the host router's registered domain tools. */
export function buildDeclaration(router: CommandRouter): SiteDeclaration {
  const tools: SiteDeclarationTool[] = router
    .query()
    .filter((e) => !e.namespace)
    .map((entry) => ({
      id: entry.name,
      summary: entry.summary ?? entry.schema.description.split('\n')[0],
      ...(subcommandsOf(entry) ? { subcommands: subcommandsOf(entry) } : {}),
      ...(entry.risk ? { riskHint: entry.risk } : {}),
    }));
  return {
    protocolVersion: WEB_CLI_PROTOCOL_VERSION,
    siteName: WEB_CLI_SITE_NAME,
    tools,
    transport: { kind: 'page-message', channel: WEB_CLI_CHANNEL },
  };
}
