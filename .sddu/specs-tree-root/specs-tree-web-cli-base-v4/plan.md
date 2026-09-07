# 技术计划：specs-tree-web-cli-base-v4（web-cli-base v4：浏览器外壳纵深与事件流——事件 push/缓冲/订阅通道 + 页内可达切面快赢 + 扩展线分界与契约预留）

> **文档定位**: SDDU 技术方案 — 记录架构设计、方案对比和 ADR，作为 tasks 阶段的输入
> **前置依赖**: spec.md v1.0（30 FR 十一组 + 8 NFR + 12 EC + 10 AC，已冻结）+ discovery.md v1.1（11 项排查 / §4.1 载体分层 / Q-001~Q-017 / O-001~O-012）+ 作者 2026-09-07 裁决（R-01~R-03 + 三裁二 + I-01~I-04 核签：裁决 1 范围判定标准「是否依赖浏览器扩展」/ 裁决 2 NET P2 门禁 in deny / 裁决 3 TCH 最小浏览器验证门 / 裁决 4 C-11 权限模拟 out）+ 上游 v2/v3 产物（plan.md 9/8 ADR / platform.ts / platform-dom.ts / dom-tools.ts / chrome-tools.ts / permission.ts / sensitive.ts / router.ts / session.ts）
> **创建人**: SDDU Plan Agent
> **创建时间**: 2026-09-07
> **版本**: v1.0
> **更新人**: SDDU Plan Agent
> **更新时间**: 2026-09-07
> **更新说明**: 初始创建（30 FR → 模块/方法/工具面映射；事件 push/缓冲/订阅通道机制设计（订阅 API/缓冲模型/lastId/预算护栏/开关）；PlatformEnv 新可选缝 `events` + PlatformDomOps/既有工具 additive 扩展；EVT/DIA/NET/CK/CLP/SHD/TCH/EXT 分模块技术方案；12 个 ADR；任务切分建议交 sddu-tasks）

## 1. 前置检查
> 启动技术规划前必须验证的前置条件

| 检查项 | 状态 |
|--------|:--:|
| spec.md 存在（`.sddu/specs-tree-root/specs-tree-web-cli-base-v4/spec.md` v1.0，30 FR / 8 NFR / 12 EC / 10 AC） | ✅ |
| 外部 API 文档缓存 | ✅ 不适用（本 Feature 零外部服务引用：全部依赖浏览器 Web 标准 API（addEventListener/patch/override/document.cookie/clipboard/TouchEvent），无第三方 API 需缓存） |
| 前置依赖已满足（v4 开发基线 `feature/web-cli-base-v2` 分支代码位已核实：platform.ts / dom-tools.ts / chrome-tools.ts / permission.ts / sensitive.ts / router.ts / assembly.ts / session.ts / AskDialog.tsx；v2/v3 均在库） | ✅ |
| 开放点状态（spec §9.1 三裁已冻 + §9.4 残留 O-003-α/O-005/O-007/O-009/O-011-α + I-01~I-04 作者 2026-09-07 四裁核签（见 §2.1 注）→ 本 plan 无 spec 级待决项，全部技术开放点 P-01~P-06 已给最终决策并落 ADR） | ✅ |

> 注：作者 2026-09-07 追加四裁（plan 硬约束，录入本文件）：
> **裁决 1（I-01 范围判定标准，最重要）**：v4 落地判定标准统一 = **「是否依赖浏览器扩展」**——不依赖浏览器扩展的能力（页内可达）→ 全部进 v4 实现；依赖浏览器扩展的能力 → 只做「契约预留 + 不支持转译」、不实现扩展工程。此标准统一替换 spec §2.5 的枚举切面描述（裁决一致性高于枚举；C-05 file input 例外：NG-004 页内 DataTransfer 面虽不依赖扩展，但作者 O-006 已显式裁「不解冻」→ 保持 out，仅契约预留）。
> **裁决 2（I-02）**：网络请求拦截（C-04 发出前修改）以 **P2 门禁入 v4**，缺省 deny（对应 spec S-10/FR-018）。
> **裁决 3（I-03）**：合成 touch（C-08）以「最小浏览器验证门」入 P2，验证不合格降级 out（对应 spec S-09/FR-024）。
> **裁决 4（I-04）**：权限模拟（C-11，geolocation/camera/mic）整项 out（页内假 API 注入 = 欺骗注入不允许；真模拟归 CDP/扩展/测试基建）。

---

## 2. 架构分析
> 分析现有架构影响和需要的新组件

### 2.1 现状基线（v4 挂载面，代码事实已核实）

```
packages/web-cli-base/src/          （domain-neutral，零 lgdl/react 依赖 NFR-001）
  platform.ts     PlatformEnv 缝集合（:423-457）——唯一平台能力入口；全缝可选 +
                  [k:string]:unknown 自由扩展位（:456）；nodeEnv/browserEnv 双轨
                  （browserEnv 内 domOps = createBrowserDomOps() :740；clipboard 缝仅文本
                  :626-640；授权失败分类转译 classify/translate :461-506）
  platform-dom.ts createBrowserDomOps() 浏览器面真实 PlatformDomOps（文件头 :1-120：
                  「唯一 document/window 触碰点」纪律 ADR-008；V13 冒烟清单 :24-55）
  dom-tools.ts    dom 27 子命令（DomSubcommand :58-89 + SUBCOMMANDS 注册序 :92-97；
                  v2 既有 7 头部不漂移 = AC-001 红线；executor 子命令 → ops 方法 :200+；
                  opMissing 未注入守卫 :191-197）
  chrome-tools.ts 「不支持 + 归属说明」先例（整页截图 → F-14/CDP :303-310）+
                  subcommandRisks 子命令级风险（:411-417）
  router.ts       dispatch 五步链 :529-617（查→enabled→PermissionGate→delay→executor）
  permission.ts   ToolRisk = read/write/external/ui/state/evaluate（evaluate 最高档 default deny
                  :169-172）；PolicyRule 含 subcommand 过滤面；defaultActionForRisk
  sensitive.ts    敏感字段分类/脱敏（password/凭据启发式 + maskValue :187-193；
                  写侧 sensitiveWriteDecision :206-211）——v3 FR-024 模型只覆盖表单字段
  audit.ts        AuditSink 事件面（type 联合；权限/调用/扩展注册）
  assembly.ts     默认矩阵组装（buildDefaultMatrix :51-62）；lgdl-web session.ts 为唯一组装点
packages/lgdl-web/src/ai/
  session.ts      顺序扩展组装点（P0 matrix → P1 域 → v3 P1/P2 块 :230-306）；
                  LGDL_DEFAULT_POLICY_RULES（:207-224：dom 只读免 ask / chrome back-forward
                  免 ask / clipboard 读写 ask 等子命令级规则单一数据源）
  App.tsx/AskDialog.tsx/AiPanel.tsx  场景 UI：ask 桥 + 规则 + 呈现（FR-029 扩展面）
```

**v4 结构性缺环再确认（spec §2.1 直接引用）**：①P1 推送面缺失——router/tools grep emit/subscribe = 0 命中，事件观察流整体不可表达（Q-001）；②P2 载体分界未定义——v3 以单值 out 记录不可承载项、挂账「不存在的 F-14 载体」（Q-002/Q-008）；③分层体「页内可达一半」与「需扩展一半」未做切面级分界（§4.1 分层表 🟢/🔴/🟡/🟠）；④新写面（cookie/拦截/对话框自动应答/富剪贴板/键入观察）无 risk/门禁/审计/脱敏挂点（Q-006/Q-012/Q-014）。

### 2.2 目标架构总览（v4 模块划分）

```
┌────────────────────────────────────────────────────────────────────┐
│ lgdl-web 场景壳（React UI；base 零 UI 纪律延续 NG-008）               │
│   ai/session.ts     v4 默认矩阵扩展（第二段：events/观察默认开、        │
│                      dialog·cookie·net 默认关、clipboard 富子命令默认开）│
│   App.tsx           aiPolicy 增：cookie/net deny、dialog accept deny、  │
│                      override 安装 ask、观察只读免 ask（FR-030）        │
│   AskDialog/AiPanel 新写面 ask 文案 + 事件摘要区/订阅状态呈现（FR-029）  │
├────────────────────────────────────────────────────────────────────┤
│ web-cli-base —— 机制层（additive，零回归红线 FR-001/002）              │
│   event-bus.ts(N)   事件总线核心（纯逻辑，node 可测）：订阅注册表/独立   │
│                     缓冲/预算/合并窗口/开关/lastId 增量拉取/失效语义    │
│   platform.ts(M)    PlatformEnv 新可选缝 events?: PlatformEventHub     │
│                      + clipboardRich?: PlatformRichClipboard；         │
│                      PlatformDomOps 新可选方法（cookie/touch）          │
│   sensitive.ts(M)   FR-006 敏感模型扩展：URL 查询串/header/body/键入/   │
│                      console·对话框文本/富剪贴板 脱敏纯函数族            │
│   audit.ts(M)       事件面扩展：subscribe/delivery/dialog/cookie/net    │
│   ext-attribution.ts(N) 「不支持 + 归属」统一转译面 + ATTRIBUTION_MAP    │
│                      + 扩展线契约预留注释面（FR-025/026，纯文档面）      │
├────────────────────────────────────────────────────────────────────┤
│ web-cli-base —— v4 页内能力工具层（每模块 = 工厂 + executor + schema +  │
│                   help + risk/subcommandRisks 声明）                   │
│   EVT  events-tools.ts(N)  events 工具：subscribe(dom/lifecycle/console/│
│                      network/paste/dialog)/unsubscribe/list/pause/     │
│                      resume/clear/pull/status/budget/switch（FR-008~015）│
│   DIA  dialog-tools.ts(N) + dialog-policy.ts(N) 对话框 override 安装/  │
│                      策略注册（纯模式匹配 node 可测）（FR-016/017）      │
│   NET  net-tools.ts(N)  拦截规则管理（P2 门禁；FR-018）                  │
│   CK   cookie-tools.ts(N) cookie 读（掩码）/明细/写/删（FR-019/020）    │
│   CLP  clipboard.ts(M)  既有工具增子命令 write-html/write-image/       │
│                      paste-read（read/write 文本零回归；FR-021/022）    │
│   SHD  platform-dom.ts(M) 共享 resolver 穿透（open shadow + 同源       │
│                      iframe，深度护栏）+ locator.ts(M) 语法文档面       │
│   TCH  dom-tools.ts(M) 增 tap/swipe/pinch 子命令（P2 验证门；FR-024）   │
├────────────────────────────────────────────────────────────────────┤
│ web-cli-base —— 浏览器面真实实现（DOM/window 触碰收敛面扩展）            │
│   platform-events.ts(N) createBrowserEventHub(scope)：hub + 观察源     │
│                      （domObserve/lifecycle/consolePatch/networkPatch + │
│                      dialogOverride + pasteCapture + netIntercept 共享 │
│                      instrumentation 控制器）（FR-003/008~018/022）     │
│   platform-dom.ts(M) cookie ops（#26~28）+ touchDispatch（#29）+       │
│                      穿透 resolver 增强（FR-023/024/019/020）           │
└────────────────────────────────────────────────────────────────────┘
依赖方向（不变，单向无环 NFR-001/002）：业务包 → base；base 零业务依赖；base 机制层零
DOM import 假设；DOM/window 触碰收敛 platform-dom.ts + platform-events.ts 两个浏览器实现
文件，base 其余模块只经 PlatformEnv/ops 接口 + 纯逻辑模块（event-bus/dialog-policy/
sensitive 扩展/locator）→ node 注入桩全链可单测、浏览器真实行为由 validate 冒烟。
```

