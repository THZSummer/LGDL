# 任务分解：web-cli-base v4：浏览器外壳纵深与事件流（specs-tree-web-cli-base-v4）

> **文档定位**: SDDU 任务清单 — 将技术方案分解为可并行执行的原子任务，作为 build 阶段的输入
> **前置依赖**: plan.md v1.0（12 ADR + §3.0 FR 落位总表 + §5.4 波次交接 + §6 文件影响 20+ 项 + §9 任务切分建议 15 块 TB-A~TB-O）、spec.md v1.0（30 FR 十一组 + 8 NFR + 12 EC + 10 AC，冻结）、state.json（phase=planned）
> **创建人**: SDDU Tasks Agent
> **创建时间**: 2026-09-08
> **版本**: v1.0
> **更新人**: SDDU Tasks Agent
> **更新时间**: 2026-09-08
> **更新说明**: 初始创建（plan §9 任务块 TB-A~TB-O → 按「文件所有权 + 依赖拓扑 + 波次门禁」整合为 14 个原子任务 / 9 个执行波次；TB-D+TB-F 合并为 TASK-004（platform-events.ts 单文件所有权，观察源一次成文）；TB-L 的 lgdl-web 三文件（session/AiPanel/AskDialog）合并为 TASK-011（FR-028/029/030 场景单点收口，v3 TASK-009 先例）；P0 串行主轴 TASK-001→003→004/005；P1 五路并行（006/007/008/009/010）；P2 两个验证门任务（012=NET G-02、013=TCH G-01）内嵌降级出口；TASK-014 = 红线校验 + 终收口 GATE。D-001：TB 块合并记录 + 每步门禁（AC-001）定义于 §4.1）

---

## 1. 依赖拓扑总览

> 任务依赖关系和执行顺序。P0/P1/P2 = plan 波次标签（spec §9.5 对齐），Wave N = 实际执行波次。
> **类型标注**：🛠 实施任务 / 📄 文档·契约预留任务（EXT 组 = 零扩展工程，仅常量/接线/注释面）/ ⚖️ 验证门任务（内嵌降级出口）。
> 红线贯穿：每任务完成后既有测试零删除零降级 + 相关包测试全绿（AC-001 每步门禁，§4.1）。

### 1.1 任务总览表

| 编号 | TB | 模块/落点 | 类型 | 复杂度 | 依赖 | plan波次 | 执行波次 | 一句话目标 |
|------|----|----------|:--:|:--:|------|:--:|:--:|------|
| TASK-001 | A | base 事件通道核心：event-bus.ts | 🛠 | M | 无 | P0 | Wave 1 | EventBus 纯逻辑（订阅/缓冲/预算/合并/开关/lastId 增量/审计钩子）+ 预算常量单一数据源 |
| TASK-002 | C | base PRM：sensitive + audit | 🛠 | M | 无 | P0 | Wave 1 | FR-006 脱敏函数族（URL/header/文本/键入）+ FR-007 审计事件面扩展 |
| TASK-003 | B | base 缝类型面：platform.ts | 🛠 | M | 001 | P0 | Wave 2 | PlatformEventHub/PlatformRichClipboard 缝 + PlatformDomOps cookie/touch 可选方法（缺省 undefined，编译零破坏） |
| TASK-004 | D+F | base 浏览器真实现：platform-events.ts + browserEnv 装配 | 🛠 | L | 001/002/003 | P0(+FR-011/012) | Wave 3 | createBrowserEventHub（dom/lifecycle/console/network 观察源 + synthetic 标志）+ env.events 装配（惰性零常驻） |
| TASK-005 | E | base events 工具：events-tools.ts | 🛠 | L | 003（联调需 004） | P0 | Wave 3 | events 11 子命令（订阅生命周期/pull/预算/开关）+ schema/help/subcommandRisks + 审计 |
| TASK-006 | G | base DIA：dialog-policy + dialog-tools + override 源 | 🛠 | L | 002/003/004 | P1 | Wave 4 | 对话框 override 安装/卸载 + 应答策略（缺省保守 + 破坏性 deny-accept） |
| TASK-007 | H | base CK：PlatformDomOps.cookie* + cookie-tools | 🛠 | M | 002/003 | P1 | Wave 4 | 同源 cookie 读（掩码）/明细/写/删 + 门禁 + 归属转译 |
| TASK-008 | I | base CLP：clipboardRich 缝 + clipboard 富子命令 + paste 捕获 | 🛠 | M | 003/004 | P1 | Wave 5 | write-html/write-image/paste-read（文本 read/write 零回归） |
| TASK-009 | J | base SHD：共享 resolver 穿透 + locator 文档面 | 🛠 | M | 无（platform-dom 内增强） | P1 | Wave 5 | open shadow 递归 + 同源 iframe 穿透 + 深度护栏 + via 标注 |
| TASK-010 | K | base EXT：ext-attribution + 归属接线 | 📄 | M | 005/006/007/008 | P1 | Wave 6 | 「不支持 + 归属」统一转译 + ATTRIBUTION_MAP 契约预留（零扩展工程/零 schema） |
| TASK-011 | L | lgdl-web 场景接入 + base index 导出收口 | 🛠 | L | 004~010 | P1(+029) | Wave 7 | session 矩阵块 + 策略规则 + AiPanel 事件区/AskDialog 文案 + index v4 导出 |
| TASK-012 | M | base NET：拦截引擎 + net-tools + session 行 | ⚖️🛠 | L | 004/011 | P2 | Wave 8 | fetch/XHR 发出前拦截（P2 deny + trusted）+ **G-02 验证门 → 失败降级 out** |
| TASK-013 | N | base TCH：合成 touch 派发 | ⚖️🛠 | M | 011 | P2 | Wave 8 | dom tap/swipe/pinch + touchDispatch（**G-01 验证门先行 → 失败 out 零实现**） |
| TASK-014 | O | 红线校验 + 终收口 GATE | 🛠 | L | 全部 | 每波/终收 | Wave 9 | AC-001 零回归专项 + 纯度/依赖 grep + 全仓门禁 + V13 冒烟清单 + validate 移交 |

### 1.2 依赖拓扑（串行主轴 + 并行组）

```
P0 串行主轴（契约/安全柱 → push 通道核心；先机制后域）：
  TASK-001 event-bus Hub（无依赖，W1） ──> TASK-003 platform.ts 缝类型（W2） ──> TASK-004 platform-events.ts 观察源工厂 + browserEnv 装配（W3）
                                          └─> TASK-005 events-tools（W3 与 004 并行：fake hub 注入面先行，真 hub 联调依赖 004）
  TASK-002 sensitive + audit（无依赖，W1，与 001 并行；TASK-004/006/007/008 消费其脱敏/审计类型）

P1 页内快赢主体（五路并行，各自文件所有权；均消费 W1~W3 的缝类型/观察源基座）：
  TASK-006 dialog（dialog-policy/dialog-tools NEW + platform-events 追加 override 源）
  TASK-007 cookie（platform-dom 追加 ops + cookie-tools NEW）
  TASK-008 clipboard 富（platform.ts 装配 clipboardRich + clipboard.ts 子命令 + platform-events 追加 paste 源）   [W5，与 009 并行]
  TASK-009 SHD resolver（platform-dom 内增强 + locator 文档面）                                                 [W5，与 008 并行]
  TASK-010 EXT attribution（ext-attribution.ts NEW + 005~008 各工具 help/executor 归属接线）                    [W6，接线依赖 P1 工具就绪]
  TASK-011 lgdl-web 场景收口（session 矩阵 + 策略 + AiPanel/AskDialog + base index 导出）                        [W7，依赖 P1 全部]

P2 高门槛/验证门收尾（两路并行 + GATE）：
  TASK-012 NET 拦截（G-02 验证门 → 通过实现 / 失败 out 记录）                                                   [W8]
  TASK-013 TCH 合成 touch（G-01 验证门 → 通过实现 / 失败 out 零实现）                                            [W8]
  TASK-014 红线校验 + 终收口 GATE                                                                                 [W9，依赖全部]
```

### 1.3 并行分组（执行波次）

