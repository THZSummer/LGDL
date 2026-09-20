# 任务分解：specs-tree-v45-1-single-write-chronology（V4.5-1 单写化 + 宿主时间序化）

> **文档定位**: SDDU 任务清单（**唯一叶 = 实施承载**）— 19 个原子任务（`TASK-V45-101~119` / 叶内别名 `V451-01~19`），按 **ADR-V45-012 五波** 展开；**权威跨切契约见父 `../plan.md` + 父 `../tasks.md`**
> **前置依赖**: 本叶 `plan.md` v1.0（ADR-V45-001~012 全部正文 + §5 文件影响 63 项 + §6 风险）+ 父 `../plan.md` v1.0（跨切契约 / 红线继承 N1~N18 / 不动面 T1~T10 / 五波序）+ 父/叶 `spec.md` v1.0（44 FR / 22 AC / §11 37 条元素去向）+ 父 `../discovery.md` v1.0（R-REG-001~015 + R-REG-901~906）
> **创建人**: SDDU Tasks Agent
> **创建时间**: 2026-09-21
> **版本**: v1.0
> **更新人**: SDDU Tasks Agent
> **更新时间**: 2026-09-21
> **更新说明**: 初始创建（19 原子任务 / 5 波；W1 门禁脚手架+断言预迁移 → W2 strips 单写 → W3 宿主退役+元素迁移 → W4 门禁重算+journey 取代+密度 → W5 收尾；**W4+W5 同一原子 commit 区间**；含 2 个 **spikeGate** 闸门任务 + 每任务 **红线检查点** 三段清单）

---

## 0. 红线与纪律（本叶，**继承父 N1~N18**）

### 0.1 冻界面（`F*`）/ 阈值面（`T-*`）/ 台账面（`L-*`）三段代号（本文件「红线检查点」栏引用）

| 代号 | 面 | 内容（逐字守线） |
|:--:|---|---|
| **F1** | 冻界面 | `design/**` + `design/ui-redesign/option-f-shim.mjs`（双 sha256 + 60 断言）**零触碰**；12 卡类型学 `CARD_TYPES` 零扩展 |
| **F2** | 冻界面 | `src/content/**` / `dist/content.js`（177,076 B / `52a82620…`）/ `dist/pick-layer.js`（33,900 B / `5f567d7e…`）**零改动** |
| **F3** | 冻界面 | SW / `KIND_SET` / 判定链（`policy.ts` / `auto-authorize.ts` 内容哈希 pin）/ `manifest.json`（零新增权限、无 `contextMenus`）**零改动** |
| **F4** | 冻界面 | `docs/v3-supersession-ledger.json` **零 diff**（冻结历史）+ `zeroDiffFiles` 其余 8 项逐字节不变 |
| **F5** | 冻界面 | `packages/web-cli-base/**` / `.opencode/opencode.json` / `ROADMAP.md` / F-29 区段 **零改动**；兼容读取面 id（`#composer`/`#input`/`#send`/`#settings-back`/`#rebind`/状态栏 ids/`#l2-title`/`#l2-count`/`#view-host`）保留 |
| **T-a** | 阈值面 | 密度阈值 `default 7/15` · `firstRun 9/20` · `risk 17/35`；`DENSITY_EXCLUDED_SUBTREES = ['#stream']`（全仓唯一声明）；防滥用（单卡 ≤6 / 首屏 ≤2 / 合计 ≤8 / 欢迎卡 ≤1 / 文案 ≤8 行）；`registeredCells` 31 —— **零 diff** |
| **T-b** | 阈值面 | `STREAM_HEIGHT_RATIO_MIN = 0.65`（**只允许上调**）+ `logClientHeightFloor` + `streamRatioSpike` —— 门槛不动，锚点可换 |
| **T-c** | 阈值面 | 体积：`SIDEPANEL_CEILING == floor(baseline × 1.05)`（**无 cap**）；`SIDEPANEL_CEILING_CAP` 保持 `record-only` **不得被读取**；**档位不下移**（`ceilTo50KB(b) === 512_000 ⟺ 460_801 ≤ b ≤ 512_000`）；`absoluteCeilingBytes === 563_200`；`authorConfirmation.status === 'pending-author-line'` |
| **T-d** | 阈值面 | 单通道 4 规则常量逐字（`SYSTEM_DEDUPE_WINDOW_MS = 5000` / `SYSTEM_ROWS_PER_MINUTE_CAP = 20` / `持续：` 前缀 / 净化白名单） |
| **T-e** | 阈值面 | `MAX_CHIPS_PER_CARD = 3` / `MAX_NEXTSTEP_CARDS_PER_ROUND = 1` / `NEXTSTEP_SOURCE_WHITELIST` **7 项零扩项** / `RECOMMEND_MODULE_WHITELIST === ['./stream-plaintext.js']` / `MAX_OPEN_ASKS` 语义 |
| **L-a** | 台账面 | `packages/web-cli-plugin/docs/v4-supersession-ledger.json`：`protectedRanges` / `supersessionChain` / `protectedSupersession` / `modifiedRanges[]` / `redlineRemap[]` / `entries[]` / `unfrozenZeroDiffFiles[]` / `leafBases[]` / `v3Vol3Closeout` |
| **L-b** | 台账面 | `packages/web-cli-plugin/docs/v4-density-baseline.json`：`v45Ledger` / `riskIncrementRegistry`（4 溯源字段 `rulingId`/`rulingDate`/`approvedBy`/`reason` 缺一 FAIL）/ 夹具锚说明 |
| **L-c** | 台账面 | `test/size-baseline.ts` 五要素 + `SIDEPANEL_BASELINE_BYTES_HISTORY` + `_TIMELINE` + `SIDEPANEL_RE_REGISTRATIONS` + `SIDEPANEL_GROWTH_BREAKDOWN` |

### 0.2 纪律（**逐字继承父 §2.4 / §15**）

| # | 纪律 | 守线任务 |
|---|------|---------|
| 1 | **断言零删除零降级、计数只增不减**（唯一例外 = 保护段显式八步取代 + 台账留痕） | 全任务；重点 T106 / T113 / T115 |
| 2 | **反证必须实跑**（注入 → FAIL（声明 `expectFailPattern`）→ 逐字节 sha256 还原 → PASS），**注入点被搬走必须重写**（禁判据空转 / 禁「删属性充数」） | T106 / T111 / T113 / T114 / T115 / T116 |
| 3 | **禁 `hidden` 充数 / 禁保留 id 空壳 / 禁宿主换名或塞进卡内**（零宿主判据任意深度） | T107 / T111 |
| 4 | **门禁严格串行**（一次一个 Chromium，`finally` 自清 profile；`test`/`test:ui`/`test:binding` 绝不并发）；日志 `tee` 全量落盘（禁截断） | T115 / T116 / T119 |
| 5 | `KL-N-10`（binding 环境性 flake）：首轮异常**隔离复跑 ≥2**、日志全量、仍红**如实登记不阻塞收口** | T114 / T119 |
| 6 | 停机规则：**保护段链断 / 体积过界 / 密度越阈 / 反证恒绿 / binding 等长补偿不可行 ⇒ 停下上报编排器**（禁静默弱化、禁静默改 pin、禁为凑档位故意增重、禁静默放宽阈值） | T102 / T107 / T113 / T114 / T116 / T118 |
| 7 | `git add` **path-limited**（禁 `git add -A` / `.`）；不 force push；不合 `main`；无新依赖 | T119 |
| 8 | 「零宿主」判据不得被**改名 / 隐藏 / 塞进卡内**绕过（5 组伪造 reading 逐组红） | T111 |
| 9 | `notice` 同名语义（事件 / 会话语义）**白名单零触碰**；迁移以 `getElementById('notice')` / `#notice` 选择器为**唯一判据** | T105 / T106 |
| 10 | 人工面逐项标注（`⏳ 未执行` 或 `PASS`，**不得冒充 PASS**） | T119 |

### 0.3 编号与规模

| 项 | 值 |
|---|---|
| 全局编号段 | **`TASK-V45-1xx`**（新命名空间；与 v1 `TASK-001~040` / v2 `2xx~3xx` / v3 `4xx` / v4 `5xx~8xx` **零冲突**；本轮实测 `grep -rn "TASK-V45" .sddu/ = 0`） |
| 叶内别名 | `V451-01~19` |
| 任务总数 / 波数 | **19 / 5** |
| 规模分布 | **S×2 / M×6 / L×11** |
| 模板偏差登记 | 模板 §8 建议「5~15 个」；本轮 **19** —— 理由：编排器明定「按 W1~W5 五波展开」且**覆盖面必含 14 项**（①~⑭），其中 W3 独占 6 项（宿主退役 + 三类元素去向 + composer + 注册表 + 恢复扩展），过并会破坏「每任务独立可验证」；与 v2/v3/v4 叶子先例（9~17 任务）同量级 |
| 与 plan 估算的关系 | plan §8.1 估「~52~58 工作项」；本轮按「**独立可验证交付物**」聚合为 19 原子任务（平均每任务 ≈3 工作项），不改变工作量口径 |

### 0.4 W4+W5 原子区间（**硬约束**）

`TASK-V45-113 ~ TASK-V45-119` 作用于**同一终态 DOM**，其产物（新 pin + 密度台账 + 体积登记 + 门禁日志）**必须落在同一 commit 区间**；中间态（改了实现但未重算 / 未登记）**不得单独提交**（R-V45-109）。失败 ⇒ **回滚整个区间**并重跑受影响门禁。W1~W3 各为一个 commit 区间（共 4 个区间）。

---

## 1. 依赖拓扑总览

```
[前置] plan.md（ADR-V45-001~012）+ spec.md（44 FR / 22 AC / §11 37 条去向）+ 父计划跨切契约

Wave 1 ── 门禁脚手架 / 断言预迁移（提交区间 A）
  TASK-V45-101 [M] 3 新 node 门禁骨架 + 受审集合追加 + 计数只增对账表
  TASK-V45-102 [S] spikeGate-A：binding 段前字节中立避让可行性探针   ← 闸门 → W4/T114
  TASK-V45-103 [S] spikeGate-B：journey #15a~#15q 等价改写 + 链式 superseder 预演 ← 闸门 → W4/T113

Wave 2 ── strips 单写（提交区间 B）        ※ 串行纪律：104 → 105 → 106
  TASK-V45-104 [L] STRIP_CHANNEL_KINDS 重构 + appendSystem 单写收口 + #send-reason 保留
  TASK-V45-105 [L] 5 条提示带 DOM 真退役 + firstRunCard 归并 + title 净化承载
  TASK-V45-106 [L] strips 15 门禁 / 44 处断言重写（≥原值）+ 载体数 == 1 + 4 组反证

Wave 3 ── 宿主退役 + 元素迁移（提交区间 C）  ※ index.html / sidepanel.ts / view-model.ts 共享 ⇒ 严格串行
  TASK-V45-107 [M] messageAnchor 迁移（→ null）+ 4 宿主 DOM 移除 + #stream 纯卡序
  TASK-V45-108 [L] decision 壳元素卡内化（ref 卡 / askuser·auth 卡 / receipt 固化区）
  TASK-V45-109 [L] l1-panels 4 开关去向 + L2 只读承载块（树归因 / 审计证据 / 审计计数）
  TASK-V45-110 [M] #composer 出流 body 尾 + disclosure.ts 三份声明重写
  TASK-V45-111 [M] host-registry 零宿主反向判据 + RETIRED 扩容 + l0 结构判据 + 5 组伪造反证
  TASK-V45-112 [L] risk-recovery 扩展 + act 闭集 6 项 + 本地 act 布线门禁 + 设置「帮助」分区

Wave 4+5 ── 收口（提交区间 D，**单一原子区间**）
Wave 4 ── 门禁重算 + journey 取代 + 密度
  TASK-V45-113 [L] journey 第二次八步显式取代 + supersessionChain + 链式判据升级
  TASK-V45-114 [M] binding 保段落地 + 段外逐行登记（可与 115 并行）
  TASK-V45-115 [L] 11 处门禁等价重锚 + 反证注入点重写
  TASK-V45-116 [L] density 31 格实测重算 + v45Ledger + 夹具三重构造判据
Wave 5 ── 收尾
  TASK-V45-117 [M] options 解冻 + 范围门禁 + zero-injection 复跑（可与 W4 并行准备）
  TASK-V45-118 [L] 体积五要素双向登记 + V3-VOL-3 三值同源 + 档位闸门
  TASK-V45-119 [L] 24 门禁串行 + 红线逐字节 + 人工面清单 + 收口文档
```

