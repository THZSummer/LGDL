# 任务分解：specs-tree-v4-3-ask-auth-inflow（V4-3 ask-user / 授权卡流内化与留痕固化）

> **文档定位**: SDDU 任务清单 — 本叶 11 个原子任务（TASK-701~711 / 叶内别名 V43-01~11）；**权威跨叶契约见父 `../plan.md` + 父 `../tasks.md`**
> **前置依赖**: 本叶 `plan.md` v1.0（ADR-V4-030~034）+ 父 `plan.md` v1.0（ADR-V4-014 / ADR-V4-012 / ADR-V4-003 / ADR-V4-011）+ 本叶/父 `spec.md` v1.0
> **创建人**: SDDU Tasks Agent
> **创建时间**: 2026-09-18
> **版本**: v1.0
> **更新人**: SDDU Tasks Agent
> **更新时间**: 2026-09-18
> **更新说明**: 初始创建（11 任务 / 6 波；AC-CHAT-016 **唯一验收叶**；与 v4-4 可并行分解、门禁串行）

## 0. 红线与纪律（本叶）

| # | 红线 | 守线任务 |
|---|------|---------|
| 1 | `ask-bridge.ts` 60 s 语义**零 diff**（面板侧只做投影） | TASK-705 / TASK-711 |
| 2 | **无「永远卡在处理中」**：每条未终态卡三条确定出口（提交 / 取消 / 60 s 超时）+ supersede | TASK-701 / TASK-705 |
| 3 | `pending` **只门控**发送新回合与推荐 chip，**不门控**已有 ask 卡提交 | TASK-706 |
| 4 | 全终态留痕：`answered` / `cancelled(user\|timeout\|superseded)` / `approved` / `rejected` 无一可省 | TASK-701 / TASK-705 |
| 5 | 终态卡**不渲染**任何操作控件（结构层不含，非 `disabled`） | TASK-702 / TASK-703 |
| 6 | 零明文：固化文案 / 后果预演 / 系统行 / 摘要**无命令参数体 / URL query / 页面文本** | TASK-704 / TASK-708 |
| 7 | `MAX_OPEN_ASKS = 2`（= R1 现场观测上限）；引用回合 ask **优先** | TASK-701 |
| 8 | **AC-CHAT-016 只在本叶验收**（v4-1 只提供设置视图入口；v4-4 只读引用） | TASK-707 / TASK-711 |
| 9 | 判定链 / `KIND_SET` / manifest / `src/content/**` 零 diff | TASK-711 |
| 10 | 门禁严格串行；日志 `/tmp/opencode/v4-gate-logs/v4-3/`（禁 tail 截断） | TASK-711 |

## 1. 依赖拓扑总览

```
[前置] v4-2 收口绿（CP-2：TASK-612）

Wave 1 ── (无叶内依赖)
  TASK-701 [M] stream-model.ts 终态事件类型 + openAsks + MAX_OPEN_ASKS=2 仲裁 + supersede 规则

Wave 2 ── (依赖 701)
  TASK-702 [L] cards/askuser.ts（choice/text + 固化两态 + 不可二次）
  TASK-703 [L] cards/auth.ts（批准/拒绝 + 范围后果预演 + 审计入口 + 两态固化）
  TASK-704 [S] 流内留痕零明文（固化文案/预演/系统行 + assertNoPlaintext 复用 + 反向用例）

Wave 3 ── (依赖 702/703/704)
  TASK-705 [M] chat-state supersededAsk 升级 + resolveAsk/resolveConfirm → 终态事件 + 60 s cancelled 投影
  TASK-706 [M] 回合语义（pending 与未答卡解耦 + openAsks 计数 + sendDisabledReason 来源不改）
  TASK-707 [M] l1/panels.ts rounds[] 退役 + 证据层/回执迁移 + RETIRE l0/decision-card.ts + 本叶占位宿主清零

Wave 4 ── (门禁)
  TASK-708 [M] test/ask-auth-inflow.test.ts（node，状态机全终态 + 零明文）
  TASK-709 [L] test/ui/ask-auth-inflow.mjs（Chromium，AC-CHAT-016 全断言）

Wave 5 ── (联动门禁)
  TASK-710 [M] l0/l1 宿主清零断言 + gate-integrity 追加 + package.json

Wave 6 ── (收口)
  TASK-711 [M] 全门禁串行 + AC-CHAT-016 owner=v4-3 台账登记 + 五要素中间重登记
```

