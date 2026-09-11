/**
 * Background host (FR-005 / FR-017 / NFR-001, ADR-002).
 *
 * Owns the single authoritative `CommandRouter` (upstream, imported — never
 * forked) plus `AgentRunner` schema derivation. Declared site tools are
 * registered per active origin; plugin management tools are always present.
 * Every execution goes through `router.dispatch` (no bypass path).
 */
import {
  createAskUserToolEntry,
  createCommandRouter,
  type AskResponder,
  type CommandRouter,
  type LlmToolDef,
  type RouterPolicy,
  type ToolContext,
  type ToolResult,
  type WebCliToolCall,
} from '@lgdl/web-cli-base';
import type { WebCliDescriptor } from '../protocol/descriptor.js';
import type { PluginAuditSink } from '../security/audit-sink.js';
import type { OriginStore } from '../security/origin-store.js';
import { createPluginPolicyConfig, createRiskGuard, type RiskGuard } from '../security/policy.js';
import { createAdminToolEntries } from '../tools/admin-tools.js';
import { SITE_NAMESPACE, toToolEntries, type SiteRpc } from '../tools/declared-tools.js';

export interface WebCliHostOptions {
  origins: OriginStore;
  audit: PluginAuditSink;
  rpc: SiteRpc;
  currentOrigin?: () => string | undefined;
  onAsk?: RouterPolicy['onAsk'];
  /** Task-internal clarification responder (FR-017 / R7); absent → readable disabled tool. */
  askUser?: AskResponder;
  descriptorShow: (origin: string) => Promise<string>;
  llmConfig: () => Promise<string>;
}

export interface WebCliHost {
  router: CommandRouter;
  /** Register the declared tools of a site (replacing any previous site). */
  activateSite(descriptor: WebCliDescriptor, origin: string): void;
  /** Remove the currently registered site tools. */
  deactivateSite(): void;
  activeOrigin(): string | undefined;
  activeDescriptor(): WebCliDescriptor | undefined;
  dispatch(tc: WebCliToolCall, ctx?: ToolContext): Promise<ToolResult>;
  deriveTools(): LlmToolDef[];
  registeredSiteTools(): string[];
  /** Risk guard (FR-029): per-origin rate limit + user pause/interrupt. */
  riskGuard: RiskGuard;
  pauseRisk(reason?: string): void;
  resumeRisk(): void;
  stopRisk(reason?: string): void;
}

export function createWebCliHost(opts: WebCliHostOptions): WebCliHost {
  const router = createCommandRouter({
    delayMs: 0,
    policy: createPluginPolicyConfig(
      {
        isAuthorized: (origin) => opts.origins.isAuthorized(origin),
        trustOf: (origin) => opts.origins.trustOf(origin),
        ...(opts.currentOrigin ? { currentOrigin: opts.currentOrigin } : {}),
      },
      opts.onAsk,
    ),
    audit: opts.audit,
  });

  // Plugin management tools (always registered).
  for (const entry of createAdminToolEntries({
    origins: opts.origins,
    audit: opts.audit,
    descriptorShow: opts.descriptorShow,
    llmConfig: opts.llmConfig,
  })) {
    router.register(entry);
  }

  // Task-internal clarification tool (FR-017 / R7). Always registered so the
  // capability face is explicit; without a responder it returns a readable
  // disabled message (never a silent no-op).
  router.register(createAskUserToolEntry(opts.askUser ? { askUser: opts.askUser } : {}));

  const riskGuard = createRiskGuard();

  let siteFqns: string[] = [];
  let siteDescriptor: WebCliDescriptor | undefined;
  let siteOrigin: string | undefined;

  return {
    router,
    activateSite(descriptor, origin) {
      this.deactivateSite();
      const entries = toToolEntries(descriptor, origin, opts.rpc);
      for (const entry of entries) {
        router.register(entry);
        siteFqns.push(`${SITE_NAMESPACE}.${entry.name}`);
      }
      siteDescriptor = descriptor;
      siteOrigin = origin;
    },
    deactivateSite() {
      for (const fqn of siteFqns) router.unregister(fqn);
      siteFqns = [];
      siteDescriptor = undefined;
      siteOrigin = undefined;
    },
    activeOrigin() {
      return siteOrigin;
    },
    activeDescriptor() {
      return siteDescriptor;
    },
    dispatch(tc, ctx) {
      // FR-029 / EC-010: site executions pass the risk guard first (per-origin
      // rate limit + pause/stop). Blocks are readable, never silent.
      if (tc.name.startsWith(`${SITE_NAMESPACE}.`)) {
        const origin = typeof ctx?.origin === 'string' && ctx.origin ? ctx.origin : opts.currentOrigin?.();
        const risk = riskGuard.check(origin);
        if (risk.action !== 'allow') {
          return Promise.resolve({ ok: false, output: `✖ ${risk.reason}`, error: `risk-${risk.action}` });
        }
      }
      return router.dispatch(tc, ctx);
    },
    deriveTools() {
      return router.deriveTools();
    },
    registeredSiteTools() {
      return [...siteFqns];
    },
    riskGuard,
    pauseRisk(reason) {
      riskGuard.pause(reason);
    },
    resumeRisk() {
      riskGuard.resume();
    },
    stopRisk(reason) {
      riskGuard.stop(reason);
    },
  };
}
