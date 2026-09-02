# Archify 深度研究：给 LGDL 的借鉴与规避清单

> 研究任务产物 · LGDL 产品立场 · 面向作者的决策素材
> 日期 2026-09-02 · 分支 `feature/group-as-node`（v0.6.0 已发布）
> 素材：本目录 `archify-layout-secrets.md` v1.1 + `archify-usage-report.md` v1.2（两轮实战）+ LGDL 侧源码抽查核实
>
> **⚠️ 声明：本报告是 AI 提案性质的决策素材，不构成 ROADMAP 承诺。** 文中所有「建议排入 v0.x」的表述均为提案人的建议落点，涉及排期的一律需作者审视后裁决（口径同 `.sddu/specs-tree-root/ROADMAP.md:8`、`:402` 的素材甄别规则）。

**引用约定**：`usage-report.md:NN` / `layout-secrets.md:NN` 指本目录两篇 archify 研究文档；archify 内部源码落点（`render-*.mjs`、`bin/visual-check.mjs` 等）一律沿用 layout-secrets 的记载，本报告不越级引用未读源码。LGDL 证据用仓库根相对路径 `packages/...:行号`，**每个文件首现给出全路径，同文件后续引用可用短名**（如 `index.ts:NN`、`layered.ts:NN`）；本报告所有 LGDL 行号均为本次实测读取。

---

## 0. TL;DR（先给结论）

两个系统走同一条「确定性渲染」技术路线（`usage-report.md:93-98`），但**智能的落点分工正好相反**：

- **archify 把智能留给人**：作者（Agent）在 IR 里指定 `row/col/pos`，渲染器只做固定常量算术 + 机械门禁；确定性靠「作者排布 + 门禁验收」换得。两轮实战证明它稳定优雅，但代价是**决策前置给作者、约束后置给门禁**（`usage-report.md:162`）。
- **LGDL 把智能内化给引擎**：`.lgdl` 只含语义、零布局信息（`docs/design.md:5`），类型→布局算法、节点坐标、绕障走线全部由引擎自动决定（`packages/lgdl-layout/src/index.ts:120-155`、`packages/lgdl-router/src/index.ts:613-747`），确定性由确定性算法本身保证。

因此，**LGDL 该从 archify 借鉴的是「验收闭环」与「工程收据」**——把"输出可信"从架构信念升级为可验证的交付物；**该规避的是「把几何决策推给作者」与「约束后置才发现」**——这两条与 LGDL 的语义优先公理、AI-first 双层消费模型直接冲突（详见 §2.3）。

| 维度 | archify（可借鉴/可警惕） | LGDL（该坚守/该补齐） |
|---|---|---|
| 决策光谱 | 决策前置给作者（手排布局，默认网格命中 0 次） | 决策内化给引擎（语义进、全自动出） |
| 验收 | 双层门禁 + 4 视口 visual-check + JSON 收据（**值得搬**） | error-only 编译期校验，缺产物侧闭环（**该补**） |
| 约束发现 | 约束后置，返工成本在交付期（**引以为戒**） | 检查前置到 parse/layout 期（该保持并扩展） |
| 教训浓度 | workflow 类型实际不可用、收据-成品脱钩、假成功 | 类型可用性要测试证明、收据要绑成品 hash |

一句话：archify 的十四张图告诉 LGDL——**当引擎足够聪明后，"敢不敢放手"不再取决于算法，而取决于门禁与收据是否机械化。**

---

## 1. 研究方法与素材

1. **两轮实战、14 张图**：第一轮 LGDL 双全景 8 图（4 architecture + 3 dataflow + 1 sequence，`usage-report.md:11-37`）；第二轮 V2 技术全景重绘 6 图、9 包体系 @ d03dca4（architecture×3 + sequence×1 + dataflow×2，`usage-report.md:138-147`、`layout-secrets.md:6`）。两轮合计 **14 张**，全部通过 showcase 门禁（9 项检查 0 errors / 0 warnings）+ visual-check 4 视口。
2. **字节级回验**：V2 的 6 张 IR 用当前 skill 重渲染，sha256 与 git HEAD 交付 HTML **逐字节一致**（`layout-secrets.md:296`、`usage-report.md:143`）——确定性论断从"设计声明"升级为"跨会话复现的实测事实"。
3. **源码级机制拆解 + 论断回验**：layout-secrets 对五种 renderer、共享几何层、双门禁体系做逐文件拆解（`layout-secrets.md:29-145,149-211`），v1.1 增补 10 项论断回验（8 印证 / 2 修正 / 0 推翻，`layout-secrets.md:294-305`）；两处口径修正（收据时效性、投影字号经验带下探）是本次研究最值钱的反面教材（见 §4.4、§3 P1-2）。
4. **LGDL 侧抽查核实**（本报告新做，全部落到文件:行号）：
   - Sugiyama 四阶段：`packages/lgdl-layout/src/layered.ts:8-21`（模块头注释）、`:167-181`（DFS 去环）、`:44-75`（最长路径分层）、`:81-134`（barycenter 排序）、`:197-260`（坐标分配，NODE_SEP/RANK_SEP=80/96 见 `:209-210`）；
   - A\* 与质量评分：`packages/lgdl-router/src/index.ts:613-747`（routeAStar）、`:148-216`（routeEdge 16 组锚点 + quality）、`:754-812`（collapseGridPath）；
   - error-only 校验：`packages/lgdl-core/src/parser.ts`（本次 grep：42 处 `severity:'error'`、0 处 `severity:'warning'`；唯一 warning 例外在 mermaid-import）；
   - DSL 零布局信息：`docs/design.md:5-15`、parser 字段 allowlist `packages/lgdl-core/src/parser.ts:26-28`；
   - 溯源映射 data-lgdl-loc：`packages/lgdl-render/src/index.ts:594-598,665,938`；
   - 测试基线：**435 例**（本次 `npm test --workspaces` 实测：core 267 + render 21 + router 8 + web 35 + web-cli 79 + web-op-cli 11 + web-cli-base 14；cli/layout 无测试为 0）。

