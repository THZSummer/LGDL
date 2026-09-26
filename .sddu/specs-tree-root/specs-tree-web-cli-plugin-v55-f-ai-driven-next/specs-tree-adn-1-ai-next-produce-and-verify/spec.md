# Feature Specification：specs-tree-adn-1-ai-next-produce-and-verify（ADN-1 AI 结构化产出 next 候选 + 5 道校验链：通道 + 安全核心）

> **文档定位**: SDDU 需求规范（**叶级切片**）— 父规范 `../spec.md`（v1.0）在**本叶**的适用范围与承载条文；作为本叶 plan 阶段的输入
> **前置依赖**: 父 `../discovery.md`（v1.0）+ 父 `../spec.md`（v1.0）§5.1~§5.4 / §5.9（S0''' 主线侧）/ §5.10（096）/ §5.11 / §5.12.1（B 列归因）/ §9 / §12 / §13 / §14.3
> **创建人**: SDDU Spec Agent
> **创建时间**: 2026-09-26
> **版本**: v1.0
> **更新人**: SDDU Spec Agent
> **更新时间**: 2026-09-26
> **更新说明**: 初始创建（ADN-1 叶规范：AI 结构化产出通道（`'idle'` 时机 + `chat-result` type-only 加法字段 + 零新增 kind）+ **5 道校验链**（opId 在册 / 三档清分 / ref / param / 丢弃+留痕）+ `tierOf` 单源复用 + **`admitCandidate`（接受层）与 `pressDecision`（按下层）判定分层** + `ai-next` provider 登记 + `DRIVER_DECLS_SRC` 11→12 + `NextCtx` 加法字段登记 + SW 侧解析 / 校验（B 列优先）+ 留痕三要素 + 新 node 门禁 `ai-next-candidate`）

---

## 1. 元数据

| 字段 | 值 |
|------|-----|
| Feature ID | `specs-tree-adn-1-ai-next-produce-and-verify`（父 = `specs-tree-web-cli-plugin-v55-f-ai-driven-next`，ROADMAP **F-36** / **v0.11.3**） |
| 名称 | **ADN-1 AI 结构化产出 next 候选 + 5 道校验链**：回合结题（复用既有 `'idle'`）⇒ SW 解析 LLM 结构化候选 `{opId,label,ref?,params?}` ⇒ **5 道校验**（① opId 在册 ② 三档清分（`gesture` 恒拒）③ ref 有效 ④ param 在 `AskSpec` 内 ⑤ 越界/非法**丢弃 + 留痕**）⇒ 接受候选经**既有 `chat-result` 载荷 type-only 加法字段**回面板 ⇒ 注入槽 ⇒ `ai-next` provider（`rule: ref-action`）⇒ chips；**判定分层**（`admitCandidate` 接受层 / `pressDecision` 按下层，共享 `tierOf` 单源）；**零新增 kind** |
| 优先级 | P0（本叶 = **首叶 / 底座叶 + 安全核心**，叶2 依赖本叶已建立的通道与安全闸） |
| 目标版本 | v0.11.3（承父；**每叶收口实测重登记**，父 FR-ADN-124） |
| 交付顺序 | **1 / 2**（首叶）；`dependsOn: []` |
| 深度 / 类型 | depth=2；`leaf: true` |
| 承载父 FR | **GOV 001~007** · **CHAN 010~019** · **VERIFY 020~029** · **TIER 030~035** · **S0''' 080 / 081 / 082 / 085（主线侧）** · **SUPERSEDE 096** · **GATE 110~117（新增门禁 + 反证族 + 对账表骨架）** · **VOL 120~125（B 列归因）**（共 **≈48 条父 FR 切片**） |
| 相关干系人 | 作者（唯一真实用户 + 唯一决策者）；编排器；下游 @sddu-plan / @sddu-tasks / @sddu-build / @sddu-review / @sddu-validate（**本叶承接 build/review/validate**） |

---

## 2. 上下文与边界

### 2.1 上下文

