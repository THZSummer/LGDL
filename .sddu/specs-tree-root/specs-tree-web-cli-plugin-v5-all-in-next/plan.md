# 技术计划：specs-tree-web-cli-plugin-v5-all-in-next（web-cli-plugin v5「All-in-Next 聊天即操作台」；父 Feature 统领性技术方案）

> **文档定位**: SDDU 技术方案（**父 / 跨切契约与索引**）—— 记录跨切架构、总体方案取舍、聚合文件影响、红线继承、实施波次，以及 **12 条 ADR 的索引**（正文见本目录 `ADR-V5-001~012-*.md`），作为 3 叶实施、审查与收口的单一参照
> **前置依赖**: 本目录 `spec.md` v1.0（80 FR / 12 NFR / 21 EC / 25 AC / 20 NG / 8 US / 8 G / DC-ALLN-001~012 全裁决；§12 X1~X6 等价重写映射；§13 N1~N25 红线；§14 3 叶拆分）+ `discovery.md` v1.0（Q-ALLN-001~014 / A-ALLN-001~010 / R-ALLN-001~016 / O-ALLN-001~012 全裁决；§7.1 现状基线 A~H 全量 `file:line`）+ 3 叶 `spec.md` v1.0 + 设计基准 `option-g-all-in-next.html`（`a7c0a77a…` / 273,621 B）+ `option-g-shim.mjs`（`d0107ecb…` / 127 断言，**只读零触碰**）
> **创建人**: SDDU Plan Agent
> **创建时间**: 2026-09-22
> **版本**: v1.0
> **更新人**: SDDU Plan Agent
> **更新时间**: 2026-09-22
> **更新说明**: 初始创建（父 `plan.md` + 3 叶 `plan.md` + **ADR-V5-001~012 正文**同批产出：注册表 / op 管线 / SW 执行器 / `optional_permissions` 最小集 / settings 收编 / 授权 chip / 宽度与密度 / 双契约 / 死端守护 / 法八四面 / 体积预算 / 波次与保护段。**本任务只做 plan**：不写 tasks、不写代码、不改 `src/**`·`test/**`·`dist/**`·`docs/**`·`design/**`·ROADMAP，不改 v1~v4.5 SDDU 目录，不动 `main`，**不跑门禁 / 构建 / Chromium**，**未调用任何受管 Provider**（routing.v1 = `local_or_compute → none`）。

---

## 1. 前置检查

| 检查项 | 状态 | 证据 |
|--------|:--:|------|
| 父 `spec.md` 存在 | ✅ | 本目录 `spec.md`（757 行，v1.0，2026-09-22，phase=specified） |
| 3 叶 `spec.md` 存在 | ✅ | `specs-tree-v5-1-next-registry-pipeline/spec.md`（246 行）/ `specs-tree-v5-2-ops-first-batch/spec.md`（250 行）/ `specs-tree-v5-3-chrome-face/spec.md`（248 行），均 v1.0 |
| 叶数量与结构 | ✅ | 3 叶（`leaf:true` / `depth:2` / `deliveryOrder` 1..3 / `dependsOn` 链式）；父 `depth=1` 轻量规范容器 |
| 外部 API 文档缓存 | ✅ N/A | 零外部 API / 零新依赖 / 零新权限（ADR-V5-004：`manifest.json` **零 diff**）；无 `/sddu:api-docs` 需求 |
| 参数化模板 | ✅ | `.opencode/plugins/sddu/templates/output/sddu-plan.md.hbs`（79 行；无用户级覆盖 `.sddu/templates/agents/output/sddu-plan.md.hbs`） |
| 上游先例 | ✅ | v4.5 `plan.md`（父 + 唯一叶 + ADR-V45-001~012）；v4 `plan.md`（ADR-V4-001/008/009/010/011）—— 本 Feature 沿用「ADR 正文独立成文件」的落法（agent 模板 §5.7：ADR 与 `plan.md` 同级） |
| 分支 / HEAD / 工作区 | ✅ | `feature/web-cli-plugin` / `ea47ffd` / `git status --short` 空 |
| 保护 pin（本轮实测） | ✅ | journey `43054..58287` / `cc79f413…` / 240 行（3 链节）；binding `107780..115930` / `be9ad0e9…`（`decision = keep`） |
| 写入范围 | ✅ | 仅本 Feature SDDU 目录（父 + 3 叶 `plan.md` / 12 ADR / `state.json` / `TREE.md`）；**未跑任何门禁 / 构建 / Chromium** |

### 1.1 偏差登记（父 `plan.md` 的产出 vs 父 spec 的「轻量规范容器」定位）

父 `spec.md` §14.1 明定父 Feature = 轻量规范容器（不承接 build/review/validate，不产出 `tasks.json`）。本阶段按编排器任务书产出**父 + 3 叶两份层级的 `plan.md`**，与 v4 / v4.5 先例（ADR-V4-001 / v4.5 §1.1）同口径**显式登记**：

| 项 | 内容 |
|---|---|
| 偏差 | 父产出 `plan.md`（spec §14.1 未列出父 `plan.md`） |
| 理由 | 跨切契约（红线继承 N1~N25 / 不动面 / 台账与体积策略 / 波次 / 门禁集合 / ADR 编号）需要**单点定义**，否则 3 叶与收口各持一套口径 |
| 容器内核仍遵守 | 父**不产出** `tasks.md` / `tasks.json`；父**不承接** build/review/validate；实施全部由 3 叶承载；父 `state.json` 的 `depth=1` / `childrens` 结构不变 |
| 引用方式 | 叶对父的引用 = 「父 FR/AC + ADR-V5-0xx 编号」，不依赖父 `plan.md` 的物理存在性 ⇒ 本文件可整篇作废而不牵连叶 |
| 不消耗 ADR 编号 | `ADR-V5-001~012` 已由编排器任务书逐项指派；本偏差不另占编号 |