**研究边界**：archify 内部源码不随本仓库分发，其行号一律转引两篇素材文档的实证记录；凡无法双重核实的机制（如首屏 chrome 高度的 322px 推导）本报告不采信为立论依据。

---

## 2. 根本对照：同一路线的两种哲学

### 2.1 决策光谱：前置给作者 vs 内化给引擎

archify 的网格引擎第一行注释就自白：`Grid placement for architecture IR (#8). Not auto-layout — fixed cell math only.`（`layout-secrets.md:33`）。五种类型无一提供自动布局，作者必须在 IR 里给出 `row/col/pos`；默认网格常量在 V2 实战中**命中 0 次**——三张 architecture 图全部显式覆盖默认值（`layout-secrets.md:297`）。所谓"半自动网格"体感更像"手排 + 机械校验"（`usage-report.md:154`），archify 的确定性优雅是**作者逐节点排布换来的**。

LGDL 站在光谱另一端：`layoutDocument(doc)` 按 `doc.type` 自动分派布局（`packages/lgdl-layout/src/index.ts:139-154`），有真实分组的图自动走 `layoutGrouped` 两层布局（`:134-137,219`），超 120 节点自动降级网格（`:85,124-129`）；每条边由 `routeEdge` 生成 16 组锚点候选、逐组跑 A\*、按质量分取最优（`packages/lgdl-router/src/index.ts:148-216`），作者**完全不接触坐标**。DSL 侧的 allowlist（`parser.ts:26-28`）让任何"坐标进语法"在 parse 期即被拒绝。

| 决策项 | archify | LGDL |
|---|---|---|
| 坐标来源 | 作者在 IR 给 `row/col/pos` | 引擎（Sugiyama/泳道/径向等） |
| 选错类型的成本 | 作者改 IR 甚至换类型（workflow→dataflow） | 引擎内部分派，语法层无类型布局选项 |
| 失败时谁兜底 | 两轮聚焦修复把人拉回合格解（`layout-secrets.md:197`） | 算法迭代（上轮调研建议已在代码落地） |
| 作者的不可替代性 | 高（每个节点的几何心智负担） | 低（AI 可高频增量操作） |

**关键差别不是"谁省力"，而是"失败时谁兜底"**：archify 把布局知识放在作者脑子里，出问题时靠两轮聚焦修复；LGDL 把布局知识固化在算法里，出问题时应该靠引擎修正。上一轮 edge-routing 调研的三条建议（`summary.md:15,84-86`：`clear 8→14`、真实交叉计数、贴边硬罚）已在本仓库代码落地——`clear=14`（`index.ts:620`）、贴边硬罚 `-1e5`（`index.ts:195-197`）、穿越真实计数每次 -1000（`index.ts:201-204`）——**证明"决策在引擎内做增量、不推给作者"这条路在 LGDL 已经运转过一次**。

### 2.2 确定性的两种实现：纯函数+常量 vs 确定性算法

| | archify | LGDL |
|---|---|---|
| 坐标来源 | 固定常量表 + 纯函数算术（`layout-secrets.md:19`）；`Math.random/Date.now` 检索为零（`:204`） | Sugiyama 四阶段 + barycenter 文档序 tie-break（`layered.ts:108-132`）；A\* 网格搜索 |
| 走线 | 确定性候选序，第一个通过净空的即采纳（`layout-secrets.md:118-124`） | 16 组锚点 × 网格 A\*：`clear=14` 膨胀 + `bendW=30` + 方向回退罚（`index.ts:613-747`） |
| 交叉 | showcase 下把交叉判 error，作者手工避让（`layout-secrets.md:143`） | 路由期真实计数：穿越已布边每次 -1000（`index.ts:201-204`） |
| 稳定性 | O(n) 纯函数，天然字节级稳定（sha256 实证 6/6） | 确定性算法，稳定但**脆弱**——参数一改全图平移 |
| 回归暴露 | 常量微调只影响局部，可用 compare 门禁看 diff | 无字节级快照，barycenter/A\* 改动可能无感破坏全部历史图 |

