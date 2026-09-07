/**
 * platform-events.ts —— 浏览器面事件观察源工厂（TASK-004，EVT FR-003/008~015 + ADR-002/003/005/008）。
 *
 * `createBrowserEventHub(scope?)` 产出 PlatformEventHub（env.events 缝浏览器真实现）：
 *   - 内部装配纯逻辑 EventBus（event-bus.ts，node 可测机制）+ **观察源集合**（本文件浏览器面）。
 *   - **构造零副作用**（NFR-007）：观察源惰性安装 —— 某 kind 首个订阅时挂载（监听器/patch），
 *     末退订卸载还原；无订阅零监听器零 patch 零轮询（真实页面零侵入）。
 *   - 观察源（TASK-004）：①domObserve（document capture 期委托；键入敏感面无明文值，
 *     FR-009/FR-006）；②lifecycle（hashchange/popstate/visibilitychange/pagehide/beforeunload，
 *     FR-010；只产生事件、不干预 v3 reload ask 语义）；③consolePatch（console.* 惰性 patch，
 *     level + 脱敏文本摘要 + 原输出透传 DevTools，FR-011）；④networkPatch **观察**（fetch/XHR
 *     包装：method/URL（查询串脱敏）/status/耗时/响应头子集/响应体默认不读，FR-012/ADR-008）。
 *   - synthetic 来源标记（FR-015）：dom 捕获 handler 读 platform-dom 模块级 synthetic 标志
 *     （isSyntheticDispatch）→ 事件负载 source:"synthetic"；页面真实事件缺省 "page"。
 *   - 装配位：platform.ts browserEnv() 单点 `events: createBrowserEventHub(...)`。
 *
 * 分层纪律：本文件与 platform-dom.ts 同为 DOM/window 触碰收敛面（v4 扩展，plan §2.2）——
 * 一次性 DOM ops 在 platform-dom.ts；本文件承载**有生命周期/跨工具共享**的观察/patch 源。
 * 结构化读取浏览器全局（base 零额外依赖 NFR-002），node 面以 scope shim 注入单测。
 *
 * 后续增量（同文件所有权串行）：TASK-006 追加 dialogOverride 源；TASK-008 追加 pasteCapture 源；
 * TASK-012 networkPatch 扩展拦截引擎。本文件零 lgdl/react import（NFR-001）。
 */
import { EventBus, DEFAULT_BUDGETS } from './event-bus.js';
import type {
  BusEventKind,
  IngestEvent,
} from './event-bus.js';
import { applyNetRules, netRuleMatches } from './net-tools.js';
import { isSyntheticDispatch } from './platform-dom.js';
import { resolveDialogAction } from './dialog-policy.js';
import {
  sensitiveFieldMatch,
  maskValue,
  redactUrlQuery,
  maskTextPayload,
  CONSOLE_TEXT_POLICY,
  DIALOG_TEXT_POLICY,
  RICH_CLIPBOARD_TEXT_POLICY,
  TYPING_PAYLOAD_POLICY,
} from './sensitive.js';
import type {
  PlatformBudgetOptions,
  PlatformDialogRuleSpec,
  PlatformEventHub,
  PlatformEventOpOutcome,
  PlatformEventSources,
  PlatformNetRuleSpec,
  PlatformObserveKind,
  PlatformPasteCaptureItem,
  PlatformPullResult,
  PlatformSubResult,
  PlatformSubscribeOptions,
  PlatformSubSummary,
} from './platform.js';

/** 可注入 scope（同 DomOpsScope 形态：document/window 结构化面；node 测试 shim 注入）。 */
export interface BrowserEventScope {
  document?: unknown;
  window?: unknown;
}

// ---------- 结构化浏览器面（零 DOM lib 依赖读取；node 安全） ----------

interface ListenerHost {
  addEventListener?: (type: string, fn: (ev: unknown) => void, capture?: boolean) => void;
  removeEventListener?: (type: string, fn: (ev: unknown) => void, capture?: boolean) => void;
}

interface DocLike extends ListenerHost {
  visibilityState?: string;
  location?: { href?: string };
}

interface WinLike extends ListenerHost {
  location?: { href?: string };
  fetch?: typeof fetch;
  XMLHttpRequest?: unknown;
  console?: ConsoleLike;
}

interface ConsoleLike {
  log?: (...a: unknown[]) => void;
  warn?: (...a: unknown[]) => void;
  error?: (...a: unknown[]) => void;
  info?: (...a: unknown[]) => void;
  debug?: (...a: unknown[]) => void;
}