```
Wave 1 ─── (P0-a，并行组 ①：无依赖，文件不相交)
  TASK-001 [M] event-bus.ts Hub 纯逻辑 + node 单测
  TASK-002 [M] sensitive 脱敏函数族 + audit 事件面扩展 + 单测

Wave 2 ─── (P0-b，串行：依赖 001)
  TASK-003 [M] platform.ts 新缝类型面/可选方法/未注入转译

Wave 3 ─── (P0-c，并行组 ②：文件不相交；005 可 fake hub 先行)
  TASK-004 [L] platform-events.ts（dom/lifecycle/console/network 观察源 + synthetic + browserEnv 装配 env.events）
  TASK-005 [L] events-tools.ts（11 子命令 + fake hub 注入面单测）

Wave 4 ─── (P1-a，并行组 ③：文件不相交)
  TASK-006 [L] dialog-policy + dialog-tools + override 源（platform-events.ts 追加）
  TASK-007 [M] cookie ops 真实现（platform-dom.ts）+ cookie-tools

Wave 5 ─── (P1-b，并行组 ④：文件不相交）
  TASK-008 [M] clipboardRich 富写缝 + clipboard 富子命令 + pasteCapture 源
  TASK-009 [M] platform-dom.ts 共享 resolver 穿透增强 + locator 帮助面

Wave 6 ─── (P1-c，串行：归属接线依赖 005~008 工具就绪)
  TASK-010 [M] ext-attribution.ts + 各工具归属接线（文档/契约预留）

Wave 7 ─── (P1-d 场景收口，串行：依赖 P1 全部)
  TASK-011 [L] lgdl-web session 矩阵 + LGDL_DEFAULT_POLICY_RULES + AiPanel/AskDialog + base index 导出

Wave 8 ─── (P2，并行组 ⑤：各自文件；session.ts 追加行同文件，建议按列表顺序执行)
  TASK-012 [L] NET 拦截（G-02 验证门 → 实现/降级 out）
  TASK-013 [M] TCH 合成 touch（G-01 验证门 → 实现/out 零实现）

Wave 9 ─── (GATE，依赖全部)
  TASK-014 [L] 红线校验 + 全仓门禁 + 冒烟清单 + validate/ROADMAP 移交
```

---

## 2. 任务列表

> 每个任务的详细定义。验证命令中 base = `packages/web-cli-base`（包 @lgdl/web-cli-base）、lgdl-web = `packages/lgdl-web`（包 @lgdl/lgdl-web）；测试文件平铺 src 根（既有约定，兼容 base 通配测试脚本）。
> 缩写对照：plan.md = 技术计划；spec.md = 需求规范；ADR-NN = plan §8 内嵌；EC-0NN/AC-0NN = spec §7/§8。
> **每步门禁（AC-001）**：任何任务完成后 v2/v3 既有测试零删除零降级、相关包测试全绿 —— 详见 §4.1。

### TASK-001: event-bus.ts 事件总线核心（纯逻辑，预算常量单一数据源）

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | 无 |
| **执行波次** | Wave 1（plan P0） |
| **对应 FR** | FR-008/013/014（+ NFR-007 零开销、ADR-002~004） |
| **TB 映射** | TB-A（plan §9） |
| **风险** | 预算/合并/丢弃语义与真实观察源时序耦合（node 注入面先行可测，ADR-003 保序设计） |

**输入**: plan §2.3（缓冲模型/seq/合并/lastId）+ §5.2 P-03 预算默认值表 + ADR-002/003/004 + spec EVT 组 FR-008/013/014 + EC-002/012

**描述**: 实现事件 push 通道的纯机制核心 EventBus（event-bus.ts）。订阅注册表（唯一 subId）、每订阅独立环形缓冲、预算护栏（默认值常量表 = **单一数据源 DEFAULT_BUDGETS**，供单测断言）、抖动合并窗口、全局开关、lastId 本地游标增量拉取、最旧丢弃 + dropped 计数、单事件负载截断、事件不可变负载、全局单调 seq、审计钩子。**本任务零回归红线 = 新增纯模块不触碰任何既有文件**（additive 最纯形态）。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| NEW | packages/web-cli-base/src/event-bus.ts |
| NEW | packages/web-cli-base/src/event-bus.test.ts |

**验收标准**:
- [ ] `DEFAULT_BUDGETS` 常量集中声明（单一数据源）：缓冲上限 200（可配至 1000）/ 累计 2000（超限自动暂停 + 可恢复提示）/ 并发订阅 8（超限拒注册）/ 速率护栏 200 条/s / 抖动合并窗口 800ms（可配 0=关）/ 摘要 N=10 / 单事件负载 4KB —— 常量表供测试断言，工具层不得硬编码（ADR-004）
- [ ] 订阅生命周期：subscribe 返回唯一 subId；unsubscribe/pause/resume/clear 语义正确（FR-008）；多订阅并发互不干扰（事件按订阅过滤独立投递）
- [ ] 缓冲满 → 最旧丢弃 + `dropped` 计数准确（不静默丢，EC-002）；单事件超 4KB → 截断 + `truncated` 标记
- [ ] `pull {lastId}` 增量正确：无重复无遗漏（本地游标 = 已拉最大 seq，AC-002 断言点）；全量拉取与增量拉取并存
- [ ] 合并窗口：仅抖动类（scroll/resize/mousemove/mouseover）同类型 + 同目标窗口内合并为单条 `count` 事件（含 first/last 时间戳）；非抖动类不合并（保真，ADR-003）
- [ ] 全局单调 seq（hub 入口分配，跨源总序）；事件入缓冲即冻结（不可变负载）
- [ ] 全局通道开关默认关 = 零常驻开销（无订阅零事件零定时器，NFR-007 基准断言）
- [ ] 审计钩子：订阅注册/退订/投递摘要经窄接口外发（无敏感明文，字段含 subId/kind/计数），不直接 import audit 类型新值（与 TASK-002 并行免编译竞态；类型收口由 TASK-002 完成）
- [ ] base build + 新增单测全绿；既有测试零删除零降级（每步门禁 AC-001）

**验证命令**:
```bash
npm run build --workspace @lgdl/web-cli-base && npm run test --workspace @lgdl/web-cli-base
```

### TASK-002: sensitive 脱敏函数族扩展 + audit 审计事件面扩展

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | 无 |
| **执行波次** | Wave 1（plan P0） |
| **对应 FR** | FR-006/007（+ NFR-002/008、ADR-006） |
| **TB 映射** | TB-C |
| **风险** | 既有表单字段敏感模型回归（只追加纯函数族，零改动既有函数语义） |

**输入**: plan §3.9 横切 PRM + ADR-006 + spec PRM 组 FR-006/007 + EC-003

**描述**: 纯逻辑扩展（node 可测）。（1）sensitive.ts 追加 FR-006 通用文本/URL/header 面脱敏函数族：`redactUrlQuery(url)`（token/key/sign 等查询参数掩码）、`isSensitiveHeader(name)`（authorization/cookie/x-api-key/proxy-authorization 等）+ `maskHeaderValue()`、`maskTextPayload(text, policy?)`（`key=value`/Bearer/`token:` 形态启发式，掩码/长度占位/类型替代三态沿 v3 maskValue）、键入负载策略（key 名 + 修饰键布尔，不含明文值）、console/对话框/富剪贴板文本可配策略常量。既有表单字段模型零改动（v3 FR-024 零回归）。（2）audit.ts AuditEventType 扩展：subscribe/unsubscribe/event-delivery-summary/dialog/cookie/net-intercept（含子命令/来源/裁决/计数字段，无敏感明文）。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| MODIFY | packages/web-cli-base/src/sensitive.ts |
| MODIFY | packages/web-cli-base/src/sensitive.test.ts |
| MODIFY | packages/web-cli-base/src/audit.ts |
| MODIFY | packages/web-cli-base/src/audit.test.ts |

**验收标准**:
- [ ] `redactUrlQuery`：URL 查询串含 token/key/sign 参数 → 掩码位存在且非敏感参数不受影响（FR-006/EC-003 断言）
- [ ] `isSensitiveHeader` + `maskHeaderValue`：authorization/cookie/x-api-key/proxy-authorization 命中；返回掩码/长度占位（不落明文）
- [ ] `maskTextPayload`：`key=value`/`Bearer <token>`/`token:` 启发式掩码命中（保守取向，与 v3 maskValue 三态同构）
- [ ] 键入负载策略：keydown/input 负载不含明文值回显（key 名 + 修饰键布尔）
- [ ] console/对话框/富剪贴板文本可配脱敏策略常量存在（缺省保守）
- [ ] audit.ts：AuditEventType 扩展字段编译 + 单测断言（订阅生命周期/投递摘要/dialog/cookie/net-intercept 各事件面字段、无明文）
- [ ] v3 sensitive/audit 既有用例零回归（纯函数追加，additive）；base build + test 全绿（每步门禁 AC-001）

**验证命令**:
```bash
npm run build --workspace @lgdl/web-cli-base && npm run test --workspace @lgdl/web-cli-base
```

### TASK-003: platform.ts 新缝类型面 + PlatformDomOps 可选方法 + 未注入转译

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-001（类型引用 Hub 语义） |
| **执行波次** | Wave 2（plan P0） |
| **对应 FR** | FR-002/005（类型面）+ EC-011（+ FR-001 缺省兼容、NFR-006） |
| **TB 映射** | TB-B |
| **风险** | 类型面破坏既有缝（全部可选 + 缺省 undefined，编译零破坏断言兜底） |

**输入**: plan §2.3（PlatformEventHub 接口）+ §2.4 additive 集成第 1/2 点 + ADR-002/009 + spec FR-002/EC-011

