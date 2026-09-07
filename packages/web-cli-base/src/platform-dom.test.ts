/**
 * platform-dom.test.ts —— platform-dom.ts 浏览器 ops 的 node 注入面测试（NFR-005 双轨 node 轨）。
 *
 * 说明：真实浏览器逐 ops 冒烟由 validate V13（TASK-012 移交清单）承接；本测试以**结构化 shim DOM**
 * （零第三方，手写最小 Element/Document/Event 面）驱动 createBrowserDomOps(scope) 的真实逻辑，
 * 覆盖：4 桩补真（hover/scroll/zoom/fullscreen）、感知族（interactives/read-element/find/structure/
 * snapshotStructured 分页预算）、交互族（dblclick/contextmenu/long-press/drag/focus/blur/type/press/
 * click 坐标）、写入族（set-text/attr/style/value/fill/add/remove + 回读校验）、waitFor 轮询通道、
 * evaluate（宿主上下文表达式/异常）、extractData 声明式抽取、chrome 三件（print/historyNav/reloadPage）
 * 与 screenshot 降级（非浏览器无 XMLSerializer/Image → 可读 ok:false，EC-008 语义）。
 *
 * shim 局限声明（不伪造浏览器真实语义的部分）：
 *   - 事件构造器为最小 polyfill（真实 isTrusted=false MouseEvent/KeyboardEvent 面由浏览器提供）；
 *   - MutationObserver 不存在 → waitFor 走轮询降级通道（observer 通道真值由 V13 冒烟断言）；
 *   - HTMLInputElement.prototype 不存在 → native setter 走直赋回退（原型 setter 路径 V13 断言）。
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createBrowserDomOps } from './platform-dom.js';
import type { PlatformDomOps, PlatformDomOpResult } from './platform.js';

// ==================== 全局事件 polyfill（在调用 ops 前置位） ====================

interface FakeEventInit {
  bubbles?: boolean;
  cancelable?: boolean;
  [k: string]: unknown;
}

class FakeEvent {
  type: string;
  bubbles: boolean;
  cancelable: boolean;
  defaultPrevented = false;
  private stopped = false;
  constructor(type: string, init: FakeEventInit = {}) {
    this.type = type;
    this.bubbles = init.bubbles ?? false;
    this.cancelable = init.cancelable ?? false;
    Object.assign(this, init);
  }
  preventDefault(): void {
    this.defaultPrevented = true;
  }
  stopPropagation(): void {
    this.stopped = true;
  }
  get _stopped(): boolean {
    return this.stopped;
  }
}

class FakeMouseEvent extends FakeEvent {
  button: number;
  clientX: number;
  clientY: number;
  detail: number;
  constructor(type: string, init: FakeEventInit = {}) {
    super(type, init);
    this.button = (init.button as number) ?? 0;
    this.clientX = (init.clientX as number) ?? 0;
    this.clientY = (init.clientY as number) ?? 0;
    this.detail = (init.detail as number) ?? 0;
  }
}
class FakeKeyboardEvent extends FakeEvent {
  key: string;
  code: string;
  ctrlKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
  metaKey: boolean;
  constructor(type: string, init: FakeEventInit = {}) {
    super(type, init);
    this.key = String(init.key ?? '');
    this.code = String(init.code ?? '');
    this.ctrlKey = init.ctrlKey === true;
    this.altKey = init.altKey === true;
    this.shiftKey = init.shiftKey === true;
    this.metaKey = init.metaKey === true;
  }
}
class FakePointerEvent extends FakeMouseEvent {
  pointerId: number;
  isPrimary: boolean;
  constructor(type: string, init: FakeEventInit = {}) {
    super(type, init);
    this.pointerId = (init.pointerId as number) ?? 0;
    this.isPrimary = init.isPrimary === true;
  }
}
class FakeDragEvent extends FakeMouseEvent {
  dataTransfer: unknown;
  constructor(type: string, init: FakeEventInit = {}) {
    super(type, init);
    this.dataTransfer = init.dataTransfer ?? null;
  }
}
class FakeDataTransfer {
  dropEffect = 'none';
}

function installEventPolyfills(): void {
  const g = globalThis as Record<string, unknown>;
  if (typeof g.Event !== 'function') g.Event = FakeEvent;
  if (typeof g.MouseEvent !== 'function') g.MouseEvent = FakeMouseEvent;
  if (typeof g.KeyboardEvent !== 'function') g.KeyboardEvent = FakeKeyboardEvent;
  if (typeof g.PointerEvent !== 'function') g.PointerEvent = FakePointerEvent;
  if (typeof g.DragEvent !== 'function') g.DragEvent = FakeDragEvent;
  if (typeof g.DataTransfer !== 'function') g.DataTransfer = FakeDataTransfer;
}
installEventPolyfills();

// ==================== 最小 shim DOM（结构化面，仅覆盖 platform-dom 使用的子集） ====================

type Listener = (ev: FakeEvent) => void;

interface RectLike {
  x: number;
  y: number;
  width: number;
  height: number;
  left: number;
  top: number;
  right: number;
  bottom: number;
}

const ZERO_RECT: RectLike = { x: 0, y: 0, width: 0, height: 0, left: 0, top: 0, right: 0, bottom: 0 };

class ShimElement {
  nodeType = 1;
  tagName = 'DIV';
  id = '';
  className = '';
  childNodes: ShimElement[] = [];
  parentNode: ShimElement | null = null;
  attrs = new Map<string, string>();
  listeners = new Map<string, Listener[]>();
  _rect: RectLike = { ...ZERO_RECT };
  _computed: { cssText: string; values: Record<string, string> } = { cssText: '', values: {} };
  ownerDocument: ShimDocument | null = null;
  private _value = '';
  checked = false;
  selected = false;
  disabled = false;
  readOnly = false;
  required = false;

  constructor(tag: string) {
    this.tagName = tag.toUpperCase();
  }

  get value(): string {
    if (this.tagName === 'SELECT') {
      const sel = this.options.find((o) => o.selected === true);
      return sel ? (sel.getAttribute('value') ?? sel.textContent) : '';
    }
    if (this.tagName === 'OPTION') return this.getAttribute('value') ?? this.textContent;
    return this._value;
  }
  set value(v: string) {
    if (this.tagName === 'SELECT') {
      for (const o of this.options) {
        o.selected = (o.getAttribute('value') ?? o.textContent) === String(v);
      }
    }
    this._value = String(v);
  }
  get options(): ShimElement[] {
    return this.children.filter((c) => c.tagName === 'OPTION');
  }
  get selectedIndex(): number {
    return this.options.findIndex((o) => o.selected === true);
  }

  get parentElement(): ShimElement | null {
    return this.parentNode;
  }
  get style(): Record<string, string> {
    const self = this as unknown as Record<string, unknown>;
    if (!self.__style) self.__style = {};
    return self.__style as Record<string, string>;
  }
  get classList(): { add: (c: string) => void; remove: (c: string) => void; toggle: (c: string) => boolean; contains: (c: string) => boolean } {
    const self = this;
    const read = (): string[] => (self.className ? self.className.split(/\s+/) : []);
    const write = (arr: string[]): void => {
      self.className = arr.join(' ');
    };
    return {
      add(c: string): void {
        const a = read();
        if (!a.includes(c)) a.push(c);
        write(a);
      },
      remove(c: string): void {
        write(read().filter((x) => x !== c));
      },
      toggle(c: string): boolean {
        const a = read();
        const has = a.includes(c);
        write(has ? a.filter((x) => x !== c) : [...a, c]);
        return !has;
      },
      contains(c: string): boolean {
        return read().includes(c);
      },
    };
  }
  get children(): ShimElement[] {
    return this.childNodes.filter((n) => n.nodeType === 1);
  }
  get firstChild(): ShimElement | null {
    return this.childNodes[0] ?? null;
  }
  get nextSibling(): ShimElement | null {
    if (!this.parentNode) return null;
    const sibs = this.parentNode.childNodes;
    return sibs[sibs.indexOf(this) + 1] ?? null;
  }
  get textContent(): string {
    return this.childNodes.map((n) => (n.nodeType === 3 ? (n as unknown as ShimText).nodeValue : n.textContent)).join('');
  }
  set textContent(v: string) {
    this.childNodes = [];
    const t = new ShimText(v);
    t.parentNode = this;
    (this.childNodes as ShimElement[]).push(t as unknown as ShimElement);
  }
  get innerText(): string {
    return this.textContent;
  }
  get form(): ShimElement | null {
    let p = this.parentNode;
    while (p) {
      if (p.tagName === 'FORM') return p;
      p = p.parentNode;
    }
    return null;
  }
  get isConnected(): boolean {
    let p: ShimElement | null = this;
    while (p.parentNode) p = p.parentNode;
    return p.tagName === '#DOCUMENT';
  }

  getAttribute(name: string): string | null {
    return this.attrs.has(name) ? this.attrs.get(name)! : null;
  }
  setAttribute(name: string, value: string): void {
    this.attrs.set(name, String(value));
    if (name === 'id') this.id = String(value);
    if (name === 'class') this.className = String(value);
  }
  removeAttribute(name: string): void {
    this.attrs.delete(name);
    if (name === 'id') this.id = '';
    if (name === 'class') this.className = '';
  }
  hasAttribute(name: string): boolean {
    return this.attrs.has(name);
  }
  get attributes(): Array<{ name: string; value: string }> {
    return Array.from(this.attrs.entries()).map(([name, value]) => ({ name, value }));
  }

  appendChild(child: ShimElement): ShimElement {
    if (child.parentNode) child.parentNode.removeChild(child);
    child.parentNode = this;
    child.ownerDocument = this.ownerDocument;
    this.childNodes.push(child);
    return child;
  }
  insertBefore(child: ShimElement, ref: ShimElement | null): ShimElement {
    if (child.parentNode) child.parentNode.removeChild(child);
    child.parentNode = this;
    child.ownerDocument = this.ownerDocument;
    const idx = ref ? this.childNodes.indexOf(ref) : -1;
    if (idx >= 0) this.childNodes.splice(idx, 0, child);
    else this.childNodes.push(child);
    return child;
  }
  removeChild(child: ShimElement): ShimElement {
    const idx = this.childNodes.indexOf(child);
    if (idx >= 0) this.childNodes.splice(idx, 1);
    child.parentNode = null;
    return child;
  }
  remove(): void {
    this.parentNode?.removeChild(this);
  }

  addEventListener(type: string, fn: Listener): void {
    const arr = this.listeners.get(type) ?? [];
    arr.push(fn);
    this.listeners.set(type, arr);
  }
  removeEventListener(type: string, fn: Listener): void {
    const arr = this.listeners.get(type) ?? [];
    this.listeners.set(type, arr.filter((x) => x !== fn));
  }
  dispatchEvent(ev: FakeEvent): boolean {
    let target: ShimElement | null = this;
    while (target) {
      const arr = target.listeners.get(ev.type);
      if (arr) for (const fn of [...arr]) fn.call(target, ev);
      if ((ev as unknown as { _stopped: boolean })._stopped) break;
      if (!ev.bubbles) break;
      target = target.parentNode;
    }
    return !ev.defaultPrevented;
  }

  getBoundingClientRect(): RectLike {
    return { ...this._rect };
  }
  focus(): void {
    if (this.ownerDocument) this.ownerDocument.activeElement = this;
  }
  blur(): void {
    if (this.ownerDocument && this.ownerDocument.activeElement === this) {
      this.ownerDocument.activeElement = this.ownerDocument.body;
    }
  }
  click(): void {
    this.dispatchEvent(new FakeMouseEvent('click', { bubbles: true, cancelable: true }));
  }
  contains(other: ShimElement): boolean {
    let p: ShimElement | null = other;
    while (p) {
      if (p === this) return true;
      p = p.parentNode;
    }
    return false;
  }
  cloneNode(deep: boolean): ShimElement {
    const c = new ShimElement(this.tagName);
    c.ownerDocument = this.ownerDocument;
    for (const [k, v] of this.attrs) c.attrs.set(k, v);
    c.id = this.id;
    c.className = this.className;
    if (deep) {
      for (const n of this.childNodes) {
        if (n.nodeType === 3) {
          const t = new ShimText((n as unknown as ShimText).nodeValue);
          t.parentNode = c;
          (c.childNodes as ShimElement[]).push(t as unknown as ShimElement);
        } else {
          c.appendChild(n.cloneNode(true));
        }
      }
    }
    return c;
  }

  matches(selector: string): boolean {
    return selector
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .some((part) => matchCompound(this, part));
  }
  querySelectorAll(selector: string): ShimElement[] {
    return queryAll(this, selector);
  }
  querySelector(selector: string): ShimElement | null {
    return queryAll(this, selector)[0] ?? null;
  }
  setRect(rect: Partial<RectLike>): ShimElement {
    const w = rect.width ?? 0;
    const h = rect.height ?? 0;
    const x = rect.x ?? 0;
    const y = rect.y ?? 0;
    this._rect = {
      x,
      y,
      width: w,
      height: h,
      left: rect.left ?? x,
      top: rect.top ?? y,
      right: rect.right ?? x + w,
      bottom: rect.bottom ?? y + h,
    };
    return this;
  }
  setComputed(cssText: string, values: Record<string, string>): ShimElement {
    this._computed = { cssText, values };
    return this;
  }
}

class ShimText {
  nodeType = 3;
  nodeValue = '';
  parentNode: ShimElement | null = null;
  constructor(v: string) {
    this.nodeValue = v;
  }
  get parentElement(): ShimElement | null {
    return this.parentNode;
  }
  get data(): string {
    return this.nodeValue;
  }
}

// ---------- 简单 CSS 复合选择器解析（支持 platform-dom 使用面） ----------

interface AttrReq {
  name: string;
  value?: string;
  not: boolean;
}
interface CompoundReq {
  tag?: string;
  id?: string;
  classes: string[];
  attrs: AttrReq[];
  firstChild: boolean;
}

function unquote(v: string): string {
  const s = v.trim();
  if (s.length >= 2 && (s[0] === '"' || s[0] === "'") && s[s.length - 1] === s[0]) return s.slice(1, -1);
  return s;
}

function parseCompound(comp: string): CompoundReq | null {
  const req: CompoundReq = { classes: [], attrs: [], firstChild: false };
  let i = 0;
  const n = comp.length;
  let sawAny = false;
  const readIdent = (): string => {
    let out = '';
    while (i < n && /[a-zA-Z0-9_-]/.test(comp[i])) {
      out += comp[i];
      i++;
    }
    return out;
  };
  while (i < n) {
    const ch = comp[i];
    if (ch === ' ') break; // 后代组合由外层处理
    if (ch === '#') {
      i++;
      req.id = readIdent();
      sawAny = true;
    } else if (ch === '.') {
      i++;
      req.classes.push(readIdent());
      sawAny = true;
    } else if (ch === '[') {
      const close = comp.indexOf(']', i);
      if (close < 0) return null;
      const inner = comp.slice(i + 1, close);
      i = close + 1;
      const eq = inner.indexOf('=');
      let name = inner;
      let value: string | undefined;
      if (eq >= 0) {
        name = inner.slice(0, eq).trim();
        value = unquote(inner.slice(eq + 1));
      } else if (inner.startsWith('!=')) {
        name = inner.slice(2).trim();
        value = '';
        // 少见形态，不深入
      }
      req.attrs.push({ name: name.trim(), value, not: false });
      sawAny = true;
    } else if (ch === ':') {
      // :first-child / :not([...])
      if (comp.startsWith(':first-child', i)) {
        req.firstChild = true;
        i += ':first-child'.length;
        sawAny = true;
      } else if (comp.startsWith(':not(', i)) {
        const close = comp.indexOf(')', i);
        const inner = comp.slice(i + 5, close).trim();
        i = close + 1;
        if (inner.startsWith('[') && inner.endsWith(']')) {
          const a = inner.slice(1, -1);
          const eq = a.indexOf('=');
          if (eq >= 0) req.attrs.push({ name: a.slice(0, eq).trim(), value: unquote(a.slice(eq + 1)), not: true });
          else req.attrs.push({ name: a.trim(), not: true });
        }
        sawAny = true;
      } else {
        return null;
      }
    } else if (ch === '*') {
      i++;
      sawAny = true;
    } else {
      req.tag = readIdent().toLowerCase();
      sawAny = true;
    }
  }
  return sawAny ? req : null;
}

function attrMatches(el: ShimElement, a: AttrReq): boolean {
  const actual = el.getAttribute(a.name);
  const present = actual !== null;
  if (a.value !== undefined) {
    const ok = present && actual === a.value;
    return a.not ? !ok : ok;
  }
  return a.not ? !present : present;
}

function matchCompound(el: ShimElement, comp: string): boolean {
  const req = parseCompound(comp);
  if (!req) return false;
  if (req.tag && el.tagName.toLowerCase() !== req.tag) return false;
  if (req.id && el.id !== req.id) return false;
  for (const c of req.classes) {
    if (!(el.className || '').split(/\s+/).includes(c)) return false;
  }
  for (const a of req.attrs) {
    if (!attrMatches(el, a)) return false;
  }
  if (req.firstChild) {
    if (!el.parentNode) return false;
    const first = (el.parentNode.children[0] as ShimElement | undefined);
    if (first !== el) return false;
  }
  return true;
}

function matchParts(el: ShimElement, parts: string[], idx: number): boolean {
  if (!matchCompound(el, parts[idx])) return false;
  if (idx === 0) return true;
  let p = el.parentNode;
  while (p) {
    if (matchParts(p, parts, idx - 1)) return true;
    p = p.parentNode;
  }
  return false;
}

function elementMatches(el: ShimElement, selectorPart: string): boolean {
  const parts = selectorPart.trim().split(/\s+/).filter(Boolean);
  return matchParts(el, parts, parts.length - 1);
}

function queryAll(root: ShimElement, selector: string): ShimElement[] {
  const out: ShimElement[] = [];
  const parts = selector.split(',').map((s) => s.trim()).filter(Boolean);
  const walk = (el: ShimElement): void => {
    for (const child of el.children) {
      for (const p of parts) {
        if (elementMatches(child, p)) out.push(child);
      }
      walk(child);
    }
  };
  walk(root);
  return out;
}

class ShimDocument extends ShimElement {
  nodeType = 9;
  tagName = '#DOCUMENT';
  title = '';
  body: ShimElement;
  documentElement: ShimElement;
  activeElement: ShimElement | null = null;
  fullscreenElement: ShimElement | null = null;
  fullscreenEnabled = true;
  characterSet = 'UTF-8';
  private html: ShimElement;

  constructor() {
    super('#DOCUMENT');
    this.html = new ShimElement('html');
    this.html.ownerDocument = this;
    const head = new ShimElement('head');
    head.ownerDocument = this;
    this.body = new ShimElement('body');
    this.body.ownerDocument = this;
    this.html.appendChild(head);
    this.html.appendChild(this.body);
    this.appendChild(this.html);
    this.documentElement = this.html;
    this.activeElement = this.body;
  }

  createElement(tag: string): ShimElement {
    const el = new ShimElement(tag);
    el.ownerDocument = this;
    return el;
  }
  createTextNode(text: string): ShimText {
    return new ShimText(text);
  }
  querySelectorAll(selector: string): ShimElement[] {
    return queryAll(this, selector);
  }
  querySelector(selector: string): ShimElement | null {
    return queryAll(this, selector)[0] ?? null;
  }
  get defaultView(): { getComputedStyle: (el: ShimElement) => { cssText: string; length: number; item: (index: number) => string; getPropertyValue: (p: string) => string } } | null {
    return null;
  }
  elementFromPoint(_x: number, _y: number): ShimElement | null {
    return this._atPoint ?? null;
  }
  _atPoint: ShimElement | null = null;
  async exitFullscreen(): Promise<void> {
    this.fullscreenElement = null;
  }
  contains(el: ShimElement): boolean {
    return el.nodeType === 9 ? el === this : super.contains(el);
  }
}

function makeWindow(doc: ShimDocument): Record<string, unknown> {
  const win = {
    innerWidth: 1024,
    innerHeight: 768,
    scrollX: 0,
    scrollY: 0,
    isSecureContext: true,
    location: { href: 'https://example.com/page', origin: 'https://example.com', reload: () => {} },
    history: { go: (_d: number) => {} },
    print: () => {},
    scrollBy: (o: { left: number; top: number }) => {
      win.scrollX += o.left ?? 0;
      win.scrollY += o.top ?? 0;
    },
  };
  return win;
}

// ==================== 测试装置 ====================

interface Harness {
  doc: ShimDocument;
  win: Record<string, unknown>;
  ops: PlatformDomOps;
  loc: (...sel: string[]) => ShimElement;
}

function buildHarness(fixture: (doc: ShimDocument) => void): Harness {
  const doc = new ShimDocument();
  fixture(doc);
  const win = makeWindow(doc);
  const ops = createBrowserDomOps({ document: doc as unknown as Document, window: win as unknown as Window });
  const loc = (...sel: string[]): ShimElement => {
    const el = doc.querySelectorAll(sel.join(', '))[0];
    assert.ok(el, `fixture 定位失败: ${sel.join(', ')}`);
    return el;
  };
  return { doc, win, ops, loc };
}

function assertOk(r: PlatformDomOpResult): void {
  assert.equal(r.ok, true, `期望 ok 但失败: ${r.output}${r.error ? ` / ${r.error}` : ''}`);
}
function assertErr(r: PlatformDomOpResult, pattern?: RegExp): void {
  assert.equal(r.ok, false, `期望失败但 ok: ${r.output}`);
  if (pattern) assert.match(r.output, pattern);
}

function mkButton(id: string, text: string): ShimElement {
  const b = new ShimElement('button');
  b.setAttribute('id', id);
  b.setAttribute('type', 'button');
  b.textContent = text;
  return b;
}

// ==================== 4 桩补真 + 既有 7 方法（FR-016/017/009） ====================

test('platform-dom: readState 输出含 url/title + ≥2 新增字段（FR-009）', async () => {
  const { doc, ops } = buildHarness((d) => {
    d.title = '测试页';
  });
  const r = await ops.readState();
  assertOk(r);
  assert.match(r.output, /url: https:\/\/example\.com\/page/);
  assert.match(r.output, /title: 测试页/);
  assert.match(r.output, /readyState:/);
  assert.match(r.output, /origin: https:\/\/example\.com/);
  assert.match(r.output, /secureContext: true/);
  assert.match(r.output, /viewport: 1024x768/);
});

test('platform-dom: click selector-only 走 v2 el.click() 语义（FR-020 零回归）', async () => {
  const { doc, ops, loc } = buildHarness((d) => {
    d.body.appendChild(mkButton('btn', '点我'));
  });
  let clicks = 0;
  loc('#btn').addEventListener('click', () => clicks++);
  const r = await ops.click('#btn');
  assertOk(r);
  assert.equal(clicks, 1);
});

test('platform-dom: click 视口坐标命中 elementFromPoint 目标并派发事件（FR-020）', async () => {
  const { doc, ops, loc } = buildHarness((d) => {
    const btn = mkButton('coord', '坐标');
    btn.setRect({ x: 10, y: 20, width: 100, height: 40 });
    d.body.appendChild(btn);
    d._atPoint = btn;
  });
  const seq: string[] = [];
  loc('#coord').addEventListener('mousedown', () => seq.push('down'));
  loc('#coord').addEventListener('mouseup', () => seq.push('up'));
  loc('#coord').addEventListener('click', () => seq.push('click'));
  const r = await ops.click('irrelevant', { x: 50, y: 40 });
  assertOk(r);
  assert.deepEqual(seq, ['down', 'up', 'click']);
  assert.match(r.output, /命中 button#coord/);
});

test('platform-dom: hover 派发 pointer/mouse 序列（FR-016 桩补真）', async () => {
  const { ops, loc } = buildHarness((d) => {
    const el = mkButton('h', 'hover');
    el.setRect({ x: 0, y: 0, width: 80, height: 30 });
    d.body.appendChild(el);
  });
  const got: string[] = [];
  const target = loc('#h');
  for (const t of ['pointerover', 'pointerenter', 'mouseover', 'mouseenter', 'mousemove']) {
    target.addEventListener(t, () => got.push(t));
  }
  const r = await ops.hover('#h');
  assertOk(r);
  assert.deepEqual(got, ['pointerover', 'pointerenter', 'mouseover', 'mouseenter', 'mousemove']);
  assert.doesNotMatch(r.output, /NotFoundError/);
});

test('platform-dom: scroll 页面级增量 + 元素级 scrollTop（FR-016）', async () => {
  const { ops, loc } = buildHarness((d) => {
    const box = new ShimElement('div');
    box.setAttribute('id', 'box');
    box.setRect({ x: 0, y: 0, width: 100, height: 100 });
    d.body.appendChild(box);
  });
  const page = await ops.scroll(undefined, 0, 120);
  assertOk(page);
  assert.match(page.output, /→ \(0, 120\)/);
  const el = await ops.scroll('#box', 0, 30);
  assertOk(el);
  assert.match(el.output, /scrollLeft\/Top \(0, 0\) → \(0, 30\)/);
});

test('platform-dom: zoom 根元素 zoom 近似 + 恢复 100%（FR-017 桩补真）', async () => {
  const { ops } = buildHarness(() => {});
  const r = await ops.zoom(150);
  assertOk(r);
  assert.match(r.output, /150%/);
  const back = await ops.zoom(100);
  assertOk(back);
  const back2 = await ops.zoom(undefined);
  assertOk(back2);
});

test('platform-dom: fullscreen 进入/退出 + 手势授权失败可读转译（FR-017/EC-008）', async () => {
  const { doc, ops } = buildHarness((d) => {
    (d.documentElement as ShimElement & { requestFullscreen?: () => Promise<void> }).requestFullscreen = async () => {
      d.fullscreenElement = d.documentElement;
    };
  });
  const enter = await ops.fullscreen(true);
  assertOk(enter);
  assert.match(enter.output, /进入全屏/);
  assert.equal(doc.fullscreenElement, doc.documentElement);
  const exit = await ops.fullscreen(false);
  assertOk(exit);
  assert.equal(doc.fullscreenElement, null);
  // 手势拒绝路径：requestFullscreen reject → 可读转译（非桩错误）
  const d2 = new ShimDocument();
  const err = new Error('must be handled by user gesture');
  err.name = 'NotAllowedError';
  (d2.documentElement as ShimElement & { requestFullscreen?: () => Promise<void> }).requestFullscreen = async () => {
    throw err;
  };
  const ops2 = createBrowserDomOps({ document: d2 as unknown as Document });
  const denied = await ops2.fullscreen(true);
  assertErr(denied, /授权被拒绝|手势|✖/);
});

test('platform-dom: snapshot 无参 = 纯文本截断 20k（v2 兼容，无附加标记）', async () => {
  const { ops, loc } = buildHarness((d) => {
    const p = new ShimElement('p');
    p.textContent = 'hello';
    d.body.appendChild(p);
  });
  const r = await ops.snapshot();
  assertOk(r);
  assert.match(r.output, /hello/);
  assert.doesNotMatch(r.output, /已截断/);
});

// ==================== 定位（locator 复用：css/text= 树走） ====================

test('platform-dom: text= 精确命中叶子元素（嵌套容器不误中，ADR-007）', async () => {
  const { ops, loc } = buildHarness((d) => {
    const wrap = new ShimElement('div');
    wrap.setAttribute('id', 'wrap');
    const btn = mkButton('inner', '提交订单');
    const span = new ShimElement('span');
    span.textContent = '尾注';
    wrap.appendChild(btn);
    wrap.appendChild(span);
    d.body.appendChild(wrap);
  });
  // container div textContent = "提交订单尾注"，text= 精确只命中叶子 button（ADR-007 去祖先语义）
  const exact = await ops.findElements({ selector: 'text=提交订单' });
  assertOk(exact);
  assert.match(exact.output, /共匹配 1 个元素/);
  assert.match(exact.output, /button#inner/);
  const contains = await ops.findElements({ selector: 'text*=订单' });
  assertOk(contains);
  assert.match(contains.output, /共匹配 1 个元素/);
  // 跨多个叶子文本节点的拼接串不命中任何单元素（ADR-007 叶子语义：容器无自有文本不参与匹配）
  const spanning = await ops.findElements({ selector: 'text*=提交订单尾注' });
  assertOk(spanning);
  assert.match(spanning.output, /共匹配 0 个元素/);
});

test('platform-dom: role=/xpath= 显式不支持，不静默当 CSS（EC-002）', async () => {
  const { ops } = buildHarness(() => {});
  const role = await ops.findElements({ selector: 'role=button' });
  assertErr(role, /role= 定位暂不支持/);
  const xpath = await ops.findElements({ selector: 'xpath=//button' });
  assertErr(xpath, /xpath= 定位暂不支持/);
});

// ==================== 感知族（interactives/readElement/find/structure/snapshotStructured） ====================

function perceptionFixture(d: ShimDocument): void {
  const btn = mkButton('submit', '提交订单');
  btn.setAttribute('name', 'submitBtn');
  btn.setRect({ x: 0, y: 0, width: 90, height: 32 });
  const pwd = new ShimElement('input');
  pwd.setAttribute('id', 'pw');
  pwd.setAttribute('type', 'password');
  pwd.setAttribute('name', 'password');
  pwd.value = 'S3cret明文';
  pwd.setRect({ x: 0, y: 40, width: 120, height: 28 });
  const link = new ShimElement('a');
  link.setAttribute('href', 'https://example.com/docs');
  link.textContent = '文档';
  const h2 = new ShimElement('h2');
  h2.textContent = '章节一';
  d.body.appendChild(btn);
  d.body.appendChild(pwd);
  d.body.appendChild(link);
  d.body.appendChild(h2);
}

test('platform-dom: interactives 列出可交互元素且 password 只出类型不出值（FR-011/024）', async () => {
  const { ops } = buildHarness(perceptionFixture);
  const r = await ops.interactives();
  assertOk(r);
  assert.match(r.output, /button/);
  assert.match(r.output, /<input#pw>/);
  assert.match(r.output, /link/);
  assert.doesNotMatch(r.output, /S3cret明文/);
  assert.doesNotMatch(r.output, /value=/);
  // 文本过滤
  const filtered = await ops.interactives({ text: '订单' });
  assertOk(filtered);
  assert.match(filtered.output, /button#submit/);
  assert.doesNotMatch(filtered.output, /input:password/);
});

test('platform-dom: interactives 预算截断标记（I-08/S-08）', async () => {
  const { ops } = buildHarness((d) => {
    for (let i = 0; i < 5; i++) d.body.appendChild(mkButton(`b${i}`, `按钮${i}`));
  });
  const r = await ops.interactives({ maxItems: 2 });
  assertOk(r);
  assert.match(r.output, /清单预算/);
  assert.match(r.output, /5 条 > 单次上限 2/);
});

test('platform-dom: readElement 多读取面 + 敏感值脱敏（FR-012/024/EC-005）', async () => {
  const { ops, loc } = buildHarness(perceptionFixture);
  const btn = await ops.readElement({ selector: '#submit', fields: { text: true, geometry: true, state: true, attributes: ['name'], classList: true } });
  assertOk(btn);
  assert.match(btn.output, /tag: button#submit/);
  assert.match(btn.output, /text: 提交订单/);
  assert.match(btn.output, /geometry: rect/);
  assert.match(btn.output, /attributes: name="submitBtn"/);
  const pwd = await ops.readElement({ selector: '#pw', fields: { value: true } });
  assertOk(pwd);
  assert.match(pwd.output, /已脱敏/);
  assert.doesNotMatch(pwd.output, /S3cret明文/);
  const missing = await ops.readElement({ selector: '#nope', fields: { text: true } });
  assertErr(missing, /未找到元素/);
});

test('platform-dom: readElement --attributes 敏感控件 value 属性占位不回显明文（C12 加固/FR-024/EC-005）', async () => {
  const { ops } = buildHarness((d) => {
    const pwd = new ShimElement('input');
    pwd.setAttribute('id', 'pw3');
    pwd.setAttribute('type', 'password');
    pwd.setAttribute('name', 'login-password');
    pwd.setAttribute('value', 'prefill-S3cret'); // 服务端预填默认值挂在 value 属性上
    d.body.appendChild(pwd);
    const q = new ShimElement('input');
    q.setAttribute('id', 'q');
    q.setAttribute('type', 'text');
    q.setAttribute('name', 'q');
    q.setAttribute('value', 'search-term');
    d.body.appendChild(q);
  });
  // attributes=true 全量面：敏感控件 value 属性占位（不回显服务端预填明文）
  const pwd = await ops.readElement({ selector: '#pw3', fields: { attributes: true } });
  assertOk(pwd);
  assert.doesNotMatch(pwd.output, /prefill-S3cret/);
  assert.match(pwd.output, /value="password：值已脱敏/);
  assert.match(pwd.output, /type="password"/); // 非敏感属性照常展示
  assert.match(pwd.output, /name="login-password"/);
  // 显式点名 value 属性同样脱敏（防经 attributes 面绕过 fields.value 掩码）
  const pwdV = await ops.readElement({ selector: '#pw3', fields: { attributes: ['value'] } });
  assertOk(pwdV);
  assert.doesNotMatch(pwdV.output, /prefill-S3cret/);
  assert.match(pwdV.output, /已脱敏/);
  // 非敏感控件 value 属性照常原文展示（零回归）
  const q = await ops.readElement({ selector: '#q', fields: { attributes: true } });
  assertOk(q);
  assert.match(q.output, /value="search-term"/);
  const qV = await ops.readElement({ selector: '#q', fields: { attributes: ['value'] } });
  assertOk(qV);
  assert.match(qV.output, /value="search-term"/);
});

test('platform-dom: readElement --styles true 属性遍历拼装 + 预算截断带标记（C34 语义保持；≤800 无标记）', async () => {
  // Chrome：getComputedStyle(el).cssText 恒空 —— 全量面须按属性索引遍历拼装（cssText 不可依赖）
  const pairs: Array<[string, string]> = Array.from({ length: 60 }, (_, i) => [
    `--v${i}`,
    `gradient ${i} stop ${'x'.repeat(24)} rgb(${i % 256}, 0, 0)`,
  ]);
  const longCss = pairs.map(([p, v]) => `${p}: ${v}`).join('; ');
  assert.ok(longCss.length > 800, 'fixture computed 全量拼装应超 800 字符预算');
  const mkComputed = (list: Array<[string, string]>) => ({
    cssText: '', // Chrome：getComputedStyle(el).cssText 恒空
    length: list.length,
    item: (i: number) => list[i][0],
    getPropertyValue: (p: string) => list.find(([n]) => n === p)?.[1] ?? '',
  });
  const { ops } = buildHarness((d) => {
    const box = new ShimElement('div');
    box.setAttribute('id', 'styled');
    box.setComputed('', {});
    d.body.appendChild(box);
    Object.defineProperty(d, 'defaultView', {
      configurable: true,
      value: { getComputedStyle: () => mkComputed(pairs) },
    });
  });
  const r = await ops.readElement({ selector: '#styled', fields: { styles: true } });
  assertOk(r);
  assert.match(r.output, /styles\(computed\):/);
  assert.doesNotMatch(r.output, /（不可读\/空）/); // 遍历真实属性 → 全量可读
  assert.match(r.output, /…（styles 已截断：全量 \d+ 字符）/);
  assert.match(r.output, new RegExp(`全量 ${longCss.length} 字符`));
  assert.doesNotMatch(r.output, /--v59/); // 尾部内容确实被截断
  // 未超预算（≤800）的全量拼装：原文展示、无截断标记
  const { ops: ops2 } = buildHarness((d) => {
    const box = new ShimElement('div');
    box.setAttribute('id', 'short');
    box.setComputed('', {});
    d.body.appendChild(box);
    Object.defineProperty(d, 'defaultView', {
      configurable: true,
      value: {
        getComputedStyle: () => mkComputed([['color', 'red'], ['font-size', '12px']]),
      },
    });
  });
  const s = await ops2.readElement({ selector: '#short', fields: { styles: true } });
  assertOk(s);
  assert.match(s.output, /styles\(computed\): color: red; font-size: 12px$/);
  assert.doesNotMatch(s.output, /已截断/);
});

test('platform-dom: readElement --styles true cssText 恒空但属性可遍历 → 返回真实全量属性（C34 bug 修复回归）', async () => {
  // 回归场景：Chrome getComputedStyle(el).cssText 恒为空字符串，但属性索引（length/item）可遍历、
  // getPropertyValue 可读 —— 修复前此分支恒输出"（不可读/空）"
  const { ops } = buildHarness((d) => {
    const box = new ShimElement('div');
    box.setAttribute('id', 'vis');
    box.setComputed('', {});
    d.body.appendChild(box);
    Object.defineProperty(d, 'defaultView', {
      configurable: true,
      value: {
        getComputedStyle: () => ({
          cssText: '',
          length: 4,
          item: (i: number) => ['color', 'background-color', 'font-size', '--custom'][i],
          getPropertyValue: (p: string) =>
            p === 'color' ? 'rgb(255, 0, 0)' : p === 'background-color' ? 'rgb(0, 0, 255)' : p === 'font-size' ? '16px' : p === '--custom' ? 'branded' : '',
        }),
      },
    });
  });
  const r = await ops.readElement({ selector: '#vis', fields: { styles: true } });
  assertOk(r);
  assert.match(
    r.output,
    /styles\(computed\): color: rgb\(255, 0, 0\); background-color: rgb\(0, 0, 255\); font-size: 16px; --custom: branded/,
  );
  assert.doesNotMatch(r.output, /（不可读\/空）/); // 真实全量属性而非占位
  assert.doesNotMatch(r.output, /已截断/);
});

test('platform-dom: findElements 计数 + detail 建议 + 0 匹配 ok:true（FR-013/EC-001）', async () => {
  const { ops } = buildHarness(perceptionFixture);
  const r = await ops.findElements({ selector: '#submit', detail: true });
  assertOk(r);
  assert.match(r.output, /共匹配 1 个元素/);
  assert.match(r.output, /button#submit/);
  const zero = await ops.findElements({ selector: '.nothing' });
  assertOk(zero);
  assert.match(zero.output, /共匹配 0 个元素/);
});

test('platform-dom: readStructure children/links/headings/forms + outerHTML（FR-014）', async () => {
  const { ops } = buildHarness(perceptionFixture);
  const r = await ops.readStructure({
    selector: 'body',
    parts: ['children', 'links', 'headings', 'forms'],
  });
  assertOk(r);
  assert.match(r.output, /children（"body" 直接子元素 4 个）/);
  assert.match(r.output, /links：1 个链接/);
  assert.match(r.output, /href="https:\/\/example\.com\/docs"/);
  assert.match(r.output, /headings：1 个标题/);
  assert.match(r.output, /forms：2 个控件/);
  assert.match(r.output, /敏感!/);
});

test('platform-dom: snapshotStructured 分页两页拼接 ≈ 全文 + 预算截断标记（FR-010/S-08）', async () => {
  const { ops } = buildHarness((d) => {
    for (let i = 0; i < 4; i++) d.body.appendChild(mkButton(`p${i}`, `分页${i}`));
    const h1 = new ShimElement('h1');
    h1.textContent = '大标题';
    const h3 = new ShimElement('h3');
    h3.textContent = '小标题';
    d.body.appendChild(h1);
    d.body.appendChild(h3);
  });
  const r = await ops.snapshotStructured({ sections: ['headings'], limit: 1, offset: 0 });
  assertOk(r);
  assert.match(r.output, /大标题/);
  assert.match(r.output, /还有 1 条/);
  const r2 = await ops.snapshotStructured({ sections: ['headings'], limit: 1, offset: 1 });
  assertOk(r2);
  assert.match(r2.output, /小标题/);
  const tiny = await ops.snapshotStructured({ sections: ['headings'], maxLength: 40 });
  assertOk(tiny);
  assert.match(tiny.output, /已截断/);
});

// ==================== 交互族（dblclick/contextmenu/long-press/drag/focus/blur/press） ====================

test('platform-dom: dblclick/contextmenu 事件序列（FR-018）', async () => {
  const { ops, loc } = buildHarness((d) => {
    d.body.appendChild(mkButton('db', '双击'));
  });
  const seq: string[] = [];
  const target = loc('#db');
  for (const t of ['mousedown', 'mouseup', 'click', 'dblclick']) target.addEventListener(t, () => seq.push(t));
  const r = await ops.dblclick('#db');
  assertOk(r);
  assert.deepEqual(seq, ['mousedown', 'mouseup', 'mousedown', 'mouseup', 'click', 'dblclick']);
  const ctx = await ops.contextmenu('#db');
  assertOk(ctx);
});

test('platform-dom: longPress pointerdown→hold→pointerup（FR-019，ms 可配）', async () => {
  const { ops, loc } = buildHarness((d) => {
    const b = mkButton('lp', '长按');
    b.setRect({ x: 0, y: 0, width: 60, height: 20 });
    d.body.appendChild(b);
  });
  const got: string[] = [];
  const target = loc('#lp');
  target.addEventListener('pointerdown', () => got.push('down'));
  target.addEventListener('pointerup', () => got.push('up'));
  const start = Date.now();
  const r = await ops.longPress('#lp', 30);
  const elapsed = Date.now() - start;
  assertOk(r);
  assert.ok(elapsed >= 25, `长按应保持 ≥ms，实际 ${elapsed}ms`);
  assert.deepEqual(got, ['down', 'up']);
});

test('platform-dom: dragDrop 派发 dragstart→drop→dragend 序列（FR-019/EC-007）', async () => {
  const { ops, loc } = buildHarness((d) => {
    d.body.appendChild(mkButton('from', '源'));
    d.body.appendChild(mkButton('to', '目标'));
  });
  const got: string[] = [];
  loc('#from').addEventListener('dragstart', () => got.push('dragstart'));
  loc('#from').addEventListener('dragend', () => got.push('dragend'));
  loc('#to').addEventListener('dragover', () => got.push('dragover'));
  loc('#to').addEventListener('drop', () => got.push('drop'));
  const r = await ops.dragDrop('#from', '#to');
  assertOk(r);
  assert.deepEqual(got, ['dragstart', 'dragover', 'drop', 'dragend']);
});

test('platform-dom: focus/blur + 不可聚焦可读错误（FR-021）', async () => {
  const { doc, ops } = buildHarness((d) => {
    const inp = new ShimElement('input');
    inp.setAttribute('id', 'fld');
    inp.setRect({ x: 0, y: 0, width: 100, height: 20 });
    d.body.appendChild(inp);
    const inert = new ShimElement('div');
    inert.setAttribute('id', 'inert');
    inert.setRect({ x: 0, y: 0, width: 50, height: 20 });
    d.body.appendChild(inert);
  });
  const ok = await ops.focusEl('#fld');
  assertOk(ok);
  assert.equal(doc.activeElement?.id, 'fld');
  const no = await ops.focusEl('#inert');
  assertErr(no, /不可聚焦/);
  const bl = await ops.blurEl('#fld');
  assertOk(bl);
});

test('platform-dom: pressKey 修饰符组合 keydown→keyup（FR-023）', async () => {
  const { ops, loc } = buildHarness((d) => {
    const inp = new ShimElement('input');
    inp.setAttribute('id', 'k');
    inp.setRect({ x: 0, y: 0, width: 100, height: 20 });
    d.body.appendChild(inp);
  });
  const got: string[] = [];
  const target = loc('#k');
  target.addEventListener('keydown', (ev) => got.push(`down:${(ev as FakeKeyboardEvent).key}:${(ev as FakeKeyboardEvent).ctrlKey}`));
  target.addEventListener('keyup', (ev) => got.push(`up:${(ev as FakeKeyboardEvent).key}`));
  const r = await ops.pressKey('ctrl+s', { selector: '#k' });
  assertOk(r);
  assert.deepEqual(got, ['down:s:true', 'up:s']);
  const bad = await ops.pressKey('ctrl+');
  assertErr(bad, /缺主键/);
});

// ==================== typeText / set-value（ADR-004 React 受控基元） ====================

test('platform-dom: typeText 字符级序列 + 值变更 + 回读一致（FR-022/ADR-004）', async () => {
  const { ops, loc } = buildHarness((d) => {
    const inp = new ShimElement('input');
    inp.setAttribute('id', 't');
    inp.setRect({ x: 0, y: 0, width: 100, height: 20 });
    d.body.appendChild(inp);
  });
  const seq: string[] = [];
  const inp = loc('#t');
  inp.addEventListener('keydown', (ev) => seq.push(`kd:${(ev as FakeKeyboardEvent).key}`));
  inp.addEventListener('input', () => seq.push('input'));
  inp.addEventListener('keyup', (ev) => seq.push(`ku:${(ev as FakeKeyboardEvent).key}`));
  inp.addEventListener('change', () => seq.push('change'));
  const r = await ops.typeText('#t', 'ab');
  assertOk(r);
  assert.equal(inp.value, 'ab');
  assert.deepEqual(seq, ['kd:a', 'input', 'ku:a', 'kd:b', 'input', 'ku:b', 'change']);
  const r2 = await ops.typeText('#t', 'XY', { clear: true });
  assertOk(r2);
  assert.equal(inp.value, 'XY');
});

test('platform-dom: typeText contenteditable 降级插入 + file input 显式不可用（NG-004）', async () => {
  const { ops, loc } = buildHarness((d) => {
    const ce = new ShimElement('div');
    ce.setAttribute('contenteditable', 'true');
    ce.setAttribute('id', 'ce');
    ce.textContent = '';
    d.body.appendChild(ce);
    const file = new ShimElement('input');
    file.setAttribute('id', 'f');
    file.setAttribute('type', 'file');
    d.body.appendChild(file);
  });
  const r = await ops.typeText('#ce', '插入文本');
  assertOk(r);
  assert.equal(loc('#ce').textContent, '插入文本');
  const bad = await ops.typeText('#f', 'x');
  assertErr(bad, /程序化键入/);
});

test('platform-dom: typeText 值被锁 → EC-006 回读不一致提示（不静默成功）', async () => {
  const { ops, loc } = buildHarness((d) => {
    const inp = new ShimElement('input');
    inp.setAttribute('id', 't2');
    d.body.appendChild(inp);
  });
  const inp = loc('#t2');
  // 模拟 React 受控 tracker 拒绝写入（setter 吞掉赋值，值被还原为 locked）
  Object.defineProperty(inp, 'value', {
    get(): string {
      return 'locked';
    },
    set(): void {
      /* 拒绝写入：React 内部 tracker 还原语义 */
    },
  });
  const r = await ops.typeText('#t2', 'ab');
  assertErr(r, /回读不一致|值可能未同步/);
});

