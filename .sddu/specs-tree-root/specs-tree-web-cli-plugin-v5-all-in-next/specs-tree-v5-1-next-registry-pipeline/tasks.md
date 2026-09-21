# 任务分解：specs-tree-v5-1-next-registry-pipeline（V5-1 NextProvider 注册表 + op 管线；首叶）

> **文档定位**: SDDU 任务清单（**首叶 = 实施承载**）— **22 个原子任务**（`TASK-V5-101~122` / 叶内别名 `V51-01~22`），按 **`ADR-V5-012 §1` v5-1 五波** 展开；**权威跨切契约见父 `../plan.md` + `../ADR-V5-001~012-*.md` + 父 `../tasks.md`**
> **前置依赖**: 本叶 `plan.md` v1.0（`ADR-V5-001` / `002`(机制侧) / `008` + §5 文件影响）+ 父 `../plan.md` v1.0（红线继承 N1~N25 / 不动面 T1~T10 / 体积预算 / 波次）+ 父/本叶 `spec.md` v1.0（本叶 34 条 FR 切片）+ 父 `../discovery.md` v1.0（R-ALLN-004 / 005 / 901~903 / 909）
> **创建人**: SDDU Tasks Agent
> **创建时间**: 2026-09-22
> **版本**: v1.0
> **更新人**: SDDU Tasks Agent
> **更新时间**: 2026-09-22
> **更新说明**: 初始创建（22 原子任务 / 5 波；W1 Definition+Provider+规则迁移 → W2 管线四态机制 → W3 `ACT_TO_OP`+瘦分发+X3 重锚 → W4 义务表+双契约入册(X4) → W5 阻塞态单源+常驻候选+体积+收尾；含 **1 个 spikeGate**（`106`，SG-1）与每任务**红线检查点**四段清单）

---

## 0. 红线与纪律（本叶，**继承父 N1~N25 与父 §16 十二条**）

### 0.1 四段代号（本文件「红线检查点」栏引用；父 `tasks.md §0` 定义，逐字一致）

| 代号 | 面 | 内容（逐字守线） |
|:--:|---|---|
| **F1** | 冻界面 | `design/**` 双稿双 shim **四 sha**（F: `49ce27fc…` / `8ca5db6f…`；G: `a7c0a77a…` / `d0107ecb…`）零触碰；12 kind `CARD_TYPES` 零扩展 |
| **F2** | 冻界面 | `src/content/**` / `dist/content.js`（177,076 B / `52a82620…`）/ `dist/pick-layer.js`（33,900 B / `5f567d7e…`）**零改动** |
| **F3** | 冻界面 | `KIND_SET`（`messaging.ts:103-141`）逐字零新增；判定链（`policy.ts` / `auto-authorize.ts`）内容哈希 pin；`manifest.json` **零 diff**（静态 5 / host 6 / `minimum_chrome_version 116` / 无 `<all_urls>` / 无静态 `content_scripts`） |
| **F4** | 冻界面 | `docs/v3-supersession-ledger.json` **零 diff**（冻结历史）+ `zeroDiffFiles` 其余 8 项逐字节不变 |
| **F5** | 冻界面 | `packages/web-cli-base/**` / `.opencode/opencode.json` / `ROADMAP.md`（含 F-29 区段）零改动；**不碰 `main`** / 不 force push / 无新依赖 / `git add` path-limited |
| **T-a** | 阈值面 | 密度阈值 `default 7/15` · `firstRun 9/20` · `risk 17/35` **逐字**；豁免只认 `hidden`；`DENSITY_EXCLUDED_SUBTREES = ['#stream']` 单源；防滥用（单卡 ≤6 / 首屏 ≤2 / 合计 ≤8 / 欢迎卡 ≤1 / 文案 ≤8 行）；`registeredCells 31` |
| **T-b** | 阈值面 | `STREAM_HEIGHT_RATIO_MIN = 0.65`（**只允许上调**）+ `logClientHeightFloor` + `streamRatioSpike` |
| **T-c** | 阈值面 | `SIDEPANEL_CEILING == floor(baseline × 1.05)`（**无 cap**）；`SIDEPANEL_CEILING_CAP === 'record-only'` 不得被读取；**档位 512,000 不下移**；绝对上限 `563,200`；`authorConfirmation.status === 'pending-author-line'` |
| **T-d** | 阈值面 | `MAX_CHIPS_PER_CARD = 3` / `MAX_NEXTSTEP_CARDS_PER_ROUND = 1` / `NEXTSTEP_MIN_INTERVAL_MS = 10000` / `NEXTSTEP_SOURCE_WHITELIST` **7 项零扩项** / `RECOMMEND_MODULE_WHITELIST` 零扩项 / `MAX_OPEN_ASKS = 2` / `ASK_CANCEL_REASONS` 4 项闭集 / `MAX_CLICKABLES_PER_CARD = 6` |
| **T-e** | 阈值面 | `NEXTSTEP_ACTS` 6 项逐字 → `ACT_TO_OP` 6 行**唯一权威**（等价重锚：判据力**只升不降**，旧闭集判据不得删除） |
| **L-a** | 台账面 | `docs/v4-supersession-ledger.json`（`protectedRanges` / `supersessionChain` / `protectedSupersession` / `modifiedRanges[]` / `redlineRemap[]` / `designContract.designContractChanges[]` / `knownGap` / `v3Vol3Closeout`） |
| **L-b** | 台账面 | `docs/v4-density-baseline.json`（`tiers` / `v5Ledger` / `riskIncrementRegistry` 4 溯源字段 `rulingId`·`rulingDate`·`approvedBy`·`reason` 缺一 FAIL） |
| **L-c** | 台账面 | `test/size-baseline.ts` 五要素（`previousBaselineBytes` / `newBaselineBytes` / `date` / `source` / `reason`）+ `_HISTORY` + `_TIMELINE` + `SIDEPANEL_RE_REGISTRATIONS` + `SIDEPANEL_GROWTH_BREAKDOWN` |
| **C-1** | 契约面 | 12 kind 契约（7 主类 + 5 过程卡）/ `BORN_FROZEN_KINDS` 语义 / 6 终态；**不加 kind**（扩形可以） |
| **C-2** | 契约面 | `op-table` 单源（本叶仅 `definition` / `registry` 侧接口位）+ SW 镜像同源（零第二份手工镜像） |
| **C-3** | 契约面 | `BLOCKED_TERMINALS` **恰 5 项单源**：字面量只允许出现在 `definition.ts`；其余位置必须派生 |
| **C-4** | 契约面 | `ACT_TO_OP` 6 行唯一权威；chip **只读 `data-op`**（`data-act` 不作分发依据） |
| **C-5** | 契约面 | F / G 双契约**各冻各的**（两侧独立计数；**禁止混池**） |
| **C-6** | 契约面 | 证明义务表 ↔ 注册表一致（9 行 / `opId` 集 / 四要素非空 / **无悬空 chips**） |
| **C-7** | 契约面 | `op.execute(` **恰 1 调用点**（`pipeline.ts`）；`REGISTERED_STRUCTURAL_HOSTS = []`（任意深度零 `[data-host]`） |

### 0.2 纪律（逐字继承）

| # | 纪律 | 守线任务 |
|---|------|---------|
| 1 | **断言零删除零降级、计数只增不减**（唯一例外 = 保护段显式八步取代 + 台账留痕） | 全任务；重点 `114` / `115` / `117` / `119` |
| 2 | **反证必须实跑**：注入 → FAIL（声明 `expectFailPattern`）→ **逐字节 sha256 还原** → PASS；**注入点被搬走必须重写** | `104` / `113` / `114` / `115` / `117` / `119` |
| 3 | **门禁严格串行**（一次一个 Chromium，`finally` 自清 profile）；日志 `tee` 全量落盘 | `115` / `122` |
| 4 | `KL-N-10`（binding 环境性 flake）：首轮异常**隔离复跑 ≥2**、日志全量、仍红**如实登记不阻塞收口** | `122` |
| 5 | 停机规则（父 `tasks.md §7` 9 条）任一条命中 ⇒ **停下上报**（禁静默弱化 / 禁静默改 pin / 禁放宽阈值） | `106` / `115` / `118` / `121` / `122` |
| 6 | `git add` **path-limited**（禁 `git add -A` / `.`）；不 force push；不合 `main`；无新依赖 | `122` |
| 7 | 人工面逐项标注（`⏳ 未执行` 或 `PASS`，**不得冒充 PASS**） | `122` |
| 8 | **本叶不落地 9 op 业务能力**（v5-2 职责）；`ops.ts` 只留**注册占位**，`op.execute` 体由 v5-2 填 ⇒ 本叶 `op.execute(` 调用点判据以「恰 1（`pipeline.ts`）**调用点**」为准，不查实现体 | `110` / `113` |

### 0.3 编号与规模

| 项 | 值 |
|---|---|
| 全局编号段 | **`TASK-V5-1xx`**（本叶 `101~122`；与 v1 `TASK-001~040` / v2 `2xx~3xx` / v3 `4xx` / v4 `5xx~8xx` / v4.5 `TASK-V45-1xx` **零冲突**） |
| 叶内别名 | `V51-01~22` |
| 任务总数 / 波数 | **22 / 5** |
| 规模分布 | **S×2 / M×15 / L×5** |
| spikeGate | **SG-1 = `TASK-V5-106`** → 闸 `118` / `119` |
| 体积预算（本叶） | 逐项 **8,400 B**（`ADR-V5-011 §1` #1+#2+#3+#5+#6）+ 胶水分摊 400 = **8,800 B**（父 `tasks.md §4.1`） |

### 0.4 本叶提交区间（**硬约束**）

| 区间 | 波 | 内容 | 原子性 |
|:--:|:--:|---|---|
| **A** | W1 | Definition / Provider / 规则迁移 / SG-1 探针 | 独立提交 |
| **B** | W2 | 管线四态机制 | 独立提交 |
| **C** | W3 | `ACT_TO_OP` + 瘦分发 + X3 重锚 | **终态分发器**必须与 `114` / `115` 同区间（改了分发器未重锚门禁 ⇒ 不得单独提交） |
| **D** | W4 | 义务表 + 双契约入册 | 独立提交 |
| **E** | W5 | 阻塞单源 + 常驻候选 + 体积 + 收尾 | 独立提交（`120`→`121`→`122` 串行） |

> 失败 ⇒ **回滚该区间整段**并重跑受影响门禁；**不跨区间回滚**。

---

## 1. 依赖拓扑总览

