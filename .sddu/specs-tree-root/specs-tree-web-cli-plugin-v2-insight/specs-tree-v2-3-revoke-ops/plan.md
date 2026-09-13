# 技术计划：specs-tree-v2-3-revoke-ops（V2-3 撤销与取消授权操作面）

> **文档定位**: SDDU 技术方案（**叶子子 Feature**，P0，**含安全复核**）——记录 V2-3 的架构设计、方案对比与 ADR，作为 tasks 阶段的输入
> **前置依赖**: 父 `spec.md` §5.4 + §5.6（FR-V2-030~040 + FR-V2-060~065 权威条文）+ 本目录 `spec.md`（含反向断言验收）+ V2-1（树模型）+ V2-2（UI 载体）+ 父 `plan.md`（ADR-V2-001~015）
> **创建人**: SDDU Plan Agent · **创建时间**: 2026-09-13 · **版本**: v1.0 · **更新人/时间**: SDDU Plan Agent / 2026-09-13
> **更新说明**: 初始创建。树内就地撤销（站点级 + 能力级 + 开关 + 自动授权关断 + LLM 断开 + 会话组）；撤销后可见后果三件套（回执 + 工具面已移除证据 + 审计入口）；**只走既有 fail-closed 通路、只收紧不放宽**（结构保证 + 单调性 + 冻结门禁）。

---

## 1. 前置检查

| 检查项 | 状态 |
|--------|:--:|
| 父 `spec.md`（FR-V2-030~040 / 060~065）与本目录 `spec.md` 存在 | ✅ |
| 外部 API 文档缓存 | ⚠️ N/A |
| V2-1 / V2-2 接口已定义 | ✅ |
| v1 既有 ops 逐文件核实（`ops.ts` / `service-worker.ts` case） | ✅（父 plan §2.1「操作通路」） |
| **安全复核面**：`policy.ts` / `auto-authorize.ts` 冻结基线 | ✅（pinned 判定表 + `git diff --quiet` 门禁，§3.5） |

---

## 2. 架构分析

### 2.1 现状：既有操作通路已存在（v2 只编排，不新增）

| 动作 | 既有通路（唯一） | 幂等/失败语义 |
|------|------------------|---------------|
| 站点取消授权 | `makeMessage('revoke',{origin})` → `unregisterSiteContentScript` + `removeOriginPermission` + `OriginStore.revoke`（`service-worker.ts:1627-1651`） | `revoked:false` = 已撤销（幂等可读）；`hostPermissionRemoved` 与 `contentScript` 分别如实报告 |
| 可选能力撤销 | `ops.revokeCapability(cap)`（扩展页 `removeCapabilityPermission`，**无需手势**）→ `capabilities/permission-changed` 重对账 → `suppressCapability` | 失败返回可读原因；能力态**保持不变** |
| 隐私开关 | `ops.setCapabilityPrivacy(cap,scope,enabled)`（`capabilities/set`）；`ops.setTabsSetting` | 关闭即移出工具面 |
| 自动授权关断 | `ops.clearAutoAuth(origin)`（`auto-auth clear`，读+写都关） | **不撤销站点授权**（独立维度） |
| LLM 断开（P1） | `ops.clearLlm()`（`key-store.clear`） | 失败可读；`hasKey` 不假装翻转 |
| 会话组解散（P1） | `ops.groupAction({action:'delete', groupId})` | 明示「分组≠授权」 |

### 2.2 目标：白名单编排层 + 三件套回执 + 结构安全

```
#tree-drawer action ─► needsConfirmation? ─(yes)─► #tree-confirm ─(reject)─► 零操作（fail-closed）
        │                                   └─(accept)─┐
        └─(no)────────────────────────────────────────►│
                                                       ▼
                              tree-ops.ts（固定动作白名单）
                                 └─► 既有通路（revoke / capabilities / auto-auth / tabs-setting / …）
                                       └─► 既有状态变更 + 既有审计 + 既有 push（capability-changed 等）
                                             └─► 重拉 'insight-tree' → TreeReceipt 三件套
```

### 2.3 与 v1 的边界

