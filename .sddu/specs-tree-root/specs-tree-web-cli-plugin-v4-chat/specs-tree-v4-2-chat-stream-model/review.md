# 审查报告：specs-tree-v4-2-chat-stream-model

> **文档定位**: SDDU 审查策略 — 指导 review Agent 执行自主审查的清单和方法；审查结果见 `review-report.md`（R1）
> **前置依赖**: 本叶 `spec.md` v1.0、本叶 `plan.md` v1.0（ADR-V4-024~029）、父 `../spec.md` v1.0 + 父 `../plan.md`（ADR-V4-002/003/004/012/013/026/028）、本叶 `tasks.md` v1.1（含跨叶移交 TASK-613）、本叶 `build.md` v1.0、`docs/v4-supersession-ledger.json`、`docs/v4-density-baseline.json`、v4-1 `review-report.md`（审查标准先例）
> **创建人**: SDDU Review Agent
> **创建时间**: 2026-09-19
> **版本**: v1.0
> **更新人**: SDDU Review Agent
> **更新时间**: 2026-09-19
> **更新说明**: 初始创建（策略与报告分离，ADR-004 步骤 1）：定义 C1~C8 审查清单（含 FR→Cx 覆盖矩阵与判据）；本轮策略与 R1 报告同轮产出（用户指令一次性产出双文件）

---

## 1. 审查概要（策略侧）

| 维度 | 数值 |
|------|:--:|
| 被审产物 | 6（本叶 spec/plan/tasks/build/state + 父 spec·plan 相关章节） |
| 被审产物文件 | 生产代码 **13 NEW + 4 MODIFY**（`git diff 203261e..611afdd -- packages/web-cli-plugin` 口径）；测试 **新增 3 + 修改 9**；`docs/**` 2 台账 |
| 审查清单条数 | **C1~C8**（用户指定焦点面；每面内含多条子判据） |
| 维度覆盖 | 代码质量（C1 局部 / C6 / C7）· 规范符合性（C2·C3·C4·C8）· 架构一致性（C1·C3·C4·C7）· 测试质量（C5·C6·C8） |
| FR 覆盖 | 本叶承载 FR-CHAT-020~026 / 030~037 共 **15 项，逐项 ≥1 个 Cx**（见 §2.1 矩阵） |

**审查方式**：静态分析（阅读 + 只读复核）为主，**并用既有门禁做只读复跑**验证怀疑点。工具为 `git diff/numstat`、`sha256sum/stat`、`grep`、`python3`（JSON/字节/计数独立复算）、**复跑既有门禁**（`npm test`、`test:supersession`、`test:gate-integrity`、`test:design-contract`、`test:l0`、`test:stream`、`test:density`、`test:density --reverse RP-V4-09`）+ 读真实 metafile（`dist/build-meta.json`）。**未修改任何源码/测试/文档**（仅新增本策略/报告两份 SDDU 产物并更新 `state.json`/`TREE.md`）。

**本轮重点打假面**（对「append-only」「零明文」两个安全语义保持最高怀疑）：

| P | 主题 | 映射 Cx |
|---|------|--------|
| P1 | 「事件不可变 + 终态冻结」是否真有可改写路径（freeze 全链 / bound 是否原地改 / seq 是否可重置） | C1 |
| P2 | 摘要落库是否真零明文（`digestEntryOf` 是否读 `payload.text`；`label≤80` 截断是否夹带敏感前缀） | C2 |
| P3 | 12 既有 action 是否零删除 / `render()` 是否真无残留清空重建 / `toolOpenState` 键迁移是否向后兼容 | C3 |
| P4 | build.md §11 六项偏差是「登记合法」还是「静默弱化」（尤：切换段投影 / 降级重建收敛 / 未解释字节 1000→1500） | C4 |
| P5 | 卡预算裁决（TASK-613）合计 ≤8 推导是否成立、形态判据是否可穷尽、RP-V4-09 是否真会红 | C5 |
| P6 | keyed append/patch/remove 是否真冻结终态 DOM、长流滚动是否抢滚 | C6 |
| P7 | 体积五要素与 metafile 归因是否同源（Σ 模块 + 胶水 == 轮增量） | C7 |
| P8 | 20 项门禁计数是否同源 / 红线是否零 diff / 计划交付物是否全落地（`appendSystem`/`cardViewModel`/`view-model.ts`） | C8 |

---

## 2. 自主审查清单（C1~C8）

