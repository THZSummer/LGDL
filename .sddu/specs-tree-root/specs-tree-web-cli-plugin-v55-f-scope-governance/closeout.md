# F-34 web-cli-plugin v5.5.1「范围治理：引用即范围」——全 Feature 总账（父收口）

> **Feature**: `.sddu/specs-tree-root/specs-tree-web-cli-plugin-v55-f-scope-governance/`（父 = 轻量规范容器）
> **收口轮次**: v55-f-scope-governance 父收口（整体收口，第 1 轮）
> **日期**: 2026-09-24 ｜ **授权**: 编排器代作者决策（作者已授权编排器代行决策、SDDU 全流程自行调度）｜ **代行**: sddu-build
> **分支 / HEAD**: `feature/web-cli-plugin` @ 父收口前 `c0506ed`（叶收口轮后提交）；`main` = `2ddc922`，**未动**
> **口径**: 本文件的数字**一律取自两叶 build/validate 产物**（不重跑门禁、不编造）；本轮为**纯文档/状态收口**，零 `src/`、零 `test/`、零两叶产物实义改动；抽查与源核对（见 §3 脚注）。

---

## 1. 一句话结论

**v5.5.1「范围治理：引用即范围」完成**：父 + 两叶全部收口，**两叶 phase 全部 `validated`**（`status=completed`），**主题达成 = 把「用户已经用『引用』指出的范围」从产品语言兑现为模型可见事实 + 可判读数**——① **引用事实进回合**（`chat` type-only 载荷 7 字段 + 唯一构建点 + SW 系统段「基座 + 每回合追加段」；`requestTurn(` 仍**恰 2**；零引用回合**逐字等于基座**）；② **范围法则双轨**（**机制范围读数四值** = 唯一判据（**法九**机核）+ 提示词 = 引导）；③ **`--ref <n>` 锚定**（plugin 侧包装，**base 零 diff**；单节点保证；失配 / 失效 **fail-closed 非静默**）；④ **任务级批量授权**（写入计划 → **计划指纹** → **一次真实用户手势** → 计划外**逐条回落** → 特权 op **恒不入批** → 零明文 → 中途可中止 → WIDEN 二择）；⑤ **S0′（`ty.md` 原案重放）双面机器化**（node + Chromium；**改写处数 ≤ 引用数**机核；双向反证）。**母缺陷现场「42 处 `set-text` 全页改写 + 42 张同文案授权卡」被收为可机核样板。**

**未闭合义务（不得伪称已确认）**：体积 `authorConfirmation.status` 仍为 **`pending-author-line`（待作者一行）**——**承接 v5.5 两次升档的历史确认事项**（`512,000→563,200 / →619,520`；`563,200→614,400 / →675,840`）；**本 Feature 段无新增升档**（未跨档位、未触 EC-SGO-022 三分支）。**不合 main、不发布**（v1/v2/v3/v4/v4.5/v5/v5.5/v5.5.1 均在 `feature/web-cli-plugin`，合入/发布由作者决定）。

---

## 2. 交付了什么（面向使用者的五句话）

1. **引用不再是「产品语言」**：把 chip 文案（「用引用 1 做原地翻译」）兑现为**模型可见事实** —— 回合载荷携带 `refNum` / `refId` / `selector` / `refMark`（`data-wcli-ref` 值）/ `textDigest`（页面文本摘要 ≤80 字）/ `refState` / `nodeCount` 的 **type-only 结构化引用表**（`KIND_SET` **40 逐字不动**；`refs` 不是新 kind），**两条回合入口共用同一构建点**（驱动者自动成回合 + 手动回合同口径）。
2. **「引用即范围」成为机制可判事实**：**范围读数四值单源**（`in-scope` / `out-of-scope-authorized` / `out-of-scope-unauthorized` / `no-ref`）+ **唯一判定函数**（第二声明 ⇒ FAIL）；**立法「法九」**（`test/law9-scope-reading.test.ts`；双向反证 + 注入必红 + 三段控制 `ok`/`violated`/`n/a` 禁恒真 + 真源切片，**判据不读提示词**）；提示词只承担**引导**。
3. **写动作可按引用锚定**：`dom set-text --ref <n>` ⇒ `[data-wcli-ref="ref_n"]`（**plugin 侧条目包装**，`packages/web-cli-base/**` **零 diff**、`risk` / `subcommandRisks` **逐字段 spread 自 base**、**永不放宽**）；**单节点保证**（`nodeCount === 1` 才通过）+ **失配 / 失效 fail-closed 且非静默**（`ANCHOR_ERRORS` 七条可读 + 可达 next；绝不回退 `--selector`、绝不按首元素）；先落**写命令**，读命令登记后续裁决（PD-SGO-001）。
4. **授权从「连点」回到「判断」**：AI 先出**写入计划**（哪里 / 原文 → 译文）⇒ **一次真实用户手势**覆盖**计划指纹**（目标集合 ∧ 动作类型 ∧ 文本对，**逐字节入哈希、不归一化**）⇒ 计划外第 N+1 条**逐条回落**、批准前**漂移显式失败**、中途可**中止**（部分完成如实交代）、**特权 op 恒不入批**；批量卡**复用既有 `auth` kind**（零新增 kind / 12 kind / 零宿主）。
5. **安全边界三项不退化**：**红线⑥**（`consent` 不得被 AI 代答 / 代填 / 自动展开）**扩覆盖批量**（`RL-06` / OT-⑩ / `law8` 三类「**扩覆盖非替换**」）；**法八零明文**（批量计划行仅 `textContent` + 凭据形掩码；审计 / 留痕只记指纹摘要 + 条目数 + 手势 + 结果计数）；**扩大范围走正向路径**（写前 `ask-user` 二择「仅引用范围内 / 整页」，用户确认 = **可判事实**入留痕，拒绝 / 取消 ⇒ **零死端**）。

---

## 3. 两叶一览表

