# 审查报告：specs-tree-v55f-1-ref-context-and-anchor

> **文档定位**: SDDU 审查策略 — 指导 review Agent 执行自主审查的清单和方法；**审查结果见 `review-report.md`**（本文件 = Feature 级固定产物，定义一次；`review-report.md` 每轮独立产出）
> **前置依赖**: 本叶 `spec.md` v1.0（承载父 FR ≈62 条切片 / 12 AC 锚点）· 本叶 `plan.md` v1.0 · 父 `plan.md` + `ADR-SGO-001~008` · 本叶 `tasks.md`/`tasks.json` v1.0（29 任务 / 4 波）· 本叶 `build.md` v2.0（R1+R2 全叶收口，29/29）
> **创建人**: SDDU Review Agent
> **创建时间**: 2026-09-24
> **版本**: v1.0
> **更新人**: SDDU Review Agent
> **更新时间**: 2026-09-24
> **更新说明**: 初始创建（V5.5F-1 范围底座叶审查策略：**C1~C37** 自主清单；四维度全覆盖；每个承载 FR 块 ≥1 Cx；明确「亲注入 / 亲跑」方法与红线终核口径）

---

## 0. 审查对象与边界

| 项 | 值 |
|---|---|
| Feature | `specs-tree-v55f-1-ref-context-and-anchor`（V5.5F-1 范围底座：引用事实进回合 + 范围读数（法九）+ `--ref` 锚定 + S0′ 双面；父 `specs-tree-web-cli-plugin-v55-f-scope-governance`） |
| 分支 / HEAD | `feature/web-cli-plugin` / `2e3f141`（R1 `68848af`（W1+W2）+ R2 `2e3f141`（W3+W4），**29/29 completed**） |
| 被审成品 | `dist/sidepanel.js` = **585,732 B**（A 列，登记基线同源）· `dist/background.js` = **1,627,424 B**（B 列，不计账）· `dist/content.js` **177,076 B** / sha `52a82620…` · `dist/pick-layer.js` **34,358 B** / sha `77796bab…`（逐字节冻结） |
| 审查方式 | **静态分析为主**（不跑测试不等于不验证：本叶按编排任务书点名做「亲注入 / 亲跑」以证判据承重，注入一律**逐字节还原**且 `.sddu` 外零残留） |
| 不负责 | 动态验证场景矩阵（属 `@sddu-validate`）；本 Agent 只做「读 + 注入反证 + 现成门禁亲跑」 |

**自主提取来源**：`spec.md` §4（承载父 FR 切片）/§5（NFR）/§6（EC）/§7（AC）+ `plan.md` §5（文件影响）/§2（数据流 + X-SGO 处置）/§8（体积预算）+ `build.md`（文件变更 / 门禁对账 / 反证摘要 / 偏差登记）+ 实际产物（`src/**`、`test/**`、`docs/v4-supersession-ledger.json`、`dist/build-meta.json`）。

---

## 1. 审查概要

| 维度 | 数值 |
|------|:--:|
| 审查项总数（Cx） | **37** |
| 通过 | **35** |
| 警告 | **2**（C12 / C29，对应 I-01 / I-02） |
| 失败 | **0** |
| 阻塞问题 | **0** |
| 改进项（I） | **2**（I-01 / I-02，均非阻塞） |

> 逐轮结果（本文件不随轮次变）见 `review-report.md`：R1 计数 = 通过 35 / 警告 2 / 失败 0 / 阻塞 0。

---

## 2. 自主审查清单（C1~C37）

> 四维度 = 代码质量（Q）/ 规范符合性（S）/ 架构一致性（A）/ 测试质量（T）。
> 质量门槛：本叶 §4 承载的 **11 个父 FR 块**（GOV / REFCTX / SCOPE / ANCHOR / LAW9 / TRACE / S0′ / SUPERSEDE / GATE / VOL + NFR/EC 面）**每块 ≥1 个 Cx**；四维度各 ≥1 条。

### 2.1 代码质量（Q）

