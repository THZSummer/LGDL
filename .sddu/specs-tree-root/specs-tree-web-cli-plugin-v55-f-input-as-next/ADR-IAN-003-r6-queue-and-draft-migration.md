# ADR-IAN-003: R6 排队 / 草稿回填迁移（入口迁流内 + 回填载体迁卡内 + 不覆盖）

## 状态
ACCEPTED（承父 spec §5.4 R6Q FR-IAN-030~034 / DC-IAN-004 / X-IAN-7；叶1 支持 / 叶2 唯一化）

## 背景

R6 快修轮（`74d76c1`）把「自由文本 → 发起回合」的**仲裁**放进了 SW 有界队列（`turn-queue.ts`：`TURN_QUEUE_MAX = 1` / `classifyChatRequest` 三分支 `executed`/`queued`/`busy-rejected` / `drain` / `QueuedTurn.refs`），但**唯一用户入口与草稿回填载体都绑在 `#composer`**（`sidepanel.ts:3756` 是 `requestTurn(` 恰 2 的第二处；`:3984-3991` 回填 `#input`）。本 Feature 把输入面搬进流内，必须**只迁移入口与载体、不改裁决语义**（N-IAN-008 / NG-IAN-006）。

**只读事实（实测）**：

| 面 | 事实 | 位置 |
|---|---|---|
| SW 裁决 | `turn-queue.ts` 三分支；面板不做裁决 | `background/turn-queue.ts` / `service-worker.ts:924-940,1050-1056` |
| 面板留痕 | `queued` ⇒「已排队：上一条回合结束后自动发送。」；`busy-rejected` ⇒ 恢复态「…已把你这句放回输入框。」/ 未恢复态「…输入框已有内容未覆盖。」 | `sidepanel.ts:3915-3917,3980-3993` |
| 回填 | `const draftInput = $('input'); const restored = rejected.length>0 && draftInput.value.length===0; if (restored) draftInput.value = rejected;` | `sidepanel.ts:3988-3991` |
| 门禁 | `turn-arbitration` TA-4：源码必须含 `draftInput.value = rejected` 且含 `draftInput.value.length === 0`；**删掉回填即红**（`PANEL.replace(…,'')` 反证） | `test/turn-arbitration.test.ts:49-62,123` |
| 在飞可提交 | `requestTurn` **不再**按 `pending` 硬拒（仅异常态 `!activeOrigin` 返回 false）；`buttonStates.sendDisabled = !hasOrigin` | `sidepanel.ts:313-322` / `view-model.ts:401-409` |
| 卡收起 | free-input 卡收起后卡内 input 不在可见面（`fallback.hidden`） | `askuser.ts:71-86` |

## 决策

**① 在飞时自由输入可见（不硬禁用）。**

- `free-input` 终端**不带 `.next-chip` 类**（ADR-IAN-001）⇒ `syncNextstepPending`（只扫 `button.next-chip`）**不会**把它禁用 ⇒ 在飞时仍可点开卡内输入（EC-IAN-002）。
- 提交在飞时**照常下发** → SW 有界仲裁 → `queued` / `busy-rejected`（面板不预判，`requestTurn` 的 `!activeOrigin` 保留为唯一异常态硬拒）。
- 禁用语义重锚（FR-IAN-054 / AC-IAN-012）：`sendDisabled` **仅异常态**（无活跃站点 / 未绑定）；`AskFlowView.sendDisabled` 的「在飞」语义**不**作用于流内输入面。

**② 提交入口迁移（叶1 双入口并存 → 叶2 唯一）。**

- 叶1：**双入口** —— 新流内入口（`op.turn` 槽）+ 旧 composer submit（`:3749-3760`）**逐字保留可用**（中间态保护 FR-IAN-031/071 / N-IAN-027）；两者共用**同一** `requestTurn` + 同一 SW 仲裁。
- 叶2：删 composer submit ⇒ 唯一入口 = 流内（`requestTurn(` 恰 1）。

**③ 草稿回填载体迁移（叶1 双载体 → 叶2 唯一化到流内）。**

- 回填目标从 `$('input')` 迁到**卡内输入**（`free-input` 卡的 `#ask-input`），保持三语义**逐字不变**（N-IAN-026 / X-IAN-7）：① 不丢原话；② **仅当输入处为空**（不覆盖用户新输入）；③ **有可读行**。
- **卡已收起 ⇒ 重新展开卡内输入再回填**（`setCardFallbackOpen(form, true)` 并 focus）——这是 ian-2 新增的第 4 条语义（FR-IAN-033 明确要求）。
- **无 free-input 卡时**：若 `busy-rejected` 到达而当前没有 free-input 卡（例如用户从未点开、或卡在某状态被收起后模型仍在）⇒ **按需铸造** free-input 卡并展开回填（而非回退到 `#input`）；叶1 期间仍**同时**保留 `#input` 回填（双载体可判）。
- 叶2：删 `#input` 回填 ⇒ 唯一载体 = 卡内输入；TA-4 判据**等价重锚**到卡内载体（`freeInput.value = rejected` / `…length === 0`），**「删回填仍必红」保留**（`PANEL.replace` 反证）。

**④ 裁决语义零触碰**：不触 `turn-queue.ts`（diff = 0）；不改文案常量（`QUEUED_TURN_TEXT` / `BUSY_REJECTED_RESTORED_TEXT` / `BUSY_REJECTED_KEPT_TEXT` 逐字保留，仅「输入框」词面在恢复态文案里保持可读——措辞若需随流内面更新，走**等价重锚 + 台账**，不得删文案）。

## 后果

- 正面：R6 修复成果（有界队列 / 明确拒绝 / 草稿回填）**零回归**；入口与载体随输入面单一化而收敛；中间态无「无输入可用」窗口。
- 代价：`sidepanel.ts` 的 `busy-rejected` 分支需按「卡在 / 卡收起 / 卡不存在」三分支处理（**可读留痕**在三态下都必须存在）。
- 反证族：
  - 反证 ①：删回填 ⇒ TA-4 必红（保留）；
  - 反证 ②：回填覆盖非空输入 ⇒「非空不覆盖」判据必红；
  - 反证 ③：卡收起后不重新展开 ⇒「重展开」判据必红；
  - 反证 ④：把 `pending` 塞回 `requestTurn` 硬拒 ⇒ R6-P4 判据必红（既有）；
  - 反证 ⑤：`turn-queue.ts` 任一改动 ⇒ diff=0 判据必红。

## 影响文件（预估）

| 操作 | 文件 | 说明 |
|:--:|---|---|
| MODIFY | `src/ui/sidepanel/sidepanel.ts` | `busy-rejected` 回填迁卡内（三分支 + 重展开）；叶1 双载体、叶2 唯一化 |
| MODIFY | `test/turn-arbitration.test.ts` | TA-4 等价重锚（载体 → 卡内；删回填仍必红） |
| MODIFY | `test/r6-ty-experience-fix.test.ts` | 在飞不硬禁用 → 流内输入面（等价重锚） |
| MODIFY | `test/sidepanel-view.test.ts` | `:115-120` 在飞可提交 → 流内输入面（等价重锚） |
| NOOP | `src/background/turn-queue.ts` / `service-worker.ts` | **零 diff**（裁决本体不动） |
