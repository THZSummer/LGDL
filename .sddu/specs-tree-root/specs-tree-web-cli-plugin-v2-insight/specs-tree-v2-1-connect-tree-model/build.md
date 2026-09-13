# 构建报告：specs-tree-v2-1-connect-tree-model（V2-1 连接树数据模型与状态投影）

> **文档定位**: SDDU 实施构建报告（**叶子子 Feature**，P0）——记录 V2-1 的实施产物、逐任务实现要点、决策记录与门禁结果
> **父 Feature**: `specs-tree-web-cli-plugin-v2-insight`（web-cli-plugin v2「any insight」）
> **构建人**: SDDU Build Agent · **构建时间**: 2026-09-13 · **版本**: v1.0
> **授权**: **编排器代作者决策（2026-09-13 授权）** —— 作者已授权编排器自行决策后续 SDDU 流程，本轮不再向作者提问；开放点已自行裁决并登记（见 §6）。
> **分支**: `feature/web-cli-plugin`（`main` = `2ddc922…` 未动）
> **输入**: 本叶子 `tasks.md` / `tasks.json`（9 任务 / 5 波）+ `plan.md`（ADR-V2-001/002/003/010/011/012/014/015）+ 父 `spec.md`（FR-V2-010~017 权威）+ 父 `plan.md`（ADR-V2-001~015）

---

## 1. 构建概要

| 项 | 值 |
|----|----|
| 范围 | Wave 1~5 / **TASK-001~009** 全部实现（5 实施 + 4 门禁） |
| 新增源码 | **7** 个：`src/insight/{tree-model,capability-catalog,command-catalog,catalog-reconcile,project-tree,build-snapshot}.ts` + `src/background/insight-protocol.ts`（来源约束拆分，见 D-V21-01） |
| 修改源码 | **4** 个：`src/background/{state-message,messaging,service-worker,host}.ts`（全部 additive） |
| 新增测试 | **4** 个门禁文件（`test/insight-projection|determinism|catalog|no-escalation.test.ts`），**36** 个新测试 |
| 门禁 | `tsc --noEmit` **0 error**；插件 `npm test` **561/561**（v1 既有 **525 零删减** + 新增 36）；全仓 `npm test` **561/561** |
| 红线 | 零新权限（`manifest.json` 零 diff）；零注入（`content.js` **1,073,453 B 零增长**）；不碰 base（零 diff）；无新依赖；判定链零改（`policy.ts`/`auto-authorize.ts` 零 diff） |
| 未跑门禁 | **Chromium 类**（`test:ui` / `test:insight` / `test:binding` / `test:hardening` / `test:e2e`）本轮**未跑**，原因见 §4.3 |

---

## 2. 文件变更

### 2.1 新增（`packages/web-cli-plugin/src/insight/**`）

| 文件 | 说明 |
|------|------|
| `src/insight/tree-model.ts` | 类型层：`Dimension`/`Badge`/`CrossLink`/`SiteNode`/`CapabilityNode`/`CommandNode`/`LlmNode`/`SessionNode`/`TreeGroup`/`TreeRoot`/`ConnectTreeSnapshot`/`CatalogFacets`/`SnapshotMeta`/`CatalogMeta`/`InsightSummary`；**命名空间稳定键** `STABLE_KEY`；`stableStringify` + FNV-1a 纯哈希；`sortCrossLinks` |
| `src/insight/capability-catalog.ts` | 能力目录投影：静态权限 5（`revocable:false` + `revokeHint` + 无 `revoke` 控件）；可选能力 4（`granted` 取注入实测态、`revocable:true`）；6 隐私开关 + `tabs` 开关（`source:'toggle'`、可逆 `toggle` 控件） |
| `src/insight/command-catalog.ts` | 命令逐条有档：`action`/`denyCause`/`sourceKind`/`delayMs`（与 `action` 分列）/`presentInSurface`/`suppressed`+`suppressionReason`/`cardId`；**`deny ⇒ controls:[]`**；`suppressedCapabilitySurface()` 合成被抑制能力工具 |
| `src/insight/catalog-reconcile.ts` | **单基线文件** + **双向对账** + **同源锚定**常量：`loadBaseline`/`loadWaivers`/`reconcileCatalog`/`countBaselineSubcommands`/`coveragePercent`；**不重构 v1 `test/parity.test.ts`** |
| `src/insight/project-tree.ts` | 纯投影 + 确定性：四维度顺序投影 → `crossLinks` 聚合 → `facets` → `meta.hash`；固定排序；空态/降级 ≥3 类；`summarizeInsight` |
| `src/insight/build-snapshot.ts` | 薄 builder：注入已读数据 → `InsightSource` → 快照；**零 `chrome.*`**（node 可测） |
| `src/background/insight-protocol.ts` | **偏离**（D-V21-01）：`insight-*` kind 的独立校验（不入共享 `KIND_SET`，守 `content.js` 零增长红线） |

