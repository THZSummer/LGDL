# ADR-NDA-005: `configured` 单源判据与自由输入分相（零新 ctx 字段 / 零第二偏好键）

## 状态
PROPOSED

## 背景

作者口径②逐字：「自由输入在没有 LLM 的场景下，**是不可行的**，只能给**确定性操作**」。可行性事实：未配置提交走零 token 路径（`service-worker.ts:945-956` 返 `variant:'llm-unconfigured'`，**不发起 provider 调用**）⇒ 点了自由输入只会得到「未配置」引导 —— **死路**。

但 F-36 的 `free-input` provider `when` **恒真**：

```ts
// providers.ts:217
when: (ctx) => ctx.session.busy === true || ctx.session.busy === false,
```

⇒ 未配置时推荐卡末端**仍铸**「自由输入…」终端（`:218-219`）。同时 R8 / F-35 的成果「**已配置 ⇒ 流内输入即 next**」是**既有地板**，**不得**被未配置分相误伤（N-NDA-008 / R-NDA-003 高）。

⇒ 需要一个「**是否配置 LLM**」的**单源**判据，且**不得**新增 ctx 真值源（`NEXT_SOURCE_NAMES` 恰 7，`definition.ts:76`；`recommendation-sources` ①~④ 机核）也**不得**写第二份配置真相 / 第二偏好键（NFR-NDA-013 / FR-NDA-053）。

## 决策

### ① 判据 = 既有 `risk` 源里的 `LLM_BLOCKED_RISK` 项（**零新源、零新键**）

```ts
// providers.ts
import { LLM_BLOCKED_RISK } from './providers.js';   // 同文件常量（:49）
{
  id: FREE_INPUT_PROVIDER_ID,                 // 'free-input'（不变）
  deps: ['session'],
  priority: 0, mode: 'waterfall', fail: 'card-boundary',
  // ★ 分相（替代恒真）：未配置（= risk 含 llmBlocked）⇒ false（不显示终端）；
  //    已配置 ⇒ true（恒常驻；R8 / F-35 不回归）。仍读 session.busy 以保持
  //    「when-scope ↔ DRIVER_DECLS_SRC.evidence」同源（DQ-3）。
  when: (ctx) => !ctx.risk.includes(LLM_BLOCKED_RISK) && (ctx.session.busy === true || ctx.session.busy === false),
  chips: [FREE_INPUT_PROVIDER_ID],
  textOf: () => [FREE_INPUT_LABEL],
}
```

**为什么这是「单源」而不是「新判据」**：

| 环节 | 事实（`file:line`） |
|---|---|
| `llmBlocked` 事实的**唯一**写入点 | `sidepanel.ts:1484-1486` `noteLlmBlockedFact(ok, ruled)` ⇒ `observedBlocked.add/delete(LLM_BLOCKED_RISK)` |
| 两路来源**收敛到同一终态词汇** | ① 主动识别：SW 裁定 `ruled=true`（`sidepanel.ts:4192`，来自 `variant:'llm-unconfigured'`，该变体**只**由 SW 的 `isLlmConfigured` 裁出，`service-worker.ts:945`）；② 被动观测：`llmLoaded && !llmSummary?.configured`（`sidepanel.ts:1486`） |
| 折进 `risk` 源 | `sidepanel.ts:2059-2062`（`for (const id of observedBlocked) risks.push(id)`） |
| 既有消费（**同一事实**） | `llm.unconfigured` 修复 provider 的 `when: (ctx) => ctx.risk.includes(row.risk)`（`providers.ts:138`，`row.risk = LLM_BLOCKED_RISK`） |

⇒ 分相判据与「未配置修复 chip」的触发判据**共享同一事实源与同一常量** ⇒ 不可能漂移（幂等）；`NEXT_SOURCE_NAMES` 仍恰 7；`recommend.ts` 零新导入（`PD-NDA-009`）。

### ② 未配置相的「确定性去配置引导」**复用既有链，不新增任何面**

| 环节 | 既有载体（逐字不动） |
|---|---|
| 事实 | `variant:'llm-unconfigured'`（`messaging.ts` 类型单源；`service-worker.ts:952-954`） |
| 面板 | `sidepanel.ts:4167-4194`：`detect` 系统行 + 悬置登记 + `noteLlmBlockedFact(false, true)` + `nextAfterSettle({kind:'answered'})` |
| provider | `llm.unconfigured`（op-driven recovery；`providers.ts:131-141`） |
| chip | `chips:[row.op]` = `['op.llm-config']`（`:139`）⇒ **op-direct chip**（`blockedRecovery` 反查链 `providers.ts:72-85`） |
| 文案 | `OPS_RECOVERY_ROWS[0].text = '配置 LLM 凭据（写入本机 · 掩码）'`（`:58`）—— **未配置相文案**（与异常相文案分相，见 ADR-NDA-007 §③） |

⇒ 本 ADR **只做一件事**：把恒真的终端关掉（分相），**不新增** provider / op / 引导面。

### ③ 已配置相：终端**恒常驻**（恒最末）