```
[前置] 父 plan.md（ADR-V5-001~012 索引）+ 本叶 plan.md（ADR-V5-001/002机制侧/008）+ spec.md（34 FR 切片）+ 父 tasks.md（跨切红线 / 预算 / 停机）

Wave 1 ── Definition / Provider / 规则迁移（区间 A）      ※ 106 为只读探针（不落版本库）
  TASK-V5-101 [M] definition.ts —— Definition 三件套 + 常量单源
  TASK-V5-102 [M] registry.ts validateNextProvider + deps⊆SERVICES loud + 单测骨架
  TASK-V5-103 [M] registry.ts topoByDeps + resolveOrder（列表位置置换不改变顺序）
  TASK-V5-104 [M] registerNextProvider 可逆注册（幂等 unregister / overwrite / 单点写入）
  TASK-V5-105 [L] providers.ts 4 内置 provider（recommend.ts 4 规则等价迁移）
  TASK-V5-106 [S] spikeGate-1：G shim 127 抽取 + 混池防御预证   ← 闸门 → W4/118·119

Wave 2 ── 管线四态机制（区间 B）                          ※ 107 → 108 → 109 串行（同文件）
  TASK-V5-107 [M] pipeline.ts runOp 四态骨架（缺省语义正确）
  TASK-V5-108 [M] pendingOps FIFO 队列 + MAX_OPEN_ASKS 仲裁
  TASK-V5-109 [M] 快照 · 回滚语义位（isMutating / snapshot / rollback）
  TASK-V5-110 [M] R5 失败语义三级 + 「op.execute( 恰 1 调用点」静态判据

Wave 3 ── ACT_TO_OP + 瘦分发 + X3 重锚（区间 C，**原子**）  ※ 111 → 112 → 113 → 114 → 115
  TASK-V5-111 [M] dispatch.ts ACT_TO_OP(6) + OPS_BY_ID + dispatchChipAction
  TASK-V5-112 [S] cards/nextstep.ts chip data-op（data-act 降渲染别名）
  TASK-V5-113 [L] sidepanel.ts#handleCardAction 两集改造（集 B 7→1 次查表）
  TASK-V5-114 [M] test/next-dispatch-diff0.test.ts（零 per-op 分支 + 四操作哈希不变）
  TASK-V5-115 [L] X3 门禁等价重锚（recommendation-sources / local-act-wiring / recommendation.mjs 59）

Wave 4 ── 义务表 + 双契约入册（区间 D）                   ※ 116 ∥ 118；117 依赖 116；119 依赖 118+106
  TASK-V5-116 [M] obligation-table.ts 9 行四要素 + 表尾明示义务
  TASK-V5-117 [M] test/next-obligation-table.test.ts（一致性 + 三类注入反证）
  TASK-V5-118 [L] design-contract F 逐字保留 + G 4 常量 + G_ASSERTION_MAP 127 行
  TASK-V5-119 [M] G 侧 test 块（实跑/sha/计数/映射/卡分类/混池防御）+ designContractChanges

Wave 5 ── 阻塞单源 + 常驻候选 + 体积 + 收尾（区间 E）      ※ 120 → 121 → 122 串行
  TASK-V5-120 [M] BLOCKED_TERMINALS 单源 + site.unauthorized 常驻候选（去 firstRun）
  TASK-V5-121 [M] 体积五要素（本叶增量）+ metafile 归因 + 红线逐字节复核
  TASK-V5-122 [L] 本叶收尾：全门禁串行 + 计数只增对账 + TREE/state 更新
```

**关键路径（严格串行，21 任务）**：
`101 → 102 → 103 → 104 → 105 → 107 → 108 → 109 → 110 → 111 → 112 → 113 → 114 → 115 → 116 → 117 → 118 → 119 → 120 → 121 → 122`
**可并行（文件不相交）**：`101 ∥ 102 ∥ 103 ∥ 104 ∥ 105 ∥ 106`（W1）；`116 ∥ 118`（W4）；`115 ∥ 118` 的准备阶段（**但 `115` 依赖 `113`/`114`，保守串行**）。
**spikeGate**：`TASK-V5-106` → `TASK-V5-118` / `119`（结论 = `report-to-orchestrator` ⇒ 下游**暂停上报**）。

---

## 2. 任务列表

### TASK-V5-101（V51-01）: `definition.ts` —— Definition 三件套 + 常量单源
| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | 无（W1 首） |
| **执行波次** | 1（区间 A） |
| **对应 FR / AC** | FR-ALLN-030 / 031 / 033 / 035（接口形状侧）· AC-ALLN-004 |
| **ADR / 风险** | ADR-V5-001（R2 / R4 / R6）· R-ALLN-004 |
| **并行度** | 与 `102`~`106` 并行（文件不相交）；本任务自身串行 |

**输入**: `ADR-V5-001 §决策` 的 TS 形状块（`NextProvider` / `NextOp` / `registerNextProvider` 签名）+ 分发模式表（挂载点 × 模式）+ `ADR-V5-009 §1`（`BLOCKED_TERMINALS` 恰 5 项）+ `discovery §7.1 A1~A5`（现状 4 规则 / 6 act / 16 分支 / `data-act`）。

**动作**:
1. 新建 `src/ui/sidepanel/next-registry/definition.ts`：`NEXT_SERVICES`（6）/ `NEXT_MODES`（2）/ `NEXT_MOUNT_POINTS`（5）/ `MOUNT_MODE`（`next`/`params`/`consent`/`execute` = `waterfall`；`receipt` = `emit`）/ `BLOCKED_TERMINALS`（**恰 5 项**：`site.unauthorized` / `llm.unconfigured` / `perm.missing` / `binding.stale` / `ref.all-invalid`）/ `NEXTSTEP_MIN_INTERVAL_MS`。
2. 接口：`NextProvider{id, deps, priority: 0|1|2|3, prepend?, mode, fail, when(ctx), chips, dispose?}`；`NextOp{opId, risk, layer, params?, consent?, execute, receipt?}`；`NextCtx` 字段集 == 旧 **7 源白名单**（`ref` / `session` / `site` / `catalog` / `probe` / `risk` / `onboarding`）。
3. 全部 `Object.freeze`；**`BLOCKED_TERMINALS` 的 5 个字面量只允许在此处出现**（其余位置派生）。
4. `recommend.ts` 的 `NEXTSTEP_PRIORITY` / `NEXTSTEP_ACTS` 常量**本任务不动**（迁移在 `105`）。

**产出**: `definition.ts`（纯接口与常量，零副作用）；`NextCtx` 字段集与旧 7 源白名单的逐字对照表（落 `state.json#v5-1.definitionMapping`）。

**验收标准（可机核）**:
- [ ] `NEXT_SERVICES.length === 6` ∧ `NEXT_MODES.length === 2` ∧ `NEXT_MOUNT_POINTS.length === 5` ∧ `BLOCKED_TERMINALS.length === 5`
- [ ] `MOUNT_MODE.receipt === 'emit'` ∧ 其余 4 项 === `'waterfall'`（与 ADR 表逐字）
- [ ] `NextCtx` 字段集 == 7 源白名单（**逐字集合相等**，无扩项）
- [ ] 源文本扫描：`BLOCKED_TERMINALS` 5 个字面量在 `src/**` 中**只出现在 `definition.ts`**（「声明恰一次」）
- [ ] 零 `import` chrome API（纯 TS）；`Object.isFrozen` 全绿

**红线检查点**: 冻界面 `F1`（零触碰 design）/ `F3`（`KIND_SET` / `manifest` 零改）；阈值面 `T-d`（白名单 7 项零扩项）；契约面 `C-1`（不加 kind）/ `C-3`（`BLOCKED_TERMINALS` 单源）/ `C-7`；台账面 `L-a`（**本任务只读，不写台账**）。

**验证命令**:
```bash
npm run typecheck --workspace @lgdl/web-cli-plugin
node -e "const s=require('fs').readFileSync('packages/web-cli-plugin/src/ui/sidepanel/next-registry/definition.ts','utf8');for(const n of ['NEXT_SERVICES','NEXT_MODES','NEXT_MOUNT_POINTS','MOUNT_MODE','BLOCKED_TERMINALS']){if(!s.includes(n))throw new Error('missing '+n)}console.log('definition: 5 constants ok')"
```

---

### TASK-V5-102（V51-02）: `registry.ts` —— `validateNextProvider` + `deps ⊆ NEXT_SERVICES` loud + 单测骨架
| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-V5-101（`NEXT_SERVICES` / 接口） |
| **执行波次** | 1（区间 A） |
| **对应 FR / AC** | FR-ALLN-031 / 033 / 035（校验侧）· AC-ALLN-004 |
| **ADR / 风险** | ADR-V5-001（R2 / R4 / R6）· R-ALLN-903 |
| **并行度** | 与 `103`~`106` 并行（同文件不同函数体 ⇒ 若同人实现则串行） |

**输入**: `ADR-V5-001 §决策`（R2 `deps ⊆ SERVICES` 未知 ⇒ `{ok:false,error}`；R4 `mode ∉ NEXT_MODES` 或与 `MOUNT_MODE` 声明不符 ⇒ loud；R6 Seam 三件套）。

**动作**:
1. 新建 `src/ui/sidepanel/next-registry/registry.ts`：`validateNextProvider(def)` → `{ok:true} | {ok:false; error}`，逐项校验：未知 `deps` / `priority` 缺失或越域 / `mode` 越集 / `mode` 与挂载点声明不符 / `chips` 为空或悬空 / 重复 `id`；**禁止静默覆盖或静默默认**（loud）。
2. `countProviders()` / `listProviders()` 只读读数（供往返断言）。
3. 新建 `test/next-registry.test.ts` **骨架**：导出判据函数（供伪造源码反证）+ 预留 R2 / R4 / R6 断言位 + 每条判据的 `expectFailPattern` 声明位。

**产出**: `registry.ts`（`validate` 部分）+ `test/next-registry.test.ts` 骨架。

**验收标准（可机核）**:
- [ ] 注入未知 `deps`（如 `'unknown'`）⇒ `{ok:false}` 且 `error` 非空（loud）
- [ ] 注入 `mode:'bogus'` / `mode:'emit'` 于 `next` 挂载点 ⇒ `{ok:false}`
- [ ] `priority` 缺失 ⇒ `{ok:false}`；重复 `id` ⇒ `{ok:false}`（**不覆盖**）
- [ ] `test/next-registry.test.ts` 导出 ≥1 判据函数且每条判据有 `expectFailPattern` 字面
- [ ] 骨架可红（未实现处显式 fail），不出现「恒绿判据」

**红线检查点**: 冻界面 `F1` / `F3`；阈值面 `T-d`（`MAX_CHIPS_PER_CARD` 语义在 chips 校验中体现）；契约面 `C-2`（单源）/ `C-6`（义务表稍后对账）；台账面 `L-a`（只读）。

