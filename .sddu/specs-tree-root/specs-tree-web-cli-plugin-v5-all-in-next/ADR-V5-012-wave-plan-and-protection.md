# ADR-V5-012: 波次与实施序（3 叶 W 波 + 保护段第三次取代预案 + binding 避让）

## 状态
ACCEPTED

## 背景

父 spec §14：父 Feature = 轻量规范容器（不承接 build/tasks.json），实施由 **3 叶依存序串行**承接（F-32）。FR-ALLN-004 要求四类共享面（体积五要素 / journey 结构重锚 / `design-contract` 登记 / 取代台账八步）**恰一次登记**。

保护 pin（`docs/v4-supersession-ledger.json#protectedRanges`，本轮实测）：

| 段 | 文件 | 字节区间 | sha256 | 行数 | 现状 |
|---|---|---|---|---:|---|
| journey | `test/ui/journey.mjs` | `43054..58287` | `cc79f413…` | 240 | `active`（`supersessionChain` **3 链节**：`6b45c3fa…`→`e2b500df…`→`cc79f413…`） |
| binding | `test/ui/binding.mjs` | `107780..115930` | `be9ad0e9…` | — | `decision = keep` |

- journey 保护段内容（本轮实测字节上下文）：`const layout = await evaluate(sp, …` 起的**布局 / 高度比 / 密度 / 无水平溢出 / 回到底部**块，**止于 `#15q`**（320px 窄屏无水平溢出）。状态栏高度变化（`#auth-state`）**可能进入该段的测量**。
- binding 保护段内容：`#22a~#22j` 命令级覆盖链 + `#22l` 权限被拒恢复。

## 选项

| 选项 | 形态 | 优点 | 缺点 |
|---|---|---|---|
| **A 3 叶各自 W 波 + 共享面恰一次收口 + journey 保段优先 / 必要时第三次八步 + binding 字节中立避让**（选） | 依赖序清晰；保护段策略显式 | 需要显式登记「保段 or 取代」二选一 |
| B 不设 W 波、按文件排任务 | 灵活 | tasks 阶段无法并行度评估；共享面重复登记风险 |
| C 直接规划 journey 第三次取代 | 一步到位 | 无实测依据（可能保段可成）；徒增台账链节 |

## 决策

**采用 A**。

### 1. 三叶 W 波（供 tasks 参考，**非需求**）

**v5-1（首叶）** —— 机制层：

| 波 | 内容 |
|---|---|
| W1 | Definition（接口 / 常量 / `NEXT_SERVICES` / `MOUNT_MODE` / `BLOCKED_TERMINALS`）+ registry（validate / topo / resolveOrder / register·unregister·overwrite） |
| W2 | 管线四态机制（`runOp` / `pendingOps` 队列 / 快照回滚语义位） |
| W3 | `ACT_TO_OP` + chip `data-op` + `handleCardAction` 瘦身（**先证明 diff = 0**）+ 4 门禁等价重锚 |
| W4 | 义务表 + 一致性机核 + 双契约（F 保留 + G 新增 + `designContractChanges` 登记） |
| W5 | 阻塞态枚举单源 + `site.unauthorized` 常驻候选（去 `firstRun`）+ 体积五要素（本叶增量）+ 收尾全门禁 |

**v5-2（次叶）** —— 功能层：

| 波 | 内容 |
|---|---|
| W1 | 本地只读 5 op（`op.pick` / `op.describe` / `op.rebind` / `op.help` / `op.turn`）——先证管线 |
| W2 | `op.authorize`（特权 op + SW 执行器 + `op-*` type-only + 两段握手） |
| W3 | `op.llm-config`（`secret` 扩形 + 值直达 key-store + 凭据表快照回滚） |
| W4 | `op.perm.request`（`form` 扩形 + `optional_permissions` 最小集 + 原生弹窗 + 双固化） |
| W5 | `op.revoke`（高风险确认 + **三表**整体回滚 + 审计入口） |
| W6 | settings 4 类收编 + 逐 op 单一调用点布线门禁 |
| W7 | S2 断流全链首验收 + X1/X2 门禁重锚 + 体积五要素（本叶增量）+ 收尾全门禁（含 `KL-N-10` 纪律） |

**v5-3（末叶 / 收口叶）** —— 形态与判据层：

| 波 | 内容 |
|---|---|
| W1 | 法八四面零明文机核（判据先立） |
| W2 | `error` 出生带恢复区 |
| W3 | 死端守护门禁（复用 v5-1 枚举单源 + v5-2 断流样本） |
| W4 | 授权 chip（两态 + 零双写五条 + 黄 / 绿点击；**与 rail / 工具栏同步改口径**） |
| W5 | `data-narrow` + `ResizeObserver` + 三档 radio 零残留判据 |
| W6 | 密度登记格口径解耦 + 台账重锚（X5 等价重锚 + 逐格留痕） |
| W7 | **共享面收口**（体积五要素三叶合计 / journey 保护段 / 双契约 / 取代台账一致性）+ 收尾全门禁 |

