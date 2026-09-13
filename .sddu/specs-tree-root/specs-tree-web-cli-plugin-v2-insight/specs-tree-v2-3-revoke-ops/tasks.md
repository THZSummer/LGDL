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

## 5. R2 任务分解（post-validate 修订轮，2026-09-13；**phase 不回退**）

> **文档定位**: R2 修订轮任务（V2-3 覆盖引擎）—— 新增**命令级用户覆盖层**（工具级 + 子命令级 allow/ask/deny）+ **SW 侧硬底线 clamp**（`[S1,S3,override,S2]`，不改冻结 `policy.ts`/`auto-authorize.ts`）+ 存储/继承/恢复/幂等/无半写/审计零明文 + 白名单 7→9 + 放宽类二次确认；`FR-V2-036` 范围限定为撤销/关断通路。
> **输入**: 本叶 `spec.md` v2.0（R2）+ 本叶 `plan.md` v2.0（§9）+ 父 `plan.md` v2.0 §9/§10（ADR-V2-024~033）+ 父 `spec.md` v2.0 §5.7 `FR-V2-070~079` / §8 `AC-V2-020~027` + `state.json#revisionRounds.R2`。
> **授权**: 编排器代作者决策（2026-09-13 授权）**+ R2** —— 本阶段**不再向作者提问**；开放点自行裁决并登记（TD-R2-01~10）。
> **纪律**: 不碰 `main` / 不碰 `packages/web-cli-base/**` / 不改 v1 SDDU 目录 / 无新依赖 / 不 force push / 禁 `git add -A` / 禁提交 `.opencode/opencode.json`；**只排任务**（不写代码、不跑 Chromium 门禁）；phase 不回退。
> **承接**: 本叶 R2 承载 FR-V2-074、FR-V2-075、FR-V2-076；叶级 AC AC-V23-009、AC-V23-010。

### 5.0 编排器代作者决策（TD-R2-01~10；2026-09-13 授权 + R2）

> 作者已授权编排器自行决策 → 本阶段**不再向作者提问**；以下开放点自行裁决并登记。

| # | 事项 | 裁决 |
|:--:|------|------|
| TD-R2-01 | R2 波次重排 | `R2-Wave 1~6`（全局承接原 Wave 18~23）= 模型层 → 覆盖引擎 → UI 层 → 档案 → 门禁/体积/文档 → 收口 |
| TD-R2-02 | 任务编号 | 独立前缀 `R2-V2x-NN`；v1 `TASK-00N` 与既有 tasks **零删改**（追加式） |
| TD-R2-03 | 文案归属 | `TREE_MODEL_NOTE` / `TREE_NO_ESCALATION_NOTE` 重写归 **V2-2**（文件所有权 `tree-view.ts`）；`command-catalog` 偏差文案删除归 **V2-1** |
| TD-R2-04 | 白名单 7→9 | `tree-ops.ts` 归 **V2-3**（V2-2 只消费，不写白名单） |
| TD-R2-05 | 取代台账分工 | S1~S3 / S12 / S17 → V2-3；S4~S8 / S13~S16 → V2-2；S9~S11 → V2-4；S9 的 `TREE_ACTION_IDS_JSON_SHA256` 新值由 V2-3 生成、V2-4 落 pin（同源锚定） |
| TD-R2-06 | Chromium 门禁文件 | `insight.mjs` 由 V2-2（`#I-20a…`）→ V2-4（`#I-21a…`）串行追加；`binding.mjs` 由 V2-3 追加 `#22a…`（既有 `#0~#21o` 零删改） |
| TD-R2-07 | 覆盖模块拆分 | `command-override.ts` 分两任务（clamp/组合 与 store/生命周期），同文件**串行**（避免并行写冲突） |
| TD-R2-08 | 收口归属 | 体积重登记归 V2-2（`size-baseline.ts` owner）；计数台账总核 + 全套串行归 V2-4（最后一叶） |
| TD-R2-09 | 同源锚定 | store `commandId` 与 `STABLE_KEY.command` 一致（V2-1 断言 + V2-3 实现） |
| TD-R2-10 | 服务端强制测试手段 | 直接调用 SW 消息 handler（伪造 `command-policy-set`，**不经 UI**）+ `host.dispatch` 注入 `commandOverrides`，证明 clamp 在 SW gate 内 |

### 5.1 R2 跨叶波次表（全局承接 Wave 18~23）

