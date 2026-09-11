/**
 * Protocol version negotiation (FR-013 / EC-014).
 *
 * The declared `protocolVersion` is compared against the plugin's supported
 * version. Unknown / incompatible declarations are rejected or degraded with a
 * readable reason (never silently accepted).
 */
import { WEB_CLI_PROTOCOL_VERSION } from './descriptor.js';

export type VersionAction = 'accept' | 'degrade' | 'reject';

export interface VersionNegotiation {
  ok: boolean;
  /** accept = fully compatible; degrade = usable with newer-minor features ignored; reject = incompatible. */
  action: VersionAction;
  declared: string;
  supported: string;
  /** Human-readable reason (always present). */
  reason: string;
  /** Readable one-line notice for UI / audit consumers (FR-013 / NFR-008). */
  notice: string;
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
    const reason = `站点协议版本 "${declared}" 不是合法版本号（应为 major.minor）`;
    return { ok: false, action: 'reject', declared, supported, reason, notice: `协议版本无效：${reason}（已拒绝该声明，站点功能不可用）` };
  }
  if (!s) {
    const reason = `插件支持的协议版本 "${supported}" 配置非法`;
    return { ok: false, action: 'reject', declared, supported, reason, notice: `协议版本配置错误：${reason}` };
  }
  if (d.major !== s.major) {
    const reason = `站点协议主版本 ${d.major} 与插件支持的主版本 ${s.major} 不兼容，已拒绝该声明`;
    return {
      ok: false,
      action: 'reject',
      declared,
      supported,
      reason,
      notice: `协议版本不兼容：${reason}（如需支持请升级插件；站点功能已停用，不会静默降级执行）`,
    };
  }
  if (d.minor > s.minor) {
    const reason = `站点协议版本 ${declared} 高于插件支持的 ${supported}，降级使用（忽略未知的新增能力）`;
    return {
      ok: true,
      action: 'degrade',
      declared,
      supported,
      reason,
      notice: `协议版本较新：${reason}`,
    };
  }
  return { ok: true, action: 'accept', declared, supported, reason: `协议版本 ${declared} 兼容`, notice: `协议版本 ${declared} 兼容（已接受）` };
}

/**
 * Whether a negotiation means the declaration must not be used at all
 * (invalid or incompatible version). `degrade` is still usable.
 */
export function isVersionUnusable(n: VersionNegotiation): boolean {
  return n.action === 'reject';
}
