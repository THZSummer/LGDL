/**
 * settings.ts —— 通用 KV 配置工具（FR-015/042；同步 KV 语义 + 可注入后端）。
 *
 * 生态位（discovery §3.3 A 组 ○）：配置/注册表生态位 → localStorage（同步 KV）/
 * memory 后端。骨架入 base（S-09/O-007c）：非 React 场景可复用；lgdl-web provider
 * 应用态数据平移由场景层自理、不强绑迁移（NG-002 向后兼容优先）。
 *
 * - SettingsStore：命名空间隔离的同步 KV 门面（get/set/list/remove）；
 *   后端 = PlatformKv（localStorage 适配器 / memory 双后端）。
 * - settings 工具（ToolEntry）：AI 可经工具读写配置（get/set/list/remove）。
 * - key 不进 schema/help/日志（FR-040 语义：场景敏感配置位场景自理）。
 *
 * 本文件零 LGDL/react import（NFR-001）。
 */
import type { PlatformKv } from './platform.js';
import type { ToolEntry, ToolResult } from './router.js';

export type { PlatformKv };

/** 支持枚举的 KV 后端（settings list 需要 keys()）。 */
export interface SettingsKv extends PlatformKv {
  keys?(): string[];
}

/** memory 同步 KV 后端（node 测试/无持久降级）。 */
export function createMemoryKv(): SettingsKv {
  const m = new Map<string, string>();
  return {
    get: (k) => m.get(k) ?? null,
    set: (k, v) => {
      m.set(k, v);
    },
    remove: (k) => {
      m.delete(k);
    },
    keys: () => [...m.keys()],
  };
}

/** localStorage 适配器后端（浏览器；不可用/隐私模式 → 静默降级为 memory 明示）。 */
export function createLocalStorageKv(): SettingsKv {
  const memory = createMemoryKv();
  const lsOf = () => {
    const g = globalThis as {
      localStorage?: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> & {
        length?: number;
        key?: (i: number) => string | null;
      };
    };
    return typeof g.localStorage?.getItem === 'function' ? g.localStorage : null;
  };
  return {
    get: (k) => {
      const ls = lsOf();
      if (!ls) return memory.get(k);
      try {
        return ls.getItem(k);
      } catch {
        return memory.get(k);
      }
    },
    set: (k, v) => {
      const ls = lsOf();
      if (!ls) {
        memory.set(k, v);
        return;
      }
      try {
        ls.setItem(k, v);
      } catch {
        memory.set(k, v); // 隐私模式等：降级内存态（EC-005 明示不持久）
      }
    },
    remove: (k) => {
      const ls = lsOf();
      if (!ls) {
        memory.remove(k);
        return;
      }
      try {
        ls.removeItem(k);
      } catch {
        memory.remove(k);
      }
    },
    keys: () => {
      const ls = lsOf();
      if (!ls) return memory.keys?.() ?? [];
      try {
        const out: string[] = [];
        const len = ls.length ?? 0;
        for (let i = 0; i < len; i++) {
          const k = ls.key?.(i);
          if (k) out.push(k);
        }
        return out;
      } catch {
        return memory.keys?.() ?? [];
      }
    },
  };
}

/**
 * SettingsStore —— 命名空间隔离的同步 KV 门面。
 * 键 = `${namespace}:${name}`（隔离互不串扰；list 只列本命名空间）。
 */
export class SettingsStore {
  constructor(
    private kv: SettingsKv,
    private namespace: string,
  ) {}

  private keyOf(name: string): string {
    return `${this.namespace}:${name}`;
  }

  get(name: string): string | null {
    return this.kv.get(this.keyOf(name));
  }

  set(name: string, value: string): void {
    this.kv.set(this.keyOf(name), value);
  }

  remove(name: string): void {
    this.kv.remove(this.keyOf(name));
  }