| R2 波次 | 全局承接 | 内容 | 承载叶 | 并行性 |
|:--:|:--:|------|:--:|------|
| **R2-Wave 1** | Wave 18 | 模型层：`ownership-tree.ts` 纯归属树 + `tree-model`/`command-catalog` 分列/分层 + `project-tree` 派生 + `build-snapshot` 透传 | V2-1 | `01 ∥ 02` → `03` → `04` |
| **R2-Wave 2** | Wave 19 | 覆盖引擎（**SW 侧强制**）：`command-override.ts` clamp/组合 + store/生命周期 + `host.ts` 组合 + 消息面 + `tree-ops` 白名单 7→9 | V2-3 | `01 ∥ 02` → `03` → `04` → `05` |
| **R2-Wave 3** | Wave 20 | UI 层：`tree-view.ts` 嵌套模型 + 两通路文案；`tree-drawer.ts` 真树 DOM/键盘/面包屑/分层控件 | V2-2 | `01` → `02` |
| **R2-Wave 4** | Wave 21 | 档案（V2-4）：`archive-catalog.ts` 分层/分列 + `tree-drawer` 档案卡控件 | V2-4 | `01` → `02`（与 V2-2 同文件串行） |
| **R2-Wave 5** | Wave 22 | 门禁编写+执行（⚠️ 串行）+ 体积显式重登记 + 文档/人工面 | V2-1/2/3/4 | 编写并行，**执行串行** |
| **R2-Wave 6** | Wave 23 | R2 收口：S1~S18 计数台账总核（`removed=0`）+ 全套串行 + 零 diff 面 + 人工面登记 | V2-4 | 串行 |

> **波次依赖主轴**：`R2-Wave 1（V2-1 类型/模型）` → `R2-Wave 2（V2-3 覆盖引擎，消费 V2-1 类型）` → `R2-Wave 3（V2-2 UI，消费 V2-1 模型 + V2-3 消息/白名单）` → `R2-Wave 4（V2-4 档案，消费 V2-1 模型 + V2-2 抽屉）` → `R2-Wave 5（门禁，⚠️ 串行）` → `R2-Wave 6（收口）`。

### 5.2 R2 任务总览（本叶 V2-3；共 7 个任务 / 复杂度 S×0 / M×4 / L×3）

| 编号 | 标题 | 规模 | 类型 | 依赖 | 波次 | 可并行 | 涉及文件 |
|------|------|:--:|:--:|------|:--:|:--:|------|
| R2-V23-01 | `command-override.ts` clamp + `withCommandOverride` 组合（SW 侧，不改冻结文件） | L | ✅ 已完成（R2 build 第 1 轮） | R2-V21-02 | 2 | R2-V23-02 | NEW `packages/web-cli-plugin/src/security/command-override.ts`（clamp/resolver + 组合 + 确认） |
| R2-V23-02 | 覆盖存储/生命周期/审计（`command-override.ts` store + `audit-sink.ts`） | L | ✅ 已完成（R2 build 第 1 轮） | 无 | 2 | R2-V23-01 | NEW `packages/web-cli-plugin/src/security/command-override.ts`（store）；MODIFY `packages/web-cli-plugin/src/security/audit-sink.ts`（additive union `command-policy`） |
| R2-V23-03 | `host.ts` 组合（`withCommandOverride` + `guardedOnAsk` + `commandOverrides` 注入） | M | ✅ 已完成（R2 build 第 1 轮） | R2-V23-01、R2-V23-02 | 2 | — | MODIFY `packages/web-cli-plugin/src/background/host.ts` |
| R2-V23-04 | 覆盖消息面（`service-worker.ts`/`messaging.ts`/`insight-protocol.ts`，additive）+ `pushInsightChanged` | M | ✅ 已完成（R2 build 第 1 轮） | R2-V23-02、R2-V23-03 | 2 | — | MODIFY `packages/web-cli-plugin/src/background/service-worker.ts`；MODIFY `packages/web-cli-plugin/src/background/messaging.ts`；MODIFY `packages/web-cli-plugin/src/background/insight-protocol.ts` |
| R2-V23-05 | `tree-ops.ts` 白名单 7→9 + 两分支 + 无默认写入兜底 + 放宽类确认 + pin 显式更新 | M | ✅ 已完成（R2 build 第 1 轮） | R2-V23-04 | 2 | — | MODIFY `packages/web-cli-plugin/src/ui/tree/tree-ops.ts` |
| R2-V23-06 | 覆盖门禁 `test/command-override.test.ts` + `test/insight-override-security.test.ts` | L | ✅ 已完成（R2 build 第 1 轮） | R2-V23-01、R2-V23-02、R2-V23-03、R2-V23-04、R2-V23-05 | 5 | R2-V21-05；R2-V22-03；R2-V24-03 | NEW `packages/web-cli-plugin/test/command-override.test.ts`；NEW `packages/web-cli-plugin/test/insight-override-security.test.ts` |
| R2-V23-07 | `test/ui/binding.mjs` 追加 `#22a…`（覆盖三档 → dispatch 反映 / reset / 持久化） | M | ⚖️ 门禁 | R2-V23-04 | 5 | R2-V21-05；R2-V22-04；R2-V24-03 | MODIFY `packages/web-cli-plugin/test/ui/binding.mjs` |

