# 任务分解：specs-tree-web-cli-plugin-v55-f-scope-governance（web-cli-plugin v5.5.1「范围治理：引用即范围」；父 Feature 统领性任务总览）

> **文档定位**: SDDU 任务清单（**父 / 跨切总览与索引**）— 记录 **7 波总表**、**2 叶 45 任务索引**、跨切红线（`N-SGO-001~030` / `T1~T13` / `X-SGO-1~7` / 共享面）→ 任务映射、**体积分列预算逐叶分摊对照表（A 列 Σ 9.5~14.5 KB / B 列 Σ 8.0~13.0 KB）**、共享面「恰一次」登记、S0′ 双面落点、spikeGate 结论义务、新增 / 升级门禁清单与门禁守恒总表、停机规则、以及 build / review / validate 二维时序。**本文件不含可执行任务正文**（父为轻量规范容器，不承接 build / review / validate；任务正文见 2 叶 `tasks.md` / `tasks.json`）
> **前置依赖**: 本目录 `plan.md` v1.0（跨切契约 + `ADR-SGO-001~008` 索引 + §7.2 体积分列预算 + §7.3 7 波骨架 + §7.4 体积可行性结论 + §8 PD-SGO-001~007 裁决）+ `spec.md` v1.0（**88 FR / 14 NFR / 22 EC / 26 AC / 22 NG / §12 X-SGO-1~7 / §13 N-SGO-001~030 / §9.5 门禁基线 / §14 2 叶拆分**）+ `discovery.md` v1.0 + 2 叶 `plan.md` v1.0 + 2 叶 `spec.md` v1.0
> **创建人**: SDDU Tasks Agent
> **创建时间**: 2026-09-24
> **版本**: v1.0
> **更新人**: SDDU Tasks Agent
> **更新时间**: 2026-09-24
> **更新说明**: 初始创建（父总览：**2 叶 × 7 波 × 45 任务**（`TASK-V55F-101~129` / `201~216`，两叶连续编号）+ 跨切红线 → 任务映射 + **体积分列预算逐叶分摊 + 波内登记点** + 共享面「恰一次」登记 + **S0′ 双面落点表** + 3 个 spikeGate + **新增 4 门禁 / 升级 12 门禁清单** + 门禁守恒总表 + 停机规则 + 二维时序）

---

## 0. 结构登记（**2 叶 Feature**）

| 项 | 内容 |
|---|---|
| 父 Feature 定位 | **轻量规范容器**（父 `spec.md §14.1`）：`depth=1`；**不承接** build / review / validate；`childrens` 结构不变 |
| 叶数量 | **2 叶**（`depth=2` / `leaf:true` / `deliveryOrder` 1..2 / 链式 `dependsOn`） |
| 交付顺序 | `specs-tree-v55f-1-ref-context-and-anchor` → `specs-tree-v55f-2-batch-consent`（**串行**，叶间不可并行，父 `spec.md §14.1`） |
| 为何 4 波 + 3 波 | 沿用父 `plan.md §7.3` 骨架：v55f-1 = **4**（口径与载荷 → 读数/法九/越界拦 → 锚定/失配 → S0′/台账/体积）；v55f-2 = **3**（边界先行 → 计划/指纹/准入/零明文/中止 → 二择/S0′ 批量段/台账/体积） |
| 本轮父产物偏差 | 父产出 `tasks.md` / `tasks.json`（**总览型：0 条可执行任务**）—— 父 `spec.md §14.1` 未列出父 `tasks.json`；与 v4 / v4.5 / v5 / v5.5 先例同口径**显式登记**，可整篇作废而不牵连叶（叶对父的引用 = 「父 FR/AC + `ADR-SGO-0xx` 编号」，不依赖父 `tasks` 物理存在性） |
| ADR 所有权 | `ADR-SGO-001/002/003` → v55f-1；`004` → v55f-2（`005` 叶1 读数底座 + 叶2 二择卡）；`006` 叶1 双面 + 叶2 批量段；`007` 各叶各登各的增量 + 叶2 收口合计；`008` 两叶各落各项 |
| 编号空间 | `TASK-V55F-1xx`（叶1 `101~129`）/ `TASK-V55F-2xx`（叶2 `201~216`）；与 `TASK-001~040` / `TASK-2xx~3xx` / `TASK-4xx` / `TASK-5xx~8xx` / `TASK-V45-1xx` / `TASK-V5-1xx` / `TASK-V55-1xx~320` **零冲突** |
| 波次 | **7 波**（`W01~W07` 全局波序）；叶内 v55f-1 `W1~W4` / v55f-2 `W1~W3` |

### 0.1 模板偏差登记（**任务数 > 15**）

| 项 | 内容 |
|---|---|
| 模板建议 | agent 模板 §5.4 / §8「任务数量控制在 5~15 个之间」 |
| 本轮实际 | **45**（29 / 16），分落 2 叶；叶1 29（> 15）、叶2 16（略超 1） |
| 理由 | ① 编排器任务书明定「按父 `plan.md §7.3` 的 **7 波骨架**分配」；② 过并会破坏「**每任务独立可验证**」；③ 与 v5.5 父先例（61）/ v4.5 父先例（19）同口径显式登记；④ 45 = **可原子执行单元**（≈1 文件内 1 项可验证改动 + 其判据），**不是** LLM 调用数；⑤ 父 `plan.md §7.3` 估 ~46 ⇒ 45 对齐 |

### 0.2 spikeGate 命名偏差登记

父 `plan.md` / `ADR-SGO-001~008` **未命名** spikeGate 代号。本轮按**编排器任务书**指定的 `SG-SGO-01~03` 落为**先验闸门**（tasks 阶段新增，**显式登记**），探针产物**不落版本库**。叶2 **无** spikeGate（「边界先行」由 W1 注入反证先落承载）。

---

## 1. 波次总表（7 波 · 2 叶串行）

