/**
 * Background host (FR-005 / FR-017 / NFR-001, ADR-002).
 *
 * Owns the single authoritative `CommandRouter` (upstream, imported — never
 * forked) plus `AgentRunner` schema derivation. Declared site tools are
 * registered per active origin; plugin management tools are always present.
 * Every execution goes through `router.dispatch` (no bypass path).
 */
import {
  createCommandRouter,
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
import { createPluginPolicyConfig } from '../security/policy.js';
import { createAdminToolEntries } from '../tools/admin-tools.js';
import { SITE_NAMESPACE, toToolEntries, type SiteRpc } from '../tools/declared-tools.js';

export interface WebCliHostOptions {
  origins: OriginStore;
  audit: PluginAuditSink;
  rpc: SiteRpc;
  currentOrigin?: () => string | undefined;
  onAsk?: RouterPolicy['onAsk'];
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
      return router.dispatch(tc, ctx);
    },
    deriveTools() {
      return router.deriveTools();
    },
    registeredSiteTools() {
      return [...siteFqns];
    },
  };
}