### 5.3 R2 依赖拓扑（本叶）

```
R2-Wave 2: R2-V23-01；R2-V23-02；R2-V23-03；R2-V23-04；R2-V23-05
R2-Wave 5: R2-V23-06；R2-V23-07
```

> **跨叶依赖**: V2-1（模型）→ V2-3（覆盖引擎）→ V2-2（UI）→ V2-4（档案）→ 门禁（串行）→ 收口。

### 5.4 R2 任务列表（本叶）

#### R2-V23-01: `command-override.ts` clamp + `withCommandOverride` 组合（SW 侧，不改冻结文件）

| 属性 | 值 |
|------|-----|
| **复杂度** | L |
| **前置依赖** | R2-V21-02 |
| **执行波次** | R2-Wave 2 |
| **可并行** | R2-V23-02 |
| **对应 FR** | FR-V2-074、FR-V2-076 |
| **承接 ADR** | ADR-V2-024、ADR-V2-025 |
| **对应 AC** | AC-V23-010、AC-V2-025 |

**目标**: `resolveCommandPolicy({defaultAction,override,risk,destructive,siteAuthorized}) → {effectiveAction,overridable,clampReason}`（**硬底线 > 覆盖 > 默认**，父 §9.3 逐档表）；`withCommandOverride(base,{resolveOverride,isDestructive})` 按 `name` 定位 `[S1,S2,S3]` 重排为 `[S1,S3,overrideStrategy,S2]`（缺一 FAIL）+ 追加 clamp 策略；`commandPolicyNeedsConfirmation(desired,defaultAction)`；`isDestructive = risk==='write' && DESTRUCTIVE_VERBS.has(末段sub)`（**不用**「未知→true」）。零 `chrome.*`；不 import/修改 `policy.ts`/`auto-authorize.ts`。

**涉及文件**: NEW `packages/web-cli-plugin/src/security/command-override.ts`（clamp/resolver + 组合 + 确认）

**验收标准（可执行断言）**:
- [ ] **clamp 反向断言**（覆盖为 `allow` 后）：① `evaluate` 仍 deny ② 未授权 origin 仍 deny（S1）③ 未知/非法 risk 仍 deny（S3，含 `sleep`/`web-cli-help`）④ 破坏性子命令保底 `ask` ⑤ `ui`/`state`/`external` 不得变 `allow`
- [ ] **作者示例**：`dom`（工具级=设置载体）三档可设；`dom read-state` 子命令级三档生效；`dom click` 仍不放宽（ui clamp）
- [ ] 策略链顺序锚定 `[S1,S3,override,S2]`（按 name；缺一 **FAIL**）；无覆盖 → 返回 `null`（行为与现状逐字节一致）
- [ ] `policy.ts`/`auto-authorize.ts` 源码 sha256 仍 = P0 pin（`bfcb2ede…` / `1096d065…`）
- [ ] 反证：强制 evaluate allow → **FAIL**；顺序改回 `[S1,S2,S3]` → 覆盖收紧失效 → **FAIL**

**验证命令**:
```bash
cd packages/web-cli-plugin && npm run typecheck
（node 单测见 R2-V23-06）
```

#### R2-V23-02: 覆盖存储/生命周期/审计（`command-override.ts` store + `audit-sink.ts`）

| 属性 | 值 |
|------|-----|
| **复杂度** | L |
| **前置依赖** | 无 |
| **执行波次** | R2-Wave 2 |
| **可并行** | R2-V23-01 |
| **对应 FR** | FR-V2-075 |
| **承接 ADR** | ADR-V2-026 |
| **对应 AC** | AC-V23-009、AC-V2-024 |

