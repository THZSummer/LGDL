# Feature Specification：specs-tree-nda-1-next-tool-channel（NDA-1 `next` 工具产出通道 + 无条件触发 + 5 道校验链接入：机制核心）

> **文档定位**: SDDU 需求规范（**叶级切片**）— 父规范 `../spec.md`（v1.0）在**本叶**的适用范围与承载条文；作为本叶 plan 阶段的输入
> **前置依赖**: 父 `../discovery.md`（v1.0）+ 父 `../spec.md`（v1.0）§5.1~§5.5 / §5.9（S0'''' 主线侧）/ §5.12（110 / 111 / 114~118 / 121）/ §5.13 / §5.14.1（B 列归因）/ §9 / §12 / §13 / §14.3
> **创建人**: SDDU Spec Agent
> **创建时间**: 2026-09-27
> **版本**: v1.0
> **更新人**: SDDU Spec Agent
> **更新时间**: 2026-09-27
> **更新说明**: 初始创建（NDA-1 叶规范：`next` 工具注册（schema）+ `hooks.intercept` 接线与捕获（合成 `ToolResult`）+ 5 道校验链保留接入 + 判定分层保持 + 触发范围无条件 + `ai-next` 规则位等价重锚 + 围栏块通道替换 + `parity` 新条目 + `ai-next-candidate` 门禁改写 + S0'''' 主线 / 支线 B node 面）

---

## 1. 元数据

| 字段 | 值 |
|------|-----|
| Feature ID | `specs-tree-nda-1-next-tool-channel`（父 = `specs-tree-web-cli-plugin-v55-f-next-drive-accuracy`，ROADMAP **F-37** / **v0.11.4**） |
| 名称 | **NDA-1 `next` 工具产出通道 + 无条件触发 + 5 道校验链接入**：回合结束 ⇒ LLM 调用 **`next` 工具（function calling）** ⇒ 基座 **`hooks.intercept`** 捕获（返回合成 `ToolResult` 跳过真实 dispatch）⇒ **5 道校验**（① opId 在册 ② `tierOf` 三档（`gesture` 恒拒）③ ref 有效 ④ param 在 `AskSpec` 内 ⑤ 越界/非法**丢弃 + 留痕**）⇒ 接受候选经**既有 `chat-result.aiNext` type-only 加法字段**装配 ⇒ chips（≤3）；**触发无条件**；**围栏块通道替换**；**判定分层保持**（`admitCandidate` / `pressDecision`）；**零改基座 / 零新增 kind** |
| 优先级 | P0（本叶 = **首叶 / 底座叶 + 机制核心**，叶2 依赖本叶已建立的工具通道与校验链接入） |
| 目标版本 | v0.11.4（承父；**每叶收口实测重登记**，父 FR-NDA-144） |
| 交付顺序 | **1 / 2**（首叶）；`dependsOn: []` |
| 深度 / 类型 | depth=2；`leaf: true` |
| 承载父 FR | **GOV 001~007** · **TOOL 010~020** · **CAPTURE 021~028** · **VERIFY-KEEP 030~036** · **UNCOND 040~045** · **FENCE 080~083** · **S0'''' 100~103 / 105 / 106（主线侧）** · **SUPERSEDE 110 / 111 / 114~118 / 121** · **GATE 130~137（改写门禁 + 反证族 + 对账表骨架）** · **VOL 140~145（B 列归因）**（共 **≈60 条父 FR 切片**） |
| 相关干系人 | 作者（唯一真实用户 + 唯一决策者）；编排器；下游 @sddu-plan / @sddu-tasks / @sddu-build / @sddu-review / @sddu-validate（**本叶承接 build/review/validate**） |

---

## 2. 上下文与边界

### 2.1 上下文

父规范 §2.2 的**机制根因（产出机制 / 触发范围）+ 安全闸保留面**全部落在本叶：F-36 用「文本 `next` 围栏块 + 正则解析」冒充函数调用（`ref-context.ts:52-59` / `ai-next.ts:58-87`；plan `:127-133` 显式否决 tool-call）；触发只在有引用分支（`ref-context.ts:97-100`；`ai-next` 骑 `ref-action` 位 `providers.ts:162-175`）。**关键事实**：基座 function calling + **`hooks.intercept` 缝**早已就位（`llm.ts:23-75,82-197` + `runner.ts:50-55,158-164`，注释**逐字**「next-actions 胶囊由此接入」），插件已传 `deriveTools()`（`service-worker.ts:986-991`）但**未 wire `intercept`**（`:1045-1059` 只 `onToolDone`）。

**本叶的验收锚**：把「LLM 结构化产出 next」从「提示词软约定」换成**模型原生工具调用**（`next` 工具 + `intercept` 捕获），并保证**触发无条件**、**校验链与判定分层零误伤**、**围栏块通道被替换而非并存**，且**在未配置 / 异常兜底面不被破坏的前提下**（本叶不动未配置引导 / 提醒 / 异常兜底 / 首开）。

### 2.2 范围（做 / 不做）

| 做 | 依据 |
|---|---|
| **`next` 工具注册**（`LlmToolDef{name:'next',description,parameters}`；schema `{candidates:[{opId,label,ref?,params?}]}`，`maxItems ≤3`；description 三约束） | 父 FR-NDA-010~014 |
| **`hooks.intercept` 接线与捕获**（`tc.name==='next'`；合成 `ToolResult` 跳过真实 dispatch；**不动** `onToolDone`；**零改基座**） | 父 FR-NDA-021~024 |
| **5 道校验链保留接入**（输入从围栏块解析项 → **工具参数项**；顺序即优先级；纯函数） | 父 FR-NDA-030~036 |
| **判定分层保持**（`admitCandidate` 接受层 / `pressDecision` 按下层 diff=0；共享 `tierOf` 单源） | 父 FR-NDA-033 / 036 |
| **触发范围无条件**（不再只并入有引用分支；`NEXT_CONTRACT_GUIDANCE` 停止） | 父 FR-NDA-015 / 040~041 |
| **`ai-next` 规则位等价重锚**（不再骑 `ref-action` 独占；独立通道；`NEXTSTEP_PRIORITY` 等价重锚） | 父 FR-NDA-042 / 114 |
| **围栏块通道替换**（`FENCE` / `lastNextFenceBody` / `parseAiNextItems` 停止承载；**单一产出通道**） | 父 FR-NDA-080~083 |
| **`chat-result.aiNext` 装配保持** + `DRIVER_DECLS_SRC` / 留痕保持（`evidence` 与工具同源；零明文） | 父 FR-NDA-016 / 019 / 026 / 028 |
| **零新 LLM 往返（主链）** + 未配置 ⇒ 不下发 `next` 工具 | 父 FR-NDA-017 / 018 |
| **`parity` 新 `pluginExtra` 条目**（reason + basis 非空；旧条目逐字保留） | 父 FR-NDA-020 / 117 |
| **`ai-next-candidate` 门禁改写**（等价或更强；`assertionsRemoved = 0`） | 父 FR-NDA-082 / 116 |
| **S0'''' 主线 A / 支线 B 的 node 面** + 注入反证族（工具通道侧） | 父 FR-NDA-100~103 / 105 / 106 |
| **B 列归因**（捕获 / 校验在 `background.js`，不计 sidepanel 账本）+ A 列薄接线预算 | 父 FR-NDA-024 / 140~145 |

