# 审查报告：specs-tree-v2-4-command-archive（web-cli-plugin v2 V2-4 命令档案浏览器）

> **文档定位**: SDDU 审查报告（**叶子子 Feature**，v2 最后一个子 Feature，P1，**纯只读展示面**）— 静态审查执行结果，作为 validate 阶段的输入
> **审查策略**: 本报告 §2 自主定义 C1~C24 审查清单（从 `spec.md` FR-V2-050~056 / NFR-V24-001~005 / EC-V24-001~005 / AC-V24-001~007 + `plan.md` ADR-V2-016~023 + 实际产物提取）。**注**：本 Feature 目录未单独产出 `review.md` 策略文件，C1~C24 清单直接定义于本报告 §2 并可复核（与 P0 review-report 体例一致）
> **前置依赖**: `spec.md`（v1.0）+ `plan.md`（ADR-V2-016~023）+ `tasks.md`/`tasks.json`（10 任务）+ `build.md`（v1.0）+ P0 已 `validated` 的 V2-1/V2-2/V2-3（父目录 `review-report.md` / `validate-report.md`）
> **创建人**: SDDU Review Agent
> **创建时间**: 2026-09-13
> **审查轮次**: R1（提交区间 `2ede99c`（V2-4 tasks）→ `72fefdf`（V2-4 build））
> **版本**: v1.0

---

## 1. 审查概要

| 维度 | 数值 |
|------|:--:|
| 提交区间 | `2ede99c`（tasks）→ `72fefdf`（build）；14 文件 / +2193 −36 |
| 审查项总数 | 24（C1~C24） |
| 通过 | 24 |
| 改进（建议，非阻塞） | 4 条（W1~W4） |
| 提示（非阻塞） | 4 条（T1~T4） |
| 阻塞问题 | **0** |
| 结论 | **⚠️ 有条件通过（0 阻塞）** |

**方法（本仓库 OOM 前科 → 静态为主 + 门禁串行，绝不并发）**：以**静态读码 / grep / 跨文件比对 / 区间级 `git diff` / 独立哈希复算 / 独立计数复算**为主；门禁**严格串行、一次一个**执行：`npm test`（node，646/646）、`npm run test:insight`（Chromium，70 断言）、`npm run test:hardening`（Chromium，24 断言）。**未跑** `test:ui` / `test:binding` / `test:e2e` / 全仓 `npm test`（如实标注，不冒充其运行结果）。所有哈希/计数均由本审查从源码独立复算，**不采信 build 自述**。

**本审查实际读/跑了什么（可复核）**：
- **读**：`spec.md` / `plan.md`（ADR-V2-016~023 + §9 交付门槛 A1~A9）/ `tasks.md` / `build.md` / `state.json` / `TREE.md`；源码 `src/insight/{archive-catalog,catalog-meta,tree-model,command-catalog,catalog-reconcile,project-tree}.ts`、`src/ui/tree/{tree-drawer,tree-view,tree-ops,tree-receipt}.ts`、`src/security/{policy,auto-authorize}.ts`、`src/background/service-worker.ts`、`src/protocol/descriptor.ts`；测试 `test/insight-archive.test.ts`（全文 843 行）、`test/{size-baseline,size-budget.test}.ts`、`test/ui/insight.mjs` 追加段、`test/ui/hardening.mjs`（phaseA/入口）、`test/insight-{action-parity,projection,no-escalation}.test.ts`、`test/tree-ops.test.ts`；文档 `docs/{dev,smoke-checklist}.md`；`dist/*`（体积）+ `build.mjs`（splitting 设置）。
- **跑（串行）**：`npm test` → **646 pass / 0 fail**；`npm run test:insight` → **PASS 70 assertions**（真实 dist + CDP，`#I-19a…h2` 全绿）；`npm run test:hardening` → **PASS 24 assertions**（首跑即绿）。日志落盘 `/tmp/opencode/{insight-run,hardening-run}.log`（**完整保留，未截断**）。
- **独立复算（不引用 build 数字）**：`sha256` 6 个（`TREE_ACTION_IDS` / `TREE_NO_ESCALATION_NOTE` / 3 个 `src/ui/tree` / `src/content/**` 3 文件 / `policy.ts` / `auto-authorize.ts`）；三层口径（L1 34/142 · L2 20/88 + byStatus · L3 28/94=122/distinct 23）；行级并集覆盖（176/176）；体积（`dist/*` 实测）；断言计数（`check(` 45→56、`checkLayout(` 3→4、`assert.*` 42→63）。
- **未跑**：`test:ui` / `test:binding` / `test:e2e` / 全仓 `npm test`（见 §8）。

---

## 2. 逐项审查结果（C1~C24）

> 维度覆盖：代码质量 C1~C2 · 规范符合 C3~C19/C25 · 架构一致 C20~C23 · 测试质量 C24。每个 FR（FR-V2-050~056）至少映射 1 条，不可审查项见 §8（标注 N/A）。

