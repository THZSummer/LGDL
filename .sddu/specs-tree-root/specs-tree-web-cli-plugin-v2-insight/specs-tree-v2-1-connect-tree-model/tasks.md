# 任务分解：specs-tree-v2-1-connect-tree-model（V2-1 连接树数据模型与状态投影）

> **文档定位**: SDDU 任务清单（**叶子子 Feature**，P0，P0 闭环第一环）— 将技术方案分解为可并行执行的原子任务，作为 build 阶段的输入
> **前置依赖**: V2-1 `plan.md` v1.0（`src/insight/**` 纯投影层 + 6 模块文件影响 + 交付门槛）+ 父 `plan.md` v1.0（ADR-V2-001/002/003/004/010/012/014/015）+ V2-1 `spec.md` v1.0（FR-V2-010~017 / NFR-V21-001~005 / EC-V21-001~006 / AC-V21-001~007）+ 父 `spec.md`（FR-V2-010~017 权威条文）+ v1 `specs-tree-web-cli-plugin`（**只读参与，不改写**）
> **创建人**: SDDU Tasks Agent
> **创建时间**: 2026-09-13
> **版本**: v1.0
> **更新人**: SDDU Tasks Agent
> **更新时间**: 2026-09-13
> **更新说明**: 初始创建。V2-1 plan §3.1~3.6（纯投影 + 注入数据源 + 森林/四层分组 + 命名空间稳定键 + 固定排序 + 规范 JSON + 纯哈希 + `crossLinks` + 空态降级 + 命令逐条有档 + 单基线同源对账 + additive 消息）→ 整合为 **9 个原子任务 / 5 个执行波次**（Wave 1~5）。门禁矩阵：`insight-projection` / `insight-determinism` / `insight-catalog`（**34 工具 / 142 子命令双向等价 + 同源锚定**）/ `insight-no-escalation`（基础段，V2-3 扩展）。**断言只增不减**：新增断言全部落在**新文件**；v1 既有测试文件零删改。

---

## 0. 跨叶子定位与执行序（本文件 = V2-1，P0 第一环）

> **编排器代作者决策（2026-09-13 授权）**：V2-2 / V2-3 在本阶段与 V2-1 **并行分解**（各自 `tasks.md`/`tasks.json` 已分列），但 **build 与门禁执行严格串行**（本仓库 OOM 前科，NFR-V2-009）。

| 叶子 | 文件 | 跨叶子执行序 | 依赖本叶子的什么 |
|------|------|:--:|------------------|
| **V2-1 连接树数据模型与状态投影**（本文件） | `specs-tree-v2-1-connect-tree-model/tasks.md` | **Wave 1~5（先行）** | — |
| V2-2 悬浮连接树 UI 与交互 | `specs-tree-v2-2-floating-tree-ui/tasks.md` | Wave 6~9 | `ConnectTreeSnapshot`（V2-1 TASK-004）+ `insight-tree`/`insight-changed` 通路（V2-1 TASK-005） |
| V2-3 撤销与取消授权操作面 | `specs-tree-v2-3-revoke-ops/tasks.md` | Wave 10~13 | 同上 + V2-2 `tree-view.ts`/`tree-drawer.ts`（V2-3 对其 MODIFY） |

**门禁串行纪律（NFR-V2-009）**：`npm run build` → `npm test` → `npm run test:ui` → `npm run test:insight` → `npm run test:binding` → `npm run test:hardening` → `npm run test:e2e`，**逐条串行、绝不并发**；任何一步 fail 即停，修复后从头串行重跑。

---

## 1. 依赖拓扑总览

> 任务依赖关系和执行顺序。**类型标注**：🛠 实施 / ⚖️ 门禁·验证 / 📄 文档·契约。
> 红线贯穿：`src/insight/**` **纯读零副作用**（不触 `chrome.*`、不写 store、不写审计）；不改 `security/policy.ts` / `security/auto-authorize.ts`；不碰 `packages/web-cli-base/**`；不改 v1 任何文件；无新依赖。

### 1.1 任务总览表

