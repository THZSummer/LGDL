# ADR-NDA-002: `hooks.intercept` 捕获、合成 `ToolResult`、流面过滤与同回合多调用合并口径

## 状态
PROPOSED

## 背景

基座 agent 循环在**执行每个 toolCall 之前**问一道缝（`packages/web-cli-base/src/runner.ts`）：

```ts
// runner.ts:50-55
export interface AgentRunnerHooks {
  /** dispatch 前拦截：返回 ToolResult 则跳过 dispatch（next-actions 胶囊由此接入）。 */
  intercept?: (tc, commandText) => ToolResult | null | Promise<ToolResult | null>;
  onToolDone?: (tc, result) => void | Promise<void>;
}
// runner.ts:161-168（per-tool 异常设防内）
let result: ToolResult;
try {
  const intercepted = await hooks.intercept?.(tc, commandText);
  result = intercepted ?? (await options.dispatch(tc));
} catch (err) { /* 转稳定失败 ToolResult，不中断循环 */ }
```

注释**逐字点名先例**「next-actions 胶囊由此接入」⇒ 该缝就是为结构化 next 产出设计的。但插件今天**只传 `onToolDone`**：`service-worker.ts:1045-1061`（`hooks:{onToolDone}`）—— **未 wire `intercept`**（discovery §0.2-F6，`COR-NDA-4` 复核成立）。

同时，基座对**每次**工具调用都发 `events.onCommandLine`（`:156`）与 `events.onToolOutput`（`:176`）；`hooks.onToolDone` 在两者之间（`:171`）。⇒ `next` 调用若不处置，会**上流**成一行命令行 + 一张工具卡（`COR-NDA-9`，spec 未提）。

## 决策

### ① 接线（**纯加法；`onToolDone` 逐字不动**）

在 `service-worker.ts` 的 `hooks` 对象（`:1045-1061`）**新增** `intercept`：

```ts
hooks: {
  intercept: (tc, commandText) => interceptNextTool(tc, commandText, turnState),   // ★ 新增（B 列）
  onToolDone: (tc, result) => { /* 逐字保留（R6 选择器观测） */ },
}
```

- 只在 `tc.name === NEXT_TOOL_NAME` 时返回合成 `ToolResult`；其余一律 `return null` ⇒ 基座走 `options.dispatch(tc)`（**既有语义零变**）。
- **探针位置**：dispatch **之前**（基座保证），⇒ `next` 的真实 `dispatch` 永不发生（NG-NDA-012）。

### ② 合成 `ToolResult`（**常量，零回显**）

```ts
{ ok: true, output: '✓ next 候选已记录' }   // 常量字符串；不进任何用户可见面（见 §④ 过滤）
```

- `ok: true` ⇒ 不触发基座的失败聚合（`:179-183`）；
- 基座把它 push 成 tool turn（`:177`）⇒ 模型看到「工具成功」，循环可继续（这就是 agent 循环里「调用成功」的正常语义）；
- **零明文**（NFR-NDA-004）：output 不拼接任何候选字段值（`label` / `params` / `ref` 都不进 output）。

### ③ 参数面 = `tc.rawArguments` 严格 `JSON.parse`（**单源**）

- **为什么不能读 `tc.args`**：基座 `parseToolArguments`（`llm.ts:219-241`）只保留 `subcommand` 与**标量** `args`，`Object.entries(parsed.args)` 还要求 `parsed.args` 是对象 —— 顶层 `candidates` **数组**既不在 `args` 内、也不会被保留 ⇒ `tc.args` **必然取不到**（`COR-NDA-8`）。
- **口径**：`JSON.parse(tc.rawArguments)` → 顶层必须是对象 → `candidates` 必须是数组 → 逐项 `typeof item === 'object' && item !== null && !Array.isArray(item)`（**与 F-36 `parseAiNextItems` 的形状筛选逐字同构**，`ai-next.ts:86`）；其余（非对象项）**丢弃**。
- **失败口径**（FR-NDA-022 / EC-NDA-015）：解析失败 / 顶层非对象 / `candidates` 非数组 ⇒ **视为「未产出」**（`candidates = []`），**不抛错、不中断回合**、不写 `blocked`（那是支线 C 不是支线 B，承 `ai-next.ts:72-75` 的既有口径）。
- **`tc.args` 零使用**（`R-NDA-912` 反证点）：门禁扫描 + 反证「出现第二解析面 ⇒ 必红」。

### ④ 流面过滤（`next` 调用**不上流**）

在 SW 的 events 里做**加法条件**（`COR-NDA-9` / `R-NDA-911`）：