| # | 叶子 Feature | 范围（一句话） | 关键产出 | 验证（实测） | 收口 commit |
|:-:|--------------|----------------|----------|--------------|-------------|
| 1 | `specs-tree-v55f-1-ref-context-and-anchor`（V5.5F-1，29 任务 / 4 波，首叶 / 底座叶） | 范围底座：引用事实进回合（type-only 载荷 + 唯一构建点 + 系统段基座/追加段）+ 范围读数单源（法九）+ `--ref <n>` 锚定（plugin 侧包装 + 单节点闸 + 失配 EC 家族）+ 留痕扩字段 + S0′ 全链机器化（含双向反证）+ X-SGO-1/2/3/5 等价重锚 | `src/ui/sidepanel/l1/ref-scope.ts` + `src/background/{ref-turn,ref-context,ref-observe}.ts` + `src/tools/dom-anchor.ts` + `test/{ref-context-in-turn,law9-scope-reading,dom-ref-anchor}.test.ts` + `test/ui/fixtures/s0-chain.mjs` | **✅ 通过（R1：0 BLOCK / 2 I → `6b9b982` 微修闭环 / 6 O）**；`ref-context-in-turn` 9/0 · `law9-scope-reading` 12/0 · `dom-ref-anchor` 7/0 · `s0-self-driven-chain` 15 → **24/0** · Chromium `s0-self-driven` 59 → **65/0**（`S0P-C1~C5`）；`npm test` **1330 → 1375/0**；**体积 578,623 → 585,732 B**（+7,109，预算内）；**SG-SGO-01/02/03 全可行（9/9 · 11/11 · 3/3）** | `6b9b982`（validate；收口轮 N-01~N-11） |
| 2 | `specs-tree-v55f-2-batch-consent`（V5.5F-2，16 任务 / 3 波，末叶 / 承载唯一红线级风险 R-SGO-001） | 任务级批量授权：写入计划 + 计划指纹 + 一次真实手势 + 计划外逐条回落 + 零明文 + 中途可中止 + 特权不入批 + WIDEN 二择 + S0′ 批量段双面 | `src/background/batch-plan.ts` + `src/security/confirm.ts`（计划感知桥） + `src/ui/sidepanel/cards/auth.ts`（计划行） + `test/batch-consent.test.ts` + `s0-chain.mjs`（批量段） | **✅ 通过（R1：0 BLOCK / 4 I → `c0bac99` 微修闭环 / 5 O）**；`batch-consent` 7/0 · `law9-scope-reading` 12 → **14/0** · `supersession` 39 → **42/0** · `law8` 46 → **52/0** · `dead-end` 49 → **53/0** · `s0-self-driven-chain` 24 → **27/0**（`S0P-B1~B3`）· Chromium `s0-self-driven` 65 → **70/0**（`S0C-11`·`S0P-C6`）；`npm test` **1375 → 1394/0**；**体积 585,732 → 591,946 B**（+6,214；越预算基线上界、未越 +15% 上界 ⇒ 显式登记）；X-SGO-4 已发生 | `c0bac99`（validate；收口轮 N-01~N-10） |

> **任务总量**：29 + 16 = **45 任务 / 7 波**；叶间严格串行 `v55f-1 → v55f-2`（v55f-2 **硬依赖**叶1 的范围读数与锚定解析底座）；**3 个 spikeGate**（SG-SGO-01 / 02 / 03，plan 未命名、按编排器任务书登记为 tasks 阶段新增先验闸门）**全可行**；每叶收尾**全门禁必须绿**。父 = 轻量规范容器（`phase=tasked` / `workflow=4.tasks` / `agent=sddu-tasks`，**不承接 build/review/validate**，产出总览型 `tasks.md`/`tasks.json`）。母体口径：**88 FR / 14 NFR / 22 EC / 22 NG / 10 US / 8 G / 26 AC / 9 DC**；8 ADR（ADR-SGO-001~008）；PD-SGO-001~007 全部裁决。

> **抽查数字与源核对（本轮）**：① `npm test` **1394** ↔ 两叶产物（叶1 `1375` → 叶2 validate-report §3.3 独立复跑 **1394/0**）**一致**；② `dist/sidepanel.js` **591,946 B** ↔ 源 `packages/web-cli-plugin/test/size-baseline.ts` 五要素终值（叶2 build §9.3 / `v55f2R1R2Rows`，`authorConfirmation = pending-author-line`）**一致**（本轮 `git diff` 对 `packages/**` 零改动，未移动该锚）；③ **档位 614,400 / 绝对上限 675,840 / 生效上限 621,543** ↔ 叶2 build §9.3 + `test/size-ruling-vol3`（同源）**一致**（历史两次升档值 `563,200→614,400`、`619,520→675,840` 与 `pending-author-line` 逐字保留，未被改写）。

---

## 4. 门禁总账（末轮实测原文，计数只增不减）

