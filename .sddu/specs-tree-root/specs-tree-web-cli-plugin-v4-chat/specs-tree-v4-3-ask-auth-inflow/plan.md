# 技术计划：specs-tree-v4-3-ask-auth-inflow（V4-3 ask-user / 授权卡流内化与留痕固化）

> **文档定位**: SDDU 技术方案（叶子切片） — 本叶技术方案与 ADR；**权威跨叶契约见父 `../plan.md`**
> **前置依赖**: 父 `../spec.md` v1.0 + 父 `../plan.md` v1.0 + 本叶 `spec.md` v1.0 + **v4-2**（`StreamEvent` / `project()` / 固化契约 / 增量渲染 / 摘要落库）+ 设计契约 `option-f-shim.mjs`（C1~C11 / D1~D7）
> **创建人**: SDDU Plan Agent
> **创建时间**: 2026-09-18
> **版本**: v1.0
> **更新人**: SDDU Plan Agent
> **更新时间**: 2026-09-18
> **更新说明**: 初始创建（V4-3 叶子技术方案：ask/confirm 事件化状态机 + 全终态留痕 + 60 s 超时/取消/supersededAsk + busy 回合语义 + 授权回看归属 + 零明文边界；ADR-V4-030~034）。**本阶段只做 plan**：不写 tasks、不写代码、不改 `src/**`·`test/**`·`dist/**`·`manifest.json`·ROADMAP、不动 `main`、不 commit/push、**不跑门禁 / 构建 / Chromium**

本叶 = 作者主诉的直接兑现：把 `ask-user`（choice / text）与破坏性二次确认从「流之上的独占决策槽」迁入**流内卡**并**固化不可逆**，把 60 s 超时 / 取消 / `supersededAsk` 全部升级为**留痕**，让授权记录在流内可当场回看。本叶**不依赖** ref/system 两类卡的迁移（与 v4-4 可并行分解，门禁串行）。

---

## 1. 前置检查

| 检查项 | 状态 | 证据 / 说明 |
|--------|:--:|------|
| 父 `spec.md` / 父 `plan.md` / 本叶 `spec.md` 存在 | ✅ | 601 行 / 1,039 行 / 174 行 |
| v4-2 已落地（前置叶子） | ⚠️ **本阶段不可验证（plan 阶段）** | 本叶按 v4-2 契约编写（`appendEvent` / `project()` / 固化契约 / `openAsks` / `cards/index.ts`）；实施顺序见 §2.6 |
| 设计契约可读（本叶相关组） | ✅ | **C1~C11**（text 卡内输入 / choice ≥3 选项 / 取消入口 + 不代填说明 / 末项「其他…（我来描述）」默认收起 / 操作前→后固化 / 不可二次回答 / 取消也留痕 / S3 链条）· **D1~D7**（批准拒绝 + 范围后果预演 / 操作前 / approved 固化 / 文案 + 时间戳 + 审计入口 / rejected / 不可重复决策 / 两态并存旧卡不消失） |
| 既有 ask/confirm 基建事实 | ✅ | `#ask` 家族（`#ask-prompt`/`#ask-options`/`#ask-input`/`#ask-submit`/`#ask-cancel`/`#ask-fallback`）与 `#confirm` 家族（`#confirm-summary`/`#confirm-allow`/`#confirm-deny`）**已存在**（`index.html:1230-1299`）；SW 推送 `ask-user-request`（`service-worker.ts:461-465`）；超时 60 s（`ask-bridge.ts:41,58-65`）；R1 `supersededAsk`（`chat-state.ts:204-229`） |
| **外部 API 文档缓存** | ⚠️ **N/A（0 个外部服务 API）** | **未调用任何受管 Provider** |
| 红线基线核对 | ✅ | 判定链 / `KIND_SET` / `ask-bridge.ts` **本叶零语义改动**；`content.js` / `pick-layer.js` 零触碰 |
| 本叶改动面自检 | ✅ | 侧栏侧（状态机 + 卡组件 + 视图模型 + `test/**`）；**SW 只读复用**（`ask-bridge` 60 s 语义不变） |

---

## 2. 架构分析

### 2.1 本叶切片（做 / 不做）

**做**：`askuser` / `auth` 卡的**完整业务态**（choice / text / confirm 三型；选项渲染；卡内输入按需出现；末项兜底「其他…（我来描述）」默认收起）· **事件化状态机**（`pending → answered | cancelled(user|timeout|superseded)`；`pending → approved | rejected`）· **全终态留痕**（含取消 / 超时 / 取代）· **不可二次回答 / 不可重复决策** · `supersededAsk` 升级为「取消 + 留痕」 · `MAX_OPEN_ASKS=2` 与**仲裁规则** · **busy/回合语义重定义**（`pending` 与未答卡、推荐 chip、拾取回合、会话切换的关系）· **授权回看归属**（AC-CHAT-016 唯一验收叶）· **流内留痕零明文边界** · 无障碍（固化播报 / 焦点 / 收起不在 tab 序）。

**不做**：事件模型与渲染地基（v4-2）· 引用/系统/推荐卡（v4-4）· 站点级授权管理操作的**归属实现**（v4-1 的设置视图分区；本叶只做**可达性与可读性验收**）· 判定链 / `ask-bridge` 60 s / 权限面零改动。

### 2.2 事件化状态机（核心）

```text
                    ┌─ ask-answer   {value}                 → terminal 'answered'    （data-answered="true"）
askuser 事件 ───────┼─ ask-cancel   {reason:'user'}           → terminal 'cancelled'   （data-answered="cancelled"）
（pending）         ├─ ask-cancel   {reason:'timeout'}        → terminal 'cancelled'   （+ system 行）
                    └─ ask-cancel   {reason:'superseded'}     → terminal 'cancelled'   （+ system 行）
                    ┌─ auth-decision {decision:'approved'}   → terminal 'approved'    （data-decision="approved"）
auth 事件 ──────────┘─ auth-decision {decision:'rejected'}   → terminal 'rejected'    （data-decision="rejected"）
（pending）
```