| 编号 | 模块/落点 | 类型 | 复杂度 | 依赖 | 执行波次 | 可并行 | 一句话目标 |
|------|----------|:--:|:--:|------|:--:|:--:|------|
| TASK-001 | `src/insight/tree-model.ts` + `capability-catalog.ts` | 🛠 | M | 无 | Wave 1 | — | 类型层（快照/forest/稳定键/徽标/crossLink/成因/来源/控件）+ 能力目录投影（静态权限 `revocable:false` / 4 可选 / 6 开关 / tabs） |
| TASK-002 | `src/insight/command-catalog.ts` | 🛠 | L | 001 | Wave 2 | ∥ 003 | 命令逐条有档（`action`/`denyCause`/`sourceKind`/`delayMs` 分列/`suppressed`/`cardId`；`deny ⇒ controls:[]`） |
| TASK-003 | `src/insight/catalog-reconcile.ts` | 🛠 | M | 001 | Wave 2 | ∥ 002 | 单基线文件 + 双向对账 + 同源锚定（不重构 v1 `parity.test.ts`） |
| TASK-004 | `src/insight/project-tree.ts` | 🛠 | L | 001/002/003 | Wave 3 | — | 纯投影 + 确定性（站点/能力/命令/LLM 四分组 + crossLinks + 固定排序 + 规范 JSON + FNV-1a 哈希 + 空态降级） |
| TASK-005 | `build-snapshot.ts` + `state-message.ts`/`messaging.ts`/`service-worker.ts`/`host.ts` | 🛠 | M | 004 | Wave 4 | — | 薄 builder（注入式读）+ additive 消息面（`insight-tree` pull / `insight-changed` push / `state.insight?`）+ 只读 `delayConfig()` |
| TASK-006 | `test/insight-projection.test.ts` | ⚖️ | M | 005 | Wave 5 | ∥ 007/008/009 | `insight-projection` 门禁：四维度字段真值 / additive 兼容 / 零副作用 / 零明文 / ≥3 类空态 |
| TASK-007 | `test/insight-determinism.test.ts` | ⚖️ | S | 004 | Wave 5 | ∥ 006/008/009 | `insight-determinism` 门禁：两次投影 deep-equal + `meta.hash` 相等（`builtAt` 不进 hash） |
| TASK-008 | `test/insight-catalog.test.ts` | ⚖️ | M | 003/004 | Wave 5 | ∥ 006/007/009 | `insight-catalog` 门禁：**34 工具 / 142 子命令双向等价 + 反证 + 同源锚定 + 过滤只读** |
| TASK-009 | `test/insight-no-escalation.test.ts` | ⚖️ | S | 005 | Wave 5 | ∥ 006/007/008 | `insight-no-escalation` 基础段：`src/insight/**` 无 `chrome.*` / 无写 store / 无 `apiKey` / 无 bare `catch` + policy 判定表 pinned |

### 1.2 依赖拓扑（串行主轴 + 并行组）

```
Wave 1（纯类型 + 能力目录，无依赖）：
  TASK-001 [M] 🛠 tree-model.ts（类型/稳定键/Badge/crossLink/成因/来源/控件）+ capability-catalog.ts

Wave 2（并行组 ①：均依赖 001；文件不相交）：
  TASK-002 [L] 🛠 command-catalog.ts（逐条有档 + V2-4 预留位）        [Wave 2]
  TASK-003 [M] 🛠 catalog-reconcile.ts（单基线 + 双向 + 同源锚定）    [Wave 2]

Wave 3（串行：消费 001/002/003）：
  TASK-004 [L] 🛠 project-tree.ts（纯投影 + 确定性 + crossLinks + 降级）

Wave 4（串行：消费 004 输出的快照契约）：
  TASK-005 [M] 🛠 build-snapshot.ts + state-message.ts/messaging.ts/service-worker.ts/host.ts（additive 接线）

Wave 5（并行组 ②：门禁，均以 Wave 1~4 落成为前提；⚠️ 门禁执行串行）：
  TASK-006 [M] ⚖️ insight-projection
  TASK-007 [S] ⚖️ insight-determinism
  TASK-008 [M] ⚖️ insight-catalog（34 / 142）
  TASK-009 [S] ⚖️ insight-no-escalation（基础段；V2-3 TASK-007 扩展）
```

### 1.3 并行分组（执行波次）

```
Wave 1 ─── (串行：类型层是全部后续模块的编译前提)
  TASK-001 [M] 🛠 类型层 + 能力目录

Wave 2 ─── (并行组 ①：文件不相交)
  TASK-002 [L] 🛠 命令档案（command-catalog.ts）
  TASK-003 [M] 🛠 对账模块（catalog-reconcile.ts）

Wave 3 ─── (串行)
  TASK-004 [L] 🛠 纯投影 + 确定性（project-tree.ts）

Wave 4 ─── (串行)
  TASK-005 [M] 🛠 builder + additive 消息面接线

Wave 5 ─── (并行编写，⚠️ 门禁执行串行)
  TASK-006 [M] ⚖️ insight-projection.test.ts
  TASK-007 [S] ⚖️ insight-determinism.test.ts
  TASK-008 [M] ⚖️ insight-catalog.test.ts
  TASK-009 [S] ⚖️ insight-no-escalation.test.ts（基础段）
```