**关键路径（严格串行）**：
`101 → 104 → 105 → 106 → 107 → 108 → 109 → 110 → 111 → 112 → 115 → 113 → 116 → 118 → 119`（15 个任务在路径上）
**可并行**：`102 ∥ 103 ∥ 101`（只读探针，不落门禁文件）；`114 ∥ 115`（文件不相交）；`117 ∥ 113/114/116`（独立文件，但 `zero-injection` 复跑须进串行门禁队列）。
**spikeGate（先验闸门）**：`TASK-V45-102` → `TASK-V45-114`；`TASK-V45-103` → `TASK-V45-113`。闸门结论为 `report-to-orchestrator` 时，对应下游任务**暂停**（不得静默改 pin / 不得静默降级）。

---

## 2. 任务列表

### TASK-V45-101（V451-01）: 门禁脚手架三件套 + 受审集合追加 + 计数只增对账表
| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | 无（W1 首） |
| **执行波次** | 1 |
| **对应 FR / AC** | FR-V45-003 / 004 / 030 / 040 / 060 · AC-V45-016 / 021 |
| **ADR / 风险** | ADR-V45-012 / 010 / 007 / 008 · R-REG-011 · R-REG-009 |
| **并行度** | 可与 T102 / T103 并行（文件不相交）；本任务自身串行 |

**输入**: 本叶 `plan.md` ADR-V45-012 §1 + §5.2（3 个 NEW 门禁清单）+ §2.1 A28（`CHROMIUM_GATES.length === 9` / `EXPECTED_AUDITED_FILES` 下界）+ A29（18 门禁基线计数）。

**动作**:
1. 新建 `packages/web-cli-plugin/test/host-registry.test.ts` / `test/local-act-wiring.test.ts` / `test/settings-help.test.ts` **骨架**：导出判据函数（供伪造源码反证）+ 预留 5 / ≥3 / 4 组反证位 + 每条判据的 `expectFailPattern` 声明位。
2. `test/gate-integrity.test.ts`：`EXPECTED_AUDITED_FILES` 追加上述 3 项（**只追加**）；**确认 `CHROMIUM_GATES.length === 9` 不变**；例外说明文本追加。
3. 输出「断言零删除 / 计数只增」**对账表**（18 门禁：基线 → 本轮目标下界 → 改写方式），落入本叶 `state.json#taskCounts.testConservation`。

**产出**: 3 个新 node 门禁骨架（可红，需声明 `expectFailPattern`）+ 受审集合追加 + 对账表。

**验收标准（可机核）**:
- [ ] `CHROMIUM_GATES.length === 9`（等值断言未改）
- [ ] `EXPECTED_AUDITED_FILES` ⊇ 3 个新门禁路径，且原集合为子集（只追加）
- [ ] 3 个新文件各自导出 ≥1 个判据函数 + 每条判据有 `expectFailPattern` 字面
- [ ] 对账表覆盖 18 门禁且每行「目标下界 ≥ 基线」

**红线检查点**: 冻界面 `F1`/`F2`/`F3`/`F4`/`F5`（零触碰）；阈值面 `T-a`/`T-b`/`T-c`/`T-d`/`T-e`（零 diff）；台账面 `L-a`/`L-b`/`L-c`（本任务**不得**写入台账，只读）。

**验证命令**:
```bash
npm run typecheck --workspace @lgdl/web-cli-plugin
node -e "const s=require('fs').readFileSync('packages/web-cli-plugin/test/gate-integrity.test.ts','utf8');if(!/CHROMIUM_GATES[\s\S]{0,400}length\s*===?\s*9/.test(s))throw new Error('CHROMIUM_GATES != 9');console.log('CHROMIUM_GATES: 9 ok')"
npm test --workspace @lgdl/web-cli-plugin 2>&1 | tee /tmp/opencode/v45-gate-logs/w1-node.log
```

---

### TASK-V45-102（V451-02）: **spikeGate-A** —— binding 段前字节中立避让可行性探针
| 属性 | 值 |
|------|-----|
| **复杂度** | S |
| **前置依赖** | 无（只读探针） |
| **执行波次** | 1 |
| **对应 FR / AC** | FR-V45-081 · AC-V45-015 · EC-V45-013 |
| **ADR / 风险** | ADR-V45-005 · R-V45-102 / R-REG-002 |
| **并行度** | 与 T101 / T103 完全并行（临时目录只读探针，**不落版本库**） |
| **闸门语义** | **spikeGate**：结论决定 `TASK-V45-114` 走「保段」或「停下上报」 |

**输入**: ADR-V45-005 §裁决 2；`docs/v4-supersession-ledger.json#protectedRanges[1]`（`107780..115930` / sha `be9ad0e9…` / `decision:"keep"`）；`test/ui/binding.mjs:896`（段前 `#notice` 读取点）/ `:2256`（段后 `AP#4b`）/ `:880`（`panelNotice` = 事件语义，零触碰）。

**动作**（全部在 `/tmp/opencode/v45-spike/` 内，**只读仓库 + 临时副本**）:
1. 计算段前（偏移 < 107780）可用「等长删白 / 补白」预算（注释与空行字节数）。
2. 构造 `document.getElementById('notice').textContent` → 流内系统行等价表达式的字节长度差。
3. 模拟「新表达式 + 同前置区等量删白」，验证 `byteOffsetOf(startAnchor) === 107780` **可逐字节成立**。
4. 记录失败判据（可删白区耗尽 / 语义不完整 / 表达式无法等价）。

**产出**: 探针报告（`keep-feasible` 或 `report-to-orchestrator` + 量化预算与证据）；结论写入本叶 `state.json#taskCounts.spikes[]`。

**验收标准（可机核）**:
- [ ] 报告含量化预算：`availablePreSegmentBytes ≥ |ΔbyteLength|`
- [ ] 模拟后 `byteOffsetOf(startAnchor) === 107780` 成立（或明确给出不可行证据）
- [ ] 结论为二值之一且带证据；**未改任何版本库文件**（`git status --short` 零输出）
- [ ] `binding.mjs:880` `panelNotice` 未被识别为迁移点（白名单判定正确）

**红线检查点**: 冻界面 `F1`/`F2`/`F3`/`F4`/`F5`；阈值面 `T-a`~`T-e`；台账面 `L-a`（**禁止改 pin** —— 只能产出结论）。

**验证命令**:
```bash
mkdir -p /tmp/opencode/v45-spike && node /tmp/opencode/v45-spike/binding-byteline-probe.mjs | tee /tmp/opencode/v45-gate-logs/w1-spike-binding.log
git status --short   # 必须为空（探针不入版本库）
```

---

### TASK-V45-103（V451-03）: **spikeGate-B** —— journey `#15a~#15q` 等价改写 + 链式 superseder 查找预演
| 属性 | 值 |
|------|-----|
| **复杂度** | S |
| **前置依赖** | 无（只读预演） |
| **执行波次** | 1 |
| **对应 FR / AC** | FR-V45-080 / 083 / 084 · AC-V45-014 / 017 |
| **ADR / 风险** | ADR-V45-004 · R-REG-001 / R-V45-108 |
| **并行度** | 与 T101 / T102 完全并行 |
| **闸门语义** | **spikeGate**：结论决定 `TASK-V45-113` 的八步流程可直接落地 |

**输入**: ADR-V45-004 §裁决 3 / 5；`test/supersession-ledger.test.ts:699-740`（v3 段 **严格等值** superseder 查找 + `superseder.leafBase` 逐字节复算）；journey active pin `43054..55259` / sha `e2b500df…` / `supersededFrom 6b45c3fa…`。

**动作**（临时副本，不落版本库）:
1. 在临时副本上对 `#15a~#15q` 做**同编号等价改写**（`#15b` ≥65.0% 只上调、`#15c` 加严、`#15f~#15q` 选择器重锚），验证段内新 sha256 与 `startByte`/`endByte` 可复算。
2. 预演**链式查找谓词**：`r.status==='active' && (r.supersededFrom === range.sha256 || (r.supersessionChain ?? []).some(l => l.sha256 === range.sha256))`，证明 v3 段**严格判据不破**。
3. 记录 `supersessionChain[]` 最小 schema（`sha256`/`supersededFrom`/`supersededOn`/`leafBase`/`note`）+ 链连续性断言清单。

**产出**: 预演报告 + 链式谓词草案 + 最小 schema；结论写入 `state.json#taskCounts.spikes[]`。

**验收标准（可机核）**:
- [ ] 链式谓词对 v3 pin（`6b45c3fa…`）与 v4-1 pin（`e2b500df…`）**均命中**
- [ ] 段内 sha 与 `startByte/endByte` 可复算（给出复算值）
- [ ] schema 5 字段齐备；链连续性/覆盖/同源 4 条断言草案成文
- [ ] `git status --short` 零输出（预演不入版本库）

**红线检查点**: 冻界面 `F4`（**v3 台账零 diff；预演不得写入任何台账**）；阈值面 `T-b`（≥65.0% 只上调）；台账面 `L-a`（仅预演，schema 草案不落盘至台账）。

**验证命令**:
```bash
mkdir -p /tmp/opencode/v45-spike && node /tmp/opencode/v45-spike/journey-supersede-probe.mjs | tee /tmp/opencode/v45-gate-logs/w1-spike-journey.log
git status --short   # 必须为空
```

---

### TASK-V45-104（V451-04）: `STRIP_CHANNEL_KINDS` 重构 + `appendSystem` 单写收口
| 属性 | 值 |
|------|-----|
| **复杂度** | L |
| **前置依赖** | TASK-V45-101 |
| **执行波次** | 2 |
| **对应 FR / AC** | FR-V45-011 / 012 / 015 · AC-V45-001 / 003 / 016 |
| **ADR / 风险** | ADR-V45-001 · R-REG-010 |
| **并行度** | W2 内**严格串行首位**（105 / 106 依赖本任务产出） |

**输入**: ADR-V45-001 §7；`src/ui/sidepanel/host-registry.ts:107-114`（`STRIP_CHANNEL_KINDS` 6 条绑定）+ `:74-76`（逐字「keep their readable status projection … every fact is ALSO append-recorded」）；`src/ui/sidepanel/system-events.ts` 4 规则常量。

**动作**:
1. `STRIP_CHANNEL_KINDS` 由「legacy id + kind」重构为 `{channel, kind, emitterSite, carrierCount: 1, reason}`；`emitterSite` 以**源文本抽取**机核（唯一调用点），`carrierCount` 为显式常量。
2. 移除「legacy id **仍在 DOM**」判据（与退役正面矛盾）；记录旧判据 → 新语义的等价映射（台账 `entries[]`）。
3. `#send-reason` **保留**验证（仍在 `#region-statusbar` 的 `.status-line` 内，不在退役面）。
4. `system-events.ts` 4 规则常量与语义**逐字不变**（只做只读校验，不改）。

**产出**: 重构后的 `host-registry.ts`（单写契约）+ 旧判据映射登记。

**验收标准（可机核）**:
- [ ] 每个 channel 恰 **1** 个 emitter 调用点（源文本抽取机核，源码级断言）
- [ ] 每条绑定 `carrierCount === 1`
- [ ] `#send-reason` 仍是 `#region-statusbar` 后代（DOM 断言）
- [ ] `system-events.ts` 零 diff（4 规则常量逐字）
- [ ] 源文本 `ALSO append-recorded` 零命中（双写理由移除）

**红线检查点**: 阈值面 `T-d`（4 规则常量**零 diff**）/`T-a`/`T-b`；冻界面 `F5`；台账面 `L-a`（登记判据重写条目）。

**验证命令**:
```bash
git diff --stat -- packages/web-cli-plugin/src/ui/sidepanel/system-events.ts   # 必须零行
npm run typecheck --workspace @lgdl/web-cli-plugin
node -e "const s=require('fs').readFileSync('packages/web-cli-plugin/src/ui/sidepanel/host-registry.ts','utf8');if(/ALSO append-recorded/.test(s))throw new Error('dual-write rationale residual');console.log('single-write rationale: clean')"
```