| 不做 | 依据 |
|---|---|
| **未配置确定性「去配置 LLM」引导 / 自由输入分相** | 父 §5.6 → **叶2**（`specs-tree-nda-2-fallback-and-gates`） |
| **提醒补一次（有界）/ LLM 异常判定 / 系统兜底推荐** | 父 §5.7 / §5.8 → 叶2（本叶只保证「捕获结果可判」与「未产出可判」） |
| **首开（open / ready）边界落地** | 父 §5.10 → 叶2（本叶**不动**首开入口） |
| **体积终态重登记 + 等价重锚 + 保护段决策 + X-NDA 台账终态** | 父 §5.13 / §5.14 → 叶2（本叶只立**改写门禁 + 反证族 + 对账表骨架 + B 列归因**） |
| **在 `recommend.ts` 内直接调用 LLM / 新 op / 新 kind / 新宿主** | 父 NG-NDA-009 / 012 |
| **`pressCandidate` / `driveAnsweredTurn` / `turn-queue.ts` 语义改动** | 父 NG-NDA-001 / 006 |
| **`next` 工具触达真实写 / 双产出通道（围栏块并存）** | 父 NG-NDA-012 / 013 |

### 2.3 与父规范的关系

本叶是父规范的**实施切片**：FR 编号**沿用父编号**（不另造叶内 FR 编号；叶内仅用 `LG-NDA-1-###` 标目标）。**父 FR 在本叶的承载切片 = §4 表**；本叶不引入父规范之外的需求；父 §11 的 DC-NDA-001~014 全部适用（尤其是 **DC-NDA-002「工具 schema」/ DC-NDA-003「intercept 落点」/ DC-NDA-006「围栏块替换」/ DC-NDA-010「规则位等价重锚」/ DC-NDA-013「B 列优先」**）。

