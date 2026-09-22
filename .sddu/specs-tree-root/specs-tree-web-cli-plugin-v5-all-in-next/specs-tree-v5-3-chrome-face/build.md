# 构建报告：specs-tree-v5-3-chrome-face（R1 = TASK-V5-153~166 · 波 A~D 前段）

> **文档定位**: SDDU 构建报告 — 记录本轮任务的文件变更、实现结果与门禁读值，作为 review 阶段的输入
> **前置依赖**: 本叶 `tasks.md`（24 任务 / 7 波）、`plan.md`（ADR-V5-006/007/009/010/012 收口侧）、父 `spec.md`（FR-ALLN-080~092 CHROME / 012·015 法七 / 023·024 法八）、父 `ADR-V5-001~012`、上游叶 `v5-1` + `v5-2`（全绿）
> **创建人**: SDDU Build Agent
> **创建时间**: 2026-09-22
> **版本**: v1.0（R1 = `TASK-V5-153~166`）
> **更新人**: SDDU Build Agent
> **更新时间**: 2026-09-22
> **更新说明**: 初始创建（R1：SG-4 seam 探针 **seam-available**（5/5）· 法八四面零明文机核（含 `••••••` digest 掩码 + key 直写恰 1 点 + 四类注入反证）· `error` 出生铸造恢复区 · 死端守护门禁（5 类逐类 + 死端 = 0 + 双向注入反证 + S2 全链主验收）· 零宿主复核 · 授权 chip 两态与零双写 + 黄 / 绿点击；**体积在预算内（545,273 ≤ 545,314，Δ = +3,209 ≤ 3,250）**；既有门禁的**授权态载体等价重锚**（10 条）与**体积五要素重登记**（4 条）按波次归 R2，见 §6）

---

## 1. 构建概要

| 维度 | 数值 |
|------|:--:|
| 完成任务数 | **14 / 14**（R1 = `TASK-V5-153~166`；剩余 `167~176` 归 R2） |
| 复杂度分布 | S×1（153 SG-4） / M×8（155 / 156 / 157 / 158 / 161 / 162 / 163 / 166） / L×5（154 / 159 / 160 / 164 / 165） |
| 新增文件 | **3 源码 / 测试** = 3 门禁（`test/ui/law8-plaintext.mjs` / `no-dead-end.mjs` / `auth-chip.mjs`） |
| 修改文件 | **11 个**（8 源码 + 3 测试 + 1 台账 `docs/v4-supersession-ledger.json`） |
| 体积 | `dist/sidepanel.js` **545,273 B**（基线 542,064 ⇒ **Δ = +3,209 B ≤ 预算 3,250 B**；上限 545,314 B ⇒ **未越限、无停机**） |
| 红线冻结面 | `content.js` **177,076 B**、`pick-layer.js` **33,900 B** 逐字节不变（本轮零触碰 `src/content/**`；`manifest.json` / `KIND_SET` / 判定链逐字不动） |
| 测试计数（只增） | `npm test` **1172 → 1175**（+3：stream-model ×2 / host-registry ×1；**1171 pass / 4 fail**，4 项全为**体积五要素登记面** ⇒ R2 TASK-V5-174）；`stream` **68 → 73**；`law8` 新建 **24/0**；`no-dead-end` 新建 **29/0**；`auth-chip` 新建 **30/0**；`gate-integrity` **14/0**；`ask-auth` **71/0**；`recommendation` **65/0**；`journey` **171 PASS**；`l0` **245/3**、`density` **222/10**、`zero-injection` **26/1**、`binding` **192−1**（4 门禁 10 条红 = **授权态载体下移的等价重锚**，归 R2 TASK-V5-169/173，见 §6） |
| 保护段 | journey `43054..58287` / `cc79f413…` / 240 行 **保段成立**（`journey` 171 PASS：`data-narrow` 前 `#auth-state` 与 `#statusbar-text` **同行不新增行**，`#15b` 高度比仍 ≥0.65；`density` 几何读数 748 → 744px 仍 ≥ 488px 下界）；binding 保护段 `107780..115930` **零触碰** |

---

## 2. 文件变更

