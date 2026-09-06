/**
 * collect.ts —— CollectBuffer：session 内存态采集缓冲（FR-038~042 / ADR-006 / P-04 默认）。
 *
 * 数据通路（plan §2.3.5 / ADR-006）：extract（声明式 selectors → ops.extractData）
 *   → CollectBuffer.append(id, rows, meta{url, at, trust:'untrusted'}，护栏/脱敏写单点)
 *   → export --format text|json|csv（RFC4180）/ xlsx out（注入扩展点，collect-tools）
 *   → env.filePicker.save/download 落盘（手势拒绝 → 下载链降级 EC-012）。
 *
 * 生命周期 = **session 内存态**（P-04 默认）：刷新即失、导出即落盘 = 采集价值链闭环；
 * 跨刷新恢复 out（v2 jobs 先例）；本模块零持久化。
 *
 * 写入护栏单点（FR-042 / EC-011，全部经 append）：
 *   - 单次 maxItems 上限（默认 200，可配）——超限截断保留前 N 条（truncated 标记）
 *   - 缓冲总量上限（默认 5000，可配）——按剩余容量收容（放不下整批则截断），
 *     容量为 0 时后续 append 返回 over-cap 中止（已采数据保留可导出，EC-011）
 *   - 限速间隔（两次 append 最小间隔，默认 300ms，可配）——翻页循环防抖
 *   - 可选去重（行 JSON hash，键序归一）——翻页重复页去重（FR-039 无重复）
 * 脱敏单点（FR-024/EC-005）：append 写入路径对敏感内容（密码/凭据列、
 *   表单字段描述行）按 sensitive.ts 脱敏，导出即不可能含明文。
 *
 * 本文件零 DOM/lgdl/react import（NFR-001），node 可直接单测（时钟注入）。
 */
import { maskValue, sensitiveFieldMatch } from './sensitive.js';
import type { SensitiveKind } from './sensitive.js';

/** 采集行 = 扁平结构化对象（列名 → 值；值可为标量/嵌套纯数据）。 */
export type CollectRow = Record<string, unknown>;

/** 可信级（对齐 audit ContentTrust.level；采集面缺省 untrusted，FR-042）。 */
export type CollectTrust = 'trusted' | 'untrusted' | 'unknown';

/** 条目元数据（来源上下文，导出元数据头 / 下游消费方识别外部数据面，FR-042）。 */
export interface CollectMeta {
  /** 来源 URL（首个采集页；翻页同源 URL 稳定）。 */
  url: string;
  /** 采集时间（epoch ms；每次成功 append 刷新为最近时间）。 */
  at: number;
  /** 可信级（缺省 'untrusted' = 外部数据面，提示注入不回显执行）。 */
  trust: CollectTrust;
  /** 附加结构信息（extract 首采时记 kind/fields；可选）。 */
  schema?: { fields?: string[]; kind?: string } | null;
}

/** 条目级统计（累计口径；dropped/truncated 反映护栏触发历史，EC-011）。 */
export interface CollectEntryStats {
  /** 成功 append 调用次数（含 0 行 no-op 调用不计入？——计入有行写入）。 */
  appends: number;
  /** 因护栏丢弃行数累计（单次超限 + 总量满截断）。 */
  droppedRows: number;
  /** 去重跳过行数累计。 */
  duplicateDropped: number;
  /** 是否曾触发截断（droppedRows > 0）。 */
  truncated: boolean;
  /** 首次写入时间（epoch ms；0 = 从未写入）。 */
  firstAt: number;
  /** 最近成功写入时间（epoch ms；0 = 从未写入；限速基准）。 */
  lastAt: number;
}

/** 缓冲条目（同 id 多页增量 append 累积；id = AI 翻页循环的稳定句柄）。 */
export interface CollectEntry {
  id: string;
  rows: CollectRow[];
  meta: CollectMeta;
  stats: CollectEntryStats;
}

