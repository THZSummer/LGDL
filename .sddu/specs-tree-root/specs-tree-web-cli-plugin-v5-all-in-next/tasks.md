# 任务分解：specs-tree-web-cli-plugin-v5-all-in-next（web-cli-plugin v5「All-in-Next 聊天即操作台」；父 Feature 统领性任务总览）

> **文档定位**: SDDU 任务清单（**父 / 跨切总览与索引**）— 记录 19 波总表、3 叶 76 任务索引、跨切红线（N22~N25 / X1~X6 / 共享面）→ 任务映射、**体积预算逐叶分摊对照表**、共享面「恰一次」登记表、关键路径与 spikeGate、24 门禁守恒总表与停机规则。**本文件不含可执行任务正文**（父为轻量规范容器，不承接 build/review/validate；任务正文见 3 叶 `tasks.md` / `tasks.json`）
> **前置依赖**: 本目录 `plan.md` v1.0（跨切契约 + `ADR-V5-001~012` 索引）+ `spec.md` v1.0（80 FR / 12 NFR / 21 EC / 25 AC / 20 NG / `DC-ALLN-001~012` / §12 X1~X6 映射 / §13 N1~N25 / §14 3 叶拆分）+ `discovery.md` v1.0（R-ALLN-001~016 / R-ALLN-901~910）+ 3 叶 `plan.md` v1.0（ADR 正文 + 文件影响 69 项 + 波次）+ 3 叶 `tasks.md` v1.0（**76 原子任务正文**）
> **创建人**: SDDU Tasks Agent
> **创建时间**: 2026-09-22
> **版本**: v1.0
> **更新人**: SDDU Tasks Agent
> **更新时间**: 2026-09-22
> **更新说明**: 初始创建（父总览：**3 叶 × 19 波 × 76 任务**（`TASK-V5-101~122` / `123~152` / `153~176`，三叶连续编号）+ 编排器覆盖面 → 任务映射 + **体积预算逐叶分摊对照表（Σ 17,600 B）** + 共享面「恰一次」登记 + 4 个 spikeGate + 24 门禁守恒总表 + 停机规则 9 条 + 偏差登记）

---

## 0. 结构登记（**3 叶 Feature**）

| 项 | 内容 |
|---|---|
| 父 Feature 定位 | **轻量规范容器**（父 `spec.md §14.1`）：`depth=1`；**不承接** build/review/validate；`childrens` 结构不变 |
| 叶数量 | **3 叶**（`depth=2` / `leaf:true` / `deliveryOrder` 1..3 / 链式 `dependsOn`） |
| 交付顺序 | `specs-tree-v5-1-next-registry-pipeline` → `specs-tree-v5-2-ops-first-batch` → `specs-tree-v5-3-chrome-face`（**串行**，叶间不可并行，父 §14.2） |
| 为何 3 叶 | 取代对象（注册表 / 9 op / 界面面形态）三者「**取代对象 / 门禁主面 / 台账条目**」互不重叠，具备独立成叶的判据；而四类共享面（体积 / journey / `design-contract` / 取代台账）**必须一次做完**（`FR-ALLN-004`）⇒ 分叶 + 共享面恰一次（父 §14.1） |
| 本轮父产物偏差 | 父产出 `tasks.md` / `tasks.json`（**总览型：0 条可执行任务**）—— 父 `spec.md §14.1` 未列出父 `tasks.json`；与 v4 / v4.5 先例（`ADR-V4-001` / v4.5 §0）同口径**显式登记**，可整篇作废而不牵连叶（叶对父的引用 = 「父 FR/AC + `ADR-V5-0xx` 编号」，不依赖父 `tasks.json` 物理存在性） |
| ADR 所有权 | 12 条 ADR（`ADR-V5-001~012`）**主责叶**：001/002(机制)/008 → v5-1；002(执行)/003/004/005 → v5-2；006/007/009/010/012(收口) → v5-3；011 → 三叶各自增量 + v5-3 收口合计 |
| 编号空间 | `TASK-V5-1xx`（`101~176`）—— 叶 1 `101~122`（22）/ 叶 2 `123~152`（30）/ 叶 3 `153~176`（24）；与 v1 `TASK-001~040` / v2 `2xx~3xx` / v3 `4xx` / v4 `5xx~8xx` / v4.5 `TASK-V45-1xx` **零冲突** |
| 波次 | **19 波**（叶 1 `W1~W5` 5 波 / 叶 2 `W1~W7` 7 波 / 叶 3 `W1~W7` 7 波）；全局波序 `W01~W19` |

### 0.1 模板偏差登记（**任务数 > 15**）

| 项 | 内容 |
|---|---|
| 模板建议 | agent 模板 §5.4 / §8「任务数量控制在 5~15 个之间」 |
| 本轮实际 | **76**（22 / 30 / 24），分落 3 叶，**每叶任务数均在 19~30 区间**（叶 1 = 22 > 15，叶 2 = 30 > 15，叶 3 = 24 > 15） |
| 理由 | ① 编排器任务书明定「按 plan 估算展开：v5-1 **5 波** / v5-2 **7 波** / v5-3 **7 波**，三叶连续编号」；② `ADR-V5-012 §1` 已逐波钉死内容，过并会破坏「**每任务独立可验证**」（agent 模板 §8 规则 1）；③ 覆盖面由编排器列出（叶 1 含 8 项必含、叶 2 含 6 项必含、叶 3 含 7 项必含）；④ 与 v2/v3/v4/v4.5 叶子先例（9~19 任务）同量级 —— 本 Feature 体量为 v5 最大一轮（`R-ALLN-001` 已量化） |
| 口径 | 任务数 = **可原子执行单元**（≈1 文件内 1 项可验证改动 + 其判据），**不是** LLM 调用数 |

---

## 1. 波次总表（19 波 · 3 叶串行）

