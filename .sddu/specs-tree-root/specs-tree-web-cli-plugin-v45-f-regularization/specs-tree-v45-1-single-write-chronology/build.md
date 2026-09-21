# 构建报告：specs-tree-v45-1-single-write-chronology（V4.5-1 单写化 + 宿主时间序化）

> **文档定位**: SDDU 构建报告（实施承载叶）— 记录 W1~W5 的逐任务文件变更、门禁实测与 spikeGate 结论，作为 review / validate 阶段的输入
> **前置依赖**: 本叶 `tasks.md` / `tasks.json`（19 原子任务 / 5 波）、本叶 `plan.md`（ADR-V45-001~012）、父 `spec.md`（44 FR / 22 AC / §11 37 条元素去向）
> **创建人**: SDDU Build Agent
> **创建时间**: 2026-09-21
> **版本**: v1.2（R1 = W1 + W2；R2 = W3；**R3 = W4+W5 已收口，19/19 任务完成**）
> **更新人**: SDDU Build Agent
> **更新时间**: 2026-09-21
> **更新说明**: v1.2 —— 追加 R3（提交区间 **D** = W4+W5：TASK-V45-113~119 journey 第二次显式取代 / binding 保段 / 门禁等价重锚与反证注入点重写 / density 修复（229 passed）/ options 解冻 / 体积终轮 Δ=0 与 `direction` 机核 / 24 门禁串行收口）

---

## 1. 构建概要

> 本文件覆盖 **R1 = W1 + W2**（`TASK-V45-101~106`，提交区间 A+B）、**R2 = W3**（`TASK-V45-107~112`，区间 C）与 **R3 = W4+W5**（`TASK-V45-113~119`，**单一原子区间 D**）。**19/19 任务已完成**（R3 见 §6）。

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

## 4. 构建概要（R2 = W3，提交区间 C）

> 本段覆盖 **R2 = W3**（`TASK-V45-107~112`，单一提交区间 C）。序列严格 107 → 112。

| 维度 | 数值 |
|------|:--:|
| 完成任务数 | **6**（107 ✅ / 108 ✅ / 109 ✅ / 110 ✅ / 111 ✅ / 112 ✅） |
| 复杂度分布 | M×3（107 / 110 / 111）/ L×3（108 / 109 / 112） |
| 新增文件 | 2（`src/ui/sidepanel/cards/decision-region.ts` / `src/ui/settings/help.ts`） |
| 修改文件 | src 18 + test 21 + docs 2（逐路径见 §5） |
| 体积 | **493,501 B**（前值 480,896 B，+12,605 B / +2.62%；ceiling = floor × 1.05 = **518,176 B**，档位 512,000 / 绝对上限 563,200 未下移） |

### 4.1 逐任务处置

**TASK-V45-107（M）—— `messageAnchor()` → `null` + 4 宿主 DOM 移除 + `#stream` 纯卡序**

* `stream-render.ts#messageAnchor()` 恒返回 `null`（源码不再查询 `li[data-host="composer"]`）；`setEmpty()` 口径不变。
* `index.html`：`li[data-host="decision"]` / `"composer"` / `"l1-panels"` 三个宿主连同包裹层与死 CSS 一并移除（`strips` 已在 W2 退役）⇒ **任意深度 `[data-host]` 计数 = 0**；`#stream` 静态子节点为空（卡由渲染器追加、空态占位由 `setEmpty()` 铸造）。
* 新增产品侧结构判据 `density-scope.ts#assertStreamPureCardOrder()` / `readStreamShape()`（唯一允许的非卡子节点 = `p.log-empty-text`；任意宿主 ⇒ 抛错），由 `window.__v3.testing.assertStreamPureCardOrder()` 暴露给门禁；l1 门禁新增 4 条反证（注入宿主 / 注入非卡子节点 / 还原 PASS / 形状读数同源）。

**TASK-V45-108（L）—— decision 壳元素卡内化**

| 原元素 | 落位（新形态） | 承载方式 |
|---|---|---|
| `#l0-kicker` / `#l0-ref-badge` | **退役** | 角色名 / 失效标记由卡自身 `data-*` + 卡内徽标（`.ref-chip[data-ref-stale]` / `.ref-stale-badge`）承载 |
| `#l0-ref-toggle` | **退役** | 流内最新 ref 卡的 chip（hover / turn 通道由 `newestRefChip()` 单点写入；卡内 chip 的 `pointerenter` 走 `handleCardAction('hover')`） |
| `#l0-more` + `#l1-more` / `#l1-more-options` / `#l1-consequences-toggle` / `#l1-consequences` / `#l1-consequence-tpl` | **迁移 → ask/auth 卡内** | 新增 `cards/decision-region.ts`：卡内 `#l1-more-toggle`（新触发器，`data-count` + `aria-controls`）→ `#l1-more`（选项池，默认 `hidden`）→ 后果预演（**三段模板文案逐字不变**，由卡内 `<template id="l1-consequence-tpl">` 克隆）；id 家族按 `#ask*` / `#confirm*` 先例**由唯一最新卡铸造**（构建前先从旧卡剥离） |
| `#l0-receipt-summary` | **迁移 → 卡固化区** | `l1/panels.ts#paintReceiptSummary()`：写入**最新卡**的 `.card-fixed`（节点按需铸造并随最新载体迁移，id 唯一） |
| `#l1-ref` / `-summary` / `-rows` / `-actions` / `-repick` / `-describe` / `-rescue` / `-reason` | **迁移 → ref 卡证据区 / 恢复区** | `cards/ref.ts` 在**最新 ref 卡**上铸造该 id 家族（`<details id="l1-ref">` + 三恢复按钮；`#l1-ref-rescue` 的可见性仍由唯一判定器写：`canReanchor()` 谓词逐字不变 ⇒ **EC-V45-005 / N-05 随此关闭**） |

* 单写性：卡内选项池只装「`#ask-options` 未展示的选项 + 末项」（l0 门禁新增「无重复投影」断言）。
* 卡内预算：`#l1-more-toggle` 加入 `setCardFallbackOpen` 的互斥披露（展开兜底即隐藏触发器）⇒ 单卡 ≤6、两卡同开合计 ≤8 逐字不变（ask-auth 门禁 ⑪ 全绿）。

**TASK-V45-109（L）—— `l1-panels` 4 开关去向 + L2 只读承载块**

| 原元素 | 去向 | 载体 |
|---|---|---|
| `li[data-host="l1-panels"]` / `#l1-group` + 4 触发器 | 退役 | 节点移除（`hidden` 面板随宿主一并走） |
| `#l1-history-toggle` / `-history` / `-rows` | 退役（历史 = 流本身） | 已决步数计数 → **`#l2-audit-count`**（审计视图标题区，DOM 声明点**恰 1 个**，门禁逐项断言） |
| `#l1-local-tree-toggle` / `-tree` / `-rows` / `-hint` | 迁移 → 树视图只读归因块 | `#view-host [data-l2-view="tree"] > #l2-tree-attribution`（内容容器 `#l1-local-tree` / `-rows` / `-hint` 同 id、同一写入者 `l1/panels.ts`） |
| `#l1-receipt-toggle` / `-receipt` / `-rows` / `-audit-summary` | 迁移 → 审计视图证据区 | `#view-host [data-l2-view="audit"] > #l2-audit-evidence`（行数与摘要语义不变） |
| `#l1-local-tree-global`（查看全局树） | **消解** | 已在树视图内 ⇒ 控件移除且全仓零悬空引用（l1 门禁逐项断言） |
| `#l1-receipt-audit`（查看审计） | **消解** | 已在审计视图内 ⇒ 同上 |

* 迁入方向性：门禁断言两个承载块都挂在 `#view-host` 内、零可点控件、不引入第二滚动容器（滚动容器计数仍为 1）。

**TASK-V45-110（M）—— `#composer` 出流 + `disclosure.ts` 三份声明重写**

