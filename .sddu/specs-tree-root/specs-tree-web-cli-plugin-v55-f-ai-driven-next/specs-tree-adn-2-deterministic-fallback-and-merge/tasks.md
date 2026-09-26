# 任务分解：specs-tree-adn-2-deterministic-fallback-and-merge（ADN-2 确定性退居兜底 + 合并口径 + 首开边界 + 体积 / 门禁重锚）

> **文档定位**: SDDU 任务清单（**叶级切片**）— 父 `../tasks.md`（v1.0 总览）在本叶的落地；作为 build 阶段的输入。**本叶 = 末叶 / 回归与判据叶**，在叶1 已建通道与校验链之上，保证「AI 化不回归 + 多候选不溢出 + 门禁强度不降」
> **前置依赖**: 本叶 `plan.md` v1.0 + 本叶 `spec.md` v1.0 + 父 `../plan.md` v1.0（含 `ADR-ADN-004~010`）+ 父 `../spec.md` v1.0 + **叶1 `../specs-tree-adn-1-ai-next-produce-and-verify/plan.md` v1.0 及其 build 产物（强依赖）**
> **创建人**: SDDU Tasks Agent
> **创建时间**: 2026-09-26
> **版本**: v1.0
> **更新人**: SDDU Tasks Agent
> **更新时间**: 2026-09-26
> **更新说明**: 初始创建（ADN-2 叶任务：**23 任务 / 3 波**（`TASK-ADN-201~223`；S×3 / M×18 / L×2）+ 1 个 spikeGate（`SG-ADN-03`）+ 升级 6 门禁终态重锚 + S0''' 四支线终态 + X-ADN-1~11 台账终态 + 保护段 keep + 体积叶2 重登记 + 两叶 Σ）

---

## 0. 结构登记（**末叶 / 回归与判据叶**）

| 项 | 内容 |
|---|---|
| 叶定位 | **末叶 / 回归与判据叶**（`deliveryOrder: 2` / `dependsOn: ['specs-tree-adn-1-ai-next-produce-and-verify']` / P0）；**强依赖叶1 全绿（validated）** |
| 与叶1 关系 | 叶1 `validated` 前**不得启动**（`BLK-ADN-9`；`R-ADN-001` / `N-ADN-021`） |
| 本叶**不做** | 通道载体 / 候选结构 / 5 道校验链 / `admitCandidate` / `ai-next` provider 的**建立**（叶1）/ `pressCandidate` / `driveAnsweredTurn` / `turn-queue.ts` 语义改动 / `tierOf` 档位定义改动 / 六常量阈值改动 / 多卡 / 破 3-chip / 第 5 规则位 / 首开 AI 化（PD-ADN-001 deferred） |
| 本叶**不变** | `KIND_SET` 40 / 12 kind / 零宿主 / `ACT_TO_OP` 恰 6 / `NEXTSTEP_PRIORITY` 恰 4 / `DRIVER_TIMINGS` 恰 5 / `requestTurn(` 恰 1 / 单卡 / 3-chip / `ARBITRATION_RESULTS` 四值 |
| 模板偏差 | 模板 §5.4 / §8 建议 5~15 任务 ⇒ 本叶 **23**（与 F-35 叶2 25 同量级，显式登记，理由见 §3） |
| 编号空间 | `TASK-ADN-201~223`；与 `TASK-ADN-1xx`（叶1）连续不交叠 |

---

## 1. 依赖拓扑总览（3 波）

```
W04 ─── 兜底与合并（可并行区：202 ∥ 203）
  TASK-ADN-201 [M] spike  SG-ADN-03（先验闸门，最前）
  TASK-ADN-202 [M] impl   三情形兜底接线（未配 / 未产出 / 全被拦）
  TASK-ADN-203 [M] impl   free-input 终端恒常驻 + floor 语义（AI 不进 floor；safety 不走 floor）
  TASK-ADN-204 [M] impl   合并口径（同单卡位 + 前 N=3 + 截断 + 列表内去重 + 不交错）
  TASK-ADN-205 [M] impl   替换口径（AI 赢槽 ⇒ 无陈旧 chip）+ 渲染零 per-op 分支
  TASK-ADN-206 [M] impl   R6 同因去重扩展覆盖 AI（refActionDigest 家系逐字复用）
  TASK-ADN-207 [M] gate   recommendation-sources 替换口径 / 规则表恰 4 / 单卡 / ④ 保持

W05 ─── 护栏与首开（依赖 W04；可并行区：208 ∥ 210；214 ∥ 215）
  TASK-ADN-208 [M] impl   关断门（显示相 proactivity.enabled() 注入前检查）
  TASK-ADN-209 [M] gate   proactivity-guard 加严（提案不耗预算双向 + 关断两相）
  TASK-ADN-210 [S] impl   在飞语义保持（pending + blocked:busy + ARBITRATION_RESULTS 四值）
  TASK-ADN-211 [M] impl   首开保持确定性（maybeRecommendOpenEntry 逐字 + 零 LLM 往返 + 让位 firstRun）
  TASK-ADN-212 [M] gate   兜底反证（删兜底 / 删终端 ⇒ 必红）+ 逐字节还原
  TASK-ADN-213 [M] gate   升级 6 重锚终态对账（三态齐 / assertionsRemoved=0）
  TASK-ADN-214 [S] impl   六常量同过 + 零第二阈值（源码扫描）
  TASK-ADN-215 [M] gate   窄视口 / 密度（EC-ADN-015；7/15·9/20·17/35 逐字）
  TASK-ADN-216 [S] gate   turn-arbitration + free-input-next 保留（下界只增）

W06 ─── 验收与治理（收口轮·终局；可并行区：219 ∥ 221）
  TASK-ADN-217 [L] gate   S0''' 四支线终态 node 面
  TASK-ADN-218 [L] gate   S0''' Chromium 面 + recommendation.mjs + law8-plaintext.mjs（只加断言）
  TASK-ADN-219 [M] doc    X-ADN-1~11 台账终态（已发生 4 / 未发生 6 / 等价重锚 1）
  TASK-ADN-220 [M] gate   supersession-ledger 一致性判据 + 保护段 keep（journey / binding 字节中立）
  TASK-ADN-221 [M] doc    体积叶2 重登记 + 两叶 Σ + EC-ADN-016 逐分支
  TASK-ADN-222 [M] gate   门禁守恒终态对账（新增 1 + 升级 6 + 间接面三态齐）
  TASK-ADN-223 [M] doc    人工面 M1~M5 ⏳ + 本叶收口对账 + e2e
```

**关键路径**：`201 → 202 → 203 → 204 → 205 → 206 → 207 → 208 → 209 → 211 → 212 → 213 → 217 → 218 → 220 → 221 → 222 → 223`。

---

## 2. 任务列表

### TASK-ADN-201: SG-ADN-03 `ai-next` 骑 `ref-action` 位 prepend 替换 + 前 N=3 合并不破单卡/3chip（先验闸门）

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | 无（叶1 收口后） |
| **执行波次** | 1（W04） |
| **类型** | spike |
| **对应 FR** | FR-ADN-050 / 051 / 052 / 055 |
| **对应 AC** | AC-ADN-007 |
| **对应 ADR** | ADR-ADN-004 |

**描述**: 在叶1 已注册 provider 的真实源码上验证「`ai-next` 骑 `ref-action` 位 + `prepend` 同规则优先 ⇒ 替换陈旧候选」与「前 N=3 截断 + 同单卡位」，且不破单卡 / 3-chip / `NEXTSTEP_PRIORITY` 恰 4。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| SPIKE | `packages/web-cli-plugin/test/_spike/sg-adn-03-probe.mjs`（探毕删除） |

**验收标准**:
- [ ] `resolveOrder = (priority asc, prepend desc, seq asc)` ⇒ `ai-next`（priority 2, prepend）排在确定性 `ref-action`（priority 2, 无 prepend）**之前**（同规则内 AI 优先）
- [ ] AI `when` 为假 ⇒ `seen` 不落 ⇒ 确定性 `ref-action` **照旧接管**（兜底可达）
- [ ] 前 N=**3** 截断（不溢出、不新增卡）；不越 `MAX_CHIPS_PER_CARD=3`；`MAX_NEXTSTEP_CARDS_PER_ROUND=1` 不动；`NEXTSTEP_PRIORITY` **恰 4**
- [ ] 上层规则仍优先（`risk-recovery` 0 / `onboarding` 1 命中时 AI 不显示）
- [ ] 结论 ∈ {可行 / 不可行}；探针产物不进入提交

**验证命令**:
```bash
node packages/web-cli-plugin/test/_spike/sg-adn-03-probe.mjs   # 探毕删除
```

**被闸门任务**: `202` / `204` / `205` / `206` / `207`
**停止规则**: 不可行 ⇒ 暂停上报（禁新增第 5 规则位 / 禁多卡 / 禁破 3-chip / 禁交错合并）

---

### TASK-ADN-202: 三情形兜底接线（未配 / 未产出 / 全被拦）

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-ADN-201 |
| **执行波次** | 1（W04） |
| **类型** | implementation |
| **对应 FR** | FR-ADN-040 / 043 / 046 |
| **对应 AC** | AC-ADN-006 / 014 |
| **对应 ADR** | ADR-ADN-005 |

**描述**: 把确定性注册表落定为**兜底与安全闸**：三情形一律走确定性产卡。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/web-cli-plugin/src/ui/sidepanel/recommend.ts` |
| MODIFY | `packages/web-cli-plugin/src/ui/sidepanel/sidepanel.ts` |

**验收标准**:
- [ ] **未配 LLM** ⇒ 零 AI 候选产出（**零网络** / 零 provider 调用）+ 现状逐字
- [ ] **AI 未产出**（无块 / 解析失败 / 空数组）⇒ 零 `aiNext` ⇒ `ai-next.when === false` ⇒ 确定性产卡（含 floor）
- [ ] **AI 候选全部被拦**（`accepted.length === 0`）⇒ 同上；`blocked` 只产生可读留痕，不改候选面
- [ ] `pending` 硬门逐字不动（在飞不产卡）

**验证命令**:
```bash
npm --prefix packages/web-cli-plugin test
```

**门禁**: `r8-open-next-entry` / `no-dead-end`

---

### TASK-ADN-203: `free-input` 终端恒常驻 + floor 语义（AI 不进 floor；`safety` 不走 floor）

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-ADN-201 / TASK-ADN-202 |
| **执行波次** | 1（W04） |
| **类型** | implementation |
| **对应 FR** | FR-ADN-041 / 042 / 044 / 045 |
| **对应 AC** | AC-ADN-006 |
| **对应 ADR** | ADR-ADN-005 |

**描述**: 保持 R8 保底：终端恒常驻、恒最末；floor 仍铸「仅含终端」最小卡；AI 候选不进 floor。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/web-cli-plugin/src/ui/sidepanel/recommend.ts` |

**验收标准**:
- [ ] 终端恒由**唯一** `free-input` provider（`when` 恒真）决定，由 `recommendNextStep` 单点注入到选中卡末端并**恒最末**（非 `.next-chip`、不进 `MAX_CHIPS_PER_CARD`）
- [ ] AI 候选**不进** floor：`suppression === 'empty'` ∧ 终端在场 ⇒ 仍铸「仅含终端」最小卡
- [ ] `safety` 仍**不走** floor（fail-closed）
- [ ] 反证（判据必须可 FAIL）：删终端 / 删 floor ⇒ `r8-open-next-entry` / `free-input-next` / `no-dead-end` **必红**

**验证命令**:
```bash
npm --prefix packages/web-cli-plugin run test:dead-end
npm --prefix packages/web-cli-plugin test
```

**门禁**: `no-dead-end` / `free-input-next`

---

### TASK-ADN-204: 合并口径接线（同单卡位 + 前 N=3 + 截断 + 列表内去重 + 不交错）

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-ADN-201 / TASK-ADN-202 / TASK-ADN-203 |
| **执行波次** | 1（W04） |
| **类型** | implementation |
| **对应 FR** | FR-ADN-050 / 051 / 054 |
| **对应 AC** | AC-ADN-007 |
| **对应 ADR** | ADR-ADN-004 |

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/web-cli-plugin/src/ui/sidepanel/recommend.ts` |

**验收标准**:
- [ ] 同台竞争**同一单卡位**（`MAX_NEXTSTEP_CARDS_PER_ROUND = 1` **不动**；`X-ADN-3` 未发生）
- [ ] **PD-ADN-007 裁决：N = 3**；排序 = AI 数组顺序；> 3 条 ⇒ **截断**（不溢出、不新增卡）
- [ ] 槽内**不与规则候选交错**（AI 赢 ⇒ 整个 `ref-action` 槽归 AI）
- [ ] 列表内按 `opId#label` 摘要去重（同列表内重复项不占第二个槽）
- [ ] 单卡 / 3-chip / 密度阈值 7/15 · 9/20 · 17/35 **逐字不动**

**验证命令**:
```bash
npm --prefix packages/web-cli-plugin run test:density
npm --prefix packages/web-cli-plugin test
```

**门禁**: `density-thresholds`

---

### TASK-ADN-205: 替换口径（AI 赢槽 ⇒ 无陈旧 chip）+ 渲染零 per-op 分支

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-ADN-201 / TASK-ADN-204 |
| **执行波次** | 1（W04） |
| **类型** | implementation |
| **对应 FR** | FR-ADN-055 / 056 |
| **对应 AC** | AC-ADN-007 |
| **对应 ADR** | ADR-ADN-004 |

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/web-cli-plugin/src/ui/sidepanel/recommend.ts` |

**验收标准**:
- [ ] **双向可判**：AI 候选在场（且赢得槽）⇒ 陈旧的确定性 `ref-action` chip（如「用引用 1 做原地翻译」）**不出现**；AI 候选缺席 / 全被拦 / 未产出 ⇒ 确定性 `ref-action` 候选**照旧**
- [ ] 反证双向（在场仍出现 / 缺席却消失 ⇒ 各必红）
- [ ] chip `data-op` 由 `ACT_TO_OP` / `OP_TO_ACT` 单源派生；`dispatchChipAction` 仍**一次查表**（零 per-op 分支）；`next-dispatch-diff0` 判据保留

**验证命令**:
```bash
npm --prefix packages/web-cli-plugin test
```

**门禁**: `next-dispatch-diff0` / `recommendation-sources`

---

### TASK-ADN-206: R6 同因去重扩展覆盖 AI（`refActionDigest` 家系逐字复用）

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-ADN-204 |
| **执行波次** | 1（W04） |
| **类型** | implementation |
| **对应 FR** | FR-ADN-053 |
| **对应 AC** | AC-ADN-007 |
| **对应 ADR** | ADR-ADN-004 |

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/web-cli-plugin/src/ui/sidepanel/recommend.ts` |

**验收标准**:
- [ ] 在 `candidateRules` 内、构造 ctx **之前**，用**同一** `refActionDigest` / `intentDigest` 家系预过滤 AI 候选：`key = refActionDigest(candidateRefId ?? \`ref_${latestRefNum}\`, candidate.label)`；`key ∈ input.completedActions` ⇒ 压掉该条
- [ ] **不动**既有 post-filter 对确定性 `ref-action` 的行为
- [ ] 判据**等价重锚**（非放宽）：去重家系 / 摘要函数**逐字复用**，仅扩大适用对象
- [ ] 反证：「去掉 AI 去重 ⇒ 同 digest 复推 ⇒ 必红」

**验证命令**:
```bash
npm --prefix packages/web-cli-plugin test
```

**门禁**: `r6-ty-experience-fix` / `recommendation-sources`

---

### TASK-ADN-207: `recommendation-sources` 替换口径 / 规则表恰 4 / 单卡 / ④ 保持

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-ADN-205 / TASK-ADN-206 |
| **执行波次** | 1（W04） |
| **类型** | gate |
| **对应 FR** | FR-ADN-052 / 055 / 098 |
| **对应 AC** | AC-ADN-007 / 024 |
| **对应 ADR** | ADR-ADN-004 / ADR-ADN-009 |

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/web-cli-plugin/test/recommendation-sources.test.ts` |

**验收标准**:
- [ ] `NEXTSTEP_PRIORITY` **恰 4**；单卡；真值 7 / 模块白名单恒 5；④ 零新 LLM 保持
- [ ] **新增**替换口径双向判据（AI 在场 ⇒ 无陈旧 `ref-action` chip；缺席 ⇒ 陈旧 chip 照旧）
- [ ] 断言零删除；计数只增

**验证命令**:
```bash
npm --prefix packages/web-cli-plugin test
```

**门禁**: `recommendation-sources`

---

### TASK-ADN-208: 关断门（显示相 `proactivity.enabled()` 注入前检查）

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-ADN-202 |
| **执行波次** | 2（W05） |
| **类型** | implementation |
| **对应 FR** | FR-ADN-062 |
| **对应 AC** | AC-ADN-008 |
| **对应 ADR** | ADR-ADN-006 |

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/web-cli-plugin/src/ui/sidepanel/sidepanel.ts` |

**验收标准**:
- [ ] `maybeRecommend` 注入 `session.aiNext` 前检查 `proactivity.enabled()`：`OFF` ⇒ **不注入** ⇒ AI 候选不显示
- [ ] 主题① 确定性仍工作、手输仍可用（关断 = 不打扰，非禁用）
- [ ] **一处偏好两相**：显示相（本任务）+ 按下相（既有 `guardAllowed` 缝；`verdict('ai', key)` OFF ⇒ `blocked:guard`）；**零第二偏好键 / 零第二阈值**
- [ ] 反证：「关断后仍显示 / 仍自动按下 ⇒ 必红」

**验证命令**:
```bash
npm --prefix packages/web-cli-plugin test
```

**门禁**: `proactivity-guard`

---

### TASK-ADN-209: `proactivity-guard` 加严（提案不耗预算双向 + 关断两相）

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-ADN-208 |
| **执行波次** | 2（W05） |
| **类型** | gate |
| **对应 FR** | FR-ADN-061 / 062 / 063 |
| **对应 AC** | AC-ADN-008 |
| **对应 ADR** | ADR-ADN-006 |

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/web-cli-plugin/test/proactivity-guard.test.ts` |

**验收标准**:
- [ ] **提案不耗预算**双向断言：产出 / 显示候选 ⇒ 预算不变（不 `noteProactive`）；自动成回合 ⇒ 预算 **−1**
- [ ] 关断两相：显示相 + 按下相（`OFF` ⇒ 不显示 + 不自动按下）
- [ ] 六常量单源复用（`guard.ts`）；零第二阈值
- [ ] 断言零删除；计数只增

**验证命令**:
```bash
npm --prefix packages/web-cli-plugin test
```

**门禁**: `proactivity-guard`

---

### TASK-ADN-210: 在飞语义保持（`pending` + `blocked:busy` + `ARBITRATION_RESULTS` 四值）

| 属性 | 值 |
|------|-----|
| **复杂度** | S |
| **前置依赖** | TASK-ADN-202 |
| **执行波次** | 2（W05） |
| **类型** | implementation |
| **对应 FR** | FR-ADN-046 / 065 |
| **对应 AC** | AC-ADN-014 |
| **对应 ADR** | ADR-ADN-005 |

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/web-cli-plugin/src/ui/sidepanel/sidepanel.ts` |

**验收标准**:
- [ ] `pending` 硬门逐字不动（在飞不产卡）
- [ ] AI 候选自动成回合撞车 ⇒ `pressCandidate` ⇒ `blocked:busy`（**不排队**）
- [ ] `ARBITRATION_RESULTS` 四值逐字不动；`turn-queue.ts` **diff = 0**
- [ ] `ai-deferred` 语义不变

**验证命令**:
```bash
npm --prefix packages/web-cli-plugin test
```

**门禁**: `turn-arbitration`

---

### TASK-ADN-211: 首开保持确定性（`maybeRecommendOpenEntry` 逐字 + 零 LLM 往返 + 让位 firstRun）

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-ADN-202 |
| **执行波次** | 2（W05） |
| **类型** | implementation |
| **对应 FR** | FR-ADN-070 / 071 / 072 / 073 |
| **对应 AC** | AC-ADN-009 |
| **对应 ADR** | ADR-ADN-005 |

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/web-cli-plugin/src/ui/sidepanel/sidepanel.ts` |

**验收标准**:
- [ ] `maybeRecommendOpenEntry` **逐字**复用既有 `'idle'`（不改首开入口）
- [ ] `authorized ∧ configured ∧ 探测未 ready` ⇒ 由 floor 铸「仅含终端」最小卡 ⇒ **首屏零 LLM 往返依赖**
- [ ] 首开求值时 `pendingAiNext` 恒为空（结构上不可能有 AI 初始 next）
- [ ] 让位 `firstRun` 语义保持（**零双卡**）
- [ ] AI 初始 next **明列后续轮**（`PD-ADN-001` deferred）

**验证命令**:
```bash
npm --prefix packages/web-cli-plugin test
```

**门禁**: `r8-open-next-entry`

---

### TASK-ADN-212: 兜底反证（删兜底 / 删终端 ⇒ 必红）+ 逐字节还原

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-ADN-203 / TASK-ADN-211 |
| **执行波次** | 2（W05） |
| **类型** | gate |
| **对应 FR** | FR-ADN-044 / 045 |
| **对应 AC** | AC-ADN-006 / 019 |
| **对应 ADR** | ADR-ADN-005 / ADR-ADN-007 |

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/web-cli-plugin/test/r8-open-next-entry.test.ts` |
| MODIFY | `packages/web-cli-plugin/test/free-input-next.test.ts` |

**验收标准**:
- [ ] `r8-open-next-entry` / `free-input-next` / `no-dead-end` 必绿且**判据可 FAIL**（非恒真）
- [ ] 注入「删 `free-input` provider 恒真 `when` / 删 floor」⇒ **必红**（`expectFailPattern` 声明）
- [ ] 反证：注入 ⇒ FAIL ⇒ **逐字节还原**（`sha256` 前后相同）⇒ PASS
- [ ] 三段控制 `ok` / `violated` / `n/a` 逐态可达（`n/a` 不冒充 `ok`）

**验证命令**:
```bash
npm --prefix packages/web-cli-plugin run test:dead-end
npm --prefix packages/web-cli-plugin test
```

**门禁**: `no-dead-end` / `free-input-next` / `r8-open-next-entry`

---

### TASK-ADN-213: 升级 6 重锚**终态对账**（三态齐 / `assertionsRemoved=0`）

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-ADN-207 / TASK-ADN-209 |
| **执行波次** | 2（W05） |
| **类型** | gate |
| **对应 FR** | FR-ADN-110 / 111 / 112 / 113 / 114 / 115 / 116 / 117 |
| **对应 AC** | AC-ADN-024 |
| **对应 ADR** | ADR-ADN-009 |

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/web-cli-plugin/test/recommendation-sources.test.ts` |
| MODIFY | `packages/web-cli-plugin/test/driver-timings.test.ts` |
| MODIFY | `packages/web-cli-plugin/test/driver-quadruple.test.ts` |
| MODIFY | `packages/web-cli-plugin/test/op-wiring.test.ts` |
| MODIFY | `packages/web-cli-plugin/test/op-three-tier.test.ts` |

**验收标准**:
- [ ] 升级 6 逐条终态：`recommendation-sources`（规则表恰 4 / 零新 LLM）/ `NEXTSTEP_PRIORITY` 恰 4 / `DRIVER_DECLS_SRC` **12↔12** / `op-wiring` 计数（`requestTurn(` **恰 1**）/ R6 同因去重扩展 / `driver-timings` **恰 5**
- [ ] **三态齐**（保留 / 等价重锚 / 显式取代）；`assertionsRemoved = 0`（断言零删除零降级、计数只增）
- [ ] 间接面对账面逐条确认无遗漏（`next-registry` / `next-obligation-table` / `gate-integrity` / `sw-op-mirror` / `next-dispatch-diff0`）
- [ ] 按**断言语义 + 语义增量**重锚（不照抄陈旧字面，`COR-ADN-3`）

**验证命令**:
```bash
npm --prefix packages/web-cli-plugin test
```

**门禁**: 升级 6 全体

---

### TASK-ADN-214: 六常量同过 + 零第二阈值（源码扫描）

| 属性 | 值 |
|------|-----|
| **复杂度** | S |
| **前置依赖** | TASK-ADN-209 |
| **执行波次** | 2（W05） |
| **类型** | implementation |
| **对应 FR** | FR-ADN-060 / 063 |
| **对应 AC** | AC-ADN-008 |
| **对应 ADR** | ADR-ADN-006 |

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/web-cli-plugin/src/ui/sidepanel/next-registry/guard.ts`（只读确认，预期零逻辑改动） |
| MODIFY | `packages/web-cli-plugin/test/proactivity-guard.test.ts` |

**验收标准**:
- [ ] AI 候选同样过**同一** `guard.ts` 六常量单源（频次 6/10min · 同因去重 · 静默 60 s · 冷却 10 s · 链深 2 · 回合预算 8）
- [ ] `AI_NEXT_LABEL_MAX=48` / `AI_NEXT_PARAM_MAX=128` 登记为「显示 / 结构上限」（**非**六常量语义阈值，不参与打扰控制判定）
- [ ] 源码扫描反证：「在 `background/ai-next.ts` 或 `providers.ts` 写入频次 / 预算常量 ⇒ 必红」
- [ ] `verdict('deterministic')` 恒放行（主题① 不受总开关控制）逐字保持

**验证命令**:
```bash
npm --prefix packages/web-cli-plugin test
```

**门禁**: `proactivity-guard`

---

### TASK-ADN-215: 窄视口 / 密度（EC-ADN-015；7/15 · 9/20 · 17/35 逐字）

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-ADN-204 |
| **执行波次** | 2（W05） |
| **类型** | gate |
| **对应 FR** | FR-ADN-054 |
| **对应 AC** | AC-ADN-007 |
| **对应 ADR** | ADR-ADN-009 |

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/web-cli-plugin/test/density-thresholds.test.ts` |

**验收标准**:
- [ ] AI 候选 chips 不越密度阈值（7/15 · 9/20 · 17/35 逐字不动）
- [ ] 窄视口（320px）⇒ 不水平溢出、不越阈值
- [ ] `test:density ≥242`（计数只增；`density.mjs` 为显示上界的最终仲裁）

**验证命令**:
```bash
npm --prefix packages/web-cli-plugin run test:density
```

**门禁**: `density-thresholds`

---

### TASK-ADN-216: `turn-arbitration` + `free-input-next` 保留（下界只增）

| 属性 | 值 |
|------|-----|
| **复杂度** | S |
| **前置依赖** | TASK-ADN-210 / TASK-ADN-212 |
| **执行波次** | 2（W05） |
| **类型** | gate |
| **对应 FR** | FR-ADN-041 / 046 |
| **对应 AC** | AC-ADN-006 / 014 |
| **对应 ADR** | ADR-ADN-009 |

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/web-cli-plugin/test/turn-arbitration.test.ts` |
| MODIFY | `packages/web-cli-plugin/test/free-input-next.test.ts` |

**验收标准**:
- [ ] `ARBITRATION_RESULTS` 四值逐字；AI 撞车 `blocked:busy` 继承（`turn-arbitration ≥7`）
- [ ] `free-input-next` 的 `ids.length >= 11`（→12）判据保留；终端恒常驻判据不降
- [ ] 断言零删除；计数只增

**验证命令**:
```bash
npm --prefix packages/web-cli-plugin test
```

**门禁**: `turn-arbitration` / `free-input-next`

---

### TASK-ADN-217: S0''' 四支线终态 node 面

