# F-33 web-cli-plugin v5.5「self / ai-driven：让助手像助手」——全 Feature 总账（父收口）

> **Feature**: `.sddu/specs-tree-root/specs-tree-web-cli-plugin-v55-self-driven/`（父 = 轻量规范容器）
> **收口轮次**: v55-self-driven 父收口（整体收口，第 1 轮）
> **日期**: 2026-09-23 ｜ **授权**: 编排器代作者决策（作者已授权编排器代行决策、SDDU 全流程自行调度）｜ **代行**: sddu-build
> **分支 / HEAD**: `feature/web-cli-plugin` @ 父收口前 `456458f`（叶收口轮后提交）；`main` = `2ddc922`，**未动**
> **口径**: 本文件的数字**一律取自三叶 build/validate 产物**（不重跑门禁、不编造）；本轮为**纯文档/状态收口**，零 `src/`、零 `test/`、零三叶产物实义改动；抽查 3 个数字与源文件核对（见 §3 脚注）。

---

## 1. 一句话结论

**v5.5「self / ai-driven：让助手像助手」完成**：父 + 三叶全部收口，**三叶 phase 全部 `validated`**（`status=completed`），**主题达成 = 把「下一步由谁按」从用户侧转移到系统 / AI 侧**——① **未配置 LLM ⇒ 系统代码流程驱动配置 + 配置完成自动续接悬置任务**（确定性、零 LLM 调用、同输入同路径；S0 分支 B 双面必判项）；② **已配置 LLM ⇒ AI 零按键启动整个 chat/next**（答案产生驱动 ⇒ 经**既有 `op.turn` 槽**成回合 ⇒ 思考 / 命令 ⇒ 续流；S0 分支 A 端到端）；③ **法七扩展**（已答 ask 三型 + 已交描述入终态词汇，与 `STREAM_TERMINALS` **正交**，「必有下一个驱动者」三段控制机核）；④ **op 三档清分**（`auto 5 / confirm 2 / gesture 2`；特权 op 恒 `gesture`；新 op 必须归档机核；AI 不得降档）；⑤ **护栏三件套六常量单源**（打扰控制 / token 预算 / 防环；越限真抑制 + 可关断 + 主题① 不受总控）。**母理念「主动帮用户，而不是被动接受任务」落为可机核的管线常驻保证。**

**未闭合义务（不得伪称已确认）**：体积**两次升档**——v5-2（F-32）`512,000 → 563,200` / 绝对上限 `→ 619,520`；v55-2 修复轮 `563,200 → 614,400` / `619,520 → 675,840`；现产物 `573,424 B` / 生效上限 **602,095 B**，`authorConfirmation.status` 仍为 **`pending-author-line`（待作者一行）**。**不合 main、不发布**（v1/v2/v3/v4/v4.5/v5/v5.5 均在 `feature/web-cli-plugin`，合入/发布由作者决定）。

---

## 2. 交付了什么（面向使用者的五句话）

1. **驱动者层（drive ownership）**：把「用户已表达意图」的每个时刻之后的**接管者**注册表化——驱动者 = `drivers.ts` 声明表 + provider（集合 **≡** 双向包含机核 · 四元组 `driverId`/`timing`/`evidence`/`ops` · `driverClass` 单源）；**时机源闭集 4 → 5**（`+'answered'`）；**主流程 diff = 0**（`requestTurn(` 仍恰 2 / `nextAfterSettle(` 调用点钉死 10 / 集 B per-op 分支 0）。
2. **主题① 确定性系统流**：未配置 LLM ⇒ `runChat` 前置配置判据（**先于** `providerChat`，落 SW bundle ⇒ 面板零字节）+ **4 步确定性引导**（步骤单源 / 零 LLM 调用）+ **掩码卡复用** + **配置完成自动续接悬置任务**（悬置单源 `MAX=1` + 失效重校验 + 空悬置非死端）；**首装 / 已装未配两场景** + **取消非死端** + **不跳走**。
3. **主题② AI 驱动编排**：已配置 ⇒ 答案后**零按键**自动成回合（`pressCandidate` 经**既有 `op.turn` 槽**，**零新增 `requestTurn` 调用点**）⇒ 思考 / 命令 ⇒ 续流；AI 主动留痕三要素（`driver`/`timing`/`evidence`，**零明文**）+ 候选恒由注册表产出 + 失败非死端；**用户否决权 + 总开关**（关断 ⇒ AI 主动零发起，**主题① 不受该开关控制**）。
4. **安全边界（R-SELF-001，最高危）**：**特权 op 恒 `gesture`**（恰 2）· **`consent` 不得代答** · **`auto` 档零三表写入** · **判定链零触碰**（`zeroDiffFiles` 9 项零 diff）—— 四项逐叶 / 逐步亲核，未退化。
5. **并发仲裁 + 载体零新增**：`chatBusy` 单飞 ⇒ **可判仲裁**（SW 有界队列 `TURN_QUEUE_MAX = 1` + 溢出**明确拒绝** + 面板**草稿回填**；用户输入**永不静默丢失** + 留痕可判 + 有界）；**12 kind / `KIND_SET` 40 逐字 / 零固定宿主**（`REGISTERED_STRUCTURAL_HOSTS = []`）；`content.js` 与 `pick-layer.js` **全程逐字节未动**。

---

## 3. 三叶一览表

