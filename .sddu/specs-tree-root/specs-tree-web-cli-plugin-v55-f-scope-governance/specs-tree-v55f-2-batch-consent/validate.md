# 验证策略：specs-tree-v55f-2-batch-consent（V5.5F-2 任务级批量授权）

> **文档定位**: SDDU 验证策略 — 定义本叶 V1~V9 验证场景与方法；逐项**实测**结果见 `validate-report.md`
> **前置依赖**: 本叶 `spec.md` v1.0（承载父 FR ≈21 条切片 / 11 NFR 面 / 10 EC 面 / 12 AC 锚点）+ `review-report.md` v1.0（R1 结论 **✅ 通过**，36 Cx / 0 BLOCK / 4 I / 5 O；对象 HEAD `8ebd533`，I-01~I-04 于 `c0bac99` 微修闭环）+ 本叶 `plan.md` v1.0 + 父 `plan.md` + ADR-SGO-004/005/006/007 + 叶1 `specs-tree-v55f-1-ref-context-and-anchor`（**validated**）
> **创建人**: SDDU Validate Agent
> **创建时间**: 2026-09-24
> **版本**: v1.0
> **更新人**: SDDU Validate Agent
> **更新时间**: 2026-09-24
> **更新说明**: 初始创建（对抗优先的 V1~V9 场景矩阵；策略先于报告产出）

---

## 1. 验证概要

| 维度 | 目标 | 达标线 |
|------|------|:--:|
| FR 测试覆盖 | 本叶承载的父 FR 切片逐条 ≥ 1 个 Vx 且实测通过 | 100% |
| NFR 测试覆盖 | 本叶相关 NFR 面逐条有实测证据或如实标注 | ≥ 80% |
| EC 边界覆盖 | 10 EC 逐条有实测证据或如实标注（本叶子集） | ≥ 80% |
| 构建 | `npm run build` 退出码 0 ∧ 冻结面逐字节可复现 | 退出码 0 |
| 对抗红绿 | 注入/伪造必须**判红**，逐字节还原必须**判绿**（非恒真） | 0 空转 |
| 严重漂移 | 0 项 | 0 |
| 阻塞问题 | 0 项 | 0 |
| 人工面 | M2 连点疲劳体感 / M3 批量计划卡可读性与可否决性 = `⏳`（不冒充 PASS） | 如实 |

**Feature 类型判定**：**代码类**（`src/**` + `test/**` + 构建产物 + Chromium 真机门禁）⇒ 全五维度验证（测试覆盖 / 接口数据 / 构建 / 性能边界 / 漂移检测）。

**核心断言（编排点名）**：S0′ 批量段 **B1 一次手势覆盖计划内全部 + 计划外逐条回落**、**B2 改写处数 ≤ 引用数（授权例外）**、**B3 二择 + 中止可判** 双面复刻；安全边界 **AI 代答必红 / 特权入批必红 / 一次手势承重 / 指纹漂移拒**；扩围二择 **整页 ⇒ `out-of-scope-authorized` + 留痕 + confirm 卡 / 拒绝取消 ⇒ fail-closed 零死端**；**fallback 分支（I-02 微修后）文案上屏 + planGate 不推进**。

---

## 2. 自主验证场景（V1~V9）

**验证对象来源**：
- `spec.md`：FR-SGO-040~050 / 060~063 / 081 / 082 / 093 / 103 / 105 / 107 + 11 NFR + 10 EC + 12 AC
- `build.md`（R1+R2+R2-fix）与 `review-report.md` 中的**声明值**（门禁计数、红线 sha、体积五要素、S0′ 批量段双面读数）
- 实际产物：`src/background/batch-plan.ts`、`src/security/confirm.ts`、`src/ui/sidepanel/l1/ref-scope.ts`、`src/ui/sidepanel/sidepanel.ts`、`src/ui/sidepanel/cards/auth.ts` + `dist/**` + `test/**` 门禁

**对抗优先原则**：每个「声明」都要有一条**可判红**的反证（删掉机制 ⇒ 同一判据必须 FAIL）；每条红线 / 体积面都要**独立复算**（不复用仓库测试的断言，自写探针）。

