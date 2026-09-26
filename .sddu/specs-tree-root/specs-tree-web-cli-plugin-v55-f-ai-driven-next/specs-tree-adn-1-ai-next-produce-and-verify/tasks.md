# 任务分解：specs-tree-adn-1-ai-next-produce-and-verify（ADN-1 AI 结构化产出 next 候选 + 5 道校验链：通道 + 安全核心）

> **文档定位**: SDDU 任务清单（**叶级切片**）— 父 `../tasks.md`（v1.0 总览）在本叶的落地；作为 build 阶段的输入。**本叶 = 首叶 / 底座叶 + 安全核心**，一次交付「通道 + 5 道校验链 + 判定分层」，中间态即安全可达
> **前置依赖**: 本叶 `plan.md` v1.0 + 本叶 `spec.md` v1.0 + 父 `../plan.md` v1.0（含 `ADR-ADN-001~010`）+ 父 `../spec.md` v1.0 + 唯一直接上游 F-35 两叶 `validated` + R8 `38565ac`
> **创建人**: SDDU Tasks Agent
> **创建时间**: 2026-09-26
> **版本**: v1.0
> **更新人**: SDDU Tasks Agent
> **更新时间**: 2026-09-26
> **更新说明**: 初始创建（ADN-1 叶任务：**27 任务 / 3 波**（`TASK-ADN-101~127`；S×6 / M×17 / L×4）+ 2 个 spikeGate（`SG-ADN-01/02`）+ 1 个新 node 门禁 `ai-next-candidate`（AI-N-1~11）+ S0''' 主/B/D node 面 + 升级 6 等价重锚 + 体积叶1 正增量重登记 + X-ADN 骨架）

---

## 0. 结构登记（**首叶 / 底座叶 + 安全核心**）

| 项 | 内容 |
|---|---|
| 叶定位 | **首叶 / 底座叶 + 安全核心**（`deliveryOrder: 1` / `dependsOn: []` / P0）；**先立通道与安全闸** |
| 与叶2 关系 | 叶1 **全绿（validated）** 后叶2 方可启动（`BLK-ADN-9`；`R-ADN-001` / `N-ADN-021`） |
| 本叶**不做** | 兜底 / 合并语义终态（叶2）/ free-input 终端恒常驻终态验收（叶2）/ R6 同因去重扩展（叶2）/ 替换口径终态（叶2）/ 护栏六常量接线与关断两相（叶2）/ 首开边界落地（叶2）/ 升级 6 终态 + 保护段 + X-ADN 台账终态（叶2） |
| 本叶**不变** | `KIND_SET` 40 / 12 kind / 零宿主 / `ACT_TO_OP` 恰 6 / `NEXTSTEP_PRIORITY` 恰 4 / `DRIVER_TIMINGS` 恰 5 / `requestTurn(` 恰 1 / `maybeRecommend` 1 定义·8 调用点 / `nextAfterSettle` 1 定义·10 调用点 / 单卡 / 3-chip / `pressDecision` 语义（diff=0） |
| 模板偏差 | 模板 §5.4 / §8 建议 5~15 任务 ⇒ 本叶 **27**（与 F-35 叶1 27 同量级，显式登记，理由见 §3） |
| 编号空间 | `TASK-ADN-101~127`；与 `TASK-ADN-2xx`（叶2）连续不交叠 |

---

## 1. 依赖拓扑总览（3 波）

```
W01 ─── 载体与校验链（可并行区：102 ∥ 103；104 ∥ 105）
  TASK-ADN-101 [M] spike  SG-ADN-01（先验闸门，最前）
  TASK-ADN-102 [S] definition.ts AiNext* 3 类型 + NextCtx.session.aiNext? + chipsFor?/label?
  TASK-ADN-103 [S] chat-events.ts ChatResultEvent.aiNext?（type-only 单声明）
  TASK-ADN-104 [S] ref-context.ts 有引用分支追加产出契约句
  TASK-ADN-105 [S] shared/op-table.ts OpDescriptor.ask?
  TASK-ADN-106 [L] background/ai-next.ts（NEW）解析 + 5 道校验链 + admitCandidate
  TASK-ADN-107 [M] service-worker.ts 累积末条 assistant 文本 + done 装配

W02 ─── 分层与注入（依赖 W01；可并行区：111 ∥ 112）
  TASK-ADN-108 [M] spike  SG-ADN-02（先验闸门，最前）
  TASK-ADN-109 [M] admitCandidate 接受层真值表（共享 tierOf；pressDecision diff=0）
  TASK-ADN-110 [M] providers.ts ai-next 第 12 行 + DRIVER_DECLS_SRC 第 12 行 + 注释订正
  TASK-ADN-111 [S] ai-drive.ts driverBlockedLine 单源
  TASK-ADN-112 [S] registry.ts chipsFor loud 校验 + ops.ts reachableOpIds 优先 chipsFor
  TASK-ADN-113 [M] recommend.ts session.aiNext 透传 + chipsFor 解析 + label 覆盖
  TASK-ADN-114 [L] sidepanel.ts done 分支消费（事件作用域单槽 + 留痕）+ testing.aiNext 测试缝
  TASK-ADN-115 [L] gate   test/ai-next-candidate.test.ts 骨架 AI-N-1~4/11
  TASK-ADN-116 [M] gate   ai-next-candidate AI-N-5/8/9/10
  TASK-ADN-117 [M] gate   ai-next-candidate AI-N-6/7 五类注入反证 + 真源切片 + 三段控制

W03 ─── 门禁与验收（收口轮；可并行区：118 ∥ 119 ∥ 120）
  TASK-ADN-118 [M] gate   recommendation-sources 等价重锚（白名单恒 5 / 规则表恰 4 / ④ 保持）
  TASK-ADN-119 [M] gate   driver-timings DT-6 session.aiNext（恰 5 保持）
  TASK-ADN-120 [M] gate   driver-quadruple DQ-1 12↔12 + DQ-3 收纳 session.aiNext
  TASK-ADN-121 [M] gate   op-wiring 计数全保持（requestTurn( 恰 1 / maybeRecommend 1·8 / nextAfterSettle 1·10）
  TASK-ADN-122 [M] gate   next-registry NR-10 11→12 + op-three-tier 加严
  TASK-ADN-123 [M] gate   gate-integrity 受审下界只增 ai-next-candidate
  TASK-ADN-124 [L] gate   S0''' 主线/支线 B/支线 D node 面
  TASK-ADN-125 [M] gate   s0-self-driven.mjs + law8-plaintext.mjs 断言增量（只加断言）
  TASK-ADN-126 [M] doc    红线巡检 + 体积叶1 重登记（五要素 + 三值 + EC-ADN-016 二态）
  TASK-ADN-127 [M] doc    X-ADN-1/X-7 台账骨架 + no-supersession 骨架 + 门禁对账骨架（本叶收口）