**目标**: 单键 `web-cli:command-policy` `{version:1,entries:{commandId:{action,updatedAt}}}`；`createCommandOverrideStore(kv,{audit,now})` 提供 `load/get/list/set/reset/resetAll/isExplicit`；**kv 注入零 chrome.***；单键整对象原子写 + 串行 promise 队列 + 写成功才提交内存（失败回滚）+ 失败可读；同值**幂等**（不写不审计）；继承 `cmd:x#sub` > `cmd:x` > 默认；读失败**视为无覆盖**（更保守）+ 可读降级；审计 `command-policy`（`set`/`reset`/`reset-all`；仅 `commandId`/`action`/`prevAction`/`ts`，**零明文**）；`commandId` 与 `STABLE_KEY.command` **同源**。

**涉及文件**: NEW `packages/web-cli-plugin/src/security/command-override.ts`（store）；MODIFY `packages/web-cli-plugin/src/security/audit-sink.ts`（additive union `command-policy`）

**验收标准（可执行断言）**:
- [ ] **持久化**（重载后仍在）；**恢复默认**（单条 + 全部）；**幂等**（同值 → `ok`「已生效（无变化）」且不写存储/不新增审计）
- [ ] **无半写**（并发 `set` 经串行队列；半途失败 → 内存态与旧值一致，绝不「一半生效」）；**失败可读** ≥3 类且零静默失败
- [ ] **审计零明文**（grep 无 key/剪贴板/通知/页面数据）；审计类型 `command-policy` 与撤销/关断、`auto-authorize` **可分辨**
- [ ] **同源锚定**：store `commandId` 与 `STABLE_KEY.command` 生成一致；**不新增 `chrome.storage` 权限**（manifest `permissions` 零变更）
- [ ] 反证：删除串行队列/注入并发竞态 → 半写即 **FAIL**

**验证命令**:
```bash
cd packages/web-cli-plugin && npm run typecheck
（node 单测见 R2-V23-06）
```

#### R2-V23-03: `host.ts` 组合（`withCommandOverride` + `guardedOnAsk` + `commandOverrides` 注入）

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | R2-V23-01、R2-V23-02 |
| **执行波次** | R2-Wave 2 |
| **可并行** | — |
| **对应 FR** | FR-V2-076 |
| **承接 ADR** | ADR-V2-024 |
| **对应 AC** | AC-V23-010 |

**目标**: `policy: withCommandOverride(createPluginPolicyConfig(deps, guardedOnAsk), {resolveOverride,isDestructive})`；`guardedOnAsk`：**仅当**该命令存在显式覆盖且 `autoOnAsk` 将返回 `allow` → 改走 `opts.onAsk`（**不把 deny 变 ask**；`hardDeny`/`allow:false` 原样透传）；`opts.commandOverrides` 注入（纯读内存态）；`dispatch` 入口不变。

**涉及文件**: MODIFY `packages/web-cli-plugin/src/background/host.ts`

**验收标准（可执行断言）**:
- [ ] 覆盖 allow/ask/deny 经 `host.dispatch` **真跑**反映新值（可见后果）
- [ ] 显式 `ask` **不被自动授权静默变 allow**；`hardDeny`/`allow:false` 不受影响
- [ ] `dispatch` 仍 `router.dispatch`；无新判定路径（grep）；`policy.ts`/`auto-authorize.ts` sha256 不变
- [ ] 反证：绕过 `guardedOnAsk` → 显式 ask 被 auto allow → **FAIL**

**验证命令**:
```bash
（node 单测见 R2-V23-06）
```

#### R2-V23-04: 覆盖消息面（`service-worker.ts`/`messaging.ts`/`insight-protocol.ts`，additive）+ `pushInsightChanged`

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | R2-V23-02、R2-V23-03 |
| **执行波次** | R2-Wave 2 |
| **可并行** | — |
| **对应 FR** | FR-V2-075 |
| **承接 ADR** | ADR-V2-024、ADR-V2-026 |
| **对应 AC** | AC-V23-009 |

**目标**: 覆盖 store 单例 + `command-policy-set` / `command-policy-reset` / `command-policy`(pull) cases；`PluginMessageKind` **追加** 3 kind（既有语义零变更）；注入 projection/host；写后 `pushInsightChanged()`；`state.insight?` 追加**可选** `overrideCount`。