推论一：**archify 的确定性廉价**，改动不惊扰；LGDL 的确定性是算法级的，**更需要快照回归兜底**（见 P1-3）——这正是 archify 字节级实证反向照出的 LGDL 短板。

推论二：archify 用「固定候选序 + 首个净空者」把走线复杂度压到 O(n)（`layout-secrets.md:232`）；LGDL 的 A\* 每边 16 组锚点全量搜索，质量更高但成本更大。这不是缺点——LGDL 的边数通常受限于语义图规模，且 `layoutGrouped` 的两层结构天然限制单层规模；但**大图性能要有预算**（已有 >120 节点降级网格的开关，`index.ts:124-129`），避免把 archify 的"小而精"问题换成 LGDL 的"大而慢"问题。

### 2.3 适用场景差异：双层消费模型的战略印证

- **archify 的场景**：Agent 会话内生成、人类浏览的叙事资产。产物是 ~700KB 自包含交互 HTML（`usage-report.md:76,159`），一次生成、低频修改，手排与人工目检成本可摊薄；"人精修"正是它的卖点。
- **LGDL 的场景**：人类理解 → AI 经 CLI 增量操作的**双层消费模型**（`usage-report.md:90`；作者确认事实 `ROADMAP.md:412`）。AI 高频操作、低试错容忍，每次修改是原子增量命令（ADR-008，`docs-tree-root/adr-index.md:168-184`），输出是轻量静态 SVG + 纯文本 status。

**战略印证**：当操作者是 AI 且频率高，任何"把坐标决策推给调用方"的机制都会把成本乘以操作次数——archify 的 workflow 一例两轮修复、第二轮回避到 0 张（`usage-report.md:153`），本质就是"让 Agent 在几何约束里试错"的成本具象化。LGDL 若引入坐标覆盖语法，等于把同一成本装进每次 AI 增量操作。archify 的双轮实战因此**反向确认**了 LGDL"语义优先公理先行 + AI-first"的定位（`ROADMAP.md:16,77`）。

**对称观察**：archify 若未来要支撑大图，缺的正是 LGDL 的自动分层与真实绕障（`layout-secrets.md:234`）——两套哲学各配一个消费模型，互不侵犯；LGDL 不必羡慕 archify 的"人可微调"，但必须补 archify 被实战逼出来的**机械化验收纪律**。

### 2.4 门禁闭环的主体差异：谁在环，谁重新输出

这一节修正一个容易被照搬掩盖的根本差异——**archify 的门禁与 LGDL 的门禁，拦截对象不同、失败后的出路不同、所处阶段也不同**：

| | archify | LGDL |
|---|---|---|
| 门禁拦截的是 | 作者摆的坐标（人的决策） | 引擎算的坐标（算法的决策） |
| 失败后的出路 | 作者改 IR 里的 row/col 重渲（**作者在环**） | 只有引擎开发者改算法（**用户在环外**） |
| 门禁所处阶段 | 使用/创作阶段（使用即创作，作者实时在环） | 引擎开发阶段（使用≠创作，作者不接触布局） |
| 谁重新输出 | 作者本人 | 只有引擎开发者 |

**根因是确定性**：LGDL「同样的语义输出同样的结果」意味着用户改不了输出——改坐标？DSL 里没有（allowlist 拒绝）；改语义？语义变了输出的就是另一张图，不是「同一张图重新输出」。所以 archify 那种「门禁失败 → 作者修 → 重渲」的闭环在 LGDL **不存在**，把 archify 式门禁照搬到用户使用阶段，会从「质量保证」退化成「拒绝服务」：用户画图、引擎输出标签重叠、门禁报错、用户既不能改坐标改语义又不是那张图——手足无措。

**因此本节借鉴清单的门禁/收据建议，全部落位「引擎开发阶段」**，形态是引擎开发者的回归资产（CI 审计、golden 快照、视觉评审机械化），拦截的是「改算法引入的回归」，不是「用户画的图不合格」。

**LGDL 已有这个形态的雏形**：`docs/reviews-2026-08-24/` 的 AI 视觉评审闭环——用视觉模型评审 9 张示例图、暴露渲染 bug、驱动 render/layout 改算法（`ROADMAP.md:106`）。这就是 LGDL 的「开发期门禁」，只是执行者是「人+视觉模型」，本轮要借鉴的是把它**机械化 + 收据化**，而非新增一套用户运行时检查。

---

## 3. 借鉴清单（P1→P3，按投入产出排序）

> 每条格式：archify 机制 → LGDL 现状差距 → 落地建议（含验收方式）。落点标注的版本为提案，需作者裁决。
> **落位声明（v1.1 修正）**：本节全部门禁/收据建议均属「引擎开发阶段」的回归资产，非「用户使用阶段」的运行时拦截——因 LGDL 确定性下用户改不了引擎输出，门禁失败只有引擎开发者能重新输出（§2.4）。

### P1-1 产物侧净空/几何审计（双层防御的第二层）

