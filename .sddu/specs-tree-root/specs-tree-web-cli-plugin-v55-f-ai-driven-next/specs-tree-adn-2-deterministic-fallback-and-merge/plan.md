# 技术计划：specs-tree-adn-2-deterministic-fallback-and-merge（ADN-2 兜底 + 合并 + 护栏 + 首开边界 + 门禁重锚）

> **文档定位**: SDDU 技术方案（**叶级切片**）— 父 `../plan.md`（v1.0）在本叶的适用范围与落地口径；作为本叶 tasks 阶段的输入
> **前置依赖**: 父 `../spec.md` v1.0 + 父 `../plan.md` v1.0（含 `ADR-ADN-004`~`010`）+ 本叶 `spec.md` v1.0（承载父 FR ≈34 条切片）+ **叶1 `../specs-tree-adn-1-ai-next-produce-and-verify/plan.md` v1.0 及其 build 产物（强依赖）**
> **创建人**: SDDU Plan Agent
> **创建时间**: 2026-09-26
> **版本**: v1.0
> **更新人**: SDDU Plan Agent
> **更新时间**: 2026-09-26
> **更新说明**: 初始创建（ADN-2 叶技术方案：确定性退居兜底 + 终端恒常驻 + 合并口径（同单卡位 / 前 N=3 / R6 扩展 / 替换双向）+ 护栏（六常量 / 提案不耗预算 / 关断两相）+ 首开保持确定性 + S0''' 四支线终态 + 保护段 keep + 升级 6 门禁重锚 + X-ADN 台账终态 + 体积终态重登记）

---

## 1. 前置检查

| 检查项 | 状态 | 证据 |
|--------|:--:|------|
| 本叶 `spec.md` 存在 | ✅ | `spec.md`（265 行，v1.0，2026-09-26） |
| 父 `spec.md` / `plan.md` 存在 | ✅ | `../spec.md`（933 行）/ `../plan.md`（v1.0） |
| **叶1 依赖** | ⏳（plan 阶段）| `dependsOn: ['specs-tree-adn-1-ai-next-produce-and-verify']`；叶1 build 产物（通道 / 校验链 / `admitCandidate` / `ai-next` provider / 注入槽 / 新门禁）为**强依赖**，本叶 plan 建立在其 plan 之上，实施须等叶1 收口 |
| 外部 API 文档缓存 | ✅ N/A | 零外部 API / 零新依赖 |
| 保护 pin（**只读复核**） | ✅ | journey `43484..59347` / `7b309258…`；binding `107780..115930` / `be9ad0e9…`；本叶**预期零改动**两文件 ⇒ keep 字节中立 |
| 写入范围 | ✅ | 仅本叶 SDDU 目录；未跑门禁 / 构建 / Chromium |

---

## 2. 架构分析（本叶）

**本叶的验收锚**：在叶1 已建通道与校验链之上，**保证「AI 化不回归（兜底 / 终端 / 首开）」+「多候选不溢出」+「门禁强度不降」**。

**落地结构（本叶切片，全部是**接线与重锚**，不新建通道）**：

```
src/ui/sidepanel/recommend.ts     ← R6 同因去重家系扩展覆盖 AI + 替换口径（AI 赢槽 ⇒ 无陈旧 ref-action chip）
src/ui/sidepanel/sidepanel.ts     ← 关断门（显示相）+ 兜底接线 + AI 缺席 ⇒ 确定性照旧
src/ui/sidepanel/next-registry/providers.ts ← ai-next provider 在场/缺席双向语义（叶1 已注册，本叶不改行）
test/**                            ← 升级 6 门禁等价重锚 + 新门禁终态 + S0''' 四支线终态
docs/v4-supersession-ledger.json   ← X-ADN-1~11 台账终态
docs/v4-density-baseline.json      ← 条件性（预期零改动）
```

**本叶不做的**：通道载体 / 5 道校验链 / `admitCandidate` / `ai-next` provider 的**建立**（叶1）；`pressCandidate` / `driveAnsweredTurn` / `turn-queue.ts` 语义改动；`tierOf` 档位定义改动；六常量阈值改动；多卡 / 破 3-chip / 第 5 规则位；首开 AI 化。

---

## 3. 方案对比（本叶两个关键形态点）

### 3.1 合并与替换

| 维度 | **方案 A：AI 赢槽 ⇒ 整占 `ref-action` 槽（推荐）** | 方案 B：AI 候选与规则候选**交错合并**（各取若干） |
|---|---|---|
| 描述 | `ai-next.when` 真 ⇒ `seen['ref-action']` 落 AI ⇒ 确定性 ref-action 不产 | 把 AI 候选与确定性候选按档位/优先级交错取前 3 |
| 优点 | 「替换陈旧候选」天然成立（FR-ADN-055）；判据双向、简单、可机核；`NEXTSTEP_PRIORITY` / 单卡 / 3-chip 全不动 | 「更丰富的候选面」 |
| 缺点 | 同槽内不混排 | **交错规则**须新定义（档位序 vs AI 序）⇒ 引入新的排序单源（第二阈值风险）；「陈旧候选」可能仍出现 ⇒ 与题眼冲突 |
| 风险 | 低 | R-ADN-907（中高） |

### 3.2 关断偏好作用面

| 维度 | **方案 A：一处偏好两相（显示 + 按下，推荐）** | 方案 B：新增第二开关只管显示 |
|---|---|---|
| 描述 | `web-cli:proactive=false` ⇒ 不注入 AI 候选 + 自动按下走既有 `guardAllowed` | 新增「是否显示 AI 建议」偏好 |
| 优点 | 零第二偏好键 / 零第二阈值；语义一致（关断 = 不打扰） | 更细粒度 |
| 缺点 | 粒度较粗（但符合「一处开关」立法） | 第二偏好键 ⇒ 与「一处偏好」立法冲突；预算口径分裂 |
| 风险 | 低 | R-ADN-007（中高） |

**推荐：3.1 = A / 3.2 = A**（理由见父 `ADR-ADN-004` §④⑤ / `ADR-ADN-006` §④）。

---

## 4. 本叶设计定案（父 ADR 的叶内落地）

| # | 落地项 | 定案 | 判据锚 |
|:-:|---|---|---|
| 1 | 确定性 = 兜底与安全闸 | 未配 / 未产出 / 全被拦 ⇒ 确定性产卡（含 floor） | `ADR-ADN-005` §① |
| 2 | free-input 终端恒常驻 | 终端恒最末；AI 候选**不进** floor；`safety` 仍不走 floor | `ADR-ADN-005` §②；FR-ADN-041/042 |
| 3 | 零死端 | 任何路径均有可达 next（含终端）；判据**可 FAIL** | `ADR-ADN-005`；`no-dead-end` |
| 4 | 在飞语义 | `pending` 硬门不动；AI 撞车 `blocked:busy` 不排队；四值逐字 | `ADR-ADN-005` §③ |
| 5 | 合并口径 | 同单卡位（`MAX_NEXTSTEP_CARDS_PER_ROUND=1` 不动）+ 前 N **=3** + 截断 + 列表内去重 | `ADR-ADN-004` §④ |
| 6 | 规则表 | `NEXTSTEP_PRIORITY` **恰 4** 不动（AI 骑 `ref-action` 位） | `ADR-ADN-004` §③；`recommendation-sources` |
| 7 | R6 同因去重扩展 | `refActionDigest` 家系紧致覆盖 AI 候选（**去重函数逐字复用**，非放宽） | `ADR-ADN-004` §⑤；FR-ADN-053 |
| 8 | 替换口径（双向可判） | AI 在场 ⇒ 无陈旧 ref-action chip；AI 缺席 ⇒ 陈旧 chip 照旧 | `ADR-ADN-004` §⑥；FR-ADN-055 |
| 9 | 渲染零 per-op 分支 | chip `data-op` 经 `ACT_TO_OP`/`OP_TO_ACT` 单源；一次查表 | `ADR-ADN-004` §⑦；`next-dispatch-diff0` |
| 10 | 护栏六常量同过 | 复用 `guard.ts` 单源；零第二阈值 | `ADR-ADN-006` §⑤；`proactivity-guard` |
| 11 | 提案不耗预算 | 产出候选不 `noteProactive`；仅自动成回合记账（双向断言） | `ADR-ADN-006` §③；N-ADN-026 |
| 12 | 关断两相 | 显示相（注入前 `proactivity.enabled()`）+ 按下相（既有 `guardAllowed`） | `ADR-ADN-006` §④；X-ADN-11 |
| 13 | 首开保持确定性 | `maybeRecommendOpenEntry` 逐字；首屏零 LLM 往返；让位 firstRun 零双卡 | `ADR-ADN-005` §⑤；PD-ADN-001 deferred |
| 14 | S0''' 四支线终态 | A/B/C/D 双面（Chromium 只加断言）；人工面 M1~M5 `⏳` | `ADR-ADN-007` §①④⑤ |
| 15 | 升级 6 门禁重锚 | `recommendation-sources` / `driver-timings` / `driver-quadruple` / `op-wiring` / R6 去重 / `NEXTSTEP_PRIORITY` 4 恰 4；`assertionsRemoved=0` | `ADR-ADN-009` §② |
| 16 | 保护段 keep | journey / binding **零改动** ⇒ 字节中立双绿 | `ADR-ADN-010` §③ |
| 17 | X-ADN 台账终态 | 已发生 4 / 未发生取代 6 / 等价重锚 1；老条目逐字保留 | `ADR-ADN-010` §① |
| 18 | 体积终态重登记 | 叶2 A 列 **+0.5~1.5 KB**；五要素 + 三值；B 列不计账 | `ADR-ADN-008` §② |

---

## 5. 文件影响分析（本叶）

| 操作 | 文件路径 | 说明 |
|:--:|---|---|
| MODIFY | `src/ui/sidepanel/recommend.ts` | R6 同因去重家系扩展覆盖 AI（预过滤）+ 替换口径（AI 赢槽自然成立；补双向判据所需可判事实） |
| MODIFY | `src/ui/sidepanel/sidepanel.ts` | 关断门（显示相）+ 兜底 / 替换接线 + 首开路径确认零 AI 注入 |
| MODIFY | `test/recommendation-sources.test.ts` | 规则表恰 4 / 单卡 / ④ 零新 LLM 保持 + 替换口径判据 |
| MODIFY | `test/proactivity-guard.test.ts` | 提案不耗预算双向 + 关断两相 |
| MODIFY | `test/op-wiring.test.ts` / `test/driver-timings.test.ts` / `test/driver-quadruple.test.ts` / `test/op-three-tier.test.ts` | 升级 6 的重锚终态对账（与叶1 协同；不重复改） |
| MODIFY | `test/supersession-ledger.test.ts` | X-ADN 台账终态一致性判据（老条目 / 保护段判据保留） |
| MODIFY | `test/ui/s0-self-driven.mjs` | S0''' 四支线终态（**只加断言**） |
| MODIFY | `test/ui/recommendation.mjs` | 替换口径 / ≤3 / 单卡 / 终端恒最末（**只加断言**） |
| MODIFY | `test/ui/law8-plaintext.mjs` | AI 候选与留痕的零明文面（**只加断言**） |
| MODIFY | `docs/v4-supersession-ledger.json` | X-ADN-1~11 台账**终态**（含 `no-supersession` 行） |
| MODIFY（条件性） | `docs/v4-density-baseline.json` | 仅当密度读数需等价重锚（预期零改动；S0''' 经测试缝注入 ⇒ 既有 31 格不动） |
| MODIFY | `test/size-baseline.ts` + `test/size-growth-evidence.test.ts` | 叶2 五要素 + 三值 + 逐模块行 |
| MODIFY | 本叶 `state.json` / `TREE.md` | 阶段推进 |

**零改动（本叶）**：`test/ui/journey.mjs` / `test/ui/binding.mjs`（保护段 keep）；C 列冻结面；`packages/web-cli-base/**`。

---

## 6. 风险评估（本叶）

| # | 风险 | 等级 | 缓解 |
|---|---|:--:|---|
| R-ADN-003 | 确定性兜底失守 ⇒ R8 零死端回归 | 高 | 三情形兜底断言 + 终端恒常驻 + 删兜底必红 |
| R-ADN-004 | 门禁静默降强度（升级 6 / 保护段） | 高 | 先出重锚清单；`assertionsRemoved=0`；保护段 keep / 八步 |
| R-ADN-005 | AI 多候选溢出（破单卡 / 3-chip） | 中高 | 前 N=3 + 截断 + 同单卡位 |
| R-ADN-907 | 替换口径写成「叠加」 | 中高 | 双向判据（AI 在场 ⇒ 无陈旧 chip；缺席 ⇒ 陈旧 chip 在） |
| R-ADN-906 | 提案被记账成主动回合 | 中高 | 双向记账断言 |
| R-ADN-010 | 首屏依赖 LLM 往返 | 中 | 首开确定性 + 零 LLM 依赖断言 |
| R-ADN-908 | B 列优先被读成「无成本」 | 中高 | 逐模块归因 + 列别如实标注 |
| R-ADN-909 | S0''' 写成「脚本绿」而非「链路可判」 | 中高 | 真源切片 + 双向反证 |
| R-ADN-910 | 门禁处置「看起来齐」但漏项 | 中高 | 按断言语义逐条 + 三态齐 + 间接面对账 |
| R-ADN-013 | `KL-N-10` flake 被误读为回归 | 低—中 | 隔离复跑 ≥2 + 如实记录不阻塞 |
| R-ADN-912（新增） | 事件作用域单槽被做成常驻 ⇒ 陈旧 AI chip 以新形态回归「两张皮」 | 中高 | 单槽消费即清 + 反证「常驻 ⇒ 后续无关触发复现 ⇒ 必红」 |

---

## 7. 交付物与执行序（供 tasks 参考，**非需求**）

**交付物（8 项）**：① 兜底 / 终端 / floor 接线（三情形）；② 合并口径（同单卡位 / 前 N=3 / 截断 / 列表内去重 / 替换双向）；③ R6 同因去重扩展覆盖 AI；④ 护栏接线（六常量 / 提案不耗预算 / 关断两相 / 零第二阈值）；⑤ 首开边界落地（保持确定性）；⑥ S0''' 四支线终态（Chromium 只加断言）+ 人工面 `⏳`；⑦ 升级 6 门禁等价重锚 + X-ADN 台账终态 + 保护段 keep；⑧ 叶2 体积终态重登记（A/B 分列）。

**执行序（3 波）**：
1. **W1 兜底与合并**：三情形兜底接线 + 终端恒常驻确认 + floor 语义 + 前 N=3 / 截断 / 列表内去重 + 替换双向 + R6 家系扩展 + 反证。
2. **W2 护栏与首开**：六常量同过确认 + 提案不耗预算双向 + 关断两相 + 在飞仲裁保持 + 首开确定性/零 LLM 依赖/让位 firstRun。
3. **W3 验收与治理**：S0''' 四支线终态（Chromium 只加断言）+ 升级 6 重锚终态 + X-ADN 台账终态（未发生者 `no-supersession`）+ 保护段 keep 证明 + 体积叶2 重登记 + 收口对账。

**Gate 硬要求**：门禁严格**串行**；`CHROMIUM_GATES === 9` 不动；新 node 门禁已由叶1 纳入受审下界（本叶只做终态对账）；反证必实跑 + 逐字节还原；`KL-N-10` flake 隔离复跑 ≥2。

---

## 8. 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建（ADN-2 叶 plan：§1 前置检查（叶1 强依赖）· §2 本叶架构（接线与重锚，不建通道）· §3 两形态点对比（合并 / 关断，均推荐 A）· §4 18 项设计定案 · §5 文件影响 13 项 · §6 风险 11 条 · §7 交付物 8 项 + 3 波执行序） | 2026-09-26 | SDDU Plan Agent |
