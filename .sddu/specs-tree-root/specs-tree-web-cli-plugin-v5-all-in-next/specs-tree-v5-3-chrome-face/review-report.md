# 审查报告：specs-tree-v5-3-chrome-face

> **文档定位**: SDDU 审查报告 — 逐项记录自主审查的执行结果，作为 validate 阶段的输入
> **审查策略**: review.md（C1~C39 审查清单及四维度指引，本文件不改策略）
> **前置依赖**: review.md、spec.md、plan.md、build.md（R1/R2 + §9 review R1 修复轮）
> **创建人**: SDDU Review Agent
> **创建时间**: 2026-09-22
> **审查轮次**: **R2（复审：BLOCK-01 闭环 + I 项抽检 + 修复轮新引入风险扫描）**
> **版本**: v2.0
> **更新人**: SDDU Review Agent
> **更新时间**: 2026-09-22
> **更新说明**: R2 复审。审查对象 = HEAD `19c3beb`（review R1 修复轮）；对照基线 = 修复轮前 `b0a679e`（R1 报告对象）/ 叶基线 `9b262ae`。**结论 ✅ 通过（0 阻塞 / 0 失败 / 0 改进；残余 5 项观察）**：BLOCK-01（FR-ALLN-086⑤ / AC-ALLN-012 / ADR-V5-006 §2⑤）**已彻底闭环并独立证伪**；I-01~I-05 全部处置且独立复核；修复轮 diff 未引入新风险。R1 的 1 阻塞 + 5 改进全部关闭。

## 1. 审查概要

| 维度 | 数值 |
|------|:--:|
| 复审项总数（R2） | 10（1 阻塞闭环 + 5 改进复核 + 4 修复轮新风险面） |
| 通过 | **10** |
| 警告（改进） | **0** |
| 失败（阻塞） | **0** |
| 阻塞问题 | **0** |
| 规范符合率 | 10 / 10 = **100%** |

**范围**：① BLOCK-01 闭环（L2 站点行零授权态值 + auth-pointer 指针，三处载体 + 运行期可见）；② I-01/I-02/I-05 抽检（口径成文 / dot 解耦 / 对象键穷尽），并复核 I-03/I-04 证据面；③ 修复轮 diff 全量扫描（`b0a679e..19c3beb`，26 文件 / +1077 −129）；④ 门禁抽跑 6 项（另加跑 2 项受 I-02 影响面）；⑤ 红线快验。

### 1.1 独立复跑（门禁抽跑 6 项 + 追加 2 项 + typecheck）

| 门禁 | build 声明 | 本轮独立复跑 | 判定 |
|---|---|:--:|:--:|
| `npm test` | 1181 / 0 | **1181 / 0** | ✅ |
| `test:insight` | 118 / 0 | **118 PASS** | ✅ |
| `test:auth-chip` | 37 / 0 | **37 / 0** | ✅ |
| `test:dead-end` | 39 / 0 | **39 / 0** | ✅ |
| `test:size-ruling-vol3` | 12 / 0 | **12 / 0** | ✅ |
| `test:ui`（journey） | 171 PASS | **171 PASS** | ✅ |
| `test:l0`（追加：I-02 触及 `l0/shell.ts` 写点） | 248 / 0 | **248 / 0** | ✅ |
| `test:density`（追加：密度/几何面回归） | 242 / 0 | **242 / 0** | ✅ |
| `npm run typecheck`（I-05 编译期判据前置） | 0 | **0** | ✅ |
| 构建可复现（`npm run build`） | 547,558 B | **547,558 B** + `content.js`/`pick-layer.js` sha 逐字节不变 | ✅ |

### 1.2 独立证伪（不采信声明，实跑两段）