### 2.2 修改（`packages/web-cli-plugin/src/background/**`）—— 全部 additive

| 文件 | 变更（零删改/最小改） |
|------|----------------------|
| `state-message.ts` | `StateMessagePayload` + `buildStateMessage` 输入**追加可选** `insight?: InsightSummary`（既有字段语义零变更） |
| `messaging.ts` | `PluginMessageKind` 并集**追加** `insight-tree` / `insight-changed`（**类型层**，运行时 `KIND_SET` 零改动） |
| `service-worker.ts` | **追加** `case 'insight-tree'`（full snapshot，pull）；`buildInsightSnapshot()`（唯一触 `chrome.*` 的调用方）；`state` 回包 additive 带 `insight` 小摘要；`pushInsightChanged()` 在授权撤销 / tabs 开关 / 能力 onAdded·onRemoved 后推送。**既有 case 零删改（`git diff` 仅新增行）** |
| `host.ts` | **仅追加只读** `delayConfig(): { delayMs }`（ADR-V2-014）；`delayMs: 0` 提为 `commandDelayMs` 常量供 accessor 与 `createCommandRouter` 同源 |

### 2.3 新增测试（`packages/web-cli-plugin/test/**`）

| 文件 | 承载门禁 |
|------|----------|
| `test/insight-projection.test.ts` | `insight-projection`（TASK-006） |
| `test/insight-determinism.test.ts` | `insight-determinism`（TASK-007） |
| `test/insight-catalog.test.ts` | `insight-catalog`（TASK-008） |
| `test/insight-no-escalation.test.ts` | `insight-no-escalation` 基础段（TASK-009；V2-3 追加） |

**明确未改**：`packages/web-cli-base/**`、`src/security/policy.ts`、`src/security/auto-authorize.ts`、`manifest.json`、`src/ui/**`、`test/parity.test.ts`、`test/parity/**`、v1 SDDU 目录 `specs-tree-web-cli-plugin/**`、`.opencode/opencode.json`、任何依赖段。

---

## 3. 任务完成清单（TASK-001~009）

