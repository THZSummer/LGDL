# Feature Specification：specs-tree-v5-1-next-registry-pipeline（V5-1 NextProvider 注册表 + op 管线）

> **文档定位**: SDDU 需求规范（叶子切片） — 本叶承载的父 FR / NFR / EC / AC 的**实施范围切片**；权威条文见父 `../spec.md`
> **前置依赖**: 父 `../spec.md` v1.0（2026-09-22）+ 父 `../discovery.md` v1.0（2026-09-22，Q-ALLN-001~014 / R-ALLN-001~016 / O-ALLN-001~012 已全裁决）；设计基准 `option-g-all-in-next.html`（`a7c0a77a…`）+ `option-g-shim.mjs`（`d0107ecb…`，127 断言，**只读、零触碰**）
> **创建人**: SDDU Spec Agent
> **创建时间**: 2026-09-22
> **版本**: v1.0
> **更新人**: SDDU Spec Agent
> **更新时间**: 2026-09-22
> **更新说明**: 初始创建（V5-1 叶子规范：契约 v2 注册表 + op 管线 + act→opId + 瘦分发 + 双契约 + 证明义务机核；**首叶，P0**）

本叶 = v5 的**首叶**，交付「可以让后续操作『注册即接入』的那一层」：`NextProvider` / `NextOp` 接口（Definition）+ 注册表（Provider）+ 单次查表分发器（Consumer）三者齐备；契约 v2 **七点**逐点可机核；`act` 闭集被 **opId** 取代（chip 绑 `data-op`）；**统一管线四态**成立；`handleCardAction` **per-op diff = 0**；并把 **G 稿 + 127 断言**与 F 契约**并存**地纳入 `design-contract` 门禁（消除 Q-ALLN-013 的治理真空）。**本叶不落地 9 个 op 的具体业务能力**（那是 `v5-2`），只落地「op 能被注册、被分发、被证明」的机制。

---

## 1. 元数据

| 字段 | 值 |
|------|-----|
| Feature ID | specs-tree-v5-1-next-registry-pipeline（V5-1 NextProvider 注册表 + op 管线） |
| 父 Feature | specs-tree-web-cli-plugin-v5-all-in-next（depth=1，F-32，v0.10.0） |
| 名称 | V5-1 NextProvider 注册表 + op 管线——契约 v2 七点（可逆注册 / 依赖声明式 / 优先级显式化 / 分发模式公开契约 / 失败语义分级 / Seam 三件套 / 证明义务表）+ 统一管线四态 + act→opId 取代 + 瘦分发（diff = 0）+ 双契约（F 60 冻结不替换 + G 127 新增） |
| 优先级 | P0 |
| 目标版本 | v0.10.0（登记留给收口） |
| 目录深度 | depth=2（叶子，`leaf: true`） |
| 交付顺序 | **position = 1（首叶）**；叶内执行序见 §8.4 |
| 分支 / HEAD | `feature/web-cli-plugin` / `4c1dbe1`（spec 阶段起点） |
| 基线产物 | `dist/sidepanel.js` = **498,521 B**（生效上限 **523,447 B**）；`dist/content.js` = **177,076 B**（零容差） |
| 依赖 | **无前置叶**（本叶是依赖链起点） |
| 下游叶 | `specs-tree-v5-2-ops-first-batch`（依赖本叶的注册表 / 管线接口）；`specs-tree-v5-3-chrome-face`（间接） |
| 相关干系人 | 作者（唯一真实用户 + 决策者，已授权编排器代行决策）；编排器（DC-ALLN-002 / 003 / 008 / 011）；下游 @sddu-plan / @sddu-tasks / @sddu-build / @sddu-review / @sddu-validate |
| 关联问题 | Q-ALLN-003（架构不可扩张，核心）/ Q-ALLN-013（design-contract 真空，潜在）；关联 Q-ALLN-001（提供机制基础） |
| 关联风险 | R-ALLN-004（注册表取代推荐器，高）/ R-ALLN-005（契约真空，高）/ R-ALLN-009（密度，中）/ R-ALLN-010（保护段，中高）；+ R-ALLN-901 / 902 / 903 / 905 / 909 |

---

