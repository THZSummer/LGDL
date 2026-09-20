# 技术计划：specs-tree-web-cli-plugin-v45-f-regularization（web-cli-plugin v4.5「F 还原度转正」；父 Feature 统领性技术方案）

> **文档定位**: SDDU 技术方案（**父 / 跨切契约与索引**）—— 记录跨切架构、总体方案取舍、聚合文件影响、红线继承、实施波次与 **12 条 ADR 的索引**（正文见唯一叶 `specs-tree-v45-1-single-write-chronology/plan.md` §7），作为收口与审查的单一参照
> **前置依赖**: 本目录 `spec.md` v1.0（44 FR / 8 NFR / 13 EC / 22 AC / 17 NG / §11 37 条元素去向 / §13 DC-V45-001~011 / §14 风险 / §15 纪律）+ `discovery.md` v1.0（Q-REG-001~012 / R-REG-001~015 / O-REG-001~009 全裁决）+ 叶 `specs-tree-v45-1-single-write-chronology/spec.md` v1.0 + 叶 `specs-tree-v45-1-single-write-chronology/plan.md` v1.0（**ADR-V45-001~012 全部正文**）
> **创建人**: SDDU Plan Agent
> **创建时间**: 2026-09-21
> **版本**: v1.0
> **更新人**: SDDU Plan Agent
> **更新时间**: 2026-09-21
> **更新说明**: 初始创建（v4.5「F 还原度转正」统领性技术方案：父 `plan.md` + 唯一叶 `plan.md` 同批产出；**ADR-V45-001~012**（正文在叶 §7）+ 跨切契约 + 红线继承表 + 不动面 T1~T10 + 五波实施序 + 聚合文件影响 63 项 + 风险登记（继承 R-REG-001~015 / R-REG-901~906 + plan 新增 R-V45-101~109））。**本任务只做 plan**：不写 tasks、不写代码、不改 `src/**`·`test/**`·`dist/**`·`docs/**`·`design/**`·ROADMAP、不改 v1/v2/v3/v4 SDDU 目录、不动 `main`、**不跑门禁/构建/Chromium**、**未调用任何受管 Provider**（routing.v1 = `local_or_compute → none`）。

---

## 1. 前置检查

| 检查项 | 状态 | 证据 |
|--------|:--:|------|
| 父 `spec.md` 存在 | ✅ | 本目录 `spec.md`（602 行，v1.0，2026-09-21） |
| 叶 `spec.md` 存在 | ✅ | `specs-tree-v45-1-single-write-chronology/spec.md`（236 行，v1.0） |
| 叶数量与结构 | ✅ | 唯一叶（`leaf:true` / `depth:2` / `deliveryOrder.position=1`）；父 `depth=1` 轻量规范容器 |
| 外部 API 文档缓存 | ✅ N/A | 零外部 API / 零新依赖 / 零新权限（NG-V45-004 / NG-V45-015）；无 `api-docs` 需求 |
| 参数化模板 | ✅ | `.opencode/plugins/sddu/templates/output/sddu-plan.md.hbs`（无用户级覆盖模板 `.sddu/templates/agents/output/sddu-plan.md.hbs`） |
| v4 叶 plan 先例 | ✅ | `specs-tree-web-cli-plugin-v4-chat/plan.md`（ADR-V4-001 父 plan 偏差登记 / ADR-V4-008 八步 / ADR-V4-009 台账 schema / ADR-V4-010 五要素 / ADR-V4-011 门禁重定标） |
| 分支 / HEAD / 工作区 | ✅ | `feature/web-cli-plugin` / `269a0c5` / `git status --short` 空 |
| 写入范围 | ✅ | 仅父/叶 SDDU 目录（`plan.md` / `state.json` / `TREE.md`）；**未跑任何门禁 / 构建 / Chromium** |

### 1.1 偏差登记（父 `plan.md` 的产出 vs 父 spec 的「轻量规范容器」定位）

父 `spec.md` §12.1 明定父 Feature = **轻量规范容器**（不承接 build/review/validate，不产出 `tasks.json`）。本阶段按编排器指令产出**父子两份 `plan.md`**，与 v4 先例（`ADR-V4-001`）同口径**显式登记**：

