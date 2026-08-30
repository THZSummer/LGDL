import { StateLoader } from './state-loader';
/**
 * Manages parent feature states by updating their children arrays
 * based on discovered sub-features in the tree structure.
 *
 * Updated for v3.0.0: uses phase (Phase, string) + status (FeatureStatus, string)
 * instead of the old `status: WorkflowStatus` and `phase: number`.
 */
export declare class ParentStateManager {
    /**
     * Scans all child features under a parent directory and updates the parent's state
     * with the list of children and their information.
     */
    scanAndUpdateParentState(parentDir: string, stateLoader: StateLoader): Promise<boolean>;
    private discoverChildFeatures;
}
