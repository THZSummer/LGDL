/**
 * Plugin permission strategies (FR-023 / FR-026 / FR-027 / NFR-001, ADR-003).
 *
 * Three `PolicyStrategy` objects are injected into the upstream `PermissionGate`
 * (additive reuse, zero framework fork):
 *
 *   S1 OriginAuthorizationStrategy — site tool on an unauthorized origin → deny
 *   S2 UntrustedDeclaredStrategy   — site tool + untrusted declaration:
 *                                    write/evaluate/external → ask
 *                                    read → null (falls through to riskDefaults allow)
 *                                    unknown/missing risk → deny (fail-closed)
 *   S3 FailClosedStrategy          — site tool + invalid/unknown risk → deny
 *
 * `input.risk` is the **plugin-recomputed** effective risk (see
 * `tools/declared-tools.ts`), never the site's self-reported `riskHint`. The
 * read→allow default therefore only applies to ids on the plugin read-only
 * whitelist (BLK-1 / O-010 / NFR-001).
 *
 * riskDefaults: read→allow; write/external/ui/state→ask; evaluate→deny
 * (never below confirmation; FR-026).
 *
 * Strategy order + `denyPriority: true` make deny win (EC-014).
 */
import type { PolicyAction, PolicyConfig, PolicyStrategy, RouterPolicy, ToolRisk } from '@lgdl/web-cli-base';
import { isToolRisk } from '../protocol/descriptor.js';
import type { TrustState } from './origin-store.js';

export const PLUGIN_SITE_NAMESPACE = 'site';

/** Risk → default action table (plugin policy; FR-026). */
export const PLUGIN_RISK_DEFAULTS: Partial<Record<ToolRisk, PolicyAction>> = {
  read: 'allow',
  write: 'ask',
  external: 'ask',
  ui: 'ask',
  state: 'ask',
  evaluate: 'deny',
};

export interface PolicyDeps {
  isAuthorized(origin: string): boolean | Promise<boolean>;
  trustOf(origin: string): TrustState | Promise<TrustState>;
  /** Fallback origin when the dispatch context does not carry one (active tab). */
  currentOrigin?: () => string | undefined;
}

interface StrategyInput {
  namespace?: string;
  risk?: ToolRisk;
  ctx: Record<string, unknown>;
}

/** Read the target origin from the dispatch context (falls back to the active tab). */
export function originFromContext(ctx: Record<string, unknown>, deps: PolicyDeps): string | undefined {
  const raw = ctx.origin;
  if (typeof raw === 'string' && raw) return raw;
  return deps.currentOrigin?.();
}

/** S1: a site tool is denied unless its origin has been explicitly authorized. */
export function createS1OriginAuthorizationStrategy(deps: PolicyDeps): PolicyStrategy {
  return {
    name: 'S1-origin-authorization',
    async check(input): Promise<PolicyAction | null> {
      if (input.namespace !== PLUGIN_SITE_NAMESPACE) return null;
      const origin = originFromContext(input.ctx as Record<string, unknown>, deps);
      if (!origin) return 'deny';
      const authorized = await deps.isAuthorized(origin);
      return authorized ? null : 'deny';
    },
  };
}

/** S2: untrusted declared tools — dangerous tiers ask, unknown risk fails closed. */
export function createS2UntrustedDeclaredStrategy(deps: PolicyDeps): PolicyStrategy {
  return {
    name: 'S2-untrusted-declared',
    async check(input): Promise<PolicyAction | null> {
      if (input.namespace !== PLUGIN_SITE_NAMESPACE) return null;
      const origin = originFromContext(input.ctx as Record<string, unknown>, deps);
      const trust: TrustState = origin ? await deps.trustOf(origin) : 'untrusted';
      if (trust === 'trusted') return null;
      const risk = (input as StrategyInput).risk;
      if (risk === undefined || !isToolRisk(risk)) return 'deny';
      if (risk === 'write' || risk === 'evaluate' || risk === 'external') return 'ask';
      return null;
    },
  };
}

/** S3: fail-closed catch-all for declared site tools with an invalid/missing risk. */
export function createS3FailClosedStrategy(): PolicyStrategy {
  return {
    name: 'S3-fail-closed',
    check(input): PolicyAction | null {
      if (input.namespace !== PLUGIN_SITE_NAMESPACE) return null;
      const risk = (input as StrategyInput).risk;
      if (risk === undefined || !isToolRisk(risk)) return 'deny';
      return null;
    },
  };
}

/** Assemble the full plugin router policy (strategies + riskDefaults + onAsk). */
export function createPluginPolicyConfig(
  deps: PolicyDeps,
  onAsk?: RouterPolicy['onAsk'],
): RouterPolicy {
  return {
    strategies: [
      createS1OriginAuthorizationStrategy(deps),
      createS2UntrustedDeclaredStrategy(deps),
      createS3FailClosedStrategy(),
    ],
    riskDefaults: { ...PLUGIN_RISK_DEFAULTS },
    denyPriority: true,
    askTimeoutMs: 60000,
    ...(onAsk ? { onAsk } : {}),
  };
}