| 门禁 | 末轮实测 | 备注 |
|------|:--:|------|
| `npm test`（node 全量） | **`1394 / 0`** | F-34 起点 **1330** → **1394**（**F-34 段 +64**：1330 → 叶1 1375 → 叶2 1394） |
| `ref-context-in-turn`（**新 1**，node） | **9 / 0** | 载荷 type-only 单声明 7 字段 / `KIND_SET` 40 / 唯一构建点 + 两入口 + `requestTurn(` 恰 2 / 基座 5 条逐字 + 追加段 / 零引用字段缺席 / 凭据掩码 / SW 唯一来源 |
| `law9-scope-reading`（**新 2**，node） | **14 / 0** | 法九：四值唯一声明 + `no-ref` + 两路 `in-scope` + 越界二态 + 生产写闸切片 + 三段控制 `ok`/`violated`/`n/a` + 真源切片（不读 `SYSTEM_PROMPT`）+ 双向反证族；叶2 扩 `L9-9`（扩围转值单源 + AI 零写入面 + 注入必红）12 → 14 |
| `dom-ref-anchor`（**新 3**，node） | **7 / 0** | `--ref` 解析链逐级 fail-closed / 单节点闸唯一通过 / `risk` 逐字段对照 base（降档注入必红）/ schema 只增 `ref` / 锚定通过交基线 executor（失配不调用）/ base 零 diff + 同源单实现 |
| `batch-consent`（**新 4**，node） | **7 / 0** | BC-1~7：计划构建（范围外不入 / 三分支）/ 指纹逐字节（归一化反证）/ 准入 + 计划外回落 / 批准前漂移 / 特权不入批 / 零明文（四面临界 + 掩码）/ 中止 + 部分完成如实 |
| `s0-self-driven-chain`（node S0′ 面） | **27 / 0** | 叶1 `S0P-1~8`（→ 24/0：S0P-4「改写处数 ≤ 引用数」/ S0P-7 双向反证 + sha256 还原）+ 叶2 `S0P-B1~B3`（→ 27/0：一次手势覆盖计划内全部 + 计划外回落 + 二择 + 中止可判；正读 + 5 反证） |
| `s0-self-driven`（Chromium S0′ 面） | **70 / 0** | 叶1 `S0P-C1~C5`（真面板载荷含引用事实 / 系统段基座 + 追加段 / 合成锚真 DOM 恰 1 命中 ∧ 注入 ⇒ 2 / 范围留痕独立成行 / 样本单源）→ 65；叶2 `S0C-11`·`S0P-C6`（单卡 N 行 ∧ 一次手势 `batch.gesture=user ∧ batch.results=N/N` ∧ 二择走既有 `askuser`）→ 70 |
| `test:supersession`（元台账） | **42 / 0** | **红线终核**（content / pick-layer / sidepanel / `KIND_SET` 40 / 特权恒 gesture / consent 不代答 / `requestTurn(` 恰 2 / 法八 / 零宿主 / 判定链 9 项 / manifest / `pending-author-line`）；两叶 `X-SGO` 台账 + `modifiedRanges` 落账（37 → 39 → 42） |
| `test:gate-integrity`（元门禁） | **22 / 0** | 受审集合只增（19 → 20 → 22）；`V55F1_NODE_GATE_FILES ≥3` ∧ `V55F2_NODE_GATE_FILES` 在册；`CHROMIUM_GATES === 9` **逐字不动** |
| `test:law8` | **52 / 0** | 法八四面零明文（36 → 46 → 52）；叶1 ⑧ 引用注入面（越界写请求不回显 / 留痕零值 / 掩码单点）；叶2 ⑨ 批量计划零明文（`plan` 与 `payload` 同级、不入 `DIGEST_FIELDS`；注入 ⇒ 命中非恒真）；**36 段零降级** |
| `test:dead-end` | **53 / 0** | 死端守护（49 → 53）；`ND-10`：WIDEN 拒绝 ⇒ fail-closed ∧ 零死端（无阻塞载体 / 无开口 ask）；未确认扩围 ⇒ 不得放行 |
| `test:ui`（journey） | **171 PASS** | 保护段 `43054..58287`（sha `cc79f413…`）**保段** |
| `test:binding` | **192 PASS** | 保护段 `107780..115930`（sha `be9ad0e9…`）**保段**；**环境性 flake 家族**（见 §7） |
| `test:stream` · `test:ask-auth` · `test:insight` · `test:recommendation` · `test:page-input` | **76 / 78 / 118 / 72 / 125** | 计数只增（F-33 基线 76 / 78 / 118 / 72 / 118；page-input 118 → 125） |
| `test:density` · `test:l0` · `test:l1` · `test:l2` | **242 / 248 / 131 / 74** | 只增（l1 120 → 131） |
| `test:auth-chip` · `test:zero-injection` · `test:hardening` | **37 / 28 / 24** | 只增 |
| `test:op-three-tier` · `test:capability-wiring` · `test:host-registry` · `test:op-wiring` · `test:insight-no-escalation` | **11 / 11 / 11 / 14 / 20** | 只增（OT-⑩ 扩批量 / 特权不入批 / 零宿主 / OP-W ⑨ 复合读数 / base 零 diff + 不动面） |
| `test:design-contract` · `test:size-ruling-vol3` · `test:ref-pick-wiring` · `test:l1-ref-validity` | **19 / 12 / 11 / 21** | 数值重 pin + 双稿双 shim + X-SGO-5 等价重锚 |
| `test:l1-reverse` · `test:l2-reverse` | **9 / 10** | 反向证明套件（l2-reverse 需独立会话，见 §8） |
| `npm run typecheck` / `npm run build` / `test:e2e` | **0 error / EXIT=0 / PASS** | fixture + LGDL Workbench 全链 |

**纪律**：门禁**严格串行**（一次一个 Chromium，`finally` 自清 profile）；日志 `tee` 全量落盘（`/tmp/opencode/v4-gate-logs/v55f-*/`）；计数**只增不减**、断言**零删除零降级**（本 Feature **未发生**保护段第三次取代 —— journey / binding 均**保段**）。

> **新门禁 4（父 Feature 级）**：`ref-context-in-turn` / `law9-scope-reading` / `dom-ref-anchor` / `batch-consent`（**4 枚 node**，逐叶纳入 `EXPECTED_AUDITED_FILES`，改名 / 删除即 FAIL）；`CHROMIUM_GATES === 9` **未动**（只追加先例，零新增 Chromium 门禁文件）。另升级既有门禁 **12 项**（`supersession` 37→42 · `gate-integrity` 19→22 · `law8` 36→52 · `dead-end` 49→53 · `insight-no-escalation` 17→20 · `op-wiring` 13→14 · `l1` 116→131 · `page-input` 118→125 · `s0-self-driven-chain` 15→27 · `op-three-tier` →11 · `capability-wiring` →11 · `host-registry` →11；另 `size-*` 四件套 / `design-contract` / `l1-ref-validity` / `ref-wiring` / `r6-ty-experience-fix` 数值重 pin 或切片前移）。

---

## 5. 体积总账 + 未升档 + 作者行确认