## 2. 上下文与边界

### 2.1 上下文

现状下「新增一种操作」必须改 ≥4 处：**手写规则表**（`recommend.ts:52`）+ **act 闭集 6 项**（`:194`，被两处门禁逐字钉死）+ **`handleCardAction` 16 分支 switch**（`sidepanel.ts:184-277`，含 `:275` 的「将在 v4-3 / v4-4 落地」兜底告知）+ **若干门禁**。chip 绑的是**动作字符串** `data-act`（`cards/nextstep.ts:59`），不是 opId。结果必然出现**假控件**（加了规则忘加分支）与**新死端**（加了阻塞态忘加入口）。

同时：G 稿（273,621 B / 127 断言，作者定稿冻结）**不在任何门禁内**（`grep -rn option-g test/ src/ docs/` = 0 命中）⇒ 实现偏离设计稿**机器不可发现**（Q-ALLN-013）。

本叶的工作 = **把「操作」变成注册表条目，把「分发」变成查表，把「设计-实现一致」变成机器证据**。

### 2.2 范围（做 / 不做）

**做（in）**：

- `NextProvider` 接口形状（`{id, deps, priority, prepend?, mode, fail, when, chips, dispose}`）+ `NextOp` 形状（`{opId, 风险级, params?, consent?, execute, receipt}`）的 **Definition**（纯 TS 类型 / 常量）。
- `registerNextProvider(def, opts?)` → **幂等 `unregister()`**；注册表（**Provider**）；`handleCardAction` **单次查表**（**Consumer**）—— **Seam 三件套**齐备。
- 契约 v2 **七点**落地并逐点可机核（R1~R7，父 §5.4 FR-ALLN-030~038）。
- **统一管线四态**（`next →（params?）→（consent?）→ execute → receipt`）机制（op 执行体在 `v5-2`，本叶只交付「管线是唯一的」）。
- **act → opId 等价映射**（6 条）+ chip `data-op` + 瘦分发（**per-op diff = 0**）。
- **本地 op 语义对齐**（零回合 / 不受 `pending` 门控 / 单一生产入口）。
- **双稿双 shim 入 `design-contract` 门禁**（F 60 冻结不替换 + G 127 新增 + 127 行映射 + `designContractChanges` 登记）。
- **阻塞态枚举单源** + **候选可达性机制**（法七的机制基础，父 FR-ALLN-010 / 011 / 013 的注册表侧）。

**不做（out）**：

- **不落地 9 个 op 的业务能力**（授权 / 权限 / LLM / 撤销 / 拾取 / 描述 / 帮助 / 回合）——那是 `v5-2`；本叶只保证它们**能被注册**且**管线唯一**。
- 不落地 `error` 卡出生带恢复区 / 死端守护门禁 / 授权 chip / 可拖动宽度 / 法八四面机核 —— 那是 `v5-2` / `v5-3`。
- 不碰 `src/content/**` / `dist/content.js` / `dist/pick-layer.js`；不动判定链；不改 `KIND_SET`；不改 `manifest.json`（除 X1 的 `optional_permissions` 在 `v5-2`）。
- 不改 12 卡类型学 / 三区法则；不新增流内固定宿主；不改 ROADMAP；不碰 `design/**`。

### 2.3 与父规范的关系

- **权威条文 = 父 `../spec.md`**（§5.4 CONTRACT / §5.6 PIPE / §5.10 DESIGN / §5.11 SUPERSEDE / §5.12 GATE / §13 红线 / §14 拆分）。本叶只做**范围切片 + 实施口径**，不新增与父冲突的需求；若必须偏离，须先回父规范做显式取代登记。
- 父 §12 的 X3 / X4 / X6（chip 侧）映射表 = 本叶的**判据重写施工图**；父 §9 的 AC-ALLN-004 / 005 / 009 / 016 / 017 / 020 = 本叶的**验收锚点**。

---

## 3. 目标与非目标（本叶）

### 3.1 目标