| 全局波 | 叶 | 叶内波 | 名称 | 任务 | 任务数 | 规模 |
|:--:|:--:|:--:|---|---|:--:|---|
| **W01** | v5-1 | W1 | Definition / Provider / 规则迁移 | `101`–`106` | 6 | S×1 / M×4 / L×1 |
| **W02** | v5-1 | W2 | 管线四态机制 | `107`–`110` | 4 | M×4 |
| **W03** | v5-1 | W3 | `ACT_TO_OP` + 瘦分发 + X3 门禁重锚 | `111`–`115` | 5 | S×1 / M×2 / L×2 |
| **W04** | v5-1 | W4 | 义务表 + 双契约入册（X4） | `116`–`119` | 4 | M×3 / L×1 |
| **W05** | v5-1 | W5 | 阻塞态单源 + 常驻候选 + 体积 + 收尾 | `120`–`122` | 3 | M×2 / L×1 |
| **W06** | v5-2 | W1 | 本地只读 5 op + `op-table` | `123`–`128` | 6 | M×6 |
| **W07** | v5-2 | W2 | 特权 op 底座 + `op.authorize`（SG-3） | `129`–`133` | 5 | S×1 / M×3 / L×1 |
| **W08** | v5-2 | W3 | `op.llm-config`（掩码 `secret`） | `134`–`137` | 4 | M×3 / L×1 |
| **W09** | v5-2 | W4 | `op.perm.request`（`form`）+ X1 权限面 | `138`–`140` | 3 | M×1 / L×2 |
| **W10** | v5-2 | W5 | `op.revoke` + 拒绝非死端（SG-2） | `141`–`144` | 4 | S×1 / M×1 / L×2 |
| **W11** | v5-2 | W6 | settings 4 类收编 + 逐 op 布线门禁 | `145`–`148` | 4 | M×2 / L×2 |
| **W12** | v5-2 | W7 | S2 断流首验收 + X2 + 体积 + 收尾 | `149`–`152` | 4 | L×4 |
| **W13** | v5-3 | W1 | 法八四面机核（判据先立）+ SG-4 | `153`–`155` | 3 | S×1 / M×1 / L×1 |
| **W14** | v5-3 | W2 | `error` 出生带恢复区 | `156`–`158` | 3 | M×3 |
| **W15** | v5-3 | W3 | 死端守护门禁 + S2 主验收 | `159`–`162` | 4 | M×2 / L×2 |
| **W16** | v5-3 | W4 | 授权 chip 唯一载体 + 零双写五条 | `163`–`166` | 4 | M×2 / L×2 |
| **W17** | v5-3 | W5 | `data-narrow` + 三档 radio 零残留 | `167`–`169` | 3 | M×3 |
| **W18** | v5-3 | W6 | 密度口径解耦 + 台账重锚（X5） | `170`–`172` | 3 | M×2 / L×1 |
| **W19** | v5-3 | W7 | 共享面收口（journey / 体积终轮 / 台账 / 全门禁） | `173`–`176` | 4 | M×1 / L×3 |
| **合计** | 3 叶 | — | — | `TASK-V5-101~176` | **76** | **S×5 / M×45 / L×26** |

**跨叶次序**：`W01~W05`（v5-1 全绿）→ `W06~W12`（v5-2 全绿）→ `W13~W19`（v5-3 全绿）。叶间**硬串行**（v5-2 依赖 v5-1 的注册表 / 管线接口；v5-3 依赖 v5-2 的 `op.authorize` / `op.revoke` / `op.rebind` 与断流样本）。

---

## 2. 三叶任务索引（76 条；正文见各叶 `tasks.md`）

> 规模：S（单文件 <50 行 / 无外部依赖）/ M（多文件 <200 行 / 简单依赖）/ L（复杂变更 >200 行 / 多依赖）。`*` = **spikeGate（先验闸门）**。

### 2.1 v5-1 `specs-tree-v5-1-next-registry-pipeline`（22 · `TASK-V5-101~122` · 5 波）

| # | 任务 ID | 波 | 规模 | 标题 | 主 ADR | 红线检查点 |
|:--:|---|:--:|:--:|---|---|---|
| 1 | `TASK-V5-101` | W1 | M | `definition.ts` —— Definition 三件套（`NextProvider` / `NextOp` 接口 + `NEXT_SERVICES` / `NEXT_MODES` / `NEXT_MOUNT_POINTS` / `MOUNT_MODE` / `BLOCKED_TERMINALS` / `NextCtx` 单源） | 001 / 009 | F1 F3 T-d C-1 C-3 C-7 |
| 2 | `TASK-V5-102` | W1 | M | `registry.ts` —— `validateNextProvider` + `deps ⊆ NEXT_SERVICES` loud + `test/next-registry.test.ts` 单测骨架（R2 / R4 / R6） | 001 | F1 T-d C-2 C-6 |
| 3 | `TASK-V5-103` | W1 | M | `registry.ts` —— `topoByDeps` + `resolveOrder`（`priority` asc · `prepend` desc · `registrationSeq` asc；**列表位置置换不改变顺序**） | 001 | T-d C-2 |
| 4 | `TASK-V5-104` | W1 | M | `registerNextProvider` 可逆注册（幂等 `unregister` / `{overwrite:true}` 按 id 整行替换 / `REGISTRY` 单点写入） | 001 | F1 T-d C-2 |
| 5 | `TASK-V5-105` | W1 | L | `providers.ts` —— 4 内置 provider（旧 `recommend.ts` 4 规则 + 5 触发集 + `RECOVERY_CHIP_ORDER` 逐条等价迁移；常量逐字保留） | 001 | T-d T-e C-4 |
| 6 | `TASK-V5-106` | W1 | S | **spikeGate-1** —— G shim 127 断言抽取 + F/G 混池防御 + `node option-g-shim.mjs` 实跑预证 | 008 | F1 L-a |
| 7 | `TASK-V5-107` | W2 | M | `pipeline.ts` —— `runOp` 四态骨架（单次查表 / `params?` / `consent?` / `execute` / `receipt`；缺省语义正确） | 002 | T-d C-7 |
| 8 | `TASK-V5-108` | W2 | M | `pendingOps` FIFO 队列 + `MAX_OPEN_ASKS` 仲裁（EC-ALLN-010；不静默丢弃 + 系统行告知） | 002 | T-d C-1 |
| 9 | `TASK-V5-109` | W2 | M | 快照 · 回滚**语义位**（`isMutating` / `snapshot` / `rollback`；三表位留接口） | 002 | T-d C-1 |
| 10 | `TASK-V5-110` | W2 | M | R5 失败语义三级（单卡边界 / 注册 loud / 整体回滚）+ 「`op.execute(` 恰 1 调用点」静态判据 | 002 | T-d C-7 |
| 11 | `TASK-V5-111` | W3 | M | `dispatch.ts` —— `ACT_TO_OP`(6 行) + `OPS_BY_ID` + `dispatchChipAction`（一次查表，零 per-op 分支） | 001 | T-e C-4 |
| 12 | `TASK-V5-112` | W3 | S | `cards/nextstep.ts` —— chip 增 `data-op`；`data-act` 降渲染别名（不作分发依据） | 001 | C-4 |
| 13 | `TASK-V5-113` | W3 | L | `sidepanel.ts#handleCardAction` 两集改造（集 A 8 项保留 / 集 B 7→1 次查表；`dispatchOp` 接线位） | 001 | T-e C-4 C-7 |
| 14 | `TASK-V5-114` | W3 | M | `test/next-dispatch-diff0.test.ts` —— 集 B 零 per-op 分支 + 注册/卸载/覆盖/重复 id 四操作分发器哈希不变 + `gate-integrity` 受审追加 | 001 | T-e C-4 |
| 15 | `TASK-V5-115` | W3 | L | **X3 门禁等价重锚**（`recommendation-sources` / `local-act-wiring` / `test/ui/recommendation.mjs` 59）+ 反证留证 | 001 / 012 | T-d T-e L-a |
| 16 | `TASK-V5-116` | W4 | M | `obligation-table.ts` —— 9 行四要素 + 表尾**明示契约义务** | 001 | C-6 |
| 17 | `TASK-V5-117` | W4 | M | `test/next-obligation-table.test.ts` —— 注册表 ↔ 义务表（行数 / `opId` 集 / 四要素 / 无悬空）+ 三类注入反证 + `gate-integrity` 受审追加 | 001 | C-6 |
| 18 | `TASK-V5-118` | W4 | L | `design-contract.test.ts` —— **F 4 常量 + 60 映射逐字保留** + G 4 常量 + `G_ASSERTION_MAP` 127 行（X4） | 008 | F1 L-a C-5 |
| 19 | `TASK-V5-119` | W4 | M | G 侧 test 块（实跑 / sha / 计数 / 映射 / 卡分类 / **混池防御**）+ `designContractChanges` 台账登记 | 008 | F1 L-a C-5 |
| 20 | `TASK-V5-120` | W5 | M | `BLOCKED_TERMINALS` 单源 + `site.unauthorized` 常驻候选（**去 `firstRun` 依赖**）+ 「声明恰一次」扫描 | 001 / 009 | T-d C-3 |
| 21 | `TASK-V5-121` | W5 | M | 体积五要素重登记（本叶增量）+ metafile 逐模块归因 + 红线逐字节复核 | 011 | F2 T-c L-c |
| 22 | `TASK-V5-122` | W5 | L | 本叶收尾 —— 全门禁**串行**复跑 + 计数只增对账 + 反证留证完整性 + `TREE` / `state` 更新 | 012 | F1–F5 T-a–T-e L-a–L-c C-1–C-7 |

