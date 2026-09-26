# 审查报告：specs-tree-adn-1-ai-next-produce-and-verify（审查策略）

> **文档定位**: SDDU 审查策略 — 指导 review Agent 执行自主审查的清单和方法；审查结果见 `review-report.md`
> **前置依赖**: 本叶 `spec.md`（v1.0）/ `plan.md`（v1.0）/ `tasks.md` / `build.md`（v1.1）；父 `spec.md` / `plan.md`（ADR-ADN-001~010）
> **创建人**: SDDU Review Agent
> **创建时间**: 2026-09-26
> **版本**: v1.0
> **更新人**: SDDU Review Agent
> **更新时间**: 2026-09-26
> **更新说明**: 初始创建（ADN-1 安全核心叶自主审查清单 C1~C24；四维度：代码质量 / 规范符合性 / 架构一致性 / 测试质量）

---

## 1. 审查概要

| 维度 | 数值 |
|------|:--:|
| 审查文件数 | 18 个（12 `src/**` 生产 + `test/ai-next-candidate.test.ts` + `test/ui/fixtures/s0-chain.mjs` + `test/ui/s0-self-driven.mjs` + `test/ui/law8-plaintext.mjs` + 6 等价重锚门禁 + 台账/体积 2） |
| 通过项 | 21 |
| 改进建议 | 3 |
| 阻塞问题 | 0 |

**本叶性质**：首叶 / 底座叶 + **安全核心** —— 把 LLM 结构化产出的 next 变成受 **5 道校验链**约束、可注入、可判定的候选流（风险 R-ADN-001：幻觉 op / 越界 ref / 越界 param 触达特权 / 不可逆面）。

## 2. 自主审查清单（C1~C24）

**审查对象来源**：
- `spec.md`：FR-ADN-001~006 / 007 / 010~019 / 020~029 / 030~035 / 080·081·082·085 / 096 / 110~115 / 120~125、NFR-ADN-001~016、EC-ADN-001~020
- `plan.md`：ADR-ADN-001~010 的叶内落地（§4 14 项设计定案 / §5 文件影响 / §7 执行序）
- `build.md`：R1（TASK-ADN-101~117）+ R2（TASK-ADN-118~127）文件变更与门禁对账
- 产物：`src/**` 12 文件 + `test/**` + `docs/v4-supersession-ledger.json` + `test/size-baseline.ts`