```

**关键路径**：`101 → 102 → 105 → 106 → 107 → 108 → 109 → 110 → 113 → 114 → 115 → 116 → 117 → 118 → 121 → 123 → 124 → 126 → 127`。

---

## 2. 任务列表

### TASK-ADN-101: SG-ADN-01 围栏块严格 JSON 解析 + `chat-result` 载荷加法字段可行性探针（先验闸门）

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | 无 |
| **执行波次** | 1（W01） |
| **类型** | spike |
| **对应 FR** | FR-ADN-010 / 011 / 012 / 016 / 018 / 028 |
| **对应 AC** | AC-ADN-002 |
| **对应 ADR** | ADR-ADN-001 / ADR-ADN-008 |

**描述**: 在真实源码上验证「尾随 `next` 围栏块严格 JSON 解析」与「`chat-result` 载荷 type-only 加法字段」两条通道形态成立，且**零新增 kind**；为 W01 全部实现任务与 W02 门禁骨架预演判据口径。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| SPIKE | `packages/web-cli-plugin/test/_spike/sg-adn-01-probe.mjs`（探毕删除，不落版本库） |

**验收标准**:
- [ ] 取块口径可证：在**本回合最后一条** `assistant` 文本中，取**最后一个** info 为 `next` 的围栏块（大小写不敏感）；中间轮次文本不参与
- [ ] 解析口径可证：严格 `JSON.parse`；顶层必须**数组**；否则 ⇒ 零候选（**支线 C**，不写 `blocked`）；项非对象 ⇒ 丢弃（不写 `blocked`）；对象项进入 5 道校验链
- [ ] 载荷可行性：`AiNextPayload` 声明落 `definition.ts`（不新增消息族）；`ChatResultEvent.aiNext?` 为 type-only 加法字段；候选类型 ∉ `KIND_SET`
- [ ] 反证可红预演：注入第 41 个 `KIND_SET` / 第 13 kind / 新宿主 ⇒ 判据可 FAIL
- [ ] 结论 ∈ {可行 / 不可行}；探针产物不进入提交

**验证命令**:
```bash
node packages/web-cli-plugin/test/_spike/sg-adn-01-probe.mjs   # 探毕删除
```

**被闸门任务**: `102` / `103` / `106` / `107` / `115`
**停止规则**: 不可行 ⇒ 暂停上报（禁新增 kind / 禁新增消息族 / 禁改动 `KIND_SET`）

---

### TASK-ADN-102: `definition.ts` `AiNext*` 3 类型 + `NextCtx.session.aiNext?` + `chipsFor?`/`label?`

| 属性 | 值 |
|------|-----|
| **复杂度** | S |
| **前置依赖** | TASK-ADN-101 |
| **执行波次** | 1（W01） |
| **类型** | implementation |
| **对应 FR** | FR-ADN-011 / 012 / 015 |
| **对应 AC** | AC-ADN-002 / 029 |
| **对应 ADR** | ADR-ADN-001 / ADR-ADN-004 |

**描述**: 在 `next-registry/definition.ts`（**已在** `RECOMMEND_MODULE_WHITELIST`）声明 `AiNextCandidate` / `AiNextBlockedCode` / `AiNextPayload` 各**恰一处**，并加 `NextCtx.session.aiNext?` 与 `NextProvider.chipsFor?` / `label?` 两个加法字段。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/web-cli-plugin/src/ui/sidepanel/next-registry/definition.ts` |

**验收标准**:
- [ ] 3 个类型各**恰一处**声明；候选结构 `{opId,label,ref?,params?}`；`AiNextBlockedCode` 闭集 `'unknown-op' | 'tier' | 'ref' | 'param' | 'label'`
- [ ] `NextCtx.session.aiNext?` 为**加法字段**（嵌套在既有 `session` 之下 ⇒ 顶层仍恰 **7 源**；`next-registry` NR-0 保持绿）
- [ ] `NextProvider.chipsFor?` / `label?` 加法（既有 `chips: readonly string[]` **逐字保留**且仍必填非空）
- [ ] 类型落 `definition.ts` ⇒ `recommend.ts` **零新 import** ⇒ `recommendation-sources` 白名单**恒 5**（不新增条目）

**验证命令**:
```bash
npm --prefix packages/web-cli-plugin run typecheck
npm --prefix packages/web-cli-plugin run test:recommendation
```

**门禁**: `recommendation-sources`（白名单恒 5）

---

### TASK-ADN-103: `chat-events.ts` `ChatResultEvent.aiNext?`（type-only 单声明）

| 属性 | 值 |
|------|-----|
| **复杂度** | S |
| **前置依赖** | TASK-ADN-101 |
| **执行波次** | 1（W01） |
| **类型** | implementation |
| **对应 FR** | FR-ADN-011 / 018 |
| **对应 AC** | AC-ADN-002 |
| **对应 ADR** | ADR-ADN-001 |

**描述**: 给 `ChatResultEvent` 加**恰一个** type-only 加法字段 `aiNext?: AiNextPayload`（与既有 `targetSelector` 同构），既有 7 字段逐字保留。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/web-cli-plugin/src/background/chat-events.ts` |

**验收标准**:
- [ ] 既有 7 字段（`variant`/`text`/`retrying`/`tool`/`ok`/`ms`/`targetSelector`）**逐字保留**
- [ ] `aiNext?` 为**恰一处**单声明（type-only 词汇；**∉ `KIND_SET`**；不新增消息 kind）
- [ ] **缺席 ⇒ 现状逐字**（无 `aiNext` 时面板零行为差，`N-ADN-029`）
- [ ] 反证：注入第 41 个 `KIND_SET` 成员 / 第 13 kind ⇒ 必红

**验证命令**:
```bash
npm --prefix packages/web-cli-plugin test
```

**门禁**: `ai-next-candidate`（载荷加法字段缺席逐字）

---

### TASK-ADN-104: `ref-context.ts` 有引用分支追加产出契约句（基座 / 工厂形态零改）

| 属性 | 值 |
|------|-----|
| **复杂度** | S |
| **前置依赖** | TASK-ADN-101 |
| **执行波次** | 1（W01） |
| **类型** | implementation |
| **对应 FR** | FR-ADN-010 |
| **对应 AC** | AC-ADN-002 |
| **对应 ADR** | ADR-ADN-001 |

**描述**: 把「产出 `next` 围栏块的机器可读契约句」并入 `refContextSegment` 的**有引用分支**；无引用 ⇒ 追加段仍 `''` ⇒ `system === SYSTEM_PROMPT`。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/web-cli-plugin/src/background/ref-context.ts` |

**验收标准**:
- [ ] `SYSTEM_PROMPT` 基座 5 条既有条款**逐字**；`system` 工厂形态**逐字** `() => SYSTEM_PROMPT + refContextSegment(refs)`（`ref-context-in-turn` RCT-3/RCT-4 保持绿）
- [ ] 无引用 ⇒ `refContextSegment([]) === ''` ⇒ `system` 逐字等于基座
- [ ] 产出契约句只出现在**有引用分支**（本轮 AI 候选只在 `ref-action` 上下文产出，`PD-ADN-005`）
- [ ] 门禁不读提示词（法九 L9-8 口径；`law9-scope-reading` 零改）

**验证命令**:
```bash
npm --prefix packages/web-cli-plugin test
```

**门禁**: `ref-context-in-turn`

---

### TASK-ADN-105: `shared/op-table.ts` `OpDescriptor.ask?` 加法字段（param 校验单源）

| 属性 | 值 |
|------|-----|
| **复杂度** | S |
| **前置依赖** | TASK-ADN-101 |
| **执行波次** | 1（W01） |
| **类型** | implementation |
| **对应 FR** | FR-ADN-016 / 025 |
| **对应 AC** | AC-ADN-004 |
| **对应 ADR** | ADR-ADN-002 |

