/**
 * Declared site tools → `ToolEntry` (FR-011 / FR-017 / FR-027, ADR-003).
 *
 * `descriptor.tools` becomes plugin tools in the `site` namespace; the executor
 * is the postMessage RPC to the page world.
 *
 * SECURITY (O-010 / NFR-001, BLK-1 / R-BLK1a): the site's `riskHint` is advisory
 * only and is **never** the decision basis. The plugin recomputes the effective
 * risk from its own read-only id whitelist **minus a destructive-verb denylist**
 * (`delete/purge/wipe/drop/reset/clear/remove/rm/truncate/destroy/uninstall/
 * revoke/exec/...`); anything else is forced to a danger tier (ask) or fails
 * closed (deny). A malicious site can therefore no longer self-report
 * `riskHint:'read'`, nor name a destructive tool `*-list`/`*-get`/`*-show`, to
 * get a dangerous tool silently allowed.
 */
import type { ToolEntry, ToolResult, ToolRisk } from '@lgdl/web-cli-base';
import type { WebCliDescriptor, WebCliToolDecl } from '../protocol/descriptor.js';

/** Help-group key for declared site tools (`group: 'site'`; registration is flat). */
export const SITE_GROUP = 'site';

/**
 * Flat registration prefix for site tools. The upstream `CommandRouter` builds
 * the LLM function name as `namespace ? namespace + '.' + name : name`
 * (`fqNameOf`), and OpenAI/DeepSeek reject function names that do not match
 * `^[a-zA-Z0-9_-]+$`. A declared id (the parser allows `[A-Za-z0-9_.-]`, so a
 * `.` is the practical case) must therefore be flattened into a dot-free name;
 * the original id is preserved for the page RPC.
 */
export const SITE_TOOL_PREFIX = 'site_';

/**
 * Flatten a site-declared tool id into the LLM-safe character set
 * (`^[a-zA-Z0-9_-]+$`): every other run of characters becomes a single `_`,
 * leading/trailing `_` are trimmed, and an empty result degrades to `tool`.
 */
export function sanitizeToolName(raw: string): string {
  const replaced = raw.replace(/[^a-zA-Z0-9_-]/g, '_');
  const collapsed = replaced.replace(/_+/g, '_').replace(/^_+|_+$/g, '');
  return collapsed || 'tool';
}

/** One deterministic site-tool name assignment. */
export interface SiteToolNameAssignment {
  /** Original declared id (used unchanged for the RPC and the read-only risk heuristic). */
  id: string;
  /** Flat, LLM-safe registered name (`site_<sanitized>`). */
  name: string;
  /** True when a deterministic numeric suffix was needed to avoid a collision. */
  deduped: boolean;
}

/**
 * Deterministically assign flat, collision-free names to a descriptor's tools.
 *
 * Two distinct declared ids can sanitize to the same string (e.g.
 * `graph.read` and `graph_read`); the upstream router throws on a duplicate
 * registration, so a deterministic `_2`, `_3` … suffix is appended instead of
 * silently overwriting. Order is the descriptor order, so the result is stable.
 */
export function allocateSiteToolNames(decls: WebCliToolDecl[]): SiteToolNameAssignment[] {
  const used = new Set<string>();
  const assignments: SiteToolNameAssignment[] = [];
  for (const decl of decls) {
    const base = `${SITE_TOOL_PREFIX}${sanitizeToolName(decl.id)}`;
    let name = base;
    let n = 2;
    while (used.has(name)) {
      name = `${base}_${n}`;
      n += 1;
    }
    used.add(name);
    assignments.push({ id: decl.id, name, deduped: name !== base });
  }
  return assignments;
}

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
 * Read-only verbs the plugin itself trusts for the read→allow default.
 * This is a **generic id whitelist** (not per-site hardcoding, FR-010).
 */
export const SAFE_READ_VERBS: ReadonlySet<string> = new Set([
  'list',
  'status',
  'read',
  'get',
  'show',
  'info',
  'query',
  'search',
  'help',
  'describe',
  'inspect',
  'view',
  'find',
  'count',
  'stat',
]);

/**
 * Destructive / state-mutating verbs that must **never** be classified as
 * read→allow (R-BLK1a, fail-closed). This is the *negative* half of the id
 * heuristic: a malicious site can otherwise name a destructive tool `*-list`
 * (e.g. `purge-list`, `delete-all-list`, `wipe-get`, `drop-show`,
 * `reset-status`) and ride the read whitelist.
 *
 * The denylist takes precedence over {@link SAFE_READ_VERBS} and is checked on
 * **every** id segment and subcommand — not just the trailing one.
 */
export const DESTRUCTIVE_VERBS: ReadonlySet<string> = new Set([
  // destruction / deletion
  'delete',
  'del',
  'purge',
  'wipe',
  'erase',
  'drop',
  'remove',
  'rm',
  'unlink',
  'truncate',
  'destroy',
  'discard',
  'clear',
  'reset',
  'flush',
  // install / privilege / control
  'install',
  'uninstall',
  'revoke',
  'grant',
  'deny',
  'reject',
  'override',
  'exec',
  'execute',
  'run',
  'eval',
  'evaluate',
  'spawn',
  'kill',
  'terminate',
  'halt',
  'shutdown',
  'reboot',
  'restart',
  'abort',
  'force',
  // mutation
  'write',
  'edit',
  'modify',
  'update',
  'patch',
  'set',
  'put',
  'post',
  'create',
  'add',
  'insert',
  'append',
  'push',
  'upload',
  'submit',
  'send',
  'apply',
  'commit',
  'merge',
  'move',
  'rename',
  'migrate',
  'import',
  'export',
  'download',
  'save',
  'sync',
  'restore',
]);

