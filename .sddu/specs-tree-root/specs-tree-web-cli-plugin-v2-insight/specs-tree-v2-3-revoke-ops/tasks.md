# 任务分解：specs-tree-v2-3-revoke-ops（V2-3 撤销与取消授权操作面）

> **文档定位**: SDDU 任务清单（**叶子子 Feature**，P0，P0 闭环第三环：可操作；**含安全复核**）— 将技术方案分解为可并行执行的原子任务，作为 build 阶段的输入
> **前置依赖**: V2-3 `plan.md` v1.0（既有 ops 白名单编排 + 三件套回执 + 结构安全/单调性/冻结门禁 + 文件影响 + 交付门槛）+ 父 `plan.md` v1.0（ADR-V2-008/009/011/013/015）+ V2-3 `spec.md` v1.0（FR-V2-030~040 + FR-V2-060~065 / NFR-V23-001~006 / EC-V23-001~009 / AC-V23-001~008）+ **V2-1 / V2-2 产出**（`ConnectTreeSnapshot` + `tree-view.ts` / `tree-drawer.ts`）
> **创建人**: SDDU Tasks Agent
> **创建时间**: 2026-09-13
> **版本**: v1.0
> **更新人**: SDDU Tasks Agent
> **更新时间**: 2026-09-13
> **更新说明**: 初始创建。V2-3 plan §3.1~3.7（白名单编排 7 动作 / 三件套回执 / 控件语义 / 二次确认与幂等 / 结构保证+单调性+冻结 / 审计零明文 / 边界情况）→ 整合为 **10 个原子任务 / 4 个执行波次**（跨叶子 Wave 10~13）。门禁矩阵：`insight-security`（**AC-V2-005 六条反向断言** + **allow 单调性** `allowAfter ⊆ allowBefore`）+ `insight-no-escalation`（`policy.ts`/`auto-authorize.ts` diff 冻结 + 无 bare catch + 零明文）+ `tree-ops` 纯测 + `test:binding` **追加**撤销链。**断言只增不减**：新门禁落新文件，`test:binding` 既有编号零删改。

---

## 0. 跨叶子定位与执行序（本文件 = V2-3，P0 第三环）

| 叶子 | 文件 | 跨叶子执行序 | 依赖 |
|------|------|:--:|------|
| V2-1 连接树数据模型与状态投影 | `specs-tree-v2-1-connect-tree-model/tasks.md` | Wave 1~5（先行） | — |
| V2-2 悬浮连接树 UI 与交互 | `specs-tree-v2-2-floating-tree-ui/tasks.md` | Wave 6~9 | V2-1 |
| **V2-3 撤销与取消授权操作面**（本文件） | `specs-tree-v2-3-revoke-ops/tasks.md` | **Wave 10~13** | V2-1（快照/命令档案）+ **V2-2 TASK-002（`tree-view.ts`）/ V2-2 TASK-004（`tree-drawer.ts`）**（本叶子对其 MODIFY） |

**门禁串行纪律（NFR-V2-009）**：`npm run build` → `npm test` → `npm run test:ui` → `npm run test:insight` → `npm run test:binding` → `npm run test:hardening` → `npm run test:e2e`，**逐条串行、绝不并发**（本仓库 OOM 前科）。

**安全红线（横切，结构保证）**：树是「可见性 + 撤销」面、**不是提权面** —— 撤销/关断**只调用既有 fail-closed 通路**，**永不放宽** `PLUGIN_RISK_DEFAULTS` / 4 条硬底线；**无任何新判定路径**。

---

## 1. 依赖拓扑总览

> 红线贯穿：动作表为**封闭联合**（7 动作，`switch(actionId)` **无默认写入分支**）；**不新增 SW `case`** / **不新增消息语义** / **不改既有 handler**；**不导入** `security/policy.ts` / `security/auto-authorize.ts` 的构造·写入面；**不做 `grant`/`request`**；**不做命令级策略覆盖**；**不假装静态权限可撤销**；**无 bare `catch`** / **无假成功** / **零明文**。

### 1.1 任务总览表

