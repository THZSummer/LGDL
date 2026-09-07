/**
 * dom-tools.ts —— dom 通用 DOM 操作子命令族（NG-002/NG-003 同源边界）。
 *
 * 生态位（discovery §3.3 E 组 ○ / §3.4 DOM 域）：浏览器最独特生态位 —— 通用
 * DOM 自动化。v3（plan §2.3.3/ADR-008）由 7 → 27 子命令：**v2 既有 7 顺序保持 +
 * 行为零回归**（read-state/click/hover/scroll/zoom/fullscreen/snapshot），新增
 * PER 感知（interactives/read-element/find/structure；snapshot 升级 = 既有子命令
 * 扩展参数 --structured/--offset/--limit/--maxLength/--sections，不加新名）、
 * INT 交互（dblclick/contextmenu/long-press/drag/focus/blur/type/press）、
 * WR 写入（set-text/set-attr/remove-attr/set-style/set-value/fill/add/remove）。
 * **执行目标 = 宿主应用自身同源页面**（第三方/跨域站点 = F-14 边界，NG-002/NG-003：
 * help 显式声明）。
 *
 * 分层（ADR-008）：DOM 操作经 PlatformEnv.dom.ops 注入（无 op-cli React handler 依赖，
 * 直接 document 操作的注入桩）。本文件 executor 只做参数解析 / 未注入守卫 / 门禁语义，
 * **零 DOM 触碰** —— DOM 真实现收敛 platform-dom.ts（TASK-004），执行目标 selector 统一
 * 为 v3 定位语法面（FR-015：css:/裸 CSS/text=/text*=，DOM 侧解析；本文件透传）。
 *
 * 权限（FR-005/ADR-001，修复 IMP-4）：entry 增 `subcommandRisks`（PRM 按子命令裁决的
 * 单一数据源，plan §2.3.3）——read 组（read-state/snapshot/interactives/read-element/
 * find/structure）→ 'read'（缺省 allow 免 ask）；ui 组（click/hover/scroll/zoom/
 * fullscreen/dblclick/contextmenu/long-press/drag/focus/blur/press）→ 'ui'（缺省 ask）；
 * write 组（type/set-text/set-attr/remove-attr/set-style/set-value/fill/add/remove）→
 * 'write'（缺省 ask + 写后回读校验在 ops 面）；entry.risk 保持 'ui'（回退面 = v2 元数据
 * 零变化）。dispatch effectiveRisk = subcommandRisks?.[sub] ?? entry.risk（无 subcommandRisks
 * 工具行为逐字节同 v2，FR-001 零回归）。
 *
 * 未注入语义（FR-002）：PlatformDomOps 新方法全可选（TASK-003），未注入（undefined）→
 * 返回「该能力在当前环境未注入」可读错误（dom-tools.ts:32-38 语义扩展至子能力面），不崩溃。
 * 授权失败（NotAllowedError/NotFoundError 等）→ 转译友好错误（FR-009/EC-003），会话不中断。
 * 浏览器真实 DOM 冒烟由 validate 承接（node 面注入桩全链单测）。
 *
 * 本文件零 LGDL/react import（NFR-001）。
 */
import type {
  PlatformAddElementOptions,
  PlatformClickOptions,
  PlatformDomOps,
  PlatformDomOpResult,
  PlatformEnv,
  PlatformFillField,
  PlatformFillFormOptions,
  PlatformFindElementsOptions,
  PlatformInteractivesOptions,
  PlatformInsertPosition,
  PlatformPressKeyOptions,
  PlatformReadElementFields,
  PlatformReadElementOptions,
  PlatformReadStructureOptions,
  PlatformSetStyleOptions,
  PlatformSnapshotStructuredOptions,
  PlatformStructurePart,
  PlatformTouchOptions,
  PlatformTypeTextOptions,
} from './platform.js';
import { translateCapabilityError } from './platform.js';
import type { ToolEntry, ToolResult } from './router.js';

export type DomSubcommand =
  // v2 既有 7（顺序保持，零回归红线）
  | 'read-state'
  | 'click'
  | 'hover'
  | 'scroll'
  | 'zoom'
  | 'fullscreen'
  | 'snapshot'
  // PER 感知（FR-011~014；snapshot 结构化段为升级参数不加新名）
  | 'interactives'
  | 'read-element'
  | 'find'
  | 'structure'
  // INT 交互（FR-018~023）
  | 'dblclick'
  | 'contextmenu'
  | 'long-press'
  | 'drag'
  | 'focus'
  | 'blur'
  | 'type'
  | 'press'
  // WR 写入（FR-031~036）
  | 'set-text'
  | 'set-attr'
  | 'remove-attr'
  | 'set-style'
  | 'set-value'
  | 'fill'
  | 'add'
  | 'remove'
  // v4 TCH（TASK-013/FR-024，尾部追加：G-01 验证门 PASS）
  | 'tap'
  | 'swipe'
  | 'pinch';

/** 30 子命令注册序（既有 27 头部不漂移 = AC-001 检查点③红线；tap/swipe/pinch 仅尾部）。 */
const SUBCOMMANDS: DomSubcommand[] = [
  'read-state', 'click', 'hover', 'scroll', 'zoom', 'fullscreen', 'snapshot',
  'interactives', 'read-element', 'find', 'structure',
  'dblclick', 'contextmenu', 'long-press', 'drag', 'focus', 'blur', 'type', 'press',
  'set-text', 'set-attr', 'remove-attr', 'set-style', 'set-value', 'fill', 'add', 'remove',
  'tap', 'swipe', 'pinch',
];

