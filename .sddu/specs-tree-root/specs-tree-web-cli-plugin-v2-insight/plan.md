# 技术计划：specs-tree-web-cli-plugin-v2-insight（web-cli-plugin v2「any insight」——把能力变得可见/可控；父 Feature 统领性技术方案）

> **文档定位**: SDDU 技术方案 — 记录架构设计、方案对比和 ADR，作为 tasks 阶段的输入
> **前置依赖**: `spec.md`（父 `spec.md` v1.0 为**权威条文单一事实源**：43 FR / 10 NFR / 16 EC / 12 AC）+ 三个 P0 叶子子 spec（V2-1 / V2-2 / V2-3）；v1（`specs-tree-web-cli-plugin`，phase=validated / status=tracked）**只读参与**
> **创建人**: SDDU Plan Agent
> **创建时间**: 2026-09-13
> **版本**: v1.0
> **更新人**: SDDU Plan Agent
> **更新时间**: 2026-09-13
> **更新说明**: 初始创建。父 Feature 统领性技术方案（**父不执行 tasks/build/review/validate**）。产出 **ADR-V2-001~015**（与 v1 ADR-001~018 零冲突）+ 6 个技术开放点（P-V2-01~06）裁决 + 3 个 P0 叶子的接口边界与交付门槛。**本任务只做技术设计**：不写代码、不排任务（tasks 归 @sddu-tasks）、不改 v1 任何文件、不碰 `main` / `packages/web-cli-base/**` / `options.html`。

---

## 1. 前置检查

| 检查项 | 状态 |
|--------|:--:|
| 父 `spec.md` 存在（`.sddu/specs-tree-root/specs-tree-web-cli-plugin-v2-insight/spec.md`） | ✅ |
| V2-1 / V2-2 / V2-3 叶子 `spec.md` 存在 | ✅ |
| **外部 API 文档缓存** | ⚠️ N/A — 本 Feature **无外部服务 API**；四维度全部为**进程内状态源 + Chrome 扩展 API**（`chrome.storage` / `chrome.permissions` / `chrome.tabs`），不需要 `.sddu/api-docs/` 缓存 |
| 前置依赖已满足（v1 状态源与操作通路已交付） | ✅ 逐文件核实（§2.1） |
| 红线基线核对（`main` = `2ddc922…` 未动） | ✅ |
| v1 SDDU 记录只读（`specs-tree-web-cli-plugin/**` 不改） | ✅（门禁见 §3.6） |
| `packages/web-cli-base/**` 零改动 | ✅（门禁见 §3.6） |

> 说明：规范的「外部 API 文档缓存」前置检查在本 Feature 不适用（无外部 API）。替代的前置检查 = **v1 状态源代码逐文件核实**（§2.1），已完成。

---

## 2. 架构分析

### 2.1 现状基线（**v2 是投影层，底座 v1 已交付 —— 不重新发明**）

> 来源 = 读文件核实（2026-09-13，分支 `feature/web-cli-plugin`）。v1 已实现四维度的**全部状态源**与**大部分操作实现**；v2 本质是**只读投影 + 聚合 + 侧栏悬浮 UI + 就地调用既有 ops**。

**四维度状态源（投影输入）**

| 维度 | 状态源（真值） | 投影要点 |
|------|----------------|----------|
| ① 站点授权面 | `src/security/origin-store.ts`（`OriginRecord{origin,authorized,trust,authorizedAt,updatedAt,note?}`、`OriginStore.list()`、`web-cli:origins`）；`src/platform/extension-env.ts`（`hasOriginPermission`/`removeOriginPermission`） | 未授权站点**必须可见**（`list()` 含 `authorized:false` 记录）；「可取消授权」仅 `authorized===true` |
| ② 浏览器能力面 | `manifest.json`（静态 `permissions`=5 项；`optional_permissions`=5 项）；`src/platform/capability-permissions.ts`（`OPTIONAL_CAPABILITIES`=bookmarks/downloads/notify/clipboard + 权限/工具/文案映射 + `hasCapabilityPermission`/`removeCapabilityPermission`）；`src/background/capability-setting.ts`（**6 开关** + `CAPABILITY_SETTING_DEFAULTS`）；`src/background/tabs-setting.ts`（`enabled` 默认 true） | 静态权限项**不得**显示「可撤销」（`revocable:false`）；可选能力授予以扩展页 `chrome.permissions.contains()` **实测态**为准（隐私开关不决定授权态） |
| ③ CLI 命令档案面 | base `router.deriveTools()`（**工具面真值**）+ `host.router.query({name})`（risk/group/subcommand enum）+ `src/tools/declared-tools.ts`（`SAFE_READ_VERBS`/`DESTRUCTIVE_VERBS`/`effectiveRisk`）+ `src/security/policy.ts`（S1/S2/S3 + `PLUGIN_RISK_DEFAULTS`：read→allow、write/external/ui/state→ask、evaluate→deny）+ `host.ts:258 delayMs:0` + `test/parity/baseline-catalog.json`（34 工具 / 142 子命令） | 逐条有档；档位由 `PLUGIN_RISK_DEFAULTS` + S1/S2/S3 + 抑制态推导；`delay` = `deny` 别名，与 `delayMs` **分列** |
| ④ LLM 连接面 | `src/llm/key-store.ts`（`maskedConfig()` / `clear()`，`web-cli:llm`）+ `src/llm/status.ts`（`toLlmStatusSummary` 零明文投影）+ `src/background/session-store.ts`（`sessionIdForOrigin`/`groups`/`MAX_SESSIONS=20`） | 只用 `LlmStatusSummary{configured,providerId,providerName,model}`；**零明文 key**；树内不做改绑写路径 |

**操作通路（撤销/关断，v2 只调用不新增）**

| 动作 | 既有通路（消息/函数） | 审计事件（既有类型） |
|------|----------------------|---------------------|
| 站点取消授权 | `makeMessage('revoke',{origin})` → SW：`unregisterSiteContentScript` + `removeOriginPermission` + `OriginStore.revoke`（`service-worker.ts:1627-1651`） | `origin-revoke` / `host-permission` |
| 可选能力撤销 | `ops.revokeCapability(cap)`（扩展页 `removeCapabilityPermission` 无需手势）→ `capabilities/permission-changed` 重对账 → `suppressCapability`（工具即时移出） | `optional-permission/revoked` |
| 隐私开关翻转 | `capabilities/set`（6 开关）；`tabs-setting set` | `optional-permission`（enabled/disabled）/ `tabs` |
| 自动授权关断 | `auto-auth clear`（`autoAuth.clear` 读+写都关） | `auto-authorize`（disabled） |
| LLM 断开（P1） | `key-store.clear()`（`ops.clearLlm`） | `llm-config` |
| 会话组解散（P1） | `session-group` / `session-store.deleteGroup` | 既有会话推送 |

**现有 UI 基建（可复用实现，但「复用实现 ≠ 放进设置面板」）**

- `src/ui/sidepanel/index.html`：三区 flex 全高布局 = `#panel-top`（固定）/ `#panel-main`（**`position:relative`**，`#log` 唯一滚动区，`flex:1 1 auto`）/ `#panel-bottom`（固定，`#composer` 为**末元素**）；`#settings-view` 为并列 section（`body.settings-open` 时隐藏三区）。
- `src/ui/sidepanel/sidepanel.ts`：`render()` 全量重建 `#log`；`scrollFollow` + `scroll-policy.ts`（`BOTTOM_THRESHOLD_PX = 48`）；`#revoke` 已有可读回执（1041-1047）；`onMessage` 已订阅 `probe-changed`/`session-changed`/`capability-changed`（1078-1149）。
- `src/ui/settings/{view,ops,panel,styles}.ts`：`createSettingsOps` 已含 `revokeCapability`/`setCapabilityPrivacy`/`setTabsSetting`/`clearAutoAuth`/`clearLlm`/`groupAction`（`ops.ts`），以及纯文案函数（`capabilityRevokeReceipt` 等，`view.ts`）。**V2-3 只做编排复用，不重写。**
- `src/background/state-message.ts`：纯 `buildStateMessage`（注入式读投影，node 可测）——V2-1 沿用同一模式。

**量化基线（不得回退）**

| 指标 | v1 实测（2026-09-13） | 来源 |
|------|----------------------|------|
| `#log` 稳态高度 | **589px**（视口 400×900，占比 65.44%） | `docs/dev.md` §11.3 |
| `composer` 底边 − 视口底 | **+8px**（贴底） | 同上 |
| 水平溢出 | 400px / 320px 均 **0** | 同上 |
| `dist/content.js` | **1,073,453 B**（目标 64 KiB **未达成**，D31） | `test/perf-baseline.ts` |
| `dist/sidepanel.js` | **1,068,165 B** | 父 spec §2.5 |

### 2.2 目标架构总览（分层：纯投影 / 薄编排 / 覆盖式 UI）

```
┌─────────────────────────────── 侧栏扩展页面（sidepanel.html）───────────────────────────────┐
│  V2-2  #tree-fab（常驻悬浮入口）  +  #tree-drawer（覆盖式抽屉，位于 #panel-main 内 absolute）    │
│        └── src/ui/tree/tree-view.ts   纯渲染模型（snapshot → rows/badges/controls）           │
│        └── src/ui/tree/tree-drawer.ts DOM 挂载（惰性 mount / 关闭态零渲染）                    │
│  V2-3  src/ui/tree/tree-ops.ts        动作白名单编排（只调既有 ops）                            │
│        src/ui/tree/tree-receipt.ts    三件套回执对象（纯）                                      │
└───────────────────────────────────────────┬─────────────────────────────────────────────────┘
                                            │ chrome.runtime.sendMessage（既有传输）
                    ┌───────────────────────┴────────────────────────┐
                    │ 新消息（additive）：'insight-tree'（pull）        │
                    │                    'insight-changed'（push）     │
                    └───────────────────────┬────────────────────────┘
┌───────────────────────────────────────────┴─────────────────────────────────────────────────┐
│  background / service worker（薄 case：new 'insight-tree'）                                     │
│    src/insight/build-snapshot.ts  纯：注入式读 → InsightSource（同 state-message 模式）          │
│         ├── src/insight/tree-model.ts        类型（forest / nodeId / crossLinks / snapshot）    │
│         ├── src/insight/project-tree.ts      纯投影（确定性快照 + 稳定键 + 规范 JSON + 哈希）     │
│         ├── src/insight/command-catalog.ts   命令逐条有档（action/risk/source/delayMs/抑制/成因） │
│         ├── src/insight/capability-catalog.ts 静态权限 + 可选能力 + 6 开关 + tabs 开关            │
│         └── src/insight/catalog-reconcile.ts 与 parity 基线**单一来源**对账                       │
│    V2-3 写路径 = 只走既有 case：'revoke' / 'capabilities' / 'auto-auth' / 'tabs-setting' / ...    │
└───────────────────────────────────────────────────────────────────────────────────────────────┘
```