| 项 | 决策 |
|---|---|
| **终态枚举** | `askuser`：`answered` / `cancelled`；`auth`：`approved` / `rejected`（**全部留痕**，无一可省） |
| **状态属性** | `askuser` 用 `data-answered`（`"false"` / `"true"` / `"cancelled"`，与 shim C5/C6/C10 逐字一致）；`auth` 用 `data-decision`（`"pending"` / `"approved"` / `"rejected"`，与 shim D2/D3/D5 一致） |
| **固化契约** | 操作前：表单可见 + 固化区 `hidden`；操作后：表单收起（`hidden`）+ 固化区显示（`askuser`「已答：{value}」/「已取消（不代填默认值）」；`auth`「已批准」/「已拒绝（不执行）」）+ `.ts`（`HH:MM:SS`）+ `.card-fixed` |
| **不可二次** | 已终态卡**不渲染任何操作控件**（`ask-submit`/`ask-cancel`/`confirm-allow`/`confirm-deny` 在终态卡内不存在）⇒ shim C9 / D6（不可二次回答 / 不可重复决策） |
| **唯一写入者** | `cards/askuser.ts` / `cards/auth.ts` 是各自卡 DOM 的**唯一写入者**；业务判定在 `project()`（模型层）；渲染器不判定 |
| **`ask` 家族 id 复用** | `#ask` / `#ask-prompt` / `#ask-options` / `#ask-input` / `#ask-submit` / `#ask-cancel` / `#ask-fallback` / `#confirm-summary` / `#confirm-allow` / `#confirm-deny` **保留为模板源**（`<template>` 化或每次克隆），卡实例用 `data-card-key` 区分 ⇒ 既有 id 契约与 `journey`/`l0` 断言继续可解析（同构策略） |

### 2.3 `MAX_OPEN_ASKS` 与仲裁规则

| 项 | 决策 |
|---|---|
| **上限** | `MAX_OPEN_ASKS = 2`。**依据**：R1 现场观测到的最坏并存 = **1 张引用回合本地 ask** + **1 张后台 ask**（`chat-state.ts:204-229` 的注释逐字描述该现场）；除此之外无第二种并存来源 ⇒ 2 是**观测上限**而非拍脑袋值 |
| **并存语义** | 流内卡不再有「独占槽」语义（FR-CHAT-040 的独占槽移除）⇒ 允许 ≤2 张未终态卡同时存在，**各自的提交互不影响** |
| **第 3 张到达** | **不得超过上限**：新 ask 到达时若已有 2 张未终态 ⇒ **取代最旧的一张**（`ask-cancel{reason:'superseded'}` + `system` 行），然后追加新卡；**禁静默拒绝/静默丢弃**（被取代事实必须留痕） |
| **优先级** | **引用回合本地 ask**（`requestId` 以 `REF_ROUND_PREFIX = 'ref-round-'` 开头，`chat-state.ts:211`）**优先**：新引用回合 ask 到达时，先 supersede 所有**后台** ask（非 `ref-round-` 前缀），再入队；这保持 R1 的语义（引用回合是用户主动动作，后台提问可被取代） |
| **`supersededAsk` 升级** | 现状：`supersededAsk()` 只返回被取代的 `requestId`，调用方 settle 为 canceled **但不留痕**。v4：改为**双留痕** —— ① 被取代卡固化态 `data-answered="cancelled"`（卡内可读）② 追加 `system` 事件行「上一轮提问已被新的拾取回合取代（未作答即取消，不代填默认值）」（V43-O-5 的裁决：**两者都要**；卡内是主、系统行是辅） |
| **计数器** | `StreamState.openAsks` 为 `project()` 的输入之一；门禁断言 `openAsks.length ≤ 2` 恒成立 |

### 2.4 busy / 回合语义重定义（R-CHAT-007 / FR-CHAT-048）

| 场景 | v4 规则（**明确且一致**） |
|---|---|
| `pending = true`（上一条指令仍在处理中） | ① **发送新回合**（composer 提交）**禁用**（`sendDisabledReason` 文案不变）② **推荐 chip 点击**禁用（ADR-V4-037）③ **已有未终态 ask/auth 卡的提交不禁用**（否则用户无法回答） |
| 未终态卡存在但 `pending = false` | 卡可提交；composer 可用（**互不门控**） |
| 拾取回合 vs 后台 ask | 拾取（引用回合）产生新 ask 时 **supersede 后台 ask**（§2.3 优先级） |
| 会话切换 | `pending = false`；未终态 ask 结算为 `cancelled(superseded)` + 留痕（ADR-V4-028 第 1 条 + 本叶 §2.3） |
| **禁止** | 「回合永远卡在处理中」：每条未终态卡都有三条确定性出口 —— 用户提交 / 用户取消 / **60 s 超时**（外加 supersede）⇒ **不存在无出口状态**；门禁构造「不答 + 不取消 + 等超时」场景断言 `pending` 最终回落 |
| `sendDisabledReason` 语义 | **不改文本、不改来源**（`view-model.ts:288-297`）；只把「未终态卡」从门控条件中**排除**（解耦） |

### 2.5 零明文边界（FR-CHAT-049 / R-CHAT-008）

