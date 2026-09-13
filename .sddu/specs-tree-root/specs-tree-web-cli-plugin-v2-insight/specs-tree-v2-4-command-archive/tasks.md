# 任务分解：specs-tree-v2-4-command-archive（V2-4 命令档案浏览器）

> **文档定位**: SDDU 任务清单（**叶子子 Feature**，P1，v2 最后一个子 Feature；**纯只读展示面**）— 将技术方案分解为可并行执行的原子任务，作为 build 阶段的输入
> **前置依赖**: V2-4 `plan.md` v1.0（ADR-V2-016~023 + §3 设计决策 + §6 文件影响 + §9 交付门槛 A1~A9 / `#I-19a…` / V2-H-7~9）+ 父 `plan.md` v1.0（ADR-V2-001~015，尤其 ADR-V2-007 体积守卫 / ADR-V2-010 parity 同源 / ADR-V2-012 扩展位 / ADR-V2-011 `deny` 不可关 / ADR-V2-015 来源约束）+ V2-4 `spec.md` v1.0（FR-V2-050~056 / NFR-V24-001~005 / EC-V24-001~005 / AC-V24-001~007）+ **P0 产出**（V2-1 `ConnectTreeSnapshot` / V2-2 抽屉 / V2-3 动作面，均 `validated`）
> **创建人**: SDDU Tasks Agent
> **创建时间**: 2026-09-13
> **版本**: v1.0
> **更新人**: SDDU Tasks Agent
> **更新时间**: 2026-09-13
> **更新说明**: 初始创建。V2-4 plan §2~§3（档案子视图 / 三层口径 / `deny` 分层 / `delay` 单源 / 只读过滤 / 体积守卫 / 结构安全证据 / 门禁挂载 / parity 同源）→ 整合为 **10 个原子任务 / 4 个执行波次**（跨叶子 Wave 14~17）。门禁矩阵：**新 node 门禁** `test/insight-archive.test.ts`（A1/A2/A4~A9 主体 + **A3 `deny` 分层全量交叉**独立成任务；每条配反证）+ **追加** `test/ui/insight.mjs` `#I-19a…h`（复用单 Chromium 会话）+ **重登记** `test/size-baseline.ts` + 追加 `test/size-budget.test.ts`。**零模型改动**，唯一 additive 运行时注入 = `service-worker` 1 行 `catalogMeta`（ADR-V2-023）。**断言只增不减**：新门禁落新文件，既有 `test:insight` 52 断言零删改。

---

## 0. 跨叶子定位与执行序（本文件 = V2-4，v2 最后一叶）

| 叶子 | 文件 | 跨叶子执行序 | 依赖 |
|------|------|:--:|------|
| V2-1 连接树数据模型与状态投影 | `specs-tree-v2-1-connect-tree-model/tasks.md` | Wave 1~5（先行，`validated`） | — |
| V2-2 悬浮连接树 UI 与交互 | `specs-tree-v2-2-floating-tree-ui/tasks.md` | Wave 6~9（`validated`） | V2-1 |
| V2-3 撤销与取消授权操作面 | `specs-tree-v2-3-revoke-ops/tasks.md` | Wave 10~13（`validated`） | V2-1 / V2-2 |
| **V2-4 命令档案浏览器**（本文件） | `specs-tree-v2-4-command-archive/tasks.md` | **Wave 14~17** | V2-1（快照/命令档案字段）+ V2-2（`tree-drawer.ts`，本叶子对其 MODIFY） |

**门禁串行纪律（NFR-V2-009）**：`npm run build` → `npm test` → `npm run test:ui` → `npm run test:insight` → `npm run test:hardening` → `npm run test:binding` → `npm run test:e2e`，**逐条串行、绝不并发**（本仓库 OOM 前科）。**V2-4 不新增第二个 Chromium 门禁**（`#I-19a…` 追加到既有 `insight.mjs` 单会话）。

**红线（横切，结构保证）**：档案 = **只读展示面**，**零模型改动**（不碰 `tree-model.ts` / `tree-view.ts` / `tree-ops.ts` / `TreeFilter` / `packages/web-cli-base/**`）；`deny`/`delay` **fail-closed 不可放宽**、**无命令级覆盖**、**不新增写路径**；`content.js` **零增长**；**无新依赖**。

---

## 1. 依赖拓扑总览

> 红线贯穿：**不改** `src/insight/tree-model.ts`、`src/ui/tree/tree-view.ts`、`src/ui/tree/tree-ops.ts`、`src/ui/tree/tree-receipt.ts`、`src/security/**`、`src/content/**`、`manifest.json`、`test/parity/**`、`packages/web-cli-base/**`、v1 SDDU 目录；**不在 `src/ui/tree/` 新增文件**（避开 `insight-no-escalation.test.ts#treeSources()` 精确文件名列表断言）；渲染模型并入 `src/insight/`。

### 1.1 任务总览表

| 编号 | 模块/落点 | 类型 | 复杂度 | 依赖 | 执行波次 | 可并行 | 一句话目标 |
|------|----------|:--:|:--:|------|:--:|:--:|------|
| TASK-001 | `src/insight/catalog-meta.ts`（NEW）+ `src/background/service-worker.ts`（MODIFY） | 🛠 | S | 无 | Wave 14 | ∥ 002 | parity 同源锚点常量（34/142 + provenance）+ `buildInsightSnapshot` **1 行** `catalogMeta` 注入（唯一 additive 运行时面） |
| TASK-002 | `src/insight/archive-catalog.ts`（NEW） | 🛠 | L | 无（消费 P0 快照） | Wave 14 | ∥ 001 | 档案纯模型：渲染模型（无控件字段）+ **三层口径**（L1 34/142 · L2 20/88 · L3 28/94=122，`accounted` 100%）+ `deny` 分层（policy 三成因 + `autoAuthHardLine` 派生只读）+ `ArchiveFilter` 只读过滤 |
| TASK-003 | `src/ui/tree/tree-drawer.ts`（MODIFY） | 🛠 | M | 002 | Wave 15 | ∥ 004 | 抽屉内**档案子视图**（默认关、`.tree-archive*` 类名隔离、开关/分组/检索接线、复用 `TREE_NO_ESCALATION_NOTE`，**不改 P0 骨架**） |
| TASK-004 | `test/insight-archive.test.ts`（NEW） | ⚖️ | L | 001/002 | Wave 15 | ∥ 003 | node 门禁主体 **A1/A2/A4~A9**（三层口径 + 防夸大 + 无控件 + delay 单源 + 只读过滤 + parity 漂移 + 禁改面哈希 + 体积结构）**每条配反证** |
| TASK-005 | `test/insight-archive.test.ts`（MODIFY 追加） | ⚖️ | M | 004 | Wave 16 | ∥ 006/007 | **A3 `deny` 分层全量交叉断言**（真实 `decideAutoAuthorization` × 全量卡片 + 站点域矩阵 + 分歧钉死 + 反证；T3 教训） |
| TASK-006 | `test/ui/insight.mjs`（MODIFY 追加） | ⚖️ | M | 003 | Wave 16 | ∥ 005/007 | Chromium **`#I-19a…h`**（默认关 / 卡数 / 字段 / delay 单源 / 只读过滤 / 零控件 / 布局不回退；**复用单 Chromium 会话**） |
| TASK-007 | `test/size-baseline.ts` + `test/size-budget.test.ts`（MODIFY） | ⚖️ | M | 002/003（需 build） | Wave 16 | ∥ 005/006 | **sidepanel 显式重登记**（前后值+日期+来源+理由+历史保留 `1,068,165/1,085,389/1,110,744`）+ **content.js 零增长**（`1,073,453` + `src/content/**` 源码内容哈希 pin） |
| TASK-008 | 门禁串行 + 断言只增不减核验（收口） | ⚖️ | M | 004/005/006/007 | Wave 17 | ∥ 009/010 | 逐条**串行**全套门禁 + 零 diff 面清单核验 + v1/P0 断言零删改 + `content.js` 零增长 |
| TASK-009 | `docs/dev.md` + `docs/smoke-checklist.md`（MODIFY） | 📄 | S | 006/007/008 | Wave 17 | ∥ 008 | 文档回填：sidepanel 新基线/ceiling + `test:insight` 断言数 52 → **实测**（新增 `#I-19a…h`）+ 历史保留 |
| TASK-010 | `docs/smoke-checklist.md`（MODIFY 追加） | 📄 | S | 009（同文件串行） | Wave 17 | — | 人工面 **V2-H-7~9**（档案长文案/窄栏拥挤、分组切换观感、绑定站点后卡片增长）→ 标 `⏳ 待人工` |

