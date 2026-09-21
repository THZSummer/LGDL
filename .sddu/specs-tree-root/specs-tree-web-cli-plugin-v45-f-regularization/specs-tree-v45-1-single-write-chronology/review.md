# 审查报告（策略）：specs-tree-v45-1-single-write-chronology（V4.5-1 单写化 + 宿主时间序化）

> **文档定位**: SDDU 审查策略 — 指导 review Agent 执行自主审查的清单和方法；审查结果见 `review-report.md`
> **前置依赖**: 本叶 `spec.md` v1.0（44 FR / 8 NFR / 13 EC / 22 AC）、`plan.md` v1.0（ADR-V45-001~012 + §5 文件影响 + §6 风险）、`build.md` v1.2（R1/R2/R3 + 双 spikeGate + D-W3/D-R3 偏差）、`tasks.md` v1.0（19 原子任务 / 5 波）
> **创建人**: SDDU Review Agent
> **创建时间**: 2026-09-21
> **版本**: v1.0
> **更新人**: SDDU Review Agent
> **更新时间**: 2026-09-21
> **更新说明**: 初始创建（R1 策略：C1~C20 自主审查清单；44 个 FR 组全部 ≥1 条 + 四维度覆盖 + 每项标注「审查方法」与「不适用」判定）

## 1. 审查概要

| 维度 | 数值 |
|------|:--:|
| 审查文件数 | **53** 个（`git diff 8a7e930..23050b1 -- packages/web-cli-plugin`；另含本叶 SDDU 产物 6 项） |
| 审查项（Cx） | **20** |
| 通过项 | 见 `review-report.md`（本轮 R1 执行结果） |
| 改进建议 | 见 `review-report.md` |
| 阻塞问题 | 见 `review-report.md` |

### 1.1 审查基线

| 项 | 值 |
|---|---|
| 分支 / HEAD | `feature/web-cli-plugin` / `23050b1`（工作区干净） |
| 区间 | `8a7e930..23050b1`（v4.5 立项 → R3 收口勘误），实现区间 `24e4cc3`(W1) / `adcfdaf`(W2) / `b9bab87`(W3) / `aedd1d2`(W4+W5) |
| 父规范 | `../spec.md`（48 条 FR 编号中 **44 条 FR** · 8 NFR · 13 EC · 22 AC · §11 37 条元素去向） |
| 保护段 | journey `43054..58287` / `cc79f413…`（二次取代，3 链节）；binding `107780..115930` / `be9ad0e9…`（保段） |
| 体积 | `dist/sidepanel.js` = **493,501 B**；生效上限 `min(563,200, floor(493,501×1.05)=518,176)`；档位 512,000 / 绝对上限 563,200 |

## 2. 自主审查清单（C1~C20）

**审查对象来源**（本 Agent 自主提取）：
- `spec.md`：44 FR（§4 分组）/ 8 NFR（§5）/ 13 EC（§6）/ 22 AC（§7 六验收包）→ 逐项核验实现完整性与正确性；**验收锚点 = 父 `AC-V45-*` 编号**
- `plan.md`：**ADR-V45-001~012** 正文 + §5 文件影响（63 项）+ §6 风险（R-REG-* / R-V45-101~109）+ §2.5 T1~T10 不动面
- `build.md` v1.2：§1 双 spikeGate 结论 / §3.5 与 §4.5 门禁对账 / §5 R3 逐任务处置 / §6.2 24 门禁账 / §6.5 红线表 / §6.6 人工面 / §6.7 偏差与 flake
- `tasks.md` / `tasks.json`：19 任务 + 停机规则 7 条 + 红线检查点（`F*`/`T-*`/`L-*`）
- 产物：`src/**`（21 项变更）+ `test/**`（37 项）+ `docs/*.json` 两份台账 + `dist/` 实测

**四维度指引**：
1. **代码质量** — 可读性 / 职责单一 / 错误处理 / 无硬编码 / 无冗余死码 / 注释与实现一致
2. **规范符合性** — 对照 spec 逐 FR / NFR / EC 核验（含「接线真实性」：不满足于模块存在，必须追到生产调用点与真实 DOM）
3. **架构一致性** — 对照 12 条 ADR + §5 文件影响 + T1~T10 不动面 + 项目宪法（单源 / 零宿主 / 台账纪律）
4. **测试质量** — 测试存在性 / 核心与边界路径 / 断言有效性（可 FAIL、非恒真、注入点未随形态搬迁而空转）

