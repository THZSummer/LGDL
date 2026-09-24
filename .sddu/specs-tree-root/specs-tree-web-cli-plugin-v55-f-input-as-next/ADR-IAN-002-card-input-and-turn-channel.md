# ADR-IAN-002: 卡内输入载体与提交通道（`.ask-fallback` 家系第二语义分支 + `op.turn` 槽 + 手输 driver）

## 状态
ACCEPTED（裁决 PD-IAN-002 / PD-IAN-003；承父 spec FR-IAN-011 / 015~025 / §5.3 CHAN / DC-IAN-002 / DC-IAN-011）

## 背景

「自由输入…」点开后要**就地展开卡内输入**，并让**提交经 `op.turn` 槽**成回合，同时满足：

- **不新增常驻输入框 / 不新增 kind**（N-IAN-010 / NG-IAN-008/009）；
- **`op.describe` 有值相语义逐字不变**（描述 = 本地结算、不成回合；FR-IAN-015 / NFR-IAN-008）；
- **手输与 AI 驱动留痕可判**（driver 两值；FR-IAN-022）；**让位语义**（`proactivity.noteUserTurn()`）保留在**手输路径**、**不得移入 `requestTurn` 内部**（FR-IAN-023，注释 `sidepanel.ts:3752-3755` 明示原因）；
- **唯一载体**（N-IAN-021 / NFR-IAN-014：第二输入载体 ⇒ FAIL）、**唯一提交点**（N-IAN-022）。

**只读事实（实测）**：

| 面 | 事实 | 位置 |
|---|---|---|
| 卡内输入先例 | `.ask-fallback` = `<div id='ask-fallback' class='ask-fallback' hidden>` + `#ask-input`/`#ask-submit(data-act=answer)`/`#ask-cancel`；**text/secret 型默认展开**（`fallback.hidden = askKind !== 'text' && !isSecret`） | `cards/askuser.ts:263-300` |
| id 家系唯一性 | `LEGACY_ASK_IDS` 含 `ask-fallback/ask-input/ask-submit/ask-cancel/ask-other`；**只有「最新未答卡」铸造该家族**，早于它的卡铸造前被 strip ⇒ 文档级 `getElementById` 恒命中唯一所有者 | `cards/askuser.ts:43-52` |
| 互斥披露 + focus | `setCardFallbackOpen(cardForm, open)`：作用域 = 本卡 `.ask-form`；`open` 时**折叠选项行 + `[data-disclose="l1-more"]` + focus 到卡内 input**；文档级包装 `setAskFallbackOpen(doc, open)` | `askuser.ts:71-86,94-103` |
| 唯一回合通道 | `bindPanelOps.turn: (text) => requestTurn(text)`；`ops.ts`「`op.turn` is the ONLY `requestTurn` caller」 | `sidepanel.ts:3782-3784` |
| `requestTurn(` 计数 | 恰 2 = composer submit(`:3756`) + `op.turn` 槽(`:3783`)；门禁 `op-wiring` `OP_CALLSITE_SET` `{op:'op.turn', symbol:'requestTurn', callSites:2}`；`callSites()` **跳过函数定义行** | `test/op-wiring.test.ts:76,90-101,127-134` |
| `op.describe` | 无值相 ⇒ `revealAskFallback()`；有值相 ⇒ `submitDescribe(value)`（本地结算 `ask-resolved`，**不发 SW**） | `sidepanel.ts:3786-3789,2909-2919` |
| 手输让位 | composer submit：`if (requestTurn(input.value)) { proactivity.noteUserTurn(); input.value=''; }` —— `noteUserTurn` 在 `requestTurn` **之外** | `sidepanel.ts:3749-3760` |
| AI 留痕 | `driverTraceLine(driverId, timing, evidence)` = `driver=<id> \| timing=<…> \| evidence=<字段名集>`（**只含字段名，零值**）；AI 按下经 `pressCandidate → dispatchChipAction('op.turn', value)` | `ai-drive.ts:85-99,113-129` |