| # | 注入 | 期望 / 实测 |
|---|------|------|
| F1 | `src/insight/project-tree.ts#siteBadges` 回退为授权态徽标值（`authorized/unauthorized` + 「已授权/未授权」）→ 重建 dist → `test:insight` | **EXIT=1**；`#I-20a1` 红，读数 `siteAuthStateValues:["已授权"]` / `authPointerCount:0`（判据非恒真） |
| F2 | 逐字节还原（`git checkout`）+ 重建 → `test:insight` | **EXIT=0 / 118 PASS**；产物 **547,558 B**；红线 sha 不变 |
| F3 | `definition.ts#BLOCKED_RECOVERY_TRIGGER` 删去 `'ref.all-invalid'` 键 → `tsc --noEmit` | **exit=2 / TS1360**（「Property '"ref.all-invalid"' is missing … but required」）+ 下游 TS7053/TS7006（穷尽性非空转） |
| F4 | 还原键 → `tsc --noEmit` | **exit=0** |

### 1.3 红线快验（逐字节）

`dist/content.js` **177,076 B** / sha `52a826205553b46a896ccad54225d63ba62f5f7fe7c969a9bc2e655448d5b5f6`；`dist/pick-layer.js` **33,900 B** / sha `5f567d7ededc58183afe4ce45e3293b68204dfbe788dc6b9fb09bdc6e0d13e59` —— 与叶基线 `9b262ae` 逐字节相同；`git diff --name-only 9b262ae..19c3beb` 受检红线面（`design/**` · `manifest.json` · `KIND_SET` · `docs/v3-supersession-ledger.json` · `ROADMAP.md` · 判定链 `policy.ts` / `auto-authorize.ts`）**零命中**（修复轮 diff 亦不含任何红线文件）。产物 `dist/sidepanel.js` = **547,558 B** == 登记值（五要素六文件同源：546,370 → +1,188）。

### 1.4 R1 → 修复轮 → R2 的账（合并口径）

| 轮次 | 对象 | 结论 | 计数 |
|---|---|---|:--:|
| R1（本文件 v1.0） | HEAD `f8e50e8` / 基线 `9b262ae` | ❌ 不通过 | 39 项 = 33 ✅ / 5 ⚠️ / 1 ❌（BLOCK-01）+ O-1~O-3 |
| 修复轮（build） | 输出 HEAD `19c3beb` / 基线 `b0a679e` | 声明 1 阻塞 + 5 改进全闭环 | diff 26 文件 / +1077 −129；体积 +1,188 |
| **R2（本文件 v2.0）** | HEAD `19c3beb` | ✅ **通过** | 复审 10 项全 ✅；R1 遗留 = **0 ❌ / 0 ⚠️**（残余 5 项观察） |

## 2. 逐项复审结果

> 说明：R1 清单 `C1~C39` 保持不变（策略不改）；下表 = R2 复审面。R1 判 ✅ 的 33 项在修复轮 diff 中**未被触碰或仅受等价影响**（见 §2.4 全量 diff 扫描），本轮不重复展开。

### 2.1 BLOCK-01 闭环（R1 的 ❌ 项）

