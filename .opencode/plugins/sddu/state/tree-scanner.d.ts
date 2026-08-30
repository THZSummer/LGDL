type FeatureStatus = string;
interface MinimalFeatureState {
    status: FeatureStatus;
}
export interface ScanResult {
    nodes: FeatureTreeNode[];
    flatMap: Map<string, FeatureTreeNode>;
}
export interface FeatureTreeNode {
    id: string;
    path: string;
    featureName: string;
    level: number;
    children: FeatureTreeNode[];
    parent?: string;
}
/** Display context — determines where a feature should be shown in the dashboard */
export interface DisplayContext {
    /** The ancestor feature that this feature should be displayed under, or null if independent */
    effectiveParent: string | null;
    /** Whether this feature appears independently (true) or grouped under a non-tracked ancestor (false) */
    isIndependent: boolean;
}
/**
 * Scans and returns the tree structure rooted at specRootDir
 * Identifies specs-tree-* directories recursively and creates a node map
 */
export declare function scanTreeStructure(specRootDir: string): Promise<ScanResult>;
/**
 * Determines if a given node represents a parent feature (one that has children)
 */
export declare function isParentFeature(node: FeatureTreeNode): boolean;
/**
 * Find the first non-tracked ancestor of a feature by walking up the parent chain.
 *
 * "Non-tracked" means status is suspended / terminated / merged / completed.
 * Tracked ancestors are skipped (they don't "own" their children visually).
 *
 * Returns the path of the first non-tracked ancestor, or null if all ancestors
 * are tracked (or there are no ancestors).
 *
 * @param featurePath - The feature whose ancestry should be inspected.
 * @param allStates  - A map from featurePath → loaded StateV3_0_0 (must contain status).
 * @param treeNodes  - The flatMap from scanTreeStructure (provides parent chain).
 */
export declare function findFirstNonTrackedAncestor(featurePath: string, allStates: Map<string, MinimalFeatureState>, treeNodes: Map<string, FeatureTreeNode>): string | null;
/**
 * Resolve the display context for a feature under FR-004 (子随父归).
 *
 * Algorithm:
 *  1. Walk up the ancestor chain from `featurePath`.
 *  2. Find the first ancestor whose status is NOT 'tracked'.
 *  3. If found → the feature belongs to that ancestor (isIndependent = false).
 *  4. If not found → the feature is independent (isIndependent = true).
 *
 * Recursion: descendants of a non-tracked ancestor all point to the *topmost*
 * non-tracked ancestor, not just their direct parent.
 *
 * @param featurePath - The feature whose display context to resolve.
 * @param allStates  - A map from featurePath → loaded StateV3_0_0.
 * @param treeNodes  - The flatMap from scanTreeStructure.
 * @returns A DisplayContext describing where this feature should appear.
 */
export declare function resolveDisplayContext(featurePath: string, allStates: Map<string, MinimalFeatureState>, treeNodes: Map<string, FeatureTreeNode>): DisplayContext;
export {};
