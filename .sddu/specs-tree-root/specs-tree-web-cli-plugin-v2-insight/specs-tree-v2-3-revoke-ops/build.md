# 构建报告：specs-tree-v2-3-revoke-ops（V2-3 撤销与取消授权操作面）

> **文档定位**: SDDU 实施构建报告（**叶子子 Feature**，P0，P0 闭环第三环：可操作；**含安全复核**）— 记录 V2-3 的实施产物、逐任务实现要点、决策记录与门禁结果，作为 review 阶段的输入
> **父 Feature**: `specs-tree-web-cli-plugin-v2-insight`（web-cli-plugin v2「any insight」）
> **构建人**: SDDU Build Agent · **构建时间**: 2026-09-13 · **版本**: v1.0
> **授权**: **编排器代作者决策（2026-09-13 授权）** —— 作者已授权编排器自行决策后续 SDDU 流程，本轮不再向作者提问；开放点自行裁决并登记（见 §6）
> **分支**: `feature/web-cli-plugin`（`main` = `2ddc922…` 未动）
> **输入**: 本叶子 `tasks.md` / `tasks.json`（**10 任务 / 4 波**，跨叶子 Wave 10~13）+ `plan.md`（§3.1~3.7）+ 父 `plan.md`（ADR-V2-008/009/011/013/015）+ V2-1 产出（`ConnectTreeSnapshot`）+ V2-2 产出（`tree-view.ts` / `tree-drawer.ts`，本叶子 MODIFY）

---

## 1. 构建概要

| 维度 | 数值 |
|------|:--:|
| 完成任务数 | **10 / 10**（TASK-001~010，Wave 10~13 全部） |
| 复杂度分布 | S×2 / M×6 / L×2 |
| 新增文件 | **4** 个（2 源码 + 2 测试） |
| 修改文件 | **10** 个（`tree-view.ts` / `tree-drawer.ts` / `sidepanel.ts` / `index.html` / `service-worker.ts` / `insight-no-escalation.test.ts` / `binding.mjs` / `insight.mjs` / `docs/{dev,smoke-checklist}.md` + 父 `spec.md` 口径补注） |
| 门禁 | `typecheck` **0 error**；插件 `npm test` **599/599**（V2-2 577 → **+22**，0 fail / 0 skip）；`test:insight` **50 断言** PASS（V2-2 45 → **+5**）；v1 `test:ui` **167**（零删减）；`test:hardening` **24**；`test:binding` **180**（v1 163 → **+17** 的 `#21a…`）；`test:e2e` PASS；全仓 `npm test`（base **483** + plugin **599**）**0 fail** |
| 体积 | `sidepanel.js` **1,110,744 B** ≤ ceiling **1,139,658 B**（V2-2 基线 1,085,389 + 5% 容差）；`content.js` **1,073,453 B 零增长**（红线） |
| 红线 | 零新权限（`manifest.json` 零 diff）；零注入（`content.js` 零增长）；不碰 base（零 diff）；无新依赖；**判定链零改**（`policy.ts` / `auto-authorize.ts` 零 diff）；`options.html` 零 diff；v1 `journey.mjs` / `perf-*` 零 diff；v1 SDDU 目录零 diff；`main` 未动 |
| 未跑门禁 | **无**（含写路径 + UI → 全量门禁均已在真实 dist 上**串行**跑完） |

**主产出**：树内**就地撤销/关断**（封闭 7 动作白名单，只调既有 fail-closed 通路）+ 二次确认（不可逆确认 / 开关不确认，拒绝=零操作）+ **可见后果三件套**（① 回执 ② **重拉实测**的工具面证据 ③ 既有 `admin_audit-export` 入口）+ 六条 AC-V2-005 反向断言与 **allow 集合单调性**（`allowAfter ⊆ allowBefore`）。

---

## 2. 文件变更

