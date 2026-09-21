# 构建报告：specs-tree-v45-1-single-write-chronology（V4.5-1 单写化 + 宿主时间序化）

> **文档定位**: SDDU 构建报告（实施承载叶）— 记录 W1~W5 的逐任务文件变更、门禁实测与 spikeGate 结论，作为 review / validate 阶段的输入
> **前置依赖**: 本叶 `tasks.md` / `tasks.json`（19 原子任务 / 5 波）、本叶 `plan.md`（ADR-V45-001~012）、父 `spec.md`（44 FR / 22 AC / §11 37 条元素去向）
> **创建人**: SDDU Build Agent
> **创建时间**: 2026-09-21
> **版本**: v1.0（R1 = W1 + W2；W3/W4/W5 待 R2/R3 追加）
> **更新人**: SDDU Build Agent
> **更新时间**: 2026-09-21
> **更新说明**: 初始创建 —— 提交区间 A（W1：门禁脚手架 + 双 spikeGate）+ 提交区间 B（W2：五通道单写化 / strips DOM 真退役 / 断言重写）

---

## 1. 构建概要

> 本文件覆盖 **R1 = W1 + W2**（`TASK-V45-101~106`，提交区间 A + B）。W3（107~112）/ W4（113~116）/ W5（117~119）尚未开工。

| 维度 | 数值 |
|------|:--:|
| 完成任务数 | **6** / 19（101~106；W3/W4/W5 待 R2/R3） |
| 复杂度分布 | S×2（102 / 103）/ M×1（101）/ L×3（104 / 105 / 106） |
| 新增文件 | 3（3 个 node 门禁骨架） |
| 修改文件 | 见 §2 |
| spikeGate 结论 | **A = `keep-feasible`** / **B = `eight-steps-feasible`**（两者均非 `report-to-orchestrator`） |

### 1.1 spikeGate-A（TASK-V45-102）结论原文 —— **`keep-feasible`**

探针 `/tmp/opencode/v45-spike/binding-byteline-probe.mjs`（只读；`git status --short` 零输出），日志 `/tmp/opencode/v4-gate-logs/v45-r1/w1-spike-binding.log`。

