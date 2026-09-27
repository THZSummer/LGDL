# ADR-NDA-006: 提醒补一次 —— `chat` 回调内续呼 + `nudgeUsed` 有界 + 防环 + 零计数漂移

## 状态
PROPOSED

## 背景

作者口径①逐字：「对话结束如果 LLM **没有调用 next 工具**，记得你要**提醒 LLM**，做好最后兜底」。现状**完全没有**提醒机制：

- 基座 agent 循环在 assistant **无 `tool_calls`** 时立即收尾（`runner.ts:188-193`：`reply ⇒ finish('completed')`，无 reply ⇒ `finish('empty')`）——**没有回合后注轮钩子**（Q-NDA-008 事实成立）；
- 插件的 `onFinish`（`service-worker.ts:1027-1043`）只做「解析 + 校验 + 装配」，**无**提醒逻辑；
- 插件唯一的回合容器 = `runChatTurn`（`chat-runner.ts:44-64`），每次调用 = **一次** agent run，且把回合提交进会话（`:63 deps.session.commit(current)`）。

⇒ 提醒必须在**插件侧**发明；且**必须**满足三条硬约束（spec）：**恰一次（有界）**、**防环**（提醒轮不得再提醒 / 不绕护栏 / 不新增 `nextAfterSettle` 调用点）、**不成为第二产出通道**（复用 `next` 工具 + 同一 5 道链）。

## 决策

### ① 通道 = **SW `chat` 回调内的同回合续呼**（不新增回合容器）

`runChat` 的 `chat` 回调（`service-worker.ts:986-999`）是**每轮**被调用的唯一交付点，且拿到完整 `ChatResult`（含 `toolCalls`）。改造成：

```ts
// runChat 内：本回合事件作用域状态（与 lastAssistantText / toolStartedAt 同居，runChat 局部）
const turnState = { captured: false, nudgeUsed: false };
...
chat: async (turns, system) => {
  const cfg = { providerId: settings.providerId, apiKey: settings.apiKey, model: settings.model, baseURL: settings.baseURL };
  const call = (t: ChatTurn[]) => providerChat(cfg, [{ role: 'system', content: system }, ...t], s.host.deriveTools());
  let res = await call(turns);
  if (shouldNudge({ configured, toolCalls: res.toolCalls.length, hasReply: res.content.trim().length > 0, captured: turnState.captured, nudgeUsed: turnState.nudgeUsed })) {
    turnState.nudgeUsed = true;                    // ★ 先置位：nudge 轮失败也不会有第二次
    res = await call([...turns, { role: 'user', content: NUDGE_TEXT }]);   // ★ 续呼（局部 turn，不进会话）
  }
  batchConsent.setPlan(await buildPlan(res.toolCalls, refs));   // ★ 用**最终** res（计划与实际写入同源，R-SGO-906 不破）
  return res;
},
```

- **续轮仍在同一次 `runChatTurn` 内** ⇒ 零新增 `runChatTurn` 调用点、零新增 `requestTurn(` 调用点、零新增 `nextAfterSettle` 调用点；
- **nudge turn 不进会话历史**：`chat-runner.ts:47,53,63` 提交的是 **runner 自己的** `turns` 数组（`current`），我们传给 `providerChat` 的加长数组是**局部变量** ⇒ 会话历史零污染（可判：nudge 后 `session.snapshot()` 不含 nudge 文本）；
- **nudge 轮仍要过同一 `deriveTools()`**（工具面含 `next`）⇒ nudge 是**同一产出通道**（FR-NDA-066），无第二解析器 / 第二校验器；
- `nudgeUsed` 是 `runChat` **局部**对象 ⇒ **每回合**（含 drain 出的回合，`:1082` 递归调用 `runChat`）重新开始 ⇒ 有界。

### ② 判定单源（**纯函数，node 可判**，FR-NDA-106）

**NEW** `packages/web-cli-plugin/src/background/next-drive-policy.ts`：

```ts
export interface NudgeFacts {
  readonly configured: boolean;   // = isLlmConfigured(...)（SW 在 :945 已算；本 Feature 提为 const configured，单源）
  readonly toolCalls: number;     // 本轮 res.toolCalls.length
  readonly hasReply: boolean;     // res.content.trim().length > 0
  readonly captured: boolean;     // 本回合 intercept 是否捕获过 next 调用
  readonly nudgeUsed: boolean;    // 本回合是否已提醒
}
/** 恰一次 + 防环：五条件齐（缺一即 false）。顺序即语义优先级。 */
export function shouldNudge(f: NudgeFacts): boolean {
  if (f.nudgeUsed) return false;          // ① 有界（防环：提醒轮不再提醒）
  if (!f.configured) return false;        // ② 已配置（未配置相不下发 / 不提醒）
  if (f.captured) return false;           // ③ 本回合已捕获 next ⇒ 不提醒
  if (f.toolCalls !== 0) return false;    // ④ 本轮仍有工具调用 ⇒ 回合未收尾
  return f.hasReply;                      // ⑤ 有非空回复（排除 empty / 事故路径）
}
```

