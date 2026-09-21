# 任务分解：specs-tree-v5-2-ops-first-batch（V5-2 首批 9 op 落地 + SW 执行器 + 断流首验收；次叶）

> **文档定位**: SDDU 任务清单（**次叶 = 实施承载**）— **30 个原子任务**（`TASK-V5-123~152` / 叶内别名 `V52-01~30`），按 **`ADR-V5-012 §1` v5-2 七波** 展开；**权威跨切契约见父 `../plan.md` + `../ADR-V5-001~012-*.md` + 父 `../tasks.md`**
> **前置依赖**: 本叶 `plan.md` v1.0（`ADR-V5-002`(执行侧) / `003` / `004` / `005` + §5 文件影响）+ **上游叶 v5-1 交付**（`NextProvider` / `NextOp` 接口 + 注册表 API + `runOp` 四态 + 义务表机核 + `data-op` + `BLOCKED_TERMINALS`）+ 父/本叶 `spec.md` v1.0 + 父 `../discovery.md` v1.0（R-ALLN-002 / 003 / 012 / 904 / 905）
> **创建人**: SDDU Tasks Agent
> **创建时间**: 2026-09-22
> **版本**: v1.0
> **更新人**: SDDU Tasks Agent
> **更新时间**: 2026-09-22
> **更新说明**: 初始创建（30 原子任务 / 7 波；W1 本地只读 5 op + `op-table` → W2 特权 op 底座 + `op.authorize` → W3 `op.llm-config`（掩码 `secret`）→ W4 `op.perm.request`（`form`）+ X1 → W5 `op.revoke` + 拒绝非死端 → W6 settings 4 类收编 + 逐 op 布线门禁 → W7 S2 断流首验收 + X2 + 体积 + 收尾；含 **2 个 spikeGate**（`129` SG-3 / `144` SG-2）与每任务**红线检查点**四段清单）

---

## 0. 红线与纪律（本叶，**继承父 N1~N25 与父 §16 十二条**）

### 0.1 四段代号（父 `tasks.md §0` 定义，逐字一致）

| 代号 | 面 | 内容（逐字守线） |
|:--:|---|---|
| **F1** | 冻界面 | `design/**` 四 sha 零触碰；12 kind `CARD_TYPES` 零扩展 |
| **F2** | 冻界面 | `src/content/**` / `dist/content.js`（177,076 B / `52a82620…`）/ `dist/pick-layer.js`（33,900 B / `5f567d7e…`）**零改动** |
| **F3** | 冻界面 | `KIND_SET` 逐字零新增；判定链内容哈希 pin；`manifest.json` **零 diff**（X1 的「机制预留」**不是**放开） |
| **F4** | 冻界面 | `docs/v3-supersession-ledger.json` 零 diff + `zeroDiffFiles` 8 项逐字节 |
| **F5** | 冻界面 | `packages/web-cli-base/**` / `.opencode/opencode.json` / `ROADMAP.md` 零改动；不碰 `main`；无新依赖；path-limited `git add` |
| **T-a** | 阈值面 | 密度阈值 7/15 · 9/20 · 17/35 逐字；豁免只认 `hidden`；`registeredCells 31` |
| **T-b** | 阈值面 | `STREAM_HEIGHT_RATIO_MIN = 0.65`（只上调） |
| **T-c** | 阈值面 | 体积上限公式 / cap `record-only` / 档位 512,000 / 绝对上限 563,200 / `pending-author-line` |
| **T-d** | 阈值面 | `MAX_CHIPS_PER_CARD = 3` / `MAX_NEXTSTEP_CARDS_PER_ROUND = 1` / `NEXTSTEP_MIN_INTERVAL_MS = 10000` / `NEXTSTEP_SOURCE_WHITELIST` **7 项零扩项** / `MAX_OPEN_ASKS = 2` / `ASK_CANCEL_REASONS` 4 项 / **`MAX_CLICKABLES_PER_CARD = 6`** |
| **T-e** | 阈值面 | `ACT_TO_OP` 6 行唯一权威（v5-1 已重锚）；本叶**不得**回退为 act 闭集 |
| **L-a** | 台账面 | `docs/v4-supersession-ledger.json`（`modifiedRanges[]` / `designContractChanges[]` / `knownGap` / `v3Vol3Closeout`） |
| **L-b** | 台账面 | `docs/v4-density-baseline.json`（本叶只读；v5-3 重锚） |
| **L-c** | 台账面 | `test/size-baseline.ts` 五要素 + `_HISTORY` + `_TIMELINE` + `SIDEPANEL_RE_REGISTRATIONS` + `SIDEPANEL_GROWTH_BREAKDOWN` |
| **C-1** | 契约面 | 12 kind 契约 / `BORN_FROZEN_KINDS` 语义；`askKind` 是**扩值**不是新 kind；**不加 kind** |
| **C-2** | 契约面 | `op-table` 单源 `{id, layer, mode, fail, audit}` + SW 镜像**同源**（零第二份手工镜像） |
| **C-3** | 契约面 | `BLOCKED_TERMINALS` 恰 5 项单源（本叶**只消费**，不得新写字面量） |
| **C-4** | 契约面 | `ACT_TO_OP` 唯一权威；chip 只读 `data-op` |
| **C-5** | 契约面 | F / G 双契约各冻各的（本叶不得触碰 `design-contract` 常量） |
| **C-6** | 契约面 | 义务表 ↔ 注册表一致（本叶改 `chips` / `params` / `consent` 必须同步义务表） |
| **C-7** | 契约面 | `op.execute(` 恰 1 调用点；**特权 op 恰 2 项**；`op.turn` **唯一** `requestTurn`；SW 内 `.request(` **零命中**；`REGISTERED_STRUCTURAL_HOSTS = []` |

### 0.2 纪律（逐字继承）

| # | 纪律 | 守线任务 |
|---|------|---------|
| 1 | **断言零删除零降级、计数只增不减** | 全任务；重点 `140` / `147` / `148` / `151` |
| 2 | **反证必须实跑**（注入 → FAIL → **逐字节还原** → PASS）；注入点被搬走必须重写 | `130` / `132` / `140` / `142` / `147` / `148` / `150` / `151` |
| 3 | **门禁严格串行**（一次一个 Chromium，`finally` 自清 profile）；日志 `tee` 全量 | `140` / `148` / `151` / `152` |
| 4 | `KL-N-10` 纪律（`test:binding` 首轮偶发红 ⇒ 隔离复跑 ≥2、日志全量、仍红如实登记） | `152` |
| 5 | 停机规则（父 §7 9 条）命中 ⇒ 停下上报（禁静默弱化 / 禁把 `op-*` 加进 `KIND_SET` / 禁静默改 pin） | `129` / `140` / `144` / `152` |
| 6 | `git add` path-limited；不 force push；不合 `main`；无新依赖 | `152` |
| 7 | 人工面逐项标注（`⏳ 未执行` 或 `PASS`，**不得冒充**）—— 浏览器原生权限弹窗体感 | `150` / `152` |
| 8 | **SW 永不 `.request(`**（Chrome 手势约束）；「特权 op 经 SW」= **SW 是授权裁决 / 快照 / 审计 owner，页面只提供手势** | `133` / `139` / `148` |
| 9 | **`op-*` 消息族 type-only**：union 类型成员（运行时零字节）；`KIND_SET` 逐字零新增；独立运行时校验模块 | `129` / `130` / `131` |

### 0.3 编号与规模

| 项 | 值 |
|---|---|
| 全局编号段 | **`TASK-V5-123~152`**（30 条；与 v5-1 `101~122` 连续、零冲突） |
| 叶内别名 | `V52-01~30` |
| 任务总数 / 波数 | **30 / 7** |
| 规模分布 | **S×2 / M×16 / L×12** |
| spikeGate | **SG-3 = `TASK-V5-129`**（`op-*` type-only 通路 → 闸 `130` / `131`）；**SG-2 = `TASK-V5-144`**（binding 避让 → 闸 `152`） |
| 体积预算（本叶） | 逐项 **5,200 B**（`ADR-V5-011 §1` #4+#7）+ 胶水分摊 350 = **5,550 B**（父 `tasks.md §4.1`） |

### 0.4 本叶提交区间

| 区间 | 波 | 内容 |
|:--:|:--:|---|
| **A** | W1 | 本地只读 5 op + `op-table` |
| **B** | W2 | 特权 op 底座 + `op.authorize`（**SG-3 先验**） |
| **C** | W3 | `op.llm-config`（掩码 `secret`） |
| **D** | W4 | `op.perm.request`（`form`）+ X1 权限面重锚 |
| **E** | W5 | `op.revoke` + 三表回滚 + 拒绝非死端（**SG-2 先验**） |
| **F** | W6 | settings 4 类收编 + 布线门禁 |
| **G** | W7 | S2 首验收 + X2 + 体积 + 收尾 |

---

## 1. 依赖拓扑总览

```
[前置] v5-1 全绿（TASK-V5-101~122）+ 本叶 plan.md（ADR-V5-002执行侧/003/004/005）+ 父 tasks.md（跨切红线 / 预算 / 停机）

Wave 1 ── 本地只读 5 op + op 表（区间 A）        ※ 124 ∥ 125 ∥ 126 ∥ 127 可并行
  TASK-V5-123 [M] shared/op-table.ts 9 行描述符 + ops.ts 执行体脚手架与注册接线
  TASK-V5-124 [M] op.pick（复用既有拾取单一入口）
  TASK-V5-125 [M] op.describe（复用 submitDescribe）
  TASK-V5-126 [M] op.rebind（复用 #rebind 单一入口，幂等）
  TASK-V5-127 [M] op.help（由 when(ctx) 派生，禁硬编码）
  TASK-V5-128 [M] op.turn（唯一 requestTurn）

Wave 2 ── 特权 op 底座 + op.authorize（区间 B）   ※ 129 闸门 → 130/131；130 → 131 → 132 → 133
  TASK-V5-129 [S] spikeGate-3：op-* type-only 通路探针              ← 闸门 → 130/131
  TASK-V5-130 [M] op-protocol.ts + messaging.ts union type-only + test/op-protocol.test.ts
  TASK-V5-131 [M] service-worker.ts case 'op-exec' + 入口闸门
  TASK-V5-132 [M] op-executors.ts SW 镜像 + test/sw-op-mirror.test.ts
  TASK-V5-133 [L] op.authorize 两段握手（SW = 裁决/快照/审计 owner）

Wave 3 ── op.llm-config（掩码 secret）（区间 C）  ※ 134 → 135；136 可与 135 并行；137 依赖 134~136
  TASK-V5-134 [M] stream-model.ts askKind 扩值 + payload 扩字段
  TASK-V5-135 [M] cards/askuser.ts secret 扩形渲染 + 掩码固化文案
  TASK-V5-136 [M] sidepanel.ts#submitSecret 值直达 key-store（恰 1 调用点）
  TASK-V5-137 [L] op.llm-config 执行体 + 凭据表快照回滚

Wave 4 ── op.perm.request（form）+ X1（区间 D）  ※ 138 → 139；140 依赖 138/139
  TASK-V5-138 [M] cards/askuser.ts form 扩形（选项源 = OPTIONAL_CAPABILITIES）
  TASK-V5-139 [L] op.perm.request（机制预留）+ 手势路径 + 批准/拒绝双固化
  TASK-V5-140 [L] X1 权限面门禁等价重锚（4 门禁）+ manifest 零 diff 登记

Wave 5 ── op.revoke + 拒绝非死端（区间 E）        ※ 141 → 142 → 143；144 并行只读探针
  TASK-V5-141 [L] op.revoke 执行体 + 高风险确认卡 + 审计入口
  TASK-V5-142 [L] 三表整体回滚（授权 / 权限 / 凭据）
  TASK-V5-143 [M] 拒绝非死端（consent 拒绝 / 权限被拒 / ask 取消）
  TASK-V5-144 [S] spikeGate-2：binding 保护段字节中立避让探针        ← 闸门 → 152

Wave 6 ── settings 4 类收编 + 布线门禁（区间 F）   ※ 145 → 146；147 依赖 145/146；148 可并行
  TASK-V5-145 [L] settings/ops.ts 4 类委派为 op 单一执行体
  TASK-V5-146 [M] settings/panel.ts 4 类按钮 → dispatchOp
  TASK-V5-147 [L] test/op-wiring.test.ts 逐 op 单一调用点 + 零 requestTurn + ≥3 反证
  TASK-V5-148 [M] test/authorize-chip-wiring.test.ts 特权 op 等价重锚

Wave 7 ── S2 首验收 + X2 + 体积 + 收尾（区间 G）  ※ 149 → 150 → 151 → 152 串行
  TASK-V5-149 [L] S2 断流全链样本与驱动 seam（10 环节）
  TASK-V5-150 [L] S2 断流首验收机器化（死端 = 0）+ 人工面登记
  TASK-V5-151 [L] X2 门禁等价重锚 + stream/ask-auth 增断言
  TASK-V5-152 [L] binding.mjs 段内零改/段外登记 + 体积五要素 + 本叶收尾
```