| # | 验证对象 | 验证步骤 | 预期结果 | 验证维度 | 验证方法 |
|---|---------|---------|---------|---------|---------|
| **V1** | 门禁全量复跑 + 计数对账（AC-SGO-017~022 / FR-SGO-103 / 105 / 107） | ① `npm test`（node 全量）；② 逐门禁单独复跑取计（supersession 42 / batch-consent 7 / op-three-tier 11 / capability-wiring 11 / host-registry 11 / gate-integrity 22 / s0-self-driven-chain 27 / law9 14 / ref-context-in-turn 9 / op-wiring 14）；③ 直接相关 / 保护段 Chromium 串行（s0-self-driven 70 / law8 52 / dead-end 53 / stream 76 / auth-chip 37 / ask-auth 78 / journey 171 / binding 192）；④ 与 build/review 声明值对账 | 全绿 + 计数**只增**（基线 1394） | 测试覆盖 + 构建 | 串行复跑（Chromium 严格串行）+ 计数对账 |
| **V2** | **S0′ 批量段双面独立复刻**（FR-SGO-093 / AC-SGO-013 / 014 / 015 / 016） | ① node 面：亲跑 `s0-self-driven-chain` 的 `S0P-B1~B3`（真源切片 = `batch-plan.ts`，2 in-scope + 1 越界 ⇒ 计划恰 2 / 一次手势放行 2 / 计划外回落 1 / 中止判 `cancelled`）+ 5 条反证；② Chromium 面：亲跑 `s0-self-driven.mjs` 的 `S0C-11`/`S0P-C6`（一条 `confirm-request{plan}` ⇒ 单张 auth 卡 N 行 ∧ 一次手势 ⇒ `batch.gesture=user ∧ batch.results=N/N` ∧ 扩围二择走既有 `askuser`）；③ 样本单源 `s0-chain.mjs` | **B1** 一次手势覆盖计划内全部 + 计划外逐条回落；**B2** 改写 ≤ 引用（授权例外 ⇒ `out-of-scope-authorized`）；**B3** 二择 + 中止可判 | 测试覆盖 + 接口数据 | 双面亲跑（node + Chromium 真面板）+ 反证段核对 |
| **V3** | **安全边界行为级**（FR-SGO-042 / 043 / 044 / 045 / 049 / AC-SGO-005 / 015 / 016） | ① 自写探针驱动 `createConfirmBridge` + `createBatchConsent`：一次手势承重（计划内二次写恰 1 卡零再弹）；② 指纹绑定（批准后同目标改译文 / 尾随空格 ⇒ 回落）；③ 漂移拒（批准后 refs 变 ⇒ `drift` / 目标不可解析 ⇒ 出普通单条卡非静默放行）；④ 特权不入批（`op.authorize` 不入计划 / 桥不返回 admitted）；⑤ **注入 A**（AI 侧 `markApproved(` ⇒ RL-06 必红）+ **注入 B**（`batch-plan.ts` 出现特权标识 ⇒ 特权不入批必红） | 一次手势承重、指纹不可归一化绕过、漂移显式失败、特权恒不入批、注入必红 | 接口数据 + 测试覆盖 | 自写探针（直接驱动生产编译模块）+ 源码注入（逐字节还原） |
| **V4** | **扩围二择行为级**（FR-SGO-060~063 / 081 / 082 / EC-SGO-005 / 006 / AC-SGO-008 / 009） | ① 自写探针：`scopeReading`（整页确认 ⇒ `out-of-scope-authorized` / 未确认 ⇒ `out-of-scope-unauthorized` / 范围内 ⇒ `in-scope` / 无引用 ⇒ `no-ref`）；`scopeReadingTrace` 机器格式；`isWidenWholePage`（只认「整页」字面量）；② 唯一写入面：`scopeWidenAuthorized = true` 全仓**恰 1 处**（注释不计）∧ 被 `isWidenWholePage(choice)` 守卫 ∧ AI/SW 侧零写入面；③ Chromium `ND-10`：整页 ⇒ 转值 + 留痕 + confirm 卡；拒绝 ⇒ fail-closed 零死端；未确认 ⇒ 必红 | 正向路径可达（转值 + 留痕）；拒绝 / 取消 fail-closed 零死端 | 接口数据 + 测试覆盖 | 自写探针（生产编译模块）+ Chromium 真机串行 |
| **V5** | **fallback 分支行为级（I-02 微修后）**（FR-SGO-044 / EC-SGO-012 / review I-02） | 自写探针：计划存在 ∧ 计划外写（目标在引用集合内但不在已批准计划）⇒ ① 卡不挂计划渲染数据；② `BATCH_FALLBACK_TEXT` 文案上屏（reason 含回落文案）；③ 同意 **不推进** 整批审批（`state` 仍 `pending`）；④ 之后计划内首次写仍出计划卡（fallback 未消耗批次授权） | 计划外单条回落路径文案上屏、planGate 不推进、判据本体不改 | 接口数据 | 自写探针（`createConfirmBridge` fallback 分支） |
| **V6** | **注入抽验（≥2）**（FR-SGO-103 / 111 / AC-SGO-018） | ① **注入 A**：AI 侧出现计划审批写入点 ⇒ `supersession` 判红；② **注入 B**：特权 op 标识进入计划模块 ⇒ `capability-wiring` 判红；③ **注入 C**：`admitEntry` 计划外回落改 `admitted`（行为级，重编译）⇒ `batch-consent` BC-3 判红；每处注入后 `git checkout` 逐字节还原（sha256 前后相同）⇒ 复绿 | 注入全红且逐字节可还原；`.sddu` 外零残留 | 测试覆盖 + 接口数据 | 源码注入 + `sha256sum` 复核 + 复绿回执 |
| **V7** | **红线 / 冻结面 / 载体终核**（FR-SGO-041 / 045 / 049 / 103 / AC-SGO-005 / 006 / 023~025） | ① `content.js` 177,076 / sha `52a82620…`；② `pick-layer.js` 34,358 / sha `77796bab…`；③ base / manifest / `content src` / `policy.ts` / `auto-authorize.ts` / `op-table.ts` 对实现前基线零 diff；④ `KIND_SET` 40（`plan` 非 kind）；⑤ `requestTurn(` 调用点恰 2；⑥ `CARD_TYPES` 12 ∧ `REGISTERED_STRUCTURAL_HOSTS === []` ∧ `MAX_OPEN_ASKS` 2 ∧ `ASK_CANCEL_REASONS` 4；⑦ 特权 op 恰 2 恒 `gesture` | 逐字节命中 / 零 diff；零新载体 | 漂移检测 + 构建 | 自写探针（自算 sha256 + `git diff` + 生产模块导入） |
| **V8** | **体积五要素 + 两叶 Σ**（NFR-SGO-001 / AC-SGO-024 / EC-SGO-022 / FR-SGO-120~125） | ① `SIDEPANEL_BASELINE_BYTES == 实测产物` = 591,946；② 生效上限 = `floor(591,946×1.05)` = 621,543（未越）；③ 档位 614,400 / 绝对上限 `×1.10` = 675,840（未跨）；④ `authorConfirmation = pending-author-line`；⑤ 两叶 Σ = 叶1 +7,109 + 叶2 +6,214 = **+13,323** 落在正常口径 9.5~14.5 KB；⑥ metafile 逐模块 Σ +6,214 == 登记增量 | 五要素同源；两叶 Σ 在预算内；未触发 EC 任分支 | 性能边界 + 构建 | 自写探针（独立复算式 + 产物 stat + 归因核对） |
| **V9** | **漂移检测 + AC 映射**（AC-SGO-004 / 010 / 026） | ① `spec.md` 未被修改（零规格漂移）；② worktree 干净（`.sddu` 外零残留）；③ 孤立代码扫描（新增 `batch-plan.ts` 有 FR 归属）；④ 需求缺失扫描（21 条 FR 切片逐条有承接）；⑤ AC 逐条 → Vx 映射闭合 | 0 漂移；规格未动；无孤立 / 无缺失 | 漂移检测 | `git diff` + 文件对照 + 映射表 |

