# ADR-V55-006: 配置探测判据（3 字段确定性组合）+ `runChat` 前置判据落 SW

## 状态
ACCEPTED

## 背景

现状（R5 / B1 / B2 / B3）：

- `runChat`（`background/service-worker.ts:878-941`）**无配置门禁**：`:879-885` 检查 `chatBusy` 之后**直接** `s.keys.load()`（`:893`）→ `providerById` → `providerChat`；
- 未配置时表现为 **LLM 错误事件**（`:920-921` `onLLMError` → `llmErrorEvent`）→ 面板落 `dispatch({type:'error'})` → `maybeRecommend('idle')`（`:3281` 邻域）—— **被动撞墙式**；
- `llm.unconfigured` 阻塞事实**只在 op 分支被动写入**（`sidepanel.ts:1290-1302` `noteLlmBlockedFact`，注释逐字「observed block event」）。

spec：FR-SELF-040 / 041 / 052、X-SELF-3、N-SELF-024（主题① 零 LLM / 零 token）、O-SELF-002 / DC-SELF-002。§8 留给 plan 的项② = **配置判据的具体字段组合**（边界 = 确定性 + 可机核 + 零 LLM 调用）。

## 决策

### 1. 判据形态：**既有模块里的一个纯函数**（零新模块 / 双侧可用）

```ts
// src/llm/status.ts（既有文件；依赖零 —— 不拉 LLM SDK / 不读 key-store / 不触 chrome）
export const LLM_CONFIGURED_FIELDS = Object.freeze(['hasKey', 'providerId', 'model'] as const);

/** 「已配置 LLM」的确定性判据（零 LLM 调用 / 零网络 / 全函数）。 */
export function isLlmConfigured(s: Pick<MaskedLlmLike, 'hasKey' | 'providerId' | 'model'>): boolean {
  return s.hasKey === true && s.providerId.trim().length > 0 && s.model.trim().length > 0;
}
```

### 2. 三字段的**来源与结构性保证**（这是判据能「实质等价 `hasKey`」的根据，必须机核）

| 字段 | 来源 | 结构性保证（既有实现） |
|---|---|---|
| `hasKey` | `keyStore.maskedConfig()`：`apiKey.length > 0`（`src/llm/key-store.ts:128`） | 唯一真正的「可能缺失」字段 ⇒ **判据的判定权实质在此** |
| `providerId` | `store.active`，读时经 `isProviderId()` 校验，非法回落 `'deepseek'`（`key-store.ts` 的 `read()`） | **恒 ∈ PROVIDERS** ⇒ 该子项不可能为假 |
| `model` | `state?.model?.trim() ? state.model : provider.defaultModel`（`key-store.ts:81/104/125`） | **恒非空**（回落 `defaultModel`）⇒ 该子项不可能为假 |

⇒ **判据是 3 字段的「全函数」**：任何字段缺失都不会被误判成「已配置」；而「已配置」不会被结构性回落误判成「未配置」（**不制造假阴性**，
避免把能用的用户送去重新配置 —— 这是本决策相对「要求 user 显式输入 model」的关键差别）。

**机核**（`test/onboarding-deterministic.test.ts`）：
1. `isLlmConfigured` 只读这 3 个字段（源码扫描：函数体内出现的属性名 ⊆ `LLM_CONFIGURED_FIELDS`）；
2. 真值表：`hasKey=false` ⇒ false（任取其余两字段）；`hasKey=true` ∧ 三字段齐 ⇒ true；
3. **归一化不变量**：key-store 的 `read()/load()/maskedConfig()` 三条路径都保证 `providerId ∈ PROVIDERS` ∧ `model !== ''`（既有测试断言 + 本门禁显式复核）；
4. **零 LLM 机核**：`isLlmConfigured` 的调用图内零 `providerChat(` / 零 fetch / 零 chrome API；
5. 反证：把 `hasKey` 用 `apiKeyMasked !== ''` 之类替换（引入假阴性/假阳性面）⇒ FAIL。

### 3. `runChat` 前置判据（**先于** `providerChat`，落在 SW bundle）