**分层原则延续 v3（ADR-008 纪律扩展）**：v3 规定 DOM 触碰收敛 platform-dom.ts 单一文件；v4 因新增「持续订阅/观察/override/拦截」类**有生命周期、跨工具共享状态**的浏览器能力，DOM/window 触碰面扩展为两个实现文件——platform-dom.ts（一次性 DOM/页面操作 ops，v3 承载面）+ **platform-events.ts**（事件观察源 / 对话框 override / 网络 patch / paste 捕获的浏览器真实现工厂）。机制层 event-bus.ts 与平台完全解耦。

### 2.3 push/缓冲/订阅通道机制设计（EVT 核心，P1/R-02）

**通道定位（与既有 request→response 工具面的关系，硬约束 FR-001）**：push 通道 = **additive 新增机制**。事件从宿主页持续发生 → 经观察源同步进入通道缓冲（push 侧）；AI 侧取回 = 显式 `pull`（request→response 语义不变）。既有工具零改动、零推式副作用；AI 认知模型 = 「订阅 →（页面发生事件）→ pull 增量」，替代 sleep+快照猜时序。

**订阅 API 形态（events 工具 ops 面 ↔ PlatformEventHub 接口）**：

```ts
// platform.ts 新增（全部可选，缺省 undefined → 通道不可用转译 EC-011）：
export interface PlatformEventHub {
  // —— 订阅生命周期（FR-008）——
  subscribe(opts: PlatformSubscribeOptions): Promise<PlatformSubResult>;   // 返回唯一 subId
  unsubscribe(subId: string): Promise<PlatformOpOutcome>;
  list(): Promise<PlatformSubSummary[]>;          // id/kind/过滤摘要/已收计数/缓冲水位/开关
  pause(subId: string): Promise<PlatformOpOutcome>;
  resume(subId: string): Promise<PlatformOpOutcome>;
  clear(subId: string): Promise<PlatformOpOutcome>;
  // —— 拉取（FR-008/013：全量或 lastId 增量，不自动整段进上下文）——
  pull(subId: string, opts?: { lastId?: number; max?: number }): Promise<PlatformPullResult>;
  pullSensitive(subId: string, seq: number): Promise<PlatformOpOutcome>;   // 敏感明细（trusted+ask）
  // —— 预算与开关（FR-014）——
  status(): Promise<PlatformChannelStatus>;       // 全局开关/订阅数/预算水位/自动退订提示
  setBudget(opts: PlatformBudgetOptions): Promise<PlatformOpOutcome>;      // 每订阅/全通道
  switch(on: boolean): Promise<PlatformOpOutcome>; // 全局通道开关（默认关 = 零常驻开销）
  // —— 观察/拦截/override 子控制器（各自默认关，首个订阅/规则时惰性安装 patch）——
  sources: PlatformEventSources;                  // domObserve/lifecycle/console/network/
}                                                 // pasteCapture/dialogOverride/netIntercept
export type PlatformObserveKind = 'dom' | 'lifecycle' | 'console' | 'network' | 'paste' | 'dialog';
export interface PlatformSubscribeOptions {
  kind: PlatformObserveKind;
  filter?: PlatformEventFilter;    // 事件类型/selector 目标/URL 模式/level 等（P-04 语法）
  budget?: { bufferLimit?: number; autoPauseAt?: number };  // 订阅级覆盖（缺省 = 通道默认）
  sensitive?: boolean;             // 声明观察敏感面（console/键入等）→ 入审计/明细门禁
}
```

**缓冲模型（每订阅独立，FR-013）**：每订阅一个环形缓冲队列——`bufferLimit`（默认 200，上限 1000 可配）满 → **最旧丢弃 + dropped 计数标记**（不静默丢）；单事件负载预算默认 4KB（超限截断 + `truncated` 标记）；`lastId` = 订阅本地单调游标（事件入缓冲即分配），`pull {lastId}` 返回 `seq > lastId` 全部事件 → **增量无重复无遗漏**（AC-002 断言点）；多订阅并发互不干扰（事件按订阅过滤投递）。

**去重 / 合并 / 顺序（P-02 → ADR-003）**：hub 入口分配**全局单调 seq**（跨源总序，去重/审计基准）；高频抖动类事件（scroll/resize/mousemove/mouseover，仅此类可合并）按「同类型 + 同目标 + 合并窗口内」合并为单条计数事件（`count` + first/last 时间戳；默认窗口 800ms，可配 0=关）；观察源同步捕获 → 立即入缓冲（无微任务批处理），单订阅内顺序 = 到达顺序（seq 序）。

**投递 / 呈现语义（P-01 → ADR-002）**：捕获同步、取回异步（工具调用）。事件流**不自动进 LLM 上下文**（NFR-003）：`pull` 返回摘要（type/目标摘要/时间戳/seq，最近 N 默认 10 条可配）+ 计数 + 「明细可拉取」提示；`status` 返回订阅清单/预算水位（场景 UI 事件区数据源 FR-029）。AI 回合外的「被通知」由场景在会话轮询/状态面板呈现（lgdl-web AskPanel/事件摘要区），base 不引入中断式事件驱动 runner（v3 runner 保持）。

**预算与开关（O-011/S-08 → ADR-004 默认值口径）**：全局通道开关默认关 + 无订阅零常驻（无监听器/patch/轮询，NFR-007 基准断言）；订阅后开销受预算约束。默认值口径见 §4.3 P-03 表。

**跨导航语义（O-007/S-04 → ADR-002）**：浏览器面 hub 实例 = **当前文档作用域对象**（session.ts 每文档加载重建 env）——整页导航/reload 后旧文档监听器与缓冲随文档销毁 = 天然「订阅失效」（NG-009 out，无自动续接）；实现明示语义：`list()` 对新文档返回空 + help/生命周期事件提示「订阅已随导航失效，需重新 read-state + 重新订阅」；会话内 SPA 导航（hashchange/popstate，无整页加载）hub 实例存活 → 订阅保持（FR-010）。

### 2.4 additive 集成方式（新缝/新接口，与既有 CommandRouter + PlatformEnv 适配器）

1. **PlatformEnv 新可选缝（platform.ts，缺省 undefined，编译零破坏）**：
   - `events?: PlatformEventHub`——事件通道唯一入口（订阅/拉取/预算/开关/子控制器）。browserEnv() 装配 `createBrowserEventHub()`（惰性：构造零副作用，观察源/override 在首个订阅或规则注册时才 patch 宿主页）；nodeEnv 不预置 → events/cookie 等工具按「通道不可用」可读转译（EC-011，v2 dom「ops 未注入」语义沿）。
   - `clipboardRich?: PlatformRichClipboard`——富内容写缝（`writeItem({textHtml, imagePng, textPlain})` 经 navigator.clipboard.write + ClipboardItem；与既有 PlatformClipboard 文本缝并存，互不覆盖）。
2. **PlatformDomOps 新可选方法（#26~#29，缺省 undefined → opMissing 可读错误）**：
   - `cookieRead?(opts)/cookieWrite?(opts)/cookieDelete?(opts)`（CK；document.cookie 触碰收敛 platform-dom.ts）+ `touchDispatch?(opts)`（TCH，P2）。
3. **既有工具 additive 扩子命令**：`clipboard` 增 `write-html/write-image/paste-read`（read/write 文本既有语义零回归）；`dom` 增 `tap/swipe/pinch`（P2）。不新增既有 schema 破坏（enum 追加 + 分支追加）。
4. **纯逻辑扩展（node 可测）**：`locator.ts` 语法文档面增穿透说明（解析层不改，穿透在 DOM 侧 resolver）；`sensitive.ts` 增脱敏函数族（§3 PRM）；`dialog-policy.ts` 应答策略纯匹配；`ext-attribution.ts` 归属表常量。
5. **CommandRouter 接入（FR-001/FR-002）**：全部新能力 = ToolEntry 追加（`events`/`cookie`/`dialog`/`net` 新工具 + clipboard/dom 子命令扩展），group/risk/subcommandRisks 声明随条目；注册走既有 register()（lgdl-web session 组装点顺序扩展，业务注册序 + 内建置末保持）；派发五步链（enabled → PermissionGate effectiveRisk → delay → executor）零改动——新写面仅靠 risk/subcommandRisks 声明 + 场景规则获得门禁（deny 先于执行器，NFR-002 无旁路）。**不在任何既有工具内嵌 emit/订阅副作用**（grep 断言：既有 27+5+clipboard 文本面无新增推式副作用）。
6. **类型/导出收口**：base index.ts 追加导出（PlatformEventHub 类型/event-bus 工厂/events·cookie·dialog·net 工具工厂/redact 函数族/attribution 常量），既有导出零删除（NFR-006）。

### 2.5 生命周期 hook 挂载点（FR-010）

| 订阅 kind | 浏览器挂载点（platform-events.ts 实现） | 语义 |
|---|---|---|
| lifecycle | `window.addEventListener('hashchange'/'popstate')` | 会话内 SPA 导航事件；hub 实例存活 → 订阅保持 |
| lifecycle | `document.addEventListener('visibilitychange')` / `window.addEventListener('pagehide'/'beforeunload')` | 可见性切换 / 页卸前通知（AI 可先存状态）；只产生事件、不干预 v3 reload 破坏性语义（reload 工具层默认 ask 保持，v3 FR-027/EC-009） |
| dom | `document.addEventListener(type, handler, true)` 捕获期委托（首订阅时挂，末退订时卸） | 捕获期监听可收到多数被子树 stopPropagation 吞掉的事件（stopImmediatePropagation 于 document 自身仍不可达 → 帮助面局限公开 FR-015） |
| console | 首个 console 订阅时 patch `console.*`（log/warn/error/info/debug），末退订还原 | 捕获不改变页面 console 行为（原输出仍到 DevTools）；加载早于订阅的既有输出不回溯 |
| network | 首个 network 订阅或首条拦截规则时包装 `window.fetch` + `XMLHttpRequest.prototype.open/send` | 见 ADR-007（观察与拦截共享 instrumentation，惰性安装） |
| paste | 首个 paste 订阅时 `document.addEventListener('paste')` 捕获 clipboardData 富内容槽 | 用户主动粘贴才触发（无手势系统剪贴板读 = out，NG-012） |
| dialog | `dialog override-install` 时替换同 realm `window.alert/confirm/prompt`（含各同源 iframe 自身 window 逐一 hook） | 安装 = write risk ask（FR-005）；卸载还原；与页面既有 polyfill/React 共存冲突可读说明 |