**archify 机制**：renderer 内 `validateXxx()` 抛结构化诊断只是第一层；成品 HTML 还要过 9 项 artifact checker（single_svg / finite / orthogonal_arrows / label-route-clearance / crossings / corridors / border-runs / route-rhythm / legend-clearance）+ composition 汇总（showcase 下 error、standard 降 warning），`ok = 检查全过 && composition 非 fail`（`layout-secrets.md:168-181`）。其中 `cleanFlowProblems` 的"边穿节点"是**连无质量档都生效**的正确性硬门禁（`layout-secrets.md:133`）。设计意图：路由器软评分漏网的解，在交付前由独立视角拦截。

**LGDL 现状差距**：A\* 内置硬障碍（`index.ts:637-645`）+ quality 择优（`:208-216`）质量高，但**没有产物侧独立审计**。最尖锐的缺口在兜底路径：`routeAStar` 无解时静默回落 `orthogonalize` 启发式（`index.ts:217-220`），这条"最差解"路径**零专项测试**（v0.7 F-11 才规划 R-D3/R-D5，`ROADMAP.md:157`）；render 的 21 例 svg 测试断言"包含某结构"，不审计"整图无穿边/无斜段/无 NaN"。

**落地建议**（v0.7，与 F-11 合并执行）：
1. 在 `@lgdl/lgdl-render` 出口加纯几何审计函数：非有限坐标（对应 archify finite 检查）、非正交斜段（orthogonal）、边穿节点/标签压框、泳道与时间轴越界——**失败即 exit 非零**，与 error-only 哲学同构：不是提示，是拒绝（对齐"不带病交付"共识 `usage-report.md:96`）；
2. 审计通过后写一行摘要到 stdout（节点/边数、审计项数），为收据文化打底；
3. 补 `orthogonalize` 与 `routeRectilinear` fallback 的专项测试（F-11 的 R-D3/R-D5 载体）。

**验收方式**：9 类型 × 每条渲染命令 exit 0 + 审计全过；人为注入穿边场景的 fixture 断言 exit 非零。审计函数留在 router（纯几何）或 render（需文本度量）由实现决定，建议 router——保持 render 只画不判。

### P1-2 投影字号预算（先算后渲染，而非事后发现）

**archify 机制**：`desktop-readability.mjs` 用 930px 可读宽模型估算投影字号，6px 为下限；visual-check 对每个 `data-node-label/boundary-label/context` 文本算 `sourceFontPx × scale` 记最小者（`layout-secrets.md:186-187,230`）。反面教材在 V2：9 包体系把最小投影字号压到 6.54px，距 6px 门槛仅 0.54px，且**只有交付时 checker 才发现**（`usage-report.md:155`、`layout-secrets.md:310`）——预算必须设计期算，不能 checker 期追。

**LGDL 现状差距**：render 输出固定像素画布（`width=layout.width,height=layout.height`，`packages/lgdl-render/src/index.ts:431`），节点宽由 `textWidth(label)+24` 自适应（`packages/lgdl-layout/src/index.ts:169`），字号 11-15px 固定。**问题在缩放**：SVG 被嵌入容器/文档等比缩小后，实际可见字号低于设计值——工作台预览、PNG 内嵌（`scripts/gen-examples.mjs`）都会遇到，当前没有任何"缩放后最小字号"的预算或告警。CJK/Latin 的 `textWidth` 按 1.0/0.62 字宽估算（`packages/lgdl-layout/src/index.ts:79`），已有度量基础，只是没有"投影预算"这一层。

**落地建议**（P1，成本极低）：
1. layout 阶段为每种图类型计算"按参考容器宽缩放后的最小字号"，写进 LayoutResult 或独立几何摘要；
2. CLI `render` 输出预算值（可 warning，因为 SVG 本身合法——呈现层预算不进 core 的 error-only 路径，保持 ADR-005 边界清晰）；
3. Web 工作台预览据此在缩放低于安全值时报提示。

**验收方式**：9 类型各取一张"长标签压力图"fixture，断言预算计算值可复现（确定性）；给出"某宽下必小于 6px"的 fixture 并断言提示触发。参考 archify 口径：**预算进设计、不进 checker**（`layout-secrets.md:316`）。

### P1-3 确定性哈希回归（把"同输入同输出"钉进测试）

**archify 机制**：确定性被字节级实证（6/6 sha256 跨会话一致，`layout-secrets.md:296`、`usage-report.md:143`），配套 deliver 的规格快照 + 成品 sha 收据（`layout-secrets.md:206-208`），compare 有 base/head canonical 化保证"格式化重写不改 hash"（`:206`）。

**LGDL 现状差距**：`docs/design.md:29` 承诺"语义不变则输出不变"，但 **render 测试断言的是"输出包含某结构"（`packages/lgdl-render/src/svg.test.ts:187-193` 的 `includes(...)`），没有一条断言整颗 SVG 字节不变**。布局是 LGDL 核心卖点，且 `NODE_SEP=80/RANK_SEP=96`（`packages/lgdl-layout/src/layered.ts:209-210`）这类参数一改、barycenter 扫描一动，全部历史图可能无感平移——没有快照，回归只能靠人眼扫 `examples/`。