**验证命令**:
```bash
npm run typecheck --workspace @lgdl/web-cli-plugin
npm test --workspace @lgdl/web-cli-plugin -- next-registry 2>&1 | tee /tmp/opencode/v5-gate-logs/w1-next-registry-skeleton.log
```

---

### TASK-V5-103（V51-03）: `registry.ts` —— `topoByDeps` + `resolveOrder`（**顺序不来自数组位置**）
| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-V5-102（`validateNextProvider`） |
| **执行波次** | 1（区间 A） |
| **对应 FR / AC** | FR-ALLN-031 / 032 · AC-ALLN-004 |
| **ADR / 风险** | ADR-V5-001（R2 依赖就绪定序 / R3 优先级显式化）· **R-ALLN-902**（列表位置绕过） |
| **并行度** | 与 `101` / `104` / `105` / `106` 并行；与 `102` 同文件 ⇒ 保守串行 |

**输入**: `ADR-V5-001 §决策`（`resolveOrder` = `topoByDeps(list)` 后稳定排序 `(priority asc, prepend desc, registrationSeq asc)`）；**实现层铁律**「`resolveOrder` 不得回退为数组顺序」。

**动作**:
1. 实现 `topoByDeps(providers)`：按 `deps ⊆ NEXT_SERVICES` 做服务依赖拓扑；**同服务层内**稳定排序 `(priority asc, prepend desc, registrationSeq asc)`。
2. 实现 `resolveOrder(registry)`：返回有序 provider 列表；`registrationSeq` 由注册顺序单调递增（非数组下标）。
3. 在 `test/next-registry.test.ts` 增：**列表位置置换测试**（把同一组 provider 以不同数组顺序注册 ⇒ `resolveOrder` 输出**逐项相等**）。
4. 反证：把 `resolveOrder` 改为直接返回数组顺序 ⇒ 置换测试 FAIL。

**产出**: `registry.ts`（定序部分）+ 置换测试与反证留证。

**验收标准（可机核）**:
- [ ] 同一集合以 **3 种不同数组顺序**注册 ⇒ `resolveOrder` 输出**逐项相等**（置换不变）
- [ ] `priority` 0 → 1 → 2 → 3 顺序成立；同 `priority` 下 `prepend:true` 置前
- [ ] 反证：改为数组顺序 ⇒ FAIL（`expectFailPattern` 记载）→ 还原 ⇒ PASS
- [ ] `resolveOrder` 无副作用（幂等：连续两次调用结果相同）

**红线检查点**: 冻界面 `F1` / `F3`；阈值面 `T-d`（源白名单语义：候选仍只读既有 state 字段）；契约面 `C-2`（单点写入）/ `C-3`；台账面 `L-a`（只读）。

**验证命令**:
```bash
npm run typecheck --workspace @lgdl/web-cli-plugin
npm test --workspace @lgdl/web-cli-plugin -- next-registry 2>&1 | tee /tmp/opencode/v5-gate-logs/w1-resolve-order.log
```

---

### TASK-V5-104（V51-04）: `registerNextProvider` 可逆注册（幂等 `unregister` / `overwrite` 整行替换 / 单点写入）
| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-V5-102 / TASK-V5-103 |
| **执行波次** | 1（区间 A） |
| **对应 FR / AC** | FR-ALLN-030（R1）/ 032（R3 覆盖）· AC-ALLN-004 |
| **ADR / 风险** | ADR-V5-001（R1 / R3）· R-ALLN-901 |
| **并行度** | 与 `101` / `105` / `106` 并行 |

**输入**: `ADR-V5-001 §决策`（R1：`unregister` 闭包 = `removeRowById(id)`，**幂等**（第二次调用不再减，返回同一 `countProviders()`）；R3：`{overwrite:true}` 按 id **整行替换**（`replaceRowById`，**计数不变**））；铁律「`REGISTRY` 单点写入（唯一 `push` / `splice`）」。

**动作**:
1. `registerNextProvider(def, opts?)` → `{ok:true, id, unregister} | {ok:false, error, unregister:null}`；失败时**不入表**。
2. `unregister()` = 幂等移除（第二次返回同一计数）；`overwrite:true` ⇒ `replaceRowById`（**位置与计数不变**）。
3. `REGISTRY` 单点写入：全文件唯一 `push` / `splice` 点（源文本抽取判据）。
4. 在 `test/next-registry.test.ts` 增 R1 往返（N → N+1 → N）+ 幂等 + 覆盖（计数不变 + 行被替换非追加）+ 反证（非幂等 disposer / 追加式覆盖 ⇒ FAIL）。

**产出**: `registry.ts`（注册部分）+ R1 往返与覆盖机核 + 反证留证。

**验收标准（可机核）**:
- [ ] 往返读数 `N → N+1 → N`；连续两次 `unregister()` ⇒ 计数**不变**
- [ ] `overwrite:true` ⇒ 计数不变 ∧ 该 `id` 行被替换（`listProviders()` 中 `id` 仍在原位）
- [ ] 源文本：`registry.ts` 中 `REGISTRY.push` / `REGISTRY.splice` 各**恰 1 处**
- [ ] 反证：注入非幂等 disposer ⇒ FAIL；改为追加 ⇒ FAIL（均逐字节还原 ⇒ PASS）

**红线检查点**: 冻界面 `F1` / `F3`；阈值面 `T-d`；契约面 `C-2`（单源）/ `C-6`；台账面 `L-a`（只读）。

**验证命令**:
```bash
npm run typecheck --workspace @lgdl/web-cli-plugin
npm test --workspace @lgdl/web-cli-plugin -- next-registry 2>&1 | tee /tmp/opencode/v5-gate-logs/w1-register-reversible.log
```

---

### TASK-V5-105（V51-05）: `providers.ts` —— 4 内置 provider（`recommend.ts` 4 规则 + 5 触发集等价迁移；常量逐字保留）
| 属性 | 值 |
|------|-----|
| **复杂度** | L |
| **前置依赖** | TASK-V5-101 / 102 / 103 / 104 |
| **执行波次** | 1（区间 A） |
| **对应 FR / AC** | FR-ALLN-030~038（迁移面）/ 013 · AC-ALLN-004 / 009 |
| **ADR / 风险** | ADR-V5-001（取代路径表 / X3 / X6）· **R-ALLN-004**（迁移量最大）· R-ALLN-905 |
| **并行度** | W1 末位（依赖 `101`~`104` 全部接口） |

**输入**: `ADR-V5-001 §replace` 取代路径表（`NEXTSTEP_PRIORITY` 4 规则 → priority 0/1/2/3；`activeRecoveryTrigger` 5 触发 → 5 个 P0 provider；`RECOVERY_CHIP_ORDER` → `chips:[opId]`；`candidateRules` 4 谓词 → `when(ctx)`；`NEXTSTEP_SOURCE_WHITELIST` 7 源 → `NextCtx`）；现状 `recommend.ts:52` / `:194` / `:296-307`。

**动作**:
1. 新建 `next-registry/providers.ts`：4 内置 provider（`risk-recovery` → priority 0 / `onboarding` → 1 / `ref-action` → 2 / `capability-discovery` → 3）+ 5 个 P0 恢复 provider（`site.unauthorized` / `ref.stale` / `binding.stale` / `probe.unsettled` / `declaration.invalid`）。
2. `chips` 逐条等价：`site` / `probe` 首项 = `op.rebind`；`refInvalid` 首项 = `op.pick`（= 旧 `RECOVERY_CHIP_ORDER` 语义）。
3. `when(ctx)` 逐谓词等价（含 `openAsks === 0` / `probe.phase === 'ready'` / `!busy`）；**`site.unauthorized` 的 `when` 本任务先按等价迁移（`firstRun` 依赖的去除在 `120`）**。
4. `recommend.ts`：常量**逐字保留**（`NEXTSTEP_PRIORITY` / `NEXTSTEP_ACTS` / `RECOVERY_CHIP_ORDER` / `NEXTSTEP_SOURCE_WHITELIST` / 3 常量），规则求值改为**委托注册表**（导出面等价重锚；`recommend()` 门控 4 抑制原因 `RecommendSuppression` 语义不变）。
5. 迁移对账表：旧对象 → 新 provider **逐条**落 `state.json#v5-1.migrationLedger`。

**产出**: `providers.ts` + `recommend.ts`（重构净变化）+ 逐条迁移对账表。

**验收标准（可机核）**:
- [ ] 4 内置 provider 的 `priority` = `0 / 1 / 2 / 3`（顺序等价：恢复 > 引导 > 发现）
- [ ] 5 个 P0 恢复 provider 与 5 触发**逐条**可列举（集合相等）
- [ ] `NEXTSTEP_PRIORITY` / `NEXTSTEP_ACTS` / `RECOVERY_CHIP_ORDER` / `NEXTSTEP_SOURCE_WHITELIST` 四常量**逐字不变**（字面比对）
- [ ] `RecommendSuppression` 4 抑制原因语义不变（既有断言不改仍绿）
- [ ] 源白名单 **7 项零扩项**（`NEXTSTEP_SOURCE_WHITELIST.length === 7`）
- [ ] `recommend()` 的导出面（函数名 / 参数 / 返回形状）等价（既有门禁不改仍绿）

**红线检查点**: 冻界面 `F1` / `F2` / `F3`；阈值面 `T-a`（防滥用常量）/ `T-d`（7 源 / 3 常量）/ `T-e`（6 act 本任务**仍逐字保留**，重锚在 `111`/`115`）；契约面 `C-2` / `C-4`；台账面 `L-a`（登记 X3 迁移条目，**本任务登记、`115` 对账**）。

**验证命令**:
```bash
npm run typecheck --workspace @lgdl/web-cli-plugin
npm test --workspace @lgdl/web-cli-plugin 2>&1 | tee /tmp/opencode/v5-gate-logs/w1-providers-migration.log
npm run test:recommendation --workspace @lgdl/web-cli-plugin 2>&1 | tee /tmp/opencode/v5-gate-logs/w1-recommendation-baseline.log   # 串行
```

---

### TASK-V5-106（V51-06）: **spikeGate-1** —— G shim 127 断言抽取 + F/G 混池防御预证
| 属性 | 值 |
|------|-----|
| **复杂度** | S |
| **前置依赖** | 无（只读探针） |
| **执行波次** | 1（区间 A） |
| **对应 FR / AC** | FR-ALLN-100 / 101（X4）· AC-ALLN-016 / 017 |
| **ADR / 风险** | ADR-V5-008 · **R-ALLN-909**（混池）/ R-ALLN-005 |
| **并行度** | 与 `101`~`105` 完全并行（只读探针，**不落版本库**） |
| **闸门语义** | **spikeGate**：结论决定 `TASK-V5-118` / `119` 能否直落 |

