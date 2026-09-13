# 技术计划：specs-tree-v2-1-connect-tree-model（V2-1 连接树数据模型与状态投影）

> **文档定位**: SDDU 技术方案（**叶子子 Feature**，P0）——记录 V2-1 的架构设计、方案对比与 ADR，作为 tasks 阶段的输入
> **前置依赖**: 父 `spec.md` §5.2（FR-V2-010~017 权威条文）+ 本目录 `spec.md`（范围收缩与子级验收）+ 父 `plan.md`（统领性方案 + ADR-V2-001~015）
> **创建人**: SDDU Plan Agent · **创建时间**: 2026-09-13 · **版本**: v1.0 · **更新人/时间**: SDDU Plan Agent / 2026-09-13
> **更新说明**: 初始创建。四维度 → 单一可投影树模型的确定性快照；纯读、零副作用、零明文；**不渲染 UI**、**不做写操作**。

---

## 1. 前置检查

| 检查项 | 状态 |
|--------|:--:|
| 父 `spec.md`（FR-V2-010~017）与本目录 `spec.md` 存在 | ✅ |
| 外部 API 文档缓存 | ⚠️ N/A（无外部 API；状态源为 v1 进程内 store + base registry） |
| 前置依赖（v1 状态源）已交付并逐文件核实 | ✅（父 plan §2.1） |
| 父 plan 的 ADR-V2-001~015 已产出 | ✅ |

---

## 2. 架构分析

### 2.1 现状（V2-1 的输入真值）

| 维度 | 输入 | 读取方式（投影**不**直连 `chrome.*`） |
|------|------|--------------------------------------|
| 站点 | `OriginStore.list()`（`authorized`/`trust`/`authorizedAt`/`updatedAt`/`note`） | `deps.listOrigins()` |
| 能力 | 静态权限常量（manifest 5 项）+ `OPTIONAL_CAPABILITIES` + 扩展页 `hasCapabilityPermission` 实测 + `capabilitySetting.get()` + `tabsSetting.get()` | `deps.capabilityGrants` / `deps.capabilitySetting` / `deps.tabsEnabled` |
| 命令 | `host.deriveTools()`（工具面真值）+ `host.router.query({name})`（risk/group/subcommand enum）+ `host.delayConfig()` | `deps.toolSurface()`（已抽取的平面条目） |
| LLM | `toLlmStatusSummary(maskedConfig())` + `sessionStore.state()` | `deps.llmStatus` / `deps.sessions` |

> **投影内零 IO、零 `chrome.*`**：与 v1 `state-message.ts`（纯 `buildStateMessage`）同模式；background 只做薄组装。

### 2.2 目标：单一快照 + 四层分组（森林）

- 以「本插件」为根，四个**并列分组**（站点 / 能力 / 命令 / LLM）；允许跨层引用；`modelNote` 如实声明「非严格单树」（FR-V2-010）。
- 快照是 V2-2（渲染）、V2-3（动作控件）、V2-4（档案卡）的**唯一**数据来源。
- 命令集合 **==** `deriveTools()` + registry 真值 + parity 基线（34 工具 / 142 子命令），**不重不漏**。

### 2.3 数据流

```
deps（注入：已读平面数据）
   └─► buildInsightSource()  （薄，src/insight/build-snapshot.ts）
          └─► projectInsightTree(source)  （纯，src/insight/project-tree.ts）
                 ├─ projectSites()      （site 分组）
                 ├─ projectCapabilities()（capability 分组；capability-catalog.ts）
                 ├─ projectCommands()   （command 分组；command-catalog.ts）
                 ├─ projectLlm()        （llm 分组）
                 └─ linkCrossRefs()     （crossLinks 聚合）
                        └─► ConnectTreeSnapshot（确定性，含 meta.hash / facets）
```

---

## 3. 分模块技术方案

### 3.1 `src/insight/tree-model.ts`（类型）

