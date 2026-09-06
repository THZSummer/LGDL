import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseLocator,
  locatorSyntaxHelp,
  LOCATOR_SYNTAX_GUIDE,
  LOCATOR_MULTI_MATCH_NOTE,
  DEFAULT_TEXT_TRIM,
  DEFAULT_CASE_SENSITIVE,
  type LocatorParseResult,
  type LocatorQuery,
  type CssLocatorQuery,
  type TextLocatorQuery,
} from './locator.js';

function okQuery(r: LocatorParseResult): LocatorQuery {
  assert.equal(r.ok, true, `expected ok, got: ${JSON.stringify(r)}`);
  if (!r.ok) throw new Error('unreachable');
  return r.query;
}

function failResult(r: LocatorParseResult): { kind: string; error: string } {
  assert.equal(r.ok, false, `expected failure, got: ${JSON.stringify(r)}`);
  if (r.ok) throw new Error('unreachable');
  return { kind: r.kind, error: r.error };
}

// ---- css 基线（v2 零回归语义）：裸串 + css: 显式前缀 ----

test('locator: bare CSS string parses to css query (v2 baseline)', () => {
  const q = okQuery(parseLocator('#submit'));
  assert.equal(q.type, 'css');
  if (q.type === 'css') {
    assert.equal(q.css, '#submit');
    assert.equal(q.raw, '#submit');
  }
  const q2 = okQuery(parseLocator('button[type="submit"]'));
  assert.equal(q2.type, 'css');
  if (q2.type === 'css') assert.equal(q2.css, 'button[type="submit"]');
});

test('locator: css: explicit prefix is optional and equivalent', () => {
  const q = okQuery(parseLocator('css:.btn-primary'));
  assert.equal(q.type, 'css');
  if (q.type === 'css') {
    assert.equal(q.css, '.btn-primary');
    assert.equal(q.raw, 'css:.btn-primary');
  }
});

test('locator: css: prefix with empty selector is a readable invalid error', () => {
  const r = failResult(parseLocator('css:   '));
  assert.equal(r.kind, 'invalid');
  assert.match(r.error, /css: 前缀后缺少 CSS 选择器/);
  assert.match(r.error, /语法/);
});

test('locator: empty / whitespace-only input is an empty-kind error', () => {
  for (const s of ['', '   ', '\t']) {
    const r = failResult(parseLocator(s));
    assert.equal(r.kind, 'empty');
    assert.match(r.error, /定位选择器为空/);
  }
});

test('locator: clearly valid complex CSS is accepted (no false positive)', () => {
  const valid = [
    '#submit',
    '.btn-primary',
    'button',
    'div > p',
    'ul li + li',
    'h1, h2',
    ':is(.a, .b)',
    ':not(.disabled)',
    'a[href^="https://"]',
    'a[href="x[1]"]',
    'input:checked',
    '#id.with-dot span',
    '[data-x="a,,b"]',
    'my-el::part(inner)',
    '.\\31 23',
  ];
  for (const s of valid) {
    const q = okQuery(parseLocator(s));
    assert.equal(q.type, 'css', `expected css for ${s}`);
  }
});

test('locator: statically invalid CSS yields readable invalid error (EC-002)', () => {
  const invalid = [
    'div[', // 属性选择器未闭合
    'a(', // 伪类函数未闭合
    'a]', // 多余闭括号
    'div >', // 悬空结尾组合器
    '> div', // 悬空开头组合器
    'div >> span', // 连续组合器
    'a"', // 引号未闭合
    'div,', // 列表尾逗号
    'div,,span', // 列表空项
    '#a=b', // 顶层 "="（不在属性选择器内）
  ];
  for (const s of invalid) {
    const r = failResult(parseLocator(s));
    assert.equal(r.kind, 'invalid', `expected invalid for ${JSON.stringify(s)}`);
    assert.ok(r.error.length > 0, `expected readable error for ${JSON.stringify(s)}`);
  }
});

// ---- text= 精确 / text*= 包含（trim 缺省开、大小写缺省不敏感）----

test('locator: text= exact with default trim on', () => {
  const q = okQuery(parseLocator('text=登录'));
  assert.equal(q.type, 'text');
  if (q.type === 'text') {
    assert.equal(q.mode, 'exact');
    assert.equal(q.text, '登录');
    assert.equal(q.trim, DEFAULT_TEXT_TRIM);
    assert.equal(q.caseSensitive, DEFAULT_CASE_SENSITIVE);
  }
  const spaced = okQuery(parseLocator('text=  保存  '));
  if (spaced.type === 'text') assert.equal(spaced.text, '保存');
});