- **不**新增任何 SW `case`、**不**新增任何消息语义、**不**改任何既有 handler；
- **不**导入 `security/policy.ts` / `security/auto-authorize.ts` 的构造/写入面；
- **不**做 `grant`/`request`（需扩展页手势，归设置面板）——V2-3 只做**撤销/关断**（`remove`/`revoke` 无需手势）；
- **不**做命令级策略覆盖；**不**假装静态权限可撤销。

---

## 3. 分模块技术方案

### 3.1 `src/ui/tree/tree-ops.ts`（动作白名单编排）

```ts
export type TreeActionId = 'revoke-origin'|'revoke-capability'|'set-capability-toggle'|'set-tabs-toggle'
                         | 'clear-auto-auth'|'disconnect-llm'|'dissolve-group';
export interface TreeActionRequest { actionId: TreeActionId;
  target: { origin?: string; capability?: OptionalCapability; scope?: 'read'|'write';
            enabled?: boolean; groupId?: string }; }
export interface TreeActionOutcome { receipt: TreeReceipt['receipt'];
  toolSurfaceEvidence: TreeReceipt['toolSurfaceEvidence']; auditEntry: TreeReceipt['auditEntry']; }
export function createTreeOps(deps: { ops: SettingsOps; transport: SettingsTransport;
  env: EnvGuardResult; refreshSnapshot: () => Promise<ConnectTreeSnapshot>; now?: () => number;
}): { run(req: TreeActionRequest): Promise<TreeActionOutcome> };
```

**动作 → 既有通路映射（唯一，无旁路）**

| `actionId` | 调用（**既有**） | 可逆 | 确认 | 收紧方向 |
|------------|------------------|:--:|:--:|:--:|
| `revoke-origin` | `transport.send(makeMessage('revoke',{origin}))` | 不可逆（可重授） | ✅ | 收紧 |
| `revoke-capability` | `ops.revokeCapability(cap)` | 不可逆（可重授） | ✅ | 收紧 |
| `set-capability-toggle` | `ops.setCapabilityPrivacy(cap,scope,enabled)` | 可逆 | ❌ | 收紧（关闭） |
| `set-tabs-toggle` | `ops.setTabsSetting(enabled)` | 可逆 | ❌ | 收紧（关闭） |
| `clear-auto-auth` | `ops.clearAutoAuth(origin)` | 不可逆（可重开） | ✅ | 收紧 |
| `disconnect-llm`（P1） | `ops.clearLlm()` | 不可逆 | ✅ | 收紧 |
| `dissolve-group`（P1） | `ops.groupAction({action:'delete', groupId})` | 不可逆 | ✅ | 中性（明示分组≠授权） |

**结构保证（ADR-V2-008）**：动作表是**封闭联合**；`run()` 只做 `switch(actionId)` 分派，**无默认写入分支**；无 `grant`；无命令级动作。

### 3.2 `src/ui/tree/tree-receipt.ts`（三件套，纯）

```ts
export interface TreeReceipt {
  receipt: { ok: boolean; kind: 'ok'|'warn'|'err'; text: string };            // ① 回执（含成功/失败原因 + 下一步）
  toolSurfaceEvidence: { tool: string; present: boolean; checkedAt: number;   // ② 工具面已移除证据
                         evidence: string };
  auditEntry: { entryPoint: 'admin_audit-export'; hint: string };             // ③ 审计入口
}
export function buildReceipt(input: { actionId: TreeActionId; opResult: OpResult<unknown>;
  tool?: string; present: boolean; now: number; detail?: string }): TreeReceipt;
export function toolSurfaceEvidence(tool: string, present: boolean, now: number): TreeReceipt['toolSurfaceEvidence'];
```

- ② **证据来自实测**：动作完成后 `refreshSnapshot()`（重拉 `insight-tree`）→ 断言目标工具 `presentInSurface===false`；**不是**文案声称（FR-V2-037）。
- ③ 审计入口 = 既有 `admin_audit-export`（沿用侧栏 `#audit` 行为），**不强制在树内渲染事件正文**。
- **无静默失败/假成功**：`opResult.ok===false` → `receipt.kind='err'`，**不得**渲染成功态；无 bare `catch`（grep 门禁）。

### 3.3 `src/ui/tree/tree-view.ts`（本叶子的控件语义）

