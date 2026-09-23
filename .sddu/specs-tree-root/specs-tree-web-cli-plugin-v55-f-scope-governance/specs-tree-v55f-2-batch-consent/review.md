# 审查策略：specs-tree-v55f-2-batch-consent（V5.5F-2 任务级批量授权）

> **文档定位**: SDDU 审查策略 — 指导 review Agent 执行自主审查的 C1~C36 清单与方法；**审查结果见 `review-report.md`**（本文件 = Feature 级固定产物，定义一次；`review-report.md` 每轮独立产出）
> **前置依赖**: 本叶 `spec.md` v1.0（承载父 FR ≈21 条切片 / 11 NFR 面 / 10 EC 面 / 12 AC 锚点）· 本叶 `plan.md` v1.0 · 父 `../plan.md` + `ADR-SGO-004/005`（另读 006/007/008 做落点判定）· 本叶 `tasks.md`/`tasks.json` v1.0（16 任务 / 3 波）· 本叶 `build.md` v2.0（R1+R2 全叶收口，16/16）· 叶1 `specs-tree-v55f-1-ref-context-and-anchor`（**validated**，硬依赖）
> **创建人**: SDDU Review Agent
> **创建时间**: 2026-09-24
> **版本**: v1.0
> **更新人**: SDDU Review Agent
> **更新时间**: 2026-09-24
> **更新说明**: 初始创建（V5.5F-2 批量授权叶审查策略：**C1~C36** 自主清单；四维度全覆盖；每个承载 FR 块 ≥1 Cx；明确「亲注入 / 亲跑」方法与红线终核口径）

---

## 0. 审查对象与边界

| 项 | 值 |
|---|---|
| Feature | `specs-tree-v55f-2-batch-consent`（V5.5F-2 任务级批量授权：写入计划 + 计划指纹 + 一次用户手势 + 计划外逐条回落 + 零明文 + 可中止 + 特权不入批 + WIDEN 二择；父 `specs-tree-web-cli-plugin-v55-f-scope-governance`；**末叶**） |
| 分支 / HEAD | `feature/web-cli-plugin` / `8ebd533`（R1 `0492e89`（W1+W2）+ R1 build 记录 `37e4e28` + R2 `8ebd533`（W3），**16/16 completed**） |
| 被审成品 | `dist/sidepanel.js` = **591,946 B**（A 列，登记基线同源）· `dist/background.js` = **1,635,675 B**（B 列，不计账）· `dist/content.js` **177,076 B** / sha `52a82620…` · `dist/pick-layer.js` **34,358 B** / sha `77796bab…`（逐字节冻结） |
| 审查方式 | **静态分析为主**；按编排任务书点名做「亲注入 / 亲跑」以证判据承重；注入一律**逐字节还原**（`git checkout` + sha256 复核）且 `.sddu` 外零残留 |
| 不负责 | 动态验证场景矩阵 / 独立探针复跑（属 `@sddu-validate`）；本 Agent 只做「读 + 亲注入反证 + 现成门禁亲跑」 |

**自主提取来源**：`spec.md` §4（承载父 FR 切片）/§5（NFR）/§6（EC）/§7（AC）/§9（风险 R-SGO-001 等）+ `plan.md` §2（数据流 + X-SGO 处置）/§3~§4（方案取舍）/§5（文件影响）/§6（风险）/§8（体积预算）+ `build.md` R1 §1~§8 + R2 §9（文件变更 / 门禁终值 / 反证摘要 / 偏差登记）+ 实际产物（`src/**`、`test/**`、`docs/v4-supersession-ledger.json`、`dist/build-meta.json`）。

---

## 1. 审查概要

| 维度 | 数值 |
|------|:--:|
| 审查项总数（Cx） | **36** |
| 维度覆盖 | 代码质量（Q×6）· 规范符合性（S×18）· 架构一致性（A×6）· 测试质量（T×6） |
| 质量门槛 | 本叶 §4 承载的 **6 个父 FR 块**（BATCH 040~050 / WIDEN 060~063 / TRACE 081·082 / S0′ 093 / SUPERSEDE 103·105·107 / GATE+VOL）+ NFR/EC/AC 面**每块 ≥1 Cx**；四维度各 ≥1 条 |

---

## 2. 自主审查清单（C1~C36）

> 四维度 = 代码质量（Q）/ 规范符合性（S）/ 架构一致性（A）/ 测试质量（T）。

### 2.1 代码质量（Q）

