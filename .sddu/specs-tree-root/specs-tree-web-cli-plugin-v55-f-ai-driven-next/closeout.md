# F-36 web-cli-plugin v0.11.3「AI 驱动 next（AI-driven next）」——全 Feature 总账（父收口）

> **Feature**: `.sddu/specs-tree-root/specs-tree-web-cli-plugin-v55-f-ai-driven-next/`（父 = 轻量规范容器）
> **收口轮次**: v55-f-ai-driven-next 父收口（第 1 轮；两叶各自 build / review / validate 已在叶内完成）
> **日期**: 2026-09-27 ｜ **授权**: 编排器代作者决策（继承 F-30 / F-31 / F-32 / F-33 / F-34 / F-35 父收口先例；作者已授权编排器代行决策、SDDU 全流程自行调度）｜ **代行**: sddu-build
> **分支 / HEAD**: `feature/web-cli-plugin` @ 父收口前 `068054c`（adn-2 R1）＋ 工作树累积的 review / validate / 收口改动；`main` = `2ddc922`，**未动**
> **口径**: 本文件的数字**一律取自两叶 build / review / validate 产物**（不重跑门禁、不编造）；本轮为**纯文档 / 状态收口**，零 `src/`、零 `test/`、零 `docs/` 实义改动；抽查与源核对见 §3 脚注。

---

## 1. 一句话结论

