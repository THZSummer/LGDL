# F-32 web-cli-plugin v5「All-in-Next 聊天即操作台」——全 Feature 总账（父收口）

> **Feature**: `.sddu/specs-tree-root/specs-tree-web-cli-plugin-v5-all-in-next/`（父 = 轻量规范容器）
> **收口轮次**: v5-all-in-next 父收口（整体收口，第 1 轮）
> **日期**: 2026-09-22 ｜ **授权**: 编排器代作者决策（作者已授权编排器代行决策、SDDU 全流程自行调度）｜ **代行**: sddu-build
> **分支 / HEAD**: `feature/web-cli-plugin` @ 父收口前 `d829fe6`（叶收口轮后 `80d34d5`；`main` = `2ddc922`，未动）
> **口径**: 本文件的数字**一律取自三叶 build/validate 产物**（不重跑门禁、不编造）；本轮为**纯文档/状态收口**，零 `src/`、零 `test/`、零三叶产物实义改动；抽查 3 个数字与源文件核对（见 §3 脚注）。

---

## 1. 一句话结论

**v5「All-in-Next」完成**：父 + 三叶全部收口，**三叶 phase 全部 `validated`**（`status=completed`），**主题达成 = `all-in-next` / `chat`（一切操作皆 next 流内闭环）**——① **法七无死端**：5 类阻塞终态在流内**必有可达 next**（死端 = 0 **机器化**门禁，含 S2 真机断流样板首验收）；② **法八值不入流**：流内 payload / digest / 审计 / DOM 四面**零明文**机核（掩码卡 + 值直达 key-store + `maskedLength` 只落**长度类别**）；③ **授权态 = 状态栏常显 chip 唯一载体**（黄「未授权 · 零注入」/ 绿「已授权 · supported」，点击即动作，全 UI 恰 1 处语义位）；④ **NextProvider 插件注册表**（契约 v2 七点）：新增 op **零改主流程**，`handleCardAction` per-op **diff = 0 门禁**（`deepseek-harness` 已核实同构）；⑤ **设置视图 = 管理面不变**（法则六），4 类操作收编为**单一执行体**（零双路径）。**九 op 流内闭环清单**：授权 / 重绑 / LLM 配置（含掩码 Key）/ 权限申请 / 撤销 / 拾取 / 描述 / 帮助 / 发回合。

**未闭合义务（不得伪称已确认）**：体积**档位显式升档 512,000 → 563,200**、**绝对上限 → 619,520**，`authorConfirmation.status` 仍为 **`pending-author-line`（待作者一行）**。**不合 main、不发布**（v1/v2/v3/v4/v4.5/v5 均在 `feature/web-cli-plugin`，合入/发布由作者决定）。

---

## 2. 交付了什么（面向使用者的五句话）

1. **9 op 流内闭环**（设计稿 8 + `op.turn`）：`op.authorize` / `op.rebind` / `op.llm-config`（掩码 Key）/ `op.perm.request`（浏览器权限申请）/ `op.revoke`（高风险确认 + 后果说明）/ `op.pick` / `op.describe` / `op.help` / `op.turn` —— 每个 op = `{opId, 风险级, params?, consent?, execute, receipt}` 五要素，走**唯一管线** `next chip →（params? 流内 ask 卡）→（同意? 流内 auth 卡）→ execute → 流内回执`；本地动作**零回合**（不受 `pending` 门控）。
2. **断流修复（真机 23:12 场景）**：非首装 / 未授权会话现在**有授权 next** —— `site.unauthorized` 常驻候选去 `firstRun`，✖ 阻塞行**出生即带恢复区**（`error` 仍 `BORN_FROZEN_KINDS`：恢复区是**出生铸造**的一部分，非事后改写）；**S2 全链（10 环节）机器化，死端 = 0**（headless 全链 + `test/ui/no-dead-end.mjs` 双向注入反证）。
3. **授权态 = 状态栏常显 chip 唯一载体**：黄 / 绿两态恒显其一（**零双写五条**：风险 rail 的 auth 类并入、工具栏与四区零第二投影、L2 站点行改**指针** `data-auth-pointer="#auth-state"`）；黄点击产 `op.authorize` next，绿点击展开管理详情（`op.revoke` / `op.rebind`）；密度 **6 ≤ 7** 不破。
4. **NextProvider 插件注册表（契约 v2 七点）**：R1 可逆注册 / R2 依赖声明式 / R3 优先级显式化 / R4 分发模式公开契约 / R5 失败语义三级 / R6 Seam 三件套 / R7 证明义务表；`chip data-op = opId`（`ACT_TO_OP` 6 行等价映射）；**新增 op = 注册插件，主流程 diff = 0**（`next-dispatch-diff0` 机核：集 B 零 per-op 分支 + 唯一分发入口 + 四操作源文件 sha256 不变）。
5. **设置视图 = 管理面（法则六不变）**：`authorize` / `revoke` / `rebind` / `llm-config` 4 类收编为 op **单一执行体**（同执行体、不同 consent 载体；零双路径 + 单一调用点机核）；其余设置操作不动。

---

## 3. 三叶一览表

