# 审查报告：specs-tree-v4-1-zone-shell-density

> **文档定位**: SDDU 审查策略 — 指导 review Agent 执行自主审查的清单和方法；本轮审查结果见 `review-report.md`（R1）
> **前置依赖**: 本叶 `spec.md` v1.0、本叶 `plan.md` v1.0（ADR-V4-017~023）、父 `../spec.md`（FR-CHAT-004 / 010~017 / 070~075 与 §5.2 / §5.8 / §9 / §10）、父 `../plan.md`（ADR-V4-005/007/008/011/016）、本叶 `tasks.md`、本叶 `build.md` v3.0、`docs/v4-density-baseline.{md,json}`、`docs/v4-supersession-ledger.json`
> **创建人**: SDDU Review Agent
> **创建时间**: 2026-09-19
> **版本**: v1.0
> **更新人**: SDDU Review Agent
> **更新时间**: 2026-09-19
> **更新说明**: 初始创建（策略与报告分离，ADR-004 步骤 1）：定义 C1~C8 审查清单（含 FR→Cx 覆盖矩阵与判据）

---

## 1. 审查概要（策略侧）

| 维度 | 数值 |
|------|:--:|
| 被审产物 | 6（本叶 spec/plan/tasks/build/state + 父 spec·plan 相关章节） |
| 被审产物文件 | 生产代码 **14**（4 NEW + 10 MODIFY）+ 测试 **25**（`git diff 187c205..6761447 -- packages/web-cli-plugin` 口径）+ `docs/**` 2 新基线/台账 |
| 审查清单条数 | **C1~C8**（用户指定焦点面；每面内含多条子判据） |
| 维度覆盖 | 代码质量（C1 局部 / C8）· 规范符合性（C1·C2·C8）· 架构一致性（C3·C4·C6·C7）· 测试质量（C2·C3·C5·C6·C8） |
| FR 覆盖 | 本叶承载 FR-CHAT-004 / 010~017 / 070~075 共 **15 项，逐项 ≥1 个 Cx**（见 §2.1 矩阵） |

**审查方式**：静态分析（阅读 + 只读复核）为主，**并用既有门禁做只读复跑**验证怀疑点。工具为 `git diff/show/numstat`、`sha256sum/stat`、`grep`、Python 独立复算（字节偏移/哈希/计数/JSON）、**复跑既有门禁**（`npm test`、`test:supersession`、`test:gate-integrity`、`test:design-contract`、`test:density`、`test:ui`(journey)）+ 读既有落盘日志（`/tmp/opencode/v4-gate-logs/v4-1-r3/*`）。**未修改任何源码/测试/文档**（仅新增本策略/报告两份 SDDU 产物并更新 `state.json`）。

**本轮重点打假面**（对「取代型变更」保持最高怀疑）：

| P | 主题 | 映射 Cx |
|---|------|--------|
| P1 | 占位宿主「5 处」是否真实（grep -c 伪计数） | C1 |
| P2 | 两条 v3 红线（default 恰 7 / chars 视口无关）的「登记型取代」是换口径还是静默弱化 | C2 |
| P3 | journey 保护段新 pin 与 `#15b/#15c` 是否「取代即放松」 | C3 |
| P4 | 「第 6 个可点不可能」的机器证据是否真的能红 | C2·C8 |
| P5 | 体积五要素是否自洽 / 增长归因数字是否与真实 metafile 同源 | C4 |
| P6 | 取代台账的字段保真（stale `knownGap`/`pending`/「589px」/「测量根 #panel-main」） | C3·C4·C8 |

---

## 2. 自主审查清单（C1~C8）