**关键路径（严格串行，28 任务）**：
`123 → 124 → 125 → 126 → 127 → 128 → 130 → 131 → 132 → 133 → 134 → 135 → 136 → 137 → 138 → 139 → 140 → 141 → 142 → 143 → 145 → 146 → 147 → 148 → 149 → 150 → 151 → 152`
**旁路闸门**：`129`（SG-3）→ 闸 `130` / `131`；`144`（SG-2）→ 闸 `152`。
**可并行（文件不相交）**：`124 ∥ 125 ∥ 126 ∥ 127`；`135 ∥ 136`（准备）；`145 ∥ 148`；`144 ∥ 141`（只读探针）。

---

## 2. 任务列表

### TASK-V5-123（V52-01）: `shared/op-table.ts` 9 行描述符 + `ops.ts` 执行体脚手架与注册接线
| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | v5-1 全绿（`NextOp` / 注册表 API / `runOp`） |
| **执行波次** | 1（区间 A） |
| **对应 FR / AC** | FR-ALLN-065 / 068 / 040~048（注册面）· AC-ALLN-007 / 010 |
| **ADR / 风险** | ADR-V5-003（双侧同源）/ 002 · R-ALLN-012 |
| **并行度** | W1 首位（`124`~`128` 依赖本任务的 `opId` 集与 `OPS_BY_ID`） |

**输入**: `ADR-V5-003 §2`（`OP_DESCRIPTORS = [{id, layer, mode, fail, audit}, …]` **9 行**；面板注册表与 SW 执行器**都从它派生**）；`ADR-V5-002 §2.2` 9 op 落地矩阵（五要素）；`ADR-V5-011 §1 #4`（9 op 执行体净 3,400 B）。

**动作**:
1. 新建 `src/shared/op-table.ts`：**纯数据、零 chrome**，9 行 `{id, layer, mode, fail, audit}`；`layer` 分布 = `panel`×7 / `sw`×2。
2. 新建 `next-registry/ops.ts`：`OPS_BY_ID` 由 `OP_DESCRIPTORS` 派生 + 9 个 `NextOp` 注册（`opId` / `risk` / `layer` / `params?` / `consent?` / `receipt?` 齐备；**`execute` 体按波次逐步落地**，本任务先建骨架与 7 个 panel-local 的占位）。
3. 注册 9 个 opId 进注册表（`registerNextOp` 等价接线）；同步 `obligation-table.ts` 的 `chips` / `params` / `consent` 面（`C-6`）。
4. 反证：`op-table.ts` 改一行 ⇒ SW 镜像（`132`）与面板注册表断言**同时**红。

**产出**: `src/shared/op-table.ts`（9 行）+ `next-registry/ops.ts`（骨架 + 7 panel op 注册）。

**验收标准（可机核）**:
- [ ] `OP_DESCRIPTORS.length === 9` ∧ `layer === 'sw'` 的**恰 2 项**（`op.authorize` / `op.perm.request`）
- [ ] `op-table.ts` 零 `chrome` / 零 DOM 引用（纯数据）
- [ ] 9 个 `opId` 与 `obligation-table.ts` 9 行**集合相等**（`C-6`）
- [ ] `op.execute(` 调用点仍**恰 1**（`pipeline.ts`）—— 本任务只声明 `execute` 字段，不新增调用点
- [ ] 反证：`op-table` 改一行 ⇒ SW 镜像断言红（交 `132`）

**红线检查点**: 冻界面 `F2`（`content.js` 零增长：`op-table` 被双侧 import ⇒ 计入 panel，**不得**进 `content.js`）/ `F3`；阈值面 `T-d`；契约面 `C-1` / `C-2` / `C-6` / `C-7`；台账面 `L-a`（只读）。

**验证命令**:
```bash
npm run typecheck --workspace @lgdl/web-cli-plugin
node -e "const s=require('fs').readFileSync('packages/web-cli-plugin/src/shared/op-table.ts','utf8');if(/\bchrome\./.test(s))throw new Error('op-table must be chrome-free');console.log('op-table: pure data ok')"
```

---

### TASK-V5-124（V52-02）: `op.pick` —— 复用既有拾取**单一入口**
| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-V5-123 |
| **执行波次** | 1（区间 A） |
| **对应 FR / AC** | FR-ALLN-045 / 059 · AC-ALLN-007 |
| **ADR / 风险** | ADR-V5-002 / 005 · R-ALLN-012 |
| **并行度** | 与 `125` / `126` / `127` 并行 |

**输入**: 父 `spec §5.5 FR-ALLN-045`（风险级低·只读；params 无；**无 consent**；execute = 开启拾取态等待页面点击；receipt = 引用卡序号递增；取消 / 超时 ⇒ 错误卡 + 恢复 next（EC-ALLN-005）；零 `requestTurn`）。

**动作**:
1. 在 `ops.ts` 落 `op.pick.execute`：调用**既有拾取单一入口**（不新建第二条路径）。
2. `chips` 侧 `op.pick` 保留在 `recommend` 的 `refInvalid` 恢复首项（v5-1 `105` 已等价迁移）。
3. 取消 / 超时 ⇒ 错误卡 + 恢复 next（走 `109` 的 `errorWithRecovery` 语义位）。
4. 布线判据预置：唯一调用点 + 零 `requestTurn`（`147` 机核）。

**产出**: `ops.ts`（`op.pick`）+ 单一入口调用点登记。

**验收标准（可机核）**:
- [ ] `op.pick` 的拾取入口调用点 == **1**（源文本抽取）
- [ ] `op.pick` 分支零 `requestTurn(` 
- [ ] 取消 / 超时 ⇒ 错误卡 + 可达 next（恢复区）
- [ ] 用户回执 = 引用卡（序号递增）

**红线检查点**: 冻界面 `F2`（拾取面 `dist/pick-layer.js` 零改动）/ `F1`；阈值面 `T-d`（`MAX_CHIPS_PER_CARD`）；契约面 `C-1` / `C-7`；台账面 `L-a`（只读）。

**验证命令**:
```bash
npm run typecheck --workspace @lgdl/web-cli-plugin
npm test --workspace @lgdl/web-cli-plugin -- op-wiring 2>&1 | tee /tmp/opencode/v5-gate-logs/w1-op-pick.log
```

---

### TASK-V5-125（V52-03）: `op.describe` —— 复用 `submitDescribe` **单一入口** + 空描述零副作用
| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-V5-123 |
| **执行波次** | 1（区间 A） |
| **对应 FR / AC** | FR-ALLN-046 / 059 · AC-ALLN-007 · EC-ALLN-009 |
| **ADR / 风险** | ADR-V5-002 · R-ALLN-012 |
| **并行度** | 与 `124` / `126` / `127` 并行 |

**输入**: `FR-ALLN-046`（params = 描述文本（ask 卡 `text`）；无 consent；execute = 用描述代替引用继续；receipt = 系统行 + 新引用 / 回答固化；**空描述 ⇒ 卡内校验、零副作用**（不产回执、不改状态））。

**动作**:
1. `op.describe.execute` 调用**既有 `submitDescribe`**（单一路径）；`params.askSpec.kind === 'text'`。
2. 空描述 / 取消 ⇒ 卡内校验 + 零副作用（走 `ASK_CANCEL_REASONS`）。
3. 零 `requestTurn`。

**产出**: `ops.ts`（`op.describe`）+ 空值路径断言。

**验收标准（可机核）**:
- [ ] `submitDescribe` 调用点 == **1**；零 `requestTurn(`
- [ ] 空描述 ⇒ **不产回执** ∧ 状态零变更（断言「回执数不变 ∧ `#stream` 无新卡」）
- [ ] 正常路径 ⇒ 系统行 + 新引用 / 回答固化

**红线检查点**: 冻界面 `F1` / `F2`；阈值面 `T-d`（`MAX_OPEN_ASKS` / `ASK_CANCEL_REASONS`）；契约面 `C-1` / `C-7`；台账面 `L-a`（只读）。

**验证命令**:
```bash
npm run typecheck --workspace @lgdl/web-cli-plugin
npm test --workspace @lgdl/web-cli-plugin -- op-wiring 2>&1 | tee /tmp/opencode/v5-gate-logs/w1-op-describe.log
```

---

### TASK-V5-126（V52-04）: `op.rebind` —— 复用 `#rebind` 单一入口 + 幂等
| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-V5-123 |
| **执行波次** | 1（区间 A） |
| **对应 FR / AC** | FR-ALLN-041 / 059 · AC-ALLN-007 / 011 |
| **ADR / 风险** | ADR-V5-002 / 005 · R-ALLN-012 · R-ALLN-905 |
| **并行度** | 与 `124` / `125` / `127` 并行 |

**输入**: `FR-ALLN-041`（风险级低·幂等；params 无；**无 consent**；execute = 重新读取当前标签页并登记；receipt = 系统行「✓ 已重新绑定当前标签页」；**与既有 `#rebind` 同一生产入口**（单一调用点）；chip 点击**零 `requestTurn`**、不受 `pending` 门控、不写输入框）。

**动作**:
1. `op.rebind.execute` 调用 `rebindCurrentTab()`（**既有单一入口**；`settings` 面 `145` 亦委派此处）。
2. 幂等：连续两次执行 ⇒ 状态等价（无累积副作用）。
3. 不受 `pending` 门控（deny 集不误伤）；零 `requestTurn`；零输入框写入。
4. **binding 保护段（`107780..115930`）字节中立避让**：本任务**只改函数体**（`rebindCurrentTab` 在段**外**），段内监听器行逐字节不变（`SG-2` 预证 → `152` 落地）。

**产出**: `ops.ts`（`op.rebind`）+ 单一入口登记 + 段内零改证据。

**验收标准（可机核）**:
- [ ] `rebindCurrentTab` 调用点 == **1**；`op.rebind` 分支零 `requestTurn(` ∧ 零输入框写入
- [ ] `pending` 门控下仍可执行（deny 集断言）
- [ ] 幂等：两次执行后状态等价
- [ ] `test/ui/binding.mjs` 保护段 `107780..115930` / `be9ad0e9…` **逐字节不变**（`SG-2` 后复核）

**红线检查点**: 冻界面 `F1` / `F3`；阈值面 `T-d`；契约面 `C-7`；台账面 `L-a`（段外登记，`152` 对账）。

**验证命令**:
```bash
npm run typecheck --workspace @lgdl/web-cli-plugin
node -e "const fs=require('fs');const t=fs.readFileSync('packages/web-cli-plugin/test/ui/binding.mjs');const seg=t.slice(107780,115930);const h=require('crypto').createHash('sha256').update(seg).digest('hex');if(!h.startsWith('be9ad0e9'))throw new Error('binding pin moved: '+h);console.log('binding seg: intact')"
```

---

### TASK-V5-127（V52-05）: `op.help` —— 可达 op 列表**由 `when(ctx)` 派生**（禁硬编码）
| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-V5-123 |
| **执行波次** | 1（区间 A） |
| **对应 FR / AC** | FR-ALLN-047 · AC-ALLN-007 |
| **ADR / 风险** | ADR-V5-002 · **R-V5-104**（候选列表硬编码） |
| **并行度** | 与 `124` / `125` / `126` 并行 |

**输入**: `FR-ALLN-047`（execute = 列出当前 ctx 下**可达的 op**；receipt = `notice` / 系统行（**不回写任何授权**）；判据：输出 == 当前 ctx 下 `when(ctx) === true` 的 provider 的 chips 并集）。