- 命令 `action==='deny'` → `controls: []`（**deny 无开关**，ADR-V2-011）。
- 静态权限 → `revocable:false` + `revokeHint`，`controls` 不含 `revoke`（FR-V2-038 如实披露）。
- 可选能力：仅 `granted===true` 给 `revoke` 控件；`granted===false` 不给「假撤销」。
- 文案钉死（FR-V2-025）：`header.noEscalationNote` 含「撤销/关断 = 回到更保守，**不放宽**任何门禁；`delay` = `deny`（fail-closed）」。
- `needsConfirmation(actionId)`（ADR-V2-013）：不可逆/高影响 → `true`；开关翻转 → `false`。

### 3.4 确认与幂等（FR-V2-040 / EC-V2-014）

- 拒绝 → **零操作、fail-closed**（不发送任何消息）。
- 确认摘要 = 「作用对象 + 后果 + 不可逆说明」（由 `tree-receipt`/`tree-view` 纯函数生成）。
- 重复撤销 → 幂等可读（`revoked:false` → 「该站点已处于未授权状态」；能力已撤销 → 「已撤销」），**不报错刷屏、不产生重复审计噪音**。

### 3.5 安全红线：结构保证 + 单调性 + 冻结（AC-V2-005 / FR-V2-060~065）

**（a）结构保证（ADR-V2-008/011）**
1. `tree-ops.ts` 封闭动作白名单（§3.1），每个动作唯一映射既有通路；**无新判定分支**。
2. `deny` 无开关（`controls:[]`，渲染模型层强制）；静态权限无撤销控件。
3. 导入白名单：`src/ui/tree/tree-ops.ts` 不得导入 `security/policy.ts` / `security/auto-authorize.ts`；`src/insight/**` 不得触 `chrome.*` / 写 store。

**（b）单调性证明（决策表，`test/insight-security.test.ts`）**
- 以**真实** `createPluginPolicyConfig` + `decideAutoAuthorization`（经真实 `host.dispatch`）构建决策表：
  - `onAsk` spy：被调用 = `ask`；未被调用且 `result.ok===true` = `allow`；否则 = `deny`。
- 对**每个**撤销动作：应用状态变更前后各跑一次全量决策表，断言 **allow 集合单调收缩（`allowAfter ⊆ allowBefore`）**；任何 `ask/deny → allow` 即 FAIL。

**（c）AC-V2-005 六条反向断言（逐条，动作后 / 自动授权开启态）**

| # | 断言 | 手段 |
|---|------|------|
| ① | 未授权 origin 仍 `deny`（S1） | 站点工具 + 未授权 origin → `deny` |
| ② | 未知/非法 risk 仍 `deny`（S3） | 无 `riskHint`、无 `subcommands` 的 opaque 声明工具 → `deny` |
| ③ | `evaluate` 仍 `deny` | base `eval-js` / `page-eval` → `deny`；`decideAutoAuthorization(risk:'evaluate')` → `hardDeny` |
| ④ | 破坏性写仍 `ask`（不纳入写自动） | 破坏性子命令站点工具 + `write:true` → `ask`，且**无** `auto-authorize/allow` 审计 |
| ⑤ | `clipboard read`（state 档）仍 `ask`（永不自动放行） | `clipboard` 工具 `read` + `read:true` → `ask` |
| ⑥ | `bookmarks remove` 仍 `ask`（不纳入写自动） | `bookmarks` 工具 `remove` + `write:true` → `ask` |

**（d）冻结门禁（`test/insight-no-escalation.test.ts`）**
- `PLUGIN_RISK_DEFAULTS` **pinned 判定表**深度相等（read→allow / write·external·ui·state→ask / evaluate→deny）；
- `AUTO_AUTH_DEFAULTS` = `{read:true,write:false}`；`decideAutoAuthorization` 硬底线行为 pinned；
- `git diff --quiet HEAD -- src/security/policy.ts src/security/auto-authorize.ts`（在非 git 环境给可读降级，不静默通过）；
- V2 源码 grep：无 `riskDefaults` 赋值、无 `createPluginPolicyConfig` 调用、无 bare `catch`、无 `apiKey` 标识符。

### 3.6 审计与零明文（FR-V2-065 / NFR-V23-004）

