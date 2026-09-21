#!/usr/bin/env node
/**
 * option-g-shim.mjs
 * ───────────────────────────────────────────────────────────────────────────
 * 方案 G（option-g-all-in-next.html）的极简 Node DOM 垫片 + 结构/交互断言。
 *
 * 体例逐节镜像 option-f-shim.mjs（同一个 ~400 行手写 DOM 垫片：解析 + 选择器
 * 子集 + 事件冒泡），把 G 稿加载进 Node，在同一条真实点击/调用路径上断言：
 *   · 三区结构继承（header[role=toolbar] > main[role=log] > footer[role=contentinfo]）
 *   · 12 kind 卡继承（7 主类 + 5 过程卡；零新增卡类型）
 *   · 法七 一切操作皆 Next，禁止死端（5 类阻塞逐一 + ✖ 行不裸奔）
 *   · 法八 值不入流（哨兵值在流内 / digest / 全属性零出现）
 *   · chip ↔ op 绑定 + op 管线四态（params / consent / execute / receipt）
 *   · NextProvider 注册表视察器与场景联动（N→N+1，handleCardAction diff = 0）
 *   · 密度继承（工具栏 ≤5、默认屏 ≤7、chips ≤3）、可拖动侧栏宽度（280–640px，ARIA
 *     separator + 键盘可达 + clamp）与双主题、风险 chip 永不折叠
 *
 * 用法：node option-g-shim.mjs        （退出码 0 = 全通过，1 = 有失败）
 * 依赖：仅 Node 内置 fs / path / url / vm。不联网、不装包。
 */

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const HTML_PATH = path.join(HERE, 'option-g-all-in-next.html');

/* ═════════════════════════════════════════════════════════════════════════
   1. 极简 DOM 垫片
   ═════════════════════════════════════════════════════════════════════════ */

const VOID_TAGS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
  'link', 'meta', 'param', 'source', 'track', 'wbr'
]);

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: '\u00a0' };
function decode(str) {
  return String(str).replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (m, ent) => {
    if (ent[0] === '#') {
      const code = ent[1] === 'x' || ent[1] === 'X'
        ? parseInt(ent.slice(2), 16)
        : parseInt(ent.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : m;
    }
    return Object.prototype.hasOwnProperty.call(ENTITIES, ent) ? ENTITIES[ent] : m;
  });
}

function textNode(data, parent) {
  return {
    nodeType: 3,
    data: String(data),
    parentNode: parent,
    get textContent() { return this.data; }
  };
}

class ClassList {
  constructor(el) { this.el = el; }
  _list() { return (this.el.getAttribute('class') || '').split(/\s+/).filter(Boolean); }
  _write(list) { this.el.setAttribute('class', list.join(' ')); }
  contains(c) { return this._list().indexOf(c) !== -1; }
  add(...cs) { const l = this._list(); cs.forEach(c => { if (l.indexOf(c) === -1) l.push(c); }); this._write(l); }
  remove(...cs) { this._write(this._list().filter(c => cs.indexOf(c) === -1)); }
  toggle(c) { if (this.contains(c)) { this.remove(c); return false; } this.add(c); return true; }
}

class Element {
  constructor(tagName) {
    this.nodeType = 1;
    this.tagName = String(tagName).toUpperCase();
    this.attributes = Object.create(null);
    this.childNodes = [];
    this.parentNode = null;
    this._listeners = Object.create(null);
    this._value = undefined;
    /* style：记录自定义属性（--panel-w 由宽度分隔条改写），便于 Node 侧断言 */
    this._styleProps = Object.create(null);
    this.style = {
      setProperty: (k, v) => { this._styleProps[k] = String(v); },
      removeProperty: (k) => { delete this._styleProps[k]; },
      getPropertyValue: (k) => (Object.prototype.hasOwnProperty.call(this._styleProps, k)
        ? this._styleProps[k] : '')
    };
    this.classList = new ClassList(this);
    this.scrollTop = 0;
    this.scrollHeight = 0;
  }

  /* ── 属性 ── */
  hasAttribute(k) { return Object.prototype.hasOwnProperty.call(this.attributes, k); }
  getAttribute(k) { return this.hasAttribute(k) ? this.attributes[k] : null; }
  setAttribute(k, v) { this.attributes[k] = String(v); }
  removeAttribute(k) { delete this.attributes[k]; }
  get id() { return this.getAttribute('id') || ''; }
  get className() { return this.getAttribute('class') || ''; }
  set className(v) { this.setAttribute('class', v); }

  /* ── hidden 属性 ↔ 属性态（法五密度口径依赖它） ── */
  get hidden() { return this.hasAttribute('hidden'); }
  set hidden(v) { if (v) this.setAttribute('hidden', ''); else this.removeAttribute('hidden'); }

  /* ── tabIndex ↔ tabindex 属性 ── */
  get tabIndex() { return Number(this.getAttribute('tabindex') || 0); }
  set tabIndex(v) {
    if (v === -1 || v === '-1') this.setAttribute('tabindex', '-1');
    else this.setAttribute('tabindex', String(v));
  }

  /* ── value（input / textarea / select） ── */
  get value() {
    if (this._value !== undefined) return this._value;
    return this.getAttribute('value') || '';
  }
  set value(v) { this._value = String(v); }
  get type() { return this.getAttribute('type') || ''; }

  /* ── 树 ── */
  get children() { return this.childNodes.filter(n => n.nodeType === 1); }
  appendChild(node) { node.parentNode = this; this.childNodes.push(node); return node; }
  removeChild(node) {
    const i = this.childNodes.indexOf(node);
    if (i !== -1) this.childNodes.splice(i, 1);
    node.parentNode = null;
    return node;
  }
  get textContent() { return this.childNodes.map(n => n.textContent).join(''); }
  set textContent(v) {
    this.childNodes = [textNode(v, this)];
  }

  /* ── 选择器 ── */
  querySelectorAll(sel) { return queryAll(sel, this, true); }
  querySelector(sel) { return this.querySelectorAll(sel)[0] || null; }

  /* ── 事件（真实冒泡，走的是页面里同一个 addEventListener 路径） ── */
  addEventListener(type, fn) {
    (this._listeners[type] || (this._listeners[type] = [])).push(fn);
  }
  removeEventListener(type, fn) {
    const l = this._listeners[type];
    if (!l) return;
    const i = l.indexOf(fn);
    if (i !== -1) l.splice(i, 1);
  }
  dispatchEvent(ev) {
    ev.target = ev.target || this;
    let node = this;
    while (node) {
      const list = node._listeners && node._listeners[ev.type];
      if (list) {
        ev.currentTarget = node;
        list.slice().forEach(fn => fn.call(node, ev));
      }
      if (ev._stopped) break;
      node = node.parentNode;
    }
    return !ev.defaultPrevented;
  }
  click() { this.dispatchEvent(makeEvent('click', this)); }
  /* 指针捕获（宽度分隔条依赖；垫片里是 no-op，事件仍按同一路径分发） */
  setPointerCapture() {}
  releasePointerCapture() {}
  hasPointerCapture() { return false; }
  scrollIntoView() {}
  focus() {}
  blur() {}
}

function makeEvent(type, target) {
  return {
    type,
    target,
    currentTarget: target,
    defaultPrevented: false,
    _stopped: false,
    preventDefault() { this.defaultPrevented = true; },
    stopPropagation() { this._stopped = true; }
  };
}

/* 指针/键盘事件（宽度分隔条走真实 addEventListener 路径；补 clientX / key / pointerId） */
function makePointerEvent(type, target, props) {
  const ev = makeEvent(type, target);
  Object.assign(ev, props || {});
  return ev;
}

