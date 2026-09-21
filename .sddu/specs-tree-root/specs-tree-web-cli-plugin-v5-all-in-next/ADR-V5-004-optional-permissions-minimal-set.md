# ADR-V5-004: `optional_permissions` 最小集（X1：首批 0 项新增 + 机制预留）

## 状态
ACCEPTED

## 背景

现状（`manifest.json` 逐字 + `test/capability-wiring.test.ts:20-50`）：

| 面 | 现状 | 门禁 |
|---|---|---|
| 静态 `permissions` | `['activeTab','scripting','storage','sidePanel','tabs']`（5） | `capability-wiring:26-29` 逐字 |
| `optional_permissions` | `['bookmarks','downloads','notifications','clipboardRead','clipboardWrite']`（5） | `capability-wiring:35-38` 逐字 |
| `host_permissions` | 6 条 LLM endpoint | `:50` `length === 6` |
| `optional_host_permissions` | `['http://*/*','https://*/*']`（2） | 逐字 |
| `minimum_chrome_version` | `116` | `:49` |

X1（作者裁决①）「允许新增 `optional_permissions`」；FR-ALLN-110 要求「安装期静态 `permissions` **逐字不变**；新增/沿用项须**最小必要论证**」。R-ALLN-003 / R-ALLN-016 指出：改动可选集合会牵动 4 个门禁（`capability-wiring` / `binding-wiring` / `auto-session-wiring` / `test:binding` 192）。

首批 9 op 的真实权限需求（本轮逐 op 核对）：

| op | 需要的能力 | 归属面 |
|---|---|---|
| `op.authorize` | `activeTab`（静态）+ `scripting`（静态）+ `optional_host_permissions`（**已有 2 条**） | 静态/已有可选 host |
| `op.perm.request` | 可选能力项（`OPTIONAL_CAPABILITIES = ['bookmarks','downloads','notify','clipboard']` → 现有 5 条可选权限） | **已有可选** |
| `op.pick` | `activeTab` + `scripting`（静态） | 静态 |
| 其余 6 op | 零浏览器权限（面板本地 / 消息） | 无 |

## 选项

| 选项 | 形态 | 优点 | 缺点 |
|---|---|---|---|
| **A 首批 0 项新增 + 机制预留**（选） | `manifest.json` **零 diff**；X1 落地为「机制放开 + 判据显式名单化」 | 安装面零漂移；R-ALLN-003 / R-ALLN-016 归零；无安全评审新增面 | X1「允许新增」在本批**未被使用**（需显式登记为机制预留，避免被误读为「没做 X1」） |
| B 新增 1 项（如 `downloads` 之外的 `webNavigation` 等） | 为未来 op 预留 | 显式演示 X1 机制 | 无当前需求 ⇒ 违「最小必要」；牵动 4 门禁 + 安全评审，纯风险 |
| C 把可选能力项提升为静态 | 一劳永逸 | 无需申请 | 违 NG-ALLN-005 / N8（安装期静态面零变化）**红线** |

## 决策

**采用 A：首批 0 项新增。**

### 1. 最小集论证（结论）

- `op.perm.request` 的 `form` 选项**逐项来自** `OPTIONAL_CAPABILITIES`（`src/platform/capability-permissions.ts:67`，4 类能力 / 5 条权限），**无需新增任何权限**；
- `op.authorize` 复用已声明的 `optional_host_permissions`（2 条）+ 静态 `activeTab`/`scripting`；
- ⇒ **最小必要集 = 现状集**。`manifest.json` **零 diff**（`git diff --quiet -- packages/web-cli-plugin/manifest.json` 通过）。

### 2. 机制预留（**必须显式登记**，防止 X1 被误判为未落地）

- X1 落地形态 = **判据从「逐字 5 项」升级为「显式名单 + 新增项在册」**：
  - ① 静态集合仍**逐字**断言（5 项，不因机制放开而放松）；
  - ② 可选集合 = **显式名单**（不是 `length ≥ 5`）：`assert.deepEqual(optional, ['bookmarks','clipboardRead','clipboardWrite','downloads','notifications'])` **保留**，并**追加**「任何新增项必须在 `docs/v4-supersession-ledger.json#modifiedRanges[]` 有条目 + 最小必要论证 + `OPTIONAL_CAPABILITY_PERMISSIONS` 同源」；
  - ③ `host_permissions` 6 条 + 无 `<all_urls>` / 无 `*://*/*` / 无静态 `content_scripts` / `minimum_chrome_version = 116` **全部不变**。
- 本轮实跑结果：可选集合**逐字未变** ⇒ ②的「新增项在册」分支**空集通过**（不是放宽，是**更强**的判据：既钉死名单，又约束未来新增）。

### 3. op.perm.request 的权限项来源单一化

`form` 多选的候选项 = `OPTIONAL_CAPABILITIES.map(id => ({id, label: OPTIONAL_CAPABILITY_LABEL[id], scope}))` —— 与设置面 `settings/ops.ts#loadCapabilities` **同源**（同一常量）。判据：`op` 侧权限项集合 == `OPTIONAL_CAPABILITIES`（注入一个不在册的项 ⇒ FAIL）。

## 后果

**正面**：安装期静态面**零漂移**；无新安全面；R-ALLN-003 / R-ALLN-016 风险归零；X1 以**更强的判据**落地（钉死名单 + 约束未来）。

**代价 / 风险**：`capability-wiring` / `binding-wiring` / `auto-session-wiring` / `test:binding`（192）需**等价重锚**（判据句式变化，计数不减）；R-ALLN-014（浏览器弹窗 headless 不可合成）仍存在 ⇒ `op.perm.request` 的弹窗环节入**人工面**（EC-ALLN-007，不得冒充 PASS）。

## 影响 FR

FR-ALLN-043 / 066 / 110 / 111；NFR-ALLN-009；N8；AC-ALLN-010 / 012 / 022 / 024；EC-ALLN-007 / 008。

## 回滚

`manifest.json` 从未改动 ⇒ 回滚 = 删除新增的「新增项在册」断言分支（保留原逐字 5 项断言，即回到基线判据）。op 侧权限项同源断言可独立回滚。
