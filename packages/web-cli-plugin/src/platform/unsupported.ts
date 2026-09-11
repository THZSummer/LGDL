/**
 * Unsupported-capability translation (FR-008 / EC-007).
 *
 * Reuses the upstream `translateCapabilityError` (zero fork) so unreachable
 * capabilities are always reported as "unsupported + attribution" — never a
 * silent failure, never a fake success. No silent empty catch blocks anywhere in
 * the plugin.
 *
 * The upstream capability-attribution contract (`ATTRIBUTION_MAP` /
 * `unsupportedAttribution` / `attributionHelpLines`) stays in
 * `@lgdl/web-cli-base` and is consumed there; the plugin only needs the runtime
 * error translator (D-023 removes the previously test-only re-exports).
 */
import { translateCapabilityError } from '@lgdl/web-cli-base';

export interface UnsupportedResult {
  output: string;
  error: string;
}

/** Unified capability failure translation (permission denied / cross-origin / CSP …). */
export function capabilityFailure(err: unknown, capability: string): UnsupportedResult {
  return translateCapabilityError(err, capability);
}