**输入**: `ADR-V5-008 §决策`（G shim `d0107ecb…` / G 稿 `a7c0a77a…` / `G_SHIM_CHECK_CALLS = 127` / 14 组 A~N / id 抽取正则 `^check\('([A-Z]\d+)\s`）；`test/design-contract.test.ts` F 侧 4 常量 + `ASSERTION_MAP` 60 行。

**动作**（全部在 `/tmp/opencode/v5-spike/` 内，**只读仓库 + 临时副本**）:
1. 复算 `option-g-shim.mjs` sha256 == `d0107ecb…` ∧ `option-g-all-in-next.html` sha256 == `a7c0a77a…`。
2. 抽取 `^check\('([A-Z]\d+)\s` 的 id 序列，核对 = **127** 项 ∧ 分组覆盖 A~N **14 组**（A6 / B5 / C8 / D6 / E7 / F11 / G8 / H7 / I17 / J5 / K3 / L4 / M23 / N17）。
3. 实跑 `node design/ui-redesign/option-g-shim.mjs` ⇒ 退出码 0 ∧ 输出含 `127 passed` / `0 failed`（**设计稿自检，非产品门禁**）。
4. 预演 **F/G 混池防御**设计：F id 集 (`A1`~`I1` 60 项) ∩ G id 集（`A1`~`N17` 127 项）**非空** ⇒ 混池防御**不得**依赖「id 集互斥」，必须用「**两侧独立计数 + 各自 test 块 + 共享 helper 各调用一次**」；记录该结论（**R-ALLN-909 的关键发现**）。
5. 记录失败判据（sha 不符 / 抽取 ≠ 127 / 分组 ≠ 14 / 实跑非 0）。

**产出**: 探针报告（`g-contract-feasible` 或 `report-to-orchestrator` + 量化证据 + id 交集结论）；结论写入 `state.json#v5-1.spikes[]`。

**验收标准（可机核）**:
- [ ] sha256 双命中（shim `d0107ecb…` ∧ 稿 `a7c0a77a…`）
- [ ] 抽取 id 数 == **127** ∧ 分组 == **14**（逐组计数给出）
- [ ] 实跑 `127 passed / 0 failed`（退出码 0）
- [ ] **id 交集结论显式成文**（非空 ⇒ 混池防御改用「独立计数 + 共享 helper」方案）
- [ ] `git status --short` **零输出**（探针不入版本库）

**红线检查点**: 冻界面 `F1`（**G 稿 / shim 零触碰** —— 只读复算）；阈值面 `T-c`；契约面 `C-5`（双契约各冻各的）；台账面 `L-a`（**禁止改 pin / 禁止写台账**，只能产出结论）。

**验证命令**:
```bash
mkdir -p /tmp/opencode/v5-spike && node /tmp/opencode/v5-spike/g-shim-probe.mjs | tee /tmp/opencode/v5-gate-logs/w1-spike-g-shim.log
git status --short   # 必须为空
```

---

### TASK-V5-107（V51-07）: `pipeline.ts` —— `runOp` 四态骨架（缺省语义正确）
| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-V5-105（provider 接口就绪） |
| **执行波次** | 2（区间 B） |
| **对应 FR / AC** | FR-ALLN-055 / 034 ① · AC-ALLN-008 |
| **ADR / 风险** | ADR-V5-002（机制侧）· R-V5-101 |
| **并行度** | W2 串行首位（`108` / `109` 同文件） |

**输入**: `ADR-V5-002 §1`（`runOp` 参考实现四态）；`MAX_OPEN_ASKS = 2` / `ASK_CANCEL_REASONS` 现址 `stream-model.ts:86-121`。

**动作**:
1. 新建 `next-registry/pipeline.ts`：`runOp(opId, ctx)` = ① 单次查表 `OPS_BY_ID[opId]`（缺失 ⇒ `fail('unknown-op')` loud）② `params` 有则 `collectParams`，`REJECTED` ⇒ `settle('cancelled')` ③ `consent` 有则 `collectConsent`，`'reject'` ⇒ `settle('rejected')` ④ `isMutating` ⇒ `snapshot` ⑤ `execute`（`layer==='sw'` ⇒ `execSw`）⑥ `settle('completed')`。
2. **缺省语义**：无 `params` 不插 ask；无 `consent` 不插 auth（判据）。
3. `OPS_BY_ID` / `collectParams` / `collectConsent` / `execSw` / `settle` 以**显式占位**导出（`ops.ts` 执行体由 v5-2 填；`execSw` 由 v5-2 W2 填）。
4. 导出 `PIPELINE_ENTRY`（唯一执行入口标记）供 `110` 的「恰 1 调用点」判据。

**产出**: `pipeline.ts`（四态骨架 + 占位）。

**验收标准（可机核）**:
- [ ] `runOp` 覆盖四态路径（4 条分支可达，单测桩驱动）
- [ ] `params` 缺省 ⇒ 零 ask；`consent` 缺省 ⇒ 零 auth（桩断言调用次数 == 0）
- [ ] 未知 `opId` ⇒ loud（`fail('unknown-op')` 且不入注册表者不可分发）
- [ ] 无 per-op 旁路：`src` 中不存在第二条执行路径（源文本判据占位）

**红线检查点**: 冻界面 `F1` / `F2` / `F3`；阈值面 `T-d`（`MAX_OPEN_ASKS` 语义稍后 `108`）；契约面 `C-1` / `C-7`；台账面 `L-a`（只读）。

**验证命令**:
```bash
npm run typecheck --workspace @lgdl/web-cli-plugin
npm test --workspace @lgdl/web-cli-plugin -- pipeline 2>&1 | tee /tmp/opencode/v5-gate-logs/w2-runop.log
```

---

### TASK-V5-108（V51-08）: `pendingOps` FIFO 队列 + `MAX_OPEN_ASKS` 仲裁（EC-ALLN-010）
| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-V5-107 |
| **执行波次** | 2（区间 B） |
| **对应 FR / AC** | FR-ALLN-055 · EC-ALLN-010 · AC-ALLN-008 |
| **ADR / 风险** | ADR-V5-002 §1（仲裁算法）· **R-V5-102** |
| **并行度** | W2 串行中段（同文件） |

**输入**: `ADR-V5-002 §1` 末段（`params`/`consent` 卡计入 `MAX_OPEN_ASKS`；达上限**不新开 ask**，压入 FIFO `pendingOps` + 流内系统行「还有 N 个待答，先答完再继续」（**不静默丢弃**）；`ask-resolved` 后 drain 队首）。

**动作**:
1. 实现 `pendingOps` FIFO 队列 + `enqueue` / `drainOne` / `queueLength`。
2. 达 `MAX_OPEN_ASKS` 时**不新开 ask** ⇒ 入队 + 追加系统事件行（文案含剩余数）。
3. `ask-resolved` 事件驱动 `drainOne`（**只在此处 drain**）；`REF_ROUND_PREFIX` 本地回合**不入队**。
4. 断言「同一 ask **不得二次 resolve**」（`supersededAsk` 与 drain 顺序无关歧义）。
5. 反证：① 静默丢弃（不入队且无系统行）⇒ FAIL；② 队列非 FIFO（后进先出）⇒ FAIL。

**产出**: `pipeline.ts`（队列部分）+ 仲裁机核 + 反证留证。

**验收标准（可机核）**:
- [ ] 第 3 个需 ask 的 op（`openAsks == 2`）⇒ `queueLength === 1` ∧ 流内出现「待答」系统行
- [ ] `ask-resolved` ⇒ `queueLength` 递减 1（队首先进先出）
- [ ] 同一 `requestId` 二次 `resolve` ⇒ 被拒绝（计数不变）
- [ ] 反证两条实跑：静默丢弃 ⇒ FAIL；LIFO ⇒ FAIL（逐字节还原 ⇒ PASS）

**红线检查点**: 冻界面 `F1` / `F3`；阈值面 `T-d`（`MAX_OPEN_ASKS = 2` 语义 / `ASK_CANCEL_REASONS` 4 项闭集**逐字不动**）；契约面 `C-1`（不加 kind：队列告知走**既有系统事件行**）；台账面 `L-a`（只读）。

**验证命令**:
```bash
npm run typecheck --workspace @lgdl/web-cli-plugin
npm test --workspace @lgdl/web-cli-plugin -- pipeline 2>&1 | tee /tmp/opencode/v5-gate-logs/w2-pending-ops.log
```

---

### TASK-V5-109（V51-09）: 快照 · 回滚**语义位**（`isMutating` / `snapshot` / `rollback`）
| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-V5-108 |
| **执行波次** | 2（区间 B） |
| **对应 FR / AC** | FR-ALLN-034 ③ · EC-ALLN-011 · AC-ALLN-004 |
| **ADR / 风险** | ADR-V5-002 §1 ④ / ③ · **R-ALLN-904** |
| **并行度** | W2 串行末段（同文件） |

**输入**: `ADR-V5-002 §1`（`isMutating(op)` ⇒ `snapshot`；`catch` ⇒ `rollback(snap)` 后 `errorWithRecovery`）；`ADR-V5-005`（`op.revoke` 涉授权 / 权限 / 凭据**三表**）。

**动作**:
1. 实现 `isMutating(op)`（`risk !== 'low' && layer` 判定规则显式化）与 `snapshot(op, ctx)` / `rollback(snap)` **语义位**（v5-2 填具体表读写）。
2. `snapshot` 结构显式支持**多表**（`{tables: [...]}`）—— 为 `op.revoke` 三表整体回滚预留（**禁止单表接口**）。
3. 失败路径：`catch` ⇒ `rollback(snap)` ⇒ `errorWithRecovery(op,'card-boundary',err)`（失败**整体**回滚，无半完成态）。
4. 反证：把 `snapshot` 退化为单表接口 ⇒ 三表断言位 FAIL（以桩驱动）。

**产出**: `pipeline.ts`（快照 / 回滚语义位）+ 多表接口断言。

**验收标准（可机核）**:
- [ ] `isMutating` 对 `op.llm-config` / `op.perm.request` / `op.revoke` = true；对 `op.pick` / `op.help` / `op.turn` = false
- [ ] `snapshot` 返回结构含**表列表**（≥1 表可登记；≥3 表可登记）
- [ ] 失败注入 ⇒ `rollback` 被调用 ∧ 抛错不外泄 ⇒ `errorWithRecovery` 产出（法七不破）
- [ ] 反证：单表接口退化 ⇒ FAIL

**红线检查点**: 冻界面 `F1` / `F3`；阈值面 `T-d`；契约面 `C-1`（错误卡走既有 kind）/ `C-7`；台账面 `L-a`（只读）。

