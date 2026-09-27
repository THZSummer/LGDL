# F-37 web-cli-plugin v0.11.4「next 驱动机制修正（AI 驱动 next 的准确落地）」——全 Feature 总账（父收口）

> **Feature**: `.sddu/specs-tree-root/specs-tree-web-cli-plugin-v55-f-next-drive-accuracy/`（父 = 轻量规范容器）
> **收口轮次**: v55-f-next-drive-accuracy 父收口（第 1 轮；两叶各自 build / review / validate / 修复轮已在叶内完成）
> **日期**: 2026-09-27 ｜ **授权**: 编排器代作者决策（继承 F-30 / F-31 / F-32 / F-33 / F-34 / F-35 / F-36 父收口先例；作者已授权编排器代行决策、SDDU 全流程自行调度）｜ **代行**: sddu-build
> **分支 / HEAD**: `feature/web-cli-plugin` @ 父收口前 `a75466a`（F-37 立项基底，F-36 收口 `103e981` 之后）＋ 工作树累积的两叶 build / review / validate / 两轮修复轮改动；`main` = `2ddc922`，**未动**
> **口径**: 本文件的数字**一律取自两叶 build / review / validate 产物**（不重跑门禁、不编造）；本轮为**纯文档 / 状态收口**（工作树既有 `src/**`、`test/**`、`docs/**` 实义改动随本轮一并提交），父收口本身零 `src/`、零 `test/`、零 `docs/` 实义改动；抽查与源核对见 §3 脚注。

---

## 1. 一句话结论

**v0.11.4「next 驱动机制修正（AI 驱动 next 的准确落地）」完成**：父 + 两叶全部收口，**两叶 phase 全部 `validated`**（`status=completed`），**主题达成 = 把 F-36 立住的原则（「next 交给 AI 驱动」）校正到正确的机制**——① **产出机制换轨**（注册 `next` 工具（function calling），经基座 **`hooks.intercept`** 缝在 dispatch 前捕获工具调用参数 + 返回**合成 `ToolResult`** 短路真实 dispatch；由 `tc.rawArguments` 严格 JSON 解析；**「文本尾随 `next` 围栏块 + 正则解析」结构性替换**（`NEXT_CONTRACT_GUIDANCE` / `FENCE` / `lastNextFenceBody` / `parseAiNextItems` / `AI_NEXT_FENCE_INFO` 在 `src/**` **零命中**）；**零改基座**）；② **触发范围无条件**（只要**配置 LLM**，**对话结束**即由 LLM 驱动，不再只并入有引用分支；`ai-next` 骑 **`ai-led` 独立规则位**，`NEXTSTEP_PRIORITY` 恰 4 → **恰 5** 等价重锚）；③ **未配置 LLM** ⇒ **确定性「去配置 LLM」引导** + **不显示自由输入终端**（自由输入无 LLM 不可行）；④ **LLM 异常兜底链**（**提醒 LLM 补一次**（有界恰一次 + 防环）→ 仍失败 ⇒ **系统兜底推荐「配置新的 LLM（切换 / 重配）」**，`llm.abnormal` 第 13 行 provider 复用 `op.llm-config`，文案与未配置**分相**）；⑤ **保留 F-36 正确资产**（**5 道校验链逐字保留** / `admitCandidate` 接受层 vs `pressDecision` 按下层 / `tierOf` 单源 / `chat-result.aiNext` type-only 加法字段（含 `abnormal?` 加法可选子字段）/ 已配置时 `free-input` 终端恒常驻 / R6 同因去重 / 留痕零明文）；⑥ **门禁等价重锚 + `parity` 新条目 + 体积分列预算（未升档）**。**作者口径「顶层原则 + 口径① + 口径② + 价值锚 + 承接 F-36 原裁决」被完整兑现且可机核。**