**描述**: 把「该 op 是否接受参数 / 参数形态」提升为 `OpDescriptor` 的加法字段 `ask?: 'choice' | 'form'`（承 `hasConsent` 提升先例，不新建第二张表）。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/web-cli-plugin/src/shared/op-table.ts` |

**验收标准**:
- [ ] `ask?: 'choice' | 'form'` 纯加法（缺席 ⇒ 该 op 不接受参数，`params: null`）
- [ ] 一致性机核：`ask === undefined ⟺ ops.ts#IMPL` 该行 `params === null`（**逐行一致**，AI-N-11）
- [ ] 两侧镜像 `SW_OPS ↔ shared/op-table.ts` 不漂移（`sw-op-mirror` 绿）
- [ ] `OP_IDS` 9 枚 / `ACT_TO_OP` 恰 6 逐字不动

**验证命令**:
```bash
npm --prefix packages/web-cli-plugin test
```

**门禁**: `ai-next-candidate` / `sw-op-mirror`

---

### TASK-ADN-106: `background/ai-next.ts`（NEW）解析 + 5 道校验链 + `admitCandidate` 纯函数族

| 属性 | 值 |
|------|-----|
| **复杂度** | L |
| **前置依赖** | TASK-ADN-101 / TASK-ADN-102 / TASK-ADN-105 |
| **执行波次** | 1（W01） |
| **类型** | implementation |
| **对应 FR** | FR-ADN-016 / 020~029 |
| **对应 AC** | AC-ADN-003 / 004 |
| **对应 ADR** | ADR-ADN-001 / ADR-ADN-002 / ADR-ADN-003 |

**描述**: 新建 SW 侧纯函数模块：`parseAiNextBlock` + `validateAiNext` + `admitCandidate`，实现**顺序即优先级**的 5 道校验链与 label 零明文预筛。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| NEW | `packages/web-cli-plugin/src/background/ai-next.ts` |

**验收标准**:
- [ ] ① `opId` 在册（∈ `OP_IDS` 9 枚；未知 ⇒ `unknown-op`）→ ② `tierOf(d)` 三档（`gesture` 恒拒）→ ③ `ref` 存在且有效（命中本回合 `ChatRefFact[]` ∧ `refState==='valid'`）→ ④ `params` 与 `AskSpec` 相容 → ⑤ 越界 / 非法 ⇒ **丢弃 + `blocked=` 可读留痕**（零明文、不死端）
- [ ] **顺序不可交换**：注入「未知 op + 越界 ref」⇒ **只**报 `unknown-op`
- [ ] 拒绝码闭集 `AiNextBlockedCode`；`unknown-op` / `tier` 以 `import type { PressBlocked }` 派生（**类型单源**）；`label` 为第 5 类（fail-closed 加法）
- [ ] `ref` 字符串语义（`refId` 或规范形 `ref_<n>`；**不接受裸数字 / `#3` / 选择器**）；缺席 ⇒ pass
- [ ] label：形状非空 string → 零明文 caliber 预筛（命中 ⇒ `blocked=label`）→ `AI_NEXT_LABEL_MAX=48` **先扫后截**
- [ ] 常量 `AI_NEXT_LABEL_MAX=48` / `AI_NEXT_PARAM_MAX=128` 登记为**显示 / 结构上限**（**非**六常量护栏阈值）
- [ ] 纯函数：无 DOM / 时钟 / IO / `chrome`；零新真值源（读 SW 本回合 refs 快照 + `shared/op-table` 镜像）

**验证命令**:
```bash
npm --prefix packages/web-cli-plugin test
```

**门禁**: `ai-next-candidate` / `op-three-tier`

---

### TASK-ADN-107: `service-worker.ts` 累积本回合末条 assistant 文本 + `done` 装配 `aiNext`

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-ADN-103 / TASK-ADN-106 |
| **执行波次** | 1（W01） |
| **类型** | implementation |
| **对应 FR** | FR-ADN-010 / 016 / 017 |
| **对应 AC** | AC-ADN-002 |
| **对应 ADR** | ADR-ADN-001 / ADR-ADN-005 |

**描述**: SW 侧累积本回合**最后一条** assistant 文本；仅在 `variant==='done'` ∧ `openAsks===0` 时解析 + 校验 + 装配 `ChatResultEvent.aiNext`。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/web-cli-plugin/src/background/service-worker.ts` |

**验收标准**:
- [ ] 只累积**最后一条** assistant 文本（中间轮次不参与，避免陈旧 / 半程块）
- [ ] 仅在 `done` ∧ `openAsks===0` 装配；`variant='error'` 结算点照旧走既有 `maybeRecommend('idle')` ⇒ **零候选**（确定性兜底）
- [ ] **零新 LLM 调用**（复用刚结束回合输出；无第二次 provider 调用、无新网络面）⇒ `FR-CHAT-060` 不破
- [ ] 未配 LLM ⇒ **零候选产出**（零网络；`variant='llm-unconfigured'` 连 `chatBusy` 都不占）
- [ ] `turn-queue.ts` diff=0（不改 SW 队列仲裁）

**验证命令**:
```bash
npm --prefix packages/web-cli-plugin test
npm --prefix packages/web-cli-plugin run test:e2e
```

**门禁**: `ai-next-candidate` / `FR-CHAT-060`

---

### TASK-ADN-108: SG-ADN-02 `admitCandidate` / `pressDecision` 分层共享 `tierOf` 且 `pressDecision` diff=0 可证探针（先验闸门）

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-ADN-102 / TASK-ADN-106 |
| **执行波次** | 2（W02） |
| **类型** | spike |
| **对应 FR** | FR-ADN-030 / 031 / 032 / 033 / 034 / 035 |
| **对应 AC** | AC-ADN-005 |
| **对应 ADR** | ADR-ADN-003 |

**描述**: 验证「接受层（提案）」与「按下层（执行）」可分层且共享同一 `tierOf`，`pressDecision` 语义不变；为 `admitCandidate` / provider / 注入 / 面板消费任务预演判据。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| SPIKE | `packages/web-cli-plugin/test/_spike/sg-adn-02-probe.mjs`（探毕删除） |

**验收标准**:
- [ ] 真值表四情形可判：在册 ∧ 无 consent ∧ `layer==='panel'`（auto）⇒ 接受；在册 ∧ `hasConsent`（`op.llm-config` / `op.revoke`）⇒ **接受可提案**；在册 ∧ `layer==='sw'`（`op.authorize` / `op.perm.request`）⇒ **拒**（`blocked=tier`）；不在册 ⇒ 拒（`unknown-op`）
- [ ] 分层可判：`op.llm-config` ⇒ `admitCandidate(...).ok === true ∧ pressDecision('op.llm-config', {actor:'ai',…}).blocked === 'tier'`
- [ ] `pressDecision` 语义 **diff=0**（`unknown-op`/`tier`/`driver-class`/`unconfigured`/`busy`/`not-armed`/`guard` 顺序与取值逐字不动）
- [ ] 两层共享 `tierOf` **单源**（零第二档位表）；结论 ∈ {可行 / 不可行}

**验证命令**:
```bash
node packages/web-cli-plugin/test/_spike/sg-adn-02-probe.mjs   # 探毕删除
```

**被闸门任务**: `109` / `110` / `113` / `114` / `116`
**停止规则**: 不可行 ⇒ 暂停上报（禁复用 `pressDecision` 作接受判据 / 禁放宽为「非 gesture 即接受」/ 禁第二档位表）

---

### TASK-ADN-109: `admitCandidate` 接受层真值表（auto/confirm 接受、gesture 拒、未知拒）

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-ADN-106 / TASK-ADN-108 |
| **执行波次** | 2（W02） |
| **类型** | implementation |
| **对应 FR** | FR-ADN-030 / 031 / 032 / 033 |
| **对应 AC** | AC-ADN-005 |
| **对应 ADR** | ADR-ADN-003 |

**描述**: 在 `background/ai-next.ts` 落地 `admitCandidate` 接受层纯函数；`pressDecision` **不改**（保持 `auto` only）。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/web-cli-plugin/src/background/ai-next.ts` |

