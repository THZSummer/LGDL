/**
 * Defect fix round **R3**（2026-09-17，作者真机确认；HEAD `131f546`）— 引用失效后的
 * **只读救援**。
 *
 * ── 缺陷 ─────────────────────────────────────────────────────────────────────
 *
 * SPA（deepseek）重渲染 / 插入兄弟节点后，位置链选择器（`div._x:nth-of-type(2) > …`）
 * 断链，但**目标文字仍然可见**。冻结的判定链（`l1/ref-validity.ts#evaluateRefValidity`）
 * 走到 D1 `dom-gone` ⇒ 引用死亡，用户只能手动重新拾取（手势成本高）。
 *
 * ── 修法：只提议，用户确认才落锚（fail-closed **不放松**）────────────────────
 *
 * 本模块只做一件事：用引用**已捕获的文本摘要**在当前页面做一次**只读**文本搜索，返回
 * 「候选数 + 唯一候选的**全新**捕获事实」。它
 *
 *   - **不做任何判定**（结论枚举仍是 `valid/invalid/unknown`，救援不是第四态）；
 *   - **不写页面**（不写属性、不改 DOM、不注入样式）——「一键重锚」由面板走既有
 *     `ref-highlight{mode:'mark'}` 契约完成身份标记，本模块不参与；
 *   - 返回的 `facts` 交给面板，经与手工拾取**同一条**摄取管线（`withDeclaration()`）
 *     生成**新引用**（新 id、序号递增），旧引用零改动（append-only）。
 *
 * ── 为什么是 SW 注入而不是复用页面侧 ────────────────────────────────────────
 *
 * `src/content/**`（含 `pick-layer.ts`）与 `dist/content.js` / `dist/pick-layer.js`
 * 是**逐字节冻结**的红线面；救援必须在不动它们的前提下工作。这里采用 R1 的
 * `observeIdentity()` 先例：SW 侧 `chrome.scripting.executeScript({ func })` 注入一个
 * **自包含**函数（它不引用任何模块作用域标识符，因此可被 `Function#toString`
 * 序列化进页面）。
 *
 * ── 归一化「同源」而不是「相似」────────────────────────────────────────────
 *
 * 文本比对必须与**摘要生成**同一口径（`content/ref-capture.ts#textDigestFor` =
 * `flatten` + 80 字截断 + 被截断时补 `…`）。页面侧冻结、SW 注入函数无法 `import`，
 * 因此这里的 `truncate` / `flatten` 是对该口径的**等价副本**；`test/ref-rescue.test.ts`
 * 直接断言「注入函数对同一棵树给出的 selector / semanticPath」与冻结
 * `ref-capture.ts#selectorFor` / `semanticPathFor` **逐字符相等**，并对 `textDigest`
 * 做同源对拍 —— 任何一侧漂移都会 FAIL，而不是静默不一致。
 *
 * **R4（2026-09-22）同源面扩展**：`selectorFor` 的**不截断**口径（`SELECTOR_STORE_MAX`
 * 512 + 超限回退 compact 链）同样是 `ref-capture.ts` 那套算法的等价副本，`ref-rescue.test.ts`
 * 的逐字符对拍覆盖 >120 字与 >512 字的真实链 —— 救援侧给出的「完整选择器」必须与捕获侧
 * **同字**，否则面板拿它替换后再判定，会得到一个只在一侧合法的选择器。
 *
 * @module background/ref-rescue
 */

/** 唯一候选的全新捕获事实（DOM 侧事实；面板补齐 origin / documentId / navSeq / 声明）。 */
export interface RescueFacts {
  selector: string;
  semanticPath: string;
  textDigest: string;
  capturedAt: number;
}

/** 只读救援探测的报告（无判定、无副作用）。 */
export interface RescueProbeReport {
  /** 匹配文本摘要的**最内层**元素个数（0 = 真没了；>1 = 歧义 ⇒ 不提供自动锚定）。 */
  candidates: number;
  /** 探测时刻的 `location.href`（空串 = 读取不到）。 */
  url: string;
  /** 仅在 `candidates === 1` 时给出：该唯一候选的全新捕获事实。 */
  facts?: RescueFacts;
}

/**
 * `location.href` → 路径（`pathname`）。跨 origin 或不可解析时返回 `null`，
 * 调用方据此**不**产生「页面路径已变化」提示（宁缺勿误报）。
 */
export function rescuePathOf(url: string | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).pathname;
  } catch {
    return null;
  }
}

/** The one message kind this face adds (a **background-only** kind, see below). */
export const REF_RESCUE_KIND = 'ref-rescue';

