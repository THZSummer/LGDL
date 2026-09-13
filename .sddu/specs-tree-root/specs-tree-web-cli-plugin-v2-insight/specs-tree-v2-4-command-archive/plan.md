# 技术计划：specs-tree-v2-4-command-archive（V2-4 命令档案浏览器）

> **文档定位**: SDDU 技术方案（**叶子子 Feature**，P1，**纯只读展示面**）— 记录 V2-4 的架构设计、方案对比与 ADR，作为 tasks 阶段的输入
> **前置依赖**: 父 `spec.md` §5.5（FR-V2-050~FR-V2-056 权威条文）+ 本目录 `spec.md`（含 NFR-V24-001~005 / EC-V24-001~005 / AC-V24-001~007）+ 父 `plan.md`（**ADR-V2-001~015**，尤其 **ADR-V2-012 预留位** / ADR-V2-007 体积守卫 / ADR-V2-010 parity 同源 / ADR-V2-011 `deny` 不可关 / ADR-V2-015 来源约束）+ V2-1/V2-2/V2-3（P0 已 `validated`）
> **创建人**: SDDU Plan Agent · **创建时间**: 2026-09-13 · **版本**: v1.0 · **更新人/时间**: SDDU Plan Agent / 2026-09-13
> **更新说明**: 初始创建。把 P0 已就绪的「命令档案数据」在既有悬浮树 + 覆盖式抽屉内落地为**只读档案子视图**：逐条有档（三层口径分列、不夸大）、`deny` 成因分层可读、`delay` 撞词消歧单一措辞源、只读检索/过滤、体积与门禁加固、parity 同源对账。产出 **ADR-V2-016~023**（与 ADR-V2-001~015 零冲突）。**只做技术设计**：不写代码、不排任务、不改 v1、不碰 `main` / `packages/web-cli-base/**`。

---

## 1. 前置检查

| 检查项 | 状态 |
|--------|:--:|
| 本目录 `spec.md` 存在（v1.0，2026-09-13） | ✅ |
| 父 `spec.md` §5.5 FR-V2-050~056 权威条文可用 | ✅ |
| 外部 API 文档缓存 | ⚠️ N/A（V2-4 无外部服务；沿用父 plan §1「无外部 API」核实结论） |
| V2-1 模型预留位已交付且 `validated` | ✅（`cardId`/`denyCause`/`sourceKind`/`delayMs`+`action` 分列/`suppressed`+`suppressionReason`/`facets`/`catalogMeta?`/`version`） |
| V2-2 抽屉载体 + V2-3 动作面已交付且 `validated` | ✅（`#tree-fab`/`#tree-drawer`/`tree-view.ts`/`tree-ops.ts` 封闭 7 动作） |
| parity 同源模块已存在 | ✅（`src/insight/catalog-reconcile.ts` + `test/parity/baseline-catalog.json` 34 工具 / 142 子命令 + `waivers.json`；ADR-V2-010） |
| 体积守卫基线已存在（W4 显式重登记） | ✅（`test/size-baseline.ts`：sidepanel 1,110,744 B / 容差 5% / ceiling 1,166,281；`CONTENT_MAX_BYTES=1,073,453`） |
| **代码现状逐文件核实**（命令档案数据已就绪） | ✅（`git log 9f55d1b..b551705`） |
| **P0 门禁现状**（断言只增不减的挂载点） | ✅（`insight-catalog` / `insight-action-parity` / `insight-no-escalation` / `size-budget` / `test/ui/insight.mjs` 52 断言） |

---

## 2. 架构分析

### 2.1 现状：命令档案的「数据面」已在 P0 就绪（V2-4 复用而非重造）

| 层 | 现状（P0 交付） | V2-4 如何消费 |
|----|------------------|----------------|
| 类型/字段 | `tree-model.ts#CommandNode`：`cardId` / `denyCause`（4 值 + 可选）/ `sourceKind`（8 值）/ `delayMs` 与 `action` **分列** / `presentInSurface` / `suppressed` / `suppressionReason` / `badges` / `crossLinks` / `controls`；`CatalogFacets`；`CatalogMeta?`；`version:1` | **零模型改动**直接读（ADR-V2-012 兑现） |
| 档位推导 | `command-catalog.ts#deriveAction`：S1 未授权 → `deny/s1-unauthorized`；S3 risk 缺失/非法 → `deny/s3-unknown-risk`；`evaluate` → `deny/evaluate-floor`；否则 `PLUGIN_RISK_DEFAULTS`。**注意：`auto-hardDeny` 该函数永不产出**（类型预留） | 档案直接消费 `denyCause`；`auto-hardDeny` 由独立只读派生表达（§3.3） |
| 来源分类 | `command-catalog.ts#sourceKindOf`（8 值）；`site-declared` 带 origin `crossLink` | 档案显示来源标签 + `site_*` 所属 origin |
| facets | `project-tree.ts#computeFacets` → `{actions, risks, sources, origins, subcommands}` 预计算 | 驱动过滤下拉与计数，**不重算** |
| 快照 meta | `meta.counts.{commands,subcommands}` / `meta.hash` / `meta.degradations` / `meta.modelNote` | 档案覆盖计数与确定性锚点 |
| catalogMeta | 类型已预留，但 **`service-worker.ts#buildInsightSnapshot` 从未注入**（`catalogMeta` 恒 `undefined`）→ **P0 预留位是空位** | V2-4 注入（§3.9，**唯一 additive 运行时改动**） |
| 渲染 | `tree-view.ts#buildTreeRows` 纯渲染模型；`tree-drawer.ts` DOM 挂载（惰性、`createElement`/`textContent` 零标记注入）；封闭文案常量 `TREE_MODEL_NOTE` / `TREE_NO_ESCALATION_NOTE` / `DENY_CAUSE_LABEL` / `SOURCE_KIND_LABEL` | 档案**复用**同一措辞源；不新增第二套（§3.4） |
| 对账 | `catalog-reconcile.ts`：`loadBaseline/loadWaivers/reconcileCatalog/coveragePercent` + 单一基线路径字面量 | 原文复用，**不新建第二份真值**（§3.9） |
| 安全 | `tree-ops.ts#TREE_ACTION_IDS` 恰 7 值、无命令级条目；`tree-view.ts#commandControls`：`action==='deny' ⇒ controls:[]` | 档案为**结构无控件面**，不动 7 动作白名单（§3.7） |

### 2.2 目标（V2-4 要做的事）

```
ConnectTreeSnapshot（P0 确定性纯投影，含 command 维度）
        │  （纯函数、零 IO、零副作用）
        ▼
src/insight/archive-catalog.ts#buildArchiveModel(snapshot, archiveFilter)
        │  → ArchiveModel { coverage, facets, cards[], groups[], notes }
        │      · coverage = 三层口径分列（基线/豁免/实时面）+ parity 结论
        │      · card     = cardId + action + risk + sourceKind(+origin) + delayMs + denyCause + autoAuthHardLine + suppressed
        │      · 结构保证：卡片**无任何控件字段**
        ▼
src/ui/tree/tree-drawer.ts（**追加**档案子视图渲染；默认关；不改既有骨架）
        │  createElement/textContent only；档案卡片类名独立（不污染既有选择器）
        ▼
#tree-drawer 内 .tree-archive（只读展示；DOM 层零 button[data-action-id]/零 .tree-control）
```

### 2.3 依赖关系图（新增面最小化）

