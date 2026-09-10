/**
 * LGDL page-world bridge — postMessage RPC listener + write-back channel
 * (FR-020 / FR-041, ADR-004).
 *
 * The plugin's content script posts `web-cli:invoke`; the bridge dispatches it
 * through the retained mechanism-layer router and posts `web-cli:result`. It also
 * answers `web-cli:probe` with the site declaration (runtime handshake channel).
 *
 * Write-back (FR-020): changed source is validated with `parseLgdl` before
 * `onApply`; no React internal state is touched directly.
 */
import { parseLgdl } from '@lgdl/lgdl-core';
import type { ToolResult } from '@lgdl/web-cli-base';
import type { WebCliHostRouter } from './host-router.js';

export const WEB_CLI_INVOKE = 'web-cli:invoke';
export const WEB_CLI_RESULT = 'web-cli:result';
export const WEB_CLI_PROBE = 'web-cli:probe';
export const WEB_CLI_DESCRIPTOR = 'web-cli:descriptor';
export const WEB_CLI_CHANNEL = 'web-cli';

export interface WebCliBridgeDeps {
  router: WebCliHostRouter;
  /** Site declaration (runtime handshake reply). */
  descriptor: () => unknown;
  /** Write-back callback (validated source applied to the editor). */
  onApply(source: string): void;
  /** Injectable window for tests (defaults to the global window). */
  target?: Window;
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

  const handle = async (data: unknown, source?: unknown): Promise<void> => {
    if (source !== undefined && source !== win) return;
    if (!isRecord(data) || typeof data.type !== 'string') return;
    if (data.channel !== WEB_CLI_CHANNEL) return;

    if (data.type === WEB_CLI_PROBE) {
      post({ type: WEB_CLI_DESCRIPTOR, channel: WEB_CLI_CHANNEL, id: data.id, descriptor: deps.descriptor() });
      return;
    }
    if (data.type !== WEB_CLI_INVOKE) return;

    const id = typeof data.id === 'string' ? data.id : '';
    const tool = typeof data.tool === 'string' ? data.tool : '';
    const subcommand = typeof data.subcommand === 'string' ? data.subcommand : '';
    const args = stringArgs(data.args);

    let result: ToolResult;
    try {
      result = await deps.router.dispatch({ id, name: tool, subcommand, args, rawArguments: '{}' });
    } catch (err) {
      result = { ok: false, output: `✖ 站点执行异常：${err instanceof Error ? err.message : String(err)}`, error: 'dispatch error' };
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