## 2. 任务列表

### TASK-701（V43-01）: 终态事件类型 + `openAsks` + `MAX_OPEN_ASKS=2` 仲裁 + supersede 规则
| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | 无叶内依赖（前置 = v4-2 收口 TASK-612） |
| **执行波次** | 1 |
| **对应 FR / AC** | FR-CHAT-040 / 042 / 044 / 048 · AC-CHAT-014 · EC-CHAT-001 / 002 |
| **ADR / 风险** | ADR-V4-030 / 031 / 032 · R43-01 / R43-02 / R4-06 |

**描述**: 在 `stream-model.ts` 追加终态事件类型（`ask-answer{value}` / `ask-cancel{reason:user|timeout|superseded}` / `auth-decision{decision:approved|rejected}`）+ `openAsks` 维护（`StreamState.openAsks ≤ 2` 恒成立）+ 仲裁规则（第 3 张到达 ⇒ supersede **最旧**；`REF_ROUND_PREFIX='ref-round-'` 的引用回合 ask **优先**，先 supersede 全部后台 ask 再入队）。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/web-cli-plugin/src/ui/sidepanel/stream-model.ts` |

**验收标准**:
- [ ] 终态枚举齐备（`answered` / `cancelled`×3 原因 / `approved` / `rejected`）；每类终态都有对应事件类型
- [ ] `openAsks.length ≤ MAX_OPEN_ASKS(2)` 恒成立（超限必 supersede 且有留痕）
- [ ] 引用回合优先级：`ref-round-` 前缀 ask 到达 ⇒ 先 supersede 非该前缀的后台 ask
- [ ] supersede **不静默**：被取代请求必产生 `ask-cancel{reason:'superseded'}`
- [ ] `ask`/`confirm` 单槽保留为「当前未终态卡」便捷视图（**不删除**旧字段语义）

**验证命令**:
```bash
npm run typecheck --workspace @lgdl/web-cli-plugin
```

### TASK-702（V43-02）: `cards/askuser.ts`（choice / text 两型 + 固化两态 + 不可二次）
| 属性 | 值 |
|------|-----|
| **复杂度** | L |
| **前置依赖** | TASK-701 |
| **执行波次** | 2 |
| **对应 FR / AC** | FR-CHAT-040 / 041 / 042 · AC-CHAT-003 / 005 / 015 · EC-CHAT-009 |
| **ADR / 风险** | ADR-V4-030 · R43-04 / R43-05 |

**描述**: `askuser` 卡完整实现：choice 型（选项 ≥3 + 末项兜底「其他…（我来描述）」默认收起）+ text 型（卡内输入按需出现 ⇒ 法四）；操作前后固化（`data-answered="false"→"true"|"cancelled"` + 表单 `hidden` + 固化文案「已答：{value}」/「已取消（不代填默认值）」+ `.ts` + `.card-fixed`）；终态卡**结构性不含**操作控件。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| NEW | `packages/web-cli-plugin/src/ui/sidepanel/cards/askuser.ts` |
| MODIFY | `packages/web-cli-plugin/src/ui/sidepanel/cards/index.ts` |

**验收标准**:
- [ ] choice 型：选项数 ≥3 + 末项兜底（默认收起）+ 取消 = 可点 ≤6；text 型：输入 + 提交 + 取消 = 3
- [ ] 操作前：表单可见 + 固化区 `hidden` + `data-answered="false"`；操作后：表单收起 + 固化区可见 + `.ts` 为 `HH:MM:SS`
- [ ] 终态卡内 `querySelectorAll('button,input,select,textarea').length === 0`（shim C9「不可二次回答」）
- [ ] `#ask*` 家族 id 以模板源（`<template>` / 克隆）保留，卡实例用 `data-card-key` 区分 ⇒ 既有断言可解析
- [ ] `aria-live` 播报固化结果；收起内容不在 tab 序；`:focus-visible` 可见

