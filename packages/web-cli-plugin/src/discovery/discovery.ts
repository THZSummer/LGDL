/**
 * Discovery orchestration (FR-010 / FR-014 / EC-001).
 *
 * Tries three channels in order — ① well-known → ② HTML link/meta →
 * ③ runtime handshake — and adopts the first successful declaration. All
 * failures are recorded with readable reasons; the final state is one of
 * `supported` / `unsupported` / `unknown` (never a false "supported").
 *
 * Pure logic with injected I/O; node-testable with fake fetch/message stubs.
 */
import {
  parseDescriptor,
  parseDescriptorJson,
  type WebCliDescriptor,
  type WebCliDescriptorChannel,
} from '../protocol/descriptor.js';
import { negotiateVersion, type VersionNegotiation } from '../protocol/version.js';
import { resolveTrust, verifyIntegrity, type TrustView } from '../protocol/trust.js';
import { wellKnownUrl } from './static-declaration.js';

export type DiscoveryState = 'supported' | 'unsupported' | 'unknown';

/** Attempt classification: absent = definitively no declaration; transient = retryable failure; invalid = present but unusable. */
export type DiscoveryAttemptKind = 'success' | 'absent' | 'transient' | 'invalid';

/**
 * Aggregate failure class for the three-state result (FR-014 / EC-001).
 * `none` = a usable declaration was found.
 */
export type DiscoveryFailureKind =
  | 'none'
  | 'no-declaration'
  | 'invalid-declaration'
  | 'version-mismatch'
  | 'transient';

export interface DiscoveryAttempt {
  channel: WebCliDescriptorChannel;
  kind: DiscoveryAttemptKind;
  reason: string;
}

export interface DiscoveryFetchResult {
  ok: boolean;
  status?: number;
  text?: string;
  error?: string;
}

export interface DiscoveryDeps {
  origin: string;
  /** Fetch text from an absolute URL (background fetch in the real plugin). */
  fetchText(url: string): Promise<DiscoveryFetchResult>;
  /** Read the HTML `<link rel="web-cli">` / `<meta name="web-cli">` href (content script). */
  readHtmlHref(): Promise<string | null>;
  /** Runtime MAIN-world handshake. */
  handshake(): Promise<{ ok: boolean; descriptor?: unknown; error?: string }>;
  now?: () => number;
  trust?: TrustView;
}

export interface DiscoveryResult {
  state: DiscoveryState;
  descriptor?: WebCliDescriptor;
  attempts: DiscoveryAttempt[];
  reason: string;
  /** Version negotiation outcome, when a declaration reached that step (EC-014). */
  version?: VersionNegotiation;
  /** Aggregate failure class + readable message (FR-014); `none` on success. */
  failure: { kind: DiscoveryFailureKind; message: string };
}

const ABSENT_STATUSES = new Set([404, 410]);

type FinalizeResult =
  | { ok: true; descriptor: WebCliDescriptor; note?: string; version: VersionNegotiation }
  | { ok: false; kind: DiscoveryAttemptKind; reason: string; version: VersionNegotiation; failureKind: 'version-mismatch' | 'invalid' };

async function finalize(
  descriptor: WebCliDescriptor,
  channel: WebCliDescriptorChannel,
  origin: string,
  rawText: string | undefined,
  now: () => number,
  trust: TrustView | undefined,
): Promise<FinalizeResult> {
  // FR-013 / EC-014: unknown or incompatible versions are rejected or degraded
  // with a readable notice; they are never silently accepted.
  const version = negotiateVersion(descriptor.protocolVersion);
  if (version.action === 'reject') {
    return { ok: false, kind: 'invalid', reason: version.reason, version, failureKind: 'version-mismatch' };
  }

  const integrity = await verifyIntegrity(descriptor, rawText);
  const trustState = await resolveTrust(origin, trust);
  descriptor.source = {
    origin,
    channel,
    fetchedAt: now(),
    integrityVerified: integrity.integrityVerified,
    trust: trustState,
  };
  if (version.action === 'degrade') {
    return { ok: true, descriptor, note: version.reason, version };
  }
  return { ok: true, descriptor, version };
}

/**
 * Run discovery. Resolves to a three-state result; never throws.
 */
