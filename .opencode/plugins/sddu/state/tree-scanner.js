import * as fs from 'fs/promises';
import * as path from 'path';
import { constants as fsConstants } from 'fs';
/**
 * Scans and returns the tree structure rooted at specRootDir
 * Identifies specs-tree-* directories recursively and creates a node map
 */
export async function scanTreeStructure(specRootDir) {
    const nodes = [];
    const flatMap = new Map();
    // Start scanning from the root directory
    const rootNodes = await scanDirectoryRecursively(specRootDir, 0, undefined);
    // Collect all nodes and populate the flatMap
    for (const node of rootNodes) {
        collectNodes(node, nodes, flatMap);
    }
    return { nodes, flatMap };
}
/**
 * Recursive helper to scan a directory and return feature tree nodes
 */
async function scanDirectoryRecursively(dir, level, parentPath) {
    try {
        await fs.access(dir, fsConstants.F_OK);
    }
    catch {
        // Directory does not exist, return empty array
        return [];
    }
    const entries = await fs.readdir(dir);
    const featureNodeChildren = [];
    for (const entry of entries) {
        if (entry.startsWith('.sddu'))
            continue; // Skip sddu metadata directories
        if (entry.startsWith('.'))
            continue; // Skip hidden directories
        const fullPath = path.join(dir, entry);
        const relPath = path.relative(process.cwd(), fullPath);
        // Check if this entry matches the specs-tree pattern
        if (entry.startsWith('specs-tree-')) {
            const featureName = entry.substring('specs-tree-'.length);
            // Create the feature node
            const featureNode = {
                id: entry,
                path: relPath,
                featureName,
                level,
                children: [],
                parent: parentPath
            };
            // Look for nested specs-tree-* subdirectories within this feature's directory
            try {
                const stat = await fs.stat(fullPath);
                if (stat.isDirectory()) {
                    // Recursively scan subdirectories for nested features
                    featureNode.children = await scanDirectoryRecursively(fullPath, level + 1, fullPath);
                }
            }
            catch (error) {
                console.warn(`Failed to scan subdirectory ${fullPath}: ${error.message}`);
            }
            featureNodeChildren.push(featureNode);
        }
    }
    return featureNodeChildren;
}
/**
 * Helper function to traverse all nodes and populate the flatMap and nodes array
 */
function collectNodes(node, nodes, flatMap) {
    // Add current node to flatMap using its path as key
    flatMap.set(node.path, node);
    nodes.push(node);
    // Recursively process children
    for (const child of node.children) {
        collectNodes(child, nodes, flatMap);
    }
}
/**
 * Determines if a given node represents a parent feature (one that has children)
 */
export function isParentFeature(node) {
    return node.children.length > 0;
}
// ============================================================================
// FR-004: 子随父归 (child-belongs-to-parent) display context resolution
// ============================================================================
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
export function findFirstNonTrackedAncestor(featurePath, allStates, treeNodes) {
    const visited = new Set();
    let current = featurePath;
    while (current) {
        if (visited.has(current))
            break; // safety guard against cycles
        visited.add(current);
        const node = treeNodes.get(current);
        if (!node || !node.parent)
            break;
        const parentPath = path.relative(process.cwd(), node.parent);
        const parentState = allStates.get(parentPath);
        if (parentState && parentState.status !== 'tracked') {
            return parentPath;
        }
        // Continue walking up — tracked parents don't stop the walk
        current = parentPath;
    }
    return null;
}
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
export function resolveDisplayContext(featurePath, allStates, treeNodes) {
    const effectiveParent = findFirstNonTrackedAncestor(featurePath, allStates, treeNodes);
    if (effectiveParent) {
        return { effectiveParent, isIndependent: false };
    }
    return { effectiveParent: null, isIndependent: true };
}