**动作**:
1. `op.help.execute`：遍历 `resolveOrder(REGISTRY)` ⇒ `filter(p => p.when(ctx))` ⇒ chips 并集 ⇒ 复用**既有 `notice` / 系统行文案构造**（`ADR-V5-011 §3` 减体积优先级 1：**不新建字符串表**）。
2. 零回写：不触碰授权 / 状态（零 `dispatch` 副作用）。
3. 反证：注入一条与 `when(ctx)` 不符的手写列表 ⇒ **FAIL**（判据 == 派生并集）。

**产出**: `ops.ts`（`op.help`）+ 派生一致性断言。

**验收标准（可机核）**:
- [ ] `op.help` 输出 == 当前 ctx 下 `when(ctx) === true` 的 provider chips **并集**（集合相等）
- [ ] 无硬编码 op 列表（源文本：`op.help` 体内不出现 6/9 项字面数组）
- [ ] 零回写（执行前后授权 / 状态字段零变化）
- [ ] 反证：注入不符列表 ⇒ FAIL

**红线检查点**: 冻界面 `F1`；阈值面 `T-d`（`MAX_CHIPS_PER_CARD` / 7 源）；契约面 `C-6`；台账面 `L-a`（只读）。

**验证命令**:
```bash
npm run typecheck --workspace @lgdl/web-cli-plugin
npm test --workspace @lgdl/web-cli-plugin -- op-wiring 2>&1 | tee /tmp/opencode/v5-gate-logs/w1-op-help.log
```

---

### TASK-V5-128（V52-06）: `op.turn` —— **唯一**经 `requestTurn` 的 op（N25）
| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-V5-123 |
| **执行波次** | 1（区间 A） |
| **对应 FR / AC** | FR-ALLN-048 / 056（`next→op.turn`）· AC-ALLN-009 · **N25** |
| **ADR / 风险** | ADR-V5-001 / 005 · **R-ALLN-905** |
| **并行度** | W1 末位（依赖前 5 op 建立基线调用点集） |

**输入**: `FR-ALLN-048`（params = 指令文本（chip 自带语义）；无 consent；execute = 经 **`requestTurn` 单一入口**发起一次用户回合；receipt = 既有流内回合留痕）；`N25`（`op.turn` 唯一经 `requestTurn`）。

**动作**:
1. `op.turn.execute` 调 `requestTurn(instruction)`（**唯一入口**）；指令文本来自 chip 语义（渲染入既有流内回合留痕）。
2. 建立 **`REQUESTTURN_CALLSITE_SET`** 登记（`{opId, file, line}`），供 `147` 机核「除 `op.turn` 外零 `requestTurn`」。
3. 反证：让 `op.rebind` 也调 `requestTurn` ⇒ `147` FAIL。

**产出**: `ops.ts`（`op.turn`）+ `REQUESTTURN_CALLSITE_SET` 登记。

**验收标准（可机核）**:
- [ ] `requestTurn(` 在本叶新增路径中**恰 1 处**（`op.turn`）
- [ ] `REQUESTTURN_CALLSITE_SET` 已登记（`{opId, file, line}`）且集合 == 实际扫描结果
- [ ] 既有 `#composer` submit 链路的 `requestTurn` 调用点**零变化**（集合变化即红）
- [ ] 反证：本地 op 误接 `requestTurn` ⇒ FAIL

**红线检查点**: 冻界面 `F1` / `F3`；阈值面 `T-d`（`NEXTSTEP_MIN_INTERVAL_MS` / 每回合 ≤1 张推荐卡）；契约面 `C-7`（唯一 `requestTurn`）；台账面 `L-a`（只读）。

**验证命令**:
```bash
npm run typecheck --workspace @lgdl/web-cli-plugin
node -e "const s=require('fs').readFileSync('packages/web-cli-plugin/src/ui/sidepanel/next-registry/ops.ts','utf8');const n=(s.match(/requestTurn\(/g)||[]).length;if(n!==1)throw new Error('requestTurn callsites in ops.ts: '+n);console.log('op.turn: sole requestTurn ok')"
```

---

### TASK-V5-129（V52-07）: **spikeGate-3** —— `op-*` type-only 通路探针
| 属性 | 值 |
|------|-----|
| **复杂度** | S |
| **前置依赖** | 无（只读探针） |
| **执行波次** | 2（区间 B 首） |
| **对应 FR / AC** | FR-ALLN-067（X2）/ 111 · AC-ALLN-010 / 022 · **N1 / N8** |
| **ADR / 风险** | ADR-V5-003 · **R-ALLN-002**（`content.js` 零余量） |
| **并行度** | 与 W1 尾段并行（只读） |
| **闸门语义** | **spikeGate**：结论决定 `TASK-V5-130` / `131` 能否直落 |

**输入**: `ADR-V5-003 §1`（union 扩 `op-exec`/`op-exec-result`/`op-audit` **不进 `KIND_SET`**；独立运行时校验模块仿 `pick-protocol.ts` / `insight-protocol.ts`）；`messaging.ts:103-141`（`KIND_SET`）；`content-script.ts:20`（import 边）；type-only 先例 `command-policy` / `pick-layer-*` / `ref-rescue`。

**动作**（`/tmp/opencode/v5-spike/` 内，**只读仓库 + 临时副本**）:
1. 复算 `dist/content.js` == 177,076 B ∧ sha `52a82620…`（**基线**）。
2. 在临时副本上模拟「union 扩 3 项 + 独立校验模块」，**不改 `KIND_SET`** ⇒ 重算 `content.js` 尺寸理论增量（期望 = **0 B**）。
3. 核对 `content-script.ts` 的 import 边**不引用** `op-protocol.ts`（静态：`grep -rn "op-protocol" src/content src/shared` 期望 0 命中，`op-table` 除外说明）。
4. 记录失败判据（`KIND_SET` 被改 / `content.js` 尺寸变动 / 校验模块被 content-script 引用）。

**产出**: 探针报告（`type-only-feasible` 或 `report-to-orchestrator` + 逐项证据）；结论写入 `state.json#v5-2.spikes[]`。

**验收标准（可机核）**:
- [ ] `content.js` 基线逐字节命中（177,076 B / `52a82620…`）
- [ ] 模拟后 `content.js` 尺寸增量 == **0 B**（或明确给出不可行证据）
- [ ] `content-script.ts` 的 import 边不含 `op-protocol`（0 命中）
- [ ] 结论二值之一且带证据；`git status --short` **零输出**

**红线检查点**: 冻界面 `F2`（**红线零容差**）/ `F3`（`KIND_SET` 逐字零新增）；阈值面 `T-c`；契约面 `C-2`；台账面 `L-a`（**禁改 pin / 禁写台账**）。

**验证命令**:
```bash
mkdir -p /tmp/opencode/v5-spike && node /tmp/opencode/v5-spike/op-type-only-probe.mjs | tee /tmp/opencode/v5-gate-logs/w2-spike-op-typeonly.log
git status --short   # 必须为空
```

---

### TASK-V5-130（V52-08）: `op-protocol.ts` + `messaging.ts` union **type-only** + `test/op-protocol.test.ts`
| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-V5-129（**SG-3 = `type-only-feasible`**） |
| **执行波次** | 2（区间 B） |
| **对应 FR / AC** | FR-ALLN-067 / 111（X2）· AC-ALLN-010 |
| **ADR / 风险** | ADR-V5-003 · R-ALLN-002 |
| **并行度** | W2 串行首位（`131` / `132` 依赖） |
| **闸门依赖** | **`129` = `report-to-orchestrator` ⇒ 本任务暂停上报** |

**输入**: `ADR-V5-003 §1`（union 扩 3 成员；独立校验模块；SW 入口闸门追加 `&& !isOpMessage(raw)`）；`pick-protocol.ts` 先例。

**动作**:
1. 新建 `src/background/op-protocol.ts`：`isOpMessage(v): boolean`（仿 `pick-protocol.ts`），本族**唯一运行时校验**。
2. `messaging.ts` 的 **union 类型**扩 `| 'op-exec' | 'op-exec-result' | 'op-audit'`（TS 类型成员，**运行时零字节**）；**`KIND_SET` 集合字面量逐字不动**。
3. 新建 `test/op-protocol.test.ts`：① `KIND_SET` 与基线**逐字对比零新增**；② `dist/content.js` 177,076 B / sha 逐字节；③ `op-protocol.ts` 独立存在 ∧ `content-script.ts` 不引用；④ **反证**：把 `op-*` 加进 `KIND_SET` ⇒ `content.js` 尺寸判据 FAIL。
4. `test/gate-integrity.test.ts`：追加本门禁（只追加）。

**产出**: `op-protocol.ts` + `messaging.ts`（union 扩 3）+ `test/op-protocol.test.ts` + 反证留证。

**验收标准（可机核）**:
- [ ] `KIND_SET` 内容**逐字零新增**（与基线字面比对）
- [ ] `dist/content.js` 177,076 B / `52a82620…` **逐字节命中**
- [ ] `isOpMessage` 是 `op-*` 族**唯一**运行时校验（无第二处）
- [ ] 反证：加进 `KIND_SET` ⇒ FAIL（逐字节还原 ⇒ PASS）
- [ ] `test:content` / `pick-layer-budget` / `insight-protocol` **计数 ≥ 基线**

**红线检查点**: 冻界面 `F2`（**红线**）/ `F3`（`KIND_SET`）；阈值面 `T-c`；契约面 `C-2`；台账面 `L-a`（登记 X2 条目）。

**验证命令**:
```bash
npm run typecheck --workspace @lgdl/web-cli-plugin
npm run build --workspace @lgdl/web-cli-plugin && stat -c %s packages/web-cli-plugin/dist/content.js
npm test --workspace @lgdl/web-cli-plugin -- op-protocol 2>&1 | tee /tmp/opencode/v5-gate-logs/w2-op-protocol.log
```

---

### TASK-V5-131（V52-09）: `service-worker.ts` —— `case 'op-exec'` + 入口闸门
| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-V5-130 |
| **执行波次** | 2（区间 B） |
| **对应 FR / AC** | FR-ALLN-065 / 067 · AC-ALLN-010 |
| **ADR / 风险** | ADR-V5-003 · R-ALLN-002 |
| **并行度** | W2 串行 |

**输入**: `ADR-V5-003 §1`（SW 路由 `service-worker.ts:1990 handleMessage` 的 `switch (message.kind)`；入口闸门 `:2762`）；`ADR-V5-011 §1` 注（SW-only 模块**不进 `sidepanel.js`**，体积归因为 0）。

**动作**:
1. `handleMessage` 增 `case 'op-exec'`（分发到 `op-executors.ts`）。
2. 入口闸门追加 `&& !isOpMessage(raw)`（与既有 `isPluginMessage` / `isInsightMessage` / `isPickLayerMessage` / `isRefRescueMessage` 并列）。
3. `case 'op-exec'` 执行体经 `133` 接线（本任务先建路由与闸门）。
4. 无 `chrome.permissions.request` 调用（SW 禁 `.request(` 保留）。

**产出**: `service-worker.ts`（路由 + 闸门）。

**验收标准（可机核）**:
- [ ] 入口闸门含 `!isOpMessage(raw)`（源文本）
- [ ] `handleMessage` 含 `case 'op-exec'`
- [ ] SW 内 `.request(` **零命中**（`capability-wiring` 等价重锚后仍成立 ⇒ `148` 对账）
- [ ] `sidepanel.js` 尺寸因本任务**零变化**（SW bundle 归因 0）

**红线检查点**: 冻界面 `F3`（判定链内容哈希 pin：本任务不碰判定链）/ `F2`；阈值面 `T-c`；契约面 `C-2`；台账面 `L-a`（只读）。

**验证命令**:
```bash
npm run typecheck --workspace @lgdl/web-cli-plugin
node -e "const s=require('fs').readFileSync('packages/web-cli-plugin/src/background/service-worker.ts','utf8');if(!/isOpMessage/.test(s))throw new Error('gate missing');if(/permissions\.request\(/.test(s))throw new Error('SW must not call .request(');console.log('SW gate: ok')"
```

---

### TASK-V5-132（V52-10）: `op-executors.ts` SW 镜像 + `test/sw-op-mirror.test.ts`
| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-V5-131 |
| **执行波次** | 2（区间 B） |
| **对应 FR / AC** | FR-ALLN-068 · AC-ALLN-010 |
| **ADR / 风险** | ADR-V5-003 §2 · R-ALLN-901 / R-V5-101 |
| **并行度** | W2 串行 |