### 2.2 v5-2 `specs-tree-v5-2-ops-first-batch`（30 · `TASK-V5-123~152` · 7 波）

| # | 任务 ID | 波 | 规模 | 标题 | 主 ADR | 红线检查点 |
|:--:|---|:--:|:--:|---|---|---|
| 1 | `TASK-V5-123` | W1 | M | `src/shared/op-table.ts` —— 9 行 op 描述符（纯数据零 chrome）+ `ops.ts` 执行体脚手架与注册接线 | 003 | F2 C-2 C-6 |
| 2 | `TASK-V5-124` | W1 | M | `op.pick` —— 复用既有拾取**单一入口**；取消 / 超时 → 错误卡 + 恢复 next；零 `requestTurn` | 002 / 005 | F2 T-d C-7 |
| 3 | `TASK-V5-125` | W1 | M | `op.describe` —— 复用 `submitDescribe` **单一入口**；空描述卡内校验零副作用 | 002 | T-d C-7 |
| 4 | `TASK-V5-126` | W1 | M | `op.rebind` —— 复用 `#rebind` **单一入口**；幂等；不受 `pending` 门控 | 002 / 005 | F3 T-d C-7 |
| 5 | `TASK-V5-127` | W1 | M | `op.help` —— 可达 op 列表**由 `when(ctx)` 派生**（禁硬编码）；零回写 | 002 | T-d C-6 |
| 6 | `TASK-V5-128` | W1 | M | `op.turn` —— **唯一**经 `requestTurn` 的 op；指令文本来自 chip；其余 op 零 `requestTurn` 机核 | 001 / 005 | T-d C-7 |
| 7 | `TASK-V5-129` | W2 | S | **spikeGate-2** —— `op-*` **type-only** 通路探针（`KIND_SET` 零新增 / `content.js` 逐字节零增长预证） | 003 | F2 F3 C-2 |
| 8 | `TASK-V5-130` | W2 | M | `op-protocol.ts`（`isOpMessage`）+ `messaging.ts` union **type-only** 3 项 + `test/op-protocol.test.ts` | 003 | F2 F3 C-2 |
| 9 | `TASK-V5-131` | W2 | M | `service-worker.ts` —— `case 'op-exec'` + 入口闸门追加 `!isOpMessage(raw)` | 003 | F3 |
| 10 | `TASK-V5-132` | W2 | M | `op-executors.ts` SW 执行器镜像（由 `op-table` 派生，字段集恰 `{id, mode, fail, audit}`）+ `test/sw-op-mirror.test.ts` 漂移反证 | 003 | F2 C-2 |
| 11 | `TASK-V5-133` | W2 | L | `op.authorize` 两段握手（SW = 授权裁决 / 快照 / 审计 owner；手势留 page；SW 内 `.request(` 零命中保留） | 003 | F3 T-d C-7 |
| 12 | `TASK-V5-134` | W3 | M | `stream-model.ts` —— `askKind` **扩值** `secret` / `form` + `payload` 扩字段（`secretLabel` / `formOptions` / `maskedLength`） | 002 | C-1 C-5 |
| 13 | `TASK-V5-135` | W3 | M | `cards/askuser.ts` —— `secret` 扩形渲染（`type=password` + `data-secret`）+ 掩码固化文案 | 002 | T-d C-1 |
| 14 | `TASK-V5-136` | W3 | M | `sidepanel.ts#submitSecret` —— **值直达 key-store**（恰 1 调用点）；流内只落事实 | 002 / 010 | T-d C-7 |
| 15 | `TASK-V5-137` | W3 | L | `op.llm-config` 执行体（厂商 choice + 模型 + Key `secret` → 测试连接 → 掩码写存储）+ **凭据表快照回滚** | 002 | T-d C-7 |
| 16 | `TASK-V5-138` | W4 | M | `cards/askuser.ts` —— `form` 扩形（选项源 = `OPTIONAL_CAPABILITIES`，≤4 项；`MAX_CLICKABLES_PER_CARD = 6` 恰好达上限） | 002 / 004 | F3 T-d C-1 |
| 17 | `TASK-V5-139` | W4 | L | `op.perm.request`（**机制预留**）—— 运行时申请 + 手势路径 + **批准 / 拒绝双固化** + 如实的「回收须浏览器确认」口径 | 003 / 004 | F3 T-d C-7 |
| 18 | `TASK-V5-140` | W4 | L | **X1 权限面门禁等价重锚**（`capability-wiring` / `binding-wiring` / `auto-session-wiring` / `test/ui/binding.mjs`）+ 「显式名单 + 新增项在册」+ `manifest.json` **零 diff** 登记 | 004 | F2 F3 T-d L-a |
| 19 | `TASK-V5-141` | W5 | L | `op.revoke` 执行体（目标 choice + 高风险确认卡 + 不可逆说明 + **审计入口**） | 005 | T-d C-7 |
| 20 | `TASK-V5-142` | W5 | L | **三表整体回滚**（授权 / 浏览器权限 / LLM 凭据；R-ALLN-904）—— 失败后旧状态逐字段不变 | 002 / 005 | T-d C-7 |
| 21 | `TASK-V5-143` | W5 | M | **拒绝非死端**（consent 拒绝 / 浏览器权限被拒 / ask 取消）—— 固化事实 + 可达 next + 不重试同一授权 | 002 | T-d C-1 C-4 |
| 22 | `TASK-V5-144` | W5 | S | **spikeGate-3** —— binding 保护段**字节中立避让**可行性探针（段前偏移 < `107780` 等长补偿预算） | 012 | F1 L-a |
| 23 | `TASK-V5-145` | W6 | L | `settings/ops.ts` —— 4 类（authorize / revoke / rebind / llm-config）**委派为 op 单一执行体**；其余 13 项零改 | 005 | F3 T-d C-7 |
| 24 | `TASK-V5-146` | W6 | M | `settings/panel.ts` —— 4 类按钮 → `dispatchOp`；`form` 选项源 = `OPTIONAL_CAPABILITIES`；同源回执构造 | 005 | T-d C-7 |
| 25 | `TASK-V5-147` | W6 | L | `test/op-wiring.test.ts` —— 逐 op 单一调用点 + 调用点集合显式登记 + 零 `requestTurn`（除 `op.turn`）+ ≥3 条伪造反证 | 005 | T-d C-7 |
| 26 | `TASK-V5-148` | W6 | M | `test/authorize-chip-wiring.test.ts` 特权 op 等价重锚（SW 零 `.request(` 保留 + 特权 op 恰 2 项 + 手势回调恰 2 调用点） | 003 / 004 | F3 T-d L-a |
| 27 | `TASK-V5-149` | W7 | L | **S2 断流全链样本与驱动 seam**（10 环节：绑定 → 探测 → 未授权 → ✖ → 授权 next → auth 卡 → execute → ✓ → 探测恢复 → 拾取 next） | 009 | C-3 C-7 |
| 28 | `TASK-V5-150` | W7 | L | **S2 断流首验收机器化**（AC-ALLN-001）—— 5 类阻塞可达 + 死端 = 0（node 判据）+ **人工面逐项登记** | 009 / 012 | T-d C-3 |
| 29 | `TASK-V5-151` | W7 | L | **X2 门禁等价重锚**（`content.test` / `pick-layer-budget` / `insight-protocol`）+ `test/ui/stream.mjs` / `ask-auth-inflow.mjs` **增**断言（`secret` / `form`） | 003 / 012 | F2 F3 L-a |
| 30 | `TASK-V5-152` | W7 | L | 体积五要素（本叶增量）+ `test/ui/binding.mjs` **段内零改 / 段外逐行登记** + 本叶收尾全门禁（含 `KL-N-10` 纪律） | 011 / 012 | F1 F2 T-c L-a L-c |