| # | 审查对象 | 审查基准 | 评估 | 发现 | 严重程度 |
|---|---------|---------|:--:|------|:--:|
| R2-1 | `project-tree.ts#siteBadges`（:99-124）载体①：投影层零授权态值 | FR-ALLN-086⑤ / AC-ALLN-012 / ADR-V5-006 §2⑤ | ✅ | 旧 `authorized ? {kind:'authorized',label:'已授权'} : {kind:'unauthorized',label:'未授权'}` 已整体移除，改为 **`AUTH_STATE_POINTER_BADGE`**（`kind:'auth-pointer'` / label「授权态→状态栏 chip」/ tone muted，`:111-115`，含条款注释）。`trust` 维（policy）保留——不同维度、由自身通道承载，非授权态复制 | — |
| R2-2 | `tree-view.ts`（:80 / :556-562）载体②：站点行文案改指针 | 同上 | ✅ | 站点行 `sublabel` 由 `node.authorized ? '已授权站点（可撤销授权）' : '未授权站点…'` 改为**单源常量** `TREE_AUTH_POINTER_NOTE = '授权状态见状态栏授权 chip（本台账不复制状态值）'`；指针文案与徽标不再各写一份 | — |
| R2-3 | `tree-drawer.ts`（:228-237 / :629-639）载体③：DOM 指针 + 运行期可见 | 同上 | ✅ | 徽标渲染判 `kind === 'auth-pointer'` ⇒ `data-auth-pointer="#auth-state"`；**指针说明节点在 `ensureShell()` 内重建**（`:235-237`），晚于 `root.replaceChildren()`（`:216`）且 `ensureShell()` 幂等（`if (shell) return shell`）⇒ 首次打开后长期驻留（R1 的「静态文案被 replaceChildren 清除」已消除） | — |
| R2-4 | `test/ui/insight.mjs#I-20a1 / #I-20a3` 反向等价重锚 | FR-ALLN-120 / FR-ALLN-003 | ✅ | 旧断言面 `siteAuthorized === '已授权'` **删除并反向重锚**为：`siteAuthStateValues.length === 0` ∧ 行文案 `!/已授权\|未授权/` ∧ `authPointerCount ≥ 1` ∧ 指针目标 `=== '#auth-state'` ∧ `#auth-state` 可解析（`#I-20a1`）；`#I-20a3` = 指针说明节点在 `replaceChildren()` 之后存活且指向 chip。**116 → 118**（旧面零删除，逐字登记台账） | — |
| R2-5 | 投影层单测 + 哈希 pin 的等价重锚 | FR-ALLN-003 / 120 | ✅ | `insight-projection.test.ts`：两站点行断言「零 `authorized`/`unauthorized` 徽标 ∧ 各带指针」+ 直方图 `badges.authorized === undefined` / `'auth-pointer'` 为 number；`insight-archive.test.ts`：`tree-view.ts` 内容哈希 **显式重 pin**（`b0075d15…` → `004f6174…`，旧值逐字保留在同文件注释）；三处均登记 `docs/v4-supersession-ledger.json#modifiedRanges`（`V53R1-MR-insight-*`，含 reason） | — |

**BLOCK-01 判定：✅ 闭环（彻底）**。判据 = ①源码三处载体零授权态值 + 指针（读码确认，非仅信声明）；②运行期可见（`#I-20a3` 绿 + `ensureShell` 幂等读码）；③**独立证伪**（F1 回退 ⇒ `EXIT=1` 且读数精确复现 R1 的阻塞形态；F2 逐字节还原 ⇒ `EXIT=0`）。R1 建议的「(a) 修」路线被完整执行，且条款已回写叶 `spec.md §4` 为**硬口径**。

### 2.2 I 项抽检（I-01 / I-02 / I-05 + I-03 / I-04 证据面）

