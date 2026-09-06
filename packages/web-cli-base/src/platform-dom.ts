/**
 * platform-dom.ts —— browserEnv 真实 PlatformDomOps 实现工厂（TASK-004；FR-003/009~037）。
 *
 * 生态位：本文件是 web-cli-base **唯一** document/window 触碰点（ADR-008：DOM 触碰全收敛，
 * base 其余模块零 document 假设）。`createBrowserDomOps()` 产出浏览器面真实 PlatformDomOps，
 * 由 platform.ts `browserEnv()` 装配（4 个转译桩 hover/scroll/zoom/fullscreen 在此补真
 * = FR-003/016/017；v3 新能力方法 #1~#25 真实实现亦在此）。
 *
 * 分层纪律：
 *   - 执行目标 = 宿主应用自身同源页面（NG-003；第三方/跨域 = F-14 边界）。
 *   - 授权/能力失败统一经 platform.translateCapabilityError 转译为可读文案（FR-009/EC-008），
 *     工具 ok:false 会话不中断；不伪造成功（EC-006：写入后回读校验，不一致即报可验证提示）。
 *   - 敏感字段（sensitive.ts，FR-024/EC-005）：读取一律脱敏（password 只出类型不出值）；
 *     写侧是否 ask/trusted 由 router 子命令级 risk + 场景策略裁决，本文件保证不回显明文。
 *   - 合成事件 isTrusted=false 局限（NG-007/EC-007）：事件序列照常派发 + 返回说明 + page-eval
 *     备用路径建议；不承诺可信事件绑定生效。
 *   - 预算护栏（NFR-003/EC-010）：snapshotStructured/interactives/readStructure/extractData/
 *     evaluate 默认预算 + 截断标记（已截断/总长/续读提示）。
 *
 * 本文件零 lgdl/react import、零第三方依赖（Web 标准 API，NFR-001/002）；导出接口形态为纯数据
 * （不泄漏 DOM 类型进 .d.ts）。scope 注入参数仅测试/宿主 harness 用（缺省读全局惰性 window/document）。
 *
 * ============================================================
 * V13 真实浏览器冒烟用例清单（validate/TASK-012 承接；逐 ops ≥1 真实用例）：
 *   readState        读 lgdl-web 宿主页：url/title + readyState/origin/referrer/视口（≥2 新增）
 *   click            无 opts = v2 selector-only 零回归；opts.x/y 命中 elementFromPoint 目标；offset 命中元素内偏移
 *   hover            监听 pointerover/mouseover 收到序列；目标 CSS :hover 态生效
 *   scroll           [无 selector] window 滚动 dy 后 scrollY 增量=dy；[selector] 元素 scrollTop 增量=dy
 *   zoom             zoom 100→150 后根 zoom（或 transform）近似生效；100/undefined 恢复默认
 *   fullscreen       授权允许路径进入/退出 fullscreenchange 断言；无手势授权 → 可读转译（非桩错误）
 *   snapshot         无参输出 = body.innerText 截断 20k（与 v2 一致，无附加截断标记）
 *   snapshotStructured 缺省含 interactives/headings 段；offset/limit 两页拼接 ≈ 全文；超预算截断标记含总长
 *   interactives     清单与 DOM 事实一致（抽样）；type/state/text 过滤；password 只出类型不出值；预算截断
 *   readElement      属性/文本/样式/几何/状态/表单值各面真值断言；敏感字段 value 脱敏；not found 可读
 *   findElements     匹配数正确；0 匹配 = ok:true + 计数；detail 唯一化建议可选
 *   readStructure    outerHTML 与 DOM 一致；links/images/headings/forms 集合计数+抽样；整页序列化预算截断
 *   dblclick/contextmenu 目标监听收到 mousedown×2/up×2/dblclick 与 contextmenu
 *   longPress        pointerdown→（ms）→pointerup 序列；时长可配生效
 *   dragDrop         from 收 dragstart/dragend、to 收 dragover/drop；目标不处理 → 可读提示（EC-007）
 *   focusEl/blurEl   可聚焦元素 focus 后 activeElement 断言；不可聚焦 → 可读错误；blur 后失焦
 *   typeText         lgdl-web React 受控 input 键入后值变更 + onChange（NFR-004）；原生 input 同效；
 *                    受控字段（值 tracker）首次键入走 set-value 全量提交基元（D1 修复，onChange 必达）；
 *                    contenteditable 插入生效；回读不一致 → 「事件已派发但值可能未同步」提示（EC-006）
 *   pressKey         keydown/keyup 监听断言（键码/修饰符）；Enter 提交语义由表单监听断言
 *   setText/setAttr/removeAttr/setStyle 写入后回读一致；非法属性名可读错误
 *   setValue/fillForm React 受控 select/checkbox/radio 值变更 + change 触发；file input → 显式不可用（NG-004）
 *   addElement/removeElement 四种插入位置 DOM 断言 + 移除后不存在；remove 不存在元素 → EC-001
 *   waitFor          SPA 延迟插入元素真实命中；元素消失命中；超时 ok:false 含最后观察状态
 *   evaluate         宿主页同源执行返回序列化结果；异常/异步超时可读返回且页面存活；预算截断标记
 *   extractData      table/list/links/images/meta 各 ≥1 与 DOM 事实一致；规模截断标记
 *   printPage        触发打印对话框（headless 断言调用可达 + 不可达可读说明）
 *   historyNav/reloadPage back/forward URL 变化断言；reload 后需重新 read-state（EC-009）
 *   screenshot       视口/元素截图 dataUrl 生成且尺寸正确（近似度声明）；整页 → 不支持+F-14 归属；
 *                    canvas taint/CSP 失败 → 可读转译（EC-008）
 * ============================================================
 */
import {
  translateCapabilityError,
} from './platform.js';
import type {
  PlatformAddElementOptions,
  PlatformClickOptions,
  PlatformDomOpResult,
  PlatformDomOps,
  PlatformEvaluateOptions,
  PlatformExtractDataOptions,
  PlatformFillFormOptions,
  PlatformFindElementsOptions,
  PlatformInteractivesOptions,
  PlatformPressKeyOptions,
  PlatformReadElementOptions,
  PlatformReadStructureOptions,
  PlatformScreenshotOptions,
  PlatformSetStyleOptions,
  PlatformSnapshotStructuredOptions,
  PlatformWaitForOptions,
} from './platform.js';
import { parseLocator } from './locator.js';
import type { LocatorQuery, TextLocatorQuery } from './locator.js';
import { sensitiveFieldMatch, maskValue } from './sensitive.js';
import type { FieldIdentity } from './sensitive.js';

// ==================== 注入 scope 与常量 ====================

/** createBrowserDomOps 可注入 scope：document/window 结构化面（测试 shim 或宿主 harness）。 */
export interface DomOpsScope {
  /** 宿主页 document（缺省 = globalThis.document）。 */
  document?: unknown;
  /** 宿主页 window（缺省 = globalThis.window）。 */
  window?: unknown;
}

function currentView(scope?: DomOpsScope): { doc: Document | null; win: Window | null } {
  if (scope && (scope.document !== undefined || scope.window !== undefined)) {
    return { doc: (scope.document as Document) ?? null, win: (scope.window as Window) ?? null };
  }
  const g = globalThis as { document?: unknown; window?: unknown };
  return { doc: (g.document as Document) ?? null, win: (g.window as Window) ?? null };
}

const DEFAULT_OUTPUT_MAX = 20000; // 输出预算默认（FR-010 兼容 v2 20k）
const DEFAULT_INTERACTIVES_MAX = 200; // interactives 清单预算（I-08/S-08）
const DEFAULT_EXTRACT_MAX = 200; // extractData 单次条数上限（FR-042）
const WAIT_DEFAULT_TIMEOUT_MS = 10000;
const WAIT_MAX_TIMEOUT_MS = 30000;
const WAIT_DEFAULT_INTERVAL_MS = 200;
const LONG_PRESS_DEFAULT_MS = 500;
const EVALUATE_DEFAULT_TIMEOUT_MS = 5000;
const SCREENSHOT_LOAD_TIMEOUT_MS = 3000;
const READ_ELEMENT_STYLES_TEXT_MAX = 800; // read-element --styles true computed cssText 截断上限（C34 改进：截断带标记）

// nodeType 数值常量（避免依赖 Node/NodeFilter 常量对象，兼容 shim）
const NT_ELEMENT = 1;
const NT_TEXT = 3;
const NT_DOCUMENT = 9;
const NT_FRAGMENT = 11;

/** 可交互候选（FR-011）。 */
const INTERACTIVE_SELECTOR = [
  'button',
  'a[href]',
  'input:not([type="hidden"])',
  'select',
  'textarea',
  '[contenteditable]',
  '[role="button"]',
  '[role="link"]',
  '[role="checkbox"]',
  '[role="radio"]',
  '[role="switch"]',
  '[role="tab"]',
  '[role="menuitem"]',
  '[role="option"]',
  'summary',
].join(', ');

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[contenteditable]',
  '[tabindex]',
  'summary',
].join(', ');

const HEADING_SELECTOR = 'h1, h2, h3, h4, h5, h6';

/** 合成事件局限说明（NG-007/EC-007）。 */
const SYNTHETIC_EVENT_NOTE =
  '（合成事件 isTrusted=false：对依赖可信事件的绑定不承诺生效；目标未处理时可在宿主页用 page-eval（FR-037）派发备用路径）';
/** 敏感字段读侧说明（FR-024）。 */
const SENSITIVE_VALUE_NOTE = '（敏感字段值已脱敏：只显示类型/长度/占位，不回显明文，FR-024/EC-005）';

function multiMatchNote(count: number): string {
  return count > 1
    ? `\n提示：定位匹配 ${count} 个元素，按首元素执行（多匹配语义 EC-002；可先 dom find 精确化）`
    : '';
}

// ==================== 结果与预算基元 ====================

function okResult(output: string, dataUrl?: string): PlatformDomOpResult {
  return dataUrl ? { ok: true, output, dataUrl } : { ok: true, output };
}
function errResult(output: string, error: string): PlatformDomOpResult {
  return { ok: false, output, error };
}
/** 能力失败统一转译（FR-009/EC-008）。 */
function capResult(err: unknown, capability: string): PlatformDomOpResult {
  const t = translateCapabilityError(err, capability);
  return { ok: false, output: t.output, error: t.error };
}
function noDocResult(capability: string): PlatformDomOpResult {
  return errResult(`✖ ${capability}：当前环境无宿主页 document（非浏览器宿主页面）`, 'no document');
}

function namedDomError(name: string, message: string): Error {
  const e = new Error(message);
  e.name = name;
  return e;
}

/** 预算截断 + 元信息（NFR-003/EC-010）。 */
function applyBudget(text: string, max: number): { text: string; truncated: boolean; total: number } {
  const total = text.length;
  if (total <= max) return { text, truncated: false, total };
  const head = text.slice(0, max);
  return {
    text: `${head}\n…[已截断：总长 ${total} 字符 > 预算 ${max}；可调大 maxLength 或分页续读]`,
    truncated: true,
    total,
  };
}

function pageItems<T>(list: T[], offset: number, limit?: number): { items: T[]; skipped: number; remaining: number } {
  const from = Math.max(0, offset || 0);
  const skipped = Math.min(from, list.length);
  const rest = list.slice(skipped);
  const items = limit !== undefined && limit >= 0 ? rest.slice(0, limit) : rest;
  return { items, skipped, remaining: rest.length - items.length };
}

function toInt(v: unknown): number | undefined {
  if (typeof v === 'number' && Number.isFinite(v)) return Math.trunc(v);
  if (typeof v === 'string' && /^-?\d+$/.test(v.trim())) return Number(v);
  return undefined;
}

// ==================== 元素描述/状态基元 ====================

function describeTag(el: Element): string {
  let s = el.tagName.toLowerCase();
  if (el.id) s += `#${el.id}`;
  if (typeof el.className === 'string' && el.className.trim()) {
    s += `.${el.className.trim().split(/\s+/).slice(0, 4).join('.')}`;
  }
  return s;
}

function textSnippet(el: Element, max = 60): string {
  const t = (el.textContent ?? '').replace(/\s+/g, ' ').trim();
  return t.length > max ? `${t.slice(0, max)}…` : t;
}

function visibleRect(el: Element): { width: number; height: number } | null {
  if (typeof el.getBoundingClientRect !== 'function') return null;
  try {
    const r = el.getBoundingClientRect();
    return { width: r.width, height: r.height };
  } catch {
    return null;
  }
}

function isVisible(el: Element): boolean {
  const st = (el as HTMLElement).style;
  if (st) {
    if (st.display === 'none') return false;
    if (st.visibility === 'hidden' || st.visibility === 'collapse') return false;
  }
  const r = visibleRect(el);
  if (r) return r.width > 0 && r.height > 0;
  return true; // 无几何能力（shim）：退化为样式判定
}

function isDisabled(el: Element): boolean {
  const any = el as HTMLElement & { disabled?: boolean };
  if (any.disabled === true) return true;
  return el.getAttribute('aria-disabled') === 'true';
}

function isChecked(el: Element): boolean {
  return (el as HTMLInputElement).checked === true;
}

function isSelected(el: Element): boolean {
  return el.tagName === 'OPTION' && (el as HTMLOptionElement).selected === true;
}

function ariaLabel(el: Element): string {
  const al = el.getAttribute('aria-label');
  if (al && al.trim()) return al;
  const title = el.getAttribute('title');
  if (title && title.trim()) return title;
  return textSnippet(el);
}

// ==================== 定位解析（locator 复用，FR-015/ADR-007/EC-002） ====================

const LOCATOR_ERROR_TAIL =
  '\n定位语法帮助：CSS 裸串 / css: 前缀 / text=精确文本 / text*=包含文本；role=/xpath= 明确不支持（不静默当 CSS，EC-002）。';

type ResolvedElements =
  | { ok: true; elements: Element[] }
  | { ok: false; output: string; error: string };

