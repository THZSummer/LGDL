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
import { createBrowserDomOps } from './platform-dom.js';

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

/** DOM 操作结果（dom-* 子命令统一返回面）。
 *
 *  v3 additive（ADR-008/FR-002）：`dataUrl?` 为可选追加字段 —— 截图大 payload 独立
 *  载体（PNG dataURL），**不进 output 大文本**（上下文预算 P-03/FR-028/ADR-003）；
 *  无截图的既有 op 不返回该字段（v2 零变化）。
 */
export interface PlatformDomOpResult {
  ok: boolean;
  output: string;
  error?: string;
  /** 截图载体（PNG dataURL；chrome screenshot FR-028）。缺省 undefined = 无截图 payload。 */
  dataUrl?: string;
}

// ---------- v3 P1：PlatformDomOps additive 扩展类型面（ADR-008/FR-002，TASK-003） ----------
// 全部为纯数据形态（base 不含 DOM lib，NFR-002：元素/文档一律以 selector 定位串表达，
// 不引用 Element 等 DOM 类型）；定位串统一为 v3 定位语法面（css:/裸 CSS/text=/text*=，
// FR-015，locator.ts 解析）。字段注释标注「对应 FR / dom 子命令或工具」供实现/审查对照。

/** click 坐标/偏移选项（FR-020，dom click 升级；缺省 = selector-only 既有语义 v2 零回归）。 */
export interface PlatformClickOptions {
  /** 元素内偏移 X（相对目标元素左上角，经 FR-012 几何读取；与 x/y 互斥）。 */
  offsetX?: number;
  /** 元素内偏移 Y（相对目标元素左上角；与 x/y 互斥）。 */
  offsetY?: number;
  /** 视口坐标 X（elementFromPoint 解析目标；与 offsetX/offsetY 互斥）。 */
  x?: number;
  /** 视口坐标 Y（elementFromPoint 解析目标）。 */
  y?: number;
}

/** interactives 选项（FR-011，dom interactives 子命令）。 */
export interface PlatformInteractivesOptions {
  /** 交互类型过滤：button / a[href] / input / select / textarea / [contenteditable] 等。 */
  type?: string;
  /** 状态过滤：disabled / checked / selected / readonly / visible 等。 */
  state?: string;
  /** 文本包含过滤（标签文本/可访问名 aria-label·title·关联文本）。 */
  text?: string;
  /** 分页偏移（从第几条条目开始返回）。 */
  offset?: number;
  /** 分页条数（本次返回条数上限）。 */
  limit?: number;
  /** 清单预算上限（默认 200 条，I-08/S-08；超限 → 截断标记 + 总数元信息）。 */
  maxItems?: number;
}

/** readElement 读取面选择（FR-012，dom read-element 子命令）。 */
export interface PlatformReadElementFields {
  /** 属性读取：true=全部属性；string[]=指定属性名（缺省不读）。 */
  attributes?: boolean | string[];
  /** 文本读取（textContent）。 */
  text?: boolean;
  /** computed style 读取：true=全部可读属性；string[]=指定 CSS 属性名。 */
  styles?: boolean | string[];
  /** classList 读取。 */
  classList?: boolean;
  /** 几何读取（getBoundingClientRect / 可见性 / 滚动位）。 */
  geometry?: boolean;
  /** 交互状态读取（disabled/checked/selected/expanded/required）。 */
  state?: boolean;
  /** 表单值读取（input.value / select 选中 / textarea.value；敏感字段脱敏 FR-024）。 */
  value?: boolean;
}

/** readElement 选项（FR-012，dom read-element；单元素首匹配）。 */
export interface PlatformReadElementOptions {
  /** 目标（定位语法面 css:/裸 CSS/text=/text*=，FR-015；首匹配）。 */
  selector: string;
  /** 读取面组合（缺省 = 实现默认读取面）。 */
  fields?: PlatformReadElementFields;
}

