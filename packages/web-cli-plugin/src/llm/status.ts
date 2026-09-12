/**
 * Non-sensitive LLM configuration summary (FR-033 / F-2).
 *
 * The side panel only needs to know *whether* a provider is configured and
 * *which* provider/model is active. This module is deliberately dependency-free
 * (no key-store / provider-table / base imports) so the side-panel bundle never
 * pulls the LLM SDK, and it can never leak the API key: `toLlmStatusSummary`
 * copies only `configured` / `providerId` / `providerName` / `model`.
 */

/** Summary shape returned by the background `llm-status` message. */
export interface LlmStatusSummary {
  configured: boolean;
  providerId: string;
  providerName: string;
  model: string;
}

/** Structural input (a superset of `MaskedLlmConfig`; extra fields are dropped). */
export interface MaskedLlmLike {
  hasKey: boolean;
  providerId: string;
  providerName: string;
  model: string;
}

/**
 * Project a masked LLM config down to the non-sensitive summary. Any key
 * material (`apiKey`, `apiKeyMasked`, …) is intentionally not copied.
 */
export function toLlmStatusSummary(cfg: MaskedLlmLike): LlmStatusSummary {
  return {
    configured: cfg.hasKey === true,
    providerId: String(cfg.providerId ?? ''),
    providerName: String(cfg.providerName ?? ''),
    model: String(cfg.model ?? ''),
  };
}
