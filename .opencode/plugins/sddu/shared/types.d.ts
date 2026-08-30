/**
 * Agent 元数据接口，用于动态 Agent 注册
 */
export interface AgentMetadata {
    name: string;
    description: string;
    mode: string;
    promptFile: string;
}
/**
 * SDDU 配置选项接口
 * 统一配置接口，便于扩展
 */
export interface SdduConfig {
    autoUpdateState?: boolean;
    enableDiscovery?: boolean;
    logLevel?: 'debug' | 'info' | 'warn' | 'error';
    defaultTimeout?: number;
    maxRetries?: number;
    enableTreeStructure?: boolean;
    maxTreeDepth?: number;
}
/** @deprecated Use `Phase` from v3.0.0 instead. `WorkflowStatus` was the old 6-state schema. */
export type WorkflowStatus = 'specified' | 'planned' | 'tasked' | 'implementing' | 'reviewed' | 'validated';
/** @deprecated Use `PhaseHistoryEntry` from v3.0.0 instead. */
export type PhaseHistory = Array<{
    phase: string;
    timestamp: string;
    triggeredBy: string;
    comment?: string;
}>;
