# 任务分解：specs-tree-web-cli-plugin-v55-f-ai-driven-next（web-cli-plugin v0.11.3「AI 驱动 next」；父 Feature 统领性任务总览）

> **文档定位**: SDDU 任务清单（**父 / 跨切总览与索引**）— 记录 **6 波总表**、**2 叶 50 任务索引**、跨切红线（`N-ADN-001~030` / `X-ADN-1~11` / 共享面）→ 任务映射、**体积分列预算逐叶分摊对照表（A 列 adn-1 +0.8~2.0 KB / adn-2 +0.5~1.5 KB；B 列 SW 优先不计账；C 列零容差；距档 15,474 B）**、共享面「恰一次」登记、S0''' 双面落点、3 个 spikeGate（SG-ADN-01~03）、新增 1 门禁 / 升级 6 组门禁 / 间接面对面账、门禁守恒总表、停机规则，以及 build / review / validate 二维时序。**本文件不含可执行任务正文**（父为轻量规范容器，不承接 build / review / validate；任务正文见 2 叶 `tasks.md` / `tasks.json`）
> **前置依赖**: 本目录 `plan.md` v1.0（跨切契约 + `ADR-ADN-001~010` 索引 + §5 文件影响 + §6 风险 + §7 ADR + §7.1 PD-ADN-001~008 裁决）+ `spec.md` v1.0（**89 FR / 16 NFR / 20 EC / 20 NG / 10 US / 8 G / 30 AC / 16 DC / 30 N / 24 R**；§5.12.1 体积分列预算表；§9.5 门禁处置；§12 X-ADN-1~11；§13 N-ADN-001~030；§14 2 叶拆分；§14.3 FR→叶 覆盖矩阵）+ `discovery.md` v1.0 + 2 叶 `plan.md` v1.0 + 2 叶 `spec.md` v1.0
> **创建人**: SDDU Tasks Agent
> **创建时间**: 2026-09-26
> **版本**: v1.0
> **更新人**: SDDU Tasks Agent
> **更新时间**: 2026-09-26
> **更新说明**: 初始创建（父总览：**2 叶 × 6 波 × 50 任务**（`TASK-ADN-101~127` / `201~223`，两叶连续编号）+ 跨切红线（`N-ADN-001~030` / `X-ADN-1~11`）→ 任务映射 + **体积分列预算逐叶分摊 + 波内登记点 + EC-ADN-016 逐分支任务化** + 共享面「恰一次」登记 + **S0''' 四支线双面落点表** + 3 个 spikeGate（`SG-ADN-01~03`）+ **新增 1 门禁 / 升级 6 / 间接面对面账** + 门禁守恒总表 + 停机规则 12 条 + 二维时序）。**本轮只做 tasks**：不写代码、不改 `src/**`·`test/**`·`dist/**`·`docs/**`·`design/**`·ROADMAP，不改上游 SDDU 目录，不动 `main`、不 force push，**不跑门禁 / 构建 / Chromium**，**未调用任何受管 Provider**（routing.v1 = `local_or_compute → none`）。

---

## 0. 结构登记（**2 叶 Feature**）

| 项 | 内容 |
|---|---|
| 父 Feature 定位 | **轻量规范容器**（父 `spec.md §14.1`）：`depth=1`；**不承接** build / review / validate；`childrens` 结构不变；**不产父级可执行任务** |
| 叶数量 | **2 叶**（`depth=2` / `leaf:true` / `deliveryOrder` 1..2 / `dependsOn: adn-1 → adn-2`） |
| 交付顺序 | `specs-tree-adn-1-ai-next-produce-and-verify` → `specs-tree-adn-2-deterministic-fallback-and-merge`（**硬串行**，叶间不可并行，父 `spec.md §14.1`） |
| 为何 3 波 + 3 波 | 沿用两叶 `plan.md §7` 的执行序骨架：adn-1 = **W1 载体与校验链 → W2 分层与注入 → W3 门禁与验收**；adn-2 = **W1 兜底与合并 → W2 护栏与首开 → W3 验收与治理** |
| 本轮父产物偏差 | 父产出 `tasks.md` / `tasks.json`（**总览型：0 条可执行任务**）—— 父 `spec.md §14.1` 未列出父 `tasks.json`；与 v5 / v5.5 / F-34 / F-35 先例同口径**显式登记**，可整篇作废而不牵连叶（叶对父的引用 = 「父 FR/AC + `ADR-ADN-0xx` 编号」，不依赖父 `tasks` 物理存在性） |
| ADR 所有权 | `ADR-ADN-001/002/003` → adn-1（安全核心）；`004` 两叶（adn-1 注入契约 / adn-2 合并与替换）；`005/006` 两叶（adn-1 留痕与事件作用域 / adn-2 兜底与护栏终态）；`007/008` 两叶各落各式；`009/010` 两叶各落各项（adn-1 骨架 / adn-2 终态） |
| 编号空间 | `TASK-ADN-1xx`（叶1 `101~127`）/ `TASK-ADN-2xx`（叶2 `201~223`）；与 `TASK-001~040` / `TASK-2xx~3xx` / `TASK-4xx` / `TASK-5xx~8xx` / `TASK-V45-1xx` / `TASK-V5-1xx` / `TASK-V55-1xx~320` / `TASK-V55F-1xx~2xx` / `TASK-IAN-1xx~2xx` **零冲突**（本 Feature 用 `ADN` 命名空间；全仓实测 `TASK-ADN` 零命中） |
| 波次 | **6 波**（`W01~W06` 全局波序）；叶内 adn-1 `W1~W3` / adn-2 `W1~W3` |
| 两叶串行理由 | adn-2 依赖 adn-1 已建立**通道 + 5 道校验链 + `admitCandidate` + `ai-next` provider + 注入槽 + 新门禁**：叶2 在叶1 `validated` 前不得启动，否则「AI 候选可进 chips 而校验链未就位」的中间态会裸放 AI 自由文本触达特权 / 不可逆面 ⇒ `R-ADN-001` / `N-ADN-021`（父 `spec.md §14.1` 三条论证） |

### 0.1 模板偏差登记（**任务数 > 15**）

| 项 | 内容 |
|---|---|
| 模板建议 | agent 模板 §5.4 / §8「任务数量控制在 5~15 个之间」 |
| 本轮实际 | **50**（27 / 23），分落 2 叶；叶1 27（> 15）、叶2 23（> 15） |
| 理由 | ① 编排器排布要求「两叶硬串行 + 每任务挂验收门禁 + 红线任务化」；② 过并会破坏「**每任务独立可验证**」；③ 与 F-35 父先例（52）/ F-34 父先例（45）/ v5.5 父先例（61）同口径显式登记；④ 50 = **可原子执行单元**（≈1 文件内 1 项可验证改动 + 其判据），**不是** LLM 调用数；⑤ 对齐两叶 `plan.md §7` 交付物（adn-1 9 项 → 27；adn-2 8 项 → 23） |

### 0.2 spikeGate 命名偏差登记

