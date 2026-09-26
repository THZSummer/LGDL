# 技术计划：specs-tree-web-cli-plugin-v55-f-ai-driven-next（web-cli-plugin v0.11.3「AI 驱动 next」；父 Feature 统领性技术方案）

> **文档定位**: SDDU 技术方案（**父 / 跨切契约与索引**）—— 记录跨切架构、总体方案取舍、聚合文件影响、方案对比、红线继承、保护段决策、门禁重锚清单、体积分列预算与实施波次，以及 **10 条 ADR 的索引**（正文见本目录 `ADR-ADN-001~010-*.md`），作为 2 叶实施、审查与收口的单一参照
> **前置依赖**: 本目录 `spec.md` v1.0（**89 FR / 16 NFR / 20 EC / 20 NG / 10 US / 8 G / 30 AC / 16 DC / 30 N / 24 R**；O-ADN-001~016 全 `ruled`；§12 X-ADN-1~11 映射；§13 N-ADN-001~030；§5.12.1 分列预算表；§14 2 叶拆分）+ `discovery.md` v1.0 + 2 叶 `spec.md` v1.0（`specs-tree-adn-1-ai-next-produce-and-verify` / `specs-tree-adn-2-deterministic-fallback-and-merge`）+ 唯一直接上游 F-35（v0.11.2，两叶 `validated`）与 **R8 `38565ac`** + 底座 F-34 / F-33 / F-32 / v4.5 / v4（**全部零改写**；唯一授权例外 = X-ADN-1 产出权转移的**显式取代登记**）
> **创建人**: SDDU Plan Agent
> **创建时间**: 2026-09-26
> **版本**: v1.0
> **更新人**: SDDU Plan Agent
> **更新时间**: 2026-09-26
> **更新说明**: 初始创建（父 `plan.md` + 2 叶 `plan.md` + **ADR-ADN-001~010 正文**同批产出；**PD-ADN-001~008 全部裁决落位**）。**本任务只做 plan**：不写 tasks、不写代码、不改 `src/**`·`test/**`·`dist/**`·`docs/**`·`design/**`·ROADMAP，不改上游 SDDU 目录，不动 `main`、不 force push，**不跑门禁 / 构建 / Chromium**，**未调用任何受管 Provider**（routing.v1 = `local_or_compute → none`）。

---

## 1. 前置检查

| 检查项 | 状态 | 证据 |
|--------|:--:|------|
| 父 `spec.md` 存在 | ✅ | 本目录 `spec.md`（933 行，v1.0，2026-09-26，`phase=specified`） |
| 2 叶 `spec.md` 存在 | ✅ | `specs-tree-adn-1-…/spec.md`（275 行）/ `specs-tree-adn-2-…/spec.md`（265 行），均 v1.0 |
| 叶数量与结构 | ✅ | 2 叶（`leaf:true` / `depth:2` / `deliveryOrder` 1..2 / `dependsOn: adn-1 → adn-2`）；父 `depth=1` 轻量规范容器（不承接 build/review/validate、不产父级 `tasks.json`） |
| 外部 API 文档缓存 | ✅ N/A | **零外部 API / 零新依赖 / 零新权限**（`manifest.json` 零 diff）；无 `/sddu:api-docs` 需求；O-ADN-015 = 不需要外部竞品调研 |
| 参数化模板 | ✅ | `.opencode/plugins/sddu/templates/output/sddu-plan.md.hbs`（79 行；**无**用户级覆盖 `.sddu/templates/agents/output/sddu-plan.md.hbs`） |
| 上游先例 | ✅ | F-35 `plan.md`（父 + 2 叶 + `ADR-IAN-001~010`；沿用「ADR 正文独立成文件 + 父/叶两层 plan」落法） |
| 分支 / HEAD / 工作区 | ✅ | `feature/web-cli-plugin` / `3f93fc7`（F-36 spec 产物）/ 工作区干净（仅本轮新增 `.sddu` 产物） |
| 红线现值（**本轮只读复核**） | ✅ | `content.js` **177,076 B** / `52a82620…`；`pick-layer.js` **34,358 B**；`KIND_SET` **40 逐字**；`REGISTERED_STRUCTURAL_HOSTS === []`；`ACT_TO_OP` 恰 6；`NEXTSTEP_PRIORITY` 恰 4；`CHROMIUM_GATES === 9` |
| 体积口径（**本轮只读复核**） | ✅ | `dist/sidepanel.js` 基线 **598,926 B**（`size-baseline.ts:381`）；生效上限 `floor(×1.05)=`**628,872**；档位 **614,400**（**距档 15,474**）；绝对上限 **675,840**；`authorConfirmation=pending-author-line` |
| 主流程调用点（**本轮只读实测**） | ✅ | `requestTurn(` **恰 1**（`sidepanel.ts` 唯一生产输入提交点）；`maybeRecommend(` 1 定义 / 8 调用点；`nextAfterSettle(` 1 定义 / 10 调用点；`dispatchChipAction` 在 `ai-drive.ts` **恰 1 处** |
| base 零 diff 机核 | ✅ | `test/insight-no-escalation.test.ts:147` `gitDiffStatus(['../web-cli-base']) === 0` 为现有判据（本 Feature 不碰其判据） |
| 保护 pin（**本轮只读复核**） | ✅ | journey **`43484..59347`** / sha **`7b309258…`** / 249 行（active）；binding **`107780..115930`** / sha **`be9ad0e9…`**（active，`decision: keep`）；口径 = `supersession-ledger.test.ts#protectedPinFailures` |
| 门禁基线口径（**如实登记**） | ✅ | 父 spec §9.5 的计数引自 F-35 收口 + R8，本轮**未复跑**；只读复核发现部分旧字面量与仓内实况不一致（例 `EXPECTED_AUDITED_FILES` 现 40 项）⇒ 重锚按**断言语义 + 语义增量**，不按陈旧字面（承 COR-ADN-3） |
| 写入范围 | ✅ | 仅本 Feature SDDU 目录（父 + 2 叶 `plan.md` / 10 ADR / 3× `state.json` / `TREE.md`）；**未跑任何门禁 / 构建 / Chromium** |