**涉及文件**: MODIFY `packages/web-cli-plugin/src/background/service-worker.ts`；MODIFY `packages/web-cli-plugin/src/background/messaging.ts`；MODIFY `packages/web-cli-plugin/src/background/insight-protocol.ts`

**验收标准（可执行断言）**:
- [ ] 3 个 kind **additive**；旧 kind 语义零变更；新 kind 经既有校验点（不绕过校验）
- [ ] `set`/`reset` → store 更新 + audit + `pushInsightChanged()`；下一次 pull 反映 `effectiveAction`
- [ ] **服务端强制（绕过 UI）**：伪造 `command-policy-set` 消息（**不经 `tree-ops`**）→ store 更新但 `dispatch` 仍 clamp；未授权/S3/evaluate 覆盖 allow → 仍 deny
- [ ] 反证：把 clamp 移到 UI 层 → 服务端无强制 → **FAIL**

**验证命令**:
```bash
（node 单测见 R2-V23-06；Chromium 链路见 R2-V23-07）
```

#### R2-V23-05: `tree-ops.ts` 白名单 7→9 + 两分支 + 无默认写入兜底 + 放宽类确认 + pin 显式更新

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | R2-V23-04 |
| **执行波次** | R2-Wave 2 |
| **可并行** | — |
| **对应 FR** | FR-V2-074、FR-V2-075 |
| **承接 ADR** | ADR-V2-027 |
| **对应 AC** | AC-V23-009 |

**目标**: `TREE_ACTION_IDS` **7→9**（+`set-command-policy`/`reset-command-policy`）；`run()` `switch` 两分支**唯一映射** `command-policy-set`/`command-policy-reset`；白名单外/类型不可达**零写入**兜底保留（**无默认写入分支**）；`needsConfirmation` 扩展（放宽类 true；收紧/`reset` false）；`TREE_ACTION_IDS_JSON_SHA256` **显式更新**（新值 + 日期 + 来源 commit + 理由 + 前后值 + 历史保留）。

**涉及文件**: MODIFY `packages/web-cli-plugin/src/ui/tree/tree-ops.ts`

**验收标准（可执行断言）**:
- [ ] `TREE_ACTION_IDS.length===9`；负例 `grant-origin`/`request-permission` 仍非法；`command-allow` 不再是负例
- [ ] **每个动作唯一映射**一个既有/新增服务端消息通路（9 动作 → 9 通路）；白名单外零写入
- [ ] `needsConfirmation`：`set-command-policy`（放宽方向）true；`ask`/`deny`（收紧）与 `reset-command-policy` false
- [ ] pin 显式更新且配反证（改回 7 → **FAIL**，`insight-archive` S9 的 pin 由 V2-4 落）
- [ ] 取代 S1/S2/S3/S12：old→new **1:1**、`removed=0`

**验证命令**:
```bash
cd packages/web-cli-plugin && npm test
```

#### R2-V23-06: 覆盖门禁 `test/command-override.test.ts` + `test/insight-override-security.test.ts`

| 属性 | 值 |
|------|-----|
| **复杂度** | L |
| **前置依赖** | R2-V23-01、R2-V23-02、R2-V23-03、R2-V23-04、R2-V23-05 |
| **执行波次** | R2-Wave 5 |
| **可并行** | R2-V21-05、R2-V22-03、R2-V24-03 |
| **对应 FR** | FR-V2-075、FR-V2-076 |
| **承接 ADR** | ADR-V2-025、ADR-V2-026、ADR-V2-031 |
| **对应 AC** | AC-V23-009、AC-V23-010、AC-V2-024、AC-V2-025 |

**目标**: 新增两门禁：覆盖可达 + 工程属性；clamp 逐档 + 反向断言 + **服务端强制**。

**涉及文件**: NEW `packages/web-cli-plugin/test/command-override.test.ts`；NEW `packages/web-cli-plugin/test/insight-override-security.test.ts`