| 操作 | 文件路径 | 对应任务 | 说明 |
|:--:|------|:--:|------|
| MODIFY | `src/ui/sidepanel/stream-model.ts` | 156 | `StreamPayload.recovery?: readonly {text, opId}[]`（**类型位，零运行时字节**）+ 注释说明出生铸造语义；reduce/project 的既有透传路径原样承载（`deepFreeze` 深拷贝） |
| MODIFY | `src/ui/sidepanel/cards/error.ts` | 157 | **出生铸造恢复区**：`createErrorCard` 同一调用内、气泡之后追加 `.next-chips`，每 chip `data-act="next"` + `data-op={opId}`（**分发依据 = opId**，op-direct 约定同 `nextstep` 卡）；缺省 ⇒ 零 chip（渲染零回归）；`chip.text` **不**作为 value 传给 op（否则 params 会被跳过） |
| MODIFY | `src/ui/sidepanel/chat-state.ts` | 156 / 154 | `error` 动作扩可选 `recovery?` 并原样进 payload（出生冻结语义不动）；`ask-resolved` 的掩码分支追加 `label: DIGEST_MASK`（**面② 的 digest 掩码痕迹**） |
| MODIFY | `src/ui/sidepanel/stream-plaintext.ts` | 154 | 新增 `DIGEST_MASK = '••••••'` 单源（值在 digest 里唯一可能的痕迹）；`ASK_COPY.secretWritten` 文案**逐字不动**（掩码 / 零明文 / 长度类别） |
| MODIFY | `src/ui/sidepanel/next-registry/providers.ts` | 156 | `blockedRecovery(blocked)`：由 `OPS_RECOVERY_ROWS` + `RECOVERY_CHIP_ORDER`/`RECOVERY_CHIP_TEXT` 经 `ACT_TO_OP` **派生**（键为 `BLOCKED_TERMINALS` 项 ⇒ BT-1 单源扫描保持绿）；**运行期**读枚举（避免 `definition ↔ providers` ESM 循环的 TDZ） |
| MODIFY | `src/ui/sidepanel/l0/risk-rail.ts` | 165 | `RAIL_RISK_CLASSES = ['probing','hardline','confirm','staleRef']`（4）+ `AUTH_STATES`（黄 / 绿两态文案单源）；`renderRiskRail` 只渲染 rail 子集 ⇒ **`unauthorized` 不再进 `#risk-chips`**（R-V5-105 / N23） |
| MODIFY | `src/ui/sidepanel/view-model.ts` | 164 / 165 | `toolbarDigest` **去掉 auth 段**（`origin · 会话`）；`band.statusText` 去掉授权态词（保留 `发现=`）；`L0View.authorized` 新增（状态栏 chip 的唯一状态源） |
| MODIFY | `src/ui/sidepanel/statusbar.ts` | 164 | `#auth-state` 的**唯一写入者**：`data-auth ∈ {yellow,green}` + 两态**逐字**文案，**永不 `hidden`**（两态恒显其一）；`riskActiveOf` 改读 **rail 子集**（J2 与 rail 写入者同源） |
| MODIFY | `src/ui/sidepanel/sidepanel.ts` | 159 / 161 / 164 / 166 | ① `__v3.testing.blockedError(blocked,text)`（经**真实 reducer** 铸阻塞 error 卡，恢复区由 `blockedRecovery` 派生）；② `__v3.testing.payloads()`（法八面①的 payload 读数）；③ `__v3.testing.recommend` 扩 `llm/perm/hard` 三模式（op-driven 阻塞态的可注入 `when(ctx)` 驱动）；④ 黄点击 ⇒ 流内 `op.authorize` next 卡 + 系统行（不跳走）；绿点击 ⇒ 管理详情展开 / 收起（`aria-expanded` 同步）；⑤ 管理详情 = **恰 1 个**键盘可达 `<select>`（两个 `op.revoke` / `op.rebind` 入口 ⇒ 展开后默认屏 **7 ≤ 7**） |
| MODIFY | `src/ui/sidepanel/index.html` | 163 / 165 | `#auth-state` **净新增**（`.status-line` 内、`#risk-chips` **之前**；`data-chrome-control="statusbar"` ⇒ 既有 `assertChromeNotInStream` 标记 + 形态双判据覆盖；**与状态行同行 ⇒ 不新增行** ⇒ journey 保护段保段）+ `#auth-detail`（默认 `hidden` + `data-density-exempt`）+ L2 树视图站点行改**指向 chip**（不复制状态值）+ 相应样式块（复用既有样式语言，零新依赖） |
| NEW | `test/ui/law8-plaintext.mjs` | 154 / 155 | 法八四面（①流内 payload ②digest ③审计渲染 + 审计存储 ④DOM value + **全部 attributes 逐项**）+ 哨兵 `sk-v5-law8-Q7mZ4tR9xK2p` + 第 5 信号（哨兵形状 == 源文本读出的 `SECRET`）+ **四类注入反证**（逐条 FAIL ⇒ 还原 PASS）+ key 直写恰 1 点 + 「哨兵只出现在 key-store」 |
| NEW | `test/ui/no-dead-end.mjs` | 159 / 160 / 161 | `nextOf` 双形态 + 5 类阻塞**逐类** + 死端 = 0 同屏扫描 + ✖ 行不裸奔 + **共享样本 `fixtures/s2-chain.mjs` 不复制**（S2 10 环节主验收）+ 单源扫描（`BLOCKED_TERMINALS` == 样本）+ **双向注入反证** + N = 0 源文本口径（无 sleep / 定时器；`waitFor` 仅面板就绪、不参与死端判据） |
| NEW | `test/ui/auth-chip.mjs` | 163~166 | 两态恒显其一 + **零双写四词扫描**（唯一命中 = `#auth-state`）+ 授权态不再占 rail + J1~J4 + 黄点击（产 `op.authorize` next 卡 + 系统行 + **零跳转**）+ 绿点击（管理详情默认折叠 / 展开 7 ≤ 7 / 键盘可达 / 零跳转）+ 三条注入反证 |
| MODIFY | `test/ui/stream.mjs` | 158 | **纯新增**第 ⑩ 组断言（阻塞类行内 chip / 非阻塞零 chip / 「出生后不 patch」/ 点击不 patch 原卡）：68 → **73** |
| MODIFY | `test/ui/stream-model.test.ts` | 156 | 新增 2 条 node 判据：`recovery` 流经 reduce/render **不被裁剪** ∧ 缺省 ⇒ 零回归；出生冻结 ⇒ 出生后**无 patch 路径** |
| MODIFY | `test/host-registry.test.ts` | 162 | **只追加**：`AUTH_CHROME_IDS` + 第 ⑦ 类问题串（`#auth-state` / 管理详情 / 分隔条**不在 `#stream` 子树**）+ ZH-8 判据 + `index.html` 结构断言（`data-chrome-control` / `hidden` 默认折叠）+ 反证 |
| MODIFY | `test/s2-deadend-chain.test.ts` | 159 | v5-2 登记的「`no-dead-end.mjs` 留给 v5-3」**边界按约定翻转**为「v5-3 已单点落地」（判据双向：文件缺失即红） |
| MODIFY | `test/gate-integrity.test.ts` | 155 / 159 / 162 | `EXPECTED_AUDITED_FILES` **只追加**三个新 Chromium 门禁（`CHROMIUM_GATES.length === 9` 不动） |
| MODIFY | `package.json` | 154~166 | 新增 `test:law8` / `test:dead-end` / `test:auth-chip` 并追加进 `test:v3` **串行链**（在 `test:gate-integrity` 之前） |
| MODIFY | `docs/v4-supersession-ledger.json` | 159 | v5-2 叶段的 `s2-deadend-chain.test.ts` 删除行**逐字登记**（4 行）+ `summary` 两读数同源复算（13 / 170） |

