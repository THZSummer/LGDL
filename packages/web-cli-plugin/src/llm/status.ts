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
 * V5.5-2 **TASK-V55-201** (ADR-V55-006 §1/§2 · FR-SELF-052 · AC-SELF-007) — the
 * **deterministic「LLM 已配置」predicate** (the ONE theme① ↔ theme② fork source).
 *
 * Three fields, nothing else: `hasKey ∧ providerId 非空 ∧ model 非空`.
 *
 * ── Why exactly these three (and why this predicate does NOT create false negatives) ──
 *
 *   · `hasKey`       — `keyStore.maskedConfig()`'s `apiKey.length > 0`. The ONLY field
 *                      that can genuinely be missing ⇒ the verdict is substantially
 *                      decided here;
 *   · `providerId`   — `store.active`, validated by `isProviderId()` on read and
 *                      falling back to `'deepseek'` ⇒ **structurally ∈ PROVIDERS**;
 *   · `model`        — `state?.model?.trim() ? state.model : provider.defaultModel`
 *                      ⇒ **structurally non-empty** (falls back to the default).
 *
 * So the two trailing conjuncts cannot be false for a real key-store read: the
 * predicate is a **total function** over the three fields — a usable configuration is
 * never misjudged as unconfigured (which would send a working user back to setup),
 * and a half-written one is never misjudged as configured.
 *
 * ── Discipline ───────────────────────────────────────────────────────────────
 *
 * Dependency-free (no key-store / provider-table / SDK / chrome import) so BOTH faces
 * can import it — the service worker as a value, the side panel type-only — meaning
 * the guard costs **zero `sidepanel.js` bytes** (ADR-V55-006 §1). It performs zero LLM
 * calls, zero network reads and zero clock reads: same input ⇒ same verdict, always.
 *
 * 口径限制（诚实登记）：`hasKey` proves a key **exists**, not that it is valid —
 * validity needs a network round trip, so a wrong key still travels the existing
 * LLM-error path (this Feature deliberately does not take that path over).
 */
export const LLM_CONFIGURED_FIELDS = Object.freeze(['hasKey', 'providerId', 'model'] as const);

/** 「已配置 LLM」判据（零 LLM 调用 / 零网络 / 全函数）。 */
export function isLlmConfigured(s: Pick<MaskedLlmLike, 'hasKey' | 'providerId' | 'model'>): boolean {
  return s.hasKey === true && s.providerId.trim().length > 0 && s.model.trim().length > 0;
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