| # | 叶子 Feature | 范围（一句话） | 关键产出 | 验证（实测） | 收口 commit |
|:-:|--------------|----------------|----------|--------------|-------------|
| 1 | `specs-tree-v55-1-driver-layer`（V5.5-1，25 任务 / 4 波，首叶 / 底座叶） | 驱动者注册表化 + 时机源扩张（`+'answered'`）+ 驱动者终态词汇（法七扩展）+ 答案驱动化（`applyRefAction` / `submitDescribe` / 迟到后台 ask）+ 死端守护门禁扩张 + S0 全链机器化（骨架 + 分支 A 机制侧 + 分支 B 识别侧） | `src/ui/sidepanel/next-registry/{drivers,terminals}.ts` + `test/{driver-timings,driver-quadruple,driver-terminals,s0-self-driven-chain,law7x-ext}.test.ts` + `test/ui/s0-self-driven.mjs` + `test/ui/fixtures/s0-chain.mjs` | **✅ 通过（R1：2 BLOCK / 3 I → R2 全闭环；红线 12/12）**；`driver-timings` 11/0 · `driver-quadruple` 14/0 · `driver-terminals` 8/0 · `s0-self-driven-chain` 8/0 · `law7x-ext` 5/0 · `no-dead-end` **39 → 49/0** · `law8` 25 → 33/0 · `s0-self-driven` Chromium **24/0**；`npm test` **1186 → 1246/0**；**体积 549,609 → 557,883 B**；SG-V55-01/02 可行 | `e76f13f`（validate；收口轮 N-01~N-10） |
| 2 | `specs-tree-v55-2-deterministic-onboarding`（V5.5-2，16 任务 / 5 波，次叶） | 主题① 确定性系统流：`runChat` 前置配置判据（先于 `providerChat`）+ `llm.unconfigured` 双源并存 + 4 步确定性引导流 + 配置完成自动续接悬置 + 首装 / 已装未配两场景 + 取消非死端 + S0 分支 B 必判项 | `src/ui/sidepanel/next-registry/{onboarding-flow,suspension}.ts` + `src/llm/status.ts` + `test/onboarding-deterministic.test.ts`(29) + `s0-self-driven` ⑰ `S0C-7` | **✅ 通过（R1：0 BLOCK / 4 I → 小修轮全闭环）**；`onboarding-deterministic` 29/0 · `s0-self-driven-chain` 11/0 · Chromium `s0-self-driven` **42/0** · `s0-self-driven` ⑰ 真产品路径（未配置 ⇒ detect ⇒ guide ⇒ 掩码卡 ⇒ 完成 ⇒ **自动续接**）；`npm test` **1246 → 1283/0**；**体积 557,883 → 563,780 B**；**越档位 ⇒ 显式升档 563,200 → 614,400 / 619,520 → 675,840** | `b2b7dcd`（validate；收口轮 N-01~N-10） |
| 3 | `specs-tree-v55-3-ai-driven-orchestration`（V5.5-3，20 任务 / 5 波，末叶 / 收口叶） | 主题② AI 驱动编排 + 治理收口：op 三档清分（`tierOf` 派生式 + 归档机核）+ `ai-drive.ts`（`pressCandidate` 经既有 `op.turn` 槽）+ SW 有界仲裁 + 面板草稿回填 + 护栏六常量单源 + 越限真抑制 + 关断偏好 + AI 主动留痕 + 三叶共享面收口 | `src/background/turn-queue.ts` + `src/ui/sidepanel/next-registry/{guard,ai-drive}.ts` + `test/{op-three-tier,proactivity-guard,turn-arbitration}.test.ts` + `s0-self-driven` §⑱ | **✅ 通过（R1：0 BLOCK / 2 I → `fdcbae8` 微修闭环 / 8 O）**；`op-three-tier` 10/0 · `proactivity-guard` 7/0 · `turn-arbitration` 6/0 · `s0-self-driven-chain` **15/0** · Chromium `s0-self-driven` **45 → 59/0**（**S0-A 零按键**：作答后 `[data-op]` 点击 = 0 ∧ 恰 1 条 chat 原文 ∧ 三要素独立成行 ∧ `command` ∧ `done`）；`npm test` **1283 → 1319/0**；**体积 563,780 → 573,424 B**（**未跨档位**）；SG-V55-03/04/05 全可行 | `456458f`（validate；收口轮 v1.4 §17~§22） |

> **任务总量**：25 + 16 + 20 = **61 任务 / 14 波**；叶间严格串行 `v55-1 → v55-2 → v55-3`（ADR-V55-012）；**5 个 spikeGate**（SG-V55-01~05）；每叶收尾**全门禁必须绿**。父 = 轻量规范容器（`phase=tasked` / `workflow=4.tasks` / `agent=sddu-tasks`，**不承接 build/review/validate**，产出总览型 `tasks.md`/`tasks.json`）。母体口径：**95 FR / 14 NFR / 22 EC / 22 NG / 10 US / 8 G / 26 AC / 7 DC**；12 ADR（ADR-V55-001~012）。

> **抽查 3 个数字与源核对（本轮）**：① `npm test` **1319** ↔ 三叶产物（v55-1 `1246` → v55-2 `1283` → v55-3 validate-report §3.3 独立复跑 **1319/0**）**一致**；② `dist/sidepanel.js` **573,424 B** ↔ 源 `packages/web-cli-plugin/test/size-baseline.ts` 五要素终值（v55-3 build §8.6 / `SIDEPANEL_V553_FINAL_ROUND`，`direction='unchanged'`）**一致**（本轮 `git diff` 对 `test/**` 零改动，未移动该锚）；③ **档位 614,400 / 绝对上限 675,840 / 生效上限 602,095** ↔ v55-2 小修轮五要素 + `test/size-ruling-vol3`（12/0，三值同源）**一致**（历史闭合三值 `465,000` / `512,000` / `563,200` 与 `pending-author-line` 逐字保留，未被改写）。

---

## 4. 门禁总账（末轮实测原文，计数只增不减）