**关键结构性约束（安全红线的结构保证，非文字承诺）**

1. **投影只读**：`src/insight/**` 不得导入任何写 store（`origin-store` 只读方法、`key-store` 只 `maskedConfig`），不得 `chrome.*`（由 background 注入数据）。门禁 grep + 单测「投影前后存储 diff 为空」。
2. **写路径白名单**：`src/ui/tree/tree-ops.ts` 只暴露**固定 6 个动作**，每个动作映射到**唯一既有通路**（§3.4 表）。**无任何新 case、无任何新判定分支**。
3. **判定链冻结**：V2 **零 diff** 触及 `src/security/policy.ts` / `src/security/auto-authorize.ts`（`PLUGIN_RISK_DEFAULTS` + 4 条硬底线）。门禁 = pinned 判定表单测 + `git diff --quiet` + 目录导入白名单。
4. **单调性证明**：以**真实** `createPluginPolicyConfig` + `decideAutoAuthorization` 驱动的决策表，逐个撤销动作断言「无命令从 ask/deny → allow」（§3.6）。
5. **`deny` 不可关**：由渲染模型结构保证 —— `tree-view.ts` 对 `action==='deny'` 的命令节点恒返回 `controls: []`（单测遍历 142 子命令断言），DOM 层无开关可渲染。
6. **静态权限不可撤销**：能力节点带 `revocable` 布尔；静态权限恒 `false` + `revokeHint` 如实披露，`controls` 不含 `revoke`。
7. **零明文**：V2 只消费 `LlmStatusSummary`，**不导入** `LlmSettings`/`apiKey`；审计复用既有事件类型（不新增类型），参数经既有 `redact.ts` 掩码。

### 2.3 数据流变更（全部 additive）

**读路径**：抽屉首开 / 失效推送 → `sendMessage('insight-tree')` → SW `case 'insight-tree'` → `buildInsightSnapshot(deps)`（注入：`origins.list()`、扩展页实测能力态、6 开关、tabs 开关、`host.deriveTools()`+`router.query` 命令面、`delayConfig()`、`toLlmStatusSummary(maskedConfig())`、`sessionStore.state()`）→ `projectInsightTree` → 确定性 `ConnectTreeSnapshot` → `tree-view` 渲染模型 → DOM。

**写路径（V2-3）**：抽屉动作 → `tree-ops`（白名单）→ **既有消息** → 既有 SW handler → 既有状态变更 + 既有审计 → 既有 push（`capability-changed` 等）**+ 新 `insight-changed`**（仅用于「让树重投影」，不携带敏感数据）→ 抽屉重投影（EC-V2-013）。

**`state` 消息 additive**：`StateMessagePayload` 增加**可选** `insight?: InsightSummary`（仅 counts/badges，小对象）——旧消费者忽略未知可选字段，既有字段语义零变更（FR-V2-016）。

### 2.4 依赖关系图

```
V2-1（投影，P0）──┬─► V2-2（悬浮 UI，P0）──► V2-3（撤销操作面，P0）
                  └─► V2-4（命令档案浏览器，P1，**本轮不设计实现，只预留扩展位**）
共享底座：src/insight/**（纯）+ new message kinds + ui/sidepanel 挂载点
外部依赖：无新增（零依赖 / 零权限 / 不碰 base）
```

### 2.5 与 v1 的边界（不越界清单）

- **不**改 `security/policy.ts` 判定链、`PLUGIN_RISK_DEFAULTS`、`auto-authorize.ts` 4 条硬底线；
- **不**改 `manifest.json` 静态权限面（5 项）与 `optional_permissions`；
- **不**新增静态 `content_scripts` / `<all_urls>` / 页面注入；**不**加重 `content.js`；
- **不**碰 `packages/web-cli-base/**`；**不**改 `options.html`；**不**推翻 v1 TASK-033；
- **不**做命令级策略覆盖、**不**做静态权限假撤销、**不**做树内改绑 LLM 写路径；
- **不**做 LLM key 的**授予**（`permissions.request` 需手势，归设置面板）；V2-3 只做**撤销/关断**（`remove`/`revoke` 无需手势）。

---

## 3. 分模块技术方案

### 3.0 FR-V2 → 模块落位总映射（traceability）

| FR / NFR | 落位模块 | 验收（AC） |
|----------|----------|-----------|
| FR-V2-001~005（GOV） | 目录/提交纪律 + §3.6 门禁 | AC-V2-007/009/011/012 |
| FR-V2-010~017（TREE / V2-1） | `src/insight/*`（tree-model / project-tree / command-catalog / capability-catalog / catalog-reconcile / build-snapshot） | AC-V2-001 / AC-V21-001~007 |
| FR-V2-020~025（UI / V2-2） | `ui/sidepanel/index.html`（FAB+drawer 标记/样式）+ `src/ui/tree/{tree-view,tree-drawer}.ts` + `ui/sidepanel/sidepanel.ts` 挂载 | AC-V2-002 / AC-V22-001~007 |
| FR-V2-030~040（OPS / V2-3） | `src/ui/tree/{tree-ops,tree-receipt}.ts` + 既有 ops/消息 | AC-V2-003 / AC-V23-001~008 |
| FR-V2-050~056（ARC / V2-4，P1） | **本轮只预留**：V2-1 模型字段 + facets + `cardId`（§3.5） | 归 V2-4 的 plan/tasks |
| FR-V2-060~065（SEC，横切） | §2.2 结构约束 + §3.4 白名单 + §3.6 单调性/冻结门禁 | AC-V2-005 / AC-V23-004 |
| NFR-V2-001/002（体积） | `test/size-baseline.ts` + `test/size-budget.test.ts` | AC-V2-006 |
| NFR-V2-004/008（布局/可测） | §3.3 量化口径 + `test/ui/insight.mjs` | AC-V2-002 |
| NFR-V2-009/010（门禁/上游） | §3.6 串行纪律 + base 零 diff | AC-V2-011 / AC-V2-007 |

### 3.1 V2-1 连接树数据模型与状态投影（纯函数 + 注入式数据源）

**核心决策（ADR-V2-001/002/003）**：投影 = **在 `src/insight/` 中的纯函数**，输入是 background 组装好的**已读平面数据** `InsightSource`（同 `state-message.ts` 模式）；输出 `ConnectTreeSnapshot`。**投影内不做任何 IO**（node 可单测、零副作用）。

**模型（forest，非严格单树）**：

```ts
type NodeId = string;                    // 命名空间稳定键
interface ConnectTreeSnapshot {
  version: 1;                            // 结构版本（V2-4 预留 additive 演进）
  modelNote: '四维度分组视图（森林），以「本插件」为根；允许跨层引用，非严格单树';
  root: TreeGroup;                       // kind:'root', label:'本插件'
  groups: [TreeGroup, TreeGroup, TreeGroup, TreeGroup]; // 站点/能力/命令/LLM（固定序）
  facets: CatalogFacets;                 // 预计算（V2-2 过滤 / V2-4 检索复用）
  meta: SnapshotMeta;                    // builtAt, counts, hash, sources, degradation[]
  catalogMeta?: CatalogMeta;             // V2-4 预留：{toolCount, subcommandCount, provenanceCommit}
}
interface TreeGroup { id: NodeId; kind:'group'; dimension:'site'|'capability'|'command'|'llm'; label: string; children: TreeNode[]; }
interface TreeNode { id: NodeId; kind: 'site'|'capability'|'command'|'llm'; label: string;
  badges: Badge[]; crossLinks: CrossLink[]; actions: TreeActionId[]; controls: ControlDescriptor[]; }
```

**节点稳定键（可复现 / 可 diff，ADR-V2-002）**：

| 节点 | 稳定键 |
|------|--------|
| 站点 | `site:<normalizeOrigin(origin)>` |
| 静态权限 | `cap:static:<permission>` |
| 可选能力 | `cap:opt:<capability>` |
| 隐私开关 | `toggle:<capabilitySetting key>`（含 `tabs-enabled`） |
| 命令 | `cmd:<toolName>`（工具节点）/ `cmd:<toolName>#<subcommand>`（子命令） |
| LLM | `llm:<providerId>`（活跃标记）；`session:<sessionId>` |
| 跨层引用 | `link:<fromId>→<toId>`（排序后数组） |

**确定性**：所有集合按**固定排序**（站点 `origin.localeCompare`；能力 = manifest 声明序 + `OPTIONAL_CAPABILITIES` 序 + `CAPABILITY_SETTING_DEFAULTS` 键序；命令 = `deriveTools()` 稳定序 + 子命令 enum 序；LLM = 会话 `lastActiveAt` 降序再 `sessionId`）。`stableStringify`（键排序）+ 纯 FNV-1a 哈希 → `meta.hash`。门禁：两次投影 deep-equal 且 hash 相等（AC-V21-003）。

**跨层引用（多对多关系表达，ADR-V2-003）**：**不复制节点**，用显式 `crossLinks`：
- 命令节点 → 来源站点（`site_*` → `link:cmd:site_x→site:https://a`）、来源能力（`bookmarks`→`cap:opt:bookmarks`）；
- 能力节点 → 依赖权限（`cap:opt:clipboard`→`cap:static:clipboardRead`? 不——clipboardRead/Write 是 optional，映射为 `permissionRefs: ['clipboardRead','clipboardWrite']`）；
- 站点节点 → 该站点的命令（反向解析，展示用，不构成授权）。