| 全局波 | 叶 | 叶内波 | 名称 | 任务 | 任务数 | 规模 |
|:--:|:--:|:--:|---|---|:--:|---|
| **W01** | v55f-1 | W1 | 口径与载荷（type-only refs + 系统段组装 + **SG-SGO-01**） | `101`–`108` | 8 | S×2 / M×5 / L×1 |
| **W02** | v55f-1 | W2 | 读数单源 + 法九（**SG-SGO-03**）+ 越界拦 + 留痕 | `109`–`115` | 7 | M×6 / L×1 |
| **W03** | v55f-1 | W3 | `--ref` 锚定包装（**SG-SGO-02**）+ 失配 EC + 失效可判 | `116`–`121` | 6 | M×6 |
| **W04** | v55f-1 | W4 | S0′ 双面 + X 台账 + 门禁治理 + 体积重登记（收口轮） | `122`–`129` | 8 | M×5 / L×3 |
| **W05** | v55f-2 | W1 | **边界先行**：RL-06 / OT-⑩ 批量变体注入必红 + 特权不入批 | `201`–`205` | 5 | S×1 / M×4 |
| **W06** | v55f-2 | W2 | 计划结构 + 指纹 + 准入/回落 + 零明文 + 中止 | `206`–`212` | 7 | M×6 / L×1 |
| **W07** | v55f-2 | W3 | WIDEN 二择 + S0′ 批量段 + 台账 + 体积收口（收口轮） | `213`–`216` | 4 | M×3 / L×1 |
| **合计** | 2 叶 | — | — | `TASK-V55F-101~216` | **45** | **S×3 / M×34 / L×8** |

**跨叶次序**：`W01~W04`（v55f-1 全绿 / `validated`）→ `W05~W07`（v55f-2）。叶间**硬串行**（v55f-2 的「计划内 / 计划外」以 v55f-1 的**范围读数**与**锚定解析**为唯一判据，R-SGO-920）。

---

## 2. 两叶任务索引（45 条；正文见各叶 `tasks.md`）

### 2.1 v55f-1 `specs-tree-v55f-1-ref-context-and-anchor`（**29 · `TASK-V55F-101~129` · 4 波**）

| 任务 | 波 | 规模 | 标题 | 关键判据 / 门禁 |
|---|:--:|:--:|---|---|
| `101` | W1 | M | **SG-SGO-01** 载荷链可行性三断言探针 | `KIND_SET` 40 / `requestTurn(` 恰 2 / 零新通道 |
| `102` | W1 | S | `messaging.ts` type-only `ChatRefFact` / `ChatRefTurnPayload` | 7 字段 / `KIND_SET` 40 |
| `103` | W1 | M | `l1/ref-scope.ts` 快照投影 + 形状 + 掩码口径 | `turnRefsOf` 恰一处 / 凭据掩码 |
| `104` | W1 | L | `sidepanel.ts` `requestTurn` 唯一构建点 + `ref-store` 只读 | `requestTurn(` 恰 2 / 零引用字段缺席 |
| `105` | W1 | S | `ref-turn.ts` 活跃引用单源 | 每回合 set/clear / 零跨回合漂移 |
| `106` | W1 | M | `ref-context.ts` 追加段 + 载荷校验 | 无引用 ⇒ `''` / 基座逐字 |
| `107` | W1 | L | `service-worker.ts` 读 refs + 签名 + 系统段工厂 + `turn-queue.refs` | `system: () => 基座 + 追加段` |
| `108` | W1 | M | `test/ref-context-in-turn.test.ts`（新门禁） | `ref-context-in-turn` |
| `109` | W2 | M | **SG-SGO-03** 法九双向反证可机核探针 | 去注入 ⇒ `no-ref` 必红可构造 |
| `110` | W2 | M | `SCOPE_READINGS` 4 值 + `scopeReading` 唯一判定 | 单源 / 两路命中 / 第二声明 FAIL |
| `111` | W2 | M | 越界拦：confirm 面范围闸（fail-closed + 可达 next） | `no-dead-end` / 判定链零触碰 |
| `112` | W2 | M | 留痕单源 + 零值纪律 | 字段名 + 机器枚举 / 零值 |
| `113` | W2 | L | `test/law9-scope-reading.test.ts`（新门禁，`L9-1~8`） | `law9-scope-reading` |
| `114` | W2 | M | 法九双向反证族 + 逐字节还原 | 注入 ⇒ FAIL ⇒ sha256 还原 ⇒ PASS |
| `115` | W2 | M | X-SGO-5 等价重锚（deny 方向逐字不动） | `l1-ref-validity` / `l1` / `page-input` |
| `116` | W3 | M | **SG-SGO-02** 包装 base 零 diff + live 闸复用探针 | `insight-no-escalation` / `observeIdentity` 单源 |
| `117` | W3 | M | `ref-observe.ts` `observeIdentity` 单一实现 | `nodeCount === 1` 唯一通过 |
| `118` | W3 | M | `src/tools/dom-anchor.ts` `wrapDomEntryForAnchor` | `risk` 不放宽 / base 零 diff |
| `119` | W3 | M | `browser-tools.ts` 接线包装层 | `insight-no-escalation` 绿 |
| `120` | W3 | M | 失配 EC 家族 + 失效可判 | EC-SGO-001~004 / 015~017 非静默 |
| `121` | W3 | M | `test/dom-ref-anchor.test.ts`（新门禁） | `dom-ref-anchor` / risk 降档注入必红 |
| `122` | W4 | L | S0′ 样本单源扩展 `test/ui/fixtures/s0-chain.mjs` | 样本单源 / 既有 10 环节逐字 |
| `123` | W4 | L | S0′ node 面（`S0P-1~8`） | 改写处数 ≤ 引用数 / 双向反证 / 如实交代 |
| `124` | W4 | L | S0′ Chromium 面（只加断言不加文件） | 恰 1 处命中 / `CHROMIUM_GATES === 9` |
| `125` | W4 | M | X-SGO-1/2/3 台账 + X-SGO-7 未发生 + `op-wiring` 复合读数 | `supersession` / `op-wiring` |
| `126` | W4 | M | 红线巡检：base 零 diff + 三冻结面 + 判定链 | `insight-no-escalation` |
| `127` | W4 | M | 法八四面只增 + 留痕零值扫描 | `test:law8`（36 零降级） |
| `128` | W4 | M | 门禁治理收口（受审集合下界只增） | `gate-integrity` / `CHROMIUM_GATES === 9` |
| `129` | W4 | M | 体积逐叶重登记 + 本叶收口 | `test:size-ruling-vol3` / 五要素 / EC-SGO-022 二态 |