| 门禁 | 末轮实测 | 备注 |
|------|:--:|------|
| `npm test`（node 全量） | **`1319 / 0`** | F-33 起点 **1186** → **1319**（**F-33 段 +133**：1186 → v55-1 1246 → v55-2 1283 → v55-3 1319） |
| `driver-timings`（**新**，node） | **11 / 0** | 时机源闭集单源（`'answered'` 扩张，旧 4 逐字保留） |
| `driver-quadruple`（**新**，node） | **14 / 0** | 驱动者四元组 + 集合 ≡ provider（双向包含，DQ-1~6） |
| `driver-terminals`（**新**，node） | **8 / 0** | 驱动者终态词汇（法七扩展，与 `STREAM_TERMINALS` 正交） |
| `s0-self-driven-chain`（**新**，node） | **15 / 0** | S0 全链样本（`s0-chain.mjs` 单源，node 与 Chromium **同一份**）+ 护栏沿链序穷举 |
| `law7x-ext`（**新**，node） | **5 / 0** | 法七扩展四类终态逐类有驱动者 + `L7X-4` 后台 ask 取消守卫 |
| `onboarding-deterministic`（**新**，node） | **29 / 0** | 配置判据 / 引导 4 步单源 / 悬置单源 + 续接 / 同因可重试 / 取消非死端（OD-1~OD-19） |
| `op-three-tier`（**新**，node） | **10 / 0** | op 三档清分（`auto 5 / confirm 2 / gesture 2`）+ 新 op 未归档 ⇒ FAIL + auto 零三表写入 |
| `proactivity-guard`（**新**，node） | **7 / 0** | 护栏六常量单源 + 越限真抑制 + 可关断 + 主题① 不受总控 |
| `turn-arbitration`（**新**，node） | **6 / 0** | SW 有界队列 ≤1 + 溢出明确拒绝 + 草稿回填 + 用户输入零丢失 |
| `test:s0-self-driven`（**新** Chromium 面） | **59 / 0** | S0 全链真面板：**分支 A 零按键** + 分支 B 自动续接 + 关断复核（24 → 42 → 59） |
| `test:supersession`（元台账） | **37 / 0** | **红线终核 12 项**（content 177,076 / pick-layer 34,358 / sidepanel 573,424 / `KIND_SET` 40 / 特权恒 gesture / consent 不代答 / `requestTurn(` 恰 2 / 法八 / 零宿主 / 判定链 9 项 / manifest / `pending-author-line`）（36 → 37） |
| `test:gate-integrity`（元门禁） | **19 / 0** | 受审集合只增（15 → 16 → 18 → 19）；`CHROMIUM_GATES === 9` **逐字不动** |
| `test:law8` | **36 / 0** | 法八四面零明文（25 → 33 → 36） |
| `test:dead-end` | **49 / 0** | 死端守护（5 类阻塞逐类 + 4 类已表达意图终态新增 + 双向反证）（39 → 49） |
| `test:ui`（journey） | **171 PASS** | 保护段 `43054..58287`（sha `cc79f413…`）**保段** |
| `test:binding` | **192 PASS** | 保护段 `107780..115930`（sha `be9ad0e9…`）**保段**；**环境性 flake 家族**（见 §7） |
| `test:stream` · `test:ask-auth` · `test:insight` · `test:recommendation` · `test:page-input` | **76 / 78 / 118 / 72 / 118** | 计数只增（v5 基线 73 / 71 / 118 / 65 / 108） |
| `test:density` · `test:l0` · `test:l1` · `test:l2` | **242 / 248 / 120 / 74** | 只增 |
| `test:auth-chip` · `test:zero-injection` · `test:hardening` | **37 / 28 / 24** | 只增 |
| `test:design-contract` · `test:size-ruling-vol3` · `test:ref-pick-wiring` | **19 / 12 / 11** | 三值同源 + 双稿双 shim |
| `test:l1-reverse` · `test:l2-reverse` | **9/9 · 10（RP-V33-01~10）** | 反向证明套件（l2-reverse 需独立会话，见 §8） |
| `npm run typecheck` / `npm run build` / `test:e2e` | **0 error / EXIT=0 / PASS** | fixture + LGDL Workbench 全链 |

**纪律**：门禁**严格串行**（一次一个 Chromium，`finally` 自清 profile）；日志 `tee` 全量落盘（`/tmp/opencode/v4-gate-logs/v55-*/`）；计数**只增不减**、断言**零删除零降级**（本 Feature **未发生**保护段第三次取代 —— journey / binding 均**保段**）。

> **新门禁 10（父 Feature 级）**：`driver-timings` / `driver-quadruple` / `driver-terminals` / `s0-self-driven-chain` / `law7x-ext` / `onboarding-deterministic` / `op-three-tier` / `proactivity-guard` / `turn-arbitration`（**9 枚 node**，逐叶纳入 `EXPECTED_AUDITED_FILES`，改名 / 删除即 FAIL）+ `s0-self-driven`（**Chromium 面扩张**，45 → 59）；`CHROMIUM_GATES === 9` **未动**（只追加先例，零新增 Chromium 门禁文件）。另升级既有门禁 **22 项**（`no-dead-end` / `dead-end` / `law8` / `supersession` / `gate-integrity` / `op-wiring` / `capability-wiring` / `sw-op-mirror` / `blocked-terminals` / `size-*` 四件套 / `recommendation-sources` / `l1-ref-validity` / `stream` / `ask-auth` 等）。

---

## 5. 体积总账 + 两次档位升档 + 作者行确认

