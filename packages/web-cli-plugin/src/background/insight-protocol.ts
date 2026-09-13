/**
 * V2-1 additive `insight-*` message validation (ADR-V2-004) + V2-3 R2 additive
 * `command-policy*` kinds (ADR-V2-024/026/027).
 *
 * These kinds are part of the `PluginMessageKind` union, but they are
 * **deliberately validated here instead of the shared `KIND_SET`**: that set is
 * bundled into the injected content script, and `content.js` must not grow
 * (NFR-V2-002 red line). Content scripts never receive these messages, so they
 * need no knowledge of them; the service worker does, via this predicate.
 */
import type { PluginMessage, PluginMessageKind } from './messaging.js';

/** The additive V2-1 message kinds (background ↔ side panel only). */
export const INSIGHT_MESSAGE_KINDS: readonly PluginMessageKind[] = ['insight-tree', 'insight-changed'];

/**
 * V2-3 R2: additive command-level override kinds (background ↔ side panel only).
 *
 * `command-policy` = pull (store listing + degradation state);
 * `command-policy-set` / `command-policy-reset` = the **only** write paths (the
 * server-side clamp is enforced in the SW judgment chain, never in the UI).
 */
export const COMMAND_POLICY_MESSAGE_KINDS: readonly PluginMessageKind[] = [
  'command-policy',
  'command-policy-set',
  'command-policy-reset',
];

/** All additive kinds accepted (without touching the content-script `KIND_SET`). */
export const ADDITIVE_MESSAGE_KINDS: readonly PluginMessageKind[] = [
  ...INSIGHT_MESSAGE_KINDS,
  ...COMMAND_POLICY_MESSAGE_KINDS,
];

const ADDITIVE_KIND_SET: ReadonlySet<PluginMessageKind> = new Set<PluginMessageKind>(ADDITIVE_MESSAGE_KINDS);

/** Whether a raw message is one of the additive (insight / command-policy) kinds. */
export function isInsightMessage(value: unknown): value is PluginMessage {
  if (typeof value !== 'object' || value === null) return false;
  const kind = (value as { kind?: unknown }).kind;
  return typeof kind === 'string' && ADDITIVE_KIND_SET.has(kind as PluginMessageKind);
}