| # | 审查对象 | 审查基准 | 审查维度 | 审查方法 |
|---|---------|---------|---------|---------|
| C1 | `background/batch-plan.ts`：纯逻辑 / 零 `chrome.*` / 职责切分（`buildPlan` / `planFingerprint` / `admitEntry` / holder）与命名可读性 | plan §5.1；ADR-SGO-004 §1 | 代码质量 | 逐行走查 + 职责切分核对（5 组函数各自单职责） |
| C2 | `batch-plan.ts` 指纹与准入：canonical 逐字节 / 键集准入（非总哈希）/ 漂移重校验 / fail-closed 方向 | ADR-SGO-004 §3；R-SGO-906/916 | 代码质量 | 逐行走查 + 直接调用 `planEntryKey` / `admitEntry` 抽核 |
| C3 | `security/confirm.ts` 计划感知桥：`plan` 缺省 ⇒ 单条路径逐字不变；`admitted`/`rejected`/`drift`/`plan-consent` 分支清晰；审计只记机器事实 | FR-SGO-046/049/050 | 代码质量 | 走查 §134~§218 + 单条路径零回归核对 |
| C4 | `cards/auth.ts` 计划行：`textContent`-only（零 DOM 属性）/ `maskRefDigest` 单一口径 / 8 行上限 + 诚实计数行 + 中止交代 | FR-SGO-050/047；R-SGO-914 | 代码质量 | 走查 `authPlanRows` / `planBlock` / `patchAuthCard` + 掩码单源核对 |
| C5 | `sidepanel.ts` `handleConfirmRequest` / `presentScopeWidenAsk` / `emitConfirmCard`：具名提级（listener 与 seam **同一生产路径**）/ 扩围单一职责 | plan §5.1；ADR-SGO-005 §1 | 代码质量 | 走查提级前后 diff + seam 路径核对 |
| C6 | 硬编码值单源（`BATCH_ACTION_TYPE` / `BATCH_MIN_ENTRIES` / `SCOPE_WIDEN_*` / 留痕字段名）+ 无死常量 / 无重复声明 | 项目宪法；N-SGO-028 | 代码质量 | `src/**` 字面量分布扫描 + 死导出扫描 |

### 2.2 规范符合性（S）