/** findElements 选项（FR-013，dom find 子命令：存在性/数量/摘要查询）。 */
export interface PlatformFindElementsOptions {
  /** 定位语法面（css:/裸 CSS/text=/text*=，FR-015）。 */
  selector: string;
  /** 摘要返回条数上限（超限截断标记；缺省 = 实现预算默认）。 */
  limit?: number;
  /** true = 附稳定索引/唯一化建议选择器（供后续 click/read 精确定位，EC-002 提示语义）。 */
  detail?: boolean;
}

/** structure 读取部分（FR-014，dom structure 子命令）。 */
export type PlatformStructurePart = 'children' | 'outerHTML' | 'links' | 'images' | 'headings' | 'forms';

/** readStructure 选项（FR-014，dom structure；元素级/页级）。 */
export interface PlatformReadStructureOptions {
  /** 目标元素（缺省 = 页面级/文档根）。 */
  selector?: string;
  /** 读取部分：children=子节点概览；outerHTML=目标结构序列化；
   *  links/images/headings/forms=页面集合（链接 href/图片 src/标题层级/表单控件清单）。 */
  parts?: PlatformStructurePart[];
  /** true = 整页序列化（documentElement.outerHTML，预算护栏）。 */
  serialize?: boolean;
  /** 输出预算字符上限（默认 20000，超限截断标记 + 元信息，NFR-003/EC-010）。 */
  maxLength?: number;
}

/** snapshotStructured 选项（FR-010/S-08，dom snapshot 结构化段 + 分页；纯文本态由既有 snapshot 承载）。 */
export interface PlatformSnapshotStructuredOptions {
  /** 结构化段分页偏移（续读语义）。 */
  offset?: number;
  /** 分页条数。 */
  limit?: number;
  /** 预算字符上限（默认 20000 保持 v2 兼容，可配；超限截断标记/总长/续读提示）。 */
  maxLength?: number;
  /** 结构化段选择：interactives=可交互元素段；headings=标题结构段（缺省 = 实现默认段集）。 */
  sections?: Array<'interactives' | 'headings'>;
}

/** typeText 选项（FR-022/ADR-004，dom type 子命令；字符级事件序列 + React 受控兼容 native setter）。 */
export interface PlatformTypeTextOptions {
  /** 键入前清空目标既有值（缺省 false：在现有值上键入/替换选区，由实现定）。 */
  clear?: boolean;
}

/** pressKey 选项（FR-023，dom press 子命令）。 */
export interface PlatformPressKeyOptions {
  /** 目标：先 focus 的 selector（缺省 = 当前聚焦元素；组合键派发 keydown→keyup 序列）。 */
  selector?: string;
}

/** setStyle 选项（FR-033，dom set-style 子命令）。 */
export interface PlatformSetStyleOptions {
  /** 覆盖式样式（style.cssText 整段覆盖；与 properties 互斥）。 */
  cssText?: string;
  /** 增量式单属性写入（style[name]=value；与 cssText 互斥）。 */
  properties?: Record<string, string>;
  /** classList 操作（add/remove/toggle）。 */
  classAction?: 'add' | 'remove' | 'toggle';
  /** classAction 目标类名。 */
  className?: string;
}

/** fillForm 单字段项（FR-035，dom fill 子命令）。 */
export interface PlatformFillField {
  /** 控件 selector（定位语法面 FR-015）。 */
  selector: string;
  /** 写入值：text/number/email/textarea = 字符串；
   *  select = option value（byLabel=true 时按 option label 匹配）；
   *  checkbox/radio = 按勾选目标处理（非空值即勾选，FR-035）。 */
  value: string;
  /** true = select 按 option label 匹配（缺省按 option value 匹配）。 */
  byLabel?: boolean;
}

/** fillForm 选项（FR-035，dom fill：多字段类型化填写 + 可选提交）。 */
export interface PlatformFillFormOptions {
  /** 多字段填写表（按序逐字段执行 + 回读校验，EC-006）。 */
  fields: PlatformFillField[];
  /** 填写后提交整个表单（requestSubmit/隐式提交；缺省不提交）。 */
  submit?: boolean;
}

/** addElement 插入位置（FR-036，dom add 子命令）。 */
export type PlatformInsertPosition = 'append' | 'prepend' | 'before' | 'after';