**描述**: platform.ts 声明 v4 新缝类型面（纯类型 + 可选字段声明，**本任务不装配真实现**——装配归 TASK-004/008）。PlatformEnv 新增可选 `events?: PlatformEventHub` 与 `clipboardRich?: PlatformRichClipboard`（缺省 undefined → 通道不可用转译 EC-011）；PlatformDomOps 新增可选方法 `cookieRead?/cookieWrite?/cookieDelete?/touchDispatch?`（#26~#29，缺省 undefined → opMissing 可读错误沿 v2 dom「ops 未注入」语义）；新类型面按 plan §2.3 清单（PlatformSubscribeOptions/PlatformEventFilter/PlatformObserveKind/PlatformSubResult/PlatformSubSummary/PlatformPullResult/PlatformChannelStatus/PlatformEventSources 等）。`[k:string]:unknown` 自由扩展位保持。nodeEnv 不预置（显式注释）。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| MODIFY | packages/web-cli-base/src/platform.ts |
| MODIFY | packages/web-cli-base/src/platform.test.ts |

**验收标准**:
- [ ] PlatformEnv 增 `events?`/`clipboardRich?` 可选缝；PlatformDomOps 增 4 个可选方法（cookieRead/cookieWrite/cookieDelete/touchDispatch），全部缺省 undefined
- [ ] 全部新缝/方法缺省时既有平台代码编译零错误（FR-002/FR-001 缺省兼容断言）
- [ ] nodeEnv 不预置 events/clipboardRich（注释明示）；未注入调用返回可读错误不中断（EC-011）
- [ ] PlatformEventHub 接口方法签名与 plan §2.3 一致（subscribe/unsubscribe/list/pause/resume/clear/pull/pullSensitive/status/setBudget/switch + sources）
- [ ] 类型面含 JSDoc 注释对齐 plan（观察 kind 枚举：dom/lifecycle/console/network/paste/dialog）
- [ ] platform.test.ts 增补：缺省未注入转译 + 新缝缺省编译断言；既有 platform 用例零回归
- [ ] base build + test 全绿（每步门禁 AC-001）

**验证命令**:
```bash
npm run build --workspace @lgdl/web-cli-base && npm run test --workspace @lgdl/web-cli-base
```

### TASK-004: platform-events.ts 观察源工厂 + browserEnv 装配 env.events（dom/lifecycle/console/network 源）

| 属性 | 值 |
|------|-----|
| **复杂度** | L |
| **前置依赖** | TASK-001/002/003 |
| **执行波次** | Wave 3（plan P0；内含 P1 观察面 FR-011/012 落位） |
| **对应 FR** | FR-003/009/010/011/012/015（+ NFR-004/007、ADR-002/003/005/008） |
| **TB 映射** | TB-D + TB-F（合并：platform-events.ts 单文件所有权，观察源一次成文——D-001） |
| **风险** | instrumentation patch 破坏宿主页（惰性安装 + 透传原引用 + 原输出仍达 DevTools 断言兜底） |

**输入**: plan §2.3 通道机制 + §2.5 生命周期 hook 挂载点表 + §3.1 EVT + ADR-002/003/005/008 + spec FR-003/009~012/015 + EC-001/011

**描述**: 新建 platform-events.ts —— `createBrowserEventHub(scope)`：hub 装配（构造零副作用，对接 TASK-001 EventBus）+ 观察源集合（惰性安装，首个订阅挂载 / 末退订卸载 = 默认关零常驻 NFR-007）：①`domObserve`（document capture 期委托监听，FR-009；事件负载 = type/target 摘要（selector 或标签+文本前缀）/时间戳/计数；键入敏感面 keydown 不含明文值、input/change 敏感字段值掩码（消费 TASK-002 脱敏族））；②`lifecycle`（hashchange/popstate/visibilitychange/pagehide/beforeunload，FR-010；只产生事件、不干预 v3 reload ask 语义；整页导航订阅失效明示——list 空态 + 失效提示文案 EC-001）；③`consolePatch`（惰性 patch console.*，透传原引用、原输出仍达 DevTools、早于订阅输出不回看，FR-011）；④`networkPatch` 观察（fetch wrapper + XHR open/send wrap：method/URL 查询串脱敏/status/耗时/响应头子集（content-type 等，缺省不含敏感头）/响应体默认不读/source 标记；**AI 自请求默认不可见** = env.fetch 早期绑定原生引用，ADR-008 公开差异）。合成事件来源标记读取（`source:'synthetic'` vs `'page'`，FR-015）。**装配**：platform.ts browserEnv() 单点追加 `events: createBrowserEventHub(...)`（惰性）；platform-dom.ts 合成派发辅助前置 synthetic 模块级标志埋点（additive，v3 click/type 等 dispatch 路径零行为变化）。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| NEW | packages/web-cli-base/src/platform-events.ts |
| NEW | packages/web-cli-base/src/platform-events.test.ts |
| MODIFY | packages/web-cli-base/src/platform.ts（browserEnv 装配 env.events 单点） |
| MODIFY | packages/web-cli-base/src/platform-dom.ts（合成派发 synthetic 标志埋点，additive） |

**验收标准**:
- [ ] createBrowserEventHub 构造零副作用（无监听器/patch 安装）；首个订阅/规则才惰性安装（NFR-007 断言）
- [ ] domObserve：捕获期委托挂载/卸载随订阅生命周期；事件负载含 type/target 摘要/ts/seq；键入敏感面无明文值
- [ ] lifecycle：hashchange/popstate/visibilitychange/pagehide 订阅事件命中（真实浏览器 ≥1）；整页导航后 list() 空态 + 「订阅已失效需重新 read-state + 重新订阅」提示可查（EC-001）
- [ ] consolePatch：console.error/warn 被捕获（level + 脱敏文本摘要）；原输出仍到 DevTools（patch 透传断言）；末退订还原
- [ ] networkPatch：页面 fetch/XHR 事件命中（method/URL/status/耗时断言）；URL 查询串含 token 掩码（消费 TASK-002）；AI 自请求（env.fetch 早期绑定）默认不入观察流（ADR-008 断言）
- [ ] synthetic 标志：平台合成派发（v3 click 路径）事件带 `source:'synthetic'`，真实/页面事件缺省 `source:'page'`（FR-015 区分断言）
- [ ] 零扩展 API 依赖：实现面 grep chrome.runtime/tabs/downloads = 0 命中（FR-003）
- [ ] node 注入面单测全绿 + 真实浏览器最小冒烟记录（dom/lifecycle/console/network 各 ≥1 命中；validate 承接扩展）；base build + test 全绿（每步门禁 AC-001）

**验证命令**:
```bash
npm run build --workspace @lgdl/web-cli-base && npm run test --workspace @lgdl/web-cli-base
# 真实浏览器最小冒烟（chromium，方法沿 V13/v3）：订阅真实事件命中记录于任务交付说明，validate 承接扩展清单
```

### TASK-005: events-tools.ts 事件订阅/拉取工具

| 属性 | 值 |
|------|-----|
| **复杂度** | L |
| **前置依赖** | TASK-003（fake hub 注入面可先行）；真 hub 联调依赖 TASK-004 |
| **执行波次** | Wave 3（plan P0；与 TASK-004 并行，fake hub 先行） |
| **对应 FR** | FR-008~015（工具面）+ FR-005（risk 声明）+ FR-007（审计记录点）+ EC-011/012 |
| **TB 映射** | TB-E |
| **风险** | 工具 schema 膨胀（单工具承载订阅全语义，help/schema 收敛断言兜底） |

**输入**: plan §2.3 订阅 API + §3.1 EVT 实现要点（subcommandRisks 表/过滤语法/事件负载面）+ ADR-005 + spec FR-008~015

**描述**: 新建 events-tools.ts —— 顶层 `events` 工具（group=observe）11 子命令：subscribe（`--kind dom|lifecycle|console|network|paste|dialog` + `--filter` 类型 csv∩selector css:/text=∩URL 模式∩level + `--budget` + `--sensitive`）/unsubscribe/list/pause/resume/clear/pull（`--lastId`/`--max` 增量）/pull-sensitive（明细，risk 'write' + 显式 `--trusted true`）/status/budget/switch。executor + schema + help + subcommandRisks（subscribe/list/status/pull → 'read'；unsubscribe/pause/resume/clear/budget/switch → 'state' 缺省 ask；pull-sensitive → 'write'；subscribe `--sensitive true` 全程入审计、明细进 pull-sensitive 通道）。帮助面：显式标注「dom observe（FR-009）= events subscribe --kind dom」别名 + 局限声明（同 realm 观察、不升级 isTrusted、跨 realm/worker/非 JS 子资源不可达 NG-010/012、被 stopImmediatePropagation 吞事件不可承诺 FR-015）。审计记录点（订阅生命周期/投递摘要，FR-007）。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| NEW | packages/web-cli-base/src/events-tools.ts |
| NEW | packages/web-cli-base/src/events-tools.test.ts |