父规范 §2.2~§2.3 的**新通道根因 + 安全缺口**全部落在本叶：AI 结构化产出 next 的通道缺位（`Q-ADN-002`：`chat-result` 载荷无 next 字段 `chat-events.ts:48-66`；AI 口述只落 `assistant` 文本 `sidepanel.ts:4185`）；AI 候选**无校验入口**（`Q-ADN-003/004/005`：`pressCandidate` 的 opId **恒由注册表提供** `ai-drive.ts:8` 铁律①；`tierOf` / `OP_DESCRIPTORS` 9 / `ref-store` / `params: AskSpec` 全部就位但**只服务确定性候选**）；`pressDecision` 现把「非 `auto`」一律判 `blocked:tier`（`ai-drive.ts:70-71`）与「`confirm` 可提案」存在张力（须**判定分层**）。

**本叶的验收锚**：把「LLM 结构化产出的下一步」变成**受 5 道校验约束、可注入、可判定的候选流**，且**在确定性路径不被破坏的前提下**（本叶不动兜底 / 合并 / 首开）。

### 2.2 范围（做 / 不做）

| 做 | 依据 |
|---|---|
| **时机**：复用既有 `'idle'`（回合结题挂点 `sidepanel.ts:4168/4106`；**零新增触发词**） | 父 FR-ADN-010 / 094 |
| **载体**：既有 `chat-result` 载荷 **type-only 加法字段**（候选 `{opId,label,ref?,params?}`；**零新增 kind**） | 父 FR-ADN-011 / 012 / 018 |
| **5 道校验链**（① opId 在册 ② 三档清分 ③ ref 有效 ④ param 在 `AskSpec` 内 ⑤ 丢弃 + 留痕）+ 顺序即优先级 | 父 FR-ADN-020~027 |
| **判定分层**：`admitCandidate`（接受层）+ `pressDecision`（按下层，**语义 diff=0**）；共享 `tierOf` **单源** | 父 FR-ADN-030~035 |
| **`ai-next` provider 登记**（`rule: ref-action` 规则位；同规则内 AI 优先）；`NEXTSTEP_PRIORITY` 恰 4 不动 | 父 FR-ADN-014 / 052 |
| **注入槽登记**：`RecommendInput` / `NextCtx` 加法字段 + `CTX_FIELD_SERVICE`（DT-6） | 父 FR-ADN-015 |
| **解析 + 校验位置 = SW 侧（B 列优先）**（复用 `shared/op-table.ts` 双面镜像） | 父 FR-ADN-016 / 117 |
| **产出者声明**：`DRIVER_DECLS_SRC` 11→12（`driver` / `timing: idle` / `evidence`）；**零明文** | 父 FR-ADN-013 / 096 |
| **零新 LLM 调用**（复用刚结束回合输出；`recommend.ts` 仍 pure） | 父 FR-ADN-017 / 091 / 098 |
| **未配置 ⇒ 无候选产出**（零产出 / 零网络） | 父 FR-ADN-019 |
| **S0''' 主线 + 支线 B + 支线 D 的 node 面**（合法被采纳 / 非法被拦+留痕 / 未配纯确定性）+ 注入反证族 | 父 FR-ADN-080~082 / 085 |
| **新 node 门禁** `test/ai-next-candidate.test.ts` + 入 `gate-integrity` 下界（只增）；反证必须实跑 | 父 FR-ADN-110~115 |
| **B 列归因**（解析 / 校验在 `background.js`，不计 sidepanel 账本）+ A 列薄接线预算 | 父 FR-ADN-120~125 |

| 不做 | 依据 |
|---|---|
| **确定性兜底语义 / free-input 终端恒常驻（R8）的终态验收** | 父 §14.2 → **叶2**（`specs-tree-adn-2-deterministic-fallback-and-merge`）（本叶只保证「不动它」） |
| **AI / 规则候选合并 / 优先级 / 去重 / 上限（含替换口径、R6 扩展）** | 父 §5.6 → 叶2 |
| **护栏六常量接线 / 提案不耗预算 / 关断偏好涵盖** | 父 §5.7 → 叶2（本叶只保证「不新增第二阈值」） |
| **首开（open / ready）边界落地** | 父 §5.8 → 叶2（本叶**不动**首开入口） |
| **X-ADN 台账终态 + 保护段决策 + 升级 6 门禁重锚** | 父 §5.11 → 叶2（本叶只立**新增门禁 + 反证族 + 对账表骨架**） |
| **在 `recommend.ts` 内直接调用 LLM / 新 op / 新 kind / 新宿主** | 父 NG-ADN-010 / 013 |
| **`pressCandidate` / `driveAnsweredTurn` / `turn-queue.ts` 语义改动** | 父 NG-ADN-002 / 005 |

### 2.3 与父规范的关系

本叶是父规范的**实施切片**：FR 编号**沿用父编号**（不另造叶内 FR 编号；叶内仅用 `LG-ADN-1-###` 标目标）。**父 FR 在本叶的承载切片 = §4 表**；本叶不引入父规范之外的需求；父 §11 的 DC-ADN-001~016 全部适用（尤其是 DC-ADN-005「判定分层」/ DC-ADN-012「B 列优先」/ DC-ADN-013「`DRIVER_DECLS_SRC` 12↔12」）。

---

## 3. 目标与非目标（本叶）

### 3.1 目标

| # | 目标 | 父 FR |
|---|---|---|
| **LG-ADN-1-001** | **AI 结构化产出候选**（复用 `'idle'` + `chat-result` type-only 加法字段 + 零新增 kind） | FR-ADN-010~012 / 018 |
| **LG-ADN-1-002** | **5 道校验链**：opId 在册（9）→ 三档清分（`tierOf` 单源）→ ref 有效 → param 在 `AskSpec` 内 → 越界/非法**丢弃 + 留痕** | FR-ADN-020~029 |
| **LG-ADN-1-003** | **判定分层**：`admitCandidate`（接受层：`auto`/`confirm` 接受、`gesture` 拒）与 `pressDecision`（按下层：仅 `auto`；**diff=0**）分离，共享 `tierOf` | FR-ADN-030~035 |
| **LG-ADN-1-004** | **注入与扩展点固定**：`ai-next` provider（`rule: ref-action`）+ `RecommendInput`/`NextCtx` 加法字段 + `DRIVER_DECLS_SRC` 12 | FR-ADN-013~015 / 096 |
| **LG-ADN-1-005** | **零新 LLM 面 + 向后兼容**：`recommend.ts` 仍 pure（真值 7 / 模块 5 / 零 `fetch`·`chrome`·时钟）；新字段缺席 ⇒ 现状逐字 | FR-ADN-017~019 / 091 / 098 |
| **LG-ADN-1-006** | **可机核判据**：`test/ai-next-candidate.test.ts`（校验器纯函数 + 注入反证 + 真源切片 + 禁恒真）+ S0''' 主线 node 面 + B 列归因 | FR-ADN-080~082 / 085 / 110~115 / 120~125 |