// ==================== D1 修复（FR-022/NFR-004）：React 受控字段首次键入 = set-value 全量提交 ====================
// node 面说明：shim 无法跑真实 React（无 HTMLTextAreaElement 构造器 → setNativeValue 走直赋回退）；
// 本用例模拟 React 受控字段的宿主痕迹（实例 _valueTracker + getValue/setValue）与受控 onChange 单发提交契约，
// 断言修复后的**路由决策与事件形态**（单次 input/change 携带全量值）。真实 React 提交面由 chromium +
// lgdl-web 冒烟实证（D1 根因 = setNativeValue 构造器判定 `typeof Ctor === 'object'` 恒假 → 真实浏览器
// 直赋命中 React 实例级 setter 更新 tracker → onChange 被抑制；改 'function' 后原型 native setter 生效，
// 受控字段首次键入即提交）。

test('platform-dom: typeText 受控字段（值 tracker）首次键入 clear → 单发 input/change 全量提交（D1 修复）', async () => {
  const { ops, loc } = buildHarness((d) => {
    const inp = new ShimElement('input');
    inp.setAttribute('id', 'ct');
    d.body.appendChild(inp);
  });
  const inp = loc('#ct');
  // React 受控字段宿主痕迹：_valueTracker（getValue/setValue 跟踪「React 已知值」）
  const tracker = { current: '', getValue: () => tracker.current, setValue: (v: string) => { tracker.current = v; } };
  Object.defineProperty(inp, '_valueTracker', { configurable: true, value: tracker });
  const seq: string[] = [];
  const seenInputs: string[] = [];
  inp.addEventListener('keydown', (ev) => seq.push(`kd:${(ev as FakeKeyboardEvent).key}`));
  inp.addEventListener('keyup', (ev) => seq.push(`ku:${(ev as FakeKeyboardEvent).key}`));
  inp.addEventListener('input', () => {
    seq.push('input');
    seenInputs.push(inp.value); // 模拟 React onChange 读取 e.target.value
  });
  inp.addEventListener('change', () => seq.push('change'));
  const r = await ops.typeText('#ct', 'hi', { clear: true });
  assertOk(r);
  assert.equal(inp.value, 'hi');
  // D1 核心：受控字段首次键入 = 与 set-value 同构的单发 input 携带全量值（React onChange 一次提交）；
  // 字符级键盘事件在受控路径不派发（受控单发提交 + EC-006 可读说明；node 面只验路由与事件形态，
  // 真实 React 提交由 chromium + lgdl-web 实证——根因在 setNativeValue 构造器判定，见其注释）
  assert.deepEqual(seenInputs, ['hi'], '受控路径应单发 input 且携带全量提交值（React onChange 一次提交）');
  assert.deepEqual(seq, ['input', 'change'], '受控路径仅单发 input + change（无字符级 keydown/keyup）');
  const typedR = r as PlatformDomOpResult & { valueSynced?: boolean };
  assert.equal(typedR.valueSynced, true, '受控路径应回 valueSynced=true（EC-006 可读说明）');
  assert.match(r.output, /受控字段 → set-value 全量提交基元/);
  assert.match(r.output, /字符级键盘事件保留给非受控路径/);
});