| 项 | 内容 |
|---|---|
| 偏差 | 父产出 `plan.md`（spec §12.1 未列出父 `plan.md`） |
| 理由 | 跨切契约（不动面 T1~T10 / 红线继承 / 台账与体积策略 / 实施波次 / 门禁集合）需要**单点定义**，否则叶与收口各持一套口径（v4 的 12 项必答即为证据） |
| 容器内核仍遵守 | 父**不产出** `tasks.md` / `tasks.json`；父**不承接** build/review/validate；实施全部由唯一叶承载；父 `state.json` 的 `depth=1` / `childrens` 结构不变 |
| 引用方式 | 叶对父的引用 = 「父 ADR/契约编号」，不依赖父 `plan.md` 的物理存在性 ⇒ 本文件可整篇作废而不牵连叶 |
| 不消耗 ADR 编号 | `ADR-V45-001~012` 已由编排器逐项指派，本偏差不另占编号 |

### 1.2 编排器 12 项技术设计必答 → ADR 索引（**跨切总表**）

| # | 必答 | ADR（正文位置） | 一句话裁决 |
|:-:|---|---|---|
| 1 | 单写机制：5 通道可见投影**真退役** + 15 门禁 44 处引用断言重写 | **ADR-V45-001**（叶 §7） | **DOM 真退役**（非 `hidden`）；事实面 = 流内行/卡；门禁改写为「节点为 `null` + 载体数 == 1」双断言（数量只增） |
| 2 | 流纯时间序：4 宿主退役渲染架构 + 元素去向 | **ADR-V45-002**（叶 §7） | `#stream` = 纯时间序卡列表；迁移元素**卡内作用域 + 唯一活跃卡铸造**（沿用 `#ask*` 先例）；`messageAnchor()` → `null` |
| 3 | composer 出流 | **ADR-V45-003**（叶 §7） | `#composer` 迁 `body` 尾 + 保持 `hidden`；id/ARIA/`requestTurn` 通路**零变化**（父节点 == body 双判据） |
| 4 | journey 第二次八步显式取代 | **ADR-V45-004**（叶 §7） | `protectedRanges[0]` 新增 **`supersessionChain[]`**；`supersededFrom` 指直接前驱；v3 段判据升级为**链式查找**（只增） |
| 5 | binding 保段策略 | **ADR-V45-005**（叶 §7） | **保段**（sha + `startByte 107780` 双不变）；段前 `:896` **字节中立避让**；段后 `:2256` 自由改写；两处 `modifiedRanges` 逐行登记 |
| 6 | density 31 格重算 | **ADR-V45-006**（叶 §7） | 31 格 **Chromium 实测重算** + `v45Ledger` 逐格留痕；夹具锚改**三重构造判据**；阈值与豁免口径**逐字不动**；越限**停机上报** |
| 7 | risk-recovery 扩展 + act 闭集 | **ADR-V45-007**（叶 §7） | `site` / `probe` 并入 priority 1；`RECOVERY_CHIP_ORDER` 规则表（site/probe 首项 = `rebind`）；`NEXTSTEP_ACTS` **6 项**；`test/local-act-wiring.test.ts` 布线门禁 |
| 8 | 手势 → 设置帮助分区 | **ADR-V45-008**（叶 §7） | `SETTINGS_SECTION_IDS` 追加 `'settings-help'`（7 → 8，单源派生）；`src/ui/settings/help.ts` 只读零可点；chip `act:'help'` |
| 9 | options 解冻 | **ADR-V45-009**（叶 §7） | 走既有 **`unfrozenZeroDiffFiles[]`**（字段扩展：scope/before/after/date/operator）+ 静态范围门禁 + `test:zero-injection ≥27` 复跑；v3 台账零 diff |
| 10 | host-registry 零宿主断言 | **ADR-V45-010**（叶 §7） | `REGISTERED_STRUCTURAL_HOSTS = []`（降级为**反向判据**）；`RETIRED_HOST_ATTRS` + `RETIRED_CONTAINER_IDS` 扩容；`evaluateHostRegistry` 6 类问题串 + 5 组伪造 reading 反证 |
| 11 | 体积军规 | **ADR-V45-011**（叶 §7） | **净减也登记**（`direction:'lowered'`）；`effectiveCeiling = min(563_200, floor(baseline × 1.05))`；**档位不下移**（`newBaselineBytes ≥ 460_801`，净减 ≤ 19,225 B），越界**停机上报**；`authorConfirmation` 保持 `pending-author-line` |
| 12 | W4 分层实施序 | **ADR-V45-012**（叶 §7） | 单叶**五波**（W1 脚手架 → W2 strips → W3 宿主退役 → W4 门禁重算+journey 取代+密度 → W5 收尾）；**W4+W5 同一原子区间**，中间态不提交 |

