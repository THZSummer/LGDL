# ADR-NDA-101: 捕获参数面与解析失败口径（`rawArguments` 严格 JSON；`tc.args` 零使用）

## 状态
PROPOSED

## 背景

`next` 工具的调用参数是**嵌套结构**：

```json
{ "candidates": [ { "opId": "op.turn", "label": "…", "ref": "ref_3" } ] }
```

但基座对工具调用参数的解析**只保留标量**：

```ts
// packages/web-cli-base/src/llm.ts:219-241
export function parseToolArguments(id: string, name: string, raw: string): WebCliToolCall {
  let subcommand = ''; let args: Record<string, string> = {};
  try {
    const parsed = JSON.parse(raw) as { subcommand?: unknown; args?: unknown };
    if (typeof parsed.subcommand === 'string') subcommand = parsed.subcommand;
    if (parsed.args && typeof parsed.args === 'object') {
      args = Object.fromEntries(Object.entries(parsed.args)
        .filter(([, v]) => typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean')
        .map(([k, v]) => [k, String(v)]));
    }
  } catch { /* 保持 subcommand='' */ }
  return { id, name, subcommand, args, rawArguments: raw };
}
```

⇒ 对 `{"candidates":[…]}`：`parsed.args === undefined` ⇒ `args = {}`；`subcommand === ''`；**只有 `rawArguments` 保真**（`COR-NDA-8` / `COR-NDA-14`，plan 阶段只读复核新事实）。

## 决策

### ① 唯一输入面 = `tc.rawArguments`（**`tc.args` 零使用**）

```ts
// background/ai-next.ts （NEW 导出；纯函数，零 IO）
/** 从工具调用原始 arguments 取候选数组（形状筛选与 F-36 的 parseAiNextItems 逐字同构）。 */
export function parseNextToolArguments(raw: string | undefined): readonly unknown[] {
  if (typeof raw !== 'string' || raw.length === 0) return Object.freeze([]);
  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch { return Object.freeze([]); }          // 非法 JSON ⇒ 未产出
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return Object.freeze([]);  // 顶层非对象 ⇒ 未产出
  const list = (parsed as { candidates?: unknown }).candidates;
  if (!Array.isArray(list)) return Object.freeze([]);                           // 缺 candidates / 非数组 ⇒ 未产出
  return Object.freeze(list.filter((it) => typeof it === 'object' && it !== null && !Array.isArray(it)));
}
```

与 F-36 `parseAiNextItems`（`ai-next.ts:76-87`）的**逐层口径一一对应**：

| F-36 层 | 本设计层 |
|---|---|
| 无围栏块 ⇒ `[]` | `raw` 空 / 非法 JSON ⇒ `[]` |
| 顶层非数组 ⇒ `[]` | 顶层非对象 ⇒ `[]`（+ `candidates` 非数组 ⇒ `[]`） |
| 项非对象 ⇒ 丢弃 | 项非对象 / 数组 ⇒ 丢弃 |

⇒ **口径等价**（改的是「取哪段文本」而不是「怎么筛」），AI-N-1 的改写因此可做**语义对账**而非重写。

### ② 解析失败 ⇒ 「未产出」（**不抛错、不中断回合**）

- 返回 `[]`（不是 `throw`）⇒ 5 道链拿到空数组 ⇒ `AiNextPayload{accepted:[],blocked:[]}`（**不写 `blocked`**，与 F-36 支线 C 的既有口径一致：`ai-next.ts:72-75` 注释逐字「那是「未产出」支线 C，不是「被拦」支线 B」）；
- 若在 `intercept` 内被**意外**抛出，基座的 per-tool 设防会兜住（`runner.ts:165-168` 转稳定失败 `ToolResult`，不炸整个循环）——但本设计**主动不依赖**它：捕获路径全程 `try/catch` + 返回常量结果。

### ③ `turnState` 捕获形态（覆盖式取最后一次）