/**
 * The routing-gate validator — deliberately **here**, not in `content/pick-protocol.ts`.
 *
 * `pick-protocol.ts` is part of the frozen `src/content/**` surface (its kinds are in
 * `PICK_LAYER_KINDS`, which the gate asserts), and `background/messaging.ts#KIND_SET`
 * is bundled into the byte-frozen `dist/content.js`. The rescue is a **panel ⇄ SW**
 * message (the page never sees it), so its kind must live on a background-only module:
 * this keeps `content.js` / `pick-layer.js` byte-identical while still being admitted
 * by the service worker's routing gate.
 */
export function isRefRescueMessage(v: unknown): v is { kind: typeof REF_RESCUE_KIND; [k: string]: unknown } {
  if (typeof v !== 'object' || v === null) return false;
  return (v as { kind?: unknown }).kind === REF_RESCUE_KIND;
}

/**
 * 在页面里执行的**只读**文本候选定位。自包含（可被 `chrome.scripting.executeScript`
 * 序列化）：所有辅助函数都嵌套在函数体内，不引用任何模块作用域标识符。
 *
 * 匹配规则 = 与摘要生成同源：`truncate(el.textContent, 80) === digest`。
 * 结果只保留**最内层**匹配（若某个匹配元素有匹配的后代，则丢弃它）——否则父子同文本
 * 会产生伪「多处匹配」，把唯一目标误判成歧义；反过来，真正的重复文本（两个并列的
 * 最内层匹配）仍然是多候选 ⇒ 面板不提供自动锚定（fail-closed）。
 */