| 任务 | 状态 | 落点 | 实现要点 / 偏差 |
|------|:--:|------|------------------|
| **TASK-001** 类型层 + 能力目录 | ✅ | `tree-model.ts`、`capability-catalog.ts` | 森林/四层分组 + 全命名空间稳定键；`INSIGHT_MODEL_NOTE` 含「四维度分组视图（森林）」与「非严格单树」；静态权限 5 项 `revocable:false` + `revokeHint`（含「不可逐项撤销（需停用/卸载扩展）」）+ `controls:[]`；4 可选能力 `granted` 取注入实测（不由开关决定）+ `revocable:true`；6 开关 + `tabs` 开关 `source:'toggle'` + 可逆 `toggle` 控件。`DenyCause`/`SourceKind`(8)/`cardId` 显式存在（V2-4 预留）。无偏差 |
| **TASK-002** 命令档案 | ✅ | `command-catalog.ts` | `action` = S1/S3/`PLUGIN_RISK_DEFAULTS`（直接导入 policy 单真值）；`denyCause` 四值分列；`sourceKind` 8 值；`delayMs` 与 `action` 分列；`suppressed`+可读 `suppressionReason`；`cardId`；**`deny ⇒ controls:[]`**（结构保证）；非 deny 给 `none` 控件（使该规则非空洞）。**偏差 D-V21-02**（missing risk 对非 site 也 fail-closed 展示为 deny/s3，依 plan §3.3 / FR-V2-064） |
| **TASK-003** 对账模块 | ✅ | `catalog-reconcile.ts` | 只读单一基线 `test/parity/baseline-catalog.json` + `waivers.json`；`reconcileCatalog` 双向（`missing`/`missingSubs`/`unregistered`/`extraStale`）；导出 `PARITY_*_RELATIVE_PATH` 同源锚点常量；**v1 parity 零改**。无偏差 |
| **TASK-004** 纯投影 + 确定性 | ✅ | `project-tree.ts` | `projectInsightTree` 顺序投影四维度 → `linkCrossRefs`（含站点→命令反向引用聚合，不复制节点）→ `facets` → `meta`（`hash`/`counts`/`sources`/`degradations`/`modelNote`）；固定排序；`stableStringify`+FNV-1a；**`builtAt` 不进 hash**；空态降级 ≥3 类（`no-sites`/`no-authorized-sites`/`no-commands`/`llm-unconfigured`）；读失败经注入 `degradations` 透出（**不当作空/已撤销**）。无偏差 |
| **TASK-005** 薄 builder + additive 接线 | ✅ | `build-snapshot.ts` + 4 个 background 文件 | builder 无 `chrome.*`（node 可测）；`insight-tree`（pull 全量）/`insight-changed`（push 零敏感数据）/`state.insight?`（counts/badges 小摘要）；`host.delayConfig()` 只读 accessor。**偏差 D-V21-01（insight-protocol.ts）、D-V21-03（state 每次构建摘要）、D-V21-04（host 常量提取）** |
| **TASK-006** `insight-projection` | ✅ | `test/insight-projection.test.ts` | 20 断言：四维度字段真值 / 稳定键 / 同源锚定（`normalizeOrigin`、manifest、`CAPABILITY_SETTING_DEFAULTS`）/ `state` additive（既有 6 键无删改、`insight` 可选）/ 零副作用（存储 diff 空 + 审计零新增 + 输入未 mutate）/ 零明文 / ≥3 类空态 / `deny ⇒ controls:[]` 非空洞 |
| **TASK-007** `insight-determinism` | ✅ | `test/insight-determinism.test.ts` | 5 断言：两次投影 deep-equal + hash 全等；`builtAt` 变 → hash 不变；站点/会话集合打乱 → hash 不变（固定排序）；规范 JSON 稳定；命令序 = 注入 registry 序（语义序，见 D-V21-05） |
| **TASK-008** `insight-catalog` | ✅ | `test/insight-catalog.test.ts` | 6 断言：树命令集合 ⇄ `deriveTools()`+registry 双向等价（无重）；子命令逐工具等价；基线 **34/142** + 全 SHA；双向对账清洁（覆盖率 **100%**）；**反证**（丢工具/丢子命令/未登记新工具 → FAIL）；**同源锚定**（V2 与 v1 parity 引用同一基线字面量）；过滤只读 |
| **TASK-009** `insight-no-escalation` 基础段 | ✅ | `test/insight-no-escalation.test.ts` | 5 断言：`src/insight/**` 无 `chrome.*`/`apiKey`/写 store 工厂/`../background` 导入；无 bare `catch {}`；`PLUGIN_RISK_DEFAULTS` pinned；manifest 静态+可选权限 pinned；禁改面 `git diff --quiet` 为零（policy/auto-authorize/manifest/parity/base） |

---

## 4. 门禁结果（严格串行；原文口径）

### 4.1 `npm run typecheck`（`tsc --noEmit`）

```
> @lgdl/web-cli-plugin@0.8.0 typecheck
> tsc --noEmit
（0 error）
```

### 4.2 插件 `npm test`（含新增 4 门禁）

```
ℹ tests 561
ℹ pass 561
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
```
- v1 既有断言 **525 → 零删减**（新增断言全部落在**新文件**）。
- 新增 36：`insight-projection` 20 / `insight-determinism` 5 / `insight-catalog` 6 / `insight-no-escalation` 5。

### 4.3 全仓 `npm test`（最后单独跑）