| 产物 | 末轮登记值 | F-34 段变化 | 说明 |
|------|:--:|:--:|------|
| `dist/content.js` | **177,076 B** | **0（零容差，全程未动）** | sha256 `52a82620…` 逐字节不变（引用载荷 / 锚定 / 批量均走 **type-only** 或面板侧） |
| `dist/pick-layer.js` | **34,358 B** | **0（零容差，全程未动）** | sha256 `77796bab…` 逐字节不变 |
| `dist/sidepanel.js` | **578,623 → 591,946 B** | **+13,323 B（≈ 13.0 KiB）** | 逐叶五要素重登记（叶1 `v55f-1-r2` / 叶2 `v55f-2-r2`），每轮均披露前后值 / 日期 / 来源 / 构建命令 / 理由 / 历史保留 + 逐模块 metafile 归因 |
| **档位 `tiers`** | **614,400 B** | **未动（本 Feature 段无升档）** | 未跨档位（591,946 < 614,400，余量 **22,454 B**） |
| **绝对上限** `absoluteCeilingBytes` | **675,840 B** | **未动** | `= 614,400 × 1.10` |
| 生效上限 | **621,543 B** | `floor(591,946 × 1.05)` | 容差 **5% 未动**；现余量 **29,597 B**（距生效上限） |
| **`authorConfirmation`** | **`pending-author-line`（⏳ 待作者一行）** | — | **未伪称已确认**；承接 v5.5 两次升档的历史确认事项（见下），作者一行可否决改值 |

**sidepanel 增长链（F-34 段，逐叶实测）**：
`578,623`（F-34 起点）→ **585,732**（叶1 收口，Δ +7,109 ≈ 6.94 KiB）→ **591,946**（叶2 收口，Δ +6,214 ≈ 6.07 KiB）= **+13,323 B ≈ 13.0 KiB**。

**逐叶预算结算（诚实登记）**：

| 叶 | 叶预算 | 叶上界 | 实测 | 超预算 | 超上界 | 处置 |
|---|--:|--:|--:|--:|--:|---|
| v55f-1 | 6.0 KB | 10.35 KB（+15%） | **+7,109 B ≈ 6.94 KiB** | 未越 | 未越 | 登记（预算内） |
| v55f-2 | 3.5 KB | 6.3 KB（+15%） | **+6,214 B ≈ 6.07 KiB** | **+2,414 B**（越基线上界 5.5 KB） | 未越（< 6,325 B） | **显式诚实登记**（不删判据 / 不放宽容差） |
| **合计** | 9.5 KB | 16.7 KB | **+13,323 B ≈ 13.0 KiB** | — | — | 落在父 `plan.md` §8 正常口径 **9.5~14.5 KB** 内 ⇒ **不触发升档** |

### 体积档位（作者行确认事项 —— 显著提示，承接 v5.5 两次升档）

| # | 触发轮 | 档位 | 绝对上限 | 生效上限 | 依据 |
|:-:|--------|------|---------|---------|------|
| 1 | **v5-2 R1（F-32，2026-09-22）** | `512,000 → 563,200` | `→ 619,520` | `floor(547,558×1.05) = 574,935` | F-32 父收口 §5（越档位停机 → 编排器裁决① → 显式升档） |
| 2 | **v55-2 小修轮（F-33，2026-09-23）** | `563,200 → 614,400` | `619,520 → 675,840` | `floor(573,424×1.05) = 602,095` | ADR-V55-011 §4（`ceilTo50KB(563,780) = 614,400 > 563,200`；「谁先越谁登记」） |
| — | **F-34（本 Feature，2026-09-24）** | **未动** | **未动** | `floor(591,946×1.05) = 621,543` | 未跨档位、未触 EC-SGO-022 三分支 ⇒ **无新增升档** |

> **给作者的一句话（显著提示，累计清单）**：**体积档位已两次升档**（累计 `512,000 → 614,400`、绝对上限 `563,200 → 675,840`）——**均由 v5.5（F-33）及更早轮次触发，本 Feature（F-34）未新增升档**。现行产物 **591,946 B**，距档位余量 **22,454 B**、距绝对上限余量 **83,894 B**、距公式生效上限余量 **29,597 B**。**`authorConfirmation.status` 仍为 `pending-author-line`（⏳ 待作者一行确认 / 否决）** —— 本文件与各叶台账**均未伪称已确认**；作者一行可否决改值。F-34 段的 `pending-author-line` 为**承接历史确认事项**（非本 Feature 新增未闭合义务）。

---

## 6. 取代台账 X-SGO-1~7（两叶逐项终态，显式取代，判据等价重写，零静默删除）

> **来源**：`docs/v4-supersession-ledger.json#xSgoLedger`（叶1 段）+ `#xSgoLedgerLeaf2`（叶2 段）+ `#redlineRemap`（叶2 红线扩覆盖）；`test:supersession` **42/0**。
> **终态口径**：**5 已发生（X-SGO-1/2/3/4/5）+ 2 未发生（X-SGO-6/7）** —— 叶1 台账曾以「4 superseded（1/2/3/5）+ 3 no-supersession（4/6/7）」登记（X-SGO-4 属叶2，**如实登记「未发生」**）；**叶2 X-SGO-4 落地后**收为 5/2。