/* ── 选择器子集：逗号分组 / 空格后代 / tag / #id / .class / [attr] / [attr="v"] ── */
const COMPOUND_RE = /(^[a-zA-Z][\w-]*)|(#[\w-]+)|(\.[\w-]+)|(\[[^\]]*\])/;

function tokenizeCompound(comp) {
  const toks = [];
  let i = 0;
  while (i < comp.length) {
    const rest = comp.slice(i);
    const m = COMPOUND_RE.exec(rest);
    if (!m || m.index !== 0) throw new Error('选择器不支持：' + comp);
    i += m[0].length;
    if (m[1]) toks.push({ t: 'tag', v: m[1].toUpperCase() });
    else if (m[2]) toks.push({ t: 'id', v: m[2].slice(1) });
    else if (m[3]) toks.push({ t: 'class', v: m[3].slice(1) });
    else if (m[4]) {
      const body = m[4].slice(1, -1).trim();
      const eq = body.indexOf('=');
      if (eq === -1) toks.push({ t: 'attr', k: body });
      else {
        const k = body.slice(0, eq).trim();
        let v = body.slice(eq + 1).trim();
        if ((v[0] === '"' && v.endsWith('"')) || (v[0] === "'" && v.endsWith("'"))) v = v.slice(1, -1);
        toks.push({ t: 'attrval', k, v });
      }
    }
  }
  return toks;
}

function matchCompound(el, comp) {
  if (el.nodeType !== 1) return false;
  const toks = typeof comp === 'string' ? tokenizeCompound(comp) : comp;
  for (const tk of toks) {
    if (tk.t === 'tag' && el.tagName !== tk.v) return false;
    if (tk.t === 'id' && el.getAttribute('id') !== tk.v) return false;
    if (tk.t === 'class' && !el.classList.contains(tk.v)) return false;
    if (tk.t === 'attr' && !el.hasAttribute(tk.k)) return false;
    if (tk.t === 'attrval' && el.getAttribute(tk.k) !== tk.v) return false;
  }
  return true;
}

const SEL_CACHE = new Map();
function parseSelector(sel) {
  if (SEL_CACHE.has(sel)) return SEL_CACHE.get(sel);
  const groups = String(sel).split(',').map(s => s.trim()).filter(Boolean)
    .map(s => s.split(/\s+/).filter(Boolean).map(tokenizeCompound));
  if (!groups.length) throw new Error('空选择器');
  SEL_CACHE.set(sel, groups);
  return groups;
}

function matchesGroup(el, groups) {
  for (const parts of groups) {
    if (!matchCompound(el, parts[parts.length - 1])) continue;
    let idx = parts.length - 2;
    let node = el.parentNode;
    while (idx >= 0 && node) {
      if (node.nodeType === 1 && matchCompound(node, parts[idx])) idx--;
      node = node.parentNode;
    }
    if (idx < 0) return true;
  }
  return false;
}

function walk(el, out) {
  for (const c of el.childNodes) {
    if (c.nodeType === 1) { out.push(c); walk(c, out); }
  }
  return out;
}

function queryAll(sel, root, excludeSelf) {
  const groups = parseSelector(sel);
  return walk(root, []).filter(el => matchesGroup(el, groups));
}

/* ── HTML 解析 ── */
function findTagEnd(html, start) {
  let i = start;
  let quote = null;
  while (i < html.length) {
    const c = html[i];
    if (quote) { if (c === quote) quote = null; }
    else if (c === '"' || c === "'") quote = c;
    else if (c === '>') return i;
    i++;
  }
  return html.length;
}

function parseAttrs(str, el) {
  const re = /([^\s=/]+)(?:\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g;
  let m;
  while ((m = re.exec(str))) {
    const name = m[1];
    if (!name || name === '/') continue;
    let val = m[3] !== undefined ? m[3] : (m[4] !== undefined ? m[4] : (m[5] !== undefined ? m[5] : ''));
    el.setAttribute(name, decode(val));
  }
}

function parseHTML(html) {
  const root = new Element('#root');
  const stack = [root];
  let i = 0;
  const pushText = (text) => {
    if (!text) return;
    const top = stack[stack.length - 1];
    if (top.tagName === 'SCRIPT' || top.tagName === 'STYLE') return; // 文本不进树
    top.appendChild(textNode(decode(text), top));
  };
  while (i < html.length) {
    const lt = html.indexOf('<', i);
    if (lt === -1) { pushText(html.slice(i)); break; }
    if (lt > i) pushText(html.slice(i, lt));
    if (html.startsWith('<!--', lt)) {
      const end = html.indexOf('-->', lt);
      i = end === -1 ? html.length : end + 3;
      continue;
    }
    if (html.startsWith('<!', lt)) {
      const end = findTagEnd(html, lt);
      i = end + 1;
      continue;
    }
    if (html.startsWith('</', lt)) {
      const end = html.indexOf('>', lt);
      const name = html.slice(lt + 2, end).trim().toLowerCase();
      for (let k = stack.length - 1; k >= 1; k--) {
        if (stack[k].tagName.toLowerCase() === name) { stack.length = k; break; }
      }
      i = end + 1;
      continue;
    }
    const end = findTagEnd(html, lt);
    const raw = html.slice(lt + 1, end);
    const selfClose = /\/\s*$/.test(raw);
    let nameEnd = 0;
    while (nameEnd < raw.length && !/[\s/>]/.test(raw[nameEnd])) nameEnd++;
    const tagName = raw.slice(0, nameEnd);
    const el = new Element(tagName);
    parseAttrs(raw.slice(nameEnd), el);
    stack[stack.length - 1].appendChild(el);
    if (!selfClose && !VOID_TAGS.has(tagName.toLowerCase())) stack.push(el);
    i = end + 1;
  }
  return root;
}

/* ── 组装 document / window 并执行页面内联脚本 ── */
function buildDom(html) {
  const root = parseHTML(html);
  const firstElement = (parent, tag) =>
    walk(parent, []).find(el => el.tagName === tag) || null;
  const htmlEl = firstElement(root, 'HTML');
  if (!htmlEl) throw new Error('未找到 <html>');
  const bodyEl = firstElement(root, 'BODY');
  const headEl = firstElement(root, 'HEAD');

  const document = {
    documentElement: htmlEl,
    head: headEl,
    body: bodyEl,
    nodeType: 9,
    getElementById(id) {
      return walk(root, []).find(el => el.getAttribute('id') === id) || null;
    },
    querySelector(sel) { return queryAll(sel, root, false)[0] || null; },
    querySelectorAll(sel) { return queryAll(sel, root, false); },
    createElement(tag) { return new Element(tag); },
    addEventListener() {},
    removeEventListener() {}
  };

  const sandbox = {
    document,
    console,
    setTimeout: () => 0,
    clearTimeout: () => {},
    setInterval: () => 0,
    clearInterval: () => {},
    requestAnimationFrame: (fn) => { fn(); return 0; }
  };
  sandbox.window = sandbox;
  sandbox.self = sandbox;
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);

  const scripts = [...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/gi)].map(m => m[1]);
  scripts.forEach((code, idx) => {
    try {
      vm.runInContext(code, sandbox, { filename: `option-g-inline-${idx}.js` });
    } catch (err) {
      throw new Error(`内联脚本 #${idx} 执行失败：${err && err.message}`);
    }
  });

  return { document, sandbox, root, htmlEl };
}

/* ═════════════════════════════════════════════════════════════════════════
   2. 断言脚手架
   ═════════════════════════════════════════════════════════════════════════ */