---

## 3. 任务完成清单

| 任务 | 名称 | 复杂度 | 状态 | 对应 FR |
|------|------|:--:|:--:|------|
| TASK-V5-153 | SG-4：5 类阻塞 headless 驱动 seam 探针 | S | ✅ completed（**seam-available 5/5**，只读、`git status` 零输出） | FR-ALLN-010/011/015 |
| TASK-V5-154 | `law8-plaintext.mjs` 骨架（SENTINEL + 面①②③） | L | ✅ completed | FR-ALLN-023 · AC-ALLN-003 |
| TASK-V5-155 | 面④（全部 attributes）+ 提交后清空 + 四类反证 + 受审追加 | M | ✅ completed | FR-ALLN-023/024/121 |
| TASK-V5-156 | `stream-model.ts` `error.payload.recovery` 渲染打通 | M | ✅ completed | FR-ALLN-012 |
| TASK-V5-157 | `cards/error.ts` 出生铸造恢复区 | M | ✅ completed | FR-ALLN-012 · AC-ALLN-002 |
| TASK-V5-158 | `test/ui/stream.mjs` 增断言 + 「出生后不 patch」反证 | M | ✅ completed（68 → 73） | FR-ALLN-012/115 |
| TASK-V5-159 | `no-dead-end.mjs` 5 类逐类 + `nextOf` 双形态 + 受审追加 | L | ✅ completed | FR-ALLN-010/011/015 |
| TASK-V5-160 | 死端 = 0 同屏扫描 + S2 全链主验收 | L | ✅ completed | FR-ALLN-011/015/016 |
| TASK-V5-161 | 双向注入反证 + 逐字节还原 | M | ✅ completed（①第 6 类无 provider ②移除铸造期恢复面） | FR-ALLN-015/121 |
| TASK-V5-162 | 零宿主反向判据复核（v4.5 判据在 v5 改动后仍成立） | M | ✅ completed | FR-ALLN-085 · N17 |
| TASK-V5-163 | `index.html` `#auth-state` 净新增 + 管理详情 DOM | M | ✅ completed | FR-ALLN-085/088/092 |
| TASK-V5-164 | `statusbar.ts` 两态写入（唯一写入者 + J1~J4） | L | ✅ completed | FR-ALLN-085/092 |
| TASK-V5-165 | 零双写五条（view-model / risk-rail / L2 站点行） | L | ✅ completed | FR-ALLN-086/092 |
| TASK-V5-166 | 黄 / 绿 chip 点击行为 + 四词扫描断言 | M | ✅ completed | FR-ALLN-087/088 |

**五要素（R1 局部读数，最终以 R2 TASK-V5-174 的三叶合计为准）**
| 要素 | 值 |
|---|---|
| `previousBaselineBytes` | 542,064 B（v5-2 收口轮实测） |
| `newBaselineBytes`（R1 实测） | **545,273 B**（Δ = **+3,209 B**，预算 3,250 B ⇒ 余量 41 B） |
| 生效上限（R1 判据） | **545,314 B** = 542,064 + 3,250（本轮闸门） |
| 测量来源 | `npm run build --workspace @lgdl/web-cli-plugin` ⇒ `stat -c %s dist/sidepanel.js` |
| 逐模块 Δ 归因 | `sidepanel.ts` +1,750（含 auth 点击 / `blockedError` / `payloads` / `recommend` 三模式）· `cards/error.ts` +548 · `providers.ts` +490 · `statusbar.ts` +418 · `risk-rail.ts` +261 · `chat-state.ts` +95 · `view-model.ts` **负**（去 auth 段）/ 未归因胶水 0 |
| 减体积处置 | ① 新 JSDoc 改 `//`（bundle 保留块注释）；② `blockedRecovery` 改运行期索引表；③ 管理详情用**恰 1 个** `<select>` 而非两按钮（同时满足「展开 ≤7」） |

**说明（口径诚实性登记）**
- **法八面② 的 `••••••`**：ADR-V5-010 §2 要求 digest 含掩码令牌 ⇒ 本轮把掩码卡的 digest 痕迹落为 `label: '••••••'`（`stream-digest#DIGEST_FIELDS` 的 `label` 列，经 `sanitizeLabel` 零明文扫描）。**固化文案**仍为 v5-2 逐字 `已写入（掩码 · 零明文 · {n} 位）`（零改动 ⇒ `ask-auth` 71/0 不受影响）。
- **法八面③ 的 `{opId, ts, result, maskedLength}` 四元组**：产品侧**不存在**把四者渲染在同一行的审计面（`AUDIT_RENDERED_FIELDS` 无 `maskedLength` 列，审计通道只记 tool/subcommand/决策）。本轮按**可得面**落判据：审计**渲染**（列集合 ⊆ 七列白名单 ∧ 零明文说明在位 ∧ 行内 action/time/result 齐备）+ 审计**存储**零命中 + 掩码写入的**事实**（掩码令牌 / 零明文 / 长度类别）在 digest 与固化区可读。**加一列 `maskedLength` 属 v5-2 入口侧改动，且需 +246 B ⇒ 越本轮预算**，登记为**已知差距（R2/validate 复核）**，不以「审计已加密」「四元组已渲染」类文案冒充。
- **存储侧边界**：只保证**流内零明文**（四面）；存储侧加密 **out-of-scope**（NG-ALLN-017），本报告与门禁均无「存储已加密」类声明。
- **`blockedRecovery` 是单一来源派生**（非第二种 5 字面量集合）：键为 `BLOCKED_TERMINALS` 项，`BT-1` 单源扫描绿；消费它的产品入口是 `__v3.testing.blockedError`（**经真实 reducer**，非影子实现），死端门禁的注入② 实跑证明「去掉铸造期恢复面 ⇒ 必红」。
- **`supported` 词的扫描口径**：四词在工具栏区零出现；`supported` 以**授权短语**（`已授权 · supported` / `未授权 · 零注入`）为准而非裸词 —— 发现态字面量 `发现=supported` 是**无关事实**，裸词匹配会是**假阳性**（不是更强的判据）。该口径由 `auth-chip.mjs` 的 `AUTH_PHRASES` 声明并机器执行。