---

## 2. 架构分析

### 2.1 问题定性（题眼）

v4 把「一切交互皆消息」做成了行为，v4.5 把流做成了纯时间序，但**「下一步」仍不保证**：真机 23:12:59 的 ✖ 行之后**流内零可达 next**（死端）。v5 的题眼 = **把「下一步」从「各 provider 自愿提供」升级为「管线强制保证」**；而这条保证之所以能长期成立，靠的不是多加分支，而是把操作收进**可逆注册的插件注册表**（新增操作 = 注册插件，主流程 diff = 0）。

两条结构事实（本轮只读复核，discovery §7.1）：

1. **操作散落**：新增一种操作要改 ≥4 处（4 条手写规则 `recommend.ts:52` + 6 项 act 闭集 `:194` 被两门禁逐字钉死 + 16 分支 `handleCardAction` `sidepanel.ts:184-277` + 门禁），chip 绑动作字符串而非 opId（`cards/nextstep.ts:59`）。
2. **授权态三处投影、零处常显可点**：工具栏摘要（`view-model.ts:824,900`）+ 风险 rail（`l0/risk-rail.ts:29-40`）+ 首装推荐卡（`recommend.ts:296-307`，含 `firstRun`）。

### 2.2 目标架构（跨切）

```
src/ui/sidepanel/
├── next-registry/                     ← 【新】Definition / Provider / Consumer / Ops / 义务表
│   ├── definition.ts                  NextProvider / NextOp / NEXT_SERVICES / MOUNT_MODE / BLOCKED_TERMINALS
│   ├── registry.ts                    validateNextProvider / topoByDeps / resolveOrder / register·unregister·overwrite
│   ├── pipeline.ts                    runOp（params→consent→execute→receipt）/ pendingOps 队列 / snapshot·rollback
│   ├── providers.ts                   4 内置 provider（旧 recommend 4 规则的等价迁移）
│   ├── ops.ts                         9 op 执行体（panel-local 7 / 特权 2 经 SW）
│   ├── obligation-table.ts            9 行四要素 + 表尾明示契约义务
│   └── dispatch.ts                    ACT_TO_OP（6 行）+ dispatchChipAction（一次查表，零 per-op 分支）
├── recommend.ts                       ← 【改】常量保留（阈值/上限/间隔）+ 规则迁移为内置 provider
├── sidepanel.ts                       ← 【改】handleCardAction 集 B 收敛为 1 次查表；submitSecret；dispatchOp 接线；data-narrow
├── cards/{nextstep,askuser,error}.ts  ← 【改】data-op / secret·form 扩形 / error 出生带恢复区
├── statusbar.ts                       ← 【改】仍是状态栏唯一写入者（增写 #auth-state）
├── view-model.ts                      ← 【改】toolbarDigest / band.statusText 去授权态；管理详情 view
├── l0/risk-rail.ts                    ← 【改】RAIL_RISK_CLASSES(4) + AUTH_STATES 拆分
└── index.html                         ← 【改】#auth-state 净新增（状态栏内，#risk-chips 之前）

src/shared/op-table.ts                 ← 【新】9 行 op 描述符（纯数据，零 chrome）—— 双侧同源唯一来源
src/background/op-protocol.ts          ← 【新】op-* 运行时校验（type-only 家系）
src/background/op-executors.ts         ← 【新】SW 执行器（由 op-table 派生，同源）
src/background/{messaging,service-worker}.ts ← 【改】union type-only 3 项 + case 'op-exec' + 闸门
src/ui/settings/{ops,panel}.ts         ← 【改】4 类收编为 op 单一执行体（其余零改）
```

**四条结构性不变量**（本 Feature 的验收骨架，ADR 逐条落地）：

| # | 不变量 | 判据 | 承载 ADR |
|:-:|---|---|---|
| I1 | **操作即注册** | `handleCardAction` 集 B 分支数 == 0；注册 / 卸载 / 覆盖 / 重复 id 四操作下分发器哈希不变 | ADR-V5-001 |
| I2 | **无死端** | 5 类阻塞逐类 `nextOf(el) !== null`；死端 == 0；双向注入可 FAIL | ADR-V5-009 |
| I3 | **值不入流** | 哨兵在流 `payload` / digest / 审计 / DOM 全属性**四面零命中**；值直达 key-store 恰 1 调用点 | ADR-V5-010 |
| I4 | **状态唯一家** | 四词在工具栏区 / 状态栏第一行 / rail 零出现；`#auth-state` 常显两态；默认可点 6 ≤ 7 | ADR-V5-006 |

### 2.3 数据流与依赖（跨切）

| 面 | 变更方向 | 关键契约 |
|---|---|---|
| 候选 | 4 条手写规则 → **注册表 provider 的 `when(ctx)` 纯谓词** | `NextCtx` 字段集 == 旧 7 源白名单（等价重锚） |
| chip | `data-act`（动作字符串）→ **`data-op`**（opId）；`data-act` 降渲染别名 | `ACT_TO_OP` 6 行唯一权威；分发只读 `data-op` |
| 分发 | 16 分支 switch → **集 A 卡协议（保留 8）+ 集 B next-chip（1 次查表）** | per-op 分支 == 0（N22） |
| 执行 | 各自为政 → **统一管线四态**；特权 op 经 SW 执行器 | `op.execute(` 恰 1 调用点；特权 op 恰 2 |
| 授权登记 | 面板自行 `send('authorize')` → **SW 执行器裁决 + 页面手势** 两段握手 | SW 内 `.request(` 零命中（保留）；授权裁决 owner = SW |
| 值 | 无流内入口 → **掩码卡 → key-store 直达** | 值不经 `reduce` / `payload` / `digest` |
| 授权态 | 三处投影 → **状态栏常显 chip 唯一载体** | 零双写五条 + 四词扫描 |
| 宽度 | 设计稿三档 → 设计稿连续拖动（契约）；**产品侧 `data-narrow` + 密度口径解耦** | 阈值 / 31 格 / 高度比逐字逐格不动 |
| 设计契约 | 只冻 F → **F 冻结 + G 新增（各冻各的）** | F 4 常量逐字；G 127/127 |
| 体积 | 余量 24,926 B → **预算表 + 分级预案** | 五要素重登记；cap 保持 `record-only` |

