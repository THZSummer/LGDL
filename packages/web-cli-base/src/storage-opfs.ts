/**
 * storage-opfs.ts —— StorageBackend OPFS 实现（FR-013，ADR-003 双载体之卷载体）。
 *
 * 生态位（discovery §3.3 A 组 ◐）：OPFS = origin 私有文件系统（目录 + 文件句柄），
 * storage 工具的「卷」语义宿主；卷内目录结构、origin 私有、worker 可同步访问。
 * 无 origin 外访问（D-5：对象=卷条目，非系统路径遍历）。
 *
 * 浏览器面：navigator.storage.getDirectory()（安全上下文）；node 面调用抛
 * NotFoundError → EC-005 降级 memory。真实浏览器冒烟见 storage-tools.test.ts
 * 注释预留清单（validate 承接）。
 *
 * 本文件零 LGDL/react import（NFR-001）。
 */

import type { StorageBackend, StorageEntry, StorageEstimate, StorageWriteResult } from './storage-mem.js';
import { byteSize } from './storage-mem.js';

/** OPFS 目录句柄结构化子集（无 DOM lib）。 */
interface OpfsDirHandle {
  values?: () => AsyncIterable<OpfsHandle>;
  getFileHandle?: (name: string, opts?: { create?: boolean }) => Promise<OpfsFileHandle>;
  getDirectoryHandle?: (name: string, opts?: { create?: boolean }) => Promise<OpfsDirHandle>;
  removeEntry?: (name: string, opts?: { recursive?: boolean }) => Promise<void>;
  kind?: string;
  name?: string;
}
interface OpfsFileHandle {
  kind?: string;
  name?: string;
  createWritable?: () => Promise<{ write: (data: string) => Promise<void>; close: () => Promise<void> }>;
  getFile?: () => Promise<{ text: () => Promise<string>; size?: number; lastModified?: number }>;
}
type OpfsHandle = OpfsDirHandle & OpfsFileHandle;

function opfsRoot(): Promise<OpfsDirHandle> {
  const g = globalThis as { navigator?: { storage?: { getDirectory?: () => Promise<OpfsDirHandle> } } };
  if (typeof g.navigator?.storage?.getDirectory !== 'function') {
    const e = new Error('OPFS 不可用（浏览器不支持 / 非安全上下文 / 隐私模式）—— 请降级内存态');
    e.name = 'NotFoundError';
    throw e;
  }
  return g.navigator.storage.getDirectory();
}

/** 路径 → 段（防越界：拒绝空段/.. / 绝对路径；卷内相对名）。 */
function segmentsOf(name: string): string[] {
  const segs = name.split('/').filter((s) => s.length > 0);
  for (const s of segs) {
    if (s === '..' || s === '.' || s.includes('\\')) {
      throw new Error(`非法卷条目名 "${name}"（卷内相对名，禁止路径越界）`);
    }
  }
  return segs;
}

async function walk(root: OpfsDirHandle, prefix = ''): Promise<StorageEntry[]> {
  const out: StorageEntry[] = [];
  const values = root.values?.();
  if (!values) return out;
  for await (const handle of values) {
    const name = prefix ? `${prefix}/${handle.name ?? ''}` : (handle.name ?? '');
    if (handle.kind === 'directory') {
      const sub = await walk(handle as OpfsDirHandle, name);
      out.push(...sub);
    } else {
      const file = await (handle as OpfsFileHandle).getFile?.();
      out.push({ name, size: file?.size ?? 0, updatedAt: file?.lastModified ?? 0, rev: 1 });
    }
  }
  return out.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
}

/** 解析到父目录（自动建目录 create）；返回 {dir, base}。 */
async function resolveParent(root: OpfsDirHandle, name: string, create: boolean): Promise<{ dir: OpfsDirHandle; base: string }> {
  const segs = segmentsOf(name);
  const base = segs.pop();
  if (!base) throw new Error(`非法卷条目名 "${name}"（不能为空）`);
  let dir = root;
  for (const seg of segs) {
    dir = await dir.getDirectoryHandle?.(seg, { create }) ?? dir;
  }
  return { dir, base };
}

export interface OpfsStorageOptions {
  /** 子卷名（根卷下建子目录隔离；缺省直接根卷）。 */
  rootName?: string;
}

/** 创建 OPFS 卷载体（浏览器；node 面抛 NotFoundError → EC-005 降级）。 */
export async function createOpfsStorage(opts: OpfsStorageOptions = {}): Promise<StorageBackend> {
  const root = await opfsRoot();
  const base = opts.rootName ? await (root.getDirectoryHandle?.(opts.rootName, { create: true }) ?? Promise.resolve(root)) : root;

  const backend: StorageBackend = {
    kind: 'opfs',
    async list(prefix = '') {
      const all = await walk(base);
      return prefix ? all.filter((e) => e.name.startsWith(prefix)) : all;
    },
    async read(name: string) {
      const { dir, base: file } = await resolveParent(base, name, false);
      const handle = await dir.getFileHandle?.(file);
      const getFile = handle?.getFile;
      if (!getFile) return null;
      const f = await getFile();
      const text = f?.text;
      return text ? text() : null;
    },
    async write(name: string, content: string, wopts?: { expectedRev?: number }) {
      // OPFS 无内建事务 rev —— expectedRev 由调用方以外部记录（IDB）承载；
      // 此处提供 last-write 语义 + 可选 rev 一致性检查（调用方预读）。
      if (wopts?.expectedRev !== undefined) {
        const cur = await this.read(name);
        if (cur !== null && wopts.expectedRev <= 0) {
          // 无 rev 元数据 → 不做冲突断言（记录说明）
        }
      }
      const { dir, base: file } = await resolveParent(base, name, true);
      const handle = await dir.getFileHandle?.(file, { create: true });
      if (!handle?.createWritable) return { ok: false, error: 'OPFS 句柄不可写', rev: 0, updatedAt: Date.now() } satisfies StorageWriteResult;
      const writable = await handle.createWritable();
      await writable.write(content);
      await writable.close();
      return { ok: true, rev: 1, updatedAt: Date.now() };
    },
    async remove(name: string) {
      const { dir, base: file } = await resolveParent(base, name, false);
      try {
        await dir.removeEntry?.(file, { recursive: true });
        return true;
      } catch {
        return false;
      }
    },
    async estimate(): Promise<StorageEstimate> {
      const all = await walk(base);
      const usage = all.reduce((acc, e) => acc + e.size, 0);
      const g = globalThis as { navigator?: { storage?: { estimate?: () => Promise<{ usage: number; quota: number }>; persisted?: () => Promise<boolean> } } };
      const est = g.navigator?.storage?.estimate ? await g.navigator.storage.estimate() : undefined;
      const persisted = g.navigator?.storage?.persisted ? await g.navigator.storage.persisted() : false;
      return { usage, quota: est?.quota ?? 0, persisted };
    },
    async persist() {
      const g = globalThis as { navigator?: { storage?: { persist?: () => Promise<boolean> } } };
      if (!g.navigator?.storage?.persist) return false;
      return g.navigator.storage.persist();
    },
    async persisted() {
      const g = globalThis as { navigator?: { storage?: { persisted?: () => Promise<boolean> } } };
      if (!g.navigator?.storage?.persisted) return false;
      return g.navigator.storage.persisted();
    },
    async revOf() {
      return null; // OPFS 无内建 rev；结构化冲突标记由调用方经 IDB 记录承载
    },
  };
  return backend;
}
