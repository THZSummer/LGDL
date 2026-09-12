/**
 * Remote event hub — background proxy over the content event bridge (FR-051).
 *
 * The page-world `env.events` hub is reached through the existing content-script
 * event bridge (`site-event` → page `env.events`). That bridge exposes four ops
 * (`subscribe` / `pull` / `unsubscribe` / `status`); the remaining hub methods
 * (`pause` / `resume` / `clear` / `budget` / `switch` / `pull-sensitive`) return
 * a readable「页面事件桥暂不支持」outcome rather than pretending to succeed.
 *
 * Subscription summaries are tracked locally from successful `subscribe` replies
 * so the events tool's `unsubscribe` / `list` paths work without a page `list`
 * op. No new permission is required.
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

/** One bridge reply (content event bridge envelope). */
export interface EventBridgeReply {
  ok: boolean;
  data?: unknown;
  error?: string;
}

export interface RemoteEventHubDeps {
  request(op: 'subscribe' | 'pull' | 'unsubscribe' | 'status', params: Record<string, unknown>): Promise<EventBridgeReply>;
}

interface Tracked {
  kind: PlatformObserveKind;
  label?: string;
  sensitive: boolean;
  delivered: number;
  lastId: number;
}

function unsupported(what: string): PlatformEventOpOutcome {
  return {
    ok: false,
    error: `✖ events ${what} 当前不可用：本插件的页面事件桥仅支持 subscribe/pull/unsubscribe/status（复用现有 content 事件桥），其余操作需页面侧扩展。`,
  };
}

const controller = { active: async () => false };
const sources = new Proxy({} as PlatformEventSources, { get: () => controller });

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
      filterLabel: '',
      sensitive: t.sensitive,
      ...(t.label ? { label: t.label } : {}),
      paused: false,
      autoPaused: false,
      bufferSize: 0,
      bufferLimit: 0,
      dropped: 0,
      delivered: t.delivered,
      lastId: t.lastId,
    }));

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
      });
      return { ok: true, subId: data.subId };
    },
    async unsubscribe(subId: string): Promise<PlatformEventOpOutcome> {
      const r = await deps.request('unsubscribe', { subId });
      if (r.ok) tracked.delete(subId);
      return r.ok ? { ok: true } : { ok: false, error: r.error ?? '页面事件桥退订失败' };
    },
    async list(): Promise<PlatformSubSummary[]> {
      return listImpl();
    },
    async pause(): Promise<PlatformEventOpOutcome> {
      return unsupported('pause');
    },
    async resume(): Promise<PlatformEventOpOutcome> {
      return unsupported('resume');
    },
    async clear(): Promise<PlatformEventOpOutcome> {
      return unsupported('clear');
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
      }
      return data;
    },
    async pullSensitive(): Promise<{ ok: boolean; detail?: string; error?: string }> {
      return {
        ok: false,
        error:
          '✖ events pull-sensitive 当前不可用：本插件的页面事件桥仅支持 subscribe/pull/unsubscribe/status（复用现有 content 事件桥），敏感明细需页面侧扩展。',
      };
    },
    async status(): Promise<PlatformChannelStatus> {
      const r = await deps.request('status', {});
      const data = r.ok ? (r.data as PlatformChannelStatus | undefined) : undefined;
      return data && typeof data === 'object' ? data : { ...emptyStatus, enabled: r.ok, subscriptions: await listImpl() };
    },
    async setBudget(): Promise<PlatformEventOpOutcome> {
      return unsupported('budget');
    },
    async switch(): Promise<PlatformEventOpOutcome> {
      return unsupported('switch');
    },
    sources,
  };
}