| 属性 | 值 |
|------|-----|
| **复杂度** | L |
| **前置依赖** | TASK-ADN-202 / TASK-ADN-205 / TASK-ADN-212 / TASK-ADN-213 |
| **执行波次** | 3（W06） |
| **类型** | gate |
| **对应 FR** | FR-ADN-080~085 |
| **对应 AC** | AC-ADN-001 |
| **对应 ADR** | ADR-ADN-007 |

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/web-cli-plugin/test/s0-self-driven-chain.test.ts` |
| MODIFY | `packages/web-cli-plugin/test/ai-next-candidate.test.ts` |

**验收标准**:
- [ ] **支线 A 主线**：合法被采纳（替换陈旧候选 + ≤3 + 单卡 + 终端恒最末）
- [ ] **支线 B 被拦**：非法逐类 `blocked=<code>` + 可读留痕 + 不渲染为 chip + 注册表兜底 + 终端
- [ ] **支线 C 未产出**：零 `aiNext` ⇒ 确定性注册表产卡（含 floor）
- [ ] **支线 D 未配置**：零候选产出（**零网络**）+ 确定性 + 终端（现状逐字）
- [ ] S0'''-1~10 逐步可判；样本单源；真源切片（读生产模块，禁假 provider / 桩）；双向反证（注入必红 + 逐字节还原）

**验证命令**:
```bash
npm --prefix packages/web-cli-plugin test
npm --prefix packages/web-cli-plugin run test:s0-self-driven
```

**门禁**: `s0-self-driven-chain` / `ai-next-candidate`

---

### TASK-ADN-218: S0''' Chromium 面 + `recommendation.mjs` + `law8-plaintext.mjs`（只加断言）

| 属性 | 值 |
|------|-----|
| **复杂度** | L |
| **前置依赖** | TASK-ADN-217 |
| **执行波次** | 3（W06） |
| **类型** | gate |
| **对应 FR** | FR-ADN-083 / 084 |
| **对应 AC** | AC-ADN-001 / 013 / 017 |
| **对应 ADR** | ADR-ADN-007 |

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/web-cli-plugin/test/ui/s0-self-driven.mjs` |
| MODIFY | `packages/web-cli-plugin/test/ui/recommendation.mjs` |
| MODIFY | `packages/web-cli-plugin/test/ui/law8-plaintext.mjs` |