---

## 2. 任务列表

> 缩写：V21 = 本叶子（specs-tree-v2-1-connect-tree-model）；ADR-NN = 父 `plan.md` §8（ADR-V2-NN）；FR/NFR/EC/AC = 父 `spec.md` 条文；NFR-V21 / EC-V21 / AC-V21 = 本叶子 `spec.md`。
> **每任务独立可验证**：✅ = 任务自身验证命令可自证完成，不依赖后续任务。

### TASK-001: 类型层 + 能力目录投影（tree-model.ts + capability-catalog.ts）

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **类型** | 🛠 实施（纯类型 + 纯投影，node 可测） |
| **前置依赖** | 无 |
| **执行波次** | Wave 1 |
| **对应 FR** | FR-V2-010/012（+ FR-V2-011 站点节点类型） |
| **承接 ADR** | ADR-V2-001（森林模型）、ADR-V2-002（稳定键）、ADR-V2-003（crossLinks）、ADR-V2-011（`revocable`）、ADR-V2-012（V2-4 预留位）、ADR-V2-015（禁触面） |

**输入**: V2-1 plan §3.1（类型全文）+ §3.4（能力目录）+ 父 plan §2.1（能力面状态源）+ 父 spec FR-V2-010/012/017

**描述**: 建立 V2-1 的类型契约与能力维度投影。(1) `tree-model.ts`：`Dimension` / `Badge` / `CrossLink` / `SiteNode` / `CapabilityNode` / `CommandNode` / `LlmNode` / `TreeGroup` / `TreeActionId` / `DenyCause` / `SourceKind` / `ControlDescriptor` / `CatalogFacets` / `SnapshotMeta` / `CatalogMeta` / `ConnectTreeSnapshot`（`version: 1` + `modelNote` + `root` + `groups: [4]` + `facets` + `meta` + `catalogMeta?`）+ **命名空间稳定键生成器**（`site:` / `cap:static:` / `cap:opt:` / `toggle:` / `cmd:` / `cmd:<name>#<sub>` / `llm:` / `session:` / `link:<from>→<to>`）。(2) `capability-catalog.ts`：静态权限 5 项（`source:'static'`、`granted:true`、`revocable:false`、`revokeHint` 如实披露、`controls` 不含 `revoke`）+ 4 可选能力（`source:'optional'`、`granted` 为实测注入值、`revocable:true`）+ 6 隐私开关 + `tabs-enabled`（`source:'toggle'`、`controls` 给 `toggle`）。**零 IO、零 `chrome.*`**（数据由 deps 注入）。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| NEW | `packages/web-cli-plugin/src/insight/tree-model.ts` |
| NEW | `packages/web-cli-plugin/src/insight/capability-catalog.ts` |

**验收标准**:
- [ ] `ConnectTreeSnapshot.version === 1`；`modelNote` 含「四维度分组视图（森林）」与「非严格单树」；`groups` 为**固定序**四元组（站点/能力/命令/LLM）
- [ ] 稳定键生成器产出上表全部命名空间前缀，且**同输入同键**（纯函数，可单测）
- [ ] 静态权限 5 项：`revocable:false` + `revokeHint` 含「不可逐项撤销（需停用/卸载扩展）」+ `controls` 无 `revoke`（AC-V21-001 / FR-V2-012 / FR-V2-038 前置）
- [ ] 4 可选能力：`granted` 取注入实测态（**不由隐私开关决定**）；`revocable:true`
- [ ] 6 隐私开关 + `tabs-enabled`：`source:'toggle'`、`enabled` 为真值、`controls` 给 `toggle`
- [ ] `DenyCause` / `SourceKind` 8 值枚举 / `cardId` 字段在类型中显式存在（V2-4 预留，ADR-V2-012）
- [ ] `src/insight/tree-model.ts` / `capability-catalog.ts` 无 `chrome.`、无写 store 导入、无 `apiKey`（grep）
- [ ] `npm run typecheck` 0 error

**验证命令**:
```bash
cd packages/web-cli-plugin
npm run typecheck
! grep -rnE "chrome\.|apiKey" src/insight/tree-model.ts src/insight/capability-catalog.ts
```

### TASK-002: 命令档案投影（command-catalog.ts，逐条有档 + V2-4 预留位）