```
## TASK-V45-102 spikeGate-A — binding 段前字节中立避让探针
登记保护段: packages/web-cli-plugin/test/ui/binding.mjs 107780..115930 sha be9ad0e9…
实测 startAnchor 字节偏移 = 107780 (line 1799)

### 1. #notice 元素读取点（getElementById / #notice 选择器；注释行不计）
  · :896 @49293 protected=false  const authNotice = await waitFor(ext, `(() => { const t = document.getElementById('notice')…

### 2. 白名单 (:880 panelNotice)
  · 是否被识别为 #notice 元素迁移点: false  (期望 false)

### 3. 前置区可删白预算 (偏移 < startByte)
  · 行尾空白 = 0 B / 冗余空行 = 0 B / 装饰分隔线 '─' = 495 字符 = 1485 B
  · availablePreSegmentBytes = 1485 B

### 4. 等价改写表达式字节差
  · old (1-based :896) = 162 B / new = 214 B / ΔbyteLength = 52 B（需要等量删白）
  · |Δ| = 52 ≤ availablePreSegmentBytes = 1485 → 预算充足

### 5. 模拟结果（改写 + 同前置区等量删白）
  · 删白构成: :752 删 17 个 '─'（= 51 B，纯装饰分隔线） + :752 删 1 个注释行内部空白（= 1 B）
  · 段本体 sha256 = be9ad0e9… (登记 be9ad0e9…) → INVARIANT
  · 段本体与原文逐字节相同 = true
  · byteOffsetOf(startAnchor) = 107780 (登记 107780) → OK
  · 文件总字节 = 138444 vs 原文 138444 (Δ=0)

### 6. 结论
  · 失败判据记录: （无）
  · VERDICT = keep-feasible
  · 段内迁移点 = 0 处（保段前提）
```

**结论**：binding **保段（`decision:"keep"`）可行**，`TASK-V45-114` 无需进入「显式取代」兜底预案（不需要停下上报）。量化预算：`availablePreSegmentBytes = 1,485 B ≥ |ΔbyteLength| = 52 B`。段内迁移点 **0** 处 → 保段在语义上成立。

### 1.2 spikeGate-B（TASK-V45-103）结论原文 —— **`eight-steps-feasible`**

探针 `/tmp/opencode/v45-spike/journey-supersede-probe.mjs`（只读；`git status --short` 零输出），日志 `/tmp/opencode/v4-gate-logs/v45-r1/w1-spike-journey.log`。

```
## TASK-V45-103 spikeGate-B — journey 等价改写 + 链式 superseder 预演
v3 pin  : 42766..54004 sha 6b45c3fa…
v4-1 pin: 43054..55259 sha e2b500df…
实测段: line 841..1034, byte 43054..55259
实测段 sha256 = e2b500df9049f69979892076ad798fabfc4a638a3403902c7e57d7f1e1ac244f (== 登记 true)

### 1. 链式谓词预演
  · v3 pin (6b45c3fa…): chainPredicate=true  legacyEqual=false  (期望 chainPredicate=true)
  · v4-1 pin (e2b500df…): chainPredicate=true  legacyEqual=true
  · 反证：仅 legacy 等值（无 chain）对 v3 pin = true（现状 true；W4 改 supersededFrom 后必须仍 true ⇒ 只有 chain 能保证）

### 2. supersessionChain 最小 schema + 断言草案
  · schema 字段: sha256 / supersededFrom / supersededOn / leafBase / note —— 每节齐备 = true
  · ① 链长 ≥2 = true ② 链连续性 = true ③ 链覆盖 v3 pin 与 v4-1 pin = true
  · ④ 前任同源 = true ⑤ newPin 同源 = true ⑥ history 保留 v4-1 段 = true

### 3. 段外 #11c~#11e 等价改写 + 字节中立预算
  · 旧块 = 889 B / 新块 = 1063 B / Δ = 174 B
  · 段前 '─' 预算 = 702 B ≥ 174 → 充足；Δ mod 3 = 0
  · 删白位点 = :83 删 20 个 '─' + :299 删 20 个 '─' + :241 删 18 个 '─'
  · 模拟后 byteOffsetOf(startAnchor) = 43054 (登记 43054) → OK
  · 模拟后段本体 sha 不变 = true

### 4. 结论
  · 失败判据记录: （无）
  · VERDICT = eight-steps-feasible
```

**结论**：journey 第二次八步显式取代（`decision:"supersede"`）**可直接落地**。链式 superseder 谓词对 **v3 pin 与 v4-1 pin 均命中**（「只保留 legacy 等值 ⇒ W4 改 `supersededFrom` 后 v3 查找必然落空」的反证同时成立）；`supersessionChain` 最小 schema 5 字段与 6 条链连续性/覆盖/同源断言草案成文。

---

## 2. 文件变更（区间 A = W1）

| 操作 | 文件路径 | 对应任务 | 说明 |
|:--:|------|:--:|------|
| NEW | `packages/web-cli-plugin/test/host-registry.test.ts` | TASK-V45-101 | 零宿主反向判据骨架：`zeroHostProblems()` 6 类问题串 + `cleanZeroHostReading()` + `JUDGEMENTS`（6 条 `expectFailPattern`）+ **5 组伪造 reading**（删属性 / 改名 / 塞进卡 / 只删标记 / 空注册表仍留 DOM）逐组红 + W3 预留位 `ZH-7` |
| NEW | `packages/web-cli-plugin/test/local-act-wiring.test.ts` | TASK-V45-101 | 本地 act 布线门禁骨架：`callSites()` / `declarationSites()` / `actBranchBody()` / `singleEntryProblems()` / `localActBranchProblems()` / `closedSetProblems()` + `JUDGEMENTS`（6 条）+ `LOCAL_ACT_SLOTS`（authorize landed / rebind·help `pending-w3`）+ ≥6 组反证（含「删分支 ⇒ 红」「接错入口 ⇒ 红」「闭集重复 ⇒ 红」） |
| NEW | `packages/web-cli-plugin/test/settings-help.test.ts` | TASK-V45-101 | 帮助分区单源骨架：`registryRenderedProblems()` / `derivedCountProblems()` / `gestureRowProblems()` / `zeroClickableProblems()` + `JUDGEMENTS`（5 条）+ `HELP_SECTION_ID` 预留位 + 4 组反证 |
| MODIFY | `packages/web-cli-plugin/test/gate-integrity.test.ts` | TASK-V45-101 | ① `EXPECTED_AUDITED_FILES` **只追加** 3 个 node 门禁路径；② 新增 `NODE_GATE_FILES` 常量；③ `discoverGateFiles()` 增加 **node 门禁扫描轴**（`test/*.test.ts` + `JUDGEMENTS` 表 + `expectFailPattern` 两段式标记）；④ 新增判据「node 门禁自动纳入 ∧ `CHROMIUM_GATES === 9` 不变」；⑤ 模块文档追加 v4.5-1 说明段。**`CHROMIUM_GATES.length === 9` 的等值断言零改动** |
| MODIFY | `.sddu/.../specs-tree-v45-1-single-write-chronology/state.json` | TASK-V45-101/102/103 | `taskCounts.testConservation` 升级为**结构化对账表**（18 门禁：`baseline` / `targetLowerBound` / `rewriteMode` / `lowerBoundNotBelowBaseline`）+ `spikes[]` 写入两条 `verdict` 与量化证据 + `phase: builded` |

### 2.1 W1 门禁实测（区间 A）

| 门禁 | 命令 | 结果 |
|---|---|---|
| typecheck | `npm run typecheck` | ✅ 0 error |
| node 全套 | `npm test` | ✅ **1034 passed / 0 failed**（基线 1001；W1 追加 33 条 node 断言） |
| `CHROMIUM_GATES` | 元门禁内等值断言 | ✅ `=== 9`（未改） |
| `EXPECTED_AUDITED_FILES` | 元门禁子集断言 | ✅ ⊇ 3 个新路径，原集合仍为子集（只追加） |
| spikeGate-A | `node /tmp/opencode/v45-spike/binding-byteline-probe.mjs` | ✅ `keep-feasible` |
| spikeGate-B | `node /tmp/opencode/v45-spike/journey-supersede-probe.mjs` | ✅ `eight-steps-feasible` |

> 日志：`/tmp/opencode/v4-gate-logs/v45-r1/w1-node.log` · `w1-spike-binding.log` · `w1-spike-journey.log`。

---

## 3. 文件变更（区间 B = W2）

> 待 R1 的 W2 段落落定后补齐（`TASK-V45-104` / `105` / `106`）。

---

## 4. 任务完成清单

| 任务 | 名称 | 复杂度 | 状态 | 对应 FR |
|------|------|:--:|:--:|------|
| TASK-V45-101 | 门禁脚手架三件套 + 受审集合追加 + 计数只增对账表 | M | ✅ completed | FR-V45-003 / 004 / 030 / 040 / 060 |
| TASK-V45-102 | **spikeGate-A** binding 段前字节中立避让可行性探针 | S | ✅ completed（`keep-feasible`） | FR-V45-081 |
| TASK-V45-103 | **spikeGate-B** journey 等价改写 + 链式 superseder 预演 | S | ✅ completed（`eight-steps-feasible`） | FR-V45-080 / 083 / 084 |
| TASK-V45-104 | `STRIP_CHANNEL_KINDS` 重构 + `appendSystem` 单写收口 | L | ⏳ 进行中（R1/W2） | FR-V45-011 / 012 / 015 |
| TASK-V45-105 | 5 条提示带 DOM 真退役 + `firstRunCard` 归并 + `title` 净化承载 | L | ⏳ 进行中（R1/W2） | FR-V45-010 / 013 / 014 / 025 |
| TASK-V45-106 | strips 15 门禁 / 44 处断言重写 + 载体数 == 1 + 4 组反证 | L | ⏳ 进行中（R1/W2） | FR-V45-015 / 011 / 010 |
| TASK-V45-107~119 | W3 / W4 / W5 | — | ⏳ 未开工（待 R2 / R3） | — |

---

## 5. 下一步

| 场景 | 操作 |
|------|------|
| R1 收口后（W1+W2 已提交） | 运行 `@sddu-build specs-tree-web-cli-plugin-v45-f-regularization` 继续 **R2 = W3（TASK-V45-107~112，提交区间 C）** |
| W3 完成后 | R3 = W4+W5（`TASK-V45-113~119`，**单一原子提交区间 D**） |
| 全部任务完成 | 运行 `@sddu-review specs-tree-v45-1-single-write-chronology` 开始审查 |

---

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建（R1 = W1 + W2；含双 spikeGate 结论原文与量化证据） | 2026-09-21 | SDDU Build Agent |