| # | 叶子 Feature | 范围（一句话） | 关键产出 | 验证（实测） | 收口 commit |
|:-:|--------------|----------------|----------|--------------|-------------|
| 1 | `specs-tree-v5-1-next-registry-pipeline`（V5-1，22 任务 / 5 波） | NextProvider 注册表三件套 + op 统一管线四态 + `act→opId` + 瘦分发（diff = 0）+ 双契约（F 冻结 + G 127）+ 证明义务表机核 | `src/ui/sidepanel/next-registry/{definition,registry,providers,pipeline,dispatch,obligation-table}.ts` + `test/{next-registry,next-pipeline,next-dispatch-diff0,next-obligation-table,blocked-terminals}.test.ts` + `test/g-design-map.ts` + `design-contract` G 侧 | **✅ 通过（0 阻塞 / 4 本轮闭环 I-01·I-02·I-04·N-01 / 7 遗留 N-02~N-08）**；`next-registry` 16/0 · `next-pipeline` 20/0 · `next-dispatch-diff0` 14/0 · `next-obligation-table` 10/0 · `blocked-terminals` 8→9/0 · `design-contract` 6→19；红线 `content.js`/`pick-layer.js` 逐字节不变；**体积 498,521 → 507,315 B** | `8526ef8`（收口轮；N-02 注释订正 / N-01 复核 / N-03·N-06·N-07·N-08 登记 / N-04·N-05 owner=v5-2） |
| 2 | `specs-tree-v5-2-ops-first-batch`（V5-2，30 任务 / 7 波） | 9 op 五要素落地 + SW 双层执行器（特权恰 2）+ `op-*` type-only 消息族（content.js 零增长）+ 掩码 secret 卡 + 值直达 key-store + settings 4 类收编 + 拒绝非死端 + **S2 断流样板机器化首验收** | `src/ui/sidepanel/next-registry/{ops,op-bodies,op-executors,snapshot,providers}.ts` + `src/background/op-protocol.ts` + `test/{op-protocol,sw-op-mirror,op-wiring,s2-deadend-chain}.test.ts` + `test/ui/fixtures/s2-chain.mjs` | **✅ 通过（0 阻塞；review R1 3 阻塞全闭合）**；`npm test` 1172/0（`op-wiring` 7 · `sw-op-mirror` 5 · `s2-deadend-chain` 6）；`stream` 63→68 · `ask-auth` 61→71；`KIND_SET` 40 项逐字 / `content.js` 逐字节不变 / `manifest` 零 diff；**体积档位显式升档 512,000→563,200 + 绝对上限→619,520**；**含 1 次体积停机（R1）+ 首个 net-lowered 轮（收口 −86 B）** | `9b262ae`（收口轮；N-01 落地 → 542,150→542,064 B / N-04~N-09 + KL-N-10 登记） |
| 3 | `specs-tree-v5-3-chrome-face`（V5-3，24 任务 / 7 波，末叶 / 收口叶） | 授权 chip（状态栏常显两态 + 零双写 + 黄/绿点击）+ 可拖动宽度 280–640 + `data-narrow` + 密度口径与宽度解耦（X5）+ 死端守护门禁 + 法八四面零明文机核 + 三叶共享面收口 | `#auth-state` + `statusbar.ts` / `view-model.ts` / `risk-rail.ts` 载体重锚 + `cards/error.ts` 出生恢复区 + `test/ui/{law8-plaintext,no-dead-end,auth-chip}.mjs` + 体积五要素六文件同源 | **✅ 通过（0 阻塞 / 6 观察；review R1 1 阻塞全闭合）**；`law8` 25/0 · `dead-end` 39/0 · `auth-chip` 37/0 · `insight` 116→118 · `supersession` 35→36 · `gate-integrity` 14→15；对抗探针 **81/81**（V3 第 6 类 / V8 越限**如实判红**、还原判绿）；**体积 542,064 → 547,558 B** | `d829fe6`（validate 产物）→ `80d34d5`（收口轮 N-1~N-4） |

> **任务总量**：22 + 30 + 24 = **76 任务 / 19 波**（S×5 · M×45 · L×26）；叶间严格串行 `v5-1 → v5-2 → v5-3`（ADR-V5-012）；4 个 spikeGate（SG-1~SG-4）；每叶收尾**全门禁必须绿**。父 = 轻量规范容器（`phase=tasked` / `workflow=4.tasks` / `agent=sddu-tasks`，**不承接 build/review/validate、不产出 tasks.json**）。

> **抽查 3 个数字与源核对（本轮）**：① `npm test` **1181** ↔ 三叶产物（v5-1 `1130` → v5-2 `1172` → v5-3 validate-report §3.1 独立复跑 **1181**）**一致**；② `sidepanel.js` **547,558 B** ↔ 源 `packages/web-cli-plugin/test/size-baseline.ts:329 SIDEPANEL_BASELINE_BYTES = 547_558`（v5-3 review 修复轮五要素登记后值）**一致**（本轮 `git diff` 对 `test/**` 零改动，未移动该锚）；③ **档位 563,200 / 绝对上限 619,520** ↔ 源 `size-baseline.ts#SIDEPANEL_TIER_BYTES = ceilTo50KB(547,558) = 563,200` + `PENDING_ABSOLUTE_CAP.absoluteCeilingBytes = Math.round(SIDEPANEL_TIER_BYTES × ABSOLUTE_CAP_MARGIN(1.1)) = 619,520`（档位显式升档后派生；**历史闭合三值 465,000 / 512,000 / 563,200 逐字保留于 `V3_VOL3_*`，未被改写**）**一致**。