### 1.1 偏差登记（父 `plan.md` 的产出 vs 父 spec 的「轻量规范容器」定位）

父 `spec.md` §14.1 明定父 Feature = 轻量规范容器（不承接 build/review/validate，不产 `tasks.json`）。本阶段按编排器任务书产出**父 + 2 叶两份层级的 `plan.md`**，与 F-34 / F-35 先例同口径**显式登记**：

| 项 | 内容 |
|---|---|
| 偏差 | 父产出 `plan.md`（spec §14.1 未列出父 `plan.md`） |
| 理由 | 跨切契约（阶段 3 的七项设计任务：候选协议 / 5 道校验链落点 / 注入合并 / 首开边界 / 护栏 / S0''' 双面 / 分列预算 / 门禁重锚 / X-ADN 台账）需**单点定义**，否则 2 叶与收口各持一套口径 |
| 容器内核仍遵守 | 父**不产出** `tasks.md` / `tasks.json`；父**不承接** build/review/validate；实施全部由 2 叶承载；父 `state.json` 的 `depth=1` / `childrens` 结构不变 |
| 引用方式 | 叶对父的引用 = 「父 FR/AC + `ADR-ADN-0xx` 编号」，不依赖父 `plan.md` 物理存在性 |
| ADR 编号 | 本 Feature 用 `ADR-ADN-001~010`（与 FR/N/EC/AC 的 `ADN` 命名空间一致；不占用上游 `ADR-IAN-*` / `ADR-SGO-*` / `ADR-V55-*` / `ADR-V5-*`） |

### 1.2 本阶段两条硬性结论（**先写结论**）

| 约束 | 结论 | 依据 |
|---|---|---|
| **体积（A 列 / `dist/sidepanel.js`）** | 叶1 **+0.8 ~ +2.0 KB** + 叶2 **+0.5 ~ +1.5 KB** = Σ **+1.3 ~ +3.5 KB**；+15% 缓冲 **+1.5 ~ +4.0 KB ≤ 距档余量 15,474 B** ✅ 且 ≤ 生效上限余量 29,946 B ✅ ⇒ **不触发升档**。**2.8× 最坏** ≈ **9.8 KB**（+15% ≈ 11.3 KB）⇒ **仍 < 15,474 ⇒ 也不触发升档**；**预置 EC-ADN-016 显式升档路径 + 作者一行**，本阶段**不触发**、**不伪称已确认** | `ADR-ADN-008` / FR-ADN-120~125 |
| **B 列（`dist/background.js`，不计账）** | 叶1 **+1.5 ~ +3.5 KB**（解析 + 5 道校验链主体 + 留痕）+ 叶2 **+0.5 ~ +1.5 KB** = **+2.0 ~ +5.0 KB**（**不计入 sidepanel 账本**，如实标注列别） | `ADR-ADN-008` / FR-ADN-016 |

> 口径：`sidepanel.js` 是**唯一**带字节预算的产物；`background.js`（SW bundle）/ `options.js` / C 列冻结面（`content.js` / `pick-layer.js`）/ `test/**` **不计入**该账本。**C 列零容差零触碰**。

---

## 2. 架构分析

### 2.1 问题定性（题眼）

v5（F-32）把「一切操作皆 next 流内闭环」立法；v5.5（F-33）把「**下一步由谁按**」转移到系统 / AI 侧（`pressCandidate` + `driveAnsweredTurn`）；F-34（v5.5.1）把「**按的范围**」兑现为可判读数；F-35（v5.5.2）把「**输入面**」收编进 next 流内。**v0.11.3 的题眼 = 「产什么 next 也交给 AI」**。

现状（spec §2.2 只读复核 ✅）：**确定性面完整成熟**（产 / 校 / 兜 / 限 齐备），**AI 面有「手」没有「口」**——`pressCandidate` 接收的 opId **恒由注册表提供**（`ai-drive.ts:8` 铁律①）；`chat-result` 载荷**无结构化 next 字段**；AI 结题口述的下一步只落 `assistant` 文本（不进 chips）⇒ 可观察症状 = **两张皮**（AI 口述 4 条有用下一步 vs 那排陈旧 chip）。

### 2.2 本 Feature 的架构落点（一句话）

> **给 AI 一张受 5 道校验约束的「口」，而保留确定性的「兜底与安全闸」；`recommendNextStep` 仍是唯一内核，AI 只经「注入槽 + 一个 provider」进入。**

```
回合结题（chat-result variant='done'）
  │  SW：本回合最后一条 assistant 文本 + 本回合 refs 快照
  ▼
background/ai-next.ts（NEW，纯函数）
  ① 解析尾随 `next` 围栏块（严格 JSON 数组；逐项容错）
  ② 5 道校验链：opId 在册 → tierOf 三档 → ref 有效 → param 在 AskSpec 内 → 丢弃 + blocked= 留痕
  ③ label 零明文 caliber 扫描（命中 ⇒ blocked=label）
  ▼
chat-result 加法字段 `aiNext = { accepted, blocked }`（type-only 单声明；零新增 kind）
  ▼
面板（sidepanel.ts，done 分支）
  事件作用域单槽 pendingAiNext（消费即清） + blocked 可读留痕一行 + 关断门
  ▼
recommendNextStep(input.session.aiNext)  ← recommend.ts 仍 pure；真值 7 源不变
  ├─ ai-next provider（rule:'ref-action'，priority 2，prepend）→ 同规则内 AI 优先 ⇒ 替换陈旧 ref-action chip
  └─ AI 缺席 / 未产出 / 全被拦 ⇒ 确定性 ref-action 候选 / floor「仅含 free-input 终端」照旧
  ▼
chips（≤3，单卡，终端恒最末）→ 点击经既有 dispatchChipAction（data-op 单源）
```

### 2.3 关键契约与数据流变更

| 面 | 既有 | 本 Feature 的**纯加法**改动 |
|---|---|---|
| SW 载荷 | `ChatResultEvent` 7 字段 | +`aiNext?: AiNextPayload`（**单声明**；∉ `KIND_SET`） |
| SW 提示 | `SYSTEM_PROMPT` + `refContextSegment(refs)`（无引用 ⇒ `''`） | `refContextSegment` 的**有引用分支**追加产出契约句（基座 / 工厂形态**零改**） |
| 注入槽 | `RecommendInput` 7 源 + 助手字段；`NextCtx` 7 源 | `session.aiNext?`（**嵌套在既有 `session`** ⇒ 顶层仍 7 源；`CTX_FIELD_SERVICE` 零新行） |
| provider 契约 | `chips: readonly string[]`（静态） | +`chipsFor?(ctx)`（动态权威）+`label?`（标题覆盖）——既有 11 行**零改** |
| provider 集合 | 11 行（5 触发 + 2 op 驱动 + 3 规则 + 1 终端） | **12 行**（+`ai-next`）；`DRIVER_DECLS_SRC` **12 行**；`NEXTSTEP_PRIORITY` 恰 4 不动 |
| 判定 | `pressDecision`（按下层） | +`admitCandidate`（接受层）；两层共享 `tierOf` 单源；**按下语义 diff=0** |
| op 描述符 | `{id,layer,mode,fail,audit,hasConsent}` | +`ask?: 'choice'|'form'`（param 相容校验单源；与 `ops.ts#IMPL` 逐行一致） |

### 2.4 为什么必须先立通道与安全闸、再收兜底与合并口径（承父 §14.1）

1. **安全先行（决定性）**：AI 候选一旦能进 chips，校验链必须先就位，否则中间态裸放 AI 自由文本触达特权 / 不可逆面（R-ADN-001）；
2. **风险面不同**：叶1 = 正确性（通道形态 / 校验 / 分层 / 留痕 / 兼容），叶2 = 结构性与治理（兜底回归 / 合并溢出 / 首开可达 / 体积 / 门禁 / 保护段）；
3. **体积必须分列 + 责任相反**：叶1 = A 列薄接线 + B 列主体（不计账）；叶2 = A 列合并 / 兜底接线 + 重锚；混算无法归因（FR-ADN-124/125）。

### 2.5 依赖关系（只读复用）

```
F-35（v0.11.2 validated）+ R8 38565ac   ── free-input 终端 / 零死端 floor / op.turn 槽 / requestTurn( 恰 1
F-33（v5.5）                            ── pressCandidate / driveAnsweredTurn / tierOf 三档 / guard 六常量 / 留痕三要素
F-32（v5）                              ── next 注册表契约 v2 / shared/op-table 双面 / KIND_SET 40 / 零宿主
F-34（v5.5.1）/ v4.5 / v4               ── 法一~法九 / ref 范围 / stream 三区
        │  （全部零改写；唯一例外 = X-ADN-1 显式取代登记）
        ▼
F-36 叶1（通道 + 5 道校验链 + 判定分层 + ai-next provider）→ F-36 叶2（兜底 + 合并 + 护栏 + 首开 + 门禁重锚 + 台账终态）
```

---

## 3. 方案对比

> 对比维度 = 四个**决定性架构点**。每点给 2~3 个可行方案。

### 3.1 产出通道

| 维度 | **方案 A：复用 `chat-result` 加法字段 + 围栏块（推荐）** | 方案 B：新增专用消息 / 卡 kind | 方案 C：新增 tool-call（模型调「产 next」工具） |
|---|---|---|---|
| 描述 | SW 解析本回合最后一条 assistant 文本的尾随 `next` 块；`aiNext` 作 `chat-result` 加法字段 | 新 kind（第 41 / 第 13）承载候选 | 注册一个产 next 的工具，模型显式调用 |
| 优点 | 零新增 kind / 零新 LLM 调用；与 `ARBITRATION_RESULTS` / `refs` / `targetSelector` 先例同构；基座与工厂零改 | 「显式结构化」 | 「结构化」由工具 schema 保证 |
| 缺点 | 依赖模型的文本遵从度（不遵从 ⇒ 支线 C 兜底） | 撞 `KIND_SET` 40 + `content.js` 字节冻结 | 新增工具面（`toolCount` / 工具目录 / parity 契约全动）；改回合内驱动语义 |
| 风险 | R-ADN-012（门禁不可断言 LLM 输出）⇒ 以纯函数校验器 + 注入反证化解 | R-ADN-008（高） | R-ADN-008 + NG-ADN-001（越界） |
| 工作量 | 低（B 列一处解析 + A 列薄接线） | 中高（kind 契约 + 多门禁） | 高（工具面 + 目录 + 契约） |

### 3.2 候选校验的落点

| 维度 | **方案 A：SW 侧（B 列优先，推荐）** | 方案 B：面板侧（A 列） | 方案 C：两侧各校验一份 |
|---|---|---|---|
| 描述 | `background/ai-next.ts` 解析 + 5 道校验，面板只收已校验候选 | 候选原样回面板，在 `recommend.ts` / `sidepanel.ts` 校验 | 两侧都有校验器 |
| 优点 | 旁路 sidepanel 档位压力（距档仅 15,474）；SW 已持有 refs 快照 + `op-table` 镜像 | 离渲染近 | 「纵深防御」 |
| 缺点 | 需 SW 侧拿到 param schema（提升 `ask` descriptor，纯加法） | A 列 +数 KB + 校验逻辑挤进已 tense 的账本；且候选在「未校验」态进过面板 | **第二校验器** ⇒ N-ADN-022 FAIL |
| 风险 | R-ADN-908（B 列优先被读成无成本）⇒ 预算表**同时**给 B 列 | R-ADN-006（体积） | R-ADN-903 / N-ADN-022 |
| 工作量 | 中（B 列模块 + 1 门禁） | 中高（A 列 + 账本压力） | 高且**违规** |

### 3.3 AI 候选与规则候选的关系

| 维度 | **方案 A：骑 `ref-action` 位 + 单卡内 ≤3（推荐）** | 方案 B：新增第 5 规则位 | 方案 C：新增第二张卡（多卡） |
|---|---|---|---|
| 描述 | `ai-next` provider `rule:'ref-action'` + `prepend` 同规则优先；多候选取前 3 截断 | `NEXTSTEP_PRIORITY` 追加 `ai-next` | `MAX_NEXTSTEP_CARDS_PER_ROUND` 1→2 |
| 优点 | `NEXTSTEP_PRIORITY` 恰 4 / 单卡 / 3-chip **全不动**（X-ADN-3/4 未发生）；天然「替换陈旧候选」 | 规则语义更直白 | AI 与规则候选同屏 |
| 缺点 | AI 候选与 ref-action 共享槽（标题需 `label` 覆盖） | 破「恰 4」⇒ X-ADN-4 取代 + 密度重锚 | 破单卡 ⇒ X-ADN-3 取代 + 密度重锚 + 「推荐不是列表」立法 |
| 风险 | 低（R-ADN-905 兼容） | 中高（门禁重锚量陡增） | 中高（密度 / 预算） |
| 工作量 | 低 | 中 | 中高 |

### 3.4 首开（open / ready）

| 维度 | **方案 A：保持确定性（推荐）** | 方案 B：首开也 AI 化 |
|---|---|---|
| 描述 | `maybeRecommendOpenEntry` 逐字复用 `idle`；首屏由 floor 铸「仅含终端」最小卡 | 首开时问 LLM 产初始 next（问候 / 能力探测） |
| 优点 | 首屏零 LLM 往返依赖（可达性优先）；R8 零死端不回归；零新预算 | 「首屏即 AI」 |
| 缺点 | 首开不展示 AI 初始建议 | 首屏依赖网络 / 延迟 / 失败 ⇒ 可达性倒退；须兜底 + 超时降级 |
| 风险 | 无（保持） | R-ADN-010（中） |
| 工作量 | 零 | 中高 |

---

## 4. 推荐方案

| 点 | 推荐 | 理由（一句话） |
|---|---|---|
| 3.1 产出通道 | **A** | 零新增 kind / 零新 LLM 调用 / 基座与工厂零改，唯一满足三条硬约束的形态（DC-ADN-003 / DC-ADN-016） |
| 3.2 校验落点 | **A** | 距档仅 15,474 B；SW 已持有校验所需的全部既有事实；面板侧校验会引入第二校验器（违规）或压垮 A 列账本（DC-ADN-012） |
| 3.3 合并关系 | **A** | 「推荐不是列表」的立法载体（单卡 / 3-chip / 规则表恰 4）**全不动** ⇒ 零 X-ADN-3/4 取代与零密度重锚（DC-ADN-008） |
| 3.4 首开 | **A** | 首屏可达性是 R8 刚立的地板；可达性不得依赖网络与延迟（DC-ADN-010 / NG-ADN-014） |

**总推荐 = A/A/A/A**（即父 spec §11 的 DC-ADN-002/003/005/008/010/012）。实施切片 = 2 叶串行，**先通道与安全闸（叶1）、再兜底与合并（叶2）**。

---

## 5. 文件影响分析

### 5.1 源码（`src/**`）

| 操作 | 文件路径 | 说明 | 列 | 叶 |
|:--:|---|---|:-:|:-:|
| **NEW** | `src/background/ai-next.ts` | 解析 + 5 道校验链（`admitCandidate` / `validateAiNext` / `parseAiNextBlock`）+ label 零明文扫描 + 常量 `AI_NEXT_LABEL_MAX` / `AI_NEXT_PARAM_MAX`（纯函数；SW 侧） | B | 叶1 |
| MODIFY | `src/background/chat-events.ts` | `ChatResultEvent` +`aiNext?`（单声明，type-only） | B | 叶1 |
| MODIFY | `src/background/ref-context.ts` | `refContextSegment` 有引用分支追加产出契约句（基座 / 工厂形态零改） | B | 叶1 |
| MODIFY | `src/background/service-worker.ts` | 累积本回合最后一条 assistant 文本；`done` 时解析 + 校验 + 装配 `aiNext` | B | 叶1 |
| MODIFY | `src/ui/sidepanel/next-registry/definition.ts` | `AiNextCandidate` / `AiNextBlockedCode` / `AiNextPayload` 类型（各恰一处）+ `NextCtx.session.aiNext?` + `NextProvider.chipsFor?` / `label?` | A | 叶1 |
| MODIFY | `src/shared/op-table.ts` | `OpDescriptor.ask?: 'choice'|'form'`（纯加法；两层一致性机核） | A+B | 叶1 |
| MODIFY | `src/ui/sidepanel/next-registry/providers.ts` | `ai-next` provider 行（第 12）+ `DRIVER_DECLS_SRC` 第 12 行 + 订正「8 built-in providers」陈旧注释（COR-ADN-4） | A | 叶1 |
| MODIFY | `src/ui/sidepanel/next-registry/ai-drive.ts` | `driverBlockedLine`（留痕单源，与 `driverSuppressedLine` 同构） | A | 叶1 |
| MODIFY | `src/ui/sidepanel/next-registry/registry.ts` | `validateNextProvider` 对 `chipsFor` 存在时的 loud 校验（加法；`chips` 非空判据不删） | A | 叶1 |
| MODIFY | `src/ui/sidepanel/recommend.ts` | `RecommendInput.session.aiNext?` + `recommendCtx` 透传 + `candidateRules` 用 `chipsFor` + AI 同因预过滤（`refActionDigest` 家系）+ card label 覆盖 | A | 叶1+叶2 |
| MODIFY | `src/ui/sidepanel/next-registry/ops.ts` | `reachableOpIds` 优先 `chipsFor(ctx)` | A | 叶1 |
| MODIFY | `src/ui/sidepanel/sidepanel.ts` | `done` 分支消费 `msg.aiNext`（事件作用域单槽 + blocked 可读行 + 关断门 + 消费后清）+ 测试缝 `testing.aiNext(...)` | A | 叶1+叶2 |

### 5.2 测试（`test/**`；门禁严格串行）

| 操作 | 文件路径 | 说明 | 叶 |
|:--:|---|:-:|---|
| **NEW** | `test/ai-next-candidate.test.ts` | AI-N-1~11（解析 / 5 道链真值表 / 顺序 / 分层 / 注入反证族 / 真源切片 / 零新增载体 / 12↔12 / 零新 LLM·零第二阈值 / `ask` 一致性） | 叶1 |
| MODIFY | `test/recommendation-sources.test.ts` | 等价重锚：注入槽 ∈ 既有 `session` 源；白名单恒 5；规则表恰 4；④ 零新 LLM 保持 | 叶1 |
| MODIFY | `test/driver-timings.test.ts` | DT-6 显式断言 `session.aiNext`；DT-2/3/4/5 不动 | 叶1 |
| MODIFY | `test/driver-quadruple.test.ts` | DQ-1 随 count 12↔12；DQ-3 收纳 `session.aiNext` | 叶1 |
| MODIFY | `test/op-wiring.test.ts` | 计数全保持（`requestTurn(` 1 / `maybeRecommend` 1·8 / `nextAfterSettle` 1·10 / 自动按下 1）；反证保留 | 叶1 |
| MODIFY | `test/next-registry.test.ts` | NR-10 反证还原字面量 11 → 12（间接面） | 叶1 |
| MODIFY | `test/gate-integrity.test.ts` | 新增 `V_ADN_NODE_GATE_FILES` + `EXPECTED_AUDITED_FILES` 下界 +1；`CHROMIUM_GATES === 9` 不动 | 叶1 |
| MODIFY | `test/op-three-tier.test.ts` | 加严：接受层读点 = `tierOf`；gesture 拒 | 叶1 |
| MODIFY | `test/proactivity-guard.test.ts` | 加严：提案不耗预算双向 + 关断两相 | 叶2 |
| MODIFY | `test/supersession-ledger.test.ts` | 新增 X-ADN 台账段一致性判据（老条目 / 保护段判据保留） | 叶2 |
| MODIFY | `test/size-baseline.ts` + `test/size-growth-evidence.test.ts` | 逐叶五要素 + 三值 + `SIDEPANEL_GROWTH_BREAKDOWN` 行；旧条目逐字保留 | 叶1+叶2 |
| MODIFY | `test/ui/s0-self-driven.mjs` | S0''' 四支线断言（**只加断言**；驱动经 `testing.aiNext`） | 叶1+叶2 |
| MODIFY | `test/ui/recommendation.mjs` | 替换口径 / ≤3 / 单卡 / 终端恒最末（**只加断言**） | 叶2 |
| MODIFY | `test/ui/law8-plaintext.mjs` | AI label / 留痕零明文面（**只加断言**） | 叶1 |
| 保留 | 其余 node / Chromium 门禁 | 逐条对账无遗漏（ADR-ADN-009 §④） | — |
| **零改动** | `test/ui/journey.mjs` / `test/ui/binding.mjs` | **保护段 keep ⇒ 字节中立双绿**（ADR-ADN-010 §③） | — |

