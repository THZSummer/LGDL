# 审查策略（review.md）：specs-tree-ian-1-free-input-next

> **文档定位**: SDDU 审查策略 — 指导 review Agent 执行自主审查的清单和方法；审查结果见 `review-report.md`
> **前置依赖**: `spec.md`（v1.0 · 268 行）· `plan.md`（v1.0 · 142 行）· `tasks.md`（v1.0 · 843 行 / 27 任务）· `build.md`（v2.0 · R1+R2 · 叶1 收口）· 父 `../spec.md` + `../plan.md`（ADR-IAN-001/002/003/008/009/010）
> **审查对象范围**: 叶1 = `feature/web-cli-plugin` @ `f3af634`（R1 `e76f455` + R2 `2aa58ab` / TREE `f3af634`；27/27）
> **创建人**: SDDU Review Agent
> **创建时间**: 2026-09-25
> **版本**: v1.0
> **更新人**: SDDU Review Agent
> **更新时间**: 2026-09-25
> **更新说明**: 初始创建（叶1 流内自由输入 next 通道的自主审查清单：C1~C26，覆盖 GOV/FIM/CHAN/R6Q/CONV/S0''/SUPERSEDE/GATE/VOL 全部父 FR 切片 + 四维度）

---

## 1. 审查概要

| 维度 | 数值 |
|------|:--:|
| 审查对象 | 叶1 全范围（R1 W1+W2 + R2 W3） |
| 审查文件 | 源码 14（src×1 NEW 除外即 13 MODIFY + ops/stream-* 连带）· 测试 17· 台账/文档 3· SDDU 3 |
| 通过项 | 23 |
| 改进建议 | 3 |
| 阻塞问题 | 0 |

---

## 2. 自主审查清单（C1~C26）

> **审查对象来源**：`spec.md` §4（FR 切片 ≈44 条，按 §4 表分组）/ §5（NFR）/ §6（EC）→ 逐组核验；`plan.md` §4 十二项设计定案 + §5 文件影响 + 父 ADR → 架构遵循；`build.md` 文件变更清单 / 门禁对账 / 体积五要素 / 偏差登记 → 覆盖与诚实性；`src/` + `test/` → 代码质量与测试质量。
> **质量门槛**：spec §4 的每个 FR 分组 ≥ 1 Cx（GOV/FIM/CHAN/R6Q/CONV/S0''/SUPERSEDE/GATE/VOL 九组全覆盖）· 四维度各 ≥ 1 Cx。