**验证命令**:
```bash
npm run typecheck --workspace @lgdl/web-cli-plugin
npm test --workspace @lgdl/web-cli-plugin -- pipeline 2>&1 | tee /tmp/opencode/v5-gate-logs/w2-snapshot-rollback.log
```

---

### TASK-V5-110（V51-10）: R5 失败语义三级 + 「`op.execute(` 恰 1 调用点」静态判据
| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-V5-109 |
| **执行波次** | 2（区间 B） |
| **对应 FR / AC** | FR-ALLN-034（R5 三级）/ 035（R6）· AC-ALLN-004 |
| **ADR / 风险** | ADR-V5-002（机制侧）· R-ALLN-905 |
| **并行度** | W2 末位（W3 前置） |

**输入**: `ADR-V5-002 §1`（R5 三级）；`ADR-V5-001`（R6 Seam 三件套）；本叶 §0.2 纪律 8（本叶不落地 9 op 业务能力 ⇒ 判据查**调用点**不查实现体）。

**动作**:
1. 三级落位：① `execute` 抛错 ⇒ **单卡边界捕获** ⇒ 流内错误卡 + 恢复 next（不打断同屏其他卡）② 注册失败 ⇒ **loud** 红显（`data-state="fail"`）③ 改状态 op ⇒ 快照 + 失败整体回滚。
2. 新增静态判据（源文本抽取）：`op.execute(` / `.execute(` 在 `src/ui/sidepanel/**` 中**恰 1 调用点**（`pipeline.ts`）。
3. Seam 三件套存在性断言：Definition（接口字段集）/ Provider（注册表实例）/ Consumer（`handleCardAction` 唯一消费入口，`113` 落地后生效）。
4. 反证：① 注入第二处 `.execute(` 调用 ⇒ FAIL；② 删 `try/catch` ⇒ 失败路径断言 FAIL。

**产出**: `pipeline.ts`（失败语义三级）+ 静态判据 + Seam 三件套断言。

**验收标准（可机核）**:
- [ ] `src/ui/sidepanel/**` 中 `.execute(` 调用点 == **1**（`expectFailPattern` 声明）
- [ ] 三件套断言：接口字段集非空 ∧ 注册表实例可读 ∧ Consumer 入口唯一（`113` 后）
- [ ] 反证两条实跑 ⇒ FAIL → 逐字节还原 ⇒ PASS
- [ ] 「无 per-op 旁路」断言：不存在第二执行路径（源文本 + 单测桩）

**红线检查点**: 冻界面 `F1` / `F3`；阈值面 `T-d`；契约面 `C-7`（恰 1 调用点）/ `C-1`；台账面 `L-a`（只读）。

**验证命令**:
```bash
npm run typecheck --workspace @lgdl/web-cli-plugin
npm test --workspace @lgdl/web-cli-plugin -- pipeline 2>&1 | tee /tmp/opencode/v5-gate-logs/w2-fail-semantics.log
```

---

### TASK-V5-111（V51-11）: `dispatch.ts` —— `ACT_TO_OP`(6) + `OPS_BY_ID` + `dispatchChipAction`（一次查表）
| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-V5-110 |
| **执行波次** | 3（区间 C，**原子区间**） |
| **对应 FR / AC** | FR-ALLN-056 / 057 / 058 · AC-ALLN-009 |
| **ADR / 风险** | ADR-V5-001（X3 / 两集模型）· **R-V5-103** |
| **并行度** | 与 `112` 并行；`113` 依赖本任务 |

**输入**: `ADR-V5-001 §决策`（`ACT_TO_OP` 6 行唯一权威：`next→op.turn` / `repick→op.pick` / `describe→op.describe` / `authorize→op.authorize` / `help→op.help` / `rebind→op.rebind`；`dispatchChipAction` 参考实现）；**两集模型**定义（集 A 8 项 / 集 B 7 项）。

**动作**:
1. 新建 `next-registry/dispatch.ts`：`export const ACT_TO_OP = Object.freeze({...})`（**6 行**，双向可查）；`OPS_BY_ID` 单源（由注册表派生）。
2. `dispatchChipAction(action, value?)`：`const opId = ACT_TO_OP[action] ?? (OPS_BY_ID[action] ? action : undefined)` → `runOp(opId,{value})`；**一次查表，零 per-op 分支**。
3. 导出 `SET_A_PROTOCOL_ACTIONS = ['answer','choose','cancel','approve','reject','audit','hover','reanchor']`（集 A 常量，**8 项**）。
4. **纪律**：集 B 的 7 个 action 字符串在 `src/**` 中**只允许出现在 `dispatch.ts` 的 `ACT_TO_OP` 数据块**（静态扫描判据，`114` 机核）。
5. 反证：加一个 per-op `if` 分支 ⇒ `114` 门禁 FAIL。

**产出**: `dispatch.ts` + 两集常量 + 集 B 字符串唯一出现点。

**验收标准（可机核）**:
- [ ] `ACT_TO_OP` 恰 **6 行** ∧ 6 条映射逐字与 ADR 表一致 ∧ **双向可查**
- [ ] `SET_A_PROTOCOL_ACTIONS.length === 8` ∧ 与 `ACT_TO_OP` 键集**交集为空**
- [ ] 集 B action 字符串（`next`/`repick`/`describe`/`describe-submit`/`rebind`/`help`/`authorize`）在 `src/**` 中只出现于 `dispatch.ts`（`describe-submit` 归并说明成文）
- [ ] `dispatchChipAction` 函数体零 `if (action === ...)` per-op 分支（源文本判据）
- [ ] 反证：加 per-op 分支 ⇒ `114` FAIL

**红线检查点**: 冻界面 `F1` / `F3`；阈值面 `T-e`（`ACT_TO_OP` 为唯一权威；旧 `NEXTSTEP_ACTS` 常量**仍在**，等价重锚在 `115`）；契约面 `C-4`（chip 只读 `data-op`）；台账面 `L-a`（登记 X3/X6-chip 条目）。

**验证命令**:
```bash
npm run typecheck --workspace @lgdl/web-cli-plugin
node -e "const s=require('fs').readFileSync('packages/web-cli-plugin/src/ui/sidepanel/next-registry/dispatch.ts','utf8');const n=(s.match(/ACT_TO_OP/g)||[]).length;if(n<2)throw new Error('ACT_TO_OP missing');console.log('dispatch: ACT_TO_OP present')"
```

---

### TASK-V5-112（V51-12）: `cards/nextstep.ts` —— chip 增 `data-op`；`data-act` 降渲染别名
| 属性 | 值 |
|------|-----|
| **复杂度** | S |
| **前置依赖** | TASK-V5-111 |
| **执行波次** | 3（区间 C） |
| **对应 FR / AC** | FR-ALLN-057 · AC-ALLN-009 |
| **ADR / 风险** | ADR-V5-001（X6-chip 侧）· R-ALLN-905 |
| **并行度** | 可与 `113` 准备并行；文件 `cards/nextstep.ts` 独立 |

**输入**: `ADR-V5-001`（`cards/nextstep.ts:59` 现状 `btn.setAttribute('data-act', act)`）；`FR-ALLN-057`（`data-act` 若保留则降为**渲染别名**，**不得与 opId 冲突、不得作为分发依据**）。

**动作**:
1. chip 渲染增设 `data-op`（= `opId`，由 `ACT_TO_OP[act]` 派生，**不新增第二真值源**）。
2. `data-act` 保留为渲染别名（若保留）；**不得与 opId 冲突**。
3. 分发路径**不再读 `data-act`**（`113` 落地）。
4. 反证：以 `data-act` 分发 ⇒ FAIL（`114` 覆盖）。

**产出**: `cards/nextstep.ts`（`data-op` 渲染）。

**验收标准（可机核）**:
- [ ] chip 元素同时含 `data-op`（值 ∈ 注册表 `opId` 集）与（可选的）`data-act`
- [ ] `data-op` 由 `ACT_TO_OP` 派生（源文本：`nextstep.ts` 不硬编码 6 条映射）
- [ ] 反证：chip 不带 `data-op` ⇒ 门禁 FAIL

**红线检查点**: 冻界面 `F1`（`CARD_TYPES` 零扩展：`nextstep` 卡形状不变）/ `F2`；阈值面 `T-d`（`MAX_CHIPS_PER_CARD = 3`）；契约面 `C-4`；台账面 `L-a`（只读）。

**验证命令**:
```bash
npm run typecheck --workspace @lgdl/web-cli-plugin
npm run test:stream --workspace @lgdl/web-cli-plugin 2>&1 | tee /tmp/opencode/v5-gate-logs/w3-stream-dataop.log   # 串行
```

---

### TASK-V5-113（V51-13）: `sidepanel.ts#handleCardAction` 两集改造（集 B 7→1 次查表）
| 属性 | 值 |
|------|-----|
| **复杂度** | L |
| **前置依赖** | TASK-V5-112 |
| **执行波次** | 3（区间 C，**终态分发器**） |
| **对应 FR / AC** | FR-ALLN-058 / 059 · AC-ALLN-005 |
| **ADR / 风险** | ADR-V5-001（两集模型）· **R-V5-103**（两集划分被模糊化）· R-ALLN-004 |
| **并行度** | W3 关键路径中段（`sidepanel.ts` 被 `114`/`115`/`120` 共享 ⇒ 保守串行） |

**输入**: `ADR-V5-001 §两集模型`（集 A 8 项保留在 `handleCardAction`；集 B 7 项合并为 1 次查表）；现状 `sidepanel.ts:184-277`（16 分支 + `:275` 兜底「将在 v4-3 / v4-4 落地」）。

**动作**:
1. `handleCardAction` 重构：**集 A**（`answer`/`choose`/`cancel`/`approve`/`reject`/`audit`/`hover`/`reanchor`）**逐条保留原行为**（卡族协议，从不携带 `data-op`）。
2. **集 B** 的 7 个分支**全部删除**，改为**单次调用** `dispatchChipAction(action, value)`（1 次查表 + 1 个调用点）。
3. 删除 `:275` 的「将在 v4-3 / v4-4 落地」兜底（**语义由 loud 化的 `runOp` unknown-op 承担**）。
4. `dispatchOp` 接线位导出（供 settings 面 `145`/`146` 与 chip 点击 `166` 复用）。
5. 反证：① 保留任一集 B per-op 分支 ⇒ `114` FAIL；② 以 `data-act` 分发 ⇒ FAIL。

**产出**: `sidepanel.ts`（两集改造后的终态分发器）。