> 生命周期失效：整页导航 = JS 上下文销毁 = hub 实例销毁（订阅/缓冲随文档消失）；reload 放行后新文档重新走 session.ts 组装 → 空订阅（EC-001/FR-010 明示语义）。无持久化跨导航续接（NG-009 out + FR-026 契约预留扩展归属）。

### 2.6 数据流变更与依赖关系

```
变更前（v3）：AI ──tool call──> CommandRouter ──> ops（一次性）──> 页面     （request→response）
变更后（v4）：
  页面事件 ──同步──> [观察源/override/patch] ──hub.append──> EventHub 缓冲（每订阅）
        （订阅注册）                                        （默认关/预算护栏/合并/丢弃计数）
  AI ──events subscribe──> hub ──返回 subId
  AI ──events pull{lastId}──> hub ──摘要+计数+seq 增量（明细经 pullSensitive：trusted+ask）
  AI ──cookie/dialog/net/clipboard──> 既有五步链 + risk 门禁 ──> ops/控制器
依赖关系：无新增运行时依赖（全部 Web 标准 API；NFR-001/002 + O-010）；platform.ts ──>
platform-dom.ts/platform-events.ts（浏览器实现工厂，零业务依赖）；工具层 ──> event-bus/
dialog-policy/sensitive/locator/ext-attribution（纯逻辑 node 可测）。
```

---

## 3. 分模块技术方案
> 各组实现要点 + 关键 ADR；FR → 工具/子命令落位以本表为准（spec §5.3 注：命名由 plan 落位）

### 3.0 FR → 落位总映射（traceability，供 tasks/review/validate）

| 组 | FR | 落位（工具 / 模块 / 缝） | 波 |
|---|---|----|:--:|
| BSL | FR-001~003 | 机制层零回归断言 + browserEnv 装配新缝真实现 + base index 导出收口 | P0 |
| BSL | FR-004 | v2/v3 收口人工基线关联表（validate 移交）+ ROADMAP v0.7 同批登记 | P0 |
| PRM | FR-005 | 新写面工具 risk/subcommandRisks 声明 + untrusted 守卫（各执行器） | P0 |
| PRM | FR-006 | sensitive.ts 脱敏函数族扩展（URL/header/body/键入/console·对话框/富剪贴板） | P0 |
| PRM | FR-007 | audit.ts 事件面类型扩展 + 各新面审计记录点 | P0 |
| EVT | FR-008/013/014 | event-bus.ts + events 工具（subscribe/list/unsubscribe/pause/resume/clear/pull/status/budget/switch） | P0 |
| EVT | FR-009 | `events subscribe --kind dom`（帮助面标注「dom observe = 本子命令」，FR-009 语义落位） | P0 |
| EVT | FR-010 | `events subscribe --kind lifecycle`（platform-events.ts 生命周期源） | P0 |
| EVT | FR-011 | `events subscribe --kind console`（console patch 源；P1 观察面补全） | P1 |
| EVT | FR-012 | `events subscribe --kind network`（networkPatch 观察；与 net 工具共享 instrumentation） | P1 |
| EVT | FR-015 | 合成来源标记（platform-dom 派发辅助置 synthetic 标志）+ 帮助面局限声明 | P1 |
| DIA | FR-016/017 | `dialog` 工具（override-install/uninstall/policy-add/list/remove/status）+ dialog-policy.ts | P1 |
| NET | FR-018 | `net` 工具（rule-add/list/remove + intercept-on/off + status）；**P2 门禁缺省 deny** | P2 |
| CK | FR-019/020 | `cookie` 工具（read/read-detail/write/delete）+ PlatformDomOps.cookie* | P1 |
| CLP | FR-021 | `clipboard write-html/write-image`（env.clipboardRich 富写缝） | P1 |
| CLP | FR-022 | `clipboard paste-read`（hub paste 槽；需 paste 订阅激活） | P1 |
| SHD | FR-023 | platform-dom.ts 共享 resolver 穿透（open shadow + 同源 iframe + 深度护栏）；locator 帮助面说明 | P1 |
| TCH | FR-024 | `dom tap/swipe/pinch`（PlatformDomOps.touchDispatch）；**P2 验证门** | P2 |
| EXT | FR-025 | ext-attribution.ts「不支持 + 归属」统一转译 helper + 各工具 help 归属表 | P1 |
| EXT | FR-026 | ATTRIBUTION_MAP 契约预留注释面（文档面，不注册不进 schema） | P1 |
| EXT | FR-027 | 零扩展工程/零依赖纪律 grep 断言 + ROADMAP/F-14 关系文案 | P1 |
| LGDL | FR-028/029/030 | session.ts 矩阵扩展 + LGDL_DEFAULT_POLICY_RULES + AiPanel 事件区/AskDialog 文案 | P1/P2 |

### 3.1 EVT — 事件观察流（FR-008~015；R-02 必做）

- **实现要点**：§2.3 机制 + §2.4 集成 5 点。工具面 = `events`（顶层，group=observe，risk='read' 底档 + subcommandRisks：subscribe/list/status/pull → 'read'；unsubscribe/pause/resume/clear/budget/switch → 'state'（缺省 ask）；`pull-sensitive` 明细取回 → 'write' 档 + 显式 `--trusted true` 声明（敏感明细 trusted+ask，FR-006/决策入审计）；subscribe 带 `--sensitive true`（console/键入观察面声明）时该订阅全程入审计、明细进 pull-sensitive 通道。
- **键事件负载字段（P-04 语法，→ ADR-005）**：统一事件面 = `{seq, ts, kind, type?, target?（selector 摘要）, text?（脱敏后摘要）, meta?}`；dom 事件含 target 摘要（selector 或 标签+文本前缀，预算内）；键入敏感面：keydown 负载**不含按键值回显**（只含 key 名 + ctrl/shift 等修饰键布尔），input/change 目标为敏感字段（sensitiveFieldMatch 复用）时值字段掩码（FR-006/FR-009）；console 事件 level + 文本脱敏（可配策略）+ 默认关 stack；network 事件 method+URL（查询串脱敏）+status+耗时+响应头子集（content-type 等，缺省不含敏感头）+source（page-fetch/xhr）。
- **过滤语法（P-04 → ADR-005）**：订阅级过滤器 = 事件类型（csv）∩ selector 目标（dom 用，css:/text= 语法面）∩ URL 模式（network/lifecycle）∩ level 集（console）；glob 模式沿既有 globMatch 语义。过滤在 hub 入口执行（订阅独立）。
- **来源标记（FR-015）**：platform-dom 派发辅助（v3 click/type 等合成派发路径）在 dispatchEvent 前置模块级 synthetic 标志 → hub dom 观察源读标志给事件 `source:'synthetic'`；真实/页面事件缺省 `source:'page'`；help 公开局限（不升级 isTrusted、同 realm、跨 realm/worker/非 JS 子资源不可达 NG-010/012、被 stopImmediatePropagation 吞掉的事件不可承诺）。
- **关键 ADR**：ADR-002（通道架构/投递模型/跨导航）、ADR-003（去重/顺序/合并）、ADR-004（预算默认值）、ADR-005（负载字段与过滤语法）。

### 3.2 DIA — 对话框 override（FR-016/017；C-03 页内面）

- **实现要点**：`dialog` 工具（group=dialog）。`override-install` 经 **write risk 缺省 ask**（FR-005；deny 后不安装）→ hub.dialogOverride.install()：保存原引用 → 替换同 realm window.alert/confirm/prompt（同源 iframe 各自 window 逐一 hook；跨域 iframe 不可 hook → 归属说明）；安装后页面 JS 调用模态框 → ①事件入通道（kind=dialog：type + 文本脱敏摘要 + ts）②按策略应答（FR-017）；`override-uninstall` 还原（可逆，卸载后原行为恢复，回归断言）；重复安装冲突/与页面既有 polyfill 共存 → 可读冲突说明（NFR-004）。
- **应答策略（dialog-policy.ts 纯逻辑，node 可测）**：规则集 = {类型 alert/confirm/prompt × 文本/URL 模式（glob）→ 动作 accept/dismiss/promptText}；**缺省保守**：alert → accept（记录即返回）；confirm/prompt 无匹配 → dismiss（返回否定值）+ 事件 + 审计（EC-005）；**误确认护栏**：DESTRUCTIVE_PATTERNS（删除/覆盖/清除/提交类，中英词元）命中且无显式 trusted accept 规则 → 永不 accept（EC-006）；prompt 自动输入值仅 trusted 规则显式提供时生效；规则经 `policy-add` 注册 = untrusted 拒（缺省）+ 场景显式 trusted 放行 + 审计（FR-005/007）。
- **关键 ADR**：ADR-006（对话框 override 与护栏）。

### 3.3 NET — 网络观察/拦截（FR-012 观察 P1 + FR-018 拦截 P2 门禁）

- **实现要点（→ ADR-007）**：观察与拦截共享**同一 instrumentation 控制器**（platform-events.ts networkPatch）——惰性安装：首个 network 订阅或首条拦截规则时包装；无订阅无规则零开销（NFR-007 回归断言）。
  - 观察（EVT FR-012）：fetch wrapper 记录 method/URL（查询串脱敏）/status/耗时/响应头子集；XHR 经 wrap open/send + load 事件记 status。**响应体默认不读取**（预算/隐私）。
  - 拦截（NET FR-018，P2）：fetch 请求发出前应用规则（URL 模式匹配 → 增/改 header、查询参数、请求体字段）；XHR 经 open/send 间改写 header。规则引擎（纯逻辑）node 可测。
  - **注入点策略**：包装器保留原函数引用并透传调用（页面行为不变）；包装安装后新请求才可见（早于安装的请求不回看）；**AI 自请求默认不可见**——web-fetch 走 env.fetch 早期绑定原生引用（browserEnv 构造时绑定），不经过后装包装器 → 默认不入观察流（比 spec FR-012「来源标记可过滤」更严格的隐私缺省，公开差异记 ADR-007；后续如需 AI 自检流量，经 events subscribe source 过滤扩展，不在本 FR）。
- **门禁（裁决 2）**：net 工具整工具 **P2 缺省 deny**：entry risk='write' + lgdl-web 默认矩阵**关闭**；规则注册要求显式 `--trusted true`（untrusted 拒，FR-005/EC-004）；拦截命中全量审计（规则 id + URL 脱敏摘要 + 动作，FR-007）；响应伪造/缓存篡改/先网络栈/跨 realm 入参 → 不支持 + 归属 webRequest/DNR/CDP（FR-025）。
- **关键 ADR**：ADR-007（网络 instrumentation：共享包装/注入点/AI 自请求差异）、ADR-004（观察预算）。

### 3.4 CK — cookie（FR-019/020；C-06 页内面，O-008 门禁）

- **实现要点**：`cookie` 工具（group=cookie）。读 = PlatformDomOps.cookieRead（document.cookie 解析为 名/域/路径/有效期可达子集 + 值**缺省掩码** maskValue，FR-006）；明细值经 `read-detail`（subcommand risk 'write' 档 + trusted + ask → 决策入审计）；写/删 = cookieWrite/cookieDelete（同源非 HttpOnly 面；Secure/HttpOnly 页面写面限制分类转译 EC-007：仅 HTTPS 可写 Secure、HttpOnly 不可写）；写值 untrusted 拒（缺省，显式 `--trusted true` 才写）；写后回读断言（v3 fill 写后回读同构）；HttpOnly 读、跨域、域级批量 → 不支持 + 归属 chrome.cookies（FR-025/026）；审计 = 名掩码 + 域 + 动作（无明文）。
- **关键 ADR**：ADR-008（cookie/富剪贴板页内面与门禁）。