| # | 审查对象 | 审查基准 | 审查维度 | 审查方法 |
|---|---------|---------|---------|---------|
| C7 | **FR-SGO-040** 计划生成路径（系统聚合 / 单条消息 / 跨轮不累积 / `N≥2`·`N==1`·`N==0` 三分支 / 空计划不空弹） | spec §4；ADR-SGO-004 §1；EC-SGO-013 | 规范符合性 | 走查 `buildPlan` / `planMode` + 亲跑 `BC-1` |
| C8 | **FR-SGO-041** + N-SGO-009/010 载体零新增（type-only `question.plan` / `KIND_SET` 40 / 12 kind / 零宿主） | spec §4；父 NG-SGO-007~009 | 规范符合性 | 亲跑 `host-registry` + `KIND_SET` 抽取 = 40 + `messaging.ts` 抽取计数 |
| C9 | **FR-SGO-042** 计划指纹 = 目标集合 ∧ 动作类型 ∧ 文本对；放行仅限指纹内 | spec §4；R-SGO-906 | 规范符合性 | 亲跑 `BC-2`（含归一化反证）+ `planEntryKey` 四元组抽核 |
| C10 | **FR-SGO-043** 一次**真实用户手势**（不 AI 代答 / 代填 / 自动放行 / 自动展开） | spec §4；N-SGO-025；R-SGO-001 | 规范符合性 | **亲注入** AI 侧审批写入点 ⇒ `RL-06 扩批量` 必红 + `confirm.ts` 唯一写入点核对 |
| C11 | **FR-SGO-044** 计划外第 N+1 条**回落逐条确认**（一次点击不得放开无限写） | spec §4；EC-SGO-012 | 规范符合性 | 亲跑 `BC-3` + **亲注入** `admitEntry` 放行计划外 ⇒ 必红 + `confirm.ts` fallback 路径走查 |
| C12 | **FR-SGO-045** 特权 op 恒不入批（只识别 `dom set-text`；`tierOf` 单源不改；SW 永不 `.request(`） | spec §4；N-SGO-005；NFR-SGO-002 | 规范符合性 | 亲跑 `capability-wiring` / `op-three-tier` + **亲注入** `op.authorize` 入计划模块 ⇒ 必红 |
| C13 | **FR-SGO-046 / 050** 逐条审计保留零明文（正文/译文不进 payload 值 / digest / 审计值 / DOM 属性；凭据形掩码） | spec §4；N-SGO-026；R-SGO-905/914 | 规范符合性 | 亲跑 `law8` ⑨（52/0）+ 亲跑 `BC-6` + `DIGEST_FIELDS` 白名单核对 |
| C14 | **FR-SGO-047** 中途可中止 + 部分完成如实留痕 + `cancelled` 终态语义保持 | spec §4；EC-SGO-011 | 规范符合性 | 亲跑 `BC-7` + `authFixedText` 6 终态抽核 + `markCancelled` 状态机走查 |
| C15 | **FR-SGO-048** 非批次写入仍逐条批准（单条路径逐字不变；`permission.ts` 理由串不变） | spec §4 | 规范符合性 | `plan` 缺省路径走查 + `ask-auth` 78/0 亲跑 |
| C16 | **FR-SGO-049 / 103** 红线⑥ 扩覆盖批量（`RL-06` / OT-⑩ 扩批量变体注入必红；`law8` 不降级；`auth` 6 终态保持） | spec §4；AC-SGO-005 | 规范符合性 | 亲跑 `supersession`（RL-06 扩批量）+ `op-three-tier`（OT-⑩）+ 台账 `redlineRemap[]` 逐条核对 |
| C17 | **FR-SGO-060~063** WIDEN 二择：`out-of-scope-authorized` **唯一写入面 = 用户点击**；转值单源；拒绝/取消零死端；复用既有 `askuser`（`MAX_OPEN_ASKS = 2` / `ASK_CANCEL_REASONS` 4） | spec §4；N-SGO-012；R-SGO-907 | 规范符合性 | 亲跑 `law9` L9-9 + `no-dead-end` ND-10 + **亲注入** 去「整页」守卫 ⇒ 必红 |
| C18 | **FR-SGO-081 / 082** 批量留痕（指纹摘要 + 条目数 + 手势事实 + 逐条结果计数，零明文） | spec §4；R-SGO-917 | 规范符合性 | 走查 `batchTraceLine` + 亲跑 `law8` ⑨-④ / `s0` S0P-B3 留痕格式判据 |
| C19 | **FR-SGO-093** S0′ 批量覆盖断言（一次手势覆盖计划内全部 + 计划外回落 + 中止可判；**只加断言不加文件**） | spec §4；AC-SGO-013/014 | 规范符合性 | 亲跑 node `s0-self-driven-chain`（S0P-B1~B3）+ Chromium `s0-self-driven`（S0C-11）双面 |
| C20 | **FR-SGO-105 / 107** 台账：X-SGO-4 已发生（`redlineRemap[]` 扩断言）+ X-SGO-6 读数承载 + X-SGO-7 未发生；`modifiedRanges` 逐项 | spec §4；AC-SGO-004 | 规范符合性 | 走查 `xSgoLedgerLeaf2` + 亲跑 `supersession` 叶2 台账判据 |
| C21 | **NFR-SGO-004** 法八四面零明文不退化（36 零降级；批量面只增） | spec §5 | 规范符合性 | 亲跑 `law8` **52/0**（⑧⑨ 段逐条 + 反证） |
| C22 | **NFR-SGO-006 / 007 / 013 / 014** fail-closed / 零新增载体 / 门禁串行 / 扩展点固定 | spec §5 | 规范符合性 | `gate-integrity` 亲跑 + `CHROMIUM_GATES === 9` + 逐个人工串行 |
| C23 | **EC-SGO-005 / 006 / 009 / 010 / 012 / 013 / 014 / 021 / 022** 逐条有实现且非静默 | spec §6 | 规范符合性 | 逐条映射到门禁用例 + 直接抽核 3 条（漂移 / 中止 / 计划外） |
| C24 | **AC-SGO-014 / 024** 完成交代如实（清单条数 == 实际写入处数）+ 分列预算 + 逐叶重登记 | spec §7 | 规范符合性 | 走查 `BATCH_RENDER_MAX` 诚实计数行 + 亲跑 `size-*`（五要素同源） |

### 2.3 架构一致性（A）