| 面 | 规则 |
|---|---|
| **固化文案** | 「已答：{value}」中的 `{value}` 是**用户主动输入的答案**（用户自己的话）⇒ 允许入流内展示，但**不得**写入摘要落库的自由文本（摘要只存 `askRequestId` + `terminal`）；`auth` 固化文案只含**决策 + 时间戳 + 范围摘要**，**不含**命令参数体 |
| **范围与后果预演** | 复用既有 `#l1-consequence-tpl` 的三段静态文案（「会发生什么 / 不会发生什么 / 不可逆性声明」）+ 选项标签；**不含**命令参数体 / URL query / 页面文本（模板本身已零明文） |
| **系统事件行** | 只接受**已净化文本**（事件生成器侧白名单；渲染前再过一次）；不得携带 URL query / 页面文本 / 命令参数体 |
| **复用既有纪律** | `l1/receipt.ts#FORBIDDEN` + `assertNoPlaintext()`（渲染时抛错）+ 白名单 8 字段；`l2/audit.ts` 白名单 8 项 + URL 去参 |
| **摘要落库** | 字段白名单（父 ADR-V4-028 第 3 条）；**无自由文本** |
| **门禁** | `test/ask-auth-inflow.test.ts`（node：对构造的全部固化文案 / 系统行跑 `assertNoPlaintext`，反向用例注入 URL query / 命令参数体 ⇒ **必须抛错**）+ `test/ui/ask-auth-inflow.mjs`（真实渲染路径零明文） |

### 2.6 依赖与波次衔接

```text
前置：v4-2（StreamEvent / appendEvent / project() / 固化契约 / 增量渲染 / openAsks / cards 注册表）
本叶产出（v4-4 只读引用）：
  · ask/auth 的终态事件类型与 data-* 契约（data-answered / data-decision / .card-fixed）
  · AC-CHAT-016 的**唯一验收面**（授权回看 + 设置视图站点授权可发现/可读）
  · 回合语义常量（MAX_OPEN_ASKS=2 / REF_ROUND 优先级 / pending 门控边界）
  · 流内留痕零明文的白名单实现（v4-4 的事件行复用）
兄弟叶接口：v4-4 在引用/推荐上下文展示授权状态时**只读引用**本叶契约（父 ADR-V4-014）
```

---

## 3. 方案对比（本叶开放点）

### 3.1 P-V43-01 未终态 ask 卡的并存规则

| 维度 | **方案 A：`MAX_OPEN_ASKS=2` + 引用回合优先 + 第 3 张 supersede 最旧** | 方案 B：无上限（都允许并存） | 方案 C：保持独占（一次只允许一张） |
|------|:--|:--|:--|
| 描述 | 上限 = R1 现场观测上限（1 引用回合 + 1 后台）；超出即 supersede 最旧并留痕 | 不设上限 | 新 ask 覆盖旧 ask（现状语义） |
| 优点 | ① 规则明确一致（FR-CHAT-048）② 上限有**观测依据**而非拍脑袋 ③ 取代事实留痕（不静默）④ 「永远处理中」不可能（有界 + 60 s 超时） | 语义最简 | 改动最小 |
| 缺点 | 需要实现优先级与取代留痕 | 长会话下可能堆多张未答卡 ⇒ 与首屏 ≤2 / 单卡 ≤6 的防滥用张力；且「未答卡堆积」使回合语义复杂 | **违反 FR-CHAT-040**（独占语义必须移除）；EC-CHAT-002 现场问题依旧 |
| 风险 | 低 | 中 | **不可接受** |
| 工作量 | 中 | 低 | 零 |

### 3.2 P-V43-02 60 s 超时的归属（SW 侧 vs 面板侧）

| 维度 | **方案 A：SW 侧 60 s 语义**零变更**（面板侧投影为留痕）** | 方案 B：面板侧实现超时计时器 | 方案 C：取消超时（只允许显式取消） |
|------|:--|:--|:--|
| 描述 | 沿用 `ask-bridge.ts:41,58-65` 的 60 s canceled；面板收到 canceled ⇒ 追加 `ask-cancel{reason:'timeout'}` + 固化态 + `system` 行 | 面板自己做 60 s 定时 | 移除超时 |
| 优点 | ① **不动面零改动**（`ask-bridge.ts` 零 diff；判定链/安全面不受影响）② 单一超时权威（避免双计时器竞争）③ fail-closed 语义（不代填默认值）沿用既有实现 | 面板可控（可暂停/可显示倒计时） | 无超时结算 |
| 缺点 | 面板只能「事后投影」（无法显示倒计时） | 面板与 SW 双计时器 ⇒ 竞态与语义分叉；且要改 SW 契约或新增通道 | **退化为无出口**（违反 FR-CHAT-048 / 「永远处理中」禁令） |
| 风险 | 低 | 中高 | **不可接受** |
| 工作量 | 低 | 中 | 零 |

### 3.3 P-V43-03 `supersededAsk` 留痕的承载

| 维度 | **方案 A：卡内固化态（主）+ `system` 事件行（辅）** | 方案 B：只做 system 事件行 | 方案 C：只做卡内固化态 |
|------|:--|:--|:--|
| 描述 | 被取代卡 `data-answered="cancelled"`（卡内可读「已取消（不代填默认值）」）+ 追加系统行说明「已被新的拾取回合取代」 | 只追加系统行 | 只改卡状态 |
| 优点 | ① 满足 FR-CHAT-042（取消留痕）与 FR-CHAT-044（取代产生**流内留痕条目**）**两条** ② 用户既能看卡的状态，也能看时间線上的因果 | 时间线因果最清晰 | 卡状态最清晰 |
| 缺点 | 两处信息（需保证文案不打架 ⇒ 文案模板单源） | 卡内仍显示 `pending` ⇒ 与「不可二次回答」矛盾（用户会尝试回答） | 缺「为什么被取消」的因果 |
| 风险 | 低 | 中 | 中 |
| 工作量 | 低 | 低 | 低 |

### 3.4 P-V43-04 授权卡「范围与后果预演」的数据来源

