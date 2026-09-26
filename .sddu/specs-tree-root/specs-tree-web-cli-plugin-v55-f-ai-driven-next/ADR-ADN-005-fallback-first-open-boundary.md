# ADR-ADN-005: 确定性兜底、零死端与首开边界（PD-ADN-001 裁决）

## 状态
ACCEPTED（承父 spec §5.5 FALLBACK FR-ADN-040~046 · §5.8 OPEN FR-ADN-070~073 · §11 DC-ADN-007/010 · §12 X-ADN-10 · N-ADN-008/024/025 · PD-ADN-001）

## 背景

R8（`38565ac`）刚修好「首开零 next 死端」：`maybeRecommendOpenEntry` 复用既有 `'idle'` + `recommendNextStep` 的零死端 floor 铸「仅含 free-input 终端」最小卡 ⇒ 首屏必有可达 next。AI 化**必须**让这条保底路径仍在兜底位，否则一次 AI 往返失败即回归死端（R-ADN-003）。

确定性路径现状（**只读复用、零改写**）：

- floor：`suppression === 'empty'` ∧ 终端在场 ⇒ 铸「仅含终端」最小卡（`recommend.ts:506-517`）；
- 终端恒真 provider（`free-input`，`when` 恒真）+ 恒最末（非 `.next-chip`、不进 `MAX_CHIPS_PER_CARD`）；
- 四道硬门：`pending` / `interval` / `empty` / `safety`（`safety` **不走 floor**，fail-closed）；
- 首开：`maybeRecommendOpenEntry`（`sidepanel.ts:2279-2286`）+ 让位 `firstRunCard.visible === !(configured ∧ authorized)`（零双卡）。

## 决策

### ① 注册表 = 兜底与安全闸（三情形）

| 情形 | 行为 |
|---|---|
| **未配 LLM** | **零** AI 候选产出（零网络 / 零 provider 调用；SW 连 `chatBusy` 都不占，`variant='llm-unconfigured'`）；纯确定性（现状逐字） |
| **AI 未产出**（无块 / 解析失败 / 空数组） | 零 `aiNext` 字段 ⇒ `ai-next.when === false` ⇒ 确定性注册表产卡（含 floor） |
| **AI 候选全部被拦** | `accepted.length === 0` ⇒ 同上；`blocked` 只产生可读留痕，不改候选面 |

### ② `free-input` 终端恒常驻（R8 不回归）

- **AI 候选不改变终端语义**：终端仍由**唯一** `free-input` provider 的 `when`（恒真）决定，由 `recommendNextStep` 单点注入到选中卡末端并恒最末。
- AI 候选**不进 floor**：`suppression === 'empty'` 且终端在场时仍铸「仅含终端」最小卡（AI 候选在此情形按其 `when` 已为假）；`safety` 仍**不走 floor**。
- 反证：删终端 / 删 floor ⇒ `r8-open-next-entry` / `free-input-next` / `no-dead-end` **必红**（须能 FAIL，非恒真）。

### ③ 在飞（`pending`）语义不变（EC-ADN-009/010）

- `recommendNextStep` 的 `pending` 硬门**逐字不动** ⇒ 在飞不产卡；
- AI 候选在 `pending=false` 后（即 `done` 结题）才可能显示；在飞时该次求值被抑制 ⇒ **当次候选按事件作用域丢弃**（见 ④），后续可达 next 由既有 `idle` 时机接续（非死端）；
- AI 候选的**自动成回合**仍撞既有仲裁：`pressCandidate` ⇒ `blocked:busy`（**不排队**）；`ARBITRATION_RESULTS` 四值逐字不动（`turn-arbitration` 保留）。

### ④ 事件作用域（有界性）：`pendingAiNext` 只喂**一次**求值

- 面板在 `done` 分支把 `msg.aiNext` 存为**模块级单槽** `pendingAiNext`，**紧接着**的 `maybeRecommend('idle')` 消费它；`maybeRecommend` 在构造 `input` 后**清空**该槽（**事件作用域**，与 v5.5 的 `armed` / `lastAutoDrivenKey` 同构）。
- 抑制（`pending` / 关断）⇒ 该次候选**丢弃**，**不得**滞留到后续无关触发（防「陈旧 AI chip」＝题眼要消灭的「两张皮」以新形态回归）；
- 反证：「把 `pendingAiNext` 做成常驻 ⇒ 后续 `stale`/`pick` 触发复现旧候选 ⇒ 必红」。

### ⑤ 首开（open / ready）**保持确定性**（PD-ADN-001 裁决：本轮不做首开 AI 化）

- `maybeRecommendOpenEntry` 逐字复用 `'idle'`；`authorized ∧ configured ∧ 探测未 ready` ⇒ 由 floor 铸「仅含终端」最小卡 ⇒ **首屏零 LLM 往返依赖**（N-ADN-025）；
- 首开求值时 `pendingAiNext` 恒为空（面板刚起、无回合结题）⇒ 结构上不可能有 AI 初始 next；
- 让位 `firstRun` 语义保持（零双卡，FR-ADN-072）；
- **AI 初始 next**（问候 / 能力探测建议）**明列后续轮**：若做须保留确定性兜底 + 超时降级（登记 `PD-ADN-001`，本轮 `deferred`）。

### ⑥ `error` 结题点：零候选（口径登记）

`variant='error'` 分支的既有 `maybeRecommend('idle')` **保留**（挂点复用），但**不产出** AI 候选（ADR-ADN-001 §①）⇒ error 路径恒走确定性兜底。

## 后果

- 「AI 化不回归」的四个面（兜底 / 终端 / 在飞 / 首开）各有独立判据与反证；
- **代价**：无（本 ADR 主要是**保持**既有语义 + 一处面板侧单槽有界性）；
- **已知限制**：在飞时结题的 AI 候选被丢弃（不排队、不滞留）—— 与「在飞不产卡 + 不制造死端」两纪律一致，登记为本轮口径。