> **质量门槛核对**：本叶承载的父 FR 切片 21 条逐条落在 V1~V9（见 §3）；相关维度 5 个（测试覆盖 / 接口数据 / 构建 / 性能边界 / 漂移检测）各 ≥ 1 条 Vx；Vx = 9。**说明**：本策略按**维度聚簇**设计（每个 Vx 是一族对抗场景，内含逐条 FR/AC 子断言，实测见 `validate-report.md` 逐项表）。

---

## 3. FR / NFR / EC / AC → Vx 映射（覆盖账）

### 3.1 FR（本叶承载的父 FR 切片）

| 父 FR | 承接点 | 主判 Vx |
|---|---|---|
| FR-SGO-040 写入计划（N 处 目标 + 原文 → 译文）→ 一次 consent | `buildPlan` / `planMode` 三分支 | V2、V3 |
| FR-SGO-041 复用 `auth` kind + type-only 字段（零新增载体） | `KIND_SET` 40 / 12 kind / 零宿主 | V7 |
| FR-SGO-042 计划指纹（目标集合 ∧ 动作类型 ∧ 文本对） | `planEntryKey` / `planFingerprint` | V3 |
| FR-SGO-043 一次真实用户手势（不代答 / 代填 / 自动放行 / 自动展开） | `confirm.ts` 唯一写入面 / 注入 A | V3、V6 |
| FR-SGO-044 计划外第 N+1 条回落逐条确认 | `admitEntry` fallback / `BATCH_FALLBACK_TEXT` | V3、V5 |
| FR-SGO-045 特权 op 恒不入批 | `batch-plan.ts` 只识别 `dom set-text` / 注入 B | V3、V6、V7 |
| FR-SGO-046 逐条审计零明文（工具 / 结果 / 计数 / 指纹摘要 / 字段名） | 审计只记 `fingerprintDigest` / `batchEntries` | V2、V3 |
| FR-SGO-047 中途可中止 + 部分完成如实 + `cancelled` 终态 | `markCancelled` / `AUTH_PLAN_ABORT_TEXT` | V2 |
| FR-SGO-048 非批次仍逐条批准（单条路径逐字不变） | `plan` 缺省 ⇒ 既有 `summary` 路径 | V1（ask-auth 78 / stream 76）、V3 |
| FR-SGO-049 红线⑥ 判据扩覆盖批量 | `supersession` RL-06 扩批量 / 注入 A | V3、V6 |
| FR-SGO-050 批量卡文案 = 静态模板；正文仅 UI 渲染；凭据形掩码 | `authPlanRows` / `maskRefDigest` | V2（law8 ⑨ / S0P-C6）、V3 |
| FR-SGO-060 越界写前 `ask-user` 二择 | `SCOPE_WIDEN_OPTIONS` / `presentScopeWidenAsk` | V4 |
| FR-SGO-061 选「整页」⇒ 读数转 `out-of-scope-authorized` + 入留痕 | 唯一写入面 / `scopeReadingTrace` | V4 |
| FR-SGO-062 拒答零死端（`no-dead-end` 只增） | ND-10 | V1、V4 |
| FR-SGO-063 二择复用既有机制（`MAX_OPEN_ASKS` / `ASK_CANCEL_REASONS` 语义保持） | `askuser` choice / 常量 | V4、V7 |
| FR-SGO-081 扩围事实入留痕（可判） | `scope.authorized=user` | V2（S0P-B）、V4 |
| FR-SGO-082 批量计划留痕（指纹摘要 + 条目数 + 手势 + 逐条结果计数） | `batchTraceLine` | V2（S0P-C6）、V3 |
| FR-SGO-093 S0′ 批量覆盖断言三项 + 各自反证 | `s0pBProblems` / `S0P_B_ITEMS` | V2 |
| FR-SGO-103 X-SGO-4 等价重锚（RL-06 / OT-⑩ 扩批量变体并注入必红） | `redlineRemap[]` / 扩断言 | V6、V7 |
| FR-SGO-105 X-SGO-6 优先以读数承载（不新增终态字面量） | 读数承载 + 台账 | V7、V9 |
| FR-SGO-107 未发生取代如实登记；台账与重锚同轮 | `xSgoLedgerLeaf2.rows` | V9 |

