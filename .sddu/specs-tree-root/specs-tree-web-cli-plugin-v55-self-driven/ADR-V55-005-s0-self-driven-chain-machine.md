# ADR-V55-005: S0 全链机器化（样本单源 + node/Chromium 双面 + A/B 双分支分层）

## 状态
ACCEPTED

## 背景

S0 = **本 Feature 的验收锚**，地位与 v5 之 S2 等价。真机 22:49（`platform.deepseek.com`）序列逐字：

```
绑定 ✓ → 拾取引用（① 出生有效）→ ask-user 已答「原地翻译为中文」→ 彻底静默（无思考 / 无 next / 无事件 / 无 ✖）
```

**证据缺口（如实）**：真机截图 / 录屏**未入库**；会话 A/B 来自作者提供的**文字记录**（20:15 / 22:49）。
⇒ S0 **可机核部分全部机核**；不可合成部分（主动接手**体感** / 是否被突然打断 / 文案可读性 / 等待感）入**人工面清单**，
状态 ∈ {`⏳ 未执行`, `PASS`}，**不得冒充 PASS**（NG-SELF-019 / AC-SELF-025）。

spec：FR-SELF-130~134 / AC-SELF-001 / G-SELF-006 / R-SELF-908 / v5-2 review BLOCK-03 教训（「脚本绿 ≠ 链路可判」）。

## 决策

### 1. 样本单源：`test/ui/fixtures/s0-chain.mjs`（**沿用 `s2-chain.mjs` 的形态**）

| 维度 | s2-chain（v5 先例） | **s0-chain（本 Feature）** |
|---|---|---|
| 形态 | 纯数据 + 纯函数 + **注入式依赖**（零 DOM / 零 chrome / 零 import） | **同**（`import` 为空；生产能力由调用方注入 `{ candidates, actToOp, opIds, drivers, selectables }`） |
| 步数 | 10 环节 | **10 环节**（下表） |
| 判据 | `judgeStates()` → 死端计数 | `judgeChain()` → `{ perBeat, silentWindows, deadEnds, answerNotDropped }` |
| 判官 | node `s2-deadend-chain.test.ts` + Chromium `no-dead-end.mjs` | node `s0-self-driven-chain.test.ts` + Chromium `s0-self-driven.mjs`（**同一份样本，不复制**） |

```
S0_CHAIN（10 环节）
① bind            绑定当前标签页
② probe           自动探测（声明 / 稳态）
③ pick-ref        拾取引用（① 出生有效，validCount ≥ 1）
④ ask-registered  ask 卡登记（openAsks ∋ ref-round-<refId>）
⑤ answered        用户作答「原地翻译为中文」且卡已结算（已答四口径之①）
⑥ drive-produced  答案产生驱动（★ 本 Feature 的题眼）
⑦ branch          分支：A 已配置 LLM / B 未配置 LLM（唯一分流依据 = 配置探测判据）
⑧ auto-round      分支 A：AI / 系统自动成回合续流（无需用户按键）
⑨ onboard-resume  分支 B：引导 → 掩码卡 → 用户完成配置 → 配置完成自动续接悬置任务
⑩ terminal        终局（回合结束 / 引导完成）；「静默窗口 = 0 ∧ 死端 = 0」
```

### 2. 三条总判据（AC-SELF-001 逐字）

| 判据 | 机器形态 | 反证（注入 ⇒ 必 FAIL ⇒ 还原 ⇒ PASS） |
|---|---|---|
| **答案不被丢弃** | `answerNotDropped = ⑤ 的答案文本作为「回合输入 ∨ 悬置任务输入」**可判命中**` **∧** `commandSends 递增**不足以**满足` | 把答案路径恢复为「`applyRefAction` 只计数」⇒ **必 FAIL**（复现会话 B） |
| **静默窗口 = 0** | ⑤ 之后**任一**可判时刻都存在驱动者归因（`driverId + timing + 依据`）直到收敛；`静默窗口` = 「既无驱动者归因、又无终态事实、又无可达 next」的区间，**计数必须 0**（窗口定义**单源**） | 注入「答完后清空驱动者」⇒ 静默窗口 ≥1 ⇒ FAIL |
| **死端 = 0** | `nextOf(el)` 双形态（行内 `[data-op]` ∨ 紧随 nextstep 卡）逐环节非空；`deadEnds === 0` | 注入第 6 类阻塞 / 移除铸造期恢复面 ⇒ FAIL（**复用 v5 已有两条反证**） |

