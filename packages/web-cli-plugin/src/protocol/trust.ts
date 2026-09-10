/**
 * Trust model (FR-012 / EC-002 / ADR-003).
 *
 * Site declarations are `untrusted` by default; the user may explicitly promote
 * an origin to `trusted` (authorization and trust are separate concerns).
 * Integrity: an optional sha256 digest is verified when present; a declaration
 * without integrity is kept conservative (`integrityVerified: false`).
 */
import type { WebCliDescriptor, WebCliDescriptorChannel, WebCliDescriptorSource } from './descriptor.js';

export interface IntegrityResult {
  integrityVerified: boolean;
  reason: string;
}

/** sha256 hex digest of a UTF-8 string (WebCrypto; available in browser and node ≥ 20). */
export async function sha256Hex(text: string): Promise<string> {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) throw new Error('WebCrypto subtle 不可用，无法校验完整性');
  const data = new TextEncoder().encode(text);
  const buf = await subtle.digest('SHA-256', data);
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Verify a descriptor's integrity digest against the raw declaration text.
 * - no integrity declaration → `integrityVerified: false` (conservative)
 * - digest mismatch → false + readable reason (tamper detectable, FR-012)
 */
export async function verifyIntegrity(descriptor: WebCliDescriptor, rawText?: string): Promise<IntegrityResult> {
  if (!descriptor.integrity) {
    return { integrityVerified: false, reason: '声明未提供完整性摘要，按 untrusted 保守处理' };
  }
  if (typeof rawText !== 'string') {
    return { integrityVerified: false, reason: '声明提供了完整性摘要但缺少原始文本，无法校验（保守处理）' };
  }
  let actual: string;
  try {
    actual = await sha256Hex(rawText);
  } catch (err) {
    return { integrityVerified: false, reason: `完整性校验不可用：${err instanceof Error ? err.message : String(err)}` };
  }
  if (actual !== descriptor.integrity.digest.toLowerCase()) {
    return {
      integrityVerified: false,
      reason: `声明完整性校验失败（期望 ${descriptor.integrity.digest.slice(0, 12)}…，实际 ${actual.slice(0, 12)}…），可能被篡改`,
    };
  }
  return { integrityVerified: true, reason: '声明完整性校验通过' };
}

/** Default provenance for a discovered declaration (untrusted, unverified). */
export function defaultSource(
  origin: string,
  channel: WebCliDescriptorChannel,
  fetchedAt: number = Date.now(),
): WebCliDescriptorSource {
  return { origin, channel, fetchedAt, integrityVerified: false, trust: 'untrusted' };
}

/** Trust view: minimal lookup the plugin needs (kept decoupled from the storage layer). */
export interface TrustView {
  trustOf(origin: string): 'untrusted' | 'trusted' | Promise<'untrusted' | 'trusted'>;
}

/** Resolve trust for an origin; unknown origin defaults to `untrusted`. */
export async function resolveTrust(origin: string, view?: TrustView): Promise<'untrusted' | 'trusted'> {
  if (!view) return 'untrusted';
  const t = await view.trustOf(origin);
  return t === 'trusted' ? 'trusted' : 'untrusted';
}