```ts
export type Dimension = 'site' | 'capability' | 'command' | 'llm';
export type BadgeKind = 'authorized' | 'unauthorized' | 'revocable' | 'granted' | 'not-granted'
                      | 'action-allow' | 'action-ask' | 'action-deny' | 'suppressed' | 'hard-deny'
                      | 'trusted' | 'untrusted';
export interface Badge { kind: BadgeKind; label: string; tone: 'ok'|'warn'|'danger'|'muted'; }
export interface CrossLink { id: string; from: string; to: string; kind: 'origin'|'permission'|'tool'|'session'; label: string; }

export interface SiteNode { id; kind:'site'; origin; label; authorized; trust;
  authorizedAt?: number; updatedAt: number; revocable: true; crossLinks: CrossLink[]; badges: Badge[]; }
export interface CapabilityNode { id; kind:'capability'; source:'static'|'optional'|'toggle';
  capability?: OptionalCapability; scope?: 'read'|'write'; permission: string;
  granted: boolean; enabled: boolean; revocable: boolean; revokeHint?: string;
  crossLinks: CrossLink[]; badges: Badge[]; }
export type TreeActionId = 'revoke-origin'|'revoke-capability'|'set-capability-toggle'|'set-tabs-toggle'
                         | 'clear-auto-auth'|'disconnect-llm'|'dissolve-group';
export interface CommandNode { id; kind:'command'; cardId; name; subcommand?: string; group: string;
  risk?: ToolRisk; action: 'allow'|'ask'|'deny'; denyCause?: DenyCause; sourceKind: SourceKind;
  delayMs: number; presentInSurface: boolean; suppressed: boolean; suppressionReason?: string;
  crossLinks: CrossLink[]; badges: Badge[]; controls: ControlDescriptor[]; }  // deny ⇒ controls: []
export interface LlmNode { id; kind:'llm'; providerId?: string; providerName?: string; model?: string;
  configured: boolean; active: boolean; sessions: SessionNode[]; crossLinks: CrossLink[]; badges: Badge[]; }

export type DenyCause = 's1-unauthorized'|'s3-unknown-risk'|'evaluate-floor'|'auto-hardDeny';
export type SourceKind = 'site-declared'|'plugin-admin'|'plugin-tabs'|'plugin-bookmarks'
                       | 'plugin-downloads'|'plugin-notify'|'plugin-clipboard'|'base-builtin';
export type ControlDescriptor = { kind:'revoke'|'toggle'|'disconnect'|'confirm-action'|'none'; actionId?: TreeActionId; label: string; };

export interface CatalogFacets { actions: Record<string,number>; risks: Record<string,number>;
  sources: Record<string,number>; origins: string[]; subcommands: number; }
export interface SnapshotDegradation { dimension: Dimension; code: string; text: string; }
export interface SnapshotMeta { builtAt: number; hash: string; counts: { sites:number; capabilities:number;
  commands:number; subcommands:number; llms:number; sessions:number }; sources: string[];
  degradations: SnapshotDegradation[]; modelNote: string; }
export interface CatalogMeta { toolCount: number; subcommandCount: number; provenanceCommit: string; }
export interface ConnectTreeSnapshot { version: 1; root: { id:'root'; label:'本插件'; dimensions: Dimension[] };
  groups: [TreeGroup,TreeGroup,TreeGroup,TreeGroup]; facets: CatalogFacets; meta: SnapshotMeta;
  catalogMeta?: CatalogMeta; }
```

### 3.2 `src/insight/project-tree.ts`（纯投影 + 确定性）

