# 审查报告：specs-tree-v5-3-chrome-face

> **文档定位**: SDDU 审查策略 — 指导 review Agent 执行自主审查的清单和方法；审查结果见 review-report.md
> **前置依赖**: spec.md（需求规范）、plan.md（技术方案）、build.md（构建产物）、tasks.md（24 任务）
> **创建人**: SDDU Review Agent
> **创建时间**: 2026-09-22
> **版本**: v1.0
> **更新人**: SDDU Review Agent
> **更新时间**: 2026-09-22
> **更新说明**: 初始创建（V5-3 末叶 / 收口叶 R1 自主审查清单 C1~C39；承载 27 条 FR × 四维度）

## 1. 审查概要
> 审查结果的量化总览

| 维度 | 数值 |
|------|------|
| 审查文件数 | 28 个（源码 13 / 门禁 12 / 台账 3） |
| 通过项 | <<见 review-report.md>> |
| 改进建议 | <<见 review-report.md>> |
| 阻塞问题 | <<见 review-report.md>> |

## 2. 自主审查清单（C1~CN）

**审查对象来源**：
- `spec.md`：本叶承载 27 条 FR（012·015 / 023·024 / 085~092 / 114·116 / 003·004 / 120~125 / 130~134）+ 9 NFR + 10 EC → 逐项核验
- `plan.md` §2~§5（ADR-V5-006 / 007 / 009 / 010 / 012 收口侧）+ 父 `../ADR-V5-*` → 架构遵循性
- `build.md` R1/R2 文件变更清单 + §8.5 诚实登记 → 覆盖完整性与口径诚实性
- `src/ui/sidepanel/**` + `src/insight/**` + `src/ui/tree/**` + `test/**` → 代码质量 / 测试质量

**四维度指引**：
1. **代码质量** — 可读性、职责单一、错误处理、无硬编码 / 无冗余
2. **规范符合性** — 对照 spec.md 逐 FR/NFR/EC
3. **架构一致性** — 对照 plan / ADR / 文件影响 / 项目红线
4. **测试质量** — 门禁存在性、核心与边界覆盖、断言有效性、注入反证

