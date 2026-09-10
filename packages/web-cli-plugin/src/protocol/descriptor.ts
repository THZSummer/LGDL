/**
 * WebCliDescriptor —— site-neutral web-cli protocol descriptor schema (ADR-001/007).
 *
 * Three-layer protocol: discovery → descriptor (this file) → RPC transport (`rpc.ts`).
 * This module is pure logic (zero chrome / zero site-private format), node-testable.
 *
 * FR-011: minimum declared tool semantics — capability id / summary / params /
 * risk hint / protocol version. FR-014: invalid declarations are rejected with a
 * readable reason (never crash, never silently accepted).
 */
import type { ToolRisk } from '@lgdl/web-cli-base';

/** web-cli protocol version implemented by this plugin (semver-ish, plan first version). */
export const WEB_CLI_PROTOCOL_VERSION = '1.0';

/** Allowed risk tiers (mirrors upstream ToolRisk; plugin recomputes effective risk). */
export const WEB_CLI_RISKS: readonly ToolRisk[] = ['read', 'write', 'external', 'ui', 'state', 'evaluate'];

/** A single tool declaration exposed by a site (FR-011). */
export interface WebCliToolDecl {
  /** Capability id, unique within the site; plugin registers it as `site:<id>`. */
  id: string;
  /** Purpose (goes into the LLM tool schema description). */
  summary: string;
  /** Parameter semantics (JSON-schema subset; used to build the tool schema). */
  params?: Record<string, WebCliParamDecl>;
  /** Optional subcommand list (used for help / subcommand risk mapping). */
  subcommands?: string[];
  /** Site-reported risk hint — advisory only, never the decision basis (plugin recomputes). */
  riskHint?: ToolRisk;
}

export interface WebCliParamDecl {
  type: 'string' | 'number' | 'boolean';
  desc?: string;
  required?: boolean;
}

/** Execution transport binding (first version: postMessage RPC). */
export interface WebCliTransport {
  kind: 'page-message';
  /** postMessage channel namespace (avoids collisions with other page messages). */
  channel: string;
  invokeType?: string;
  resultType?: string;
}

/** Optional integrity digest (FR-012 tamper detection). */
export interface WebCliIntegrity {
  algorithm: 'sha256';
  digest: string;
}

export type WebCliDescriptorChannel = 'well-known' | 'html-link' | 'runtime-handshake';

/** Provenance filled by the plugin (site does not need to provide it). */
export interface WebCliDescriptorSource {
  origin: string;
  channel: WebCliDescriptorChannel;
  fetchedAt: number;
  /** Integrity verification result (no integrity declaration = false). */
  integrityVerified: boolean;
  /** Declaration trust state, separate from user authorization (FR-012). */
  trust: 'untrusted' | 'trusted';
}

export interface WebCliDescriptor {
  protocolVersion: string;
  siteName?: string;
  tools: WebCliToolDecl[];
  transport: WebCliTransport;
  integrity?: WebCliIntegrity;
  source?: WebCliDescriptorSource;
}

export interface DescriptorParseOk {
  ok: true;
  descriptor: WebCliDescriptor;
}
export interface DescriptorParseErr {
  ok: false;
  error: string;
}
export type DescriptorParseResult = DescriptorParseOk | DescriptorParseErr;

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** Whether `v` is one of the six allowed risk tiers. */
export function isToolRisk(v: unknown): v is ToolRisk {
  return typeof v === 'string' && (WEB_CLI_RISKS as readonly string[]).includes(v);
}

/** Parse a raw tool declaration; returns readable error on invalid shape. */
export function parseToolDecl(raw: unknown): { ok: true; tool: WebCliToolDecl } | { ok: false; error: string } {
  if (!isRecord(raw)) return { ok: false, error: '工具声明必须是对象' };
  const id = raw.id;
  if (typeof id !== 'string' || !id.trim()) return { ok: false, error: '工具声明缺少非空字符串字段 id' };
  if (!/^[A-Za-z0-9_.-]+$/.test(id.trim())) {
    return { ok: false, error: `工具 id "${id}" 含非法字符（仅允许字母/数字/_.-）` };
  }
  const summary = raw.summary;
  if (typeof summary !== 'string' || !summary.trim()) {
    return { ok: false, error: `工具 "${id}" 缺少非空 summary` };
  }
  let params: WebCliToolDecl['params'];
  if (raw.params !== undefined) {
    if (!isRecord(raw.params)) return { ok: false, error: `工具 "${id}" 的 params 必须是对象` };
    params = {};
    for (const [k, v] of Object.entries(raw.params)) {
      if (!isRecord(v) || (v.type !== 'string' && v.type !== 'number' && v.type !== 'boolean')) {
        return { ok: false, error: `工具 "${id}" 参数 "${k}" 的 type 必须是 string/number/boolean` };
      }
      params[k] = {
        type: v.type,
        ...(typeof v.desc === 'string' ? { desc: v.desc } : {}),
        ...(v.required === true ? { required: true } : {}),
      };
    }
  }
  let subcommands: string[] | undefined;
  if (raw.subcommands !== undefined) {
    if (!Array.isArray(raw.subcommands) || raw.subcommands.some((s) => typeof s !== 'string')) {
      return { ok: false, error: `工具 "${id}" 的 subcommands 必须是字符串数组` };
    }
    subcommands = (raw.subcommands as string[]).map((s) => s.trim()).filter(Boolean);
  }
  let riskHint: ToolRisk | undefined;
  if (raw.riskHint !== undefined) {
    if (!isToolRisk(raw.riskHint)) {
      return { ok: false, error: `工具 "${id}" 的 riskHint "${String(raw.riskHint)}" 不是合法风险档位` };
    }
    riskHint = raw.riskHint;
  }
  return {
    ok: true,
    tool: {
      id: id.trim(),
      summary: summary.trim(),
      ...(params ? { params } : {}),
      ...(subcommands ? { subcommands } : {}),
      ...(riskHint ? { riskHint } : {}),
    },
  };
}