**v0.11.3「AI 驱动 next（AI-driven next）」完成**：父 + 两叶全部收口，**两叶 phase 全部 `validated`**（`status=completed`），**主题达成 = 把「下一步推荐」的产出权从确定性注册表独占改为「LLM 结构化产出候选 + 确定性注册表退居兜底与安全闸」**——① **AI 结构化产出通道**（复用 `idle` 时机 + `chat-result` 载荷 **type-only 加法字段 `aiNext`** + 尾随 `next` 围栏块严格 JSON 数组；**零新增 kind**（`KIND_SET` 40 / 12 kind / 零宿主逐字不动）/ **零新 LLM 往返**）；② **5 道校验链**（opId 在册（9）→ 三档清分（**gesture 恒拒**，复用 `tierOf` 单源）→ ref 有效（字符串 `refId` / `ref_<n>` 命中本回合 `ChatRefFact[]` ∧ `refState==='valid'`）→ param 在 `AskSpec` 内 → 越界 / 非法**丢弃 + 留痕**（拒绝码闭集**恰 5 枚**，**顺序即优先级**））；③ **判定分层**（`admitCandidate` **接受层** vs `pressDecision` **按下层**；`auto` 可提案可按下 / `confirm` 可提案**不可自动按下** / `gesture` **连提案都拒**；`pressDecision` **diff = 0**）；④ **`ai-next` provider 骑 `ref-action` 位**（`priority 2 + prepend` ⇒ 同规则内 AI 优先，AI 缺席确定性照旧接管；`DRIVER_DECLS_SRC` 11 → **12**）；⑤ **确定性退居兜底**（未配 / 未产出 / 非法被拦 ⇒ 注册表接管）+ **`free-input` 终端恒常驻**（R8 不回归）+ 零死端 floor；⑥ **合并口径**（同单卡位 / 前 N ≤3 / `NEXTSTEP_PRIORITY` **恰 4 不动** / R6 同因去重扩展覆盖 AI / 替换陈旧候选 / 渲染零 per-op 分支）；⑦ **护栏**（六常量同过 / 提案**不耗回合预算** / 关断两相 / **零第二阈值**）；⑧ **首开保持确定性**（零 LLM 往返依赖 / 让位 firstRun 零双卡）；⑨ **S0''' 四支线双面**（A 合法被采纳 / B 非法被拦 + 留痕 / C 未产出兜底 / D 未配置纯确定性；node 真源切片 + Chromium **只加断言不加文件**）。**作者裁决「有连接 LLM 则 next 应交给 AI 驱动输出」被完整兑现且可机核。**

**未闭合义务（不得伪称已确认）**：体积 `authorConfirmation.status` 仍为 **`pending-author-line`（待作者一行）**——**承接 v5.5 两次升档的历史确认事项**（`512,000→563,200 / →619,520`；`563,200→614,400 / →675,840`）；**本 Feature 段无新增升档**（未跨档位、未触 EC-ADN-016 三分支）。**不合 main、不发布**（v1/v2/v3/v4/v4.5/v5/v5.5/v5.5.1/v0.11.2/**v0.11.3（F-36）** 均在 `feature/web-cli-plugin`，合入 / 发布由作者决定）。

---

## 2. 交付了什么（面向使用者的五句话）

1. **"下一步推荐"不再只由确定性代码产出**：LLM 结题时可以用一个**尾随 `next` 围栏块**结构化输出下一步候选（`[{opId, label, params?, ref?}, …]`），它们**直接进 chips**——不再出现「LLM 口述了 4 条下一步、chips 那排却仍显示陈旧的确定性候选」的**两张皮**。
2. **AI 候选过同一套安全闸**：每一条都过 **5 道校验链**（opId 必须在册（9 个）/ 三档清分（**特权 op 恒 `gesture`，连可见提案都拒**）/ ref 必须命中本回合引用且有效 / param 必须落在 `AskSpec` 内 / 越界即**丢弃 + 留痕**）；`confirm` 档（如 LLM 配置 / 撤销）**可提案但绝不自动按下**（consent 必须用户答）。
3. **确定性注册表退居兜底，永不消失**：未配置 LLM / LLM 未产出 / 候选全被安全闸拦下 ⇒ **确定性 `recommendNextStep` 注册表照旧接管**；**`free-input` 终端恒常驻**（首屏必有输入入口，R8 修复不回归）；无任何候选时零死端 floor 铸「仅含终端」最小卡。
4. **合并口径不破既有纪律**：AI 候选与规则候选**同台争同一单卡位**（单卡 / 前 N ≤3 / `NEXTSTEP_PRIORITY` **恰 4 不动**）；R6「完成后同动作去重」家系**扩展覆盖 AI**（不再推已完成的动作）；AI 候选可**替换陈旧的确定性 chip**；渲染路径零 per-op 分支（`ACT_TO_OP` 恰 6）。
5. **安全与红线不退化**：**载体零新增**（`KIND_SET` 40 / 12 kind / 零宿主）；**法八零明文**（候选文本与留痕四面零明文）；**冻结面 `content.js` / `pick-layer.js` 逐字节未动**；**零新 LLM 往返**（仍走同一次回合；`recommend.ts` 仍纯函数）；**首开保持确定性**（零 LLM 依赖，让位 firstRun 零双卡）。

---

## 3. 两叶一览表

| # | 叶子 Feature | 范围（一句话） | 关键产出 | 验证（实测） | 收口 commit |
|:-:|--------------|----------------|----------|--------------|-------------|
| 1 | `specs-tree-adn-1-ai-next-produce-and-verify`（ADN-1，**27 任务 / 3 波**，首叶 / 底座叶 + 安全核心，交付序 1/2） | AI 结构化产出 next 候选通道（复用 `idle` + `chat-result` type-only 加法字段 `aiNext` + 尾随 `next` 围栏块）+ **5 道校验链**（opId 在册 / 三档清分 gesture 恒拒 / ref 有效 / param 在 `AskSpec` 内 / 越界+留痕闭集 5 枚）+ 判定分层（`admitCandidate` vs `pressDecision`）+ `ai-next` provider 骑 `ref-action` 位 + `DRIVER_DECLS_SRC` 11→12 + 新 node 门禁 + S0''' 四支线 node/Chromium 双面 + 体积叶1 重登记 | `src/background/ai-next.ts`（**NEW**：解析 + 5 道校验链 + `admitCandidate`，纯函数 B 列）· `next-registry/definition.ts`（`AiNextCandidate` / `AiNextBlockedCode` / `AiNextPayload` 3 类型 + `NextCtx.session.aiNext?` + `NextProvider.chipsFor?`/`label?`）· `background/chat-events.ts`（`ChatResultEvent.aiNext?` type-only 单声明）· `background/ref-context.ts`（产出契约句，只在有引用分支）· `shared/op-table.ts`（`OpDescriptor.ask?`）· `background/service-worker.ts`（末条 assistant 文本装配 `aiNext`）· `next-registry/providers.ts`（第 12 行 `ai-next` provider）+ `ai-drive.ts`（`driverBlockedLine` 单源）+ `registry.ts` / `ops.ts` / `recommend.ts` / `sidepanel.ts` · `test/ai-next-candidate.test.ts`（**NEW**）· `size-*` / `v4-supersession-ledger.json` / `v4-density-baseline.json` | **✅ 通过（review R1：24 Cx / 23 ✅ + 1 ⚠️ / **0 BLOCK** / 3 I；validate R1：V1~V16 全绿 / ⚠️ 有条件通过 0 阻塞）**；`ai-next-candidate` **16/0**（AI-N-1~11）+ `supersession` 49 → **51/0** · `law8` 60 → **64/0** · Chromium `s0-self-driven` 82 → **90/0**（S0C-13 四支线）+ 独立四脚本 **107 断言全绿**；`npm test` 1449 → **1478/0**（首叶段 **+29**）；**体积 598,926 → 603,205 B（+4,279；越叶预算 +0.8~2.0 KB ⇒ 如实登记不停机）**；**SG-ADN-01（13/13）/ SG-ADN-02（真值表四情形）全可行** | `7d01989`（validate；叶收口） |
| 2 | `specs-tree-adn-2-deterministic-fallback-and-merge`（ADN-2，**23 任务 / 3 波**，末叶 / 回归与判据叶，交付序 2/2，**强依赖叶1**） | 确定性退居兜底（未配 / 未产出 / 非法被拦）+ `free-input` 终端恒常驻（R8 不回归）+ floor 语义保持 + 零死端 + **合并口径**（同单卡位 / 前 N ≤3 / `NEXTSTEP_PRIORITY` 恰 4 不动 / R6 同因去重扩展 / 替换陈旧候选 / 渲染零分支）+ **护栏**（六常量 / 提案不耗预算 / 关断两相 / 零第二阈值）+ **首开保持确定性** + S0''' 四支线终态 + X-ADN-1~11 台账终态 + 升级 6 等价重锚 + 保护段决策 + 体积叶2 终态重登记 | `src/ui/sidepanel/recommend.ts`（R6 同因去重扩展覆盖 AI + `aiNextAfterCompleted` 预过滤 + 替换口径）· `src/ui/sidepanel/sidepanel.ts`（`maybeRecommend` 前追加 `proactivity.enabled()` **显示相关断门**，一处偏好两相）· `test/ai-next-candidate.test.ts`（+137 行纯加法：S0''' 终态真源切片 A/B/C/D + 反证）· `test/s0-self-driven-chain.test.ts`（+45 纯加法）· `test/ui/s0-self-driven.mjs`（⑲ + 纠错 E1）· `test/ui/recommendation.mjs` · `test/ui/law8-plaintext.mjs` · `docs/v4-supersession-ledger.json`（`xAdnLedgerFull` 11 条 + `xAdnLedgerLeaf2`）· `test/supersession-ledger.test.ts`（+160 纯加法）· `size-*` 4 文件 · `test/gate-integrity.test.ts`（+79 纯加法） | **⚠️→✅（review R1：32 Cx / 27 ✅ / 5 ⚠️ / **0 ❌ / 0 BLOCK** / 7 I；validate R1：V1~V18 / ⚠️ 有条件通过 0 阻塞 / 3 环境 flake 非回归）**；`supersession` 51 → **53/0** · `gate-integrity` 25 → **26/0**（受审下界 48 → 51）· Chromium `s0-self-driven` 90 → **93/0**（S0C-14 终态）· `law8` 64 → **65/0** · `size-ruling-vol3` **14/0** · ADR-003 独立脚本 **27 断言全绿**（冻结面 / 保护段 / 体积公式 / 门禁守恒 / 漂移）；`npm test` 1478 → **1507/0**（末叶段 **+29**）；**体积 603,205 → 604,602 B（+1,397；两叶 Σ +5,676 越 ADR 目标带 ⇒ 如实登记）**；**SG-ADN-03 可行（6/6 + 1 偏差登记）** | `068054c`（R1；叶收口轮留工作树，随父收口一并提交） |

> **任务总量**：27 + 23 = **50 任务 / 6 波**（叶1 3 波 / 叶2 3 波）；叶间**硬串行** `adn-1（validated）→ adn-2`（先立产出通道与安全核心，再落兜底 / 合并 / 门禁重锚 —— 交付序安全）；**3 个 spikeGate**（SG-ADN-01 围栏块解析 + 载荷加法字段 **13/13** / SG-ADN-02 分层共享 `tierOf` + `pressDecision` diff=0（真值表四情形实跑）/ SG-ADN-03 骑 `ref-action` 位 `prepend` 替换 + 前 N=3 合并 **6/6 + 1 偏差**）**全可行**；每叶收尾**全门禁必须绿**。父 = 轻量规范容器（`phase=tasked → validated` / **不承接 build / review / validate**，产出总览型 `tasks.md` / `tasks.json`）。母体口径：**89 FR / 16 NFR / 20 EC / 20 NG / 10 US / 8 G / 30 AC / 16 DC / 30 N / 24 R / 8 GAP / 5 COR**；10 ADR（ADR-ADN-001~010）；PD-ADN-001~008 全部裁决；DC-ADN-001~016 全部落定；O-ADN-001~016 全部裁决。

