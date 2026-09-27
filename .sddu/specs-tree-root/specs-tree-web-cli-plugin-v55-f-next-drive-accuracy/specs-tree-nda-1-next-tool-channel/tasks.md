# 任务分解：specs-tree-nda-1-next-tool-channel（NDA-1 `next` 工具产出通道 + 无条件触发 + 5 道校验链接入：机制核心；叶1 = 首叶 / 底座叶）

> **文档定位**: SDDU 任务清单（**叶级可执行**）— 本叶 20 个原子任务 / 3 波 / 1 个新 spikeGate 前置闸门（`SG-NDA-01`）+ 1 个叶内闸门（`SG-NDA-02`）；作为 build 阶段的输入（父总览见 `../tasks.md`）
> **前置依赖**: 本叶 `spec.md` v1.0（承载父 FR ≈60 条切片；交付 11 项；执行序 7 步）+ `plan.md` v1.0（叶级：机制换轨落地）+ `ADR-NDA-101/102`（叶新增）+ 父 `../spec.md` v1.0 + `../plan.md` v1.0 + `ADR-NDA-001/002/003/004/008/009` + F-36 两叶 `validated` 产物（`ai-next.ts` 5 道链 / `admitCandidate` / `ai-next` provider / `ai-next-candidate` 门禁）+ 基座 `packages/web-cli-base/src/{llm.ts,runner.ts}`（**只读复用**）
> **创建人**: SDDU Tasks Agent
> **创建时间**: 2026-09-27
> **版本**: v1.0
> **更新人**: SDDU Tasks Agent
> **更新时间**: 2026-09-27
> **更新说明**: 初始创建（叶1 tasks：**20 任务 / 3 波**（`TASK-NDA-101~120`；S×7 / M×9 / L×4）+ 2 个 spikeGate（`SG-NDA-01` 捕获 + `rawArguments` 解析 + 短路 dispatch + 不上流 / `SG-NDA-02` `ai-led` 规则位等价重锚 + 密度可判）+ 1 个改写门禁（`ai-next-candidate`：AI-N-1 换机制 + AI-N-12~14）+ 升级 2（`parity` / `recommendation-sources` ③）+ 保留面零改复核 + S0'''' 主线 A / 支线 B·D node 面 + 体积叶1 重登记 + `xNdaLedger` 骨架）。**叶间硬串行**：叶2 以本叶 `validated` 为前置。**本轮只做 tasks**：`.sddu` 外零触碰；未跑门禁 / 构建 / Chromium；未调用任何受管 Provider（routing.v1 = `local_or_compute → none`）

---

## 0. 叶内结构登记

| 项 | 内容 |
|---|---|
| 叶职责 | **机制换轨**：`next` 工具（function calling）注册 + `hooks.intercept` 捕获（合成 `ToolResult` 短路 dispatch）+ 5 道校验链保留接入 + 判定分层保持 + 触发无条件 + `ai-led` 规则位等价重锚 + 围栏块通道替换 + `parity` 条目 + 门禁改写 + S0'''' 主/B/D node 面 + B 列归因 |
| 不做（=`LNG-NDA-1-*`） | 未配置确定性引导 / 自由输入分相 / 提醒补一次 / 异常判定闭集 / 系统兜底推荐 / 首开边界 / 体积终态 Σ / 等价重锚终态 / 保护段决策 / X-NDA 台账终态 —— **全属叶2** |
| 波次 | `W1` 工具通道与捕获（7）→ `W2` 触发与门禁改写（7）→ `W3` 验收与登记（6） |
| 关键路径 | `101 → 102 → 103 → 105 → 107 → 108 → 109 → 110 → 111 → 112 → 115 → 116 → 117 → 118 → 120` |
| 可并行组 | `P1`：`102 ∥ 106`（`tools/next-tool.ts` 与 `ref-context.ts` 不相交）；`P2`：`103 ∥ 104`（`host.ts` 与 `waivers.json` 不相交）；`P3`：`109 ∥ 110`（`recommend.ts` 与 `providers.ts` 不相交）；`P4`：`113 ∥ 114`（门禁文件与源 / 复核面相异） |
| 体积责任 | **B 列主体**（工具 def / 捕获 / 校验 / 装配）+ **A 列薄接线**（规则表 + provider `rule` 字面量：+0.1~0.5 KB）；叶1 收口**即时**重登记（不等两叶合计） |
| 提交区间（建议） | `A` = W1（B 列先行，A 列零增量）；`B` = W2（A 列唯一主体增长点 ⇒ 落完即实测）；`C` = W3（收口轮） |
| 门禁责任 | **改写 1**（`ai-next-candidate`；新增 AI-N-12~14）+ **升级 2**（`parity` 新条目 / `recommendation-sources` ③ 恰 4→5）+ **入受审下界 1**（`gate-integrity` 只增）+ **保留面零改**（`driver-timings` / `driver-quadruple` 12↔12 / `op-wiring` / `op-three-tier` / `sw-op-mirror` / `next-dispatch-diff0` / `insight-no-escalation` / `ref-context-in-turn` / `cards/nextstep`） |

---

## 1. 依赖拓扑总览

```
Wave 1 ─── 工具通道与捕获（B 列先行；A 列零增量）
  TASK-NDA-101 [M] spike  SG-NDA-01 捕获 + rawArguments 解析 + 短路 dispatch + 不上流（先验闸门，最前）
  TASK-NDA-102 [S] impl   src/tools/next-tool.ts（NEW）
  TASK-NDA-103 [S] impl   host.ts 注册（⇒ deriveTools()）
  TASK-NDA-104 [S] impl   parity waivers.json#pluginExtras['next']
  TASK-NDA-106 [S] impl   ref-context.ts 删 NEXT_CONTRACT_GUIDANCE
  TASK-NDA-105 [L] impl   ai-next.ts 解析入口 + 删围栏块 + validateAiNext 改签名（依赖 102）
  TASK-NDA-107 [L] impl   service-worker.ts intercept + turnState + events 过滤 + 装配（依赖 105）

Wave 2 ─── 触发与门禁改写（A 列唯一主体增长点）
  TASK-NDA-108 [M] spike  SG-NDA-02 ai-led 规则位等价重锚 + 密度可判（先验闸门，最前）
  TASK-NDA-109 [S] impl   recommend.ts NEXTSTEP_PRIORITY 恰 5 + 标签
  TASK-NDA-110 [S] impl   providers.ts ai-next.rule='ai-led' + RULE_PROVIDER_IDS + DRIVER_DECLS_SRC 逐字
  TASK-NDA-111 [L] gate   ai-next-candidate 改写（AI-N-1 + AI-N-2~11 语义对账 + AI-N-12）
  TASK-NDA-112 [M] gate   ai-next-candidate 反证族 + AI-N-13/14 + 真源切片 + 三段控制
  TASK-NDA-113 [M] gate   recommendation-sources ③ 恰 4→5 等价重锚
  TASK-NDA-114 [M] gate   保留面零改复核（9 项）

Wave 3 ─── 验收与登记（收口轮）
  TASK-NDA-115 [L] gate   S0'''' 主线 A / 支线 B / 支线 D node 面
  TASK-NDA-116 [M] gate   s0-self-driven.mjs + 样本重锚 + law8 零明文面
  TASK-NDA-117 [S] gate   gate-integrity 受审下界只增
  TASK-NDA-118 [M] doc    体积叶1 重登记（五要素 + 三值 + nda1Rows + EC 二态）
  TASK-NDA-119 [M] doc    xNdaLedger 骨架 + 门禁对账骨架
  TASK-NDA-120 [M] doc    红线巡检 + 本叶收口对账
```