**命令逐条有档（`command-catalog.ts`）**：对 `deriveTools()` 每个 name 经 `router.query` 取 `{risk, group, subcommand enum}`；推导：
- `action`：`group==='site'` → 按 `effectiveRisk` + `PLUGIN_RISK_DEFAULTS` + S1/S2/S3；插件/base 工具 → `PLUGIN_RISK_DEFAULTS[risk]`；risk 缺失/非法 → `deny`。
- `denyCause`：`'s1-unauthorized' | 's3-unknown-risk' | 'evaluate-floor' | 'auto-hardDeny' | null`（**V2-4 预留位**）。
- `sourceKind`：`'site-declared' | 'plugin-admin' | 'plugin-tabs' | 'plugin-bookmarks' | 'plugin-downloads' | 'plugin-notify' | 'plugin-clipboard' | 'base-builtin'`（**V2-4 预留位**，FR-V2-055）。
- `delayMs`：由 `host.delayConfig().delayMs`（新增**只读** accessor，值 0 = 全局关闭）**独立字段**展示，与 `action` 分列（`delay` 消歧，FR-V2-054）。
- `suppressed` / `suppressionReason`：工具不在 `deriveTools()`（tabs 关 / 能力关 / 权限撤销）→ `presentInSurface:false` + 可读原因（不误报为可执行）。
- `cardId`：= `cmd:<name>#<sub>`（**V2-4 预留**：档案卡直接以此为键，无需 reshape）。

**能力目录（`capability-catalog.ts`）**：静态权限（`revocable:false` + `revokeHint`）、可选能力（`revocable:true`，但 **V2-3 的 `revoke` 动作仅对 `granted===true` 的 cap 可见**）、6 开关 + tabs 开关（`toggle` 控制）。

**对账（`catalog-reconcile.ts`，ADR-V2-010）**：单一基线文件 `test/parity/baseline-catalog.json` + `waivers.json`；导出 `loadBaseline()/loadWaivers()/reconcileCatalog()`。V2-1 单测断言命令集合 == `deriveTools()`+registry **双向集合等价**、34 工具 / 142 子命令、新增/丢失即 FAIL（含反证自测）。

**空态/降级（FR-V2-017 / EC-V2-008）**：无活跃站点 / 无已授权站点 / LLM 未配置 / 无命令（异常）→ `degradation[]` 可读条目（≥3 类断言）；`chrome.storage` 读失败 → 沿用各 store **fail-safe 默认**并标 `degradation`，**不当作空/已撤销**。

### 3.2 V2-2 悬浮连接树 UI 与交互（覆盖式抽屉，不动三区几何）

**DOM（对齐既有 `ui/*` 约定，append-only）**

```html
<!-- 在 #panel-main 内、#log 之后追加（#panel-main 已 position:relative） -->
<button id="tree-fab" type="button" aria-controls="tree-drawer" aria-expanded="false"
        title="连接树：查看与撤销插件连接">🕸 连接树</button>
<!-- 抽屉：覆盖在消息区之上，不参与 flex 流 -->
<section id="tree-drawer" aria-label="连接树" hidden>
  <div id="tree-drawer-head">…「四维度分组视图（森林），非严格树」声明 + 关闭 + 全部只收缩不放宽声明…</div>
  <div id="tree-filter">…检索输入（只读过滤）…</div>
  <div id="tree-body">…四分组节点 / 徽标 / 控件（由 tree-view 纯模型渲染）…</div>
  <div id="tree-receipt" role="status" aria-live="polite"></div>  <!-- V2-3 三件套回执 -->
</section>
```

**CSS（覆盖式，零几何影响）**：`#tree-fab { position:absolute; left:12px; bottom:12px; z-index:6; }`（`#scroll-bottom` 在 `right:12px; bottom:12px`，**不冲突**）；`#tree-drawer { position:absolute; inset:0 0 0 auto; width:min(340px, 100%); max-height:100%; overflow-y:auto; overflow-x:hidden; min-width:0; z-index:7; background:var(--bg-elevated); border-left:1px solid var(--border); }`；`#tree-drawer[hidden]{ display:none; }`。**抽屉是 `#panel-main` 的 absolute 子元素 → 不参与 flex 流 → `#log` 的 `flex:1 1 auto` 与 `#composer` 末元素地位不变**（ADR-V2-005）。

**与消息面的关系（open point 3 裁决）**：**覆盖层（overlay），非内联展开、非视图切换**。
- 不用 v1 的 `body.settings-open` 视图切换（会隐藏 `#panel-top/main/bottom` 并需同步滚动锚点/草稿），避免既有旅程回归；
- 不把树卡片写进 `#log`（会污染消息流与滚动跟随）；
- 覆盖层可随时开合，关闭后 `[hidden]` → **零渲染/零布局开销**（NFR-V2-005）。

**渲染模型（纯，node 可测）**：`tree-view.ts` 导出 `buildTreeRows(snapshot, filter)` → `TreeRow[]`（含 `badges`、`controls: ControlDescriptor[]`、`emptyHint`）。**关键结构保证**：`action==='deny'` 的命令节点 `controls` 恒 `[]`；静态权限节点 `controls` 不含 `revoke`（ADR-V2-011）。`tree-drawer.ts` 只做 DOM 挂载与事件绑定（惰性 mount，首开才建；`onOpen/onClose/refresh()`）。

**additive 消息（ADR-V2-004）**：
- **新增** `insight-tree`（pull：抽屉首开 + 失效后重拉，返回完整 `ConnectTreeSnapshot`）；
- **新增** `insight-changed`（push：状态变化后触发重投影，**不携带敏感数据**）；
- **`state` 可选 `insight?: InsightSummary`**（{counts, badges}，供 FAB 徽标；additive，既有消费者忽略）；
- **不改**任何既有消息语义（`messaging.ts` 仅向 `PluginMessageKind` 并集**追加**两个 kind）。

**检索/过滤（FR-V2-022）**：`filter` 只作用于 `buildTreeRows` 的展示集合，**不触碰 snapshot 与任何授权状态**（断言过滤前后存储/授权状态 diff 为空）。

### 3.3 侧栏布局不回退（量化口径）与体积守卫

**布局量化口径（ADR-V2-006，`test/ui/insight.mjs`）**

| 指标 | 断言 | 说明 |
|------|------|------|
| `#log` 计算 `flex-grow` | `=== '1'` | 非 45vh 硬编码 |
| `#log` 稳态 `clientHeight` | **≥ 589px**（主断言，绝对量） | v1 实测基线；「不回退」的直接口径 |
| `#log` 稳态高度占比 | **≥ 65.0%**（次断言，保守下限） | 589/900 = **65.44%**；判据记录见 ADR-V2-006 |
| `#composer` 底边 − 视口底 | **∈ [0, +8px]** | 不得为负（D-079 回归）；比 v1 `#15c`（≤12）更严 |
| `#tree-fab` ∩ `#composer` boundingRect | **面积 = 0** | 结构保证：FAB 在 `#panel-main` 内，composer 在 `#panel-bottom` |
| 文档/`#log`/抽屉水平溢出（400px、320px） | **= 0** | `overflow-x:hidden` + `overflow-wrap:anywhere` |
| 抽屉**开/关两态** | 上表全部复用 | 证明「开抽屉不挤压消息区」 |
| v1 `#15a~#15q` 断言 | **零删减** | `test:ui` 原文件不改；新断言在 `test/ui/insight.mjs` |

> **口径说明（须如实记录）**：AC-V2-002 写「稳态高度占比 **≥ 65.5%**（v1 基线 589px）」，但 589/900 = **65.44% < 65.5%** —— 逐字断言会在 v1 基线上**失败**（非「回归」而是口径自相矛盾）。故以**绝对量 589px** 为「不回退」主断言，比例取 **≥65.0%** 保守下限；把 spec 的 65.5% 视为 65.44% 的进位，登记于 ADR-V2-006（编排器代作者决策）。**门禁不得因此变得空洞**：589px 与 composer ∈[0,+8] 均为可证伪的硬阈值。

**体积守卫（open point 4 裁决，ADR-V2-007）**

- **新增** `test/size-baseline.ts`（复用 v1 `test/perf-baseline.ts` 的 `readArtifactSize` —— **只吞 `ENOENT`**，其余错误必须抛）：
  - `SIDEPANEL_BASELINE_BYTES = 1_068_165`（v1 实测，**build 后必须重新实测登记**）；
  - `SIDEPANEL_BASELINE_TOLERANCE = 0.05`（5%，编排器采纳）；`SIDEPANEL_CEILING = floor(1_068_165 × 1.05) = 1_121_573`；
  - `SIDEPANEL_BASELINE_META = { kind:'regression-baseline-only', targetBudgetBytes: **null**, targetMet: **null**, measuredOn, source, buildCommand }` —— **基线 ≠ 目标预算**（不得以基线值宣布任何目标达成）；
  - `CONTENT_MAX_BYTES = 1_073_453`（**不增长**，无容差，FR-V2-002 / NFR-V2-002）。
- **新增** `test/size-budget.test.ts`：① sidepanel ≤ ceiling（构建后）；② `content.js` ≤ `1_073_453`；③ **反证自测**（`ceiling+1` → FAIL；`1_073_454` → FAIL）；④ 仅吞 ENOENT（EACCES/裸 Error 必须抛）；⑤ `SIDEPANEL_BASELINE_META.targetBudgetBytes === null` 且 `targetMet === null`（禁止「目标达成」话术）；⑥ 与 v1 的 `CONTENT_BUNDLE_TARGET_BYTES === 64*1024` 且 `targetMet===false` 一致（不覆盖 v1 未达成项 D31）。
- 回归基线在 **build 之后实测登记**；若 V2-2 有意图增重，须显式更新基线并注明日期/来源（同 v1 纪律）。

### 3.4 V2-3 撤销与取消授权操作面（白名单编排 + 单调性证明）

**动作白名单（`src/ui/tree/tree-ops.ts`）** —— 每个动作**唯一映射到一个既有通路**：

| `TreeActionId` | 既有通路 | 可逆性 | 需二次确认 | 目标态 |
|----------------|----------|:--:|:--:|--------|
| `revoke-origin` | `makeMessage('revoke',{origin})` | 不可逆（可重授） | ✅ | 收紧 |
| `revoke-capability` | 复用 `ops.revokeCapability(cap)` | 不可逆（可重授） | ✅ | 收紧 |
| `set-capability-toggle` | 复用 `ops.setCapabilityPrivacy(cap,scope,enabled)` | **可逆** | ❌ | 收紧（关闭） |
| `set-tabs-toggle` | 复用 `ops.setTabsSetting(enabled)` | **可逆** | ❌ | 收紧（关闭） |
| `clear-auto-auth` | 复用 `ops.clearAutoAuth(origin)` | 不可逆（可重开） | ✅ | 收紧 |
| `disconnect-llm`（P1） | 复用 `ops.clearLlm()` | 不可逆（可重配） | ✅ | 收紧 |
| `dissolve-group`（P1） | 复用 `ops.groupAction({action:'delete', groupId})` | 不可逆 | ✅ | 中性（明示「分组≠授权」） |

