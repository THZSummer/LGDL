# 审查报告：specs-tree-nda-1-next-tool-channel（审查策略）

> **文档定位**: SDDU 审查策略 — 指导 review Agent 执行自主审查的清单和方法；审查结果见 `review-report.md`
> **前置依赖**: 叶 `spec.md`（v1.0）/ `plan.md`（v1.0 + ADR-NDA-101 / ADR-NDA-102）/ `tasks.md`（v1.0）/ `build.md`（v1.0）；父 `spec.md`（v1.0）/ `plan.md`（ADR-NDA-001~004 / 008 / 009）/ `discovery.md`（v1.0）
> **创建人**: SDDU Review Agent
> **创建时间**: 2026-09-27
> **版本**: v1.0
> **更新人**: SDDU Review Agent
> **更新时间**: 2026-09-27
> **更新说明**: 初始创建（NDA-1 机制核心叶自主审查清单 C1~C28；四维度：代码质量 / 规范符合性 / 架构一致性 / 测试质量；审查对象 = 工作树未提交产物；routing.v1 = `local_or_compute → none`）

---

## 1. 审查概要

| 维度 | 数值 |
|------|:--:|
| 审查文件数 | 25 个（1 NEW src + 6 MODIFY src + 18 test/台账/文档；另只读复核 2 个基座文件 + 3 个冻结面） |
| 通过项 | 22 |
| 改进建议 | 4（归并自 6 条 ⚠️） |
| 阻塞问题 | 0 |

**本叶性质**：首叶 / 底座叶 + **机制核心** —— 把 F-36 的「文本 `next` 围栏块 + 正则解析」替换为**模型原生工具调用**（`next` 工具 + 基座 `hooks.intercept` 捕获 + 合成 `ToolResult` 短路 dispatch），并**整体保留** 5 道校验链与判定分层；围栏块通道**结构性替换**（单一产出通道）；触发范围**无条件**；规则位等价重锚。审查重点是「换机制 ≠ 换安全闸」与「换轨是真换轨」两条可判事实。

