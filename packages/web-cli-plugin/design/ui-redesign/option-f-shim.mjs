#!/usr/bin/env node
/**
 * option-f-shim.mjs
 * ───────────────────────────────────────────────────────────────────────────
 * 方案 F（option-f-chat-stream.html）的极简 Node DOM 垫片 + 结构/交互断言。
 *
 * 为什么需要它：本稿是零依赖自包含单文件，靠浏览器打开才能验证交互。
 * 这个脚本用 ~400 行手写 DOM 垫片（解析 + 选择器子集 + 事件冒泡）把 HTML
 * 加载进 Node，在同一条真实点击/调用路径上断言三区结构、7 类消息卡、
 * 问答与授权的「操作前 → 操作后固化」、系统事件时间戳、密度预算、
 * 宽度与主题切换器、以及「风险 chip 永不折叠」。
 *
 * 用法：node option-f-shim.mjs        （退出码 0 = 全通过，1 = 有失败）
 * 依赖：仅 Node 内置 fs / path / url / vm。不联网、不装包。
 */

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const HTML_PATH = path.join(HERE, 'option-f-chat-stream.html');

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
    this.style = {
      setProperty: () => {},
      removeProperty: () => {},
      getPropertyValue: () => ''
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
      vm.runInContext(code, sandbox, { filename: `option-f-inline-${idx}.js` });
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
const isVisible = sandbox.__isVisible;
const $$ = (sel) => document.querySelectorAll(sel);
const one = (sel) => document.querySelector(sel);

/* ── A. 三区结构（顺序 / 语义 / role） ────────────────────────────── */
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

check('A6 消息流本体是 ol[role=log]（正序、追加）', () => {
  const el = one('#stream');
  return !!el && el.tagName === 'OL' && el.getAttribute('role') === 'log';
});

/* ── B. 7 类消息卡样例 ────────────────────────────────────────────── */
const CARD_TYPES = ['ai', 'user', 'nextstep', 'askuser', 'auth', 'system', 'ref'];
check('B1 7 类消息卡样例全部存在（ai/user/nextstep/askuser/auth/system/ref）', () => {
  const missing = CARD_TYPES.filter(t => $$(`[data-msg-type="${t}"]`).length === 0);
  if (missing.length) throw new Error('缺失卡型：' + missing.join(', '));
  return true;
});

check('B2 每类卡都挂在流（#stream）的 li 上', () => {
  for (const t of CARD_TYPES) {
    const cards = $$(`#stream [data-msg-type="${t}"]`);
    if (!cards.length) throw new Error(t + ' 无样例');
    if (!cards.every(c => c.tagName === 'LI')) throw new Error(t + ' 样例不是 li');
  }
  return true;
});

check('B3 AI 答复卡支持富文本（编号列表 / 代码 / 表格摘要）', () => {
  const rich = one('#msg-richtext');
  return !!rich && !!rich.querySelector('ol') && !!rich.querySelector('code') && !!rich.querySelector('table');
});

check('B4 下一步推荐卡含可点 chips（chips 即指令）', () => {
  const card = one('#msg-welcome-next');
  const chips = card.querySelectorAll('[data-act="next"]');
  return chips.length >= 1 && chips.every(c => !c.hidden);
});

/* ── C. ask-user 卡：结构 + 操作前 → 操作后固化 ───────────────────── */
check('C1 ask-user text 型卡含卡内输入框（输入按需出现，不在工具栏）', () => {
  const card = one('#ask-1');
  eq(card.getAttribute('data-ask-kind'), 'text');
  return !!card.querySelector('input.ask-input');
});

check('C2 ask-user choice 型卡含选项按钮组（≥3 项）', () => {
  const card = one('#ask-2');
  eq(card.getAttribute('data-ask-kind'), 'choice');
  return card.querySelectorAll('[data-act="choose"]').length >= 3;
});

check('C3 ask-user 卡含「取消」入口与「不代填默认值」说明', () => {
  const card = one('#ask-1');
  const cancel = card.querySelector('[data-act="cancel"]');
  return !!cancel && card.textContent.includes('不代填默认值');
});

check('C4 choice 型末项为「其他…（我来描述）」且兜底输入默认收起', () => {
  const card = one('#ask-2');
  const other = card.querySelector('[data-act="choose-other"]');
  const box = card.querySelector('.ask-other');
  return !!other && !!box && box.hidden === true;
});

check('C5 操作前：ask-1 未答，表单可见、固化区隐藏', () => {
  const card = one('#ask-1');
  eq(card.getAttribute('data-answered'), 'false');
  return card.querySelector('.ask-form').hidden === false && card.querySelector('.ask-fixed').hidden === true;
});

check('C6 回答后固化：data-answered=true，表单收起、固化区显示', () => {
  const ok = demo.answerAsk('ask-1', '保留英文原词，首次出现给中文');
  eq(ok, true, 'answerAsk 返回值');
  const card = one('#ask-1');
  eq(card.getAttribute('data-answered'), 'true');
  return card.querySelector('.ask-form').hidden === true && card.querySelector('.ask-fixed').hidden === false;
});

check('C7 固化文案含「已答：+ 回答内容」', () => {
  const txt = one('#ask-1').querySelector('.ask-fixed-text').textContent;
  return txt.startsWith('已答：') && txt.includes('保留英文原词');
});

check('C8 固化带时间戳（HH:MM:SS）', () => {
  const ts = one('#ask-1').querySelector('.ask-fixed-time').textContent;
  return /^\d{2}:\d{2}:\d{2}$/.test(ts);
});

check('C9 已固化卡不可二次回答（只固化不撤销）', () =>
  demo.answerAsk('ask-1', '换个答案') === false);

check('C10 取消也留痕：已取消（不代填默认值）', () => {
  eq(demo.cancelAsk('ask-3'), true, 'cancelAsk 返回值');
  const card = one('#ask-3');
  eq(card.getAttribute('data-answered'), 'cancelled');
  const txt = card.querySelector('.ask-fixed-text').textContent;
  return txt.includes('已取消') && txt.includes('不代填默认值') && card.querySelector('.ask-fixed').hidden === false;
});

check('C11 场景 S3 里 AI 编号提问 → 已答固化 → 追问 的链条都在流中', () => {
  const s3 = ['#msg-ask-intro', '#ask-0', '#msg-user-1', '#msg-ask-follow', '#ask-2'];
  if (!s3.every(id => !!one(id))) return false;
  const answered = one('#ask-0');
  eq(answered.getAttribute('data-answered'), 'true', 'ask-0 状态');
  return answered.querySelector('.ask-fixed').hidden === false
    && answered.querySelector('.ask-fixed-text').textContent.includes('页面原地翻译');
});

/* ── D. 授权卡：批准 / 拒绝 + 固化 ────────────────────────────────── */
check('D1 授权卡含批准与拒绝按钮，且含范围与后果预演', () => {
  const card = one('#auth-1');
  const approve = card.querySelectorAll('[data-act="approve"]');
  const reject = card.querySelectorAll('[data-act="reject"]');
  return approve.length >= 1 && reject.length >= 1
    && !!card.querySelector('.auth-scope') && !!card.querySelector('.auth-preview');
});

check('D2 操作前：auth-1 待批，操作按钮可见、固化区隐藏', () => {
  const card = one('#auth-1');
  eq(card.getAttribute('data-decision'), 'pending');
  return card.querySelector('.auth-actions').hidden === false && card.querySelector('.auth-fixed').hidden === true;
});

check('D3 批准后固化：data-decision=approved，操作按钮收起', () => {
  eq(demo.decideAuth('auth-1', 'approved'), true, 'decideAuth 返回值');
  const card = one('#auth-1');
  eq(card.getAttribute('data-decision'), 'approved');
  return card.querySelector('.auth-actions').hidden === true && card.querySelector('.auth-fixed').hidden === false;
});

check('D4 批准固化文案含「已批准」+ 时间戳 + 审计入口', () => {
  const card = one('#auth-1');
  const txt = card.querySelector('.auth-fixed-text').textContent;
  const ts = card.querySelector('.auth-fixed-time').textContent;
  const audit = card.querySelector('.auth-fixed [data-command="查看审计"]');
  return txt.includes('已批准') && /^\d{2}:\d{2}:\d{2}$/.test(ts) && !!audit;
});

check('D5 拒绝也固化：已拒绝（不执行）', () => {
  eq(demo.decideAuth('auth-3', 'rejected'), true, 'decideAuth 返回值');
  const card = one('#auth-3');
  eq(card.getAttribute('data-decision'), 'rejected');
  return card.querySelector('.auth-fixed-text').textContent.includes('已拒绝');
});

check('D6 已决策授权卡不可重复决策', () =>
  demo.decideAuth('auth-1', 'rejected') === false);

check('D7 授权两态对比：已批准的 auth-2 保留固化区（旧卡不消失）', () => {
  const card = one('#auth-2');
  return card.getAttribute('data-decision') === 'approved'
    && card.querySelector('.auth-fixed').hidden === false;
});

/* ── E. 系统事件行 + 引用失效 / 重拾 ──────────────────────────────── */
check('E1 系统事件行带时间戳（HH:MM:SS）且 ≥3 条', () => {
  const rows = $$('[data-msg-type="system"]');
  if (rows.length < 3) throw new Error('系统事件行只有 ' + rows.length + ' 条');
  return rows.every(r => /^\d{2}:\d{2}:\d{2}$/.test(r.querySelector('.sys-time').textContent));
});

check('E2 引用失效有系统事件行说明（目标元素已不存在）', () => {
  const row = one('#msg-sys-stale');
  return !!row && row.textContent.includes('已不存在');
});

check('E3 失效引用卡在卡内含失效原因 + 「重新拾取」+「改用描述」', () => {
  const card = one('#ref-card-1-stale');
  eq(card.getAttribute('data-ref-state'), 'stale');
  return !!card.querySelector('.ref-stale-why')
    && !!card.querySelector('[data-act="repick"]')
    && !!card.querySelector('[data-act="describe"]');
});

check('E4 「改用描述」兜底输入默认收起（点开才出现）', () => {
  const box = one('#ref-1-describe');
  return !!box && box.hidden === true && !!box.querySelector('input');
});

check('E5 失效旧卡保留 + 重拾后新引用序号递增为 ②', () => {
  const stale = one('#ref-card-1-stale');
  const fresh = one('#ref-card-2');
  return stale.getAttribute('data-ref-num') === '1'
    && fresh.getAttribute('data-ref-num') === '2'
    && fresh.getAttribute('data-ref-state') === 'valid';
});

/* ── F. 密度预算（法五）与工具栏约束 ─────────────────────────────── */
check('F1 默认屏 S1：面板处于 S1 且工具栏可点 ≤5', () => {
  const d = density();
  eq(d.scene, 'S1', '当前场景');
  return d.toolbar <= 5;
});

check('F2 默认屏 S1：工具栏 + 状态栏可点合计 ≤7', () => {
  const d = density();
  return d.total <= 7;
});

check('F3 S1 状态栏无风险时收缩为一行（0 个可点 chip）', () => {
  const d = density();
  return d.statusbar === 0 && one('#region-statusbar').hidden === false;
});

check('F4 工具栏 4 个视图入口带计数徽标', () => {
  const views = ['tree', 'commands', 'audit', 'settings'];
  return views.every(v => {
    const b = one(`[data-open-view="${v}"]`);
    return !!b && !!b.querySelector('.badge') || (!!b && v === 'settings');
  });
});

check('F5 工具站点摘要为只读（非 button/a/input），不计入可点预算', () => {
  const summary = one('.site-summary');
  return !!summary && summary.tagName === 'DIV' && summary.getAttribute('role') === 'status';
});

check('F6 法一：工具栏与状态栏内不存在 ask-user / 授权 / 推荐类卡', () => {
  const forbidden = ['askuser', 'auth', 'nextstep'];
  return forbidden.every(t =>
    $$(`#region-toolbar [data-msg-type="${t}"]`).length === 0
    && $$(`#region-statusbar [data-msg-type="${t}"]`).length === 0);
});

check('F7 法四：默认屏面板内无可见常驻输入框', () => {
  const inputs = $$('#panel input, #panel textarea, #panel select').filter(isVisible);
  if (inputs.length) throw new Error('默认屏出现可见输入框 ' + inputs.length + ' 个');
  return true;
});

/* ── G. 三宽度 × 双主题切换器 ─────────────────────────────────────── */
check('G1 三宽度切换器存在（320 / 400 / 520 三个 radio）', () => {
  const radios = $$('#width-switch [role="radio"]');
  eq(radios.length, 3, '宽度 radio 数');
  const vals = radios.map(r => r.getAttribute('data-width-set'));
  return vals.join(',') === '320,400,520';
});

check('G2 宽度切到 320：panel[data-width=320] 且 --panel-w=320px', () => {
  demo.setWidth('320');
  return one('#panel').getAttribute('data-width') === '320'
    && density().panelWidthVar === '320';
});

check('G3 宽度切到 520：panel[data-width=520]', () => {
  demo.setWidth('520');
  const ok = one('#panel').getAttribute('data-width') === '520'
    && density().panelWidthVar === '520';
  demo.setWidth('400');
  return ok;
});

check('G4 主题切换器存在（跟随系统 / 浅色 / 深色）', () => {
  const radios = $$('#theme-switch [role="radio"]');
  eq(radios.length, 3, '主题 radio 数');
  return radios.map(r => r.getAttribute('data-theme-set')).join(',') === 'auto,light,dark';
});

check('G5 工具栏有一个主题切换按钮（计入工具栏 ≤5 预算）', () =>
  !!one('#region-toolbar #theme-toggle'));

check('G6 主题切到深色：html[data-theme=dark]（真实生效）', () => {
  demo.setTheme('dark');
  return sandbox.document.documentElement.getAttribute('data-theme') === 'dark'
    && density().theme === 'dark';
});

check('G7 主题切回跟随系统：移除 data-theme', () => {
  demo.setTheme('auto');
  return !sandbox.document.documentElement.hasAttribute('data-theme')
    && density().theme === 'auto';
});

/* ── H. 场景切换器 + 按需视图 ─────────────────────────────────────── */
check('H1 场景切换器存在 7 个场景（S1~S7）', () => {
  const radios = $$('#scene-switch [role="radio"]');
  eq(radios.length, 7, '场景 radio 数');
  return radios.map(r => r.getAttribute('data-scene-set')).join(',') === 'S1,S2,S3,S4,S5,S6,S7';
});

check('H2 切到 S2：引用卡 + AI 确认 + 推荐卡可见，S3 消息隐藏', () => {
  demo.setScene('S2');
  return isVisible(one('#ref-card-1'))
    && isVisible(one('#msg-ref-ack'))
    && isVisible(one('#msg-ref-next'))
    && !isVisible(one('#ask-2'));
});

check('H3 切到 S5：系统事件行 + 失效卡 + 重拾后的新引用同时可见', () => {
  demo.setScene('S5');
  return isVisible(one('#msg-sys-stale'))
    && isVisible(one('#ref-card-1-stale'))
    && isVisible(one('#msg-sys-repick'))
    && isVisible(one('#ref-card-2'));
});

check('H4 S6 风险稳态：状态栏显示 2 个风险 chip 且合计仍 ≤7', () => {
  demo.setScene('S6');
  const chips = $$('#risk-chips [data-risk]').filter(isVisible);
  eq(chips.length, 2, '可见风险 chip 数');
  const d = density();
  return d.total <= 7 && d.toolbar <= 5;
});

check('H5 风险 chip 永不折叠：状态栏本体无 hidden，chip 容器可见', () => {
  const bar = one('#region-statusbar');
  eq(bar.hidden, false, '状态栏 hidden');
  const box = one('#risk-chips');
  eq(box.hidden, false, '风险 chip 容器 hidden');
  return $$('#risk-chips [data-risk]').filter(isVisible).length >= 2;
});

check('H6 风险详情默认收起（不占默认密度）', () => {
  demo.setScene('S6');
  demo.closeRiskDetail();
  return one('#risk-detail').hidden === true;
});

check('H7 点风险 chip → 详情展开且含「本阶段不发命令、不改授权」披露语', () => {
  demo.focusRisk('ref');
  const detail = one('#risk-detail');
  const line = one('[data-risk-detail="ref"]');
  return detail.hidden === false
    && line.hidden === false
    && line.textContent.includes('本阶段不发命令、不改授权');
});

check('H8 S6 有风险时状态栏可见（风险 chip 不被任何展开收起影响）', () => {
  demo.openView('settings');
  const chipsVisible = $$('#risk-chips [data-risk]').filter(isVisible).length;
  demo.closeView();
  return chipsVisible === 2;
});

check('H9 L2 按需视图：打开审计 → 视图层可见、流隐藏、标题正确', () => {
  demo.openView('audit');
  const layer = one('#view-layer');
  const body = one('#view-audit');
  return layer.hidden === false && one('#stream').hidden === true
    && body.hidden === false && one('#view-title').textContent.includes('审计');
});

check('H10 返回聊天流：视图层收起、流恢复', () => {
  demo.closeView();
  return one('#view-layer').hidden === true && one('#stream').hidden === false;
});

check('H11 S7 全卡型总览：7 类卡在同屏同时可见', () => {
  demo.setScene('S7');
  const missing = CARD_TYPES.filter(t => !$$(`[data-msg-type="${t}"]`).some(isVisible));
  if (missing.length) throw new Error('S7 未同屏的卡型：' + missing.join(', '));
  return true;
});

check('H12 S7 状态栏：声明无效 chip 与引用失效 chip 并存', () => {
  demo.setScene('S7');
  const seen = $$('#risk-chips [data-risk]').filter(isVisible).map(c => c.getAttribute('data-risk'));
  return seen.includes('decl') && seen.includes('ref');
});

/* ── I. 回到默认态收尾 ───────────────────────────────────────────── */
check('I1 收尾：切回 S1 后默认屏密度仍 ≤7 且场景脏数据已复位', () => {
  demo.setScene('S1');
  const d = density();
  return d.scene === 'S1' && d.total <= 7 && d.toolbar <= 5;
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
console.log(`方案 F（option-f-chat-stream.html）DOM 垫片断言：${passed} passed / ${failed} failed`);
console.log(`（共 ${results.length} 条；覆盖三区结构 / 7 类消息卡 / 问答与授权固化 / 事件时间戳 / 密度预算 / 宽度与主题 / 风险 chip 永不折叠）`);

process.exit(failed === 0 ? 0 : 1);
