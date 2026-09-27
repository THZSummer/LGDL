# 技术计划：specs-tree-web-cli-plugin-v55-f-next-drive-accuracy（web-cli-plugin v0.11.4「next 驱动机制的准确落地」；父 Feature 统领性技术方案）

> **文档定位**: SDDU 技术方案 — 记录架构设计、方案对比和 ADR，作为 tasks 阶段的输入
> **前置依赖**: 本目录 `spec.md`（v1.0，102 FR / 16 NFR / 25 EC / 32 AC）+ `discovery.md`（v1.0）+ 两叶 `spec.md`（`specs-tree-nda-1-next-tool-channel` / `specs-tree-nda-2-fallback-and-gates`）+ **F-36** `specs-tree-web-cli-plugin-v55-f-ai-driven-next`（v0.11.3，两叶 `validated`，被修正对象 + 保留资产来源）+ 基座 `packages/web-cli-base/src/{llm.ts,runner.ts}`（只读复用）
> **创建人**: SDDU Plan Agent
> **创建时间**: 2026-09-27
> **版本**: v1.0
> **更新人**: SDDU Plan Agent
> **更新时间**: 2026-09-27
> **更新说明**: 初始创建（父统领性技术方案：9 个父级 ADR + 12 项 plan 阶段事实订正 / 偏差登记 + 逐叶文件影响 + 体积分列预算终案 + 门禁逐条处置三态。**零改基座**（只复用 `hooks.intercept` 缝）；**零运行时验证**（本阶段未跑 `npm test` / 构建 / Chromium）；ROADMAP 零 diff）

---

## 1. 前置检查

| 检查项 | 状态 |
|--------|:--:|
| spec.md 存在（父 + 2 叶） | ✅ 父 960 行 / 叶1 305 行 / 叶2 285 行；`state.json` 三份均 `phase=specified` 且 `childrens` 恰 2 |
| `discovery.md` 存在 | ✅ 464 行（Q-NDA-001~024 / A-NDA-001~009 / R-NDA-001~013 / O-NDA-001~014） |
| 外部 API 文档缓存 | ⚠️ **不适用**（本 Feature **零外部服务 / 零新依赖**；不触碰受管 Provider；`routing.v1 = local_or_compute → none`） |
| 前置依赖已满足 | ✅ F-36 父 + 两叶 `validated/completed`（`103e981` 收口）；基座 `llm.ts:23-75`（`LlmToolDef`/`WebCliToolCall`/`parseToolArguments`）+ `runner.ts:50-55,158-164`（`hooks.intercept` 缝）只读复核命中；分支 `feature/web-cli-plugin` @ `a75466a` |
| 结构一致性 | ✅ 叶目录**直接嵌套**（无 `children/` 中间层）；父 = 轻量规范容器（父不承接 build/review/validate、不产父层 `tasks.json`） |
| 冻结面 / 零改基座基线 | ✅ `packages/web-cli-base/**` 有 `insight-no-escalation.test.ts` 机核；`zeroDiffFiles` 恰 9 项；保护段 journey `[43484,59347)` / binding `[107780,115930)` 活跃 pin |
| 体积基线（引用值，未复跑） | ✅ A 列 `dist/sidepanel.js` **604,602 B** / 档位 **614,400** / 距档 **9,798 B** / 生效上限 `floor(604602×1.05)=` **634,832** / 绝对上限 **675,840**（`test/size-baseline.ts:389,604-612`） |

### 1.1 本阶段事实订正与偏差登记（**plan 阶段只读复核，逐条 `file:line`；承 spec `COR-NDA-1~5` 先例续编 `COR-NDA-6~12`**）

| # | spec 表述 | 复核事实（`file:line`） | plan 处置 |
|---|---|---|---|
| **COR-NDA-6** | FR-NDA-020 / 117：新工具需在 `test/parity/baseline-catalog.json` 的 `pluginExtra` 新增条目 | ❌ **位置订正**：`baseline-catalog.json` 只有 `provenance` / `toolCount` / `tools` 三个键；`pluginExtras` 实际位于 **`test/parity/waivers.json#pluginExtras`**（`parity.test.ts:232-247` 断言 reason + basis 非空） | `pluginExtras['next']` 登记在 **`waivers.json`**；不动 `baseline-catalog.json`（`toolCount` 34 是 **main 基线**投影，`insight-archive.test.ts:698-699` 钉死 ⇒ **不得**改） |
| **COR-NDA-7** | FR-NDA-011：工具 schema `params:{type:'object'}` | ❌ **同构冲突**：运行时 `AiNextCandidate.params` 是 **`string`**（`definition.ts:104`），第④道校验要求 `typeof raw.params === 'string'` 且非空且 `≤ AI_NEXT_PARAM_MAX=128`（`ai-next.ts:120-125`） | **以运行时为准**：schema `params:{type:'string'}`（R-NDA-008 消解）；`{type:'object'}` 视为 spec 笔误，登记 `PD-NDA-012`（见 §7.2） |
| **COR-NDA-8** | FR-NDA-022：参数经基座 `parseToolArguments` 解析 | ⚠️ **语义订正**：基座 `parseToolArguments`（`llm.ts:219-241`）**只保留标量**（`subcommand` + 平面 `args`），**数组 / 对象字段被丢弃** ⇒ `candidates` **不可能**从 `tc.args` 取到 | 捕获面 = **`tc.rawArguments` 严格 `JSON.parse`**（插件侧，零改基座）；「基座已解析过」仍成立（`tc` 由它构造），仅**结构化载荷**须插件侧复取。见 ADR-NDA-002 §③ / COR-NDA-14 |
| **COR-NDA-9** | spec 未提 `next` 工具调用会上流 | ⚠️ **新增事实**：基座对**每次**工具调用都发 `events.onCommandLine`（`runner.ts:156`）与 `events.onToolOutput`（`runner.ts:176`）⇒ 不处置会多出一张「`next`」工具卡 + 一行命令行 | SW 侧**加法过滤**（`onCommandLine === NEXT_TOOL_NAME` / `onToolOutput` 时 `lastTool.name === NEXT_TOOL_NAME` ⇒ 跳过）；`hooks.onToolDone` **逐字不动**（COR-NDA-4 保持）。见 ADR-NDA-002 §④ |
| **COR-NDA-10** | FR-NDA-042：`NEXTSTEP_PRIORITY` 恰 4 等价重锚 | ✅ 成立且**成本已定位**：`NEXTSTEP_PRIORITY` 恰 4（`recommend.ts:60`）；`RULE_PROVIDER_IDS` 恰 3（`providers.ts:88`）；`NEXTSTEP_LABELS` 是 `Record<NextstepRuleId,string>`（`recommend.ts:428-433`）⇒ 新增第 5 规则位须同轮补标签 + 重锚 `recommendation-sources` ③ | 采纳「**新规则位 `ai-led`**」方案（ADR-NDA-003）；**显式取代 + 台账 + 密度重锚**（判据可 FAIL，非删除） |
| **COR-NDA-11** | — | ⚠️ **新增事实**：`next` 工具在 `host.ts` 注册后 ⇒ `deriveTools()` 多一行 ⇒ `parity` 只要求 `pluginExtras` 条目；**无**「工具总数」门禁（`host.test.ts:51` 只钉 `admin_` 恰 6；`CATALOG_BASELINE_META` 是 main 基线投影） | `parity` 成本 = **1 条 `pluginExtras`**（已核：无其它计数门禁） |
| **COR-NDA-12** | — | ⚠️ **新增事实**：`test/ref-context-in-turn.test.ts:314` 只断言追加段含 `REF_SCOPE_GUIDANCE`，**不**断言 `NEXT_CONTRACT_GUIDANCE` | 删除 `NEXT_CONTRACT_GUIDANCE`（`ref-context.ts:52-59,100`）**不破** RCT 门禁 ⇒ FR-NDA-041/081 零门禁代价 |
| **COR-NDA-13** | §5.14.1 体积分列预算 | ✅ 复核命中：`SIDEPANEL_BASELINE_BYTES = 604_602`（`size-baseline.ts:389`）、`SIDEPANEL_CEILING_CAP_ROLE='record-only'`、`authorConfirmation` 仍是 `pending-author-line`（`v4-supersession-ledger.json#v3Vol3Closeout`） | 预算表沿用 spec §5.14.1；plan 侧只**细化到模块**（ADR-NDA-008 §③） |
| **COR-NDA-14** | — | ⚠️ **新增事实（承载 COR-NDA-8）**：`WebCliToolCall` 同时携带 `subcommand` / `args`（平面）与 `rawArguments`（原文），**只有 `rawArguments` 保真** | 捕获 / 解析 / 校验输入面**单源 = `rawArguments`**；`tc.args` **零使用**（防第二解析面） |
| **COR-NDA-15** | FR-NDA-072 / PD-NDA-008：系统兜底推荐落点 | ⚠️ **成本已定位**：任何**新增 provider** 都会破 `driver-quadruple` 的**恰 12**（`driver-quadruple.test.ts:233-235,376-378`）与 `next-registry` NR-10 的**恰 12**（`next-registry.test.ts:264,315`） | 采纳「新 provider `llm.abnormal`」方案（ADR-NDA-007）⇒ **12→13 等价重锚**（只增）+ `DRIVER_DECLS_SRC` 加 1 行；**`BLOCKED_TERMINALS` 仍恰 5 / `OPS_RECOVERY_PROVIDER_IDS` 仍恰 2 / `RECOVERY_PROVIDER_IDS` 仍恰 5**（不移交既有判据） |