| 维度 | **方案 A：复用既有 `#l1-consequence-tpl` 三段静态模板 + 选项标签 + 审计入口** | 方案 B：从命令档案（`insight/catalog`）动态生成预演文本 | 方案 C：只显示摘要（不做预演） |
|------|:--|:--|:--|
| 描述 | 三段静态文案（会发生什么 / 不会发生什么 / 不可逆性声明）+ `{{label}}` 替换；审计入口复用 `#l1-receipt-audit` 的既有出口 | 按子命令查档案生成 | 仅 `summary` |
| 优点 | ① 模板已零明文（既有资产）② 与 v3 `FR-V3-032` 的既有断言同源 ③ 零新增数据依赖 | 预演更具体 | 改动最小 |
| 缺点 | 文案是静态的（不随子命令变化）—— 但这是**既有语义**（v3 已验收） | ① 需要新数据通道（档案查询）② 存在把命令参数体带进留痕的风险（零明文红线）③ 与 FR-CHAT-049 张力 | **违反 FR-CHAT-046**（授权卡须含范围与后果预演） |
| 风险 | 低 | 中高（零明文） | **不可接受** |
| 工作量 | 低 | 中 | 零 |

---

## 4. 推荐方案

| 开放点 | 推荐 | 理由 |
|--------|------|------|
| P-V43-01 并存规则 | **方案 A**（≤2 + 引用回合优先 + supersede 留痕） | 上限有观测依据；规则明确一致；与防滥用不冲突；无「永远处理中」 |
| P-V43-02 超时归属 | **方案 A**（SW 60 s 零变更 + 面板投影） | 不动面零风险、单一超时权威、fail-closed 沿用 |
| P-V43-03 supersede 留痕 | **方案 A**（卡内主 + 系统行辅） | 唯一同时满足 FR-CHAT-042 与 FR-CHAT-044 的形态；文案模板单源避免打架 |
| P-V43-04 预演数据 | **方案 A**（复用既有静态三段模板 + 审计入口） | 零新增依赖 + 模板已零明文 + 与 v3 既有断言同源；动态生成有零明文风险 |

**本叶编排器决策承接**：裁决 2（AC-CHAT-016 归本叶）· D-P-V4-03（`askuser`/`auth` 为 7 主类成员）· 裁决 1（终态冻结）· O-CHAT-001（固化卡不压缩）· O-CHAT-005（法则六：站点级管理操作归设置视图；本叶只做可达性验收）· R-CHAT-007 / R-CHAT-008。

---

## 5. 文件影响分析（本叶）

| 操作 | 文件路径 | 说明 |
|:--:|------|------|
| NEW | `src/ui/sidepanel/cards/askuser.ts` | `askuser` 卡（choice / text 两型；选项 ≥3；卡内输入按需出现；末项「其他…（我来描述）」默认收起；固化两态；不可二次） |
| NEW | `src/ui/sidepanel/cards/auth.ts` | `auth` 卡（批准 / 拒绝；范围与后果预演复用 `#l1-consequence-tpl`；审计入口；两态固化；不可重复；旧卡不消失） |
| MODIFY | `src/ui/sidepanel/stream-model.ts` | 新增终态事件类型（`ask-answer` / `ask-cancel` / `auth-decision`）+ `openAsks` 维护 + `MAX_OPEN_ASKS` 仲裁 + supersede 规则 |
| MODIFY | `src/ui/sidepanel/chat-state.ts` | `supersededAsk` 升级为「取消 + 留痕」；`ask`/`confirm` 单槽语义保留为便捷视图；`resolveAsk`/`resolveConfirm` 改为**追加终态事件** |
| MODIFY | `src/ui/sidepanel/sidepanel.ts` | `submitAsk` / `resolveConfirm` 接线到终态事件；60 s canceled 的投影；composer `pending` 门控与未答卡解耦 |
| MODIFY | `src/ui/sidepanel/view-model.ts` | 回合语义（`sendDisabledReason` 来源不改，未答卡移出门控）+ 卡视图模型 + `openAsks` 计数 |
| MODIFY | `src/ui/sidepanel/cards/index.ts` | `askuser` / `auth` 从骨架升级为完整实现（注册表不变） |
| MODIFY | `src/ui/sidepanel/l1/panels.ts` | `rounds[]` 差分推断**退役**（改为事件派生）；证据层/回执归属迁移（本叶处理与 ask/auth 相关的部分） |
| RETIRE | `src/ui/sidepanel/l0/decision-card.ts` | 被 `cards/askuser.ts` + `cards/auth.ts` 取代（台账逐条登记 old→new） |
| NEW | `test/ask-auth-inflow.test.ts` | node：状态机全终态（答/取消（用户）/取消（超时）/取消（取代）/批准/拒绝）+ `MAX_OPEN_ASKS=2` + 仲裁优先级 + **无「永远处理中」** + 零明文（含反向用例） |
| NEW | `test/ui/ask-auth-inflow.mjs` | Chromium：choice/text 两型 + 固化两态（逐 shim C5~C10 / D2~D6）+ 不可二次/不可重复 + 超时·取消·取代留痕 + `aria-live` + 焦点 + 320px + 单卡可点 ≤6 |
| MODIFY | `test/ui/l0.mjs` / `test/ui/l1.mjs` | 占位宿主 `data-transitional-host="v4-3"` 的**清零** + 相关断言重锚 |
| MODIFY | `test/gate-integrity.test.ts` | `EXPECTED_AUDITED_FILES` 追加 `test/ui/ask-auth-inflow.mjs`（**不动 `CHROMIUM_GATES.length === 9`**） |
| MODIFY | `test/size-baseline.ts` | 本叶**五要素中间重登记** |
| MODIFY | `package.json` | scripts 追加 `test:ask-auth` |
| MODIFY | `docs/v4-supersession-ledger.json` | 本叶 `entries`（含 `decision-card.ts` / `rounds[]` / 独占槽契约）/ `modifiedRanges` / `counts` 追加；AC-CHAT-016 相关断言标 `owner: "v4-3"` |
| NEW | `.sddu/.../specs-tree-v4-3-ask-auth-inflow/plan.md` | 本文件 |
| MODIFY | `.sddu/.../specs-tree-v4-3-ask-auth-inflow/state.json` | `phase: specified → planned` |

