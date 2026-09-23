# ADR-SGO-004: 任务级批量授权（系统聚合计划 + 指纹（逐字节入哈希）+ 一次手势 + 计划外回落 + 特权不入批 + 审计零明文）

## 状态
ACCEPTED

## 背景

**根因 G + 真机（`ty.md`）**：逐条授权链路 = base 权限门 `ask` → plugin `createConfirmBridge`（`security/confirm.ts:84-156`：fail-closed + 单条摘要 + 审计）→ SW `confirm-request`（`service-worker.ts:634-644`）→ 面板 `confirm`（`sidepanel.ts:3837-3845`）→ 既有 `auth` kind（`chat-state.ts:616-622`）。真机 **42 调用 / 42 卡 / 42 批准 / 理由串逐字相同** ⇒ 授权从**判断**退化为**连点**：用户看不到「整批将要写什么」，**无法在写之前否决计划本身**；而每张 `auth` 卡都「合法」，**恰好掩盖了范围漂移**。

**spec 裁决（O-SGO-005 / DC-SGO-005 / FR-SGO-040~050 / 103）**：AI 先出**写入计划**（N 处 目标 + 原文 → 译文）→ **一次 consent 覆盖整批**；**计划指纹**（目标集合 ∧ 动作类型 ∧ 文本对）绑定；计划外**逐条回落**；**特权 op 恒不入批**；**批量变体注入必红**；复用既有 `auth` kind（type-only payload）；审计零明文。**唯一红线级风险 R-SGO-001**。

## 决策

### 1. 计划生成路径（**PD-SGO-005 裁决**）：系统聚合（不是 AI 独立出计划）

**裁决**：计划 = **系统从单条 assistant 消息的 `toolCalls` 聚合**。

- **捕获点**：`runChat` 的 `chat` 回调返回 `ChatResult`（含 `toolCalls`）——base `runner.ts:140-150` 把**同一条 assistant 消息的全部 toolCalls** 一次交给执行循环（`for (const tc of allCalls)`）。`runChat` 在 `chat` 回调里把 `res.toolCalls` 交给 `batch-plan.ts#buildPlan`（纯函数）⇒ 计划在任何写**执行之前**成立。
- **计划成员 = 范围内（`in-scope`）的 `dom set-text` 调用**（目标 = `--ref` 命中 ∨ selector 命中活跃引用，ADR-SGO-002 §2）；范围外调用**不入计划**（走计划外回落 / WIDEN）。
- **阈值**：`N ≥ 2` ⇒ 出计划卡（一次手势覆盖整批）；`N == 1` ⇒ **逐条**（既有路径，语义零改）；`N == 0` ⇒ **不产生卡**（不空弹）（EC-SGO-013）。
- **边界 = 单条 assistant 消息**（确定性）：跨轮的 set-text 各自成计划或逐条，**不跨轮累积**（R-SGO-915）。
- **理由（为什么优于「AI 先出一份独立计划」）**：① 计划 = **真实将写内容**（同一 `toolCalls` 源）⇒ 计划与实际写入**结构性不可漂移**（R-SGO-906 消除）；② **零新工具 / 零新 kind**（复用既有 `set-text` 调用 + `auth` 卡）；③ base runner 已提供全部 `toolCalls`，**base 零 diff**。

### 2. 计划结构与 wire（type-only，复用既有 `confirm-request` / `auth`）

```ts
// background/batch-plan.ts（B 列，纯逻辑）
export interface BatchPlanEntry {
  readonly refNum?: number;              // --ref 命中时的引用序号
  readonly selector: string;             // 目标选择器（合成锚或存储选择器）
  readonly actionType: 'set-text';       // 动作类型（本阶段唯一）
  readonly fromDigest: string;           // 原文（匹配活跃引用的 textDigest，冻结快照）
  readonly toText: string;               // 译文（set-text 的 --text 逐字节）
}
export interface BatchPlan { readonly entries: readonly BatchPlanEntry[]; readonly fingerprint: string; }
```

- **wire 落点**：既有 `confirm-request` 消息的 `question.plan`（type-only；`AskQuestion` 是 base 类型 ⇒ 在 plugin 侧以**扩展字段**承载，运行时校验，**不进 `KIND_SET`**）。**不新增 kind / 宿主**（N-SGO-009/010）。
- **卡** = 既有 `auth` kind（`chat-state.ts:616-622` 的 `confirm` → `auth`）；计划数据经**渲染用字段**（见 §7），**不进 `CardView.payload`**。

### 3. 计划指纹（FR-SGO-042 / **PD-SGO-006 裁决**）：逐字节入哈希、摘要出账