* `#composer` 作为 `body` 最后一个**布局**元素（`<script>` 之前）并保持 `hidden`；id / ARIA / 内部结构零变化；`#stream` 子树不再包含 `#composer` / `#input` / `#send`（l0 / density-thresholds / insight 三处门禁逐项断言）。
* **布局护栏（R-V45-105）**：新增 `sidepanel.ts#syncComposerVisibility()` 作为 `#composer.hidden` 的**唯一派生点**（= 兜底开启 ∧ 聊天面可见），`render()` / `view-host.close()` / 卡内兜底入口均经它 ⇒ 视图打开态不会浮出输入框（insight 门禁的 fail-closed 可见性判据全绿）。
* `disclosure.ts`：`COLLAPSIBLE_TARGETS` **7 → 7**（新增 `l2-tree-attribution` / `l2-audit-evidence`，退役面入 `RETIRED_FOLDABLE_IDS`）；`NEVER_FOLDABLE` **12 → 14**；`DISCLOSURE_WIRING` 7 对（5 对为「无触发器（视图内常开）」，以 `triggerId: null` 显式登记）；新增 `RETIRED_TRIGGER_IDS`（6）；`collapseAll()` 对卡内面「缺席即跳过」、对视图内面不自动折叠（两条新判据）。

**TASK-V45-111（M）—— 零宿主反向判据 + `RETIRED_*` 扩容 + l0 结构判据 + 5 组伪造反证**

* `REGISTERED_STRUCTURAL_HOSTS = []`（注册表**降级为反向判据**：任意 `li[data-host]` 即红）；新增 `RETIRED_HOST_ATTRS`（4）/ `RETIRED_CONTAINER_IDS`（14）/ `RETIRED_HOST_DISPOSITIONS`（逐项「去向 + 重新引入即红」反证）；`RETIRED_HOST_IDS` 保留为并集别名（18）。
* `evaluateHostRegistry()` 升级为 **6 类问题串**（任意宿主 / 退役宿主值 / 退役容器 / 过渡标记 / 反证元数据 / 双写理由字面），带注入式 `dispositions` 反证缝；面板侧 `hosts()` 按「容器查 id、宿主值查 `[data-host]`」两轴读数（`composer` 是退役**宿主值**而 `#composer` 是保留**兼容面** —— 两者显式分离）。
* l0 门禁：零宿主终态 + 14 个退役容器 + 6 个退役触发器逐项负向 + 产品自断言反证（223 → **227** passed）。

**TASK-V45-112（L）—— `risk-recovery` 扩展 + act 闭集 6 项 + 布线门禁 + 设置「帮助」分区**

* `recommend.ts`：`RECOVERY_TRIGGERS` 扩为 5（`refInvalid` / `declarationInvalid` / `hardFloor` / `site` / `probe`，priority 1）；新增 `RECOVERY_CHIP_ORDER` 规则表（`site` 首项 = `rebind`、`refInvalid` 首项 = `repick`…）；`RECOVERY_CHIP_TEXT` 单源文案；`NEXTSTEP_ACTS` = `['next','repick','describe','authorize','rebind','help']`（**逐字 6 项**）；onboarding chip「了解 6 个页面手势」`next` → `help`（文案逐字不变）。
* 面板侧三处本地生产入口各恰 1~2 调用点并零 `requestTurn`：`rebind` → `rebindCurrentTab()`、`help` → `openSettingsSection('settings-help')`、`reauthorize` → `authorizeCurrentSite()`（`test/local-act-wiring.test.ts` 由「W1 预留位」翻为**landed**，逐 act 断言唯一入口 + 分支零 `requestTurn` + 闭集同源 + 3 组伪造反证）。
* 设置「帮助」分区：`SETTINGS_SECTION_IDS` 7 → **8**（单源派生），新增 `settings/help.ts`（6 行手势表由 `viewModel#gestureRows()` 单源渲染、**只读零可点**），`panel.ts` 挂载；`NEVER_FOLDABLE` 追加 `settings-help`。

### 4.2 W3 门禁实测（严格串行、一次一个 Chromium；日志全量落盘 `/tmp/opencode/v4-gate-logs/v45-r2/`）

| 门禁 | R1 基线 | W3 实测 | 判定 |
|---|:--:|:--:|:--:|
| `typecheck` | PASS | **PASS** | ✅ |
| `npm test`（node） | 1034 | **1037** | ✅ +3 |
| `test:l0` | 223 | **227** | ✅ +4 |
| `test:l1` | 111 | **115** | ✅ +4 |
| `test:l2` | 74 | **74** | ✅ |
| `test:l1-reverse` | 9 | **9**（RP-L1-E / H 锚点随形态重锚） | ✅ |
| `test:l2-reverse` | 10 | **10** | ✅ |
| `test:ui`（journey） | 168 | **168** | ✅（保护段逐字节未变） |
| `test:binding` | 192 | **192**（隔离复跑 2/4 绿 ⇒ KL-N-10） | ⚠️ KL-N-10 |
| `test:hardening` | 24 | **24** | ✅ |
| `test:stream` | 63 | **63** | ✅ |
| `test:ask-auth` | 61 | **61** | ✅ |
| `test:insight` | 116 | **116** | ✅ |
| `test:recommendation` | 56 | **59** | ✅ +3 |
| `test:page-input` | 106 | **106** | ✅ |
| `test:zero-injection` | 27 | **27** | ✅ |
| `test:e2e` | PASS | **PASS** | ✅ |
| `test:density` | 红（预期） | **红（预期，形状不变）** | ⏳ W4/T116 |

> **density 红预期照旧**：W2 退役 `#notice` 节点后夹具稳态锚已失效（门禁输出 `noticeExists:false`），31 格重算 + 夹具三重构造判据按 ADR-V45-006 归 **W4/TASK-V45-116**；本轮**未修未放宽**（阈值 7/15 · 9/20 · 17/35 与豁免口径零改动）。

### 4.3 保护段状态（**本轮仍不动 pin**）

| 保护段 | 状态 | 证据 |
|---|---|---|
| journey `test/ui/journey.mjs` `43054..55259` / sha `e2b500df…` | ✅ **逐字节未变** | W3 未触碰段内文本；`test:ui` 168 passed、`test:supersession` 的 `protectedPinFailures` 零违规 |
| binding `test/ui/binding.mjs` `107780..115930` / sha `be9ad0e9…` | ✅ **逐字节未变** | W3 未触碰 binding.mjs；`test:binding` 192 passed（隔离复跑） |

> 两次八步取代（TASK-V45-113/114）仍在 W4 —— 本轮段内零字节改动，因此 pin 未失配；spikeGate-A（`keep-feasible`）/ spikeGate-B（`eight-steps-feasible`）结论继续有效。

### 4.4 体积五要素重登记（W3 轮，FR-V45-090~093 的**中间轮**）

| 要素 | 内容 |
|---|---|
| 前值 | **480,896 B**（v45-1-w2） |
| 后值 | **493,501 B**（+12,605 B，+2.62%） |
| 日期 / 来源 | 2026-09-21 / `packages/web-cli-plugin/dist/sidepanel.js` |
| 构建命令 / 测量人 | `npm run build --workspace @lgdl/web-cli-plugin` / SDDU v4.5-1 R2（W3） |
| 理由 | 4 宿主 DOM 移除 + `assertStreamPureCardOrder` 自断言；`decision-region.ts`（6,386 B）与 `settings/help.ts`（1,343 B）两个新必需模块；`recommend.ts` 触发集 / 规则表 / 闭集 6 项；`disclosure.ts` 三份声明重写；`host-registry.ts` 零宿主反向判据 + 退休真相册；`l1/panels.ts` 卡内化后主写入者转移（−5,046 B） |
| 逐模块归因 | `SIDEPANEL_GROWTH_BREAKDOWN.v45W3Rows`（真实 `dist/build-meta.json`，Σ 模块 **+12,527** + 未归因胶水 **+78** == 登记增量 **+12,605**） |
| ceiling | `floor(493,501 × 1.05) = **518,176 B**`（公式判定，cap 仍 record-only）；档位 `ceilTo50KB(493,501) = 512,000` **未下移** ⇒ 绝对上限 563,200 不变 |
| 历史保留 | 480,896 / 480,026 / 479,021 / 478,897 / 478,163 / 465,277 / 465,000 … 逐字保留在 `_HISTORY` / `_TIMELINE` / `RE_REGISTRATIONS`；`docs/v4-density-baseline.json#volume` 与 `test/size-baseline.ts` 同源前移 |
| 红线 | `dist/content.js` 177,076 B / `dist/pick-layer.js` 33,900 B **逐字节不变**；SW / `KIND_SET` / 判定链 / manifest / `design/**` + shim sha 零触碰；v3 台账零 diff |