// ---------- 参数解析小工具（executor 面；EC-002 可读错误 + 指引） ----------

/** 可选整型参数：缺省/空 → undefined；非法 → 可读错误。 */
function intArg(args: Record<string, string>, key: string): { n?: number; error?: string } {
  const raw = args[key];
  if (raw === undefined || raw === '') return {};
  if (!/^-?\d+$/.test(raw)) return { error: `✖ dom 参数 --${key} 需为整数（收到 "${raw}"）` };
  return { n: Number(raw) };
}

/** 'true' 布尔开关解析。 */
const flagTrue = (v: string | undefined): boolean => v === 'true';

/** 逗号分隔清单（去空白）；空入参 → undefined。 */
function csvList(v: string | undefined): string[] | undefined {
  if (v === undefined || v.trim() === '') return undefined;
  const out = v.split(',').map((s) => s.trim()).filter((s) => s !== '');
  return out.length > 0 ? out : undefined;
}

/** 枚举清单参数校验（非法值 → 可读错误 + 合法值指引）。 */
function enumListArg(
  args: Record<string, string>,
  key: string,
  allowed: readonly string[],
  label: string,
): { list?: string[]; error?: string } {
  const raw = args[key];
  if (raw === undefined || raw.trim() === '') return {};
  const tokens = csvList(raw) ?? [];
  const bad = tokens.filter((t) => !(allowed as readonly string[]).includes(t));
  if (bad.length > 0) {
    return { error: `✖ dom --${key} 含非法值：${bad.map((b) => `"${b}"`).join('、')}（可选 ${allowed.join('/')}；${label}）` };
  }
  return { list: tokens };
}

/** JSON 字符串 → 字符串值对象（attrs 等）；解析失败/非对象 → 可读错误。 */
function jsonObjectArg(raw: string | undefined, what: string): { obj?: Record<string, string>; error?: string } {
  if (raw === undefined || raw.trim() === '') return {};
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { error: `✖ dom --${what} 需为合法 JSON 字符串（收到 "${raw}"）` };
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return { error: `✖ dom --${what} 需为 JSON 对象（{"键":"值"}，收到 "${raw}"）` };
  }
  const obj: Record<string, string> = {};
  for (const [k, v] of Object.entries(parsed)) obj[k] = String(v);
  return { obj };
}

/**
 * fill --fields JSON 字段表解析（FR-035）：
 *   对象形态 {"selector":"值",...}（byLabel=false 缺省）/ 数组形态
 *   [{"selector","value","byLabel"?},...]（select 按 label 匹配可带 byLabel）。
 */
function fillFieldsArg(raw: string | undefined): { fields?: PlatformFillField[]; error?: string } {
  if (raw === undefined || raw.trim() === '') return { error: '✖ dom fill 缺少 --fields <JSON 字段表（对象 {"#sel":"值"} 或数组 [{"selector","value"}]）>' };
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { error: `✖ dom fill --fields 需为合法 JSON（收到 "${raw}"；示例 {"#user":"alice","#bio":"hi"}）` };
  }
  const fields: PlatformFillField[] = [];
  if (Array.isArray(parsed)) {
    for (const item of parsed) {
      if (typeof item !== 'object' || item === null) {
        return { error: '✖ dom fill --fields 数组项需为对象 {"selector","value","byLabel"?}' };
      }
      const it = item as Record<string, unknown>;
      if (typeof it.selector !== 'string' || !it.selector) return { error: '✖ dom fill --fields 数组项缺 string selector' };
      if (typeof it.value !== 'string') return { error: `✖ dom fill --fields 数组项 "${it.selector}" 缺 string value` };
      fields.push({ selector: it.selector, value: it.value, ...(typeof it.byLabel === 'boolean' ? { byLabel: it.byLabel } : {}) });
    }
  } else if (typeof parsed === 'object' && parsed !== null) {
    for (const [sel, v] of Object.entries(parsed)) {
      if (!sel) return { error: '✖ dom fill --fields 含空 selector 键' };
      if (typeof v !== 'string') return { error: `✖ dom fill --fields 值需为字符串（"${sel}" → 值）` };
      fields.push({ selector: sel, value: v });
    }
  } else {
    return { error: '✖ dom fill --fields 需为 JSON 对象或数组' };
  }
  if (fields.length === 0) return { error: '✖ dom fill --fields 为空（至少一个字段）' };
  return { fields };
}

/** 子能力未注入守卫返回（FR-002：可选方法缺省 undefined → 可读错误，不崩溃）。 */
function opMissing(method: string): ToolResult {
  return {
    ok: false,
    output: `✖ dom 该能力在当前环境未注入（env.dom.ops.${method} 缺省）—— 宿主页 DOM 能力仅在浏览器场景可用；写操作受权限门禁（PRM）约束`,
    error: `dom ops ${method} not injected`,
  };
}