### 2.4 红线继承表（**N1~N25 逐条**）

| # | 红线（逐字要点） | 继承动作 | 承载 ADR | 验收锚点 |
|:-:|---|---|---|---|
| N1 | `dist/content.js` 177,076 B / sha `52a82620…`（零容差） | **不动**（`op-*` type-only） | V5-003 | AC-ALLN-022 |
| N2 | `dist/pick-layer.js` 33,900 B / sha `5f567d7e…`（零容差） | **不动** | V5-003 | AC-ALLN-022 |
| N3 | `sidepanel.js ≤ 523,447 B` = `floor(498,521×1.05)`；容差 5% 未动；cap `record-only` | **预算前移**（ADR-V5-011） | V5-011 | AC-ALLN-023 |
| N4 | V3-VOL-3 三值（档位 512,000 / 绝对上限 563,200 / `newBaselineBytes` 同源前移）；`authorConfirmation` 不得伪称已确认 | **保持**（越限走分级预案） | V5-011 | AC-ALLN-023 |
| N5 | 密度阈值 `7/15 · 9/20 · 17/35` 逐字；豁免只认 `hidden`；防滥用不动 | **逐字不动** | V5-007 | AC-ALLN-014 |
| N6 | `STREAM_HEIGHT_RATIO_MIN = 0.65`（只允许上调） | **只上调** | V5-006 / 007 | AC-ALLN-013 |
| N7 | 风险位永不折叠（`#region-statusbar` 本体 / `#risk-chips`）；J1~J4 | **逐字保留**（`#auth-state` 为兄弟节点） | V5-006 | AC-ALLN-015 |
| N8 | 安装期静态权限零变化（静态 5 / host 6 / 无 `<all_urls>` / 无静态 `content_scripts` / `minimum_chrome_version 116`） | **逐字不动**（ADR-V5-004：连可选集合也零变） | V5-004 | AC-ALLN-012 邻域 / 022 |
| N9 | 判定链零触碰（`policy.ts` / `auto-authorize.ts` 内容哈希 pin） | **不动** | — | AC-ALLN-022 |
| N10 | `src/ui/options/index.html` 在 v3 `zeroDiffFiles` 内；v3 台账为冻结历史不得解冻 | **不动** | V5-005 | AC-ALLN-022 |
| N11 | 断言零删除零降级、计数只增（唯一例外 = 保护段显式取代） | **逐字遵守** | V5-012 | AC-ALLN-019 / 020 |
| N12 | 保护 pin（journey `cc79f413…` / 240 行；binding `be9ad0e9…` keep） | **journey 保段优先 / 必要时八步；binding 保段（字节中立避让）** | V5-012 | AC-ALLN-018 |
| N13 | 门禁严格串行（一次一个 Chromium，`finally` 自清 profile） | **逐字遵守** | V5-012 | AC-ALLN-020 / 024 |
| N14 | 不碰 `main` / 不 force push / path-limited `git add` / 不改 `.opencode/opencode.json` / 不改 `packages/web-cli-base/**` / 无新依赖 / 不合 main 不发布 | **逐字遵守** | V5-012 | §16 纪律 |
| N15 | `knownGap` 一致性（`status=complete-steps-1-8` ⇒ 空或仅声明闭环） | **逐字遵守** | V5-012 | AC-ALLN-018 |
| N16 | `F-29`（A2A）区段一字不动 | **不动** | — | §16 |
| N17 | 零新增流内固定宿主（`REGISTERED_STRUCTURAL_HOSTS = []`；任意深度零 `[data-host]`） | **chip / 分隔条均在流外** | V5-006 / 007 | AC-ALLN-015 邻域 |
| N18 | `KL-N-10` 处置纪律（隔离复跑 ≥2、日志全量、仍红如实登记不阻塞收口） | **逐字遵守** | V5-012 | AC-ALLN-024 |
| N19 | 12 kind 契约不动（7 主类 + 5 过程卡）；回执复用固化区 + 系统行 | **不加 kind**（`askuser` 扩形 / `error` 铸造扩展） | V5-002 | AC-ALLN-003 / 007 |
| N20 | 设计稿定稿冻结；`design/**` 改动须五件套 | **G 稿零改动** | V5-008 | AC-ALLN-016 |
| N21 | `design-contract` 只冻 F（60），不得静默替换 | **F 逐字保留 + G 并列新增** | V5-008 | AC-ALLN-016 |
| **N22** | `handleCardAction` 零 per-op 分支（diff = 0） | **集 B 收敛为 1 次查表** | V5-001 | AC-ALLN-005 |
| **N23** | `#auth-state` 为授权态全 UI 唯一常显载体（四词工具栏零出现；rail 授权类零残留） | **零双写五条** | V5-006 | AC-ALLN-012 |
| **N24** | 流内零明文四面（payload / digest / 审计 / DOM value 与全部属性） | **哨兵四面对抗扫描** | V5-010 | AC-ALLN-003 |
| **N25** | `op.turn` 是唯一经 `requestTurn` 的 op；其余 op 零 `requestTurn` | **逐 op 布线门禁机核** | V5-001 / 005 | AC-ALLN-009 |