| # | 维度 | 审查对象 / 基准 | 结论 | 证据（file:line） | 严重度 / 阻塞 |
|---|------|----------------|:----:|-------------------|:--:|
| **C1** | 代码质量 | `archive-catalog.ts` / `tree-drawer.ts` 追加段：命名清晰、职责单一、可读性 | ✅ PASS | `archive-catalog.ts` 分层清晰（常量投影 `:59-74`、卡片构造 `:282-304`、三层口径 `:316-401`、过滤 `:425-440`、分组 `:467-510`、顶层投影 `:535-578`）；`tree-drawer.ts` 只做 DOM 挂载（`renderArchiveCard:466` / `renderArchive:505` / `setArchiveEnabled:561` 各司其职）；无超长函数、无隐藏副作用（纯投影不 mutate 输入） | 无 |
| **C2** | 代码质量 | 错误处理完善、无硬编码魔法值、无冗余逻辑 | ⚠️ PASS（附 T2） | `buildArchiveModel` 对未知分组维度显式抛错：`archive-catalog.ts:544-546`；枚举/顺序常量集中（`GROUP_BY_ORDER:446`、`ACTION_ORDER:447` 等）；`ARCHIVE_WAIVER_BASELINE:59`、`CATALOG_BASELINE_META:19` 均为命名常量而非散落字面量。**T2**：`ArchiveModel.notes` 中 `noEscalationNote`/`delayMsNote`/`readOnlyNote` 三字段 UI 未消费（`tree-drawer.ts:525` 仅用 `noExaggerationNote`），`readOnlyNote` 与 `header.readOnlyLabel` 重复 | 低 / 否 |
| **C3** | 规范符合 | **FR-V2-050**：34 工具/142 子命令逐条有档，覆盖率 100%，三层分列不夸大 | ✅ PASS | **独立复算**：`baseline-catalog.json` = 34 tools / 142 subs；`waivers.json` = 20/88（byStatus `mapped 4/39`·`not-applicable 9/29`·`baseline-disabled 6/16`·`delegated 1/4`）；P0 fixture 实测 L3 = 28 条目/94 子命令 = **122 卡**（distinct 23）；行级并集 176/176=**100%**（未覆盖 0；carded-only 68 + waived-only 108）。门禁 A1/A2：`test/insight-archive.test.ts:334-346,383-422,424-446` | 无 |
| **C4** | 规范符合 | **FR-V2-051**：`deny` 三成因分列 + `auto-authorize#hardDeny` 分列可读 | ✅ PASS（附 T1） | policy 层直接取 `CommandNode.denyCause` + 复用 `DENY_CAUSE_LABEL`：`archive-catalog.ts:284,296-297`；auto 层 `autoAuthHardLine` 派生：`:246-253`，两行分列渲染：`tree-drawer.ts:479-491`（`deny-cause` 字段 + `auto-auth` 字段）。**全量交叉**：`test/insight-archive.test.ts:726-737`（122 卡 0 分歧）。**T1**：V2-4 fixture 仅含 `s3-unknown-risk`，卡级未直接断言 S1/evaluate 分类（依赖 P0 `insight-projection.test.ts:235-243` + 档案对 `denyCause` 的恒等映射） | 低 / 否 |
| **C5** | 规范符合 | **FR-V2-052**：`deny`/`delay` 不渲染为可关开关，无命令级覆盖 | ✅ PASS | 见 C22 四层结构证据；`deny` 卡无控件（`ArchiveCard` 无控件字段，`archive-catalog.ts:89-113`）；DOM 实跑 `.tree-archive` 内零控件（`#I-19g` PASS，`test/ui/insight.mjs:722-740`） | 无 |
| **C6** | 规范符合 | **FR-V2-053**：与 parity 同源机器对账，新增/丢失即失败 | ✅ PASS | 复用 `catalog-reconcile.ts`（不新建真值）：`test/insight-archive.test.ts:305-309,400`；`CATALOG_BASELINE_META` 与 `loadBaseline()` 真值 + 40 位 commit 锚定：`:596-604`；`ARCHIVE_PARITY_PINNED_CLEAN` 由真实 `reconcileCatalog` 复算断言：`:400-401` | 无 |
| **C7** | 规范符合 | **FR-V2-054**：`delay` 撞词消歧单一措辞源 + `delayMs` 独立列 | ✅ PASS | 档案**导入** `TREE_NO_ESCALATION_NOTE`（`archive-catalog.ts:24,572`），模块内 `非可配置档位` 零命中；`delayMs` 独立列：`tree-drawer.ts:498`；DOM 全文档 `非可配置档位` 恰 1 次（`#I-19e` PASS） | 无 |
| **C8** | 规范符合 | **FR-V2-055**：来源标注（base/site_*/plugin_*），`site_*` 标注所属 origin | ✅ PASS（附 T4） | `sourceKind` 真值直映：`archive-catalog.ts:293`；`site_*` origin 取 `crossLinks`：`:273-280`；站点 fixture 全 7 卡标注 origin + 与真实链一致：`test/insight-archive.test.ts:739-752`；UI 渲染「来源：`site-declared`（站点 `origin`）」：`tree-drawer.ts:493-501`。**T4**：真实 dist 无绑定站点 → `#I-19d` 走「0 张」分支，site 卡正向 DOM 路径仅 node 覆盖 | 低 / 否 |
| **C9** | 规范符合 | **FR-V2-056**：抑制态标注 + 只读检索/过滤 | ✅ PASS | 抑制态：`archive-catalog.ts:300-301` + UI `tree-drawer.ts:502-504`；只读过滤（query/action/risk/source/denyCause/origin/suppressed）：`:425-440`；门禁 A6 断言过滤前后快照全等 + 真收窄：`test/insight-archive.test.ts:562-590`；DOM `#I-19f1/f2` PASS | 无 |
| **C10** | 规范符合 | **NFR-V24-001**：纯展示、无任何写路径 | ✅ PASS | 四层结构证据见 C22；`archive-catalog.ts` 禁用面 9 条 grep 零命中（本审查独立复核）；`innerHTML` 全 `src/ui/tree/` 零命中 | 无 |
| **C11** | 规范符合 | **NFR-V24-002**：判定表与 `policy.ts`/`auto-authorize.ts` 真值一致 | ✅ PASS | 全量 122 卡 + 站点域**192 格矩阵**逐格与**真实** `decideAutoAuthorization` 精确等值（非「派生更严」式放宽）：`test/insight-archive.test.ts:754-791`；5 条钉死类逐条 `derived===real`：`:793-817` | 无 |
| **C12** | 规范符合 | **NFR-V24-003**：与 parity 同源、142 子命令逐条可验 | ✅ PASS | `countBaselineSubcommands` 复算 = 142（本审查独立复算）；A2 行级并集注入真实基线行验证：`test/insight-archive.test.ts:424-446`；A7 常量漂移门禁 + 反证：`:596-610` | 无 |
| **C13** | 规范符合 | **NFR-V24-004**：档案不含 key/剪贴板/通知明文 | ✅ PASS | `archive-catalog.ts` `apiKey` 零命中（本审查独立 grep）；卡片字段仅命令名/档位/risk/来源/delayMs/成因/抑制态，无内容字段；A4 源码 grep 门禁：`test/insight-archive.test.ts:509-527` | 无 |
| **C14** | 规范符合 | **NFR-V24-005**：`deny` 三成因用户语言 + `delay` 消歧完整 | ✅ PASS | 成因文案复用 `DENY_CAUSE_LABEL`（单一措辞源）；auto 层中文说明 `autoAuthLabel`：`archive-catalog.ts:255-266`；只读/不夸大声明：`:521-528`；DOM `#I-19c/#I-19e` PASS | 无 |
| **C15** | 规范符合 | **EC-V24-001**：risk 未知/非法/缺失 → `deny` + S3 | ✅ PASS | 矩阵含 `bogus`/`undefined` 列，逐格与真实链一致：`test/insight-archive.test.ts:755-791`；`s3-unknown-risk` 由 P0 `deriveAction` 产出（V2-4 恒等消费） | 无 |
| **C16** | 规范符合 | **EC-V24-002**：命令集合与基线漂移 → 对账 FAIL | ✅ PASS | 真实 `reconcileCatalog` 四字段全空断言：`:400`；A7 常量改一位反证 FAIL：`:606-610`；A2 删行/幽灵行反证 <100%：`:448-476` | 无 |
| **C17** | 规范符合 | **EC-V24-003**：命令被抑制 → 标注抑制态（不误报可执行） | ✅ PASS | `suppressed`/`suppressionReason` 直映 + UI 标注：`archive-catalog.ts:300-301`、`tree-drawer.ts:502-504`；fixture 28 条抑制合成条目（去重 23 工具名）经 A1 唯一性断言：`test/insight-archive.test.ts:350-365` | 无 |
| **C18** | 规范符合 | **EC-V24-004**：`site_*` 未授权 → 归 S1 deny 成因 + 标注来源站点 | ⚠️ PASS（继承 P0） | S1 归属由 P0 `deriveAction` 承担（`insight-projection.test.ts:235` `s1-unauthorized`），V2-4 恒等消费 `denyCause` + 标注 origin；V2-4 fixture 无未授权 site 卡的独立反向断言（见 T1） | 低 / 否 |
| **C19** | 规范符合 | **EC-V24-005**：`delay` 误读为「待批准/可配置」→ 消歧完整 | ✅ PASS | 单一措辞源 + 内容哈希 pin + DOM 出现 1 次：`archive-catalog.ts:24,572`、`test/insight-archive.test.ts:533-556`；`#I-19e` PASS | 无 |
| **C20** | 架构一致 | **ADR-V2-016 / ADR-V2-023**：档案 = 抽屉内默认关子视图；渲染模型并入 `src/insight/`；**零模型改动**；唯一 additive 面 = `service-worker` +1 行 | ✅ PASS | `tree-drawer.ts` 追加默认关子视图（`archiveEnabled=false` 初值；`.tree-archive` 开启时才创建）：`:172-260,583-586`；**零模型改动**：`tree-model.ts`/`tree-view.ts`(`TreeFilter`)/`tree-ops.ts`/`tree-receipt.ts`/`command-catalog.ts`/`catalog-reconcile.ts`/`project-tree.ts` 区间 `git diff --numstat` **全空**；`service-worker.ts` = **`1 0`**（仅 `:1657`）；`catalogMeta` **不进快照 hash 输入**（`dist/background.js:32461-32471` hashStructure 不含 catalogMeta） | 无 |
| **C21** | 架构一致 | **ADR-V2-018**：`autoAuthHardLine` 派生只读，与真实判定链一致 | ✅ PASS | 派生顺序与真实链 `auto-authorize.ts:236-253` 对齐（`origin` → `group` → `risk`）：`archive-catalog.ts:246-253`；**真实链为 oracle**（非自建）：`test/insight-archive.test.ts:701-724`；本审查外部实跑：`site/evaluate`、`site/read`、无 origin 等 5 例全部 MATCH | 无 |
| **C22** | 架构一致 | **ADR-V2-020**：只读四层结构证据 | ✅ PASS | E1 `ArchiveCard` 键无 `controls/actionId/control/actionTarget`（`archive-catalog.ts:89-113`；A4 反证注入 `actionId` 可检出 `:503-507`）；E2 模块图无写面（9 条禁用 grep 零命中，本审查独立复核）；E3 `TREE_ACTION_IDS` 恰 7 值 + sha `e5c65cc3…`（独立复算一致）+ `tree-ops.test.ts:170-180` 列表等值；E4 DOM 零控件（`#I-19g` 真实 dist Chromium PASS） | 无 |
| **C23** | 架构一致 | **ADR-V2-021 / ADR-V2-022**：parity 常量注入 + 门禁纪律（反证/内容哈希/体积重登记） | ✅ PASS | `CATALOG_BASELINE_META` 纯常量（无 `node:`/`chrome.`）：`catalog-meta.ts:16-23`；冻结用 `sha256`（A5/A8）非 `git diff`（`test/insight-archive.test.ts:71` 明示禁 `git diff HEAD`）；体积显式重登记（见 C25 与 §5）；`catch` 只吞 `ENOENT`（新测试零 try/catch） | 无 |
| **C24** | 测试质量 | 测试存在性、覆盖核心/边界/错误路径、断言有效性、无空断言/裸 catch/永真分支 | ✅ PASS（附 T3） | 新文件 **26 test**（本审查计数）+ 9 条 REVERSE PROOF；覆盖三层口径/漂移/过滤/只读/`delay`/体积；`assert.ok(true)`/裸 `catch {}` = 0；反证实跑：覆盖率丢一行→66.7%（本审查外部实跑）、翻转派生→可检出；冻结用 sha256。**T3**：A9 content 断言用 `<=`（非 `===`）且 dist 缺失时显式 `t.skip`；A2 部分防夸大反证为构造式（合成 identity 对象） | 低 / 否 |
| **C25** | 规范符合（文档/体积诚实性） | 体积重登记 + 文档一致性 | ✅ PASS | **独立复算**：`dist/sidepanel.js=1,132,748`（=新基线）、`content.js=1,073,453`（=`CONTENT_MAX_BYTES` 零增长）、`background.js=1,403,170`、`options.js=978,471`；ceiling=`floor(1,132,748×1.05)`=**1,189,385**；`HISTORY=[1,068,165,1,085,389,1,110,744]` 单调不减 + `previousBaselineBytes=1,110,744` + `measuredOn/source/buildCommand/note` 齐备 + `targetBudgetBytes/targetMet=null`（`test/size-baseline.ts:48-78`）；`src/content/**` 三文件 sha 与 pin 一致（本审查独立复算）。`docs/dev.md` §8.2 与 `size-baseline.ts`/dist 实测**三方一致**；`smoke-checklist.md` §5 45/52/**70** 历史保留且与实测一致、§7 人工面登记 ⏳ | 无 |

**覆盖矩阵**：FR-V2-050→C3 · 051→C4 · 052→C5 · 053→C6 · 054→C7 · 055→C8 · 056→C9；NFR-V24-001→C10 · 002→C11 · 003→C12 · 004→C13 · 005→C14；EC-V24-001→C15 · 002→C16 · 003→C17 · 004→C18 · 005→C19；ADR-V2-016/018/020/021/022/023→C20~C23；测试质量→C24。

---

## 3. 十二项关键点独立复核（接受 / 不接受 + 理由 + 证据）

1. **零模型改动是否真成立 → ✅ 接受**。区间 `git diff --numstat 2ede99c 72fefdf` 对 `tree-model.ts`/`tree-view.ts`(`TreeFilter`)/`tree-ops.ts`/`tree-receipt.ts`/`command-catalog.ts`/`catalog-reconcile.ts`/`project-tree.ts`/`policy.ts`/`auto-authorize.ts`/`manifest.json`/`parity.test.ts`/`journey.mjs`/`binding.mjs` **全部为空**；`service-worker.ts` = **`1 0`**，逐行看仅 `:1657` 一行 `catalogMeta` 注入、0 删除、无既有行修改；`catalogMeta` 不进 `hashStructure`（dist `background.js:32461-32471`）。**唯一新增运行时行为正确且确定性不受影响**。

2. **D-V24-01（单行动态导入）→ ✅ 接受（附建议 W2）**。这是为满足 `tasks.md:124` 的**指标 AC**（`git diff --numstat` 恰 `1 0`）而采用的写法。**复核结论：语义等价、无时序/竞态风险、首次快照不会缺 `catalogMeta`**——`build.mjs:37` `bundle:true`、默认 `splitting:false`，esbuild 将动态导入内联为 `await Promise.resolve().then(() => (init_catalog_meta(), catalog_meta_exports))`（`dist/background.js:34607`），无网络/无独立 chunk（`dist/` 仍 7 文件）；`buildInsightSnapshot` 本身 `async`，`await` 先于 `buildInsightTree`，故任何一次快照都必含该字段；与静态导入在打包后**语义一致**。属「由指标 AC 诱导的非惯用写法」而非功能缺陷。**W2** 建议把 AC 改为语义化（additive / 无删除 / 无既有行修改）+ 在 dist 门禁断言 `catalogMeta` 存在且 === 常量（防未来启用 `splitting` 时语义变化）。

3. **三层口径与防夸大 → ✅ 接受（附 T3/建议 W3）**。**本审查独立复算（从 `baseline-catalog.json` + `waivers.json` + P0 同款 fixture 跑 `buildArchiveModel`）**：L1 **34/142**、L2 **20/88**（byStatus 四项逐项吻合）、L3 **28 条目/94 子命令=122 卡**（distinct 23）、行级并集 **176/176=100%**（`missingRows=[]`；carded-only 68 + waived-only 108，两者交集 0）。数字**真实可复现**，与 build 声称一致。**`accounted` 性质**：运行时 `basis='counts'`、`coveredRows=176/percent=100` 为**声明式计数**（`archive-catalog.ts:362-371`），行级真值仅在 node 门禁注入 `coverageRows` 后为 `basis='rows'`（`D-V24-08` 已登记）。**是否构成「口径不实」→ 否**：① 运行时 `accounted` **UI 不渲染**（`tree-drawer.ts:505-559` header 只渲染 liveCounts/baseline/parity/site-count）；② `basis` 为类型级判别字段、`NO_EXAGGERATION_NOTE`（`archive-catalog.ts:524-526`）明示「只显示实时面卡数，不声称基线已全部渲染」；③ 行级 100% 由门禁以真实基线行机器验证。属**如实标注的口径**，非夸大。**W3**：既然 UI 不消费，建议运行时模型移除 `accounted` 或显式标注「仅门禁可验，构建期 parity 门禁背书」，以免未来被误读为运行时实测。

4. **A3 交叉断言是否同义反复 → ✅ 接受**。`autoAuthHardLine` 是位于 `archive-catalog.ts` 的**独立再实现**，其 oracle 是**真实** `decideAutoAuthorization`（`src/security/auto-authorize.ts:229-262`，`test/insight-archive.test.ts:701-709` 直接调用真实链），**非自建 oracle、非同义反复**。本审查外部实跑反证：`{site,evaluate,origin}`→derived=true/real=true、`{site,read,origin}`→false/false、`{site,evaluate}`（无 origin）→false/false 等 5 例全 MATCH；把 `derived` 翻转即被检出。**站点域矩阵 192 格**（3×8×2×2×2）**逐格**用真实链比对（`:754-791`），任一格不等即 FAIL。**5 条钉死类**要求 `derived===real` 的**精确等价**（比「只允许更严」更强，杜绝从宽），方向正确。

5. **只读四层证据 → ✅ 接受（修正 1 处表述）**。E1 `ArchiveCard` 键集合无控件字段（`archive-catalog.ts:89-113`）；E2 `archive-catalog.ts` 对 `tree-ops`/`tree-receipt`/`TreeActionId`/`riskDefaults[:=]`/`createPluginPolicyConfig`/`innerHTML`/`chrome.`/`apiKey`/`非可配置档位` **9 条本审查独立 grep 零命中**；E3 `TREE_ACTION_IDS` **恰 7 值** + `sha256(JSON)=e5c65cc3…`（本审查独立复算一致）；E4 DOM 断言**在真实 dist + 真实 Chromium DOM** 上执行（`#I-19g` 用 `document.querySelectorAll` 真实查询，本审查实跑 PASS）。**修正**：该 sha `e5c65cc3…` 是 **V2-4 新增的 pin**（P0 的 `tree-ops.test.ts:170-180` 用**列表等值**冻结、并无此 sha）；7 个动作**取值**与 P0 完全一致、零新增。build「与 P0 一致」应理解为「**值**一致」，而非「P0 已有同 SHA pin」。

6. **`test:hardening` 偶发（D-V24-06）→ ✅ 判定为环境抖动，非真缺陷（不阻塞）**。详见 §4。

7. **体积重登记诚实性 → ✅ 接受**。`1,110,744 → 1,132,748`（+22,004）；`HISTORY=[1,068,165, 1,085,389, 1,110,744]` 单调不减；`previousBaselineBytes=1,110,744`；`measuredOn='2026-09-13'`/`source`/`buildCommand`/`note`/`measuredBy` 齐备；`targetBudgetBytes/targetMet=null`；容差 5% 不变；`SIDEPANEL_CEILING=1,189,385=floor(基线×1.05)`；`content.js=1,073,453=CONTENT_MAX_BYTES`（零增长，本审查实测）；`src/content/**` **3 文件 sha 与 pin 逐条一致**（本审查独立复算）。**非静默上调**：8 处钉死值订正均有 `D-V24-05` 登记与 `size-budget.test.ts` 注释说明，断言结构零删减（`assert.*` 42→63，本审查复算）。

8. **`delay` 单源消歧 → ✅ 接受（附 T2）**。档案**导入** `TREE_NO_ESCALATION_NOTE`（`archive-catalog.ts:24`），模块内 `非可配置档位` 零命中；`sha256(TREE_NO_ESCALATION_NOTE)=d37fecff…`（本审查独立复算 = pin）；DOM 实跑 `.tree-note-no-escalation` 恰 1 处、`非可配置档位` 全文档 1 次（`#I-19e` PASS）；档案以引用块提示「见上方」而非重复渲染（符合「同一处并标」）。**T2**：`model.notes` 冗余未用字段（见 C2）。

9. **测试零降级 → ✅ 接受（附 T3）**。`insight.mjs` `git diff -U0 | grep -E '^-[^-]'` **空（append-only，0 修改行）**；`check(` 45→**56**、`checkLayout(` 3→**4**、运行时 `passes` 52→**70**（本审查实跑）；既有 `#I-00…18e` 未变（无删除行即无改行）。`journey.mjs`/`binding.mjs`/`test/parity/**`/`perf-*` 区间零 diff。**注意**：`size-budget.test.ts` 确有 8 行删除，但为**显式重登记例外**（`D-V24-05`），断言结构零删减、历史值保留，符合 W4 纪律——非「测试降级」。

10. **新门禁真伪 → ✅ 接受（附 T3）**。`test/insight-archive.test.ts` 全文**无 `try/catch`、无 `assert.ok(true)`、无裸 `catch {}`、无永不触发分支**（本审查读全文 + grep）；冻结用 **`sha256`**（A5/A8），**未使用** `git diff --quiet HEAD` 作冻结（文件首注释明示禁用）；反证自测经 `assert.throws` 实现且实跑通过；本审查外部实跑证实其**可证伪**（覆盖率丢一行→66.7%；A3 翻转→可检出）。**T3**：A9 content 用 `<=` 且 dist 缺失时 `t.skip`（显式、非静默）；A2 一条防夸大反证为构造式合成对象（轻）。

11. **安全红线零放宽 → ✅ 接受**。`sha256(policy.ts)=bfcb2ede…`、`sha256(auto-authorize.ts)=1096d065…`（本审查独立复算，**=== P0 pin** `test/insight-no-escalation.test.ts:249,252`）；`manifest.json` 零 diff；`package.json`/`package-lock.json`/根 lock 零 diff（**无新依赖**）；`packages/web-cli-base/**` 零 diff；`main` = `2ddc92299ad10cfe0ea2b65403243a45ce7fb041`（未动）。

12. **文档一致性 → ✅ 接受**。`docs/dev.md` §8.2：sidepanel **1,132,748** / ceiling **1,189,385** / background **1,403,170** / content **1,073,453（零增长）**，与 `size-baseline.ts` + `dist/` 实测**三方一致**；修订记录 3.3 登记且历史值保留。`docs/smoke-checklist.md` §5 断言数 **45/52/70** 历史保留、与实测 **70** 一致；§7 新增人工面 V2-H-7~9，均 `⏳ 待人工`（未冒充 PASS）。

---

## 4. `test:hardening` 偶发的判定（D-V24-06）

**判定：环境抖动（Chromium 启动/CDP 就绪超时类），非真实缺陷；不阻塞。但 `tail -8` 截断日志的做法确属可诊断性缺陷。**

**依据（判断依据透明）**：
1. **被测代码与 hardening 无关**：`test/ui/hardening.mjs` 区间 `git diff --numstat` **零 diff**；崩溃点 `hardening.mjs:508` 即 `await phaseA()`，而 `phaseA()` 仅加载 `file://${dist}/options.html`（`hardening.mjs:179-262`）——V2-4 只改 `sidepanel.js`/`background.js`/`archive-catalog.ts`/`catalog-meta.ts`，**未触及 `options.js` 源码**，phaseA 与 V2-4 产物无逻辑关联。
2. **异常类型**：`main().catch` 打印 `err`（`hardening.mjs:524-527`）；`phaseA` 内可能抛错的最早步骤是 `browserCdp`（30s 轮询超时抛 `browser debugging endpoint never came up`，`:156-164`）或 `openPage` target 未就绪——均为**启动时序/资源竞争**类，而非断言失败。
3. **同 commit、同 dist 复现性**：build 记录两次独立复跑 PASS；**本审查在相同 commit、相同 dist（`dist/background.js=1,403,170` 等实测一致）上首跑即 `PASS — 24 assertions`，无异常**（日志 `/tmp/opencode/hardening-run.log`，完整保留）。
4. **非新引入**：P0 轮次已登记 `test:hardening` 会中途重建 `dist`（build stamp 变化）为已知副作用；其脆弱点为仓库既有，V2-4 未新增。

**`tail -8` 截断日志的评价（建议 W1）**：该做法使原始未捕获异常**不可复原**（错误对象多行打印，`tail -8` 常只留栈尾、丢失 message），直接导致本轮无法定位 `phaseA` 内具体失败点；本仓库此前已多次因日志截断而无法定位（P0 W3/W4 等）。**建议**：门禁失败时**完整落盘**（`> /tmp/log 2>&1` 或 `tee`）并保留 error.cause/栈；**不得**以下游「复跑绿」替代原始证据留存。此建议严重度：**中**（诊断纪律），非阻塞。

---

## 5. 三层口径「自己复算」的结果（不引用 build 数字）

| 层 | 本审查独立复算 | build 声称 | 一致？ |
|----|----------------|-----------|:--:|
| L1 对账基线 | `baseline-catalog.json`：**34 tools / 142 subs**，provenance commit `2ddc92299ad10cfe0ea2b65403243a45ce7fb041` | 34/142 | ✅ |
| L2 豁免登记 | `waivers.json`：**20 tools / 88 subs**；byStatus `mapped 4/39`·`not-applicable 9/29`·`baseline-disabled 6/16`·`delegated 1/4` | 20/88 + 同四组 | ✅ |
| L3 实时投影面 | P0 同款 fixture 跑 `buildArchiveModel`：`counts.commands=28`、`counts.subcommands=94`、**cards=122**、distinct tool names=**23** | 28/94=122，去重 23 | ✅ |
| accounted（行级并集） | 注入真实基线行/豁免行：**176/176=100%**，`missingRows=[]`；未覆盖 0；carded-only 68 + waived-only 108（交集 0） | 176/176=100% | ✅ |

**`accounted` 口径是否成立 → 成立，但性质须如实理解**：运行时 `basis='counts'` 是**声明式计数**（`coveredRows=baselineRows=176`、`percent=100` 由构造得出，非运行时实测；`archive-catalog.ts:362-371`）；**行级真值（`basis='rows'`）仅在 node 门禁注入 `coverageRows` 时可得**（`D-V24-08`）。该计数（a）**UI 不渲染**，（b）由构建期 parity 门禁以真实基线行机器背书（A2 行级 100% + A7 常量漂移门禁），（c）文案显式披露口径。**故不构成「口径不实」**；但建议按 W3 显式标注或移除运行时字段，消除误读空间。

---

## 6. 门禁真伪复核（有无虚绿 / 空断言 / bare catch；能否真 FAIL）

| 门禁 | 本审查实跑 | 反证 / 可证伪性 | 虚绿风险 |
|------|:--:|------|:--:|
| `npm test`（node，含 `insight-archive` 26 + `size-budget` 14） | ✅ **646/646 pass / 0 fail** | 9 条 REVERSE PROOF + `assert.throws`；A8 一字节改动 FAIL | 无 |
| `test:insight`（Chromium 真实 dist） | ✅ **PASS 70 assertions** | `#I-19a0…h2` 全绿；默认关/开→零控件/开档案布局不回退 | 无 |
| `test:hardening`（Chromium） | ✅ **PASS 24 assertions**（首跑即绿） | A/B/C 三相位；D-V24-06 偶发为环境类（见 §4） | 无 |

- **无 `assert.ok(true)` 式空断言**（新测试 grep 0）；**无裸 `catch {}` 吞断言**（新测试零 try/catch）；**冻结用 `sha256` 内容哈希**（A5/A8），**未**以 `git diff --quiet HEAD` 为唯一冻结。
- **反证自测真会 FAIL**：本审查外部实跑证实——行级覆盖率丢一行→`66.7%`（`<100`）、`missingRows=['c']`；A3 派生翻转→可检出（derived≠real）；`assertPinnedHash` 改一字节→抛「内容哈希漂移」。
- **`size-budget` 例外透明**：8 行删除均为显式重登记钉死值（`D-V24-05`），断言结构零删减（42→63），历史值保留。

---

## 7. 问题清单

### 阻塞问题：0 个
未发现安全底线违规、无功能阻断、无未审批权限、无判定链改动、无 base/v1/main 越界、无口径夸大。

### 建议（非阻塞）

| # | 项 | 严重度 | 为何不阻塞 |
|---|----|:--:|------|
| **W1** | **`test:hardening` 失败日志被 `tail -8` 截断**，原始未捕获异常不可复原，削弱可诊断性（本仓库多次因截断无法定位） | 中 | 属**诊断纪律**问题，非功能/产物缺陷；建议失败时完整落盘并保留栈与 `cause`，不得以「复跑绿」替代原始证据 |
| **W2** | **指标型 AC 诱导单行动态导入**：`tasks.md:124` 以 `git diff --numstat` 恰 `1 0` 为 AC，导致非惯用的单行动态 `import()`（工程上更应静态导入）。当前 esbuild `splitting:false` 下语义等价（已验证），但若未来启用代码分割，语义会变 | 低 | 语义已验证等价、无时序/竞态、首次快照不缺字段；建议 AC 语义化（additive/无删除/无既有行修改）+ dist 门禁断言 `catalogMeta` 存在 |
| **W3** | **运行时 `accounted` 为声明式计数（硬编码 100%）且 UI 不渲染**：虽已 `D-V24-08` 登记、类型判别 `basis` 与文案披露，仍存在被误读为运行时实测的空间 | 低 | 行级 100% 由 node 门禁以真实基线行机器验证；UI 不显示该值、不夸大；建议移除运行时字段或显式标注来源 |
| **W4** | **P0 判定链冻结仍用 `git diff --quiet HEAD`**（`insight-no-escalation.test.ts` 的 `gitDiffHeadStatus`，P0 W3 旧患），V2-4 未（也不应越界）修 | 低 | 已有 `POLICY_TS_SHA256`/`AUTO_AUTHORIZE_TS_SHA256` 内容哈希 pin 兜底；V2-4 已用区间级 `git diff` + 独立复算证实零放宽；建议 v2 收口统一为内容哈希 |

### 提示（非阻塞）

| # | 说明 |
|---|------|
| **T1** | **`deny` 三成因分类在 V2-4 未直接断言**：fixture 仅 `s3-unknown-risk`（3 卡），S1/`evaluate-floor` 的分类正确性依赖 P0 `insight-projection.test.ts:235-243` + 档案对 `denyCause` 的恒等映射。建议补一条含 S1/evaluate 的卡级断言，或显式声明「继承 P0」 |
| **T2** | `ArchiveModel.notes` 中 `noEscalationNote`/`delayMsNote`/`readOnlyNote` **UI 未消费**（仅 `noExaggerationNote` 被渲染），`readOnlyNote` 与 `header.readOnlyLabel` 重复；建议清理或标注留作测试锚点 |
| **T3** | 门禁可加严：A9 `content.js` 用 `<=`（非 `=== 1,073,453`）且 dist 缺失时 `t.skip`（显式但可错过）；A2 一条防夸大反证为**构造式合成对象**（非翻转实现）；建议补 `===` 与「实现翻转」型反证 |
| **T4** | 真实 dist 无绑定站点 → `#I-19d` 走「0 张」分支，`site_*` 卡「显示所属 origin」的正向 DOM 路径仅 node fixture 覆盖；已由人工面 V2-H-9 兜底，建议 validate 视情况补真实站点端到端 |

---

## 8. 未覆盖项 / 偏差（如实）

- **未独立跑** `test:ui` / `test:binding` / `test:e2e` / 全仓 `npm test`（内存可用实测仅 ~911MB、仓库有 ~1.5GB OOM 前科；遵守「串行/绝不并发」纪律）。故这些门禁的**运行结果**以 build 声明为准，**不冒充其 PASS**；其**断言存在性与零降级**经本审查静态核验（append-only / 区间零 diff）。**已独立实跑**：`npm test`(646) / `test:insight`(70) / `test:hardening`(24)。
- **未逐行审查** `tree-drawer.ts` 的全部 DOM 事件/焦点管理正确性（属 validate 动手面）；仅核验其只读结构（无 `innerHTML`、档案容器零控件、默认关路径）。
- **人工面** V2-H-7~9（档案长文案/320px 拥挤度、分组切换观感、真实站点 `site_*` 观感）**未执行**，属 headless 不可覆盖项，沿用 `smoke-checklist.md` §7 `⏳ 待人工`，**不冒充 PASS**。
- **本 Feature 目录无独立 `review.md` 策略文件**：C1~C24 清单直接定义于本报告 §2；`state.json` 的 `files.reviewReport` 已登记指向本报告（`files.review` 策略字段因未产出策略文件而缺省，建议后续若严格对齐 ADR-004 双文件则补一份 `review.md` 或在收口注记说明）。

---

## 9. 总体结论

**结论：⚠️ 有条件通过（0 阻塞；4 建议 + 4 提示，均低，W1 为中）**

| 指标 | 结果 |
|------|------|
| FR-V2-050~056 覆盖 | 7/7 有实现与对应门禁断言（C3~C9） |
| NFR-V24-001~005 / EC-V24-001~005 | 全部有对应实现/断言（C10~C19） |
| ADR-V2-016~023 | 逐条比对无违背（C20~C23） |
| 安全红线 | 零放宽：零模型改动（区间级 `git diff` 空）/ `policy.ts`·`auto-authorize.ts` 内容哈希 === P0 pin / manifest·base·lock 零 diff / 无新依赖 / DOM 零控件 / `TREE_ACTION_IDS` 恰 7 值 |
| 三层口径 | **独立复算一致**（34/142 · 20/88 · 28/94=122 · 176/176=100%）；`accounted` 计数口径如实披露，不构成夸大 |
| 门禁真伪 | 实跑 `npm test` 646/646、`test:insight` 70、`test:hardening` 24 全绿；无反证虚绿、无空断言、无裸 catch、冻结用 sha256 |
| 测试零降级 | `insight.mjs` append-only（0 修改行）；v1 `journey`/`binding`/`parity`/`perf-*` 零 diff；`size-budget` 8 行删除为显式重登记例外 |
| 体积诚实性 | sidepanel 1,132,748（显式重登记 + 历史保留 + 日期/来源/理由齐备）；content.js 1,073,453 零增长 + 源码哈希 pin |
| 新增阻塞 | **0** |

**判定理由**：V2-4 本质是「把 P0 已就绪的命令档案数据在既有抽屉内落地为**结构无控件的只读子视图**」。经**独立哈希复算 + 独立计数复算 + 区间级 `git diff` + 三个门禁串行实跑 + 反证外部实跑**核验：零模型改动成立；三层口径数字真实可复现且**不夸大**（运行时计数口径已如实登记/披露）；`deny` 分层派生与**真实**判定链全量 + 192 格矩阵精确一致；只读四层结构证据成立（DOM 实跑零控件）；`delay` 单源；测试零降级；体积重登记显式且历史保留；安全红线零放宽。唯一「中」级问题 W1（hardening 日志截断）为**诊断纪律**而非产物缺陷，且该偶发经本审查在同 commit/dist 首跑即绿、判定为环境抖动，**不构成阻塞**。据此判为**有条件通过**，可进入 `@sddu-validate` 动手验证。

---

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | R1 审查：web-cli-plugin v2 V2-4 命令档案浏览器（区间 `2ede99c..72fefdf`）。C1~C24 逐项；十二项关键点独立复核（零模型改动 / 单行动态导入语义等价 / 三层口径防夸大 / A3 交叉断言有效性 / 只读四层 / hardening 偶发 / 体积重登记诚实性 / `delay` 单源 / 测试零降级 / 门禁真伪 / 安全红线 / 文档一致）；三层口径独立复算（34/142 · 20/88 · 28/94=122 · 176/176）；门禁串行实跑（`npm test` 646/646、`test:insight` 70、`test:hardening` 24）；反证外部实跑；问题清单 4 建议 + 4 提示。**结论 ⚠️ 有条件通过（0 阻塞）** | 2026-09-13 | SDDU Review Agent |