| # | 审查对象 | 审查基准 | 审查维度 | 审查方法 |
|---|---------|---------|---------|---------|
| C1 | `l1/ref-scope.ts`：快照投影 / 读数单源 / 写闸 / 留痕四职责是否单一、命名与注释是否可读 | plan §2.1；ADR-SGO-002 | 代码质量 | 逐行走查 + 职责切分核对（4 组函数各自单职责） |
| C2 | `tools/dom-anchor.ts` 解析链：逐级 fail-closed 是否纯函数可注入、错误文案是否可读 + 有指引 | ADR-SGO-003 §2；EC-SGO-001~004/015~017 | 代码质量 | 逐级走查 + 直接调用 `resolveRefAnchor` 抽核 2~4 条 EC |
| C3 | `background/ref-observe.ts`：`observeIdentity` 抽取为**单一实现**（无第二副本）、只读零 DOM 写 | FR-SGO-033；N-SGO-010 | 代码质量 | 计数判据 + grep 双查（SW / 包装层不得自实现） |
| C4 | `sidepanel.ts` confirm 面范围闸接线：fail-closed ∧ 可达 next ∧ 判定链零触碰 | FR-SGO-025/027/037；R-SGO-911 | 代码质量 | 走查 `confirm-request` 分支 + `zeroDiffFiles` 核对 |
| C5 | 硬编码值是否被提取为单源常量（锚属性 / 子命令 / 读数词 / 留痕字段名） | 项目宪法；N-SGO-028 | 代码质量 | grep 字面量分布（第二处声明扫描） |

### 2.2 规范符合性（S）

| # | 审查对象 | 审查基准 | 审查维度 | 审查方法 |
|---|---------|---------|---------|---------|
| C6 | **FR-SGO-001~006** 主流程零扩张（`requestTurn(` 恰 2 / `maybeRecommend` 1/7 / `nextAfterSettle` 1/10） | spec §4；N-SGO-014 | 规范符合性 | 亲跑 `op-wiring` + 静态计数 |
| C7 | **FR-SGO-010 / 011** type-only 载荷 7 字段 + `KIND_SET` 40 逐字（`refs` 不是 kind） | spec §4；N-SGO-009 | 规范符合性 | 亲跑 `ref-context-in-turn` + `messaging.ts` 抽取计数 |
| C8 | **FR-SGO-012** 口径写死：页面文本可入上下文 / 凭据值不可 / 留痕只含字段名 | spec §2.2；EC-SGO-019 | 规范符合性 | 走查 `maskRefDigest` + 亲跑 `law8` ⑧（46/0） |
| C9 | **FR-SGO-013 / 014** 唯一构建点（两入口同口径） | spec §4 | 规范符合性 | 走查 `requestTurn` 函数体 + 注入反证（复制第三调用点 ⇒ 必红） |
| C10 | **FR-SGO-015 / 016 / 017** 系统段 = 基座 + 追加段；零引用逐字等于基座 | spec §4；N-SGO-029 | 规范符合性 | 走查 `ref-context.ts` + `refContextSegment([]) === ''` 直测 |
| C11 | **FR-SGO-018 / 019** 只取 `valid ∧ !retired`；SW 唯一来源 = 回合载荷 | spec §4；N-SGO-008 | 规范符合性 | 走查 `isActiveRef` + SW 通道扫描（不得 import 面板引用表） |
| C12 | **FR-SGO-100~107** X-SGO-1~7 台账逐条「已发生 / 未发生」如实登记 + `modifiedRanges` 逐项 | spec §4；FR-SGO-107 | 规范符合性 | 台账 rows ↔ prose 计数对账 + 亲跑 `supersession`（39/0） |
| C13 | **FR-SGO-020~028** 范围读数单源（4 值）/ 唯一判定 / 越界拦 / 不引入新时机 | spec §4；N-SGO-028 | 规范符合性 | 亲跑 `law9` + `src/**` 第二声明扫描 |
| C14 | **FR-SGO-030~038** `--ref` 仅 `set-text` / schema 只增 / `risk` 不放宽 / 失配 EC / 失效可判 | spec §4；N-SGO-027 | 规范符合性 | 亲跑 `dom-ref-anchor` + 删闸注入 + `risk` 逐字段对照 |
| C15 | **FR-SGO-070~077** 法九四必判项 + 三段控制 + 真源切片 + `CHROMIUM_GATES === 9` | spec §4 | 规范符合性 | 亲跑 `law9`（12/0）+ 亲注入真源改判 ⇒ 必红 |
| C16 | **FR-SGO-080 / 083 / 084** 留痕扩范围读数**字段名** + 零值纪律 | spec §4；R-SGO-917 | 规范符合性 | 走查 `SCOPE_TRACE_FIELDS` + 留痕行正则 + law8 ⑤ |
| C17 | **FR-SGO-090~094** S0′ 全链机器化 + 「改写处数 ≤ 引用数」+ 双向反证 + 人工面如实登记 | spec §4；AC-SGO-013/014 | 规范符合性 | 亲跑 node `S0P-1~8`（24/0）+ Chromium `S0P-C1~C5`（65/0）+ 直接调用 `s0pProblems` 抽核 3 条 |
| C18 | **FR-SGO-110~116** 断言只增 / 受审集合 / 串行 / 新门禁登记 / 对账表 | spec §4；N-SGO-015/017 | 规范符合性 | 亲跑 `gate-integrity`（20/0）+ 亲跑 Chromium 串行 |
| C19 | **FR-SGO-120~125** 分列预算 / 五要素 / V3-VOL-3 三值 / EC-SGO-022 二态 / `pending-author-line` | spec §4 | 规范符合性 | `npm run build` 亲测 + `build-meta.json` 逐模块对账 |
| C20 | **NFR-SGO-001** 体积判定公式唯一（`record-only` cap） | spec §5 | 规范符合性 | 亲跑 `size-*` + ceiling 公式复算 |
| C21 | **NFR-SGO-004** 法八四面不退化（36 零降级） | spec §5 | 规范符合性 | 亲跑 `law8`（46/0，36 段零降级） |
| C22 | **NFR-SGO-005~014** 冻结面 / 零新载体 / fail-closed / 零每回合探测 / 零引用零漂移 / 读数单源 | spec §5；父 §13 | 规范符合性 | 亲跑 `insight-no-escalation` + `KIND_SET`/12 kind 抽取 |
| C23 | **EC-SGO-001~004 / 008 / 015~020** 逐条有实现且有反证（非静默） | spec §6 | 规范符合性 | 逐条映射到门禁用例 + 抽核 2 条直接调用 |