### 2. journey 保护段：**保段优先**，必要时第三次八步取代

- **保段策略（首选）**：`#auth-state` 与 `#risk-chips` 采用**同一行 `flex-wrap`**（ADR-V5-006）⇒ 状态栏高度**尽量不新增行** ⇒ `#region-stream` 高度比保持 ≥0.65 ⇒ 保护段测量值不变 ⇒ **保段**（sha `cc79f413…` + `startByte 43054` 双不变）。
- **若 Chromium 实测证明行高变化导致 `#15b` 越限** ⇒ 走**第三次八步显式取代**：
  ① 记录 old（`cc79f413…` / 240 行）；② 逐段决策；③ 同编号等价改写；④ 登记 `modifiedRanges[]`；⑤ 写入新 pin；⑥ **计数守恒 ≥171**；⑦ `redlineRemap[]` 追加；⑧ RP-V4-08 反证（段内 1 byte 必红 / 段外不红 / 逐字节还原）；`supersessionChain[]` 追加**第 4 链节**（`supersededFrom` 指直接前驱 `cc79f413…`）。
- **必须显式二选一**：收口报告须明写「保段（sha 不变）」或「第三次取代（链节 + `redlineRemap[]`）」，不得含糊（FR-ALLN-122 / AC-ALLN-018）。

### 3. binding 保护段：**保段**（字节中立避让）

- binding 段 `107780..115930` / `be9ad0e9…` **逐字节零改动**。
- **避让手法**：4 类收编（ADR-V5-005）**不改** `#authorize` / `#rebind` 的 DOM 与 id，也不改段内的监听器行；改动落在**函数体**（`authorizeCurrentSite` / `rebindCurrentTab`，均在 binding 段**之外**）与新增的 `dispatchOp`。⇒ 段内 `() => authorizeCurrentSite()` 等行**逐字节不变**，而行为经函数体转向 op 管线。
- 段**外**读授权 / 站点面 / 状态栏的断言**等价改写 + 逐行登记**（`modifiedRanges[]`）。

### 4. 共享面「恰一次」登记（FR-ALLN-004）

| 共享面 | 登记叶 | 形式 |
|---|---|---|
| 体积五要素 | 各叶登记自身增量；**收口合计在 v5-3** | `SIDEPANEL_BASELINE_BYTES_TIMELINE` 只追加 + metafile 归因 |
| `design-contract`（G 新增） | **v5-1** | `G_*` 常量 + `designContractChanges` 条目 |
| journey 结构重锚 | **v5-3**（收口叶） | 保段或第三次八步留痕 |
| 取代台账八步 | **v5-1**（X3/X4/X6-chip）+ **v5-2**（X1/X2）+ **v5-3**（X5）**各登各的条目**，台账文件**只追加** | `modifiedRanges[]` / `redlineRemap[]` / 密度台账 |

⇒ 「两叶各改一次同一条目」被禁止；`test:supersession ≥35` + `knownGap` 一致性（FR-ALLN-123）机核。

### 5. 门禁串行纪律（N13 / N18 / R-ALLN-015）

`test` / `test:ui` / `test:binding` **绝不并发**（一次一个 Chromium，`finally` 自清 profile）；新门禁（`no-dead-end.mjs` / `law8-plaintext.mjs` / 注册表往返 / 义务表一致性 / 分发器 diff=0 / 逐 op 布线）纳入 `test:gate-integrity` 受审集合（`≥13` 只增）；首轮异常隔离复跑 ≥2、日志全量、仍红如实登记不阻塞收口。

## 后果

**正面**：3 叶依赖序清晰；共享面恰一次；保护段策略显式（保段优先，取代留痕）；binding 字节中立避让。

**代价 / 风险**：R-ALLN-010（保护段第三次取代，中高）未消除但**受控**（保段优先 + 八步路径既定）；若取代，台账工作量集中在 v5-3。R-ALLN-015（环境性 flake）由串行 + 隔离复跑纪律覆盖。

## 影响 FR

FR-ALLN-002 / 004 / 116 / 120 / 121 / 122 / 123 / 124 / 125；N11 / N12 / N13 / N15 / N18；AC-ALLN-018 / 019 / 020 / 021 / 025。

## 回滚

波次划分是**计划**（零字节）；若某波失败，按波回滚（每波内改动自成原子区间），**不跨波回滚**。journey 保段若成立则无取代可回滚；若已取代，则按台账八步的**反向**路径（保留 `supersessionChain` 新链节，追加 `reverted` 说明，不改历史 pin）。