```
[NEW] src/insight/catalog-meta.ts（纯常量，typed by 既有 CatalogMeta）
   └─► [MODIFY] src/background/service-worker.ts#buildInsightSnapshot：+1 行注入 catalogMeta
            └─► snapshot.catalogMeta（既有字段，运行时首次非空）
[NEW] src/insight/archive-catalog.ts（纯：模型/三层口径/过滤/auto-hardDeny 派生）
   ├─► [MODIFY] src/ui/tree/tree-drawer.ts（追加档案子视图 + 开关/分组/检索接线）
   └─► [NEW] test/insight-archive.test.ts（node 门禁）
                └─► [MODIFY] test/size-baseline.ts（显式重登记）
                └─► [MODIFY] test/ui/insight.mjs（追加 #I-19a…）
```

**不改面（红线）**：`packages/web-cli-base/**`、`src/security/policy.ts`、`src/security/auto-authorize.ts`、`manifest.json`、`src/content/**`、`src/insight/tree-model.ts`、`src/ui/tree/tree-ops.ts`、`src/ui/tree/tree-view.ts`、`src/ui/tree/tree-receipt.ts`、`test/parity/**`、v1 `test/ui/journey.mjs` / `test/perf-*` / `test/ui/binding.mjs` 既有断言、v1 SDDU 目录。

### 2.4 与 P0 的边界（为什么这些「不改」是硬的）

- **不改 `#panel-main` 内 FAB/抽屉骨架**：P0 收口后，`test:insight` **52 断言**与布局守卫（`#log ≥589px`、composer ∈[0,+8]、FAB∩composer=0、400/320px 零溢出、开/关两态逐字段相等）均绑定既有 DOM 结构；档案只允许在 `tree-body` 内**追加**独立容器，默认关时渲染路径与现状一致。
- **不改 `tree-view.ts` / `TreeFilter`**：P0 的渲染模型与过滤已被 `tree-view.test.ts` + `#I-12/#I-13` 钉死。V2-4 的过滤类型 `ArchiveFilter` **独立定义**在新模块，避免触碰既有 `TreeFilter`。
- **不在 `src/ui/tree/` 新增文件**：`insight-no-escalation.test.ts` 的 `treeSources()` 使用**精确文件名列表**断言（`['tree-drawer.ts','tree-ops.ts','tree-receipt.ts','tree-view.ts']`）。P0 plan §3.5 曾预留 `src/ui/tree/archive-view.ts`，但那会让该既有断言 FAIL；V2-4 据此把渲染模型并入 `src/insight/archive-catalog.ts`（`insightSources()` 用 `readdir` + `length>=6`，天然容纳新文件），**换取「既有断言零修改」**（见 ADR-V2-016 被否决方案 B）。

---

## 3. 设计决策（逐条回应 9 个必答问题）

### 3.1 档案视图形态（问题 1）

**决策：复用 P0 抽屉内的「档案子视图」（默认关）。** 在既有 `#tree-drawer` 的 `tree-filter` 容器内**追加**一个开关按钮 `#tree-archive-toggle`（`aria-pressed`）与一个分组维度选择 `#tree-archive-groupby`（按工具 / 按档位 / 按 risk / 按来源 / 按成因）；开启时在 `tree-body` 内渲染独立容器 `.tree-archive`（覆盖命令维度的默认平铺展示），关闭时**不创建该容器**。

- 卡片粒度 = 工具卡（`cmd:<name>`）+ 子命令卡（`cmd:<name>#<sub>`），直接复用 `cardId`。
- 分组维度切换仅改变 `.tree-archive` 内的分组标题与排序（纯展示），**不动快照、不改判定**。
- 类名隔离：档案卡片用 `.tree-archive-card` / `.tree-archive-group` / `.tree-archive-field`，**不复用** `.tree-row` / `.tree-control`；因此既有选择器（`#I-12` 的 `.tree-row[data-action="deny"]`、`#I-18e` 的 `.denyWithControls`）在档案开启时也不被污染。

### 3.2 逐条有档的可达性口径（问题 2）——**三层分列，禁止夸大**

**决策：档案的「逐条有档」= 三个口径分列显示 + `accounted` 100% 机器可验；`carded` 只等于实时投影面。**

| 口径层 | 定义 | P0 实测值 | 来源 |
|--------|------|-----------|------|
| **L1 对账基线** | 单一真值：基线每一条工具/子命令 | **34 工具 / 142 子命令** | `test/parity/baseline-catalog.json`（provenance `main@2ddc92299ad10cfe0ea2b65403243a45ce7fb041`） |
| **L2 豁免登记** | 基线中按 `waivers.json` 登记状态与理由的条目（**非「缺失」**） | **20 工具 / 88 子命令**（`mapped` 4/39、`not-applicable` 9/29、`baseline-disabled` 6/16、`delegated` 1/4） | `test/parity/waivers.json` |
| **L3 实时投影面** | 当次快照的命令节点（含 `presentInSurface:false` 的抑制合成条目） | **28 条目 / 94 子命令 = 122 档案卡**（去重后 **23 个工具名**；其中 5 条为抑制合成条目） | P0 `insight-action-parity` 同款 fixture（T3 实测） |
| **accounted** | `carded ∪ waived` 覆盖基线的比例 | **34/142 = 100%** | 机器计算（门禁断言） |

**关键纪律（不夸大）**：
- UI 头部**只**显示「实时面 N/M 卡」+「对账基线 34/142（来源 commit）」+ parity 对账结论（`reconcileCatalog` 的 `missing/missingSubs/unregistered/extraStale` 四字段全空 ⇒ 「无缺口」）；**绝不写「34/142 已全部渲染为卡」**。
- L3 的 28/94 是 **P0 T3 fixture 口径**；真实运行时数量随「开关 / 能力授权 / 绑定站点（`site_*` 声明工具）」变化。因此档案 UI 显示**当次快照的真实计数**，门禁用**动态不变量** `cards.length === counts.commands + counts.subcommands`（恒真）+ **fixture 钉死值 122**（与 P0 同源）双断言。
- 「逐条有档」的机器定义 = 基线**每一行**（工具与子命令）都必须 ∈ (`carded` ∪ `waived-with-reason`)，无任何未 accounted 行。**反证**：从基线删一行 → FAIL；把 `accounted` 直接用 L1 计算（假装全部已渲染）→ 断言必须 FAIL（防夸大自证）。

### 3.3 `deny` 三成因分列 + `auto-hardDeny`（问题 3）

**决策：分层表达，不新增模型字段。**
- **policy 层三成因**：直接取 `CommandNode.denyCause`（`deriveAction` 产出 `s1-unauthorized` / `s3-unknown-risk` / `evaluate-floor`），标签复用 `tree-view.ts#DENY_CAUSE_LABEL`（**单一文案源**）。
- **自动授权层 `auto-hardDeny`**：由 `archive-catalog.ts` 的**纯派生只读函数**表达，不写入模型：
  ```ts
  autoAuthHardLine(card) === true  ⇔  card.group === PLUGIN_SITE_GROUP
                                   ∧ (card.risk === 'evaluate' ∨ card.risk 缺失/非法)
  ```
  依据 `decideAutoAuthorization` 的真实顺序：`!origin ⇒ 不自动` → `write∧destructive ⇒ 不自动` → `group!=='site' ⇒ 不自动` → `evaluate ⇒ hardDeny` / risk 不可分类 ⇒ `hardDeny`。
- 档案卡**两行分列**展示：`处置（policy）` 与 `自动授权层`。二者是**不同层**的 fail-closed 表达，可同时命中（如站点 `evaluate` 工具：policy=`evaluate-floor`，auto=`hardDeny`）；**非站点**的 `evaluate`/未知 risk 卡：policy 仍 `deny`，但 auto 层标注「不适用（非站点工具不进入按 origin 自动授权）」——**如实分列，不合并、不夸大**。
- 沿用 `CommandNode.badges` 中已有的 `hard-deny` 徽标。

