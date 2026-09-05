# 技术计划：specs-tree-web-cli-base-framework（web-cli-base 框架化：CommandRouter 路由下沉 + domain-neutral 能力归属）

> **文档定位**: SDDU 技术方案 — 记录架构设计、方案对比和 ADR，作为 tasks 阶段的输入
> **前置依赖**: spec.md（需求规范，24 FR 五组 RTR/UPL/DLY/REG/IN + 8 NFR + 12 EC + AC-001~012 + 决策 D-001~D-006）+ discovery.md（问题清单 Q-001~Q-012 / 归属 A-B-C 三档 / 风险 R-001~R-006）
> **创建人**: SDDU Plan Agent
> **创建时间**: 2026-09-05
> **版本**: v1.0
> **更新人**: SDDU Plan Agent
> **更新时间**: 2026-09-05
> **更新说明**: 初始创建（基于 discovery/spec 文件:行号实测核实 + spec 决策 D-001~D-006 落到技术方案，全自主执行）

---

## 1. 前置检查

> 启动技术规划前必须验证的前置条件

| 检查项 | 状态 |
|--------|:--:|
| spec.md 存在 | ✅（`.sddu/specs-tree-root/specs-tree-web-cli-base-framework/spec.md`，263 行，24 FR/8 NFR/12 EC/12 AC + D-001~D-006 已闭环） |
| discovery.md 存在 | ✅（288 行，Q-001~Q-012 / A-B-C 档 / R-001~R-006 / O-001~O-006 齐全） |
| 外部 API 文档缓存 | ⚠️ 不适用（纯内部框架重构；llm 依赖 openai/anthropic SDK 为既有依赖，不新增外部服务） |
| 输出模板 | ⚠️ **模板缺失**：用户自定义 `.sddu/templates/agents/output/sddu-plan.md.hbs` 不存在；插件内置 `.opencode/plugins/sddu/templates/output/sddu-plan.md.hbs` **存在**（79 行，8 章骨架）。本 plan 按插件内置模板骨架 + V2 plan（specs-tree-web-cli-v2/plan.md）既有格式衔接 |
| 前置依赖已满足 | ✅（V2 已完成：9 包体系 + base 纯机制化零 lgdl 依赖；作者 4 项裁决 + spec D-001~D-006 已闭环） |

**基线核实说明**：本 plan 全部文件:行号均基于 2026-09-05 对实际源码的只读核实（与 discovery/spec 基线一致，并作如下补充修正，后续 tasks 以实测为准）：
1. **AiPanel 五分支实为「4 分支 + else 兜底」**（AiPanel.tsx:425-489）：op（425）/ web-fetch（440）/ sleep（445-470）/ web-cli-help（471-479）/ else → executeSubcommand（480-489，`executeSubcommand` 深导入自 `@lgdl/lgdl-web-cli/lgdl`，AiPanel.tsx:5）；else 分支含 onApply 编辑器写回（:484-485）+ changed/source 维护（:483-486）；
2. **App.tsx op handler 实测 19 个注册**（App.tsx:988-1117）：16 个「OP_COMMANDS 语义 handler」+ `export` 别名（:1016）+ `list-diagram-types`（:1105）+ `next-actions` 防御兜底（:1110）——与 spec「16 handler」口径差异来自别名/防御面，不影响设计（16 语义分支 = OP_SUBCOMMANDS 内除 help 的子命令面）；
3. **toolCallToCommand 实测为「工具名即前缀」规则**（AiPanel.tsx:154-170）：prefix = tc.name 三目映射，default 兜底 'lgdl-web-cli'（:164）；无独立「lgdl-web-cli 前缀常量」——故注册条目 prefix 默认 = tool.name 即可覆盖 5 工具；
4. **sleep 的 fc 入口与文本入口语义分离**：AiPanel:445-470 是 fc 专用逻辑（ms/seconds 归一 + 缺参友好文案 + clamp 由 parseSleepCommand sleep.ts:46 承担），**不经 parseSleepCommand 全文解析仍调用了 parseSleepCommand(`sleep --ms ${argMs}`)（:458）**——重构后此归一+友好文案逻辑应内聚到 sleep 工具执行器，删除 :458 文本重建-重解析间接层（FR-009）；
5. **help-aggregator 现状仅 2 个消费面**：base 自注册 web-fetch/sleep（help-aggregator.ts:42-43）+ 场景注册 lgdl-web-cli/lgdl-web-op-cli（lgdl-web/ai/help-aggregator.ts:13-14）；`grep` 全仓无其他 HelpAggregator 消费方——注册表 help 派生取代后整个模块可删（FR-010）；
6. **provider.chat 的 tools 组装 = buildTools()**（provider.ts:282-297）；testConnection（:224-239）与 AI 会话共用该 chat——重构后需保留 testConnection 的 chat 调用（tools 可空）；
7. **base 当前 src 测试 4 文件**：llm.test.ts / protocol.test.ts / sleep.test.ts / web-fetch.test.ts（test 脚本 = `tsc src/*.test.ts` 通配，web-cli-base/package.json:16）；lgdl-web test 脚本为显式文件列表（lgdl-web/package.json:11：locate/snap/provider/lgdl-web）——删除 lgdl-web.test.ts 后需同步重列。

---

## 2. 架构分析

> 分析现有架构影响和需要的新组件

### 2.1 现状：bash 缺层与四处重复（实测证据）

| bash 分层 | web-cli-base 现状 | 缺层证据（文件:行号） |
|-----------|------------------|---------------------|
| shell 路由（命令名 → 执行器） | ❌ 工具分发在 lgdl-web 视图层手写 | AiPanel.tsx:425-489 `tc.name` if/else（op/fetch/sleep/help/else） |
| 路由知识单一数据源 | ❌ 同名工具名集合 ≥4 处维护 | schema 数组 provider.ts:247-275（buildTools）；前缀映射 AiPanel.tsx:154-170；分发 if/else AiPanel.tsx:425-489；help 聚合 lgdl-web/ai/help-aggregator.ts:11-15 |
| 内建命令自动注册 | ❌ 手工登记 | web-fetch/sleep schema 靠 buildTools 静态列（provider.ts:260-273）、执行靠 AiPanel 分支（:440-470）、help 靠 createHelpAggregator 预注册（help-aggregator.ts:42-43） |
| 可注册业务命令 | ⚠️ 碎片化 | lgdl-web-cli 走 DomainApi+createExecutor（adapters/lgdl.ts:106-110）；op-cli 走 OpHandlerRegistry（handlers.ts:19-38）；双顶层「半路由」并存 |
| 装即自足 | ❌ 中性接线滞留 lgdl-web | agent 循环（AiPanel.tsx:383-524）、schema 组装（provider.ts:247-275）、help 场景聚合（lgdl-web/ai/help-aggregator.ts）、前缀映射（AiPanel.tsx:154-170）均为 domain-neutral |
| 隐式时序（全局 delay） | ❌ 仅显式 sleep | sleep 是唯一时序工具（sleep.ts:56-60）；时序责任在模型（tools.ts:59 示例 + prompts.ts:49-53） |
| 未知命令行为 | ⚠️ 静默兜底 | toolCallToCommand default（AiPanel.tsx:164）与分发 else（:480）都静默按 lgdl-web-cli 执行 |

**base 已具备的机制层（本 Feature 保留）**：commands.ts（CommandSpec/requireParams 机制壳）、operations.ts（createOperationApplier 泛型）、exec.ts（createExecutor 泛型管线 + DomainApi 注入）、protocol.ts（tokenizeCli/parseArgs/createBatchParser）、llm.ts（chat/parseToolArguments/ChatResult 单列表契约——注释明示「消费方按名分发」llm.ts:26）、help.ts（HelpArg/HelpEntry + webFetchHelp/webSleepHelp）、web-fetch.ts/sleep.ts、tools.ts（3 内建 schema）。**本 Feature 在机制层之上补「shell 层」**。

### 2.2 目标架构分层（bash 类比投影）