**未闭合义务（不得伪称已确认）**：体积 `authorConfirmation.status` 仍为 **`pending-author-line`（待作者一行）**——**承接 v5.5 两次升档的历史确认事项**（`512,000→563,200 / →619,520`；`563,200→614,400 / →675,840`）；**本 Feature 段无新增升档**（未跨档位、未触 EC-NDA-016 三分支：越生效上限 = 否 / 越档位 614,400 = 否（距档 **7,748 B**）/ 越绝对上限 675,840 = 否）。**不合 main、不发布**（v1/v2/v3/v4/v4.5/v5/v5.5/v5.5.1/v0.11.2/v0.11.3/**v0.11.4（F-37）** 均在 `feature/web-cli-plugin`，合入 / 发布由作者决定）。

---

## 2. 交付了什么（面向使用者的五句话）

1. **next 的产出改用真正的工具调用（function calling）**：LLM 结题时通过一个**模型原生 `next` 工具**给出下一步候选（`{candidates:[{opId,label,ref?,params?}]}`）；插件经基座 **`hooks.intercept`** 缝在 dispatch 前捕获参数并返回**合成 `ToolResult`**（跳过真实 dispatch），不再靠「文本尾随 `next` 围栏块 + 正则解析」口述冒充——**产出机制与「AI 驱动」原则对齐**。
2. **只要配置了 LLM，对话结束就由 LLM 驱动**：触发范围从「只在有引用上下文」放宽为**无条件**（`ai-next` 骑 `ai-led` 独立规则位）；**没有配置 LLM 时**，next 给的是**确定性「去配置 LLM」引导**，**不再显示恒真的「自由输入」终端**（自由输入无 LLM 不可行）——即作者口径「**有配置 LLM 的时候，LLM 驱动；没有配置 LLM 的时候，系统驱动用户配置 LLM**」。
3. **补上 LLM 异常兜底链**：对话结束若 LLM **没有调用 `next` 工具**，系统会**提醒 LLM 补一次**（有界恰一次、防环）；若 LLM **始终无法给出 next（LLM 坏了等情况）**，则由**系统兜底推荐**「配置新的 LLM（切换 / 重配）」（`llm.abnormal` provider，复用既有 `op.llm-config` op，文案与「未配置引导」**分相**）。
4. **F-36 的正确资产一条不丢**：**5 道校验链逐字保留**（opId 在册（9）→ 三档清分（gesture 恒拒）→ ref 有效 → param 在 `AskSpec` 内 → 越界 + 留痕）；`admitCandidate`（接受层）与 `pressDecision`（按下层）**分层不变**（`pressDecision` 语义 diff=0）；`chat-result.aiNext` type-only 加法字段（仅加 `abnormal?` 子字段）；已配置时 `free-input` 终端**恒常驻**（R8 不回归）；R6 同因去重扩展覆盖 AI；留痕零明文。
5. **安全与红线不退化**：**载体零新增**（`KIND_SET` 40 / 12 kind / 零宿主 / `ACT_TO_OP` 恰 6）；**法八零明文**（法八门禁 72/0，含工具参数 / `description` / 合成 output / 留痕）；**冻结面 `content.js` / `pick-layer.js` 逐字节未动**；**零改基座**（`packages/web-cli-base/**` 零 diff，只复用既有缝）；**保护段 journey / binding keep 双绿**；**首开保持确定性**（零 LLM 往返依赖）。

---

## 3. 两叶一览表

| # | 叶子 Feature | 范围（一句话） | 关键产出 | 验证（实测） | 收口 commit |
|:-:|--------------|----------------|----------|--------------|-------------|
| 1 | `specs-tree-nda-1-next-tool-channel`（NDA-1，**20 任务 / 3 波**，首叶 / **机制核心**，交付序 1/2） | 产出机制换轨（注册 `next` 工具 + `hooks.intercept` 捕获 + 合成 `ToolResult` 短路 dispatch + `rawArguments` 严格 JSON + `next` 不上流）+ 触发范围无条件（`ai-led` 规则位；`NEXTSTEP_PRIORITY` 恰 4→5）+ **5 道校验链逐字保留接入** + 围栏块通道结构性替换 + `parity` 新 `pluginExtra` 条目 + `ai-next-candidate` 门禁改写 + S0'''' 主线 / 支线 node 面 | `src/tools/next-tool.ts`（**NEW**：`NEXT_TOOL_NAME` / `NEXT_TOOL_SCHEMA`（`enum` = `OP_IDS − gesture` 恰 7 枚 / `maxItems ≤3` / `listed:false` + fail-closed `executor`）/ `NEXT_TOOL_MAX_CANDIDATES` / `NEXT_TOOL_ACK` / `createNextToolEntry()`）· `background/host.ts`（`:333` 旁 `router.register(createNextToolEntry())`，always registered）· `background/service-worker.ts`（`hooks.intercept` 接线 + `onFinish` 判定源 + events 过滤 `next`）· `background/ai-next.ts`（**删** `FENCE`/`lastNextFenceBody`/`parseAiNextItems`/`AI_NEXT_FENCE_INFO`；**改** `validateAiNext(candidates, facts)`；**逐字保留** `admitCandidate` / `AI_NEXT_LABEL_MAX` / `AI_NEXT_PARAM_MAX`）· `background/ref-context.ts`（**删** `NEXT_CONTRACT_GUIDANCE` 与注入）· `next-registry/providers.ts`（`ai-next` → `rule:'ai-led'`）· `recommend.ts`（`NEXTSTEP_PRIORITY` 恰 5 + 标签）· `test/ai-next-candidate.test.ts`（AI-N-12/13/14/15）· `test/parity/waivers.json` + `docs/v4-supersession-ledger.json` + `docs/v4-density-baseline.json` + `size-*` | **⚠️ 有条件通过 / 0 阻塞**（review R1：25 文件 / 22 ✅ / 4 改进项（归并自 6 ⚠️）/ 0 BLOCK；validate R1：V1~V18，15 ✅ + 3 ⚠️ / 0 fail / 0 阻塞 / 漂移 0）；`npm test` **1507 → 1517/0**（+10）· `law8` **65 → 69/0** · `supersession` **53 → 55/0** · `gate-integrity` **27/0** · `size-ruling-vol3` **14/0** · `insight` 125 · `density` 242/0 · `dead-end` 53/0；`ai-next-candidate` 11 → **14**（AI-N-1~15 全绿）；**SG-NDA-01（8/8）/ SG-NDA-02（12/12）全可行**；体积 A 列 **604,602 → 605,239 B（+637；越叶估 ⇒ 如实登记不停机）**；review **I-1 law8 ★NDA-1 ⑫ 运行面判据虚绿**（`label()` 从未执行恒真）→ 修复轮重写三段 + 注入必红 | 随父收口提交（工作树累积） |
| 2 | `specs-tree-nda-2-fallback-and-gates`（NDA-2，**21 任务 / 3 波**，末叶 / **兜底与判据叶**，交付序 2/2，**强依赖叶1**） | 未配置确定性「去配置 LLM」引导 + `free-input.when` 分相（未配置不显示 / 已配置恒常驻）+ 提醒补一次（有界 + 防环）+ LLM 异常判定闭集三情 + `AiNextPayload.abnormal?` 承载 + 系统兜底 `llm.abnormal`（复用 `op.llm-config`，文案分相）+ 首开保持确定性 + S0'''' 支线 C/D/E 终态 + 体积分列预算 + 门禁逐条等价重锚 + X-NDA-1~12 台账终态 | `src/background/next-drive-policy.ts`（**NEW**：`shouldNudge()` / `abnormalVerdict()` / `NUDGE_TEXT`；纯函数零 IO）· `next-registry/providers.ts`（`free-input.when` 分相 + `LLM_ABNORMAL_RISK` + `llm.abnormal` 第 13 行 + `DRIVER_DECLS_SRC` 第 13 行）· `next-registry/definition.ts`（`AI_ABNORMAL_CODES` **恰一处** / `AiAbnormalCode` / `AiNextPayload.abnormal?`）· `service-worker.ts`（`configured` 单源提升 + nudge 续呼 + `onFinish(outcome)` + `abnormal` 附加）· `ui/sidepanel/sidepanel.ts`（`noteLlmAbnormalFact` 折进既有 `risk` + `consumeAiNext` 只消费零第二分类器）· `test/ai-next-candidate.test.ts`（AI-N-16/17/18）· `test/driver-quadruple.test.ts` / `next-registry` / `free-input-next` / `size-*` / `docs/v4-supersession-ledger.json`（`xNdaLedgerFull` 7/1/4） | **⚠️ 有条件通过 / 0 阻塞**（review R1：24 文件 / 22 ✅ / 6 改进项 / 0 BLOCK；validate R1：V1~V14，12 ✅ + 2 ⚠️ / 0 fail / 0 阻塞 / 漂移 0；**作者口径端到端独立复核 22/0**）；`npm test` **1517 → 1525/0**（+8，两叶共 +18）· `ai-next-candidate` **28/0**（AI-N-1~18 + 定向）· `supersession` **56/0** · `gate-integrity` **27/0** · `size-ruling-vol3` **14/0** · `law8` **72/0** · `dead-end` **56/0** · `recommendation` **85** · `density` 242/0 · `insight` PASS · `e2e` PASS；**SG-NDA-03（18/18）全部可行**；体积 A 列 **605,239 → 606,652 B（叶2 +1,413；越叶预算 +0.6~1.4 KB 上界 13 B ⇒ 如实登记）**；review **I-1 `abnormalVerdict` 把「调用但空候选」误并入 `no-tool-call`**（健康 LLM 被误推「配置新 LLM」）→ 修复轮接收 `captured` + 新判据 + 两条注入必红 | 随父收口提交（工作树累积） |

> **任务总量**：20 + 21 = **41 任务 / 6 波**（叶1 3 波 / 叶2 3 波；S×10 / M×25 / L×6）；叶间**硬串行** `nda-1（validated）→ nda-2`（先立工具通道与安全闸，再收未配置 / 异常兜底与门禁口径 —— 交付序安全）；**3 个 spikeGate**（SG-NDA-01 `intercept` 捕获 + `rawArguments` 解析 + 短路 dispatch + 不上流 **8/8** · SG-NDA-02 `ai-led` 规则位等价重锚 + 密度可判 **12/12** · SG-NDA-03 nudge 回调内续呼 + 有界 **18/18**）**全可行**；每叶收尾**全门禁必须绿**。父 = 轻量规范容器（`phase=tasked → validated` / **不承接 build / review / validate**，产出总览型 `tasks.md` / `tasks.json`）。母体口径：**102 FR / 16 NFR / 25 EC / 32 AC / 22 NG / 10 US / 8 G**；13 ADR（父 ADR-NDA-001~009 + 叶 ADR-NDA-101/102/201/202）；PD-NDA-001~011 全部裁决 + PD-NDA-012~016 新登记；DC-NDA-001~014 全部落定；O-NDA-001~014 全部裁决；N-NDA-001~030 红线 / GAP-NDA-01~08 / R-NDA-901~910。

> **抽查数字与源核对（本轮）**：① `npm test` **1525** ↔ 两叶产物（叶1 `1517/0` → 叶2 validate-report §1 V2 独立复跑 **1525 passed / 0 failed / rc=0**）**一致**；② `dist/sidepanel.js` **606,652 B** ↔ 源 `packages/web-cli-plugin/test/size-baseline.ts`（`SIDEPANEL_BASELINE_BYTES = 606_652` / `SIDEPANEL_FINAL_ARTIFACT_BYTES = 606_652` / `finalArtifactBytes: 606_652`；`authorConfirmation = pending-author-line`）**逐值一致**（本轮 `ls -l dist/sidepanel.js` 实测 = **606652 B**）；③ `background.js` **1,666,653 B** ↔ 实测 `ls -l dist/background.js` = **1666653 B**（B 列不计账；NDA-2 R1 修复轮 +59 B 在册）**一致**；④ **档位 614,400 / 绝对上限 675,840 / 生效上限 636,984** ↔ `test/size-ruling-vol3.test.ts` + 两叶 validate（`floor(606,652 × 1.05) = 636,984`；`606,652 < 614,400` ⇒ 未跨档；距档 **7,748**）**一致**（历史两次升档值 `563,200→614,400`、`619,520→675,840` 与 `pending-author-line` 逐字保留，未被改写）；⑤ **冻结面 sha** ↔ 实测 `sha256sum`：`content.js` = `52a826205553b46a896ccad54225d63ba62f5f7fe7c969a9bc2e655448d5b5f6`（177,076 B）、`pick-layer.js` = `77796babd9c93893542195424d160e0877d8acca4142f8faf2232e217fbd575e`（34,358 B）**一致**；⑥ **保护段 sha** ↔ 两叶 validate 分段复算：journey `[43484,59347)` / `7b309258…`、binding `[107780,115930)` / `be9ad0e9…` **双绿 keep** 一致；⑦ **X-NDA 台账** ↔ `docs/v4-supersession-ledger.json#xNdaLedgerFull`（`counts = {superseded:7, keep:1, no-supersession:4, keepSubitems:9}`；`xNdaLedger` 12 行 / `xNdaGateReconciliation` 25 行）**逐值一致**；⑧ F-37 段起点 `npm test` **1507** / sidepanel **604,602 B** ↔ 父 `state.json#domainBaseline`（`npmTestCount: 1507` / `sidepanelBaselineBytes: 604602`）＋ 承 **F-36 父收口**（ROADMAP v1.33.0，`103e981`）**一致**。

---

## 4. 门禁总账（末轮实测原文，计数只增不减）

| 门禁 | 末轮实测 | 备注 |
|------|:--:|------|
| `npm test`（node 全量） | **`1525 / 0 / rc=0`** | F-37 起点 **1507** → **1525**（**F-37 段 +18**：1507 → 叶1 **1517**（+10）→ 叶2 **1525**（+8）；起点 1507 承 F-36 父收口 `103e981`） |
| `ai-next-candidate`（node） | **28 / 0** | 叶1 判据 11 → **14**（AI-N-12 schema 单源 / AI-N-13 无条件捕获 / AI-N-14 合成 output / AI-N-15 intercept 短路永久回归）；叶2 → **28**（AI-N-16 nudge 有界 / AI-N-17 `abnormalVerdict` captured 边界 / AI-N-18 兜底 provider）+ `AI-N-17` 定向 1/0；计数只增 |
| `test:supersession`（元台账） | **56 / 0** | **红线终核**（content / pick-layer / `KIND_SET` 40 / 特权恒 gesture / consent 不代答 / `requestTurn(` 恰 1 / 法八 / 零宿主 / `zeroDiffFiles` / manifest / `pending-author-line`）；`xNdaLedger` **12 行** + `xNdaGateReconciliation` **25 行**（三态齐 / 无「未处置」/ `assertionsRemoved` 全 0）+ `xNdaLedgerFull` **7/1/4**（53 → 55 → **56**） |
| `test:gate-integrity`（元门禁） | **27 / 0** | `CHROMIUM_GATES === 9` **逐字不动**；受审集合只增；`assertionsRemoved === 0`；`ai-next-candidate` 在受审集合内且出现恰一次 |
| `test:size-ruling-vol3` | **14 / 0** | 体积终态机核：基线 **606,652** / 生效上限 **636,984**（= `floor(606,652 × 1.05)`）/ 档位 614,400 / 绝对上限 675,840；边界 ⇒ 必红 |
| `test:law8` | **72 / 0** | 法八四面零明文（65 → 69 → **72**）；工具参数 / `description` / 合成 output / 留痕面；★ NDA-1 ⑫ 由「空转恒真」改为「真实判红」（正控 + 负控 + 反证三段） |
| `test:dead-end`（Chromium） | **56 / 0** | ★ 零死端不回归（53 → **56**） |
| `test:recommendation` | **85 / 0**（采样末值） | ★ 只增（81 → **85**）；环境时序 flake（三跑 85/0 · 84/1 · 83/3，失败项随复跑漂移 `probe.steady`，KL-N-10） |
| `test:insight`（Chromium） | **125** | ★ 只增（保段；无降级） |
| `test:density`（Chromium） | **242 / 0** | ★ 保段（单卡 / 3-chip / 7/15·9/20·17/35 阈值逐字不动） |
| `test:s0-self-driven`（Chromium） | 环境 flake（隔离复跑 ×2） | 叶1 `96/2`、叶2 `101/2 · 100/3`；**`probe.steady` 时序 flake**，失败成员随复跑漂移；叶内新增判据在全部复跑中恒绿 ⇒ 判环境性、`KL-N-10` 不阻塞 |
| `test:binding`（保护段） | **192**（keep 字节中立） | 保护段 `[107780, 115930)` / sha `be9ad0e9…` ；保护段字节级经 `test:supersession` 双绿 |
| `test:ui`（journey，保护段） | **171**（keep） | 保护段 `[43484, 59347)` / sha `7b309258…`（`protectedRanges` 恰 2 段 / 零换锚） |
| `driver-quadruple` · `next-registry` · `free-input-next` · `driver-timings` · `op-wiring` · `op-three-tier` · `parity` | 全绿（等价重锚 / 升级） | 声明表 **13↔13** / NR-10 **13** / `free-input.when` 分相 / 时机源恰 **5** / `requestTurn(` 恰 **1** / op 三档 **9** / `parity` 新 `pluginExtra`（`next` reason+basis 非空）—— 断言零删除、判据等价重锚 |
| `npm run typecheck` / `npm run build` / `test:e2e` | **0 error / rc=0 / PASS** | fixture + LGDL Workbench 全链；构建后冻结面 / 体积不变 |

**纪律**：门禁**严格串行**（一次一个 Chromium，`finally` 自清 profile）；计数**只增不减**、断言**零删除零降级**（`assertionsRemoved = 0`；size 类删除行 = 判据值**等价重锚** + 指针前移）。

> **门禁三态处置（逐条，终态取自 `xNdaGateReconciliation` 25 行）**：**new 1**（`ai-next-candidate` 改写为工具通道口径，AI-N-1~14）+ **rewritten 1** + **upgraded 3**（`parity` / `recommendation-sources` / `driver-quadruple`）+ **equivalent-rewrite 16** + **kept 4**；`CHROMIUM_GATES === 9` **不动**（只追加断言，零新增 Chromium 门禁文件）；**逐行 `assertionsRemoved = 0`**。

---

## 5. 体积总账 + 未升档 + 作者行确认

| 产物 | 末轮登记值 | F-37 段变化 | 说明 |
|------|:--:|:--:|------|
| `dist/content.js` | **177,076 B** | **0（零容差，全程未动）** | sha256 `52a82620…` 逐字节不变（产出通道全在 SW / 面板侧，冻结面零触碰） |
| `dist/pick-layer.js` | **34,358 B** | **0（零容差，全程未动）** | sha256 `77796bab…` 逐字节不变 |
| `dist/sidepanel.js` | **604,602 → 606,652 B** | **+2,050 B（≈ +2.00 KiB）** | 逐叶五要素重登记（叶1 正增量 `+637` / 叶2 正增量 `+1,413`），每轮均披露前后值 / 日期 / 来源 / 构建命令 / 理由 / 历史保留 + 逐模块 metafile 归因（`nda1Rows` / `nda2Rows`） |
| `dist/background.js`（B 列） | **1,666,653 B** | **不计账**（`next-tool.ts` / `next-drive-policy.ts` NEW + SW 装配归因在册） | B 列 SW 优先口径；NDA-2 R1 修复轮 `1,666,594 → 1,666,653`（+59 B）亦在册 |
| **档位 `tiers`** | **614,400 B** | **未动（本 Feature 段无升档）** | 未跨档位（606,652 < 614,400，余量 **7,748 B**） |
| **绝对上限** `absoluteCeilingBytes` | **675,840 B** | **未动** | `= 614,400 × 1.10` |
| 生效上限 | **636,984 B** | `floor(606,652 × 1.05)` | 容差 **5% 未动**；现余量 **30,332 B**（距生效上限） |
| **`authorConfirmation`** | **`pending-author-line`（⏳ 待作者一行）** | — | **未伪称已确认**；承接 v5.5 两次升档的历史确认事项，作者一行可否决改值 |

**sidepanel 增长链（F-37 段，逐叶实测）**：
`604,602`（F-37 起点，承 F-36 父收口 `103e981`）→ **605,239**（叶1 收口，Δ **+637** ≈ 0.62 KiB）→ **606,652**（叶2 收口，Δ **+1,413** ≈ 1.38 KiB）= **+2,050 B ≈ +2.00 KiB**。

**逐叶预算结算（诚实登记）**：

| 叶 | 叶预算（父 §5.14.1 / ADR-NDA-008 §② 分列） | 实测 | 超预算 | 处置 |
|---|--:|--:|--:|---|
| nda-1 | +0.1~0.5 KB | **+637 B ≈ 0.62 KiB** | **越（+637 > +0.5 KB 上界）** | **显式诚实登记、不停机**（不删判据 / 不放宽容差 / 不搬列规避） |
| nda-2 | +0.6~1.4 KB | **+1,413 B ≈ 1.38 KiB** | **越（+1,413 > +1.4 KB = 1,433.6 B 上界 13 B）** | **如实登记不停机**（在 spec §5.14.1 保守包线 +0.8~+2.4 KB 内） |
| **合计** | +0.7~+1.9 KB（工程估算）/ +0.8~+2.4 KB（保守包线） | **+2,050 B ≈ +2.00 KiB** | 在保守包线内、超工程估算上界 | **如实登记不停机**；**未跨档位 / 未触 EC-NDA-016 三分支** |

### 体积档位（作者行确认事项 —— 显著提示，承接 v5.5 两次升档）

| # | 触发轮 | 档位 | 绝对上限 | 生效上限 | 依据 |
|:-:|--------|------|---------|---------|------|
| 1 | **v5-2 R1（F-32，2026-09-22）** | `512,000 → 563,200` | `→ 619,520` | `floor(547,558×1.05) = 574,935` | F-32 父收口 §5（越档位停机 → 编排器裁决① → 显式升档） |
| 2 | **v55-2 小修轮（F-33，2026-09-23）** | `563,200 → 614,400` | `619,520 → 675,840` | `floor(573,424×1.05) = 602,095` | ADR-V55-011 §4（`ceilTo50KB(563,780) = 614,400 > 563,200`；「谁先越谁登记」） |
| — | **F-34（v5.5.1）· F-35（v0.11.2）· F-36（v0.11.3）** | **未动** | **未动** | `floor(591,946×1.05) = 621,543` → `floor(598,577×1.05) = 628,505` → `floor(604,602×1.05) = 634,832` | 未跨档位 ⇒ 无新增升档 |
| — | **F-37（本 Feature，2026-09-27）** | **未动** | **未动** | `floor(606,652×1.05) = 636,984` | 未跨档位、未触 **EC-NDA-016** 三分支 ⇒ **无新增升档**（两叶 Σ +2,050 未越档位；叶1 / 叶2 越叶预算已如实登记） |

> **给作者的一句话（显著提示，累计清单）**：**体积档位已两次升档**（累计 `512,000 → 614,400`、绝对上限 `563,200 → 675,840`）——**均由 v5.5（F-33）及更早轮次触发，本 Feature（F-37）未新增升档**。现行产物 **606,652 B**，距档位余量 **7,748 B**（**已进一步逼近档位** —— v5.5 / F-34 / F-35 / F-36 / F-37 逐轮消耗，后续轮需留意）、距绝对上限余量 **69,188 B**、距公式生效上限余量 **30,332 B**。**`authorConfirmation.status` 仍为 `pending-author-line`（⏳ 待作者一行确认 / 否决）** —— 本文件与各叶台账**均未伪称已确认**；作者一行可否决改值。F-37 段的 `pending-author-line` 为**承接历史确认事项**（非本 Feature 新增未闭合义务）。

---

## 6. 取代台账 X-NDA-1~12（两叶逐项终态，显式取代，判据等价重写，零静默删除）

> **来源**：`docs/v4-supersession-ledger.json#xNdaLedger`（12 行）+ `#xNdaLedgerFull`（终态汇总）+ `#xNdaGateReconciliation`（25 行三态）；`test:supersession` **56/0**。
> **终态 = 已发生（`superseded`）7 / 保留 1（9 子项）/ 未发生取代 4**；**授权立法例外 = X-NDA-1~5 的四处机制偏颇显式取代**（走 old→new 台账 + 理由 + 日期 + 落点；**不静默改写**任何 `validated` / `completed` 终态）。

| 编号 | 取代前（old，摘要） | 取代后（new，摘要） | 状态 |
|:--:|------|------|:--:|
| **X-NDA-1** | 产出机制 = 文本尾随 `next` 围栏块 + 严格 JSON 数组 + 正则解析（`ref-context.ts` 契约句 / `ai-next.ts` 解析） | **`next` 工具（function calling）** + `hooks.intercept` 捕获 + 合成 `ToolResult` 短路 dispatch + `rawArguments` 严格 JSON | ✅ **已发生** |
| **X-NDA-2** | 触发范围 = 仅并入有引用分支（`NEXT_CONTRACT_GUIDANCE` 只并入 `valid.length>0`） | **无条件**：配置 LLM ⇒ 对话结束即驱动（`ai-led` 独立规则位） | ✅ **已发生** |
| **X-NDA-3** | 未配置相仍铸末端「自由输入…」终端（`free-input.when` 恒真） | **确定性「去配置 LLM」引导** + 未配置不显示自由输入（`free-input.when` 分相 `!risk.includes(llmBlocked)`） | ✅ **已发生** |
| **X-NDA-4** | 无 LLM 异常兜底（`onFinish` 忽略 `outcome`；连续失败只 `maybeRecommend('idle')`） | **异常闭集三情 + 提醒补一次 + `llm.abnormal` 系统兜底**（复用 `op.llm-config`，文案分相） | ✅ **已发生** |
| **X-NDA-5** | `ai-next` provider `rule:'ref-action'` + `NEXTSTEP_PRIORITY` 恰 4 | **`ai-led` 独立规则位** + `NEXTSTEP_PRIORITY` **恰 5**（等价重锚 + 密度重锚 + 台账） | ✅ **已发生** |
| **X-NDA-6** | F-36 正确资产 9 项（`admitCandidate` 5 道链 / `AI_NEXT_LABEL_MAX=48` / `AI_NEXT_PARAM_MAX` / `pressDecision` 分层 / `tierOf` 单源 / `chat-result.aiNext` 加法字段 / 终端恒常驻 / R6 同因去重 / 留痕零明文） | **保留**（逐条**逐字不动**；本 Feature 只在其上换轨 / 分相 / 加兜底） | ⏸️ **保留（keep，9 子项）** |
| **X-NDA-7** | `ai-next-candidate` 门禁 AI-N-1 钉死围栏块 + 严格 JSON 数组（AI-N-1~11） | **改写为工具通道口径**（AI-N-1~14：schema 单源 / 无条件捕获 / 合成 output / intercept 短路；围栏块符号零命中反证） | ✅ **已发生** |
| **X-NDA-8** | `parity` `pluginExtras` 无 `next` 条目（工具面 34 基线 3 项保守分歧） | **新增 `next` 条目**（reason + basis 非空；`baseline-catalog.json` 零改） | ✅ **已发生** |
| **X-NDA-9** | `ai-next.timings` 仍 `['idle']`（零新增触发词） | **保持**（`DRIVER_TIMINGS` 恰 5 不动） | ⏸️ 未发生取代 |
| **X-NDA-10** | 首开（open / ready）确定性入口（`maybeRecommendOpenEntry` 复用 `'idle'`） | **保持**（首开确定性零 LLM 往返依赖；未配置首开由分相承接） | ⏸️ 未发生取代 |
| **X-NDA-11** | 提醒续轮的通道形态可能新增计数调用点 ⇒ 需等价重锚 `requestTurn(` / `maybeRecommend` | **未发生取代**（nudge 走 `chat` 回调内同回合续呼，`requestTurn(` 仍恰 1 / `maybeRecommend` 调用点不变） | ⏸️ 未发生取代 |
| **X-NDA-12** | 零新 LLM 往返契约（工具调用在同一回合内完成） | **保持**（工具调用同回合；提醒轮 = 唯一有界新增往返，计入 nudge 有界性） | ⏸️ 未发生取代 |

> **注**：未发生取代者**逐条登记 `no-supersession` 理由**（非空），老台账条目（v3 / v4 / v4.5 / v5 / v5.5 / F-34 / F-35 / F-36 段）**一律保留不动**；`xNdaLedgerFull.counterCheck` 一致性判据（逐条登记 / `status` 合法 / `counterCheck` 可定位且**不悬空** / `no-supersession` 理由非空 / 老条目逐字保留）+ `xNdaGateReconciliation` 25 行三态齐（无「未处置」）+ `assertionsRemoved === 0`；缺条 / ID 冲突 / 空字段 ⇒ 必红。

---

## 7. 过程中抓到的真问题（本流程的价值证明，不粉饰）

1. **叶1 review I-1：law8 ★NDA-1 ⑫ 运行面判据「虚绿」+ 机制陈述错误 + 潜在崩溃**（最高优先真问题）：`test/ui/law8-plaintext.mjs` 的 ⑫ 运行面直接调 `window.__v3.testing.aiNext`（**绕开** SW 的 5 道校验链），且调用点紧接上一单元而**未 `reset()`** ⇒ `lastProducedAt` 未复位 ⇒ `recommendNextStep` 被 `NEXTSTEP_MIN_INTERVAL_MS` **anti-flicker 短路** ⇒ `label()` **从未执行** ⇒「三面零哨兵」**恒真**；若短路消失，密钥形 label 会触发 `label()` 抛错 ⇒ **崩门禁（exit 1）而非判红**。**处置（修复轮 `R1-FIX`）**：重写为「**正控 + 负控 + 反证**」三段 —— ① `reset()` 清防抖时钟 ⇒ 生产者真跑（`suppression === null`），以「不清时钟 ⇒ 必被 interval 短路」为反证；② 哨兵形 label ⇒ 面板 `label()` 构造期 fail-closed **就地捕获**（崩溃 → 可判事实）∧ 流内 / chips / digest 三面零哨兵；③ `streamSeed` 直注哨兵 chip ⇒ 三面读数**必命中**（证明读数非盲）；机制陈述订正为「**面板侧第二道闸 fail-closed + SW 第 5 道链由 node 面 AI-N-6 证**」。**注入实测必红**（禁用 anti-flicker ⇒ 68/1 / 去掉 `label()` fail-closed ⇒ 68/1 / 反证 seed 换非哨兵 ⇒ 68/1；**逐条还原复绿**）。
2. **叶2 review I-1：`abnormalVerdict` 把「调用 next 但空候选」误并入 `no-tool-call`**（语义真 bug，健康 LLM 被误推「配置新的 LLM」）：LLM **调用了 `next` 工具但 `candidates:[]`** 是**合法「无建议」**（`next` 工具 `description` / `NUDGE_TEXT` 明确指示的健康路径），却被旧判定当作「未调用 ⇒ 异常」⇒ 系统会向一个**健康的** LLM 推「配置新的 LLM」。**处置（修复轮 `R1-FIX`）**：`abnormalVerdict` 接收 `captured`（`capture.captured`）—— `captured ⇒ null`（**不**附加 abnormal / 不推「配置新 LLM」），分支序插在 `all-blocked` 之后、`no-tool-call` 之前（`blocked > 0` 恒优先）；「真未调用」仍 `no-tool-call`（提醒 → 兜底链不变）。**新判据 AI-N-17 真值表 captured 边界行 + SW 接线单源检查 + S0''''-7 终态读数**（`emptySuggestionHealthy` / `trueMissIsAbnormal`）+ **两条注入必红实测**（① 删 policy `captured` 分支 ⇒ AI-N-17 FAIL `actual no-tool-call / expected null`；② 删 SW `captured` 入参 ⇒ 接线判据 FAIL；**逐字节还原后复绿**）。
3. **叶2 A 列 +1,413 B 越叶预算 13 B**：父 plan / ADR-NDA-008 §② 分列预算叶2 +0.6~1.4 KB，实测 **+1,413 B**（超上界 **13 B**）；**如实登记、不停机、不删判据、不放宽容差、不搬列规避**（在 spec §5.14.1 保守包线 +0.8~+2.4 KB 内）；**未跨档位**（606,652 < 614,400 ⇒ EC-NDA-016 三态皆「否」）。叶1 +637 B 亦越叶估 +0.1~0.5 KB，同口径登记。
4. **环境性 flake 家族（KL-N-10）**：① `s0-self-driven`（Chromium）`probe.steady` 相位 flake（叶1 `96/2` ×2；叶2 `101/2` / `100/3` 隔离复跑 ×2）—— **失败成员随复跑漂移 ⇒ 环境性**，且**叶内新增判据在全部复跑中恒绿**；② `recommendation` 三跑 **85/0 · 84/1 · 83/3**（失败项签名漂移）。**均如实登记、不伪称首跑绿；不动任何判据**。
5. **父级命名残留（跨叶）**：叶2 review I-2 发现 `plan.md §2.3` / `ADR-NDA-201 §③` 命名漂移（`LLM_ABNORMAL_CODES` / `AiNextAbnormalCode` vs 实现 `AI_ABNORMAL_CODES` / `AiAbnormalCode`）；叶内已对齐，**父级残留（`specs-tree-web-cli-plugin-v55-f-next-drive-accuracy/{plan.md,tasks.md,ADR-NDA-007}`）留父收口轮对齐** —— 本轮已对齐（含 `LlmAbnormalCode`；ADR-NDA-007 §① 闭集常量改为 import `definition.ts` 单源，§② 为唯一声明处）。
6. **两叶 review / validate 一致口径**：叶1 review R1 **⚠️ 有条件通过 / 0 阻塞**（22 ✅ / 4 改进项）；叶2 review R1 **⚠️ 有条件通过 / 0 阻塞**（22 ✅ / 6 改进项）；两叶 validate 均 **⚠️ 有条件通过 / 0 阻塞**，且 **validate 独立复跑**（叶1 V1~V18 含 5 组注入反证 + 3 组独立脚本；叶2 V1~V14 含 I-1 双向注入 + 作者口径端到端 22/0），**三重判定环境 flake 为「非回归」**（失败成员轮换 + 隔离复跑 + 基线比对）。

---

## 8. deferred / 已知限制清单（逐条，如实登记，不冒充已修）

| # | 项 | 来源 | 状态 |
|:-:|----|------|:--:|
| 1 | 叶1 review **I-1**：law8 ★NDA-1 ⑫ 运行面判据空转 + 机制陈述错误 + 潜在崩溃 | 叶1 review R1 | **已实际修复**（R1-FIX 三段判据 + 注入必红；见 §7-1） |
| 2 | 叶1 review **I-2**：`xNdaGateReconciliation` 补 `assertionsRemoved` 机核 | 叶1 review R1 | **已实际修复**（R1-FIX；`!==0 ⇒ 必红` + 两条注入反证） |
| 3 | 叶1 review **I-3**：intercept 短路无永久回归门禁 | 叶1 review R1 | **已实际修复**（R1-FIX 新增 AI-N-15 + 四类注入反证） |
| 4 | 叶1 review **I-4**：`RULE_PROVIDER_IDS` 注释 / ADR-NDA-102 §① 机制理由 / `text === NEXT_TOOL_NAME` 稳健性 | 叶1 review R1 | **注释-only 已订正**；另两处**如实登记**（不改已完成 plan 字节 / 不改生产行为；稳健性残余转 validate/叶2 复核） |
| 5 | 叶2 review **I-1**：`abnormalVerdict` 把「调用但空候选」误并入 `no-tool-call` | 叶2 review R1 | **已实际修复**（R1-FIX `captured` 分相 + AI-N-17 + 两条注入必红；见 §7-2） |
| 6 | 叶2 review **I-2**：命名漂移（`LLM_ABNORMAL_CODES` / `AiNextAbnormalCode`） | 叶2 review R1 | **已实际修复**（叶内 + 父级收口对齐；见 §7-5） |
| 7 | 叶2 review **I-3~I-6**：其余非阻塞改进项 | 叶2 review R1 | deferred（登记；不影响生产正确性 / 红线） |
| 8 | 叶2 A 列 **+1,413 B 越叶预算 13 B** | 叶2 build / validate | 如实登记不停机（在保守包线内；未跨档） |
| 9 | 环境性 flake 家族（KL-N-10）：`s0-self-driven` `probe.steady` / `recommendation` 失败项漂移 | 两叶 validate | deferred（隔离复跑判环境性；建议空闲机复跑确认；保护段字节级双绿） |
| 10 | 人工面 **M1~M6** 未执行 | 父 spec / 两叶 | ⏳（见 §9.2；headless 不可合成，不冒充 PASS） |
| 11 | 真实 LLM 观感（`PD-NDA-016`） | 叶2 validate | ⏭️ 不可合成（真实浏览器 + 人工观察） |
| 12 | `authorConfirmation.status = pending-author-line` | 承接 v5.5 两次升档 | 未闭合义务（作者一行可否决改值） |
| 13 | `F-29`（A2A 候选）未立项未排期 | ROADMAP 未来方向候选 | 保持原样不动（本轮区段字节未动） |

---

## 9. 两叶移交项汇总（owner = 父收口全清单 + 人工面清单 ⏳）

### 9.1 owner = 父收口（登记 / 口径 / 环境类，全清单）

| 叶 | 项 | 内容 | 处置 |
|---|:--:|------|------|
| 叶1 | **I-4 残余** | ADR-NDA-102 §① 机制理由 / `text === NEXT_TOOL_NAME` 稳健性 | 如实登记（不改已完成 plan 字节 / 不改生产行为） |
| 叶2 | **I-3~I-6** | 其余非阻塞改进项 | deferred（§8-7） |
| 两叶 | 父级命名残留 | `plan.md` / `tasks.md` / `ADR-NDA-007` 旧名 | **本轮已对齐**（`AI_ABNORMAL_CODES` / `AiAbnormalCode`） |
| 两叶 | 环境 flake | `s0-self-driven` `probe.steady` / `recommendation` 失败项漂移 | deferred（§8-9；建议空闲机复跑确认） |
| 两叶 | 体积 | 叶1 +637 / 叶2 +1,413（均越叶预算） | 如实登记不停机（§5；未跨档 / 未触 EC-NDA-016） |

> **已闭环（非 deferred）**：叶1 review **I-1 / I-2 / I-3**（虚绿判据 / 机核 / 永久门禁）+ **I-4**（注释订正）；叶2 review **I-1 / I-2**（语义 bug / 命名漂移）；**父级命名残留** ⇒ 本轮对齐。

### 9.2 人工面清单（全部 `⏳ 未执行`，不冒充 PASS）

| # | 人工面 | 说明 | 状态 |
|:-:|--------|------|:--:|
| 1 | **M1 · 工具通道真机相关性**（叶1） | AI 经 `next` 工具产出的候选在真机上是否与语境相关、可理解 | ⏳ 未执行 |
| 2 | **M2 · 无条件触发体感**（叶1） | 无引用上下文中对话结束即产出下一步是否自然（不再需引用） | ⏳ 未执行 |
| 3 | **M3 · 未配置引导体感**（叶2） | 未配置时「去配置 LLM」引导是否清晰（不再出现不可行的自由输入终端） | ⏳ 未执行 |
| 4 | **M4 · 提醒 / 兜底体感**（叶2） | 「提醒补一次」与「配置新的 LLM」兜底是否被理解（不误读为「AI 没反应」） | ⏳ 未执行 |
| 5 | **M5 · 密度观感**（两叶） | 混入 AI 候选后的推荐区观感（单卡 / 3-chip 上限内是否舒适） | ⏳ 未执行 |
| 6 | **M6 · 读屏可用性**（两叶） | AI 候选 label 与留痕行的可朗读性 | ⏳ 未执行 |

> **注**：headless 不可合成（真实观感 / 键盘 / 读屏 / 人工相关性判断）；真实 LLM 观感（`PD-NDA-016`）同理。本轮为**纯文档 / 状态收口（零代码 / 测试改动）**，未跑门禁 / 构建 / Chromium。人工面逐项标注 `⏳`，**不得冒充 PASS**。v5 / v5.5 / v5.5.1 / v0.11.2 / v0.11.3 人工面清单**零改写、并列不覆盖**。

---

## 10. 建议的下一步

**A. 真机验收（最高优先，D 级亲验）**
1. **真机验收工具通道核心场景**：在已配置 LLM 的面板上对话结题 ⇒ 观察 LLM 是否经 **`next` 工具**（而非文本围栏块）产出下一步、chips 是否据此更新；再验证**无引用上下文**下亦产出（无条件）、**未配置**时给「去配置 LLM」引导（无自由输入终端）。
2. **提醒 / 兜底链真机走查**：构造「LLM 未调用 `next` 工具」⇒ 观察是否**提醒补一次**；构造「LLM 坏」⇒ 观察是否给「配置新的 LLM（切换 / 重配）」兜底；验证**健康空候选**（`candidates:[]`）**不**被误推兜底（I-1 修复的可观测面）。

**B. 作者一行决策（阻塞性最低、但必须由作者给出）**
3. **体积档位历史确认 / 否决**（承接 v5.5）：档位 **614,400**（累计 `512,000 → 614,400`）/ 绝对上限 **675,840**（累计 `563,200 → 675,840`）/ 生效上限 **636,984**（现行产物 606,652 B，**距档仅 7,748 B** —— **已进一步逼近档位**，后续轮需留意）。本 Feature **未新增升档**。`authorConfirmation.status` 仍 `pending-author-line` —— **作者可一行否决改值**；确认后该义务才算真正闭合。
4. **合 main / 发布时机由作者决定**：v1（F-14）/ v2（F-27）/ v3（F-28）/ v4（F-30）/ v4.5（F-31）/ v5（F-32）/ v5.5（F-33）/ v5.5.1（F-34）/ v0.11.2（F-35）/ v0.11.3（F-36）/ **v0.11.4（F-37）** 均在 `feature/web-cli-plugin`，**未合 main、未发布**（`main` = `2ddc922` 未动）。ROADMAP 已按 **v0.11.4 patch 主题**登记（`next 驱动机制修正`），文档版本 `1.33.0 → 1.34.0`。

**C. 后续候选（非阻塞）**
5. **叶2 I-3~I-6 / 叶1 I-4 残余的下一轮处置**：建议与 flake 家族（KL-N-10）系统性治理同轮。
6. **F-29（A2A 候选）**：未立项未排期，本轮一字未动；如要推进需作者立项。
7. **体积逼近档位**：距档 **7,748 B**，后续轮若增量较大需预置升档路径（ADR-NDA-008 / EC-NDA-016）。

---

## 11. 主题达成自评（对照作者口径「逐字」）

> **口径**：主题 = 作者 2026-09-27 口径 —— **顶层原则**「有配置 LLM 的时候，LLM 驱动；没有配置 LLM 的时候，系统驱动用户配置 LLM」+ **口径①**「对话结束如果 LLM 没有调用 next 工具，记得你要提醒 LLM，做好最后兜底，如果 LLM 始终无法给你 next（LLM 坏了等情况），那就应该由系统给出兜底的推荐，推荐用户配置新的 LLM 等操作」+ **口径②**「自由输入在没有 LLM 的场景下，是不可行的，只能给确定性操作」+ **价值锚**「只有准确无误、高可靠的做到这些，那我们之前做的 all-in-chat/next 才是有意义，有价值的」+ **承接 F-36 原裁决**「这个推荐对吗，是不是还是写死的，有连接 LLM 的情况下的原则是，AI 驱动呀，所以 next 也应该交给 AI 去驱动输出」。本 Feature 的题眼 = 把 **F-36 立住的原则**校正到 **正确的机制**（function calling 工具通道 / 无条件触发 / 未配置确定性引导 / 异常兜底链）。

| 维度（口径） | 达成度 | 证据 |
|---|---|---|
| **顶层原则（有/无 LLM 分相驱动）** | ✅ **达成且机核** | 已配置 ⇒ `next` 工具（AI 驱动）+ 已配置终端恒常驻；未配置 ⇒ 确定性「去配置 LLM」引导 + `free-input.when` 分相（`!risk.includes(llmBlocked)`）；两相判据**单源**（`risk.llmBlocked`），**作者口径端到端独立复核 22/0** |
| **口径①（提醒 → 系统兜底）** | ✅ **达成且逐类反证** | `shouldNudge` 五条件纯函数 + SW `chat` 回调内同回合续呼 + `nudgeUsed` **有界恰一次** + 防环 + 零计数漂移（AI-N-16）；`abnormalVerdict` 闭集三情（no-tool-call / llm-failed / all-blocked）+ `captured ⇒ null` 分相（AI-N-17）；`llm.abnormal` 兜底 provider（复用 `op.llm-config`，文案「配置新的 LLM（切换 / 重配）」与未配置**分相**）；**两条注入必红实测** |
| **口径②（自由输入无 LLM 不可行）** | ✅ **达成且双向** | 未配置 ⇒ `free-input.when = false` ∧ 卡 `terminal !== true` ∧ 引导 `op.llm-config` 可达 ∧ **零死端**；已配置 ⇒ `when = true` ∧ `terminal === true`（R8 / F-35 不回归）；`test:dead-end` **56/0** |
| **价值锚（准确无误 / 高可靠）** | ✅ **达成** | 5 道校验链**逐字保留**（`admitCandidate` 函数体 sha256 HEAD 逐字节相同）；判定分层 `pressDecision` **diff = 0**；围栏块符号零命中（单一产出通道）；`parity` 反证「还原 PASS」声明行；`assertionsRemoved = 0` |
| **承接 F-36 原裁决（AI 驱动 next）** | ✅ **达成且机核** | `next` 工具进 `deriveTools()`（parity 反向机核）；`hooks.intercept` 捕获 + 合成 `ToolResult` 短路 dispatch（AI-N-15 真跑基座 `createAgentRunner`，`dispatchCalls === 0`）；`chat-result.aiNext` 装配保持；**零改基座** |
| **换轨是真换轨（围栏块退役）** | ✅ **达成且可判** | `NEXT_CONTRACT_GUIDANCE` / `FENCE` / `lastNextFenceBody` / `parseAiNextItems` / `AI_NEXT_FENCE_INFO` 在 `src/**` **零命中**；`refContextSegment` 无引用 ⇒ `''` 逐字；X-NDA-1 已发生（显式取代 + 台账） |
| **无条件触发（`ai-led` 规则位）** | ✅ **达成** | `ai-next.when` 逐字不读 refs（git diff 零命中）；注册恒发（已配置）；`NEXTSTEP_PRIORITY` 恰 5（`ai-led` 第 2 位）；`DRIVER_TIMINGS` 恰 5 不动 |
| **安全闸不可绕过（5 道校验链）** | ✅ **达成且逐类反证** | opId 在册（9）/ 三档清分（**gesture 恒拒**，复用 `tierOf` 单源）/ ref 有效 / param 在 `AskSpec` 内 / 越界 + 留痕；schema 是**软约束**、运行时 5 道链是权威（越界 param 注入 ⇒ 必拦） |
| **载体 / 法八 / 冻结面 / 零新 LLM** | ✅ **达成且亲核** | `KIND_SET` **40 逐字** ∧ 12 kind ∧ `REGISTERED_STRUCTURAL_HOSTS === []` ∧ `ACT_TO_OP` 恰 6；法八四面零明文（`law8` **72/0**）；`content.js` / `pick-layer.js` **全程逐字节未动**；`recommend.ts` 仍 **pure**（零 `fetch` / `chrome.` / 时钟）；工具调用**同回合内**完成 |
| **保护段 / 门禁守恒** | ✅ **达成** | journey `[43484,59347)` / `7b309258…` ∧ binding `[107780,115930)` / `be9ad0e9…` **keep 双绿**；`CHROMIUM_GATES === 9` 不动；`assertionsRemoved = 0`；X-NDA 台账 12/25/7-1-4 终态 |
| **剩余面（人工观感）** | ⏳ **待真机** | 见 §9.2（headless 不可合成 M1~M6）+ 真实 LLM 观感（PD-NDA-016）；**不冒充 PASS** |

**达成结论**：作者口径（**顶层原则 + 口径① + 口径② + 价值锚 + 承接 F-36 原裁决**）**全部达成且可 FAIL 反证**（工具通道真换轨 / 无条件触发 / 未配置确定性引导 / 提醒有界 / 异常闭集 / 兜底可达 / 五类注入必红 / 全部逐字节还原）；F-36 的正确资产与安全闸**未被削弱**（5 道校验链逐字 / 分层 diff=0 / 终端恒常驻 / 单卡与 3-chip / 规则表 / 保护段 keep 全部保段）；剩**人工观感**未执行，**不冒充 PASS**。

---

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建（v55-f-next-drive-accuracy 父收口 R1）：两叶 validated 汇总 + 主题达成结论（`next` 工具 / function calling 换轨 + `hooks.intercept` 捕获 + 合成 `ToolResult` + 触发无条件 + `ai-led` 规则位 + 未配置确定性引导 + 提醒补一次 + LLM 异常兜底 + 保留 F-36 正确资产）+ 数字总账（npm 1507→1525 · F-37 段 +18 · sidepanel 604,602→606,652 · 两叶 Σ +2,050 · 门禁 56/27/14/72/56/85/28/125/242 · X-NDA 终态 7/1/4 · 保护段 journey `7b309258…` / binding `be9ad0e9…` keep）+ **未升档（档 614,400 / 生效 636,984 / 绝对 675,840 / 距档 7,748）+ `pending-author-line` 承接 v5.5 两次升档** + 过程真问题 6 条（含两轮修复轮 I-1 真 bug / 叶2 越叶预算 / flake 家族 / 父级命名残留对齐）+ deferred/已知限制 13 条 + 两叶移交项汇总（owner=父收口 全清单 + 人工面清单 ⏳ M1~M6）+ 建议下一步 + 主题达成自评 | 2026-09-27 | SDDU Build Agent |