const results = [];
function check(name, fn) {
  try {
    const ok = fn();
    results.push({ name, ok: ok !== false, detail: ok === false ? '返回 false' : '' });
  } catch (err) {
    results.push({ name, ok: false, detail: err && err.message });
  }
}
function eq(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label || '值'}不符：期望 ${JSON.stringify(expected)}，实际 ${JSON.stringify(actual)}`);
  }
  return true;
}
function inc(haystack, needle, label) {
  if (String(haystack).indexOf(needle) === -1) {
    throw new Error(`${label || '文本'}未包含 ${JSON.stringify(needle)}`);
  }
  return true;
}
function ninc(haystack, needle, label) {
  if (String(haystack).indexOf(needle) !== -1) {
    throw new Error(`${label || '文本'}不应包含 ${JSON.stringify(needle)}`);
  }
  return true;
}

/* ═════════════════════════════════════════════════════════════════════════
   3. 加载 + 断言
   ═════════════════════════════════════════════════════════════════════════ */

if (!fs.existsSync(HTML_PATH)) {
  console.error('找不到 design 稿：' + HTML_PATH);
  process.exit(1);
}
const html = fs.readFileSync(HTML_PATH, 'utf8');
const { document, sandbox } = buildDom(html);

const demo = sandbox.__demo;
const density = sandbox.__density;
const widthApi = sandbox.__width;
const isVisible = sandbox.__isVisible;
const reg = sandbox.__registry;
const ops = sandbox.__ops;
const blocking = sandbox.__blocking;
const kinds = sandbox.__kinds;
const $$ = (sel) => document.querySelectorAll(sel);
const one = (sel) => document.querySelector(sel);

/* 12 kind 契约（设计契约顺序：7 主类，然后 5 过程卡） */
const CARD_TYPES = ['ai', 'user', 'nextstep', 'askuser', 'auth', 'system', 'ref',
  'tool', 'command', 'thinking', 'error', 'notice'];

/* 法八 哨兵值：一旦出现在流内 / digest / 任何属性里即失败 */
const SECRET_SENTINEL = 'sk-live-SENTINEL-DEADBEEF-9f2c41a7';

/* 同场景可见的「下一个兄弟元素」（法七 紧随判定的机器实现） */
function nextVisibleSibling(el) {
  const parent = el.parentNode;
  if (!parent) return null;
  const sibs = parent.childNodes.filter((n) => n.nodeType === 1);
  const i = sibs.indexOf(el);
  for (let k = i + 1; k < sibs.length; k++) {
    if (isVisible(sibs[k])) return sibs[k];
  }
  return null;
}
function visibleNextCount(el) {
  if (!el) return 0;
  return el.querySelectorAll('[data-act="next"]').filter(isVisible).length;
}
function currentScene() { return demo.snapshots().scene; }

/* ── A. 三区结构继承（与 F 逐字同口径） ────────────────────────────── */
check('A1 三区结构存在（#region-toolbar / #region-stream / #region-statusbar）', () =>
  !!one('#region-toolbar') && !!one('#region-stream') && !!one('#region-statusbar'));

check('A2 三区顺序正确：工具栏 → 聊天流 → 状态栏', () => {
  const order = walk(one('#panel'), []).filter(el => el.hasAttribute('data-region'));
  eq(order.length, 3, '带 data-region 的区数');
  eq(order[0].getAttribute('data-region'), 'toolbar');
  eq(order[1].getAttribute('data-region'), 'stream');
  eq(order[2].getAttribute('data-region'), 'statusbar');
  return true;
});

check('A3 工具栏语义：header[role=toolbar]', () => {
  const el = one('#region-toolbar');
  eq(el.tagName, 'HEADER');
  eq(el.getAttribute('role'), 'toolbar');
  return true;
});

check('A4 聊天流语义：main 容器内含 ol[role=log]（追加式日志）', () => {
  const el = one('#region-stream');
  eq(el.tagName, 'MAIN');
  const log = el.querySelector('#stream');
  return !!log && log.tagName === 'OL' && log.getAttribute('role') === 'log';
});

check('A5 状态栏语义：footer[role=contentinfo]', () => {
  const el = one('#region-statusbar');
  eq(el.tagName, 'FOOTER');
  eq(el.getAttribute('role'), 'contentinfo');
  return true;
});

check('A6 消息流本体是 ol[role=log] 且挂在 <main> 内（正序、追加）', () => {
  const el = one('#stream');
  return !!el && el.tagName === 'OL' && el.getAttribute('role') === 'log'
    && el.parentNode === one('#region-stream');
});

/* ── B. 12 kind 卡继承（7 主类 + 5 过程卡；零新增） ─────────────────── */
check('B1 12 kind 契约：7 primary + 5 process，顺序与契约一致', () => {
  eq(kinds.all.join(','), CARD_TYPES.join(','), 'CARD_TYPES 顺序');
  eq(kinds.primary.length, 7, 'primary 数');
  eq(kinds.process.length, 5, 'process 数');
  return true;
});

check('B2 12 类卡样例全部存在（每类至少 1 个 [data-msg-type] 样例）', () => {
  const missing = CARD_TYPES.filter(t => $$(`[data-msg-type="${t}"]`).length === 0);
  if (missing.length) throw new Error('缺失卡型：' + missing.join(', '));
  return true;
});

check('B3 每类卡都挂在流（#stream）的 li 上', () => {
  for (const t of CARD_TYPES) {
    const cards = $$(`#stream [data-msg-type="${t}"]`);
    if (!cards.length) throw new Error(t + ' 无样例');
    if (!cards.every(c => c.tagName === 'LI')) throw new Error(t + ' 样例不是 li');
  }
  return true;
});

check('B4 流内不存在契约外的卡型（零新增卡类型）', () => {
  const known = new Set(CARD_TYPES);
  const bad = walk(one('#stream'), []).filter(el => el.hasAttribute('data-msg-type'))
    .map(el => el.getAttribute('data-msg-type')).filter(t => !known.has(t));
  if (bad.length) throw new Error('契约外卡型：' + [...new Set(bad)].join(', '));
  return true;
});

check('B5 AI 答复卡支持富文本（编号列表 / 代码 / 表格摘要），下一步推荐卡含可点 chips', () => {
  const rich = one('#msg-g-welcome');
  const next = one('#msg-g-next-llm');
  const chips = next.querySelectorAll('[data-act="next"]');
  return !!rich && !!rich.querySelector('ol') && !!rich.querySelector('code') && !!rich.querySelector('table')
    && chips.length >= 1 && chips.every(c => !c.hidden);
});
/* ── C. ask-user 扩形（secret / form / choice）+ 操作前 → 操作后固化 ── */
check('C1 ask-user secret 扩形：卡内含 type=password 的掩码输入（输入在卡内，法四）', () => {
  const card = one('#msg-g-ask-key');
  eq(card.getAttribute('data-msg-type'), 'askuser');
  eq(card.getAttribute('data-ask-kind'), 'text');
  eq(card.getAttribute('data-secret'), 'true');
  const input = card.querySelector('input.ask-input');
  return !!input && input.getAttribute('type') === 'password' && input.getAttribute('autocomplete') === 'off';
});

check('C2 ask-user choice 扩形：≥3 选项 + 末项「其他…（我来描述）」且兜底输入默认收起', () => {
  const card = one('#msg-g-ask-vendor');
  eq(card.getAttribute('data-ask-kind'), 'choice');
  const other = card.querySelector('[data-act="choose-other"]');
  const box = card.querySelector('.ask-other');
  return card.querySelectorAll('[data-act="choose"]').length >= 3 && !!other && !!box && box.hidden === true;
});

check('C3 ask-user form 扩形：参数表单（≥3 个权限项 checkbox · 承载 op 的 params 步）', () => {
  const card = one('#msg-g-ask-permform');
  eq(card.getAttribute('data-ask-kind'), 'form');
  eq(card.getAttribute('data-op'), 'op.perm.request');
  eq(card.getAttribute('data-op-stage'), 'params');
  return card.querySelectorAll('input[type="checkbox"]').length >= 3;
});

check('C4 操作前：掩码卡未答，表单可见、固化区隐藏', () => {
  const card = one('#msg-g-ask-key');
  eq(card.getAttribute('data-answered'), 'false');
  return card.querySelector('.ask-form').hidden === false && card.querySelector('.ask-fixed').hidden === true;
});