---

## 2. 架构分析（跨切）

### 2.1 问题定性（题眼）

v4（F-30）的收口结论是「F 的形态目标未完全达成，但残余已被登记为结构性遗留」，其制度依据是 `host-registry.ts:46-51` 把 4 个宿主登记为「**permanent structural home now**」、理由是「its content is **pinned by protection gates**」——即**由门禁反推出形态的永久性**。v4.5 **推翻这条推理链**：先让实现服从 F 稿纯形，再让门禁去描述新形态。

两条核心事实（discovery §7.1 / 本轮实测）：

1. **双写**：5 条提示带 DOM 投影 + 流内系统事件行**同事实两份可见面**（`host-registry.ts:74-76` 逐字承认）。
2. **切段**：`ol#stream` 的 4 个 `li[data-host]` 把时间序切成 `[decision][卡…][composer][l1-panels][strips]`（卡锚 = composer 宿主，`stream-render.ts:69-71`）。

### 2.2 跨切目标架构

```
body
├── header#region-toolbar             （不变；≤5 可点）
├── main#region-stream
│   ├── ol#stream[role=log]           ← 纯时间序卡列表（零宿主）
│   └── div#view-host[hidden]         （+ #l2-tree-attribution / #l2-audit-evidence / #l2-audit-count）
├── footer#region-statusbar           （不变；#send-reason 保留）
├── form#composer[hidden]             ← 新增位置（body 尾；id/ARIA 保留）
└── div#settings-view[hidden]         （+ 「帮助」分区 #settings-help）
```

**四条结构性不变量**（本 Feature 的验收骨架，叶 ADR 逐条落地）：

| # | 不变量 | 判据 | 承载 ADR |
|:-:|---|---|---|
| I1 | **零宿主** | `#stream` 子树内 `[data-host]` / `[data-transitional-host]` 计数 == 0（任意深度） | ADR-V45-002 / 010 |
| I2 | **纯卡序** | `#stream` 每个 `li` 都带 `data-msg-type`；唯一允许的非卡子节点 = 空态 `p.log-empty-text`（显式登记 + 反证） | ADR-V45-002 |
| I3 | **事实唯一** | 首屏三事实（env / site / probe）各恰 1 个可见载体；5 个退役 id 在 DOM 中 `null` | ADR-V45-001 |
| I4 | **恢复链不断** | ref 卡卡内恢复区 + 推荐卡 chips（含 `rebind`）+ 设置站点详情 = 三处呼应，无第 4 处投影 | ADR-V45-002 / 007 / 008 |

### 2.3 数据流与依赖（跨切）

| 面 | 变更方向 | 关键契约 |
|---|---|---|
| strips 事实 | 双写 → **单写** | `STRIP_CHANNEL_KINDS` 重构（emitter 唯一 + 载体数 == 1）；`appendSystem` 4 规则语义**逐字不变** |
| 决策壳 | 静态 DOM → **卡内承载** | `project()` → `CardView.payload`；唯一活跃卡铸造稳定 id（`#ask*`/`#confirm*` 先例） |
| L2 视图 | 无 → **只读承载块** | `l2/view-host.ts` 视图替换（零新机制）；进被测量面（不豁免） |
| composer | 流内 → `body` 尾 | 仅 `parentElement` 变化；`#input`/`#send`/`requestTurn` 零变化 |
| 门禁 | 描述旧形态 → **描述新形态** | 计数只增不减；保护段显式取代是唯一例外 |

### 2.4 红线继承表（**逐条**）