**验收标准（可机核）**:
- [ ] `handleCardAction` 中集 A **8 项**行为逐条保留（既有断言不改仍绿）
- [ ] 集 B per-op 分支数 == **0**（源文本 + AST 双判据）
- [ ] `dispatchChipAction` 在 `handleCardAction` 中**恰 1 调用点**
- [ ] 源文本 `data-act` **零分发读取**（`getAttribute('data-act')` 零命中）
- [ ] 兜底「将在 v4-3 / v4-4 落地」字面**零残留**

**红线检查点**: 冻界面 `F1` / `F2` / `F3`；阈值面 `T-e`（集 B 判据重锚为 opId 集）；契约面 `C-4` / `C-7`；台账面 `L-a`（登记 `sidepanel.ts` 改写区间）。

**验证命令**:
```bash
npm run typecheck --workspace @lgdl/web-cli-plugin
node -e "const s=require('fs').readFileSync('packages/web-cli-plugin/src/ui/sidepanel/sidepanel.ts','utf8');if(/将在 v4-3/.test(s))throw new Error('legacy fallback residual');if(/getAttribute\('data-act'\)/.test(s))throw new Error('data-act dispatch residual');console.log('handleCardAction: two-set ok')"
npm test --workspace @lgdl/web-cli-plugin -- sidepanel 2>&1 | tee /tmp/opencode/v5-gate-logs/w3-handlecardaction.log
```

---

### TASK-V5-114（V51-14）: `test/next-dispatch-diff0.test.ts` —— 零 per-op 分支 + 四操作哈希不变
| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-V5-113 |
| **执行波次** | 3（区间 C） |
| **对应 FR / AC** | FR-ALLN-058 · **AC-ALLN-005** · N22 |
| **ADR / 风险** | ADR-V5-001 · R-ALLN-901 · R-V5-103 |
| **并行度** | W3 串行 |

**输入**: `AC-ALLN-005`（注册 / 卸载 / 覆盖 / 重复 id **四种操作**下分发器文件哈希不变）；`FR-ALLN-058`（分支数 = 0）。

**动作**:
1. 新建 `test/next-dispatch-diff0.test.ts`：① 分发器源码抽取判据（集 B 分支数 == 0）；② **四操作哈希不变**：注册 / `unregister` / `{overwrite:true}` / 重复 id 拒绝 四路径执行前后，`sidepanel.ts` + `dispatch.ts` 内容哈希**逐字节不变**。
2. 「集 B action 字符串只出现于 `ACT_TO_OP` 数据模块」静态扫描（`expectFailPattern` 声明）。
3. 反证 ≥3 条：① 加 per-op 分支；② 把某 action 字符串复制到 `sidepanel.ts`；③ 让分发器读 `data-act`；逐条 FAIL ⇒ 还原 PASS。
4. `test/gate-integrity.test.ts`：`EXPECTED_AUDITED_FILES` **追加**本门禁路径（只追加）。

**产出**: `test/next-dispatch-diff0.test.ts` + `gate-integrity` 受审追加 + 反证留证。

**验收标准（可机核）**:
- [ ] 集 B 分支数 == 0（源文本 + AST）
- [ ] 四操作下分发器文件哈希**逐字节不变**（4 组读数）
- [ ] 3 条反证逐条实跑：注入 ⇒ FAIL（`expectFailPattern` 记载）→ 逐字节还原 ⇒ PASS
- [ ] `EXPECTED_AUDITED_FILES` ⊇ 本门禁且原集合为子集

**红线检查点**: 冻界面 `F1` / `F3`；阈值面 `T-e`（**不得放宽**）；契约面 `C-4`；台账面 `L-a`（只读）。

**验证命令**:
```bash
npm test --workspace @lgdl/web-cli-plugin -- next-dispatch-diff0 2>&1 | tee /tmp/opencode/v5-gate-logs/w3-diff0.log
npm run test:gate-integrity --workspace @lgdl/web-cli-plugin 2>&1 | tee /tmp/opencode/v5-gate-logs/w3-gate-integrity-prep.log   # 串行
```

---

### TASK-V5-115（V51-15）: **X3 门禁等价重锚**（`recommendation-sources` / `local-act-wiring` / `recommendation.mjs` 59）+ 反证留证
| 属性 | 值 |
|------|-----|
| **复杂度** | L |
| **前置依赖** | TASK-V5-114 |
| **执行波次** | 3（区间 C 末位） |
| **对应 FR / AC** | FR-ALLN-112（X3）/ 120 / 121 · AC-ALLN-009 / 019 |
| **ADR / 风险** | ADR-V5-001 / 012 · **R-ALLN-004** · R-ALLN-013 |
| **并行度** | W3 末位（`114` 后；W4 前置） |

**输入**: `spec §12 X3`（等价重写形态 ①~④）；现状 `test/recommendation-sources.test.ts:281` / `test/local-act-wiring.test.ts:269`（**逐字钉死** 6 项闭集）；`test/ui/recommendation.mjs`（59）。

**动作**（**逐点判定，禁按名批量替换**）:
1. `recommendation-sources.test.ts`：旧「闭集 6 项」判据 → **「注册表 opId 集（9 项）」**判据（**判据力上升**：新增 op 自动纳入）；**源白名单 7 项语义保留**（注册表候选仍只读既定 state 字段）。
2. `local-act-wiring.test.ts`：本地 act 槽 → **本地 op 槽**（`op.pick` / `op.describe` / `op.rebind` / `op.help` / `op.authorize`）+ 零 `requestTurn`（除 `op.turn`）+ 不受 `pending` 门控。
3. `test/ui/recommendation.mjs`（59）：opId 化等价重锚 + **增**断言（不减少）；数据双采集（旧 act 视角 + 新 opId 视角一致）。
4. `test/ref-pick-wiring.test.ts`（11）：单一入口判据按 op 逐条保留（`147` 完成后对账）。
5. **每处改写同步登记 `modifiedRanges[]`**（`{file, lines, oldId, decision:'equivalent-rewrite', reason, leaf}`）。
6. 反证：注入「注册表多一个 op 而未更新门禁」⇒ FAIL ∧ 注入「删一条源白名单项」⇒ FAIL。

**产出**: 3 门禁改写 + 逐处引用计数对账表 + `modifiedRanges[]` 条目 + 反证留证。

**验收标准（可机核）**:
- [ ] 三处门禁计数 **≥ 基线**（`recommendation ≥59`；`node` 侧计数不减）
- [ ] 旧断言的**语义**逐条有对应新断言（映射表可核，**无「不再 FAIL 的判据」**）
- [ ] `NEXTSTEP_SOURCE_WHITELIST.length === 7`（零扩项）
- [ ] 反证 ≥2 条实跑（注入 ⇒ FAIL → 还原 PASS）
- [ ] `modifiedRanges[]` 每处改写有 `oldId` / `reason ≥ 40` / `leaf:'v5-1'`

**红线检查点**: 冻界面 `F1` / `F3` / `F4`；阈值面 `T-d`（7 源零扩项）/ `T-e`（等价重锚，**只升不降**）；契约面 `C-4` / `C-5`；台账面 `L-a`（`modifiedRanges[]` 登记）。

**验证命令**:
```bash
npm run test:recommendation --workspace @lgdl/web-cli-plugin 2>&1 | tee /tmp/opencode/v5-gate-logs/w3-recommendation.log
npm test --workspace @lgdl/web-cli-plugin -- local-act-wiring 2>&1 | tee /tmp/opencode/v5-gate-logs/w3-local-act-wiring.log
npm run test:ref-pick-wiring --workspace @lgdl/web-cli-plugin 2>&1 | tee /tmp/opencode/v5-gate-logs/w3-ref-pick-wiring.log   # 串行：一次一个 Chromium
```

---

### TASK-V5-116（V51-16）: `obligation-table.ts` —— 9 行四要素 + 表尾**明示契约义务**
| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-V5-105（9 opId 集） |
| **执行波次** | 4（区间 D） |
| **对应 FR / AC** | FR-ALLN-036（R7）· AC-ALLN-004 / 007 |
| **ADR / 风险** | ADR-V5-001（R7）· R-ALLN-901 |
| **并行度** | 与 `118` 并行（文件不相交） |

**输入**: `ADR-V5-001 R7`（四要素：功能名 / 触发 provider / 挂载点·模式 / 失败语义；**9 个 op 各一行**；表尾登记明示契约义务）；`ADR-V5-011 §3` 减体积优先级 3（op 描述与义务表**共用同一常量对象**）。

**动作**:
1. 新建 `next-registry/obligation-table.ts`：9 行 × 四要素（`{opId, functionalName, providerId, mountPoint+mode, failSemantics}`）。
2. 表尾**明示契约义务**字面：「新增 provider 只改注册表条目，`handleCardAction` 分发器 diff = 0」。
3. op 描述与义务表**共用同一常量对象**（避免两份字符串 ⇒ 体积）。
4. 未映射四要素的 op **不允许进注册表**（校验钩子）。

**产出**: `obligation-table.ts`（9 行 + 表尾义务）。

**验收标准（可机核）**:
- [ ] 行数 == **9** ∧ `opId` 集 == 注册表 `opId` 集
- [ ] 四要素逐项**非空**（每行 4 字段均非空字符串）
- [ ] 表尾明示义务字面存在（包含 `diff = 0` 语义）
- [ ] 与 `ops.ts` 描述**共用同一常量对象**（零重复字面量：源文本同一对象引用）

**红线检查点**: 冻界面 `F1` / `F3`；阈值面 `T-d`；契约面 `C-6`（一致性）；台账面 `L-a`（只读）。

**验证命令**:
```bash
npm run typecheck --workspace @lgdl/web-cli-plugin
node -e "const s=require('fs').readFileSync('packages/web-cli-plugin/src/ui/sidepanel/next-registry/obligation-table.ts','utf8');if(!/diff = 0/.test(s))throw new Error('obligation tail missing');console.log('obligation-table: 9 rows + tail ok')"
```

---

### TASK-V5-117（V51-17）: `test/next-obligation-table.test.ts` —— 一致性 + 三类注入反证 + 受审追加
| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-V5-116 |
| **执行波次** | 4（区间 D） |
| **对应 FR / AC** | FR-ALLN-037 / 036 · **AC-ALLN-005** |
| **ADR / 风险** | ADR-V5-001（R7 静态机核）· **R-ALLN-901** |
| **并行度** | W4 串行 |

**输入**: `FR-ALLN-037`（行数相等 / `opId` 集相等 / 四要素逐项非空 / **chips 无悬空**）；三类注入反证（义务表多一行 / 注册表多一个 op / chips 悬空）。