---

## 4. 门禁总账（末轮实测原文，计数只增不减）

| 门禁 | 末轮实测 | 备注 |
|------|:--:|------|
| `npm test`（node 全量） | **`1181 / 0`** | v5 起点 1045 → **1181**（**v5 段 +136**：1045 → v5-1 1130 → v5-2 1172 → v5-3 1181） |
| `test:law8`（**新**） | **25 / 0** | 法八四面零明文机核（流内 payload / digest / 审计 / DOM 属性 + 全属性扫描 + key 直写恰 1 点 + 四类注入反证） |
| `test:dead-end`（**新**） | **39 / 0** | 死端守护（5 类阻塞逐类 + 死端 = 0 + 双向注入反证 + S2 十环节全链主验收） |
| `test:auth-chip`（**新**） | **37 / 0** | 授权 chip 两态 / 零双写四词 / 语义位唯一 / 黄绿点击 / dot 解耦 |
| `op-wiring`（**新**，node） | **7 / 0** | 9 op 唯一调用点 + `requestTurn` 恰 2 处 + 本地 op 不受 `pending` 门控 + 3 条伪造反证 |
| `sw-op-mirror`（**新**，node） | **5 / 0** | SW 侧 op 注册表镜像 / 特权恰 2 / 「恰一处声明」/ 漂移反证 |
| `op-protocol`（**新**，node） | **6 / 0** | `KIND_SET` 逐字零新增（40 项）+ `content.js` pin + 零 import 边 + 反证 |
| `next-registry`（**新**，node） | **16 / 0** | 契约 v2 R1~R4（可逆注册 / 依赖声明式 / 优先级 / 分发模式公开契约） |
| `next-pipeline`（**新**，node） | **20 / 0** | 统一管线四态 + `askuser` 扩形 + 失败语义三级 |
| `next-dispatch-diff0`（**新**，node） | **14 / 0** | 集 B 零 per-op 分支 + 唯一分发入口 + 四操作源文件 sha256 不变 + 集 A/B 互斥 |
| `next-obligation-table`（**新**，node） | **10 / 0** | 证明义务表 9 行四要素 + 注册表 ↔ 义务表 + 无悬空 |
| `blocked-terminals`（**新**，node） | **9 / 0** | 阻塞态枚举单源 + `site.unauthorized` 去 `firstRun` + 阻塞类 ↔ P0 provider 单射 |
| `s2-deadend-chain`（**新**，node） | **6 / 0** | S2 全链样本（`s2-chain.mjs` 纯数据 + 注入式依赖）逐类修复 op 断言 + 同构 ctx 反证 |
| `test:stream` | **73 / 0** | 12 型卡 / 固化 / 回放 / 滚动（v5-2 `63 → 68`，v5-3 `68 → 73`） |
| `test:ask-auth` | **71 / 0** | 掩码 secret 卡 / form 扩形 / 两段握手 / 零明文（v5-2 `61 → 71`） |
| `test:insight` | **118 PASS** | L2 站点行授权态改**指针**（116 → 118，等价重锚，旧断言面零删除） |
| `test:l0` | **248 / 0** | 授权态载体下移后的等价重锚（244 → 248） |
| `test:density` | **242 / 0** | 密度口径与宽度解耦 + `v5Ledger` 31 格逐格留痕（登记格重锚，阈值逐字不动） |
| `test:ui`（journey） | **171 PASS** | 保护段**保段**（三值不变） |
| `test:binding` | **192 PASS** | 保护段保段（`be9ad0e9…` 逐字节不变；`#20e` 字节中立重锚） |
| `test:zero-injection` | **28 / 0** | 未授权站点零注入（27 → 28） |
| `test:supersession`（元台账） | **36 / 0** | v4 台账 `counts` 前移 + X1~X6 取代登记 + 保护段八步链（35 → 36） |
| `test:gate-integrity`（元门禁） | **15 / 0** | 受审集合只增（13 → 14 → 15）；父 Feature **8 新门禁逐项在册**用例；`CHROMIUM_GATES === 9` **未动** |
| `test:design-contract` | **19 / 0** | **双稿双 shim**：F 60 **冻结不替换** + G **127 新增**（`test/g-design-map.ts`）+ `designContractChanges` 五要素登记（6 → 19） |
| `test:size-ruling-vol3` | **12 / 0** | 体积三值同源 + `min()` 判定 + 披露算术机核 |
| `test:recommendation` | **65 / 0** | 真实产品路径（opId 双采集段；`59 → 65`） |
| `test:ref-pick-wiring` | **11 / 11** | 拾取单一入口 / 禁止产品直呼纯模型 API |
| `test:hardening` / `page-input` | **24 / 0** · **108 / 0** | 既有门禁，计数不减 |
| `test:l0`/`l1`/`l2`/`l1-reverse`/`l2-reverse` | **248 / 116 / 74 / 9 / 10** | 计数只增 |
| `npm run typecheck` / `npm run build` | **0 error / EXIT=0** | 体积见 §5 |
| `test:e2e` | **PASS** | fixture + LGDL Workbench 全链 |