function viewOf(scope?: BrowserEventScope): { doc: DocLike | null; win: WinLike | null } {
  const g = globalThis as Record<string, unknown>;
  if (scope && (scope.document !== undefined || scope.window !== undefined)) {
    return {
      doc: (scope.document as DocLike) ?? null,
      win: (scope.window as WinLike) ?? null,
    };
  }
  return { doc: (g.document as DocLike) ?? null, win: (g.window as WinLike) ?? null };
}

/** DOM 捕获期监听类型清单（FR-009：click/keydown/input/change/paste/copy/scroll/submit 等）。 */
const DOM_OBSERVE_EVENT_TYPES = [
  'click', 'dblclick', 'contextmenu', 'keydown', 'keyup', 'input', 'change', 'submit',
  'paste', 'copy', 'cut', 'scroll', 'resize', 'mousemove', 'mouseover', 'mouseout',
  'mousedown', 'mouseup', 'focus', 'blur', 'dragstart', 'drop',
] as const;

/** 生命周期事件挂载点（FR-010）。 */
const LIFECYCLE_WINDOW_EVENTS = ['hashchange', 'popstate', 'pagehide', 'beforeunload'] as const;
const LIFECYCLE_DOC_EVENTS = ['visibilitychange'] as const;

/** console 级别集合（FR-011）。 */
const CONSOLE_LEVELS = ['log', 'warn', 'error', 'info', 'debug'] as const;

/** 事件文本/值摘要截断预算（负载预算 4KB 之上再降：单字段摘要更小，防 meta 撑爆）。 */
const FIELD_TEXT_MAX = 200;

function truncateField(s: string, max = FIELD_TEXT_MAX): string {
  return s.length > max ? `${s.slice(0, max)}…` : s;
}

/** target 摘要（id → "#id" 稳定 selector 形态；否则 "标签 \"文本前缀\""）。 */
function describeDomTarget(t: unknown): string {
  if (!t || typeof t !== 'object') return '';
  const el = t as { tagName?: unknown; id?: unknown; getAttribute?: (n: string) => string | null; textContent?: unknown };
  const tag = typeof el.tagName === 'string' ? el.tagName.toLowerCase() : '';
  const id =
    typeof el.id === 'string'
      ? el.id
      : typeof el.getAttribute === 'function'
        ? (el.getAttribute('id') ?? '')
        : '';
  if (id !== '') return `#${id}`;
  if (tag === '') return '';
  const text = typeof el.textContent === 'string' ? el.textContent.trim() : '';
  if (text !== '') return `${tag} "${truncateField(text, 24)}"`;
  return tag;
}

/** 目标字段身份（敏感判定：type/name/id/autocomplete 结构化读取）。 */
function fieldIdentityOfTarget(t: unknown): { type?: string; name?: string; id?: string; autocomplete?: string } {
  if (!t || typeof t !== 'object') return {};
  const el = t as { tagName?: unknown; getAttribute?: (n: string) => string | null; type?: unknown };
  const attr = (n: string): string | undefined => (typeof el.getAttribute === 'function' ? el.getAttribute(n) ?? undefined : undefined);
  const tag = typeof el.tagName === 'string' ? el.tagName.toLowerCase() : '';
  return {
    type: attr('type') ?? (tag === 'input' ? (typeof el.type === 'string' ? el.type : undefined) : undefined),
    name: attr('name'),
    id: attr('id'),
    autocomplete: attr('autocomplete'),
  };
}

/** console 参数 → 脱敏摘要（CONSOLE_TEXT_POLICY 缺省保守；对象兜底类型描述）。 */
function summarizeConsoleArg(arg: unknown): string {
  if (typeof arg === 'string') return truncateField(maskTextPayload(arg, CONSOLE_TEXT_POLICY));
  if (typeof arg === 'number' || typeof arg === 'boolean' || arg === null || arg === undefined) return String(arg);
  try {
    const s = JSON.stringify(arg);
    return s === undefined ? String(arg) : truncateField(maskTextPayload(s, CONSOLE_TEXT_POLICY));
  } catch {
    return `[${Object.prototype.toString.call(arg)}]`;
  }
}

/**
 * createBrowserEventHub —— 浏览器面事件观察工厂（构造零副作用；首个订阅惰性安装）。
 * @param scope document/window 结构化注入（缺省读 globalThis；node 测试 shim 注入）。
 */