| # | 审查对象 | 审查基准 | 审查维度 | 审查方法 |
|---|---------|---------|---------|---------|
| **C1** | **append-only 纯度（最高优先）**：`StreamEvent` 全链不可变（`Object.freeze` 事件/载荷/state/数组）；`appendEvent` 后无路径改写已入列事件或 `seq`；终态写入后无解除路径；`boundStreamEvents(2000)` 淘汰语义（淘汰最旧——投影/DOM 是否同步移除 vs 内存淘汰+DOM 保留） | 本叶 ADR-V4-024 · 父 ADR-V4-002/003/012 · FR-CHAT-020/025 · NFR-CHAT-001 | 代码质量 + 架构一致性 | 逐行走查 `stream-model.ts`（freeze/append/bound/project）+ `chat-state.ts#streamBranch` + `stream-render.ts` destroy 路径 + `grep` 全仓 `.push/.splice/delete/terminal` + 复跑 `test/stream-model.test.ts`（`npm test`） |
| **C2** | **零明文边界**：`stream-digest.ts` 白名单 11 字段是否唯一出口；`digestEntryOf` **不读 `payload.text`** 的静态证明（grep 全部落库路径）；`label≤80` 截断是否可能夹带敏感前缀；白名单语义是否真严 | 本叶 ADR-V4-028 · 父 NFR-CHAT-012 · FR-CHAT-024 · EC-CHAT-003 | 规范符合性 + 代码质量 | 逐行走查 `stream-digest.ts`（`DIGEST_FIELDS`/`sanitizeLabel`/`digestEntryOf`/`assertNoPlaintext`/`parseEnvelope`）+ grep `payload.text` 读点 + `grep` 落库调用点 + 复跑 `test/stream-persistence.test.ts` |
| **C3** | **迁移完整性**：`chat-state.ts` 12 个既有 action 零删除核对；`render()` 全路径切换 `streamRender`（有无残留旧清空重建路径）；`toolOpenState` 键迁移的向后兼容（旧会话恢复不炸） | 本叶 ADR-V4-024/025 · TASK-607 · FR-CHAT-020/022/026 | 架构一致性 + 规范符合性 | 对比 `203261e` 旧 reducer 的 case 集合 + 逐行走查 `render()` / `dispatch` / `restoreStreamDigest` / `cardDeps` + grep `textContent=''`/`replaceChildren` 残留 |
| **C4** | **六项登记偏差合法性**（build.md §11 逐条）：①切换=段投影非销毁 ②降级重建收敛为终态 ask/auth ③ask/auth 骨架化 ④未解释字节 1000→1500 + 新增 <2% ⑤RP 编号 ⑥第 9 个 cards 文件 | 本叶 build.md §11 · 父 ADR-V4-003/005 · plan ADR-V4-024~029 | 架构一致性 + 规范符合性 | 逐条核对「登记文本 ↔ 代码事实 ↔ spec 边界」；补查 **plan §5 文件影响清单**与 build §2 的差集（遗漏/多余文件） |
| **C5** | **卡预算裁决（TASK-613）**：合计 ≤8 推导（单卡实测 5 + 法一 3）是否成立；形态判据 `[data-chrome-control]`/`[data-toolbar-slot]`/`.view-btn` 是否可穷尽（第三种逃逸形态？）；RP-V4-09 两段反证是否真实 | TASK-613 · FR-CHAT-072/073/075 · 父 ADR-V4-020 · `docs/v4-density-baseline.json#knownLimitations[0]` | 规范符合性 + 测试质量 | 走查 `density-scope.ts` + `density-metrics.mjs#evaluateStreamResidentBudget` + `density.mjs#RP-V4-09`（含主门禁 default/empty 档是否真判合计）+ **复跑 `test:density` 与 `--reverse RP-V4-09`** |
| **C6** | **渲染正确性**：keyed append/patch/remove；patch 是否真只作用于未终态卡；终态卡 DOM 冻结（detach 后属性不变？）；滚动锚定在长流下的行为；空态与 dual-source | 本叶 ADR-V4-025/026 · FR-CHAT-022/023/037 · NFR-CHAT-003/011 | 代码质量 + 测试质量 | 逐行走查 `stream-render.ts` / `cards/*`（含 `patchAiCard`/`patchToolCard`）+ **复跑 `test:stream`** |
| **C7** | **体积五要素**：425,442（+40,123 / +10.41%）五要素齐全性 + metafile 归因抽查 3 模块 + 「+34,044 新模块 +5,617 接线」模块清单合理性 | 父 ADR-V4-010 · AC-CHAT-023 · FR-CHAT-094 | 架构一致性 + 代码质量 | 走查 `test/size-baseline.ts#v42RoundRows/v42RoundUnattributedGlueBytes` + 独立读真实 `dist/build-meta.json` 逐模块核对 + 公式复算 + `stat`/`sha256sum` |
| **C8** | **门禁账与规范**：20 项计数核对（918/63/212/28…）；AC-CHAT-001~003/010/011/020/022/023/025 逐条证据；红线独立复核（content/pick-layer/判定链/manifest/SW/`KIND_SET` 零 diff）；**计划交付物落地性**（`appendSystem`/`cardViewModel`/`truncationRules` 登记） | 本叶 spec §7 · tasks TASK-601~613 验收 · 父 ADR-V4-004/011/029 · plan §2.5 · plan ADR-V4-028 dec.5 | 规范符合性 + 测试质量 + 架构一致性 | AC→门禁断言逐条映射 + 全量 `git diff --stat`/`sha256sum`/`stat` + 复跑 node/Chromium 门禁 + 台账 `counts`/`knownLimitations` 复算 + `grep` 计划符号 |

