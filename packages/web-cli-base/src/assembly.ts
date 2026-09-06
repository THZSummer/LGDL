/**
 * assembly.ts —— 默认目录/矩阵组装器（FR-001/004/039/043 的 base 侧承载）。
 *
 * 场景（lgdl-web session）声明「启用哪些域」即得注册序一致的 router ——
 * 单点变更全链可见（NFR-004）。矩阵 = 域 → 组/开关/风险声明 + 顺序契约
 * （业务注册序 + 内建置末延续，AC-005/FR-001）。
 *
 * 分层纪律（NFR-001/§2.2）：assembly 只组装**已建工厂** —— P0 工厂在 base 内置
 * （storage/settings/doc/session/context/web-search）；P1 域工厂未建时不 import
 * （TASK-008~011 之后由场景/assembly 增量注册，不改本文件的矩阵结构即扩域）。
 * base 独立自足冒烟（AC-001）：无业务包时 createDefaultRouter() 可列 schema /
 * 查 help / 派发。
 *
 * 本文件零 LGDL/react import（NFR-001）。
 */
import type { PlatformEnv } from './platform.js';
import { nodeEnv } from './platform.js';
import type { ToolRisk } from './permission.js';
import type { AuditSink } from './audit.js';
import type { ToolEntry, RouterPolicy } from './router.js';
import { createCommandRouter } from './router.js';
import type { CommandRouter } from './router.js';
import type { StorageBackend } from './storage-mem.js';
import { createMemoryStorage } from './storage-mem.js';
import { createStorageTools } from './storage-tools.js';
import type { SettingsKv } from './settings.js';
import { createMemoryKv, createSettingsToolEntry } from './settings.js';
import { createDocTools } from './doc-tools.js';
import type { SessionStore } from './session-store.js';
import { createSessionStore } from './session-store.js';
import { createSessionToolEntry } from './session-tool.js';
import { createContextToolEntry } from './context-tool.js';
import { createWebSearchToolEntry } from './web-search.js';

/** 矩阵行：域工具的组/风险/开关声明。 */
export interface MatrixRow {
  /** 工具全限定名（P0 均顶层，无命名空间）。 */
  name: string;
  group: string;
  risk?: ToolRisk;
  /** true=默认开；'conditional'=条件开（依赖 env.search 等场景注入，运行时报告）。 */
  enabled: boolean | 'conditional';
}

/**
 * P0 默认矩阵（FR-039 推荐取向 P0 子集）：
 * storage/settings/doc/session/context 默认开（中性无副作用/场景必要类）；
 * web-search 条件开（BYOK：配端点/key 后可用；base 零内置端点零内置 key）。
 * 顺序 = 派生顺序契约（业务后、内建置末由 router 保证）。
 */
export function buildDefaultMatrix(): MatrixRow[] {
  return [
    { name: 'storage', group: 'storage', risk: 'write', enabled: true },
    { name: 'storage-quota', group: 'storage', enabled: true },
    { name: 'settings', group: 'settings', risk: 'state', enabled: true },
    { name: 'doc-read', group: 'doc', risk: 'read', enabled: true },
    { name: 'doc-edit', group: 'doc', risk: 'write', enabled: true },
    { name: 'session', group: 'session', risk: 'state', enabled: true },
    { name: 'context', group: 'session', risk: 'state', enabled: true },
    { name: 'web-search', group: 'net', risk: 'external', enabled: 'conditional' },
  ];
}

/** assembly 环境（工具依赖注入；缺省 node/memory 供 base 自足冒烟）。 */
export interface AssemblyContext {
  env?: PlatformEnv;
  /** storage 载体（缺省 memory）。 */
  backend?: StorageBackend;
  /** settings KV（缺省 memory）。 */
  settingsKv?: SettingsKv;
  /** SessionStore（缺省 = memory 载体新建）。 */
  sessionStore?: SessionStore;
  /** 审计（session/context 工具 ctx.services.audit 之外的可注入位）。 */
  audit?: AuditSink;
}

/** 构建 P0 域工具条目（依矩阵顺序；机制侧不 import 未建 P1 域工厂）。 */
export function createP0DomainTools(ctx: AssemblyContext = {}): ToolEntry[] {
  const env = ctx.env ?? nodeEnv();
  const backend = ctx.backend ?? createMemoryStorage();
  const settingsKv = ctx.settingsKv ?? createMemoryKv();
  const store = ctx.sessionStore ?? createSessionStore(createMemoryStorage());
  const entries: ToolEntry[] = [];
  for (const row of buildDefaultMatrix()) {
    switch (row.name) {
      case 'storage':
      case 'storage-quota':
        entries.push(...createStorageTools(backend).filter((e) => e.name === row.name));
        break;
      case 'settings':
        entries.push(createSettingsToolEntry(settingsKv));
        break;
      case 'doc-read':
      case 'doc-edit':
        entries.push(...createDocTools().filter((e) => e.name === row.name));
        break;
      case 'session':
        entries.push(createSessionToolEntry({ store }));
        break;
      case 'context':
        entries.push(createContextToolEntry({ store, audit: ctx.audit }));
        break;
      case 'web-search':
        // 条件开：env.search 由场景注入；未配置 → 工具报告禁用态 + 配置指引（EC-006）
        entries.push(createWebSearchToolEntry(env));
        break;
    }
  }
  return entries;
}

/** 组装默认 router：内建自动注册 + P0 域工具（矩阵顺序）。base 自足冒烟入口（AC-001）。 */
export function createDefaultRouter(opts: {
  env?: PlatformEnv;
  backend?: StorageBackend;
  settingsKv?: SettingsKv;
  sessionStore?: SessionStore;
  policy?: RouterPolicy;
  audit?: AuditSink;
  delayMs?: number;
} = {}): CommandRouter {
  const router = createCommandRouter({
    delayMs: opts.delayMs ?? 0,
    ...(opts.policy ? { policy: opts.policy } : {}),
    ...(opts.audit ? { audit: opts.audit } : {}),
  });
  const context: AssemblyContext = {
    env: opts.env,
    backend: opts.backend,
    settingsKv: opts.settingsKv,
    sessionStore: opts.sessionStore,
    audit: opts.audit,
  };
  for (const entry of createP0DomainTools(context)) router.register(entry);
  return router;
}