**T3 教训落地（强）**：门禁用**真实** `decideAutoAuthorization` 对**全量卡片**（28 条目/94 子命令）逐条断言 `autoAuthHardLine(card) === realDecision.hardDeny === true`，另加**站点域矩阵**（`read/write/evaluate/unknown/ui/state/external/undefined` × 授权 × trust）交叉断言；**反证自测**（人为翻转一张卡的 `applies` → 必须 FAIL）。

### 3.4 `delay`（= `deny`）撞词消歧（问题 4）

**决策：单一措辞源，档案不新增第二套说法。**
- 档案视图**不重复渲染**消歧句：既有 `tree-notes` 区块（`tree-drawer.ts` 恒渲染的 `#tree-note-no-escalation`）已在**同一处**并标 `TREE_NO_ESCALATION_NOTE`（含「`delay`（= `deny`，fail-closed，非可配置档位；与命令间 `delayMs` 无关）」），档案开启时该区块仍可见 → 满足 FR-V2-054「同一处并标」。
- 档案卡片的 `delayMs` 列文案**复用既有措辞**「命令间隔 delayMs=N ms（与 delay 档无关）」；`delayMs` 与 `action` 分列（模型已是分列字段）。
- 门禁（W3 手法，**内容哈希钉死**）：
  1. `archive-catalog.ts` **导入** `TREE_NO_ESCALATION_NOTE`（不是复制字面量）；grep 断言档案模块**不含**第二处 `fail-closed，非可配置档位` 字面量；
  2. `sha256(TREE_NO_ESCALATION_NOTE)` 内容哈希 pin（任何改动必须显式改 pin + 注明日期/理由）；
  3. DOM 断言：`.tree-note-no-escalation` 全文档**恰 1 处**，且 `document.body.textContent` 中 `非可配置档位` 出现次数 === 1（档案不引入第二处）。

### 3.5 检索/过滤（问题 5）——**只读**

**决策：`ArchiveFilter` 独立定义于 `archive-catalog.ts`；`buildArchiveModel` 纯函数；过滤只改展示集合。**

```ts
interface ArchiveFilter {
  groupBy: 'tool' | 'action' | 'risk' | 'source' | 'deny-cause';
  query?: string;
  action?: PolicyAction;
  risk?: ToolRisk | 'unknown';
  sourceKind?: SourceKind;
  denyCause?: DenyCause;
  origin?: string;          // site_* 卡片所属 origin
  suppressed?: boolean;      // true=仅抑制；false=仅在场
}
```
- 过滤维度覆盖父 FR-V2-056「按档位 / risk / 来源检索过滤」+ 子级补充「按 action / 来源 / origin / 子命令」。
- 复用 `snapshot.facets`（`actions/risks/sources/origins/subcommands`）驱动下拉与计数；**不重算**。
- **只读契约（P0 已确立）**：门禁断言过滤前后 `stableStringify(snapshot)` **全等**、`groups[0]` 授权节点 id 列表不变、且过滤**真的收窄**（反证：谓词恒 `true` → 断言 FAIL）。

### 3.6 体积守卫（问题 6）

| 产物 | 策略 | 具体 |
|------|------|------|
| `dist/content.js` | **零增长（硬红线）** | 不碰 `src/content/**`；沿用 `CONTENT_MAX_BYTES = 1_073_453`（**无容差**）；另加 **`src/content/**` 源码内容哈希钉死**（W3 手法，替代提交后恒绿的 `git diff HEAD`） |
| `dist/sidepanel.js` | **显式重登记（W4 纪律）** | build 后实测 → 更新 `SIDEPANEL_BASELINE_BYTES`；`SIDEPANEL_BASELINE_BYTES_HISTORY` **追加现值 `1_110_744`（历史保留 1,068,165 / 1,085,389 / 1,110,744）**；容差 **5% 不变**；ceiling 重算；`SIDEPANEL_BASELINE_META` 追加 `measuredOn` / `previousBaselineBytes` / `reRegisteredFrom` / 理由；`targetBudgetBytes:null`、`targetMet:null` **保持不变**（基线 ≠ 目标预算） |

- **预估但以实测为准**：V2-4 新增 `archive-catalog.ts`（约 5 KB）+ `tree-drawer.ts` 追加（约 3 KB）+ `catalog-meta.ts`（`service-worker` 侧，不进 sidepanel）；5% headroom = **55,537 B**，预计充裕。**不得**预设结果；重登记必须前后值 + 日期 + 来源 + 理由。
- **门禁挂载**：`size-budget.test.ts` **既有断言零删改**；V2-4 只**追加**：① `SIDEPANEL_BASELINE_BYTES_HISTORY` 含 `1_110_744` 且单调不减；② `META` 含日期/来源/理由且 `targetBudgetBytes===null`/`targetMet===null`；③ `ceiling === floor(baseline×1.05)` 结构一致；④ 反证（`ceiling+1` → FAIL）沿用；⑤ `content.js` ceiling 未变 + 源码哈希 pin。

### 3.7 安全红线零放宽（问题 7）——**结构证据**

档案是**只读展示面**，以下为**结构（类型/DOM/门禁）保证**，非文字承诺：

| 证据 | 形态 | 门禁 |
|------|------|------|
| **E1 卡片类型无控件** | `ArchiveCard` 接口**不含** `controls` / `actionId` / `control` 字段（只有只读展示字段） | 运行时遍历全部卡片断言 `Object.keys(card) ∩ {controls, actionId, control, actionTarget} === ∅` |
| **E2 模块不可达写路径** | `archive-catalog.ts` 不导入 `tree-ops.ts` / `tree-receipt.ts` / 任何 `security/**` 写面；仅导入 `tree-model.ts` 类型 + `command-catalog.ts#sourceKindOf`（纯）+ `PLUGIN_SITE_GROUP`（纯配置常量，与 `command-catalog.ts` 同款） | grep 断言：无 `tree-ops` / `actionId` / `TreeActionId` / `riskDefaults\s*[:=]` / `createPluginPolicyConfig` |
| **E3 7 动作白名单零扩展** | `TREE_ACTION_IDS` **恰 7 值**、无命令级条目；V2-4 **不新增任何写动作** | `sha256(TREE_ACTION_IDS)` pin + 长度 === 7 + 既有 `tree-ops.test.ts` 零改动 |
| **E4 DOM 层零控件** | `.tree-archive` 内**无** `button[data-action-id]`、无 `.tree-control`、无 `input[type=checkbox]`/`select` 之外的开关语义控件 | `test:insight` `#I-19g` DOM 断言 |
| **E5 `deny` 控件恒空** | 档案 `deny` 卡**结构上**无控件（E1 已保证所有卡无控件，`deny` 是子集） | `#I-19c/#I-19g` + node 全量遍历 |
| **E6 静态权限不可撤销** | 档案不涉及能力撤销面（属 V2-3），不改 `revocable` 语义 | 既有 P0 断言零改动 |
| **E7 判定链冻结** | `src/security/policy.ts` / `auto-authorize.ts` 零改动 + 内容哈希 pin（P0 W3 已建，V2-4 不重复但复用） | P0 `insight-no-escalation.test.ts` 既有 pin 零改动 |

**「不新增写路径」的结构证据链**：`ArchiveCard` 类型无控件字段（编译期不可渲染）→ 档案模块不可导入 `tree-ops`（模块图无写入口）→ `TREE_ACTION_IDS` 恰 7 值且被哈希钉死（动作面不可扩展）→ DOM 无 `data-action-id`（运行期无可点写控件）。四层一致。

### 3.8 门禁挂载（问题 8）——**断言只增不减**