| # | 红线 | 继承动作 | 承载门禁 |
|:-:|---|---|---|
| N1 | 三区法则（工具栏 ≤5 可点 / 流 = 唯一交互面 / 状态栏永不折叠） | **逐字不动**（NG-V45-006） | `test:l0` + `test:density` |
| N2 | `DENSITY_EXCLUDED_SUBTREES = ['#stream']` 单源 | **不动**（全仓唯一声明） | `test/density-thresholds` |
| N3 | 密度阈值 `7/15 · 9/20 · 17/35` | **逐字不动**（NG-V45-007） | `test:density` + `test/density-thresholds` |
| N4 | 防滥用（单卡 ≤6 / 首屏 ≤2 / 合计 ≤8 / 欢迎卡 ≤1 / 文案 ≤8 行） | **逐字不动** | `test:density` RP 反证 |
| N5 | 风险位永不折叠（`#region-statusbar` 本体 / `#risk-chips` / `#risk-rail` / `#risk-detail`） | **逐字保留** | `test:l0` + `test/l0-disclosure.test.ts` |
| N6 | `STREAM_HEIGHT_RATIO_MIN = 0.65` | **只允许上调** | `test:journey #15b` + `test:density` |
| N7 | `dist/content.js` 177,076 B / sha `52a82620…` | **零容差** | `test:design-contract` + 逐字节 |
| N8 | `dist/pick-layer.js` 33,900 B / sha `5f567d7e…` | **零容差** | 同上 |
| N9 | `design/**` + `option-f-shim.mjs` 双 sha256 + 60 断言 | **零触碰** | `test:design-contract ≥6` |
| N10 | `manifest.json` 零新增权限 / 无 `contextMenus` / 判定链内容哈希 | **零改动** | `test:supersession` `zeroDiffFiles` 段 |
| N11 | `docs/v3-supersession-ledger.json` | **零 diff**（冻结历史） | `test:supersession-ledger.test.ts` |
| N12 | 断言零删除零降级、计数只增不减 | 唯一例外 = 保护段显式取代（台账留痕） | 各门禁 + `test:supersession` |
| N13 | 反证必须实跑（注入 → FAIL → 逐字节还原 → PASS） | 禁「删属性充数 / 自我裁决 / 换口径放松」 | 各门禁 + `test:gate-integrity` |
| N14 | 门禁严格串行（一次一个 Chromium，`finally` 自清 profile） | 禁并发 | `test:v3` 链 + 日志 |
| N15 | `git add` path-limited（禁 `git add -A` / `.`）；不 force push；不合 main；无新依赖 | 逐字遵守 | 人工核 |
| N16 | `SIDEPANEL_CEILING_CAP` 保持 `record-only`（**不设自缚装置**） | 不得接回判定 | `test/size-budget` |
| N17 | V3-VOL-3 三值同源（档位 512,000 / 绝对上限 563,200 不变） | `authorConfirmation.status` 保持 **`pending-author-line`**（不得伪称已确认） | `test/size-ruling-vol3 ≥10` |
| N18 | `KL-N-10`（binding 环境性 flake） | 首轮异常隔离复跑 ≥2、日志全量、仍红如实登记**不阻塞收口** | 人工核 + 日志 |

### 2.5 明确「不动面」清单（**逐项**）

| # | 不动面 | 守线方式 |
|:-:|---|---|
| T1 | `src/content/**` / `dist/content.js` | 零改动（`git diff` 零行） |
| T2 | `dist/pick-layer.js` | 零改动 |
| T3 | SW / `KIND_SET` / 判定链（`policy.ts` / `auto-authorize.ts` 内容哈希 pin） | 零改动 |
| T4 | `manifest.json` | 零改动（零新增权限、无 `contextMenus`） |
| T5 | `design/**` + `option-f-shim.mjs` + 12 卡类型学 | 零触碰（`CARD_TYPES` 零扩展） |
| T6 | 三区法则本身（工具栏 ≤5 / 流 = 唯一交互面 / 状态栏永不折叠） | 零改动 |
| T7 | `docs/v3-supersession-ledger.json` | 零 diff（冻结历史） |
| T8 | L2 视图内部（tree / commands / audit 既有内容） | **仅新增承载块**，不改既有内容（NG-V45-014） |
| T9 | `system-events.ts` 4 规则常量（5000 / 20 / `持续：` / 净化） | 逐字不变 |
| T10 | `packages/web-cli-base/**` / `.opencode/opencode.json` / `ROADMAP.md` / `F-29` 区段 | 零改动 |

---

## 3. 方案对比（总体）