| 编号 | 模块/落点 | 类型 | 复杂度 | 依赖 | 执行波次 | 可并行 | 一句话目标 |
|------|----------|:--:|:--:|------|:--:|:--:|------|
| TASK-001 | `src/ui/tree/tree-receipt.ts` | 🛠 | M | V2-1-TASK-005 | Wave 10 | ∥ 003 | 三件套回执纯对象（① 回执 ② 工具面已移除证据〔**来自重拉实测**〕③ 审计入口 `admin_audit-export`） |
| TASK-002 | `src/ui/tree/tree-ops.ts` | 🛠 | L | 001/003 | Wave 11 | — | 动作**白名单**编排（7 动作 → 唯一既有通路；封闭联合；幂等；失败→`kind:'err'`） |
| TASK-003 | `src/ui/tree/tree-view.ts`（MODIFY） | 🛠 | S | V2-2-TASK-002 | Wave 10 | ∥ 001 | 控件语义扩展（`deny` 无开关 / 静态权限无撤销 / `needsConfirmation` 7 动作） |
| TASK-004 | `src/ui/tree/tree-drawer.ts`（MODIFY） | 🛠 | M | 002 | Wave 12 | ∥ 005/006/007 | 绑定动作 + `#tree-receipt` + `#tree-confirm`（拒绝 → 零操作 fail-closed） |
| TASK-005 | `test/tree-ops.test.ts` | ⚖️ | S | 002 | Wave 12 | ∥ 004/006/007 | `tree-ops` 纯测（7 动作唯一映射 / 无默认写入分支 / `needsConfirmation` / 幂等 / 失败 `kind:'err'`） |
| TASK-006 | `test/insight-security.test.ts` | ⚖️ | L | 002 | Wave 12 | ∥ 004/005/007 | **AC-V2-005 六条反向断言** + **allow 单调性**（真实 `createPluginPolicyConfig` + `decideAutoAuthorization` 经 `host.dispatch` + `onAsk` spy） |
| TASK-007 | `test/insight-no-escalation.test.ts`（MODIFY 追加） | ⚖️ | M | 004 | Wave 12 | ∥ 004/005/006 | 冻结门禁（`policy.ts`/`auto-authorize.ts` `git diff --quiet` + pinned 判定表 + 导入白名单 + 无 bare catch + 零明文） |
| TASK-008 | `test/ui/binding.mjs`（MODIFY 追加） | ⚖️ | M | 004 | Wave 13 | ∥ 009/010 | **追加**撤销链 check（站点取消授权 / 能力撤销 / 开关关断 → 工具即时移出 + 审计；**既有编号零删改**） |
| TASK-009 | 门禁串行 + `test:binding` 回归核验（收口） | ⚖️ | M | 006/007/008 | Wave 13 | — | 串行全套 + v1 `test:binding` 既有 163 断言零删减 + `web-cli-base` 483 零回归 |
| TASK-010 | `docs/smoke-checklist.md`（v2 § 追加）+ 人工面 H-1~H-6 | 📄 | M | 008 | Wave 13 | ∥ 009 | 人工面检查清单落点 + 执行登记（H-1~H-6） |

### 1.2 依赖拓扑（串行主轴 + 并行组）

```
Wave 10（并行组 ①：文件不相交）：
  TASK-001 [M] 🛠 tree-receipt.ts（三件套纯对象）
  TASK-003 [S] 🛠 tree-view.ts 控件语义（MODIFY V2-2 产物）

Wave 11（串行：消费 001/003 的动作表与控件语义）：
  TASK-002 [L] 🛠 tree-ops.ts（白名单编排）

Wave 12（并行组 ②：005/006 是纯测与决策表，004 是 DOM 绑定，007 是冻结门禁；文件不相交）：
  TASK-004 [M] 🛠 tree-drawer.ts 动作绑定 + 回执/确认
  TASK-005 [S] ⚖️ tree-ops 纯测
  TASK-006 [L] ⚖️ insight-security（六条反向断言 + 单调性）
  TASK-007 [M] ⚖️ insight-no-escalation 追加（冻结 + 白名单 + zero-plaintext）

Wave 13（收口；⚠️ 执行串行）：
  TASK-008 [M] ⚖️ test:binding 追加撤销链（#21a…）
  TASK-009 [M] ⚖️ 门禁串行 + 回归核验
  TASK-010 [M] 📄 人工面清单落点 + H-1~H-6 登记
```

### 1.3 并行分组（执行波次）

```
Wave 10 ─── (并行组 ①)
  TASK-001 [M] 🛠 tree-receipt.ts
  TASK-003 [S] 🛠 tree-view.ts 控件语义

Wave 11 ─── (串行)
  TASK-002 [L] 🛠 tree-ops.ts（白名单编排）

Wave 12 ─── (并行组 ②)
  TASK-004 [M] 🛠 tree-drawer.ts 绑定
  TASK-005 [S] ⚖️ tree-ops 纯测
  TASK-006 [L] ⚖️ insight-security
  TASK-007 [M] ⚖️ insight-no-escalation 追加

Wave 13 ─── (收口；⚠️ 串行执行)
  TASK-008 [M] ⚖️ test:binding 追加撤销链
  TASK-009 [M] ⚖️ 门禁串行 + 回归核验
  TASK-010 [M] 📄 人工面清单落点 + H-1~H-6
```