### 3.2 非目标

| # | 不做 | 父依据 |
|---|---|---|
| **LNG-ADN-1-001** | 兜底 / 合并 / 替换口径 / R6 去重扩展 | §5.5 / §5.6 → 叶2 |
| **LNG-ADN-1-002** | 护栏六常量接线 / 提案不耗预算 / 关断偏好涵盖 | §5.7 → 叶2 |
| **LNG-ADN-1-003** | 首开（open / ready）AI 化或确定性重锚 | §5.8 → 叶2 |
| **LNG-ADN-1-004** | 升级 6 门禁重锚 + 保护段决策 + X-ADN 台账终态 | §5.11 → 叶2 |
| **LNG-ADN-1-005** | 新增 kind / 新 op / 新宿主 / 在 `recommend.ts` 内触达 LLM | 父 NG-ADN-010 / 013 |
| **LNG-ADN-1-006** | `pressCandidate` / `driveAnsweredTurn` / `turn-queue.ts` 语义改动 | 父 NG-ADN-002 / 005 |
| **LNG-ADN-1-007** | base / content / pick-layer / 判定链（`policy.ts` / `auto-authorize.ts`） | 父 NG-ADN-007~009 |

---

## 4. 功能需求（本叶承载的父 FR）

| 父 FR | 叶内要点（切片口径） | 优先级 |
|---|---|---|
| **FR-ADN-001~006** | 父级结构 / 纪律 / 红线编成 / 主流程零扩张（**共享面在本叶一次做完**：新增门禁 / 反证族 / 对账表骨架） | P0 |
| **FR-ADN-007** | 编排裁决落位（父 §11 已 `ruled`；本叶引用） | P0 |
| **FR-ADN-010** | 时机 = 复用既有 `'idle'`；**零新增触发词**（DT-2/DT-3 恰 5 不动） | P0 |
| **FR-ADN-011** | 载体 = `chat-result` type-only 加法字段；**零新增 kind**（`KIND_SET` 40 / 12 kind / 零宿主） | P0 |
| **FR-ADN-012** | 候选结构 `{opId,label,ref?,params?}`；缺 `opId` ⇒ 非法 | P0 |
| **FR-ADN-013** | 产出者声明（`driver` / `timing=idle` / `evidence`）；**零明文** | P0 |
| **FR-ADN-014** | `ai-next` provider（`rule: ref-action`）；`NEXTSTEP_PRIORITY` 恰 4 / `ACT_TO_OP` 6 不动 | P0 |
| **FR-ADN-015** | 注入槽（`RecommendInput`/`NextCtx` 加法字段 + `CTX_FIELD_SERVICE`）；`recommend.ts` 仍 pure | P0 |
| **FR-ADN-016** | 解析 + 校验位置 = SW 侧（B 列优先）；校验单源复用 `shared/op-table.ts` | P0 |
| **FR-ADN-017** | **零新 LLM 调用**（复用刚结束回合输出；FR-CHAT-060 不破） | P0 |
| **FR-ADN-018** | 载荷只增不改；新字段缺席 ⇒ 现状逐字 | P0 |
| **FR-ADN-019** | 未配置 ⇒ 零候选产出（零网络） | P0 |
| **FR-ADN-020** | ① opId 在册（9 op；未知 ⇒ `unknown-op`） | P0 |
| **FR-ADN-021** | ② 三档清分复用 `tierOf` **单源**（零手写表 / 零第二阈值） | P0 |
| **FR-ADN-022** | ②' `gesture` 恒拒绝（连提案都拒） | P0 |
| **FR-ADN-023** | ②'' `confirm` 可提案（consent 须用户答；AI 不可代答 / 不可自动按下） | P0 |
| **FR-ADN-024** | ③ ref 存在且有效（读既有 `ref-store`） | P0 |
| **FR-ADN-025** | ④ param 在 `AskSpec` 内 | P0 |
| **FR-ADN-026** | ⑤ 越界 / 非法 ⇒ 丢弃 + 可读留痕（零明文；不死端） | P0 |
| **FR-ADN-027** | 校验链顺序即语义优先级 | P0 |
| **FR-ADN-028** | 纯函数校验器（不依赖 LLM 输出本身；门禁可直接调用） | P0 |
| **FR-ADN-029** | 注入式反证族（五类）必须实跑 + 逐字节还原 | P0 |
| **FR-ADN-030** | `admitCandidate`（接受层）与 `pressDecision`（按下层）**显式分层** | P0 |
| **FR-ADN-031** | `pressDecision` 语义 **diff=0**（`auto` only；逐档拒绝判据不删） | P0 |
| **FR-ADN-032** | 接受判定真值表（`auto` 接受 / `confirm` 接受 / `gesture` 拒 / 未知拒） | P0 |
| **FR-ADN-033** | 两判定共享 `tierOf` 单源（零第二档位表） | P0 |
| **FR-ADN-034** | `confirm` 候选点击 ⇒ 既有 consent 卡（不新增执行体 / 不绕过 consent） | P0 |
| **FR-ADN-035** | 分层可判（`confirm`：`admit=true ∧ press=false`；反证双向） | P0 |
| **FR-ADN-080 / 081 / 082 / 085** | S0''' 全链机器化（**主线 + 支线 B + 支线 D 的 node 面**）+ 四条硬断言 + 注入反证族 + 判据禁恒真 / 真源切片 | P0 |
| **FR-ADN-096** | `DRIVER_DECLS_SRC` 双向包含 **11↔11 → 12↔12**（DQ-1/DQ-3） | P0 |
| **FR-ADN-110~115** | 断言只增 / 反证实跑 / 台账骨架 / **新增 node 门禁 `ai-next-candidate` 入下界** / 串行纪律 | P0（113 保护段 / 升级 6 的终态由叶2 收） |
| **FR-ADN-120~125** | 分列预算 / 距档结论 / 冻结面零容差 / **B 列归因（不计账）** / 叶1 重登记 | P0 |

---

## 5. 非功能需求（本叶相关）

| 父 NFR | 叶内口径 |
|---|---|
| **NFR-ADN-001** | `dist/sidepanel.js` ≤ 生效上限；判定 = 公式唯一（`record-only` cap）；**本叶 A 列薄接线 + B 列主体** |
| **NFR-ADN-002 / 003** | 特权 op 恒 `gesture`（连提案都拒）；consent / `gesture` 不得被 AI 代答（含 `confirm` 档） |
| **NFR-ADN-004** | 法八四面零明文不退化（候选 label / params / 留痕不回显值） |
| **NFR-ADN-005** | base 零 diff + 判定链零触碰（`zeroDiffFiles` 9 项） |
| **NFR-ADN-006** | 校验链不得放松既有 fail-closed 方向（引用判定 3 结果 / 档位语义） |
| **NFR-ADN-007** | 零新增载体（`KIND_SET` 40 / 12 kind / 零宿主 / `ACT_TO_OP` 6） |
| **NFR-ADN-008** | `recommendNextStep` 保持 pure；真值白名单 7 / 模块白名单 5 不动 |
| **NFR-ADN-009** | 校验器可机核（纯函数 + 双向反证 + 注入必红 + 三段控制禁恒真 + 真源切片） |
| **NFR-ADN-011** | 在飞不产卡（`pending` 硬门）不退化 |
| **NFR-ADN-012** | 门禁串行 / 无新依赖 / 不改 `opencode.json` |
| **NFR-ADN-013** | 扩展点固定 / 单源（一个 provider + 一个注入槽 + 一个校验器 + 一个 `tierOf`） |
| **NFR-ADN-014** | 判定分层可判（`confirm` 情形 `admit=true ∧ press=false`） |
| **NFR-ADN-015** | 零新增 LLM 往返 / 零新增网络 |
| **NFR-ADN-016** | 留痕可判且零明文（三要素 + `blocked=`；两值可判） |

> 本叶**不承载** NFR-ADN-010（零死端终态）的**终态断言**（兜底 / 终端恒常驻终态属叶2）；但**不得**使其回退。

---

## 6. 边界情况（本叶相关）

| 父 EC | 叶内口径 |
|---|---|
| **EC-ADN-001** | 幻觉 opId ⇒ 拒 + `blocked=unknown-op`；不死端（本叶只保证「非法不渲染」） |
| **EC-ADN-002** | `gesture` op ⇒ 恒拒（连提案都拒）+ 留痕 |
| **EC-ADN-003** | `confirm` op ⇒ 接受为 chip；点击 ⇒ 既有 consent 卡；不可自动按下 |
| **EC-ADN-004** | 越界 ref ⇒ 拒 + 留痕 |
| **EC-ADN-005** | param 越界 ⇒ 拒 + 留痕 |
| **EC-ADN-008** | 未配 LLM ⇒ 零 AI 候选产出（零网络） |
| **EC-ADN-009** | 在飞（`pending`）⇒ 不产卡（硬门保持） |
| **EC-ADN-014** | 候选 label 含凭据形值 ⇒ 仅显示文本；法八四面零明文 |
| **EC-ADN-017** | 注入第 41 个 `KIND_SET` / 第 13 kind / 新宿主 ⇒ 必红 |
| **EC-ADN-018** | AI 代答 / 自动提交 `confirm` consent ⇒ 必红 |
| **EC-ADN-020** | `KL-N-10` flake ⇒ 隔离复跑 ≥2 + 如实记录 |

---

## 7. 验收锚点（本叶 → 父 AC）

| 父 AC | 本叶判据 |
|---|---|
| **AC-ADN-001** | S0''' 主线 + 支线 B + 支线 D 的 node 面（Chromium 面只看叶2 终态；本叶**不**新增 Chromium 文件） |
| **AC-ADN-002** | AI 结构化产出通道（时机 / 载荷 / 结构 / 兼容 / 零新增 kind） |
| **AC-ADN-003** | ① opId 在册 + ② 三档清分（`gesture` 恒拒）+ `confirm` 可提案 |
| **AC-ADN-004** | ③ ref + ④ param + ⑤ 丢弃 + 留痕（四类注入反证） |
| **AC-ADN-005** | 判定分层（`admitCandidate` vs `pressDecision`；共享 `tierOf`；双向反证） |
| **AC-ADN-010** | X-ADN-7（`DRIVER_DECLS_SRC` 12↔12）/ X-ADN-2 / 4 / 5 / 9 的**保持侧**（台账由叶2 终态） |
| **AC-ADN-011** | 自动按下路径 diff = 0（`requestTurn(` 恰 1 不动） |
| **AC-ADN-012** | 留痕三要素 + 零明文 |
| **AC-ADN-013** | 法八四面零明文 |
| **AC-ADN-014** | 在飞语义不变（`pending` 不产卡） |
| **AC-ADN-015** | 未配置纯确定性（本叶只保证「零 AI 候选 + 零网络」） |
| **AC-ADN-019** | 反证实跑 + 逐字节还原 |
| **AC-ADN-022** | 新增门禁入 `gate-integrity` 下界（只增）；`CHROMIUM_GATES === 9` 不动 |
| **AC-ADN-025 / 026** | 冻结面零容差 / B 列归因 + A 列薄接线预算（叶1 收口重登记） |
| **AC-ADN-028 / 029** | 零新增载体 / `recommend.ts` 仍 pure + 零新 LLM |