### 2.2 v55f-2 `specs-tree-v55f-2-batch-consent`（**16 · `TASK-V55F-201~216` · 3 波**）

| 任务 | 波 | 规模 | 标题 | 关键判据 / 门禁 |
|---|:--:|:--:|---|---|
| `201` | W1 | M | RL-06 扩批量变体（AI 代答计划 ⇒ 必红） | `supersession` / N-SGO-025 |
| `202` | W1 | M | OT-⑩ 扩批量变体（`tierOf` 逐 op 不变） | `op-three-tier` |
| `203` | W1 | M | 特权 op 不入批机核 + SW 永不 `.request(` | `capability-wiring` |
| `204` | W1 | S | 载体零新增（type-only + 复用 `auth` kind） | `host-registry` / `KIND_SET` 40 |
| `205` | W1 | M | `test/batch-consent.test.ts` 骨架（`BC-1~7`） | `batch-consent` |
| `206` | W2 | M | `batch-plan.ts` 计划结构 + `buildPlan`（系统聚合） | N≥2 / N==1 / N==0 / 单条消息边界 |
| `207` | W2 | M | `planFingerprint`（逐字节入哈希、摘要出账） | 含文本对 / 空白改动指纹变 |
| `208` | W2 | M | `admitEntry` + 准入 / 计划外回落 / 漂移 | 计划内放行 / 外回落 / 漂移显式失败 |
| `209` | W2 | M | `service-worker.ts` 批次捕获 + 计划 holder + 桥接线 | 回调内恰一处 / `requestTurn(` 仍 2 |
| `210` | W2 | L | `security/confirm.ts` 计划感知桥 | 零明文审计 / 单条路径逐字不变 |
| `211` | W2 | M | 计划卡渲染（渲染用字段 + 计划行 + 掩码） | `law8-plaintext` / 非 payload / 8 行上限 |
| `212` | W2 | M | 中止 + 部分完成如实 + 逐条保留 | `no-dead-end` / `cancelled` / 6 终态 |
| `213` | W3 | M | WIDEN 二择接线 + 转值 + 批量留痕 | `no-dead-end` / AI 自填 authorized 必红 |
| `214` | W3 | L | S0′ 批量段（`S0P-B1~B3`） | 一次手势 / 计划外回落 / 二择 / 只加断言 |
| `215` | W3 | M | X-SGO-4/6/7 台账 + 法八批量零明文只增 | `supersession` / `test:law8` |
| `216` | W3 | M | 体积本叶重登记 + 本叶收口 | `test:size-ruling-vol3` / `gate-integrity` / `e2e` |

---

## 3. 跨切红线 → 任务映射

### 3.1 `N-SGO-001~030` 红线 → 守线任务

| # | 红线（要点） | 守线任务 | 判据 |
|---|---|---|---|
| `N-SGO-001/002` | `content.js` 177,076 B / `pick-layer.js` 34,358 B（零容差） | `126` | `stat` + sha256 双锚 |
| `N-SGO-003/004` | 生效上限 607,554 / 档位 614,400 / 绝对 675,840；`cap = record-only` | `129` / `216` | 三值同源前移 + 二态显式 |
| `N-SGO-005` | 特权 op 恰 2 恒 `gesture`；SW 永不 `.request(` | `203` / `202` | `capability-wiring` / `op-three-tier` |
| `N-SGO-006` | consent 不得被 AI 代答（含批量变体） | `201` / `203` / `211` | RL-06 / OT-⑩ 扩批量注入必红 |
| `N-SGO-007/008` | base 零 diff / 判定链零触碰（`zeroDiffFiles` 9 项） | `119` / `111` / `126` | `insight-no-escalation` + 哈希 pin |
| `N-SGO-009/010` | `KIND_SET` 40 / 12 kind / 零宿主 | `102` / `204` | 长度断言 + `host-registry` |
| `N-SGO-011` | 法八四面零明文不退化 | `127` / `211` / `215` | `test:law8` 36 零降级 |
| `N-SGO-012` | 法七不退化（5 类阻塞必有可达 next，死端 = 0） | `111` / `212` / `213` | `no-dead-end` ≥49 |
| `N-SGO-013` | 不新增终态字面量（读数承载） | `110` / `215` | 第二声明 FAIL / X-SGO-6 如实登记 |
| `N-SGO-014` | 主流程调用点计数（`requestTurn(` 恰 2） | `104` / `107` / `209` / `125` | `op-wiring` 原判据不改 |
| `N-SGO-015` | 断言零删除零降级、计数只增 | `125` / `128` / `129` / `215` / `216` | 计数对账无减少项 |
| `N-SGO-016` | 保护 pin（journey / binding） | `129` / `216` | 保段优先 / 八步取代 |
| `N-SGO-017` | 门禁串行；`CHROMIUM_GATES === 9` | `128` / `216` | `gate-integrity` |
| `N-SGO-018/019` | 纪律（不碰 main / force push / path-limited / 无新依赖 / F-29 不动） | §16 执行纪律（各叶 build / validate 记录） | 纪律表逐条 |
| `N-SGO-020` | v5.5 / R6 产物零改写 | `129` / `216` | 只追加登记 |
| `N-SGO-021` | `KL-N-10` 处置（隔离复跑 ≥2、如实记录） | `128` / `216` | 执行记录 |
| `N-SGO-022` | 开放点不得被顺手定下 | `110` / `211` / `216` | PD-SGO-001~007 已全裁决 |
| `N-SGO-023` | `pending-author-line` 不得伪称已确认 | `129` / `216` | 读值断言 |
| `N-SGO-024` | 法九必绿且禁恒真；三段控制 | `113` / `114` | `ok` / `violated` / `n/a` |
| `N-SGO-025` | 批量卡不得 AI 代答 / 代填 / 自动放行 / 自动展开 | `201` / `211` / `213` | 注入必红 |
| `N-SGO-026` | 计划清单零明文口径（仅 UI 渲染文本 + 掩码） | `211` / `215` | 非 payload + 26 零明文 |
| `N-SGO-027` | `--ref` 不得进 base；risk / 子命令不放宽 | `118` / `121` | 逐字段对照 + 降档注入必红 |
| `N-SGO-028` | 范围读数唯一声明（第二声明 ⇒ FAIL） | `110` / `113` | `law9-scope-reading` `L9-1` |
| `N-SGO-029` | 无引用回合零漂移（系统段 == 基座） | `106` / `108` / `123` | 逐字 baseline |
| `N-SGO-030` | 升档须作者一行 | `129` / `216` | EC-SGO-022 路径可追溯 |