---

### TASK-V45-105（V451-05）: 5 条提示带 DOM 真退役 + `firstRunCard` 归并 + `title` 净化承载
| 属性 | 值 |
|------|-----|
| **复杂度** | L |
| **前置依赖** | TASK-V45-104 |
| **执行波次** | 2 |
| **对应 FR / AC** | FR-V45-010 / 013 / 014 / 025 · AC-V45-001 / 003 / 004 |
| **ADR / 风险** | ADR-V45-001 · R-V45-104 / R-REG-901 / R-REG-005 |
| **并行度** | W2 串行中段 |

**输入**: ADR-V45-001 §1~5；父 `spec.md §11`；`src/ui/sidepanel/index.html:1335-1345`（strips 宿主内容）+ `:1381-1389`（`#send-reason` 位置）；`view-model.ts#firstRunCard`（`terminable` 先例）。

**动作**:
1. **真退役**（DOM 移除，非 `hidden`）：`#env-guard` / `#site-hint`（含 `sh-title`/`sh-detail`/`sh-action`）/ `#onboarding` / `#discovery-notice`（含 `dn-title`/`dn-detail`）/ `#notice` + `li[data-host="strips"]` + `.strips` 包裹层。**`#send-reason` 不动**。
2. 事实载体 = `kind='env'|'site'|'probe'|'firstRun'|'notice'` 的单行系统事件行（或 `firstRunCard`）；首屏三事实**载体数 == 1**。
3. `onboarding` / `discovery-notice` 沿用 `firstRunCard` 归并（`terminable` 的 `!open` 谓词**不得丢失**）。
4. `site` / `probe` 长文案 → 行 `title`（**同过净化**）+ 设置视图站点分区详情（**同源**：同一常量/派生函数）；流内保持单行（NFR-V45-008）。
5. FIX-5 消解：0 计数控件停渲染（不单列 AC，收口文档重述）。

**产出**: 退役后的 `index.html` + `view-model.ts` / `sidepanel.ts` 承载改造。

**验收标准（可机核）**:
- [ ] 5 个退役 id 的 `getElementById` 均为 `null`；`#stream` 子树零 `[data-host="strips"]`
- [ ] 首屏三事实各恰 1 个可见载体（逐条断言）
- [ ] `terminable` / `!open` 谓词在位（静态断言）；欢迎卡 ≤1 / 首屏卡 ≤2 / 文案 ≤8 行
- [ ] `title` 净化反证：注入 `?token=…` / 页面文本 ⇒ **抛错**
- [ ] 0 计数控件不再渲染（FIX-5 消解）
- [ ] `#send-reason` 仍在 `#region-statusbar` 内

**红线检查点**: 冻界面 `F2`/`F3`/`F5`；阈值面 `T-d`（净化规则逐字）/`T-a`（防滥用常量）；台账面 `L-a`（登记退役条目 + 承载块 `newTitle` 可定位）。

**验证命令**:
```bash
node -e "const h=require('fs').readFileSync('packages/web-cli-plugin/src/ui/sidepanel/index.html','utf8');for(const id of ['env-guard','site-hint','onboarding','discovery-notice','notice']){if(new RegExp('id=\"'+id+'\"').test(h))throw new Error('residual: '+id)}console.log('5 strips ids: retired')"
npm run typecheck --workspace @lgdl/web-cli-plugin
npm run test:zero-injection --workspace @lgdl/web-cli-plugin 2>&1 | tee /tmp/opencode/v45-gate-logs/w2-zero-injection.log
```

---

### TASK-V45-106（V451-06）: strips **15 门禁 / 44 处** id 引用断言重写（数量 ≥ 原值）+ 载体数 == 1 + 4 组反证
| 属性 | 值 |
|------|-----|
| **复杂度** | L |
| **前置依赖** | TASK-V45-105 |
| **执行波次** | 2 |
| **对应 FR / AC** | FR-V45-015 / 011 / 010 · AC-V45-001 / 003 / 004 / 016 |
| **ADR / 风险** | ADR-V45-001 §6 · R-REG-005 / R-V45-104 / R-V45-106 |
| **并行度** | W2 串行末位（W3 闸门前置） |

**输入**: ADR-V45-001 §6（改写口径 7 条）；迁移量预登记 = **strips 15 门禁文件 / 44 处引用**；`plan.md §2.1` 实测补充（`notice` 182 处中大量为**事件语义**）。

**动作**（**逐点判定**，禁按名批量替换）:
1. `getElementById('notice')` → `#stream [data-msg-type="system"][data-kind="notice"]` 选择器重锚（**语义不变**）。
2. 「节点存在」类正面断言 → 「**节点为 `null`** + 流内载体**恰 1**」**双断言**（断言数**只增**）。
3. `journey.mjs:658-670` `#11c~#11e`（`#site-hint` 可见性 + 原因 + 动作）→ 流内行 + 行 `title` + 推荐卡 chips（三处呼应）。
4. `hardening.mjs:205,224-227`（`hasGuard`/`guardShown`/`guardText`）+ `test/env-guard.test.ts` → 流内行断言。
5. `#onboarding`（`recommendation.mjs ⑬` / `density.mjs`）→ `firstRunCard` / state 读取；`#discovery-notice`（`binding.mjs AP#4b` / `insight.mjs`）→ 流内行。
6. 归并矩阵（`test/density-thresholds.test.ts:715`）→ **新语义三条**（唯一 emitter / 载体数 == 1 / `#send-reason` id 仍在）。
7. **`notice` 同名语义白名单零触碰**：`test/chat-events.test.ts` / `protocol.test.ts` / `notify-tools.test.ts` / `bookmarks-tools.test.ts` / `downloads-tools.test.ts` / `fullpage-screenshot.test.ts` / `session-follow.test.ts` / `sidepanel.test.ts` / `test/ui/binding.mjs:880 panelNotice`。
8. 4 组反证实跑：注入第二条同 kind 行 / 恢复一个 `#notice` 节点 / 删某 kind 唯一 emitter / 行 `title` 注入 `?token=`。

**产出**: 15 门禁文件改写 + 4 组反证留证 + 逐文件引用计数（≥44）。

**验收标准（可机核）**:
- [ ] 逐文件「引用点数量 ≥ 原值」，合计 **≥44**（给出计数表）
- [ ] 每个退役 id 处同时存在「节点为 `null`」与「载体恰 1」双断言
- [ ] 4 组反证逐组实跑：注入 ⇒ FAIL（`expectFailPattern` 记载）→ 逐字节 sha256 还原 ⇒ PASS
- [ ] 白名单 9 文件 `git diff --stat` **零行**
- [ ] 归并矩阵新语义 3 条断言在位

**红线检查点**: 冻界面 `F4`/`F5`；阈值面 `T-a`（归并矩阵改写**不得放宽**）/`T-d`；台账面 `L-a`（每处改写登记 `modifiedRanges[]`；`newTitle` 可定位、`reason ≥ 40`）。

**验证命令**:
```bash
npm run test:ui --workspace @lgdl/web-cli-plugin 2>&1 | tee /tmp/opencode/v45-gate-logs/w2-journey.log
npm run test:hardening --workspace @lgdl/web-cli-plugin 2>&1 | tee /tmp/opencode/v45-gate-logs/w2-hardening.log
npm run test:insight --workspace @lgdl/web-cli-plugin 2>&1 | tee /tmp/opencode/v45-gate-logs/w2-insight.log
git diff --stat -- packages/web-cli-plugin/test/chat-events.test.ts packages/web-cli-plugin/test/protocol.test.ts   # 零行
```
（**串行**：一次一个 Chromium。）

---

### TASK-V45-107（V451-07）: `messageAnchor` 迁移（→ `null`）+ 4 宿主 DOM 移除 + `#stream` 纯卡序
| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-V45-106 |
| **执行波次** | 3 |
| **对应 FR / AC** | FR-V45-020 / 024 · AC-V45-002 / 005 / 007 |
| **ADR / 风险** | ADR-V45-002 §1-2 · R-REG-906 |
| **并行度** | W3 **严格串行首位**（index.html 被 108/109/110 共享） |

**输入**: ADR-V45-002 §1-2；`src/ui/sidepanel/stream-render.ts:69-71`（`messageAnchor()` = `li[data-host="composer"]`）+ `:78-93`（`setEmpty()` 空态占位）；`plan.md §2.1` A1/A2/A3。

**动作**:
1. `messageAnchor()` 改为返回 `null`（卡追加到 `#stream` 尾部，`insertBefore(node, null)` 语义）；源码不再查询 `li[data-host="composer"]`。
2. `#stream` 移除 4 个 `li[data-host]`（`decision` / `composer` / `l1-panels` / `strips`）。
3. 子节点判据：`#stream` 子节点集合 == 卡 `li[data-msg-type]` ∪（空态时恰 1 个 `p.log-empty-text`）；唯一非卡子节点**显式登记**。
4. `setEmpty()` 口径不变。

**产出**: `stream-render.ts` + `index.html`（宿主清零）。

**验收标准（可机核）**:
- [ ] `#stream` 子树内 `[data-host]` / `[data-transitional-host]` 计数 **== 0**（任意深度）
- [ ] `#stream > li` 全部带 `data-msg-type`
- [ ] 唯一允许的非卡子节点 = `p.log-empty-text`（显式登记）；反证：注入任一其他子节点 ⇒ 红
- [ ] `assertChromeNotInStream()` 继续成立（`[data-chrome-control]`/`[data-toolbar-slot]`/`.view-btn` 不在流内）；反证：注入 `.view-btn` ⇒ 抛错

**红线检查点**: 冻界面 `F5`；阈值面 `T-a`（`DENSITY_EXCLUDED_SUBTREES` 单源**零 diff**）/`T-b`；台账面 `L-a`（登记 4 宿主退役条目）。

**验证命令**:
```bash
node -e "const h=require('fs').readFileSync('packages/web-cli-plugin/src/ui/sidepanel/index.html','utf8');const n=(h.match(/data-host=/g)||[]).length;if(n!==0)throw new Error('host residual: '+n);console.log('hosts in stream: 0')"
npm run test:stream --workspace @lgdl/web-cli-plugin 2>&1 | tee /tmp/opencode/v45-gate-logs/w3-stream.log
```

---

### TASK-V45-108（V451-08）: `decision` 壳元素卡内化（`ref` 卡 / `askuser`·`auth` 卡 / `receipt` 固化区）
| 属性 | 值 |
|------|-----|
| **复杂度** | L |
| **前置依赖** | TASK-V45-107 |
| **执行波次** | 3 |
| **对应 FR / AC** | FR-V45-021 / 026 · AC-V45-007 / 008 / 009 · EC-V45-005 |
| **ADR / 风险** | ADR-V45-002 §3 · R-V45-103 |
| **并行度** | W3 串行（`sidepanel.ts` 与 110/112 共享 ⇒ 保守串行） |

**输入**: ADR-V45-002 §3（decision 壳逐条去向表）；父 `spec.md §11.1`（行 1~16）；`index.html:1244-1284`（decision 壳内容清单 A4）；`#ask*` / `#confirm*` 唯一活跃卡铸造先例。

**动作**:
1. **退役**：`li[data-host="decision"]` / `#l0-decision` / `#l0-kicker` / `#l0-ref-badge` / `#l0-ref-toggle` / `#l0-more` / `#l0-receipt-summary`（角色名/失效标记由卡自身 `data-*` + 卡内徽标承载）。
2. **迁移 → `askuser` / `auth` 卡内**：`#l1-more` / `#l1-more-options` / `#l1-consequences-toggle` / `#l1-consequences` / `#l1-consequence-tpl`（**三段模板文案逐字不变**）。
3. **迁移 → `ref` 卡内**：`#l1-ref` / `-summary` / `-rows` / `-actions` / `-repick` / `-describe` / `-rescue` / `-reason`（证据区 + 恢复区**三恢复按钮**：重拾 / 描述 / 唯一匹配重锚）。
4. **回执**：`#l0-receipt-summary` 等价物 → 卡**固化区** + 审计视图（`#l2-audit-evidence`，由 T109 落地）。
5. 承载方式 = **卡内作用域 + 唯一活跃/最新卡铸造稳定 id**（沿用 `#ask*`/`#confirm*` 先例）；历史卡以 `data-*` + `[data-card-key]` 作用域承载。
6. `#l1-ref-rescue` 可见性谓词（唯一文本匹配时可见）**逐字不变**（EC-V45-005）。
7. 反证：注入第二张同类卡 ⇒ 「文档内计数 ≤ 1」红。