> **不做** `grant`/`request`（`permissions.request` 需扩展页手势且属设置面板职责）；**不做**任何命令级写入。编排层不导入 `policy.ts` / `auto-authorize.ts` / `capability-permissions.ts` 的写函数以外内容；导入白名单门禁见 §3.6。

**三件套回执（`tree-receipt.ts` 纯对象，FR-V2-037 / open point 5 裁决）**：
```ts
interface TreeReceipt {
  receipt: { ok: boolean; kind: 'ok'|'warn'|'err'; text: string };  // ① 可读回执（成功/失败原因 + 下一步）
  toolSurfaceEvidence: { tool: string; present: boolean; checkedAt: number;
                         evidence: string };                        // ② 工具面已移除证据（重拉 `insight-tree` 断言该工具 present:false）
  auditEntry: { entryPoint: 'admin_audit-export'; hint: string };   // ③ 审计入口（既有 admin_audit-export；不强制在树内渲染事件正文）
}
```
- 呈现：`#tree-receipt` 内联展示 ①；② 显示「已不在工具面（本插件工具 N 项 → 已重对账）」；③ 一个按钮触发既有 `audit-export`（沿用侧栏 `#audit` 的既有行为）。
- **无静默失败/假成功**：失败路径返回可读 `kind:'err'`，**不得**渲染成功态；无 bare `catch`（grep 门禁）。
- **幂等**（EC-V2-014）：重复 `revoke-origin` 返回「已撤销」（`revoked:false` 时也给可读态，不报错刷屏）。

**失败/降级（EC-V23-001~009）**：`removeOriginPermission` 失败 / content-script 注销失败 **分别如实报告**（不因一项失败假装全成功）；`removeCapabilityPermission` 失败 → 能力态**保持不变** + 可读「当前上下文不支持…」；`onRemoved` 竞态 → 显式 `permission-changed` 重对账兜底（工具仍即时移出 + 审计 + 幂等）。

**二次确认（open point 范围裁决，ADR-V2-013）**：`needsConfirmation(actionId)` 纯函数；不可逆/高影响（站点取消授权 / 能力撤销 / 自动授权关断 / LLM 断开 / 会话组解散）需**显式确认**，摘要含「作用对象 + 后果 + 不可逆说明」；**开关翻转（可逆）不需确认**。拒绝 → **零操作、fail-closed**。确认 UI = 抽屉内联 `#tree-confirm`（**复用**既有 `.row`/`button` 样式与 `#confirm` 的文案约定，**不复用** dispatch 的 `confirm-request` 通道，避免与工具派发确认混淆）。

### 3.5 V2-4（P1）预留的扩展位（避免后续返工）

> 本轮**不设计 V2-4 实现**；只在 V2-1 模型里预留，使 V2-4 落地时**无需改模型**、无需返工 V2-1/V2-2/V2-3。

| 预留位 | 形态 | V2-4 如何直接消费 |
|--------|------|------------------|
| `CommandNode.cardId` | `cmd:<name>#<sub>` | 档案卡键，无需 reshape |
| `CommandNode.denyCause` | `'s1-unauthorized'\|'s3-unknown-risk'\|'evaluate-floor'\|'auto-hardDeny'\|null` | `deny` 三成因分列（FR-V2-051）+ hardDeny |
| `CommandNode.sourceKind` | 8 值枚举（含 `site-declared` 的 origin cross-link） | 来源标注（FR-V2-055） |
| `CommandNode.delayMs` + `action` | **分列**字段 | `delay` 消歧（FR-V2-054），不新增第三档 |
| `CommandNode.suppressed` / `suppressionReason` | 布尔 + 文案 | 抑制态标注（FR-V2-056） |
| `snapshot.facets` | `{actions, risks, sources, origins, subcommands}` 预计算 | 检索/过滤（FR-V2-022/056），纯函数 |
| `snapshot.catalogMeta?` | `{toolCount, subcommandCount, provenanceCommit}` | parity 对账展示（FR-V2-053） |
| `snapshot.version` | `1` | additive 演进，V2-4 只需 `version<=1` 兼容读 |
| 目录 | `src/insight/*` 纯层已就位；V2-4 只加 `src/ui/tree/archive-view.ts` + 命令分组子视图 | 零模型改动 |

### 3.6 交付门槛设计（门禁名 / 断言要点 / 人工面）

**门禁串行纪律（NFR-V2-009，绝不并发 —— 本仓库 OOM 前科）**：
```
npm run build --workspace @lgdl/web-cli-plugin   # 先构建真实 dist（体积/UI 门禁需要）
npm test           # node 单测（含 V2 新增 insight-*.test.ts / size-budget）
npm run test:ui        # v1 既有 167 断言回归（零删减）
npm run test:insight   # 新增：FAB/抽屉 + AC-V2-002 收紧量化（必须在 test:ui 之后串行）
npm run test:binding   # v1 既有 + 新增 V2-3 撤销链（真实 dist + 真实站点）
npm run test:hardening # 回归
npm run test:e2e       # 回归（本任务不改 fullchain）
```
逐条串行执行；任何一步 fail 即停，修复后**从头串行**重跑。

**新增门禁清单**

| 门禁 | 类型 | 断言要点 | 量化口径 |
|------|------|----------|----------|
| `test/insight-projection.test.ts` | node | 四维度字段 == v1 真值；`state` additive 兼容；纯读（前后 diff 空）；空态 ≥3 类可读 | 字段级 + `Object.keys` 回归 |
| `test/insight-determinism.test.ts` | node | 两次投影 deep-equal 且 `meta.hash` 相等 | hash 全等 |
| `test/insight-catalog.test.ts` | node | 双向集合等价；34 工具 / **142 子命令**逐条有档；`deny` 成因分类；**反证**（丢一条 → FAIL）；过滤只读（diff 空） | 覆盖率 **100%** |
| `test/insight-security.test.ts` | node | **AC-V2-005 六条反向断言**（撤销/关断/自动授权开启后：未授权 deny / 未知 risk deny / evaluate deny / 破坏性 ask / `clipboard read` ask / `bookmarks remove` ask）+ **单调性**（无 ask/deny→allow） | 逐条 assert；决策表全量 |
| `test/insight-no-escalation.test.ts` | node+git | V2 源码导入白名单（无 `policy.ts`/`auto-authorize.ts` 写路径）；`PLUGIN_RISK_DEFAULTS` pinned 判定表；`git diff --quiet` `policy.ts`/`auto-authorize.ts`；无 bare `catch`；无 `apiKey` 标识符 | diff 为空 |
| `test/size-budget.test.ts` | node | sidepanel ≤ 1,121,573 B；content ≤ 1,073,453 B；**反证自测**；只吞 ENOENT；基线≠目标预算 | 见 §3.3 |
| `test/ui/insight.mjs`（`test:insight`） | Chromium | `#tree-fab` 存在/可开合；四维度可见 + 徽标；空态可读；**`#log` ≥589px / ≥65.0%**；composer ∈[0,+8]；FAB∩composer = 0；400/320px 溢出 = 0；抽屉开/关两态 | 见 §3.3 |
| `test/ui/binding.mjs`（**追加** check） | Chromium | 站点取消授权 → 工具**即时**移出 + 审计；能力撤销 → 工具移出 + 可读拒绝 + 审计；开关关断 → `deriveTools()` 无该工具 | 真实 dist + 真实站点 |

**人工面清单（headless 无法覆盖，必须如实登记）**

| # | 人工面 | 为什么无法自动化 |
|---|--------|------------------|
| H1 | **真实授权弹窗**（`chrome.permissions.request`） | 需真实用户手势 + 浏览器弹窗；且 V2-3 **不授予权限**（只撤销），授权入口仍归设置面板 |
| H2 | **原生 `tabs.goBack`/`tabs.goForward`** 等浏览器壳行为 | CDP 无法复现真实历史导航观感 |
| H3 | **剪贴板真读焦点**（`clipboard read` 是否成功取决页面焦点） | 无头环境焦点语义不同 |
| H4 | **悬浮观感/抽屉动画/明暗主题/长文案拥挤/窄栏字重** | 视觉与感知判断 |
| H5 | **真实用户手势下 `permissions.remove` 的浏览器回执观感** | 无头仅能断言状态与工具面 |
| H6 | **多显示器 / 高 DPI / 系统主题切换下的 FAB 位置观感** | 环境相关 |
| H7 | **`chrome://extensions` 外部撤销后的树内实时刷新观感** | 跨进程真实事件时序 |

**断言只增不减纪律**：`test:ui` 既有 `#15a~#15q` / `test:binding` 既有编号**零删改**；新增断言使用**新编号**（`test/ui/insight.mjs` 内 `#I-01…`；`binding.mjs` 追加 `#19a…`）。

---

## 4. 方案对比

### 4.1 树模型实现（P-V2-01）

| 维度 | 方案 A：纯函数投影 + 注入式数据源（`src/insight/*`） | 方案 B：store 层实时聚合 | 方案 C：UI 内直接读 `chrome.storage` |
|------|:--|:--|:--|
| 描述 | background 组装已读数据 → 纯函数产出快照 → 单一 JSON 给 UI | 在 `origin-store` 等内加聚合方法，UI 分别拉取 | 侧栏直接读 `chrome.storage.local` 拼装 |
| 优点 | 纯、node 可测；确定性/对账好验；单一真值；additive；零副作用可断言 | 无新层 | 少一跳 |
| 缺点 | 多一层薄 builder | 污染各 store 职责、难保确定性、UI 要多跳、破坏 additive | **越权读**（侧栏不该读全部存储）、无法正确取得 `deriveTools()` risk、难测、易双份真值 |
| 风险 | 低 | 中 | **高（越权 + 判定真值漂移）** |
| 工作量 | 中 | 中 | 低（但返工高） |

### 4.2 悬浮 DOM/CSS（P-V2-02）