| # | 审查对象 | 审查基准 | 审查维度 | 审查方法 |
|---|---------|---------|---------|---------|
| C1 | 末端项「自由输入…」存在 ∧ 恒最末（结构序 + 文本序） | FR-IAN-010 / 014 · spec §4 / ADR-IAN-001 §① | 规范符合性 | 源码走查（`providers.ts` / `recommend.ts` / `cards/nextstep.ts`）+ Chromium `recommendation.mjs ⑰` / `S0C-12` 亲跑 |
| C2 | 点开就地展开卡内输入（零第二 DOM 路径 / 不常驻） | FR-IAN-011 / 012 · ADR-IAN-002 §① | 规范符合性 | 源码走查（`askuser.ts` 复用 `.ask-fallback`）+ `S0C-12` 真面板 |
| C3 | 零死端 floor（无任何候选仍可达） | FR-IAN-013 · EC-IAN-001 · ADR-IAN-001 §① | 规范符合性 | `recommend.ts` 走查 + `free-input-next` FIN-2 + `test:dead-end` 亲跑 |
| C4 | `op.describe` 有值相语义不变（本地结算、不成回合） | FR-IAN-015 · NFR-IAN-008 · ADR-IAN-002 §① | 规范符合性 | `askuser.ts#askFixedText` 分支 + `handleCardAction` requestId 路由走查 |
| C5 | 提交**唯一**经 `op.turn` 槽；`requestTurn(` 叶1 仍恰 2 | FR-IAN-016 / 020 / 021 · ADR-IAN-002 §② | 规范符合性 | `submitFreeInput` 走查 + `callSites(requestTurn)` 亲数 + `op-wiring` 亲跑 |
| C6 | 手输 / AI driver 两值可判（`MANUAL_DRIVER_ID` 单源 ∧ ∉ 声明集） | FR-IAN-022 / 024 · EC-IAN-013 / 018 | 规范符合性 | `ai-drive.ts` 走查 + FIN-4 含反证 |
| C7 | 让位语义（`noteUserTurn`）在手输路径 ∧ `requestTurn` 体外 | FR-IAN-023 · ADR-IAN-002 §② | 规范符合性 | 函数体切片（FIN-5）+ 反证「移入槽内 ⇒ 必红」 |
| C8 | 空 / 纯空白提交不产生空回合 ∧ 不静默 | EC-IAN-004 · ADR-IAN-002 §② | 规范符合性 | `submitFreeInput` 守卫序走查 + FIN-6 + 反证 |
| C9 | 展开即 focus 卡内输入；键盘 Enter/Escape 可达 | FR-IAN-019 · EC-IAN-010 · NFR-IAN-009 | 规范符合性 | `askuser.ts` keydown + `setCardFallbackOpen` 走查 + `S0C-12` focus 读数 |
| C10 | 零新增载体（`KIND_SET` 40 / 12 kind / 零宿主 / 终端不进 `ACT_TO_OP`） | FR-IAN-017 · NFR-IAN-007 · AC-IAN-009 | 规范符合性 | 生产源抽取机核 + FIN-0 + `insight-no-escalation` 亲跑 |
| C11 | 法八四面零明文（文本仅走 `chat` `user` 载荷；卡固化不回显） | FR-IAN-018 · NFR-IAN-004 · EC-IAN-005 | 规范符合性 | `law8-plaintext.mjs` ⑩ 亲跑（60/0）+ FIN-8 + `submitFreeInput` 切片 |
| C12 | 特权 op 恒 gesture；提交不触达特权 op | FR-IAN-025 · NFR-IAN-002 / 003 | 规范符合性 | `insight-no-escalation` IAN-1 扩面亲跑 + op 档表走查 |
| C13 | R6 双入口并存 ∧ 在飞不硬禁用（终端非 `.next-chip`） | FR-IAN-030 / 031 · NFR-IAN-006 · EC-IAN-002 / 009 | 规范符合性 | `nextstep.ts#syncNextstepPending` 走查 + `sidepanel-view` / `r6-ty` node 反证 + `S0C-12` 真面板 |
| C14 | 流内回填支持（仅当为空 / 卡收起重展开 / 卡不存在按需铸造）∧ 流外 `#input` 保留 | FR-IAN-032 / 033 / 086 · EC-IAN-003 · ADR-IAN-003 §③ | 规范符合性 | `restoreFreeInputDraft` 走查 + TA-8 / FIN-7 含反证 + `S0C-12` 双回填真值 |
| C15 | S0''-A 中间态样板：双入口各跑通一轮 + 反证（node + Chromium 双面） | FR-IAN-070 / 071 / 072 / 074 · AC-IAN-001 / 027 · ADR-IAN-009 | 规范符合性 | `test:s0-self-driven` 亲跑（81/0）+ `s0-self-driven-chain` node 面 + 样本单源核 |
| C16 | 四处兜底入口只 reveal 卡内 `.ask-fallback`（流内载体内接线） | FR-IAN-050 / 052 | 规范符合性 | `handleCardAction('free-input') → openFreeInputCard` 走查 + 零流外载体重建 |
| C17 | 门禁治理（只增 / 反证实跑 / 新门禁入下界 / 串行；保护段不动） | FR-IAN-100~106（骨架） | 规范符合性 | `gate-integrity`（23/0）/ `supersession`（45/0）亲跑 + 断言零删除核 |
| C18 | 体积叶1 收口重登记（五要素 + V3-VOL-3 三值 + EC-IAN-016 二态） | FR-IAN-110~115 · NFR-IAN-001 · ADR-IAN-010 | 规范符合性 | `size-budget` / `size-ruling-vol3` / `size-growth-evidence` 亲跑（47/0，skipped=0）+ `stat` 亲测 |
| C19 | 定义 / 注册表 / 分发表一致（provider 11 · `ACT_TO_OP` 6 · 集 A 9 · `NEXTSTEP_PRIORITY` 4） | plan §4-1 / §4-2 · ADR-IAN-001 §①/§② | 架构一致性 | 生产常量直读 + `next-dispatch-diff0` / `driver-quadruple` 亲跑 |
| C20 | 文件影响对齐（plan §5）∧ 零改上游（`turn-queue.ts` / base / 判定链） | plan §5 · NG-IAN-003~006 | 架构一致性 | `git diff --stat` 全量对照 + `turn-queue.ts` diff=0 核 |
| C21 | 模块边界与单一职责（`reachableOpIds` 只收真实 op；`askuser` 纯查询单源） | ADR-IAN-001 §① / 代码质量 | 代码质量 | `ops.ts` / `askuser.ts#openAskCardIdByRequest` 走查 + 复用点收敛核 |
| C22 | 错误处理与可读行（空 / 无活跃站点 notice；cancel 零 SW 投递） | EC-IAN-004 · 代码质量 | 代码质量 | `submitFreeInput` / `cancelFreeInputCard` 走查 |
| C23 | 新门禁质量（FIN-0~9 判据 + `expectFailPattern` + 反证实跑 + 禁恒真） | tasks TASK-IAN-116 / 121 · 测试质量 | 测试质量 | `free-input-next.test.ts` 全文走查 + 亲跑（22/0）+ 元判据 |
| C24 | 双面测试有效性（node + Chromium 样本单源；三段控制；行为级覆盖） | ADR-IAN-008 / 009 · 测试质量 | 测试质量 | `s0-chain.mjs` 单源核 + `S0C-12` 亲跑 + 覆盖缺口评估 |
| C25 | 台账一致性（`xIianLedger` 7 行 + 门禁对账 11 行 + `ian1Rows` Σ 自洽） | FR-IAN-102 / 114 · 架构一致性 | 架构一致性 | `v4-supersession-ledger.json` 直读 + `supersession` 亲跑 |
| C26 | 冻结面 / 红线终核（`content.js` 177,076/`52a82620` · `pick-layer.js` 34,358/`77796bab` · 保护段 journey 171 / binding 192） | FR-IAN-112 · NFR-IAN-005 · 测试质量 | 测试质量 | `stat` + `sha256` 亲测 + `journey` / `binding` / `law8` / `dead-end` / `recommendation` 亲跑 |