**落地建议**（v0.7 F-06 一并收口，`ROADMAP.md:156`）：
1. 给 `examples/` 每张图建立 golden SVG 快照（sha256 + 字节文件），CI 断言重渲染逐字节一致；
2. 布局/渲染改动必须显式更新快照并走 diff 审阅（防止"悄悄全图变丑"）；
3. 确定性 tie-break（barycenter 的文档序，`layered.ts:116-118,127-129`）补注释+测试，固化"文档序即稳定性契约"。

**验收方式**：新增 `layout-golden.test`，断言 `render(parse(file))` 与快照逐字节一致；本次实测基线 435 例上加快照层后只增不删。

### P2-4 渲染验收闭环（visual-check 4 视口 + JSON 收据）

**archify 机制**：`visual-check` 无头 Chrome 在 1440×900 / 1600×1000 / 1920×1080 / 2048×1320 四档实测 containment（`scrollW≤innerW && scrollH≤innerH`）+ 投影字号 + viewer chrome 间隙，落 JSON 收据 + light/dark 双主题截图；**收据恒置 `visualReview:"pending"`——自动化只出证据、不出验收结论**（`SKILL.md:92` 口径，`layout-secrets.md:190`）；从不修改成品（运行前后比对成品 sha256，`:192`）；sidecar 原子写（`:192`）。

**LGDL 现状差距**：无浏览器实测闭环。现有视觉验证是 ① 批量人工评审（`docs/reviews-2026-08-24/`，两轮 9 张示例驱动 render 改进）② 一次性 `scripts/vision-review.mjs`（PNG 送 doubao-seed-2-0-lite，需 key）——两者都是"人/模型看一次"，不是**每次渲染自动产出的机械化收据**。

**落地建议**（P2，v0.8+ 候选或审视池 P-02 转正后执行，`ROADMAP.md:344`）：
**定位修正（v1.1）**：本条是把 §2.4 所指「开发期人工评审」机械化，产出的是引擎开发的回归收据（对 examples 全量跑、跑在 CI），不是给用户运行时加的检查——用户侧只保持 error-only 语义校验，布局质量问题一律由引擎开发阶段消化。
1. 先做"轻量收据"：Web 工作台每次预览后记录几何收据 JSON（画布尺寸、溢出标记、最小字号预算，数据来自 P1-1/P1-2），**收据字段绑成品 hash**（规避 §4.4）；
2. 再做"浏览器收据"：CI 中对关键示例图跑无头渲染，出 4 视口截图 + JSON，与 P-02"CI 自动渲染"合并评估（`ROADMAP.md:344`）；
3. 全程采纳 archify 的诚实边界：收据永不自动声称"视觉合格"，截图只是证据（`layout-secrets.md:190`）——与 LGDL"假成功不可接受"的公理（§4.4）一致。

**验收方式**：收据 schema 版本化（`{schemaVersion, status, capture, artifactHash, visualReview:"pending"}`）；成品变更后旧收据自动标记 stale。

### P2-5 结构化机器可读诊断（code + supportedFixes）

**archify 机制**：validator 把每个错误转成 `code: schema/<keyword>` + subject（diagramType+path+identity）+ evidence + 按 keyword 映射的 `supportedFixes`（`layout-secrets.md:162`）；geometry 门禁与 CLI 顶层同构（`layout-secrets.md:196`），CLI 打印自动拼 `Fix: …`（`:196`）。schema 校验失败还带 JSON pointer 注解到最近元素 id/label，让 LLM 知道改谁（`validator.mjs:6-26`，`:161`）。这让 Agent 能"对号入座"地修复，"两轮聚焦修复"因此可机械执行。

**LGDL 现状差距**：错误已带可定位路径 `location`（`packages/lgdl-core/src/parser.ts:59-63,85,93` 等），CLI 打印 `✖ [nodes[0].kind] Unknown node kind …`（`packages/lgdl-cli/src/shared.ts:21-23`），web 端 `locate.ts` 可解析成源码字符区间（`packages/lgdl-web/src/locate.ts:1-28`）——人类可读、位置可点，但**无错误码、无机器可读修复建议**，AI 只能从 message 文本猜修法（`usage-report.md:104` 已有同款对照结论）。

**落地建议**（P2）：
1. 给 `LgdlIssue` 增加稳定 `code` 字段（`unknown-kind` / `duplicate-id` / `bad-ref` / `unknown-field` …），parser 各检查点顺手标注（parser 已有 42 处 error 点，成本主要在枚举命名）；
2. CLI `validate/status` 支持 `--format json` 输出 `{code, location, message, supportedFixes?}`——supports 修复映射先做最常用的 4-6 个 code（对齐 archify"不追求全量，追求命中率"）；
3. 语义不变：只加结构化外壳，不加 warning 档（ADR-005 边界，`docs-tree-root/adr-index.md:124`）。

**验收方式**：parser.test 为每个 code 建一个 fixture 断言 code 稳定；`--format json` 输出可被 `jq`/AI 直接消费；AI 实战用例验证"按 code 修复"通过率不降。

