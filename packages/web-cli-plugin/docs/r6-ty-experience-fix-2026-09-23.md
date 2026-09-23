# R6 缺陷快修轮 — 真机体验（`ty.md`）四缺陷修复记录

- **日期**：2026-09-23
- **分支**：`feature/web-cli-plugin`（基线 HEAD `0af9072`）
- **证据**：`.sddu/specs-tree-root/specs-tree-web-cli-plugin-v55-self-driven/ty.md`（1963 行，真机 21:28–21:32 会话全文）
- **性质**：真机体验暴露的 P3/P4/P5 缺陷快修（非新功能）；作者裁决「四项一并修 + 注入反证」
- **纪律**：测试只增；门禁串行；三冻结面（`content.js` / `pick-layer.js`）零触碰；特权恒手势 / 法八 / `KIND_SET` 40 零触碰；体积五要素登记。

---

## 基线（修复前）

| 项 | 值 |
|---|---|
| `npm test` | 1319 / 0 |
| `dist/sidepanel.js` | 573,424 B（生效上限 602,095 / 档 614,400 / 绝对 675,840 / `pending-author-line`） |
| `dist/content.js` | 177,076 B（sha `52a82620…`，冻结） |
| `dist/pick-layer.js` | 34,358 B（冻结） |
| journey / binding / s0 | 171 / 192 / 59 |

---

## P3 答案双消费 → 答案 once 语义

### 缺陷（`ty.md` 21:32:18 → 21:32:26）

```
1888:  ask-user --kind choice ... "C. 跳过，先这样"
1891:  已答：C. 跳过，先这样
1895:  driver=ref-action | timing=answered | evidence=session.openAsks | blocked=busy   ← 在飞，自动成回合被挡
1898:  用户回答：C. 跳过，先这样                                                      ← 已被在飞回合消费
1900:  AI 答复（回合收口）…
1940:  driver=ref-action | timing=answered | evidence=session.openAsks                   ← 回合收口后**再点火**
1943:  C. 跳过，先这样                                                                 ← 组成**第二个**回合
```

后台 ask 的答案经 `askBridge.settle` 被在飞回合消费（`settled: true`）后，同一句原话仍留在悬置登记里；
回合收口后的「答案后自动成回合」（`sidepanel.ts:driveAnsweredTurn`，由 `done` 变体续流）又把它消费一次 ⇒ **2 个回合**。

### 修法

1. `ask-bridge` 的 `settle` 早已如实回 `settled`（`ask-bridge.ts#settleOutcome`）；面板据 `res.data.settled === true`
   做 **requestId 级消费标记**（`sidepanel.ts#markConsumedAsk` + `consumedAskIds`，有界 32）。
2. 悬置条目携带 `askId`（后台 ask 的 requestId）——`drivers.ts#Suspension.askId`。
3. 新增纯判据 `drivers.ts#drivableSuspension(suspensions, consumedAskIds)`：**被消费过的后台答案不再可被自动接手**；
   `driveAnsweredTurn` 改经它取悬置（不再 `listSuspensions().slice(-1)[0]`）。
4. 迟到答案（`settled: false`）**不在**消费集 ⇒ 仍走「未接住 ⇒ 给出可走的一步」（推迟口径不降级）。

### 注入反证

`test/r6-ty-experience-fix.test.ts`：
- 纯判据：`askId ∈ consumed` ⇒ `drivableSuspension === undefined`；迟到 ⇒ 仍可驱动。
- **端到端复放 ty.md 序列 ⇒ 恰 1 回合**（消费集为空时复现 2 回合）——判据非恒真。
- 源码接线：`driveAnsweredTurn` 必须经 `drivableSuspension(listSuspensions(), consumedAskIds)`；
  把判据换回 `slice(-1)[0]` ⇒ 必红。

---

## P4 用户输入路径仲裁统一（排队）

### 缺陷（`ty.md` 21:29:19）

```
283: 21:29:19
284: 发送已禁用：上一条指令仍在处理中，请稍候。   ← 用户提交被**硬拒**
```

`view-model.ts` 的 composer 禁用路径（旧 `buttonStates.sendDisabled = pending || !hasOrigin`）在面板侧提前拒绝，
而 v55-3 的排队/草稿回填只在 SW `runChat` 的 AI 路径可达 ⇒ 用户输入永远进不了有界队列。