**验收标准**:
- [ ] `admitCandidate(c, facts)` 与 5 道校验链同一函数族；`auto`/`confirm` 接受、`gesture` 拒、未知拒
- [ ] `confirm` 候选项点击经**既有** `dispatchChipAction` → 既有 consent 卡（**不新增执行体 / 不绕过 consent**；AI 不代答）
- [ ] `pressDecision` **语义 diff=0**（`tierOf!=='auto'` ⇒ `blocked:'tier'` 保持；顺序与取值逐字不动）
- [ ] 双向反证：把 `confirm` 也拒 ⇒ 必红；把 `gesture` 放行 ⇒ 必红
- [ ] 零第二档位表 / 零第二阈值（源码扫描）

**验证命令**:
```bash
npm --prefix packages/web-cli-plugin test
```

**门禁**: `ai-next-candidate` / `op-three-tier`

---

### TASK-ADN-110: `providers.ts` `ai-next` 第 12 行 + `DRIVER_DECLS_SRC` 第 12 行 + 注释订正

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-ADN-108 / TASK-ADN-109 |
| **执行波次** | 2（W02） |
| **类型** | implementation |
| **对应 FR** | FR-ADN-013 / 014 / 096 |
| **对应 AC** | AC-ADN-010 |
| **对应 ADR** | ADR-ADN-004 / ADR-ADN-006 |

**描述**: 注册 `ai-next` provider（骑既有 `ref-action` 规则位）并新增 `DRIVER_DECLS_SRC` 第 12 行；订正「8 built-in providers」陈旧注释（`COR-ADN-4`）。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/web-cli-plugin/src/ui/sidepanel/next-registry/providers.ts` |

**验收标准**:
- [ ] provider 恰一行：`{ id:'ai-next', deps:['session'], priority:2, prepend:true, mode:'waterfall', fail:'card-boundary', rule:'ref-action', label:'下一步推荐：AI 建议', when:(ctx)=>(ctx.session.aiNext?.length??0)>0 && ctx.session.openAsks===0, chips:[ACT_TO_OP.next], chipsFor:(ctx)=>ctx.session.aiNext!.map(c=>c.opId), textOf:(ctx)=>ctx.session.aiNext!.map(c=>c.label) }`
- [ ] 既有 11 行 provider **零改动**；`chips` 静态下界 `['op.turn']`（非空，表达「至少可产 `op.turn`」）；`chipsFor` 为权威动态面
- [ ] `DRIVER_DECLS_SRC` 第 12 行 `'ai-next': { driverId:'ai-next', timings:['idle'], moments:['turn-end'], driverClass:'ai-driven', priority:2, evidence:['session.aiNext'] }`；旧 11 行**逐字保留**；双向包含 **11↔11 → 12↔12**
- [ ] `NEXTSTEP_PRIORITY` **恰 4** 不动；`ACT_TO_OP` **恰 6** 不动；零新增 op / 零新增动作

**验证命令**:
```bash
npm --prefix packages/web-cli-plugin test
```

**门禁**: `driver-quadruple`（12↔12）/ `recommendation-sources`（规则表恰 4）/ `next-registry`

---

### TASK-ADN-111: `ai-drive.ts` `driverBlockedLine` 单源（与 `driverSuppressedLine` 同构）

| 属性 | 值 |
|------|-----|
| **复杂度** | S |
| **前置依赖** | TASK-ADN-108 |
| **执行波次** | 2（W02） |
| **类型** | implementation |
| **对应 FR** | FR-ADN-013 / 026 |
| **对应 AC** | AC-ADN-012 |
| **对应 ADR** | ADR-ADN-006 |

**描述**: 在 `next-registry/ai-drive.ts` 紧邻 `driverSuppressedLine` 新增 `driverBlockedLine`，作为拒绝留痕单源。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/web-cli-plugin/src/ui/sidepanel/next-registry/ai-drive.ts` |

**验收标准**:
- [ ] `driverBlockedLine(driverId, timing, evidence, blocked)` **恰一处**声明，返回 `` `${driverTraceLine(driverId, timing, evidence)} | blocked=${blocked}` ``（与 `pressCandidate` 内既有拼装同形）
- [ ] `pressCandidate` 可改用本函数（**行为逐字不变**）
- [ ] 拒绝行 = `driver=ai-next | timing=idle | evidence=session.aiNext | blocked=<codes>`；codes 为原因码闭集、**零值**（零明文）
- [ ] 反证：「留痕里出现候选 label / params 值 ⇒ 必红」

**验证命令**:
```bash
npm --prefix packages/web-cli-plugin test
```

**门禁**: `ai-next-candidate`（留痕零值）/ `law8`

---

### TASK-ADN-112: `registry.ts` `chipsFor` loud 校验 + `ops.ts` `reachableOpIds` 优先 `chipsFor`

| 属性 | 值 |
|------|-----|
| **复杂度** | S |
| **前置依赖** | TASK-ADN-110 |
| **执行波次** | 2（W02） |
| **类型** | implementation |
| **对应 FR** | FR-ADN-014 / 015 |
| **对应 AC** | AC-ADN-002 / 029 |
| **对应 ADR** | ADR-ADN-004 |

**描述**: 给 provider 契约的加法扩展补 loud 校验，并让 `reachableOpIds` 优先读动态 `chipsFor(ctx)`。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/web-cli-plugin/src/ui/sidepanel/next-registry/registry.ts` |
| MODIFY | `packages/web-cli-plugin/src/ui/sidepanel/next-registry/ops.ts` |

**验收标准**:
- [ ] `validateNextProvider` 对 `chipsFor` 存在时新增 loud 校验（**加法**；`chips` 静态非空判据 `empty-chips` **不删**）
- [ ] `reachableOpIds` 优先 `chipsFor(ctx)`（真实可达面）；无 `chipsFor` ⇒ 逐字沿用 `chips`（既有 11 行零改）
- [ ] `op.help` 派生面不回归

**验证命令**:
```bash
npm --prefix packages/web-cli-plugin test
```

**门禁**: `next-registry` / `next-obligation-table`

---

### TASK-ADN-113: `recommend.ts` `session.aiNext?` 透传 + `chipsFor` 解析 + card `label` 覆盖

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-ADN-108 / TASK-ADN-110 |
| **执行波次** | 2（W02） |
| **类型** | implementation |
| **对应 FR** | FR-ADN-015 / 018 / 098 |
| **对应 AC** | AC-ADN-002 / 029 |
| **对应 ADR** | ADR-ADN-004 |

**描述**: 在 `recommend.ts` 登记注入槽、透传 `session.aiNext`、用 `chipsFor` 解析 chip 集合并按需覆盖 card label（**本叶不做** R6 扩展 / 替换口径终态 —— 那属叶2）。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/web-cli-plugin/src/ui/sidepanel/recommend.ts` |