- **复用既有审计事件类型**（`origin-revoke` / `optional-permission` / `auto-authorize` / `host-permission` / `tabs` / `llm-config`），**不新增类型**；参数经既有 `redact.ts` 掩码。
- V2 只消费 `LlmStatusSummary`；**不导入** `LlmSettings`/`apiKey`；不读取剪贴板/通知正文。
- 门禁：投影/回执/审计 payload grep 零命中 key/剪贴板/通知明文。

### 3.7 边界情况

| EC | 处理 |
|----|------|
| EC-V23-001 `removeOriginPermission` 失败 | 可读失败原因 + 下一步；`revoke` 与注销**分别如实报告**（不假装全成功） |
| EC-V23-002 撤销成功但注销/对账失败 | 授权已撤销如实呈现；注销失败**单独可读披露** + 建议重试 |
| EC-V23-003 `removeCapabilityPermission` 失败/上下文不支持 | 可读「当前上下文不支持…」；能力态**保持不变**；不假装已撤销 |
| EC-V23-004 `onRemoved` 竞态 | 显式 `permission-changed` 重对账兜底（工具仍即时移出 + 审计 + 幂等） |
| EC-V23-005 静态权限被请求撤销 | 无撤销控件 + 「需停用/卸载扩展」如实披露 |
| EC-V23-006 LLM 清除失败/未配置 | 可读原因；`hasKey` 不假装翻转 |
| EC-V23-007 快速重复点击 | 幂等；不产生重复审计噪音 |
| EC-V23-008 关闭自动授权后下一次调用 | 立即恢复 `ask`；不撤销站点授权；审计体现设置变更 |
| EC-V23-009 会话组解散时存在待决 `confirm`/`ask-user` | 按 v1 EC-019 fail-closed（confirm=拒绝 / ask-user=取消），不静默挂起 |

---

## 4. 方案对比

| 维度 | 方案 A：白名单编排层 + 既有 ops（推荐） | 方案 B：在 SW 新增「撤销专用」case | 方案 C：树内直接调用 `chrome.permissions` / store |
|------|:--|:--|:--|
| 描述 | `tree-ops.ts` 封闭动作表 → 复用 `SettingsOps` + 既有消息 | 为新动作加 SW case | 侧栏直接操作 Chrome API/存储 |
| 优点 | 零新增判定路径；可导入白名单 + 单调性证明；复用已测 ops | 少一跳 | 直观 |
| 缺点 | 一层编排 | **新增判定路径**（安全复核面扩张）；重复实现；改 v1 代码 | **越权**；无审计；无 fail-closed 保证；不可测 |
| 风险 | 低 | 中高（红线） | **高（红线）** |
| 工作量 | 低 | 中 | 低（返工极高） |

**回执呈现对比**：A（抽屉内三件套，工具面证据来自重拉实测）vs B（toast，无证据落点，三件套缺一）vs C（写进 `#log`，污染对话）。A 胜出（详见父 plan §4.5 / ADR-V2-009）。

**确认范围对比**：A（不可逆确认 / 开关不确认）vs B（全确认，惩罚可逆操作）vs C（全不确认，违背 FR-V2-040）。A 胜出（ADR-V2-013）。

---

## 5. 推荐方案

**推荐方案 A（白名单编排 + 既有 ops）**。理由：唯一同时满足「FR-V2-036 只走既有 fail-closed 通路」「FR-V2-063 撤销路径不得成为放宽门禁的旁路」「FR-V2-039 无静默失败」的形态；且安全红线可**机器钉死**（白名单 + 单调性决策表 + 冻结门禁 + 六条反向断言）。（对应父 plan ADR-V2-008/009/011/013/015。）

---

## 6. 文件影响分析