```
ℹ tests 561
ℹ pass 561
ℹ fail 0
```
- **如实记录**：全仓**首次**执行出现 1 例**时序敏感**失败 —— `NFR-007: sequential authorized read dispatches stay within the per-call budget`（`50 dispatches took 288ms (> 250ms budget)`）；**同一命令单独复跑一次即 561/561 全绿**（插件单独 `npm test` 亦 561/561）。判定为**环境负载导致的既有阈值抖动**，非 V2-1 引入（V2-1 **未触碰 dispatch/判定路径**，仅背景侧新增投影与消息 face）。**未循环重试**（仅复跑一次以判定真伪）。

### 4.4 未跑的 Chromium 类门禁（**未冒充 PASS**）

| 门禁 | 本轮 | 原因 |
|------|:--:|------|
| `test:ui`（`journey.mjs`） | **未跑** | 本轮**零 UI 改动**（`src/ui/**` 与 `index.html` 零 diff），v1 旅程无法被本层影响 |
| `test:insight`（`test/ui/insight.mjs`） | **未跑** | 文件属 V2-2（尚未创建） |
| `test:binding` | **未跑** | 撤销链属 V2-3；本轮无 UI 触发点 |
| `test:hardening` | **未跑** | 同上；留待首个 UI 改动（V2-2）/收口（V2-3）串行执行 |
| `test:e2e` | **未跑** | 不涉及 fullchain 改动 |

> 结论：V2-1 为**纯数据层**（`src/insight/**` + additive 消息 + 4 个 node 门禁），Chromium 类门禁**留到 V2-2（首个 UI 改动）与 V2-3（收口）串行执行**。**本轮不声明这些门禁通过**。

---

## 5. 关键设计落地证据

| 要求 | 证据 |
|------|------|
| **稳定键命名** | `STABLE_KEY` 产出 `site:` / `cap:static:` / `cap:opt:` / `toggle:` / `cmd:` / `cmd:<name>#<sub>` / `llm:` / `session:` / `link:<from>→<to>` / `group:<dim>`；单测逐前缀断言 + 同输入同键 |
| **确定性（两次投影 hash 全等）** | `insight-determinism`：两次投影 `deepEqual` 且 `meta.hash` 相等；`stableStringify` + FNV-1a；**`builtAt` 不进 hash**（不同 `builtAt` → hash 相同）；站点/会话集合打乱 → hash 不变 |
| **V2-4 预留位** | `CommandNode.cardId`（`cmd:<name>#<sub>`）、`denyCause`（4 值）、`sourceKind`（8 值）、`delayMs` 与 `action` 分列、`suppressed`/`suppressionReason`；`snapshot.facets`、`catalogMeta?`、`version:1` —— 全部在类型与投影中落地 |
| **`deny ⇒ controls:[]`** | `controlsFor(action)`：`deny → []`；非 deny → `[{kind:'none',...}]`（使规则**非空洞**）。`insight-projection` 遍历丰富命令面断言每条 deny 的 `controls.length===0` 且至少命中一条 deny |
| **静态权限 `revocable:false`** | `capability-catalog` 对 5 项静态权限恒 `revocable:false` + `revokeHint` + `controls:[]`；快照内同样断言（渲染模型层强制，ADR-V2-011） |
| **零副作用** | 投影前后 `chrome.storage` diff 空 + 审计 `events.length` 不变 + 输入对象未被 mutate（`insight-projection`） |
| **零明文** | 投影序列化 grep 零命中 `apiKey`/`sk-`/`token`/剪贴板/通知/URL query；只消费 `LlmStatusSummary` 与 origin（无 path/query） |
| **空态/降级 ≥3 类** | `no-sites` / `no-authorized-sites` / `no-commands` / `llm-unconfigured`，均可读文案；注入读失败以 `degradation` 透出，**不当作空/已撤销** |

---

## 6. 实现决策（D-V21-xx）与偏离记录

> 编排器代作者决策（2026-09-13 授权）。凡偏离 `plan.md` 者均已标注原因。