**纪律**：门禁**严格串行**（一次一个 Chromium，`finally` 自清 profile）；日志 `tee` 全量落盘；计数**只增不减**、断言**零删除零降级**（本 Feature **未发生**保护段第三次取代 —— journey / binding 均**保段**，段外改写逐行入账）。

> **新门禁 11（父 Feature 级）**：`law8-plaintext` / `no-dead-end` / `auth-chip` / `op-wiring` / `sw-op-mirror` / `op-protocol` / `next-registry` / `next-pipeline` / `next-dispatch-diff0` / `next-obligation-table` / `blocked-terminals`；另 `s2-deadend-chain`（S2 链 node 判据）+ `test/g-design-map.ts`（G 契约映射数据面）+ `design-contract` **G 侧扩展**。其中 **8 个**入 `test/gate-integrity.test.ts#V5_NEW_GATE_FILES` **机核清单**（改名 / 删除即 FAIL）；`CHROMIUM_GATES === 9` 常量**未动**（只追加先例）。

---

## 5. 体积总账 + V3-VOL-3 档位升档

| 产物 | 末轮登记值 | v5 段变化 | 说明 |
|------|:--:|:--:|------|
| `dist/content.js` | **177,076 B** | **0（零容差，全程未动）** | sha256 `52a82620…` 逐字节不变；`op-*` 走 **type-only** 消息族（`KIND_SET` 40 项逐字不动 ⇒ 零余量红线守住） |
| `dist/pick-layer.js` | **33,900 B** | **0（零容差，全程未动）** | sha256 `5f567d7e…` 逐字节不变 |
| `dist/sidepanel.js` | **498,521 → 547,558 B** | **+49,037 B / +9.83%** | v5 段**显式五要素重登记 6 轮**（`v5-1-r2` / `v5-2-r2` / `v5-2-closeout`（−86 B，首个 net-lowered 轮） / `v5-3-r1` / `v5-3-r2` / `v5-3-reviewfix`），每轮均披露前后值 / 日期 / 来源 / 构建命令 / 理由 / 历史保留 + 逐模块 metafile 归因 |
| 档位 `tiers` | **512,000 → 563,200 B** | **显式升档（v5-2 R2）** | 越过 512,000 ⇒ 档位按 `ceilTo50KB` 显式上调（依据 FR-ALLN-130~134 / R-ALLN-001 / 编排器裁决①） |
| **绝对上限** `absoluteCeilingBytes` | **563,200 → 619,520 B** | **随档位派生** | `= 563,200 × 1.10` |
| 生效上限 | **574,935 B** | `floor(547,558 × 1.05)` | 容差 **5% 未动**；现余量 **27,377 B** |
| **`authorConfirmation`** | **`pending-author-line`（⏳ 待作者一行）** | — | **未伪称已确认**；作者一行可否决改值 |

**sidepanel 增长链（v5 段，逐轮实测）**：
`498,521`（v4.5 末）→ **507,315**（v5-1 R2，Δ +8,794）→ **518,329**（v5-2 R1，**体积停机上报点**）→ **518,543**（v5-2 R2 首轮登记）→ **535,821**（v5-2 R2 档位升档轮）→ **542,064**（v5-2 收口，**−86 B**）→ **545,273**（v5-3 R1）→ **546,370**（v5-3 R2）→ **547,558**（v5-3 review 修复轮）。

> **诚实登记（plan 预算显著低估）**：`ADR-V5-011` 的 **Σ 预算 17,600 B**（预留 7,326）vs **实测 +49,037 B ≈ 2.8×**；`ADR-V5-011 §1` 的 **v5-3 逐叶预算 3,250 B** 被 R1 用满（+3,209），R2 的 `maskedLength` 审计列（**估 +246 B，实测 +566 B 偏乐观**）+ `data-narrow` 使本叶合计 **+4,306 B** ⇒ **显式超出行预算**并**按三叶合计重登记**（未删格、未放宽容差、未下调档位、未伪称已确认）。**机制按设计工作**：v5-2 R1 越档位时 5 项体积门禁**如实判红**并**停机上报**（未静默重登记）。

### V3-VOL-3 档位升档（v5 承接的显式硬义务）

> v4（F-30）带值闭合：`B_final = 479,021 B` → 档位 `512,000` → 绝对上限 `563,200`（`resolved:true`，`resolvedOn` 2026-09-19）；**`authorConfirmation` 一直 `pending-author-line`**。