/** 全缓冲统计（导出/观测）。 */
export interface CollectBufferStats {
  /** 条目数。 */
  entries: number;
  /** 全部条目行数合计（总量护栏口径）。 */
  totalRows: number;
  /** 护栏丢弃行累计。 */
  droppedRows: number;
  /** 去重跳过累计。 */
  duplicateDropped: number;
  /** 触发过截断的条目数。 */
  truncatedEntries: number;
  /** 全缓冲最近写入时间（epoch ms；0 = 从未写入）。 */
  lastAppendAt: number;
}

/** 缓冲护栏默认值（FR-042：预算值一致收敛于本文件，供 collect-tools/场景引用）。 */
export const COLLECT_DEFAULT_MAX_ITEMS_PER_APPEND = 200;
export const COLLECT_DEFAULT_MAX_TOTAL_ROWS = 5000;
export const COLLECT_DEFAULT_MIN_INTERVAL_MS = 300;
export const COLLECT_DEFAULT_DEDUPE = false;

/** 缓冲工厂配置（全部可配；缺省 = FR-042 默认护栏）。 */
export interface CollectBufferOptions {
  /** 单次 append 行数上限（默认 200）。 */
  maxItemsPerAppend?: number;
  /** 缓冲总量上限（默认 5000；满 → over-cap 中止，EC-011）。 */
  maxTotalRows?: number;
  /** 两次 append 最小间隔 ms（默认 300；翻页防抖，FR-042）。 */
  minAppendIntervalMs?: number;
  /** 可选去重（默认关；开 = 按行 JSON hash 跳过重复行，FR-039）。 */
  dedupe?: boolean;
  /** 写入路径敏感脱敏开关（默认 true = 写单点脱敏，FR-024/EC-005）。 */
  maskSensitive?: boolean;
  /** 时钟注入（默认 Date.now；测试断言限速用）。 */
  now?: () => number;
}

/** 成功 append 结果（extract 摘要数据源）。 */
export interface CollectAppendOk {
  /** 本次实际写入行数。 */
  appended: number;
  /** 本条目累计行数（写入后）。 */
  entryRows: number;
  /** 全缓冲累计行数（写入后）。 */
  totalRows: number;
  /** 本次因护栏丢弃行数（单次超限 + 总量满截断）。 */
  dropped: number;
  /** 本次去重跳过行数。 */
  duplicateDropped: number;
  /** 本次是否触发截断（dropped > 0）。 */
  truncated: boolean;
  /** 写入后缓冲总量是否已满（后续 append 将 over-cap，EC-011）。 */
  cappedOut: boolean;
  /** 本次是否新建条目（false = 增量 append 既有 id）。 */
  created: boolean;
}

/** 中止原因（EC-011 中止保留已采数据）。 */
export type CollectAppendBlock =
  | { reason: 'rate-limited'; waitMs: number; intervalMs: number }
  | { reason: 'over-cap'; totalRows: number; maxTotalRows: number };

export type CollectAppendResult =
  | { ok: true; result: CollectAppendOk }
  | { ok: false; block: CollectAppendBlock };

/** 限速预检结果（工具在调用 ops.extractData **之前**预检，避免无谓 DOM 抽取，FR-042）。 */
export type CollectRateCheck =
  | { ok: true; entryExists: boolean }
  | { ok: false; reason: 'rate-limited'; waitMs: number; intervalMs: number };

/** CollectBuffer 工厂产物（session 内存态；组装点 createCollectTools 共享注入）。 */
export interface CollectBuffer {
  /** 全缓冲累计行数（快捷；等价 stats().totalRows）。 */
  readonly totalRows: number;
  /** 有效护栏配置（默认值已落位，只读）。 */
  readonly options: Required<Omit<CollectBufferOptions, 'now'>> & { now: () => number };
  /**
   * 写入单点（护栏 + 脱敏）：append(id, rows, meta?)。
   * 0 行且 id 不存在 → 不建条目（ok + appended 0）；id 已存在允许 0 行 no-op。
   * 新建条目 meta 缺省 {url:'', at:now, trust:'untrusted'}；后续 append 仅刷新 meta.at。
   * 中止（rate-limited / over-cap）→ ok:false + 原因，已采数据保留（EC-011）。
   */
  append(id: string, rows: CollectRow[], meta?: Partial<CollectMeta>): CollectAppendResult;
  /** 读取条目（未采集该 id → undefined）。 */
  get(id: string): CollectEntry | undefined;
  /** 是否已采集该 id。 */
  has(id: string): boolean;
  /** 全部条目（按 id 首采序）。 */
  list(): CollectEntry[];
  /** 全缓冲统计。 */
  stats(): CollectBufferStats;
  /** 限速预检（工具 ops 调用前使用；返回还需等待 ms）。 */
  checkAppendReady(id: string): CollectRateCheck;
  /** 释放内存态（单条目或全部；场景导出完成后可调用——本任务不工具化）。 */
  clear(id?: string): void;
}