| 操作 | 文件路径 | 对应任务 | 说明 |
|:--:|------|:--:|------|
| NEW | `packages/web-cli-plugin/src/ui/tree/tree-receipt.ts` | TASK-001 | 三件套纯对象：`buildReceipt` / `toolSurfaceEvidence` / `unverifiedEvidence`；`opResult.ok===false ⇒ kind:'err'`（不产生成功态）；重拉失败标「未确认」；**无 catch**、零明文 |
| NEW | `packages/web-cli-plugin/src/ui/tree/tree-ops.ts` | TASK-002 | 封闭 **7 动作白名单**编排：`TREE_ACTION_IDS` + `isTreeActionId` + `switch(actionId)`（**无默认写入分支**）；每动作**唯一映射**既有通路；需确认动作未确认 ⇒ **零操作**；幂等；失败 `kind:'err'`；**不导入** `security/{policy,auto-authorize}` |
| MODIFY | `packages/web-cli-plugin/src/ui/tree/tree-view.ts` | TASK-003 | 追加（V2-2 行为零删改）：`denyCause`/`denyCauseLabel`（S1/S3/evaluate/hardDeny 可读）、`TreeActionTarget`/`actionTool`（动作对象 + 工具名）、`confirmationSummary`（作用对象+后果+不可逆）、站点行追加 `clear-auto-auth` 控件 |
| MODIFY | `packages/web-cli-plugin/src/ui/tree/tree-drawer.ts` | TASK-004 | 追加：控件 → 真实 `button[data-action-id]`；`#tree-receipt`（`role=status aria-live=polite`）三件套内联；`#tree-confirm` 二次确认（拒绝 ⇒ 零操作）；`button#tree-audit-export` 触发既有 `#audit`；**零 `innerHTML`**、无 bare catch |
| MODIFY | `packages/web-cli-plugin/src/ui/sidepanel/sidepanel.ts` | TASK-004 | 追加 `buildSettingsOps()` 复用工厂 + `createTreeOps(...)` 接线（`ops`/`transport`/`env`/`refreshSnapshot`）+ `onAuditExport` → 既有 `#audit` |
| MODIFY | `packages/web-cli-plugin/src/ui/sidepanel/index.html` | TASK-004 | **append-only**：`button.tree-control` / `#tree-receipt` / `#tree-confirm` 样式（复用既有 tokens）；既有 id/类零重命名 |
| MODIFY | `packages/web-cli-plugin/src/background/service-worker.ts` | TASK-008（**D-V23-01**） | `case 'revoke'` **追加一行**既有 `s.host.deactivateSite()`（绑定 origin 被撤销时）→ 满足 FR-V2-030「工具面即时移出」；**不新增 case / 消息语义 / 判定路径**（只收紧，fail-closed） |
| NEW | `packages/web-cli-plugin/test/tree-ops.test.ts` | TASK-005 | 纯测（10 测试）：7 动作唯一映射 / 无默认写入分支 / `needsConfirmation` / 幂等 / 失败 `kind:'err'` / 证据来自重拉实测 |
| NEW | `packages/web-cli-plugin/test/insight-security.test.ts` | TASK-006 | **AC-V2-005 六条反向断言** + **allow 单调性**（真实 `createWebCliHost` 的 `createPluginPolicyConfig` + `decideAutoAuthorization` 经真实 `host.dispatch` + `onAsk` spy）（5 测试） |
| MODIFY | `packages/web-cli-plugin/test/insight-no-escalation.test.ts` | TASK-007 | **追加段**（V2-1 基础段零删减，5→12 测试）：tree 层来源约束 / 导入白名单 / 无 bare catch / `git diff --quiet HEAD` 判定链冻结 / `AUTO_AUTH_DEFAULTS` + `decideAutoAuthorization` 硬底线 pinned / 零明文 |
| MODIFY | `packages/web-cli-plugin/test/ui/binding.mjs` | TASK-008 | **追加** `#21a~#21n`（17 断言）撤销链（站点取消授权 / 能力撤销失败可读 / 开关关断→即时移出）；**既有编号零删改**（`git diff` 无删除行，163→180） |
| MODIFY | `packages/web-cli-plugin/test/ui/insight.mjs` | TASK-003/004 | **追加** `#I-18a~e`（5 断言）：真实 `button[data-action-id]` 控件 + `#tree-receipt`/`#tree-confirm` 容器 + `deny` 行仍无控件（45→50） |
| MODIFY | `packages/web-cli-plugin/docs/smoke-checklist.md` | TASK-010 | **追加** §6 V2-3 人工面 `V2-H-1~H-6`（含 D-V23-01 口径注）；既有内容零删改 |
| MODIFY | `packages/web-cli-plugin/docs/dev.md` | 口径订正 | §11.3 追加 **D-V22-01 口径订正表**（去镀铬稳态 674px/74.9% vs v1 口径 418px/46.4%；历史 `589px=65.5%` 标「以现状为准」） |
| MODIFY | `.sddu/.../specs-tree-web-cli-plugin-v2-insight/spec.md` | 口径订正 | **仅补注** `AC-V2-002` / `FR-V2-023` 的测量条件（去镀铬稳态 + v1 口径零回归 + 开/关 drift=0），**原有数值全部保留**；v1.3 修订行 |

