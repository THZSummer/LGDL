/**
 * PlatformEnv —— 浏览器能力适配器（DI 缝，FR-009/NFR-002/006）。
 *
 * 生态位（discovery §3.3）：v2 域工具全部落在浏览器生态位
 * （fetch / OPFS / IDB / localStorage / Worker / DOM / Permissions /
 * Notification / Clipboard / File System Access / storage.estimate）——
 * base 机制与域工具不直接触碰浏览器全局，一律经 PlatformEnv 注入：
 *   - node 面 = nodeEnv()（fetch 真可用 + 浏览器专属缝 = 转译桩，测试注入 fake）
 *   - 浏览器面 = browserEnv()（真实浏览器适配器，能力缺失/被拒 → 可读转译）
 *
 * 授权失败转译（FR-009/EC-003）：NotAllowedError（用户拒绝/无手势）/
 * SecurityError（非安全上下文/跨源）/ NotFoundError（能力不存在/句柄失效）
 * → 统一 classify + 友好文案（含授权路径指引），工具 ok:false 会话不中断。
 *
 * 本文件零 LGDL/react import（NFR-001）；node 面可完整单测（NFR-006）。
 * 浏览器全局一律以结构化子集方式读取（base 不含 DOM lib，NFR-002 零额外依赖）。
 */
import type { AskResponder } from './ask-user.js';

/** 浏览器存储配额面（navigator.storage）。 */
export interface PlatformStorageQuota {
  estimate(): Promise<{ usage: number; quota: number }>;
  persist(): Promise<boolean>;
  persisted(): Promise<boolean>;
}

/** 同步 KV 缝（settings 工具：localStorage 适配器 / memory）。 */
export interface PlatformKv {
  get(key: string): string | null;
  set(key: string, value: string): void;
  remove(key: string): void;
}

/** Permissions API 查询缝（简化：按名查三态）。 */
export interface PlatformPermissions {
  query(name: string): Promise<'granted' | 'denied' | 'prompt'>;
}

/** Clipboard 缝（读/写文本）。 */
export interface PlatformClipboard {
  readText(): Promise<string>;
  writeText(text: string): Promise<void>;
}

/** Notification 缝（授权 + 展示；返回是否成功展示）。default = 未请求过。 */
export interface PlatformNotify {
  permission(): Promise<'granted' | 'denied' | 'default' | 'unsupported'>;
  requestPermission(): Promise<'granted' | 'denied' | 'default' | 'unsupported'>;
  show(title: string, opts?: { body?: string }): Promise<boolean>;
}

/** File System Access 保存缝（save=用户文件；download=下载链）。 */
export interface PlatformFilePicker {
  save(opts: { suggestedName: string; data: string | Blob }): Promise<{ ok: boolean; canceled?: boolean; error?: string }>;
  download(opts: { filename: string; data: string | Blob }): Promise<void>;
}

/** Worker 缝（执行器注入：eval/后台任务；node 面用桩）。 */
export interface PlatformWorkerHandle<I = unknown, O = unknown> {
  post(input: I): void;
  onmessage: ((ev: { data: O }) => void) | null;
  onerror: ((ev: unknown) => void) | null;
  terminate(): void;
}

export interface PlatformWorkerFactory {
  create<I = unknown, O = unknown>(): PlatformWorkerHandle<I, O>;
}

/** DOM 缝（dom-* 工具：宿主页同源；node 面桩，浏览器面 document 直操作）。 */
export interface PlatformDomState {
  snapshot(): Promise<Record<string, unknown>>;
}

/** DOM 操作结果（dom-* 子命令统一返回面）。 */
export interface PlatformDomOpResult {
  ok: boolean;
  output: string;
  error?: string;
}

/**
 * DOM 操作面（dom-tools 子命令族执行依赖，P1 additive；无 op-cli React handler 依赖）。
 * 执行目标 = 宿主应用自身同源页面（NG-003：第三方/跨域 = F-14 边界）。
 */