```
┌─────────────────────────────────────────────────────────────┐
│  lgdl-web（场景壳：LGDL 特有 + React UI）                     │
│    AiPanel（渲染/消息流/预设/guideDoc）→ 单一组装点 session.ts │
│    App.tsx（16 handler React 回调注入 op 工具执行器）          │
│    prompts.ts / PRESET / provider 应用态（C 档不动）           │
├─────────────────────────────────────────────────────────────┤
│  lgdl-web-cli / lgdl-web-op-cli（业务工具，注册注入）           │
│    ToolEntry 构建（schema + 执行器 + help 渲染入口 + summary） │
│    领域内容（命令族/OP_COMMANDS/exec 管线/文案）C 档不动        │
├─────────────────────────────────────────────────────────────┤
│  web-cli-base（完整自足 AI-CLI 环境 = shell + 内建 + 注册）    │
│    CommandRouter（注册表/派生/dispatch/delay gate）★ NEW      │
│    DelayGate + Clock（路由层命令间最小间隔）★ NEW             │
│    AgentRunner（中性 AI-tool-workflow 循环）★ NEW             │
│    内建工具自动注册：web-fetch / sleep / web-cli-help          │
│    既有机制：exec/commands/operations/protocol/llm/help/…     │
└─────────────────────────────────────────────────────────────┘
依赖方向（单向无环，NFR-002）：lgdl-web → {lgdl-web-cli, lgdl-web-op-cli, web-cli-base}
                                  lgdl-web-cli → web-cli-base（+lgdl-core 类型）
                                  lgdl-web-op-cli → web-cli-base（类型）
                                  base 零业务依赖（NFR-001）
```

### 2.3 CommandRouter 契约设计（RTR 组，FR-001~FR-005）

#### 2.3.1 注册条目（单一数据源，FR-001/NFR-004）

一个工具的全部路由知识只存在于一处注册条目：

```ts
// web-cli-base/src/router.ts
export interface ToolEntry {
  /** 工具名（= schema function.name，路由键；5 工具名保持现状 A-001/NG-006） */
  name: string;
  /** 一句话用途（help 一览 summary；缺省取 schema description 首句） */
  summary?: string;
  /** function-calling schema（name+description+parameters 完整函数定义） */
  schema: ToolFunctionDef;
  /** 文本命令前缀；缺省 = name（现 5 工具 name===前缀，AiPanel:154-170 规则覆盖） */
  prefix?: string;
  /** 执行器：{subcommand,args} → ToolResult（异步允许） */
  executor: ToolExecutor;
  /** help 详情渲染（web-cli-help <tool>）；缺省 = 仅一览 */
  help?: () => string;
  /** delay 覆盖声明（FR-016）：缺省继承全局；0 = 该工具免除命令间间隔 */
  delayMs?: number;
  /** 是否出现在 web-cli-help 一览/查询（缺省 true；web-cli-help 自身 false，保持旧一览 4 工具语义） */
  listed?: boolean;
}

/** 统一分发执行契约（FR-002）——对 {tool, args}，不绑 React */
export interface ToolResult {
  ok: boolean;
  /** 输出文本（AI 反馈 + 回填 turns 的唯一文本源） */
  output: string;
  /** 文档变更标记 + 变更后文档（仅文档变更类工具；场景侧决定如何应用自身状态） */
  changed?: boolean;
  source?: string;
  /** 失败原因（!ok 时存在；供调试/日志，进 output 与否由执行器决定） */
  error?: string;
}
export interface ToolContext { docId?: string; source?: string; [k: string]: unknown; }
export type ToolExecutor = (tc: ToolCallArgs, ctx: ToolContext) => ToolResult | Promise<ToolResult>;
export interface ToolCallArgs { subcommand: string; args: Record<string, string>; }
```

#### 2.3.2 CommandRouter 接口

```ts
export interface RouterOptions {
  /** 全局命令间最小间隔 ms；默认 0（关闭）；非法值（<0 或 >5000）钳制 + 一次警告（EC-009，plan 裁决：钳制并警告） */
  delayMs?: number;
  /** 时钟注入（FR-017 观测/测试）；默认真实时钟 */
  clock?: Clock;
  /** 内建自动注册（FR-020）：默认 ['web-fetch','sleep','web-cli-help'] */
  builtins?: boolean | BuiltinName[];
  /** delay 生效观测钩子（可选；每笔补齐等待回调一次） */
  onDelay?: (waitedMs: number, tool: string) => void;
}
export class CommandRouter {
  register(entry: ToolEntry): this;                 // 重复同名 → 抛错（EC-003）
  has(name: string): boolean;
  names(): string[];                                // [业务工具(注册序), 内建(固定序)]
  deriveTools(): LlmToolDef[];                      // schema 派生（FR-004/FR-008，含顺序契约 FR-005）
  deriveCommand(tc: WebCliToolCall): string | null; // 前缀派生（FR-007）；未知名 → null
  listHelp(): string;                               // web-cli-help 一览（注册即得，FR-010）
  helpFor(name: string): string | null;             // 详情；未知/未列 → null（EC-010 语义）
  dispatch(tc: WebCliToolCall, ctx?: ToolContext): Promise<ToolResult>; // 统一分发入口（FR-002/FR-003）
  get stats(): { waitCount: number; waitedMs: number };  // delay 观测（FR-017）
}
```

#### 2.3.3 dispatch 语义（FR-002/FR-003/EC-001/EC-012）

1. **未注册名** → `{ ok:false, output:'✖ 未注册工具 "x"', error:'unregistered tool' }`，工具名不落入任何执行器（FR-003；删除 AiPanel:164/:481 隐性默认路由）；错误作为 tool 结果正常回填 AI，会话不中断（EC-001）；
2. **已注册名** → delay gate 等待（§2.4）→ 执行器 → 统一结果形态；
3. **执行器抛异常**（非返回 ok:false）→ router 捕获转 `{ ok:false, output:'✖ 工具 "x" 执行异常', error:message }`（EC-012，稳定文案防炸整个 agent 循环；异常明细只进 error 字段/日志面，不进 AI 结果文本）；
4. **执行器级错误**（子命令/参数非法）→ 由执行器返回 ok:false + 描述性错误，router 不做业务级校验猜测（EC-002）。

#### 2.3.4 schema/help/前缀派生与顺序契约（FR-004/FR-005/FR-007/FR-010）

- **deriveTools() 顺序 = [业务工具（注册序）] + [内建工具（固定 web-fetch → sleep → web-cli-help 置末）]**——保留现 buildTools 顺序契约与 tool_choice 优先序观察（provider.ts:241-246 注释 + provider.test.ts:191 断言等价承接）；新实例化 router 自动注册内建（FR-020），业务工具随后 register 追加到业务段；
- **help 一览 = 注册即得**：listHelp() 遍历 listed=true 条目输出「可用工具（N 个）：…」+ 中性 tip（FR-012：tip 去 `lgdl-web-cli` 示例）；helpFor(name) 输出 `name —— summary` + 详情渲染；web-cli-help 工具条目 listed=false 保持「不自列、自查返回未知」的旧语义（与 createWebCliHelpAggregator 现状一致，FR-024 一览 4 工具不变）；一览顺序 = 旧聚合器序（内建先、业务后）以贴近旧文本（§2.7 派生一致性说明）；
- **前缀派生 deriveCommand(tc)**：`${prefix} ${subcommand}`（无 subcommand 仅 prefix）+ 逐 args `--${k} ${/[\s"]/.test(v) ? `"${v}"` : v}`（引号规则逐字节复制 AiPanel.tsx:165-168）；未知名返回 null（runner 显示 dispatch 错误文本，无 lgdl-web-cli 兜底 FR-007）。

### 2.4 全局 delay 机制设计（DLY 组，FR-013~FR-017）

#### 2.4.1 DelayGate 挂点与语义

```
router.dispatch()
  ├─ 查条目（未注册 → 直接返回 EC-001 错误，不等待）
  ├─ effDelay = entry.delayMs ?? routerOptions.delayMs   // 单工具覆盖/免除（FR-016）
  ├─ effDelay > 0 → delayGate.before(effDelay)：距上一命令完成时刻 < effDelay → 等待补齐（首个分发 lastCompletion=null 不等待）
  ├─ 执行器执行
  └─ delayGate.after()：记录完成时刻 = clock.now()
```

- **挂点 = CommandRouter 统一分发入口**（FR-013）：机制代码只存在于路由层；跨所有已注册工具生效（含未来新注册工具自动获得）；不提供执行器级自行等待旁路（无业务包内 setTimeout，FR-013 grep 断言）；
- **语义 = 命令间最小间隔**（FR-014）：间隔起点 = 上一命令**完成时刻**；首个分发不等待；
- **与显式 sleep 不叠加的实现机制（本 plan 关键决策，见 ADR-003）**：**sleep 工具注册条目声明 `delayMs: 0`（免除前置等待）**，sleep 自身的执行时长即为间隔；其完成时刻进入 gate 记录。推导：
  - `… → sleep(3000) → …`：sleep 免除前置补齐，完成后 lastCompletion 已 +3000ms ≥ 600ms → 后续命令不追加等待（EC-005「总等待 3000 不追加」✓）；
  - `… → sleep(200) → …`：sleep 执行 200ms 完成后，下一命令距完成时刻 200 < 600 → 补齐 400ms（EC-005「补齐至 600」✓，补齐发生在下一命令前）；
  - 首个分发（fresh router 的第一次 dispatch）不等待；连续两普通命令间隔 = max(delayMs, 执行耗时)。