> **口径**：以上订正**不改变**任何 spec 的问题判定 / 编号 / 风险等级；只把 plan 阶段只读复核到的**更精确事实**与**门禁成本**显式登记（承 F-34 `COR-SGO-*` / F-35 `COR-IAN-*` / F-36 `COR-ADN-*` 先例，spec 已自建 `COR-NDA-1~5`）。**规格本身不被本阶段改写**（`plan.md` 与 `spec.md` 并存；偏差项在 tasks/build 以 `PD-NDA-*` + 台账承接）。

### 1.2 本阶段两条硬性结论（**先写结论**）

**结论 ①：机制换轨在「零改基座」硬红线下完全可行 —— 且不需要任何新增消息 / 新 kind / 新宿主。**
链路逐段可定位：
`host.ts:333` 旁注册 `next` 工具（`router.register` ⇒ `deriveTools()` `host.ts:546-548`）→ 基座把 tools 交给 provider（`service-worker.ts:986-991`）→ 模型返回 `next` 调用 → 基座在 **dispatch 前**问缝（`runner.ts:163`）→ 插件返回**合成 `ToolResult`** ⇒ `intercepted ?? dispatch` 短路（`runner.ts:164`）⇒ **真实 dispatch 被跳过**（`next` 工具零执行体触达）→ SW 侧 5 道校验（`ai-next.ts:105-143` 逐字保留）→ `chat-result{done, aiNext?}`（`service-worker.ts:1036-1042` 改造）→ 面板单槽消费（`sidepanel.ts:1996,4224`）→ `ai-led` 独立规则位产卡（ADR-NDA-003）。**`packages/web-cli-base/**` 零 diff**；`KIND_SET` 40 / 12 kind / 零宿主 / `ACT_TO_OP` 6 逐字不动。

**结论 ②：提醒（nudge）可**不新增回合容器**、**不新增 `requestTurn(` / `nextAfterSettle(` 调用点**、**不污染会话历史**。**
基座 agent 循环在 assistant **无 `tool_calls`** 时即 `finish('completed')`（`runner.ts:188-193`）——**没有**回合后注轮钩子（Q-NDA-008 事实成立）。plan 裁决：nudge 落在 **SW 的 `chat` 回调内**（`service-worker.ts:986-999`）——该回调**每轮**被调用且拿到完整 `res`；当 `res.toolCalls.length === 0 ∧ 已配置 ∧ 未捕获 ∧ !nudgeUsed` 时，插件**追加一条 nudge user turn 后再调一次 `providerChat`**，把**第二次结果**作为该轮结果返回给基座。⇒ 仍在**同一次 `runChatTurn`** 内（`op-wiring` 的 `requestTurn(` 恰 1 / 0 新增调用点 / `driver-quadruple` 的 `nextAfterSettle` 1 定义 10 调用点**全部不动**）；`nudgeUsed` 是**每回合事件作用域单布尔**（恰一次）；nudge 轮不得再 nudge（有界）；nudge 撞在飞仲裁 ⇒ 不排队（继承 `blocked:busy` / `ai-deferred` 语义）。见 ADR-NDA-006。

---

## 2. 架构分析

### 2.1 问题定性（题眼）

F-36 把「next 产出权交给 AI」的**原则**立住了，把**机制**做偏了四处（spec §1 逐字）：① 文本 `next` 围栏块口述 + 正则解析（`ref-context.ts:52-59`、`ai-next.ts:58-87`、F-36 `plan.md:127-133` 显式否决 tool-call）；② 触发范围收敛到「有引用」上下文（`ref-context.ts:97-100`、`ai-next` 骑 `ref-action` 位 `providers.ts:162-175`、F-36 `plan.md:290` PD-ADN-005）；③ 未配置 ⇒ 恒真「自由输入」终端（`providers.ts:217`）而它**不可行**（`service-worker.ts:945-956` 零 token 返场）；④ 无 LLM 异常兜底（`service-worker.ts:1027-1043` 只校验装配；`sidepanel.ts:4147-4152` 只 `maybeRecommend('idle')`）。
**关键落差**：基座 function calling（`llm.ts:23-75,82-197`）+ **`hooks.intercept` 缝**（`runner.ts:50-55,158-164`，注释逐字「next-actions 胶囊由此接入」）**早已就位**，插件却只传 `onToolDone`（`service-worker.ts:1045-1061`）——本 Feature 补这处落差。

### 2.2 本 Feature 的架构落点（一句话）

**把 next 候选的产出面从「提示词软约定 + 正则」换成「模型原生工具调用 + 缝捕获」，把触发面从「有引用」换成「已配置即驱动」，把未配置面从「恒真自由输入」换成「确定性去配置引导」，并把「漏产 / 异常」补成「有界提醒一次 → 确定性系统兜底」；`next` 仍是**唯一**产出通道，5 道校验链仍是**唯一**安全闸，`op.llm-config` 仍是**唯一**修复 op。**