  /** 列出本命名空间全部键（返回去掉前缀后的短名，含值）。 */
  list(): { name: string; value: string }[] {
    const keys = this.kv.keys?.() ?? [];
    const prefix = `${this.namespace}:`;
    const out: { name: string; value: string }[] = [];
    for (const k of keys) {
      if (!k.startsWith(prefix)) continue;
      const value = this.kv.get(k);
      if (value !== null) out.push({ name: k.slice(prefix.length), value });
    }
    return out.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  }
}

export function createSettingsStore(kv: SettingsKv, namespace: string): SettingsStore {
  return new SettingsStore(kv, namespace);
}

// ---------- settings 工具（ToolEntry 工厂） ----------

const SETTINGS_DESC =
  'settings：通用配置 KV（同步语义）。子命令：get（读配置，--name 必填）/ set（写配置，--name + --value 必填）/ list（列本命名空间全部配置）/ remove（删配置，--name 必填）。' +
  ' 参数进 args 对象：{"subcommand":"set","args":{"name":"theme","value":"dark"}}。敏感值（如 API Key）勿经此工具回显。';

const SETTINGS_SCHEMA = {
  type: 'object',
  properties: {
    subcommand: {
      type: 'string',
      enum: ['get', 'set', 'list', 'remove'],
      description: 'settings 子命令：get/set/list/remove。',
    },
    args: {
      type: 'object',
      properties: {
        name: { type: 'string', description: '配置名（本命名空间内）。' },
        value: { type: 'string', description: 'set 的值。' },
      },
    },
  },
  required: ['subcommand'],
} as const;

export function executeSettings(store: SettingsStore, subcommand: string, args: Record<string, string>): ToolResult {
  switch (subcommand) {
    case 'get': {
      const name = args.name;
      if (!name) return { ok: false, output: '✖ settings get 缺少必填参数 --name' };
      const value = store.get(name);
      return value === null
        ? { ok: false, output: `✖ 配置 "${name}" 未设置` }
        : { ok: true, output: `${name} = ${value}` };
    }
    case 'set': {
      const name = args.name;
      if (!name) return { ok: false, output: '✖ settings set 缺少必填参数 --name' };
      const value = args.value ?? '';
      store.set(name, value);
      return { ok: true, output: `✓ 已设置 ${name} = ${value}` };
    }
    case 'list': {
      const entries = store.list();
      if (entries.length === 0) return { ok: true, output: '（本命名空间无配置）' };
      const lines = [`配置（${entries.length} 个）：`];
      for (const e of entries) lines.push(`- ${e.name} = ${e.value}`);
      return { ok: true, output: lines.join('\n') };
    }
    case 'remove': {
      const name = args.name;
      if (!name) return { ok: false, output: '✖ settings remove 缺少必填参数 --name' };
      const existed = store.get(name) !== null;
      store.remove(name);
      return existed ? { ok: true, output: `✓ 已删除配置 "${name}"` } : { ok: false, output: `✖ 配置 "${name}" 未设置` };
    }
    default:
      return { ok: false, output: `✖ settings 未知子命令 "${subcommand}"（可用：get/set/list/remove）` };
  }
}

export function settingsHelp(): string {
  return [
    'settings —— 通用配置 KV（同步语义；命名空间隔离）',
    '用法：settings <get|set|list|remove> --name <配置名> [--value <值>]',
    '',
    '示例：settings set --name editor.theme --value dark',
    '说明：同步读写本地配置；敏感值（API Key 等）建议由场景设置面板管理，不推荐经工具回显。',
  ].join('\n');
}

/** 创建 settings 工具条目（注入后端 + 命名空间）。 */
export function createSettingsToolEntry(kv: SettingsKv, namespace = 'settings'): ToolEntry {
  const store = createSettingsStore(kv, namespace);
  return {
    name: 'settings',
    summary: '通用配置 KV（同步 get/set/list/remove，命名空间隔离）',
    schema: { name: 'settings', description: SETTINGS_DESC, parameters: SETTINGS_SCHEMA as unknown as Record<string, unknown> },
    risk: 'state',
    group: 'settings',
    executor: async (tc) => executeSettings(store, tc.subcommand, tc.args),
    help: settingsHelp,
  };
}