**验证命令**:
```bash
npm run typecheck --workspace @lgdl/web-cli-plugin && node packages/web-cli-plugin/design/ui-redesign/option-f-shim.mjs 2>&1 | tail -3
```

### TASK-703（V43-03）: `cards/auth.ts`（批准/拒绝 + 预演 + 审计入口 + 两态固化）
| 属性 | 值 |
|------|-----|
| **复杂度** | L |
| **前置依赖** | TASK-701 |
| **执行波次** | 2 |
| **对应 FR / AC** | FR-CHAT-045 / 046 / 047 · AC-CHAT-016 |
| **ADR / 风险** | ADR-V4-030 / 033 · R43-04 |

**描述**: `auth` 卡完整实现：批准 / 拒绝按钮 + 范围与后果预演（**复用既有 `#l1-consequence-tpl` 三段静态模板**「会发生什么 / 不会发生什么 / 不可逆性声明」+ 选项标签）+ 审计入口（复用 `#l1-receipt-audit` 出口）；两态固化 `data-decision="pending"→"approved"|"rejected"` + 操作按钮收起 + 固化文案 + `.ts`；**旧卡不消失**、不可重复决策。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| NEW | `packages/web-cli-plugin/src/ui/sidepanel/cards/auth.ts` |
| MODIFY | `packages/web-cli-plugin/src/ui/sidepanel/cards/index.ts` |

**验收标准**:
- [ ] 预演数据来源 = **静态三段模板 + 选项标签**（零新增数据依赖；不含命令参数体）
- [ ] `data-decision` 三态逐字（`pending` / `approved` / `rejected`，shim D2/D3/D5）
- [ ] 终态卡内零操作控件（shim D6「不可重复决策」）
- [ ] 审计入口可达（与审计视图分工：流内为决策留痕入口、审计视图为明细）
- [ ] auth 卡可点 = 允许 + 拒绝 + 审计入口 = 3（≤6）

**验证命令**:
```bash
npm run typecheck --workspace @lgdl/web-cli-plugin && node packages/web-cli-plugin/design/ui-redesign/option-f-shim.mjs 2>&1 | tail -3
```

### TASK-704（V43-04）: 流内留痕零明文（固化文案 / 预演 / 系统行）
| 属性 | 值 |
|------|-----|
| **复杂度** | S |
| **前置依赖** | TASK-701 |
| **执行波次** | 2 |
| **对应 FR / AC** | FR-CHAT-049 · AC-CHAT-021 · NFR-CHAT-005 / 012 |
| **ADR / 风险** | ADR-V4-034 · R43-03 / R4-07 |