**不改**：`src/security/policy.ts`（零 diff）、`src/security/auto-authorize.ts`（零 diff）、`manifest.json`（零 diff）、`src/ui/options/index.html`（零 diff）、`packages/web-cli-base/**`（零 diff）、v1 `test/ui/journey.mjs` / `test/perf-*` / `specs-tree-web-cli-plugin/**`（零 diff）。**新增依赖：0**。

---

## 3. 任务完成清单

| 任务 | 名称 | 复杂度 | 状态 | 对应 FR | 验证 |
|------|------|:--:|:--:|------|------|
| TASK-001 | 三件套回执（`tree-receipt.ts`，纯） | M | ✅ completed | FR-V2-037/039 | `test/tree-ops.test.ts` 证据断言 + grep（无 `catch{}`/`apiKey`） |
| TASK-002 | 动作白名单编排（`tree-ops.ts`） | L | ✅ completed | FR-V2-030~037/040/063 | `test/tree-ops.test.ts` 10/10 + grep（无 policy/auto-authorize 导入） |
| TASK-003 | `tree-view.ts` 控件语义扩展（MODIFY） | S | ✅ completed | FR-V2-038/052/064/025 | V2-2 `test/tree-view.test.ts` 零删减全绿 + `#I-18e`（deny 无控件） |
| TASK-004 | `tree-drawer.ts` 动作绑定 + 回执/确认（MODIFY） | M | ✅ completed | FR-V2-037/039/040 | `#I-18a~d` + `#21*`（真实 dist）+ grep（无 `innerHTML`/bare catch） |
| TASK-005 | 门禁 `tree-ops` 纯测 | S | ✅ completed | FR-V2-036/039/040 | `npm test`：10/10 PASS |
| TASK-006 | 门禁 `insight-security`（六条反向断言 + 单调性） | L | ✅ completed | FR-V2-036/060~063 + AC-V2-005 | `npm test`：5/5 PASS |
| TASK-007 | 门禁 `insight-no-escalation` 追加（冻结 + 白名单 + 明文） | M | ✅ completed | FR-V2-003/063/065 | `npm test`：12/12 PASS（基础段 5 零删减） |
| TASK-008 | `test:binding` 追加撤销链（`#21a…`） | M | ✅ completed | FR-V2-030/031/032/037 | `npm run test:binding`：180 PASS（v1 163 零删减 + 17 新增） |
| TASK-009 | 门禁串行 + 回归核验（收口） | M | ✅ completed | NFR-V23-003/004、AC-V2-011 | 见 §5（串行逐条原文） |
| TASK-010 | `docs/smoke-checklist.md` v2 § 追加 + H-1~H-6 | M | ✅ completed | NFR-V2-008 | §6 `V2-H-1~H-6` 落地（人工项如实标 `⏳ 待人工`） |

---

## 4. 安全证据（**结构保证，逐条落地**）

### 4.1 封闭 7 动作白名单（动作 → 唯一既有通路）