---

## 4. 反证（FR-ALLN-121：两段证据，无恒绿判据）

| 判据 | 注入位置 | FAIL 段证据 | 还原 |
|---|---|---|---|
| 法八面① | `streamSeed` 一条 `ai` 卡的 `payload.text` | `law8` ① 注入段红 | `streamReset` ⇒ 零命中 PASS |
| 法八面② | `chrome.storage.local['web-cli/stream-digest:law8-evil'].entries[0].label` | `law8` ② 注入段红 | `remove` ⇒ 零命中 PASS |
| 法八面③ | `#l2-audit-host` 追加一条含哨兵的 `<p>` | `law8` ③ 注入段红 | 移除 ⇒ 零命中 PASS |
| 法八面④ | `#statusbar-text` 的 `title` + `data-law8-x` | `law8` ④ 注入段红（≥2 处属性命中） | 移除属性 ⇒ 零命中 PASS |
| 死端注入① | 第 6 类阻塞（`disk.full`，无 provider ⇒ 恢复区空 + 无 nextstep） | `no-dead-end` ND-5 FAIL 段红（死端 ≥1） | `streamReset` + 合法类 ⇒ 死端 0 PASS |
| 死端注入② | 摘掉阻塞 error 卡的 `[data-op]`（等价于「出生不带恢复面」） | `no-dead-end` ND-6 FAIL 段红 | 重铸 ⇒ 死端 0 PASS |
| 单源扫描 | 第 6 类 ⇔ 枚举集合 ≠ 样本集合 | ND-7 注入段红 | 集合相等 ⇒ 绿 |
| 两态恒显 | 零风险场景把 `#auth-state` 置 `hidden` | `auth-chip` ① FAIL 段红 | 还原 ⇒ 永不 hidden PASS |
| 零双写 | 把「已授权」写回 `#status`（工具栏区） | `auth-chip` ② FAIL 段红 | 还原 ⇒ 四词零命中 PASS |
| 黄点击产 next | 摘掉铸造卡的 `[data-op="op.authorize"]` | `auth-chip` ③ FAIL 段红 | 还原 ⇒ 命中 PASS |
| 零宿主（v4.5 判据在 v5 后仍成立） | 读数注入 `streamChromeIds: ['auth-state']` | `host-registry` ZH-8 红 | 干净读数 ⇒ 零问题 |

---

## 5. SG-4 结论（TASK-V5-153 · 闸门 → 159/160）

**结论：`seam-available`（5/5）**，且**同步渲染、同帧可断言**成立（无 sleep / 无 poll）。证据：`/tmp/opencode/v4-gate-logs/v5-3-r1/w13-spike-blocked-seam.log`（6 passed / 0 failed，**只读探针**；`git status --short` 零输出）。

| 阻塞类 | 驱动入口（headless） | seam（file:line） | 同帧读数 |
|---|---|---|---|
| `site.unauthorized` | 未授权 origin / `setRisk('unauthorized')`；推荐 `triggerMatch('site')` | `src/ui/sidepanel/next-registry/providers.ts:77` | 3 chips（`op.rebind` / `op.authorize` / `op.pick`） |
| `llm.unconfigured` | `ctx.risk ∋ llmBlocked`（key-store 为空）⇒ op-driven provider | `providers.ts:48`（`LLM_BLOCKED_RISK`） | 1 chip（`op.llm-config`） |
| `perm.missing` | `ctx.risk ∋ permBlocked`（`OPTIONAL_CAPABILITIES` 缺项） | `providers.ts:49`（`PERM_BLOCKED_RISK`） | 1 chip（`op.perm.request`） |
| `binding.stale` | `risk ∋ hardFloor`（`triggerMatch` 派生） | `providers.ts:74`（`RECOVERY_PROVIDER_TRIGGERS`） | 3 chips（`op.pick` / `op.describe` / `op.rebind`） |
| `ref.all-invalid` | `ctx.ref.staleCount ≥ 1 ∨ risk ∋ refInvalid`（trigger `refInvalid`） | `providers.ts:82`（`triggerMatch` refInvalid 分支） | 3 chips（同上） |

**缺口 / 新增 seam 的诚实登记**：`llm.unconfigured` / `perm.missing` / `binding.stale` 三类**没有**既有「一键驱动」入口（其 `when(ctx)` 是既有 7 源里的 `risk` 派生），本轮以**测试缝** `__v3.testing.recommend('llm'|'perm'|'hard')` 注入对应派生风险类（**同一 `when(ctx)` 语义，零新的真值源**，不新增 ctx 字段）。其余两类用既有 seam（`discover`/`setRisk` + `recommend('idle')`；`l1` ref seam + `recommend('stale')`）。**未以人工判据替代**。

---

## 6. 与基线对比 / R2 承接项（诚实登记，不静默）

### 6.1 门禁复跑 vs 基线