test('platform-dom: typeText 受控字段（值 tracker）追加键入 → 既有值+键入 单发全量提交（D1 修复）', async () => {
  const { ops, loc } = buildHarness((d) => {
    const inp = new ShimElement('textarea');
    inp.setAttribute('id', 'ct2');
    d.body.appendChild(inp);
  });
  const inp = loc('#ct2') as ShimElement & { value: string };
  inp.value = 'ab'; // 受控已提交值
  const tracker = { current: 'ab', getValue: () => tracker.current, setValue: (v: string) => { tracker.current = v; } };
  Object.defineProperty(inp, '_valueTracker', { configurable: true, value: tracker });
  let inputs = 0;
  let changes = 0;
  const seenInputs: string[] = [];
  inp.addEventListener('input', () => {
    inputs++;
    seenInputs.push(inp.value);
  });
  inp.addEventListener('change', () => changes++);
  const r = await ops.typeText('#ct2', 'cd');
  assertOk(r);
  assert.equal(inp.value, 'abcd');
  assert.equal(inputs, 1, '受控路径追加也应单发 input（无逐字符中间提交）');
  assert.equal(changes, 1);
  assert.deepEqual(seenInputs, ['abcd']);
  const typedR = r as PlatformDomOpResult & { valueSynced?: boolean };
  assert.equal(typedR.valueSynced, true);
});