- 「**告知**」把 `configured` 设为显式入参而不是隐含前提：`FR-NDA-060` 的三条条件（已配置 ∧ 正常结束 ∧ 未捕获）因此**在同一条判据里可判、可 FAIL**（禁恒真，NFR-NDA-014）；
- 判据**无 DOM / 时钟 / IO / chrome** ⇒ node 门禁可直接调用（`FR-NDA-106`）。

### ③ nudge 文本（口径逐字，可判）

```ts
export const NUDGE_TEXT =
  '你还没有调用 `next` 工具。请现在调用一次 `next` 工具，给出下一步候选（最多 3 条）；' +
  '如果确实没有建议，调用 `next` 并给空 `candidates` 数组。不要重复上面的答案。';
```

- 门禁按**两句**断言（「调用一次」+「空数组兜底」）；
- 文本**零明文**（不携带用户正文 / 凭据）；
- 与工具 `description` 的约束句**不重复声明**（description 是契约，nudge 是补救提醒）。

### ④ 与 spec 字面的**时点偏差**（如实登记 `PD-NDA-016`）

FR-NDA-060 字面 = 「回合**正常结束**（`completed`）∧ 未捕获 ⇒ 提醒」。本设计在「**本轮无 `toolCalls`（模型正在收尾）**」处触发 —— 比 `finish('completed')` **早一步**（`runner.ts:188-193` 立即收尾，`onFinish` 在 `:99-105` 才发生）。

| 面 | 差异 | 处置 |
|---|---|---|
| 等价性 | 「无 `toolCalls`」⇒ 基座**唯一**的去路是 `finish('completed')` 或 `finish('empty')`（`:188-195`）；两者都属「回合结束」 | 语义等价 |
| 不等价的边角 | ① `stop()` 在 provider 返回后被置位（用户点了停止）⇒ 本设计可能多发一次 nudge；② `round > maxRounds` ⇒ `max-rounds` | 用 `hasReply` 收窄（排除 empty）；`stop` 窗口**有界且至多 1 次**；登记为已知偏差 + `PD-NDA-016` |
| 为什么不能精确到 `onFinish` | `onFinish` 时回合已结束 ⇒ 只能开**新回合容器**（方案 A：污染会话 + 可能新增计数调用点）或**面板侧再驱动**（方案 C：第二驱动面） | 结构性取舍，已在 §备选 说明 |

### ⑤ 防环 / 有界 / 不绕护栏（逐条可判）

| 要求 | 落地 | 判据 |
|---|---|---|
| 恰一次 | `nudgeUsed` 单布尔 + `shouldNudge` 首闸 | `nudgeUsed=true ⇒ shouldNudge=false`（判据**可 FAIL**：注入忽略该位 ⇒ 必红） |
| 提醒轮不得再提醒 | `if` 每轮只求值一次；置位在调用**之前** | 反证「提醒两次 / 无限续轮 ⇒ 必红」（EC-NDA-021） |
| 不新增 `nextAfterSettle` 调用点 | nudge 不碰结算 → 时机链 | `op-wiring` OP-W-8（`nextAfterSettle` 1 定义 10 调用点）**零改** |
| 不新增 `requestTurn(` 调用点 | 同上 | `op-wiring` OP-W-6（`requestTurn(` 恰 1）**零改** |
| 不绕护栏（`proactivity` 六常量） | nudge 只影响「LLM 是否被再问一次」，**不**增加自动成回合次数（`driveAnsweredTurn` 不动） | `proactivity-guard` / `guard.ts` 零改 |
| 撞在飞仲裁 | nudge 在 `chatBusy === true` 的**同一个** `runChat` 内 ⇒ 无独立回合可被仲裁 | `EC-NDA-013` 由「不排队」**强化**为「不存在可仲裁的第二个回合」 |
| 在飞不产卡 | 提示期间 `pending` 仍为真 ⇒ 面板 `pending` 硬门不动 | `recommend.ts:567` 零改 |

### ⑥ 计数等价重锚（X-NDA-11 **降级为「未发生取代」**）