### 5.3 文档 / 台账（`docs/**`）

| 操作 | 文件路径 | 说明 | 叶 |
|:--:|---|:-:|---|
| MODIFY | `docs/v4-supersession-ledger.json` | 新增 X-ADN 台账段（叶1 骨架 + 叶2 终态）；老条目逐字保留；保护段条目不动 | 叶1+叶2 |
| MODIFY | `docs/v4-density-baseline.json` | **仅当**实测密度读数需要等价重锚（AI 候选渲染面）——**预期零改动**（S0''' 样本经测试缝注入，既有 31 格不动） | 叶2（条件性） |

### 5.4 C 列 / 冻结面（**零触碰**）

`src/content/**`（`content.js` 177,076 B）· `pick-layer.js`（34,358 B）· `packages/web-cli-base/**` · `src/security/policy.ts` / `auto-authorize.ts` · `manifest.json` · `zeroDiffFiles`（9 项）· `.opencode/opencode.json` —— **全部零 diff / 零触碰**。

---

## 6. 风险评估

| # | 风险 | 概率 | 影响 | 缓解措施 |
|---|---|:--:|:--:|---|
| R-ADN-001 | AI 候选幻觉 op / 越界 ref / 越界 param 触达特权 / 不可逆面 | 中 | **高** | 5 道校验链**先于任何候选接受**；`gesture` 恒拒（连提案都拒）；纯函数校验器 + 五类注入必红（ADR-ADN-002/003/007） |
| R-ADN-002 | 非法候选静默接受（安全）或静默丢弃（死端 / 不可判） | 中 | 高 | 丢弃 + **可读 `blocked=` 留痕**（零明文）+ 兜底 next 仍可达；反证「删留痕 / 删兜底 ⇒ 必红」 |
| R-ADN-003 | 确定性兜底失守 ⇒ R8 零死端回归 | 中 | 高 | 未配 ⇒ 纯确定性；未产出 / 全被拦 ⇒ 确定性产卡；**终端恒常驻**；`r8-open-next-entry` / `free-input-next` / `no-dead-end` 必绿 + 反证（ADR-ADN-005） |
| R-ADN-004 | 门禁静默降强度 | 中 | 高 | **先出逐条重锚清单**（ADR-ADN-009）+ 三态齐 + `assertionsRemoved=0` + 反证实跑 + 逐字节还原 |
| R-ADN-005 | AI 多候选溢出（破单卡 / 3-chip） | 中 | 中高 | 同单卡位 + 前 N=3 + 截断 + 列表内去重；反证「产 5 条 ⇒ ≤3 且不新增卡」（ADR-ADN-004） |
| R-ADN-006 | 体积越档位（距档 15,474 B） | 中 | 中高 | **B 列优先**（解析 / 校验在 SW）+ 先出分列预算 + 逐叶实测重登记 + `EC-ADN-016` 预置（ADR-ADN-008） |
| R-ADN-007 | 护栏阈值新增第二份 | 低 | 中高 | 六常量单源复用；**提案不耗预算**（不记账）；显示上限非护栏阈值；反证「第二份阈值 ⇒ 必红」（ADR-ADN-006） |
| R-ADN-008 | `KIND_SET` 40 / 12 kind / 零宿主被撞 | 低 | 高 | 复用 `chat-result` 加法字段（type-only）；反证「注入第 41 / 第 13 / 新宿主 ⇒ 必红」（ADR-ADN-001） |
| R-ADN-009 | 法八零明文被候选文本撞破 | 中 | 中高 | 候选文本只走既有载荷；label 经既有 `label()` 净化工厂（幂等）+ SW 侧 caliber 预筛（`blocked=label`）；留痕只含字段名与原因码；`law8-plaintext` 零降级 |
| R-ADN-010 | 首屏依赖 LLM 往返 ⇒ 可达性倒退 | 低 | 中 | 首开**保持确定性**；首屏零 LLM 依赖断言（ADR-ADN-005） |
| R-ADN-011 | 在飞时 AI 候选与既有仲裁冲突 | 中 | 中 | 产出与按下口径分立；`pending` 不产卡；撞车 `blocked:busy` 不排队；事件作用域单槽不滞留（ADR-ADN-005） |
| R-ADN-012 | 门禁无法断言不确定的 LLM 输出 | 高 | 中 | 判据落**纯函数校验器 + 注入式反证 + 真源切片 + 三段控制**（ADR-ADN-007） |
| R-ADN-013 | 环境性 flake 被误读为回归（`KL-N-10`） | 中 | 低—中 | 隔离复跑 ≥2 + 日志全量 + **仍红如实记录不阻塞收口** |
| R-ADN-014 | 方案先行（开放点被顺手定下） | 低 | 中高 | PD-ADN-001~008 **本阶段全部裁决并落 ADR**（本文件 §7）；未决项如实登记为后续轮 |
| R-ADN-901 | 判定混同（`confirm` 不可见 或 `gesture` 被放行） | 中 | 高 | 分层真值表 + 双向反证（`admit=true ∧ press=blocked:tier`）（ADR-ADN-003） |
| R-ADN-902 | 校验链被写成「先展示后校验」 | 中 | 高 | 校验在 SW、面板只收已校验候选；反证「未校验候选进 chips ⇒ 必红」 |
| R-ADN-903 | 校验器读测试自建常量 / 判据恒真 | 中 | 中高 | 真源切片（生产 `op-table` / 回合 refs）+ 三段控制 + 注入必红 |
| R-ADN-904 | AI 候选被实现成「第 5 规则位 / 第二产出内核」 | 中 | 高 | 骑 `ref-action` 位 + `prepend`；`recommendNextStep` 仍唯一内核；反证「第二内核 / 第 5 规则位 ⇒ 必红」 |
| R-ADN-905 | 载荷加法字段破坏向后兼容 | 中 | 中高 | 「新字段缺席 ⇒ 现状逐字」断言；类型声明落 `definition.ts`；面板消费处状态守卫 |
| R-ADN-906 | 提案被记账成主动回合（预算误耗 / 关断错位） | 中 | 中高 | 双向记账断言（产出不耗 / 成回合才耗）+ 关断两相断言 |
| R-ADN-907 | 替换口径写成「叠加」（越 3-chip / 语义重叠） | 中 | 中高 | 双向判据（AI 在场 ⇒ 无陈旧 chip；缺席 ⇒ 陈旧 chip 在） |
| R-ADN-908 | B 列优先被读成「无成本」（搬列规避账本） | 中 | 中高 | 逐模块归因 + 列别如实标注 + **同时给 B 列预算**；反证「搬列规避 ⇒ 必红」 |
| R-ADN-909 | S0''' 被写成「脚本绿」而非「链路可判」 | 中 | 中高 | 真源切片 + 双向反证 + 注入实跑（承 v5-2 BLOCK-03 / F-35 R-IAN-909 教训） |
| R-ADN-910 | 门禁处置「看起来齐」但漏项 | 中 | 中高 | 按**断言语义**逐条 + 三态齐 + 间接面对账面（ADR-ADN-009 §④；COR-ADN-3） |
| R-ADN-911（新增） | 父 spec §9.5 的旧计数与仓内实况不一致 ⇒ 重锚时误改断言语义 | 中 | 中高 | **按语义增量重锚**（+1 文件 / 计数只增），收口按实测同源前移；**不得**照抄旧字面 |