| 门禁 | 类型 | 挂载方式 | 断言要点 |
|------|------|----------|----------|
| `test/insight-archive.test.ts` | node（`npm test` glob `test/*.test.ts`） | **新文件** | 三层口径 + 逐条有档 + deny 分层 + 只读过滤 + catalogMeta 漂移 + 禁改面内容哈希 pin + 反证自测（详见 §5 交付门槛） |
| `test/ui/insight.mjs`（`test:insight`） | Chromium | **追加 `#I-19a…`**（既有 `#I-00…18e` 零删改） | 档案开关默认关 / 卡片字段可读 / `delay` 单源 / 只读过滤 / 零控件 / 开档案后布局不回退 |
| `test/size-baseline.ts` + `test/size-budget.test.ts` | node | **重登记 + 追加断言** | §3.6 |
| `test/insight-no-escalation.test.ts` | node | **零改动** | `src/insight/**` glob 自然吸纳新文件；`treeSources()` 精确列表因「不新增 `src/ui/tree/` 文件」而保持绿 |
| v1 `test/ui/journey.mjs` / `perf-*` / `test/parity/**` / `test/ui/binding.mjs` 既有断言 | — | **零改动** | 红线段 |
| `test/insight-catalog.test.ts` / `insight-action-parity.test.ts` | node | **零改动** | parity 同源与策略一致性沿用 P0；V2-4 不复制其断言 |

**虚绿门禁纪律（P0 教训继承）**：新门禁必须**能真 FAIL**——每条关键断言配反证自测；`catch` 只吞 `ENOENT`；不得 `assert.ok(true)` 式空断言；冻结类断言用**内容哈希钉死**（不用 `git diff --quiet HEAD`）。

### 3.9 parity 对账同源（问题 9）

**决策：原文复用 `catalog-reconcile.ts`；`catalogMeta` 用「生成式常量」注入，运行时**不打包**基线 JSON。**
- 单一真值：`loadBaseline()` / `loadWaivers()` / `reconcileCatalog()` / `coveragePercent()` / `countBaselineSubcommands()` / `PARITY_BASELINE_RELATIVE_PATH`（与 v1 `parity.test.ts` 同源锚点）**全部复用**，**不新建第二份真值**。
- `src/insight/catalog-meta.ts` 导出 `CATALOG_BASELINE_META: CatalogMeta = { toolCount: 34, subcommandCount: 142, provenanceCommit: '<40-hex>' }`（纯常量，无 `node:fs`、不进 runtime 依赖树）；`service-worker.ts#buildInsightSnapshot` 的 `buildInsightTree({...})` **追加一行** `catalogMeta: CATALOG_BASELINE_META`。
- **漂移门禁**：`test/insight-archive.test.ts` 断言 `CATALOG_BASELINE_META.toolCount === loadBaseline().toolCount`、`subcommandCount === countBaselineSubcommands(baseline)`、`provenanceCommit === baseline.provenance.commit` 且匹配 `/^[0-9a-f]{40}$/`；**反证**：改常量一位 → 断言 FAIL。
- **不夸大**：`catalogMeta` 只描述**基线**（34/142 + provenance），**不描述**本轮渲染了多少卡；渲染计数只来自 `snapshot.meta.counts`。

---

## 4. 方案对比

### 4.1 档案视图落点

| 维度 | 方案 A：新顶层「命令」第五维度 | 方案 B：独立第二覆盖层/新抽屉 | **方案 C：复用抽屉内「档案子视图」（默认关）** |
|------|:--|:--|:--|
| 描述 | 在四维度森林外新增第五维度「命令档案大全」 | 新建 `#archive-drawer` 覆盖层或独立页 | 在既有 `#tree-drawer` 内追加 `.tree-archive` 子视图 + 开关 |
| 优点 | 语义直观 | 档案空间大 | 零新增 `#panel-main` 结构；默认关时既有渲染零感知；复用 FAB/抽屉/文案/布局守卫 |
| 缺点 | 破坏四层分组模型 + 快照结构与 hash 确定性；返工 V2-1/V2-2 | 牵动 P0 52 断言与布局守卫；新增结构与样式面 | 档案空间受抽屉宽度限制（`min(340px,100%)`），需紧凑排版 |
| 风险 | **高** | 中 | **低** |
| 工作量 | L | M | S |

### 4.2 逐条有档覆盖策略

| 维度 | 方案 A：只覆盖实时投影面（28/94） | 方案 B：运行时枚举基线 34/142 卡片 | **方案 C：三层口径分列 + accounted 100%（不夸大）** |
|------|:--|:--|:--|
| 描述 | UI 只显示实时面，不提基线 | 把 baseline JSON 打进 bundle 以渲染 34/142 | L1 基线 / L2 豁免 / L3 实时面分列 + accounted 机器可验 |
| 优点 | 实现最简 | 字面「142 卡」 | 口径与 P0 一致、可机器验、**不夸大**；不打包测试件 |
| 缺点 | 与 FR-V2-050「34/142 逐条有档」脱节 | **打包 test 产物、增重、误导（waived 项并非可渲染命令）** | 需要用户读懂三层口径（用可读文案解决） |
| 风险 | 中（口径缺口） | **高（夸大 + 增重）** | **低** |
| 工作量 | S | M | M |

### 4.3 `deny` 四成因表达

| 维度 | 方案 A：给 `CommandNode` 新增 `autoHardLine` 字段 | 方案 B：把 `auto-hardDeny` 塞进 `DenyCause` 由 `deriveAction` 产出 | **方案 C：policy 三成因（取 `denyCause`）+ 自动授权层派生只读（不新增字段）** |
|------|:--|:--|:--|
| 优点 | 卡片字段齐全 | 单一枚举 | **零模型改动**（ADR-V2-012 兑现）；语义分层清晰；可全量交叉断言 |
| 缺点 | 改模型 → 返工 V2-1 投影/快照 hash/已验确定性 | 与 policy 层语义混淆；`deriveAction` 无 origin/auto 语境 → 需改判定旁路 | 需门禁补全量一致性断言（T3 教训） |
| 风险 | 中 | **高（语义污染 + 旁路风险）** | **低** |
| 工作量 | M | M | S |

### 4.4 `catalogMeta` 注入

| 维度 | **方案 A：生成式常量 + `service-worker` 1 行注入** | 方案 B：不注入，UI 降级为无基线信息 | 方案 C：运行时打包 baseline JSON |
|------|:--|:--|:--|
| 优点 | 兑现 P0 预留位；展示面有 parity 锚点；增量极小 | 零 v1 运行时改动 | 无需常量 |
| 缺点 | 需改 `service-worker.ts`（+1 行 additive 只读） | P0 预留位空置；FR-V2-053 展示面缺锚点 | **打包测试件 + 增重 + 真值外泄** |
| 风险 | **低**（与 P0 `host.ts#delayConfig()` additive 同款） | 低 | **高** |
| 工作量 | S | S | M |

---

## 5. 推荐方案

**推荐：4.1-C + 4.2-C + 4.3-C + 4.4-A。**

理由：
1. **零模型改动、零既有断言修改**：不触碰 `tree-model.ts` / `tree-view.ts` / `tree-ops.ts` / `TreeFilter`，也不在 `src/ui/tree/` 新增文件（避开 `treeSources()` 精确列表断言），把风险面压到「新增纯模块 + 抽屉追加渲染 + 1 行 additive 注入」。
2. **口径与 P0 一致、可机器验、不夸大**：三层口径 + `accounted` 100% + 动态不变量 `cards === counts.commands + counts.subcommands` + fixture 钉死 122，全部可反证。
3. **安全红线结构保证**：卡片类型无控件字段 + 模块图无写入口 + 7 动作白名单哈希钉死 + DOM 零控件，四层一致。
4. **继承 P0 教训**：`delay` 单源 + 内容哈希钉死（W3）、体积显式重登记（W4）、测量条件写进 spec/AC（D-V22-01）、策略再实现全量交叉断言（T3）。