**描述**: 固化文案 / 后果预演 / 系统事件行的零明文白名单与净化（复用 `l1/receipt.ts#FORBIDDEN` + `assertNoPlaintext()` 渲染时抛错 + 白名单 8 字段；`l2/audit.ts` 白名单 + URL 去参）；摘要落库**无自由文本**（只存 `askRequestId` + `terminal`）。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/web-cli-plugin/src/ui/sidepanel/stream-model.ts`（payload 净化入口） |
| MODIFY | `packages/web-cli-plugin/src/ui/sidepanel/cards/askuser.ts` / `cards/auth.ts`（渲染前二次校验） |

**验收标准**:
- [ ] 固化文案模板单源（卡内主 + 系统行辅不打架）；`{value}` 仅来自**用户主动输入**
- [ ] `auth` 固化文案 = 决策 + 时间戳 + 范围摘要（**不含**命令参数体）
- [ ] 系统行只接受**已净化文本**；渲染前再过一次白名单
- [ ] 反向用例（URL query / 命令参数体）⇒ `assertNoPlaintext` **抛错**

**验证命令**:
```bash
npm run typecheck --workspace @lgdl/web-cli-plugin && npm test --workspace @lgdl/web-cli-plugin 2>&1 | tee /tmp/opencode/v4-gate-logs/v4-3/node.log
```

### TASK-705（V43-05）: `supersededAsk` 升级 + 终态事件接线 + 60 s cancelled 投影
| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-702 / TASK-703 / TASK-704 |
| **执行波次** | 3 |
| **对应 FR / AC** | FR-CHAT-042 / 043 / 044 · AC-CHAT-014 / 015 · EC-CHAT-001 / 002 |
| **ADR / 风险** | ADR-V4-031 / 032 · R43-02 / R43-07 |

**描述**: `chat-state.ts` 的 `supersededAsk` 升级为**双留痕**（被取代卡 `data-answered="cancelled"` **主** + `system` 事件行「上一轮提问已被新的拾取回合取代（未作答即取消，不代填默认值）」**辅**）；`resolveAsk` / `resolveConfirm` 改为**追加终态事件**；`sidepanel.ts` 接线 `submitAsk` / `resolveConfirm`；SW 侧 60 s `canceled` 到达 ⇒ 面板追加 `ask-cancel{reason:'timeout'}` + 固化态 + 系统行。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/web-cli-plugin/src/ui/sidepanel/chat-state.ts` |
| MODIFY | `packages/web-cli-plugin/src/ui/sidepanel/sidepanel.ts` |

**验收标准**:
- [ ] supersede 双留痕齐备（卡内固化态 + ≥1 条系统行）；文案模板单源
- [ ] 60 s cancelled 到达 ⇒ `cancelled(timeout)` 终态 + 留痕 + **不代填默认值**；`ask-bridge.ts` **零 diff**
- [ ] `ask`/`confirm` 单槽 `null` 置位**不再是**「卡消失」信号
- [ ] 无出口状态不存在：每条未终态卡三条确定出口齐备

**验证命令**:
```bash
git diff --numstat -- packages/web-cli-plugin/src/background/ask-bridge.ts
npm run typecheck --workspace @lgdl/web-cli-plugin
```

### TASK-706（V43-06）: 回合语义（`pending` 与未答卡解耦 + `openAsks` 计数）
| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-701 |
| **执行波次** | 3 |
| **对应 FR / AC** | FR-CHAT-048 · AC-CHAT-014 |
| **ADR / 风险** | ADR-V4-032 · R43-01 / R4-06 |

**描述**: `view-model.ts` 回合语义：`pending=true` ⇒ ① composer 发送新回合禁用（`sendDisabledReason` 文案与来源**不改**）② 推荐 chip 禁用（v4-4 消费）③ **已有 ask/auth 卡提交不禁用**；未终态卡存在但 `pending=false` ⇒ 互不门控；`openAsks` 计数入视图模型。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/web-cli-plugin/src/ui/sidepanel/view-model.ts` |
| MODIFY | `packages/web-cli-plugin/src/ui/sidepanel/sidepanel.ts`（门控接线解耦） |

**验收标准**:
- [ ] 未终态卡从 composer 门控条件中**排除**（解耦可断言）；`sendDisabledReason` 文本/来源零改
- [ ] `openAsks` 计数暴露给视图模型（≤2）
- [ ] 构造「不答 + 不取消 + 等超时」场景 ⇒ `pending` 最终回落（无「永远处理中」）
- [ ] 会话切换 ⇒ `pending=false` 且未终态卡结算留痕

**验证命令**:
```bash
npm run typecheck --workspace @lgdl/web-cli-plugin && npm test --workspace @lgdl/web-cli-plugin 2>&1 | tee /tmp/opencode/v4-gate-logs/v4-3/node.log
```

### TASK-707（V43-07）: `rounds[]` 退役 + 证据层/回执迁移 + `decision-card.ts` 退役 + 宿主清零
| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-702 / TASK-703 |
| **执行波次** | 3 |
| **对应 FR / AC** | FR-CHAT-040 / 047 · AC-CHAT-016 · R4-18（宿主生命期） |
| **ADR / 风险** | ADR-V4-033 · ADR-V4-005 第 6 条 · R4-18 / R4-14 |

**描述**: `l1/panels.ts` 的 `rounds[]` 差分推断（`observe()`）**退役**（改为事件派生）；与 ask/auth 相关的证据层/回执归属迁移；`l0/decision-card.ts` **RETIRE**（台账逐条 old→new）；**清零本叶 `data-transitional-host="v4-3"` 占位宿主**。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/web-cli-plugin/src/ui/sidepanel/l1/panels.ts` |
| RETIRE | `packages/web-cli-plugin/src/ui/sidepanel/l0/decision-card.ts` |
| MODIFY | `packages/web-cli-plugin/src/ui/sidepanel/index.html`（本叶宿主清零） |
| MODIFY | `packages/web-cli-plugin/docs/v4-supersession-ledger.json`（entries：`decision-card.ts` / `rounds[]` / 独占槽契约） |

