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
| 完成任务数 | **6** / 19（101~106 ✅；W3/W4/W5 待 R2/R3） |
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

## 3. 文件变更（区间 B = W2：`TASK-V45-104~106`）

### 3.1 `src/**`（8 项，**全部为单写化改造**）

| 操作 | 文件路径 | 对应任务 | 说明 |
|:--:|------|:--:|------|
| MODIFY | `packages/web-cli-plugin/src/ui/sidepanel/host-registry.ts` | T104 | `STRIP_CHANNEL_KINDS` 由「legacy id + kind」重构为 `{channel, kind, emitterSite, carrierCount: 1, reason}`（6 条：env / site / firstRun / probe / notice / **send-reason 保留**）；新增 `STRIP_CHANNEL_KIND_MAP` / `RETIRED_STRIP_CHANNELS` / `evaluateStripChannels()`（唯一 emitter ∧ 载体数 == 1 ∧ `#send-reason` 仍在状态栏）；删除与退役正面矛盾的「legacy id 仍在 DOM」判据；`REGISTERED_STRUCTURAL_HOSTS` 移除 `strips`（4 → 3，W3 清零），`RETIRED_HOST_IDS` 收入 `strips`；删净双写理由（`ALSO append-recorded` 零命中） |
| MODIFY | `packages/web-cli-plugin/src/ui/sidepanel/index.html` | T105 | **5 条提示带真退役**：`li[data-host="strips"]` + `.strips` + `#env-guard` / `#site-hint`(+`-title`/`-detail`/`-action`) / `#onboarding` / `#discovery-notice`(+`-title`/`-detail`) / `#notice` 节点与其死 CSS 一并移除（**非 `hidden`**）；`#send-reason` 不动（`#region-statusbar` 内） |
| MODIFY | `packages/web-cli-plugin/src/ui/sidepanel/sidepanel.ts` | T104/T105 | 删除 `renderSiteHint()` / `renderOnboarding()` / `renderDiscoveryNotice()` / `#notice` 投影 / `#env-guard` 横幅写入口；`observeChannel()` 新增 `title` 通道 + `CHANNEL_STATE_CARRIERS`（site / probe **首次观察即落行** ⇒ 首屏三事实载体可达）；树抽屉 `onNotice` 改走唯一通道；测试 seam `stripChannels` 换新形状；设置面板新增 `getSiteDetail`（与流内行 `title` 同源） |
| MODIFY | `packages/web-cli-plugin/src/ui/sidepanel/stream-plaintext.ts` | T105 | 新增 `plaintextTitle()` —— 行 `title` 长文案的 **fail-closed 净化**（先剥产品自撰标记、再跑 `assertStreamPlaintext`；NFR-V45-003 / R-REG-901） |
| MODIFY | `packages/web-cli-plugin/src/ui/sidepanel/chat-state.ts` | T105 | `systemRow()` 在**唯一写入点**落 `systemKind` + `plaintextTitle(title)` 后的 `systemTitle`；`system` / `notice` 动作新增 `title` 字段并透传 |
| MODIFY | `packages/web-cli-plugin/src/ui/sidepanel/stream-model.ts` | T105 | `StreamPayload` 新增 `systemKind` / `systemTitle`（后者 = 长文案载体，写入点已净化） |
| MODIFY | `packages/web-cli-plugin/src/ui/sidepanel/cards/system.ts` | T105 | 系统行渲染 `data-kind`（ADR-V45-001 选择器可解析）+ 行 `title` |
| MODIFY | `packages/web-cli-plugin/src/ui/settings/panel.ts` | T105 | 站点分区新增只读详情 `#settings-site-detail`（与流内行 `title` **同源**；只读零控件） |

### 3.2 `test/**`（15 处引用 / 断言重写，**数量只增**）