### 1.2 依赖拓扑（串行主轴 + 并行组）

```
Wave 14（并行组 ①：文件不相交）：
  TASK-001 [S] 🛠 catalog-meta.ts + service-worker 1 行注入
  TASK-002 [L] 🛠 archive-catalog.ts（渲染模型 + 三层口径 + deny 分层 + 只读过滤）

Wave 15（并行组 ②：DOM 挂载 ∥ 门禁主体）：
  TASK-003 [M] 🛠 tree-drawer.ts 档案子视图（消费 002 的 `buildArchiveModel`）
  TASK-004 [L] ⚖️ insight-archive.test.ts 主体（A1/A2/A4~A9；消费 001/002）

Wave 16（并行组 ③：A3 追加 ∥ Chromium 追加 ∥ 体积重登记；需先 build）：
  TASK-005 [M] ⚖️ A3 deny 分层全量交叉（追加 004 文件；消费 002）
  TASK-006 [M] ⚖️ test/ui/insight.mjs 追加 #I-19a…h（消费 003）
  TASK-007 [M] ⚖️ sidepanel 重登记 + content 零增长（消费 002/003 的 build 产物）

Wave 17（收口；⚠️ Chromium 门禁串行 + 009→010 同文件串行）：
  TASK-008 [M] ⚖️ 门禁串行收口 + 只增不减核验
  TASK-009 [S] 📄 文档回填（断言数/体积值）
  TASK-010 [S] 📄 人工面 V2-H-7~9 登记
```

### 1.3 并行分组（执行波次）

```
Wave 14 ─── (并行组 ①)
  TASK-001 [S] 🛠 catalog-meta.ts + service-worker 1 行注入
  TASK-002 [L] 🛠 archive-catalog.ts

Wave 15 ─── (并行组 ②)
  TASK-003 [M] 🛠 tree-drawer.ts 档案子视图
  TASK-004 [L] ⚖️ insight-archive.test.ts 主体

Wave 16 ─── (并行组 ③；⚠️ 体积测量需先 npm run build)
  TASK-005 [M] ⚖️ A3 deny 分层全量交叉
  TASK-006 [M] ⚖️ test:insight 追加 #I-19a…h
  TASK-007 [M] ⚖️ sidepanel 重登记 + content 零增长

Wave 17 ─── (收口；⚠️ 串行)
  TASK-008 [M] ⚖️ 门禁串行收口
  TASK-009 [S] 📄 文档回填
  TASK-010 [S] 📄 人工面 V2-H-7~9（同文件串行，依赖 009）
```

---

## 2. 任务列表

> 缩写：V24 = 本叶子；ADR-V2-NN = 本叶子 `plan.md` §8；FR-V2-NNN / NFR-V2-NNN / AC-V2-NNN = 父 `spec.md`；NFR-V24-NNN / EC-V24-NNN / AC-V24-NNN = 本叶子 `spec.md`。
> **三层口径真值（钉死）**：**L1 对账基线 34 工具 / 142 子命令**（`test/parity/baseline-catalog.json`，provenance `2ddc92299ad10cfe0ea2b65403243a45ce7fb041`）· **L2 豁免登记 20 工具 / 88 子命令**（`waivers.json`：`mapped` 4/39 · `not-applicable` 9/29 · `baseline-disabled` 6/16 · `delegated` 1/4）· **L3 实时投影面 28 条目 / 94 子命令 = 122 档案卡**（P0 T3 fixture；去重 23 工具名，含 5 条抑制合成条目）· **`accounted = carded ∪ waived = 34/142 = 100%`**。
> **`delay` 消歧红线文案（单一措辞源，禁止第二处字面量）**：`delay`（= `deny`，fail-closed，**非可配置档位**；与命令间 `delayMs` 无关）。

### TASK-001: parity 同源锚点常量 + `service-worker` 单行注入

| 属性 | 值 |
|------|-----|
| **复杂度** | S |
| **类型** | 🛠 实施（纯常量 + additive 注入） |
| **前置依赖** | 无 |
| **执行波次** | Wave 14 |
| **可并行** | ∥ TASK-002 |
| **对应 FR** | FR-V2-053（+ NFR-V24-003） |
| **承接 ADR** | ADR-V2-021（parity 同源）、ADR-V2-023（零模型改动 / 唯一 additive 面） |

**描述**: 新建 `src/insight/catalog-meta.ts`：`CATALOG_BASELINE_META: CatalogMeta = { toolCount: 34, subcommandCount: 142, provenanceCommit: '2ddc92299ad10cfe0ea2b65403243a45ce7fb041' }`（**纯常量**、typed by 既有 `CatalogMeta`、无 `node:fs`、无 `chrome.*`、不进 runtime 依赖树）。在 `src/background/service-worker.ts#buildInsightSnapshot` 的 `buildInsightTree({...})` **追加 1 行** `catalogMeta: CATALOG_BASELINE_META`（additive 只读；不改判定链 / 消息语义 / 授权路径；`catalogMeta` 不进快照 hash 输入 → 确定性不受影响）。运行时**不打包** baseline JSON；`catalogMeta` **只描述基线**，不描述渲染卡数（防夸大）。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| NEW | `packages/web-cli-plugin/src/insight/catalog-meta.ts` |
| MODIFY | `packages/web-cli-plugin/src/background/service-worker.ts`（**追加 1 行**；其余零改动） |