| 维度 | 方案 A：`#panel-main` 内 absolute FAB + 覆盖式抽屉 | 方案 B：`position:fixed` 视口悬浮 | 方案 C：复用 v1 视图切换（如设置） |
|------|:--|:--|:--|
| 描述 | FAB/抽屉都相对 `#panel-main` 定位（该容器已 `relative`） | FAB/抽屉相对视口 `fixed` | `body.tree-open` 隐藏三区，全屏抽屉 |
| 优点 | **结构上不可能遮挡 composer**（不同 flex 区）；零几何影响；关闭零开销 | 实现直观 | 与设置一致 |
| 缺点 | 视觉上受 `#panel-main` 裁剪（可接受） | 与 composer「同层」→ 需额外断言/补偿（D-079 前科） | **需同步滚动锚点/草稿**（回归面大）；隐藏三区=改变既有旅程 |
| 风险 | 低 | 中（布局回归） | 中高（既有旅程回归） |
| 工作量 | 低 | 低 | 中 |

### 4.3 消息面形态（P-V2-03）

| 维度 | 方案 A：新 `insight-tree`(pull) + `insight-changed`(push) + `state.insight?` 小摘要 | 方案 B：把全量快照塞进 `state` | 方案 C：抽屉直连 `chrome.storage` |
|------|:--|:--|:--|
| 优点 | additive 最强（既有字段零语义变更）；按需拉取、冷启动零成本；EC-V2-013 可订阅 | 少一个 kind | 少一跳 |
| 缺点 | 两个新 kind + 一个触发点 | 热路径变重；旧消费者需容错大字段；142 命令推送浪费 | 越权 + 无 `deriveTools()` 真值 |
| 风险 | 低 | 中（性能/兼容） | 高 |

### 4.4 体积守卫（P-V2-04）

| 维度 | 方案 A：新增 `test/size-baseline.ts` + `test/size-budget.test.ts`（复用 `readArtifactSize`） | 方案 B：改写 v1 `test/perf-baseline.ts` 同时管两个 artifact | 方案 C：只记录不门禁 |
|------|:--|:--|:--|
| 优点 | 与 v1 未达成项 D31 **解耦**；`content.js` 不增长与 `sidepanel.js` 基线分列；复用只吞-ENOENT 逻辑 | 单文件 | 无成本 |
| 缺点 | 多一个文件 | **触碰 v1 已收口门禁**、易把 sidepanel 基线混入 content 目标叙事 | **违反 NFR-V2-001（等于不守卫）** |
| 风险 | 低 | 中 | 高（虚绿） |

### 4.5 回执/审计呈现（P-V2-05）

| 维度 | 方案 A：抽屉内三件套对象（回执 + 工具面证据 + 审计出口按钮） | 方案 B：全局 toast | 方案 C：写进 `#log` 消息流 |
|------|:--|:--|:--|
| 优点 | 三件套同处可验证；零明文；不污染消息流；审计走既有 `admin_audit-export` | 轻 | 复用消息流 |
| 缺点 | 抽屉内空间有限（可折叠） | **无「工具面证据」落点**（三件套缺一） | 污染滚动跟随/历史；撤销回执混入对话 |
| 风险 | 低 | 中（不满足 FR-V2-037） | 中 |

### 4.6 parity 同源对账（P-V2-06）

| 维度 | 方案 A：单基线文件 + 共享 `catalog-reconcile.ts`（V2 新测消费；v1 `parity.test.ts` 不动） | 方案 B：重构 `parity.test.ts` 共用 checker | 方案 C：V2 自建第二份基线 |
|------|:--|:--|:--|
| 优点 | 单一真值文件；**不触碰 v1 已 validated 门禁**；双向 FAIL 可自证 | 真正单一实现 | 无改动 |
| 缺点 | 两份 checker 逻辑（需锚定同源测试） | **改 v1 文件**（回归风险；且非必要） | **双份真值→漂移**（明确排除） |
| 风险 | 低 | 中 | 高 |

---

## 5. 推荐方案

| 开放点 | 推荐 | 理由 |
|--------|------|------|
| P-V2-01 树模型 | **4.1 方案 A** | 纯函数 + 注入 = 可单测、可对账、可证零副作用；唯一能同时满足 FR-V2-015/016 与 AC-V2-001 的形态 |
| P-V2-02 DOM/CSS | **4.2 方案 A** | 以**结构**保证不遮挡 composer（D-079 前科不再可能）；不改既有旅程 |
| P-V2-03 消息面 | **4.3 方案 A** | additive 最强 + 按需拉取（NFR-V2-005）；`state.insight?` 满足 FR-V2-016 的 additive 字面 |
| P-V2-04 体积守卫 | **4.4 方案 A** | 与 D31 解耦、只吞 ENOENT、反证自测、基线≠目标预算可机器断言 |
| P-V2-05 回执审计 | **4.5 方案 A** | 三件套同处可验证（FR-V2-037 + 作者确认③），零明文，审计走既有出口 |
| P-V2-06 parity 同源 | **4.6 方案 A** | 单基线文件即「同源」；不改 v1 validated 门禁 |

**编排器代作者决策登记（2026-09-13 授权）**：

| # | 事项 | 裁决 | 依据/理由 |
|---|------|------|----------|
| D1 | 连接树形态 | **森林 / 四层分组视图**（以「本插件」为根，允许跨层引用，如实声明非严格树） | 作者 2026-09-13 已确认（spec §11.1-1）；编排器采纳 |
| D2 | UI 文案 | `delay` 与 `deny` **同处并标**「`delay`（= `deny`，fail-closed，非可配置档位；与命令间 `delayMs` 无关）」 | 作者确认②/⑤；编排器采纳 |
| D3 | 撤销后可见后果 | **三件套**：回执 + 工具面已移除证据 + 审计入口 `admin_audit-export` | 作者确认③；编排器采纳 |
| D4 | 结构 | **父 Feature + 4 叶子子 Feature**；**父不执行 tasks/build/review/validate** | 作者确认⑤ + SDDU 规则；编排器采纳 |
| D5 | 树抽屉默认开合 | **默认收起**（入口常驻、抽屉按需展开） | spec O-V2-001 建议值；编排器代作者决策（2026-09-13 授权） |
| D6 | 会话组解散 | **归 P1** | spec O-V2-002；编排器代作者决策 |
| D7 | LLM 断开 | **归 P1** | spec O-V2-003；编排器代作者决策 |
| D8 | 体积容差 | **5%** | spec O-V2-004；编排器代作者决策（沿用 v1 口径） |
| D9 | 二次确认范围 | **不可逆/高影响需确认；开关翻转不需** | spec O-V2-005；编排器代作者决策 |
| D10 | 侧栏高度口径 | **绝对量 589px 主断言 + 比例 ≥65.0% 次断言**；记录 spec「≥65.5%」为 65.44% 的进位 | 589/900 = 65.44% < 65.5%，逐字断言会在 v1 基线失败（非回归）；编排器代作者决策（详见 ADR-V2-006） |

---

## 6. 文件影响分析（聚合；叶子级明细见各叶子 plan.md §文件影响分析）

| 操作 | 文件路径 | 说明 |
|:--:|------|------|
| NEW | `packages/web-cli-plugin/src/insight/tree-model.ts` | 快照/节点/forest/stable-key 类型（V2-1） |
| NEW | `packages/web-cli-plugin/src/insight/project-tree.ts` | 纯投影 + 确定性快照 + 稳定哈希（V2-1） |
| NEW | `packages/web-cli-plugin/src/insight/command-catalog.ts` | 命令逐条有档（action/risk/source/delayMs/抑制/成因）（V2-1） |
| NEW | `packages/web-cli-plugin/src/insight/capability-catalog.ts` | 静态权限 + 可选能力 + 6 开关 + tabs 开关（V2-1） |
| NEW | `packages/web-cli-plugin/src/insight/catalog-reconcile.ts` | 与 parity 基线单一来源对账（V2-1/V2-4） |
| NEW | `packages/web-cli-plugin/src/insight/build-snapshot.ts` | 注入式读 → `InsightSource` → 快照（薄 builder） |
| MODIFY | `packages/web-cli-plugin/src/background/state-message.ts` | 增加**可选** `insight?: InsightSummary`（additive） |
| MODIFY | `packages/web-cli-plugin/src/background/messaging.ts` | `PluginMessageKind` **追加** `insight-tree` / `insight-changed` |
| MODIFY | `packages/web-cli-plugin/src/background/service-worker.ts` | **追加** `case 'insight-tree'`；状态变化后 `insight-changed` 推送；既有 case 零改动 |
| MODIFY | `packages/web-cli-plugin/src/background/host.ts` | **仅追加只读 accessor** `delayConfig()`（暴露 `delayMs:0` 真值，供 `delayMs` 列） |
| NEW | `packages/web-cli-plugin/src/ui/tree/tree-view.ts` | 纯渲染模型（rows/badges/controls/filter） |
| NEW | `packages/web-cli-plugin/src/ui/tree/tree-drawer.ts` | DOM 挂载（惰性、开合、重投影） |
| NEW | `packages/web-cli-plugin/src/ui/tree/tree-ops.ts` | V2-3 动作白名单编排（只调既有通路） |
| NEW | `packages/web-cli-plugin/src/ui/tree/tree-receipt.ts` | 三件套回执对象（纯） |
| MODIFY | `packages/web-cli-plugin/src/ui/sidepanel/index.html` | **追加** FAB + 抽屉标记与样式（**既有 id/类零重命名**） |
| MODIFY | `packages/web-cli-plugin/src/ui/sidepanel/sidepanel.ts` | **追加** 挂载/订阅（既有 handler 零改动） |
| NEW | `packages/web-cli-plugin/test/insight-projection.test.ts` | V2-1 字段/纯读/additive/空态 |
| NEW | `packages/web-cli-plugin/test/insight-determinism.test.ts` | 确定性快照 + hash |
| NEW | `packages/web-cli-plugin/test/insight-catalog.test.ts` | 34/142 对账 + 反证 + 过滤只读 |
| NEW | `packages/web-cli-plugin/test/insight-security.test.ts` | AC-V2-005 六条反向断言 + 单调性 |
| NEW | `packages/web-cli-plugin/test/insight-no-escalation.test.ts` | 导入白名单 + policy 冻结 + 无 bare catch |
| NEW | `packages/web-cli-plugin/test/size-baseline.ts` | sidepanel 回归基线 + content 上限（复用 `readArtifactSize`） |
| NEW | `packages/web-cli-plugin/test/size-budget.test.ts` | 体积守卫 + 反证自测 + 基线≠目标预算 |
| NEW | `packages/web-cli-plugin/test/ui/insight.mjs` | `test:insight`：FAB/抽屉 + AC-V2-002 收紧量化 |
| MODIFY | `packages/web-cli-plugin/test/ui/binding.mjs` | **追加** V2-3 撤销链 check（既有编号零删改） |
| MODIFY | `packages/web-cli-plugin/package.json` | 追加 `test:insight` script（依赖零新增） |