| `actionId` | 唯一既有通路（代码） | 可逆 | 确认 | 收紧方向 |
|------------|----------------------|:--:|:--:|:--:|
| `revoke-origin` | `transport.send(makeMessage('revoke',{origin}))` → `unregisterSiteContentScript` + `removeOriginPermission` + `OriginStore.revoke`（+ **D-V23-01** 的 `deactivateSite`） | 不可逆（可重授） | ✅ | 收紧 |
| `revoke-capability` | `ops.revokeCapability(cap)`（`chrome.permissions.remove` + `permission-changed` 对账） | 不可逆（可重授） | ✅ | 收紧 |
| `set-capability-toggle` | `ops.setCapabilityPrivacy(cap,scope,enabled)`（`capabilities/set`） | 可逆 | ❌ | 收紧（关闭）/可逆 |
| `set-tabs-toggle` | `ops.setTabsSetting(enabled)`（`tabs-setting`） | 可逆 | ❌ | 收紧（关闭）/可逆 |
| `clear-auto-auth` | `ops.clearAutoAuth(origin)`（`auto-auth clear`，读+写都关） | 不可逆（可重开） | ✅ | 收紧 |
| `disconnect-llm`（P1） | `ops.clearLlm()`（key-store 清除） | 不可逆 | ✅ | 收紧 |
| `dissolve-group`（P1） | `ops.groupAction({action:'delete',groupId})`（`session-group`） | 不可逆 | ✅ | 中性（分组≠授权） |

**无 grant / 无 `request` / 无命令级动作**：`grep -nE "['\"]grant|permissions\.request" src/ui/tree/tree-ops.ts` → 零命中（`insight-no-escalation` 断言）。

### 4.2 「无默认写入分支」如何被结构保证 + 断言

- **结构**：`run()` 仅 `switch(actionId)` 分派 7 个 case，随后是**零写入兜底** `return zeroOutcome('err', ...)`；白名单外/缺 `actionId` 在 `switch` **之前**就 `return` 零操作。全文件**无** `default:` 分支、**无** 兜底写调用。
- **断言**（`test/tree-ops.test.ts`）：`run({actionId:'grant-origin'})` → transport 调用 **0** / ops 调用 **0** / 快照重拉 **0** / `kind:'err'`；`isTreeActionId` 对 `'grant-origin'`/`'request-permission'`/`'command-allow'` 等**全部 false**。

### 4.3 `deny ⇒ controls:[]` / 静态权限无 revoke —— 渲染模型层强制，未被写路径破坏

- **V2-1 结构**：`CommandNode.controls`（`deny⇒[]`）+ `tree-view.commandControls()` 二次过滤（`deny ⇒ []`）；静态权限 `revocable:false` + `capabilityControls()` 对 `source==='static'` 直接 `[]`。
- **V2-3 未破坏**：`tree-drawer.renderRow` 对 `row.controls.length===0` 的 `deny` 行**不进入控件渲染块** → DOM 里根本没有开关可渲染。
- **证据**：`test/tree-view.test.ts` 全绿（142 基线子命令 + 34 工具，deny 行 `controls.length===0`）；`test/ui/insight.mjs` `#I-18e`（`denyWithControls === 0`，真实 DOM）；`test/ui/insight.mjs` `#I-12`（V2-2 既有，零删减）。

### 4.4 AC-V2-005 六条反向断言（实跑原文）

`node --test dist-test/test/insight-security.test.js` → **5/5 PASS**（`allow` 集合基线 `['site-read','site-write-auto']`）：

| # | 断言 | 实跑结论 |
|---|------|----------|
| ① | 未授权 origin 仍 `deny`（S1） | ✅ `site-unauthorized = deny`（自动授权双档全开态下） |
| ② | 未知/非法 risk 仍 `deny`（S3 fail-closed） | ✅ `site-unknown = deny`；`decideAutoAuthorization(risk:undefined).hardDeny === true` |
| ③ | `evaluate` 仍 `deny`（硬底线，never delegated to confirm） | ✅ `site-evaluate = deny`；`.hardDeny === true` |
| ④ | 破坏性写仍 `ask` + **无** `auto-authorize/allow` 审计 | ✅ `site-destructive = ask`、`site-sub-destructive = ask`；`audit.events` 中 `type='auto-authorize' && decision='allow' && tool∈{site_notes-add,site_notebook}` 计数 **= 0** |
| ⑤ | `clipboard read`（`state` 档）仍 `ask`（永不自动放行） | ✅ `clipboard-read = ask`（`read:true` 下） |
| ⑥ | `bookmarks remove` 仍 `ask`（不纳入写自动） | ✅ `bookmarks-remove = ask`（`write:true` + destructive 下） |

**口径（`onAsk` spy）**：`onAsk` 被调用 ⇒ `ask`；未被调用且 `result.ok===true` ⇒ `allow`；否则 ⇒ `deny`（`dispatch` 返回 `ok:false`）。真值经**真实** `host.dispatch`（`createWebCliHost` 内部构造 `createPluginPolicyConfig` + `decideAutoAuthorization`）取。