- **base 中性默认 delayMs=0**（FR-015/NFR-006）：未配置时分发路径零额外开销（gate 短路）；**lgdl-web 场景组装 router 时声明 600ms**、上限钳制 5000ms；
- **非法配置（EC-009）**：`<0` 或 `>5000` → 钳制到 [0,5000] + 记录一次警告（router.warnings），不静默产生意外长等待；
- **观测（FR-017）**：delay 静默生效（不注入 tool 结果文本、不产生额外消息）；提供 stats（waitCount/waitedMs）+ onDelay 钩子 + 时钟注入供测试/调试。

#### 2.4.2 Clock 契约

```ts
// web-cli-base/src/delay.ts
export interface Clock {
  now(): number;                                   // 时间源（真实 = Date.now）
  sleep(ms: number): Promise<void>;                // 等待原语（真实 = setTimeout；测试 = 记账零等待）
}
```

测试经 fake clock（同步记账 + 手动推进）验证 FR-014/EC-005 的等待行为，无需真实耗时（AC-005）。

### 2.5 AgentRunner 设计（UPL/FR-006 + D-003 边界）

#### 2.5.1 上收内容与边界

上收 AiPanel.tsx:383-524 中 domain-neutral 逻辑：turns 序列维护 / MAX_ROUNDS 轮次上限与超限处理（:384-388）/ 单 assistant 消息多 toolCalls 逐条执行（:421-493）/ tool 结果按 toolCallId 回填（:492）/ 失败聚合与中止语义（:494-498）/ LLM 调用错误重试一次、连续失败停止（:511-523）/ 可停止。**不上收**（D-003）：React 消息渲染（web-cli 命令块/next-actions 胶囊/tool 结果渲染）、LGDL 回调（onApply 编辑器写回/onWebOp 与 16 handler/next-actions 拦截交互）、场景内容（LGDL_SYSTEM_PROMPT/guideDoc/PRESET）、pending/设置等 UI 状态。

#### 2.5.2 Runner 形态（纯逻辑 + 事件/回调；零 react import NFR-008）

```ts
// web-cli-base/src/runner.ts
export interface AgentRunnerOptions {
  /** 系统提示（场景组装：LGDL_SYSTEM_PROMPT + guideDoc；AiPanel:393-399 语义等价） */
  system: () => string | Promise<string>;
  /** LLM 调用（场景绑定 settings + router.deriveTools() schema 供给） */
  chat: (turns: ChatTurn[], system: string) => Promise<ChatResult>;
  /** 工具执行（场景绑定 router.dispatch + ctx 组装；runner 不直接依赖 router 类型） */
  dispatch: (tc: WebCliToolCall) => Promise<ToolResult>;
  /** 场景注入的 LGDL 特有处理点（next-actions 拦截/onApply 写回等；D-003/FR-006） */
  hooks?: {
    /** dispatch 前拦截：返回 ToolResult 则跳过 dispatch（next-actions 胶囊由此接入） */
    intercept?: (tc: WebCliToolCall, commandText: string) => ToolResult | null | Promise<ToolResult | null>;
    /** 工具完成（含 changed/source）：场景据此 onApply 写回 + source 状态推进 */
    onToolDone?: (tc: WebCliToolCall, result: ToolResult) => void | Promise<void>;
  };
  /** 增量事件（场景驱动渲染；消息流与现 AiPanel 等价 FR-024） */
  events?: {
    onAssistantText?: (text: string) => void;                 // → appendMessage('assistant', text)
    onCommandLine?: (text: string) => void;                   // → appendMessage('assistant', text, 'web-cli')
    onToolOutput?: (text: string) => void;                    // → appendMessage('tool', text)
    onRoundLimit?: (maxRounds: number) => void;               // → 超限提示（场景可自定义文案/默认）
    onEmptyReply?: () => void;                                // → 空内容提示
    onLLMError?: (message: string, willRetry: boolean) => void;
    onFailAggregate?: () => void;                             // 失败聚合提示（runner 内部仍 push 纠正 user turn）
    onFinish?: (outcome: RunOutcome) => void;                 // → setPending(false)
  };
  maxRounds?: number;   // 默认 1000（settings.maxRounds 传入）
}
export interface AgentRun {
  run(): Promise<RunOutcome>;   // 'completed' | 'max-rounds' | 'stopped' | 'llm-failed' | 'empty'
  stop(): void;                 // 置中止标记：当前工具完成后退出（可停止 FR-006）
}
```

#### 2.5.3 runner 循环语义（与 AiPanel 现行为逐点对应）

| AiPanel 现状（文件:行号） | runner 语义 | 场景渲染承接 |
|---|---|---|
| turns 初始化 `[{user,message}]`（:375-377）+ system 每轮组装（:398-399） | runner 内部维护 turns；chat(system, turns) | — |
| MAX_ROUNDS 超限提示（:384-388） | round > maxRounds → onRoundLimit + stop | appendMessage assistant 提示 + setPending(false) |
| assistant reply 文本消息（:408-410/:504-506） | 有 reply → onAssistantText + push assistant turn | appendMessage assistant |
| toolCallToCommand + web-cli 命令消息（:422-423） | 每条 tc → deriveCommand → onCommandLine（null 时显示原始名） | appendMessage web-cli |
| 空 reply 且无 toolCalls 提示（:507-509） | onEmptyReply + outcome 'empty' | appendMessage 默认提示 |
| 多 toolCalls 逐条分发 + 结果回填（:413-493） | 逐条 dispatch（hooks.intercept 先查）→ onToolDone → onToolOutput → turns push tool(toolCallId) | appendMessage tool |
| lgdl-web-cli changed → onApply + source 推进（:483-486） | dispatch 返回 changed/source → hooks.onToolDone（场景 onApply + 维护 ctx.source） | App applyAiSource |
| op next-actions → 胶囊卡片（:426-435） | hooks.intercept 拦截 lgdl-web-op-cli/next-actions → 解析胶囊 → 返回合成 ToolResult | appendMessage next-actions |
| 失败聚合（:494-498） | 任一 tc 失败 → failed=true；全部结果回填后 push 纠正 user turn + onFailAggregate | appendMessage 失败提示 |
| LLM 错误重试一次（:511-523） | catch → 连续失败 ≥2 → 停止；否则 push 错误 user turn + 重试 | onLLMError |
| sleep/web-fetch/help 特判（:440-479） | 全部消除——统一走 dispatch（sleep/help 为内建工具、fetch 为内建工具） | — |

### 2.6 注册收敛设计（REG 组，FR-018~FR-021 + IN 组 FR-022/023）

#### 2.6.1 内建命令自动注册（FR-020）

`createCommandRouter()` 构造时自动注册 3 内建工具：web-fetch / sleep / web-cli-help，每个条目一次登记 → schema + 文本前缀 + 执行 + help 四得：
- **web-fetch**：schema=WEB_FETCH_TOOL，executor = fc 直调 `executeWebFetch(args.path ?? '')`（缺 path 友好错误已在 executeWebFetch:62-65），help=webFetchHelp；
- **sleep**：schema=SLEEP_TOOL，executor = sleep.ts 新增 `executeSleepFromArgs(args)`（ms/seconds 归一 + 缺参友好文案（等价 AiPanel:455 语义）+ clamp 10 分钟（sleep.ts:46 保留）），help=webSleepHelp，**delayMs: 0（§2.4.1/ADR-003）**；
- **web-cli-help**：schema=WEB_CLI_HELP_TOOL，executor = 闭包绑定 router（listHelp()/helpFor(name)），help=自身说明，**listed: false（旧一览语义）**。

替代三处手工登记：provider.buildTools 静态列（provider.ts:247-275）、AiPanel 特判分支（:440-479）、createHelpAggregator 预注册（help-aggregator.ts:42-43）。

#### 2.6.2 lgdl-web-cli 整体注册（FR-018，D-001）

业务包新增工具条目构建函数（schema=WEB_CLI_TOOL 逐字节 / executor 内部走既有 createExecutor 管线 / help=webCliHelp / summary 中性描述）：