check('C5 掩码值经输入框提交 → 固化（走真实输入路径，不由外部直传）', () => {
  eq(demo.setSecret('msg-g-ask-key', SECRET_SENTINEL), true, 'setSecret 返回值');
  eq(demo.answerAsk('msg-g-ask-key'), true, 'answerAsk 返回值');
  const card = one('#msg-g-ask-key');
  eq(card.getAttribute('data-answered'), 'true');
  return card.querySelector('.ask-form').hidden === true && card.querySelector('.ask-fixed').hidden === false;
});

check('C6 固化文案 = 「已答：+ 掩码摘要 + 长度」，且零明文', () => {
  const txt = one('#msg-g-ask-key').querySelector('.ask-fixed-text').textContent;
  return txt.startsWith('已答：') && txt.includes('掩码') && txt.includes('零明文')
    && txt.includes(String(SECRET_SENTINEL.length)) && ninc(txt, SECRET_SENTINEL, '固化文案');
});

check('C7 固化带时间戳（HH:MM:SS）', () => {
  const ts = one('#msg-g-ask-key').querySelector('.ask-fixed-time').textContent;
  return /^\d{2}:\d{2}:\d{2}$/.test(ts);
});

check('C8 已固化卡不可二次回答；已答卡取消也被拒（只固化不撤销）', () =>
  demo.answerAsk('msg-g-ask-key', 'second') === false
  && demo.cancelAsk('msg-g-ask-permform') === false);

/* ── D. auth / consent 卡：批准 / 拒绝 → 固化 ────────────────────── */
check('D1 授权卡含批准 / 拒绝 + 范围 + 后果预演；consent 卡另有不可逆性说明', () => {
  const card = one('#msg-g-auth-site-2');
  const consent = one('#msg-g-consent-perm');
  return card.querySelectorAll('[data-act="approve"]').length >= 1
    && card.querySelectorAll('[data-act="reject"]').length >= 1
    && !!card.querySelector('.auth-scope') && !!card.querySelector('.auth-preview')
    && !!consent.querySelector('.auth-irreversible');
});

check('D2 consent 卡是 auth 卡的变体（零新增卡类型）', () => {
  const consent = one('#msg-g-consent-perm');
  return consent.tagName === 'LI' && consent.getAttribute('data-msg-type') === 'auth'
    && consent.getAttribute('data-consent') === 'browser-perm';
});

check('D3 S2 操作前：auth-site-2 待批，操作按钮可见、固化区隐藏', () => {
  demo.setScene('S2');
  const card = one('#msg-g-auth-site-2');
  eq(card.getAttribute('data-decision'), 'pending');
  return card.querySelector('.auth-actions').hidden === false && card.querySelector('.auth-fixed').hidden === true;
});

check('D4 批准后固化 + 自动续流：data-decision=approved，续流卡从隐藏变为可见', () => {
  const before = isVisible(one('#msg-g-next-repick'));
  eq(demo.grantSite('s2'), true, 'grantSite 返回值');
  const card = one('#msg-g-auth-site-2');
  eq(card.getAttribute('data-decision'), 'approved');
  const ts = card.querySelector('.auth-fixed-time').textContent;
  return before === false
    && card.querySelector('.auth-actions').hidden === true
    && card.querySelector('.auth-fixed').hidden === false
    && /^\d{2}:\d{2}:\d{2}$/.test(ts)
    && isVisible(one('#msg-g-next-repick'))
    && isVisible(one('#msg-g-ref-ok'));
});

check('D5 拒绝也固化：consent 卡拒绝 → 已拒绝（不执行）+ 拒绝后仍有可达 next', () => {
  eq(demo.decideAuth('msg-g-consent-perm', 'rejected'), true, 'decideAuth 返回值');
  const card = one('#msg-g-consent-perm');
  eq(card.getAttribute('data-decision'), 'rejected');
  return card.querySelector('.auth-fixed-text').textContent.includes('已拒绝');
});

check('D6 已决策授权卡不可重复决策', () =>
  demo.decideAuth('msg-g-auth-site-2', 'rejected') === false
  && demo.decideAuth('msg-g-consent-perm', 'approved') === false);

/* ── E. 法八 值不入流（零明文） ──────────────────────────────────── */
check('E1 哨兵值不出现在聊天流（#stream）文本里', () => {
  ninc(one('#stream').textContent, SECRET_SENTINEL, '#stream');
  ninc(one('#stream').textContent, SECRET_SENTINEL.slice(0, 12), '#stream 前缀');
  return true;
});

check('E2 digest / 审计零明文：哨兵不出现，且 digest 只出现掩码 ••••••', () => {
  const list = one('#digest-list');
  ninc(list.textContent, SECRET_SENTINEL, '#digest-list');
  inc(list.textContent, '••••••', '#digest-list 掩码');
  return list.querySelectorAll('[data-digest-op]').length >= 3;
});

check('E3 全 #panel 元素属性里零出现（值不落任何 data-* / value）', () => {
  const leak = walk(one('#panel'), []).filter((el) => {
    const vals = Object.values(el.attributes || {});
    return vals.some((v) => String(v).indexOf(SECRET_SENTINEL) !== -1);
  });
  if (leak.length) throw new Error('属性泄漏：' + leak.length + ' 个元素');
  return true;
});

check('E4 提交后掩码输入被清空（值不留痕）', () =>
  one('#ask-g-key-input').value === '');

check('E5 掩码输入不回显：type=password + 无 value 属性 + autocomplete=off', () => {
  const input = one('#ask-g-key-input');
  return input.getAttribute('type') === 'password'
    && !input.hasAttribute('value')
    && input.getAttribute('autocomplete') === 'off';
});

check('E6 S4 的已答掩码卡：固化文案含掩码 / 零明文，且无任何明文片段', () => {
  const txt = one('#msg-g-ask-key2').querySelector('.ask-fixed-text').textContent;
  return txt.includes('掩码') && txt.includes('零明文') && ninc(txt, 'sk-', '固化文案');
});

check('E7 命令记录卡以掩码出现（法八：留痕的是事实，不是值）', () => {
  const cmd = one('#msg-g-cmd-llm').querySelector('.cmd-line').textContent;
  return cmd.includes('--key ••••••') && ninc(cmd, 'sk-', '命令记录');
});
/* ── F. 法七 一切操作皆 Next，禁止死端 ───────────────────────────── */
check('F1 阻塞终态登记表：5 类（未授权 / 未配置 / 权限缺失 / 绑定失效 / 引用失效）', () => {
  eq(blocking.length, 5, '阻塞态数');
  eq(blocking.map(b => b.state).join(','),
    'llm-unconfigured,site-unauthorized,perm-missing,binding-stale,ref-stale');
  return true;
});

check('F2 法七主断言：每个阻塞终态在所属场景内都有可达 next（机核 checkNoDeadEnds）', () => {
  const rows = demo.checkNoDeadEnds();
  eq(rows.length, 5, '机核行数');
  const dead = rows.filter(r => !r.ok);
  if (dead.length) throw new Error('死端：' + dead.map(d => d.state).join(', '));
  return true;
});

check('F3 法七逐场景复核：5 类阻塞在各自场景下 next 可见（内联或紧随）', () => {
  for (const b of blocking) {
    demo.setScene(b.scenes[0]);
    const card = one('#' + b.cardId);
    const nextEl = one('#' + b.nextId);
    const inline = visibleNextCount(card);
    const viaNext = visibleNextCount(nextEl);
    const sib = nextVisibleSibling(card);
    const viaSib = sib ? visibleNextCount(sib) : 0;
    if (!(inline > 0 || viaNext > 0 || viaSib > 0)) {
      throw new Error(b.state + ' 在 ' + b.scenes[0] + ' 是死端');
    }
  }
  return true;
});