1. `projectInsightTree(source, opts?)`：顺序投影四维度 → `linkCrossRefs()` → `facets` → `meta.hash`。
2. **稳定键**（ADR-V2-002）：`site:<normalized origin>`、`cap:static:<permission>`、`cap:opt:<capability>`、`toggle:<key>`、`cmd:<name>` / `cmd:<name>#<sub>`、`llm:<providerId>`、`session:<sessionId>`、`link:<from>→<to>`。
3. **固定排序**：站点 `localeCompare`；能力 = 静态（manifest 序）→ 可选（`OPTIONAL_CAPABILITIES` 序）→ 开关（`CAPABILITY_SETTING_DEFAULTS` 键序，含 `tabs-enabled`）；命令 = `deps.toolSurface()` 序 + 子命令 enum 序；LLM/session 按 `lastActiveAt` 降序再 `sessionId`。
4. `stableStringify`（键字典序）+ FNV-1a → `meta.hash`（**无新依赖**）。
5. **空态/降级**：无站点 / 无授权站点 / 未配置 LLM / 无命令 → `meta.degradations` 可读条目（≥3 类，AC-V21-006）；读失败沿用各 store fail-safe 默认并标降级，**不当作空/已撤销**（EC-V21-002）。
6. **零副作用**：纯函数，不写存储、不写审计（断言输入对象未被 mutate + 前后存储 diff 空）。

### 3.3 `src/insight/command-catalog.ts`（逐条有档 + V2-4 预留位）

- 输入 `ToolSurfaceEntry[]`：`{ name, group, risk?, subcommands: string[], presentInSurface: boolean }`。
- `action` 推导：`group==='site'` → S1（未授权 → deny/s1）/ S3（risk 缺失或非法 → deny/s3）/ `PLUGIN_RISK_DEFAULTS[risk]`（evaluate→deny/evaluate-floor；write|external|ui|state→ask；read→allow）；非 site → `PLUGIN_RISK_DEFAULTS[risk]`（缺失 → deny/s3）。
- `sourceKind`：`site_` 前缀或 `group==='site'` → `site-declared`；`admin_` → `plugin-admin`；`tabs` → `plugin-tabs`；4 可选能力工具名（`OPTIONAL_CAPABILITY_TOOL` 值）→ 对应 `plugin-*`；其余 → `base-builtin`。
- `delayMs`：来自 `deps.delayMs`（background 经 `host.delayConfig()` 注入）；**与 `action` 分列**，`delay` 文案消歧由 V2-2/V2-4 渲染层承载（本层只提供两字段）。
- `suppressed` / `suppressionReason`：`presentInSurface===false` 时标注可读原因（tabs 关 / 能力未授权或未开启 / 站点未授权）。
- `cardId = cmd:<name>#<sub>`（V2-4 预留）；`denyCause` / `sourceKind` 同样为 V2-4 预留。
- **`controls`**：`action==='deny'` → **恒 `[]`**（ADR-V2-011）；其余由 V2-3 动作表决定。
- `auto-hardDeny` 标注：当 `action==='ask'` 且风险为 evaluate/未知时（auto 前置判定的硬底线语境）标 `hard-deny` 徽标；不改变 `action` 真值。

### 3.4 `src/insight/capability-catalog.ts`

- 静态权限（`activeTab/scripting/storage/sidePanel/tabs`）：`source:'static'`、`granted:true`、`revocable:false`、`revokeHint:'静态权限不可逐项撤销（需停用/卸载扩展）；可用隐私开关收敛工具面'`、`controls` 不含 `revoke`。
- 可选能力（4）：`source:'optional'`、`granted` 为扩展页实测、`revocable:true`（但 V2-3 的 `revoke` 仅 `granted===true` 时给控件）。
- 6 隐私开关 + `tabs` 开关：`source:'toggle'`、`enabled` 真值、`controls` 给 `toggle`（可逆）。
- `tabs` 开关关闭 → 相关命令 `suppressed:true`。

### 3.5 `src/insight/catalog-reconcile.ts`（与 parity 同源，ADR-V2-010）

- `loadBaseline()` / `loadWaivers()`：读 **`test/parity/baseline-catalog.json` + `waivers.json`**（单一基线文件）。
- `reconcileCatalog(actual, baseline, waivers)` → `{ missing, missingSubs, unregistered, extraStale }`（**双向**）。
- V2-1 单测断言：命令集合 == `deriveTools()`+registry（双向等价）；工具 34/34、子命令合计 **142**；`provenance.commit` 为全 SHA；丢一条 → FAIL（反证）；`pluginExtras` 无过期条目。
- **同源锚定测试**：断言 `test/parity.test.ts` 源码与 V2 模块引用**同一基线路径字面量**（防双份真值漂移）。

