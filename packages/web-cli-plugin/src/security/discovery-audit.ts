/**
 * Discovery / descriptor-read audit event builder (FR-025 / NFR-003).
 *
 * Site discovery and declaration reading are security-relevant steps (which
 * origin declared what, via which channel, with what trust/integrity), so they
 * must be auditable too. Pure logic, node-testable.
 */
import type { WebCliDescriptor } from '../protocol/descriptor.js';
import type { PluginAuditEvent } from './audit-sink.js';

/**
 * Build the audit event for a discovery outcome. `descriptor === undefined`
 * means no usable declaration was found (unsupported / unknown / read failure).
 */
export function discoveryAuditEvent(
  origin: string,
  descriptor: WebCliDescriptor | undefined,
  now: number = Date.now(),
): PluginAuditEvent {
  if (!descriptor) {
    return {
      type: 'descriptor-read',
      ts: now,
      origin,
      ok: false,
      detail: '未发现有效声明（不支持 / 未知 / 读取失败）',
    };
  }
  const src = descriptor.source;
  const channel = src?.channel ?? 'unknown';
  const integrity = src?.integrityVerified ? 'integrity=verified' : 'integrity=unverified';
  const trust = src?.trust ?? 'untrusted';
  return {
    type: 'descriptor-read',
    ts: now,
    origin,
    ok: true,
    trust,
    detail: `发现声明：channel=${channel}; ${integrity}; tools=${descriptor.tools.length}; protocol=${descriptor.protocolVersion}`,
  };
}