**验收标准**:
- [ ] `CATALOG_BASELINE_META` 的 `toolCount`/`subcommandCount`/`provenanceCommit` === `loadBaseline()` 真值；commit 匹配 `/^[0-9a-f]{40}$/`
- [ ] `catalog-meta.ts` **无** `node:fs` / `chrome.` 引用（`insight-no-escalation.test.ts` 的 `insightSources()` glob 自然吸纳新文件且既有断言全绿）
- [ ] `service-worker.ts` 相对 HEAD **仅 +1 行、0 删除**（`git diff --numstat` 新增 1 / 删除 0，且仅该处）
- [ ] 既有 `test/insight-catalog.test.ts` / `test/insight-action-parity.test.ts` **零删改**且全绿
- [ ] `npm run build` + `npm run typecheck` 0 error

**验证命令**:
```bash
cd packages/web-cli-plugin && npm run build && npm run typecheck && npm test
git -C ../.. diff --numstat -- packages/web-cli-plugin/src/background/service-worker.ts   # 期望: 1  0  <path>
! grep -nE "node:fs|chrome\s*\." src/insight/catalog-meta.ts
```

### TASK-002: 档案渲染模型 + 三层口径 + `deny` 分层派生 + 只读过滤（`archive-catalog.ts`）

| 属性 | 值 |
|------|-----|
| **复杂度** | L |
| **类型** | 🛠 实施（纯函数；零 IO / 零 chrome / 零明文） |
| **前置依赖** | 无（消费 P0 `ConnectTreeSnapshot`） |
| **执行波次** | Wave 14 |
| **可并行** | ∥ TASK-001 |
| **对应 FR** | FR-V2-050/051/052/055/056（+ NFR-V24-001/002/005、EC-V24-001~005、AC-V24-001/002/004/006/007） |
| **承接 ADR** | ADR-V2-016（渲染模型并入 `src/insight/`）、ADR-V2-017（三层口径防夸大）、ADR-V2-018（`deny` 分层派生只读）、ADR-V2-020（结构无控件） |

**描述**: 新建纯模块 `src/insight/archive-catalog.ts`：`buildArchiveModel(snapshot, filter)` → `{ coverage, facets, cards, groups, notes }`。
- **渲染模型**：`ArchiveCard = { cardId, action, risk, sourceKind, origin?, delayMs, denyCause?, autoAuthHardLine, suppressed, suppressionReason?, badges }`；接口**不含** `controls`/`actionId`/`control`/`actionTarget`（E1 编译期不可渲染写控件）；卡粒度 = 工具卡（`cmd:<name>`）+ 子命令卡（`cmd:<name>#<sub>`），复用 `cardId`。
- **三层口径**：`coverage` 分列 L1（`CATALOG_BASELINE_META` / `snapshot.catalogMeta`）、L2（`loadWaivers` 状态 + 理由，**非「缺失」**）、L3（当次 `cards.length === meta.counts.commands + meta.counts.subcommands`；P0 fixture = **122**）；`coverage.accounted.percent === 100`（`carded ∪ waived` 覆盖基线**每一行**）；**`carded` 只等于 L3**；UI 文案禁用「34/142 已全部渲染」类表述（文案常量在模块内，供 `tree-drawer` 复用）。
- **`deny` 分层**：policy 层直接取 `CommandNode.denyCause`（S1/S3/evaluate），标签**复用** `tree-view.ts#DENY_CAUSE_LABEL`（单一文案源）；自动授权层 `autoAuthHardLine(card) === true ⇔ card.group === PLUGIN_SITE_GROUP ∧ (card.risk === 'evaluate' ∨ card.risk 缺失/非法)`（**纯派生只读**，依据真实 `decideAutoAuthorization` 顺序，**不新增模型字段、不改 `deriveAction`**）；非站点卡在 auto 行标注「不适用」——如实分列、不合并、不夸大。
- **`ArchiveFilter`**（独立定义，**不碰 `TreeFilter`**）：`groupBy: 'tool'|'action'|'risk'|'source'|'deny-cause'`、`query?`、`action?`、`risk?`、`sourceKind?`、`denyCause?`、`origin?`、`suppressed?`；复用 `snapshot.facets` 驱动下拉与计数（**不重算**）；过滤**只改展示集合**，不改快照 / 授权。
- **来源/抑制**：`site_*` 带 origin（`sourceKind`/`crossLinks` 真值）；`suppressed`/`suppressionReason` 与 `deriveTools()` 一致。
- **禁用面**：不导入 `tree-ops`/`tree-receipt`/`security/**` 写面；不复制 `TREE_NO_ESCALATION_NOTE` 字面量（**导入**）；无 `innerHTML`；无 bare `catch`；无 `apiKey`。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| NEW | `packages/web-cli-plugin/src/insight/archive-catalog.ts` |

**验收标准**:
- [ ] `ArchiveCard` 无控件字段（运行时遍历全部卡片断言 `Object.keys(card) ∩ {controls, actionId, control, actionTarget} === ∅`）
- [ ] **动态不变量** `cards.length === meta.counts.commands + meta.counts.subcommands`（恒真）；P0 同款 fixture = **122**；`cardId` 唯一且 === `CommandNode.cardId`
- [ ] **逐条有档**：基线每一行 ∈ (`carded` ∪ `waived-with-reason`)；`accounted.percent === 100`；`carded.tools === 28 ≠ baseline.tools === 34`（三层分列钉死，**禁止**把 `accounted` 直接用 L1 计算）
- [ ] `deny` 卡：`denyCause ∈ {s1-unauthorized, s3-unknown-risk, evaluate-floor}`；`autoAuthHardLine` 与真实 `decideAutoAuthorization(...).hardDeny` 语义一致（**TASK-005 做全量交叉**）
- [ ] 过滤只读：过滤前后 `stableStringify(snapshot)` **全等**；过滤**真的收窄**
- [ ] 模块 grep 零命中：`tree-ops` / `tree-receipt` / `TreeActionId` / `riskDefaults\s*[:=]` / `createPluginPolicyConfig` / `innerHTML` / `chrome\s*\.` / `apiKey` / `非可配置档位`（字面量须来自导入）
- [ ] `npm run typecheck` 0 error

**验证命令**:
```bash
cd packages/web-cli-plugin && npm run typecheck
! grep -rnE "tree-ops|tree-receipt|TreeActionId|riskDefaults\s*[:=]|createPluginPolicyConfig|innerHTML|chrome\s*\.|apiKey|非可配置档位" src/insight/archive-catalog.ts
```

### TASK-003: 抽屉内档案子视图（`tree-drawer.ts` MODIFY，默认关，类名隔离）

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **类型** | 🛠 实施（MODIFY P0 抽屉；`createElement`/`textContent` only） |
| **前置依赖** | TASK-002 |
| **执行波次** | Wave 15 |
| **可并行** | ∥ TASK-004 |
| **对应 FR** | FR-V2-050/054/055/056（+ AC-V24-005/006/007） |
| **承接 ADR** | ADR-V2-016（复用子视图/默认关）、ADR-V2-019（`delay` 单源）、ADR-V2-020（DOM 零控件） |