/** dom 工具执行器：子命令 → env.dom.ops 注入桩/实现。 */
export async function executeDomTool(ops: PlatformDomOps | undefined, subcommand: string, args: Record<string, string>): Promise<ToolResult> {
  const opName = (SUBCOMMANDS as string[]).includes(subcommand) ? (subcommand as DomSubcommand) : null;
  if (!opName) {
    return { ok: false, output: `✖ dom 未知子命令 "${subcommand}"（可用：${SUBCOMMANDS.join('/')}）`, error: 'unknown subcommand' };
  }
  if (!ops) {
    return {
      ok: false,
      output: '✖ dom 操作面未注入（env.dom.ops 缺省）—— 宿主页 DOM 操作仅在浏览器场景可用；写操作受权限门禁（PRM）约束',
      error: 'dom ops not injected',
    };
  }
  try {
    let r: PlatformDomOpResult;
    switch (opName) {
      // ---- v2 既有 7（顺序保持 + 行为零回归；read-state/snapshot 升级在浏览器实现内完成） ----
      case 'read-state':
        r = await ops.readState();
        break;
      case 'click': {
        const sel = args.selector ?? '';
        if (!sel) return { ok: false, output: '✖ dom click 缺少 --selector <CSS 选择器>' };
        const coordKeys = ['offsetX', 'offsetY', 'x', 'y'] as const;
        const hasCoord = coordKeys.some((k) => (args[k] ?? '') !== '');
        if (!hasCoord) {
          // FR-020：既有 selector-only 调用零回归（第二参不传 = v2 逐字节一致）
          r = await ops.click(sel);
          break;
        }
        const opts: PlatformClickOptions = {};
        for (const k of coordKeys) {
          const p = intArg(args, k);
          if (p.error) return { ok: false, output: p.error };
          if (p.n !== undefined) opts[k] = p.n;
        }
        r = await ops.click(sel, opts);
        break;
      }
      case 'hover': {
        const sel = args.selector ?? '';
        if (!sel) return { ok: false, output: '✖ dom hover 缺少 --selector <CSS 选择器>' };
        r = await ops.hover(sel);
        break;
      }
      case 'scroll': {
        // C34 改进：显式非法数值报可读错误（EC-002），不静默回退；缺省路径 = v2 兼容（0,0）
        const dxA = intArg(args, 'dx');
        if (dxA.error) return { ok: false, output: dxA.error };
        const dyA = intArg(args, 'dy');
        if (dyA.error) return { ok: false, output: dyA.error };
        r = await ops.scroll(args.selector || undefined, dxA.n ?? 0, dyA.n ?? 0);
        break;
      }
      case 'zoom': {
        // C34 改进：显式非法数值报可读错误（EC-002）；越界数值（<10 或 >500）由 ops 面边界校验
        const pA = intArg(args, 'percent');
        if (pA.error) return { ok: false, output: pA.error };
        r = await ops.zoom(pA.n);
        break;
      }
      case 'fullscreen': {
        const onRaw = args.on;
        if (onRaw !== undefined && onRaw !== '' && onRaw !== 'true' && onRaw !== 'false') {
          return { ok: false, output: `✖ dom fullscreen --on 需为 true 或 false（收到 "${onRaw}"）` };
        }
        const on = onRaw === 'true';
        r = await ops.fullscreen(on);
        break;
      }
      case 'snapshot': {
        // v2 缺省（无 --structured）：纯文本快照输出兼容（截断标记为附加元信息，FR-010）
        if (args.structured !== 'true') {
          r = await ops.snapshot();
          break;
        }
        // v3 结构化段 + 分页（FR-010/S-08）：经 snapshotStructured
        if (typeof ops.snapshotStructured !== 'function') return opMissing('snapshotStructured');
        const off = intArg(args, 'offset');
        if (off.error) return { ok: false, output: off.error };
        const lim = intArg(args, 'limit');
        if (lim.error) return { ok: false, output: lim.error };
        const ml = intArg(args, 'maxLength');
        if (ml.error) return { ok: false, output: ml.error };
        const sec = enumListArg(args, 'sections', ['interactives', 'headings'], 'snapshot 结构化段');
        if (sec.error) return { ok: false, output: sec.error };
        const opts: PlatformSnapshotStructuredOptions = {
          offset: off.n,
          limit: lim.n,
          maxLength: ml.n,
          sections: (sec.list ?? undefined) as PlatformSnapshotStructuredOptions['sections'],
        };
        r = await ops.snapshotStructured(opts);
        break;
      }

      // ---- PER 感知 +4（FR-011~014；只读 → 'read' 免 ask） ----
      case 'interactives': {
        const off = intArg(args, 'offset');
        if (off.error) return { ok: false, output: off.error };
        const lim = intArg(args, 'limit');
        if (lim.error) return { ok: false, output: lim.error };
        const mi = intArg(args, 'maxItems');
        if (mi.error) return { ok: false, output: mi.error };
        if (typeof ops.interactives !== 'function') return opMissing('interactives');
        const opts: PlatformInteractivesOptions = {
          type: args.type || undefined,
          state: args.state || undefined,
          text: args.text || undefined,
          offset: off.n,
          limit: lim.n,
          maxItems: mi.n,
        };
        r = await ops.interactives(opts);
        break;
      }
      case 'read-element': {
        const sel = args.selector ?? '';
        if (!sel) return { ok: false, output: '✖ dom read-element 缺少 --selector <CSS 选择器>' };
        const fields: PlatformReadElementFields = {};
        let hasField = false;
        const boolOrList = (v: string | undefined): boolean | string[] | undefined => {
          if (v === undefined || v === '') return undefined;
          return v === 'true' ? true : csvList(v);
        };
        const attributes = boolOrList(args.attributes);
        if (attributes !== undefined) {
          fields.attributes = attributes;
          hasField = true;
        }
        const styles = boolOrList(args.styles);
        if (styles !== undefined) {
          fields.styles = styles;
          hasField = true;
        }
        if (args.text === 'true') {
          fields.text = true;
          hasField = true;
        }
        if (args.classList === 'true') {
          fields.classList = true;
          hasField = true;
        }
        if (args.geometry === 'true') {
          fields.geometry = true;
          hasField = true;
        }
        if (args.state === 'true') {
          fields.state = true;
          hasField = true;
        }
        if (args.value === 'true') {
          fields.value = true;
          hasField = true;
        }
        if (typeof ops.readElement !== 'function') return opMissing('readElement');
        const opts: PlatformReadElementOptions = { selector: sel, fields: hasField ? fields : undefined };
        r = await ops.readElement(opts);
        break;
      }
      case 'find': {
        const sel = args.selector ?? '';
        if (!sel) return { ok: false, output: '✖ dom find 缺少 --selector <CSS 选择器>' };
        const lim = intArg(args, 'limit');
        if (lim.error) return { ok: false, output: lim.error };
        if (typeof ops.findElements !== 'function') return opMissing('findElements');
        const opts: PlatformFindElementsOptions = {
          selector: sel,
          limit: lim.n,
          detail: flagTrue(args.detail) ? true : undefined,
        };
        r = await ops.findElements(opts);
        break;
      }
      case 'structure': {
        const parts = enumListArg(args, 'parts', ['children', 'outerHTML', 'links', 'images', 'headings', 'forms'], 'structure 读取部分');
        if (parts.error) return { ok: false, output: parts.error };
        const ml = intArg(args, 'maxLength');
        if (ml.error) return { ok: false, output: ml.error };
        if (typeof ops.readStructure !== 'function') return opMissing('readStructure');
        const opts: PlatformReadStructureOptions = {
          selector: args.selector || undefined,
          parts: (parts.list ?? undefined) as PlatformStructurePart[] | undefined,
          serialize: flagTrue(args.serialize) ? true : undefined,
          maxLength: ml.n,
        };
        r = await ops.readStructure(opts);
        break;
      }

      // ---- INT 交互 +8（FR-018~023；UI 副作用 → 'ui' 缺省 ask） ----
      case 'dblclick': {
        const sel = args.selector ?? '';
        if (!sel) return { ok: false, output: '✖ dom dblclick 缺少 --selector <CSS 选择器>' };
        if (typeof ops.dblclick !== 'function') return opMissing('dblclick');
        r = await ops.dblclick(sel);
        break;
      }
      case 'contextmenu': {
        const sel = args.selector ?? '';
        if (!sel) return { ok: false, output: '✖ dom contextmenu 缺少 --selector <CSS 选择器>' };
        if (typeof ops.contextmenu !== 'function') return opMissing('contextmenu');
        r = await ops.contextmenu(sel);
        break;
      }
      case 'long-press': {
        const sel = args.selector ?? '';
        if (!sel) return { ok: false, output: '✖ dom long-press 缺少 --selector <CSS 选择器>' };
        const ms = intArg(args, 'ms');
        if (ms.error) return { ok: false, output: ms.error };
        if (typeof ops.longPress !== 'function') return opMissing('longPress');
        r = await ops.longPress(sel, ms.n ?? 500);
        break;
      }
      case 'drag': {
        const from = args.from ?? '';
        const to = args.to ?? '';
        if (!from) return { ok: false, output: '✖ dom drag 缺少 --from <源 CSS 选择器>' };
        if (!to) return { ok: false, output: '✖ dom drag 缺少 --to <目标 CSS 选择器>' };
        if (typeof ops.dragDrop !== 'function') return opMissing('dragDrop');
        r = await ops.dragDrop(from, to);
        break;
      }
      case 'focus': {
        const sel = args.selector ?? '';
        if (!sel) return { ok: false, output: '✖ dom focus 缺少 --selector <CSS 选择器>' };
        if (typeof ops.focusEl !== 'function') return opMissing('focusEl');
        r = await ops.focusEl(sel);
        break;
      }
      case 'blur': {
        const sel = args.selector ?? '';
        if (!sel) return { ok: false, output: '✖ dom blur 缺少 --selector <CSS 选择器>' };
        if (typeof ops.blurEl !== 'function') return opMissing('blurEl');
        r = await ops.blurEl(sel);
        break;
      }
      case 'type': {
        const sel = args.selector ?? '';
        const hasText = args.text !== undefined;
        if (!sel) return { ok: false, output: '✖ dom type 缺少 --selector <CSS 选择器>' };
        if (!hasText) return { ok: false, output: '✖ dom type 缺少 --text <键入文本>' };
        if (typeof ops.typeText !== 'function') return opMissing('typeText');
        const opts: PlatformTypeTextOptions | undefined = flagTrue(args.clear) ? { clear: true } : undefined;
        r = await ops.typeText(sel, args.text, opts);
        break;
      }
      case 'press': {
        const key = args.key ?? args.combo ?? '';
        if (!key) return { ok: false, output: '✖ dom press 缺少 --key <按键或组合，如 Enter / ctrl+Enter>（--combo 为同义别名）' };
        if (typeof ops.pressKey !== 'function') return opMissing('pressKey');
        const opts: PlatformPressKeyOptions | undefined = args.selector ? { selector: args.selector } : undefined;
        r = await ops.pressKey(key, opts);
        break;
      }

      // ---- WR 写入 +8（FR-031~036；写 → 'write' 缺省 ask + ops 面回读校验） ----
      case 'set-text': {
        const sel = args.selector ?? '';
        const hasText = args.text !== undefined;
        if (!sel) return { ok: false, output: '✖ dom set-text 缺少 --selector <CSS 选择器>' };
        if (!hasText) return { ok: false, output: '✖ dom set-text 缺少 --text <文本内容>（空串清空可传 --text ""）' };
        if (typeof ops.setText !== 'function') return opMissing('setText');
        r = await ops.setText(sel, args.text);
        break;
      }
      case 'set-attr': {
        const sel = args.selector ?? '';
        const name = args.name ?? '';
        if (!sel) return { ok: false, output: '✖ dom set-attr 缺少 --selector <CSS 选择器>' };
        if (!name) return { ok: false, output: '✖ dom set-attr 缺少 --name <属性名>' };
        if (typeof ops.setAttr !== 'function') return opMissing('setAttr');
        r = await ops.setAttr(sel, name, args.value);
        break;
      }
      case 'remove-attr': {
        const sel = args.selector ?? '';
        const name = args.name ?? '';
        if (!sel) return { ok: false, output: '✖ dom remove-attr 缺少 --selector <CSS 选择器>' };
        if (!name) return { ok: false, output: '✖ dom remove-attr 缺少 --name <属性名>' };
        if (typeof ops.removeAttr !== 'function') return opMissing('removeAttr');
        r = await ops.removeAttr(sel, name);
        break;
      }
      case 'set-style': {
        const sel = args.selector ?? '';
        if (!sel) return { ok: false, output: '✖ dom set-style 缺少 --selector <CSS 选择器>' };
        const opts: PlatformSetStyleOptions = {};
        let modeCount = 0;
        const cssText = args.cssText;
        if (cssText !== undefined && cssText !== '') {
          opts.cssText = cssText;
          modeCount++;
        }
        const prop = args.prop;
        if (prop !== undefined && prop !== '') {
          if (args.value === undefined) {
            return { ok: false, output: '✖ dom set-style --prop 需配对 --value <属性值>（或改用 --cssText 整段覆盖 / --classAction 操作类名）' };
          }
          opts.properties = { [prop]: args.value };
          modeCount++;
        }
        const classAction = args.classAction;
        if (classAction !== undefined && classAction !== '') {
          if (!['add', 'remove', 'toggle'].includes(classAction)) {
            return { ok: false, output: `✖ dom set-style --classAction 需为 add/remove/toggle（收到 "${classAction}"）` };
          }
          const className = args.className ?? '';
          if (!className) return { ok: false, output: '✖ dom set-style --classAction 需配对 --className <类名>' };
          opts.classAction = classAction as PlatformSetStyleOptions['classAction'];
          opts.className = className;
          modeCount++;
        }
        if (modeCount === 0) {
          return { ok: false, output: '✖ dom set-style 需提供其一：--cssText <整段 CSS> / --prop <属性>+--value <值> / --classAction add|remove|toggle+--className' };
        }
        if (typeof ops.setStyle !== 'function') return opMissing('setStyle');
        r = await ops.setStyle(sel, opts);
        break;
      }
      case 'set-value': {
        const sel = args.selector ?? '';
        const hasValue = args.value !== undefined;
        if (!sel) return { ok: false, output: '✖ dom set-value 缺少 --selector <CSS 选择器>' };
        if (!hasValue) return { ok: false, output: '✖ dom set-value 缺少 --value <值>（空串可传 --value ""）' };
        if (typeof ops.setValue !== 'function') return opMissing('setValue');
        r = await ops.setValue(sel, args.value);
        break;
      }
      case 'fill': {
        const f = fillFieldsArg(args.fields);
        if (f.error) return { ok: false, output: f.error };
        if (typeof ops.fillForm !== 'function') return opMissing('fillForm');
        const plan: PlatformFillFormOptions = {
          fields: f.fields!,
          submit: flagTrue(args.submit) ? true : undefined,
        };
        r = await ops.fillForm(plan);
        break;
      }
      case 'add': {
        const tag = args.tag ?? '';
        const to = args.to ?? '';
        const mode = args.mode ?? 'append';
        if (!tag) return { ok: false, output: '✖ dom add 缺少 --tag <元素标签，如 div/button/input>' };
        if (!to) return { ok: false, output: '✖ dom add 缺少 --to <插入锚点 CSS 选择器>' };
        if (!['append', 'prepend', 'before', 'after'].includes(mode)) {
          return { ok: false, output: `✖ dom add --mode 需为 append/prepend/before/after（收到 "${mode}"）` };
        }
        const attrsRes = jsonObjectArg(args.attrs, 'attrs');
        if (attrsRes.error) return { ok: false, output: attrsRes.error };
        if (typeof ops.addElement !== 'function') return opMissing('addElement');
        const opts: PlatformAddElementOptions = {
          tag,
          text: args.text || undefined,
          attrs: attrsRes.obj,
          position: { mode: mode as PlatformInsertPosition, selector: to },
        };
        r = await ops.addElement(opts);
        break;
      }
      case 'remove': {
        const sel = args.selector ?? '';
        if (!sel) return { ok: false, output: '✖ dom remove 缺少 --selector <CSS 选择器>' };
        if (typeof ops.removeElement !== 'function') return opMissing('removeElement');
        r = await ops.removeElement(sel);
        break;
      }
      // ---- v4 touch（TASK-013/FR-024/ADR-010：G-01 验证门 PASS 分支；尾部追加，既有 27 头部序零漂移） ----
      case 'tap':
      case 'swipe':
      case 'pinch': {
        const kind = opName as 'tap' | 'swipe' | 'pinch';
        const target = args.selector?.trim() ? { selector: args.selector.trim() } : args.x !== undefined && args.y !== undefined ? { x: intOf(args.x), y: intOf(args.y) } : {};
        if (!args.selector?.trim() && (target.x === undefined || target.y === undefined)) {
          return { ok: false, output: `✖ dom ${kind} 需 --selector <CSS 选择器> 或 --x/--y 视口坐标` };
        }
        const opts: PlatformTouchOptions = {
          kind,
          ...target,
          ...(args.toX !== undefined && /^-?\d+$/.test(args.toX) ? { toX: Number(args.toX) } : {}),
          ...(args.toY !== undefined && /^-?\d+$/.test(args.toY) ? { toY: Number(args.toY) } : {}),
          ...(args.dx !== undefined && /^-?\d+$/.test(args.dx) ? { dx: Number(args.dx) } : {}),
          ...(args.dy !== undefined && /^-?\d+$/.test(args.dy) ? { dy: Number(args.dy) } : {}),
          ...(args.durationMs !== undefined && /^\d+$/.test(args.durationMs) ? { durationMs: Number(args.durationMs) } : {}),
          ...(args.delta !== undefined && /^-?\d+$/.test(args.delta) ? { delta: Number(args.delta) } : {}),
        };
        if (typeof ops.touchDispatch !== 'function') return opMissing('touchDispatch');
        r = await ops.touchDispatch(opts);
        break;
      }
    }
    return r.ok ? { ok: true, output: r.output } : { ok: false, output: r.output, error: r.error };
  } catch (err) {
    // FR-009/EC-003：DOM 授权/能力失败转译（会话不中断）
    const t = translateCapabilityError(err, 'DOM 操作');
    return { ok: false, output: t.output, error: t.error };
  }
}