**产出**: `cards/{ref,askuser,auth,shared,nextstep}.ts` + `sidepanel.ts`（读写迁移到卡作用域）。

**验收标准（可机核）**:
- [ ] 文档内 `#l1-more` / `#l1-ref` 计数 **≤ 1**（唯一活跃卡铸造）；反证：伪造第二张卡 ⇒ 红
- [ ] 三恢复按钮**卡内可达**（作用域查询断言：重拾 / 描述 / 重锚）
- [ ] `#l1-ref-rescue` 可见性谓词逐字不变
- [ ] 三段模板文案逐字不变（字面比对）
- [ ] 历史卡不产生 id 冲突（`[data-card-key]` 作用域断言）
- [ ] `cards/nextstep.ts` 预期零改动（`data-act` 纯透传）

**红线检查点**: 冻界面 `F1`（`CARD_TYPES` 12 项零扩展）；阈值面 `T-e`（`MAX_OPEN_ASKS` 语义）；台账面 `L-a`（迁移条目 + `newTitle` 可定位）。

**验证命令**:
```bash
npm run test:ask-auth --workspace @lgdl/web-cli-plugin 2>&1 | tee /tmp/opencode/v45-gate-logs/w3-ask-auth.log
npm run typecheck --workspace @lgdl/web-cli-plugin
npm run test:ref-pick-wiring --workspace @lgdl/web-cli-plugin 2>&1 | tee /tmp/opencode/v45-gate-logs/w3-ref-pick.log
```

---

### TASK-V45-109（V451-09）: `l1-panels` 4 开关去向 + L2 只读承载块（树归因 / 审计证据 / 审计计数）
| 属性 | 值 |
|------|-----|
| **复杂度** | L |
| **前置依赖** | TASK-V45-108 |
| **执行波次** | 3 |
| **对应 FR / AC** | FR-V45-022 / 026 · AC-V45-008 / 009 · DC-V45-002 / 011 |
| **ADR / 风险** | ADR-V45-002 §4 · R-REG-902 / R-REG-904 |
| **并行度** | W3 串行（`index.html` 的 `#view-host` 分片） |

**输入**: ADR-V45-002 §4（l1-panels 组逐条去向表）；父 `spec.md §11.2`（行 17~27）；`index.html:1297-1333`（A5）/ `:1353-1379`（A8 `#view-host`）；`l2/view-host.ts` 视图替换机制。

**动作**:
1. **退役**：`li[data-host="l1-panels"]` / `#l1-group` + 4 触发器 + 各自 `hidden` 面板；`#l1-history-toggle` / `#l1-history` / `#l1-history-rows`（**历史 = 流本身**，`rounds[]` 已由 `project()` 派生）。
2. **已决步数计数** → `#l2-audit-count`（审计视图标题区，**全仓唯一**）。
3. **局部树归因**（`#l1-local-tree-toggle` / `-tree` / `-rows` / `-hint`）→ 树视图（L2）只读归因块 `#l2-tree-attribution`（`#view-host` 内，**不引入第二滚动容器**）。
4. **回执证据**（`#l1-receipt-toggle` / `-receipt` / `-rows` / `-audit-summary`）→ 审计视图（L2）证据区 `#l2-audit-evidence`（行数与摘要语义不变）。
5. **消解**：`#l1-local-tree-global`（查看全局树）/ `#l1-receipt-audit`（查看审计）——控件移除且**零悬空引用**。
6. 手势表去向由 TASK-V45-112 落地（设置「帮助」分区）。

**产出**: `l1/{panels,receipt,local-tree}.ts` + `l2/{audit,view-host}.ts` + `index.html`（3 个只读承载块）。

**验收标准（可机核）**:
- [ ] `#view-host` 内 `#l2-tree-attribution` / `#l2-audit-evidence` / `#l2-audit-count` **可达**
- [ ] `#l2-audit-count` 全仓唯一（唯一 id 声明点）
- [ ] L2 视图既有内容**零改动**（NG-V45-014）；不引入第二滚动容器（滚动容器计数 == 1）
- [ ] 两个消解控件零悬空引用（全仓 `grep` 零命中）
- [ ] `assertChromeNotInStream()` 继续成立（迁入内容不把常驻控件带入流内）

**红线检查点**: 冻界面 `F5`（L2 内部零改）；阈值面 `T-a`（迁入 `#view-host` **不豁免** ⇒ 进被测量面）/`T-b`；台账面 `L-a`+`L-b`（登记迁移条目与迁入方向性）。

**验证命令**:
```bash
node -e "const h=require('fs').readFileSync('packages/web-cli-plugin/src/ui/sidepanel/index.html','utf8');for(const id of ['l2-tree-attribution','l2-audit-evidence','l2-audit-count']){if(!h.includes('id=\"'+id+'\"'))throw new Error('missing carrier: '+id)}console.log('l2 carriers: 3 ok')"
npm run test:l2 --workspace @lgdl/web-cli-plugin 2>&1 | tee /tmp/opencode/v45-gate-logs/w3-l2.log
npm run test:l1 --workspace @lgdl/web-cli-plugin 2>&1 | tee /tmp/opencode/v45-gate-logs/w3-l1.log
```

---

### TASK-V45-110（V451-10）: `#composer` 出流（body 尾 `hidden`）+ `disclosure.ts` 三份声明重写
| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-V45-109 |
| **执行波次** | 3 |
| **对应 FR / AC** | FR-V45-023 / 026 · AC-V45-005 · NFR-V45-006 · DC-V45-010 |
| **ADR / 风险** | ADR-V45-003 · ADR-V45-002 §5 · R-V45-105 |
| **并行度** | W3 串行 |

**输入**: ADR-V45-003（composer 出流 + 兼容证明）；ADR-V45-002 §5（三份声明重写口径）；`index.html:1287-1292`（A7）；`disclosure.ts:66-106`（A12）。

**动作**:
1. `li[data-host="composer"]` 移除；`<form id="composer" hidden>` 作为 `body` **最后一个子节点**（`#settings-view` 之后）；id / ARIA / 内部结构**零变化**（`placeholder` / `autocomplete` / `type="submit"` 不变）。
2. **`requestTurn` 链路零变化证明**：submit 监听与 `requestTurn()` 不改；调用点集合 == 基线（集合变化即红）。
3. `disclosure.ts` 三份声明重写：
   - `COLLAPSIBLE_TARGETS` **7 → 7**（零缩减）：`l1-more` / `l1-consequences` / `l1-local-tree` / `l1-receipt` / `l1-gestures` / **`l2-tree-attribution`** / **`l2-audit-evidence`**；
   - `DISCLOSURE_WIRING` 7 对 + 新增 **`RETIRED_FOLDABLE_IDS`**（`l1-history` / `l1-ref`，带「重新引入即红」反证）；
   - `NEVER_FOLDABLE` **12 → 14**：删 `'l0-decision'`（已退役）入新增 **`RETIRED_NEVER_FOLDABLE_IDS`**（带反证）+ 新增 `'l2-tree-attribution'` / `'l2-audit-evidence'` / `'settings-help'`；**`'composer'` 保留**（永不折叠 ≠ 是否在流内）。
4. 新增双判据：`#composer.parentElement === document.body` ∧ `#composer.hidden === true`。
5. 布局护栏（R-V45-105）：源文本 `composer.hidden = false` **零命中**（除 ask 卡文本输入路径外无解除路径）。

**产出**: `index.html` + `disclosure.ts`。

**验收标准（可机核）**:
- [ ] `#composer.parentElement === document.body` ∧ `hidden === true` ∧ `#stream` 子树不含 `#composer`/`#input`/`#send`
- [ ] `#input`/`#send` 的 `getElementById` 命中且 `value` 可读写（兼容面）
- [ ] `requestTurn` 调用点集合 == 基线；`#composer` submit 监听在位
- [ ] `COLLAPSIBLE_TARGETS.length === 7`；`NEVER_FOLDABLE.length === 14`；`RETIRED_FOLDABLE_IDS` / `RETIRED_NEVER_FOLDABLE_IDS` 各带 ≥1 反证
- [ ] 源文本 `composer.hidden = false` 零命中
- [ ] 反证：把 `#composer` 移回 `#stream` ⇒ 零宿主 + 兼容断言双红；改 `#input` id ⇒ 兼容面红

**红线检查点**: 冻界面 `F5`（兼容读取面 id 全保留）；阈值面 `T-b`（`#15b` 占比护栏）；台账面 `L-a`（登记 composer 出流 + 声明重写条目）。

**验证命令**:
```bash
npm run test:l0 --workspace @lgdl/web-cli-plugin 2>&1 | tee /tmp/opencode/v45-gate-logs/w3-l0.log
npm run test:sidepanel-view 2>/dev/null || npm test --workspace @lgdl/web-cli-plugin 2>&1 | tee /tmp/opencode/v45-gate-logs/w3-node.log
node -e "const s=require('fs').readFileSync('packages/web-cli-plugin/src/ui/sidepanel/disclosure.ts','utf8');if(!/RETIRED_NEVER_FOLDABLE_IDS/.test(s))throw new Error('retired declaration missing');console.log('disclosure: rewritten')"
```

---

### TASK-V45-111（V451-11）: `host-registry` 零宿主反向判据 + `RETIRED_*` 扩容 + `l0.mjs` 结构判据 + 5 组伪造反证
| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-V45-110 |
| **执行波次** | 3 |
| **对应 FR / AC** | FR-V45-060 / 061 / 062 · AC-V45-002 / 016 · G-V45-003 |
| **ADR / 风险** | ADR-V45-010 · R-REG-010 / R-REG-906 |
| **并行度** | W3 串行（`l0.mjs` 与 T115 同文件 ⇒ 本任务先完成结构判据升级） |

**输入**: ADR-V45-010（注册表降级 + `RETIRED_*` 扩容 + 6 类问题串）；`host-registry.ts:46-77`（A10）+ `:132-152`（A11）；`test/ui/l0.mjs:71-83`（`REGISTERED_TRANSITIONAL_HOSTS = 0`）。

**动作**:
1. `REGISTERED_STRUCTURAL_HOSTS = []`（注册表**降级为反向判据**：任何 `li[data-host]` 存在即红，无需先登记再比对）。
2. 新增 / 扩容常量：`RETIRED_HOST_ATTRS = ['decision','composer','l1-panels','strips']`；`RETIRED_CONTAINER_IDS`（14 项：`l0-decision` / `l0-pick` / `l0-status-band` / `l0-kicker` / `l0-more` / `l0-ref-toggle` / `l0-receipt-summary` / `l1-group` / `l1-history-toggle` / `l1-history` / `l1-history-rows` / `l1-local-tree-toggle` / `l1-receipt-toggle` / `l1-gestures-toggle`）；`RETIRED_HOST_IDS` 保留为**并集别名**（注释说明已拆分）。**`#composer`/`#input`/`#send`/`#send-reason`/`#rebind` 不在此列**（保留）。
3. `evaluateHostRegistry` 升级为 **6 类问题串**：① 任意深度 `li[data-host]`（含 `[data-transitional-host]` 与改名前等价形态）② `RETIRED_HOST_ATTRS` 任一值存在 ③ `RETIRED_CONTAINER_IDS` 任一 id 存在 ④ `[data-transitional-host]` 计数 ≠ 0 ⑤ 退役项反证元数据齐备 ⑥ 源文本不含双写理由（`ALSO append-recorded` 字面零命中）。
4. `test/ui/l0.mjs:71-83` 升级为「零宿主」结构性判据（判 `presentHosts.length === 0`，不再数注册表）。
5. `test/host-registry.test.ts`：6 类问题串逐条可 FAIL + **5 组伪造 reading 反证**（删属性 / 改名 / 塞进卡 / 只删标记 / 空注册表但仍留 DOM ⇒ 逐组红）。