| # | 审查对象 | 审查基准 | 审查维度 | 审查方法 |
|---|---------|---------|---------|---------|
| C1 | 5 条提示带 + 4 宿主 + `decision` 壳的 **DOM 真消失**（非 `hidden`）与 ARIA 语义等价承载 | FR-V45-010 / 020 / 021 / 022 · AC-V45-001 / 002 · NG-V45-001 | 规范符合性 | `index.html` 全量 grep（id / `data-host` / `.strips` / 死 CSS）+ `dist/sidepanel.js` 交叉 + l0/l1 门禁逐项负向断言读 + 独立复跑 |
| C2 | **防复辟**：隐藏充数 / 空壳留桩 / `hidden` 存活 / **id 复用** / 改名等价形态 / **悬空 id 选择器**残留 | NG-V45-001 / 002 / 017 · ADR-V45-005 选项 C · R-REG-906 · BLOCK-02 教训 | 规范符合性 | 全仓 grep 退役 id（src/test 分离判定）+ 产品源逐个 id 选择器反查「是否仍有元素可解析」+ 门禁负向断言与产品写入点对读 |
| C3 | **单写语义**：`systemRow()` 仍是唯一 `kind:'system'` 构造点；5 通道 emitter 唯一；`firstRunCard` 归并后无第二载体；行 `title` 净化 fail-closed 真抛错 | FR-V45-011 / 012 / 013 / 014 / 015 · ADR-V45-001 · NFR-V45-003 | 规范符合性 | `chat-state.ts#systemRow` / `sidepanel.ts#eventizeChannels` 走查 + 全仓 `dispatch({type:'system'})` 计数 + `plaintextTitle` 调用链追到生产写入点 |
| C4 | **事实面唯一**：首屏三事实（env / site / probe）及 5 通道「可见载体数 == 1」是否有 **live 判据**（非自声明常量） | FR-V45-011 / 015 · AC-V45-001（核心验收）· NFR-V45-004 / 007 | 测试质量 | `evaluateStripChannels` 的 `observedCarriers` 全仓供给点反查 + 各 Chromium 门禁里 `data-kind` 选择器用量（`querySelectorAll(...).length === 1` vs `querySelector`）+ 产品态 `firstRun` 双载体构造走查 |
| C5 | **journey 链式取代诚实性**：`supersessionChain` 3 链节真链（非装饰）；v3 pin 只能链式命中；`#15b` 只上调；`#15c` 出流判据真实 | FR-V45-080 / 083 / 084 · AC-V45-014 / 016 / 017 · ADR-V45-004 · R-REG-001 | 架构一致性 | 台账逐字段读 + **独立字节复算**（`git show <leafBase>:journey.mjs` slice → sha256）＋ 链式判据源码读 + 门禁独立复跑 |
| C6 | **binding 字节中立避让**：段前补偿等长证据；`:880 panelNotice` 零触碰；双绿判据（sha + `startByte`）非自欺 | FR-V45-081 · AC-V45-015 · EC-V45-013 · ADR-V45-005 · R-V45-102 | 架构一致性 | `git diff` 逐 hunk 读 + 补偿量算术核对（Δ=52 B ↔ 删 17×3+1 B）+ 段 sha / `startByte` 独立复算 |
| C7 | **density 新基线非放宽**：31 格重算后无格被静默删除 / 阈值漂移；唯一变更格 `7/7/18/237→6/7/17/232` 的 `tighten-only`；夹具三重构造判据非橡皮图章 | FR-V45-070~074 · AC-V45-018 · ADR-V45-006 · NG-V45-007 | 规范符合性 | 新旧基线 JSON 全量 diff（逐格）+ `v45Ledger.after` ↔ `tiers` 同源复算 + `settledProbe` / `RP-V4-10` 读 + 门禁独立复跑 |
| C8 | **断言重写质量**：数量不减 ∧ 语义不空心（载体 == 1 / 零宿主 / 卡序 / 双断言替代「节点存在」） | FR-V45-004 / 082 · AC-V45-017 · NFR-V45-007 | 测试质量 | l0 / l1 / journey / system-merge / sidepanel-view 重写 hunk 逐条读 + 恒真/弱断言模式扫描（读后即弃、`querySelector` 单命中、`|| true`） |
| C9 | **act 闭集 6 项 + 本地 act 布线真实性**：`rebind` / `help` 走产品路径可达（非 seam-only）；`recommend` 白名单未扩 | FR-V45-030 / 031 / 032 / 033 · AC-V45-011 / 012 · ADR-V45-007 · R-REG-904 / 905 | 规范符合性 | `recommend.ts` 规则表 / 闭集 / 文案读 + `handleCardAction` 分支与唯一入口（`rebindCurrentTab` / `openSettingsSection`）调用点反查 + `test:recommendation` 独立复跑（真实 SW 触发） |
| C10 | **手势 → 设置「帮助」分区**：`SETTINGS_SECTION_IDS` 单源派生（7→8）、6 行同源、只读零可点、chip `act:'help'` 零回合 | FR-V45-040 / 041 / 042 · ADR-V45-008 · R-REG-903 | 规范符合性 | `sections.ts` / `help.ts` / `panel.ts` 走查 + 三方同源（注册表 / 渲染 / `data-count`）断言读 + `settings-help.test.ts` 反证段读 |
| C11 | **`options` 解冻**：逐 hunk 纯文案证据 + 范围门禁 + `unfrozenZeroDiffFiles` 九字段 + v3 台账零 diff | FR-V45-050 / 051 / 052 · AC-V45-013 · EC-V45-010 · ADR-V45-009 · NG-V45-005 | 架构一致性 | `git diff` 单文件逐 hunk + 台账条目逐字段 + `test/zero-injection.test.ts` 范围门禁与反证读 + 字节差复算 |
| C12 | **零宿主判据**：注册表降级为反向判据、`RETIRED_*` 扩容、6 类问题串、5 组伪造 reading 反证；退役清单**口径自洽** | FR-V45-060 / 061 / 062 · ADR-V45-010 · G-V45-003 · R-REG-010 / 906 | 架构一致性 | `host-registry.ts` 全文走查 + `hosts()` 读数与判据对读 + `host-registry.test.ts` 5 组 forged 用例逐条读 + 与产品实际迁移面的口径一致性反查 |
| C13 | **`#composer` 出流 + 出流护栏**：`body` 尾 / `hidden` / 兼容面零变化 / `syncComposerVisibility()` 唯一派生点 / 无解除 hidden 路径 | FR-V45-023 / 024 · AC-V45-005 · NFR-V45-006 · ADR-V45-003 · R-V45-105 | 规范符合性 | `index.html` 位置读 + `sidepanel.ts` 全仓 `composer.hidden` 写入点计数 + `syncComposerVisibility` 定义与调用点反查 + l0/journey 断言 |
| C14 | **体积三值同步**：`493,501 / 518,176 / 512,000 / 563,200` 同源；档位不下移闸门（460,801）；`pending-author-line` 保持；净减双向登记 | FR-V45-090~093 · AC-V45-019 / 020 · NFR-V45-005 · ADR-V45-011 · R-V45-101 | 规范符合性 | `size-baseline.ts` 常量 / 历史 / 归因读 + `size-ruling-vol3.test.ts` 三值判据与闸门读 + `stat` 实测产物 + 台账 `v3Vol3Closeout` 对读 |
| C15 | **红线全表**：冻结面（`src/content/**` / `dist/content.js` / `dist/pick-layer.js` / shim / `design/**` / `manifest.json` / SW 判定链）/ 阈值 / v3 台账 / 不动面 T1~T10 **零 diff 独立复验** | FR-V45-093 · EC-V45-010 · §2.5 T1~T10 | 架构一致性 | `git diff --name-status` 全量 + sha256 实测 + `git status` 零输出逐路径 |
| C16 | **37 条元素去向 + L2 只读承载块**：退役 19 / 迁移 13 / 消解 3 / 保留 2 逐条落地；`#l2-tree-attribution` / `#l2-audit-evidence` / `#l2-audit-count` 可达且「零悬空引用」 | FR-V45-021 / 022 / 025 / 026 · AC-V45-007 / 008 / 009 · EC-V45-005 / 013 | 规范符合性 | 父 §11 去向表逐条对读 + `index.html` / `panels.ts` / `cards/*` 承载点反查 + 悬空引用 grep（`#l1-local-tree-global` / `#l1-receipt-audit`） |
| C17 | **代码质量**：可读性 / 职责单一 / 错误处理 / 无硬编码 / 无死码与死写 / 注释与实现一致 | §5.1 方法论 · LNG-V45-001~004 | 代码质量 | 逐文件走查新增模块（`decision-region.ts` / `help.ts` / `host-registry.ts` / `density-scope.ts` 新增段）+ 全仓未引用导出 / 写后不读的 DOM 操作扫描 |
| C18 | **收敛性**：spec FR / AC ↔ tasks ↔ build 产物三方追溯；门禁账与自报计数对账 | FR-V45-001 / 002 / 003 / 004 · AC-V45-017 · NG-V45-008 | 测试质量 | 44 FR × 任务/产物矩阵复算 + `npm test` / Chromium 门禁**独立复跑**对账 + `gate-integrity` 元门禁读 |
| C19 | **反证不空转**：RP-V3-* / RP-V4-* 全集实跑结论核对；注入点随形态搬迁后**重写**；每条**新判据**有可 FAIL 反证（含新安全面 `title`） | FR-V45-073 / 074 / 084 · AC-V45-012 / 016 · NFR-V45-007 · EC-V45-012 · R-V45-106 | 测试质量 | 反证清单与 `--reverse` 入口逐条对读 + 新判据（`plaintextTitle` / `observedCarriers` / `syncComposerVisibility` / 链式判据）的反证供给点反查 |
| C20 | **人工面与纪律诚实性**：`KL-N-10` / `K-R3-*` flake 如实登记；人工面三项**不冒充 PASS**；串行纪律 | AC-V45-021 / 022 · 父 §5.3 / §15 | 规范符合性 | build §6.6 / §6.7 逐条读 + 门禁日志目录存在性 + 隔离复跑记录对读 |