### 修法

1. `buttonStates.sendDisabled` **移除 `pending`**：禁用**仅保留给异常态**（无活跃站点）；在飞时 composer 可提交。
2. `requestTurn` 仅 `!state.activeOrigin` 硬拒；在飞时的用户提交照常下发，由 **SW `runChat` 唯一仲裁**
   （`classifyChatRequest`：有余量 ⇒ `queued`；已满 ⇒ `busy-rejected` + 草稿回填）——与 AI 路径同仲裁，零第二份裁决。
3. `sendDisabledReason` 的在飞文案改为**排队语义**（「上一条指令仍在处理中：现在发送会排队…」），仍含「处理中」以保持既有可读性断言。
4. 防双发：SW `chatBusy` 单飞 + 同一条 `chat` 消息体（面板不做本地裁决）。

### 注入反证

`test/r6-ty-experience-fix.test.ts` + `test/sidepanel-view.test.ts`：
- `buttonStates({pending:true}).sendDisabled === false`（恢复旧 `pending || !hasOrigin` ⇒ 必红）。
- `requestTurn` 源码不得出现 `buttonStates(`（塞回旧门控 ⇒ 必红）。
- 文案含「排队」与「处理中」。

> 既有断言 `sidepanel-view.test.ts` 的 `pending ⇒ sendDisabled=true` 为**等价重锚**（改判据力只升），
> 已在 v4 取代台账登记 `R6-E-SVP-1`。

---

## P5a 完成后同动作去重

### 缺陷（`ty.md` 21:32:26）

```
1934: 下一步推荐
1936: 用引用 1 做原地翻译        ← 刚刚完成的「原地翻译」又被复推
```

### 修法

1. `recommend.ts` 新增**意图摘要单源** `intentDigest` / `refActionDigest` / `refActionTextKey`：
   把推荐表述与已执行原话归一到同一 digest
   （`用引用 1 做原地翻译` → `原地翻译`；`原地翻译为中文` → `原地翻译`）。
2. `RecommendInput.completedActions`（键 = `refId#意图摘要`）：`recommendNextStep` 据此**压掉同 digest 的
   `ref-action` 候选**；其他规则（`capability-discovery`）照旧可达 ⇒ 非死端。
3. 面板台账：引用动作被驱动时记键（`applyRefAction` / 推荐 chip 文本 `requestTurn`），
   回合**完成**（`done`）时提交（`commitCompletedRefAction`），并作为 `completedActions` 注入推荐输入；
   会话切换 / 夹具 reset 清空。

### 注入反证

`test/r6-ty-experience-fix.test.ts`：
- 两侧 digest 相等；不同 refId / 不同意图不误伤。
- 真跑 `recommendNextStep`：未完成 ⇒ `ref-action`；完成后同 digest ⇒ 落到 `capability-discovery`（非死端）。
- 源码接线：提交必须在 `maybeRecommend('idle')` **之前**。

---

## P5b 引用被改写后重评（新维度 `text-changed`）

### 缺陷

AI 用 `dom set-text` 原地改写文本（`ty.md` 21:31:51 ~ 21:31:54 多条 `✓ 已设置文本`）；若目标命中**活引用**，
引用的捕获文本摘要已失真，但既有判定链（D1）只看「选择器是否解析 / `data-wcli-ref` 是否匹配」——
元素仍在（属性未变）⇒ 仍判 `valid`，捕获证据与页面事实脱节。

### 修法

1. `l1/ref-validity.ts` 新增维度 **`text-changed`**：`resolved` 且 `refMark` 匹配后，若只读重观测带回的
   `resolution.textDigest` 与捕获摘要不同 ⇒ `invalid`（并挂既有救援元数据）；`textDigest` 缺省 ⇒ 不比较（既有判据逐字不变）。
2. SW `observeIdentity` 只读返回**当前文本摘要**（与 `content/ref-capture.ts` 同口径的等价副本：flatten + 80 字截断）；
   `ref-highlight` 新增 `mode: 'observe'`（**不写页面**）。