---

## 7. 生成的 ADR

> PD-ADN-001~008 的裁决落位见下表「对应」列；正文见本目录 `ADR-ADN-0xx-*.md`。

| ADR | 标题 | 状态 | 对应裁决 |
|-----|------|:--:|---|
| **ADR-ADN-001** | AI next 候选的产出通道与提示/解析协议 | ACCEPTED | **PD-ADN-002**（协议形态）/ **PD-ADN-003**（label 净化截断） |
| **ADR-ADN-002** | 5 道校验链与 SW 侧落点（单源复用） | ACCEPTED | **PD-ADN-004**（`ref` 语义）+ 校验链顺序/拒绝码闭集 |
| **ADR-ADN-003** | 「候选接受判定」与「按下判定」分层（`admitCandidate` vs `pressDecision`） | ACCEPTED | O-ADN-005 / DC-ADN-005 |
| **ADR-ADN-004** | 注入与合并口径（`chipsFor` 加法契约 · 单卡位 · 前 N ≤3 · R6 扩展 · 替换） | ACCEPTED | **PD-ADN-005** / **PD-ADN-007** / **PD-ADN-008** |
| **ADR-ADN-005** | 确定性兜底、零死端与首开边界 | ACCEPTED | **PD-ADN-001**（首开不做，deferred） |
| **ADR-ADN-006** | 护栏、预算与留痕（零第二阈值） | ACCEPTED | **PD-ADN-006**（driver id / evidence 字段名） |
| **ADR-ADN-007** | S0''' 双面验证设计（四支线 + 注入反证族 · 只加断言） | ACCEPTED | FR-ADN-080~085 |
| **ADR-ADN-008** | 体积分列预算（A/B/C 列 · 距档 15,474 · 不触发升档） | ACCEPTED | FR-ADN-120~125 / EC-ADN-016 |
| **ADR-ADN-009** | 门禁等价重锚清单（新增 1 + 升级 6 + 间接 · 保护段 keep） | ACCEPTED | FR-ADN-110~117 |
| **ADR-ADN-010** | X-ADN-1~11 取代台账与保护段决策（逐条终态） | ACCEPTED | FR-ADN-090~101 / X-ADN-1~11 |

### 7.1 PD-ADN-001~008 裁决摘要（**本阶段全部裁决**）

| PD | 议题 | 裁决 | 落点 |
|---|---|---|---|
| **PD-ADN-001** | 首开 AI 化 | **本轮不做**（首开保持确定性；零 LLM 往返依赖）；后续轮若做须保留兜底 + 超时降级 | ADR-ADN-005 §⑤ |
| **PD-ADN-002** | LLM 结构化输出的提示 / 协议形态与解析严格度 | 骑 `refContextSegment` 有引用分支的产出契约 + 尾随 `next` 围栏块 + 严格 JSON 数组；取最后一条 assistant 文本的最后一块；逐项容错；无块/非数组 ⇒ 零候选（支线 C）；**零新 LLM 调用** | ADR-ADN-001 §③④ |
| **PD-ADN-003** | `label` 净化 / 截断 | SW 侧：形状 + 零明文 caliber 预筛（命中 ⇒ `blocked=label`）+ `AI_NEXT_LABEL_MAX=48`（先扫后截）；面板 `label()` 仍**唯一**净化工厂（幂等） | ADR-ADN-001 §⑥ |
| **PD-ADN-004** | AI 候选 `ref` 字段语义面 | `ref` = 字符串 `refId`（或规范形 `ref_<n>`），必须命中本回合 `ChatRefFact[]` 且 `refState==='valid'`；不接受裸数字 | ADR-ADN-002 §④ |
| **PD-ADN-005** | 是否只在 `ref-action` 规则上下文产出 | **本轮是**（提示只出现在有引用分支 + 骑 `ref-action` 位）；更泛产出面（含参数化 chip 派发）**登记后续轮** | ADR-ADN-004 §PD-ADN-005 |
| **PD-ADN-006** | 驱动者 id 字面量与 `evidence` 字段名 | `driverId='ai-next'` / `timing='idle'` / `evidence=['session.aiNext']`；拒绝行 = `driverBlockedLine(driverId, timing, evidence, codes)`（`... \| blocked=<codes>`，零值） | ADR-ADN-006 §①② |
| **PD-ADN-007** | 多候选前 N 与排序 | **N = 3**（= `MAX_CHIPS_PER_CARD`）；排序 = AI 数组顺序；超出截断；不与规则候选交错；列表内按 `opId#label` 去重 | ADR-ADN-004 §④ |
| **PD-ADN-008** | `recommendation-sources` 白名单是否新增条目 | **不新增**（类型落 `definition.ts`；校验器在 SW 侧不入 `recommend.ts` 导入面）⇒ 白名单恒 5；X-ADN-9 未发生取代 | ADR-ADN-004 §① |

---

## 8. 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建（父 `plan.md` + 2 叶 `plan.md` + `ADR-ADN-001~010` 正文）：① 产出通道与协议（PD-ADN-002/003）② 5 道校验链 + SW 落点（PD-ADN-004）③ 判定分层（`admitCandidate` vs `pressDecision`）④ 注入与合并（`chipsFor` / 单卡 / 前 N=3 / R6 扩展 / 替换；PD-ADN-005/007/008）⑤ 兜底与首开边界（PD-ADN-001）⑥ 护栏与留痕（PD-ADN-006）⑦ S0''' 双面 + 注入反证族 ⑧ 体积分列预算（A/B/C；距档 15,474；不升档）⑨ 门禁重锚清单（新增 1 + 升级 6 + 间接；保护段 keep）⑩ X-ADN-1~11 逐条终态。**本阶段只做 plan**；`.sddu` 外零触碰。 | 2026-09-26 | SDDU Plan Agent |