### 3.6 `src/insight/build-snapshot.ts`（薄 builder，background 侧）

纯函数 `buildInsightTreePayload(deps)`：把注入的已读数据规范化为 `InsightSource` 后转调 `projectInsightTree`。**唯一**与 `chrome.*` 接触的是调用方（`service-worker.ts` 的 `case 'insight-tree'`），builder 本身不触 `chrome.*`（node 可测）。

---

## 4. 方案对比（P-V2-01）

| 维度 | 方案 A：纯函数投影 + 注入式数据源 | 方案 B：store 层实时聚合 | 方案 C：UI 内直接读 `chrome.storage` |
|------|:--|:--|:--|
| 描述 | `src/insight/*` 纯层；background 注入已读数据 | 在 origin/capability store 加聚合方法 | 侧栏直接拼装存储 |
| 优点 | 纯、node 可测；确定性/对账/零副作用可断言；单一真值 | 无新层 | 少一跳 |
| 缺点 | 一个薄 builder | 污染 store 职责；确定性难保；UI 多跳 | **越权读**；**取不到 `deriveTools()`/risk 真值**；易双份真值 |
| 风险 | 低 | 中 | 高 |
| 工作量 | 中 | 中 | 低（返工高） |

---

## 5. 推荐方案

**推荐方案 A**。理由：唯一能同时满足 FR-V2-015（确定性 + 对账）、FR-V2-016（纯读零副作用 + additive）、AC-V2-001（可自动化验证）的形态；且为 V2-2/V2-3/V2-4 提供单一消费面，避免判定真值漂移。（对应父 plan ADR-V2-001。）

---

## 6. 文件影响分析

| 操作 | 文件路径 | 说明 |
|:--:|------|------|
| NEW | `packages/web-cli-plugin/src/insight/tree-model.ts` | 快照/节点/forest/稳定键/徽标/成因/来源类型 |
| NEW | `packages/web-cli-plugin/src/insight/project-tree.ts` | 纯投影 + 确定性（排序/规范 JSON/哈希）+ 空态降级 |
| NEW | `packages/web-cli-plugin/src/insight/command-catalog.ts` | 命令逐条有档（action/denyCause/sourceKind/delayMs/抑制） |
| NEW | `packages/web-cli-plugin/src/insight/capability-catalog.ts` | 静态权限 + 可选能力 + 6 开关 + tabs 开关 |
| NEW | `packages/web-cli-plugin/src/insight/catalog-reconcile.ts` | 单基线文件 + 双向对账 + 同源锚定 |
| NEW | `packages/web-cli-plugin/src/insight/build-snapshot.ts` | 注入式读 → `InsightSource` → 快照（薄） |
| MODIFY | `packages/web-cli-plugin/src/background/state-message.ts` | 追加**可选** `insight?: InsightSummary`（additive） |
| MODIFY | `packages/web-cli-plugin/src/background/messaging.ts` | `PluginMessageKind` 追加 `insight-tree` / `insight-changed` |
| MODIFY | `packages/web-cli-plugin/src/background/service-worker.ts` | 追加 `case 'insight-tree'`（既有 case 零改动） |
| MODIFY | `packages/web-cli-plugin/src/background/host.ts` | 追加只读 accessor `delayConfig()`（ADR-V2-014） |
| NEW | `packages/web-cli-plugin/test/insight-projection.test.ts` | 字段真值 / additive / 零副作用 / 空态 |
| NEW | `packages/web-cli-plugin/test/insight-determinism.test.ts` | 两次投影一致 + hash |
| NEW | `packages/web-cli-plugin/test/insight-catalog.test.ts` | 34/142 双向对账 + 反证 + 同源锚定 |

**不改**：`manifest.json`、`policy.ts`、`auto-authorize.ts`、`packages/web-cli-base/**`、`options.html`、v1 SDDU 目录。

---

## 7. 风险评估

