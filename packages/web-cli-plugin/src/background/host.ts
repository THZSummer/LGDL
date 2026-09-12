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
  type AskQuestion,
  type AskResponder,
  type AskResolution,
  type CommandRouter,
  type LlmToolDef,
  type RouterPolicy,
  type ToolContext,
  type ToolResult,
  type WebCliToolCall,
} from '@lgdl/web-cli-base';
import type { WebCliDescriptor, WebCliToolDecl } from '../protocol/descriptor.js';
import type { PluginAuditSink } from '../security/audit-sink.js';
import type { OriginStore } from '../security/origin-store.js';
import { decideAutoAuthorization } from '../security/auto-authorize.js';
import { createPluginPolicyConfig, createRiskGuard, type RiskGuard } from '../security/policy.js';
import { createAdminToolEntries } from '../tools/admin-tools.js';
import { createBrowserToolEntries, type BrowserToolOptions } from '../tools/browser-tools.js';
import { createTabsToolEntry, TABS_TOOL_NAME, type TabsToolDeps } from '../tools/tabs-tools.js';
import {
  createWebFetchToolEntry,
  type WebFetchToolDeps,
} from '../tools/web-fetch-tool.js';
import {
  SITE_TOOL_PREFIX,
  allocateSiteToolNames,
  isDestructiveInvocation,
  toToolEntries,
  type SiteRpc,
} from '../tools/declared-tools.js';

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
  /**
   * FR-052 / ADR-017: per-origin auto-authorization switches. When provided, the
   * `onAsk` seam first consults {@link decideAutoAuthorization}; an allowed
   * non-destructive read/write ask is resolved as `allow` (audited as
   * `auto-authorize`) instead of prompting. Absent → no auto path (unchanged).
   */
  autoAuth?: { isEnabled(origin: string, tier: 'read' | 'write'): boolean };
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
  /**
   * FR-051 / TASK-029: base-derived browser capability tools (`dom` / `chrome` /
   * `wait` / `extract` / `export` / `save` / `events` / `web-search`). Omitted →
   * none are registered (node tests / hosts without a browser env). Each family
   * is gated on its seam being present, so a missing seam simply omits the tool
   * rather than registering a dead one.
   */
  browserTools?: BrowserToolOptions;
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
  /**
   * FR-052 / ADR-017: declared site-tool metadata keyed by the registered flat
   * name, so the auto-authorization seam can reliably reverse-look-up the tool's
   * destructive nature (never guessed from the free-form question payload).
   */
  const siteDecls = new Map<string, WebCliToolDecl>();

  /**
   * Auto-authorization is a **pre-check at the onAsk seam** — it does not relax
   * `riskDefaults` or any strategy, so S1 (unauthorized) / S3 (unknown risk)
   * still deny before an ask is ever produced. Only when the explicit user
   * setting enables the tier and the invocation is non-destructive does this
   * resolve the ask as `allow`; every such allow is audited as `auto-authorize`
   * (kept distinct from a manual confirm).
   */
  const autoOnAsk: RouterPolicy['onAsk'] | undefined = opts.onAsk
    ? async (question: AskQuestion): Promise<AskResolution> => {
        const origin = opts.currentOrigin?.();
        const decl = siteDecls.get(question.tool);
        const destructive = decl ? isDestructiveInvocation(decl, question.subcommand) : true; // unknown tool → fail-closed
        const decision = decideAutoAuthorization({
          origin,
          group: question.group,
          risk: question.risk,
          destructive,
          settings:
            origin && opts.autoAuth
              ? { read: opts.autoAuth.isEnabled(origin, 'read'), write: opts.autoAuth.isEnabled(origin, 'write') }
              : undefined,
        });
        if (decision.allow) {
          opts.audit.recordPlugin({
            type: 'auto-authorize',
            ts: Date.now(),
            tool: question.tool,
            subcommand: question.subcommand,
            risk: question.risk,
            origin,
            decision: 'allow',
            reason: decision.reason,
            detail: '因自动授权（用户设置）放行，未经人工二次确认（与「用户确认放行」区分）',
          });
          return { action: 'allow' };
        }
        if (decision.hardDeny) {
          // Hard floor: evaluate / unclassifiable risk is denied here, never
          // delegated to the confirmation UI (which could otherwise allow it).
          opts.audit.recordPlugin({
            type: 'auto-authorize',
            ts: Date.now(),
            tool: question.tool,
            subcommand: question.subcommand,
            risk: question.risk,
            origin,
            decision: 'deny',
            reason: decision.reason,
            detail: '自动授权前置判定：硬底线不可放行，直接拒绝（未经确认 UI）',
          });
          return { action: 'deny' };
        }
        return opts.onAsk!(question);
      }
    : undefined;

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
      autoOnAsk,
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

  // FR-051: base-derived browser tools (dom/chrome/wait/extract/export/save/
  // events/web-search). Registered flat (no namespace) so the LLM function names
  // stay in `^[a-zA-Z0-9_-]+$`; each family only appears when its env seam exists.
  if (opts.browserTools) {
    for (const entry of createBrowserToolEntries(opts.browserTools)) router.register(entry);
  }

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
      // Deterministic flat-name assignment (also the lookup key for FR-052).
      const assignments = allocateSiteToolNames(descriptor.tools);
      // FR-052 / ADR-017: remember each flat name → declaration so the auto-auth
      // seam can judge destructive invocations from plugin truth (never guessed).
      descriptor.tools.forEach((decl, i) => {
        const name = assignments[i]?.name;
        if (name) siteDecls.set(name, decl);
      });
      const entries = toToolEntries(descriptor, origin, opts.rpc);
      for (const entry of entries) {
        router.register(entry);
        siteFqns.push(fqNameOf(entry));
      }
      // Deterministic collision disclosure (FR-025 auditability): when two
      // declared ids flatten to the same LLM-safe name, the second gets a `_N`
      // suffix. Record it readably — never silent.
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
      siteDecls.clear();
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