> **质量门槛核对**：spec §4 的九组父 FR 切片（GOV C17 · FIM C1~C3/C10 · CHAN C4~C9/C11/C12 · R6Q C13/C14 · CONV C16 · S0'' C15 · SUPERSEDE C14/C25 · GATE C17 · VOL C18）全部 ≥ 1 Cx；四维度各 ≥ 1 Cx。✅ 满足。

---

## 3. 审查详情（方法学索引）

| 维度 | 方法 |
|------|------|
| 代码质量 | 逐文件走查（命名 / 职责 / 错误路径 / 硬编码 / 冗余）；对照 §5.1 |
| 规范符合性 | spec FR/NFR/EC 逐组对照实现位置；`grep` + 源码切片 + 亲跑门禁证据 |
| 架构一致性 | 对照 plan §4/§5 + 父 ADR；`git diff` 全量；常量直读 |
| 测试质量 | 判据/反证/元判据走查；亲跑 node + Chromium；覆盖缺口评估 |

## 4. 改进建议 / 5. 阻塞问题 / 6. 结论

见 `review-report.md`（每轮执行独立产出；策略文档不变时可多轮迭代）。

## 7. 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建（叶1 自主审查策略 C1~C26；四维度 + 九组 FR 覆盖；亲跑门禁与体积/红线终核方法） | 2026-09-25 | SDDU Review Agent |
