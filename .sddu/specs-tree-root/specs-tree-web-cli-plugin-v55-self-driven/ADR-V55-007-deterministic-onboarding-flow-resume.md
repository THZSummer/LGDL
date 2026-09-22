# ADR-V55-007: 确定性引导流（步骤单源）+ 悬置任务单源 + 配置完成自动续接

## 状态
ACCEPTED

## 背景

作者主题① 逐字：**「没有配置 LLM 时：由系统代码流程驱动用户去配置 LLM」** ⇒ **零 LLM 调用、零 token、同输入同路径**。

现状缺口：`onboarding` provider **仅首装**（`when: firstRun && pendingSteps.length > 0`，`providers.ts:125-134`；`pendingSteps` 恒 `['授权当前站点']`）；
`maybeRecommendFirstRunEntry()`（`sidepanel.ts:1895-1909`）**每次面板生命至多消费一次**。
⇒ **「已装未配」是零覆盖场景**；且**「配置这件事的终点缺失」**：用户为某件事去配 LLM，配完之后**那件事不会自己继续**。

spec：FR-SELF-042~052 / AC-SELF-007 / 013 / EC-SELF-009~012 / 022 / NG-SELF-016 / R-SELF-904 / 905 / 909。
§8 留 plan 的项：引导步骤的文案与步数（≥4 步：识别 → 引导 → 采集 → 完成）。

## 决策

### 1. 引导流步骤：**恰 4 步单源**（`next-registry/onboarding-flow.ts`）

```ts
export const ONBOARD_STEPS = Object.freeze([
  { id: 'detect',  evidence: 'llm.unconfigured',                    carrier: 'system-row' },
  { id: 'guide',   evidence: 'llm.unconfigured',                    carrier: 'nextstep-card', chip: 'op.llm-config' },
  { id: 'collect', evidence: 'op.llm-config:params',                carrier: 'ask-cards',     reuse: 'OP_PARAM_SEQUENCE' },
  { id: 'complete',evidence: 'op.llm-config:receipt(ok=true)',      carrier: 'system-row + resume' },
] as const);
```

| 步 | 可判断据 | 复用（**不新造**） |
|---|---|---|
| ① `detect` | `llm.unconfigured` 事实成立（主动识别 ∨ 被动观测） | 既有 `noteLlmBlockedFact` + 既有 `risk: llmBlocked` |
| ② `guide` | 流内出现 `op.llm-config` **op-direct chip**（`[data-op="op.llm-config"]`） | 既有 `llm.unconfigured` provider（**零改写**）；`dispatchChipAction` 的「action 即 opId」分支（`dispatch.ts:53`） |
| ③ `collect` | 既有三段 params 序列：`choice(厂商) → text(模型) → secret(Key)` | **既有** `OP_PARAM_SEQUENCE['op.llm-config']`（`ops.ts:203-211`）；掩码卡 + 值直达 key-store（法八） |
| ④ `complete` | `op.llm-config` 成功回执（既有文案「✓ 已配置 LLM（掩码 · 零明文）」）+ **续接发生** | 既有 receipt 单源（`opReceiptText`）+ `suspension.ts#resume` |

**判据**：步骤集从源文本抽取后与需求一致；逐步可判（存在性 + **顺序**）；删任一步 ⇒ FAIL；
「引导路径零视图切换 / 零 `#open-settings` 调用」⇒ FAIL 反证（R-SELF-905）。

### 2. 悬置任务：**单源登记 + MAX = 1 + 有效期重校验**（`next-registry/suspension.ts`）

```ts
export const MAX_SUSPENSIONS = 1;                       // 有界（同 MAX_OPEN_ASKS 的诚实有界口径）
interface Suspension { id: string; terminal: DriverTerminal; driverId: string;
                       instruction: string;              // 例如「原地翻译为中文」（= 用户已表达的话）
                       evidence: Readonly<Record<string,string>>;  // ctx 摘要（零明文；不含 Key / 不含原文以外的敏感值）
                       createdAt: number; validity: () => boolean; }
export function registerSuspension(s: Suspension): void;   // ★ 唯一登记点（第二处 ⇒ FAIL）
export function pendingSuspension(): Suspension | undefined;
export function resumeSuspension(): 'resumed' | 'invalidated' | 'empty';   // ★ 唯一续接点
```