/** addElement 选项（FR-036，dom add 子命令）。 */
export interface PlatformAddElementOptions {
  /** 新元素标签（div/button/input/…）。 */
  tag: string;
  /** 文本内容（textContent；缺省无文本）。 */
  text?: string;
  /** 属性集合（data-*、aria-*、class、href 等均可）。 */
  attrs?: Record<string, string>;
  /** 插入位置：append/prepend = 目标 selector 子树尾/首；before/after = 目标 selector 兄弟前/后。 */
  position: { mode: PlatformInsertPosition; selector: string };
}

/** waitFor 条件类型（FR-025，wait 工具）。 */
export type PlatformWaitKind = 'element' | 'visible' | 'interactable' | 'gone' | 'text';

/** waitFor 单条件（FR-025/ADR-005）。 */
export interface PlatformWaitCondition {
  /** element=selector 匹配存在；visible=可见（几何非零 + 非 display:none）；
   *  interactable=可见且非 disabled；gone=消失/不存在；text=文本出现（text= 语法面 O-011）。 */
  kind: PlatformWaitKind;
  /** 目标定位（element/visible/interactable/gone 用；text= 语法面 FR-015）。 */
  selector?: string;
  /** 文本条件（kind=text）：text=精确文本 / text*=包含文本。 */
  text?: string;
}

/** waitFor 选项（FR-025，wait 工具 ops 面；MutationObserver 优先 + 轮询降级 + 统一超时含最后状态）。 */
export interface PlatformWaitForOptions {
  /** 等待条件（多条件语义见 mode）。 */
  conditions: PlatformWaitCondition[];
  /** any=任一命中即返回 / all=全部命中（缺省 any）。 */
  mode?: 'any' | 'all';
  /** 超时 ms（默认可配；上限 30s 钳制）。 */
  timeout?: number;
  /** 轮询降级间隔 ms（默认 200；observer 通道不受此限，NFR-007 无空转）。 */
  interval?: number;
}

/** evaluate 选项（FR-037/ADR-002，page-eval 工具 ops 面；宿主页同源 F12 console 等效）。 */
export interface PlatformEvaluateOptions {
  /** 执行形态：expression=求值表达式（返回序列化结果）/ script=语句序列（缺省 expression）。 */
  as?: 'expression' | 'script';
  /** 执行预算 ms（异步超时中止；同步死循环不可中断 = 平台硬约束，P-01 工程公开于工具帮助面）。 */
  timeoutMs?: number;
  /** 结果预算字符上限（超限截断标记，FR-037/EC-004）。 */
  maxLength?: number;
}

/** extractData 抽取形态（FR-038，extract 工具）。 */
export type PlatformExtractKind = 'table' | 'list' | 'links' | 'images' | 'meta';

/** extractData 选项（FR-038/042，extract 工具 ops 面；结果携带来源上下文由工具层封装）。 */
export interface PlatformExtractDataOptions {
  /** 抽取形态：table=表格行×列 JSON；list=列表/卡片（+fields 字段映射）；
   *  links=链接集合；images=图片集合；meta=页面元数据（title/meta）。 */
  kind: PlatformExtractKind;
  /** 目标容器 selector（table/list/links/images；meta 忽略；定位语法面 FR-015）。 */
  selector?: string;
  /** list 字段映射：{字段名: 相对 list 项的定位 selector/text=}（kind=list 用）。 */
  fields?: Record<string, string>;
  /** 单次抽取条数上限（默认 200；超限截断标记 + 已采保留，FR-042/EC-011）。 */
  maxItems?: number;
}

/** screenshot 选项（FR-028/ADR-003，chrome screenshot 工具 ops 面）。 */
export interface PlatformScreenshotOptions {
  /** 截图范围：viewport=视口级（缺省）；element=selector 目标元素级近似；
   *  fullpage=整页级 → 实现返回「不支持 + F-14/CDP 归属」说明（FR-028 out）。 */
  mode?: 'viewport' | 'element' | 'fullpage';
  /** mode=element 时的目标 selector（定位语法面）。 */
  selector?: string;
  /** 输出目标宽（可选；缺省 = 视口/元素实际尺寸）。 */
  width?: number;
  /** 输出目标高（可选）。 */
  height?: number;
}