---

## 6. 文件影响分析

| 操作 | 文件路径 | 说明 |
|:--:|------|------|
| NEW | `packages/web-cli-plugin/src/insight/archive-catalog.ts` | 档案纯模型：`buildArchiveModel(snapshot, filter)` → `{ coverage, facets, cards, groups, notes }`；`ArchiveFilter` / `ArchiveCard` / `autoAuthHardLine()`；默认关的过滤折叠；**零 IO / 零 chrome / 零明文 / 无控件字段** |
| NEW | `packages/web-cli-plugin/src/insight/catalog-meta.ts` | `CATALOG_BASELINE_META: CatalogMeta`（34/142 + provenance commit 常量；无 `node:fs`；typed by 既有 `CatalogMeta`） |
| MODIFY | `packages/web-cli-plugin/src/ui/tree/tree-drawer.ts` | **追加**：`#tree-archive-toggle`（`tree-filter` 容器内）+ `#tree-archive-groupby` + `.tree-archive` 渲染分支（`createElement`/`textContent` only）；**不改** header/notes/receipt/confirm 结构与既有渲染路径（默认关逐字节等价） |
| MODIFY | `packages/web-cli-plugin/src/background/service-worker.ts` | `buildInsightSnapshot` 的 `buildInsightTree({...})` **追加 1 行** `catalogMeta: CATALOG_BASELINE_META`（additive 只读；不改判定链 / 消息语义 / 授权路径） |
| MODIFY | `packages/web-cli-plugin/test/size-baseline.ts` | **显式重登记** sidepanel 基线（build 后实测）+ 追加 `HISTORY` + `META` 溯源字段；容差 5% 不变 |
| NEW | `packages/web-cli-plugin/test/insight-archive.test.ts` | V2-4 node 门禁（§3.8；含反证自测） |
| MODIFY | `packages/web-cli-plugin/test/ui/insight.mjs` | **追加 `#I-19a…`**（既有 `#I-00…18e` 零删改；复用同一 Chromium 会话，**不新增并发 Chromium 门禁**） |
| MODIFY | `packages/web-cli-plugin/test/size-budget.test.ts` | **追加**重登记一致性断言（既有断言零删改） |
| MODIFY | `.sddu/specs-tree-root/specs-tree-web-cli-plugin-v2-insight/specs-tree-v2-4-command-archive/state.json` | `phase` `specified`→`planned`；`workflow`→`3.plan`；`agent`→`sddu-plan`；`artifacts`/`files` 登记 `plan.md` |
| MODIFY | `.sddu/specs-tree-root/specs-tree-web-cli-plugin-v2-insight/plan.md` | **最小追加** ADR-V2-016~023 登记行 + 修订记录行（不删既有） |
| MODIFY | `.sddu/specs-tree-root/specs-tree-web-cli-plugin-v2-insight/state.json` | `childrens[V2-4].phase` `specified`→`planned`（**父保持轻量规范容器体例**：`phase`/`workflow`/`agent` 不变）+ `notes` 最小追加 |
| MODIFY | `.sddu/specs-tree-root/specs-tree-web-cli-plugin-v2-insight/specs-tree-v2-4-command-archive/TREE.md`（+ 父链 `TREE.md`） | 由 `sddu-tree` Skill 定向刷新（反映 `planned` + `plan.md`） |
| —（build 阶段候选） | `packages/web-cli-plugin/docs/dev.md` / `docs/smoke-checklist.md` / `ROADMAP.md` | V2-4 交付后回填：`test:insight` 断言数、sidepanel 体积、人工面（档案长文案/窄栏观感）；**只增不改、历史保留** |

**零改动面（红线，门禁断言）**：`packages/web-cli-base/**`、`src/security/policy.ts`、`src/security/auto-authorize.ts`、`manifest.json`、`src/content/**`、`src/insight/tree-model.ts`、`src/ui/tree/tree-view.ts`、`src/ui/tree/tree-ops.ts`、`src/ui/tree/tree-receipt.ts`、`test/parity/**`、`test/parity.test.ts`、`test/ui/journey.mjs`、`test/perf-*`、`test/ui/binding.mjs` 既有断言、v1 SDDU 目录。**无新依赖**（`package.json` deps 零新增）。

---

## 7. 风险评估

| 风险 | 概率 | 影响 | 缓解措施 |
|------|:--:|:--:|----------|
| **口径夸大**（把基线 34/142 说成「已渲染 142 卡」） | 中 | **高（诚实性红线）** | 三层口径分列（ADR-V2-017）；UI 只显示实时面计数 + 基线分列；门禁钉死「carded=28 ≠ baseline=34」并配**防夸大反证**（若有人改成相等 → FAIL） |
| **`auto-hardDeny` 派生与真实判定链漂移** | 中 | 高 | 复用 T3 手法：全量卡片 + 站点域矩阵与**真实** `decideAutoAuthorization` 交叉断言 + 反证（ADR-V2-018） |
| **`delay` 出现第二套说法**（漂移） | 低 | 中 | 单一措辞源 + 导入而非复制 + 内容哈希 pin + DOM 出现次数断言（ADR-V2-019） |
| **档案开启改变既有布局/断言** | 中 | 中 | 默认关；类名隔离；`#I-19h` 复用 `checkLayout` 断言开档案后 `#log ≥589px` / composer ∈[0,+8] / 零溢出；既有 52 断言零删改（ADR-V2-016） |
| **`service-worker.ts` 注入 `catalogMeta` 引发回归** | 低 | 中 | 1 行 additive 只读；不改判定链/消息语义；`catalogMeta` 不进快照 hash 输入（P0 已如此）→ 确定性不受影响；node 门禁断言注入值与基线一致 |
| **体积静默上涨 / 基线静默上调（W4 前科）** | 中 | 中 | 显式重登记（前后值 + 日期 + 来源 + 理由 + 历史保留）；容差 5% 不变；反证自测（ADR-V2-022） |
| **`content.js` 被间接触碰** | 低 | **高（零注入红线）** | 不碰 `src/content/**`；`CONTENT_MAX_BYTES` 无容差 + **源码内容哈希钉死**（W3 手法） |
| **虚绿门禁（空断言 / bare catch / `git diff HEAD` 假安全网）** | 低 | 高 | 每条关键断言配反证；`catch` 只吞 `ENOENT`；冻结用内容哈希（ADR-V2-022） |
| **Chromium 门禁并发导致 OOM** | 低 | 高 | 断言**追加**到既有 `insight.mjs`（复用单会话），**不新增**第二个 Chromium 门禁；串行纪律不变 |
| **新增 `src/ui/tree/` 文件触发既有精确列表断言** | 低 | 中 | 已规避：渲染模型并入 `src/insight/archive-catalog.ts`（ADR-V2-016） |

---

## 8. 生成的 ADR

> **8 个 ADR（ADR-V2-016~023）**，与 **ADR-V2-001~015**（父 plan §8）及 v1 **ADR-001~018** **零编号冲突**。状态 = **ACCEPTED（编排器代作者决策，2026-09-13 授权）**。