两叶 `plan.md` / `ADR-ADN-001~010` **未命名** spikeGate 代号。本轮按**编排器排布要求**落为**先验闸门**：`SG-ADN-01`（adn-1 W1：围栏块解析 + 载荷加法字段）/ `SG-ADN-02`（adn-1 W2：分层共享 `tierOf` + `pressDecision` diff=0）/ `SG-ADN-03`（adn-2 W1：骑 `ref-action` 位 prepend 替换 + 前 N=3 合并不破单卡/3chip）。探针产物**不落版本库**（`packages/web-cli-plugin/test/_spike/` 探毕删除）。

### 0.3 tasks 级波次细化登记（与叶 `plan.md §7` 的显式差异）

| 项 | 内容 |
|---|---|
| 差异 1 | 叶1 `plan.md §7` 的「W1 载体与校验链」把新门禁骨架排入 W1；tasks 级把门禁文件 `test/ai-next-candidate.test.ts` 的**建立**后移至 **W2**（`TASK-ADN-115`），与「通道 + 校验器 + 分层」实现**同轮**（否则 W1 收口无被测对象；承 `FR-ADN-111` 反证必实跑口径） |
| 差异 2 | 叶2 `plan.md §7` 的「W2 护栏与首开」含门禁重锚终态；tasks 级把**升级 6 的终态对账**保留在 W2（`TASK-ADN-213`），但把 **S0''' 终态 / X-ADN 台账终态 / 保护段 keep / 体积 Σ** 归入 **W3**（收口轮），与「体积 / 取代 / 门禁」共享面**恰一次**口径一致 |
| 未变 | 两叶的波次数（各 3）与叶间硬串行**不变**；父 `plan.md`/`ADR` 的语义与顺序**不变**；仅任务归属与同轮约束细化 |

---

## 1. 波次总表（6 波 · 2 叶硬串行）

| 全局波 | 叶 | 叶内波 | 名称 | 任务 | 任务数 | 规模 |
|:--:|:--:|:--:|---|---|:--:|---|
| **W01** | adn-1 | W1 | 载体与校验链（`definition` 类型 + `chat-events` 字段 + `ref-context` 契约句 + `op-table.ask` + `ai-next.ts` 解析/5 道链 + `service-worker` 装配；**SG-ADN-01**） | `101`–`107` | 7 | S×4 / M×2 / L×1 |
| **W02** | adn-1 | W2 | 分层与注入（`admitCandidate` + `ai-next` provider/`DRIVER_DECLS_SRC` 12 + `driverBlockedLine` + `chipsFor` 接线 + 注入透传 + 面板消费/测试缝 + 新门禁骨架；**SG-ADN-02**） | `108`–`117` | 10 | S×2 / M×6 / L×2 |
| **W03** | adn-1 | W3 | 门禁与验收（升级 6 重锚 + 间接面 + `gate-integrity` 下界 + S0''' 主线/B/D node + Chromium 断言增量 + 红线巡检 + 体积叶1 重登记 + X-ADN 骨架）（收口轮） | `118`–`127` | 10 | S×0 / M×9 / L×1 |
| **W04** | adn-2 | W1 | 兜底与合并（三情形兜底 + 终端恒常驻/floor + 合并口径 + 替换口径 + R6 扩展 + `recommendation-sources` 重锚；**SG-ADN-03**） | `201`–`207` | 7 | S×0 / M×7 / L×0 |
| **W05** | adn-2 | W2 | 护栏与首开（关断显示相 + 提案不耗预算 + 在飞语义 + 首开确定性 + 兜底反证 + 升级 6 终态对账 + 六常量/零第二阈值 + 窄视口 + 终端保留） | `208`–`216` | 9 | S×3 / M×6 / L×0 |
| **W06** | adn-2 | W3 | 验收与治理（S0''' 四支线终态 + X-ADN 台账终态 + 保护段 keep + 体积叶2 重登记 + Σ + 门禁守恒终态对账 + 人工面/收口）（收口轮·终局） | `217`–`223` | 7 | S×0 / M×5 / L×2 |
| **合计** | 2 叶 | — | — | `TASK-ADN-101~223` | **50** | **S×9 / M×35 / L×6** |

**跨叶次序**：`W01~W03`（adn-1 全绿 / `validated`）→ `W04~W06`（adn-2）。叶间**硬串行**（裁决 `BLK-ADN-9`）。

---

## 2. 两叶任务索引（50 条；正文见各叶 `tasks.md`）

### 2.1 adn-1 `specs-tree-adn-1-ai-next-produce-and-verify`（**27 · `TASK-ADN-101~127` · 3 波**）

| 任务 | 波 | 规模 | 类型 | 标题 | 关键判据 / 门禁 |
|---|:--:|:--:|---|---|---|
| `101` | W1 | M | spike | **SG-ADN-01** 围栏块严格 JSON 解析 + 载荷加法字段可行性探针 | 零新增 kind / type-only 可预演 |
| `102` | W1 | S | impl | `definition.ts` `AiNext*` 3 类型 + `NextCtx.session.aiNext?` + `chipsFor?`/`label?` | 白名单恒 5 / 顶层仍 7 源 |
| `103` | W1 | S | impl | `chat-events.ts` `ChatResultEvent.aiNext?`（type-only 单声明） | 缺席 ⇒ 现状逐字 / ∉ `KIND_SET` |
| `104` | W1 | S | impl | `ref-context.ts` 有引用分支追加产出契约句 | 基座 / 工厂形态零改（RCT-3/4） |
| `105` | W1 | S | impl | `shared/op-table.ts` `OpDescriptor.ask?` 加法字段 | 与 `ops.ts#IMPL` 逐行一致 / `sw-op-mirror` |
| `106` | W1 | L | impl | `background/ai-next.ts`（NEW）解析 + 5 道校验链 + `admitCandidate` 纯函数族 | 顺序即优先级 / 拒绝码闭集 `unknown-op·tier·ref·param·label` |
| `107` | W1 | M | impl | `service-worker.ts` 累积末条 assistant 文本 + `done` 装配 | 仅 `done`∧`openAsks===0` / error 零候选 / 零新 LLM |
| `108` | W2 | M | spike | **SG-ADN-02** 分层共享 `tierOf` + `pressDecision` diff=0 可证探针 | `confirm`：`admit=true ∧ press=blocked:tier` |
| `109` | W2 | M | impl | `admitCandidate` 接受层真值表（auto/confirm 接受、gesture 拒、未知拒） | 共享 `tierOf` / 零第二档位表 |
| `110` | W2 | M | impl | `providers.ts` `ai-next` 第 12 行 + `DRIVER_DECLS_SRC` 第 12 行 + 注释订正 | 双向包含 **12↔12** / `NEXTSTEP_PRIORITY` 恰 4 |
| `111` | W2 | S | impl | `ai-drive.ts` `driverBlockedLine` 单源（与 `driverSuppressedLine` 同构） | 恰一处 / 零值零明文 |
| `112` | W2 | S | impl | `registry.ts` `chipsFor` loud 校验 + `ops.ts` `reachableOpIds` 优先 `chipsFor` | 既有 11 行 provider 零改 |
| `113` | W2 | M | impl | `recommend.ts` `session.aiNext?` 透传 + `chipsFor` 解析 + card `label` 覆盖 | 真值 7 / 模块 5 / 仍 pure |
| `114` | W2 | L | impl | `sidepanel.ts` `done` 分支消费（事件作用域单槽 + 留痕）+ `testing.aiNext` 测试缝 | 消费即清 / `pending` 不退化 |
| `115` | W2 | L | gate | `test/ai-next-candidate.test.ts` 骨架 **AI-N-1~4/11** | 解析 / 顺序 / ref / param / `ask` 一致性 |
| `116` | W2 | M | gate | `ai-next-candidate` **AI-N-5/8/9/10** | 分层 / 零新增载体 / `DRIVER_DECLS_SRC` 12↔12 / 零第二阈值 |
| `117` | W2 | M | gate | `ai-next-candidate` **AI-N-6/7** 五类注入反证 + 真源切片 + 三段控制 | 注入必红 + `sha256` 还原 |
| `118` | W3 | M | gate | `recommendation-sources` 等价重锚（白名单恒 5 / 规则表恰 4 / ④ 零新 LLM） | 零删除 / `session.aiNext` ∈ 既有 `session` 源 |
| `119` | W3 | M | gate | `driver-timings` **DT-6** `session.aiNext`（恰 5 保持） | DT-2 恰 5 不动 |
| `120` | W3 | M | gate | `driver-quadruple` **DQ-1/DQ-3**（12↔12 / evidence 同源） | 缺/多/漂移 ⇒ 必红 |
| `121` | W3 | M | gate | `op-wiring` 计数全保持（`requestTurn(` 恰 1 / `maybeRecommend` 1·8 / `nextAfterSettle` 1·10 / 自动按下 1） | X-ADN-6 未发生 |
| `122` | W3 | M | gate | `next-registry` NR-10（11→12）+ `op-three-tier` 加严（接受层读点 = `tierOf`） | 既有判据不删 |
| `123` | W3 | M | gate | `gate-integrity` 受审下界只增 `ai-next-candidate` | `CHROMIUM_GATES === 9` 不动 |
| `124` | W3 | L | gate | **S0''' 主线 / 支线 B / 支线 D** node 面（+ 支线 C 兜底） | S0'''-1~10 / 样本单源 / 真源切片 |
| `125` | W3 | M | gate | `s0-self-driven.mjs` + `law8-plaintext.mjs` 断言增量（只加断言） | `CHROMIUM_GATES === 9` / 法八零降级 |
| `126` | W3 | M | doc | 红线巡检 + 体积叶1 重登记（五要素 + 三值 + 逐模块 + EC-ADN-016 二态） | 三冻结面零容差 / B 列不计账 |
| `127` | W3 | M | doc | X-ADN-1/X-7 台账骨架 + `no-supersession` 骨架 + 门禁对账骨架（本叶收口） | 老条目逐字 / 计数只增 |

### 2.2 adn-2 `specs-tree-adn-2-deterministic-fallback-and-merge`（**23 · `TASK-ADN-201~223` · 3 波**）

| 任务 | 波 | 规模 | 类型 | 标题 | 关键判据 / 门禁 |
|---|:--:|:--:|---|---|---|
| `201` | W1 | M | spike | **SG-ADN-03** 骑 `ref-action` 位 prepend 替换 + 前 N=3 合并不破单卡/3chip | `resolveOrder` 顺序可证 |
| `202` | W1 | M | impl | 三情形兜底接线（未配 / 未产出 / 全被拦） | 确定性 + floor / `pending` 硬门 |
| `203` | W1 | M | impl | `free-input` 终端恒常驻 + floor 语义（AI 不进 floor；`safety` 不走 floor） | 删终端 / 删 floor ⇒ 必红 |
| `204` | W1 | M | impl | 合并口径接线（同单卡位 + 前 N=3 + 截断 + 列表内去重 + 不交错） | 单卡 / 3-chip / 密度逐字 |
| `205` | W1 | M | impl | 替换口径（AI 赢槽 ⇒ 无陈旧 chip）+ 渲染零 per-op 分支 | 双向可判 / `next-dispatch-diff0` |
| `206` | W1 | M | impl | R6 同因去重扩展覆盖 AI（`refActionDigest` 家系逐字复用） | 去掉 AI 去重 ⇒ 必红 |
| `207` | W1 | M | gate | `recommendation-sources` 替换口径 / 规则表恰 4 / 单卡 / ④ 保持 | 白名单恒 5 |
| `208` | W2 | M | impl | 关断门（显示相 `proactivity.enabled()` 注入前检查） | 一处偏好两相 / 零第二偏好键 |
| `209` | W2 | M | gate | `proactivity-guard` 加严（提案不耗预算双向 + 关断两相） | 产出不耗 / 成回合才耗 |
| `210` | W2 | S | impl | 在飞语义保持（`pending` + `blocked:busy` + `ARBITRATION_RESULTS` 四值） | `turn-queue.ts` diff=0 |
| `211` | W2 | M | impl | 首开保持确定性（`maybeRecommendOpenEntry` 逐字 + 零 LLM 往返 + 让位 firstRun） | 首屏必有终端 / 零双卡 |
| `212` | W2 | M | gate | 兜底反证（删兜底 / 删终端 ⇒ 必红）+ 逐字节还原 | `r8` / `free-input-next` / `no-dead-end` |
| `213` | W2 | M | gate | 升级 6 重锚**终态对账**（三态齐 / `assertionsRemoved=0`） | 规则表 4 / 12↔12 / 恰 1 / R6 / 恰 5 |
| `214` | W2 | S | impl | 六常量同过 + 零第二阈值（源码扫描） | `AI_NEXT_*_MAX` 登记为显示上限 |
| `215` | W2 | M | gate | 窄视口 / 密度（EC-ADN-015；7/15·9/20·17/35 逐字） | `density-thresholds ≥242` |
| `216` | W2 | S | gate | `turn-arbitration` + `free-input-next` 保留（下界只增） | 四值逐字 / `ids ≥11` |
| `217` | W3 | L | gate | **S0''' 四支线终态 node 面** | A/B/C/D 逐步可判 / 双向反证 |
| `218` | W3 | L | gate | S0''' Chromium 面 + `recommendation.mjs` + `law8-plaintext.mjs`（只加断言） | `CHROMIUM_GATES === 9` |
| `219` | W3 | M | doc | X-ADN-1~11 台账**终态**（已发生 4 / 未发生 6 / 等价重锚 1） | `no-supersession` 理由非空 |
| `220` | W3 | M | gate | `supersession-ledger` 一致性判据 + 保护段 keep（journey / binding 字节中立） | `startAnchor` / sha 双绿 |
| `221` | W3 | M | doc | 体积叶2 重登记 + 两叶 Σ + EC-ADN-016 逐分支 | `authorConfirmation` 不得伪称 |
| `222` | W3 | M | gate | 门禁守恒终态对账（新增 1 + 升级 6 + 间接面三态齐） | `npm test ≥1443` / 串行 / `KL-N-10 ≥2` |
| `223` | W3 | M | doc | 人工面 M1~M5 `⏳` + 本叶收口对账 + `e2e` | 不冒充 PASS |

---

## 3. 体积分列预算逐叶分摊（**A/B/C 列；距档 15,474 B**）

**统一前提（`ADR-ADN-008` §①；本轮只读复核、未复跑）**：A 列基线 `dist/sidepanel.js` **598,926 B**（`size-baseline.ts:381`）· 生效上限 `floor(598,926 × 1.05) = `**`628,872 B`**（余量 **29,946**）· **档位 614,400 B**（**距档 15,474 B**）· 绝对上限 **675,840 B** · `authorConfirmation = pending-author-line`（**未闭合义务**）· C 列冻结面 `content.js` **177,076 B** / `pick-layer.js` **34,358 B** / `KIND_SET` **40** · B 列 `dist/background.js`（**不计入 sidepanel 账本**）。

| 预算口径 | 叶1（adn-1 通道 + 校验链） | 叶2（adn-2 兜底 + 合并 + 重锚） | Σ | +15% 缓冲 | 结论 |
|---|--:|--:|--:|--:|---|
| **A 列（sidepanel 净增）** | **+0.8 ~ +2.0 KB** | **+0.5 ~ +1.5 KB** | **+1.3 ~ +3.5 KB** | **+1.5 ~ +4.0 KB** | 距档 **15,474** ⇒ **正常口径不触发升档**（亦未越生效上限余量 29,946） |
| **B 列（`background.js`，不计账）** | **+1.5 ~ +3.5 KB**（解析 + 5 道校验链 + 留痕） | **+0.5 ~ +1.5 KB**（终态接线） | **+2.0 ~ +5.0 KB** | — | **不计入 sidepanel 账本**（B 列优先的唯一理由 = 旁路档位压力） |
| **2.8× 最坏（A Σ 上界 3.5 KB）** | — | — | **≈9.8 KB** | **≈11.3 KB** | **仍 < 15,474 ⇒ 也不触发升档**（**预置 EC-ADN-016 + 作者一行**以防实测越界） |

**波内标注（逐波落地项与增量归因）**：
- adn-1 **W01**：`definition` 3 类型 + `chat-events` 1 字段 + `ref-context` 契约句 + `op-table.ask` + `ai-next.ts`（**B 列主体，不计账**）⇒ A 列微量（类型 + 字段）。
- adn-1 **W02**：provider 第 12 行 + `driverBlockedLine` + `chipsFor` 接线 + 注入透传 + 面板消费（**A 列主增量**）⇒ A 列 +0.8~2.0 KB 主体落在此波。
- adn-1 **W03**：门禁 / 断言 / 体积重登记（**A 列薄 + 登记**）⇒ `TASK-ADN-126` 收口登记。
- adn-2 **W04**：兜底 / 合并 / 替换 / R6 接线（**A 列主增量**）⇒ A 列 +0.5~1.5 KB 主体落在此波。
- adn-2 **W05**：护栏 / 首开 / 门禁重锚（**A 列薄**）。
- adn-2 **W06**：验收 / 台账 / 体积 Σ（**登记 + 记账**）⇒ `TASK-ADN-221` 收口登记（含两叶 Σ）。

**逐叶收口重登记点**：adn-1 `W03` ⇒ `TASK-ADN-126`（A 列叶1 正增量 + 五要素 + V3-VOL-3 三值 + 逐模块行 `adn1Rows` + B 列不计账标注）；adn-2 `W06` ⇒ `TASK-ADN-221`（A 列叶2 + 五要素 + 三值 + `adn2Rows` + **两叶 Σ** + EC-ADN-016 逐分支）。

**越限 EC-ADN-016 任务化（逐分支；`TASK-ADN-126` / `TASK-ADN-221` 承载）**：

| 分支 | 触发 | 动作 |
|---|---|---|
| ① | 越**生效上限** `> 628,872` | **显式重登记基线**（`SIDEPANEL_BASELINE_BYTES` 同源前移 + 五要素 + 三值），**不触发档位** |
| ② | 越**档位 614,400** | 走 **EC 显式升档路径**（档位 → `ceilTo50KB(实测)`；绝对上限 → 档位 × 1.10）+ **作者一行** |
| ③ | 越**绝对上限 675,840** | **停止并请示作者** |
| — | `authorConfirmation` | 保持 `pending-author-line`，**不得伪称已确认**（`N-ADN-013`） |

**减体积优先级（越预算时按序执行）**：① 复用既有 `nextstep` 渲染面（**零新渲染面**）；② 复用既有文案 / 静态模板；③ 元组化声明数据（`ops.ts#IMPL` 先例）；④ 纯记账 / 判定下移 `background.js`（不计账，须过 `FR-ADN-125` 反证：**不得为绕门禁搬码**）；⑤ **显式登记**未落地项（**绝不以删判据 / 放宽容差 / 静默下调档位实现**）。

**B 列优先的诚实登记（`R-ADN-908`）**：解析 + 5 道校验链 + 留痕 + 载荷装配落 `background/ai-next.ts`（B 列，不计账）；但 **B 列优先 ≠ B 列无成本** —— 本总表**同时**给出 B 列预算（叶1 +1.5~3.5 KB / 叶2 +0.5~1.5 KB），收口如实登记；**不得**把 A 列改动搬进 B 列规避账本。

---

## 4. 共享面「恰一次」登记（`FR-ADN-002/005`；**禁止两叶各改一次**）

| 共享面 | 主责叶 | 任务 | 检查 |
|---|---|---|---|
| **体积** | 各叶登记自身增量；两叶 Σ 在叶2 | `TASK-ADN-126` / `TASK-ADN-221` | 五要素 + 三值同源 + 逐模块归因（Σ 逐模块 Δ + 未归因 == 登记增量）+ B 列不计账显式登记 + EC-ADN-016 二态 |
| **门禁对账** | 叶1 骨架 / 叶2 终态 | `TASK-ADN-127` / `TASK-ADN-222` | 新增 1 + 升级 6 + 间接面**三态齐**（保留 / 等价重锚 / 显式取代）+ `assertionsRemoved=0` + `CHROMIUM_GATES === 9` |
| **取代台账** | 各叶各登各的条目（台账文件只追加） | `TASK-ADN-127` / `TASK-ADN-219` | 叶1 登 X-1/X-7 + `no-supersession` 骨架；叶2 增 X-8/X-11 + X-10 等价重锚 + 全 11 条终态；老条目逐字保留 |
| **保护段** | 叶2（本 Feature 零改动 ⇒ keep 字节中立） | `TASK-ADN-220` | journey `[43484,59347)` sha `7b309258…` / binding `[107780,115930)` sha `be9ad0e9…`；`startAnchor`/`endByte`/sha 双绿；**零改动**两文件 |
| **S0''' 双面** | 样本单源（`test/ui/fixtures/s0-chain.mjs` 扩展，禁第二份）；node 叶1 落 S0''' 主/B/D，Chromium 叶1 只加断言；叶2 四支线终态 | `TASK-ADN-124` / `TASK-ADN-125` / `TASK-ADN-217` / `TASK-ADN-218` | 两侧独立计数禁互相掩盖；真源切片读生产模块（禁假 provider / 桩，`R-ADN-909`） |
| **人工面** | 各叶各登本叶项 | `TASK-ADN-125` / `TASK-ADN-223` | M1~M5 逐项 `⏳ 未执行` / `PASS`，不得冒充 PASS；v5.5 / F-34 / F-35 人工面零改写 |
| **FR-CHAT-060 零新 LLM** | 两叶共同不破（叶1 建、叶2 保持） | `TASK-ADN-107` / `TASK-ADN-116` / `TASK-ADN-213` | `recommend.ts` 源码零 `fetch(`·`chrome.`·时钟；零第二次 provider 调用；`recommendation-sources` ④ 保持绿 |
| **`shared/op-table.ts` 双面** | 叶1 一次做完 `ask?`；两侧镜像 | `TASK-ADN-105` / `TASK-ADN-112` | `sw-op-mirror` 绿；A/B 侧副本都记（B 侧不计账） |

---

## 5. S0''' 四支线双面落点表（`ADR-ADN-007`）

