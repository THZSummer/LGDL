/**
 * storage-tools.ts —— storage / storage-quota 域工具（FR-013/014；EC-004/005 转译）。
 *
 * 生态位：浏览器持久卷工具 —— list/read/write/remove 的对象是**注入后端的卷条目**
 * （OPFS/IDB/memory，origin 私有），非系统文件路径（D-5）。工具不内置任何载体：
 * 后端经工厂注入（node 测试 = memory fake；浏览器 = opfs/idb，EC-005 降级语义由
 * 组装方明示）。storage-quota 提供 estimate/persist 可读 + 可解析输出（FR-014）。
 *
 * 输出格式稳定可解析（每行前缀固定）；EC-004 配额超限 → 「配额不足」可读错误 +
 * 清理建议（storage-quota 联动）。
 *
 * 本文件零 LGDL/react import（NFR-001）。
 */
import type { StorageBackend } from './storage-mem.js';
import { isQuotaError } from './storage-mem.js';
import type { ToolEntry, ToolResult } from './router.js';

const STORAGE_DESC =
  'storage：浏览器持久卷工具（origin 私有卷条目，非系统文件路径）。子命令：list（列条目，可 --prefix 过滤）/ read（读条目，--path 必填）/ write（写条目，--path 必填 + --content）/ remove（删除条目，--path 必填）。' +
  ' 参数进 args 对象：{"subcommand":"write","args":{"path":"notes/ideas.txt","content":"hello"}}。';

const STORAGE_SCHEMA = {
  type: 'object',
  properties: {
    subcommand: {
      type: 'string',
      enum: ['list', 'read', 'write', 'remove'],
      description: 'storage 子命令：list（列卷条目）/ read（读条目内容）/ write（写条目）/ remove（删除条目）。',
    },
    args: {
      type: 'object',
      description: '子命令参数。--path 指定卷内条目名（origin 私有卷，非系统文件路径）；--content 为写内容。',
      properties: {
        path: { type: 'string', description: '卷内条目名，如 "guide.md" 或 "notes/ideas.txt"（禁止 .. 越界）。' },
        content: { type: 'string', description: 'write 的内容（UTF-8 文本）。' },
        prefix: { type: 'string', description: 'list 的前缀过滤（可选）。' },
      },
    },
  },
  required: ['subcommand'],
} as const;

const QUOTA_DESC =
  'storage-quota：存储配额观测（FR-014）。子命令：estimate（输出 usage/quota/persisted/使用率，可解析）/ persist（请求持久化授予）。' +
  ' 参数进 args 对象：{"subcommand":"estimate"}。';

const QUOTA_SCHEMA = {
  type: 'object',
  properties: {
    subcommand: {
      type: 'string',
      enum: ['estimate', 'persist'],
      description: 'storage-quota 子命令：estimate（配额观测）/ persist（请求持久化授予）。',
    },
  },
  required: ['subcommand'],
} as const;

function toolResult(ok: boolean, output: string, error?: string): ToolResult {
  return error ? { ok, output, error } : { ok, output };
}

/** storage 工具执行器。 */
export async function executeStorage(backend: StorageBackend, subcommand: string, args: Record<string, string>): Promise<ToolResult> {
  try {
    switch (subcommand) {
      case 'list': {
        const entries = await backend.list(args.prefix ?? '');
        if (entries.length === 0) return toolResult(true, '（卷为空' + (args.prefix ? `：无匹配 "${args.prefix}" 前缀的条目）` : '）'));
        const lines = [`卷条目（${entries.length} 个）${args.prefix ? `（前缀 "${args.prefix}"）` : ''}：`];
        for (const e of entries) lines.push(`- ${e.name}（${e.size} 字节，rev ${e.rev}）`);
        return toolResult(true, lines.join('\n'));
      }
      case 'read': {
        const path = args.path;
        if (!path) return toolResult(false, '✖ storage read 缺少必填参数 --path <卷内条目名>');
        const content = await backend.read(path);
        if (content === null) return toolResult(false, `✖ 卷条目 "${path}" 不存在（storage list 可查看现有条目）`);
        return toolResult(true, content);
      }
      case 'write': {
        const path = args.path;
        const content = args.content ?? '';
        if (!path) return toolResult(false, '✖ storage write 缺少必填参数 --path <卷内条目名>（--content 可空）');
        const r = await backend.write(path, content);
        if (!r.ok) {
          if (r.conflict) {
            return toolResult(false, `✖ 写入冲突（rev ${r.rev}）：另一处已更新该条目 —— 请先 storage read 再合并重写（EC-013）`, r.error);
          }
          return toolResult(false, `✖ 写入失败：${r.error ?? '未知错误'}`, r.error);
        }
        return toolResult(true, `✓ 已写入 "${path}"（${content.length} 字符，rev ${r.rev}）`);
      }
      case 'remove': {
        const path = args.path;
        if (!path) return toolResult(false, '✖ storage remove 缺少必填参数 --path <卷内条目名>');
        const removed = await backend.remove(path);
        return removed ? toolResult(true, `✓ 已删除 "${path}"`) : toolResult(false, `✖ 卷条目 "${path}" 不存在`);
      }
      default:
        return toolResult(false, `✖ storage 未知子命令 "${subcommand}"（可用：list/read/write/remove）`);
    }
  } catch (err) {
    // EC-004 配额超限 → 「配额不足」+ 清理建议；其余保留原错误
    if (isQuotaError(err)) {
      return toolResult(false, '✖ 配额不足：存储空间已满 —— 可用 storage-quota estimate 查看用量，删除无用条目（storage remove）后重试（EC-004）', err instanceof Error ? err.message : String(err));
    }
    const msg = err instanceof Error ? err.message : String(err);
    return toolResult(false, `✖ storage 执行失败：${msg}`, msg);
  }
}