/** Type guard helper re-exported for callers building effective-risk decisions. */
export { isToolRisk };
export type { PolicyConfig };

// ---------------------------------------------------------------------------
// Risk guard: per-origin rate limiting + interrupt/pause (FR-029 / EC-010)
// ---------------------------------------------------------------------------

export interface RiskGuardOptions {
  /** Token-bucket capacity per origin (default 60). */
  capacity?: number;
  /** Token refill rate per origin (tokens/second, default 6). */
  refillPerSec?: number;
  now?: () => number;
}

export type RiskGuardAction = 'allow' | 'throttle' | 'paused' | 'stopped';

export interface RiskCheck {
  action: RiskGuardAction;
  /** Readable reason (NFR-008). */
  reason: string;
  /** Suggested wait before retrying, when throttled. */
  retryAfterMs?: number;
  /** Remaining tokens for the origin after this check. */
  remaining: number;
}

export interface RiskGuardStatus {
  paused: boolean;
  stopped: boolean;
  reason?: string;
  capacity: number;
  refillPerSec: number;
  origins: string[];
}

export interface RiskGuard {
  /** Consume one token for the origin (or return a readable block reason). */
  check(origin?: string): RiskCheck;
  /** Temporarily pause all automation (resume to continue). */
  pause(reason?: string): void;
  resume(): void;
  /** Interrupt/stop automation (terminal until reset). */
  stop(reason?: string): void;
  /** Clear pause/stop and all buckets. */
  reset(): void;
  isPaused(): boolean;
  isStopped(): boolean;
  status(): RiskGuardStatus;
}

const RISK_DEFAULT_CAPACITY = 60;
const RISK_DEFAULT_REFILL_PER_SEC = 6;

/**
 * Token-bucket risk guard (FR-029): per-origin rate limiting, user interrupt
 * (stop) and pause. All blocks are readable and never silent.
 */
export function createRiskGuard(opts: RiskGuardOptions = {}): RiskGuard {
  const capacity = opts.capacity && opts.capacity > 0 ? opts.capacity : RISK_DEFAULT_CAPACITY;
  const refillPerSec = opts.refillPerSec && opts.refillPerSec > 0 ? opts.refillPerSec : RISK_DEFAULT_REFILL_PER_SEC;
  const now = opts.now ?? (() => Date.now());

  const buckets = new Map<string, { tokens: number; last: number }>();
  let paused = false;
  let stopped = false;
  let reason: string | undefined;
  let lastTs = now();

  const bucketOf = (origin: string) => {
    const ts = now();
    const elapsed = Math.max(0, ts - lastTs);
    if (elapsed > 0) {
      const add = (elapsed / 1000) * refillPerSec;
      for (const b of buckets.values()) {
        b.tokens = Math.min(capacity, b.tokens + add);
        b.last = ts;
      }
      lastTs = ts;
    }
    let b = buckets.get(origin);
    if (!b) {
      b = { tokens: capacity, last: ts };
      buckets.set(origin, b);
    }
    return b;
  };

  return {
    check(origin) {
      if (stopped) {
        return { action: 'stopped', reason: `自动化已被用户中止${reason ? `（${reason}）` : ''}——恢复前不再执行任何站点操作`, remaining: 0 };
      }
      if (paused) {
        return { action: 'paused', reason: `自动化已暂停${reason ? `（${reason}）` : ''}——恢复前不再执行任何站点操作`, remaining: 0 };
      }
      const key = origin && origin.trim() ? origin.trim().toLowerCase() : 'unknown';
      const b = bucketOf(key);
      if (b.tokens < 1) {
        const retryAfterMs = Math.max(1, Math.ceil(((1 - b.tokens) / refillPerSec) * 1000));
        return {
          action: 'throttle',
          reason: `站点 ${key} 调用频率超限（令牌桶容量 ${capacity}，补充 ${refillPerSec}/s）——请约 ${retryAfterMs}ms 后重试`,
          retryAfterMs,
          remaining: 0,
        };
      }
      b.tokens -= 1;
      return { action: 'allow', reason: '风控通过', remaining: b.tokens };
    },
    pause(r) {
      paused = true;
      reason = r;
    },
    resume() {
      paused = false;
      stopped = false;
      reason = undefined;
    },
    stop(r) {
      stopped = true;
      reason = r;
    },
    reset() {
      paused = false;
      stopped = false;
      reason = undefined;
      buckets.clear();
      lastTs = now();
    },
    isPaused: () => paused,
    isStopped: () => stopped,
    status() {
      return {
        paused,
        stopped,
        ...(reason ? { reason } : {}),
        capacity,
        refillPerSec,
        origins: [...buckets.keys()],
      };
    },
  };
}