**验收标准（可执行断言）**:
- [ ] `command-override`：AC-V2-023/024 全项（可达/持久/恢复单条+全部/幂等/无半写/失败可读/审计零明文/继承）
- [ ] `insight-override-security`：**AC-V2-025 逐档反向断言**（①~⑤）+ `dom`/`dom read-state` 三档 + 逐档结论表逐行
- [ ] **服务端强制**：`host.dispatch` 注入 `commandOverrides`（绕过 UI 直接注入）+ 伪造 `command-policy-set` 消息 → 均**不能突破 clamp**（TD-R2-10）
- [ ] 取代 S1/S2/S3/S12、S9 的生成侧：old→new 1:1、`removed=0`；硬底线 pin 只增
- [ ] 反证：篡改 clamp（强制 evaluate allow）→ **FAIL**；`policy.ts`/`auto-authorize.ts` sha256 不变（`bfcb2ede…`/`1096d065…`）

**验证命令**:
```bash
cd packages/web-cli-plugin && npm test
```

#### R2-V23-07: `test/ui/binding.mjs` 追加 `#22a…`（覆盖三档 → dispatch 反映 / reset / 持久化）

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | R2-V23-04 |
| **执行波次** | R2-Wave 5 |
| **可并行** | R2-V21-05、R2-V22-04、R2-V24-03 |
| **对应 FR** | FR-V2-075 |
| **承接 ADR** | ADR-V2-031 |
| **对应 AC** | AC-V23-009 |

**目标**: 真实 dist + 真实站点：`#22a…` 覆盖链（三档设置 → dispatch 反映；reset；重载持久化）。

**涉及文件**: MODIFY `packages/web-cli-plugin/test/ui/binding.mjs`

**验收标准（可执行断言）**:
- [ ] `#22a…`：`dom`/`dom read-state` 三档设置 → 下一同档调用按新值执行；`reset` 恢复；重载后仍在
- [ ] 既有 `#0~#21o` **零删改**（`git diff --unified=0` 无删除行）；S17 零改动；`check(` 计数 ≥ 185 + 新增
- [ ] 反证：覆盖后 dispatch 未变 → **FAIL**

**验证命令**:
```bash
cd packages/web-cli-plugin && npm run test:binding
```


### 5.5 R2 验收矩阵（本叶）

| 验收要点（R2 / 对应 AC） | 落成任务 | 门禁/断言 | 新增 vs 追加 vs 取代 | 反证设计 |
|------|:--:|------|:--:|------|
| `dom` / `dom read-state` 三档均可设且生效（AC-V2-023/AC-V23-009） | R2-V23-01 / 03 / 06 | `command-override` + `insight-override-security`（node） | **新增** | 二档未生效 → FAIL |
| clamp 反向断言 ①evaluate ②S1 ③S3 ④破坏性 ask ⑤ui/state/external 不得 allow（AC-V2-025/AC-V23-010） | R2-V23-01 / 06 | `insight-override-security` | **新增**（硬底线只增） | 强制 evaluate allow → FAIL |
| 服务端强制（伪造消息/绕过 UI 不能突破 clamp） | R2-V23-04 / 06 | 直接 SW handler + `host.dispatch` 注入 | **新增**（TD-R2-10） | clamp 移到 UI → FAIL |
| 存储生命周期：持久/恢复/幂等/无半写/失败可读/审计零明文（AC-V2-024/AC-V23-009） | R2-V23-02 / 06 | `command-override`（node） | **新增** | 删串行队列 → 半写即 FAIL |
| 白名单 7→9 + 唯一映射 + 无默认写入（AC-V2-026） | R2-V23-05 / 06 | `tree-ops` | **取代 S1/S2/S3/S12** | 改回 7 → FAIL |
| 覆盖链真实 dist（AC-V2-024） | R2-V23-07 | `test:binding` `#22a…` | **追加**（S17 不变） | 覆盖后 dispatch 未变 → FAIL |
| `policy.ts`/`auto-authorize.ts` sha256 不变 | R2-V23-01 / 06 | `insight-no-escalation` | **零 diff** | 一字节漂移 → FAIL |

### 5.6 R2 断言取代台账（本叶承载；父 `plan.md` §9.8 S1~S18）

> **纪律**: `removed = 0`；每条旧断言给出 old → new（理由 + 替代）；**总断言数不得下降**；硬底线/安全类断言**只增不减**；`journey.mjs` / v1 `test:ui` / `binding.mjs` 既有编号**零改动**（除清单内显式取代）。build 阶段**实测** `check(` 计数（`insight.mjs` 57 / `binding.mjs` 185 起算）与 node `test(` 计数，记录前后值证明「只增不减」。