**产出**: `host-registry.ts` + `test/ui/l0.mjs` + `test/host-registry.test.ts`（实体化）。

**验收标准（可机核）**:
- [ ] 6 类问题串逐条可 FAIL（每类 1 反证，`expectFailPattern` 记载）
- [ ] 5 组伪造 reading **逐组红**（R-REG-906 绕过路径封死）
- [ ] 向 `#stream` 注入 1 个 `li[data-host="x"]` ⇒ 门禁 FAIL；移除 ⇒ PASS（逐字节 sha256 还原）
- [ ] `RETIRED_CONTAINER_IDS` 中 14 项在 DOM 中均为 `null`
- [ ] `l0.mjs:874-875` 三视口常驻集合去 `l0-decision` 并等价补新常驻面

**红线检查点**: 冻界面 `F5`；阈值面 `T-a`（结构集合重锚**不得放宽**）；台账面 `L-a`（登记原 4 条永久登记记录的退役）。

**验证命令**:
```bash
npm run test:l0 --workspace @lgdl/web-cli-plugin 2>&1 | tee /tmp/opencode/v45-gate-logs/w3-l0-zero-host.log
npm test --workspace @lgdl/web-cli-plugin 2>&1 | tee /tmp/opencode/v45-gate-logs/w3-node-host-registry.log
```

---

### TASK-V45-112（V451-12）: `risk-recovery` 扩展 + act 闭集 6 项 + 本地 act 布线门禁 + 设置「帮助」分区
| 属性 | 值 |
|------|-----|
| **复杂度** | L |
| **前置依赖** | TASK-V45-108（卡内化）、TASK-V45-110（`sidepanel.ts` 分支） |
| **执行波次** | 3 |
| **对应 FR / AC** | FR-V45-030 / 031 / 032 / 033 / 040 / 041 / 042 · AC-V45-010 / 011 / 012 / 013 · EC-V45-006 |
| **ADR / 风险** | ADR-V45-007 / 008 · R-REG-903 / 904 / 905 · R-V45-103 |
| **并行度** | W3 **末位串行**（W4 门禁重算的前置） |

**输入**: ADR-V45-007（触发集 / 规则表 / 闭集 6 项 / 布线门禁）；ADR-V45-008（帮助分区）；`recommend.ts:124-125`（A15）+ `:206-211`（A16）；`cards/nextstep.ts:44-60`（A17 纯透传）；`settings/sections.ts:28-36`（A18）；`view-model.ts:982-992`（A19 手势单源）。

**动作**:
1. **恢复触发集扩展**（priority 1）：`site`（`input.site.authorized === false`）/ `probe`（`input.probe.steady === false || phase !== 'ready'`）；`NEXTSTEP_SOURCE_WHITELIST` **7 项零扩项**；`RECOMMEND_MODULE_WHITELIST` 零扩项。
2. **`RECOVERY_CHIP_ORDER` 规则表**（渲染前取 ≤ `MAX_CHIPS_PER_CARD` = 3）：`refInvalid`/`declarationInvalid`/`hardFloor` → `repick` → `describe` → `rebind`；`site` → **`rebind`** → `repick` → `describe`；`probe` → **`rebind`** → `describe` → `repick`（FR-V45-031「site/probe 触发下出现『重新绑定当前标签页』」由**规则表首项**保证）。
3. **act 闭集终态**：`NEXTSTEP_ACTS = ['next','repick','describe','authorize','rebind','help']`（**逐字该序，6 项**）；`type NextstepAct` 同步；`data-act` 渲染零改动。
4. **本地动作单一生产入口**：`authorize` → `authorizeCurrentSite()`；`rebind` → `rebindCurrentTab()`（设置视图 `#rebind` 同一入口）；`help` → `openSettingsSection('settings-help')`；`handleCardAction` 新增 2 分支且**无 `requestTurn(`**；`passesSafety` 口径不变（新增断言「本地 act 永不入 deny 集」）。
5. **onboarding chip**：`{ text: '了解 6 个页面手势', act: 'next' }` → `act: 'help'`（**文案逐字不变**）；点击**零 user 回合 / 零输入框写入**。
6. **设置「帮助」分区**：`sections.ts` 追加 `'settings-help'`（**7 → 8**，单源派生）；**NEW** `settings/help.ts`（6 行手势表，`L1_GESTURE_LABELS` + `GESTURE_EFFECTS` 单源；**只读、零可点控件**）；`panel.ts` 挂载；`NEVER_FOLDABLE` 追加 `'settings-help'`（由 T110 落地）。
7. **布线门禁** `test/local-act-wiring.test.ts`（实体化，仿 `authorize-chip-wiring.test.ts`）：唯一调用点 / 调用点集合登记 / 无 `requestTurn` / ≥3 组伪造反证 / 与闭集同源。

**产出**: `recommend.ts` + `sidepanel.ts` + `settings/{sections,panel,help}.ts` + `test/local-act-wiring.test.ts` + `test/settings-help.test.ts` + `test/recommendation-sources.test.ts` / `test/authorize-chip-wiring.test.ts` 同源更新。

**验收标准（可机核）**:
- [ ] 白名单**零扩项**（`NEXTSTEP_SOURCE_WHITELIST.length === 7`；`RECOMMEND_MODULE_WHITELIST` 零扩项）
- [ ] `site` / `probe` 触发产出恢复卡且 chips 含 `rebind`（首项）
- [ ] `NEXTSTEP_ACTS` 逐字 6 项；新增第 7 个 act ⇒ 闭集同源断言红
- [ ] 每个本地 act：唯一调用点（各恰 1）+ 分支零 `requestTurn(` + ≥3 组伪造反证可 FAIL
- [ ] 帮助分区三方同源：`SETTINGS_SECTION_IDS.length === 8` == `#settings-root > .wc-section` 计数 == 设置入口 `data-count`；行数 == `L1_GESTURE_LABELS.length` (== 6)；分区内 `button`/`a`/`input` 计数 == 0；键盘可达
- [ ] chip `act:'help'` 点击零回合 / 零输入框写入
- [ ] 反证：删 `site` 触发 ⇒ 恢复卡断言红；`rebind` chip 改 `act:'next'` ⇒ 布线门禁 + 零回合红

**红线检查点**: 冻界面 `F1`（零新交互浮层；帮助内容在既有设置视图内）；阈值面 `T-e`（`MAX_CHIPS_PER_CARD` / 白名单 / deny 集边界**零放宽**）；台账面 `L-a`（登记闭集 4 → 6 项、`SETTINGS_SECTION_IDS` 7 → 8）。

**验证命令**:
```bash
npm run test:recommendation --workspace @lgdl/web-cli-plugin 2>&1 | tee /tmp/opencode/v45-gate-logs/w3-recommendation.log
npm test --workspace @lgdl/web-cli-plugin 2>&1 | tee /tmp/opencode/v45-gate-logs/w3-node-act.log
npm run test:l2 --workspace @lgdl/web-cli-plugin 2>&1 | tee /tmp/opencode/v45-gate-logs/w3-l2-help.log
```

---

### TASK-V45-113（V451-13）: journey 保护段**第二次八步显式取代** + `supersessionChain` + 链式判据升级
| 属性 | 值 |
|------|-----|
| **复杂度** | L |
| **前置依赖** | TASK-V45-112（终态 DOM）、TASK-V45-103（**spikeGate-B 结论**） |
| **执行波次** | 4（**W4+W5 原子区间 D**） |
| **对应 FR / AC** | FR-V45-080 / 082 / 083 / 084 · AC-V45-014 / 017 · EC-V45-012 |
| **ADR / 风险** | ADR-V45-004 · R-REG-001 / R-REG-014 / R-V45-108 / R-V45-106 |
| **并行度** | 与 T114 文件不相交但**台账同文件** ⇒ `L-a` 写入串行化（114 先写 `modifiedRanges`，本任务后写 pin） |

**输入**: ADR-V45-004（八步流程 ①~⑧ + 链式判据等价升级）；`test/ui/journey.mjs:841-1038`（`#15a~#15q` 保护段）/ `:658-670`（段外 `#11c~#11e`）；`test/supersession-ledger.test.ts:699-740`；`plan.md §2.1` A22 / A24。

**动作**（**八步，每步产出可机核证据**）:
1. **① 记录 old**：当前 active pin `{startByte:43054, endByte:55259, sha256:e2b500df…, supersededFrom:6b45c3fa…, leafBase:187c205}` 先写入 `protectedSupersession.history[]`（v4-1 段**逐字保留**），再更新顶层字段。
2. **② 逐段决策**：journey → `"supersede"`（理由：4 宿主退役改变 `#stream` 直接子节点集合与顺序）；binding → `"keep"`（见 T114）。
3. **③ `#15a~#15q` 同编号等价改写（强度不降）**：`#15a` 不变量；`#15b` **≥65.0% 只上调**（`STREAM_HEIGHT_RATIO_MIN = 0.65` 逐字不动）；`#15c` **加严**（`parentElement === body` ∧ `hidden === true`）；`#15d` 不变；`#15e` 更强（+ `#stream` 子节点全为卡）；`#15f~#15q` 选择器重锚 + 新增「卡序不被宿主切段」判据；**段外** `#11c~#11e` → 流内行 + 行 `title` + 推荐卡 chips。
4. **④ 登记 `modifiedRanges[]`**：`journey.mjs` 改写区间逐条（`{file, range/lines, oldId, decision, reason, leaf}`）。
5. **⑤ 计算并写入新 pin**：`protectedRanges[0]`（新 sha / `startByte`/`endByte` 重算 / `status:'active'` / `supersededFrom:'e2b500df…'` / `supersededOn` / `leafBase` = v4.5-1 build 起点 / `oldPin`）；**新增 `supersessionChain[]`**（3 链节：`6b45c3fa…` → `e2b500df…` → 新 pin；首节 `supersededFrom:null`）；`protectedSupersession`（`eightSteps` / `countEvidence` / `rpV408.status='landed'` / `status='complete-steps-1-8'` / `knownGap` 含「闭环（残余：无）」/ `knownGapHistory` 追加 / `history[]` 保存 v4-1 段）。
6. **⑥ 计数守恒**：journey **≥167**（同编号改写不减；`countMethod = 'runtime-check-calls'`）。
7. **⑦ `redlineRemap[]` 追加**：`#15b` ≥65% 语义保留；`#15c` composer 贴底 → 出流显式取代；`logClientHeightFloor` 不变。
8. **⑧ RP-V4-08 复用实跑**：段内改 1 byte ⇒ FAIL；段外改 1 byte ⇒ 不红；删 1 条断言 ⇒ 计数下界 FAIL；逐字节还原 ⇒ PASS（日志全量落盘）。
9. **门禁判据等价升级（只增）**：v3-段 superseder 查找改**链式**（`supersededFrom === range.sha256 || supersessionChain.some(l => l.sha256 === range.sha256)`）；v3 旧 pin 复算改用**命中链节的 `leafBase`**；新增链长 ≥2 / 链连续性 / 链覆盖 v3+v4.1 pin / `protectedRanges[0].supersededFrom === chain.at(-2).sha256` / `newPin.sha256` 同源 / `history` 保留 v4-1 段；`test:supersession ≥33`。

**产出**: `test/ui/journey.mjs` + `docs/v4-supersession-ledger.json`（pin / chain / `protectedSupersession` / `modifiedRanges` / `redlineRemap`）+ `test/supersession-ledger.test.ts`。

**验收标准（可机核）**:
- [ ] journey 运行时 check 数 **≥167**；八步证据 ①~⑧ 齐备
- [ ] 新 pin 命中当前字节；`supersessionChain` 链连续（`chain[i].supersededFrom === chain[i-1].sha256`，首节 `null`）；链覆盖 v3 pin 与 v4-1 pin
- [ ] `protectedRanges[0].supersededFrom === chain.at(-2).sha256`；`protectedSupersession.newPin.sha256 === protectedRanges[0].sha256`
- [ ] v3 段**严格判据仍绿**（`6b45c3fa…` 可逐字节复算）；`knownGap` ↔ `status` 一致性机核绿
- [ ] RP-V4-08 四反证逐条实跑（含「注入点已随形态搬迁重写」）
- [ ] `test:supersession ≥33`