| 支线 | 场景 | 期望 | node 面（叶1 建 / 叶2 终态） | Chromium 面（只加断言） |
|---|---|---|---|---|
| **A 主线** | 已配 ∧ `done` ∧ AI 产出合法候选 | 过 5 道校验 ⇒ 注入 chips（**替换陈旧 `ref-action` chip**）∧ ≤3 ∧ 单卡 ∧ 终端恒最末 | `TASK-ADN-124`（骨架）→ `TASK-ADN-217`（终态） | `s0-self-driven.mjs`（`TASK-ADN-125` → `TASK-ADN-218`） |
| **B 被拦** | 已配 ∧ 非法候选（幻觉 op / 越界 ref / `gesture` op / param 越界 / label 越界） | 逐类 `blocked=<code>` + **可读留痕**（零明文）∧ **不渲染为 chip** ∧ 注册表兜底 + 终端 | 同上 | 同上 |
| **C 未产出** | 已配 ∧ 无块 / 解析失败 / 空数组 | 零 `aiNext` ⇒ 确定性注册表产卡（含 floor） | `TASK-ADN-124` | （node 主判） |
| **D 未配置** | 未配 LLM | **零候选产出（零网络）** + 确定性 + 终端（现状逐字） | `TASK-ADN-124` | 同上 |

