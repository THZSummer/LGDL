/**
 * storage-idb.ts —— StorageBackend IndexedDB 实现（FR-013/014/030/031/034 载体，ADR-003）。
 *
 * 生态位：结构化记录（会话 turns / goal / jobs 状态）与卷条目的 origin 级持久宿主；
 * 对象库 + 事务；同源多标签**共享读** + EC-013 写冲突/last-write 原语（rev 递增 + expectedRev）。
 *
 * 浏览器面：base 无 DOM lib（NFR-002 零额外依赖），IndexedDB 以最小结构化封装访问；
 * node 面无 indexedDB —— createIdbStorage() 调用时抛 NotFoundError（场景按 EC-005
 * 降级 memory 并明示「本次会话不持久」）。真实浏览器冒烟（真持久/跨标签）见
 * storage-tools.test.ts 注释预留清单（validate 承接，NFR-006）。
 *
 * 本文件零 LGDL/react import（NFR-001）。
 */

import type { StorageBackend, StorageEntry, StorageEstimate, StorageWriteResult } from './storage-mem.js';
import { byteSize } from './storage-mem.js';

// ---- IndexedDB 最小结构化封装（无 DOM lib 的结构性类型） ----

interface IdbRecord {
  key: string;
  value: string;
  rev: number;
  updatedAt: number;
}

type IdbEvent = { target?: { result?: unknown } };
type IdbRequestLike = {
  result?: unknown;
  onsuccess: ((ev: IdbEvent) => void) | null;
  onerror: ((ev: unknown) => void) | null;
};
type IdbObjectStoreLike = {
  getAll?: () => IdbRequestLike;
  get?: (key: string) => IdbRequestLike;
  put?: (value: unknown) => IdbRequestLike;
  delete?: (key: string) => IdbRequestLike;
};
type IdbTransactionLike = {
  objectStore: (name: string) => IdbObjectStoreLike;
  oncomplete: ((ev: unknown) => void) | null;
  onerror: ((ev: unknown) => void) | null;
  abort: () => void;
};
type IdbDatabaseLike = {
  transaction: (store: string, mode: string) => IdbTransactionLike;
  createObjectStore?: (name: string, opts: { keyPath: string }) => unknown;
  objectStoreNames?: { contains: (name: string) => boolean };
};
type IdbOpenRequestLike = IdbRequestLike & {
  onupgradeneeded: ((ev: unknown) => void) | null;
  result?: IdbDatabaseLike;
};

function indexedDbFactory(): IdbOpenRequestLike {
  const g = globalThis as { indexedDB?: { open: (name: string, version?: number) => IdbOpenRequestLike } };
  if (typeof g.indexedDB?.open !== 'function') {
    const e = new Error('IndexedDB 不可用（隐私模式/浏览器不支持）—— 请降级内存态或检查浏览器设置');
    e.name = 'NotFoundError';
    throw e;
  }
  return g.indexedDB.open('web-cli-base', 1);
}

function openIdb(dbName: string, storeName: string): Promise<IdbDatabaseLike> {
  const req = indexedDbFactory();
  return new Promise<IdbDatabaseLike>((resolve, reject) => {
    req.onupgradeneeded = () => {
      const db = req.result;
      const stores = db?.objectStoreNames;
      if (db?.createObjectStore && !(stores && stores.contains(storeName))) {
        db.createObjectStore(storeName, { keyPath: 'key' });
      }
    };
    req.onsuccess = () => {
      const db = req.result;
      if (!db) {
        reject(new Error('IndexedDB open 无结果'));
        return;
      }
      resolve(db);
    };
    req.onerror = () => reject(new Error('IndexedDB 打开失败'));
  });
}

function promisifyRequest<T>(req: IdbRequestLike): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    req.onsuccess = () => resolve(req.result as T);
    req.onerror = () => reject(new Error('IndexedDB 请求失败'));
  });
}