### 3.2 `X-SGO-1~7` 显式取代 → 任务映射（**等价重锚，不是放宽**）

| X | 处置 | 承载任务 | 台账动作 |
|---|---|---|---|
| `X-SGO-1` | `chat` 载荷 → 允许携带引用上下文（type-only；两入口同口径）；`requestTurn(` 仍恰 2 | `102` / `104` / `108` / `125` | `modifiedRanges[]` 只增 |
| `X-SGO-2` | 系统段 → 常量基座 + 每回合追加段（基座逐字） | `106` / `107` / `108` / `125` | `modifiedRanges[]` + 新 node 门禁入受审 |
| `X-SGO-3` | base 零 ref → plugin 侧包装（基线 executor 仍被调用）；base 零 diff 不解冻 | `118` / `119` / `121` / `125` | `modifiedRanges[]`（`src/tools/**`） |
| `X-SGO-4` | 逐条 → 任务级批量授权；`RL-06` / OT-⑩ **扩批量变体注入必红** | `201` / `202` / `205` / `215` | `modifiedRanges[]` + `redlineRemap[]` |
| `X-SGO-5` | 增设「作为范围锚」解析读数；`valid/invalid/unknown` deny 方向不动 | `115` | 计数对账 / 只增 |
| `X-SGO-6` | 优先以「读数」承载（不新增终态字面量）⇒ 词汇未扩张 | `215` | **无扩张条目**（如实登记） |
| `X-SGO-7` | 主流程调用点走既有槽扩张（diff = 0）；不得新增调用点 | `125` | **未发生取代**（如实登记） |

> **落地纪律**（FR-SGO-111 / 112）：① 无放宽 / 删除 / 静默改；② 每项判据 ≥1 注入反证（注入 ⇒ FAIL ⇒ 逐字节还原 ⇒ PASS）；③ 判据力逐条对账；④ **未发生取代者（X-SGO-7）与「以读数承载」者（X-SGO-6）如实登记**，不留空、不制造假条目；⑤ **取代与实现同轮完成**（不拆到「下一轮补」）。

### 3.3 不动面 `T1~T13` → 巡检任务

| # | 不动面 | 巡检任务 |
|:--:|---|---|
| `T1` | `src/content/**` / `dist/content.js` / `dist/pick-layer.js` | `126` |
| `T2` | `KIND_SET` 40（`messaging.ts`） | `102` / `126` / `204` |
| `T3` | 判定链（`policy.ts` / `auto-authorize.ts`；`zeroDiffFiles` 9 项） | `111` / `126` |
| `T4` | `manifest.json` | `126` |
| `T5` | `packages/web-cli-base/**` | `119` / `126` |
| `T6` | 12 kind / `STREAM_TERMINALS` 6 / `DRIVER_TERMINALS` 4 / `MAX_OPEN_ASKS=2` / `ASK_CANCEL_REASONS` 4 | `204` / `215` |
| `T7` | 三区法则（工具栏 / 流 / 状态栏） | `124` / `214` |
| `T8` | `F-29` ROADMAP 区段 / `ROADMAP.md` | §16 纪律（F-34 登记留收口） |
| `T9` | v5.5 三叶 `validated` / R6 记录 / `test/size-baseline.ts` 历史条目 | `129` / `216`（只追加） |
| `T10` | `design/**` | §16 纪律（零改动） |
| `T11` | v5.5 的 9 op / `OPS_BY_ID` / `MOUNT_MODE` / `NEXT_SERVICES` 6 / `NEXT_MODES` 2 / `DRIVERS` | `202` / `204` |
| `T12` | 既有门禁（只追加 / 等价重锚；`CHROMIUM_GATES === 9`） | `128` / `216` |
| `T13` | `test/ui/journey.mjs` / `binding.mjs` 保护段 | `129` / `216` |

---

## 4. 共享面「恰一次」登记（`FR-SGO-002/005`）

> **口径**：四类共享面被 ≥2 叶触碰 ⇒ **必须恰一次做完**；禁止「两叶各改一次同一条目」。

