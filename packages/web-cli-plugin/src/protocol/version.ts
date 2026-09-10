/**
 * Protocol version negotiation (FR-013 / EC-014).
 *
 * The declared `protocolVersion` is compared against the plugin's supported
 * version. Unknown / incompatible declarations are rejected or degraded with a
 * readable reason (never silently accepted).
 */
import { WEB_CLI_PROTOCOL_VERSION } from './descriptor.js';

export interface VersionNegotiation {
  ok: boolean;
  /** accept = fully compatible; degrade = usable with newer-minor features ignored; reject = incompatible. */
  action: 'accept' | 'degrade' | 'reject';
  declared: string;
  supported: string;
  /** Human-readable reason (always present). */
  reason: string;
}

interface ParsedVersion {
  major: number;
  minor: number;
}

function parseVersion(v: string): ParsedVersion | null {
  const m = /^(\d+)\.(\d+)(?:\.\d+)?$/.exec(v.trim());
  if (!m) return null;
  return { major: Number(m[1]), minor: Number(m[2]) };
}

/**
 * Negotiate a declared protocol version against the supported version.
 * - invalid version string → reject
 * - major mismatch → reject (breaking)
 * - declared minor > supported minor → degrade (accept; unknown newer features ignored)
 * - otherwise → accept
 */
export function negotiateVersion(
  declared: string,
  supported: string = WEB_CLI_PROTOCOL_VERSION,
): VersionNegotiation {
  const d = parseVersion(declared);
  const s = parseVersion(supported);
  if (!d) {
    return { ok: false, action: 'reject', declared, supported, reason: `站点协议版本 "${declared}" 不是合法版本号（应为 major.minor）` };
  }
  if (!s) {
    return { ok: false, action: 'reject', declared, supported, reason: `插件支持的协议版本 "${supported}" 配置非法` };
  }
  if (d.major !== s.major) {
    return {
      ok: false,
      action: 'reject',
      declared,
      supported,
      reason: `站点协议主版本 ${d.major} 与插件支持的主版本 ${s.major} 不兼容，已拒绝该声明`,
    };
  }
  if (d.minor > s.minor) {
    return {
      ok: true,
      action: 'degrade',
      declared,
      supported,
      reason: `站点协议版本 ${declared} 高于插件支持的 ${supported}，降级使用（忽略未知的新增能力）`,
    };
  }
  return { ok: true, action: 'accept', declared, supported, reason: `协议版本 ${declared} 兼容` };
}