/** 整数坐标解析（touch 坐标；非法返回 NaN 由调用方兜底报缺参）。 */
function intOf(v: string): number | undefined {
  return /^-?\d+$/.test(v) ? Number(v) : undefined;
}

// ---------- ToolEntry 工厂 ----------

const DOM_DESC =
  'dom：宿主页同源 DOM 操作子命令族（30 子命令；仅宿主应用自身页面，第三方/跨域 = F-14 插件边界 NG-002/NG-003）。' +
  ' 分组与子命令：' +
  ' [read 只读·免 ask] read-state（页面状态）/ snapshot（纯文本快照；--structured true 转结构化段 + 分页）/ interactives（可交互元素清单）/ read-element --selector（元素多面读取）/ find --selector（匹配计数/摘要）/ structure（结构/HTML/链接·图片·标题·表单集合）；' +
  ' [ui 交互·默认 ask] click --selector / hover --selector / scroll [--selector] [--dx --dy] / zoom --percent / fullscreen --on true|false / dblclick / contextmenu / long-press [--ms] / drag --from --to / focus / blur / press --key；' +
  ' [write 写入·默认 ask + 回读] type --selector --text / set-text / set-attr --name / remove-attr --name / set-style / set-value / fill --fields / add --tag --to / remove。' +
  ' 参数进 args 对象（flat，全可选，按子命令取用）：{"subcommand":"click","args":{"selector":"#btn"}}；' +
  ' selector 支持 v3 定位语法面 css:/裸 CSS/text=/text*=；' +
  ' 敏感字段（password/凭据）读回显脱敏、写默认 ask（FR-024）；合成事件 isTrusted=false 局限见帮助（NG-007）。';