| 共享面 | 登记叶 | 承载任务 | 校验 |
|---|---|---|---|
| **体积五要素** | 各叶登记自身增量；**收口合计在叶2** | `129`（叶1）/ `216`（叶2，含两叶 Σ 对照） | `SIDEPANEL_BASELINE_BYTES_TIMELINE` **只追加** + metafile 归因（Σ 逐模块 Δ + 未归因 == 登记增量） |
| **journey 保护段** `43054..58287` / `cc79f413…` | **叶1**（首叶） | `129` | 保段（sha + startByte **双不变**）或八步显式取代（`modifiedRanges[]` + `redlineRemap[]` + 计数守恒 ≥171 + RP-V4-08 反证） |
| **binding 保护段** `107780..115930` / `be9ad0e9…` | **叶1** | `129` | 保段（`decision = keep`）+ 段外逐行登记 + `test:binding` ≥192 |
| **取代台账** | **各叶各登各的条目（文件只追加）**；叶1 登主体，叶2 增条目 | `125`（叶1：X-SGO-1/2/3 + 7）/ `215`（叶2：X-SGO-4/6 + 7 一致性） | `test:supersession` ≥37 + `status ↔ knownGap` 一致性 + X-SGO-6「未扩张」/ X-SGO-7「未发生」如实登记 |
| **`knownGap` 一致性** | **叶1**（首叶承接） | `125` | 本 Feature 未发生取代 ⇒ 该字段为空或仅声明闭环 |
| **人工面清单** | **各叶各登本叶项**（叶1 M1/M4；叶2 M2/M3） | `124` / `214` | 逐项 `⏳ 未执行` / `PASS`；**不得冒充 PASS**；v5.5 人工面零改写 |

---

## 5. 体积分列预算逐叶分摊与波内登记点

> 权威：父 `plan.md §7.2` + `ADR-SGO-007`。`sidepanel.js` 是**唯一**带字节预算的产物；`background.js`（B 列）/ `options.js` / `test/**` **不计入**该账本；C 列（`content.js` / `pick-layer.js`）**零容差**。

**统一前提**：A 基线 **578,623 B** · 生效上限 **607,554 B**（距 **28,931 B**）· 档位 **614,400 B**（距 **35,777 B**）· 绝对上限 **675,840 B** · `authorConfirmation = pending-author-line`（未闭合义务）。

| 列 | 叶1 落地项（A 计账 / B 不计账） | 叶2 落地项 | 预算 |
|---|---|---|--:|
| **A** | `l1/ref-scope.ts`（读数单源 + 快照投影 + 留痕单源）· `l1/ref-store.ts`（只读取用）· `sidepanel.ts`（载荷构建 / 范围闸 / 留痕） | `chat-state.ts`（渲染用字段）· `cards/auth.ts`（计划行）· `sidepanel.ts`（计划 passthrough + 二择） | 叶1 **6.0~9.0 KB** / 叶2 **3.5~5.5 KB** |
| **B**（不计账） | `ref-context.ts` / `ref-turn.ts` / `ref-observe.ts` / `service-worker.ts` / `turn-queue.ts` / `messaging.ts`（type-only）/ `src/tools/dom-anchor.ts` / `src/tools/browser-tools.ts` | `batch-plan.ts` / `security/confirm.ts` / `service-worker.ts`（批次捕获） | 叶1 **5.0~8.0 KB** / 叶2 **3.0~5.0 KB** |
| **C** | **零触碰** | **零触碰** | 零容差 |

| 预算口径 | 叶1 | 叶2 | Σ | +15% 缓冲 | 结论 |
|---|--:|--:|--:|--:|---|
| **A 列（sidepanel 净增）** | 6.0~9.0 KB | 3.5~5.5 KB | **9.5~14.5 KB** | **10.9~16.7 KB** | 距生效上限余量 28,931 B / 距档余量 35,777 B ⇒ **正常口径不触发升档** ✅ |
| **B 列（不计账）** | 5.0~8.0 KB | 3.0~5.0 KB | 8.0~13.0 KB | — | 充分利用（系统段 / `--ref` / 批量判定优先落 SW） |
| **2.8× 最坏（A 列）** | — | — | ≈26.6~40.6 KB | ≈**30.6~46.7 KB** | **可能跨档位 614,400** ⇒ **预置 EC-SGO-022 显式升档 + 作者一行**（**本阶段不触发**） |

**波内登记点与逐叶收口重登记**：
- 叶1 收口轮 `W04` ⇒ `TASK-V55F-129`：A 列本叶实测净增（预算 6.0~9.0 KB）+ 五要素 + V3-VOL-3 三值 + metafile 归因。
- 叶2 收口轮 `W07` ⇒ `TASK-V55F-216`：A 列本叶实测净增（预算 3.5~5.5 KB）+ **两叶 Σ 对照** + 五要素 + 三值 + metafile 归因。

**越限 EC-SGO-022 任务化（逐分支）**：越**生效上限**（607,554）⇒ 显式重登记基线（同源前移，仍不跨档位）；越**档位**（614,400）⇒ 走 EC 显式升档路径 + **作者一行**；越**绝对上限**（675,840）⇒ **停止并请示**；`authorConfirmation` **不得伪称已确认**。

**减体积优先级（越预算时按序执行）**：① 纯记账 / 判定逻辑下移 `background.js`（不计账）；② 元组化声明数据；③ 复用既有文案；④ 复用既有渲染面；⑤ **显式登记**未落地项（**绝不以删判据 / 放宽容差 / 静默降档实现**）。

---

## 6. spikeGate 清单与结论义务