**输入**: `ADR-V5-003 §2`（`SW_OPS = {[id]: {mode, fail, audit}}` **由 `OP_DESCRIPTORS.filter(layer==='sw')` 派生**，**不得手写第二份**；镜像字段集**恰** `{id, mode, fail, audit}`；漂移反证：改 `op-table.ts` 一行 ⇒ SW 镜像 + 面板注册表断言**同时**红）。

**动作**:
1. 新建 `src/background/op-executors.ts`：`SW_OPS` 由 `OP_DESCRIPTORS` 派生（**恰 2 项**：`op.authorize` / `op.perm.request`）；导出 `execSw(op, ctx)` 骨架（`133` / `139` 填体）。
2. 新建 `test/sw-op-mirror.test.ts`：字段集恰 `{id, mode, fail, audit}` ∧ 与面板注册表**同源**（同一常量）∧ **漂移反证**（改一行 ⇒ 两侧同时红）∧ 「恰一处声明」扫描（禁手工镜像）。
3. `test/gate-integrity.test.ts`：追加本门禁（只追加）。

**产出**: `op-executors.ts` + `test/sw-op-mirror.test.ts` + 反证留证。

**验收标准（可机核）**:
- [ ] SW 镜像字段集 == `{id, mode, fail, audit}`（**恰 4 字段**，无多无少）
- [ ] 特权 op 镜像项 == **2**
- [ ] 漂移反证：注入 `op-table.ts` 单行改动 ⇒ **两侧同时 FAIL**（逐字节还原 ⇒ PASS）
- [ ] 「恰一处声明」：`src/**` 中 9 行描述符只出现于 `op-table.ts`

**红线检查点**: 冻界面 `F2` / `F3`；阈值面 `T-c`；契约面 `C-2`（同源）；台账面 `L-a`（只读）。

**验证命令**:
```bash
npm run typecheck --workspace @lgdl/web-cli-plugin
npm test --workspace @lgdl/web-cli-plugin -- sw-op-mirror 2>&1 | tee /tmp/opencode/v5-gate-logs/w2-sw-op-mirror.log
```

---

### TASK-V5-133（V52-11）: `op.authorize` 两段握手（SW = 裁决 / 快照 / 审计 owner；手势留 page）
| 属性 | 值 |
|------|-----|
| **复杂度** | L |
| **前置依赖** | TASK-V5-132 |
| **执行波次** | 2（区间 B 末位） |
| **对应 FR / AC** | FR-ALLN-040 / 065 / 066 · AC-ALLN-007 / 010 |
| **ADR / 风险** | ADR-V5-003 §3 · **R-V5-101**（握手半完成态）/ R-ALLN-003 |
| **并行度** | W2 末位（W3 前置） |

**输入**: `ADR-V5-003 §3` 六步握手（`op-exec{consentToken}` → SW 校验 / 快照 / 计算 host pattern → `op-exec-result{needsGesture, pattern}` → **page 手势**（唯一既有入口 `requestOriginPermissionDetailed`）→ `op-exec{gestureResult}` → SW **commit / rollback** + 审计 → `op-exec-result` → receipt）；`capability-wiring:51-58`（SW 永不 `.request(`）。

**动作**:
1. `op.authorize`：`params` 无（默认当前标签页 origin）；`consent` = **必需**（auth 卡 + 后果预演）；`layer = 'sw'`。
2. 面板侧**不再**自行 `send(makeMessage('authorize',…))` 决定授权 —— 授权登记 / 审计改由 SW 执行器裁决。
3. **commit 点为唯一提交点**：未 commit 前失败 ⇒ **无状态变更** + 错误卡 + 恢复 next（`R-V5-101`）。
4. 面板侧 `requestOriginPermissionDetailed` **恰 2 调用点**且都在手势回调内（既有断言保留）；SW 内 `.request(` 零命中。
5. receipt = 固化区 + 系统行「✓ 授权已生效」；`chips` 含 `op.authorize`（`site.unauthorized` 常驻候选）。

**产出**: `ops.ts`（`op.authorize`）+ `op-executors.ts`（`execSw` 两段握手体）+ 三步失败回滚断言。

**验收标准（可机核）**:
- [ ] `op.authorize.layer === 'sw'` ∧ `consent` 必需 ∧ `params` 无
- [ ] 握手三步（①~⑤）任一失败 ⇒ **无状态变更**（授权表逐字段不变）+ 错误卡 + 可达 next
- [ ] 面板侧 `requestOriginPermissionDetailed` 调用点 == **2** ∧ 均在手势回调内
- [ ] SW 内 `.request(` **零命中**（门禁保留）
- [ ] 成功路径：授权登记生效 ∧ 固化区 + 系统行两件套可达

**红线检查点**: 冻界面 `F3`（判定链 `auto-authorize.ts` / `policy.ts` 内容哈希 **不动**）；阈值面 `T-c` / `T-d`；契约面 `C-7`（特权 op 恰 2）；台账面 `L-a`（登记 `authorize` 路径改写条目）。

**验证命令**:
```bash
npm run typecheck --workspace @lgdl/web-cli-plugin
npm run test:authorize-chip-wiring --workspace @lgdl/web-cli-plugin 2>&1 | tee /tmp/opencode/v5-gate-logs/w2-op-authorize.log
npm test --workspace @lgdl/web-cli-plugin -- sw-op-mirror 2>&1 | tee /tmp/opencode/v5-gate-logs/w2-handshake.log
```

---

### TASK-V5-134（V52-12）: `stream-model.ts` —— `askKind` 扩值 + `payload` 扩字段
| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-V5-133 |
| **执行波次** | 3（区间 C） |
| **对应 FR / AC** | FR-ALLN-020 / 022 · AC-ALLN-003 / 007 · **NG-ALLN-001** |
| **ADR / 风险** | ADR-V5-002 §2 · R-ALLN-006 |
| **并行度** | W3 首位（`135` / `136` 依赖） |

**输入**: `ADR-V5-002 §2 表`（`stream-model.ts:186` `askKind?: 'choice'|'confirm'|'text'|'secret'|'form'`（**enum 扩值，非新 kind**）；`payload` 增 `secretLabel?` / `formOptions?: readonly {id,label,scope}[]` / `maskedLength?`）。

**动作**:
1. `askKind` **扩值** 2 项（**不加 kind**；`CARD_TYPES` 零扩展）。
2. `payload` 增 3 个**可选**字段（缺省 ⇒ 渲染零变化 ⇒ 回滚友好）。
3. `ASK_CANCEL_REASONS` 4 项闭集**逐字不动**；`MAX_OPEN_ASKS = 2` 不动。
4. 反证：新增第 6 个 `askKind` 值 or 新 kind ⇒ `C-1` 门禁 FAIL。

**产出**: `stream-model.ts`（扩值 + 扩字段）。

**验收标准（可机核）**:
- [ ] `askKind` 取值集 == `{'choice','confirm','text','secret','form'}`（**恰 5 值**）
- [ ] `CARD_TYPES` **零新增**（12 kind 不变）
- [ ] `payload` 3 新字段均可选（缺省类型兼容）
- [ ] `ASK_CANCEL_REASONS.length === 4` ∧ `MAX_OPEN_ASKS === 2` 逐字不变

**红线检查点**: 冻界面 `F1`（`CARD_TYPES` 零扩展）；阈值面 `T-d`；契约面 `C-1`（不加 kind）；台账面 `L-a`（只读）。

**验证命令**:
```bash
npm run typecheck --workspace @lgdl/web-cli-plugin
npm run test:stream --workspace @lgdl/web-cli-plugin 2>&1 | tee /tmp/opencode/v5-gate-logs/w3-askkind-expand.log
```

---

### TASK-V5-135（V52-13）: `cards/askuser.ts` —— `secret` 扩形渲染 + 掩码固化文案
| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-V5-134 |
| **执行波次** | 3（区间 C） |
| **对应 FR / AC** | FR-ALLN-020 / 022 · AC-ALLN-003 |
| **ADR / 风险** | ADR-V5-002 §2 · R-ALLN-008 |
| **并行度** | 与 `136` 并行（文件不相交） |

**输入**: `ADR-V5-002 §2`（`secret` → `<input type="password" data-secret="true" aria-label=…>` **+2 按钮**；固化文案 = 「已写入（掩码 · 零明文）+ 掩码长度 N + 时间戳」；**不出现值 / 值前缀**）；`MAX_CLICKABLES_PER_CARD = 6`（`secret` = 1 input + 2 btn = **3**）。

**动作**:
1. `cards/askuser.ts` 增 `secret` 分支：`<input type="password" data-secret="true">` + 2 按钮（提交 / 取消）；**`choice` / `text` / `confirm` 逐行不动**。
2. 固化文案：仅「事实 + 时间戳 + **掩码长度**」（`maskedLength` 只以**长度类别**落固化区，缩窄侧信道）。
3. 卡内控件数 == 3（≤6）断言。
4. 反证：固化文案出现值 / 值前缀 ⇒ `law8` 门禁（v5-3 `154`）FAIL。

**产出**: `cards/askuser.ts`（`secret` 分支 + 固化文案）。

**验收标准（可机核）**:
- [ ] `input[type="password"][data-secret="true"]` 存在 ∧ `aria-label` 非空
- [ ] 卡内可点控件数 == **3**（≤ `MAX_CLICKABLES_PER_CARD = 6`）
- [ ] 固化文案**不含**值 / 值前缀（只含 `opId` / `ts` / `maskedLength` / `result`）
- [ ] `choice` / `text` / `confirm` 三个既有分支**逐行不变**（字面比对）

**红线检查点**: 冻界面 `F1`（12 kind 零扩展）/ `F2`；阈值面 `T-d`（`MAX_CLICKABLES_PER_CARD` / 卡内控件）；契约面 `C-1`；台账面 `L-a`（只读）。

**验证命令**:
```bash
npm run typecheck --workspace @lgdl/web-cli-plugin
npm run test:ask-auth --workspace @lgdl/web-cli-plugin 2>&1 | tee /tmp/opencode/v5-gate-logs/w3-askuser-secret.log
```

---

### TASK-V5-136（V52-14）: `sidepanel.ts#submitSecret` —— **值直达 key-store**（恰 1 调用点）
| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-V5-135 |
| **执行波次** | 3（区间 C） |
| **对应 FR / AC** | FR-ALLN-021 / 022 · AC-ALLN-003 · **N24** |
| **ADR / 风险** | ADR-V5-002 §2 / ADR-V5-010 §1 · R-ALLN-008 |
| **并行度** | 与 `135` 尾段并行 |

**输入**: `ADR-V5-002 §2 提交行`（`submitSecret(requestId, value)`：**值直达 `keyStore.save()`**，随后 `dispatch({type:'ask-resolved', requestId, answer: undefined})` 只落**事实**；空值 / 取消 ⇒ 卡内校验、**零副作用**（走 `ASK_CANCEL_REASONS`））；`ADR-V5-010 §1`（**key 直写断言**：携带值的写存储调用点**恰 1 处**；值与 `dispatch(` **不共现**）。

**动作**:
1. 新增 `submitSecret(requestId, value)`：`keyStore.save()` 为**唯一值投递点**；`dispatch` 只传 `requestId` + `answer: undefined`（**值不入流**）。
2. 静态判据：`src/**` 中**携带值的写存储调用点恰 1 处**；SENTINEL 流通路径**不经** `reduce` / `payload` / `digest` / `dispatch`。
3. 空值 / 取消 ⇒ 卡内校验 + 零副作用（不产回执、不改状态）。
4. 反证：在流内中转值（把 value 传给 `dispatch` / `payload`）⇒ FAIL。

**产出**: `sidepanel.ts`（`submitSecret`）+ key 直写单点断言 + 反证留证。

**验收标准（可机核）**:
- [ ] 携带值的写存储调用点 == **1**（源文本抽取）
- [ ] `submitSecret` 中 `dispatch(` 调用**不含 value**（值与 `dispatch(` 不共现）
- [ ] 空值 / 取消 ⇒ 零副作用（回执数不变 ∧ 状态不变）
- [ ] 反证：值传入 `dispatch` / `payload` ⇒ FAIL

**红线检查点**: 冻界面 `F1` / `F2` / `F3`；阈值面 `T-d`；契约面 `C-1` / `C-7`；台账面 `L-a`（只读）。