| 项 | 值 |
|---|---|
| **触发** | v5-2 R1 实测 `518,329 B` **越过 512,000 档位**（+6,329）⇒ 按 FR-ALLN-130~134 走**显式升档**（非静默） |
| 档位 `ceilTo50KB(B_final=518,543)` | **563,200 B**（原 512,000） |
| **绝对上限** | **619,520 B** = 563,200 × 1.10（原 563,200） |
| `newBaselineBytes` | 随现行基线**同源前移**（终值 **547,558 B**） |
| 生效上限 | `min(619,520, floor(547,558 × 1.05) = 574,935) = ` **574,935 B** |
| `SIDEPANEL_CEILING_CAP` | 保持 **`record-only`**（V3-VOL-1 ② 的「不设自缚装置」教训） |
| **`authorConfirmation`** | **`status: "pending-author-line"`（⏳ 待作者一行确认/否决）** —— **作者可一行否决改值**；本文件与台账**均未伪称已确认** |
| `ADR-V5-011` 口径订正 | review I-06 **已追加 v5.1 订正注**（正文不改写）：绝对上限为**档位派生**（`= 档位 × 1.10`），非「不变」；validate N-03 追加 **v5.2 时效注**（现行锚前移） |

> **给作者的一句话（显著提示）**：**体积档位已升 512,000 → 563,200、绝对上限 563,200 → 619,520**（`pending-author-line`，**作者一行可否决**）；当前产物 **547,558 B**，距档位余量 **15,642 B**、距绝对上限余量 **71,962 B**、距公式生效上限 **27,377 B**。

---

## 6. 取代台账 X1~X6（显式取代，判据等价重写，零静默删除）

| # | 取代（旧 → 新） | 判据等价重写 | 机核 |
|:-:|---|---|---|
| **X1** | `manifest.permissions` 禁新增 → **允许 `optional_permissions`**（安装期静态权限**不变**） | 首批 **0 项新增** + 机制预留；`capability-wiring` / `binding-wiring` 等价重锚 | 安装期静态面零漂移（`manifest.json` 零 diff） |
| **X2** | `PluginMessageKind` / `KIND_SET` 进 bundle（content.js 零余量）→ **`op-*` type-only 消息族** | `content.js` 逐字节零增长；`KIND_SET` 40 项逐字不动 | `op-protocol` OP-P ①/④ + `insight-protocol` 第五面 + 注入反证 |
| **X3** | `NEXTSTEP_ACTS` 6 项逐字闭集 + 手写 switch 16 分支 → **opId 注册表** | `ACT_TO_OP` 6 行等价映射（`next→op.turn` / `repick→op.pick` / `describe→op.describe` / `authorize→op.authorize` / `help→op.help` / `rebind→op.rebind`）；`recommendation-sources` 闭集→opId 集 + 源白名单 7 项零扩项 | `next-dispatch-diff0`（14/0）+ `recommendation-sources` / `local-act-wiring` / `authorize-chip-wiring` X3 对账表 |
| **X4** | G 稿 127 断言**不在任何门禁内**（契约真空）→ **G 入 design-contract** | 双稿双 shim：F 4 常量 + 60 行映射**逐字保留（纯追加）** + G 4 常量 + `G_ASSERTION_MAP` 127 行；**混池防御不依赖 id 集互斥**（`F ∩ G = 51` 非空 ⇒ 两侧独立计数 + 共享 helper 各调用一次） | `design-contract` 6 → 19（+`test/g-design-map.ts`）+ `designContractChanges` 五要素登记 |
| **X5** | 三档宽度（320 / 400 / 520）→ **连续可拖动 280–640** | 密度**登记格口径与宽度解耦**（登记格 = 控件计数；**320px 仍为验收锚点**，阈值逐字不动）；`data-narrow`（≤360）兜底 | `density` 242/0 + `v5Ledger` 31 格 + `test:supersession` X5 逐行五要素机核 |
| **X6** | chip `data-act`（动作字符串）→ **`data-op` = opId** | 旧 6 act 等价映射为渲染别名；判据等价重锚（旧断言面零删除，旧文本逐字留档） | `next-dispatch-diff0` 四操作源文件 sha256 不变 + 不得回读 `data-act` |

---

## 7. 过程中抓到的真问题（本流程的价值证明）