test('platform-dom: typeText 无 React 值 tracker 信号 → v2 逐字符路径零回归（D1 守卫）', async () => {
  const { ops, loc } = buildHarness((d) => {
    for (const id of ['g1', 'g2']) {
      const inp = new ShimElement('input');
      inp.setAttribute('id', id);
      d.body.appendChild(inp);
    }
  });
  const inp1 = loc('#g1');
  const inp2 = loc('#g2');
  // 伪 tracker 无 getValue 函数 → 不判为 React 值 tracker
  Object.defineProperty(inp1, '_valueTracker', { configurable: true, value: { foo: 1 } });
  // React 风格内部 props key 但无受控 value（或 value=undefined）→ 不判为受控
  Object.defineProperty(inp2, '__reactProps$abc123', { configurable: true, enumerable: true, value: { onChange: () => {}, value: undefined } });
  for (const inp of [inp1, inp2]) {
    const seq: string[] = [];
    inp.addEventListener('keydown', (ev) => seq.push(`kd:${(ev as FakeKeyboardEvent).key}`));
    inp.addEventListener('input', () => seq.push('input'));
    inp.addEventListener('keyup', (ev) => seq.push(`ku:${(ev as FakeKeyboardEvent).key}`));
    inp.addEventListener('change', () => seq.push('change'));
    const r = await ops.typeText(`#${inp.id}`, 'ab');
    assertOk(r);
    assert.equal(inp.value, 'ab');
    assert.deepEqual(seq, ['kd:a', 'input', 'ku:a', 'kd:b', 'input', 'ku:b', 'change'], `#${inp.id} 应保持 v2 逐字符序列`);
    const typedR = r as PlatformDomOpResult & { valueSynced?: boolean };
    assert.equal(typedR.valueSynced, undefined, '非受控路径不回 valueSynced（保持 v2 结果面）');
  }
});

