# 审查策略（C1~C44）：specs-tree-v3-3-l2-on-demand-views

> **文档定位**: SDDU 审查策略 — 指导 review Agent 执行自主审查的清单和方法；审查结果见 `review-report.md`
> **前置依赖**: 本叶 `spec.md`（FR-V3-045~054 / NFR / EC 切片）、`plan.md`（ADR-V3-025~029）、`tasks.md`、`build.md`；父 `../spec.md`（权威条文 / AC-V3-*）、父 `../plan.md`（ADR-V3-025~029 的上位约束）
> **创建人**: SDDU Review Agent
> **创建时间**: 2026-09-16
> **版本**: v1.0
> **更新人**: SDDU Review Agent
> **更新时间**: 2026-09-16
> **更新说明**: 初始创建（44 项自主审查清单；覆盖 4 维度 + 证据/文档保真 + 本轮 6 项重点打假）

---

## 1. 审查概要

| 维度 | 数值 |
|------|:--:|
| 审查对象文件数 | 25 个（`git diff --stat bf5773d..HEAD` 全量：7 新增 + 15 修改 + 3 SDDU 产物；另只读核对 6 个未改文件） |
| 审查项总数（C1~C44） | 44 |
| 反证/复现实验 | 15 门禁串行实跑 + size 归因实跑 + 1 次受控 ARIA 探针（Chromium） |
| 通过 / 警告 / 失败 | 见 `review-report.md` |

## 2. 自主审查清单（C1~C44）

**审查对象来源**：
- `spec.md`：FR-V3-045~054 / NFR-V3-001~018（本叶落点）/ EC-V3-002~016 → 逐项核验实现完整性
- `plan.md`：ADR-V3-025~029 + §5 文件影响分析 → 架构遵循性
- `build.md`：§1 门禁数字 / §2 文件清单 / §4 需求→证据 / §5 体积与密度 / §6 反证 / §7 零改动 → 覆盖完整性与数字保真
- `src/` + `test/`：`l2/{counts,view-host,command-catalog,audit}.ts` + `settings/sections.ts` + `sidepanel.ts` / `index.html` / `l0/*` / `view-model.ts` + `test/ui/{l2,insight,l0}.mjs` + `test/l2-counts.test.ts` + `size-*` / 台账 / 密度基线 → 代码质量与测试质量

**四维度指引 + 第五维（证据/文档保真）**，并叠加本轮 6 项重点打假（计数真值派生 / 语义迁移是否削弱 / insight 同编号迁移是否增强 / 密度 chars 重登记合规 / 体积归因正当性 / `v3RevealComposer` 有界重试）：