### 2.5 明确「不动面」清单（**逐项**）

| # | 不动面 | 守线方式 |
|:-:|---|---|
| T1 | `src/content/**` / `dist/content.js` / `dist/pick-layer.js` | 零改动（`git diff` 零行）；ADR-V5-003 的 `op-*` 走 type-only |
| T2 | `KIND_SET` 集合字面量（`messaging.ts:103-141`） | 逐字零新增；union 类型扩成员（运行时零字节） |
| T3 | 判定链（`policy.ts` / `auto-authorize.ts`） | 内容哈希 pin 不动 |
| T4 | `manifest.json` | **零 diff**（ADR-V5-004） |
| T5 | `docs/v3-supersession-ledger.json` | 零 diff（冻结历史） |
| T6 | 12 kind 契约 / `BORN_FROZEN_KINDS` / 6 终态 / `MAX_OPEN_ASKS=2` / `ASK_CANCEL_REASONS` | 逐字不动（扩形不新增 kind） |
| T7 | 三区法则（工具栏 ≤5 可点 / 流 = 唯一交互面 / 状态栏永不折叠） | 逐字不动 |
| T8 | `F-29` ROADMAP 区段 / `ROADMAP.md` 全文件 | 零 diff（F-32 / v0.10.0 登记留收口） |
| T9 | `packages/web-cli-base/**` | 零改动 |
| T10 | `design/**`（F 双 + G 双 sha） | 零改动（若改须五件套） |

---

## 3. 方案对比

> 12 条 ADR 各自的「选项 / 裁决 / 后果」见 `ADR-V5-001~012-*.md`。此处只做**总体方案**的取舍对比。

| 维度 | **方案 A：注册表取代 + 管线唯一 + 产品侧诚实收口**（推荐） | 方案 B：新增一层，旧路径并存 | 方案 C：声明式 JSON 插件 + 全量收编 |
|---|---|---|---|
| 描述 | 契约 v2 纯 TS 注册表**取代**旧 4 规则 / 6 act / 16 分支；op 管线四态唯一；G 稿入 design-contract；产品侧 `data-narrow` + 密度解耦 | 注册表与旧规则并存，新 op 走新层 | provider 用 JSON 声明 + 会话 / 分组 / 诊断一并收编 |
| 优点 | `handleCardAction` per-op diff = 0 **可机核**；死端守护有机制基础；零新加载面；体积可控（预算 17,600 B） | 单轮改动最小 | 「不改代码」最彻底；范围最大 |
| 缺点 | 需 4 门禁等价重锚 + 保护段策略 | act 双词汇长期并存 ⇒ N22 不成立、死端机制基础仍在旧路径 | **新加载面 / 新真值源**（违 NG-ALLN-015）；义务表无法静态机核；体积与门禁面失控 |
| 风险 | R-ALLN-004（迁移量最大）/ R-ALLN-001（体积）/ R-ALLN-010（保护段） | R-ALLN-004 降级但**机制目标落空** | R-ALLN-001 失控；范围外扩（违 O-001 裁决） |
| 工作量 | ~19 波 / ~76 任务（3 叶串行） | ~8 波 / ~30 任务，但**不达标** | ~30+ 波，**越界** |

## 4. 推荐方案

**推荐：方案 A**。

**理由**：
1. **唯一能机核「扩张性」的形态**：只有「取代」才能让 `handleCardAction` per-op diff = 0 成为静态事实（N22 / AC-ALLN-005）；并存方案下该义务不可证。
2. **死端守护需要机制基础**：阻塞态枚举单源 + 候选可达性由注册表提供（ADR-V5-001），守护门禁（ADR-V5-009）才可能「双向变红」。
3. **风险可控且已量化**：体积 24,926 B 余量 vs Σ 预算 17,600 B（ADR-V5-011）；权限面**零改动**（ADR-V5-004）；`content.js` 红线由 type-only 保证（ADR-V5-003）。
4. **与设计稿关系诚实**：G 稿 280–640 拖动是**设计契约**，产品侧承接 `data-narrow` + 密度解耦（ADR-V5-007），设计-实现一致由 design-contract 门禁机器保证（ADR-V5-008）。

---

## 5. 聚合文件影响分析

> 操作含义：**NEW** 新增 / **MODIFY** 修改 / **DELETE** 删除 / **NOOP** 显式零改动（登记）。共 **≈69 项**（src 14 / test 26 / docs+config 4 / SDDU 25）。

### 5.1 `src/**`（14 项）