/** 判别联合 ok 收窄（兼容 strict / 非 strict 双编译面：truthiness 判别在非 strict 不生效）。 */
type OkBranch<T extends { ok: boolean }> = Extract<T, { ok: true }>;
type ErrBranch<T extends { ok: boolean }> = Extract<T, { ok: false }>;
function isOk<T extends { ok: boolean }>(r: T): r is OkBranch<T> {
  return r.ok === true;
}
function isErr<T extends { ok: boolean }>(r: T): r is ErrBranch<T> {
  return r.ok === false;
}

/** text 树走：叶子优先 + 去祖先（保留最内层命中，ADR-007）。 */
function resolveTextQuery(root: ParentNode, q: TextLocatorQuery): Element[] {
  const found: Element[] = [];
  const wantedNorm = q.caseSensitive ? q.text : q.text.toLowerCase();
  const norm = (s: string): string => (q.caseSensitive ? s : s.toLowerCase());

  const visit = (node: Node): void => {
    if (node.nodeType === NT_TEXT) {
      const data = node.nodeValue ?? '';
      let hit = false;
      if (q.mode === 'exact') {
        const d = q.trim ? data.trim() : data;
        hit = norm(d) === wantedNorm;
      } else {
        hit = data.length > 0 && norm(data).includes(wantedNorm);
      }
      if (hit && node.parentElement) found.push(node.parentElement);
      return;
    }
    if (node.nodeType !== NT_ELEMENT && node.nodeType !== NT_DOCUMENT && node.nodeType !== NT_FRAGMENT) return;
    const kids = (node as ParentNode).childNodes;
    for (let i = 0; i < kids.length; i++) visit(kids[i]);
  };
  visit(root as unknown as Node);

  const uniq: Element[] = found.filter((el, i) => found.indexOf(el) === i);
  return uniq.filter((el) => !uniq.some((o) => o !== el && el.contains(o)));
}

function resolveQueryIn(root: ParentNode, query: LocatorQuery): ResolvedElements {
  try {
    if (query.type === 'css') {
      return { ok: true, elements: Array.from(root.querySelectorAll(query.css)) };
    }
    return { ok: true, elements: resolveTextQuery(root, query) };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      output: `✖ 定位选择器无效（浏览器拒绝解析）：${msg}${LOCATOR_ERROR_TAIL}`,
      error: 'invalid selector',
    };
  }
}

function resolveLocator(selector: string, root: ParentNode): ResolvedElements {
  const parsed = parseLocator(selector);
  if (isErr(parsed)) {
    return {
      ok: false,
      output: `✖ 定位语法错误：${parsed.error}${LOCATOR_ERROR_TAIL}`,
      error: parsed.kind === 'unsupported' ? 'unsupported locator' : 'invalid locator',
    };
  }
  return resolveQueryIn(root, parsed.query);
}

function firstOf(
  selector: string,
  root: ParentNode,
): { ok: true; el: Element; count: number } | { ok: false; output: string; error: string } {
  const r = resolveLocator(selector, root);
  if (isErr(r)) return r;
  if (r.elements.length === 0) {
    return {
      ok: false,
      output: `✖ 未找到元素 "${selector}"（宿主页同源 DOM；可先 dom find 确认，EC-001）`,
      error: 'element not found',
    };
  }
  return { ok: true, el: r.elements[0], count: r.elements.length };
}

// ==================== 合成事件基元（NG-007 工程公开） ====================

function centerPoint(el: Element): { x: number; y: number } {
  if (typeof el.getBoundingClientRect === 'function') {
    try {
      const r = el.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    } catch {
      /* 忽略 */
    }
  }
  return { x: 0, y: 0 };
}

function mouseInit(el: Element, win: Window | null, extra: MouseEventInit = {}): MouseEventInit {
  const c = centerPoint(el);
  const init: MouseEventInit = { bubbles: true, cancelable: true, view: win, clientX: c.x, clientY: c.y };
  return { ...init, ...extra };
}

function dispatchMouse(el: Element, win: Window | null, type: string, extra: Record<string, unknown> = {}): void {
  el.dispatchEvent(new MouseEvent(type, mouseInit(el, win, extra)));
}

/** hover 真实序列（FR-016）。 */
function dispatchHoverSequence(el: Element, win: Window | null): void {
  const ev = (type: string, bubbles: boolean): void => {
    el.dispatchEvent(new MouseEvent(type, { ...mouseInit(el, win), bubbles, cancelable: true }));
  };
  ev('pointerover', true);
  ev('pointerenter', false);
  ev('mouseover', true);
  ev('mouseenter', false);
  dispatchMouse(el, win, 'pointermove');
  dispatchMouse(el, win, 'mousemove');
}

/** dblclick 序列（FR-018）。 */
function dispatchDblclickSequence(el: Element, win: Window | null): void {
  el.dispatchEvent(new MouseEvent('mousedown', mouseInit(el, win, { detail: 1 })));
  el.dispatchEvent(new MouseEvent('mouseup', mouseInit(el, win, { detail: 1 })));
  el.dispatchEvent(new MouseEvent('mousedown', mouseInit(el, win, { detail: 2 })));
  el.dispatchEvent(new MouseEvent('mouseup', mouseInit(el, win, { detail: 2 })));
  el.dispatchEvent(new MouseEvent('click', mouseInit(el, win, { detail: 2 })));
  el.dispatchEvent(new MouseEvent('dblclick', mouseInit(el, win, { detail: 2 })));
}

// ==================== 表单值基元（ADR-004：native setter + input/change） ====================

function isFormControl(el: Element): boolean {
  return el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT';
}

function isTextLike(el: Element): boolean {
  const tag = el.tagName;
  if (tag === 'TEXTAREA') return true;
  if (tag !== 'INPUT') return false;
  const t = (el.getAttribute('type') || 'text').toLowerCase();
  return !['checkbox', 'radio', 'file', 'submit', 'button', 'reset', 'image', 'hidden'].includes(t);
}

function fieldIdentityOf(el: Element): FieldIdentity {
  const t = el.tagName;
  const type =
    t === 'INPUT'
      ? el.getAttribute('type') || 'text'
      : t === 'SELECT' || t === 'TEXTAREA'
        ? undefined
        : undefined;
  return {
    type,
    name: el.getAttribute('name') || undefined,
    id: el.getAttribute('id') || undefined,
    autocomplete: el.getAttribute('autocomplete') || undefined,
  };
}

function isSensitiveControl(el: Element): boolean {
  return sensitiveFieldMatch(fieldIdentityOf(el)) !== null;
}

/**
 * 敏感控件在 attributes 面的 value 属性占位（C12 加固/FR-024/EC-005）：
 * 服务端预填默认值挂在 value 属性上（与 fields.value 面同一脱敏源 maskValue），
 * 只出分类/长度/占位，不回显明文（与 sensitive.ts「宁可遮不可漏」取向一致）。
 */
function maskSensitiveAttrValue(el: Element, raw: string): string {
  const match = sensitiveFieldMatch(fieldIdentityOf(el));
  const kind = match && match.kind === 'password' ? 'password' : 'credential';
  return maskValue(raw, kind);
}

function readControlValue(el: Element): string {
  const v = (el as HTMLInputElement).value;
  if (typeof v === 'string') return v;
  return (el.textContent ?? '').replace(/\s+/g, ' ').trim();
}

/** 控件所属 <form>（无 = null）。 */
function formOf(el: Element): HTMLFormElement | null {
  return (el as HTMLInputElement).form ?? null;
}

/** native value setter（React 受控兼容基元，ADR-004）。
 *
 * D1 根因修复（FR-022/NFR-004，validate-report v3 §6 遗留 1）：构造器判定用 `typeof Ctor === 'function'`
 * —— `HTMLInputElement`/`HTMLTextAreaElement` 是**构造函数（function）**，旧的 `typeof Ctor === 'object'`
 * 在真实浏览器恒为 false → 原生原型 setter 分支从未执行，静默落到 `el.value = value` 直赋。直赋会命中
 * React 受控字段**实例级 value setter**（inputValueTracking 覆盖），该 setter 同步更新 React 值 tracker
 * （currentValue）→ React 认为值是自己写的 → 后续 input 事件判定「无变化」→ onChange 不触发、state 不提交
 * （D1：DOM 值已变、React 未提交）。走**原型 native setter**（desc.set.call）则绕过实例 setter/tracker，
 * React 在 input 事件时看到 DOM 值 ≠ tracker → 正常派发 onChange（真实浏览器 chromium + lgdl-web React 18
 * 实证：受控字段首次合成键入即提交）。
 */
function setNativeValue(el: Element, value: string): void {
  const tag = el.tagName;
  if (tag === 'SELECT') {
    (el as HTMLSelectElement).value = value;
    return;
  }
  if (tag === 'INPUT' || tag === 'TEXTAREA') {
    const g = globalThis as Record<string, unknown>;
    const Ctor = g[tag === 'INPUT' ? 'HTMLInputElement' : 'HTMLTextAreaElement'];
    const proto = (Ctor as { prototype?: object } | undefined)?.prototype;
    if (typeof Ctor === 'function' && proto) {
      const desc = Object.getOwnPropertyDescriptor(proto, 'value');
      if (desc && typeof desc.set === 'function') {
        desc.set.call(el, value);
        return;
      }
    }
    (el as HTMLInputElement).value = value;
    return;
  }
  (el as HTMLInputElement).value = value;
}

function fireBubbling(el: Element, type: string): void {
  el.dispatchEvent(new Event(type, { bubbles: true, cancelable: true }));
}

function focusEl(el: Element): void {
  const anyEl = el as HTMLElement;
  if (typeof anyEl.focus === 'function') anyEl.focus();
}

function blurEl(el: Element): void {
  const anyEl = el as HTMLElement;
  if (typeof anyEl.blur === 'function') anyEl.blur();
}

/** 写文本控件：focus → native setter → input → change（FR-034/ADR-004）。 */
function writeTextControl(el: Element, value: string): void {
  focusEl(el);
  setNativeValue(el, value);
  fireBubbling(el, 'input');
  fireBubbling(el, 'change');
}

function isFocusable(el: Element): boolean {
  if (isDisabled(el)) return false;
  if (!isVisible(el)) return false;
  if (typeof el.matches !== 'function') return false;
  return el.matches(FOCUSABLE_SELECTOR);
}

/**
 * React 受控/值跟踪输入检测（D1 修复，FR-022/NFR-004）。
 *
 * React DOM 为它管理的 input/textarea 在实例上安装值 tracker `_valueTracker`
 * （getValue/setValue 语义：native setter 直赋绕过该 tracker，React 即认为值被外部改动），
 * 并在宿主节点挂内部 fiber props（React 17+/18 = `__reactProps$*`；React 16 =
 * `__reactEventHandlers$*`，key 后缀随机，受控字段 props 含 value）。
 *
 * 命中信号 = 框架持有受控值恢复语义：typeText 的逐字符 native setter + input 序列在**首次**
 * 合成键入会被 React 判定为外部改值 → onChange 不触发、state 未提交、重渲染回滚（D1）。
 * 此类字段应走与 setValue 同构的全量 set-value 基元路径（单次 setter + input/change）。
 * 非 React / 无 tracker 页面返回 false → type 保持 v2 逐字符行为零回归。
 */
function hasReactValueTracker(el: Element): boolean {
  const node = el as Element & { _valueTracker?: unknown };
  const tracker = node._valueTracker as { getValue?: () => unknown } | undefined;
  if (tracker && typeof tracker.getValue === 'function') return true;
  const anyNode = el as Element & Record<string, unknown>;
  for (const k of Object.keys(anyNode)) {
    if (!k.startsWith('__reactProps$') && !k.startsWith('__reactEventHandlers$')) continue;
    const props = anyNode[k];
    if (props && typeof props === 'object') {
      const rec = props as Record<string, unknown>;
      if (Object.prototype.hasOwnProperty.call(rec, 'value') && rec.value != null) return true;
    }
  }
  return false;
}

// ==================== CSS 路径建议（find detail，FR-013） ====================

function cssPath(el: Element): string {
  if (el.id) return `${el.tagName.toLowerCase()}#${el.id}`;
  const parts: string[] = [];
  let cur: Element | null = el;
  while (cur && cur.nodeType === NT_ELEMENT && parts.length < 4) {
    const tag = cur.tagName.toLowerCase();
    let selector = tag;
    const par: Element | null = cur.parentElement;
    if (par) {
      const siblings = Array.from(par.children).filter((sib) => sib.tagName === tag);
      if (siblings.length > 1) selector = `${tag}:nth-of-type(${siblings.indexOf(cur) + 1})`;
    }
    parts.unshift(selector);
    cur = par;
  }
  return parts.join(' > ');
}

// ==================== 收集器（interactives/headings） ====================

interface InteractiveSummary {
  index: number;
  kind: string;
  describe: string;
  label: string;
  state: string;
  visible: boolean;
  suggest: string;
}

function interactiveKind(el: Element): string {
  const tag = el.tagName;
  if (tag === 'BUTTON' || tag === 'SUMMARY') return 'button';
  if (tag === 'A' && el.hasAttribute('href')) return 'link';
  if (tag === 'INPUT') {
    const t = (el.getAttribute('type') || 'text').toLowerCase();
    return t === 'password' ? 'password' : `input:${t}`;
  }
  if (tag === 'SELECT') return 'select';
  if (tag === 'TEXTAREA') return 'textarea';
  if (el.hasAttribute('contenteditable')) return 'contenteditable';
  const role = el.getAttribute('role');
  if (role) return `role:${role}`;
  return tag.toLowerCase();
}

function interactiveStateFlags(el: Element): string[] {
  const flags: string[] = [];
  if (isDisabled(el)) flags.push('disabled');
  if (isChecked(el)) flags.push('checked');
  if (isSelected(el)) flags.push('selected');
  if ((el as HTMLInputElement).readOnly === true) flags.push('readonly');
  if ((el as HTMLInputElement).required === true) flags.push('required');
  const exp = el.getAttribute('aria-expanded');
  if (exp === 'true' || exp === 'false') flags.push(`expanded:${exp}`);
  return flags;
}