function parseTransport(raw: unknown): { ok: true; transport: WebCliTransport } | { ok: false; error: string } {
  if (!isRecord(raw)) return { ok: false, error: 'transport 必须是对象' };
  if (raw.kind !== 'page-message') return { ok: false, error: `不支持的 transport.kind "${String(raw.kind)}"（首版仅 page-message）` };
  const channel = raw.channel;
  if (typeof channel !== 'string' || !channel.trim()) return { ok: false, error: 'transport.channel 必须是非空字符串' };
  const invokeType = typeof raw.invokeType === 'string' && raw.invokeType ? raw.invokeType : undefined;
  const resultType = typeof raw.resultType === 'string' && raw.resultType ? raw.resultType : undefined;
  return { ok: true, transport: { kind: 'page-message', channel: channel.trim(), invokeType, resultType } };
}

function parseIntegrity(raw: unknown): { ok: true; integrity?: WebCliIntegrity } | { ok: false; error: string } {
  if (raw === undefined) return { ok: true };
  if (!isRecord(raw)) return { ok: false, error: 'integrity 必须是对象' };
  if (raw.algorithm !== 'sha256') return { ok: false, error: `不支持的 integrity.algorithm "${String(raw.algorithm)}"（仅 sha256）` };
  const digest = raw.digest;
  if (typeof digest !== 'string' || !/^[0-9a-f]{64}$/i.test(digest)) {
    return { ok: false, error: 'integrity.digest 必须是 64 位十六进制 sha256 摘要' };
  }
  return { ok: true, integrity: { algorithm: 'sha256', digest: digest.toLowerCase() } };
}

/**
 * Parse and validate an unknown value into a `WebCliDescriptor` (FR-011/014).
 * Never throws; invalid input returns a readable error.
 */
export function parseDescriptor(
  input: unknown,
  meta?: { origin?: string; channel?: WebCliDescriptorChannel; fetchedAt?: number; integrityVerified?: boolean; trust?: 'untrusted' | 'trusted' },
): DescriptorParseResult {
  if (!isRecord(input)) return { ok: false, error: '声明必须是 JSON 对象' };
  const protocolVersion = input.protocolVersion;
  if (typeof protocolVersion !== 'string' || !protocolVersion.trim()) {
    return { ok: false, error: '声明缺少非空字符串字段 protocolVersion' };
  }
  if (!Array.isArray(input.tools)) return { ok: false, error: '声明缺少 tools 数组' };

  const tools: WebCliToolDecl[] = [];
  const seen = new Set<string>();
  for (const rawTool of input.tools) {
    const parsed = parseToolDecl(rawTool);
    if (!parsed.ok) return { ok: false, error: parsed.error };
    if (seen.has(parsed.tool.id)) return { ok: false, error: `工具 id "${parsed.tool.id}" 重复` };
    seen.add(parsed.tool.id);
    tools.push(parsed.tool);
  }

  const transport = parseTransport(input.transport);
  if (!transport.ok) return { ok: false, error: transport.error };
  const integrity = parseIntegrity(input.integrity);
  if (!integrity.ok) return { ok: false, error: integrity.error };

  const siteName = typeof input.siteName === 'string' && input.siteName.trim() ? input.siteName.trim() : undefined;
  const descriptor: WebCliDescriptor = {
    protocolVersion: protocolVersion.trim(),
    ...(siteName ? { siteName } : {}),
    tools,
    transport: transport.transport,
    ...(integrity.integrity ? { integrity: integrity.integrity } : {}),
  };
  if (meta?.origin) {
    descriptor.source = {
      origin: meta.origin,
      channel: meta.channel ?? 'well-known',
      fetchedAt: meta.fetchedAt ?? Date.now(),
      integrityVerified: meta.integrityVerified === true,
      trust: meta.trust ?? 'untrusted',
    };
  }
  return { ok: true, descriptor };
}

/** Normalize a parsed descriptor (deterministic ordering / trimmed ids). */
export function normalizeDescriptor(d: WebCliDescriptor): WebCliDescriptor {
  return {
    protocolVersion: d.protocolVersion.trim(),
    ...(d.siteName ? { siteName: d.siteName.trim() } : {}),
    tools: d.tools.map((t) => ({
      id: t.id.trim(),
      summary: t.summary.trim(),
      ...(t.params ? { params: { ...t.params } } : {}),
      ...(t.subcommands ? { subcommands: [...t.subcommands] } : {}),
      ...(t.riskHint ? { riskHint: t.riskHint } : {}),
    })),
    transport: { ...d.transport },
    ...(d.integrity ? { integrity: { ...d.integrity } } : {}),
    ...(d.source ? { source: { ...d.source } } : {}),
  };
}

/** Parse a JSON string then validate (convenience for static-declaration channel). */
export function parseDescriptorJson(
  text: string,
  meta?: { origin?: string; channel?: WebCliDescriptorChannel; fetchedAt?: number },
): DescriptorParseResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch (err) {
    return { ok: false, error: `声明不是合法 JSON：${err instanceof Error ? err.message : String(err)}` };
  }
  return parseDescriptor(raw, meta);
}