| 风险 | 概率 | 影响 | 缓解措施 |
|------|:--:|:--:|----------|
| 命令真值与 `deriveTools()` 漂移 | 中 | 高 | `command-catalog` 只消费注入的 `toolSurface()`；双向对账门禁（新增/丢失即 FAIL）+ 反证自测 |
| 双份真值（V2 自建基线） | 低 | 中 | 单一基线文件 + 共享 `catalog-reconcile.ts` + 同源锚定测试（ADR-V2-010） |
| 快照不确定性（对象序/时间戳） | 中 | 中 | 固定排序 + `stableStringify` + hash；`builtAt` **不进** hash 输入 |
| 投影意外写存储/审计 | 低 | 高 | 纯函数 + 前后 diff 空断言 + 导入白名单门禁（ADR-V2-015） |
| 零明文泄漏（key/剪贴板/通知） | 低 | 高 | 只消费 `LlmStatusSummary`；`apiKey` 标识符 grep 门禁 |
| 读失败被误判为「空/已撤销」 | 中 | 高 | 降级为可读态 + 保持 fail-safe 默认（EC-V2-002/008），不静默 |

---

## 8. 生成的 ADR

本叶子**不新开 ADR**，直接承接父 `plan.md`：

| ADR | 标题 | 与本叶子关系 |
|-----|------|-------------|
| ADR-V2-001 | 纯函数投影 + 注入式数据源 + 四层分组（森林）模型 | **本叶子主决策**（P-V2-01） |
| ADR-V2-002 | 确定性快照 = 稳定键 + 固定排序 + 规范 JSON + 纯哈希 | 本叶子实现约束 |
| ADR-V2-003 | 多对多关系 = 显式 `crossLinks` | 本叶子数据结构 |
| ADR-V2-004 | 消息面 additive（`insight-tree` / `insight-changed` / `state.insight?`） | 本叶子读出口 |
| ADR-V2-010 | parity 同源 = 单基线 + 共享 reconcile | 本叶子对账实现（P-V2-06） |
| ADR-V2-012 | 为 V2-4 预留扩展位 | 本叶子字段预留 |
| ADR-V2-014 | `delayMs` 经 `host.delayConfig()` 只读 accessor | 本叶子 `delayMs` 真值 |
| ADR-V2-015 | 来源约束（只读投影 + 导入白名单 + 禁改面） | 本叶子红线门禁 |

### 交付门槛（本叶子）

**可自动化验收面**

| 门禁 | 断言要点 | 量化口径 |
|------|----------|----------|
| `test/insight-projection.test.ts` | 四维度字段 == v1 真值；`state` additive 兼容；投影前后存储 diff 空、无审计新增；≥3 类空态可读 | 字段级 + 空态计数 ≥3 |
| `test/insight-determinism.test.ts` | 两次投影 deep-equal；`meta.hash` 相等 | hash 全等 |
| `test/insight-catalog.test.ts` | 双向集合等价；34 工具 / **142 子命令**；`provenance` 全 SHA；丢一条 → FAIL；同源锚定；过滤只读 | 覆盖率 **100%** |
| `test/insight-no-escalation.test.ts`（与 V2-3 共用） | `src/insight/**` 无 `chrome.*` / 无写 store / 无 `apiKey`；无 bare `catch` | grep 零命中 |

**人工面**：本叶子为纯数据层，**无专属人工面**；相关人工面（真实授权弹窗 / 浏览器壳 / 剪贴板焦点等）见父 plan §3.6。

---

## 9. R2 技术设计修订（V2-1 模型侧；post-validate，phase 不回退；2026-09-13）

> **输入**：本叶 `spec.md` v2.0（R2）+ 父 `plan.md` §9/§10（ADR-V2-024~033）+ 父 `state.json#revisionRounds.R2`。**只做设计**，不写代码、不排任务。

### 9.1 R2 目标与边界