---

## 8. 交付与执行

### 8.1 上游依赖

- 父 `../spec.md`（v1.0）+ `../discovery.md`（v1.0）+ `../state.json`
- F-35 两叶 `validated` 产物（free-input / floor / `op.turn` 槽 / `requestTurn(` 恰 1 —— 只读复用）
- **R8 `38565ac`**（`maybeRecommendOpenEntry` 复用 `'idle'`；体积 598,926）—— 只读复用；其产物**零改写**
- v5.5 / v5 / v4.5 / v4 产物（`pressCandidate` / `driveAnsweredTurn` / 三档清分 / 护栏六常量 / 留痕三要素 / next 注册表契约 v2 / op 三档 / 12 kind / 零宿主）
- 仓库现状：`feature/web-cli-plugin`，本叶 plan 起点的 HEAD

### 8.2 下游 consumer

- **叶2** `specs-tree-adn-2-deterministic-fallback-and-merge`（依赖本叶已建立**通道**与**校验链**，再收兜底 / 合并 / 首开边界 / 门禁重锚）

### 8.3 交付物（本叶）

| # | 交付物 | 形态 |
|---|---|---|
| 1 | `chat-result` 载荷 type-only 加法字段（候选结构）+ 面板侧解析 / 注入接线 | 源码 + 断言 |
| 2 | **5 道校验链**（SW 侧；复用 `shared/op-table.ts` 镜像）+ 留痕（`blocked=` 行，零明文） | 源码 + 单测 |
| 3 | **判定分层**：`admitCandidate`（接受层）+ `pressDecision`（保持不动） | 源码 + 真值表断言 |
| 4 | `ai-next` provider（`rule: ref-action`）+ `DRIVER_DECLS_SRC` 第 12 行 + `NextCtx` 加法字段登记（DT-6） | 源码 + 注册表断言 |
| 5 | **新 node 门禁** `test/ai-next-candidate.test.ts`（校验器纯函数 + 注入反证族 + 真源切片 + 禁恒真 + 判定分层） | 门禁 + 反证记录 |
| 6 | **S0''' 主线 / 支线 B / 支线 D 的 node 面**样板（Chromium 面留叶2 终态，**只加断言不加文件**） | 门禁断言 |
| 7 | `gate-integrity` 受审下界 +1（**只增**）；对账表骨架 | 门禁 + 台账 |
| 8 | 体积**叶1 收口重登记**（五要素 + 三值；**A 列薄接线 / B 列归因不计账**） | `size-baseline` 登记条目 |
| 9 | 本叶 plan / tasks / build / review / validate 产物 | 各阶段产物（本叶承接） |

### 8.4 叶内执行序（供 plan / tasks 参考，**不是需求**）

> 承父 §14.1「**先立通道与安全闸**」与 DC-ADN-005「判定分层」。

1. **载体与结构**（FR-ADN-011~012 / 018）：载荷加法字段 + 候选结构 + 向后兼容。
2. **校验链**（FR-ADN-020~029）：opId 在册 → 三档 → ref → param → 丢弃+留痕（纯函数校验器 + 顺序）。
3. **判定分层**（FR-ADN-030~035）：`admitCandidate` 新增 + `pressDecision` 保持 + 共享 `tierOf`。
4. **注入与扩展点**（FR-ADN-013~016 / 096）：`ai-next` provider + 注入槽 + `DRIVER_DECLS_SRC` 12 + SW 位置。
5. **零新 LLM / 未配置零产出**（FR-ADN-017 / 019 / 091 / 098）。
6. **新门禁 + S0''' node 面 + 反证族**（FR-ADN-080~082 / 085 / 110~115）。
7. **体积 B 列归因 + 叶1 重登记 + 对账表骨架**（FR-ADN-110~117 / 120~125）。