| 决策点 | 裁决 | 理由 |
|---|---|---|
| 登记载体 | **内存单源 + 既有 `session` 服务面**（不新开持久通道） | N-SELF-013「不新增真值源」；悬置是**会话内**概念（`EC-SELF-011` 的失效场景含「会话切换」⇒ 跨会话续接本就无意义） |
| 上界 | **1**（新来者**取代**旧者并留痕：「原任务已被新的意图取代」） | 有界可判；与 `supersededAsk`（v4-3）同族口径 |
| 「谁在等 / 等什么 / 依据什么」 | 三要素 = `{waitingFor: 'llm-config', payload: instruction, evidence: ctx 摘要}`，**单源** | FR-SELF-045 ①② |
| 有效性重校验 | `resumeSuspension()` **先**校验：引用仍有效（既有 L1 判定：`l1.store()` 的 valid ∧ 未 retired）∧ 站点未变（`state.activeOrigin` 相同）∧ 会话未切换 | EC-SELF-011：**不得制造假成功** |
| 失效出口 | 失效 ⇒ **不续接** + 固化「原任务已失效」+ 可达 next（重新拾取 / 改用描述） | EC-SELF-011；非死端 |
| 空悬置 | **非死端**：产出可达 next（「看看这页能做什么」/「发一条消息开始」） | EC-SELF-012 |

### 3. 「配置完成 → 自动续接」的**顺序与失败面**（FR-SELF-050 / NFR-SELF-010）

```
op.llm-config 成功回执（既有 receipt 唯一写者）
  → ① 续接发生（resumeSuspension()）        ★ 顺序：回执在前，续接在后（事件序机核）
  → ② 续接后回合留痕（press op.turn 的 instruction）
配置失败（连接测试失败等）
  → ① 既有凭据快照回滚（旧配置逐字段不变）
  → ② 错误卡 + 可达 next（既有 `defaultSettle('failed')` + `panelReachableNext`）
  → ③ **悬置任务保留**（不丢）              ★ 反证：失败仍续接 ⇒ FAIL
```

- 续接的执行载体 = `pressCandidate('op.turn', instruction, {by:'deterministic'})`（ADR-V55-009 / 010）⇒ 经 `op.turn` 槽 ⇒ **`requestTurn(` 计数不变**；
- **零视图切换**：续接在流内发生，不打开设置页（NG-SELF-002 / LNG-V55-2-002）。

### 4. 两场景覆盖（FR-SELF-043 / AC-SELF-013）

| 场景 | 现状 | 本 Feature |
|---|---|---|
| **首装**（`firstRun = true`） | 既有 `R-ONBOARDING` 单行引导（`onboarding` provider）**保留不取代** | 判据**不减**；`pendingSteps` 语义**零改写** |
| **已装未配**（`firstRun = false` ∧ 未配置） | **零覆盖** | 由 `llm.unconfigured` op-driven provider（**其 `when` 本就不看 `firstRun`**）+ 主动识别判据覆盖 |

**判据**：两场景**各自**断言「产出配置引导 next」；注入 `firstRun = false` ⇒ **仍须产出**（不得依赖 `firstRun`）；
反证：把新覆盖挂在 `firstRun` 上 ⇒ FAIL。既有 `R-ONBOARDING` 判据不减（扩张不取代）。

### 5. 取消 / 不重复打扰（FR-SELF-046 / EC-SELF-009）

- 取消 = 关闭引导 / 取消 params 或 consent ⇒ 固化取消事实 + **可达 next**（非死端）；
- **同因不重复**：`driverId + ctx 摘要` 去重（ADR-V55-009 §2）+ 静默期 ⇒ 同会话内**不再弹同一条引导**；
- **后续仍可重新引导**（不是永久静默）：语境变化（新的「意图需要 LLM」时刻）⇒ 去重键变化 ⇒ 可再次引导。

### 6. 「不跳走」与法八不退化

| 判据 | 反证 |
|---|---|
| 引导路径零 `#open-settings` 调用 / 零视图切换 / 零 `location` 变更 | 把引导实现为打开设置页 ⇒ FAIL |
| `law8-plaintext.mjs` 计数 **≥25 不减**（引导路径四面零明文） | 让引导把值落流内 ⇒ FAIL |
| 凭据写入 sink **恰一处**（`keyStore.save(` / `submitSecret` 既有单点，继承 v5 法八机核） | 新增第二写入路径 ⇒ FAIL（EC-SELF-022） |
| 设置页保留管理面且**同调** `op.llm-config`（零双路径） | 设置面另写凭据 ⇒ FAIL |

## 后果

**正面**
- 「配 LLM 的目的被系统记住」成为**可判事实**（悬置任务三要素 + 自动续接），US-SELF-002/003 有机制承载。
- 引导流**全数据 + 全复用**（既有 provider / 既有 params 序列 / 既有 receipt / 既有掩码卡）⇒ 体积小（~1,100 B）且**零新造面**（NG-SELF-016）。
- 主题① 保持**零 LLM**：步骤判定与完成检测全为确定性谓词（N-SELF-024）。

**负面 / 代价**
- 悬置任务**只活在本会话**（内存单源）⇒ 「跨会话/重启后续接」**不在本 Feature**（显式登记为口径限制；`EC-SELF-011` 的失效语义因此天然成立）。若未来要跨会话，须走新 ADR（并触及「新真值源」红线复核）。
- `MAX_SUSPENSIONS = 1` ⇒ 连续两个「已表达意图」只有一个能续接（旧者被取代并留痕）。这是**有界换可判**的刻意取舍。