---

## 2. 任务列表

> 缩写：V23 = 本叶子；ADR-NN = 父 `plan.md` §8；FR/NFR/EC/AC = 父 `spec.md`；NFR-V23 / EC-V23 / AC-V23 = 本叶子 `spec.md`。
> **动作白名单（7，唯一映射既有通路）**：`revoke-origin` → `makeMessage('revoke',{origin})`；`revoke-capability` → `ops.revokeCapability(cap)`；`set-capability-toggle` → `ops.setCapabilityPrivacy(...)`；`set-tabs-toggle` → `ops.setTabsSetting(...)`；`clear-auto-auth` → `ops.clearAutoAuth(origin)`；`disconnect-llm`（P1）→ `ops.clearLlm()`；`dissolve-group`（P1）→ `ops.groupAction({action:'delete',groupId})`。

### TASK-001: 三件套回执（`tree-receipt.ts`，纯）

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **类型** | 🛠 实施（纯函数） |
| **前置依赖** | V2-1-TASK-005 |
| **执行波次** | Wave 10 |
| **对应 FR** | FR-V2-037/039（+ AC-V23-005） |
| **承接 ADR** | ADR-V2-009（三件套 + 既有 `admin_audit-export`；零明文） |

**描述**: `tree-receipt.ts`：`buildReceipt(input)` / `toolSurfaceEvidence(tool, present, now)` → `TreeReceipt`：① `receipt{ok,kind:'ok'|'warn'|'err',text}`（成功/失败原因 + 下一步）；② `toolSurfaceEvidence{tool,present,checkedAt,evidence}`（**证据来自动作后重拉 `insight-tree` 实测 `presentInSurface===false`，不是文案声称**）；③ `auditEntry{entryPoint:'admin_audit-export',hint}`。**无静默失败/假成功**：`opResult.ok===false` → `kind:'err'`，不得渲染成功态；**无 bare `catch`**。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| NEW | `packages/web-cli-plugin/src/ui/tree/tree-receipt.ts` |

**验收标准**:
- [ ] 三件套字段齐全；② 的 `present` 由注入的**实测值**决定（非文案）
- [ ] `opResult.ok===false` → `kind:'err'`；不产生成功态
- [ ] **无 bare `catch {}`**；零明文（不携带 key/剪贴板/通知正文）
- [ ] 纯函数（`now` 可注入，可单测）；`npm run typecheck` 0 error

**验证命令**:
```bash
cd packages/web-cli-plugin && npm run typecheck
! grep -rnE "catch\s*\([^)]*\)\s*\{\s*\}|apiKey" src/ui/tree/tree-receipt.ts
```

### TASK-002: 动作白名单编排（`tree-ops.ts`）

| 属性 | 值 |
|------|-----|
| **复杂度** | L |
| **类型** | 🛠 实施（编排层） |
| **前置依赖** | TASK-001/003 |
| **执行波次** | Wave 11 |
| **对应 FR** | FR-V2-030/031/032/033/034/035/036/037/039/040（+ FR-V2-063） |
| **承接 ADR** | ADR-V2-008（白名单编排，**永不新增判定路径**）、ADR-V2-013（二次确认范围） |

**描述**: `createTreeOps({ops, transport, env, refreshSnapshot, now?})` → `{run(req)}`：封闭联合 `TreeActionId`（7 值）+ 唯一既有通路映射（§上表）；`switch(actionId)` 分派，**无默认写入分支**；`needsConfirmation` 决定是否先走 `#tree-confirm`（拒绝 → **零操作、fail-closed**，不发送任何消息）；不可逆/高影响需确认（`revoke-origin`/`revoke-capability`/`clear-auto-auth`/`disconnect-llm`/`dissolve-group`），可逆开关不需（`set-capability-toggle`/`set-tabs-toggle`）；**幂等**（`revoked:false` → 「已撤销」可读态，不报错刷屏、不产生重复审计噪音）；动作后 `refreshSnapshot()` 取真值填充三件套。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| NEW | `packages/web-cli-plugin/src/ui/tree/tree-ops.ts` |