export async function discover(deps: DiscoveryDeps): Promise<DiscoveryResult> {
  const now = deps.now ?? (() => Date.now());
  const attempts: DiscoveryAttempt[] = [];
  const channelResults: DiscoveryAttempt[] = [];
  let version: VersionNegotiation | undefined;
  let versionRejected = false;
  let hadInvalid = false;
  let hadTransient = false;

  const tryStatic = async (
    channel: 'well-known' | 'html-link',
    url: string,
    rawText: string,
  ): Promise<WebCliDescriptor | null> => {
    const parsed = parseDescriptorJson(rawText, { origin: deps.origin, channel, fetchedAt: now() });
    if (!parsed.ok) {
      hadInvalid = true;
      channelResults.push({ channel, kind: 'invalid', reason: parsed.error });
      return null;
    }
    const fin = await finalize(parsed.descriptor, channel, deps.origin, rawText, now, deps.trust);
    version = fin.version;
    if (!fin.ok) {
      if (fin.failureKind === 'version-mismatch') versionRejected = true;
      else hadInvalid = true;
      channelResults.push({ channel, kind: fin.kind, reason: fin.reason });
      return null;
    }
    channelResults.push({ channel, kind: 'success', reason: fin.note ?? '声明读取成功' });
    return fin.descriptor;
  };

  // ① well-known
  const wkUrl = wellKnownUrl(deps.origin);
  try {
    const res = await deps.fetchText(wkUrl);
    if (res.ok && typeof res.text === 'string') {
      const d = await tryStatic('well-known', wkUrl, res.text);
      if (d) {
        return {
          state: 'supported',
          descriptor: d,
          attempts: channelResults,
          reason: `通过 well-known 发现 web-cli 支持（${wkUrl}）`,
          ...(version ? { version } : {}),
          failure: { kind: 'none', message: '站点声明有效' },
        };
      }
    } else if (res.status !== undefined && ABSENT_STATUSES.has(res.status)) {
      channelResults.push({ channel: 'well-known', kind: 'absent', reason: `未发现声明文件（HTTP ${res.status}）` });
    } else {
      hadTransient = true;
      channelResults.push({ channel: 'well-known', kind: 'transient', reason: `声明文件获取失败：${res.error ?? `HTTP ${res.status ?? '未知'}`}` });
    }
  } catch (err) {
    hadTransient = true;
    channelResults.push({ channel: 'well-known', kind: 'transient', reason: `声明文件获取异常：${err instanceof Error ? err.message : String(err)}` });
  }

  // ② HTML link/meta
  try {
    const href = await deps.readHtmlHref();
    if (!href) {
      channelResults.push({ channel: 'html-link', kind: 'absent', reason: '页面未提供 <link rel="web-cli"> / <meta name="web-cli"> 标记' });
    } else {
      const res = await deps.fetchText(href);
      if (res.ok && typeof res.text === 'string') {
        const d = await tryStatic('html-link', href, res.text);
        if (d) {
          return {
            state: 'supported',
            descriptor: d,
            attempts: channelResults,
            reason: `通过页面标记发现 web-cli 支持（${href}）`,
            ...(version ? { version } : {}),
            failure: { kind: 'none', message: '站点声明有效' },
          };
        }
      } else {
        hadTransient = true;
        channelResults.push({ channel: 'html-link', kind: 'transient', reason: `页面标记指向的声明获取失败：${res.error ?? `HTTP ${res.status ?? '未知'}`}` });
      }
    }
  } catch (err) {
    hadTransient = true;
    channelResults.push({ channel: 'html-link', kind: 'transient', reason: `页面标记解析异常：${err instanceof Error ? err.message : String(err)}` });
  }

  // ③ runtime handshake
  try {
    const hs = await deps.handshake();
    if (hs.ok && hs.descriptor !== undefined) {
      const parsed = parseDescriptor(hs.descriptor, { origin: deps.origin, channel: 'runtime-handshake', fetchedAt: now() });
      if (!parsed.ok) {
        hadInvalid = true;
        channelResults.push({ channel: 'runtime-handshake', kind: 'invalid', reason: parsed.error });
      } else {
        const fin = await finalize(parsed.descriptor, 'runtime-handshake', deps.origin, undefined, now, deps.trust);
        version = fin.version;
        if (!fin.ok) {
          if (fin.failureKind === 'version-mismatch') versionRejected = true;
          else hadInvalid = true;
          channelResults.push({ channel: 'runtime-handshake', kind: fin.kind, reason: fin.reason });
        } else {
          channelResults.push({ channel: 'runtime-handshake', kind: 'success', reason: fin.note ?? '运行时握手成功' });
          return {
            state: 'supported',
            descriptor: fin.descriptor,
            attempts: channelResults,
            reason: '通过运行时握手发现 web-cli 支持',
            ...(version ? { version } : {}),
            failure: { kind: 'none', message: '站点声明有效' },
          };
        }
      }
    } else {
      channelResults.push({ channel: 'runtime-handshake', kind: 'absent', reason: hs.error ?? '页面未响应运行时握手' });
    }
  } catch (err) {
    hadTransient = true;
    channelResults.push({ channel: 'runtime-handshake', kind: 'transient', reason: `运行时握手异常：${err instanceof Error ? err.message : String(err)}` });
  }

  attempts.push(...channelResults);
  const allAbsent = channelResults.length > 0 && channelResults.every((a) => a.kind === 'absent');
  const base = { attempts, ...(version ? { version } : {}) };

  // FR-014 / EC-001: classify the failure with a readable message (≥3 scenarios).
  if (allAbsent) {
    return {
      ...base,
      state: 'unsupported',
      reason: '该站点未声明支持 web-cli（三通道均无声明）',
      failure: { kind: 'no-declaration', message: '该站点未声明支持 web-cli —— 不影响页面正常浏览' },
    };
  }
  if (versionRejected && version) {
    return {
      ...base,
      state: 'unknown',
      reason: `站点协议版本不匹配：${version.reason}`,
      failure: { kind: 'version-mismatch', message: `站点声明了 web-cli，但协议版本不兼容：${version.reason}` },
    };
  }
  if (hadInvalid) {
    const first = channelResults.find((a) => a.kind === 'invalid');
    return {
      ...base,
      state: 'unknown',
      reason: `站点声明存在但无效：${first?.reason ?? '声明校验失败'}`,
      failure: { kind: 'invalid-declaration', message: `站点声明了 web-cli，但声明无效：${first?.reason ?? '声明校验失败'}` },
    };
  }
  return {
    ...base,
    state: 'unknown',
    reason: `web-cli 发现未完成（可能暂时不可达，可重试）：${channelResults.map((a) => a.reason).join('；')}`,
    failure: { kind: hadTransient ? 'transient' : 'invalid-declaration', message: `web-cli 发现未完成（可能暂时不可达，可重试）：${channelResults.map((a) => a.reason).join('；')}` },
  };
}