const DOM_SCHEMA = {
  type: 'object',
  properties: {
    subcommand: {
      type: 'string',
      enum: SUBCOMMANDS,
      description: 'dom 子命令（30：...27 既有 + tap/swipe/pinch 合成 touch（v4/P2 门禁））。',
    },
    args: {
      type: 'object',
      properties: {
        // ---- v2 既有（语义保持） ----
        selector: { type: 'string', description: 'CSS 定位串（click/hover/scroll/read-element/find/structure/dblclick/contextmenu/long-press/focus/blur/type/set-text/set-attr/remove-attr/set-style/set-value/remove/add --to）。支持 v3 定位语法面（css:/裸 CSS/text=/text*=，FR-015）。' },
        dx: { type: 'string', description: 'scroll 横向像素。' },
        dy: { type: 'string', description: 'scroll 纵向像素。' },
        percent: { type: 'string', description: 'zoom 百分比（100 = 100%）。' },
        on: { type: 'string', description: 'fullscreen "true"/"false"。' },
        // ---- click 坐标/偏移升级（FR-020） ----
        offsetX: { type: 'string', description: 'click 元素内偏移 X（相对目标左上角；与 x 互斥）。' },
        offsetY: { type: 'string', description: 'click 元素内偏移 Y（相对目标左上角；与 y 互斥）。' },
        x: { type: 'string', description: 'click 视口坐标 X（elementFromPoint 解析目标；与 offsetX 互斥）。' },
        y: { type: 'string', description: 'click 视口坐标 Y。' },
        // ---- snapshot 结构化段（FR-010） ----
        structured: { type: 'string', description: 'snapshot "true" = 输出结构化段（interactives/headings）+ 分页；缺省 = v2 纯文本快照兼容。' },
        sections: { type: 'string', description: 'snapshot --structured 段选择：interactives/headings 逗号分隔。' },
        maxLength: { type: 'string', description: 'snapshot 结构化段 / structure 输出预算字符上限（默认 20000，超限截断标记）。' },
        // ---- interactives（FR-011） ----
        type: { type: 'string', description: 'interactives 交互类型过滤（button/a[href]/input/select/textarea/[contenteditable]）。' },
        state: { type: 'string', description: 'interactives 状态过滤（disabled/checked/selected/readonly/visible）；read-element 读交互状态开关 "true"。' },
        text: { type: 'string', description: 'interactives 文本包含过滤；type/set-text 的目标文本内容。' },
        offset: { type: 'string', description: 'interactives/snapshot 结构化段分页偏移（续读）。' },
        limit: { type: 'string', description: 'interactives/snapshot 结构化段分页条数；find 摘要条数上限。' },
        maxItems: { type: 'string', description: 'interactives 清单预算上限（默认 200 条）。' },
        // ---- read-element（FR-012） ----
        attributes: { type: 'string', description: 'read-element 读属性："true"=全部；逗号分隔属性名=指定。' },
        styles: { type: 'string', description: 'read-element 读 computed style："true"=全部可读；逗号分隔 CSS 属性名=指定。想知道元素颜色/背景/字体/字号 → --styles color/background/font-size/font-weight 或 --styles true（全部）。' },
        classList: { type: 'string', description: 'read-element 读 classList 开关 "true"。' },
        geometry: { type: 'string', description: 'read-element 读几何（rect/可见性/滚动位）开关 "true"。' },
        value: { type: 'string', description: 'read-element 读表单值开关 "true"（敏感字段脱敏 FR-024）；set-value/set-attr/set-style 的写入值。' },
        // ---- find / structure（FR-013/014） ----
        detail: { type: 'string', description: 'find "true" = 附稳定索引/唯一化建议选择器（供后续精确定位）。' },
        parts: { type: 'string', description: 'structure 读取部分：children/outerHTML/links/images/headings/forms 逗号分隔（缺省 = 实现默认）。' },
        serialize: { type: 'string', description: 'structure "true" = 整页序列化（documentElement.outerHTML，预算护栏）。' },
        // ---- 交互族（FR-018~021） ----
        ms: { type: 'string', description: 'long-press 保持时长 ms（默认 500）。' },
        from: { type: 'string', description: 'drag 源 selector。' },
        to: { type: 'string', description: 'drag 目标 selector；add 的插入锚点 selector。' },
        key: { type: 'string', description: 'press 按键/组合（Enter/Tab/Escape/箭头/ctrl+Alt+x 修饰符组合；--combo 同义别名）。' },
        clear: { type: 'string', description: 'type "true" = 键入前清空目标既有值（React 受控兼容 native setter）。' },
        // ---- 写入族（FR-031~036） ----
        name: { type: 'string', description: 'set-attr/remove-attr 属性名（data-*/aria-*/href/class 等）。' },
        cssText: { type: 'string', description: 'set-style 覆盖式整段样式（style.cssText；与 --prop 互斥）。' },
        prop: { type: 'string', description: 'set-style 增量单属性名（需配对 --value）。' },
        classAction: { type: 'string', description: 'set-style classList 操作：add/remove/toggle（需配对 --className）。' },
        className: { type: 'string', description: 'set-style classAction 目标类名。' },
        fields: { type: 'string', description: 'fill 字段表 JSON：对象 {"#user":"alice"} 或数组 [{"selector","value","byLabel"?}]（select 按 label 可选 byLabel）。' },
        submit: { type: 'string', description: 'fill "true" = 填写后 requestSubmit 提交整个表单。' },
        tag: { type: 'string', description: 'add 新元素标签（div/button/input/…）。' },
        attrs: { type: 'string', description: 'add 新元素属性 JSON 对象（{"data-x":"1","class":"c"}）。' },
        mode: { type: 'string', description: 'add 插入位置：append/prepend（锚点子树尾/首）/before/after（锚点兄弟后/前）。' },
      },
    },
  },
  required: ['subcommand'],
} as const;