| 代码 | 任务 | 叶/波 | 假设（被验证者） | 被闸门任务 | 结论义务 / 停止规则 |
|---|---|---|---|---|---|
| **SG-SGO-01** | `TASK-V55F-101` | v55f-1 / W1 | **type-only 载荷链可行**：① `chat` 载荷经 `messaging.ts` 单声明承载 refs 且 `KIND_SET` 40 逐字（零运行时字节）② `requestTurn` 唯一构建点覆盖两条入口且 `requestTurn(` 仍恰 2 ③ SW 引用唯一来源 = 回合载荷（零新通道） | `103` / `105` / `107` / `108` | 任一不可行 ⇒ **暂停上报**；**禁**新增引用通道 / 放宽 `requestTurn(` 计数 / 改动 `KIND_SET` |
| **SG-SGO-02** | `TASK-V55F-116` | v55f-1 / W3 | **锚定链可行**：① plugin 侧条目包装可达且 `web-cli-base/**` 零 diff ② `observeIdentity` 可抽为单一实现（同源 import）支撑 live 单节点闸（`nodeCount === 1`） | `117` / `118` / `119` / `121` | 不可行 ⇒ **暂停上报**；**禁**改 `packages/web-cli-base/**` / 放宽 `risk` |
| **SG-SGO-03** | `TASK-V55F-109` | v55f-1 / W2 | **法九可机核**：去注入 ⇒ 读数 `no-ref` **必红可构造**；三段控制 `ok` / `violated` / `n/a` 可达；真源切片可得 | `110` / `113` / `114` | 不可构造 ⇒ **暂停上报**；**禁**以文档 / 提示词 / 恒真断言替代机核（DC-SGO-007） |

**结论义务（全部 3 个）**：spike 结论须以「假设 / 探针方法 / 实跑证据 / 结论（可行 / 不可行）/ 对下游的影响」五要素写入对应叶的 build 记录；**结论 = 不可行 / 不可构造** ⇒ 对应「被闸门任务」**不得开工**，且按停止规则上报（`blockers`）。**探针产物不落版本库**（`test/_spike/` 探毕删除）。

> **叶2 无 spikeGate**：R-SGO-001（唯一红线级）的边界由 `W1` **注入反证先落**承载（RL-06 / OT-⑩ 扩批量变体 + 特权不入批，`TASK-V55F-201~203`），**先红后绿**。

---

## 7. 门禁守恒总表与新增 / 升级门禁清单

### 7.1 新增门禁（**4 门**；`V55F_NEW_GATE_FILES ≥4` 下界只增）

| # | 门禁文件 | 名 | 叶 | 承载任务 | 关键判据 |
|:--:|---|---|:--:|---|---|
| 1 | `test/ref-context-in-turn.test.ts` | 载荷形态 | v55f-1 | `108` | type-only 单声明 / 两入口同构建点 / `KIND_SET` 40 / 基座逐字 / 零引用零漂移 / 凭据掩码 |
| 2 | `test/law9-scope-reading.test.ts` | **法九** | v55f-1 | `113` / `114` | `L9-1~8`（四值单源 / no-ref / in-scope 两路 / unauthorized / authorized / 写闸切片 / 三段控制 / 真源切片）+ 双向反证 |
| 3 | `test/dom-ref-anchor.test.ts` | 锚定 | v55f-1 | `121` | 词法 / 互斥 / 越界 / 单节点闸 / 失配 EC 族 / **risk 不放宽注入必红** |
| 4 | `test/batch-consent.test.ts` | 批量授权 | v55f-2 | `205`~`210` | `BC-1-build` / `BC-2-fingerprint` / `BC-3-admit` / `BC-4-drift` / `BC-5-privileged` / `BC-6-zero-plaintext` / `BC-7-abort` |

> 全部 4 门禁须由 `test/gate-integrity.test.ts` 的自动纳入 + 下界声明（叶1 `V55F_NODE_GATE_FILES ≥3`、叶2 `V55F2_NODE_GATE_FILES ≥1`；`TASK-V55F-128` / `216`）；`CHROMIUM_GATES === 9` **逐字不动**。

### 7.2 既有门禁升级清单（**12 项**，改写 ≠ 删除）

| # | 既有门禁 | 基线 | 升级内容 | 任务 |
|:--:|---|--:|---|---|
| 1 | `op-wiring` | `requestTurn(` 恰 2 | **原判据不改** + 「主流程 diff = 0」复合读数（`maybeRecommend` 1/7 · `nextAfterSettle` 1/10） | `125` |
| 2 | `test/ui/no-dead-end.mjs` | 49 | 越界拦后可达 next + 中止 / 拒绝扩大后零死端（**只增**） | `111` / `212` / `213` |
| 3 | `test:supersession` | 37 | X-SGO-1~7 条目（未发生者如实登记）+ `knownGap` 一致性 + RL-06 扩批量 | `125` / `201` / `215` |
| 4 | `test:gate-integrity` | 19 | `+ V55F_NODE_GATE_FILES ≥3` / `V55F2_NODE_GATE_FILES ≥1` + 受审集合只增 + `CHROMIUM_GATES === 9` | `128` / `216` |
| 5 | `test:law8` | 36 | 引用注入零明文 + 批量计划零明文 + 掩码（**零降级、只增**） | `127` / `211` / `215` |
| 6 | `l1-ref-validity`（+`l1` / `page-input`） | deny 方向逐字 | X-SGO-5 等价重锚（范围锚读数双向反证；旧断言保留） | `115` |
| 7 | `s0-self-driven-chain` / `test/ui/s0-self-driven.mjs` | S0 现有 / 59 | S0′ 双面（`S0P-1~8` + `S0P-B1~B3`）；**只加断言不加文件** | `122` / `123` / `124` / `214` |
| 8 | `insight-no-escalation` | base 零 diff | 三冻结面 + 判定链巡检（原判据不改） | `119` / `126` |
| 9 | `op-three-tier` | `tierOf` 5/2/2 | OT-⑩ 扩批量变体（`tierOf` 逐 op 不变） | `202` |
| 10 | `capability-wiring` | `.request(` 计数 | 批量路径不触达特权 op（计数不减） | `203` |
| 11 | `host-registry` | `REGISTERED_STRUCTURAL_HOSTS === []` | 零宿主不变 + 二择复用 `askuser` | `204` |
| 12 | `size-*` / `test:size-ruling-vol3` | 12 | 五要素重登记 + V3-VOL-3 三值同源 + **两叶 Σ 对照** + 跨档位显式登记 | `129` / `216` |