- `freeInputTerminal(ctx)`（`recommend.ts:459-463`）读 provider `when` ⇒ 已配置时恒 `true`；
- 注入点唯一：`recommendNextStep`（`recommend.ts:584,598`）—— 终端**不进** `MAX_CHIPS_PER_CARD`，渲染层排在 `.next-chips` 之后（`terminal: true` 加法字段，`cards/nextstep.ts`）；
- **零死端 floor 保持**（`recommend.ts:585-593`）：无任何候选且终端在场 ⇒ 铸「仅含终端」最小卡（`freeInputOnlyCard`）；**未配置**时终端不在场 ⇒ floor 返回 `suppression:'empty'` + 零卡 —— 此时**可达 next 由 `llm.unconfigured` 引导 chip 提供**（不是死端，`FR-NDA-055`）。

### ④ 门禁重锚（**双向反证，禁恒真**）

| 门禁 | 现状 | 重锚 |
|---|---|---|
| `test/free-input-next.test.ts` FIN-0~9 | FIN-1~2 断言终端存在 / floor；`provider.when` 恒真（隐含） | 新增/改写判据：**两相各可判** —— 未配置 ctx（`risk:['llmBlocked']`）⇒ `when=false` ∧ 卡无 `.next-terminal` ∧ `op.llm-config` 引导可达；已配置 ctx ⇒ `when=true` ∧ 卡有 `.next-terminal`（恒最末） |
| 反证 ①（未配置仍显示终端） | — | 注入「恒真」⇒ **必红**（`N-NDA-025` / `EC-NDA-010`） |
| 反证 ②（已配置删终端） | — | 注入「恒假」⇒ **必红**（`N-NDA-008` / `EC-NDA-011` / `R8-4`） |
| `test/r8-open-next-entry.test.ts` R8-1~6 | 首开恒常驻终端 | **零改**（已配置稳态 ⇒ 终端仍在；首开入口 `maybeRecommendOpenEntry` 不动） |
| `test/driver-quadruple.test.ts` DQ-3 | `free-input.evidence=['session.busy']` 必须与 when-scope 同源 | **保留 `session.busy` 读取**（见 §① 的 `when` 保留项）⇒ 绿。**另**：新增 `ctx.risk` 读取**无需**改 `evidence` —— 已核 `evidenceProblems`（`driver-quadruple.test.ts:104-118`）是**双向**判据：① 每个 when-scope 读到的字段必须**有某个**驱动者声明（`risk` 已由 `llm.unconfigured` / `perm.missing` / `ref.stale` 等行声明）；② 每个已声明 evidence 必须在合并 when-scope 里被读到。⇒ 本行零改 |

## 备选方案

| 方案 | 处置 |
|---|---|
| `NextCtx` 新增顶层 `configured` 字段 | ❌ 破 `NEXT_SOURCE_NAMES` 恰 7（`definition.ts:76` + `next-registry.test.ts:86,301`）⇒ 两处门禁重锚；且引入**第二个**「是否配置」声明面 |
| 面板新增偏好键 / storage 键 | ❌ 第二配置真相（NFR-NDA-013 明令；与 `noteLlmBlockedFact` 双源 ⇒ 竞态窗口） |
| 读 `ctx.onboarding.firstRun` 之类的近似量 | ❌ 语义不等价（首装 ≠ 未配置）；会制造「已配置但首装已过」与「未配置」的错判 |
| 在面板渲染层隐藏终端（DOM 后处理） | ❌ 判据落在 DOM 而非事实源；门禁只能靠 Chromium 观感，node 面不可判（违反 NFR-NDA-009） |

## 后果

**正向**：
- 未配置用户**不再被引导点死路**（作者口径②落地）；
- 已配置用户的地板**逐字不回归**（R8 / F-35）；
- 判据单源、零新源、零新键 ⇒ 未来任何「是否配置」的改动只改一处（`noteLlmBlockedFact` 的写入面）即自动生效于分相与修复 chip。

**代价 / 风险**：
- 分相把「终端存在性」从**恒真**变成**条件真** ⇒ 「零死端」判据的可判性变得更重要（未配置相必须有 `op.llm-config` 引导可达，`FR-NDA-055`）；`no-dead-end.mjs` 必须覆盖未配置相（叶2）；
- DQ-3 的 `evidence` 面可能需追加 `'risk'`（只增；叶2 登记）。

## 落地判据（供 tasks/build）

1. `free-input.when` 源文本含 `LLM_BLOCKED_RISK` 与 `session.busy`（两读都在 → DQ-3 同源）；
2. 未配置 ctx ⇒ `recommendNextStep` 产卡**不含** `terminal`；已配置 ctx ⇒ **含** `terminal`（且 `terminal === true`）；
3. 未配置 ⇒ `op.llm-config` 引导 chip 可达（反证「未配置无引导 ⇒ 必红」）；
4. 双向反证实跑（注入恒真 / 恒假 ⇒ 各自必红 + `sha256` 逐字节还原）；
5. `r8-open-next-entry` / `free-input-next` / `no-dead-end` 全绿；`NEXT_SOURCE_NAMES` 恰 7；`recommend.ts` 零新导入。