| # | 审查对象 | 审查基准 | 评估 | 发现 | 严重程度 |
|---|---------|---------|:--:|------|:--:|
| R2-6 | **I-01** 四词扫描口径成文 + 语义位判据 | FR-ALLN-086② / ADR-V5-006 §2 | ✅ | 口径已回写**权威条文**（不再只在 build.md）：`ADR-V5-006 §2`「四词扫描口径」四条（判据对象 = 授权态**语义位** `[data-auth]` + 两态逐字短语；三裸词仍扫；`supported` 只按短语；**显式白名单式登记，非静默放宽**）+ 叶 `spec.md §4` 注。机核 `auth-chip.mjs`：`AUTH_SLOT='[data-auth]'`，判「全 UI 恰 1 处 = `#auth-state`」+「工具栏区 0 处」+ **注入反证**（把 `data-auth` 塞进工具栏 ⇒ 红 / 还原 ⇒ 绿）。实跑 37/0 含 ② 段 6 条新判据全绿 | — |
| R2-7 | **I-02** 摘要 dot 与授权态解耦 + `policyTone` | FR-ALLN-085 / 086 | ✅ | `statusDot: !origin ? 'idle' : 'ok'`（只表**会话连接态**，G 稿「摘要 dot 恒绿」）；新增 `policyTone: !origin ? 'idle' : trust === 'trusted' ? 'ok' : 'warn'` 并由 `l0/shell.ts:125` 写 `policyBadge` 的 `data-tone`（此前该值搭授权 dot 的便车）。**独立佐证**：`auth-chip` ②（green 下 dot=ok）与 ③（同 origin 授权态 green→yellow 翻转后 **dot 仍 ok**）——判据直接打在解耦点上；`grep` 全仓仅 `auth-chip.mjs` 读 `data-status-dot`，故追加复跑 `test:l0` **248/0** 与 `test:density` **242/0** 确认无隐藏耦合 | — |
| R2-8 | **I-05** `blockedRecovery` 对象键对齐 + 编译期穷尽 | FR-ALLN-015 / ADR-V5-009 | ✅ | 位置耦合魔法数组 `['site','','','hardFloor','refInvalid'][BLOCKED_TERMINALS.indexOf(b)]` 已删除，改为 `definition.ts#BLOCKED_RECOVERY_TRIGGER`（`Object.freeze({...} as const satisfies Readonly<Record<BlockedTerminal, string \| null>>)`，声明点即字面量所在，保 BT-1 单源扫描绿）；`providers.ts` 只做 `BLOCKED_RECOVERY_TRIGGER[blocked as BlockedTerminal]`。**独立证伪**：删键 ⇒ **TS1360**（+ TS7053/7006 下游），还原 ⇒ `tsc 0`（非恒真）；语义等价（未知 terminal 仍返回 `undefined` ⇒ 空 chips） | — |
| R2-9 | **I-03** S2 十环节逐环节读数 | FR-ALLN-011 / 016 | ✅ | `no-dead-end.mjs` 由「`S2_CHAIN.length === 10` + `form2 > 0` 冒充主验收」升级为**逐环节驱动 + 逐环节读数 + 逐环节断言**（①绑定…⑩拾取 next，含 10/10 齐备断言），实跑 **39/0**（29 → 39）；⑩ 读数**如实**写「可行动 `next` ∧ opId 已注册」（不冒充字面 `op.pick`，承接 N-09）；`N = 0` 口径（源文本无 `sleep`/定时器/`new Promise`）仍在门禁内自判并通过；`refresh()` 测试缝改为可 `await`（`return refreshState()`） | — |
| R2-10 | **I-04** v5-2 移交 N-04~N-09 处置登记 | 末叶收口账连续 | ✅ | 六项**逐项有处置、0 悬空**：`build.md §9.5`（含 owner 与「显式非本叶范围」）+ `tasks.md §6.1` + 叶 `state.json#v52HandoverFindings` + `docs/v4-supersession-ledger.json#reviewFixFindingsV53`（`V53R1-N-04…N-09` 六条，各带 `severity` / `disposition` / `anchor{file,contains}`）。N-06/N-07 → 安全小项 backlog；N-08「本叶统一登记」并复核对其零 diff，**不伪称闭环**；N-09 口径如实沿用 | — |

### 2.3 修复轮 diff 全量扫描（`b0a679e..19c3beb` 新引入风险）