| ADR | 标题 | 状态 |
|-----|------|:--:|
| ADR-V2-016 | 档案视图 = 复用 P0 抽屉内「档案子视图」（默认关）；渲染模型并入 `src/insight/`，**既有断言零修改** | ACCEPTED |
| ADR-V2-017 | 逐条有档口径 = 三层分列（基线 34/142 · 豁免 20/88 · 实时面 28/94=122 卡）+ `accounted` 100%；**禁止夸大** | ACCEPTED |
| ADR-V2-018 | `deny` 成因分层 = policy 三成因（`denyCause`）+ 自动授权层 `auto-hardDeny`（派生只读、不新增模型字段）；全量交叉断言（T3 教训） | ACCEPTED |
| ADR-V2-019 | `delay` 消歧 = 单一措辞源（复用 `TREE_NO_ESCALATION_NOTE`）；内容哈希钉死，禁第二套说法（W3 教训） | ACCEPTED |
| ADR-V2-020 | 档案 = **结构无控件只读面**（卡片类型无控件字段 + 模块图无写入口 + 7 动作白名单零扩展哈希钉死 + DOM 零控件） | ACCEPTED |
| ADR-V2-021 | parity 同源 = 复用 `catalog-reconcile.ts`（不新建真值）+ `catalog-meta.ts` 常量注入（运行时不打包 baseline）；漂移门禁 + 反证 | ACCEPTED |
| ADR-V2-022 | 门禁挂载与体积重登记纪律 = 断言只增不减（新 node 文件 + `#I-19a…` 追加）+ sidepanel 显式重登记 + content.js 零增长内容哈希 + 测量条件写进 spec/AC | ACCEPTED |
| ADR-V2-023 | V2-4 = **零模型改动**（ADR-V2-012 兑现）；唯一 additive 运行时注入面 = `service-worker` 1 行 `catalogMeta` | ACCEPTED |

---

### ADR-V2-016: 档案视图 = 复用 P0 抽屉内「档案子视图」（默认关）；渲染模型并入 `src/insight/`

## 状态
ACCEPTED（编排器代作者决策，2026-09-13 授权）

## 背景
FR-V2-050~056 要求把命令档案做成可见的浏览器。P0 已交付悬浮 FAB + 覆盖式抽屉（ADR-V2-005），并收口了 `test:insight` **52 断言** + 侧栏布局量化守卫。任何触及 `#panel-main` 骨架或 `src/ui/tree/` 文件清单的改动都会牵动已 `validated` 的门禁。

## 决策
1. 档案 = 既有 `#tree-drawer` 内的**子视图**：`tree-filter` 容器内追加 `#tree-archive-toggle`（默认 `aria-pressed=false`）+ `#tree-archive-groupby`；开启时在 `tree-body` 内渲染独立 `.tree-archive`。默认关时**不创建**该容器，渲染路径与现状一致。
2. 渲染模型（纯数据）置于 **`src/insight/archive-catalog.ts`**，**不在 `src/ui/tree/` 新增文件**（避开 `insight-no-escalation.test.ts#treeSources()` 的精确文件名断言）；`tree-drawer.ts` 只做 DOM 挂载与事件绑定（`createElement`/`textContent`，无 `innerHTML`）。
3. 类名隔离：`.tree-archive*` 不复用 `.tree-row`/`.tree-control` → 既有选择器不被污染。
4. `TreeFilter` 与 `tree-view.ts` **零改动**；档案自有 `ArchiveFilter`。

## 被否决方案与理由
- **A. 新增第五维度「命令档案大全」**（否决）：破坏四层分组森林模型与快照结构/hash 确定性（ADR-V2-001/002），返工 V2-1/V2-2。
- **B. `src/ui/tree/archive-view.ts` 新文件**（否决）：会令既有 `treeSources()` 精确列表断言 FAIL，需修改 P0 已 `validated` 的测试文件；收益（目录美观）不抵「既有断言零修改」的纪律价值。
- **C. 独立第二覆盖层/新抽屉**（否决）：新增 `#panel-main` 结构，牵动 52 断言与布局守卫。

## 后果
档案零结构风险落地；代价 = 档案空间受抽屉宽度限制（`min(340px,100%)`），需紧凑排版 + 分组折叠。

---

### ADR-V2-017: 逐条有档口径 = 三层分列 + `accounted` 100%；禁止夸大

## 状态
ACCEPTED（编排器代作者决策，2026-09-13 授权）

## 背景
FR-V2-050 / AC-V24-001 写「34 工具 / 142 子命令逐条有档（覆盖率 100%）」；但 P0 实测**实时投影面 = 28 条目 / 94 子命令 = 122 命令节点**（T3，`insight-action-parity`），而 `waivers.json` 登记了 20 工具 / 88 子命令（`not-applicable` / `baseline-disabled` / `mapped` / `delegated`）。把两者混同就会**夸大**（把基线说成已渲染卡片）。

## 决策
1. 档案口径**三层分列**：L1 对账基线 34/142（单一真值 + provenance commit）；L2 豁免登记 20/88（按状态 + 理由，非「缺失」）；L3 实时投影面 28/94 = 122 卡（当次快照真实计数；P0 T3 fixture 口径）。
2. `accounted = carded ∪ waived` 必须覆盖基线**每一行**（100%，机器可验）；`carded` **只**等于 L3。
3. UI 头部只显示「实时面 N/M 卡」+「对账基线 34/142（来源 commit）」+ parity 结论；**禁止**出现「34/142 已全部渲染」类表述。
4. **动态不变量**（恒真）：`cards.length === meta.counts.commands + meta.counts.subcommands`；**fixture 钉死**：P0 同款 fixture = 122。
5. 反证：删基线一行 → FAIL；把 `accounted` 改为直接用 L1 → 断言必须 FAIL（防夸大自证）。

## 被否决方案与理由
- **A. 只覆盖实时面（28/94）**（否决）：与 FR-V2-050 的 34/142 口径脱节，无法证明「逐条有档」。
- **B. 运行时枚举基线 34/142 为卡片**（否决）：需把 `test/parity/baseline-catalog.json` 打进 bundle（测试件入包 + 增重 + waived 项本非可渲染命令）→ 夸大 + 违反体积纪律。

## 后果
口径诚实且机器可验；代价 = 用户需理解三层口径（用可读文案 + 折叠说明解决）。

---

### ADR-V2-018: `deny` 成因分层 = policy 三成因 + 自动授权层 `auto-hardDeny`（派生只读）

## 状态
ACCEPTED（编排器代作者决策，2026-09-13 授权）

## 背景
FR-V2-051 要求 `deny` 显式分列「未授权 origin（S1）/ 未知或非法 risk（S3 fail-closed）/ `evaluate` 设计硬底线」，并**另标注** `auto-authorize` 的 `hardDeny`。`DenyCause` 是 4 值枚举（含 `auto-hardDeny`），但 `deriveAction` **永不产出** `auto-hardDeny`（它只做 policy 层判定）。T3 已证明投影与真实判定链全量一致。

## 决策
1. **policy 层**：直接取 `CommandNode.denyCause`（S1/S3/evaluate），标签复用 `DENY_CAUSE_LABEL` 单一文案源。
2. **自动授权层**：由 `archive-catalog.ts#autoAuthHardLine(card)` **纯派生只读**（依据真实 `decideAutoAuthorization` 顺序）：`group === PLUGIN_SITE_GROUP ∧ (risk === 'evaluate' ∨ risk 缺失/非法)`。**不新增模型字段**、不改 `deriveAction`、不在 `DenyCause` 语义里混入 auto 语境。
3. 卡片**两行分列**（policy 层 / 自动授权层）；非站点工具在 auto 行标注「不适用」——如实分列，不合并。
4. **T3 教训**：门禁用**真实** `decideAutoAuthorization` 对**全量卡片** + 站点域矩阵逐条交叉断言 `autoAuthHardLine === hardDeny`；反证（翻转一张卡 → FAIL）。

## 被否决方案与理由
- **A. 给 `CommandNode` 新增 `autoHardLine` 字段**（否决）：模型改动 → 返工 V2-1 投影 + 快照结构/已验确定性（与 ADR-V2-012「零模型改动」冲突）。
- **B. 把 `auto-hardDeny` 作为 `DenyCause` 第四值由 `deriveAction` 产出**（否决）：`deriveAction` 无 origin/auto 语境，需引入判定旁路；且与 policy 层语义混淆，违反「不改判定链」。