| 操作 | 文件路径 | 说明 |
|:--:|------|------|
| NEW | `packages/web-cli-plugin/src/ui/tree/tree-ops.ts` | 动作白名单编排（只调既有通路） |
| NEW | `packages/web-cli-plugin/src/ui/tree/tree-receipt.ts` | 三件套回执对象（纯） |
| MODIFY | `packages/web-cli-plugin/src/ui/tree/tree-view.ts` | 动作控件语义（deny 无开关 / 静态权限无撤销 / 确认判定） |
| MODIFY | `packages/web-cli-plugin/src/ui/tree/tree-drawer.ts` | 绑定动作 + `#tree-receipt` + `#tree-confirm` 渲染 |
| NEW | `packages/web-cli-plugin/test/insight-security.test.ts` | **AC-V2-005 六条反向断言 + allow 集合单调性** |
| NEW | `packages/web-cli-plugin/test/insight-no-escalation.test.ts` | 导入白名单 + policy 冻结 + 无 bare catch/零明文 grep |
| MODIFY | `packages/web-cli-plugin/test/ui/binding.mjs` | **追加** V2-3 撤销链 check（既有编号零删改） |

**不改**：`service-worker.ts` 既有 case、`policy.ts`、`auto-authorize.ts`、`manifest.json`、`options.html`、`packages/web-cli-base/**`、v1 SDDU 目录。

---

## 7. 风险评估

| 风险 | 概率 | 影响 | 缓解措施 |
|------|:--:|:--:|----------|
| 撤销路径意外成为放行旁路 | 低 | **极高** | 白名单编排 + allow 集合单调性决策表 + `policy`/`auto-authorize` 冻结（pinned + `git diff --quiet`）+ 导入白名单 |
| 撤销失败被渲染为成功（假成功） | 中 | 高 | 三件套中 ② 来自**重拉实测**（`presentInSurface`）；失败路径 `kind:'err'`；无 bare catch |
| `permissions.onRemoved` 竞态 | 中 | 中 | 显式 `permission-changed` 重对账兜底 + 幂等 + 审计落地 |
| 重复点击导致重复审计噪音 | 中 | 低 | 幂等（`revoked:false` 可读态）+ 事件去重（同 action 短窗内复用回执） |
| 二次确认范围误判 | 低 | 中 | `needsConfirmation` 纯函数 + 单测覆盖 7 个动作 |
| 零明文泄漏 | 低 | 高 | 只消费 `LlmStatusSummary`；grep 门禁；审计复用既有掩码 |
| 误增 SW case / 改既有 handler | 低 | 高 | 文件影响分析限定；`git diff` 复核既有 case 段零变更 |
| 门禁并发 OOM | 中 | 高 | 串行纪律；`test:binding` 串行于其它门禁之后 |

---

## 8. 生成的 ADR

本叶子**不新开 ADR**，承接父 `plan.md`：

| ADR | 标题 | 与本叶子关系 |
|-----|------|-------------|
| ADR-V2-008 | 撤销面 = 既有 ops 白名单编排；永不新增判定路径 | **本叶子主决策**（FR-V2-036/060/063） |
| ADR-V2-009 | 回执/审计 = 抽屉内三件套 + 既有 `admin_audit-export`；零明文 | 本叶子回执实现（P-V2-05） |
| ADR-V2-011 | `deny` 不可关 / 静态权限不可撤销 = 渲染模型结构保证 | 本叶子控件语义（FR-V2-038/052/064） |
| ADR-V2-013 | 二次确认范围（不可逆确认 / 开关不需） | 本叶子确认实现（O-V2-005 / FR-V2-040） |
| ADR-V2-015 | 来源约束（导入白名单 + 禁改面 diff 门禁） | 本叶子安全门禁 |

### 交付门槛（本叶子）

**可自动化验收面**

| 门禁 | 断言要点 | 量化口径 |
|------|----------|----------|
| `test/insight-security.test.ts`（node） | **AC-V2-005 六条反向断言**逐条；每个撤销动作 allow 集合**单调收缩**（`allowAfter ⊆ allowBefore`）；决策表全量 | 6/6 断言；零 ask/deny→allow |
| `test/insight-no-escalation.test.ts`（node+git） | `PLUGIN_RISK_DEFAULTS` pinned；`AUTO_AUTH_DEFAULTS` pinned；`decideAutoAuthorization` 硬底线 pinned；`git diff --quiet` policy/auto-authorize；无 bare catch；无 `apiKey` | diff 为空；grep 零命中 |
| `test/tree-ops.test.ts`（node，随 `npm test`） | 7 动作 → 唯一既有通路；无默认写入分支；`needsConfirmation` 逐动作；幂等（重复撤销可读）；失败 → `kind:'err'` | 7/7 动作 |
| `npm run test:binding`（**追加** check，真实 dist + 真实站点） | 站点取消授权 → 工具**即时**移出 + 审计 + 权限移除回执；能力撤销 → 工具移出 + 可读拒绝 + `optional-permission/revoked` 审计；开关关断 → `deriveTools()` 无该工具 | 既有 163 断言零删减 + 新 check 全绿 |
| `npm test` 回归 | 全仓 0 fail；`web-cli-base` 483 零回归；`tsc --noEmit` 0 error | 串行执行记录 |