**S0'''-1~10 步映射**：1 结构可判（注入样本）/ 2 `opId ∈ OP_IDS ∧ tier ≠ gesture` / 3 四类各 `admit=false` + 可读行 / 4 替换 + ≤3 + 单卡 / 5 终端恒在（任意支线）/ 6 未配纯确定性 / 7 `KIND_SET` 40 + 12 kind + 零宿主 + `ACT_TO_OP` 6 / 8 `admit=true ∧ press=blocked:tier`（confirm）/ 9 提案不耗预算 / 10 留痕三要素 + 零明文。**驱动经 `window.__v3.testing.aiNext(...)` 测试缝注入已校验候选**（测试缝，非生产第二入口，`N-ADN-028`）。

---

## 6. spikeGate 清单与结论义务

| 代码 | 任务 | 叶/波 | 假设（被验证者） | 被闸门任务 | 结论义务 / 停止规则 |
|---|---|---|---|---|---|
| **SG-ADN-01** | `TASK-ADN-101` | adn-1 / W1 | **围栏块严格 JSON 解析 + `chat-result` 载荷 type-only 加法字段可行**：取本回合最后一条 assistant 文本的最后一块 `next`；严格 `JSON.parse` + 顶层数组；逐项容错；**零新增 kind**（候选类型 ∉ `KIND_SET`） | `102` / `103` / `106` / `107` / `115` | 不可行 ⇒ **暂停上报**；**禁**新增 kind / 新增消息族 / 改动 `KIND_SET` |
| **SG-ADN-02** | `TASK-ADN-108` | adn-1 / W2 | **`admitCandidate` / `pressDecision` 分层共享 `tierOf` 且 `pressDecision` 语义 diff=0 可证**：`confirm` ⇒ `admit=true ∧ press=blocked:tier`；`gesture` ⇒ `admit=false` | `109` / `110` / `113` / `114` / `116` | 不可行 ⇒ **暂停上报**；**禁**复用 `pressDecision` 作接受判据 / 放宽为「非 gesture 即接受」/ 第二档位表 |
| **SG-ADN-03** | `TASK-ADN-201` | adn-2 / W1 | **`ai-next` 骑 `ref-action` 位 `prepend` 替换陈旧候选 + 前 N=3 合并不破单卡/3chip**：`resolveOrder = (priority asc, prepend desc, seq asc)`；AI 赢槽 ⇒ 无陈旧 chip；AI 缺席 ⇒ 确定性接管 | `202` / `204` / `205` / `206` / `207` | 不可行 ⇒ **暂停上报**；**禁**新增第 5 规则位 / 多卡 / 破 3-chip / 交错合并 |

**结论义务（全部 3 个）**：spike 结论须以「假设 / 探针方法 / 实跑证据 / 结论（可行 / 不可行）」五要素写入对应叶的 build 记录；**结论 = 不可行 / 不可构造** ⇒ 对应「被闸门任务」**不得开工**，且按停止规则上报（`blockers`）。**探针产物不落版本库**（`test/_spike/` 探毕删除）。

---

## 7. 门禁守恒总表与新增 / 升级门禁清单

### 7.1 门禁处置三态（`FR-ADN-110~117`；**禁漏项**；三态 = 保留 / 等价重锚 / 显式取代(+台账)）

> **基线口径（诚实登记，`COR-ADN-3`）**：父 `spec.md §9.5` 的计数引自 F-35 收口 + R8，**本轮未复跑**；本轮只读复核发现部分旧字面量与仓内实况不一致（例 `EXPECTED_AUDITED_FILES` 现 **40** 项）。⇒ **重锚一律按「断言语义 + 语义增量」**，不按陈旧字面量；收口按实测同源前移。

| # | 层 | 门禁 | F-36 起点基线 | 处置 | 承载任务 |
|:-:|:-:|---|--:|---|---|
| 1 | node | **`test/ai-next-candidate.test.ts`（NEW）** | — | **新增**（AI-N-1~11） | `115` / `116` / `117` |
| 2 | node | `test/recommendation-sources.test.ts` | （族内） | **等价重锚**（白名单恒 5 / 规则表恰 4 / ④ 保持；零删除） | `118` / `207` / `213` |
| 3 | node | `test/driver-timings.test.ts` | （族内） | **等价重锚**（恰 5 保持 + DT-6 `session.aiNext`） | `119` / `213` |
| 4 | node | `test/driver-quadruple.test.ts` | （族内） | **等价重锚**（DQ-1 **12↔12** / DQ-3 收纳 `session.aiNext`） | `120` / `213` |
| 5 | node | `test/op-wiring.test.ts` | 14 | **等价重锚**（计数全保持；`requestTurn(` **恰 1** 不动） | `121` / `213` |
| 6 | node | `test/proactivity-guard.test.ts` | （族内） | **等价重锚**（提案不耗预算双向 + 关断两相） | `209` / `214` |
| 7 | node | `test/op-three-tier.test.ts` | （族内） | **保留 + 加严**（接受层读点 = `tierOf`；`gesture` 拒） | `122` |
| 8 | node | `test/next-registry.test.ts` | （族内） | **等价重锚（间接面）**（NR-10 11→12；NR-0 顶层 7 源保持） | `122` |
| 9 | node | `test/gate-integrity.test.ts` | 24 | **等价重锚**（`V_ADN_NODE_GATE_FILES` + `EXPECTED_AUDITED_FILES` 下界 +1；`CHROMIUM_GATES === 9`） | `123` / `222` |
| 10 | node | `test/r8-open-next-entry.test.ts` | （R8 新） | **保留（不得回归）**（首开保持确定性；终端恒在） | `202` / `211` / `212` |
| 11 | node | `test/free-input-next.test.ts` | 22 | **保留（下界只增）**（终端恒常驻；`ids ≥11`→12） | `203` / `216` |
| 12 | node | `test/supersession-ledger.test.ts` | 49 | **保留 + 新增**（X-ADN 台账段 + 保护段 keep） | `127` / `219` / `220` |
| 13 | node | `test/turn-arbitration.test.ts` | 7 | **保留 / 等价重锚**（四值逐字；AI 撞车 `blocked:busy` 继承） | `210` / `216` |
| 14 | node | `test/sw-op-mirror.test.ts` | （族内） | **保留**（AI 校验链读同一 `shared/op-table`） | `105` |
| 15 | node | `test/density-thresholds.test.ts` | 242 | **保留 / 等价重锚**（AI chips 不越 7/15·9/20·17/35） | `204` / `215` |
| 16 | node | `test/next-dispatch-diff0.test.ts` | （族内） | **保留**（`data-op` 单源；零 per-op 分支；`ACT_TO_OP` 恰 6） | `205` |
| 17 | node | `test/insight-no-escalation.test.ts` | 21 | **保留**（`../web-cli-base` 零 diff） | `126` |
| 18 | node | `test/size-baseline.ts` / `size-ruling-vol3.test.ts` / `size-growth-evidence.test.ts` | 13 | **等价重锚 / 新增登记**（逐叶五要素 + 三值 + 逐模块 + 两叶 Σ + B 列不计账） | `126` / `221` |
| 19 | Chromium | `test/ui/s0-self-driven.mjs` | 82 | **等价重锚 + S0''' 断言增量（只加断言不加文件）** | `125` / `218` |
| 20 | Chromium | `test/ui/recommendation.mjs` | 79 | **等价重锚**（替换口径 / ≤3 / 单卡 / 终端恒最末） | `218` |
| 21 | Chromium | `test/ui/law8-plaintext.mjs` | 60 | **等价重锚（零降级）**（AI label / 留痕零明文面） | `125` / `218` |
| 22 | Chromium | `test/ui/journey.mjs` | 171 | **保留（保护段 keep）**（**零改动** ⇒ 字节中立双绿） | `220` |
| 23 | Chromium | `test/ui/binding.mjs` | 192 | **保留（保护段 keep）**（**零改动** ⇒ 字节中立双绿） | `220` |