| # | 决策 / 偏离 | 原因 | 影响 |
|---|------------|------|------|
| **D-V21-01** | **偏离**：新增 `src/background/insight-protocol.ts` 承载 `insight-*` 的**运行时校验**；共享 `KIND_SET` **不改**（仅 `PluginMessageKind` **类型并集**追加两个 kind） | `content-script.ts` 导入 `isPluginMessage` → `KIND_SET` 被打进 `content.js`；直接把两个 kind 加入 `KIND_SET` 会使 `content.js` **+43 B**（1,073,453 → 1,073,496），**突破 NFR-V2-002 零增长红线** | `content.js` 恢复 **1,073,453 B（零增长）**；`insight-tree` 由背景用 `isPluginMessage \|\| isInsightMessage` 接受；类型并集仍按时序追加。**满足 FR-V2-002/NFR-V2-002，且不牺牲 additive 语义** |
| **D-V21-02** | **顺应 plan**：非 site 命令 risk **缺失/非法** → 展示 `deny` + `s3-unknown-risk`（fail-closed） | plan §3.3 + T002 验收明确「非 site 缺失 → deny/s3」；FR-V2-064 要求未知/非法 risk 一律展示 deny | 事实披露：base 内建 `sleep` / `web-cli-help`（无 risk 声明）在**展示层**显示为 `deny/s3`（保守 fail-closed 展示）。**不改变任何判定链**（真实 gate 对非 site 缺失 risk 走 `riskDefaults['read']`）；V2-3/V2-4 **不提供命令级写入**，故无操作后果。留待 review/validate 复核 |
| **D-V21-03** | `state` 回包 additive 携带 `insight` 小摘要（每次 `state` 构建一次投影） | ADR-V2-004 要求 `state.insight?` 供 FAB 徽标；保证通道真实可用 | 每次 `state` 增加 4 次 `permissions.contains` + 若干已读存储 + 纯投影（~200 节点，<1ms）。如后续证实热路径成本，可改为缓存/惰性（V2-2 可优化） |
| **D-V21-04** | `host.ts` 将 `delayMs: 0` 提为 `commandDelayMs` 常量（1 处既有行改为常量引用）+ 追加只读 accessor | ADR-V2-014 要求 accessor 返回**传给 `createCommandRouter` 的同一值**（不硬编码） | 行为零变更（仍为 `0`）；`policy.ts`/`auto-authorize.ts` 零 diff；投影 `delayMs` 可被注入非 0 值透出（单测注入 250 验证） |
| **D-V21-05** | 确定性门禁对**集合**输入（sites/sessions）断言顺序不敏感；对 `toolSurface` **不**断言顺序不敏感 | plan §3.2 固定排序：命令 = `toolSurface()` 序 + 子命令 enum 序（registry 序是**语义序**，非可排序集合） | 测试如实区分「集合」与「有序面」，避免把 registry 序错误地当可打乱集合 |

**继承的既有纪律（非新决策）**：v1 `perf-budget` 的 `readArtifactSize` 只吞 `ENOENT`（未改动）；V2-1 未新增任何 `catch` 吞错路径。

---

## 7. 四项零改动核验证据（`git diff --quiet`，退出码 0 = 零改动）

```
git diff --quiet -- packages/web-cli-base/                                                   → 0  OK
git diff --quiet -- packages/web-cli-plugin/src/security/policy.ts .../auto-authorize.ts     → 0  OK
git diff --quiet -- packages/web-cli-plugin/manifest.json                                    → 0  OK
git diff --quiet -- .sddu/specs-tree-root/specs-tree-web-cli-plugin/  （v1 目录）             → 0  OK
```
`service-worker.ts` 删除行核验：`git diff --unified=0 … | grep -E '^-'` → **无删除行（仅新增）**。
`.opencode/opencode.json`：**未改、未提交**。

---

## 8. 体积前后对比（`content.js` 零增长红线）

| 产物 | 构建前（v1 dist 2026-09-13） | 构建后（本轮） | 变化 |
|------|------:|------:|:--:|
| `dist/content.js` | 1,073,453 B | **1,073,453 B** | **0（零增长）** ✅ |
| `dist/sidepanel.js` | 1,068,165 B | **1,068,165 B** | **0（零增长）** ✅ |
| `dist/options.js` | 978,471 B | 978,471 B | 0 |
| `dist/background.js` | 1,372,225 B | 1,402,337 B | +30,112 B（背景侧新增投影/对账/消息 face；纳入 NFR-V2-001 baseline 守卫，归 V2-2 size-budget 门禁） |

> 说明：`content.js` 与 `sidepanel.js` 本轮**字节数零增长**（V2-1 为纯数据层，未接线 UI）。`dist/` 为构建产物，未纳入提交。