| 计数 | 现状 | 本设计 |
|---|---|---|
| `requestTurn(` | 恰 1（`op-wiring` OP-W-6 / FIN-3） | **零改** |
| `maybeRecommend` | 1 定义 8 调用点 | **零改**（nudge 不触发面板求值；回合结束仍由 `chat-result{done}` → `consumeAiNext` → `maybeRecommend('idle')`） |
| `nextAfterSettle` | 1 定义 10 调用点 | **零改** |
| `runChatTurn(` 调用点 | 2（`runChat` + drain） | **零改** |
| `DRIVER_TIMINGS` | 恰 5 | **零改** |

⇒ `X-NDA-11` 从 spec 的「预登记（触发 = 提醒续轮通道形态）」变为 **`no-supersession`**（未发生取代）—— 这是本 ADR 带来的**净收益**（少一处门禁重锚）。

### ⑦ 提醒轮失败 ⇒ 直接进系统兜底

nudge 轮抛错（provider 失败 / 网络）⇒ 异常向上冒泡到基座（`runner.ts:136-138`）⇒ `handleLlmError`（`:107-119`）首次重试（push 纠错 user turn）；连续第二次 ⇒ `finish('llm-failed')`。此时 `turnState.nudgeUsed === true` ⇒ **不会再 nudge**；`onFinish` 的异常判定（ADR-NDA-007）落 `llm-failed` ⇒ 系统兜底推荐。**「提醒轮仍失败 ⇒ 不再重试」由此结构性成立**（FR-NDA-065）。

## 备选方案

| 方案 | 处置 |
|---|---|
| A：`onFinish` 后起第二次 `runChatTurn` | ❌ ① `runChatTurn` 会把 nudge user turn **提交进会话**（`chat-runner.ts:63`）⇒ 历史污染（用户会看到一句他从未说过的话）；② 需要新的 `chatBusy` / 队列 / 仲裁协调（可能新增计数调用点）；③ 与「无死端」的 `busy` 语义纠缠 |
| C：面板侧定时再驱动一次 chat | ❌ 第二驱动面（A 列 + 绕过 SW 判定）；与用户下一条消息竞态；`pending` / 队列语义复杂化 |
| D：不提醒，直接进系统兜底 | ❌ 直接违反作者口径①（「记得你要提醒 LLM，做好最后兜底」） |
| E：把 nudge 做成系统提示的**第二轮 system** | ❌ 基座 `system` 工厂每轮都会重算（`runner.ts:129`）但没有「第二轮」机会（无 toolCalls 即收尾）；且 system 面是**基座 5 条 + 追加段**的冻结面（`ref-context-in-turn` RCT-3 逐字判据），往里塞 nudge 会破契约 |

## 后果

**正向**：
- 「提醒补一次」在**零新增回合容器 / 零会话污染 / 零计数漂移**下落地（本 Feature 最难的约束组合）；
- 有界性 / 防环由**纯函数**判据表达 ⇒ node 面可判、可 FAIL、可注入反证（不依赖真实 LLM）；
- 净减一处门禁重锚（X-NDA-11 → `no-supersession`）；
- 「撞车不排队」被结构性强化。

**代价 / 风险（如实登记）**：
- **每个已配置的「纯文本收尾」回合多一次 provider 调用**（这是作者口径①的直接成本；`NFR-NDA-015` 明示允许，且 ≤1）；
- 触发时点比 spec 字面早一步（`PD-NDA-016`），`stop()` 窗口内可能多发一次（有界 1 次）；
- B 列增量 ≈ +0.5~1.2 KB（`next-drive-policy.ts` NEW + `chat` 回调改造）；
- 「nudge 是否让回答显得重复」属**人工面**（`§9.4 M3 ⏳ 未执行`），不得冒充 PASS。

## 落地判据（供 tasks/build）

1. `shouldNudge` 纯函数（无 `chrome` / 时钟 / DOM / `fetch`）；五条件真值表逐条（含 `nudgeUsed=true ⇒ false`）；
2. 反证「忽略 `nudgeUsed` ⇒ 必红」（二阶提醒）；「删掉 `hasReply` ⇒ 必红（empty 路径误提醒）」；
3. `chat` 回调内：nudge 使用**同一** `deriveTools()` 与同一 cfg；nudge turn 只出现在**局部**数组（会话 `snapshot()` 可判）；
4. `op-wiring` / `driver-timings` / `driver-quadruple` / `free-input-next`（FIN-3）**全绿且计数未变**（X-NDA-11 = `no-supersession` 台账）；
5. nudge 轮失败 ⇒ `llm-failed` ⇒ 系统兜底可达（端到端断言：提醒 → 无产出 → 兜底 chip）；
6. 每回合 nudge 次数 ≤1（运行断言 + 源文本判据双面）。