### 4.5 `allow` 集合单调性（`allowAfter ⊆ allowBefore`）

对**每个**撤销/关断动作，经 `tree-ops.run()` 应用**真实状态变更**（`revoke-origin` → `OriginStore.revoke` + `deactivateSite`；`revoke-capability` → `suppressCapability`；开关 → `setCapabilityToggle`；`clear-auto-auth` → `AutoAuthStore.clear`），前后各跑一次 9 条全量决策表：

- 断言 `allowAfter ⊆ allowBefore`（`subsetOf(allowSet(after), allowSet(before))`）；
- 断言**零** `ask/deny → allow` 跃迁（逐条目：`after==='allow' ⇒ before==='allow'`）；
- **非空洞**：`revoke-origin` 使 `site-read`/`site-write-auto` `allow→deny`；`revoke-capability` 使 `bookmarks-remove` `ask→deny`；`clear-auto-auth` 使 `site-write-auto` `allow→ask`（逐条断言 `after !== before`）。
- 样本：`before = {site-read:allow, site-write-auto:allow, …}` → `revoke-origin` 后 `after = {site-read:deny, site-write-auto:deny, …}`，`allowAfter = [] ⊆ allowBefore`。

### 4.6 判定链冻结证据

- `git diff --quiet HEAD -- src/security/policy.ts src/security/auto-authorize.ts` → **exit 0**（零 diff；`insight-no-escalation` 内断言）。
- `git diff --quiet HEAD -- src/security/policy.ts` / `src/security/auto-authorize.ts` / `manifest.json` / `test/parity.test.ts test/parity` / `../web-cli-base` → **exit 0 ×5**（`insight-no-escalation` 基础段 + 追加段）。
- `PLUGIN_RISK_DEFAULTS` **pinned**：`{read:'allow', write:'ask', external:'ask', ui:'ask', state:'ask', evaluate:'deny'}`；`AUTO_AUTH_DEFAULTS` **pinned**：`{read:true, write:false}`；`decideAutoAuthorization` 硬底线 pinned（含 `ui/state/external` 无自动档 ⇒ `allow:false` + `hardDeny:true`）。

### 4.7 零明文 / 无静默失败

- `grep -nE "catch\s*\([^)]*\)\s*\{\s*\}|apiKey" src/ui/tree/tree-receipt.ts` → 零命中（`grep_exit=1`）。
- `grep -nE "innerHTML|catch…{}" src/ui/tree/tree-drawer.ts` → 零命中。
- `insight-no-escalation` 追加段：`src/ui/tree/**` 无 `apiKey` / `LlmSettings` / `storage.local` / `chrome.*` / `innerHTML` / bare catch；`src/insight/**` 同样零命中。
- 失败可读：`tree-ops` 失败返回 `kind:'err'`（transport throw / transport `!ok` / 缺 target / ops `!ok` 四类，`tree-ops.test.ts` 断言）；重拉失败 → 证据标「重拉实测未完成…未确认（不假成功）」。
- 审计：撤销写既有 `origin-revoke`（`binding` `#21h` 实测）；能力撤销写既有 `optional-permission/revoked`（v1 `binding` `#0o` 既有）；不新增审计类型。

---

## 5. 门禁结果（串行逐条原文）

> 纪律：**逐条串行、绝不并发**（OOM 前科）。命令顺序 = `typecheck → npm test → test:insight → test:ui → test:hardening → test:binding → test:e2e → 全仓 npm test`。