### 2.3 v5-3 `specs-tree-v5-3-chrome-face`（24 · `TASK-V5-153~176` · 7 波）

| # | 任务 ID | 波 | 规模 | 标题 | 主 ADR | 红线检查点 |
|:--:|---|:--:|:--:|---|---|---|
| 1 | `TASK-V5-153` | W1 | S | **spikeGate-4** —— 5 类阻塞终态 **headless 驱动 seam 探针**（`binding.stale` / `ref.all-invalid` 尤需） | 009 | C-3 |
| 2 | `TASK-V5-154` | W1 | L | `test/ui/law8-plaintext.mjs` 骨架 —— `SENTINEL` + 面 ①（流内 payload）②（digest 含 `••••••`）③（审计面渲染 + 存储） | 010 | T-d C-1 C-7 |
| 3 | `TASK-V5-155` | W1 | M | 法八面 ④（**DOM value + 全部元素属性**逐项）+ 提交后 `input.value` 清空 + **四类注入反证** + `gate-integrity` 受审追加 | 010 | T-d L-a C-1 |
| 4 | `TASK-V5-156` | W2 | M | `stream-model.ts` —— `error.payload.recovery` 渲染打通（字段已在 v5-1 声明） | 002 | C-1 C-3 |
| 5 | `TASK-V5-157` | W2 | M | `cards/error.ts` —— **出生铸造**恢复区（阻塞类带 / 非阻塞不带；`BORN_FROZEN_KINDS` **不动**） | 002 / 009 | C-1 C-3 |
| 6 | `TASK-V5-158` | W2 | M | `test/ui/stream.mjs` **增**断言（`error` 行内恢复）+ 「出生后不 patch」反证 | 002 | C-1 C-5 |
| 7 | `TASK-V5-159` | W3 | L | `test/ui/no-dead-end.mjs` —— 5 类阻塞**逐类** + `nextOf(el)` 双形态判据（行内 `[data-op]` ∨ 紧随 `nextstep`） | 009 | C-3 C-4 |
| 8 | `TASK-V5-160` | W3 | L | **死端 = 0** 同屏扫描 + **S2 全链主验收**（消费 v5-2 样本；N = 0 口径） | 009 | T-d C-3 |
| 9 | `TASK-V5-161` | W3 | M | **双向注入反证**（新增阻塞无 next ⇒ FAIL；已有 next 被删 ⇒ FAIL）+ 逐字节 sha256 还原 | 009 | C-3 |
| 10 | `TASK-V5-162` | W3 | M | `test/host-registry.test.ts` —— chip / 分隔条**不在流内**（零宿主反向判据）+ `gate-integrity` 受审追加 | 009 | F1 C-7 |
| 11 | `TASK-V5-163` | W4 | M | `index.html` —— `#auth-state` **净新增**（`#region-statusbar` 内、`#risk-chips` **之前**）+ 管理详情 DOM | 006 | F1 T-a C-7 |
| 12 | `TASK-V5-164` | W4 | L | `statusbar.ts` —— 两态（黄 `未授权 · 零注入` / 绿 `已授权 · supported`）**恒显其一**；仍是**唯一写入者**（J1~J4） | 006 | F1 T-a C-7 |
| 13 | `TASK-V5-165` | W4 | L | **零双写五条** —— `view-model` 工具栏 / `band.statusText` 去授权态 + `risk-rail` 拆 `RAIL_RISK_CLASSES`(4) / `AUTH_STATES` + L2 站点行指向 chip | 006 | T-a L-a C-7 |
| 14 | `TASK-V5-166` | W4 | M | 黄 / 绿 chip 点击行为（黄 → 流内产 `op.authorize` next + 系统行；绿 → 管理详情默认折叠）+ **四词扫描**断言 | 006 | F1 T-a C-7 |
| 15 | `TASK-V5-167` | W5 | M | `data-narrow` —— `ResizeObserver` 观测 `#panel` 实际宽度（≤360 `true` / ≥361 `false`）+ 窄屏样式块 | 007 | T-a T-b C-7 |
| 16 | `TASK-V5-168` | W5 | M | 三档 radio **零残留**扫描 + 「产品侧零宽度切换控件」新断言 + **R-V5-106 反证**（宽视口 + 窄面板 ⇒ `data-narrow === true`） | 007 | T-a C-7 |
| 17 | `TASK-V5-169` | W5 | M | `test/ui/l0.mjs`（244）/ `density.mjs`（232）等价重锚 —— `#auth-state` 计数 + `data-narrow` 边界 + J1~J4 | 007 | T-a T-b L-a |
| 18 | `TASK-V5-170` | W6 | M | `test/density-thresholds.test.ts` —— 阈值逐字 + 单源声明 + `data-narrow` 边界（360 / 361 双值） | 007 | T-a L-b |
| 19 | `TASK-V5-171` | W6 | L | 密度登记格**口径解耦**（格 = 控件计数，与宽度无关）+ 31 登记格**逐格留痕**（不删格、不改数值） | 007 | T-a L-b |
| 20 | `TASK-V5-172` | W6 | M | `docs/v4-density-baseline.json` `tiers` 等价重锚 + `v5Ledger` + **X5 取代台账条目**（`modifiedRanges[]` 逐行） | 007 / 012 | L-a L-b C-5 |
| 21 | `TASK-V5-173` | W7 | L | journey 保护段处置 —— **保段（首选）或第三次八步显式取代**；320 锚点 + 360/361 边界；计数守恒 ≥171 + RP-V4-08 反证 | 012 | F1 L-a C-5 |
| 22 | `TASK-V5-174` | W7 | L | **体积终轮**（**三叶合计**）+ `size-baseline.ts` 五要素 + V3-VOL-3 三值同源 + 档位闸门 | 011 | T-c L-c |
| 23 | `TASK-V5-175` | W7 | M | `test/supersession-ledger.test.ts` 台账一致性（X5 + `designContractChanges` 对账 + `knownGap` ↔ `status`）+ `gate-integrity` 收口 | 012 | L-a C-5 |
| 24 | `TASK-V5-176` | W7 | L | 本叶 / 本 Feature 收尾 —— 全门禁**串行** + `e2e` 汇总 + **人工面清单逐项标注**（`⏳` / `PASS`，不得冒充）+ 计数只增对账 | 012 | F1–F5 T-a–T-e L-a–L-c C-1–C-7 |