---

## 9. spec 口径最小订正（`FR-V2-023` + §2.5）

**背景**：父 `spec.md` 的 `AC-V2-002` ⑤ 已（v1.1）订正为「`#log` 稳态 `clientHeight` ≥589px（主断言）且占比 ≥65.0%（次断言）」，但 **`FR-V2-023` 验收列**与 **§2.5「侧栏布局基线（量化）」** 仍残留「占比 ≥65.5%」/「589px = 65.5%」——与 `AC-V2-002` 及 **ADR-V2-006** 不一致（589/900 = **65.44% < 65.5%**，逐字断言在 v1 基线必然失败）。

**订正（仅这两处数字口径，其余条文不变）**：
1. `FR-V2-023` 验收列：`稳态高度占比 ≥65.5%` → `稳态 clientHeight ≥589px（主断言）且占比 ≥65.0%（次断言）`；
2. §2.5「侧栏布局基线」：`589px = 65.5%` → `589px（实测占比 65.44%；主断言 ≥589px / 次断言 ≥65.0%，来源 AC-V2-002 / ADR-V2-006）`。

两处均注明**订正原因与来源（ADR-V2-006）**；并在头部元数据与修订记录登记 **v1.2**。**未改 v1 任何文件；未重写其他 FR/NFR/EC/AC 条文**。

---

## 10. 未完成 / 降级 / 风险项（如实）

| # | 项 | 性质 | 处置 |
|---|----|------|------|
| 1 | **Chromium 类门禁本轮未跑**（`test:ui`/`test:insight`/`test:binding`/`test:hardening`/`test:e2e`） | 计划内延期 | 零 UI 改动；留 V2-2（首个 UI 改动）与 V2-3（收口）**严格串行**补跑；**本轮不声明通过** |
| 2 | 全仓 `npm test` 首跑 1 例时序敏感 `NFR-007` 失败（288ms > 250ms），复跑全绿 | 既有阈值抖动（非 V2-1 引入） | 如实登记；如需彻底稳定可另行评估（本轮不改 v1 门禁） |
| 3 | 非 site 缺失 risk 展示为 `deny/s3`（`sleep`/`web-cli-help` 等保守展示） | D-V21-02 展示口径 | 依 plan/FR-V2-064 fail-closed；**不改判定链**；留 review/validate 复核是否需在 V2-2 区分「缺失」与「非法」文案 |
| 4 | `background.js` +30,112 B | 预期增量 | sidepanel 体积守卫归 V2-2 `size-budget`；`content.js` 硬上限已守住 |
| 5 | `state` 每次构建摘要的潜在热路径成本 | 待观察 | D-V21-03；V2-2 可改为缓存/按需 |

---

---

## 11. R2 修复轮（2026-09-13，编排器代作者决策：消化 review `39cd0a1` 的 6 建议 + 3 提示）

> **输入**：父 `review-report.md`（`39cd0a1`；C1~C22 + W1~W6 + T1~T3）。**纪律**：只加固不放宽；断言只增不减；门禁严格串行一次一个；不碰 `main`/`packages/web-cli-base/**`/v1 SDDU；无新依赖。
> **本轮门禁原文（串行）**：`typecheck` **0 error**；插件 `npm test` **616/616 · 0 fail**（599 → **+17**）；`test:insight` **52 断言 PASS**；`test:ui` **167 断言**（v1 零删减）；`test:hardening` **24**；`test:binding` **180 断言**；`test:e2e` **PASS**；全仓 `npm test`：base **483/483** + plugin **616/616**，**0 fail**。

以下为**修复轮全量条目逐条 before → after**（本表在三叶子 `build.md` 一致登记；本叶子（V2-1：投影 / 协议 / 冻结门禁）触及 **W2 / W3 / T2 / T3**）：

