# 审查报告（审查策略）：specs-tree-v3-2-l1-disclosure-refs

> **文档定位**: SDDU 审查策略 — 指导 review Agent 执行自主审查的清单和方法；审查结果见 review-report.md
> **前置依赖**: `spec.md`（本叶 + 父）· `plan.md` · `tasks.md` / `tasks.json` · `build.md` · v3-1 先例（`../specs-tree-v3-1-l0-shell-density/{plan,build,review-report,validate-report}.md`）· 代码/测试改动 `cf2af32` / `615bd0f` / `4483fe6` / `e39a58f`
> **创建人**: SDDU Review Agent
> **创建时间**: 2026-09-16
> **版本**: v1.0
> **更新人**: SDDU Review Agent
> **更新时间**: 2026-09-16
> **更新说明**: 初始创建（R1 审查策略：C1~C38 清单 + 五维度 + 门禁退出码虚绿专项方法论）

---

## 1. 审查概要

| 维度 | 数值 |
|------|:--:|
| 审查文件数 | 34 个（本叶 SDDU 产物 6 + 源码 12 + 测试/工具 12 + 机读登记册 4） |
| 通过项 | 33 |
| 改进建议 | 10（I-01~I-10） |
| 阻塞问题 | 0（本叶交付）· 1 项高严重度跨叶缺陷 F-01（非本叶代码，须在依赖其退出码的叶之前修复） |

## 2. 自主审查清单（C1~C38）

**审查对象来源**：
- `spec.md`（本叶 §4 FR-V3-030~040 / §5 NFR-V3-001~018 / §6 EC-V3-001~015 / §7 验收锚点 AC-V3-008~025）→ 逐项核验实现完整性与正确性
- `plan.md`（ADR-V3-001~012 落地引用 + 本叶 plan 的文件影响）→ 架构遵循性
- `build.md`（§1~§9 文件变更 / 门禁计数 / 体积裁决执行 / 逐断言反证）→ 声称-证据一致性（打假面）
- `src/ui/sidepanel/l1/*`、`l0/*`、`sidepanel.ts`、`view-model.ts`、`disclosure.ts`、`index.html`、`test/**`、`docs/*.json` → 代码质量与测试质量
- `/tmp/opencode/v3-gate-logs/v3-2{,-fix}/**` → 独立核对运行期声称（不重跑 Chromium 时的唯一可核证据）

**四维度指引**（+ 本叶追加的「证据/文档保真」与「门禁可失败性」两个专项面）：
1. **代码质量** — 可读性、职责单一性、错误处理、编码规范、无硬编码/冗余
2. **规范符合性** — 对照 spec 逐 FR/NFR/EC
3. **架构一致性** — 对照 plan/ADR + 文件影响 + 受保护面
4. **测试质量** — 覆盖、边界、错误场景、断言有效性（含**恒真/虚绿扫描**）