---

## 3. 目标与非目标（本叶）

### 3.1 目标

| # | 目标 | 父 FR |
|---|---|---|
| **LG-NDA-1-001** | **`next` 工具产出通道**（工具注册 + schema + 纯协议工具，不触达真实写） | FR-NDA-010~014 |
| **LG-NDA-1-002** | **`hooks.intercept` 捕获与装配**（合成 `ToolResult`；不动 `onToolDone`；零改基座） | FR-NDA-021~028 |
| **LG-NDA-1-003** | **5 道校验链 + 判定分层保留接入**（工具参数项；顺序即优先级；`tierOf` 单源；`gesture` 恒拒；`confirm` 可提案不可按下） | FR-NDA-030~036 |
| **LG-NDA-1-004** | **触发范围无条件 + 规则位等价重锚**（不再只并入有引用分支；不再骑 `ref-action` 独占；`NEXTSTEP_PRIORITY` 等价重锚） | FR-NDA-015 / 040~045 / 114 |
| **LG-NDA-1-005** | **围栏块通道替换**（单一产出通道；提示与解析停止承载；校验链保留） | FR-NDA-080~083 |
| **LG-NDA-1-006** | **载体 / 兼容纪律**：`chat-result.aiNext` 加法字段保持；`KIND_SET` 40 / 12 kind / 零宿主 / `ACT_TO_OP` 6 逐字不动；载荷缺席 ⇒ 现状逐字 | FR-NDA-016 / 019 |
| **LG-NDA-1-007** | **可机核 + 门禁 + 体积**：`ai-next-candidate` 改写（等价或更强）+ `parity` 新条目 + S0'''' 主线 / 支线 B node 面 + 注入反证族 + B 列归因 | FR-NDA-020 / 082 / 100~103 / 105 / 106 / 116 / 130~137 / 140~145 |

### 3.2 非目标

| # | 不做 | 父依据 |
|---|---|---|
| **LNG-NDA-1-001** | 未配置确定性引导 / 自由输入分相 / 系统兜底推荐「配置新 LLM」 | §5.6 / §5.8 → 叶2 |
| **LNG-NDA-1-002** | 提醒补一次（有界）/ 异常判定闭集 | §5.7 / §5.8 → 叶2 |
| **LNG-NDA-1-003** | 首开（open / ready）边界落地 / `PD-NDA-001` 登记 | §5.10 → 叶2 |
| **LNG-NDA-1-004** | 体积终态重登记 + 等价重锚 + 保护段决策 + X-NDA 台账终态 | §5.13 / §5.14 → 叶2 |
| **LNG-NDA-1-005** | 新增 kind / 新 op / 新宿主 / 在 `recommend.ts` 内触达 LLM | 父 NG-NDA-009 / 012 |
| **LNG-NDA-1-006** | `pressCandidate` / `driveAnsweredTurn` / `turn-queue.ts` 语义改动 | 父 NG-NDA-001 / 006 |
| **LNG-NDA-1-007** | 双产出通道 / `next` 工具有执行体 | 父 NG-NDA-012 / 013 |
| **LNG-NDA-1-008** | base / content / pick-layer / 判定链（`policy.ts` / `auto-authorize.ts`） | 父 NG-NDA-005 / 007 / 008 |

---

## 4. 功能需求（本叶承载的父 FR）

| 父 FR | 叶内要点（切片口径） | 优先级 |
|---|---|---|
| **FR-NDA-001~006** | 父级结构 / 纪律 / 红线编成 / 主流程零扩张 / 不改基座（**共享面在本叶一次做完**：改写门禁 / 反证族 / 对账表骨架） | P0 |
| **FR-NDA-007** | 编排裁决落位（父 §11 已 `ruled`；本叶引用） | P0 |
| **FR-NDA-010** | `next` 工具注册（`LlmToolDef`）⇒ 出现在 `deriveTools()`；替换围栏块口述 | P0 |
| **FR-NDA-011** | 工具 schema `{candidates:[{opId,label,ref?,params?}]}`；`maxItems ≤3`；`enum` 由 `OP_IDS` 单源派生 | P0 |
| **FR-NDA-012** | **schema 是软约束，运行时 5 道校验链是权威**（反证：schema 合法但 param 越界 ⇒ 必拦） | P0 |
| **FR-NDA-013** | `description` 三约束（仅回合结束 / 仅已注册 op / 不执行页面操作）；零明文 | P0 |
| **FR-NDA-014** | 纯协议工具（无执行体；合成 `ToolResult`；不触达真实写 / 网络 / 时钟） | P0 |
| **FR-NDA-015** | 无条件下发（配置 LLM ⇒ 工具面始终含 `next`） | P0 |
| **FR-NDA-016** | 零新增 kind / 零宿主；候选仍经既有 `chat-result.aiNext` 加法字段 | P0 |
| **FR-NDA-017** | 零新增 LLM 往返（主链；工具调用在同一次回合内） | P0 |
| **FR-NDA-018** | 未配置 ⇒ 不下发 `next` 工具 / 零网络 | P0 |
| **FR-NDA-019** | 载荷只增不改；`aiNext` 缺席 ⇒ 现状逐字 | P0 |
| **FR-NDA-020** | `parity` 新 `pluginExtra` 条目（reason + basis 非空）；`toolCount` 增量 | P0 |
| **FR-NDA-021** | `hooks.intercept` 接线（新增；不动 `onToolDone`） | P0 |
| **FR-NDA-022** | 捕获判据 `tc.name === 'next'`；解析失败 ⇒ 视为未产出（不中断回合） | P0 |
| **FR-NDA-023** | 合成 `ToolResult` 跳过真实 dispatch；零改基座 | P0 |
| **FR-NDA-024** | 位置 = SW 侧（B 列优先）；面板只接收已校验候选 | P0 |
| **FR-NDA-025** | 同回合多次 `next` 调用合并口径（取最后一次或等价；≤3；单源） | P1 |
| **FR-NDA-026** | 装配到 `chat-result{done, aiNext?}`（替换围栏块解析路径） | P0 |
| **FR-NDA-027** | 校验先于任何装配 / 渲染（未校验候选不得进 chips） | P0 |
| **FR-NDA-028** | 留痕三要素（`evidence` 与工具同源；零明文）+ `blocked=` | P0 |
| **FR-NDA-030** | 5 道校验链整体保留（纯函数；顺序即优先级） | P0 |
| **FR-NDA-031** | ① opId 在册（9）⇒ 未知 `unknown-op` | P0 |
| **FR-NDA-032** | ② `tierOf` 单源三档；`gesture` 恒拒 | P0 |
| **FR-NDA-033** | ②' `confirm` 可提案；consent 须用户答；AI 不可自动按下 | P0 |
| **FR-NDA-034** | ③ ref 有效（读既有 `ref-store`） | P0 |
| **FR-NDA-035** | ④ param 在 `AskSpec` 内 | P0 |
| **FR-NDA-036** | ⑤ 丢弃 + 可读留痕（零明文；不死端）+ 判定分层保持（`admitCandidate` / `pressDecision` diff=0） | P0 |
| **FR-NDA-040 / 041** | 触发无条件；产出提示不再限定有引用分支；`NEXT_CONTRACT_GUIDANCE` 停止 | P0 |
| **FR-NDA-042** | `ai-next` 规则位等价重锚（独立通道；`NEXTSTEP_PRIORITY` 重锚非放宽） | P0 |
| **FR-NDA-043** | 时机仍 `'idle'`（**零新增触发词**；DT-2/DT-3 恰 5 不动） | P0 |
| **FR-NDA-044 / 045** | 已配置但未产出 / 非法被拦 ⇒ 确定性兜底；无死端（本叶保证「捕获与校验不引入死端」） | P0 |
| **FR-NDA-080 / 081** | 围栏块替换（单一通道；提示 / 解析停止承载；校验链保留） | P0 |
| **FR-NDA-082** | `ai-next-candidate` 门禁改写（等价或更强；断言只增） | P0 |
| **FR-NDA-083** | 「零新 LLM 往返」契约仍成立（同回合内） | P0 |
| **FR-NDA-100~103 / 105 / 106（主线侧）** | S0'''' 全链机器化（**主线 A + 支线 B node 面**）+ 四条硬断言 + 注入反证族 + 判据禁恒真 / 真源切片 + 提醒 / 兜底链确定性可判（**本叶只保证「捕获 / 校验 / 未产出」段可判**） | P0 |
| **FR-NDA-110 / 111** | X-NDA-1 / X-NDA-2 取代（产出机制 / 触发范围）台账 old→new | P0 |
| **FR-NDA-114~118** | X-NDA-5 规则位等价重锚 / X-NDA-6 保留 9 项 / X-NDA-7 门禁改写 / X-NDA-8 `parity` 重锚 / X-NDA-9 时机保持 | P0 |
| **FR-NDA-121** | X-NDA-12「零新 LLM 往返」契约保持（未发生取代） | P0 |
| **FR-NDA-130~137** | 断言只增 / 反证实跑 / 台账骨架 / **改写门禁入 `gate-integrity` 下界** / 串行纪律 / `sw-op-mirror` | P0（133 保护段 / 升级面终态由叶2 收） |
| **FR-NDA-140~145** | 分列预算 / 距档结论 / 冻结面零容差 / **B 列归因（不计账）** / 叶1 重登记 | P0 |

