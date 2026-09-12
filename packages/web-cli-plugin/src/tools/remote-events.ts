/**
 * Remote event hub — background proxy over the content event bridge (FR-051).
 *
 * The page-world `env.events` hub is reached through the content-script event
 * bridge (`site-event` → page `env.events`). D3 extends the proxied op set from
 * the original four (`subscribe` / `pull` / `unsubscribe` / `status`) to the full
 * base `events` hub surface the tool can drive (minus `list`, tracked locally):
 *
 *   pause / resume / clear / budget / switch / pull-sensitive
 *
 * Each op is forwarded verbatim to the page hub and its reply is surfaced
 * as-is — there is **no plugin-side hardcoded refusal** and no pretending: a page
 * that does not implement an op answers readably and that answer reaches the tool
 * result unchanged. Subscription summaries are tracked locally from successful
 * replies (and refreshed from `status`) so the events tool's `unsubscribe` /
 * `list` paths work without a page `list` op.
 *
 * Risk discipline (base zero-change): the base `createEventsToolEntry` owns the
 * risk tiers and the `pull-sensitive` untrusted双闸 — `pull-sensitive` stays
 * `risk='write'` + explicit `--trusted true` + ask, evaluated in base *before*
 * `pullSensitive()` is ever called. This proxy never widens that gate; when the
 * page supplies no sensitive detail it returns a specific reason (the bundled
 * browser observe sources supply zero plaintext, FR-006) instead of fabricating.
 *
 * No new permission is required.
 */
import type {
  PlatformChannelStatus,
  PlatformEventHub,
  PlatformEventOpOutcome,
  PlatformEventSources,
  PlatformObserveKind,
  PlatformPullResult,
  PlatformSubResult,
  PlatformSubSummary,
  PlatformSubscribeOptions,
} from '@lgdl/web-cli-base';
import type { WebCliEventOp } from '../content/page-bridge.js';

/** One bridge reply (content event bridge envelope). */
export interface EventBridgeReply {
  ok: boolean;
  data?: unknown;
  error?: string;
}

export interface RemoteEventHubDeps {
  request(op: WebCliEventOp, params: Record<string, unknown>): Promise<EventBridgeReply>;
}

interface Tracked {
  kind: PlatformObserveKind;
  label?: string;
  sensitive: boolean;
  delivered: number;
  lastId: number;
  paused: boolean;
  autoPaused: boolean;
  bufferSize: number;
  bufferLimit: number;
  dropped: number;
  filterLabel: string;
}

/**
 * D3 honest reason for `pull-sensitive` when the page supplies no retained
 * plaintext detail. It names what is missing page-side and reaffirms the gate
 * is untouched — never a generic refusal.
 */
export const SENSITIVE_DETAIL_UNAVAILABLE =
  '✖ events pull-sensitive 无敏感明细可取：页面观察源未提供敏感明文明细' +
  '（base FR-006 保守：真实浏览器内置观察源当前零明文供给；本插件不缓存任何明细）。' +
  '门禁未放宽：--trusted true 显式声明 + risk write + ask 由 base 执行器在转发前判定。';

/** Source label attached to any sensitive detail the page does supply. */
export function sensitiveSourceLabel(subId: string, seq: number): string {
  return `【敏感来源：页面事件桥 sensitiveDetail（subId=${subId} seq=${seq}）；经 --trusted true + risk write 门禁放行；插件侧零缓存 / 零审计明文】`;
}

const controller = { active: async () => false };
const sources = new Proxy({} as PlatformEventSources, { get: () => controller });

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

