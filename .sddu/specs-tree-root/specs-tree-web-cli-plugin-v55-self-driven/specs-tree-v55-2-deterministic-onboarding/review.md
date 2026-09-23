# 审查策略：specs-tree-v55-2-deterministic-onboarding

> **文档定位**: SDDU 审查策略 — 指导 review Agent 执行自主审查的清单和方法；审查结果见 review-report.md
> **前置依赖**: 本叶 `spec.md` v1.0（23 条承载父 FR）、本叶 `plan.md` v1.0、父 `../spec.md` / `../plan.md` + `ADR-V55-005/006/007/010/011/012`、本叶 `tasks.md`/`tasks.json`（16/16）、本叶 `build.md`（R1 §1~§10 + R2 §1b~§10b）
> **创建人**: SDDU Review Agent
> **创建时间**: 2026-09-23
> **版本**: v1.0
> **更新人**: SDDU Review Agent
> **更新时间**: 2026-09-23
> **更新说明**: 初始创建（C1~C40 审查清单；四维度覆盖；23 条承载 FR + 12 NFR + 7 EC 全覆盖矩阵）

## 1. 审查概要

| 维度 | 数值 |
|------|:--:|
| 审查文件数 | 24 个（源码 7 / 门禁 8 / fixture·台账 4 / 父 ADR 3） |
| 审查项（Cx）总数 | 40 |
| 覆盖承载父 FR | 23 / 23 |
| 覆盖 NFR | 12（spec §5 全部） |
| 覆盖 EC | 7（spec §6 全部） |
| 阻塞问题 | 结论见 review-report.md |

**审查对象来源**
- `spec.md`：本叶 23 条承载父 FR（§4）+ 12 条 NFR（§5）+ 7 条 EC（§6）+ 10 个验收锚点（§7）
- `plan.md` + 父 `ADR-V55-006`（判据 3 字段 / `runChat` 前置 / 双源 / 分流）· `ADR-V55-007`（4 步单源 / 悬置单源 / 续接顺序 / 两场景 / 不跳走）· `ADR-V55-010`（续接载体）· `ADR-V55-011`（体积与升档）· `ADR-V55-012`（台账）
- `build.md`（R1 v1.0 + R2 收口段）：文件变更清单、门禁读值、注入反证、口径差异 D1~D4 / E1~E5、遗留 R2-1~R2-6
- `src/**` + `test/**`：代码质量与测试质量

**前置校验**
1. ✅ `src/` 已实现（NEW `next-registry/{onboarding-flow,suspension}.ts`；MODIFY `llm/status.ts` / `background/{service-worker,messaging,chat-events}.ts` / `ui/sidepanel/{sidepanel.ts,next-registry/{ops,pipeline,providers}}.ts`）
2. ✅ `tasks.md` **16/16** 任务 `completed`（`state.json#phase = builded`）
3. ✅ `build.md` R1 + R2 段存在；`dist/sidepanel.js` = **563,145 B**（实测）

## 2. 自主审查清单（C1~C40）

> 质量门槛：每条承载父 FR ≥ 1 个 Cx（见 §4 覆盖矩阵）；四维度各 ≥ 1 条。