| # | 问题 | 级别 | 处置 |
|:-:|------|:--:|------|
| 1 | **非 chat 面载荷丢失 + 假成功**（v5-2 review R1 **BLOCK-01**）：`settings/ops.ts` 的 `op.llm-config` 执行体为**零参箭头**（表单值不传入）+ 调用处 `(run?.(ctx), OK)` **丢弃 `OpOutcome`** + `options.html` 未 `bindPanelOps` ⇒ 表单值**不落存储**却报成功 | **高（假成功）** | 修：执行体统一收编为 `settings/op-bodies.ts`（三面注入原子）+ `options.ts` 注入 `snapshotTables`/`restoreTables` + 失败路径落地；探针实证 |
| 2 | **失败零回滚 + 假回执**（v5-2 review R1 **BLOCK-02**）：`execute` / `execSw` 返回 `{ok:false}` 时管线仍 `settle('completed')` 并写**成功回执**（非抛错失败回滚 0 次）⇒ EC-ALLN-011 / NFR-ALLN-010 在生产路径**不可达** | **高** | 修：管线四态按 `ok` 结算 + 三表整体回滚（`snapshot.ts` 不 break/continue）+ 失败非死端（固化 + 可达 next）；短路回滚 / 恒 completed / 删恢复面 / 3 条布线伪造逐条可红 |
| 3 | **`perm.missing` 无事实源 + owner 悬空**（v5-2 review R1 **BLOCK-03**）：v5-1 §6-③ 的修复 provider owner 悬空；S2 样本 `perm.missing` 的 `ctx ≡ recoveredCtx()`（无权限事实源） | **高（首验收驱动失真）** | 修：`blockedStateCtx` 改为驱动各自事实（`risk ∋ llmBlocked` / `permBlocked`）+ **不再同构**；`s2-deadend-chain` 由「全局 ≥1 可达」下沉为**逐类修复 op 断言**（`EXPECTED_REPAIR` 5 行）+ 同构 ctx 反证 |
| 4 | **L2 树视图复制授权态**（v5-3 review R1 **BLOCK-01**）：`FR-ALLN-086⑤ / AC-ALLN-012 / ADR-V5-006 §2⑤`「L2 站点行指向 chip（不复制状态）」**未落地**（站点行仍渲染「已授权/未授权」徽标且被 `insight#I-20a` 钉死；静态 note 被 `replaceChildren()` 清除） | **高（唯一载体契约）** | 修：L2 站点行授权态改**指针**（`auth-pointer` + `data-auth-pointer="#auth-state"` + `ensureShell()` 运行期重建说明节点；行零状态值）+ `insight#I-20a1/#I-20a3` 等价重锚（116 → 118）+ **独立两段证伪**（回退徽标值 ⇒ `EXIT=1` / 逐字节还原 ⇒ `EXIT=0` 且产物 547,558 B） |
| 5 | **体积越档位停机**（v5-2 R1）：`sidepanel.js = 518,329 B`（Δ +11,014，超 R1 上限 512,865 = +5,464；越过 512,000 档位）⇒ 5 项体积门禁**如实判红，未静默重登记** | 中（**机制按设计工作**） | 处置：**停机上报 → 编排器裁决① → 档位显式升档 512,000→563,200 + 绝对上限→619,520 + 两轮五要素重登记**（518,543 → 535,821）；升档如实登记，**未以放宽换功能** |
| 6 | **验证面（价值证明）**：v5-1 ~ v5-3 各轮**自写对抗探针**与**双向反证** —— V3 第 6 类（无 provider 恢复面）注入**如实判红**、还原判绿；V8 体积**越限注入必 FAIL**、逐字节还原必 PASS；v5-3 validate **81/81 探针**（runtime 41 + static 40）；v5-2 **SW 伪造 7/7 拒** / 只读 probe / 三表整体回滚 `db==before`；S2 **死端 = 0** 双向反证 | — | 对抗优先，未采信 build/review 自报数值；`test:supersession` 注入 `binding.mjs@108000` 1 字节 ⇒ **29/6 红**（sha `1f527bbf`）→ 逐字节还原 **35/0 绿**（v4.5 先例）/ v5 段保护段**保段** |

---

## 8. deferred / 已知限制清单（逐条，如实登记，不冒充已修）

1. **`N-06`（安全小项）**：`op-executors.ts#execSwOp` 的 `op.perm.request` commit 分支**只校验 `permission` 字段存在性**（`permission:'ghost-cap'` ⇒ `ok:true`），而在册判据实际在页侧 `op-bodies.permRequest`（`op-protocol.ts` docstring 强于实现）。**低危**：SW 侧仅落审计（授予由 Chrome 手势决定），页侧在册判据真实生效。修复路径 = docstring 降级为「字段存在性（在册判据在页侧）」或把 `unregisteredCapabilityIds` 下沉至 SW。**owner = 安全小项 backlog**。
2. **`N-07`（安全小项）**：`service-worker.ts#onMessage` 对**任何** kind **无发送方校验** ⇒ `op-exec` 与既有 `authorize` 消息**同等可伪造**（与 review I-08 的如实降级一致，**非新增边界**）。强绑定方案 =「面板签发 nonce + SW 一次校验」。**owner = 安全小项 backlog**。
3. **`N-08`（第二手势入口）**：`src/ui/settings/panel.ts#requestCapability` 仍有自己的手势入口 `requestCapabilityPermissionOnGesture`（**pre-existing**，对 v5 leafBase 零 diff）。本叶统一登记（**复核零 diff，不伪称闭环**）。**owner = 后续波次**。
4. **`N-04`（口径项）**：`options.ts#bindPanelOps` 无 `snapshotTables`/`restoreTables` ⇒ options 面 `dispatchOp` 失败路径回滚为 **no-op**（空快照）；因四类执行体写入均**单 sink 原子**，**无半完成态**，故为口径项非缺陷。
5. **`N-05`（平台限制）**：`op-bodies.ts#revoke('permission')` 多能力撤销中途失败 ⇒ permission 表**只能 reconcile**（Chrome 仅手势可授）；validate 实测「仍持有」路径**如实失败**（`permission-still-held:*`），无假成功。
6. **`N-09`（口径）**：S2 样本恢复态 ⑩ 拍产出 `act=next`（→`op.turn`）chip 而非字面 `op.pick`；本叶消费并如实沿用（⑩ 判据 = 可行动 next ∧ opId 已注册）。
7. **会话 / 分组未收编 op（`PO-ALLN-001`）**：会话切换 / 分组 / tabs 设置 / 诊断 / 主题 / 告警**不收编**为首批 op（`DC-ALLN-001` / `NG-ALLN-011`），触发条件 = 作者后续提出「连会话切换也要在 chat 里闭环」。
8. **`O-` 系低危（v5-3 validate 观察项）**：`O-1` `counts` 滞后（validate 已前移）/ `O-2` `RISK_COPY.unauthorized` 口径护栏（以**类型位注释**落地，0 运行时字节）/ `O-3` `reanchorV5.previousExpectation` 叙述订正（只追加不改写历史）——均**已落地**；另存 6 项观察：N-1 产品侧无拖动手柄 / N-2 `binding` 环境 flake / N-3 settings 面解释性文案 / N-4 台账临时日志路径 / O-R2-1·O-R2-2（已闭环）。
9. **`KL-N-10`（环境性 flake）**：`test:binding` 串行链首轮偶发红且**每次失败项不同**（`binding.mjs` 对基线**零 diff**，隔离复跑即绿）。**纪律** = 串行 / 首轮异常隔离复跑 ≥2 / 日志全量 / 仍红如实记录不阻塞收口；建议加就绪等待或有界重试（本轮未做）。
10. **外部竞品调研未执行（`PO-ALLN-002`）**：登记「未执行，不阻塞」，**不编造结论**（`NG-ALLN-012`）。
11. **存储侧加密 / 生命周期 / 轮换（`PO-ALLN-003`）**：**out-of-scope**（只保证**流内零明文**）；`DC-ALLN-010` / `NG-ALLN-017`。
12. **未闭合义务**：`authorConfirmation.status = pending-author-line`（档位 563,200 / 绝对上限 619,520）—— **属未闭合义务，不是已完成项**（见 §5）。
13. **A2A（F-29）未立项未排期**：ROADMAP 相关区段**一字未动**（本轮 F-29 区段前后**字节相等**，已核验）。
14. **人工面未执行**：见 §9（**不得冒充 PASS**）。