| # | 审查对象 | 审查基准 | 审查维度 | 审查方法 |
|---|---------|---------|---------|---------|
| **C1** | 三区结构正确性：`index.html` 三区（`header#region-toolbar`[role=toolbar] / `main#region-stream` 含 `ol#stream[role=log]` / `footer#region-statusbar`[role=contentinfo]）的语义、文档序、body 直挂；工具栏 ≤5 可点（静态+runtime）；占位宿主 `data-transitional-host` 的**存在/计数/语义**（本叶只建不销）；`#log`→`#stream` 重命名是否遗漏（含 binding 保护段合法保留） | ADR-V4-017/018、FR-CHAT-010/011/013、NFR-CHAT-004、S7 | 规范符合性 + 代码质量 | 逐行走查 `index.html` + `density-thresholds.test.ts` 静态契约 + `l0.mjs` ①/②/⑧ 断言 + 独立 `grep` 计数 |
| **C2** | 密度重定标诚实性（最高优先）：`density-scope.ts` 单源真实（字面量 + 再断言）；`assertChromeNotInStream()` 真封堵；31 格基线与门禁日志一致（抽查 default 181/184、risk worst 227、empty/riskDetailOpen）；**两条 v3 红线的「登记型取代」合法性**（default 恰 7→恰 5、chars 视口无关→≤8） | FR-CHAT-070~075、ADR-V4-020/021、父 ADR-V4-007 | 架构一致性 + 规范符合性 | 单源扫描 + 复跑 `test:density`（28 格机对）+ 与 v3 `density.mjs`（187c205）逐块对照 + 反证日志逐条 |
| **C3** | journey 取代完整性：新 pin（字节/sha/行数）与现文件实际字节**独立复算**；`#15b` ≥65% 与 `#15c` 法四的断言强度**不低于**旧断言；redlineRemap 三条 `landed` 证据；RP-V4-08 两向验证真实；binding 保护段字节零改 | 父 ADR-V4-008、FR-CHAT-082、AC-CHAT-017 | 架构一致性 + 测试质量 | Python 独立切片复算 sha256/byte/行数 + 新旧段 `check(` 计数守恒 + 复跑 journey + 读台账 `protectedSupersession`/`redlineRemap` |
| **C4** | 体积五要素：375,102→385,319（+10,217/+2.72%）登记与 metafile 归因自洽（Σ 模块 + 胶水 == 本轮增量；四类分解 == 累计增量 90,094）；ceiling 404,584 公式复核；`PENDING_ABSOLUTE_CAP` 未预填 | 父 ADR-V4-010、V3-VOL-3、AC-V3-016 | 架构一致性 | 走查 `size-baseline.ts` + 独立读 `dist/build-meta.json` 逐模块核对 + 公式复算 + 断言覆盖扫描 |
| **C5** | 测试守恒与门禁账：D-005 逐项（l0 203/164、l1 108/103、l2 73/71、density 169/127、journey 167/167、insight 116/116、binding 192/192、sidepanel-view 38、nodeTestRuntime 849）；binding 环境抖动定性是否如实 | AC-CHAT-023、ADR-V4-023、NFR-CHAT-009 | 测试质量 | 复跑 node 侧门禁（`npm test`/supersession/gate-integrity/design-contract）+ 复跑 Chromium 侧两条（density/journey）+ 其余引用落盘日志 |
| **C6** | design-contract 双实现边界（R4-20）：只校验设计稿（shim 60/60 + sha256 冻结）与真实产物断言落 Chromium 门禁的分列是否清晰；`CARD_TYPES` 7 主类映射正确 | AC-CHAT-025、FR-CHAT-036、父 ADR-V4-011 第 5 条 | 测试质量 + 架构一致性 | 全文走查 `design-contract.test.ts` + 独立复算 shim/draft sha256 + 复跑 `test:design-contract` + 实跑 shim |
| **C7** | 红线零违反复核：`src/content/**` / `manifest.json` / 判定链（policy/auto-authorize）/ `src/background/**` / `dist/content.js` / `dist/pick-layer.js` / `hardening` / `page-input` / `zero-injection` 零 diff 独立复核 | 本叶 `out` 范围、父 ADR-V4-004/011 | 架构一致性 | `git diff --stat 187c205..6761447` 全量 + `sha256sum`/`stat` + 全量改动面清单核对 |
| **C8** | 规范符合性与 build 保真：AC-CHAT-004~009/022/023/025 逐条对照 build 证据是否充分；build.md 记录保真（WIP 历史保留、登记差异 B.7 如实、计数/条目数字与产物一致）；新模块错误路径（EC-CHAT-014）覆盖 | spec §7 AC 表、EC-CHAT-004/007/010/013/014、NFR-CHAT-002/004/008/009/010 | 规范符合性 + 代码质量 + 测试质量 | AC→门禁断言逐条映射 + `git diff --name-status` 与 build.md §2 对照 + 台账/基线数字复算 + 新模块引用图 |

### 2.1 FR → Cx 覆盖矩阵（质量门槛自查）