### 2.3 关键契约与数据流变更

| 面 | 现状（F-36） | 本 Feature |
|---|---|---|
| 工具面 | `deriveTools()` 无 `next` | **+`next`**（`tools/next-tool.ts` 单源；`host.ts` 注册）；`listed:false`（不进 help 一览）；`executor` = fail-closed 可读禁用态（防绕缝 dispatch） |
| 产出契约 | 系统段尾随 `next` 围栏块提示句（仅并入有引用分支） | **工具 schema `description`**（三约束）+ `parameters` JSON-schema；系统段提示句**停用** |
| 捕获面 | SW `onFinish` 取最后 assistant 文本 → 正则 → `JSON.parse` | **SW `hooks.intercept`**（dispatch 前）→ `tc.name === 'next'` → `tc.rawArguments` 严格 `JSON.parse` → `candidates` |
| 校验面 | `validateAiNext(text, facts)`（解析 + 5 道链） | `validateAiNext(candidates, facts)`（**5 道链逐字保留**；输入从「围栏块解析项」→「工具参数项」） |
| 装配面 | `chat-result{done, aiNext?}`（unconditional on text） | `chat-result{done, aiNext?}`（**同一加法字段**；`aiNext.abnormal?` 为新增可选子字段 —— 见 ADR-NDA-007 §②） |
| 规则面 | `ai-next` 骑 `ref-action` 位（`rule:'ref-action'` + `prepend`） | **`ai-led` 独立规则位**（`NEXTSTEP_PRIORITY` 恰 4 → **恰 5**；等价重锚 + 密度重锚 + 台账） |
| 未配置面 | `free-input.when` 恒真 ⇒ 未配置也铸终端 | `free-input.when` = **`!ctx.risk.includes(LLM_BLOCKED_RISK)`**（分相单源；复用既有 `risk` 源，零新 ctx 字段 / 零第二偏好键） |
| 异常面 | 无 | 新 provider **`llm.abnormal`**（复用 `op.llm-config`；文案强调「配置**新的** LLM」）+ 闭集三情判定（`no-tool-call`/`llm-failed`/`all-blocked`）+ 有界 nudge |
| 载荷面 | `ChatResultEvent.aiNext?: AiNextPayload`（type-only） | 同字段 + **`AiNextPayload.abnormal?: AiAbnormalCode`**（加法可选 ⇒ 缺席时行为逐字） |
| 冻结面 | base / `content.js` / `pick-layer.js` / `KIND_SET` 40 / 判定链 | **零触碰**（硬红线；逐字节 + sha 双锚） |

### 2.4 组件与依赖关系（只读复用 / 新增 / 修改）

```
[只读复用·零改]
  packages/web-cli-base/src/llm.ts        LlmToolDef / WebCliToolCall / parseToolArguments / providerChat
  packages/web-cli-base/src/runner.ts     agent 循环 + hooks.intercept（dispatch 前）+ events（onCommandLine/onToolOutput/onFinish）
  packages/web-cli-base/src/router.ts     router.register / deriveTools / ToolEntry / ToolResult
  packages/web-cli-plugin/src/shared/op-table.ts   OP_IDS(9) / opDescriptor / tierOf（派生式三档单源）
  packages/web-cli-plugin/src/background/chat-runner.ts   runChatTurn（同回合容器；本 Feature 不加调用点）
  packages/web-cli-plugin/src/ui/sidepanel/next-registry/{definition,registry,ai-drive,drivers,dispatch}.ts
  packages/web-cli-plugin/src/security/{policy,auto-authorize}.ts   （zeroDiffFiles 9 项之一，零触碰）

[新增]
  叶1  src/tools/next-tool.ts             NEXT_TOOL_NAME / NEXT_TOOL_SCHEMA（enum 派生）/ createNextToolEntry()
  叶2  src/background/next-drive-policy.ts shouldNudge() / abnormalVerdict() / 闭集常量（纯函数，SW 与 node 门禁共用）

[修改·叶1]
  src/background/host.ts                  +router.register(next entry)
  src/background/ai-next.ts               删围栏块解析三函数；validateAiNext 改输入面；admitCandidate 逐字保留
  src/background/ref-context.ts           删 NEXT_CONTRACT_GUIDANCE + 注入点
  src/background/service-worker.ts         hooks.intercept 接线 + events 过滤 + aiNext 装配点改造
  src/ui/sidepanel/next-registry/providers.ts  ai-next → rule:'ai-led'；DRIVER_DECLS_SRC.ai-next 同步
  src/ui/sidepanel/recommend.ts            NEXTSTEP_PRIORITY 恰 5（risk-recovery > ai-led > ref-action > onboarding > capability-discovery）+ 标签

[修改·叶2]
  src/background/service-worker.ts         nudge 接线（chat 回调）+ 异常判定装配
  src/background/chat-events.ts            （复核）加法字段承载面
  src/ui/sidepanel/next-registry/definition.ts  AiNextPayload.abnormal? + AI_ABNORMAL_CODES 闭集（type-only 单源）
  src/ui/sidepanel/next-registry/providers.ts    free-input.when 分相 + 新 provider llm.abnormal + DRIVER_DECLS_SRC 13 行
  src/ui/sidepanel/sidepanel.ts            异常事实折叠进既有 risk 源（noteLlmAbnormalFact）+ 分相接线
```

### 2.5 为什么必须 2 叶串行（复核父 spec §14.1 三条论证 → **成立**）

1. **安全先行**：AI 候选一旦能经工具调用进 chips / 被按下，**5 道校验链接入必须先就位**（`ai-next.ts:105-143` + `pressDecision` `ai-drive.ts:67-78`）。叶1 一次交付「工具 + 捕获 + 校验 + 分层 + 围栏块替换」，中间态即**安全可达**（R-NDA-001 / R-NDA-905）。
2. **风险面不同**：叶1 = 机制正确性（schema / 捕获 / 校验入口 / 规则位 / parity / 门禁改写）；叶2 = 结构治理（分相回归 / 有界性 / 词表分相 / 兜底可达 / 首开可达 / 体积 / 保护段）。耦合会让两类风险互相掩盖。
3. **体积责任相反**：叶1 = A 列薄接线 + **B 列主体**；叶2 = **A 列**分相 / 兜底接线 + 重锚；混算无法定位归因（FR-NDA-144 / 145）。**`llm.abnormal` 新 provider 只落在叶2**（⇒ 恰 12→13 重锚只属叶2，叶1 零 provider 计数代价）。

---

## 3. 方案对比

### 3.1 产出通道（母问题，Q-NDA-002）