check('F4 ✖ 行不裸奔（未授权）：✖ 行内即含恢复 next（op.authorize）', () => {
  demo.setScene('S2');
  const row = one('#msg-g-error-unauth');
  const chip = row.querySelector('[data-act="next"][data-op="op.authorize"]');
  return !!chip && isVisible(chip)
    && row.querySelector('.err-line').textContent.includes('未授权站点 https://open.bigmodel.cn');
});

check('F5 ✖ 行紧随恢复 next：✖ 之后可见的下一个兄弟是推荐卡且含恢复 next', () => {
  demo.setScene('S2');
  const row = one('#msg-g-error-unauth');
  const sib = nextVisibleSibling(row);
  return !!sib && sib.getAttribute('data-msg-type') === 'nextstep'
    && sib.querySelectorAll('[data-act="next"][data-op="op.authorize"]').length >= 1
    && isVisible(sib);
});

check('F6 ✖ 行不裸奔（绑定失效 · S6）：行内恢复 next = op.rebind，紧随推荐卡也在', () => {
  demo.setScene('S6');
  const row = one('#msg-g-error-binding');
  const inline = row.querySelector('[data-act="next"][data-op="op.rebind"]');
  const sib = nextVisibleSibling(row);
  return !!inline && isVisible(inline) && !!sib
    && sib.getAttribute('data-msg-type') === 'nextstep' && visibleNextCount(sib) >= 1;
});

check('F7 阻塞态「LLM 未配置」（S1）：可见后继是含 next 的推荐卡', () => {
  demo.setScene('S1');
  const row = one('#msg-g-sys-llm-missing');
  const sib = nextVisibleSibling(row);
  return !!sib && sib.getAttribute('data-msg-type') === 'nextstep'
    && sib.querySelectorAll('[data-act="next"][data-op="op.llm-config"]').length === 1;
});

check('F8 阻塞态「权限缺失」（S3）：推荐卡自身即带恢复 next（op.perm.request）', () => {
  demo.setScene('S3');
  const card = one('#msg-g-next-perm');
  const chip = card.querySelector('[data-act="next"][data-op="op.perm.request"]');
  return !!chip && isVisible(chip) && visibleNextCount(card) >= 2;
});

check('F9 阻塞态「引用全失效」（S6）：卡内含 ≥2 个可见恢复 next（op.pick / op.describe）', () => {
  demo.setScene('S6');
  const card = one('#msg-g-ref-stale');
  eq(card.getAttribute('data-ref-state'), 'stale');
  const nexts = card.querySelectorAll('[data-act="next"][data-op]');
  const visible = nexts.filter(isVisible);
  return nexts.length >= 2 && visible.length >= 2
    && visible.some(n => n.getAttribute('data-op') === 'op.pick')
    && visible.some(n => n.getAttribute('data-op') === 'op.describe');
});

check('F10 拒绝不是死端：权限被拒 → 回执固化 + 「改用描述继续」可达 next 入流', () => {
  demo.setScene('S3');
  eq(demo.resolvePerm(false), true, 'resolvePerm(false)');
  const tool = one('#msg-g-tool-perm');
  const denyNext = one('#msg-g-next-perm-deny');
  return tool.getAttribute('data-tool-state') === 'denied'
    && tool.querySelector('.tool-out').textContent.includes('已拒绝')
    && isVisible(denyNext) && visibleNextCount(denyNext) >= 2;
});

check('F11 批准也固化：权限获准 → tool 卡结算 ok + 系统行回执入流', () => {
  demo.setScene('S3');
  eq(demo.resolvePerm(true), true, 'resolvePerm(true)');
  const tool = one('#msg-g-tool-perm');
  return tool.getAttribute('data-tool-state') === 'ok'
    && tool.querySelector('.tool-out').textContent.includes('已授予')
    && isVisible(one('#msg-g-sys-perm-ok'));
});

/* ── G. chip ↔ op 绑定 + op 管线四态 ─────────────────────────────── */
check('G1 chip 契约：每个 [data-act="next"] 都带 opId（data-op）与 data-command', () => {
  const chips = $$('#panel [data-act="next"]');
  if (chips.length < 20) throw new Error('chip 数量异常：' + chips.length);
  const bad = chips.filter(c => !c.getAttribute('data-op') || !c.getAttribute('data-command'));
  if (bad.length) throw new Error('缺 opId/command 的 chip：' + bad.length + ' 个');
  return true;
});

check('G2 每个 chip 的 opId 都在 op 清单里（无悬空 opId）', () => {
  const known = new Set(ops.map(o => o.opId));
  const bad = $$('#panel [data-act="next"]')
    .map(c => c.getAttribute('data-op')).filter(opId => !known.has(opId));
  if (bad.length) throw new Error('悬空 opId：' + [...new Set(bad)].join(', '));
  return true;
});

check('G3 op 清单 = 首批 8 个，opId 与设计一致', () => {
  eq(ops.length, 8, 'op 数');
  eq(ops.map(o => o.opId).join(','),
    'op.authorize,op.rebind,op.llm-config,op.perm.request,op.revoke,op.pick,op.describe,op.help');
  return true;
});

check('G4 每个 op 元数据完整：风险级 / params / consent / execute / receipt', () => {
  const bad = ops.filter(o => !o.risk || !o.params || !o.consent || !o.receipt || typeof o.execute !== 'function');
  if (bad.length) throw new Error('元数据缺失：' + bad.map(o => o.opId).join(', '));
  return true;
});

check('G5 op 管线：5 态齐全，params / consent / execute / receipt 四态各有场景与证据卡', () => {
  const pipe = reg.pipeline();
  eq(Object.keys(pipe).length, 5, '管线态数');
  ['params', 'consent', 'execute', 'receipt'].forEach((stage) => {
    const s = pipe[stage];
    if (!s) throw new Error('缺 ' + stage + ' 态');
    if (!s.scenes || !s.scenes.trim()) throw new Error(stage + ' 无场景');
    if (!s.evidence || !one('#' + s.evidence)) throw new Error(stage + ' 证据卡不存在：' + s.evidence);
  });
  return true;
});

check('G6 管线落在既有卡类型上：params=askuser 卡，consent=auth/askuser 卡（零新增卡类型）', () => {
  const params = $$('#panel [data-op-stage="params"]');
  const consent = $$('#panel [data-op-stage="consent"]');
  if (!params.length || !consent.length) throw new Error('缺 params/consent 承载卡');
  return params.every(c => c.getAttribute('data-msg-type') === 'askuser')
    && consent.every(c => ['auth', 'askuser'].indexOf(c.getAttribute('data-msg-type')) !== -1);
});

check('G7 handleCardAction 查表分发：8 个 op 全部 true，未知 opId 返回 false', () => {
  for (const op of ops) {
    if (demo.runOp(op.opId) !== true) throw new Error(op.opId + ' 分发失败');
  }
  return demo.runOp('op.not-registered') === false;
});

check('G8 chip 点击走真实事件路径 → 进入 op 分发（is-chosen + data-op-state=dispatched）', () => {
  const chip = one('#msg-g-next-llm [data-act="next"][data-op="op.llm-config"]');
  chip.click();
  return chip.classList.contains('is-chosen') && chip.getAttribute('data-op-state') === 'dispatched';
});
/* ── H. NextProvider 注册表视察器（anything-is-plugin 可视化） ─────── */
check('H1 视察器渲染了全部注册表项（#reg-list li 数 = registry 数）', () => {
  eq(reg.count(), 8, 'registry 初始数');
  eq($$('#reg-list li').length, reg.count(), '#reg-list li 数');
  return true;
});

check('H2 视察器指标：registry 8 / op 清单 8 / diff 0', () => {
  eq(one('#reg-count').textContent, '8');
  eq(one('#reg-ops').textContent, '8');
  eq(one('#reg-diff').textContent, '0');
  return true;
});