### 3.5 CLP — 富剪贴板 / 粘贴读（FR-021/022；C-07 纯页内）

- **实现要点**：富写 = env.clipboardRich（navigator.clipboard.write + ClipboardItem：text/html、image/png、text/plain 并存；浏览器不支持 ClipboardItem → 授权转译沿 FR-009）；`clipboard` 工具增子命令：`write-html --html <片段>`、`write-image --dataurl <png>`、`paste-read`（读最近一次**用户主动粘贴**捕获槽，需 paste 订阅激活；返回 text/html + 图片/文件项元数据；可经 save/export 链落盘 v3 FR-029）；读 = ask（v3 clipboard read=敏感 ask 规则沿）+ FR-006 脱敏；无手势系统剪贴板读/历史 → 不支持说明（NG-012）；既有 `read/write` 文本子命令零回归（enum 追加 + 分支追加）。
- **关键 ADR**：ADR-008。

### 3.6 SHD — shadow/iframe 穿透定位（FR-023；C-09 页内面）

- **实现要点**：**不做新定位语法、不加新子命令**——穿透落在 platform-dom.ts **共享元素解析 resolver**（readElement/findElements/click/fill/extract 等全部经此，单点增强即全工具生效）：主文档 CSS 命中 → 照旧（零回归）；未命中 → 递归走查 open shadowRoot（querySelector 逐层）→ 同源 iframe contentDocument（同文档内 iframe 集合，SOP 内）；深度护栏默认 ≤4 层可配（防深递归拖垮，NFR-007）；closed shadow/shadowRoot=null / 跨域 iframe（SecurityError）→ 不静默：返回不支持 + 归属 content script(all_frames)/CDP（FR-025）；穿透命中事件在返回中带 `via:'shadow'/'iframe'` 标注（AI 可读）；locator.ts 帮助面/语法文档面补穿透说明（解析层不变，additive）。
- **关键 ADR**：ADR-011。

### 3.7 TCH — 合成 touch（FR-024；裁决 3 验证门 P2）

- **实现要点（→ ADR-010）**：`dom` 增子命令 `tap`（selector/坐标）/`swipe`（from→to + 时长）/`pinch`（两指缩放序列，中心点 + 距离变化）；PlatformDomOps.touchDispatch 派发 TouchEvent 构造序列（touchstart → touchmove×n → touchend，目标坐标；desktop chromium 构造 Touch/TouchEvent 需最小验证）；局限 = v3 NG-007 同族（isTrusted=false；不承诺惯性/手势识别被目标接受）；目标不处理合成事件 → 可读提示（v3 EC-007 语义沿）。**验证门先行**（Q-013/A-004）：真实浏览器最小验证「合成 touch 可构造派发且对 touch 监听页面生效」——失败 → 本 FR 降级 out 记录 + 归属 CDP Input.dispatchTouchEvent 说明（v3 S-02 降级出口先例）。
- **关键 ADR**：ADR-010（验证门 + 降级出口）。

### 3.8 EXT — 「不支持 + 归属」统一转译面 + 契约预留（FR-025~027；裁决 1 扩展侧）

- **实现要点（纯文档面，零扩展工程）**：`ext-attribution.ts`（新，纯常量 + helper，node 可测）——`ATTRIBUTION_MAP`：全部需扩展/系统级能力面（多标签/窗口、下载管理、整页截图、HttpOnly/跨域 cookie 与域级管理、DevTools 全局面网络、跨导航持久订阅、closed shadow、跨域 iframe、浏览器原生对话框、真受信触控/输入、权限真模拟、file 真路径注入、C-05 DataTransfer 注入面）→ 归属（F-14 v1.1 扩展宿主 / CDP 生态位）+ 扩展 API/CDP 域 + 预留契约建议（FR-026：目标工具/子命令建议名 + 入参 + 返回 + 门禁/敏感挂点 + 与页内对应能力的切面关系）——以**类型占位注释 + 常量映射**形态落地，**不注册工具、不进 schema、不接线**（schema 体积零变化断言）；`unsupportedAttribution(capability)` helper 产出统一文案（v3 chrome-tools fullpage 文案同构），各新工具 executor/help 接线引用；帮助面含归属表。
- **纪律（FR-027/O-005 → ADR-012）**：不触碰 F-14 门禁（开源决策/协议机制/插件技术栈/安全评审不变）；零扩展依赖（@types/chrome 等 devDep 不增，NFR-001/002）；grep 断言零扩展工程痕迹（chrome.runtime/tabs/downloads/webRequest/manifest 零命中）；契约预留仅供 F-14 立项继承/修订（非承诺）。
- **关键 ADR**：ADR-012（EXT 纪律与 F-14 关系）、ADR-001（范围判定标准落地）。

### 3.9 横切 — PRM（FR-005~007）+ LGDL（FR-028~030）

- **PRM（O-008/S-05）**：risk 声明表（新工具/子命令，§3.1~3.7 各节内）；untrusted 守卫 = 执行器级统一 helper（拦截规则/对话框 accept 策略/cookie 写值/敏感明细声明，缺省需 `--trusted true`；沿用 v3 page-eval untrusted 语义）；敏感模型扩展（FR-006 → ADR-005）：sensitive.ts 增 `redactUrlQuery(url)` / `isSensitiveHeader(name)+maskHeaderValue()` / `maskTextPayload(text, policy)` / 键入负载策略（不含明文值）/ console·对话框文本脱敏策略可配 / 富剪贴板文本同规则——纯函数族 + 策略常量，掩码/长度占位/类型替代三态沿 v3 maskValue；审计（FR-007）：audit.ts AuditEventType 增 subscribe/unsubscribe/event-delivery-summary/dialog/cookie/net-intercept（含子命令/来源/裁决/计数，无敏感明文）。
- **LGDL（G-006 → FR-028/029/030）**：session.ts 组装点顺序扩展 v4 块（事件工具/观察默认开——观察只读子面免 ask（IMP-4 语义沿）；dialog/cookie/net 默认关——场景策略显式开启；clipboard 富子命令默认开——既有权限沿；dom touch P2 默认关）；LGDL_DEFAULT_POLICY_RULES 增：cookie write/delete 与 net 缺省 deny（或 ask，不可静默 allow，FR-030）、dialog 自动 accept 缺省 deny、override-install ask、观察只读 allow 前置规则（置于既有 risk ask 规则前）；AiPanel 事件摘要区 + AskDialog 新写面文案（FR-029 归场景，base 零 UI）；base 只读状态/事件面（hub.status/pull 即数据源）。

---

## 4. 方案对比
> 3 个关键技术选型主题 × 各 3 方案；推荐以「★」标注

### 4.1 主题一：事件通道载体形态（EVT 架构落位）

| 维度 | 方案 A：独立 Hub + `env.events` 新可选缝 ★ | 方案 B：全塞 PlatformDomOps 一次性方法 | 方案 C：场景侧自有（session 内实现，不进 base） |
|------|:--|:--|:--|
| 描述 | event-bus.ts 纯机制 Hub + platform.ts 新可选缝 PlatformEventHub（browserEnv 装配真实现 / node 不预置）；观察/override/拦截子控制器经 hub.sources 惰性安装 | 订阅/缓冲/拉取全部编码为 PlatformDomOps 的 ~10 个一次性方法（返回 PlatformDomOpResult 文本） | 通道机制实现在 lgdl-web session 内，base 只留类型占位 |
| 优点 | 跨工具共享状态单一来源（events/dialog/net/clipboard 投递同一 hub）；机制层 node 可测零 DOM；延续「缝可选 + 未注入转译」纪律；additive 最干净 | 不加新缝、与 v3 dom/chrome ops 形态最一致 | base 机制零改动 |
| 缺点 | 需新增 1 个缝 + 1 个浏览器实现文件（平台面扩展，非工具面） | PlatformDomOps 接口爆炸（25→35+ 混入持续状态机，语义错位）；缓冲/预算状态难以经一次性 ops 表达；node 假 ops 全链单测复杂 | 场景包被架构逻辑侵入（违 base 机制层生态位 + NFR-001 纯度审视）；其他消费端无法复用；测试双轨破坏 |
| 风险 | 低（机制纯逻辑先行 + 浏览器实现惰性安装，可独立验证） | 中高（持续订阅语义挤一次性 ops 形态，返工面大） | 高（架构归属错误，v3 NG-008「机制归 base」倒退） |
| 工作量 | 中（1 机制模块 + 1 缝 + 1 实现文件 + 1 工具） | 中（但接口/测试返工风险高） | 小（短视） |

### 4.2 主题二：AI 侧事件获取模型（P-01 投递语义）

| 维度 | 方案 A：拉取式（摘要+计数入 output，lastId 增量 pull）★ | 方案 B：事件自动推入 LLM 上下文 | 方案 C：runner 事件驱动打断（挂起等事件） |
|------|:--|:--|:--|
| 描述 | 捕获同步入缓冲；AI 回合内经 `events pull`/`status` 显式取回摘要+计数；明细按需拉；上下文只见摘要/计数（NFR-003） | 每轮 tool 循环自动把缓冲事件整段注入下一轮消息 | 新增「等事件」异步语义：runner 挂起当前流程直到订阅事件命中 |
| 优点 | 与既有 request→response 完全兼容（FR-001）；预算可控（AI 决定拉多少）；增量无重复遗漏可断言 | AI 零额外调用即可感知 | 事件驱动场景最「自动」 |
| 缺点 | AI 需显式拉取（多一步调用）——但可由场景 UI 状态区提示水位 | 事件流进上下文撑爆预算/干扰 tool_choice（R-006/Q-016 即此风险）；需跨回合状态注入机制（runner 大改） | runner/会话循环架构级变更（破坏 v3 request→response 模型 + 挂起/超时/恢复新状态机，NG-008 违规候选） |
| 风险 | 低 | 高（预算/上下文污染，spec 已明确拒绝「自动整段推入」FR-008） | 高（架构重写面） |
| 工作量 | 中 | 中（但护栏成本高） | 高 |

### 4.3 主题三：网络观察/拦截注入点（FR-012/018）