| # | 审查对象 | 审查基准 | 审查维度 | 审查方法 |
|---|---------|---------|---------|---------|
| C1 | `runChat` 前置配置判据：先于 `providerChat`、early return 在 `chatBusy = true` 之前、零 provider 调用 | FR-SELF-040 / AC-SELF-007 / ADR-V55-006 §3 | 规范符合性 | 源码序走查 + `onboarding-deterministic#OD-5` 实跑 + 删除注入复核 |
| C2 | `llm.unconfigured` 双源并存（被动保留 + 主动新增）幂等、同一终态词汇、恢复链零改写 | FR-SELF-041 / 102 / ADR-V55-006 §4/§5 | 架构一致性 | 源走查（`noteLlmBlockedFact` 调用点计数）+ `BT-6` / `OD-7` 实跑 |
| C3 | 引导流**恰 4 步**单源（detect→guide→collect→complete）+ 采集复用既有 params 序列 | FR-SELF-042 / ADR-V55-007 §1 | 规范符合性 | `OD-8`（删步 / 乱序 / 第二份序列反证）+ `stream` ⑯ 实跑 |
| C4 | 首装 / 已装未配两场景各自产出引导；已装未配**不依赖 `firstRun`** | FR-SELF-043 / AC-SELF-013 / R-SELF-909 | 规范符合性 | `OD-14` / `NR-11` / `BT-6` 实跑 + provider `when` 源文本抽取 |
| C5 | 配置执行体**唯一** = `op.llm-config`；无第二凭据写入路径 | FR-SELF-044 / NG-SELF-016 / EC-SELF-022 | 规范符合性 | 全仓 grep + `law8` ⑦「不绕开掩码卡」+ sink 计数 |
| C6 | 悬置任务单源登记（第二处 ⇒ FAIL）+ `MAX = 1` + 三要素 | FR-SELF-045 / ADR-V55-007 §3 / R-SELF-904 | 规范符合性 | `OD-10` / `OD-11` 实跑 + 模块走查（返回态消费面） |
| C7 | 取消 / 放弃非死端 + **同因不重复**（新因照旧可引导） | FR-SELF-046 / NFR-SELF-013 | 规范符合性 | `OD-15` 实跑 + 源码接线走查（`declinedOnboardCauses` 消费面） |
| C8 | 确定性可核：主题① 零 LLM 调用 + 同输入同路径 | FR-SELF-047 / NFR-SELF-009 | 规范符合性 | `OD-4`（`status.ts` 零 LLM/网络/chrome）+ 引导路径源走查 |
| C9 | 不跳走：引导全程流内闭环（零视图切换 / 零 `#open-settings` / 零 `location`） | FR-SELF-048 / R-SELF-905 | 规范符合性 | `OD-9` + `stream` ⑯ 实跑 |
| C10 | 掩码 secret 卡复用 + 法八四面零明文不退化（`law8` ≥25） | FR-SELF-049 / AC-SELF-012 | 规范符合性 | `test:law8` 亲跑（36/0）+ `law8` ⑦ 三条 |
| C11 | 「配置成功回执 → 续接发生」顺序可判；失败 ⇒ 回滚 + 错误卡 + 可达 next + 悬置保留 | FR-SELF-050 | 规范符合性 | `OD-13`（回执在前 / 删续接必红）+ `pipeline.ts` 源码序走查 |
| C12 | 既有 `onboarding` provider **扩张不取代**（`when`/`chips`/`textOf` 语义不减；同 ctx 无重复 chip） | FR-SELF-051 | 规范符合性 | `git diff` 走查 + `blocked-terminals#BT-6` + `next-registry#NR-11` |
| C13 | 配置探测判据确定性单源（凭据 ∧ `providerId` ∧ `model`）；主题①↔② 唯一分流依据 | FR-SELF-052 | 规范符合性 | `OD-1` / `OD-2` / `OD-3` 实跑 + `key-store.ts#load` 归一化走查 |
| C14 | X-SELF-3 等价重锚：触发语义「被观测 → 被识别」（双源）；恢复链元素集与按终态键控逐条不变 | FR-SELF-102 / X-SELF-3 / AC-SELF-016 | 架构一致性 | `OD-16` 实跑 + `OPS_RECOVERY_ROWS` / `BLOCKED_RECOVERY_TRIGGER` 源走查 |
| C15 | 取代一律等价重锚 + 未发生取代如实登记（X-SELF-3 双条目） | FR-SELF-107 / ADR-V55-012 §1 | 架构一致性 | `docs/v4-supersession-ledger.json` 逐项检索 + `OD-16` 可定位性 |
| C16 | 门禁等价重锚清单（本叶主责 6 项 + 计数只增） | FR-SELF-110 / AC-SELF-016 | 架构一致性 | 改动清单 + `git diff` 逐门禁对账 |
| C17 | 反证不空转（每条新 / 改判据两段证据，禁恒真断言） | FR-SELF-111 / NFR-SELF-007 / AC-SELF-017 | 测试质量 | 全文件恒真断言扫描 + 反证段走查 + 亲注入复核 |
| C18 | `knownGap` 一致性机核（`test:supersession` ≥36 全绿） | FR-SELF-113 / N-SELF-018 / AC-SELF-019 | 架构一致性 | `test:supersession` 亲跑（36/0） |
| C19 | 新门禁纳入 `gate-integrity` 受审集合；`CHROMIUM_GATES === 9` 不动 | FR-SELF-115 / AC-SELF-020 | 架构一致性 | `test:gate-integrity` 亲跑（18/0）+ `V552_*` 集合走查 |
| C20 | 本叶面计数只增（node / Chromium 逐门禁）且**登记读数与实测一致** | FR-SELF-116 / AC-SELF-020 | 测试质量 | 基线 vs R2 逐项对账 + 各门禁亲跑 |
| C21 | 体积五要素（本叶增量）+ 预算诚实登记 + 红线逐字节 | FR-SELF-120 / 123 / NFR-SELF-005 | 架构一致性 | `stat` + `sha256sum` + metafile 归因 + 体积三测试 |
| C22 | **S0 分支 B 必判项**：未配置 ⇒ 引导 4 步 ⇒ 掩码卡 ⇒ 完成 ⇒ **自动续接** ⇒ 留痕（双面 + A/B 独立计数） | FR-SELF-131 / AC-SELF-001 / ADR-V55-005 §3 | 规范符合性 | `S0N-7/8` node + `S0C-7` Chromium 亲跑 + **运行期断点注入** |
| C23 | 人工面（引导文案可读性 / 主动引导体感 / 读屏掩码卡）如实 `⏳` / `PASS`（不冒充） | FR-SELF-134 / AC-SELF-025 | 测试质量 | 门禁输出走查 |
| C24 | 确定性：零 provider 调用 + 同输入同路径的**双向**断言 | NFR-SELF-009 | 测试质量 | `OD-4` + `stream` ⑯ + 源走查 |
| C25 | 安全：法八四面 / 判定链零触碰 / 净化面语义不变 | NFR-SELF-003 | 架构一致性 | `law8` 36/0 + `zeroDiffFiles` 逐项 + `zero-injection` |
| C26 | 单源 + 机核：引导步骤集合 / 悬置登记 / 配置判据**各恰一处** | NFR-SELF-004 | 架构一致性 | `OD-8` / `OD-10`「声明恰一次」扫描 + 反证 |
| C27 | 每条新 / 改判据可 FAIL 并声明 `expectFailPattern` | NFR-SELF-007 | 测试质量 | 判据表走查 + `OD` 元判据 + 亲注入 |
| C28 | 可逆性：配置失败快照回滚（旧配置逐字段不变）+ 悬置任务保留 | NFR-SELF-010 | 测试质量 | `pipeline.ts` rollback 走查 + `OD-13` |
| C29 | 打扰可控：不重复引导 + 静默期 + 三纪律 | NFR-SELF-013 | 测试质量 | `OD-15` + `recommendation.mjs` 计时器走查 |
| C30 | 可用性 / 无障碍：引导可键盘可达、320px 零溢出、`#stream` 仍 `role=log`；读屏面列入人工 | NFR-SELF-002 / 008 | 测试质量 | `density` / `l0` / `journey` 门禁 + 人工面登记 |
| C31 | `sidepanel.js` ≤ 生效上限；byte 变化走五要素重登记 | NFR-SELF-005 | 架构一致性 | `size-budget` / `size-growth-evidence` / `size-ruling-vol3` 亲跑 |
| C32 | 兼容读取面不破（引导不新增必需 id） | NFR-SELF-006 | 测试质量 | `l0`/`l1`/`l2`/`binding` 门禁走查 |
| C33 | EC-SELF-009：取消 ⇒ 固化 + 可达 next；同因不重复；后续「意图需要 LLM」可**重新**引导 | EC-SELF-009 | 规范符合性 | `OD-15`（新因照旧可引导）实跑 |
| C34 | EC-SELF-010：外部完成 ⇒ 识别「已配置」⇒ 引导自动收敛 + **悬置仍须续接**（来源无关） | EC-SELF-010 | 规范符合性 | `resumeAfterConfig` 唯一调用点走查 + 设置面 `dispatchOp` 路径走查 |
| C35 | EC-SELF-011：续接**先校验**（站点变 / 会话切换 / 失效 ⇒ `invalidated` + 固化 + 可达 next，不制造假成功） | EC-SELF-011 | 规范符合性 | `OD-12` 实跑 + `suspension.ts#resumeSuspension` 走查 |
| C36 | EC-SELF-012：配置完成但悬置为空 ⇒ **非死端** | EC-SELF-012 | 规范符合性 | `OD-12`（`empty` 显式读数）+ `resumeAfterConfig` 出口走查 |
| C37 | EC-SELF-022：配置面双套风险 ⇒ 执行体唯一 + 设置页同调 op | EC-SELF-022 | 架构一致性 | `ONBOARD_CHIP_OP` 单源 + `settings/ops.ts#saveLlm` 走查 + `law8` ⑦ |
| C38 | EC-SELF-004：主动识别与被动观测同时命中 ⇒ 事实幂等（不产两条阻塞事实 / 两条引导） | EC-SELF-004 | 规范符合性 | `observedBlocked: Set` 走查 + `OD-7` 实跑 |
| C39 | 代码质量：命名 / 职责单一 / 错误处理 loud / 无硬编码 / 无冗余 / 死代码 | §5.1 方法论 | 代码质量 | 逐文件走查 + 全仓死导出扫描 |
| C40 | 测试质量：测试存在性 / 核心路径 / 边界与错误场景 / 断言有效性（弱断言） | §5.4 方法论 | 测试质量 | 门禁走查 + 恒真断言扫描 + 亲注入 |