export function domHelp(): string {
  return [
    'dom —— 宿主页同源 DOM 自动化（浏览器最独特生态位；30 子命令：v2 7 + v3 20 + v4 touch 3）',
    '用法：dom <read-state|click|hover|scroll|zoom|fullscreen|snapshot|interactives|read-element|find|structure|dblclick|contextmenu|long-press|drag|focus|blur|type|press|set-text|set-attr|remove-attr|set-style|set-value|fill|add|remove> [--参数 ...]',
    '',
    'risk 分级（FR-005，修复 IMP-4）：',
    '  [read 只读·免 ask]  read-state / snapshot / interactives / read-element / find / structure',
    '  [ui 交互·默认 ask]  click / hover / scroll / zoom / fullscreen / dblclick / contextmenu / long-press / drag / focus / blur / press',
    '  [write 写入·默认 ask + 回读校验]  type / set-text / set-attr / remove-attr / set-style / set-value / fill / add / remove',
    '  → 只读子命令不触发确认（v2 IMP-4 修复：v2 整工具 risk:ui 锁死所有子命令，v3 按子命令分级）',
    '',
    '子命令：',
    '  read-state  读宿主页状态（url/title/readyState/origin/安全上下文等）',
    '  snapshot    纯文本 DOM 快照（v2 兼容）；--structured true 输出结构化段（interactives/headings）并支持 --offset/--limit 分页续读、--maxLength 预算（默认 20000，超限截断标记）',
    '  interactives 可交互元素清单（--type/--state/--text 过滤 + --offset/--limit 分页 + --maxItems 预算；password 只出类型不出值 FR-024）',
    '  read-element --selector 单元素多面读取（--attributes/--text/--styles/--classList/--geometry/--state/--value 面可选组合）',
    '    颜色示例：dom read-element --selector \'<元素>\' --styles color（--styles true = 读全量 computed style，超预算截断带标记）',
    '    read 域区分：页面元素视觉样式用 dom read-element --styles；图文档内容/结构用 lgdl-web-cli。',
    '  find --selector  元素定位查询（匹配数/摘要/--limit；0 匹配 = ok + 计数非错误 EC-001；--detail 附唯一化建议）',
    '  structure  [--selector] [--parts children|outerHTML|links|images|headings|forms] [--serialize true] [--maxLength]',
    '  click --selector [--offsetX --offsetY | --x --y]（selector-only 旧调用零回归 FR-020）',
    '  hover --selector / scroll [--selector] [--dx 像素] [--dy 像素] / zoom --percent / fullscreen --on true|false',
    '  dblclick --selector / contextmenu --selector（右键）/ long-press --selector [--ms 默认500]',
    '  drag --from <源> --to <目标>（HTML5 DnD 序列；目标不处理合成事件 → 可读提示 EC-007）',
    '  focus --selector / blur --selector（focus 前可聚焦判定；不可聚焦 → 可读错误 FR-021）',
    '  type --selector --text [--clear true]（字符级事件 + React 受控 native setter 兼容 ADR-004）',
    '  press --key <Enter|Tab|ctrl+Enter|…> [--selector 先 focus]（keydown→keyup 序列 FR-023）',
    '  set-text --selector --text（textContent 覆盖语义，显式清空子节点；写后回读校验）',
    '  set-attr --selector --name [--value]（value 缺省 = 布尔属性形态）/ remove-attr --selector --name',
    '  set-style --selector （--cssText 覆盖 | --prop+--value 增量 | --classAction add|remove|toggle+--className）',
    '  set-value --selector --value（React 受控兼容基元：native setter + input/change）',
    '  fill --fields <JSON 字段表> [--submit true]（控件类型化填写；select 可选 byLabel；file input 显式不可用 NG-004）',
    '  add --tag <标签> --to <锚点> [--text] [--attrs JSON] [--mode append|prepend|before|after] / remove --selector',
    '',
    '定位语法（FR-015）：--selector 支持 css: 前缀（可选）/ 裸 CSS 串（基线）/ text=精确文本 / text*=包含文本；role=/xpath= 不支持（role 经 interactives 清单、xpath 经 page-eval，EC-002 不静默当 CSS）。',
    '边界（NG-002/NG-003）：执行目标 = 宿主应用自身同源页面；第三方/跨域站点由插件运行时（F-14 线）承载，本工具不做。',
    '安全：写类子命令（UI 副作用/写入）受权限门禁 PRM 约束（risk:ui/write → 默认 ask）；只读子命令免 ask（FR-005/IMP-4 修复）。机制先例 lgdl-web-op-cli 的 LGDL 形态不动（NG-006）。',
    '敏感字段（FR-024）：password/凭据类字段读侧回显脱敏（占位/长度/类型代替，无明文）；写侧默认 ask + 需场景 trusted 声明；审计不回显敏感值。',
    '合成事件局限（NG-007）：DOM 事件派发均为非 isTrusted 合成事件 —— 对依赖可信事件的框架绑定不承诺生效；只承诺标准事件序列 + React 受控兼容路径（native setter + input/change）。',
    '合成 touch（v4/FR-024，P2 验证门 G-01 已过）：dom tap/swipe/pinch —— TouchEvent 构造序列（touchstart→touchmove×n→touchend），isTrusted=false；不承诺惯性/手势识别被目标接受（NG-007 同族）；目标不处理合成事件 → 页面行为不变（page-eval 备用）。场景默认关（LGDL deny 规则；TASK-013/014）。',

    'CSP/授权：DOM 能力受浏览器授权约束，失败按可读错误转译（FR-009）；CSP 缺失 unsafe-eval 时 evaluate 类能力受限（本工具无 evaluate，见 page-eval 工具）。',
    '归属表（FR-025/ADR-012）：以下需扩展能力 → 统一「不支持 + 归属」转译（不静默降级）：多标签/窗口、下载管理、整页截图、HttpOnly/跨域 cookie、DevTools 全局面网络、跨导航持久订阅、closed shadow、跨域 iframe、浏览器原生对话框、真受信输入、权限模拟、file 真路径注入 —— 归属 F-14 扩展宿主/CDP（ext-attribution.ts，FR-026 契约预留）',
  ].join('\n');
}