```ts
// packages/lgdl-web-cli/src/tool-entry.ts
export function createLgdlWebCliTool(): ToolEntry;
// executor 实现（ctx.source 由场景每 dispatch 提供当前源码；changed/source 原样返回给 runner 事件面）：
//   const exec = await lgdlExecutor.executeSubcommand(ctx.source ?? '', tc.subcommand, tc.args, ctx.docId);
//   return { ok: exec.ok, output: exec.lines.join('\n') || '(无输出)', changed: exec.changed, source: exec.source, error: exec.error };
```

- 17 子命令 / 9 增量命令 / exec 命令族语义（C 档）**零改动**：lgdlDomain 19 符号组装（adapters/lgdl.ts:65-85）+ createExecutor 管线（exec.ts:135-308）作为该工具执行器内部机制保留，**不做全泛化**（NG-002）；
- 消费方不再深导出 lgdlExecutor（AiPanel.tsx:5）或 else 兜底接入（:480-489）——经 router 统一注册/分发；
- 文本协议路径 executeCommands/describeCommandLine（adapters/lgdl.ts:114-115）：现无 UI 消费方（仅 lgdl-web.ts/lgdl-web.test.ts + 包内测试），随 lgdl-web.ts 收敛后仅测试消费，作为 lgdl-web-cli 工具内部能力保留（spec 后置开放 3 的核验结论）。

#### 2.6.3 lgdl-web-op-cli 注册接入（FR-019，D-004）

业务包新增工具条目构建函数：

```ts
// packages/lgdl-web-op-cli/src/tool-entry.ts
export function createOpCliToolEntry(registry: OpHandlerRegistry): ToolEntry;
// schema=WEB_OP_TOOL（enum 已由 OP_SUBCOMMANDS 派生 ops.ts:87-90）；prefix 'lgdl-web-op-cli'；help=webOpHelp
// executor：const r = registry.execute(tc.subcommand, tc.args); return { ok: r.ok, output: r.output, error: r.ok ? undefined : r.output };
```

- **顶层 OpHandlerRegistry 的「工具级注册/分发」角色被 CommandRouter 承接**：AiPanel 不再直连 opRegistry.execute（handlers.ts:33-37）——App.tsx:986-1119 的 19 个 handler 注册保留为「该工具执行器的内部机制」：App 组装 registry → `createOpCliToolEntry(reg)` → session 注册进 router；App.tsx:1121-1124 handleWebOp 转发函数与 AiPanel onWebOp prop 删除；
- OP_COMMANDS/OP_SUBCOMMANDS 元数据（ops.ts）是 op-cli 内容（C 档）不动；其派生 schema 经注册条目进入 router 派生数组（Q-009 收敛）；next-actions 拦截保留为场景交互（runner hooks.intercept，§2.5.2）；
- op-cli 包 API 面变化（OpHandlerRegistry 顶层消费角色移交）按 D-3 接受，记入迁移面。

#### 2.6.4 唯一工具名集合（FR-021/NFR-004）

5 工具名（A-001）除注册条目外无第二维护处：schema/文本前缀/help/分发/顺序全部自注册表派生。**删除面 grep 断言（NFR-003）**：lgdl-web 无硬编码工具名分发 if/else、无 toolCallToCommand 手写前缀映射、无 buildTools 手写 schema 数组、无场景 help 手写注册、无 opRegistry 直连。改动一个工具名 = 注册条目 + 需要时场景文案联动（本 Feature 不改名，仅机制就位）。

### 2.7 lgdl-web 场景收敛与派生一致性（IN 组，FR-022~FR-024）

#### 2.7.1 单一组装点 session.ts（FR-022）

```ts
// packages/lgdl-web/src/ai/session.ts —— 唯一 CommandRouter 实例持有处
export interface AiSessionDeps {
  docId: string;
  getSource(): string;                       // App source state
  onApply(source: string): void;             // App applyAiSource（编辑器写回）
  opRegistry: OpHandlerRegistry;             // App 16 handler 组装
  settings: () => ProviderSettings;          // provider 应用态（NG-004 留 lgdl-web）
}
export interface AiSession {
  router: CommandRouter;                     // base 内建自动注册 + 2 业务工具注册；delayMs=600（FR-015）
  runAgent(msgs: { user: string } & opts): AgentRun;  // runner 装配（dispatch=router 绑定 + ctx 每调用取 getSource）
}
export function createAiSession(deps): AiSession;
```

- 组装点 = base 内建自动注册（FR-020）+ lgdl-web-cli/lgdl-web-op-cli 注册（FR-018/019）+ LGDL 特有回调注入（onApply/16 handler/next-actions 拦截经 runner hooks）+ 全局 delay 600ms 开启（FR-015）；
- chat 的 tool schema 供给 = `router.deriveTools()`（FR-008）；chat 调用 = runner 内 chatFn → provider.chat(settings, turns, router.deriveTools())；
- App.tsx 持有 session（useMemo），AiPanel 收 session/runner 相关 prop（onWebOp prop 删除）；单一组装点可指认（AC-007）。

#### 2.7.2 AiPanel 分发/特判面删除（FR-023）

删除面：toolCallToCommand（AiPanel.tsx:154-170）→ runner 内经 router.deriveCommand；tc.name 五分支 if/else（:421-489）→ runner 循环 + router.dispatch；sleep 特判（:445-470）→ sleep 内建工具；web-cli-help 每次新建聚合器（:471-479）→ router 内建工具；lgdl-web/ai/help-aggregator.ts（场景 help 注册面）→ 删除。**保留面**：LGDL 特有渲染（web-cli 命令块 / next-actions 胶囊卡片 / tool 结果 pre / markdown / 消息流）、guideDoc 自动加载与 system 注入（:297-310/:391-395，D-006 场景引导承担）、PRESET_PROMPTS、pending 状态。

#### 2.7.3 死接线收敛（FR-011）

- **lgdl-web/src/ai/lgdl-web.ts 删除**（仅测试消费 + 陈旧注释 :6/:39「AiPanel 经 './lgdl-web' 消费」与实际 :5 深导出不符）；其 fetch 行处理器职责归属：function-calling 架构下 web-fetch 是独立内建工具，文本管线（executeCommands）无 UI 消费方——handleFetchLine/describeFetchLine 注入点在 lgdl-web 场景不再需要；exec.ts 的 handleLine 扩展点（exec.ts:326-335）作为 base 中性机制保留（未来文本管线场景可复用），仅移除 lgdl-web 侧注入组装；
- **lgdl-web.test.ts 的 2 例 fetch 行路由测试**（:20-33）迁移为「web-fetch 经 router dispatch」用例（session/router 面，行为等价：fetch 成功/缺 path 错误）；
- 残留 import/注释清理（NFR-003 grep）。

#### 2.7.4 base 文案中性化（FR-012，D-006）+ help 派生一致性

- tools.ts:27/:38 web-fetch description/示例路径 `lgdl/web/workbench/README-CLI.md` → 中性示例（如 `guide.md` / `https://example.com/doc.md`）；help.ts:34 webFetchHelp 示例同步；help-aggregator.ts:28 tip（`web-cli-help lgdl-web-cli`）随 help-aggregator.ts 删除而消失，router.listHelp() 输出中性 tip（`web-cli-help <tool>`）——`grep` base 无 lgdl/LGDL/README-CLI 残留（AC-012）；
- **lgdl-web 场景引导不回归**：guideDoc 由 AiPanel 会话开始系统自动注入（:297-310/:391-395）+ prompts.ts 已明示「使用指南已自动加载（无需 fetch）」（prompts.ts:21-25）——README 提示能力不依赖 base 描述里的 LGDL 路径（D-006/AC-012 核验点）；
- **help 一览文本近似保留**：router.listHelp() 输出与旧聚合器（createHelpAggregator 一览）对齐——内建（web-fetch/sleep）在前、业务（lgdl-web-cli/lgdl-web-op-cli）在后、标题/tip 文本与现 help-aggregator.ts:23-30 语义一致（仅 tip 中性化，属 FR-012 声明改进面）；schema 派生顺序（§2.3.4）与 help 一览顺序是两个独立契约（schema=业务先内建后 AC-006；一览=贴近旧文本 FR-024），互不冲突。

### 2.8 数据流变更图