---

## 5. 非功能需求（本叶相关）

| 父 NFR | 叶内口径 |
|---|---|
| **NFR-NDA-001** | `dist/sidepanel.js` ≤ 生效上限；判定 = 公式唯一（`record-only` cap）；**本叶 A 列薄接线 + B 列主体** |
| **NFR-NDA-002 / 003** | 特权 op 恒 `gesture`（连提案都拒）；consent / `gesture` 不得被 AI 代答（含 `confirm` 档） |
| **NFR-NDA-004** | 法八四面零明文（候选 label / params / **工具参数** / 留痕不回显值） |
| **NFR-NDA-005** | base 零 diff（**只复用** function calling + `hooks.intercept`）+ 判定链零触碰（`zeroDiffFiles` 9 项） |
| **NFR-NDA-006** | 校验链不得放松既有 fail-closed 方向（引用判定 3 结果 / 档位语义 / `safety` 抑制） |
| **NFR-NDA-007** | 零新增载体（`KIND_SET` 40 / 12 kind / 零宿主 / `ACT_TO_OP` 6） |
| **NFR-NDA-008** | `recommendNextStep` 保持 pure；真值白名单 7 / 模块白名单 5 不动 |
| **NFR-NDA-009** | 捕获 / 校验器可机核（纯函数 + 双向反证 + 注入必红 + 三段控制禁恒真 + 真源切片） |
| **NFR-NDA-011** | 在飞不产卡（`pending` 硬门）不退化 |
| **NFR-NDA-012** | 门禁串行 / 无新依赖 / 不改 `opencode.json` |
| **NFR-NDA-013** | 扩展点固定 / 单源（一个 `next` 工具 + 一处 `intercept` + 一个校验器 + 一个 `tierOf`） |
| **NFR-NDA-014** | 判定分层可判（`confirm` 情形 `admit=true ∧ press=false`） |
| **NFR-NDA-015** | **主链**零新增 LLM 往返 / 零新增网络 |
| **NFR-NDA-016** | 留痕可判且零明文（三要素 + `blocked=`；两值可判） |