**验证命令**:
```bash
npm run typecheck --workspace @lgdl/web-cli-plugin
node -e "const s=require('fs').readFileSync('packages/web-cli-plugin/src/ui/sidepanel/sidepanel.ts','utf8');const m=s.match(/keyStore\.save\(/g)||[];if(m.length!==1)throw new Error('key-store direct-write callsites: '+m.length);console.log('submitSecret: sole value sink ok')"
```

---

### TASK-V5-137（V52-15）: `op.llm-config` 执行体 + **凭据表快照回滚**
| 属性 | 值 |
|------|-----|
| **复杂度** | L |
| **前置依赖** | TASK-V5-134 / `135` / `136` |
| **执行波次** | 3（区间 C 末位） |
| **对应 FR / AC** | FR-ALLN-042 / 021 · AC-ALLN-003 / 007 / 008 |
| **ADR / 风险** | ADR-V5-002 / 005 / 010 · R-ALLN-904 |
| **并行度** | W3 末位（W4 前置） |

**输入**: 父 `spec §5.5 FR-ALLN-042`（风险级中·写凭据；params = 厂商 choice + 模型 + **Key `secret`**；**consent 必需**（auth 卡「写入本机凭据 · 零明文入流」）；execute = 测试连接 → **掩码写入存储**；receipt = 工具卡 + 系统行「✓ 已配置 LLM（掩码 · 零明文）」；**失败快照回滚**（旧配置不变））。

**动作**:
1. `op.llm-config`：`params` = `[choice(厂商), text(模型), secret(Key)]` 三参数采集（走 `runOp` 四态，无旁路）；`consent` 必需。
2. execute = 测试连接 → 掩码写存储（值经 `submitSecret` 单点）；失败 ⇒ **凭据表快照回滚**（旧配置逐字段不变）。
3. receipt = 工具卡 + 系统行（掩码 · 零明文）；固化只落事实 + `maskedLength`。
4. 反证：① 测试连接失败未回滚 ⇒ FAIL；② 回执出现值 ⇒ `law8`（v5-3）FAIL。

**产出**: `ops.ts`（`op.llm-config`）+ 凭据表快照回滚断言。

**验收标准（可机核）**:
- [ ] 三参数采集流转正确（choice → text → secret 顺序可判）
- [ ] 测试连接失败 ⇒ **旧配置逐字段不变**（快照回滚断言）
- [ ] receipt 两件套（工具卡 + 系统行）可达 ∧ 文案「✓ 已配置 LLM（掩码 · 零明文）」
- [ ] 掩码卡满足 `FR-ALLN-020~023`（入口侧判据）
- [ ] `op.execute(` 调用点仍 **恰 1**

**红线检查点**: 冻界面 `F1` / `F2` / `F3`；阈值面 `T-d`（`MAX_OPEN_ASKS` 队列：三参数不超上限 ⇒ 或入 `pendingOps` 不静默丢弃）；契约面 `C-1` / `C-7`；台账面 `L-a`（登记 `llm-config` 收编条目，`145` 对账）。

**验证命令**:
```bash
npm run typecheck --workspace @lgdl/web-cli-plugin
npm run test:ask-auth --workspace @lgdl/web-cli-plugin 2>&1 | tee /tmp/opencode/v5-gate-logs/w3-op-llm-config.log
```

---

### TASK-V5-138（V52-16）: `cards/askuser.ts` —— `form` 扩形（选项源 = `OPTIONAL_CAPABILITIES`）
| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-V5-137 |
| **执行波次** | 4（区间 D） |
| **对应 FR / AC** | FR-ALLN-043 · AC-ALLN-007 |
| **ADR / 风险** | ADR-V5-002 §2 / ADR-V5-004 §3 · R-ALLN-016 |
| **并行度** | W4 首位（`139` 依赖） |

**输入**: `ADR-V5-002 §2`（`form` → 多选 checkbox 组，选项来自 `OPTIONAL_CAPABILITIES`；`form` = ≤4 checkbox + 2 btn = **6**，**恰好达上限** ⇒ 注册表侧断言「form 选项 ≤4」）；`ADR-V5-004 §3`（选项**逐项来自** `OPTIONAL_CAPABILITIES`（`capability-permissions.ts:67`，4 类能力 / 5 条权限），与 `settings/ops.ts#loadCapabilities` **同源**）。

**动作**:
1. `cards/askuser.ts` 增 `form` 分支：按 `payload.formOptions` 渲染多选 checkbox 组 + 2 按钮。
2. 选项源单一化：`formOptions = OPTIONAL_CAPABILITIES.map(id => ({id, label: OPTIONAL_CAPABILITY_LABEL[id], scope}))` —— 与设置面**同源**。
3. 断言：`form` 选项数 **≤4** ∧ 卡内控件 ≤6。
4. 反证：注入一个不在册的权限项 ⇒ FAIL。

**产出**: `cards/askuser.ts`（`form` 分支）+ 同源断言 + 反证留证。

**验收标准（可机核）**:
- [ ] `form` 分支逗号分隔 n/a；checkbox 组选项逐项 ∈ `OPTIONAL_CAPABILITIES`（**集合相等**）
- [ ] 选项数 ≤4 ∧ 卡内控件数 ≤6（`MAX_CLICKABLES_PER_CARD`）
- [ ] 与 `settings/ops.ts#loadCapabilities` **同源**（同一常量引用，无第二份名单）
- [ ] 反证：注入不在册项 ⇒ FAIL

**红线检查点**: 冻界面 `F1` / `F3`（`manifest` 零 diff）；阈值面 `T-d`（`MAX_CLICKABLES_PER_CARD`）；契约面 `C-1`；台账面 `L-a`（只读）。

**验证命令**:
```bash
npm run typecheck --workspace @lgdl/web-cli-plugin
npm run test:ask-auth --workspace @lgdl/web-cli-plugin 2>&1 | tee /tmp/opencode/v5-gate-logs/w4-askuser-form.log
```

---

### TASK-V5-139（V52-17）: `op.perm.request`（**机制预留**）+ 手势路径 + **批准 / 拒绝双固化**
| 属性 | 值 |
|------|-----|
| **复杂度** | L |
| **前置依赖** | TASK-V5-138 |
| **执行波次** | 4（区间 D） |
| **对应 FR / AC** | FR-ALLN-043 / 066 / 110 · AC-ALLN-007 / 010 |
| **ADR / 风险** | ADR-V5-003 §3 / 004 · **R-ALLN-014**（弹窗不可合成）· R-ALLN-003 |
| **并行度** | W4 串行 |

**输入**: `ADR-V5-004 §1`（**首批 0 项新增** ⇒ `manifest.json` 零 diff；`op.perm.request` 走**已有** `optional_permissions`（5 条）+ `optional_host_permissions`（2 条）；**机制预留**必须显式登记，防 X1 被误判为未落地）；`ADR-V5-003 §3`（握手：手势在 page）；`EC-ALLN-007`（弹窗 headless 不可合成 ⇒ 人工面）。

**动作**:
1. `op.perm.request`：`params` = 权限项（`form` 多选，逐项来自 `OPTIONAL_CAPABILITIES`）；`consent` 必需（consent 卡 + 浏览器原生弹窗）；`layer = 'sw'`；`fail` 走两段握手 + 快照回滚。
2. execute = 运行时申请（**手势在 page**；SW 做裁决 / 快照 / 审计）。
3. **批准 / 拒绝两路径均固化**（系统行 + 工具卡）；如实说明「**回收须用户在浏览器确认**」（**不做静默回收的虚假承诺**）。
4. **机制预留登记**：本批 0 项新增 ⇒ 在 `state.json` / 收口面显式登记「X1 落地形态 = 判据升级为『显式名单 + 新增项在册』」。
5. 弹窗体感入**人工面**（`⏳ 未执行`，不得冒充 PASS）。

**产出**: `ops.ts`（`op.perm.request`）+ 双固化断言 + 机制预留登记 + 人工面条目。

**验收标准（可机核）**:
- [ ] `params.formOptions` 逐项 ∈ `OPTIONAL_CAPABILITIES`；`layer === 'sw'`
- [ ] 批准路径固化 ∧ 拒绝路径固化（**两路径**断言）
- [ ] 未出现「已静默回收」类文案 / 断言
- [ ] `manifest.json` **零 diff**（`git diff --quiet -- packages/web-cli-plugin/manifest.json`）
- [ ] 人工面条目：浏览器原生权限弹窗体感 = `⏳ 未执行`

**红线检查点**: 冻界面 `F3`（`manifest.json` 零 diff / 静态 5 / host 6 / `minimum_chrome_version 116`）；阈值面 `T-d`；契约面 `C-7`（特权 op 恰 2）；台账面 `L-a`（登记 X1 机制预留言口径）。

**验证命令**:
```bash
npm run typecheck --workspace @lgdl/web-cli-plugin
git diff --quiet -- packages/web-cli-plugin/manifest.json && echo 'manifest: zero-diff ok'
npm test --workspace @lgdl/web-cli-plugin -- sw-op-mirror 2>&1 | tee /tmp/opencode/v5-gate-logs/w4-op-perm-request.log
```

---

### TASK-V5-140（V52-18）: **X1 权限面门禁等价重锚**（4 门禁）+ `manifest.json` 零 diff 登记
| 属性 | 值 |
|------|-----|
| **复杂度** | L |
| **前置依赖** | TASK-V5-139 |
| **执行波次** | 4（区间 D 末位） |
| **对应 FR / AC** | FR-ALLN-110 / 111（X1）/ 066 / 120 · **AC-ALLN-010 / 012 / 022** |
| **ADR / 风险** | ADR-V5-004 · **R-ALLN-003 / 016** · R-ALLN-013 |
| **并行度** | W4 末位 |

**输入**: `spec §12 X1` 等价重写形态 ①~⑤；现状 `test/capability-wiring.test.ts:26-29`（静态 5 逐字）/ `:35-38`（可选 5 逐字）/ `:50`（host 6）/ `:51-58`（SW 禁 `.request(`）；`test/binding-wiring.test.ts:50-58` / `test/auto-session-wiring.test.ts:81-94` / `test/ui/binding.mjs`（192）。

**动作**（**逐点判定，禁按名批量替换**）:
1. `capability-wiring.test.ts`：① 静态集合仍**逐字**断言（5 项，**不因新增可选而放开**）；② 可选集合改**显式名单 + 新增项逐项在册**（**不是** `length ≥5` 这类放宽）；③ `host_permissions` 6 条 + 无 `<all_urls>` / 无静态 `content_scripts` **不变**；④ 「SW 永不 `.request(`」**语义等价保留**；⑤ 「新增项在册」分支（本轮**空集通过** —— 更强判据，不是放宽）。
2. `binding-wiring.test.ts` / `auto-session-wiring.test.ts` / `test/ui/binding.mjs`：**判据句式等价改写**（计数**不减**）。
3. 每处改写登记 `modifiedRanges[]`（`{file, lines, oldId, decision, reason ≥40, leaf:'v5-2'}`）。
4. 反证 ≥2 条：注入一个不在册的可选项 ⇒ FAIL；放宽为 `length ≥5` ⇒ FAIL。

**产出**: 4 门禁等价重锚 + `modifiedRanges[]` 条目 + 反证留证 + 最小必要集论证（文书）。

**验收标准（可机核）**:
- [ ] 静态集合**逐字** 5 项 ∧ `host_permissions` 6 条 ∧ `minimum_chrome_version === 116`
- [ ] 可选集合 = **显式名单**（`assert.deepEqual` 保留）+ 「新增项在册」分支存在
- [ ] 「SW 内 `.request(` 零命中」**保留**（语义等价）
- [ ] 四门禁计数 **≥ 基线**（`test:binding ≥192`）
- [ ] 反证两条实跑 ⇒ FAIL → 逐字节还原 ⇒ PASS
- [ ] `manifest.json` 零 diff（`git diff --quiet`）

**红线检查点**: 冻界面 `F2`（`content.js`）/ `F3`（**`manifest.json` 零 diff**）/ `F4`；阈值面 `T-d`；契约面 `C-7`；台账面 `L-a`（`modifiedRanges[]` 登记 X1）。