| # | 命令 | 结果（原文计数） | 退出码 |
|:--:|------|------|:--:|
| 1 | `npm run typecheck` | `tsc --noEmit` → 0 error | **0** |
| 2 | `npm test`（插件） | `ℹ tests 599 / pass 599 / fail 0 / skipped 0`（V2-2 577 → +22） | **0** |
| 3 | `npm run test:insight` | `UI insight PASS — 50 assertions`；`#I-18a~e` 全绿；`layout closed {logClientHeight:674, logRatio:74.9, composerGapToBottom:8, docOverflowX:0}` | **0** |
| 4 | `npm run test:ui`（v1 回归） | `UI journey PASS — 167 assertions`（零删减）；⚠️ 首次运行 `#3c` 单点偶发失败（全新 profile/mock 时序），随后**两次**独立运行均全绿 —— 如实记录 | **0** |
| 5 | `npm run test:hardening` | `hardening PASS — 24 assertions` | **0** |
| 6 | `npm run test:binding` | `binding PASS — 180 assertions`（v1 163 零删减 + `#21a~#21n` 17）；V2-3 全绿（含 `#21c` 确认摘要 / `#21g` 工具即时移出 / `#21j` 能力撤销失败可读 / `#21m/#21n` 开关关断与恢复） | **0** |
| 7 | `npm run test:e2e` | `R8 E2E PASS — real dist full chain: fixture (AC-010) + LGDL Workbench (AC-009)` | **0** |
| 8 | 全仓 `npm test` | `--workspaces`：base **483 pass / 0 fail**、plugin **599 pass / 0 fail**、其余 workpackage 全 0 fail（其中一处 95 tests / 94 pass / 0 fail = 1 skip） | **0** |

**`insight-security` / `tree-ops` / `insight-no-escalation` 追加段独立实跑**（`node --test dist-test/...`）：

```
insight-security.test.js   ℹ tests 5   pass 5   fail 0
tree-ops.test.js           ℹ tests 10  pass 10  fail 0
insight-no-escalation.test.js ℹ tests 12 pass 12 fail 0   （V2-1 基础段 5 条零删减）
```

**未跑门禁**：无。

---

## 6. 决策与偏差记录

| # | 事项 | 影响 | 登记 |
|---|------|------|------|
| **D-V23-01** | **FR-V2-030「工具面即时移出」的必要接线**：v1 `case 'revoke'` 原先只做 `unregisterContentScript` + `removeOriginPermission` + `OriginStore.revoke`（站点工具名仍留在 router，仅派发时 S1-deny）。V2-3 在该 case **追加一行既有 `s.host.deactivateSite()`**（仅当被撤销 origin 是当前绑定 origin），使站点工具**即时移出 `deriveTools()`**。**只收紧（fail-closed）；不新增 `case` / 消息语义 / 判定路径**；未授权 origin 经 tab-follow 不会被重新注册（该路径先查 `origins.isAuthorized`）。 | `service-worker.ts` +7 行（含注释）；`binding` `#21g` 可证伪 | 编排器代作者决策（2026-09-13 授权）；已在 `docs/smoke-checklist.md` §6 口径注披露 |
| **TD-V23-01** | `binding.mjs` 追加编号顺延为 **`#21a…`**（`#19a~#19l` / `#20a~#20f` 已被 v1 占用） | 编号唯一，既有断言零改动 | tasks.md §4.3（沿用） |
| **TD-V23-03** | P1 动作 `disconnect-llm` / `dissolve-group` 保留在白名单（结构完整），P0 闭环不要求其 UI 入口（只要求 LLM 可见） | 抽屉只渲染 5 个 P0 动作控件 | tasks.md §4.3（沿用） |
| **D-V23-02** | `binding.mjs` 的树交互采用 **DOM 点击**（非 CDP 真实鼠标）：侧栏页在阶段 1 非 active tab，headless 真实鼠标输入对背景 tab 被丢弃；`test:insight` 已覆盖 FAB 的**真实鼠标点击**。撤销无需用户手势。 | 测试口径；如实披露于脚本注释 | 本轮新增（编排器代作者决策） |
| **D-V22-01 订正** | `docs/dev.md §11.3` + v2 父 `spec.md` `AC-V2-002`/`FR-V2-023` 最小口径订正（补测量条件；`589px` 系 TASK-023 旧测，早于 FR-052 自动授权块） | 仅补注，**原有数值全部保留** | V2-2 build.md 已披露，本轮落地 |

---

## 7. 下一步

| 场景 | 操作 |
|------|------|
| 全部任务已完成 | 运行 `@sddu-review specs-tree-v2-3-revoke-ops` 开始**安全复核向**代码审查 |

---

## R2 修复轮（2026-09-13，编排器代作者决策：消化 review `39cd0a1` 的 6 建议 + 3 提示）

