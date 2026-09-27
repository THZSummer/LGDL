# ADR-NDA-001: `next` 工具产出通道与注册面（schema 单源 + `deriveTools()` 接线 + `parity` 条目）

## 状态
PROPOSED

## 背景

F-36 用「尾随 `next` 围栏块 + 严格 JSON + 正则解析」承载 LLM 的 next 产出（`ref-context.ts:52-59` 提示句；`ai-next.ts:58-87` 解析），并在 plan 阶段**显式否决**过 tool-call 方案（F-36 `plan.md:127-133`）。但基座早已具备 function calling 能力且插件**已在传工具**：

- `LlmToolDef{name,description,parameters}`（`packages/web-cli-base/src/llm.ts:61-75`）；
- OpenAI `tools`/`tool_calls` 与 Claude `tool_use`/`tool_result` 双协议（`llm.ts:82-197`）；
- 插件每次回合组装工具面：`providerChat(cfg, turns, s.host.deriveTools())`（`service-worker.ts:986-991`）；
- 工具注册面：`router.register(entry)`（`host.ts:327,333,339,475,503`）⇒ `deriveTools()`（`host.ts:546-548`；基座实现 `router.ts:438-453`）。

作者口径逐字点名「**没有调用 `next` 工具**」（discovery §0.1）⇒ next 的产出载体应是**工具**，不是文本软约定。spec 已裁决为**唯一产出通道**（FR-NDA-010 / NEG-NDA-013 / DC-NDA-006）。

## 决策

**注册一个名为 `next` 的纯协议工具，作为 next 候选的唯一下发 / 产出契约；schema 在本仓单源声明；工具面出现在 `deriveTools()`。** 具体口径：

### ① 落点与形态

- **NEW** `packages/web-cli-plugin/src/tools/next-tool.ts`（B 列，SW 侧可打包）——单源声明：
  - `export const NEXT_TOOL_NAME = 'next'`；
  - `export const NEXT_TOOL_MAX_CANDIDATES = 3`；
  - `export const NEXT_TOOL_SCHEMA: ToolFunctionDef`（`name` / `description` / `parameters`）；
  - `export function createNextToolEntry(): ToolEntry`。
- `host.ts` 在 **always-registered 段**（`:333` 的 `createAskUserToolEntry` 旁）注册：
  `router.register(createNextToolEntry());` —— 与 `ask-user` 同构（纯协议工具先例，`packages/web-cli-base/src/ask-user.ts:121`）。
- **`listed: false`**：`deriveTools()` 必含它（工具面），但**不进** `web-cli-help` 一览（它不是命令行工具，无 `subcommand` 面）。
- **`executor` = 可读 fail-closed**：`{ok:false, output:'✖ next 只能由回合内 intercept 捕获（纯协议工具，无执行体）', error:'next-not-dispatchable'}` —— `ToolEntry.executor` 是必填字段（`router.ts:67`），且给出「绕缝 ⇒ loud」的防御面（承 `ask-user` 无 responder 的可读禁用态先例，`ask-user.ts:65-71`）。

### ② `parameters`（**与运行时同构**；R-NDA-008 消解）

```jsonc
{
  "type": "object",
  "additionalProperties": false,
  "required": ["candidates"],
  "properties": {
    "candidates": {
      "type": "array",
      "minItems": 0,
      "maxItems": 3,                       // = NEXT_TOOL_MAX_CANDIDATES === MAX_CHIPS_PER_CARD
      "items": {
        "type": "object",
        "additionalProperties": false,
        "required": ["opId", "label"],
        "properties": {
          "opId":   { "type": "string", "enum": [ /* 派生：OP_IDS 中 tierOf !== 'gesture' 的 7 枚 */ ] },
          "label":  { "type": "string" },
          "ref":    { "type": "string" },
          "params": { "type": "string" }   // ★ 运行时同构：AiNextCandidate.params: string（definition.ts:104）
        }
      }
    }
  }
}
```

三条**必须**写清的派生口径：

| 项 | 口径 | 依据 / 反证 |
|---|---|---|
| `enum` 内容 | **派生**：`OP_IDS.filter((id) => tierOf(opDescriptor(id)!) !== 'gesture')` ⇒ 7 枚。**不是**第二份手写清单 | 门禁：`enum` 必须等于上述重算式（逐项）；把 `OP_IDS` 或 `tierOf` 改一位 ⇒ 必红；手写副本 ⇒ 必红（第二清单） |
| `params` 类型 | **`string`**（**订正 spec FR-NDA-011 的 `{type:'object'}`**，登记 `COR-NDA-7` / `PD-NDA-012`） | 运行时第④道要求 `typeof raw.params === 'string'` 且非空且 `≤ AI_NEXT_PARAM_MAX=128`（`ai-next.ts:120-125`）；`AiNextCandidate.params: string`（`definition.ts:104`）。若 schema 写 object，则「schema 合法但运行时必拒」⇒ 制造一个恒定空转面（R-NDA-008） |
| `maxItems` 常数 | `NEXT_TOOL_MAX_CANDIDATES` 与 `MAX_CHIPS_PER_CARD`（`recommend.ts:54`）**跨层一致**，用门禁断言相等（**不**跨层 import：`recommend.ts` 是面板模块，SW 侧工具定义不得依赖它） | 反证「把 3 改成 4 ⇒ 必红」；承 `sw-op-mirror` 的「双面一致靠门禁」先例 |

