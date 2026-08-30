import { scanTreeStructure } from './tree-scanner';
import { StateV3_0_0 } from './schema-v3.0.0';
export declare class StateLoader {
    private cache;
    private cacheExpiryMs;
    private readonly specRootDir;
    constructor(specRootDir?: string);
    /**
     * Loads all distributed states using the tree scanner
     * Returns a Map where keys are feature paths and values are their states
     */
    loadAll(): Promise<Map<string, StateV3_0_0>>;
    /**
     * Gets the state for a specific feature
     * Uses cache with 3-second expiry
     * - Reads v3.0.0 format; provides basic compatibility reads for legacy formats
     * - Applies automatic fixes for common schema issues
     */
    get(featurePath: string): Promise<StateV3_0_0 | null>;
    private stateHasIssues;
    private applyReparation;
    /**
     * Infer a Phase value from an old-style 'state' field string.
     * Maps legacy status strings to the closest Phase equivalent.
     */
    private inferPhaseFromOldState;
    /**
     * Sets the state for a specific feature
     * Updates cache and writes to the distributed file
     */
    set(featurePath: string, state: StateV3_0_0): Promise<boolean>;
    /**
     * Creates a new state for a given feature if it doesn't already exist
     * - phase defaults to 'registered', status defaults to 'tracked'
     * - Automatically calculates depth based on featurePath
     * - Initializes phaseHistory with consistent strategy
     * - Calls validateStateV3 before writing
     */
    create(featurePath: string, initialState: Partial<StateV3_0_0>): Promise<boolean>;
    /**
     * Update an existing state for a given feature path
     * Writes the state to the distributed file and updates cache
     */
    update(featurePath: string, state: StateV3_0_0): Promise<boolean>;
    /**
     * Calculate depth automatically based on featurePath
     * Computes the nesting level by counting 'specs-tree-' occurrences in the path
     */
    private computeDepth;
    /**
     * Initialize phaseHistory consistently
     * Either uses the provided history or creates a standard initial entry
     */
    private initPhaseHistory;
    /**
     * Validates state against v3.0.0 schema using validateStateV3
     */
    private validateState;
    /**
     * Clears cache to force re-loading
     */
    clearCache(): void;
    /**
     * Gets the scan tree structure for the root directory
     */
    getTreeStructure(): Promise<ReturnType<typeof scanTreeStructure>>;
}