| 项 | before | after | 证据 |
|----|--------|-------|------|
| **W1** | 子 V2-2 `spec.md`/`state.json` + `ROADMAP.md` 仍写「≥65.5%」 | 最小订正为父口径「≥589px 主 + ≥65.0% 次 + 去镀铬测量条件 + ADR-V2-006」，保留历史 + 以现状为准 | V2-2 `spec.md`/`state.json`/`ROADMAP.md`（见 diff） |
| **W2** | `src/background/insight-protocol.ts` **无单测** | 新建 `test/insight-protocol.test.ts`（**6 测试 / 18 条 assert（循环覆盖 21 条反例 + 26 条 corpus）**）：合法通过 / 未知-畸形 kind 拒绝 / 缺字段-类型错-非对象拒绝 / 与主 `KIND_SET` 等价 / SW 入口并集无未校验放行 | `node --test dist-test/test/insight-protocol.test.js` → **6/6 pass** |
| **W3** | `git diff --quiet HEAD` **提交后恒 0 = 假安全网** | **内容哈希钉死**：`policy.ts` / `auto-authorize.ts` SHA-256 + 判定表快照（720 行）+ 反证自测；原 `git diff` 断言全保留 | 反证实跑原文见下 |
| **W4** | `SIDEPANEL_BASELINE_BYTES=1,085,389`（实际 1,110,744） | 显式重登记 **1,110,744**；ceiling **1,166,281**；历史保留；`CONTENT_MAX_BYTES` 不变 | `stat -c %s dist/sidepanel.js`=1110744；`test/size-budget.test.ts` +2 测试 |
| **W5** | V2-2 `build.md` §5.2 「前」1,065,389（+20,000） | 订正 1,068,165（+17,224），历史行保留 + 以现状为准 | V2-2 `build.md` §5.2 |
| **W6** | 仅 raw `#log ≥405px`（余量 13px） | 钉死 v1 raw 基线 418px/46.4% + `#I-06c ≥410px` / `#I-06d ≥45.4%`（容差 8px / 1.0pt）；不降低 405px | `test:insight` 52 断言 PASS |
| **T1** | 树侧能力撤销成功路径未自动化 | `binding.mjs` 追加 `#21o*` 最佳努力端到端；**实跑 headless grant=PENDING_TIMEOUT → 如实 observe（不伪造 PASS）**；成功分支就位；既有断言零删改 | `test:binding` 观测原文 |
| **T2** | `pushInsightChanged` 空 catch 静默吞 | 改为 `console.debug` 诊断（零敏感明文 / 不伪造状态）+ 新增门禁断言 | `service-worker.ts`；no-escalation T2 测试 |
| **T3** | `deriveAction` 再实现无一致性门禁 | 新建 `test/insight-action-parity.test.ts`（**4 测试**）：真实 `createPluginPolicyConfig` + 真实 `PermissionGate`，对**全部 28 工具 / 94 子命令（122 命令节点）** + 站点域矩阵逐条断言 == 真值链；**反证自测**；已知保守分歧（3 个 base 内建 risk 缺失）显式钉死 | `node --test dist-test/test/insight-action-parity.test.js` → **4/4 pass** |

**W3 pin 值（登记 2026-09-13 / 来源 commit `39cd0a1b91c5d41eae2d4079835a12b635e1ae1f`）**：
- `src/security/policy.ts` = `bfcb2edeceae19a27384aef6608e9f2ae9c3a0f6c1e5d3618f277164bb3c89a8`
- `src/security/auto-authorize.ts` = `1096d065dac63d56e36285bf499eee041acdc3e323d4c7215df3981af7d0ef4b`
- 判定表快照（`PLUGIN_RISK_DEFAULTS` + `AUTO_AUTH_DEFAULTS` + 720 行 `decideAutoAuthorization`）= `d1667d24cbb8cfc422ce92e61af3701ebd70bf85a30224f3fc7c7ccf22a88b74`

**W3 反证自测实跑原文**（`node` 复算，证明门禁非虚绿）：
```
original  = bfcb2edeceae19a27384aef6608e9f2ae9c3a0f6c1e5d3618f277164bb3c89a8 MATCH pin ✔
tampered+ " " = 7c3cf5d796c6f8bee980b3a3d98ee755d70aefc47096fb3fbff8351389f5fc2a ≠ pin → 断言 FAIL ✔
assert.throws 触发原文: 内容哈希漂移
```

