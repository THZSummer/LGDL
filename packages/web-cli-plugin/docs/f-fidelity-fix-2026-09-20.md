# F 还原度快修轮（2026-09-20）—— 真机首屏评估的实现 ↔ 设计偏差修复

> 维护轮性质：v4-chat 已收口（HEAD `7cbe04c`），本轮**不触碰任何已关闭的 SDDU 产物**（`.sddu/**` 零改动），
> 修复记录独立成本文档。设计契约仍为 `design/ui-redesign/option-f-chat-stream.html` + shim
> （`test/design-contract.test.ts` 60 断言 sha 冻结，**本轮未触碰 `design/**` 与 shim**：修的是实现层
> 语义/文案，不是 12 卡类型学）。
>
> 基线（轮前）：npm test 992 / l0 221 / recommendation 49 / density 175 / supersession 33；
> `dist/sidepanel.js` **479,021 B**（ceiling 502,972 B）。

---

## 1. 问题清单与修法（FIX-1~FIX-4）

### FIX-1（P1）授权 chip 直达授权流

**缺陷**：`src/ui/sidepanel/recommend.ts` 的 onboarding 规则把「授权当前站点」chip 标为 `act:'next'`，
`handleCardAction` 的 `'next'` 分支于是把该**字符串当聊天消息**发给 LLM（`requestTurn`）；而授权实际是
**浏览器权限流**（`chrome.permissions.request`），唯一入口在设置视图 `#authorize`。

**修法**：
1. `NEXTSTEP_ACTS` 闭集 `['next','repick','describe']` → **`['next','repick','describe','authorize']`**；
   onboarding 规则「授权当前站点」chip 改 `act:'authorize'`（「了解 6 个页面手势」保持 `next`）。
2. `sidepanel.ts` 把原先内联在 `#authorize` 监听器里的权限流抽成**单一生产入口**
   `authorizeCurrentSite()`（语义逐字节不变：手势内请求可选 host 权限、best-effort、D-064 可读回退理由）。
   设置按钮与 chip 两处调用，别处不再出现 `requestOriginPermissionDetailed`。
3. `handleCardAction` 新增 `authorize` 分支 → `authorizeCurrentSite()`：**本地权限流，不经 `requestTurn`、
   不受 `pending` 门控**（与 `repick` 同理）。
4. `cards/nextstep.ts` 的 `data-act` 渲染本就来自 `view.payload.nextstepActs`，新值自动透传（零改动确认）。
5. 门禁同步：
   - `test/recommendation-sources.test.ts` 新增 2 条（act 闭集含 `authorize`；deny 集不误伤本地动作）；
   - 新增 `test/authorize-chip-wiring.test.ts`（布线静态门禁：权限请求唯一调用点 / 单一入口 2 个调用点 /
     authorize 分支无 `requestTurn` + 三条伪造反证 + 与 act 闭集同源）；
   - `test/ui/recommendation.mjs` 新增 **⑭**（7 条运行时断言）。

**FIX-1 两段证伪（原文）**：日志 `/tmp/opencode/v4-gate-logs/f-fidelity-fix/`
（`fix1-A-build.log` / `fix1-A-recommendation.log` / `fix1-B-build.log` / `fix1-B-recommendation.log`）。

- A 段（注入回退：authorize 分支改回 `requestTurn('授权当前站点')` 并重建）：

```
▶ ⑭ FIX-1：授权 chip → 权限请求路径（不产生 user 回合）
  ✔ ⑭ 首装卡存在「授权当前站点」chip 且 act=authorize（闭集扩为 4）
  ✔ ⑭ 同卡的「了解 6 个页面手势」仍是 next（闭集扩展不误伤回合 chip）
  ✔ ⑭ 权限请求探针已装入（stub 生效，判定非空转）
  ✖ ⑭ 点击授权 chip 不产生 user 回合（授权不是聊天消息） — {"card":true,...,"usersBefore":0,"inputBefore":"","stubApplied":true} | {"users":1,"input":"","authorizedNotice":false,"probe":[]}
  ✔ ⑭ 点击授权 chip 不把文本复制进输入框
  ✖ ⑭ 点击授权 chip 走权限请求路径（产出「已授权 <origin>」回执） — {"users":1,"input":"","authorizedNotice":false,"probe":[]}
  ✖ ⑭ 授权 chip 真的发起站点权限请求（chrome.permissions.request 收到 activeOrigin 的匹配式） — {"users":1,"input":"","authorizedNotice":false,"probe":[]}
▶ V4-4 引用卡 / 系统事件行 / 推荐卡门禁: 53 passed / 3 failed   （rc=1）
```

- B 段（逐字节还原 `src/ui/sidepanel/sidepanel.ts`，sha256 `43260b22…` 前后相同；重建）：
  ⑭ 7/7 全绿，门禁 `56 passed / 0 failed`（rc=0）。

### FIX-2（P2）过时空间指引文案

**缺陷**：v4-4 把 `#authorize` 迁入设置视图后，多处 v3 文案仍指向已消失的位置。

**全仓核对与订正**（grep `点击下方` / `【授权当前站点】` / `授权当前站点`）：