**验收标准**:
- [ ] 动作表为**封闭联合** 7 值；`run()` `switch(actionId)` **无默认写入分支**；无 `grant`/`request`；无命令级动作
- [ ] 每个动作**唯一映射**既有通路（只调 `SettingsOps`/既有消息，不新增 SW `case`/消息语义）
- [ ] **不导入** `security/policy.ts` / `security/auto-authorize.ts`（grep）
- [ ] 确认拒绝 → **零操作**（不发送任何消息，fail-closed）
- [ ] 不可逆/高影响 → 确认；可逆开关 → 不确认
- [ ] 幂等：重复 `revoke-origin` 返回可读「已撤销」；失败 → `kind:'err'`；无 bare `catch`
- [ ] 零明文；`npm run build` + `typecheck` 0 error

**验证命令**:
```bash
cd packages/web-cli-plugin && npm run build && npm run typecheck
! grep -rnE "from '.*security/(policy|auto-authorize)'|catch\s*\([^)]*\)\s*\{\s*\}" src/ui/tree/tree-ops.ts
```

### TASK-003: `tree-view.ts` 控件语义扩展（MODIFY）

| 属性 | 值 |
|------|-----|
| **复杂度** | S |
| **类型** | 🛠 实施（MODIFY V2-2 产物） |
| **前置依赖** | V2-2-TASK-002 |
| **执行波次** | Wave 10 |
| **对应 FR** | FR-V2-038/052/064/025 |
| **承接 ADR** | ADR-V2-011（render model 结构保证） |

**描述**: 在 V2-2 `tree-view.ts` 上**追加**（不删改既有断言/行为）：① 命令 `action==='deny'` → `controls:[]`；② 静态权限 `revocable:false` + `revokeHint`，`controls` 不含 `revoke`；③ 可选能力仅 `granted===true` 给 `revoke`；④ `deny` 三成因（S1/S3/evaluate/hardDeny）标注可读；⑤ `needsConfirmation(actionId)` 7 动作正确；⑥ 文案钉死（`noEscalationNote` + `delay` 消歧）。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/web-cli-plugin/src/ui/tree/tree-view.ts`（追加控件语义；V2-2 既有行为零删改） |

**验收标准**:
- [ ] `deny` → `controls:[]`；静态权限 `controls` 无 `revoke`；可选能力仅 `granted===true` 给 `revoke`
- [ ] `deny` 成因标注可读（S1/S3/evaluate/hardDeny）
- [ ] `needsConfirmation` 7/7 正确
- [ ] V2-2 既有 `tree-view` 断言**零删减**（`test/tree-view.test.ts` 全绿）
- [ ] `npm run typecheck` 0 error

**验证命令**:
```bash
cd packages/web-cli-plugin && npm run typecheck && npm test
```

### TASK-004: `tree-drawer.ts` 动作绑定 + `#tree-receipt` + `#tree-confirm`（MODIFY）

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **类型** | 🛠 实施（MODIFY V2-2 产物） |
| **前置依赖** | TASK-002 |
| **执行波次** | Wave 12 |
| **对应 FR** | FR-V2-037/039/040 |
| **承接 ADR** | ADR-V2-009、ADR-V2-013 |

**描述**: 在 V2-2 `tree-drawer.ts` 上**追加**：动作控件 → `tree-ops.run()`；`#tree-receipt`（`role="status" aria-live="polite"`）内联展示 ①；② 显示「已不在工具面（已重对账）」；③ 按钮触发既有 `audit-export`；`#tree-confirm`（抽屉内联）承载二次确认摘要（作用对象 + 后果 + 不可逆说明），**复用**既有 `.row`/`button` 样式与 `#confirm` 文案约定，**不复用** dispatch 的 `confirm-request` 通道；拒绝 → 零操作。零 `innerHTML`。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/web-cli-plugin/src/ui/tree/tree-drawer.ts`（追加动作绑定 + 回执/确认渲染；V2-2 既有行为零删改） |

**验收标准**:
- [ ] 7 动作控件绑定到 `tree-ops.run()`；确认拒绝 → **零操作**（无消息发送）
- [ ] `#tree-receipt` 展示三件套（① 内联；② 来自实测；③ 触发既有 `admin_audit-export`）
- [ ] `#tree-confirm` 摘要含「作用对象 + 后果 + 不可逆说明」
- [ ] 零 `innerHTML`；无 bare `catch`；失败不渲染成功态
- [ ] V2-2 既有抽屉行为零删改；`npm run build` + `typecheck` 0 error

**验证命令**:
```bash
cd packages/web-cli-plugin && npm run build && npm run typecheck
! grep -rnE "innerHTML|catch\s*\([^)]*\)\s*\{\s*\}" src/ui/tree/tree-drawer.ts
```