export function createBrowserEventHub(scope?: BrowserEventScope): PlatformEventHub {
  const { doc, win } = viewOf(scope);
  const bus = new EventBus();

  // ---------- 观察源安装状态（kind → 订阅计数；0→1 安装 / 1→0 卸载） ----------

  const installState = new Map<PlatformObserveKind, number>();
  const activeKinds = (): PlatformObserveKind[] =>
    [...installState.entries()].filter(([, n]) => n > 0).map(([k]) => k);

  /** domObserve：document capture 期委托监听（FR-009）。 */
  let domCleanup: (() => void) | null = null;
  const installDomObserve = (): void => {
    if (domCleanup || !doc || typeof doc.addEventListener !== 'function') return;
    const handler = (ev: unknown): void => {
      const e = ev as { type?: string; target?: unknown; key?: unknown; ctrlKey?: unknown; shiftKey?: unknown; altKey?: unknown; metaKey?: unknown };
      const type = e.type ?? '';
      const target = e.target;
      const field = fieldIdentityOfTarget(target);
      const sensitiveHit = sensitiveFieldMatch(field);
      const source = isSyntheticDispatch() ? ('synthetic' as const) : ('page' as const);
      const meta: Record<string, unknown> = { source };
      let text: string | undefined;

      if (type === 'keydown') {
        // 键入敏感面（FR-006/ADR-005/TYPING_PAYLOAD_POLICY）：key 名 + 修饰键布尔；明文值不回显
        const keyRaw = typeof e.key === 'string' ? e.key : '';
        const modifiers = {
          ctrl: e.ctrlKey === true,
          shift: e.shiftKey === true,
          alt: e.altKey === true,
          meta: e.metaKey === true,
        };
        const isSingleChar = keyRaw.length === 1;
        const keyLabel =
          isSingleChar && (sensitiveHit !== null || TYPING_PAYLOAD_POLICY.plaintextValue === false)
            ? '字符键' // 保守：可打印字符值不回显（key 名仅限功能键）
            : keyRaw === ' ' ? 'Space' : keyRaw || '<unknown>';
        meta.key = keyLabel;
        meta.modifiers = modifiers;
        meta.keyLength = keyRaw.length;
        meta.sensitive = sensitiveHit !== null;
      } else if ((type === 'input' || type === 'change') && target && typeof (target as { value?: unknown }).value === 'string') {
        const raw = (target as { value: string }).value;
        // 值摘要：敏感目标 → 掩码（maskValue）；非敏感目标 → 预算内前缀（FR-006）
        if (sensitiveHit) {
          meta.valueMasked = maskValue(raw, sensitiveHit.kind);
          meta.valueRead = false;
        } else if (raw !== '') {
          meta.value = truncateField(raw);
        }
      }
      bus.ingest({ kind: 'dom', type, target: describeDomTarget(target), text, meta, source });
    };
    for (const t of DOM_OBSERVE_EVENT_TYPES) doc.addEventListener?.(t, handler, true);
    domCleanup = (): void => {
      for (const t of DOM_OBSERVE_EVENT_TYPES) doc.removeEventListener?.(t, handler, true);
      domCleanup = null;
    };
  };

  /** lifecycle：hashchange/popstate/visibilitychange/pagehide/beforeunload（FR-010）。 */
  let lifecycleCleanup: (() => void) | null = null;
  const installLifecycle = (): void => {
    if (lifecycleCleanup) return;
    const hosts: Array<{ host: ListenerHost | null; events: readonly string[] }> = [
      { host: win, events: LIFECYCLE_WINDOW_EVENTS },
      { host: doc, events: LIFECYCLE_DOC_EVENTS },
    ];
    const onEvent = (type: string): ((ev: unknown) => void) => {
      return (): void => {
        const meta: Record<string, unknown> = {
          source: 'page',
          url: win?.location?.href ? redactUrlQuery(win.location.href) : '',
          ...(type === 'visibilitychange' && doc && typeof doc.visibilityState === 'string'
            ? { visibilityState: doc.visibilityState }
            : {}),
        };
        bus.ingest({ kind: 'lifecycle', type, meta });
      };
    };
    const cleanups: Array<() => void> = [];
    for (const { host, events } of hosts) {
      if (!host || typeof host.addEventListener !== 'function') continue;
      for (const t of events) {
        const fn = onEvent(t);
        host.addEventListener(t, fn, false);
        cleanups.push(() => host.removeEventListener?.(t, fn, false));
      }
    }
    lifecycleCleanup = (): void => {
      for (const c of cleanups) c();
      lifecycleCleanup = null;
    };
  };

  /** consolePatch：console.* 惰性 patch（透传原引用；末退订还原）。 */
  let consoleCleanup: (() => void) | null = null;
  const installConsole = (): void => {
    if (consoleCleanup) return;
    const con: ConsoleLike | null = win?.console ?? ((globalThis as Record<string, unknown>).console as ConsoleLike | null);
    if (!con) return;
    const originals = new Map<string, ((...a: unknown[]) => void) | undefined>();
    for (const level of CONSOLE_LEVELS) {
      const orig = con[level];
      if (typeof orig !== 'function') continue;
      originals.set(level, orig);
      con[level] = (...args: unknown[]): void => {
        // 原输出仍到 DevTools（FR-011：捕获不改变页面 console 行为）
        orig.apply(con as never, args as never[]);
        bus.ingest({
          kind: 'console',
          type: level,
          text: args.map((a) => summarizeConsoleArg(a)).join(' '),
          meta: { level, source: 'page' },
        });
      };
    }
    consoleCleanup = (): void => {
      const conIdx = con as unknown as Record<string, unknown>;
      for (const [level, orig] of originals) {
        if (orig) conIdx[level] = orig;
        else delete conIdx[level];
      }
      consoleCleanup = null;
    };
  };

  /** networkPatch 观察（FR-012/ADR-008：fetch/XHR 同 realm 包装；响应体默认不读；AI 自请求早期绑定不可见）。 */
  let netCleanup: (() => void) | null = null;
  const installNetwork = (): void => {
    if (netCleanup) return;
    const w = win as (WinLike & { fetch?: typeof fetch; XMLHttpRequest?: unknown }) | null;
    const cleanups: Array<() => void> = [];
    const urlOf = (input: RequestInfo | URL): string => {
      try {
        return typeof input === 'string' ? input : input instanceof URL ? input.href : (input as { url?: string }).url ?? String(input);
      } catch {
        return String(input);
      }
    };
    const methodOf = (init: RequestInit | undefined, fallback: string): string => {
      return (init?.method ?? fallback).toUpperCase();
    };
    /** HeadersInit → 小写 key 记录（拦截规则应用面；无头 → {}）。 */
    const headerRecordOf = (headersInit: HeadersInit | undefined): Record<string, string> => {
      if (!headersInit) return {};
      const rec: Record<string, string> = {};
      try {
        if (typeof Headers === 'function') {
          const h = new Headers(headersInit);
          h.forEach((v, k) => {
            rec[k.toLowerCase()] = v;
          });
        } else {
          Object.entries(headersInit).forEach(([k, v]) => {
            rec[k.toLowerCase()] = String(v);
          });
        }
      } catch {
        // Headers 构造失败（异常宿主）→ 空记录（请求体/头改写跳过，观察不受影响）
      }
      return rec;
    };
    // fetch 包装（观察：method/URL 脱敏/status/耗时/响应头子集 content-type；拦截：发出前规则改写）
    if (typeof w?.fetch === 'function') {
      const origFetch = w.fetch;
      w.fetch = (async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
        const started = Date.now();
        const urlRaw = urlOf(input);
        const method = methodOf(init, 'GET');
        // 拦截（FR-018/ADR-008）：规则发出前生效（P2 deny + trusted 由工具面；本层只应用 trusted 规则）
        let outInput: RequestInfo | URL = input;
        let outInit = init;
        let intercepted: string[] = [];
        if (interceptState.on && interceptState.rules.length > 0) {
          const headerRec = headerRecordOf(init?.headers);
          const applied = applyNetRules(interceptState.rules, {
            url: urlRaw,
            method,
            headers: headerRec,
            body: init?.body,
          });
          if (applied.hits.length > 0) {
            intercepted = applied.hits;
            outInput = applied.url;
            outInit = {
              ...init,
              headers: new Headers(Object.entries(applied.headers)),
              ...(applied.body !== undefined && applied.body !== init?.body ? { body: applied.body as BodyInit } : {}),
            };
          }
        }
        try {
          const resp = await origFetch.call(w as never, outInput, outInit);
          const meta: Record<string, unknown> = {
            method,
            url: redactUrlQuery(urlRaw),
            status: typeof resp.status === 'number' ? resp.status : undefined,
            durationMs: Date.now() - started,
            source: 'page',
            ...(intercepted.length > 0 ? { intercepted: intercepted.join(',') } : {}),
          };
          try {
            const ct = resp.headers?.get('content-type');
            if (ct) meta.contentType = ct.slice(0, 80);
          } catch {
            // headers 读取失败（CORS/异常）→ 不带响应头子集
          }
          bus.ingest({ kind: 'network', type: 'fetch', meta });
          return resp;
        } catch (err) {
          bus.ingest({
            kind: 'network',
            type: 'fetch',
            meta: { method, url: redactUrlQuery(urlRaw), error: 'failed', durationMs: Date.now() - started, source: 'page', ...(intercepted.length > 0 ? { intercepted: intercepted.join(',') } : {}) },
          });
          throw err;
        }
      }) as typeof fetch;
      cleanups.push(() => {
        w!.fetch = origFetch;
      });
    }
    // XHR 包装（open/send 双 wrap：load 事件记 status/耗时）
    const xhrCtor = w?.XMLHttpRequest;
    if (typeof xhrCtor === 'function') {
      const X = xhrCtor as unknown as {
        prototype: {
          open?: (...a: unknown[]) => void;
          send?: (...a: unknown[]) => void;
        };
      };
      const proto = X.prototype;
      if (proto && typeof proto.open === 'function' && typeof proto.send === 'function') {
        const origOpen = proto.open;
        const origSend = proto.send;
        const pending = new WeakMap<object, { method: string; url: string }>();
        proto.open = function (this: unknown, method: unknown, url: unknown, ...rest: unknown[]): void {
          pending.set(this as object, { method: String(method ?? 'GET').toUpperCase(), url: String(url ?? '') });
          return origOpen.apply(this, [method, url, ...rest] as never[]);
        };
        proto.send = function (this: unknown, ...args: unknown[]): void {
          const started = Date.now();
          const rec = pending.get(this as object);
          const x = this as {
            addEventListener?: (t: string, fn: () => void) => void;
            status?: number;
            setRequestHeader?: (n: string, v: string) => void;
          };
          // XHR 拦截（header 增改面：open 后/发送前 setRequestHeader；removeHeader 无原生面 → 跳过）
          if (interceptState.on && rec && typeof x.setRequestHeader === 'function') {
            for (const rule of interceptState.rules) {
              if (rule.trusted !== true) continue;
              if (!netRuleMatches(rule, rec.url)) continue;
              for (const act of rule.actions) {
                if ((act.op === 'addHeader' || act.op === 'setHeader') && act.value !== undefined) {
                  try {
                    x.setRequestHeader(act.name, act.value);
                  } catch {
                    // 非法头名（受限头）→ 跳过（浏览器拒绝不中断）
                  }
                }
              }
            }
          }
          const report = (): void => {
            if (!rec) return;
            bus.ingest({
              kind: 'network',
              type: 'xhr',
              meta: {
                method: rec.method,
                url: redactUrlQuery(rec.url),
                status: typeof x.status === 'number' ? x.status : undefined,
                durationMs: Date.now() - started,
                source: 'page',
              },
            });
          };
          if (typeof x.addEventListener === 'function') {
            x.addEventListener('loadend', report);
            x.addEventListener('error', report);
            x.addEventListener('abort', report);
          } else {
            report(); // 无事件面（极端宿主）→ 直接记（status 可能未就绪）
          }
          return origSend.apply(this, args as never[]);
        };
        cleanups.push(() => {
          proto.open = origOpen;
          proto.send = origSend;
        });
      }
    }
    netCleanup = (): void => {
      for (const c of cleanups) c();
      netCleanup = null;
    };
  };

  /** pasteCapture：document paste 监听（用户主动粘贴才触发；FR-022/NG-012：无手势读不支持）。 */
  let pasteCleanup: (() => void) | null = null;
  let lastPaste: PlatformPasteCaptureItem | undefined;
  const installPaste = (): void => {
    if (pasteCleanup || !doc || typeof doc.addEventListener !== 'function') return;
    const handler = (ev: unknown): void => {
      const e = ev as { clipboardData?: { getData?: (t: string) => string; items?: ArrayLike<{ kind?: string; type?: string; getAsString?: (cb: (s: string) => void) => void; getAsFile?: () => unknown }> } };
      const cd = e.clipboardData;
      if (!cd) return;
      let textHtml: string | undefined;
      let textPlain: string | undefined;
      const filesMeta: Array<{ name: string; type: string; size: number }> = [];
      if (typeof cd.getData === 'function') {
        try {
          const html = cd.getData('text/html');
          if (html !== '') textHtml = html;
          const plain = cd.getData('text/plain');
          if (plain !== '') textPlain = plain;
        } catch {
          // 读取失败 → 槽位尽量留空
        }
      }
      if (cd.items) {
        for (let i = 0; i < cd.items.length; i++) {
          const it = cd.items[i];
          if (!it) continue;
          if (it.type === 'text/html' && typeof it.getAsString === 'function' && textHtml === undefined) {
            it.getAsString((s) => {
              if (s !== '') textHtml = s;
            });
          }
          if (it.type === 'text/plain' && typeof it.getAsString === 'function' && textPlain === undefined) {
            it.getAsString((s) => {
              if (s !== '') textPlain = s;
            });
          }
        }
      }
      const file = cd.items ? Array.from(cd.items).find((it) => it.kind === 'file' && it.getAsFile) : undefined;
      const f = file?.getAsFile?.();
      const fileMeta = f as { name?: unknown; type?: unknown; size?: unknown } | undefined;
      if (fileMeta && typeof fileMeta === 'object') {
        filesMeta.push({
          name: String(fileMeta.name ?? ''),
          type: String(fileMeta.type ?? ''),
          size: typeof fileMeta.size === 'number' ? fileMeta.size : 0,
        });
      }
      const slot: PlatformPasteCaptureItem = {
        ts: Date.now(),
        ...(textHtml !== undefined ? { textHtml } : {}),
        ...(textPlain !== undefined ? { textPlain } : {}),
        ...(filesMeta.length > 0 ? { files: filesMeta } : {}),
      };
      lastPaste = slot;
      // 事件入通道（富剪贴板文本按 RICH_CLIPBOARD_TEXT_POLICY 脱敏，FR-006）
      const summary = maskTextPayload(textHtml ?? textPlain ?? '', RICH_CLIPBOARD_TEXT_POLICY);
      bus.ingest({
        kind: 'paste',
        type: 'paste',
        text: summary !== '' ? truncateField(summary, 300) : undefined,
        meta: { source: 'page', hasFiles: filesMeta.length > 0 },
      });
    };
    doc.addEventListener('paste', handler, false);
    pasteCleanup = (): void => {
      doc.removeEventListener?.('paste', handler, false);
      pasteCleanup = null;
    };
  };

  /** 网络拦截共享状态（观察与拦截共享 instrumentation；ADR-008）。 */
  const interceptState: { on: boolean; rules: PlatformNetRuleSpec[] } = { on: false, rules: [] };
  /** 网络 instrumentation 总需要 = network 订阅数 + 拦截开关（任一非零即安装/保持）。 */
  const netNeed = (): number => (installState.get('network') ?? 0) + (interceptState.on ? 1 : 0);
  const refreshNetwork = (): void => {
    if (netNeed() > 0) {
      if (netCleanup === null) {
        try {
          installNetwork();
        } catch {
          // 安装失败不崩
        }
      }
    } else {
      netCleanup?.();
    }
  };

  /** kind → 安装器（network 经 refreshNetwork 联合控制 —— 订阅与拦截共享；dialogOverride 在 controller 面）。 */
  const installers = new Map<PlatformObserveKind, () => void>([
    ['dom', installDomObserve],
    ['lifecycle', installLifecycle],
    ['console', installConsole],
    ['paste', installPaste],
  ]);
  const uninstallers = new Map<PlatformObserveKind, () => void>([
    ['dom', () => domCleanup?.()],
    ['lifecycle', () => lifecycleCleanup?.()],
    ['console', () => consoleCleanup?.()],
    ['paste', () => pasteCleanup?.()],
  ]);

  const addSubscription = (kind: PlatformObserveKind): void => {
    const n = (installState.get(kind) ?? 0) + 1;
    installState.set(kind, n);
    if (kind === 'network') {
      refreshNetwork();
      return;
    }
    if (n === 1) {
      const inst = installers.get(kind);
      if (inst) {
        try {
          inst();
        } catch {
          // 安装失败（宿主缺能力）→ 观察源不可用但订阅注册不崩（EC-011：可读态由 list/status 呈现）
        }
      }
    }
  };
  const removeSubscription = (kind: PlatformObserveKind): void => {
    const n = (installState.get(kind) ?? 1) - 1;
    installState.set(kind, Math.max(0, n));
    if (kind === 'network') {
      refreshNetwork();
      return;
    }
    if (n <= 0) {
      const un = uninstallers.get(kind);
      if (un) {
        try {
          un();
        } catch {
          // 卸载失败不中断（宿主销毁竞态兜底）
        }
      }
    }
  };

  // ---------- PlatformEventHub async 面（EventBus 同步核心包装；Promise 形态供工具消费） ----------

  async function list(): Promise<PlatformSubSummary[]> {
    return bus.list();
  }

  async function subscribe(opts: PlatformSubscribeOptions): Promise<PlatformSubResult> {
    const r = bus.subscribe(opts);
    if (!r.ok) return r;
    addSubscription(opts.kind);
    return r;
  }

  async function unsubscribe(subId: string): Promise<PlatformEventOpOutcome> {
    const kind = bus.list().find((s) => s.subId === subId)?.kind;
    const r = bus.unsubscribe(subId);
    if (r.ok && kind) removeSubscription(kind);
    return r;
  }

  async function pull(subId: string, opts?: { lastId?: number; max?: number }): Promise<PlatformPullResult> {
    return bus.pull(subId, opts);
  }

  const sources: PlatformEventSources = {
    domObserve: { active: async () => (installState.get('dom') ?? 0) > 0 && domCleanup !== null },
    lifecycle: { active: async () => (installState.get('lifecycle') ?? 0) > 0 && lifecycleCleanup !== null },
    console: { active: async () => (installState.get('console') ?? 0) > 0 && consoleCleanup !== null },
    network: { active: async () => (installState.get('network') ?? 0) > 0 && netCleanup !== null },
    pasteCapture: {
      active: async () => (installState.get('paste') ?? 0) > 0 && pasteCleanup !== null,
      lastCapture: () => lastPaste,
    },
    // dialogOverride 已真实现（上方）；netIntercept = 真实现（TASK-012，共享 interceptState）
    dialogOverride: createDialogOverrideController(bus, win, doc),
    netIntercept: {
      async setIntercept(on: boolean) {
        interceptState.on = on;
        refreshNetwork();
        return { ok: true };
      },
      async setRules(next: PlatformNetRuleSpec[]) {
        const untrusted = next.filter((r) => r.trusted !== true);
        if (untrusted.length > 0) {
          return { ok: false, error: `✖ 拦截规则需显式 trusted 声明（untrusted 拒：${untrusted.map((r) => r.id).join(',')}，FR-005/EC-004）` };
        }
        interceptState.rules = [...next];
        return { ok: true };
      },
      async rules() {
        return [...interceptState.rules];
      },
      async status() {
        return { on: interceptState.on, ruleCount: interceptState.rules.length };
      },
    },
  };

  return {
    subscribe,
    unsubscribe,
    list,
    pause: async (subId) => bus.pause(subId),
    resume: async (subId) => bus.resume(subId),
    clear: async (subId) => bus.clear(subId),
    pull,
    pullSensitive: async (subId, seq) => bus.pullSensitive(subId, seq),
    status: async () => bus.status(),
    setBudget: async (opts: PlatformBudgetOptions) => bus.setBudget(opts.subId, { bufferLimit: opts.bufferLimit, autoPauseAt: opts.autoPauseAt }),
    switch: async (on) => bus.switch(on),
    sources,
  };
}

