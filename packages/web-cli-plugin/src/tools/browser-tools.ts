/**
 * Base-derived browser capability tools (FR-051 / TASK-029).
 *
 * WHY: the plugin's LLM tool face had drifted from the original built-in
 * assistant — `dom` (30 subcommands) and `chrome` (print/back/forward/reload/
 * screenshot) were missing entirely (author report: 「dom 操作、浏览器截图等命令
 * 全部丢失」). This module wires the base domain factories back into the plugin
 * router, gated on the injected `PlatformEnv` seams so a capability only appears
 * when it can actually run (never a silent no-op).
 *
 * RISK DISCIPLINE: the base entries keep their own `risk` / `subcommandRisks`
 * (never widened here); every execution goes through `router.dispatch` and is
 * audited by the router's audit sink. No new permission is introduced — the DOM
 * seam is served by the already-held `activeTab`/`scripting` content script, the
 * download chain is a page-context anchor action, and `web-search` reports a
 * readable disabled state until an endpoint is configured.
 */
import {
  createChromeToolEntry,
  createCollectBuffer,
  createDomToolEntry,
  createEventsToolEntry,
  createExportToolEntry,
  createExtractToolEntry,
  createSaveFileToolEntry,
  createWaitToolEntry,
  createWebSearchToolEntry,
  type PlatformEnv,
  type ToolEntry,
} from '@lgdl/web-cli-base';

export interface BrowserToolOptions {
  /** Browser seams (dom.ops / filePicker / events / search). */
  env: PlatformEnv;
  /**
   * Explicit opt-out per family. Default: every family whose seam is present is
   * registered. Used by tests and future hosts that only own a subset.
   */
  disable?: {
    dom?: boolean;
    chrome?: boolean;
    wait?: boolean;
    collect?: boolean;
    save?: boolean;
    events?: boolean;
    webSearch?: boolean;
  };
}

/**
 * Build the base-derived browser tool entries for the given env.
 *
 * The `extract` / `export` pair shares ONE in-memory `CollectBuffer` (same
 * session), matching the baseline wiring. `dom`/`chrome`/`wait` require
 * `env.dom.ops`; `extract` additionally requires `ops.extractData`; `export`
 * and `save` require `env.filePicker`. `web-search` is always registered so the
 * command surface is complete, and returns a readable disabled state when no
 * search endpoint is configured (`env.search` undefined, FR-040/EC-006).
 */
export function createBrowserToolEntries(opts: BrowserToolOptions): ToolEntry[] {
  const env = opts.env;
  const off = opts.disable ?? {};
  const ops = env.dom?.ops;
  const entries: ToolEntry[] = [];

  if (ops && !off.dom) entries.push(createDomToolEntry(env));
  if (ops && !off.chrome) entries.push(createChromeToolEntry(env));
  if (ops?.waitFor && !off.wait) entries.push(createWaitToolEntry(env));
  if (ops?.extractData && !off.collect) {
    const buffer = createCollectBuffer();
    entries.push(createExtractToolEntry(env, buffer));
    if (env.filePicker && !off.save) entries.push(createExportToolEntry(env, { buffer }));
  }
  if (env.filePicker && !off.save) entries.push(createSaveFileToolEntry(env));
  if (env.events && !off.events) entries.push(createEventsToolEntry(env));
  if (!off.webSearch) entries.push(createWebSearchToolEntry(env));

  return entries;
}