| 维度 | 方案 A：保留围栏块 + 工具并存 | 方案 B：工具优先，围栏块作过渡兜底 | 方案 C：**工具单通道替换**（推荐） |
|------|:--|:--|:--|
| 描述 | 不动 F-36 通道，只新增工具；两条解析并存 | 工具优先；围栏块保留一个开关期（`PD-NDA-010`） | 删围栏块提示 + 解析三函数；`next` 工具为唯一产出通道 |
| 优点 | 零门禁改写（AI-N-1 不动） | 兼容风险最低 | 唯一权威；反证「围栏块仍能产出 ⇒ 必红」可判；与 spec FR-NDA-080 一致 |
| 缺点 | **双通道漂移**（哪个权威不可判）；NG-NDA-013 直接违反 | 双通道期仍在 ⇒ AI-N-1 仍需改写 + 过渡面无法收口；`EC-NDA-020` 必红风险 | AI-N-1 必须改写（已知成本，`assertionsRemoved=0`） |
| 风险 | 高（R-NDA-902） | 中高 | 中（门禁改写有对账兜底） |
| 工作量 | 小 | 中 | 中 |
| 依据 | — | `PD-NDA-010` | **DC-NDA-006 / O-NDA-006（已裁决）** |

### 3.2 捕获参数面（Q-NDA-007 子问题，COR-NDA-8/14）

| 维度 | 方案 A：`tc.args` 平面读 | 方案 B：**`tc.rawArguments` 严格 JSON**（推荐） | 方案 C：把 schema 平面化到 `args` |
|------|:--|:--|:--|
| 描述 | 从 `tc.args.candidates` 取值 | 插件侧 `JSON.parse(tc.rawArguments)` 取 `candidates` 数组 | schema 改成 `{args:{candidates:"<json string>"}}` |
| 优点 | 与既有工具一致 | **零改基座**、结构保真、失败可判（`EC-NDA-015`） | `tc.args` 可用 |
| 缺点 | **不可行**（`parseToolArguments` 丢弃数组，`llm.ts:222-235`） | 插件侧多一次解析（一次，单源） | 把嵌套结构退化成字符串 ⇒ 模型遵从度更差；schema 不再描述结构 |
| 风险 | 判红（取不到值） | 低 | 中高（R-NDA-008） |
| 工作量 | 0 | 小 | 小 |

### 3.3 提醒（nudge）续轮通道（Q-NDA-008，PD-NDA-007）

| 维度 | 方案 A：第二次 `runChatTurn` | 方案 B：**`chat` 回调内续呼**（推荐） | 方案 C：面板侧定时再驱动 |
|------|:--|:--|:--|
| 描述 | `onFinish` 后起一次新回合 | 同一回合内，`chat` 回调发现「无 toolCalls」时追加 nudge 再调一次 provider | 面板等一个 tick 后重新发 chat |
| 优点 | 实现直观 | **零新增回合容器 / 零新增调用点 / 零会话污染 / 有界天然** | 不动 SW |
| 缺点 | 新增 user turn 入会话（污染历史）+ 可能新增计数调用点 + 与 `busy`/仲裁耦合 | 依赖「无 toolCalls ⇒ 回合将结束」这一既有事实（`runner.ts:142,188`） | 破 B 列优先；绕过 SW 判定；可能与「用户已发下一条」竞态 |
| 风险 | 中高（R-NDA-002 / 计数门禁） | 低 | 高（第二驱动面） |
| 工作量 | 中 | 小 | 中 |
| 依据 | — | **DC-NDA-004 / O-NDA-004** | — |

### 3.4 `ai-next` 规则位（Q-NDA-015，PD-NDA-006，X-NDA-5）

| 维度 | 方案 A：继续骑 `ref-action` 位 | 方案 B：**`ai-led` 新规则位**（推荐） | 方案 C：规则表外的独立注入点 |
|------|:--|:--|:--|
| 描述 | 只改 evidence / 注释 | `NEXTSTEP_PRIORITY` 插第 2 位 `ai-led`（恰 4→5），`ai-next` 改 `rule:'ai-led'` | 仿 free-input 终端：`recommendNextStep` 内单独注入 |
| 优点 | 零门禁代价 | 语义诚实（AI 是一档**独立**推荐）；行为保持（AI 仍优先于 `ref-action`）；判据可 FAIL | 零规则表改动 |
| 缺点 | **仍骑该位**（FR-NDA-042 字面要求违反）；卡标题语义与实际不符（靠 `label` 覆盖掩盖） | 破「恰 4」⇒ 须显式取代 + 台账 + 密度重锚（已知成本） | **绕过 `candidateRules` 的 `safety` / R6 / 单卡预算口径** ⇒ 第二产出路径（N-NDA-022 风险） |
| 风险 | 中（规格未满足） | 中（门禁改写，有对账） | 高 |
| 工作量 | 极小 | 小 | 中 |

### 3.5 系统兜底推荐落点（Q-NDA-010，PD-NDA-008）

| 维度 | 方案 A：复用 `llm.unconfigured` 行（ctx 敏感文案） | 方案 B：**新 provider `llm.abnormal`**（推荐） | 方案 C：无 provider，靠确定性兜底卡 |
|------|:--|:--|:--|
| 描述 | 同一行 `textOf(ctx)` 分相 | 第 13 行 provider；`when` 读新 risk 项；chip = `op.llm-config` | 只给注册表候选 + 终端 |
| 优点 | provider 数不变（12） | **词表分相干净**（N-NDA-026）；文案可为「配置**新的** LLM」；DQ-1/DQ-3 可登记 | 零 provider |
| 缺点 | **把「未配置」与「配置了但坏了」合到同一 provider 行** ⇒ 分相被行本身抹平（R-NDA-904） | 破恰 12 ⇒ 重锚 2 处门禁（COR-NDA-15） | **不满足**「推荐用户配置新的 LLM」（FR-NDA-072/073） |
| 风险 | 高 | 中 | 高（规格未满足） |
| 工作量 | 小 | 中 | 小 |

### 3.6 分相判据（Q-NDA-014，O-NDA-008）

| 维度 | 方案 A：`NextCtx` 新增 `configured` 字段 | 方案 B：**复用既有 `risk` 源**（推荐） | 方案 C：面板第二偏好键 |
|------|:--|:--|:--|
| 描述 | ctx 加第 8 个顶层源 | `!ctx.risk.includes(LLM_BLOCKED_RISK)` | 新 `localStorage` / `chrome.storage` 键 |
| 优点 | 语义直白 | **零新源**（`NEXT_SOURCE_NAMES` 仍恰 7 + `recommendation-sources` ①~④ 不动）；与 `llm.unconfigured` provider **同一事实源**（`providers.ts:138`） | — |
| 缺点 | 破 7 源白名单（两个门禁） | 判据是**派生读**（须在 ADR 写清口径） | 第二配置真相（明确禁止） |
| 风险 | 中高 | 低 | 高 |
| 工作量 | 中 | 极小 | 小 |

### 3.7 体积（Q-NDA-013，R-NDA-006）

| 维度 | 方案 A：全落 A 列（面板） | 方案 B：**B 列优先**（推荐） | 方案 C：混合 |
|------|:--|:--|:--|
| A 列净增 | +4 ~ +8 KB ⇒ **越距档（9,798 B）** | **+0.8 ~ +2.4 KB**（+15% ⇒ +0.9~+2.8 KB） | 不可定位 |
| B 列净增 | 0（不计账） | +2.5 ~ +7.0 KB（不计账） | 混算 |
| 结论 | 直接触发 EC-NDA-016 升档 | **正常口径不触发升档**；2.8× 最坏 ≈7.7 KB 仍 < 9,798（余量薄 ⇒ 预置 EC + 作者一行） | 违反 FR-NDA-145 |