### TASK-005: 门禁 `tree-ops` 纯测

| 属性 | 值 |
|------|-----|
| **复杂度** | S |
| **类型** | ⚖️ 门禁（node 单测） |
| **前置依赖** | TASK-002 |
| **执行波次** | Wave 12 |
| **对应 FR** | FR-V2-036/039/040（+ AC-V23-005/007/008） |

**描述**: **新文件** `test/tree-ops.test.ts`：7 动作 → 唯一既有通路（注入 spy 断言调用）；**无默认写入分支**；`needsConfirmation` 逐动作；幂等（重复撤销可读）；失败 → `kind:'err'`；确认拒绝零操作。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| NEW | `packages/web-cli-plugin/test/tree-ops.test.ts` |

**验收标准**:
- [ ] 7/7 动作映射唯一既有通路（spy 断言）
- [ ] 无默认写入分支（未知 `actionId` 不触发任何写入）
- [ ] `needsConfirmation` 逐动作；确认拒绝零操作
- [ ] 幂等可读；失败路径 `kind:'err'`（≥3 类失败可读）
- [ ] `npm test` 全绿

**验证命令**:
```bash
cd packages/web-cli-plugin && npm test
```

### TASK-006: 门禁 `insight-security`（AC-V2-005 六条反向断言 + allow 单调性）

| 属性 | 值 |
|------|-----|
| **复杂度** | L |
| **类型** | ⚖️ 门禁（node 单测；**安全复核**） |
| **前置依赖** | TASK-002 |
| **执行波次** | Wave 12 |
| **对应 FR** | FR-V2-036/060/061/062/063（+ AC-V2-005 / AC-V23-004） |
| **承接 ADR** | ADR-V2-008/011/015 |

**描述**: **新文件** `test/insight-security.test.ts`：以**真实** `createPluginPolicyConfig` + `decideAutoAuthorization`（经真实 `host.dispatch` + `onAsk` spy：被调用 = `ask`；未调用且 `result.ok===true` = `allow`；否则 = `deny`）构建决策表。**(a) AC-V2-005 六条反向断言**（撤销/关断/自动授权开启等状态下逐条）：① 未授权 origin 仍 `deny`（S1）；② 未知/非法 risk 仍 `deny`（S3）；③ `evaluate` 仍 `deny`；④ 破坏性写仍 `ask`（**无** `auto-authorize/allow` 审计）；⑤ `clipboard read`（`state` 档）仍 `ask`（永不自动放行）；⑥ `bookmarks remove` 仍 `ask`（不纳入写自动）。**(b) allow 单调性**：对**每个**撤销动作，应用状态变更前后各跑一次全量决策表，断言 **`allowAfter ⊆ allowBefore`**（任何 `ask/deny → allow` 即 FAIL）。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| NEW | `packages/web-cli-plugin/test/insight-security.test.ts` |

**验收标准**:
- [ ] 六条反向断言 6/6 逐条通过（各状态下）
- [ ] **allow 单调收缩**（`allowAfter ⊆ allowBefore`）对每个撤销动作成立；零 `ask/deny → allow`
- [ ] 破坏性写断言中**无** `auto-authorize/allow` 审计
- [ ] `policy.ts` / `auto-authorize.ts` 代码零 diff（与 TASK-007 联合）
- [ ] `npm test` 全绿（串行）

**验证命令**:
```bash
cd packages/web-cli-plugin && npm test
```

### TASK-007: 门禁 `insight-no-escalation` 追加（冻结 + 导入白名单 + 无 bare catch + 零明文）

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **类型** | ⚖️ 门禁（node + git；**MODIFY 追加**） |
| **前置依赖** | TASK-004 |
| **执行波次** | Wave 12 |
| **对应 FR** | FR-V2-003/063/065（+ AC-V2-005 diff 面） |
| **承接 ADR** | ADR-V2-015 |