---

## 6. 风险评估（本叶）

| 风险 | 概率 | 影响 | 缓解措施 |
|------|:--:|:--:|----------|
| **R43-01 「回合永远卡在处理中」重现** | 中高 | **极高** | 每条未终态卡有**三条确定出口**（提交 / 取消 / 60 s 超时）+ supersede；`pending` 与未答卡**解耦**（`pending` 不再阻止回答）；门禁构造「不答 + 不取消 + 等超时」场景断言 `pending` 回落（ADR-V4-032） |
| **R43-02 supersede 只做取消不做留痕（R1 语义未升级）** | 中 | 高 | FR-CHAT-044 由**双留痕**（卡内 `cancelled` + `system` 行）保证；`test/ask-auth-inflow.test.ts` 断言「supersede 后存在 ≥1 条留痕条目且被取代卡 `data-answered === 'cancelled'`」 |
| **R43-03 固化态破零明文（命令参数体 / URL query 入流）** | 中高 | **极高** | 复用既有 `assertNoPlaintext` + 白名单 + URL 去参；auth 预演只用静态三段模板 + 选项标签（P-V43-04 方案 A）；摘要落库无自由文本；正/反向用例双跑 |
| **R43-04 已终态卡仍出现操作控件（可二次回答/重复决策）** | 中 | 高 | 终态卡的渲染模板**结构性不含**操作控件（不是 `disabled`，而是**不渲染**）；门禁断言终态卡内 `querySelectorAll('button,input,select,textarea').length === 0`（shim C9 / D6） |
| **R43-05 与 v4-1 的「单卡可点 ≤6」冲突（AskDialog 迁移后控件增多）** | 中 | 中 | choice 卡：选项 ≤3 + 末项兜底 + 取消 = 5；text 卡：输入 + 提交 + 取消 = 3；auth 卡：允许 + 拒绝 + 审计入口 = 3 ⇒ 全部 ≤6（门禁逐卡复算） |
| **R43-06 与 v4-4 并行时 `cards/index.ts` / `stream-model.ts` 冲突** | 中 | 中 | 明确文件级分工（本叶改终态事件类型与 ask/auth 卡；v4-4 改 ref/system/nextstep 卡与 `appendSystem`）；门禁**串行**执行；若冲突 → 以 v4-3 先落（交付顺序 position=3） |
| **R43-07 `ask-bridge` 60 s 语义被顺手改动** | 低 | **极高** | `src/background/ask-bridge.ts` 列为本叶**零 diff 文件**；门禁断言其相对 `187c205` 零 diff |

---

## 7. 生成的 ADR（本叶：ADR-V4-030~034）

| ADR | 标题 | 状态 |
|-----|------|:--:|
| ADR-V4-030 | ask/confirm 事件化状态机（全终态留痕 + `data-answered`/`data-decision` + 不可二次 + 固化契约） | ACCEPTED |
| ADR-V4-031 | 60 s 超时 / 取消 / `supersededAsk` 升级为「取消 + 留痕」（SW 60 s 语义零变更） | ACCEPTED |
| ADR-V4-032 | busy / 回合语义重定义（`MAX_OPEN_ASKS=2` + 引用回合优先 + `pending` 与未答卡解耦 + 无「永远处理中」） | ACCEPTED |
| ADR-V4-033 | 授权回看归属（**AC-CHAT-016 唯一验收叶**）+ 与审计视图分工 + 站点级授权在设置视图的可发现/可读 | ACCEPTED |
| ADR-V4-034 | 流内留痕零明文边界（固化文案 / 预演 / 系统行 / 摘要的白名单与净化） | ACCEPTED |

### ADR-V4-030: ask/confirm 事件化状态机

## 状态
ACCEPTED（承父 ADR-V4-012/013/014 + FR-CHAT-040~046 + AC-CHAT-003；替代方案见 §3.1/§3.3）

## 背景
现状 `ask` / `confirm` 是**可变单槽 + 置 `null`**（`chat-state.ts:72,173-185`），`#ask` 家族渲染在 `#l0-decision`（`#log` 的**前一个兄弟节点** ⇒ 结构上位于流之上），`resolveAsk`/`resolveConfirm` 后置 `null` ⇒ **解析即消失**（Q-CHAT-001 的承载层痛点）。唯一「已决策历史」是 L1 面板的 `rounds[]`（仅内存、只覆盖 ask、默认 `hidden`、靠**差分 `input.ask` 推断**闭合）。shim C5~C11 / D1~D7 给出逐态契约（含 `data-answered="cancelled"` 与 `data-decision` 三值）。