---

## 3. 跨切红线 → 任务映射（N22~N25 / X1~X6 / 共享面）

### 3.1 spec 新增红线 N22~N25

| # | 红线（逐字要点） | 承载任务 | 判据锚点 |
|---|---|---|---|
| **N22** | `handleCardAction` **零 per-op 分支**（diff = 0） | `113`（收敛）/ `114`（机核）/ `115`（重锚） | 集 B 分支数 == 0；四操作下分发器文件哈希不变（AC-ALLN-005） |
| **N23** | `#auth-state` = 授权态全 UI **唯一常显载体**（四词工具栏零出现；rail 授权类零残留） | `163` / `164` / `165` / `166` | 四词扫描范围 = 工具栏区 ∪ `#statusbar-text` ∪ `#risk-chips` ∪ rail 容器；唯一命中 = `#auth-state`（AC-ALLN-012） |
| **N24** | 流内零明文**四面**（payload / digest / 审计 / DOM value 与**全部属性**） | `135` / `136`（入口侧）/ `154` / `155`（机核） | 哨兵四面对抗扫描零命中 + `digest` 含 `••••••` + key 直写恰 1 调用点（AC-ALLN-003） |
| **N25** | `op.turn` 是**唯一**经 `requestTurn` 的 op；其余 op 零 `requestTurn` | `128`（实现）/ `147`（机核） | 逐 op 布线门禁：零 `requestTurn`（除 `op.turn`）（AC-ALLN-009） |

### 3.2 X1~X6 显式取代 → 任务映射

| # | 取代内容 | 承载任务 | 台账落点 |
|---|---|---|---|
| **X1** | 允许新增 `optional_permissions`（首批 **0 项** + 机制预留） | `140`（门禁重锚 + `manifest` 零 diff）/ `138` / `139` | `modifiedRanges[]`（四门禁等价重锚逐行） |
| **X2** | `op-*` 消息族 **type-only**（`KIND_SET` 零新增 / `content.js` 逐字节） | `129`(SG-2) / `130` / `131` / `132` / `151` | `modifiedRanges[]` + `test:content` 反证留证 |
| **X3** | act 闭集 6 项 → **op 注册表**（chip `data-op` + 纯谓词候选 + 分发器 diff = 0） | `105` / `111` / `112` / `113` / `114` / `115` | `modifiedRanges[]` 逐行 + 各门禁计数对账 |
| **X4** | G 稿 + 127 断言入 `design-contract`（F **并存不替换**） | `106`(SG-1) / `118` / `119` | `designContract.designContractChanges[]`（空 → G 条目） |
| **X5** | 密度三档视口（320/400/520）→ 连续宽度 + `data-narrow` + 口径解耦 | `167` / `168` / `170` / `171` / `172` / `173` | `docs/v4-density-baseline.json`（`tiers` 重锚 + `v5Ledger` + `modifiedRanges[]`） |
| **X6** | `data-act` → `data-op` + 注册表候选 + 统一管线 + `error` 行内恢复 | `111` / `112` / `113` / `156` / `157` / `158` | 台账 + `test:stream` / `test:ask-auth` 计数对账（只增） |

### 3.3 四类**共享面**「恰一次」登记（`FR-ALLN-004`）

| 共享面 | 登记叶（恰一次） | 形式 | 机核 |
|---|---|---|---|
| **体积五要素** | 各叶登记**自身增量**（`121` / `152` / `174`）；**收口合计在 v5-3**（`174`） | `SIDEPANEL_BASELINE_BYTES_TIMELINE` **只追加** + metafile 逐模块归因（`Σ 逐模块 Δ + 未归因 == 登记增量`） | `test:size-budget` / `test:size-growth-evidence` / `test:size-ruling-vol3 ≥12` |
| **`design-contract`（G 新增）** | **v5-1**（`118` / `119`） | `G_*` 常量 + `G_ASSERTION_MAP` 127 行 + `designContractChanges` 条目 | `test:design-contract`（F 60 保留 + G 127 新增，两侧独立计数） |
| **journey 结构重锚** | **v5-3**（`169` / `173`） | **保段（首选）**或第三次八步留痕（`modifiedRanges[]` / `redlineRemap[]` / 计数守恒 ≥171 / RP-V4-08） | `test:supersession ≥35` + `test:journey ≥171` |
| **取代台账八步** | `101~122` 登 **X3 / X4 / X6(chip 侧)**（`115` / `119` / `121`）；`123~152` 登 **X1 / X2**（`140` / `151` / `152`）；`153~176` 登 **X5**（`172` / `173` / `175`）—— 各登各的条目，台账文件**只追加** | `modifiedRanges[]` / `redlineRemap[]` / 密度台账 | `test:supersession ≥35` + `knownGap` 一致性（`FR-ALLN-123`） |

