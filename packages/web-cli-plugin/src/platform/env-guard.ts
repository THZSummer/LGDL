/**
 * Extension-context guard（TASK-019 / 用户实测反馈：非扩展上下文下的「填 Key 没法保存」）。
 *
 * 最可能成因①：用户把 `dist/options.html` 当**普通文件/普通页面**打开
 * （`file://` 或任意非扩展页），此时 `chrome.storage` 不存在 → 配置读写全部失效。
 * 上一轮已给 options 保存链路加 try/catch（失败可读），但用户看到的仍是一句
 * 与「为什么」无关的底层错误，且按钮仍可点击，没有明确「你根本不在扩展里」的结论。
 *
 * 本模块是**纯逻辑**（注入结构性 `chrome` 形状），node 可测：判定
 * `chrome.runtime.id` + `chrome.storage.local` 是否可用，产出醒目阻断横幅文案与
 * 「保存 / 测试连接 / 清除」禁用语义。DOM 呈现分别在 options.ts / sidepanel.ts。
 *
 * 不新增依赖、不访问真实 `chrome` 全局（调用方传入），保持 node 可导入。
 */

/** 注入用的结构性 `chrome` 形状（不依赖 @types/chrome 运行时）。 */
export interface ChromeEnvLike {
  runtime?: { id?: unknown };
  storage?: { local?: { get?: unknown; set?: unknown; remove?: unknown } };
}

export interface EnvGuardResult {
  /** 可用扩展上下文的判定结果：runtime.id 与 storage.local 同时可用。 */
  inExtension: boolean;
  /** `chrome` 对象整体是否可见（普通 Chrome 页面也有 `window.chrome`，故不可单靠它判定）。 */
  hasChrome: boolean;
  hasRuntime: boolean;
  hasStorage: boolean;
  /** 逐项可读原因（中文），供诊断/输入框说明使用。 */
  reasons: string[];
  /** 页首阻断横幅文案；在扩展环境下为空串。 */
  banner: string;
}

export const NOT_EXTENSION_BANNER =
  '⚠ 当前不在扩展环境（chrome.storage 不可用），配置无法保存。请通过 chrome://extensions → 本扩展 → 「扩展程序选项」打开本页，或从侧栏「配置模型」进入。';

/** 输入框旁的简短说明（非扩展环境下展示）。 */
export function envGuardInputNote(env: EnvGuardResult): string {
  if (env.inExtension) return '';
  return `本页不在扩展环境中，表单无法读写 chrome.storage.local：${env.reasons.join('；')}。`;
}

function storageLocalUsable(api: ChromeEnvLike | undefined | null): boolean {
  const local = api?.storage?.local;
  return Boolean(local && typeof local.get === 'function' && typeof local.set === 'function');
}

/**
 * 判定当前页面是否处于可用的扩展上下文。
 *
 * 关键点：普通网页里 `window.chrome` 可能是**存在的对象**（有 loadTimes 等），
 * 但 `chrome.runtime.id` / `chrome.storage.local` 为空。必须按能力判定，不能只看
 * `typeof chrome !== 'undefined'`（否则会误判为可用，重现保存静默失效）。
 */
export function detectExtensionEnv(api: ChromeEnvLike | undefined | null): EnvGuardResult {
  const hasChrome = api !== undefined && api !== null;
  const hasRuntime = Boolean(api && api.runtime && typeof api.runtime.id === 'string' && api.runtime.id.length > 0);
  const hasStorage = storageLocalUsable(api);
  const reasons: string[] = [];
  if (!hasChrome) reasons.push('未检测到 chrome 对象（页面可能以 file:// 或普通网页方式打开）');
  if (hasChrome && !hasRuntime) reasons.push('chrome.runtime.id 不可用（非扩展上下文）');
  if (hasChrome && !hasStorage) reasons.push('chrome.storage.local 不可用（配置无法读写）');
  const inExtension = hasRuntime && hasStorage;
  return {
    inExtension,
    hasChrome,
    hasRuntime,
    hasStorage,
    reasons,
    banner: inExtension ? '' : NOT_EXTENSION_BANNER,
  };
}

export interface EnvGuardButtonState {
  saveDisabled: boolean;
  testDisabled: boolean;
  clearDisabled: boolean;
}

/** 统一按钮禁用语义：扩展环境之外「保存 / 测试连接 / 清除」一律禁用。 */
export function envGuardButtonState(env: EnvGuardResult, busy = false): EnvGuardButtonState {
  const blocked = !env.inExtension;
  return {
    saveDisabled: blocked || busy,
    testDisabled: blocked,
    clearDisabled: blocked,
  };
}