```
【重构前】                                            【重构后】
AiPanel send()                                      AiPanel send()
  ├ agent 循环(turns/MAX_ROUNDS/失败聚合)              │  └─ session.runAgent() ──▶ web-cli-base AgentRunner
  ├ toolCallToCommand(手写前缀, default 兜底)            │        ├ system（场景组装 LGDL_SYSTEM_PROMPT+guideDoc）
  └ tc.name 5 分支 if/else:                             │        ├ chatFn → provider.chat(settings, turns,
       ├ op → App.opRegistry.execute ← App 16 handler   │        │                router.deriveTools())
       ├ fetch → executeWebFetch                         │        ├ dispatch → CommandRouter.dispatch({tool,args})
       ├ sleep → 特判 归一→parseSleepCommand             │        │     ├ delay gate（场景 600ms；sleep 免除）
       ├ help → 每次新建场景聚合器                        │        │     ├ web-fetch/sleep/web-cli-help 内建条目
       └ else → lgdlExecutor.executeSubcommand(+onApply) │        │     ├ lgdl-web-cli 条目 → lgdlExecutor 管线
  （路由知识 4 处：provider.buildTools / 前缀映射 /        │        │     └ lgdl-web-op-cli 条目 → App 16 handler 注入
    分发 if/else / help 聚合注册）                        │        ├ hooks.intercept → next-actions 胶囊（场景）
                                                       │        └ events → appendMessage（渲染留 lgdl-web）
                                                       └── 注册表单一数据源（唯一工具名集合，四处删除）
```

---

## 3. 方案对比

> 两个对比主题（spec 决策已锁宏观归属，plan 对比剩余的技术形态决策）

### 3.1 对比主题一：CommandRouter 注册模型形态

| 维度 | 方案 A：条目对象 + register 方法（推荐） | 方案 B：纯函数注册链（builder DSL） | 方案 C：表格/声明式配置数组 + 内部索引 |
|------|:--|:--|:--|
| 描述 | `ToolEntry` 普通对象（schema/executor/help/prefix/delayMs 字段）+ `router.register(entry)`；router 内部 Map + 有序数组 | `router.tool(name).schema(x).executor(y).register()` 链式 API | 场景一次性传 `ToolEntry[]` 数组，router 构造时建索引 |
| 优点 | 数据结构即契约（NFR-004 单一数据源最直接表达）；与现有 WEB_*_TOOL 对象形状一致可零拷贝组装；测试/断言友好；F-14 协议发现可序列化单条目 | 调用面紧凑 | 声明集中、顺序天然由数组承载 |
| 缺点 | 无（与 bash「命令注册」心智一致） | 链式 API 增加学习成本且中间态可误用；schema/executor 分离度低 | 动态增删（未来插件注册）需重建索引；EC-003 重复名检查散落 |
| 风险 | 低 | 中（过度设计） | 中（lgdl-web 单实例下无感，但 F-14 动态注册场景受限） |
| 工作量 | ≈0.5 人日 | ≈0.8 人日 | ≈0.4 人日 |

**推荐 A**：条目对象 + register。理由：① 单一注册条目 = FR-001 验收「一个工具全部路由知识只在一处」的最直接数据结构；② 与既存 schema 常量（WEB_CLI_TOOL/WEB_OP_TOOL/3 内建）形状同构，工具条目组装零改写；③ 注册顺序天然由 register 调用序承载（FR-005）；④ 面向 F-14（NG-008 标注关联）时条目可序列化，是协议发现的雏形。

### 3.2 对比主题二：agent runner 的场景交互形态（D-003 已定边界，形态待定）

| 维度 | 方案 A：事件 + 拦截/完成 hooks（推荐） | 方案 B：纯状态机 + 外部轮询 | 方案 C：渲染回调注入（render props 化） |
|------|:--|:--|:--|
| 描述 | runner 内部闭环，经 events（onAssistantText/onCommandLine/onToolOutput/…）+ hooks（intercept/onToolDone）暴露增量点 | runner 只推进状态机，场景每步轮询 state 自行驱动 | runner 把渲染决策函数作为参数，场景传入 React 渲染器 |
| 优点 | 消息流/渲染决策权在场景（FR-023 渲染留 lgdl-web）；LGDL 回调经 hooks 精确接入（D-003）；与现有 appendMessage 事件语义 1:1 | 无回调嵌套、最纯粹 | 渲染代码留在场景且调用直白 |
| 缺点 | 回调集需精确设计（漏一个事件则渲染缺消息） | 场景需自建循环/时序（把 agent 循环又搬回场景，违背 D-003 上收本意） | runner 需感知「消息类型」（chat/web-cli/tool/next-actions），把渲染知识吸进 base（违背中性） |
| 风险 | 低（事件与 AiPanel 消息类型一一对应可验证 FR-024） | 高（循环逻辑仍沉场景） | 中（渲染类型知识泄漏进 base） |
| 工作量 | ≈1 人日 | ≈1.2 人日 | ≈0.9 人日 |

**推荐 A**：事件 + hooks。理由：① 消息流「等价」验证（FR-024/AC-008）要求场景能逐条复现现 appendMessage 序列——事件集与消息类型（chat/web-cli/tool/next-actions）一一对应，可直接 diff 断言；② next-actions 拦截（场景 UI 交互）与 onApply 写回（编辑器状态）经 hooks 接入，base 完全不知胶囊/编辑器为何物（D-003/NFR-001）；③ 纯逻辑 + 事件形态天然无 react import（NFR-008）。

### 3.3 对比主题三：delay 与显式 sleep 不叠加的实现机制

| 维度 | 方案 A：sleep 注册条目 delayMs=0 免除（推荐） | 方案 B：gate 特判 sleep 跳过 | 方案 C：sleep 不特殊处理（gate 对 sleep 也补齐前置） |
|------|:--|:--|:--|
| 描述 | sleep 作为内建工具注册时声明 delayMs:0（FR-016 免除通道的自然复用）；其完成时刻照常进入 gate 记录 | gate 内部 `if (tool==='sleep') skip` 硬编码特判 | sleep 走普通 dispatch 前置补齐逻辑 |
| 优点 | 复用通用免除机制（FR-016），gate 零特判、零领域知识；语义自洽：sleep 自带显式时长即间隔来源（bash 类比：sleep 是外部命令） | 逻辑直白 | gate 实现最简单 |
| 缺点 | sleep 条目需注释说明「免除原因 = 显式时序原语」 | gate 认识具体工具名（中性层吸收领域知识，违背 NFR-001/FR-013 纯机制）；未来新时序工具无法复用 | EC-005 违背：`sleep(3000)` 会被前置补齐 600ms → 总等待 3600ms ≠ 3000（模型显式时序被框架污染） |
| 风险 | 低（FR-016 本就为单工具免除而设） | 中（机制不纯） | 高（不满足 FR-014/EC-005 验收） |
| 工作量 | ≈0.2 人日 | ≈0.1 人日 | ≈0.05 人日 |

**推荐 A**：sleep 注册条目 delayMs=0。理由：① 用 FR-016 已设计的通用免除通道表达「sleep 负责自身时序」，机制层零特判（FR-013 纯机制约束）；② 推导结果精确满足 EC-005（sleep 3000 不追加 / sleep 200 补齐至 600，见 §2.4.1）；③ 未来其他「自带时长」的时序工具可同样声明免除，无需改 gate。

---

## 4. 推荐方案

**推荐**：CommandRouter 条目对象注册（§3.1 A）+ AgentRunner 事件/hooks 形态（§3.2 A）+ sleep 工具条目 delayMs=0 免除（§3.3 A）。整体技术路线已在 §2 展开，落地顺序与交接如下。

### 4.1 关键设计决策汇总（spec D-001~D-006 → 技术方案）

| spec 决策 | 技术落点（本 plan 章节） |
|---|---|
| D-001 CommandRouter=顶层工具级路由；createExecutor 保留为工具内部执行器 | §2.3/§2.6.2：lgdl-web-cli ToolEntry executor 内部走 lgdlExecutor；exec 管线/命令族零改动（NG-002） |
| D-002 delay=路由层命令间最小间隔，默认分级，与 sleep 不叠加 | §2.4：DelayGate 挂 router.dispatch；base 0 / lgdl-web 600ms 钳制 5000；sleep delayMs=0（§3.3 A） |
| D-003 agent 循环上收 base，边界=中性逻辑不含 React/LGDL 回调 | §2.5：runner 纯逻辑+事件/hooks；渲染/onApply/next-actions 留场景 |
| D-004 OpHandlerRegistry 顶层角色被 CommandRouter 承接；op-cli 整体注册一个工具 | §2.6.3：createOpCliToolEntry(registry)；App 16 handler 收敛为执行器内部注入 |
| D-005 放弃只增不删，门禁=行为等价/更优覆盖+全绿 | §4.2 测试策略：删除 buildTools/场景聚合/分发旧用例 → router/runner/delay 专项承接 |
| D-006 base 文案中性化；场景引导由 system prompt/guideDoc 承担 | §2.7.4：tools.ts/help.ts 示例中性化；help-aggregator.ts 删除；guideDoc 注入保留核验 |

### 4.2 测试策略（NFR-005/AC-009，D-005）