| 属性 | 值 |
|------|-----|
| **复杂度** | L |
| **类型** | 🛠 实施（纯投影，node 可测） |
| **前置依赖** | TASK-001 |
| **执行波次** | Wave 2 |
| **对应 FR** | FR-V2-013/051/052/054/055/056（+ FR-V2-064） |
| **承接 ADR** | ADR-V2-011（deny 无开关）、ADR-V2-012（预留位）、ADR-V2-014（delayMs 只读） |

**输入**: V2-1 plan §3.3 + 父 plan §2.1 命令面 + v1 `security/policy.ts`（只读真值）+ `test/parity/baseline-catalog.json`

**描述**: 对 `deps.toolSurface()` 的每个工具（+ 子命令）逐条有档。推导链：`group==='site'` → S1（未授权 origin → `deny`/`s1-unauthorized`）/ S3（risk 缺失或非法 → `deny`/`s3-unknown-risk`）/ `PLUGIN_RISK_DEFAULTS[risk]`（`evaluate`→`deny`/`evaluate-floor`；`write|external|ui|state`→`ask`；`read`→`allow`）；非 site 工具 → `PLUGIN_RISK_DEFAULTS[risk]`（缺失 → `deny`/`s3-unknown-risk`）。字段：`action`、`denyCause`、`sourceKind`（8 值）、`delayMs`（来自注入 `deps.delayMs`，**与 `action` 分列**）、`presentInSurface`、`suppressed`/`suppressionReason`、`cardId = cmd:<name>#<sub>`、`controls`（**`action==='deny'` 恒 `[]`**）。`auto-hardDeny` → 徽标 `hard-deny`，**不改变 `action` 真值**。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| NEW | `packages/web-cli-plugin/src/insight/command-catalog.ts` |

**验收标准**:
- [ ] `action` 推导与 `PLUGIN_RISK_DEFAULTS` + S1/S2/S3 真值一致；risk 未知/缺失/非法 → `deny` + `s3-unknown-risk`（FR-V2-064）
- [ ] `denyCause` 四值分列：`s1-unauthorized` / `s3-unknown-risk` / `evaluate-floor` / `auto-hardDeny`（V2-4 预留，FR-V2-051 前置）
- [ ] `sourceKind` 8 值分类与注册真值一致（`site_`→`site-declared`；`admin_`→`plugin-admin`；`tabs`→`plugin-tabs`；4 可选能力工具名→`plugin-*`；其余→`base-builtin`）（FR-V2-055 前置）
- [ ] `delayMs` 与 `action` **分列字段**（不合成、不新增第三档；FR-V2-054 前置）
- [ ] `suppressed`/`suppressionReason`：`presentInSurface===false` 时给可读原因（tabs 关 / 能力未授权或未开启 / 站点未授权）
- [ ] **`action==='deny'` ⇒ `controls === []`**（结构保证，ADR-V2-011）
- [ ] 无 `chrome.` / 无写 store / 无 `apiKey`；`npm run typecheck` 0 error

**验证命令**:
```bash
cd packages/web-cli-plugin
npm run typecheck
! grep -rnE "chrome\.|apiKey" src/insight/command-catalog.ts
```

### TASK-003: 对账模块（catalog-reconcile.ts，单基线 + 双向 + 同源锚定）

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **类型** | 🛠 实施（纯逻辑，node 可测） |
| **前置依赖** | TASK-001 |
| **执行波次** | Wave 2 |
| **对应 FR** | FR-V2-015/053（+ AC-V21-002/007） |
| **承接 ADR** | ADR-V2-010（parity 同源，**不重构 v1 `parity.test.ts`**） |

**输入**: V2-1 plan §3.5 + `test/parity/baseline-catalog.json`（`toolCount=34`、子命令合计 **142**、`provenance.commit`）+ `test/parity/waivers.json`

**描述**: 实现与 v1 parity **单一来源**的对账模块：`loadBaseline()` / `loadWaivers()`（读 `test/parity/baseline-catalog.json` + `waivers.json`，**不新增第二份基线**）；`reconcileCatalog(actual, baseline, waivers)` → `{ missing, missingSubs, unregistered, extraStale }`（**双向**）。导出基线路径字面量常量，供同源锚定测试断言 V2 模块与 `test/parity.test.ts` **引用同一路径**。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| NEW | `packages/web-cli-plugin/src/insight/catalog-reconcile.ts` |