export function rescueProbe(digest: string, root?: ParentNode, href?: string): RescueProbeReport {
  const url = href ?? (typeof location === 'undefined' ? '' : location.href);
  const empty: RescueProbeReport = { candidates: 0, url };
  const scope = root ?? (typeof document === 'undefined' ? undefined : document);
  if (!scope || !digest) return empty;

  const TEXT_DIGEST_MAX = 80;
  const SEMANTIC_PATH_MAX = 120;
  const MAX_PATH_DEPTH = 6;
  // Defect fix R4: the mirror must keep the *page-side* caliber — a selector is never
  // truncated (the display bound 120 does not apply to a stored / queried value).
  const SELECTOR_STORE_MAX = 512;
  const STABLE_KEYS = [
    'data-testid',
    'data-test-id',
    'data-key',
    'data-id',
    'data-name',
    'data-role',
    'data-component',
    'data-qa',
  ];

  const flatten = (text: string | null | undefined): string => String(text ?? '').replace(/\s+/g, '');
  const truncate = (text: string | null | undefined, max: number): string => {
    const flat = flatten(text);
    return flat.length > max ? `${flat.slice(0, max)}…` : flat;
  };

  interface Node {
    tagName: string;
    id?: string;
    textContent?: string | null;
    parentElement?: Node | null;
    getAttribute(name: string): string | null;
    siblingIndex?: number;
    siblingCount?: number;
  }

  const tag = (node: Node): string => (node.tagName ?? '').toLowerCase();
  const cssEscapeIdent = (value: string): string => value.replace(/[^a-zA-Z0-9_-]/g, (ch) => `\\${ch}`);
  const classFragment = (node: Node): string => {
    const raw = (node.getAttribute('class') ?? '').trim();
    if (!raw) return '';
    const first = cssEscapeIdent(raw.split(/\s+/)[0] ?? '');
    return first ? `.${first}` : '';
  };
  const attrFragment = (node: Node): string => {
    for (const key of STABLE_KEYS) {
      const value = node.getAttribute(key);
      if (value && value.trim()) return `[${key}="${value.trim().replace(/"/g, '\\"')}"]`;
    }
    return '';
  };
  const selectorStep = (node: Node, compact = false): string => {
    if (node.id && node.id.trim()) return `#${cssEscapeIdent(node.id.trim())}`;
    const stable = attrFragment(node);
    if (stable) return `${tag(node)}${stable}`;
    return compact ? tag(node) : `${tag(node)}${classFragment(node)}`;
  };
  const nthStep = (node: Node): string => {
    const total = node.siblingCount ?? 0;
    const index = node.siblingIndex ?? 0;
    return total > 1 && index >= 1 ? `:nth-of-type(${index})` : '';
  };
  /** `siblingIndex` / `siblingCount` among same-tag siblings (`ref-capture.ts#fromElement` 同口径). */
  const siblingInfo = (el: Element): { siblingIndex: number; siblingCount: number } => {
    const parent = el.parentElement;
    let siblingIndex = 1;
    let siblingCount = 0;
    if (parent) {
      for (const child of Array.from(parent.children)) {
        if (child.tagName === el.tagName) {
          siblingCount += 1;
          if (child === el) siblingIndex = siblingCount;
        }
      }
    }
    return { siblingIndex, siblingCount };
  };
  /** 完整节点视图（含 `textContent`；与 `ref-capture.ts#fromElement` 同口径）。 */
  const nodeOf = (el: Element): Node => {
    const parent = el.parentElement;
    const info = siblingInfo(el);
    return {
      tagName: el.tagName.toUpperCase(),
      ...(el.id ? { id: el.id } : {}),
      textContent: el.textContent,
      parentElement: parent ? shallowOf(parent) : null,
      getAttribute: (name: string) => el.getAttribute(name),
      siblingIndex: info.siblingIndex,
      siblingCount: info.siblingCount,
    };
  };
  /** 父视图：不携带 `textContent`（父的文本是整棵子树的拼接，会污染路径）。 */
  const shallowOf = (el: Element): Node => {
    const parent = el.parentElement;
    const info = siblingInfo(el);
    return {
      tagName: el.tagName.toUpperCase(),
      ...(el.id ? { id: el.id } : {}),
      parentElement: parent ? shallowOf(parent) : null,
      getAttribute: (name: string) => el.getAttribute(name),
      siblingIndex: info.siblingIndex,
      siblingCount: info.siblingCount,
    };
  };
  /** Never truncated: `selectorFor` below is the storage/query caliber (`ref-capture.ts` 同口径). */
  const selectorChain = (start: Node, compact: boolean): string => {
    const steps: string[] = [];
    let current: Node | null | undefined = start;
    let depth = 0;
    while (current && depth < MAX_PATH_DEPTH) {
      const step = selectorStep(current, compact);
      const uniqueById = Boolean(current.id && current.id.trim());
      const uniqueByStable = !uniqueById && Boolean(attrFragment(current));
      const needsNth = !uniqueById && !uniqueByStable;
      steps.unshift(`${step}${needsNth ? nthStep(current) : ''}`);
      if (uniqueById || uniqueByStable) break;
      current = current.parentElement;
      depth += 1;
    }
    return steps.join(' > ');
  };
  const selectorFor = (start: Node): string => {
    const full = selectorChain(start, false);
    if (full.length <= SELECTOR_STORE_MAX) return full;
    const compact = selectorChain(start, true);
    return compact.length < full.length ? compact : full;
  };
  const semanticStep = (node: Node): string => {
    if (node.id && node.id.trim()) return `${tag(node)}#${node.id.trim()}`;
    const stable = attrFragment(node);
    if (stable) return `${tag(node)}${stable}`;
    return `${tag(node)}${nthStep(node)}`;
  };
  const semanticPathFor = (start: Node): string => {
    const steps: string[] = [];
    let current: Node | null | undefined = start;
    let depth = 0;
    while (current && depth < MAX_PATH_DEPTH) {
      steps.unshift(semanticStep(current));
      current = current.parentElement;
      depth += 1;
    }
    const truncatedChain = depth >= MAX_PATH_DEPTH && current !== null && current !== undefined ? '… › ' : '';
    return truncate(`${truncatedChain}${steps.join(' › ')}`, SEMANTIC_PATH_MAX);
  };

  // ── 候选定位（只读）────────────────────────────────────────────────────────
  let all: Element[] = [];
  try {
    all = Array.from(scope.querySelectorAll('*'));
  } catch {
    return empty;
  }
  const matches: Element[] = [];
  for (const el of all) {
    const name = (el.tagName ?? '').toUpperCase();
    // 非渲染 / 文档骨架节点不可能是用户拾取的目标；排除它们以免伪造候选。
    if (name === 'SCRIPT' || name === 'STYLE' || name === 'NOSCRIPT' || name === 'TEMPLATE' || name === 'HEAD' || name === 'HTML') {
      continue;
    }
    if (truncate(el.textContent, TEXT_DIGEST_MAX) === digest) matches.push(el);
  }
  // 只保留最内层：父与子同为「匹配」时父是伪候选（同一目标的两种粒度）。
  const innermost = matches.filter((el) => !matches.some((other) => other !== el && el.contains(other)));
  const report: RescueProbeReport = { candidates: innermost.length, url };
  if (innermost.length !== 1) return report;
  const target = innermost[0];
  const node = nodeOf(target);
  report.facts = {
    selector: selectorFor(node),
    semanticPath: semanticPathFor(node),
    textDigest: truncate(target.textContent, TEXT_DIGEST_MAX),
    capturedAt: Date.now(),
  };
  return report;
}
