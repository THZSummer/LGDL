import { Phase, FeatureStatus, StateV3_0_0 } from './schema-v3.0.0';
import { DependencyChecker } from './dependency-checker';
import { StateLoader } from './state-loader';
export { DependencyChecker, StateLoader };
/** Phase 回退错误 — Phase 流转单向不可逆 */
export declare class PhaseReversalError extends Error {
    currentPhase: Phase;
    targetPhase: Phase;
    constructor(currentPhase: Phase, targetPhase: Phase);
}
/** Phase 跳跃错误 — Phase 必须按序推进 */
export declare class PhaseSkipError extends Error {
    currentPhase: Phase;
    targetPhase: Phase;
    missingPhases: Phase[];
    constructor(currentPhase: Phase, targetPhase: Phase, missingPhases: Phase[]);
}
/**
 * @deprecated Use `Phase` from schema-v3.0.0 instead.
 * Kept for compilation compatibility until TASK-005/010/011 migrate all consumers.
 * ├── Old SdduPhase (v2.x): drafting → discovered → specified → planned → tasked → implementing → reviewed → validated → completed
 * └── New Phase (v3.0.0):  registered → discovered → specified → planned → tasked → builded → reviewed → validated
 */
export type FeatureStateEnum = 'drafting' | 'discovered' | 'specified' | 'planned' | 'tasked' | 'implementing' | 'reviewed' | 'validated' | 'completed';
export interface FeatureState {
    id: string;
    name: string;
    phase: Phase;
    status: FeatureStatus;
    createdAt: string;
    updatedAt: string;
    tasks?: any[];
}
export interface TransitionResult {
    allowed: boolean;
    current?: Phase;
    target?: Phase;
    reason?: string;
    allowedTargets?: Phase[];
    missingStages?: {
        phase: Phase;
        name: string;
    }[];
    missingFiles?: string[];
    presentFiles?: string[];
}
export interface AgentTransitionHook {
    onTransitionStart?(featureId: string, targetPhase: Phase): void;
    onTransitionComplete?(featureId: string, previousPhase: Phase, newPhase: Phase, triggeredBy?: string, comment?: string): void;
    onError?(error: any, featureId?: string, targetPhase?: string): void;
}
export interface AutoUpdaterIntegration {
    onFileChange?(filePath: string): void;
    onSessionIdle?(): void;
}
export interface HistoryEntry {
    timestamp: string;
    from: Phase;
    to: Phase;
    triggeredBy: string;
    actor?: string;
    comment?: string;
}
export interface FeatureWithFullHistory extends StateV3_0_0 {
    id: string;
    name: string;
    tasks?: any[];
}
export declare class StateMachine {
    private stateLoader;
    private specsDir;
    private dependencyChecker?;
    private agentHook?;
    constructor(specsDir?: string);
    setAgentHook(hook: AgentTransitionHook): void;
    setDependencyChecker(checker: DependencyChecker): void;
    load(featurePath?: string): Promise<StateV3_0_0>;
    save(): Promise<void>;
    /**
     * 创建 Feature — 默认 phase: 'registered', status: 'tracked'
     */
    createFeature(name: string, featurePath: string): Promise<FeatureWithFullHistory>;
    /**
     * 获取 Feature 当前状态
     */
    getState(featurePath: string): Promise<FeatureWithFullHistory | undefined>;
    /**
     * 获取所有 Feature
     */
    getAllFeatures(): Promise<FeatureWithFullHistory[]>;
    /**
     * 判断是否为父特性（有子特性）
     */
    isParentFeature(featurePath: string): Promise<boolean>;
    /**
     * 获取当前 phase
     */
    getCurrentPhase(featurePath: string): Promise<Phase | null>;
    /**
     * 验证 phase 推进是否合法（单向，不可回退或跳跃）
     */
    validatePhaseTransition(currentPhase: Phase, targetPhase: Phase): {
        valid: boolean;
        reason?: string;
        missingPhases?: Phase[];
    };
    /**
     * 获取缺失的前置阶段
     */
    getMissingPhases(currentPhase: Phase, targetPhase: Phase): Phase[];
    /**
     * 检查所需文件是否存在（区分父/叶子特性）
     */
    checkRequiredFiles(featurePath: string, targetPhase: Phase, isParent?: boolean): Promise<{
        valid: boolean;
        missing: string[];
        present?: string[];
        reason?: string;
    }>;
    /**
     * 完整的阶段跳转验证（核心方法）
     */
    validateStageTransition(featurePath: string, targetPhase: Phase): Promise<TransitionResult>;
    /**
     * 更新 Feature phase（带验证 + FR-006 自动完成 + hooks）
     */
    updateState(featurePath: string, targetPhase: Phase, data?: any, triggeredBy?: string, comment?: string, skipValidation?: boolean, isParent?: boolean): Promise<FeatureWithFullHistory>;
    /**
     * 获取下一步推荐 phase（仅 tracked 且未到 validated 时）
     * 返回值: { phase: Phase; action: string } | null
     */
    getNextStep(featurePath: string): Promise<{
        phase: Phase;
        action: string;
    } | null>;
}
