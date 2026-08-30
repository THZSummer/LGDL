/**
 * SDDU 统一错误处理系统 — 零平台依赖，零业务域依赖
 * 可被所有业务域和 adapters 安全引用
 */
// 错误代码枚举，分类管理各种错误
export var ErrorCode;
(function (ErrorCode) {
    // 状态管理相关错误
    ErrorCode["STATE_INVALID_TRANSITION"] = "STATE_INVALID_TRANSITION";
    ErrorCode["STATE_VALIDATION_FAILED"] = "STATE_VALIDATION_FAILED";
    ErrorCode["STATE_FILE_NOT_FOUND"] = "STATE_FILE_NOT_FOUND";
    ErrorCode["STATE_LOAD_ERROR"] = "STATE_LOAD_ERROR";
    ErrorCode["STATE_SAVE_ERROR"] = "STATE_SAVE_ERROR";
    ErrorCode["STATE_MISSING_DEPENDENCY"] = "STATE_MISSING_DEPENDENCY";
    // 树结构相关错误 (NEW)
    ErrorCode["TREE_SCAN_FAILED"] = "TREE_SCAN_FAILED";
    ErrorCode["TREE_DEPTH_EXCEEDED"] = "TREE_DEPTH_EXCEEDED";
    ErrorCode["CROSS_TREE_DEP_NOT_FOUND"] = "CROSS_TREE_DEP_NOT_FOUND";
    ErrorCode["PARENT_STATE_UPDATE_FAILED"] = "PARENT_STATE_UPDATE_FAILED";
    // 发现阶段相关错误
    ErrorCode["DISCOVERY_STEP_EXECUTION_FAILED"] = "DISCOVERY_STEP_EXECUTION_FAILED";
    ErrorCode["DISCOVERY_CONTEXT_INVALID"] = "DISCOVERY_CONTEXT_INVALID";
    ErrorCode["DISCOVERY_CONFIG_MISSING"] = "DISCOVERY_CONFIG_MISSING";
    ErrorCode["DISCOVERY_RESULT_INVALID"] = "DISCOVERY_RESULT_INVALID";
    ErrorCode["DISCOVERY_STEP_NOT_FOUND"] = "DISCOVERY_STEP_NOT_FOUND";
    // 工具函数相关错误
    ErrorCode["TOOL_ARGUMENT_INVALID"] = "TOOL_ARGUMENT_INVALID";
    ErrorCode["TOOL_FILE_OPERATION_FAILED"] = "TOOL_FILE_OPERATION_FAILED";
    ErrorCode["TOOL_PARSE_ERROR"] = "TOOL_PARSE_ERROR";
    ErrorCode["TOOL_EXECUTE_ERROR"] = "TOOL_EXECUTE_ERROR";
    ErrorCode["TOOL_TIMEOUT_ERROR"] = "TOOL_TIMEOUT_ERROR";
    // Agent 相关错误
    ErrorCode["AGENT_NOT_FOUND"] = "AGENT_NOT_FOUND";
    ErrorCode["AGENT_ALREADY_REGISTERED"] = "AGENT_ALREADY_REGISTERED";
    ErrorCode["AGENT_REGISTRATION_FAILED"] = "AGENT_REGISTRATION_FAILED";
    ErrorCode["AGENT_EXECUTION_ERROR"] = "AGENT_EXECUTION_ERROR";
    ErrorCode["AGENT_CONFIGURATION_ERROR"] = "AGENT_CONFIGURATION_ERROR";
    // 文件系统相关错误
    ErrorCode["FILE_READ_ERROR"] = "FILE_READ_ERROR";
    ErrorCode["FILE_WRITE_ERROR"] = "FILE_WRITE_ERROR";
    ErrorCode["FILE_ACCESS_DENIED"] = "FILE_ACCESS_DENIED";
    ErrorCode["FILE_NOT_EXIST"] = "FILE_NOT_EXIST";
    ErrorCode["FILE_FORMAT_INVALID"] = "FILE_FORMAT_INVALID";
})(ErrorCode || (ErrorCode = {}));
/**
 * SDDU 基础错误类
 * 所有 SDDU 错误类的基类
 */