> **间接 / 对账面（不计入上表主项，逐条确认无遗漏）**：`test/next-obligation-table.test.ts`（OT-4 读 `ai-next` 静态 `chips=['op.turn']`）/ `test/op-protocol.test.ts` / `test/blocked-terminals.test.ts` / `test/driver-terminals.test.ts` / `test/design-contract.test.ts` / `test/settings.test.ts`（契约计数）/ `test/free-input-next.test.ts` 下界 / `test/insight-tree-hierarchy.test.ts`。**`CHROMIUM_GATES === 9` 不动**（**不新增 Chromium 门禁文件**）。

### 7.2 新增门禁（**1 门 node**；`EXPECTED_AUDITED_FILES` 下界只增 +1）

| # | 门禁文件 | 名 | 叶 | 承载任务 | 关键判据 |
|:--:|---|---|:--:|---|---|
| 1 | `test/ai-next-candidate.test.ts` | AI next 候选校验链 | adn-1 | `115` / `116` / `117` | **AI-N-1~11**：解析 / 5 道链真值表 / 顺序优先级 / 判定分层 / 注入反证族 / 真源切片 + 三段控制 / 零新增载体 / `DRIVER_DECLS_SRC` 12↔12 / 零新 LLM 与零第二阈值 / `ask` 一致性 |