### 2.1 质量门槛核对（数量基线法）

| 门槛 | 结果 |
|---|---|
| 每个 FR ≥ 1 个 Cx | ✅ 44/44（FR-001~004→C18 / 010→C1 / 011·015→C3·C4 / 012·013·014→C3 / 020~022→C1·C16 / 023·024→C13 / 025·026→C16 / 030~033→C9 / 040~042→C10 / 050~052→C11 / 060~062→C12 / 070~074→C7 / 080~084→C5·C6·C8 / 090~093→C14·C15） |
| 每个审查维度 ≥ 1 条 | ✅ 代码质量 C17 / 规范符合性 C1~C4·C7·C9~C11·C13·C14·C16·C20 / 架构一致性 C5·C6·C12·C15 / 测试质量 C4·C8·C18·C19 |
| 不适用项显式标注 | ⚠️ **无「不适用」项**：本叶是唯一叶且 44 FR / 22 AC / 13 EC 全部落在实施面内，无外延；EC-V45-009（320px / 三主题 / 高 DPI 目视）与 AC-V45-022（读屏）为**人工面**，列为 C20 的观察项（不在静态审查的可判范围内，但**不计入通过**） |

## 3. 审查方法（本策略的执行约定）

| 方法 | 说明 |
|------|------|
| 只信产物，不信自报 | build.md 的每项「已落地」都必须追到 `src/**` 的生产调用点、真实 DOM 或 `test/**` 的可 FAIL 断言；只有 seam / 声明 / 注释可达 ⇒ 判**未交付** |
| 判据空转反推 | 对每条「清零 / 恰 1 / 相等 / 零残留」判据，反问「把被测量改名 / 移走 / 换个夹具时点是否仍为真」；成立即判空转 |
| 独立字节复算 | 保护段 / 红线 / 体积一律本 Agent 自行 sha256 / `stat` / slice 复算，不采信台账与本轮报告的自报值 |
| 独立门禁复跑 | **严格串行（一次一个 Chromium）**，≥6 项门禁自行复跑并与 build 自报逐项对账；反跑结果与自报不一致时以复跑为准 |
| 口径自洽性反查 | 「退役清单」与「产品实际迁移面」互查：产品仍在写 / 仍在读的 id 不得同时出现在「零残留」清单里（v4-4 BLOCK-02 的同型检查） |
| 只读纪律 | 不改 `src/**`、`test/**`、`docs/**`；只跑只读命令与门禁；发现的问题**登记**，修复归修复轮 |

## 4. 结论

**结论**: 见 `review-report.md`（本轮 R1）。

## 5. 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建（C1~C20 策略：44 FR 全覆盖 + 四维度覆盖 + 无「不适用」项显式标注；6 项独立复跑与字节复算方法约定） | 2026-09-21 | SDDU Review Agent |