**验证命令**:
```bash
npm test --workspace @lgdl/web-cli-plugin -- capability-wiring 2>&1 | tee /tmp/opencode/v5-gate-logs/w4-capability-wiring.log
npm run test:binding --workspace @lgdl/web-cli-plugin 2>&1 | tee /tmp/opencode/v5-gate-logs/w4-binding-x1.log   # 串行：一次一个 Chromium
git diff --quiet -- packages/web-cli-plugin/manifest.json && echo 'manifest: zero-diff ok'
```

---

### TASK-V5-141（V52-19）: `op.revoke` 执行体 + 高风险确认卡 + 审计入口
| 属性 | 值 |
|------|-----|
| **复杂度** | L |
| **前置依赖** | TASK-V5-140 |
| **执行波次** | 5（区间 E） |
| **对应 FR / AC** | FR-ALLN-044 · AC-ALLN-007 / 011 |
| **ADR / 风险** | ADR-V5-005 · R-ALLN-012 |
| **并行度** | 与 `144`（只读探针）并行 |

**输入**: `FR-ALLN-044`（风险级**高·不可逆**；params = 目标 choice（站点授权 / 浏览器权限 / LLM 凭据）；**consent 必需**（确认卡 + 不可逆说明）；execute = 撤销并同步登记（**浏览器权限需用户在浏览器确认**）；receipt = 系统行「✓ 已撤销…」+ **审计入口**；**三表快照回滚**）。

**动作**:
1. `op.revoke`：`params` = `choice(['site-auth','permission','credential'])`；`consent` = **必需**（含**不可逆说明**文案）。
2. execute = 撤销 + 同步登记（浏览器权限路径复用 `op.perm.request` 的手势 / 审计 owner）。
3. receipt = 系统行 + **审计入口**（指向既有审计视图）。
4. 快照在 `runOp` ④ 触发（`142` 落三表）。

**产出**: `ops.ts`（`op.revoke`）+ 确认卡不可逆说明 + 审计入口。

**验收标准（可机核）**:
- [ ] `op.revoke.risk === 'high'` ∧ `params` = 3 目标 choice ∧ `consent` 必需
- [ ] 确认卡含**不可逆说明**文案（非空断言）
- [ ] receipt 带**审计入口**（可定位到既有审计视图）
- [ ] 撤销后同步登记（授权 / 权限 / 凭据任一目标可判）

**红线检查点**: 冻界面 `F1` / `F3`；阈值面 `T-d`（`MAX_CHIPS_PER_CARD` / 确认卡控件数）；契约面 `C-7`；台账面 `L-a`（登记 `revoke` 收编条目）。

**验证命令**:
```bash
npm run typecheck --workspace @lgdl/web-cli-plugin
npm test --workspace @lgdl/web-cli-plugin -- op-wiring 2>&1 | tee /tmp/opencode/v5-gate-logs/w5-op-revoke.log
```

---

### TASK-V5-142（V52-20）: **三表整体回滚**（授权 / 浏览器权限 / LLM 凭据；R-ALLN-904）
| 属性 | 值 |
|------|-----|
| **复杂度** | L |
| **前置依赖** | TASK-V5-141 |
| **执行波次** | 5（区间 E） |
| **对应 FR / AC** | FR-ALLN-034 ③ / 044 · EC-ALLN-011 · AC-ALLN-004 |
| **ADR / 风险** | ADR-V5-002 / 005 · **R-ALLN-904**（单表回滚留半完成态） |
| **并行度** | W5 串行 |

**输入**: `ADR-V5-002 §1 ④`（`isMutating` ⇒ 对**三表**做 `snapshot`；失败 ⇒ **整体** `rollback`）；`EC-ALLN-011`。

**动作**:
1. 实现 `op.revoke` 的三表快照（授权表 / 权限表 / 凭据表）**整体**采集与**整体**回滚（**禁止逐表独立回滚**）。
2. 失败注入 ⇒ 三表**逐字段**回到执行前（含跨表引用一致性）。
3. 反证：只回滚其中一表 ⇒ 断言 FAIL（跨表半完成态可检出）。

**产出**: `ops.ts` / `pipeline.ts`（三表快照体）+ 整体回滚断言 + 反证留证。

**验收标准（可机核）**:
- [ ] 注入执行期失败 ⇒ 三表**逐字段**等于执行前快照（3 组读数）
- [ ] 跨表引用一致性保持（无悬空引用）
- [ ] 反证：单表回滚 ⇒ FAIL（`expectFailPattern` 记载）→ 逐字节还原 ⇒ PASS
- [ ] `snapshot` 结构含 ≥3 表登记（与 v5-1 `109` 的语义位对齐）

**红线检查点**: 冻界面 `F1` / `F3`；阈值面 `T-d`；契约面 `C-7`；台账面 `L-a`（只读）。

**验证命令**:
```bash
npm run typecheck --workspace @lgdl/web-cli-plugin
npm test --workspace @lgdl/web-cli-plugin -- pipeline 2>&1 | tee /tmp/opencode/v5-gate-logs/w5-three-table-rollback.log
```

---

### TASK-V5-143（V52-21）: **拒绝非死端**（consent 拒绝 / 权限被拒 / ask 取消）
| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-V5-142 |
| **执行波次** | 5（区间 E） |
| **对应 FR / AC** | FR-ALLN-014 · AC-ALLN-002 / 007 · EC-ALLN-005 / 006 |
| **ADR / 风险** | ADR-V5-002 · R-ALLN-006 |
| **并行度** | W5 末位 |

**输入**: `FR-ALLN-014`（consent（auth 卡）被拒绝 / 浏览器权限被拒 / ask 取消，均须**固化**该事实（留痕）并给出**可达的后续 next**（**不重试同一授权、不改既有授权**）；`ASK_CANCEL_REASONS` 4 项闭集语义不变）。

**动作**:
1. 三条拒绝路径统一：`settle('rejected')` / `settle('cancelled')` ⇒ **固化**（系统行 + 事实卡）+ **可达 next**（恢复 chip 或紧随 nextstep）。
2. **不重试同一授权**、**不改既有授权**（断言：拒绝后授权表零变化）。
3. `ASK_CANCEL_REASONS` 4 项**语义不变**。
4. 反证：拒绝后无 next ⇒ FAIL（供 v5-3 `161` 双向注入复用）。

**产出**: `pipeline.ts` / `ops.ts`（拒绝路径）+ 固化 + 可达 next 断言。

**验收标准（可机核）**:
- [ ] 三条拒绝路径各自：固化事实 ∧ 可达 next（3×2 断言）
- [ ] 拒绝后授权表**零变化**（不重试 / 不改既有授权）
- [ ] `ASK_CANCEL_REASONS` 4 项逐字不变
- [ ] 反证：拒绝后无 next ⇒ FAIL

**红线检查点**: 冻界面 `F1` / `F3`；阈值面 `T-d`（`ASK_CANCEL_REASONS`）；契约面 `C-1`（固化走既有 kind）/ `C-4` / `C-7`；台账面 `L-a`（只读）。

**验证命令**:
```bash
npm run typecheck --workspace @lgdl/web-cli-plugin
npm run test:ask-auth --workspace @lgdl/web-cli-plugin 2>&1 | tee /tmp/opencode/v5-gate-logs/w5-reject-not-deadend.log
```

---

### TASK-V5-144（V52-22）: **spikeGate-2** —— binding 保护段字节中立避让探针
| 属性 | 值 |
|------|-----|
| **复杂度** | S |
| **前置依赖** | 无（只读探针） |
| **执行波次** | 5（与 `141`/`142` 并行） |
| **对应 FR / AC** | FR-ALLN-122 · AC-ALLN-018 · EC-ALLN-013 |
| **ADR / 风险** | ADR-V5-012 §3 · **R-ALLN-010** |
| **并行度** | 与 `141` / `142` / `143` 并行（只读探针，不落版本库） |
| **闸门语义** | **spikeGate**：结论决定 `TASK-V5-152` 走「保段」或「停下上报」 |

**输入**: `ADR-V5-012 §3`（binding 段 `107780..115930` / `be9ad0e9…` **逐字节零改动**；避让手法 = 4 类收编**不改** `#authorize` / `#rebind` 的 DOM 与 id、不改段内监听器行；改动落**函数体**（`authorizeCurrentSite` / `rebindCurrentTab`，均在段**外**）与新增 `dispatchOp`）；`test/ui/binding.mjs:896`（段前 `#notice` 读取点）/ `:880`（`panelNotice` = 事件语义，零触碰）/ `:2256`（段后 `AP#4b`）。

**动作**（`/tmp/opencode/v5-spike/` 内，只读仓库 + 临时副本）:
1. 复算段内 sha256 == `be9ad0e9…` ∧ `startByte === 107780`。
2. 计算段前（偏移 < 107780）**可用「等长删白 / 补白」预算**（注释与空行字节数）。
3. 模拟「新增 `dispatchOp` 接线 + 段外函数体改写」后的**段前偏移漂移量**，验证 `byteOffsetOf(startAnchor) === 107780` **可逐字节成立**（或给出不可行证据）。
4. 记录失败判据（可删白区耗尽 / 段内监听器行被迫改动 / 函数体无法保持段外）。

**产出**: 探针报告（`keep-feasible` 或 `report-to-orchestrator` + 量化预算与证据）；结论写入 `state.json#v5-2.spikes[]`。

**验收标准（可机核）**:
- [ ] 报告含量化预算：`availablePreSegmentBytes ≥ |ΔbyteLength|`
- [ ] 模拟后 `byteOffsetOf(startAnchor) === 107780` 成立（或明确不可行证据）
- [ ] 段内监听器行**未被迫改动**（逐字节可比）
- [ ] 结论二值之一且带证据；`git status --short` 零输出

**红线检查点**: 冻界面 `F1`（binding 段属测试契约保护面）；阈值面 `T-c`；契约面 `C-5`；台账面 `L-a`（**禁止改 pin** —— 只能产出结论）。

**验证命令**:
```bash
mkdir -p /tmp/opencode/v5-spike && node /tmp/opencode/v5-spike/binding-byteline-probe.mjs | tee /tmp/opencode/v5-gate-logs/w5-spike-binding.log
git status --short   # 必须为空（探针不入版本库）
```

---

### TASK-V5-145（V52-23）: `settings/ops.ts` —— 4 类委派为 op **单一执行体**
| 属性 | 值 |
|------|-----|
| **复杂度** | L |
| **前置依赖** | TASK-V5-143 |
| **执行波次** | 6（区间 F） |
| **对应 FR / AC** | FR-ALLN-075 / 076 / 077 · AC-ALLN-011 · **EC-ALLN-016** |
| **ADR / 风险** | ADR-V5-005 · **R-ALLN-012**（双入口漂移）· R-V5-108 / 109 |
| **并行度** | W6 首位（`146` / `147` 依赖） |

**输入**: `ADR-V5-005 §1`（4 类（`authorize` / `revoke` / `rebind` / `llm-config`）的 `execute` 体**只存在于** `OPS_BY_ID`；`settings/ops.ts` 对应实现**改为委派**（签名保留 ⇒ `FR-ALLN-077`）；`settings/ops.ts` 内不再出现原生实现语句（`deps.store.save` / `removeCapabilityPermission` / `auto-auth` 消息））；§4（其余 **13** 个操作**签名与行为零变化**；`SETTINGS_SECTION_IDS` 8 分区不动）。

**动作**:
1. `settings/ops.ts` 4 类方法改为**薄包装委派**：`revokeCapability(cap) → dispatchOp('op.revoke', {target:'permission', cap, surface:'settings'})`；`clearAutoAuth(origin) → dispatchOp('op.revoke', {target:'auto-auth', origin, surface:'settings'})`；`llm-config` 三方法同构委派 `op.llm-config`；`authorize` / `rebind` 委派对应 op。
2. **签名保留**（`FR-ALLN-077`）；其余 13 个操作**零改动**（逐字节比对）。
3. `options.html` 路径：`runOp(opId, {surface:'options'})` **跳过流内卡**（以设置页自身显式确认作 **consent 等价物**）⇒ **显式登记「同执行体、不同 consent 载体」**（`R-V5-108`）。
4. `OpResult` 文本同源构造（同 opId / 同 `maskedLength` 口径）⇒ 两入口**格式同构**（`R-V5-109`）。
5. 反证：设置面另起一条执行路径 ⇒ FAIL。

**产出**: `settings/ops.ts`（4 类委派）+ consent 载体登记 + 回执同源断言。