| 门禁 | 基线 | R1 实测 | 判定 |
|---|---|:--:|---|
| `npm test` | 1172 | **1175**（1171 pass / 4 fail） | 计数只增 ✅；4 红 = **体积五要素登记面**（`size-budget` / `size-growth-evidence` ×2 / `size-ruling-vol3` 的 metafile 值）⇒ **R2 TASK-V5-174** |
| `test:stream` | 68 | **73 / 0** | ✅ 只增 |
| `test:law8`（新） | — | **24 / 0** | ✅ 四面 + 四注入 |
| `test:dead-end`（新） | — | **29 / 0** | ✅ 5 类 + 死端 0 + 双注入 |
| `test:auth-chip`（新） | — | **30 / 0** | ✅ 两态 / 零双写 / 黄绿点击 |
| `test:gate-integrity` | 13 | **14 / 0** | ✅ 三新门禁入受审集合 |
| `test:ask-auth` | 71 | **71 / 0** | ✅ 零回归（掩码固化文案逐字未动） |
| `test:recommendation` | 65 | **65 / 0** | ✅ 零回归 |
| `test:ui`（journey） | 171 | **171 PASS** | ✅ **保护段保段**（同行布局不新增行；`#15b` 高度比 ≥0.65） |
| `test:l0` | 244 | **245 / 3 红** | 计数只增；3 红 = 授权态载体重锚（⑤×2 + ⑨ digest 段）⇒ **R2 TASK-V5-169** |
| `test:density` | 232 | **232 checks（222 / 10 红）** | 10 红 = ① `default@*` 可点 5→6（+auth chip）② `risk(unauthorized)` 风险行消失 ③「页面侧零注入」文案位置 ④ F 28 格漂移 ⑤ 几何来源 748→744px（仍 ≥488 下界）⑥ 产物字节 ⇒ **R2 TASK-V5-169 / 171 / 172 / 174** |
| `test:zero-injection` | 27 | **27 checks（26 / 1 红）** | 1 红 = 「L0 风险位明示『页面侧零注入』」⇒ 同族重锚（**R2 TASK-V5-169**） |
| `test:binding` | 192 | **192 checks（191 / 1 红）** | 1 红 = `#20e`「面板显示新域名未授权」读 `#status` 文本 ⇒ 该词**已按 FR-ALLN-086② 移出工具栏区**；`#20e` 位于保护段**之外**（byte 95,149 < 107,780）但重锚须**偏移避让**（保护段 pin `107780..115930` / sha 不变）⇒ **R2 TASK-V5-173 / 175**（**R1 按红线零触碰 binding 保护段**） |
| 体积 | 542,064 | **545,273（Δ +3,209 ≤ 3,250）** | ✅ 预算内（余量 41 B）；五要素**最终三叶合计登记**⇒ R2 TASK-V5-174 |

### 6.2 保护段
- **journey**：`data-narrow` 前，`#auth-state` 置于 `.status-line` 内（与 `#statusbar-text` / `#send-reason` 同行）⇒ **不新增行** ⇒ `journey` **171 PASS**、`#15b` 高度比未跌破 0.65、保护段 `43054..58287` / `cc79f413…` / 240 行**本轮零触碰**（R2 TASK-V5-173 仍须做「保段 vs 第三次八步」的**显式二选一**留痕）。
- **binding**：保护段 `107780..115930` / `be9ad0e9…` 本轮**逐字节零触碰**（`#20e` 位于其前，重锚归 R2 并按偏移避让纪律执行）。

### 6.3 R2 承接项（`167~176`）与登记
1. **TASK-V5-167/168**：`data-narrow`（`ResizeObserver`，360/361）+ 三档 radio 零残留 + 诚实登记（产品侧无拖动）。
2. **TASK-V5-169**：`l0.mjs` / `density.mjs` 等价重锚 —— 含本节 6.1 的 3 + 10 条（授权态载体 = `#auth-state`；`default` 可点 6 ≤ 7；四词扫描；J1~J4）。
3. **TASK-V5-170/171/172**：密度阈值逐字 + 口径解耦（宽度 → 控件计数不变）+ `tiers` 重锚 + `v5Ledger` 逐格留痕 + **X5 取代台账条目**（`modifiedRanges[]`）。
4. **TASK-V5-173/175**：journey 保段显式二选一 + **binding `#20e` 偏移避让重锚** + 取代台账一致性（含本轮 v5-2 叶段 4 行登记与 `summary` 复算）。
5. **TASK-V5-174**：体积五要素**三叶合计**登记（`SIDEPANEL_BASELINE_BYTES` 542,064 → 545,273 起算；ceiling / `_TIMELINE` / `GROWTH_BREAKDOWN` / `v3Vol3Closeout` 三值同源）。
6. **`maskedLength` 进审计行**（法八面③ 四元组的完整形态）：+246 B **越本轮预算** ⇒ 登记为已知差距，建议并入 R2 体积轮评估（须先做五要素与档位闸门）。
7. **`modifiedRanges[]`（v5-3 段）**：本轮对 `test/**` 的编辑**全部为纯新增**（`git diff --numstat` 删除行 = 0，`s2-deadend-chain.test.ts` 的 4 行为 v5-2 边界翻转，已逐字登记于 v5-2 叶段）⇒ **无需新增等价重写条目**（零改写）；v5-3 段的台账条目（X5 + 本叶 `modifiedRanges[]`）在 R2 TASK-V5-172/175 与本叶收口一次性登记。

---

## 7. 关键实现说明（供 review）

1. **`#auth-state` 布局选择**：ADR-V5-006 §1 要求「`#region-statusbar` 后代 ∧ 位于 `#risk-chips` 之前」，并「尽量不新增行」。落在 `.status-line` 行内（`#risk-chips` 之前，文档序满足）⇒ 零新增行 ⇒ journey 保段成立。DOC 上的取舍（ADR 原文建议与 `#risk-chips` 同行）已在此显式登记。
2. **管理详情用 `<select>`**：两个 op 入口（`op.revoke` / `op.rebind`）落在**同一控件**的两个 `<option>` 上，使「展开后默认屏 7 ≤ 7」与「两入口齐备 + 键盘可达」同时成立（若用两个 `<button>` 则 8 > 7）。
3. **恢复区 chip 的分发语义**：`data-act="next"`（渲染层「可执行的下一步」标记，✖ 行不裸奔判据）+ `data-op`（**分发依据**，op-direct 约定）；点击**不**把 chip 文案当 value 传入（否则 `op.*` 的 `params` 阶段会被跳过）。
4. **`error` 出生铸造**：恢复区在 `createErrorCard` 同一调用内完成；`BORN_FROZEN_KINDS` **逐字未改**，且 reducer 的 `error` 分支只承载数据（判定在 `blockedRecovery`，单一来源）。