```
runChat(user):
  1. chatBusy 检查（既有 → 改为「可判仲裁」，见 ADR-V55-010）
  2. settings = await s.keys.load()                       // 既有（位置不变）
  3. ★ if (!isLlmConfigured(settings)) {                    // 前置配置判据（**零 LLM 调用**）
         emit chat-result { variant: 'llm-unconfigured', blocked: 'llm.unconfigured' }
         return                                              // 不调 providerChat / 不产生 LLM 错误事件 / 零 token
     }
  4. providerChat(...)                                     // 既有路径
```

- 判据**在 `providerChat(` 之前**：源码序机核（断言 `isLlmConfigured(` 的行号 < `providerChat(` 的行号）；
- 反证：删掉前置判据 ⇒ 「未配置 ⇒ 产出引导（非错误事件）」判据 **FAIL**（复现 R5）。

### 4. 面板侧的接线（**fold 进既有 `risk` 源，不新增真值源**）

- `chat-result` 的 `variant` 是**既有 kind 的 payload 值**（`KIND_SET` **40 项逐字不动**，`variant` 不是 kind）；union **type-only** 扩一项。
- 面板收到 `llm-unconfigured` ⇒ `noteLlmBlockedFact(false)`（既有函数，语义「key-store 为空 ⇒ llmBlocked」）⇒ 既有 op-driven provider
  `llm.unconfigured`（`providers.ts:57-58` + `OPS_RECOVERY_ROWS`，**零改写**）产出 `op.llm-config` op-direct chip；
- 并调 `nextAfterSettle({kind:'answered'})` 让「意图需要 LLM」这一时刻**立刻**有驱动者（v55-1 的时机侧能力）。

### 5. 双源并存（X-SELF-3 的取代形态 = **加源不取代**）

| 源 | 触发 | 处置 |
|---|---|---|
| **被动观测**（既有） | `op.llm-config` 失败 / 被拒后 `noteLlmBlockedFact(out.ok)`（`:3291/3302/3306`） | **保留**（合法降级场景：用户以为配好了但写入失败） |
| **主动识别**（新增） | SW 前置判据命中（`runChat` 前） | 新增；与被动源**同一终态词汇**（`llmBlocked` ⇒ `llm.unconfigured`）⇒ **幂等**（不产生两条阻塞事实，不弹两条引导；EC-SELF-004） |
| `OPS_RECOVERY_ROWS` / `BLOCKED_RECOVERY_TRIGGER` | — | **逐条不变**（含 v5-3 I-05 的「按终态键控对象」形态，**不得退回位置数组**） |

### 6. 分流（FR-SELF-052 / FR-SELF-070）

`isLlmConfigured` = 主题① ↔ 主题② 的**唯一**分流依据：
- 未配置 ⇒ 恒走主题①（`llm.unconfigured` 引导 + 确定性驱动者）；**零** AI 主动发起；
- 已配置 ⇒ 主题② 的 `ai-driven` 驱动者激活（ADR-V55-009）；主题① 的引导**自动收敛**（判据基于**事实**而非「配置动作」，EC-SELF-010）。

**互斥完备断言**：任意 ctx 下**恰**有一侧成立（注入「未配置却尝试 AI 主动」/「已配置却弹配置引导」⇒ 各必 FAIL）。

## 后果

**正面**
- 「撞一次错误才知道要配置」被结构性消除；且**零 token**（未配置路径根本不调 provider）—— 逻辑自洽（N-SELF-024：没有 LLM 却要调 LLM 引导是自相矛盾）。
- 判据落在**既有依赖零模块**里 ⇒ 双侧（SW / 面板）可用、体积增量 ~120 B/bundle、`content.js` 零影响。
- 不新增真值源：面板仍只有 7 个 ctx 源（`llmBlocked` 早就是既有 `risk` 的派生值）。

**负面 / 代价**
- `runChat` 新增一个 early return ⇒ SW 的回合生命周期多一条出口。必须保证：`chatBusy` **不**被置位就返回（否则后续所有回合都被判「忙」）⇒ 判据：early return 落在 `chatBusy = true` **之前**（源码序断言）+ 反证（把 early return 放到 `chatBusy = true` 之后 ⇒ 第二次 `runChat` 被误判忙 ⇒ FAIL）。
- 「已配置」判定基于**是否存在 Key**，不校验 Key 的**有效性**（有效性要联网）⇒ 登记为**口径限制**（诚实）：Key 错误仍会走既有 LLM 错误事件路径（本 Feature 不接管该路径）。