## 决策
1. **卡 = 事件的投影**（v4-2 的 `project()`），`askuser` / `auth` 卡的业务态由**终态事件**唯一决定（§2.2 的状态机图）。
2. **终态枚举与状态属性**（与 shim 逐字一致）：`data-answered ∈ {"false","true","cancelled"}`；`data-decision ∈ {"pending","approved","rejected"}`。
3. **固化契约**：操作前 → 操作后（`data-*` + 表单 `hidden` 收起 + 固化区显示 + `.ts` + `.card-fixed`）；`askuser` 固化文案「已答：{value}」/「已取消（不代填默认值）」；`auth` 固化文案「已批准」/「已拒绝（不执行）」+ 时间戳 + 审计入口。
4. **不可二次（结构性）**：终态卡的渲染模板**不渲染**任何操作控件（不是 `disabled`）；门禁断言终态卡内 `button,input,select,textarea` 计数为 0（shim C9 / D6）。
5. **「撤销」不存在**：任何「撤销回答 / 撤销批准」控件都不存在；撤销 = **新的 `system` 事件行**（FR-CHAT-023 / AC-CHAT-005）。
6. **复用既有 id 家族**（同构迁入）：`#ask*` / `#confirm*` 的 id **保留为模板源**（`<template>` 化或克隆），卡实例以 `data-card-key` 区分 ⇒ 既有 `journey` / `l0` / `binding` 的 id 选择器继续可解析（取代面最小化）。
7. **`ask` / `confirm` 单槽**：**保留**为「当前未终态卡」的便捷视图（`chat-state` 不删字段），但其 `null` 不再意味着卡从界面消失（卡由事件流保持）⇒ **删除「解析即置 `null` 消失」路径**（FR-CHAT-020 / AC-CHAT-010）。
8. **`rounds[]` 退役**：`l1/panels.ts` 的差分推断被**事件派生**取代（`project()` 直接给出已终态 ask 卡序列）；`#l1-history` 的「已决策 N 步」可读内容由事件派生（id 保留，内容来源变更 → 台账登记）。
9. **choice / text 两型**：choice 卡选项 ≥3（shim C2）、末项固定「其他…（我来描述）」（shim C4）且兜底输入**默认收起**（点开才出现）；text 卡含卡内输入框（shim C1）—— 法四「输入按需出现」由此满足（面板默认屏无常驻输入框）。

## 后果
- Q-CHAT-001（承载层）与 Q-CHAT-002（已决策历史）被**同一机制**解决：卡在流内、终态可回看、`rounds[]` 的内存推断退役。
- 「不可二次」从「检查 `data-*` 后禁用」升级为「**根本不渲染控件**」⇒ 无法通过 API 或键盘绕过。
- 代价：`#ask*` / `#confirm*` 的 id 从「唯一实例」变为「模板源」，需要文档与门禁明确「id 唯一性不再成立，改由 `data-card-key` 定位实例」；对既有「唯一决策卡」断言是**语义取代**（走台账）。

### ADR-V4-031: 60 s 超时 / 取消 / `supersededAsk` 升级为「取消 + 留痕」

## 状态
ACCEPTED（承 FR-CHAT-042~044 / AC-CHAT-014/015 / EC-CHAT-001/002 / R-CHAT-007 / O-CHAT-005(裁决 2) / V43-O-5；替代方案见 §3.2/§3.3）

## 背景
`ask-bridge.ts:41,58-65` 已实现 60 s 超时即 `canceled`（fail-closed，不代填默认值）。R1（2026-09-17）修复了 `supersededAsk` 的**卡死**问题：`acceptCapture()` 派发自己的 ask 会**替换** `state.ask`，若被替换的是后台提问，其 ask-bridge 只能等 60 s 超时 ⇒ 回合长时间显示「处理中」；R1 的处置是**调用方把返回的 `requestId` settle 为 canceled（可读、fail-closed）**，但**没有留痕**（discovery A5：`rounds[]` 只覆盖 ask 且是差分推断）。

## 决策
1. **SW 侧 60 s 语义零变更**：`src/background/ask-bridge.ts` **零 diff**（单一超时权威；避免面板/SW 双计时器竞态）。
2. **面板侧投影为留痕**：
   - 用户取消 ⇒ 追加 `ask-cancel{reason:'user'}` → `data-answered="cancelled"` + 固化文案「已取消（不代填默认值）」+ `.ts`；
   - 60 s 超时 ⇒ 追加 `ask-cancel{reason:'timeout'}` → 同上固化态 **+** 一条 `system` 事件行「提问超时未答：已按未作答取消（不代填默认值）」；
   - 被取代 ⇒ 追加 `ask-cancel{reason:'superseded'}` → 同上固化态 **+** 一条 `system` 事件行「上一轮提问已被新的拾取回合取代（未作答即取消，不代填默认值）」。
3. **`supersededAsk` 升级（R1 → v4）**：`chat-state.ts#supersededAsk()` 的返回值语义扩展为 `{ requestId, mustTrace: true }`；调用方除 settle `canceled` 外**必须**追加上述两条留痕（卡内 + 系统行）。**文案模板单源**（避免卡内与系统行文案打架）。
4. **fail-closed 不变**：三条路径都**不代填默认值**（`default` 字段仅用于展示，不自动采纳）。
5. **超时/取消不阻塞后续回合**：终态事件落定 ⇒ `openAsks` 移除该卡 ⇒ `pending` 可回落；门禁构造「不答 + 不取消 + 等超时」断言回合最终可继续。
6. **`supersededAsk` 的优先级**：见 ADR-V4-032 第 2~4 条（引用回合优先 + ≤2 上限）。
7. **否决**：面板侧自建计时器（§3.2 方案 B：双计时器竞态 + 需改 SW 契约）、取消超时（方案 C：退化为无出口）、只做系统行或只做卡内态（§3.3 方案 B/C：各缺一半需求）。

## 后果
- EC-CHAT-001（超时）/ EC-CHAT-002（拾取×后台提问交错）/ AC-CHAT-014（superseded 升级）/ AC-CHAT-015（超时与取消留痕）**四条**由同一套终态事件 + 两条系统行覆盖。
- 不动面（`ask-bridge.ts` / SW 契约 / `KIND_SET`）零风险。
- 代价：超时只能「事后投影」（无倒计时 UI）；这是为换取「单一超时权威 + 不动面零改动」而接受的取舍，如实登记。

### ADR-V4-032: busy / 回合语义重定义

## 状态
ACCEPTED（承 FR-CHAT-048 / FR-CHAT-063 / AC-CHAT-014 / R-CHAT-007 / V43-O-1；替代方案见 §3.1）