> 细粒度方案对比（退役路径 / 卡内承载 / binding 保段 / 夹具锚 / 台账扩展）见**叶 `plan.md` §3（P-V45-01~05）**。本节只做**总体路线**取舍。

| 维度 | 路线 A：**纯形优先（先改实现，再让门禁描述新形态）** | 路线 B：门禁优先（先放宽门禁，再改实现） | 路线 C：只做文档对齐（把 deferred 改写成"已完成"） |
|---|---|---|---|
| 描述 | 实现服从 F 稿纯形（零宿主 + 单写）；门禁等价重锚 + 保护段显式取代 | 先按旧门禁能读的形态保留结构，逐步放宽判据 | 不改实现，改登记口径 |
| 优点 | 达成 G-V45-001~006 全部目标；过渡态真正清零；门禁成为**描述性**而非**约束性** | 门禁短期全绿 | 成本最低 |
| 缺点 | 门禁迁移量大（journey / binding / density / 15+9+4 文件引用） | **正是 v4 的病根**（由门禁反推形态永久性）；BLOCK-02 同类 | 不解决任何真实缺陷（用户仍看不到唯一事实面） |
| 风险 | 保护段二次取代 / 字节避让 / 反证空转（已逐条缓解） | 判据空转 + 形态永久化 | 治理失信 |
| 工作量 | **高**（W1~W5，约 52~58 任务） | 中（但技术债翻倍） | 低 |
| 结论 | ✅ **选中** | ❌ | ❌ |

---

## 4. 推荐方案（跨切决策表）

| 决策 | 选中 | 理由 |
|---|:--:|---|
| D-P-V45-01 总体路线 | **A（纯形优先）** | 唯一能关闭 Q-REG-001~003（题眼）与 R4-18 收口义务的路线 |
| D-P-V45-02 退役口径 | **DOM 真退役**（非 `hidden`） | NG-V45-001 + FR-V45-010 的硬约束；防 BLOCK-02 复辟 |
| D-P-V45-03 门禁策略 | **等价重锚 + 计数只增 + 逐条反证** | 父 §15 第 5/6 条；保护段显式取代为唯一例外 |
| D-P-V45-04 台账 | **双台账 + 链式 pin**（`supersessionChain` / `unfrozenZeroDiffFiles`） | 在「v3 冻结历史零 diff」与「链式可机核」两约束下成立 |
| D-P-V45-05 体积 | **净减也登记 + 档位不下移**；越界**停机上报** | V3-VOL-3 三值同源硬约束（叶 ADR-011 给算术） |
| D-P-V45-06 实施序 | **五波（W1~W5）**，W4+W5 原子 | 避免中间态取代（R-V45-109） |
| D-P-V45-07 停机规则 | 保护段链断 / 体积过界 / 密度越阈 / 反证恒绿 ⇒ **停下上报编排器** | 禁静默弱化（父 §15 + NG-V45-007 / 010） |

---

## 5. 聚合文件影响分析

> **叶子级明细**（63 项逐路径 + 操作 + 说明，src 21 / test 34 / docs 2 / SDDU 6）见 **叶 `plan.md` §5**。本表只给**跨切聚合**（按资产类别 + 触碰面）。

| 类别 | 项数 | 主要内容 | 是否动约束面 |
|---|:--:|---|:--:|
| `src/ui/sidepanel/**` | 17 | `index.html`（退役 4 宿主 + 新增 L2 承载块 + composer 出流）/ `host-registry.ts`（零宿主判据）/ `disclosure.ts`（三份声明）/ `stream-render.ts`（锚迁移）/ `sidepanel.ts`（单源化 + 迁移 + 2 个本地 act 分支）/ `view-model.ts`（firstRunCard + 手势单源 + 0 计数停渲染）/ `recommend.ts`（触发集 + 规则表 + 闭集 6）/ `cards/{ref,askuser,auth,nextstep,shared}.ts` / `l1/{panels,receipt,local-tree}.ts` / `l2/{audit,view-host}.ts` | 是（形态面） |
| `src/ui/settings/**` | 3 | `sections.ts`（7 → 8）/ `panel.ts`（挂载）/ **NEW** `help.ts`（只读帮助分区） | 是（计数派生） |
| `src/ui/options/index.html` | 1 | **纯文案行**解冻订正 | 是（治理面，范围门禁） |
| `test/**` | 33 | 30 MODIFY（journey / binding / density / l0 / l1 / l2 / page-input / hardening / insight / recommendation / stream / ask-auth / l1-reverse / l2-reverse / 各 node 门禁）+ 3 NEW（`host-registry` / `local-act-wiring` / `settings-help`） | 是（判据面） |
| `docs/**` | 2 | `v4-supersession-ledger.json`（链式 pin + 条目 + 解冻 + 三值）/ `v4-density-baseline.json`（v4.5 台账 + 31 格 + 夹具锚 + registry） | 是（台账面） |
| SDDU | 6 | 父/叶 `plan.md` + 父/叶 `state.json` + 父/叶 `TREE.md` | 否 |
| **合计** | **63** | 新增 4（**零新增宿主**）；修改 59；删除文件 0 | — |