### 2.1 FR → Cx 覆盖矩阵（质量门槛自查）

| 父 FR | 承载条文的机器证据 | 覆盖 Cx |
|-------|------------------|:--:|
| FR-CHAT-020（不可变/单调/可回放/删 null 路径） | `stream-model.ts:236-255/383-449`；`test/stream-model.test.ts` ①~⑤ 组 | C1·C3 |
| FR-CHAT-021（类型集合 = 7 主类 + 过程族；单源登记） | `stream-model.ts:43-75`；`cards/index.ts:263-288`；`test/stream-model.test.ts` taxonomy | C1·C3·C6 |
| FR-CHAT-022（统一固化契约 `data-*`/`[hidden]`/`.ts`/`.card-fixed`） | `cards/shared.ts:56-100`；`cards/index.ts:315-355`；`test/ui/stream.mjs` ③ | C4·C6 |
| FR-CHAT-023（只固化不撤销；撤销=新 system 行） | `cards/index.ts:308-355`（无撤销控件）；`cards/shared.ts:94-100`；`test/ui/stream.mjs` ③「零撤销」 | C6·C8 |
| FR-CHAT-024（切换不丢 `tool`/`ok`/`ms`；截断规则显式登记） | `stream-model.ts:319-342`（不清空 + seq 不重置）；`chat-state.ts` history/stream-session；**截断登记见 C8 缺陷** | C3·C8 |
| FR-CHAT-025（留痕完备 + 可回放；无解析即消失） | `stream-model.ts:383-449`；`test/stream-model.test.ts` ③⑤；`test/stream-persistence.test.ts` ④ | C1·C3 |
| FR-CHAT-026（新增 kind 不进 `KIND_SET`） | `git diff` 零 diff（`messaging.ts`/`manifest.json`）；`cards/index.ts:28-34` 扩展纪律 | C3·C8 |
| FR-CHAT-030（7 主类卡挂 `#stream` 的 `li`） | `cards/index.ts:263-288`；`test/ui/stream.mjs` ① | C6 |
| FR-CHAT-031（`ai` 富文本 + `user` 对侧气泡） | `cards/ai.ts:15-33`；`cards/user.ts`；`test/ui/stream.mjs` ① | C6 |
| FR-CHAT-032（`system` 单行 + `HH:MM:SS` + 只追加） | `cards/system.ts#createSystemCard`；生来冻结集 `stream-model.ts:98-107`；`test/stream-model.test.ts` ④ | C1·C6 |
| FR-CHAT-033（`ref` 有效/失效 + 失效保留 + 序号递增） | `cards/index.ts:222-257`（骨架）；`test/ui/stream.mjs` ①⑦ | C4·C6 |
| FR-CHAT-034（`nextstep` 可点 chips） | `cards/index.ts:88-104`；`test/ui/stream.mjs` ① | C5·C6 |
| FR-CHAT-035（过程族 5 形态归位 + 工具卡字段保留 + 480/10） | `cards/{tool,thinking,system,error,notice}.ts`；`cards/shared.ts:20-24` 单源；`test/ui/stream.mjs` ② | C5·C6 |
| FR-CHAT-036（分类学登记；`CARD_TYPES` 扩展须登记） | `cards/index.ts:28-34/81`；`test/design-contract.test.ts`（复跑 6/6）；shim 60/60 | C4·C8 |
| FR-CHAT-037（卡可访问语义；流 `role=log`） | `cards/shared.ts:84-100`；`test/ui/stream.mjs` ⑦ | C6·C8 |
| NFR-CHAT-001/003/004/009/010/011/012 | 见各 Cx（`test:stream` ⑤⑥⑦⑧ / `test:stream-model` / `test:stream-persistence` / 门禁账） | C1~C8 |
| AC-CHAT-001~003/005/010/011/020/022/023/025 | 见 `review-report.md` §2 AC 映射 | C1~C8 |
| EC-CHAT-003/004/006/009/013 | 见 `review-report.md` §2 | C3·C6·C8 |