> 是「**中间轮**」而非收口轮：W4/W5（TASK-V45-113~119）仍会在同一叶再次重登记（同一终态 DOM 的原子区间 D）。本轮重登记仅为了让门禁在 W3 区间保持「登记值 == 当前产物」。

### 4.5 门禁等价重锚与断言对账（**数量只增**）

| 门禁 | 原断言 | W3 处置 | 现断言 |
|---|:--:|---|:--:|
| `test/ui/l0.mjs` | 223 | ③ 改判「零宿主 + 纯卡序 + 卡内触发器」；⑧ EXPECTED_TRIGGERS 12 → 8 在场 + 6 退役触发器负向 + 14 退役容器负向；⑩ 常驻集合去 `l0-decision` 补两个 L2 承接块；新增产品自断言 4 条反证 | **227** |
| `test/ui/l1.mjs` | 111 | ① 内容面契约重锚（7 面 / 6 静态 + 帮助面）；② 展开面改卡内；③/⑦/⑨/⑩/⑪ 载体改卡内 / L2 块 / 设置帮助；新增零宿主自断言反证 + 迁入块只读判据 | **115** |
| `test/ui/recommendation.mjs` | 56 | ⑬/⑭/①/④/⑥ 按 site/probe 触发优先重锚（恢复卡 ⇄ onboarding 两种形态都断言）；⑧ 零宿主终态三断言 | **59** |
| `test/ui/page-input.mjs` | 106 | ①/chip 载体改卡内、⑤ 拖放落点改 `#stream`、⑧ hover 双向、⑩ 手势表改设置帮助；救援流程先在卡内铸造再驱动 | **106** |
| `test/ui/insight.mjs` | 116 | composer 出流后的位置判据重锚（body 尾 / 不在流内）+ 诊断坐标表补 L2 块 | **116** |
| `test/ui/l1-reverse.mjs` | 9 | RP-L1-E 锚点随元素卡内化重锚（ref 卡内「改用描述」局部披露）、RP-L1-H 注入基数 7 → 4 | **9** |
| node 侧 | 1034 | `l0-disclosure` 白名单重写（7 → 7，含两表互斥 / 卡内缺席容错 / 视图内面不自动折叠）、`host-registry` 零宿主 6 类逐条反证、`local-act-wiring` 预留位翻 landed、`recommendation-sources` 触发集与闭集 6、`size-*` 重登记、`gate-integrity` 例外模式重锚 | **1037** |

### 4.6 W3 台账登记（`docs/v4-supersession-ledger.json`）

* `entries[]` 新增 **V45W3-E-01~12**（宿主注册表降级 / `messageAnchor` / 披露三声明 / composer 出流 + `newestRefChip` / L1 四去向 / act 闭集 6 / 4 宿主 DOM 退役 / l0 门禁重锚 / 体积重登记 ×2 / ref 卡吸收证据面板 / l0 零宿主判据）。
* 既有 v4 条目中指向被 W3 改写文本的 `newTitle` 逐条**重锚**（45 条，reason 内注明「newTitle 重锚，语义由 V45W3-E-* 承接」——历史 `oldTitle`/`id` 零改动）。
* 叶段（`leafBases[a04e677]`）逐字登记补齐：`registeredLines` 96 → **547**（23 个文件），scope 逐叶复算一致。
* `docs/v4-density-baseline.json#volume`：`registeredBaselineBytes` / `ceilingBytes` 同源前移（493,501 / 518,176）。

### 4.7 已知偏差与停机规则

| # | 事项 | 处置 |
|---|---|---|
| D-W3-1 | `NEVER_FOLDABLE` 的 3 个新增项与 ADR-V45-002 §5 的字面不同（ADR 写 `l2-tree-attribution` / `l2-audit-evidence`，但那两项同时在 `COLLAPSIBLE_TARGETS` 里 ⇒ 与「两表互斥」断言自相矛盾） | 新增项改为 **`region-stream` / `settings-root` / `settings-help`**（真实存在且从未可折叠），长度 **14** 与 ADR 一致；`l2-*` 留在白名单。两表互斥由新增断言守住（**登记为偏差，待 review 裁决**） |
| D-W3-2 | `probe` 触发集按 ADR 字面「`steady === false` ∨ `phase !== 'ready'`」会让**相位未知**（未探测过）也判为异常 ⇒ 恢复卡永久压过 ref-action / discovery | 收窄为「**可行动的未就绪**」：相位存在 ∧ `steady === false` ∧ 相位 ∉ {`ready`,`probing`}（**登记为偏差**；数据源仍只用 `probe` 一项，`site` 触发逐字按 ADR）。门禁两种形态都断言 |
| D-W3-3 | 体积为**中间轮**重登记（W4/W5 还会重登记一次） | 已登记「中间轮」字样 + 五要素齐备（见 §4.4） |
| K-W3-1 | `test:binding` 4 次运行 2 绿 2 红（失败项 `#6l` 等，逐次不同） | **KL-N-10 环境性 flake 维持**（隔离复跑 ≥2 绿；不阻塞收口） |

---

## 5. 构建报告（R3 = W4 + W5，提交区间 **D**）

> 本段覆盖 **R3 = W4+W5**（`TASK-V45-113~119`，按 ADR-V45-012 §6 **单一原子提交区间 D**）。序列：`T114 ∥ T115` → `T113` → `T116` → `T117` → `T118` → `T119`。

| 维度 | 数值 |
|------|:--:|
| 完成任务数 | **7**（113 ✅ / 114 ✅ / 115 ✅ / 116 ✅ / 117 ✅ / 118 ✅ / 119 ✅） |
| 复杂度分布 | M×2（114 / 117）/ L×5（113 / 115 / 116 / 118 / 119） |
| 新增文件 | **0**（R3 只做门禁重锚 / 台账 / 登记 / 收口，无新源文件） |
| 修改文件 | src 1（纯文案）+ test 7 + docs 2（逐路径见下） |
| 体积 | **493,501 B**（**终轮 Δ = 0**；ceiling = floor(493,501 × 1.05) = **518,176 B**，档位 512,000 / 绝对上限 563,200 未下移） |
| density | **229 passed / 0 failed**（R2 为红-预期；本轮修复） |
| journey | **171 assertions**（R2 168；保护段第二次显式取代，新 pin `cc79f413…`） |

### 6.1 逐任务处置

**TASK-V45-113（L）—— journey 保护段第二次八步显式取代 + `supersessionChain` + 链式判据升级**

八步证据（每步可机核，`docs/v4-supersession-ledger.json#protectedSupersession`）：