**验收标准**:
- [ ] 11 子命令 executor/schema/help 全就绪；无注入面（env.events undefined）→「事件通道不可用」可读转译不中断（EC-011）
- [ ] subcommandRisks 声明可查（read/state/write 三档对齐 plan §3.1）；pull-sensitive 缺省走 ask + 需 trusted（FR-005/006）
- [ ] node 注入面（fake hub/假 env.events）：注册/退订/暂停/恢复/清空/增量拉取（lastId 无重复无遗漏）/status/budget/switch 全绿
- [ ] 订阅过滤：事件类型 ∩ selector（css:/text=）∩ URL 模式 ∩ level 过滤命中/未命中单测（glob 沿既有语义）
- [ ] 事件负载统一面 `{seq,ts,kind,type,target,text(masked),meta}` 输出断言（context 只见摘要 + 计数，明细经 pull，NFR-003）
- [ ] `--sensitive true` 订阅全程入审计 + 明细走 pull-sensitive（trusted+ask，决策入审计）
- [ ] help 含 dom observe 别名标注 + 局限声明文案（FR-015/NFR-004）；事件大负载不整段进 output（预算断言）
- [ ] 审计记录点字段断言（subId/kind/计数，无明文）；base build + test 全绿（每步门禁 AC-001）

**验证命令**:
```bash
npm run build --workspace @lgdl/web-cli-base && npm run test --workspace @lgdl/web-cli-base
```

### TASK-006: 对话框 override + 应答策略（dialog-policy + dialog-tools）

| 属性 | 值 |
|------|-----|
| **复杂度** | L |
| **前置依赖** | TASK-002/003/004 |
| **执行波次** | Wave 4（plan P1） |
| **对应 FR** | FR-016/017 + FR-005/006/007 + EC-005/006/010（+ NFR-004、ADR-007） |
| **TB 映射** | TB-G |
| **风险** | override 与页面既有 polyfill/React 共存破坏宿主页（可逆卸载 + 冲突可读说明 + 回归断言兜底） |

**输入**: plan §3.2 DIA + ADR-007 + spec FR-016/017 + EC-005/006/010

**描述**: 新建 dialog-policy.ts（纯策略匹配，node 可测）+ dialog-tools.ts + platform-events.ts 追加 dialogOverride 源。（1）override 源：`override-install` 经 write risk 缺省 ask（FR-005，deny 后不安装）→ 保存原引用 + 替换同 realm window.alert/confirm/prompt（同源 iframe 各自 window 逐一 hook；跨域 iframe 不可 hook → 归属）；捕获事件（type + 文本脱敏摘要 + ts）入通道（kind=dialog）+ 按策略应答；卸载还原（回归断言）；重复安装冲突/与页面 polyfill 共存 → 可读冲突说明（NFR-004）。（2）策略：规则集 {类型 alert/confirm/prompt × 文本/URL glob → accept/dismiss/promptText}；缺省保守 = alert 记录即返回、confirm/prompt 无匹配 → dismiss（否定值）+ 事件 + 审计（EC-005）；误确认护栏 DESTRUCTIVE_PATTERNS（删除/覆盖/清除/提交类中英词元）命中且无显式 trusted accept 规则 → 永不自动 accept（EC-006）；prompt 自动输入仅 trusted 规则显式提供；policy-add = untrusted 拒（缺省）+ 显式 trusted 放行 + 审计（FR-005）。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| NEW | packages/web-cli-base/src/dialog-policy.ts |
| NEW | packages/web-cli-base/src/dialog-policy.test.ts |
| NEW | packages/web-cli-base/src/dialog-tools.ts |
| NEW | packages/web-cli-base/src/dialog-tools.test.ts |
| MODIFY | packages/web-cli-base/src/platform-events.ts（追加 dialogOverride 源：install/uninstall + 捕获事件 + 同源 iframe hook） |

**验收标准**:
- [ ] dialog-policy 纯逻辑 node 单测：缺省保守三路（alert 记录即返回 / confirm·prompt 无匹配 dismiss 否定值）/ 显式 trusted accept 规则命中放行 / 破坏性文案无匹配规则不得 accept（EC-006 断言）/ prompt 自动输入仅 trusted 生效（FR-017）
- [ ] dialog 工具 6 子命令（override-install/uninstall/policy-add/list/remove/status）executor/schema/help/subcommandRisks 全就绪
- [ ] override-install = write risk 缺省 ask；deny 后不安装（FR-005 断言）；安装触发审计
- [ ] 真实浏览器冒烟：页面 alert/confirm/prompt 调用被捕获（事件命中 + 文本脱敏摘要）；卸载后恢复原生行为（回归）；重复安装冲突提示可读
- [ ] policy-add untrusted 拒 + 需 `--trusted true` 可读错误；命中与应答入事件通道 + 审计（无敏感明文）
- [ ] 原生对话框（HTTP auth/权限 prompt）入参 → 不支持 + 归属说明转译位（EC-010；统一文案接线归 TASK-010）
- [ ] base build + test 全绿；v2/v3 既有用例零回归（每步门禁 AC-001）

**验证命令**:
```bash
npm run build --workspace @lgdl/web-cli-base && npm run test --workspace @lgdl/web-cli-base
```

### TASK-007: cookie 读/写/删（同源非 HttpOnly）+ cookie-tools

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-002/003 |
| **执行波次** | Wave 4（plan P1） |
| **对应 FR** | FR-019/020 + FR-005/006/007 + EC-003/007/009（+ ADR-009） |
| **TB 映射** | TB-H |
| **风险** | cookie 明文泄漏（值缺省掩码 + 明细 trusted+ask + 审计名掩码三重兜底） |

**输入**: plan §3.4 CK + ADR-009 + spec FR-019/020 + EC-003/007/009

**描述**: platform-dom.ts 追加 PlatformDomOps.cookieRead/cookieWrite/cookieDelete 真实现（document.cookie 可达面：解析为 名/域/路径/有效期可达子集；值缺省掩码 maskValue；写/删后回读断言；Secure/HttpOnly 等页面写面限制分类转译 EC-007——仅 HTTPS 可写 Secure、HttpOnly 不可写）。新建 cookie-tools.ts —— `cookie` 工具 4 子命令：read（'read'）/read-detail（明细值，risk 'write' 档 + `--trusted true` + ask，决策入审计）/write/delete（risk 'write' 缺省 ask + untrusted 值拒写 + 写后回读断言）。审计 = 名掩码 + 域 + 动作（FR-007，无明文）。HttpOnly 读/跨域/域级批量 → 不支持 + 归属 chrome.cookies（本任务返回结构化不支持结果并留归属占位；统一文案接线归 TASK-010）。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| MODIFY | packages/web-cli-base/src/platform-dom.ts（追加 cookieRead/cookieWrite/cookieDelete 真实现，DOM 触碰收敛纪律保持） |
| NEW | packages/web-cli-base/src/cookie-tools.ts |
| NEW | packages/web-cli-base/src/cookie-tools.test.ts |

**验收标准**:
- [ ] cookieRead：document.cookie 可达面解析输出名/值掩码/域/路径/有效期可达子集；读缺省掩码（值不明文，FR-006/EC-003）
- [ ] read-detail：risk 'write' 档 + 显式 trusted + ask 才返回明细；决策入审计
- [ ] cookieWrite/cookieDelete：写/删后回读断言（写成功回读值一致 / 删后回读空）；write risk 缺省 ask、deny 后值不变；untrusted 值拒写可读错误（FR-005）
- [ ] 受限标志位分类转译（Secure 仅 HTTPS / HttpOnly 不可写 → 可读转译，EC-007）
- [ ] HttpOnly 读/跨域/域级批量入参 → 不支持 + 归属 chrome.cookies（EC-009；归属占位与 TASK-010 接线一致性断言）
- [ ] 审计无明文（名掩码 + 域 + 动作）；真实同源 cookie 读清单断言（名级）
- [ ] base build + test 全绿；v2/v3 既有用例零回归（每步门禁 AC-001）

**验证命令**:
```bash
npm run build --workspace @lgdl/web-cli-base && npm run test --workspace @lgdl/web-cli-base
```

### TASK-008: 剪贴板富内容写 + paste 事件读（clipboardRich 缝 + clipboard 富子命令）

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-003/004 |
| **执行波次** | Wave 5（plan P1） |
| **对应 FR** | FR-021/022 + FR-005/006 + EC-008（+ ADR-009） |
| **TB 映射** | TB-I |
| **风险** | ClipboardItem 浏览器支持差异（授权失败走 v3 FR-009 转译沿，两路转译兜底） |

**输入**: plan §3.5 CLP + ADR-009 + spec FR-021/022 + EC-008