| # | 目标 |
|---|------|
| LG-V5-1-001 | **新增操作 = 注册一个 provider**：主流程（`handleCardAction`）**一行都不用改**，`diff = 0` 由静态机核强制（Q-ALLN-003 的核心）。 |
| LG-V5-1-002 | **契约 v2 七点逐点可机核**：可逆注册 / 依赖声明式 / 优先级显式化 / 分发模式公开契约 / 失败语义分级 / Seam 三件套 / 证明义务表。 |
| LG-V5-1-003 | **op 词汇唯一**：`act` 闭集退役为 opId 集（6 条等价映射，能力零丢失）；chip 绑 `data-op`；管线唯一（无 per-op 旁路）。 |
| LG-V5-1-004 | **设计-实现一致有机器证据**：G 稿 + 127 断言入契约，**F 契约并存不替换**（Q-ALLN-013 治理真空消除）。 |
| LG-V5-1-005 | **失败可见**：注册错误 loud 红显、execute 异常单卡边界捕获、改状态 op 有快照回滚语义位。 |
| LG-V5-1-006 | **法七的机制基础成立**：阻塞态枚举单源 + `site.unauthorized` 常驻候选可达（与 `firstRun` 无关）。 |

### 3.2 非目标（本叶）

继承父 §3.2 的 `NG-ALLN-001~020` 全部适用。**本叶额外强调**：

| # | 本叶明确不做 |
|---|-------------|
| LNG-V5-1-001 | **不把「注册表」实现为「在分发器里加一个 if」**——分发器 per-op 分支数必须为 **0**；否则契约义务落空。 |
| LNG-V5-1-002 | **不用 JSON 外部声明式配置**绕开 TS 类型 / 校验（O-002 裁决：不引入新加载面）。 |
| LNG-V5-1-003 | **不把 `act` 与 `opId` 双词汇长期并存**：`data-act` 只允许作为渲染别名，不得作为分发依据。 |
| LNG-V5-1-004 | **不替换 / 删除 F 契约的冻结常量**（N21）；G 契约以**新增**方式入册。 |
| LNG-V5-1-005 | **不提前落地 `v5-2` 的 op 业务能力**——避免与 `v5-2` 重复取代 / 冲突取代。 |

---

## 4. 功能需求（本叶承载的父 FR）

> 需求条文以父为准；下表给出**本叶落地切入点**。