**验收标准**:
- [ ] `l0/decision-card.ts` 从构建入口移除且台账登记 old→new；**无**运行时引用残留
- [ ] `rounds[]` 推断退役后可经事件流复现同等历史视图（断言存在）
- [ ] 本叶宿主清零：`index.html` 内 `data-transitional-host="v4-3"` 计数 = **0**（`v4-4` 宿主保留）
- [ ] 独占决策槽契约的移除登记（FR-CHAT-040）逐条命中台账

**验证命令**:
```bash
node -e "const h=require('fs').readFileSync('packages/web-cli-plugin/src/ui/sidepanel/index.html','utf8');const n=(h.match(/data-transitional-host=\"v4-3\"/g)||[]).length;if(n!==0)throw new Error('v4-3 host residual: '+n);console.log('v4-3 hosts: 0')"
grep -rn "decision-card" packages/web-cli-plugin/src/ui/sidepanel/ | tee /tmp/opencode/v4-gate-logs/v4-3/decision-card-residual.log
```

### TASK-708（V43-08）: `test/ask-auth-inflow.test.ts`（node，状态机全终态 + 零明文）
| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-705 / TASK-706 |
| **执行波次** | 4 |
| **对应 FR / AC** | AC-CHAT-014 / 015 / 021 · EC-CHAT-001 / 002 |
| **ADR / 风险** | ADR-V4-030 / 031 / 032 / 034 · R43-01 / R43-03 |

**描述**: node 单测：全终态矩阵（答 / 取消（用户）/ 取消（超时）/ 取消（取代）/ 批准 / 拒绝）+ `MAX_OPEN_ASKS=2` 与仲裁优先级 + **无「永远处理中」** + 零明文（正例 + 反向用例）。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| NEW | `packages/web-cli-plugin/test/ask-auth-inflow.test.ts` |

**验收标准**:
- [ ] 六类终态逐类用例 + supersede 后「≥1 条留痕 ∧ 被取代卡 `data-answered==='cancelled'`」
- [ ] `openAsks ≤ 2` 不变量用例（含第 3 张到达路径）
- [ ] 「不答 + 不取消 + 等超时」⇒ `pending` 回落用例
- [ ] 零明文正/反向用例双跑（URL query / 命令参数体 ⇒ 抛错）

**验证命令**:
```bash
npm test --workspace @lgdl/web-cli-plugin 2>&1 | tee /tmp/opencode/v4-gate-logs/v4-3/node.log
```

### TASK-709（V43-09）: `test/ui/ask-auth-inflow.mjs`（Chromium，AC-CHAT-016 全断言）
| 属性 | 值 |
|------|-----|
| **复杂度** | L |
| **前置依赖** | TASK-707 |
| **执行波次** | 4 |
| **对应 FR / AC** | AC-CHAT-003 / 005 / 014 / 015 / **016（唯一验收面）** / 021 / 025 |
| **ADR / 风险** | ADR-V4-033 / 030 · R4-20 / R43-04 |