**描述**: （1）platform.ts browserEnv() 装配 `clipboardRich` 富写缝（navigator.clipboard.write + ClipboardItem：text/html、image/png、text/plain 并存；浏览器不支持 ClipboardItem/缺权限/缺手势 → v3 FR-009 友好转译沿 EC-008）。（2）clipboard.ts 追加子命令（enum 尾部 + 分支追加，文本 read/write 零回归）：`write-html --html <片段>`、`write-image --dataurl <png>`、`paste-read`（读最近一次用户主动粘贴捕获槽：text/html + 图片/文件项元数据；可经 save/export 链落盘 v3 FR-029）。（3）platform-events.ts 追加 pasteCapture 源（document paste 监听，用户主动粘贴才触发；无手势系统剪贴板读/历史 → 不支持说明 NG-012）。剪贴板读写 = ask（v3 FR-030 沿）+ FR-006 脱敏。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| MODIFY | packages/web-cli-base/src/platform.ts（browserEnv 装配 clipboardRich 富写缝） |
| MODIFY | packages/web-cli-base/src/clipboard.ts（追加 write-html/write-image/paste-read 子命令） |
| MODIFY | packages/web-cli-base/src/platform-events.ts（追加 pasteCapture 源） |
| MODIFY | packages/web-cli-base/src/clipboard.test.ts（增补富子命令用例；文本 read/write 既有用例零删除） |

**验收标准**:
- [ ] clipboardRich 富写缝：ClipboardItem 三类型（text/html/image/png/text/plain）并存；与既有 PlatformClipboard 文本缝互不覆盖（FR-021）
- [ ] write-html/write-image：真实浏览器富写 roundtrip（text/html 保真 / image/png 尺寸字节断言）；授权失败两路转译可读（EC-008）
- [ ] paste-read：真实浏览器用户粘贴富文本/图片 → 捕获槽内容可读（HTML 结构/图片尺寸断言）；无手势读 → 不支持说明（NG-012/FR-022）
- [ ] 读 = ask + 脱敏（FR-006）；既有文本 read/write 用例零回归（FR-021 兼容断言）
- [ ] pasteCapture 源惰性（首个 paste 订阅才挂 document 监听）；末退订卸载
- [ ] base build + test 全绿；v2/v3 clipboard 既有用例零回归（每步门禁 AC-001）

**验证命令**:
```bash
npm run build --workspace @lgdl/web-cli-base && npm run test --workspace @lgdl/web-cli-base
```

### TASK-009: shadow/iframe 穿透定位（共享 resolver 增强 + locator 帮助面）

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | 无（platform-dom.ts 内增强，独立） |
| **执行波次** | Wave 5（plan P1） |
| **对应 FR** | FR-023 + EC-009（+ ADR-011） |
| **TB 映射** | TB-J |
| **风险** | 既有 CSS/text= 定位语义漂移（主文档 CSS 命中照旧零回归断言兜底） |

**输入**: plan §3.6 SHD + ADR-011 + spec FR-023 + EC-009

**描述**: **不做新定位语法、不加新子命令**（解析层不变）。platform-dom.ts **共享元素解析 resolver** 增强：主文档 CSS 命中 → 照旧（零回归）；未命中 → 递归走查 open shadowRoot（querySelector 逐层）→ 同源 iframe contentDocument（SOP 内，SecurityError 捕获）；深度护栏默认 ≤4 层可配（防深递归拖垮 NFR-007）；closed shadow/shadowRoot=null/跨域 iframe → 不静默：返回不支持 + 归属（content script(all_frames)/CDP，FR-025，统一文案接线归 TASK-010）；穿透命中返回带 `via:'shadow'/'iframe'` 标注。locator.ts 帮助/语法文档面补穿透说明（解析层不变）。read-element/click/fill/extract 等既有元素级工具经统一 selector 语义自动生效（单点增强）。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| MODIFY | packages/web-cli-base/src/platform-dom.ts（共享 resolver 穿透增强 + 深度护栏 + via 标注） |
| MODIFY | packages/web-cli-base/src/locator.ts（帮助/语法文档面补穿透说明） |
| MODIFY | packages/web-cli-base/src/platform-dom.test.ts（穿透用例增补） |
| MODIFY | packages/web-cli-base/src/locator.test.ts（文档面/既有语义回归） |

**验收标准**:
- [ ] 真实 open shadow 组件内部元素经穿透 selector 命中（read-element/click ≥1）；返回带 `via:'shadow'` 标注
- [ ] 同源 iframe contentDocument 内元素命中（`via:'iframe'`）
- [ ] 深度护栏：超过默认 ≤4 层 → 可读提示（不深递归拖垮）
- [ ] closed shadow/跨域 iframe → 不支持 + 归属（不静默、不跨 SOP，EC-009；归属占位与 TASK-010 接线一致性断言）
- [ ] 既有 CSS/text= 定位用例零回归（主文档 CSS 命中路径逐字节不变，AC-001 每步门禁）
- [ ] locator 帮助面含穿透说明（解析层零改动断言）
- [ ] base build + test 全绿（每步门禁 AC-001）

**验证命令**:
```bash
npm run build --workspace @lgdl/web-cli-base && npm run test --workspace @lgdl/web-cli-base
```

### TASK-010: EXT「不支持 + 归属」统一转译面 + 契约预留（ext-attribution）

> 类型：**📄 文档/契约预留任务**（EXT 组 = 零扩展工程；源码面仅常量 + helper + 接线注释，零注册工具、零进 schema、零新依赖）

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-005/006/007/008（各工具 executor/help 就绪后接线） |
| **执行波次** | Wave 6（plan P1） |
| **对应 FR** | FR-025/026/027 + AC-008（+ NFR-001/002、ADR-001/012） |
| **TB 映射** | TB-K |
| **风险** | 扩展线纪律漂移（ATTRIBUTION_MAP 不接线不进 schema + grep 零扩展痕迹 + 依赖图谱零新增三重断言） |

**输入**: plan §3.8 EXT + ADR-001/012 + spec FR-025/026/027 + AC-008

**描述**: 新建 ext-attribution.ts（纯常量 + helper，node 可测）：`ATTRIBUTION_MAP` = 全部需扩展/系统级能力面（多标签/窗口、下载管理、整页截图、HttpOnly/跨域 cookie 与域级管理、DevTools 全局面网络、跨导航持久订阅、closed shadow、跨域 iframe、浏览器原生对话框、真受信触控/输入、权限真模拟、file 真路径注入、C-05 DataTransfer 注入面）→ 归属（F-14 v1.1 扩展宿主/CDP 生态位）+ 扩展 API/CDP 域 + **契约预留建议**（FR-026：目标工具/子命令建议名 + 入参语义 + 返回形态 + 门禁/敏感面挂点 + 与页内对应能力的切面关系）——以**类型占位注释 + 常量映射**形态落地。`unsupportedAttribution(capability)` helper 产出统一文案（与 v3 chrome-tools 整页截图先例同构）。**接线**：events/dialog/cookie/clipboard/dom 工具 help 归属表引用 + out 入参统一转译接线（TASK-006/007 留的归属占位收敛为本 helper 输出 + 一致性断言）。纪律：不注册工具、不进 schema（schema 体积零变化断言）；零扩展工程痕迹 grep；零扩展 devDep（NFR-001/002）。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| NEW | packages/web-cli-base/src/ext-attribution.ts |
| NEW | packages/web-cli-base/src/ext-attribution.test.ts |
| MODIFY | packages/web-cli-base/src/events-tools.ts（help 归属表接线） |
| MODIFY | packages/web-cli-base/src/dialog-tools.ts（归属占位收敛接线） |
| MODIFY | packages/web-cli-base/src/cookie-tools.ts（归属占位收敛接线） |
| MODIFY | packages/web-cli-base/src/clipboard.ts（归属接线） |
| MODIFY | packages/web-cli-base/src/dom-tools.ts（help 归属表接线） |

**验收标准**:
- [ ] ATTRIBUTION_MAP 覆盖 spec §2.5 🔴 列全部能力（每项含归属 + 扩展 API/CDP 域 + 契约预留建议字段）（FR-025/026）
- [ ] `unsupportedAttribution(capability)` 统一文案与 v3 chrome-tools 整页截图先例同构；逐项 out 面转译断言 ≥1（AC-008）
- [ ] 各工具 help 含归属表（与 §2.5/NG 表一致）；TASK-006/007 归属占位已收敛为 helper 输出（一致性断言）
- [ ] 契约预留类型占位**不参与 deriveTools**：schema 体积零变化断言（FR-026/AC-008）
- [ ] grep 零扩展工程痕迹：chrome.runtime/tabs/downloads/webRequest/manifest/@types/chrome 零命中（含 package.json devDep 零新增）（FR-027/NFR-001/002）
- [ ] ROADMAP/帮助面无 v4 扩展工程承诺文案（grep 断言位预留）
- [ ] base build + test 全绿；既有用例零回归（每步门禁 AC-001）

**验证命令**:
```bash
npm run build --workspace @lgdl/web-cli-base && npm run test --workspace @lgdl/web-cli-base
# 红线：git diff packages/web-cli-base/package.json 零变更；grep -rn "chrome\.runtime\|chrome\.tabs\|chrome\.downloads\|webRequest\|manifest" packages/web-cli-base/src 零命中
```