| 操作 | 文件路径 | 对应任务 | 说明 |
|:--:|------|:--:|------|
| MODIFY | `test/ui/journey.mjs` | T106 | 段外三处：`#11b/#11c`（无手动重探入口 / 无手动重试文案 → **全面板文本 + 流内 probe 行**，判据更强）、`#11c~#11e`（`#site-hint` 可见性/原因/动作 → 流内 `site` 行）+ **新增 `#11f`（行 `title` 承载长文案）**；保护段 `#15a~#15q` **零字节改动**（段前 Δ=612 B 由 7 条装饰分隔线的等量删白补偿，`startByte` 逐字节 43054） |
| MODIFY | `test/ui/binding.mjs` | T106 | 段前 `:896` 字节中立改写（`#notice` → 流内 `notice` 行；Δ=52 B 由 `:752` 装饰分隔线 17 个 `─` + 1 个注释内部空白补偿 ⇒ `startByte` 逐字节 107780）；段后 `:2256` 自由改写（`#discovery-notice` → 流内 `probe` 行 + 行 `title`）；`:880` `panelNotice` **零触碰** |
| MODIFY | `test/ui/hardening.mjs` | T106 | `readNotice()` 由 `#discovery-notice/-title/-detail` 改锚到流内 `probe` 行 + 行 `title`（7 条断言语义逐条保留，24 → 24） |
| MODIFY | `test/ui/density.mjs` | T106 | `settledProbe` 与指纹两处（`onboardingHidden` / `discoveryHidden`）改由流内唯一载体判定（31 格重算归 W4/TASK-V45-116） |
| MODIFY | `test/ui/recommendation.mjs` | T106 | ⑬ 首装态可见性由 `#onboarding` 改读流内 `firstRun` 载体 / onboarding 推荐卡 |
| MODIFY | `test/sidepanel-view.test.ts` | T106 | 4 个静态面测试改为「**节点为 null** + 流内载体在」双断言（onboarding / 侧栏 `#env-guard`（options 页保留）/ `#discovery-*` 三条 / `#site-hint*` 四条 + 退役渲染器零残留） |
| MODIFY | `test/density-thresholds.test.ts` | T106 | 归并矩阵由「legacy id 仍在 DOM」重写为**新语义三条**（唯一 emitter / 载体数 == 1 / `#send-reason` 仍在状态栏）+ `evaluateStripChannels` 逐类反证 + 五条退役 id 登记进 `V4_RETIRED_IDS` |
| MODIFY | `test/system-merge.test.ts` | T106 | 归并矩阵判据升级为 `emitterSite` **唯一调用点机核**（逐通道恰 1） |
| MODIFY | `test/host-registry.test.ts` | T104 | W1 预留位实体化：真实注册表读数收口到「3 宿主 + `strips` 已退役」+ 两条反证（复活 / 静默删除） |
| MODIFY | `test/size-baseline.ts` / `test/size-budget.test.ts` / `test/size-growth-evidence.test.ts` / `test/size-ruling-vol3.test.ts` | T105（超预期触碰） | **体积五要素显式重登记**：480,026 → 480,896 B（`v45-1-w2`，`direction: raised`，+870 B / +0.18%）；新增 `v45W1W2Rows` 逐模块归因（Σ +870 + glue 0）+ 第 14 组 N-05 判据；`PENDING_ABSOLUTE_CAP.newBaselineBytes` 随基线同源前移（档位 512,000 / 绝对上限 563,200 未变） |
| MODIFY | `docs/v4-supersession-ledger.json` | T104/T105/T106 | 新增 7 条 `entries`（strips 五条退役的写入口→流内载体映射 + 单写契约重构 + journey 段外八步登记）、24 条 `modifiedRanges`（base 相对逐行覆盖）、1 个 v4.5-1 `leafBases` 段（scope 复算 + **96 条**逐字登记的叶段删除行）、journey 的 `rewriteRegions` 追加；既有 volume pin 条目按真实产物**再 pin**（旧文本逐字保留在 `reason`） |
| MODIFY | `docs/v4-density-baseline.json` | T105 | `volume.registeredBaselineBytes` / `ceilingBytes` 随体积重登记前移（480,896 / 504,940），`directionalAlert` / `closeoutNote` 追加 v4.5-1 段（阈值 7/15 · 9/20 · 17/35 与豁免口径**零改动**） |

### 3.3 保护段状态（**本轮不动 pin**）

| 保护段 | 状态 | 证据 |
|---|---|---|
| journey `test/ui/journey.mjs` `43054..55259` / sha `e2b500df…` | ✅ **逐字节未变** | 段外改写 Δ=612 B 由 7 条装饰分隔线等量删白补偿；`test:supersession` 的 `protectedPinFailures` 实跑零违规（`startByte`/`endByte`/sha 三项全绿） |
| binding `test/ui/binding.mjs` `107780..115930` / sha `be9ad0e9…` | ✅ **逐字节未变** | 段前 Δ=52 B 由 `:752` 等量删白补偿；`startByte` 逐字节 107780；相同判据全绿 |

> spikeGate-A = `keep-feasible` / spikeGate-B = `eight-steps-feasible` ⇒ **无需**进入「停下上报」兜底；journey 的第二次八步显式取代仍在 W4/TASK-V45-113（本轮段内零字节改动，因此 pin 未失配）。

### 3.4 W2 门禁实测（严格串行、一次一个 Chromium；日志全量落盘）