| id | 终态 | owner（落地叶） | 可机核证据 |
|:-:|---|---|---|
| **X-SGO-1** | superseded | 叶1 | `ref-context-in-turn#RCT-1/2`（载荷由「恰 1 字段 `{user}`」→「允许携带引用上下文」；type-only 单声明 ⇒ 运行时零字节，SG-SGO-01 esbuild Δ=0 B；`refs` 非 kind，`KIND_SET` 仍 40；零引用 ⇒ 字段缺席） |
| **X-SGO-2** | superseded | 叶1 | `ref-context-in-turn#RCT-3/4`（系统段由「静态常量」→「常量基座 + 每回合追加段」；基座 5 条逐字；无引用 ⇒ `system === SYSTEM_PROMPT` 逐字；`chat-runner.ts` 零改） |
| **X-SGO-3** | superseded | 叶1 | `dom-ref-anchor#DRA-3/6` + `insight-no-escalation`（base `dom` 零 `--ref` → plugin 侧条目包装；`risk` / `subcommandRisks` 逐字段 spread 自 base，注入降档必红；base 零 diff） |
| **X-SGO-4** | **superseded（叶2 落地）** | **叶2** | `batch-consent#BC-1~7` + `supersession`（`RL-06` 扩批量变体注入必红，原判据不改）+ `op-three-tier`（OT-⑩ 扩批量，`tierOf` 逐 op 不变）（逐条写入授权 → 任务级批量授权；`redlineRemap[]` 三条「扩覆盖非替换」） |
| **X-SGO-5** | superseded | 叶1 | `l1-ref-validity`（deny 方向逐字不动）+ `law9-scope-reading`（四值单源 + 双向反证）（引用判定「只回答可不可用」→「增设作为范围锚的解析读数」；`valid/invalid/unknown` deny 方向零触碰） |
| **X-SGO-6** | **未发生（以读数承载、词汇未扩张）** | 叶1 / 叶2 | `driver-terminals`（终态词汇唯一声明 ∧ 第二声明即红）+ `law7x-ext`：`STREAM_TERMINALS` 6 / `DRIVER_TERMINALS` 4 / `BLOCKED_TERMINALS` **零改**；范围读数走既有 `notice` / 系统行渲染面；扩围二择走**既有** `askuser`（零新卡类型 / 宿主） |
| **X-SGO-7** | **未发生（主流程 diff = 0）** | 叶1 / 叶2 | `op-wiring`（`requestTurn(` 仍**恰 2** ∧ `maybeRecommend` 1/7 ∧ `nextAfterSettle` 1/10 ∧ `OP-W ⑨`）+ `capability-wiring`（SW 永不 `.request(` 计数不减 ∧ 批量路径不触达特权 op） |

> **`knownGap` 一致性**：`protectedSupersession.status === 'complete-steps-1-8'` ∧ `knownGap` 为**闭环声明（残余：无）**；由 `protectedSupersessionConflicts` 机核（矛盾即 FAIL）✅。**保护段 journey / binding 均「保段」**（SG-SGO 段 sha 双命中 + 两文件 `git diff` 零命中 ⇒ **未发生第三次八步取代**）。

---

## 7. 过程中抓到的真问题（本流程的价值证明）

| # | 问题 | 级别 | 处置 |
|:-:|------|:--:|------|
| 1 | **两轮 pin 红延至收口轮闭环的设计权衡**：两叶 R1 均**只测不登记**体积 ⇒ 体积/红线 pin 门禁**如实判红**（叶1 R1 7 红 / 叶2 R1 6 红），逐叶重登记排在该叶 **R2（收口轮）**；R2 以「登记基线 == 实测产物」+ 真实 metafile 逐模块归因一次闭环 | 中（**机制按设计工作**） | 处置：**未以放宽容差 / 删判据 / 静默降档**实现闭环；逐条归因（叶1 §5.2 七条 / 叶2 §9.2 六项）＋五要素重登记；validate 亲跑复核「登记 == 实测」 |
| 2 | **叶2 越预算基线上界（未越 +15% 上界）**：v55f-2 A 列实测 **+6,214 B** > 预算基线上界 5.5 KB，但 < +15% 上界 6.3 KB；两叶 Σ **13.0 KiB** 在正常口径 9.5~14.5 KB 内 | 中（**显式诚实登记**） | 处置：按 ADR-SGO-007「**登记不停机**」；未跨档位、`pending-author-line` 保持；根因 = 面板侧改动比估量更大（`sidepanel.ts +2,829` / `cards/auth.ts +2,113`）如实登记 |
| 3 | **环境性 flake 家族（KL-N-10）**：叶1 `test:page-input` 首跑 `Cannot access contents of the page`（`/tmp` 累积 **572** 个陈旧 fixture 目录 2.3 GB、tmpfs 79%）· `test:binding` 首跑 `CDP socket not open` · `test:ask-auth` 首两跑启动期失败（**795** 个陈旧 Chromium profile、tmpfs 80%）；叶2 `test:binding` 首跑 `#confirm-allow` selector not found + CDP socket 早断 | 低（**已证环境性**） | 处置：`page-input` / `binding` / `ask-auth` **均不在任何叶变更面**（`git diff` 零命中）；清理陈旧 `/tmp/web-cli-*` 后**隔离复跑全绿**（125/0 · 192/0 · 78/0）；保护段由 `supersession` 42/0 + 保护段 sha 双命中**独立机核**；纪律 = 串行 / 首轮异常隔离复跑 ≥2 / 日志全量 / **仍红如实记录不阻塞**；**不伪称首跑绿** |
| 4 | **红线⑥ 扩覆盖批量（R-SGO-001，唯一红线级风险）承重**：批量授权不得成为「AI 代答 consent」的合法外衣；`out-of-scope-authorized` 唯一写入面 = 用户点击 | **高** | 处置：叶2 亲注入 **5 处**（AI 侧 `markApproved(` / `op.authorize` 入计划模块 / `planEntryKey` 归一化 / `admitEntry` 计划外放行 / 去 WIDEN「整页」点击守卫）全部「红 ⇒ 逐字节还原 ⇒ sha 相同 ⇒ 复绿」；`scopeWidenAuthorized = true` 全仓**恰 1 处** ∧ 真实点击值守卫；AI/SW 侧零写入面（`L9-9` 反向扫描） |
| 5 | **验证面（价值证明）**：两叶 validate **对抗优先**，未采信 build/review 自报数值 | — | 处置：叶1 自研 5 探针（法九 13/13 · `--ref` 16/16 · refs e2e 12/12 · S0′ node 14/14 · 红线/体积 20/20）+ 2 处源码注入逐字节还原（法九真源改判 ⇒ 4 红 / 删单节点闸 ⇒ 2 红）；叶2 自研 3 探针（桥行为 16/16 · 扩围 10/10 · 红线/体积 16/16）+ 3 处源码注入逐字节还原；`test:supersession` 保护段 **保段**（未发生第三次取代） |

---

## 8. deferred / 已知限制清单（逐条，如实登记，不冒充已修）