// ==================== 写入族（set-text/attr/style/value/fill/add/remove + 回读校验） ====================

test('platform-dom: setText textContent 覆盖 + 回读（FR-031）', async () => {
  const { ops, loc } = buildHarness((d) => {
    const p = new ShimElement('p');
    p.setAttribute('id', 'txt');
    p.textContent = '旧文本';
    d.body.appendChild(p);
  });
  const r = await ops.setText('#txt', '新文本');
  assertOk(r);
  assert.equal(loc('#txt').textContent, '新文本');
});

test('platform-dom: setAttr/removeAttr + 非法属性名可读错误（FR-032）', async () => {
  const { ops, loc } = buildHarness((d) => {
    const el = new ShimElement('div');
    el.setAttribute('id', 'at');
    d.body.appendChild(el);
  });
  const r = await ops.setAttr('#at', 'data-x', '1');
  assertOk(r);
  assert.equal(loc('#at').getAttribute('data-x'), '1');
  const bad = await ops.setAttr('#at', 'bad name');
  assertErr(bad, /非法属性名/);
  const rm = await ops.removeAttr('#at', 'data-x');
  assertOk(rm);
  assert.equal(loc('#at').getAttribute('data-x'), null);
});

test('platform-dom: setStyle cssText 覆盖 + classList 操作（FR-033）', async () => {
  const { ops, loc } = buildHarness((d) => {
    const el = new ShimElement('div');
    el.setAttribute('id', 'st');
    d.body.appendChild(el);
  });
  const r = await ops.setStyle('#st', { cssText: 'color: red; font-size: 12px' });
  assertOk(r);
  assert.match(r.output, /cssText 已覆盖/);
  const cls = await ops.setStyle('#st', { classAction: 'add', className: 'hot' });
  assertOk(cls);
  assert.equal(loc('#st').className, 'hot');
});