**跨切不变量**：`#stream` 宿主 4 → **0**；新增宿主 **0**；退役 DOM 元素 19 / 迁移 13 / 消解 3 / 保留 2（父 §11）；保护段 1 段二次取代 + 1 段保段；台账新增 `entries` 估 40~55 / `modifiedRanges` 估 25~35（**实测后填值，禁预填**）。

---

## 6. 风险评估（聚合；逐条缓解见叶 §6）

### 6.1 继承风险

继承 **R-REG-001~015**（discovery §5.2）+ **R-REG-901~906**（spec §14.2），等级与预登记证据**逐条保留**；逐条缓解措施见**叶 `plan.md` §6.1**。高风险项集中在：journey 二次取代（R-REG-001）、binding 段外迁移（R-REG-002）、l0 同源耦合（R-REG-003）、投影正面断言（R-REG-005）、host-registry 判据即结构（R-REG-010）、反证空转（R-REG-009）、零宿主绕过（R-REG-906）。

### 6.2 plan 新增风险

| # | 风险 | 概率 | 影响 | 缓解 |
|---|---|:--:|:--:|---|
| R-V45-101 | 净减过界 ⇒ V3-VOL-3 档位下移（512,000 → 460,800；绝对上限 563,200 → 506,880） | 低 | 高 | 净减 ≤ **19,225 B** 硬边界（算术）；`test/size-ruling-vol3` 闸门；越界**停机上报** |
| R-V45-102 | binding 段前字节中立避让不可行 | 中 | 中高 | 等长改写 + 同前置区等量删白补偿；`startByte === 107780` 门禁兜底；不可行**上报**（走显式取代，禁静默改 pin） |
| R-V45-103 | 多卡并存时 id 铸造歧义 | 中 | 中 | 仅唯一活跃/最新卡铸造；历史卡作用域承载；「文档内计数 ≤ 1」断言 + 反证 |
| R-V45-104 | `notice` 同名语义误伤（182 处中大量为事件语义） | 中高 | 中高 | **逐点判定**（以 `getElementById('notice')` / `#notice` 为唯一判据）；事件语义文件列白名单零触碰 |
| R-V45-105 | `#composer` 出流后 flex 参与 | 中 | 中 | 「`hidden === true` 恒真」断言 + `#15b` 占比护栏 |
| R-V45-106 | 反证注入点搬迁后恒绿 | 中高 | 高 | 逐条重写注入点；`expectFailPattern` 声明数只增；为收口硬条件 |
| R-V45-107 | 密度 31 格实测越阈 | 中 | 中高 | 阈值零放宽；越限**停机上报** |
| R-V45-108 | 台账橡皮图章化 | 中 | 中 | `newTitle` 可定位机判 + `reason ≥ 40` + hunk↔条目全命中 |
| R-V45-109 | 收口面拆成两次提交（中间态取代） | 中 | 高 | W4+W5 同一 commit 区间；失败整体回滚 |

### 6.3 风险 Top5

| 排名 | 风险 | 停机规则 |
|:-:|---|---|
| 1 | R-REG-001 journey 二次取代失控 | 回八步 ①~④；不得改 v3 台账 |
| 2 | R-V45-101 / R-REG-015 体积过界 | **停下上报**（禁静默改三值 / 禁自缚装置） |
| 3 | R-V45-106 反证空转 | 重写注入点；仍不红 ⇒ 判据无效并上报 |
| 4 | R-REG-009 / R-V45-108 台账与反证形式化 | 补齐台账；不得先删后补 |
| 5 | R-V45-107 密度越阈 | **停下上报**（阈值零放宽） |