---

## 8. build R2（`TASK-V5-167~176` · 波 E 后段~G）—— 末叶 / 收口叶 + 三叶合计终轮

> **本轮起点**：HEAD `ad8e8af`（R1 后：`npm test` **1175**（1171 pass / 4 fail = 体积五要素登记面）· 体积 **545,273 B** · 4 门禁 10 条红 = 授权态载体下移的等价重锚）。**本轮终点**：**25 门禁全绿**、体积 **546,370 B**、`npm test` **1181/0**。

### 8.1 交付概要（`167~176`）

| 任务 | 交付 | 关键读数 |
|---|---|---|
| `167` `data-narrow` | `sidepanel.ts#installNarrowObserver`（`ResizeObserver` 观测 `#panel` **实际宽度**，≤360 → `"true"` / ≥361 → `"false"`）；`index.html` `<body id="panel">` + 3 条窄屏样式（复用既有样式语言） | `density` ⑯：360 ⇒ `true` / 361 ⇒ `false` 逐值；320px 零水平溢出 |
| `168` 零宽度控件 + 诚实登记 | 产品侧零宽度切换控件扫描（7 项模式逐项零命中）+ **两条注入反证**（三档 radio ⇒ 红；按视口口径 ⇒ 红） | `density-thresholds` W3（含 3 条判据自证）；`knownLimitations` 新增第 8 条 |
| `169` 13 条载体重锚 | `l0` ⑤ 的 `unauthorized` 改读 `#auth-state`（三通道 = 文字 + `data-auth` + `aria-controls`）；`❾` 摘要改 `origin · 会话`（并**加严**：四词零出现）；`density` `default` 准入 5 → **6**（+ 授权 chip）；`risk(unauthorized)` 载体改 chip；`zero-injection` / `page-input` 的「零注入」明示面改 chip；`binding` `#20e` 改读 chip | `l0` 245 → **248/0**；`density` 232 → **242/0**；`zero-injection` 27 → **28/0**；`page-input` 108/0；`binding` **192 PASS** |
| `170` 阈值 + 边界 | `density-thresholds.test.ts` 新增 **W1~W4**（阈值六值**字面**比对 + 机读基线同源；`data-narrow` 边界 + `ResizeObserver`/非 `matchMedia`；**宽度 → 控件计数不变**；`v5Ledger` 宽度维留痕） | `density-thresholds` 全绿（`npm test` 内） |
| `171` 口径解耦 + 31 格留痕 | 格 = **控件计数**（与宽度解耦）；`v5Ledger` 31 格**逐格留痕**（`before` / `after` / `delta` / 六字段 / `reason ≥40`）+ 边界 2 格 + 宽度不变性 1 组；320 锚点保留 | `registeredCells === 31`（不删格）；`stageF` 逐格同源机核 |
| `172` `tiers` 重锚 + X5 | `tiers` 31 格等价重锚（授权 chip 载荷：`clickables +1` / `blocks +1` / `chars +5`；`unauthorized` 载体下移 ⇒ 8→7 / 17→16 / 256→212）；`v5Ledger` 取代 `v45Ledger` 为**最新同源台账**（后者逐字保留为历史）；`modifiedRanges[]` 追加 X5 逐行（五要素） | `supersession` **36/0**；`density` F 28 格全绿 |
| `173` journey 保段 + binding 避让 | **显式二选一 = 保段**：journey 保护段 sha `cc79f413…` / `startByte 43054` / 240 行**三不变**（`data-narrow` 只改样式层、不新增行、不动 DOM 结构）；binding `#20e` 重锚为**字节中立**改写（改写点全在保护段之前 ⇒ 与旧行**等量置换**，`startByte 107780` 与段 sha `be9ad0e9…` 双绿） | `journey` **171 PASS**；`protectedPinFailures` 双绿；RP-V4-08 反证绿（`npm test` 内） |
| `174` 体积三叶合计 + `maskedLength` | 五要素：542,064 → **546,370 B**（Δ **+4,306**，`v53Rows` Σ 模块 +4,306 + glue 0）；`_TIMELINE` / `_HISTORY` / `SIDEPANEL_RE_REGISTRATIONS['v5-3-r2']` / `SIDEPANEL_GROWTH_BREAKDOWN.v53Rows` / `roundRowRegistrationIds` 全部只追加；**档位 563,200 / 绝对上限 619,520 / `pending-author-line` 三值同源且不变**；生效上限 `floor(546,370 × 1.05) = 573,688`；**法八面③ `maskedLength` 审计列落地** | `size-budget` 16/0 · `size-growth-evidence` 17/0 · `size-ruling-vol3` **12/0**；`density` F 产物字节同源 |
| `175` 台账一致性 + 受审收口 | X5 逐行五要素机核 + 体积三值同源机核（新增专用用例）；`gate-integrity` 新增「父 Feature 8 新门禁逐项在册」用例并把 `test/next-registry.test.ts` 补入下界声明 | `supersession` **36/0** · `gate-integrity` **15/0** |
| `176` 全门禁串行收口 | 见 §8.3 的 25 项对账表 + §8.4 人工面清单 | **25/25 全绿** |

### 8.2 文件变更（R2）