### 7.3 门禁基线守恒（**只增不减**，`npm test ≥1330`）

`npm test` **1330** · `journey` **171** · `binding` **192** · `s0-self-driven` **59** · `density` **242** · `page-input` **118** · `l0` **248** · `l1` **120** · `l2` **74** · `law8` **36** · `dead-end` **49** · `auth-chip` **37** · `stream` **76** · `ask-auth` **78** · `hardening` **24** · `insight` **116** · `e2e` **PASS** · `design-contract` **60** · `supersession` **37** · `zero-injection` **28** · `recommendation` **72** · `l1-reverse` **9** · `l2-reverse` **10** · `gate-integrity` **19** · `size-ruling-vol3` **12** · `ref-pick-wiring` **11** · `CHROMIUM_GATES` **=== 9**。

> 基线引自父 `spec.md §9.5` / §2.4 E9（R6 记录，**本轮未复跑**）。**唯一例外** = 保护段按台账**显式取代**并留痕（`modifiedRanges[]` + `redlineRemap[]` + 计数守恒 ≥171 + RP-V4-08 反证）。

---

## 8. 停机规则（**10 条**）

| # | 触发 | 动作 |
|:--:|---|---|
| 1 | `dist/content.js` ≠ **177,076 B** / `52a82620…` 或 `dist/pick-layer.js` ≠ **34,358 B** / `77796bab…` | **立即停机**（N-SGO-001/002 零容差） |
| 2 | `manifest.json` / `packages/web-cli-base/**` 出现 diff | 停机（N-SGO-007 / T4 / T5） |
| 3 | `KIND_SET` 内容新增任一字符串（refs 被实现成新 kind） | 停机（N-SGO-009 / R-SGO-902） |
| 4 | 范围读数出现第二声明 / 判定函数散落 | 停机（N-SGO-028） |
| 5 | 判定链（`policy.ts` / `auto-authorize.ts`）内容哈希变化 | 停机（N-SGO-008 / T3 / R-SGO-911） |
| 6 | 反证恒绿（注入后仍 PASS） | 停机；重写注入点（FR-SGO-111） |
| 7 | `SG-SGO-01/02/03` 结论 = 不可行 / 不可构造 | 被闸门任务**不得开工**（见 `blockers`） |
| 8 | 体积越**绝对上限**或静默改档位 / `authorConfirmation` | 停机（硬墙）；升档须**显式**登记（ADR-SGO-007） |
| 9 | 任一门禁计数 < 基线（除保护段显式取代且已留痕） | 停机；还原并重锚 |
| 10 | `tierOf` 档位被改 / 特权 op 被批量化 / 批量卡或二择被 AI 代答 / 计划正文入四面 / 指纹漂移仍放行 | 停机（红线⑥ + 法八；N-SGO-005/025/026） |

---

## 9. 二维时序：build / review / validate 策略（**设计在 build 前可启动**）

> 编排器要求：review / validate 策略**在 build 前**即设计完成（不等到实施后补），形成「叶内波次（横轴） × 三阶段（纵轴）」二维时序。

### 9.1 三阶段在每叶的时序

| 叶 | build（波内） | review（叶收口前） | validate（叶收口） |
|---|---|---|---|
| **v55f-1** | `W01`(口径/载荷 + SG-01) → `W02`(读数/法九 + SG-03) → `W03`(锚定/失配 + SG-02) → `W04`(S0′/台账/门禁/体积) | 判据真空审查（法九**禁恒真**三段控制）+ 单源审计（读数第二声明 / 载荷第二构建点）+ 注入反证完整性（去注入 `no-ref` / risk 降档 / 写闸拦截） | S0′ 双面实跑（`S0P-1~8`）+ 门禁守恒对账 + 保护段双绿 + 漂移检测（`ChatRefFact` 7 字段 ↔ 门禁） |
| **v55f-2** | `W05`(边界先行) → `W06`(计划/指纹/准入/零明文/中止) → `W07`(二择/S0′ 批量段/台账/体积) | 安全边界审查（R-SGO-001 最高危：AI 代答计划 / 自填 authorized / 自动展开）+ 零明文审计（非 payload）+ 计划漂移审查 | BC-1~7 实跑 + S0′ 批量段（`S0P-B1~B3`）+ `e2e` PASS + 两叶 Σ 体积 + 台账对账 |

### 9.2 review 前置判据（build 前已钉死）

1. **禁恒真**：法九每条判据必须可注入违反面 + 三段控制（`ok` / `violated` / `n/a`）。
2. **禁纸面**：读数**单源**（第二声明 ⇒ FAIL）；载荷**唯一构建点**（`requestTurn` 内）。
3. **禁假绿**：S0′ 走**生产模块真源切片**（不用假 provider 跳过真实读数与包装，R-SGO-909）。
4. **禁放宽**：`risk` / `subcommandRisks` 逐字段对照 base + 降档注入必红；`KIND_SET` / 12 kind / 零宿主逐字。
5. **禁代答**：批量卡 / 二择不得 AI 代答 / 代填 / 自动放行 / 自动展开（含「AI 建议即同意」变体）。
6. **禁漂移**：计划 = 真实 `toolCalls`（同源）；批准前漂移 ⇒ 显式失败（不静默按旧指纹放行）。

### 9.3 validate 前置判据（build 前已钉死）

| 判据 | 检查 |
|---|---|
| EXIST | 产物存在 + 无 TODO / 桩 |
| SUBSTANCE | 非空实现 + 长度阈值 + 关键路径覆盖（`L9-1~8` / `BC-1~7` / `S0P-1~8` / `S0P-B1~B3`） |
| ANTI-PATTERN | 反模式检测 + **反证恒绿检测**（注入后仍 PASS ⇒ 缺陷） |
| WIRING | 接线真实（无孤岛）+ 门禁受审集合（`V55F_*` / `V55F2_*` 下界只增）+ 计数只增 |
| DRIFT | 契约漂移（读数 4 值 ↔ 判定函数 / `ChatRefFact` 7 字段 ↔ 门禁 / 计划条目 ↔ 指纹输入 / `tierOf` ↔ 特权 op / 保护段 pin / 两叶 Σ 体积） |

