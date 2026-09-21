# ADR-V5-005: `settings/ops.ts` 4 类收编（单一执行体 + 零双路径）

## 状态
ACCEPTED

## 背景

现状（本轮只读复核）：`src/ui/settings/ops.ts:122-149` 的 `SettingsOps` 单口暴露 **17 个操作**；两处消费面：面板内设置视图（`settings/panel.ts`，主路径）+ 回退 `options.html`（`options.ts`）。其中与首批 op **重叠 4 类**：

| 重叠类 | 现状实现 | 与哪个 op 重叠 |
|---|---|---|
| `authorize` | `sidepanel.ts#authorizeCurrentSite()`（`#authorize` 按钮 + chip，2 调用点） | `op.authorize` |
| `revoke` | `ops.revokeCapability(cap)`（`capabilityRevokeReceipt`）+ `ops.clearAutoAuth(origin)` + 授权撤销（`revoke` 消息） | `op.revoke`（3 目标：站点授权 / 浏览器权限 / LLM 凭据） |
| `rebind` | `sidepanel.ts#rebindCurrentTab()`（`#rebind` 按钮 + chip，1 调用点） | `op.rebind` |
| `llm-config` | `ops.saveLlm` / `testConnection` / `clearLlm` + `settings-llm` 表单（`panel.ts:130-179`） | `op.llm-config` |

R-ALLN-012（双入口漂移，中高）+ v4.5 双写教训：同一操作两条执行路径 ⇒ 行为 / 留痕 / 门禁漂移（FIX-1 `authorizeCurrentSite()` 单一生产入口是**正面先例**）。FR-ALLN-075~078 要求 4 类收编为 op **单一执行入口**（设置按钮与 chat chip 都是 op 触发器），其余设置操作**零改动**。

## 选项

| 选项 | 形态 | 优点 | 缺点 |
|---|---|---|---|
| **A 执行体单一来源（`execute` 只在 op 表；设置面调 `dispatchOp`）**（选） | 4 类的执行体迁入 op 表；`SettingsOps` 对应方法变薄包装；面板设置按钮与 chip 同调 `dispatchOp`；`options.html` 走同一 `execute`（无流内卡） | 零双路径；留痕同源；FIX-1 先例延伸 | 需处理 `options.html` 无流（consent 载体不同，须登记） |
| B 设置面保留自实现，chat 侧走 op（并行） | 改动最小 | 双写复辟 ⇒ R-ALLN-012 成真；违 FR-ALLN-076 |
| C 删除设置面 4 类（只留 chat） | 「唯一」最彻底 | 违法六（作者裁决④：设置视图保留为管理面）；options.html 失去管理能力 |

## 决策

**采用 A**。

### 1. 执行体单源

- 4 类 op 的 `execute(ctx)` 体**只存在于** `OPS_BY_ID`（`next-registry/ops.ts`）；`settings/ops.ts` 中对应实现**改为委派**：
  ```ts
  // settings/ops.ts（签名保留 ⇒ FR-ALLN-077）
  revokeCapability(cap) { return dispatchOp('op.revoke', { target: 'permission', cap, surface: 'settings' }); }
  clearAutoAuth(origin) { return dispatchOp('op.revoke', { target: 'auto-auth', origin, surface: 'settings' }); }
  // llm-config 三方法同构委派 op.llm-config（execute='llm-write' 体）
  ```
  判据：4 类的 `execute` 体在 `src` 中**恰一处**；`settings/ops.ts` 内不再出现原生实现语句（`deps.store.save` / `removeCapabilityPermission` / `auto-auth` 消息）——它们只出现在 `op` 执行体模块。

### 2. 双触发面 == 同一入口

- 面板设置视图按钮：`#authorize` / `#rebind` / 设置-能力撤销 / 设置-LLM 表单 → 全部调 `dispatchOp(opId)`；
- chat chip：`data-op` → `dispatchChipAction`（ADR-V5-001）→ `runOp` → 同一 `execute`；
- 判据（仿 `test/authorize-chip-wiring.test.ts`，逐 op 一条布线门禁）：① 能力/动作请求**唯一调用点**；② 单一入口调用点集合**显式登记**；③ 无 `requestTurn`（除 `op.turn`）；④ ≥3 条伪造反证可 FAIL。

### 3. `options.html` 的 consent 载体（显式登记，不是漏洞）

`options.html` 无聊天流 ⇒ 走 `runOp(opId, { surface: 'options' })`：跳过 `params`/`consent` **流内卡**，以设置页自身的显式确认（既有按钮 / 表单提交）作为 **consent 等价物**。登记为「**同执行体、不同 consent 载体**」，并在 `knownGaps` 邻域显式记录（避免被误读为「consent 被绕过」）。**留痕**：options 侧回执走 `OpResult` 文本（既有形态），与面板侧回执**同源构造**（同 opId / 同 `maskedLength` 口径）。

### 4. 其余设置操作零改动

`SettingsOps` 其余 13 个操作（`loadLlm` / `loadLlmStatus` / `loadTabsSetting` / `setTabsSetting` / `loadCapabilities` / `setCapabilityPrivacy` / `notifyCapabilityPermissionChanged` / `loadAutoAuth` / `setAutoAuth` / `loadSessions` / `groupAction` / `runDiagnostics` / `testConnection` 的只读用法）**签名与行为零变化**；`SETTINGS_SECTION_IDS` 8 分区结构不动（法六）。

## 后果

**正面**：4 类操作零双路径；留痕同源；`test:authorize-chip-wiring` 先例延伸为逐 op 布线门禁。

**代价 / 风险**：`op.revoke` 的 3 目标（站点授权 / 浏览器权限 / LLM 凭据）与 `op.llm-config` 的凭据写需要**三表快照回滚**（并入 ADR-V5-002 / EC-ALLN-011）；`options.html` 的 consent 载体差异必须**显式登记**（R-ALLN-012 残余风险，登记后为**受控**）。`settings/ops.ts` 是共享面，改动会触发 `test:settings` / `test:l2-counts` 复跑（计数只增）。

## 影响 FR

FR-ALLN-041 / 042 / 044 / 075 / 076 / 077 / 078；EC-ALLN-011 / 012 / 016；N25；AC-ALLN-007 / 011 / 019。

## 回滚

把 `settings/ops.ts` 4 类的委派体**还原为原实现**（逐字节），删除 `dispatchOp` 在设置面的调用点，删除逐 op 布线门禁的新增断言。op 侧执行体保留（不回滚 chat 侧），因为回滚只针对「双路径」这一层。