**验收标准（可机核）**:
- [ ] 4 类的 `execute` 体在 `src` 中**恰一处**（皆在 `ops.ts`）
- [ ] `settings/ops.ts` 内**零**原生实现语句（`deps.store.save` / `removeCapabilityPermission` / `auto-auth` 消息）
- [ ] 其余 **13** 个操作**逐字节零改动** ∧ `SETTINGS_SECTION_IDS.length === 8`
- [ ] 两入口回执**同源构造**（同 `opId` / 同 `maskedLength` 口径）
- [ ] `knownGaps` 邻域含「同执行体、不同 consent 载体」声明

**红线检查点**: 冻界面 `F3` / `F5`；阈值面 `T-d`；契约面 `C-7`（单一执行入口）；台账面 `L-a`（登记 `settings` 收编条目 + consent 载体差异）。

**验证命令**:
```bash
npm run typecheck --workspace @lgdl/web-cli-plugin
node -e "const s=require('fs').readFileSync('packages/web-cli-plugin/src/ui/settings/ops.ts','utf8');for(const bad of ['deps.store.save','removeCapabilityPermission']){if(s.includes(bad))throw new Error('native impl residual: '+bad)}console.log('settings/ops: delegated ok')"
npm test --workspace @lgdl/web-cli-plugin -- settings 2>&1 | tee /tmp/opencode/v5-gate-logs/w6-settings-ops.log
```

---

### TASK-V5-146（V52-24）: `settings/panel.ts` —— 4 类按钮 → `dispatchOp` + `form` 选项源
| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-V5-145 |
| **执行波次** | 6（区间 F） |
| **对应 FR / AC** | FR-ALLN-075 / 078 · AC-ALLN-011 |
| **ADR / 风险** | ADR-V5-005 §2 / §3 · R-ALLN-012 |
| **并行度** | 与 `148` 并行 |

**输入**: `ADR-V5-005 §2`（面板设置视图按钮：`#authorize` / `#rebind` / 设置-能力撤销 / 设置-LLM 表单 → 全部调 `dispatchOp(opId)`；chat chip → `dispatchChipAction` → `runOp` → **同一 `execute`**）；§3（`form` 选项源 = `OPTIONAL_CAPABILITIES`）。

**动作**:
1. `settings/panel.ts` 4 类触发点改为 `dispatchOp(opId)`（**不再本地执行**）。
2. `form` 选项源 = `OPTIONAL_CAPABILITIES`（与 `138` 同源）。
3. **binding 保护段字节中立避让**：`#authorize` / `#rebind` 的 **DOM 与 id 不改**、段内监听器行不改；改动落函数体（段外）⇒ 段内 `() => authorizeCurrentSite()` 等行**逐字节不变**。
4. 反证：把按钮改为本地路径 ⇒ `147` FAIL。

**产出**: `settings/panel.ts`（4 类接线）+ 段内零改证据。

**验收标准（可机核）**:
- [ ] 4 类按钮调用 `dispatchOp`（**无本地执行路径**）
- [ ] `form` 选项源 == `OPTIONAL_CAPABILITIES`（集合相等）
- [ ] `#authorize` / `#rebind` DOM 与 id **零改** ∧ binding 段内行逐字节不变
- [ ] 两入口触发同一 `execute`（同 opId 可判）

**红线检查点**: 冻界面 `F3` / `F5`；阈值面 `T-d`；契约面 `C-7`；台账面 `L-a`（只读；段外登记在 `152`）。

**验证命令**:
```bash
npm run typecheck --workspace @lgdl/web-cli-plugin
node -e "const fs=require('fs');const t=fs.readFileSync('packages/web-cli-plugin/test/ui/binding.mjs');const h=require('crypto').createHash('sha256').update(t.slice(107780,115930)).digest('hex');if(!h.startsWith('be9ad0e9'))throw new Error('binding pin moved');console.log('binding seg: intact')"
npm run test:l2 --workspace @lgdl/web-cli-plugin 2>&1 | tee /tmp/opencode/v5-gate-logs/w6-settings-panel.log
```

---

### TASK-V5-147（V52-25）: `test/op-wiring.test.ts` —— 逐 op 单一调用点 + 零 `requestTurn` + ≥3 反证
| 属性 | 值 |
|------|-----|
| **复杂度** | L |
| **前置依赖** | TASK-V5-145 / `146` |
| **执行波次** | 6（区间 F） |
| **对应 FR / AC** | FR-ALLN-078 / 059 / 076 · **AC-ALLN-011 / 009** |
| **ADR / 风险** | ADR-V5-005 §2 · R-ALLN-012 · **R-ALLN-905** |
| **并行度** | W6 串行 |

**输入**: `ADR-V5-005 §2`（逐 op 一条布线门禁：① 能力 / 动作请求**唯一调用点** ② 单一入口调用点集合**显式登记** ③ **无 `requestTurn`**（除 `op.turn`）④ ≥3 条伪造反证可 FAIL）；`ADR-V5-001`（本地 op 语义：零回合 / 不受 `pending` 门控 / 复用单一生产入口）。

**动作**:
1. 新建 `test/op-wiring.test.ts`：**逐 op** 断言唯一调用点 + 调用点集合显式登记（`{opId, callsites[]}`）+ 零 `requestTurn`（比对 `128` 的 `REQUESTTURN_CALLSITE_SET`）+ 与 op 清单**同源**（清单改一处 ⇒ 门禁同步红 / 绿）。
2. ≥3 条**伪造反证**（仿 `authorize-chip-wiring`）：① 复制一条调用点；② 让本地 op 误接 `requestTurn`；③ 让本地 op 受 `pending` 门控；逐条 FAIL ⇒ 还原 PASS。
3. `test/gate-integrity.test.ts`：追加本门禁（只追加）。

**产出**: `test/op-wiring.test.ts` + 调用点登记表 + 反证留证。

**验收标准（可机核）**:
- [ ] 9 个 op 各有「唯一调用点」断言 ∧ 调用点集合显式登记
- [ ] 除 `op.turn` 外**零 `requestTurn`**（集合比对）
- [ ] 本地 op 在 `pending` 门控下仍可执行（deny 集断言）
- [ ] ≥3 条反证逐条实跑 ⇒ FAIL → 逐字节还原 ⇒ PASS
- [ ] 与 op 清单**同源**（清单改动 ⇒ 门禁同步变红 / 绿）

**红线检查点**: 冻界面 `F1` / `F3`；阈值面 `T-d` / `T-e`；契约面 `C-7`；台账面 `L-a`（只读）。

**验证命令**:
```bash
npm test --workspace @lgdl/web-cli-plugin -- op-wiring 2>&1 | tee /tmp/opencode/v5-gate-logs/w6-op-wiring.log
npm run test:gate-integrity --workspace @lgdl/web-cli-plugin 2>&1 | tee /tmp/opencode/v5-gate-logs/w6-gate-integrity.log   # 串行
```

---

### TASK-V5-148（V52-26）: `test/authorize-chip-wiring.test.ts` 特权 op 等价重锚
| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-V5-147 |
| **执行波次** | 6（区间 F 末位） |
| **对应 FR / AC** | FR-ALLN-066 / 012 · AC-ALLN-010 / 012 |
| **ADR / 风险** | ADR-V5-003 §3 / 004 · R-ALLN-003 |
| **并行度** | 与 `146` 并行 |

**输入**: `ADR-V5-003 §3`（`capability-wiring` 判据**等价重锚**为 ① SW 内 `.request(` 仍**零命中**（逐字）② `requestOriginPermissionDetailed` 面板侧**恰 2 调用点**且都在手势回调内 ③ `op-exec` 族 type-only ④ **特权 op 清单恰 2 项**（新断言））。

**动作**:
1. `test/authorize-chip-wiring.test.ts`：旧「单一入口」判据重锚为上述 ①~④（**计数不减**）。
2. 新增断言：**特权 op 清单恰 2 项**（`OP_DESCRIPTORS.filter(layer==='sw').length === 2`）。
3. `modifiedRanges[]` 登记改写区间。
4. 反证：增加第 3 个 `layer:'sw'` op ⇒ FAIL。

**产出**: `test/authorize-chip-wiring.test.ts`（等价重锚）+ `modifiedRanges[]` 条目 + 反证。

**验收标准（可机核）**:
- [ ] ① SW 内 `.request(` 零命中 ② 面板侧 `requestOriginPermissionDetailed` == **2** 且在手势回调内 ③ `op-exec` type-only ④ 特权 op == **2**
- [ ] 计数 **≥ 基线**
- [ ] 反证：第 3 个 SW op ⇒ FAIL（逐字节还原 ⇒ PASS）

**红线检查点**: 冻界面 `F3`（判定链 / `manifest`）；阈值面 `T-d`；契约面 `C-7`；台账面 `L-a`（`modifiedRanges[]` 登记）。

**验证命令**:
```bash
npm run test:authorize-chip-wiring --workspace @lgdl/web-cli-plugin 2>&1 | tee /tmp/opencode/v5-gate-logs/w6-authorize-chip-wiring.log
```

---

### TASK-V5-149（V52-27）: **S2 断流全链样本与驱动 seam**（10 环节）
| 属性 | 值 |
|------|-----|
| **复杂度** | L |
| **前置依赖** | TASK-V5-147 / `148` |
| **执行波次** | 7（区间 G） |
| **对应 FR / AC** | FR-ALLN-016 · **AC-ALLN-001** · EC-ALLN-005 |
| **ADR / 风险** | ADR-V5-009 §3 / §5 · R-ALLN-014 |
| **并行度** | W7 首位（`150` 依赖） |

**输入**: `ADR-V5-009 §5`（S2 全链：绑定 → 探测 → 未授权 → ✖ 阻塞 → 授权 next 产出 → auth 卡 → execute → ✓ 回执 → 探测恢复 → 拾取 next 产出）；`ADR-V5-009 §3`（5 类阻塞 headless 驱动路径表）；`ADR-V5-012 §1`（**门禁文件 `test/ui/no-dead-end.mjs` 由 v5-3 单点落地** ⇒ 本任务只交付**共享样本与 seam**，**不建 Chromium 门禁文件**，守 `FR-ALLN-004` 共享面纪律）。

**动作**:
1. 新建 `test/ui/fixtures/s2-chain.mjs`：**10 环节**场景驱动样本（逐环节可判；优先复用既有 seam：`binding` seam / `ref` seam / `state` 消息载荷 / key-store 清空）。
2. 新建 `test/s2-deadend-chain.test.ts`（**node 级**）：驱动 10 环节状态机，逐环节断言「阻塞态 ⇒ 行内或紧随存在可达 next」；**死端 = 0**（状态层）。
3. seam 缺口显式登记（若某环节需 v5-1 补 provider 的可注入 `when(ctx)` ⇒ 记 `BLK` 并上报，**不得以人工判据替代**）。
4. **交付物接口约定**：v5-3 `no-dead-end.mjs` 直接 `import` 本 fixtures（**同一份样本，不复制**）。

**产出**: `test/ui/fixtures/s2-chain.mjs` + `test/s2-deadend-chain.test.ts` + seam 缺口登记。

**验收标准（可机核）**:
- [ ] 10 环节逐环节可判（每环节有断言）；`s2-chain.mjs` 导出可被 `import`（无副作用）
- [ ] node 判据：5 类阻塞态**逐类**可达 next ∧ 死端 = 0
- [ ] seam 缺口若存在 ⇒ `BLK` 条目 + 上报（**禁以人工判据替代**）
- [ ] **不新增** `test/ui/no-dead-end.mjs`（该文件归 v5-3 单点落地）

**红线检查点**: 冻界面 `F1` / `F2`；阈值面 `T-d`；契约面 `C-3`（阻塞枚举单源消费）/ `C-7`；台账面 `L-a`（只读）。

**验证命令**:
```bash
npm test --workspace @lgdl/web-cli-plugin -- s2-deadend-chain 2>&1 | tee /tmp/opencode/v5-gate-logs/w7-s2-chain.log
test ! -f packages/web-cli-plugin/test/ui/no-dead-end.mjs && echo 'no-dead-end.mjs: correctly reserved for v5-3'
```

---

### TASK-V5-150（V52-28）: **S2 断流首验收机器化**（死端 = 0）+ 人工面登记
| 属性 | 值 |
|------|-----|
| **复杂度** | L |
| **前置依赖** | TASK-V5-149 |
| **执行波次** | 7（区间 G） |
| **对应 FR / AC** | FR-ALLN-016 · **AC-ALLN-001 / 024** · EC-ALLN-007 |
| **ADR / 风险** | ADR-V5-009 §5 · **R-ALLN-014**（弹窗不可合成） |
| **并行度** | W7 串行 |