**验收标准**:
- [ ] 只读**单一**基线文件（不新建/不复制基线）；`loadBaseline()` 读出 `toolCount=34`、子命令合计 **142**、`provenance.commit` 为全 SHA
- [ ] `reconcileCatalog` 为**双向**：漏命令 / 漏子命令 / 未注册 / 过期 waivers 均能报告
- [ ] 导出基线路径字面量常量（与 v1 `test/parity.test.ts` 同源锚点，供 TASK-008 断言）
- [ ] **不修改** `packages/web-cli-plugin/test/parity.test.ts` 与 `test/parity/**`（v1 validated 门禁只读）
- [ ] 无 `chrome.` / 无写 store / 无 `apiKey`；`npm run typecheck` 0 error

**验证命令**:
```bash
cd packages/web-cli-plugin
npm run typecheck
node -e "const b=require('./test/parity/baseline-catalog.json'); const subs=b.tools.reduce((n,t)=>n+(t.subcommands?.length??0),0); if(b.toolCount!==34||subs!==142) throw new Error('baseline drift: '+b.toolCount+'/'+subs); console.log('parity baseline 34/'+subs+' ok')"
git -C ../.. diff --quiet -- packages/web-cli-plugin/test/parity.test.ts packages/web-cli-plugin/test/parity
```

### TASK-004: 纯投影 + 确定性（project-tree.ts）

| 属性 | 值 |
|------|-----|
| **复杂度** | L |
| **类型** | 🛠 实施（纯函数投影） |
| **前置依赖** | TASK-001/002/003 |
| **执行波次** | Wave 3 |
| **对应 FR** | FR-V2-010/011/014/015/016/017 |
| **承接 ADR** | ADR-V2-001/002/003 |

**输入**: V2-1 plan §3.2 + 父 plan §2.1 四维度状态源

**描述**: `projectInsightTree(source, opts?)`：顺序投影站点 / 能力 / 命令 / LLM 四维度 → `linkCrossRefs()`（多对多，**不复制节点**）→ `facets` → `meta`（`hash` / `counts` / `sources` / `degradations`）。确定性：固定排序（站点 `localeCompare`；能力 = 静态 manifest 序 → `OPTIONAL_CAPABILITIES` 序 → `CAPABILITY_SETTING_DEFAULTS` 键序；命令 = `toolSurface()` 稳定序 + 子命令 enum 序；LLM/session = `lastActiveAt` 降序再 `sessionId`）+ `stableStringify`（键字典序）+ 纯 FNV-1a 哈希（**无新依赖**，`builtAt` 不进 hash 输入）。空态/降级：无站点 / 无授权站点 / 未配置 LLM / 无命令 → `meta.degradations[]` 可读条目（≥3 类）；读失败沿用 store fail-safe 默认并标降级，**不当作空/已撤销**。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| NEW | `packages/web-cli-plugin/src/insight/project-tree.ts` |

**验收标准**:
- [ ] 森林模型：`root.label='本插件'` + 四分组（固定序）；跨层引用以显式 `crossLinks` 表达（含 `link:<from>→<to>` 排序数组）
- [ ] 站点节点：`origin`/`authorized`/`trust`/`authorizedAt` 与 `OriginStore.list()` 真值一致；**未授权站点可见**；「可取消授权」仅在 `authorized===true`（FR-V2-011）
- [ ] 能力节点：静态权限 `revocable:false`；可选能力 `granted` 为实测；开关 `enabled` 真值（FR-V2-012）
- [ ] 命令集合 == 注入 `toolSurface()` 真值（不重不漏）（FR-V2-015）
- [ ] LLM 节点字段 == `LlmStatusSummary`；**树内无改绑/编辑 key 入口**（FR-V2-014）
- [ ] 确定性：同输入两次投影 `deep-equal` 且 `meta.hash` 相等（FR-V2-015）
- [ ] 零副作用：不 mutate 输入对象、不写存储、不写审计（FR-V2-016）
- [ ] ≥3 类空态/降级可读（`meta.degradations`）（FR-V2-017 / EC-V21-001~005）
- [ ] 无 `chrome.` / 无写 store / 无 `apiKey`；`npm run typecheck` 0 error

**验证命令**:
```bash
cd packages/web-cli-plugin
npm run typecheck
! grep -rnE "chrome\.|apiKey" src/insight/project-tree.ts
```

### TASK-005: 薄 builder + additive 消息面接线（build-snapshot + state-message / messaging / service-worker / host）

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **类型** | 🛠 实施（薄接线，additive） |
| **前置依赖** | TASK-004 |
| **执行波次** | Wave 4 |
| **对应 FR** | FR-V2-016/013（+ FR-V2-003） |
| **承接 ADR** | ADR-V2-004（消息面 additive）、ADR-V2-014（`delayConfig()` 只读） |