**描述**: 在既有 `#tree-drawer` 上**追加**（不改 P0 骨架）：`tree-filter` 容器内追加开关 `#tree-archive-toggle`（默认 `aria-pressed=false`）与分组选择 `#tree-archive-groupby`；**开启时**在 `tree-body` 内渲染独立容器 `.tree-archive`（**关闭时不创建**该容器）；卡片类名 `.tree-archive-card`/`.tree-archive-group`/`.tree-archive-field`（**不复用** `.tree-row`/`.tree-control`）。每卡两行分列「处置（policy）（含 `denyCause` 文案）」与「自动授权层」（`autoAuthHardLine`；非站点标「不适用」）+ `delayMs` 列（复用既有措辞「命令间隔 delayMs=N ms（与 delay 档无关）」）+ `sourceKind`（`site_*` 显示 origin）+ 抑制态。检索/过滤接线到 TASK-002 的 `ArchiveFilter`（**只读**）。**`delay` 消歧不重复渲染**：档案开启时既有 `#tree-note-no-escalation` 区块仍可见（复用 `TREE_NO_ESCALATION_NOTE`）。**不改** header/notes/receipt/confirm 结构与既有渲染路径（默认关逐字节等价）。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/web-cli-plugin/src/ui/tree/tree-drawer.ts`（追加档案子视图 + 开关/分组/检索接线；P0 既有行为零删改） |

**验收标准**:
- [ ] 默认 `aria-pressed=false` 且 `.tree-archive` **不存在** → 默认 DOM 与 P0 现状一致（开/关两态既有断言逐字段相等）
- [ ] 开启后 `.tree-archive-card` 数 === 头部「实时面 N/M 卡」的 N+M，且 `> 0`
- [ ] 每卡有 `action`/`sourceKind`/`delayMs` 字段；`deny` 卡含成因文案（复用 `DENY_CAUSE_LABEL`）；自动授权层可读、非站点标「不适用」
- [ ] `site_*` 卡（若存在）显示 origin；无站点卡时如实标注计数（**不做空断言**）
- [ ] `delay` 单源：档案模块/抽屉**不含**第二处 `非可配置档位` 字面量（复用既有 note 区块）
- [ ] 零 `innerHTML`；无 bare `catch`；`.tree-archive` 内 `.tree-control` === 0、`button[data-action-id]` === 0、`input[type=checkbox]` === 0
- [ ] P0 抽屉既有行为零删改；`npm run build` + `typecheck` 0 error

**验证命令**:
```bash
cd packages/web-cli-plugin && npm run build && npm run typecheck
! grep -nE "innerHTML|catch\s*\([^)]*\)\s*\{\s*\}|非可配置档位" src/ui/tree/tree-drawer.ts
```

### TASK-004: node 门禁主体（`insight-archive.test.ts`：A1/A2/A4~A9 + 反证）

| 属性 | 值 |
|------|-----|
| **复杂度** | L |
| **类型** | ⚖️ 门禁（node 单测；**新文件**） |
| **前置依赖** | TASK-001/002 |
| **执行波次** | Wave 15 |
| **可并行** | ∥ TASK-003 |
| **对应 FR** | FR-V2-050/052/053/054/055/056（+ NFR-V24-001~005、AC-V24-001/004/005/006/007） |
| **承接 ADR** | ADR-V2-017/019/020/021/022 |

**描述**: 新建 `test/insight-archive.test.ts`（`npm test` glob `test/*.test.ts`），复用 P0 `insight-action-parity` 同款 fixture 与 `test/parity/baseline-catalog.json`；**每条关键断言配反证自测**；`catch` **只吞 `ENOENT`**；禁 `assert.ok(true)` 空断言；冻结类用 **`sha256` 内容哈希**（**禁** `git diff --quiet HEAD` 作唯一冻结 —— W3 教训）。断言：
- **A1** `cards.length === counts.commands + counts.subcommands`；fixture = **122**；`cardId` 唯一且 === `CommandNode.cardId`
- **A2** 逐条有档：基线每行 ∈ (`carded` ∪ `waived-with-reason`)；`accounted.percent === 100`；`carded.tools === 28 ≠ baseline.tools === 34`
- **A4** `ArchiveCard` 无控件字段（`Object.keys ∩ {controls,actionId,control,actionTarget} === ∅`）；模块 grep 无 `tree-ops`/`TreeActionId`/`riskDefaults\s*[:=]`
- **A5** `delay` 单源：`archive-catalog.ts` **导入** `TREE_NO_ESCALATION_NOTE`（非复制）；档案模块无第二处 `非可配置档位` 字面量；`sha256(TREE_NO_ESCALATION_NOTE)` === pin
- **A6** 过滤只读：过滤前后 `stableStringify(snapshot)` **全等** + 授权节点 id 不变 + 过滤**真的收窄**
- **A7** `CATALOG_BASELINE_META` === `loadBaseline()` 计数 + `/^[0-9a-f]{40}$/` provenance commit
- **A8** 禁改面内容哈希 pin：`TREE_ACTION_IDS` **恰 7 值**（sha256 pin）；`src/content/**`（3 文件）源码内容哈希；`tree-view.ts`/`tree-ops.ts`/`tree-receipt.ts` 内容哈希（V2-4 不得改动）
- **A9** 体积重登记结构（从 `test/size-baseline.ts` 读取）：`HISTORY` 含 `1_110_744` 且单调不减；`META` 含日期/来源/理由且 `targetBudgetBytes===null`/`targetMet===null`；`ceiling === floor(baseline × 1.05)`

**反证自测（逐条）**: A1 删一张卡 → FAIL；A2 删基线一行 → FAIL、`accounted` 改为直接用 L1 → FAIL（**防夸大**）；A4 注入一个 `actionId` 字段 → FAIL；A5 复制一份字面量 → FAIL、改 `TREE_NO_ESCALATION_NOTE` 一字节 → FAIL；A6 谓词恒 `true` → FAIL；A7 改常量一位 → FAIL；A8 改一字节 → FAIL；A9 `ceiling+1` → FAIL。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| NEW | `packages/web-cli-plugin/test/insight-archive.test.ts` |

**验收标准**:
- [ ] A1/A2/A4/A5/A6/A7/A8/A9 逐条通过；T3 fixture = **122**
- [ ] **每条关键断言配反证自测**且反证**真能 FAIL**（非空洞）
- [ ] `catch` 只吞 `ENOENT`（其它 stat/fs 失败必须抛出）；**无** `assert.ok(true)` 式空断言
- [ ] 冻结类断言用 `sha256` 内容哈希钉死（**不**以 `git diff --quiet HEAD` 作唯一冻结）
- [ ] `npm test` 全绿

**验证命令**:
```bash
cd packages/web-cli-plugin && npm test
```

### TASK-005: node 门禁 A3 — `deny` 分层全量交叉断言 + 站点域矩阵 + 分歧钉死 + 反证（T3 教训）

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **类型** | ⚖️ 门禁（node 单测；**MODIFY 追加**） |
| **前置依赖** | TASK-004 |
| **执行波次** | Wave 16 |
| **可并行** | ∥ TASK-006/007 |
| **对应 FR** | FR-V2-051/053（+ NFR-V24-002、AC-V24-002/003） |
| **承接 ADR** | ADR-V2-018（`deny` 成因分层 / 全量交叉断言） |

**描述**: 在 TASK-004 建立的 `test/insight-archive.test.ts` 上**追加 A3 段**（A1/A2/A4~A9 **零删改**）：
- **全量一致性交叉断言**：用**真实** `decideAutoAuthorization` 对**全量卡片**（28 条目 / 94 子命令）逐条断言 `autoAuthHardLine(card) === realDecision.hardDeny`（真值来自真实判定链，非再实现）。
- **站点域矩阵**：`risk ∈ {read, write, evaluate, unknown, ui, state, external, undefined} × 授权(origin 有/无) × trust(trusted/untrusted)` 交叉断言派生与真实判定链一致。
- **分歧钉死**：把已证「合法分歧」显式列为期望类——**非站点** `evaluate`/未知 risk：policy 仍 `deny`（`evaluate-floor`/`s3-unknown-risk`），而 auto 层为「不适用」；**站点** `evaluate`/未知 risk：policy `deny` 且 auto `hardDeny`。分歧类**从宽不得通过**（必须逐格精确匹配）。
- **反证自测**：人为翻转一张卡的派生输入（如把 `group`/`risk` 改成与真值不符）→ 断言**必须 FAIL**。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/web-cli-plugin/test/insight-archive.test.ts`（**追加** A3 段；A1/A2/A4~A9 零删改） |

**验收标准**:
- [ ] 全量卡片 **100%** `autoAuthHardLine === realDecision.hardDeny`
- [ ] 站点域矩阵逐格一致（`read/write/evaluate/unknown/ui/state/external/undefined` × 授权 × trust）
- [ ] **分歧类显式钉死**（站点 vs 非站点的 `evaluate`/未知 risk 行为分列），不从宽
- [ ] 反证自测**真能 FAIL**（翻转一张卡 → FAIL）
- [ ] A1/A2/A4~A9 段**零删改**；`npm test` 全绿

**验证命令**:
```bash
cd packages/web-cli-plugin && npm test
```

### TASK-006: Chromium 门禁 `test/ui/insight.mjs` 追加 `#I-19a…h`（复用单会话）

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **类型** | ⚖️ 门禁（真实 dist + Chromium；**MODIFY 追加**） |
| **前置依赖** | TASK-003 |
| **执行波次** | Wave 16 |
| **可并行** | ∥ TASK-005/007 |
| **对应 FR** | FR-V2-050~056（+ AC-V24-004/005/006/007） |
| **承接 ADR** | ADR-V2-022（断言只增不减 / 复用单会话 / 测量条件写进 AC） |

**描述**: 在 `test/ui/insight.mjs` **追加** `#I-19a…h`（既有 `#I-00…18e` **零删改**；**复用同一 Chromium 会话**，**不新增**第二个 Chromium 门禁）：
- `#I-19a` 档案开关存在、默认关（`aria-pressed=false`）、`.tree-archive` **不存在** → 默认 DOM 与现状一致
- `#I-19b` 开启后 `.tree-archive-card` 数 === 头部「实时面 N/M 卡」的 N+M，且 `> 0`
- `#I-19c` 每张卡有 `action`/`sourceKind`/`delayMs` 字段；`deny` 卡含成因文案
- `#I-19d` `site_*` 卡（若存在）显示 origin；无站点卡时**如实标注计数**（不做空断言）
- `#I-19e` `delay` 单源：`.tree-note-no-escalation` 全文档**恰 1 处**且含完整消歧句；`document.body.textContent` 中 `非可配置档位` 出现次数 === **1**
- `#I-19f` 档案检索/过滤：输入后卡片收窄 + 清空恢复；无异常
- `#I-19g` 安全红线：`.tree-archive .tree-control` === 0、`button[data-action-id]` === 0、`input[type=checkbox]` === 0
- `#I-19h` 档案开启后**复用既有 `checkLayout`**：`#log ≥ 589px` / 占比 `≥ 65.0%` / composer ∈[0,+8] / FAB∩composer=0 / 零水平溢出（**测量条件与 P0 同段 JS**，D-V22-01）

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/web-cli-plugin/test/ui/insight.mjs`（**追加** `#I-19a…h`；既有编号零删改） |

**验收标准**:
- [ ] `#I-19a…h` 8 个编号全部通过
- [ ] 既有 `#I-00…18e`（**52 断言**`passes` 口径）**零删改**（`git diff --unified=0` 仅新增行）
- [ ] **复用单 Chromium 会话**（不新增第二个 Chromium 门禁；执行顺序在 `test:ui` 之后串行）
- [ ] `passes` 实测计数登记（预计 ≥ 52 + 8；`#I-19h` 复用 `checkLayout` 会展开多项，**以实测为准**，不预写死）
- [ ] `npm run build` + `npm run test:insight` 通过

**验证命令**:
```bash
cd packages/web-cli-plugin && npm run build && npm run test:insight   # 必须在 test:ui 之后串行
git -C ../.. diff --unified=0 -- packages/web-cli-plugin/test/ui/insight.mjs | grep -E "^-[^-]" || echo "append-only ok"
```

### TASK-007: 体积守卫显式重登记 + `size-budget` 追加（sidepanel 5% / content 零增长）

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **类型** | ⚖️ 门禁（node；**MODIFY 重登记 + 追加**） |
| **前置依赖** | TASK-002/003（需 `npm run build` 产物） |
| **执行波次** | Wave 16 |
| **可并行** | ∥ TASK-005/006 |
| **对应 FR** | NFR-V2-001/002、NFR-V24-001（+ AC-V2-006） |
| **承接 ADR** | ADR-V2-007（体积守卫）、ADR-V2-022（显式重登记 / 内容哈希 / 测量条件可复现） |

**描述**: **build 后实测**（**不预设结果**）→ `test/size-baseline.ts` **显式重登记**：`SIDEPANEL_BASELINE_BYTES = 实测值`；`SIDEPANEL_BASELINE_BYTES_HISTORY` **追加 `1_110_744`**（历史保留 **`1,068,165 / 1,085,389 / 1,110,744`**，单调不减）；`SIDEPANEL_CEILING = Math.floor(新基线 × 1.05)`（容差 **5% 不变**）；`SIDEPANEL_BASELINE_META` 追加 `measuredOn` / `previousBaselineBytes: 1_110_744` / `reRegisteredFrom` / 理由，`targetBudgetBytes: null` / `targetMet: null` **保持不变**（基线 ≠ 目标预算）。`CONTENT_MAX_BYTES` **保持 `1_073_453`**（**无容差**）；另加 **`src/content/**`（3 文件）源码内容哈希 pin**（W3 手法，替代提交后恒绿的 `git diff HEAD`）。在 `test/size-budget.test.ts` **追加**（既有断言零删改）：① `HISTORY` 含 `1_110_744` 且单调不减；② `META` 含日期/来源/理由且 `targetBudgetBytes===null`/`targetMet===null`；③ `ceiling === floor(baseline×1.05)` 结构一致；④ 反证 `ceiling+1` → FAIL（沿用）；⑤ `content.js` ceiling 未变 + 源码哈希 pin（改一字节 FAIL）；⑥ 反证 `1_073_454` → FAIL。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/web-cli-plugin/test/size-baseline.ts`（**显式重登记** + 历史/META 溯源） |
| MODIFY | `packages/web-cli-plugin/test/size-budget.test.ts`（**追加**重登记一致性断言；既有零删改） |

**验收标准（具体数值）**:
- [ ] `SIDEPANEL_BASELINE_BYTES_HISTORY` = `[1_068_165, 1_085_389, 1_110_744]`，**严格单调不减**
- [ ] `SIDEPANEL_BASELINE_BYTES` = build 后**实测值**（登记 `measuredOn` / `source` / `buildCommand` / 理由，非静默上调）
- [ ] `SIDEPANEL_CEILING === Math.floor(SIDEPANEL_BASELINE_BYTES * 1.05)`；容差 `=== 0.05` 不变
- [ ] `CONTENT_MAX_BYTES === 1_073_453`（**无容差**）；`dist/content.js ≤ 1_073_453`（当前恰等于）；`src/content/**` 源码内容哈希 pin（3 文件，改一字节 FAIL）
- [ ] `SIDEPANEL_BASELINE_META`：`targetBudgetBytes === null`、`targetMet === null`、`previousBaselineBytes === 1_110_744`、`measuredOn` 非空、`source === 'packages/web-cli-plugin/dist/sidepanel.js'`
- [ ] 反证：`ceiling + 1` → FAIL；`1_073_454` content → FAIL（**沿用 P0，不得改容差或删断言**）
- [ ] `npm run build` + `npm test` 全绿

**验证命令**:
```bash
cd packages/web-cli-plugin && npm run build && npm test
node -e "const b=require('node:fs').statSync('dist/content.js').size; if(b>1073453) process.exit(1); console.log('content.js',b)"
```

### TASK-008: 门禁串行收口 + 断言只增不减核验

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **类型** | ⚖️ 验证收口（**串行**） |
| **前置依赖** | TASK-004/005/006/007 |
| **执行波次** | Wave 17 |
| **可并行** | ∥ TASK-009/010（门禁本身串行） |
| **对应 FR** | NFR-V24-003、NFR-V2-009 |
| **承接 ADR** | ADR-V2-022 |

**描述**: 逐条**串行**执行全套门禁：`npm run build` → `npm test` → `npm run test:ui` → `npm run test:insight` → `npm run test:hardening` → `npm run test:binding` → `npm run test:e2e` → `tsc --noEmit`。核验：v1 `test:ui`（journey）既有断言**零删减**；`test:insight` 既有 **52 断言**零删改（仅追加 `#I-19a…h`）；`packages/web-cli-base` **零 diff / 483 零回归**；零 diff 面清单逐项为空：`src/security/policy.ts` / `src/security/auto-authorize.ts` / `manifest.json` / `src/content/**` / `src/insight/tree-model.ts` / `src/ui/tree/tree-view.ts` / `src/ui/tree/tree-ops.ts` / `src/ui/tree/tree-receipt.ts` / `test/parity/**`；`dist/content.js` **零增长**（=== 1,073,453）。**绝不并发 Chromium**。

**涉及文件**: 无（执行记录；结果回填 build 阶段 `build.md`）

**验收标准**:
- [ ] 全套门禁逐条**串行**通过，全仓 0 fail
- [ ] 零 diff 面清单逐项 `git diff --quiet` 为空（`packages/web-cli-base/**` 用 `git -C ../.. diff --quiet -- packages/web-cli-base`）
- [ ] `test:insight` 既有 52 断言**零删改**；v1 `test:ui` 既有断言零删减
- [ ] `dist/content.js === 1,073,453`（**零增长**）；`dist/sidepanel.js ≤ SIDEPANEL_CEILING`
- [ ] 串行执行记录可追溯（命令顺序 + 时间 + 实测 `passes`）

**验证命令**:
```bash
cd packages/web-cli-plugin
npm run build && npm test
npm run test:ui && npm run test:insight && npm run test:hardening && npm run test:binding
npm run test:e2e && npm run typecheck
git -C ../.. diff --quiet -- packages/web-cli-base packages/web-cli-plugin/src/security packages/web-cli-plugin/src/content packages/web-cli-plugin/manifest.json packages/web-cli-plugin/src/insight/tree-model.ts packages/web-cli-plugin/src/ui/tree/tree-view.ts packages/web-cli-plugin/src/ui/tree/tree-ops.ts packages/web-cli-plugin/src/ui/tree/tree-receipt.ts packages/web-cli-plugin/test/parity
```

### TASK-009: 文档回填（sidepanel 新基线 / ceiling / `test:insight` 断言数）

| 属性 | 值 |
|------|-----|
| **复杂度** | S |
| **类型** | 📄 文档（**只增不改、历史保留**） |
| **前置依赖** | TASK-006/007/008（需实测值） |
| **执行波次** | Wave 17 |
| **可并行** | ∥ TASK-008（本任务在实测完成后执行） |
| **对应 FR** | NFR-V24-003、NFR-V2-008 |

**描述**: ① `docs/dev.md` §8.2 体积实测表**回填** V2-4 的 `dist/sidepanel.js` **实测值** + 新 `ceiling`；历史值 **`1,068,165 / 1,085,389 / 1,110,744 / 新值`** 全保留；`dist/content.js` 仍为 **`1,073,453`** 登记；§末尾修订记录追加一行。② `docs/smoke-checklist.md` §5 的 `test:insight` 断言数由 **52** 回填为 **实测 `passes`**（登记新增编号 `#I-19a…h` 与口径说明：`#I-19h` 复用 `checkLayout` 展开多项，计数据实测；若与 52+8 不一致以实测为准并注明）。**既有内容零删改，历史值保留**。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/web-cli-plugin/docs/dev.md`（§8.2 + 修订记录） |
| MODIFY | `packages/web-cli-plugin/docs/smoke-checklist.md`（§5 断言数口径） |

**验收标准**:
- [ ] `docs/dev.md` §8.2 含 V2-4 实测基线 + 新 ceiling + 历史 4 值（`1,068,165 / 1,085,389 / 1,110,744 / 新值`）
- [ ] `docs/smoke-checklist.md` §5 断言数 = **实测**（非硬编码猜测），并注明新增编号 `#I-19a…h`
- [ ] 数字与 `test/size-baseline.ts` **一致**
- [ ] 既有内容**零删改**（`git diff` 仅新增/单行订正且保留历史值）

**验证命令**:
```bash
cd packages/web-cli-plugin
grep -nE "1,110,744|V2-4" docs/dev.md
grep -nE "test:insight" docs/smoke-checklist.md
git -C ../.. diff --stat -- packages/web-cli-plugin/docs/dev.md packages/web-cli-plugin/docs/smoke-checklist.md
```

### TASK-010: 人工面 V2-H-7~9 登记（`docs/smoke-checklist.md` V2 段追加）

| 属性 | 值 |
|------|-----|
| **复杂度** | S |
| **类型** | 📄 文档 + 人工验证（headless 无法覆盖，如实登记不冒充 PASS） |
| **前置依赖** | TASK-009（**同文件串行**） |
| **执行波次** | Wave 17 |
| **可并行** | — （009→010 同文件串行） |
| **对应 FR** | NFR-V2-008（+ plan §9.3） |

**描述**: 在 `docs/smoke-checklist.md` V2 段**追加** V2-4 人工面 §（**既有内容零删改**）：**V2-H-7** 档案长文案 / 320px 窄栏下 122 卡的拥挤度与可读性；**V2-H-8** 分组维度切换 / 折叠展开的观感与动效；**V2-H-9** 真实站点绑定后 `site_*` 卡片增长时的观感。逐项给**步骤 / 期望 / 本轮结论**栏；本轮未执行一律标 **`⏳ 待人工`**。编号前缀 `V2-H-*`，与 §1 `M1~M30` / §2 `H0~H10` / §5 `V2-H-A~D` / §6 `V2-H-1~6` **零冲突**。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/web-cli-plugin/docs/smoke-checklist.md`（追加 V2-4 人工面 §；既有 §1~§6 零删改） |

**验收标准**:
- [ ] V2-H-7 / V2-H-8 / V2-H-9 三项齐全（步骤 / 期望 / 结论栏）
- [ ] 三项本轮均标 **`⏳ 待人工`**（headless 不可覆盖，**不冒充 PASS**）
- [ ] 既有 §1~§6 内容**零删改**
- [ ] 编号 `V2-H-7~9` 唯一、与既有编号零冲突

**验证命令**:
```bash
cd packages/web-cli-plugin
grep -nE "V2-H-7|V2-H-8|V2-H-9|待人工" docs/smoke-checklist.md
git -C ../.. diff --stat -- packages/web-cli-plugin/docs/smoke-checklist.md
```

---

## 3. 任务汇总

| 统计项 | 数值 |
|--------|:--:|
| 总任务数 | **10** |
| S 级 | 3（TASK-001/009/010） |
| M 级 | 5（TASK-003/005/006/007/008） |
| L 级 | 2（TASK-002/004） |
| 执行波次 | **4**（跨叶子 Wave 14~17） |
| 实施任务（🛠） | 3（001/002/003） |
| 门禁任务（⚖️） | 5（004/005/006/007/008） |
| 文档/人工（📄） | 2（009/010） |
| 新建文件 | 3（`catalog-meta.ts` / `archive-catalog.ts` / `insight-archive.test.ts`） |
| 修改文件 | 6（`service-worker.ts` / `tree-drawer.ts` / `size-baseline.ts` / `size-budget.test.ts` / `insight.mjs` / `docs/{dev,smoke-checklist}.md`） |

### 3.1 需求条目 → 任务映射（对齐编排输入 11 条）

| # | 需求条目 | 实现任务 | 门禁任务 |
|:-:|----------|:--:|------|
| 1 | 渲染模型（并入 `src/insight/`，不改 `tree-model.ts`/`tree-view.ts`/`TreeFilter`） | TASK-002 | TASK-004(A1/A4) |
| 2 | 档案子视图（默认关、`.tree-archive*` 隔离、不改 P0 抽屉 / 52 断言） | TASK-003 | TASK-006(#I-19a/b/h) |
| 3 | 三层口径（34/142 · 20/88 · 28/94=122）+ `accounted` 100% + 防夸大反证 | TASK-002 | TASK-004(A2) |
| 4 | `deny` 分层 + `autoAuthHardLine` + 全量交叉 × 站点域矩阵 + 反证 | TASK-002 | **TASK-005(A3)** |
| 5 | `delay` 单源消歧（`TREE_NO_ESCALATION_NOTE` 内容哈希钉死，`非可配置档位` 恰 1 次） | TASK-002/003 | TASK-004(A5) + TASK-006(#I-19e) |
| 6 | 检索/过滤只读（`ArchiveFilter`、`stableStringify` 全等 + 反证） | TASK-002 | TASK-004(A6) + TASK-006(#I-19f) |
| 7 | parity 同源（复用 `catalog-reconcile.ts` + `catalog-meta.ts` 注入，不打包 JSON） | TASK-001 | TASK-004(A7) |
| 8 | 体积守卫（sidepanel 重登记 + content 零增长） | TASK-002/003（增重源） | **TASK-007** + TASK-008 |
| 9 | 门禁挂载（新 node 文件 + `insight.mjs` 追加） | — | TASK-004/005/006 |
| 10 | 文档回填（断言数 52 → 实测；体积值） | — | TASK-009 |
| 11 | 人工面 V2-H-7~9 | — | TASK-010 |

### 3.2 交付门槛矩阵（本叶子）

| 门禁 | 命令 | 断言要点 | 新增 vs 追加 | 承载任务 |
|------|------|----------|:--:|:--:|
| `insight-archive`（主体） | `npm test` | A1 动态不变量 + fixture 122 / A2 三层口径 + `accounted` 100% + 防夸大 / A4 无控件字段 + 模块 grep / A5 `delay` 单源哈希 pin / A6 只读过滤 / A7 `catalogMeta` 漂移 / A8 禁改面内容哈希（`TREE_ACTION_IDS` 7 值 + `src/content/**` 3 文件） / A9 体积重登记结构 | **新增文件** `test/insight-archive.test.ts` | TASK-004 |
| `insight-archive`（A3） | `npm test` | `deny` 分层全量交叉（真实 `decideAutoAuthorization` × 全量卡片）+ 站点域矩阵 + 分歧钉死 + 反证 | **追加**（TASK-004 文件；零删改） | TASK-005 |
| `test:insight` | `npm run test:insight` | `#I-19a…h`（默认关 / 卡数 / 字段 / `delay` 单源 / 只读过滤 / 零控件 / 布局不回退） | **追加** `#I-19a…h`（既有 52 断言零删改；单 Chromium 会话） | TASK-006 |
| `size-budget` | `npm run build && npm test` | sidepanel 5% 回归（`HISTORY` 含 `1,110,744` 单调不减 + `META` 溯源 + `ceiling` 结构）+ `content.js` `1,073,453` 零容差 + `src/content/**` 源码哈希 + 反证 | **重登记 + 追加**（既有断言零删改） | TASK-007 |
| 门禁串行收口 | 全套串行 | 零 diff 面清单 + v1/P0 断言零删改 + `content.js` 零增长 | 执行记录 | TASK-008 |
| `policy`/`auto-authorize`/`base` 冻结 | git diff | `src/security/**`、`packages/web-cli-base/**`、`manifest.json`、`src/content/**`、`tree-model.ts`、`tree-view.ts`、`tree-ops.ts`、`tree-receipt.ts`、`test/parity/**` 零 diff | 零改动 v1/P0 | TASK-008 |

### 3.3 断言只增不减（具体保证方式）

| 类别 | 文件 | 方式 |
|------|------|------|
| V2-4 新增 node 断言 | `test/insight-archive.test.ts` | **全部新增文件** |
| V2-4 追加 node 断言 | `test/insight-archive.test.ts`（A3） | TASK-004 建立 → TASK-005 **追加**（零删改） |
| V2-4 新增 Chromium 断言 | `test/ui/insight.mjs` | **追加** `#I-19a…h`；核验 `git diff --unified=0` 无删除行 |
| P0 `test:insight` 断言 | `test/ui/insight.mjs` | 既有 52 断言**零删改**；核验方式 = `git diff -U0` 仅新增行 + 编号 `#I-00…18e` 不变 |
| v1 `test:ui`（journey）断言 | `test/ui/journey.mjs` | **零改动**（不在 V2-4 影响面） |
| v1/P0 判定链与禁改面 | `src/security/**` / `src/content/**` / `tree-model.ts` / `tree-view.ts` / `tree-ops.ts` / `tree-receipt.ts` / `test/parity/**` / `packages/web-cli-base/**` | **零 diff**（`git diff --quiet` 硬断言，TASK-008） |

### 3.4 P0 教训继承矩阵（写进任务验收标准）

| 教训 | 要求 | 落点 |
|------|------|------|
| 门禁必须**能真 FAIL** | 每条关键断言配**反证自测**；禁 `assert.ok(true)` 空断言 | TASK-004（A1~A9 各反证）/ TASK-005（翻转一张卡）/ TASK-007（`ceiling+1`、`1_073_454`） |
| `catch` 只吞 `ENOENT` | 其它 fs/stat 失败必须抛出，不静默通过 | TASK-004；复用 P0 `evaluateSidepanelSize` 语义 |
| 冻结断言用**内容哈希**（W3） | `sha256` pin（`TREE_NO_ESCALATION_NOTE` / `TREE_ACTION_IDS` / `src/content/**` / `tree-view·tree-ops·tree-receipt`）；**禁** `git diff --quiet HEAD` 作唯一冻结 | TASK-004(A5/A8) / TASK-007 |
| 体积基线变更**显式重登记**（W4） | 前后值 + 日期 + 来源 + 理由 + 历史保留；不调容差、不删断言 | TASK-007 |
| 测量条件**可复现并写进 AC**（D-V22-01） | `#I-19h` 与 P0 同段 JS（去镀铬稳态）；体积为 build 后 `stat` 实测 | TASK-006 / TASK-007 / TASK-009 |
| 策略再实现**全量一致性交叉断言**（T3） | 真实 `decideAutoAuthorization` × **全量**卡片 + 站点域矩阵 + 分歧钉死 | TASK-005 |
| Chromium **绝不并发**（OOM） | `#I-19a…h` 追加到既有单会话；不新增第二个 Chromium 门禁 | TASK-006 / TASK-008 |

### 3.5 编排器代作者决策登记（2026-09-13 授权）

| # | 事项 | 裁决 |
|---|------|------|
| TD-V24-01 | 渲染模型落点 | 并入 `src/insight/archive-catalog.ts`，**不在 `src/ui/tree/` 新增文件**（沿用 ADR-V2-016，避开 `treeSources()` 精确列表断言，换取「既有断言零修改」） |
| TD-V24-02 | Chromium 追加编号 | `#I-19a…h`（现行最大 `#I-18e`，零冲突）；**不新增**第二个 Chromium 门禁，复用单会话（避 OOM） |
| TD-V24-03 | `test:insight` 断言计数口径 | 既有 **52** = 运行时 `passes`；V2-4 追加 `#I-19a…h`，其中 `#I-19h` 复用 `checkLayout`（展开多项 check）→ **实测增量以 `passes` 为准**（预计 ≥ 52+8），文档回填**实测值**并注明口径，不预写死 |
| TD-V24-04 | node 门禁拆分 | A3（`deny` 分层全量交叉 + 站点域矩阵，T3 高风险）**独立成 TASK-005**；A1/A2/A4~A9 归 TASK-004 |
| TD-V24-05 | 波次 | 叶内 **4 波**（跨叶子 Wave 14~17，续 V2-3 的 Wave 13）；009→010 同文件（`smoke-checklist.md`）串行 |
| TD-V24-06 | 体积基线 | 新基线 = build 后**实测**（**不预设**）；`HISTORY` 追加 `1_110_744`；容差 5% 与 `targetBudgetBytes:null`/`targetMet:null` 不变 |
| TD-V24-07 | `ROADMAP.md` 回填 | **不在本叶任务内**（授权范围限定 `docs/dev.md` + `docs/smoke-checklist.md`；如需要由 v2 收口统一处理，避免越界改动） |

---

## 4. 执行策略

### 4.1 门禁串行纪律（NFR-V2-009，绝不并发）

```bash
npm run build --workspace @lgdl/web-cli-plugin
npm test --workspace @lgdl/web-cli-plugin
npm run test:ui --workspace @lgdl/web-cli-plugin
npm run test:insight --workspace @lgdl/web-cli-plugin   # 含 V2-4 追加 #I-19a…h
npm run test:hardening --workspace @lgdl/web-cli-plugin
npm run test:binding --workspace @lgdl/web-cli-plugin
npm run test:e2e --workspace @lgdl/web-cli-plugin
# 逐条串行；任何一步 fail 即停，修复后从头串行重跑；Chromium 门禁绝不并发（OOM 前科）
```

### 4.2 文件所有权（防并行冲突）

- `src/insight/catalog-meta.ts` / `archive-catalog.ts` → V2-4 **新建**（P0 无此文件；`insight-no-escalation.test.ts#insightSources()` 为 glob+`>=6`，自然吸纳）；
- `src/background/service-worker.ts` → V2-1 建立 → **V2-4 追加 1 行**（additive 只读）；
- `src/ui/tree/tree-drawer.ts` → V2-2 新建 → V2-3 MODIFY → **V2-4 MODIFY 追加**（跨叶子串行，V2-4 在最后）；
- `test/insight-archive.test.ts` → V2-4 **新建**（TASK-004）→ **追加 A3**（TASK-005）；
- `test/ui/insight.mjs` → V2-2/V2-3 建立 → **V2-4 追加**（既有编号零删改）；
- `test/size-baseline.ts` / `test/size-budget.test.ts` → V2-2 建立 → V2-3 重登记 → **V2-4 重登记 + 追加**；
- `docs/dev.md` / `docs/smoke-checklist.md` → v1/V2-2/V2-3 已写 → **V2-4 追加/回填**（零删改、历史保留）。

### 4.3 不可并行/串行约束

- **TASK-002 → TASK-003**：`tree-drawer` 依赖 `archive-catalog` 的 `buildArchiveModel` 接口。
- **TASK-004 → TASK-005**：同文件追加（A3 依赖主体）。
- **TASK-006/007 → TASK-008**：收口需在全部门禁改动完成后串行执行。
- **TASK-009 → TASK-010**：同文件（`smoke-checklist.md`）串行，避免冲突。
- **Chromium 门禁（TASK-006/008）绝不与其它 Chromium 门禁并发**。

---

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建。V2-4 plan §2~§3 + §6 + §9 → **10 个原子任务 / 4 波**（跨叶子 Wave 14~17）：catalogMeta 常量 + service-worker 1 行注入 / archive-catalog 渲染模型+三层口径+deny 分层+只读过滤 / tree-drawer 档案子视图 / node 门禁主体 A1/A2/A4~A9 / **A3 deny 分层全量交叉** / test:insight 追加 `#I-19a…h` / 体积显式重登记+content 零增长 / 门禁串行收口 / 文档回填 / 人工面 V2-H-7~9。**零模型改动**，唯一 additive 运行时面 = `service-worker` 1 行 `catalogMeta`（ADR-V2-023）。门禁纪律：每条关键断言配反证、`catch` 只吞 `ENOENT`、冻结用内容哈希（W3）、体积显式重登记（W4）、策略再实现全量交叉（T3）、Chromium 绝不并发。编排器代作者决策 TD-V24-01~07（2026-09-13 授权）。 | 2026-09-13 | SDDU Tasks Agent |