**验收标准**:
- [ ] `RecommendInput.session.aiNext?` 加法字段；`recommendCtx(input)` 透传（**唯一** ctx 构造点，零第二处）
- [ ] `candidateRules`：`const opIds = p.chipsFor ? p.chipsFor(ctx) : p.chips;` + `if (opIds.length === 0) continue;`
- [ ] card `label` 覆盖（缺席 ⇒ 逐字沿用 `NEXTSTEP_LABELS[rule]`）
- [ ] `recommendNextStep` 仍 **pure**：真值 7 源 / 模块白名单 5 / 源码零 `fetch(`·`chrome.`·时钟；**白名单不新增条目**（`X-ADN-9` 未发生取代）
- [ ] 既有 11 行 provider（无 `chipsFor`）⇒ 逐字同前

**验证命令**:
```bash
npm --prefix packages/web-cli-plugin run test:recommendation
npm --prefix packages/web-cli-plugin test
```

**门禁**: `recommendation-sources`（白名单恒 5 / ④ 零新 LLM）

---

### TASK-ADN-114: `sidepanel.ts` `done` 分支消费（事件作用域单槽 + 留痕）+ `testing.aiNext` 测试缝

| 属性 | 值 |
|------|-----|
| **复杂度** | L |
| **前置依赖** | TASK-ADN-110 / TASK-ADN-111 / TASK-ADN-113 |
| **执行波次** | 2（W02） |
| **类型** | implementation |
| **对应 FR** | FR-ADN-010 / 018 / 026 |
| **对应 AC** | AC-ADN-012 / 014 |
| **对应 ADR** | ADR-ADN-005 / ADR-ADN-006 |

**描述**: 面板在 `done` 分支把 `msg.aiNext` 存为**模块级单槽** `pendingAiNext`，紧接的 `maybeRecommend('idle')` 消费后**清空**；写 `blocked` 可读留痕一行；加测试缝。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/web-cli-plugin/src/ui/sidepanel/sidepanel.ts` |

**验收标准**:
- [ ] 事件作用域：`pendingAiNext` **只喂一次**求值；`maybeRecommend` 构造 `input` 后**清空**该槽（与 v5.5 `armed` / `lastAutoDrivenKey` 同构）
- [ ] 反证：「把 `pendingAiNext` 做成常驻 ⇒ 后续 `stale`/`pick` 触发复现旧候选 ⇒ 必红」（防「两张皮」以新形态回归）
- [ ] `blocked` 留痕：写**恰一行**（codes 去重 join），**零值 / 零明文**（`driverBlockedLine` 单源）
- [ ] `msg.aiNext` 缺席 ⇒ 面板行为与现状**逐字一致**（`N-ADN-029`）
- [ ] `pending` 硬门不退化（在飞不产卡）；`testing.aiNext(...)` 为**测试缝**（`window.__v3.testing`），**非生产第二入口**（`N-ADN-028`）

**验证命令**:
```bash
npm --prefix packages/web-cli-plugin test
npm --prefix packages/web-cli-plugin run test:l0
```

**门禁**: `ai-next-candidate` / `op-wiring` / `test:l0`

---

### TASK-ADN-115: `test/ai-next-candidate.test.ts` 骨架 **AI-N-1~4 / 11**（解析 / 顺序 / ref / param / `ask` 一致性）

| 属性 | 值 |
|------|-----|
| **复杂度** | L |
| **前置依赖** | TASK-ADN-103 / TASK-ADN-105 / TASK-ADN-106 / TASK-ADN-107 |
| **执行波次** | 2（W02） |
| **类型** | gate |
| **对应 FR** | FR-ADN-020 / 024 / 025 / 027 / 028 |
| **对应 AC** | AC-ADN-003 / 004 |
| **对应 ADR** | ADR-ADN-007 / ADR-ADN-009 |

**描述**: 新建受审 node 门禁文件，落地解析 / 顺序 / ref / param / `ask` 一致性五组判据（每条含 `expectFailPattern`）。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| NEW | `packages/web-cli-plugin/test/ai-next-candidate.test.ts` |

**验收标准**:
- [ ] **AI-N-1** 解析：尾随 `next` 块 + 严格 JSON 数组；取**最后一条** assistant 文本的**最后一块**；无块 / 非数组 ⇒ `[]`（反证：注入中间轮块 / 非数组 ⇒ 判据非恒真）
- [ ] **AI-N-2** 顺序即优先级：①→②→③→④ + 真值表（auto/confirm/gesture/未知）；反证：未知 op + 越界 ref ⇒ **只**报 `unknown-op`；顺序交换 ⇒ 必红
- [ ] **AI-N-3** `ref` 语义：`refId` / `ref_<n>` 命中本回合快照 ∧ `valid`；缺席 pass（反证：越界 / 失效 / **裸数字 ⇒ 必红**）
- [ ] **AI-N-4** `params` 与 `AskSpec` 相容真值表（反证：`ask===undefined` 的 op 带 `params` ⇒ `blocked=param`；数组类型 ⇒ 必红）
- [ ] **AI-N-11** `ask` descriptor 与 `ops.ts#IMPL` 的 `params===null` **逐行一致**（反证：表漂移 ⇒ 必红）
- [ ] 真源切片读生产模块（不读测试自建常量）；每条含 `expectFailPattern`

**验证命令**:
```bash
npm --prefix packages/web-cli-plugin test
```

**门禁**: `ai-next-candidate`（新）

---