| 步 | 落地内容 | 机核证据 |
|:--:|---|---|
| ① 记录 old | v4-1 段 `{43054..55259 / sha e2b500df… / 194 行 / supersededFrom 6b45c3fa… / leafBase a04e677}` **逐字**写入 `history[0]`（含上一轮 eightSteps / countEvidence / knownGap / newPin），顶层字段随后前移 | `git show a04e677:test/ui/journey.mjs` 按同一锚点复算 sha == e2b500df… ∧ 起始字节 == 43054（实测） |
| ② 逐段决策 | journey → `supersede`；binding → `keep`（T114） | 台账 `protectedSupersession.decision` + `protectedRanges[1].supersededFrom === null` |
| ③ `#15a~#15q` 等价改写 | `#15a` 不变；`#15b` 门槛逐字不动（新增 `#15b-0` 把「前置是 no-op」可机核）；`#15c` **加严**为出流契约；`#15d` 不变；`#15e` 不变 + 新增 `#15e-1`/`#15e-2`（卡序不被宿主切段 ∧ 产品自断言通过）；`#15f~#15q` 选择器重锚 | `test:ui` 171 assertions / 0 failed（新增 3 条全部 PASS） |
| ④ 登记 `modifiedRanges[]` | journey 改写区间逐条（base 相对行号 + `oldId` / `decision` / `reason` / `leaf`） | `modifiedRanges` = 163 条；逐行判据在 `npm test` 内实跑 |
| ⑤ 新 pin + 链 | `protectedRanges[0]` 重算 `{startByte 43054 / endByte 58287 / sha cc79f413… / 240 行 / supersededFrom e2b500df…（直接前驱）}`；新增 `supersessionChain[]`（3 链节：`6b45c3fa` → `e2b500df` → `cc79f413`） | 链长/连续性/覆盖/前任同源/newPin 同源 逐条断言 PASS；**已取代链节逐节复算**（2/2） |
| ⑥ 计数守恒 | journey 运行时 check 数 **167 → 171**（同编号改写 + 新增 3 条，只增） | `test:ui` 171 assertions |
| ⑦ `redlineRemap[]` 追加 | `#15b` ≥65%（门槛不动、锚点已换）；`#15c` 贴底 → 出流 + hidden + 父节点 == body | `redlineRemap` = 6 条（新增 2 条均 `status:"landed"` + evidence） |
| ⑧ RP-V4-08 复用实跑 | 段内改 1 byte ⇒ 新 pin sha 判据 FAIL；段外改 1 byte ⇒ 不红；删 1 条断言 ⇒ 计数下界 FAIL；逐字节还原 ⇒ PASS | `test/supersession` 35 passed（含 RP-V4-08 in-gate 反证 + 逐字节还原复核） |

**门禁判据等价升级（只增）**：v3 段 superseder 查找由 `supersededFrom` 等值升级为**链式**
（`supersededFrom === range.sha256 ∨ supersessionChain.some(l => l.sha256 === range.sha256)`），
且旧 pin 复算版本取**命中链节的 `leafBase`**；新增 `test/supersession-ledger.test.ts` 判据
「链长 ≥2 / 链连续性 / 链覆盖 v3+v4-1 pin / 前任同源 / newPin 同源 / history 保留 v4-1 段 /
**链不是装饰**（v3 pin 已不能由 legacy 等值命中）/ 已取代链节逐节复算」。
`test:supersession` **33 → 35**（+2，只增）。

**TASK-V45-114（M）—— binding 保段落地 + 段外逐行登记**

| 项 | 结果 |
|---|---|
| 段本体 | `startAnchor` 字节偏移 **107780**（显式断言）∧ 段 sha **be9ad0e9…** ⇒ **保段双绿**（无 superseder，走 v3 段严格路径） |
| 段前 `:896`（`#4b/#4c`） | `#notice` 节点 → 流内 `notice` 系统行；**字节中立**避让（Δ=52 B 由同一前置区装饰分隔线等量删白补偿） |
| 段后 `:2256`（`AP#4b`） | `#discovery-notice` → 流内 `probe` 行 + 行 `title`（自由改写，不影响 `startByte`） |
| `:880` `panelNotice` | **零触碰**（事件语义白名单，git diff 该行零变化） |
| 逐行登记 | `entries[]` 新增 `V45W2-E-13`（`#4b/#4c`）与 `V45W2-E-14`（`AP#4b`），`oldTitle` = 段内被删原表达式、`newTitle` 可在目标文件定位；`modifiedRanges` 已有 2 条 base 相对登记 |
| 门禁判据（只增） | `protectedPinFailures(bindingRange, currentText) === []` ∧ `byteOffsetOf(startAnchor) === 107780` ∧ 两条登记 `newTitle` 可定位 ∧ reason ≥40 |
| 3 反证（实跑） | ① 段内改 1 byte ⇒ sha 红；② 段前加 1 byte 不补偿 ⇒ `startByte` 红（且段本体 sha 不红）；③ 删除行改一字 ⇒ 台账覆盖判据红 |
| `KL-N-10` | 首轮 1 项红（`#6l`）；隔离复跑 **2 次**：① 192 passed / 0 failed ② 3 项红（`#8d`/`#8e` + 1）—— **如实登记，不阻塞收口** |

**TASK-V45-115（L）—— 11 处门禁等价重锚 + 反证注入点重写**

| 门禁 | 处置 | R2 | R3 |
|---|---|:--:|:--:|
| `test/ui/journey.mjs` | 保护段 3 条等价改写 + `newAddedSpans` 重锚（净 +45 行） | 168 | **171** |
| `test/ui/density.mjs` | 稳态锚三重构造判据 + 退役读数点重锚（`#l0-more` → 卡内 `#l1-more`、`#l0-ref-toggle` → 卡内 ref chip）+ RP-V3-02 注入量动态化 + RP-V4-02/03 空态档 | 红 | **229** |
| `test/ui/l1-reverse.mjs` / `l2-reverse.mjs` | 注入点随形态搬迁（R2 已重锚，本轮复跑） | 9 / 10 | **9 / 10** |
| `test/zero-injection.test.ts` | 新增解冻范围门禁 + 反证（2 条） | 3 `test(` | 5 `test(` |
| `test/supersession-ledger.test.ts` | 链式判据 + binding 保段判据 + 复算版本取链节 `leafBase` | 33 | **35** |
| `test/size-{baseline,ruling-vol3,growth-evidence}` | 方向机核 + 档位闸门 + 终轮零字节归因 | — | 12 / 6 |
| 其余 11 处（l0/l1/l2/page-input/stream/ask-auth/insight/hardening/recommendation/system-merge/env-guard/density-thresholds/l0-disclosure/l1-ref-validity/sidepanel-view） | R2 已重锚；本轮**逐条复跑**无回归 | 见 §4.5 | 见 §5.2 |

**反证注入点重写（R-V45-106 核心，**无恒绿判据**）**：
- RP-V3-02(b)：v3 的注入量「默认档 7 → 6」建立在「恰 7 可点」之上；v4-1 已把默认档取代为工具栏准入值 **5** ⇒ 上限 6 不再越界（**恒绿**）。改写为**动态注入量 = 实测 −1** + 新增前置断言证明越界成立；副本落点由 `/tmp` 改到 `test/ui/`（否则 `density-metrics.mjs#findPackageRoot()` 在 `/tmp` 下抛「density scope not found」⇒ 红是**环境错误**而不是断言失败，N-02 明令判为无效）。
- RP-V4-02/03：靶面是**空态**，夹具改走空态档（`emptyState: true`）—— 否则「空态」这一格不再空、欢迎占位不存在（旧的写法会以「夹具缺失」告终）。
- RP-V4-10（**新增**）：把构造序列最后一步延后 ⇒ 稳态锚 ①/③ 必红 → 补回 ⇒ 三项全绿；跨夹具顺序置换不产生新红。
- 逐条实跑结果见 §5.2.1。

**TASK-V45-116（L）—— density 31 格实测重算 + `v45Ledger` + 夹具三重构造判据**