### 3.2 NFR（本叶相关）

| NFR | 判据 | 主判 Vx |
|---|---|---|
| NFR-SGO-001 体积 ≤ 生效上限（公式唯一） | 591,946 ≤ 621,543 | V8 |
| NFR-SGO-002 特权 op 恒 gesture；批量不触达 | 特权恰 2 恒 gesture | V7 |
| NFR-SGO-003 consent 不得被 AI 代答（含批量变体） | 注入 A 必红 | V3、V6 |
| NFR-SGO-004 法八四面零明文不退化 | law8 52/0（零降级） | V1、V2 |
| NFR-SGO-006 判定一律 fail-closed | 漂移 / 拒绝 / 取消逐条非静默 | V3、V4 |
| NFR-SGO-007 零新增载体 | `KIND_SET` 40 / 12 kind / 零宿主 | V7 |
| NFR-SGO-011 留痕可判且零值 | 留痕机器格式（批量 / 范围） | V2、V4 |
| NFR-SGO-012 不卡正当全页任务；不跳走 | 整页路径可达 + confirm 卡 | V4 |
| NFR-SGO-013 门禁串行 / 无新依赖 | 串行复跑 | V1 |
| NFR-SGO-014 扩展点固定（指纹 + type-only 字段 + `auth` 静态模板） | `plan` 与 `payload` 同级 | V2、V7 |

### 3.3 EC（本叶子集）