> **抽查数字与源核对（本轮）**：① `npm test` **1507** ↔ 两叶产物（叶1 `1478/0` → 叶2 validate-report §3.1 独立复跑 **1507 tests / 1506 pass / 1 fail（环境计时 flake）**）**一致**；② `dist/sidepanel.js` **604,602 B** ↔ 源 `packages/web-cli-plugin/test/size-baseline.ts`（`SIDEPANEL_BASELINE_BYTES = 604_602` / `SIDEPANEL_FINAL_ARTIFACT_BYTES = 604_602` / `SIDEPANEL_ADN2_FINAL_ROUND`；`authorConfirmation = pending-author-line`）**逐值一致**（本轮 `git diff` 对 `packages/**` 零改动，未移动该锚；实测 `ls -l dist/sidepanel.js` = 604602 B）；③ **档位 614,400 / 绝对上限 675,840 / 生效上限 634,832** ↔ `test/size-ruling-vol3.test.ts`（`live.ceilingBytes === 634832` / `PENDING_ABSOLUTE_CAP.absoluteCeilingBytes === 675_840`；`604602 < 614400` ⇒ 未跨档）**一致**（历史两次升档值 `563,200→614,400`、`619,520→675,840` 与 `pending-author-line` 逐字保留，未被改写）；④ **冻结面 sha** ↔ 实测 `sha256sum`：`content.js` = `52a826205553b46a896ccad54225d63ba62f5f7fe7c969a9bc2e655448d5b5f6`（177,076 B）、`pick-layer.js` = `77796babd9c93893542195424d160e0877d8acca4142f8faf2232e217fbd575e`（34,358 B）**一致**；⑤ **保护段 pin `7b309258…` / `be9ad0e9…`** ↔ `test:supersession` 逐字节复算（`[43484,59347)` / `[107780,115930)`）**一致**；⑥ F-36 段起点 `npm test` **1449** / sidepanel **598,926 B** ↔ 父 `state.json#domainBaseline`（`sidepanelBaselineBytes: 598926`）＋ 承 **R8 修复轮 `38565ac`**（1443 → 1449 / 598,577 → 598,926）**一致**。

---

## 4. 门禁总账（末轮实测原文，计数只增不减）