- **夹具稳态锚（三重构造判据）**：`settledProbe` = ① 流内 `[data-msg-type="system"][data-kind="notice"]` 行**恰 1 行且非空**（退役 `#notice` 节点所承载事实的唯一可见载体）∧ ② `#stream` 内 `thinking`/`tool`/`command` **无未终态**卡 ∧ ③ 卡数 **== 登记期望**（逐档登记，含构造行）。构造走**产品自己的唯一系统通道**（`testing.systemRow()` → 真实 `system` 动作 → `appendSystem`），与 `testing.ask()` 造决策卡同一体例；**不回退** closeout 轮 F2/K-1 的确定性修复（无 sleep 兜底、无运行顺序依赖）。
- **档位特化（不是放松）**：`empty` 档的稳态载体**就是空态占位**（`#stream.empty` ∧ `.log-empty-text` ∧ notice 行 **0**）—— 该档定义即「零卡」，在那里构造 notice 行等于静默删掉空态覆盖面。三项结构（载体存在 ∧ 无未终态卡 ∧ 计数 == 期望）逐档同构。
- **首装档**：`onboarding` 推荐卡必须**构造**（`reset()` 会清掉启动期自然产生的那张卡，而「首装态」正是该档定义）；次序为**先推荐卡后决策卡**（推荐生产者对已开决策卡按优先级抑制 —— 先造卡再问才是产品里真实可达的次序）。`firstRun` 的载体判据等价改写为「首装引导的**流内**载体存在」（onboarding 卡 / 优先级更高的 site 恢复卡 / firstRun 行），替代已退役的 `#onboarding` 节点读数。
- **31 格 `v45Ledger`**（`docs/v4-density-baseline.json#v45Ledger.cells`）：`{cell, tier, vp, before, after, delta, measuredOn, source, reason, historyRetained}` 逐格齐备；`counts = {total 31, machineCompared 28, nominal 3, changed **1**}`；由 `stageF` 的「v45Ledger 逐格留痕」判据机核（格数 ∧ 六项字段 ∧ `after` 与 `#tiers` 当前登记值**同源**）。
- **本轮唯一变更格 = `risk(staleRef)@400`**：`7/7/18/237 → 6/7/17/232`（风险增量违规 1 → **0**、base 窗口漂移 `{clickables:1,blocks:1,chars:5}` → **0**）⇒ `direction = **tighten-only**`；旧值逐字保留在 `before`，`riskIncrementRegistry` 的对应期望重锚（`reanchorV45`，旧期望原文完整保留）。
- **零 diff 面**（逐字不动）：`thresholds` 7/15 · 9/20 · 17/35、`streamHeightRatioMin` 0.65、`logClientHeightFloor` 488、`registeredCells` 31、`perCardBudget`（含 aggregateLimit 8 / residentNavFormCriterion / aggregateCaliber）。
- **反证不空转**：RP-V3-01/02/03/04/08/09 与 RP-V4-01~07/09/10 **逐条实跑**（见 §5.2.1）；`RP-V4-08` 在 `test:supersession` 内实跑。
- **越阈停机规则**：本轮**未触发**（无登记格 C1/C2 越阈值）。

**TASK-V45-117（M）—— `options/index.html` 解冻 + 范围门禁 + `zero-injection` 复跑**

- **文案订正（纯文案行）**：`在侧栏「授权当前站点」，然后输入指令开始对话。` → `在侧栏「设置 → 站点与授权」点「授权当前站点」（或点「下一步推荐」卡中的「授权当前站点」），然后输入指令开始对话。`（与 FIX-2 的 4 处订正**逐字一致**口径）；全仓 `侧栏「授权当前站点」/ 侧栏『授权当前站点』` **零命中**（构建产物 `dist/options.html` 同步为新文案）。
- **`unfrozenZeroDiffFiles[]` schema 扩展**（9 字段）：`{file, scope:"copy-only-lines", reason, textBefore, textAfter, date, operator, frozenBy, reintroductionGate}` + `maxByteDelta`（256 B）+ `scopeGate`。
- **范围门禁（新增，只增）**：`test/zero-injection.test.ts` 内逐 hunk 机核 —— ① 字段齐备（10 项缺一即红）② `reason ≥40` ③ 字节差 ≤ 登记阈值（实测 **+101 B** ≤ 256）④ `textBefore` 在冻结版本可定位 ∧ `textAfter` 在当前文件可定位 ⑤ 解冻行不得引入 `<script>/<link>/<meta>/<iframe>/<object>/<embed>/import/href=/src=/on*`。
- **复跑不回归**：`test:zero-injection` **27 passed**（不退）；`docs/v3-supersession-ledger.json` **零 diff**（v3 冻结面）。
- **3 反证（实跑）**：① 注入 `<script src>` / 新增 `href=` ⇒ 范围门禁红（对照：纯文案行必须干净）；② 缺字段 / `reason < 40` / `maxByteDelta` 非正 ⇒ 字段门禁红；③ `textBefore`/`textAfter` 定位不到 ⇒ 登记失真红。

**TASK-V45-118（L）—— 体积五要素终轮登记 + `direction` 双向机核 + 三值同源 + 档位闸门**

| 要素 | 内容 |
|---|---|
| 日期 / 来源 | 2026-09-21 / `packages/web-cli-plugin/dist/sidepanel.js` |
| 构建命令 / 测量人 | `npm run build --workspace @lgdl/web-cli-plugin` / SDDU v4.5-1 R3（W4+W5） |
| 前值 → 后值 | **493,501 → 493,501 B（Δ = 0）**；`direction = **unchanged**` |
| 理由 | 终轮（W4+W5）**零字节**：R3 只改门禁 / 台账 / 文档；`src/**` 唯一改动是 `src/ui/options/index.html` 的纯文案行（**不进 `sidepanel.js`**） |
| 逐模块归因 | 真实 `dist/build-meta.json` 与 W3 轮**逐模块逐值相等** ⇒ Σ Δ = **0** + 未归因胶水 **0** == 登记增量 **0**（`SIDEPANEL_GROWTH_BREAKDOWN.v45W4W5Rows = []`，由 `size-growth-evidence.test.ts` 对真实 metafile 实跑） |
| ceiling | `floor(493,501 × 1.05) = **518,176 B**`（公式判定；`SIDEPANEL_CEILING_CAP` 仍 `record-only`、零判定用法） |
| 档位 / 绝对上限 | `ceilTo50KB(493,501) = **512,000**`（**未下移**） ⇒ `absoluteCeilingBytes = **563,200**` 不变 |
| 历史保留 | `SIDEPANEL_BASELINE_BYTES_HISTORY` / `_TIMELINE` / `SIDEPANEL_RE_REGISTRATIONS`（25 条）逐字保留；终轮单独登记为 `SIDEPANEL_W4W5_FINAL_ROUND`（不改写链条、不伪造「提升」） |

- **`direction` 机核双向支持（新增，只增）**：`SizeReRegistration.direction`（闭集 `raised` / `lowered` / `unchanged`）+ 纯函数 `reRegistrationDirectionProblems()`（`raised`⇒Δ>0 / `lowered`⇒Δ<0 / `unchanged`⇒Δ=0 / 非法值即红）+ `reRegistrationDirectionCoverageProblems()`（**每一轮**都必须声明，漏声明即红）。真实注册表 25 条 + `PICK_LAYER_RE_REGISTRATIONS` 2 条逐条声明（全部 `raised`，与各自 Δ 一致）+ 终轮 `unchanged`。
- **V3-VOL-3 三值同源（含订正）**：`PENDING_ABSOLUTE_CAP.newBaselineBytes = SIDEPANEL_BASELINE_BYTES`（同源）∧ `ceilTo50KB(...) === 512_000` ∧ `absoluteCeilingBytes === 563_200` ∧ `resolvedOn === '2026-09-19'`；台账 `v3Vol3Closeout.steps['⑤三值闭合'].newBaselineBytes` **479,021 → 493,501 同源前移**（R2/W3 只写了注、字段滞后 ⇒ 属**订正**，注原文保留）∧ `authorConfirmation.status` **保持 `pending-author-line`**（未获一句外部确认，不伪称已确认）。
- **档位不下移闸门**：`SIDEPANEL_TIER_FLOOR_BYTES = 460_801`（算术边界：`ceilTo50KB(b) = 512_000 ⟺ 460_801 ≤ b ≤ 512_000`）；断言 `newBaselineBytes ≥ 460_801 ∧ ceilTo50KB(...) === 512_000` ⇒ `test:size-ruling-vol3` **10 → 12**。
- **4 反证（实跑）**：① 用旧基线算 ceiling ⇒ 严格等式红；② 终轮 rows 非空 / metafile 与 W3 登记不等 ⇒ 零字节归因红；③ `direction:'raised'` 而 Δ≤0（及 `lowered`/`unchanged`/非法值/漏声明）⇒ 方向机核红；④ `SIDEPANEL_CEILING_CAP` 接回判定 ⇒ `record-only` 断言红（既有）。
- **停机规则**：净减 **0 B** ≤ 19,225 B ⇒ **未触发**。

**TASK-V45-119（L）—— 收口：24 门禁串行 + 红线逐字节 + 人工面清单 + 收口文档**

见 §5.2 / §5.3 / §5.7；收口文档（FIX-5 消解重述 / N-05 关闭登记 / `options` 解冻留痕 / `direction` 归因 / `knownGap` 一致性 / 台账计数）见 §5.8。