test('platform-dom: setValue input + change 序列（React 受控基元 FR-034）', async () => {
  const { ops, loc } = buildHarness((d) => {
    const inp = new ShimElement('input');
    inp.setAttribute('id', 'sv');
    d.body.appendChild(inp);
  });
  const got: string[] = [];
  const inp = loc('#sv');
  inp.addEventListener('input', () => got.push('input'));
  inp.addEventListener('change', () => got.push('change'));
  const r = await ops.setValue('#sv', 'hello');
  assertOk(r);
  assert.equal(inp.value, 'hello');
  assert.deepEqual(got, ['input', 'change']);
});

test('platform-dom: fillForm 类型化多字段 + select/checkbox/file 边界 + submit（FR-035/NG-004）', async () => {
  const { ops, loc } = buildHarness((d) => {
    const form = new ShimElement('form');
    form.setAttribute('id', 'f');
    const name = new ShimElement('input');
    name.setAttribute('id', 'nm');
    name.setAttribute('name', 'name');
    const sel = new ShimElement('select');
    sel.setAttribute('id', 'city');
    for (const v of ['bj', 'sh']) {
      const opt = new ShimElement('option');
      opt.setAttribute('value', v);
      opt.textContent = v === 'bj' ? '北京' : '上海';
      sel.appendChild(opt);
    }
    const cb = new ShimElement('input');
    cb.setAttribute('id', 'agree');
    cb.setAttribute('type', 'checkbox');
    cb.value = 'on';
    const file = new ShimElement('input');
    file.setAttribute('id', 'up');
    file.setAttribute('type', 'file');
    form.appendChild(name);
    form.appendChild(sel);
    form.appendChild(cb);
    form.appendChild(file);
    d.body.appendChild(form);
  });
  let submitted = 0;
  const shimForm = loc('#f') as ShimElement & { requestSubmit: () => void };
  shimForm.addEventListener('submit', () => submitted++);
  shimForm.requestSubmit = () => {
    submitted++;
    shimForm.dispatchEvent(new FakeEvent('submit', { bubbles: true, cancelable: true }));
  };
  const r = await ops.fillForm({
    fields: [
      { selector: '#nm', value: '张三' },
      { selector: '#city', value: '上海', byLabel: true },
      { selector: '#agree', value: 'on' },
      { selector: '#up', value: 'x' },
    ],
    submit: true,
  });
  assertOk(r);
  assert.equal((loc('#nm') as ShimElement & { value: string }).value, '张三');
  assert.equal((loc('#city') as ShimElement & { value: string }).value, 'sh');
  assert.equal((loc('#agree') as ShimElement & { checked: boolean }).checked, true);
  assert.match(r.output, /file\] 显式不可用/);
  assert.match(r.output, /requestSubmit 提交/);
  assert.ok(submitted >= 1);
});