| 操作 | 文件路径 | 对应任务 | 说明 |
|:--:|------|:--:|------|
| MODIFY | `src/ui/sidepanel/sidepanel.ts` | 167 / 174 | `installNarrowObserver()`（`ResizeObserver` 观测 `#panel` 实际宽度，≤360 → `data-narrow="true"`）+ bootstrap 调用；`submitSecret` 落审计面（只发**长度类别** `8+`/`8-`，不发值）|
| MODIFY | `src/ui/sidepanel/index.html` | 167 | `<body id="panel">`（面板根可寻址）+ `#panel[data-narrow='true']` 三条窄屏样式（`.view-label` 隐藏 / `site-origin` 压缩 / `site-session` 隐藏）|
| MODIFY | `src/ui/sidepanel/l2/audit.ts` | 174 | **法八面③ `maskedLength` 审计列**：白名单 + 渲染列 + `AuditRow.maskedLength?` + `toAuditRow`（**只接受 `8+`/`8-` 两个字面量** ⇒ 该列不可能成为侧信道）+ `renderAudit` 单元格 + 零明文说明补注 |
| MODIFY | `src/security/audit-sink.ts` | 174 | `PluginAuditEvent.maskedLength?: string`（类型位；**不是值、也不是原始长度**）|
| MODIFY | `src/background/service-worker.ts` | 174 | `case 'llm-config'`：仅当载荷携带合法长度类别时落一条审计行（`decision: 'write-masked'`）；纯查询零写入、返回形状逐字不变 |
| MODIFY | `test/ui/density.mjs` | 167~172 | 13 条载体重锚 + 新增 **⑯ 宽度组**（边界双值 / 宽度不变性 / 320 零溢出 / R-V5-106 反证 + 注入反证 / `v5Ledger` 宽度维机核）|
| MODIFY | `test/ui/l0.mjs` | 169 | ⑤ `unauthorized` 载体改 `#auth-state`（新增 `AUTH_CHIP_PROBE`）；⑨ 摘要断言改 `origin · 会话` 并**加严**（四词零出现）|
| MODIFY | `test/ui/zero-injection.mjs` / `test/ui/page-input.mjs` / `test/ui/l2.mjs` | 169 | 「零注入」明示面 / `#l2-entry-summary` 摘要断言按新载体等价重锚 |
| MODIFY | `test/ui/binding.mjs` | 173 | `#20e` 读数面改 `#auth-state`（`waitFor` 载荷加 `auth`）—— **字节中立**（保护段 `be9ad0e9…` + `startByte 107780` 双绿）|
| MODIFY | `test/ui/law8-plaintext.mjs` | 174 | 面③ 白名单改八列 + 新增「掩码写入行带 `maskedLength`（8+/8-）」断言（法八面③ 四元组在**渲染面**可机核）|
| MODIFY | `test/density-thresholds.test.ts` | 168 / 170 / 171 | 新增 W1~W4 用例（阈值字面 / 窄屏观测器与非 `matchMedia` / 零宽度控件扫描 / 宽度解耦 + 台账宽度维）|
| MODIFY | `test/size-baseline.ts` | 174 | 五要素三叶合计：`SIDEPANEL_BASELINE_BYTES` 546,370 / `SIDEPANEL_FINAL_ARTIFACT_BYTES` / `_TIMELINE` / `META` / `SIDEPANEL_RE_REGISTRATIONS['v5-3-r2']` / `SIDEPANEL_GROWTH_BREAKDOWN.v53Rows` + glue / `roundRowRegistrationIds` / `closeoutDeltaBytes` / 桶分摊 |
| MODIFY | `test/size-budget.test.ts` / `test/size-growth-evidence.test.ts` / `test/size-ruling-vol3.test.ts` | 174 | 档位闸门 / 生效上限 / 最新一轮 rows 指向 `v53Rows` / N-05 组数 20 → 21 的等价重锚 |
| MODIFY | `test/l2-counts.test.ts` | 174 | 审计白名单 8 → 9 / 渲染列 7 → 8（`maskedLength`）+ 两方向可核（探针值齐备）+ 只接受两字面量的负例 |
| MODIFY | `test/gate-integrity.test.ts` | 175 | 新增「父 Feature 8 新门禁逐项在册」用例 + `test/next-registry.test.ts` 补入下界声明（只追加）|
| MODIFY | `test/supersession-ledger.test.ts` | 175 | 新增「X5 逐行五要素 + 体积三值同源」用例（只追加）|
| MODIFY | `docs/v4-density-baseline.json` | 171 / 172 / 174 | `tiers` 31 格等价重锚 + `v5Ledger`（31 格 + 边界 2 + 宽度不变性 1）+ `riskIncrementRegistry.reanchorV5`（`staleRef@320` 收紧为 0 违规，旧期望逐字保留）+ `knownLimitations` 第 8 条（诚实登记「产品侧不实现 280–640 拖动」）+ `volume` 546,370 / 573,688 |
| MODIFY | `docs/v4-supersession-ledger.json` | 172 / 173 / 175 | 新增 v5-3 叶段（`leafBase 9b262ae`：scope 35 文件 / 逐字登记 83 行）+ X5 `modifiedRanges[]`（`V53-MR-binding-*` 五要素）+ `V53-E-1` 语义改写条目 + `v3Vol3Closeout.⑤三值闭合.newBaselineBytes → 546,370` |

### 8.3 门禁对账（25 项，**全绿**）

| # | 门禁 | 基线 | R2 实测 | # | 门禁 | 基线 | R2 实测 |
|:--:|---|---|:--:|:--:|---|---|:--:|
| 1 | `npm test` | 1175 | **1181 / 0** | 14 | `l2-reverse` | 10 | **10 PASS** |
| 2 | `test:ui`(journey) | 171 | **171 PASS** | 15 | `test:law8` | 24 | **25 / 0** |
| 3 | `test:binding` | 192 | **192 PASS** | 16 | `test:dead-end` | 29 | **29 / 0** |
| 4 | `test:l0` | 244 | **248 / 0** | 17 | `test:auth-chip` | 30 | **30 / 0** |
| 5 | `test:l1` | 116 | **116 / 0** | 18 | `test:e2e` | PASS | **PASS** |
| 6 | `test:l2` | 74 | **74 / 0** | 19 | `test:supersession` | 35 | **36 / 0** |
| 7 | `test:density` | 232 | **242 / 0** | 20 | `test:gate-integrity` | 13 | **15 / 0** |
| 8 | `test:insight` | 116 | **116 PASS** | 21 | `test:size-ruling-vol3` | 12 | **12 / 0** |
| 9 | `test:hardening` | 24 | **24 PASS** | 22 | `test:design-contract` | 13 | **19 / 0** |
| 10 | `test:page-input` | 108 | **108 / 0** | 23 | `test:ref-pick-wiring` | 11 | **11 / 0** |
| 11 | `test:stream` | 73 | **73 / 0** | 24 | `test:size-budget` | — | **16 / 0** |
| 12 | `test:ask-auth` | 71 | **71 / 0** | 25 | `test:size-growth-evidence` | — | **17 / 0** |
| 13 | `test:recommendation` | 65 | **65 / 0** |  | `test:zero-injection` | 27 | **28 / 0** |