### 6.2 W4+W5 门禁实测（**严格串行，一次一个 Chromium**；日志全量 `/tmp/opencode/v4-gate-logs/v45-r3/final-*.log`）

| # | 门禁 | 基线（父 §6 门禁守恒总表） | R2 实测 | **R3 实测** | 判定 |
|:--:|---|:--:|:--:|:--:|:--:|
| 1 | `typecheck` | PASS | PASS | **PASS** | ✅ |
| 2 | `build` | PASS | PASS | **PASS** | ✅ |
| 3 | `plugin npm test`（node） | ≥1001 | 1037 | **1044** | ✅ +7 |
| 4 | `test:supersession` | ≥33 | 33 | **35** | ✅ +2 |
| 5 | `test:gate-integrity` | ≥12 | 12 | **13** | ✅ +1 |
| 6 | `test:zero-injection` | ≥27 | 27 | **27** | ✅ |
| 7 | `test:design-contract` | ≥6 | 6 | **6** | ✅ |
| 8 | `test:page-input` | ≥106 | 106 | **106**（首轮 1 项红=flake，隔离复跑 106/0） | ✅ |
| 9 | `test:l0` | ≥223 | 227 | **227** | ✅ |
| 10 | `test:l1` | ≥111 | 115 | **115** | ✅ |
| 11 | `test:l2` | ≥74 | 74 | **74** | ✅ |
| 12 | `test:density` | ≥175 | **红（预期）** | **229** | ✅ **修复** |
| 13 | `test:ui`（journey） | ≥167 | 168 | **171** | ✅ +3 |
| 14 | `test:insight` | ≥116 | 116 | **116** | ✅ |
| 15 | `test:binding` | ≥192 | 192（KL-N-10） | **192 / 0**（隔离复跑 ① PASS ② 3 项红） | ⚠️ **KL-N-10** |
| 16 | `test:hardening` | ≥24 | 24 | **24** | ✅ |
| 17 | `test:e2e` | PASS | PASS | **PASS** | ✅ |
| 18 | `test:stream` | ≥63 | 63 | **63** | ✅ |
| 19 | `test:ask-auth` | ≥61 | 61 | **61** | ✅ |
| 20 | `test:recommendation` | ≥56 | 59 | **59** | ✅ |
| 21 | `test:ref-pick-wiring` | ≥11 | 11 | **11** | ✅ |
| 22 | `test:size-ruling-vol3` | ≥10 | 10 | **12** | ✅ +2 |
| 23 | `test:l1-reverse` | ≥9 | 9 | **9**（反证全套 PASS） | ✅ |
| 24 | `test:l2-reverse` | ≥10 | 10 | **10** | ✅ |

> `CHROMIUM_GATES` 保持 **9**（元门禁断言）；`EXPECTED_AUDITED_FILES` 只追加（W1 已加 3 个 node 门禁路径）。
> `KL-N-10`（binding 环境性 flake）：首轮 `#6l` 1 项红 ⇒ 隔离复跑 **2 次**（① 192/0 绿；② `#8d`/`#8e` 3 项红，逐次不同）⇒ **如实登记不阻塞收口**（父 §5.3 停机规则）。
> `test:page-input` 首轮 1 项红（`F-01 前置（负控）`：救援原因读数在面板尚未收敛时读到「页面侧不可达」）⇒ 隔离复跑 **106 passed / 0 failed** ⇒ 同类环境性 flake，登记不阻塞。

#### 6.2.1 density 反证实跑（逐条：注入 → FAIL → 逐字节还原 → PASS）

| 反证 | 内容 | 结果 |
|---|---|:--:|
| RP-V3-01 | 注入 3 个额外可点 ⇒ C1 8 > 7 FAIL；移除 ⇒ PASS | ✅ |
| RP-V3-02 | **注入量重写**（副本阈值 = 实测 −1）+ 副本落点改 `test/ui/` ⇒ FAIL；原阈值驱动 ⇒ PASS；原文件 sha 不变 | ✅ 7/0 |
| RP-V3-03 | CSS 隐身不降 C1；`hidden` 是唯一豁免通道 | ✅ |
| RP-V3-04 | 篡改基线常量 ⇒ 机对 FAIL | ✅ |
| RP-V3-08 / RP-V3-09 | 阈值/口径篡改 ⇒ FAIL | ✅ |
| RP-V4-01~07 | 单卡 7 可点 / 首屏第 3 卡 / 第 2 张欢迎卡 / 欢迎 >8 行 / CSS 隐身 / 工具栏控件入流 / chip 入 hidden / 风险可见性 | ✅ |
| RP-V4-09 | 流内常驻导航入口 + 首屏合计 >8 ⇒ FAIL | ✅ |
| **RP-V4-10（新增）** | 构造序列**最后一步延后** ⇒ 稳态锚 ①（源行）与 ③（卡数）必红；补回 ⇒ 三项全绿；跨夹具顺序置换不产生新红 | ✅ |
| RP-V4-08（node 内） | 保护段内改 1 byte ⇒ FAIL；段外改 1 byte ⇒ 不红；逐字节还原 ⇒ PASS | ✅ |

### 6.3 保护段状态（本轮**第一次动 pin**）

| 保护段 | 取代前 | 取代后 | 证据 |
|---|---|---|---|
| journey `test/ui/journey.mjs` | `43054..55259` / sha `e2b500df…`（194 行） | **`43054..58287` / sha `cc79f413fa289ad6de3124602c21640edd36c6af51e8f12f0ebe4ce39d620da7`…（240 行）** | 链 `6b45c3fa → e2b500df → cc79f413`；已取代链节逐节复算 2/2；v3 pin 仍可从 `187c205` 逐字节复算；`startByte` 仍 **43054**（段外零字节改动） |
| binding `test/ui/binding.mjs` | `107780..115930` / sha `be9ad0e9…` | **不变**（`decision:"keep"`，`supersededFrom:null`） | 段前字节中立避让 ⇒ `startByte` 逐字节 107780 ∧ 段 sha be9ad0e9… **双绿** |

> `protectedSupersession.history[0]` = v4-1 段**逐字记录**（含上一轮 eightSteps / countEvidence / knownGap / newPin / assertionRewrite）；`status = complete-steps-1-8` ⟺ `knownGap = 「V4.5-1 第二次取代闭环（残余：无）」`（一致性由 I1 判据机器强制）；`knownGapHistory` 追加且保留「未完成」历史原文。

### 6.4 R3 台账登记（`docs/v4-supersession-ledger.json`）

| 面 | 计数（**实测后填值**） |
|---|:--:|
| `entries[]` | **186**（W4+W5 新增 4：`V45W2-E-13` / `V45W2-E-14` / `V45R3-E-01` / `V45R3-E-02`；`V41-R3-E-08` / `V41-R3-E-10` 的 `newTitle` 按 W3 先例**重锚**，id/oldTitle 零改动） |
| `modifiedRanges[]` | **163**（journey 段外两条改写区间逐条登记） |
| `redlineRemap[]` | **6**（新增 2 条：`#15c` 出流 / `#15b` 前置 no-op 化） |
| `leafBases[].registeredUncoveredLines` | 187c205 **850**/22 · 0f8a1fb **227**/17 · eb879bb **137**/12 · 7cbe04c **75**/7 · **a04e677 581/24**（W4+W5 逐字补登：journey 12 + supersession-ledger 2 + density 20 + 注释修正 0） |
| `unfrozenZeroDiffFiles[]` | **3**（新增 `src/ui/options/index.html`，9 字段 + `maxByteDelta`） |
| `supersessionChain[]` | **3** 链节 |
| `v45Ledger`（density 文件） | **31** 格（28 实测机对 + 3 名义），`changed = 1` |

> 台账 `newTitle` 可定位性与 `oldTitle` 真实性、hunk ↔ 条目逐行命中、`reason ≥ 40`、叶段逐字集合相等 —— 全部在 `npm test`（1044 passed）内实跑。

### 6.5 红线逐字节核验表（**全项**）