**输入**: V2-1 plan §3.6 + 父 plan §2.3（数据流）

**描述**: (1) `build-snapshot.ts`：纯 `buildInsightTreePayload(deps)`——把注入的已读数据规范化为 `InsightSource` 后转调 `projectInsightTree`；**builder 不触 `chrome.*`**（node 可测）。(2) `state-message.ts`：`StateMessagePayload` **追加可选** `insight?: InsightSummary`（仅 counts/badges 小对象；既有字段语义零变更）。(3) `messaging.ts`：`PluginMessageKind` **追加** `insight-tree` / `insight-changed`（不改既有语义）。(4) `service-worker.ts`：**追加** `case 'insight-tree'`（调用 builder；唯一触 `chrome.*` 的调用方）；状态变化后推 `insight-changed`（**不携带敏感数据**）；既有 case 零改动。(5) `host.ts`：**仅追加只读 accessor** `delayConfig()`（暴露 `delayMs:0` 真值）。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| NEW | `packages/web-cli-plugin/src/insight/build-snapshot.ts` |
| MODIFY | `packages/web-cli-plugin/src/background/state-message.ts`（追加可选 `insight?`，additive） |
| MODIFY | `packages/web-cli-plugin/src/background/messaging.ts`（追加 2 个 kind） |
| MODIFY | `packages/web-cli-plugin/src/background/service-worker.ts`（追加 1 个 case + 推送；既有 case 零改动） |
| MODIFY | `packages/web-cli-plugin/src/background/host.ts`（追加只读 `delayConfig()`） |

**验收标准**:
- [ ] `build-snapshot.ts` 无 `chrome.`（grep）；node 可测（注入 fake deps 产出快照）
- [ ] `state.insight?` 为**可选**字段：既有消费者忽略未知可选字段零破坏；既有字段 `Object.keys` 与语义零变更（回归断言）
- [ ] `insight-tree`（pull，返回完整 `ConnectTreeSnapshot`）/ `insight-changed`（push，不携带敏感数据）可往返
- [ ] `service-worker.ts` 既有 case **零删改**（`git diff` 仅新增行）
- [ ] `host.delayConfig()` 为**只读** accessor；默认 `delayMs:0` 可透出、非 0 可透出（不硬编码）（FR-V2-013 / ADR-V2-014）
- [ ] `npm run build` + `npm run typecheck` 0 error；v1 既有 `test/state-message.test.ts` 零回归

**验证命令**:
```bash
cd packages/web-cli-plugin
npm run build && npm run typecheck
! grep -n "chrome\." src/insight/build-snapshot.ts
git -C ../.. diff --unified=0 -- packages/web-cli-plugin/src/background/service-worker.ts | grep -E "^-" | grep -v "^---" || echo "service-worker.ts 仅有新增行（零删改）"
```

### TASK-006: 门禁 `insight-projection`（字段真值 / additive / 零副作用 / 零明文 / 空态）

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **类型** | ⚖️ 门禁（node 单测） |
| **前置依赖** | TASK-005 |
| **执行波次** | Wave 5 |
| **对应 FR** | AC-V21-001/004/005/006（+ AC-V2-001） |

**描述**: **新文件**承载 V2-1 投影正确性断言：四维度字段逐项 == v1 状态源真值；`state` 消息 additive 兼容（既有 `Object.keys` 回归 + 旧字段语义零变更）；纯读零副作用（投影前后存储 diff 为空、无审计新增）；零明文（无 key / 剪贴板 / 通知内容）；**≥3 类空态/降级可读**（无站点 / 无授权站点 / 未配置 LLM / 无命令）。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| NEW | `packages/web-cli-plugin/test/insight-projection.test.ts` |

**验收标准**:
- [ ] 四维度字段与 v1 真值逐项核对（站点/能力/命令/LLM）
- [ ] `state` additive：既有字段 `Object.keys` 无删除/改名；`insight?` 可选
- [ ] 零副作用：投影前后 storage diff 为空 + 审计零新增
- [ ] 零明文：投影输出序列化后 grep 零命中 `apiKey`/剪贴板/通知正文
- [ ] ≥3 类空态/降级断言可读文案
- [ ] **不修改 v1 任何既有测试文件**；`npm test` 串行全绿

**验证命令**:
```bash
cd packages/web-cli-plugin
npm test
# 串行执行（绝不与 test:ui / test:binding 并发）
```

### TASK-007: 门禁 `insight-determinism`（两次投影一致 + hash 相等）