export interface PlatformDomOps {
  /** 读宿主页状态（URL/title/关键区域）。 */
  readState(): Promise<PlatformDomOpResult>;
  /** 点击元素（CSS 选择器）。 */
  click(selector: string): Promise<PlatformDomOpResult>;
  /** 悬停元素。 */
  hover(selector: string): Promise<PlatformDomOpResult>;
  /** 滚动：element（选择器）或页面，dx/dy 像素。 */
  scroll(selector: string | undefined, dx: number, dy: number): Promise<PlatformDomOpResult>;
  /** 页面缩放（percent：100 = 100%）。 */
  zoom(percent: number | undefined): Promise<PlatformDomOpResult>;
  /** 全屏切换（on=true 进入全屏 / false 退出）。 */
  fullscreen(on: boolean): Promise<PlatformDomOpResult>;
  /** DOM 快照（HTML/文本形态由实现决定；输出进上下文预算受控）。 */
  snapshot(): Promise<PlatformDomOpResult>;
}

export interface PlatformDom {
  /** 宿主页 document（同源；具体 dom-* 子命令由 dom-tools 按需调用）。 */
  document?: unknown;
  state: PlatformDomState;
  /** P1：dom-* 子命令操作面（node 面 = 转译桩；浏览器面 = 最小 document 实现）。 */
  ops?: PlatformDomOps;
}

/** 网络搜索结果条目（web-search 工具结果面）。 */
export interface WebSearchResultItem {
  title: string;
  snippet: string;
  url: string;
}

export interface WebSearchOutcome {
  ok: boolean;
  results: WebSearchResultItem[];
  error?: string;
}

/**
 * PlatformEnv —— 域工具触碰浏览器能力的唯一入口。
 * 所有缝可选（工具未配置/环境不支持 → 自身按禁用态或转译处理）。
 */
export interface PlatformEnv {
  /** 平台身份（观测/审计）。 */
  kind: 'browser' | 'node';
  /** fetch（node/browser 均可用；web-fetch/web-search/MCP 等经此）。 */
  fetch: typeof fetch;
  /** storage estimate/persist（navigator.storage；node = 转译桩）。 */
  storage?: PlatformStorageQuota;
  /** 同步 KV（localStorage 适配器 / memory；settings）。 */
  kv?: PlatformKv;
  /** Permissions API（查询授权态）。 */
  permissions?: PlatformPermissions;
  /** Clipboard（读/写文本）。 */
  clipboard?: PlatformClipboard;
  /** Notification（系统通知）。 */
  notify?: PlatformNotify;
  /** 用户文件保存（File System Access + 下载链）。 */
  filePicker?: PlatformFilePicker;
  /** Worker 工厂（eval-js 执行器 / 后台任务）。 */
  workerFactory?: PlatformWorkerFactory;
  /** DOM 缝（dom-* 子命令族；宿主页同源）。 */
  dom?: PlatformDom;
  /** P1（FR-023）：ask-user 应答器（场景注入 UI 应答；与 PRM ask FR-007 语义区分）。 */
  askUser?: AskResponder;
  /**
   * 网络搜索执行器（web-search）：scene 配置端点/key 后注入；
   * 未配置 = undefined → 工具禁用态 + 配置指引（EC-006）。base 零内置端点零内置 key。
   */
  search?: (query: string) => Promise<WebSearchOutcome>;
  /** 实时流（ws/eventsource，P2 试点）；env 注入连接器。 */
  stream?: unknown;
  /** 远程执行代理桥（exec-remote，P2）；scene 配置后注入。 */
  remoteExec?: unknown;
  /** 自由扩展位（供未来域使用，避免破坏性类型变更）。 */
  [k: string]: unknown;
}

// ---------- 授权失败分类与转译（FR-009/EC-003） ----------

export type CapabilityErrorKind = 'not-allowed' | 'security' | 'not-found' | 'unsupported' | 'abort' | 'other';

/** 按浏览器错误名分类授权失败。 */
export function classifyCapabilityError(err: unknown): CapabilityErrorKind {
  if (err instanceof Error) {
    const n = err.name ?? '';
    if (n === 'NotAllowedError' || n === 'PermissionDeniedError') return 'not-allowed';
    if (n === 'SecurityError') return 'security';
    if (n === 'NotFoundError') return 'not-found';
    if (n === 'AbortError') return 'abort';
  }
  const msg = err instanceof Error ? err.message : String(err);
  if (/denied|not allowed|permission/i.test(msg)) return 'not-allowed';
  if (/security|insecure|not secure context/i.test(msg)) return 'security';
  if (/not found|no longer valid|gone/i.test(msg)) return 'not-found';
  if (/abort/i.test(msg)) return 'abort';
  if (/unsupported|not supported|undefined is not|not a function|read properties of undefined/i.test(msg)) return 'unsupported';
  return 'other';
}