> **质量门槛自查**：本叶承载 FR **15 项**，逐项 ≥1 个 Cx（上表）；四维度各 ≥1 条（代码质量 C1/C6/C7、规范符合 C2/C3/C4/C8、架构一致 C1/C3/C4/C7、测试质量 C5/C6/C8）；「无法审查」项：**无**（本叶 0 个外部服务 API，全部产物可静态/只读复跑核对；仅 `l1`/`l2`/`insight`/`binding`/`hardening`/`e2e`/`page-input`/`zero-injection` 等运行时计数本轮以「引用 build.md §8 落盘日志」核对，已在报告中标注）。

---

## 3. 审查详情（方法与判据）

### 3.1 代码质量
- 逐文件走查 13 NEW + 4 MODIFY 生产文件；对每个新导出符号做引用图（`grep -rn`）判死代码/不可达路径（本轮命中 `patchAiCard` 产品不可达）。
- 错误路径判据：catch 体是否只做降级/上报（`persistStreamDigest`/`restoreStreamDigest` 为 best-effort + `console.warn`，不吞成持久值）；「声称会被抛错拦截」必须有可执行的覆盖证据。
- 注释一致性判据：同一规则在**注释、常量、台账、运行时/门禁实测**多处是否一致；不一致即记 ⚠️（本轮在 `size-baseline.ts:862`、`density.mjs:583`、`reverseRpV408` 处命中）。

### 3.2 规范符合性
- 逐 FR/AC 从「是否有**直接**断言 → 断言是否覆盖行为（而非仅存在性）」两级判定；只有常量级/存在性断言而无行为断言的记 PARTIAL。
- **安全语义单列最高怀疑**：append-only 判「是否存在任何改写已入列事件的写路径（含 splice 原地、freeze 缺席、test seam 之外的重置）」；零明文判「是否有任何非白名单出口（`digestEntryOf` 之外的落库调用点 / 正文回退）」。
- **计划交付物落地性**：对 plan §2.5/§5 与 ADR 决策中点名的**符号/文件**逐一 `grep`（`appendSystem`/`cardViewModel`/`view-model.ts`/`truncationRules`），缺失即记偏差并要求「已登记」。

### 3.3 架构一致性
- ADR 判定以「是否违反 ADR 约束句」为准；取舍以 plan §3/§4 推荐方案为准。
- 取代类变更以**真实 `git diff 203261e..611afdd`** 为唯一事实源；`docs/**` 台账/counts 一律**独立复算**（`python3`）。
- 体积归因以**真实 `dist/build-meta.json`** 逐模块 `bytesInOutput` 复核；「Σ 模块 + 胶水 == 轮增量」两口径分别核。

### 3.4 测试质量
- 断言强度三级：① 行为断言（改真值必变）② 存在性断言 ③ 恒真/弱断言；反证必须「注入 → 必红 → 还原 → 必绿」且 FAIL 段带字面诊断。
- 计数纪律：只接受「同口径 before/after」；跨口径数字标注不可比；门禁「只增不减」。
- 覆盖缺口判据：新模块/新判据的**必需错误路径**是否有门禁可驱动为红；主门禁是否真判（而非只在反证里跑）。

---

## 4. 结论

**结论**: 策略已定稿（C1~C8 + FR 覆盖矩阵 + 判据）。R1 已执行，逐项结果见 `review-report.md`。

## 5. 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建：C1~C8 自主审查清单（四维度 + 8 个打假面 + FR→Cx 覆盖矩阵 + 判据）。策略与 R1 报告同轮产出（用户指令）。 | 2026-09-19 | SDDU Review Agent |