| 操作 | 文件路径 | 说明 | 叶 |
|:--:|---|---|:--:|
| NEW | `packages/web-cli-plugin/src/ui/sidepanel/next-registry/definition.ts` | 接口 / 常量 / `SERVICES` / `MODES` / `MOUNT_MODE` / `BLOCKED_TERMINALS` | v5-1 |
| NEW | `.../next-registry/registry.ts` | `validate` / `topoByDeps` / `resolveOrder` / `register`·`unregister`·`overwrite` | v5-1 |
| NEW | `.../next-registry/pipeline.ts` | `runOp` 四态 / `pendingOps` 队列 / 快照·回滚 | v5-1 |
| NEW | `.../next-registry/dispatch.ts` | `ACT_TO_OP`(6) + `dispatchChipAction`（一次查表） | v5-1 |
| NEW | `.../next-registry/providers.ts` | 4 内置 provider（旧规则等价迁移） | v5-1 |
| NEW | `.../next-registry/ops.ts` | 9 op 执行体（五要素） | v5-2 |
| NEW | `.../next-registry/obligation-table.ts` | 9 行四要素 + 表尾明示义务 | v5-1 |
| NEW | `src/shared/op-table.ts` | 9 行 op 描述符（纯数据；双侧同源） | v5-2 |
| NEW | `src/background/op-protocol.ts` | `isOpMessage`（type-only 校验） | v5-2 |
| NEW | `src/background/op-executors.ts` | SW 执行器镜像（由 op-table 派生） | v5-2 |
| MODIFY | `src/ui/sidepanel/recommend.ts` | 常量保留 + 规则迁移为内置 provider（导出面等价重锚） | v5-1 |
| MODIFY | `src/ui/sidepanel/sidepanel.ts` | `handleCardAction` 集 B 收敛；`submitSecret`；`dispatchOp` 接线；`data-narrow` | v5-1/v5-2/v5-3 |
| MODIFY | `src/ui/sidepanel/cards/{nextstep,askuser,error}.ts` | `data-op`；`secret`/`form`；`error` 出生恢复区 | v5-1/v5-2/v5-3 |
| MODIFY | `src/ui/sidepanel/stream-model.ts` | `askKind` 扩值 + payload 扩字段（`recovery` / `formOptions` …） | v5-2/v5-3 |
| MODIFY | `src/ui/sidepanel/statusbar.ts` | 增写 `#auth-state`（仍是唯一写入者） | v5-3 |
| MODIFY | `src/ui/sidepanel/view-model.ts` | `toolbarDigest` / `band.statusText` 去授权态 + 管理详情 view | v5-3 |
| MODIFY | `src/ui/sidepanel/l0/risk-rail.ts` | `RAIL_RISK_CLASSES`(4) + `AUTH_STATES` 拆分 | v5-3 |
| MODIFY | `src/ui/sidepanel/index.html` | `#auth-state` 净新增 + 管理详情 DOM | v5-3 |
| MODIFY | `src/background/messaging.ts` | union **type-only** 扩 3 项（`KIND_SET` 不动） | v5-2 |
| MODIFY | `src/background/service-worker.ts` | `case 'op-exec'` + 闸门 + SW 执行器接线 | v5-2 |
| MODIFY | `src/ui/settings/ops.ts` | 4 类委派 op 执行体（其余 13 项零改） | v5-2 |
| MODIFY | `src/ui/settings/panel.ts` | 4 类按钮 → `dispatchOp`；`form` 选项源 = `OPTIONAL_CAPABILITIES` | v5-2 |
| **NOOP** | `manifest.json` | **零 diff**（ADR-V5-004 显式登记） | v5-2 |

### 5.2 `test/**`（26 项）

| 操作 | 文件路径 | 说明 | 叶 |
|:--:|---|---|:--:|
| NEW | `test/next-registry.test.ts` | R1~R7 逐点 + 往返读数 + deps 置换 + overwrite + loud | v5-1 |
| NEW | `test/next-obligation-table.test.ts` | 注册表 ↔ 义务表（行数 / opId 集 / 四要素 / 无悬空） | v5-1 |
| NEW | `test/next-dispatch-diff0.test.ts` | 分发器零 per-op 分支 + 四操作哈希不变 | v5-1 |
| NEW | `test/op-wiring.test.ts` | 逐 op 单一调用点 + 无 `requestTurn`（除 `op.turn`）+ ≥3 反证 | v5-2 |
| NEW | `test/sw-op-mirror.test.ts` | SW 镜像 `{id,mode,fail,audit}` 同源 + 漂移反证 | v5-2 |
| NEW | `test/op-protocol.test.ts` | type-only / `KIND_SET` 零新增 / `content.js` 逐字节 | v5-2 |
| NEW | `test/ui/no-dead-end.mjs` | 死端守护（5 类 + N=0 + 死端=0 + 双向反证） | v5-3 |
| NEW | `test/ui/law8-plaintext.mjs` | 法八四面零明文 + 全属性扫描 + 哨兵对抗 | v5-3 |
| MODIFY | `test/design-contract.test.ts` | **F 逐字保留** + G 常量 / 127 映射 / 实跑 / 混池防御（6 → ≥13） | v5-1 |
| MODIFY | `test/recommendation-sources.test.ts` | 闭集 → opId 集；源白名单 7 项语义保留 | v5-1 |
| MODIFY | `test/local-act-wiring.test.ts` | 本地 act 槽 → 本地 op 槽；零 `requestTurn` | v5-1 |
| MODIFY | `test/authorize-chip-wiring.test.ts` | 特权 op 等价重锚（SW 零 `.request(` 保留） | v5-2 |
| MODIFY | `test/capability-wiring.test.ts` | 可选集合显式名单 + 「新增项在册」分支 | v5-2 |
| MODIFY | `test/binding-wiring.test.ts` / `test/auto-session-wiring.test.ts` | 判据句式等价改写（计数不减） | v5-2 |
| MODIFY | `test/density-thresholds.test.ts` | 阈值逐字 + 单源声明 + `data-narrow` 边界 | v5-3 |
| MODIFY | `test/host-registry.test.ts` | chip / 分隔条**不在流内**（零宿主反向判据） | v5-3 |
| MODIFY | `test/gate-integrity.test.ts` | 新门禁纳入受审集合（≥13 只增） | v5-1/v5-2/v5-3 |
| MODIFY | `test/content.test.ts` / `test/pick-layer-budget.test.ts` | X2 等价重锚（逐字节零增长） | v5-2 |
| MODIFY | `test/supersession-ledger.test.ts` | X1~X6 新条目 + `designContractChanges` + 保护段处置 | v5-1/v5-2/v5-3 |
| MODIFY | `test/ui/recommendation.mjs`（59） | opId 化等价重锚 + 增断言 | v5-1 |
| MODIFY | `test/ui/stream.mjs`（63） | `secret`/`form` + `error` 行内恢复（**增**） | v5-2/v5-3 |
| MODIFY | `test/ui/ask-auth-inflow.mjs`（61） | 扩形登录 + 拒绝非死端（**增**） | v5-2 |
| MODIFY | `test/ui/l0.mjs`（244） | 授权 chip 两态 + 零双写四词扫描 + J1~J4 | v5-3 |
| MODIFY | `test/ui/density.mjs`（232） | `#auth-state` 计数 + `data-narrow` + 逐格留痕 | v5-3 |
| MODIFY | `test/ui/journey.mjs`（171） | 320 锚点 + 360/361 边界；保护段保段或八步取代 | v5-3 |
| MODIFY | `test/ui/binding.mjs`（192） | **段内零改**；段外逐行登记 | v5-2 |
| MODIFY | `test/size-baseline.ts` | 五要素重登记（时间线只追加） | 各叶 |