### 2.3 架构一致性（A）

| # | 审查对象 | 审查基准 | 审查维度 | 审查方法 |
|---|---------|---------|---------|---------|
| C24 | **ADR-SGO-001** 引用事实进回合（type-only 单声明 / 唯一构建点 / SW 唯一来源） | ADR-SGO-001 §1~§9 | 架构一致性 | 逐条对照数据流表 + 亲跑 `ref-context-in-turn` |
| C25 | **ADR-SGO-002** 读数单源 + 双轨（判据 = 读数 / 引导 = 提示词，判据不读提示词） | ADR-SGO-002 §1~§7 | 架构一致性 | 真源切片走查（`ref-scope.ts` 不得出现 `SYSTEM_PROMPT`） |
| C26 | **ADR-SGO-003** `--ref` 解析链 + plugin 侧条目包装（base 零 diff） | ADR-SGO-003 §1~§9 | 架构一致性 | 包扎线走查 + `git diff packages/web-cli-base` 亲跑 |
| C27 | **ADR-SGO-006** S0′ 双面机器化（样本单源 / 只加断言不加文件 / 人工面 `⏳`） | ADR-SGO-006 §1~§7 | 架构一致性 | 样本单源核对（node/Chromium 同一 mjs）+ 亲跑 |
| C28 | **ADR-SGO-007** 体积分列预算（A 计账 / B 不计账 / 优先落 SW 侧） | ADR-SGO-007 | 架构一致性 | `build-meta.json` 归因 + B 列归属核对 |
| C29 | **plan §5 文件影响对齐**：新增/修改/NOOP 与实测提交一致，NOOP 真零 diff | plan §5.1~§5.3 | 架构一致性 | `git diff --stat` 逐文件对账 + NOOP 清单 |
| C30 | 红线结构：三冻结面 / base 零 diff / 判定链零触碰 / 特权手势 / 12 kind / `KIND_SET` 40 | 父 §13；N-SGO-001~011 | 架构一致性 | 亲跑红线巡检 + sha 双锚 + 12 kind 零宿主 |
| C31 | 目录结构 / 模块落点（A 列 = `l1/**` + `sidepanel.ts`；B 列 = SW/工具面） | 项目宪法；ADR-SGO-002 §1 | 架构一致性 | 落点走查（读数模块不得被 SW import） |

