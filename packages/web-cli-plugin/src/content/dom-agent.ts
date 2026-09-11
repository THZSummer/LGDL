/**
 * Generic DOM tool face — remote `PlatformDomOps` proxy (TASK-015, FR-008/EC-007).
 *
 * The background host has no DOM; page DOM operations must run in the page
 * world. This module builds a `PlatformDomOps` whose methods forward to an
 * injected transport (a content-script RPC to the page). It is **default off**:
 * nothing is created unless a transport is supplied, and building the proxy
 * installs no listeners and costs nothing while idle (NFR-002/007).
 *
 * Unreachable / failed operations are translated into readable results
 * (`ok:false` with an attribution note) — never a silent failure (FR-008).
 *
 * Type-only imports keep the base package out of the content bundle.
 */
import type { PlatformDomOpResult, PlatformDomOps } from '@lgdl/web-cli-base';

export interface DomAgentTransport {
  /** Send one DOM operation to the page world and await its result. */
  request(method: string, params: Record<string, unknown>): Promise<PlatformDomOpResult>;
}

/** Readable translation for an unreachable/failed DOM capability (FR-008 / EC-007). */
export function domUnreachable(method: string, err: unknown): PlatformDomOpResult {
  const message = err instanceof Error ? err.message : String(err);
  return {
    ok: false,
    output: `✖ DOM 能力不可达（${method}）：${message}——页面可能未实现 DOM 通道或已导航（FR-008/EC-007）`,
    error: 'dom-unreachable',
  };
}

/** Wrap one transport call so failures stay readable (never throw). */
async function call(transport: DomAgentTransport, method: string, args: unknown[]): Promise<PlatformDomOpResult> {
  try {
    return await transport.request(method, { args });
  } catch (err) {
    return domUnreachable(method, err);
  }
}

/**
 * Build a `PlatformDomOps` that proxies every operation to `transport`.
 * Required methods are declared explicitly; any additional (optional) method is
 * proxied lazily, so new base ops work without changes here.
 */
export function createRemoteDomOps(transport: DomAgentTransport): PlatformDomOps {
  const ops: Record<string, (...args: unknown[]) => Promise<PlatformDomOpResult>> = {
    readState: (...args) => call(transport, 'readState', args),
    click: (...args) => call(transport, 'click', args),
    hover: (...args) => call(transport, 'hover', args),
    scroll: (...args) => call(transport, 'scroll', args),
    zoom: (...args) => call(transport, 'zoom', args),
    fullscreen: (...args) => call(transport, 'fullscreen', args),
    snapshot: (...args) => call(transport, 'snapshot', args),
  };

  return new Proxy(ops as unknown as PlatformDomOps, {
    get(target, prop, receiver) {
      if (prop in target || typeof prop !== 'string') return Reflect.get(target, prop, receiver);
      // Optional op not declared here: proxy it lazily (transport decides support).
      return (...args: unknown[]) => call(transport, prop, args);
    },
  });
}

/**
 * Build the remote DOM agent only when a transport exists (default off / zero
 * overhead). Returns `undefined` when the feature is not wired.
 */
export function createDomAgent(transport?: DomAgentTransport): PlatformDomOps | undefined {
  return transport ? createRemoteDomOps(transport) : undefined;
}