## 背景
现状 `pending` 是**全局互斥**：`sendDisabledReason` 在 `pending` 时给出「发送已禁用：上一条指令仍在处理中，请稍候。」；`ask-bridge` 默认 60 s 超时。ask 卡进入流后，「未答的卡」与「后续轮次 / 拾取回合 / 会话切换」的关系**没有被定义**（R-CHAT-007）——若沿用「`pending` 时全部禁用」，用户将无法回答已经出现的卡；若不设上限，未答卡可能堆积到与防滥用冲突。

## 决策
1. **`MAX_OPEN_ASKS = 2`**（依据 = R1 现场观测上限：1 张引用回合本地 ask + 1 张后台 ask；`chat-state.ts:204-229` 逐字描述该现场）。
2. **引用回合优先**：`requestId` 以 `REF_ROUND_PREFIX = 'ref-round-'` 开头的是**本地引用回合** ask（`chat-state.ts:211`）。新引用回合 ask 到达 ⇒ 先 supersede **所有后台 ask**（非 `ref-round-` 前缀），再入队（保持 R1 语义：引用回合是用户主动动作）。
3. **超出上限**：新 ask 到达时已有 `MAX_OPEN_ASKS` 张未终态 ⇒ **supersede 最旧的一张**（`ask-cancel{reason:'superseded'}` + 留痕），然后追加新卡；**禁静默拒绝 / 静默丢弃**。
4. **`pending` 门控边界（重定义）**：
   - `pending === true` 时**禁用**：① composer 提交新回合 ② **推荐 chip 点击**（FR-CHAT-063）；
   - `pending === true` 时**不禁用**：① 已有未终态 `askuser` / `auth` 卡的提交 ② 卡内取消 ③ 风险 chip 展开与流内滚动；
   - `sendDisabledReason` 的**文本与来源不改**（`view-model.ts:288-297`），只把「未终态卡」移出门控条件（解耦）。
5. **无「永远处理中」**：每条未终态卡有三条确定出口（提交 / 取消 / 60 s 超时）+ supersede；`openAsks.length === 0` ⇒ `pending` **必须**能回落（门禁断言）。
6. **会话切换**：`pending = false`；未终态 ask 结算为 `cancelled(superseded)` + 留痕（ADR-V4-028 + ADR-V4-031 第 2 条）。
7. **拾取回合**：拾取期间不发起新命令（既有权衡保留）；引用回合 ask 与后台 ask 的交错按第 2~3 条处理。
8. **常量单源**：`MAX_OPEN_ASKS` / `REF_ROUND_PREFIX` / 三条 `cancelReason` 枚举在**一处**定义（`stream-model.ts`）并由 `test/ask-auth-inflow.test.ts` 断言。

## 后果
- FR-CHAT-048（规则明确且一致）与 FR-CHAT-063（推荐与 `pending` 门控一致）同时成立；AC-CHAT-014（不出现「永远卡在处理中」）可机器验证。
- 「未答卡可提交」使 `pending` 不再是「一切禁用」的粗粒度互斥 ⇒ 用户体验上不会出现「卡在屏幕上但点不动」。
- 代价：`pending` 语义从「全局互斥」细化为「仅门控新回合与推荐」，需在文档与 `view-model` 注释中显式说明，否则会被读成「放宽了禁用」。

### ADR-V4-033: 授权回看归属（AC-CHAT-016 唯一验收叶）

## 状态
ACCEPTED（承父 ADR-V4-014 / §12 裁决 2 / FR-CHAT-046~047 / AC-CHAT-016 / O-CHAT-005）

## 背景
AC-CHAT-016 有两面：① 单次操作授权（`confirm`）的批准/拒绝在**流内**固化可读 + 时间戳 + 审计入口；② **站点级授权动作**在**设置视图**可发现与可读。父 ADR-V4-014 已裁决本 AC 的**唯一验收归属 = v4-3**；v4-1 只提供设置视图入口（不断言该 AC）；v4-4 只读引用本叶契约。现状站点级授权在**默认 `hidden`** 的 `#topbar` 内（`#authorize` / `#revoke`，`index.html:1143,1151`），SW 处理并写审计（`service-worker.ts:2091-2118`）。

## 决策
1. **流 = 会话审计线索**：批准 / 拒绝的固化卡（`data-decision` + `.ts` + `.card-fixed` + 审计入口 `#l1-receipt-audit` 复用）构成**会话内**的授权记录。
2. **审计视图 = 完整台账**：`#l2-entry-audit` → `[data-l2-view="audit"]` 的既有审计视图（零明文白名单 + URL 去参）继续承载全量记录；分工在 UI 文案中显式说明（「流为会话线索，审计为完整台账」）。
3. **站点级授权在设置视图**：`#authorize` / `#revoke` / `#rebind` / 会话与分组 / 隐私与知情同意 / 自动授权开关全部位于 `#settings-view` 的「站点与授权」分区（**归属由 v4-1 落地**）；本叶验收 = ① 这些控件在设置视图内**可发现**（有可读标题与入口）② **未授权首装路径**下存在可发现的授权入口（打开设置视图即见引导文案 + `#authorize`）③ 其决策结果**可读**（授权后状态可复核）。
4. **零新增卡型**：站点级授权**不**新增第 8 类卡（O-CHAT-005 已否决）—— 它没有会话过程语义（法则六）。
5. **唯一验收面**：AC-CHAT-016 的全部断言落在 `test/ui/ask-auth-inflow.mjs`（流内固化 + 站点级可发现/可读）+ `test/ask-auth-inflow.test.ts`（状态机侧）；v4 台账 `entries[]` 标 `owner: "v4-3"`（禁 v4-1/v4-4 重复验收）。
6. **不新增通道**：站点级授权沿用既有 SW 处理与审计写入（`service-worker.ts` **零改动**）。