## 3. 审查详情（方法）

### 3.1 代码质量
- 逐文件阅读 NEW `onboarding-flow.ts` / `suspension.ts` 与 `status.ts` / `service-worker.ts` / `sidepanel.ts` 改点：命名、职责单一、异常路径、魔法值提取、死导出。
- 全仓 `|| true` / `assert.ok(true` / `=== 0 ||` 扫描（识别恒真空转断言）。

### 3.2 规范符合性
- 23 条承载父 FR 逐条映射到 Cx（§4），在代码 / 门禁中定位实现位置与反证。
- 7 条 EC 逐条落到**生产路径**（不只纯函数）：EC-009/010/011/012 走 `resumeAfterConfig` / `declinedOnboardCauses` 真实接线；EC-004 走 `Set` 幂等。

### 3.3 架构一致性
- 对照 ADR-V55-006（判据 3 字段 + 前置 + 双源）、ADR-V55-007（4 步单源 + 悬置单源 + 续接顺序 + 两场景 + 不跳走）、ADR-V55-011（体积预算 / 档位）、ADR-V55-012（台账）。
- 对照 plan.md §3 文件影响分析：逐文件核对「有遗漏 / 有多余」。
- 对照 build.md §8/§8b 口径差异（D1~D4 / E1~E5）：逐条判断「登记是否如实、是否引入偏离」。