`gesture` 档（`op.authorize` / `op.perm.request`）**不入 enum**：模型**不应被邀请**提案特权 op；运行时第②道仍**恒拒**它们（反证族直接注入 `admitCandidate`，AC-NDA-004 不受影响）。这是比 spec 字面**更强**的 fail-closed（且仍满足「由 `OP_IDS` 单源派生」）。

### ③ `description`（FR-NDA-013 三约束，逐句可判 + 零明文）

```
Propose the next best step for the user. Call this tool EXACTLY ONCE at the very end of
your final answer, after the answer is complete. `opId` MUST be one of the registered
system actions listed in the enum; never invent an action. This tool performs NO page
action, touches no network and returns nothing the user can see — it only records
candidates. If you have no suggestion, still call it once with an empty `candidates` array.
```

三约束句（仅回合结束调用一次 / `opId` 必须已注册 / 不执行任何页面操作）**各占一句**，门禁按句断言；文本**不含**任何正文 / 凭据 / URL query（法八：`assertNoPlaintext` 对 `description` 亦可机核）。

### ④ 纯协议（NG-NDA-012 / R-NDA-905）

工具**不触达真实写**、无网络、无时钟：唯一作用是在 `hooks.intercept` 被捕获并返回合成 `ToolResult`（ADR-NDA-002）。`executor` 永不被正常路径调用。

## 备选方案

| 方案 | 处置 |
|---|---|
| schema 平面化为 `{args:{candidates:"<json>"}}` | ❌ 把结构退化字符串，模型遵从度更差，且 schema 不再自描述（R-NDA-008 加剧） |
| `params: {type:'object'}`（spec 字面） | ❌ 与运行时同构冲突 ⇒ 制造恒定空转面（见上表） |
| `enum` = 全 9 `OP_IDS` | ❌ 主动邀请模型提案 `gesture` 特权 op（虽然会被拦，但白增噪声与提案面）；行为未更安全 |
| 不注册工具，改回围栏块 | ❌ 本 Feature 的母问题（NG-NDA-013 / DC-NDA-006） |
| 无 `executor` / 不设 `listed:false` | ❌ `executor` 必填（编译期）；`listed` 会让 `web-cli-help` 列出一个不可命令行执行的工具（撒谎面） |

## 后果

**正向**：
- 产出契约从「提示词软约定」升级为**模型原生结构化通道**（作者价值锚「准确无误、高可靠」的可兑现面）；
- 新增一条 next 产出**只改一个工具注册 + 一处 intercept 捕获 + 一个校验器**（US-NDA-009 的扩展点固定承诺）；
- 零新增 kind / 零宿主：候选仍经既有 `chat-result.aiNext` type-only 加法字段（K-4）。

**代价（已知、如实登记）**：
- **门禁**：`test/parity/waivers.json#pluginExtras` 新增 `next` 条目（`reason` + `basis` 均非空；`parity.test.ts:232-247` 自动机核）。**位置订正**：`pluginExtras` 在 `waivers.json`，**不在** `baseline-catalog.json`（`COR-NDA-6`）。`baseline-catalog.json#toolCount`（34）是 **main 基线**投影、被 `insight-archive.test.ts:698-699` 钉死 ⇒ **不得**改。
- **体积**：B 列（`dist/background.js`，不计 sidepanel 账本）≈ +0.4~1.0 KB；**A 列零增量**（工具面在 SW 侧组装，面板不认识 schema）。
- **已知成本继承**：F-36 plan 方案 C 落选时列出的成本面（`toolCount` / 工具目录 / `parity` 契约）**如实继承**（`COR-NDA-2`），但经复核**只有 `pluginExtras` 一条真实门禁**（`COR-NDA-11` 已核无工具总数门禁）。

## 落地判据（供 tasks/build）

1. `deriveTools()` 名字集含 `next`（可判）；
2. `NEXT_TOOL_SCHEMA.parameters` 结构与 `AiNextCandidate` 同构（逐字段可判）；`maxItems === MAX_CHIPS_PER_CARD`；`enum` === 重算式；
3. `description` 三约束句各在（逐句断言）；`assertNoPlaintext([description])` 通过；
4. `parity` 绿 + `pluginExtras['next']` 两字段非空；反证「删条目 / 空 reason ⇒ 必红」；
5. 反证「`next` 工具触达真实写 / 网络 / 时钟 ⇒ 必红」（`executor` 永不被调用：以「`dispatch` 被调 ⇒ 必红」判据覆盖）。
