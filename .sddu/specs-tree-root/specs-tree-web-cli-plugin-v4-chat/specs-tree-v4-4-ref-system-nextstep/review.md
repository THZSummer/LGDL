# 审查报告：specs-tree-v4-4-ref-system-nextstep（V4-4 引用卡 / 系统事件行 / 推荐卡 + 拾取入口迁移）

> **文档定位**: SDDU 审查策略 — 指导 review Agent 执行自主审查的清单和方法；审查结果见 review-report.md  
> **前置依赖**: spec.md（本叶 FR-CHAT-050~064/090~094 切片）、plan.md（ADR-V4-035~040）、build.md v2.0（R1 `8ae971e` + R2 `2be59e5`）、tasks.md（TASK-801~812）  
> **创建人**: SDDU Review Agent  
> **创建时间**: 2026-09-19  
> **版本**: v1.0  
> **更新人**: SDDU Review Agent  
> **更新时间**: 2026-09-19  
> **更新说明**: 初始创建（R1 策略：C1~C15 自主审查清单；四维度覆盖 + 每 FR ≥1 条）

## 1. 审查概要

| 维度 | 数值 |
|------|:--:|
| 审查文件数 | 33 个（`git diff eb879bb..2be59e5 -- packages/web-cli-plugin` 全量） |
| 审查项（Cx） | 15 |
| 通过项 | 见 review-report.md（本轮执行结果） |
| 改进建议 | 见 review-report.md |
| 阻塞问题 | 见 review-report.md |

## 2. 自主审查清单（C1~C15）

**审查对象来源**：
- `spec.md`：FR-CHAT-050~064 / 090~094、NFR-CHAT-001~012、EC-CHAT-003~013、AC-CHAT-011~025
- `plan.md`：ADR-V4-035（引用卡投影）/ 036（系统事件单通道）/ 037（推荐真值白名单）/ 038（拾取入口迁移）/ 039（V3-VOL-3 收口序列）/ 040（五要素重登记与收口门禁）+ §5 文件影响分析
- `build.md` v2.0：§0 结论摘要 / §2 文件变更 / §3 裁决落地证据 / §5 23 门禁全账 / §7 根因订正与残余
- `src/**` + `test/**` + `dist/`（实测产物）+ `docs/*.json`（两份台账）

**四维度指引**：
1. **代码质量** — 可读性、职责单一性、错误处理、无硬编码、无冗余
2. **规范符合性** — 对照 spec.md 逐 FR/NFR/EC 核验（含「接线真实性」，不只看模块存在）
3. **架构一致性** — 对照 ADR 与 §5 文件影响分析（含 supersession 债务是否真清偿）
4. **测试质量** — 测试是否存在、是否覆盖核心/边界/错误路径、断言是否有效（可 FAIL、非空转）