> **输入**：父 `review-report.md`（`39cd0a1`；C1~C22 + W1~W6 + T1~T3）。**纪律**：只加固不放宽；断言只增不减；门禁严格串行一次一个；不碰 `main`/`packages/web-cli-base/**`/v1 SDDU；无新依赖。
> **本轮门禁原文（串行）**：`typecheck` **0 error**；插件 `npm test` **616/616 · 0 fail**；`test:insight` **52 断言 PASS**；`test:ui` **167 断言**（v1 零删减）；`test:hardening` **24**；`test:binding` **180 断言**；`test:e2e` **PASS**；全仓 `npm test`：base **483/483** + plugin **616/616**，**0 fail**。

以下为**修复轮全量条目逐条 before → after**（本叶子（V2-3：撤销面 / 判定链冻结 / 撤销链 e2e）触及 **W3 / T1 / T2**）：

| 项 | before | after | 证据 |
|----|--------|-------|------|
| **W1** | 子 V2-2 `spec.md`/`state.json` + `ROADMAP.md` 仍写「≥65.5%」 | 最小订正为父口径「≥589px 主 + ≥65.0% 次 + 去镀铬测量条件 + ADR-V2-006」 | V2-2 `spec.md`/`state.json`/`ROADMAP.md` |
| **W2** | `insight-protocol.ts` 无单测 | 新建 `test/insight-protocol.test.ts`（6 测试 / 18 条 assert） | `node --test` → 6/6 |
| **W3** | 判定链冻结靠 `git diff --quiet HEAD`（提交后恒 0） | **内容哈希钉死**（`policy.ts` / `auto-authorize.ts` + 判定表快照 720 行）+ 反证自测；原 `git diff` 断言全保留 | pin 值：`bfcb2ede…` / `1096d065…` / `d1667d24…`；反证实跑原文见 V2-1 `build.md` §11 |
| **W4** | `SIDEPANEL_BASELINE_BYTES=1,085,389`（实际 1,110,744） | 显式重登记 1,110,744；ceiling **1,166,281**；历史保留；`CONTENT_MAX_BYTES` 不变 | `stat -c %s dist/sidepanel.js`=1110744 |
| **W5** | V2-2 `build.md` §5.2 「前」1,065,389 | 订正 1,068,165（+17,224） | V2-2 `build.md` §5.2 |
| **W6** | 仅 raw `#log ≥405px` | 钉死 v1 raw 基线 418px/46.4% + `#I-06c/#I-06d` | `test:insight` 52 断言 PASS |
| **T1** | 树侧能力撤销**成功**路径仅单测 + 失败路径 e2e（`#21j/#21k`） | `binding.mjs` 追加 `#21o*` 最佳努力端到端（树 `revoke-capability` → 真实 `permissions.remove` → 断言成功 + 工具移出 + 审计 + 回执）。**实跑 headless `permissions.request = PENDING_TIMEOUT` → 如实 observe 跳过（不伪造 PASS）**；成功分支代码就位；既有断言零删改 | `test:binding` 观测原文（V2-2 `build.md` R2 节） |
| **T2** | `pushInsightChanged` 空 catch 静默吞（撤销/开关变更后的树刷新触发点） | 改为 `console.debug` 诊断（零敏感明文 / 不伪造状态）+ 门禁断言 | `service-worker.ts`；no-escalation T2 测试 |
| **T3** | `deriveAction` 再实现无一致性门禁 | 新建 `test/insight-action-parity.test.ts`（4 测试）：真实策略链逐条比对 28 工具 / 94 子命令 + 站点域矩阵 + 反证 | `node --test` → 4/4 |

**T1 实跑观测原文**：
```
· #21o/#21o2/#21o3/#21o4 跳过（如实记录，不伪造 PASS）：headless 无法合成原生 grant 手势 →
  chrome.permissions.request = PENDING_TIMEOUT；树侧「能力撤销成功」端到端因此保持人工面 V2-H-4，
  失败路径已由 #21j/#21k 覆盖。
```
**判定链零改动复核**：`git diff --quiet -- src/security/policy.ts src/security/auto-authorize.ts` → **exit 0**；W3 哈希 pin 与文件实测一致（`bfcb2ede…` / `1096d065…`）。`packages/web-cli-base/**` / `manifest.json` / v1 SDDU 均零 diff。