### TASK-011: lgdl-web 场景接入（session 矩阵 + 策略规则 + 事件/订阅 UI + base index 导出收口）

| 属性 | 值 |
|------|-----|
| **复杂度** | L |
| **前置依赖** | TASK-004~010（工具工厂/attribution 就绪） |
| **执行波次** | Wave 7（plan P1，含 P2 FR-029 一并收口——v3 TASK-009 先例） |
| **对应 FR** | FR-028/029/030 + AC-009（+ NFR-006、EC-004、IMP-4 语义沿） |
| **TB 映射** | TB-L |
| **风险** | session.ts 既有注册序漂移（只追加块、置于既有矩阵/策略规则之后，顺序断言兜底） |

**输入**: plan §3.9 LGDL + §2.4 集成第 5 点 + spec FR-028/029/030 + AC-009

**描述**: lgdl-web 场景收口（base 零 UI 纪律 NG-008 保持，本任务改动全在 lgdl-web 与 base index）。（1）session.ts **追加注册块**（既有矩阵/策略序不漂移）：v4 新工具默认启用集 = events/观察默认开（观察只读子面免 ask）；dialog override 默认关；cookie 默认关；clipboard 富子命令默认开；LGDL_DEFAULT_POLICY_RULES 增：cookie write/delete 缺省 deny（或 ask，不可静默 allow）、dialog 自动 accept 缺省 deny、override-install ask、观察只读 allow 前置规则（置于既有 risk ask 规则前）；untrusted 拒执行可读说明（EC-004）。net/touch 默认关行由 TASK-012/013 各自追加（additive 块，本任务预留位置注释）。（2）AiPanel.tsx 事件摘要区/订阅状态呈现（hub.status/pull 数据源：活跃订阅清单 + 预算水位 + 自动退订提示 + 拉取入口，FR-029；明细脱敏 FR-006）；AskDialog.tsx 新写面 ask 文案（cookie 写/删、对话框策略、override 安装 + 规则摘要）。（3）base index.ts v4 导出收口（events/cookie/dialog/net/clipboard 富工具工厂、event-bus/dialog-policy 工厂、PlatformEventHub/PlatformRichClipboard 等类型、redact 函数族、attribution 常量 —— 既有导出零删除，NFR-006）。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| MODIFY | packages/lgdl-web/src/ai/session.ts（v4 追加注册块 + LGDL_DEFAULT_POLICY_RULES 扩展；net/touch 行预留注释） |
| MODIFY | packages/lgdl-web/src/ai/AiPanel.tsx（事件摘要区/订阅状态呈现） |
| MODIFY | packages/lgdl-web/src/ai/AskDialog.tsx（新写面 ask 文案） |
| MODIFY | packages/lgdl-web/src/ai/session.test.ts（矩阵单测增补） |
| MODIFY | packages/web-cli-base/src/index.ts（v4 导出收口） |

**验收标准**:
- [ ] session.ts v4 注册块在既有块后追加（顺序断言：v2/v3 既有工具注册序零漂移，FR-001/AC-001）；net/touch 追加位注释预留
- [ ] 矩阵单测：启用集 → 派生 schema 与矩阵一致；默认关工具（dialog/cookie）schema 不含 + help 标注 + 派发禁用可读（FR-028）
- [ ] LGDL_DEFAULT_POLICY_RULES：cookie write/delete deny、dialog 自动 accept deny、override-install ask、观察只读 allow 规则生效（FR-030）；真实会话 untrusted 拒执行可读说明（EC-004）
- [ ] AI 闭环触发各 ask → 弹层呈现 + allow/deny/超时三路裁决可用（FR-029/AC-009）
- [ ] 事件摘要区呈现且不撑爆上下文（预算断言：只见摘要 + 计数）；base 侧零 UI 代码（grep 断言 base 无新增 UI）
- [ ] base index.ts：v4 新类型/工厂/函数导出面齐全 + 既有导出零删除（NFR-006）；lgdl-web 构建引用通过
- [ ] lgdl-web build + test 全绿；v2/v3 session/AiPanel/AskDialog 既有用例零回归（每步门禁 AC-001）

**验证命令**:
```bash
npm run build --workspace @lgdl/lgdl-web && npm run test --workspace @lgdl/lgdl-web
npm run build --workspace @lgdl/web-cli-base && npm run test --workspace @lgdl/web-cli-base
```

### TASK-012: 网络拦截（net-tools + networkPatch 拦截引擎）— P2 门禁 + G-02 验证门

> 类型：**⚖️ 验证门任务**（G-02 真实改写验证先行；失败 → 走降级 out 记录分支，不实现拦截面）

| 属性 | 值 |
|------|-----|
| **复杂度** | L |
| **前置依赖** | TASK-004（共享 instrumentation 基座）/ 011（矩阵基座） |
| **执行波次** | Wave 8（plan P2，裁决 2） |
| **对应 FR** | FR-018 + FR-005/007 + EC-004/009（+ ADR-008、S-10） |
| **TB 映射** | TB-M |
| **风险** | 拦截误改宿主请求（P2 缺省 deny + trusted + 命中审计三重兜底）；G-02 验证不合格 → 降级出口 |

**输入**: plan §3.3 NET + ADR-008（裁决 2/P-05）+ spec FR-018 + EC-004/009

**描述**: 对宿主自身 fetch/XHR 提供**发出前修改拦截**（增改 header/查询参数/请求体字段）。（1）纯规则引擎（net-tools.ts 内，node 可测）：URL 模式匹配 + 修改动作规则集管理（rule-add/list/remove + intercept-on/off + status）。（2）platform-events.ts networkPatch 扩展拦截应用（与观察共享安装点，包装透传原引用；规则发出前生效；响应伪造/缓存篡改/先网络栈/跨 realm 入参 → 不支持 + 归属 webRequest/DNR/CDP）。（3）门禁：整工具 P2 缺省 deny（entry risk='write'）+ 规则注册显式 `--trusted true`（untrusted 拒 EC-004）+ 拦截命中全量审计（规则 id + URL 脱敏摘要 + 动作，FR-007）；AI 自请求不可见缺省保持（ADR-008）。（4）session.ts 追加 net 注册行（默认关）+ LGDL net deny 策略行。
**验证门 G-02（内嵌，实现后置验证前置）**：真实 chromium 最小改写验证——页面 fetch 被规则改写 header/参数断言。**失败 → 降级出口：FR-018 拦截面降级 out 记录**（写入 state notes/validate 移交：降级为 FR-026 契约预留 + CDP/webRequest 归属说明），net 工具不注册拦截面（不静默降级、不假装生效）。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| NEW | packages/web-cli-base/src/net-tools.ts |
| NEW | packages/web-cli-base/src/net-tools.test.ts |
| MODIFY | packages/web-cli-base/src/platform-events.ts（networkPatch 拦截引擎扩展） |
| MODIFY | packages/lgdl-web/src/ai/session.ts（net 追加注册行 + deny 策略行） |
| MODIFY | packages/lgdl-web/src/ai/session.test.ts（net 默认关矩阵断言） |

**验收标准**:
- [ ] 规则引擎 node 单测：URL 模式命中/未命中；增改 header/查询参数/请求体动作序列断言
- [ ] **G-02 验证门**：真实浏览器 fetch 被规则改写（header/参数断言）→ 通过记录；**失败 → out 记录完成**（含 FR-018 降级 FR-026 契约预留 + 归属说明，零拦截实现残留）
- [ ] 门禁：未声明 `--trusted true` 的规则 → deny + 可读错误（EC-004）；net 工具整工具 P2 缺省 deny；矩阵默认关（schema 不含 + 派发禁用可读）
- [ ] 拦截命中全量审计（规则 id + URL 脱敏摘要 + 动作，无明文）；无规则零开销零改写（回归断言）
- [ ] 响应伪造/缓存篡改/先网络栈/跨 realm 入参 → 不支持 + 归属（webRequest/DNR/CDP，统一文案接线）
- [ ] 观察与拦截共享 instrumentation 不互相干扰（观察既有用例零回归）；base + lgdl-web build/test 全绿（每步门禁 AC-001）

**验证命令**:
```bash
npm run build --workspace @lgdl/web-cli-base && npm run test --workspace @lgdl/web-cli-base
npm run build --workspace @lgdl/lgdl-web && npm run test --workspace @lgdl/lgdl-web
# G-02：真实 chromium 最小改写验证（validate 冒烟清单承接记录）
```

### TASK-013: 合成 touch 派发（dom tap/swipe/pinch）— G-01 验证门

> 类型：**⚖️ 验证门任务**（G-01 最小 chromium 验证先行；失败 → FR-024 降级 out，零实现）

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-011（dom-tools 尾部追加 + session touch 默认关行） |
| **执行波次** | Wave 8（plan P2，裁决 3） |
| **对应 FR** | FR-024 + EC-007 语义沿（+ ADR-010、NG-007） |
| **TB 映射** | TB-N |
| **风险** | 桌面 chromium 合成 TouchEvent 不可用（验证门失败 → out 出口先例 v3 S-02，零返工） |