## 后果
四成因分列可读且语义分层；代价 = 需全量一致性门禁（已配 + 反证），否则有漂移风险。

---

### ADR-V2-019: `delay` 消歧 = 单一措辞源；内容哈希钉死，禁第二套说法（W3 教训）

## 状态
ACCEPTED（编排器代作者决策，2026-09-13 授权）

## 背景
FR-V2-054 是**红线文案**：「`delay`（= `deny`，fail-closed，非可配置档位；与命令间 `delayMs` 无关）」须**同一处并标**。`tree-view.ts#TREE_NO_ESCALATION_NOTE` 已含完整句并在抽屉 `tree-notes` 恒渲染。P0 教训 W3：冻结类断言不得用 `git diff --quiet HEAD`（提交后恒 0 的假安全网）。

## 决策
1. 档案**不重复渲染**消歧句；档案模块**导入** `TREE_NO_ESCALATION_NOTE`（复制字面量被 grep 门禁禁止）。
2. 卡片 `delayMs` 列复用既有措辞「命令间隔 delayMs=N ms（与 delay 档无关）」。
3. 门禁：`sha256(TREE_NO_ESCALATION_NOTE)` **内容哈希 pin**；DOM 断言 `非可配置档位` 全文档出现次数 === 1。

## 被否决方案与理由
- **在档案里另写一套消歧句**（否决）：双措辞源必然漂移，且违反「同一处并标」。
- **沿用 `git diff --quiet HEAD` 冻结**（否决）：提交后恒绿（W3 已证伪）。

## 后果
零措辞漂移、机器可验；代价 = 改动消歧文案须显式改 pin 并注明日期/理由。

---

### ADR-V2-020: 档案 = 结构无控件只读面

## 状态
ACCEPTED（编排器代作者决策，2026-09-13 授权）

## 背景
FR-V2-052 + NFR-V24-001 + 父 FR-V2-060/063 红线：档案**只读展示**，`deny`/`delay` **不可放宽**、**无命令级覆盖**、**不新增写路径**。仅文案承诺不可复核。

## 决策（四层结构证据）
1. **类型层**：`ArchiveCard` 接口不含 `controls`/`actionId`/`actionTarget` → 编译期不可渲染写控件。
2. **模块图**：`archive-catalog.ts` 不导入 `tree-ops.ts`/`tree-receipt.ts`/写面；仅导入纯类型与 `sourceKindOf`（纯）与 `PLUGIN_SITE_GROUP`（纯配置常量，与 `command-catalog.ts` 同款）。
3. **动作面**：`TREE_ACTION_IDS` **恰 7 值** + 内容哈希 pin；V2-4 **不新增任何动作**。
4. **DOM 层**：`.tree-archive` 内 `.tree-control` / `button[data-action-id]` / `input[type=checkbox]` 计数 === 0。

## 被否决方案与理由
- **把 `deny` 渲染为 disabled 开关**（否决）：仍暗示「可开启」，误导（P0 ADR-V2-011 已否决同款）。
- **在档案内提供「筛选/排序」以外的任何交互控件**（否决）：筛选/分组是**只读**展示操作；任何带 `actionId` 的控件越界。
- **仅靠评审/文案**（否决）：红线不可机器验证。

## 后果
红线由类型/模块图/白名单/DOM 四层钉死；代价 = `tree-drawer` 需显式区分「展示操作」与「写动作」两类控件。

---

### ADR-V2-021: parity 同源 = 复用 `catalog-reconcile.ts` + `catalog-meta.ts` 常量注入

## 状态
ACCEPTED（编排器代作者决策，2026-09-13 授权）

## 背景
FR-V2-053 要求档案真值与 `policy.ts`/`auto-authorize.ts` 一致、与 `parity.test.ts` **同源**、新增/丢失即 FAIL。P0 ADR-V2-010 已建单一基线文件 + 共享 `catalog-reconcile.ts`，并预留 `snapshot.catalogMeta?`——但 P0 从未注入，该预留位为空。

## 决策
1. **复用** `loadBaseline/loadWaivers/reconcileCatalog/coveragePercent/countBaselineSubcommands` 与路径字面量；**不新建第二份真值**、不改 v1 `parity.test.ts`。
2. **新增** `src/insight/catalog-meta.ts#CATALOG_BASELINE_META`（纯常量 `CatalogMeta`，无 `node:fs`）；`service-worker.ts` **+1 行** additive 注入。运行时**不打包** baseline JSON。
3. **漂移门禁**：常量 `toolCount/subcommandCount/provenanceCommit` === `loadBaseline()` 真值且 commit 匹配 `/^[0-9a-f]{40}$/`；反证（改一位 → FAIL）。
4. `catalogMeta` **只描述基线**，不描述渲染卡数（防夸大，与 ADR-V2-017 一致）。

## 被否决方案与理由
- **B. 不注入，UI 降级**（否决）：P0 预留位空置；FR-V2-053 展示面缺 parity 锚点。
- **C. 运行时 import baseline JSON**（否决）：测试件入包 + 增重 + 违反体积纪律。
- **D. 复制 reconcile 逻辑到档案模块**（否决）：双份真值 → 漂移。

## 后果
单一真值 + 展示面有锚点；代价 = 需维护常量与基线的漂移门禁（已配 + 反证）。

---

### ADR-V2-022: 门禁挂载与体积重登记纪律

## 状态
ACCEPTED（编排器代作者决策，2026-09-13 授权）

## 背景
NFR-V24-001~005 + 父 NFR-V2-001/002/009 + P0 教训 W3/W4/D-V22-01/T3：门禁须能真 FAIL、冻结用内容哈希、体积基线变更须显式重登记、测量条件须可复现且写进 spec/AC、策略再实现须全量交叉断言。

## 决策
1. **断言只增不减**：新增 node 门禁落**新文件** `test/insight-archive.test.ts`；Chromium 断言**追加**到 `test/ui/insight.mjs`（`#I-19a…`），复用同一会话，**不新增**并发 Chromium 门禁（OOM 前科）。
2. **体积**：`content.js` 零增长（`CONTENT_MAX_BYTES` 无容差 + `src/content/**` 源码内容哈希 pin）；`sidepanel.js` **显式重登记**（前后值 + 日期 + 来源 + 理由 + `HISTORY` 历史保留 + `targetBudgetBytes:null`/`targetMet:null` 不变 + 容差 5% 不变）。
3. **虚绿防护**：反证自测逐条；`catch` 只吞 `ENOENT`；冻结用 `sha256` 内容 pin（禁 `git diff --quiet HEAD` 作唯一冻结）。
4. **测量条件写进 AC**：`#I-19h` 的布局测量条件与 P0 同段 JS（同一去镀铬定义），并在 plan/spec 登记（D-V22-01 教训）。

## 被否决方案与理由
- **新增独立 `test/ui/archive.mjs` 门禁**（否决）：第二次 Chromium 启动（串行成本 + OOM 风险）；追加到既有单会话更稳。
- **提高容差或删断言以让门禁变绿**（否决）：W4 明令禁止。
- **沿用 `git diff --quiet HEAD` 作为冻结**（否决）：提交后恒 0（W3）。

## 后果
门禁可证伪、体积可控、纪律可审计；代价 = 每次有意增重须显式重登记并保留历史。

---

### ADR-V2-023: V2-4 = 零模型改动（ADR-V2-012 兑现）；唯一 additive 运行时注入面

## 状态
ACCEPTED（编排器代作者决策，2026-09-13 授权；承 ADR-V2-012）

