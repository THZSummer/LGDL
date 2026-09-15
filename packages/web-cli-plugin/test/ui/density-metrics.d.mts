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