1. **读命令 `--ref` 扩展**（`read-element` / `structure`）：本阶段只落写命令 `set-text`；读命令登记后续裁决（**PD-SGO-001** / 父 `NG-SGO-010`）。**owner = 父收口 deferred**。
2. **每回合重观测**：会引入每回合一次页面探测（性能 + token 成本）；本阶段用**回合已有的引用事实**（**PD-SGO-002**）。**owner = 父收口 deferred**。
3. **引用表字段扩展**：是否扩 `semanticPath` / `origin` / `navSeq`（**PD-SGO-003**）。**owner = 父收口 deferred**。
4. **范围读数是否入流内可见面**（**PD-SGO-004**）。**owner = 父收口 deferred**。
5. **批量计划生成路径 / 计划指纹文本对比较口径 / 批量卡条目上限展示策略**（**PD-SGO-005/006/007**；当前 = 系统聚合 / 逐字节不归一化 / 8 行上限 + 诚实计数行）。**owner = 父收口 deferred**。
6. **`BATCH_REJECTED_TEXT` / `BATCH_DRIFT_TEXT` 未上屏**（叶2 N-04）：deny 面仅通用理由（fallback 面已由 I-02 微修上屏）；`EC-SGO-014`「显式失败」由 `deny` 满足（非静默放行）。**owner = 父收口 deferred**（可读性余项）。
7. **fallback 经 `confirm.ts` 桥的端到端用例缺位**（叶2 N-05）：`BC-3` 只直测 `admitEntry`；桥侧由 Chromium `S0P-C6` 间接覆盖（validate V5 探针 4/4 实测行为）。**owner = 父收口 deferred**。
8. **`BULK_CONSENT_AI_MODULES` 列表式判据**（叶2 N-03）：新增 AI 模块不会自动纳入；由「`markApproved/markRejected` 全仓唯一调用点为 `confirm.ts`」的结构事实兜底。**owner = 父收口登记**。
9. **`messaging.ts` 在 `zeroDiffFiles` 名单内却被改**（叶1 N-02）：该 pin 机核为 `git status --porcelain`（工作树 vs HEAD），对**已提交**改动不可见 ⇒ 语义弱于哈希 pin；系 v3 台账既有口径。**owner = 父收口登记**（建议归入 `unfrozenZeroDiffFiles` 或澄清语义）。
10. **`counts.supersession.currentRuntime` 登记滞后**（叶1 N-04）：registry 为防退化**下界**（floor 不动、只增不减）⇒ 属滞后而非失实。**owner = 父收口登记**。
11. **`sidepanel.js` 红线口径 = 字节数**（非 sha；内嵌 `BUILD_STAMP` ⇒ 跨重建不可复现）；`content.js` / `pick-layer.js` 的 sha 跨重建稳定。**owner = 父收口登记**。
12. **工具口径**：validate 脚本目录采用编排器指定固定目录（`/tmp/opencode/v4-gate-logs/v55f-*`）而非模板默认时间戳目录（前例一致）。**owner = 父收口登记**。
13. **`test:l2-reverse` 需独立会话（>570 s）**：历史反向证明套件（逐条注入 → 复跑 → 逐字节还原）；本 Feature 变更面零命中；`l1-reverse` 9/9 已亲跑作为反向证明代表。**owner = 父收口登记**。
14. **X 台账 `newTitle` 全体等价重锚**（叶1 N-10）：逐叶体积重登记改写 `size-*.ts` 数值后，历史 `newTitle` 不再可定位 ⇒ 按既有纪律重锚到当前文本（判据结构零删减）。**owner = 父收口登记**（登记行为，非放宽）。
15. **未闭合义务**：`authorConfirmation.status = pending-author-line`（档位 614,400 / 绝对上限 675,840）—— **承接 v5.5 两次升档的历史确认事项，属未闭合义务，不是已完成项**（见 §5）。
16. **F-29（A2A）未立项未排期**：ROADMAP 相关区段**一字未动**（本轮 F-29 区段前后**字节相等**，sha `0a46b55e…`，已核验）。
17. **人工面未执行**：见 §9（**不得冒充 PASS**）。

---

## 9. 两叶移交项汇总（owner = 父收口全清单 + 人工面清单 ⏳）

> **口径**：本表汇总两叶收口段中 **owner = 父收口 / 人工面** 的全部条目（叶1 `N-01~N-11` / 叶2 `N-01~N-10`），**去除同源重复**（flake 家族归并为 1 条）。**owner = 本叶/后续叶已闭环**的条目不在下表（已在各叶收口段逐条登记）。

### 9.1 owner = 父收口（登记 / 口径类，全清单）

| 来源 | 编号 | 内容摘要 | 父收口处置 |
|---|:--:|---|---|
| 叶1 | N-02 | `messaging.ts` 在 `zeroDiffFiles` 内却被改（type-only） | 登记口径（§8 第 9 条） |
| 叶1 | N-03 | `state.json#files` 路径数组，无 `files.review` 键 | 父收口核对（`artifacts` 已含 `review` / `reviewReport` 键） |
| 叶1 | N-04 | `counts.supersession.currentRuntime` = 36 滞后（实测 39） | 登记下界语义（§8 第 10 条） |
| 叶1 | N-05 | `S0P-C2` 两面分工（真产物字节切片 vs node 生产模块） | 登记两面分工（不用机核冒充真机） |
| 叶1 | N-06 | `S0P-C1` 真面板 `refNum=2`（canonical=1） | 登记（不伪称 refNum=1） |
| 叶1 | N-07 · 叶2 N-07 | **环境性 flake 家族**（page-input / binding / ask-auth） | **并入 §7 第 3 条 1 条**（不重复计项；保段凭据 = `supersession` 42/0 + 保护段 sha 双命中） |
| 叶1 | N-08 · 叶2 N-08 | 脚本目录用编排器指定固定目录 | 登记（前例一致） |
| 叶1 | N-09 | X-SGO-5 落点（下界常量与注释逐字未动，计数只增） | 登记为等价重锚落点 |
| 叶1 | N-10 | X 台账 `newTitle` 全体等价重锚 | 登记为**登记行为、非放宽**（§8 第 14 条） |
| 叶2 | N-02 | `plan.md` §5 文件影响清单为「≈11 项」估算 | 登记估算口径（实产以叶2 §12 为准） |
| 叶2 | N-03 | `BULK_CONSENT_AI_MODULES` 列表式判据 | 登记完备性边界（§8 第 8 条） |
| 叶2 | N-04 | `BATCH_REJECTED_TEXT` / `BATCH_DRIFT_TEXT` 未上屏 | 并入 §8 deferred（可读性余项） |
| 叶2 | N-05 | fallback 桥端到端用例缺位 | 并入 §8 deferred |
| 叶2 | N-06 | 体积单位口径混用（十进制 KB vs KiB） | 登记（父总账统一 B + KiB 双列） |
| 叶2 | N-09 | 桥层「指纹漂移」不可直接触达 = **安全兜底** | 登记（非缺陷；validate V3 探针实测） |

