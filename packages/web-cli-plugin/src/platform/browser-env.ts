/**
 * Extension browser env — background-side `PlatformEnv` seams (FR-051 / TASK-029).
 *
 * The base domain tools (`dom` / `chrome` / `wait` / `extract` / `export` / `save`)
 * are browser capabilities that must run where the DOM lives. The plugin's
 * background service worker has no DOM, so this factory builds a `PlatformEnv`
 * whose `dom.ops` is a **remote proxy** into the bound tab's content script
 * (which runs `createBrowserDomOps()` in the page's isolated world) and whose
 * `filePicker` persists via the page-context anchor download chain.
 *
 * No new permission is required: `activeTab` / `scripting` (already held) inject
 * the content script, and the anchor download is a page-context action. The
 * seam is fail-readable: with no bound tab every call returns a readable
 * refusal instead of throwing.
 */
import type { PlatformEnv, PlatformDomOpResult } from '@lgdl/web-cli-base';
import { createRemoteDomOps, type DomAgentTransport } from '../content/dom-agent.js';
import { createRemoteEventHub, type EventBridgeReply } from '../tools/remote-events.js';

export interface BrowserEnvDeps {
  /** Current bound tab id, or undefined when nothing is bound. */
  currentTabId(): number | undefined;
  /** Send one DOM operation to the tab's content script. */
  sendDomOp(tabId: number, method: string, args: unknown[]): Promise<PlatformDomOpResult>;
  /** Persist a file through the page-context anchor download chain (no `downloads` permission). */
  sendFileSave(tabId: number, filename: string, data: string | Blob): Promise<{ ok: boolean; error?: string }>;
  /**
   * Forward one event-bridge op to the bound tab's content script. Omitted → no
   * `events` tool is registered (transport unavailable).
   */
  eventRequest?(op: 'subscribe' | 'pull' | 'unsubscribe' | 'status', params: Record<string, unknown>): Promise<EventBridgeReply>;
}

const NO_TAB: PlatformDomOpResult = {
  ok: false,
  output: '✖ 无活跃标签页：请先在目标站点点击插件图标绑定并授权后再执行浏览器操作',
  error: 'no active tab',
};

export function createExtensionBrowserEnv(deps: BrowserEnvDeps): PlatformEnv {
  const transport: DomAgentTransport = {
    async request(method, params) {
      const tabId = deps.currentTabId();
      if (tabId === undefined) return NO_TAB;
      const args = Array.isArray((params as { args?: unknown[] })?.args) ? ((params as { args: unknown[] }).args) : [];
      return deps.sendDomOp(tabId, method, args);
    },
  };

  return {
    kind: 'browser',
    fetch: globalThis.fetch.bind(globalThis),
    ...(deps.eventRequest
      ? { events: createRemoteEventHub({ request: deps.eventRequest }) }
      : {}),
    dom: {
      state: { snapshot: async () => ({ unavailable: true }) },
      ops: createRemoteDomOps(transport),
    },
    filePicker: {
      async save(opts) {
        const tabId = deps.currentTabId();
        if (tabId === undefined) return { ok: false, error: '无活跃标签页，无法保存文件' };
        return deps.sendFileSave(tabId, opts.suggestedName, opts.data);
      },
      async download(opts) {
        const tabId = deps.currentTabId();
        if (tabId === undefined) throw new Error('无活跃标签页，无法触发下载');
        const res = await deps.sendFileSave(tabId, opts.filename, opts.data);
        if (!res.ok) throw new Error(res.error ?? '页面下载链不可用');
      },
    },
  };
}