function collectInteractives(doc: Document): InteractiveSummary[] {
  const out: InteractiveSummary[] = [];
  let list: Element[] = [];
  try {
    list = Array.from(doc.querySelectorAll(INTERACTIVE_SELECTOR));
  } catch {
    return out;
  }
  for (const el of list) {
    out.push({
      index: out.length,
      kind: interactiveKind(el),
      describe: describeTag(el),
      label: ariaLabel(el),
      state: interactiveStateFlags(el).join(',') || '—',
      visible: isVisible(el),
      suggest: cssPath(el),
    });
  }
  return out;
}

interface HeadingSummary {
  level: number;
  text: string;
  describe: string;
}

function collectHeadings(doc: Document): HeadingSummary[] {
  let list: Element[] = [];
  try {
    list = Array.from(doc.querySelectorAll(HEADING_SELECTOR));
  } catch {
    return [];
  }
  return list.map((el) => ({
    level: Number(el.tagName.slice(1)),
    text: textSnippet(el, 80),
    describe: describeTag(el),
  }));
}

// ==================== waitFor 条件求值（FR-025/ADR-005） ====================

interface WaitCondEval {
  label: string;
  met: boolean;
  matched: number;
}

function evaluateWaitCondition(
  cond: PlatformWaitForOptions['conditions'][number],
  doc: Document,
): WaitCondEval {
  const target = cond.kind === 'text' ? cond.text ?? '' : (cond.selector ?? '');
  const label = cond.kind === 'text' ? `text=${target}` : `${cond.kind} ${target}`;
  if (target === '') return { label, met: false, matched: 0 };
  const r = resolveLocator(target, doc);
  if (isErr(r)) return { label, met: false, matched: 0 };
  const els = r.elements;
  const count = els.length;
  switch (cond.kind) {
    case 'element':
      return { label, met: count > 0, matched: count };
    case 'gone':
      return { label, met: count === 0, matched: count };
    case 'visible':
      return { label, met: count > 0 && els.some(isVisible), matched: count };
    case 'interactable':
      return { label, met: count > 0 && els.some((el) => isVisible(el) && !isDisabled(el)), matched: count };
    case 'text':
      return { label, met: count > 0, matched: count };
    default:
      return { label, met: false, matched: 0 };
  }
}

function waitStateSummary(states: WaitCondEval[]): string {
  if (states.length === 0) return '（无条件）';
  return states
    .map((s) => `  · ${s.label} → ${s.met ? '✓ 命中' : '✗ 未命中'}（匹配 ${s.matched}）`)
    .join('\n');
}

// ==================== screenshot 基元（ADR-003：SVG foreignObject + canvas） ====================

function cleanClone(root: Element): Element {
  const clone = root.cloneNode(true) as Element;
  const kill = (el: Element): void => {
    for (const k of Array.from(el.children)) {
      const tag = k.tagName;
      if (tag === 'SCRIPT' || tag === 'NOSCRIPT' || tag === 'IFRAME' || tag === 'LINK') {
        el.removeChild(k);
        continue;
      }
      if (tag === 'INPUT' && (k.getAttribute('type') || '').toLowerCase() === 'file') continue;
      kill(k);
    }
  };
  kill(clone);
  return clone;
}

function screenshotSvgData(width: number, height: number, html: string): string {
  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${Math.round(width)}" height="${Math.round(height)}">`,
    `<foreignObject width="100%" height="100%">`,
    `<div xmlns="http://www.w3.org/1999/xhtml">${html}</div>`,
    `</foreignObject></svg>`,
  ].join('');
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function rasterizeSvg(
  svgUrl: string,
  width: number,
  height: number,
  doc: Document,
): Promise<{ dataUrl: string; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const timer = setTimeout(
      () => reject(namedDomError('TimeoutError', '截图图像解码超时')),
      SCREENSHOT_LOAD_TIMEOUT_MS,
    );
    img.onload = () => {
      try {
        clearTimeout(timer);
        const canvas = doc.createElement('canvas');
        canvas.width = Math.max(1, Math.round(width));
        canvas.height = Math.max(1, Math.round(height));
        const ctx = canvas.getContext('2d');
        if (!ctx) throw namedDomError('NotFoundError', 'canvas 2d context 不可用');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve({ dataUrl: canvas.toDataURL('image/png'), width: canvas.width, height: canvas.height });
      } catch (err) {
        clearTimeout(timer);
        reject(err);
      }
    };
    img.onerror = () => {
      clearTimeout(timer);
      reject(namedDomError('NotAllowedError', '截图 SVG 序列化加载失败（可能含不可序列化/跨源资源）'));
    };
    img.src = svgUrl;
  });
}

// ==================== 工厂：真实 PlatformDomOps ====================

/**
 * 浏览器面真实 PlatformDomOps 工厂（FR-003：4 桩补真 + 新能力 #1~#25 真实实现）。
 * @param scope 可选注入（测试 shim / 宿主 harness）；缺省 = globalThis 惰性读取。
 */