function withStore<T>(db: IdbDatabaseLike, storeName: string, mode: 'readonly' | 'readwrite', fn: (s: IdbObjectStoreLike) => IdbRequestLike): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const req = fn(tx.objectStore(storeName));
    tx.oncomplete = () => resolve(req.result as T);
    tx.onerror = () => {
      try {
        tx.abort();
      } catch {
        // 已终止
      }
      reject(new Error('IndexedDB 事务失败'));
    };
    req.onsuccess = () => resolve(req.result as T);
    req.onerror = () => reject(new Error('IndexedDB 请求失败'));
  });
}

export interface IdbStorageOptions {
  dbName?: string;
  storeName?: string;
}

/**
 * 创建 IndexedDB 载体（浏览器；node 面调用抛 NotFoundError → EC-005 降级）。
 * 记录形态：{ key, value(UTF-8 文本), rev, updatedAt }。
 */
export async function createIdbStorage(opts: IdbStorageOptions = {}): Promise<StorageBackend> {
  const dbName = opts.dbName ?? 'web-cli-base';
  const storeName = opts.storeName ?? 'kv';
  const db = await openIdb(dbName, storeName);

  const toEntry = (rec: IdbRecord): StorageEntry => ({ name: rec.key, size: byteSize(rec.value), updatedAt: rec.updatedAt, rev: rec.rev });

  const backend: StorageBackend = {
    kind: 'idb',
    async list(prefix = '') {
      const recs = await withStore<IdbRecord[]>(db, storeName, 'readonly', (s) => s.getAll?.() ?? ({ onsuccess: null, onerror: null } as IdbRequestLike));
      return (recs ?? [])
        .filter((r) => !prefix || r.key.startsWith(prefix))
        .map(toEntry)
        .sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
    },
    async read(key: string) {
      const rec = await withStore<IdbRecord | undefined>(db, storeName, 'readonly', (s) => s.get?.(key) ?? ({ onsuccess: null, onerror: null } as IdbRequestLike));
      return rec?.value ?? null;
    },
    async write(key: string, content: string, wopts?: { expectedRev?: number }) {
      const cur = await withStore<IdbRecord | undefined>(db, storeName, 'readonly', (s) => s.get?.(key) ?? ({ onsuccess: null, onerror: null } as IdbRequestLike));
      const now = Date.now();
      const currentRev = cur?.rev ?? 0;
      if (wopts?.expectedRev !== undefined && currentRev !== wopts.expectedRev) {
        return { ok: false, conflict: true, error: `write conflict: 期望 rev=${wopts.expectedRev} 实际=${currentRev}`, rev: currentRev, updatedAt: cur?.updatedAt ?? now } satisfies StorageWriteResult;
      }
      const rev = currentRev + 1;
      const rec: IdbRecord = { key, value: content, rev, updatedAt: now };
      await withStore<unknown>(db, storeName, 'readwrite', (s) => s.put?.(rec) ?? ({ onsuccess: null, onerror: null } as IdbRequestLike));
      return { ok: true, rev, updatedAt: now };
    },
    async remove(key: string) {
      const cur = await withStore<IdbRecord | undefined>(db, storeName, 'readonly', (s) => s.get?.(key) ?? ({ onsuccess: null, onerror: null } as IdbRequestLike));
      if (!cur) return false;
      await withStore<unknown>(db, storeName, 'readwrite', (s) => s.delete?.(key) ?? ({ onsuccess: null, onerror: null } as IdbRequestLike));
      return true;
    },
    async estimate(): Promise<StorageEstimate> {
      const recs = await withStore<IdbRecord[]>(db, storeName, 'readonly', (s) => s.getAll?.() ?? ({ onsuccess: null, onerror: null } as IdbRequestLike));
      const usage = (recs ?? []).reduce((acc, r) => acc + byteSize(r.value), 0);
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
    async revOf(key: string) {
      const rec = await withStore<IdbRecord | undefined>(db, storeName, 'readonly', (s) => s.get?.(key) ?? ({ onsuccess: null, onerror: null } as IdbRequestLike));
      return rec?.rev ?? null;
    },
  };
  return backend;
}