**明确不改（门禁断言 diff 为空）**：`manifest.json`、`src/ui/options/index.html`（`options.html`）、`packages/web-cli-base/**`、`src/security/policy.ts`、`src/security/auto-authorize.ts`、v1 SDDU 目录 `specs-tree-web-cli-plugin/**`、`.opencode/opencode.json`、`package.json` 依赖段。

---

## 7. 风险评估

| 风险 | 概率 | 影响 | 缓解措施 |
|------|:--:|:--:|----------|
| **侧栏布局回退（D-079 前科：composer 被挤出视口）** | 中 | 高 | 抽屉/FAB **结构上位于 `#panel-main`**（不与 composer 同 flex 区）；`test:insight` 硬断言 composer ∈[0,+8]、FAB∩composer=0、`#log`≥589px，**开/关两态都测** |
| **`sidepanel.js` 体积增长失控** | 中 | 中 | `test/size-budget.test.ts` 基线守卫（5%）+ 反证自测；`content.js` ≤1,073,453 硬上限（**不触碰 D31**） |
| **规范「≥65.5%」与实测 65.44% 自相矛盾导致门禁必然失败** | 高（已发生） | 中 | ADR-V2-006 改以绝对量 589px 为主断言 + ≥65.0% 次断言；并登记该口径修正；若作者坚持逐字 65.5%，需先重测基线（**尽早上报**） |
| **撤销路径意外放宽门禁** | 低 | 极高 | §2.2 结构约束 + 白名单编排 + 单调性决策表单测 + policy 冻结（pinned 判定表 + `git diff --quiet`）+ 导入白名单 grep |
| **`permissions.onRemoved` 事件竞态（EC-V2-005）** | 中 | 中 | 显式 `permission-changed` 重对账兜底；工具**即时**移出 + 审计落地；幂等 |
| **侧栏越权读存储 / 零明文泄漏** | 低 | 高 | 侧栏只消费 `insight-tree` JSON；`src/insight/**` 禁 `chrome.*`/写 store；零明文 grep（无 `apiKey`/剪贴板/通知正文） |
| **parity 双份真值漂移** | 低 | 中 | 单一基线文件 + 共享 `catalog-reconcile.ts`；同源锚定测试 |
| **误改 v1 文件 / base / options** | 低 | 高 | 路径限定提交 + `git diff --name-only` 断言白名单；AC-V2-007 门禁 |
| **门禁并发导致 OOM** | 中 | 高 | NFR-V2-009 串行纪律；本设计阶段**不跑** Chromium 类门禁 |
| **V2-4 后续返工 V2-1 模型** | 中 | 中 | §3.5 预留位（`cardId`/`denyCause`/`sourceKind`/facets/`catalogMeta`/`version`），V2-4 零模型改动 |
| **`delayMs` 真值硬编码漂移** | 低 | 低 | 经 `host.delayConfig()` 只读 accessor 取值 + 单测断言默认 0 且非 0 可透出（不硬编码） |
| **P1 范围（LLM 断开 / 会话组解散）被误纳入 P0** | 低 | 低 | 叶子 plan 明确标注 P1；P0 闭环只要求 LLM **可见** |
| **仓库并发 writer / 分支状态漂移** | 低 | 中 | 提交前 `git status -sb` + `git rev-parse main` 复核；path-limited `git add` |

---

## 8. 生成的 ADR

> **15 个 ADR（ADR-V2-001~015）**，与 v1 ADR-001~018 **零编号冲突**。状态 = **ACCEPTED（编排器代作者决策，2026-09-13 授权）**，除注明「承作者确认」者沿用作者原裁决。承接 spec §11.3 的 6 个技术开放点（P-V2-01~06）+ 5 个建议值（O-V2-001~005）。

| ADR | 标题 | 状态 |
|-----|------|:--:|
| ADR-V2-001 | 连接树 = 纯函数投影 + 注入式数据源 + 四层分组（森林）模型（P-V2-01） | ACCEPTED |
| ADR-V2-002 | 确定性快照 = 命名空间稳定键 + 固定排序 + 规范 JSON + 纯哈希（可复现/可 diff） | ACCEPTED |
| ADR-V2-003 | 多对多关系 = 显式 `crossLinks`（站点×命令、能力×权限），不复制节点 | ACCEPTED |
| ADR-V2-004 | 消息面 additive = 新 `insight-tree`(pull) + `insight-changed`(push) + `state.insight?` 小摘要（P-V2-03） | ACCEPTED |
| ADR-V2-005 | 悬浮载体 = `#panel-main` 内 absolute FAB + 覆盖式抽屉（P-V2-02） | ACCEPTED |
| ADR-V2-006 | 侧栏不回退量化口径 = 绝对量 589px 主 + 比例 ≥65.0% 次；登记 spec「65.5%」为进位 | ACCEPTED |
| ADR-V2-007 | 体积守卫 = 新增基线文件 + 复用只吞-ENOENT + 反证自测 + 基线≠目标预算（P-V2-04） | ACCEPTED |
| ADR-V2-008 | 撤销面 = 既有 ops 白名单编排；永不新增判定路径（单调性 + 冻结）（FR-V2-036/060/063） | ACCEPTED |
| ADR-V2-009 | 回执/审计 = 抽屉内三件套对象 + 既有 `admin_audit-export`；零明文（P-V2-05） | ACCEPTED |
| ADR-V2-010 | parity 同源 = 单基线文件 + 共享 `catalog-reconcile.ts`；不重构 v1 `parity.test.ts`（P-V2-06） | ACCEPTED |
| ADR-V2-011 | `deny` 不可关 / 静态权限不可撤销 = **渲染模型结构**保证（`controls:[]` / `revocable:false`） | ACCEPTED |
| ADR-V2-012 | V2-1 模型为 V2-4 预留扩展位（`cardId`/`denyCause`/`sourceKind`/facets/`catalogMeta`/`version`） | ACCEPTED |
| ADR-V2-013 | 二次确认范围 = 不可逆/高影响需确认、开关翻转不需（编排层 fail-closed）（O-V2-005） | ACCEPTED |
| ADR-V2-014 | `delayMs` 真值经 `host.delayConfig()` 只读 accessor 取得（不硬编码、不新增判定） | ACCEPTED |
| ADR-V2-015 | V2 代码来源约束 = 只读投影 + 只调既有通路；导入白名单与禁改面（grep + git 门禁） | ACCEPTED |

> **V2-4（P1）追加登记（2026-09-13，sddu-plan；只增不删）**：V2-4 命令档案浏览器技术设计产出 **ADR-V2-016~023**（8 个，与 ADR-V2-001~015 及 v1 ADR-001~018 零编号冲突），正文见 `specs-tree-v2-4-command-archive/plan.md` §8。一句话结论：016 档案 = 复用 P0 抽屉内档案子视图（默认关；渲染模型并入 `src/insight/`，既有断言零修改）；017 逐条有档 = 三层口径分列（基线 34/142 · 豁免 20/88 · 实时面 28/94=122 卡）+ `accounted` 100%，禁止夸大；018 `deny` 成因分层 = policy 三成因 + 自动授权层 `auto-hardDeny`（派生只读、不新增模型字段、全量交叉断言）；019 `delay` 消歧 = 单一措辞源 + 内容哈希钉死；020 档案 = 结构无控件只读面（四层证据）；021 parity 同源 = 复用 `catalog-reconcile.ts` + `catalog-meta.ts` 常量注入；022 门禁只增不减 + sidepanel 显式重登记 + `content.js` 零增长；023 **V2-4 = 零模型改动（ADR-V2-012 兑现）**，唯一 additive 运行时注入面 = `service-worker` 1 行 `catalogMeta`。

### ADR-V2-001: 连接树 = 纯函数投影 + 注入式数据源 + 四层分组（森林）模型（P-V2-01）

## 状态
ACCEPTED（编排器代作者决策，2026-09-13 授权；森林形态承作者 2026-09-13 确认）

## 背景
spec FR-V2-010~017 只定义语义与验收边界（确定性、不重不漏、零副作用、additive），实现形态归 plan。四维度状态源分散在 v1 多个 store 与 `deriveTools()` 真值中；若 UI 直接拼装，会越权读存储、且判定真值易漂移。

## 决策
1. 在 `src/insight/` 建**纯投影层**：`build-snapshot.ts`（注入式读，同 `state-message.ts` 模式）+ `project-tree.ts`（纯函数）+ `tree-model.ts`（类型）。
2. 树 = **四层分组（森林）**：以「本插件」为根，四个并列分组（站点/能力/命令/LLM）；**非严格单树**，`modelNote` 字段如实声明（FR-V2-010）。
3. 投影**零 IO**（不触 `chrome.*`、不写任何 store）；命令真值 = `deriveTools()` + `router.query`（**工具面真值**），不复制基线为运行时真值。

## 被否决方案与理由
- **B. store 层实时聚合**（否决）：污染各 store 职责，难以保证「确定性快照」与「零副作用可断言」，且 UI 需多跳。
- **C. UI 内直接读 `chrome.storage`**（否决）：**越权读**（侧栏不应读全部存储），且无法取得插件的 `effectiveRisk`/`deriveTools()` 真值 → 判定真值漂移。

## 后果
投影可 node 单测（确定性/对账/零副作用全部可机器验证）；单一快照供 V2-2/V2-3/V2-4 消费；代价 = 一个薄 builder + 一个 `insight-tree` 消息往返（按需，冷启动零成本）。

### ADR-V2-002: 确定性快照 = 命名空间稳定键 + 固定排序 + 规范 JSON + 纯哈希

## 状态
ACCEPTED（编排器代作者决策，2026-09-13 授权）

## 背景
FR-V2-015 要求「确定性快照（同输入同输出）」；AC-V21-003 要求两次投影一致。树节点需要可 diff、可作 UI 过滤/档案卡键。

