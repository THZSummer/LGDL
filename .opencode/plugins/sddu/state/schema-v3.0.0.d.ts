export type Phase = 'registered' | 'discovered' | 'specified' | 'planned' | 'tasked' | 'builded' | 'reviewed' | 'validated';
export type FeatureStatus = 'tracked' | 'completed' | 'suspended' | 'terminated' | 'merged';
/** Phase history record */
export interface PhaseHistoryEntry {
    phase: Phase;
    timestamp: string;
    triggeredBy: string;
    comment?: string;
}
/** Suspended optional fields */
export interface SuspendedInfo {
    suspendedUntil?: string;
    suspendedNote?: string;
}
/** Merged required fields */
export interface MergedInfo {
    mergedInto: string;
    mergedAt: string;
}
/** Child feature info in tree structure */
export interface ChildFeatureInfoV3 {
    path: string;
    featureName: string;
    phase: Phase;
    status: FeatureStatus;
    lastModified: string;
}
export interface StateV3_0_0 {
    feature: string;
    name?: string;
    version: 'v3.0.0';
    phase: Phase;
    status: FeatureStatus;
    suspended?: SuspendedInfo;
    merged?: MergedInfo;
    depth: number;
    childrens?: ChildFeatureInfoV3[];
    phaseHistory: PhaseHistoryEntry[];
    dependencies: {
        on: string[];
        blocking: string[];
    };
    files: {
        discovery?: string;
        spec: string;
        plan?: string;
        tasks?: string;
        readme?: string;
        review?: string;
        validation?: string;
    };
    metadata?: {
        priority?: string;
        featureId?: string;
        createdAt?: string;
        updatedAt?: string;
    };
    history?: Array<{
        timestamp: string;
        from?: string;
        to?: string;
        triggeredBy?: string;
        comment?: string;
    }>;
}
/** Valid phase values in order */
export declare const VALID_PHASES: Phase[];
/** Valid status values */
export declare const VALID_STATUSES: FeatureStatus[];
/** Phase ordering (for monotonic validation). 0 = registered, 7 = validated */
export declare const PHASE_ORDER: Record<Phase, number>;
/** Next phase mapping. validated has no next phase. */
export declare const NEXT_PHASE: Partial<Record<Phase, Phase>>;
/** Statuses that cannot be reversed (completed, terminated, merged) */
export declare const IRREVERSIBLE_STATUSES: FeatureStatus[];
/**
 * The phase flow — each entry represents one step forward in the SDDU pipeline.
 * Used by machine.ts for phase progression validation.
 */
export declare const phaseFlow: ReadonlyArray<{
    from: Phase;
    to: Phase;
}>;
/**
 * Validate a state object against the v3.0.0 schema.
 * Returns a type guard — if true, `state` is `StateV3_0_0`.
 */
export declare function validateStateV3(state: unknown): state is StateV3_0_0;
/**
 * Validation result with structured error details.
 */
export interface ValidationResult {
    valid: boolean;
    errors: string[];
}
/**
 * Validate a state object against the v3.0.0 schema with structured error reporting.
 * Unlike `validateStateV3()` (boolean only), this returns a detailed result
 * listing every validation failure, making it useful for user-facing error messages.
 */
export declare function validateStateV3Detailed(state: unknown): ValidationResult;
/**
 * Based on current phase and status, determine whether the user should
 * be recommended to continue to the next phase.
 *
 * Only recommends continue when status is 'tracked' and phase is not yet 'validated'.
 */
export declare function shouldRecommendContinue(phase: Phase, status: FeatureStatus): boolean;
/**
 * Get the next recommended phase given the current phase and status.
 * Returns null if the feature should not continue (e.g. suspended, completed, etc.).
 */
export declare function getNextRecommendedPhase(phase: Phase, status: FeatureStatus): Phase | null;
/**
 * Determine whether a status transition from `currentStatus` to `targetStatus` is reversible.
 *
 * Reversible transitions (true):
 *   - 'suspended' → 'tracked' (user resumes a suspended feature)
 *
 * Irreversible transitions (false):
 *   - 'completed' → anything (completed is permanent)
 *   - 'terminated' → anything (terminated is permanent)
 *   - 'merged' → anything (merged is permanent)
 *   - 'tracked' → 'tracked' (no-op, not a real transition)
 */
export declare function isStatusReversible(currentStatus: FeatureStatus, targetStatus: FeatureStatus): boolean;