**人工面**

| # | 人工面 | 说明 |
|---|--------|------|
| H-1 | 真实授权弹窗（`chrome.permissions.request`） | V2-3 **不授予**权限（只撤销）；授权入口仍归设置面板 |
| H-2 | 原生 `tabs.goBack`/`goForward` 等浏览器壳行为 | CDP 无法复现真实导航观感 |
| H-3 | 剪贴板真读焦点（`clipboard read` 成功与否取决页面焦点） | 无头焦点语义不同 |
| H-4 | 真实用户手势下 `permissions.remove` 的浏览器回执观感 | 无头仅能断言状态与工具面 |
| H-5 | `chrome://extensions` 外部撤销后树内实时刷新观感 | 跨进程真实事件时序 |
| H-6 | 二次确认文案在窄栏/长站点名下的可读性与拥挤度 | 视觉判断 |

---

## 9. R2 技术设计修订（V2-3 操作侧：撤销 + 命令级用户覆盖；post-validate，phase 不回退；2026-09-13）

> **输入**：本叶 `spec.md` v2.0（R2，承载父 `FR-V2-074/075/076`）+ 父 `plan.md` §9/§10（尤其 ADR-V2-024/025/026/027）+ P0 pin（`policy.ts` `bfcb2ede…` / `auto-authorize.ts` `1096d065…`）。

### 9.1 R2 边界变更

- `FR-V2-036` **范围限定**：撤销/关断通路**仍只走既有 fail-closed 通路、不放宽**（本条**不变**）。
- **新增独立通路**：命令级用户覆盖（显式 + 被审计 + 可恢复 + 经 clamp → 非旁路，父 FR-V2-063 判据三条齐备）。
- 「不做命令级策略覆盖」**作废** → **NG1R**：不做无审计放宽 / 不做绕过 clamp 的覆盖。

### 9.2 覆盖层接入与 clamp（**服务端强制**）

```
tree-drawer 控件
  → tree-ops.run({actionId:'set-command-policy'|'reset-command-policy', target:{command, policyAction?}, confirmed?})
  → transport.send(makeMessage('command-policy-set' | 'command-policy-reset', {...}))
  → SW case：commandPolicyStore.set/reset/resetAll  → audit('command-policy') → pushInsightChanged()
  → 下一次 host.dispatch：RouterPolicy strategies = [S1, S3, overrideStrategy, S2]
        overrideStrategy 读 SW 内存覆盖 → clampOverride() → allow/ask/deny（硬底线返回 null → 基线）
```

- **优先级**：`硬底线（S1/S3/evaluate/ui·state·external 不放宽/破坏性保底 ask） > 用户覆盖 > 默认 risk 档`。
- **clamp 逐档**：见父 `plan.md` §9.3（11 行结论表）；本叶实现 `resolveCommandPolicy()` + 策略，逐档单测（AC-V2-025 / AC-V23-010）。
- **服务端强制证据**：判定在 SW 的 gate（`router.dispatch`）内完成；UI 只发消息、无本地判定；`host.ts` 组合 policy（`withCommandOverride`）；`policy.ts`/`auto-authorize.ts` 源码 sha256 **不变**。
- **`dom`/`dom read-state`**：作者示例三档全可用（工具级=设置载体/继承；每子命令按 effective risk 再 clamp；`dom click` 等 ui 调用仍不放宽）。

### 9.3 存储 / 生命周期（ADR-V2-026）

- 键 `web-cli:command-policy`；`{version:1, entries:{commandId:{action,updatedAt}}}`；**不新增权限**。
- 单键整对象原子写 + 串行队列 + 写成功才提交内存（**无半写**）；同值幂等（不写不审计）；单条/全部恢复默认；失败可读。
- 继承：`cmd:name#sub` > `cmd:name` > 默认档。
- 审计：新类型 `command-policy`，**零明文**。