## 决策
1. **命名空间稳定键**：`site:` / `cap:static:` / `cap:opt:` / `toggle:` / `cmd:` / `llm:` / `session:` / `link:`（§3.1 表）。
2. **固定排序**：站点 `origin.localeCompare`；能力 = manifest 序 + `OPTIONAL_CAPABILITIES` 序 + 默认键序；命令 = `deriveTools()` 序 + 子命令 enum 序；LLM/session 按 `lastActiveAt` 降序再 `sessionId`。
3. `stableStringify`（键字典序）+ 纯 FNV-1a 哈希写入 `meta.hash`；**无新依赖**。
4. 门禁：两次投影 `deep-equal` 且 hash 相等。

## 被否决方案与理由
- **依赖 `crypto`/第三方哈希**（否决）：新增运行时依赖风险；FNV-1a 足够做「同输入同输出」判据。
- **按对象插入序输出**（否决）：不同读取路径会产生不同顺序 → 快照不可 diff。

## 后果
快照可 diff、可缓存、可作 V2-4 卡键；实现需显式排序（少量代码），换取可复现性。

### ADR-V2-003: 多对多关系 = 显式 `crossLinks`，不复制节点

## 状态
ACCEPTED（编排器代作者决策，2026-09-13 授权）

## 背景
作者确认森林形态「允许跨层引用」；FR-V2-010 要求命令节点标注来源站点、能力节点标注依赖权限；FR-V2-055 要求 `site_*` 标注所属 origin。站点×命令、能力×权限/命令是多对多。

## 决策
节点**唯一**（按稳定键），关系用 `crossLinks: { id, to, kind, label }[]` 表达，排序后输出；反向关系（站点→其命令）由投影按 `crossLinks` 一次性聚合，不产生重复节点。

## 被否决方案与理由
- **复制节点到多个分组**（否决）：同一命令/能力出现多份，破坏「不重不漏」对账与稳定键唯一性。
- **只放扁平 `refs` 不做可渲染 link**（否决）：UI 需再次解析真值，易漂移。

## 后果
图语义清晰、节点唯一、对账简单；代价 = 渲染模型需解析 `crossLinks`（纯函数，可测）。

### ADR-V2-004: 消息面 additive = 新 `insight-tree` + `insight-changed` + `state.insight?`（P-V2-03）

## 状态
ACCEPTED（编排器代作者决策，2026-09-13 授权）

## 背景
FR-V2-016 要求投影只读 + `state` 消息 **additive** 兼容；EC-V2-013 要求树打开时后台状态变化即时重投影；NFR-V2-005 要求关闭态零额外开销。

## 决策
1. **新增** `insight-tree`（pull，返回完整快照）；**新增** `insight-changed`（push，仅触发重投影，无敏感数据）。
2. `StateMessagePayload` 追加**可选** `insight?: InsightSummary`（counts/badges，小对象），供 FAB 徽标；既有字段语义**零变更**。
3. `messaging.ts` 仅向 `PluginMessageKind` 并集**追加** kind；既有 case 零改动。

## 被否决方案与理由
- **B. 全量快照塞进 `state`**（否决）：热路径变重，142 命令每次 `state` 刷新都推送，浪费且给旧消费者压力。
- **C. 抽屉直连 `chrome.storage`**（否决）：越权读 + 无 `deriveTools()` 真值。

## 后果
additive 最强、按需拉取；代价 = 两个新 kind + 一个失效触发点（复用既有 push + 新增 `insight-changed`）。

### ADR-V2-005: 悬浮载体 = `#panel-main` 内 absolute FAB + 覆盖式抽屉（P-V2-02）

## 状态
ACCEPTED（编排器代作者决策，2026-09-13 授权；侧栏载体形态承作者裁决②）

## 背景
作者硬约束：不进设置面板、悬浮一个连接树、操作简单；且 v1 有 D-079「composer 被挤出视口」前科与 AC-V2-002 量化阈值。

## 决策
1. `#tree-fab` 与 `#tree-drawer` 均作为 **`#panel-main`（已 `position:relative`）的 absolute 子元素**；FAB 置 `left:12px;bottom:12px`（`#scroll-bottom` 在右，不冲突）。
2. 抽屉 `inset:0 0 0 auto; width:min(340px,100%)`，**覆盖在消息区之上，不参与 flex 流**；`[hidden]` 时 `display:none`（关闭态零渲染）。
3. **不做页面注入**（NG-V2-003）；**不放进设置面板**（NG-V2-006，与 `#settings-view` 并列独立）。
4. 既有元素 id / `.entry-*` 选择器**零重命名**。

## 被否决方案与理由
- **B. `position:fixed` 视口悬浮**（否决）：与 composer 同层，需额外补偿且仍可能遮挡（D-079 风险）。
- **C. 复用 v1 视图切换（隐藏三区）**（否决）：需同步滚动锚点/草稿，既有旅程回归面大。

## 后果
以**结构**保证不遮挡 composer、不挤压消息区；代价 = 抽屉视觉受 `#panel-main` 裁剪（可接受）。

### ADR-V2-006: 侧栏不回退量化口径 = 绝对量 589px 主 + 比例 ≥65.0% 次

## 状态
ACCEPTED（编排器代作者决策，2026-09-13 授权）

## 背景
AC-V2-002 同时写「稳态高度占比 **≥65.5%**」与「v1 基线 **589px**」（视口 400×900）。但 **589/900 = 65.44% < 65.5%** —— 逐字执行会在 v1 基线上失败；这不是「回归」，而是口径自相矛盾。门禁既不能空洞，也不能构造即失败。

## 决策
1. **主断言（硬阈值，绝对量）**：`#log` 稳态 `clientHeight ≥ 589px`（「不得回退」的直接口径，可证伪）。
2. **次断言（比例）**：占比 **≥ 65.0%**（低于实测 65.44% 的保守下限，仍远高于 v1 旧断言 `>45`，满足「只增不减」）。
3. **记录**：spec 的「65.5%」视为 65.44% 的进位；若作者/validate 坚持逐字 65.5%，须**先重测** v1 基线（本设计阶段不跑 Chromium 门禁）。
4. 辅以 `flex-grow===1`、composer ∈[0,+8]、FAB∩composer=0、400/320px 溢出=0，**开/关两态都测**。

## 被否决方案与理由
- **逐字 ≥65.5%**（否决）：在 v1 基线上必然失败，门禁不可用。
- **只保留旧 `>45`**（否决）：空洞，无法证明「不回退」。

## 后果
门禁可执行、可证伪、不空洞；需在 plan/validate 报告如实披露口径修正（已登记 D10）。

### ADR-V2-007: 体积守卫 = 新增基线文件 + 复用只吞-ENOENT + 反证自测 + 基线≠目标预算（P-V2-04）

## 状态
ACCEPTED（编排器代作者决策，2026-09-13 授权；容差 5% 承 spec O-V2-004）

## 背景
NFR-V2-001 要求 `sidepanel.js` 基线回归守卫（**基线 ≠ 目标预算**，沿用 v1 第 9 轮修虚绿门禁的做法：只吞 `ENOENT`、其余错误抛、反证自测、目标与基线分列）；NFR-V2-002 要求 `content.js` **不增长**（≤1,073,453 B，不触碰 D31）。

## 决策
1. **新增** `test/size-baseline.ts`：`SIDEPANEL_BASELINE_BYTES=1_068_165`、容差 **5%**、`SIDEPANEL_CEILING=1_121_573`；`CONTENT_MAX_BYTES=1_073_453`（**无容差**）。
2. `SIDEPANEL_BASELINE_META = { kind:'regression-baseline-only', targetBudgetBytes:null, targetMet:null, ... }` —— 机器断言「基线≠目标预算」，禁止「目标达成」话术。
3. **复用** v1 `readArtifactSize`（只吞 `ENOENT`，其余抛）；**不修改** `test/perf-baseline.ts`。
4. 反证自测：`ceiling+1` / `1_073_454` 必须 FAIL；与 v1 `CONTENT_BUNDLE_TARGET_BYTES===64KiB && targetMet===false` 一致。

## 被否决方案与理由
- **B. 改写 v1 `perf-baseline.ts` 兼管两个 artifact**（否决）：触碰 v1 已收口门禁，且易把 sidepanel 回归基线混入 content 的 64KiB 目标叙事。
- **C. 只记录不门禁**（否决）：等同放弃 NFR-V2-001。

## 后果
sidepanel 增长受控、content 不增长、D31 叙事不被污染；代价 = 新增一个测试文件（构建后需实测登记基线）。

### ADR-V2-008: 撤销面 = 既有 ops 白名单编排；永不新增判定路径（FR-V2-036/060/063）

## 状态
ACCEPTED（编排器代作者决策，2026-09-13 授权）

## 背景
FR-V2-036/060~063 安全红线：树内操作**只调用既有 fail-closed 通路**，**永不放宽** `PLUGIN_RISK_DEFAULTS` / 4 条硬底线 / `clipboard read` state 档 / `bookmarks remove`；**撤销路径不得成为放宽门禁的旁路**，须可安全复核。

## 决策（**结构保证**，非文字承诺）
1. `tree-ops.ts` 只暴露**固定 7 个动作**（§3.4），每个动作唯一映射一个既有通路；**无新 case、无新判定分支**。
2. **导入白名单**：`src/insight/**` 与 `src/ui/tree/tree-ops.ts` 不得导入 `security/policy.ts`/`security/auto-authorize.ts` 的构造/写入面；不得出现 `riskDefaults` 赋值、`createPluginPolicyConfig` 调用。
3. **单调性门禁**：以**真实** `createPluginPolicyConfig` + `decideAutoAuthorization` 驱动决策表，对每个动作断言「无任何 (tool,subcommand) 从 ask/deny → allow」。
4. **冻结门禁**：`PLUGIN_RISK_DEFAULTS` pinned 判定表一致 + `git diff --quiet` 对 `policy.ts`/`auto-authorize.ts`。
5. **AC-V2-005 反向断言**六条逐条单测（§3.6）。

## 被否决方案与理由
- **在树内新增「批准/放行」类动作**（否决）：直接违反「不是提权面」。
- **仅靠文字承诺 + 评审**（否决）：红线的可复核性要求机器可验证。

## 后果
「只收紧不放宽」被机器钉死；代价 = 编排层受导入白名单约束（少量限制换取可审计性）。

### ADR-V2-009: 回执/审计 = 抽屉内三件套对象 + 既有 `admin_audit-export`；零明文（P-V2-05）

## 状态
ACCEPTED（编排器代作者决策，2026-09-13 授权；三件套承作者确认③）