/** storage-quota 执行器。 */
export async function executeStorageQuota(backend: StorageBackend, subcommand: string): Promise<ToolResult> {
  try {
    switch (subcommand) {
      case 'estimate': {
        const est = await backend.estimate();
        const lines = [
          `storage-quota estimate：`,
          `usage: ${est.usage}`,
          `quota: ${est.quota}`,
          `persisted: ${est.persisted}`,
        ];
        const ratio = est.quota > 0 ? ((est.usage / est.quota) * 100).toFixed(1) : 'n/a';
        lines.push(`使用率: ${ratio}%`);
        lines.push('提示：浏览器配额可能被 GC 回收 —— 可 storage-quota persist 请求持久化授予以降低回收风险。');
        return toolResult(true, lines.join('\n'));
      }
      case 'persist': {
        const granted = await backend.persist();
        return granted
          ? toolResult(true, '✓ 已请求持久化授予（navigator.storage.persist 返回 granted）')
          : toolResult(true, '持久化授予未获准（浏览器策略）：数据仍在当前会话可用，但可能被回收（EC-005 明示不持久语义）');
      }
      default:
        return toolResult(false, `✖ storage-quota 未知子命令 "${subcommand}"（可用：estimate/persist）`);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return toolResult(false, `✖ storage-quota 执行失败：${msg}`, msg);
  }
}

export function storageHelp(): string {
  return [
    'storage —— 浏览器持久卷工具（origin 私有；非系统文件路径）',
    '用法：storage <list|read|write|remove> --path <卷内条目名> [--content <内容>] [--prefix <前缀>]',
    '',
    '子命令：',
    '  list   列卷条目（--prefix 过滤）',
    '  read   读条目内容（--path 必填）',
    '  write  写条目内容（--path 必填；--content 可空）',
    '  remove 删除条目（--path 必填）',
    '',
    '示例：storage write --path notes/ideas.txt --content "hello"',
    '说明：载体由组装方注入（OPFS/IDB/memory）；配额不足/存储不可用按可读错误转译，不静默丢数据。',
  ].join('\n');
}

export function storageQuotaHelp(): string {
  return [
    'storage-quota —— 存储配额观测（estimate/persist 语义面）',
    '用法：storage-quota <estimate|persist>',
    '',
    '子命令：',
    '  estimate  输出 usage/quota/persisted/使用率（可解析）',
    '  persist   请求持久化授予（降低 GC 回收风险）',
    '',
    '示例：storage-quota estimate',
  ].join('\n');
}

/** 创建 storage 工具条目（注入后端）。 */
export function createStorageToolEntry(backend: StorageBackend): ToolEntry {
  return {
    name: 'storage',
    summary: '浏览器持久卷工具（origin 私有；list/read/write/remove 卷条目）',
    schema: { name: 'storage', description: STORAGE_DESC, parameters: STORAGE_SCHEMA as unknown as Record<string, unknown> },
    risk: 'write',
    group: 'storage',
    executor: async (tc) => executeStorage(backend, tc.subcommand, tc.args),
    help: storageHelp,
  };
}

/** 创建 storage-quota 工具条目（注入后端）。 */
export function createStorageQuotaToolEntry(backend: StorageBackend): ToolEntry {
  return {
    name: 'storage-quota',
    summary: '存储配额观测（estimate/persist，可读可解析输出）',
    schema: { name: 'storage-quota', description: QUOTA_DESC, parameters: QUOTA_SCHEMA as unknown as Record<string, unknown> },
    group: 'storage',
    executor: async (tc) => executeStorageQuota(backend, tc.subcommand),
    help: storageQuotaHelp,
  };
}

/** 便捷：一次创建 storage 域两个工具条目（assembly/场景组装用）。 */
export function createStorageTools(backend: StorageBackend): ToolEntry[] {
  return [createStorageToolEntry(backend), createStorageQuotaToolEntry(backend)];
}