## 背景
ADR-V2-012 已为 V2-4 预留 `cardId`/`denyCause`/`sourceKind`/`delayMs`+`action` 分列/`suppressed`/`facets`/`catalogMeta`/`version`，目标是 V2-4「零模型改动」落地。

## 决策
1. **零模型改动**：不改 `src/insight/tree-model.ts`（`CommandNode`/`CatalogFacets`/`CatalogMeta`/`DenyCause`/`SourceKind`/`ConnectTreeSnapshot` 全部原样消费）；不改 `src/ui/tree/tree-view.ts`（含 `TreeFilter`/`DENY_CAUSE_LABEL`/`SOURCE_KIND_LABEL`/`TREE_*_NOTE` 全部原样复用）。
2. **唯一 additive 运行时改动面**：`service-worker.ts#buildInsightSnapshot` 注入 `catalogMeta: CATALOG_BASELINE_META`（**1 行**、只读、不改判定链/消息语义/授权路径；`catalogMeta` 不进快照 hash 输入 → 确定性不受影响）。与 P0 `host.ts#delayConfig()` additive 只读 accessor 同款。
3. 新增代码一律落在**新模块**（`src/insight/archive-catalog.ts` / `catalog-meta.ts`）+ **追加**到既有 `tree-drawer.ts`。

## 被否决方案与理由
- **改模型新增 `autoHardLine`/`archiveCategory` 字段**（否决）：返工 V2-1 投影 + 快照结构 + 已验确定性，且违反「零模型改动」目标。
- **完全不碰 `service-worker.ts`**（否决）：`catalogMeta` 预留位空置，FR-V2-053 展示面缺锚点（见 ADR-V2-021）。
- **把档案做成 `src/insight` 之外的独立 bundle**（否决）：新增构建面、违反「无新依赖/最小改动」。

## 后果
ADR-V2-012 目标达成（**零模型改动**）；返工面 = 0（不触碰 P0 已 `validated` 的投影/渲染/动作面）；代价 = `service-worker.ts` 1 行 additive 改动需门禁守护（已配）。

---

## 9. 交付门槛（本叶子）

**门禁串行纪律（NFR-V2-009，绝不并发 —— 本仓库 OOM 前科）**：
```
npm run build --workspace @lgdl/web-cli-plugin   # 先构建真实 dist（体积/DOM 门禁需要）
npm test           # node 单测（含新 insight-archive.test.ts / size-budget）
npm run test:ui        # v1 既有 167 断言回归（零删减）
npm run test:insight   # 新增 #I-19a…（同一 Chromium 会话；必须在 test:ui 之后串行）
npm run test:hardening # 回归
npm run test:binding   # 回归（既有断言零删改）
npm run test:e2e       # 回归（不改 fullchain）
```
逐条串行；任何一步 fail 即停，修复后**从头串行**重跑。

### 9.1 `test/insight-archive.test.ts`（新文件，node）断言要点

| # | 断言 | 反证自测 |
|:-:|------|----------|
| A1 | `cards.length === counts.commands + counts.subcommands`（动态不变量）；P0 同款 fixture = **122**；`cardId` 唯一且 === `CommandNode.cardId` | 删一张卡 → `cards.length` 断言 FAIL |
| A2 | **逐条有档**：基线每一行 ∈ (`carded` ∪ `waived-with-reason`)；`accounted.percent === 100`；`carded.tools === 28 ≠ baseline.tools === 34`（三层分列钉死） | 删基线一行 → FAIL；把 `accounted` 改为直接用 L1 → FAIL（防夸大） |
| A3 | `deny` 卡：`denyCause ∈ {s1-unauthorized, s3-unknown-risk, evaluate-floor}`；**全量** `autoAuthHardLine === real decideAutoAuthorization(...).hardDeny`；站点域矩阵一致 | 翻转一张卡 → FAIL |
| A4 | `ArchiveCard` 无控件字段（`Object.keys ∩ {controls,actionId,control,actionTarget} === ∅`）；模块 grep 无 `tree-ops`/`TreeActionId`/`riskDefaults\s*[:=]` | 注入一个 `actionId` → FAIL |
| A5 | `delay` 单源：导入 `TREE_NO_ESCALATION_NOTE`；无第二处 `非可配置档位` 字面量；`sha256(TREE_NO_ESCALATION_NOTE)` === pin | 复制一份字面量 → FAIL |
| A6 | **过滤只读**：过滤前后 `stableStringify(snapshot)` 全等 + 授权节点 id 不变 + 过滤真的收窄 | 谓词恒 `true` → FAIL |
| A7 | `CATALOG_BASELINE_META` === `loadBaseline()` 计数 + `/^[0-9a-f]{40}$/` provenance commit | 改常量一位 → FAIL |
| A8 | 禁改面内容哈希 pin：`TREE_ACTION_IDS` 恰 7 值；`src/content/**` 源码内容哈希；`src/ui/tree/{tree-view,tree-ops,tree-receipt}.ts` 内容哈希（V2-4 不得改动） | 改一个字节 → FAIL |
| A9 | 体积重登记结构：`HISTORY` 含 `1_110_744` 且单调不减；`META` 含日期/来源/理由且 `targetBudgetBytes===null`/`targetMet===null`；`ceiling === floor(baseline×1.05)` | `ceiling+1` → FAIL（沿用 P0） |

### 9.2 `test/ui/insight.mjs` 追加断言（`#I-19a…`，既有零删改）

| 编号 | 断言 |
|------|------|
| `#I-19a` | 档案开关存在、默认关（`aria-pressed=false`）、`.tree-archive` **不存在** → 默认 DOM 与现状一致 |
| `#I-19b` | 开启后 `.tree-archive-card` 数 === 头部「实时面 N/M 卡」的 N+M，且 `> 0` |
| `#I-19c` | 每张卡有 `action` / `sourceKind` / `delayMs` 字段；`deny` 卡含成因文案 |
| `#I-19d` | `site_*` 卡（若存在）显示 origin；无站点卡时如实标注计数（不做空断言） |
| `#I-19e` | `delay` 单源：`.tree-note-no-escalation` 恰 1 处且含完整消歧句；全文档 `非可配置档位` 出现 **1** 次 |
| `#I-19f` | 档案检索/过滤：输入后卡片收窄 + 清空恢复；无异常 |
| `#I-19g` | 安全红线：`.tree-archive .tree-control` === 0、`button[data-action-id]` === 0、`input[type=checkbox]` === 0 |
| `#I-19h` | 档案开启后复用既有 `checkLayout`：`#log ≥589px` / 占比 ≥65.0% / composer ∈[0,+8] / FAB∩composer=0 / 零水平溢出（**测量条件与 P0 同段 JS**） |

### 9.3 人工面登记（headless 不可覆盖，如实登记不冒充 PASS）

| # | 人工面 | 原因 |
|:-:|--------|------|
| V2-H-7 | 档案长文案 / 320px 窄栏下 122 卡的拥挤度与可读性 | 视觉与感知判断 |
| V2-H-8 | 分组维度切换 / 折叠展开的观感与动效 | 视觉与感知判断 |
| V2-H-9 | 真实站点绑定后 `site_*` 卡片增长时的观感 | 需真实站点与授权时点 |

---

## 10. 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建。V2-4（P1）叶子技术方案：前置检查（含「无外部 API」核实）+ 架构分析（数据面/渲染面/门禁面现状 + 依赖图 + 边界）+ 9 个必答设计问题逐条决策 + 4 组方案对比 + 推荐方案 + 文件影响 + 风险 + **ADR-V2-016~023**（8 个）+ 交付门槛（node 门禁 A1~A9 + Chromium `#I-19a…` + 人工面 V2-H-7~9）。**只做技术设计**：不写代码、不排任务、不改 v1、不碰 `main`/`base`/`options`。 | 2026-09-13 | SDDU Plan Agent |