test('locator: text*= contains with default trim on', () => {
  const q = okQuery(parseLocator('text*=继续阅读'));
  assert.equal(q.type, 'text');
  if (q.type === 'text') {
    assert.equal(q.mode, 'contains');
    assert.equal(q.text, '继续阅读');
  }
});

test('locator: text= case option (caseSensitive)', () => {
  const ci = okQuery(parseLocator('text=Submit'));
  if (ci.type === 'text') assert.equal(ci.caseSensitive, false);
  const cs = okQuery(parseLocator('text=Submit', { caseSensitive: true }));
  if (cs.type === 'text') {
    assert.equal(cs.caseSensitive, true);
    assert.equal(cs.text, 'Submit');
  }
});

test('locator: text= trim option (trim:false keeps whitespace)', () => {
  const raw = okQuery(parseLocator('text=  spaced  ', { trim: false }));
  if (raw.type === 'text') {
    assert.equal(raw.trim, false);
    assert.equal(raw.text, '  spaced  ');
  }
  const t = okQuery(parseLocator('text=  spaced  ', { trim: true }));
  if (t.type === 'text') assert.equal(t.text, 'spaced');
});

test('locator: text=/text*= empty text is a readable invalid error (EC-002)', () => {
  const exact = failResult(parseLocator('text='));
  assert.equal(exact.kind, 'invalid');
  assert.match(exact.error, /text= 需要匹配文本/);
  const contains = failResult(parseLocator('text*=   '));
  assert.equal(contains.kind, 'invalid');
  assert.match(contains.error, /text\*= 需要匹配文本/);
});

test('locator: text value may itself contain "=" (literal tail text)', () => {
  const q = okQuery(parseLocator('text=x=1'));
  if (q.type === 'text') {
    assert.equal(q.mode, 'exact');
    assert.equal(q.text, 'x=1');
  }
});

// ---- role=/xpath=：显式不支持 + 替代指引，绝不静默当 CSS（EC-002）----

test('locator: role= is an unsupported error with interactives guidance', () => {
  const r = failResult(parseLocator('role=button'));
  assert.equal(r.kind, 'unsupported');
  assert.match(r.error, /role= 定位暂不支持/);
  assert.match(r.error, /interactives/);
  assert.match(r.error, /FR-011/);
});

test('locator: xpath= is an unsupported error with page-eval guidance', () => {
  const r = failResult(parseLocator('xpath=//button[@id="x"]'));
  assert.equal(r.kind, 'unsupported');
  assert.match(r.error, /xpath= 定位暂不支持/);
  assert.match(r.error, /page-eval/);
  assert.match(r.error, /FR-037/);
});

// ---- 未知前缀/混杂语法错误 ----

test('locator: unknown ident= prefix is a readable invalid error (not silently CSS)', () => {
  const r = failResult(parseLocator('foo=bar'));
  assert.equal(r.kind, 'invalid');
  assert.match(r.error, /foo= 不是受支持的定位前缀/);
  assert.match(r.error, /text=/);
});

test('locator: query type discriminant is stable across modes', () => {
  const css = okQuery(parseLocator('button')) as CssLocatorQuery;
  const text = okQuery(parseLocator('text=确定')) as TextLocatorQuery;
  assert.equal(css.type, 'css');
  assert.equal(text.type, 'text');
  assert.equal(typeof css.css, 'string');
  assert.equal(typeof text.text, 'string');
});

// ---- 语法帮助事实源 ----

test('locator: syntax guide documents css/text=/text*=/unsupported/multi-match', () => {
  const guide = locatorSyntaxHelp();
  assert.equal(guide, LOCATOR_SYNTAX_GUIDE);
  assert.match(guide, /css:/);
  assert.match(guide, /text=精确文本/);
  assert.match(guide, /text\*=包含文本/);
  assert.match(guide, /trim/);
  assert.match(guide, /case/);
  assert.match(guide, /role=/);
  assert.match(guide, /xpath=/);
  assert.ok(guide.includes(LOCATOR_MULTI_MATCH_NOTE));
});