### 3.4 测试质量
- 门禁存在性 + 判据数 + `expectFailPattern` 声明；反证段是否真能 FAIL。
- **动手复核**（用户点名）：S0 双面亲跑（node + Chromium）；**运行期断点注入**（回退 R2 的 resolver 归属修复 ⇒ 复现 R1 断链）；冻结面 sha/字节实测；`npm test` 全量亲跑。

## 4. FR → Cx 覆盖矩阵（23/23）

| 承载父 FR | Cx | 承载父 FR | Cx | 承载父 FR | Cx |
|---|---|---|---|---|---|
| FR-SELF-040 | C1 | FR-SELF-050 | C11 | FR-SELF-115 | C19 |
| FR-SELF-041 | C2 | FR-SELF-051 | C12 | FR-SELF-116 | C20 |
| FR-SELF-042 | C3 | FR-SELF-052 | C13 | FR-SELF-120 / 123 | C21 |
| FR-SELF-043 | C4 | FR-SELF-102 | C2/C14 | FR-SELF-131 | C22 |
| FR-SELF-044 | C5 | FR-SELF-107 | C15 | FR-SELF-134 | C23 |
| FR-SELF-045 | C6 | FR-SELF-110 | C16 | NFR-SELF-009 | C8/C24 |
| FR-SELF-046 | C7 | FR-SELF-111 | C17 | NFR-SELF-003 | C25 |
| FR-SELF-047 | C8 | FR-SELF-113 | C18 | NFR-SELF-004 | C26 |
| FR-SELF-048 | C9 | NFR-SELF-005 | C21/C31 | NFR-SELF-007 | C27 |
| FR-SELF-049 | C10 | NFR-SELF-002 / 008 | C30 | NFR-SELF-010 | C28 |
| | | NFR-SELF-006 | C32 | NFR-SELF-013 | C29 |

