# ADR-V55-009: 护栏三件套（六常量单源）+ 关断 / 否决 + 载体零新增

## 状态
ACCEPTED

## 背景

主动性一旦成立，会引入**三个全新的成本 / 稳定性面**：**token 消耗**、**主动跨轮**、**自触发环**（Q-SELF-013 / R-SELF-004）；
而现状**三条控制零判据**。spec §5.8（FR-SELF-090~097）/ O-SELF-006 / DC-SELF-006 / N-SELF-026 要求：
① 打扰控制（频次上限 + 同因不重复 + 静默期 + 继承既有 10 s 防抖**不改常量**）② token 成本（预算上限，达界停发非死端）
③ 防环（连续自动链深度上限 + 冷却，达界强制转用户手势）；三组常量**各恰一处**声明；**载体零新增 kind / 零新增宿主**；
且**用户可关断**（关断后 AI 主动零发起；**主题① 不受该开关控制**，口径显式登记）。

## 决策

### 1. 常量单源：`next-registry/guard.ts`（**恰一处**）

| 常量 | 值 | 语义 | 关系 / 登记 |
|---|--:|---|---|
| `AI_PROACTIVE_MAX_PER_WINDOW` | **6** | 打扰控制：滚动窗内的主动发起上限 | 窗口 `AI_PROACTIVE_WINDOW_MS = 600_000`（10 min）同处声明 |
| `AI_PROACTIVE_SAME_CAUSE_KEY` | `driverId + ctx 摘要` | 同因不重复的去重键（**函数单源**） | 继承 FR-SELF-014；与推荐器既有防抖**叠加**（不是替代） |
| `AI_PROACTIVE_SILENCE_MS` | **60_000** | 静默期：用户刚否决 / 刚交互后不主动 | 起点 = 否决（consent `reject` / 中断）或用户回合结束 |
| `AI_PROACTIVE_COOLDOWN_MS` | = `NEXTSTEP_MIN_INTERVAL_MS` | 冷却：两次自动发起间的最小间隔 | **re-export**（`recommend.ts:60` 的 10_000）⇒ **零新字面量**（R-V55-109 的防线） |
| `AI_CHAIN_DEPTH_MAX` | **2** | 防环：连续自动链深度上限 | 达界 ⇒ **强制转用户手势** + 「需要你决定」的可达 next（FR-SELF-064 / EC-SELF-014） |
| `AI_TURN_BUDGET_PER_SESSION` | **8** | token 成本：本会话内主动回合上限 | **口径 = 主动回合数**（等价口径，见 §2） |
| `AI_PROACTIVE_ENABLED_DEFAULT` | **`true`** | 关断偏好默认值（**显式登记**） | 见 §4；NG-SELF-021 要求默认值必须在裁决中显式登记 |

**判据**：六项 + 窗口 + 默认值各恰一处声明（源文本抽取）；散落字面量零命中（除单源与 re-export 面）；反证：别处写第二份 ⇒ FAIL。
**越限必须被抑制**（不是「只写不判」，R-SELF-907）：每条常量都有一条「越限注入 ⇒ 不产出 / 停发」断言 + 还原 PASS。

### 2. token 预算的**口径**（诚实登记其限制）

- **口径 = 主动回合数**（`AI_TURN_BUDGET_PER_SESSION`），**不是 token 计数**。
- 理由：本 Feature **不新增真值源**（N-SELF-013）—— 现有代码没有 token 计量面（`providerChat` 不回报 usage；SW 无计费通道）；
  为「数 token」而新增一条计量/上报通路会同时违反「零新增真值源 / 零新增网络面 / 零新依赖」。
- 等价性论证：spec FR-SELF-091 明示允许「回合数 / token 数 / **等价口径**」；在「一次主动回合 ≈ 一次 LLM 调用」的既有事实上，
  回合数上限是 token 成本的**上界代理**（每次主动回合最多一次 provider 调用）。
- **口径缺口显式登记**（不掩盖）：单回合内的 token 量不可控（长上下文回合可能很贵）⇒ 登记为**已知限制**，
  并注明「若要真正的 token 预算，须先有 usage 回报面（另立项）」。
- 达界 ⇒ 停发 AI 主动 + 转确定性路径 / 等待用户手势 + **可达 next 仍存在**（非死端，EC-SELF-015）。

### 3. 按下策略：`auto` 档的**唯一**自动按下点（`next-registry/ai-drive.ts`）

```ts
/** 唯一自动按下入口（每处守卫都 loud；零第二处）。 */
export function pressCandidate(opId: string, value: string, by: 'deterministic' | 'ai'): 'pressed' | 'blocked:…' {
  const d = opDescriptor(opId);
  if (!d) return 'blocked:unknown-op';
  if (by === 'ai') {
    if (tierOf(d) !== 'auto') return 'blocked:tier';            // ADR-V55-008 §3（enables confirmed/gesture 恒不自动）
    if (!guardAllowed('ai')) return 'blocked:guard';            // §1 六项
    if (!arbitrationAllowed()) return 'blocked:busy';           // ADR-V55-010（不发起 + 留痕）
    if (!isLlmConfigured(llmSummary)) return 'blocked:unconfigured'; // ADR-V55-006（未配置 ⇒ 零 AI 主动）
  }
  if (by === 'deterministic' && opId !== 'op.turn') return 'blocked:tier';
  traceProactive({ driverId, timing, evidence, actor: by });    // ★ 留痕三要素（零明文，见 §5）
  dispatchChipAction(chipActionOf(opId), value);                // 既有分发器 ⇒ runOp ⇒ PANEL.turn ⇒ requestTurn（计数不变）
  return 'pressed';
}
```