| EC | 判据 | Vx |
|---|---|---|
| EC-SGO-005 | 要求整页 + 存在引用 ⇒ 二择；选整页 ⇒ `out-of-scope-authorized` + 入留痕 | V4 |
| EC-SGO-006 | 拒答 / 取消二择 ⇒ 回范围内或取消；零死端 | V4 |
| EC-SGO-009 | 计划中途失败 ⇒ 如实报失败 + 部分完成留痕 | V2（BC-7 / 中止） |
| EC-SGO-010 | 计划被拒 ⇒ 不执行 + 留痕记拒绝事实 + 零死端 | V3、V5 |
| EC-SGO-011 | 计划中止 ⇒ `cancelled` 终态 + 部分完成留痕 + 零死端 | V2 |
| EC-SGO-012 | 计划外第 N+1 条 ⇒ 回落逐条确认 | V3、V5 |
| EC-SGO-013 | 空计划不空弹；单条不因批量改变语义 | V3（planMode 三分支） |
| EC-SGO-014 | 指纹批准前漂移 ⇒ 显式失败 + 重新出计划 | V3 |
| EC-SGO-021 | `KL-N-10` flake ⇒ 隔离复跑 ≥2 + 如实记录 | V1 |
| EC-SGO-022 | 体积越限 ⇒ 重登记基线 / 显式路径 + 作者一行 | V8 |

### 3.4 AC（12 锚点）

| 父 AC | 本叶判据 | Vx |
|---|---|---|
| AC-SGO-004 | X-SGO-4 / 6 / 7 等价重锚（含「未发生」登记） | V9 |
| AC-SGO-005 | 红线⑥ 扩批量变体注入必红 | V3、V6 |
| AC-SGO-006 | 零新增载体 | V7 |
| AC-SGO-008 | 扩大范围正向路径（二择可达 + 转值 + 入留痕） | V4 |
| AC-SGO-009 | 拒绝扩大零死端 | V1、V4 |
| AC-SGO-010 | 留痕含范围读数且零值（含批量留痕零明文） | V2、V4 |
| AC-SGO-014 | 完成交代如实（清单条数 == 实际写入处数） | V2 |
| AC-SGO-015 | 计划指纹绑定生效（内放行 / 外回落 / 漂移显式失败） | V2、V3 |
| AC-SGO-016 | 中途可中止 + 部分完成留痕 + `cancelled` 语义 | V2 |
| AC-SGO-017~022 | 门禁治理（只增 / 反证 / 台账 / 受审集合 / 串行） | V1、V6、V9 |
| AC-SGO-024 | 体积分列预算 + 逐叶重登记 | V8 |
| AC-SGO-026 | 人工面如实登记（M2 / M3） | V2（`⏳`）、V9 |

---

## 4. 验证维度与方法

| 维度 | 方法 | 落点 |
|------|------|------|
| 测试覆盖 | 复跑 node（`npm test`）与 Chromium 门禁并计数对账 | V1 / V2 / V4 / V6 |
| 接口数据 | 直接驱动生产模块（`batch-plan` / `confirm` / `ref-scope`），比对准入裁决与转值语义 | V3 / V4 / V5 |
| 构建 | `dist/**` 产物 stat + 冻结面 sha 复算（可复现性）；`tsc` / `build` 退出码 | V1 / V7 / V8 |
| 性能边界 | 体积五要素独立复算 + 两叶 Σ + metafile 归因 | V8 |
| 漂移检测 | 冻结面 `git diff`、`KIND_SET` 字面块、spec 漂移、worktree 终态 | V6 / V7 / V9 |

**脚本约定**：验证脚本由本 Agent 自主编写并直接执行（ADR-003），存放于编排器指定目录 `/tmp/opencode/v4-gate-logs/v55f-2-validate/`（模板默认 `/tmp/sddu-validate-<feature>-<timestamp>/`；本次按编排器指令使用固定目录，日志同名）。探针均**只读**或以**源码注入 + 逐字节还原**方式对抗，不改仓库。

---

## 5. 纪律

1. **扰动可还原**：所有源码注入均先记录 sha256，注入后 `git checkout` 还原，再复核 sha 逐字节相同；`.sddu` 外零残留（`git status` 终态干净）。
2. **判定三态**：`✅ 通过` / `⚠️ 有条件通过` / `❌ 不通过`；无法执行项标 `⏭️` 并说明原因。
3. **人工面**：M2 连点疲劳体感 / M3 批量计划卡真机可读性与可否决性 = `⏳`，**不得冒充 PASS**。
4. **计数只增**：门禁断言只增不减；数值重 pin 落在台账登记的 `modifiedRanges` 内。

---

## 6. 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建（V1~V9 对抗优先场景矩阵；承载父 FR 切片 21 条 / 11 NFR / 10 EC / 12 AC 的 Vx 映射；五维度方法学；扰动可还原与人工面纪律） | 2026-09-24 | SDDU Validate Agent |
