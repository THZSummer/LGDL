import { StateMachine } from './machine';
import { Phase } from './schema-v3.0.0';
/**
 * 自动状态更新器
 * 监听文件变化并自动更新 Feature 状态
 *
 * v3.0.0: Uses Phase directly instead of the deprecated FeatureStateEnum.
 * Skips features whose status is not 'tracked' (FR-003).
 */
export declare class AutoUpdater {
    private stateMachine;
    private debounceTimer;
    private readonly debounceDelay;
    private enabled;
    private specsDir;
    private readonly keyFiles;
    constructor(stateMachine: StateMachine);
    /**
     * 启用/禁用自动更新器
     */
    setEnabled(enabled: boolean): void;
    /**
     * 启用防抖以避免频繁更新
     */
    private debouncedUpdate;
    /**
     * 扫描并自动更新相关的 Feature 状态 - 支持嵌套路径
     */
    scanAndAutoUpdate(targetPath?: string): Promise<void>;
    /**
     * 使用 TreeScanner 来获取所有 Feature 路径列表 - 支持嵌套结构
     */
    getAllFeatureIds(): Promise<string[]>;
    /**
     * 推断给定 Feature 目录中的最新 phase
     */
    inferCurrentPhaseFromFiles(featurePath: string): Promise<Phase | null>;
    /**
     * 检查 Feature 目录下是否有任何相关文件
     */
    private isFeatureDirectory;
    /**
     * 检查给定目录中缺失的文件
     */
    private checkMissingFiles;
    /**
     * 为文件变化更新单个 Feature 的 phase
     *
     * FR-003: Skips features whose status is NOT 'tracked'.
     */
    private updateFeatureStatusForFileChanges;
    /**
     * Checks if phase requires advanced handling (not allowed for parent features)
     */
    private phaseRequiresAdvancedHandling;
    /**
     * 判断是否应该执行 phase 更新
     * 使用 PHASE_ORDER 进行有序比较，仅允许正向推进
     */
    private shouldUpdatePhase;
    /**
     * 监听指定目录的文件变更事件
     * 在实际环境中，这个方法会被 VSCode 文件更改事件驱动
     */
    listenForChanges(dirPath?: string): void;
    /**
     * 触发自动更新检查（供外部事件处理器使用）
     */
    triggerAutoUpdate(targetPath?: string): void;
    /**
     * 清理资源：取消所有待处理的定时器
     */
    dispose(): void;
}