**新机制专项（base，纯 node 无 React）**：
- `router.test.ts`：register/dispatch 正常路 + 未注册名显式错误（AC-004）/重复注册抛错（EC-003）/空集合内建自足（EC-004/AC-001）/deriveTools 顺序=[业务(注册序)]+[内建置末]（AC-006）/deriveCommand 引号规则与未知名/help 一览与详情（注册即得，含新增假工具四链自动可见 AC-003）/fetch/sleep/help 冒烟（AC-001）；
- `delay.test.ts`：fake clock 注入——首个分发不等待 / 连续两分发间隔=max(delayMs,执行耗时) / sleep(3000) 不追加 / sleep(200) 补齐至 600（EC-005）/单工具免除（FR-016）/非法值钳制+警告（EC-009）/stats+onDelay 观测（FR-017）；
- `runner.test.ts`：中性循环（无 react import 静态断言 NFR-008）——turns 回填 toolCallId/MAX_ROUNDS 超限/失败聚合与纠正 user turn/多 toolCalls 逐条/stop 中止/LLM 错误重试一次后停止/事件序列断言（等价 FR-024 的事件面）；
- `sleep.test.ts` 增补：executeSleepFromArgs 的 ms/seconds 归一 + 缺参友好文案 + clamp（EC-011）。

**改写/删除有依据（D-005）**：
- provider.test.ts:189-196（buildTools 顺序断言）→ lgdl-web session.test.ts 派生顺序断言（顺序规则测试承接，AC-006）+ base router.test 顺序规则测试；
- lgdl-web/ai/lgdl-web.test.ts:20-33（fetch 行路由 2 例）→ session/router 面 web-fetch dispatch 用例（行为等价：data: URL 获取成功/缺 path 错误）；
- 场景 help-aggregator 注册面测试（若有）→ router help 派生测试（FR-010）；
- AiPanel 无单测（UI 组件）：行为等价由 AC-008 手测/validate AI 实战闭环清单承接。

**门禁**：全仓 9 包测试命令全绿（AC-009）；grep 断言零残留（NFR-003/AC-007：opRegistry 直连/toolCallToCommand 兜底/sleep 特判/buildTools 手写数组/场景 help 注册在 lgdl-web 源码零命中）。

### 4.3 交接 tasks（落点模块清单，见 §8 前移交）

---

## 5. 文件影响分析

> 所有需要创建/修改/删除的文件（路径基于当前实测）

### 5.1 web-cli-base（base 本体新增 shell 层 + 中性化收尾）

| 操作 | 文件路径 | 说明 |
|:--:|------|------|
| NEW | packages/web-cli-base/src/router.ts | CommandRouter + ToolEntry/ToolResult/ToolContext/ToolExecutor/ToolCallArgs + createCommandRouter + 内建自动注册 + schema/help/前缀派生 + dispatch（含 delay gate 调用）（FR-001~005/010/013-016/020） |
| NEW | packages/web-cli-base/src/delay.ts | Clock 契约 + 真实时钟 + DelayGate（命令间最小间隔/首个不等待/钳制/警告/stats）+ clamp 工具（FR-013~017/EC-005/EC-009） |
| NEW | packages/web-cli-base/src/runner.ts | AgentRunner 中性循环 + 事件/hooks + AgentRun/stop + RunOutcome（FR-006/EC-006~008；零 react NFR-008） |
| MODIFY | packages/web-cli-base/src/sleep.ts | 增 `executeSleepFromArgs(args)`（ms/seconds 归一 + 缺参友好文案 + clamp 保留）；供内建注册 executor 直调（FR-009/EC-011） |
| MODIFY | packages/web-cli-base/src/tools.ts | :27/:38 web-fetch description/示例路径 `lgdl/web/workbench/README-CLI.md` → 中性示例（FR-012/D-006）；schema 结构不动（A-001 零改写协议描述——description 中性化属 Q-012 残留清理，非工具协议改写） |
| MODIFY | packages/web-cli-base/src/help.ts | :34 webFetchHelp 示例路径中性化（FR-012） |
| DELETE | packages/web-cli-base/src/help-aggregator.ts | HelpAggregator/createHelpAggregator 被 router help 派生取代，全仓无其他消费方（FR-010）；index.ts 同步删导出 |
| MODIFY | packages/web-cli-base/src/index.ts | 导出 router/delay/runner 类型与工厂；删 help-aggregator 导出（FR-010/NFR-007 导出面完整性） |
| NEW | packages/web-cli-base/src/router.test.ts | router 专项（§4.2） |
| NEW | packages/web-cli-base/src/delay.test.ts | delay 时钟注入专项（§4.2） |
| NEW | packages/web-cli-base/src/runner.test.ts | runner 专项（§4.2） |
| MODIFY | packages/web-cli-base/src/sleep.test.ts | 增补 executeSleepFromArgs 用例（EC-011） |

### 5.2 lgdl-web-cli（业务工具注册注入）

| 操作 | 文件路径 | 说明 |
|:--:|------|------|
| NEW | packages/lgdl-web-cli/src/tool-entry.ts | createLgdlWebCliTool(): ToolEntry（schema=WEB_CLI_TOOL 逐字节；executor→lgdlExecutor.executeSubcommand 映射；help=webCliHelp；summary）（FR-018） |
| MODIFY | packages/lgdl-web-cli/src/index.ts | 导出 createLgdlWebCliTool（FR-018/FR-021） |
| NEW | packages/lgdl-web-cli/src/tool-entry.test.ts | 条目 schema/executor 映射断言（changed/source 语义与现 executeSubcommand 路径一致，AC-002） |
| —（不动） | adapters/lgdl.ts / commands.ts / operations.ts / protocol.ts / help.ts / tools.ts | C 档零改动（NG-001/NG-002）：lgdlDomain 19 符号组装、exec 管线、17 子命令、webCliHelp 文案全保留 |

### 5.3 lgdl-web-op-cli（注册接入，OpHandlerRegistry 角色收敛）

| 操作 | 文件路径 | 说明 |
|:--:|------|------|
| NEW | packages/lgdl-web-op-cli/src/tool-entry.ts | createOpCliToolEntry(registry): ToolEntry（schema=WEB_OP_TOOL；executor→registry.execute 映射；help=webOpHelp）（FR-019） |
| MODIFY | packages/lgdl-web-op-cli/src/index.ts | 导出 createOpCliToolEntry（FR-019/FR-021） |
| NEW | packages/lgdl-web-op-cli/src/tool-entry.test.ts | 条目 executor 映射（注册 handler 执行/未注册子命令 ok:false）；next-actions 语义由场景拦截（AC-002） |
| —（不动） | ops.ts / tool.ts / handlers.ts / help.ts / next-actions.ts | C 档机制保留：OP_COMMANDS/OP_SUBCOMMANDS 元数据、OpHandlerRegistry 内部机制、webOpHelp 文案（D-004） |

### 5.4 lgdl-web（场景收敛与注入）

| 操作 | 文件路径 | 说明 |
|:--:|------|------|
| NEW | packages/lgdl-web/src/ai/session.ts | 单一组装点：createAiSession(deps)——router（delayMs=600，FR-015）+ 注册 2 业务工具 + AgentRunner 装配（chatFn/dispatch ctx/hooks 注入）（FR-022）；零 React import（可 node 测试） |
| NEW | packages/lgdl-web/src/ai/session.test.ts | 派生顺序断言（承接 provider.test.ts:191，AC-006）+ delay 配置生效（600/钳制，AC-005）+ web-fetch dispatch 用例（承接 lgdl-web.test.ts 2 例） |
| MODIFY | packages/lgdl-web/src/ai/AiPanel.tsx | 删 toolCallToCommand（:154-170）/五分支分发（:421-489）/sleep 特判（:445-470）/help 聚合（:471-479）/相关 import（:5-10 调整）；改经 session.runAgent 驱动（事件→appendMessage；hooks→next-actions/onApply）；渲染/PRESET/guideDoc/pending 保留（FR-023/D-003） |
| MODIFY | packages/lgdl-web/src/ai/provider.ts | 删 buildTools()（:247-275）+ 三工具 import（:17-20 调整）；chat(settings, turns, tools?) 增可选 tools 参数（schema 由调用方 router.deriveTools() 供给，FR-008）；testConnection 调用不带 tools（零 schema 请求） |
| MODIFY | packages/lgdl-web/src/ai/provider.test.ts | 删 :189-196（buildTools 顺序用例）→ 承接至 session.test.ts；其余 12 例留（PROVIDERS/localStorage/直连标记，NG-004 应用态留场景） |
| MODIFY | packages/lgdl-web/src/App.tsx | opRegistry useMemo（:986-1119）保留组装但不再向 AiPanel 暴露 onWebOp；删 handleWebOp（:1121-1124）；建 session（useMemo，deps=applyAiSource/source/docId/opRegistry/settings）；AiPanel 传 session（:1262 用法调整） |
| DELETE | packages/lgdl-web/src/ai/help-aggregator.ts | 场景 help 注册面删除（FR-010，router help 派生取代） |
| DELETE | packages/lgdl-web/src/ai/lgdl-web.ts | 死接线删除（仅测试消费 + 陈旧注释，FR-011） |
| DELETE | packages/lgdl-web/src/ai/lgdl-web.test.ts | 2 例迁移至 session.test.ts（FR-011/NFR-003） |
| MODIFY | packages/lgdl-web/package.json | :11 test 脚本文件列表重列（删 lgdl-web.test.ts；增 session.test.ts；lgdl-web-cli/op-cli/base 新增测试文件均用通配/新列表按 §4.2 同步）；dependencies 不变（lgdl-web 已依赖 web-cli-base/lgdl-web-cli/lgdl-web-op-cli） |
| —（不动） | prompts.ts / SettingsPanel.tsx / examples.ts / locate.ts / snap.ts | C 档场景内容（prompts 协议描述零改写 A-001/NG-005） |