**步序纪律（`plan §8`）**：`W1` 只落 **B 列**（A 列零增量）⇒ 体积压力最迟在 `W2`（`TASK-NDA-109/110`）出现，且届时已有实测数字；`W2` 之后若 A 列实测超估 ⇒ 按 `ADR-NDA-008 §③` 走 EC 路径（**不得**搬列规避）。

---

## 2. 任务列表

### TASK-NDA-101: **SG-NDA-01** `hooks.intercept` 捕获 + `tc.rawArguments` 严格解析 + 合成 `ToolResult` 短路 dispatch + `next` 不上流 可行性探针（先验闸门）

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | 无 |
| **执行波次** | 1 |
| **对应 FR** | FR-NDA-021 / 022 / 023 / 024 / 016 / 018 |
| **对应 AC** | AC-NDA-002 / 003 |
| **对应 ADR** | ADR-NDA-001 / 002 / 101 / 102 / 009（零改基座） |
| **列别 / 类型** | B（探针不落库）/ spike |

**描述**: 在 `test/_spike/` 内构造最小探针，验证三条被闸门假设：① 基座 `hooks.intercept` 在 `dispatch` 前被调用，返回合成 `ToolResult` 即**短路**真实 `dispatch`（`runner.ts:161-168`）；② `tc.rawArguments` 保真而 `tc.args` 取不到 `candidates` 数组（`llm.ts:219-241`）；③ `events.onCommandLine` / `onToolOutput` 对 `next` 可被加法过滤（不上流）。探针产物**探毕删除**，不落版本库。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| SPIKE | `packages/web-cli-plugin/test/_spike/sg-nda-01-probe.mjs`（探毕删除，不落版本库） |

**验收标准**:
- [ ] 探针可判「`intercept` 在 dispatch 前：返回非 null ⇒ `dispatch` 零调用」；结论 ∈ {可行 / 不可行}
- [ ] 探针可判「`tc.rawArguments` 严格 `JSON.parse` ⇒ 顶层对象 + `candidates` 数组；`tc.args` 对 `candidates` 恒 undefined」
- [ ] 探针可判「解析失败 / 顶层非对象 / 缺 `candidates` ⇒ 零候选且不抛错」（不中断回合）
- [ ] 探针可判「`onCommandLine` / `onToolOutput` 对 `next` 早退 ⇒ 该回合零 `command` 变体 / 零 `tool:'next'`」
- [ ] 零改基座可预演（`git diff --stat -- packages/web-cli-base/` = 0）；零新增 kind 可预演（`KIND_SET` 40 不动）
- [ ] 五要素结论（假设 / 探针方法 / 实跑证据 / 结论 / 被闸门任务影响）写入本叶 build 记录

**验证命令**:
```bash
cd packages/web-cli-plugin && node test/_spike/sg-nda-01-probe.mjs
git diff --stat -- packages/web-cli-base/ packages/web-cli-plugin/src/content/ | tail -1   # 期望 0 变更
```

---

### TASK-NDA-102: `src/tools/next-tool.ts`（NEW）— 工具名 / schema（`enum` 派生）/ `description` 三约束 / `listed:false` / fail-closed `executor`

| 属性 | 值 |
|------|-----|
| **复杂度** | S |
| **前置依赖** | TASK-NDA-101 |
| **执行波次** | 1 |
| **对应 FR** | FR-NDA-010 / 011 / 012 / 013 / 014 |
| **对应 AC** | AC-NDA-002 |
| **对应 ADR** | ADR-NDA-001（§①~④） |
| **列别 / 类型** | B / impl |

**描述**: 单源声明 `NEXT_TOOL_NAME = 'next'` / `NEXT_TOOL_MAX_CANDIDATES = 3` / `NEXT_TOOL_SCHEMA`（`parameters` 与 `AiNextCandidate` 同构；`params: {type:'string'}` = 运行时口径 `COR-NDA-7`）/ `createNextToolEntry()`（`listed:false` + fail-closed `executor`）。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| NEW | `packages/web-cli-plugin/src/tools/next-tool.ts` |

**验收标准**:
- [ ] `NEXT_TOOL_NAME === 'next'`；`NEXT_TOOL_MAX_CANDIDATES === 3`
- [ ] `parameters` 结构 = `{type:'object', required:['candidates'], additionalProperties:false, properties:{candidates:{type:'array', minItems:0, maxItems:3, items:{type:'object', required:['opId','label'], additionalProperties:false, properties:{opId,label,ref?,params?}}}}}`；`params: {type:'string'}`
- [ ] `enum === OP_IDS.filter(id => tierOf(opDescriptor(id)) !== 'gesture')` **重算式逐项相等**（7 枚）；`gesture` op 不入 `enum`
- [ ] `description` 三约束句各在（仅回合结束调用一次 / `opId` 必须已注册 / 不执行任何页面操作）+ 空数组兜底句；`assertNoPlaintext([description])` 通过
- [ ] `listed === false`；`executor` 返回可读 fail-closed（`ok:false`，不含任何候选值 ⇒ 零明文）
- [ ] 模块零 `chrome` / 零 DOM / 零 IO / 零时钟；**不 import `recommend.ts`**（`maxItems` 与 `MAX_CHIPS_PER_CARD` 靠门禁断言相等，不跨层 import）
- [ ] 反证：把 `maxItems` 改成 4 / 手写第二份 op 清单 ⇒ 判据必红

**验证命令**:
```bash
cd packages/web-cli-plugin && npm run typecheck
cd packages/web-cli-plugin && grep -nE "chrome\.|document\.|fetch\(|Date\.now" src/tools/next-tool.ts || echo "PURE-OK"
```

---

### TASK-NDA-103: `host.ts` always-registered 段注册 `next` ⇒ `deriveTools()` 含 `next`

| 属性 | 值 |
|------|-----|
| **复杂度** | S |
| **前置依赖** | TASK-NDA-102 |
| **执行波次** | 1 |
| **对应 FR** | FR-NDA-010 / 015 |
| **对应 AC** | AC-NDA-002 |
| **对应 ADR** | ADR-NDA-001（§①） |

**描述**: 在 `host.ts` 既有 always-registered 段（`createAskUserToolEntry` 旁）新增 `router.register(createNextToolEntry())`，使 `deriveTools()` 名字集含 `next`（配置 LLM ⇒ 工具面始终含 `next` ⇒ 触发无条件）。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/web-cli-plugin/src/background/host.ts` |

**验收标准**:
- [ ] `deriveTools()` 名字集含 `'next'`（可判）
- [ ] 既有注册行（`ask-user` / `admin_*` 恰 6 / `web-cli-*`）**逐字未改**；既有工具数不变（只加 1）
- [ ] `next` **无条件下发**（已配置 ⇒ 工具面常含 `next`；未配置 ⇒ SW `:945-956` early-return ⇒ 工具面永不下发，结构性成立）
- [ ] `host.ts` 未引入 `next` 之外的任何新 import 副作用

**验证命令**:
```bash
cd packages/web-cli-plugin && npm run typecheck && npm test 2>&1 | tail -20
grep -n "createNextToolEntry" packages/web-cli-plugin/src/background/host.ts
```

---

### TASK-NDA-104: `test/parity/waivers.json#pluginExtras['next']`（位置订正 `COR-NDA-6`）