| 父 FR | 本叶落地切入点 | 优先级 |
|---|---|---|
| FR-ALLN-030 | R1 可逆注册：`registerNextProvider()` 返回幂等 `unregister()`；N→N+1→N 往返读数 | P0 |
| FR-ALLN-031 | R2 依赖声明式：`deps ⊆ SERVICES` + 未知 deps loud + 依赖就绪定序（列表位置置换测试） | P0 |
| FR-ALLN-032 | R3 优先级显式化：`priority` 必填 + `prepend` + 按 id 整行覆盖（计数不变） | P0 |
| FR-ALLN-033 | R4 分发模式公开契约：挂载点 × 模式表（`next`/`params`/`consent`/`execute` = `waterfall`；`receipt` = `emit`）+ `mode` 越集 loud | P0 |
| FR-ALLN-034 | R5 失败语义三级：① 单卡边界捕获（错误卡 + 恢复 next）② 注册 loud 红显 ③ 快照 / 回滚语义位（三表位声明） | P0 |
| FR-ALLN-035 | R6 Seam 三件套：Definition（接口形状）/ Provider（注册表）/ Consumer（单次查表分发器）齐备 | P0 |
| FR-ALLN-036 | R7 证明义务表：9 行四要素 + 表尾明示契约义务「新增 provider 只改注册表条目，分发器 diff = 0」 | P0 |
| FR-ALLN-037 | 证明义务表静态机核：注册表 ↔ 义务表（行数 / opId 集 / 四要素 / 无悬空 chips） | P0 |
| FR-ALLN-038 | 注册表形态 = 纯 TS 注册（无 JSON 加载面） | P0 |
| FR-ALLN-055 | 统一管线四态唯一（无 per-op 旁路）；`params` / `consent` 缺省语义正确 | P0 |
| FR-ALLN-056 | act → opId 6 条等价映射（唯一权威常量 + 双向可查） | P0 |
| FR-ALLN-057 | chip 绑 `data-op`；分发只读 `data-op`〔口径注 ①〕 | P0 |
| FR-ALLN-058 | 瘦分发：一次查表 + 零 per-op 分支；四种操作下分发器哈希不变 | P0 |
| FR-ALLN-059 | 本地 op 语义对齐：零回合 / 不受 `pending` 门控 / 单一生产入口（布线门禁） | P0 |
| FR-ALLN-010 | 阻塞终态 5 类闭集（唯一声明源） | P0 |
| FR-ALLN-011 | 阻塞终态必有可达 next（机制侧：候选由注册表产出、可达性由管线保证） | P0 |
| FR-ALLN-013 | `site.unauthorized` 常驻候选（`site.active ∧ !authorized`，与 `firstRun` 无关） | P0 |
| FR-ALLN-100 | 双稿双 shim 并存（F 60 冻结不替换 + G 新增） | P0 |
| FR-ALLN-101 | G 稿 + 127 断言入 `design-contract`（G 四项常量 + 127 行映射 + id 集相等） | P0 |
| FR-ALLN-102 | `designContractChanges` 登记（空数组 → 含 G 条目，五要素） | P0 |
| FR-ALLN-103 | G 稿内容零改动（`design/**` 零 diff；若改须五件套） | P0 |
| FR-ALLN-112 | X3：act 闭集 → op 注册表（旧闭集判据等价重写为 opId 集判据） | P0 |
| FR-ALLN-113 | X4：G 入契约；F 冻结不静默替换 | P0 |
| FR-ALLN-115 | X6（chip 侧）：`data-act` → `data-op` + 注册表候选 + 统一管线 | P0 |
| FR-ALLN-116 | 取代一律等价重锚（本叶负责 X3 / X4 / X6 三项的等价对账） | P0 |
| FR-ALLN-003 | 断言零删除零降级、计数只增（本叶面） | P0 |
| FR-ALLN-004 | 共享面（`design-contract` / 取代台账）**恰一次**登记（本叶负责 design-contract 侧） | P0 |
| FR-ALLN-120 | 门禁等价重锚（本叶主责：`recommendation-sources` / `local-act-wiring` / `authorize-chip-wiring` / `recommendation.mjs` / `design-contract` / `supersession`） | P0 |
| FR-ALLN-121 | 反证不空转（两段证伪） | P0 |
| FR-ALLN-123 | `knownGap` 一致性机核 | P0 |
| FR-ALLN-125 | 新门禁纳入 `gate-integrity` 受审集合 | P0 |
| FR-ALLN-130 / 133 | 体积五要素（本叶增量）+ 红线逐字节复核（content / pick-layer / 判定链 / v3 台账） | P0 |

> **口径注 ①（validate R1 I-02 追加；只加注，不改实现）**：`data-op` = **对外词汇锚**（chip 渲染写出 + 门禁采集 + `#stream [data-op]` 选择器锚）；进程内分发以内存 `act → ACT_TO_OP` **桥接**取 opId（`dispatch.ts#dispatchChipAction`）。FR-ALLN-057「分发只读 `data-op`」按此口径成立——判据是 **`data-act` 零回读**：分发路径中 `getAttribute('data-act')` 必须 0 次（`test/next-dispatch-diff0.test.ts` D0-6 + `test/next-pipeline.test.ts` NP-8 双证，validate V3 注入反证复跑）。「chip 绑 `data-op`」为渲染侧字面事实（`cards/nextstep.ts:64`，由 `ACT_TO_OP` 派生）。

---

## 5. 非功能需求（本叶相关）

| 父 NFR | 本叶关注点 | 验收锚点 |
|---|---|---|
| NFR-ALLN-004 | **单源 + 机核**：注册表 / 义务表 / 阻塞态枚举 / act→opId 映射表各自**恰一处**声明，门禁从源文本抽取机核 | 「声明恰一次」扫描 + 反证 |
| NFR-ALLN-007 | 每条新 / 改判据**可 FAIL** 并声明 `expectFailPattern` | 反证留证（父 §16 第 6 条） |
| NFR-ALLN-010 | 注册可逆（幂等 disposer）；失败语义三级齐备（含快照 / 回滚语义位） | 往返读数 + 幂等断言 + 三级反证 |
| NFR-ALLN-012 | **可演进性**：新增 provider 演练（分发器文件哈希不变） | `diff = 0` 判据 |
| NFR-ALLN-005 | `sidepanel.js` ≤ 生效上限；本叶 byte 变化走五要素重登记 | `test:size-budget` / `size-growth-evidence` |
| NFR-ALLN-001 | 注册表求值（纯谓词）不得使首屏 / 滚动变差 | `journey` 相关断言 |
| NFR-ALLN-006 | 兼容读取面（`#input` / `#send` / `#rebind` / `#authorize` 等）不破 | 兼容面逐 id 断言 |