| # | 审查对象 | 审查基准 | 审查维度 | 审查方法 |
|---|---------|---------|---------|---------|
| C1 | 引用生命周期（拾取→卡 / 失效→事件行+失效卡 / 重锚→新卡旧卡保留 / 两条恢复路径真可用） | FR-CHAT-050/051/052 · AC-CHAT-012 · EC-CHAT-005 · shim E2~E5 | 规范符合性 | `cards/ref.ts` / `ref-store.ts#projectRefCard` / `sidepanel.ts#projectRef,maybeRescue,reanchorRef,acceptCapture,handleCardAction` 走查 + 逐路径追到 DOM |
| C2 | 系统事件「单通道」真实性（唯一构造点 / 6+ 通道归并是否落地 / 去重窗口与速率上限边界） | FR-CHAT-053/054 · ADR-V4-036 §5 · AC-CHAT-011 | 规范符合性 | 全仓 `kind:'system'` / `dispatch({type:'system'})` grep + 生产 emitter 逐通道反查 + node 探针复现去重行为 |
| C3 | 推荐生产者真值（白名单 7 项 / import 白名单机核 / 是否真有生产调用点 / 安全边界粒度） | FR-CHAT-060/062/064 · AC-CHAT-013 · ADR-V4-037 · 裁决 5 | 规范符合性 | `recommend.ts` 走查 + `test/recommendation-sources.test.ts` 机核复核 + 全仓/产物调用点检索（`dist/sidepanel.js`） |
| C4 | V3-VOL-3 带值闭合合法性（三值 / `ceilTo50KB` / `min()` / 未经确认的重登是否绕过闭合判据） | FR-CHAT-090/091/092 · AC-CHAT-018 · ADR-V4-039 | 规范符合性 | 数值复算（`ceilTo50KB(465,277)`）+ `size-ruling-vol3.test.ts` 逐条读 + 台账 `v3Vol3Closeout` 对读 |
| C5 | `riskIncrementRegistry` 形态（登记实测真值 vs 新增豁免类别 / 双向精确 / 非空转 / 登记门槛） | 密度防滥用口径 · KL-V44-01 裁决② · build.md §3.3 自请复核 | 架构一致性 | 台账 registry 与 `density.mjs` 判据逐条对读 + 实跑门禁 + 反推「登记即通过」口子 |
| C6 | KL-V44-01 裁决执行质量（根因订正诚实度 / 重锚五要素 / 30 格零漂移） | ADR-V4-036 · build.md §3.1/§7.1/§7.4 · AC-CHAT-023 | 架构一致性 | 独立 A/B 复现（`git worktree` 取 `8ae971e` 重跑 `test:density`）与 HEAD 实测对比 |
| C7 | 退役与迁移完整性（`#l0-pick` / 底部 strips / `data-host="l1-panels"`+`"strips"` 宿主 / `#l0-ref-toggle`+`#l1-ref` 是否真吸入） | FR-CHAT-055 · spec §8 取代负载 · ADR-V4-040 §3 · EC-CHAT-007 | 架构一致性 | `index.html` / `l1/panels.ts` / `l0/shell.ts` / 各门禁判据对读 + DOM grep + 判据空转反推 |
| C8 | 门禁账与 AC 对照（23 项计数 / AC-CHAT-011/012/013/016/018/020/021/023/025 逐条） | build.md §5 · spec §7 · NFR-CHAT-009 | 测试质量 | 抽跑门禁复账 + AC 逐条落到断言/判据 |
| C9 | 推荐卡渲染与门控（chips 即指令同入口 / `pending` 禁用不隐藏 / 无候选不渲染 / 上限） | FR-CHAT-061/063 · EC-CHAT-008 · shim B4 | 规范符合性 | `cards/nextstep.ts` + `chat-state.ts#case 'nextstep'` + `syncNextstepPending` 走查 + `test:recommendation` 复跑 |
| C10 | `ref-store` 只追加投影（判定 / 序号 / 退役语义零变更的静态证明） | ADR-V4-035 §决策 5 · plan §5 | 架构一致性 | `git diff` 逐行核对 `l1/ref-store.ts`（只增不改） + 既有断言零 diff |
| C11 | 零注入 / 零明文 / 持久化边界 | NFR-CHAT-005/012 · AC-CHAT-020/021 · EC-CHAT-007 | 规范符合性 | `test:zero-injection` 复跑 + `stream-plaintext` 净化路径走查 + 持久化 label 白名单 |
| C12 | 体积五要素与中间重登记 | NFR-CHAT-006 · FR-CHAT-094 · 父 §10.4 | 规范符合性 | `size-baseline.ts` 登记册 + `validateReRegistrationDisclosure` + 产物实测字节 |
| C13 | 测试质量（新增门禁是否真驱动 / 是否覆盖边界与错误路径 / 断言可 FAIL） | NFR-CHAT-007 · AC-CHAT-023 | 测试质量 | 逐文件读新增测试 + 反证段检查 + 未覆盖切面清点 |
| C14 | 代码质量（可读性 / 职责单一 / 错误处理 / 硬编码 / 冗余 / 死代码） | 项目宪法 · §5.1 方法论 | 代码质量 | 逐文件走查 + 全仓未引用导出扫描 |
| C15 | 设计契约与长会话纪律 | NFR-CHAT-010/011 · AC-CHAT-025 · shim 条款 | 规范符合性 | `test:design-contract` 复跑 + `NFR-CHAT-011` 实现路径走查 |

> **质量门槛（数量基线法）**：本叶 16 个 FR（050~064 共 11 + 090~094 共 5）+ 9 个 NFR + 11 个 EC；
> C1~C15 中每个 FR 组 ≥1 条（050~052→C1；053/054→C2；055→C7；060/062/064→C3；061/063→C9；090~092→C4；093→C5/C12；094→C12），
> 四维度各 ≥1 条（代码质量 C14·C10；规范符合性 C1~C9/C11/C12/C15；架构一致性 C5/C6/C7/C10；测试质量 C8/C13）。
> **不适用项显式标注**：EC-CHAT-013（「若本叶无法在同一叶内完成取代 → 缩小范围并显式登记」）在 C7 中判定——本叶未缩小范围，
> 但把「过渡宿主清零」由「退役容器」改写为「移除宿主标记」，见 review-report.md BLOCK-02。

## 3. 审查方法（本策略的执行约定）

| 方法 | 说明 |
|------|------|
| 生产接线反查 | 对每个「新增能力」不满足于模块存在，必须追到**生产调用点**（`src/` 与 `dist/` 双向确认）；只有测试 seam 可达即判未交付 |
| 判据空转反推 | 对每条「清零 / 相等 / 上限」判据，反问「把被测量改名/移走是否仍为真」；成立即判空转 |
| 独立复现 | 关键门禁在本轮**自行复跑**；对照轮（build.md 声称的 A/B）用 `git worktree` 取历史提交独立重跑 |
| 只读纪律 | 不改 `src/`；只跑只读命令与单条门禁（严格串行，一次一个 Chromium） |
| 自我裁决高危面 | C4（体积军规闭合）与 C5（密度登记形态）按最高怀疑审查：先假定「自我裁决自我验收」，再找证伪证据 |

## 4. 结论

**结论**: 见 review-report.md（本轮 R1）。

## 5. 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建（C1~C15 策略；四维度覆盖 + 每 FR ≥1 条；显式标注 EC-CHAT-013 的不适用判定） | 2026-09-19 | SDDU Review Agent |