---

## 9. 人工面清单（全部 `⏳ 未执行`，不冒充 PASS）

> **口径说明（如实）**：v5-3 叶 validate 报告把**产品侧「280–640 拖动手柄」登记为不适用**（产品侧无对应物，Chrome 控制侧栏宽度 ⇒ 承接 = `ResizeObserver` + `data-narrow`），并把 **9 项** `headless 不可合成` 的验收面登记为 `⏳ 未执行`。父 spec **AC-ALLN-024** 要求「人工面清单逐项标注未执行或 PASS，不得冒充 PASS」—— 本节按 Feature 的验收面**汇总为父级清单**，全部 `⏳ 未执行`（headless 不可合成真实手势 / 权限弹窗 / 人工观感），**未跑门禁的原因 = 本轮为纯文档/状态收口（零代码/测试改动）**。

| # | 人工面 | 说明 | 状态 |
|:-:|--------|------|:--:|
| 1 | 授权 chip 两态观感 | 黄「未授权 · 零注入」/ 绿「已授权 · supported」在真实侧栏的观感 + 点击即动作手感 | ⏳ 未执行 |
| 2 | 拖动宽度体感与性能 | 280–640 连续拖动的手感 / `clamp` / 双击复位 400 / rAF 流畅度；`data-narrow`（≤360）切换观感 | ⏳ 未执行 |
| 3 | 绿态管理详情手感 | 绿 chip 点击展开 `op.revoke` / `op.rebind` 的体感 + `aria-expanded` 读屏 | ⏳ 未执行 |
| 4 | 双主题（三主题） | `auto→light→dark` 三态下 chip / 掩码卡 / 恢复区观感与跟随系统 | ⏳ 未执行 |
| 5 | 320px 窄栏真实体感 | 真实侧栏拖到 320px：三区布局 / chip 不隐藏 / 卡内控件可点性 | ⏳ 未执行 |
| 6 | 键盘真实体感 | 真机 Tab 序 / `:focus-visible` / 分隔条 `←/→ ±10 · Home/End` / 固化后焦点落点 | ⏳ 未执行 |
| 7 | 读屏（掩码输入 + chip） | 掩码 secret 卡的读屏粒度 + chip 两态播报（`NFR-ALLN-008` 读屏子面） | ⏳ 未执行 |
| 8 | 浏览器原生权限弹窗体感 | `op.perm.request` 的真实权限弹窗（批准 / 拒绝双固化）+ 不可逆性说明可读性 | ⏳ 未执行 |
| 9 | 真机 S2 断流走查 | 作者 23:12 序列真机复走：✖ 行带授权 next → 点击 → 握手 → ✓ → 自动续流 | ⏳ 未执行 |

> **注**：产品侧无拖动手柄已由 §8 第 8 条如实登记（**不适用**，非「089 未实现」）；N-3 settings 面解释性文案 = 独立按需面预存在，不属人工面。

---

## 10. 建议的下一步

**A. 真机验收（最高优先，D 级亲验）**
1. **真机验收 S2 断流场景**（作者贴出的 23:12 序列）：现在应见 —— **✖ 行带授权 next → 点击 → 握手 → ✓ → 自动续流**（`test/ui/no-dead-end.mjs` 已机器化，但真机观感仍需人眼）。