**矛盾点**：点开输入这个动作，最省事的复用是 `data-act='describe'`（`op.describe` 无值相 = `revealAskFallback()`）；但 `revealAskFallback()` → `ensureTextAskCard()` 铸造的是 **`requestId='ref-describe'`**（prompt「用文字描述你的目标（重建引用）」）的卡，其提交走 `submitDescribe` = **本地结算、不成回合** ⇒ 直接复用会**把「自由输入」做成「描述」**，撞 FR-IAN-015 / 主题。

## 决策

**① 载体 = `askuser` kind 内**第二语义分支**，复用 `.ask-fallback` 家系（id / class / 互斥披露 / focus 全复用），但用独立 `requestId='free-input'` 区分语义（PD-IAN-002 裁决）。**

- 点开 `free-input` 终端 ⇒ `openFreeInputCard()`：
  - 已有 `free-input` 卡（按 `payload.requestId === 'free-input'` 在模型上查找，**不复用 `textAskCardId()`**——后者只认 `ref-describe`）⇒ 复用该卡，`setCardFallbackOpen(form, true)` + focus（卡已收起时**重新展开**）；
  - 否则铸造 `askuser` 卡：`{ askKind:'text', prompt:'自由输入…', requestId:'free-input' }`（`askKind:'text'` ⇒ `fallback.hidden=false` 天然就地展开）；随后 `setCardFallbackOpen(form, true)` 走既有 focus。
- **判据（为什么是「复用家系 + 第二语义分支」而非「同 kind 第二渲染分支 / 新 id 家系」）**：
  1. 复用家系 ⇒ 互斥披露 / focus / 文档级解析**零第二套机制**；新 id 家系要再建第二套去重 + 第二处文档级解析 ⇒ 撞 NFR-IAN-014「唯一载体」；
  2. `LEGACY_ASK_IDS` 的「最新开卡唯一铸造」纪律（I-04）**天然保证 `#ask-input` 文档级唯一** ⇒ 门禁选择器 / 钩子 / 回填可继续用**同一 id 名**，「回填 `#input` → `#ask-input`」成为同族内换名（等价，不是第二载体）；
  3. 直接复用 text-ask 的**结算**语义则变成「描述」⇒ 故**必须**加独立 `requestId` 的**语义分支**（renderer 零新 DOM 路径，路由在 `handleCardAction`）。
- **不与 `ensureTextAskCard` 合流**：`ensureTextAskCard()` 的存在性判定只看 `ref-describe`；free-input 用**自己的**存在性判定，避免「背景提问卡 / 描述卡被误复用」（`sidepanel.ts:2840-2846` 已登记该风险）。EC-IAN-007（text ask 卡与 free-input 卡并存）：两卡各自 `setCardFallbackOpen` 作用域独立（`.ask-form` 局部），互不干扰；`focus` 归属 = 最后展开者。

**② 提交 = 经 `op.turn` 槽（PD-IAN-002 的通道裁决）。**

- `#ask-submit`（`data-act='answer'`）→ `handleCardAction(cardId,'answer',value)` → 按该卡 `requestId` 分支：
  - `requestId === 'free-input'` ⇒ **手输回合**：`proactivity.noteUserTurn()`（让位语义，**在槽外**，位置同 composer 先例）→ `dispatchChipAction('op.turn', value)`（**唯一生产输入提交点**）→ 清空卡内 input；
  - 其它 `requestId` ⇒ 保持既有 `submitAskFor` 结算路径**逐字不变**。