**验收标准**:
- [ ] `s0-self-driven.mjs`：S0''' 四支线断言（驱动经 `window.__v3.testing.aiNext(...)` 测试缝）
- [ ] `recommendation.mjs`：「AI 在场 ⇒ 无陈旧 `ref-action` chip」「≤3」「单卡」「终端恒最末」；AI 缺席 ⇒ 陈旧 chip 照旧
- [ ] `law8-plaintext.mjs`：AI 候选 label / 留痕行零明文面（**只加断言**，零降级）
- [ ] **只加断言不加文件** ⇒ `CHROMIUM_GATES === 9`；`test:recommendation ≥79`
- [ ] 人工面 M1~M5 逐项 `⏳ 未执行`

**验证命令**:
```bash
npm --prefix packages/web-cli-plugin run test:s0-self-driven
npm --prefix packages/web-cli-plugin run test:recommendation
npm --prefix packages/web-cli-plugin run test:law8
```

**门禁**: `s0-self-driven` / `recommendation.mjs` / `law8`

---

### TASK-ADN-219: X-ADN-1~11 台账**终态**（已发生 4 / 未发生 6 / 等价重锚 1）

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-ADN-213 |
| **执行波次** | 3（W06） |
| **类型** | doc |
| **对应 FR** | FR-ADN-090~101 |
| **对应 AC** | AC-ADN-010 / 020 |
| **对应 ADR** | ADR-ADN-010 |

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/web-cli-plugin/docs/v4-supersession-ledger.json` |

**验收标准**:
- [ ] **已发生 4**：X-ADN-1（产出权转移）/ X-ADN-7（12↔12）/ X-ADN-8（R6 去重扩展）/ X-ADN-11（关断两相）标 `superseded`
- [ ] **未发生取代 6**：X-ADN-2 / 3 / 4 / 5 / 6 / 9 标 `no-supersession` + **理由非空**
- [ ] **等价重锚·非取代 1**：X-ADN-10 标 `reanchored-keep`
- [ ] 每行 `id` / `status` / `old`（逐字）/ `new` / `reason` / `date` / `landing` / `counterCheck`（可定位判据）
- [ ] **老条目（v3/v4/v4.5/v5/v5.5/F-34/F-35）逐字保留**；**不留空 / 不伪造「已取代」**（`N-ADN-030`）
- [ ] 与叶1 骨架段一致（文件只追加）

**验证命令**:
```bash
npm --prefix packages/web-cli-plugin run test:supersession
```

**门禁**: `test:supersession`

---

### TASK-ADN-220: `supersession-ledger` 一致性判据 + 保护段 keep（journey / binding 字节中立）

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-ADN-219 |
| **执行波次** | 3（W06） |
| **类型** | gate |
| **对应 FR** | FR-ADN-112 / 113 |
| **对应 AC** | AC-ADN-020 / 021 |
| **对应 ADR** | ADR-ADN-009 / ADR-ADN-010 |

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/web-cli-plugin/test/supersession-ledger.test.ts` |

**验收标准**:
- [ ] 新增 X-ADN 台账段一致性判据：逐条登记 + `counterCheck` 可定位 + `no-supersession` 理由非空
- [ ] **保护段 keep**：`test/ui/journey.mjs` `[43484,59347)` / sha `7b309258aab783e7…` / 249 行；`test/ui/binding.mjs` `[107780,115930)` / sha `be9ad0e9…`；**零改动** ⇒ `startAnchor` / `endByte` / sha **双绿**（无需等长补偿 / 八步取代）
- [ ] 老台账链判据继续承重（只增不减）；`test:journey ≥171` / `test:binding ≥192`
- [ ] `test:supersession ≥49`

**验证命令**:
```bash
npm --prefix packages/web-cli-plugin run test:supersession
npm --prefix packages/web-cli-plugin run test:binding
```

**门禁**: `test:supersession` / `test:journey` / `test:binding`

---

### TASK-ADN-221: 体积叶2 重登记 + 两叶 Σ + EC-ADN-016 逐分支

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-ADN-213 / TASK-ADN-217 / TASK-ADN-218 / TASK-ADN-220 |
| **执行波次** | 3（W06） |
| **类型** | doc |
| **对应 FR** | FR-ADN-121 / 122 / 123 / 124 / 125 |
| **对应 AC** | AC-ADN-026 |
| **对应 ADR** | ADR-ADN-008 |

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/web-cli-plugin/test/size-baseline.ts` |
| MODIFY | `packages/web-cli-plugin/test/size-growth-evidence.test.ts` |
| MODIFY | `packages/web-cli-plugin/test/size-ruling-vol3.test.ts` |

**验收标准**:
- [ ] A 列叶2 **+0.5~1.5 KB** 实测重登记 + **五要素** + **三值** + 逐模块行 `adn2Rows`（Σ + 未归因 == 登记增量）+ **两叶 Σ 对照**（A Σ 目标 +1.3~+3.5 KB）
- [ ] B 列 +0.5~1.5 KB **不计入 sidepanel 账本**（如实标注列别；搬列规避 ⇒ 必红）
- [ ] **EC-ADN-016 逐分支**：越生效上限 `628,872` ⇒ 显式重登记基线；越档位 `614,400` ⇒ 显式升档路径 + **作者一行**；越绝对上限 `675,840` ⇒ 停止并请示
- [ ] `authorConfirmation = pending-author-line`（**不得伪称已确认**）；距档 **15,474 B** 结论如实登记
- [ ] `test:size-ruling-vol3 ≥13`；实测值禁预填（`ADN-P-006`）

**验证命令**:
```bash
npm --prefix packages/web-cli-plugin run typecheck && npm --prefix packages/web-cli-plugin run build
npm --prefix packages/web-cli-plugin run test:size-ruling-vol3
```

**门禁**: `test:size-ruling-vol3`

---

### TASK-ADN-222: 门禁守恒终态对账（新增 1 + 升级 6 + 间接面三态齐）

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-ADN-213 / TASK-ADN-218 / TASK-ADN-221 |
| **执行波次** | 3（W06） |
| **类型** | gate |
| **对应 FR** | FR-ADN-114 / 115 / 116 |
| **对应 AC** | AC-ADN-018 / 022 / 023 / 024 |
| **对应 ADR** | ADR-ADN-009 |

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/web-cli-plugin/test/gate-integrity.test.ts` |

**验收标准**:
- [ ] 新 node 门禁 `ai-next-candidate` 入 `gate-integrity` 受审下界；`EXPECTED_AUDITED_FILES` 下界 +1（收口按实测**同源前移**）
- [ ] 新增 1 + 升级 6 + 间接面**三态齐**；`assertionsRemoved = 0`；断言零删除零降级、计数只增
- [ ] `CHROMIUM_GATES === 9` 逐字不动（不新增 Chromium 门禁文件）
- [ ] 门禁**严格串行**（`test` / `test:ui` / `test:binding` 绝不并发；一次一个 Chromium；`finally` 自清 profile）
- [ ] `KL-N-10` 处置：隔离复跑 ≥2 + 日志全量 + 仍红如实记录不阻塞收口；`npm test ≥1443`

**验证命令**:
```bash
npm --prefix packages/web-cli-plugin run test:gate-integrity
npm --prefix packages/web-cli-plugin test
```

**门禁**: `gate-integrity`

---

### TASK-ADN-223: 人工面 M1~M5 `⏳` + 本叶收口对账 + `e2e`

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-ADN-218 / TASK-ADN-220 / TASK-ADN-222 |
| **执行波次** | 3（W06） |
| **类型** | doc |
| **对应 FR** | FR-ADN-084 |
| **对应 AC** | AC-ADN-030 |
| **对应 ADR** | ADR-ADN-007 |

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| MODIFY | 本叶 `state.json` / `TREE.md`（收口登记） |

**验收标准**:
- [ ] 人工面 **M1~M5 逐项 `⏳ 未执行`**（AI 候选真机相关性 / 「两张皮」是否消失 / 密度观感 / 读屏可用性 / 「被拦」体感）；**不得冒充 PASS**
- [ ] 本叶交付物 8 项对账（兜底 / 合并 / R6 / 护栏 / S0''' 终态 / 升级 6 / X-ADN 台账 / 体积叶2）
- [ ] 两叶 Σ 门禁清单；保护段 keep 双绿；`e2e` PASS
- [ ] 收口摘要（feature / 阶段 tasked → tracked / 任务数与波次）