| 产物 | 末轮登记值 | F-33 段变化 | 说明 |
|------|:--:|:--:|------|
| `dist/content.js` | **177,076 B** | **0（零容差，全程未动）** | sha256 `52a82620…` 逐字节不变（`op-*` / 仲裁闭集均走 **type-only**） |
| `dist/pick-layer.js` | **34,358 B** | **0（零容差，全程未动）** | sha256 `77796bab…` 逐字节不变 |
| `dist/sidepanel.js` | **549,609 → 573,424 B** | **+23,815 B / +4.33%** | F-33 段**逐轮五要素重登记**（v55-1 R1/R2/fix、v55-2 R1/R2/小修、v55-3 R1/R2/R3），每轮均披露前后值 / 日期 / 来源 / 构建命令 / 理由 / 历史保留 + 逐模块 metafile 归因 |
| 档位 `tiers` | **563,200 → 614,400 B** | **显式升档（v55-2 小修轮）** | 越过 563,200 ⇒ 按 `ceilTo50KB` 显式上调（依据 FR-SELF-120~124 / AC-SELF-024 / R-SELF-910 / ADR-V55-011 §4） |
| **绝对上限** `absoluteCeilingBytes` | **619,520 → 675,840 B** | **随档位派生** | `= 614,400 × 1.10` |
| 生效上限 | **602,095 B** | `floor(573,424 × 1.05)` | 容差 **5% 未动**；现余量 **28,976 B**（距档位） |
| **`authorConfirmation`** | **`pending-author-line`（⏳ 待作者一行）** | — | **未伪称已确认**；作者一行可否决改值 |

**sidepanel 增长链（F-33 段，逐轮实测）**：
`549,609`（F-33 起点）→ **557,883**（v55-1 收口，Δ +8,274）→ **563,780**（v55-2 小修轮，本叶合计 Δ +5,897）→ **573,424**（v55-3 R2；R3 Δ 0）= **+23,815 B**。

**逐叶预算结算（诚实登记，计划侧显著低估）**：

| 叶 | 叶预算 | 叶上界 | 实测 | 超预算 | 超上界 | 处置 |
|---|--:|--:|--:|--:|--:|---|
| v55-1 | 7,000 | 9,000 | **+8,274** | +1,274 | 未越（余 726） | 登记 |
| v55-2 | 4,900 | 6,300 | **+5,897** | +997 | 未越（余 403） | 登记 + **越档位 ⇒ 显式升档** |
| v55-3 | 5,900 | 7,600 | **+9,644** | +3,744 | **+2,044** | 按 ADR-V55-011 §4「**登记不停机**」（未跨档位） |
| **合计** | 17,800 | 22,900 | **+23,815** | **+6,015** | **+915** | 根因 = 计划侧低估（`guard.ts` ×1.8 / `settings/panel.ts` ×5.4；实测 ≈ plan Σ 的 1.34×） |

### 两次档位升档（作者行确认事项 —— 显著提示）

| # | 触发轮 | 档位 | 绝对上限 | 生效上限 | 依据 |
|:-:|--------|------|---------|---------|------|
| 1 | **v5-2 R1（F-32，2026-09-22）** | `512,000 → 563,200` | `→ 619,520` | `floor(547,558×1.05) = 574,935` | F-32 父收口 §5（越档位停机 → 编排器裁决① → 显式升档） |
| 2 | **v55-2 小修轮（F-33，2026-09-23）** | `563,200 → 614,400` | `619,520 → 675,840` | `floor(573,424×1.05) = 602,095` | ADR-V55-011 §4（`ceilTo50KB(563,780) = 614,400 > 563,200`；「谁先越谁登记」） |

> **给作者的一句话（显著提示）**：**体积档位已两次升档**（累计 `512,000 → 614,400`、绝对上限 `563,200 → 675,840`）；现行产物 **573,424 B**，距档位余量 **28,976 B**、距绝对上限余量 **102,416 B**、距公式生效上限余量 **28,671 B**。**`authorConfirmation.status` 仍为 `pending-author-line`（⏳ 待作者一行确认 / 否决）** —— 本文件与各叶台账**均未伪称已确认**；作者一行可否决改值。升档**机制按设计工作**（越限时 5 项体积门禁**如实判红**并**停机上报**，未静默重登记、未以放宽换功能）。

---

## 6. 取代台账 X-SELF-1~7（三叶逐项终态，显式取代，判据等价重写，零静默删除）

> **来源**：`docs/v4-supersession-ledger.json#xSelfLedgerCloseout`（三叶逐项 + owner + 可机核证据）；`test:supersession` **37/0**。

| id | 终态 | owner（落地叶） | 可机核证据 |
|:-:|---|---|---|
| **X-SELF-1** | **未发生取代**（如实登记，非空白） | 末叶终核 | `requestTurn(` 仍 **恰 2**（`op-wiring`）+ 红线终核 RL-07 / RL-08 |
| **X-SELF-2** | superseded | v55-1 | `driver-timings` / `driver-quadruple#DQ-3`（类型外移 re-export + `when` 零改字节，读法①） |
| **X-SELF-3** | superseded | v55-2 | `blocked-terminals` / `onboarding-deterministic#OD-7` + RL-04（`llm.unconfigured` 双源并存，`pure-addition`） |
| **X-SELF-4** | superseded | v55-1 | `no-dead-end` / `driver-terminals`（`terminals.ts` 新模块 + 段外逐行） |
| **X-SELF-5** | superseded | v55-1 | `l1-ref-validity#applyRefDriveProblems`（`applyRefAction` 驱动化，生产调用点恰 1 + seam 白名单） |
| **X-SELF-6** | superseded | v55-1 | `s0-self-driven-chain`（`submitDescribe` 补齐） |
| **X-SELF-7** | **superseded（本叶落地）** | **v55-3** | `turn-arbitration`（闭集 4 / 队列 ≤1 / 溢出明确拒绝 / 零丢失）+ `op-three-tier#OT-11` |

