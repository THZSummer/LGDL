/**
 * SDDU 统一错误处理系统 — 零平台依赖，零业务域依赖
 * 可被所有业务域和 adapters 安全引用
 */
export declare enum ErrorCode {
    STATE_INVALID_TRANSITION = "STATE_INVALID_TRANSITION",// 无效的状态迁移
    STATE_VALIDATION_FAILED = "STATE_VALIDATION_FAILED",// 状态验证失败
    STATE_FILE_NOT_FOUND = "STATE_FILE_NOT_FOUND",// 状态文件未找到
    STATE_LOAD_ERROR = "STATE_LOAD_ERROR",// 状态加载错误
    STATE_SAVE_ERROR = "STATE_SAVE_ERROR",// 状态保存错误
    STATE_MISSING_DEPENDENCY = "STATE_MISSING_DEPENDENCY",// 状态依赖缺失
    TREE_SCAN_FAILED = "TREE_SCAN_FAILED",// 树扫描失败
    TREE_DEPTH_EXCEEDED = "TREE_DEPTH_EXCEEDED",// 树深度超出限制
    CROSS_TREE_DEP_NOT_FOUND = "CROSS_TREE_DEP_NOT_FOUND",// 跨树依赖未找到
    PARENT_STATE_UPDATE_FAILED = "PARENT_STATE_UPDATE_FAILED",// 父级状态更新失败
    DISCOVERY_STEP_EXECUTION_FAILED = "DISCOVERY_STEP_EXECUTION_FAILED",// 发现步骤执行失败
    DISCOVERY_CONTEXT_INVALID = "DISCOVERY_CONTEXT_INVALID",// 发现上下文无效
    DISCOVERY_CONFIG_MISSING = "DISCOVERY_CONFIG_MISSING",// 发现配置缺失
    DISCOVERY_RESULT_INVALID = "DISCOVERY_RESULT_INVALID",// 发现结果无效
    DISCOVERY_STEP_NOT_FOUND = "DISCOVERY_STEP_NOT_FOUND",// 发现步骤未找到
    TOOL_ARGUMENT_INVALID = "TOOL_ARGUMENT_INVALID",// 工具参数无效
    TOOL_FILE_OPERATION_FAILED = "TOOL_FILE_OPERATION_FAILED",// 文件操作失败
    TOOL_PARSE_ERROR = "TOOL_PARSE_ERROR",// 解析错误
    TOOL_EXECUTE_ERROR = "TOOL_EXECUTE_ERROR",// 执行错误
    TOOL_TIMEOUT_ERROR = "TOOL_TIMEOUT_ERROR",// 工具超时错误
    AGENT_NOT_FOUND = "AGENT_NOT_FOUND",// Agent 未找到
    AGENT_ALREADY_REGISTERED = "AGENT_ALREADY_REGISTERED",// Agent 已注册
    AGENT_REGISTRATION_FAILED = "AGENT_REGISTRATION_FAILED",// Agent 注册失败
    AGENT_EXECUTION_ERROR = "AGENT_EXECUTION_ERROR",// Agent 执行错误
    AGENT_CONFIGURATION_ERROR = "AGENT_CONFIGURATION_ERROR",// Agent 配置错误
    FILE_READ_ERROR = "FILE_READ_ERROR",// 文件读取错误
    FILE_WRITE_ERROR = "FILE_WRITE_ERROR",// 文件写入错误
    FILE_ACCESS_DENIED = "FILE_ACCESS_DENIED",// 文件访问被拒
    FILE_NOT_EXIST = "FILE_NOT_EXIST",// 文件不存在
    FILE_FORMAT_INVALID = "FILE_FORMAT_INVALID"
}
export interface ErrorContext {
    code: ErrorCode;
    details?: Record<string, any>;
    stack?: string;
    timestamp: string;
    component?: string;
    userId?: string;
    sessionId?: string;
}
/**
 * SDDU 基础错误类
 * 所有 SDDU 错误类的基类
 */
export declare class SdduError extends Error {
    readonly code: ErrorCode;
    readonly context: ErrorContext;
    readonly isSdduError = true;
    constructor(message: string, context: ErrorContext);
    /**
     * 获取错误的详细信息
     */
    toDetailedString(): string;
}
export declare class StateError extends SdduError {
    constructor(code: ErrorCode, message: string, details?: Record<string, any>);
}
/**
 * 发现阶段错误
 */
export declare class DiscoveryError extends SdduError {
    constructor(code: ErrorCode, message: string, details?: Record<string, any>);
}
/**
 * 工具函数错误
 */
export declare class ToolError extends SdduError {
    constructor(code: ErrorCode, message: string, details?: Record<string, any>);
}
/**
 * Agent 错误
 */
export declare class AgentError extends SdduError {
    constructor(code: ErrorCode, message: string, details?: Record<string, any>);
}
/**
 * 配置相关错误
 */
export declare class ConfigError extends SdduError {
    constructor(code: ErrorCode, message: string, details?: Record<string, any>);
}
/**
 * 树结构相关错误
 */
export declare class TreeStructureError extends SdduError {
    constructor(code: ErrorCode, message: string, details?: Record<string, any>);
}
/**
 * 错误处理器
 * 提供标准化的错误处理方式
 */
export declare class ErrorHandler {
    /**
     * 根据错误类型执行不同的处理策略
     */
    static handle(error: unknown, defaultSeverity?: 'warn' | 'error'): SdduError | Error;
    /**
     * 记录错误日志
     */
    private static logError;
}
/**
 * 格式化错误信息
 */
export declare function formatErrorMessage(error: SdduError): string;
export default ErrorHandler;