**体积（三叶合计终轮）**：542,064 → **546,370 B**（Δ **+4,306**；逐模块 Σ +4,306 + glue 0）；档位 **563,200** / 绝对上限 **619,520** / `pending-author-line` **均不变**；生效上限 **573,688**。红线：`dist/content.js` **177,076 B** / sha `52a82620…`、`dist/pick-layer.js` **33,900 B** / sha `5f567d7e…` **逐字节不变**；`src/content/**` / `manifest.json` / `design/**` / `docs/v3-supersession-ledger.json` / `ROADMAP.md` **零 diff**。

### 8.4 人工面清单（9 项，**不得冒充 PASS**）

| # | 人工面 | 状态 |
|:--:|---|:--:|
| 1 | 浏览器原生权限弹窗体感（`chrome.permissions.request` 原生弹窗） | ⏳ 未执行 |
| 2 | 授权 chip 两态观感（黄 / 绿 + 布局） | ⏳ 未执行 |
| 3 | 拖动宽度体感与性能（**G 稿契约侧**；产品侧不实现 —— 见 §8.5） | ⏳ 未执行 |
| 4 | 绿态管理详情手感（展开 / 键盘） | ⏳ 未执行 |
| 5 | 双主题（auto / light / dark）观感 | ⏳ 未执行 |
| 6 | 320px 真机体感 | ⏳ 未执行 |
| 7 | 键盘可达（Tab 序 / `:focus-visible`） | ⏳ 未执行 |
| 8 | 读屏（掩码输入 + chip 播报） | ⏳ 未执行 |
| 9 | 真机 S2 断流走查 | ⏳ 未执行 |

### 8.5 诚实登记与已知差距（R2）

1. **`maskedLength` 审计列已落地**（编排器裁决「落」）：`AUDIT_RENDERED_FIELDS` 8 列（+`maskedLength`）；生产路径 = `submitSecret`（掩码卡提交，只发**长度类别**）→ SW `llm-config` 落审计行（`decision: 'write-masked'`）→ L2 审计行渲染该列 ⇒ 法八面③ 四元组 `{命令/动作 · 时间 · 结果 · 掩码长度类别}` 在**渲染面**可机核（`law8` 面③ 新增断言）。**值从未离开面板的 key store 写入点**；该列只接受 `8+` / `8-` 两个字面量（其他形状一律丢弃）。成本实测 **+566 B**（估 +246 B 偏乐观），已按三叶合计口径重登记。预算口径诚实登记：`ADR-V5-011 §1` 的 v5-3 逐项预算 **3,250 B** 被 R1 用满（+3,209），R2 的 `maskedLength` 列 + `data-narrow` 使本叶合计 **+4,306 B** ⇒ **显式超出行预算**并按三叶合计重登记（未删格、未放宽容差、未下调档位、未伪称已确认）。
2. **产品侧不实现 280–640 拖动**（FR-ALLN-089 = 设计稿契约；G 127 断言在 `design-contract` 冻结）：产品侧落地 = `data-narrow` 兜底 + 密度口径解耦；已登记于 `v4-density-baseline.json#knownLimitations` 第 8 条，防被误读为「089 未实现」。
3. **存储侧边界**：只保证**流内 / 审计渲染面零明文**（四面 + 审计列）；存储侧加密仍 **out-of-scope**（NG-ALLN-017），无「存储已加密」类声明。
4. **`staleRef@320` 收紧**：`data-narrow` 落地后 320px 不再越过折线（`#scroll-bottom` 漂移消失）⇒ 该格由「1 条违规」收紧为 0，旧期望逐字保留于 `riskIncrementRegistry.reanchorV5.previousExpectation`。
5. **`#auth-state` 的三通道** = 可见文字 + `data-auth`（机器态）+ `aria-controls → #auth-detail`（关系通道）；**未加 `aria-label`**（可访问名即文字内容，避免与 `aria-expanded` 语义重复）—— 与 R1 的 `auth-chip` 门禁口径一致。

---

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.1 | **R2 = `TASK-V5-167~176`**（末叶 / 收口叶）：`data-narrow`（`ResizeObserver`，360/361 + R-V5-106 反证）· 零宽度控件 + 诚实登记 · **13 条载体重锚**（l0 248/0 · density 242/0 · zero-injection 28/0 · binding 192 PASS）· 密度口径解耦 + `v5Ledger` 31 格逐格留痕 · `tiers` 重锚 + X5 取代台账 · journey **保段**（三不变）+ binding `#20e` **字节中立**重锚 · 体积三叶合计 **542,064 → 546,370 B**（+4,306）· **法八面③ `maskedLength` 审计列落地**（+566 B）· `gate-integrity` 8 新门禁受审收口 · **25 门禁全绿**（`npm test` 1181/0） | 2026-09-22 | SDDU Build Agent |
| v1.0 | 初始创建（R1 = `TASK-V5-153~166`：SG-4 seam-available 5/5 · 法八四面机核（含四类注入反证 + digest 掩码 + key 直写恰 1 点）· `error` 出生恢复区 · 死端守护门禁（5 类 + 死端 0 + 双注入 + S2 主验收）· 零宿主复核 · 授权 chip 两态与零双写 + 黄 / 绿点击；体积 545,273 B ≤ 545,314 / Δ +3,209 ≤ 3,250；4 门禁 10 条载体重锚 + 4 条体积登记面按波次归 R2） | 2026-09-22 | SDDU Build Agent |