**描述**: Chromium 门禁：choice/text 两型 + 固化两态（逐 shim C5~C10 / D2~D6）+ 不可二次/不可重复 + 超时·取消·取代留痕 + `aria-live` + 焦点 + 320px + 单卡可点 ≤6；**AC-CHAT-016 全套断言（含站点级授权在设置视图的可发现/可读）落在本文件**。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| NEW | `packages/web-cli-plugin/test/ui/ask-auth-inflow.mjs` |
| MODIFY | `packages/web-cli-plugin/package.json` |

**验收标准**:
- [ ] shim C5~C10 / D2~D6 逐条等价断言（真实产物侧；与设计稿分列）
- [ ] 终态卡零操作控件（DOM 计数 = 0）；`aria-live` 播报；收起不在 tab 序
- [ ] 超时 / 取消 / 取代三类留痕在流内可读（`.ts` + 固化文案 + 系统行）
- [ ] AC-CHAT-016：批准/拒绝固化可读 + 时间戳 + 审计入口 + 与审计视图分工 + 站点授权在设置视图可发现可读
- [ ] 三宽度零溢出；单卡可点 ≤6

**验证命令**:
```bash
npm run build --workspace @lgdl/web-cli-plugin && node packages/web-cli-plugin/test/ui/ask-auth-inflow.mjs 2>&1 | tee /tmp/opencode/v4-gate-logs/v4-3/ask-auth-inflow.log
```

### TASK-710（V43-10）: 联动门禁（宿主清零断言 + gate-integrity 追加 + scripts）
| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-709 |
| **执行波次** | 5 |
| **对应 FR / AC** | FR-CHAT-084 · AC-CHAT-023 / 025 |
| **ADR / 风险** | ADR-V4-011 第 6 条 · R4-16 / R4-19 |

**描述**: `l0.mjs` / `l1.mjs` 追加「`data-transitional-host="v4-3"` 计数 = 0」与相关断言重锚；`gate-integrity.test.ts` 的 `EXPECTED_AUDITED_FILES` **追加 `test/ui/ask-auth-inflow.mjs`**（**不动 `CHROMIUM_GATES.length === 9`**）；`package.json` 追加 `test:ask-auth`。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/web-cli-plugin/test/ui/l0.mjs` |
| MODIFY | `packages/web-cli-plugin/test/ui/l1.mjs` |
| MODIFY | `packages/web-cli-plugin/test/gate-integrity.test.ts` |
| MODIFY | `packages/web-cli-plugin/package.json` |

**验收标准**:
- [ ] `EXPECTED_AUDITED_FILES` 含 `test/ui/ask-auth-inflow.mjs`；`CHROMIUM_GATES.length === 9` **未改**
- [ ] `l0.mjs` ≥164 / `l1.mjs` ≥103（只增）；v4-3 宿主清零断言存在
- [ ] `npm run test:ask-auth` 可串行执行；in-gate 例外文本只增（若涉及）

**验证命令**:
```bash
npm run test:l0 --workspace @lgdl/web-cli-plugin 2>&1 | tee /tmp/opencode/v4-gate-logs/v4-3/l0.log
npm run test:gate-integrity --workspace @lgdl/web-cli-plugin 2>&1 | tee /tmp/opencode/v4-gate-logs/v4-3/gate-integrity.log
```

### TASK-711（V43-11）: 本叶收口（全门禁串行 + AC-CHAT-016 owner 登记 + 五要素）
| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-708 / 709 / 710 |
| **执行波次** | 6 |
| **对应 FR / AC** | AC-CHAT-023 · FR-CHAT-094 · NFR-CHAT-006/007/009 |
| **ADR / 风险** | ADR-V4-033 / 010 · R4-09 / R4-15 |

**描述**: 严格串行跑全门禁（16 项，含 `test:ask-auth`）；v4 台账登记 **AC-CHAT-016 相关断言 `owner:"v4-3"`**（禁三处重复验收）+ 本叶 `entries`/`modifiedRanges`/`counts`；五要素中间重登记（`PENDING_ABSOLUTE_CAP` 保持 `resolved:false`）。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/web-cli-plugin/test/size-baseline.ts` |
| MODIFY | `packages/web-cli-plugin/docs/v4-supersession-ledger.json` |
| NEW（临时日志） | `/tmp/opencode/v4-gate-logs/v4-3/*.log` |