**描述**: 在 V2-1-TASK-009 建立的 `test/insight-no-escalation.test.ts` 上**追加**（**零删减**）：① `git diff --quiet HEAD -- src/security/policy.ts src/security/auto-authorize.ts`（非 git 环境给可读降级，不静默通过）；② `PLUGIN_RISK_DEFAULTS` pinned 判定表深度相等；③ `AUTO_AUTH_DEFAULTS = {read:true,write:false}` pinned；④ `decideAutoAuthorization` 硬底线行为 pinned；⑤ V2 源码导入白名单（`src/ui/tree/tree-ops.ts` 不得导入 `policy.ts`/`auto-authorize.ts`；无 `riskDefaults` 赋值、无 `createPluginPolicyConfig` 调用）；⑥ 无 bare `catch`；⑦ 无 `apiKey` / 剪贴板 / 通知明文。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/web-cli-plugin/test/insight-no-escalation.test.ts`（V2-1 建立的基础段**追加** tree 层断言；零删减） |

**验收标准**:
- [ ] `policy.ts` / `auto-authorize.ts` `git diff --quiet` 为空（非 git 环境可读降级，不静默通过）
- [ ] `PLUGIN_RISK_DEFAULTS` / `AUTO_AUTH_DEFAULTS` / `decideAutoAuthorization` 硬底线 pinned
- [ ] 导入白名单 grep 零命中；无 bare `catch`；零明文
- [ ] V2-1 基础段断言**零删减**
- [ ] `npm test` 全绿

**验证命令**:
```bash
cd packages/web-cli-plugin && npm test
git -C ../.. diff --quiet HEAD -- packages/web-cli-plugin/src/security/policy.ts packages/web-cli-plugin/src/security/auto-authorize.ts
```

### TASK-008: `test:binding` 追加撤销链 check（MODIFY `binding.mjs`）

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **类型** | ⚖️ 门禁（真实 dist + 真实站点；**串行执行**） |
| **前置依赖** | TASK-004 |
| **执行波次** | Wave 13 |
| **对应 FR** | FR-V2-030/031/032/037（+ AC-V23-001/002/003） |

**描述**: 在 `test/ui/binding.mjs` **追加** V2-3 撤销链 check（新编号 **`#21a…`**，既有编号**零删改**）：① 站点取消授权 → 该站点工具**即时**从 `deriveTools()` 移出 + 审计 + `host_permissions` 移除回执；② 可选能力 `permissions.remove` → 工具即时移出 + 派发可读拒绝 + `optional-permission/revoked` 审计；③ 开关关断 → `deriveTools()` 无该工具；④ 撤销后工具面证据来自重拉实测。

> **编排器代作者决策（TD-V23-01，2026-09-13 授权）**：V2-3 plan §3.6 原拟追加编号 `#19a…`，但 `binding.mjs` 既有 **`#19a~#19l`**（v1 自动授权链）与 **`#20a~#20f`**（v1 会话跟随）**已占用**；故 V2-3 追加编号顺延为 **`#21a…`**（与既有编号零冲突）。此为编号唯一性修正，**不改任何既有断言**。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/web-cli-plugin/test/ui/binding.mjs`（**追加** `#21a…` 撤销链 check；既有编号零删改） |

**验收标准**:
- [ ] 三类撤销链全绿：站点取消授权 / 能力撤销 / 开关关断
- [ ] 撤销后工具面**即时**移出（不等待重启/重载）+ 审计落地
- [ ] 新编号 `#21a…`，与既有 `#19*`/`#20*` 零冲突
- [ ] 既有编号（含 v1 163 断言）**零删改**（`git diff` 仅新增行）
- [ ] 串行执行（**绝不与 `test:ui` / `test:insight` 并发**）

**验证命令**:
```bash
cd packages/web-cli-plugin && npm run build && npm run test:binding   # 串行
git -C ../.. diff --unified=0 -- packages/web-cli-plugin/test/ui/binding.mjs | grep -E "^-[^-]" || echo "append-only ok"
```

### TASK-009: 门禁串行 + `test:binding` 回归核验（收口）

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **类型** | ⚖️ 验证收口（**串行**） |
| **前置依赖** | TASK-006/007/008 |
| **执行波次** | Wave 13 |
| **对应 FR** | NFR-V23-003/004、AC-V2-011 |

**描述**: 逐条**串行**执行全套门禁：`npm run build` → `npm test` → `npm run test:ui` → `npm run test:insight` → `npm run test:binding` → `npm run test:hardening` → `npm run test:e2e` → `tsc --noEmit`。核验 v1 `test:binding` 既有 **163 断言**零删减；`web-cli-base` **483 零回归**；全仓 0 fail；`policy.ts`/`auto-authorize.ts` 零 diff。**绝不并发**。

**涉及文件**: 无（执行记录；结果回填 build.md）

**验收标准**:
- [ ] 全套门禁逐条串行通过，全仓 0 fail
- [ ] v1 `test:binding` 既有 163 断言**零删减**（新 `#21a…` 为纯追加）
- [ ] `web-cli-base` 483 零回归；`tsc --noEmit` 0 error
- [ ] `policy.ts` / `auto-authorize.ts` 零 diff
- [ ] 串行执行记录可追溯（命令顺序 + 时间）