---

## 10. 每叶验收门禁清单（摘要；逐项见各叶 `tasks.md §5`）

- **v55f-1**（W4 收口 `129`）：`typecheck` · `build` · `npm test ≥1330` · **`ref-context-in-turn`（新）** · **`law9-scope-reading`（新）** · **`dom-ref-anchor`（新）** · `op-wiring`（`requestTurn(` 仍恰 2 + 复合读数）· `insight-no-escalation`（base 零 diff）· `test:supersession ≥37` · `test:gate-integrity ≥19`（`CHROMIUM_GATES === 9`）· `test:law8 ≥36`（零降级）· `test:dead-end ≥49` · `l1-ref-validity`（deny 方向不动）· `test:l1 ≥120` / `test:page-input ≥118` · `s0-self-driven ≥59` · `s0-self-driven-chain` · `test:journey ≥171`（保段优先）· `test:binding ≥192`（保段）· `test:l0 ≥248` / `test:density ≥242` · `size-*` + `test:size-ruling-vol3 ≥12` · `content.test.ts`
- **v55f-2**（W3 收口 `216`）：`typecheck` · `build` · `npm test ≥1330` · **`batch-consent`（新）** · `test:supersession ≥37` · `op-three-tier`（`tierOf` 逐 op 不变）· `capability-wiring`（`.request(` 计数不减）· `host-registry`（零宿主）· `test:gate-integrity ≥19`（`CHROMIUM_GATES === 9`）· `test:law8 ≥36`（零降级）· `test:dead-end ≥49` · `s0-self-driven ≥59` · `test:auth-chip ≥37` · `test:ask-auth ≥78` · `test:stream ≥76` · `size-*` + `test:size-ruling-vol3 ≥12` · `e2e` PASS

---

## 11. 未落地 / 待测点（禁预填）

| # | 主题 | 状态 | 归属任务 | 规则 |
|:--:|---|---|---|---|
| V55F-P-001 | A 列（叶1）实测净增 + 是否触发档位上调 | `pending-measurement` | `129` | 禁预填；二态显式（越生效上限 ⇒ 重登记 / 越档位 ⇒ EC-SGO-022 + 作者一行 / 未越 ⇒ 如实登记） |
| V55F-P-002 | journey / binding 保护段「保段 or 八步取代」实际结论 | `pending-measurement` | `129` | 禁预填；须显式二选一（**保段优先**） |
| V55F-P-003 | 人工面 M1（「原地」语义遵从观感）/ M4（SPA 锚定失败提示可理解度） | `pending-human` | `124` | 逐项 `⏳ 未执行` / `PASS`，不得冒充 PASS；v5.5 人工面零改写 |
| V55F-P-004 | V3-VOL-3 档位升档的作者一句外部确认（跨叶共享） | `pending-author-line` | `129` / `216` | 不得伪称已确认（N-SGO-023） |
| V55F-P-005 | S0′ 批量分支断言编号（`S0P-7/8` vs `S0P-B1~B3`） | `resolved-tasks` | `214` | **tasks 显式裁决**：`S0P-1~8` 保留 node 面（叶1）；批量段用 `S0P-B1~B3`（叶2） |
| V55F-P-006 | A 列（叶2）实测净增 + 两叶 Σ + 是否触发档位上调 | `pending-measurement` | `216` | 禁预填；二态显式 |
| V55F-P-007 | 人工面 M2（连点疲劳是否消失）/ M3（批量计划卡可读性 / 可否决性） | `pending-human` | `214` | 逐项 `⏳ 未执行` / `PASS`，不得冒充 PASS |
| V55F-P-008 | 读命令 `--ref`（`read-element` / `structure`）是否同加 | `resolved-plan`（**本阶段不做**，登记后续轮） | — | ADR-SGO-008（PD-SGO-001） |
| V55F-P-009 | 每回合只读重观测（最新摘要）是否注入 | `resolved-plan`（**不做**） | — | ADR-SGO-008（PD-SGO-002） |
| V55F-P-010 | 引用表字段集是否扩 `semanticPath` / `origin` / `navSeq` | `resolved-plan`（**保持 7 项最小集**） | — | ADR-SGO-008（PD-SGO-003） |

---

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建（F-34 父任务总览：**2 叶 × 7 波 × 45 任务**（`TASK-V55F-101~129` / `201~216`；S×3 / M×34 / L×8）+ 波次总表 + 两叶任务索引 + 跨切红线（`N-SGO-001~030` / `X-SGO-1~7` / `T1~T13`）→ 任务映射 + **体积分列预算逐叶分摊（A 列 Σ 9.5~14.5 KB / B 列 Σ 8.0~13.0 KB）+ 波内登记点 + EC-SGO-022 逐分支任务化** + 共享面「恰一次」登记 + **S0′ 双面落点表** + 3 个 spikeGate（SG-SGO-01/02/03，plan 未命名、按编排器任务书登记）+ **新增 4 门禁（`ref-context-in-turn` / `law9-scope-reading` / `dom-ref-anchor` / `batch-consent`）/ 升级 12 门禁清单** + 门禁守恒总表（`npm test ≥1330` / `CHROMIUM_GATES === 9`）+ 停机规则 10 条 + build/review/validate 二维时序 + 未落地 / 待测点 10 项。**本轮只做 tasks**：零 `src`/`test`/`dist`/`docs`/`design`/ROADMAP 改动；未跑门禁 / 构建 / Chromium；未调用任何受管 Provider（routing.v1 = `local_or_compute → none`） | 2026-09-24 | SDDU Tasks Agent |