**验证命令**:
```bash
npm --prefix packages/web-cli-plugin run test:e2e
```

**门禁**: `e2e`

---

## 3. 任务汇总

| 统计项 | 数值 |
|--------|:--:|
| 总任务数 | **23** |
| S 级 (简单) | 3 |
| M 级 (中等) | 18 |
| L 级 (复杂) | 2 |
| 执行波次 | 3（W04 / W05 / W06） |
| spikeGate | 1（SG-ADN-03） |
| 新增门禁 | 0（沿用叶1 的 `ai-next-candidate` + 升级 6 终态） |
| 升级门禁 | 6（终态对账）+ 间接面 |

**类型分布**：implementation × 9 / gate × 11 / doc × 3 / spike × 1（0 human）。

**模板偏差登记**：模板 §5.4 / §8 建议 5~15 任务 ⇒ 本叶 **23**；理由 ① 本叶 `plan.md §7` 列交付物 8 项、执行序 3 波；② 与 F-35 叶2（25）/ F-34 叶2（16）/ v5.5-2（36）同量级显式登记；③ 23 = 可原子执行单元（≈1 文件内 1 项可验证改动 + 其判据）。

---

## 4. 执行策略

| 波次 | 任务 | 策略 |
|:--:|------|------|
| 1（W04） | `201`–`207` | `201` 先验闸门最前；`202 ∥ 203`（文件不相交）→ `204` → `205 ∥ 206` → `207` |
| 2（W05） | `208`–`216` | `208 ∥ 210`（文件不相交）；`209`（依赖 208）；`211`（依赖 202）；`212`（依赖 203/211）；`213`（依赖 207/209）；`214 ∥ 215`；`216`（依赖 210/212） |
| 3（W06） | `217`–`223` | `217`（依赖 202/205/212/213）→ `218`（依赖 217）；`219 ∥ 221`（文件不相交）；`220`（依赖 219）；`222`（依赖 213/218/221）；`223` 末位（依赖 218/220/222，收口） |