**裁决**：指纹 = `'sha256:' + sha256Hex(canonicalJson(entries.map(e => ({selector:e.selector, actionType:e.actionType, fromDigest:e.fromDigest, toText:e.toText}))))`。

- **逐字节**：三元组（目标选择器 / 动作类型 / 文本对）**不归一化**（不 trim / 不折叠空白 / 不大小写折叠）⇒ 空白改动 ⇒ 指纹变（**不放宽**，R-SGO-906）。
- **摘要出账**：出账 / 审计只记**摘要**（`fingerprint`），**不记原始文本对**（零明文，N-SGO-026）。
- **canonical JSON** = 稳定键序 + 无多余空白（逐字节可复算）。
- **准入判据** = **每一条目**的 key（`selector ∧ actionType ∧ fromDigest ∧ toText` 的 canonical 形式）∈ 已批准计划的**条目键集**（不是只比总哈希）：总哈希用于出账 / 漂移检测，条目键集用于**逐条准入**（§5 计划外回落因此可判）。
- **漂移检测（EC-SGO-014）**：批准时对计划条目**重校验**其目标 ∈ 当前引用解析集合（ADR-SGO-002 读数）；集合变化 ⇒ **显式失败**（不静默按旧指纹放行）+ 重新出计划。

### 4. 一次真实用户手势（FR-SGO-043 / N-SGO-025）

- 批量放行**只能**由用户在既有 `auth` 卡的**批准**按钮上的一次**真实点击**发起（`data-act="approve"` → `handleCardAction` → `confirm-response`）。
- 卡片**不得**由 AI 代答 / 代填 / 自动放行 / 自动展开；**「AI 建议计划即视为同意」的任何变体禁止**。
- 实现：计划审批状态**只在面板的真实点击路径**写入（`confirm-resolved`）；SW 的 `confirmResponder` 只消费面板回传的 allow/deny（既有链路，`service-worker.ts:634-644`）。
- **`RL-06` / OT-⑩ 扩批量变体**：`test/supersession-ledger.test.ts`（`RL-06-consent-no-proxy`）与 `test/op-three-tier.test.ts`（OT-⑩）**扩**批量变体断言并注入必红（注入「AI 自动 allow 计划」⇒ FAIL）；**不替换**既有断言。

### 5. 计划外回落（FR-SGO-044 / EC-SGO-012）

- 任一 `set-text` 的条目键 ∉ 已批准计划 ⇒ **回落逐条确认**（既有 `createConfirmBridge` 单条路径）。
- **一次点击不得放开无限写**：批准的是**确定性条目键集**（含文本对），不是「同形状」的开放集合。
- 计划**被拒**（EC-SGO-010）⇒ 计划内全部不执行 + 留痕记拒绝 + 零死端；计划**中止**（EC-SGO-011）⇒ `cancelled` 终态 + 部分完成留痕 + 零死端。

### 6. 特权 op 恒不入批（FR-SGO-045 / N-SGO-005）

- 批量机制**只识别** `dom set-text`；`op.authorize` / `op.perm.request` 特权 op **永不**进入计划 holder，**永不**被批量放行。
- `tierOf` **单源不改**（`shared/op-table.ts`）；「**SW 永不调用 `.request(`**」不变（`test/capability-wiring.test.ts:51-58`）；批量**不改变档位裁决**。
- **新增反证**：批量路径不触达特权 op（`test/capability-wiring.test.ts` 增断言）。

### 7. 审计零明文 + 计划卡渲染口径（FR-SGO-046 / 050 / N-SGO-026）

| 面 | 口径 |
|---|---|
| **流内 `CardView.payload`** | **不含**计划正文 / 译文；`payload` 仅既有字段（requestId / askKind / prompt[静态模板]） |
| **计划渲染** | 正文以 **UI 渲染文本**呈现：`auth` 卡经**渲染用字段**（NEW：`stream-model.ts` 的 `CardView` 增 `plan?: readonly string[]`，与 `payload` **同级**、**不在 payload 内**）渲染为 **textContent 行**；**不写** `data-*` / 其它 DOM **属性** |
| **凭据形值** | 逐行 `maskTextPayload`（`src/security/redact.ts` re-export）⇒ **掩码**（EC-SGO-019 邻域） |
| **digest / 审计** | 只记 `{type:'confirm', tool:'dom', subcommand:'set-text', decision, fingerprintDigest, entries:N, refNums:[...], fieldNames:[...]}`；**正文 / 译文不进** |
| **静态模板** | 卡文案 = 静态三段模板（对齐 `cards/auth.ts` 头注释：动态生成有把参数写进 trace 的风险） |