---

## 4. 推荐方案

**推荐：3.1-C + 3.2-B + 3.3-B + 3.4-B + 3.5-B + 3.6-B + 3.7-B。**

**理由（逐条锚定已裁决口径，不新增裁决）**：

1. **3.1-C（工具单通道）是 DC-NDA-006 / O-NDA-006 的落地**：双通道会让「谁是权威」不可判（门禁不可判 = 判据退化）；且「零新 LLM 往返」契约不受影响（工具调用在**同一回合**内，`runner.ts:142-186`）。
2. **3.2-B 是唯一可行解**（COR-NDA-8：`tc.args` 取不到数组）；同时满足「解析失败 ⇒ 视为未产出、不中断回合」（`EC-NDA-015`）——因为插件侧解析被 `try/catch` 包住且**不抛**（`runner.ts:165-168` 是兜底，但本设计主动不依赖它）。
3. **3.3-B 是唯一同时满足「有界恰一次」与「计数零新增」的方案**：`nudgeUsed` 事件作用域单布尔（`FR-NDA-062`），且**不新增**回合容器 ⇒ `requestTurn(` / `nextAfterSettle(` / `maybeRecommend` 三个既有计数判据全不动（`FR-NDA-063/064`、X-NDA-11 从「预登记」直接降级为「**未发生取代**」）。
4. **3.4-B 是唯一满足 FR-NDA-042 字面（不再骑 `ref-action`）且不制造第二产出路径的方案**，且**行为等价**（AI 优先级位置不变）；它把「恰 4」的破局做成**显式取代 + 台账 + 密度重锚**（spec §12 X-NDA-5 预授权路径）。
5. **3.5-B 保住词表分相**（N-NDA-026 是可失败红线）：把「未配置」与「配置了但坏了」压在同一个 provider 行里，等于用**结构**抹掉 spec 花整节建立的分相。
6. **3.6-B 是「单源」的字面最优**：`LLM_BLOCKED_RISK` 已由 `noteLlmBlockedFact`（`sidepanel.ts:1484-1486`）从**主动识别**（SW 裁定 `ruled=true`）与**被动观测**两路折叠进 `observedBlocked`，再折进 `risk`（`sidepanel.ts:2059-2062`）——分相判据与修复 provider 的 `when` 因此**共享同一事实**，天然幂等。
7. **3.7-B 是 DC-NDA-013 的落地**：距档仅 **9,798 B**，而捕获 / 校验 / nudge / 兜底是**新增逻辑主体**；SW 已持有 LLM 输出与 `op-table` 镜像（`sw-op-mirror` 先例），放 B 列（`dist/background.js` **不计 sidepanel 账本**）是旁路档位压力的唯一低风险选择。

**与 spec 七项关键口径的逐条对齐（无偏移）**：

| spec 口径 | plan 落点 | 一致性 |
|---|---|---|
| ① `next` 工具 schema `{candidates:[{opId,label,ref?,params?}]}`，maxItems ≤3，运行时 5 道链权威 | ADR-NDA-001（+ `params` 类型按运行时订正 = `string`，`PD-NDA-012`） | ✅（含 1 条偏差登记） |
| ② 提醒补一次：恰一次 nudge 续轮，有界防环 | ADR-NDA-006（回调内续呼，`nudgeUsed` 单布尔） | ✅ |
| ③ 异常判定闭集三情，与 `llm.unconfigured` 分相 | ADR-NDA-007 | ✅ |
| ④ 系统兜底复用 `op.llm-config`（confirm 档），文案强调「配置新的 LLM」 | ADR-NDA-007 §③（新 provider `llm.abnormal`，**op 复用不变**） | ✅ |
| ⑤ 未配置引导 `llm.unconfigured` risk → recovery row → op-direct chip，不显示 free-input | ADR-NDA-005（零新引导面，只做分相） | ✅ |
| ⑥ 围栏块通道替换（单一产出通道），校验链 / `admitCandidate` 保留 | ADR-NDA-004（含 `ai-next-candidate` 门禁改写） | ✅ |
| ⑦ 首开保持确定性 | 叶2 ADR-NDA-202（`PD-ADN-001` 不转正；`R8-1~6` 逐字不动） | ✅ |

---

## 5. 文件影响分析

> **列别**：**A** = `dist/sidepanel.js`（计入账本）/ **B** = `dist/background.js`（不计账）/ **C** = 冻结面（零容差）。叶1 / 叶2 分工见各叶 `plan.md` §5。

### 5.1 源码 `src/**`

| 操作 | 文件路径 | 列 | 说明 | 叶 |
|:--:|---|:--:|---|:--:|
| NEW | `packages/web-cli-plugin/src/tools/next-tool.ts` | B | `NEXT_TOOL_NAME` / `NEXT_TOOL_SCHEMA` / `NEXT_TOOL_MAX_CANDIDATES` / `createNextToolEntry()` | 叶1 |
| NEW | `packages/web-cli-plugin/src/background/next-drive-policy.ts` | B | `shouldNudge()` / `abnormalVerdict()` / `AI_ABNORMAL_CODES`（纯函数；node 门禁可直接调用，FR-NDA-106） | 叶2 |
| MODIFY | `packages/web-cli-plugin/src/background/host.ts` | B | `:333` 旁 `router.register(createNextToolEntry())`（**always registered**；`listed:false`） | 叶1 |
| MODIFY | `packages/web-cli-plugin/src/background/ai-next.ts` | B | **删** `FENCE`/`lastNextFenceBody`/`parseAiNextItems`/`AI_NEXT_FENCE_INFO`；**改** `validateAiNext(candidates, facts)`；**逐字保留** `admitCandidate` / `AI_NEXT_LABEL_MAX` / `AI_NEXT_PARAM_MAX` | 叶1 |
| MODIFY | `packages/web-cli-plugin/src/background/ref-context.ts` | B | **删** `NEXT_CONTRACT_GUIDANCE`（`:52-59`）与 `:100` 注入；`REF_SCOPE_GUIDANCE` 逐字保留 | 叶1 |
| MODIFY | `packages/web-cli-plugin/src/background/service-worker.ts` | B | `hooks.intercept` 接线（`:1045-1061` 加法）；`chat` 回调（`:986-999`）nudge + 捕获；events 过滤 `next`（`:1010-1024`）；`onFinish`（`:1027-1043`）改判定源 | 叶1+叶2 |
| MODIFY | `packages/web-cli-plugin/src/background/chat-events.ts` | B | （复核）`ChatResultEvent` 承载面 —— 若异常码走 `aiNext.abnormal` 则本文件零改；否则加法字段在此 | 叶2 |
| MODIFY | `packages/web-cli-plugin/src/ui/sidepanel/next-registry/definition.ts` | A | `AiNextPayload.abnormal?` + `AI_ABNORMAL_CODES`/`AiAbnormalCode`（type-only 单源；∉ `KIND_SET`） | 叶2 |
| MODIFY | `packages/web-cli-plugin/src/ui/sidepanel/next-registry/providers.ts` | A | 叶1：`ai-next` → `rule:'ai-led'`；叶2：`free-input.when` 分相 + 新 provider `llm.abnormal` + `DRIVER_DECLS_SRC` 第 13 行 | 叶1+叶2 |
| MODIFY | `packages/web-cli-plugin/src/ui/sidepanel/recommend.ts` | A | `NEXTSTEP_PRIORITY` 恰 4 → **恰 5**（插 `ai-led`）+ `NEXTSTEP_LABELS` 补项 + `RULE_PROVIDER_IDS`/`NextstepRuleId` 同步 | 叶1 |
| MODIFY | `packages/web-cli-plugin/src/ui/sidepanel/sidepanel.ts` | A | 叶2：`noteLlmAbnormalFact`（折进既有 `risk`）+ 分相接线（`:2059-2062` 附近）；`:4224` 消费 `abnormal` | 叶2 |
| MODIFY（复核） | `packages/web-cli-plugin/src/ui/sidepanel/cards/nextstep.ts` | A | AI 候选渲染复用既有 chip 面 ⇒ **预期零改**（若渲染需识别 `terminal`/`blocked` 之外的态 ⇒ 加法） | 叶1/叶2 |