/** 授权路径指引（capability 例：'通知'/'剪贴板'/'文件保存'）。 */
export function capabilityGuidance(kind: CapabilityErrorKind, capability: string): string {
  switch (kind) {
    case 'not-allowed':
      return `${capability} 授权被拒绝 —— 请在浏览器地址栏权限设置中允许${capability}，或重试时在页面弹出的授权请求中点允许`;
    case 'security':
      return `${capability} 不可用 —— 该浏览器能力需要安全上下文（https 或 localhost）`;
    case 'not-found':
      return `${capability} 不可用 —— 浏览器不支持或对象句柄已失效（刷新页面后可重试）`;
    case 'unsupported':
      return `${capability} 不受当前环境支持（能力降级）`;
    case 'abort':
      return `${capability} 操作被中断（用户取消或页面切换）`;
    default:
      return `${capability} 调用失败：请重试或检查浏览器设置`;
  }
}

/** 转译成工具失败二元组（执行器直接返回 ToolResult 用）。 */
export function translateCapabilityError(err: unknown, capability: string): { output: string; error: string } {
  const kind = classifyCapabilityError(err);
  return {
    output: `✖ ${capability} 不可用：${capabilityGuidance(kind, capability)}`,
    error: `${capability} failed: ${err instanceof Error ? err.message : String(err)}`,
  };
}

// ---------- nodeEnv：node 面默认缝（测试/降级） ----------

function unsupported(name: string): never {
  const e = new Error(`${name} 在 node 面不可用（域工具应转译/禁用）`);
  e.name = 'NotFoundError';
  throw e;
}

/** node 面 PlatformEnv：fetch 真可用；浏览器专属缝 = NotFoundError 桩（测试注入 fake 覆盖）。 */
export function nodeEnv(overrides: Partial<PlatformEnv> = {}): PlatformEnv {
  const base: PlatformEnv = {
    kind: 'node',
    fetch: globalThis.fetch.bind(globalThis),
    storage: {
      async estimate() {
        return { usage: 0, quota: Number.MAX_SAFE_INTEGER };
      },
      async persist() {
        return false;
      },
      async persisted() {
        return false;
      },
    },
    kv: {
      get: () => null,
      set: () => {},
      remove: () => {},
    },
    permissions: {
      async query() {
        return 'prompt';
      },
    },
    clipboard: {
      async readText() {
        unsupported('剪贴板读取');
      },
      async writeText() {
        unsupported('剪贴板写入');
      },
    },
    notify: {
      async permission() {
        return 'unsupported';
      },
      async requestPermission() {
        return 'unsupported';
      },
      async show() {
        unsupported('系统通知');
      },
    },
    filePicker: {
      async save() {
        unsupported('文件保存');
      },
      async download() {
        unsupported('文件下载');
      },
    },
    workerFactory: {
      create() {
        unsupported('Worker');
      },
    },
    dom: {
      state: {
        async snapshot() {
          return { unavailable: true };
        },
      },
      ops: {
        readState: async () => unsupported('DOM 读状态'),
        click: async () => unsupported('DOM 点击'),
        hover: async () => unsupported('DOM 悬停'),
        scroll: async () => unsupported('DOM 滚动'),
        zoom: async () => unsupported('DOM 缩放'),
        fullscreen: async () => unsupported('DOM 全屏'),
        snapshot: async () => unsupported('DOM 快照'),
      },
    },
  };
  return { ...base, ...overrides };
}

// ---------- browserEnv：真实浏览器适配器（lgdl-web session 注入） ----------

/** 浏览器授权失败错误构造（保持 name 以走 classify）。 */
function namedError(name: string, message: string): Error {
  const e = new Error(message);
  e.name = name;
  return e;
}

/** 结构化读取浏览器全局（base 无 DOM lib：一律经 unknown 边界）。 */
function browserGlobal<T>(key: string): T | undefined {
  const g = globalThis as Record<string, unknown>;
  return g[key] as T | undefined;
}