| 红线 | 登记值 | 实测 | 判定 |
|---|---|---|:--:|
| N7 `dist/content.js` | 177,076 B / sha `52a826205553b46a896ccad54225d63ba62f5f7fe7c969a9bc2e655448d5b5f6` | 177,076 B / `52a82620…` | ✅ |
| N8 `dist/pick-layer.js` | 33,900 B / sha `5f567d7ededc58183afe4ce45e3293b68204dfbe788dc6b9fb09bdc6e0d13e59` | 33,900 B / `5f567d7e…` | ✅ |
| N9 `design/**` + `option-f-shim.mjs` | 双 sha 零触碰 | `git status` 零输出 | ✅ |
| N10 `manifest.json` | 零新增权限 / 无 `contextMenus` / 判定链内容哈希零改动 | `git status` 零输出（`test:zero-injection` 静态面复跑绿） | ✅ |
| N11 `docs/v3-supersession-ledger.json` | 零 diff（冻结历史） | `git status` 零输出 | ✅ |
| N2 `DENSITY_EXCLUDED_SUBTREES = ['#stream']` | 单源不动 | 零 diff（`density-scope.ts` 未改） | ✅ |
| N3 密度阈值 7/15 · 9/20 · 17/35 | 逐字不动 | `thresholds` 零 diff（`v45Ledger` 同源判据） | ✅ |
| N6 `STREAM_HEIGHT_RATIO_MIN = 0.65` | 只允许上调 | 未改（journey `#15b` 逐条 PASS） | ✅ |
| N16 `SIDEPANEL_CEILING_CAP` | `record-only` | 未接回判定（既有断言 PASS） | ✅ |
| N17 V3-VOL-3 三值 | 512,000 / 563,200 / `pending-author-line` | 三值同源 + 状态保持 | ✅ |
| 不动面 T1~T10 | `packages/web-cli-base/**` / `.opencode/opencode.json` / `ROADMAP.md` / F-29 区段 / `src/content/**` / `design/**` / `manifest.json` / v3 台账 | `git status --short` 对这些路径**零输出** | ✅ |
| N15 `git add` | path-limited（禁 `-A` / `.`） | 提交时逐路径 `git add`（见 §5.9） | ✅ |

### 6.6 人工面清单（**不得冒充 PASS**）

| # | 项 | 状态 |
|:--:|---|:--:|
| 1 | `title` 承载长文案的读屏体验（`V45-P-014`：行 `title` 作为长文案唯一载体时，屏幕阅读器是否朗读 / 朗读粒度） | **⏳ 未执行**（无读屏环境；需真机 + 读屏软件） |
| 2 | 三主题（light / dark / auto）与高 DPI（≥2×）下**迁入块**（`#l2-tree-attribution` / `#l2-audit-evidence` / 卡内 ref 恢复区）可读性（EC-V45-009） | **⏳ 未执行**（需真机目视） |
| 3 | 320px 窄侧栏下**迁入块**可读性（EC-V45-009） | **⏳ 未执行**（需真机目视） |

> 以上三项均为 `⏳ 未执行`；**未**以任何自动判据冒充人工验收。

### 6.7 已知偏差与停机规则（含 **D-W3 裁决记录**）

| # | 事项 | 处置 |
|---|---|---|
| **D-W3-1** | `NEVER_FOLDABLE` 的 3 个新增项与 ADR-V45-002 §5 字面不同（ADR 写 `l2-tree-attribution` / `l2-audit-evidence`，但该两项同时在 `COLLAPSIBLE_TARGETS` 里 ⇒ 与「两表互斥」断言自相矛盾） | **裁决：ADR 字面在该点上不可同时满足**（两表互斥是更强的一致性约束）。R2 已按「新增真实存在且从未可折叠的面」实现（`region-stream` / `settings-root` / `settings-help`，长度 14 与 ADR 一致），`l2-*` 留在白名单。**本轮复核维持**；两表互斥由新增断言守住，`l1-reverse`/`l2-reverse` 复跑无回归 ⇒ 记为**已裁决偏差**（不改 ADR 正文，理由留在 build.md + §5.8）。 |
| **D-W3-2** | `probe` 触发集按 ADR 字面「`steady === false` ∨ `phase !== 'ready'`」会让**相位未知**（未探测过）也判为异常 ⇒ 恢复卡永久压过 ref-action / discovery | **裁决：收窄为「可行动的未就绪」**（相位存在 ∧ `steady === false` ∧ 相位 ∉ {`ready`,`probing`}）。理由：ADR 的目的是「异常可恢复」，把「还没探测」判成异常会让首屏永远显示恢复卡（与 FR-V45-025 的空态去噪直接冲突）。R3 复核：`test:recommendation` 59 passed、density 三档恢复卡断言全绿 ⇒ 记为**已裁决偏差**。 |
| **D-W3-3** | W3 的体积重登记是「**中间轮**」，W4+W5 还会再登记一次 | **本轮已收口**：终轮登记为 **Δ = 0 / `direction: 'unchanged'`**（见 §5.5 的 §5.1 T118 表）；「中间轮」字样保留在 W3 注中。 |
| **D-R3-1** | `risk(staleRef)@400` 登记格下降（`7/7/18/237 → 6/7/17/232`） | **重登记（`direction = tighten-only`）**：风险步在该视口不再越过折线 ⇒ 违规 1→0、漂移 →0。旧值逐字保留在 `v45Ledger.before` 与该格 `before`；`riskIncrementRegistry` 对应期望回到 `defaultExpectation`（旧期望原文完整保留在 `reanchorV45.previousExpectation`）。**收紧**是允许方向；**未**放宽任何阈值。 |
| **D-R3-2** | `v3Vol3Closeout.steps['⑤三值闭合'].newBaselineBytes` 字段滞后（479,021）而注已写新值 | **订正**：字段同源前移到 **493,501**（注原文保留 + 新增 `v45ReRegistration` 说明「字段与注脱钩」）；由新判据机器强制（字段 ≠ 源码常量即 FAIL）。 |
| **K-R3-1** | `test:binding` 首轮 1 项红（`#6l`）；隔离复跑 ① 192/0 ② 3 项红（`#8d`/`#8e`） | **KL-N-10 环境性 flake 维持**：隔离复跑 ≥2 次、逐次不同 ⇒ 如实登记，**不阻塞收口**（父 §5.3）。 |
| **K-R3-2** | `test:page-input` 首轮 1 项红（`F-01 前置（负控）`） | 隔离复跑 **106/0** ⇒ 同类环境性 flake，登记不阻塞。 |
| **KL-N-10 复跑纪律** | 隔离 ≥2 次、日志全量 | `/tmp/opencode/v4-gate-logs/v45-r3/r3-binding-rerun{1,2}.log` |
| **停机规则核查** | 6 条 | binding 补偿可行（`keep-feasible` 兑现）· journey 新 pin 命中且链连续（非 `report-to-orchestrator`）· 净减 0 ≤ 19,225 B · 无密度格越阈 · **无恒绿判据**（RP-V3-02/RP-V4-02/03 的注入点已重写并实跑）· 台账 `newTitle` 全部可定位 ⇒ **6 条全部未触发** |

### 6.8 收口文档（4 项治理动作 + 2 项一致性）