| 位置 | 原指向 | 处置 |
|---|---|---|
| `src/ui/sidepanel/view-model.ts`（onboarding 第 4 步） | 「点击下方『授权当前站点』」 | **订正**：「点『下一步推荐』卡中的『授权当前站点』（或 设置 → 站点与授权）」 |
| `src/tools/web-fetch-tool.ts`（未授权拒绝指引 ①） | 「点插件图标 → 点『授权当前站点』」 | **订正**：图标（绑定）→ 侧栏「设置 → 站点与授权」或「下一步推荐」卡中的「授权当前站点」 |
| `src/background/session-follow.ts`（两处通知） | 「侧栏『授权当前站点』」/「可点【授权当前站点】」 | **订正**：指明「设置 → 站点与授权」 |
| `src/background/service-worker.ts`（LLM 失败指引 + 探测 blocked 原因） | 「图标 → choose『授权当前站点』」/「请点击『授权当前站点』」 | **订正**：指明侧栏「设置 → 站点与授权」或推荐卡 |
| `src/ui/options/index.html`（options 页如何用） | 「在侧栏『授权当前站点』」 | **未动（deferred）**：该文件在 **v3 台账 `zeroDiffFiles`** 冻结（零注入/零权限/零依赖红线，且 v3 台账为冻结历史，不得解冻） |
| `src/ui/tree/tree-ops.ts`（撤销后重新授权提示） | 「在目标站点点击插件图标 /『授权当前站点』」 | **未动**：该文件被 `test/insight-archive.test.ts` **内容哈希 pin**（零升级冻结面）；且其措辞未声称具体位置（两条路径都真实存在）⇒ 判定「指向成立」，不改 |

`options/index.html` 的同类文案登记为 deferred（见 §5）。

### FIX-3 工具栏摘要回归 F 契约（origin + 授权态）

**缺陷**：`#l2-entry-summary` 是计数串（「状态：树 138 · 命令 94/176 · 审计 500 · 设置 7」），计数在首屏
出现 **3 次**（摘要行 + 入口标签 + 徽标）。

**修法**：新增纯函数 `view-model.ts#toolbarDigest`（数据源 = 既有 state 字段 `activeOrigin` / `authorized` /
`sessionLabel`，**不新增真值源**），`#l2-entry-summary` 渲染 `origin · 授权态 · 会话` 单行 digest；
入口标签 + 徽标保留 ⇒ 计数收敛为 **2 处**（EC-V3-016「两数字不合并」契约不动）。
`l2/counts.ts` **计数单源零改动**：`l2StatusBarText` 退出生产路径（被树摇，−409 B），其单测保留。

### FIX-4 决策槽 kicker 语义收敛

**缺陷**：`#l0-kicker` 文案「下一步做什么（等待任务）」与流内「下一步推荐」卡构成双「下一步」表面。

**修法**：`view-model.ts#L0_KICKER` 改为静态角色名 **「决策 · 回执 · 引用」**，`l0/shell.ts` 改读该常量
（原先在 `'下一步做什么'` / `'下一步做什么（等待任务）'` 间切换）。**DOM / id / class / ARIA 全不动**。

---

## 2. 门禁变化（计数对账，只增不减）

| 门禁 | 基线 | 本轮回 | 说明 |
|---|---|---|---|
| `npm test` | 992 | **1001** | +9（recommendation-sources +2、authorize-chip-wiring 新增 7） |
| `test:supersession` | 33 | 33 | 值重 pin，断言零删减 |
| `test:design-contract` | 60+ | 6（node 文件） | shim 60 断言与 sha 冻结**未动** |
| `test:l0` | 221 | **223** | ⑨ 「三处同源」等价替换为「两处同源 + digest」并 **+2** 断言 |
| `test:l2` | 74 | 74 | ① 摘要 digest 替换 + ③ 两处同源（等价重锚） |
| `test:recommendation` | 49 | **56** | 新增 ⑭ 7 条 |
| `test:density` | 175 | **175** | 阈值 7/15 · 9/20 · 17/35 零改动；28 登记格按实测**显式重锚** |
| `test:l1` / `stream` / `ask-auth` / `journey` / `binding` / `e2e` / `insight` / `hardening` / `page-input` / `zero-injection` / `l1-reverse` / `l2-reverse` / `gate-integrity` / `size-ruling-vol3` / `ref-pick-wiring` | — | 全绿 | `l2-reverse` 注入量 5 → 6（`l2.mjs` 断言 +1 同步 +1，判据文本不变） |

**24 项门禁串行复跑**（`/tmp/opencode/v4-gate-logs/f-fidelity-fix/summary.txt`）：23 项 rc=0；
`test-binding` 在全量串行中命中既知环境 flake（KL-N-10：`no sw` / `#6l` / `#8e` 三次不同现象），
**隔离复跑 rc=0（192 断言 PASS）**；`test-ui` 全量串行命中一次 #54g 权限回执时序 flake，**隔离复跑
rc=0（167 断言 PASS）**。两项均与 v4-4 收口轮同一口径（记录隔离复跑，不伪造串行绿）。