| 属性 | 值 |
|------|-----|
| **复杂度** | S |
| **类型** | ⚖️ 门禁（node 单测） |
| **前置依赖** | TASK-004 |
| **执行波次** | Wave 5 |
| **对应 FR** | AC-V21-003（+ FR-V2-015） |

**描述**: **新文件**承载确定性断言：同输入两次投影 `deep-equal` 且 `meta.hash` 相等；`builtAt` **不进** hash 输入；固定排序对输入序不敏感（打乱集合顺序仍同 hash）。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| NEW | `packages/web-cli-plugin/test/insight-determinism.test.ts` |

**验收标准**:
- [ ] 两次投影 `deep-equal` + `hash` 全等
- [ ] `builtAt` 变化不影响 `hash`
- [ ] 集合输入顺序打乱后 `hash` 不变（固定排序证明）
- [ ] `npm test` 全绿

**验证命令**:
```bash
cd packages/web-cli-plugin && npm test
```

### TASK-008: 门禁 `insight-catalog`（34 工具 / 142 子命令双向等价 + 反证 + 同源锚定）

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **类型** | ⚖️ 门禁（node 单测） |
| **前置依赖** | TASK-003/004 |
| **执行波次** | Wave 5 |
| **对应 FR** | AC-V21-002/007（+ AC-V2-004 前置） |
| **承接 ADR** | ADR-V2-010 |

**描述**: **新文件**承载对账门禁：树命令集合 == `deriveTools()` + registry **双向集合等价**；工具 **34/34**、子命令合计 **142**（覆盖率 100%）；丢一条 → FAIL（**反证自测**）；**同源锚定**（断言 V2 `catalog-reconcile.ts` 与 `test/parity.test.ts` 引用**同一基线路径字面量**）；过滤只读（过滤前后授权状态 diff 为空）。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| NEW | `packages/web-cli-plugin/test/insight-catalog.test.ts` |

**验收标准**:
- [ ] 双向集合等价（不重不漏）；工具 34、子命令 142、覆盖率 100%
- [ ] `denyCause` 分类正确（S1/S3/evaluate/hardDeny）
- [ ] **反证自测**：人为丢一条命令 → 断言 FAIL（证明门禁可证伪）
- [ ] 同源锚定：V2 模块与 `test/parity.test.ts` 引用同一基线路径字面量
- [ ] 过滤只读：过滤前后存储/授权状态 diff 为空
- [ ] `npm test` 全绿；v1 `test/parity.test.ts` 零改动

**验证命令**:
```bash
cd packages/web-cli-plugin && npm test
```

### TASK-009: 门禁 `insight-no-escalation` 基础段（导入白名单 / policy pinned / 无 bare catch）

| 属性 | 值 |
|------|-----|
| **复杂度** | S |
| **类型** | ⚖️ 门禁（node + grep） |
| **前置依赖** | TASK-005 |
| **执行波次** | Wave 5 |
| **对应 FR** | FR-V2-003/016/065（+ AC-V2-005 前置） |
| **承接 ADR** | ADR-V2-015（来源约束） |

**描述**: **新文件**建立 V2 来源约束门禁（**基础段**；V2-3-TASK-007 在其上**追加** tree 层断言，**不删减**）：`src/insight/**` 无 `chrome.*`、无写 store 导入、无 `apiKey` 标识符；无 bare `catch {}` 吞错；`PLUGIN_RISK_DEFAULTS` 判定表 **pinned**（read→allow / write·external·ui·state→ask / evaluate→deny）。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| NEW | `packages/web-cli-plugin/test/insight-no-escalation.test.ts` |

**验收标准**:
- [ ] `src/insight/**` grep：无 `chrome.`、无写 store 导入、无 `apiKey`
- [ ] 无 bare `catch {}`（grep）
- [ ] `PLUGIN_RISK_DEFAULTS` pinned 判定表深度相等
- [ ] 门禁为**只追加容器**：本任务建立基础断言，V2-3-TASK-007 追加 tree 层，**零删减**
- [ ] `npm test` 全绿

**验证命令**:
```bash
cd packages/web-cli-plugin && npm test
! grep -rnE "catch\s*\([^)]*\)\s*\{\s*\}" src/insight
```

---

## 3. 任务汇总

| 统计项 | 数值 |
|--------|:--:|
| 总任务数 | **9** |
| S 级 | 2（TASK-007/009） |
| M 级 | 5（TASK-001/003/005/006/008） |
| L 级 | 2（TASK-002/004） |
| 执行波次 | **5**（Wave 1~5；叶内） |
| 实施任务（🛠） | 5（001~005） |
| 门禁任务（⚖️） | 4（006~009） |
| P0 必做 | 全部 9 |
| 新建文件 | 10（6 src + 4 test） |
| 修改文件 | 4（`state-message.ts` / `messaging.ts` / `service-worker.ts` / `host.ts`） |

