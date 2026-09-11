/**
 * LGDL page-world bridge — postMessage RPC listener + write-back + event channel
 * (FR-019 / FR-020 / FR-021 / FR-041, ADR-004).
 *
 * The plugin's content script posts `web-cli:invoke`; the bridge dispatches it
 * through the retained mechanism-layer router and posts `web-cli:result`. It also
 * answers `web-cli:probe` with the site declaration (runtime handshake channel).
 *
 * UI operations (FR-019): `lgdl-web-op-cli` is dispatched through the same
 * retained router / op registry; the plugin's background gate is what authorizes
 * the call *before* it reaches this bridge (the page only executes what passed
 * the gate). Unknown tools fail readably instead of hitting the router.
 *
 * Event channel (FR-021): `web-cli:event` requests are proxied to an
 * `env.events` hub (lazily created browser hub by default; zero listeners until
 * a subscription exists).
 *
 * Write-back (FR-020): changed source is validated with `parseLgdl` before
 * `onApply`; no React internal state is touched directly.
 */
import { parseLgdl } from '@lgdl/lgdl-core';
import {
  createBrowserEventHub,
  type PlatformEventHub,
  type PlatformSubscribeOptions,
  type ToolResult,
} from '@lgdl/web-cli-base';
import type { WebCliHostRouter } from './host-router.js';

export const WEB_CLI_INVOKE = 'web-cli:invoke';
export const WEB_CLI_RESULT = 'web-cli:result';
export const WEB_CLI_PROBE = 'web-cli:probe';
export const WEB_CLI_DESCRIPTOR = 'web-cli:descriptor';
export const WEB_CLI_CHANNEL = 'web-cli';
export const WEB_CLI_EVENT = 'web-cli:event';
export const WEB_CLI_EVENT_RESULT = 'web-cli:event-result';

/** The UI operation tool exposed by the workbench (FR-019). */
export const WEB_CLI_UI_TOOL = 'lgdl-web-op-cli';
/** Bounded summary count entering the consumer context (mirrors event-bus summaryN). */
export const EVENT_CONTEXT_SUMMARY_N = 10;

export interface WebCliBridgeDeps {
  router: WebCliHostRouter;
  /** Site declaration (runtime handshake reply). */
  descriptor: () => unknown;
  /** Write-back callback (validated source applied to the editor). */
  onApply(source: string): void;
  /** Injectable window for tests (defaults to the global window). */
  target?: Window;
  /**
   * Page-world event hub (`env.events`). Defaults to a lazily-created browser
   * event hub on first event request (default off = zero listeners).
   */
  events?: PlatformEventHub;
}