/** 行 JSON hash 键序归一（去重稳定：键序不同内容相同判重复）。 */
function rowHash(row: CollectRow): string {
  const keys = Object.keys(row).sort();
  const stable: Record<string, unknown> = {};
  for (const k of keys) stable[k] = row[k];
  return JSON.stringify(stable);
}

/** 敏感分类 → 脱敏占位文案标签（maskValue kind 参数）。 */
const SENSITIVE_KIND_LABEL: Record<SensitiveKind, string> = {
  password: '密码',
  credential: '凭据',
  otp: '验证码',
  card: '卡号',
};

/** 按列名（表头）脱敏：列名命中凭据词元 → 值以占位代替（保守取向宁可遮不可漏，FR-024）。 */
function maskCellByColumn(value: unknown, key: string): unknown {
  if (typeof value !== 'string' || value === '') return value;
  const m = sensitiveFieldMatch({ name: key });
  return m ? maskValue(value, SENSITIVE_KIND_LABEL[m.kind]) : value;
}

/** 行内字段身份面（表单字段描述行形态：name/id/type/autocomplete + value）。 */
function descriptorIdentity(row: CollectRow): { type?: string; name?: string; id?: string; autocomplete?: string } | null {
  const has = (k: string) => typeof row[k] === 'string';
  if (!has('value')) return null;
  const any = has('name') || has('id') || has('type') || has('autocomplete');
  return any
    ? {
        name: has('name') ? (row.name as string) : undefined,
        id: has('id') ? (row.id as string) : undefined,
        type: has('type') ? (row.type as string) : undefined,
        autocomplete: has('autocomplete') ? (row.autocomplete as string) : undefined,
      }
    : null;
}

/**
 * 单行脱敏（FR-024/EC-005，写路径单点调用）：
 *   ① 表单字段描述行（{name/id/type/autocomplete…, value}）——经完整 FieldIdentity 信号
 *      （type=password/autocomplete/name·id 凭据启发式）命中 → 脱敏其 value 单元；
 *   ② 其余按**列名**启发式脱敏（列名如 password/token/apikey/card… → 该列全部值脱敏）。
 * 非敏感内容逐字节保持（FR-024 尾句：非敏感字段不受影响）。
 */
export function maskCollectRow(row: CollectRow): CollectRow {
  const out: CollectRow = {};
  const ident = descriptorIdentity(row);
  const identMatch = ident ? sensitiveFieldMatch(ident) : null;
  for (const [k, v] of Object.entries(row)) {
    if (identMatch && k === 'value') {
      out[k] = typeof v === 'string' ? maskValue(v, SENSITIVE_KIND_LABEL[identMatch.kind]) : v;
      continue;
    }
    out[k] = maskCellByColumn(v, k);
  }
  return out;
}

/** 行集脱敏（单点护栏；每行独立脱敏，返回新数组不修改入参）。 */
export function maskCollectRows(rows: CollectRow[]): CollectRow[] {
  return rows.map(maskCollectRow);
}

/** 全字段并集（首见序；csv 表头 / text 列对齐 / json fields 共用的事实源）。 */
export function collectFields(rows: CollectRow[]): string[] {
  const fields: string[] = [];
  const seen = new Set<string>();
  for (const r of rows) {
    for (const k of Object.keys(r)) {
      if (!seen.has(k)) {
        seen.add(k);
        fields.push(k);
      }
    }
  }
  return fields;
}