| # | 审查对象 | 审查基准 | 评估 | 发现 | 严重程度 |
|---|---------|---------|:--:|------|:--:|
| R2-11 | 源码面 13 处改动的新风险 | §5.1 代码质量 / 架构一致 | ✅ | 逐处走查：①`project-tree.ts`（去值改指针，无遗留分支）；②`tree-model.ts`（`BadgeKind` **只追加** `'auth-pointer'`，旧 kind 保留 ⇒ 无类型破坏）；③`tree-view.ts`（`sublabel` 单源常量）；④`tree-drawer.ts`（+属性 +运行期节点，`ensureShell` 幂等）；⑤`definition.ts`（新增映射，`,` 结尾无残留）；⑥`providers.ts`（删魔法数组，import 同步）；⑦`view-model.ts`（`statusDot`/`policyTone` 类型位补注释）；⑧`l0/shell.ts`（写入点切换）；⑨`sidepanel.ts`（`refresh()` 返回 promise）。**未见硬编码 / 未见冗余 / 未见职责膨胀**；`typecheck` 0；无测试被删除（§2.1 R2-4/R2-5 为**等价重锚**，旧文本逐字留档） | — |
| R2-12 | `refresh()` 返回类型变更的调用面 | §5.1 错误处理 / 回归 | ✅ | 全仓调用者清点：产品内无调用者（仅测试缝）；门禁侧两类用法 —— 旧式 `window.__v3.testing.refresh(); true`（返回值被丢弃，`void` → `Promise` 不变式）与新式 `await window.__v3.testing.refresh()`（`no-dead-end.mjs`）。`void refreshState()` → `return refreshState()` 对「未处理 rejection」的暴露面**与改前相同**（`void` 同样不挂 handler）。低风险 | — |
| R2-13 | 体积五要素 / 台账 / 门禁受审集合的等价重锚 | FR-ALLN-120 / 130~134 | ✅ | 六文件同源重登记（`size-baseline.ts` + `size-budget` / `size-growth-evidence` / `size-ruling-vol3` 三闸门 + `docs/v4-density-baseline.json#volume` + 台账）：546,370 → **547,558 B**（`v53FixRows` 7 行 Σ +1,188 + glue 0，与实测 metafile 对账）；`ceiling = floor(547,558 × 1.05) = 574,935`、档位 563,200 / 硬墙 `PENDING_ABSOLUTE_CAP.absoluteCeilingBytes 619,520` / 容差 5% **三不动**；N-05 组数 **21 → 22**（只增）；`insight-archive` 哈希 pin 显式重 pin；`gate-integrity` 受审集合含三新门禁（`CHROMIUM_GATES === 9` 不动）。三闸门实跑绿（`size-ruling-vol3` 12/0 独立复跑） | — |
| R2-14 | 台账/文档面与红线语义冻结 | §5.3 架构一致性 | ✅ | `modifiedRanges[]` 新增 5 条 `V53R1-MR-*`（insight `#I-20a` / insight-archive pin / insight-projection ×2 / volume），旧值逐字保留；`ADR-V5-006 §2`、叶 `spec.md`、`TREE.md`、`build.md §9`、`tasks.md §6`、`state.json` 同步且**未改判据**（`supported` 走白名单式登记，非放宽）；红线面（§1.3）零 diff。**未见「静默扩口径」或「声明强于产物」** | — |

### 2.4 R1 已判 ✅ 的 33 项复核

修复轮 diff **未触碰** R1 判定所依据的承载面（`statusbar.ts` / `l0/risk-rail.ts` / `index.html#auth-state` / `law8-plaintext.mjs` / `cards/error.ts` / `stream-model.ts` / `l2/audit.ts` / `audit-sink.ts` / `service-worker.ts` / `0b0`-态判据等均不在 `b0a679e..19c3beb` 变更集内，或仅受 §2.3 等价影响）；受 I-02 影响的 `l0/shell.ts` 已用 `test:l0` 248/0 + `test:density` 242/0 追加覆盖。33 项维持 ✅。

## 3. 审查维度汇总（R2）

| 审查维度 | 审查项数 | 通过 | 警告 | 失败 | 通过率 |
|---------|:--:|:--:|:--:|:--:|:--:|
| 代码质量（R2-1/2/3、R2-8、R2-11、R2-12） | 6 | 6 | 0 | 0 | 100% |
| 规范符合性（R2-4/5、R2-6、R2-7、R2-9、R2-10） | 6 → 计 6 | 6 | 0 | 0 | 100% |
| 架构一致性（R2-13、R2-14） | 2 | 2 | 0 | 0 | 100% |
| 测试质量（R2-4、R2-5、R2-9 + F1~F4 证伪） | 3 | 3 | 0 | 0 | 100% |

> **质量门槛核对**：BLOCK-01 对应 FR-ALLN-086⑤ 有 R2-1~R2-5；四维度各 ≥ 1 条；无法审查项 = 无（人工面项（真机断流 / 双主题 / 读屏）按 SDDU 分工属 validate / 人工面清单，不属静态审查，未计为「不适用」减项）。

## 4. 阻塞问题

**0 个。** R1 的唯一阻塞（BLOCK-01）已闭环并经独立证伪（§1.2 F1/F2、§2.1）。

## 5. 改进建议

**0 个。** R1 的 5 项改进（I-01~I-05）全部处置完毕（§2.2）。本轮残余 5 项均判为**观察项**（不阻塞、不计入改进数），列于 §6。

## 6. 观察项（不阻塞，不计入改进数）