/** 创建 dom 工具条目（env.dom.ops 注入；subcommandRisks = PRM 子命令级裁决单一数据源）。 */
export function createDomToolEntry(env: PlatformEnv): ToolEntry {
  return {
    name: 'dom',
    summary: '宿主页同源 DOM 操作子命令族（30：read/感知 + ui/交互 + write/写入 + v4 touch；只读免 ask）',
    schema: { name: 'dom', description: DOM_DESC, parameters: DOM_SCHEMA as unknown as Record<string, unknown> },
    risk: 'ui',
    group: 'ui',
    // plan §2.3.3：read 组免 ask；ui/write 组默认 ask；entry.risk 保持 'ui' = v2 回退面零变化
    subcommandRisks: {
      'read-state': 'read',
      snapshot: 'read',
      interactives: 'read',
      'read-element': 'read',
      find: 'read',
      structure: 'read',
      click: 'ui',
      hover: 'ui',
      scroll: 'ui',
      zoom: 'ui',
      fullscreen: 'ui',
      dblclick: 'ui',
      contextmenu: 'ui',
      'long-press': 'ui',
      drag: 'ui',
      focus: 'ui',
      blur: 'ui',
      press: 'ui',
      type: 'write',
      'set-text': 'write',
      'set-attr': 'write',
      'remove-attr': 'write',
      'set-style': 'write',
      'set-value': 'write',
      fill: 'write',
      add: 'write',
      remove: 'write',
      // v4 TCH（TASK-013/FR-024：合成 touch = UI 副作用面，默认 ask；场景默认关经 LGDL deny 规则）
      tap: 'ui',
      swipe: 'ui',
      pinch: 'ui',
    },
    executor: async (tc) => executeDomTool(env.dom?.ops, tc.subcommand, tc.args),
    help: domHelp,
  };
}
