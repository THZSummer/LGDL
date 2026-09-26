# ADR-ADN-007: S0''' 双面验证设计（四支线 + 注入反证族 · 只加断言）

## 状态
ACCEPTED（承父 spec §5.9 S0''' FR-ADN-080~085 · §9.1 AC-ADN-001 · §9.4 人工面 · §11 DC-ADN-014 · R-ADN-012/909）

## 背景

LLM 输出**不确定** ⇒ 门禁**不能**直接断言「模型说了什么」。判据必须落在**纯函数校验器 + 注入式反证**，且**真源切片**（读生产模块，不读测试自建常量）。Chromium 面只允许**加断言不加文件**（`CHROMIUM_GATES === 9` 不动）。

## 决策

### ① 四支线（对作者裁决的机核化）

| 支线 | 场景 | 期望 | 面 |
|---|---|---|---|
| **A 主线** | 已配 LLM ∧ `done` ∧ AI 产出合法候选 | 候选过 5 道校验 ⇒ 注入 chips（替代陈旧 ref-action chip）∧ ≤3 ∧ 单卡 ∧ 终端恒最末 | node（新门禁）+ Chromium（`s0-self-driven.mjs`） |
| **B 被拦** | 已配 ∧ 非法候选（幻觉 op / 越界 ref / gesture op / param 越界 / label 越界） | 逐类 `blocked=<code>` + **可读留痕**（零明文）∧ **不渲染为 chip** ∧ 注册表兜底 + 终端 | node + Chromium |
| **C 未产出** | 已配 ∧ 无块 / 解析失败 / 空数组 | 零 `aiNext` ⇒ 确定性注册表产卡（含 floor） | node |
| **D 未配置** | 未配 LLM | 零候选产出（**零网络**）+ 确定性 + 终端（现状逐字） | node |

`S0'''-1~10` 逐步映射：1 结构可判（注入样本）/ 2 `opId ∈ OP_IDS ∧ tier ≠ gesture` / 3 四类各 `admit=false` + 可读行 / 4 替换 + ≤3 + 单卡 / 5 终端恒在（任意支线）/ 6 未配纯确定性 / 7 `KIND_SET` 40 + 12 kind + 零宿主 + `ACT_TO_OP` 6 / 8 `admit=true ∧ press=blocked:tier`（confirm）/ 9 提案不耗预算 / 10 留痕三要素 + 零明文。

### ② node 面 = 新门禁 `test/ai-next-candidate.test.ts`（叶1 落地）

| ID | 判据 | 反证（`expectFailPattern`） |
|---|---|---|
| AI-N-1 | 解析：尾随 `next` 块 + 严格 JSON 数组；**取最后一条 assistant 文本的最后一块**；无块/非数组 ⇒ `[]` | 注入中间轮块 / 非数组 ⇒ 判据非恒真 |
| AI-N-2 | 校验链**顺序即优先级**（①→②→③→④）+ 真值表（auto/confirm/gesture/未知） | 未知 op + 越界 ref ⇒ 只报 `unknown-op`；顺序交换 ⇒ 必红 |
| AI-N-3 | `ref` 语义（`refId` / `ref_<n>` 命中本回合快照 ∧ `valid`；缺席 pass） | 越界 / 失效 / 裸数字 ⇒ `blocked=ref`（裸数字 ⇒ 必红） |
| AI-N-4 | `params` 与 `AskSpec` 相容真值表 | `params` 于 `ask===undefined` 的 op ⇒ `blocked=param`；数组类型 ⇒ 必红 |
| AI-N-5 | **判定分层**：`confirm` ⇒ `admit=true ∧ press=blocked:tier`；`gesture` ⇒ `admit=false` | 把 confirm 也拒 / 把 gesture 放行 ⇒ 各必红 |
| AI-N-6 | **注入反证族**（见 ③） | 逐条 |
| AI-N-7 | **真源切片 + 三段控制**（`ok`/`violated`/`n/a`）+ 禁恒真 | 删属性 / 换口径 ⇒ 必红 |
| AI-N-8 | 零新增载体：`KIND_SET` 40 / 12 kind / 零宿主 / `ACT_TO_OP` 6 | 注入第 41 / 第 13 / 第 7 行 ⇒ 必红 |
| AI-N-9 | `DRIVER_DECLS_SRC` **12↔12** 双向包含 + `evidence=session.aiNext` 登记 + `chipsFor` 权威 + 静态 `chips` 非空 | 缺声明 / 多声明 / evidence 漂移 ⇒ 必红 |
| AI-N-10 | 零新 LLM / 零第二阈值：`background/ai-next.ts` 纯（无 DOM/时钟/IO/`chrome`）+ `recommend.ts` 仍 zero-`fetch`/`chrome`/时钟 + 无第二份六常量 | 注入 `fetch(` / 第二份阈值 ⇒ 必红 |
| AI-N-11 | `ask` descriptor 与 `ops.ts#IMPL` 的 `params===null` **逐行一致**（提升一致性） | 表漂移 ⇒ 必红 |

### ③ 注入反证族（**必须实跑**：注入 → FAIL 声明 `expectFailPattern` → 逐字节还原 sha256 前后相同 → PASS）

1. AI 产 **`gesture`** op 候选（`op.authorize` / `op.perm.request`）⇒ **必拦**（`blocked=tier`；连提案都不进 chips）；
2. **幻觉 op**（`op.ghost`）⇒ **必拦**（`blocked=unknown-op`）；
3. **删兜底**（删 `free-input` provider 的恒真 `when` 或删 floor）⇒ free-input 缺失 ⇒ **必红**（`r8-open-next-entry` / `free-input-next` / `no-dead-end` 判据可 FAIL）；
4. **AI 代答 `confirm` consent**（把 AI 候选的 `confirm` 路径直连执行 / 自动提交，绕过既有 consent 卡）⇒ **必红**（`op-three-tier` / `capability-wiring` + 新门禁的「不新增执行体」源码切片）。
   - 另加第 5 类补充反证：**越界 ref / param** ⇒ 各必拦。

### ④ Chromium 面（**只加断言不加文件**）

| 门禁 | 增量 |
|---|---|
| `test/ui/s0-self-driven.mjs` | S0''' 四支线断言（AI 合法 ⇒ chips 替换陈旧候选；非法 ⇒ 可读 `blocked=` 行；未产出/未配 ⇒ 确定性 + 终端恒在）；驱动经新增 **`window.__v3.testing.aiNext(...)`** 测试缝注入已校验候选（**测试缝，非生产入口**） |
| `test/ui/recommendation.mjs` | 「AI 在场 ⇒ 无陈旧 ref-action chip」「≤3」「单卡」「终端恒最末」；AI 缺席 ⇒ 陈旧 chip 照旧 |
| `test/ui/law8-plaintext.mjs` | AI 候选 label / 留痕行的零明文面（**只加断言**） |
| `test/ui/journey.mjs` / `binding.mjs` | **零改动**（保护段 `keep`；见 ADR-ADN-009/010） |

### ⑤ 人工面如实登记（不冒充 PASS）

M1 AI 候选真机相关性 / M2「两张皮是否消失」体感 / M3 数量密度观感 / M4 读屏可用性 / M5「被拦」体感 —— **逐项 `⏳ 未执行`**（headless 不可合成；机核只证「候选经校验注入 + 替换陈旧候选 + 终端恒在」）。

## 后果

- 判据**可 FAIL**（三段控制 + 双向反证 + 注入实跑）⇒ 不落 R-ADN-909「脚本绿而非链路可判」；
- **代价**：1 枚新 node 门禁文件（入 `gate-integrity` 受审下界，只增）+ 三处 Chromium **断言增量**（零新文件）；
- **边界**：Chromium 的 `aiNext` 注入是**测试缝**（`window.__v3.testing`），不构成生产第二入口（N-ADN-028）。