- **门禁**：`law8` **36 断言零降级**且必绿；**新增**批量专项零明文断言（`payload` / digest / 审计 / DOM 属性四面零正文命中 + 掩码在位）。

### 8. 中途可中止 + 部分完成（FR-SGO-047）

- 计划可被用户中止 ⇒ `cancelled` 终态（`cards/auth.ts:43-56` 语义保持）；部分完成**如实留痕**（逐条结果计数）；**不谎报整批成功**（EC-SGO-009）。
- 既有 `auth` 6 终态（`approved`/`rejected`/`cancelled`/…）语义**逐字不变**。

### 9. 非批次写入仍逐条批准（FR-SGO-048）

无计划时 `set-text` 仍走缺省 `ask`（`permission.ts:16,157,333` 理由串**逐字不变**）⇒ 回归断言。

### 10. PD-SGO-007 裁决：批量卡展示上限 = **8 行 + 诚实计数行**

- 卡渲染**至多 8 条**计划行，并显示 `共 N 条（显示前 8）`；**纯显示策略**，指纹覆盖全部 N 条，**不改变授权范围 / 不放松判据**。
- 有界展示（防密度爆炸），与「有界纪律」一致。

### 11. 生成路径的机核（新增 node 门禁 `test/batch-consent.test.ts`）

| 判据 | 内容 | 反证 |
|---|---|---|
| `BC-1-build` | `buildPlan(toolCalls, refs)`：N≥2 出计划 / N==1 逐条 / N==0 不出；仅 in-scope set-text | 注入范围外条目入计划 ⇒ FAIL |
| `BC-2-fingerprint` | 指纹 = 逐字节入哈希；空白改动 ⇒ 指纹变 | 归一化后判相等 ⇒ FAIL |
| `BC-3-admit` | 计划内条目键 ∈ 已批准集 ⇒ 放行；**计划外 ⇒ 逐条回落** | 计划外条目被放行 ⇒ FAIL |
| `BC-4-drift` | 批准前目标集合漂移 ⇒ 显式失败 + 重新出计划 | 漂移仍按旧指纹放行 ⇒ FAIL |
| `BC-5-privileged` | 特权 op 不入批 | 把 `op.authorize` 塞入计划 ⇒ FAIL |
| `BC-6-zero-plaintext` | 审计 / payload / digest / DOM 属性零正文 | 正文写入四面之一 ⇒ FAIL |
| `BC-7-abort` | 中止 ⇒ `cancelled` + 部分完成留痕 + 零死端 | 中止后仍继续写 ⇒ FAIL |

## 后果

**正面**
- 授权从**连点**回到**判断**：用户先看到「整批将要写什么」并在写前可否决计划本身（US-SGO-003/004）。
- 计划 = 真实 `toolCalls` ⇒ 计划与写入**同源**，R-SGO-906 结构性消除。
- **零新增载体**（复用 `auth` / `confirm-request` / type-only 字段）；法八四面不退化。
- 特权 op / consent 红线**不被侵蚀**（一次真实手势 + 计划外回落 + 注入必红）。

**负面 / 代价**
- `security/confirm.ts` 需从「单条桥」升级为「计划感知桥」（B 列，不计账）。
- `toolCalls` 捕获要在 `runChat` 的 `chat` 回调里做（一处），并需处理「跨轮 / 多工具」边界。
- `CardView` 增一个渲染用字段（A 列少量字节）；计划渲染路径需专项零明文断言。
- 计划与 `--ref` 解析的交互：计划条目的目标解析须与 ADR-SGO-003 的锚定一致（同源 selector）。

**被否决的替代**
- **AI 先输出独立「计划」消息**（PD-SGO-005 ②）：需新载体 / 可能与真实写入漂移（R-SGO-906）。
- **时间窗内同范围自动放行**（NG-SGO-017）：时间与范围都难判，实质弱化红线⑥。
- **只展示不放行 / 逐条仍需点击**：不解 42 连点（US-SGO-004 未达）。
- **把计划正文写进 `payload` / digest / 审计**（N-SGO-026）：法八即红（R-SGO-905/914）。

**判据锚**：`test/batch-consent.test.ts` · `test/supersession-ledger.test.ts`（RL-06 扩批量变体）· `test/op-three-tier.test.ts`（OT-⑩ 扩）· `test/capability-wiring.test.ts`（特权不入批）· `test/ui/law8-plaintext.mjs`（零明文 + 掩码）· `test/ui/s0-self-driven.mjs`（S0′-7/8 批量分支）。
