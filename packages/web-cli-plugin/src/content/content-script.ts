/**
 * Content script entry (FR-007 / FR-011, ADR-002/004).
 *
 * Injected on demand via `chrome.scripting` (no static content_scripts), runs in
 * the isolated world, and acts as the data plane: protocol discovery + page RPC.
 * It never attaches globals to `window`, never modifies prototypes, and holds no
 * keys / makes no authorization decisions.
 */
import { discover, type DiscoveryFetchResult } from '../discovery/discovery.js';
import { parseHtmlDeclaration } from '../discovery/static-declaration.js';
import { errorResponse, isPluginMessage, makeMessage, okResponse } from '../background/messaging.js';
import { createPageBridge, type BridgeIo, type WebCliEventOp } from './page-bridge.js';

const CHANNEL = 'web-cli';

const io: BridgeIo = {
  post(message) {
    window.postMessage(message, '*');
  },
  subscribe(handler) {
    const listener = (event: MessageEvent) => {
      if (event.source !== window) return;
      handler(event.data);
    };
    window.addEventListener('message', listener);
    return () => window.removeEventListener('message', listener);
  },
};

const bridge = createPageBridge(io, {
  channel: CHANNEL,
  // FR-021: page-world event pushes are forwarded to the background event
  // channel. Best-effort: a missing background receiver must not break the page.
  onEvent: (message) => {
    void chrome.runtime
      .sendMessage(makeMessage('site-event-push', { channel: message.channel, subId: message.subId, events: message.events }))
      .catch(() => {});
  },
});

async function fetchText(url: string): Promise<DiscoveryFetchResult> {
  try {
    const res = await fetch(url, { credentials: 'omit' });
    if (!res.ok) return { ok: false, status: res.status, error: `HTTP ${res.status}` };
    return { ok: true, status: res.status, text: await res.text() };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

async function runDiscovery(): Promise<void> {
  const result = await discover({
    origin: location.origin,
    fetchText,
    readHtmlHref: async () => parseHtmlDeclaration(document.documentElement.outerHTML, location.href),
    handshake: () => bridge.handshake(),
  });
  const payload: Record<string, unknown> = {
    origin: location.origin,
    state: result.state,
    failure: result.failure,
    reason: result.reason,
  };
  if (result.state === 'supported' && result.descriptor) payload.descriptor = result.descriptor;
  // EC-014 / FR-013: carry the version negotiation outcome so the background can
  // audit unknown / incompatible versions (never a silent accept).
  if (result.version) payload.version = result.version;
  try {
    await chrome.runtime.sendMessage(makeMessage('discover', payload));
  } catch (err) {
    console.warn('[web-cli-plugin] discovery report failed:', err);
  }
}

chrome.runtime.onMessage.addListener((raw, _sender, sendResponse) => {
  if (!isPluginMessage(raw)) return undefined;
  if (raw.kind === 'site-invoke') {
    const tool = typeof raw.tool === 'string' ? raw.tool : '';
    const subcommand = typeof raw.subcommand === 'string' ? raw.subcommand : '';
    const args = (raw.args && typeof raw.args === 'object' ? raw.args : {}) as Record<string, string>;
    void bridge.invoke(tool, subcommand, args).then(
      (result) => sendResponse(okResponse(result)),
      (err) => sendResponse(errorResponse(err instanceof Error ? err.message : String(err))),
    );
    return true;
  }
  if (raw.kind === 'site-event') {
    // FR-021: proxy the page-world `env.events` hub for the background.
    const op = (typeof raw.op === 'string' ? raw.op : 'status') as WebCliEventOp;
    const params = (raw.params && typeof raw.params === 'object' ? raw.params : {}) as Record<string, unknown>;
    void bridge.events.request(op, params).then(
      (result) => sendResponse(okResponse(result)),
      (err) => sendResponse(errorResponse(err instanceof Error ? err.message : String(err))),
    );
    return true;
  }
  return undefined;
});

void runDiscovery();