| # | 审查对象 | 审查基准 | 审查维度 | 审查方法 |
|---|---------|---------|---------|---------|
| C1 | L1 展开不遮挡 L0（风险位/决策卡仍在视口 + 交面积 0 + 单一滚动容器） | FR-V3-030 / AC-V3-010 | 规范符合性 | 读 `l1.mjs` ② 段 + 核对 `05-density.log` |
| C2 | 8 类 L1 内容**逐类** ≤1 次交互；是否**偷偷新增 L0 入口**撑破默认档 | FR-V3-031 / ADR-V3-021 | 规范符合性 | `l1.mjs` ① 段 + `ENTRY`/`TRIGGER` 表 + density 默认档 C1=7 实测 + `index.html` DOM 走查 |
| C3 | 每选项「会发生什么 / 不会发生什么」两段必填 + 破坏性选项不可逆声明 | FR-V3-032 | 规范符合性 | `l1.mjs` ③ 段 + `index.html` `<template>` 走查 |
| C4 | 引用证据四要素齐备 + 证据层只读（写入控件 = 0） | FR-V3-033 / NFR-V3-008 | 规范符合性 | `l1.mjs` ⑪ 段 + `ref-store` 截断口径 |
| C5 | 局部树节点 ≤3（硬上限）+ 含父链 + 全局树入口指向 L2 | FR-V3-034 | 规范符合性 | `local-tree.ts` 走查 + `l1.mjs` ⑪ 注入段 |
| C6 | 「已决策 N 步」N 可复算（含改选标记）+ 回看零副作用 | FR-V3-035 | 规范符合性 | `panels.ts` observe/rounds + `l1.mjs` ⑪ 历史段 |
| C7 | 引用失效五维逐一可注入 + **不确定即失效** + 判定在侧栏侧 | FR-V3-036 / EC-V3-001 | 规范符合性 | `ref-validity.ts` 全文 + `l1.mjs` ⑦ + `l1-ref-validity.test.ts` |
| C8 | 失效常驻风险位 + 可读原因指到该维 + **阻断** + 不静默沿用/丢弃 | FR-V3-037 / EC-V3-001 / NG-V32-002 | 规范符合性 | `risk-rail.ts` / `shell.ts` / `panels.ts:346-366` / `ref-store.dispatch` + `l1.mjs` ⑦⑧ |
| C9 | 两条恢复路径（重新拾取 ≤1 次；改用描述走既有兜底输入）且**都不可绕过** | FR-V3-038 / FR-V3-012 | 规范符合性 | `panels.ts` repick / `index.html#ask-fallback` + `l1.mjs` ⑨ |
| C10 | 回执三件套（摘要 L0 常驻 / 证据 L1 / 审计出口）+ 证据来自**真实重拉** | FR-V3-039 / AC-V3-022 | 规范符合性 | `receipt.ts` 全文 + `l1.mjs` ⑩ |
| C11 | 每个 L1 入口：非空文字 + 摘要/计数 + ARIA 成对 | FR-V3-040 / AC-V3-010 | 规范符合性 | `l1.mjs` ①⑪ + `disclosure.apply` 的 ARIA 强制 |
| C12 | 引用 id **四处贯穿**同一 `ref_<n>`（chip / 证据行 / 风险行 / 角标） | FR-V3-071 / plan ADR-V3-023 | 规范符合性 | `ref-store` 单源 + `GLYPHS`/`ordinalGlyph` + `staleRef` 覆盖链 |
| C13 | L1 展开/收起往返后 L0 默认档密度不回归（不新增口径） | NFR-V3-001 / 002 / AC-V3-001~004 | 规范符合性 | `l1.mjs` ⑫ 实跑值 + `05-density.log` 阶段 E/B/C + 22 格机器比对 |
| C14 | `sidepanel.js` 体积：裁决 V3-VOL-1 是否**真的**被执行（cap 纯记录 + 四守卫） | NFR-V3-005 / 裁决 V3-VOL-1 | 规范符合性 | 全文 grep cap 用法 + `size-baseline.ts` / `size-budget.test.ts` / `size-growth-evidence.test.ts` + 复现 `size:attribution` |
| C15 | 只读投影 + 零审计明文 + URL 去参 | NFR-V3-008 / 016 | 规范符合性 | `receipt.assertNoPlaintext` / `targetDigest` + `l1.mjs` ⑩ 零明文断言 + 单测正反例 |
| C16 | 门禁串行 + 日志完整 + **计数只增不减** + 新断言可 FAIL | NFR-V3-012 / 013 / 014 / AC-V3-012 | 规范符合性 | `run-main-gates.sh` + `00-exitcodes.txt` + 台账 floors + 各 log 计数 |
| C17 | 明暗双主题 / 320–560px 零水平溢出 / 无障碍（aria-expanded/controls、hidden、focus-visible） | NFR-V3-009 / 010 / 011 | 规范符合性 | DOM 走查 + 间接断言链（`assertFoldable` 抛错路径）+ 引用 v3-1/insight 实跑 |
| C18 | EC 边界：EC-001/006/007/011/013/014/015 各自有对应实现或门禁 | §6 EC 表 | 规范符合性 | 逐条比对代码路径与 `l1.mjs` 段落映射 |
| C19 | 判定模块纯粹性（纯函数、无 `chrome.*` / `document` / 时钟 / 副作用） | plan ADR-V3-020 / C: 代码质量 | 代码质量 | `ref-validity.ts` / `ref-store.ts` / `local-tree.ts` / `receipt.ts` 全文 + 单测「同输入同输出 / 不修改入参」 |
| C20 | 错误处理完善；无静默吞异常（空 `catch` / 无提示降级） | §5.1 方法论 | 代码质量 | 全 `src/**` grep 空 catch + 逐 catch 语义走查 |
| C21 | 无硬编码魔法值（截断 80/120、glyph 表、阈值常量、文案模板外置） | §5.1 | 代码质量 | 常量导出与单源核对（`TEXT_DIGEST_MAX` / `SEMANTIC_PATH_MAX` / `REASON_TEMPLATES`） |
| C22 | 无冗余/重复实现（复用 v2 而非复制） | NFR-V3-014 / 增长正当性 | 代码质量 | `SIDEPANEL_GROWTH_BREAKDOWN` Δ=0 行 + `git diff` 变更集比对 + 我实测复现 |
| C23 | 可读性 / 命名 / 职责单一 / 分层（l1/ 五模块各司其职） | §5.1 | 代码质量 | 模块头注释 + 导出面 + 函数长度走查 |
| C24 | 纵深防御：阻断是否双层、是否只有单点 | FR-V3-037 / 修复轮自述 | 代码质量 | `panels.dispatchRefAction` vs `ref-store.dispatch` + `l1-reverse` round0 证据 + 单测覆盖 |
| C25 | plan/ADR 遵循（引用单源 / 判定侧栏侧 / 折叠器复用 / 不新增权限） | plan ADR-V3-020~024 / ADR-V3-001~012 | 架构一致性 | `disclosure.ts` 白名单 & `assertFoldable` + `sidepanel.ts` 派发器 + 权限段 diff |
| C26 | 文件影响对齐：新增/修改清单 vs 真实 `git diff --stat` | plan 文件影响 + build §2 | 架构一致性 | `git diff --stat e45ca53..HEAD` 逐文件比对 |
| C27 | 受保护面零删改（既有门禁断言 / protectedRanges / 逐行台账） | NFR-V3-014 / AC-V3-011 | 架构一致性 | 实跑 `npm run test:supersession` + 读 `supersession-ledger.test.ts` 判据强度 |
| C28 | 边界不越（不碰 `src/content/**`、判定链、权限、依赖段、`main`） | 父 §2.2 / 红线 | 架构一致性 | sha256 pin 实测 + `git diff` 段级核验 |
| C29 | **门禁真实性（新代码虚绿扫描）**：空吞 / 恒真 / `\|\| true` / 只 log 不断言 / 过宽 skip / 提前 `exit(0)` | NFR-V3-013 / §10 方法论 | 测试质量 | 逐模式全文 grep（原文见 review-report §7） |
| C30 | 反证独立性：扰动是否施加在门禁**真读**的路径、FAIL 段是否真 FAIL、还原是否逐字节 | NFR-V3-013 / plan 反证要求 | 测试质量 | 读 `l1-reverse.mjs` 驱动 + `13-rp-l1-reverse.log` + 既有 RP 日志逐份核对 |
| C31 | 断言有效性（非恒真、非弱断言、无非空转） | §5.4 | 测试质量 | `check(` 逐条判据走查 + 非空转对照（`commandSends` / `refreshSeq`） |
| C32 | 覆盖完整性：每个 FR 至少一条可执行断言 + 单测/运行时双层 | §5.4 | 测试质量 | FR→断言映射表（build §3）逐条回代码定位 |
| C33 | **门禁退出码可传播性**：FAILED 是否必然 → 非 0 退出码 | NFR-V3-013 / 本轮专项 | 测试质量 | 读 `binding.mjs` tail/`dumpDiagnostics`/`evaluate`/`send` + **副本受控证伪实验**（1 次 Chromium）+ 8 门禁同类模式全文扫描 |
| C34 | 体积裁决合规性（cap 真纯记录 / 四守卫真能 FAIL / 归因表可复现） | 裁决 V3-VOL-1 ①~⑤ | 证据保真 | 全文 grep cap 条件用法 + 四守卫断言走查 + **实跑** `npm run size:attribution` 比对登记表 |
| C35 | 取代台账非橡皮图章（newTitle 可定位 / 删除行逐行命中 / 无未登记改动） | AC-V3-011 | 证据保真 | 读台账 entries/modifiedRanges/pureAdditionFiles + 实跑 supersession 门禁的逐行判据 |
| C36 | 文档数字保真（build.md / state.json / spec / 机读登记册 互相一致且可复现） | §6 证据链 | 证据保真 | 逐个数字对照日志/实测/登记册；分歧即列 |
| C37 | 红线零改动（`content.js` / `src/content/**` / 判定链 / `manifest.json` / 密度阈值 / 无新依赖 / 无常驻输入框） | 父 plan 红线 | 证据保真 | `sha256sum` 实测 + `git diff` 零 diff + DOM 走查 |
| C38 | 审查纪律（未改源码/测试/文档/配置；未 `git add`/`commit`/`push`；`main` 未动；实验仅在 `/tmp` 副本） | 本轮边界 | 证据保真 | `git status --porcelain` 前后 + `git rev-parse main` + 副本 sha256 |