**输入**: plan §3.7 TCH + ADR-010（裁决 3）+ spec FR-024 + Q-013/A-004

**描述**: **验证门先行（G-01，实现前）**：真实 chromium 最小验证——合成 TouchEvent/Touch 可构造派发且对 touch 监听页面生效（tap/swipe/pinch 各 ≥1）。**通过 → 实现分支**：platform-dom.ts 追加 `touchDispatch` 真实现（TouchEvent 构造 + touchstart → touchmove×n → touchend 序列；selector/坐标；isTrusted=false）；dom-tools.ts **尾部**追加 tap/swipe/pinch 子命令（enum 尾部 + 分支 + schema/help/subcommandRisks，既有 27 头部注册序不漂移）；session.ts 追加 dom touch 默认关行；help 公开局限（合成事件 isTrusted=false、不承诺惯性/手势识别被目标接受，NG-007/FR-015 同族）；目标不处理合成事件 → 可读提示（v3 EC-007 语义沿）。**失败 → 降级出口：FR-024 out 记录**（state notes/validate 移交：合成 touch 降级 out + 归属 CDP Input.dispatchTouchEvent），**零实现**（不写 ops/子命令/session 行）。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| MODIFY | packages/web-cli-base/src/platform-dom.ts（touchDispatch 真实现 —— 仅 PASS 分支） |
| MODIFY | packages/web-cli-base/src/dom-tools.ts（tap/swipe/pinch 尾部子命令 —— 仅 PASS 分支） |
| MODIFY | packages/web-cli-base/src/dom-tools.test.ts（touch 用例增补 —— 仅 PASS 分支） |
| MODIFY | packages/lgdl-web/src/ai/session.ts（touch 默认关行 —— 仅 PASS 分支） |

**验收标准**:
- [ ] **G-01 验证门先行**：真实 chromium 合成 touch 验证 tap/swipe/pinch 各 ≥1 命中（touch 监听页）；结果记录于任务交付/validate 移交
- [ ] PASS 分支：dom 26 既有子命令头部注册序 + `dom tap/swipe/pinch` 尾部追加不漂移（AC-001 断言）；touchDispatch 派发序列断言（touchstart/move×n/touchend + 目标坐标）
- [ ] PASS 分支：目标不处理合成事件 → 可读提示（v3 EC-007 语义沿）；help 含局限声明（isTrusted=false/不承诺受信）
- [ ] PASS 分支：session.ts touch 默认关行生效（矩阵断言）
- [ ] **FAIL 分支**：G-01 失败 → out 记录完成（FR-024 降级 + CDP Input.dispatchTouchEvent 归属说明），零实现残留（grep dom-tools 无 tap/swipe/pinch）
- [ ] base + lgdl-web build/test 全绿（每步门禁 AC-001）

**验证命令**:
```bash
npm run build --workspace @lgdl/web-cli-base && npm run test --workspace @lgdl/web-cli-base
npm run build --workspace @lgdl/lgdl-web && npm run test --workspace @lgdl/lgdl-web
# G-01：真实 chromium 最小 touch 验证（validate 冒烟清单承接记录）
```

### TASK-014: 红线校验 + 终收口 GATE（AC-001 零回归专项 + 纯度/依赖 + 冒烟清单 + validate 移交）

| 属性 | 值 |
|------|-----|
| **复杂度** | L |
| **前置依赖** | TASK-001~013（全部） |
| **执行波次** | Wave 9（终收口 GATE） |
| **对应 FR** | FR-001/003/004 + NFR-001/002/003/005/006/007/008 + AC-001/002/005/008/010（+ D-005 测试守恒） |
| **TB 映射** | TB-O |
| **风险** | 收口项遗漏（红线清单 + 移交清单双核对） |

**输入**: plan §5.3 测试策略 + spec §8 AC-001/010 + v3 收口先例（build.md GATE + D-005 守恒）

**描述**: 终收口门禁（含「零回归红线校验」专项，用户红线任务）。（1）**AC-001 红线专项**：dom 27 子命令头部注册序与 v3 逐字节一致（SUBC0MMANDS 前 27 项断言，新子命令仅尾部）；v3 全部工具行为零回归（wait/page-eval/extract/export/chrome + clipboard 文本 read/write 专项跑全）；既有工具无新增 emit/订阅副作用 grep（router/tools 无推式副作用）；deriveTools 顺序断言不漂移；schema 体积对比 v3 可控（tool_choice 不漂移）。（2）**纯度/依赖 grep**：base 零 lgdl/react/业务 import 残留；package.json 依赖图谱（含 devDep）零新增；零扩展工程痕迹（chrome.runtime/tabs/downloads/manifest/@types/chrome）。（3）**安全明文 grep**：cookie 值/URL token/键入/console·对话框/富剪贴板明文零进出（FR-006）；审计无明文（FR-007）。（4）**构建/测试门禁**：全仓 tsc/vite build 零错误 + 全仓 test 全绿（v2/v3 基线 + v4 新增，测试守恒 D-005：既有测试零删除）。（5）**移交**：validate 冒烟清单扩展（V13/v3 方法 → v4：订阅端到端 AC-002/对话框三路 AC-006/cookie roundtrip/富剪贴板 roundtrip + paste/穿透定位/G-01 touch/G-02 拦截结果归档）；v2/v3 收口人工基线关联表 + FR 验收「待基线」标注清单（FR-004）；ROADMAP.md 登记（v4 与 v2/v3 v0.7 同批发布 + F-14 契约预留继承基线，FR-004/027）。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| MODIFY | .sddu/specs-tree-root/ROADMAP.md（v0.7 同批登记 + F-14 契约预留继承基线） |
| MODIFY | .sddu/specs-tree-root/specs-tree-web-cli-base-v4/state.json（notes 回填收口证据，供 validate 消费） |
| — | 全仓验证（不改 src 实现；游离产物清理如有） |

**验收标准**:
- [ ] dom 27 头部注册序断言零漂移 + v3 全工具行为专项全绿 + deriveTools 顺序断言不漂移（AC-001）
- [ ] grep：既有工具无新增 emit/订阅副作用零命中；base 零 lgdl/react import 残留；package.json 零新增依赖（含 devDep）；零扩展工程痕迹（AC-008）
- [ ] 明文 grep：cookie/URL token/键入/console·对话框/富剪贴板明文零命中（FR-006/007）
- [ ] 全仓 build（9 包 tsc/vite）零错误 + 全仓 test 全绿（D-005：既有测试文件零删除、删除行 = 0 或逐条有据）
- [ ] G-01/G-02 结果归档（通过 or out 记录）已写入 state notes/validate 移交
- [ ] validate 移交清单：v4 冒烟面（订阅/对话框/cookie/剪贴板/穿透/touch/拦截）+ v2/v3 收口基线关联表（FR-004「待基线」不阻塞标注）
- [ ] ROADMAP.md：v4 与 v2/v3 v0.7 同批发布登记 + F-14 契约预留继承基线（FR-004/027）

**验证命令**:
```bash
npm run build && npm test
# 红线 grep 断言（base 纯度 / 零扩展痕迹 / 明文零命中 / 既有工具无推式副作用）逐项见验收清单；测试守恒 diff 核对
```

---

## 3. 任务汇总

| 统计项 | 数值 |
|--------|:--:|
| 总任务数 | 14 |
| S 级 (简单) | 0 |
| M 级 (中等) | 8 |
| L 级 (复杂) | 6 |
| 执行波次 | 9 |
| 实施任务 | 12（001~009、011、012、013 的 PASS 分支、014） |
| 文档/契约预留任务 | 1（010：EXT 组零扩展工程）+ 012/013 的 FAIL 分支（out 记录） |
| 验证门任务（内嵌降级出口） | 2（012 = NET G-02、013 = TCH G-01） |
| plan 波次覆盖 | P0 = 001~005 / P1 = 006~011 / P2 = 012~014 |

## 4. 执行策略

### 4.1 每步门禁（AC-001 零回归，贯穿所有任务）

> 任何任务完成后必须满足，否则视为未完成：
> ①v2/v3 既有测试文件零删除、零降级（D-005 测试守恒）；②相关包（base/lgdl-web）build + test 全绿；③新增能力缺省（未注入/未注册/默认关）时行为与 v3 完全一致（FR-001 缺省兼容断言随任务）；④涉及 dom-tools/clipboard/session 的任务：既有注册序/规则序不漂移断言。
> 既有工具**零推式副作用**红线 = 任何任务不得在既有工具（dom 27/wait/page-eval/extract/export/chrome/clipboard 文本面）内嵌 emit/订阅副作用（FR-001 grep 断言由 TASK-014 终收，各任务自查）。

