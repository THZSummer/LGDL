// shared/ 公共 API 出口 - 零平台依赖，零业务域依赖
// 供 src/index.ts 顶层薄桶和其他所有域安全引用
export * from './types';
export * from './errors';