### 5.3 `docs/**` 与配置（4 项）

| 操作 | 文件路径 | 说明 |
|:--:|---|---|
| MODIFY | `packages/web-cli-plugin/docs/v4-supersession-ledger.json` | `designContract.designContractChanges[]`（空 → G 条目）+ `modifiedRanges[]`（X1~X6 逐行）+ `redlineRemap[]`（若保护段取代）+ `protectedRanges[]`（保段或新 pin）+ `v3Vol3Closeout` 三值同源 |
| MODIFY | `packages/web-cli-plugin/docs/v4-density-baseline.json` | `tiers` 等价重锚 + `v5Ledger` 逐格留痕（31 格不删） |
| MODIFY | `packages/web-cli-plugin/package.json` | `test:v3` 串行链追加新门禁；新增 `test:dead-end` / `test:law8`（**串行**，不并发） |
| **NOOP** | `.sddu/specs-tree-root/ROADMAP.md` | 零 diff（F-32 / v0.10.0 登记留收口） |

### 5.4 SDDU 本 Feature 目录（25 项）

| 操作 | 文件路径 |
|:--:|---|
| NEW | `plan.md`（本文件） |
| NEW | `ADR-V5-001-next-provider-registry.md` ~ `ADR-V5-012-wave-plan-and-protection.md`（12 项） |
| NEW | `specs-tree-v5-1-next-registry-pipeline/plan.md` |
| NEW | `specs-tree-v5-2-ops-first-batch/plan.md` |
| NEW | `specs-tree-v5-3-chrome-face/plan.md` |
| MODIFY | `state.json`（父）+ 3 叶 `state.json`（phase → planned） |
| MODIFY | `TREE.md`（父 + 3 叶，由 `sddu-tree` 定向更新） |

---

## 6. 风险评估

### 6.1 继承风险（discovery R-ALLN-001~016 + spec R-ALLN-901~910）

| # | 风险 | 等级 | 缓解（⇒ 承载 ADR） |
|---|---|:--:|---|
| R-ALLN-001 | 体积越限（余量 24,926 B） | 高 | 预算前移 17,600 B + 分级预案 + 减体积优先级（V5-011） |
| R-ALLN-002 | `content.js` 红线通路 | 高 | `op-*` type-only；`KIND_SET` 零新增（V5-003） |
| R-ALLN-003 | 权限面判据精确集合 | 高 | 首批 0 项新增 + 显式名单判据（V5-004） |
| R-ALLN-004 | 注册表取代推荐器（迁移量最大） | 高 | 等价重锚逐条对账 + 两集模型（V5-001） |
| R-ALLN-005 | design-contract 契约真空 | 高 | 双契约 + G 127 入册（V5-008） |
| R-ALLN-006 | `error` 出生冻结 vs 行内恢复 | 中高 | 出生铸造（不 patch）（V5-002） |
| R-ALLN-007 | 状态栏 chip 归属与双写 | 中高 | 五条零双写 + 四词扫描（V5-006） |
| R-ALLN-008 | 法八实现层可核性 | 中高 | 四面 + 全属性 + 逐面反证（V5-010） |
| R-ALLN-009 | 密度口径变更连锁 | 中 | 口径解耦 + 320 锚点 + 逐格留痕（V5-007） |
| R-ALLN-010 | 保护段第三次取代 | 中高 | 保段优先 + 八步路径既定（V5-012） |
| R-ALLN-011 | 零宿主判据 | 中 | chip / 分隔条在流外（V5-006 / 007） |
| R-ALLN-012 | 双入口漂移 | 中高 | 4 类收编 + 逐 op 布线门禁（V5-005） |
| R-ALLN-013 | 断言只增的门禁规模 | 中 | 计数只增 + `gate-integrity` 受审（V5-012） |
| R-ALLN-014 | 弹窗 headless 不可合成 | 中 | 人工面如实登记（V5-009；EC-ALLN-007） |
| R-ALLN-015 | 串行门禁环境性 flake | 低 | 隔离复跑 ≥2 + 如实登记（V5-012） |
| R-ALLN-016 | 可选权限最小集论证缺位 | 中 | 最小集结论 = 现状集（V5-004） |
| R-ALLN-901 | 注册表 ↔ 义务表漂移 | 中高 | 三类注入反证（V5-001） |
| R-ALLN-902 | `deps` 定序被列表位置绕过 | 中 | 列表位置置换测试（V5-001） |
| R-ALLN-903 | 分发模式混用 | 中 | 越集 / 混用反证（V5-001） |
| R-ALLN-904 | 快照回滚只覆盖单表 | 中高 | `op.revoke` 三表整体回滚（V5-002 / 005） |
| R-ALLN-905 | `requestTurn` 边界被侵蚀 | 中 | 零 `requestTurn` 机核（V5-001 / 005） |
| R-ALLN-906 | 法八四面被缩窄回三面 | 中高 | 四面逐面断言（V5-010） |
| R-ALLN-907 | chip「状态」与流内「事实」混同 | 中 | 角色口径 + N23（V5-006） |
| R-ALLN-908 | `data-narrow` 与 clamp 边界不一致 | 低 | 360/361 双值断言（V5-007） |
| R-ALLN-909 | 双契约断言 id 混池 | 中 | 两侧独立计数 + 交集断言（V5-008） |
| R-ALLN-910 | 体积评估被跳过 | 中高 | 预算前移为纪律第 9 条（V5-011） |