- **`requestTurn(` 不增调用点**：提交经 `dispatchChipAction('op.turn', value)` → `runOp('op.turn')` → `bindPanelOps.turn` → `requestTurn`。⇒ **叶1 计数仍恰 2**（composer 保留 + 槽）；**叶2 composer 退役后恰 1**（槽）。重锚口径 = 「唯一生产输入提交点 = `op.turn` 槽」；`OP_CALLSITE_SET` 的 `op.turn.callSites` 叶2 改 2→1，并**附反证**（注入第 2 个 `requestTurn(` 调用点 ⇒ `requestTurnProblems` 必红）。
- **空 / 纯空白提交**：`requestTurn` 内已 `if (!trimmed) return false` ⇒ 不产生空回合；但**必须不静默**（EC-IAN-004）⇒ free-input 分支在空值时写一行可读提示（复用既有 `notice` 通道，零新增 kind）。
- **特权 op 不触达**：free-input 提交只经 `op.turn`（∈ `auto` 档），不产生 `op.authorize` / `op.perm.request`（FR-IAN-025 / N-IAN-016 逐字不动）。

**③ 手输 / AI 驱动留痕区分（PD-IAN-003 裁决）。**

- **取值字面量**：新增单源常量 `MANUAL_DRIVER_ID = 'manual'`（落 `next-registry/ai-drive.ts`，与该模块的 `driverTraceLine` 同源）；AI 路径的 driver 值域 = `DRIVER_DECLS_SRC` 的键集（`ref-action` / `llm.unconfigured` / …）。
- **承载面** = **既有留痕行**（`driverTraceLine` 复用，零新字段）：手输 = `driver=manual | timing=manual | evidence=…`；AI = `driver=<声明 id> | timing=<…> | evidence=…`。
- **可判性判据**：① `MANUAL_DRIVER_ID ∉ listDriverDecls()`（**反向不相交**断言——否则「两值可判」会被未来某 provider 命名为 `manual` 抹平）；② 手输路径写 `driver=manual` 行（可读）而 **AI 自主按 `op.turn` 不产生该行**（EC-IAN-013）；③ **同值 ⇒ FAIL**（注入「手输也写 driver=<某声明 id>」⇒ 必红）。
- **零值纪律保持**：`evidence` 仍只写 **ctx 字段名**，不写用户内容 / Key / URL（法八）。

## 后果

- 正面：唯一载体（卡内 `.ask-fallback`）+ 唯一提交点（`op.turn` 槽）+ 唯一 driver 声明源；描述语义零触碰；`requestTurn(` 计数只减不增。
- 代价：`handleCardAction('answer')` 增长一个 **requestId 分支**（`free-input`）——须保证该分支**不引入集 B 动作字面量**（`next-dispatch-diff0` D0-1 扫描 `handleCardAction` 体）；`openFreeInputCard` 须单独存在性判定。
- 反证族（每条附 `expectFailPattern` + 逐字节还原）：
  - 「free-input 提交改走 `submitDescribe`」⇒ FIN-3 必红；
  - 「free-input 卡与 ref-describe 卡共用 `requestId`」⇒ FIN-3 唯一载体 / 语义必红；
  - 「`noteUserTurn` 移入 `requestTurn` 体内」⇒ FIN-5 必红；
  - 「手输 driver 写声明 id」⇒ FIN-4 同值必红；
  - 「AI 自主按 `op.turn` 写 `driver=manual`」⇒ EC-IAN-013 必红。

## 影响文件（预估）

| 操作 | 文件 | 说明 |
|:--:|---|---|
| MODIFY | `src/ui/sidepanel/sidepanel.ts` | `openFreeInputCard` / `freeInputCardId` / `handleCardAction` requestId 分支 / 手输 trace + 让位 / 空提交可读提示 |
| MODIFY | `src/ui/sidepanel/next-registry/ai-drive.ts` | `MANUAL_DRIVER_ID` 单源常量（+ 反向不相交判据锚） |
| MODIFY | `src/ui/sidepanel/cards/askuser.ts` | 仅在必要时暴露「按 requestId 取卡」纯查询（**零第二 DOM 路径**） |
| MODIFY | `test/free-input-next.test.ts`（NEW） | FIN-3 / FIN-4 / FIN-5 / FIN-6 判据 + 5 条反证 |