### P2-6 原子交付（防半成品污染）

**archify 机制**：`deliver` 把规格冻结成 `specification.snapshot.json` → 用冻结副本渲染 → 跑 checker → 全过才 `rename` 原子落位；失败时旧成品原样保留，staging 目录 finally 清理（`archify.mjs:876-936`，`layout-secrets.md:208`）。visual-check 写 sidecar 也用 tmp+pid→rename 原子写（`layout-secrets.md:192`）。「收据-成品脱钩」教训证明：**流程分段越细，越需要原子边界**。

**LGDL 现状差距**：CLI `render` 用 `writeFileSync` 直写目标（ascii 分支 `packages/lgdl-cli/src/commands/render.ts:38`、svg 分支 `:61`），中途崩溃会留半截 SVG；mutation 命令同样先写文件后报 ✓（`packages/lgdl-cli/src/shared.ts:58-59`）。单机本地暴露窗口小，但 Web 工作台与 CI 自动渲染（若立项）会放大——尤其 AI 高频操作下，半成品文件会被下一次 op 读到。

**落地建议**（P2，成本约 10 行）：新增共享小工具 `atomicWrite`（tmp 同目录 + `rename`），`render` 与全部 mutation 命令共用；`.lgdl` 语义文件是 AI 操作唯一事实源，比 archify 的 HTML 更值得保护。

**验收方式**：对 `atomicWrite` 做"目标已存在时覆盖仍原子"的单测；render/mutate 路径全量回归（现有 435 基线不降）。

### P3-7 收据与溯源文化（artifact provenance）

**archify 机制**：成品带规格快照与 sha 收据、IR 源文件保留可增量可 diff（`usage-report.md:119`）；architecture 图可嵌 `meta.repository.revision` + SRC 计数做源码溯源（`layout-secrets.md:302`）。

**LGDL 现状差距**：LGDL 的溯源哲学是另一条路且更彻底——`data-lgdl-loc` 把每个 SVG 元素映射回 `nodes[i]/edges[i]`（`packages/lgdl-render/src/index.ts:594-598,665,938`），v0.6 修复后 group 元素也已发射 `nodes[i]` 而非废弃的 `groups[i]`（`packages/lgdl-render/src/svg.test.ts:191-193`），web 端据此点击定位源码。缺的是**成品自身的元数据**：SVG 没记录渲染它的 CLI 版本、layout 引擎、源文件 hash——一份脱离源码的 SVG 无法回答"这是哪版语义渲染的"。

**落地建议**（P3，低成本的叙事一致性收益）：render 把 `<!-- lgdl-cli <version> · source <file> sha256 <hash> · layout <type> -->` 写进 SVG 头（SVG 允许 XML 注释/`<metadata>`）。与 architecture-deps 图"零依赖 · 语言事实来源"的溯源叙事同构（`layout-secrets.md:242` 可互文）。

**验收方式**：render 测试断言 SVG 头含版本与源 hash；不设为门禁，只做溯源。

---

## 4. 规避清单（archify 的坑 → LGDL 的护栏）

### 4.1 手排布局陷阱 → 坚守语义优先公理

- **archify 的坑**：默认网格常量命中 0 次，"半自动网格"≈手排 + 机械校验（`usage-report.md:154`）；workflow 固定列网格 `colXs` 的 70px 列距对 92px 节点宽必然重叠 22px、80px 列距重叠 12px，安全列链仅 3-4 列（`layout-secrets.md:243`），5 种类型实际 4 种可用（`usage-report.md:153`）。根因：**把几何决策前置给作者，作者（含 Agent）必然在约束盲区反复试错**。
- **LGDL 护栏**：语义优先是**立项前公理**（作者确认 G1-Q3，`ROADMAP.md:16`），且语法层面已物理封死——allowlist 只有 `id/label/kind/members/attrs/contains`（`parser.ts:26-28`），坐标/尺寸字段无门可入。**护栏动作**：
  1. 任何"DSL 增加坐标/布局覆盖语法"的提案按**公理修订请求**处理，需作者显式裁决，不默认放行；反方论证成本可引用 workflow 前科（每坐标一次试错 × 操作次数）；
  2. 若未来确需人工微调（如叙事型大图），走独立的**呈现覆盖层**（不改 `.lgdl`，不动语义），属 v1.x 提案，本文不预设立场；
  3. 布局缺陷的合法出口是**引擎迭代**（如 LGDL 已走的 clear=14/真实交叉计数增量路，`index.ts:197,201-204,620`），不是给 DSL 开洞。

### 4.2 约束后置发现 → 检查前置到编译/布局期

