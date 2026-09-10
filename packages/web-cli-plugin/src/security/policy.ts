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
export const PLUGIN_ADMIN_NAMESPACE = 'plugin';

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