---

## 7. 生成的 ADR（**ADR-V45-001~012，全部 ACCEPTED**；正文见叶 `plan.md` §7）

> 与 v1 `ADR-001~018`、v2 `ADR-V2-001~033`、v3 `ADR-V3-001~036`、v4 `ADR-V4-001~040` **零编号冲突**。全部正文（含 背景 / 选项 / 裁决 / 后果 / 回滚 / FR-AC 映射）落在唯一叶 `specs-tree-v45-1-single-write-chronology/plan.md` §7（1001 行）；本表为**跨切索引**，供收口 / 审查单点对照。

| ADR | 标题 | 状态 | 覆盖必答 | 影响 FR / AC（摘要） |
|-----|------|:--:|:--:|---|
| ADR-V45-001 | 单写机制：5 通道可见投影真退役 + 断言读流内行/卡 | ACCEPTED | ① | FR-V45-010~015 · AC-V45-001/003/004/016 |
| ADR-V45-002 | 流纯时间序：4 宿主退役渲染架构 + 元素去向 | ACCEPTED | ② | FR-V45-020~022/024~026 · AC-V45-002/006/007/008/009 |
| ADR-V45-003 | `#composer` 出流（body 尾 hidden + 兼容证明） | ACCEPTED | ③ | FR-V45-023/024 · AC-V45-005 |
| ADR-V45-004 | journey 第二次八步取代（`supersessionChain` 链式 pin） | ACCEPTED | ④ | FR-V45-080/083/084 · AC-V45-014/016/017 |
| ADR-V45-005 | binding 保段（段前字节中立避让 + 段外逐行登记） | ACCEPTED | ⑤ | FR-V45-081 · AC-V45-015 |
| ADR-V45-006 | density 31 格重算 + 夹具锚三重构造判据 | ACCEPTED | ⑥ | FR-V45-070~074 · AC-V45-006/018 |
| ADR-V45-007 | `risk-recovery` 扩展 + chips 规则表 + act 闭集 6 项 + 布线门禁 | ACCEPTED | ⑦ | FR-V45-030~033 · AC-V45-011/012 |
| ADR-V45-008 | 手势 → 设置「帮助」分区（单源派生） | ACCEPTED | ⑧ | FR-V45-040~042 · AC-V45-010/012 |
| ADR-V45-009 | `options/index.html` 解冻（`unfrozenZeroDiffFiles` 扩展 + 范围门禁） | ACCEPTED | ⑨ | FR-V45-050~052 · AC-V45-013 |
| ADR-V45-010 | host-registry 零宿主断言（注册表降级 + `RETIRED_*` 扩容） | ACCEPTED | ⑩ | FR-V45-060~062 · AC-V45-002/016 |
| ADR-V45-011 | 体积军规（净减双向登记 + 档位不下移硬约束） | ACCEPTED | ⑪ | FR-V45-090~093 · AC-V45-019/020 |
| ADR-V45-012 | W4 分层实施序（五波 + 收口面原子性） | ACCEPTED | ⑫ | FR-V45-003/004 · AC-V45-021/022 |

**父级 ADR 所有权声明**：本 Feature 为**单叶**，故 12 条 ADR **全部由唯一叶承载**（与 v4 的「父承 001~016 + 叶承 017~040」不同）；父 `plan.md` 只做索引与跨切契约，不另立 ADR。此结构与父 spec §12.1「轻量规范容器 + 唯一叶」一致。

---

## 8. 实施估算

### 8.1 波次与任务数（供 tasks 阶段参考，**非需求**）