---

## 6. 边界情况（本叶相关）

父 `EC-ALLN-001~021` 全部适用；本叶执行时**重点验**：

| 父 EC | 本叶执行要点 |
|---|---|
| EC-ALLN-001 | 重复 provider id → **拒绝 + loud 红显**（绝不静默覆盖） |
| EC-ALLN-002 | 未知 `deps` → 注册 loud 失败；不进活跃集 |
| EC-ALLN-003 | 非法 `mode`（∉ 模式集合）→ loud 失败 |
| EC-ALLN-004 | chips 悬空 → 注册失败 + 义务表机核同时捕获 |
| EC-ALLN-005 | chip execute 抛错 → **单卡边界捕获** + 恢复 next（机制侧；具体 op 在 `v5-2`） |
| EC-ALLN-017 | `pending` 门控下的本地 op 不受门控、零 `requestTurn` |
| EC-ALLN-018 | 取代台账 `knownGap` 一致性 |
| EC-ALLN-020 | 卸载后再注册（幂等往返；同一 id 顺序一致） |

---

## 7. 验收锚点（本叶 → 父 AC）

| 父 AC | 本叶判定要点 |
|---|---|
| **AC-ALLN-004** | 契约 v2 七点逐条（R1~R7）+ 逐点注入反证 |
| **AC-ALLN-005** | 义务表一致（行数 / opId 集 / 四要素 / 无悬空）+ 分发器零 per-op 分支 + 四操作哈希不变 |
| **AC-ALLN-009** | act→opId 6 条映射等价成立 + chip `data-op` + 分发器 diff = 0 |
| **AC-ALLN-016** | F 四项常量逐字不变 + G 四项新增 + 门禁实跑 F 60/60 + G 127/127 |
| **AC-ALLN-017** | `designContractChanges` 从空数组 → 含 G 条目（五要素） |
| AC-ALLN-002 | 死端守护的**机制基础**（阻塞态枚举单源 + 候选可达性）在本叶成立（守护门禁本体在 `v5-3`） |
| AC-ALLN-019 | 本叶主责门禁等价重锚清单逐项（`recommendation-sources` / `local-act-wiring` / `authorize-chip-wiring` / `recommendation.mjs` / `design-contract` / `supersession`） |
| AC-ALLN-021 | 反证不空转（本叶每条新 / 改判据两段证据） |
| AC-ALLN-022 | 红线逐字节（content / pick-layer / 判定链 / v3 台账） |
| **AC-ALLN-025** | **本叶收尾全门禁绿 + 计数只增基线**（含 `design-contract` / `supersession` 的共享面登记恰一次） |

---

## 8. 交付与执行

### 8.1 上游依赖

无前置叶。上游只读复用：`cards/nextstep.ts`（chip 渲染）/ `recommend.ts`（候选规则，将被注册表取代）/ `sidepanel.ts#handleCardAction`（分发器，将被瘦身）/ `test/design-contract.test.ts`（F 契约机制）/ `docs/v4-supersession-ledger.json`（台账）。

### 8.2 下游consumer

| 叶 | 依赖点 |
|---|---|
| `specs-tree-v5-2-ops-first-batch` | `NextProvider` / `NextOp` 接口 + 注册表 API + 管线四态 + 义务表机核 + chip `data-op`（9 op 逐个注册） |
| `specs-tree-v5-3-chrome-face` | 授权 chip 黄点击产 next（经 `op.authorize` 候选）+ 管理详情入口（`op.revoke` / `op.rebind`） |

### 8.3 交付物（本叶）

