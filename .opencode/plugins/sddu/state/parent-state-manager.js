import * as fsPromises from 'fs/promises';
import * as path from 'path';
import { validateStateV3, } from './schema-v3.0.0';
import { TreeStructureError, ErrorCode } from '../shared/errors';
/**
 * Manages parent feature states by updating their children arrays
 * based on discovered sub-features in the tree structure.
 *
 * Updated for v3.0.0: uses phase (Phase, string) + status (FeatureStatus, string)
 * instead of the old `status: WorkflowStatus` and `phase: number`.
 */
export class ParentStateManager {
    /**
     * Scans all child features under a parent directory and updates the parent's state
     * with the list of children and their information.
     */
    async scanAndUpdateParentState(parentDir, stateLoader) {
        try {
            let parentState = (await stateLoader.get(parentDir));
            if (!parentState) {
                throw new TreeStructureError(ErrorCode.STATE_FILE_NOT_FOUND, `Parent state file not found in ${parentDir}`);
            }
            // Ensure v3.0.0 version
            if (!parentState.version || parentState.version !== 'v3.0.0') {
                parentState.version = 'v3.0.0';
            }
            // Find immediate children
            const childFeatures = await this.discoverChildFeatures(parentDir, stateLoader);
            // Build childrens array with new ChildFeatureInfoV3 type
            const childrens = childFeatures.map((child) => ({
                path: child.featurePath,
                featureName: child.featureName,
                phase: child.state?.phase || 'registered',
                status: child.state?.status || 'tracked',
                lastModified: child.lastModified || new Date().toISOString(),
            }));
            // Update parent state
            const updatedParentState = {
                ...parentState,
                childrens,
                depth: 0, // Root node
            };
            // Validate against v3.0.0 schema
            if (!validateStateV3(updatedParentState)) {
                throw new TreeStructureError(ErrorCode.PARENT_STATE_UPDATE_FAILED, `Updated parent state is not valid for ${parentDir}`);
            }
            const success = await stateLoader.set(parentDir, updatedParentState);
            if (success) {
                console.log(`Successfully updated parent state in ${parentDir} with ${childrens.length} children`);
            }
            else {
                throw new TreeStructureError(ErrorCode.PARENT_STATE_UPDATE_FAILED, `Failed to save updated parent state in ${parentDir}`);
            }
            return success;
        }
        catch (error) {
            if (error instanceof TreeStructureError) {
                console.error(`Tree structure error updating parent state: ${error.message}`);
                throw error;
            }
            else {
                console.error(`Unexpected error while updating parent state in ${parentDir}:`, error);
                throw new TreeStructureError(ErrorCode.PARENT_STATE_UPDATE_FAILED, `Unexpected error updating parent state in ${parentDir}: ${error.message}`);
            }
        }
    }
    async discoverChildFeatures(parentDir, stateLoader) {
        try {
            const treeStructure = await stateLoader.getTreeStructure();
            const parentNode = Array.from(treeStructure.flatMap.values()).find((node) => node.path === parentDir);
            if (!parentNode) {
                console.warn(`Parent node not found in tree structure for path: ${parentDir}`);
                return [];
            }
            const childPromises = parentNode.children.map(async (childNode) => {
                const childState = (await stateLoader.get(childNode.path));
                let lastModifiedDate = new Date().toISOString();
                try {
                    const statePath = path.join(childNode.path, 'state.json');
                    let stats = null;
                    try {
                        stats = await fsPromises.stat(statePath);
                    }
                    catch {
                        // File does not exist
                    }
                    if (stats) {
                        lastModifiedDate = stats.mtime.toISOString();
                    }
                }
                catch {
                    console.warn(`Could not determine modification time for child ${childNode.path}`);
                }
                return {
                    featurePath: childNode.path,
                    featureName: childNode.featureName,
                    state: childState,
                    lastModified: lastModifiedDate,
                };
            });
            return await Promise.all(childPromises);
        }
        catch (error) {
            throw new TreeStructureError(ErrorCode.TREE_SCAN_FAILED, `Failed to discover child features in ${parentDir}: ${error.message}`);
        }
    }
}