**验收标准**:
- [ ] 全 16 项门禁绿；计数只增（l0 ≥164 / l1 ≥103 / journey ≥167 / density ≥127 / nodeTestRuntime ≥ max(646, 实测)）
- [ ] AC-CHAT-016 断言**只在** `test/ui/ask-auth-inflow.mjs` 与 `test/ask-auth-inflow.test.ts` 内，台账标 `owner:"v4-3"`
- [ ] 五要素齐备；容差 5% 不变；`PENDING_ABSOLUTE_CAP` 不预填
- [ ] 不动面：`ask-bridge.ts` 零 diff / `content.js` 177,076 / `pick-layer.js` 33,900 / `KIND_SET` 零 diff

**验证命令**:
```bash
for s in typecheck build test test:supersession test:gate-integrity test:zero-injection test:page-input test:l0 test:l1 test:l2 test:density test:ui test:insight test:binding test:hardening test:e2e test:ask-auth; do npm run $s --workspace @lgdl/web-cli-plugin 2>&1 | tee "/tmp/opencode/v4-gate-logs/v4-3/${s//:/-}.log" || exit 1; done
git diff --numstat -- packages/web-cli-plugin/src/background/ask-bridge.ts
stat -c %s packages/web-cli-plugin/dist/sidepanel.js
```

## 3. 任务汇总

| 统计项 | 数值 |
|--------|:--:|
| 总任务数 | **11**（TASK-701~711 / V43-01~11） |
| S 级 | 1（TASK-704） |
| M 级 | 7 |
| L 级 | 3（TASK-702 / 703 / 709） |
| 执行波次 | **6** |

## 4. 执行策略

| 波次 | 任务 | 策略 |
|:--:|------|------|
| 1 | TASK-701 | 串行（状态机地基） |
| 2 | TASK-702, TASK-703, TASK-704 | 并行（ask 卡 ∥ auth 卡 ∥ 零明文；三组文件不相交） |
| 3 | TASK-705, TASK-706, TASK-707 | 并行（终态接线 ∥ 回合语义 ∥ 退役与宿主清零）；705 写 `chat-state`/`sidepanel`、706 写 `view-model`、707 写 `panels`/`index.html` |
| 4 | TASK-708, TASK-709 | 写入可并行；运行严格串行（node → Chromium） |
| 5 | TASK-710 | 串行（联动门禁 + 元门禁追加） |
| 6 | TASK-711 | 串行收口 |

**D-005 测试守恒账（本叶）**：

| 门禁 | v3 末轮实测基线 | 本叶处置 | 本叶预期 |
|------|:--:|------|:--:|
| 新增 `test/ui/ask-auth-inflow.mjs` | — | **新增**（Chromium；AC-CHAT-016 唯一验收面） | 首轮实测登记 |
| 新增 `test/ask-auth-inflow.test.ts` | — | **新增**（node，六类终态 + 仲裁 + 零明文） | 新增用例计入 node |
| `test/ui/l0.mjs` | **164** | 追加宿主清零断言（不重命名） | **≥164** |
| `test/ui/l1.mjs` | **103** | 相关断言重锚（同编号） | **≥103** |
| `npm test`（node 运行期） | 台账 **832** / 末轮 **795** | 新增 1 个 node 文件 | **≥ max(646, 实测)** |
| `test/ui/journey.mjs` / `l2` / `density` / `insight` / `binding` | 167 / 71 / 127 / 116 / 192 | 零改动（本叶不触碰语义） | 不变 |

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建。11 任务 / 6 波；AC-CHAT-016 **唯一验收叶**（台账标 `owner:"v4-3"`）；`ask-bridge.ts` 零 diff；无「永远处理中」为硬验收；宿主 `v4-3` 本叶清零（清零断言在 TASK-710，v4 总清零在 v4-4 TASK-812）。 | 2026-09-18 | SDDU Tasks Agent |