**B. 作者一行决策（阻塞性最低、但必须由作者给出）**
2. **体积升档确认 / 否决**：档位 **563,200** / 绝对上限 **619,520** / 生效上限 **574,935**（现行产物 547,558 B）。`authorConfirmation.status` 仍 `pending-author-line`——**作者可一行否决改值**；确认后该义务才算真正闭合。
3. **合 main / 发布时机由作者决定**：v1（F-14）/ v2（F-27）/ v3（F-28）/ v4（F-30）/ v4.5（F-31）/ v5（F-32）**均在 `feature/web-cli-plugin`，未合 main、未发布**（`main` = `2ddc922` 未动）。ROADMAP 已按 **v0.10.0 双主题并列**登记（「AI 增强与生态」+ **F-32**），文档版本 `1.28.0 → 1.29.0`。

**C. 后续候选（非阻塞）**
4. **F-29（A2A 候选）**：未立项未排期，本轮一字未动；如要推进需作者立项。**v5.5 候选**（若作者提出）：会话 / 分组收编 op（`PO-ALLN-001`）· 安全小项 `N-06`/`N-07`（SW 发送方 / 能力在册校验强化）· `N-08` 第二手势入口统一 · 人工面 9 项真机走查。

---

## 11. G 稿还原度自评（对照 `option-g-all-in-next.html` + `option-g-shim.mjs` 127 断言）

> **口径**：G 稿 = 设计基准（273,621 B / 4,308 行 / sha `a7c0a77a…`）+ shim 127 断言（88,529 B / sha `d0107ecb…`）；F 稿 = 60 断言**冻结**（`design-contract` 冻结中，本轮**未静默替换**）。

| 维度（G 稿契约） | 还原度 | 证据 |
|---|---|---|
| **法七 · 死端 = 0（机器化）** | ✅ **达成且机器化** | `test/ui/no-dead-end.mjs` 39/0（5 类阻塞逐类 `deadEnd=false` + **第 6 类无 provider 恢复面注入如实判红** + 还原绿 + **S2 十环节全链**）；`test/s2-deadend-chain.test.ts` 6/0（逐类修复 op）；`blocked-terminals` 9/0（阻塞态单源 + `site.unauthorized` 去 `firstRun`） |
| **法八 · 值不入流（四面零明文）** | ✅ **达成且四面机核** | `test/ui/law8-plaintext.mjs` 25/0：面① 流内 payload / 面② digest（`••••••` 掩码）/ 面③ 审计（`maskedLength` **类别** ∈ {`8+`,`8-`}，**原始长度不落单元格 / 不近掩码事实文案**）/ 面④ DOM value + 全属性；**key 直写 sink 恰 1 处**（`keyStore.save(` = 1）+ 四类注入反证 |
| **chip = 授权态唯一载体** | ✅ **达成且全 UI 机核** | `test/ui/auth-chip.mjs` 37/0：语义位 `[data-auth]` 全 UI **恰 1 处**（= `#auth-state`）+ 四区四词零命中 + L2 站点行**指针**（`data-auth-pointer="#auth-state"`、行零状态值、指针说明**计算可见**）+ 黄/绿点击 + 密度 **6 ≤ 7** |
| **插件化 · `handleCardAction` per-op diff = 0** | ✅ **达成且 diff = 0 机核** | `test/next-dispatch-diff0.test.ts` 14/0：集 B **零 per-op 分支** + 唯一分发入口 + `ACT_TO_OP` 单源 + **四操作源文件 sha256 不变** + 集 A/B 互斥 + 不得回读 `data-act`；G 127 断言入 `design-contract`（`G_ASSERTION_MAP`）且 `F ∩ G = 51` **不依赖 id 集互斥** |
| **G 稿 127 断言入册** | ✅ **达成** | `test/design-contract.test.ts` 19/0（F 60 冻结**不替换** + G 127 新增）+ `designContractChanges` 五要素登记（`test/g-design-map.ts`） |
| **剩余面（人工观感）** | ⏳ **待真机** | 见 §9 九项（headless 不可合成）；产品侧无 280–640 拖动手柄（承接 = `ResizeObserver` + `data-narrow`，**不伪称 089 已实现**） |

**还原度结论**：G 稿的四条**机器可核判据**（法七死端 = 0 / 法八四面零明文 / chip 唯一载体 / 插件化 diff = 0）**全部达成且可 FAIL 反证**（注入必红、还原必绿）；剩**人工观感**（九项 `⏳`）未执行，**不冒充 PASS**。

---

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建（v5-alin-next 父收口 R1）：三叶 validated 汇总 + 主题达成结论（法七死端=0 / 法八四面零明文 / chip 唯一载体 / 插件化 diff=0）+ 数字总账（npm 1045→1181 · 新门禁 11 · sidepanel 498,521→547,558 · 档位 512,000→563,200 + 绝对上限→619,520 + pending-author-line）+ X1~X6 取代台账 + 过程真问题 6 条（v5-2 review 3 阻塞 / v5-3 review 1 阻塞 / v5-2 R1 体积停机）+ deferred/已知限制 14 条 + 人工面 9 项 ⏳ + 建议下一步 + G 稿还原度自评 | 2026-09-22 | SDDU Build Agent |