| 维度 | 方案 A：同 realm fetch/XHR 单点包装共享 instrumentation ★ | 方案 B：PerformanceObserver（resource timing） | 方案 C：仅契约预留零实现 |
|------|:--|:--|:--|
| 描述 | platform-events.ts networkPatch：首个 network 订阅/规则时包装 window.fetch + XHR open/send；观察与拦截共用安装点与包装器 | 用 PerformanceObserver('resource') 观察资源时序 | 观察+拦截都只写归属（webRequest/CDP）+ 契约预留 |
| 优点 | 观察可拿 URL/状态/耗时/响应头子集（F12 Network 等效，A2 公理）；拦截同面可表达（裁决 2 P2）；惰性安装零开销可断言 | 零 patch（页面零侵入）；实现小 | 零实现成本 |
| 缺点 | patch 宿主 realm（安装后新请求才可见；与页面库 fetch 引用关系需保序透传）；XHR 需 open/send 双 wrap | 无状态码/响应头、受 TAO/CORS 限、无法拦截修改（spec FR-012/018 关键验收不可达） | 观察价值面（排障 Q-003）整段放弃，A2 公理网络面板场景落空 |
| 风险 | 低中（透传保序 + 零开销断言单测覆盖） | 中（验收不达标返工） | 高（价值缺口 + 与 discovery C-04 页内可达事实矛盾） |
| 工作量 | 中 | 小 | 小 |

## 5. 推荐方案

**推荐**：主题一方案 A（独立 Hub + env.events 缝）+ 主题二方案 A（拉取式投递）+ 主题三方案 A（fetch/XHR 单点共享 instrumentation）。
**理由**：三者合力满足 spec 三条硬红线——①additive 零回归（新缝/新工具追加，既有 request→response 工具面零改动，FR-001）；②push 通道必做且预算可控（Hub 纯机制 node 可测 + 默认关零常驻 + 摘要/计数进上下文、明细拉取，NFR-003/007）；③页内快赢主体可用 Web 标准 API 表达、扩展面只做文档面契约预留（裁决 1）。B/C 方案分别在接口语义错位、上下文预算/架构重写、验收不可达三处触碰红线。

### 5.1 spec 决策 → 技术落点映射（红线输入对齐表）

| spec 决策/裁决 | 技术落点 | 关联 |
|---|---|---|
| R-01 / 裁决 1（范围 = 页内可达全落地；扩展只契约预留） | §3.0 落位总表（页内组 EVT/DIA/CK/CLP/SHD/TCH/PRM 实现；EXT 组文档面；C-05 保持 out（O-006）+ C-11 out（裁决 4）） | ADR-001 |
| R-02（push 通道必做） | event-bus.ts + env.events + events 工具 + platform-events.ts | ADR-002~005 |
| R-03 / O-012（v0.7 同批、基线 v2 分支） | FR-004 基线关联表（validate 移交）+ ROADMAP 登记 | ADR-013 |
| 裁决 2（NET P2 in、缺省 deny） | net 工具 P2 波 + risk 缺省 deny + 矩阵默认关 | ADR-007 |
| 裁决 3（TCH 验证门 P2） | dom tap/swipe/pinch + 验证门先行（失败 out） | ADR-010 |
| 裁决 4（C-11 权限模拟 out） | FR-025 归属转译（CDP/测试基建） | ADR-001/012 |
| O-006（NG-003/004/整页截图保持 out） | 契约预留 + 分界转译（含 DataTransfer 面不解冻） | ADR-001/012 |
| O-008（安全模型升级） | PRM risk 表 + sensitive 脱敏函数族 + audit 扩展 | ADR-006/008/005 |
| O-011（push 预算） | ADR-004 默认值口径表 | ADR-004 |

### 5.2 技术开放点最终决策（承接 spec §5.3/§9.4 注 P-01~P-04 + 遗留 O 项）

| # | 开放点（出处） | 最终决策（默认推荐已采纳） | ADR |
|---|---|---|---|
| P-01 | push 投递模型（spec §5.3 注） | **同步捕获 + 异步拉取**：观察源/override/patch 在事件到达时同步 append 入缓冲（无批处理）；AI 侧经工具调用增量拉取；不自动进 LLM 上下文；事件区状态呈现归场景 UI | ADR-002 |
| P-02 | 事件去重与顺序保证（spec §5.3 注） | hub 入口全局单调 seq（总序）+ 每订阅本地游标 lastId；合并窗口仅限抖动类（scroll/resize/mousemove/mouseover，默认 800ms 可配）；最旧丢弃 + dropped 计数 | ADR-003 |
| P-03 | 预算默认值口径（O-011-α） | 见下表「预算默认值」 | ADR-004 |
| P-04 | 事件负载字段与过滤语法（spec §5.3 注） | 统一事件面 {seq,ts,kind,type,target,text(masked),meta}；过滤 = 类型∩selector∩URL 模式∩level，glob 沿既有语义 | ADR-005 |
| P-05 | 网络拦截注入点策略（裁决 2 细化） | fetch/XHR 单点共享包装（观察+拦截同一安装点）；包装透传原引用；AI 自请求（env.fetch 早期绑定）默认不可见（公开差异） | ADR-007 |
| P-06 | 敏感字段模型扩展到 v4 新对象（FR-006/FR-024 语义扩展） | 表单字段模型 → 通用文本/URL/header 面：掩码缺省 + 明细 trusted+ask + 审计零明文；键入负载不含明文值；console/对话框文本可配脱敏策略 | ADR-005/006/008 |

**预算默认值（P-03/ADR-004，场景经 events budget/subscribe 可配）**：

| 预算项 | 默认 | 说明 |
|---|---|------|:--:|
| 每订阅缓冲上限 | 200 条（上限 1000 可配） | 满 → 最旧丢弃 + dropped 计数 |
| 每订阅累计事件预算 | 2000 条 | 超限 → 自动暂停 + 提示（可 resume） |
| 全通道并发订阅上限 | 8 | 超限拒绝注册 + 提示 |
| 全通道事件速率护栏 | 200 条/s | 超限丢弃 + 计数（防多订阅洪峰叠加） |
| 合并窗口（抖动类） | 800ms | 窗口内同类型同目标合并计数 |
| 投递摘要条数 N | 10 条 | pull/上下文只见摘要 + 计数 |
| 单事件负载预算 | 4KB | 超限截断 + truncated 标记 |
| 敏感明细 | 关闭 | 需 pull-sensitive + trusted + ask |

**验证门（P2 前置，validate/波 3 承接）**：G-01 = 合成 touch 最小浏览器验证（真实 chromium：构造 Touch/TouchEvent 可派发且 touch 监听页收到 tap/swipe/pinch 序列各 ≥1）；失败 → FR-024 out 记录 + CDP 归属。G-02 = 网络拦截真实改写验证（fetch header/参数被规则改写断言）——P2 放行门禁。

### 5.3 测试策略（NFR-005 双轨，v2/v3 先例延续）

- **node 注入面（全链单测）**：event-bus hub 纯逻辑（订阅/缓冲/预算/合并/lastId 增量/开关）+ events/cookie/dialog/net/clipboard 工具 executor（fake env/ops）+ sensitive/redact 函数族 + dialog-policy + locator 语法 + ext-attribution 归属断言 + router 门禁（risk 声明表/subcommandRisks/deny 优先级）+ 审计事件面 + v2/v3 零回归全量。
- **真实浏览器冒烟（V13/v3 方法扩展，validate 移交清单）**：订阅真实事件命中（dom/lifecycle/console/network 各 ≥1）/lastId 增量/预算触发/对话框三类型捕获 + 护栏三路/cookie roundtrip（掩码 + trusted 明细）/富剪贴板 roundtrip + paste 捕获/穿透定位（open shadow + 同源 iframe）/合成 touch（G-01）/网络拦截改写（G-02）/整页 reload 订阅失效语义。零扩展 API 依赖 grep 断言。
- **AC-001 v2/v3 零回归**：既有 27 dom 子命令 + chrome/wait/page-eval/extract/export + clipboard 文本 read/write 行为零回归；既有工具无新增 emit/订阅副作用 grep 断言；deriveTools 顺序断言不漂移。

### 5.4 波次任务交接提示（tasks 输入；tasks.json/md 由 sddu-tasks 产出）

- **波 1（P0）= 契约与安全柱子 + EVT 通道核心**：BSL（FR-001~004）+ PRM（FR-005~007）+ EVT 骨架（FR-008/009/010/013/014）——先立「additive 契约 + 安全门禁 + push 通道」三柱，任何写面/观察面上线即有护栏。串行依赖：event-bus 机制 → platform.ts 缝类型 → 浏览器源（dom/lifecycle）→ events 工具。
- **波 2（P1）= 页内快赢主体**：EVT 补全（console/network 观察 FR-011/012/015）+ DIA + CK + CLP + SHD + EXT + LGDL 矩阵与策略（FR-028/030）——观察面与工具面并行（platform-events 源 × 纯逻辑策略模块 × 工具 executor）。
- **波 3（P2）= 高门槛/验证门收尾**：NET 拦截（FR-018）+ TCH 验证门（FR-024，G-01 先行）+ LGDL UI 呈现（FR-029）。
- 任务块划分建议与注意点见 §9。

---

## 6. 文件影响分析