> 本叶**不承载** NFR-NDA-010（零死端终态）的**终态断言**（未配置引导 / 提醒 / 系统兜底属叶2）；但**不得**使其回退（FR-NDA-044 / 045 / 115）。

---

## 6. 边界情况（本叶相关）

| 父 EC | 叶内口径 |
|---|---|
| **EC-NDA-001** | 幻觉 opId ⇒ 拒 + `blocked=unknown-op`；不死端（本叶只保证「非法不渲染」） |
| **EC-NDA-002** | `gesture` op ⇒ 恒拒（连提案都拒）+ 留痕 |
| **EC-NDA-003** | `confirm` op ⇒ 接受为 chip；点击 ⇒ 既有 consent 卡；不可自动按下 |
| **EC-NDA-004** | 越界 ref ⇒ 拒 + 留痕 |
| **EC-NDA-005** | param 越界 ⇒ 拒 + 留痕 |
| **EC-NDA-006** | AI 产出多条候选 ⇒ 取前 N（≤3）+ 截断 |
| **EC-NDA-014** | 同回合多次 `next` 工具调用 ⇒ 取最后一次（或等价）；≤3；单源 |
| **EC-NDA-015** | `next` 工具参数解析失败 / 非法 JSON ⇒ 视为未产出；**不抛错中断回合** |
| **EC-NDA-016** | 体积越限 ⇒ 显式重登记 / EC 升档路径（本叶 B 列归因 + 叶1 重登记） |
| **EC-NDA-017** | 注入第 41 个 `KIND_SET` / 第 13 kind / 新宿主 ⇒ 必红 |
| **EC-NDA-018** | AI 代答 / 自动提交 `confirm` consent ⇒ 必红 |
| **EC-NDA-019** | 未配置仍产出 AI 候选 / 已配置终端被删 ⇒ 必红（本叶保证「未配置不下发工具」） |
| **EC-NDA-020** | 围栏块「影子产出」残留 ⇒ 必红（单一产出通道） |
| **EC-NDA-022** | AI 候选 label / 工具参数含明文 ⇒ 法八四面零明文 |
| **EC-NDA-025** | `KL-N-10` flake ⇒ 隔离复跑 ≥2 + 如实记录 |