> **禁止**：「两叶各改一次同一条目」；`X` 项台账登记与判据重锚**不得**拆到下一轮补（父 §16 纪律 11）。

### 3.4 编排器覆盖面 → 落点对账（含 **1 项显式边界裁决**）

| 编排器覆盖面 | 落点 | 说明 |
|---|---|---|
| v5-1：注册表核心（Definition/Provider/Consumer）+ `ACT_TO_OP` 6 行 + `recommend.ts` 内置 provider 化 + `runOp` 四态 + `handleCardAction` 两集（集 B 零分支机核）+ 双稿双 shim + 义务表静态机核 + 单测骨架 | `101`–`119` | ✅ 全覆盖（单测骨架 = `102` 的 `test/next-registry.test.ts` + `114` / `117` 新门禁） |
| v5-2：9 op 执行体 + SW 执行器 + `op-*` type-only + settings 4 类收编 + 断流首验收机器化（S2 全链）+ **法八四面机核** | `123`–`152` | 9 op / SW / type-only / settings / S2 全覆盖；**法八见下「边界裁决」** |
| v5-3：授权 chip 唯一载体 + rail 并入 + `data-narrow`/`ResizeObserver` + 密度连续口径重锚 + 死端守护门禁（`BLOCKED_TERMINALS` 单源）+ E2E 汇总 + 体积终轮 + 收口 | `153`–`176` | ✅ 全覆盖（`BLOCKED_TERMINALS` 单源在 v5-1 `120` 落地，v5-3 `159` **消费并复核**「声明恰一次」；E2E 汇总 = `176`） |
| **法八（LAW8）分叶边界裁决** | v5-2 = **入口侧**（`134`–`136` + `139`）；v5-3 = **四面机核**（`154` / `155`） | 编排器把「法八四面机核」列在 v5-2 覆盖面，而父 `spec.md §14.3` 明定 `FR-ALLN-020/021/022`（掩码卡 / 值直达 / 流内只留事实）→ **v5-2**、`FR-ALLN-023/024`（四面零明文 / 存储侧边界）→ **v5-3**，且 `ADR-V5-010` / `ADR-V5-012` 明定 `test/ui/law8-plaintext.mjs` **单点落 v5-3 W1**。**裁决：以 spec + ADR 为准**（权威），并**同轮满足编排器意图** —— v5-2 交付**法八入口侧**（掩码 `secret` 卡 / `submitSecret` 值直达 key-store 恰 1 调用点 / 流内只留事实）+ v5-2 的断言显式指向 v5-3 四面门禁；v5-3 交付**四面机核**（含面 ④ DOM 全属性）。**理由**：若在 v5-2 另建一份 `law8-plaintext.mjs`，将与 v5-3 同一门禁**两叶各建一次**，直接违 `FR-ALLN-004`「共享面恰一次」纪律与 `ADR-V5-012 §4`。<br>**注（范围边界）**：`PO-ALLN-003`（存储侧加密 / 生命周期 / 轮换）**out-of-scope** —— 法八只保证**流内零明文**，存储侧边界显式登记（`NG-ALLN-017`）；若把「存储侧」计入「全范围」，属范围外扩（违 NG），不在本 Feature。 |


---

## 4. 体积预算逐叶分摊对照表（**Σ 17,600 B**，权威 = `ADR-V5-011 §1`）

> 口径：**仅 `sidepanel.js`**（SW-only 模块 `op-protocol.ts` / `op-executors.ts` 归因为 0；`src/shared/op-table.ts` 被双侧 import ⇒ 计入 panel，已在 #3 内；`test/**` 不进产物）。基线 **498,521 B** / 生效上限 **523,447 B** = `floor(498,521 × 1.05)` / 余量 **24,926 B** / 距档位 **13,479 B**（档位 512,000）。

| # | 项目 | 载体 | 预算 (B) | 主责叶 | 承载任务 |
|---|---|---:|---|---|
| 1 | Definition（接口 / `NEXT_SERVICES` / `NEXT_MODES` / `MOUNT_MODE` / `BLOCKED_TERMINALS`） | `next-registry/definition.ts` | **600** | v5-1 | `101` |
| 2 | Provider（`validate` / `topoByDeps` / `resolveOrder` / `register`·`unregister`·`overwrite`） | `next-registry/registry.ts` | **2,400** | v5-1 | `102`–`104` |
| 3 | Consumer + 管线（`runOp` / `pendingOps` / 快照回滚）+ `handleCardAction` **瘦身净变化** | `pipeline.ts` + `dispatch.ts` + `sidepanel.ts` | **3,100** | v5-1 | `107`–`113` |
| 4 | 9 op 执行体（**净**：主体复用既有单一入口调用） | `next-registry/ops.ts` | **3,400** | v5-2 | `123`–`128` / `133` / `137` / `139` / `141` |
| 5 | 证明义务表 + 一致性校验 | `next-registry/obligation-table.ts` | **900** | v5-1 | `116` / `117` |
| 6 | 4 内置 provider 迁移（`recommend.ts` 重构**净**） | `providers.ts` + `recommend.ts` | **1,400** | v5-1 | `105` |
| 7 | `askuser` 扩形（`secret` / `form` 渲染 + 提交） | `cards/askuser.ts` + `sidepanel.ts` | **1,800** | v5-2 | `134`–`136` / `138` |
| 8 | `error` 出生恢复区 | `cards/error.ts` + `stream-model.ts` | **700** | v5-3 | `156` / `157` |
| 9 | 授权态下移（`#auth-state` 写入 + 两态 + 管理详情 view；**净**） | `statusbar.ts` + `view-model.ts` + `index.html` + `risk-rail.ts` | **1,600** | v5-3 | `163`–`166` |
| 10 | `data-narrow`（`ResizeObserver` + 样式块） | `sidepanel.ts` + 样式 | **500** | v5-3 | `167` / `168` |
| 11 | 密度台账 / 等价重锚（运行时净） | 各模块 | **200** | v5-3 | `169`–`171` |
| 12 | 胶水 / 未归因（`Σ 逐模块 Δ + 未归因 == 登记增量` 右侧项） | — | **1,000** | 各叶 | 各叶收尾（`121` / `152` / `174`） |
| | **Σ 预算** | | **17,600** | | |
| | **预留下界余量** | | **7,326** | | |