| 门禁 | 末轮实测 | 备注 |
|------|:--:|------|
| `npm test`（node 全量） | **`1507 / 0 / skip 0`** | F-36 起点 **1449** → **1507**（**F-36 段 +58**：1449 → 叶1 **1478**（+29）→ 叶2 **1507**（+29）；起点承 R8 修复轮 `38565ac`：1443 → 1449） |
| `ai-next-candidate`（**新 1**，node） | **16 / 0** | AI-N-1~11 共 **11 条判据** + 五类注入反证（gesture / 幻觉 op / 越界 ref / 越界 param / label 凭据）+ **真源切片**（生产 `op-table` + 回合 refs 快照，零第二真值源）+ 三段控制（`ok`/`violated`/`n/a` 禁恒真）+ 元判据（每条 `expectFailPattern` 非占位）；叶2 **+137 行纯加法**（S0''' 终态 A/B/C/D + 反证）⇒ 计数只增 |
| `ai-next-candidate`（S0''' node 面，叶2 终态） | **四支线全绿** | A 合法被采纳（替换 + ≤3 + 单卡 + 终端恒在）/ B 被拦（`blocked=unknown-op` + 确定性接管）/ C 未产出（零 `aiNext` ⇒ 兜底）/ D 未配置（纯确定性）；**真源切片** + 逐字节还原反证 |
| `s0-self-driven`（Chromium S0''' 面） | **93 / 0** | 叶1 82 → **90/0**（`S0C-13` 四支线 A/B/C/D 真面板）+ 叶2 **93/0**（`S0C-14` 终态口径：多候选前 N=3 ∧ 单卡 ∧ 替换 ∧ 终端恒最末）；**环境相位 flake**（⑬A / ⑲ `rule=risk-recovery` 抢槽）⇒ 隔离复跑（KL-N-10，见 §7） |
| `test:supersession`（元台账） | **53 / 0** | **红线终核**（content / pick-layer / `KIND_SET` 40 / 特权恒 gesture / consent 不代答 / `requestTurn(` 恰 1 / 法八 / 零宿主 / `zeroDiffFiles` / manifest / `pending-author-line`）；**`xAdnLedgerFull` X-ADN-1~11 终态**（已发生 4 / 未发生 6 / 等价重锚 1；`no-supersession` 理由非空 / `counterCheck` 可定位不悬空 / 缺条 / ID 冲突 / 空字段 ⇒ 必红）+ 保护段 keep 双绿（49 → 51 → **53**） |
| `test:gate-integrity`（元门禁） | **26 / 0** | 受审集合只增（24 → 25 → **26**）；新增 1 `ai-next-candidate` + 升级 6 + 间接面 6 = **三态齐**；`assertionsRemoved === 0`；`EXPECTED_AUDITED_FILES` **51**（≥48）；末位仍是 `ai-next-candidate` 且恰出现一次；`CHROMIUM_GATES === 9` **逐字不动** |
| `test:size-ruling-vol3` | **14 / 0** | 体积终态机核：基线 **604,602** / 生效上限 **634,832**（= `floor(604,602×1.05)`）/ 档位 614,400 / 绝对上限 675,840；边界 634,833 ⇒ 必红 |
| `test:law8` | **65 / 0** | 法八四面零明文（60 → 64 → **65**）；AI 候选 label / 留痕零明文面；**60 段零降级** |
| `test:insight`（Chromium） | **125** | ★ 只增（保段；无降级） |
| `test:density`（Chromium） | **242** | ★ 保段（单卡 / 3-chip / 7/15·9/20·17/35 阈值逐字不动） |
| `test:dead-end`（Chromium） | **53** | ★ 保段（零死端不回归） |
| `test:recommendation` | **81 / 2** | ★ 只增（79 → **81**；2 = **HEAD 基线同款**授权探针环境 flake，见 §7） |
| `test:binding`（保护段） | **191 / 192** | **保护段 keep 字节中立**：段 `[107780, 115930)` len **8150** / sha **`be9ad0e9…`** / `startByte=107780`；**环境性 flake**（CDP / 相位；KL-N-10，见 §7）—— 保护段字节级经 `test:supersession` 双绿 |
| `test:ui`（journey，保护段） | **171 PASS** | **保护段 keep**：段 `[43484, 59347)` / **249 行** / sha **`7b309258…`**（`protectedRanges` 恰 2 段 / 零 ADN 换锚；`countEvidence` 只增） |
| `recommendation-sources` · `driver-timings` · `driver-quadruple` · `op-wiring` · `op-three-tier` · `proactivity-guard` | 全绿（升级 6 等价重锚） | 白名单恒 **5** / 时机源恰 **5** / `DRIVER_DECLS_SRC` **12↔12** / `requestTurn(` 恰 **1** / op 三档 **9**（op-table）/ 护栏六常量单源 —— 断言零删除、判据等价重锚 |
| `next-registry`（NR-10 11→12）· `size-budget` · `size-growth-evidence` · `v4-density-baseline` | 全绿（间接重锚） | 反证「还原 PASS」声明行 11 → **12**；体积五要素 / 三值同源前移；`tolerance` / `cap` / 档位 / 绝对上限零改 |
| `npm run typecheck` / `npm run build` / `test:e2e` | **0 error / EXIT=0 / PASS** | fixture + LGDL Workbench 全链；构建后冻结面 / 体积不变 |

**纪律**：门禁**严格串行**（一次一个 Chromium，`finally` 自清 profile）；计数**只增不减**、断言**零删除零降级**（`assertionsRemoved = 0`；size 类删除行 = 判据值**等价重锚** + 指针前移）。

> **新门禁 1（父 Feature 级）**：`ai-next-candidate`（**1 枚 node**，纳入 `EXPECTED_AUDITED_FILES` / `gate-integrity` 下界，改名 / 删除即 FAIL）；`CHROMIUM_GATES === 9` **未动**（只追加断言，零新增 Chromium 门禁文件）。
>
> **门禁三态处置（逐条）**：**新增 1**（`ai-next-candidate`）+ **升级 6**（`recommendation-sources` / `driver-timings` / `driver-quadruple` / `op-wiring` / `op-three-tier` / `proactivity-guard`）+ **间接重锚 6**（`next-registry` / `gate-integrity` / `supersession` / `size-budget` / `size-growth-evidence` / `v4-density-baseline`）+ **保留**（`CHROMIUM_GATES === 9` 不动）；**逐行 `assertionsRemoved = 0`**（零删除零降级）。

---

## 5. 体积总账 + 未升档 + 作者行确认

| 产物 | 末轮登记值 | F-36 段变化 | 说明 |
|------|:--:|:--:|------|
| `dist/content.js` | **177,076 B** | **0（零容差，全程未动）** | sha256 `52a82620…` 逐字节不变（候选通道全在 SW / 面板侧，冻结面零触碰） |
| `dist/pick-layer.js` | **34,358 B** | **0（零容差，全程未动）** | sha256 `77796bab…` 逐字节不变 |
| `dist/sidepanel.js` | **598,926 → 604,602 B** | **+5,676 B（≈ 5.54 KiB）** | 逐叶五要素重登记（叶1 正增量 `+4,279` / 叶2 正增量 `+1,397`），每轮均披露前后值 / 日期 / 来源 / 构建命令 / 理由 / 历史保留 + 逐模块 metafile 归因（`adn1R1Rows` / `adn2Rows`） |
| `dist/background.js`（B 列） | **1,641,872 B** | **净增 0（不计账）** | B 列 SW 优先口径；`ai-next.ts` NEW 与 SW 装配的字节归因在册，本轮净增 0 |
| **档位 `tiers`** | **614,400 B** | **未动（本 Feature 段无升档）** | 未跨档位（604,602 < 614,400，余量 **9,798 B**） |
| **绝对上限** `absoluteCeilingBytes` | **675,840 B** | **未动** | `= 614,400 × 1.10` |
| 生效上限 | **634,832 B** | `floor(604,602 × 1.05)` | 容差 **5% 未动**；现余量 **30,230 B**（距生效上限） |
| **`authorConfirmation`** | **`pending-author-line`（⏳ 待作者一行）** | — | **未伪称已确认**；承接 v5.5 两次升档的历史确认事项（见下），作者一行可否决改值 |

**sidepanel 增长链（F-36 段，逐叶实测）**：
`598,926`（F-36 起点，承 R8 修复轮 `38565ac`：598,577 → +349）→ **603,205**（叶1 收口，Δ **+4,279** ≈ 4.18 KiB）→ **604,602**（叶2 收口，Δ **+1,397** ≈ 1.36 KiB）= **+5,676 B ≈ 5.54 KiB**。

**逐叶预算结算（诚实登记）**：

| 叶 | 叶预算（父 §5.11.1 分列） | 实测 | 超预算 | 处置 |
|---|--:|--:|--:|---|
| adn-1 | +0.8~2.0 KB | **+4,279 B ≈ 4.18 KiB** | **越（+2,279 B > +2.0 KB 上界）** | **显式诚实登记、不停机**（不删判据 / 不放宽容差 / 不搬列规避） |
| adn-2 | +0.5~1.5 KB | **+1,397 B ≈ 1.36 KiB** | 未越 | 在目标带内 |
| **合计** | +1.3~+3.5 KB（Σ×1.15 预期） | **+5,676 B ≈ 5.54 KiB** | — | **越 ADR-ADN-008 §② 目标带 +1.3~+3.5 KB ⇒ 如实登记不停机**（`R-ADN-908` 反证在册）；**未跨档位 / 未触 EC-ADN-016 三分支** |

### 体积档位（作者行确认事项 —— 显著提示，承接 v5.5 两次升档）

| # | 触发轮 | 档位 | 绝对上限 | 生效上限 | 依据 |
|:-:|--------|------|---------|---------|------|
| 1 | **v5-2 R1（F-32，2026-09-22）** | `512,000 → 563,200` | `→ 619,520` | `floor(547,558×1.05) = 574,935` | F-32 父收口 §5（越档位停机 → 编排器裁决① → 显式升档） |
| 2 | **v55-2 小修轮（F-33，2026-09-23）** | `563,200 → 614,400` | `619,520 → 675,840` | `floor(573,424×1.05) = 602,095` | ADR-V55-011 §4（`ceilTo50KB(563,780) = 614,400 > 563,200`；「谁先越谁登记」） |
| — | **F-34（v5.5.1）· F-35（v0.11.2）** | **未动** | **未动** | `floor(591,946×1.05) = 621,543` → `floor(598,577×1.05) = 628,505` | 未跨档位 ⇒ 无新增升档 |
| — | **F-36（本 Feature，2026-09-27）** | **未动** | **未动** | `floor(604,602×1.05) = 634,832` | 未跨档位、未触 **EC-ADN-016** 三分支 ⇒ **无新增升档**（两叶 Σ +5,676 越 **ADR 目标带**但未越**档位**） |

> **给作者的一句话（显著提示，累计清单）**：**体积档位已两次升档**（累计 `512,000 → 614,400`、绝对上限 `563,200 → 675,840`）——**均由 v5.5（F-33）及更早轮次触发，本 Feature（F-36）未新增升档**。现行产物 **604,602 B**，距档位余量 **9,798 B**、距绝对上限余量 **71,238 B**、距公式生效上限余量 **30,230 B**。**`authorConfirmation.status` 仍为 `pending-author-line`（⏳ 待作者一行确认 / 否决）** —— 本文件与各叶台账**均未伪称已确认**；作者一行可否决改值。F-36 段的 `pending-author-line` 为**承接历史确认事项**（非本 Feature 新增未闭合义务）。

---

## 6. 取代台账 X-ADN-1~11（两叶逐项终态，显式取代，判据等价重写，零静默删除）

> **来源**：`docs/v4-supersession-ledger.json#xAdnLedgerFull`（X-ADN-1~11 终态）+ `#xAdnLedgerLeaf2`（叶2 增量）+ 叶1 `#xAdnLedger` 骨架；`test:supersession` **53/0**。
> **终态 = 已发生（`superseded`）4 / 未发生取代 6 / 等价重锚 1**；**唯一授权例外（显式取代）= X-ADN-1「产出权转移」**（O-ADN-001；`old→new` 台账 + 理由 + 日期 + 落点；**不升格**任何新法条）。

| 编号 | 取代前（old，摘要） | 取代后（new，摘要） | 状态 |
|:--:|------|------|:--:|
| **X-ADN-1** | next 推荐 = 确定性内核（`recommendNextStep`）**独占产出** | **产出权转移**：LLM 结构化产出候选（`chat-result.aiNext`）+ 确定性注册表**退居兜底与安全闸**（`admitCandidate` 5 道校验链） | ✅ **已发生** |
| **X-ADN-2** | `recommendation-sources` ④「零新增网络 / LLM 面」 | **保持**（候选经**注入槽**进入 ⇒ `recommend.ts` 仍 pure；零新 LLM 往返） | ⏸️ 未发生取代 |
| **X-ADN-3** | `MAX_NEXTSTEP_CARDS_PER_ROUND = 1`（单卡） | **保持**（AI 与规则候选**同台争同一单卡位**） | ⏸️ 未发生取代 |
| **X-ADN-4** | `NEXTSTEP_PRIORITY` 恰 4（规则位） | **保持**（AI 骑 `ref-action` 位，不新增第 5 规则位） | ⏸️ 未发生取代 |
| **X-ADN-5** | 时机源恰 5（`[pick,stale,idle,firstRun,answered]`） | **保持**（复用既有 `'idle'` 时机，零新增触发词） | ⏸️ 未发生取代 |
| **X-ADN-6** | `maybeRecommend` 调用点恰 8 / `nextAfterSettle` 1 定义 10 调用点 | **未发生取代**（触发条件「新增挂点」未满足 ⇒ 计数不变；`requestTurn(` 仍恰 1） | ⏸️ 未发生取代 |
| **X-ADN-7** | `DRIVER_DECLS_SRC` ↔ `builtinProviders()` 双向包含 **11↔11** | **12↔12**（新增 `ai-next` 声明行：`driverId='ai-next'` / `timing='idle'` / `evidence=['session.aiNext']`；旧 11 行逐字保留） | ✅ **已发生** |
| **X-ADN-8** | R6「完成后同动作去重」= `refId#意图摘要`（仅规则候选） | **扩展覆盖 AI 候选**（同一 `refActionDigest` 家系预过滤；键不可构成 ⇒ 不压（fail-open 到兜底，零静默丢弃）） | ✅ **已发生** |
| **X-ADN-9** | `RECOMMEND_MODULE_WHITELIST` 恰 5 模块 | **保持**（不新增导入；白名单恒 5） | ⏸️ 未发生取代 |
| **X-ADN-10** | floor = 「仅含 `free-input` 终端」最小卡 | **等价重锚**（AI 候选进入推荐语义后**终端仍恒常驻**；floor 语义不变） | 🔁 等价重锚（keep） |
| **X-ADN-11** | 关断偏好 `web-cli:proactive` 只涵盖「AI 主动回合」 | **扩展涵盖 AI next 候选（显示 / 自动按下）**（一处偏好两相，零第二偏好键 / 零第二阈值） | ✅ **已发生** |

> **注**：未发生取代者**逐条登记 `no-supersession` 理由**（非空），老台账条目（v3 / v4 / v5 / v5.5 / F-34 / F-35 段）**一律保留不动**；`xAdnTerminalProblems()` 一致性判据（逐条登记 / `status` 合法 / `counterCheck` 可定位且**不悬空** / `no-supersession` 理由非空 / 老条目逐字保留）+ 6 条反证（漂移 / 缺条 / 悬空 / 伪称 / 叶2 缺条 / 重复登记 ⇒ 必红）。

---

## 7. 过程中抓到的真问题（本流程的价值证明，不粉饰）

1. **两叶 Σ A 列 +5,676 B 越 ADR-ADN-008 §② 目标带**：父 plan 分列预算 A 列 Σ +1.3~+3.5 KB，实测 **+5,676 B ≈ 5.54 KiB**（叶1 +4,279 越叶预算 +0.8~2.0 KB 上界 / 叶2 +1,397 在带内）；**如实登记、不停机、不删判据、不放宽容差、不搬列规避**（`R-ADN-908` 反证在册）；**未跨档位**（604,602 < 614,400 ⇒ EC-ADN-016 三态皆「否」）。
2. **SG-ADN-03 语义偏差（父 ADR-ADN-004 §③）**：adn-2 build 先验发现 `onboarding` 卡片优先级（`priorityOf(onboarding) = 3`）**低于** AI 骑的 `ref-action`（= 2）⇒ 二者并现时 **AI 胜出该单个卡片槽**（原文「上层规则仍优先」的「（0）/（1）」是 `NextProvider.priority` **字段**，与 `priorityOf(rule)` **选卡键**不是同一轴）。定案：**属冻结 `NEXTSTEP_PRIORITY` 既有事实，非本机制引入**（且生产上二者不并现：`onboarding` 需 `firstRun` 触发词）⇒ 父 **ADR-ADN-004 §③ 文字订正**（厘清两轴 + 补充「生产不并现」可达性事实；**纯 `.sddu` 文字订正 / 机制零改 / `src/**` 零字节**），落 `xAdnLedgerFull.note`。
3. **adn-1 review I-3 background→ui 运行期耦合**：`src/background/ai-next.ts` **值导入** `../ui/sidepanel/stream-digest.ts#assertNoPlaintext` —— 本 Feature 引入的**首个 background→ui 运行期耦合**（`chat-events.ts` 的 ui 导入原本是 type-only，会擦除），使 B 列 bundle 拉入 UI 模块。**不违反任何门禁**（无「背景不得导入 UI」判据），已 B 列体积如实归因；建议后续轮将零明文 caliber 上移 `src/shared/`（**deferred**）。
4. **环境性 flake 家族（KL-N-10）**：① Chromium `s0-self-driven` ⑬A / ⑲ 相位 flake（`rule=risk-recovery` 抢槽 ⇒ `rule=null`）⇒ 隔离复跑（叶1 validate 89/1 ×2、叶2 91/2 ×4 + 88/5 ×1）—— **失败成员轮换 ⇒ 环境性**；② `test:recommendation` ④/⑭ 首跑 **78/3 → 79/1**（**HEAD 基线同款**）⇒ 隔离复跑；③ `test:binding` **191/192**（CDP socket / 相位，机器并发高载）—— 保护段字节级经 `test:supersession` 双绿（sha `be9ad0e9…` + `startByte 107780` + 3 反证）；④ `npm test` 1 fail = `NFR-007` perf-budget **计时**（隔离 3/3 绿）。**均如实登记、不伪称首跑绿；不动任何判据**（见 §8 / §9）。
5. **adn-2 review R1 7 项非阻塞改进项（I-1~I-7）**：I-1 ⑲ 严格规则断言与同文件 ⑦A 闭集口径不一致（`risk-recovery` 正确抢槽即间歇红）⇒ **不放宽**（放宽会让「AI 赢槽」裁决面落空），建议**加固**（前置轮询 / 复位前置）；I-2 `build.md` §1.1 末句与台账 note 互相矛盾（build 措辞失准）⇒ **已实际订正**（「只落台账 + 偏差上报」）；I-3 `size-growth-evidence` 归因轴混用（`rows` 用 `adn2Rows` 而 Σ 仍加 `adn1R1` glue）；I-4 `latestAfterBytes(rows, row)` 形参 `rows` 死参；I-5 `gate-integrity` 「升级 6 存在性」判据仅 `/ADN-2/.test(text)`（一句注释即可满足，强度偏弱）；I-6 `s0-self-driven-chain` 的 `branch({})` 标「B：被拦候选」实为 C 未产出路径（名实不符）；I-7 `recommendation` 夹具从不创建真页面 ⇒ 无法构造「AI 赢槽」态 ⇒ 改核**与相位无关的可观测不变量**（**采信 review 结论：门禁强度充分、非降级** —— node **真源切片**已确定性覆盖替换**双向**，真面渲染由 s0-⑲ 补足）。
6. **两叶 review / validate 一致口径**：adn-1 review R1 **✅ 通过 / 0 BLOCK**（23 ✅ + 1 ⚠️）；adn-2 review R1 **⚠️ 有条件通过 / 0 阻塞**（27 ✅ + 5 ⚠️ / 0 ❌ / 7 I）；两叶 validate 均 **⚠️ 有条件通过 / 0 阻塞**，且 **validate 独立复跑**（adn-1 V1~V16 四脚本 107 断言；adn-2 全 12 门禁不采信自报 + ADR-003 两脚本 27 断言），**三重判定环境 flake 为「非回归」**（失败成员轮换 + 隔离复跑 + HEAD 基线比对）。

---

## 8. deferred / 已知限制清单（逐条，如实登记，不冒充已修）

| # | 项 | 来源 | 状态 |
|:-:|----|------|:--:|
| 1 | adn-2 review **I-1**：⑲ 严格规则断言与 ⑦A 口径不一致（相位 flake 敏感性） | 叶2 review R1 | deferred（建议**加固**非放宽；不放宽以免裁决面落空） |
| 2 | adn-2 review **I-2**：`build.md` §1.1 措辞与台账矛盾 | 叶2 review R1 | **已实际订正**（口径闭环） |
| 3 | adn-2 review **I-3**：`size-growth-evidence` 归因轴混用（`adn2Rows` + `adn1R1` glue） | 叶2 review R1 | deferred（潜在缺陷；当前两 glue 皆 0 ⇒ 不显） |
| 4 | adn-2 review **I-4**：`latestAfterBytes(rows, row)` 形参 `rows` 死参 | 叶2 review R1 | deferred（整洁性） |
| 5 | adn-2 review **I-5**：`gate-integrity` 升级 6 存在性判据过弱（`/ADN-2/.test`） | 叶2 review R1 | deferred（建议锚到 `JUDGEMENTS` 条目 id） |
| 6 | adn-2 review **I-6**：`s0-self-driven-chain` B 标签名实不符（实为 C 未产出） | 叶2 review R1 | deferred（命名 / 覆盖度可读性） |
| 7 | adn-2 review **I-7**：`recommendation` 夹具不建真页面 ⇒ 无法构造「AI 赢槽」态 | 叶2 review R1 | **采信 review 结论：门禁强度充分、非降级**（node 真源切片覆盖替换双向；真面由 s0-⑲ 补足） |
| 8 | adn-1 review **I-1**：Chromium S0C-13 A 支线相位 flake | 叶1 review R1 | deferred（KL-N-10 家族；node S0PPP-4 已确定性覆盖） |
| 9 | adn-1 review **I-2**：`gate-integrity` 注释陈旧字面 40→41 | 叶1 review R1 | **已订正（doc-only）** |
| 10 | adn-1 review **I-3**：background→ui 运行期耦合（`ai-next.ts` 值导入 `stream-digest`） | 叶1 review R1 | deferred（建议后续上移 `src/shared/` 单一实现） |
| 11 | 人工面 M1~M5 未执行 | 父 spec §9.4 | ⏳（见 §9.2；headless 不可合成，不冒充 PASS） |
| 12 | `authorConfirmation.status = pending-author-line` | 承接 v5.5 两次升档 | 未闭合义务（作者一行可否决改值） |
| 13 | 外部竞品调研未执行 | 父 spec `O-ADN-024` 裁决（如实登记） | 明确 deferred（非缺陷） |
| 14 | `F-29`（A2A 候选）未立项未排期 | ROADMAP 未来方向候选 | 保持原样不动（本轮区段字节未动） |

---

## 9. 两叶移交项汇总（owner = 父收口全清单 + 人工面清单 ⏳）

### 9.1 owner = 父收口（登记 / 口径 / 环境类，全清单）

| 叶 | 项 | 内容 | 处置 |
|---|:--:|------|------|
| 叶2 | **I-1** | ⑲ 严格规则断言与 ⑦A 口径不一致 | deferred（§8-1；建议加固非放宽） |
| 叶2 | **I-3** | `size-growth-evidence` 归因轴混用 | deferred（§8-3） |
| 叶2 | **I-4** | `rows` 死参 | deferred（§8-4） |
| 叶2 | **I-5** | `gate-integrity` 升级 6 存在性判据过弱 | deferred（§8-5） |
| 叶2 | **I-6** | `s0-self-driven-chain` B 标签名实不符 | deferred（§8-6） |
| 叶1 | **I-1** | Chromium S0C-13 A 支线相位 flake | deferred（§8-8；KL-N-10） |
| 叶1 | **I-3** | background→ui 运行期耦合 | deferred（§8-10；建议后续上移 `src/shared/`） |
| 两叶 | 环境 flake | `s0-self-driven` 相位 / `recommendation` ④⑭ / `binding` CDP / `NFR-007` perf-budget 计时 | deferred（建议空闲机复跑确认；保护段字节级双绿） |

> **已闭环（非 deferred）**：叶1 review **I-2**（`gate-integrity` 注释陈旧字面 ⇒ doc-only 订正）；叶2 review **I-2**（`build.md` §1.1 措辞矛盾 ⇒ 已实际订正）；**SG-ADN-03 语义偏差** ⇒ 父 ADR-ADN-004 §③ 文字订正落账 + `xAdnLedgerFull.note`。

### 9.2 人工面清单（全部 `⏳ 未执行`，不冒充 PASS）

| # | 人工面 | 说明 | 状态 |
|:-:|--------|------|:--:|
| 1 | **M1 · 真机相关性**（叶1） | AI 产出的候选在真机上是否与用户语境相关、可理解 | ⏳ 未执行 |
| 2 | **M2 · 「两张皮」是否消失**（叶2） | LLM 口述的下一步是否真的进了 chips（不再与陈旧确定性候选并存） | ⏳ 未执行 |
| 3 | **M3 · 密度观感**（叶2） | 混入 AI 候选后的推荐区观感（单卡 / 3-chip 上限内是否舒适） | ⏳ 未执行 |
| 4 | **M4 · 读屏可用性**（叶2） | AI 候选 label 与留痕行的可朗读性 | ⏳ 未执行 |
| 5 | **M5 · 被拦体感**（叶2） | 候选被安全闸拦下时的留痕是否被理解（不误读为「AI 没反应」） | ⏳ 未执行 |

> **注**：headless 不可合成（真实观感 / 键盘 / 读屏 / 人工相关性判断）；本轮为**纯文档 / 状态收口（零代码 / 测试改动）**，未跑门禁 / 构建 / Chromium。人工面逐项标注 `⏳`，**不得冒充 PASS**。v5 / v5.5 / v5.5.1 / v0.11.2 人工面清单**零改写、并列不覆盖**。

---

## 10. 建议的下一步

**A. 真机验收（最高优先，D 级亲验）**
1. **真机验收「两张皮」核心场景（本 Feature 的核心验收锚）**：在有引用 / 已配置 LLM 的面板上，让 LLM 结题时在**尾随 `next` 围栏块**里产出候选 ⇒ 观察 chips 是否**真的换成 AI 候选**（而非仍显示陈旧的确定性候选）；再验证 AI 缺席 / 未配置时**确定性候选照旧接管**、`free-input` 终端恒在。
2. **被拦候选体感**：构造越界 ref / 未知 op / 特权 op（gesture）候选 ⇒ 观察**留痕可读**（`blocked=<code>`）且**无死端**（确定性接管或 floor）。

**B. 作者一行决策（阻塞性最低、但必须由作者给出）**
3. **体积档位历史确认 / 否决**（承接 v5.5）：档位 **614,400**（累计 `512,000 → 614,400`）/ 绝对上限 **675,840**（累计 `563,200 → 675,840`）/ 生效上限 **634,832**（现行产物 604,602 B，距档仅 **9,798 B** —— **已逼近档位**，后续轮需留意）。本 Feature **未新增升档**。`authorConfirmation.status` 仍 `pending-author-line` —— **作者可一行否决改值**；确认后该义务才算真正闭合。
4. **合 main / 发布时机由作者决定**：v1（F-14）/ v2（F-27）/ v3（F-28）/ v4（F-30）/ v4.5（F-31）/ v5（F-32）/ v5.5（F-33）/ v5.5.1（F-34）/ **v0.11.2（F-35）/ v0.11.3（F-36）** 均在 `feature/web-cli-plugin`，**未合 main、未发布**（`main` = `2ddc922` 未动）。ROADMAP 已按 **v0.11.3 patch 主题**登记（`AI 驱动 next`），文档版本 `1.32.0 → 1.33.0`。

**C. 后续候选（非阻塞）**
5. **I-1~I-7 / I-3 的下一轮处置**（叶2 七项非阻塞 + 叶1 I-3 耦合上移）：建议与 flake 家族（KL-N-10）系统性治理同轮。
6. **F-29（A2A 候选）**：未立项未排期，本轮一字未动；如要推进需作者立项。
7. **v5.6 / 后续候选**（若作者提出）：更泛的 AI 产出面（PD-ADN-005 登记「是否仅 ref-action 上下文 = 本轮是」）· 首开 AI 化（PD-ADN-001「本轮不做」）· 人工面真机走查（M1~M5）。

---

## 11. 主题达成自评（对照作者裁决「有连接 LLM 则 next 应交给 AI 驱动输出」）

> **口径**：主题 = 作者 2026-09-25 方向性裁决 —— **「这个推荐对吗，是不是还是写死的，有连接 LLM 的情况下的原则是，AI 驱动呀，所以 next 也应该交给 AI 去驱动输出」**。本 Feature 的题眼 = 把 **next 的「产出权」**从确定性内核独占，转移到 **AI 结构化产出**，同时**不牺牲**确定性兜底与安全闸（「AI 驱动 ≠ 无闸」）。

| 维度（主题） | 达成度 | 证据 |
|---|---|---|
| **产出权转移（AI 结构化产出候选）** | ✅ **达成且机核** | `chat-result.aiNext` type-only 加法字段（`ChatResultEvent` 既有 7 字段逐字 + `aiNext?`）+ 尾随 `next` 围栏块严格 JSON 数组（取**最后一条** assistant 文本的**最后一块**；无块 / 非数组 ⇒ 零候选）+ `admitCandidate` 5 道校验链（`src/background/ai-next.ts` NEW）；X-ADN-1**已发生**（唯一授权例外，显式取代 + 台账） |
| **安全闸不可绕过（5 道校验链）** | ✅ **达成且逐类反证** | opId 在册（9）/ 三档清分（**gesture 恒拒**，复用 `tierOf` 单源）/ ref 有效（`ChatRefFact[]` ∧ `refState==='valid'`）/ param 在 `AskSpec` 内 / 越界 + 留痕（拒绝码闭集**恰 5 枚**，顺序即优先级）；**五类注入反证全必红**（AI-N-6） |
| **判定分层（接受 ≠ 按下）** | ✅ **达成且 diff=0** | `admitCandidate` 接受层 vs `pressDecision` 按下层；`confirm`：`admit=true ∧ press=blocked:tier`；`gesture`：接受层即拒；`auto`：可按下；`pressDecision` 语义 **diff = 0**（SG-ADN-02 真值表四情形实跑） |
| **确定性退居兜底（永不消失）** | ✅ **达成且双向可判** | 未配 / 未产出 / 非法被拦 ⇒ 注册表接管（`chipsFor(ctx)` 空 ⇒ `continue` 不落 `seen` ⇒ 同规则下行接管）；S0''' 四支线 B/C/D 全落确定性；`test:dead-end` **53/0**（保段） |
| **`free-input` 终端恒常驻（R8 不回归）** | ✅ **达成且机核** | `free-input` provider `when` **恒真**（读 `session.busy` 两条穷尽分支）+ `terminal:true`（非 `.next-chip` / 不进 3-chip 上限）；零死端 floor（`suppressed==='empty'` 铸「仅含终端」最小卡）；`s0-self-driven` Chromium **93/0** 含终态口径 |
| **合并口径不破既有纪律** | ✅ **达成** | 同单卡位（`MAX_NEXTSTEP_CARDS_PER_ROUND=1`）/ 前 N ≤3（`chips.slice(0, MAX_CHIPS_PER_CARD)`；4 候选 ⇒ chip=3 ∧ 卡=1 反证必红）/ `NEXTSTEP_PRIORITY` **恰 4 不动**（AI 骑 `ref-action` 位）/ R6 同因去重扩展（`refActionDigest` 家系，键不可构成 ⇒ 不压）/ 替换陈旧候选（双向可判）/ 渲染零 per-op 分支（`ACT_TO_OP` 恰 6） |
| **护栏（预算 / 关断 / 阈值）** | ✅ **达成且单源** | 六常量同过 / 提案**不耗回合预算**（双向）/ 关断偏好 `web-cli:proactive` **一处涵盖显示 + 按下两相**（X-ADN-11 已发生）/ **零第二阈值**；关断后主题①（确定性）仍工作 |
| **首开保持确定性** | ✅ **达成** | 结构上无 AI 初始 next（`'aiNext' in session === false`）；零 LLM 往返依赖；让位 firstRun（`!(configured ∧ authorized)` ⇒ 零双卡）；`r8-open-next-entry` 保段 |
| **安全边界（法八 + 载体 + 冻结面 + 零新 LLM）** | ✅ **达成且亲核** | 法八四面零明文（`law8` **65/0**）；`KIND_SET` **40 逐字** ∧ `CARD_TAG_LABELS` **12** ∧ `REGISTERED_STRUCTURAL_HOSTS === []` ∧ `ACT_TO_OP` 恰 **6**；`content.js` / `pick-layer.js` **全程逐字节未动**；`recommend.ts` 仍 **pure**（零 `fetch`/`chrome.`/时钟，FR-CHAT-060 不破）；零新 LLM 往返 |
| **S0''' 四支线双面机器化** | ✅ **达成** | **node 面**：`ai-next-candidate` 真源切片（生产 `recommendNextStep` / `admitCandidate` 实跑；A/B/C/D + 6 条反证 + 逐字节还原）+ `s0-self-driven-chain` 终态机制侧；**Chromium 面**：`S0C-13`（叶1）/ `S0C-14`（叶2）**只加断言不加文件**（`CHROMIUM_GATES === 9` 不动） |
| **剩余面（人工观感）** | ⏳ **待真机** | 见 §9.2（headless 不可合成 M1~M5）；**不冒充 PASS** |

**达成结论**：作者裁决「**有连接 LLM 则 next 应交给 AI 驱动输出**」**全部达成且可 FAIL 反证**（五类注入必红 / `gesture` 恒拒 / `param` 越界必红 / 欺骗性 ref 必红 / 载体重线必红 / 全部逐字节还原）；确定性兜底与安全闸**未被削弱**（零死端 / 终端恒常驻 / 单卡与 3-chip / 规则表恰 4 / 白名单恒 5 全部保段）；剩**人工观感**未执行，**不冒充 PASS**。

---

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建（v55-f-ai-driven-next 父收口 R1）：两叶 validated 汇总 + 主题达成结论（AI 结构化产出 next 候选 + 5 道校验链 / 判定分层 / `ai-next` 骑 `ref-action` 位 / 确定性退居兜底 + 终端恒常驻 / 合并口径不破 / 护栏六常量 / 首开确定性 / S0''' 四支线双面）+ 数字总账（npm 1449→1507 · F-36 段 +58 · sidepanel 598,926→604,602 · 两叶 Σ +5,676 · 新门禁 1 + 升级 6 + 间接重锚 6 + X-ADN 终态 4/6/1 + 保护段 journey `7b309258…` / binding `be9ad0e9…` keep）+ **未升档（档 614,400 / 生效 634,832 / 绝对 675,840 / 距档 9,798）+ `pending-author-line` 承接 v5.5 两次升档** + 过程真问题 6 条（含两叶 Σ 越 ADR 目标带 / SG-ADN-03 语义偏差→父 ADR-ADN-004 §③ 文字订正 / background→ui 耦合 / flake 家族 / review 7 项非阻塞）+ deferred/已知限制 14 条 + 两叶移交项汇总（owner=父收口 全清单 + 人工面清单 ⏳ M1~M5）+ 建议下一步 + 主题达成自评 | 2026-09-27 | SDDU Build Agent |