check('H3 与场景联动（S2）：site.unauthorized 为活跃 provider，其 chips 指向 op.authorize', () => {
  demo.setScene('S2');
  const item = one('#reg-list li[data-provider="site.unauthorized"]');
  const active = $$('#reg-list li[data-active="true"]');
  return !!item && item.getAttribute('data-active') === 'true'
    && !!item.querySelector('.reg-chip[data-op="op.authorize"]')
    && String(one('#reg-active').textContent) === String(active.length)
    && active.length >= 2;
});

check('H4 多 next 仲裁（S6）：活跃 provider ≥5 且按「恢复(0) 优先」排序；仲裁卡首 chip 为恢复项', () => {
  demo.setScene('S6');
  const active = $$('#reg-list li[data-active="true"]');
  const firstName = active[0] && active[0].getAttribute('data-provider');
  const firstPri = active[0] && active[0].getAttribute('data-pri');
  const chip = one('#msg-g-next-arbitrate [data-act="next"]');
  return active.length >= 5 && firstPri === '0'
    && firstName === 'site.unauthorized'
    && one('#reg-ctx').textContent.indexOf('S6') === 0
    && chip.getAttribute('data-op') === 'op.authorize'
    && chip.getAttribute('data-pri') === '0';
});

check('H5 新增操作 = 注册插件：N→N+1，handleCardAction 分发器 diff 恒为 0', () => {
  const fpBefore = reg.fingerprint();
  const before = reg.count();
  const r = demo.registerDemoProvider();
  return r.count === before + 1 && r.diff === 0
    && String(one('#reg-count').textContent) === String(before + 1)
    && eq(one('#reg-diff').textContent, '0') === true
    && reg.diff() === 0 && reg.fingerprint() === fpBefore
    && $$('#reg-list li').length === before + 1;
});

check('H6 op 管线状态与场景联动（S2 → consent 态高亮；S6 → next 态高亮）', () => {
  demo.setScene('S2');
  const s2consent = one('#op-pipeline [data-stage="consent"]').getAttribute('data-live');
  demo.setScene('S6');
  const s6next = one('#op-pipeline [data-stage="next"]').getAttribute('data-live');
  return s2consent === 'true' && s6next === 'true';
});

check('H7 注册表项契约完整：{id, when, chips} 且 chips 全是合法 opId', () => {
  const known = new Set(ops.map(o => o.opId));
  const bad = reg.providers.filter(p => !p.id || typeof p.when !== 'function'
    || !Array.isArray(p.chips) || !p.chips.length || p.chips.some(c => !known.has(c)));
  if (bad.length) throw new Error('非法 provider：' + bad.map(p => p.id).join(', '));
  return true;
});

/* ── I. 场景切换 / 密度 / 宽度主题 / 风险 chip / 视图 ────────────── */
check('I1 场景切换器存在 7 个场景（S1~S7）', () => {
  const radios = $$('#scene-switch [role="radio"]');
  eq(radios.length, 7, '场景 radio 数');
  eq(radios.map(r => r.getAttribute('data-scene-set')).join(','), 'S1,S2,S3,S4,S5,S6,S7');
  return true;
});

/* ── I2. 侧栏宽度：可拖动分隔条（280–640，ARIA separator + 键盘 + clamp） ── */

check('I2a 宽度分隔条存在：侧栏左缘 role=separator + ARIA 语义五件套 + tabindex=0', () => {
  const sep = one('#panel-splitter');
  if (!sep) throw new Error('缺 #panel-splitter');
  eq(sep.getAttribute('role'), 'separator', 'role');
  eq(sep.getAttribute('aria-orientation'), 'vertical', 'aria-orientation');
  eq(sep.getAttribute('aria-label'), '拖动调整侧栏宽度', 'aria-label');
  eq(sep.getAttribute('aria-valuemin'), '280', 'aria-valuemin');
  eq(sep.getAttribute('aria-valuemax'), '640', 'aria-valuemax');
  eq(sep.getAttribute('aria-valuenow'), '400', 'aria-valuenow（初始）');
  eq(sep.getAttribute('aria-valuetext'), '400px', 'aria-valuetext（初始）');
  eq(sep.getAttribute('tabindex'), '0', 'tabindex（键盘可达）');
  /* 位置 = 侧栏左缘：在 .browser-body 里紧邻 #sidebar 之前，且不在 #panel 内 */
  const kids = one('.browser-body').children.map(c => c.id || c.className).join('|');
  eq(kids, 'page-area|panel-splitter|sidebar', '.browser-body 子元素顺序');
  eq($$('#panel #panel-splitter').length, 0, '分隔条不应落在 #panel 内（不计入密度预算）');
  return true;
});

check('I2b 拖动分隔条实时改写 --panel-w：向左拖 60px → 460px（读数 / aria-valuenow 同步）', () => {
  const sep = one('#panel-splitter');
  demo.setWidth(400);
  sep.dispatchEvent(makePointerEvent('pointerdown', sep, { clientX: 700, pointerId: 1, button: 0 }));
  const dragging = sep.getAttribute('data-dragging');
  sep.dispatchEvent(makePointerEvent('pointermove', sep, { clientX: 640, pointerId: 1 }));
  const during = one('#panel').getAttribute('data-width');
  const varValue = widthApi.panelVar();
  const now = sep.getAttribute('aria-valuenow');
  const readout = one('#width-readout-value').textContent;
  sep.dispatchEvent(makePointerEvent('pointerup', sep, { clientX: 640, pointerId: 1 }));
  const afterDragging = sep.hasAttribute('data-dragging');
  const snap = demo.snapshots().width;
  eq(during, '460', '拖动中 #panel[data-width]');
  eq(varValue, '460px', ':root --panel-w');
  eq(now, '460', 'aria-valuenow（随拖动实时更新）');
  eq(readout, '460px', '实时读数');
  eq(dragging, 'true', '拖动中 data-dragging');
  eq(afterDragging, false, '拖动结束后 data-dragging 清除');
  eq(snap, '460', 'state.width 与拖动结果一致');
  demo.setWidth(400);
  return true;
});

check('I2c clamp 生效：拖到 100 → 280（min）；拖到 900 → 640（max）', () => {
  const sep = one('#panel-splitter');
  demo.setWidth(400);
  sep.dispatchEvent(makePointerEvent('pointerdown', sep, { clientX: 400, pointerId: 2 }));
  sep.dispatchEvent(makePointerEvent('pointermove', sep, { clientX: 700 })); /* 400 - 300 = 100 → 280 */
  const lo = one('#panel').getAttribute('data-width');
  sep.dispatchEvent(makePointerEvent('pointerup', sep, { clientX: 700, pointerId: 2 }));

  sep.dispatchEvent(makePointerEvent('pointerdown', sep, { clientX: 400, pointerId: 3 }));
  sep.dispatchEvent(makePointerEvent('pointermove', sep, { clientX: -100 })); /* 400 + 500 = 900 → 640 */
  const hi = one('#panel').getAttribute('data-width');
  sep.dispatchEvent(makePointerEvent('pointerup', sep, { clientX: -100, pointerId: 3 }));

  eq(lo, '280', '最小边界 clamp');
  eq(hi, '640', '最大边界 clamp');
  eq(widthApi.clamp(279), 280, 'clamp(279)');
  eq(widthApi.clamp(641), 640, 'clamp(641)');
  eq(widthApi.clamp(401.4), 401, 'clamp 取整（步进 1px）');
  eq(widthApi.clamp(NaN), 400, 'clamp(NaN) 回默认 400');
  eq(widthApi.min, 280, '范围下限常量');
  eq(widthApi.max, 640, '范围上限常量');
  demo.setWidth(400);
  return true;
});