| 父 FR | 承载条文的机器证据 | 覆盖 Cx |
|-------|------------------|:--:|
| FR-CHAT-004（风险永不折叠语义的新机器判据） | J1~J4 + 祖先闭包 + chips 探针 + `riskActiveOf` | C1·C2 |
| FR-CHAT-010（三区结构/顺序/语义） | `density-thresholds.test.ts:261-285` + `l0.mjs:229-239` | C1 |
| FR-CHAT-011（工具栏准入 ≤5 + 准入/置换 + 徽标 + 只读摘要） | 静态插槽 5 + `l0.mjs:244-250` + `toolbar.ts` 抛错守卫 + `toolbarAdmissions` | C1·C2·C8 |
| FR-CHAT-012（法一：工具栏/状态栏无一次性交互） | 静态 `data-msg-type` 扫描（density-thresholds:311-321） | C1·C8 |
| FR-CHAT-013（状态栏常驻 + 零风险收缩） | J1/J2 + `statusbar.ts` 不变量 + `#risk-chips hidden` 静态 | C1·C8 |
| FR-CHAT-014（法四：默认屏无可见常驻输入框） | 静态 `:324-339` + `l0.mjs:295-297` + journey `#15c` | C1·C3·C8 |
| FR-CHAT-015（L2 视图替换复用） | `view-host.ts` 绑定迁移 + `l2.mjs` 73 + `l0.mjs:236` | C1·C3 |
| FR-CHAT-016（法则六：管理入设置视图 + 可发现） | `index.html:1391-1440` 归属 + `l1.mjs:223-256` | C1·C8 |
| FR-CHAT-017（chip 形态迁移 + 详情 + 披露语） | `risk-rail.ts` chip + `density.mjs:632-636` 披露语 + J3/J4 | C2·C8 |
| FR-CHAT-070（新测量根 + 流内容不计入 + 口径单源） | `density-scope.ts:35` + `density-metrics.mjs:130/199-208/267-272` | C2 |
| FR-CHAT-071（豁免边界只认 hidden） | `visibleIn` 单实现 + RP-V4-04 + 禁用 API 扫描 | C2 |
| FR-CHAT-072（单卡 ≤6） | `evaluateCardBudget` + RP-V4-01 + 逐格动态格 | C2 |
| FR-CHAT-073（首屏 ≤2） | `evaluateFirstScreen` + RP-V4-02 + empty 档 | C2 |
| FR-CHAT-074（阈值逐字 + v4 基线 + 格重算） | `DENSITY_LIMITS` 逐字 + v4 基线 31 格 + stage F | C2·C4 |
| FR-CHAT-075（防滥用可 FAIL 反证，含藏进流子树） | RP-V4-01~07 in-gate + `assertChromeNotInStream` + RP-V4-06 | C2·C8 |
| NFR-CHAT-002（320–560 零水平溢出） | `l0.mjs ⑩`（320/400 集合相等 + overflowX=0）+ journey `#15d/#15q` | C3·C8 |
| NFR-CHAT-004（ARIA 成对 / `:focus-visible` / 不靠颜色） | `l0.mjs ⑧/⑬` | C1·C8 |
| NFR-CHAT-008（主题三态 + 已有 storage） | `theme.ts` + `l0.mjs ⑬`（auto→light→dark→auto） | C5·C8 |
| NFR-CHAT-009（串行门禁 / 日志落盘 / 反证实跑） | build.md §B.6/§B.5 + 日志目录 | C5 |
| NFR-CHAT-010（口径与基线同源可复算） | stage F + `density-thresholds.test.ts` 同源断言 | C2·C4 |
| AC-CHAT-004~009 / 022 / 023 / 025 | 见 `review-report.md §2 C8` 逐条映射 | C1~C8 |
| EC-CHAT-004 / 007 / 010 / 013 / 014 | 见 `review-report.md §2 C8` | C1·C5·C8 |

> **质量门槛自查**：本叶承载 FR **15 项**，逐项 ≥1 个 Cx（上表）；四维度各 ≥1 条（代码质量 C1/C8、规范符合 C1/C2/C8、架构一致 C3/C4/C6/C7、测试质量 C2/C3/C5/C6/C8）；「无法审查」项：**无**（本叶 0 个外部服务 API，全部产物可静态/只读复跑核对；仅 l0/l1/l2/insight/binding/hardening/e2e 等运行时计数本轮以「引用落盘日志」核对，已在报告中标注）。

---

## 3. 审查详情（方法与判据）

### 3.1 代码质量
- 逐文件走查 14 个生产文变更；对每个新导出符号做引用图（`grep -rn`）判死代码。
- 错误路径判据：catch 体是否只含注释/降级；EC-CHAT-014 类「失败降级」必须有可执行的覆盖证据（否则记 ⚠️）。
- 注释一致性判据：同一规则在**注释、常量、台账、运行时/门禁实测**多处是否一致；不一致即记 ⚠️（本轮在「589px」「测量根 #panel-main」「输入模块数 53」等处命中）。

### 3.2 规范符合性
- 逐 FR/AC 从「是否有**直接**断言 → 断言是否覆盖行为（而非仅存在性）」两级判定；只有常量级/存在性断言而无行为断言的记 PARTIAL。
- 阈值/口径以父 §9 原文为基准做**逐字**比较；取代类变更额外判「旧断言强度是否被等强或更强的断言接替」。

### 3.3 架构一致性
- ADR 判定以「是否违反 ADR 约束句」为准；取舍以 plan §3 的推荐方案为准。
- 取代台账类：以**真实 `git diff 187c205..6761447`** 为唯一事实源；`protectedRanges` 的 sha256/byte/行数一律**独立复算**（Python，非门禁代码），并复核 old pin 能否从 `187c205` 复现。
- 反证类：判「扰动是否施加在门禁读取的同一路径」，并核 FAIL 段诊断是否**因该红而红**（读日志原文）。

### 3.4 测试质量
- 断言强度三级：① 行为断言（改真值必变）② 存在性断言 ③ 恒真/弱断言。
- 计数纪律：只接受「同口径 before/after」；跨口径数字标注不可比。
- 覆盖缺口判据：新模块/新 cfg 的**必需错误路径**是否有门禁可驱动为红；「声称会被抛错拦截」必须有 FAIL 段证据。

---

## 4. 结论
**结论**: 策略已定稿（C1~C8 + FR 覆盖矩阵 + 判据），R1 已执行，逐项结果见 `review-report.md`。

## 5. 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建：C1~C8 自主审查清单（四维度 + 6 个打假面 + FR→Cx 覆盖矩阵 + 判据） | 2026-09-19 | SDDU Review Agent |
