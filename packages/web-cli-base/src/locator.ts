/**
 * locator.ts —— 元素定位语法面解析器（纯逻辑，node 可直接单测；FR-015/ADR-007/EC-002）。
 *
 * v3 全部元素级子命令（read-element/find/click/fill/extract 等）+ wait 工具统一消费的
 * 定位语法**单一事实源**：把 selector 入参解析为结构化 `LocatorQuery`，供 DOM 侧
 * （platform-dom import 复用）与 node 侧（纯单测/工具参数校验）共用。
 *
 * 语法面（ADR-007 / spec S-07 已裁）：
 *   - 裸 CSS 串 / `css:` 显式前缀   → CSS querySelector（v2 CSS 基线，零回归语义）
 *   - `text=精确文本`                → 文本树精确匹配（叶子优先，见下）
 *   - `text*=包含文本`               → 文本树子串匹配
 *     text=/text*= 可配大小写（caseSensitive，缺省忽略大小写）与 trim（缺省开）
 *   - `role=` / `xpath=`            → 显式「不支持 + 替代指引」可读错误，
 *     **绝不静默当 CSS 解析**（EC-002）：role 信息经 dom interactives（FR-011）清单获取；
 *     xpath 语义经 page-eval（FR-037）在宿主页表达。
 *   - 非法 CSS（括号/引号不配对、悬空组合器、顶层 "=" 等可静态识别形态）与 text= 空文本
 *     → 可读错误 + 语法指引（EC-002）。
 *
 * 文本匹配语义（ADR-007，DOM 侧实现沿用）：**叶子优先** —— 匹配归属文本节点且不含子元素
 * 文本的元素（避免命中把子元素文本也算进去的容器父级）；默认 trim、可配大小写。
 * 多匹配操作类语义 = 首元素 + 提示（可经 find 精确化，EC-002），本解析器只产出结构化
 * 查询（匹配数需 DOM 侧求值），语义经 `LOCATOR_MULTI_MATCH_NOTE` 文档化。
 *
 * 本文件零 DOM/lgdl/react import（NFR-001），纯字符串逻辑，node 环境可测（NFR-005）。
 */

export type LocatorQueryType = 'css' | 'text';
/** text= 匹配模式：exact = 精确全文；contains = 子串包含。 */
export type TextMatchMode = 'exact' | 'contains';

/** CSS 定位查询（裸串 / css: 前缀）。 */
export interface CssLocatorQuery {
  type: 'css';
  /** 归一后的 CSS 选择器（已去 css: 前缀与首尾空白）。 */
  css: string;
  /** 原始入参（审计/回显用）。 */
  raw: string;
}

/** text= 文本定位查询（精确或包含）。 */
export interface TextLocatorQuery {
  type: 'text';
  mode: TextMatchMode;
  /** 归一后的匹配文本（trim 缺省开；caseSensitive 缺省关）。 */
  text: string;
  /** 是否区分大小写（缺省 false）。 */
  caseSensitive: boolean;
  /** 是否先 trim 首尾空白（缺省 true）。 */
  trim: boolean;
  /** 原始入参（审计/回显用）。 */
  raw: string;
}

/** 结构化定位查询（判别字段 = type）。 */
export type LocatorQuery = CssLocatorQuery | TextLocatorQuery;

/** text= 匹配可配项（缺省与 ADR-007 对齐：trim 开、忽略大小写）。 */
export interface LocatorParseOptions {
  /** text=/text*= 是否区分大小写（缺省 false = 忽略大小写）。 */
  caseSensitive?: boolean;
  /** text=/text*= 是否先 trim（缺省 true = 开）。 */
  trim?: boolean;
}

export const DEFAULT_TEXT_TRIM = true;
export const DEFAULT_CASE_SENSITIVE = false;

export const EXACT_TEXT_PREFIX = 'text=';
export const CONTAINS_TEXT_PREFIX = 'text*=';
export const CSS_PREFIX = 'css:';

/** 解析失败分类：empty=空入参 / unsupported=role=xpath=（有替代指引）/ invalid=语法错误。 */
export type LocatorErrorKind = 'empty' | 'unsupported' | 'invalid';

export type LocatorParseResult =
  | { ok: true; query: LocatorQuery }
  | { ok: false; kind: LocatorErrorKind; error: string };

/** 多匹配操作类语义说明（EC-002）：操作类按首元素执行并提示，可经 find 精确化。 */
export const LOCATOR_MULTI_MATCH_NOTE =
  '定位匹配到多个元素时，操作类子命令按「首元素 + 结果提示」语义执行；如需精确定位，可先用 dom find（FR-013）确认匹配集与唯一化建议后再操作。';

/** v4 穿透定位说明（FR-023/ADR-011；解析层不变 —— 穿透在 DOM 侧 resolver，主文档 CSS 命中照旧）。 */
export const LOCATOR_PENETRATION_NOTE =
  '穿透（v4/FR-023）：主文档未命中时自动递归走查 open shadowRoot 与同源 iframe contentDocument（SOP 内；深度护栏 ≤4 层）；' +
  '命中结果带 via:"shadow"/"iframe" 标注。closed shadow/跨域 iframe 不可穿透 → 「不支持 + content script(all_frames)/CDP 归属」（FR-025）。';