### 5.2 测试 `test/**`（**门禁严格串行；一次一个 Chromium**）

| 操作 | 文件路径 | 说明 | 叶 |
|:--:|---|---|:--:|
| 改写 | `test/ai-next-candidate.test.ts` | **AI-N-1 换机制**（围栏块解析 → 工具参数捕获）+ 新增 AI-N-12~（schema 派生 / nudge 有界 / 异常闭集 / 分相）；`assertionsRemoved = 0` | 叶1（+叶2 增量） |
| MODIFY | `test/parity/waivers.json` | `pluginExtras['next'] = {reason, basis}`（**位置订正 COR-NDA-6**） | 叶1 |
| MODIFY | `test/recommendation-sources.test.ts` | ③ 规则表 `NEXTSTEP_PRIORITY` 恰 4 → **恰 5** 等价重锚（逐项值可复算；零删除） | 叶1 |
| MODIFY | `test/driver-quadruple.test.ts` | 12↔12 → **13↔13**（新 provider `llm.abnormal`；旧 12 行逐字保留） | 叶2 |
| MODIFY | `test/next-registry.test.ts` | NR-10 声明行 12 → **13**（只增） | 叶2 |
| MODIFY | `test/free-input-next.test.ts` | `free-input.when` 恒真 → **`configured` 分相**（两相各可判 + 双向反证） | 叶2 |
| MODIFY（复核） | `test/op-wiring.test.ts` / `driver-timings.test.ts` / `turn-arbitration.test.ts` / `proactivity-guard.test.ts` / `sw-op-mirror.test.ts` / `op-three-tier.test.ts` | **预期零改**（nudge 不新增 `requestTurn(` / `nextAfterSettle` 调用点；`DRIVER_TIMINGS` 恰 5 不动）；若实测有漂移 ⇒ **只增计数 + 说明** | 叶1/叶2 |
| MODIFY | `test/ui/s0-self-driven.mjs` + `test/ui/fixtures/s0-chain.mjs` | **只加断言不加文件**：主线 A / 支线 B（叶1）→ 支线 C/D/E（叶2）；样本从「围栏块文本」重锚为「工具调用捕获」 | 叶1+叶2 |
| MODIFY | `test/ui/recommendation.mjs` | 等价重锚（AI 候选渲染 / 分相终端） | 叶2 |
| MODIFY | `test/size-baseline.ts` | 逐叶收口重登记（五要素 + 三值 + 逐模块行 + `authorConfirmation` 不得伪称） | 叶1+叶2 |
| MODIFY | `test/gate-integrity.test.ts` | 受审集合下界**只增**；`CHROMIUM_GATES === 9` 不动 | 叶1+叶2 |
| MODIFY | `test/supersession-ledger.test.ts` | `xNdaLedger*` 判据（X-NDA-1~12 三态 + 未发生登记）+ 保护段逐段决策 | 叶1（骨架）+ 叶2（终态） |
| 零改（断言绿） | `test/r8-open-next-entry.test.ts` / `test/insight-no-escalation.test.ts` / `test/ref-context-in-turn.test.ts` / `test/law8-plaintext.mjs` / `test/ui/no-dead-end.mjs` | 首开确定性 / base 零 diff / 系统段 / 法八 / 零死端 —— **不得回归**（若红 = 实现缺陷，不改判据） | 两叶 |

### 5.3 文档 / 台账 `docs/**`

| 操作 | 文件路径 | 说明 | 叶 |
|:--:|---|---|:--:|
| MODIFY | `packages/web-cli-plugin/docs/v4-supersession-ledger.json` | 新增 `xNdaLedger` / `xNdaGateReconciliation` / `xNdaLedgerFull`（X-NDA-1~12 逐条 old→new / keep / no-supersession）；**老条目一律保留不动** | 叶1（骨架）+ 叶2（终态） |
| MODIFY | `.sddu/specs-tree-root/specs-tree-web-cli-plugin-v55-f-next-drive-accuracy/**` | 本 plan + 13 ADR + 3 `state.json` | 父 |

### 5.4 C 列 / 冻结面（**零触碰，硬红线**）

| 路径 | 锚 |
|---|---|
| `packages/web-cli-base/**` | `insight-no-escalation.test.ts` 机核零 diff（N-NDA-007 / NFR-NDA-005） |
| `packages/web-cli-plugin/src/content/**`（`dist/content.js` 177,076 B） | 字节冻结（N-NDA-001 / FR-NDA-142） |
| `dist/pick-layer.js`（34,358 B） | 字节冻结（N-NDA-002） |
| `src/security/policy.ts` / `auto-authorize.ts` | `zeroDiffFiles` 9 项哈希 pin（N-NDA-018） |
| `test/ui/journey.mjs` 保护段 `[43484,59347)` sha `7b309258…` / `test/ui/binding.mjs` 保护段 `[107780,115930)` sha `be9ad0e9…` | 逐段决策（默认 `keep` + 字节中立；见 ADR-NDA-009 §③） |
| `KIND_SET` 40 / 12 kind / `REGISTERED_STRUCTURAL_HOSTS = []` / `ACT_TO_OP` 6 | 逐字不动（N-NDA-003/004） |
| `.sddu/specs-tree-root/ROADMAP.md` | 零 diff（登记留收口） |
| `.opencode/opencode.json` / `packages/web-cli-base/**` / 新依赖 | 禁改（N-NDA-020） |

---

## 6. 风险评估

> 概率 / 影响 = 高 / 中 / 低；承 spec §15（R-NDA-001~013 + R-NDA-901~910）+ plan 新增 R-NDA-911~915。