// ---------- dialogOverride 真实现（TASK-006/FR-016/017/ADR-007：同 realm hook + 策略应答） ----------

/** window 函数宿主结构化面（alert/confirm/prompt hook 目标）。 */
interface DialogHost {
  alert?: unknown;
  confirm?: unknown;
  prompt?: unknown;
}

/**
 * 对话框 override 控制器（同 realm window.alert/confirm/prompt 替换 + 同源 iframe 尽力 hook；
 * 跨域 iframe 不可 hook → 不跨 SOP，归属说明 EC-009）。捕获事件（type + 文本脱敏摘要
 * DIALOG_TEXT_POLICY）入 EventBus（kind=dialog）并按 dialog-policy 策略应答（不阻塞页面 EC-005）。
 */
function createDialogOverrideController(bus: EventBus, win: WinLike | null, doc: DocLike | null): PlatformEventSources['dialogOverride'] {
  const rules: PlatformDialogRuleSpec[] = [];
  /** 已 hook 宿主集合（复原引用表）。 */
  const hookedHosts = new Map<DialogHost, { alert?: unknown; confirm?: unknown; prompt?: unknown }>();

  const capture = (host: DialogHost, type: 'alert' | 'confirm' | 'prompt', textRaw: unknown): unknown => {
    const text = typeof textRaw === 'string' ? textRaw : String(textRaw ?? '');
    const masked = maskTextPayload(text, DIALOG_TEXT_POLICY);
    const url = win?.location?.href ? redactUrlQuery(win.location.href) : undefined;
    bus.ingest({ kind: 'dialog', type, text: truncateField(masked, 500), meta: { source: 'page', ...(url ? { url } : {}) } });
    const decision = resolveDialogAction(rules, { type, text, url, trusted: false });
    if (type === 'alert') return undefined;
    if (type === 'confirm') return decision.action === 'accept';
    if (decision.action === 'promptText') return decision.text ?? null;
    if (decision.action === 'accept') return '';
    return null;
  };

  const hookHost = (host: DialogHost): { ok: boolean; reason?: string } => {
    if (hookedHosts.has(host)) {
      return { ok: false, reason: '重复安装：该 window 已存在对话框 override（卸载后可重装，NFR-004 冲突可读）' };
    }
    if (typeof host.alert !== 'function' && typeof host.confirm !== 'function' && typeof host.prompt !== 'function') {
      return { ok: false, reason: '宿主无 alert/confirm/prompt（无法 hook）' };
    }
    const originals: { alert?: unknown; confirm?: unknown; prompt?: unknown } = {
      alert: host.alert,
      confirm: host.confirm,
      prompt: host.prompt,
    };
    if (typeof host.alert === 'function') {
      host.alert = (m?: unknown): void => {
        void capture(host, 'alert', m);
      };
    }
    if (typeof host.confirm === 'function') {
      host.confirm = (m?: unknown): boolean => capture(host, 'confirm', m) as boolean;
    }
    if (typeof host.prompt === 'function') {
      host.prompt = (m?: unknown): string | null => capture(host, 'prompt', m) as string | null;
    }
    hookedHosts.set(host, originals);
    return { ok: true };
  };

  const collectIframeHosts = (): DialogHost[] => {
    if (!doc) return [];
    const anyDoc = doc as unknown as { querySelectorAll?: (sel: string) => unknown };
    if (typeof anyDoc.querySelectorAll !== 'function') return [];
    let frames: unknown;
    try {
      frames = anyDoc.querySelectorAll('iframe');
    } catch {
      return [];
    }
    const hosts: DialogHost[] = [];
    const list: unknown[] = typeof (frames as { length?: number })?.length === 'number' ? Array.from(frames as ArrayLike<unknown>) : [];
    for (const f of list) {
      try {
        const cw = (f as { contentWindow?: unknown }).contentWindow;
        if (cw && typeof cw === 'object') hosts.push(cw as DialogHost);
      } catch {
        // 跨域 iframe contentWindow 访问抛 SecurityError → 归属（不跨 SOP，EC-009）
      }
    }
    return hosts;
  };

  return {
    async install() {
      const hosts: DialogHost[] = [win as unknown as DialogHost, ...collectIframeHosts()].filter((h): h is DialogHost => Boolean(h));
      if (hosts.length === 0) return { ok: false, error: '✖ 对话框 override 安装失败：无 window 宿主（仅浏览器场景可用）' };
      const installed: DialogHost[] = [];
      const conflicts: string[] = [];
      for (const h of hosts) {
        const r = hookHost(h);
        if (r.ok) installed.push(h);
        else conflicts.push(r.reason ?? 'unknown');
      }
      if (installed.length === 0) {
        return { ok: false, error: `✖ 对话框 override 安装失败：${conflicts[0] ?? '宿主不可 hook'}` };
      }
      return { ok: true };
    },
    async uninstall() {
      for (const [host, originals] of hookedHosts) {
        if (originals.alert !== undefined) host.alert = originals.alert;
        if (originals.confirm !== undefined) host.confirm = originals.confirm;
        if (originals.prompt !== undefined) host.prompt = originals.prompt;
      }
      hookedHosts.clear();
      return { ok: true };
    },
    async installed() {
      return hookedHosts.size > 0;
    },
    async addRule(rule: PlatformDialogRuleSpec) {
      if (!rule.trusted) return { ok: false, error: '✖ 对话框应答策略需显式 trusted 声明（untrusted 拒，FR-005/EC-004）' };
      rules.push(rule);
      return { ok: true };
    },
    listRules() {
      return [...rules];
    },
    async removeRule(index: number) {
      if (index < 0 || index >= rules.length) return { ok: false, error: `✖ 策略索引 ${index} 越界（当前 ${rules.length} 条）` };
      rules.splice(index, 1);
      return { ok: true };
    },
  };
}

/** createBrowserEventHub 默认预算引用（测试/工具断言单一数据源）。 */
export { DEFAULT_BUDGETS };