function makeStats(): CollectEntryStats {
  return { appends: 0, droppedRows: 0, duplicateDropped: 0, truncated: false, firstAt: 0, lastAt: 0 };
}

/** 工厂（组装点 createCollectTools 共享注入 extract/export；session 生命周期）。 */
export function createCollectBuffer(opts: CollectBufferOptions = {}): CollectBuffer {
  const maxItemsPerAppend = opts.maxItemsPerAppend ?? COLLECT_DEFAULT_MAX_ITEMS_PER_APPEND;
  const maxTotalRows = opts.maxTotalRows ?? COLLECT_DEFAULT_MAX_TOTAL_ROWS;
  const minAppendIntervalMs = opts.minAppendIntervalMs ?? COLLECT_DEFAULT_MIN_INTERVAL_MS;
  const dedupe = opts.dedupe ?? COLLECT_DEFAULT_DEDUPE;
  const maskSensitive = opts.maskSensitive ?? true;
  const now = opts.now ?? Date.now;
  const entries = new Map<string, CollectEntry>();
  /** 去重判重集（按条目持久；跨 append 翻页重复页去重，FR-039 无重复）。 */
  const seenHashes = new Map<string, Set<string>>();

  const effective = {
    maxItemsPerAppend,
    maxTotalRows,
    minAppendIntervalMs,
    dedupe,
    maskSensitive,
    now,
  };

  const totalRowsOf = () => {
    let n = 0;
    for (const e of entries.values()) n += e.rows.length;
    return n;
  };

  function ensureEntry(id: string, meta: Partial<CollectMeta> | undefined, ts: number): CollectEntry {
    let e = entries.get(id);
    if (!e) {
      e = {
        id,
        rows: [],
        meta: {
          url: meta?.url ?? '',
          at: meta?.at ?? ts,
          trust: meta?.trust ?? 'untrusted',
          schema: meta?.schema ?? null,
        },
        stats: makeStats(),
      };
      entries.set(id, e);
    }
    return e;
  }

  function append(id: string, rows: CollectRow[], meta?: Partial<CollectMeta>): CollectAppendResult {
    // id 空 = 拒绝（executor 先校验必填/默认 'default'，此处双保险：整批丢弃不落缓冲）
    if (!id) {
      return {
        ok: true,
        result: { appended: 0, entryRows: 0, totalRows: totalRowsOf(), dropped: rows.length, duplicateDropped: 0, truncated: rows.length > 0, cappedOut: false, created: false },
      };
    }
    const ts = now();
    const masked = maskSensitive ? maskCollectRows(rows) : rows.map((r) => ({ ...r }));

    // 0 行：已存在条目 → no-op ok；不存在 → 不建条目（无匹配不占缓冲）
    if (masked.length === 0) {
      const e0 = entries.get(id);
      if (!e0) {
        return {
          ok: true,
          result: { appended: 0, entryRows: 0, totalRows: totalRowsOf(), dropped: 0, duplicateDropped: 0, truncated: false, cappedOut: false, created: false },
        };
      }
      return {
        ok: true,
        result: { appended: 0, entryRows: e0.rows.length, totalRows: totalRowsOf(), dropped: 0, duplicateDropped: 0, truncated: false, cappedOut: totalRowsOf() >= maxTotalRows, created: false },
      };
    }

    const entry = ensureEntry(id, meta, ts);

    // 限速单点（同 id 两次写入最小间隔；首写不限 —— 以 appends 计数判别，lastAt=0 亦合法）
    if (entry.stats.appends > 0) {
      const gap = ts - entry.stats.lastAt;
      if (gap < minAppendIntervalMs) {
        return { ok: false, block: { reason: 'rate-limited', waitMs: minAppendIntervalMs - gap, intervalMs: minAppendIntervalMs } };
      }
    }

    let duplicateDropped = 0;
    let pending = masked;

    // 去重（行 JSON hash，键序归一；判重集按条目持久 = 翻页重复页整批判重，FR-039 无重复）。
    // 判重先于护栏：容量已满时整批重复行不误报 over-cap（无新增行 = 无需写）。
    if (dedupe) {
      const persisted = seenHashes.get(id) ?? new Set<string>();
      const local = new Set<string>(persisted);
      const uniq: CollectRow[] = [];
      for (const r of masked) {
        const h = rowHash(r);
        if (local.has(h)) {
          duplicateDropped++;
          continue;
        }
        local.add(h);
        uniq.push(r);
      }
      pending = uniq;
    }

    // 护栏容量（单次上限 → 剩余总量容量；丢弃 = 截断，EC-011 保留已采）
    let dropped = 0;
    let list = pending;
    if (list.length > maxItemsPerAppend) {
      list = list.slice(0, maxItemsPerAppend);
      dropped += pending.length - maxItemsPerAppend;
    }
    const space = maxTotalRows - totalRowsOf();
    if (space <= 0) {
      // 容量为 0：整批中止（已采数据保留可导出，EC-011）
      return { ok: false, block: { reason: 'over-cap', totalRows: totalRowsOf(), maxTotalRows } };
    }
    if (list.length > space) {
      list = list.slice(0, space);
      dropped += pending.length - space;
    }

    if (list.length === 0) {
      // 整批均重复/无剩余容量：不建条目（若刚建的空条目回收），已采数据不受影响
      if (entry.rows.length === 0) {
        entries.delete(id);
        seenHashes.delete(id);
      }
      return {
        ok: true,
        result: { appended: 0, entryRows: entry.rows.length, totalRows: totalRowsOf(), dropped, duplicateDropped, truncated: dropped > 0, cappedOut: totalRowsOf() >= maxTotalRows, created: false },
      };
    }

    const isNew = entry.stats.appends === 0;
    entry.rows.push(...list);
    entry.meta.at = ts;
    entry.stats.appends += 1;
    entry.stats.droppedRows += dropped;
    entry.stats.duplicateDropped += duplicateDropped;
    if (dropped > 0) entry.stats.truncated = true;
    if (entry.stats.firstAt === 0) entry.stats.firstAt = ts;
    entry.stats.lastAt = ts;
    if (dedupe) {
      // 判重集只落实际入库行（护栏截断丢弃的行不占位）
      const persisted = seenHashes.get(id) ?? new Set<string>();
      for (const r of list) persisted.add(rowHash(r));
      seenHashes.set(id, persisted);
    }

    return {
      ok: true,
      result: {
        appended: list.length,
        entryRows: entry.rows.length,
        totalRows: totalRowsOf(),
        dropped,
        duplicateDropped,
        truncated: dropped > 0,
        cappedOut: totalRowsOf() >= maxTotalRows,
        created: isNew,
      },
    };
  }

  return {
    get totalRows() {
      return totalRowsOf();
    },
    options: effective,
    append,
    get(id: string) {
      return entries.get(id);
    },
    has(id: string) {
      return entries.has(id);
    },
    list() {
      return [...entries.values()];
    },
    stats() {
      let totalRows = 0;
      let droppedRows = 0;
      let duplicateDropped = 0;
      let truncatedEntries = 0;
      let lastAppendAt = 0;
      for (const e of entries.values()) {
        totalRows += e.rows.length;
        droppedRows += e.stats.droppedRows;
        duplicateDropped += e.stats.duplicateDropped;
        if (e.stats.truncated) truncatedEntries += 1;
        if (e.stats.lastAt > lastAppendAt) lastAppendAt = e.stats.lastAt;
      }
      return { entries: entries.size, totalRows, droppedRows, duplicateDropped, truncatedEntries, lastAppendAt };
    },
    checkAppendReady(id: string): CollectRateCheck {
      const e = entries.get(id);
      if (!e || e.stats.appends <= 0) return { ok: true, entryExists: !!e };
      const gap = now() - e.stats.lastAt;
      if (gap < minAppendIntervalMs) {
        return { ok: false, reason: 'rate-limited', waitMs: minAppendIntervalMs - gap, intervalMs: minAppendIntervalMs };
      }
      return { ok: true, entryExists: true };
    },
    clear(id?: string) {
      if (id === undefined) {
        entries.clear();
        seenHashes.clear();
      } else {
        entries.delete(id);
        seenHashes.delete(id);
      }
    },
  };
}