| # | 审查对象 | 审查基准 | 审查维度 | 审查方法 |
|---|---------|---------|---------|---------|
| C1 | `ChatResultEvent.aiNext?` 载体（type-only / 单声明 / ∉ `KIND_SET` / 缺席逐字） | FR-ADN-011/018 · NFR-ADN-007 · ADR-ADN-001 §② | 规范符合性 | 源码走查 + `messaging.ts` 零 diff + `KIND_SET` 逐字 40 亲验 |
| C2 | 候选结构 `{opId,label,ref?,params?}` + 缺 `opId` 非法 | FR-ADN-012 · ADR-ADN-002 §① | 规范符合性 | `admitCandidate` 走查 + 独立注入 |
| C3 | 产出者声明 `driver=ai-next` / `timing=idle` / `evidence=session.aiNext`（三要素 + 零值） | FR-ADN-013 · NFR-ADN-016 · ADR-ADN-006 §① | 规范符合性 | `providers.ts#DRIVER_DECLS_SRC` 走查 + `driverTraceLine` 形态 + 独立渲染 |
| C4 | `ai-next` provider 骑 `ref-action` 位 + `prepend` + `NEXTSTEP_PRIORITY` 恰 4 + `chipsFor` 权威 | FR-ADN-014 · ADR-ADN-004 §② | 规范符合性 | `providers.ts` 走查 + AI-N-9 / 独立 `recommendNextStep` 替换语义 |
| C5 | 注入槽 `RecommendInput.session.aiNext?` + `NextCtx.session.aiNext?` + `CTX_FIELD_SERVICE`（顶层仍 7 源） | FR-ADN-015 · NFR-ADN-013 · ADR-ADN-004 §① | 架构一致性 | `definition.ts` / `recommend.ts` 走查 + NR-0 / recommendation-sources 白名单恒 5 |
| C6 | 解析 + 5 道校验位置 = SW 侧（B 列）+ 复用 `shared/op-table.ts` 单源镜像 | FR-ADN-016 · ADR-ADN-002 §② | 架构一致性 | `service-worker.ts` 装配点走查 + `sw-op-mirror` 门禁 |
| C7 | 零新 LLM：`recommend.ts` 仍 pure（零 `fetch(`/`chrome.`/时钟）+ 无引用 ⇒ 基座逐字 | FR-ADN-017 · FR-CHAT-060 · NFR-ADN-008 | 规范符合性 | `ref-context.ts` 分支走查 + RCT-3 门禁 + 独立正则抽核 |
| C8 | 未配置 ⇒ 零候选产出（零网络 / 零新 LLM 往返） | FR-ADN-019 · EC-ADN-008 | 规范符合性 | S0''' D 支线 node 面实跑 + `hasAiNext` 装配走查 |
| C9 | ① opId 在册（9）+ ② 三档 `tierOf` 单源 + `gesture` 恒拒 + `confirm` 可提案 + **顺序即优先级** | FR-ADN-020~023 / 027 · ADR-ADN-002 §① | 规范符合性 | 独立五类注入 + 顺序反证（未知 op + 坏 ref ⇒ 只报 unknown-op） |
| C10 | ③ ref 存在且有效（本回合快照，`refId` / `ref_<n>`；裸数字 / `#3` / 选择器 / 失效 ⇒ `ref`） | FR-ADN-024 · ADR-ADN-002 §④ | 规范符合性 | 独立边界注入 + `AiNextRefFact` 走查 |
| C11 | ④ param 与该 op `AskSpec` 相容（存在性 + 类型；`ask` 与 `ops.ts#IMPL` 逐行一致） | FR-ADN-025 · ADR-ADN-002 §③ | 规范符合性 | AI-N-11 逐行机核 + 独立 param 注入 + `op-table.ask` 单声明 |
| C12 | ⑤ 越界 / 非法 ⇒ 丢弃 + 可读留痕（`blocked=` 闭集 5 枚；零明文 / 不死端） | FR-ADN-026 · NFR-ADN-004/016 · ADR-ADN-002 §① | 规范符合性 | `AI_NEXT_BLOCKED_CODES` 闭集 + `driverBlockedLine` + law8 ⑪ |
| C13 | `admitCandidate`（接受层）vs `pressDecision`（按下层）分层；`pressDecision` **diff=0**；共享 `tierOf` | FR-ADN-030~035 · NFR-ADN-014 · ADR-ADN-003 | 规范符合性 | `ai-drive.ts` 逐行 diff + 独立真值表四情形 + 双向反证 |
| C14 | 纯函数校验器（不依赖 LLM 输出本身；门禁可直调）+ 真源切片 | FR-ADN-028 · NFR-ADN-009 | 代码质量 | `ai-next.ts` 依赖面走查 + 独立导入生产模块实跑 |
| C15 | 注入式反证族（五类）必须实跑 + 逐字节还原 | FR-ADN-029 · NFR-ADN-009 · EC-ADN-017/018 | 测试质量 | 独立注入脚本（非本仓库测试）亲跑 + sha 还原 |
| C16 | S0''' 四支线（A 采纳替换 / B 被拦留痕不渲染 / C 未产出确定性 / D 未配置零网络）双面 + 判据禁恒真 | FR-ADN-080/081/082/085 · ADR-ADN-007 | 测试质量 | node 面（`s0pppProblems` 十环节）+ Chromium 面（`s0-self-driven.mjs` S0C-13）亲跑 + 空读数/反证 |
| C17 | `DRIVER_DECLS_SRC` **12↔12** 双向包含 + DQ-3 `evidence` 与 `when`-scope 同源 + 旧 11 行逐字 | FR-ADN-096 · ADR-ADN-010 §① | 规范符合性 | AI-N-9 / DQ-1 / DQ-3 / NR-10 门禁 + 独立 key 计数 |
| C18 | 断言只增 / 反证实跑 / 新 node 门禁 `ai-next-candidate` 入 `gate-integrity` 受审下界（47→48）/ `CHROMIUM_GATES === 9` | FR-ADN-110~115 · AC-ADN-022 · ADR-ADN-009 | 测试质量 | `gate-integrity` 独立读 `EXPECTED_AUDITED_FILES.length` + 6 升级门禁 diff 走查 |
| C19 | B 列归因 + A 列薄接线预算 + 体积五要素同源（598,926→603,205 / +4,279） | FR-ADN-120~125 · NFR-ADN-001 · ADR-ADN-008 | 架构一致性 | `npm run build` 亲跑（metafile 同源）+ `size-baseline.adn1Rows` Σ 复算 |
| C20 | 越叶预算（ADR-ADN-008 §② +0.8~2.0 KB）被 +4,279 B 超越的**登记诚实性** | NFR-ADN-001 · R-ADN-006 | 规范符合性 | `SIDEPANEL_ADN1_FINAL_ROUND` / re-registrations 理由面 + 三值/二态走查 |
| C21 | 特权 op 恒 `gesture`（接受层即拒）+ AI 不得代答 consent（含 `confirm`） | NFR-ADN-002/003 · EC-ADN-002/003/018 | 规范符合性 | `op.authorize`/`op.perm.request` 独立注入 + `ai-drive` 零 consent 通道正则 |
| C22 | 法八四面零明文（候选 label / params / 留痕不回显值） | NFR-ADN-004 · EC-ADN-014 · AC-ADN-013 | 规范符合性 | `assertNoPlaintext` 先扫后截走查 + `test:law8` 亲跑（≥60，零降级） |
| C23 | 三冻结面 + `zeroDiffFiles` 9 项 + `manifest` / `web-cli-base` / 判定链零 diff + journey/binding 保段 | NFR-ADN-005 · ADR-ADN-010 §③ | 架构一致性 | `git diff` 逐项 + 独立 `npm run build` 前后 sha + `test:supersession` 保段双绿 |
| C24 | X-ADN 台账骨架（叶1 在册项）如实性 + 门禁对账（新增 1 + 升级 6 + 间接面） | FR-ADN-090/096/101/112 · ADR-ADN-010 §①② | 架构一致性 | 台账逐行走查 + 叶内/跨叶归属核对 + `supersession-ledger` 门禁 |

**额外代码质量抽检（并入 C14/C1）**：命名与职责单一（`ai-next.ts` 三段：解析 / 单条判定 / 批量校验）；错误处理 fail-closed（JSON 解析失败 / 非对象项 / 非法 label 一律丢弃，不抛、不死端）；无硬编码魔法阈值（两个 `MAX` 显式标注为显示/结构上限，非护栏六常量）；跨边界耦合（`background/ai-next.ts` 值导入 `ui/sidepanel/stream-digest.ts#assertNoPlaintext`）—— 见报告改进项 I-3。

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
| v1.0 | 初始创建（ADN-1 安全核心叶 C1~C24 自主审查清单；四维度覆盖；每 FR 切片 ≥1 Cx；ADR-ADN-001~010 逐项落点） | 2026-09-26 | SDDU Review Agent |