| # | 位置 | 观察 | 建议 | 状态 |
|---|------|------|------|:--:|
| O-1（R1 遗留） | `docs/v4-supersession-ledger.json#counts` | `counts` 仍滞后于实测（`insight` 116 vs 118 · `journey` 167 vs 171 · `nodeTestRuntime` 947 vs 1181 · `l0` 216 vs 248 · `density` 171 vs 242）；`floor` 为下界故门禁未红 | 由后续波次/收口统一把 `currentRuntime` 前移（`supersession` 门禁已用 `source.log` 同源判据防漂移，仅登记值滞后） | 未处理 |
| O-2（R1 遗留） | `src/ui/sidepanel/l0/risk-rail.ts:52-56` | `RISK_COPY.unauthorized`（含「未授权」文案）与 `RISK_CLASSES` 5 值保留为**派生源**但零渲染（`RAIL_RISK_CLASSES` 已排除）⇒ 非双写；仅缺「只可派生、禁止渲染」的注释护栏 | 补一行注释（零字节风险外的 0 行为变更） | 未处理 |
| O-3（R1 遗留） | `docs/v4-density-baseline.json#riskIncrementRegistry.reanchorV5.previousExpectation.reason` | 叙述「R1 登记格 = 6/6/17/203」与 `reanchorV45` 实际前值（7/7/18/208）不一致（历史叙述笔误；不影响判据） | 后续轮订正叙述（历史值只追加不改写原则下另起订正条目） | 未处理 |
| O-R2-1（新，低） | `test/ui/insight.mjs:1735` | `noteVisible` = 存在 ∧ `data-auth-pointer` ∧ 文本匹配，**未**判 `hidden` / 计算可见性；「运行期可见」的成立依赖驱动前置（`:1697-1701` 已打开抽屉）与源码读码（`ensureShell` 幂等）。判据**方向正确且已证伪**（F1 场景下该节点仍在 ⇒ 不能单独证明可见性） | 可加 1 行强化：`!note.hidden && note.getClientRects().length > 0` | 未处理（非阻塞） |
| O-R2-2（新，低） | `src/ui/sidepanel/index.html:1275` | `#tree-drawer` 内仍留**静态占位** `.tree-note`，其文本含与 `TREE_AUTH_POINTER_NOTE` **相同的一句话**（「授权状态见状态栏授权 chip（本台账不复制状态值）」）⇒ 同句两处字面量（占位词在 `replaceChildren()` 后必然失效，且无 `data-auth-pointer`，故非第二指针、非状态值） | 删除该静态占位（或改成极简占位）以免文案漂移 | 未处理（非阻塞） |

> 另注（非产物缺陷，仅记账口径）：`tasks.json` 中 `TASK-V5-167~176` 缺 `status` 字段（`tasks.md §5.2` 已逐条标 ✅ completed，故 §4 前置「任务完成」成立）；`tasks.json#meta.phase` 停在 `tasked`；父 `../state.json#childrens[v5-3].phase` 停在 `specified`（叶 `state.json` 为 `reviewed`）——均为机器可读登记滞后，建议由收口/编排侧统一前移。

## 7. spec ↔ 产物收敛（BLOCK-01 相关条款专核）

| FR / AC / ADR | spec 要求 | 代码 / 判据落点 | 收敛 |
|---|---|---|---|
| FR-ALLN-086② | 四词（授权态语义）工具栏区零出现 | `view-model.ts#toolbarDigest`（去 auth 段）+ `auth-chip.mjs` ②（裸词 ×3 + 短语 ×2 + **`[data-auth]` 语义位唯一**）+ 注入反证；口径见 `ADR-V5-006 §2` | ✅ |
| FR-ALLN-086⑤ | L2 树视图站点行**指向 chip / 不复制状态** | `project-tree.ts#AUTH_STATE_POINTER_BADGE`（`kind:'auth-pointer'`）→ `tree-view.ts#TREE_AUTH_POINTER_NOTE`（行 sublabel）→ `tree-drawer.ts`（`data-auth-pointer="#auth-state"` + 运行期指针说明节点）；`insight#I-20a1/#I-20a3` + 投影单测 + 哈希 pin | ✅ **（R1 阻塞项闭环）** |
| AC-ALLN-012 | L2 台账零授权态值 | 同上 + `insight-projection.test.ts`（两站点行零 `authorized/unauthorized` 徽标、各带指针、直方图不再计授权态） | ✅ |
| ADR-V5-006 §2①~⑤ | 唯一载体 + 零双写五条 | ①`#auth-state` ②四词 ③rail 排除 ④状态栏首行去 auth ⑤L2 指针（本轮闭环） | ✅ 5/5 |
| FR-ALLN-085 / 087 / 088 / 090 / 012 / 023 | R1 已判 | 承载面未受修复轮影响（§2.4） | ✅ |