/**
 * DOM 操作面（dom-tools 子命令族执行依赖，P1 additive；无 op-cli React handler 依赖）。
 * 执行目标 = 宿主应用自身同源页面（NG-003：第三方/跨域 = F-14 边界）。
 *
 * v3 additive 契约（ADR-008/FR-002/FR-020）：既有 7 方法（readState~snapshot）签名零改动
 * （click 仅追加**可选** opts?，selector-only 旧调用方零回归）；#1~#25 全部新能力方法
 * **可选**（`?`）——nodeEnv 不预置（缺省 undefined）→ 未注入面调用由 dom executor 返回
 * 「该能力在当前环境未注入」可读错误（dom-tools.ts:32-38 语义），平台既有代码零编译破坏。
 * 真实浏览器实现由 platform-dom.ts `createBrowserDomOps()` 装配（TASK-004，4 桩补真）。
 * 方法名 ↔ dom 子命令/工具映射见各方法 JSDoc。
 */
export interface PlatformDomOps {
  /** 读宿主页状态（URL/title/关键区域；v3 多字段升级在浏览器实现内完成，FR-009）。 */
  readState(): Promise<PlatformDomOpResult>;
  /** 点击元素（CSS 选择器；v3 可选坐标/偏移点击 opts，FR-020）。 */
  click(selector: string, opts?: PlatformClickOptions): Promise<PlatformDomOpResult>;
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

  // ---- v3 P1 新能力（全部可选，缺省 undefined；FR-002/ADR-008）----