**审查对象来源**：
- `spec.md`：承载父 FR ≈60 条切片（GOV 001~007 · TOOL 010~020 · CAPTURE 021~028 · VERIFY-KEEP 030~036 · UNCOND 040~045 · FENCE 080~083 · S0'''' 100~103/105/106 主线侧 · SUPERSEDE 110/111/114~118/121 · GATE 130~137 · VOL 140~145）+ NFR-NDA-001~016 + EC-NDA-001~025 + 交付物 11 项
- `plan.md`：§4 叶内设计定案 14 项 / §5 文件影响（A/B 列 + 预算）/ §3 两组方案对比 / 父 ADR 落点 + 叶内 ADR-NDA-101 / ADR-NDA-102
- `build.md`：20/20 任务、SG-NDA-01 8/8 · SG-NDA-02 12/12、门禁结果、体积叶1 重登记 605,239 B、未决项 U-1~U-4
- 产物（**工作树**，未提交）：`packages/web-cli-plugin/src/**`（7）+ `test/**`（13）+ `test/parity/waivers.json` + `docs/v4-supersession-ledger.json` + `docs/v4-density-baseline.json` + `dist/`（只读量值复核）

## 2. 自主审查清单（C1~C28）

| # | 审查对象 | 审查基准 | 审查维度 | 审查方法 |
|---|---------|---------|---------|---------|
| C1 | `tools/next-tool.ts` 模块质量：单源声明 / 纯度（零 chrome·DOM·IO·时钟）/ 命名 / 文档 / 无魔法数 / `listed:false` + fail-closed `executor` | FR-NDA-010~014 · NFR-NDA-007/013 · ADR-NDA-001 §① | 代码质量 | 全文走查 + 正则抽核（`FORBIDDEN_RUNTIME` / 跨层 import）+ 与 `src/tools/*-tools.ts` 惯例对照 |
| C2 | `background/ai-next.ts` 解析/校验分层：五层筛法 / 纯函数 / 错误处理不抛 / 职责单一（解析 vs 单条判定 vs 批量） | FR-NDA-022/030 · NFR-NDA-009 · ADR-NDA-101 §① | 代码质量 | 走查 + 逐层对照旧 `parseAiNextItems` 口径 + 依赖面（`shared/op-table` + `stream-digest`） |
| C3 | `service-worker.ts` 接线质量：`intercept` 闭包 / `turnState`（`captured` 与候选分离）/ events 过滤 / 装配 `slice(≤3)` / `onToolDone` 逐字 | FR-NDA-021~028 · ADR-NDA-002/102 | 代码质量 | diff 走查 + `onToolDone` 函数体切片 sha256 与 HEAD 对比 |
| C4 | `providers.ts` / `recommend.ts` 改动质量：`priority 2→1` / `rule:'ai-led'` / `NEXTSTEP_LABELS` / `RULE_PROVIDER_IDS` / 无魔法数 | FR-NDA-042/114 · ADR-NDA-003 §①② | 代码质量 | 走查 + 计数口径核对 + 消费点（`resolveOrder` / `priorityOf`）反查 |
| C5 | **`next` 工具注册 + schema 单源**：`LlmToolDef` / `enum` 由 `OP_IDS` 派生减 `gesture`（7 枚）/ `params:{type:'string'}` 同构 / `maxItems ≤3` / `description` 三约束 / `listed:false` / fail-closed `executor` | FR-NDA-010~014 · AC-NDA-002 · ADR-NDA-001 | 规范符合性 | 源走查 + `OP_IDS`/`tierOf` 真源 re-derive（独立复算 9−2=7）+ AI-N-12 判据本体读判 |
| C6 | **schema 是软约束、运行时 5 道链是权威**（反证：schema 合法但 param 越界 ⇒ 必拦） | FR-NDA-012/027 · R-NDA-901 | 规范符合性 | `next-tool.ts` 模块头 + `admitCandidate` 走查 + 独立注入（越界 param） |
| C7 | **触发无条件**：注册恒发（已配置）/ `ai-next.when` 逐字不读 refs / 未配置结构性不下发 / 时机仍 `'idle'`（`DRIVER_TIMINGS` 恰 5） | FR-NDA-015/018/040/041/043 · NFR-NDA-015 | 规范符合性 | `host.ts` always-registered 段 + SW `:945-956` early-return 结构走查 + `when` 逐字对比（git diff 零命中）+ `DRIVER_TIMINGS` 计数 |
| C8 | **零新增载体 / 载荷只增不改**：`KIND_SET` 40 / 12 kind / `REGISTERED_STRUCTURAL_HOSTS=[]` / `ACT_TO_OP` 6；`aiNext` 加法字段；缺席 ⇒ 现状逐字 | FR-NDA-016/019 · EC-NDA-017 · NFR-NDA-007 | 规范符合性 | diff 面核对（`messaging.ts` / `cards-shared` / `host-registry` 零 diff）+ 独立计数（`KIND_SET`=40 亲验）+ `hasAiNext` 装配走查 |
| C9 | `parity` 新 `pluginExtra` 条目（reason + basis 非空；旧条目逐字；`baseline-catalog.json` 零改） | FR-NDA-020/117 · AC-NDA-016 · ADR-NDA-001 代价段 | 规范符合性 | `waivers.json` diff + `parity.test.ts` 语义约束（双向 + stale 检查）读判 |
| C10 | **`hooks.intercept` 捕获**：命中 `tc.name==='next'` ⇒ 写捕获态 + 合成 `ToolResult` ⇒ **短路真实 dispatch**；位置 SW 侧；`onToolDone` 逐字未动 | FR-NDA-021~024 · AC-NDA-003 · ADR-NDA-002 | 规范符合性 | 源走查 + 基座 `runner.ts` 缝契约只读复核（`intercepted ?? dispatch`）+ `onToolDone` 切片 sha256 |
| C11 | `rawArguments` 严格 JSON + 解析失败 ⇒ 未产出（不抛、不中断回合、不写 `blocked`） | FR-NDA-022 · EC-NDA-015 · ADR-NDA-101 §② | 规范符合性 | `parseNextToolArguments` 五层走查 + 独立坏形态注入（非法 JSON / 顶层数组 / 缺 candidates / 项非对象） |
| C12 | 同回合多次 `next` ⇒ **覆盖式取最后一次**（非并集）+ `≤3` 截断在装配层 | FR-NDA-025 · EC-NDA-014 · ADR-NDA-101 §③ | 规范符合性 | `captureNextCall` 语义 + 装配层 `slice(0, NEXT_TOOL_MAX_CANDIDATES)` 走查 + AI-N-1 两次调用判据 |
| C13 | **5 道校验链整体保留**（顺序即优先级）：① opId 在册（9）② `tierOf` 三档（`gesture` 恒拒）③ ref 有效 ④ param 与 `ask` 相容 ⑤ label 形状 + 零明文预筛；未知 op + 越界 ref ⇒ **只**报 `unknown-op` | FR-NDA-030~036 · ADR-NDA-004 §① | 规范符合性 | `admitCandidate` 函数体切片 sha256（HEAD vs 工作树）+ 独立五类注入 + 顺序反证 |
| C14 | **判定分层保持**：`admitCandidate`（接受层）vs `pressDecision`（按下层）；`confirm` ⇒ `admit=true ∧ press=blocked:tier`；`gesture` 连接受都拒 | FR-NDA-033/036 · NFR-NDA-014 · ADR-NDA-003 | 规范符合性 | 独立真值表四情形 + `pressDecision` 源走查 + AI-N-5 判据读判 |
| C15 | **留痕三要素 + 零明文**：`driver=ai-next \| timing=idle \| evidence=…` + `blocked=<code>`；只含字段名不含值；`evidence` 与工具机制同源 | FR-NDA-028 · NFR-NDA-016 · ADR-NDA-006 | 规范符合性 | `DRIVER_DECLS_SRC` 逐字对比 + `driverBlockedLine` 走查 + law8 ⑪/⑫ 判据读判 |
| C16 | **围栏块通道替换**：`NEXT_CONTRACT_GUIDANCE` / `AI_NEXT_FENCE_INFO` / `FENCE` / `lastNextFenceBody` / `parseAiNextItems` **结构性零命中**；单一产出通道；「零新 LLM 往返」契约（同回合内） | FR-NDA-080~083/121 · EC-NDA-020 · ADR-NDA-004 §① | 规范符合性 | `src/**` 符号级 grep（零命中）+ `ref-context.ts` 注入点走查 + `refContextSegment` 无引用 ⇒ `''` 逐字 |
| C17 | **`ai-led` 规则位等价重锚**：`NEXTSTEP_PRIORITY` 恰 5（`ai-led` 第 2 位 < `ref-action`；`risk-recovery` 仍最高）；`rule:'ai-led'`；单源（一处 provider + 一处规则表） | FR-NDA-042/114 · NFR-NDA-013 · ADR-NDA-003 §①③④ | 规范符合性 | 真源读判（数组逐项）+ 独立位次断言 + `resolveOrder` 消费面走查 |
| C18 | **无死端**：非法被拦 / 未产出 / 未配置 ⇒ 确定性兜底可达（`ref-action` / `risk-recovery` + 终端恒在）；被拦候选不渲染为 chip | FR-NDA-044/045 · EC-NDA-001~006/019 · NFR-NDA-011 | 规范符合性 | S0''''/S0''' node 面判据读判 + `ai-next.when`（`aiNext.length>0`）⇒ 零接受 ⇒ provider 关闭走查 |
| C19 | **特权恒 `gesture` + AI 不代答 consent**：enum 不含 `gesture` 档（更强 fail-closed）；运行时 `tier` 恒拒；`confirm` 不可自动按下 | NFR-NDA-002/003 · EC-NDA-002/003/018 · NFR-NDA-016 | 规范符合性 | `NEXT_TOOL_ALLOWED_OP_IDS` 派生式走查 + 独立 `op.authorize` / `op.perm.request` 注入 + `pressDecision` 拒 |
| C20 | **法八四面零明文（含工具参数 / description / 合成 output / 留痕）** | NFR-NDA-004 · EC-NDA-022 · AC-NDA-014 | 规范符合性 | `description` / `NEXT_TOOL_ACK` / `NEXT_TOOL_NOT_DISPATCHABLE_TEXT` 静态抽核 + law8 ★ NDA-1 ⑫ 两条新增判据读判 |
| C21 | **ADR/文件影响对齐**：工具定义落独立 `src/tools/next-tool.ts`（方案 B）；`validateAiNext` 改签名 + 上游解析分离（方案 B）；文件清单 = plan §5（1 NEW + 6 MODIFY src + 18 test/台账/文档） | ADR-NDA-001 §① · ADR-NDA-004 §① · plan §5 | 架构一致性 | `git status` / `--numstat` 与 plan §5 逐行比对 + 新文件落点惯例对照 |
| C22 | **ADR-NDA-101 / 102 落地**：`tc.rawArguments` 为唯一输入面（`tc.args` 零使用）；`next` 不上流（`onCommandLine` / `onToolOutput` 加法早退）；`onToolDone` 语义逐字不动 | ADR-NDA-101 §①/③ · ADR-NDA-102 §①/② | 架构一致性 | 源切片走查 + 早退锚点存在性 + `tc.args` 源扫描 + ADR 陈述与生产代码事实对照 |
| C23 | **红线**：零改基座（`packages/web-cli-base/**` 零 diff）/ 冻结面逐字节（`dist/content.js` 177,076 B sha `52a82620…`；`dist/pick-layer.js` 34,358 B sha `77796bab…`）/ 保护段（journey / binding 零触碰）/ 判定链 + `zeroDiffFiles` 零 diff / `.sddu` 外零触碰（ROADMAP 零 diff） | FR-NDA-001~006/142 · NFR-NDA-005 · NG-NDA-005/007/008 | 架构一致性 | `git status` + sha256 亲验 + 保护段文件不在改动集 + ROADMAP 零 diff |
| C24 | **门禁改写 / 台账 / 体积**：`ai-next-candidate` 等价或更强（判据只增，`assertionsRemoved=0`）；`gate-integrity` 受审下界只增 ∧ `EXPECTED_AUDITED_FILES===48` ∧ `CHROMIUM_GATES===9`；`recommendation-sources` ③ 恰 4→5；体积叶1 重登记（五要素 + 三值 + `nda1Rows`） | FR-NDA-082/116/130~137/140~145 · AC-NDA-024/026/027/028 · ADR-NDA-008/009 | 架构一致性 | 门禁 diff 走查 + 判据 id 集合比对（旧 11 ⊆ 新 14）+ 台账 JSON 结构读判 + 体积数值复算（459+178=637） |
| C25 | **测试存在性与判据增量**：`JUDGEMENTS` 11→14；旧 AI-N-1~11 语义保留；新增 AI-N-12/13/14；四类注入反证族；三段控制（ok/violated/n/a）；真源切片（生产模块实跑） | FR-NDA-082/100~106/130/131 · NFR-NDA-009 | 测试质量 | 判据 id / 测试名集合 diff（旧 ⊂ 新）+ 反证段读判 + 真源 import 面核对 |
| C26 | **S0'''' node 面 + Chromium 面**：主线 A / 支线 B·D node 面逐条可判（叶2 步骤记 `n/a` 不冒充 `ok`）；Chromium 面**只加断言不加文件**（`CHROMIUM_GATES` 9 不动）；样本/判据**单源**（node 与 Chromium 共用 `S0PPPP_*`） | FR-NDA-100~103/105/106 · AC-NDA-001 · ADR-NDA-007 | 测试质量 | fixture 单源核对 + 两面共用 import 走查 + 断言增量逐条读判 |
| C27 | **断言有效性**：反证可红（非恒真）/ 无弱判据（常量冒充读数）/ 无「删断言不补等价」 | FR-NDA-105/106 · NFR-NDA-009 · R-NDA-911/912 | 测试质量 | 逐条 ⑫ / S0''''-2 / `unconditional` / `unconfiguredToolSent` 读数来源抽检 + `label()` 逃生路径推演 |
| C28 | **`KL-N-10` flake 处置**：如实登记 + 隔离复跑 ≥2 + 台账不阻塞终态 | EC-NDA-025 · FR-NDA-136 · R-NDA-012 | 测试质量 | `build.md §4.1` 记录走查 + 与基线复跑对照口径核对（≥2 独立复跑留 validate） |

> **质量门槛核对**：本叶承载父 FR ≈60 条切片（13 组）—— 每组 ≥1 Cx（GOV→C23/C24 · TOOL→C5/C6 · CAPTURE→C10/C11/C12 · VERIFY-KEEP→C13/C14 · UNCOND→C7/C17 · FENCE→C16 · S0''''→C26 · SUPERSEDE→C24 · GATE→C24/C25 · VOL→C24）；四维度均 ≥1 条（代码质量 C1~C4 / 规范符合性 C5~C20 / 架构一致性 C21~C24 / 测试质量 C25~C28）。

## 3. 审查详情

> 逐项结果见 `review-report.md`（本文档为策略，不定结果）。

## 4. 改进建议

> 见 `review-report.md` §5。

## 5. 阻塞问题

> 见 `review-report.md` §4。

## 6. 结论

**结论**: 由 `review-report.md` 给出。

## 7. 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建（NDA-1 机制核心叶 C1~C28 自主审查清单；四维度覆盖；≈60 条父 FR 切片按 13 组各 ≥1 Cx；ADR-NDA-001~004/008/009 + 叶内 ADR-NDA-101/102 逐项落点） | 2026-09-27 | SDDU Review Agent |