3. 工具结果事件新增 `targetSelector`（**仅**成功的 `dom set-text` 携带，`hooks.onToolDone` 从 `tc` 取）。
4. 面板 `reobserveAfterWrite`：选择器命中活引用（捕获选择器一致，或命中节点 `data-wcli-ref`）⇒ 只读重观测 + 重判 +
   失效时投影既有「引用失效」可读行（不新增推荐器调用点，主流程 diff 恒 0）。

### 注入反证

`test/r6-ty-experience-fix.test.ts`：
- 摘要失配 ⇒ `invalid` + `text-changed`；摘要一致 ⇒ `valid`；缺省 `textDigest` ⇒ 仍 `valid`；身份不匹配仍走 `replaced`。
- SW/面板接线逐条（`observeIdentity` 摘要、`mode:'observe'`、`dom set-text` + `targetSelector`、`reobserveAfterWrite(|observe|)`）。
- 对照：无摘要比较 ⇒ 改写后仍判 `valid` ⇒ 真源正是靠该维度变红（非恒真）。

---

## 门禁对账

| 门禁 | 基线 | 本轮 |
|---|---|---|
| `npm test` | 1319 / 0 | **1330 / 0**（+11：新 `test/r6-ty-experience-fix.test.ts`） |
| journey（`test:ui`） | 171 | **171 / 171** |
| binding | 192 | **192 / 192** |
| s0-self-driven | 59 | **59 / 59** |
| density | 242 | 242 / 0 |
| page-input / l0 / l1 / l2 | 118 / 248 / 120 / 74 | 118 / 248 / 120 / 74 |
| law8 / dead-end / auth-chip / stream / ask-auth | 36 / 49 / 37 / 76 / 78 | 同值 |
| hardening / insight / e2e / design-contract | 24 / 116 / PASS / 60 | 24 / PASS / PASS / 60 |
| supersession / zero-injection / recommendation | 37 / 28 / 72 | 37 / 28 / 72 |
| l1-reverse / l2-reverse | 9 / 10 | PASS（sha 复原核对） |

> 注：整链 `npm run test:v3` 在**内存压力下**的 Chromium 面出现环境性 flake（`CDP socket not open`），
> 与 KL-N-10 同族；逐面隔离复跑（binding / recommendation）均全量 PASS。

## 体积五要素（显式提升重登记）

| 要素 | 值 |
|---|---|
| 前值 → 后值 | 573,424 → **578,623 B**（+5,199 B，+0.91%） |
| 逐模块归因 | `SIDEPANEL_GROWTH_BREAKDOWN.r6TyFixRows`：`sidepanel.ts` +2,513 / `recommend.ts` +977 / `view-model.ts` +453 / `l1/ref-validity.ts` +596 / `pick-input.ts` +258 / `next-registry/drivers.ts` +402；Σ +5,199 + glue 0 == +5,199 |
| 档位 / 绝对上限 | **614,400 / 675,840 均不动**（578,623 < 614,400 ⇒ 未跨档位） |
| 生效上限 | `floor(578,623 × 1.05) = 607,554`（公式派生） |
| 披露 / 占位 | `SIDEPANEL_CEILING_CAP_ROLE === 'record-only'`；`authorConfirmation` 保持 `pending-author-line`（不伪称已确认） |

- 三冻结面：`dist/content.js` 177,076 B（sha `52a82620…`）、`dist/pick-layer.js` 34,358 B **逐字节不变**。
- 台账：`SIDEPANEL_BASELINE_BYTES` / `_TIMELINE` / `_META` / `SIDEPANEL_RE_REGISTRATIONS['r6-ty-fix']` 同源前移；
  `docs/v4-density-baseline.json#volume` 与 `docs/v4-supersession-ledger.json#v3Vol3Closeout.⑤三值闭合` 同步；
  被取代的 v3/v4 断言逐条登记（`R6-E-SVP-1` 等，`supersession-ledger` 37/37）。

## 零触碰确认

- `content.js` / `pick-layer.js`（冻结产物）与 `src/content/**` 零改动。
- 特权 op 恒 `gesture`（`tierOf` / `OP_TIER_TABLE` 未动）；法八（零明文）未动；`KIND_SET` 仍恰 40（新增字段均为 type-only / 既有 kind 的 payload 值）。
- 主流程调用点不增：`requestTurn(` 恰 2；`maybeRecommend(` 恰 7；`nextAfterSettle` 1 定义 + 10 调用点（`test/op-wiring` 机核）。