**T3 覆盖计数**：`projectCommands` 产出 **28 工具 / 94 子命令 = 122 命令节点**，逐条与真实判定链比对；另加站点域矩阵（`read`/`write`/`undefined` × 授权 true/false × trust trusted/untrusted = 18 组合）。唯一已知**保守方向**分歧（投影 `deny` vs 运行时 `allow`，仅 `web-fetch` / `sleep` / `web-cli-help` 三个 base 内建、仅 risk 缺失）显式钉死；**其它任何分歧 FAIL**（含反证自测）。

**四项零改动复核（本轮）**：`packages/web-cli-base/**` / `src/security/policy.ts` / `src/security/auto-authorize.ts` / `manifest.json` → `git diff --quiet` 全部 **exit 0**；`specs-tree-web-cli-plugin/**`（v1 SDDU）零 diff。

---

## 12. 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建。V2-1（Wave 1~5 / TASK-001~009）实施构建报告：7 新源码 + 4 修改源码（additive）+ 4 新门禁测试（36 测试）；门禁 `typecheck` 0 error / 插件与全仓 `npm test` 561（v1 525 零删减）；四项零改动核验通过；`content.js`/`sidepanel.js` 零增长；父 spec 口径最小订正（FR-V2-023 + §2.5）；决策 D-V21-01~05；Chromium 门禁本轮未跑（如实登记）。 | 2026-09-13 | SDDU Build Agent |
| v1.1 | R2 修复轮：W2（insight-protocol 补测 6 测试）/ W3（判定链改内容哈希钉死 + 判定表快照 + 反证）/ T2（去静默吞异常 + 门禁）/ T3（deriveAction 全量一致性交叉断言 28 工具·94 子命令 + 站点域矩阵 + 反证）；门禁全量串行复跑：typecheck 0 / 插件 npm test 616 / test:insight 52 / test:ui 167 / test:hardening 24 / test:binding 180 / test:e2e PASS / 全仓 base 483 + plugin 616 = 0 fail。 | 2026-09-13 | SDDU Build Agent |

---

## 13. R2 实施构建（第 12 轮 · R2 build 第 1 轮）

> 完整聚合见父 `build.md` §9。本轮 **R2-V21-01~05 全部完成**（Wave 1 + Wave 5）。

- **产出**：`src/insight/ownership-tree.ts`（新，纯归属树：真父子层级 + 主归属链 + 交叉引用徽标 + `path`，不复制节点）；`tree-model.ts`（additive `defaultAction`/`overrideAction?`/`effectiveAction`/`overridable`/`clampReason?` + `ControlKind+'command-policy'` + `TreeActionId+2` + `CoverageSplit` + `ownershipTree`/`coverage`）；`command-catalog.ts`（默认/生效分列 + 分层控件 + **删除偏差文案**）；`project-tree.ts`（overrides/coverage/派生归属树，`meta.hash` 输入不变）；`build-snapshot.ts`（透传）。
- **门禁**：`test/insight-tree-hierarchy.test.ts`（新，11 tests）——作者两例逐层枚举 / nodeId 唯一 / 多归属不复制 / 扁平面与 hash 输入不变 / coverage 分列 / 反证；`removed=0`。
- **取代**：本叶无 S 编号；连带改动 `tree-view.test.ts` S7（联合扩展强依赖）与 `insight-archive.test.ts` S9/S10 + `TREE_MODULE_SHA256`（被修改文件冻结 pin）由父 §9.4/§9.6 登记。
- **未完成**：V2-2 的树 DOM 渲染（R2-V22-*）未做 → `ownershipTree` 模型已就绪，渲染层仍扁平 `rows`（模型/UI 分轮，如实登记）。

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.3 | 复验修正（D-R2B-09）：`ownership-tree` 交叉引用徽标单条化（1..N 累计 → 单条）；全 8 项门禁复跑全绿（日志 16~23）。 | 2026-09-13 | SDDU Build Agent |
| v1.2 | R2 实施构建第 1 轮（V2-1 模型层真层级树）：`ownership-tree.ts` + 四文件 additive/分列改造 + `insight-tree-hierarchy` 门禁（11 tests）；门禁串行全绿（typecheck 0 / 插件 686·0 fail / insight 70 / ui 167 / hardening 24 / binding 180 / e2e PASS / 全仓 EXIT=0）；`content.js` 零增长、`policy`/`auto-authorize` sha256 不变。 | 2026-09-13 | SDDU Build Agent |