### 2.4 测试质量（T）

| # | 审查对象 | 审查基准 | 审查维度 | 审查方法 |
|---|---------|---------|---------|---------|
| C32 | 3 枚新 node 门禁存在 ∧ 入 `gate-integrity` 受审集合 ∧ 导出 `JUDGEMENTS` | FR-SGO-077/115 | 测试质量 | 亲跑 `gate-integrity` + 文件存在性 |
| C33 | 判据非恒真：每条 `expectFailPattern` + 注入反证（禁「删属性充数 / 自我裁决」） | 本叶 tasks §7 review 策略 | 测试质量 | 逐文件走查注入段 + 亲注入抽核 |
| C34 | 边界 / 错误场景覆盖（EC 家族 / 零引用 / 失效 / 越界 / 单节点闸 0 与多命中） | spec §6 | 测试质量 | 用例↔EC 映射 + 直接调用抽核 |
| C35 | 断言有效性：真源切片读**生产模块**（不读自建常量 / `dist` 副本），值断言非空转 | tasks §7「禁纸面 / 禁假绿」 | 测试质量 | 走查切片常量 + 亲注入真源改判 ⇒ 必红 |
| C36 | 反证完整性：注入 ⇒ FAIL ⇒ **逐字节还原（sha256 相同）**，生产文件零改写 | FR-SGO-111；AC-SGO-018 | 测试质量 | 亲注入两处（读数真源 / 锚定闸）+ sha 还原 |
| C37 | 计数只增 / 保护段 / 门禁串行（`CHROMIUM_GATES === 9`，一次一个 Chromium） | N-SGO-015/016/017 | 测试质量 | 门禁读值对账 + 亲跑 Chromium 串行 |

---

## 3. 方法与红线口径（本策略固定的判定纪律）

| 纪律 | 口径 |
|---|---|
| **禁恒真** | 每条判据必须有可注入的违反面；注入后仍绿 ⇒ 视为缺陷（停机规则）。三段控制 `ok`/`violated`/`n/a` 逐态可达且 `n/a` 单独计数。 |
| **禁纸面** | 读数单源（第二声明 ⇒ FAIL）、载荷唯一构建点、`requestTurn(` 恰 2 必须以真源切片机核。 |
| **禁假绿** | S0′ 走生产模块真源；Chromium 面不得用合成读数冒充真机（分工须如实登记）。 |
| **禁放宽** | `risk` / `subcommandRisks` 逐字段对照 base；体积只许重登记 + 追加，不得放宽容差 / 删判据 / 静默降档。 |
| **亲注入纪律** | 注入生产真源 ⇒ 期望门禁红 ⇒ `git checkout` 还原 ⇒ sha256 前后相同 ⇒ 门禁恢复绿；`.sddu` 外**零残留**（`git status` 干净）。 |
| **如实登记** | 未发生取代 / 环境性 flake / 人工面未执行 / 越限二态一律显式登记，禁伪称 PASS / 伪称已确认。 |
| **红线终核** | 三冻结面（`content.js` / `pick-layer.js` / base）+ 判定链 + 特权手势 + 12 kind 零宿主 + `KIND_SET` 40 + `requestTurn(` 2，逐项亲核。 |

---

## 4. 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建（V5.5F-1 范围底座叶审查策略）：C1~C37（Q×5 / S×18 / A×8 / T×6）；四维度全覆盖 + 每 FR 块 ≥1；固定「亲注入 / 亲跑 / 红线终核 / 如实登记」纪律口径 | 2026-09-24 | SDDU Review Agent |