**波内提交区间（commit interval）**：A = W04（兜底与合并）/ B = W05（护栏与首开）/ C = W06（验收与治理，**收口轮·终局**）。

**每波收口门禁绿**：W04 收口（`recommendation-sources` 替换口径 + `density` + 兜底判据）；W05 收口（`proactivity-guard` + `r8` + `no-dead-end` + 升级 6）；W06 收口（S0''' 四支线 + 台账终态 + 保护段 keep + 体积 Σ + 门禁守恒 + `e2e`）。

---

## 5. 验收门禁清单（本叶）

- `typecheck` · `build` · `npm test ≥1443` · `recommendation-sources`（替换口径 / 规则表恰 4 / 单卡 / ④ 保持）· `proactivity-guard`（提案不耗预算双向 / 关断两相）· `op-wiring`（计数不动 / `requestTurn(` 恰 1）· `driver-timings`（恰 5）· `driver-quadruple`（12↔12）· `op-three-tier`（加严）· `next-registry` · `density-thresholds ≥242` · `turn-arbitration ≥7` · `free-input-next ≥22` · `r8-open-next-entry` · `no-dead-end ≥53` · `supersession-ledger ≥49`（X-ADN 终态 + 保护段）· `test:journey ≥171`（keep）· `test:binding ≥192`（keep）· `test:recommendation ≥79` · `s0-self-driven ≥82` · `test:law8 ≥60` · `test:insight ≥125` · `gate-integrity ≥25` · `size-*` + `test:size-ruling-vol3 ≥13` + **两叶 Σ** · `e2e` PASS

**红线巡检（本叶职责）**：`free-input` 终端恒常驻 / R8 首开入口不回归（`N-ADN-008` / `N-ADN-025`）· 单卡 / 3-chip / 密度不破（`N-ADN-027`）· 提案不耗预算（`N-ADN-026`）· 保护段 keep（`N-ADN-015`）· 未发生取代如实登记（`N-ADN-030`）· 断言零删除（`N-ADN-012`）· `FR-CHAT-060` 保持。

**停机规则（本叶）**：见父 `../tasks.md §8`（12 条）；本叶重点 = 第 6 / 7 / 8 / 9 / 12 条 + 兜底回归 / 终端缺失 / 门禁降强度。

**二维时序（本叶）**：build（W04→W05→W06）→ review（重锚纪律审查 + 保护段审查 + 兜底审查 + 恒真审查，见父 `§9.2`）→ validate（全门禁复跑 + S0''' 四支线终态 + 台账终态 + 保护段双绿 + 体积 Σ + `e2e`，见父 `§9.3`）。

---

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建（ADN-2 叶任务：**23 任务 / 3 波**（`TASK-ADN-201~223`；S×3 / M×18 / L×2）+ 1 个 spikeGate（`SG-ADN-03`）+ 升级 6 门禁等价重锚终态 + S0''' 四支线终态 + X-ADN-1~11 台账终态 + 保护段 keep（journey `[43484,59347)` / binding `[107780,115930)`）+ 体积叶2 重登记（+0.5~1.5 KB）+ 两叶 Σ + 门禁守恒终态对账 + 人工面 M1~M5 ⏳。**本轮只做 tasks**：零 `src`/`test`/`dist`/`docs`/`design`/ROADMAP 改动；未跑门禁 / 构建 / Chromium；未调用任何受管 Provider（routing.v1 = `local_or_compute → none`） | 2026-09-26 | SDDU Tasks Agent |