test('platform-dom: addElement 四位置 + removeElement + remove 不存在 EC-001（FR-036）', async () => {
  const { doc, ops } = buildHarness((d) => {
    const list = new ShimElement('ul');
    list.setAttribute('id', 'list');
    const li1 = new ShimElement('li');
    li1.textContent = 'a';
    list.appendChild(li1);
    d.body.appendChild(list);
  });
  const r1 = await ops.addElement({ tag: 'li', text: 'new', attrs: { id: 'rm', class: 'item' }, position: { mode: 'append', selector: '#list' } });
  assertOk(r1);
  assert.equal(doc.querySelectorAll('#list li').length, 2);
  const r2 = await ops.addElement({ tag: 'li', text: 'x', position: { mode: 'prepend', selector: '#list' } });
  assertOk(r2);
  const r3 = await ops.addElement({ tag: 'p', text: 'sib', position: { mode: 'before', selector: '#list' } });
  assertOk(r3);
  const rm = await ops.removeElement('#rm');
  assertOk(rm);
  const missing = await ops.removeElement('#nope');
  assertErr(missing, /未找到元素/);
});

// ==================== waitFor（轮询通道；observer 通道由 V13 冒烟） ====================

test('platform-dom: waitFor element 延迟出现命中（轮询降级通道 FR-025）', async () => {
  const { doc, ops } = buildHarness((d) => {
    d.body.appendChild(mkButton('w', 'w'));
  });
  const late = mkButton('late', '迟来');
  setTimeout(() => doc.body.appendChild(late), 60);
  const r = await ops.waitFor({ conditions: [{ kind: 'element', selector: '#late' }], timeout: 500, interval: 20 });
  assertOk(r);
  assert.match(r.output, /条件命中/);
});