## 8. 结论

**结论**: ✅ **通过**

| 指标 | 结果 |
|------|------|
| 审查通过率（R2 复审面） | **100%**（10 / 10） |
| 阻塞问题数 | **0** |
| 规范符合性偏差 | **0** 项（R1 的 1 阻塞 + 5 改进全部关闭） |
| 残余观察项 | 5（O-1~O-3 遗留 + O-R2-1 / O-R2-2 新，均非阻塞） |
| **可进入 validate** | **是** |

**理由**: R1 的唯一阻塞 **BLOCK-01（FR-ALLN-086⑤ / AC-ALLN-012 / ADR-V5-006 §2⑤）已彻底闭环**——三层载体（投影徽标 / 行文案 / DOM 指针）全部去除授权态值并改为指向唯一载体 `#auth-state` 的机器可读指针，且指针说明在 `replaceChildren()` 之后由 `ensureShell()` 重建而**运行期存活**；该结论**不依赖声明**：由读码（三处载体 + 幂等 shell）+ 门禁 `insight` 118/0 的 `#I-20a1`/`#I-20a3` + 本轮**独立两段证伪**（回退徽标值 ⇒ `EXIT=1` 且读数精确复现阻塞形态；逐字节还原 ⇒ `EXIT=0` + 产物 547,558 B + 红线 sha 不变）三方互证。I-01~I-05 全部处置：口径回写**权威条文**（ADR-V5-006 §2 + 叶 spec）并配语义位判据与注入反证；dot 与授权态解耦并有「同 origin 翻转」直证；S2 十环节逐环节读数（39/0）；v5-2 移交 N-04~N-09 六项零悬空登记；`blockedRecovery` 对象键 + `satisfies` 编译期穷尽（独立复现 TS1360）。修复轮全量 diff（26 文件）**未引入新风险**：`BadgeKind` 只追加、无断言删除（均为等价重锚且旧文本逐字留档）、体积五要素六文件同源（+1,188 / glues 0）、档位与硬墙三不动、三新门禁仍在受审集合。抽跑 6 项门禁（另加 `test:l0` / `test:density` 覆盖 I-02 触及面）全绿，`npm test` 1181/0，`typecheck` 0，构建可复现。残余 5 项观察均为台账/文案/断言强度层面的低危项，不阻塞验证。故判定 ✅ 通过，可直接进入 `@sddu-validate`。

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建（R1 静态审查，对象 HEAD `f8e50e8` / 基线 `9b262ae`）：C1~C39 逐项；独立复跑 13 项门禁；红线/保护段逐字节复验；结论 ❌ 不通过（BLOCK-01 = FR-ALLN-086⑤ 未落地；5 改进 + 3 观察） | 2026-09-22 | SDDU Review Agent |
| v2.0 | **R2 复审**（对象 HEAD `19c3beb` / 对照基线 `b0a679e`）：① **BLOCK-01 闭环判定 = ✅ 彻底闭环**（三载体零授权态值 + 指针 + 运行期重建；独立两段证伪 F1/F2）；② I-01/I-02/I-05 抽检 + I-03/I-04 证据面复核全 ✅；③ 修复轮 diff 26 文件全量扫描无新风险（`refresh()` 调用面 / `BadgeKind` 追加 / 体积五要素 / 等价重锚留档）；④ 门禁抽跑 6 项 + 追加 2 项（`l0` 248/0 · `density` 242/0）+ `typecheck` 0 + 构建可复现 547,558 B；⑤ 红线快验逐字节不变；⑥ 结论 **✅ 通过**（R1 的 1 阻塞 + 5 改进全部关闭；残余 5 项观察，非阻塞）→ 可进 validate | 2026-09-22 | SDDU Review Agent |
