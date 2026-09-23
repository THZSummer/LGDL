# ADR-SGO-001: 引用事实进回合（`chat` type-only `refs` + 系统段基座/追加段 + 回合发起时快照 + 留痕口径）

## 状态
ACCEPTED

## 背景

**母缺陷（根因 A/B/E）**：唯一回合载荷是 `{ user }`（`sidepanel.ts:329` `send(makeMessage('chat', { user: trimmed }))` → `service-worker.ts:2636` `message.user` → `runChat(s, user)` 裸字符串）；系统段是**静态常量** `SYSTEM_PROMPT`（`service-worker.ts:107-118`，全文无「引用」/「范围」条款），经 `:943` / `:948` 注入。面板持有引用表（`l1/ref-store.ts`），SW 不持有（`service-worker.ts:951` `s.host.dispatch`）⇒ **「用户指的是哪一处」在整个链路上物理不可见**。

**决定性反证**（`ty.md:545-551` / `:563-567`）：AI 已亲手读到 `data-wcli-ref="ref_1"` 且 `[data-wcli-ref]` 恰 1 命中，**仍然**整页改写 ⇒ 问题不是能力，而是**引用事实未进回合**。

**spec 裁决（O-SGO-002 / DC-SGO-002 / O-SGO-003 / DC-SGO-003 / FR-SGO-010~019）**：引用事实以 **`chat` type-only 结构化载荷**进回合 + **系统段基座 + 每回合追加段**（双轨：读数 = 判据 / 提示词 = 引导）；口径写死：**页面文本可入 LLM 上下文 / 凭据值不可（法八）/ 留痕仍只含字段名**。

## 决策

### 1. 载荷落点：既有 `chat` kind 的 **type-only** 字段（不新增 kind）

在 `background/messaging.ts`（type-only 家系先例 = `ChatResultVariant`，`messaging.ts:100-125`）**恰一处**声明：

```ts
/** 一条进回合的活跃引用事实（唯一 wire 形状；生产构建点与门禁共用同一字段集）。 */
export interface ChatRefFact {
  readonly refNum: number;            // 稳定业务序号（ref_7 → 7）
  readonly refId: string;             // = data-wcli-ref 值（单点铸造）
  readonly selector: string;          // 捕获时的稳定选择器（全量，非展示截断）
  readonly refMark: string;           // [data-wcli-ref] 值（= refId，单点铸造）
  readonly textDigest: string;        // 页面文本摘要（≤80 字，捕获口径）
  readonly refState: 'valid';         // **只可能是 valid**（invalid/unknown 不入表，fail-closed）
  readonly nodeCount?: number;        // 已知时的节点数（`--ref` live 闸另判）
}
export interface ChatRefTurnPayload { readonly refs?: readonly ChatRefFact[]; }
```

- `KIND_SET` **40 项逐字不动**（refs 是 payload 字段，**不是** kind）；type-only ⇒ 编译器擦除，**零运行时字节**（`content.js` 零容差不受影响）。
- 消息体 `PluginMessage` 已有 `[k: string]: unknown` 索引签名 ⇒ **无需改动**消息结构。

### 2. 唯一构建点 = `requestTurn`（两条入口同口径）

`sidepanel.ts:304` `requestTurn` 内**恰一处**构建 `refs` 快照：

```
const refs = turnRefsOf(l1?.store().all() ?? []);   // 单源：只取 verdict === 'valid' ∧ 未退役
void send(makeMessage('chat', { user: trimmed, ...(refs.length ? { refs } : {}) }));
```

- **两条回合入口**（驱动者自动成回合经既有 `op.turn` 槽 / 手动 composer）**共用** `requestTurn` ⇒ 同口径（FR-SGO-013/014）；`requestTurn(` **仍恰 2 处**（`sidepanel.ts:3581` composer / `:3608` `op.turn` 槽）。
- `turnRefsOf(records)` **恰一处**（`l1/ref-scope.ts`，见 ADR-SGO-002 §1）：过滤 `record.verdict === 'valid' && !record.retired`，把 `RefRecord` 投影为 `ChatRefFact[]`；`refMark` = `refId`（单点铸造，`content/ref-capture.ts:370` 写入 `data-wcli-ref = refId`）。
- **零引用 ⇒ `refs` 字段缺席**（不是空数组）：与现状逐字相同。

### 3. 取数通道 = **回合发起时快照**（零新通道）

- 快照在**回合发起时**读取，随 `chat` 消息下发；**SW 的引用事实唯一来源 = 回合载荷**（FR-SGO-019）。**不新增** 面板→SW 的引用表通道，SW **不**直连面板表。
- 排队回合（`runChat` 的 `turnQueue`）**自带快照**：`QueuedTurn` 增 `refs`（`background/turn-queue.ts`，B 列）⇒ drain 出的回合用**入队时**的快照，**零跨回合漂移**。

### 4. SW 组装：常量基座 + **每回合追加段**