| # | 审查对象 | 审查基准 | 审查维度 | 审查方法 |
|---|---------|---------|---------|---------|
| C1 | 四视图默认零占用（`hidden` 链，非 CSS 隐身 / 非移出视口） | FR-V3-045 / AC-V3-005 | 规范符合性 | 读 `occupancyProbe` + `l2.mjs` ① 逐条 + `index.html` DOM 走查；实跑 `test:l2` |
| C2 | **计数真值派生（重点打假 ①）**：四类计数各自真值源、无常量/缓存退化；`null ≠ 0` | FR-V3-046 / ADR-V3-026 | 规范符合性 | 读 `counts.ts` 全文 + `sidepanel.ts#l2Truth` + SW 侧 `state.insight.counts` 来源（`project-tree.ts:307`）；实跑 RP-V33-02 原文 |
| C3 | `commands` `{live,baseline}` **分列不合并** + 禁夸大表述 | FR-V3-046 / EC-V3-016 | 规范符合性 | 读 `commandCountText` / `l2-counts.test.ts` ② + 运行期 ③ 断言 |
| C4 | 视图替换：`#log` ↔ `#view-host` 二选一、单面板级滚动容器、`← 返回` | FR-V3-047 / ADR-V3-025 | 规范符合性 | 读 `view-host.ts` + `index.html` CSS + `l2.mjs` ②⑤ |
| C5 | 返回后**展开态复原**（进入前 == 返回后逐字段） | FR-V3-047 | 规范符合性 | 读 `disclosure.snapshot/restore` 调用点 + `l2.mjs` ④ + `insight.mjs#I-14c/c0/d` |
| C6 | ≤2 次交互可达（含「返回」路径 ≤1 次） | FR-V3-048 / AC-V3-010 | 规范符合性 | `l2.mjs` ② 真实点击序列 + ④ `#l2-back` 真实点击 |
| C7 | L2 打开期间风险位仍常驻可见（祖先闭包无 `hidden`/`[data-l2-view]`） | FR-V3-048 | 规范符合性 | 读 `index.html` 结构（`body` 直挂）+ `l2.mjs` ⑥ |
| C8 | 命令目录逐条有档 + 来源 + 默认/覆盖/生效分列（逐卡判定） | FR-V3-049 | 规范符合性 | 读 `command-catalog.ts#toRow` + `l2.mjs` ⑧ 逐卡断言 |
| C9 | `delay`=deny 措辞**单源**（不另写）+ 硬底线零控件 + 只可收紧卡无 `allow` | FR-V3-049 / ADR-V3-027 | 规范符合性 | 读 `TREE_NO_ESCALATION_NOTE` 引用链 + `l2-counts.test.ts` ⑤ + `l2.mjs` ⑧ |
| C10 | 审计零明文（字段白名单 + 反例扫描）+ URL 去参 | FR-V3-050 / NFR-V3-016 | 规范符合性 | 读 `audit.ts#toAuditRow/stripUrlParams` + 单测注入泄漏 + `l2.mjs` ⑨ |
| C11 | 设置视图：项集合与 v1 等价、`options.html` 零 diff、`#settings-back` 语义未改 | FR-V3-051 | 规范符合性 | `l2.mjs` ⑩ + `git diff --numstat` |
| C12 | 树 ARIA / 键盘 / 面包屑**仍被断言**（迁移后不是只剩 id 存在） | FR-V3-052 / ADR-V3-028 | 规范符合性 | 读 `l2.mjs` ⑦ + `treeProbe` + `insight.mjs` 迁移后 v2 断言仍全过 |
| C13 | 9 动作白名单 + **固定序**仍被断言（树内实测 ⊆ 白名单；目录列表逐字序；常量 sha256 pin） | FR-V3-052 | 规范符合性 | `l2.mjs` ⑦⑧ + `l2-counts.test.ts` ⑤ + `insight-archive.test.ts` A8 |
| C14 | 零提权：目录/审计视图零控件；伪造消息不能突破 SW 侧 clamp | FR-V3-053 / AC-V3-019 | 规范符合性 | 读 `command-catalog.ts` 渲染面 + `l2.mjs` ⑧ 伪造 `command-policy-set` 反证 |
| C15 | 返回后密度复位默认档（单源口径 `DENSITY_MEASURE_SOURCE`） | FR-V3-054 / AC-V3-001~004 | 规范符合性 | `l2.mjs` ④ 实测 + `test:density` 阶段 A/B/C/E |
| C16 | 体积：`sidepanel.js 349,880 ≤ 367,374`；公式/cap/容差未变；重登记披露五要素齐备 | NFR-V3-005 / AC-V3-016 / ADR-V3-011 | 规范符合性 | `stat` 实测 + 读 `size-baseline.ts` + `size-budget.test.ts` 4 处 pin |
| C17 | 权限零新增：`manifest.json` 零 diff、无 `contextMenus`、依赖段零新增 | NFR-V3-006 / AC-V3-017 | 规范符合性 | `git diff --numstat` + `grep contextMenus` + `package.json` diff |
| C18 | 320px 零水平溢出 + 明暗双主题 + 无障碍（`hidden`/focus/aria） | NFR-V3-009/010/011 / EC-V3-008/009 | 规范符合性 | `l2.mjs` 320px 段 + `view-host.ts` 焦点管理 + `index.html` 主题变量走查（覆盖强度如实登记） |
| C19 | EC 落点：EC-V3-016 分列、EC-V3-008 窄栏、EC-V3-011 缺入口、EC-V3-013 本叶内闭合、EC-V3-014 origin 切换、EC-V3-002/003 硬底线可读 | spec §6 | 规范符合性 | 逐条比对代码路径与门禁段落映射 |
| C20 | **AC-V3-026 能力集等价 8 项逐项**（含「回执三件套」是否真被断言） | AC-V3-026 | 规范符合性 | 读 `l2.mjs` ⑩ 判据逐项拆解 + 标题↔判据一致性核对 |
| C21 | 取代台账：删除行**逐行**命中、计数不减、反证真 FAIL | AC-V3-011/012/014 | 规范符合性 | 实跑 `test:supersession` + 独立用 `git diff base` 重算 insight.mjs 删除行 27 条并逐行定位 |
| C22 | AC-V3-010 入口：非空文字 + 计数 + `aria-controls`/`aria-expanded` **成对且指向真目标** | AC-V3-010 | 规范符合性 | 读 `status-bar.ts#render/syncTriggerAria` + `index.html` + **1 次受控 Chromium 探针**读回真实属性 |
| C23 | ADR-V3-025 遵循（`#view-host` 为 `#log` 兄弟 / 单滚动 / 风险位 `body` 直挂 / 焦点） | ADR-V3-025 | 架构一致性 | 读 `index.html` 文档序 + `view-host.ts` + `disclosure.snapshot` 契约 |
| C24 | ADR-V3-026 遵循（单一派生点 / 分列 / 双向门禁 / 不新增 L0 常驻可点） | ADR-V3-026 | 架构一致性 | `grep` 计数派生调用点唯一性 + `density` 默认档 C1=7 |
| C25 | ADR-V3-027 遵循（只读投影不重算策略 / 单源措辞 / 零提权 / 9 动作） | ADR-V3-027 | 架构一致性 | 读 `command-catalog.ts` 依赖面（`archive-catalog` / `tree-ops` / `tree-view` 只读） |
| C26 | **ADR-V3-028 全 6 条**（id/内容保留、归属迁移、属性迁移台账、ARIA/键盘/面包屑/9 动作零改动、FAB 默认 hidden、取舍登记） | ADR-V3-028 | 架构一致性 | 逐条比对 `index.html` / `sidepanel.ts` / 台账 V33-S1 + `git diff src/ui/tree/tree-drawer.ts`（应 0 行） |
| C27 | ADR-V3-029 遵循（三类改动登记 / 4 契约未迁移 / union 计数补齐 / 不删用例） | ADR-V3-029 | 架构一致性 | 读台账 entries+modifiedRanges + `test/sidepanel-view.test.ts` 零 diff + `counts.insight` union 口径 |
| C28 | plan §5 文件影响对齐（**遗漏/多余/未预测**文件） | plan §5 / build §2 | 架构一致性 | `git diff --name-only bf5773d..HEAD` 逐文件比对计划表 |
| C29 | 边界不越（不碰 `src/content/**`、判定链、权限、依赖段、`main`、v1/v2 SDDU、其它叶） | 父 §2.2 / 红线 | 架构一致性 | `git diff` 段级核验 + `git rev-parse main` |
| C30 | 可读性 / 命名 / 职责单一 / 分层（`l2/` 四模块 + `settings/sections`） | §5.1 | 代码质量 | 模块头注释 + 导出面 + 函数长度走查 |
| C31 | 错误处理完善；无静默吞异常 / 无失败伪装成功 | §5.1 | 代码质量 | 全部 `catch` 语义走查（`stripUrlParams` / `pullInsightSnapshot` / `refreshAuditView`）+ `forced()` 抛错路径 |
| C32 | 无硬编码魔法值（计数、文案、阈值、几何常数） | §5.1 | 代码质量 | `grep` 数字/文案字面量 + 单源常量核对（`L2_BAR_TEXT` / `72px` / `SOURCE_LABELS`） |
| C33 | 无冗余 / 死代码 / 未接线常量（复用既有投影而非复制） | NFR-V3-014 / 增长正当性 | 代码质量 | 导出面引用扫描（`catalogCounts` / `AUDIT_FIELD_WHITELIST`）+ `dist` 树摇核对 + `SIDEPANEL_GROWTH_BREAKDOWN` Δ=0 行 |
| C34 | 纯函数 / 可测性（`counts.ts` 无 DOM、无 `chrome.*`；`audit.ts` 白名单构造性丢弃） | ADR-V3-026 / plan | 代码质量 | 模块依赖面 `grep` + `l2-counts.test.ts` 可驱动性 |
| C35 | 测试存在 + 覆盖核心逻辑路径（`l2.mjs` 71 / `l2-counts.test.ts` 8 / insight 116 / l0 160） | §5.4 | 测试质量 | 实跑五门禁 + FR→断言映射逐条定位 |
| C36 | 边界条件 / 错误场景覆盖（未知真值 `…`、空审计、clamp 反证、injection 反例、320px） | §5.4 / EC | 测试质量 | 读单测 + 门禁段落清单，标注**未覆盖**的边界（audit/settings 320px、主题） |
| C37 | 断言有效性（非恒真、非弱断言、标题↔判据一致、无非空转） | §5.4 | 测试质量 | `l2.mjs` 71 条逐条判据走查（含 `>= 0` 恒真合取、标题超范围） |
| C38 | **虚绿扫描**：空吞 / `assert.ok(true)` / `|| true` / 只 `console.log` 不断言 / `try/catch` 包断言 / 过宽 `skip` / 提前 `exit(0)` | NFR-V3-013 / §10 | 测试质量 | 逐模式全文 `grep`（原文见 report §7） |
| C39 | 反证独立性：注入落在真读路径、FAIL 段真 FAIL、还原逐字节（sha256） | NFR-V3-013 | 测试质量 | 逐份读 `/tmp/opencode/v3-gate-logs/v3-3/rp/*.log` 原文 + 核对还原 sha256 记录 |
| C40 | 门禁计数只增不减 + 新门禁被**元门禁自动纳入**（扫目录推导） | NFR-V3-014 / AC-V3-012 | 测试质量 | 各门禁实测计数 + `gate-integrity.test.ts` 目录推导断言 + `test:v3` 链含 `test:l2` |
| C41 | **文档数字保真**：`build.md` 每个数字与实测一致 | §6 证据链 | 证据/文档保真 | 逐个数字对照实跑日志（772/127/160/103/71/167/116/192/24/9/349,880/367,374/177,076/+31.29%/98.7%） |
| C42 | **机读登记册保真**：`size-baseline.ts` / `density-baseline.json` / `ledger.json` 互相一致 | ADR-V3-011 / NFR-V3-012 | 证据/文档保真 | 逐字段交叉比对（growthBreakdown / volume / reRegistrations / floors / readings）+ 台账 v3SkeletonExemptions 删除条件 |
| C43 | 红线零改动（`content.js` 177,076 + sha256 / `src/content/**` 三 hash / 判定链 sha256 / manifest / 阈值逐字 / 无新依赖 / 无常驻输入框 / 风险位不可折叠） | 父 plan 红线 | 证据/文档保真 | `sha256sum` 实测 + `git diff` 零 diff 原文（report §8） |
| C44 | 审查纪律（只读、未 commit、`main` 未动、实验只在 `/tmp`、未改 v1/v2 SDDU） | 本轮边界 | 证据/文档保真 | `git status --porcelain` + `git rev-parse main` + 实验脚本落盘路径 |

> **质量门槛（数量基线法）**：10 个 FR（FR-V3-045~054）各 ≥1 条 Cx（C1~C15 / C20 覆盖全部 10 条）；5 个维度各 ≥1 条（规范符合性 C1~C22 / 架构一致性 C23~C29 / 代码质量 C30~C34 / 测试质量 C35~C40 / 证据保真 C41~C44）；总数 44 ≥ max(10, 5)。
>
> **策略与报告的分离（ADR-004）**：本文件为 Feature 级固定产物；逐轮执行结果写入 `review-report.md`（R1 起）。

---

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建：44 项自主审查清单（FR-V3-045~054 全覆盖 + 4 维度 + 证据/文档保真；本轮 6 项重点打假显式入清单：C2 / C12 / C13 / C20 / C39 / C42） | 2026-09-16 | SDDU Review Agent |
