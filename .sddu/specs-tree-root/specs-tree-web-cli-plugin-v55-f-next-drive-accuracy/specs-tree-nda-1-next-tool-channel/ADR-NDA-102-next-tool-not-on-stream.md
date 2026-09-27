# ADR-NDA-102: `next` 工具调用不上流（events 加法过滤）与 `onToolDone` 语义不动

## 状态
PROPOSED

## 背景

基座对**每次**工具调用都会向场景发三类事件（`packages/web-cli-base/src/runner.ts`）：

| 行 | 事件 | 内容 |
|---|---|---|
| `:155-156` | `events.onCommandLine(commandText)` | 派生命令行；`deriveCommand` 缺席 / 返回 `null` ⇒ `commandText = tc.name` |
| `:170-174` | `hooks.onToolDone(tc, result)` | 工具身份 + 结果（含 `changed` / `source`） |
| `:176` | `events.onToolOutput(output)` | 工具输出文本 |

插件的三者：

```ts
// service-worker.ts:1002-1024（events）
onCommandLine: (text) => { toolStartedAt = Date.now(); void …sendMessage(commandEvent(text)).catch(…); },
onToolOutput: (text) => { const meta = lastTool; lastTool = null; void …sendMessage(toolResultEvent(meta?.name, meta?.ok, …, text, meta?.selector)).catch(…); },
// service-worker.ts:1046-1060（hooks.onToolDone）
onToolDone: (tc, result) => { const writeSelector = result.ok && tc.name === 'dom' && tc.subcommand === 'set-text' && typeof tc.args.selector === 'string' ? tc.args.selector : undefined; lastTool = { name: tc.name, ok: result.ok, ms: …, …(writeSelector ? { selector: writeSelector } : {}) }; },
```

⇒ 若对 `next` 不作处置，用户会在流里看到：一行命令行 `next` + 一张工具卡 `next ✓ ✓ next 候选已记录`（`COR-NDA-9`，spec 未覆盖）。这是**纯结构化产出**不该有的可见面（`NG-NDA-012` 的语义：它是协议工具）。

## 决策

### ① 两个 events 回调做**加法条件过滤**（只针对 `next`）

```ts
onCommandLine: (text) => {
  if (text === NEXT_TOOL_NAME) return;                       // ★ 新增：next 不上流
  toolStartedAt = Date.now();
  void chrome.runtime.sendMessage(makeMessage('chat-result', { ...commandEvent(text) })).catch(() => {});
},
onToolOutput: (text) => {
  const meta = lastTool;
  lastTool = null;
  if (meta?.name === NEXT_TOOL_NAME) return;                  // ★ 新增：next 工具卡不发
  void chrome.runtime.sendMessage(makeMessage('chat-result', { ...toolResultEvent(meta?.name, …) })).catch(() => {});
},
```

- **判据为什么用 `text === NEXT_TOOL_NAME`**：`deriveCommand` 绑定 `s.host.router.deriveCommand(tc)`（`:1001`），对未注册命令返回 `null` ⇒ 基座回落 `tc.name`（`runner.ts:155`）⇒ `'next'`。该判据**稳定且单源**（工具名常量）。
- **`onToolOutput` 用 `lastTool?.name`**：`lastTool` 由 `onToolDone` 在**紧邻之前**写入（`runner.ts:171` → `:176`），因此是在该回调内可用的**唯一**工具身份信号（既有注释即为此设计，`:971-973`）。

### ② `hooks.onToolDone` **语义逐字不动**

- 只**读**（判断是否 `dom set-text` 并记 `lastTool`），不新增副作用；
- `next` 调用会把 `lastTool` 写成 `{name:'next', ok:true, ms: …}` —— 这是 §① 过滤所**依赖的读向事实**；随后 `onToolOutput` 里 `lastTool = null` 照旧复位；
- 因此 **COR-NDA-4「不动 `onToolDone` 既有语义」保持**（哈希切片可判：函数体逐字未变）。

### ③ 为什么不去动基座（**零改基座**的必然推论）

| 备选 | 问题 |
|---|---|
| 让基座支持「静默工具」（`silent: true`） | ❌ 改基座（`runner.ts` 是 `packages/web-cli-base/**`，零 diff 硬红线 N-NDA-007） |
| 让 `deriveCommand` 返回空串以抑制命令行 | ❌ 只能抑制命令行，不能抑制工具卡（`onToolOutput` 与 `deriveCommand` 无关）；且空串会让 `commandEvent('')` 仍发一条 |
| 在 `host.router` 里给 `next` 设 `listed:false` / 特殊 delay | ❌ `listed` 只影响 `web-cli-help` 一览；与 events 无关 |
| 让 `next` 返回 `ok:false` 以「跳过卡片」 | ❌ 会触发基座失败聚合（`runner.ts:179-183` 推「上一条命令执行失败…」纠错 turn）⇒ 污染回合 + 模型困惑；且 `!ok` 语义被滥用 |
| 让 `next` 输出空串以「看不见卡片」 | ❌ 工具卡仍会渲染（`tool` 变体带 `tool:'next'`）；且空 output 让模型失去「调用成功」的确认 |

### ④ 门禁判据（AI-N-13）

| 判据 | 反证 |
|---|---|
| `onCommandLine` 源文本含 `=== NEXT_TOOL_NAME` 早退 | 删该早退 ⇒ 「流内出现 `next` 命令行」判据必红 |
| `onToolOutput` 源文本含 `meta?.name === NEXT_TOOL_NAME` 早退 | 删 ⇒ 必红 |
| `onToolDone` 函数体**逐字未变**（哈希切片） | 注入任意改动 ⇒ 必红 |
| 运行面：一个含 `next` 调用的回合，面板收到的 `chat-result` 里**没有** `variant:'command'` / `variant:'tool'` 带 `tool:'next'` | 注入「不过滤」⇒ 必红 |
| `KIND_SET` 40 / 12 kind（事件面未新增 kind） | 注入新 kind ⇒ 必红 |

## 备选方案

见 §③（5 条，全部落选，理由逐条）。

## 后果

**正向**：
- 流面干净（用户只看到 assistant 文本 + AI 建议 chips，看不到协议工具的机械痕迹）；
- `next` 的「纯协议」语义在**可见面**也成立（不只是「无执行体」）；
- 零改基座 / 零新增 kind。

**代价 / 风险**：
- 两个 events 回调各多一个条件分支（A 列**零**增量：两者都在 SW ⇒ B 列，≈ +60~150 B）；
- **实现自由度已被裁决关闭**：若 author 后续希望在流内看到 `next` 调用（调试视角）⇒ 走加法开关 + 台账（`PD-NDA-014`），不在本轮；
- 与「tool 卡即证据」的既有观测习惯略有出入 ⇒ 人工面登记（`§9.4` 相关项保持 `⏳ 未执行`）。

## 落地判据（供 tasks/build）

1. 两个早退存在（源文本可判）；`onToolDone` 函数体逐字未变（切片哈希）；
2. 运行面：含 `next` 调用的回合零 `command` / 零 `tool:'next'` 事件（node 面以 events 收集器断言；Chromium 面在 `s0-self-driven.mjs` 加断言）；
3. `next` 调用的合成 `ToolResult.ok === true`（不触失败聚合）；
4. `lastTool` 生命周期不泄漏（`onToolOutput` 后 `lastTool === null`）；
5. `KIND_SET` / 12 kind / 零宿主逐字不动。