check('I2d 键盘可达：← +10 / → −10 / Home → 280 / End → 640', () => {
  const sep = one('#panel-splitter');
  demo.setWidth(400);
  sep.dispatchEvent(makePointerEvent('keydown', sep, { key: 'ArrowLeft' }));
  const left = one('#panel').getAttribute('data-width');
  sep.dispatchEvent(makePointerEvent('keydown', sep, { key: 'ArrowRight' }));
  const right = one('#panel').getAttribute('data-width');
  sep.dispatchEvent(makePointerEvent('keydown', sep, { key: 'Home' }));
  const home = one('#panel').getAttribute('data-width');
  sep.dispatchEvent(makePointerEvent('keydown', sep, { key: 'End' }));
  const end = one('#panel').getAttribute('data-width');
  const nowEnd = sep.getAttribute('aria-valuenow');
  eq(left, '410', '← 加宽 10px');
  eq(right, '400', '→ 收窄 10px');
  eq(home, '280', 'Home → 最小');
  eq(end, '640', 'End → 最大');
  eq(nowEnd, '640', 'aria-valuenow 跟随键盘');
  eq(widthApi.step, 10, '键盘步进常量');
  demo.setWidth(400);
  return true;
});

check('I2e 双击复位 400：任意宽度 → dblclick → 400px（读数 / aria 同步）', () => {
  const sep = one('#panel-splitter');
  demo.setWidth(620);
  eq(one('#panel').getAttribute('data-width'), '620', '复位前宽度');
  sep.dispatchEvent(makePointerEvent('dblclick', sep, {}));
  eq(one('#panel').getAttribute('data-width'), '400', '双击后 #panel[data-width]');
  eq(one('#width-readout-value').textContent, '400px', '双击后读数');
  eq(sep.getAttribute('aria-valuenow'), '400', '双击后 aria-valuenow');
  eq(widthApi.def, 400, '默认值常量');
  return true;
});

check('I2f 宽度 radio 组零残留：#width-switch / [data-width-set] / 宽度 radiogroup 全为 0', () => {
  eq($$('#width-switch').length, 0, '#width-switch 残留数');
  eq($$('[data-width-set]').length, 0, '[data-width-set] 残留数');
  eq($$('#lb-width').length, 0, '原宽度 radiogroup 标签残留数');
  eq($$('nav.demo-bar [role="radiogroup"]').length, 2, '演示台 radiogroup 仅剩场景 + 主题');
  eq($$('nav.demo-bar [role="radiogroup"]')
    .map(g => g.getAttribute('id')).join(','), 'scene-switch,theme-switch', 'radiogroup 归属');
  eq($$('[role="radio"]').length, 10, '全局 role=radio 数（7 场景 + 3 主题）');
  const keys = $$('[role="radio"]')
    .map(r => r.getAttribute('data-scene-set') || r.getAttribute('data-theme-set')).join(',');
  eq(keys, 'S1,S2,S3,S4,S5,S6,S7,auto,light,dark', 'radio 归属（仅场景 + 主题）');
  ninc(html, 'data-width-set', '设计稿源码');
  ninc(html, 'width-switch', '设计稿源码');
  return true;
});

check('I2g 实时读数元素存在且随宽度联动（拖动 / 键盘 / 复位三路都更新）', () => {
  const wrap = one('#width-readout');
  const out = one('#width-readout-value');
  if (!wrap || !out) throw new Error('缺 #width-readout / #width-readout-value');
  eq(wrap.getAttribute('role'), 'status', '读数容器 role');
  const samples = [];
  demo.setWidth(300);
  samples.push(out.textContent);
  demo.setWidth(640);
  samples.push(out.textContent);
  demo.setWidth(400);
  samples.push(out.textContent);
  eq(samples.join(','), '300px,640px,400px', '读数三档采样');
  inc(wrap.textContent, '拖动左侧分隔条', '读数提示文案');
  inc(wrap.textContent, '←/→', '读数键盘提示');
  return true;
});

check('I2h 连续宽度契约：setWidth 越界被 clamp，窄屏兜底改由 data-narrow（≤360px）触发', () => {
  const sep = one('#panel-splitter');
  demo.setWidth(9999);
  const hi = one('#panel').getAttribute('data-width');
  const hiNarrow = one('#panel').getAttribute('data-narrow');
  demo.setWidth(300);
  const lo = one('#panel').getAttribute('data-width');
  const loNarrow = one('#panel').getAttribute('data-narrow');
  const valueText = sep.getAttribute('aria-valuetext');
  demo.setWidth(400);
  eq(hi, '640', 'setWidth(9999) → 640');
  eq(hiNarrow, 'false', '宽档不触发窄屏兜底');
  eq(lo, '300', 'setWidth(300) 生效（连续宽度，非档位）');
  eq(loNarrow, 'true', '≤360px 触发窄屏兜底');
  eq(valueText, '300px', 'aria-valuetext 同步');
  eq(one('#panel').getAttribute('data-narrow'), 'false', '回到 400px 后兜底关闭');
  eq(density().panelWidthVar, '400', 'panelWidthVar 口径仍读 #panel[data-width]');
  eq(widthApi.current(), 400, 'widthApi.current()');
  return true;
});

check('I3 双主题切换器 + 工具栏主题按钮；切到深色真实生效，切回跟随系统移除属性', () => {
  const radios = $$('#theme-switch [role="radio"]');
  eq(radios.length, 3, '主题 radio 数');
  eq(radios.map(r => r.getAttribute('data-theme-set')).join(','), 'auto,light,dark');
  demo.setTheme('dark');
  const dark = document.documentElement.getAttribute('data-theme') === 'dark';
  demo.setTheme('auto');
  return !!one('#region-toolbar #theme-toggle') && dark
    && !document.documentElement.hasAttribute('data-theme');
});

check('I4 S1 默认屏密度：工具栏 5 / 状态栏 0 / 合计 5 ≤7，chips ≤3', () => {
  demo.setScene('S1');
  const d = density();
  eq(d.scene, 'S1', '当前场景');
  return d.toolbar === 5 && d.statusbar === 0 && d.total === 5 && d.chips <= 3
    && one('#m-verdict').getAttribute('class') === 'm-ok';
});

check('I5 S6 风险稳态密度：工具栏 5 / 状态栏 2 / 合计 7 ≤7', () => {
  demo.setScene('S6');
  const d = density();
  return d.toolbar <= 5 && d.statusbar === 2 && d.total <= 7 && d.chips <= 3;
});

check('I6 法四（通用形式）：#panel 内所有可见 input/textarea 都在消息卡内（无常驻输入框）', () => {
  demo.setScene('S1');
  const bad = $$('#panel input, #panel textarea').filter(isVisible).filter((el) => {
    let n = el.parentNode;
    while (n && n.hasAttribute) {
      if (n.hasAttribute('data-msg-type')) return false;
      n = n.parentNode;
    }
    return true;
  });
  if (bad.length) throw new Error('常驻输入框 ' + bad.length + ' 个');
  return true;
});

check('I7 法一：工具栏与状态栏内不存在 ask-user / 授权 / 推荐类卡', () => {
  const forbidden = ['askuser', 'auth', 'nextstep'];
  return forbidden.every(t =>
    $$(`#region-toolbar [data-msg-type="${t}"]`).length === 0
    && $$(`#region-statusbar [data-msg-type="${t}"]`).length === 0);
});

check('I8 S7 全景：12 kind 同屏可见（含 5 过程卡）', () => {
  demo.setScene('S7');
  const missing = CARD_TYPES.filter(t => !$$(`[data-msg-type="${t}"]`).some(isVisible));
  if (missing.length) throw new Error('S7 未同屏的卡型：' + missing.join(', '));
  return true;
});

check('I9 风险 chip 永不折叠：点 chip → 内联详情 + 「本阶段不发命令、不改授权」', () => {
  demo.setScene('S6');
  const bar = one('#region-statusbar');
  const box = one('#risk-chips');
  const chips = $$('#risk-chips [data-risk]').filter(isVisible);
  if (bar.hidden !== false || box.hidden !== false) throw new Error('状态栏/风险容器被折叠');
  if (chips.length !== 2) throw new Error('可见风险 chip 数 = ' + chips.length);
  demo.focusRisk('ref');
  const detail = one('#risk-detail');
  const line = one('[data-risk-detail="ref"]');
  return detail.hidden === false && line.hidden === false
    && line.textContent.includes('本阶段不发命令、不改授权');
});