export class SdduError extends Error {
    code;
    context;
    isSdduError = true;
    constructor(message, context) {
        super(message);
        // 设置 prototype 链
        Object.setPrototypeOf(this, SdduError.prototype);
        this.code = context.code;
        this.context = context;
        this.name = this.constructor.name;
    }
    /**
     * 获取错误的详细信息
     */
    toDetailedString() {
        return `SDDU Error [${this.code}]: ${this.message}\nDetails: ${JSON.stringify(this.context.details, null, 2)}`;
    }
}
export class StateError extends SdduError {
    constructor(code, message, details) {
        super(message, {
            code: code,
            details,
            timestamp: new Date().toISOString(),
            component: 'State Manager'
        });
        Object.setPrototypeOf(this, StateError.prototype);
    }
}
/**
 * 发现阶段错误
 */
export class DiscoveryError extends SdduError {
    constructor(code, message, details) {
        super(message, {
            code: code,
            details,
            timestamp: new Date().toISOString(),
            component: 'Discovery Engine'
        });
        Object.setPrototypeOf(this, DiscoveryError.prototype);
    }
}
/**
 * 工具函数错误
 */
export class ToolError extends SdduError {
    constructor(code, message, details) {
        super(message, {
            code: code,
            details,
            timestamp: new Date().toISOString(),
            component: 'Tools'
        });
        Object.setPrototypeOf(this, ToolError.prototype);
    }
}
/**
 * Agent 错误
 */
export class AgentError extends SdduError {
    constructor(code, message, details) {
        super(message, {
            code: code,
            details,
            timestamp: new Date().toISOString(),
            component: 'Agent System'
        });
        Object.setPrototypeOf(this, AgentError.prototype);
    }
}
/**
 * 配置相关错误
 */
export class ConfigError extends SdduError {
    constructor(code, message, details) {
        super(message, {
            code: code,
            details,
            timestamp: new Date().toISOString(),
            component: 'Config Manager'
        });
        Object.setPrototypeOf(this, ConfigError.prototype);
    }
}
/**
 * 树结构相关错误
 */
export class TreeStructureError extends SdduError {
    constructor(code, message, details) {
        super(message, {
            code,
            details,
            timestamp: new Date().toISOString(),
            component: 'Tree Structure Manager'
        });
        Object.setPrototypeOf(this, TreeStructureError.prototype);
    }
}
/**
 * 错误处理器
 * 提供标准化的错误处理方式
 */
export class ErrorHandler {
    /**
     * 根据错误类型执行不同的处理策略
     */
    static handle(error, defaultSeverity = 'error') {
        // 如果已经是 SdduError 直接返回
        if (error instanceof SdduError) {
            return this.logError(error);
        }
        // 如果是标准 JS 错误，包装成 SdduError
        if (error instanceof Error) {
            const sdduError = new SdduError(error.message, {
                code: ErrorCode.TOOL_EXECUTE_ERROR, // 默认工具执行错误
                details: { originalError: error.message, cause: error },
                timestamp: new Date().toISOString(),
                component: 'General Handler'
            });
            return this.logError(sdduError);
        }
        // 其他未知错误类型，转换为字符串处理
        const unknownError = String(error);
        const sdduError = new SdduError(unknownError, {
            code: ErrorCode.TOOL_EXECUTE_ERROR,
            details: { originalError: unknownError },
            timestamp: new Date().toISOString(),
            component: 'General Handler'
        });
        return this.logError(sdduError);
    }
    /**
     * 记录错误日志
     */
    static logError(error) {
        // 检查是否为 SdduError
        if (error instanceof SdduError) {
            console.error(`[SDDU-${error.code}] ${error.message}`, error.context);
        }
        else {
            console.error('[SDDU-UNHANDLED] Unhandled error:', error.message);
        }
        return error;
    }
}
/**
 * 格式化错误信息
 */
export function formatErrorMessage(error) {
    if (error.context.details) {
        return `${error.message} (${error.code}) - Details: ${JSON.stringify(error.context.details)}`;
    }
    return `${error.message} (${error.code})`;
}
export default ErrorHandler;