> **`knownGap` 一致性**：`protectedSupersession.status === 'complete-steps-1-8'` ∧ `knownGap` 为**闭环声明（残余：无）**；由 `protectedSupersessionConflicts` 机核（矛盾即 FAIL）✅。**保护段 journey / binding 均「保段」**（SG-V55-05 sha 双命中 + 两文件 `git diff` 零命中 ⇒ **未发生第三次八步取代**）。

---

## 7. 过程中抓到的真问题（本流程的价值证明）

| # | 问题 | 级别 | 处置 |
|:-:|------|:--:|------|
| 1 | **后台 ask 取消仍被记「已答」**（v55-1 review R1 **BLOCK-01**）：`submitAskFor` 的 `rid && !isRef` 分支在 `registerSuspension` **之前****缺取消守卫** ⇒ 取消的后台 ask 仍记 `answered-bg` 并驱动 `'answered'` 时机（FR-SELF-023 口径② / EC-SELF-005 的**唯一生产漏口**） | **高** | 修：加取消守卫（走稳态驱动集，**仍有接管者 ⇒ 非死端**）+ 新门禁 `L7X-4` 读**真源切片**（花括号配对，要求守卫**先于**登记 + 含 `return` + 块内零 `'answered'`）+ 三段注入反证 |
| 2 | **取代台账 0 命中**（v55-1 review R1 **BLOCK-02**）：`docs/v4-supersession-ledger.json` 内 `X-SELF` 命中 **0**、`modifiedRanges` **0** 条（显式取代**未落账**） | **高** | 修：按 ADR-V55-012 §1 逐条落账（X-SELF-2/4/5/6 + X-SELF-1「未发生取代」行内写明；X-SELF-3/7 = handed-over 到 v55-2/v55-3，**不得伪称已取代**）+ 5 条 `modifiedRanges` + 七行 `xSelfLedger` |
| 3 | **自动续接运行期是断的**（v55-2 R1 机核盲区 / R2 修复）：`submitAskFor` 的 op 分支在掩码 ask 上**先 `delete` resolver** ⇒ `submitSecret` 取不到 ⇒ 参数 promise **永挂** ⇒ `op.llm-config` 到不了 consent / complete（**引导永远「配不完」**）；R1 只机核了源码序，运行期这条链无人判 | **高（机核盲区）** | 修：resolver 归属修正（1 处）+ S0 分支 B **运行期必判项双面**；review 以其**载荷性亲核**（回退 resolver 归属 ⇒ `s0-self-driven` **38/4 复现 R1 断链** ⇒ 还原 **42/0**）—— 如实登记 R1 为**机核盲区**，**不伪称「一直可用」** |
| 4 | **体积两次越档位 → 停机 / 显式升档**：v5-2 R1（F-32）实测 `518,329 B` 越 512,000 档位 ⇒ 5 项门禁**如实判红**；v55-2 小修轮 `563,780 B` 越 563,200 ⇒ 显式升档 | 中（**机制按设计工作**） | 处置：**停机上报 → 编排器裁决 → 档位显式升档**（`512,000→563,200 / 619,520`；`563,200→614,400 / 675,840`）+ 逐轮五要素重登记；**未以放宽换功能**；`pending-author-line` 保持（见 §5） |
| 5 | **叶上界超 +2,044（计划低估）**（v55-3）：叶预算 5,900 / 上界 7,600，实测 **+9,644**（超预算 3,744 / 超上界 2,044）；根因 = 计划侧低估 `guard.ts` ×1.8 / `settings/panel.ts` ×5.4 | 中（登记不停机） | 处置：按 ADR-V55-011 §4「**登记不停机**」（未跨档位、无红线变化）；R3 零增重；三叶合计 +23,815 与 §5 逐叶预算结算**如实登记** |
| 6 | **binding / journey 环境性 flake 家族（KL-N-10）**：`test:binding` 在 v55-1/v55-2 各轮**间歇 FAIL**（`#confirm-allow` selector not found / CDP socket 早断 / 滚动时序），**每次失败项不同**；`test:ui`(journey) 首跑 2 项环境性 FAIL | 低（**已证环境性**） | 处置：`binding.mjs` / `journey.mjs` **均不在任何叶变更面**（`git diff` 零命中）；保护段由 `test:supersession` **37/0** + SG-V55-05 保护段 sha 双命中**独立机核**；validate 亲跑 **binding PASS 192/0** ⇒ **证实环境性**；纪律 = 串行 / 首轮异常隔离复跑 ≥2 / 日志全量 / **仍红如实记录不阻塞收口** |
| 7 | **验证面（价值证明）**：各叶**自写对抗探针**与**双向反证** —— v55-1 validate（S0 双面独立复刻 + BLOCK-01 行为级探针 + 2 组真源注入）；v55-2 validate（S0 分支 B 独立复刻 node 11/0 + Chromium 42/0 + 注入 `9/2` · `27/2` 还原复绿）；v55-3 validate（**S0-A 真面板 15/15 零按键 + node 行为级 42/42 + 红线体积 31/31**；**注入抽验 10 组全必红**） | — | 对抗优先，未采信 build/review 自报数值；`test:supersession` 保护段 **保段**（未发生第三次取代） |

---

## 8. deferred / 已知限制清单（逐条，如实登记，不冒充已修）

