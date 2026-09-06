/**
 * StorageBackend —— 浏览器持久卷统一抽象（FR-013/014，ADR-003）。
 *
 * 生态位（discovery §3.3 A 组 ◐）：文件系统生态位 → 浏览器持久卷语义 ——
 * list/read/write/remove 的对象是 **origin 私有的卷条目**（OPFS/IDB），
 * 非 OS 文件路径（D-5：无通用路径遍历语义，无 origin 外访问）。
 *
 * 实现三轨（§3.3 方案 A / ADR-003）：
 *   - storage-mem.ts   memory：node 测试 / 无持久降级默认（EC-005 内存态）
 *   - storage-idb.ts   IndexedDB 对象库：结构化记录（会话/goal/jobs 宿主）+ 跨标签共享读
 *   - storage-opfs.ts  OPFS 卷：目录+文件句柄（storage 工具卷语义宿主）
 *
 * EC-013 写冲突/last-write 原语：每键携带自增 rev + 最近写入时间；
 * write(expectedRev) 不匹配 → conflict:true 且不写入（不静默覆盖丢失）；
 * 不带 expectedRev 的写入 = last-write 语义（强制覆盖，rev 递增）。
 *
 * 本文件零 LGDL/react import（NFR-001）；node 面全链可测（NFR-006）。
 */

/** 卷条目元信息。 */
export interface StorageEntry {
  /** 卷内条目名（如 "dir/file.txt"；origin 私有命名空间，非系统路径）。 */
  name: string;
  /** 内容字节数（UTF-8）。 */
  size: number;
  /** 最近写入时间（epoch ms）。 */
  updatedAt: number;
  /** 最近写入版本（EC-013 冲突标记/last-write 原语）。 */
  rev: number;
}

/** 配额观测结果（storage.estimate/persist 语义面）。 */
export interface StorageEstimate {
  /** 已用字节（usage）。 */
  usage: number;
  /** 配额字节（quota；0 = 不可知）。 */
  quota: number;
  /** 持久化授予状态（persist 语义）。 */
  persisted: boolean;
}

/** 写入结果（EC-004/013：ok / 冲突标记 / 错误）。 */
export interface StorageWriteResult {
  ok: boolean;
  /** EC-013：expectedRev 不匹配（并发写）→ true 且本次未写入。 */
  conflict?: boolean;
  /** 失败原因（配额超限/载体不可用等转译上游处理）。 */
  error?: string;
  /** 写入后版本。 */
  rev: number;
  /** 写入后时间（epoch ms）。 */
  updatedAt: number;
}

export interface StorageBackend {
  /** 载体标识：memory/idb/opfs/fake。 */
  readonly kind: string;
  /** 列卷条目（前缀过滤；缺省全部）。 */
  list(prefix?: string): Promise<StorageEntry[]>;
  /** 读条目内容；不存在 → null。 */
  read(key: string): Promise<string | null>;
  /**
   * 写条目。opts.expectedRev 提供 = 乐观并发控制（EC-013）：当前版本不匹配 →
   * conflict:true 且不写入；不提供 = last-write 语义（强制覆盖）。
   */
  write(key: string, content: string, opts?: { expectedRev?: number }): Promise<StorageWriteResult>;
  /** 删条目；不存在返回 false。 */
  remove(key: string): Promise<boolean>;
  /** 配额观测（estimate/persist 语义面，FR-014）。 */
  estimate(): Promise<StorageEstimate>;
  /** 请求持久化授予（navigator.storage.persist 语义）。 */
  persist(): Promise<boolean>;
  /** 查询持久化授予状态。 */
  persisted(): Promise<boolean>;
  /** 读某键最近版本（EC-013；无此键 → null）。 */
  revOf(key: string): Promise<number | null>;
}

/** UTF-8 字节数（配额估算用）。 */
export function byteSize(s: string): number {
  return new TextEncoder().encode(s).length;
}

/**
 * MemoryStorage —— node 测试 / 无持久降级默认（EC-005 内存态）：
 * 进程存活期有效；隐私模式/IDB-OPFS 不可用时的降级载体由场景明示「本次会话不持久」。
 */
export class MemoryStorage implements StorageBackend {
  readonly kind = 'memory';
  private store = new Map<string, { content: string; rev: number; updatedAt: number }>();
  private persistedFlag = false;

  constructor(initial?: Record<string, string>) {
    if (initial) {
      for (const [k, v] of Object.entries(initial)) {
        this.store.set(k, { content: v, rev: 1, updatedAt: Date.now() });
      }
    }
  }

  async list(prefix = ''): Promise<StorageEntry[]> {
    const out: StorageEntry[] = [];
    for (const [name, rec] of this.store) {
      if (prefix && !name.startsWith(prefix)) continue;
      out.push({ name, size: byteSize(rec.content), updatedAt: rec.updatedAt, rev: rec.rev });
    }
    out.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
    return out;
  }

  async read(key: string): Promise<string | null> {
    return this.store.get(key)?.content ?? null;
  }

  async write(key: string, content: string, opts?: { expectedRev?: number }): Promise<StorageWriteResult> {
    const cur = this.store.get(key);
    const now = Date.now();
    if (opts?.expectedRev !== undefined) {
      const currentRev = cur?.rev ?? 0;
      if (currentRev !== opts.expectedRev) {
        // EC-013：冲突标记 —— 不静默覆盖；返回当前版本供读取合并/重试
        return { ok: false, conflict: true, error: `write conflict: 期望 rev=${opts.expectedRev} 实际=${currentRev}`, rev: currentRev, updatedAt: cur?.updatedAt ?? now };
      }
    }
    const rev = (cur?.rev ?? 0) + 1;
    this.store.set(key, { content, rev, updatedAt: now });
    return { ok: true, rev, updatedAt: now };
  }

  async remove(key: string): Promise<boolean> {
    return this.store.delete(key);
  }

  async estimate(): Promise<StorageEstimate> {
    let usage = 0;
    for (const rec of this.store.values()) usage += byteSize(rec.content);
    return { usage, quota: this.persistedFlag ? Number.MAX_SAFE_INTEGER : 50 * 1024 * 1024, persisted: this.persistedFlag };
  }

  async persist(): Promise<boolean> {
    this.persistedFlag = true;
    return true;
  }

  async persisted(): Promise<boolean> {
    return this.persistedFlag;
  }

  async revOf(key: string): Promise<number | null> {
    return this.store.get(key)?.rev ?? null;
  }
}

/** 创建 memory 存储后端（测试/降级默认）。 */
export function createMemoryStorage(initial?: Record<string, string>): StorageBackend {
  return new MemoryStorage(initial);
}

/** 配额超限判断辅助（EC-004：写入结果错误 → 是否配额语义）。 */
export function isQuotaError(err: unknown): boolean {
  if (err instanceof Error) {
    if (err.name === 'QuotaExceededError') return true;
    if (/quota|配额|exceeded/i.test(err.message)) return true;
  }
  return false;
}