1. `NextProvider` / `NextOp` 定义 + 注册表 + 单次查表分发器（TS）。
2. 契约 v2 七点实现 + 逐点机核测试。
3. 统一管线四态机制 + 「管线唯一」判据。
4. `act → opId` 映射表（唯一权威）+ chip `data-op` 渲染 + 分发器瘦身。
5. 证明义务表（9 行 + 表尾明示义务）+ 义务表一致性机核。
6. `test/design-contract.test.ts` 扩展（F 60 保留 + G 127 新增 + 127 行映射）+ 台账 `designContractChanges` 条目。
7. 阻塞态枚举单源 + `site.unauthorized` 常驻候选（机制侧）。
8. 本叶范围的门禁等价重锚 + 反证留证。

### 8.4 叶内执行序（供 plan / tasks 参考，**不是需求**）

① 先定 **Definition**（接口形状 / 常量 / `SERVICES` / `MODES`）→ ② 再 **Provider**（注册表 + 依赖解析 + 优先级 + loud 校验）→ ③ 再 **Consumer**（单次查表分发器，**先证明 diff = 0**）→ ④ 再 **管线四态机制**（`params` / `consent` 缺省语义）→ ⑤ 再做 **act→opId 取代**（映射表 + chip `data-op` + 门禁等价重锚，**与实现同轮**）→ ⑥ 再做 **义务表 + 一致性机核**→ ⑦ 最后做 **双契约**（F 保留 + G 新增 + 台账登记）+ 体积五要素 + 收尾全门禁。

---

## 9. 风险（本叶）

| # | 风险 | 等级 | 应对 |
|---|---|:--:|---|
| R-ALLN-004 | 注册表取代既有推荐器（4 规则 + 闭集 + switch + 4 门禁）——迁移量最大 | 高 | 等价重锚 + 逐条对账（FR-ALLN-112 / 120） |
| R-ALLN-005 | design-contract 契约真空 | 高 | FR-ALLN-101 / 102；AC-ALLN-016 / 017 |
| R-ALLN-010 | 保护段可能需第三次取代（若分发器 / 推荐面改动波及 journey 保护段） | 中高 | FR-ALLN-122（保段优先；取代须八步） |
| R-ALLN-901 | 注册表 ↔ 义务表漂移 | 中高 | FR-ALLN-037 三类注入反证 |
| R-ALLN-902 | `deps` 定序被列表位置绕过 | 中 | 列表位置置换测试 |
| R-ALLN-903 | 分发模式被混用 | 中 | 越集 / 混用反证 |
| R-ALLN-905 | `op.turn` 与本地 op 的 `requestTurn` 边界被侵蚀 | 中 | 零 `requestTurn` 机核（FR-ALLN-059） |
| R-ALLN-909 | 双契约断言 id 混池 | 中 | F / G 两侧各自独立计数（FR-ALLN-101） |
| R-ALLN-001 | 体积越限（余量 24,926 B） | 高 | FR-ALLN-130 / 134（本叶增量登记 + 预算评估） |

---

## 10. 开放问题（本叶相关）

父 §8 的 O-ALLN-001~012 **全部已裁决**；本叶直接相关：**O-ALLN-002**（注册表形态 = 纯 TS + 义务表静态机核，DC-ALLN-002）、**O-ALLN-008**（act→opId 等价映射，DC-ALLN-008）、**O-ALLN-011**（双稿双 shim，DC-ALLN-011）。**无遗留未决项**。

---

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建（V5-1 叶子规范：契约 v2 注册表 + op 管线 + act→opId + 瘦分发 + 双契约 + 证明义务机核；承载父 §5.4 / §5.6 / §5.10 / X3·X4·X6(chip 侧) / §13 / §9.1~9.3 共 33 条 FR 的实施切片；首叶 / P0 / 依赖链起点） | 2026-09-22 | SDDU Spec Agent |
| v1.1 | validate R1 I-02 订正：FR-ALLN-057 追加**口径注 ①**（`data-op` = 对外词汇锚 + 进程内 `act→ACT_TO_OP` 桥接；判据 = `data-act` 零回读）。**只加注、零实现改动、零需求变更**。 | 2026-09-22 | SDDU Validate Agent |