### 6.2 plan 新增风险（R-V5-101~110）

| # | 风险 | 等级 | 缓解 |
|---|---|:--:|---|
| R-V5-101 | **两段握手引入新的半完成态**（`op.authorize` 的 ①~⑤ 步任一中途失败） | 中高 | SW 侧以「授权登记提交」为唯一 commit 点；未 commit 前失败 ⇒ 无状态变更 + 错误卡 + 恢复 next（V5-003 / V5-002） |
| R-V5-102 | **`pendingOps` 队列与既有 `MAX_OPEN_ASKS` 仲裁冲突**（`supersededAsk` 与队列 drained 顺序） | 中 | 队列 FIFO 且 drain 只在 `ask-resolved`；`REF_ROUND_PREFIX` 本地回合不入队；断言「同一 ask 不得二次 resolve」 |
| R-V5-103 | **`handleCardAction` 两集划分被实现者模糊化**（把 `audit` / `reanchor` 当 op 处理） | 中 | 集 A / 集 B 常量显式声明；判据：集 B 的 action 字符串在 `src` 中只出现于 `ACT_TO_OP` 数据模块 |
| R-V5-104 | **`op.help` 的候选列表硬编码**（违反「由 `when(ctx)` 派生」） | 中 | 判据：`op.help` 输出 == 当前 ctx 下 `when(ctx) === true` 的 provider 的 chips 并集；注入不符 ⇒ FAIL |
| R-V5-105 | **授权 chip 与风险 rail 的「授权态」双写回归**（实现时顺手保留 rail chip） | 中 | 四词扫描范围含 rail；rail 授权类零残留断言（V5-006） |
| R-V5-106 | **`data-narrow` 用 `matchMedia` 误判**（媒体查询看视口而非面板宽度） | 中 | 必须 `ResizeObserver` 观测 `#panel` 实际宽度；注入窄面板 + 宽视口 ⇒ 断言 `data-narrow === true` |
| R-V5-107 | **G 契约 127 行映射表逐条 clause/owner 填错 / 留空** | 中 | 门禁断言 clause/owner 非空 + id 集与 shim 实测逐条一致 + 覆盖 A~N 十四组 |
| R-V5-108 | **`options.html` 的 consent 载体差异被误读为「consent 被绕过」** | 中 | 显式登记「同执行体、不同 consent 载体」于 `knownGaps` 邻域；收口文档口径一致 |
| R-V5-109 | **`settings/ops.ts` 委派后 `options.html` 回执形态与面板侧不同构** | 中 | 回执同源构造（同 opId / 同 `maskedLength` 口径）；两入口格式同构断言 |
| R-V5-110 | **新门禁（死端 / 法八）未纳入 `gate-integrity` 受审集合** | 中 | 门禁受审集合显式追加；「新门禁未纳入」⇒ FAIL |

### 6.3 风险 Top5（按「阻塞程度 × 影响面」）

| 序 | 风险 | 为什么是 Top5 |
|:-:|---|---|
| 1 | **R-ALLN-004** 注册表取代推荐器 | 决定 v5 是「新增层」还是「重构层」；牵动 4 门禁 + 主流程 3 处；ADR-V5-001 的取代路径是**总开关** |
| 2 | **R-ALLN-001 + R-V5-101** 体积与握手半完成态 | 余量 24,926 B 偏紧（Σ 预算 17,600）；握手引入新失败面 |
| 3 | **R-ALLN-002 + R-ALLN-003** 消息族与权限面红线 | 两条零容差红线（`content.js` 零余量 / 静态安装面零漂移），判据必须**等价改写** |
| 4 | **R-ALLN-005 + R-ALLN-909** design-contract 真空与混池 | G 稿是本轮唯一权威基准，入册方式错（混池 / 替换 F）即 N21 破 |
| 5 | **R-ALLN-006 + R-ALLN-007** 两条契约冲突面 | `error` 出生冻结 vs 行内恢复；状态栏单写者 vs 授权态下移 —— 「看起来小、判据上大」 |

---

## 7. 生成的 ADR

### 7.1 ADR 索引（**ADR-V5-001~012，全部 ACCEPTED**；正文见同目录 `ADR-V5-0xx-*.md`）

