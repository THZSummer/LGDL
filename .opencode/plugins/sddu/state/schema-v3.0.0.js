// State Schema v3.0.0
// Two-field model: phase (8 stages) + status (5 flow states), completely independent
//
// This is the canonical state format for SDDU features starting from v3.0.0.
// It replaces the old single-field model (v2.x) where a single `status` field
// conflated stage semantics and flow semantics.
// ============================================================================
// Constants
// ============================================================================
/** Valid phase values in order */
export const VALID_PHASES = [
    'registered', 'discovered', 'specified', 'planned',
    'tasked', 'builded', 'reviewed', 'validated'
];
/** Valid status values */
export const VALID_STATUSES = [
    'tracked', 'completed', 'suspended', 'terminated', 'merged'
];
/** Phase ordering (for monotonic validation). 0 = registered, 7 = validated */
export const PHASE_ORDER = {
    'registered': 0,
    'discovered': 1,
    'specified': 2,
    'planned': 3,
    'tasked': 4,
    'builded': 5,
    'reviewed': 6,
    'validated': 7
};
/** Next phase mapping. validated has no next phase. */
export const NEXT_PHASE = {
    'registered': 'discovered',
    'discovered': 'specified',
    'specified': 'planned',
    'planned': 'tasked',
    'tasked': 'builded',
    'builded': 'reviewed',
    'reviewed': 'validated'
};
/** Statuses that cannot be reversed (completed, terminated, merged) */
export const IRREVERSIBLE_STATUSES = [
    'completed', 'terminated', 'merged'
];
/**
 * The phase flow — each entry represents one step forward in the SDDU pipeline.
 * Used by machine.ts for phase progression validation.
 */
export const phaseFlow = [
    { from: 'registered', to: 'discovered' },
    { from: 'discovered', to: 'specified' },
    { from: 'specified', to: 'planned' },
    { from: 'planned', to: 'tasked' },
    { from: 'tasked', to: 'builded' },
    { from: 'builded', to: 'reviewed' },
    { from: 'reviewed', to: 'validated' },
];
// ============================================================================
// Validation
// ============================================================================
/**
 * Validate a state object against the v3.0.0 schema.
 * Returns a type guard — if true, `state` is `StateV3_0_0`.
 */
export function validateStateV3(state) {
    if (!state || typeof state !== 'object')
        return false;
    const s = state;
    // Identity checks
    if (s.version !== 'v3.0.0')
        return false;
    if (typeof s.feature !== 'string' || !s.feature)
        return false;
    // Phase validation (must be one of 8 valid values)
    if (!VALID_PHASES.includes(s.phase))
        return false;
    // Status validation (must be one of 5 valid values)
    if (!VALID_STATUSES.includes(s.status))
        return false;
    // Combined constraints
    if (s.status === 'completed' && s.phase !== 'validated') {
        // status='completed' is only legal when phase='validated'
        return false;
    }
    if (s.status === 'merged') {
        const merged = s.merged;
        if (!merged || typeof merged.mergedInto !== 'string' || !merged.mergedInto) {
            // status='merged' requires merged.mergedInto field
            return false;
        }
    }
    // Structural field validations
    if (typeof s.depth !== 'number' || s.depth < 0)
        return false;
    if (!Array.isArray(s.phaseHistory))
        return false;
    // files.spec is required
    const files = s.files;
    if (!files || typeof files !== 'object' || typeof files.spec !== 'string')
        return false;
    // dependencies.on and dependencies.blocking must be arrays
    const deps = s.dependencies;
    if (!deps || typeof deps !== 'object' ||
        !Array.isArray(deps.on) ||
        !Array.isArray(deps.blocking)) {
        return false;
    }
    return true;
}
/**
 * Validate a state object against the v3.0.0 schema with structured error reporting.
 * Unlike `validateStateV3()` (boolean only), this returns a detailed result
 * listing every validation failure, making it useful for user-facing error messages.
 */
export function validateStateV3Detailed(state) {
    const errors = [];
    if (!state || typeof state !== 'object') {
        return { valid: false, errors: ['state is not an object'] };
    }
    const s = state;
    // Identity checks
    if (s.version !== 'v3.0.0') {
        errors.push(`version must be 'v3.0.0', got '${String(s.version)}'`);
    }
    if (typeof s.feature !== 'string' || !s.feature) {
        errors.push('feature is required and must be a non-empty string');
    }
    // Phase validation
    if (!VALID_PHASES.includes(s.phase)) {
        errors.push(`phase must be one of [${VALID_PHASES.join(', ')}], got '${String(s.phase)}'`);
    }
    // Status validation
    if (!VALID_STATUSES.includes(s.status)) {
        errors.push(`status must be one of [${VALID_STATUSES.join(', ')}], got '${String(s.status)}'`);
    }
    // Combined constraints
    if (s.status === 'completed' && s.phase !== 'validated') {
        errors.push(`status='completed' is only valid when phase='validated' (current phase='${String(s.phase)}')`);
    }
    if (s.status === 'merged') {
        const merged = s.merged;
        if (!merged || typeof merged.mergedInto !== 'string' || !merged.mergedInto) {
            errors.push("status='merged' requires merged.mergedInto field");
        }
    }
    // Structural validations
    if (typeof s.depth !== 'number' || s.depth < 0) {
        errors.push(`depth must be a non-negative number, got '${String(s.depth)}'`);
    }
    if (!Array.isArray(s.phaseHistory)) {
        errors.push('phaseHistory must be an array');
    }
    const files = s.files;
    if (!files || typeof files !== 'object' || typeof files.spec !== 'string') {
        errors.push('files.spec is required and must be a string');
    }
    const deps = s.dependencies;
    if (!deps || typeof deps !== 'object' || !Array.isArray(deps.on) || !Array.isArray(deps.blocking)) {
        errors.push('dependencies.on and dependencies.blocking must be arrays');
    }
    return { valid: errors.length === 0, errors };
}
// ============================================================================
// Derivation functions
// ============================================================================
/**
 * Based on current phase and status, determine whether the user should
 * be recommended to continue to the next phase.
 *
 * Only recommends continue when status is 'tracked' and phase is not yet 'validated'.
 */
export function shouldRecommendContinue(phase, status) {
    return status === 'tracked' && phase !== 'validated';
}
/**
 * Get the next recommended phase given the current phase and status.
 * Returns null if the feature should not continue (e.g. suspended, completed, etc.).
 */
export function getNextRecommendedPhase(phase, status) {
    if (!shouldRecommendContinue(phase, status))
        return null;
    return NEXT_PHASE[phase] || null;
}
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
export function isStatusReversible(currentStatus, targetStatus) {
    // If current is irreversible, cannot transition away
    if (IRREVERSIBLE_STATUSES.includes(currentStatus))
        return false;
    // Only suspended → tracked is explicitly reversible
    return currentStatus === 'suspended' && targetStatus === 'tracked';
}