| 属性 | 值 |
|------|-----|
| **复杂度** | S |
| **前置依赖** | TASK-NDA-102 / 103 |
| **执行波次** | 1 |
| **对应 FR** | FR-NDA-020 / 117 |
| **对应 AC** | AC-NDA-016 |
| **对应 ADR** | ADR-NDA-001（代价段） |

**描述**: 新增 `pluginExtras['next'] = { reason, basis }`（两字段均非空）——`parity.test.ts:232-247` 自动机核。**位置订正**：`pluginExtras` 位于 `test/parity/waivers.json`（**不在** `baseline-catalog.json`）；`baseline-catalog.json#toolCount`（34，main 基线投影，被 `insight-archive.test.ts:698-699` 钉死）**零改**。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/web-cli-plugin/test/parity/waivers.json` |

**验收标准**:
- [ ] `pluginExtras['next'].reason` 与 `.basis` **均非空**（reason 说明「纯协议工具，无命令行面，经 `hooks.intercept` 捕获」，basis 指向 ADR-NDA-001 / `ask-user` 纯协议先例）
- [ ] 既有 `pluginExtras` 条目**逐字保留**（只追加 1 条）
- [ ] `baseline-catalog.json` **零 diff**；`toolCount` 34 不动
- [ ] `parity` 门禁绿；反证「删条目 / 空 reason ⇒ 必红」

**验证命令**:
```bash
cd packages/web-cli-plugin && npm test 2>&1 | grep -iE "parity|fail" | head -20
git diff --stat -- packages/web-cli-plugin/test/parity/baseline-catalog.json | tail -1   # 期望 0
```

---

### TASK-NDA-105: `ai-next.ts` 解析入口 + 删围栏块四符号 + `validateAiNext(candidates,facts)` 改签名（`admitCandidate` 逐字保留）

| 属性 | 值 |
|------|-----|
| **复杂度** | L |
| **前置依赖** | TASK-NDA-101 / 102 |
| **执行波次** | 1 |
| **对应 FR** | FR-NDA-022 / 025 / 030~036 / 081 |
| **对应 AC** | AC-NDA-003 / 004 |
| **对应 ADR** | ADR-NDA-101（§①②③）/ ADR-NDA-004（§①）/ ADR-NDA-009（§② 单源） |

**描述**: 新增纯函数 `parseNextToolArguments(raw)`（五层筛法，与 F-36 `parseAiNextItems` 逐层等价）；**删除** `AI_NEXT_FENCE_INFO` / `FENCE` / `lastNextFenceBody` / `parseAiNextItems`（结构性消除影子产出）；`validateAiNext` **保留函数名、改输入面**为 `(candidates, facts)`；`admitCandidate` / `AI_NEXT_LABEL_MAX=48` / `AI_NEXT_PARAM_MAX=128` **逐字保留**。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/web-cli-plugin/src/background/ai-next.ts` |

**验收标准**:
- [ ] `parseNextToolArguments` 纯函数（零 `chrome` / DOM / 时钟 / IO）；五层筛法逐层可判（合法 / 非法 JSON / 顶层数组 / 缺 `candidates` / 项非对象）⇒ 非对象项**丢弃**、其余照常
- [ ] 解析失败口径 = **未产出**（`[]`，不抛错，**不写 `blocked`**，支线 C 而非支线 B）
- [ ] `NEXT_CONTRACT_GUIDANCE` / `AI_NEXT_FENCE_INFO` / `FENCE` / `lastNextFenceBody` / `parseAiNextItems` 在 `src/**` **零命中**（函数级删除，非「不调用」）
- [ ] `admitCandidate` 函数体**逐字未变**（切片哈希可判）；5 道链顺序即优先级（① opId 在册 → ② `tierOf` 三档(`gesture` 恒拒) → ③ ref 有效 → ④ param 在 `AskSpec` 内 → ⑤ 丢弃 + `blocked=` 留痕）
- [ ] 拒绝码闭集不变（`unknown-op` / `tier` / `ref` / `param` / `label`）；`unknown-op`/`tier` 仍从 `PressBlocked` 派生（类型单源）
- [ ] **`tc.args` 零使用**：捕获路径（`ai-next.ts` / `service-worker.ts`）出现 `tc.args` 读取候选 ⇒ 必红
- [ ] `≤3` 截断**在装配层**（`slice(0, MAX_CHIPS_PER_CARD)`），不在解析层

**验证命令**:
```bash
cd packages/web-cli-plugin && npm run typecheck
grep -rnE "NEXT_CONTRACT_GUIDANCE|AI_NEXT_FENCE_INFO|lastNextFenceBody|parseAiNextItems|AI_NEXT_FENCE" packages/web-cli-plugin/src || echo "ZERO-HIT-OK"
grep -rnE "tc\.args" packages/web-cli-plugin/src/background/ai-next.ts || echo "TC-ARGS-UNUSED-OK"
```

---

### TASK-NDA-106: `ref-context.ts` 删 `NEXT_CONTRACT_GUIDANCE` 与注入点（`REF_SCOPE_GUIDANCE` 逐字保留）

| 属性 | 值 |
|------|-----|
| **复杂度** | S |
| **前置依赖** | TASK-NDA-101 |
| **执行波次** | 1 |
| **对应 FR** | FR-NDA-041 / 080 / 081 |
| **对应 AC** | AC-NDA-010 |
| **对应 ADR** | ADR-NDA-004（§①）/ `COR-NDA-12` |