/** 定位语法帮助（错误指引 / dom·wait·extract 工具 help 共用的事实源）。 */
export const LOCATOR_SYNTAX_GUIDE = [
  '支持：CSS 选择器（裸串，v2 基线，如 "#submit" / ".btn-primary" / "button[type=submit]"）',
  '      | css: <CSS>（显式前缀，与裸串等价）',
  '      | text=精确文本（叶子文本全文匹配）',
  '      | text*=包含文本（叶子文本子串匹配）',
  'text=/text*= 可配：trim（缺省开，裁剪首尾空白）/ case（区分大小写，缺省关）——经解析选项传入',
  '不支持：role= （可访问角色/名称经 dom interactives FR-011 清单获取后再定位）',
  '      | xpath= （xpath 语义在宿主页经 page-eval FR-037 表达）——两者绝不静默当 CSS 解析（EC-002）',
  LOCATOR_PENETRATION_NOTE,
  LOCATOR_MULTI_MATCH_NOTE,
].join('\n');

/** 渲染定位语法帮助（工具 help / 错误指引复用）。 */
export function locatorSyntaxHelp(): string {
  return LOCATOR_SYNTAX_GUIDE;
}

/** role= / xpath= 不支持 + 替代指引（EC-002：不静默当 CSS）。 */
const ROLE_UNSUPPORTED_ERROR =
  'role= 定位暂不支持：可访问角色/名称信息经 dom interactives 清单（FR-011）获取后，改用 CSS 或 text= 定位。';
const XPATH_UNSUPPORTED_ERROR =
  'xpath= 定位暂不支持：xpath 语义可在宿主页用 page-eval（FR-037）表达；请改用 CSS 或 text= 定位。';

const EMPTY_ERROR =
  '定位选择器为空：需要 CSS 选择器（如 "#submit" / ".btn" / "button"）或 text= / text*= 语法。';

function isBlank(s: string): boolean {
  return s.trim() === '';
}

/**
 * 匹配 text= / text*= 前缀（大小写不敏感识别前缀；切片长度恒定不受大小写影响）。
 * 顺序：先匹配 text*=（含 * 的最长前缀），再匹配 text=。
 */
function matchTextPrefix(s: string): { mode: TextMatchMode; rest: string } | null {
  if (s.toLowerCase().startsWith(CONTAINS_TEXT_PREFIX)) {
    return { mode: 'contains', rest: s.slice(CONTAINS_TEXT_PREFIX.length) };
  }
  if (s.toLowerCase().startsWith(EXACT_TEXT_PREFIX)) {
    return { mode: 'exact', rest: s.slice(EXACT_TEXT_PREFIX.length) };
  }
  return null;
}

/**
 * CSS 选择器可静态识别的形态检查（纯逻辑，node 可测；EC-002 非法 CSS → 可读错误）。
 * 只检查确定非法的形态（括号/引号不配对、悬空组合器、列表空项、顶层 "="），
 * 不做完整 CSS 语法校验 —— 完整合法性由 DOM 侧 querySelector 兜底（失败转译）。
 * 合法 CSS 内的这些字符（如属性值引号内的 "=" / "," / ">"，:is(...) 内逗号）均被正确跳过。
 */
function cssShapeIssue(cssRaw: string): string | null {
  const t = cssRaw.trim();
  if (t === '') return 'CSS 选择器为空';
  let quote: string | null = null; // 当前引号（单/双），null = 不在字符串内
  const stack: string[] = []; // 开括号期望的闭括号栈（'[' → ']'；'(' → ')'）
  let prev: string | null = null; // 上一个非空白「顶层」有意义字符（不在括号内）
  for (let i = 0; i < t.length; i++) {
    const ch = t[i];
    if (quote) {
      if (ch === '\\') {
        i++; // 字符串内转义（如 [title="a\\"b"]），跳过下一字符
        continue;
      }
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '\\') {
      i++; // 选择器内转义（如 #a\:b、.\31 23），跳过下一字符
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      continue;
    }
    if (ch === '[' || ch === '(') {
      stack.push(ch === '[' ? ']' : ')');
      prev = ch;
      continue;
    }
    if (ch === ']' || ch === ')') {
      const open = stack.pop();
      if (open === undefined) return `CSS 选择器含多余的 "${ch}"（无配对的 "${ch === ']' ? '[' : '('}"）`;
      if (open !== ch) return `CSS 选择器括号不配对：期望 "${open}"，实际 "${ch}"`;
      prev = ch;
      continue;
    }
    if (stack.length > 0) continue; // 属性选择器 / 伪类函数内：不施加顶层约束
    if (/\s/.test(ch)) continue;
    if (ch === '=') {
      return '定位语法错误："=" 只能出现在属性选择器内部（[attr=value]）；裸 "x=y" 不会被静默当作 CSS 解析';
    }
    const isCombinator = ch === '>' || ch === '+' || ch === '~';
    if (ch === ',') {
      if (prev === null) return 'CSS 选择器列表不能以 "," 开头';
      if (prev === ',') return 'CSS 选择器列表含空项（连续 ","）';
    } else if (isCombinator) {
      if (prev === null) return `CSS 选择器不能以组合器 "${ch}" 开头（组合器需连接两个简单选择器）`;
      if (prev === ',') return `CSS 选择器列表项不能以组合器 "${ch}" 开头`;
      if (prev === '>' || prev === '+' || prev === '~') return `CSS 组合器连续（"${prev}${ch}"）`;
    }
    prev = ch;
  }
  if (quote) return 'CSS 选择器引号未闭合（属性值/字符串缺结尾引号）';
  if (stack.length > 0) {
    const missing = stack[stack.length - 1];
    return `CSS 选择器括号未闭合（缺 "${missing}"）`;
  }
  if (prev === ',') return 'CSS 选择器列表不能以 "," 结尾';
  if (prev === '>' || prev === '+' || prev === '~') return 'CSS 选择器不能以组合器结尾（组合器后缺简单选择器）';
  return null;
}