## 后果
- 同一个 AC 只有一处验收 ⇒ 口径不分叉；v4-1 只需保证「设置视图存在且含站点与授权分区」。
- 「流 = 会话线索 / 审计 = 完整台账」的分工与法二一致（法二末尾明写「完整台账仍走工具栏『审计』视图」）。
- 代价：AC-CHAT-016 的站点级授权可发现性依赖 v4-1 的设置视图归属 ⇒ **实施顺序硬约束**：v4-1 必须先于 v4-3（叶子顺序天然满足）。

### ADR-V4-034: 流内留痕零明文边界

## 状态
ACCEPTED（承 FR-CHAT-049 / NFR-CHAT-005 / AC-CHAT-021 / R-CHAT-008 / NG-CHAT-003；替代方案见 §3.4）

## 背景
授权卡与系统事件一旦入流留痕，就要面对既有零明文纪律：① `l1/receipt.ts` 的 `FORBIDDEN` 正则 + `assertNoPlaintext()`（**渲染时抛错**）+ 白名单 8 字段（`:38-77`）；② `l2/audit.ts` 字段白名单 8 项（含 `decision`）+ URL 去参（`:24-32`）；③ key / 剪贴板 / 通知 / 书签正文**永不入明文**。若流内授权卡或系统事件行把命令参数体 / URL query / 页面文本带进留痕，即破红线。

## 决策
1. **复用而非重造**：流内留痕**复用** `l1/receipt.ts#assertNoPlaintext()` 与 `FORBIDDEN` 正则；`l2/audit.ts` 的白名单与 URL 去参**零改动**。
2. **`auth` 卡文案零明文**：固化文案只含 `{decision}` + `{ts}` + `{summary}`；**范围与后果预演**复用既有 `#l1-consequence-tpl` 的三段**静态**文案 + `{{label}}` 替换（P-V43-04 方案 A）；**不含**命令参数体 / URL query / 页面文本。
3. **`askuser` 卡文案**：`{value}` 是**用户自己输入的答案** ⇒ 允许在流内展示（用户可见自己的话），但**不得**写入摘要落库的自由文本（摘要只存 `askRequestId` + `terminal`）。
4. **`system` 事件行**：只接受**已净化文本**（事件生成器侧白名单）；渲染前**再过一次** `assertNoPlaintext`（双保险，任一失败即抛错 ⇒ 门禁 FAIL）。
5. **白名单落点**：新增 `src/ui/sidepanel/stream-plaintext.ts`，导出 `STREAM_FIELD_WHITELIST`（`decision` / `tool` / `ok` / `ms` / `refNum` / `askRequestId` / `seq` / `ts` / `terminal` / `label`）与 `assertStreamPlaintext(text)`（复用 receipt 的判定）；
   **`label` 特殊规则**：只允许**已登记静态文案**或**结构化字段拼接**（不含自由文本）；实现为「生成器只能通过 `label(...)` 工厂产出 `label`」。
6. **反向断言（必须能 FAIL）**：`test/ask-auth-inflow.test.ts` 注入 ① URL query（`?token=…`）② 命令参数体（`--password=…`）③ 页面文本片段 ⇒ 每一类都**必须**抛错；`test/ui/ask-auth-inflow.mjs` 在真实渲染路径上断言零命中。
7. **摘要落库**：字段白名单（父 ADR-V4-028 第 3 条）—— 无自由文本；`label` 走第 5 条工厂 ⇒ **结构上不可能**把明文写进存储。

## 后果
- 零明文从「渲染时检查」升级为「渲染时检查 + 生成侧工厂约束 + 存储侧无自由字段」三层，且三层都可 FAIL。
- 既有 `receipt` / `audit` 纪律**零改动**（只被复用）⇒ 不动面与既有断言零风险。
- 代价：`label` 必须走工厂函数（实现上略繁琐），但这是把「零明文」从自觉变成结构约束的必要成本。

---

## 8. 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建（V4-3 叶子技术方案）。**产出**：本叶 `plan.md`（含 §1~§8 + **ADR-V4-030~034**）。**关键裁决**：① ask/confirm = **事件化状态机**（终态枚举 `answered`/`cancelled`/`approved`/`rejected`；`data-answered` 三值 + `data-decision` 三值；**终态卡结构性不渲染操作控件**；`#ask*`/`#confirm*` id 保留为模板源；`rounds[]` 差分推断退役；**删除「解析即置 null 消失」路径**）；② 超时/取消/取代 = **SW 60 s 零变更 + 面板投影三留痕**（用户/超时/取代各一条 `ask-cancel` + 后两者加 `system` 行；`supersededAsk` 升级为「取消 + 留痕」双留痕；fail-closed 不代填）；③ 回合语义 = `MAX_OPEN_ASKS=2`（R1 现场观测上限）+ **引用回合优先** + 超限 supersede 最旧并留痕 + **`pending` 与未答卡解耦**（`pending` 只门控新回合与推荐 chip；`sendDisabledReason` 文本/来源不改）+ **无「永远处理中」**；④ 授权回看 = **AC-CHAT-016 唯一验收叶**（流 = 会话审计线索 / 审计 = 完整台账；站点级授权在设置视图可发现可读；不新增第 8 类卡；SW 零改动）；⑤ 零明文 = 复用 `assertNoPlaintext`/`RECEIPT` 白名单 + 新增 `stream-plaintext.ts` 的**字段白名单 + `label` 工厂** + 摘要无自由文本 + 正/反向用例。**本阶段只做 plan**：不写 tasks、不写代码、不改 `src/**`·`test/**`·`dist/**`·`manifest.json`·ROADMAP、不动 `main`、不 commit/push、**不跑门禁 / 构建 / Chromium**。 | 2026-09-18 | SDDU Plan Agent |