**红线检查点**: 冻界面 `F4`（**v3 台账零 diff**）；阈值面 `T-b`（只上调 + 门槛不动）；台账面 `L-a`（pin / chain / history / modifiedRanges / redlineRemap 逐项）。

**验证命令**:
```bash
npm run test:supersession --workspace @lgdl/web-cli-plugin 2>&1 | tee /tmp/opencode/v45-gate-logs/w4-supersession.log
npm run test:ui --workspace @lgdl/web-cli-plugin 2>&1 | tee /tmp/opencode/v45-gate-logs/w4-journey.log
git diff --stat -- packages/web-cli-plugin/docs/v3-supersession-ledger.json   # 必须零行
```

---

### TASK-V45-114（V451-14）: binding 保段落地 + 段外逐行登记
| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-V45-102（**spikeGate-A 结论** = `keep-feasible`） |
| **执行波次** | 4（原子区间 D） |
| **对应 FR / AC** | FR-V45-081 · AC-V45-015 · EC-V45-013 |
| **ADR / 风险** | ADR-V45-005 · R-REG-002 / R-V45-102 / R-V45-104 |
| **并行度** | 可与 T115 并行（文件不相交）；`L-a` 写入须在 T113 之前完成 |

**输入**: ADR-V45-005（段前字节中立避让 + 段后自由改写 + 逐行登记）；`test/ui/binding.mjs:896` / `:2256` / `:880`；`protectedRanges[1]`（`107780..115930` / `be9ad0e9…`）。

**动作**:
1. **段前 `:896` 字节中立改写**：`document.getElementById('notice').textContent` → 流内系统行等价表达式；字节差由**同一前置区（偏移 < 107780）**的等量删白/补白补偿，使 `byteOffsetOf(startAnchor) === 107780` **逐字节成立**。
2. **段后 `:2256` 自由改写**：`AP#4b` 的 `#discovery-notice` 读取 → 流内行 / state 读取。
3. **`#notice` 双角色同时迁移**（EC-V45-013）：授权回执事实 → 流内行 `kind='notice'` / 卡固化区 + 审计视图；密度夹具锚 → 构造判据（T116）。**不得只迁一处留下悬空**。
4. **逐行登记**：两处写入 `modifiedRanges[]`（`{file, lines, oldId:"#4b/#4c"|"AP#4b", decision:"equivalent-rewrite", reason, leaf}`）+ `entries[]`（`oldTitle` = 原表达式、`newTitle` 可在目标文件定位）。
5. **门禁判据新增（只增）**：`protectedPinFailures(bindingRange, currentText) === []`；`byteOffsetOf(startAnchor) === 107780` 显式断言；binding 两条登记可定位。

**产出**: `test/ui/binding.mjs` + `docs/v4-supersession-ledger.json`（`modifiedRanges` / `entries`）。

**验收标准（可机核）**:
- [ ] `protectedPinFailures(bindingRange, currentText) === []`（sha `be9ad0e9…` + 双字节偏移）
- [ ] `byteOffsetOf(startAnchor) === 107780` 显式断言绿
- [ ] `binding.mjs:880` `panelNotice` **零触碰**（`git diff` 该行零变化）
- [ ] 两条 `modifiedRanges` 登记可定位（`newTitle` 命中原文件）
- [ ] 3 反证实跑：段内改 1 byte ⇒ sha 红；段前多加 1 byte 不补偿 ⇒ `startByte` 红；diff 未登记 ⇒ hunk↔台账红
- [ ] `test:binding ≥192`（`KL-N-10` 首轮异常隔离复跑 ≥2，仍红如实登记不阻塞）

**红线检查点**: 冻界面 `F4`；阈值面 `T-b`；台账面 `L-a`（**不得静默改 pin**；若探针结论 = `report-to-orchestrator` ⇒ **本任务暂停并上报**）。

**验证命令**:
```bash
npm run test:binding --workspace @lgdl/web-cli-plugin 2>&1 | tee /tmp/opencode/v45-gate-logs/w4-binding.log
node -e "const fs=require('fs');const s=fs.readFileSync('packages/web-cli-plugin/test/ui/binding.mjs','utf8');const i=s.indexOf('protectedRanges');console.log('binding probe ok')"
```

---

### TASK-V45-115（V451-15）: **11 处门禁等价重锚** + 反证注入点重写
| 属性 | 值 |
|------|-----|
| **复杂度** | L |
| **前置依赖** | TASK-V45-112（终态 DOM）、TASK-V45-111（`l0.mjs` 结构判据） |
| **执行波次** | 4（原子区间 D） |
| **对应 FR / AC** | FR-V45-082 / 084 · AC-V45-016 / 018 · EC-V45-012 |
| **ADR / 风险** | ADR-V45-012 §4 · ADR-V45-001/002 · R-REG-003 / 004 / 005 / 009 · R-V45-106 |
| **并行度** | 与 T114 并行（文件不相交）；**门禁实跑严格串行** |

**输入**: `plan.md §5.2`（test/ 34 项清单）；`plan.md §2.1` A13（`l0.mjs` ⑧ + `SKELETON_EXEMPT_TARGETS`）/ A14（`:874-875`）/ A30（引用规模）；`test/gate-integrity.test.ts:130-158,549`（A28）。

**动作**（计数**只增**）:
1. `test/ui/l0.mjs`：⑧ `EXPECTED_TRIGGERS` 12 条与逐条判据重锚（存在 / 非空文字 / ARIA 成对 / 目标含摘要或计数）；⑩ 三视口常驻集合去 `l0-decision` 并补新常驻面；`REGISTERED_TRANSITIONAL_HOSTS = 0` 升级为「零宿主」。
2. `test/ui/l1.mjs`（②⑫ 展开几何 / openAll-closeAll 往返 → 目标改卡内 / 视图内）；`test/ui/l2.mjs`（审计证据区 / 帮助分区三方同源 + 树归因块可达）；`test/ui/page-input.mjs`（L1 面板引用 → 卡作用域 / 视图承载块）。
3. `test/ui/hardening.mjs`（`#env-guard` 三断言 → 流内行）；`test/ui/insight.mjs`（`#discovery-notice` / `#env-guard` 文本读取点 → 流内行 / `firstRunCard`）；`test/ui/recommendation.mjs`（⑬⑭ 家族重锚 + `act:'help'` 零回合 / 零输入框 + site/probe 恢复卡）；`test/ui/stream.mjs`（纯卡序 + 唯一非卡子节点显式登记）；`test/ui/ask-auth-inflow.mjs`（卡内选项池 / 后果预演 / 固化区新锚点）。
4. `test/system-merge.test.ts`（「`#notice` 仍读到同一事实」→ 流内行单源）；`test/env-guard.test.ts`（环境守卫事实载体改流内行）；`test/density-thresholds.test.ts`（`:715` 归并矩阵新语义 / 豁免单源 / 结构集合）；`test/l0-disclosure.test.ts`（三份声明同源 + 退役 id 零残留 + `#composer` 父节点双判据）；`test/l1-ref-validity.test.ts`（ref 卡内恢复区等价改写）；`test/sidepanel-view.test.ts`（布局契约 4 项含 `#composer` 出流）；`test/recommendation-sources.test.ts` / `test/authorize-chip-wiring.test.ts`（与 act 闭集同源）；`test/settings.test.ts` / `test/l2-counts.test.ts`（分区数 7 → 8 派生）；`test/ref-pick-wiring.test.ts`（ref 卡内唯一调用点，条件触碰）。
5. **反证注入点逐条重写**（R-V45-106 核心）：`test/ui/l1-reverse.mjs` / `test/ui/l2-reverse.mjs` 的注入点随形态搬迁（改注入到卡内 / `#view-host` 内）；`test/gate-integrity.test.ts` 的 `expectFailPattern` 声明数**只增**。
6. 每个被改动判据**逐条实跑**：注入 → FAIL → 逐字节 sha256 还原 → PASS（日志全量）。

**产出**: 17 个门禁文件（`test/ui/*.mjs` + `test/*.test.ts`）等价重锚 + 反证重写记录。

**验收标准（可机核）**:
- [ ] 各门禁计数 ≥ 基线：`l0 ≥223` / `l1 ≥111` / `l2 ≥74` / `page-input ≥106` / `stream ≥63` / `ask-auth ≥61` / `recommendation ≥56` / `hardening ≥24` / `insight ≥116` / `node test ≥1001`
- [ ] **无「不再 FAIL 的判据」**（每个改动判据注入后必红，逐条留证）
- [ ] `l1-reverse ≥9` / `l2-reverse ≥10`（注入点已随形态重写，非恒绿）
- [ ] `gate-integrity ≥12`；`expectFailPattern` 声明数只增；`CHROMIUM_GATES` 保持 9
- [ ] 每处改写登记 `modifiedRanges[]`（hunk ↔ 条目全命中；`newTitle` 可定位；`reason ≥ 40`）

**红线检查点**: 冻界面 `F1`/`F4`/`F5`；阈值面 `T-a`/`T-b`/`T-e`（**零放宽**）；台账面 `L-a`（`modifiedRanges` / `redlineRemap` / `entries`）。

**验证命令**:
```bash
for g in l0 l1 l2 page-input stream ask-auth insight hardening recommendation l1-reverse l2-reverse; do npm run test:$g --workspace @lgdl/web-cli-plugin 2>&1 | tee "/tmp/opencode/v45-gate-logs/w4-$g.log" || exit 1; done
npm test --workspace @lgdl/web-cli-plugin 2>&1 | tee /tmp/opencode/v45-gate-logs/w4-node.log
npm run test:gate-integrity --workspace @lgdl/web-cli-plugin 2>&1 | tee /tmp/opencode/v45-gate-logs/w4-gate-integrity.log
```
（**严格串行**：一次一个 Chromium。）

---

### TASK-V45-116（V451-16）: density 31 格实测重算 + `v45Ledger` + 夹具三重构造判据
| 属性 | 值 |
|------|-----|
| **复杂度** | L |
| **前置依赖** | TASK-V45-115 |
| **执行波次** | 4（原子区间 D） |
| **对应 FR / AC** | FR-V45-070 / 071 / 072 / 073 / 074 · AC-V45-006 / 018 · EC-V45-011 |
| **ADR / 风险** | ADR-V45-006 · R-REG-006 / 008 / 009 / 902 · R-V45-107 · R-V45-106 |
| **并行度** | 串行（需终态 DOM + 体积先记，为 T118 供数） |

**输入**: ADR-V45-006（口径零放宽 + 测量流程 6 步 + 夹具三重构造判据 + 越限停机）；`density-scope.ts:35`（`DENSITY_EXCLUDED_SUBTREES = ['#stream']`）；`test/ui/density.mjs:313-364,546,705,744`；`docs/v4-density-baseline.json`（31 格 / `riskIncrementRegistry` / `thresholds`）；开放点 `V45-P-012`（**`pending-measurement`，禁预填**）。

**动作**（严格串行）:
1. `npm run build` → `stat -c %s dist/sidepanel.js`（体积先记，供 T118）。
2. `npm run test:density` **首轮实测** → 记录 31 格三视口读数（C1/C2/归属/chars）。
3. 与基线逐格 diff → 全部写入 `docs/v4-density-baseline.json#v45Ledger`：`{cell, tier, vp, before, after, delta, measuredOn, source, reason, historyRetained}`（**每格留痕，无静默改写**）。
4. `thresholds` / `streamHeightRatioMin` / `logClientHeightFloor` / `registeredCells` / `perCardBudget` **零 diff**。
5. `riskIncrementRegistry` 双向精确期望按新面重锚（4 溯源字段 `rulingId`/`rulingDate`/`approvedBy`/`reason` **缺一 FAIL**）。
6. `npm run test:density` 复跑 → 阶段 F 机器比对全绿（**≥175**）。
7. **夹具稳态锚 = 三重构造判据**：`settledProbe` 重写为「流内 `[data-msg-type="system"][data-kind="notice"]` 行存在」∧「`#stream > li[data-msg-type]` 无未终态卡」∧「计数 == 登记期望」；`assertFixtureSettled()` 逐 cell 断言三项；**反证**：把构造序列最后一步延后 ⇒ 三项之一必红；跨夹具顺序置换不产生新红。
8. **反证不空转**：RP-V4-01~09 复跑；注入点若因形态迁移被搬走（如 `#l0-decision` 注入点已不存在）**必须重写注入点**（改注入新承载面：卡内 / `#view-host` 内）；流程 = 注入 → FAIL（声明 `expectFailPattern`）→ 逐字节 sha256 还原 → PASS；日志全量。
9. **迁出/迁入方向性**：`assertChromeNotInStream()` 继续成立并被反证；迁入 `#view-host` 的内容**进被测量面**（不豁免）。