### 9.4 动作白名单 7→9（扩展 ADR-V2-008；ADR-V2-027）

| `TreeActionId` | 唯一通路 | 可逆 | 需确认 | 方向 |
|----------------|----------|:--:|:--:|:--:|
| `set-command-policy` | `command-policy-set` 消息 → SW store + audit | 可逆（reset） | **放宽类**（desired allow 且相对默认是放宽）✅；收紧（ask/deny）❌ | 覆盖 |
| `reset-command-policy` | `command-policy-reset` 消息 → SW store + audit | 可逆 | ❌ | 恢复默认 |
| （既有 7 动作） | **不变** | — | 不变 | 撤销/关断 |

- 保留 `switch` 分派 + 白名单外**零写入**兜底（无默认写入分支）。
- **pin 更新流程**：`TREE_ACTION_IDS_JSON_SHA256` / `TREE_MODULE_SHA256` / `TREE_NO_ESCALATION_NOTE_SHA256` 显式更新（新值 + 日期 + 来源 commit + 理由 + 前后值 + 历史保留）+ 反证自测。

### 9.5 断言取代（本叶，removed=0；对应父 §9.8 S1~S3、S9~S12、S17）

| 旧 | 理由 | 新 |
|----|------|----|
| `tree-ops.test.ts :: exactly 7 values` | 7→9 | `… exactly 9 values` + 负例调整（保留 grant/request 非法） |
| `tree-ops.test.ts :: each of the 7 actions …` | 9 | `… each of the 9 actions …`（+2 通路） |
| `tree-ops.test.ts :: needsConfirmation …` | 放宽确认 | 9 动作 + `commandPolicyNeedsConfirmation` |
| `insight-no-escalation.test.ts :: tree-ops no write verb` | 7→9 | 仍禁 grant/request；白名单含 9 id |
| `insight-archive.test.ts :: TREE_ACTION_IDS exactly 7` | 7→9 | 9 + pin 显式更新 |
| `insight-security.test.ts` 六条反向断言 + allow 单调性 | **范围重定** | 六条**保留**（撤销/关断场景）；追加 `command-policy` 覆盖场景的 clamp 反向断言（AC-V2-025）——**单调性不用于否定覆盖**（父 AC-V2-005 注） |
| 新增 | 覆盖可达/工程属性 | `command-override.test.ts`（AC-V2-023/024）、`insight-override-security.test.ts`（AC-V2-025） |
| `binding.mjs #21a…` | **不变** | 零改动；其后追加 `#22a…`（覆盖三档 → dispatch 反映 / reset / 持久化） |

**硬底线断言只增**：`policy`/`auto-authorize` pin、决策表 pin、`AUTO_AUTH_DEFAULTS`、`decideAutoAuthorization` 硬底线 **全部不变**。

---

## 10. 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| **v2.0** | **R2 技术设计修订（post-validate；phase 不回退；编排器代作者决策 2026-09-13 授权）**：新增 §9 —— 命令级用户覆盖层（SW 侧 policy 组合 `[S1,S3,override,S2]` + `clampOverride` 逐档 + 服务端强制）+ 存储/继承/恢复/幂等/无半写/审计零明文 + 白名单 7→9 + 放宽类二次确认 + pin 显式更新；`FR-V2-036` 限定为撤销/关断面；断言取代（removed=0；六条反向断言保留 + 追加覆盖 clamp 反向断言）。承接父 ADR-V2-024/025/026/027/031。 | 2026-09-13 | SDDU Plan Agent（R2） |
| v1.0 | 初始创建。V2-3 技术方案：既有 ops 白名单编排（7 动作，无新增判定路径）；三件套回执（工具面证据来自重拉实测）；`deny` 无开关 / 静态权限不可撤销（渲染模型结构保证）；AC-V2-005 六条反向断言 + allow 集合单调性 + policy 冻结门禁；二次确认范围；9 类边界情况；文件影响与可自动化/人工面。承接父 plan ADR-V2-008/009/011/013/015。 | 2026-09-13 | SDDU Plan Agent |
