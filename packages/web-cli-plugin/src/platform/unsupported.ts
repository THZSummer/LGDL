/**
 * Unsupported-capability translation (FR-008 / EC-007).
 *
 * Reuses the upstream `ATTRIBUTION_MAP` (zero fork) so unreachable capabilities
 * are always reported as "unsupported + attribution" — never a silent failure,
 * never a fake success. No silent `catch {}` blocks anywhere in the plugin.
 */
import {
  ATTRIBUTION_MAP,
  attributionHelpLines,
  translateCapabilityError,
  unsupportedAttribution,
} from '@lgdl/web-cli-base';

export { ATTRIBUTION_MAP, attributionHelpLines, unsupportedAttribution };

export interface UnsupportedResult {
  output: string;
  error: string;
}

/** Unified "not supported + attribution" result for a capability key. */
export function unsupportedCapability(capability: string): UnsupportedResult {
  return unsupportedAttribution(capability);
}

/** Unified capability failure translation (permission denied / cross-origin / CSP …). */
export function capabilityFailure(err: unknown, capability: string): UnsupportedResult {
  return translateCapabilityError(err, capability);
}

/** Whether a capability is documented in the attribution map. */
export function isAttributed(capability: string): boolean {
  return Object.prototype.hasOwnProperty.call(ATTRIBUTION_MAP, capability);
}

export const EXTENSION_UNSUPPORTED_NOTE =
  '插件对不可达能力一律显式转译 + 归属（不静默、不假装生效）；能力归属表见 ext-attribution。';