### TASK-ADN-116: `ai-next-candidate` **AI-N-5 / 8 / 9 / 10**（分层 / 零新增载体 / 12↔12 / 零第二阈值）

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-ADN-109 / TASK-ADN-110 / TASK-ADN-113 / TASK-ADN-114 |
| **执行波次** | 2（W02） |
| **类型** | gate |
| **对应 FR** | FR-ADN-030~035 / 011 / 096 / 017 |
| **对应 AC** | AC-ADN-005 / 010 / 028 / 029 |
| **对应 ADR** | ADR-ADN-003 / ADR-ADN-006 / ADR-ADN-007 |

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/web-cli-plugin/test/ai-next-candidate.test.ts` |

**验收标准**:
- [ ] **AI-N-5** 判定分层：`confirm` ⇒ `admit=true ∧ press=blocked:tier`；`gesture` ⇒ `admit=false`（反证：把 confirm 也拒 / 把 gesture 放行 ⇒ 各必红）
- [ ] **AI-N-8** 零新增载体：`KIND_SET` 40 / 12 kind / 零宿主 / `ACT_TO_OP` 6（反证：注入第 41 / 第 13 / 第 7 行 ⇒ 必红）
- [ ] **AI-N-9** `DRIVER_DECLS_SRC` **12↔12** 双向包含 + `evidence=session.aiNext` 登记 + `chipsFor` 权威 + 静态 `chips` 非空（反证：缺声明 / 多声明 / evidence 漂移 ⇒ 必红）
- [ ] **AI-N-10** 零新 LLM / 零第二阈值：`background/ai-next.ts` 纯（无 DOM/时钟/IO/`chrome`）+ `recommend.ts` 仍零 `fetch(`·`chrome.`·时钟 + 无第二份六常量（反证：注入 `fetch(` / 第二份阈值 ⇒ 必红）

**验证命令**:
```bash
npm --prefix packages/web-cli-plugin test
```

**门禁**: `ai-next-candidate` / `driver-quadruple` / `driver-timings`

---

### TASK-ADN-117: `ai-next-candidate` **AI-N-6 / 7** 五类注入反证 + 真源切片 + 三段控制

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-ADN-115 / TASK-ADN-116 |
| **执行波次** | 2（W02） |
| **类型** | gate |
| **对应 FR** | FR-ADN-029 / 082 / 085 / 111 |
| **对应 AC** | AC-ADN-019 |
| **对应 ADR** | ADR-ADN-007 |

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/web-cli-plugin/test/ai-next-candidate.test.ts` |

**验收标准**:
- [ ] **AI-N-6** 五类注入反证**必须实跑**：① AI 产 `gesture` op（`op.authorize` / `op.perm.request`）⇒ 必拦（`blocked=tier`，连提案都不进 chips）；② 幻觉 op（`op.ghost`）⇒ `blocked=unknown-op`；③ 越界 ref / 失效 ref ⇒ `blocked=ref`；④ `params` 越界 ⇒ `blocked=param`；⑤ label 触零明文 caliber ⇒ `blocked=label`；补充反证「AI 代答 `confirm` consent ⇒ 必红」
- [ ] 每条：注入 ⇒ FAIL（声明 `expectFailPattern`）⇒ **逐字节还原**（`sha256` 前后相同）⇒ PASS
- [ ] **AI-N-7** 真源切片（读生产 `op-table` / 回合 refs 快照）+ 三段控制 `ok` / `violated` / `n/a` 逐态可达（`n/a` **不冒充** `ok`，判据非恒真）
- [ ] 全部判据**计数只增**

**验证命令**:
```bash
npm --prefix packages/web-cli-plugin test
```

**门禁**: `ai-next-candidate`（三段控制）

---

### TASK-ADN-118: `recommendation-sources` 等价重锚（白名单恒 5 / 规则表恰 4 / ④ 零新 LLM）

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-ADN-113 |
| **执行波次** | 3（W03） |
| **类型** | gate |
| **对应 FR** | FR-ADN-052 / 098 / 110 |
| **对应 AC** | AC-ADN-007 / 024 / 029 |
| **对应 ADR** | ADR-ADN-004 / ADR-ADN-009 |

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/web-cli-plugin/test/recommendation-sources.test.ts` |

**验收标准**:
- [ ] 真值白名单 **7** / 模块白名单 **恒 5**（**不新增条目**）/ `NEXTSTEP_PRIORITY` **恰 4** / 单卡判据 **全部保持**；④ 零新 LLM（`:238`）保持绿
- [ ] **新增**断言：`session.aiNext` 注入槽 ∈ 既有 `session` 源 ∧ `recommend.ts` 导入集合仍 ⊆ 白名单 5
- [ ] 断言**零删除**；计数只增

**验证命令**:
```bash
npm --prefix packages/web-cli-plugin test
```

**门禁**: `recommendation-sources`

---

### TASK-ADN-119: `driver-timings` **DT-6** `session.aiNext`（恰 5 保持）

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-ADN-102 / TASK-ADN-113 |
| **执行波次** | 3（W03） |
| **类型** | gate |
| **对应 FR** | FR-ADN-010 / 013 |
| **对应 AC** | AC-ADN-002 / 012 |
| **对应 ADR** | ADR-ADN-009 |

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/web-cli-plugin/test/driver-timings.test.ts` |

**验收标准**:
- [ ] DT-2 时机源 **恰 5** 保持；DT-3 旧 4 逐字；DT-4 调用点恰 8；DT-5 入口恰 1；**全部不动**
- [ ] **新增** DT-6 显式断言 `session.aiNext` 经 `session` 前缀登记（`CTX_FIELD_SERVICE` 零新增登记行 ⇒ 直接绿）
- [ ] 断言零删除；计数只增

**验证命令**:
```bash
npm --prefix packages/web-cli-plugin test
```

**门禁**: `driver-timings`

---

### TASK-ADN-120: `driver-quadruple` **DQ-1 / DQ-3**（12↔12 / evidence 同源）

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-ADN-110 |
| **执行波次** | 3（W03） |
| **类型** | gate |
| **对应 FR** | FR-ADN-096 |
| **对应 AC** | AC-ADN-010 |
| **对应 ADR** | ADR-ADN-004 / ADR-ADN-009 |

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/web-cli-plugin/test/driver-quadruple.test.ts` |

**验收标准**:
- [ ] DQ-1 双向包含 `DRIVER_DECLS_SRC ↔ builtinProviders()` 随 count **12↔12**
- [ ] DQ-2 `ai-next` 静态 `chips=['op.turn'] ⊆ OP_IDS`；DQ-3 收纳 `session.aiNext`（when-scope 源文本抽取，与 `evidence` 同源）
- [ ] 反证：缺声明 / 多声明 / `evidence` 漂移 ⇒ 必红
- [ ] 断言零删除；计数只增

**验证命令**:
```bash
npm --prefix packages/web-cli-plugin test
```

**门禁**: `driver-quadruple`

---

### TASK-ADN-121: `op-wiring` 计数全保持（`requestTurn(` 恰 1 / `maybeRecommend` 1·8 / `nextAfterSettle` 1·10）

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-ADN-114 |
| **执行波次** | 3（W03） |
| **类型** | gate |
| **对应 FR** | FR-ADN-064 / 110 |
| **对应 AC** | AC-ADN-011 / 024 |
| **对应 ADR** | ADR-ADN-009 |

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/web-cli-plugin/test/op-wiring.test.ts` |

**验收标准**:
- [ ] `requestTurn(` **恰 1**（唯一生产输入提交点）；`maybeRecommend` 1 定义·8 调用点；`nextAfterSettle` 1 定义·10 调用点；自动按下点**恰 1**；`dispatchChipAction` 恰 1（`ai-drive`）——**全部数值不动**（`X-ADN-6` = 未发生取代）
- [ ] AI 候选经**既有** `done → maybeRecommend('idle')` 挂点（零新增挂点）
- [ ] 反证保留：AI 直连 `requestTurn` ⇒ 必红；计数 ≥ 基线

**验证命令**:
```bash
npm --prefix packages/web-cli-plugin test
```

**门禁**: `op-wiring`

---

### TASK-ADN-122: `next-registry` NR-10（11→12）+ `op-three-tier` 加严（接受层读点 = `tierOf`）

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-ADN-102 / TASK-ADN-109 / TASK-ADN-110 |
| **执行波次** | 3（W03） |
| **类型** | gate |
| **对应 FR** | FR-ADN-021 / 033 / 096 |
| **对应 AC** | AC-ADN-005 / 010 |
| **对应 ADR** | ADR-ADN-003 / ADR-ADN-009 |

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/web-cli-plugin/test/next-registry.test.ts` |
| MODIFY | `packages/web-cli-plugin/test/op-three-tier.test.ts` |

**验收标准**:
- [ ] NR-10 反证「还原 PASS」的字面量 `DRIVER_DECLS_SRC.length === 11` → **12**（间接面）；NR-0「顶层字段集 == 7 源白名单」**保持绿**
- [ ] `op-three-tier` **加严**：**新增**断言「接受层档位读取点 = `tierOf`」+ `tierOfId('op.authorize')==='gesture' ∧ admitCandidate 拒`
- [ ] 既有 `tierOf` 派生式三档 + `OP_TIER_TABLE` 物化 + 特权恒 `gesture` 判据**不删**；零第二档位表反证

**验证命令**:
```bash
npm --prefix packages/web-cli-plugin test
```

**门禁**: `next-registry` / `op-three-tier`

---

### TASK-ADN-123: `gate-integrity` 受审下界只增 `ai-next-candidate`

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-ADN-115 / TASK-ADN-117 |
| **执行波次** | 3（W03） |
| **类型** | gate |
| **对应 FR** | FR-ADN-115 |
| **对应 AC** | AC-ADN-022 |
| **对应 ADR** | ADR-ADN-009 |

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/web-cli-plugin/test/gate-integrity.test.ts` |

**验收标准**:
- [ ] 新增 `V_ADN_NODE_GATE_FILES = ['test/ai-next-candidate.test.ts']`（承 `IAN1_/IAN2_/V55F2_` 先例，**只增**）
- [ ] `EXPECTED_AUDITED_FILES` 下界 **+1**（叶1 = +1）；按**断言语义 + 语义增量**重锚，**不照抄陈旧字面**（`COR-ADN-3`；实测现 40 项）
- [ ] 既有下界（`V5_*` / `V551_*` / `V552_*` / `V553_*` / `V55F_*` / `IAN1_` / `IAN2_`）**逐字保留**；`CHROMIUM_GATES === 9` 逐字不动
- [ ] 计数只增

**验证命令**:
```bash
npm --prefix packages/web-cli-plugin run test:gate-integrity
```

**门禁**: `gate-integrity`

---

### TASK-ADN-124: S0''' 主线 / 支线 B / 支线 D node 面（+ 支线 C 兜底）

| 属性 | 值 |
|------|-----|
| **复杂度** | L |
| **前置依赖** | TASK-ADN-114 / TASK-ADN-116 / TASK-ADN-117 |
| **执行波次** | 3（W03） |
| **类型** | gate |
| **对应 FR** | FR-ADN-080 / 081 / 082 / 085 |
| **对应 AC** | AC-ADN-001 |
| **对应 ADR** | ADR-ADN-007 |

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/web-cli-plugin/test/s0-self-driven-chain.test.ts` |
| MODIFY | `packages/web-cli-plugin/test/ai-next-candidate.test.ts` |

**验收标准**:
- [ ] S0'''-1~10 node 面逐环节可判（结构可判 / `opId ∈ OP_IDS ∧ tier ≠ gesture` / 四类各 `admit=false` + 可读行 / 替换 + ≤3 + 单卡 / 终端恒在 / 未配纯确定性 / `KIND_SET` 40 + 12 kind + 零宿主 + `ACT_TO_OP` 6 / `admit=true ∧ press=blocked:tier` / 提案不耗预算 / 留痕三要素 + 零明文）
- [ ] **支线 A 主线**：合法被采纳（注入 chips + 替换陈旧候选 + ≤3 + 单卡 + 终端恒最末）
- [ ] **支线 B 被拦**：非法候选逐类 `blocked=<code>` + 可读留痕 + **不渲染为 chip** + 注册表兜底 + 终端
- [ ] **支线 D 未配置**：零候选产出（**零网络**）+ 确定性 + 终端（现状逐字）
- [ ] **支线 C 未产出**：零 `aiNext` ⇒ 确定性注册表产卡（含 floor）
- [ ] 样本单源 = `test/ui/fixtures/s0-chain.mjs`（扩展，不新增样本文件）；真源切片（读生产模块，**禁假 provider / 桩**）；反证「未校验候选进 chips ⇒ 必红」

**验证命令**:
```bash
npm --prefix packages/web-cli-plugin test
```

**门禁**: `s0-self-driven-chain` / `ai-next-candidate`

---

### TASK-ADN-125: Chromium 断言增量（`s0-self-driven.mjs` + `law8-plaintext.mjs`）

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-ADN-124 |
| **执行波次** | 3（W03） |
| **类型** | gate |
| **对应 FR** | FR-ADN-080 / 083 / 084 |
| **对应 AC** | AC-ADN-001 / 013 |
| **对应 ADR** | ADR-ADN-007 |

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/web-cli-plugin/test/ui/s0-self-driven.mjs` |
| MODIFY | `packages/web-cli-plugin/test/ui/law8-plaintext.mjs` |

**验收标准**:
- [ ] `s0-self-driven.mjs`：S0''' 四支线断言（AI 合法 ⇒ chips 替换陈旧候选；非法 ⇒ 可读 `blocked=` 行；未产出 / 未配 ⇒ 确定性 + 终端恒在）；驱动经新增 **`window.__v3.testing.aiNext(...)` 测试缝**注入已校验候选（**测试缝，非生产入口**）
- [ ] `law8-plaintext.mjs`：AI 候选 label / 留痕行的**零明文**面（**只加断言**，零降级）
- [ ] **只加断言不加文件** ⇒ `CHROMIUM_GATES === 9` 不动
- [ ] 人工面 M1~M5 逐项 `⏳ 未执行`（不冒充 PASS）

**验证命令**:
```bash
npm --prefix packages/web-cli-plugin run test:s0-self-driven
npm --prefix packages/web-cli-plugin run test:law8
```

**门禁**: `s0-self-driven` / `law8`

---

### TASK-ADN-126: 红线巡检 + 体积叶1 重登记（五要素 + 三值 + 逐模块 + EC-ADN-016 二态）

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-ADN-123 / TASK-ADN-124 / TASK-ADN-125 |
| **执行波次** | 3（W03） |
| **类型** | doc |
| **对应 FR** | FR-ADN-003 / 112 / 120 / 122 / 124 |
| **对应 AC** | AC-ADN-025 / 026 |
| **对应 ADR** | ADR-ADN-008 / ADR-ADN-009 / ADR-ADN-010 |

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/web-cli-plugin/test/insight-no-escalation.test.ts` |
| MODIFY | `packages/web-cli-plugin/test/size-baseline.ts` |
| MODIFY | `packages/web-cli-plugin/test/size-growth-evidence.test.ts` |
| MODIFY | `packages/web-cli-plugin/test/size-ruling-vol3.test.ts` |

**验收标准**:
- [ ] **红线巡检**：`content.js` **177,076 B** / `52a82620…`；`pick-layer.js` **34,358 B** / `77796bab…`（零容差）；`packages/web-cli-base/**` 零 diff；`manifest.json` 零 diff；判定链 `zeroDiffFiles` 哈希 pin 绿
- [ ] `KIND_SET` **40** 逐字 / 12 kind / 零宿主 / `ACT_TO_OP` 恰 6 / `NEXTSTEP_PRIORITY` 恰 4；`DRIVER_TIMINGS` 恰 5
- [ ] 特权 op 恒 `gesture` + SW 永不 `.request(`；法八**四面零明文**零降级（`test:law8 ≥60`）
- [ ] **体积叶1 重登记**：A 列叶1 **正增量**（预算 **+0.8~2.0 KB**）实测登记 + **五要素**（前后值 / 日期 / 来源 / 理由 / 历史保留）+ **三值**（`newBaselineBytes` / `absoluteCeilingBytes` / 生效上限同源前移）+ 逐模块行 `adn1Rows`（Σ 逐模块 Δ + 未归因 == 登记增量）
- [ ] **B 列 +1.5~3.5 KB 不计入 sidepanel 账本**（如实标注列别；`R-ADN-908` 反证：搬列规避 ⇒ 必红）
- [ ] **EC-ADN-016 二态显式**：越生效上限 `628,872` ⇒ 重登记基线；越档位 `614,400` ⇒ 显式升档 + 作者一行；`authorConfirmation = pending-author-line`（**不得伪称已确认**）
- [ ] `test:size-ruling-vol3 ≥13`

**验证命令**:
```bash
npm --prefix packages/web-cli-plugin run typecheck && npm --prefix packages/web-cli-plugin run build
npm --prefix packages/web-cli-plugin run test:size-ruling-vol3
npm --prefix packages/web-cli-plugin test
```

**门禁**: `test:size-ruling-vol3` / `insight-no-escalation`

---

### TASK-ADN-127: X-ADN-1/X-7 台账骨架 + `no-supersession` 骨架 + 门禁对账骨架（本叶收口）

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-ADN-118~126 |
| **执行波次** | 3（W03） |
| **类型** | doc |
| **对应 FR** | FR-ADN-090 / 096 / 101 / 112 |
| **对应 AC** | AC-ADN-010 / 020 |
| **对应 ADR** | ADR-ADN-009 / ADR-ADN-010 |

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/web-cli-plugin/docs/v4-supersession-ledger.json` |
| MODIFY | `packages/web-cli-plugin/test/supersession-ledger.test.ts` |

**验收标准**:
- [ ] 新增台账段（承 `xIianLedgerFull` / `xSgoLedger` 命名先例，如 `xAdnLedger`）：**X-ADN-1**（产出权转移 old→new）+ **X-ADN-7**（12↔12）标 `superseded`；**X-ADN-2/3/4/5/6/9** 标 `no-supersession` + **理由非空**
- [ ] 每行字段 `id` / `status` / `old`（逐字）/ `new` / `reason` / `date` / `landing` / `counterCheck`（可定位判据）；**老条目逐字保留**（文件只追加）
- [ ] 本叶**门禁对账骨架**：新增 1 + 升级 6 + 间接面 old→new 骨架（终态由叶2）
- [ ] 断言零删除零降级、计数只增；`test:supersession ≥49`
- [ ] 本叶全门禁**严格串行**全绿（`test` / `test:ui` / `test:binding` 绝不并发）；`KL-N-10` 隔离复跑 ≥2、仍红如实记录不阻塞

**验证命令**:
```bash
npm --prefix packages/web-cli-plugin run test:supersession
npm --prefix packages/web-cli-plugin test
```

**门禁**: `test:supersession`

---

## 3. 任务汇总

| 统计项 | 数值 |
|--------|:--:|
| 总任务数 | **27** |
| S 级 (简单) | 6 |
| M 级 (中等) | 17 |
| L 级 (复杂) | 4 |
| 执行波次 | 3（W01 / W02 / W03） |
| spikeGate | 2（SG-ADN-01 / SG-ADN-02） |
| 新增门禁 | 1（`ai-next-candidate`） |
| 升级门禁 | 6（+ 间接面 3） |

**类型分布**：implementation × 12 / gate × 11 / spike × 2 / doc × 2。

**模板偏差登记**：模板 §5.4 / §8 建议 5~15 任务 ⇒ 本叶 **27**；理由 ① 本叶 `plan.md §7` 列交付物 9 项、执行序 3 波，逐项拆到「**每任务独立可验证**」需 ~27；② 与 F-35 叶1（27）/ F-34 叶1（29）/ v5.5-1（25）同量级显式登记；③ 27 = 可原子执行单元（≈1 文件内 1 项可验证改动 + 其判据），**不是** LLM 调用数。

---

## 4. 执行策略

| 波次 | 任务 | 策略 |
|:--:|------|------|
| 1（W01） | `101`–`107` | `101` 先验闸门最前；`102 ∥ 103`（文件不相交）→ `104 ∥ 105` → `106` → `107`（依赖 103/106） |
| 2（W02） | `108`–`117` | `108` 先验闸门最前；`109` → `110`；`111 ∥ 112`（文件不相交）；`113`（依赖 110）→ `114`（依赖 110/111/113）；`115`（骨架，依赖 103/105/106/107）→ `116` → `117` |
| 3（W03） | `118`–`127` | `118 ∥ 119 ∥ 120`（三门禁文件不相交）；`121`（依赖 114）；`122`（依赖 102/109/110）；`123`（依赖 115/117）；`124` → `125`（样本单源）；`126`（依赖 123/124/125）；`127` 末位（依赖 118~126，收口对账骨架） |

**波内提交区间（commit interval）**：A = W01（载体与校验链）/ B = W02（分层与注入）/ C = W03（门禁与验收，**收口轮**）。

**每波收口门禁绿**：W01 收口（`typecheck` + `npm test` + `ai-next-candidate` 骨架可编译）；W02 收口（`ai-next-candidate` AI-N-1~11 全绿）；W03 收口（升级 6 + 间接面 + S0''' node + Chromium 增量 + 体积重登记 + 台账骨架）。

---

## 5. 验收门禁清单（本叶）

- `typecheck` · `build` · `npm test ≥1443` · **`ai-next-candidate`（新）** · `recommendation-sources`（白名单恒 5 / 规则表恰 4 / ④ 保持）· `driver-timings`（恰 5 / DT-6）· `driver-quadruple`（12↔12）· `op-wiring`（`requestTurn(` **恰 1** 不动）· `op-three-tier`（加严）· `next-registry`（NR-10 11→12）· `gate-integrity ≥25`（`CHROMIUM_GATES === 9`）· `r8-open-next-entry`（保留）· `free-input-next ≥22` · `sw-op-mirror` · `next-dispatch-diff0` · `insight-no-escalation`（base 零 diff）· `test:law8 ≥60`（零降级）· `s0-self-driven ≥82` · `test:supersession ≥49`（骨架）· `size-*` + `test:size-ruling-vol3 ≥13` · `content.test.ts`

**红线巡检（本叶职责）**：三冻结面（`content.js` 177,076 B / `pick-layer.js` 34,358 B / `packages/web-cli-base` 零 diff）· `KIND_SET` 40 / 12 kind / 零宿主 · 法八零明文 · 特权 op 恒 `gesture` / SW 永不 `.request(` · `FR-CHAT-060` 零新 LLM 不破 · `NEXTSTEP_PRIORITY` 恰 4 / `ACT_TO_OP` 恰 6 / `DRIVER_TIMINGS` 恰 5 · `requestTurn(` 恰 1 · `pending` 硬门。

**停机规则（本叶）**：见父 `../tasks.md §8`（12 条）；本叶重点 = 第 1 / 2 / 3 / 4 / 6 / 7 / 10 / 11 条。

**二维时序（本叶）**：build（W01→W02→W03）→ review（判据真空 + 单源审计 + 注入反证完整性，见父 `§9.2`）→ validate（S0''' 主/B/D node 实跑 + 门禁守恒 + 体积正增量 + 漂移检测，见父 `§9.3`）。

---

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建（ADN-1 叶任务：**27 任务 / 3 波**（`TASK-ADN-101~127`；S×6 / M×17 / L×4）+ 2 个 spikeGate（`SG-ADN-01/02`）+ 1 个新 node 门禁 `ai-next-candidate`（AI-N-1~11）+ S0''' 主/B/D node 面 + 升级 6 等价重锚 + `gate-integrity` 下界 +1 + 体积叶1 正增量重登记（+0.8~2.0 KB / B 列 +1.5~3.5 KB 不计账）+ X-ADN-1/X-7 骨架 + 门禁对账骨架。**本轮只做 tasks**：零 `src`/`test`/`dist`/`docs`/`design`/ROADMAP 改动；未跑门禁 / 构建 / Chromium；未调用任何受管 Provider（routing.v1 = `local_or_compute → none`） | 2026-09-26 | SDDU Tasks Agent |