| # | 审查对象 | 审查基准 | 审查维度 | 审查方法 |
|---|---------|---------|---------|---------|
| C1 | `cards/error.ts` 出生铸造恢复区（同一调用内、缺省零 chip） | FR-ALLN-012 / plan §5 | 代码质量 | 代码走查 + `test:stream` ⑩ |
| C2 | `providers.ts#blockedRecovery` 单源派生（index 对齐魔法数组） | FR-ALLN-015 / ADR-V5-009 | 代码质量 | 代码走查 + `test:dead-end` ND-7 |
| C3 | `statusbar.ts` 单写者 + `data-auth` 两态 + 永不为 `hidden` | FR-ALLN-085 / 092 | 代码质量 | 代码走查 + `test:auth-chip` ① |
| C4 | `sidepanel.ts` 黄 / 绿点击 + 管理详情 + `installNarrowObserver` | FR-ALLN-087 / 088 / 090 | 代码质量 | 代码走查 + 两门禁 |
| C5 | `l2/audit.ts` + `audit-sink.ts` + SW `maskedLength` 只接受 `8+`/`8-` | NFR-ALLN-011 / FR-ALLN-023 | 代码质量 | 逐文件走查 + `test:l2-counts` |
| C6 | `view-model.ts` / `l0/risk-rail.ts` 载体重锚（零冗余） | FR-ALLN-086 | 代码质量 | git diff 全量 + 代码走查 |
| C7 | 工具栏摘要 `data-status-dot` 仍随 `authorized` 变（颜色通道） | FR-ALLN-085 / 086 | 代码质量 | 代码走查（`view-model.ts:894`） |
| C8 | `#auth-state` 两态恒显 + 逐字文案 | FR-ALLN-085 / AC-ALLN-012 | 规范符合性 | `test:auth-chip` ① + DOM 判读 |
| C9 | 零双写 ①③④（digest / rail / 状态栏第一行） | FR-ALLN-086①②③④ | 规范符合性 | `test:auth-chip` ② + `test:l0` ⑤⑨ |
| C10 | 零双写 ② 四词扫描口径（`supported` 短语匹配） | FR-ALLN-086② / R-ALLN-906 | 规范符合性 | 读 `auth-chip.mjs#AUTH_PHRASES` + 实跑命中面 |
| C11 | 零双写 ⑤ L2 树视图站点行「指向 chip / 不复制状态」 | FR-ALLN-086⑤ / AC-ALLN-012 / ADR-V5-006 §2⑤ | 规范符合性 | 读 `project-tree.ts` / `ownership-tree.ts` / `tree-drawer.ts` + `test:insight` #I-20a |
| C12 | 黄态点击产 `op.authorize` next + 系统行、不跳走 | FR-ALLN-087 / NG-ALLN-019 | 规范符合性 | `test:auth-chip` ③ + 代码走查 |
| C13 | 绿态点击管理详情（默认折叠 / 展开 ≤7 / 键盘可达 / 两入口） | FR-ALLN-088 | 规范符合性 | `test:auth-chip` ③ + `index.html` |
| C14 | 280–640 拖动 = 设计稿契约 + 产品侧诚实登记 | FR-ALLN-089 / ADR-V5-007 §3 | 规范符合性 | `density-thresholds` W2/W3 + `knownLimitations[7]` |
| C15 | `data-narrow`（360/361）+ 三档 radio 零残留 | FR-ALLN-090 / EC-ALLN-014 | 规范符合性 | `test:density` ⑯ + W2/W3 |
| C16 | 密度登记格 = 控件计数（与宽度解耦）；320 锚点 | FR-ALLN-091 / O-ALLN-007 | 规范符合性 | `density-thresholds` W4 + `v5Ledger` |
| C17 | 状态栏单写者 + J1~J4 + 默认 6 ≤ 7 | FR-ALLN-092 / AC-ALLN-015 | 规范符合性 | `test:auth-chip` ④ + `test:l0` |
| C18 | `error` 出生恢复（阻塞带 / 非阻塞零 chip / `BORN_FROZEN_KINDS` 逐字不动） | FR-ALLN-012 / LNG-V5-3-005 | 规范符合性 | `test:stream` ⑩ + `stream-model.test.ts` |
| C19 | 死端守护门禁（5 类逐类 + 死端 0 + ✖ 不裸奔 + 双注入） | FR-ALLN-015 / AC-ALLN-002 | 规范符合性 | `test:dead-end` 全量 |
| C20 | 法八四面零明文 + 四注入 + key 直写恰 1 | FR-ALLN-023 / AC-ALLN-003 | 规范符合性 | `test:law8` 全量 + 源码走查 |
| C21 | 存储侧边界口径（只保证流内零明文） | FR-ALLN-024 / NG-ALLN-017 | 规范符合性 | build.md §8.5.3 + 扫描文案 |
| C22 | X5 显式取代（三档 → 连续宽度；判据等价重锚） | FR-ALLN-114 / 116 | 规范符合性 | `density-baseline#tiers/v5Ledger` + `test:density` F |
| C23 | 断言零删除零降级 + 计数只增 + 共享面恰一次 | FR-ALLN-003 / 004 | 规范符合性 | 台账 `counts` + 门禁读数对账 |
| C24 | 门禁等价重锚（13 条/载体重锚） | FR-ALLN-120 | 规范符合性 | `modifiedRanges[]` 逐条 + 四门禁复跑 |
| C25 | 反证不空转（两段证伪） | FR-ALLN-121 | 规范符合性 | 三门禁注入段日志 |
| C26 | journey 保护段处置（保段 / 三值不变） | FR-ALLN-122 / AC-ALLN-018 | 规范符合性 | 独立复算 sha/startByte/endByte/行数 |
| C27 | `knownGap` 一致性 + 台账链式可机核 | FR-ALLN-123 | 规范符合性 | `test:supersession` 33 用例 |
| C28 | 串行纪律 + `KL-N-10` 隔离复跑 | FR-ALLN-124 / R-ALLN-015 | 规范符合性 | 本轮 binding 首轮 flake 处置记录 |
| C29 | 新门禁纳入 `gate-integrity` 受审集合 | FR-ALLN-125 | 规范符合性 | `test/gate-integrity.test.ts` + `CHROMIUM_GATES === 9` |
| C30 | 体积五要素（三叶合计）+ 档位/绝对上限/`pending-author-line` | FR-ALLN-130~134 / AC-ALLN-023 | 规范符合性 | `size-baseline.ts` + 三 size 门禁 + 台账三值 |
| C31 | ADR-V5-006 零双写五条遵循性（含 ⑤） | ADR-V5-006 §2 | 架构一致性 | 同 C9~C11 证据复核 |
| C32 | ADR-V5-007 / 009 / 010 落地形状 | plan §2.3~§2.4 | 架构一致性 | `ResizeObserver` / `nextOf` / 四面判据 |
| C33 | ADR-V5-012 收口侧（保护段 / 共享面 / 三叶合计） | plan §2.5 | 架构一致性 | 台账 + build.md §8 |
| C34 | 红线零 diff（content / pick-layer / design / manifest / KIND_SET / v3 台账 / ROADMAP / 判定链） | tasks.md §0 / 父 N3~N5 | 架构一致性 | `git diff 9b262ae..HEAD` + sha 复算 |
| C35 | 三新门禁存在 + 核心路径覆盖 | FR-ALLN-125 / 121 | 测试质量 | 文件存在 + 实跑 25/29/30 |
| C36 | 边界 / 负面覆盖（360/361 / 非阻塞零 chip / 第 6 类 / 极值） | EC-ALLN-014 / 015 / 013 | 测试质量 | 注入段日志逐条 |
| C37 | 注入反证有效性（4 法八 + 2 死端 + 3 auth-chip） | FR-ALLN-121 | 测试质量 | FAIL 段 ⇒ 还原 PASS 两段证据 |
| C38 | 断言有效性 + 计数只增 + 「S2 全链」口径 | FR-ALLN-003 / 011 / 016 | 测试质量 | 断言语义走查 + 实跑计数 |
| C39 | v5-2 移交观察项（N-04~N-09）处置如实 | build.md §8.5 / 台账 | 测试质量 | 检索 build/tasks/state/台账 |