**验证命令**:
```bash
cd packages/web-cli-plugin
npm run build && npm test
npm run test:ui && npm run test:insight && npm run test:binding
npm run test:hardening && npm run test:e2e && npm run typecheck
```

### TASK-010: 人工面清单落点（`docs/smoke-checklist.md` v2 § 追加）+ H-1~H-6 执行登记

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **类型** | 📄 文档 + 人工验证（headless 无法覆盖） |
| **前置依赖** | TASK-008 |
| **执行波次** | Wave 13 |
| **对应 FR** | NFR-V2-008 |

**描述**: 在 `docs/smoke-checklist.md` v2 段**追加** V2-3 人工面检查清单（不删改既有内容）：**H-1** 真实授权弹窗（`chrome.permissions.request`；V2-3 **不授予**权限，只撤销；授权入口仍归设置面板）；**H-2** 原生 `tabs.goBack`/`goForward` 浏览器壳行为；**H-3** 剪贴板真读焦点；**H-4** 真实用户手势下 `permissions.remove` 浏览器回执观感；**H-5** `chrome://extensions` 外部撤销后树内实时刷新观感；**H-6** 二次确认文案在窄栏/长站点名下的可读性与拥挤度。逐项给步骤 / 期望 / 执行结果栏。编号前缀 `V2-H-*`，与 v1 `H0~H10` 零冲突。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/web-cli-plugin/docs/smoke-checklist.md`（追加 V2-3 人工面 §；既有内容零删改） |

**验收标准**:
- [ ] 追加 V2-3 人工面 §，含 H-1~H-6 逐项（步骤 / 期望 / 本轮结论栏）
- [ ] 既有 §1/§2/§3 与 V2-2 已写内容**零删改**
- [ ] 人工执行登记（无法自动化项如实标注；未执行标「⏳ 待人工」）
- [ ] 编号前缀 `V2-H-*`，与 v1 `H0~H10` 零冲突

**验证命令**:
```bash
cd packages/web-cli-plugin
grep -qE "H-1|H-5|chrome://extensions" docs/smoke-checklist.md
git -C ../.. diff --stat -- packages/web-cli-plugin/docs/smoke-checklist.md
```

---

## 3. 任务汇总

| 统计项 | 数值 |
|--------|:--:|
| 总任务数 | **10** |
| S 级 | 2（TASK-003/005） |
| M 级 | 6（TASK-001/004/007/008/009/010） |
| L 级 | 2（TASK-002/006） |
| 执行波次 | **4**（跨叶子 Wave 10~13） |
| 实施任务（🛠） | 4（001/002/003/004） |
| 门禁任务（⚖️） | 5（005/006/007/008/009） |
| 文档/人工（📄） | 1（010） |
| 新建文件 | 4（`tree-receipt.ts`/`tree-ops.ts`/`tree-ops.test.ts`/`insight-security.test.ts`） |
| 修改文件 | 4（`tree-view.ts`/`tree-drawer.ts`/`insight-no-escalation.test.ts`/`binding.mjs`/`docs/smoke-checklist.md`） |
| P1 动作（`disconnect-llm`/`dissolve-group`） | 白名单中标注 P1；P0 闭环不要求其 UI 入口（P0 只要求 LLM 可见） |

### 3.1 交付门槛矩阵（本叶子）

| 门禁 | 命令 | 断言要点 | 新增 vs 追加 | 承载任务 |
|------|------|----------|:--:|:--:|
| `tree-ops`（纯） | `npm test` | 7 动作唯一映射 / 无默认写入分支 / `needsConfirmation` / 幂等 / 失败 `kind:'err'` | **新增文件** `test/tree-ops.test.ts` | TASK-005 |
| `insight-security` | `npm test` | **AC-V2-005 六条反向断言**（未授权 deny / 未知 risk deny / evaluate deny / 破坏性 ask / clipboard read ask / bookmarks remove ask）+ **allow 单调性** `allowAfter ⊆ allowBefore` | **新增文件** `test/insight-security.test.ts` | TASK-006 |
| `insight-no-escalation` | `npm test` + git | `policy.ts`/`auto-authorize.ts` `git diff --quiet` + pinned 判定表 + 导入白名单 + 无 bare catch + 零明文 | **追加**（V2-1-TASK-009 建立的基础段，零删减） | TASK-007 |
| `test:binding`（撤链） | `npm run test:binding` | 站点取消授权 / 能力撤销 / 开关关断 → 工具**即时**移出 + 审计；`#21a…` | **追加** `test/ui/binding.mjs`（既有编号零删改） | TASK-008 |
| `policy/auto-authorize` 冻结 | git diff | 两个判定链文件零 diff | 零改动 v1 判定链 | TASK-006/007/009 |

