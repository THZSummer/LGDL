# ADR-ADN-001: AI next 候选的产出通道与提示/解析协议（PD-ADN-002 / PD-ADN-003 裁决）

## 状态
ACCEPTED（承父 spec §5.1 CHAN / §5.2 FR-ADN-010~019 · §11 DC-ADN-002/003/016 · §12 X-ADN-2/5 · PD-ADN-002/003）

## 背景

next 候选今天**只**由确定性注册表产出（`recommend.ts:487` 单内核 + `providers.ts` 11 行 provider）；`chat-result` 载荷字段穷举 = `variant/text/retrying/tool/ok/ms/targetSelector`（`chat-events.ts:48-66`），**无任何结构化 next 字段**；AI 结题口述的下一步只落 `assistant` 文本（`sidepanel.ts:4185`）⇒ 「两张皮」（Q-ADN-002）。

三条硬约束同时成立：

1. **零新增 kind**：`KIND_SET` **恰 40** / `STREAM_EVENT_KINDS`+`CARD_TYPES` **12 kind** / `REGISTERED_STRUCTURAL_HOSTS = []`（F-5；N-ADN-003/004）；
2. **零新 LLM 面**：`recommend.ts` 必须保持 pure（真值白名单 7 / 模块白名单 5 / 源码零 `fetch(`·`chrome.`·时钟；F-1/F-2；FR-CHAT-060；X-ADN-2 保持）；
3. **系统段形态被既有门禁钉死**：`test/ref-context-in-turn.test.ts` RCT-3 要求 `system` 工厂**逐字** = `() => SYSTEM_PROMPT + refContextSegment(refs)`，且 `SYSTEM_PROMPT` **5 条既有条款逐字**、**零引用 ⇒ `refContextSegment([]) === ''` ⇒ system 逐字等于基座**（N-SGO-029 / EC-SGO-008）。

## 决策

### ① 时机 = 复用既有 `'idle'`；**只在 `variant='done'` 结题点解析**