const INVALID_CSS_GUIDANCE =
  '（语法：CSS 裸串 / css: 前缀 / text=精确文本 / text*=包含文本；role=/xpath= 不支持 —— 详见 locator 语法帮助）';

function cssQuery(input: string, options: { prefix: boolean }): LocatorParseResult {
  const css = options.prefix ? input.slice(CSS_PREFIX.length) : input;
  if (isBlank(css)) {
    return {
      ok: false,
      kind: 'invalid',
      error: `css: 前缀后缺少 CSS 选择器${INVALID_CSS_GUIDANCE}`,
    };
  }
  const issue = cssShapeIssue(css);
  if (issue !== null) {
    return { ok: false, kind: 'invalid', error: `${issue}${INVALID_CSS_GUIDANCE}` };
  }
  return { ok: true, query: { type: 'css', css: css.trim(), raw: input } };
}

/**
 * 解析定位语法入参为结构化 LocatorQuery（FR-015/ADR-007；EC-002 错误面）。
 * 纯字符串逻辑，无浏览器/DOM 依赖。
 */
export function parseLocator(input: string, options: LocatorParseOptions = {}): LocatorParseResult {
  if (isBlank(input)) return { ok: false, kind: 'empty', error: EMPTY_ERROR };

  const caseSensitive = options.caseSensitive ?? DEFAULT_CASE_SENSITIVE;
  const trim = options.trim ?? DEFAULT_TEXT_TRIM;
  const raw = input;

  // 1) text= / text*= 文本定位（先于 role/xpath/css 前缀判定）
  const textPrefix = matchTextPrefix(raw);
  if (textPrefix) {
    const prefixLabel = textPrefix.mode === 'exact' ? EXACT_TEXT_PREFIX : CONTAINS_TEXT_PREFIX;
    const text = trim ? textPrefix.rest.trim() : textPrefix.rest;
    if (text === '') {
      return {
        ok: false,
        kind: 'invalid',
        error: `${prefixLabel} 需要匹配文本（语法：text=精确文本 / text*=包含文本）；空文本无法定位。`,
      };
    }
    return {
      ok: true,
      query: { type: 'text', mode: textPrefix.mode, text, caseSensitive, trim, raw },
    };
  }

  // 2) role= / xpath=：显式「不支持 + 替代指引」，绝不静默当 CSS 解析（EC-002）
  const lower = raw.toLowerCase();
  if (lower.startsWith('role=')) {
    return { ok: false, kind: 'unsupported', error: ROLE_UNSUPPORTED_ERROR };
  }
  if (lower.startsWith('xpath=')) {
    return { ok: false, kind: 'unsupported', error: XPATH_UNSUPPORTED_ERROR };
  }

  // 3) css: 显式前缀（可选；与裸串等价）
  if (lower.startsWith(CSS_PREFIX)) {
    return cssQuery(raw, { prefix: true });
  }

  // 4) 未知 "xxx=" 前缀形态（identifier 紧跟 =；非 CSS 首字符集合）→ 可读语法错误
  const unknownPrefix = /^[a-z_][\w-]*\s*=/.exec(raw);
  if (unknownPrefix) {
    const head = raw.slice(0, raw.indexOf('=')).trim();
    return {
      ok: false,
      kind: 'invalid',
      error: `${head}= 不是受支持的定位前缀（支持：CSS 裸串 / css: / text= / text*=；role=/xpath= 明确不支持，不静默当 CSS 解析）${INVALID_CSS_GUIDANCE}`,
    };
  }

  // 5) 裸 CSS 串（v2 CSS 基线，零回归语义）
  return cssQuery(raw, { prefix: false });
}