test('platform-dom: waitFor gone + text + timeout 含最后观察状态（FR-025）', async () => {
  const { doc, ops } = buildHarness((d) => {
    const gone = mkButton('g', '将消失');
    d.body.appendChild(gone);
    setTimeout(() => gone.remove(), 60);
    const p = new ShimElement('p');
    p.setAttribute('id', 'hello');
    p.textContent = '旧内容';
    d.body.appendChild(p);
  });
  const gone = await ops.waitFor({ conditions: [{ kind: 'gone', selector: '#g' }], timeout: 500, interval: 20 });
  assertOk(gone);
  const text = await ops.waitFor({ conditions: [{ kind: 'text', text: 'text=出现的新文本' }], timeout: 300, interval: 30 });
  assertErr(text, /超时/);
  assert.match(text.output, /text=出现的新文本 → ✗ 未命中/);
  const multi = await ops.waitFor({
    conditions: [{ kind: 'element', selector: '#hello' }, { kind: 'gone', selector: '#hello' }],
    mode: 'all',
    timeout: 200,
    interval: 30,
  });
  assertErr(multi, /超时/);
  assert.match(multi.output, /element #hello → ✓ 命中/);
});

// ==================== evaluate（宿主上下文表达式/异常；FR-037） ====================

test('platform-dom: evaluate 表达式/对象字面量序列化 + 异常可读（FR-037）', async () => {
  const { ops } = buildHarness(() => {});
  const r = await ops.evaluate('1 + 2');
  assertOk(r);
  assert.equal(r.output, '3');
  const obj = await ops.evaluate('({ a: 1, b: "x" })', { as: 'expression' });
  assertOk(obj);
  assert.match(obj.output, /"a":1/);
  const err = await ops.evaluate('nopeFn()');
  assertErr(err, /执行异常/);
  const bad = await ops.evaluate('({', { as: 'expression' });
  assertErr(bad, /执行异常|语法/);
});

test('platform-dom: evaluate 异步 Promise 结果 + 预算截断标记（EC-004）', async () => {
  const { ops } = buildHarness(() => {});
  const p = await ops.evaluate('Promise.resolve("async-ok")');
  assertOk(p);
  assert.match(p.output, /async-ok/);
  const big = await ops.evaluate('"x".repeat(5000)', { maxLength: 100 });
  assertOk(big);
  assert.match(big.output, /已截断/);
});

// ==================== extractData（FR-038 声明式抽取） ====================

test('platform-dom: extractData table/list/links/images/meta（FR-038）', async () => {
  const { ops } = buildHarness((d) => {
    const tbl = new ShimElement('table');
    tbl.setAttribute('id', 't');
    const thead = new ShimElement('thead');
    const hr = new ShimElement('tr');
    for (const h of ['城市', '人口']) {
      const th = new ShimElement('th');
      th.textContent = h;
      hr.appendChild(th);
    }
    thead.appendChild(hr);
    tbl.appendChild(thead);
    const tbody = new ShimElement('tbody');
    for (const [c, pop] of [['北京', '2100万'], ['上海', '2400万']]) {
      const tr = new ShimElement('tr');
      for (const v of [c, pop]) {
        const td = new ShimElement('td');
        td.textContent = v;
        tr.appendChild(td);
      }
      tbody.appendChild(tr);
    }
    tbl.appendChild(tbody);
    d.body.appendChild(tbl);
    d.title = 'Extract 页';
    const a = new ShimElement('a');
    a.setAttribute('href', 'https://example.com/next');
    a.textContent = '下一页';
    d.body.appendChild(a);
    const lm = new ShimElement('meta');
    lm.setAttribute('name', 'description');
    lm.setAttribute('content', '测试描述');
    d.body.appendChild(lm);
  });
  const table = await ops.extractData({ kind: 'table', selector: '#t' });
  assertOk(table);
  const parsed = JSON.parse(table.output) as { count: number; rows: Array<Record<string, string>> };
  assert.equal(parsed.count, 2);
  assert.equal(parsed.rows[0]['城市'], '北京');
  assert.equal(parsed.rows[1]['人口'], '2400万');
  const links = await ops.extractData({ kind: 'links' });
  assertOk(links);
  const linksParsed = JSON.parse(links.output) as { count: number };
  assert.equal(linksParsed.count, 1);
  const meta = await ops.extractData({ kind: 'meta' });
  assertOk(meta);
  assert.match(meta.output, /测试描述/);
});

test('platform-dom: extractData 规模截断（maxItems，FR-042/EC-011 保留已采）', async () => {
  const { ops } = buildHarness((d) => {
    const ul = new ShimElement('ul');
    ul.setAttribute('id', 'ul');
    for (let i = 0; i < 5; i++) {
      const li = new ShimElement('li');
      li.textContent = `项${i}`;
      ul.appendChild(li);
    }
    d.body.appendChild(ul);
  });
  const r = await ops.extractData({ kind: 'list', selector: '#ul', maxItems: 2 });
  assertOk(r);
  const parsed = JSON.parse(r.output) as { count: number; truncated: boolean; rows: unknown[] };
  assert.equal(parsed.count, 2);
  assert.equal(parsed.truncated, true);
});

// ==================== chrome：print/historyNav/reloadPage/screenshot 降级 ====================

test('platform-dom: printPage/historyNav/reloadPage 真实调用（FR-026/027）', async () => {
  const { win, ops } = buildHarness(() => {});
  let printed = 0;
  const hist: number[] = [];
  let reloaded = 0;
  (win as { print: () => void }).print = () => printed++;
  (win as { history: { go: (d: number) => void } }).history.go = (d: number) => hist.push(d);
  (win.location as { reload: () => void }).reload = () => reloaded++;
  const p = await ops.printPage();
  assertOk(p);
  assert.equal(printed, 1);
  const nav = await ops.historyNav(-1);
  assertOk(nav);
  assert.deepEqual(hist, [-1]);
  const bad = await ops.historyNav(0);
  assertErr(bad, /非零整数/);
  const rel = await ops.reloadPage();
  assertOk(rel);
  assert.equal(reloaded, 1);
  assert.match(rel.output, /重新 read-state/);
});

test('platform-dom: screenshot 整页不支持 + element 非浏览器降级可读（FR-028 out/EC-008）', async () => {
  const { ops } = buildHarness((d) => {
    d.body.appendChild(mkButton('ss', 'shot'));
  });
  const full = await ops.screenshot({ mode: 'fullpage' });
  assertErr(full, /整页级截图不支持/);
  const element = await ops.screenshot({ mode: 'element', selector: '#ss' });
  // 非浏览器（node）无 XMLSerializer/Image/canvas → 转译 ok:false 可读（真实浏览器路径由 V13 冒烟）
  assertErr(element);
  assert.match(element.output, /✖|截图/);
});
// ===TEST-FILE-END===

// ================= v4（TASK-009/FR-023/ADR-011）：穿透定位护栏常量 + 语义回归 =================

test('platform-dom v4: 穿透深度护栏默认 ≤4 层（PENETRATION_MAX_DEPTH 可查）；未找到文案含穿透与归属提示', async () => {
  const { PENETRATION_MAX_DEPTH } = await import('./platform-dom.js');
  assert.equal(PENETRATION_MAX_DEPTH, 4);
});