- **archify 的坑**：投影字号 6.54px 逼近 6px 门槛只有交付 checker 才发现（`usage-report.md:155`）；sequence 12 条消息被 28px 行距压到 9 条（`usage-report.md:63`）；workflow 列距重叠这类结构性约束在作者排布时反复踩（`layout-secrets.md:243`）。**约束发现越晚，返工越贵，而 archify 把发现点设在交付前一刻**。
- **LGDL 护栏**：LGDL 已在 parse 期 error-only + location 精确化（ADR-005），语义错误前置得早；但**几何类约束没有前置预算**——layout/render 是算法黑盒，作者在"渲染→目测"前无法预知超长标签、泳道溢出。**护栏动作**：把 P1-2 字号预算与 P1-1 几何审计做成 **layout 阶段的预算计算**（先算后布），CLI `status` 输出几何摘要，把 archify 的"checker 期返工"平移成 LGDL 的"布局期预算"；9 种类型的边界写进 lgdl-spec（配合 F-08 文档对齐，`ROADMAP.md:159`），避免 archify workflow 式"类型存在但不可用、文档无警告"（`usage-report.md:153`）。

### 4.3 类型间行为不一致 → 统一命令契约

- **archify 的坑**：`--repo-root` 前置门禁只对 architecture 生效，sequence/dataflow 不接受该 flag——"同一工具各类型各一套脾气"（`usage-report.md:157`、`layout-secrets.md:313`）。
- **LGDL 护栏**：命令业务逻辑收敛到单一 COMMANDS 注册表 + 共享 mutations 层（ADR-004/008，`adr-index.md:103-119`），结构性优于 archify；但 render/CLI 层已有 per-type 特判苗头——ascii 分支对 sequence/gantt/uml-class 各打一条特判 warning（`packages/lgdl-cli/src/commands/render.ts:22-27`）、gantt 对缺 `start/duration` 打 placeholder warning（`:45-51`）。这些属呈现层提示可接受，但**新增任何 per-type 能力（如 P1-2 预算）必须所有类型同口径**。**护栏动作**：补一张"per-type 行为矩阵"测试（同命令 × 9 类型断言一致），并入 F-06（`ROADMAP.md:156`）；若某类型确实做不到（如 ascii 不渲 sequence 消息），在 `--help`/lgdl-spec 明示而非静默不同。

### 4.4 收据-成品脱钩 → 收据绑死成品 hash

- **archify 的坑**：deliver 覆盖成品后 visual-check 收据不自动更新，V2 三张 architecture 图收据早于最终交付（sha 不一致）——收据只证明"运行时刻"的成品（`layout-secrets.md:309`、`usage-report.md:156`）。
- **LGDL 护栏**：LGDL 已在本仓库吃过同款亏——preview-click 定位失败仍回"✓ 已定位"的**假成功**（W-D3/F-05，v0.6 收口已修为 boolean 三态反馈，见 `ROADMAP.md:117` 与 closeout `validate-report.md:39-40`（V12-V13））——证明 LGDL 对"声称≠事实"有痛感，是天然免疫。**护栏动作**：
  1. 将来任何收据/回执功能（P2-4/P2-5）**把成品 hash 写进收据**，成品变更即置 stale；
  2. AI 工具层反馈必须基于真实返回值（沿用 W-D3 修复模式），把"假成功"当作与 error-only 同级的公理违规——ROADMAP 已把"假成功=输出不可信任"列为最高价值缺陷（`ROADMAP.md:249`）。

### 4.5 类型可用性无证明 → 类型 × 测试矩阵固化

- **archify 的坑**：workflow 实际不可用但文档无警告，第一轮被迫改型 dataflow、第二轮主动规避 0 张（`usage-report.md:153`、`layout-secrets.md:304`）——**声称的 5 类型 ≠ 可用的 5 类型，类型清单不是可用性证明**。
- **LGDL 护栏**：9 种类型各有专属布局路径（`packages/lgdl-layout/src/index.ts:139-154`），无"声称为 9、实为 8"的现状；但**证明力度不足**：layout 包 0 测试（F-06 才补，`ROADMAP.md:156`）、render 21 例偏行为断言、router 8 例无降级路径。**护栏动作**：
  1. F-06 落地时建立 **9 类型 ×（布局单测断言确定性 + render 冒烟 + data-lgdl-loc 全覆盖）** 的可用性矩阵，任何类型声称可用都须有矩阵行；
  2. lgdl-spec 同步标注呈现层局限（ascii 局限、gantt attrs 依赖），不留静默角落（F-08 载体）；
  3. 修 archify 教训的另一半：若未来某类型真的不可救药（如固定泳道容不下内容），**文档先警告，再谈修引擎或弃类型**——顺序不能反。

### 4.6 修复循环靠纪律 → 纪律工具化

- **archify 的坑**："最多两轮聚焦修复"在 CLI **没有硬计数**，是 SKILL.md 工作流纪律（`usage-report.md:158`、`layout-secrets.md:197`）；低配模型反复触发修复循环（`usage-report.md:124`），两轮上限靠模型自律。
- **LGDL 护栏**：LGDL 的纪律已**内建在工具层**——AI 永不直写源码只能走增量命令、产物必须重过 validate 否则整体拒绝（ADR-006/008，`adr-index.md:137-152`）、批量操作失败即停报 `failedIndex`（`docs-tree-root/adr-index.md:179`）、对话轮数上限默认 1000（`:165`）。**护栏动作**：将来任何新门禁（P1-1 审计、P2-4 收据）的失败/重试上限**写进协议与工具返回值**，不依赖模型自律——把 archify 留给 SKILL.md 的纪律焊进 LGDL 的代码；若做 AI 修复循环（如按 P2-5 code 自动修），在 ops 层加"连续 N 次无进展即停并如实上报"的硬计数。