> 边界情况：EC-SELF-009 → C33 · EC-SELF-010 → C34 · EC-SELF-011 → C35 · EC-SELF-012 → C36 · EC-SELF-022 → C37 · EC-SELF-004 → C38 · EC-SELF-020（保护段优先保段）→ C25/C31。

## 5. 审查方法（门禁与动手复核）

| 类别 | 方法 |
|---|---|
| 静态 | 读码 + `grep` 计数（`noteLlmBlockedFact` / `isLlmConfigured` / `registerSuspension` / `resumeAfterConfig` / `opSettled` / `ONBOARD_*`） |
| 门禁实跑 | `npm test`（1277）· `test:onboarding`（23）· `test:supersession`（36）· `test:gate-integrity`（18）· `test:size-ruling-vol3`（12）· `test:design-contract`（19） |
| Chromium 实跑 | `test:s0-self-driven`（42）· `test:law8`（36）· `test:stream`（76）· `test:dead-end`（49）· `test:ask-auth`（78）· `test:recommendation`（72）· `test:ui`（journey 171）· `test:binding` |
| **运行期断点注入** | 回退 `submitAskFor` 的 resolver 归属修复（`opAskResolvers.delete(rid)` 提前到 `SECRET_ASKS` 分支之前）⇒ 重建 ⇒ 亲跑 `test:s0-self-driven` 期望 FAIL ⇒ `git checkout` 逐字节还原 ⇒ 重建 ⇒ PASS |
| 冻结面实测 | `stat -c %s` / `sha256sum`：`content.js` / `pick-layer.js` / `sidepanel.js`；`KIND_SET` 计数；`git diff 39c1fb0..HEAD --stat` 足迹 |
| 台账检索 | `docs/v4-supersession-ledger.json` 逐关键词检索（X-SELF-3 / X-SELF-3-SW / `specs-tree-v55-2-*` / `modifiedRanges`） |

## 6. 结论分级口径

- **BLOCK**（必须修）：规范明文交付物缺失 / P0 FR（或「重点验」EC）在**生产路径**不成立 → 阻塞 validate。
- **I**（应改进，可登记）：口径不精确、边界语义越界、证据登记不实、弱断言；可留 N 登记。
- **O**（可留后续叶 / validate）：已登记偏差、设计取舍、死导出、环境性 flake、继承项。

## 7. 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建（C1~C40；23 承载 FR + 12 NFR + 7 EC 全覆盖；四维度齐备；含运行期断点注入亲核方法） | 2026-09-23 | SDDU Review Agent |