### 5.5 不改动面

root package.json/tsconfig/CI（无包新增删除）；lgdl-core/lgdl-layout/lgdl-render/lgdl-router/lgdl-cli（语言引擎与终端，NG-001）；base 既有机制源码（commands/operations/protocol/llm/exec/web-fetch 逻辑零语义改动——仅 tools.ts/help.ts 文案中性化与 sleep.ts 增补函数）；op-cli/lgdl-web-cli 的 C 档内容（§5.2/5.3 标注不动文件）。

---

## 6. 风险评估

| 风险 | 概率 | 影响 | 缓解措施 |
|------|:--:|:--:|----------|
| R-001 范围蔓延（agent 循环/渲染全 base 化） | 中 | 高 | spec D-003 已划边界：上收=中性循环逻辑，不上收=React 渲染/LGDL 回调/场景内容（§2.5.1 清单化）；tasks 阶段以本 plan §2.5 边界为红线；渲染面改动仅 AiPanel 分发删除（FR-023），消息 UI 组件不动 |
| R-002 未知工具行为差异（静默兜底→显式报错） | 低 | 中 | 属 D-3 声明项（FR-003/EC-001）：dispatch 未注册名 ok:false + 显式文案，工具名不落入执行器，错误回填 AI 会话不中断；validate 阶段 AI 实战闭环确认模型可自愈（prompts 协议描述零改写 A-001） |
| R-003 delay × sleep 双重等待 | 中 | 中 | §3.3 方案 A（sleep 条目 delayMs=0）从机制上消除叠加；delay.test.ts 时钟注入逐条验证 EC-005（3000 不追加 / 200 补齐 600） |
| R-004 两套半路由并存（exec 子命令路由 vs CommandRouter） | 中 | 中 | D-001 定层：router=工具级、exec=lgdl-web-cli 工具内部执行器（其子命令分发属 LGDL 文档领域内容 C 档不泛化）；tool-entry 仅转发 {subcommand,args}，无第二工具级路由 |
| R-005 op-cli 机制重复 | 低 | 低 | D-004：OpHandlerRegistry 顶层分发角色移交 router，子命令 handler 注入保留为该工具执行器内部机制；App 16 handler 注入目标 = createOpCliToolEntry(registry)；grep 断言 AiPanel 无 opRegistry 直连 |
| R-006 base 文案中性化连带（README 提示回归） | 低 | 低 | D-006：guideDoc 系统注入已事实替代 AI 自取 README（AiPanel.tsx:297-310/:391-395 + prompts.ts:21-25）；清理后场景侧核验「使用指南已自动加载」引导语不回归（AC-012） |
| R-007 **runner 事件集不完备致消息流差异**（FR-024 行为等价关键） | 中 | 高 | §2.5.3 事件↔AiPanel 消息类型逐点映射表作为 tasks 核对清单；validate 阶段用「事件序列录制 vs 重构前 appendMessage 序列」对比；消息顺序/失败/超限/next-actions 全路径手测（AC-008） |
| R-008 **sleep 缺参/非法文案漂移**（fc 直调 vs 现特判文案） | 中 | 中 | executeSleepFromArgs 缺参友好文案 = AiPanel.tsx:455 语义逐字承接（EC-011 断言）；sleep.test.ts 增补专项；clamp 10 分钟保留（sleep.ts:46） |
| R-009 **ctx.source 时序漂移**（多轮变更后源码推进） | 中 | 高 | session.dispatch 每次从 getSource()/hooks 内维护的 sourceRef 取当前值（AiPanel:486 现语义）；hooks.onToolDone 在 onApply 后更新 sourceRef 再继续下一条；EC-006 多 toolCalls 场景专项验证 |
| R-010 **派生一致性**（help 一览/顺序与旧文本 diff） | 低 | 中 | §2.7.4 双契约分离（schema 顺序 AC-006 / 一览贴近旧文本 FR-024）；router.test + session.test 断言；web-cli-help 一览 4 工具 + 中性 tip 与旧聚合器语义 diff 人工核对 |
| R-011 **provider.chat 签名变更波及 testConnection/SettingsPanel** | 低 | 中 | tools 参数可选（默认空），testConnection 调用零改动（provider.ts:231-234）；provider.test 12 例留场景验证 |
| R-012 **时间风险**（base 三新模块 + lgdl-web 收敛同步落地） | 中 | 中 | 落地顺序建议：base 层（delay→router→runner，各自测试绿）→ 业务包 tool-entry → lgdl-web session/AiPanel/App 收敛（原子提交）；每步 build + 相关包测试门禁（沿用 V2 M0~M11 每步可构建先例） |

---

## 7. 生成的 ADR

> 本次规划产出的架构决策记录（本 Feature 独立编号；完整正文内嵌本表后，独立 ADR 文件由 tasks 阶段视需要落盘——沿用 specs-tree-web-cli-v2 先例）

| ADR | 标题 | 状态 |
|-----|------|:--:|
| ADR-001 | CommandRouter = 唯一顶层路由核心（注册表单一数据源 + 统一分发契约） | PROPOSED |
| ADR-002 | AgentRunner 上收 base 的边界与形态（纯逻辑 + 事件/hooks，React/LGDL 回调留场景） | PROPOSED |
| ADR-003 | 全局 delay = 路由层命令间最小间隔 + 时钟注入 + sleep 条目 delayMs=0 免除实现不叠加 | PROPOSED |
| ADR-004 | help/schema 派生取代 HelpAggregator：模块删除、双契约顺序分离 | PROPOSED |

### ADR-001: CommandRouter = 唯一顶层路由核心（注册表单一数据源 + 统一分发契约）

**状态**: PROPOSED
**背景**: 工具分发/注册知识散落 lgdl-web 四处（schema 组装 provider.ts:247-275 / 前缀映射 AiPanel.tsx:154-170 / 分发 if/else :425-489 / help 聚合 lgdl-web/ai/help-aggregator.ts），五工具四种异构执行入口，base 无法自举自身工具目录（Q-001/Q-002/Q-005）；spec D-001/D-004 锁定「CommandRouter=顶层工具级路由、业务包整体注册、OpHandlerRegistry 顶层角色被承接」。
**决策**: base 新增 `CommandRouter`：`register(ToolEntry)`（重复名抛错 EC-003）/ `dispatch({tool,args}, ctx)`（未注册名显式报错 FR-003、执行器异常转 ok:false EC-012、delay gate 挂此统一入口 FR-013）/ `deriveTools()`（schema 派生=[业务(注册序)]+[内建(置末)] FR-005）/ `deriveCommand()`（前缀派生 FR-007，引号规则复制 AiPanel:165-168）/ `listHelp()/helpFor()`（注册即得 FR-010）。lgdl-web-cli/lgdl-web-op-cli 各以 ToolEntry 注册注入（executor 内部保留各自机制，C 档零改动）；web-fetch/sleep/web-cli-help 内建自动注册（FR-020）；工具名集合唯一维护（FR-021/NFR-004）。
**后果**: 路由知识收敛进注册表单一数据源；新增/改名工具 = 单点变更（AC-003）；删除四处碎片面（NFR-003 grep 断言）；5 工具全部经统一分发入口执行（FR-002）；base 无业务包时自足可用（AC-001）。破坏面仅限 lgdl-web 内部接线（D-3 声明项），领域执行路径零改动。

