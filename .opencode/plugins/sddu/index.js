// SDDU Plugin - 公共 API 薄桶导出
// 不包含任何平台注册逻辑（已迁至 src/adapters/opencode/plugin.ts）
// 仅从各业务域和 shared/ 的 index.ts 做 re-export
export { ErrorCode, SdduError, StateError, DiscoveryError, ToolError, AgentError, ConfigError, TreeStructureError, ErrorHandler, formatErrorMessage, } from './shared/errors';
// ============================================================================
// 业务域 - SDDU 方法论核心
// ============================================================================
// State - 状态追踪与 Schema 管理
export { VALID_PHASES, VALID_STATUSES, PHASE_ORDER, NEXT_PHASE, IRREVERSIBLE_STATUSES, phaseFlow, validateStateV3, validateStateV3Detailed, shouldRecommendContinue, getNextRecommendedPhase, isStatusReversible, } from './state';
export { StateMachine, DependencyChecker, StateLoader, AutoUpdater, ParentStateManager, } from './state';
// ============================================================================
// OpenCode 平台适配层
// ============================================================================
export { SDDUPlugin } from './adapters/opencode';
// 默认导出（向后兼容）
import { SDDUPlugin as _SDDUPlugin } from './adapters/opencode';
export default _SDDUPlugin;