**描述**: 删除 `NEXT_CONTRACT_GUIDANCE`（`ref-context.ts:52-59`）与其注入（`:100`）；`REF_SCOPE_GUIDANCE` 与系统段工厂形态**逐字保留**（提示侧不再承载「是否产 next」）。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/web-cli-plugin/src/background/ref-context.ts` |

**验收标准**:
- [ ] `NEXT_CONTRACT_GUIDANCE` 在 `src/**` 零命中
- [ ] `REF_SCOPE_GUIDANCE` 逐字保留；无引用时 `refContextSegment([]) === ''` ⇒ system 逐字等于基座（既有行为）
- [ ] `test/ref-context-in-turn.test.ts`（RCT-3/RCT-4）**零改且全绿**（`COR-NDA-12`：该门禁只断言 `REF_SCOPE_GUIDANCE` ⇒ 本删除零门禁代价；若红 = 实现缺陷，**不改判据**）
- [ ] 触发无条件成立（提示侧）：无引用回合不再因 `valid.length === 0` 丢失产出提示（提示改由工具 `description` 承担）

**验证命令**:
```bash
cd packages/web-cli-plugin && npm test 2>&1 | grep -iE "ref-context|fail" | head
grep -rn "NEXT_CONTRACT_GUIDANCE" packages/web-cli-plugin/src || echo "ZERO-HIT-OK"
```

---

### TASK-NDA-107: `service-worker.ts` — `hooks.intercept` 接线 + `turnState`（覆盖式）+ events 过滤 + `onFinish` 装配改造

| 属性 | 值 |
|------|-----|
| **复杂度** | L |
| **前置依赖** | TASK-NDA-105 |
| **执行波次** | 1 |
| **对应 FR** | FR-NDA-021 / 023 / 024 / 025 / 026 / 028 / 017 / 018 / 019 |
| **对应 AC** | AC-NDA-003 / 012 / 013 / 017 |
| **对应 ADR** | ADR-NDA-002（§①~⑤）/ ADR-NDA-102（§①） |

**描述**: 在 `hooks` 对象**新增** `intercept`（`onToolDone` 逐字不动）；`runChat` 内新增 `turnState = { captured:false, lastCandidates: freeze([]) }`（覆盖式取最后一次）；`onCommandLine` / `onToolOutput` 对 `next` 加法早退（不上流）；`onFinish` 装配点从「围栏块解析」改为「`turnState.lastCandidates` → `validateAiNext` → `aiNext`」。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/web-cli-plugin/src/background/service-worker.ts` |

**验收标准**:
- [ ] `hooks.intercept` 存在；`tc.name === NEXT_TOOL_NAME` ⇒ 写 `turnState` + 返回合成 `ToolResult{ok:true, output: NEXT_TOOL_ACK}`（**常量字符串，零回显**）；否则 `return null`（既有 dispatch 语义零变）
- [ ] 反证「捕获后仍执行真实 `dispatch` ⇒ 必红」；`executor` 永不被正常路径调用
- [ ] `onCommandLine` 含 `text === NEXT_TOOL_NAME` 早退；`onToolOutput` 含 `meta?.name === NEXT_TOOL_NAME` 早退；`onToolDone` 函数体**逐字未变**（切片哈希可判）
- [ ] 同回合多次调用 ⇒ 覆盖式**取最后一次**（反证「并集 ⇒ 必红」）；候选经 5 道链后 `slice(0, MAX_CHIPS_PER_CARD)`
- [ ] `aiNext` 装配**仅** `done ∧ openAsks===0`；`aiNext` 缺席 ⇒ 面板行为与现状**逐字一致**；`error` 结算点零候选
- [ ] 未配置 ⇒ 零候选零网络（SW `:945-956` early-return 保持）；**主链零新增 LLM 往返**（工具调用在同一次回合内，无第二次 `providerChat`）
- [ ] `blocked=` 可读留痕恰一行（codes 去重 join；**零明文**：不含候选 `label` / `params` 值）
- [ ] `turn-queue.ts` / `chat-runner.ts` **diff = 0**

**验证命令**:
```bash
cd packages/web-cli-plugin && npm run typecheck && npm test 2>&1 | tail -25
git diff --stat -- packages/web-cli-plugin/src/background/turn-queue.ts packages/web-cli-plugin/src/background/chat-runner.ts | tail -1  # 期望 0
```

---

### TASK-NDA-108: **SG-NDA-02** `ai-led` 独立规则位等价重锚 + 密度 / 门禁可判 探针（先验闸门）

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-NDA-105 |
| **执行波次** | 2 |
| **对应 FR** | FR-NDA-042 / 043 / 114 |
| **对应 AC** | AC-NDA-005 |
| **对应 ADR** | ADR-NDA-003（§①~③） |

**描述**: 探针验证「`ai-led` 插第 2 位后**行为与 F-36 等价**」（有引用时 AI 仍优先于 `ref-action`）且「密度 / 单卡 / 3-chip / `DRIVER_TIMINGS` 恰 5 逐字不动」，并确认「注入恰 4 规则表 / 位次漂移 ⇒ 判据必红」。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| SPIKE | `packages/web-cli-plugin/test/_spike/sg-nda-02-probe.mjs`（探毕删除） |

**验收标准**:
- [ ] 可判：`priorityOf('ai-led') < priorityOf('ref-action')` ⇒ 有引用时 AI 候选仍赢 `ref-action` 槽（行为等价）
- [ ] 可判：`MAX_NEXTSTEP_CARDS_PER_ROUND === 1` / `MAX_CHIPS_PER_CARD === 3` / 密度阈值 `7/15 · 9/20 · 17/35` **逐字未改**
- [ ] 可判：`DRIVER_TIMINGS === 5` 且 `DRIVER_TIMINGS_LEGACY4` 逐字；零新增触发词
- [ ] 可判：注入 `['risk-recovery','ref-action','onboarding','capability-discovery']`（恰 4）/ 位次互换 ⇒ 判据**可 FAIL**
- [ ] 结论 ∈ {可行 / 不可行}；五要素写入 build 记录；探针产物不落版本库

**验证命令**:
```bash
cd packages/web-cli-plugin && node test/_spike/sg-nda-02-probe.mjs
grep -n "NEXTSTEP_PRIORITY\|MAX_NEXTSTEP_CARDS_PER_ROUND\|MAX_CHIPS_PER_CARD" packages/web-cli-plugin/src/ui/sidepanel/recommend.ts | head
```

---

### TASK-NDA-109: `recommend.ts` `NEXTSTEP_PRIORITY` 恰 5（`ai-led` 第 2 位）+ `NEXTSTEP_LABELS.ai-led`

| 属性 | 值 |
|------|-----|
| **复杂度** | S |
| **前置依赖** | TASK-NDA-108 |
| **执行波次** | 2 |
| **对应 FR** | FR-NDA-042 / 044 / 114 |
| **对应 AC** | AC-NDA-005 |
| **对应 ADR** | ADR-NDA-003（§①） |
| **列别 / 类型** | A（+80~250 B）/ impl |

**描述**: `NEXTSTEP_PRIORITY` 由恰 4 改为恰 5（`risk-recovery`(1) → **`ai-led`(2)** → `ref-action`(3) → `onboarding`(4) → `capability-discovery`(5)）；`NEXTSTEP_LABELS` 补 `'ai-led': '下一步推荐：AI 建议'`；`NextstepRuleId` 自动纳入。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/web-cli-plugin/src/ui/sidepanel/recommend.ts` |

**验收标准**:
- [ ] `NEXTSTEP_PRIORITY.length === 5` 且第 2 项 `=== 'ai-led'`；其余 4 项**逐字保留**（只改位次，不改字面）
- [ ] `NEXTSTEP_LABELS` 补项；`priorityOf = indexOf(rule)+1` 判据**自适应**（`recommendation-sources:143-145` 断言不变）
- [ ] `risk-recovery` 仍最高（`FR-NDA-044` 确定性接管语义不变）
- [ ] `recommendNextStep` 仍 **pure**（零 `fetch(` / `chrome.` / 时钟）；`recommendation-sources` ①~④ 零删除
- [ ] 反证：注入「恰 4」/ 位次漂移 ⇒ 必红（由 `TASK-NDA-113` 落判据）

**验证命令**:
```bash
cd packages/web-cli-plugin && npm run typecheck
grep -n "NEXTSTEP_PRIORITY" -A 8 packages/web-cli-plugin/src/ui/sidepanel/recommend.ts | head -20
```

---

### TASK-NDA-110: `providers.ts` `ai-next.rule='ai-led'` + `RULE_PROVIDER_IDS` 追加 + `DRIVER_DECLS_SRC` 逐字保留

| 属性 | 值 |
|------|-----|
| **复杂度** | S |
| **前置依赖** | TASK-NDA-109 |
| **执行波次** | 2 |
| **对应 FR** | FR-NDA-042 / 114 / 118 |
| **对应 AC** | AC-NDA-005 / 026 |
| **对应 ADR** | ADR-NDA-003（§②） |
| **列别 / 类型** | A（+40~120 B）/ impl |

**描述**: `ai-next` provider 的 `rule: 'ref-action'` → `'ai-led'`；`priority: 2 → 1`（相对位次随规则表前移）；`prepend: true` / `when` / `chips` / `chipsFor` / `textOf` / `label` **逐字保留**；`RULE_PROVIDER_IDS` 追加 `'ai-led'`；`DRIVER_DECLS_SRC['ai-next']` **逐字保留**（叶1 不加 provider ⇒ 恰 12 不动）。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/web-cli-plugin/src/ui/sidepanel/next-registry/providers.ts` |

**验收标准**:
- [ ] `ai-next.rule === 'ai-led'`；`when` 源文本与 F-36 **逐字相同**（**从不读 refs** = 无条件触发的可判事实）
- [ ] 既有 11 行 provider **零改动**；`chips` 静态下界 `[ACT_TO_OP.next]` 非空（`empty-chips` 判据不删）
- [ ] `DRIVER_DECLS_SRC` 仍 **12 行**、`ai-next` 行**逐字保留**（`driverId:'ai-next'` / `timings:['idle']` / `moments:['turn-end']` / `evidence:['session.aiNext']`）
- [ ] `NEXTSTEP_PRIORITY` 恰 5 与 `provider.priority` 两面无冲突（`DriverDecl.priority` 无需随之变）
- [ ] 零新增触发词（`DRIVER_TIMINGS` 恰 5）；`ACT_TO_OP` 恰 6 不动

**验证命令**:
```bash
cd packages/web-cli-plugin && npm run typecheck && npm test 2>&1 | grep -iE "driver-quadruple|next-registry|fail" | head
grep -n "rule: 'ai-led'\|rule: \"ai-led\"" packages/web-cli-plugin/src/ui/sidepanel/next-registry/providers.ts
```

---

### TASK-NDA-111: `ai-next-candidate` 改写主体（AI-N-1 换机制 + AI-N-2~11 语义对账 + AI-N-12）

| 属性 | 值 |
|------|-----|
| **复杂度** | L |
| **前置依赖** | TASK-NDA-105 / 107 / 109 / 110 |
| **执行波次** | 2 |
| **对应 FR** | FR-NDA-082 / 116 / 130 / 131 |
| **对应 AC** | AC-NDA-010 / 020 |
| **对应 ADR** | ADR-NDA-004（§②） |

**描述**: 把 AI-N-1 从「尾随 `next` 围栏块 + 严格 JSON 数组」改写为「`parseNextToolArguments(raw)` 五层筛 + 覆盖式取最后一次 + ≤3 截断」；AI-N-2~11 **语义逐条保留**（输入面从文本换成已解析 `candidates`）；**新增 AI-N-12**（`schema` 单源：字段名 / 必填集同构、`maxItems === MAX_CHIPS_PER_CARD`、`enum ===` 重算式、`NEXT_TOOL_NAME === 'next'`、"schema 不替代运行时校验"）；给出**前后断言语义逐条对账表**。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/web-cli-plugin/test/ai-next-candidate.test.ts` |

**验收标准**:
- [ ] AI-N-1 改写后可判：合法 JSON 对象 + `candidates` 数组 + 非对象项丢弃；缺 `candidates` / 非法 JSON / 顶层数组 ⇒ **零候选且不抛**；取最后一次；`≤3`
- [ ] AI-N-2~11 **语义保留**（顺序即优先级 / `ref` / `params` / 分层 / 零新增载体 / 驱动者声明 / 零新 LLM / `ask` 一致性）+ 新增 `ai-next.rule === 'ai-led'` 断言
- [ ] AI-N-12 可判：把 `OP_IDS` / `tierOf` 改一位 ⇒ 必红；`maxItems` 改 4 ⇒ 必红；`description` 缺任一约束句 ⇒ 必红
- [ ] **「schema 合法但运行时非法」必拦**（`params` 越界 / 幻觉 op）—— schema 不替代运行时校验（`N-NDA-023`）
- [ ] 对账表齐备：**无减少项**、`assertionsRemoved = 0`（按**断言语义**逐条，不是行数）；每条含 `expectFailPattern`
- [ ] 真源切片读**生产模块**（`shared/op-table.ts` / `tools/next-tool.ts`），不读测试自建常量

**验证命令**:
```bash
cd packages/web-cli-plugin && npm test 2>&1 | grep -iE "ai-next-candidate|not ok|fail" | head -30
```

---

### TASK-NDA-112: `ai-next-candidate` 反证族（五类注入必红）+ AI-N-13 / AI-N-14 + 真源切片 / 三段控制

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-NDA-111 |
| **执行波次** | 2 |
| **对应 FR** | FR-NDA-027 / 105 / 106 / 112 / 131 |
| **对应 AC** | AC-NDA-021 |
| **对应 ADR** | ADR-NDA-004（§②）/ ADR-NDA-101（§④）/ ADR-NDA-102（§④） |

**描述**: 五类注入反证**实跑**（幻觉 op ⇒ `unknown-op`；`gesture` op ⇒ `tier`；越界 / 失效 ref ⇒ `ref`；`params` 越界 ⇒ `param`；`label` 含凭据 ⇒ `label`）+ 补充「AI 代答 `confirm` consent ⇒ 必红」；新增 **AI-N-13**（`onCommandLine` / `onToolOutput` 对 `next` 零发射）+ **AI-N-14**（`tc.args` 零使用）；三段控制（`ok` / `violated` / `n/a`）逐态可达。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/web-cli-plugin/test/ai-next-candidate.test.ts` |

**验收标准**:
- [ ] 五类注入**各自实跑**：注入 ⇒ FAIL（声明 `expectFailPattern`）⇒ 逐字节还原（`sha256` 前后相同）⇒ PASS
- [ ] 「AI 代答 / 自动提交 `confirm` consent ⇒ 必红」；`gesture` op **连接受都拒**（`admit=false`）
- [ ] AI-N-13 可判：源文本早退存在 + 运行面「含 `next` 调用的回合零 `command` 变体 / 零 `tool:'next'`」；删早退 ⇒ 必红
- [ ] AI-N-14 可判：捕获路径源扫描 `tc.args` 零命中；注入「读 `tc.args` ⇒ 必红」（`R-NDA-912`）
- [ ] 每条判据含三段控制且 `n/a` **不冒充** `ok`；全部判据计数**只增**
- [ ] 反证恒绿检测（注入后仍 PASS ⇒ 缺陷）当场记录

**验证命令**:
```bash
cd packages/web-cli-plugin && npm test 2>&1 | grep -iE "ai-next-candidate|expectFailPattern|not ok" | head -30
```

---

### TASK-NDA-113: `recommendation-sources` ③ 恰 4 → **恰 5** 等价重锚（含注入反证）

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-NDA-109 / 110 |
| **执行波次** | 2 |
| **对应 FR** | FR-NDA-114 / 130 / 134 |
| **对应 AC** | AC-NDA-026 |
| **对应 ADR** | ADR-NDA-003（§④） |

**描述**: 门禁 ③ 由「恰 4 + 逐项值可复算」重锚为「**恰 5** + 逐项值可复算 + 注入『恰 4 / 位次漂移』伪造源 ⇒ 必红」；①~④（真值 7 / 模块白名单 5 / 单卡 / ④ 零新 LLM）**零删除**；`:143-145` priority 自适应判据与 `:625` 断言**有效**（注释随语义重锚）。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/web-cli-plugin/test/recommendation-sources.test.ts` |

**验收标准**:
- [ ] ③ 断言「`NEXTSTEP_PRIORITY.length === 5` ∧ 第 2 项 `=== 'ai-led'` ∧ 逐项值复算」；注入恰 4 / 位次互换 ⇒ **必红**
- [ ] ①~④ **零删除**：真值白名单 7 / 模块白名单 5 / 单卡 `MAX_NEXTSTEP_CARDS_PER_ROUND === 1` / ④ 零新 LLM（`recommend.ts` 零 `fetch(`·`chrome.`·时钟）
- [ ] `recommend.ts` 导入面**不新增条目**（白名单恒 5）；`:143-145` / `:625` 断言不变
- [ ] 计数只增；`X-NDA-5` 台账占位（`TASK-NDA-119` 落）

**验证命令**:
```bash
cd packages/web-cli-plugin && npm test 2>&1 | grep -iE "recommendation-sources|not ok" | head -20
```

---

### TASK-NDA-114: 保留面零改复核（9 项；若红 = 实现缺陷，不改判据）

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-NDA-107 / 110 |
| **执行波次** | 2 |
| **对应 FR** | FR-NDA-006 / 043 / 118 / 121 / 137 |
| **对应 AC** | AC-NDA-012 / 018 / 029 / 030 / 031 |
| **对应 ADR** | ADR-NDA-003（§②）/ ADR-NDA-009（§② 零改基座 / §④ 保留行） |

**描述**: 对叶1 **预期零改**的门禁与面逐条复核并留证：`driver-timings`（恰 5 / 旧 4 逐字）/ `driver-quadruple`（12↔12 + 逐项同集）/ `op-wiring`（`requestTurn(` 恰 1 / `maybeRecommend` 1·8 / `nextAfterSettle` 1·10）/ `op-three-tier`（`tierOf` 派生式 + 特权恒 `gesture`）/ `sw-op-mirror` / `next-dispatch-diff0`（`ACT_TO_OP` 恰 6）/ `insight-no-escalation`（base 零 diff）/ `ref-context-in-turn` / `cards/nextstep.ts`（预期零改）。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| 复核（预期零改） | `packages/web-cli-plugin/test/{driver-timings,driver-quadruple,op-wiring,op-three-tier,sw-op-mirror,next-dispatch-diff0,insight-no-escalation,ref-context-in-turn}.test.ts` |
| 复核（预期零改） | `packages/web-cli-plugin/src/ui/sidepanel/cards/nextstep.ts` |

**验收标准**:
- [ ] 9 项**全绿且文件零改**（`git diff --stat` 对这 9 个文件 = 0；若某文件因其它断言语义需触碰 ⇒ **只增**，且在对账表登记理由）
- [ ] `requestTurn(` **恰 1**（未新增调用点，`X-NDA-11` 维持 `no-supersession`）；`DRIVER_TIMINGS === 5`；`DRIVER_DECLS_SRC` 12 行
- [ ] `insight-no-escalation` 绿 ⇒ `packages/web-cli-base/**` 零 diff（只复用 `intercept` 缝）
- [ ] AI 候选渲染**复用既有 chip 面 / `data-op` 单源分发**（`cards/nextstep.ts` 若无新态 ⇒ 保持零改）
- [ ] 若任一条红 ⇒ 判定为**实现缺陷**，回到 `TASK-NDA-105/107/110` 修复，**不得改判据**

**验证命令**:
```bash
cd packages/web-cli-plugin && npm test 2>&1 | grep -iE "driver-timings|driver-quadruple|op-wiring|op-three-tier|sw-op-mirror|dispatch|insight-no-escalation|not ok" | head -30
git diff --stat -- packages/web-cli-plugin/test/driver-timings.test.ts packages/web-cli-plugin/test/driver-quadruple.test.ts packages/web-cli-plugin/test/op-wiring.test.ts packages/web-cli-plugin/test/op-three-tier.test.ts packages/web-cli-plugin/test/sw-op-mirror.test.ts packages/web-cli-plugin/test/next-dispatch-diff0.test.ts packages/web-cli-plugin/test/insight-no-escalation.test.ts packages/web-cli-plugin/test/ref-context-in-turn.test.ts packages/web-cli-plugin/src/ui/sidepanel/cards/nextstep.ts | tail -1
```

---

### TASK-NDA-115: **S0'''' 主线 A / 支线 B / 支线 D** node 面（真源切片 + 双向反证 + 三段控制）

| 属性 | 值 |
|------|-----|
| **复杂度** | L |
| **前置依赖** | TASK-NDA-112 / 114 |
| **执行波次** | 3 |
| **对应 FR** | FR-NDA-100 / 101 / 102 / 103 / 105 / 106 / 044 / 045 |
| **对应 AC** | AC-NDA-001 |
| **对应 ADR** | ADR-NDA-004（§③）/ ADR-NDA-007（S0'''' 五支线） |

**描述**: node 面机核 S0'''' **主线 A**（工具调用捕获 ⇒ 5 道校验 ⇒ chips ≤3 + 终端恒最末）、**支线 B**（五类非法各 `blocked=<code>` + 可读留痕 + 不渲染为 chip + 注册表兜底 + 终端）、**支线 D**（未配置 ⇒ 不下发工具 / 零网络 / 零候选），并覆盖支线 C（零候选 ⇒ 确定性接管）的主线侧；真源切片读生产模块。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/web-cli-plugin/test/ai-next-candidate.test.ts`（S0'''' 环节断言） |
| 复核 | `packages/web-cli-plugin/test/s0-self-driven-chain.test.ts`（若存在 ⇒ 只增；不存在 ⇒ 断言落前项） |

**验收标准**:
- [ ] S0''''-1~12 中**主线侧环节**逐条可判（1 工具产出 / 2 无条件触发 / 6 非法被拦 + 留痕 / 8 判定分层 / 9 围栏块已替换 / 10 零新增载体 / 12 留痕三要素 + 零明文）
- [ ] 主线 A：合法候选 ⇒ 进 chips ∧ ≤3 ∧ 单卡 ∧ 终端恒最末
- [ ] 支线 B：**五类各一条**可读 `blocked=` 行（零明文）+ 非法候选**不渲染**
- [ ] 支线 D：未配置 ⇒ **不下发工具**（零候选 / 零网络）
- [ ] 真源切片（读生产 `op-table.ts` / `next-tool.ts` / 回合 refs 快照 ⇒ **禁**假 provider / 桩）；每条含双向反证 + 三段控制（`n/a` 不冒充 `ok`）
- [ ] 反证恒绿检测：注入「未校验候选进 chips」「围栏块重新接线」⇒ **必红**

**验证命令**:
```bash
cd packages/web-cli-plugin && npm test 2>&1 | grep -iE "s0|ai-next-candidate|not ok" | head -30
```

---

### TASK-NDA-116: `test/ui/s0-self-driven.mjs` + `fixtures/s0-chain.mjs` 样本重锚（只加断言）+ `law8-plaintext.mjs` 零明文面

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-NDA-115 |
| **执行波次** | 3 |
| **对应 FR** | FR-NDA-100 / 103 / 104 |
| **对应 AC** | AC-NDA-001 / 014 / 019 / 032 |
| **对应 ADR** | ADR-NDA-004（§③）/ ADR-NDA-009（§④ 第 20~22 行） |

**描述**: 把 `fixtures/s0-chain.mjs` 的样本生成器从「围栏块 info 串」**等价重锚**为「工具调用捕获」样本（同文件内改，**不新增文件**）；`s0-self-driven.mjs` 加 S0'''' 主线 A / 支线 B / 支线 D 断言；`law8-plaintext.mjs` 加 AI `label` / 工具参数 / 留痕零明文断言（**零降级**）；人工面 M1~M6 逐项 `⏳ 未执行`。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/web-cli-plugin/test/ui/s0-self-driven.mjs` |
| MODIFY | `packages/web-cli-plugin/test/ui/fixtures/s0-chain.mjs` |
| MODIFY | `packages/web-cli-plugin/test/ui/law8-plaintext.mjs` |

**验收标准**:
- [ ] 样本单源：`s0-chain.mjs` 内重锚（**禁第二份样本**）；既有 S0_CHAIN 环节逐字保留
- [ ] 断言**只加不删**；`CHROMIUM_GATES === 9` **不动**（不新增 Chromium 门禁文件）
- [ ] `test:law8 ≥60` 且**零降级**（工具参数 / `label` / 留痕不回显值）
- [ ] 人工面清单 M1~M6 逐项 `⏳ 未执行`（**不冒充 PASS**）；v5.5 / F-34 / F-35 / F-36 人工面零改写
- [ ] `KL-N-10` 处置：首轮异常 ⇒ 隔离复跑 ≥2 + 日志全量 + 仍红如实记录不阻塞

**验证命令**:
```bash
cd packages/web-cli-plugin && npm run test:s0-self-driven && npm run test:law8
cd packages/web-cli-plugin && npm run test:gate-integrity
```

---

### TASK-NDA-117: `gate-integrity` 受审下界只增（改写门禁入集合）

| 属性 | 值 |
|------|-----|
| **复杂度** | S |
| **前置依赖** | TASK-NDA-111 / 112 |
| **执行波次** | 3 |
| **对应 FR** | FR-NDA-135 / 117 |
| **对应 AC** | AC-NDA-024 |
| **对应 ADR** | ADR-NDA-009（§④ 第 11 行） |

**描述**: 确认改写后的 `ai-next-candidate` 仍在 `gate-integrity` 受审集合内、且下界**只增**；`CHROMIUM_GATES === 9` **逐字不动**（不新增 Chromium 门禁文件）。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| 复核 / 只增 | `packages/web-cli-plugin/test/gate-integrity.test.ts` |

**验收标准**:
- [ ] 受审文件集合含 `test/ai-next-candidate.test.ts`；下界 **≥ 前值**（不减少）
- [ ] `CHROMIUM_GATES === 9` 逐字；未新增 Chromium 门禁文件
- [ ] 计数只增；按**断言语义 + 语义增量**重锚（不照抄陈旧字面，`NDA-P-008`）

**验证命令**:
```bash
cd packages/web-cli-plugin && npm run test:gate-integrity
```

---

### TASK-NDA-118: 体积叶1 重登记（五要素 + 三值 + `nda1Rows` + B 列不计账 + EC-NDA-016 二态）

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-NDA-117 |
| **执行波次** | 3 |
| **对应 FR** | FR-NDA-140 / 141 / 143 / 144 / 145 / 024 |
| **对应 AC** | AC-NDA-027 / 028 |
| **对应 ADR** | ADR-NDA-008（§②③⑤） |
| **列别 / 类型** | A（登记）/ doc |

**描述**: 按**叶1 产物**实测重登记：五要素（前后值 / 日期 / 来源 / 理由 / 历史保留）+ 三值（`newBaselineBytes` / `absoluteCeilingBytes` / 生效上限）同源前移 + `SIDEPANEL_GROWTH_BREAKDOWN` 追加 `nda1Rows`（逐模块）+ **B 列如实标注「不计账」** + EC-NDA-016 二态（越生效上限 / 越档位 = 是/否）。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/web-cli-plugin/test/size-baseline.ts` |
| MODIFY | `packages/web-cli-plugin/test/size-growth-evidence.test.ts`（若涉及） |

**验收标准**:
- [ ] 五要素齐备；三值同源前移；`SIDEPANEL_BASELINE_BYTES_TIMELINE` **只追加**
- [ ] 算术机核：Σ 逐模块 Δ + 未归因 == 登记增量（逐模块 → 产物归因）
- [ ] B 列（`next-tool.ts` / `service-worker.ts` / `ai-next.ts` / `ref-context.ts` / `host.ts`）**不计入 sidepanel 账本**且如实标注
- [ ] `authorConfirmation = pending-author-line` **不得伪称已确认**；EC-NDA-016 二态逐项如实（**禁预填**，`NDA-P-001`）
- [ ] 反证「把 A 列改动搬 B 列规避 ⇒ 必红」（`FR-NDA-145`）；冻结面 `stat` + `sha256` 前后一致（`content.js` 177,076 B / `pick-layer.js` 34,358 B）
- [ ] `test:size-ruling-vol3 ≥13`

**验证命令**:
```bash
cd packages/web-cli-plugin && npm run build && stat -c '%n %s' dist/sidepanel.js dist/background.js dist/content.js dist/pick-layer.js
cd packages/web-cli-plugin && npm run test:size-ruling-vol3 && npm run size:attribution
```

---

### TASK-NDA-119: `xNdaLedger` 骨架（X-NDA-1/2/5/7/8 superseded + X-6/9/12 keep/no-supersession）+ `xNdaGateReconciliation` 叶1 行

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-NDA-113 / 117 / 118 |
| **执行波次** | 3 |
| **对应 FR** | FR-NDA-110 / 111 / 114 / 115 / 116 / 117 / 118 / 121 / 122 / 132 |
| **对应 AC** | AC-NDA-020 / 022 |
| **对应 ADR** | ADR-NDA-009（§①④） |

**描述**: 在 `docs/v4-supersession-ledger.json` **追加**三个顶层键（`xNdaLedger` / `xNdaGateReconciliation` / `xNdaLedgerFull` 占位）：叶1 落 X-NDA-1 / 2 / 5 / 7 / 8（`superseded`）+ X-NDA-6（9 子项 `keep`）/ X-NDA-9 / X-NDA-12（`no-supersession` + 非空理由）；`xNdaGateReconciliation` 落叶1 相关行（1 / 2 / 3 / 4 / 6 / 8 / 10 / 11 / 14 / 15 / 16 / 17 / 19 / 20 / 21 / 22 / 24 / 25）。**老条目一律保留不动**（只追加）。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/web-cli-plugin/docs/v4-supersession-ledger.json` |
| MODIFY | `packages/web-cli-plugin/test/supersession-ledger.test.ts`（新增判据，只增） |

**验收标准**:
- [ ] 每行含 `id` / `status` / `old`（逐字）/ `new` / `reason` / `date` / `landing` / `counterCheck`；未发生者 `status === 'no-supersession'` 且 `reason` **非空**
- [ ] `git diff` 对老键**只增**（v3 / v4 / v4.5 / v5 / v5.5 / F-34 / F-35 / F-36 段逐字保留）
- [ ] `xNdaGateReconciliation` 叶1 行三态齐（保留 / 等价重锚 / 显式取代），**无「未处置」项**；间接面登记「保留（未触碰）」
- [ ] `test:supersession ≥53`；保护段（journey / binding）**本叶零触碰**（叶2 终态决策）

**验证命令**:
```bash
cd packages/web-cli-plugin && npm run test:supersession
git diff --stat -- packages/web-cli-plugin/docs/v4-supersession-ledger.json
```

---

### TASK-NDA-120: 红线巡检 + 本叶收口对账（零改基座 / 冻结面 / 断言零删除 / 停机规则）

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-NDA-113 / 114 / 116 / 117 / 118 / 119 |
| **执行波次** | 3 |
| **对应 FR** | FR-NDA-001 / 003 / 004 / 130 / 136 / 142 |
| **对应 AC** | AC-NDA-020 / 025 / 027 / 029 / 030 |
| **对应 ADR** | ADR-NDA-009（§②③） |

**描述**: 本叶收口轮：逐条巡检红线（零改基座 / 判定链零触碰 / 冻结面零容差 / 零新增载体 / 法八 / 特权恒 `gesture`）+ 门禁保全（`assertionsRemoved = 0` / 计数只增）+ 纪律（`.sddu` 外零触碰 / ROADMAP 零 diff / 不碰 `main` / path-limited `git add`）+ 本叶全门禁串行全绿 + `KL-N-10` 处置记录。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| 巡检（无源码改动） | `packages/web-cli-plugin/**`（只读巡检） |
| 记录 | 本叶 build / validate 记录（收口对账） |

**验收标准**:
- [ ] `git diff --stat -- packages/web-cli-base/ .sddu/specs-tree-root/ROADMAP.md` = 0；`zeroDiffFiles` 9 项哈希 pin 不变
- [ ] `content.js` 177,076 B / `pick-layer.js` 34,358 B + sha 前后一致；`KIND_SET` 40 / 12 kind / 零宿主 / `ACT_TO_OP` 6 逐字
- [ ] `assertionsRemoved === 0`（按断言语义逐条对账）；门禁计数**只增不减**
- [ ] 门禁**严格串行**（`test` / `test:ui` / `test:binding` 不并发；一次一个 Chromium）；`KL-N-10` 首轮异常 ⇒ 隔离复跑 ≥2 + 日志全量
- [ ] 本叶全门禁清单（见 `../tasks.md §10`）逐项绿或如实登记；未绿项**不得**伪造
- [ ] 停机规则 14 条逐条确认未触发；触发项须停机上报（`blockers`）

**验证命令**:
```bash
cd packages/web-cli-plugin && npm run typecheck && npm run build && npm test
cd packages/web-cli-plugin && npm run test:supersession && npm run test:gate-integrity && npm run test:size-ruling-vol3
git diff --stat -- packages/web-cli-base/ .sddu/specs-tree-root/ROADMAP.md | tail -1
```

---

## 3. 任务汇总

| 统计项 | 数值 |
|--------|:--:|
| 总任务数 | **20**（`TASK-NDA-101~120`） |
| S 级 (简单) | **7**（`102` / `103` / `104` / `106` / `109` / `110` / `117`） |
| M 级 (中等) | **9**（`101` / `108` / `112` / `113` / `114` / `116` / `118` / `119` / `120`） |
| L 级 (复杂) | **4**（`105` / `107` / `111` / `115`） |
| 执行波次 | **3**（W1 7 / W2 7 / W3 6） |
| spikeGate | **2**（`SG-NDA-01` = `101` / `SG-NDA-02` = `108`） |
| 类型分布 | impl 8（`102`~`107` / `109` / `110`）/ gate 7（`111`~`117`）/ spike 2（`101` / `108`）/ doc 3（`118`~`120`）（合计 20） |
| 模板偏差 | 20 > 15（`../tasks.md §0.1` 已登记） |

## 4. 执行策略

| 波次 | 任务 | 策略 |
|:--:|------|------|
| **W1** | `101`（先验闸门，最前）→ `102` ∥ `106` → `103` ∥ `104` → `105` → `107` | 先验闸门最前；同波内文件不相交者可并行；`105` → `107` 硬序（共享 `turnState` 契约）。**只落 B 列** |
| **W2** | `108`（先验闸门，最前）→ `109` → `110` → `111` → `112`；`113` ∥ `114` | `109` ∥ `110` 可并行；`111` → `112` 硬序（反证依赖改写后的判据）；`113` / `114` 与前者不相交。**A 列唯一主体增长点 ⇒ 落完即实测**（`TASK-NDA-118` 前先量一次） |
| **W3** | `115` → `116`；`117`；`118`；`119`；`120`（末位） | 收口轮；`115` → `116` 硬序（node 面 → Chromium 面）；`120` 末位（全门禁串行 + 红线巡检 + 对账） |

**停止规则（叶内）**：见 `../tasks.md §8.2` 全 14 条；本叶重点 = 规则 2（零改基座）/ 3（零新载体）/ 4（第二通道 / 第二解析面）/ 6（反证恒绿）/ 7（`SG-NDA-01/02` 不可行 ⇒ `102`/`103`/`105`/`107`/`111`/`112` / `109`/`110`/`113`/`114`/`118` 不得开工）/ 8（体积硬墙）/ 10（未校验候选进 chips）/ 12（新增计数调用点）。

---

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建（NDA-1 叶 tasks：**20 任务 / 3 波**（`TASK-NDA-101~120`；S×7 / M×9 / L×4）+ 2 个 spikeGate（`SG-NDA-01` `intercept` 捕获 + `rawArguments` 严格解析 + 合成 `ToolResult` 短路 dispatch + `next` 不上流 / `SG-NDA-02` `ai-led` 规则位等价重锚 + 密度 / 门禁可判）+ 改写门禁 1（`ai-next-candidate`：AI-N-1 换机制 + AI-N-12~14 + 语义对账 `assertionsRemoved = 0`）+ 升级 2（`parity` `pluginExtras['next']` / `recommendation-sources` ③ 恰 4→5）+ 保留面零改复核 9 项 + S0'''' 主线 A / 支线 B·D node 面 + Chromium 断言增量 / 样本重锚 + 体积叶1 重登记（五要素 + 三值 + `nda1Rows` + B 列不计账 + EC-NDA-016 二态）+ `xNdaLedger` 骨架 + 红线巡检收口）。**本轮只做 tasks**：零 `src/test/dist/docs/design/ROADMAP` 改动；未跑门禁 / 构建 / Chromium；未调用任何受管 Provider（routing.v1 = `local_or_compute → none`） | 2026-09-27 | SDDU Tasks Agent |