### ADR-002: AgentRunner 上收 base 的边界与形态（纯逻辑 + 事件/hooks，React/LGDL 回调留场景）

**状态**: PROPOSED
**背景**: agent 循环（turns/MAX_ROUNDS/多 toolCalls 回填/失败聚合/重试）沉在 React 组件 AiPanel.tsx:383-524，任何新场景必须复制整段接线（Q-006/Q-011）；spec D-003 裁决「上收 base，边界=中性 AI-tool-workflow，不含 React/UI 面」。
**决策**: base 新增 `AgentRunner`（runner.ts，零 react import NFR-008）：上收 turns 维护/轮次上限/逐条分发/toolCallId 回填/失败聚合/LLM 错误重试一次/可停止；形态 = 纯逻辑 + 事件集（onAssistantText/onCommandLine/onToolOutput/onRoundLimit/onEmptyReply/onLLMError/onFailAggregate/onFinish）+ hooks（intercept=dispatch 前拦截（next-actions 胶囊接入）、onToolDone=完成含 changed/source（onApply 写回接入））。lgdl-web 侧仅保留 React 消息渲染/编辑器写回/UI 回调/场景内容（D-003 边界清单 §2.5.1）。
**后果**: base 提供完整中性 AI-tool-workflow，任何场景（含 F-14 浏览器场景）装即得循环能力（呼应 bash 类比）；消息流等价由「事件↔appendMessage 类型一一映射 + validate 实战闭环」验证（FR-024/AC-008）；渲染知识不泄漏进 base（NFR-008/AC-011）；范围蔓延风险由边界清单控制（R-001）。

### ADR-003: 全局 delay = 路由层命令间最小间隔 + 时钟注入 + sleep 条目 delayMs=0 免除实现不叠加

**状态**: PROPOSED
**背景**: 现状仅显式 sleep（时序责任在模型），无隐式统一等待（Q-004）；spec D-2/D-002 裁决「挂 CommandRouter 统一分发入口、语义=命令间最小间隔、默认值分级、与显式 sleep 不叠加」，实现机制留 plan（EC-005 验收：sleep(3000) 不追加 / sleep(200) 补齐至 600）。
**决策**: base 新增 DelayGate + Clock 契约（delay.ts）：gate 挂在 router.dispatch 执行前，语义=距上一命令完成时刻不足 effDelay 则补齐（首个分发 lastCompletion=null 不等待，FR-014）；effDelay = `entry.delayMs ?? options.delayMs`（FR-016 单工具覆盖/免除，0=免除）；base 默认 0（FR-015/NFR-006），lgdl-web 场景组装 600ms、非法值钳制 [0,5000]+一次警告（EC-009）；时钟注入 + stats/onDelay 观测（FR-017，delay 静默不注入 tool 结果文本）。**sleep 工具注册条目声明 delayMs:0**——sleep 自带显式时长即间隔来源，其完成时刻照常进入 gate，机制层零特判（§3.3 A）；推导结果精确满足 EC-005（sleep 3000 → 完成后自然满足 600 无追加；sleep 200 → 下一命令前补齐 400 至 600）。
**后果**: 所有已注册工具（含未来新增）自动获得命令间最小间隔（FR-013），业务包无 setTimeout 旁路（grep 断言）；delay 不污染 AI 上下文（静默）；sleep 保留显式长等待分工不退役（FR-017）；机制零领域知识（gate 不认识任何工具名）。

### ADR-004: help/schema 派生取代 HelpAggregator：模块删除、双契约顺序分离

**状态**: PROPOSED
**背景**: web-cli-help 执行依赖场景每次新建聚合器（AiPanel.tsx:475 + createWebCliHelpAggregator lgdl-web/ai/help-aggregator.ts:11-15），help 注册面与 CommandRouter 注册表重复（Q-010）；spec FR-010/D-006 要求「help 注册即得、场景手写注册面消除、base HelpAggregator 若被取代则标记废弃/迁移」。
**决策**: router 的 listHelp()/helpFor() 派生取代 HelpAggregator：web-cli-help 作为内建工具注册（listed:false——不自列、自查返回未知，保持旧一览 4 工具语义），工具条目的 summary/help 渲染入口 = 一览/详情数据源（注册即得，新增假工具自动入一览 AC-003）；`help-aggregator.ts`（base + lgdl-web 两处）整体删除（全仓 grep 无其他消费方）。派生顺序**双契约分离**：schema 派生顺序=[业务(注册序)]+[内建(置末)]（FR-005/AC-006，承接 provider.test.ts:191 顺序契约）；help 一览顺序=内建先业务后（贴近旧聚合器文本，FR-024 用户可感知等价），两契约互不冲突。
**后果**: 场景 help 注册面与每次新建聚合器消除（FR-010/AC-007）；base 一览 tip 中性化（`web-cli-help lgdl-web-cli` 残留随模块删除消失，FR-012/AC-012）；HelpAggregator 机制符号删除（D-3 允许），未来如有场景级聚合需求由 router 派生承接；派生一致性由 router.test/session.test 断言（R-010）。

---

## 8. 交接 tasks（落点模块清单）

> 仅标注落点与验收锚点，不做任务拆分（tasks 职责）；每步沿用「可构建 + 相关包测试绿」门禁

| 落点 | 模块/文件 | 关联 FR/AC 锚点 |
|------|----------|----------------|
| base delay | web-cli-base/src/delay.ts + delay.test.ts | FR-013~017/EC-005/EC-009；AC-005 |
| base router | web-cli-base/src/router.ts + router.test.ts（含 3 内建自动注册） | FR-001~005/010/013-016/020/021；AC-001/003/004/006 |
| base runner | web-cli-base/src/runner.ts + runner.test.ts | FR-006/EC-006~008；AC-011；NFR-008 |
| base sleep fc 接入 | web-cli-base/src/sleep.ts（executeSleepFromArgs）+ sleep.test.ts 增补 | FR-009/EC-011 |
| base 中性化 | tools.ts/help.ts 文案；help-aggregator.ts 删除；index.ts 导出面 | FR-010/012；AC-001/012 |
| lgdl-web-cli 注册 | lgdl-web-cli/src/tool-entry.ts + index.ts + tool-entry.test.ts | FR-018；AC-002 |
| lgdl-web-op-cli 注册 | lgdl-web-op-cli/src/tool-entry.ts + index.ts + tool-entry.test.ts | FR-019；AC-002 |
| lgdl-web 组装 | lgdl-web/src/ai/session.ts + session.test.ts（派生顺序/delay 配置/web-fetch dispatch） | FR-008/015/022；AC-005/006 |
| lgdl-web 收敛 | AiPanel.tsx（删分发/前缀/sleep/help 面→runner 驱动）；provider.ts（删 buildTools+chat tools 参数）；App.tsx（session 持有 + 16 handler 注入 op 工具执行器）；lgdl-web/package.json test 列表 | FR-007/008/011/023；AC-004/007 |
| 删除面 | lgdl-web/ai/help-aggregator.ts、lgdl-web/ai/lgdl-web.ts、lgdl-web/ai/lgdl-web.test.ts；provider.test.ts:189-196 改写 | FR-010/011；NFR-003 |
| 测试基线 | 全仓 9 包测试全绿 + 新机制专项 + grep 零残留断言清单 | NFR-005/AC-009；D-005 |
| validate 预备 | AI 实战闭环清单（四条路径 + next-actions/op + delay 校准） | FR-024/AC-008/AC-012；A-003 调参 |

---

## 9. 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建：基于 discovery/spec 文件:行号实测核实（修正 AiPanel 4+1 分支/App 19 handler/sleep fc 重建间接层/help-aggregator 消费面 2 处等）+ spec D-001~D-006 落地技术方案；产出 CommandRouter 契约（ToolEntry 单一数据源/dispatch 统一契约/schema·help·前缀派生与顺序双契约）、DelayGate 机制（时钟注入 + sleep 条目 delayMs=0 免除实现不叠加，推导精确满足 EC-005）、AgentRunner 上收边界与事件/hooks 形态（事件↔AiPanel 消息类型逐点映射）、注册收敛（3 内建自动注册/2 业务 ToolEntry/OpHandlerRegistry 角色移交）、lgdl-web 单一组装点 session.ts 与 AiPanel 收敛面、文件影响面（NEW 11/MODIFY 12/DELETE 4 跨 4 包）、风险缓解矩阵（R-001~R-012）、4 项 ADR、测试策略（D-005 增删有据）、交接 tasks 落点清单 | 2026-09-05 | SDDU Plan Agent |