  /** #1 可交互元素清单（dom interactives 子命令，FR-011；password 只出类型不出值 FR-024）。 */
  interactives?(opts?: PlatformInteractivesOptions): Promise<PlatformDomOpResult>;
  /** #2 单元素多面读取（dom read-element 子命令，FR-012）。 */
  readElement?(opts: PlatformReadElementOptions): Promise<PlatformDomOpResult>;
  /** #3 元素定位查询（dom find 子命令，FR-013；0 匹配 = ok:true + 计数非错误，EC-001）。 */
  findElements?(opts: PlatformFindElementsOptions): Promise<PlatformDomOpResult>;
  /** #4 结构/HTML 读取（dom structure 子命令，FR-014）。 */
  readStructure?(opts: PlatformReadStructureOptions): Promise<PlatformDomOpResult>;
  /** #5 结构化快照 + 分页（dom snapshot 结构化段，FR-010/S-08）。 */
  snapshotStructured?(opts?: PlatformSnapshotStructuredOptions): Promise<PlatformDomOpResult>;
  /** #6 双击事件序列（dom dblclick 子命令，FR-018）。 */
  dblclick?(selector: string): Promise<PlatformDomOpResult>;
  /** #7 右键 contextmenu 事件（dom contextmenu 子命令，FR-018）。 */
  contextmenu?(selector: string): Promise<PlatformDomOpResult>;
  /** #8 长按（dom long-press 子命令，FR-019；ms 可配，缺省 500）。 */
  longPress?(selector: string, ms: number): Promise<PlatformDomOpResult>;
  /** #9 HTML5 拖放（dom drag 子命令，FR-019；目标不处理合成事件 → 可读提示 EC-007）。 */
  dragDrop?(from: string, to: string): Promise<PlatformDomOpResult>;
  /** #10 focus（dom focus 子命令，FR-021；可聚焦性判定，不可聚焦 → 可读错误）。 */
  focusEl?(selector: string): Promise<PlatformDomOpResult>;
  /** #10 blur（dom blur 子命令，FR-021）。 */
  blurEl?(selector: string): Promise<PlatformDomOpResult>;
  /** #11 文本键入（dom type 子命令，FR-022；字符级事件 + React 受控 native setter 基元 ADR-004）。 */
  typeText?(selector: string, text: string, opts?: PlatformTypeTextOptions): Promise<PlatformDomOpResult>;
  /** #12 组合键派发（dom press 子命令，FR-023；combo 如 "ctrl+Enter"/"Enter"/"Tab"）。 */
  pressKey?(combo: string, opts?: PlatformPressKeyOptions): Promise<PlatformDomOpResult>;
  /** #13 设元素文本（dom set-text 子命令，FR-031；textContent 覆盖语义 + 回读校验）。 */
  setText?(selector: string, text: string): Promise<PlatformDomOpResult>;
  /** #14 设元素属性（dom set-attr 子命令，FR-032；value 缺省 = 布尔属性形态 setAttribute(name,'')）。 */
  setAttr?(selector: string, name: string, value?: string): Promise<PlatformDomOpResult>;
  /** #14 移除元素属性（dom remove-attr 子命令，FR-032）。 */
  removeAttr?(selector: string, name: string): Promise<PlatformDomOpResult>;
  /** #15 元素样式写入（dom set-style 子命令，FR-033；cssText 覆盖 / 单属性增量 / classList 操作）。 */
  setStyle?(selector: string, opts: PlatformSetStyleOptions): Promise<PlatformDomOpResult>;
  /** #16 表单值设值（dom set-value 子命令，FR-034；native setter + input/change = React 受控基元）。 */
  setValue?(selector: string, value: string): Promise<PlatformDomOpResult>;
  /** #17 表单类型化填写（dom fill 子命令，FR-035；file input 显式不可用 NG-004）。 */
  fillForm?(plan: PlatformFillFormOptions): Promise<PlatformDomOpResult>;
  /** #18 创建插入元素（dom add 子命令，FR-036）。 */
  addElement?(opts: PlatformAddElementOptions): Promise<PlatformDomOpResult>;
  /** #18 删除元素（dom remove 子命令，FR-036）。 */
  removeElement?(selector: string): Promise<PlatformDomOpResult>;
  /** #19 条件等待（wait 工具 ops 面，FR-025/ADR-005；超时返回含最后观察状态，不中断会话）。 */
  waitFor?(opts: PlatformWaitForOptions): Promise<PlatformDomOpResult>;
  /** #20 宿主页 evaluate（page-eval 工具 ops 面，FR-037；F12 console 等效同源执行）。 */
  evaluate?(code: string, opts?: PlatformEvaluateOptions): Promise<PlatformDomOpResult>;
  /** #21 声明式结构化抽取（extract 工具 ops 面，FR-038）。 */
  extractData?(opts: PlatformExtractDataOptions): Promise<PlatformDomOpResult>;
  /** #22 触发打印（chrome print 子命令，FR-026；打印对话框用户侧确认）。 */
  printPage?(): Promise<PlatformDomOpResult>;
  /** #23 会话历史导航（chrome back/forward 子命令，FR-027；delta=-1 后退 / +1 前进）。 */
  historyNav?(delta: number): Promise<PlatformDomOpResult>;
  /** #24 刷新（chrome reload 子命令，FR-027；破坏性 → 门禁默认 ask，EC-009）。 */
  reloadPage?(): Promise<PlatformDomOpResult>;
  /** #25 截图（chrome screenshot 子命令，FR-028/ADR-003；dataUrl 载体回填 PlatformDomOpResult.dataUrl）。 */
  screenshot?(opts: PlatformScreenshotOptions): Promise<PlatformDomOpResult>;
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
      const clip = n?.clipboard;
      // 成员调用保 this 绑定（真实浏览器 navigator.clipboard 方法需原对象调用，IMP：解构调用抛 Illegal invocation）
      if (!clip?.readText) throw namedError('NotFoundError', 'navigator.clipboard.readText 不可用（需安全上下文）');
      return clip.readText();
    },
    async writeText(text: string) {
      const n = nav();
      const clip = n?.clipboard;
      if (!clip?.writeText) throw namedError('NotFoundError', 'navigator.clipboard.writeText 不可用（需安全上下文）');
      await clip.writeText(text);
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

  /** 浏览器面真实 PlatformDomOps（TASK-004：4 桩补真 + ~25 新能力；DOM 触碰收敛 platform-dom.ts）。 */
  const domOps: PlatformDomOps = createBrowserDomOps();

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