**产出**: `test/ui/density.mjs` + `docs/v4-density-baseline.json`（`v45Ledger` + `riskIncrementRegistry` + 夹具锚说明；阈值零 diff）+ 体积实测值（移交 T118）。

**验收标准（可机核）**:
- [ ] 31 格**逐格留痕**（`before`/`after`/`delta`/`reason`/`historyRetained` 齐备）
- [ ] 阈值 / `streamHeightRatioMin` / `logClientHeightFloor` / `registeredCells` / `perCardBudget` **零 diff**
- [ ] `test:density ≥175`（两轮：首轮实测 + 复跑全绿）
- [ ] 夹具三重构造判据逐 cell 断言；反证「延后一步 ⇒ 红」实跑
- [ ] RP-V4-01~09 复跑无恒绿（注入点已重写）；`riskIncrementRegistry` 4 溯源字段齐备
- [ ] **任一登记格 C1/C2 > 阈值 ⇒ 停下上报编排器**（禁静默放宽 / 静默删格 / 把内容挪回 `#stream`）

**红线检查点**: 冻界面 `F5`；阈值面 `T-a`（**逐字不动**）/`T-b`；台账面 `L-b`（每格留痕 + 溯源字段）。

**验证命令**:
```bash
npm run build --workspace @lgdl/web-cli-plugin && stat -c %s packages/web-cli-plugin/dist/sidepanel.js
npm run test:density --workspace @lgdl/web-cli-plugin 2>&1 | tee /tmp/opencode/v45-gate-logs/w4-density-run1.log
npm run test:density --workspace @lgdl/web-cli-plugin 2>&1 | tee /tmp/opencode/v45-gate-logs/w4-density-run2.log
git diff --stat -- packages/web-cli-plugin/docs/v4-density-baseline.json
```

---

### TASK-V45-117（V451-17）: `options/index.html` 解冻 + 范围门禁 + `zero-injection` 复跑
| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-V45-101（范围门禁骨架位） |
| **执行波次** | 5（原子区间 D；**可与 W4 并行准备**，复跑进串行门禁队列） |
| **对应 FR / AC** | FR-V45-050 / 051 / 052 · AC-V45-013 · EC-V45-010 |
| **ADR / 风险** | ADR-V45-009 · R-REG-013 |
| **并行度** | 实现可并行（独立文件）；`test:zero-injection` 复跑须串行 |

**输入**: ADR-V45-009（解冻落点 + 字段扩展 schema + 范围门禁 3 条 + 复跑）；`docs/v3-supersession-ledger.json#zeroDiffFiles`（9 项，含 `src/ui/options/index.html`）；`test/supersession-ledger.test.ts:824-840`（`unfrozenZeroDiffFiles[]` 机制）；FIX-2 的 4 处订正文案。

**动作**:
1. **文案订正**（纯文案行）：授权指引改为「设置 → 站点与授权」口径（或推荐卡「授权当前站点」），与 FIX-2 的 4 处**逐字一致**；全仓 `grep 「侧栏『授权当前站点』」` **零命中**（`tree-ops.ts` 未声称具体位置者除外）。
2. `docs/v4-supersession-ledger.json#unfrozenZeroDiffFiles[]` 条目 schema 扩展：`{file, scope:"copy-only-lines", reason(≥40), textBefore, textAfter, date, operator, frozenBy, reintroductionGate}`。
3. **范围门禁（新增，只增）**：对该文件 `git diff -U0` 逐 hunk 判定 —— ① 仅出现在文案区域（不含 `<script>`/`<link>`/`import`/`permissions`/DOM 属性/结构标签变更）② 不新增 `href`/`src`/`on*` 属性 ③ 字节变化 ≤ 登记阈值。任一不满足 ⇒ FAIL。
4. **复跑不回归**：`npm run test:zero-injection` **≥27** 全绿且计数不减；`docs/v3-supersession-ledger.json` **零 diff**。
5. 3 反证：① 在解冻文件中加 `<script>` ⇒ 范围门禁红 ② 删 `unfrozenZeroDiffFiles` 条目 ⇒ `zeroDiffFiles` 段红 ③ `reason < 40` ⇒ 字段门禁红。

**产出**: `src/ui/options/index.html`（纯文案）+ `docs/v4-supersession-ledger.json#unfrozenZeroDiffFiles` + 范围门禁（node 断言）。

**验收标准（可机核）**:
- [ ] 该文件 `git diff -U0` 仅文案行（无结构 / 属性 / 脚本变化）；字节变化 ≤ 阈值
- [ ] `unfrozenZeroDiffFiles` 条目 9 字段齐备；`reason.length ≥ 40`
- [ ] `zero-injection ≥27` 且计数不减；`docs/v3-supersession-ledger.json` 零 diff
- [ ] 3 反证逐条实跑可 FAIL
- [ ] 全仓「侧栏『授权当前站点』」零命中（白名单除外）

**红线检查点**: 冻界面 `F3`（零权限 / 零依赖 / 零注入）/`F4`（v3 台账零 diff）；阈值面 `T-a`~`T-e`；台账面 `L-a`（解冻留痕 + 前后文案 + 日期 + 操作者）。

**验证命令**:
```bash
git diff -U0 -- packages/web-cli-plugin/src/ui/options/index.html
npm run test:zero-injection --workspace @lgdl/web-cli-plugin 2>&1 | tee /tmp/opencode/v45-gate-logs/w5-zero-injection.log
git diff --stat -- packages/web-cli-plugin/docs/v3-supersession-ledger.json   # 零行
```

---

### TASK-V45-118（V451-18）: 体积五要素**双向**登记 + V3-VOL-3 三值同源 + 档位闸门
| 属性 | 值 |
|------|-----|
| **复杂度** | L |
| **前置依赖** | TASK-V45-116（体积实测值） |
| **执行波次** | 5（原子区间 D） |
| **对应 FR / AC** | FR-V45-090 / 091 / 092 / 093 · AC-V45-019 / 020 · NFR-V45-005 |
| **ADR / 风险** | ADR-V45-011 · R-REG-007 / 015 · R-V45-101 |
| **并行度** | 串行（依赖 T116 的 build 体积；三值同源须与 T113 同轮） |

**输入**: ADR-V45-011（五要素双向 + 档位不下移算术 + 停机规则）；`test/size-baseline.ts:301`（`SIDEPANEL_BASELINE_BYTES = 480_026`）+ `:360-366,395-510,940-992`；`test/size-budget.test.ts:45-53,300-303,429-444`；`test/size-growth-evidence.test.ts:126-133`；`docs/v4-supersession-ledger.json#v3Vol3Closeout`；开放点 `V45-P-013`（**`pending-measurement`，禁预填**）。

**动作**:
1. **五要素重登记（双向）**：`{measuredOn, newBaselineBytes, previousBaselineBytes, previousCeilingBytes, source, buildCommand, reason, measuredBy, reRegisteredFrom, direction:'raised'|'lowered'}`；净减方向 `reason` 写明「有意的结构净减（退役 4 宿主 + 5 条提示带投影）」；旧值进 `SIDEPANEL_BASELINE_BYTES_HISTORY` + `_TIMELINE` + `SIDEPANEL_RE_REGISTRATIONS`（**历史保留**）。
2. `SIDEPANEL_CEILING` 重算：**严格等于** `floor(SIDEPANEL_BASELINE_BYTES × 1.05)`（无 cap）；`SIDEPANEL_CEILING_CAP` 保持 `record-only`、**不得被读取**。
3. **逐模块 metafile 归因**：`Σ 逐模块 Δ + 未归因胶水 == 登记增量`（**允许负 Δ**）；`SIDEPANEL_GROWTH_BREAKDOWN.rows` 支持负值。
4. **披露算术机核（I-10）支持负 Δ**：`Δ = new − prev < 0`、`% = Δ/prev×100 < 0`；`META.measuredBy` 与末条登记同源。
5. **V3-VOL-3 三值同源前移**：`PENDING_ABSOLUTE_CAP.newBaselineBytes = SIDEPANEL_BASELINE_BYTES`（新值）；`ceilTo50KB(newBaselineBytes) === 512_000`；`absoluteCeilingBytes === 563_200`；`resolvedOn` 保持原实测日期；`authorConfirmation.status` **保持 `pending-author-line`**（不得伪称已确认）。
6. **档位不下移闸门**：`test/size-ruling-vol3.test.ts` 新增断言 `newBaselineBytes >= 460_801` ∧ `ceilTo50KB(newBaselineBytes) === 512_000`；越界 ⇒ FAIL 并提示「停下上报编排器」。
7. **红线逐字节复核**：`dist/content.js = 177,076 B` / sha `52a82620…`；`dist/pick-layer.js = 33,900 B` / sha `5f567d7e…`；`design/**` 与 shim 双 sha；`manifest.json` / 判定链内容哈希；`docs/v3-supersession-ledger.json` 零 diff。
8. **反证**：① 用旧基线算 `SIDEPANEL_CEILING` ⇒ 严格等式红；② 登记增量与 metafile Σ 不等 ⇒ 归因红；③ `direction:'raised'` 而 Δ < 0 ⇒ 算术机核红；④ `SIDEPANEL_CEILING_CAP` 接回判定 ⇒ `record-only` 断言红。

**产出**: `test/size-baseline.ts` + `test/size-{budget,growth-evidence,ruling-vol3}.test.ts` + `docs/v4-supersession-ledger.json#v3Vol3Closeout`。

**验收标准（可机核）**:
- [ ] 五要素齐备（含 `direction`）+ 三条历史数组保留旧值
- [ ] `SIDEPANEL_CEILING === floor(baseline × 1.05)`；`SIDEPANEL_CEILING_CAP` 零判定用法
- [ ] `Σ 归因 == 登记增量`（允许负 Δ）；I-10 元组前后值 / Δ / % 与登记字段逐项相等
- [ ] `newBaselineBytes >= 460_801` ∧ `ceilTo50KB === 512_000` ∧ `absoluteCeilingBytes === 563_200` ∧ `authorConfirmation.status === 'pending-author-line'`
- [ ] 红线逐字节复核通过（`content.js` / `pick-layer.js` / `design/**` / `manifest.json` / 判定链 / v3 台账）
- [ ] 4 反证逐条实跑可 FAIL；`test:size-ruling-vol3 ≥10`
- [ ] **净减 > 19,225 B ⇒ 停下上报**（禁静默改三值 / 禁为凑档位故意增重）

**红线检查点**: 冻界面 `F1`/`F2`/`F3`/`F4`；阈值面 `T-c`（**三值 + cap 角色 + 档位硬边界**）；台账面 `L-c`（五要素 + 历史数组）+ `L-a`（`v3Vol3Closeout` 前移）。

**验证命令**:
```bash
stat -c %s packages/web-cli-plugin/dist/sidepanel.js packages/web-cli-plugin/dist/content.js packages/web-cli-plugin/dist/pick-layer.js
npm run test:size-ruling-vol3 --workspace @lgdl/web-cli-plugin 2>&1 | tee /tmp/opencode/v45-gate-logs/w5-size-ruling-vol3.log
npm run test:size-attribution --workspace @lgdl/web-cli-plugin 2>/dev/null || npm run size:attribution --workspace @lgdl/web-cli-plugin 2>&1 | tee /tmp/opencode/v45-gate-logs/w5-size-attribution.log
```

---