### 9.2 人工面清单（全部 `⏳ 未执行`，不冒充 PASS）

| # | 人工面 | 说明 | 状态 |
|:-:|--------|------|:--:|
| 1 | **M1 · S0′ 语义遵从观感**（叶1） | 「原地」这类指称的语义遵从观感（真机） | ⏳ 未执行 |
| 2 | **M4 · SPA 锚定失败提示可理解度**（叶1） | `data-wcli-ref` 失效 / 失配时提示的真实可理解度 | ⏳ 未执行 |
| 3 | **M2 · 42 连点疲劳体感**（叶2） | 本 Feature 直接对标 `ty.md` 42 张卡的根因场景（真机手感） | ⏳ 未执行 |
| 4 | **M3 · 批量计划卡真机可读性与可否决性**（叶2） | 计划清单（哪里 / 原文 → 译文）的可读性与写前否决手感 | ⏳ 未执行 |

> **注**：headless 不可合成（真实手势 / 指称语义 / 人工观感）；本轮为**纯文档 / 状态收口（零代码 / 测试改动）**，未跑门禁 / 构建 / Chromium。人工面逐项标注 `⏳`，**不得冒充 PASS**（父 `AC-SGO-026`）。v5 / v5.5 人工面清单**零改写、并列不覆盖**。

---

## 10. 建议的下一步

**A. 真机验收（最高优先，D 级亲验）**
1. **真机验收 S0′（本 Feature 的首验收锚，`ty.md` 原案重放）**：
   - **拾取引用 ① → 答「原地翻译为中文」**：应见 —— 回合载荷**携带引用事实** ⇒ AI 读到的范围是**引用目标** ⇒ **改写处数 ≤ 引用数**（只改那一处），**不再出现 42 处全页改写**；
   - **确需整页时**：AI 应**先问**「仅引用范围内 / 整页」⇒ 用户选「整页」⇒ `out-of-scope-authorized` 入留痕 + 继续；选「仅引用范围内」/ 取消 ⇒ fail-closed ∧ **零死端**；
   - **批量写入**：应见**一份计划**（哪里 / 原文 → 译文）⇒ **一次手势**覆盖整批 ⇒ 计划外额外写入**仍需逐条批准**；中途可**中止**（部分完成如实交代）；**特权 op 永远要手势**（不受批量影响）。

**B. 作者一行决策（阻塞性最低、但必须由作者给出）**
2. **体积档位历史确认 / 否决**（承接 v5.5）：档位 **614,400**（累计 `512,000 → 614,400`）/ 绝对上限 **675,840**（累计 `563,200 → 675,840`）/ 生效上限 **621,543**（现行产物 591,946 B）；本 Feature **未新增升档**。`authorConfirmation.status` 仍 `pending-author-line` —— **作者可一行否决改值**；确认后该义务才算真正闭合。
3. **合 main / 发布时机由作者决定**：v1（F-14）/ v2（F-27）/ v3（F-28）/ v4（F-30）/ v4.5（F-31）/ v5（F-32）/ v5.5（F-33）/ **v5.5.1（F-34）** 均在 `feature/web-cli-plugin`，**未合 main、未发布**（`main` = `2ddc922` 未动）。ROADMAP 已按 **v0.11.1 patch 主题**登记（`范围治理：引用即范围`），文档版本 `1.30.0 → 1.31.0`。

**C. 后续候选（非阻塞）**
4. **F-29（A2A 候选）**：未立项未排期，本轮一字未动；如要推进需作者立项。
5. **v5.6 / 后续候选**（若作者提出）：读命令 `--ref` 扩展（PD-SGO-001）· 每回合重观测（PD-SGO-002）· 引用表字段扩展（PD-SGO-003）· 范围读数可视面（PD-SGO-004）· 批量文案上屏 / fallback 桥用例（叶2 N-04/N-05）· 环境性 flake 治理（KL-N-10 家族）· 人工面真机走查。

---

## 11. 主题达成自评（对照 `ty.md` 真机两点）

> **口径**：主题 = 编排指示 2026-09-23（P1 引用事实进回合 / P1′ 范围法则 / P3 工具面 ref 锚定 / P2 任务级批量授权）+ 真机 `ty.md`（1963 行；**第一证据，本轮入库、零改写**）——**P1 范围失控**（用户拾取引用 ① → 答「原地翻译为中文」→ AI 把「原地」理解为**整页**就地替换 → **42 处 `set-text` 全页改写**）+ **P2 审批疲劳**（**42 张**同文案授权卡逐条点击）。**两条均有可机核证据**；**R6 `74d76c1` 已修 P3/P4/P5（答案 once 语义 / 输入排队统一 / 完成后同动作去重 + 引用改写重评），本 Feature 不重复立项（NG-SGO-001）**。