## 背景
FR-V2-037 要求撤销后可见后果三件套；FR-V2-039 要求无静默失败/假成功；FR-V2-065 要求零明文。审计入口既有 `admin_audit-export`（侧栏 `#audit` 已用）。

## 决策
1. `TreeReceipt` 三件套对象（回执 / 工具面已移除证据 / 审计入口），纯函数生成，`#tree-receipt` 内联渲染。
2. 工具面证据 = 动作后重拉 `insight-tree` 断言目标工具 `present:false`（**不是**文案声称）。
3. 审计**复用既有事件类型**（`origin-revoke`/`optional-permission`/`auto-authorize`/`host-permission`/`tabs`/`llm-config`），**不新增事件类型**；参数经既有 `redact.ts` 掩码。
4. 失败路径返回可读 `kind:'err'`，**不得**渲染成功；无 bare `catch`。

## 被否决方案与理由
- **B. 全局 toast**（否决）：无「工具面证据」落点，三件套缺一。
- **C. 写进 `#log` 消息流**（否决）：污染对话历史与滚动跟随。
- **新增审计事件类型**（否决）：无必要地扩张审计面。

## 后果
三件套同处可验证、零明文、审计走既有出口；代价 = 抽屉内空间需折叠式排版。

### ADR-V2-010: parity 同源 = 单基线文件 + 共享 `catalog-reconcile.ts`（P-V2-06）

## 状态
ACCEPTED（编排器代作者决策，2026-09-13 授权）

## 背景
FR-V2-053 要求命令档案与 `test/parity.test.ts` **同源**机器对账（新增/丢失即失败），避免双份真值漂移。

## 决策
1. **单一基线文件**：`test/parity/baseline-catalog.json` + `test/parity/waivers.json`；`src/insight/catalog-reconcile.ts` 提供 `loadBaseline()/loadWaivers()/reconcileCatalog()`。
2. V2 新增测试消费该模块；**不重构** v1 `parity.test.ts`（保持 validated 门禁原样）。
3. **同源锚定测试**：断言 `parity.test.ts` 与 V2 模块引用**同一基线路径**（读取源文件字面量比对），防漂移。
4. 反证自测：删一条命令 → `reconcileCatalog` 必须 FAIL。

## 被否决方案与理由
- **B. 重构 `parity.test.ts` 共用 checker**（否决）：改动 v1 已 validated 门禁，收益不足、回归风险高。
- **C. V2 自建第二份基线**（否决）：双份真值 → 漂移，正是要防的问题。

## 后果
单一真值、双向 FAIL、可自证；代价 = 两份 checker 语义需靠锚定测试保持一致。

### ADR-V2-011: `deny` 不可关 / 静态权限不可撤销 = 渲染模型结构保证

## 状态
ACCEPTED（编排器代作者决策，2026-09-13 授权；对应 FR-V2-038/052/064）

## 背景
FR-V2-052 要求 `deny`/`delay` 档 fail-closed 不可放宽、不渲染成可关开关；FR-V2-038 要求静态权限**如实披露不可逐项撤销**、不假装可撤销。仅靠文案不足。

## 决策
1. `tree-view.ts` 的 `ControlDescriptor` 联合类型仅含 `'revoke'|'toggle'|'disconnect'|'confirm-action'|'none'`；对 `action==='deny'` 的命令节点**恒** `controls: []`。
2. 能力节点带 `revocable:boolean`；静态权限恒 `false` + `revokeHint`（「不可逐项撤销，需停用/卸载扩展；可用隐私开关收敛工具面」），`controls` 不含 `revoke`。
3. `tree-ops.ts` 动作表**无命令级条目** → 不存在命令级写入路径。
4. 门禁：遍历全部 142 子命令断言 deny → `controls.length===0`；遍历全部静态权限断言 `revocable===false` 且无 revoke 控件；grep 无命令级写入。

## 被否决方案与理由
- **只在文案层声明**（否决）：DOM 仍可能渲染开关，红线不可机器验证。
- **把 deny 渲染为 disabled 开关**（否决）：仍暗示「可开启」，误导。

## 后果
红线由类型/渲染模型钉死；代价 = `tree-view` 需显式处理 `controls:[]` 分支。

### ADR-V2-012: V2-1 模型为 V2-4 预留扩展位

## 状态
ACCEPTED（编排器代作者决策，2026-09-13 授权；V2-4 = P1，本轮不实现）

## 背景
V2-4 命令档案浏览器（34 工具 / 142 子命令逐条有档、`deny` 三成因、`delay` 消歧、来源/抑制标注、parity 对账）为 P1，本轮不设计实现；但 V2-1 已建命令投影，若字段不足会导致 V2-4 返工 V2-1/V2-2/V2-3。

## 决策
在 V2-1 模型中预留：`CommandNode.cardId` / `denyCause`（4 值 + null）/ `sourceKind`（8 值）/ `delayMs`+`action` **分列** / `suppressed`+`suppressionReason`；`snapshot.facets`（actions/risks/sources/origins/subcommands）；`snapshot.catalogMeta?`；`snapshot.version=1`。V2-4 只新增 `archive-view.ts` + 命令分组子视图，**零模型改动**。

## 被否决方案与理由
- **V2-4 落地时再扩模型**（否决）：会同时改 V2-1 投影 + V2-2 渲染 + V2-3 动作表，返工面大且破坏 V2-1 已验确定性。
- **把 V2-4 字段做成独立并行模型**（否决）：双份命令真值 → 漂移。

## 后果
V2-4 可增量落地；代价 = V2-1 投影多算若干展示字段（纯函数，成本低）。

### ADR-V2-013: 二次确认范围 = 不可逆/高影响需确认、开关翻转不需（O-V2-005）

## 状态
ACCEPTED（编排器代作者决策，2026-09-13 授权）

## 背景
FR-V2-040 要求「不可逆或高影响操作须显式确认，拒绝即不执行、fail-closed」；spec O-V2-005 建议「不可逆/高影响需确认；开关翻转（可逆）不需」。

## 决策
`needsConfirmation(actionId)` 纯函数：`revoke-origin`/`revoke-capability`/`clear-auto-auth`/`disconnect-llm`/`dissolve-group` → **需确认**（摘要含作用对象 + 后果 + 不可逆说明）；`set-capability-toggle`/`set-tabs-toggle` → **不需确认**（可逆）。拒绝 → **零操作、fail-closed**。确认 UI = 抽屉内联 `#tree-confirm`，不复用工具派发的 `confirm-request` 通道。

## 被否决方案与理由
- **所有动作都确认**（否决）：开关翻转高频可逆，确认会惩罚正常使用、降低「操作简单」。
- **都不确认**（否决）：不可逆操作无显式意图，违背 FR-V2-040。

## 后果
防误触与「操作简单」平衡；代价 = 两类动作在 UI 上表现不同（需文案说明）。

### ADR-V2-014: `delayMs` 真值经 `host.delayConfig()` 只读 accessor 取得

## 状态
ACCEPTED（编排器代作者决策，2026-09-13 授权）

## 背景
FR-V2-054 要求 `delayMs` 与 `delay` 档**分列**展示（消歧）。`delayMs` 真值 = base `DelayGate` 配置，插件 `host.ts:258` 当前 `delayMs: 0`（全局关闭）。若在投影里硬编码 `0`，会与配置漂移。

## 决策
在 `host.ts` **仅追加只读 accessor** `delayConfig(): { delayMs: number }`（返回传给 `createCommandRouter` 的同一值），投影经**注入**取得；单测断言默认 host `delayMs===0` 且非 0 配置能透出（不硬编码）。**不新增判定**、不改 `createCommandRouter` 行为。

## 被否决方案与理由
- **投影内硬编码 0**（否决）：配置变更即漂移。
- **投影直接读 base `DelayGate` 内部**（否决）：跨层耦合，且 base 只读红线。

## 后果
`delayMs` 列真实且可测；代价 = `host.ts` 一处 additive 只读 accessor（本设计唯一触碰的 v1 运行时代码，纯读、无行为变更）。

### ADR-V2-015: V2 代码来源约束 = 只读投影 + 只调既有通路（导入白名单 + 禁改面门禁）

## 状态
ACCEPTED（编排器代作者决策，2026-09-13 授权）

## 背景
G-V2-004/005 与 NG-V2-005/009 要求：零新权限、零注入、不碰 base、不改判定链、不合 main、不改 v1 文件。需要**机器可验**的来源约束，而非仅纪律声明。

## 决策
1. **导入白名单**：`src/insight/**` 不得导入 `chrome.*` 直连 / 写 store；`src/ui/tree/tree-ops.ts` 只能导入既有 ops/消息构造面。
2. **禁改面 diff 门禁**：`packages/web-cli-base/**`、`src/security/policy.ts`、`src/security/auto-authorize.ts`、`src/ui/options/index.html`、`manifest.json`、v1 SDDU 目录 → `git diff --name-only` 断言为空。
3. **零明文 / 无 bare catch**：grep 断言（无 `apiKey` 标识符、无 `catch {}` 吞断言）。
4. **提交纪律**：path-limited `git add`（禁 `-A`/`.`）、禁改 `.opencode/opencode.json`、不合 main / 不发布。

## 被否决方案与理由
- **仅靠评审承诺**（否决）：不可复核。
- **用 lint 规则替代**（否决）：无新依赖（NG-V2-008），且 grep/git 门禁已足够。

## 后果
来源约束可自动化验证、可审计；代价 = 新增 `insight-no-escalation.test.ts` 等门禁。

---

## 9. 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建。父 Feature 统领性技术方案：前置检查（含「无外部 API」替代核实）+ 架构分析（四维度状态源/操作通路/量化基线/结构约束）+ 分模块技术方案（V2-1 纯投影 / V2-2 覆盖式抽屉 / V2-3 白名单编排 / 体积守卫 / V2-4 预留位 / 交付门槛）+ 6 方案对比 + 推荐方案 + 10 项编排器代作者决策登记 + 聚合文件影响 + 风险评估 + **ADR-V2-001~015**。**只做技术设计**：不写代码、不排任务、不改 v1、不碰 main/base/options。 | 2026-09-13 | SDDU Plan Agent |
| v1.1 | **最小追加**：§8 ADR 登记表追加 **ADR-V2-016~023**（V2-4 命令档案浏览器技术设计，正文见 `specs-tree-v2-4-command-archive/plan.md` §8）一行注 + 本修订行；不删既有叙述、不改父 `state.json` 容器体例。 | 2026-09-13 | SDDU Plan Agent |