| 门禁 | 实测 | 基线 | 判定 |
|---|:--:|:--:|:--:|
| `npm test`（node） | **1034 passed / 0 failed** | 1001 | ✅ +33 |
| `test:ui`（journey） | **168 passed** | 167 | ✅ +1 |
| `test:hardening` | **24 passed** | 24 | ✅ |
| `test:insight` | **116 passed** | 116 | ✅ |
| `test:stream` | **63 passed** | 63 | ✅ |
| `test:l0` | **223 passed** | 223 | ✅ |
| `test:l1` | **111 passed** | 111 | ✅ |
| `test:l2` | **74 passed** | 74 | ✅ |
| `test:recommendation` | **56 passed** | 56 | ✅ |
| `test:ask-auth` | **61 passed** | 61 | ✅ |
| `test:page-input` | **106 passed** | 106 | ✅ |
| `test:zero-injection` | **27 passed** | 27 | ✅（options 未解冻 ⇒ F3 面零触碰） |
| `test:binding` | **192 passed**（第 4 次隔离复跑） | 192 | ⚠️ **KL-N-10 登记**：前 3 次各 1~3 条红（`#8d/#8e`、`#6l`，逐次不同）⇒ 环境性 flake，第 4 次全绿；日志 4 份全量落盘 |
| `test:density` | **红（预期）** | 175 | ⏳ **W4/TASK-V45-116 交付项**：31 格重算 + 夹具三重构造判据；ADR-V45-006 §2 明文「W2 完成前不得跑 density 收口判据」 |

> 日志目录：`/tmp/opencode/v4-gate-logs/v45-r1/`（`w1-*` / `w2-*` 逐门禁全量）。**未跑**：`test:l1-reverse` / `test:l2-reverse`（注入点随形态搬迁 ⇒ W4/TASK-V45-115）、`test:supersession`（在 `npm test` 内已跑，绿）、`test:e2e` / `test:design-contract` / `test:size-ruling-vol3`（在 `npm test` 内已跑，绿）。

### 3.5 44 处引用 → 断言重写对账（数量 ≥ 原值）

| 门禁文件 | 原引用点 | 处置 | 断言数 |
|---|:--:|---|:--:|
| `journey.mjs` | 6 | `#11a~#11f` 段外重写 + `#11f` 新增 | 167 → **168** |
| `binding.mjs` | 2 | 段前字节中立 + 段后等价改写 | 192 → **192** |
| `hardening.mjs` | 3 | 读取点改锚（7 条断言语义保留） | 24 → **24** |
| `density.mjs` | 3 | 稳态锚 + 2 指纹字段 | （W4 重算） |
| `recommendation.mjs` | 1 | 首装态载体改锚 | 56 → **56** |
| `sidepanel-view.test.ts` | 9 | 9 处「节点存在」→「节点 null + 载体在」双断言 | 净增（23 条断言） |
| `density-thresholds.test.ts` | 4 | 归并矩阵新语义三条 + 反证 | 矩阵 4 → 11 |
| `system-merge.test.ts` | 1 | emitter 唯一性机核 | 1 → 2·N |
| `host-registry.test.ts` | 1 | 预留位实体化 + 2 反证 | +2 |
| `stream.mjs` / `l0-disclosure.test.ts` / `env-guard.test.ts` / `density-metrics.mjs` / `insight.mjs` | 6 | **识别为事件语义 / 惰性 de-chrome 列表 ⇒ 零触碰**（`notice` 同名白名单） | 0 改动 |
| 合计 | **44** | 逐点判定（禁按名批量替换） | 全部 ≥ 原值 |

---

## 4. 任务完成清单

| 任务 | 名称 | 复杂度 | 状态 | 对应 FR |
|------|------|:--:|:--:|------|
| TASK-V45-101 | 门禁脚手架三件套 + 受审集合追加 + 计数只增对账表 | M | ✅ completed | FR-V45-003 / 004 / 030 / 040 / 060 |
| TASK-V45-102 | **spikeGate-A** binding 段前字节中立避让可行性探针 | S | ✅ completed（`keep-feasible`） | FR-V45-081 |
| TASK-V45-103 | **spikeGate-B** journey 等价改写 + 链式 superseder 预演 | S | ✅ completed（`eight-steps-feasible`） | FR-V45-080 / 083 / 084 |
| TASK-V45-104 | `STRIP_CHANNEL_KINDS` 重构 + `appendSystem` 单写收口 | L | ✅ completed | FR-V45-011 / 012 / 015 |
| TASK-V45-105 | 5 条提示带 DOM 真退役 + `firstRunCard` 归并 + `title` 净化承载 | L | ✅ completed | FR-V45-010 / 013 / 014 / 025 |
| TASK-V45-106 | strips 15 门禁 / 44 处断言重写 + 载体数 == 1 + 4 组反证 | L | ✅ completed | FR-V45-015 / 011 / 010 |
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