| 维度（主题） | 达成度 | 证据 |
|---|---|---|
| **引用事实进回合（P1 根因 A/B/E）** | ✅ **达成且机器化** | `ref-context-in-turn` **9/0**（type-only 7 字段单声明 / `KIND_SET` 40 逐字 / **唯一构建点 + 两入口 + `requestTurn(` 恰 2** / 基座 5 条逐字 + 追加段 / 零引用字段缺席 / 掩码 / SW 唯一来源）；`S0P-C1` 真面板载荷含引用事实；`requestTurn(` 计数由 `op-wiring` 承重（注入第三调用点 ⇒ 必红） |
| **范围读数（法九，P1′ 机制侧）** | ✅ **达成且机核** | `law9-scope-reading` **14/0**：四值（`in-scope` / `out-of-scope-authorized` / `out-of-scope-unauthorized` / `no-ref`）**唯一声明**（`src/**` 第二声明 ⇒ FAIL）+ 唯一判定；`no-ref ≠ in-scope`；`authorized` = **纯输入事实**（AI 不得自判）；三段控制 `ok`/`violated`/`n/a` 互异且 `n/a` 单独计数；**真源切片不读 `SYSTEM_PROMPT`**；**亲注入真源改判 ⇒ 4 红 ⇒ 逐字节还原 ⇒ 复绿**（判据非恒真） |
| **范围法则双轨（P1′ 载体）** | ✅ **达成** | **机制读数 = 判据**（`ref-scope.ts` 四值单源，**不读提示词**）+ **提示词 = 引导**（`REF_SCOPE_GUIDANCE`，不参与判据）；纯提示词方案（NG-SGO-016）**未采纳** |
| **工具面 `--ref` 锚定（P3）** | ✅ **达成且安全** | `dom-ref-anchor` **7/0**：`--ref n` ⇒ `[data-wcli-ref="ref_n"]`（合成锚单源）；**单节点闸**（`nodeCount === 1` 才通过；多命中显式报告节点数）；失配 / 失效 **fail-closed 非静默**（绝不回退 `--selector`、绝不按首元素；基线 executor **不被调用**）；`risk` / `subcommandRisks` 逐字段对照 base（降档注入必红）；**base 零 diff**（`insight-no-escalation` 20/0）；**删 live 单节点闸 ⇒ DRA-2/DRA-5 红**（闸承重） |
| **任务级批量授权（P2 根因 G）** | ✅ **达成且安全边界承重** | `batch-consent` **7/0**：计划 = 单条 assistant 消息的 in-scope `set-text`（**与真实写入同源**）；**指纹含文本对、逐字节不归一化**（尾随空格 ⇒ 回落；亲注入归一化 ⇒ BC-2 红）；**一次真实手势**（审批状态唯一写入点 = `confirm.ts` 的 `planGate.markApproved/markRejected`，`await opts.ask` 之后）；**计划外逐条回落**（亲注入改 `admitted` ⇒ BC-3 红）；**特权 op 恒不入批**（亲注入 `op.authorize` ⇒ `capability-wiring` 红）；漂移显式失败；中止 + 部分完成如实 |
| **审批疲劳对照（42 卡 → 1 卡）** | ✅ **达成且机核** | 一次手势承载**整批**（`ty.md` **42 调用 / 42 卡 / 42 批准 / ≈3 分 45 秒** → **一张计划卡 + 一次手势**）；`S0P-C6` 真面板：一条 `confirm-request{plan}` ⇒ 单张 `auth` 卡承载 N 行（仅 `textContent`）∧ 一次手势 ⇒ `batch.gesture=user ∧ batch.results=N/N` |
| **零新增载体（G-SGO-007）** | ✅ **达成且 diff = 0 机核** | `KIND_SET` **40 逐字** ∧ `CARD_TYPES` **12** ∧ `REGISTERED_STRUCTURAL_HOSTS === []` ∧ `MAX_OPEN_ASKS = 2` ∧ `ASK_CANCEL_REASONS` 4 ∧ `requestTurn(` **恰 2**；批量卡**复用 `auth` kind**；扩围二择**复用 `askuser`** |
| **S0′ 双面机器化（G-SGO-006）** | ✅ **达成** | node `s0-self-driven-chain` **27/0** + Chromium `s0-self-driven` **70/0**；**核心断言「改写处数 ≤ 引用数（除非用户批准扩大）」**（S0P-4 注入 `extraWrites` 2>1 ⇒ 必红）；**双向反证「去注入 ⇒ 读数为空 / `no-ref` ⇒ 必红」**（S0P-7；伪造 `in-scope` 亦必红）；样本单源（node 与 Chromium 同一份 `s0-chain.mjs`） |
| **安全边界（红线⑥ + 法八 + 扩大范围正向路径）** | ✅ **达成且四项亲核** | 红线⑥ **扩覆盖批量**（`RL-06` / OT-⑩ / `law8` 三类「扩覆盖非替换」）；法八四面零明文（`law8` **52/0**，**36 段零降级**）；扩大范围走 `ask-user` 二择 + 真实点击守卫（`scopeWidenAuthorized = true` 全仓恰 1 处）；`content.js` / `pick-layer.js` **全程逐字节未动**；判定链 `zeroDiffFiles` 9 项零 diff |
| **剩余面（人工观感）** | ⏳ **待真机** | 见 §9.2（headless 不可合成）；**不冒充 PASS** |

**达成结论**：编排指示（P1 引用事实进回合 / P1′ 范围法则双轨 / P3 `--ref` 锚定 / P2 任务级批量授权）与 `ty.md` 真机两点（范围失控 / 审批疲劳）**全部达成且可 FAIL 反证**（注入必红、还原必绿）；剩**人工观感**未执行，**不冒充 PASS**。

---

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建（v55-f-scope-governance 父收口 R1）：两叶 validated 汇总 + 主题达成结论（引用事实进回合 / 范围法则双轨（法九）/ `--ref` 锚定（base 零 diff）/ 任务级批量授权（红线⑥ 扩覆盖批量）/ S0′ 双面）+ 数字总账（npm 1330→1394 · F-34 段 +64 · sidepanel 578,623→591,946 · +13,323 · 新门禁 4 + 升级 12）+ **无升档未触 EC + `pending-author-line` 承接 v5.5 两次升档** + X-SGO-1~7 两叶终态（5 已发生 / 2 未发生）+ 过程真问题 5 条 + deferred/已知限制 17 条 + 两叶移交项汇总（owner=父收口 全清单 + 人工面清单 ⏳ M1~M4）+ 建议下一步 + 主题达成自评 | 2026-09-24 | SDDU Build Agent |