| # | 审查对象 | 审查基准 | 审查维度 | 审查方法 |
|---|---------|---------|---------|---------|
| C25 | **ADR-SGO-004**（系统聚合 / 逐字节指纹 / 一次手势 / 特权不入批 / 零明文 / 计划 holder 单源）逐条落地 | ADR-SGO-004 §1~§11 | 架构一致性 | 逐条对照产物 + 单例 `batchConsent` 取用点核对 |
| C26 | **ADR-SGO-005**（扩围征询：唯一写入面 / 转值 / 留痕）与 **ADR-SGO-006**（S0′ 双面机器化：样本单源 / 只加断言）落地 | ADR-SGO-005/006 | 架构一致性 | 走查 `ref-scope.ts` 单源 + `s0-chain.mjs` 样本单源 + `CHROMIUM_GATES` 不动 |
| C27 | **ADR-SGO-007** 体积分列预算（A 列 3.5~5.5 KB / +15% 4.0~6.3 KB）+ 逐叶重登记 + EC-SGO-022 二态诚实性 | ADR-SGO-007；FR-SGO-120~125 | 架构一致性 | `npm run build` 亲测 + `build-meta.json` 逐模块对账 + 五要素/三值核对 |
| C28 | 红线结构（三冻结面 / base 零 diff / 判定链零触碰 / `KIND_SET` 40 / `requestTurn(` 恰 2 / 12 kind 零宿主 / 特权恒 gesture） | 父 §13；N-SGO-001~011 | 架构一致性 | sha256 双锚 + `git diff` 零行 + 静态计数 + `op-wiring`/`host-registry` 亲跑 |
| C29 | `plan.md` §5 文件影响对齐 + NOOP 清单真零 diff（base / content / manifest / `policy.ts` / `auto-authorize.ts` / `op-table.ts` / `ref-scope.ts` 四值单源 / `chat-runner.ts`） | plan §5.1~§5.3 | 架构一致性 | `git diff --stat R1^..HEAD` 对账 + NOOP 逐项零 diff 核对 |
| C30 | 目录 / 模块落点（A 列面板 / B 列 SW；读数单列不破：SW 不 import 读数模块；`fillAuthFixed` 复用不新增宿主） | 项目宪法；ADR-SGO-002 §1 / ADR-SGO-004 §2 | 架构一致性 | `src/**` import 图扫描 + bundle 分列归因 |

### 2.4 测试质量（T）

| # | 审查对象 | 审查基准 | 审查维度 | 审查方法 |
|---|---------|---------|---------|---------|
| C31 | `test/batch-consent.test.ts`（BC-1~7）：覆盖计划/指纹/准入/回落/漂移/零明文/中止 + 每条 `expectFailPattern` 非占位 + 真源切片 | tasks §review 策略 | 测试质量 | 逐条读用例 + 亲跑 7/0 + 抽核 BC-2/BC-3 注入段 |
| C32 | RL-06 / OT-⑩ / 特权不入批**扩批量**判据是否存在且可承重（AI 模块列表 / 特权标识 / `.request(` 计数） | FR-SGO-049/103 | 测试质量 | 亲跑三文件 + **亲注入** AI 侧 / 计划模块 / 档位三处 |
| C33 | `law8` ⑨ / `no-dead-end` ND-10 / S0′ 双面：断言只增（计数不减）+ 反证段存在 | N-SGO-015/016 | 测试质量 | 亲跑 52/0 · 53/0 · 70/0 + 计数对账 |
| C34 | `gate-integrity`：新 node 门禁入受审集合（下界只增）+ `CHROMIUM_GATES === 9` 不动 + 目录扫描 | FR-SGO-077/115 | 测试质量 | 亲跑 20/0 + `V55F2_NODE_GATE_FILES` / `V55F2_W3_AUDITED_FILES` 核对 |
| C35 | 体积登记判据：`Σ rows + glue == Δ` / 三值同源 / 越 1 B 即 FAIL / 最新一轮 rows 定向 | FR-SGO-120~125 | 测试质量 | 亲跑 `size-*` + `size-ruling-vol3` 逐值复算（591,946 / 621,543 / 六项闭环） |
| C36 | 判据非恒真（注入 ⇒ FAIL ⇒ 逐字节还原 sha 相同）+ 反证完整性 | FR-SGO-111；AC-SGO-018 | 测试质量 | **亲注入 5 处**（AI 代答 / 特权入批 / 归一化 / `admitEntry` 放行 / WIDEN 去守卫）+ sha 前后复核 |

---

## 3. 结论判定口径

| 条件 | 要求 |
|------|------|
| 阻塞问题 | 0 个 |
| 改进项（I） | < 5 个 |
| 规范符合率 | 100% |

- **✅ 通过** — 代码质量合格，可进入 validate。
- **⚠️ 有条件通过** — 有改进项但不阻塞。
- **❌ 不通过** — 存在阻塞问题（红线⑥ 被侵蚀 / 特权入批 / 零明文破 / 载体新增 / 判据恒真 / base 或冻结面被撞），需重新实现。

> 本叶**唯一红线级风险 R-SGO-001**（批量授权被误用为「AI 代答 consent」的合法外衣）为审查最高优先：其判据（RL-06 扩批量 + WIDEN 唯一写入面）**必须亲注入验证承重**，不以「门禁绿」为唯一依据。

---

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建（V5.5F-2 批量授权叶审查策略）：**C1~C36** 自主清单（Q×6 / S×18 / A×6 / T×6）；四维度全覆盖；6 个父 FR 块每块 ≥1 Cx；明确「亲注入 / 亲跑」方法与红线⑥终核口径 | 2026-09-24 | SDDU Review Agent |