- 不新增第 6 触发词（`DRIVER_TIMINGS` 恰 5 不动；DT-2/DT-3 绿；X-ADN-5 = 未发生取代）。
- AI 候选**仅在成功回合（`variant='done'`，`openAsks===0`）**产出。`variant='error'` 结算点照旧走既有 `maybeRecommend('idle')`（**零候选** ⇒ 确定性兜底）——失败回合没有「结题口述的下一步」语义，半成品输出不得被推荐。
  > 口径登记：父 FR-ADN-010 对 `error` 的引用按「**复用既有挂点**」读（挂点确实在），**不**要求 error 回合产出候选；S0''' §372 亦只以 `done` 为产出点。

### ② 载体 = `ChatResultEvent` 的 **type-only 加法字段**（单声明；零新增 kind）

新增**恰一个**载荷字段（`chat-events.ts`，与既有 R6 `targetSelector` 同构的加法字段）：

```ts
export interface ChatResultEvent {
  // …既有 7 字段逐字保留…
  /** AI next 候选（type-only 词汇；∉ KIND_SET）。缺席 ⇒ 面板行为与现状逐字一致。 */
  aiNext?: AiNextPayload;
}
export interface AiNextPayload {
  readonly accepted: readonly AiNextCandidate[];      // 已过 5 道校验链
  readonly blocked: readonly AiNextBlockedCode[];     // 被拦原因码（闭集，零值）
}
```

- **单声明**：`AiNextCandidate` / `AiNextBlockedCode` / `AiNextPayload` 在 `next-registry/definition.ts` 各**恰一处**声明（与 `NextCtx` 同居 ⇒ `recommend.ts` 零新导入 ⇒ 模块白名单恒 5；见 ADR-ADN-004）。
- **不新增消息 kind / 卡 kind / 宿主**；骑既有 `chat-result` kind 作 payload 字段（承 `ARBITRATION_RESULTS` / `ChatRefFact.refs` / `targetSelector` 先例）。
- **缺席 ⇒ 现状逐字**（N-ADN-029；FR-ADN-018）：无 `aiNext` 字段时面板零行为差。

### ③ 提示词 = 骑 `refContextSegment` 的**非空追加段**（基座与工厂形态零改）

**不改** `SYSTEM_PROMPT` 基座、**不改** `system` 工厂形态（RCT-3 逐字保持）。AI next 的产出契约作为一句机器可读指令并入 `background/ref-context.ts#refContextSegment` 的**有引用分支**：

- 无引用 ⇒ 追加段仍 `''` ⇒ `system === SYSTEM_PROMPT`（RCT-3/RCT-4 保持绿）；**零候选**（见 ADR-ADN-004 PD-ADN-005：本轮只在 ref-action 上下文产出）。
- B 轨（引导）性质不变：`ref-context.ts` 是**引导**，门禁**不读**提示词（法九 L9-8 口径；`test/law9-scope-reading` 零改）。

### ④ 协议 = 尾随围栏块 + 严格 JSON；逐项容错（PD-ADN-002 裁决）

~~~text
<fence info="next">
[{"opId":"op.turn","label":"把这页图改成架构图"},
 {"opId":"op.help","label":"看看还能做什么"}]
</fence>
~~~

（即：三反引号 + `next` 作为 info 的尾随围栏块，块内为标准 JSON 数组。）

解析口径（`background/ai-next.ts`，纯函数）：

| 规则 | 口径 |
|---|---|
| 取块 | 在**本回合最后一条** `assistant` 文本中，取**最后一个** 围栏 info 为 `next` 的块（大小写不敏感）；中间轮次的 assistant 文本**不参与**（避免陈旧 / 半程块） |
| 取 JSON | 严格 `JSON.parse`；顶层必须是**数组**；否则 ⇒ **零候选**（支线 C，不是错误、不写 blocked） |
| 逐项容错 | 非对象项 ⇒ 丢弃（形状未成候选，不写 blocked）；对象项进入 5 道校验链（ADR-ADN-002），失败项各自 `blocked=` |
| 上限 | 解析阶段不设条数上限（合并层取前 N=3 + 截断，见 ADR-ADN-004） |
| 零新增 LLM | 复用**刚结束回合**的输出；无第二次 provider 调用、无新网络面（FR-ADN-017） |

### ⑤ 执行位置 = SW（B 列优先）

解析在 `background/ai-next.ts`；提示词装配在 `background/ref-context.ts`（SW 侧）。面板**只接收已校验候选**（FR-ADN-016）。归因见 ADR-ADN-008。

### ⑥ `label` 的净化 / 截断（PD-ADN-003 裁决）

- **SW 侧**：形状必须为非空 `string`；先做**零明文扫描**（复用既有 caliber `assertStreamPlaintext` ⇒ `stream-digest#assertNoPlaintext`，**不新写净化器**），命中 ⇒ 该候选 `blocked=label` 丢弃（fail-closed、非崩溃）；通过后再按 `AI_NEXT_LABEL_MAX = 48` **先扫后截**（截断不掩护泄漏）。
- **面板侧**：`recommend.ts#candidate()` 的 `label([...])` **仍是唯一**明文净化工厂（幂等：已净化的字符串再过一次仍绿）⇒ 单源不破。
- 留痕**只含字段名**（`evidence=session.aiNext`）与**原因码**，**零值**（N-ADN-009 / NFR-ADN-016）。

## 后果

- **正向**：AI 从「有手无口」变成「有一张受校验的口」；载体零新增 kind；提示词零改基座；`error` 路径与无引用路径行为逐字不变。
- **代价 / 已知限制**：
  - LLM 的结构化遵从度是**实现自由度**（ADR-ADN-007 以「纯函数校验器 + 注入反证」机核，不依赖真 LLM）；
  - 围栏块协议依赖模型配合；不配合 ⇒ 走支线 C 兜底（不回归）；
  - `AI_NEXT_LABEL_MAX` 是**显示上限**（非六常量护栏阈值，零第二阈值）；密度门禁为最终仲裁。
- **失败模式**（均有反证）：解析失败静默当候选 ⇒ 注入反证必红；label 泄漏 ⇒ `blocked=label` + `law8-plaintext` 必绿；新增 kind ⇒ `KIND_SET` 41 必红。

## 备选方案（明确拒绝）

| 备选 | 拒绝理由 |
|---|---|
| 新增专用消息 kind / 卡 kind | 撞 `KIND_SET` 40 与 `content.js` 字节冻结（R-ADN-008） |
| 新增 tool-call（让模型调「产 next」工具） | 会新增工具面 ⇒ 触 `toolCount` / 工具目录 / `insight-action-parity` 等既有契约；且改变回合内驱动语义（NG-ADN-001） |
| 第二次 LLM 调用（结题后单独问「下一步」） | 破 FR-CHAT-060 零新 LLM 面 / 成本 / 延迟（X-ADN-2 会被迫取代） |
| 改 `SYSTEM_PROMPT` 基座加指令 | 破 RCT-3 基座逐字 + 无引用 ⇒ 基座逐字（N-SGO-029） |
| 只靠未声明的文本约定（不加提示词） | 遵从度不可判、无契约；不满足 PD-ADN-002「结构化产出」 |