### 3. **A/B 双分支的分层接线**（避免跨叶双计数，R-V55-111）

| 分支 | 判据 | 交付叶 | 判据边界（**逐字**） |
|---|---|---|---|
| **A（已配置 LLM）** | ⑤ 之后**答案 ⇒ 驱动**；流内出现 `op.turn` 候选；**机制侧**断言「答案作为悬置/回合输入可判命中 + 可达 next」 | **v55-1**（骨架 + 机制侧） | **不**断言「零按键 ⇒ 自动成回合」（那是端到端，属 v55-3） |
| A（续） | 「**无需用户再敲任何键** ⇒ 自动成回合」+ 留痕三要素可读 | **v55-3** | 独立计数；**不得**与 v55-1 的机制侧断言混池 |
| **B（未配置 LLM）** | ⑤ 之后**系统流主动驱动去配置**（`op.llm-config` 候选，`driverClass: 'deterministic'`，**零 LLM 调用**）；识别侧 | **v55-1**（识别侧）+ **v55-2**（引导内容） | v55-1 只断言「未配置能被识别为终态 + 有驱动者」 |
| B（续，**必判项**） | 掩码卡 → 用户完成配置 → **配置完成自动续接悬置任务** → 续接后回合留痕 | **v55-2** | 反证：删掉自动续接 ⇒ **FAIL**（复现「配完还要重说一遍」） |
| 分流 | `isLlmConfigured`（ADR-V55-006）= **唯一**分流依据；互斥完备 | v55-2（判据）+ v55-3（消费） | 两侧**独立计数**（禁互相掩盖，R-SELF-909） |

### 4. 两面门禁的落点与**零字节**属性

| 面 | 文件 | 运行 | 字节账 |
|---|---|---|---|
| node | `test/s0-self-driven-chain.test.ts` | `npm test`（`node --test dist-test`） | **零 sidepanel 字节** |
| Chromium | `test/ui/s0-self-driven.mjs` | `npm run test:v3` 串行链的一节（**一次一个 Chromium**，`finally` 自清 profile） | **零 sidepanel 字节** |
| 样本 | `test/ui/fixtures/s0-chain.mjs` | 两面共用 | **零 sidepanel 字节** |

- `test/ui/s0-self-driven.mjs` 携带 `export const JUDGEMENTS = [{ id, expectFailPattern }]`（受审标记）⇒ 由 `gate-integrity` 的目录扫描**自动纳入**受审集合，且加入 `V55_NEW_GATE_FILES` 下界声明（改名 / 删除 ⇒ FAIL）。
- **`CHROMIUM_GATES === 9` 不动**（v5 先例：新 Chromium 门禁**只追加**，计数常量**不改**）。

### 5. 两段证伪（FR-SELF-111 / 纪律第 6 条）

每条 S0 判据都要留「注入 ⇒ 实跑 FAIL（声明 `expectFailPattern`）⇒ **逐字节还原**（sha256 前后相同）⇒ 实跑 PASS」两段证据，
日志全量落盘。注入点若被搬走（文件/行变化）**必须重写注入点**，不得留「不再 FAIL 的判据」。

## 后果

**正面**
- S0 从「真机文字记录」升级为**可判回归**：任何未来改动若让「答完静默 / 答案被丢弃 / 死端」回归，门禁当场红。
- 样本单源 + 双面判 ⇒ 不会出现「node 绿、真机红」（v5-2 review BLOCK-03 的教训）被掩盖的场景。
- A/B 分层接线让三个叶各自可在自己的收口轮**全绿**（AC-SELF-026），且**不会**把同一事实断言两次。

**负面 / 代价**
- Chromium 面必须在 **v55-1 就走到分支 B 的「识别侧」**（v55-2 才有引导内容）⇒ 门禁在两叶之间**只增不改**（断言只增纪律的刻意实践）。
- 真面板上的「自动成回合」断言需要 `configured` 状态注入（headless 下写凭据）；落地手法 = **testing seam 注入 llm 状态摘要**（既有 `window.__v3.testing` 家族；**不**新增必需 id、**不**改既有 seam 语义），风险登记见 R-V55-111。

**人工面（不得冒充 PASS）**：主动接手体感 / 是否感觉被突然打断 / 引导文案可读性 / 主动回合等待感 / 读屏（主动 next + consent 来源）/ 双主题 / 320px / 键盘 / 真机 S0 走查 —— 三项并列于 v5 人工面 9 项（**并列不覆盖**）。