> **质量门槛核对**：FR-V3-030~040（11 条）+ FR-V3-071 / FR-V3-012 各 ≥1 Cx（C1~C12）；四维度各 ≥1 Cx（代码质量 C19~C24 / 规范符合性 C1~C18 / 架构一致性 C25~C28 / 测试质量 C29~C33），另加「证据/文档保真」专项 C34~C38。Cx 总数 38 ≥ max(FR 数 13, 4)。

## 3. 审查方法学（本轮特有）

### 3.1 「打假」优先序

1. **先判门禁可失败性，再判门禁结论**：一个不能 FAIL 的门禁，其 PASS 不构成证据（NFR-V3-013）。故 C33 被提为第一优先级，且用**受控证伪实验**而非纯阅读来判定。
2. **声称-证据分离**：`build.md` 的每个数字都必须落到「日志原文 / 实测命令输出 / sha256」三者之一，否则记为「未复现」。
3. **反证只看两件事**：扰动是否作用在门禁真读的字节上；还原是否 sha256 逐字。
4. **不推断填坑**：Chromium 类门禁不重跑者（内存约束），其运行期结论一律标注「引用日志」，并单列「未能验证项」。

### 3.2 门禁退出码虚绿专项（C33）方法

- 阅读 `test/ui/binding.mjs` 的失败尾段（`if (failures.length)` → `process.exit(1)`）与其间的 `await`；
- 微实验 A（无 Chromium）：验证「CLOSED WebSocket 上 `send()` 是否静默 / pending Promise 是否永不 settle / `.catch()` 是否运行 / 空事件循环的自然退出码」；
- 微实验 B（无 Chromium）：复刻 `main().catch()` 形态 + 永不 settle 的 `await`，观察退出码；
- **受控证伪实验 C（1 次 Chromium，副本）**：仓库 `binding.mjs` 逐字节复制到 `/tmp` 沙箱（sha256 相等），**只改 1 行**（`AP#7` 期望值 → `false`），以 `node ... > log 2>&1; echo $?` 采集真实退出码；对照 `build.md §9.6.7` 自报的失败轮签名（以 `binding FAILED (N)` 结尾、**无**「诊断已落盘」行）；
- 同类模式全文扫描：对 8 个 Chromium 门禁逐文件检查 `process.exit` 前是否存在可挂死的 `await`。