1. **`token` 预算口径 = 主动回合数代理**（非 token 计数）：ADR-V55-009 §2 等价口径；本 Feature **无 usage 回报面** ⇒ 已知限制（`guard.ts` 模块头已登记）。**owner = 父收口 deferred**（v55-3 N-12）。
2. **跨 `options.html` 页完成配置不触发续接**：`EC-SELF-010` 的「配置来源无关」在实现中等价于「**面板内** `op.llm-config` 完成」（悬置活在面板内存）；独立 options 页完成配置时面板只在 focus / visibility 刷新 `llm-status`（引导**收敛**），**不会**触发续接。**明确不属本 Feature**（跨页续接），口径由父收口登记为**边界**（v55-2 N-05）。
3. **生产 `src/**` 零消费的导出族**（门禁契约层单源）：`ONBOARD_SCENARIOS` / `onboardScenario()` / `onboardStepIndex()`（死代码）/ `ONBOARD_COLLECT_STEPS` / `MAX_SUSPENSIONS`（仅门禁消费）+ `AI_PROACTIVE_SAME_CAUSE_KEY`（v55-3 死导出，同因键内联）；validate 已判**非漂移**（不改变承载 FR 成立性）。**owner = 父收口登记**（v55-2 N-01 / v55-3 N-01）。
4. **续接成功后悬置未清空**：会话内后续任一次面板 `op.llm-config` 成功若悬置仍「有效」可能重放旧原话；R3 S0-A 端到端后**悬置键去重**（`lastAutoDrivenKey`）已使重放**不可达** ⇒ 登记为**已缓解**（v55-2 N-02）。
5. **会话 / 分组未收编 op**（`PO-ALLN-001`，承接 v5 deferred）：会话切换 / 分组 / tabs 设置 / 诊断 / 主题 / 告警**不收编**为 op；触发条件 = 作者后续提出「连会话切换也要在 chat 里闭环」。**owner = 父收口 / 后续波次**。
6. **`auto` 档一次性否决无专用按钮**（走「中断 + 静默期」）：**人工面体感走查**项（v55-3 N-15）。
7. **`test:l2-reverse` 需独立会话（>570 s）**：历史反向证明套件（RP-V33-01~10：逐条注入 → 复跑 → 逐字节还原），单机串行耗时超单命令窗口；中途强杀会留注入残留。build R3 已以**独立会话 `exit=0` 全绿**复现；本叶变更面零命中；`l1-reverse` 9/9 已亲跑作为反向证明代表（v55-3 N-14）。
8. **工具口径**：`npm run size:attribution` 无参运行 base = head = HEAD（自比较），其读数**不足以独立证明** R3 Δ0；实质机核在 `size-growth-evidence`（v55-3 N-06）。`dist-test/size-baseline.js` 根级**陈旧重复副本**（测试构建产物，非产品 / 非门禁输入）（v55-3 N-09）。
9. **读法 / 口径类**：`driverTraceLine` 无显式 `ts` 字段（「何时」由流内行 `<time class="ts">` 承载，非缺口）（N-07）；`chain-depth` 在 `answered` 路径结构性难达（依赖续流点，由 node 可注入时钟穷举）（N-08）；Chromium 面链上抑制为**代表性一项**（频次 / 链深 / 预算由 node 穷举，两面**判据同源**）（N-13）；`WRITE_POINTS` 为**手写声明**（完备性边界，已由 `op-wiring` 部分缓解）（N-02）。
10. **`sidepanel.js` 红线口径 = 字节数**（内嵌 `BUILD_STAMP`，sha 跨重建不可复现；`content.js` / `pick-layer.js` 的 sha 跨重建稳定）（v55-1 N-02 / v55-3 N-11）。
11. **外部竞品调研未执行**（`O-SELF-007` 已裁决不需要）：登记「未执行，不阻塞」，**不编造结论**。
12. **未闭合义务**：`authorConfirmation.status = pending-author-line`（档位 614,400 / 绝对上限 675,840）—— **属未闭合义务，不是已完成项**（见 §5）。
13. **A2A（F-29）未立项未排期**：ROADMAP 相关区段**一字未动**（本轮 F-29 区段前后**字节相等**，已核验）。
14. **人工面未执行**：见 §9（**不得冒充 PASS**）。

---

## 9. 三叶移交项汇总（owner = 父收口全清单 + 人工面清单 ⏳）

> **口径**：本表汇总三叶收口段中 **owner = 父收口 / 人工面** 的全部条目（各叶 `N-01~N-10` / `N-01~N-16`），**去除同源重复**（binding / journey flake 家族归并为 1 条）。**owner = 本叶已闭环 / 后续叶已闭环**的条目不在下表（已在各叶收口段逐条登记）。

### 9.1 owner = 父收口（登记 / 口径类，全清单）