- **候选恒由注册表产出**：`pressCandidate` 只接受**注册表产出的 opId**（`opDescriptor` 未命中即拒），AI **不得**自造候选（FR-SELF-065 / LNG-V55-3-003）；
- **失败非死端**：回合失败走既有单卡边界捕获 + 固化 + 可达 next（FR-SELF-066）；重试受 `AI_CHAIN_DEPTH_MAX` 约束（有界）。

### 4. 关断 / 否决（**本 Feature 唯一新增持久偏好**）

| 项 | 裁决 | 判据 |
|---|---|---|
| 载体 | **既有设置视图的管理面**（既有 8 分区之一内；**零新增分区 / 零新增必需 id**；键名 = `guard.ts` 单源常量 `AI_PROACTIVE_PREF_KEY`） | 断言 `index.html` 的必需 id 集不变；`view-model`/`settings` 兼容面逐 id 断言 |
| 默认值 | **`true`（开）** | 显式登记 + 文书与实现**同源**声明；反证：默认值被硬编码在别处 ⇒ FAIL |
| 关断后 | AI 主动**零发起**（`guardAllowed('ai') === false`）；**主题① 仍工作**（其 `driverClass === 'deterministic'`，不受该开关控制） | 两条断言 + 口径显式登记（NG-SELF-021 / EC-SELF-016） |
| 可逆性 | 关断 / 恢复**可逆**（NFR-SELF-010） | 关断 → 恢复 → 再次主动可达 |
| **一次性否决** | **复用既有卡协议**：AI 主动若走 `confirm` 档 ⇒ consent 卡由用户作答，`reject` = 一次性否决（既有 `defaultSettle('rejected')` → `panelReachableNext`）；`auto` 档被否决的形态 = 用户中断 / 输入接管 + **静默期**生效 | ①「本次不再发生」（不立即重试）断言；②「同类不再主动」= 持久开关登记可判；③否决后**可达 next**（非死端） |
| **不新增 `veto` 协议动作** | 集 A（`SET_A_PROTOCOL_ACTIONS` 8 项）与集 B（6 act）**逐字不动** | 反证：新增第 9 个协议动作 ⇒ FAIL |

### 5. 留痕三要素 + 载体零新增（FR-SELF-062 / 063 / 095）

| 项 | 载体 | 判据 |
|---|---|---|
| 「谁发起 / 何时 / 依据什么」 | **既有 `system` 行**（`dispatch({type:'notice'/'system'})`）由单源 `driverTraceLine(driverId, timing, evidenceKeys)` 生成 | 三要素可读 + **零明文**（`stream-plaintext` 净化链不破）；反证：去掉留痕 ⇒ FAIL |
| 摘要内容 | 只含 **driverId + timing + ctx 字段名集**（**不含任何值**：不含 Key、不含答案全文、不含 URL query） | 断言：摘要匹配 `driver=…|timing=…|evidence=…` 的白名单形态；反证：把答案全文写进摘要 ⇒ FAIL |
| 零新增 kind | 12 kind **逐字**；`REGISTERED_STRUCTURAL_HOSTS === []`；`KIND_SET` **40 逐字**；任意深度零 `[data-host]` | 既有断言不减 + 新增「主动性载体不在流内新增固定宿主」判据 |
| 打扰留痕 | 抑制必须**留痕可判**（用户能看到「刚才是被抑制了还是没反应」） | 断言：抑制时存在可读行（「已抑制：同因/静默/预算」）；反证：抑制静默 ⇒ FAIL（FR-SELF-096） |

### 6. 护栏未落地时的**如实降级**（FR-SELF-097 / 纪律第 14 条）

每项控制二态必居其一：**「已落地（判据 + 反证）」** 或 **「显式登记未落地（台账 + 未闭合义务 + 原因）」**；
**无第三态**（不许「没做也没登记」）。越限本身**不得**被当成 PASS。

## 后果

**正面**
- 「主动性可信任」有六条可判常量 + 三条越限抑制路径；用户随时可关断（且默认 ON 已显式登记，符合作者「主动帮用户」的母理念）。
- 冷却复用既有 10 s 常量（re-export）⇒ 零新字面量、零漂移面，且与既有防抖**叠加**（不是互相覆盖）。
- 载体全复用 ⇒ 12 kind / 零宿主 / `KIND_SET` 40 三条红线结构性不破。

**负面 / 代价**
- token 预算只是**回合数代理**（口径缺口已登记）⇒ 单回合超长上下文仍可能贵；这是「不新增真值源」约束下的诚实上限。
- 一次性否决在 `auto` 档没有专用按钮（走「中断 + 静默期」）⇒ 体感弱于一个显式「不再主动」按钮；
  代价换来「零新 op（否则破 5/2/2）/ 零新协议动作 / 零新 kind」三条红线不破。登记为**已知口径限制**并列入人工面体感走查项。
- 关断偏好的读写落在**既有**存储面，若既有存储是 `chrome.storage.local`（browser-direct provider 的 Key 也在其中，掩码）——
  必须保证**不把开关与 Key 混在同一键**（键名单源 + 断言：偏好键内无 `apiKey` 形状的字符串）。