> 该门禁须由 `test/gate-integrity.test.ts` 的 `EXPECTED_AUDITED_FILES` **只增**（`TASK-ADN-123` / `TASK-ADN-222`）；**`CHROMIUM_GATES === 9` 逐字不动**。

### 7.3 既有门禁升级清单（**改写 ≠ 删除**；升级 6 = `ADR-ADN-009 §②`）

| # | 既有门禁 | 基线 | 升级内容（等价重锚；**断言零删除**） | 任务 |
|:--:|---|--:|---|---|
| 1 | `recommendation-sources` | 族内 | 真值 7 / 白名单 5 / 规则表恰 4 / ④ 零新 LLM **全保持**；**新增** `session.aiNext` ∈ 既有 `session` 源 ∧ `recommend.ts` 导入 ⊆ 白名单 5（不新增条目）；**替换口径**判据 | `118` / `207` |
| 2 | `driver-timings` | 族内 | DT-2 恰 5 / DT-3 旧 4 逐字 / DT-4 调用点恰 8 / DT-5 入口恰 1 **全保持**；**新增** DT-6 显式断言 `session.aiNext` 经 `session` 前缀登记 | `119` |
| 3 | `driver-quadruple` | 族内 | DQ-1 双向包含随 count **12↔12**；DQ-2 `ai-next` 静态 `chips=['op.turn'] ⊆ OP_IDS`；DQ-3 收纳 `session.aiNext`（when-scope 源文本抽取） | `120` |
| 4 | `op-wiring` | 14 | **全部数值不动**（`requestTurn(` 恰 1 / `maybeRecommend` 1·8 / `nextAfterSettle` 1·10 / 自动按下恰 1 / `dispatchChipAction` 恰 1）；**零新增挂点**（X-ADN-6 未发生）；反证保留 | `121` |
| 5 | `op-three-tier` | 族内 | 保留 + 加严：**新增**「接受层读点 = `tierOf`」+ `tierOfId('op.authorize')==='gesture' ∧ admitCandidate 拒` | `122` |
| 6 | `proactivity-guard` | 族内 | **新增**「提案不耗预算」双向（产出 ⇒ 预算不变 / 自动成回合 ⇒ −1）+ 关断两相（显示 + 按下） | `209` / `214` |

### 7.4 门禁基线守恒（**只增不减**，`npm test ≥1443`）