---

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建。V2-3（Wave 10~13 / TASK-001~010）实施构建报告：封闭 7 动作白名单（无默认写入分支）+ 三件套回执（重拉实测）+ 二次确认（拒绝=零操作）+ AC-V2-005 六条反向断言与 allow 单调性 + 判定链冻结门禁 + `binding` `#21a…` 撤销链 + 人工面 H-1~H-6。全量门禁串行全绿；D-V23-01（`revoke` 追加 `deactivateSite` 一行）与 D-V23-02（DOM 点击口径）已登记。 | 2026-09-13 | SDDU Build Agent |
| v1.1 | R2 修复轮：T1（`binding` `#21o*` 树侧撤销成功路径最佳努力 + 如实 observe）/ T2（去静默吞异常）/ W3（判定链哈希钉死复核）；门禁全量串行复跑：typecheck 0 / 插件 npm test 616 / test:insight 52 / test:ui 167 / test:hardening 24 / test:binding 180 / test:e2e PASS / 全仓 base 483 + plugin 616 = 0 fail。判定链零 diff（W3 pin 对值）。 | 2026-09-13 | SDDU Build Agent |

---

## 15. R2 实施构建（第 12 轮 · R2 build 第 1 轮）

> 完整聚合见父 `build.md` §9。本轮 **R2-V23-01~06 完成**；**R2-V23-07（`binding #22a`）留待下一轮**。

- **产出**：`src/security/command-override.ts`（新：`withCommandOverride` 重排 `[S1,S3,override,S2]` + `resolveCommandPolicy`/`clampActionForRisk` + kv 注入 store + 审计）；`host.ts`（组合 + `guardedOnAsk` + `commandOverrides` 注入）；`service-worker.ts`（store 单例 + `command-policy`/`-set`/`-reset` 3 cases + 投影注入 + `overrideState.overrideCount`）；`messaging.ts`/`insight-protocol.ts`（additive 3 kind，**未**入 `KIND_SET`）；`tree-ops.ts`（白名单 **7→9** + 两分支 + 保留无默认写入兜底 + 放宽类条件确认）；`audit-sink.ts`（additive 类型 `command-policy`）。
- **门禁**：`test/command-override.test.ts`（14 tests：逐档 clamp / 组合锚定 / 持久/继承/幂等/无半写/串行/读失败降级/审计零明文）+ `test/insight-override-security.test.ts`（10 tests：AC-V2-025 反向断言①~⑤ + `dom`/`dom read-state` 三档 + 显式 ask 守卫 + 服务端强制反证）；`test/tree-ops.test.ts` S1/S2/S3；`insight-no-escalation` S12。
- **判定链零改动**：`policy.ts=bfcb2ede…` / `auto-authorize.ts=1096d065…`（内容哈希 pin 不变）；`content.js` 恒 1,073,453 B（新 kind 未入 `KIND_SET`）。
- **未完成**：`binding.mjs #22a…`（覆盖三档 → dispatch 反映 / reset / 持久化的 Chromium 链）留待下一轮；`sidepanel.js` 实测 1,138,591 B ≤ ceiling 1,189,385（本轮无需重登记）。

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.2 | R2 实施构建第 1 轮（V2-3 覆盖引擎）：SW 侧 clamp/存储生命周期/消息面/白名单 7→9 + 三个门禁文件；`policy`/`auto-authorize` sha256 不变、零新权限、base 零 diff；`binding #22a` 留待下一轮（如实登记）。 | 2026-09-13 | SDDU Build Agent |

---

## R2 第 2 轮（2026-09-13，sddu-build）

R2-V23-07 完成：`test/ui/binding.mjs` 追加 `#22a~l` 覆盖链——UI（树内 `[data-policy]` 三档）→ tree-ops 唯一写路径 → `command-policy-set` → **真实 dispatch 生效**（deny：工具结果「权限被拒」；ask：弹真实二次确认，拒绝=零操作；allow：不再弹确认并真实执行）→ `reset` 回到基线 → `chrome.storage` 单键持久化；既有 `#0…/#19…/#20…/#21…` 零删改；`check(` 185→197（运行期 192 断言）。前两次运行遇环境 flake（`#33B1`/`#3d`），第三次全绿（详见父 build.md §R2 第 2 轮 §3/§8）。