| 来源 | 编号 | 内容摘要 | 父收口处置 |
|---|:--:|---|---|
| v55-1 | N-02 | `sidepanel.js` 红线 = **字节数**（非 sha） | 父级口径登记（并入 v55-3 N-11 同条） |
| v55-1 | N-03（O-01/O-02） | `judgeBeat` 常量归因 · `PROACTIVE_MOMENTS` 伞名 | 登记为「不影响判据的设计重叠」 |
| v55-1 | N-04 | ADR/plan 文本「调用点恰 1」↔ 门禁口径（生产 1 + seam 1） | 下游引用一律以**门禁口径**为准 |
| v55-1 | N-07 · N-08 | `binding` · `recommendation` 环境性 flake | **登记 flake 家族**（保段凭据 = `supersession` 37/0） |
| v55-2 | N-04 · N-07 | `binding` flake（与 v55-1 N-07 同族） | **并入 flake 家族 1 条**（不重复计项） |
| v55-2 | N-05 | 跨 `options.html` 页续接口径边界 | 登记为**边界**（不属本 Feature） |
| v55-2 | N-10 | **体积升档作者行确认** | 并入 §5 **作者行**事项 |
| v55-3 | N-01 | 死导出 `AI_PROACTIVE_SAME_CAUSE_KEY` + 同因键内联 | 登记（同 v55-2 N-01 族） |
| v55-3 | N-02 | `WRITE_POINTS` 手写声明（完备性边界） | 登记口径 |
| v55-3 | N-04 · N-16 | `binding` · `journey` 环境性 flake | **并入 flake 家族 1 条**（保段凭据 = `supersession` 37/0 + SG-V55-05 sha 双命中） |
| v55-3 | N-05 | 叶累计 **+9,644**（超预算 3,744 / **超上界 2,044**，未跨档位） | 并入 §5 **作者行**事项 + 逐叶预算结算 |
| v55-3 | N-06 | `size:attribution` 无参自比较（工具口径） | 登记工具口径 |
| v55-3 | N-07 | `driverTraceLine` 无显式 `ts`（读法差异） | 登记读法 |
| v55-3 | N-08 | `chain-depth` 在 `answered` 路径结构性难达 | 登记可达性边界 |
| v55-3 | N-09 | `dist-test/size-baseline.js` 陈旧副本 | 登记（建议清理 outDir） |
| v55-3 | N-11 | `sidepanel.js` sha 不可复现 ⇒ 红线 = 字节数 | 与 v55-1 N-02 同条父收口口径 |
| v55-3 | N-12 | **token 预算口径 = 主动回合数** | 并入 §8 deferred（token 口径 = 回合数代理） |
| v55-3 | N-13 | Chromium 面链上抑制为代表性一项（两面判据同源） | 登记口径拆分 |
| v55-3 | N-14 | `test:l2-reverse` 未在本轮执行（独立会话） | 登记受限项（已由 build R3 独立会话复现全绿） |

### 9.2 人工面清单（全部 `⏳ 未执行`，不冒充 PASS）

| # | 人工面 | 说明 | 状态 |
|:-:|--------|------|:--:|
| 1 | **未配置 ⇒ 系统流驱动配置 + 自动续接**观感 | 首装 / 已装未配两场景真机：引导 4 步可读性 · 掩码卡读屏 · 完成 ⇒ **自动续接**手感 | ⏳ 未执行 |
| 2 | **已配置 ⇒ AI 零按键驱动续流**观感 | 作答后**零按键**自动成回合 · 思考 / 命令呈现 · 续流节奏 | ⏳ 未执行 |
| 3 | 主动接手 / 打断体感 | AI 主动发起的**接手感** · 打断 / 静默期手感 | ⏳ 未执行 |
| 4 | `auto` 档一次性否决观感 | 「中断 + 静默期」是否够直观（现无专用否决按钮，`v55-3 N-15`） | ⏳ 未执行 |
| 5 | 引导文案可读性 | 确定性引导流的文案真实可读性 | ⏳ 未执行 |
| 6 | 读屏（掩码卡 `NFR-SELF-008`） | 掩码 secret 卡的读屏粒度 | ⏳ 未执行 |
| 7~15 | **v5 人工面 9 项（零改写，并列不覆盖）** | chip 两态观感 / 拖动体感 / 绿态详情 / 三主题 / 320px / 键盘 / 读屏 / 浏览器原生权限弹窗体感 / **真机 S2 断流走查** | ⏳ 未执行 |

> **注**：headless 不可合成（真实手势 / 权限弹窗 / 人工观感）；本轮为**纯文档 / 状态收口（零代码 / 测试改动）**，未跑门禁 / 构建 / Chromium。人工面逐项标注 `⏳`，**不得冒充 PASS**（父 `AC-SELF-026`）。

---

## 10. 建议的下一步

**A. 真机验收（最高优先，D 级亲验）**
1. **真机验收 S0 双面**（本 Feature 的首验收锚，地位 = v5 之 S2；真机 **22:49** 断流场景）：
   - **未配置**：应见 —— `runChat` 前置判据 ⇒ **系统流驱动配置**（4 步引导，零 LLM 调用）⇒ 掩码卡 ⇒ 配置完成 ⇒ **自动续接悬置任务**（不必再说一遍）；
   - **已配置**：应见 —— 作答后**零按键** ⇒ 自动成回合（经既有 `op.turn` 槽）⇒ 思考 / 命令 ⇒ 续流；AI 主动留痕**独立成行**（`driver` / `timing` / `evidence`，零明文）；越限 ⇒ `suppressed=<reason>` 可读 ∧ **真不发**；关断 ⇒ AI 主动零发起 ∧ **主题① 仍放行**。

**B. 作者一行决策（阻塞性最低、但必须由作者给出）**
2. **体积两次升档确认 / 否决**：档位 **614,400**（累计 `512,000 → 614,400`）/ 绝对上限 **675,840**（累计 `563,200 → 675,840`）/ 生效上限 **602,095**（现行产物 573,424 B）；另含**三叶合计超预算 +6,015 / 超上界 +915**（逐叶结算见 §5）。`authorConfirmation.status` 仍 `pending-author-line`——**作者可一行否决改值**；确认后该义务才算真正闭合。
3. **合 main / 发布时机由作者决定**：v1（F-14）/ v2（F-27）/ v3（F-28）/ v4（F-30）/ v4.5（F-31）/ v5（F-32）/ **v5.5（F-33）** 均在 `feature/web-cli-plugin`，**未合 main、未发布**（`main` = `2ddc922` 未动）。ROADMAP 已按 **v0.11.0 新版本位**登记（`self / ai-driven：让助手像助手`），文档版本 `1.29.0 → 1.30.0`。

**C. 后续候选（非阻塞）**
4. **F-29（A2A 候选）**：未立项未排期，本轮一字未动；如要推进需作者立项。
5. **v5.6 候选**（若作者提出）：会话 / 分组收编 op（`PO-ALLN-001`）· 环境性 flake 治理（`KL-N-10` 家族：binding / journey harness 就绪等待或有界重试）· 「跨 options 页续接」边界闭合 · 生产零消费导出清理 · 人工面真机走查。