| 事件 | 处置 |
|---|---|
| `onCommandLine(text)`（`:1010-1013`） | `text === NEXT_TOOL_NAME`（`deriveCommand` 对未知名返回 `null` ⇒ `commandText = tc.name`，`runner.ts:155`）⇒ **return（不发 `command` 变体）** |
| `onToolDone(tc, result)`（`:1046-1060`） | **逐字不动**（既有语义：只对成功的 `dom set-text` 记 `selector`）—— `next` 调用会让 `lastTool` 被写成 `{name:'next', ok:true, ...}`，这是**读向**，不影响既有工具 |
| `onToolOutput(text)`（`:1014-1024`） | `lastTool?.name === NEXT_TOOL_NAME` ⇒ **return**（不发 `tool` 变体）；随后照旧 `lastTool = null` |
| `onAssistantText(text)`（`:1003-1009`） | **逐字不动** |

- **不动 `onToolDone` 语义**（COR-NDA-4 保持）；过滤只作用在**两个 events 回调**、且**只针对 `next`** ⇒ 既有工具的卡片渲染逐字同前。
- 反证：注入「不过滤」⇒ 「流内出现 `next` 工具卡 / 命令行」判据**必红**（`PD-NDA-014`）。

### ⑤ 同回合多次 `next` 调用 ⇒ **取最后一次**（PD-NDA-011）

- `turnState.nextCapture` 每次捕获**覆盖式**写入（与 F-36「取最后一个围栏块」语义**等价**：`ai-next.ts:62-70` 只在循环里保留 `last`）；
- 最终候选 = **最后一次调用**的 `candidates`，经 5 道链（ADR-NDA-004）后 `slice(0, 3)`（`MAX_CHIPS_PER_CARD`）；
- **合并 / 去重单源**：不新增第二合并器；`chipsFor` 的列表内去重（`recommend.ts:517-527`，`chipDedupKey`）与 R6 同因去重（`ai-next.ts`/`recommend.ts:134-169`）保持**唯一**；
- 反证：构造两次调用 ⇒ 候选 ≤3 且**非并集**（口径唯一，防「并集漂移」）。

### ⑥ 位置 = SW（B 列优先，DC-NDA-013）

捕获 / 解析 / 校验 / 装配 / 留痕全在 `background`（`dist/background.js`，**不计 sidepanel 账本**）；面板**只接收已校验候选**（`service-worker.ts:1036-1042` → `sidepanel.ts:4224`）⇒ 面板侧**零第二校验器**（N-NDA-021 / NFR-NDA-013）。

## 备选方案

| 方案 | 处置 |
|---|---|
| 捕获写在面板侧（A 列） | ❌ 撞体积档位（距档 9,798 B，R-NDA-906）；且面板拿不到 LLM 回合内的 `toolCalls` 交付点 |
| 读 `tc.args.candidates` | ❌ 不可行（`parseToolArguments` 丢数组） |
| 把 schema 设计成「单标量参数 + 多次调用」（一次一候选） | ❌ 与 `maxItems ≤3` 的单卡预算相悖；且增加往返噪声与「取最后一次」的语义模糊 |
| 让 `next` 卡片可见（不过滤 events） | ❌ 污染流面（用户看到无意义的 `next ✓` 卡）；且与「纯结构化产出」的语义不符（`PD-NDA-014`） |
| 不返回 `ToolResult`（`intercept` 返回 `null`） | ❌ 会让 `next` 走真实 `dispatch` ⇒ 触达 `executor`（破坏纯协议语义，R-NDA-905） |

## 后果

**正向**：
- 产出机制真正走基座**既有的** function-calling 通道（零改基座）；
- 捕获面**单源**（`rawArguments`）、失败口径**不中断回合**（守「无死端」）；
- 流面干净，既有工具卡语义零变。

**代价 / 风险**：
- B 列增量（不计账）：捕获 + 解析 + 装配 ≈ +0.6~1.5 KB；
- 新增一个「`next` 是否上流」的实现自由度（已裁决：不上流；若 author 后续要求可见，走加法开关 + 台账）；
- `once-per-round` 语义依赖「`onAssistantText` 只累积最后一条 assistant 文本」这一既有事实（`:1003-1007`）—— 本 Feature 后它**只用于 `aiNext` 之外的既有路径**（装配改为从捕获结果取），需在 build 时确认无残留读者。

## 落地判据（供 tasks/build）

1. `hooks.intercept` 存在且探针在 dispatch 前（源文本可判 + `dispatch` 未被调的运行断言）；
2. 反证「捕获后仍执行真实 `dispatch` ⇒ 必红」；基座 `insight-no-escalation` 机核零 diff；
3. `tc.name !== 'next'` ⇒ 不捕获（`return null`）；
4. 解析失败 / 顶层非对象 / `candidates` 非数组 ⇒ 零候选、零抛错、回合正常完成（`EC-NDA-015`）；
5. `onCommandLine` / `onToolOutput` 对 `next` 零发射（反证「流内出现 `next` ⇒ 必红」）；
6. 同回合两次调用 ⇒ 取最后一次、候选 ≤3（反证「并集」⇒ 必红）；
7. `service-worker.ts` 只新增 `intercept` 键；`onToolDone` 函数体**逐字未变**（哈希切片可判）。
