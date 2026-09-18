/**
 * Type surface for the density caliber (`test/ui/density-metrics.mjs`).
 *
 * The caliber is deliberately plain ESM JavaScript so it can be injected into
 * `Runtime.evaluate` verbatim and imported by `node test/ui/*.mjs` without a
 * build step. These declarations give the TypeScript gates
 * (`test/density-thresholds.test.ts`, `test/supersession-ledger.test.ts`) real
 * type checking over the same single source of truth — one implementation, two
 * consumers (NFR-V3-002).
 */

export declare const CHARS_PER_LINE: 34;
export declare const isRiskClassSource: string;
export declare const DENSITY_MEASURE_SOURCE: string;
export declare function measureExpression(): string;
export declare function measureSourceForRoot(rootExpression: string): string;

/**
 * Risk-visibility probe (AC-V3-008/009) — single source for the runtime gates.
 * Absolute-position variant of the in-page expression string (closeout round F7:
 * `visibility:hidden` / `opacity:0` ancestors now count as NOT visible, aligning
 * the probe with C1's "only `hidden` is exempt" rule).
 */
export declare function riskVisibilityProbeSource(cls: string): string;

export interface DensityLimits {
  clickables: number;
  lines: number;
}

export declare const DENSITY_LIMITS: {
  readonly default: DensityLimits;
  readonly firstRun: DensityLimits;
  readonly risk: DensityLimits;
};

export declare const DENSITY_VIEWPORTS: readonly number[];
export declare const DENSITY_VIEWPORT_HEIGHT: number;
export declare const DENSITY_TIER_ORDER: readonly string[];
export declare const DENSITY_MATRIX_SIZE: number;

export interface DensityTier {
  key: string;
  label: string;
  definition: string;
  limits: DensityLimits;
  fixture: string;
  mandatory: boolean;
  note?: string;
}

export declare const DENSITY_TIERS: { readonly [tier: string]: DensityTier };

export interface RiskSubscenario {
  key: string;
  label: string;
  dataRiskClass: string;
  productPath: string;
}

export declare const RISK_SUBSCENARIOS: readonly RiskSubscenario[];
export declare const DENSITY_CALIBERS: readonly string[];

export interface DensityElementSample {
  key: string | null;
  clickable: boolean;
  block: boolean;
  chars: number;
  risk: boolean;
}

export interface DensityMeasurement {
  clickables: number;
  chars: number;
  lines: number;
  blocks: number;
  regions: number;
  excludedElements?: number;
  excludedSelectors?: readonly string[];
  elementsWithKeys?: DensityElementSample[];
}

export interface DensityVerdict {
  ok: boolean;
  tier: string;
  viewport: number | null;
  measured: { clickables: number; lines: number; chars: number; blocks: number; regions: number };
  limits: DensityLimits;
  exceeds: string[];
  message: string;
}

export declare function evaluateDensity(
  measured: Partial<DensityMeasurement>,
  tier?: string,
  limitsOverride?: DensityLimits,
): DensityVerdict;

export declare function evaluateDelta(
  defaultMeasured: Partial<DensityMeasurement> | undefined,
  riskMeasured: Partial<DensityMeasurement> | undefined,
): { violations: string[] };

export declare const BANNED_MEASURE_APIS: readonly string[];
export declare function bannedApisInMeasureSource(): string[];

/* ── V4-1 (TASK-502 / ADR-V4-020): exemption scope + anti-abuse budgets ────── */

/** The scope module's own path / source (single declaration point). */
export declare const PACKAGE_ROOT_DIR: string;
export declare const DENSITY_SCOPE_TS: string;
export declare function readDensityScopeSource(): string;
export declare function extractFrozenStringArray(source: string, name: string): string[];
export declare function extractNumberConstant(source: string, name: string): number;

/** Exempt subtrees, read from `src/ui/sidepanel/density-scope.ts` (never copied). */
export declare const DENSITY_EXCLUDED_SUBTREES: readonly string[];
/** The three zone shells (C4 / attribution only). */
export declare const DENSITY_SHELL_ROOTS: readonly string[];
/** The canonical values the gates re-assert against the extracted ones. */
export declare const CANONICAL_EXCLUDED_SUBTREES: readonly string[];
export declare const CANONICAL_SHELL_ROOTS: readonly string[];

export declare const MAX_CLICKABLES_PER_CARD: number;
export declare const MAX_FIRST_SCREEN_CARDS: number;
export declare const MAX_WELCOME_CARDS: number;
export declare const MAX_WELCOME_LINES: number;

export interface StreamCardSample {
  key?: string | null;
  clickables?: number;
  lines?: number;
  welcome?: boolean;
}

export declare function evaluateCardBudget(
  cards: readonly StreamCardSample[] | undefined,
  limitOverride?: number,
): { ok: boolean; limit: number; count: number; violations: string[] };

export declare function evaluateFirstScreen(
  cards: readonly StreamCardSample[] | undefined,
  tier?: string,
): {
  ok: boolean;
  skipped: boolean;
  tier: string;
  reason?: string;
  count?: number;
  welcomeCards?: number;
  limits?: { maxFirstScreenCards: number; maxWelcomeCards: number; maxWelcomeLines: number };
  violations: string[];
};

/** First-round measured floor for `#log`'s client height (review I7 source). */
export declare const LOG_CLIENT_HEIGHT_FLOOR: 488;

/**
 * V4-1 spike-derived lower bound (tighten-only): the stream zone must keep
 * ≥65.0% of the viewport height. Spike: 12/12 PASS, worst 0.7273.
 */
export declare const STREAM_HEIGHT_RATIO_MIN: number;

/** Registry-comparison keys (ADR-V3-018 decision 2 / review I8). */
export declare const BASELINE_COMPARE_KEYS: readonly string[];

export interface BaselineCell {
  clickables?: number;
  lines?: number;
  blocks?: number;
  regions?: number;
  chars?: number;
}

export declare function compareBaselineCells(
  measured: Partial<BaselineCell> | undefined,
  registered: BaselineCell | undefined,
  labelOf?: () => string,
): string[];