| ADR | 标题 | 状态 | 一句话裁决 | 主责叶 |
|---|---|---|:--:|---|:--:|
| **ADR-V5-001** | NextProvider/NextOp 注册表与瘦分发（契约 v2 七点 + `recommend.ts` 取代路径） | ACCEPTED | 纯 TS 注册表**取代**旧 4 规则 / 6 act / 16 分支；`handleCardAction` 分「卡协议（8）/ next-chip（1 次查表）」两集，集 B per-op 分支 = 0 | v5-1 |
| **ADR-V5-002** | op 统一管线四态 + `askuser` 扩形 + 阻塞类 `error` 出生带恢复区 | ACCEPTED | `runOp` 单入口四态；`askKind` 扩 `secret`/`form`（**不加 kind**）；`error.payload.recovery` 走**出生铸造**（append-only 不破） | v5-1/v5-2/v5-3 |
| **ADR-V5-003** | SW 执行器 + `op-*` type-only 消息族 + 双侧注册表同源 | ACCEPTED | union type-only（`KIND_SET` 零新增 / `content.js` 逐字节零增长）；`src/shared/op-table.ts` 双侧同源；特权 op 恰 2；**权限申请手势留 page，SW 是授权裁决 / 快照 / 审计 owner** | v5-2 |
| **ADR-V5-004** | `optional_permissions` 最小集（X1：首批 **0 项**新增 + 机制预留） | ACCEPTED | 最小必要集 = 现状集 ⇒ `manifest.json` **零 diff**；判据升级为「显式名单 + 新增项在册」（更强不是更松） | v5-2 |
| **ADR-V5-005** | `settings/ops.ts` 4 类收编（单一执行体 + 零双路径） | ACCEPTED | 4 类（authorize/revoke/rebind/llm-config）执行体只在 op 表；设置面与 chip 同调 `dispatchOp`；`options.html` = 同执行体、不同 consent 载体（显式登记） | v5-2 |
| **ADR-V5-006** | 授权 chip（状态栏常显两态）+ 零双写五条 | ACCEPTED | `#auth-state` 净新增（状态栏内、`#risk-chips` 之前）；两态恒显其一；工具栏 / rail / 状态栏第一行 / L2 台账四路退出；6 ≤ 7 | v5-3 |
| **ADR-V5-007** | 可拖动宽度的**产品侧落点** + 密度登记格口径解耦（X5） | ACCEPTED | 280–640 拖动 = **设计稿契约**；产品侧 = `ResizeObserver` → `data-narrow`（≤360）+ 登记格 = **控件计数**（阈值 / 31 格 / 高度比逐字逐格不动） | v5-3 |
| **ADR-V5-008** | 双稿双 shim `design-contract`（F 冻结 + G 新增） | ACCEPTED | F 4 常量 + 60 断言**逐字保留**；G 4 常量 + 127 映射**并列新增**；两侧独立计数（混池防御）；台账 `designContractChanges` 空 → G 条目 | v5-1 |
| **ADR-V5-009** | 死端守护门禁（阻塞态枚举 + N=0 机核 + 双向反证） | ACCEPTED | `BLOCKED_TERMINALS` 单源（5）；`nextOf` 双形态判别（行内 chip ∨ 紧随 nextstep）；5 类逐类 + 死端 = 0 + 双向注入可 FAIL | v5-3 |
| **ADR-V5-010** | 法八四面零明文机核（payload / digest / 审计 / DOM 全属性） | ACCEPTED | 哨兵 → 掩码卡 → 提交 → **四面 + 全属性零命中** + digest 含 `••••••` + 值直达 key-store 恰 1 调用点；逐面反证 | v5-3 |
| **ADR-V5-011** | 体积预算（24,926 B 分配 + 越限预案） | ACCEPTED | Σ 预算 **17,600 B**（预留 7,326）；四级越限预案（≤5% / 越 5% / 越档位 / 越绝对上限 = 停机）；cap 保持 `record-only` | 各叶 |
| **ADR-V5-012** | 波次与实施序（3 叶 W 波 + 保护段第三次取代预案 + binding 避让） | ACCEPTED | 3 叶 5/7/7 波串行；journey **保段优先**（`#auth-state` 同行不增行）必要时第三次八步；binding **保段**（改函数体，段内零字节） | 各叶 |

### 7.2 波次与任务数估算（供 `@sddu-tasks` 参考，**非需求**）

| 叶 | 波数 | 任务数（估） | 工作量集中区 |
|---|:--:|:--:|---|
| v5-1（注册表 + 管线 + 双契约） | **5**（W1~W5） | **~22** | 注册表实现 + 4 门禁等价重锚 + `G_ASSERTION_MAP` 127 行 |
| v5-2（9 op + SW 执行器 + 断流首验收） | **7**（W1~W7） | **~30** | 9 op 执行体 + 两段握手 + 掩码 / 表单扩形 + S2 全链 |
| v5-3（chip + 宽度 + 死端 / 法八门禁 + 收口） | **7**（W1~W7） | **~24** | 两个新 Chromium 门禁 + 零双写改造 + 共享面收口 |
| **合计** | **19** | **~76** | — |

> 口径：任务数 = 可原子执行单元（≈1 文件内 1 项可验证改动 + 其判据），**不是** LLM 调用数；3 叶**串行**（v5-1 → v5-2 → v5-3）。

---

## 8. 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建（F-32 父 `plan.md` + 3 叶 `plan.md` + **ADR-V5-001~012** 全 12 条正文）：§1 前置检查 + 偏差登记；§2 架构分析（含 4 条不变量 / 红线继承 N1~N25 / 不动面 T1~T10）；§3~4 方案对比与推荐（方案 A：注册表取代 + 管线唯一 + 产品侧诚实收口）；§5 聚合文件影响 **≈69 项**（src 14 / test 26 / docs+config 4 / SDDU 25；`manifest.json` 与 ROADMAP 显式 NOOP）；§6 风险（继承 R-ALLN-001~016 + R-ALLN-901~910 + plan 新增 **R-V5-101~110** + Top5）；§7 ADR 索引（12 条 ACCEPTED）+ 波次估算（3 叶 **19 波 / ~76 任务**）。**本轮只做 plan**：零 `src`/`test`/`dist`/`docs`/`design`/ROADMAP 改动，零门禁 / 构建 / Chromium，未调用任何受管 Provider | 2026-09-22 | SDDU Plan Agent |