### 3.1 交付门槛矩阵（本叶子）

| 门禁 | 命令 | 断言要点 | 新增 vs 追加 | 承载任务 |
|------|------|----------|:--:|:--:|
| `insight-projection` | `npm test` | 四维度字段真值 / `state` additive / 零副作用 / 零明文 / ≥3 空态 | **新增文件** `test/insight-projection.test.ts` | TASK-006 |
| `insight-determinism` | `npm test` | 两次投影 deep-equal + `hash` 全等（`builtAt` 不进 hash） | **新增文件** `test/insight-determinism.test.ts` | TASK-007 |
| `insight-catalog` | `npm test` | **34 工具 / 142 子命令**双向等价 + 反证 + 同源锚定 + 过滤只读 | **新增文件** `test/insight-catalog.test.ts` | TASK-008 |
| `insight-no-escalation`（基础段） | `npm test` + grep | `src/insight/**` 无 `chrome.*`/写 store/`apiKey`；无 bare catch；policy pinned | **新增文件**（V2-3-TASK-007 追加） | TASK-009 |
| v1 回归 | `npm test` | v1 既有测试零删减、全绿 | 零改动 v1 测试 | TASK-006~009 |

---

## 4. 执行策略

### 4.1 门禁串行纪律（NFR-V2-009，绝不并发）

```bash
npm run build --workspace @lgdl/web-cli-plugin
npm test --workspace @lgdl/web-cli-plugin      # 含 V2-1 新增 insight-* 门禁
# 逐条串行；任何一步 fail 即停，修复后从头串行重跑；绝不与 test:ui / test:binding 并发
```

### 4.2 断言只增不减（具体保证方式）

| 类别 | 文件 | 方式 |
|------|------|------|
| V2-1 新增断言 | `test/insight-projection.test.ts` / `insight-determinism.test.ts` / `insight-catalog.test.ts` / `insight-no-escalation.test.ts` | **全部新增文件**（v1 无同名文件） |
| v1 既有断言 | v1 全部 `test/*.test.ts` + `test/parity.test.ts` + `test/perf-budget.test.ts` | **零删改**；核验方式：`git diff --name-only` 断言 v1 测试文件不在变更集；`git diff` 断言 `test/parity/**` 零变更 |
| 同源锚定 | `catalog-reconcile.ts` 与 `test/parity.test.ts` | 路径字面量同源断言，防双份真值漂移 |

### 4.3 文件所有权（防并行冲突）

- `src/insight/tree-model.ts` → TASK-001 建立后只读（TASK-002/003/004 消费）；
- `src/background/{state-message,messaging,service-worker,host}.ts` 全部由 TASK-005 **单任务所有权**（同文件不跨任务并行）；
- `test/insight-no-escalation.test.ts` 由 TASK-009 **建立**，V2-3-TASK-007 **追加**（跨叶子串行，零删减）。

### 4.4 编排器代作者决策登记（2026-09-13 授权）

| # | 事项 | 裁决 |
|---|------|------|
| TD-V21-01 | 任务粒度 | plan §3.1~3.6 六模块 → 5 实施 + 4 门禁；`tree-model`+`capability-catalog` 合并（同属类型/静态投影），`build-snapshot`+消息接线合并（同属 thin wiring 且文件所有权单点） |
| TD-V21-02 | 门禁归属 | `test/insight-no-escalation.test.ts` 由 TASK-009 **建立基础段**，V2-3-TASK-007 **追加** tree 层；避免两叶子各自 NEW 同文件冲突 |
| TD-V21-03 | 波次 | 叶内 5 波；跨叶子 V2-1 先行（Wave 1~5），V2-2（Wave 6~9）、V2-3（Wave 10~13）在 V2-1 完成后执行 |

---

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建。V2-1 plan §3.1~3.6 → **9 个原子任务 / 5 波**（类型+能力目录 / 命令档案 / 对账 / 纯投影 / builder+additive 接线 / 4 门禁）。门禁矩阵：`insight-projection` / `insight-determinism` / `insight-catalog`（34·142 双向 + 反证 + 同源锚定）/ `insight-no-escalation`（基础段）。断言只增不减（4 门禁全为新增文件）。承接父 plan ADR-V2-001/002/003/004/010/012/014/015。 | 2026-09-13 | SDDU Tasks Agent |