| 操作 | 文件路径 | 说明 |
|:--:|------|------|
| NEW | `packages/web-cli-base/src/event-bus.ts` | 事件总线核心（纯逻辑：订阅注册表/独立缓冲/预算/合并窗口/开关/lastId 拉取/审计钩子）— EVT FR-008/013/014 |
| NEW | `packages/web-cli-base/src/platform-events.ts` | 浏览器面真实实现工厂 `createBrowserEventHub(scope)`：hub 装配 + domObserve/lifecycle/consolePatch/networkPatch(+intercept)/dialogOverride/pasteCapture 源 — FR-003/008~018/022 |
| NEW | `packages/web-cli-base/src/events-tools.ts` | events 工具（subscribe/list/unsubscribe/pause/resume/clear/pull/pull-sensitive/status/budget/switch）+ schema/help/subcommandRisks — FR-008~015 |
| NEW | `packages/web-cli-base/src/dialog-tools.ts` | dialog 工具（override-install/uninstall/policy-add/list/remove/status）— FR-016/017 |
| NEW | `packages/web-cli-base/src/dialog-policy.ts` | 对话框应答策略纯匹配（缺省保守 + DESTRUCTIVE_PATTERNS deny-accept + trusted 规则）— FR-017/EC-005/006 |
| NEW | `packages/web-cli-base/src/net-tools.ts` | net 拦截规则工具（rule-add/list/remove + intercept-on/off + status；P2 缺省 deny）— FR-018 |
| NEW | `packages/web-cli-base/src/cookie-tools.ts` | cookie 工具（read/read-detail/write/delete）— FR-019/020 |
| NEW | `packages/web-cli-base/src/ext-attribution.ts` | 「不支持 + 归属」统一转译 helper + ATTRIBUTION_MAP（归属 + 契约预留注释面）— FR-025/026 |
| MODIFY | `packages/web-cli-base/src/platform.ts` | PlatformEnv 新可选缝 `events?: PlatformEventHub` + `clipboardRich?: PlatformRichClipboard`；PlatformDomOps 新可选方法 cookieRead/cookieWrite/cookieDelete/touchDispatch；nodeEnv/browserEnv 装配；新类型面（PlatformSubscribeOptions/PlatformEventHub/PlatformRichClipboard…） |
| MODIFY | `packages/web-cli-base/src/platform-dom.ts` | cookie ops 真实现（document.cookie）+ touchDispatch 真实现（P2）+ 共享 resolver 穿透（open shadow/同源 iframe + 深度护栏）+ 合成派发 synthetic 标志（FR-015） |
| MODIFY | `packages/web-cli-base/src/dom-tools.ts` | 增 tap/swipe/pinch 子命令（P2，enum 尾部追加 + 分支 + subcommandRisks）— FR-024 |
| MODIFY | `packages/web-cli-base/src/clipboard.ts` | 增 write-html/write-image/paste-read 子命令（read/write 文本零回归）— FR-021/022 |
| MODIFY | `packages/web-cli-base/src/sensitive.ts` | FR-006 脱敏函数族扩展（redactUrlQuery/isSensitiveHeader+maskHeaderValue/maskTextPayload/键入与文本面策略）— FR-006 |
| MODIFY | `packages/web-cli-base/src/audit.ts` | AuditEventType 扩展（subscribe/unsubscribe/event-delivery/dialog/cookie/net-intercept）— FR-007/NFR-008 |
| MODIFY | `packages/web-cli-base/src/locator.ts` | 帮助/语法文档面补穿透说明（解析层不变）— FR-023 |
| MODIFY | `packages/web-cli-base/src/index.ts` | v4 导出收口（新工具工厂/类型/纯逻辑模块/attribution），既有导出零删除 — NFR-006 |
| MODIFY | `packages/lgdl-web/src/ai/session.ts` | v4 默认矩阵扩展块（events/观察默认开；dialog/cookie/net 默认关；clipboard 富子命令默认开；dom touch 默认关）+ LGDL_DEFAULT_POLICY_RULES 增（cookie/net deny、dialog accept deny、override ask、观察只读 allow）— FR-028/030 |
| MODIFY | `packages/lgdl-web/src/ai/AiPanel.tsx` | 事件摘要区/订阅状态呈现（hub.status/pull 数据源）— FR-029 |
| MODIFY | `packages/lgdl-web/src/ai/AskDialog.tsx` | 新写面 ask 文案（cookie 写/删、拦截规则、对话框策略、override 安装 + 规则摘要）— FR-029 |
| MODIFY | `packages/web-cli-base/src/*.test.ts`（新增对应测试 + 既有零回归保持） | 每新模块伴随 node 注入面单测（fake ops/假缝）；v2/v3 既有测试零删除（D-005 守恒） |
| MODIFY | `.sddu/specs-tree-root/specs-tree-web-cli-base-v4/state.json` | phase=planned（本文件交付物之一） |
| MODIFY | `.sddu/specs-tree-root/specs-tree-web-cli-base-v4/TREE.md` | 目录导航登记 plan.md |
| MODIFY | `ROADMAP.md`（登记面） | v4 与 v2/v3 v0.7 同批发布登记 + F-14 契约预留继承基线（FR-004/027） |

**明确不改动**：permission.ts 裁决管线本体（risk 模型/PolicyRule 已含 subcommand 面，仅用声明表 + 场景规则，不加机制）；router.ts dispatch 五步链（新写面仅靠声明获门禁，NFR-002 无旁路）；既有 dom 27 头部注册序、chrome/wait/page-eval/extract/export、clipboard 文本 read/write、session.ts 既有注册块；assembly.ts 默认矩阵（lgdl-web 场景扩展，v3 先例）；零新增依赖（package.json 不动）。

---

## 7. 风险评估

| 风险 | 概率 | 影响 | 缓解措施 |
|------|:--:|:--:|----------|
| 事件通道上下文/性能失控（洪峰撑爆缓冲或拉取输出） | 中 | 高 | 默认关零常驻 + 合并窗口 + 每订阅/全通道预算 + 摘要计数投递 + 自动暂停（ADR-004 表）；基准对比断言（NFR-007） |
| 浏览器能力误判（合成 touch 派发/override 共存/cookie 边界与真实浏览器行为不符） | 中 | 高 | 验证门先行（G-01 touch P2）；override/paste/clipboard roundtrip 冒烟前置；不合格项走降级 out + 归属（v3 S-02 先例） |
| 安全面失控（cookie 明文/自动 accept 误确认/拦截误改/观察泄漏键入与 console 敏感文本） | 中 | 高 | PRM 全量挂点：risk 声明 + untrusted 守卫 + 明细 trusted+ask + 掩码缺省 + 审计零明文 + 破坏性 deny-accept 护栏（ADR-005/006/008） |
| instrumentation patch 破坏宿主页（fetch/XHR/console override 与页面库冲突） | 低 | 中 | 惰性安装 + 透传原引用 + 共存可读冲突 + 冒烟断言原输出仍达 DevTools/网络（NFR-004/FR-016） |
| 跨导航/订阅失效语义被误当 bug（AI 期望自动续接） | 中 | 低 | 明示失效 + 帮助面 + lifecycle 事件提示 + list 空态文案（EC-001/FR-010）；契约预留扩展续接（NG-009） |
| 扩展线纪律漂移（F-14 抢跑/引入扩展依赖） | 低 | 中 | EXT 纯文档面（ATTRIBUTION_MAP 不接线不进 schema）+ grep 零扩展痕迹断言 + package.json 依赖图谱零新增（FR-025~027/NFR-001/002） |
| v2/v3 未发布基线漂移（v0.7 同批叠加、真实 AI 闭环基线未闭合） | 中 | 中 | FR-004「待基线」标注不阻塞 + 收口人工基线关联表移交 validate；与 v2/v3 同分支代码位开发 |
| 范围/容量膨胀（30 FR 单 Feature） | 中 | 中 | 裁决 1 砍扩展工程膨胀源；波次承载（P0/P1/P2）；页内面并行任务块；EXT 全文档面零代码 |
| 事件真实性与来源标记误导 AI | 低 | 中 | 如实转述 + isTrusted 不升级 + synthetic 来源标记 + 帮助面局限公开（FR-015/NG-007） |

---

## 8. 生成的 ADR
> 12 个 ADR，承接 spec §9.4 残留（O-003-α/O-005/O-007/O-009/O-011-α）+ P-01~P-06 技术开放点 + 作者四裁；状态 ACCEPTED（作者裁决冻结输入采纳）或 PROPOSED（供作者核签）

| ADR | 标题 | 状态 |
|-----|------|:--:|
| ADR-001 | v4 范围判定标准 = 载体判据（页内可达全落地 / 需扩展只契约预留） | ACCEPTED |
| ADR-002 | 事件 push 通道 = 文档级 EventBus + env.events 可选缝（同步捕获 + lastId 增量拉取；订阅随文档销毁） | ACCEPTED |
| ADR-003 | 事件去重/顺序/合并（全局单调 seq + 每订阅游标 + 抖动合并窗口 + 最旧丢弃计数） | ACCEPTED |
| ADR-004 | 事件通道预算默认值口径（O-011-α 表） | ACCEPTED |
| ADR-005 | 事件负载字段与过滤语法 + dom observe 落位（events subscribe --kind dom） | ACCEPTED |
| ADR-006 | FR-006 敏感字段模型扩展至 v4 新对象（cookie/URL·header·body/键入/console·对话框/富剪贴板） | ACCEPTED |
| ADR-007 | 对话框 override：同 realm 捕获 + 缺省保守应答 + 破坏性 deny-accept 护栏 | ACCEPTED |
| ADR-008 | 网络观察/拦截 = 同 realm fetch/XHR 单点共享 instrumentation（观察 P1/拦截 P2 deny；AI 自请求默认不可见） | ACCEPTED |
| ADR-009 | cookie 与富剪贴板/粘贴页内面实现与门禁（同源非 HttpOnly 掩码缺省 + ClipboardItem 富写 + paste 事件读） | ACCEPTED |
| ADR-010 | 合成 touch = P2 最小浏览器验证门（失败降级 out + CDP 归属） | PROPOSED |
| ADR-011 | shadow/iframe 穿透定位 = 共享 resolver 增强（open shadow + 同源 iframe + 深度护栏；closed/跨域归属） | ACCEPTED |
| ADR-012 | EXT 统一转译面 + 契约预留 + F-14 关系纪律（纯文档面，零扩展工程零依赖） | ACCEPTED |

### ADR-001: v4 范围判定标准 = 载体判据（页内可达全落地 / 需扩展只契约预留）

## 状态
ACCEPTED（作者裁决 1 核签，2026-09-07；承接 O-003-α/S-01/S-03 + I-01）

## 背景
spec §2.5 以切面枚举描述 v4 范围（🟢 落 v4 / 🔴 契约预留），但 11 项中 6 项为分层体，逐项枚举易漂移且 C-05/C-11 等边界项判定需统一标准。discovery §4.2 判据 = 浏览器安全模型 + API 归属（对象归属而非能力）。作者裁决 1 提出可执行判定标准：「是否依赖浏览器扩展」。

## 决策
v4 落地判定标准 = **「是否依赖浏览器扩展」**：
1. **不依赖浏览器扩展的能力（页内可达）→ 全部进 v4 实现**：事件观察流 push 通道（dom observe/lifecycle/console·网络观察）、对话框 override、cookie 同源面、富剪贴板、shadow/同源 iframe 穿透、合成 touch（P2 验证门）、网络拦截 P2（裁决 2）等页内可达面。
2. **依赖浏览器扩展的能力 → 只做「契约预留 + 不支持转译」**：多标签/窗口、下载管理、整页截图、HttpOnly/跨域 cookie、DevTools 全局面网络、跨导航持久订阅、closed shadow/跨域 iframe、原生对话框、真受信输入、file input DataTransfer 注入面等——不实现扩展工程（NG-002/FR-025~027）。
3. **例外（显式裁决优先于通用标准）**：C-05 内存 DataTransfer 注入面页内可达但不解冻（作者 O-006 显式裁）；C-11 页内假 API 注入 = 欺骗注入不允许（裁决 4 out）；整页截图保持 out（O-006）。三项均只契约预留。
4. spec §2.5/NG 表与本 ADR 冲突处，以本 ADR 载体判据为统一解释。

## 后果
范围判定单点可执行（任何新候选能力按「是否依赖扩展」二分），不再依赖枚举；砍掉扩展工程最大膨胀源（R-001 缓解）；C-05/C-11 的 out 语义由「不可承载」变为「作者显式裁决」，杜绝静默解冻；EXT 组 = 纯文档面（ADR-012）。

### ADR-002: 事件 push 通道 = 文档级 EventBus + env.events 可选缝（同步捕获 + lastId 增量拉取；订阅随文档销毁）

## 状态
ACCEPTED（作者裁决 R-02/O-002；承接 P-01/O-007/S-04）

## 背景
当前架构 request→response 无 push/订阅通道（Q-001）；事件观察流（C-01）需新机制且不得破坏既有工具面（FR-001/NG-008）。

## 决策
1. **机制**：纯逻辑 `EventBus`（event-bus.ts，node 可测）——订阅注册表（唯一 subId）/每订阅独立缓冲/预算/合并/开关/lastId 增量拉取；观察源同步 append。
2. **缝**：PlatformEnv 新可选缝 `events?: PlatformEventHub`（缺省 undefined → 通道不可用转译 EC-011）；browserEnv 装配 `createBrowserEventHub()`（构造零副作用，观察源首个订阅/规则时惰性安装 = 默认关零常驻 NFR-007）。
3. **投递模型（P-01）**：捕获**同步**入缓冲（无批处理/微任务队列）；AI 取回**异步**（工具调用 pull）；事件流不自动进 LLM 上下文（NFR-003：摘要 + 计数 + 可拉取提示）；AI 回合外水位提示归场景 UI（FR-029），base 不引入中断式事件驱动 runner。
4. **生命周期（O-007）**：hub 实例 = 当前文档作用域对象（session 每文档重建 env）→ 整页导航/reload 后订阅与缓冲随文档销毁 = 天然失效（明示语义 + help 提示，NG-009 out 不自动续接）；SPA 会话内导航订阅保持；v3 reload 默认 ask 语义零改动。