---

## 7. 验收锚点（本叶 → 父 AC）

| 父 AC | 本叶判据 |
|---|---|
| **AC-NDA-001** | S0'''' 主线 A + 支线 B 的 node 面（Chromium 面只看叶2 终态；本叶**不**新增 Chromium 文件） |
| **AC-NDA-002** | `next` 工具产出通道（注册 / schema / description / 纯协议工具） |
| **AC-NDA-003** | `hooks.intercept` 捕获（不动 `onToolDone`；合成 `ToolResult`；SW 侧；`aiNext` 装配） |
| **AC-NDA-004** | 5 道校验链 + 判定分层保留（四类注入反证 + 分层真值表） |
| **AC-NDA-005** | 触发无条件（无引用回合仍驱动）+ 规则位等价重锚 + 时机恰 5 |
| **AC-NDA-010** | 围栏块通道替换 + `ai-next-candidate` 门禁改写（断言只增） |
| **AC-NDA-011** | 首开语义不被本叶改动（本叶不动首开入口；零 LLM 往返） |
| **AC-NDA-012** | 自动按下路径 diff = 0（`requestTurn(` 恰 1 优先保持） |
| **AC-NDA-013** | 留痕三要素 + 零明文（`evidence` 与工具同源） |
| **AC-NDA-014** | 法八四面零明文（含工具参数） |
| **AC-NDA-015** | 在飞语义不变（`pending` 不产卡） |
| **AC-NDA-016** | `parity` 新条目（reason + basis 非空）+ 旧条目逐字保留 |
| **AC-NDA-017** | 未配置 ⇒ 不下发 `next` 工具 / 零网络 |
| **AC-NDA-018** | F-35 输入面不回归（free-input / `op.turn` 槽 / `requestTurn(` 恰 1 不被本叶改动） |
| **AC-NDA-021** | 反证实跑 + 逐字节还原（工具通道侧五类） |
| **AC-NDA-024** | 改写门禁入 `gate-integrity` 下界（只增）；`CHROMIUM_GATES === 9` 不动 |
| **AC-NDA-026** | 本叶相关等价重锚（`recommendation-sources` 规则位 / `driver-quadruple` / `op-wiring` / `parity`） |
| **AC-NDA-027 / 028** | 冻结面零容差 / B 列归因 + A 列薄接线预算（叶1 收口重登记） |
| **AC-NDA-029 / 030 / 031** | base 零 diff / 零新增载体 / `recommend.ts` 仍 pure + 主链零新 LLM |
| **AC-NDA-032** | 人工面如实登记（本叶相关：机制换轨体感） |

---

## 8. 交付与执行

### 8.1 上游依赖

- 父 `../spec.md`（v1.0）+ `../discovery.md`（v1.0）+ `../state.json`
- **F-36 两叶 `validated` 产物**（`ai-next.ts` 5 道校验链 / `admitCandidate` 分层 / `ai-next` provider / `chat-result.aiNext` / `ai-next-candidate` 门禁）—— **被修正对象 + 保留资产来源**（只读 + 显式取代登记）
- F-35 两叶 `validated` 产物（free-input / floor / `op.turn` 槽 / `requestTurn(` 恰 1 —— 只读复用）
- **R8 `38565ac`**（`maybeRecommendOpenEntry` 复用 `'idle'`；体积 604,602）—— 只读复用；其产物**零改写**
- v5.5 / v5 / v4.5 / v4 产物（`pressCandidate` / `driveAnsweredTurn` / 三档清分 / 护栏六常量 / 留痕三要素 / next 注册表契约 v2 / op 三档 / 12 kind / 零宿主）
- **基座 `packages/web-cli-base/**`**（`llm.ts` `LlmToolDef`/`WebCliToolCall` + `runner.ts` `hooks.intercept`）—— **只读复用、零 diff**（硬红线）
- 仓库现状：`feature/web-cli-plugin` @ `a75466a`，本叶 plan 起点的 HEAD

### 8.2 下游 consumer

- **叶2** `specs-tree-nda-2-fallback-and-gates`（依赖本叶已建立**工具通道 + `intercept` 捕获 + 5 道校验链接入 + 围栏块替换**，再收未配置引导 / 提醒 / 异常兜底 / 首开边界 / 门禁重锚）

### 8.3 交付物（本叶）

| # | 交付物 | 形态 |
|---|---|---|
| 1 | **`next` 工具注册**（`LlmToolDef` + schema + description 三约束）⇒ 出现在 `deriveTools()` | 源码 + 断言 |
| 2 | **`hooks.intercept` 接线与捕获**（`tc.name==='next'`；合成 `ToolResult`；不动 `onToolDone`） | 源码 + 单测 |
| 3 | **5 道校验链保留接入**（工具参数项；SW 侧；复用 `shared/op-table.ts` 镜像）+ 留痕（`blocked=` 行，零明文） | 源码 + 单测 |
| 4 | **判定分层保持**（`admitCandidate` / `pressDecision` diff=0） | 源码 + 真值表断言 |
| 5 | **触发无条件 + 规则位等价重锚**（`ai-next` 独立通道；`NEXT_CONTRACT_GUIDANCE` 停止） | 源码 + 注册表断言 |
| 6 | **围栏块通道替换**（`FENCE` / `lastNextFenceBody` / `parseAiNextItems` 停止承载） | 源码 + 反证 |
| 7 | **`parity` 新 `pluginExtra` 条目**（reason + basis 非空；旧条目逐字保留） | 门禁 + 台账 |
| 8 | **`ai-next-candidate` 门禁改写**（等价或更强；`assertionsRemoved = 0`）+ 入 `gate-integrity` 下界 | 门禁 + 反证记录 |
| 9 | **S0'''' 主线 A / 支线 B 的 node 面**样板（Chromium 面留叶2 终态，**只加断言不加文件**）+ 注入反证族 | 门禁断言 |
| 10 | 体积**叶1 收口重登记**（五要素 + 三值；**A 列薄接线 / B 列归因不计账**）+ 对账表骨架 | `size-baseline` 登记条目 |
| 11 | 本叶 plan / tasks / build / review / validate 产物 | 各阶段产物（本叶承接） |