export interface WebCliBridge {
  dispose(): void;
  /** Handle one raw postMessage payload (exposed for tests). */
  handle(data: unknown, source?: unknown): Promise<void> | void;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function stringArgs(v: unknown): Record<string, string> {
  if (!isRecord(v)) return {};
  const out: Record<string, string> = {};
  for (const [k, val] of Object.entries(v)) {
    if (typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean') out[k] = String(val);
  }
  return out;
}

export function startWebCliBridge(deps: WebCliBridgeDeps): WebCliBridge {
  const win = deps.target ?? (typeof window !== 'undefined' ? window : undefined);
  if (!win) {
    return { dispose: () => {}, handle: () => {} };
  }

  const post = (message: unknown) => win.postMessage(message, '*');

  // Event hub is created lazily (default off / zero listeners until requested).
  let eventHub: PlatformEventHub | undefined = deps.events;
  const getEventHub = (): PlatformEventHub => {
    eventHub ??= createBrowserEventHub();
    return eventHub;
  };

  const handleEvent = async (id: string, op: string, params: Record<string, unknown>): Promise<void> => {
    const respond = (ok: boolean, data?: unknown, error?: string) =>
      post({ type: WEB_CLI_EVENT_RESULT, channel: WEB_CLI_CHANNEL, id, ok, ...(data !== undefined ? { data } : {}), ...(error ? { error } : {}) });
    try {
      const hub = getEventHub();
      if (op === 'subscribe') {
        const res = await hub.subscribe(params as unknown as PlatformSubscribeOptions);
        respond(res.ok, res);
        return;
      }
      if (op === 'unsubscribe') {
        const subId = typeof params.subId === 'string' ? params.subId : '';
        respond(true, await hub.unsubscribe(subId));
        return;
      }
      if (op === 'pull') {
        const subId = typeof params.subId === 'string' ? params.subId : '';
        const start = typeof params.lastId === 'number' ? params.lastId : undefined;
        const max = typeof params.max === 'number' ? params.max : undefined;
        const res = await hub.pull(subId, { ...(start !== undefined ? { lastId: start } : {}), ...(max !== undefined ? { max } : {}) });
        // NFR-007: keep the consumer context bounded (summary + explicit truncation note).
        if (res.events.length > EVENT_CONTEXT_SUMMARY_N) {
          const dropped = res.events.length - EVENT_CONTEXT_SUMMARY_N;
          respond(true, {
            ...res,
            events: res.events.slice(0, EVENT_CONTEXT_SUMMARY_N),
            note: `${res.note ? `${res.note}；` : ''}上下文预算截断：仅返回前 ${EVENT_CONTEXT_SUMMARY_N} 条事件（本次省略 ${dropped} 条，可继续 pull 增量）`,
          });
          return;
        }
        respond(res.ok, res, res.error);
        return;
      }
      if (op === 'status') {
        respond(true, await hub.status());
        return;
      }
      respond(false, undefined, `不支持的事件通道操作 "${op}"（可用：subscribe/pull/unsubscribe/status）`);
    } catch (err) {
      respond(false, undefined, `事件通道不可达：${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const handle = async (data: unknown, source?: unknown): Promise<void> => {
    if (source !== undefined && source !== win) return;
    if (!isRecord(data) || typeof data.type !== 'string') return;
    if (data.channel !== WEB_CLI_CHANNEL) return;

    if (data.type === WEB_CLI_PROBE) {
      post({ type: WEB_CLI_DESCRIPTOR, channel: WEB_CLI_CHANNEL, id: data.id, descriptor: deps.descriptor() });
      return;
    }

    if (data.type === WEB_CLI_EVENT) {
      const id = typeof data.id === 'string' ? data.id : '';
      const op = typeof data.op === 'string' ? data.op : '';
      const params = isRecord(data.params) ? data.params : {};
      await handleEvent(id, op, params);
      return;
    }

    if (data.type !== WEB_CLI_INVOKE) return;

    const id = typeof data.id === 'string' ? data.id : '';
    const tool = typeof data.tool === 'string' ? data.tool : '';
    const subcommand = typeof data.subcommand === 'string' ? data.subcommand : '';
    const args = stringArgs(data.args);

    // FR-019 / FR-014: only registered site tools are dispatched; unknown tools
    // get a readable failure instead of a router miss. When the caller injects a
    // bare dispatcher (tests), the registry is unavailable and the check is
    // skipped.
    const registry = deps.router.router;
    const registered = typeof registry?.query === 'function'
      ? registry.query().filter((e) => !e.namespace).map((e) => e.name)
      : undefined;

    let result: ToolResult;
    if (registered && (!tool || !registered.includes(tool))) {
      result = {
        ok: false,
        output: `✖ 站点未注册工具 "${tool}"（声明工具：${registered.join(' / ') || '（无）'}）`,
        error: 'unknown tool',
      };
    } else {
      try {
        result = await deps.router.dispatch({ id, name: tool, subcommand, args, rawArguments: '{}' });
      } catch (err) {
        result = { ok: false, output: `✖ 站点执行异常：${err instanceof Error ? err.message : String(err)}`, error: 'dispatch error' };
      }
    }

    if (result.ok && result.changed && typeof result.source === 'string') {
      const parsed = parseLgdl(result.source);
      if (!parsed.valid) {
        result = { ok: false, output: '✖ 写回内容校验失败（parseLgdl 拒绝），未应用到编辑器', error: 'invalid writeback' };
      } else {
        deps.onApply(result.source);
      }
    }

    post({
      type: WEB_CLI_RESULT,
      channel: WEB_CLI_CHANNEL,
      id,
      ok: result.ok,
      output: result.output,
      ...(result.changed !== undefined ? { changed: result.changed } : {}),
      ...(result.source !== undefined ? { source: result.source } : {}),
      ...(result.error !== undefined ? { error: result.error } : {}),
      trust: 'external',
    });
  };

  const listener = (event: MessageEvent) => {
    void handle(event.data, event.source);
  };
  win.addEventListener('message', listener);

  return {
    dispose: () => win.removeEventListener('message', listener),
    handle,
  };
}
