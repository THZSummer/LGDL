/**
 * V2-1 additive `insight-*` message validation (ADR-V2-004).
 *
 * The two new kinds are part of the `PluginMessageKind` union, but they are
 * **deliberately validated here instead of the shared `KIND_SET`**: that set is
 * bundled into the injected content script, and `content.js` must not grow
 * (NFR-V2-002 red line). Content scripts never receive `insight-*` messages, so
 * they need no knowledge of them; the service worker does, via this predicate.
 */
import type { PluginMessage, PluginMessageKind } from './messaging.js';

/** The additive V2 message kinds (background ↔ side panel only). */
export const INSIGHT_MESSAGE_KINDS: readonly PluginMessageKind[] = ['insight-tree', 'insight-changed'];

const INSIGHT_KIND_SET: ReadonlySet<PluginMessageKind> = new Set<PluginMessageKind>(INSIGHT_MESSAGE_KINDS);

/** Whether a raw message is one of the additive V2 `insight-*` kinds. */
export function isInsightMessage(value: unknown): value is PluginMessage {
  if (typeof value !== 'object' || value === null) return false;
  const kind = (value as { kind?: unknown }).kind;
  return typeof kind === 'string' && INSIGHT_KIND_SET.has(kind as PluginMessageKind);
}