---

## 11. 主题达成自评（对照作者两点）

> **口径**：主题 = 作者 2026-09-22 原话提炼（逐字保留于父 `spec.md` / `state.json`）：①「没有配置 LLM 时：由系统代码流程驱动用户去配置 LLM」；②「已配置 LLM 时：让 AI 来启动整个 chat/next」；母理念「主动帮用户…而不是被动接受任务」。**两条均有 S0 双面证据**。

| 维度（作者主题） | 达成度 | 证据 |
|---|---|---|
| **① 未配置 ⇒ 系统流驱动配置 + 自动续接** | ✅ **达成且机器化** | **S0 分支 B 双面**：node `s0-self-driven-chain` **11/0**（`S0N-7` 删自动续接 ⇒ 必红）+ Chromium `s0-self-driven` ⑰ `S0C-7` **42/0**（真产品路径：未配置 ⇒ detect ⇒ guide ⇒ 掩码卡 `type=password` ⇒ 完成 ⇒ **自动续接** ⇒ 留痕逐字原话）；`onboarding-deterministic` **29/0**（4 步单源 / 零 LLM / 悬置单源 / 取消非死端 / 同因可重试）；**运行期断链**（掩码 ask resolver）已修且**真删即复现**（review 亲核 `38/4` ⇒ 还原 `42/0`） |
| **② 已配置 ⇒ AI 零按键驱动 chat/next** | ✅ **达成且机器化** | **S0 分支 A 端到端**：Chromium `s0-self-driven` **59/0**（作答后 `[data-op]` 点击 = **0** ∧ 恰 **1** 条 chat 原文 ∧ 留痕三要素**独立成行** ∧ `command` ∧ `done`）+ node `s0-self-driven-chain` **15/0**；`pressCandidate` 经**既有 `op.turn` 槽**（`requestTurn(` **仍恰 2**，主流程 diff = 0）；**删 `pressCandidate` 门 / 作答后又敲键 / 不经 `op.turn` 槽** 逐条注入 ⇒ **双面必红** |
| **法七扩展 · 4 终态** | ✅ **达成** | `driver-terminals` **8/0** + `law7x-ext` **5/0**：已答 ask（ref 回合 / 面板 op ask / **后台 ask**）与「改用描述」四类逐类**必有下一个驱动者**；与 `STREAM_TERMINALS` **正交**；三段控制禁恒真（正常 / 移除驱动者必红 / 端态不存在 N/A） |
| **op 三档清分 5 / 2 / 2** | ✅ **达成且机核** | `op-three-tier` **10/0**：`tierOf` **派生式单源**（由 `layer`/`consent` 计算 ⇒ 与 `ops.ts#IMPL` 三字段一致，漂移不可能）；`auto 5 / confirm 2 / gesture 2`；**特权 op 恒 `gesture`**；**新 op 未归档 ⇒ FAIL**；AI 不得降档；`auto` 零三表写入（`op-wiring` 4 写符号调用点各恰 1） |
| **护栏六常量单源 + 可关断** | ✅ **达成** | `proactivity-guard` **7/0**：`guard.ts` 六常量单源（**6/10min** · 同因不重复 · 静默 **60 s** · 冷却 re-export 既有 **10 s** · 链深 **2** · 回合预算 **8**）；越限**真抑制**（`suppressed=<reason>` 可读 ∧ 真不发）；同因不重复仅记**用户主动放弃**（失败仍可重试）；关断默认 ON，关断 ⇒ AI 零发起 ∧ **主题① 不受总控** |
| **驱动者层 · 主流程 diff = 0** | ✅ **达成且 diff = 0 机核** | `driver-quadruple` **14/0**（集合 ≡ provider 双向包含；`driverClass` 单源）+ `driver-timings` **11/0**（时机闭集 4 → 5，旧 4 逐字）+ `op-wiring`（`requestTurn(` 恰 2 / `nextAfterSettle(` 10 / 集 B per-op 分支 0）；**`X-SELF-1` = 未发生取代**（如实登记） |
| **安全边界（R-SELF-001）** | ✅ **达成且四项亲核** | 特权恒 `gesture`（恰 2）· `consent` 不得代答 · `auto` 零三表写入 · 判定链 `zeroDiffFiles` 9 项零 diff；**`content.js` / `pick-layer.js` 全程逐字节未动**；`law8` **36/0** |
| **剩余面（人工观感）** | ⏳ **待真机** | 见 §9.2（headless 不可合成）；**不冒充 PASS** |

**达成结论**：作者主题①②及治理面（法七扩展 4 终态 / op 三档 5·2·2 / 护栏六常量 / 驱动者层 diff = 0）**全部达成且可 FAIL 反证**（注入必红、还原必绿）；剩**人工观感**未执行，**不冒充 PASS**。

---

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建（v55-self-driven 父收口 R1）：三叶 validated 汇总 + 主题达成结论（未配置⇒系统流驱动配置+自动续接 / 已配置⇒AI 零按键驱动 chat/next；法七扩展 4 终态 / op 三档 5·2·2 / 护栏六常量）+ 数字总账（npm 1186→1319 · F-33 段 +133 · sidepanel 549,609→573,424 · +23,815 · 新门禁 10）+ **两次体积升档（512,000→563,200 / 619,520；563,200→614,400 / 675,840）+ `pending-author-line` 作者行确认** + X-SELF-1~7 三叶终态 + 过程真问题 7 条 + deferred/已知限制 14 条 + 三叶移交项汇总（owner=父收口 全清单 + 人工面清单 ⏳）+ 建议下一步 + 主题达成自评 | 2026-09-23 | SDDU Build Agent |