**输入**: `AC-ALLN-001`（headless 全链复刻 S2；断言「死端 = 0」；**浏览器原生弹窗体感入人工面**（`⏳` / `PASS`，不得冒充 PASS））；`ADR-V5-012 §5`（门禁严格串行）。

**动作**:
1. 以 `149` 的样本驱动 **node + seam** 层「首验收」：10 环节全链 + **死端 = 0** + ✖ 行不裸奔（`[data-act="next"][data-op]` 存在）。
2. **浏览器原生权限弹窗**环节：如实登记为**人工面** `⏳ 未执行`（`PENDING_TIMEOUT` 不可合成）。
3. 5 环节判据（「真机序列 5 环节逐环节可判」）：绑定 / 未授权 / ✖ 阻塞 / 授权 next 产出 / 拾取 next 产出 —— 逐环节出**可判读数**。
4. 交付 `state.json#v5-2.s2Verification`（逐环节读数 + 死端计数 0→0）。

**产出**: S2 首验收读数表 + 人工面条目 + 死端 = 0 证据。

**验收标准（可机核）**:
- [ ] 10 环节逐环节读数存在；**死端计数 == 0**
- [ ] `[data-act="next"][data-op]` 在阻塞卡行内可定位（✖ 行不裸奔）
- [ ] 人工面：浏览器原生权限弹窗体感 = **`⏳ 未执行`**（非 `PASS`）
- [ ] 全链判据**可 FAIL**（注入「删恢复区」⇒ FAIL ⇒ 还原 PASS）

**红线检查点**: 冻界面 `F1` / `F2` / `F3`；阈值面 `T-d`；契约面 `C-3` / `C-4`；台账面 `L-a`（只读）。

**验证命令**:
```bash
npm test --workspace @lgdl/web-cli-plugin -- s2-deadend-chain 2>&1 | tee /tmp/opencode/v5-gate-logs/w7-s2-first-acceptance.log
```

---

### TASK-V5-151（V52-29）: **X2 门禁等价重锚** + `stream` / `ask-auth` 增断言
| 属性 | 值 |
|------|-----|
| **复杂度** | L |
| **前置依赖** | TASK-V5-150 |
| **执行波次** | 7（区间 G） |
| **对应 FR / AC** | FR-ALLN-067 / 111（X2）/ 115 / 120 · AC-ALLN-010 / 019 |
| **ADR / 风险** | ADR-V5-003 / 012 · R-ALLN-002 · R-ALLN-013 |
| **并行度** | W7 串行 |

**输入**: `spec §12 X2` 等价重写形态 ①~④；`FR-ALLN-115`（`test/ui/stream.mjs`（63）/ `ask-auth-inflow.mjs`（61）等价重锚并**增**断言（`secret` / `form` 扩形 + `error` 行内恢复））。

**动作**:
1. **X2 重锚**：`test/content.test.ts` / `pick-layer-budget.test.ts` / `insight-protocol.test.ts` —— ① `KIND_SET` 逐字零新增 ② `content.js` 逐字节 / 逐 sha ③ 新族走独立校验模块 ④ 「加进 `KIND_SET` 即红」反证存在。
2. `test/ui/stream.mjs`（63）：`secret` / `form` 扩形断言 **增**（**不减**）。
3. `test/ui/ask-auth-inflow.mjs`（61）：扩形登录 + **拒绝非死端**断言 **增**。
4. `modifiedRanges[]` 登记；反证 ≥2 条实跑。

**产出**: 5 门禁重锚 / 增断言 + `modifiedRanges[]` + 反证留证。

**验收标准（可机核）**:
- [ ] `KIND_SET` 逐字零新增；`content.js` 177,076 B / `52a82620…`
- [ ] `test:stream ≥63` ∧ `test:ask-auth ≥61` ∧ `test:insight ≥116` ∧ `test:page-input ≥108`
- [ ] 「加进 `KIND_SET` 即红」反证存在且可 FAIL
- [ ] 无「不再 FAIL 的判据」

**红线检查点**: 冻界面 `F2`（红线）/ `F3`；阈值面 `T-d`；契约面 `C-1` / `C-2`；台账面 `L-a`（`modifiedRanges[]` 登记 X2 / X6 部分）。

**验证命令**:
```bash
npm run test:stream --workspace @lgdl/web-cli-plugin 2>&1 | tee /tmp/opencode/v5-gate-logs/w7-stream-add.log
npm run test:ask-auth --workspace @lgdl/web-cli-plugin 2>&1 | tee /tmp/opencode/v5-gate-logs/w7-ask-auth-add.log   # 串行
npm run test:insight --workspace @lgdl/web-cli-plugin 2>&1 | tee /tmp/opencode/v5-gate-logs/w7-insight.log        # 串行
```

---

### TASK-V5-152（V52-30）: `binding.mjs` 段内零改 / 段外逐行登记 + 体积五要素 + 本叶收尾
| 属性 | 值 |
|------|-----|
| **复杂度** | L |
| **前置依赖** | TASK-V5-151 · `144`（**SG-2 = `keep-feasible`**） |
| **执行波次** | 7（区间 G 末位） |
| **对应 FR / AC** | FR-ALLN-122 / 130 / 133 / 124 · **AC-ALLN-018 / 020 / 022 / 023 / 025** |
| **ADR / 风险** | ADR-V5-012 §3 / ADR-V5-011 · R-ALLN-010 / 013 / 015 · R-V5-110 |
| **并行度** | W7 末位（本叶**收口**，不可并行） |
| **闸门依赖** | **`144` = `report-to-orchestrator` ⇒ 本任务暂停上报** |

**输入**: `ADR-V5-012 §3`（binding 段 `107780..115930` / `be9ad0e9…` **逐字节零改动**；段**外**读授权 / 站点面 / 状态栏的断言**等价改写 + 逐行登记**）；`ADR-V5-011`（本叶逐项 5,200 B + 胶水 350 = **5,550 B**）；父 `tasks.md §6` 门禁守恒。

**动作**:
1. `test/ui/binding.mjs`：**段内逐字节零改**（sha 复核）+ **段外逐行登记**（`modifiedRanges[]`：`{file, lines, oldId, decision:'equivalent-rewrite', reason, leaf:'v5-2'}`）。
2. 体积五要素（**本叶增量**）：`npm run build` + metafile 逐模块归因（`Σ 逐模块 Δ + 未归因 == 登记增量`）+ `test/size-baseline.ts` 五要素 + `_TIMELINE` 只追加。
3. 全门禁**串行**复跑 + 计数只增对账（`npm test ≥1045` / `binding ≥192` / `design-contract ≥13` / `supersession ≥35` / `gate-integrity ≥13`）；`KL-N-10` 隔离复跑 ≥2。
4. 反证留证完整性核对；`state.json`（本叶）→ `phase:'tasked'`；`TREE.md` 更新。
5. `git add` **path-limited**（禁 `git add -A`）。

**产出**: binding 段内零改证据 + 段外登记 + 体积五要素（本叶）+ 全门禁串行日志 + 计数对账表。

**验收标准（可机核）**:
- [ ] binding 保护段 sha `be9ad0e9…` ∧ `startByte 107780` **逐字节不变**
- [ ] 段外改写逐行登记（`reason ≥40` / `leaf:'v5-2'`）；计数 **≥192**
- [ ] 五要素齐备 ∧ `Σ 逐模块 Δ + 未归因 == 登记增量` ∧ 红线逐字节（`content.js` / `pick-layer.js`）
- [ ] 全门禁串行全绿 ∧ 逐项计数 ≥ 基线 ∧ 无断言删除
- [ ] `KL-N-10` 处置留痕（隔离复跑 ≥2 / 日志全量 / 仍红如实登记）

**红线检查点**: 冻界面 `F1`–`F5`；阈值面 `T-a`–`T-e`；台账面 `L-a`–`L-c`；契约面 `C-1`–`C-7`。

**验证命令**:
```bash
npm run test:binding --workspace @lgdl/web-cli-plugin 2>&1 | tee /tmp/opencode/v5-gate-logs/w7-v52-binding-final.log   # 串行
npm run build --workspace @lgdl/web-cli-plugin && stat -c %s packages/web-cli-plugin/dist/content.js packages/web-cli-plugin/dist/pick-layer.js packages/web-cli-plugin/dist/sidepanel.js
npm test --workspace @lgdl/web-cli-plugin 2>&1 | tee /tmp/opencode/v5-gate-logs/w7-v52-node-all.log
git status --short
```

---

## 3. 任务汇总

| 统计项 | 数值 |
|--------|:--:|
| 总任务数 | **30** |
| S 级（简单） | 2（`129` / `144`） |
| M 级（中等） | 16（W1 ×6 / W2 ×3 / W3 ×3 / W4 ×1 / W5 ×1 / W6 ×2） |
| L 级（复杂） | 12（W2 ×1 / W3 ×1 / W4 ×2 / W5 ×2 / W6 ×2 / W7 ×4） |
| 执行波次 | **7** |
| spikeGate | **2**（`129` SG-3 / `144` SG-2） |
| 提交区间 | 7（A–G） |
| 体积预算（本叶） | 逐项 5,200 B + 胶水 350 = **5,550 B**（父 `tasks.md §4.1`） |
| 新增门禁 | 3（`op-protocol` / `sw-op-mirror` / `op-wiring`）+ `s2-deadend-chain`（node 判据） |
| 人工面 | 1（浏览器原生权限弹窗体感 = `⏳ 未执行`） |

## 4. 执行策略

| 波次 | 任务 | 策略 |
|:--:|------|------|
| 1 | `123`–`128` | **半并行**：`124 ∥ 125 ∥ 126 ∥ 127`（各自既有单一入口）；`128` 依赖前 5 op 建立调用点基线 |
| 2 | `129`–`133` | **串行**：`129`（SG-3 只读探针）→ `130 → 131 → 132 → 133`；**任一时刻只跑一个 Chromium** |
| 3 | `134`–`137` | **半并行**：`134 → 135`；`136 ∥ 135`（文件不相交）；`137` 依赖三者 |
| 4 | `138`–`140` | **串行**：`138 → 139 → 140` |
| 5 | `141`–`144` | **半并行**：`141 → 142 → 143` 串行；`144` 只读探针并行 |
| 6 | `145`–`148` | **半并行**：`145 → 146`；`147` 依赖 `145`/`146`；`148 ∥ 146`（文件不相交） |
| 7 | `149`–`152` | **串行**：`149 → 150 → 151 → 152`（收尾；`test` / `test:ui` / `test:binding` 绝不并发） |

**波内门禁纪律**：日志落 `/tmp/opencode/v5-gate-logs/`；`finally` 自清 Chromium profile。

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建（V5-2 次叶 30 原子任务 / 7 波 / 7 提交区间：W1 本地只读 5 op（`op.pick` / `op.describe` / `op.rebind` / `op.help` / `op.turn`）+ `op-table` → W2 **spikeGate-3**（`op-*` type-only 通路）+ `op-protocol` + SW 执行器镜像 + `op.authorize` 两段握手 → W3 `askKind` 扩值 + `secret` 掩码卡 + `submitSecret` 值直达 + `op.llm-config` → W4 `form` 扩形 + `op.perm.request`（机制预留，0 项新增）+ X1 四门禁重锚 → W5 `op.revoke` + **三表整体回滚** + 拒绝非死端 + **spikeGate-2**（binding 避让）→ W6 settings 4 类收编 + 逐 op 布线门禁 + `authorize-chip-wiring` 特权 op 重锚 → W7 S2 全链样本与驱动 seam + **S2 首验收机器化（死端 = 0）** + X2 重锚 + 体积五要素 + 本叶收尾。**与 v5-3 的边界**：`test/ui/no-dead-end.mjs` / `law8-plaintext.mjs` 由 v5-3 **单点落地**（共享面纪律 `FR-ALLN-004`），本叶只交付其上游样本与 seam。**本轮只做 tasks**：零 `src`/`test`/`dist`/`docs`/`design`/ROADMAP 改动；未跑门禁 / 构建 / Chromium。 | 2026-09-22 | SDDU Tasks Agent |
