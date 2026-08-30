import * as fs from 'fs/promises';
import * as path from 'path';
import { PHASE_ORDER } from './schema-v3.0.0';
import { scanTreeStructure } from './tree-scanner';
/**
 * 自动状态更新器
 * 监听文件变化并自动更新 Feature 状态
 *
 * v3.0.0: Uses Phase directly instead of the deprecated FeatureStateEnum.
 * Skips features whose status is not 'tracked' (FR-003).
 */
export class AutoUpdater {
    stateMachine;
    debounceTimer = null;
    debounceDelay = 5000; // 5秒防抖延迟
    enabled = true;
    specsDir;
    // 关键文件列表，用于确定 Feature phase
    // Maps phase → required files to deem a feature at that phase
    keyFiles = {
        'registered': [], // 空状态或刚创建
        'discovered': ['discovery.md'], // 包含发现文档
        'specified': ['spec.md'], // spec.md 存在
        'planned': ['spec.md', 'plan.md'], // spec.md 和 plan.md 存在
        'tasked': ['spec.md', 'plan.md', 'tasks.md'], // spec.md, plan.md, tasks.md 存在
        'builded': ['spec.md', 'plan.md', 'tasks.md'], // 实现期间保持 tasked 文件
        'reviewed': ['spec.md', 'plan.md', 'tasks.md'], // review 是过程状态，保留原始文件
        'validated': ['spec.md', 'plan.md', 'tasks.md', 'validation.md'], // 有验证文件
    };
    constructor(stateMachine) {
        this.stateMachine = stateMachine;
        this.specsDir = stateMachine['specsDir'];
    }
    /**
     * 启用/禁用自动更新器
     */
    setEnabled(enabled) {
        this.enabled = enabled;
    }
    /**
     * 启用防抖以避免频繁更新
     */
    debouncedUpdate(targetPath) {
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }
        this.debounceTimer = setTimeout(() => {
            this.scanAndAutoUpdate(targetPath).catch(error => {
                console.error('AutoUpdater scan error:', error);
            });
        }, this.debounceDelay);
    }
    /**
     * 扫描并自动更新相关的 Feature 状态 - 支持嵌套路径
     */
    async scanAndAutoUpdate(targetPath) {
        if (!this.enabled) {
            return;
        }
        try {
            console.log(`AutoUpdater: 开始扫描 ${targetPath || '所有目录'} 的状态变更`);
            let featuresToCheck = [];
            if (targetPath) {
                // Extract feature path correctly for nested structures
                const pathParts = targetPath.split(/[\/\\]specs-tree-/);
                if (pathParts.length > 1) {
                    const fullRelativePath = pathParts.slice(1).join('specs-tree-');
                    if (targetPath.includes('specs-tree-')) {
                        const treeStructure = await scanTreeStructure(this.specsDir);
                        const potentialPaths = Array.from(treeStructure.flatMap.keys()).sort((a, b) => {
                            return b.length - a.length;
                        });
                        for (const featurePath of potentialPaths) {
                            if (targetPath.startsWith(featurePath)) {
                                featuresToCheck = [featurePath];
                                break;
                            }
                        }
                    }
                }
                else {
                    featuresToCheck = await this.getAllFeatureIds();
                }
            }
            else {
                featuresToCheck = await this.getAllFeatureIds();
            }
            // Check each feature that needs to be checked for state updates
            for (const featurePath of featuresToCheck) {
                await this.updateFeatureStatusForFileChanges(featurePath);
            }
        }
        catch (error) {
            console.error('AutoUpdater 扫描失败:', error);
        }
    }
    /**
     * 使用 TreeScanner 来获取所有 Feature 路径列表 - 支持嵌套结构
     */
    async getAllFeatureIds() {
        try {
            const treeResult = await scanTreeStructure(this.specsDir);
            const featurePaths = Array.from(treeResult.flatMap.keys());
            console.log(`Found features: ${featurePaths.join(', ')}`);
            return featurePaths;
        }
        catch (error) {
            console.error('获取 Features 列表失败:', error);
            return [];
        }
    }
    /**
     * 推断给定 Feature 目录中的最新 phase
     */
    async inferCurrentPhaseFromFiles(featurePath) {
        try {
            const dirContents = await fs.readdir(featurePath);
            // Check phases from highest to lowest (most complete first)
            const stateOrder = [
                'validated', 'reviewed', 'builded', 'tasked', 'planned',
                'specified', 'discovered', 'registered'
            ];
            for (const phase of stateOrder) {
                const requiredFiles = this.keyFiles[phase] || [];
                const missingFiles = await this.checkMissingFiles(featurePath, requiredFiles);
                if (missingFiles.length === 0 && phase !== 'builded' && phase !== 'reviewed') {
                    return phase;
                }
                // For builded and reviewed special states, check if base files exist
                if (phase === 'builded' || phase === 'reviewed') {
                    const basicRequiredFiles = this.keyFiles['tasked'] || [];
                    const basicMissing = await this.checkMissingFiles(featurePath, basicRequiredFiles);
                    if (basicMissing.length === 0) {
                        return phase;
                    }
                }
            }
            // Check if directory contains a discovery doc but no spec → discovered
            const hasDiscoveryDoc = dirContents.some(f => f === 'discovery.md');
            if (hasDiscoveryDoc) {
                return 'discovered';
            }
            // Check for spec-like files
            if (dirContents.some(f => f.includes('spec'))) {
                return 'specified';
            }
            // Default to registered if directory exists but has no characteristic files
            if (await this.isFeatureDirectory(featurePath)) {
                return 'registered';
            }
            return null;
        }
        catch (error) {
            if (error.code === 'ENOENT') {
                console.log(`Feature 目录不存在: ${featurePath}`);
                return null;
            }
            console.error(`无法推断 Feature ${featurePath} 的 phase:`, error);
            return null;
        }
    }
    /**
     * 检查 Feature 目录下是否有任何相关文件
     */
    async isFeatureDirectory(dirPath) {
        try {
            const contents = await fs.readdir(dirPath);
            const relevantFiles = contents.filter(file => file.endsWith('.md') ||
                file === 'src' ||
                file === 'tests' ||
                file === 'package.json');
            return relevantFiles.length > 0;
        }
        catch (error) {
            return false;
        }
    }
    /**
     * 检查给定目录中缺失的文件
     */
    async checkMissingFiles(dir, requiredFiles) {
        const missing = [];
        for (const file of requiredFiles) {
            try {
                await fs.access(path.join(dir, file));
            }
            catch {
                missing.push(file);
            }
        }
        return missing;
    }
    /**
     * 为文件变化更新单个 Feature 的 phase
     *
     * FR-003: Skips features whose status is NOT 'tracked'.
     */
    async updateFeatureStatusForFileChanges(featurePath) {
        try {
            const pathComponents = featurePath.split(/[\/\\]/);
            const actualFeatureName = featurePath.split(/[\/\\]specs-tree-/).pop()?.split(/[\/\\]/)[0] || featurePath;
            // FR-003: Get current state and skip if status is not 'tracked'
            const currentStateObj = await this.stateMachine.getState(featurePath);
            if (currentStateObj && currentStateObj.status !== 'tracked') {
                console.log(`AutoUpdater: 跳过非 tracked 特性 ${actualFeatureName} (status=${currentStateObj.status})`);
                return;
            }
            // 从文件系统推理当前 phase
            const inferredPhase = await this.inferCurrentPhaseFromFiles(featurePath);
            if (inferredPhase === null) {
                console.log(`无法为路径 ${featurePath} 推断新的 phase，跳过更新`);
                return;
            }
            // Get current phase
            const currentPhase = currentStateObj ? currentStateObj.phase : 'registered';
            // 检查 phase 是否真的发生了改变
            if (currentPhase === inferredPhase) {
                console.log(`Feature ${actualFeatureName} phase 未发生改变 (${currentPhase})，跳过更新`);
                return;
            }
            // 检查是否是父级特征
            const isParent = await this.stateMachine.isParentFeature(featurePath);
            if (isParent && this.phaseRequiresAdvancedHandling(inferredPhase)) {
                console.log(`跳过高级 phase 更新 ${inferredPhase} 对于父级 feature ${actualFeatureName}，仅允许规格/规划级状态`);
                return;
            }
            // 检查 phase 转换是否合理（仅允许向前推进）
            if (this.shouldUpdatePhase(currentPhase, inferredPhase)) {
                console.log(`AutoUpdater: 更新 Feature ${actualFeatureName} 从 ${currentPhase} 到 ${inferredPhase} (路径: ${featurePath})`);
                await this.stateMachine.updateState(featurePath, inferredPhase, {}, 'auto-updater', `自动检测到 phase 从 ${currentPhase} 到 ${inferredPhase}`, false, isParent);
            }
            else {
                console.log(`Phase 变化无效，跳过更新: ${actualFeatureName} 从 ${currentPhase} 到 ${inferredPhase}`);
            }
        }
        catch (error) {
            console.error(`自动更新 Feature 路径 ${featurePath} 状态失败:`, error);
        }
    }
    /**
     * Checks if phase requires advanced handling (not allowed for parent features)
     */
    phaseRequiresAdvancedHandling(phase) {
        return ['builded', 'reviewed', 'validated'].includes(phase);
    }
    /**
     * 判断是否应该执行 phase 更新
     * 使用 PHASE_ORDER 进行有序比较，仅允许正向推进
     */
    shouldUpdatePhase(currentPhase, targetPhase) {
        if (currentPhase === targetPhase) {
            return false;
        }
        const currentOrder = PHASE_ORDER[currentPhase] ?? -1;
        const targetOrder = PHASE_ORDER[targetPhase] ?? -1;
        return targetOrder > currentOrder; // 仅当目标 phase 高于当前 phase 时才更新
    }
    /**
     * 监听指定目录的文件变更事件
     * 在实际环境中，这个方法会被 VSCode 文件更改事件驱动
     */
    listenForChanges(dirPath) {
        console.log('AutoUpdater: 准备监听文件变更...');
    }
    /**
     * 触发自动更新检查（供外部事件处理器使用）
     */
    triggerAutoUpdate(targetPath) {
        if (!this.enabled) {
            console.log('AutoUpdater: 已禁用，跳过触发');
            return;
        }
        console.log(`AutoUpdater: 检测到文件变更，准备扫描${targetPath ? ` @ ${targetPath}` : ''}`);
        this.debouncedUpdate(targetPath);
    }
    /**
     * 清理资源：取消所有待处理的定时器
     */
    dispose() {
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
            this.debounceTimer = null;
        }
    }
}
