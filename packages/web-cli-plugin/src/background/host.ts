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
  fqNameOf,
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
import { createTabsToolEntry, TABS_TOOL_NAME, type TabsToolDeps } from '../tools/tabs-tools.js';
import {
  createWebFetchToolEntry,
  type WebFetchToolDeps,
} from '../tools/web-fetch-tool.js';
import { SITE_TOOL_PREFIX, allocateSiteToolNames, toToolEntries, type SiteRpc } from '../tools/declared-tools.js';

/** Whether a dispatch target is a declared site tool (flat `site_*` name). */
export function isSiteToolName(name: string): boolean {
  return name.startsWith(SITE_TOOL_PREFIX);
}

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
  /**
   * Plugin-level tab-management capability (author decision ③ / FR-049).
   * Omitted → the `tabs` tool is not registered at all (node tests / hosts that
   * do not own `chrome.tabs`). Provided → registered unless `tabsEnabled` is false.
   */
  tabs?: TabsToolDeps;
  /** Initial tab-tool toggle (privacy switch; default true when `tabs` is provided). */
  tabsEnabled?: boolean;
  /**
   * FR-050 / EC-023: plugin-side controlled `web-fetch` seam. When provided, the
   * base builtin `web-fetch` is **not** registered as a builtin; this controlled
   * entry takes its place (same name/schema). Omitted → the base builtin is used
   * unchanged (node tests / hosts that do not own `chrome.permissions`).
   */
  webFetch?: WebFetchToolDeps;
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
  /**
   * Enable/disable the `tabs` tool (FR-049 privacy switch). Disabling
   * unregisters it so it disappears from `deriveTools()` and dispatch fails with
   * the router's readable「已禁用」error; enabling re-registers it. No-op when the
   * host was built without `tabs` deps.
   */
  setTabsEnabled(enabled: boolean): void;
  /** Whether the `tabs` tool is currently registered/enabled. */
  isTabsEnabled(): boolean;
}

export function createWebCliHost(opts: WebCliHostOptions): WebCliHost {
  const router = createCommandRouter({
    delayMs: 0,
    // FR-050: when the plugin owns a controlled `web-fetch` seam, keep the base
    // builtin out of the registry so the controlled entry below is the ONLY
    // registration for that name (CommandRouter rejects duplicate names).
    ...(opts.webFetch ? { builtins: ['sleep', 'web-cli-help'] as const } : {}),
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

  // Plugin-level `tabs` tool (FR-049 / author decision ③). Registered only when
  // the host has real tab deps; the privacy toggle can register/unregister it at
  // runtime so it leaves/enters the LLM tool surface (`deriveTools`).
  let tabsRegistered = false;
  const registerTabs = (): void => {
    if (!opts.tabs || tabsRegistered) return;
    router.register(createTabsToolEntry(opts.tabs));
    tabsRegistered = true;
  };
  const unregisterTabs = (): void => {
    if (!tabsRegistered) return;
    router.unregister(TABS_TOOL_NAME);
    tabsRegistered = false;
  };
  if (opts.tabs && opts.tabsEnabled !== false) registerTabs();

  // FR-050 / EC-023: controlled `web-fetch` seam (replaces the base builtin when
  // the host owns the permission checker). Registered as a plugin-level tool so
  // the pre-flight gate runs before any fetch is attempted.
  if (opts.webFetch) {
    router.register(
      createWebFetchToolEntry({
        ...opts.webFetch,
        currentOrigin:
          opts.webFetch.currentOrigin ??
          (() => opts.currentOrigin?.()),
      }),
    );
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
        siteFqns.push(fqNameOf(entry));
      }
      // Deterministic collision disclosure (FR-025 auditability): when two
      // declared ids flatten to the same LLM-safe name, the second gets a `_N`
      // suffix. Record it readably — never silent.
      const assignments = allocateSiteToolNames(descriptor.tools);
      const deduped = assignments.filter((a) => a.deduped);
      if (deduped.length) {
        opts.audit.recordPlugin({
          type: 'descriptor-read',
          ts: Date.now(),
          origin,
          detail: `工具名去重：${deduped.map((a) => `${a.id} → ${a.name}`).join('；')}`,
        });
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
      if (isSiteToolName(tc.name)) {
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
    setTabsEnabled(enabled) {
      if (enabled) registerTabs();
      else unregisterTabs();
    },
    isTabsEnabled() {
      return tabsRegistered;
    },
  };
}