## 后果
既有工具零改动零推式副作用（FR-001 grep 断言可行）；事件驱动场景（等用户/等导航/感知 console·网络失败）从 sleep+快照猜变为订阅+pull；跨导航持久订阅不可表达 → 契约预留（FR-026 扩展归属）；上下文预算与干扰 tool_choice 风险受 ADR-003/004 护栏。

### ADR-003: 事件去重/顺序/合并（全局单调 seq + 每订阅游标 + 抖动合并窗口 + 最旧丢弃计数）

## 状态
ACCEPTED（承接 P-02/O-011/S-08）

## 背景
事件流多源并发、高频抖动（scroll/mousemove）与页面洪峰会破坏顺序/重复/预算（EC-002/Q-016）；增量拉取需可靠游标（FR-008 无重复无遗漏）。

## 决策
1. **顺序**：hub 入口分配**全局单调 seq**（跨源总序，审计/去重基准）；单订阅内顺序 = seq 序（到达序）。
2. **游标**：每订阅本地 `lastId`（= 已拉取最大 seq）；`pull{lastId}` 返回 `seq > lastId` 全部 → 增量无重复无遗漏（AC-002 断言）。
3. **去重/合并**：仅抖动类事件类型（scroll/resize/mousemove/mouseover）可合并——同类型 + 同目标 + 合并窗口（默认 800ms 可配，0=关）内合并为单条 `count` 事件（含 first/last 时间戳）；其余类型不合并（保真）。
4. **缓冲满**：最旧丢弃 + `dropped` 计数标记（不静默丢计数）；单事件负载 4KB 截断 + truncated 标记。
5. 事件以不可变负载入缓冲（入缓冲即冻结，杜绝拉取侧篡改顺序）。

## 后果
增量拉取可靠（无重复无遗漏可单测断言）；洪峰受控（合并 + 丢弃计数可见）；顺序语义单点定义（seq 总序）；多订阅并发互不干扰（每订阅独立缓冲/游标）。

### ADR-004: 事件通道预算默认值口径（O-011-α）

## 状态
ACCEPTED（承接 O-011-α/P-03/S-08 + NFR-003）

## 背景
spec O-011-α 要求 plan 给出预算默认值口径，沿 v3「预算值收敛 + 场景可配」方法（NFR-003）。

## 决策
默认值表（场景经 `events budget`/`subscribe` 可配，覆盖不可低于安全下限）：每订阅缓冲 200（上限 1000）/ 每订阅累计 2000（超限自动暂停 + 提示）/ 全通道并发订阅 8 / 全通道速率护栏 200 条/s（超限丢弃 + 计数）/ 抖动合并窗口 800ms / 投递摘要 N=10 / 单事件负载 4KB / 全局开关默认关（无订阅零常驻）。全部值在 event-bus.ts 常量集中声明（单一数据源，测试断言用）。

## 后果
预算行为可预测可测（洪峰断言/水位断言/零开销基准对比）；上下文只见摘要计数不撑爆（NFR-003/007）；自动暂停（非退订）保留可恢复性。

### ADR-005: 事件负载字段与过滤语法 + dom observe 落位（events subscribe --kind dom）

## 状态
ACCEPTED（承接 P-04；spec §5.3 命名由 plan 落位）

## 背景
spec EVT 组要求 plan 落位「工具/子命令命名」与「事件负载字段与过滤语法」（P-04）；FR-009 命名为 dom observe。

## 决策
1. **命名落位**：`dom observe` 语义 = **`events subscribe --kind dom`**（观察 = 订阅通道语义，归 events 工具家族；不新增 dom 子命令，避免与既有 27 子命令语义混淆 + 零回归红线上最稳）；帮助面显式标注「dom observe（FR-009）= events subscribe --kind dom」别名。lifecycle/console/network 同理 = kind 枚举。
2. **统一事件负载**：`{seq, ts, kind, type?, target?（selector/标签+文本前缀摘要）, text?（脱敏后摘要）, meta?（URL/level/status/耗时/source…按 kind）}`；键入敏感面（keydown/input）负载不含明文值（key 名 + 修饰键布尔；目标敏感字段值掩码 FR-006）；console 默认关 stack。
3. **过滤语法**：订阅级 filter = 事件类型（csv）∩ selector 目标（css:/text= 语法面）∩ URL 模式（network/lifecycle）∩ level 集（console）；glob 沿既有 globMatch 语义；过滤在 hub 入口按订阅执行。

## 后果
工具面收敛（一个 events 工具承载订阅/观察/拉取全部语义，schema 可控）；FR-009~012 全部经 kind 参数可追踪（AC-002~004 断言映射表）；键入/console 敏感面默认不含明文（FR-006 前置）。

### ADR-006: FR-006 敏感字段模型扩展至 v4 新对象（cookie/URL·header·body/键入/console·对话框/富剪贴板）

## 状态
ACCEPTED（承接 O-008/S-05/FR-006 + FR-024 语义扩展）

## 背景
v3 FR-024 敏感模型只覆盖表单字段（sensitiveFieldMatch 按 type/autocomplete/name-id）；v4 新对象（cookie 值/URL 查询串/header/请求体/键入事件/console·对话框文本/富剪贴板）无脱敏面（Q-006/Q-012/Q-014）。

## 决策
1. **模型扩展为两层**：表单字段模型（既有，零回归）+ **通用文本/URL/header 面**（新纯函数族，sensitive.ts 追加）：`redactUrlQuery(url)`（token/key/sign/…查询参数掩码）、`isSensitiveHeader(name)`（authorization/cookie/x-api-key/proxy-authorization 等）+ `maskHeaderValue()`、`maskTextPayload(text, policy?)`（`key=value`/Bearer/`token:` 形态启发式，保守取向沿 maskValue：掩码/长度占位/类型替代）。
2. **接入点**：cookie 读值缺省掩码（明细 = read-detail trusted+ask）；网络观察/拦截上下文 URL 查询串脱敏 + 敏感头不进负载；键入事件不含明文值；console/对话框文本经可配脱敏策略（缺省保守）；富剪贴板文本按同规则。
3. **明细纪律**：任何敏感明文获取路径 = 独立子命令/参数 + risk 'write' 档 + 显式 trusted 声明 + ask + 审计（决策入审计）；审计/日志零明文（grep 断言）。

## 后果
凭据与个人信息不进上下文/日志/审计（NFR-002/AC-007）；观察/写面敢启用；表单字段既有用例零回归（additive 纯函数追加）。

### ADR-007: 对话框 override：同 realm 捕获 + 缺省保守应答 + 破坏性 deny-accept 护栏

## 状态
ACCEPTED（承接 C-03/O-008/S-05/FR-016/017 + EC-005/006）

## 背景
页面 alert/confirm/prompt 阻塞无人值守自动化（Q-004）；自动应答有误确认风险（US-004）；浏览器原生对话框不可 hook（NG-011）。

## 决策
1. **override**：dialog 工具 `override-install` = write risk 缺省 ask → 替换同 realm window.alert/confirm/prompt（同源 iframe 各自 window 逐一 hook；跨域 iframe 不可 hook → 归属）；保存原引用、可逆卸载；与页面 polyfill/React 生态共存冲突 → 可读说明（NFR-004）；捕获事件入通道（kind=dialog）。
2. **应答策略**：规则集 {类型 × 文本/URL 模式 → accept/dismiss/promptText}，dialog-policy.ts 纯匹配 node 可测；**缺省保守** = alert 记录即返回、confirm/prompt 无匹配 → dismiss（否定值）+ 事件 + 审计；prompt 自动输入值仅 trusted 规则显式提供。
3. **误确认护栏（EC-006）**：DESTRUCTIVE_PATTERNS（删除/覆盖/清除/提交类中英词元）命中且无显式 trusted accept 规则 → 永不自动 accept。
4. 规则注册 = untrusted 拒（缺省）+ trusted 放行 + 审计；override 全周期入审计。

## 后果
模态框卡死场景可委派（AC-006 三路断言：缺省保守/trusted accept/破坏性 deny-accept）；误确认风险受护栏约束；原生对话框（HTTP auth 等）→ 归属转译（FR-025，不假装已捕获）。

### ADR-008: 网络观察/拦截 = 同 realm fetch/XHR 单点共享 instrumentation（观察 P1/拦截 P2 deny；AI 自请求默认不可见）

## 状态
ACCEPTED（承接 C-04/裁决 2/S-10/FR-012/018 + NG-010）

## 背景
宿主页自身网络活动 AI 不可见不可改（Q-003，A2 F12 等效）；DevTools 全局面（非 JS 子资源/跨 realm/先网络栈/响应伪造）页内不可达（NG-010）。

## 决策
1. **单点共享 instrumentation**：platform-events.ts networkPatch——首个 network 订阅或首条拦截规则时惰性包装 `window.fetch` + `XMLHttpRequest.prototype.open/send`；观察（EVT FR-012）与拦截（NET FR-018）共享同一安装点与包装器（包装透传原引用，页面行为不变；无订阅无规则零开销）。
2. **观察**：method/URL（查询串脱敏 ADR-006）/status/耗时/响应头子集（缺省不含敏感头）；响应体默认不读取；早于安装的请求不回看。
3. **拦截（裁决 2：P2 门禁 in + 缺省 deny）**：URL 模式匹配 → 发出前增/改 header、查询参数、请求体字段；net 工具整工具默认关 + risk 缺省 deny + 规则注册显式 trusted + 命中全量审计；响应伪造/缓存篡改/先网络栈/跨 realm 入参 → 不支持 + 归属（FR-025）。
4. **公开差异（AI 自请求）**：web-fetch 走 env.fetch 早期绑定原生引用（browserEnv 构造时绑定），不经过后装包装器 → **AI 自请求默认不入观察流**（比 spec FR-012 来源标记更严格隐私缺省）；如需 AI 自检流量，后续经 source 过滤扩展（不在本 FR）。

## 后果
排障网络面板等效可达（AC-004）；拦截面 P2 受 deny/trusted/审计护栏（AC-007）；instrumentation 惰性安装满足零开销断言（NFR-007）；AI 自请求不可见 = 隐私 + 防自扰（差异已文档公开）。

### ADR-009: cookie 与富剪贴板/粘贴页内面实现与门禁（同源非 HttpOnly 掩码缺省 + ClipboardItem 富写 + paste 事件读）

## 状态
ACCEPTED（承接 C-06/C-07/O-008/FR-019~022）

## 背景
cookie 凭据面零覆盖（Q-006，全仓 grep cookie = 0 命中）；剪贴板仅文本（Q-007）；HttpOnly/跨域/域级 cookie 与无手势剪贴板读页内不可达。