/** 真实浏览器 PlatformEnv（能力按需惰性取用；缺失 → 调用时转译）。 */
export function browserEnv(): PlatformEnv {
  const nav = (): {
    clipboard?: { readText?: () => Promise<string>; writeText?: (t: string) => Promise<void> };
    permissions?: { query?: (d: { name: string }) => Promise<{ state: string }> };
    storage?: PlatformStorageQuota;
  } | undefined => browserGlobal('navigator');

  const win = (): {
    localStorage?: { getItem: (k: string) => string | null; setItem: (k: string, v: string) => void; removeItem: (k: string) => void };
    Notification?: { permission: string; requestPermission?: () => Promise<string> };
    Worker?: unknown;
    showSaveFilePicker?: unknown;
    location?: { href: string };
    document?: { title: string };
  } | undefined => browserGlobal('window');

  const clipboardSeam: PlatformClipboard = {
    async readText() {
      const n = nav();
      const read = n?.clipboard?.readText;
      if (!read) throw namedError('NotFoundError', 'navigator.clipboard.readText 不可用（需安全上下文）');
      return read();
    },
    async writeText(text: string) {
      const n = nav();
      const write = n?.clipboard?.writeText;
      if (!write) throw namedError('NotFoundError', 'navigator.clipboard.writeText 不可用（需安全上下文）');
      await write(text);
    },
  };

  const mapNotificationState = (s: string): 'granted' | 'denied' | 'default' | 'unsupported' => {
    if (s === 'granted' || s === 'denied' || s === 'default') return s;
    return 'unsupported';
  };

  const notifySeam: PlatformNotify = {
    async permission() {
      const N = win()?.Notification;
      if (!N || typeof N.permission !== 'string') return 'unsupported';
      return mapNotificationState(N.permission);
    },
    async requestPermission() {
      const N = win()?.Notification;
      if (!N?.requestPermission) return 'unsupported';
      return mapNotificationState(await N.requestPermission());
    },
    async show(title: string, opts?: { body?: string }) {
      const N = win()?.Notification;
      if (!N) throw namedError('NotFoundError', 'Notification 不可用');
      const perm = await this.permission();
      if (perm === 'denied') throw namedError('NotAllowedError', '通知授权已被拒绝');
      if (perm === 'default' || perm === 'unsupported') {
        if (!N.requestPermission) throw namedError('NotFoundError', 'Notification.requestPermission 不可用');
        const after = mapNotificationState(await N.requestPermission());
        if (after !== 'granted') throw namedError('NotAllowedError', '通知授权未授予');
      }
      const Ctor = N as unknown as new (t: string, o: { body?: string }) => unknown;
      new Ctor(title, opts?.body ? { body: opts.body } : {});
      return true;
    },
  };

  const downloadAnchor = (filename: string, url: string): void => {
    const doc = browserGlobal<{ createElement: (tag: string) => { href: string; download: string; click: () => void } }>('document');
    if (!doc?.createElement) throw namedError('NotFoundError', 'document.createElement 不可用');
    const a = doc.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
  };

  const filePickerSeam: PlatformFilePicker = {
    async save(opts) {
      const showSave = win()?.showSaveFilePicker;
      if (typeof showSave === 'function') {
        try {
          const handle = await (showSave as (o: { suggestedName: string }) => Promise<{ createWritable: () => Promise<{ write: (d: unknown) => Promise<void>; close: () => Promise<void> }> }>)({
            suggestedName: opts.suggestedName,
          });
          const writable = await handle.createWritable();
          await writable.write(opts.data);
          await writable.close();
          return { ok: true };
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          if (/abort|cancel/i.test(msg)) return { ok: false, canceled: true };
          throw err;
        }
      }
      // 降级：下载链
      await this.download({ filename: opts.suggestedName, data: opts.data });
      return { ok: true };
    },
    async download(opts) {
      const blob = typeof opts.data === 'string' ? new Blob([opts.data], { type: 'text/plain' }) : opts.data;
      const url = URL.createObjectURL(blob);
      try {
        downloadAnchor(opts.filename, url);
      } finally {
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }
    },
  };

  const storageSeam: PlatformStorageQuota = {
    async estimate() {
      const s = nav()?.storage;
      if (!s?.estimate) throw namedError('NotFoundError', 'navigator.storage.estimate 不可用');
      return s.estimate();
    },
    async persist() {
      const s = nav()?.storage;
      if (!s?.persist) throw namedError('NotFoundError', 'navigator.storage.persist 不可用');
      return s.persist();
    },
    async persisted() {
      const s = nav()?.storage;
      if (!s?.persisted) throw namedError('NotFoundError', 'navigator.storage.persisted 不可用');
      return s.persisted();
    },
  };

  const domDoc = browserGlobal<{
    querySelector: (sel: string) => unknown;
    body?: unknown;
  }>('document');

  /** 最小 DOM 操作实现（尽力而为；真实浏览器面 validate 冒烟承接）。 */
  const domOps: PlatformDomOps = {
    async readState() {
      const doc = domDoc;
      const w = win();
      if (!doc) throw namedError('NotFoundError', 'document 不可用');
      return { ok: true, output: `url: ${w?.location?.href ?? ''}\ntitle: ${w?.document?.title ?? ''}` };
    },
    async click(selector: string) {
      const doc = domDoc;
      if (!doc?.querySelector) throw namedError('NotFoundError', 'document.querySelector 不可用');
      const el = doc.querySelector(selector) as { click?: () => void } | null;
      if (!el) return { ok: false, output: `✖ 未找到元素 "${selector}"（宿主页同源 DOM）`, error: 'element not found' };
      if (typeof el.click !== 'function') return { ok: false, output: `✖ 元素 "${selector}" 不可点击`, error: 'not clickable' };
      el.click();
      return { ok: true, output: `✓ 已点击 "${selector}"` };
    },
    async hover() {
      // 最小实现：真实 hover 事件派发在浏览器冒烟面承接（Node 面桩注入为主）
      throw namedError('NotFoundError', 'hover 真实事件派发由浏览器面冒烟承接（本实现为最小桩）');
    },
    async scroll() {
      throw namedError('NotFoundError', 'scroll 真实滚动由浏览器面冒烟承接（本实现为最小桩）');
    },
    async zoom() {
      throw namedError('NotFoundError', 'zoom 由浏览器面冒烟承接');
    },
    async fullscreen() {
      throw namedError('NotFoundError', 'fullscreen 由浏览器面冒烟承接（需用户手势授权）');
    },
    async snapshot() {
      const doc = domDoc as { body?: { innerText?: string } } | undefined;
      if (!doc?.body?.innerText) throw namedError('NotFoundError', 'document.body.innerText 不可用');
      return { ok: true, output: doc.body.innerText.slice(0, 20000) };
    },
  };

  return {
    kind: 'browser',
    fetch: globalThis.fetch.bind(globalThis),
    storage: storageSeam,
    kv: {
      get: (k: string) => {
        try {
          return win()?.localStorage?.getItem(k) ?? null;
        } catch {
          return null;
        }
      },
      set: (k: string, v: string) => {
        try {
          win()?.localStorage?.setItem(k, v);
        } catch {
          // 隐私模式等：静默降级（EC-005 语义由存储工具明示）
        }
      },
      remove: (k: string) => {
        try {
          win()?.localStorage?.removeItem(k);
        } catch {
          // 同上静默降级
        }
      },
    },
    permissions: {
      async query(name: string) {
        const q = nav()?.permissions?.query;
        if (!q) return 'prompt';
        const st = await q({ name });
        return st.state === 'granted' || st.state === 'denied' ? st.state : 'prompt';
      },
    },
    clipboard: clipboardSeam,
    notify: notifySeam,
    filePicker: filePickerSeam,
    workerFactory: {
      create<I, O>() {
        const WorkerCtor = win()?.Worker;
        if (typeof WorkerCtor !== 'function') throw namedError('NotFoundError', 'Worker 不可用');
        const worker = new (WorkerCtor as new (url: string) => unknown)('');
        const h = worker as unknown as {
          postMessage: (m: unknown) => void;
          terminate: () => void;
          onmessage: unknown;
          onerror: unknown;
        };
        const handle: PlatformWorkerHandle<I, O> = {
          post: (input: I) => h.postMessage(input),
          onmessage: null,
          onerror: null,
          terminate: () => h.terminate(),
        };
        // 桥接真实 worker 事件 → handle 回调（域工具自行 set onmessage）
        Object.defineProperty(h, 'onmessage', {
          set: (fn: unknown) => {
            (worker as unknown as { onmessage: unknown }).onmessage = fn as (ev: MessageEvent) => void;
          },
        });
        return handle;
      },
    },
    dom: {
      document: domDoc,
      state: {
        async snapshot() {
          const w = win();
          return { unavailable: false, url: w?.location?.href ?? '', title: w?.document?.title ?? '' };
        },
      },
      ops: domOps,
    },
  };
}