`npm test` **1443**（`state.json#domainBaseline`）· `op-wiring` **14**（`requestTurn(` **恰 1** 不动）· `gate-integrity` 24→**25** · `supersession` **49** · `free-input-next` **22** · `turn-arbitration` **7** · `density` **242** · `size-ruling-vol3` **13** · `r8-open-next-entry`（R8 新）· `law8` **60** · `no-dead-end` **53** · `s0-self-driven` **82** · `insight` **125** · `recommendation` **79** · `l0` **251** · `l1` **132** · `l2` **74** · `journey` **171**（保护段 keep）· `binding` **192**（保护段 keep）· `hardening` **24** · `page-input` **125** · `auth-chip` **37** · `zero-injection` **28** · `e2e` **PASS** · `CHROMIUM_GATES` **=== 9**。

> 基线引自父 `spec.md §9.5` + `ADR-ADN-008`（**本轮未复跑**）。**唯一例外** = 保护段按台账**显式取代**并留痕（本 Feature **预期零改动** ⇒ keep 字节中立，无需八步取代）。

---

## 8. 停机规则（**12 条**）

| # | 触发 | 动作 |
|:--:|---|---|
| 1 | `dist/content.js` ≠ **177,076 B** / `52a82620…` 或 `dist/pick-layer.js` ≠ **34,358 B** / `77796bab…` | **立即停机**（`N-ADN-001/002` 零容差） |
| 2 | `manifest.json` / `packages/web-cli-base/**` 出现 diff | 停机（`N-ADN-007` / `NG-ADN-008`） |
| 3 | `KIND_SET` 新增任一字符串 / 第 13 kind / 新宿主 | 停机（`N-ADN-003/004/010` / `R-ADN-008`） |
| 4 | 第二校验器 / 第二档位表 / 第二 `ai-next` 产出入口出现 | 停机（`N-ADN-022/028` / `R-ADN-904`） |
| 5 | 判定链（`policy.ts` / `auto-authorize.ts`）内容哈希变化 | 停机（`N-ADN-018`） |
| 6 | 反证恒绿（注入后仍 PASS） | 停机；重写注入点（`FR-ADN-111`） |
| 7 | `SG-ADN-01/02/03` 结论 = 不可行 / 不可构造 | 被闸门任务**不得开工**（见 `blockers`） |
| 8 | 体积越**绝对上限**或静默改档位 / `authorConfirmation` | 停机（硬墙）；升档须**显式**登记（`ADR-ADN-008` / `EC-ADN-016`） |
| 9 | 任一门禁计数 < 基线（除保护段显式取代且已留痕） | 停机；还原并重锚 |
| 10 | AI 候选**未经 5 道校验**即进 chips / 被执行；或 `gesture` op 被放行 / `confirm` 被拒可见 | 停机（`N-ADN-021` / `R-ADN-901/902`） |
| 11 | 特权 op 非 `gesture` / SW 调用 `.request(` / AI 自动按下 `confirm`（含 consent 代答） | 停机（`N-ADN-011/017` / `R-ADN-901`） |
| 12 | 首开 AI 化（首屏引入 LLM 往返依赖）/ AI 自动成回合记账成「提案预算」 | 停机（`N-ADN-025/026` / `R-ADN-010/906`） |

---

## 9. 二维时序：build / review / validate 策略（**设计在 build 前可启动**）

> review / validate 策略**在 build 前**即设计完成（不等到实施后补），形成「叶内波次（横轴） × 三阶段（纵轴）」二维时序。

### 9.1 三阶段在每叶的时序