| 风险 | 概率 | 影响 | 缓解措施 |
|------|:--:|:--:|----------|
| **R-NDA-001** 换机制误伤 5 道校验链 / 分层 ⇒ AI 候选裸奔 | 中 | 高 | `admitCandidate` **逐字保留**（只换上游输入）；叶1 一次交付「工具→捕获→校验→分层」；四类注入反证（幻觉 op / `gesture` / 越界 ref / param 越界）；`pressDecision` diff=0（`ai-drive.ts:67-78`） |
| **R-NDA-002 / R-NDA-903** nudge 自杀成环 / 无界 | 中 | 高 | 回调内续呼 + `nudgeUsed` 单布尔（恰一次）+ 「nudge 轮不得再 nudge」+ 不新增 `nextAfterSettle` 调用点；**有界判据必须能 FAIL**（`shouldNudge` 纯函数直接机核）；EC-NDA-021 必红反证 |
| **R-NDA-003 / R-NDA-904** 分相误伤已配置（破 R8/F-35）或未配置被判成异常 | 中 | 高 | 分相判据**单源**（`!risk.includes(LLM_BLOCKED_RISK)`）；**双相反证**（未配置仍显示终端 ⇒ 必红；已配置删终端 ⇒ 必红）；`r8-open-next-entry` / `free-input-next` 必绿 |
| **R-NDA-004 / R-NDA-907** `parity` 条目缺失 / 敷衍 | 低 | 中高 | `pluginExtras['next']` reason + basis 非空（`parity.test.ts:232-247` 天然机核）；反证「删条目 ⇒ 必红」 |
| **R-NDA-005 / R-NDA-908** `ai-next-candidate` 改写静默删断言 | 中 | 高 | 改写前后断言**逐条对账**（语义逐条，非行数当断言数）+ `assertionsRemoved = 0`；旧 AI-N-2~11 判据**语义等价保留**（只换输入面） |
| **R-NDA-006 / R-NDA-906** 体积越档（距档 9,798 B 薄） | 中高 | 中高 | B 列优先（ADR-NDA-008）；逐叶实测重登记；2.8× 最坏预案（≈7.7 KB < 9,798，余量 ~2.1 KB 薄）；越限走 EC-NDA-016 + **作者一行**（`authorConfirmation` 不得伪称） |
| **R-NDA-007** 破 `NEXTSTEP_PRIORITY` 恰 4 / `driver-timings` 恰 5 | 高（**已决定破 4**） | 中高 | **显式取代 + 台账 + 密度重锚**（X-NDA-5）；判据**可 FAIL**（逐项值复算 + 注入「恰 4」伪造 ⇒ 必红）；`driver-timings` 恰 5 **保持**（零新增触发词） |
| **R-NDA-008** schema 与候选结构不一致 ⇒ 校验入口漂移 | 中 | 中高 | schema 与 `AiNextCandidate` **同构**（COR-NDA-7 以运行时为准）；`NEXT_TOOL_MAX_CANDIDATES === MAX_CHIPS_PER_CARD` 跨层机核；反证「第二份 op 清单 / 第二份上限 ⇒ 必红」 |
| **R-NDA-009** 法八零明文被工具参数 / 留痕撞破 | 中 | 中高 | 工具参数**只进**既有 `aiNext` 载荷（不进流内 payload / digest / 审计 / DOM）；留痕只含**字段名**；合成 `ToolResult.output` 为**常量字符串**（零回显）；`law8-plaintext.mjs` 零降级 |
| **R-NDA-010** 「LLM 坏了」与 `llm.unconfigured` 词表漂移 | 中 | 中 | 新 provider 只**复用** `op.llm-config` + `opDescriptor` 词表；异常码闭集在 `definition.ts` **单源**；反证「把未配置判成异常 ⇒ 必红」 |
| **R-NDA-011** 门禁无法断言不确定的 LLM 调用 | 中 | 中 | 判据全部落在**纯函数**（`parseNextToolArguments` / `admitCandidate` / `shouldNudge` / `abnormalVerdict`）+ 注入式反证；真源切片指向生产模块 |
| **R-NDA-012** 环境性 flake（`KL-N-10`）误读为回归 | 中 | 低—中 | 门禁**严格串行**；首轮异常**隔离复跑 ≥2**、日志全量、**仍红如实记录不阻塞**（N-NDA-019 / EC-NDA-025） |
| **R-NDA-013 / R-NDA-014** 方案先行（未定开放点被顺手定下） | 低 | 中高 | 父 §11 已全部 `ruled`；本 plan 只落已裁决口径；**新识别**的 3 条偏差（COR-NDA-7/9/14）走 `PD-NDA-012` 显式登记，不静默改 spec |
| **R-NDA-911（新增）** `next` 工具调用**上流**（多出一张工具卡 / 命令行）污染流面 | 高（若不处置） | 中 | ADR-NDA-002 §④ 加法过滤（`onCommandLine`/`onToolOutput` 跳过 `next`；`onToolDone` 语义不动）；反证「`next` 卡出现在流内 ⇒ 必红」 |
| **R-NDA-912（新增）** `rawArguments` 解析面成为**第二解析器**（与既有 `tc.args` 双面） | 中 | 中高 | 单源 = `rawArguments`；`tc.args` **零使用**（门禁扫描 + 反证「第二解析面 ⇒ 必红」） |
| **R-NDA-913（新增）** 回调内续呼使**一轮实际发生两次 provider 调用**，被误读为「主链新增网络」 | 中 | 中 | `NFR-NDA-015` 明示「提醒轮是**唯一允许的有界新增往返（恰 1）**」；`recommendation-sources` ④ 文案/判据在 tasks 阶段按此口径登记（不放松「`recommend.ts` 零 `fetch(`」） |
| **R-NDA-914（新增）** 新 provider `llm.abnormal` 让 `driver-quadruple` / `next-registry` 的「恰 12」判据静默放宽 | 中 | 中高 | 12→13 **显式重锚**（逐项同集 + 注入「13 行含幽灵」⇒ 必红）；台账留痕 |
| **R-NDA-915（新增）** `abnormal` 事实在 SW 判定、面板消费之间**双判**（两处分类） | 中 | 中高 | 判定**单源 = SW**（`next-drive-policy.ts`）；面板**只消费**（`consumeAiNext` 同函数内折叠进 `risk`）；反证「面板写第二判定 ⇒ 必红」 |

---

## 7. 生成的 ADR