---

## 9. 风险（本叶）

| # | 风险 | 等级 | 应对 |
|---|---|:--:|---|
| **R-ADN-001** | AI 候选幻觉 op / 越界 ref / 越界 param 触达特权 / 不可逆面 | 高 | 5 道校验链先于接受；`gesture` 恒拒；纯函数校验器 + 注入必红 |
| **R-ADN-902** | 校验链被写成「先展示后校验」 | 高 | 校验先于接受；未校验候选不得进 chips（注入必红） |
| **R-ADN-901** | 判定混同（`confirm` 不可见 或 `gesture` 被放行） | 高 | 分层真值表 + 双向反证 |
| **R-ADN-008** | `KIND_SET` / 12 kind / 零宿主被撞 | 高 | 复用 `chat-result` 载荷加法字段（type-only） |
| **R-ADN-904** | AI 候选被实现成「第 5 规则位 / 第二产出内核」 | 高 | 骑 `ref-action` 位；`recommendNextStep` 仍唯一内核；反证必红 |
| **R-ADN-905** | 载荷加法字段破坏向后兼容 | 中高 | 「新字段缺席 ⇒ 现状逐字」断言 |
| **R-ADN-012** | 门禁无法断言不确定的 LLM 输出 | 中 | 判据落在纯函数校验器 + 注入反证 |
| **R-ADN-903** | 校验器读测试自建常量 / 判据恒真 | 中高 | 真源切片 + 三段控制 + 注入必红 |
| **R-ADN-006** | 体积（A 列薄接线仍可能越预算） | 中高 | B 列优先 + 先出预算；叶1 收口重登记 |
| **R-ADN-014** | 方案先行（形态被顺手定下） | 中高 | 父 §11 已 `ruled`；叶内只落已裁决口径 |

