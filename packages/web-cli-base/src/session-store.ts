/**
 * session-store.ts —— 会话持久化存储（FR-034/EC-005/013，S-01/S-02 宿主）。
 *
 * 生态位（discovery §3.3 F 组 ◐）：会话/崩溃恢复生态位 → IDB/OPFS/memory 载体 +
 * 页面重载恢复（应用自己实现）。turns/恢复点序列化为 JSON 文本经 StorageBackend
 * 读写（载体由场景注入：浏览器 = IDB origin 级；node 测试/降级 = memory，EC-005
 * 降级内存态 + 明示「本次会话不持久」）。
 *
 * EC-013 冲突标记/last-write：每键 rev 由 StorageBackend 维护；save(expectedRev)
 * 不匹配 → conflict（多标签并发不静默覆盖）；不带 expectedRev = last-write 语义。
 *
 * runner 主体零改动（ADR-007）：会话恢复/压缩由场景 chat 闭包经 SessionStore 承接，
 * 本模块不 import runner。
 *
 * 本文件零 LGDL/react import（NFR-001）。
 */
import type { ChatTurn } from './llm.js';
import type { StorageBackend, StorageWriteResult } from './storage-mem.js';

export interface SessionResumePoint {
  id: string;
  /** 恢复点对应 turns 数（恢复 = 截取前 N 轮）。 */
  atTurn: number;
  label?: string;
  createdAt: number;
}

/** 持久化会话记录（IDB origin 级；刷新可恢复 FR-034）。 */
export interface SessionRecord {
  id: string;
  createdAt: number;
  updatedAt: number;
  turns: ChatTurn[];
  resumePoints?: SessionResumePoint[];
  /** 上下文压缩摘要（context-tool 写入；原始记录另存档可检索 FR-035）。 */
  summary?: string;
}

export interface SessionSaveResult extends StorageWriteResult {
  id: string;
}

const DEFAULT_PREFIX = 'session';

/** SessionStore —— 会话记录门面（backend 载体注入）。 */
export class SessionStore {
  constructor(
    private backend: StorageBackend,
    private keyPrefix = DEFAULT_PREFIX,
  ) {}

  private keyOf(id: string): string {
    return `${this.keyPrefix}:${id}`;
  }

  /** id 合法化（防 key 注入：仅允许安全字符）。 */
  private normalizeId(id: string): string {
    if (!/^[\w.-]{1,120}$/.test(id)) {
      throw new Error(`非法会话 id "${id}"（允许字母数字/._-，≤120 字符）`);
    }
    return id;
  }

  async save(rec: SessionRecord, opts?: { expectedRev?: number }): Promise<SessionSaveResult> {
    const id = this.normalizeId(rec.id);
    const value = JSON.stringify({ ...rec, id, updatedAt: Date.now() });
    const r = await this.backend.write(this.keyOf(id), value, opts);
    return { ...r, id };
  }

  async load(id: string): Promise<SessionRecord | null> {
    const raw = await this.backend.read(this.keyOf(this.normalizeId(id)));
    if (raw === null) return null;
    try {
      const parsed = JSON.parse(raw) as SessionRecord;
      if (!parsed || typeof parsed.turns === 'undefined') return null;
      return parsed;
    } catch {
      return null;
    }
  }

  /** 最近版本（EC-013 冲突检测/多标签并发观察）。 */
  async revOf(id: string): Promise<number | null> {
    return this.backend.revOf(this.keyOf(this.normalizeId(id)));
  }

  async remove(id: string): Promise<boolean> {
    return this.backend.remove(this.keyOf(this.normalizeId(id)));
  }

  /** 列出全部会话 id。 */
  async list(): Promise<string[]> {
    const entries = await this.backend.list(`${this.keyPrefix}:`);
    return entries.map((e) => e.name.slice(this.keyPrefix.length + 1));
  }

  /** 恢复点管理（FR-034：恢复入口 UI 归场景；base 只做契约/状态）。 */
  async addResumePoint(id: string, label: string): Promise<SessionResumePoint | null> {
    const rec = await this.load(id);
    if (!rec) return null;
    const point: SessionResumePoint = { id: `rp-${Date.now()}`, atTurn: rec.turns.length, label, createdAt: Date.now() };
    rec.resumePoints = [...(rec.resumePoints ?? []), point];
    const r = await this.save(rec);
    if (!r.ok) return null;
    return point;
  }

  async resumePoints(id: string): Promise<SessionResumePoint[]> {
    const rec = await this.load(id);
    return rec?.resumePoints ?? [];
  }

  // ---- 辅助存档（context 压缩前原始记录保留可检索 FR-035） ----

  private auxKey(name: string): string {
    return `${this.keyPrefix}:aux:${name}`;
  }

  async writeAux(name: string, content: string): Promise<StorageWriteResult> {
    if (!/^[\w.:-]{1,200}$/.test(name)) throw new Error(`非法存档名 "${name}"`);
    return this.backend.write(this.auxKey(name), content);
  }

  async readAux(name: string): Promise<string | null> {
    return this.backend.read(this.auxKey(name));
  }

  async listAux(): Promise<string[]> {
    const entries = await this.backend.list(`${this.keyPrefix}:aux:`);
    return entries.map((e) => e.name.slice(this.auxKey('').length));
  }
}

/** 创建会话存储（载体注入：IDB=createIdbStorage；降级/memory=createMemoryStorage）。 */
export function createSessionStore(backend: StorageBackend, opts?: { prefix?: string }): SessionStore {
  return new SessionStore(backend, opts?.prefix ?? DEFAULT_PREFIX);
}