### 3.3 证据落盘约定

- 本轮新增日志：`/tmp/opencode/review-probe/**`（`ws-closed-send.mjs` / `main-catch-shape.mjs` / `logs/binding-forced-fail.log` / `logs/attribution-review.txt`）；
- 引用日志：`/tmp/opencode/v3-gate-logs/v3-2-fix/*`、`/tmp/opencode/v3-gate-logs/v3-2/*`、`/tmp/opencode/v3-gate-logs/v3-1-closeout/*`。

## 4. 改进建议（策略层，非结论）

| # | 位置 | 问题 | 建议 |
|---|------|------|------|
| 1 | `test/ui/binding.mjs:2305/2313` | 失败路径 `process.exit(1)` 位于可挂死的 `await dumpDiagnostics(...)` 之后 | 先置 `process.exitCode = 1` 并给诊断加超时竞速；`send()` 增 close/timeout 拒答 |
| 2 | `test/l1-ref-validity.test.ts` / `test/ui/l1.mjs` | 内层（ref-store）阻断只有单测 pin，运行时门禁只 pin 外层 | 在 `l1.mjs` ⑧ 增一条直接驱动 `dispatch` 的阻断断言，或为内层补一条独立反证 |
| 3 | `docs/v3-density-baseline.json` | `volumeBaselineSeparation.note` 仍写 v3-1 I6 的 295,225 / 306,099「未被抬高」 | 随 `volume` 段一并更新为 327,679 / 344,062 / cap record-only |

## 5. 阻塞问题（策略层）

| # | 位置 | 问题 | 修复建议 |
|---|------|------|---------|
| — | — | 本叶交付**无需重实现**的阻塞问题 | — |

## 6. 结论

**结论**: 见 `review-report.md`（策略已定稿；逐项结论以报告为准）。

## 7. 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建：C1~C38 审查清单（五维度 + 体积裁决/台账/文档保真/门禁可失败性专项）+ 「打假优先序」与「退出码虚绿专项」方法学（含受控证伪实验设计） | 2026-09-16 | SDDU Review Agent |