### 3.2 断言只增不减（具体保证方式）

| 类别 | 文件 | 方式 |
|------|------|------|
| V2-3 新增断言 | `test/tree-ops.test.ts` / `test/insight-security.test.ts` | **全部新增文件** |
| 共用门禁 | `test/insight-no-escalation.test.ts` | V2-1 **建立** → V2-3 **追加**（跨叶子串行；零删减） |
| v1 `test:binding` 断言 | `test/ui/binding.mjs` | 既有编号（`#19*`/`#20*` 等 163 断言）**零删改**；核验方式：`git diff --unified=0` 断言无删除行 + 既有断言计数不变 |
| v1 判定链 | `src/security/policy.ts` / `src/security/auto-authorize.ts` | **零 diff**（`git diff --quiet` 硬断言） |

---

## 4. 执行策略

### 4.1 门禁串行纪律（NFR-V2-009，绝不并发）

```bash
npm run build --workspace @lgdl/web-cli-plugin
npm test --workspace @lgdl/web-cli-plugin
npm run test:ui --workspace @lgdl/web-cli-plugin
npm run test:insight --workspace @lgdl/web-cli-plugin
npm run test:binding --workspace @lgdl/web-cli-plugin   # 含 V2-3 追加 #21a…
npm run test:hardening --workspace @lgdl/web-cli-plugin
npm run test:e2e --workspace @lgdl/web-cli-plugin
# 逐条串行；任何一步 fail 即停，修复后从头串行重跑；Chromium 门禁绝不并发（OOM 前科）
```

### 4.2 文件所有权（防并行冲突）

- `src/ui/tree/tree-receipt.ts` / `tree-ops.ts` → V2-3 **新建**（V2-2 无此文件）；
- `src/ui/tree/tree-view.ts` / `tree-drawer.ts` → V2-2 **新建** → V2-3 **MODIFY**（跨叶子串行，V2-3 在后）；
- `test/insight-no-escalation.test.ts` → V2-1 **新建** → V2-3 **MODIFY 追加**（跨叶子串行，零删减）；
- `test/ui/binding.mjs` → v1 文件，V2-3 **追加**（既有编号零删改）；
- `docs/smoke-checklist.md` → V2-2 **追加 v2 §** → V2-3 **追加 V2-3 人工面 §**（跨叶子串行）。

### 4.3 编排器代作者决策登记（2026-09-13 授权）

| # | 事项 | 裁决 |
|---|------|------|
| TD-V23-01 | `binding.mjs` 追加编号 | plan 原拟 `#19a…` 已被 v1 `#19a~#19l`（自动授权链）与 `#20a~#20f`（会话跟随）占用 → V2-3 追加编号顺延为 **`#21a…`**（唯一性修正，不改既有断言） |
| TD-V23-02 | 门禁承载 | `insight-security.test.ts` 为**新文件**；`insight-no-escalation.test.ts` 由 V2-1 建立、V2-3 追加（零删减） |
| TD-V23-03 | P1 动作 | `disconnect-llm` / `dissolve-group` 保留在白名单（结构完整），P0 闭环不要求其 UI 入口（P0 只要求 LLM 可见） |
| TD-V23-04 | 波次 | 叶内 4 波（跨叶子 Wave 10~13）；安全门禁与 `test:binding` 串行执行 |

---

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建。V2-3 plan §3.1~3.7 → **10 个原子任务 / 4 波**（三件套回执 / 控件语义 / 白名单编排 / tree-drawer 绑定 / tree-ops 纯测 / insight-security 六条反向断言+单调性 / insight-no-escalation 追加冻结门禁 / test:binding 追加撤链 / 串行收口 / 人工面 H-1~H-6）。安全红线：封闭 7 动作白名单（无默认写入分支）+ allow 单调性（`allowAfter ⊆ allowBefore`）+ `policy.ts`/`auto-authorize.ts` 零 diff + 无 bare catch + 零明文。`binding.mjs` 追加编号 `#21a…`（TD-V23-01，避让已被占用的 `#19a~#19l`/`#20a~#20f`）。承接父 plan ADR-V2-008/009/011/013/015。 | 2026-09-13 | SDDU Tasks Agent |