| 治理动作 | 处置 |
|---|---|
| **FIX-5 消解重述** | FIX-5（空态 L1 噪音：`更多选项（还有 0 个）` / `引用 0 条` / `归属（局部树）· 0 个节点` / `已决策 0 步` / `回执证据（0 行）` 恒驻首屏）**已由核心 2 覆盖而消解**（FR-V45-025 / DC-V45-009）：四个开关所在宿主（`l1-panels`）与 `#l0-more` 等壳元素整体退役，0 计数控件**不再存在于任何常驻面** ⇒ 不需要独立成条、不单列 AC。**非静默遗留**：本轮 `test:density` 空态档（`#stream.empty` ∧ 欢迎占位 ∧ **零卡**）229 passed、`test:l0` 227 passed（含 14 个退役容器逐项负向）逐条覆盖。 |
| **N-05 关闭登记** | N-05（「一键重锚」按钮的落点口径）**关闭**：`#l1-ref-rescue` 现由 `cards/ref.ts` 在**最新 ref 卡**的恢复区铸造，`canReanchor()` 谓词逐字不变（EC-V45-005 随此关闭）；证据：`test:page-input` 106 passed（救援流程先在卡内铸造再驱动）+ `test:l1-reverse` 9 passed（RP-L1-E 锚点随元素卡内化重锚）。 |
| **`options` 解冻留痕** | 范围 / 理由 / 前后文案 / 日期 / 操作者 / 冻结来源 / 再引入闸门 ⇒ `docs/v4-supersession-ledger.json#unfrozenZeroDiffFiles[2]`（9 字段 + `maxByteDelta`）；`docs/v3-supersession-ledger.json` **零 diff**；范围门禁逐 hunk 机核（`test/zero-injection.test.ts`）。 |
| **`direction` 归因** | 终轮 = **`unchanged`（Δ = 0）**。**净减归因不适用**：本 Feature 的净减只出现在 **W1+W2 的 `sidepanel.ts` 单模块**（−1,061 B，被同轮其余 5 个模块的增重覆盖 ⇒ 轮总 +870 B），而 R3 对 `sidepanel.js` **零字节改动**。`direction` 双向机核已落地（`raised`/`lowered`/`unchanged` 三向 + 非法值 + 漏声明），反证逐条实跑。 |
| `knownGap` 一致性 | `status = complete-steps-1-8` ⟺ `knownGap = 「V4.5-1 第二次取代闭环（残余：无）」`；`knownGapHistory` 追加保留上一轮「未完成」原文（I1 判据机器强制）。 |
| 台账计数 | `entries` **186** / `modifiedRanges` **163** / `redlineRemap` **6** / `unfrozenZeroDiffFiles` **3** / `supersessionChain` **3** / 叶段登记 **1,870 行 / 82 文件槽位**（**实测后填值**，非预填）。 |

### 6.9 提交（**单一原子区间 D**）

```
refactor(web-cli-plugin): v4.5 W4+W5——journey 二次取代/密度重算/体积三值同步/收口（原子区间）
```

`git add` **逐路径**（禁 `-A` / `.`）：`packages/web-cli-plugin/src/ui/options/index.html`、
`packages/web-cli-plugin/test/{size-baseline.ts,size-growth-evidence.test.ts,size-ruling-vol3.test.ts,supersession-ledger.test.ts,zero-injection.test.ts}`、
`packages/web-cli-plugin/test/ui/{density.mjs,journey.mjs}`、
`packages/web-cli-plugin/docs/{v4-density-baseline.json,v4-supersession-ledger.json}` +
本叶 SDDU 产物（`build.md` / `state.json`）。区间 D 的产物（终态 DOM + 新 pin + 密度台账 + 体积登记 + 门禁日志）**一次落盘**（R-V45-109）。

---

## 6. 任务完成清单

| 任务 | 名称 | 复杂度 | 状态 | 对应 FR |
|------|------|:--:|:--:|------|
| TASK-V45-101 | 门禁脚手架三件套 + 受审集合追加 + 计数只增对账表 | M | ✅ completed | FR-V45-003 / 004 / 030 / 040 / 060 |
| TASK-V45-102 | **spikeGate-A** binding 段前字节中立避让可行性探针 | S | ✅ completed（`keep-feasible`） | FR-V45-081 |
| TASK-V45-103 | **spikeGate-B** journey 等价改写 + 链式 superseder 预演 | S | ✅ completed（`eight-steps-feasible`） | FR-V45-080 / 083 / 084 |
| TASK-V45-104 | `STRIP_CHANNEL_KINDS` 重构 + `appendSystem` 单写收口 | L | ✅ completed | FR-V45-011 / 012 / 015 |
| TASK-V45-105 | 5 条提示带 DOM 真退役 + `firstRunCard` 归并 + `title` 净化承载 | L | ✅ completed | FR-V45-010 / 013 / 014 / 025 |
| TASK-V45-106 | strips 15 门禁 / 44 处断言重写 + 载体数 == 1 + 4 组反证 | L | ✅ completed | FR-V45-015 / 011 / 010 |
| TASK-V45-107 | `messageAnchor` 迁移 + 4 宿主 DOM 移除 + `#stream` 纯卡序 | M | ✅ completed | FR-V45-020 / 024 |
| TASK-V45-108 | `decision` 壳元素卡内化（ref 卡 / askuser·auth 卡 / receipt 固化区） | L | ✅ completed | FR-V45-021 / 026 |
| TASK-V45-109 | `l1-panels` 4 开关去向 + L2 只读承载块 | L | ✅ completed | FR-V45-022 / 026 |
| TASK-V45-110 | `#composer` 出流 + `disclosure.ts` 三份声明重写 | M | ✅ completed | FR-V45-023 / 026 |
| TASK-V45-111 | host-registry 零宿主判据 + `RETIRED_*` 扩容 + l0 结构判据 + 5 组反证 | M | ✅ completed | FR-V45-060~062 |
| TASK-V45-112 | risk-recovery 扩展 + act 闭集 6 项 + 布线门禁 + 设置「帮助」分区 | L | ✅ completed | FR-V45-030~033 / 040~042 |
| TASK-V45-113 | journey 第二次八步显式取代 + `supersessionChain` + 链式判据升级 | L | ✅ completed | FR-V45-080 / 082 / 083 / 084 |
| TASK-V45-114 | binding 保段落地 + 段外逐行登记 | M | ✅ completed | FR-V45-081 |
| TASK-V45-115 | 11 处门禁等价重锚 + 反证注入点重写 | L | ✅ completed | FR-V45-082 / 084 |
| TASK-V45-116 | density 31 格实测重算 + `v45Ledger` + 夹具三重构造判据 | L | ✅ completed | FR-V45-070~074 |
| TASK-V45-117 | `options/index.html` 解冻 + 范围门禁 + `zero-injection` 复跑 | M | ✅ completed | FR-V45-050 / 051 / 052 |
| TASK-V45-118 | 体积五要素终轮登记 + `direction` 双向机核 + 三值同源 + 档位闸门 | L | ✅ completed | FR-V45-090~093 |
| TASK-V45-119 | 收尾原子区间：24 门禁串行 + 红线逐字节 + 人工面清单 + 收口文档 | L | ✅ completed | FR-V45-001~004 / 084 / 093 |

---

## 7. 下一步

| 场景 | 操作 |
|------|------|
| R3 收口后（**19/19 任务完成**） | 运行 `@sddu-review specs-tree-v45-1-single-write-chronology` 开始**代码审查**（随后 `@sddu-validate`） |
| 人工面三项（§6.6） | 需真机 + 读屏 / 目视，`⏳ 未执行`（不得在 review/validate 中被冒充为 PASS） |
| `KL-N-10` / `K-R3-2` flake | 已在 §6.7 登记；后续轮次继续沿用隔离复跑纪律（≥2 次、日志全量） |

---

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建（R1 = W1 + W2；含双 spikeGate 结论原文与量化证据） | 2026-09-21 | SDDU Build Agent |
| v1.1 | 追加 R2 = W3（TASK-V45-107~112）：逐任务处置 / 卡内化与四去向映射 / 门禁等价重锚对账 / 体积中间轮五要素 / 台账登记 / 保护段状态 / 偏差与 flake 登记 | 2026-09-21 | SDDU Build Agent |
| v1.2 | 追加 R3 = W4+W5（TASK-V45-113~119，**单一原子区间 D**）：journey 第二次八步显式取代（新 pin `cc79f413…` + 3 链节）/ binding 保段双绿 + 两处段外改写逐行登记 / 11 处门禁等价重锚 + 反证注入点重写（RP-V3-02 与 RP-V4-02/03 的**恒绿**修复 + 新增 RP-V4-10）/ density 三重构造判据 + 31 格 `v45Ledger`（**红 → 229 passed**）/ options 解冻 9 字段 + 范围门禁 / 体积终轮 `unchanged`（Δ=0）+ `direction` 双向机核 + 三值同源订正 + 档位闸门 / 24 门禁串行实测 + 红线逐字节核验表 + 人工面清单（全部 `⏳ 未执行`）+ 4 项治理动作 + D-W3 裁决记录 | 2026-09-21 | SDDU Build Agent |