check('I10 L2 按需视图：打开审计（含 digest 演示）→ 流隐藏；返回后恢复', () => {
  demo.openView('audit');
  const opened = one('#view-layer').hidden === false && one('#stream').hidden === true
    && one('#view-audit').hidden === false && one('#view-title').textContent.includes('审计')
    && one('#view-audit').textContent.includes('digest');
  demo.closeView();
  return opened && one('#view-layer').hidden === true && one('#stream').hidden === false;
});
/* ── J. 死端对比表 / 演进表 / 架构区 ─────────────────────────────── */
check('J1 死端对比表存在且 ≥5 行（S2 前后逐环节判定）', () => {
  const table = one('#deadend-compare');
  if (!table) throw new Error('缺 #deadend-compare');
  const rows = table.querySelectorAll('tbody tr');
  return rows.length >= 5;
});

check('J2 死端对比表逐字保留真机缺陷与 G 的恢复项', () => {
  const txt = one('#deadend-compare').textContent;
  return inc(txt, '无一能解除', '对比表') && inc(txt, 'op.authorize', '对比表')
    && inc(txt, '死端', '对比表') && inc(txt, '页面侧零注入', '对比表');
});

check('J3 死端结论可机核：死端 1 → 0', () =>
  inc(one('#deadend-summary').textContent, '死端 1 → 0', '死端结论'));

check('J4 G 相对 F 的变化点 5 条（含 error 独立卡 + 12 kind 不动）', () => {
  const table = one('#change-table');
  const rows = table.querySelectorAll('tbody tr');
  const txt = table.textContent;
  return rows.length === 5 && inc(txt, 'error', '变化点表') && inc(txt, '12 kind', '变化点表');
});

check('J5 架构区：op 清单表 8 行 + 12 kind 表 12 行 + 注册表代码含 handleCardAction', () => {
  const opRows = one('#op-table').querySelectorAll('tbody tr');
  const kindRows = one('#kind-table').querySelectorAll('tbody tr');
  const code = one('#arch-section').querySelector('.codeblock').textContent;
  return opRows.length === 8 && kindRows.length === 12
    && inc(code, 'handleCardAction', '架构区代码') && inc(code, 'registry.push', '架构区代码');
});

/* ── K. 收尾：默认态复位 + 交付物硬约束 ─────────────────────────── */
check('K1 收尾：切回 S1 后密度仍 ≤7，且 5 类阻塞仍全部无死端', () => {
  demo.setScene('S1');
  const d = density();
  const rows = demo.checkNoDeadEnds();
  return d.scene === 'S1' && d.total <= 7 && d.toolbar <= 5 && rows.every(r => r.ok);
});

check('K2 零外链：无 <link> / 无外链 src / 无 @import / 单内联脚本', () => {
  if (/<link\b/i.test(html)) throw new Error('存在 <link>');
  if (/\bsrc\s*=\s*["']https?:/i.test(html)) throw new Error('存在外链 src');
  if (/@import/i.test(html)) throw new Error('存在 @import');
  if (/<script[^>]+src=/i.test(html)) throw new Error('存在外链脚本');
  eq((html.match(/<script/gi) || []).length, 1, '内联 script 数');
  return true;
});

check('K3 交付面完整：lang=zh-CN + 三区角色齐备 + 面板容器唯一', () => {
  return one('html').getAttribute('lang') === 'zh-CN'
    && $$('#panel').length === 1
    && one('#region-toolbar').getAttribute('role') === 'toolbar'
    && one('#region-stream').getAttribute('data-region') === 'stream'
    && one('#region-statusbar').getAttribute('role') === 'contentinfo';
});

/* ── L. 场景闭环补强（S1 / S4 / S5 + 场景键一致性） ────────────────── */
check('L1 S1 全链闭环：掩码配置 → 续流 1/3；授权 → 续流 3/3（引用卡），全程同一 #panel 内', () => {
  demo.setScene('S1');
  const S2 = 'sk-live-SECOND-SENTINEL-0b71c3';
  eq(demo.configureLLM(S2), true, 'configureLLM 返回值');
  const step1 = isVisible(one('#msg-g-tool-conn')) && isVisible(one('#msg-g-sys-llm-ok'))
    && isVisible(one('#msg-g-next-open'));
  eq(demo.grantSite('s1'), true, 'grantSite(s1) 返回值');
  const step2 = isVisible(one('#msg-g-next-repick')) && isVisible(one('#msg-g-ref-ok'))
    && isVisible(one('#msg-g-sys-auth-receipt'));
  ninc(one('#stream').textContent, S2, '#stream（第二次掩码提交）');
  return step1 && step2;
});

check('L2 S4 换厂商 / 改 Key：next → 厂商已答固化 → 掩码卡已答固化 → 回执系统行', () => {
  demo.setScene('S4');
  const next = one('#msg-g-next-switch [data-op="op.llm-config"]');
  const vendor = one('#msg-g-ask-vendor');
  const key = one('#msg-g-ask-key2');
  const receipt = one('#msg-g-sys-llm-receipt2');
  return !!next && isVisible(next)
    && vendor.getAttribute('data-answered') === 'true'
    && vendor.querySelector('.ask-fixed-text').textContent.includes('智谱 GLM')
    && key.getAttribute('data-answered') === 'true'
    && key.querySelector('.ask-fixed-text').textContent.includes('掩码')
    && isVisible(receipt) && receipt.textContent.includes('已更新');
});

check('L3 S5 管理操作也可 chat 发起：op.revoke 确认卡已答 + 回执 + 设置视图仍在（法六）', () => {
  demo.setScene('S5');
  const next = one('#msg-g-next-revoke [data-op="op.revoke"]');
  const confirm = one('#msg-g-ask-revoke');
  const receipt = one('#msg-g-sys-revoke');
  const notice = one('#msg-g-notice-settings');
  return !!next && isVisible(next)
    && confirm.getAttribute('data-answered') === 'true'
    && confirm.querySelector('.ask-fixed-text').textContent.includes('撤销站点授权')
    && isVisible(receipt) && receipt.textContent.includes('已撤销')
    && isVisible(notice) && notice.textContent.includes('设置')
    && !!one('#view-settings');
});

check('L4 data-scenes 取值全部合法（无笔误场景键）', () => {
  const bad = walk(one('#panel'), [])
    .filter(el => el.hasAttribute('data-scenes'))
    .map(el => el.getAttribute('data-scenes'))
    .flatMap(v => v.split(/\s+/))
    .filter(k => ['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7'].indexOf(k) === -1);
  if (bad.length) throw new Error('非法场景键：' + [...new Set(bad)].join(', '));
  return true;
});

/* ═════════════════════════════════════════════════════════════════════════
   4. 报告
   ═════════════════════════════════════════════════════════════════════════ */

const passed = results.filter(r => r.ok).length;
const failed = results.length - passed;

for (const r of results) {
  if (!r.ok) console.log(`  ✗ ${r.name}${r.detail ? '  —— ' + r.detail : ''}`);
}

console.log('');
console.log(`方案 G（option-g-all-in-next.html）DOM 垫片断言：${passed} passed / ${failed} failed`);
console.log(`（共 ${results.length} 条；覆盖三区结构继承 / 12 kind 继承 / 法七无死端 / 法八零明文 / chip↔op 绑定 / op 管线四态 / 注册表视察器与场景联动 / 死端对比表 / 密度 / 可拖动侧栏宽度（280–640 · ARIA separator · 键盘 · clamp）与主题）`);

process.exit(failed === 0 ? 0 : 1);