export function createRemoteEventHub(deps: RemoteEventHubDeps): PlatformEventHub {
  const tracked = new Map<string, Tracked>();

  const failPull = (error: string): PlatformPullResult => ({
    ok: false,
    events: [],
    lastId: 0,
    dropped: 0,
    delivered: 0,
    bufferSize: 0,
    autoPaused: false,
    error,
  });

  const emptyStatus: PlatformChannelStatus = {
    enabled: false,
    subscriptionCount: 0,
    totalBuffered: 0,
    disabledDropped: 0,
    rateDropped: 0,
    budgets: {} as PlatformChannelStatus['budgets'],
    subscriptions: [],
  };

  const listImpl = async (): Promise<PlatformSubSummary[]> =>
    [...tracked.entries()].map(([subId, t]) => ({
      subId,
      kind: t.kind,
      filterLabel: t.filterLabel,
      sensitive: t.sensitive,
      ...(t.label ? { label: t.label } : {}),
      paused: t.paused,
      autoPaused: t.autoPaused,
      bufferSize: t.bufferSize,
      bufferLimit: t.bufferLimit,
      dropped: t.dropped,
      delivered: t.delivered,
      lastId: t.lastId,
    }));

  /** Refresh local tracking from a page `status` reply (page is authoritative). */
  const syncStatus = (st: PlatformChannelStatus): void => {
    if (!Array.isArray(st.subscriptions)) return;
    for (const s of st.subscriptions) {
      if (!s || typeof s.subId !== 'string') continue;
      tracked.set(s.subId, {
        kind: s.kind,
        ...(s.label ? { label: s.label } : {}),
        sensitive: s.sensitive === true,
        delivered: typeof s.delivered === 'number' ? s.delivered : 0,
        lastId: typeof s.lastId === 'number' ? s.lastId : 0,
        paused: s.paused === true,
        autoPaused: s.autoPaused === true,
        bufferSize: typeof s.bufferSize === 'number' ? s.bufferSize : 0,
        bufferLimit: typeof s.bufferLimit === 'number' ? s.bufferLimit : 0,
        dropped: typeof s.dropped === 'number' ? s.dropped : 0,
        filterLabel: typeof s.filterLabel === 'string' ? s.filterLabel : '',
      });
    }
  };

  /** Best-effort page status read (used by `list`/`status` for authoritative data). */
  const readStatus = async (): Promise<PlatformChannelStatus | undefined> => {
    const r = await deps.request('status', {});
    if (!r.ok || !isRecord(r.data)) return undefined;
    return r.data as unknown as PlatformChannelStatus;
  };

  /**
   * Forward one control op and update local tracking on success. The page reply
   * is the source of truth; failures surface the page's own readable reason.
   */
  const forwardOp = async (
    op: Extract<WebCliEventOp, 'pause' | 'resume' | 'clear' | 'switch'>,
    params: Record<string, unknown>,
    subId?: string,
  ): Promise<PlatformEventOpOutcome> => {
    const r = await deps.request(op, params);
    if (!r.ok) return { ok: false, error: r.error ?? `页面事件桥 ${op} 失败` };
    const data = isRecord(r.data) ? r.data : undefined;
    if (data && data.ok === false) return { ok: false, error: typeof data.error === 'string' ? data.error : `页面事件桥 ${op} 失败` };
    if (subId !== undefined) {
      const t = tracked.get(subId);
      if (t) {
        if (op === 'pause') t.paused = true;
        else if (op === 'resume') {
          t.paused = false;
          t.autoPaused = false;
          t.delivered = 0; // base resume resets the cumulative budget cycle (FR-014)
        } else if (op === 'clear') t.bufferSize = 0;
      }
    }
    return { ok: true };
  };

  return {
    async subscribe(opts: PlatformSubscribeOptions): Promise<PlatformSubResult> {
      const r = await deps.request('subscribe', { ...opts });
      if (!r.ok) return { ok: false, error: r.error ?? '页面事件桥订阅失败' };
      const data = r.data as { ok?: boolean; subId?: string; error?: string } | undefined;
      if (!data || data.ok !== true || !data.subId) return { ok: false, error: data?.error ?? '页面事件桥未返回 subId' };
      tracked.set(data.subId, {
        kind: opts.kind,
        ...(opts.label ? { label: opts.label } : {}),
        sensitive: opts.sensitive === true,
        delivered: 0,
        lastId: 0,
        paused: false,
        autoPaused: false,
        bufferSize: 0,
        bufferLimit: opts.budget?.bufferLimit ?? 0,
        dropped: 0,
        filterLabel: '',
      });
      return { ok: true, subId: data.subId };
    },
    async unsubscribe(subId: string): Promise<PlatformEventOpOutcome> {
      const r = await deps.request('unsubscribe', { subId });
      if (r.ok) tracked.delete(subId);
      return r.ok ? { ok: true } : { ok: false, error: r.error ?? '页面事件桥退订失败' };
    },
    async list(): Promise<PlatformSubSummary[]> {
      // Prefer the page's authoritative summaries (reflects pause / budget /
      // auto-pause); fall back to local tracking when the page cannot answer.
      const st = await readStatus();
      if (st?.subscriptions && st.subscriptions.length > 0) {
        syncStatus(st);
        return st.subscriptions;
      }
      return listImpl();
    },
    async pause(subId: string): Promise<PlatformEventOpOutcome> {
      return forwardOp('pause', { subId }, subId);
    },
    async resume(subId: string): Promise<PlatformEventOpOutcome> {
      return forwardOp('resume', { subId }, subId);
    },
    async clear(subId: string): Promise<PlatformEventOpOutcome> {
      return forwardOp('clear', { subId }, subId);
    },
    async pull(subId: string, opts?: { lastId?: number; max?: number }): Promise<PlatformPullResult> {
      const r = await deps.request('pull', { subId, ...(opts ?? {}) });
      if (!r.ok) return failPull(r.error ?? '页面事件桥拉取失败');
      const data = r.data as PlatformPullResult | undefined;
      if (!data || typeof data !== 'object') return failPull('页面事件桥返回了非结构化拉取结果');
      const t = tracked.get(subId);
      if (t) {
        if (typeof data.lastId === 'number') t.lastId = data.lastId;
        if (typeof data.delivered === 'number') t.delivered = data.delivered;
        if (typeof data.dropped === 'number') t.dropped = data.dropped;
        if (typeof data.bufferSize === 'number') t.bufferSize = data.bufferSize;
        if (typeof data.autoPaused === 'boolean') t.autoPaused = data.autoPaused;
      }
      return data;
    },
    async pullSensitive(subId: string, seq: number): Promise<{ ok: boolean; detail?: string; error?: string }> {
      // NOTE: base's executor has already enforced `--trusted true` + `risk='write'`
      // + ask before this runs. Forwarding cannot widen that gate.
      const r = await deps.request('pull-sensitive', { subId, seq });
      if (!r.ok) return { ok: false, error: r.error ?? SENSITIVE_DETAIL_UNAVAILABLE };
      const data = isRecord(r.data) ? r.data : undefined;
      if (!data || data.ok !== true || typeof data.detail !== 'string' || data.detail === '') {
        return { ok: false, error: (data && typeof data.error === 'string' && data.error) || SENSITIVE_DETAIL_UNAVAILABLE };
      }
      return { ok: true, detail: `${sensitiveSourceLabel(subId, seq)}\n${data.detail}` };
    },
    async status(): Promise<PlatformChannelStatus> {
      const st = await readStatus();
      if (st) {
        syncStatus(st);
        return st;
      }
      return { ...emptyStatus, subscriptions: await listImpl() };
    },
    async setBudget(opts): Promise<PlatformEventOpOutcome> {
      const params: Record<string, unknown> = { subId: opts.subId };
      if (opts.bufferLimit !== undefined) params.bufferLimit = opts.bufferLimit;
      if (opts.autoPauseAt !== undefined) params.autoPauseAt = opts.autoPauseAt;
      const r = await deps.request('budget', params);
      if (!r.ok) return { ok: false, error: r.error ?? '页面事件桥预算调整失败' };
      const data = isRecord(r.data) ? r.data : undefined;
      if (data && data.ok === false) return { ok: false, error: typeof data.error === 'string' ? data.error : '页面事件桥预算调整失败' };
      const t = tracked.get(opts.subId);
      if (t) {
        if (typeof opts.bufferLimit === 'number') t.bufferLimit = opts.bufferLimit;
      }
      return { ok: true };
    },
    async switch(on: boolean): Promise<PlatformEventOpOutcome> {
      return forwardOp('switch', { on });
    },
    sources,
  };
}