| ADR | 标题 | 落点 | 状态 | 主责叶 |
|-----|------|:--:|:--:|:--:|
| **ADR-NDA-001** | `next` 工具产出通道与注册面（schema 单源 + `deriveTools()` 接线 + `parity` 条目） | 父目录 | PROPOSED | 叶1 |
| **ADR-NDA-002** | `hooks.intercept` 捕获、合成 `ToolResult`、流面过滤与同回合多调用合并口径 | 父目录 | PROPOSED | 叶1 |
| **ADR-NDA-003** | 触发无条件与 `ai-led` 独立规则位（`NEXTSTEP_PRIORITY` 恰 4→5 等价重锚 + 密度重锚） | 父目录 | PROPOSED | 叶1 |
| **ADR-NDA-004** | 围栏块通道替换与 `ai-next-candidate` 门禁改写（等价或更强） | 父目录 | PROPOSED | 叶1 |
| **ADR-NDA-005** | `configured` 单源判据与自由输入分相（零新 ctx 字段 / 零第二偏好键） | 父目录 | PROPOSED | 叶2 |
| **ADR-NDA-006** | 提醒补一次：`chat` 回调内续呼 + `nudgeUsed` 有界 + 防环 + 零计数漂移 | 父目录 | PROPOSED | 叶2 |
| **ADR-NDA-007** | LLM 异常判定闭集 + 系统兜底 `llm.abnormal` provider（复用 `op.llm-config`，词表分相） | 父目录 | PROPOSED | 叶2 |
| **ADR-NDA-008** | 体积分列预算与升档预案（A 距档 9,798 B / 2.8× 最坏 / EC-NDA-016 + 作者一行） | 父目录 | PROPOSED | 跨叶 |
| **ADR-NDA-009** | 取代台账 `X-NDA-1~12`、零改基座硬红线与保护段逐段决策 | 父目录 | PROPOSED | 跨叶 |
| **ADR-NDA-101** | 捕获参数面与解析失败口径（`rawArguments` 严格 JSON；`tc.args` 零使用） | 叶1 目录 | PROPOSED | 叶1 |
| **ADR-NDA-102** | `next` 工具调用不上流（events 加法过滤）与 `onToolDone` 语义不动 | 叶1 目录 | PROPOSED | 叶1 |
| **ADR-NDA-201** | 异常事实的承载与传输（`AiNextPayload.abnormal?` 加法字段 + SW 单源判定） | 叶2 目录 | PROPOSED | 叶2 |
| **ADR-NDA-202** | 门禁计数等价重锚的具体数值与首开/保护段处置（含 `driver-quadruple` 12→13） | 叶2 目录 | PROPOSED | 叶2 |

### 7.1 父 spec §8 `PD-NDA-*` 裁决摘要（**本阶段全部裁决，不留悬空**）

| # | 问题 | plan 裁决 | 理由 |
|---|---|---|---|
| **PD-NDA-001** | 首开 AI 化 | **不做**（保持确定性；`PD-ADN-001` 不转正） | 承 DC-NDA-009；首屏可达性是 R8 刚立的地板，AI 往返会直接威胁它（N-NDA-028） |
| **PD-NDA-002** | `description` 精确提示词 / 解析严格度 | `description` 含**三条约束句**（仅回合结束调用一次 / `opId` 必须已注册 / 不执行任何页面操作）+ 「无建议则调用并给空数组」；解析**严格 JSON + 形状筛选**（非对象项丢弃；非法 ⇒ 未产出） | FR-NDA-013 只要求三约束可判；措辞属实现自由度（不设第二判据） |
| **PD-NDA-003** | `label` 净化 / 截断 | **复用** F-36 口径：`assertNoPlaintext([label])` 预筛（`ai-next.ts:126-132`）+ 先扫后截 `AI_NEXT_LABEL_MAX=48`；零新净化器 | NFR-NDA-004 + 零第二净化器（K-8） |
| **PD-NDA-004** | `ref` 字段语义面 | 保持 F-36：接受 `refId` 或规范形 `ref_<n>`，须命中本回合快照且 `refState==='valid'`（`ai-next.ts:94-96`） | 校验链第③道逐字保留（FR-NDA-034） |
| **PD-NDA-005** | 驱动者 id / `evidence` 字段名 | `driverId = 'ai-next'`（**不改**：DQ-1 双向包含 13↔13 的既有键）；`evidence = ['session.aiNext']`（**与 `when` 实读同源**） | 零额外桥接（`DQ-3` 从源文本抽 when-scope 比对，改名会制造无谓台账） |
| **PD-NDA-006** | 规则位精确落点 | **`ai-led` 新规则位**（`NEXTSTEP_PRIORITY` 第二位）+ `ai-next.rule='ai-led'` + `prepend` 保留 | ADR-NDA-003；行为等价 + 语义诚实 |
| **PD-NDA-007** | nudge 通道形态 | **`chat` 回调内续呼**（同回合；零新调用点） | ADR-NDA-006 |
| **PD-NDA-008** | 系统兜底落点 | **新 provider `llm.abnormal`**（复用 `op.llm-config`；文案「配置**新的** LLM（切换 / 重配）」） | ADR-NDA-007；分相干净 |
| **PD-NDA-009** | `recommendation-sources` 白名单是否需新增条目 | **不需要**（`recommend.ts` 零新导入：分相读既有 `risk`；`llm.abnormal` provider 仍在 `providers.ts`） | NFR-NDA-008 真值 7 / 模块 5 不动 |
| **PD-NDA-010** | 围栏块过渡兼容 | **不做**（函数级删除；无开关） | ADR-NDA-004；`EC-NDA-020` 由「必须显式 PD」→「不发生」 |
| **PD-NDA-011** | 同回合多次 `next` 调用合并口径 | **取最后一次**（`candidates` 覆盖式；`≤3` 截断；合并单源） | ADR-NDA-002 §⑤；与 F-36「取最后一个围栏块」同构（行为等价） |

### 7.2 plan 阶段新登记（**承接 COR-NDA-6~15，不改 spec**）

| # | 项 | 处置 |
|---|---|---|
| **PD-NDA-012** | spec FR-NDA-011 的工具 schema `params:{type:'object'}` 与运行时 `AiNextCandidate.params: string` 不一致 | **以运行时为准**（schema `{type:'string'}`）；偏差在 tasks/build 与 `COR-NDA-7` 同处登记；**不改 spec 正文**（plan/spec 并存） |
| **PD-NDA-013** | `pluginExtras` 实际位置 = `test/parity/waivers.json`（非 `baseline-catalog.json`） | 直接按实际位置落地（`COR-NDA-6`）；spec 措辞偏差登记即可 |
| **PD-NDA-014** | `next` 工具调用是否上流（spec 未提） | **不上流**（ADR-NDA-102）；若 author 认为应可见 ⇒ 加法开关 + 台账（不在本轮） |
| **PD-NDA-015** | `next` 工具 `executor` 的语义（spec FR-NDA-014 只说「无执行体」） | `executor` 返回**可读 fail-closed**（`✖ next 只能经 intercept 捕获`）—— `ToolEntry.executor` 是**必填**（`router.ts:67`），且给出「绕缝 ⇒ loud」的防御面（同 `ask-user` 无 responder 先例 `ask-user.ts:65-71`） |

---

## 8. 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建（父统领性技术方案）：§1 前置检查 + **COR-NDA-6~15 十条事实订正 / 偏差登记**（`pluginExtras` 位置 / `params` 同构冲突 / `rawArguments` 保真 / `next` 上流 / 恰 4 成本 / parity 成本 / RCT 零代价 / 体积锚 / 恰 12 成本）+ **两条硬性结论**（零改基座可行；nudge 零新增调用点）+ 架构分析（契约逐面变更 + 组件依赖图 + 2 叶串行复核）+ **7 组方案对比** + 推荐方案（逐条锚定已裁决口径 + 七项口径对齐表）+ 文件影响分析（A/B/C 分列 + 逐叶归属）+ **风险 20 条**（继承 13 + spec 10 归并 + plan 新增 R-NDA-911~915）+ **13 个 ADR**（父 9 + 叶 4）+ `PD-NDA-001~011` 全部裁决 + `PD-NDA-012~015` 新登记。**零运行时验证**；ROADMAP 零 diff；routing.v1 = `local_or_compute → none`。 | 2026-09-27 | SDDU Plan Agent |