- `service-worker.ts` `case 'chat'` 读 `message.refs` → 运行时校验（`ref-payload` 校验：形状 / 正整数 `refNum` / 非空 `selector` / `refState === 'valid'`；非法项**逐项剔除**，不静默污染）→ `void runChat(s, user, refs)`。
- `runChat(s, user, refs)`：`system: () => SYSTEM_PROMPT + refContextSegment(refs)`。`runChatTurn` 已支持 `system: string | (() => string)`（`chat-runner.ts:23`）⇒ **不改 `chat-runner.ts`**。
- `refContextSegment(refs)`（NEW `background/ref-context.ts`，B 列）：
  - 无 refs ⇒ 返回 **`''`** ⇒ `system === SYSTEM_PROMPT`（**逐字**，N-SGO-029 / EC-SGO-008）。
  - 有 refs ⇒ 返回 `'\n\n' + <引用事实行：refNum / selector / textDigest / refState / refMark> + <法则引导文本>`。
  - **`SYSTEM_PROMPT` 常量逐字保留为基座**（5 条既有条款不改）；追加段是**引导**（ADR-SGO-002 §3：判据不读提示词）。
- 递归 `runChat(s, drained.user, drained.refs)`：排队回合用其自带快照。

### 5. 零明文口径（写死，FR-SGO-012）

| 项 | 口径 |
|---|---|
| 页面文本（`textDigest` / `selector`） | **可**入 LLM 上下文（页面内容，非凭据） |
| **凭据形** `textDigest`（匹配凭据形 ⇒ 例：`sk-…`） | **掩码后**才入上下文（EC-SGO-019）：复用 `@lgdl/web-cli-base#maskTextPayload`（`src/security/redact.ts` 已 re-export） |
| 凭据值（Key / token / 密码） | **绝不**入任何面（LLM 上下文 / 法八四面） |
| 留痕 | **只含字段名**（不含任何用户内容值）；对齐 `next-registry/ai-drive.ts:85` |

### 6. 留痕口径

- 既有驱动者留痕三要素（`driverTraceLine`）**逐字不动**（`driver=<id> | timing=<timing> | evidence=<字段名集>`）。
- 范围相关留痕由 ADR-SGO-002 §5 的**范围行单源**承载（字段名 + 机器枚举读数词 / actor；**零用户内容值**）。

### 7. 主流程 diff = 0（机核）

| # | 判据 | 现状 | 本 Feature |
|:-:|---|---|---|
| 1 | `requestTurn(` 调用点 | 恰 2 | **恰 2，原判据不改**（X-SGO-1 / X-SGO-7） |
| 2 | `maybeRecommend(` 定义 / 调用点 | 1 / 7 | **1 / 7 不增** |
| 3 | `nextAfterSettle(` 定义 / 调用点 | 1 / 10 | **1 / 10 不增** |
| 4 | `op.execute(` | 恰 1 | **恰 1** |
| 5 | `KIND_SET` 长度 | 40 | **40** |

### 8. PD-SGO-002 裁决：**不做每回合只读重观测**（NG-SGO-013）

用回合**已有**的引用事实即可判范围；不引入每回合页面探测（性能 + token 成本）。**唯一的 live 只读观测**是 `--ref` 的**每写一次**单节点闸（ADR-SGO-003 §5）—— 口径显式区分（R-SGO-913）。

### 9. PD-SGO-003 裁决：**保持 7 项最小集**

`refNum` / `refId` / `selector` / `refMark` / `textDigest` / `refState` / `nodeCount` 已足以判「命中」；**不加** `semanticPath` / `origin` / `navSeq`（加法项，留后续轮；减体积优先）。

## 后果

**正面**
- 「用户指的是什么」从**物理不可见**变为**可判命中**（S0′-3）；两条入口同口径，手动回合不再缺引用。
- `KIND_SET` 40 / `content.js` 零容差**结构性不受影响**（type-only 零字节）。
- 零引用回合**逐字不变**（`system === SYSTEM_PROMPT`），回归面清晰可机核。
- SW 引用唯一来源 = 回合载荷 ⇒ 无跨进程表同步、无第二真值源（根因 E 被消除）。

**负面 / 代价**
- `chat` 载荷新增一个字段面，需在 SW 侧做**运行时校验**（非法项剔除）—— 由 `ref-context.ts` 承担。
- 排队回合需携带快照（`QueuedTurn.refs`）⇒ `turn-queue.ts` 小改（B 列，不计账）。
- 加载面：面板每次回合发起读一次 store（已在本地面板，零额外页面探测）。

**被否决的替代**
- **把引用拼进 `user` 文本**（NG-SGO-014）：污染用户可见行，且与「我」行留痕语义冲突。
- **每回合重观测后注入**（NG-SGO-013 / O-SGO-003 ③）：引入每回合页面探测（性能 / token 成本）。
- **新增 `refs` kind 或第三载荷通道**（方案 B）：`KIND_SET` / `content.js` 零容差即红（N-SGO-001/009）。

**判据锚**：`test/ref-context-in-turn.test.ts`（载荷 type-only / 两入口同构建点 / 基座逐字 / 零引用零漂移 / 凭据掩码）· `test/op-wiring.test.ts`（调用点计数原判据不改）· `test/ui/law8-plaintext.mjs`（§4 凭据掩码 + 计数只增）。