export function createBrowserDomOps(scope?: DomOpsScope): PlatformDomOps {
  const view = (): { doc: Document | null; win: Window | null } => currentView(scope);
  const capErr = (err: unknown, cap: string): PlatformDomOpResult => capResult(err, cap);

  return {
    // ---------- 既有 7 方法（零签名改动；4 桩补真 FR-016/017 + read-state 升级 FR-009） ----------

    async readState() {
      const cap = 'DOM 读状态';
      const v = view();
      const doc = v.doc;
      if (!doc) return noDocResult(cap);
      const loc = (v.win?.location ?? (globalThis as { location?: Location }).location) as
        | { href?: string; origin?: string }
        | undefined;
      const dAny = doc as Document & { readyState?: string; referrer?: string; lastModified?: string };
      const wAny = v.win as (Window & { isSecureContext?: boolean }) | null;
      const de = doc.documentElement;
      const lines: string[] = [];
      lines.push(`url: ${loc?.href ?? ''}`);
      lines.push(`title: ${doc.title ?? ''}`);
      // FR-009 多字段升级（新增 ≥2；url/title 行序与 v2 兼容）
      lines.push(`readyState: ${dAny.readyState ?? ''}`);
      lines.push(`origin: ${loc?.origin ?? ''}`);
      lines.push(`referrer: ${dAny.referrer ?? ''}`);
      if (dAny.lastModified) lines.push(`lastModified: ${dAny.lastModified}`);
      if (wAny && wAny.isSecureContext !== undefined) lines.push(`secureContext: ${wAny.isSecureContext}`);
      lines.push(
        `viewport: ${v.win?.innerWidth ?? ''}x${v.win?.innerHeight ?? ''} scroll:${de?.scrollLeft ?? 0},${de?.scrollTop ?? 0}`,
      );
      if (doc.fullscreenElement) lines.push('fullscreen: true');
      return okResult(lines.join('\n'));
    },

    async click(selector: string, opts?: PlatformClickOptions) {
      const cap = 'DOM 点击';
      const doc = view().doc;
      if (!doc) return noDocResult(cap);
      const win = view().win;
      // FR-020 坐标点击：x/y → elementFromPoint 解析目标
      const x = toInt(opts?.x);
      const y = toInt(opts?.y);
      if (x !== undefined && y !== undefined) {
        let target: Element | null = null;
        try {
          target = doc.elementFromPoint(x, y);
        } catch (err) {
          return capErr(err, cap);
        }
        if (!target) {
          return errResult(`✖ 视口坐标 (${x}, ${y}) 处无元素（elementFromPoint 未命中）`, 'no element at point');
        }
        focusEl(target);
        const fire = (type: string): void => {
          target!.dispatchEvent(
            new MouseEvent(type, { bubbles: true, cancelable: true, view: win, clientX: x, clientY: y }),
          );
        };
        fire('mousedown');
        fire('mouseup');
        fire('click');
        return okResult(`✓ 已点击坐标 (${x}, ${y}) → 命中 ${describeTag(target)}`);
      }
      // FR-020 元素内偏移点击
      const offX = toInt(opts?.offsetX);
      const offY = toInt(opts?.offsetY);
      if (offX !== undefined || offY !== undefined) {
        const f = firstOf(selector, doc);
        if (isErr(f)) return errResult(f.output, f.error);
        const c = centerPoint(f.el);
        const rect = visibleRect(f.el);
        const clickX = Math.round(offX !== undefined && rect ? c.x - rect.width / 2 + offX : c.x);
        const clickY = Math.round(offY !== undefined && rect ? c.y - rect.height / 2 + offY : c.y);
        focusEl(f.el);
        const fire = (type: string): void => {
          f.el.dispatchEvent(
            new MouseEvent(type, { bubbles: true, cancelable: true, view: win, clientX: clickX, clientY: clickY }),
          );
        };
        fire('mousedown');
        fire('mouseup');
        fire('click');
        return okResult(
          `✓ 已点击 "${selector}" 偏移 (${offX ?? 0}, ${offY ?? 0})（视口 ${clickX},${clickY}）${multiMatchNote(f.count)}`,
        );
      }
      // selector-only = v2 语义零回归（el.click()）
      const f = firstOf(selector, doc);
      if (isErr(f)) return errResult(f.output, f.error);
      const anyEl = f.el as Element & { click?: () => void };
      if (typeof anyEl.click !== 'function') {
        return errResult(`✖ 元素 "${selector}" 不可点击（无 click 方法）`, 'not clickable');
      }
      anyEl.click();
      return okResult(`✓ 已点击 "${selector}"${multiMatchNote(f.count)}`);
    },

    async hover(selector: string) {
      const cap = 'DOM 悬停';
      const doc = view().doc;
      if (!doc) return noDocResult(cap);
      const f = firstOf(selector, doc);
      if (isErr(f)) return errResult(f.output, f.error);
      // 桩补真（FR-016）：pointer/mouse 事件序列
      dispatchHoverSequence(f.el, view().win);
      return okResult(
        `✓ 已悬停 "${selector}"（pointerover/enter + mouseover/enter + mousemove 已派发）${multiMatchNote(f.count)}${SYNTHETIC_EVENT_NOTE}`,
      );
    },

    async scroll(selector: string | undefined, dx: number, dy: number) {
      const cap = 'DOM 滚动';
      const doc = view().doc;
      if (!doc) return noDocResult(cap);
      const ddx = Number.isFinite(dx) ? dx : 0;
      const ddy = Number.isFinite(dy) ? dy : 0;
      if (ddx === 0 && ddy === 0) {
        return errResult('✖ dom scroll 需要非零 dx/dy（当前 0,0 无滚动动作）', 'zero delta');
      }
      if (!selector) {
        // 页面级滚动（FR-016）
        const w = view().win;
        const se = (doc.scrollingElement ?? doc.documentElement) as Element & {
          scrollTop?: number;
          scrollLeft?: number;
          scrollBy?: (o: { left: number; top: number }) => void;
        };
        const beforeX = w?.scrollX ?? se.scrollLeft ?? 0;
        const beforeY = w?.scrollY ?? se.scrollTop ?? 0;
        if (w && typeof w.scrollBy === 'function') {
          w.scrollBy({ left: ddx, top: ddy });
        } else if (se && typeof se.scrollBy === 'function') {
          se.scrollBy({ left: ddx, top: ddy });
        } else if (se) {
          se.scrollLeft = (se.scrollLeft ?? 0) + ddx;
          se.scrollTop = (se.scrollTop ?? 0) + ddy;
        } else {
          return errResult('✖ 页面滚动目标不可用（无 window/滚动元素）', 'no scroll target');
        }
        const afterX = w?.scrollX ?? se.scrollLeft ?? 0;
        const afterY = w?.scrollY ?? se.scrollTop ?? 0;
        return okResult(`✓ 已滚动页面 (${ddx}, ${ddy})：位置 (${beforeX}, ${beforeY}) → (${afterX}, ${afterY})`);
      }
      // 元素级滚动（scrollBy/scrollTop 语义）
      const f = firstOf(selector, doc);
      if (isErr(f)) return errResult(f.output, f.error);
      const se = f.el as Element & {
        scrollTop?: number;
        scrollLeft?: number;
        scrollBy?: (o: { left: number; top: number }) => void;
      };
      const beforeX = se.scrollLeft ?? 0;
      const beforeY = se.scrollTop ?? 0;
      if (typeof se.scrollBy === 'function') {
        se.scrollBy({ left: ddx, top: ddy });
      } else {
        se.scrollLeft = beforeX + ddx;
        se.scrollTop = beforeY + ddy;
      }
      const afterX = se.scrollLeft ?? 0;
      const afterY = se.scrollTop ?? 0;
      const moved = afterX !== beforeX || afterY !== beforeY;
      return okResult(
        moved
          ? `✓ 已滚动元素 "${selector}" (${ddx}, ${ddy})：scrollLeft/Top (${beforeX}, ${beforeY}) → (${afterX}, ${afterY})`
          : `✖ 元素 "${selector}" 不可滚动（scrollLeft/Top 未变化 ${beforeX},${beforeY}；可换容器/页面滚动）`,
      );
    },

    async zoom(percent: number | undefined) {
      const cap = 'DOM 缩放';
      const doc = view().doc;
      if (!doc) return noDocResult(cap);
      const root = doc.documentElement as (HTMLElement & { style: CSSStyleDeclaration & { zoom?: string } }) | null;
      if (!root) return errResult('✖ 缩放目标不可用（无 documentElement）', 'no root');
      const pct = percent === undefined ? 100 : percent;
      if (!Number.isFinite(pct) || pct < 10 || pct > 500) {
        return errResult(`✖ zoom 参数需在 10~500 之间（当前 ${pct}；100 = 100%）`, 'invalid zoom percent');
      }
      // 桩补真（FR-017）：根元素 zoom 近似；zoom 属性不支持 → transform scale 视觉近似
      let method: 'zoom' | 'transform' | 'none' = 'none';
      try {
        const styleRecord = root.style as CSSStyleDeclaration & Record<string, string>;
        if (typeof styleRecord.zoom === 'string' || 'zoom' in styleRecord) {
          root.style.zoom = pct === 100 ? '' : `${pct}%`;
          method = 'zoom';
        } else {
          root.style.transformOrigin = '0 0';
          root.style.transform = pct === 100 ? '' : `scale(${pct / 100})`;
          method = 'transform';
        }
      } catch (err) {
        return capErr(err, cap);
      }
      const note = method === 'transform' ? '（transform 视觉近似：不影响布局重排）' : '';
      return okResult(`✓ 已缩放页面至 ${pct}%${note}（恢复 100% 用 zoom 100/缺省）`);
    },

    async fullscreen(on: boolean) {
      const cap = '全屏';
      const doc = view().doc;
      if (!doc) return noDocResult(cap);
      try {
        if (on) {
          if (doc.fullscreenEnabled === false) {
            return errResult(
              '✖ 全屏不可用：当前文档 fullscreenEnabled=false（iframe 权限或浏览器策略限制）',
              'fullscreen disabled',
            );
          }
          if (doc.fullscreenElement) return okResult('✓ 已在全屏态（无需重复进入）');
          const root = doc.documentElement as Element & { requestFullscreen?: () => Promise<void> };
          if (typeof root.requestFullscreen !== 'function') {
            return errResult('✖ 全屏不可用：requestFullscreen 不存在（浏览器不支持）', 'fullscreen unsupported');
          }
          await root.requestFullscreen();
          return okResult('✓ 已进入全屏（fullscreenchange 生效；退出用 fullscreen --on false）');
        }
        if (!doc.fullscreenElement) return okResult('✓ 当前未在全屏态（无需退出）');
        await doc.exitFullscreen();
        return okResult('✓ 已退出全屏');
      } catch (err) {
        // 手势授权失败/安全路径 → FR-009 可读转译（EC-008；不再抛桩错误）
        return capErr(err, cap);
      }
    },

    async snapshot() {
      const cap = 'DOM 快照';
      const doc = view().doc;
      if (!doc) return noDocResult(cap);
      const body = doc.body as (HTMLElement & { innerText?: string }) | null;
      const text = body?.innerText ?? body?.textContent ?? '';
      // v2 兼容：无参 snapshot = 纯文本截断 20k 不加附加标记（结构化段走 snapshotStructured，FR-010）
      return okResult(text.slice(0, DEFAULT_OUTPUT_MAX));
    },

    // ---------- #1 可交互清单（FR-011；password 只出类型不出值） ----------

    async interactives(opts?: PlatformInteractivesOptions) {
      const cap = 'interactives';
      const doc = view().doc;
      if (!doc) return noDocResult(cap);
      const all = collectInteractives(doc);
      const typeFilter = opts?.type?.toLowerCase();
      const stateFilter = opts?.state?.toLowerCase();
      const textFilter = opts?.text?.toLowerCase();
      const filtered = all.filter((it) => {
        if (typeFilter && !it.kind.includes(typeFilter) && !it.describe.toLowerCase().includes(typeFilter)) return false;
        if (stateFilter) {
          const stateHit =
            stateFilter === 'visible' ? it.visible : stateFilter === 'hidden' ? !it.visible : it.state.includes(stateFilter);
          if (!stateHit) return false;
        }
        if (textFilter && !it.label.toLowerCase().includes(textFilter)) return false;
        return true;
      });
      const maxItems = opts?.maxItems ?? DEFAULT_INTERACTIVES_MAX;
      const pg = pageItems(filtered, opts?.offset ?? 0, opts?.limit);
      const visibleCount = filtered.filter((i) => i.visible).length;
      const lines: string[] = [
        `interactives：匹配 ${filtered.length} / 清单总数 ${all.length}（可见 ${visibleCount}；password 只出类型不出值 FR-024）`,
      ];
      for (const it of pg.items) {
        lines.push(
          `[${it.index}] ${it.kind} <${it.describe}> ${it.label ? `「${it.label}」` : ''} 状态:${it.state} 可见:${it.visible ? 'true' : 'false'} 建议:${it.suggest}`,
        );
      }
      if (filtered.length > maxItems && opts?.limit === undefined) {
        lines.push(
          `…[清单预算：共 ${filtered.length} 条 > 单次上限 ${maxItems}；用 --type/--state/--text 过滤或 --offset/--limit 分页续读]`,
        );
      } else if (pg.remaining > 0) {
        lines.push(`…[还有 ${pg.remaining} 条未列出；用 --offset ${(opts?.offset ?? 0) + pg.items.length} 续读]`);
      }
      if (filtered.length === 0) {
        lines.push('（无匹配条目——查询语义非错误，EC-001：可放宽过滤或确认页面已渲染可交互元素）');
      }
      const b = applyBudget(lines.join('\n'), DEFAULT_OUTPUT_MAX);
      return okResult(b.text);
    },

    // ---------- #2 单元素多面读取（FR-012；敏感值脱敏） ----------

    async readElement(opts: PlatformReadElementOptions) {
      const cap = 'read-element';
      const doc = view().doc;
      if (!doc) return noDocResult(cap);
      const f = firstOf(opts.selector, doc);
      if (isErr(f)) return errResult(f.output, f.error);
      const el = f.el;
      const fields = opts.fields ?? {};
      const anyFieldRequested = Object.keys(fields).length > 0;
      type FieldName = 'attributes' | 'text' | 'classList' | 'styles' | 'geometry' | 'state' | 'value';
      const want = (name: FieldName): boolean =>
        anyFieldRequested ? fields[name] !== undefined : name === 'text' || name === 'geometry' || name === 'state';
      const lines: string[] = [];
      lines.push(`tag: ${describeTag(el)}`);
      lines.push(`count: ${f.count}（多匹配按首元素，EC-002）`);
      if (want('attributes')) {
        const sel = fields.attributes;
        if (sel === true) {
          // 敏感控件的服务端预填默认值挂在 value 属性上：attributes 全量面同样脱敏，
          // 不原文回显（C12 加固；与 fields.value 面掩码一致，FR-024/EC-005）
          const attrs = Array.from(el.attributes).map((a) => {
            const shown = a.name === 'value' && isSensitiveControl(el) && a.value !== ''
              ? maskSensitiveAttrValue(el, a.value)
              : a.value;
            return `${a.name}="${shown}"`;
          });
          lines.push(`attributes: ${attrs.join(' ') || '（无属性）'}`);
        } else if (Array.isArray(sel)) {
          const got = sel
            .map((n) => {
              const raw = el.getAttribute(n) ?? '';
              const shown = n === 'value' && isSensitiveControl(el) && raw !== '' ? maskSensitiveAttrValue(el, raw) : raw;
              return `${n}="${shown}"`;
            })
            .join(' ');
          lines.push(`attributes: ${got || '（无）'}`);
        } else {
          const ident: string[] = [];
          for (const n of ['id', 'class', 'type', 'name', 'href', 'src', 'role', 'aria-label', 'title', 'placeholder']) {
            const v = el.getAttribute(n);
            if (v !== null && v !== '') ident.push(`${n}="${v}"`);
          }
          lines.push(`identity: ${ident.join(' ') || '（无关键属性）'}`);
        }
      }
      if (want('text')) {
        const t = (el.textContent ?? '').replace(/\s+/g, ' ').trim();
        lines.push(`text: ${t.slice(0, 500) || '（空）'}`);
      }
      if (want('classList')) {
        lines.push(`classList: ${typeof el.className === 'string' && el.className.trim() ? el.className.trim() : '（空）'}`);
      }
      if (want('styles')) {
        const sel = fields.styles;
        const cs = doc.defaultView && typeof doc.defaultView.getComputedStyle === 'function' ? doc.defaultView.getComputedStyle(el) : null;
        if (sel === true) {
          const css = cs?.cssText ?? '';
          const head = css.slice(0, READ_ELEMENT_STYLES_TEXT_MAX);
          const truncNote = css.length > READ_ELEMENT_STYLES_TEXT_MAX
            ? `…（styles 已截断：全量 ${css.length} 字符）`
            : '';
          lines.push(`styles(computed): ${head || '（不可读/空）'}${truncNote}`);
        } else if (Array.isArray(sel)) {
          lines.push(`styles: ${sel.map((p) => `${p}=${cs?.getPropertyValue(p) ?? ''}`).join(' ') || '（空）'}`);
        }
      }
      if (want('geometry')) {
        let geo: string;
        try {
          const r = el.getBoundingClientRect();
          const win = view().win;
          const inView =
            win && typeof win.innerWidth === 'number'
              ? r.left < win.innerWidth && r.top < win.innerHeight && r.right > 0 && r.bottom > 0
              : undefined;
          geo = `rect{x:${Math.round(r.left)},y:${Math.round(r.top)},w:${Math.round(r.width)},h:${Math.round(r.height)}} visible:${isVisible(el)} inViewport:${inView === undefined ? 'n/a' : inView}`;
        } catch (err) {
          geo = `读取失败：${err instanceof Error ? err.message : String(err)}`;
        }
        lines.push(`geometry: ${geo}`);
      }
      if (want('state')) {
        const flags: string[] = [];
        if (isDisabled(el)) flags.push('disabled');
        if (isChecked(el)) flags.push('checked');
        if (isSelected(el)) flags.push('selected');
        if ((el as HTMLInputElement).readOnly === true) flags.push('readOnly');
        if ((el as HTMLInputElement).required === true) flags.push('required');
        const exp = el.getAttribute('aria-expanded');
        if (exp) flags.push(`expanded:${exp}`);
        lines.push(`state: ${flags.join(' ') || '（无特殊状态）'}`);
      }
      if (want('value')) {
        if (isFormControl(el)) {
          const raw = readControlValue(el);
          if (isSensitiveControl(el)) {
            const match = sensitiveFieldMatch(fieldIdentityOf(el));
            const kind = match && match.kind === 'password' ? 'password' : 'credential';
            lines.push(`value: ${maskValue(raw, kind)} ${SENSITIVE_VALUE_NOTE}`);
          } else {
            lines.push(`value: ${raw.length > 200 ? `${raw.slice(0, 200)}…（${raw.length} 字符）` : raw || '（空）'}`);
          }
        } else {
          lines.push(`value: （非表单控件 ${el.tagName} 无 value；文本读 text，结构读 structure）`);
        }
      }
      const b = applyBudget(lines.join('\n'), DEFAULT_OUTPUT_MAX);
      return okResult(b.text);
    },

    // ---------- #3 find（FR-013；0 匹配 = ok:true 查询语义 EC-001） ----------

    async findElements(opts: PlatformFindElementsOptions) {
      const cap = 'find';
      const doc = view().doc;
      if (!doc) return noDocResult(cap);
      const r = resolveLocator(opts.selector, doc);
      if (isErr(r)) return errResult(r.output, r.error);
      const lines: string[] = [`find "${opts.selector}"：共匹配 ${r.elements.length} 个元素`];
      if (r.elements.length === 0) {
        lines.push('（未找到匹配——查询语义非错误，EC-001：可换 selector/text=，或先 wait 等渲染后再查）');
        return okResult(lines.join('\n'));
      }
      const pg = pageItems(r.elements, 0, opts.limit);
      for (const el of pg.items) {
        const detail = opts.detail ? ` 建议:${cssPath(el)}` : '';
        lines.push(
          `· <${describeTag(el)}> 「${textSnippet(el, 50)}」 可见:${isVisible(el)}${isDisabled(el) ? ' disabled' : ''}${detail}`,
        );
      }
      if (pg.remaining > 0) {
        lines.push(`…[还有 ${pg.remaining} 个未列出；可 --limit 增补或更精确 selector 收敛（EC-002）]`);
      }
      const b = applyBudget(lines.join('\n'), DEFAULT_OUTPUT_MAX);
      return okResult(b.text);
    },

    // ---------- #4 结构读取（FR-014） ----------

    async readStructure(opts: PlatformReadStructureOptions) {
      const cap = 'structure';
      const doc = view().doc;
      if (!doc) return noDocResult(cap);
      const parts = opts.parts ?? ['children'];
      const maxLength = opts.maxLength ?? DEFAULT_OUTPUT_MAX;
      let target: Element = doc.documentElement;
      let targetLabel = 'documentElement（页级）';
      let targetNote = '';
      if (opts.selector) {
        const f = firstOf(opts.selector, doc);
        if (isErr(f)) return errResult(f.output, f.error);
        target = f.el;
        targetLabel = `"${opts.selector}"`;
        targetNote = multiMatchNote(f.count);
      }
      const scope = target === doc.documentElement ? (doc as ParentNode) : (target as ParentNode);
      const lines: string[] = [];
      const pushPart = (title: string, body: string): void => {
        const b = applyBudget(body, maxLength);
        lines.push(`── ${title} ──`);
        lines.push(b.text);
        if (b.truncated) lines.push(`…[${title} 已截断：总长 ${b.total} > 预算 ${maxLength}]`);
      };
      for (const part of parts) {
        if (part === 'children') {
          const kids = Array.from(target.children);
          lines.push(`── children（${targetLabel} 直接子元素 ${kids.length} 个）──`);
          if (kids.length === 0) lines.push('（无子元素——文本/叶子元素可读 read-element text）');
          for (const k of kids.slice(0, 100)) {
            const txt = textSnippet(k, 40);
            lines.push(`· <${describeTag(k)}>${txt ? ` 「${txt}」` : ''}`);
          }
          if (kids.length > 100) lines.push(`…[仅列前 100 / 共 ${kids.length} 子元素]`);
        } else if (part === 'outerHTML') {
          pushPart(`outerHTML（${targetLabel}）`, target.outerHTML ?? '');
        } else if (part === 'links') {
          const list = Array.from(scope.querySelectorAll('a[href]'));
          lines.push(`── links：${list.length} 个链接 ──`);
          for (const a of list.slice(0, 200)) {
            lines.push(`· <${describeTag(a)}> href="${a.getAttribute('href') ?? ''}" 「${textSnippet(a, 40)}」`);
          }
          if (list.length > 200) lines.push(`…[仅列前 200 / 共 ${list.length}]`);
        } else if (part === 'images') {
          const list = Array.from(scope.querySelectorAll('img'));
          lines.push(`── images：${list.length} 个图片 ──`);
          for (const img of list.slice(0, 200)) {
            lines.push(`· <img> src="${img.getAttribute('src') ?? ''}" alt="${img.getAttribute('alt') ?? ''}"`);
          }
          if (list.length > 200) lines.push(`…[仅列前 200 / 共 ${list.length}]`);
        } else if (part === 'headings') {
          const list = Array.from(scope.querySelectorAll(HEADING_SELECTOR));
          lines.push(`── headings：${list.length} 个标题 ──`);
          for (const h of list.slice(0, 200)) {
            lines.push(`· ${'  '.repeat(Math.max(0, Number(h.tagName.slice(1)) - 1))}<${h.tagName.toLowerCase()}> ${textSnippet(h, 60)}`);
          }
          if (list.length > 200) lines.push(`…[仅列前 200 / 共 ${list.length}]`);
        } else if (part === 'forms') {
          const list = Array.from(scope.querySelectorAll('input, select, textarea, button'));
          lines.push(`── forms：${list.length} 个控件 ──`);
          for (const c of list.slice(0, 200)) {
            const fid = fieldIdentityOf(c);
            const sen = sensitiveFieldMatch(fid) ? ' 敏感!' : '';
            const nm = c.getAttribute('name');
            const ty = c.getAttribute('type');
            lines.push(`· <${c.tagName.toLowerCase()}${nm ? ` name="${nm}"` : ''}${ty ? ` type="${ty}"` : ''}>${sen}${c.hasAttribute('disabled') ? ' disabled' : ''}`);
          }
          if (list.length > 200) lines.push(`…[仅列前 200 / 共 ${list.length}]`);
        }
      }
      if (opts.serialize === true && !parts.includes('outerHTML')) {
        pushPart('serialize（documentElement.outerHTML）', doc.documentElement.outerHTML ?? '');
      }
      const out = lines.join('\n');
      const b = applyBudget(out, maxLength);
      const finalText = b.truncated ? b.text : out;
      return okResult(`${finalText}${targetNote}`);
    },

    // ---------- #5 snapshotStructured（FR-010/S-08：结构化段 + 分页 + 预算） ----------

    async snapshotStructured(opts?: PlatformSnapshotStructuredOptions) {
      const cap = 'snapshotStructured';
      const doc = view().doc;
      if (!doc) return noDocResult(cap);
      const sections = opts?.sections ?? ['interactives', 'headings'];
      const maxLength = opts?.maxLength ?? DEFAULT_OUTPUT_MAX;
      const entries: string[] = [];
      const meta: string[] = [];
      if (sections.includes('interactives')) {
        const its = collectInteractives(doc);
        meta.push(`interactives ${its.length} 条`);
        for (const it of its) {
          entries.push(`[interactive ${it.index}] ${it.kind} <${it.describe}> ${it.label ? `「${it.label}」` : ''} 状态:${it.state} 可见:${it.visible}`);
        }
      }
      if (sections.includes('headings')) {
        const hs = collectHeadings(doc);
        meta.push(`headings ${hs.length} 条`);
        for (const h of hs) {
          entries.push(`[heading h${h.level}] ${h.text}（<${h.describe}>）`);
        }
      }
      const pg = pageItems(entries, opts?.offset ?? 0, opts?.limit);
      const lines: string[] = [
        `snapshot 结构化段（${sections.join('+')}）：${meta.join(' / ')}；本次列 ${pg.items.length} 条（offset=${opts?.offset ?? 0}）`,
        ...pg.items,
      ];
      if (pg.remaining > 0) {
        lines.push(`…[还有 ${pg.remaining} 条；续读用 offset=${(opts?.offset ?? 0) + pg.items.length}]`);
      }
      const b = applyBudget(lines.join('\n'), maxLength);
      return okResult(b.text);
    },

    // ---------- #6 dblclick（FR-018） ----------

    async dblclick(selector: string) {
      const cap = 'dblclick';
      const doc = view().doc;
      if (!doc) return noDocResult(cap);
      const f = firstOf(selector, doc);
      if (isErr(f)) return errResult(f.output, f.error);
      focusEl(f.el);
      dispatchDblclickSequence(f.el, view().win);
      return okResult(`✓ 已双击 "${selector}"（mousedown/up×2 + dblclick 已派发）${multiMatchNote(f.count)}${SYNTHETIC_EVENT_NOTE}`);
    },

    // ---------- #7 contextmenu（FR-018） ----------

    async contextmenu(selector: string) {
      const cap = 'contextmenu';
      const doc = view().doc;
      if (!doc) return noDocResult(cap);
      const f = firstOf(selector, doc);
      if (isErr(f)) return errResult(f.output, f.error);
      focusEl(f.el);
      dispatchMouse(f.el, view().win, 'contextmenu', { button: 2 });
      return okResult(`✓ 已触发右键 contextmenu（${describeTag(f.el)}）${multiMatchNote(f.count)}${SYNTHETIC_EVENT_NOTE}`);
    },

    // ---------- #8 longPress（FR-019；ms 可配，缺省 500） ----------

    async longPress(selector: string, ms: number) {
      const cap = 'long-press';
      const doc = view().doc;
      if (!doc) return noDocResult(cap);
      const f = firstOf(selector, doc);
      if (isErr(f)) return errResult(f.output, f.error);
      const holdMs = Number.isFinite(ms) && ms > 0 ? Math.min(ms, 10000) : LONG_PRESS_DEFAULT_MS;
      const c = centerPoint(f.el);
      const pInit: PointerEventInit = {
        bubbles: true,
        cancelable: true,
        view: view().win ?? undefined,
        clientX: c.x,
        clientY: c.y,
        button: 0,
        pointerId: 1,
        isPrimary: true,
      };
      f.el.dispatchEvent(new PointerEvent('pointerdown', pInit));
      dispatchMouse(f.el, view().win, 'mousedown', { button: 0 });
      await new Promise((r) => setTimeout(r, holdMs));
      f.el.dispatchEvent(new PointerEvent('pointerup', pInit));
      dispatchMouse(f.el, view().win, 'mouseup', { button: 0 });
      dispatchMouse(f.el, view().win, 'click', { button: 0 });
      return okResult(
        `✓ 已长按 "${selector}" ${holdMs}ms（pointerdown → hold → pointerup/mouseup 序列）${multiMatchNote(f.count)}${SYNTHETIC_EVENT_NOTE}`,
      );
    },

    // ---------- #9 dragDrop（FR-019；HTML5 DnD 序列 + EC-007 提示） ----------

    async dragDrop(from: string, to: string) {
      const cap = 'drag';
      const doc = view().doc;
      if (!doc) return noDocResult(cap);
      const sf = firstOf(from, doc);
      if (isErr(sf)) return errResult(sf.output, sf.error);
      const tf = firstOf(to, doc);
      if (isErr(tf)) return errResult(tf.output, tf.error);
      let dt: DataTransfer | undefined;
      try {
        dt = new DataTransfer();
      } catch {
        dt = undefined;
      }
      const dragEvent = (type: string, el: Element): void => {
        const init: DragEventInit = { bubbles: true, cancelable: true, view: view().win ?? undefined };
        if (dt) init.dataTransfer = dt;
        el.dispatchEvent(new DragEvent(type, init));
      };
      dragEvent('dragstart', sf.el);
      dragEvent('dragenter', tf.el);
      dragEvent('dragover', tf.el);
      dragEvent('drop', tf.el);
      dragEvent('dragend', sf.el);
      return okResult(
        `✓ 已派发 HTML5 DnD 序列 dragstart（${describeTag(sf.el)}）→ dragenter/dragover/drop（${describeTag(tf.el)}）→ dragend。` +
          '若目标不处理合成事件（isTrusted=false），可用 page-eval（FR-037）派发备用路径（EC-007）',
      );
    },

    // ---------- #10 focus/blur（FR-021） ----------

    async focusEl(selector: string) {
      const cap = 'focus';
      const doc = view().doc;
      if (!doc) return noDocResult(cap);
      const f = firstOf(selector, doc);
      if (isErr(f)) return errResult(f.output, f.error);
      if (!isFocusable(f.el)) {
        return errResult(`✖ 元素 "${selector}"（${describeTag(f.el)}）不可聚焦（disabled/不可见/非可聚焦标签，EC-001）`, 'not focusable');
      }
      focusEl(f.el);
      const active = doc.activeElement;
      const isActive = active === f.el || (active !== null && f.el.contains(active));
      return okResult(
        isActive
          ? `✓ 已聚焦 "${selector}"（activeElement=${describeTag(f.el)}）${multiMatchNote(f.count)}`
          : `✓ 已调用 focus("${selector}")（当前 activeElement=${active ? describeTag(active) : 'body'}）${multiMatchNote(f.count)}`,
      );
    },

    async blurEl(selector: string) {
      const cap = 'blur';
      const doc = view().doc;
      if (!doc) return noDocResult(cap);
      const f = firstOf(selector, doc);
      if (isErr(f)) return errResult(f.output, f.error);
      const wasActive = doc.activeElement === f.el || (doc.activeElement !== null && f.el.contains(doc.activeElement));
      blurEl(f.el);
      return okResult(
        wasActive
          ? `✓ 已失焦 "${selector}"${multiMatchNote(f.count)}`
          : `✓ 已调用 blur("${selector}")（原非 activeElement）${multiMatchNote(f.count)}`,
      );
    },

    // ---------- #11 typeText（FR-022/ADR-004：字符级 native setter + 受控值 tracker 全量 set-value 提交 D1） ----------

    async typeText(selector: string, text: string, typeOpts?: { clear?: boolean }) {
      const cap = 'type';
      const doc = view().doc;
      if (!doc) return noDocResult(cap);
      const f = firstOf(selector, doc);
      if (isErr(f)) return errResult(f.output, f.error);
      const el = f.el;
      const tag = el.tagName;
      const isContentEditable = el.hasAttribute('contenteditable');
      if (tag !== 'INPUT' && tag !== 'TEXTAREA' && !isContentEditable) {
        return errResult(
          `✖ 元素 "${selector}"（${tag}）不可键入：type 目标需 input/textarea/contenteditable（select 用 set-value/fill）`,
          'not typeable',
        );
      }
      if (tag === 'INPUT' && (el.getAttribute('type') || 'text').toLowerCase() === 'file') {
        return errResult('✖ input[type=file] 不支持程序化键入/赋值（浏览器安全限制 NG-004；请用户侧选择文件）', 'file input unsupported');
      }
      focusEl(el);
      const win = view().win;
      if (isContentEditable) {
        const before = el.textContent ?? '';
        const dExec = doc as Document & { execCommand?: (a: string, b: boolean, c: string) => boolean };
        try {
          if (typeof dExec.execCommand === 'function') {
            dExec.execCommand('insertText', false, text);
          } else {
            el.textContent = before + text;
          }
        } catch {
          el.textContent = before + text;
        }
        fireBubbling(el, 'input');
        const after = el.textContent ?? '';
        // execCommand('insertText') = 光标处插入（真实浏览器焦点语义：可能插在 caret 而非仅尾部）；
        // 回读校验 = 长度净增 text.length 且文本已出现（EC-006：长度未变 = setter 被吞 → 报不同步，不静默成功）
        const lengthGrown = after.length === before.length + text.length;
        const textInserted = text.length === 0 || after.includes(text);
        if (!lengthGrown || !textInserted) {
          return errResult(
            '✖ type 已派发但 contenteditable 值可能未同步（EC-006：事件已派发但值可能未同步，不静默成功）',
            'value not synced',
          );
        }
        return okResult(`✓ 已键入 ${text.length} 字符到 contenteditable "${selector}"${SYNTHETIC_EVENT_NOTE}`);
      }
      const isTextArea = tag === 'TEXTAREA';
      const displayText = text.length > 60 ? `${text.slice(0, 60)}…（${text.length} 字符）` : text;
      // 逐字符事件预构建（过滤不可键入字符，语义与 v2 一致）：供 v2 逐字符路径与受控全量路径共用
      const typed: Array<{ ch: string; init: KeyboardEventInit }> = [];
      for (const ch of Array.from(text)) {
        if (ch === '\r') continue;
        if (!isTextArea && ch === '\n') continue;
        const key = ch === '\n' ? 'Enter' : ch;
        const code = /^[a-zA-Z]$/.test(ch)
          ? `Key${ch.toUpperCase()}`
          : /^[0-9]$/.test(ch)
            ? `Digit${ch}`
            : ch === '\n'
              ? 'Enter'
              : '';
        typed.push({ ch, init: { key, code, bubbles: true, cancelable: true, view: win ?? undefined } });
      }
      // D1 修复（FR-022/NFR-004，validate-report v3 §6 遗留 1）：
      // 真实浏览器根因 = setNativeValue 构造器判定 bug（见其上注释）：直赋命中 React 实例级 value setter
      // → 值 tracker 被更新 → React 认为值是自己写的 → input 事件不触发 onChange。修复后受控字段走
      // **与 set-value 同构的全量提交基元**（单次原型 native setter + 单次 input/change = React
      // onChange/state 提交必达，chromium + lgdl-web React 18 首交互实证）；字符级 keydown/keyup 事件
      // 作为**非受控路径的附加语义**保留在下方 v2 逐字符路径，受控路径不派发（受控单发提交 + 可读说明，
      // EC-006；需要键盘语义时用 press/真实键入，NG-007）。
      if (hasReactValueTracker(el)) {
        const base = typeOpts?.clear === true ? '' : readControlValue(el);
        const finalValue = base + typed.map((t) => t.ch).join('');
        setNativeValue(el, finalValue);
        fireBubbling(el, 'input');
        fireBubbling(el, 'change');
        const final = readControlValue(el);
        if (final !== finalValue) {
          return errResult(
            `✖ type 已派发（单次 input/change 全量提交）但回读不一致（EC-006：期望 ${finalValue.length} 字符，实际 ${final.length}；受控字段值可能被宿主还原，不静默成功）`,
            'value not synced',
          );
        }
        // EC-006：如实说明提交方式（全量 set-value 基元 + 单次 commit 事件；字符级键盘事件不派发；
        // isTrusted 局限见 NOTE），不静默声称逐字符成功；valueSynced=true = DOM 已写入且单发 commit 事件已派发
        // （React state 回执由宿主 onChange 承接，NFR-004 单发提交必达）。
        const typedResult: PlatformDomOpResult & { valueSynced?: boolean } = {
          ok: true,
          output: `✓ 已键入 "${displayText}" 到 "${selector}"（${typed.length} 字符；受控字段 → set-value 全量提交基元：单次 native setter + input/change，React onChange/state 提交 NFR-004（D1 修复）；字符级键盘事件保留给非受控路径，未派发）${multiMatchNote(f.count)}${SYNTHETIC_EVENT_NOTE}`,
          valueSynced: true,
        };
        return typedResult;
      }
      if (typeOpts?.clear === true) {
        setNativeValue(el, '');
        fireBubbling(el, 'input');
      }
      let cur = readControlValue(el);
      for (const t of typed) {
        el.dispatchEvent(new KeyboardEvent('keydown', t.init));
        cur += t.ch;
        setNativeValue(el, cur);
        fireBubbling(el, 'input');
        el.dispatchEvent(new KeyboardEvent('keyup', t.init));
      }
      fireBubbling(el, 'change');
      const final = readControlValue(el);
      const expected = typeOpts?.clear === true ? text : cur;
      if (final !== expected) {
        return errResult(
          `✖ type 已派发（${typed.length} 字符 keydown/input/keyup + change）但回读不一致（EC-006：期望 ${expected.length} 字符，实际 ${final.length}；事件已派发但值可能未同步，不静默成功）`,
          'value not synced',
        );
      }
      return okResult(
        `✓ 已键入 "${displayText}" 到 "${selector}"（${typed.length} 字符；字符级 keydown/input/keyup + change；React 受控经 native setter，NFR-004）${multiMatchNote(f.count)}${SYNTHETIC_EVENT_NOTE}`,
      );
    },

    // ---------- #12 pressKey（FR-023：修饰符组合 + keydown→keyup） ----------

    async pressKey(combo: string, keyOpts?: PlatformPressKeyOptions) {
      const cap = 'press';
      const doc = view().doc;
      if (!doc) return noDocResult(cap);
      if (!combo || typeof combo !== 'string') {
        return errResult('✖ dom press 缺少 --combo（如 "Enter" / "ctrl+s" / "Shift+Tab"）', 'missing combo');
      }
      const KEY_DEFS: Record<string, { key: string; code: string }> = {
        enter: { key: 'Enter', code: 'Enter' },
        return: { key: 'Enter', code: 'Enter' },
        tab: { key: 'Tab', code: 'Tab' },
        escape: { key: 'Escape', code: 'Escape' },
        esc: { key: 'Escape', code: 'Escape' },
        backspace: { key: 'Backspace', code: 'Backspace' },
        delete: { key: 'Delete', code: 'Delete' },
        del: { key: 'Delete', code: 'Delete' },
        space: { key: ' ', code: 'Space' },
        arrowup: { key: 'ArrowUp', code: 'ArrowUp' },
        up: { key: 'ArrowUp', code: 'ArrowUp' },
        arrowdown: { key: 'ArrowDown', code: 'ArrowDown' },
        down: { key: 'ArrowDown', code: 'ArrowDown' },
        arrowleft: { key: 'ArrowLeft', code: 'ArrowLeft' },
        left: { key: 'ArrowLeft', code: 'ArrowLeft' },
        arrowright: { key: 'ArrowRight', code: 'ArrowRight' },
        right: { key: 'ArrowRight', code: 'ArrowRight' },
        home: { key: 'Home', code: 'Home' },
        end: { key: 'End', code: 'End' },
        pageup: { key: 'PageUp', code: 'PageUp' },
        pagedown: { key: 'PageDown', code: 'PageDown' },
        insert: { key: 'Insert', code: 'Insert' },
      };
      for (let i = 1; i <= 12; i++) KEY_DEFS[`f${i}`] = { key: `F${i}`, code: `F${i}` };
      const tokens = combo.split('+').map((t) => t.trim()).filter((t) => t.length > 0);
      if (tokens.length === 0) return errResult('✖ press --combo 为空', 'empty combo');
      let ctrl = false;
      let alt = false;
      let shift = false;
      let meta = false;
      let keyName = '';
      for (const tok of tokens) {
        const low = tok.toLowerCase();
        if (low === 'ctrl' || low === 'control') ctrl = true;
        else if (low === 'alt' || low === 'option') alt = true;
        else if (low === 'shift') shift = true;
        else if (low === 'meta' || low === 'cmd' || low === 'command' || low === 'win' || low === 'super') meta = true;
        else keyName = tok;
      }
      if (keyName === '') return errResult(`✖ press 组合 "${combo}" 缺主键（只有修饰符）`, 'no main key');
      const keyLow = keyName.toLowerCase();
      const singleChar = keyName.length === 1;
      let key = keyName;
      let code = '';
      if (!singleChar) {
        const def = KEY_DEFS[keyLow];
        if (!def) {
          return errResult(
            `✖ 不支持的按键 "${keyName}"（支持：Enter/Tab/Escape/Backspace/Delete/Space/方向键/Home/End/PageUp/PageDown/Insert/F1~F12/单字符，可配 ctrl/alt/shift/meta 修饰）`,
            'unknown key',
          );
        }
        key = def.key;
        code = def.code;
      } else {
        code = /^[a-zA-Z]$/.test(keyName) ? `Key${keyName.toUpperCase()}` : /^[0-9]$/.test(keyName) ? `Digit${keyName}` : '';
      }
      // 目标：显式 selector → focus；缺省 = 当前 activeElement（body 兜底）
      let target: Element | null = doc.activeElement;
      if (keyOpts?.selector) {
        const f = firstOf(keyOpts.selector, doc);
        if (isErr(f)) return errResult(f.output, f.error);
        if (!isFocusable(f.el)) {
          return errResult(`✖ press 目标 "${keyOpts.selector}" 不可聚焦`, 'not focusable');
        }
        focusEl(f.el);
        target = f.el;
      }
      if (!target || target === doc.body) target = doc.activeElement ?? doc.body;
      if (!target) return errResult('✖ press 无目标元素（无 activeElement/body）', 'no target');
      const init: KeyboardEventInit = {
        key,
        code,
        ctrlKey: ctrl,
        altKey: alt,
        shiftKey: shift,
        metaKey: meta,
        bubbles: true,
        cancelable: true,
        view: view().win ?? undefined,
      };
      target.dispatchEvent(new KeyboardEvent('keydown', init));
      target.dispatchEvent(new KeyboardEvent('keyup', init));
      const mods = `${ctrl ? 'ctrl+' : ''}${alt ? 'alt+' : ''}${shift ? 'shift+' : ''}${meta ? 'meta+' : ''}`;
      const dest = describeTag(target);
      const extra =
        key === 'Enter'
          ? '（原生表单隐式提交需真实按键/requestSubmit；React onKeyDown 可收到合成事件）'
          : key === 'Tab'
            ? '（Tab 默认焦点移动由浏览器真实按键承载；合成事件不移动焦点）'
            : '';
      return okResult(`✓ 已派发 ${mods}${keyName}（keydown→keyup）到 ${dest}${extra}${SYNTHETIC_EVENT_NOTE}`);
    },

    // ---------- #13 setText（FR-031：textContent 覆盖语义 + 回读校验） ----------

    async setText(selector: string, text: string) {
      const cap = 'set-text';
      const doc = view().doc;
      if (!doc) return noDocResult(cap);
      const f = firstOf(selector, doc);
      if (isErr(f)) return errResult(f.output, f.error);
      const el = f.el;
      if (isFormControl(el)) {
        return errResult(
          `✖ set-text 目标 "${selector}" 是表单控件（${el.tagName}）：改值请用 set-value/type/fill（FR-031 语义为 textContent 覆盖）`,
          'use set-value',
        );
      }
      el.textContent = text;
      // 回读校验（EC-006）
      const back = el.textContent ?? '';
      if (back !== text) {
        return errResult(
          `✖ set-text 已写入但回读不一致（期望 ${text.length} 字符，实际 ${back.length}；EC-006 不静默成功）`,
          'write not synced',
        );
      }
      return okResult(`✓ 已设置文本（textContent 覆盖，子节点清空语义）到 "${selector}"${multiMatchNote(f.count)}`);
    },

    // ---------- #14 setAttr/removeAttr（FR-032） ----------

    async setAttr(selector: string, name: string, value?: string) {
      const cap = 'set-attr';
      const doc = view().doc;
      if (!doc) return noDocResult(cap);
      if (!name || !/^[^\s"'<>/=\x00-\x1f]+$/.test(name)) {
        return errResult(`✖ 非法属性名 "${name ?? ''}"（不可含空白/引号/尖括号/等号/控制字符）`, 'invalid attribute name');
      }
      const f = firstOf(selector, doc);
      if (isErr(f)) return errResult(f.output, f.error);
      // value 缺省 = 布尔属性形态 setAttribute(name, '')（TASK-003 签名契约）
      f.el.setAttribute(name, value ?? '');
      const back = f.el.getAttribute(name);
      const expected = value ?? '';
      if (back !== expected) {
        return errResult(`✖ set-attr 已写入但回读不一致（${name}=${back ?? 'null'} vs ${expected}；EC-006）`, 'write not synced');
      }
      return okResult(`✓ 已设置属性 ${name}="${back}"${multiMatchNote(f.count)}`);
    },

    async removeAttr(selector: string, name: string) {
      const cap = 'remove-attr';
      const doc = view().doc;
      if (!doc) return noDocResult(cap);
      if (!name) return errResult('✖ remove-attr 缺少属性名', 'missing attr name');
      const f = firstOf(selector, doc);
      if (isErr(f)) return errResult(f.output, f.error);
      const existed = f.el.hasAttribute(name);
      f.el.removeAttribute(name);
      const gone = !f.el.hasAttribute(name);
      if (!gone) {
        return errResult(`✖ remove-attr 已调用但属性 ${name} 仍存在（EC-006 不静默成功）`, 'write not synced');
      }
      return okResult(`✓ 已移除属性 ${name}（原${existed ? '存在' : '不存在'}）${multiMatchNote(f.count)}`);
    },

    // ---------- #15 setStyle（FR-033：cssText 覆盖 / 单属性增量 / classList） ----------

    async setStyle(selector: string, styleOpts: PlatformSetStyleOptions) {
      const cap = 'set-style';
      const doc = view().doc;
      if (!doc) return noDocResult(cap);
      const cssText = styleOpts.cssText?.trim();
      const props = styleOpts.properties;
      const classAction = styleOpts.classAction;
      if (!cssText && !props && !classAction) {
        return errResult('✖ set-style 需要 cssText / properties / classAction 之一', 'missing style input');
      }
      const f = firstOf(selector, doc);
      if (isErr(f)) return errResult(f.output, f.error);
      const el = f.el as HTMLElement;
      const notes: string[] = [];
      if (cssText !== undefined) {
        el.style.cssText = cssText;
        const back = el.style.cssText;
        if (back.replace(/;\s*$/, '') !== cssText.replace(/;\s*$/, '') && !back.includes(cssText.split(';')[0].split(':')[0].trim())) {
          notes.push('回读 cssText 不一致（浏览器可能归一化/拒绝部分声明）');
        } else {
          notes.push('cssText 已覆盖');
        }
      }
      if (props) {
        const styleRecord = el.style as CSSStyleDeclaration & Record<string, string>;
        for (const [p, v] of Object.entries(props)) {
          try {
            styleRecord[p] = v;
            const back = styleRecord[p];
            if (String(back) !== v && !String(back).includes(v)) {
              notes.push(`属性 ${p} 回读不一致（${back} vs ${v}）`);
            }
          } catch (err) {
            notes.push(`属性 ${p} 写入失败：${err instanceof Error ? err.message : String(err)}`);
          }
        }
        if (notes.length === 0) notes.push('单属性已写入');
      }
      if (classAction) {
        const cls = styleOpts.className;
        if (!cls) {
          return errResult('✖ set-style classAction 需要 className', 'missing className');
        }
        const list = el.classList;
        if (!list) return errResult('✖ 目标元素无 classList', 'no classList');
        if (classAction === 'add') list.add(cls);
        else if (classAction === 'remove') list.remove(cls);
        else list.toggle(cls);
        const present = list.contains(cls);
        notes.push(`classList.${classAction} ${cls} → ${present ? '在' : '不在'}`);
      }
      return okResult(`✓ 样式写入完成（${notes.join('；')}）${multiMatchNote(f.count)}`);
    },

    // ---------- #16 setValue（FR-034：native setter + input/change = React 受控基元） ----------

    async setValue(selector: string, value: string) {
      const cap = 'set-value';
      const doc = view().doc;
      if (!doc) return noDocResult(cap);
      const f = firstOf(selector, doc);
      if (isErr(f)) return errResult(f.output, f.error);
      const el = f.el;
      const tag = el.tagName;
      if (!isFormControl(el)) {
        return errResult(`✖ set-value 目标 "${selector}" 非表单控件（${tag}）：仅 input/textarea/select 有 value`, 'not a form control');
      }
      if (tag === 'INPUT') {
        const type = (el.getAttribute('type') || 'text').toLowerCase();
        if (type === 'file') {
          return errResult('✖ input[type=file] 不支持程序化赋值（浏览器安全限制 NG-004）', 'file input unsupported');
        }
        if (type === 'checkbox' || type === 'radio') {
          return errResult(`✖ input[type=${type}] 用 checked 语义：请用 fill（checkbox/radio 勾选路由，FR-035）`, 'use fill');
        }
      }
      writeTextControl(el, value);
      // 回读校验（EC-006）
      const back = readControlValue(el);
      if (back !== value) {
        return errResult(
          `✖ set-value 已派发（native setter + input/change）但回读不一致（期望 ${value.length} 字符，实际 ${back.length}；EC-006 事件已派发但值可能未同步）`,
          'value not synced',
        );
      }
      return okResult(`✓ 已设值（native setter + input/change，React 受控兼容 NFR-004）到 "${selector}"${multiMatchNote(f.count)}`);
    },

    // ---------- #17 fillForm（FR-035：控件类型路由 + requestSubmit + file 显式不可用） ----------

    async fillForm(plan: PlatformFillFormOptions) {
      const cap = 'fill';
      const doc = view().doc;
      if (!doc) return noDocResult(cap);
      if (!plan.fields || plan.fields.length === 0) {
        return errResult('✖ fill 需要 fields 列表（selector→value 映射）', 'empty fields');
      }
      const notes: string[] = [];
      let submitted = false;
      let lastForm: HTMLFormElement | null = null;
      for (let i = 0; i < plan.fields.length; i++) {
        const field = plan.fields[i];
        const f = firstOf(field.selector, doc);
        if (isErr(f)) {
          notes.push(`字段 #${i}（"${field.selector}"）：${f.error}`);
          continue;
        }
        const el = f.el;
        const tag = el.tagName;
        if (tag !== 'INPUT' && tag !== 'TEXTAREA' && tag !== 'SELECT') {
          notes.push(`字段 #${i}（"${field.selector}"）：非表单控件 ${tag}，跳过`);
          continue;
        }
        const inputType = tag === 'INPUT' ? (el.getAttribute('type') || 'text').toLowerCase() : '';
        if (tag === 'INPUT' && inputType === 'file') {
          notes.push(`字段 #${i}（"${field.selector}"）：input[type=file] 显式不可用（NG-004，请用户侧选择文件）`);
          continue;
        }
        if (inputType === 'checkbox' || inputType === 'radio') {
          const want = field.value !== '' && field.value !== 'false' && field.value !== '0' && field.value !== 'off';
          const input = el as HTMLInputElement;
          if (inputType === 'radio' && want && input.value !== '' && field.value !== '' && input.value !== field.value) {
            // radio：期望值不等于该控件 value → 不勾选该项（由用户给精确 value/标签定位单选）
            notes.push(`字段 #${i}（"${field.selector}"）：radio value="${input.value}" ≠ 目标 "${field.value}"，未勾选（用精确 selector/value 定位目标项）`);
            continue;
          }
          input.checked = want;
          fireBubbling(el, 'input');
          fireBubbling(el, 'change');
          notes.push(`字段 #${i}（"${field.selector}"）：${inputType} → ${want ? '勾选' : '取消勾选'}`);
          const form = formOf(el);
          if (form) lastForm = form;
          continue;
        }
        if (tag === 'SELECT') {
          const select = el as HTMLSelectElement;
          if (field.byLabel === true) {
            const opts = Array.from(select.options);
            const target = opts.find((o) => o.textContent?.trim() === field.value);
            if (!target) {
              notes.push(`字段 #${i}（"${field.selector}"）：无 label="${field.value}" 的 option`);
              continue;
            }
            select.value = target.value;
          } else {
            select.value = field.value;
          }
          fireBubbling(el, 'input');
          fireBubbling(el, 'change');
          const selected = select.options[select.selectedIndex];
          const okSel = selected !== undefined && (selected.value === field.value || field.byLabel === true && selected.textContent?.trim() === field.value);
          notes.push(
            okSel
              ? `字段 #${i}（"${field.selector}"）：select → "${selected?.textContent?.trim() ?? ''}" (value=${selected?.value ?? ''})`
              : `字段 #${i}（"${field.selector}"）：select 回读不一致（EC-006）`,
          );
          const form = formOf(el);
          if (form) lastForm = form;
          continue;
        }
        // text-like：写文本控件基元（type 语义字符级由 type 子命令承载；fill 用 set-value 基元按 ADR-004）
        writeTextControl(el, field.value);
        const back = readControlValue(el);
        if (back !== field.value) {
          notes.push(`字段 #${i}（"${field.selector}"）：回读不一致（期望 ${field.value.length} 字符，实际 ${back.length}；EC-006）`);
        } else {
          notes.push(`字段 #${i}（"${field.selector}"）：已填 ✓`);
        }
        const form = formOf(el);
        if (form) lastForm = form;
      }
      if (plan.submit === true) {
        if (lastForm && typeof lastForm.requestSubmit === 'function') {
          lastForm.requestSubmit();
          submitted = true;
          notes.push('表单已 requestSubmit 提交');
        } else if (lastForm && typeof lastForm.submit === 'function') {
          lastForm.submit();
          submitted = true;
          notes.push('表单已 submit() 提交（跳过验证/提交事件监听）');
        } else {
          notes.push('submit=true 但字段不在 <form> 内（或表单无 submit 方法）：未提交');
        }
      }
      return okResult(`✓ fill 完成（${plan.fields.length} 字段）：\n${notes.map((n) => `  · ${n}`).join('\n')}`);
    },

    // ---------- #18 addElement/removeElement（FR-036） ----------

    async addElement(addOpts: PlatformAddElementOptions) {
      const cap = 'add';
      const doc = view().doc;
      if (!doc) return noDocResult(cap);
      const tag = addOpts.tag?.trim();
      if (!tag || !/^[a-zA-Z][a-zA-Z0-9-]*$/.test(tag)) {
        return errResult(`✖ 非法元素标签 "${tag ?? ''}"（需 HTML 标签名，如 div/button/input）`, 'invalid tag');
      }
      const target = addOpts.position?.selector;
      if (!target) return errResult('✖ add 缺少插入位置 selector（position.selector）', 'missing position');
      const f = firstOf(target, doc);
      if (isErr(f)) return errResult(f.output, f.error);
      let el: Element;
      try {
        el = doc.createElement(tag);
      } catch (err) {
        return capErr(err, cap);
      }
      if (addOpts.text !== undefined) el.textContent = addOpts.text;
      if (addOpts.attrs) {
        for (const [name, value] of Object.entries(addOpts.attrs)) {
          if (!/^[^\s"'<>/=\x00-\x1f]+$/.test(name)) {
            return errResult(`✖ 非法属性名 "${name}"（已中止插入）`, 'invalid attribute name');
          }
          el.setAttribute(name, value);
        }
      }
      const mode = addOpts.position.mode;
      const parent = mode === 'before' || mode === 'after' ? f.el.parentElement : f.el;
      if (!parent) {
        return errResult(`✖ 插入位置不可用：目标 "${target}" 无父节点（before/after 需要父元素）`, 'no parent');
      }
      if (mode === 'append') parent.appendChild(el);
      else if (mode === 'prepend') parent.insertBefore(el, parent.firstChild);
      else if (mode === 'before') parent.insertBefore(el, f.el);
      else parent.insertBefore(el, f.el.nextSibling);
      const inDoc = el.isConnected === true || doc.contains(el);
      if (!inDoc) {
        return errResult(`✖ add 插入后元素不在文档中（EC-006 不静默成功）`, 'insert failed');
      }
      const desc = describeTag(el);
      return okResult(`✓ 已插入 <${tag}>（${desc}，mode=${mode} 到 "${target}"）${multiMatchNote(f.count)}`);
    },

    async removeElement(selector: string) {
      const cap = 'remove';
      const doc = view().doc;
      if (!doc) return noDocResult(cap);
      const f = firstOf(selector, doc);
      if (isErr(f)) return errResult(f.output, f.error);
      const parent = f.el.parentElement;
      const desc = describeTag(f.el);
      if (typeof f.el.remove === 'function') f.el.remove();
      else parent?.removeChild(f.el);
      const gone = !doc.contains(f.el);
      if (!gone) {
        return errResult(`✖ remove 已调用但元素仍在文档中（EC-006 不静默成功）`, 'remove failed');
      }
      return okResult(`✓ 已删除元素 <${desc}>（"${selector}"）${multiMatchNote(f.count)}`);
    },

    // ---------- #19 waitFor（FR-025/ADR-005：observer + 轮询双通道 + 统一超时含最后状态） ----------

    async waitFor(waitOpts: PlatformWaitForOptions) {
      const cap = 'wait';
      const doc = view().doc;
      if (!doc) return noDocResult(cap);
      const conditions = waitOpts.conditions ?? [];
      if (conditions.length === 0) {
        return errResult('✖ wait 需要至少一个条件（kind: element/visible/interactable/gone/text）', 'no conditions');
      }
      const mode = waitOpts.mode ?? 'any';
      const timeout = Math.max(1, Math.min(waitOpts.timeout ?? WAIT_DEFAULT_TIMEOUT_MS, WAIT_MAX_TIMEOUT_MS));
      const interval = Math.max(20, waitOpts.interval ?? WAIT_DEFAULT_INTERVAL_MS);
      // 预校验条件定位可解析性（非法 → 立即可读错误）
      const labels: string[] = [];
      for (const c of conditions) {
        const target = c.kind === 'text' ? c.text ?? '' : (c.selector ?? '');
        if (target === '') {
          return errResult(`✖ wait 条件缺少目标（kind=${c.kind} 需 selector/text）`, 'invalid condition');
        }
        const p = parseLocator(target);
        if (isErr(p)) {
          return errResult(`✖ wait 条件定位错误：${p.error}`, 'invalid locator');
        }
        labels.push(c.kind === 'text' ? `text=${target}` : `${c.kind} ${target}`);
      }
      const evalAll = (): WaitCondEval[] => conditions.map((c) => evaluateWaitCondition(c, doc));
      const summarize = (states: WaitCondEval[]): string =>
        states.map((s) => `  · ${s.label} → ${s.met ? '✓ 命中' : '✗ 未命中'}（匹配 ${s.matched}）`).join('\n');
      const deadline = Date.now() + timeout;

      return new Promise<PlatformDomOpResult>((resolve) => {
        let finished = false;
        let lastStates = evalAll();
        let observer: MutationObserver | null = null;
        let timer: ReturnType<typeof setTimeout> | null = null;
        let intervalTimer: ReturnType<typeof setInterval> | null = null;

        const meet = (states: WaitCondEval[]): boolean => {
          const metCount = states.filter((s) => s.met).length;
          if (metCount === 0) return false;
          return mode === 'all' ? metCount === states.length : true;
        };

        const finish = (ok: boolean, states: WaitCondEval[]): void => {
          if (finished) return;
          finished = true;
          if (observer) observer.disconnect();
          if (timer) clearTimeout(timer);
          if (intervalTimer) clearInterval(intervalTimer);
          if (ok) {
            resolve(okResult(`✓ 条件命中（mode=${mode}）：\n${summarize(states)}`));
          } else {
            resolve(
              errResult(
                `✖ 等待超时（${timeout}ms，mode=${mode}）。最后观察状态：\n${summarize(states)}` +
                  '\n（超时不中断会话：可据最后状态调整条件/selector 后重试，EC-014 联动建议）',
                'wait timeout',
              ),
            );
          }
        };

        const check = (): void => {
          lastStates = evalAll();
          if (meet(lastStates)) {
            finish(true, lastStates);
            return;
          }
          if (Date.now() >= deadline) finish(false, lastStates);
        };

        // 通道 1：MutationObserver（结构/文本类条件即时重判；NFR-007 观察者驱动不空转）
        const g = globalThis as { MutationObserver?: typeof MutationObserver };
        if (typeof g.MutationObserver === 'function') {
          observer = new g.MutationObserver(() => check());
          try {
            observer.observe(doc, { childList: true, subtree: true, characterData: true, attributes: true });
          } catch {
            observer = null;
          }
        }
        // 通道 2：轮询降级/几何条件兜底（interval 可配）
        const needsPoll = conditions.some((c) => c.kind === 'visible' || c.kind === 'interactable') || !observer;
        if (needsPoll) {
          intervalTimer = setInterval(() => check(), interval);
        }
        timer = setTimeout(() => finish(false, lastStates), timeout + 10);
        // 立即首查（避免等待首轮 tick）
        check();
      });
    },

    // ---------- #20 evaluate（FR-037/ADR-002：宿主页同源 F12 console 等效；untrusted 拒由工具/门禁层） ----------

    async evaluate(code: string, evalOpts?: PlatformEvaluateOptions) {
      const cap = 'page-evaluate';
      const doc = view().doc;
      if (!doc) return noDocResult(cap);
      if (typeof code !== 'string' || code.trim() === '') {
        return errResult('✖ evaluate 代码为空', 'empty code');
      }
      if (code.length > 100000) {
        return errResult('✖ evaluate 代码超预算（>100000 字符）', 'code too long');
      }
      const as = evalOpts?.as ?? 'expression';
      const maxLength = evalOpts?.maxLength ?? DEFAULT_OUTPUT_MAX;
      const timeoutMs = Math.min(evalOpts?.timeoutMs ?? EVALUATE_DEFAULT_TIMEOUT_MS, EVALUATE_DEFAULT_TIMEOUT_MS * 4);
      let raw: unknown;
      try {
        // 间接执行 = 宿主页全局作用域（等效 F12 console）：new Function 内 direct eval 跑在
        // 全局变量环境；expression 形态包括号以支持对象字面量。CSP 禁 unsafe-eval 时同样被禁 → 转译。
        const indirectRun = new Function('__code', 'return eval(__code)') as (code: string) => unknown;
        raw = as === 'expression' ? indirectRun(`(${code})`) : indirectRun(code);
      } catch (err) {
        // 语法/运行时异常 → 可读错误（页面存活语义，EC-004）
        return errResult(`✖ evaluate 执行异常：${err instanceof Error ? err.message : String(err)}（页面存活，可修正后重试）`, 'evaluate error');
      }
      // 异步结果：超时中止返回（不真正取消执行，P-01 同步死循环不可中断为平台硬约束）
      if (raw !== null && typeof raw === 'object' && typeof (raw as Promise<unknown>).then === 'function') {
        try {
          raw = await Promise.race([
            raw as Promise<unknown>,
            new Promise<never>((_, reject) =>
              setTimeout(() => reject(namedDomError('TimeoutError', `evaluate 异步结果超时（${timeoutMs}ms）`)), timeoutMs),
            ),
          ]);
        } catch (err) {
          return capErr(err, cap);
        }
      }
      const text = serializeEvaluate(raw);
      const b = applyBudget(text, maxLength);
      return okResult(b.text);
    },

    // ---------- #21 extractData（FR-038：table/list/links/images/meta 声明式抽取） ----------

    async extractData(xOpts: PlatformExtractDataOptions) {
      const cap = 'extract';
      const doc = view().doc;
      if (!doc) return noDocResult(cap);
      const kind = xOpts.kind;
      const maxItems = xOpts.maxItems ?? DEFAULT_EXTRACT_MAX;
      const pageUrl = (): string =>
        (view().win?.location ?? (globalThis as { location?: { href?: string } }).location)?.href ?? '';
      // scope：meta 忽略 selector；其余 kind 支持容器定位（定位失败/未找到 → 可读错误）
      let scope: ParentNode = doc;
      if (xOpts.selector && kind !== 'meta') {
        const f = firstOf(xOpts.selector, doc);
        if (isErr(f)) return errResult(f.output, f.error);
        scope = f.el;
      }
      const rows: Record<string, unknown>[] = [];
      let truncated = false;
      const push = (row: Record<string, unknown>): boolean => {
        if (rows.length >= maxItems) {
          truncated = true;
          return false;
        }
        rows.push(row);
        return true;
      };

      if (kind === 'meta') {
        const meta: Record<string, unknown> = {
          url: pageUrl(),
          title: doc.title ?? '',
          description: doc.querySelector('meta[name="description"]')?.getAttribute('content') ?? '',
          lang: doc.documentElement?.getAttribute('lang') ?? '',
          charset: doc.characterSet ?? '',
        };
        const og = doc.querySelector('meta[property="og:title"]');
        if (og) meta.ogTitle = og.getAttribute('content') ?? '';
        return okResult(JSON.stringify({ kind: 'meta', count: 1, truncated: false, rows: [meta] }, null, 2));
      }

      if (kind === 'table') {
        // selector 可直接指向 <table> 本身（scope 即 table）；否则在容器内找首个 table
        const table =
          scope !== doc && (scope as Element).tagName === 'TABLE'
            ? (scope as Element)
            : scope.querySelector('table');
        if (!table) {
          return errResult('✖ extract table：scope 内无 <table>（可换 selector 定位表格容器）', 'no table');
        }
        const allTr = Array.from(table.querySelectorAll('tr'));
        if (allTr.length === 0) {
          return okResult(JSON.stringify({ kind: 'table', count: 0, truncated: false, url: pageUrl(), rows: [] }, null, 2));
        }
        // 表头 = thead 首行；无 thead 则取首行作表头（行×列 JSON 语义）
        const thead = table.querySelector('thead');
        const headTr = thead?.querySelector('tr') ?? allTr[0];
        const headerCells = Array.from(headTr.querySelectorAll('th, td'));
        const headers =
          headerCells.length > 0
            ? headerCells.map((c) => c.textContent?.replace(/\s+/g, ' ').trim() || '')
            : [];
        const bodyTrs = thead ? allTr.slice(1) : allTr.slice(1);
        for (const tr of bodyTrs) {
          const cells = Array.from(tr.querySelectorAll('th, td')).map((c) =>
            c.textContent?.replace(/\s+/g, ' ').trim() ?? '',
          );
          if (cells.length === 0) continue;
          const row: Record<string, unknown> = {};
          cells.forEach((v, i) => {
            row[headers[i]?.trim() || `col${i}`] = v;
          });
          if (!push(row)) break;
        }
      } else if (kind === 'list') {
        // 列表项池：直接子元素优先（避免嵌套爆炸）；容器为空时回退常见 item/card/li
        const children = Array.from(scope.children);
        const pool =
          children.length > 0
            ? children
            : Array.from(scope.querySelectorAll('li, [class*="item"], [class*="card"], article'));
        const uniquePool = dedupeNodeList(pool);
        const fields = xOpts.fields ?? {};
        for (const item of uniquePool) {
          const row: Record<string, unknown> = {};
          if (Object.keys(fields).length === 0) {
            row.text = (item.textContent ?? '').replace(/\s+/g, ' ').trim();
            row.tag = item.tagName.toLowerCase();
          } else {
            for (const [fieldName, fieldLoc] of Object.entries(fields)) {
              const sub = resolveLocator(fieldLoc, item);
              if (isOk(sub) && sub.elements.length > 0) {
                const hit = sub.elements[0];
                row[fieldName] = (
                  hit.getAttribute('href') ??
                  hit.getAttribute('src') ??
                  hit.textContent ??
                  ''
                )
                  .replace(/\s+/g, ' ')
                  .trim();
              } else {
                row[fieldName] = '';
              }
            }
          }
          if (!push(row)) break;
        }
      } else if (kind === 'links') {
        for (const a of Array.from(scope.querySelectorAll('a[href]'))) {
          if (!push({ text: (a.textContent ?? '').replace(/\s+/g, ' ').trim(), href: a.getAttribute('href') ?? '' })) break;
        }
      } else if (kind === 'images') {
        for (const img of Array.from(scope.querySelectorAll('img'))) {
          if (!push({ src: img.getAttribute('src') ?? '', alt: img.getAttribute('alt') ?? '' })) break;
        }
      } else {
        return errResult(`✖ 不支持的抽取形态 "${kind}"（支持 table/list/links/images/meta）`, 'unknown extract kind');
      }
      return okResult(JSON.stringify({ kind, count: rows.length, truncated, url: pageUrl(), rows }, null, 2));
    },

    // ---------- #22 printPage（FR-026） ----------

    async printPage() {
      const cap = '打印';
      const v = view();
      if (!v.doc) return noDocResult(cap);
      const w = v.win;
      if (!w || typeof w.print !== 'function') {
        return errResult('✖ 打印不可用：当前环境无 window.print（非顶层浏览器窗口）', 'print unavailable');
      }
      try {
        w.print();
        return okResult('✓ 已触发打印（window.print；打印对话框由用户侧确认；headless/受限环境可能静默无对话框）');
      } catch (err) {
        return capErr(err, cap);
      }
    },

    // ---------- #23 historyNav（FR-027 back/forward） ----------

    async historyNav(delta: number) {
      const cap = '历史导航';
      const v = view();
      if (!v.doc) return noDocResult(cap);
      const w = v.win;
      if (!w || typeof w.history?.go !== 'function') {
        return errResult('✖ 历史导航不可用：无 window.history', 'history unavailable');
      }
      const d = Number(delta);
      if (!Number.isInteger(d) || d === 0) {
        return errResult(`✖ historyNav delta 需为非零整数（back=-1 / forward=+1；当前 ${delta}）`, 'invalid delta');
      }
      w.history.go(d);
      return okResult(`✓ 已执行会话内历史导航 delta=${d}（${d < 0 ? 'back' : 'forward'}；SPA 路由内可用）`);
    },

    // ---------- #24 reloadPage（FR-027；破坏性 → 门禁默认 ask，EC-009） ----------

    async reloadPage() {
      const cap = '刷新';
      const v = view();
      if (!v.doc) return noDocResult(cap);
      const w = v.win;
      if (!w || typeof w.location?.reload !== 'function') {
        return errResult('✖ 刷新不可用：无 window.location.reload', 'reload unavailable');
      }
      // 破坏性语义：调用后页面/会话中断；工具层应提示重新 read-state/恢复会话（EC-009）
      const note =
        '⚠ reload 为破坏性操作：重载后请重新 read-state/find 定位并恢复会话上下文（EC-009）';
      w.location.reload();
      return okResult(`✓ 已触发页面刷新。${note}`);
    },

    // ---------- #25 screenshot（FR-028/ADR-003：SVG foreignObject + canvas 零依赖近似） ----------

    async screenshot(shotOpts: PlatformScreenshotOptions) {
      const cap = '截图';
      const doc = view().doc;
      if (!doc) return noDocResult(cap);
      const mode = shotOpts.mode ?? 'viewport';
      if (mode === 'fullpage') {
        return errResult(
          '✖ 整页级截图不支持（当前零依赖近似面只做视口/元素级；整页归属 captureVisibleTab/CDP = F-14 扩展宿主/OS 生态位，FR-028 out）',
          'fullpage unsupported',
        );
      }
      // 序列化目标子树
      let source: Element;
      let width: number;
      let height: number;
      let label: string;
      if (mode === 'element') {
        if (!shotOpts.selector) {
          return errResult('✖ screenshot mode=element 需要 selector', 'missing selector');
        }
        const f = firstOf(shotOpts.selector, doc);
        if (isErr(f)) return errResult(f.output, f.error);
        source = f.el;
        const rect = source.getBoundingClientRect();
        width = shotOpts.width ?? Math.max(1, rect.width);
        height = shotOpts.height ?? Math.max(1, rect.height);
        label = `元素 ${describeTag(source)}`;
      } else {
        source = doc.documentElement;
        const se = doc.scrollingElement ?? doc.documentElement;
        width = shotOpts.width ?? Math.max(1, Math.min(se?.scrollWidth ?? doc.documentElement.scrollWidth, 4096));
        height = shotOpts.height ?? Math.max(1, Math.min(se?.scrollHeight ?? doc.documentElement.scrollHeight, 4096));
        label = '视口级（文档根近似）';
      }
      let html: string;
      try {
        const clone = cleanClone(source);
        const serializer = new XMLSerializer();
        html = serializer.serializeToString(clone);
      } catch (err) {
        return capErr(err, cap);
      }
      if (html.length === 0) {
        return errResult('✖ 截图序列化为空（目标无内容）', 'empty serialize');
      }
      let result: { dataUrl: string; width: number; height: number };
      try {
        const svgUrl = screenshotSvgData(width, height, html);
        result = await rasterizeSvg(svgUrl, width, height, doc);
      } catch (err) {
        // CSP/foreignObject/canvas taint/序列化失败 → 统一转译（EC-008）
        return capErr(err, cap);
      }
      // dataUrl 走独立字段（不进 output 大文本，P-03/FR-028；下载链由 chrome-tools 工具层触发）
      const approxBytes = result.dataUrl.length * 0.75;
      const summary = `✓ ${label}截图完成：${result.width}x${result.height}px，约 ${Math.round(approxBytes / 1024)} KB（PNG dataURL）。` +
        '近似度声明（ADR-003）：外部图片/CSS 变量/滚动态不保真；dataURL 已放独立字段，下载/落盘由 chrome screenshot 工具层处理。';
      return okResult(summary, result.dataUrl);
    },
  };
}

// ==================== evaluate 结果序列化（FR-037：JSON 可解析或文本 + 预算截断） ====================

/** DOM 节点/窗口等非 JSON 面 → 紧凑摘要（避免整树序列化炸预算）。 */
function nodeSummary(v: unknown): string | null {
  const w = globalThis as { Element?: unknown; Node?: unknown; Window?: unknown };
  if (w.Element && v instanceof (w.Element as new () => Element)) {
    const el = v as Element;
    return `<Element ${describeTag(el)} text="${textSnippet(el, 60)}">`;
  }
  if (w.Node && v instanceof (w.Node as new () => Node)) {
    const n = v as Node;
    return `<${n.nodeName}>`;
  }
  return null;
}

/** 循环引用安全 replacer + 非 JSON 类型降级文本。 */
function serializeEvaluate(v: unknown): string {
  if (v === undefined) return 'undefined';
  if (v === null) return 'null';
  const t = typeof v;
  if (t === 'string') return JSON.stringify(v);
  if (t === 'number' || t === 'boolean') return String(v);
  if (t === 'bigint') return `${v}n`;
  if (t === 'function') return `function ${(v as (...args: unknown[]) => unknown).name || '(anonymous)'}(){…}`;
  if (t === 'symbol') return String(v);
  // 对象面：Error 兼容（duck typing，node/浏览器跨 realm）
  const maybeErr = v as { name?: unknown; message?: unknown } | null;
  if (maybeErr !== null && typeof maybeErr === 'object' && typeof maybeErr.message === 'string') {
    const en = typeof maybeErr.name === 'string' ? maybeErr.name : 'Error';
    return `Error ${en}: ${maybeErr.message}`;
  }
  const nodeS = nodeSummary(v);
  if (nodeS !== null) return nodeS;
  const seen = new WeakSet<object>();
  try {
    const json = JSON.stringify(v, (_key, value) => {
      if (typeof value === 'function') return '[Function]';
      if (typeof value === 'undefined') return '[Undefined]';
      if (typeof value === 'bigint') return `${value}n`;
      if (value !== null && typeof value === 'object') {
        const s = nodeSummary(value);
        if (s !== null) return s;
        if (seen.has(value)) return '[Circular]';
        seen.add(value);
      }
      return value;
    });
    if (json !== undefined) return json;
  } catch {
    /* 落到 toString 降级 */
  }
  try {
    const s = String(v);
    return s.length > 0 && s !== '[object Object]' ? s : `[object ${(v as object).constructor?.name ?? 'Object'}]`;
  } catch {
    return '[Unserializable]';
  }
}

/** NodeList 去重（querySelectorAll 交集去重）。 */
function dedupeNodeList(list: Element[]): Element[] {
  const out: Element[] = [];
  for (const el of list) {
    if (!out.includes(el)) out.push(el);
  }
  return out;
}


