// state/ 公共 API 出口 - 状态追踪
// 域间 import 只能通过此文件，不得直接引用内部文件
// 规则：零 @opencode-ai/plugin 依赖，不反向引用 adapters/
// v3.0.0 schema (current)
export * from './schema-v3.0.0';
// State machine core
export * from './machine';
// Tree scanner
export * from './tree-scanner';
// State loader (distributed state)
export * from './state-loader';
// Auto updater
export * from './auto-updater';
// Parent state manager
export * from './parent-state-manager';
// Dependency checker
export * from './dependency-checker';