### 4.1 逐叶分摊小计

| 叶 | 逐项归属（#） | 小计 (B) | 胶水分摊 (B) | **逐叶合计 (B)** | 登记任务 |
|---|---|---:|---:|---:|---|
| **v5-1** | 1 + 2 + 3 + 5 + 6 = 600 + 2,400 + 3,100 + 900 + 1,400 | **8,400** | 400 | **8,800** | `121` |
| **v5-2** | 4 + 7 = 3,400 + 1,800 | **5,200** | 350 | **5,550** | `152` |
| **v5-3** | 8 + 9 + 10 + 11 = 700 + 1,600 + 500 + 200 | **3,000** | 250 | **3,250** | `174`（**三叶合计**） |
| **合计** | 12 项 | **16,600** | **1,000** | **17,600** | — |

> **口径核对**：`Σ 逐项预算 16,600 + 胶水 1,000 = 17,600 = ADR-V5-011 §1 Σ`。**结论：Σ 17,600 B < 余量 24,926 B**，且 < 距档位 13,479 B 的**组合边界**（24,926）⇒ **预期不触发档位上调**（仍须以 metafile 实测复核）。
>
> **与 plan 文本口径的差异（显式登记，不静默改 ADR）**：v5-1 `plan.md §6` 记「本叶预算 ≈ 8,400 B」（与本表逐项小计一致）；v5-2 `plan.md §6` 记「本叶 ≈ 8,900 B」（**含 settings 4 类收编的委派函数体净变化 + SW 侧归因的文本预估**，`ADR-V5-011 §1` 无对应行项）。本表**以 `ADR-V5-011` 的 12 行逐项表为权威分配**；两者差异（上界 ≈ 3,350 B）属**未归因余量**，由收口轮 metafile 实测归因按 `FR-ALLN-130` **只追加**修正（**不改 ADR 历史值、不引入新 cap**）。

### 4.2 越限分级预案（`ADR-V5-011 §2`，逐叶共用）

| 情形 | 动作 |
|---|---|
| Δ ≤ 24,926 B（≤5%） | **五要素重登记** + metafile 归因；档位 512,000 / 绝对上限 563,200 **不变**；`authorConfirmation.status` 保持 `pending-author-line` |
| 24,926 < Δ ≤ 38,405（越 5% 但新基线 < 512,000） | 同上 + **显式登记「越 5% 轮内软纪律」**；禁止静默放宽上限 / 禁止引入新 cap |
| 新基线 > 512,000（越档位） | 触发**档位上调义务**（显式登记 + `authorConfirmation` 占位规则，**不得伪称已确认**）；绝对上限 563,200 不变 |
| 新基线 > 563,200（越绝对上限） | **停机上报**（硬墙）；不得自行放宽 |
| 任意情形 | `SIDEPANEL_CEILING_CAP === 'record-only'` 保持不变；**不设自缚装置**（`NG-ALLN-009`） |

---

## 5. 关键路径 · spikeGate · 并行组

### 5.1 关键路径（叶内严格串行）

- **v5-1**：`101 → 102 → 103 → 104 → 105 → 107 → 108 → 109 → 110 → 111 → 112 → 113 → 114 → 115 → 116 → 117 → 118 → 119 → 120 → 121 → 122`（21 任务在路径上；`106` 为旁路闸门）
- **v5-2**：`123 → 124 → 125 → 126 → 127 → 128 → 130 → 131 → 132 → 133 → 134 → 135 → 136 → 137 → 138 → 139 → 140 → 141 → 142 → 143 → 145 → 146 → 147 → 148 → 149 → 150 → 151 → 152`（28 任务在路径上；`129` / `144` 为旁路闸门）
- **v5-3**：`153 → 154 → 155 → 156 → 157 → 158 → 159 → 160 → 161 → 162 → 163 → 164 → 165 → 166 → 167 → 168 → 169 → 170 → 171 → 172 → 173 → 174 → 175 → 176`（24 任务在路径上）

### 5.2 spikeGate（**先验闸门**，4 个）

| 闸门 | 任务 | 内容 | 闸住 | 闸门结论语义 |
|:--:|---|---|---|---|
| **SG-1** | `TASK-V5-106` | G shim 127 断言抽取可行性 + F/G 混池防御设计 | `TASK-V5-118` / `119`（X4 入册） | `eight-steps-…`/`g-contract-feasible` → 直落；`report-to-orchestrator` ⇒ 下游**暂停上报**（禁静默改 F 常量 / 禁缩窄 127 映射） |
| **SG-2** | `TASK-V5-144` | binding 保护段**字节中立避让**可行性（段前 `< 107780` 可用删白 / 补白预算 ≥ `\|Δ\|`） | `TASK-V5-152`（binding 段外登记 + 收尾） | `keep-feasible` → 保段；不可行 ⇒ 停下上报（**禁静默改 pin**） |
| **SG-3** | `TASK-V5-129` | `op-*` **type-only** 通路（`KIND_SET` 逐字零新增 / `content.js` 逐字节零增长） | `TASK-V5-130` / `131`（消息族与 SW 接线） | `type-only-feasible` → 直落；不可行 ⇒ 停下上报（**禁把 `op-*` 加进 `KIND_SET`**） |
| **SG-4** | `TASK-V5-153` | 5 类阻塞终态 **headless 驱动 seam** 可得性（`binding.stale` / `ref.all-invalid` 尤需） | `TASK-V5-159` / `160`（死端守护门禁） | `seam-available` → 直落；seam 不足 ⇒ **回 v5-1 补 provider 的可注入 `when(ctx)`**（不得以人工判据替代） |

### 5.3 并行组（文件不相交才可并行；**门禁执行绝不并发**）