> **质量门槛（数量基线法）**：本叶承载 27 条 FR ⇒ Cx ≥ 27；四维度各 ≥ 1 条 ⇒ 本清单 39 条满足
> （规范符合性 23 / 代码质量 7 / 架构一致性 4 / 测试质量 5）。

## 3. 审查详情（方法示例）

### 3.1 代码质量
- 走查 `cards/error.ts`（42 行）确认恢复区与气泡同一 `createErrorCard` 调用内完成，且 `view.payload.recovery ?? []` 缺省零 chip。
- 走查 `providers.ts#blockedRecovery`（:65-71）确认「OPS_RECOVERY_ROWS 优先 → index 对齐触发器数组」的派生链与 `EXPECTED_REPAIR` 一致。

### 3.2 规范符合性
- 逐 FR 在源码 / 门禁中找落点（见 review-report.md §5 抽 6 FR 映射表）。

### 3.3 架构一致性
- 对照 plan §5 文件影响清单：`index.html` / `statusbar.ts` / `view-model.ts` / `risk-rail.ts` / `cards/error.ts` / `stream-model.ts` / `sidepanel.ts` / 三新门禁 / 台账 —— 逐项核对存在性与改动面。

### 3.4 测试质量
- 独立复跑 ≥ 6 项门禁 + 注入段日志核验（`expectFailPattern` 与 FAIL 段文本一致）。

## 4. 改进建议
> 非阻塞但建议优化的问题

| # | 位置 | 问题 | 建议 |
|---|------|------|------|
| 1 | 见 review-report.md §5 | <<R1 发现>> | <<建议>> |

## 5. 阻塞问题
> 必须修复后才能进入 validate 阶段

| # | 位置 | 问题 | 修复建议 |
|---|------|------|---------|
| 1 | 见 review-report.md §4 | <<R1 发现>> | <<建议>> |

## 6. 结论

**结论**: 审查策略（步骤 1），结论见 review-report.md
**理由**: 本文件定义 C1~C39 审查清单与四维度指引；执行结果与最终结论逐项记录于 `review-report.md`。

## 7. 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建（V5-3 R1 自主审查清单 C1~C39：27 FR × 四维度；新增 C7/C10/C11/C38/C39 针对 chip 唯一载体、四词口径、L2 台账、S2 全链口径与 N 项闭环） | 2026-09-22 | SDDU Review Agent |