---

## 3. 登记册变更（五要素 / V3-VOL-3 / 密度格 / 取代台账）

- **体积五要素**（`test/size-baseline.ts#SIDEPANEL_RE_REGISTRATIONS['f-fidelity-fix']`）：
  **479,021 → 480,026 B（+1,005 B，+0.21%）**，ceiling = floor(480,026 × 1.05) = **504,027 B**（容差 5% 未动、
  cap 仍 record-only）。逐模块归因（真实 metafile）：`view-model.ts` +1,230 / `sidepanel.ts` +115 /
  `recommend.ts` +199 / `l2/counts.ts` −409（树摇）/ `l0/shell.ts` −130，**Σ +1,005 + glue 0 == +1,005**。
  `META.measuredOn` = 2026-09-20，`reRegisteredFrom` / TIMELINE / 历史逐字保留。
- **V3-VOL-3 三值同源同步**：`newBaselineBytes` 随现行基线前移至 **480,026**；**档位 `ceilTo50KB(480,026)`
  = 512,000 与绝对上限 563,200 均未变**；`resolvedOn` 保持 2026-09-19。
- **密度 31 格**：工具栏摘要 digest 使摘要自身文本 +30 字符、多一格换行 ⇒ 28 个登记格按 Chromium 实测
  **显式重锚**（default 6/181 → 7/211 等），**阈值与豁免口径零改动**；`risk(staleRef)` 的增量归属期望不变。
- **取代台账**：`docs/v4-supersession-ledger.json` 追加叶段 `f-fidelity-fix@7cbe04c`
  （7 文件 / 75 行逐字删除登记）+ 条目 `FIXFID-E-001`（体积重登记）+ 既有 V4 条目 newTitle 随文本重锚。
- **R2/§7 冻结红线**：`dist/content.js` **177,076 B / sha256 `52a82620…`**、
  `dist/pick-layer.js` **33,900 B / sha256 `5f567d7e…`**，与台账登记的稳定不变量**逐字节相同**
  （`src/content/**` 零 diff）；SW / `KIND_SET` / 判定链 / `manifest.json` 零触碰（**零新增权限**：授权是
  面板侧既有权限流复用）。

---

## 4. 红线核验

- `dist/content.js` = 177,076 B，sha256 `52a826205553b46a896ccad54225d63ba62f5f7fe7c969a9bc2e655448d5b5f6` ✔
- `dist/pick-layer.js` = 33,900 B，sha256 `5f567d7ededc58183afe4ce45e3293b68204dfbe788dc6b9fb09bdc6e0d13e59` ✔
- `dist/sidepanel.js` = **480,026 B** ≤ 生效上限 **504,027 B** ✔
- `design/**` 与 `test/design-contract.test.ts`（shim）**未触碰**；`.sddu/**` **未触碰**（`git status` 无相关路径）✔
- journey / binding 保护段零 diff（`test:ui` / `test:binding` 全绿）✔

---

## 5. Deferred 清单（本轮不做，登记理由）

1. **FIX-5（空态 L1 噪音）—— deferred**。先评估：`#l1-local-tree-toggle` / `#l1-history-toggle` /
   `#l1-receipt-toggle` 在 `test/ui/l0.mjs` ⑧（`EXPECTED_TRIGGERS` 逐条「存在 + 非空文字 + 目标含摘要或计数」）、
   `test/ui/l1.mjs` ②（展开几何「不遮挡」点击它们）/ ⑫（openAll/closeAll 往返）、
   `disclosure.ts` 注册表与 `l1-disclosure.test.ts` 中被**保护门禁 pin**；隐藏 0 计数会同时改写
   density 默认档 31 格与 L1 结构断言 ⇒ **门禁非零破坏**，按约定顺延。
2. **`src/ui/options/index.html` 的授权指引文案** —— 该文件在 v3 台账 `zeroDiffFiles` 中冻结（且 v3 台账为
   冻结历史，不得解冻）。若要改需先走一次显式解冻登记，属治理动作，本轮不做。
3. **strips 单写化**（退役可读投影、事件行为唯一面）—— 动保护门禁 pin 的容器，结构性，需单独立项。
4. **宿主时间序化**（`decision` / `l1-panels` / `strips` 并入时间序）—— 同上，结构性，需单独立项。

---

## 6. 附：本轮源改动清单

`src/ui/sidepanel/{recommend,sidepanel,view-model}.ts`、`src/ui/sidepanel/l0/shell.ts`、
`src/ui/sidepanel/l2/counts.ts`（注释 + 生产路径退出）、`src/ui/sidepanel/index.html`（kicker 初值）、
`src/tools/web-fetch-tool.ts`、`src/background/{service-worker,session-follow}.ts`；
测试与登记：`test/{recommendation-sources,size-baseline,size-budget,size-growth-evidence,size-ruling-vol3}.ts`、
`test/authorize-chip-wiring.test.ts`（新）、`test/ui/{l0,l2,l2-reverse,recommendation}.mjs`、
`docs/{v4-density-baseline,v4-supersession-ledger}.json`。