function idSegments(id: string): string[] {
  return id
    .toLowerCase()
    .split(/[._:/-]+/)
    .filter(Boolean);
}

function lastIdSegment(id: string): string {
  const parts = idSegments(id);
  return parts.length ? (parts[parts.length - 1] as string) : '';
}

/**
 * Whether the tool id or any declared subcommand carries a destructive verb
 * (R-BLK1a). Any hit forces the tool out of the read→allow path.
 */
export function hasDestructiveVerb(decl: WebCliToolDecl): boolean {
  if (idSegments(decl.id).some((s) => DESTRUCTIVE_VERBS.has(s))) return true;
  const subs = decl.subcommands ?? [];
  return subs.some((s) => DESTRUCTIVE_VERBS.has(s.toLowerCase().trim()));
}

/**
 * Plugin-side classification of a declared tool as read-only: no id segment or
 * subcommand may carry a destructive verb (R-BLK1a), the last id segment must be
 * a known read verb, and every declared subcommand must be a read verb too.
 * The site's `riskHint` is deliberately ignored here.
 */
export function isSafeReadOnlyTool(decl: WebCliToolDecl): boolean {
  if (hasDestructiveVerb(decl)) return false;
  if (!SAFE_READ_VERBS.has(lastIdSegment(decl.id))) return false;
  const subs = decl.subcommands ?? [];
  return subs.every((s) => SAFE_READ_VERBS.has(s.toLowerCase().trim()));
}

/**
 * Recompute the effective risk (plugin-side, fail-closed; FR-026/FR-027).
 *
 * The site's `riskHint` is advisory only and is **never** the decision basis
 * (plan §2.5 / spike §1.2). The plugin decides:
 *
 *   - id matches the plugin read-only whitelist → `read` (read default allow)
 *   - otherwise, the site declared *some* structure we can act on (a risk hint
 *     or a subcommand list) → `write` (danger tier → ask; never silent allow)
 *   - otherwise (opaque tool: no hint, no subcommands) → `undefined`
 *     (unknown → S3 deny, fail-closed)
 *
 * BLK-1: a site self-reporting `riskHint:'read'` for a write/dangerous tool now
 * yields `write` (ask), so the `read→allow` path can no longer be abused.
 */
export function effectiveRisk(decl: WebCliToolDecl): ToolRisk | undefined {
  if (isSafeReadOnlyTool(decl)) return 'read';
  const declared = decl.riskHint !== undefined || (decl.subcommands?.length ?? 0) > 0;
  return declared ? 'write' : undefined;
}

/** Build a readable help text for a declared site tool. */
export function declaredToolHelp(decl: WebCliToolDecl, origin: string, assignedName?: string): string {
  const name = assignedName ?? `${SITE_TOOL_PREFIX}${sanitizeToolName(decl.id)}`;
  const lines = [`${name} —— ${decl.summary}`, `来源站点：${origin}（站点声明，默认 untrusted）`];
  // Display the original declared id whenever it differs from the flattened LLM
  // name, so the collision/sanitize mapping stays auditable and RPC fidelity is
  // explicit (the executor always dispatches the original id).
  if (name !== decl.id) lines.push(`站点原始工具 id：${decl.id}（执行仍按原始 id 经 postMessage RPC 派发）`);
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

/**
 * Convert one declared tool into a plugin `ToolEntry`.
 *
 * `assignedName` (from {@link allocateSiteToolNames}) is the flat, LLM-safe
 * registered name. Registration is `namespace: ''` (so `fqNameOf` never inserts
 * a `.`) while `group: 'site'` keeps the help grouping and the plugin policy's
 * site-tool判据. The executor always dispatches the **original** `decl.id`
 * (RPC fidelity — the site routes by its own id).
 */
export function toToolEntry(decl: WebCliToolDecl, origin: string, rpc: SiteRpc, assignedName?: string): ToolEntry {
  const risk = effectiveRisk(decl);
  const legalName = assignedName ?? `${SITE_TOOL_PREFIX}${sanitizeToolName(decl.id)}`;
  const subcommandRisks = decl.subcommands?.length && risk
    ? Object.fromEntries(decl.subcommands.map((s) => [s, risk])) as Record<string, ToolRisk>
    : undefined;
  return {
    name: legalName,
    namespace: '',
    summary: decl.summary,
    schema: {
      name: legalName,
      description: decl.summary,
      parameters: paramsToSchema(decl),
    },
    ...(risk ? { risk } : {}),
    ...(subcommandRisks ? { subcommandRisks } : {}),
    group: SITE_GROUP,
    help: () => declaredToolHelp(decl, origin, legalName),
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

/** Convert all declared tools in a descriptor (deterministic collision-free names). */
export function toToolEntries(descriptor: WebCliDescriptor, origin: string, rpc: SiteRpc): ToolEntry[] {
  const names = allocateSiteToolNames(descriptor.tools);
  return descriptor.tools.map((t, i) => toToolEntry(t, origin, rpc, names[i]?.name));
}