| 波 | 名称 | 任务数（估） | 退出判据（Entry/Exit，简版） |
|:--:|---|:--:|---|
| W1 | 门禁脚手架 / 断言预迁移 | ~8 | 3 个新 node 门禁骨架就位；将失效断言先改写（声明 `expectFailPattern`）；`EXPECTED_AUDITED_FILES` 追加；`CHROMIUM_GATES` 保持 9 |
| W2 | strips 单写 | ~10 | emitter 唯一 + 5 条提示带 DOM 退役 + 归并矩阵新语义 + 「载体数 == 1」+ 4 组反证 |
| W3 | 宿主退役 + 元素迁移 | ~14 | `#stream` 零宿主 + 纯卡序；`messageAnchor` 迁移；卡内化（ref / ask / auth）；`#composer` 出流；L1 组去向；`disclosure.ts` 重写；`host-registry.ts` 零宿主判据 |
| W4 | 门禁重算 + journey 取代 + 密度重算 | ~12 | 11 处等价重锚全绿；journey 新 pin + 链式；binding 段外登记；density 31 格 `v45Ledger` + 锚重写 |
| W5 | 收尾 | ~10 | 体积五要素（净减方向）+ 三值同源 + 红线逐字节 + 24 门禁串行全绿 + 人工面清单 + 收口文档 |
| **合计** | — | **~52~58（建议 54）** | W4+W5 同一原子 commit 区间 |

### 8.2 风险点与工作量集中区

| 集中区 | 说明 | 风险点 |
|---|---|---|
| 门禁迁移 | strips 15 文件 / 44 处 + decision 壳 9 文件 / 58 处 + l1-panels 4 文件 / 6 处 | R-REG-003~005 / R-V45-104 / R-V45-106 |
| 保护段 | journey 二次取代 + binding 字节避让 | R-REG-001/002 / R-V45-102 |
| 台账 | 40~55 `entries` + 25~35 `modifiedRanges` + 链式 pin + 解冻 | R-V45-108 |
| 体积 | 净减方向登记 + 档位不下移 | R-V45-101 |
| 密度 | 31 格实测 + 锚重写 + registry 重锚 | R-REG-006/008 / R-V45-107 |
| 收口 | 24 门禁严格串行（一次一个 Chromium；1.5 GB 机器） | R-REG-011 / R-V45-109 |

### 8.3 完成定义（DoD，父级）

1. `#stream` 内 `[data-host]` / `[data-transitional-host]` 计数 == **0**；`#stream` 子节点全为卡（∪ 空态占位）。
2. 5 个退役 id 在 DOM 中 `null`；`#send-reason` 仍在状态栏；首屏三事实各恰 1 载体。
3. `#composer.parentElement === body` ∧ `hidden === true`；`#input`/`#send`/`requestTurn` 通路零变化。
4. journey 新 pin + `supersessionChain` 链式可机核；binding 保护段 sha 不变 + 段外逐行登记。
5. 密度 31 格 `v45Ledger` 逐格留痕；阈值零 diff；夹具锚由构造保证。
6. 体积五要素（方向 = `lowered` 或 `raised`）+ 三值同源 + 红线逐字节。
7. **24 项门禁严格串行全绿且计数 ≥ 基线**；无「不再 FAIL 的判据」遗留。
8. 人工面清单逐项标注（`⏳ 未执行` 或 `PASS`，**不得冒充 PASS**）。

---

## 9. 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建（v4.5「F 还原度转正」**统领性技术方案**：父 `plan.md` + 唯一叶 `plan.md` 同批产出；**ADR-V45-001~012**（正文在叶 §7）；⚠️ 偏差登记 = 父产出 `plan.md`（容器内核仍遵守：父不产出 tasks / 不承接 build·review·validate）；§1.2 编排器 12 项必答 → ADR 索引；§2 跨切架构 + I1~I4 不变量 + **红线继承表 N1~N18** + **不动面 T1~T10**；§3 总体路线对比（A 纯形优先 vs B 门禁优先 vs C 文档对齐）；§4 跨切决策表 D-P-V45-01~07；§5 聚合文件影响 **63 项**（src 21 / test 34 / docs 2 / SDDU 6，新增 4，零新增宿主）；§6 风险（继承 R-REG-001~015 + R-REG-901~906 + plan 新增 R-V45-101~109）+ Top5；§8 实施估算（五波 ~52~58 任务 / 建议 54）+ 风险集中区 + 父级 DoD）。**本阶段只做 plan**：不写 tasks、不写代码、不改 `src/**`·`test/**`·`dist/**`·`docs/**`·`design/**`·ROADMAP、不动 `main`、不 commit/push、**未跑任何门禁 / 构建 / Chromium**、**未调用任何受管 Provider**（routing.v1 = `local_or_compute → none`）。 | 2026-09-21 | SDDU Plan Agent |