---

## 10. 开放问题（本叶相关）

| # | 问题 | 状态 |
|---|---|---|
| **PD-ADN-002** | LLM 结构化输出的精确提示 / 协议形态与解析严格度 | 待裁决（本叶 plan） |
| **PD-ADN-003** | `label` 的净化 / 截断口径 | 待裁决（本叶 plan / 密度门禁） |
| **PD-ADN-004** | AI 候选 `ref` 字段的语义面（引用编号 vs `refId`） | 待裁决（本叶 plan） |
| **PD-ADN-006** | AI 候选驱动者 id 的精确字面量（如 `ai-next`）与 `evidence` 字段名 | 待裁决（本叶 plan） |
| **PD-ADN-008** | `recommendation-sources` 白名单是否需为注入槽新增条目 | 待裁决（本叶 plan） |

---

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建（ADN-1 AI 结构化产出 next 候选 + 5 道校验链叶规范）：承载父 FR **≈48 条切片**（GOV 001~007 / CHAN 010~019 / VERIFY 020~029 / TIER 030~035 / S0''' 080·081·082·085 主线侧 / SUPERSEDE 096 / GATE 110~117 新增门禁侧 / VOL 120~125 B 列归因侧）；交付 9 项；执行序 7 步（**先立通道与安全闸**）；风险 10 条；开放问题 5 条 | 2026-09-26 | SDDU Spec Agent |
