// 依赖状态检查器
// 基于 MultiFeatureManager 的依赖图实现状态级别的依赖检查
//
// v3.0.0: Uses Phase directly instead of the deprecated FeatureStateEnum.
// Removes the dual-universe mapping (FeatureStateEnum ↔ WorkflowStatus).
import * as fs from 'fs/promises';
import * as path from 'path';
import { PHASE_ORDER } from './schema-v3.0.0';
import { scanTreeStructure } from './tree-scanner';
import { ErrorCode, TreeStructureError } from '../shared/errors';
/**
 * 依赖状态检查器
 *
 * 支持跨子树依赖解析，处理嵌套特征的依赖关系
 *
 * 检查规则:
 * - 状态前进时：检查所有依赖 Feature 的 phase ≥ 当前 phase
 * - 状态回退时：警告检查被依赖 Feature 的状态
 */
export class DependencyChecker {
    stateMachine;
    specsDir;
    // 缓存机制
    cache = new Map();
    cacheExpiry = 5000; // 5 秒缓存过期
    lastCacheUpdate = 0;
    constructor(stateMachine, specsDir = '.sddu/specs-tree-root') {
        this.stateMachine = stateMachine;
        this.specsDir = specsDir;
    }
    /**
     * 清除缓存
     */
    clearCache() {
        this.cache.clear();
        this.lastCacheUpdate = 0;
    }
    /**
     * 使用 TreeScanner 扫描所有 Features 状态并构建依赖图，支持嵌套结构
     */
    async scanAllFeatures() {
        const now = Date.now();
        // 检查缓存是否有效
        if (this.cache.size > 0 && now - this.lastCacheUpdate < this.cacheExpiry) {
            return this.cache;
        }
        const features = new Map();
        try {
            // Use TreeScanner to find all features in nested structure
            const treeStructure = await scanTreeStructure(this.specsDir);
            for (const [featurePath, _] of treeStructure.flatMap.entries()) {
                try {
                    const stateFile = path.join(featurePath, 'state.json');
                    // Extract feature id from the path
                    const pathComponents = featurePath.split(/[\/\\]/);
                    const featureId = pathComponents[pathComponents.length - 1];
                    // Read the state file
                    const stateContent = await fs.readFile(stateFile, 'utf-8');
                    const state = JSON.parse(stateContent);
                    features.set(featurePath, {
                        featureId,
                        featureName: state.name || state.feature || featureId,
                        featurePath,
                        phase: state.phase || 'registered', // 🆕 v3.0.0: direct phase, no mapping needed
                        status: state.status || 'tracked',
                        dependencies: state.dependencies?.on || []
                    });
                }
                catch (error) {
                    // state.json 不存在或格式错误，跳过
                    console.warn(`无法读取 Feature 路径 ${featurePath} 的状态文件:`, error.message);
                }
            }
            // 更新缓存
            this.cache = features;
            this.lastCacheUpdate = now;
        }
        catch (error) {
            console.error('扫描嵌套 Features 失败:', error);
            if (error instanceof TreeStructureError) {
                throw error;
            }
            else {
                throw new TreeStructureError(ErrorCode.TREE_SCAN_FAILED, `Failed to scan nested features: ${error.message}`);
            }
        }
        return features;
    }
    /**
     * 检查 Feature 状态前进的依赖 - 支持跨子树依赖
     *
     * 规则: 所有依赖 Feature 的 phase 必须 ≥ 目标 phase
     */
    async checkDependenciesForStateChange(featurePath, // Full path to the feature in the tree
    targetPhase // 🆕 v3.0.0: Phase instead of FeatureStateEnum
    ) {
        const features = await this.scanAllFeatures();
        const feature = features.get(featurePath);
        if (!feature) {
            return {
                allowed: true,
                reason: 'Feature 不存在于状态文件中，跳过依赖检查'
            };
        }
        const blockingFeatures = [];
        const warnings = [];
        // 检查所有依赖 Feature
        for (const dependencyPath of feature.dependencies) {
            const depFeature = features.get(dependencyPath);
            // If dependency isn't found at the given path, try to resolve from the map
            if (!depFeature) {
                const resolvedDep = this.resolveDependencyPath(features, dependencyPath, featurePath);
                if (!resolvedDep) {
                    warnings.push(`依赖的 Feature ${dependencyPath} 不存在`);
                    continue;
                }
            }
            const resolvedDep = features.get(dependencyPath) || this.tryMatchDepInTree(features, dependencyPath, featurePath);
            if (!resolvedDep) {
                warnings.push(`依赖的 Feature ${dependencyPath} 不存在或未找到`);
                continue;
            }
            // Check if the dependency meets phase requirements for the target phase
            if (!this.isPhaseReady(resolvedDep.phase, targetPhase)) {
                blockingFeatures.push({
                    featureId: resolvedDep.featureId,
                    featureName: resolvedDep.featureName,
                    currentPhase: resolvedDep.phase,
                    requiredPhase: targetPhase
                });
            }
        }
        // If there are blocking dependencies, disallow changing state
        if (blockingFeatures.length > 0) {
            return {
                allowed: false,
                reason: `存在 ${blockingFeatures.length} 个未就绪的依赖 Feature`,
                blockingFeatures,
                warnings: warnings.length > 0 ? warnings : undefined
            };
        }
        // Check passed
        return {
            allowed: true,
            warnings: warnings.length > 0 ? warnings : undefined
        };
    }
    /**
     * Attempt to find the dependency in the tree structure based on partial identifiers
     */
    tryMatchDepInTree(features, depIdentifier, currentFeaturePath) {
        // First, try perfect match in the path
        for (const [featPath, info] of features) {
            if (featPath.includes(depIdentifier) || info.featureId.includes(depIdentifier) || info.featureName.includes(depIdentifier)) {
                return info;
            }
            // Try to match by comparing paths in a hierarchical way
            const currentPathParts = currentFeaturePath.split(/[\/\\]/);
            const candidatePathParts = featPath.split(/[\/\\]/);
            if (featPath !== currentFeaturePath) {
                if (this.isSameParentDirectory(currentPathParts, candidatePathParts)) {
                    if (info.featureId === depIdentifier || info.featureName === depIdentifier) {
                        return info;
                    }
                }
            }
        }
        return undefined;
    }
    /**
     * Check if two paths share same parent directory
     */
    isSameParentDirectory(pathA, pathB) {
        if (pathA.length < 2 || pathB.length < 2)
            return false;
        const parentPathA = pathA.slice(0, pathA.length - 1).join('/');
        const parentPathB = pathB.slice(0, pathB.length - 1).join('/');
        return parentPathA === parentPathB;
    }
    /**
     * Resolve dependency path in relation to current feature (for cross-tree references)
     */
    resolveDependencyPath(features, depId, currentFeaturePath) {
        // Direct lookup first
        const directMatch = features.get(depId);
        if (directMatch)
            return directMatch;
        // Try to find the feature by featureId in paths
        for (const [featPath, featureInfo] of features.entries()) {
            if (featPath.includes(depId) || featureInfo.featureId === depId || featureInfo.featureName === depId) {
                return featureInfo;
            }
        }
        return undefined;
    }
    /**
     * 检查状态回退的警告 - 考虑交叉树依赖
     */
    async checkStateRollbackWarnings(featurePath, fromPhase, toPhase) {
        const features = await this.scanAllFeatures();
        const warnings = [];
        // 查找所有依赖当前 Feature 的其他 Feature
        for (const [otherPath, otherFeature] of features) {
            if (otherPath === featurePath)
                continue;
            // Check if this other feature depends on the current feature
            const dependsOnCurrent = otherFeature.dependencies.some(dep => dep === featurePath || dep === features.get(featurePath)?.featureId || dep.includes(featurePath.split('/').pop() || ''));
            if (dependsOnCurrent) {
                // 检查依赖者的 phase 是否高于目标 phase
                if (this.isPhaseHigher(otherFeature.phase, toPhase)) {
                    warnings.push(`Feature 路径 ${otherPath} 依赖此 Feature，` +
                        `且当前 phase 为 ${otherFeature.phase}，回退 phase ${toPhase} 可能影响依赖项`);
                }
            }
        }
        return warnings;
    }
    /**
     * 检测循环依赖，覆盖嵌套结构
     */
    async detectCircularDependencies() {
        const features = await this.scanAllFeatures();
        const cycles = [];
        const visited = new Set();
        const recursionStack = new Set();
        const dfs = (featurePath, pathStack) => {
            if (recursionStack.has(featurePath)) {
                // 发现循环
                const cycleStart = pathStack.indexOf(featurePath);
                const cycle = pathStack.slice(cycleStart);
                cycle.push(featurePath);
                cycles.push(cycle);
                return;
            }
            if (visited.has(featurePath))
                return;
            visited.add(featurePath);
            recursionStack.add(featurePath);
            pathStack.push(featurePath);
            const feature = features.get(featurePath);
            if (feature) {
                for (const depPath of feature.dependencies) {
                    let resolvedDepPath = features.get(depPath)?.featurePath || depPath;
                    if (!features.has(resolvedDepPath) && depPath !== resolvedDepPath) {
                        resolvedDepPath = depPath;
                    }
                    dfs(resolvedDepPath, [...pathStack]);
                }
            }
            recursionStack.delete(featurePath);
        };
        for (const featurePath of features.keys()) {
            dfs(featurePath, []);
        }
        return cycles;
    }
    /**
     * 获取阻塞当前 Feature 的列表
     */
    async getBlockingFeatures(featurePath) {
        const features = await this.scanAllFeatures();
        const feature = features.get(featurePath);
        const blocking = [];
        if (!feature)
            return blocking;
        for (const depPath of feature.dependencies) {
            const resolvedDep = features.get(depPath) || this.tryMatchDepInTree(features, depPath, featurePath);
            if (resolvedDep) {
                blocking.push({
                    featureId: resolvedDep.featureId,
                    featureName: resolvedDep.featureName,
                    phase: resolvedDep.phase
                });
            }
        }
        return blocking;
    }
    /**
     * 获取被当前 Feature 阻塞的列表
     */
    async getBlockedByFeatures(featurePath) {
        const features = await this.scanAllFeatures();
        const blocked = [];
        for (const [otherPath, otherFeature] of features) {
            if (otherPath === featurePath)
                continue;
            const isCurrentlyDependent = otherFeature.dependencies.some(dep => dep === featurePath || dep.includes(featurePath.split('/').pop() || ''));
            if (isCurrentlyDependent) {
                blocked.push({
                    featureId: otherFeature.featureId,
                    featureName: otherFeature.featureName,
                    phase: otherFeature.phase
                });
            }
        }
        return blocked;
    }
    /**
     * 辅助函数：检查依赖 phase 是否就绪（≥ 目标 phase）
     * Uses PHASE_ORDER from schema-v3.0.0 for comparison.
     */
    isPhaseReady(currentPhase, targetPhase) {
        const currentOrder = PHASE_ORDER[currentPhase] ?? 0;
        const targetOrder = PHASE_ORDER[targetPhase] ?? 0;
        return currentOrder >= targetOrder;
    }
    /**
     * 辅助函数：检查 phase 是否更高
     * Uses PHASE_ORDER from schema-v3.0.0 for comparison.
     */
    isPhaseHigher(phase1, phase2) {
        const order1 = PHASE_ORDER[phase1] ?? 0;
        const order2 = PHASE_ORDER[phase2] ?? 0;
        return order1 > order2;
    }
    /**
     * 获取依赖关系可视化数据
     */
    async getDependencyVisualization() {
        const features = await this.scanAllFeatures();
        const nodes = [];
        const edges = [];
        for (const [featurePath, feature] of features) {
            nodes.push({
                id: featurePath,
                label: `${feature.featureName} (${featurePath.split('/').pop()})`,
                phase: feature.phase
            });
            for (const depPath of feature.dependencies) {
                let resolvedDepPath = depPath;
                const depMatch = this.tryMatchDepInTree(features, depPath, featurePath);
                if (depMatch) {
                    resolvedDepPath = depMatch.featurePath;
                }
                edges.push({
                    from: featurePath,
                    to: resolvedDepPath
                });
            }
        }
        return { nodes, edges };
    }
}