| # | 旧断言（文件 :: 名称/编号） | 理由 | 新断言（替代） |
|:--:|------------------------------|------|----------------|
| S1 | `tree-ops.test.ts :: the action union is closed at exactly 7 values` | 白名单 7→9（FR-V2-074/075） | `… exactly 9 values`；负例移除 `command-allow`（现为合法），**保留** `grant-origin`/`request-permission` 非法 |
| S2 | `tree-ops.test.ts :: each of the 7 actions maps to exactly one existing path` | 同上 | `each of the 9 actions …`（+`set-command-policy`→`command-policy-set`；`reset-command-policy`→`command-policy-reset`） |
| S3 | `tree-ops.test.ts :: needsConfirmation matches the whitelist` | 9 动作 + 放宽类二次确认 | 扩展为 9 动作 + `commandPolicyNeedsConfirmation(allow, 非默认)` 真 |
| S9 | `insight-archive.test.ts :: TREE_ACTION_IDS is exactly 7 values (sha256-pinned)` | 白名单 7→9 | `… exactly 9 values` + **显式更新 `TREE_ACTION_IDS_JSON_SHA256`**（新值由本叶 R2-V23-05 生成；pin 落点见 V2-4 R2-V24-03） |
| S12 | `insight-no-escalation.test.ts :: tree-ops.ts has NO write verb outside the closed whitelist` | 白名单 7→9 | 仍禁 `grant`/`permissions.request`；白名单含 9 个动作 id；新增动作仅两个且唯一映射 |
| S17 | `binding.mjs`（V2-3 撤销链 `#21a…`） | **不变** | **零改动**；R2 在**其后**追加 `#22a…`（覆盖三档 → dispatch 反映；reset；持久化） |

**硬底线只增**：`insight-security.test.ts` 六条反向断言 + allow 单调性（**范围重定**：只管撤销/关断）**保留**；追加 `command-policy` 覆盖场景的 clamp 反向断言（AC-V2-025）；`policy.ts`/`auto-authorize.ts` 内容 sha256 pin 不变；新增 `command-override.ts` **独立 pin**（首登记）。

### 5.7 R2 文件所有权与串行约束（本叶）

- 同文件多任务一律**串行**（`command-override.ts`：R2-V23-01 → R2-V23-02；`tree-drawer.ts`：R2-V22-02 → R2-V24-02；`insight.mjs`：R2-V22-04 → R2-V24-04）。
- Chromium 门禁（`test:ui`/`test:insight`/`test:binding`）**绝不并发**（OOM 前科，NFR-V2-009）。
- 冻结面 `policy.ts`/`auto-authorize.ts` 零 diff；新增 `command-override.ts` 独立内容哈希 pin（首登记）。

### 5.8 R2 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| **v2.0（R2）** | 新增 §5 R2 任务分解：R2-V23-01、R2-V23-02、R2-V23-03、R2-V23-04、R2-V23-05、R2-V23-06、R2-V23-07（共 7 个任务；S×0/M×4/L×3）。承接父 `plan.md` v2.0 §9/§10（ADR-V2-024~033）与父 `spec.md` v2.0 §5.7/§8；**只排任务**，phase 不回退；断言取代 `removed=0`。 | 2026-09-13 | SDDU Tasks Agent（R2） |

---


## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建。V2-3 plan §3.1~3.7 → **10 个原子任务 / 4 波**（三件套回执 / 控件语义 / 白名单编排 / tree-drawer 绑定 / tree-ops 纯测 / insight-security 六条反向断言+单调性 / insight-no-escalation 追加冻结门禁 / test:binding 追加撤链 / 串行收口 / 人工面 H-1~H-6）。安全红线：封闭 7 动作白名单（无默认写入分支）+ allow 单调性（`allowAfter ⊆ allowBefore`）+ `policy.ts`/`auto-authorize.ts` 零 diff + 无 bare catch + 零明文。`binding.mjs` 追加编号 `#21a…`（TD-V23-01，避让已被占用的 `#19a~#19l`/`#20a~#20f`）。承接父 plan ADR-V2-008/009/011/013/015。 | 2026-09-13 | SDDU Tasks Agent |
| **v2.0（R2）** | 新增 §5 R2 任务分解（7 个任务；S×0/M×4/L×3）。承接父 plan v2.0 ADR-V2-024~033 + 父 spec v2.0 §5.7/§8；**只排任务**、phase 不回退；断言取代 `removed=0`。 | 2026-09-13 | SDDU Tasks Agent（R2） |
