import { StateMachine } from './machine';
import { Phase } from './schema-v3.0.0';
/**
 * 依赖检查结果
 */
export interface DependencyCheckResult {
    allowed: boolean;
    reason?: string;
    blockingFeatures?: Array<{
        featureId: string;
        featureName: string;
        currentPhase: Phase;
        requiredPhase: Phase;
    }>;
    warnings?: string[];
}
/**
 * Feature 状态信息 (v3.0.0)
 */
export interface FeatureStateInfo {
    featureId: string;
    featureName: string;
    featurePath: string;
    phase: Phase;
    status: string;
    dependencies: string[];
}
/**
 * 依赖状态检查器
 *
 * 支持跨子树依赖解析，处理嵌套特征的依赖关系
 *
 * 检查规则:
 * - 状态前进时：检查所有依赖 Feature 的 phase ≥ 当前 phase
 * - 状态回退时：警告检查被依赖 Feature 的状态
 */
export declare class DependencyChecker {
    private stateMachine;
    private specsDir;
    private cache;
    private cacheExpiry;
    private lastCacheUpdate;
    constructor(stateMachine: StateMachine, specsDir?: string);
    /**
     * 清除缓存
     */
    clearCache(): void;
    /**
     * 使用 TreeScanner 扫描所有 Features 状态并构建依赖图，支持嵌套结构
     */
    scanAllFeatures(): Promise<Map<string, FeatureStateInfo>>;
    /**
     * 检查 Feature 状态前进的依赖 - 支持跨子树依赖
     *
     * 规则: 所有依赖 Feature 的 phase 必须 ≥ 目标 phase
     */
    checkDependenciesForStateChange(featurePath: string, // Full path to the feature in the tree
    targetPhase: Phase): Promise<DependencyCheckResult>;
    /**
     * Attempt to find the dependency in the tree structure based on partial identifiers
     */
    private tryMatchDepInTree;
    /**
     * Check if two paths share same parent directory
     */
    private isSameParentDirectory;
    /**
     * Resolve dependency path in relation to current feature (for cross-tree references)
     */
    private resolveDependencyPath;
    /**
     * 检查状态回退的警告 - 考虑交叉树依赖
     */
    checkStateRollbackWarnings(featurePath: string, fromPhase: Phase, toPhase: Phase): Promise<string[]>;
    /**
     * 检测循环依赖，覆盖嵌套结构
     */
    detectCircularDependencies(): Promise<Array<string[]>>;
    /**
     * 获取阻塞当前 Feature 的列表
     */
    getBlockingFeatures(featurePath: string): Promise<Array<{
        featureId: string;
        featureName: string;
        phase: Phase;
    }>>;
    /**
     * 获取被当前 Feature 阻塞的列表
     */
    getBlockedByFeatures(featurePath: string): Promise<Array<{
        featureId: string;
        featureName: string;
        phase: Phase;
    }>>;
    /**
     * 辅助函数：检查依赖 phase 是否就绪（≥ 目标 phase）
     * Uses PHASE_ORDER from schema-v3.0.0 for comparison.
     */
    private isPhaseReady;
    /**
     * 辅助函数：检查 phase 是否更高
     * Uses PHASE_ORDER from schema-v3.0.0 for comparison.
     */
    private isPhaseHigher;
    /**
     * 获取依赖关系可视化数据
     */
    getDependencyVisualization(): Promise<{
        nodes: Array<{
            id: string;
            label: string;
            phase: Phase;
        }>;
        edges: Array<{
            from: string;
            to: string;
        }>;
    }>;
}