- **真父子层级（父 FR-V2-070）**：新增纯 `src/insight/ownership-tree.ts#buildOwnershipTree(snapshot)` → 嵌套 `OwnershipNode`（`children` / `path` / `mainOwner` / `crossRefCount`）。**快照扁平面 `groups[].children` 不改**（对账/确定性/`meta.hash` 输入不变，ADR-V2-028）。
- **多归属主链（父 FR-V2-071）**：节点唯一（稳定键不变）；`site_*` 命令主归属=站点面；`base-builtin`/`plugin-*` 主归属=命令面（按来源分组）；非主归属以交叉引用徽标 + 下钻同一 `nodeId`（不复制节点，沿用 ADR-V2-003）。
- **覆盖生效档 / clamp 原因（父 FR-V2-013/079）**：`CommandNode` additive 字段 `defaultAction` / `overrideAction?` / `effectiveAction` / `overridable` / `clampReason?`；`overrides`（纯 `Record<commandId, PolicyAction>`）由 background **注入** → 本层**只读**、**零写入**（NG5R）。
- **覆盖面分列**：`meta.counts`（实时面派生）+ `coverage`（live 28/94=122 vs baseline 34/142）分列；`accounted` 不渲染。

### 9.2 模块改动

| 文件 | R2 改动 | ADR |
|------|---------|-----|
| NEW `src/insight/ownership-tree.ts` | 纯归属树（主归属 + 交叉引用徽标 + path） | ADR-V2-028 |
| MODIFY `src/insight/tree-model.ts` | additive 覆盖字段 + `ControlKind+'command-policy'` + `TreeActionId+2` + 层级类型 | ADR-V2-028/030 |
| MODIFY `src/insight/command-catalog.ts` | `overrides` 注入（纯数据）+ 默认/生效分列 + clamp 原因（`resolveCommandPolicy` 纯调用）+ 删除偏差文案 | ADR-V2-025/030/032 |
| MODIFY `src/insight/project-tree.ts` | 透传 `overrides`；覆盖面分列；派生 `ownershipTree`（只读） | ADR-V2-028/032 |
| MODIFY `src/insight/build-snapshot.ts` | 透传 `overrides` / `coverage` | ADR-V2-024 |

**不改**：`src/insight/catalog-reconcile.ts`（对账单一真值）、`test/parity/**`、`policy.ts`/`auto-authorize.ts`。

### 9.3 断言取代（本叶，removed=0）

| 旧 | 理由 | 新 |
|----|------|----|
| `insight-action-parity.test.ts` 全量 `node.action === real chain` | 保持：`action` 语义 = **默认档**（不改为生效档），parity 前提不变 | **不变**；新增 `command-policy-parity.test.ts` 断言 `effectiveAction` 与 clamp 结论表一致 + 覆盖注入后 dispatch 与投影一致 |
| `insight-catalog.test.ts` 双向对账 / 34·142 | 扁平面保留 | **不变** |
| 新增 | R2 层级/归属/分列 | `insight-tree-hierarchy.test.ts`：AC-V21-008/009/010 |

**硬底线断言只增**：`insight-no-escalation.test.ts` pin 不变 + 覆盖层「不写覆盖」grep（`src/insight/**` 无 store 写入）。

---

## 10. 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| **v2.0** | **R2 技术设计修订（post-validate；phase 不回退；编排器代作者决策 2026-09-13 授权）**：新增 §9 —— 真父子层级 `ownership-tree.ts`（快照扁平面不变）+ 多归属主链/交叉引用 + 覆盖生效档/clamp 原因（纯只读注入）+ 覆盖面分列；承接父 ADR-V2-024/025/028/030/032；断言取代（removed=0，parity/catalog 不变，硬底线 pin 只增）。 | 2026-09-13 | SDDU Plan Agent（R2） |
| v1.0 | 初始创建。V2-1 技术方案：纯函数投影 + 注入式数据源 + 四层分组森林；稳定键/固定排序/规范哈希；命令逐条有档（V2-4 预留位）；能力目录；单基线同源对账；additive 消息；空态降级；文件影响与验收面。承接父 plan ADR-V2-001/002/003/004/010/012/014/015。 | 2026-09-13 | SDDU Plan Agent |