### 8.4 叶内执行序（供 plan / tasks 参考，**不是需求**）

> 承父 §14.1「**先立工具通道与安全闸**」与 DC-NDA-002 / 003 / 006。

1. **工具定义**（FR-NDA-010~014）：`next` 工具 def + schema + description；纯协议工具语义。
2. **捕获接线**（FR-NDA-021~028）：`hooks.intercept` + `tc.name==='next'` + 合成 `ToolResult` + `chat-result.aiNext` 装配。
3. **校验链接入**（FR-NDA-030~036）：5 道链（工具参数项）+ 判定分层保持 + 留痕。
4. **触发无条件 + 规则位重锚**（FR-NDA-015 / 040~045 / 114）。
5. **围栏块替换**（FR-NDA-080~083）：提示 / 解析停止承载；单一通道。
6. **门禁改写 + `parity` + S0'''' node 面 + 反证族**（FR-NDA-020 / 082 / 100~103 / 105 / 106 / 116 / 130~137）。
7. **体积 B 列归因 + 叶1 重登记 + 对账表骨架**（FR-NDA-140~145 / 130~137）。

---

## 9. 风险（本叶）

| # | 风险 | 等级 | 应对 |
|---|---|:--:|---|
| **R-NDA-001** | 换机制误伤 5 道校验链 / 分层 ⇒ AI 候选裸奔 | 高 | 校验链整体保留接入 + 注入必红（FR-NDA-030~036 / 115） |
| **R-NDA-905** | `next` 工具被实现成「第二产出内核 / 有执行体」 | 高 | 纯协议工具（合成 `ToolResult`）+ 单内核保持；反证必红（FR-NDA-014 / 026） |
| **R-NDA-901** | schema 被当作安全闸（schema 合法即放行） | 高 | 运行时 5 道校验链为唯一权威；反证「schema 合法但 param 越界 ⇒ 必拦」（FR-NDA-012 / 027） |
| **R-NDA-902** | 围栏块「影子产出」残留 ⇒ 双通道漂移 | 高 | 单一产出通道 + 反证「围栏块仍能产出 ⇒ 必红」（FR-NDA-080 / EC-NDA-020） |
| **R-NDA-008** | 工具 schema 与候选结构不一致 ⇒ 校验链入口漂移 | 中高 | schema 与 `AiNextCandidate` 同构 + `enum` 由 `OP_IDS` 单源派生（FR-NDA-011 / 030） |
| **R-NDA-004** | 新增 `next` 工具撞 `parity` 工具目录门禁 | 中高 | `pluginExtra`（reason + basis 非空）+ 旧条目逐字保留（FR-NDA-020 / 117） |
| **R-NDA-005 / 908** | `ai-next-candidate` 门禁改写静默删断言 | 高 | 等价或更强 + `assertionsRemoved = 0` + 前后对账（FR-NDA-082 / 116） |
| **R-NDA-007** | 无条件触发破 `NEXTSTEP_PRIORITY` 恰 4 / `driver-timings` 恰 5 | 中高 | 等价重锚（判据可 FAIL，非删除）+ 台账 old→new（FR-NDA-042 / 114 / 120） |
| **R-NDA-009** | 法八零明文被工具参数 / 留痕撞破 | 中高 | 参数与候选只走既有载荷；留痕只含字段名（FR-NDA-028 / 036） |
| **R-NDA-906** | 捕获写在 A 列 ⇒ 撞体积档位（距档 9,798 B） | 中高 | B 列 SW 优先 + 归因逐模块（FR-NDA-024 / §5.14.1） |
| **R-NDA-011** | 门禁无法断言不确定的 LLM 工具调用 | 中 | 判据落纯函数捕获 + 注入反证（FR-NDA-022 / 105 / 106） |
| **R-NDA-013** | 方案先行（形态被顺手定下） | 中高 | 父 §11 已 `ruled`；叶内只落已裁决口径（FR-NDA-007） |
| **R-NDA-012** | `KL-N-10` flake 被误读为回归 | 低—中 | 隔离复跑 ≥2 + 如实记录（FR-NDA-136 / EC-NDA-025） |

---

## 10. 开放问题（本叶相关）

| # | 问题 | 状态 |
|---|---|---|
| **PD-NDA-002** | `next` 工具 `description` 的精确提示词与解析严格度 | 待裁决（本叶 plan） |
| **PD-NDA-003** | `label` 的净化 / 截断口径 | 待裁决（本叶 plan / 密度门禁） |
| **PD-NDA-004** | 候选 `ref` 字段的语义面（引用编号 vs `refId`） | 待裁决（本叶 plan） |
| **PD-NDA-005** | `next` 工具驱动者 id 的精确字面量与 `evidence` 字段名 | 待裁决（本叶 plan） |
| **PD-NDA-006** | `ai-next` 规则位的精确落点（新位 vs 独立通道）与 `NEXTSTEP_PRIORITY` 重锚形态 | 待裁决（本叶 plan） |
| **PD-NDA-009** | `recommendation-sources` 白名单是否需为工具驱动新增条目 | 待裁决（本叶 plan） |
| **PD-NDA-010** | 围栏块通道的过渡兼容（保留开关 vs 仅删代码） | 待裁决（本叶 plan） |
| **PD-NDA-011** | 同回合多次 `next` 调用的精确合并口径（取最后一次 vs 取并集去重） | 待裁决（本叶 plan） |

---

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建（NDA-1 `next` 工具产出通道 + 无条件触发 + 5 道校验链接入叶规范）：承载父 FR **≈60 条切片**（GOV 001~007 / TOOL 010~020 / CAPTURE 021~028 / VERIFY-KEEP 030~036 / UNCOND 040~045 / FENCE 080~083 / S0'''' 100·101·102·103·105·106 主线侧 / SUPERSEDE 110·111·114~118·121 / GATE 130~137 改写门禁侧 / VOL 140~145 B 列归因侧）；交付 11 项；执行序 7 步（**先立工具通道与安全闸**）；风险 13 条；开放问题 8 条。关键：`next` 工具 schema 是**软约束**，运行时 5 道校验链是**权威**；围栏块通道**替换**（单一产出通道）；**零改基座**（只复用 `hooks.intercept`）。 | 2026-09-27 | SDDU Spec Agent |