## 决策
1. **cookie（FR-019/020）**：读 = PlatformDomOps.cookieRead（document.cookie 可达面，值缺省掩码 maskValue）；明细 read-detail = risk 'write' 档 + trusted + ask；写/删 = cookieWrite/Delete（同源非 HttpOnly；Secure/HttpOnly 写面限制分类转译 EC-007）；写值 untrusted 拒 + 写后回读断言 + 审计（名掩码）。HttpOnly/跨域/域级 → 归属 chrome.cookies（FR-025/026）。
2. **富剪贴板写（FR-021）**：env.clipboardRich 新缝（navigator.clipboard.write + ClipboardItem：text/html/image/png/text/plain 并存；授权失败转译沿 v3 FR-009/EC-008）；clipboard 工具增 write-html/write-image（既有文本 write 零回归）。
3. **粘贴读（FR-022）**：hub paste 捕获槽（document paste 监听，用户主动粘贴才触发）；clipboard paste-read 读取富内容 + 文件项元数据（可 save/export 落盘）；读 = ask + 脱敏；无手势系统剪贴板读/历史 = 不支持（NG-012）。

## 后果
会话/身份状态最小可见面（登录态判断/测试环境准备）可用且有凭据护栏（AC-007）；复制粘贴格式保真 + 文件粘贴读可达（AC-009 场景）；扩展侧（HttpOnly/跨域/域级/剪贴板历史）= 契约预留（ADR-012）。

### ADR-010: 合成 touch = P2 最小浏览器验证门（失败降级 out + CDP 归属）

## 状态
PROPOSED（承接裁决 3/S-09/Q-013/A-004；validate G-01 前置）

## 背景
v3 交互全谱 = pointer/mouse 合成面；触屏生态位（C-08）价值假设与桌面 chromium 合成 touch 可用性均无证据（Q-013）。

## 决策
1. dom 增 `tap/swipe/pinch` 子命令（PlatformDomOps.touchDispatch：TouchEvent 构造 + touchstart/move/end 序列；selector/坐标；isTrusted=false + NG-007 同族局限公开）。
2. **验证门先行（G-01）**：真实 chromium 最小验证——合成 TouchEvent 可构造派发且对 touch 监听页面生效（tap/swipe/pinch 各 ≥1）；**失败 → FR-024 降级 out 记录** + 归属 CDP Input.dispatchTouchEvent（v3 S-02 降级出口先例）。
3. 移动端价值假设未验证前不扩大投入；目标不处理合成事件 → 可读提示（EC-007 语义沿）。

## 后果
P2 波容量风险可控（验证不合格即 out，不返工）；合成/真受信边界公开（NG-007/FR-015）；验证结果写入 validate 报告。

### ADR-011: shadow/iframe 穿透定位 = 共享 resolver 增强（open shadow + 同源 iframe + 深度护栏；closed/跨域归属）

## 状态
ACCEPTED（承接 C-09/FR-023/Q-010）

## 背景
v3 定位 CSS 基线无法穿透 shadow 边界与 iframe 文档（Q-010）——「看到的元素」与「能定位的元素」断层；closed shadow/跨域 iframe SOP 不可达（NG-012）。

## 决策
1. **不做新语法、不加新子命令**：穿透落在 platform-dom.ts **共享元素解析 resolver**（readElement/findElements/click/fill/extract 等全经此）——主文档 CSS 命中照旧（零回归）；未命中 → 递归走查 open shadowRoot → 同源 iframe contentDocument（SOP 内）；深度护栏默认 ≤4 层可配。
2. 命中事件带 `via:'shadow'/'iframe'` 标注（AI 可读）；closed shadow/跨域 iframe → 不支持 + 归属 content script(all_frames)/CDP（FR-025）。
3. locator.ts 帮助/语法文档面补穿透说明（解析层不变）。

## 后果
Web Components/同源子应用内元素可定位（read-element/click/fill/extract 全工具生效，单点增强）；既有 CSS/text= 定位零回归；跨域/closed 边界不静默（归属转译）。

### ADR-012: EXT 统一转译面 + 契约预留 + F-14 关系纪律（纯文档面，零扩展工程零依赖）

## 状态
ACCEPTED（承接 O-005/S-02/FR-025~027 + NG-002~005/009~012）

## 背景
需扩展能力（多标签/窗口、下载、HttpOnly/跨域 cookie、DevTools 全局网络、跨导航持久订阅、closed shadow/跨域 iframe、原生对话框、真受信输入、权限真模拟、file 真路径注入、DataTransfer 注入面）网页内不可达（裁决 1）；v3 以单值 out 挂账「不存在的载体」（Q-002）；F-14（v1.1 线）门禁须守护（NG-002/O-005）。

## 决策
1. **统一转译面**：ext-attribution.ts = ATTRIBUTION_MAP（能力 → 归属（F-14 扩展宿主/CDP）→ 扩展 API/CDP 域 → 预留契约建议名/入参/返回/门禁挂点/与页内对应能力切面关系）+ `unsupportedAttribution()` helper；各工具 executor/help 接线（不静默降级、不假装生效、不 catch 吞错；文案与 v3 chrome-tools 整页截图先例同构）。
2. **契约预留 = 文档面**：类型占位注释 + 常量映射，**不注册工具、不进 schema、不接线**（schema 体积零变化断言）；仅供 F-14 立项继承/修订（非承诺）。
3. **纪律（O-005）**：不触碰 F-14 门禁（开源决策/协议机制/插件技术栈/安全评审不变）；零扩展依赖（@types/chrome 等 devDep 不增）；grep 断言零扩展工程痕迹。

## 后果
全部 out 面逐项可读转译 + 归属表（AC-008 逐项断言）；F-14 立项有契约继承基线（US-007）；v4 零扩展工程零依赖（NFR-001/002/AC-008 grep 清单）。

---

## 9. 任务切分建议（sddu-tasks 输入；tasks.json/tasks.md 由 sddu-tasks 产出）
> 可并行原子任务块划分建议（含依赖提示），不替代 sddu-tasks 的依赖拓扑/验收细化。

| 任务块 | 内容 | 关联 | 建议波 | 依赖 |
|---|---|---|---|---|
| TB-A | event-bus.ts Hub 纯逻辑（订阅/缓冲/预算/合并/开关/lastId/pull/审计钩子 + 常量默认值）+ node 单测 | EVT FR-008/013/014 + ADR-002~004 | P0 | 无（先行） |
| TB-B | platform.ts：PlatformEventHub/PlatformRichClipboard/PlatformSubscribeOptions 等类型面 + PlatformDomOps cookie/touch 可选方法 + env.events/clipboardRich 缝声明 + nodeEnv 不预置 + 未注入转译 | FR-002/003 + ADR-002/009 | P0 | TB-A（类型引用 Hub） |
| TB-C | sensitive.ts 脱敏函数族扩展（redactUrlQuery/header/maskTextPayload/键入策略）+ audit.ts 事件面扩展 | PRM FR-006/007 + ADR-006 | P0 | 无（纯逻辑，可与 TB-A/B 并行） |
| TB-D | platform-events.ts：createBrowserEventHub 浏览器实现（domObserve/lifecycle 源 + synthetic 标志读取） | FR-003/009/010/015 | P0 | TB-A/B/C |
| TB-E | events-tools.ts 工具（executor/schema/help/subcommandRisks + 审计记录点） | FR-008~010/013~015 | P0 | TB-B/D（fake 注入面先行可并行） |
| TB-F | platform-events.ts consolePatch/networkPatch 观察源 | FR-011/012 | P1 | TB-D（同文件扩展） |
| TB-G | dialog-policy.ts 纯策略 + dialog-tools.ts + override 源 | FR-016/017 + ADR-007 | P1 | TB-C/D |
| TB-H | cookie：PlatformDomOps.cookie* 真实现 + cookie-tools.ts | FR-019/020 + ADR-009 | P1 | TB-B（ops 面 + 工具并行） |
| TB-I | clipboardRich 缝 + clipboard.ts write-html/write-image/paste-read + paste 捕获源 | FR-021/022 + ADR-009 | P1 | TB-B/D |
| TB-J | platform-dom.ts 共享 resolver 穿透（深度护栏/via 标注）+ locator 帮助面 | FR-023 + ADR-011 | P1 | 无（platform-dom 内增强，独立） |
| TB-K | ext-attribution.ts（ATTRIBUTION_MAP + helper）+ 各工具 help 接线 + 契约预留注释面 | FR-025/026/027 + ADR-012 | P1 | 无（纯常量，可与各工具并行后接线） |
| TB-L | lgdl-web：session.ts v4 矩阵块 + LGDL_DEFAULT_POLICY_RULES 扩展 + AiPanel/AskDialog 呈现 | FR-028/030（+029 P2） | P1/P2 | TB-E~K 工具工厂就绪后 |
| TB-M | NET 拦截：net-tools.ts + networkPatch intercept 引擎（规则引擎纯逻辑先行） | FR-018 + ADR-008（裁决 2） | P2 | TB-F（共享 instrumentation） |
| TB-N | TCH：验证门 G-01（最小 chromium touch 验证）→ dom tap/swipe/pinch ops + 子命令 或 out 记录 | FR-024 + ADR-010（裁决 3） | P2 | 验证门先于实现 |
| TB-O | 收口：base index 导出 + 全仓门禁 + v2/v3 零回归 + V13 冒烟清单扩展（含 G-01/G-02）+ validate 移交（v2/v3 收口基线关联表 FR-004） | FR-001/003/004 + NFR-005/006/007 | 每波末尾/终收 | 全部 |

**并行组摘要（build 可同时开工）**：P0 = TB-A/B/C 并行 → TB-D → TB-E（E 可先以 fake hub 开工）；P1 = TB-F~K 六路并行（platform-events 源 × 纯逻辑策略 × 工具 executor × resolver 增强 × attribution）+ TB-L 尾接；P2 = TB-M/N 并行（共享 TB-F instrumentation）+ TB-O 终收。

---

## 10. 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建：以 spec.md v1.0（30 FR 十一组）+ discovery.md v1.1（载体分层/O 清单）+ 作者三裁与四裁（R-01~R-03 + 裁决 1~4）为红线输入；定义事件 push/缓冲/订阅通道机制（订阅 API/缓冲模型/lastId/预算护栏/开关）与 env.events 可选缝 + platform-events.ts 浏览器实现文件（观察/override/patch 收敛面扩展）；FR → 工具/子命令/模块落位总表；EVT/DIA/NET/CK/CLP/SHD/TCH/EXT 分模块技术方案；方案对比 3 主题 + 推荐；技术开放点 P-01~P-06 与 O-003-α/O-005/O-007/O-009/O-011-α 最终决策；预算默认值口径表；12 ADR（ACCEPTED 10/PROPOSED 2，正文内嵌 §8）；任务切分建议 15 块（§9，tasks 产出归 sddu-tasks）；文件影响 20+ 项（base 新增 7 文件/修改 10+，lgdl-web 3 文件，零新增依赖） | 2026-09-07 | SDDU Plan Agent |