**动作**:
1. 新建 `test/next-obligation-table.test.ts`：四项一致性判据 + 每条 `expectFailPattern`。
2. 三类注入反证：① 义务表**多一行** ⇒ FAIL；② 注册表**多一个 op** ⇒ FAIL；③ 某 chip 指向不存在的 `opId`（**悬空**）⇒ FAIL；逐条逐字节还原 ⇒ PASS。
3. `test/gate-integrity.test.ts`：追加本门禁路径（只追加）。
4. 与 `106` 的混池结论联动：F/G 门禁亦纳入受审集合（`119` 落地）。

**产出**: `test/next-obligation-table.test.ts` + 三类反证留证 + `gate-integrity` 受审追加。

**验收标准（可机核）**:
- [ ] 四项一致性判据全绿；每项可 FAIL（`expectFailPattern` 记载）
- [ ] 三类反证逐条实跑：注入 ⇒ FAIL → 逐字节 sha256 还原 ⇒ PASS
- [ ] `EXPECTED_AUDITED_FILES` ⊇ 本门禁（只追加）

**红线检查点**: 冻界面 `F1` / `F3`；阈值面 `T-d`；契约面 `C-6`；台账面 `L-a`（只读）。

**验证命令**:
```bash
npm test --workspace @lgdl/web-cli-plugin -- next-obligation-table 2>&1 | tee /tmp/opencode/v5-gate-logs/w4-obligation-table.log
```

---

### TASK-V5-118（V51-18）: `design-contract.test.ts` —— F 逐字保留 + G 4 常量 + `G_ASSERTION_MAP` 127 行（X4）
| 属性 | 值 |
|------|-----|
| **复杂度** | L |
| **前置依赖** | TASK-V5-106（**SG-1 结论**） |
| **执行波次** | 4（区间 D） |
| **对应 FR / AC** | FR-ALLN-100 / 101（X4）· **AC-ALLN-016** · N21 |
| **ADR / 风险** | ADR-V5-008 · **R-ALLN-909**（混池）/ R-ALLN-005 · R-V5-107 |
| **并行度** | 与 `116` / `117` 并行（文件不相交） |
| **闸门依赖** | **`106` 结论 = `report-to-orchestrator` ⇒ 本任务暂停上报** |

**输入**: `ADR-V5-008 §决策`（F 部分**逐字不动**：`SHIM_SHA256 = '8ca5db6f…'` / `DRAFT_SHA256 = '49ce27fc…'` / `SHIM_CHECK_CALLS = 60` / `SHIM_CHECK_DECLARATIONS = 1` / `ASSERTION_MAP` 60 行；G 部分`G_SHIM_SHA256 = 'd0107ecb…'` / `G_DRAFT_SHA256 = 'a7c0a77a…'` / `G_SHIM_CHECK_CALLS = 127` / `G_ASSERTION_MAP` 127 行 A1~N17）。

**动作**:
1. **F 部分零改**：4 常量 + 60 行 `ASSERTION_MAP` + 6 个 `test(...)` 名**逐字保留**（可改为调用共享 helper，但**不改 F 常量 / 断言名**）。
2. 新增 `G_*` 4 常量 + `G_ASSERTION_MAP`（**127 行**，`clause` / `owner` **逐条非空**，覆盖 A~N 十四组）。
3. `G_ASSERTION_MAP` 的 id 序列必须 == 从 `option-g-shim.mjs` 实测抽取的序列（`^check\('([A-Z]\d+)\s`）。
4. 抽 `assertDraftContract({name, shim, draft, shimSha, draftSha, calls, decl, map, groups})` **共享 helper**：F 与 G **各调用一次**（**两侧独立计数**）。
5. **混池防御**：因 F/G id 集**非空交集**（`106` 结论）⇒ 判据 = 两侧**各自独立计数 + 各自 test 块**（禁止「F 绿或 G 绿则绿」）；注入「G shim 改 1 byte」⇒ **必 FAIL**。
6. G 稿 / shim **零改动**（只读）。

**产出**: `test/design-contract.test.ts`（F 保留 + G 新增）+ 共享 helper。

**验收标准（可机核）**:
- [ ] F 4 常量 + 60 行映射 + 6 个 test 名**逐字不变**（与基线字面比对）
- [ ] `G_ASSERTION_MAP.length === 127` ∧ id 序列 == 实测抽取序列 ∧ `clause` / `owner` 逐行非空 ∧ 分组 == 14
- [ ] F / G **各自独立计数**（无共享计数池）；注入「F 失效」⇒ FAIL ∧ 注入「G 失效」⇒ **亦** FAIL
- [ ] `test:design-contract` 计数 **6 → ≥13**（只增）
- [ ] `git diff --quiet -- packages/web-cli-plugin/design` 通过（G 稿零改动）
- [ ] 反证：「G shim 改 1 byte」⇒ FAIL（逐字节还原 ⇒ PASS）

**红线检查点**: 冻界面 `F1`（**G 稿 / shim 四 sha 零触碰**）；阈值面 `T-c`；契约面 `C-5`（**禁止混池**）；台账面 `L-a`（只读；`119` 登记）。

**验证命令**:
```bash
npm run typecheck --workspace @lgdl/web-cli-plugin
npm run test:design-contract --workspace @lgdl/web-cli-plugin 2>&1 | tee /tmp/opencode/v5-gate-logs/w4-design-contract.log
git diff --quiet -- packages/web-cli-plugin/design && echo 'design/ zero-diff ok'
```

---

### TASK-V5-119（V51-19）: G 侧 test 块（实跑 / sha / 计数 / 映射 / 卡分类 / 混池防御）+ `designContractChanges` 台账
| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-V5-118 |
| **执行波次** | 4（区间 D 末位） |
| **对应 FR / AC** | FR-ALLN-101 / 102 / 103 · **AC-ALLN-016 / 017** |
| **ADR / 风险** | ADR-V5-008 · R-ALLN-909 · R-V5-107 |
| **并行度** | W4 末位 |

**输入**: `ADR-V5-008 §决策` 新 test 表（6 项：G shim 实跑 / G shim sha / G 稿 sha / G 计数口径 / G 映射表 / G 卡分类学 + **混池防御**）；`docs/v4-supersession-ledger.json#designContract.designContractChanges = []`。

**动作**:
1. 6 个 G 侧 test 块：① `node option-g-shim.mjs` 退出码 0 ∧ 含 `127 passed` / `0 failed`；② `G_SHIM_SHA256` 逐字节；③ `G_DRAFT_SHA256` 逐字节；④ `G_SHIM_CHECK_DECLARATIONS === 1` ∧ `G_SHIM_CHECK_CALLS === 127` ∧ `check(` 子串 == 128；⑤ `G_ASSERTION_MAP` 127 行 + id 集相等 + 覆盖 14 组；⑥ G `CARD_TYPES` == 7 主类（顺序敏感）+ G 稿每类有 `data-msg-type=` 样例。
2. **混池防御**独立 test 块（两侧独立计数 + 交集断言方案）。
3. 台账登记：`designContractChanges`：`[] → [{object, before:null, after:{draftSha, shimSha, assertions:127, groups:14}, date:'2026-09-22', reason:'X4 / FR-ALLN-101~102：G 稿入 design-contract，与 F 并存不替换'}]`。
4. `test/gate-integrity.test.ts`：`test:design-contract` 与 F/G 双侧纳入受审（只追加）。
5. 反证：`designContractChanges` 五要素缺一 ⇒ FAIL。

**产出**: 6 个 G 侧 test 块 + 混池防御块 + `designContractChanges` 条目 + `gate-integrity` 受审追加。

**验收标准（可机核）**:
- [ ] 6 个 test 块逐条绿；G 实跑 `127 passed / 0 failed`
- [ ] `designContractChanges.length === 1` ∧ 五要素齐备（对象 / 前后 sha / 断言数 / 日期 / 理由）
- [ ] 混池防御块：F / G **独立计数** ∧ 交集断言记载
- [ ] `test:design-contract` ≥13；`test:supersession ≥35`（登记完整性）
- [ ] 反证：五要素缺一 ⇒ FAIL

**红线检查点**: 冻界面 `F1` / `F4`；阈值面 `T-c`；契约面 `C-5`；台账面 `L-a`（`designContractChanges` 登记）。

**验证命令**:
```bash
npm run test:design-contract --workspace @lgdl/web-cli-plugin 2>&1 | tee /tmp/opencode/v5-gate-logs/w4-design-contract-g.log
npm run test:supersession --workspace @lgdl/web-cli-plugin 2>&1 | tee /tmp/opencode/v5-gate-logs/w4-supersession-x4.log   # 串行
```

---

### TASK-V5-120（V51-20）: `BLOCKED_TERMINALS` 单源 + `site.unauthorized` 常驻候选（**去 `firstRun`**）+ 「声明恰一次」扫描
| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-V5-105（providers）/ `117` |
| **执行波次** | 5（区间 E） |
| **对应 FR / AC** | FR-ALLN-010 / 011 / 013 · AC-ALLN-002（机制基础） |
| **ADR / 风险** | ADR-V5-001 / 009 · **R-ALLN-006**（R1 根因） |
| **并行度** | W5 首位（`121` / `122` 依赖） |

**输入**: `ADR-V5-009 §1`（`BLOCKED_TERMINALS` 恰 5 项 + 「声明恰一次」扫描 + 每个阻塞类 ↔ 一个 P0 恢复 provider）；现状 `recommend.ts:296-307`（`firstRun` 依赖）。

**动作**:
1. `BLOCKED_TERMINALS` 的**字面量唯一性**扫描：`src/**` 中 5 字符串字面量只允许出现在 `definition.ts`（其余必须派生）。
2. `site.unauthorized` provider 的 `when(ctx)` **去除 `firstRun` 依赖**（凡 `site.active ∧ !authorized` 即 true）；chips 含 `op.authorize`。
3. 5 类阻塞 ↔ 5 个 P0 provider **双射**断言。
4. 反证：① 在别处写第二个 `BLOCKED_TERMINALS` 字面量 ⇒ FAIL；② 注入 `firstRun=false` 仍须产出候选（否则 FAIL）。

**产出**: `providers.ts`（去 `firstRun`）+ `definition.ts`（单源）+ 双射断言 + 反证留证。

**验收标准（可机核）**:
- [ ] 5 字符串字面量在 `src/**` 中**只出现在 `definition.ts`**（「声明恰一次」）
- [ ] 非首装未授权会话（`firstRun === false` ∧ `site.active` ∧ `!authorized`）⇒ `site.unauthorized` provider `when(ctx) === true` ∧ chips 含 `op.authorize`
- [ ] 阻塞类 ↔ P0 provider **双射**（5 ↔ 5）
- [ ] 反证两条实跑 ⇒ FAIL → 还原 PASS