| 波次 | 任务 | 策略 |
|:--:|------|------|
| 1 | TASK-001, TASK-002 | 并行组 ①（无依赖；文件不相交：event-bus \| sensitive/audit） |
| 2 | TASK-003 | 串行（依赖 001 类型语义） |
| 3 | TASK-004, TASK-005 | 并行组 ②（004 依赖 001/002/003；005 依赖 003 可 fake hub 先行；文件不相交）——建议先 004 后 005 便于真 hub 联调 |
| 4 | TASK-006, TASK-007 | 并行组 ③（006 依赖 002/003/004；007 依赖 002/003；文件不相交：dialog-* \| platform-dom+cookie-tools） |
| 5 | TASK-008, TASK-009 | 并行组 ④（008 依赖 003/004；009 无依赖；文件不相交）——platform-dom.ts 由 007（W4）先改、009（W5）后改，跨波次串行安全 |
| 6 | TASK-010 | 串行（归属接线依赖 005~008 工具就绪；⚠️ 接线会 MODIFY 005~008 已建工具的 help/executor——须在各工具任务完成后执行） |
| 7 | TASK-011 | 串行（场景收口：session/AiPanel/AskDialog/index，依赖 P1 全部就绪） |
| 8 | TASK-012, TASK-013 | 并行组 ⑤（P2 两路；⚠️ session.ts 同文件追加行 → 建议按 012→013 顺序执行避免并改冲突） |
| 9 | TASK-014 | 终收口 GATE（红线校验 + 全仓门禁 + 移交） |

### 4.2 降级出口（验证门任务）

| 任务 | 验证门 | 通过 | 失败（降级出口） |
|:--:|------|------|------|
| TASK-012 | G-02 真实 chromium fetch 改写验证 | 实现拦截引擎 + net 工具（P2 deny + trusted） | FR-018 拦截面降级 **out 记录**（→ FR-026 契约预留 + webRequest/DNR/CDP 归属说明）；net 工具不注册拦截面 |
| TASK-013 | G-01 真实 chromium 合成 touch 验证（tap/swipe/pinch ≥1） | platform-dom touchDispatch + dom tap/swipe/pinch + session 默认关行 | FR-024 降级 **out 记录**（→ CDP Input.dispatchTouchEvent 归属说明）；**零实现** |

> out 记录落点：state.json notes + validate 移交清单（v3 S-02 先例：降级出口不返工、不静默、归属公开）。

### 4.3 类型与文件所有权说明

- **实施任务**：001~009、011、012/013（PASS 分支）、014 —— 产出实际代码/装配/门禁。
- **文档/契约预留任务**：010（EXT 组）——仅产出 ATTRIBUTION_MAP 常量/unsupportedAttribution helper/帮助面归属表文案/契约预留注释，**零扩展工程、零注册工具、零进 schema、零新依赖**。
- **平台实现文件所有权（防并行冲突）**：platform-events.ts = TASK-004 成文 → 006（override 源）→ 008（paste 源）→ 012（拦截引擎）增量追加，均跨波次串行；platform-dom.ts = TASK-004（synthetic 埋点 W3）→ 007（cookie ops W4）→ 009（resolver W5）→ 013（touch W8）；platform.ts = TASK-003（类型 W2）→ 004（events 装配 W3）→ 008（clipboardRich 装配 W5）；session.ts = TASK-011（主块 W7）→ 012/013（追加行 W8）。
- **预算常量单一数据源**（D-001/TASK-001）：DEFAULT_BUDGETS 为唯一来源，TASK-005 events 工具与单测只引用、不硬编码（ADR-004）。

### 4.4 TB 块 → 任务整合记录（D-001，供 review 追溯）

| plan §9 TB 块 | 任务 | 整合说明 |
|------|------|------|
| TB-A / TB-C / TB-B / TB-D / TB-E / TB-G / TB-H / TB-I / TB-J / TB-K | 001/002/003/004/005/006/007/008/009/010 | 一一对应 |
| TB-F | TASK-004 | **合并**（TB-D+TB-F：platform-events.ts 观察源单文件所有权一次成文，规避同文件跨任务并行冲突） |
| TB-L | TASK-011 | **合并**（FR-028/029/030 三文件场景收口单任务，v3 TASK-009 先例） |
| TB-M / TB-N | 012 / 013 | 对应（各内嵌验证门 + 降级出口） |
| TB-O | TASK-014 | 对应（红线校验 + 终收口 GATE；AC-001 每步门禁贯穿于各任务验收） |

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建（plan §9 TB-A~TB-O → 14 原子任务 / 9 波次：P0 串行主轴 TASK-001→003→004/005（TB-D+TB-F 合并 = platform-events 单文件所有权）；P1 五路并行 006~010 + 场景收口 011（TB-L 三文件合并）；P2 验证门 012/013（G-02/G-01 内嵌降级出口）；TASK-014 红线校验 + 终收口 GATE。每步门禁 AC-001 定义 §4.1；预算常量单一数据源落 TASK-001；EXT 组文档/契约预留 = TASK-010） | 2026-09-08 | SDDU Tasks Agent |

---

## 5. Build 阶段状态（2026-09-08，sddu-build）

> 本附录由 sddu-build 在实现完成后回填（tasks.md 任务状态附录；不改变任务定义本身）。

| 任务 | 波次 | 状态 | 验收要点结论 |
|------|:--:|:--:|------|
| TASK-001 | W1 | ✅ completed | EventBus + DEFAULT_BUDGETS 单一数据源；20 单测全绿（含缓冲丢弃/4KB 截断/lastId 增量/抖动合并/自动暂停/审计窄钩子） |
| TASK-002 | W1 | ✅ completed | redactUrlQuery/isSensitiveHeader/maskHeaderValue/maskTextPayload/键入与文本面策略常量 + audit 6 新事件类型；v3 用例零回归 |
| TASK-003 | W2 | ✅ completed | events?/clipboardRich? 缝 + PlatformDomOps #26~29 全缺省；nodeEnv 不预置；编译零破坏 |
| TASK-004 | W3 | ✅ completed | createBrowserEventHub 惰性安装（dom/lifecycle/console/network/paste）+ browserEnv 装配 env.events；node 注入面 9 用例全绿；真实浏览器冒烟记录（G-01/G-02/SHD 均实测，见 §4） |
| TASK-005 | W3 | ✅ completed | events 11 子命令 executor/schema/help/subcommandRisks + 审计记录点 + dom observe 别名 + 局限声明 |
| TASK-006 | W4 | ✅ completed | dialog 6 子命令 + dialog-policy（缺省保守三路/破坏性 deny-accept/promptText trusted-only）+ dialogOverride 真实现（同 realm + iframe 尽力 hook/卸载还原/冲突可读） |
| TASK-007 | W4 | ✅ completed | cookie ops 真实现（document.cookie 可达面/掩码缺省/Secure 转译/回读断言）+ cookie 工具 trusted 双闸 + chrome.cookies 归属 |
| TASK-008 | W5 | ✅ completed | clipboardRich 富写缝 + write-html/write-image/paste-read + pasteCapture 槽（惰性挂载/末退订卸载）；文本 read/write 零回归 |
| TASK-009 | W5 | ✅ completed | 共享 resolver 穿透（open shadow + 同源 iframe + 深度护栏 4 + via:shadow/iframe 标注）；主文档 CSS 零回归；locator 帮助面补穿透说明 |
| TASK-010 | W6 | ✅ completed | ATTRIBUTION_MAP 12 能力 + unsupportedAttribution 统一文案 + 5 工具 help 归属表接线；零注册零 schema 零扩展依赖 |
| TASK-011 | W7 | ✅ completed | session v4 矩阵（events 默认开；cookie/dialog/net 默认关）+ LGDL 策略规则 + AiPanel 事件摘要行 + AskDialog 文案 + index v4 导出；vite build 通过 |
| TASK-012 | W8 | ✅ completed（**G-02 PASS**） | 真实 chromium fetch 改写实测通过 → net 拦截引擎（fetch/XHR 共享 instrumentation）+ net 工具（P2 deny + trusted + 审计）+ 矩阵默认关 |
| TASK-013 | W8 | ✅ completed（**G-01 PASS**） | 真实 chromium 合成 touch 命中 → touchDispatch + dom tap/swipe/pinch 尾部 + LGDL deny 默认关 + help 局限声明 |
| TASK-014 | W9 | ✅ completed | 红线 grep/纯度/依赖/扩展痕迹 CLEAN + 全仓 build 零错误 + 全仓 test 零失败 + G 结果归档 state/build + ROADMAP v0.7 同批 F-26 登记 |

**测试守恒（D-005）**：v2/v3 既有测试零删除零降级；web-cli-base 基线 376 → 471（净增 95），lgdl-web 基线 62 → 66（净增 4，均为追加断言/矩阵续记），其余包零改动。

**Gate 明细**：见 build.md §4（G-01/G-02/SHD 真实 chromium PASS 记录 + 移交 validate 冒烟清单）。