```ts
// service-worker.ts runChat 内（本回合事件作用域，与 toolStartedAt / lastTool 同居）
const turnState: { captured: boolean; lastCandidates: readonly unknown[] } = { captured: false, lastCandidates: Object.freeze([]) };
// hooks.intercept 内：
if (tc.name === NEXT_TOOL_NAME) {
  turnState.captured = true;
  turnState.lastCandidates = parseNextToolArguments(tc.rawArguments);   // ★ 覆盖式
  return { ok: true, output: NEXT_TOOL_ACK };
}
```

- **取最后一次**（与 F-36「取最后一个围栏块」等价，`ai-next.ts:62-70`）；
- `captured` 与 `lastCandidates` **分离**：`captured = true ∧ accepted = [] ∧ blocked = []`（解析失败）时，叶2 的判定要能区分「捕获到了但解析失败」与「压根没调用」——`captured` 为真即表示模型**调用过**工具（FR-NDA-060 的「未捕获任何 `next` 工具调用」因此准确）；
- **`≤3` 截断在装配层**（`validateAiNext` 之后 `slice(0, MAX_CHIPS_PER_CARD)`），不在解析层（保持「解析 = 形状筛选」的单责）。

### ④ 反证与判据

| 判据 | 反证 |
|---|---|
| 合法 `rawArguments` ⇒ 候选进 5 道链 | — |
| 非法 JSON / 顶层数组 / 缺 `candidates` ⇒ `[]` 且**不抛**、回合照常完成 | 注入 `throw` ⇒ 判据必红（不中断回合） |
| 项非对象 ⇒ 丢弃（其余项照常） | 注入「数组项也接受」⇒ 必红 |
| **`tc.args` 零使用** | 源文本扫描：`ai-next.ts` / `service-worker.ts` 的捕获路径出现对 `tc.args` 的候选读取 ⇒ 必红（`R-NDA-912`） |
| 两次调用 ⇒ 取最后一次（非并集） | 注入「并集」⇒ 必红 |

## 备选方案

| 方案 | 处置 |
|---|---|
| 读 `tc.args.candidates` | ❌ 不可行（`parseToolArguments` 丢弃数组 ⇒ 恒 undefined） |
| 让 schema 把 `candidates` 序列化成字符串放进 `args`（`{args:{candidates:'"[…]"'}}`） | ❌ 模型遵从度更差；schema 不自描述；且与 spec 的 `parameters` 结构不符 |
| 在基座 `parseToolArguments` 加「保留 `rawArguments` 的嵌套对象」 | ❌ **改基座**（N-NDA-007 硬红线）；且会影响所有既有工具的参数面 |
| 让 `next` 工具一次只接受一个候选（平面 3 参数） | ❌ 与 `maxItems ≤3` 的单卡契约相悖；多次调用合并语义模糊；模型遵从度更差 |

## 后果

**正向**：
- 捕获面**单源**且与基座契约（`rawArguments` 是保真字段）一致；
- 解析（形状）/ 校验（语义）分层 ⇒ 两层各自可判、可注入反证（NFR-NDA-009）；
- 口径与 F-36 逐层等价 ⇒ 门禁改写是**语义对账**（可证明 `assertionsRemoved = 0`）。

**代价 / 风险**：
- 插件侧多一次 `JSON.parse`（一轮至多数次，代价可忽略）；
- 若未来基座改变 `rawArguments` 语义 ⇒ 需复核（已在 ADR-NDA-009 §② 登记「零改基座 ⇒ 只读契约」；本 ADR 的 `rawArguments` 用法是**读取**，不是改契约）。

## 落地判据（供 tasks/build）

1. `parseNextToolArguments` 是纯函数（无 `chrome` / DOM / 时钟 / IO）；五层筛法逐层可判（合法 / 非法 JSON / 顶层数组 / 缺 `candidates` / 项非对象）；
2. `tc.args` 在捕获路径零命中（源扫描 + 反证）；
3. `captured` 与 `lastCandidates` 分离可判（解析失败 ⇒ `captured=true ∧ 候选 0`）；
4. `≤3` 截断在装配层（不在解析层）；
5. 两次调用 ⇒ 覆盖式（取最后一次）非并集。
