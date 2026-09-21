# ADR-V5-003: SW 执行器 + `op-*` type-only 消息族 + 双侧注册表同源

## 状态
ACCEPTED

## 背景

现状（本轮只读复核）：

- `PluginMessageKind` / `KIND_SET` 定义在 `background/messaging.ts:7,103-141`，被 `content-script.ts:20` **直接 import** ⇒ 打进 `content.js`；历史往 `KIND_SET` 加 6 个字符串 = `content.js` **+307 B**（`content.js` 177,076 B **零余量**）。
- 既有 **type-only 先例**：`command-policy` / `pick-layer-*` / `ref-rescue`（`messaging.ts:68-89`）——**在 union 类型里出现、不进 `KIND_SET`**，运行时校验落独立模块（`insight-protocol.ts` / `content/pick-protocol.ts`），`content.js` 从不引用。
- SW 消息路由 = `service-worker.ts:1990 handleMessage` 的 `switch (message.kind)`；入口闸门 `:2762`：`if (!isPluginMessage(raw) && !isInsightMessage(raw) && !isPickLayerMessage(raw) && !isRefRescueMessage(raw)) return undefined;`
- 权限面门禁 `test/capability-wiring.test.ts:51-58`：**SW 永不调用 `.request(`**（手势只能来自扩展页面）。

父 spec §5.7 FR-ALLN-065~069：① 双层执行器（panel-local / 特权 op 经 SW）；② 特权 op **恰 2 项**；③ `op-*` **type-only**（`KIND_SET` 零新增 / `content.js` 逐字节零增长）；④ SW 侧小型注册表镜像契约 `{id, mode, fail, audit}` 与面板侧**同源**。

## 选项

| 选项 | 形态 | 优点 | 缺点 |
|---|---|---|---|
| **A type-only 消息族 + 双侧同源表 + SW 执行器（手势申请仍留 page）**（选） | union 扩 `op-exec`/`op-exec-result`（**不进 `KIND_SET`**）+ `src/background/op-protocol.ts` 校验 + `src/shared/op-table.ts` 单源 + `src/background/op-executors.ts` | `content.js` 零增长；双侧语义同源可机核；手势语义保留 | 需两段握手（`op-exec` → gesture → `op-exec-result`） |
| B `op-*` 进 `KIND_SET` | 与其它 kind 同构 | 实现最省 | `content.js` +数百 B ⇒ **红线破**（NG-ALLN-006） |
| C SW 直接 `chrome.permissions.request` | 特权 op 一步到位 | 「SW 执行器」语义最纯 | Chrome 无手势 ⇒ 调用必失败；且 `capability-wiring:51-58` 逐字钉死「SW 永不 `.request(`」 |

## 决策

**采用 A**。三层落点：

### 1. 消息族 `op-*` = type-only（X2 落地形态）

- `messaging.ts` 的 **union 类型**扩 `| 'op-exec' | 'op-exec-result' | 'op-audit'`（**TS 类型成员，运行时零字节**）；**`KIND_SET` 集合字面量逐字不动**（这是「+307 B」的唯一来源）。
- 新增 `src/background/op-protocol.ts`：`isOpMessage(v): boolean`（仿 `pick-protocol.ts` / `insight-protocol.ts`），是本族的**唯一运行时校验**。
- SW 入口闸门追加 `&& !isOpMessage(raw)`；`handleMessage` 增 `case 'op-exec'`。
- **判据**：`KIND_SET` 逐字对比零新增；`dist/content.js` 177,076 B / sha `52a82620…` 逐字节命中；`content-script.ts` 的 import 边**不引用** `op-protocol.ts`。

### 2. 双侧注册表**同源**（FR-ALLN-068）

- `src/shared/op-table.ts`（**纯数据、零 chrome**）：`OP_DESCRIPTORS = [{ id, layer, mode, fail, audit }, …]` 9 行 —— 面板注册表与 SW 执行器**都从它派生**，镜像字段集恰为 `{id, mode, fail, audit}`。
- `src/background/op-executors.ts`：`SW_OPS = { [id]: { mode, fail, audit } }`（**由 `OP_DESCRIPTORS.filter(layer==='sw')` 派生**，不得手写第二份）。
- **漂移反证**：在 `op-table.ts` 改一行 → SW 镜像断言 + 面板注册表断言**同时**红（同源守卫）；反写一份手工镜像 ⇒ 「恰一处声明」扫描 FAIL。

### 3. 双层执行器与**手势边界**（FR-ALLN-065 / 066 的等价口径）

特权 op **恰 2 项**：`op.authorize`（origin 权限）与 `op.perm.request`（`permissions.request`）。

**关键裁决（可机核且不违 Chrome 手势约束）**：浏览器权限**申请动作必须发生在扩展页面内的用户手势里**（Chrome 强制；`capability-wiring:51-58` 亦逐字钉死 SW 不得 `.request(`）。因此「特权 op 经 SW 执行器」的落法 = **SW 是授权裁决 / 登记 / 快照 / 审计的唯一 owner，页面只提供手势**，两段握手：

```
panel: runOp('op.authorize') → params/consent（流内卡）
  → ① panel → SW：op-exec {opId, consentToken}
  → ② SW：校验 consentToken / 快照授权表 / 计算 host pattern / 回 op-exec-result {needsGesture, pattern}
  → ③ panel（仍在用户手势回调内）：调用【唯一既有入口】requestOriginPermissionDetailed(origin)   ← capability-wiring 语义不变
  → ④ panel → SW：op-exec {opId, gestureResult}
  → ⑤ SW：commit 授权登记（OriginStore）或回滚 / 写审计 → op-exec-result
  → ⑥ panel：receipt（固化区 + 系统行）
```

- 面板侧**不再**自行 `send(makeMessage('authorize', …))` 决定授权——授权登记与审计改由 SW 执行器裁决（FR-ALLN-065「不得在面板侧直接申请」的等价落地：**不得在面板侧自行登记/裁决**）。
- `capability-wiring` 判据**等价重锚**为：① SW 内 `.request(` 仍**零命中**（逐字）；② `requestOriginPermissionDetailed` 在面板侧**恰 2 调用点**且都在手势回调内（既有断言保留）；③ `op-exec` 族 type-only；④ 特权 op 清单**恰 2 项**（新断言）。

## 后果

**正面**：`content.js` 逐字节零增长（红线不破）；双侧语义同源、漂移可机核；手势语义与既有权限门禁**同时**成立。

**代价 / 风险**：新增 SW 侧模块进 **service-worker bundle**（不进 `sidepanel.js`，体积归因为零）；握手使 `op.authorize` 的失败语义需要「三步任一失败 → 整体回滚 + 错误卡 + 恢复 next」的显式处理（并入 ADR-V5-002 的快照回滚路径）。R-ALLN-002（content.js 红线）与 R-ALLN-003（权限面）由此降为**低**。

## 影响 FR

FR-ALLN-065 / 066 / 067 / 068 / 069 / 110 / 111；EC-ALLN-007 / 008；N1 / N8 / N24；AC-ALLN-010 / 022。

## 回滚

`op-protocol.ts` / `op-executors.ts` / `op-table.ts` 为新增；union 成员删除后零运行时影响；SW `case 'op-exec'` 删除即可。回滚后 `content.js` / `KIND_SET` / `capability-wiring` 均回到原状（从未被改动）。**回滚不涉红线**。