| 叶 | build（波内） | review（叶收口前） | validate（叶收口） |
|---|---|---|---|
| **adn-1** | `W01`(载体/校验链 + **SG-ADN-01**) → `W02`(分层/注入/新门禁 + **SG-ADN-02**) → `W03`(升级 6 重锚/间接面/S0''' node/Chromium 断言/体积叶1) | 判据真空审查（`AI-N-1~11` **禁恒真** + 三段控制）+ 单源审计（校验器恰 1 / `tierOf` 单源 / 注入槽唯一 / `chat-result` 单声明）+ 注入反证完整性（未校验候选进 chips / 第二校验器 / 第二档位表 / 第二产出内核 / label 泄漏） | S0''' 主/B/D node 面实跑 + 门禁守恒对账 + 体积叶1 正增量 + 漂移检测（`KIND_SET` 40 / 12 kind / `ACT_TO_OP` 6 / provider ↔ 声明 12↔12 / `ask` ↔ `IMPL` / 留痕两值） |
| **adn-2** | `W04`(兜底/合并/替换/R6 + **SG-ADN-03**) → `W05`(护栏/首开/升级 6 终态) → `W06`(S0''' 四支线终态/台账终态/保护段 keep/体积 Σ/门禁守恒) | 重锚纪律审查（升级 6 三态齐、删面 vs 只增张力、老台账保留）+ 保护段审查（journey/binding keep 字节中立）+ 兜底审查（三情形 + 删终端/删 floor 必红）+ 恒真审查（S0''' 四支线三段控制） | 全门禁逐条复跑 + S0''' 四支线终态（注入必红）+ X-ADN-1~11 台账终态（未发生者 `no-supersession`）+ 保护段双绿 + 体积叶2 + 两叶 Σ + `e2e` PASS + 漂移检测（台账 ↔ 判据 / 保护段 pin / 两叶 Σ / 规则表 ↔ provider） |

### 9.2 review 前置判据（build 前已钉死）

1. **禁恒真**：`AI-N-*` 每条判据必须可注入违反面 + 三段控制（`ok` / `violated` / `n/a`）；`n/a` 不冒充 `ok`。
2. **禁纸面**：校验器**单源**（`background/ai-next.ts`）；档位**单源**（`tierOf`）；产出内核**唯一**（`recommendNextStep`）：候选只经注入槽 + `ai-next` provider。
3. **禁假绿**：S0''' 走**生产模块真源切片**（不用假 provider / 桩跳过真实校验与注入，`R-ADN-909`）。
4. **禁放宽**：升级 6 是**等价重锚**（附反证），非放宽；老台账条目逐字保留；`requestTurn(` **恰 1 不动**。
5. **禁代答**：AI 不得代答 / 代填 / 自动提交 `confirm` consent（`N-ADN-017`）。
6. **禁静默**：保护段哈希变更须八步/台账（本 Feature 预期 keep）；`no-supersession` 不得留空 / 不得伪造「已取代」。

### 9.3 validate 前置判据（build 前已钉死）

| 判据 | 检查 |
|---|---|
| EXIST | 产物存在 + 无 TODO / 桩；`ai-next.ts` / `ai-next-candidate.test.ts` 非空 |
| SUBSTANCE | 非空实现 + 关键路径覆盖（`AI-N-1~11` / S0'''-1~10 / `ADN-1xx~2xx` 全任务） |
| ANTI-PATTERN | 反模式检测 + **反证恒绿检测**（注入后仍 PASS ⇒ 缺陷） |
| WIRING | 接线真实（无孤岛）+ 门禁受审集合下界只增 + 计数只增 + `assertionsRemoved=0` |
| DRIFT | 契约漂移（provider ↔ `DRIVER_DECLS_SRC` 12↔12 / `ask` ↔ `ops.ts#IMPL` / 留痕 `ai-next` ↔ `manual` 两值 / `KIND_SET` 40 / 保护段 pin / 两叶 Σ 体积 / X-ADN 台账 ↔ 判据） |

---

## 10. 每叶验收门禁清单（摘要；逐项见各叶 `tasks.md`）

- **adn-1**（W3 收口 `TASK-ADN-127`）：`typecheck` · `build` · `npm test ≥1443` · **`ai-next-candidate`（新）** · `recommendation-sources`（白名单恒 5 / 规则表恰 4 / ④ 保持）· `driver-timings`（恰 5 / DT-6）· `driver-quadruple`（12↔12）· `op-wiring`（`requestTurn(` **恰 1** 不动）· `op-three-tier`（加严）· `next-registry`（NR-10 11→12）· `gate-integrity ≥25`（`CHROMIUM_GATES === 9`）· `r8-open-next-entry`（保留）· `free-input-next ≥22` · `sw-op-mirror` · `next-dispatch-diff0` · `insight-no-escalation`（base 零 diff）· `test:law8 ≥60`（零降级）· `s0-self-driven ≥82` · `test:supersession ≥49`（骨架）· `size-*` + `test:size-ruling-vol3 ≥13` · `content.test.ts`
- **adn-2**（W3 收口 `TASK-ADN-223`）：`typecheck` · `build` · `npm test ≥1443` · `recommendation-sources`（替换口径）· `proactivity-guard`（提案不耗预算 / 关断两相）· `op-wiring`（计数不动）· `driver-timings` / `driver-quadruple`（终态对账）· `op-three-tier` · `density-thresholds ≥242` · `turn-arbitration ≥7` · `free-input-next ≥22` · `r8-open-next-entry` · `no-dead-end ≥53` · `supersession-ledger ≥49`（X-ADN 终态 + 保护段）· `test:journey ≥171`（keep）· `test:binding ≥192`（keep）· `test:recommendation ≥79` · `s0-self-driven ≥82` · `test:law8 ≥60` · `test:insight ≥125` · `gate-integrity ≥25` · `size-*` + `test:size-ruling-vol3 ≥13` + **两叶 Σ** · `e2e` PASS

---

## 11. 未落地 / 待测点（禁预填）

| # | 主题 | 状态 | 归属任务 | 规则 |
|:--:|---|---|---|---|
| `ADN-P-001` | A 列（叶1）实测净增 + 是否触发档位上调 | `pending-measurement` | `TASK-ADN-126` | 禁预填；二态显式（越生效上限 ⇒ 重登记 / 越档位 ⇒ EC-ADN-016 + 作者一行 / 未越 ⇒ 如实登记） |
| `ADN-P-002` | 叶1 新门禁 `ai-next-candidate` 三段控制 ok/violated/n/a 可达性 | `pending-measurement` | `TASK-ADN-117` | 禁预填；`n/a` 不得冒充 `ok`（`N-ADN-024` 同款纪律） |
| `ADN-P-003` | 人工面 M1（AI 候选真机相关性）/ M2（两张皮是否消失）/ M3（密度观感）/ M4（读屏）/ M5（被拦体感） | `pending-human` | `TASK-ADN-125` / `TASK-ADN-223` | 逐项 `⏳ 未执行` / `PASS`，不得冒充 PASS |
| `ADN-P-004` | V3-VOL-3 档位升档的作者一句外部确认（跨叶共享） | `pending-author-line` | `TASK-ADN-126` / `TASK-ADN-221` | 不得伪称已确认（`N-ADN-013`） |
| `ADN-P-005` | SG-ADN-03 探针：`resolveOrder` prepend 顺序与替换口径是否可判 | `pending-measurement` | `TASK-ADN-201` | 禁预填；不可行 ⇒ 暂停上报（禁第 5 规则位 / 禁多卡） |
| `ADN-P-006` | A 列（叶2）实测净增 + 两叶 Σ + 是否触发档位上调 | `pending-measurement` | `TASK-ADN-221` | 禁预填；与 plan 预算（+0.5~1.5 KB）偏差须显式登记 |
| `ADN-P-007` | `params` 本轮「仅元数据不参与派发」的已知限制是否被后续轮扩展 | `deferred` | `TASK-ADN-106`（登记） | 不得静默扩卡协议（`ADR-ADN-002 §③` 诚实登记） |
| `ADN-P-008` | 门禁基线字面量与仓内实况不一致（如 `EXPECTED_AUDITED_FILES` 现 40） | `resolved-tasks` | `TASK-ADN-123` / `TASK-ADN-222` | 按**断言语义 + 语义增量**重锚，**不照抄陈旧字面**；收口同源前移（`COR-ADN-3`） |
| `ADN-P-009` | `KL-N-10` 家族 flake（`binding` CDP / `page-input` 陈旧 fixture / `recommendation` ④ 相位 / `s0-self-driven` ⑦A） | `pending-measurement` | `TASK-ADN-127` / `TASK-ADN-222` | 隔离复跑 ≥2 + 日志全量；仍红如实记录不阻塞收口（`EC-ADN-020` / `R-ADN-013`） |
| `ADN-P-010` | 叶2 波次细化：升级 6 终态对账在 W2，S0'''/台账/保护段/Σ 归 W3 | `resolved-tasks` | `TASK-ADN-213` / `TASK-ADN-217~222` | tasks 显式裁决（共享面「恰一次」 + 每波收口门禁绿）；plan §7 归属同步登记 |

---

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建（F-36 父任务总览：**2 叶 × 6 波 × 50 任务**（`TASK-ADN-101~127` / `201~223`；S×9 / M×35 / L×6）+ 波次总表 + 两叶任务索引 + 跨切红线（`N-ADN-001~030` / `X-ADN-1~11`）→ 任务映射 + **体积分列预算逐叶分摊（A 列 adn-1 +0.8~2.0 KB / adn-2 +0.5~1.5 KB；Σ +1.3~+3.5 KB；+15% +1.5~+4.0 KB；2.8× 最坏 ≈9.8 KB；距档 15,474 不升档）+ 波内登记点 + EC-ADN-016 逐分支任务化** + 共享面「恰一次」登记（体积 / 门禁 / 台账 / 保护段 / S0''' / 人工面 / FR-CHAT-060 / `op-table` 双面）+ **S0''' 四支线双面落点表** + 3 个 spikeGate（`SG-ADN-01/02/03`，plan 未命名、按编排器排布要求登记）+ **新增 1 门禁（`ai-next-candidate`）/ 升级 6 / 间接面对面账** + 门禁守恒总表（`npm test ≥1443` + `CHROMIUM_GATES === 9`）+ 停机规则 12 条 + build/review/validate 二维时序 + 未落地 / 待测点 10 项。**本轮只做 tasks**：`.sddu` 外零触碰；未跑门禁 / 构建 / Chromium；未调用任何受管 Provider（routing.v1 = `local_or_compute → none`） | 2026-09-26 | SDDU Tasks Agent |