| 组 | 成员 | 说明 |
|---|---|---|
| P1 | `101 ∥ 102 ∥ 103 ∥ 104 ∥ 105 ∥ 106` | W1 内文件不相交（`definition.ts` / `registry.ts` / `providers.ts` / 只读探针）；`106` 只读探针**不落版本库** |
| P2 | `107 ∥ 108 ∥ 109` | 同文件 `pipeline.ts` 不同函数体 ⇒ 保守做法为**串行**；仅在实现者确认无冲突时并行 |
| P3 | `116 ∥ 118` | `obligation-table.ts` 与 `design-contract.test.ts` 不相交 |
| P4 | `121 ∥ 122`（准备阶段） | `121` 体积登记为 `122` 收尾的前置 ⇒ **保守串行** |
| P5 | `124 ∥ 125 ∥ 126 ∥ 127` | 本地只读 op 各自执行体 + 各自既有单一入口，文件不相交 |
| P6 | `134 ∥ 136` | `stream-model.ts` 与 `sidepanel.ts`（`submitSecret`）不相交；`135` 依赖 `134` |
| P7 | `141 ∥ 142`（准备） | `op.revoke` 与三表回滚同 op 面 ⇒ **保守串行** |
| P8 | `145 ∥ 148` | `settings/ops.ts` 与 `authorize-chip-wiring.test.ts` 不相交 |
| P9 | `154 ∥ 155`（准备） | 同文件 `law8-plaintext.mjs` ⇒ **保守串行** |
| P10 | `163 ∥ 164 ∥ 165` | `index.html` / `statusbar.ts` / `view-model.ts`+`risk-rail.ts` 不相交；`166` 依赖三者 |
| P11 | `167 ∥ 170` | `sidepanel.ts` 与 `density-thresholds.test.ts` 不相交 |

> **硬约束**：`test` / `test:ui` / `test:binding` **绝不并发**（一次一个 Chromium，`finally` 自清 profile，1.5 GB 机器 OOM 前科）；日志 `tee` 全量落盘（禁截断）。

---

## 6. 门禁守恒总表（24 门禁，**计数只增不减**）

> 基线引自父 `spec.md §9.5`（源自 v4.5 收口总账 §3.1）；每叶收尾（`122` / `152` / `176`）逐项对账。

| 门禁 | 基线 | 本 Feature 目标 | 主责任务 | 门禁 | 基线 | 本 Feature 目标 | 主责任务 |
|---|---:|---|---|---|---:|---|---|
| `npm test` | 1045 | **≥1045** | `122`/`152`/`176` | `test:l0` | 244 | **≥244** | `169` |
| `test:density` | 232 | **≥232** | `169`/`171` | `test:ui`（journey） | 171 | **≥171** | `169`/`173` |
| `test:stream` | 63 | **≥63** | `158`/`151` | `test:ask-auth` | 61 | **≥61** | `151` |
| `test:recommendation` | 59 | **≥59** | `115` | `test:binding` | 192 | **≥192** | `140`/`152` |
| `test:insight` | 116 | **≥116** | `151` | `test:page-input` | 108 | **≥108** | `169` |
| `test:ref-pick-wiring` | 11 | **≥11** | `115`/`147` | `test:design-contract` | 6 | **>6**（F+G 双侧） | `118`/`119` |
| `test:supersession` | 35 | **≥35** | `119`/`172`/`175` | `test:gate-integrity` | 13 | **≥13**（新门禁受审） | `114`/`117`/`155`/`162`/`175` |
| `test:zero-injection` | 27 | **≥27** | `155` | `test:size-ruling-vol3` | 12 | **≥12** | `174` |
| `test:l1` | 116 | **≥116** | `122` | `test:l2` | 74 | **≥74** | `122`/`176` |
| `test:hardening` | 24 | **≥24** | `122` | `test:l1-reverse` | 9 | **≥9** | `122` |
| `test:l2-reverse` | 10 | **≥10** | `122` | `e2e` | PASS | **PASS** | `176` |

**新增门禁（须纳入 `test:gate-integrity` 受审集合，`≥13` 只增）**：

| 新门禁 | 文件 | 主责任务 |
|---|---|---|
| 注册表往返 / 契约 v2 七点 | `test/next-registry.test.ts` | `102`–`104` |
| 义务表一致性（注册表 ↔ 义务表） | `test/next-obligation-table.test.ts` | `117` |
| 分发器 diff = 0 | `test/next-dispatch-diff0.test.ts` | `114` |
| 逐 op 布线（单一调用点 + 零 `requestTurn`） | `test/op-wiring.test.ts` | `147` |
| SW 镜像同源 | `test/sw-op-mirror.test.ts` | `132` |
| `op-*` type-only / `KIND_SET` 零新增 / `content.js` 逐字节 | `test/op-protocol.test.ts` | `130` |
| 死端守护（5 类 + N = 0 + 死端 = 0 + 双向反证 + S2） | `test/ui/no-dead-end.mjs` | `159`–`161` |
| 法八四面零明文 | `test/ui/law8-plaintext.mjs` | `154`/`155` |

---

## 7. 停机规则（9 条；违任一条 ⇒ **停下上报编排器**，禁静默弱化）

| # | 触发条件 | 动作 |
|:--:|---|---|
| 1 | `content.js` / `pick-layer.js` 任一**逐字节 ≠ 基线** | 立即停机（红线 N1 / N2 零容差） |
| 2 | `manifest.json` 出现**任何 diff** | 停机（N8 / `ADR-V5-004`：首批 0 项新增；机制预留不是放开） |
| 3 | `KIND_SET` 内容**新增任一字符串** | 停机（N6 / X2；改走 type-only） |
| 4 | F 契约 4 常量任一被替换 / 60 行映射被改写 | 停机（N21 / `NG-ALLN-010`） |
| 5 | journey 保护段**既不能保段、八步亦未获批**，或 binding 段前等长补偿不可行 | 停机上报（`ADR-V5-012 §2` / SG-2 结论 = `report-to-orchestrator`） |
| 6 | 反证**恒绿**（注入后仍 PASS）⇒ 判据空转 | 停机；重写注入点（禁「删属性充数 / 换口径充数」） |
| 7 | 体积越**绝对上限 563,200 B** | 停机（硬墙）；不得自行放宽 |
| 8 | 任一门禁计数 **< 基线**（除保护段显式取代且已留痕） | 停机；还原并重锚 |
| 9 | 任一 task 的**红线检查点**被触碰（`F*` / `T-*` / `L-*` / `C-*`） | 停机；回退该波（波内自成原子区间，**不跨波回滚**） |

---

## 8. 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建（F-32 父 `tasks.md` v1.0：**3 叶 × 19 波 × 76 任务**（`TASK-V5-101~176` 三叶连续编号）+ §0 结构登记与模板偏差登记 + §1 波次总表 19 波 + §2 三叶任务索引 76 条 + §3 跨切红线映射（N22~N25 / X1~X6 / 四类共享面恰一次）+ §4 **体积预算逐叶分摊对照表（Σ 17,600 B）** 与越限分级预案 + §5 关键路径 / 4 个 spikeGate / 11 组并行 + §6 24 门禁守恒总表与 8 个新门禁 + §7 停机规则 9 条。**本轮只做 tasks**：零 `src` / `test` / `dist` / `docs` / `design` / ROADMAP 改动；未跑门禁 / 构建 / Chromium；未调用任何受管 Provider（routing.v1 = `local_or_compute → none`） | 2026-09-22 | SDDU Tasks Agent |