### TASK-V45-119（V451-19）: 收尾原子区间 —— 24 门禁串行 + 红线逐字节 + 人工面清单 + 收口文档
| 属性 | 值 |
|------|-----|
| **复杂度** | L |
| **前置依赖** | TASK-V45-113 ~ TASK-V45-118（**同一 commit 区间 D**） |
| **执行波次** | 5（原子区间 D 收口） |
| **对应 FR / AC** | FR-V45-001~004 / 084 / 093 · AC-V45-014 / 019 / 020 / 021 / 022 · NFR-V45-007 |
| **ADR / 风险** | ADR-V45-012 §7-8 · ADR-V45-011 · R-REG-011 / 012 · R-V45-108 / 109 / 106 |
| **并行度** | 末位串行（W4+W5 原子区间的收口动作） |

**输入**: T113~T118 全部产物；`plan.md §2.5` T1~T10 + 父 §2.4 N1~N18；`plan.md §6.3` 风险 Top5 停机规则；`spec.md §8.3` 门禁集合。

**动作**:
1. **24 门禁严格串行全量复跑**（`typecheck` / `plugin npm test` / `test:l0` / `test:l1` / `test:l2` / `test:density` / `test:ui` / `test:insight` / `test:binding` / `test:hardening` / `test:page-input` / `test:stream` / `test:ask-auth` / `test:recommendation` / `test:ref-pick-wiring` / `test:size-ruling-vol3` / `test:l1-reverse` / `test:l2-reverse` / `test:zero-injection` / `test:design-contract` / `test:e2e` / `test:supersession` / `test:gate-integrity` / `build`）；一次一个 Chromium，`finally` 自清 profile；日志 `tee` 全量 `/tmp/opencode/v45-gate-logs/`（**禁 tail 截断**）。
2. `KL-N-10` 首轮异常 ⇒ **隔离复跑 ≥2**、日志全量、仍红如实登记**不阻塞收口**。
3. **红线逐字节复核**：`content.js`（177,076 B / `52a82620…`）/ `pick-layer.js`（33,900 B / `5f567d7e…`）/ `design/**` + shim 双 sha / `manifest.json` / 判定链内容哈希 / `docs/v3-supersession-ledger.json` 零 diff / `src/content/**` 零 diff。
4. **不动面 T1~T10 逐项** `git diff --quiet` 核验（含 `packages/web-cli-base/**` / `.opencode/opencode.json` / `ROADMAP.md` / F-29 区段）。
5. **收口硬条件核对**：① 各门禁计数 ≥ 基线 ② 无「不再 FAIL 的判据」遗留 ③ 台账 hunk ↔ 条目全命中 + `newTitle` 可定位 ④ 保护段判据全绿（journey 新 pin / binding 保段）⑤ 密度台账逐格留痕 ⑥ 体积五要素与三值同源。
6. **人工面清单**逐项标注（`⏳ 未执行` / `PASS`，**不得冒充**）：`title` 承载长文案的读屏体验（`V45-P-014`）/ 三主题与高 DPI 下迁入块可读性（EC-V45-009）/ 320px 迁入块（EC-V45-009）。
7. **收口文档**（本叶 `closeout.md` 或等效登记）：FIX-5 消解重述 / N-05 关闭登记 / `options` 解冻留痕 / `direction=lowered` 归因 / `knownGap` 一致性 / 台账计数（`entries` / `modifiedRanges` **实测后填值，禁预填**）。

**产出**: 24 门禁日志（全量）+ 红线复核记录 + 人工面清单 + 收口文档。

**验收标准（可机核）**:
- [ ] 24 门禁**全绿**且计数 ≥ 基线（逐项列出实测值）；日志全量落盘
- [ ] `document.querySelectorAll('#stream [data-host], #stream [data-transitional-host]').length === 0`
- [ ] 零「不再 FAIL 的判据」；`expectFailPattern` 声明数 ≥ 基线
- [ ] 红线 5 项逐字节通过；不动面 T1~T10 逐项零 diff
- [ ] 台账 hunk ↔ 条目全命中 + `newTitle` 可定位 + `reason ≥ 40`
- [ ] 人工面清单每项标注（无空白项，无伪造 PASS）
- [ ] 收口文档登记 4 项治理动作（FIX-5 / N-05 / options 解冻 / `lowered` 归因）

**红线检查点**: 冻界面 `F1`/`F2`/`F3`/`F4`/`F5`（**全项逐字节**）；阈值面 `T-a`/`T-b`/`T-c`/`T-d`/`T-e`（**零放宽**）；台账面 `L-a`/`L-b`/`L-c`（收口一致性）。

**验证命令**:
```bash
mkdir -p /tmp/opencode/v45-gate-logs
for s in typecheck build test test:supersession test:gate-integrity test:zero-injection test:design-contract test:page-input test:l0 test:l1 test:l2 test:density test:ui test:insight test:binding test:hardening test:e2e test:stream test:ask-auth test:recommendation test:ref-pick-wiring test:size-ruling-vol3 test:l1-reverse test:l2-reverse; do npm run $s --workspace @lgdl/web-cli-plugin 2>&1 | tee "/tmp/opencode/v45-gate-logs/${s//:/-}.log" || exit 1; done
stat -c %s packages/web-cli-plugin/dist/content.js packages/web-cli-plugin/dist/pick-layer.js packages/web-cli-plugin/dist/sidepanel.js
git diff --quiet -- packages/web-cli-plugin/docs/v3-supersession-ledger.json packages/web-cli-base .opencode/opencode.json ROADMAP.md && echo "frozen surfaces: clean"
```

---

## 3. 任务汇总

| 统计项 | 数值 |
|--------|:--:|
| 总任务数 | **19** |
| S 级 (简单) | 2（`102` / `103`） |
| M 级 (中等) | 6（`101` / `107` / `110` / `111` / `114` / `117`） |
| L 级 (复杂) | 11（`104` / `105` / `106` / `108` / `109` / `112` / `113` / `115` / `116` / `118` / `119`） |
| 执行波次 | 5（W1~W5） |
| spikeGate（先验闸门） | 2（`TASK-V45-102` → `TASK-V45-114`；`TASK-V45-103` → `TASK-V45-113`） |
| 提交区间 | 4（A=W1 / B=W2 / C=W3 / **D=W4+W5 原子**） |

### 3.1 覆盖面 → 任务映射（编排器要求 **①~⑭ 逐项不漏**）

| # | 覆盖面 | 承载任务 |
|:--:|---|---|
| ① | host-registry 零宿主断言 + `RETIRED` 扩容 | `T111`（+`T107` 宿主清零） |
| ② | 5 通道 DOM 真退役 + 15 门禁 44 处 id 引用断言重写（数量 ≥ 原值） | `T105` + `T106`（+`T104` 单写） |
| ③ | decision 壳元素迁移（选项池 / 后果预演 → askuser·auth 卡；receipt → 固化区；ref 证据 + 三恢复按钮 → ref 卡） | `T108`（+`T109` 审计落点） |
| ④ | l1-panels 4 开关去向（局部树 → L2 树视图 / 历史退役 + 计数入审计标题 / 回执 → 审计 / 手势 → 设置帮助分区） | `T109` + `T112` |
| ⑤ | composer 迁 body 尾 | `T110` |
| ⑥ | journey `supersessionChain` 第二次八步取代 | `T113`（闸门 `T103`） |
| ⑦ | binding 字节中立避让 + 段外迁移 | `T114`（闸门 `T102`） |
| ⑧ | density 31 格重算 + 台账 + `v45Ledger` | `T116` |
| ⑨ | risk-recovery 扩展（site/probe + rebind/help，act 6 项 + 布线门禁） | `T112` |
| ⑩ | options 解冻 + 文案订正 | `T117` |
| ⑪ | 体积五要素双向登记 | `T118` |
| ⑫ | l0 / l1 / disclosure / system-merge 断言重写 | `T115` + `T111`（`l0` 结构）+ `T110`（disclosure） |
| ⑬ | 反证重写（注入点随形态搬迁） | `T115` + `T106` / `T111` / `T113` / `T114` / `T116` |
| ⑭ | 文档收尾 | `T119` |
| + | W1 门禁脚手架 / 断言预迁移 | `T101` + `T102` + `T103` |

---

## 4. 执行策略

| 波次 | 任务 | 策略 |
|:--:|------|------|
| 1 | `T101` · `T102` · `T103` | **`T101` 落盘骨架；`T102` / `T103` 并行**（只读探针，临时目录，不入版本库）。`T102` / `T103` 为 **spikeGate**，结论 = `report-to-orchestrator` ⇒ 对应下游暂停并上报。提交区间 **A**。 |
| 2 | `T104` → `T105` → `T106` | **严格串行**（emitter 唯一必须先于 DOM 退役；断言重写必须在退役之后）。Chromium 门禁一次一个。提交区间 **B**（W2 完成前不得跑 journey / density 收口判据）。 |
| 3 | `T107` → `T108` → `T109` → `T110` → `T111` → `T112` | **严格串行**（`index.html` / `sidepanel.ts` / `view-model.ts` / `l0.mjs` 四文件被多任务共享）。提交区间 **C**。 |
| 4 | `T114` ∥ `T115` → `T113` → `T116` | `T114` 与 `T115` 文件不相交可并行改写，但 `L-a` 写入与 Chromium 门禁**串行**；`T113` 须在 journey 重锚后 → `T116` 须在终态 DOM 后（先 `build` 记体积）。 |
| 5 | `T117` ∥ (W4) → `T118` → `T119` | `T117` 实现可并行准备（独立文件），`zero-injection` 复跑进串行队列；`T118` 依赖 `T116` 的体积值；`T119` 末位收口。 |
| **4+5** | `T113 ~ T119` | **同一原子 commit 区间 D**：终态 DOM + 新 pin + 密度台账 + 体积登记 + 门禁日志必须一次落盘；失败 ⇒ 整区间回滚重跑（R-V45-109）。 |

### 4.1 停机规则（**遇到即停下上报编排器**，禁静默弱化）

| 触发 | 停机点 | 处理 |
|---|---|---|
| binding 段前等长补偿不可行 | `T102` → `T114` | 上报「可删白区耗尽 / 语义不完整」证据；获批后走 binding pin 显式取代（链式八步），**不得静默改 pin** |
| journey 新 pin 无法命中 / v3 段判据因 `supersededFrom` 链断而红 | `T103` → `T113` | 回八步 ①~④；**不得改 v3 台账** |
| 体积净减 > 19,225 B（`newBaselineBytes < 460_801`）或 `size > ceiling` | `T118` | 停下上报（禁静默改三值 / 禁自缚装置 / 禁故意增重） |
| 任一密度登记格 C1/C2 > 阈值 | `T116` | 停下上报（阈值零放宽；禁静默删格 / 挪回 `#stream` 蹭豁免） |
| 某判据注入后仍绿（反证空转） | `T106` / `T111` / `T115` / `T116` | 重写注入点；仍不能红 ⇒ 判据视为无效并上报 |
| `KL-N-10` 首轮异常 | `T114` / `T119` | 隔离复跑 ≥2；仍红**如实登记不阻塞收口** |
| 台账 `newTitle` 无法定位 / hunk 未命中 | 全任务 | 补齐台账；**不得先删后补** |

---

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建（V4.5-1 **19 原子任务 / 5 波**：W1 门禁脚手架 + 断言预迁移（含 **2 个 spikeGate**：binding 字节中立避让探针 / journey 连锁判据预演）→ W2 strips 单写（`STRIP_CHANNEL_KINDS` 重构 + DOM 真退役 + 15 门禁 44 处断言重写）→ W3 宿主退役 + 元素迁移（`messageAnchor` + 4 宿主移除 + decision 壳卡内化 + l1-panels 4 去向 + composer 出流 + disclosure 三声明 + 零宿主判据 + recovery/act/帮助分区）→ W4 门禁重算 + journey 取代 + 密度 → W5 收尾；**W4+W5 同一原子 commit 区间**；每任务含 输入 / 动作 / 产出 / 可机核验收 / 依赖 / 风险 / 规模 / **红线检查点（`F*` 冻界面 · `T-*` 阈值面 · `L-*` 台账面）**；编排器覆盖面 ①~⑭ 逐项映射；停机规则 7 条）。**本阶段只做 tasks**：不写代码、不改 `src/**`·`test/**`·`dist/**`·`docs/**`·`design/**`·ROADMAP，不动 `main`，**不跑门禁 / 构建 / Chromium**，**未调用任何受管 Provider**（routing.v1 = `local_or_compute → none`）。 | 2026-09-21 | SDDU Tasks Agent |