**红线检查点**: 冻界面 `F1` / `F2` / `F3`；阈值面 `T-d`（源白名单 7 项）；契约面 `C-3`（单源）/ `C-6`；台账面 `L-a`（登记 R1 根因修正条目）。

**验证命令**:
```bash
npm run typecheck --workspace @lgdl/web-cli-plugin
node -e "const fs=require('fs');const p='packages/web-cli-plugin/src/ui/sidepanel/';const bad=[];for(const f of fs.readdirSync(p+'')){};console.log('manual: grep -rn site.unauthorized src/ui/sidepanel | wc -l')"
npm test --workspace @lgdl/web-cli-plugin -- blocked-terminals 2>&1 | tee /tmp/opencode/v5-gate-logs/w5-blocked-terminals.log
```

---

### TASK-V5-121（V51-21）: 体积五要素（本叶增量）+ metafile 逐模块归因 + 红线逐字节复核
| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-V5-120 |
| **执行波次** | 5（区间 E） |
| **对应 FR / AC** | FR-ALLN-130 / 131 / 133 · AC-ALLN-022 / 023 |
| **ADR / 风险** | ADR-V5-011 · **R-ALLN-001** / R-ALLN-910 |
| **并行度** | W5 串行中段（`122` 前置） |

**输入**: `ADR-V5-011 §1`（本叶逐项 **8,400 B** + 胶水 400 = 8,800 B）；`ADR-V5-011 §2` 越限分级预案；基线 498,521 B / 上限 523,447 B / 余量 24,926 B。

**动作**:
1. `npm run build` ⇒ `stat -c %s dist/sidepanel.js`；metafile **逐模块 Δ 归因**（`Σ 逐模块 Δ + 未归因 == 登记增量`）。
2. `test/size-baseline.ts` **五要素重登记**（`previousBaselineBytes` → `newBaselineBytes` / 日期 / 来源 / 理由）+ `_TIMELINE` **只追加** + `SIDEPANEL_GROWTH_BREAKDOWN` 本叶条目 + `SIDEPANEL_RE_REGISTRATIONS`。
3. 红线逐字节：`content.js == 177,076 B` ∧ sha `52a82620…`；`pick-layer.js == 33,900 B` ∧ sha `5f567d7e…`；`src/content/**` 零 diff。
4. 越限判断：若 Δ > 24,926 B ⇒ 按 `ADR-V5-011 §2` 分级处置（**禁静默放宽**）；若 > 563,200 ⇒ **停机上报**。
5. **禁止**：`SIDEPANEL_CEILING_CAP` 保持 `record-only`；档位 512,000 **不下移**；`authorConfirmation.status` 保持 `pending-author-line`。

**产出**: 体积五要素登记（本叶）+ metafile 归因表 + 红线逐字节复核记录。

**验收标准（可机核）**:
- [ ] 五要素齐备（前后值 / 日期 / 来源 / 理由）+ `_TIMELINE` 只追加（历史项零改）
- [ ] `Σ 逐模块 Δ + 未归因 == 登记增量`（算术可复算）
- [ ] `content.js` 177,076 B / `52a82620…` ∧ `pick-layer.js` 33,900 B / `5f567d7e…` 逐字节命中
- [ ] `SIDEPANEL_CEILING_CAP === 'record-only'` ∧ `authorConfirmation.status === 'pending-author-line'` ∧ 档位 512,000 未变
- [ ] 越限若发生：分级处置条目存在（不得静默）

**红线检查点**: 冻界面 `F2`（红线逐字节）/ `F4` / `F5`；阈值面 `T-c`（上限公式 / cap / 档位 / 绝对上限）；台账面 `L-c`（五要素 + `_TIMELINE` + `_HISTORY`）；契约面 `C-1`–`C-7`（本任务只读复核，零触碰）。

**验证命令**:
```bash
npm run build --workspace @lgdl/web-cli-plugin
stat -c %s packages/web-cli-plugin/dist/content.js packages/web-cli-plugin/dist/pick-layer.js packages/web-cli-plugin/dist/sidepanel.js
git diff --stat -- packages/web-cli-plugin/src/content   # 必须零行
npm run test:size-budget --workspace @lgdl/web-cli-plugin 2>&1 | tee /tmp/opencode/v5-gate-logs/w5-size-budget.log
```

---

### TASK-V5-122（V51-22）: 本叶收尾 —— 全门禁串行 + 计数只增对账 + 反证留证 + `TREE` / `state` 更新
| 属性 | 值 |
|------|-----|
| **复杂度** | L |
| **前置依赖** | TASK-V5-121 |
| **执行波次** | 5（区间 E 末位） |
| **对应 FR / AC** | FR-ALLN-003 / 004 / 120 / 121 / 124 / 125 · **AC-ALLN-019 / 020 / 021 / 025** |
| **ADR / 风险** | ADR-V5-012 · R-ALLN-013 / 015 · R-V5-110 |
| **并行度** | W5 末位（本叶**收口**，不可并行） |

**输入**: 父 `tasks.md §6` 门禁守恒总表（24 门禁）+ 本节全部前置任务的产物。

**动作**:
1. **全门禁串行复跑**（`test` / `test:ui` / `test:binding` **绝不并发**；一次一个 Chromium；`finally` 自清 profile）；日志 `tee` 全量落盘（禁截断）。
2. 计数只增对账：逐门禁「基线 → 本叶实测」；`npm test ≥1045`；任一门禁 < 基线（除保护段显式取代且留痕）⇒ **停机**。
3. 反证留证完整性：每条被改动 / 新增判据有「注入 FAIL → 逐字节还原 PASS」两段证据；**无「不再 FAIL 的判据」** （父 §16 纪律 6）。
4. `KL-N-10` / `test:ui #54g` 处置：首轮异常**隔离复跑 ≥2**、日志全量、仍红**如实登记不阻塞**。
5. 零宿主复核：`REGISTERED_STRUCTURAL_HOSTS === []` ∧ 任意深度零 `[data-host]`（`C-7`）。
6. `state.json`（本叶）→ `phase: 'tasked'`；`TREE.md` 由 `sddu-tree` 定向更新；**人工面清单**（本叶无新产品人工面 ⇒ 显式记 `N/A`，不得冒充 PASS）。
7. `git add` **path-limited**（禁 `git add -A`）。

**产出**: 本叶全门禁串行日志 + 计数只增对账表 + 反证留证清单 + `state.json` / `TREE.md` 更新。

**验收标准（可机核）**:
- [ ] 全门禁串行复跑**全绿**（日志全量落盘，无截断）
- [ ] 逐项计数 **≥ 基线**（`npm test ≥1045` / `l1 ≥116` / `l2 ≥74` / `hardening ≥24` / `l1-reverse ≥9` / `l2-reverse ≥10` / `design-contract ≥13` / `supersession ≥35` / `gate-integrity ≥13` / `recommendation ≥59` / `ref-pick-wiring ≥11`）
- [ ] 无断言删除 / 降级（保护段显式取代除外 ⇒ 本叶**无**保护段取代）
- [ ] 反证留证齐备（逐条两段证据存在）
- [ ] `git status --short` 仅含本 Feature 目录（`src` 改动属预期实施面）

**红线检查点**: 冻界面 `F1`–`F5`（逐项）；阈值面 `T-a`–`T-e`（逐项）；台账面 `L-a`–`L-c`；契约面 `C-1`–`C-7`。

**验证命令**:
```bash
mkdir -p /tmp/opencode/v5-gate-logs
npm test --workspace @lgdl/web-cli-plugin 2>&1 | tee /tmp/opencode/v5-gate-logs/w5-v51-node-all.log
npm run test:ui --workspace @lgdl/web-cli-plugin 2>&1 | tee /tmp/opencode/v5-gate-logs/w5-v51-ui-all.log      # 串行
npm run test:binding --workspace @lgdl/web-cli-plugin 2>&1 | tee /tmp/opencode/v5-gate-logs/w5-v51-binding.log  # 串行
git status --short
```

---

## 3. 任务汇总

| 统计项 | 数值 |
|--------|:--:|
| 总任务数 | **22** |
| S 级（简单） | 2（`106` / `112`） |
| M 级（中等） | 15（`101`–`104` / `107`–`111` / `114` / `116` / `117` / `119` / `120` / `121`） |
| L 级（复杂） | 5（`105` / `113` / `115` / `118` / `122`） |
| 执行波次 | **5** |
| spikeGate | **1**（`106`，SG-1） |
| 提交区间 | 5（A / B / C / D / E） |
| 体积预算（本叶） | 逐项 8,400 B + 胶水 400 = **8,800 B**（父 `tasks.md §4.1`） |
| 新增门禁 | 4（`next-registry` / `next-dispatch-diff0` / `next-obligation-table` + `design-contract` G 侧） |

## 4. 执行策略

| 波次 | 任务 | 策略 |
|:--:|------|------|
| 1 | `101`–`106` | **并行**（文件不相交）；`106` 为只读探针（不落版本库）；区间 A |
| 2 | `107`–`110` | **串行**（同 `pipeline.ts`，函数体递进）；区间 B |
| 3 | `111`–`115` | **半并行**：`111 ∥ 112`；`113 → 114 → 115` 串行（终态分发器与重锚**必须同区间**）；区间 C |
| 4 | `116`–`119` | **半并行**：`116 ∥ 118`；`117`（依赖 `116`）/ `119`（依赖 `118` + `106`）；区间 D |
| 5 | `120`–`122` | **串行**（`120 → 121 → 122`）；区间 E |

**波内门禁纪律**：`test` / `test:ui` / `test:binding` **绝不并发**；日志落 `/tmp/opencode/v5-gate-logs/`。

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建（V5-1 首叶 22 原子任务 / 5 波 / 5 提交区间：W1 `definition.ts` + `registry.ts` 三件套 + `providers.ts` 4 规则等价迁移 + **spikeGate-1**（G shim 127 抽取 + 混池防御：发现 F/G id 集**非空交集** ⇒ 防御改用「独立计数 + 共享 helper」）→ W2 `runOp` 四态 + `pendingOps` 仲裁 + 快照回滚语义位 + R5 三级 → W3 `ACT_TO_OP`(6) + chip `data-op` + `handleCardAction` 两集改造 + diff=0 门禁 + X3 三处门禁等价重锚 → W4 义务表 9 行 + 一致性机核 + 双契约（F 60 逐字保留 + G 127 新增）+ `designContractChanges` 登记 → W5 `BLOCKED_TERMINALS` 单源 + `site.unauthorized` 去 `firstRun` + 体积五要素 + 收尾全门禁。**本轮只做 tasks**：零 `src`/`test`/`dist`/`docs`/`design`/ROADMAP 改动；未跑门禁 / 构建 / Chromium。 | 2026-09-22 | SDDU Tasks Agent |