---

## 5. 与 ROADMAP 衔接建议

> 以下均为 AI 提案建议，作者裁决后方可写入任何版本承诺（待审视池口径 `ROADMAP.md:337-354`）。

v0.7 主题是**工程质量与文档对齐**（`ROADMAP.md:26,149-163`），与本文"验收类"借鉴天然同主题——**无需开新版本**，只需给 v0.7 既有 Feature 加内容权重：

| 提案 | 建议落点（ROADMAP） | 内容 |
|---|---|---|
| P1-1 净空审计 + P1-3 哈希回归 + 4.5 类型矩阵 | F-06 layout/cli 测试补齐 + F-11 router 健康化（`ROADMAP.md:156-157`） | 审计函数、golden 快照、9 类型矩阵、兜底分支测试一并收口 |
| P1-2 字号预算 | 随 F-06 的 layout 改动走同一回归护栏 | 预算写入 LayoutResult，CLI 输出几何摘要 |
| 4.2/4.5 的类型局限文档 | F-08 技术文档对齐（`ROADMAP.md:159`） | lgdl-spec 补各类型呈现层边界与预算口径 |
| P2-5 结构化诊断 | 审视池 P-05（status 优化）邻近立项（`ROADMAP.md:347`） | issue code + `--format json`，AI 消费先行 |
| P2-4 视觉验收闭环 | 审视池 P-02"CI 自动渲染"转正后（`ROADMAP.md:344`） | 轻量几何收据先行（绑 hash），浏览器截图后议 |

**时间口径**：v0.6 已发布（HEAD `1a365af`），P1 三条建议均不涉及语义模型改动、不动 DSL、不违反 error-only/公理，可与 v0.7 测试护栏批次（F-06/F-11/F-02）合并评估——它们是"护栏的护栏"，风险最低。P2-4 涉及新基建（无头浏览器/截图流水线）与 web 包依赖，投入产出需作者单独评估，本报告**不排期、不承诺**。

**治理提醒**：v0.6 的教训是"规划性描述不得当作既定事实"（`ROADMAP.md:8,72`）——本文全部建议在作者裁决前都属于「AI 提案待审视池」，引用本报告做排期决策时需显式标注出处与待审状态。

---

## 6. 结论

1. **同路线、反分工**：archify 与 LGDL 共享"确定性 + 门禁 + 不编造"的技术信念（`usage-report.md:112`），但 archify 把智能前置给作者、LGDL 把智能内化给引擎。两轮实战证明前者在**人工精修叙事资产**场景成立，同时**反向印证**后者才是 AI 高频增量操作（双层消费模型）的正确形态——LGDL 的语义优先公理经受住了对照检验。
2. **该借鉴的（P1 先行）**：产物侧几何审计（双层防御第二层）、投影字号预算（先算后渲染）、确定性哈希回归（把"同输入同输出"钉进测试）——三条全部是"输出可信"的机械化落地，与 LGDL 现有哲学零冲突；P2 再做结构化诊断、原子交付、带诚实边界的视觉收据；P3 补成品溯源元数据。上述借鉴全部落位引擎开发阶段（§2.4），是造引擎者的回归资产，不构成用户运行时的门禁负担。
3. **该规避的（守住的护栏）**：把几何决策推给作者（公理修订需作者裁决）、约束后置才发现（前置到布局期预算）、类型可用性无测试证明（9 类型矩阵化）、收据-成品脱钩与任何形式的假成功（W-D3 前科当戒）、靠纪律而非工具管修复循环。
4. **一句收束**：archify 的价值不在于它的图有多好看，而在于它用十四张图向 LGDL 证明了——**当引擎足够聪明后，决定产品可信度的不是布局算法，而是验收闭环与工程收据的机械化程度**。这两样恰好是 archify 最重、LGDL 目前最轻的部分。

---

## 修订记录

| 版本 | 变更说明 | 日期 | 作者 |
|---|---|---|---|
| v1.0 | 初始创建：基于 archify 两篇研究文档（secrets v1.1 + usage v1.2）+ LGDL 源码抽查（layout/router/core/render/cli/web），产出借鉴/规避清单与 ROADMAP 衔接建议 | 2026-09-02 | 深度研究 Agent（AI 提案，待作者审视） |
| v1.1 | 门禁落位修正：新增 §2.4「谁在环、谁重新输出」（门禁属引擎开发阶段非用户使用阶段，确定性下用户改不了输出，失败仅引擎开发者可重新输出）；§3 加落位声明；P2-4 补定位；§6 结论补落位；呼应 LGDL 既有 AI 视觉评审闭环为开发期门禁雏形 | 2026-09-02 | 深度研究 Agent（AI 提案，待作者审视） |
