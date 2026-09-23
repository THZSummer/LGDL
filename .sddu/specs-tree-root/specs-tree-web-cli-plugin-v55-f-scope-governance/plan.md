# 技术计划：specs-tree-web-cli-plugin-v55-f-scope-governance（web-cli-plugin v5.5.1「范围治理：引用即范围」；父 Feature 统领性技术方案）

> **文档定位**: SDDU 技术方案（**父 / 跨切契约与索引**）—— 记录跨切架构、总体方案取舍、聚合文件影响、红线继承、体积分列预算与实施波次，以及 **8 条 ADR 的索引**（正文见本目录 `ADR-SGO-001~008-*.md`），作为 2 叶实施、审查与收口的单一参照
> **前置依赖**: 本目录 `spec.md` v1.0（**88 FR / 14 NFR / 22 EC / 26 AC / 22 NG / 10 US / 8 G**；O-SGO-001~009 全 `ruled`；§12 X-SGO-1~7 等价重写映射；§13 N-SGO-001~023 继承 + N-SGO-024~030 新增；§5.12.1 分列预算表；§14 2 叶拆分）+ `discovery.md` v1.0（Q-SGO-001~015 / A-SGO-001~010 / R-SGO-001~011 / O-SGO-001~009 / §7.1 基线 A~E 全量 `file:line`）+ 2 叶 `spec.md` v1.0（`specs-tree-v55f-1-ref-context-and-anchor` / `specs-tree-v55f-2-batch-consent`）+ 唯一直接上游 `specs-tree-web-cli-plugin-v55-self-driven/{plan.md, ADR-V55-001~012}`（**v5.5 三叶全 `validated`，零改写**）+ R6 快修轮 `74d76c1`（**零改写**）
> **创建人**: SDDU Plan Agent
> **创建时间**: 2026-09-24
> **版本**: v1.0
> **更新人**: SDDU Plan Agent
> **更新时间**: 2026-09-24
> **更新说明**: 初始创建（父 `plan.md` + 2 叶 `plan.md` + **ADR-SGO-001~008 正文**同批产出：① 引用事实进回合（载荷落点 / 系统段追加 / 面板→SW 取数通道 / 留痕口径）② 范围读数（法九）单源 + 判定输入两路 + `law9-scope-reading` 门禁 ③ `--ref <n>` 锚定解析链（plugin 侧包装 / 单节点 / 失配 EC 家族）④ 任务级批量授权（计划结构 / 计划指纹 PD-SGO-006 / 一次手势 / 计划外回落 / 特权不入批 / 审计零明文 / PD-SGO-005·007）⑤ 扩围征询（ask-user 二择 / `out-of-scope-authorized` / 留痕）⑥ S0′ 双面机器化（`ty.md` 原案重放 / 双向反证 / 真源切片）⑦ 体积分列预算（A/B/C 列 + 15% 缓冲 + 2.8× 最坏 + 逐叶重登记 + 升档 EC 路径）⑧ PD-SGO-001~004 裁决汇总。**本任务只做 plan**：不写 tasks、不写代码、不改 `src/**`·`test/**`·`dist/**`·`docs/**`·`design/**`·ROADMAP，不改 v1~v5.5 与 R6 SDDU 目录，不动 `main`、不 force push，**不跑门禁 / 构建 / Chromium**，**未调用任何受管 Provider**（routing.v1 = `local_or_compute → none`）。

---

## 1. 前置检查

| 检查项 | 状态 | 证据 |
|--------|:--:|------|
| 父 `spec.md` 存在 | ✅ | 本目录 `spec.md`（931 行，v1.0，2026-09-23，`phase=specified`） |
| 2 叶 `spec.md` 存在 | ✅ | `specs-tree-v55f-1-ref-context-and-anchor/spec.md`（262 行）/ `specs-tree-v55f-2-batch-consent/spec.md`（251 行），均 v1.0 |
| 叶数量与结构 | ✅ | 2 叶（`leaf:true` / `depth:2` / `deliveryOrder` 1..2 / `dependsOn: v55f-1 → v55f-2`）；父 `depth=1` 轻量规范容器（不承接 build/review/validate、不产 `tasks.json`） |
| 外部 API 文档缓存 | ✅ N/A | **零外部 API / 零新依赖 / 零新权限**（`manifest.json` **零 diff**）；无 `/sddu:api-docs` 需求 |
| 参数化模板 | ✅ | `.opencode/plugins/sddu/templates/output/sddu-plan.md.hbs`（79 行；**无**用户级覆盖 `.sddu/templates/agents/output/sddu-plan.md.hbs`） |
| 上游先例 | ✅ | v5.5 `plan.md`（父 + 3 叶 + `ADR-V55-001~012`，本 Feature 沿用「ADR 正文独立成文件」落法：agent 模板 §5.7） |
| 分支 / HEAD / 工作区 | ✅ | `feature/web-cli-plugin` / `bb82bc6`（F-34 spec 产物）/ `git status --short` 空（`spec.md` 的 §1 记 HEAD `a9b294e`，spec 提交 `850ae82` + 计数订正 `bb82bc6` 之上） |
| 红线现值（**本轮只读复核**） | ✅ | `dist/content.js` **177,076 B** / `52a82620…`（零容差）；`dist/pick-layer.js` **34,358 B** / `77796bab…`（零容差）；`dist/sidepanel.js` 登记 **578,623 B**（生效上限 `floor(578,623×1.05) = 607,554` / 档位 **614,400** / 绝对上限 **675,840** / `authorConfirmation = pending-author-line`）；`KIND_SET` **40 项逐字**（实测）；`STREAM_TERMINALS` **6 逐字**；`REGISTERED_STRUCTURAL_HOSTS === []` |
| 主流程调用点（**本轮只读实测**） | ✅ | `requestTurn(` **恰 2**；`maybeRecommend(` **1 定义 / 7 调用点**；`nextAfterSettle(` **1 定义 / 10 调用点**；`tierOf` 单源；`op.execute(` 恰 1；`pressCandidate` 内 `dispatchChipAction(` 恰 1 |
| base 零 diff 机核 | ✅ | `test/insight-no-escalation.test.ts:147` `assert.equal(gitDiffStatus(['../web-cli-base']), 0, …)` 为现有判据（本 Feature 不碰该文件判据） |
| 保护 pin（**本轮只读复算命中**） | ✅ | journey `startByte 43054` / `endByte 58287` / sha `cc79f413…`；binding `startByte 107780` / `endByte 115930` / sha `be9ad0e9…`（口径 = `supersession-ledger.test.ts#protectedPinFailures`，见 ADR-SGO-006 §6 / 本计划 §5.4） |
| 写入范围 | ✅ | 仅本 Feature SDDU 目录（父 + 2 叶 `plan.md` / 8 ADR / 3× `state.json` / `TREE.md`）；**未跑任何门禁 / 构建 / Chromium** |

### 1.1 偏差登记（父 `plan.md` 的产出 vs 父 spec 的「轻量规范容器」定位）

父 `spec.md` §14.1 明定父 Feature = 轻量规范容器（不承接 build/review/validate，不产出 `tasks.json`）。本阶段按编排器任务书产出**父 + 2 叶两份层级的 `plan.md`**，与 v4 / v4.5 / v5 / v5.5 先例同口径**显式登记**：

| 项 | 内容 |
|---|---|
| 偏差 | 父产出 `plan.md`（spec §14.1 未列出父 `plan.md`） |
| 理由 | 跨切契约（红线继承 N-SGO-001~030 / 不动面 / 取代台账 / 体积分列预算与升档策略 / 波次 / 门禁集合 / ADR 编号）需要**单点定义**，否则 2 叶与收口各持一套口径 |
| 容器内核仍遵守 | 父**不产出** `tasks.md` / `tasks.json`；父**不承接** build/review/validate；实施全部由 2 叶承载；父 `state.json` 的 `depth=1` / `childrens` 结构不变 |
| 引用方式 | 叶对父的引用 = 「父 FR/AC + `ADR-SGO-0xx` 编号」，不依赖父 `plan.md` 的物理存在性 ⇒ 本文件可整篇作废而不牵连叶 |
| ADR 编号 | 本 Feature 用 `ADR-SGO-001~008`（与 FR/N/EC/AC 的 `SGO` 命名空间一致；不占用上游 `ADR-V55-*` / `ADR-V5-*` 编号） |

### 1.2 本阶段的两条硬性约束（**先写结论**）

| 约束 | 结论 | 依据 |
|---|---|---|
| **体积（A 列 / `dist/sidepanel.js`）** | 叶1 **6.0~9.0 KB** + 叶2 **3.5~5.5 KB** = **Σ 9.5~14.5 KB**；+15% 缓冲 = **10.9~16.7 KB** ≤ 生效上限余量 **28,931 B** ✅ 且 ≤ 距档余量 **35,777 B** ✅ ⇒ **正常口径不触发升档**。**2.8× 最坏情形**（承 v5 教训）≈ **30.6~46.7 KB** ⇒ **可能跨档位 614,400** ⇒ **预置 EC-SGO-022 显式升档路径 + 作者一行**（本阶段**不触发**、**不伪称已确认**） | §5.12.1 / ADR-SGO-007 |
| **B 列（`dist/background.js`，不计账）** | 叶1 **5.0~8.0 KB** + 叶2 **3.0~5.0 KB** = Σ **8.0~13.0 KB**；系统段组装 / `--ref` 包装 / 批量判定**优先落 SW 侧**（不计入 sidepanel 账本） | ADR-V55-011 §1 口径 / FR-SGO-121 |

> 口径：`sidepanel.js` 是**唯一**带字节预算的产物；`background.js`（SW bundle）/ `options.js` / `content.js` / `pick-layer.js`（冻结）/ `test/**` **不计入**该账本（v5 逐字先例：「落在 **service-worker** 产物（不在本 bundle，故不计入）」）。C 列（`content.js` / `pick-layer.js`）**零容差零触碰**。

---

## 2. 架构分析

### 2.1 问题定性（题眼）

v5 把「下一步**是什么**」做成管线强制保证；v5.5 把「下一步**由谁按**」交给系统 / AI 侧。**v5.5.1 的题眼 = 「下一步按的范围是什么」** —— 用户已经用「引用」把范围指出来了，但系统在机制上不知道这件事：

1. **回合载荷只有 `user`**（`sidepanel.ts:329` `send(makeMessage('chat', { user: trimmed }))` → `service-worker.ts:2636` `message.user` → `runChat(s, user)`），引用事实**物理缺失**（根因 A）。
2. **系统段 = 静态常量 `SYSTEM_PROMPT`**（`service-worker.ts:107-118`，全文无「引用」/「范围」条款；`:943` / `:948` 注入）（根因 B）。
3. **base `dom` 工具零 `ref` 参数**（`dom-tools.ts:462-470` 只认 `--selector`/`--text`；`set-text` 属 write 组缺省 ask；`permission.ts:16,157,333`）（根因 C）。
4. **锚点其实已存在**：`data-wcli-ref` = refId，写在捕获时**单一节点**上（`content/ref-capture.ts:67,370`，best-effort；`ty.md:566` 实测恰 1 命中）（根因 D）——**AI 亲手读到仍未锚定**，所以问题不是能力而是**链路不可见 + 无范围法则 + 工具面无 ref + 授权逐条**。
5. **跨进程断层**：引用表在**面板**（`l1/ref-store.ts`），工具调用在 **SW**（`service-worker.ts:951` `s.host.dispatch`）⇒ SW 不持有 refId→节点映射（根因 E）。
6. **逐条授权退化为连点**：base 权限门 ask → plugin `createConfirmBridge`（`security/confirm.ts:84-156`）→ SW `confirm-request` → 面板 `confirm` → 既有 `auth` 卡（`chat-state.ts:616-622`）。真机 **42 调用 / 42 卡 / 42 批准 / 理由串逐字相同**（根因 G / `ty.md`）。

**决定性反证（承 discovery §0.2 / 父 spec §2.2）**：AI 在 `ty.md:545-551` 已读到 `data-wcli-ref="ref_1"`、`ty.md:563-567` 已证 `[data-wcli-ref]` 恰 1 命中，**仍然**用 42 个不同选择器覆盖整页 ⇒ 本 Feature 的验收锚 = 把这条真机序列**机器化**（S0′）。

### 2.2 目标架构（跨切）

```
packages/web-cli-plugin/src/
├── background/                              ←【B 列 / 不计账】
│   ├── messaging.ts                  ←【改，type-only】`ChatRefFact` / `ChatRefTurnPayload`（**不进 KIND_SET**）
│   ├── ref-context.ts                ←【新】系统段**追加段**组装（引用事实 + 法则引导）+ 回合载荷运行时校验
│   ├── ref-turn.ts                   ←【新】当前回合**活跃引用单源**（refs / tabId / observe 缝；每回合 set / clear）
│   ├── ref-observe.ts                ←【新】`observeIdentity` 抽为**单一实现**（service-worker 与 tools 共用；单节点口径）
│   ├── service-worker.ts             ←【改】`case 'chat'` 读 refs；`runChat(s,user,refs)`；`system: () => 基座 + 追加段`；ref-turn set/clear；（叶2）批次 toolCalls 捕获 + 计划缝
│   ├── turn-queue.ts                 ←【改】`QueuedTurn.refs`（排队回合自带快照，零跨回合漂移）
│   └── batch-plan.ts                 ←【新，叶2】计划结构 + **计划指纹** + 准入（纯函数）
├── tools/                                   ←【B 列 / 不计账】
│   ├── dom-anchor.ts                 ←【新】`wrapDomEntryForAnchor`（覆写 schema + 替换 executor；调用后**仍交基线 executor**）
│   └── browser-tools.ts              ←【改】`dom` 条目接线包装层（base 零 diff）
├── security/
│   └── confirm.ts                    ←【改，叶2】计划感知桥（指纹准入 + 计划外回落 + 零明文审计）；`cont` 单条路径逐字不变
└── ui/sidepanel/                            ←【A 列 / 计账】
    ├── l1/ref-scope.ts               ←【新】**范围读数单源**（四值 + 判定函数 + 引用快照形状 + 留痕字段名）+ `turnRefsOf`
    ├── l1/ref-store.ts               ←【改】只读取用（活跃有效引用访问器；判定语义零改）
    ├── sidepanel.ts                  ←【改】`requestTurn` 内**唯一**载荷构建点；confirm 处范围闸（越界拦 + 扩围缝）；留痕行；二择接线
    ├── chat-state.ts                 ←【改，叶2】auth 卡**渲染用**计划字段（非 `payload`）
    └── cards/auth.ts                 ←【改，叶2】计划行渲染（textContent + 凭据形掩码；静态模板口径）
```

**七条结构性不变量**（本 Feature 的验收骨架，ADR 逐条落地）：

| # | 不变量 | 判据 | 承载 ADR |
|:-:|---|---|---|
| I1 | **引用事实两条回合入口同口径** | 驱动者自动成回合（`op.turn` 槽）与手动 composer **共用 `requestTurn` 内唯一构建点**；`requestTurn(` **仍恰 2** | ADR-SGO-001 |
| I2 | **范围读数可判且唯一声明** | 四值在 `l1/ref-scope.ts` **恰一处**；第二声明 ⇒ FAIL；双向反证 + 三段控制（`ok`/`violated`/`n/a`） | ADR-SGO-002 |
| I3 | **写动作可按引用锚定且失配 fail-closed** | `--ref <n>` → `[data-wcli-ref="ref_n"]`；`nodeCount === 1` 唯一通过；0 / 多命中 / 标记缺失 / 序号越界**四类非静默** | ADR-SGO-003 |
| I4 | **批量授权 = 一次真实手势 ∧ 计划指纹 ∧ 计划外回落** | 计划内一次手势放行；计划外逐条；**特权 op 恒不入批**；批量变体注入必红 | ADR-SGO-004 |
| I5 | **扩围是正向路径且可判** | `out-of-scope-authorized` 只由**用户确认**产生（AI 不得自填）；拒绝后零死端 | ADR-SGO-005 |
| I6 | **S0′ 双面机器化且双向反证** | `ty.md` 原案重放；**改写处数 ≤ 引用数**（未授权）；去注入 ⇒ 读数 `no-ref` 必红；真源切片 | ADR-SGO-006 |
| I7 | **零新增载体 + 冻结面零容差 + 体积分列** | `KIND_SET` 40 / 12 kind / 零宿主 / `content.js` 177,076 / `pick-layer.js` 34,358 逐字不变；A×1.15 ≤ 余量 | ADR-SGO-007 |

### 2.3 数据流与依赖（跨切）

| 面 | 变更方向 | 关键契约 |
|---|---|---|
| 回合载荷 | `{user}` → `{user, refs?}`（**type-only**） | 唯一构建点 = `requestTurn`（`sidepanel.ts:304`）；`refs` 缺省 ⇒ 与现状逐字相同；`KIND_SET` 40 逐字 |
| 引用快照 | 面板 ref-store → 回合载荷（**回合发起时快照**） | 只取 `verdict === 'valid'` ∧ 未退役；字段集 7 项（`refNum`/`refId`/`selector`/`refMark`/`textDigest`/`refState`/`nodeCount`）；凭据形 `textDigest` 掩码；**无新通道**（SW 的引用唯一来源 = 回合载荷） |
| 系统段 | 静态常量 → **常量基座 + 每回合追加段** | `SYSTEM_PROMPT` **逐字保留为基座**；无引用 ⇒ `system === SYSTEM_PROMPT`（逐字）；追加段含引用事实 + 法则引导（**引导**，非判据） |
| 范围读数 | 新增（法九） | 单源 `l1/ref-scope.ts`；判定输入 = 写目标（`--ref` 命中 ∨ selector 命中）vs 活跃引用集合；四值 |
| 越界写 | 无判据 → **confirm 面机制拦截** | `out-of-scope-unauthorized` 的写 fail-closed 拦下；判定链（`policy.ts`/`auto-authorize.ts`）**零触碰**；扩围走用户确认（叶2 二择卡） |
| 工具面 | base 零 ref → **plugin 侧包装** | `--ref` 仅 `set-text`；`risk`/`subcommandRisks` **不放宽**；失配非静默；base 零 diff（`insight-no-escalation:147`） |
| 授权 | 逐条 → **任务级批量**（叶2） | 计划 = **系统从单条 assistant 消息的 toolCalls 聚合**（PD-SGO-005）；指纹（PD-SGO-006）；一次手势；计划外回落；特权不入批；审计零明文 |
| 留痕 | 三要素 → 三要素 + **范围读数字段名** | 字段名/机器枚举（读数词 + actor），**零用户内容值**；扩围事实可读 |
| 载体 | 复用 12 kind | refs = `chat` payload 字段；批量卡 = 既有 `auth` kind；二择 = 既有 `askuser`；**零新增 kind / 宿主** |
| 体积 | 余量 28,931 B → **分列预算 + 逐叶重登记** | A 列正常口径不触发升档；2.8× 最坏预置 EC-SGO-022；`cap` 保持 `record-only` |

### 2.4 八条设计任务的定案（编排器任务书 1~8 的正面回答）

> 完整论证见对应 ADR；此处给出**结论 + 判据锚**，供 tasks 阶段直接引用。

| # | 任务 | **定案** | 判据锚 |
|:-:|---|---|---|
| 1 | **引用事实进回合** | `chat` 载荷新增 **type-only** `refs`（字段集 7 项；`KIND_SET` 40 不动）；**唯一构建点 = `requestTurn` 内**（两条入口同口径）；SW `runChat` 收结构化载荷；系统段 = **常量基座 + 追加段**（`refContextSegment`，无引用 ⇒ 空串）；SW 的引用唯一来源 = 回合载荷（**零新通道**）；口径写死：页面文本可入 LLM 上下文 / 凭据值掩码 / 留痕只含字段名 | ADR-SGO-001 |
| 2 | **范围读数（法九）** | 单源 `l1/ref-scope.ts`：`SCOPE_READINGS` 四值 + `scopeReading(facts)` 唯一判定函数；输入 = 写目标（`--ref` 命中 ∨ selector 命中两路）vs 活跃引用集合 + `authorized` 事实；越界写由 **confirm 面**机制拦截（fail-closed）；`test/law9-scope-reading.test.ts`（node）双向反证 + 三段控制 + **真源切片**；`CHROMIUM_GATES === 9` 不动 | ADR-SGO-002 |
| 3 | **`--ref` 锚定** | `wrapDomEntryForAnchor`（plugin 侧条目包装，base **零 diff**）→ `--ref <n>` 词法 → 活跃引用查表 → 合成 `[data-wcli-ref="ref_n"]` → **live 单节点闸**（复用 `observeIdentity` 单一实现，`nodeCount === 1` 唯一通过）→ 交基线 `baseExecutor`；**先落 `set-text`**；0/多命中/标记缺失/序号越界/与 `--selector` 同给 = **EC-SGO-001~003 / 015~017 非静默**；`risk` 不放宽 | ADR-SGO-003 |
| 4 | **批量授权** | 计划 = **系统聚合**（单条 assistant 消息的全 `toolCalls` 中 ref 范围内的 `set-text`；N≥2 出卡，N==1 逐条，N==0 不出——PD-SGO-005）；指纹 = sha256(canonical(逐字节 selector ∧ 动作类型 ∧ 文本对))（PD-SGO-006）；一次**真实手势**（既有 `auth` 卡）；计划外逐条回落；**特权 op 恒不入批**；审计零明文（字段名 + 计数 + 指纹摘要）；中止/部分完成如实；批量变体注入必红 | ADR-SGO-004 |
| 5 | **扩围征询** | 越界写前 `ask-user` **二择**（「仅引用范围内」/「整页」）复用既有 `askuser`；选「整页」⇒ `out-of-scope-authorized` + 入留痕；只由**用户确认**产生（AI 不得自填）；拒绝/取消后**零死端**（`no-dead-end` 只增） | ADR-SGO-005 |
| 6 | **S0′ 验证设计** | `ty.md` 原案重放（拾取引用 ① → 答「原地翻译为中文」→ 自动成回合（载荷含引用事实）→ 系统段基座 + 追加 → 读数 `in-scope` → **只改写引用目标恰 1 处** → 留痕含范围字段名）；**node + Chromium 双面**共用**同一份样本**（`test/ui/fixtures/s0-chain.mjs`，「只加断言不加文件」）；**双向反证**：去掉范围注入 ⇒ 读数 `no-ref` 必红（`expectFailPattern`）⇒ 逐字节还原（sha256）⇒ PASS；人工面 `⏳ 未执行` 不冒充 PASS | ADR-SGO-006 |
| 7 | **体积分列预算** | A 列（`sidepanel.js`，计账）叶1 6.0~9.0 KB / 叶2 3.5~5.5 KB ⇒ Σ×1.15 = **10.9~16.7 KB ≤ 28,931**（正常口径不触发升档）；B 列（`background.js`，不计账）优先落点表；**逐叶收口实测重登记**（五要素 + V3-VOL-3 三值 + metafile 逐模块归因）；**2.8× 最坏 ≈ 30.6~46.7 KB ⇒ 预置 EC-SGO-022 升档路径 + 作者一行（本阶段不触发、不伪称确认）** | ADR-SGO-007 |
| 8 | **PD-SGO-001~007 裁决** | PD-001 读命令 `--ref` **本阶段不做**（登记后续轮）；PD-002 **每回合重观测不做**；PD-003 **字段集保持 7 项最小集**；PD-004 **读数不入新流内可见面**（走留痕 + 二择卡）；PD-005 **系统聚合**；PD-006 **逐字节入哈希、摘要出账**；PD-007 **展示上限 8 行 + 诚实计数行**（显示策略，指纹不受影响） | ADR-SGO-008 |

### 2.5 X-SGO-1~7 逐条处置（**显式取代台账的规约**）

> 承父 spec §12（映射表）+ §5.10（SUPERSEDE 段）。**「显式取代」≠「放宽」**：判据**等价重锚**（断言力不降、计数只增），并留台账（FR-SGO-107 / 112）。**默认优先「在既有注册表内扩张（diff = 0）」读法。**

| X | 现状（逐字） | 处置 | 落地（门禁） | 台账动作 | 叶 |
|---|---|---|---|---|---|
| **X-SGO-1** | `chat` 载荷恰 1 字段（`{user}`）；`runChat(s,user)` 裸串 | **取代 = 允许携带引用上下文**（type-only ⇒ 不新增 kind；两条入口同口径）；`requestTurn(` **仍恰 2** | `test/op-wiring.test.ts`（`requestTurnProblems` **原判据不改**）+ `messaging` type-only 判据（`KIND_SET` **40**） | `modifiedRanges[]`（`sidepanel.ts` 载荷构建 + `service-worker.ts` 签名 / `messaging.ts` type-only）**只增** | 叶1 |
| **X-SGO-2** | 系统段 = 静态常量（`:943` / `:948`） | **取代 = 常量基座 + 每回合追加段**（常量**保留为基座**，逐字不动）；**须新增判据**（现无门禁读提示词） | **新** `test/law9-scope-reading.test.ts`（判据**不读** `SYSTEM_PROMPT`；真源切片指向读数模块）+ `test/ref-context-in-turn.test.ts`（基座 5 条条款逐字保留 + 零引用 `system === 基座`） | `modifiedRanges[]` + 新 node 门禁入受审集合 | 叶1 |
| **X-SGO-3** | base `dom` 零 ref；base 零 diff（`insight-no-escalation:147`） | **取代 = plugin 侧包装**（覆写 schema + 替换 executor，基线 executor 仍被调用）；**base 零 diff 不解冻**；`risk` / `subcommandRisks` **不放宽** | `insight-no-escalation` 绿 + **新** `test/dom-ref-anchor.test.ts`（risk 降档注入 ⇒ 必红） | `modifiedRanges[]`（`src/tools/**`） | 叶1 |
| **X-SGO-4** | 逐条写入授权（每命令一张 `auth` 卡） | **取代 = 任务级批量授权**（计划 → 一次手势 → 计划外回落）；`RL-06` / OT-⑩ **扩批量变体并注入必红**；`law8` 36 **不得降级**；`auth` 6 终态语义保持 | `test/supersession-ledger.test.ts`（RL-06 扩）+ `test/op-three-tier.test.ts`（OT-⑩ 扩）+ `law8` 不降级 + **新** `test/batch-consent.test.ts` | `modifiedRanges[]` + `redlineRemap[]`（扩断言，非替换） | 叶2 |
| **X-SGO-5** | 引用判定只回答「可不可用」（3 结果 / 6 维度，fail-closed） | **取代 = 增设「作为范围锚」的解析读数**（单节点保证 + 失配 / 失效可判）；**不得**改变 `valid/invalid/unknown` 的 deny 方向 | `test/l1-ref-validity.test.ts` / `test/ui/l1.mjs` / `test/ui/page-input.mjs`（**只增**）+ 新读数**双向反证** | `modifiedRanges[]` + 计数对账 | 叶1 |
| **X-SGO-6** | 终态词汇（`BLOCKED_TERMINALS` 5 + `DRIVER_TERMINALS` 4） | **裁决 = 优先以「读数」承载**（**不新增终态字面量**、不动 `STREAM_TERMINALS` / `DRIVER_TERMINALS`）⇒ **词汇未扩张** | `test/driver-terminals.test.ts`（第二声明 ⇒ FAIL）+ `law7x-ext` 绿 | **无扩张条目**（如实登记「以读数承载、未扩张」） | 叶2 |
| **X-SGO-7** | 主流程调用点计数（`requestTurn(` 2 / `maybeRecommend(` 1def+7calls / `nextAfterSettle` 1def+10calls） | **走既有注册表内扩张（主流程 diff = 0）**；**不得**新增调用点 | `test/op-wiring.test.ts`（原判据不改 + 计数复合读数）+ `driver-timings` / `driver-quadruple` / `recommendation-sources` 绿 | **未发生取代**（如实登记 ✅） | 叶1 |

> **落地纪律**（逐条强制，FR-SGO-111 / 112）：① 无「放宽阈值 / 删除断言 / 静默改常量 / 静默替换冻结对象」；② 每项判据 ≥1 注入反证（注入 ⇒ 实跑 FAIL ⇒ **逐字节还原**（sha256 前后相同）⇒ PASS）；③ 判据力可逐条对账；④ **未发生取代者（X-SGO-7）与「以读数承载」者（X-SGO-6）如实登记**，不留空、不制造假条目。

### 2.6 红线继承表（**N-SGO-001~030 逐条**）

> N-SGO-001~023 逐字承 discovery §7.2 / 父 spec §13.1；N-SGO-024~030 承父 spec §13.2（spec 新增）。本计划的「继承动作」= 本 Feature 如何**逐条不退化**。

| # | 红线（逐字要点） | 继承动作 | 承载 ADR | 验收锚点 |
|---|---|---|---|---|
| **N-SGO-001** | `dist/content.js` **177,076 B** / `52a82620…`（零容差） | **不动**（零 `src/content/**` 改动） | SGO-007 | AC-SGO-023 |
| **N-SGO-002** | `dist/pick-layer.js` **34,358 B** / `77796bab…`（零容差） | **不动** | SGO-007 | AC-SGO-023 |
| **N-SGO-003** | `sidepanel.js ≤ 607,554` = `floor(578,623×1.05)`；容差 5% 未动；cap `record-only` | **预算前移 + 逐叶重登记** | SGO-007 | AC-SGO-024 |
| **N-SGO-004** | V3-VOL-3 三值（档位 **614,400** / 绝对 **675,840** / `newBaselineBytes` 同源前移）；`authorConfirmation` 不得伪称已确认 | **保持 + 2.8× 最坏跨档位显式预案** | SGO-007 | AC-SGO-024 |
| **N-SGO-005** | 特权 op 恰 2 恒 `gesture`（`op.authorize`/`op.perm.request`；「SW 永不 `.request(`」） | **逐字保留**（批量不触达） | SGO-004 | AC-SGO-005 |
| **N-SGO-006** | consent（confirm / gesture）不得被 AI 代答（含 `pressDecision` 实判据 + 注入反证） | **扩批量变体注入必红** | SGO-004 | AC-SGO-005 |
| **N-SGO-007** | `packages/web-cli-base/**` 零 diff | **逐字遵守**（`--ref` 走 plugin 侧包装） | SGO-003 | AC-SGO-025 |
| **N-SGO-008** | 判定链零触碰（`policy.ts`/`auto-authorize.ts`，`zeroDiffFiles` 9 项） | **不动**（范围闸走 confirm 面） | SGO-002 | AC-SGO-025 |
| **N-SGO-009** | `KIND_SET` 40 项逐字不增；新消息族走 type-only | **逐字不动**（refs / 计划 / 读数均 type-only 字段） | SGO-001 / 004 | AC-SGO-006 |
| **N-SGO-010** | 12 kind 契约不动；零新增流内固定宿主（`REGISTERED_STRUCTURAL_HOSTS === []`） | **逐字不动**（复用 `auth` / `askuser`） | SGO-004 / 005 | AC-SGO-006 |
| **N-SGO-011** | 法八四面零明文不退化（payload/digest/审计/DOM 全属性） | **不退化**（计划正文仅 UI 渲染 + 掩码；审计只记字段名/计数/指纹摘要） | SGO-004 | AC-SGO-010 |
| **N-SGO-012** | 法七不退化（5 类阻塞必有可达 next，死端 = 0） | **只扩张不削弱**（拒绝扩围零死端） | SGO-005 | AC-SGO-009 |
| **N-SGO-013** | 法七扩展终态恰 4、与 `STREAM_TERMINALS` 正交；字面量只在 `terminals.ts` | **不动**（读数**不**新增终态字面量） | SGO-005 / 008 | AC-SGO-003 |
| **N-SGO-014** | 主流程调用点计数门禁：`requestTurn(` 仅 2 处；调用点登记表覆盖全部 op | **原判据不改**（复合读数 + 反证） | SGO-001 | AC-SGO-002 |
| **N-SGO-015** | 断言零删除零降级、计数只增不减（唯一例外 = 保护段显式取代并留痕） | **逐字遵守** | SGO-006 | AC-SGO-017 |
| **N-SGO-016** | 保护 pin：journey `43054..58287`/`cc79f413…`/240 行；binding `107780..115930`/`be9ad0e9…`（`decision = keep`） | **保段优先**（若取代走八步） | SGO-006 | AC-SGO-018 |
| **N-SGO-017** | 门禁严格串行（一次一个 Chromium，绝不并发）；`CHROMIUM_GATES === 9` 不动 | **逐字遵守**（只加 node 门禁） | SGO-006 | AC-SGO-021 |
| **N-SGO-018** | 纪律：不碰 `main`、不 force push、path-limited `git add`、禁改 `.opencode/opencode.json`、禁改 `packages/web-cli-base/**`、无新依赖 | **逐字遵守** | §7 | §7 |
| **N-SGO-019** | `F-29`（A2A 候选）保持原样不动（ROADMAP 相关区段一字不动） | **不动** | §7 | §7 |
| **N-SGO-020** | v5.5 / R6 产物零改写（父 + 三叶 `validated` 终态 / R6 记录与体积登记原样保留） | **不动** | §7 | AC-SGO-004 |
| **N-SGO-021** | `KL-N-10` 处置纪律：首轮异常隔离复跑 ≥2、日志全量、仍红如实记录不阻塞收口 | **逐字遵守** | §6 | AC-SGO-021 |
| **N-SGO-022** | 纪律：开放点不得在 spec 前被「顺手定下」 | spec 已全裁决；plan 只在其边界内选策略 | §8 | §8 |
| **N-SGO-023** | `authorConfirmation.status = pending-author-line` 属未闭合义务；不得伪称已确认；升档走 EC 家族显式路径 | **保持 + 预置 EC-SGO-022** | SGO-007 | AC-SGO-024 |
| **N-SGO-024** | 法九门禁必绿且**禁恒真**；每条判据双向反证 + 三段控制（`ok`/`violated`/`n/a`） | **判据形态 = law7x-ext 同形** | SGO-002 | AC-SGO-003 / 020 |
| **N-SGO-025** | 批量卡不得由 AI 代答 / 代填 / 自动放行 / 自动展开（含「AI 建议计划即视为同意」变体） | **一次真实手势 + 注入必红** | SGO-004 | AC-SGO-005 |
| **N-SGO-026** | 计划清单「原文 → 译文」零明文口径写死：仅 UI 渲染文本；不得入 payload 值 / digest 值 / 审计值 / DOM 属性；凭据形掩码 | **计划渲染用字段（非 payload）+ 掩码 + 审计只记摘要** | SGO-004 | AC-SGO-010 |
| **N-SGO-027** | `--ref` 不得进 `packages/web-cli-base/**`；锚定包装不得放宽 risk / 子命令集合 | **plugin 侧包装 + 逐字段对照** | SGO-003 | AC-SGO-025 |
| **N-SGO-028** | 范围读数唯一声明：四值词汇与判定函数恰一处；第二声明 ⇒ FAIL | **单源 `l1/ref-scope.ts`** | SGO-002 | AC-SGO-003 |
| **N-SGO-029** | 无引用回合零漂移：系统段 == 基座、读数 `no-ref`、载荷 / 留痕 / 卡面逐字不变 | **逐字 baseline 断言** | SGO-001 | AC-SGO-011 |
| **N-SGO-030** | 升档须作者一行：任何体积档位变动走 EC-SGO-022 显式路径并可追溯到作者确认 | **预置路径、本阶段不触发** | SGO-007 | AC-SGO-024 |

### 2.7 明确「不动面」清单（**逐项**）

| # | 不动面 | 守线方式 |
|:-:|---|---|
| T1 | `src/content/**` / `dist/content.js` / `dist/pick-layer.js` | 零改动（`git diff` 零行）；新数据只加 type-only 字段 |
| T2 | `KIND_SET`（`messaging.ts:139-…`，**40 项**） | 逐字零新增（refs 是 payload 字段，不是 kind） |
| T3 | 判定链（`src/security/policy.ts` / `src/security/auto-authorize.ts`） | 内容哈希 pin 不动（`zeroDiffFiles` 9 项） |
| T4 | `manifest.json` | **零 diff**（权限面零变化） |
| T5 | `packages/web-cli-base/**` | 零改动 |
| T6 | 12 kind / `BORN_FROZEN_KINDS` / `STREAM_TERMINALS` 6 / `DRIVER_TERMINALS` 4 / `MAX_OPEN_ASKS=2` / `ASK_CANCEL_REASONS` 4 / `REF_ROUND_PREFIX` | 逐字不动（读数**不**新增终态字面量） |
| T7 | 三区法则（工具栏 ≤5 可点 / 流 = 唯一交互面 / 状态栏永不折叠） | 逐字不动（载体全在流内既有面） |
| T8 | `F-29` ROADMAP 区段 / `ROADMAP.md` 全文件 | 零 diff（F-34 / v0.11.1 登记留收口） |
| T9 | v5.5 三叶 `validated` 产物 / R6 记录 / `test/size-baseline.ts` 现有历史条目 | 只**追加**新登记条目，不改写历史 |
| T10 | `design/**`（F 双 + G 双 sha） | 零改动 |
| T11 | v5.5 的 9 op 清单 / `OPS_BY_ID` / `MOUNT_MODE` / `NEXT_SERVICES` 6 / `NEXT_MODES` 2 / `DRIVERS` 声明集 | **零新增 op / 服务 / 模式 / 驱动者**（范围语义走读数 + 载荷字段 + 包装层） |
| T12 | 既有门禁 | 只允许**追加**与**等价重锚**（`CHROMIUM_GATES === 9` 不动；node 门禁下界只增） |
| T13 | `test/ui/journey.mjs` 保护段 `43054..58287` / `binding.mjs` `107780..115930` | **保段优先**（段内零字节；取代走八步） |

---

## 3. 方案对比

> 8 条 ADR 各自的「选项 / 裁决 / 后果」见 `ADR-SGO-001~008-*.md`。此处只做**总体方案**的取舍对比（编排任务书的三个候选形态）。

| 维度 | **方案 A：既有面内扩张 + 读数单源 + plugin 包装（推荐）** | 方案 B：新增「范围层」+ 新载荷通道 + AI 自出计划 | 方案 C：只改提示词（最小改动） |
|---|---|---|---|
| 描述 | refs 走既有 `chat` type-only 字段；读数落 `l1/ref-scope.ts` 单源；`--ref` 走 plugin 侧包装；批量 = 系统聚合既有 toolCalls + 既有 `auth` kind | 新增 `scope/` 层与第三个回合载荷通道 / 新 kind 承载引用与计划；AI 先输出一份独立「计划」消息 | 只把范围法则写进 `SYSTEM_PROMPT`，不加读数 / 不加 `--ref` / 不改授权形态 |
| 优点 | 主流程 **diff = 0 可机核**（I1/I2）；零新 kind / 零新宿主；计划与实际写入**同源**（结构性消除 R-SGO-906）；S0′ 与 v5.5 之 S0 同地位 | 概念边界直观；计划可独立演进 | 改动最小、风险最低 |
| 缺点 | 需 4 个门禁等价重锚 + 单源机核（**工作量集中在判据**） | **破 X-SGO-1**（第 3 载荷通道 / 新 kind）⇒ `KIND_SET` / 12 kind 红；AI 自出计划与真实写入**可能漂移**（R-SGO-906 形态） | **零机核**（改一行提示词即静默失效，Q-SGO-010）；`--ref` / 批量授权缺失 ⇒ 作者主题未交付 |
| 风险 | R-SGO-001~011（逐条有承载） | R-SGO-007（载体被撞）+ R-SGO-906（计划漂移）+ N-SGO-009/010 破 | 主题级需求落空；G-SGO-002~005 无承载 |
| 工作量 | 2 叶 / 7 波 / ~46 任务（串行） | 3 叶 / ~14 波（**越界**：新载体需新门禁与台账面） | 1 叶 / ~3 波，**不达标** |

## 4. 推荐方案

**推荐：方案 A**。

**理由**：

1. **唯一能机核「引用即范围」的形态**：只有「读数单源 + 载荷 type-only + plugin 包装」才能让「四值可判 / 第二声明 ⇒ FAIL / base 零 diff / `KIND_SET` 40 不动」成为**静态事实**（I1~I3）；方案 B 一旦新增载荷通道或 kind，`content.js` 零容差即红（N-SGO-001/009）。
2. **批量授权与真实写入同源**（PD-SGO-005 裁决的直接结果）：系统从**单条 assistant 消息的全 `toolCalls`** 聚合计划 ⇒ 计划与将写内容**不可能漂移**（R-SGO-906 结构性消除），且**零新增工具 / kind**（承 `auth` + `confirm-request`）。
3. **安全边界不被批量侵蚀**：特权 op 恒不入批（`tierOf` 单源不改）、一次真实手势、计划外逐条回落 —— 三者叠加是「解 42 连点」与「不弱化红线⑥」的**唯一同时满足**形态（DC-SGO-005）。
4. **体积可控且已量化**：B 列不计账承接系统段组装 / `--ref` 包装 / 批量判定，A 列净增 Σ 9.5~14.5 KB（+15% 16.7 KB）对余量 28,931 B ⇒ 正常口径不触发升档；2.8× 最坏有**显式升档预案**而非静默。
5. **验证诚实**：S0′ 以 `ty.md` 原案重放（样本单源 + node/Chromium 双面 + 双向反证 + 真源切片），headless 不可合成项入人工面清单并标 `⏳ 未执行`，**不冒充 PASS**。

---

## 5. 聚合文件影响分析

> 操作含义：**NEW** 新增 / **MODIFY** 修改 / **DELETE** 删除 / **NOOP** 显式零改动（登记）。共 **≈38 项**（src 13 / test 18 / docs 1 / SDDU 6）。

### 5.1 `src/**`（13 项）

| 操作 | 文件路径 | 说明 | 列 | 叶 |
|:--:|---|---|:--:|:--:|
| NEW | `packages/web-cli-plugin/src/ui/sidepanel/l1/ref-scope.ts` | **范围读数单源**（`SCOPE_READINGS` 4 值 + `scopeReading` 判定函数 + `ScopeFacts`/`ScopeTarget`/`ScopeRef` 形状 + `turnRefsOf` 引用快照投影 + `SCOPE_TRACE_FIELDS` / `scopeReadingTrace` 留痕单源） | A | 1 |
| MODIFY | `.../l1/ref-store.ts` | 只读取用：活跃有效引用访问器（`verdict === 'valid'` ∧ `!retired`）；**判定语义零改** | A | 1 |
| MODIFY | `.../ui/sidepanel/sidepanel.ts` | `requestTurn` 内**唯一**载荷构建点；confirm 处范围闸（越界拦 + 扩围缝）；范围留痕行；二择接线 | A | 1 / 2 |
| MODIFY | `.../ui/sidepanel/chat-state.ts` | （叶2）`auth` 卡**渲染用**计划字段（非 `payload`）；零新增 kind | A | 2 |
| MODIFY | `.../ui/sidepanel/cards/auth.ts` | （叶2）计划行渲染（textContent + 凭据形掩码；静态模板口径） | A | 2 |
| MODIFY | `.../background/messaging.ts` | **type-only**：`ChatRefFact` / `ChatRefTurnPayload`；`KIND_SET` **40 逐字不动**（零运行时字节） | B | 1 |
| NEW | `.../background/ref-context.ts` | 系统段**追加段**组装（引用事实 + 法则引导）+ 回合载荷运行时校验（非法 / `refState !== 'valid'` 剔除） | B | 1 |
| NEW | `.../background/ref-turn.ts` | 当前回合**活跃引用单源**（refs / tabId / observe 缝；每回合 `set` / `clear`） | B | 1 |
| NEW | `.../background/ref-observe.ts` | `observeIdentity` 抽为**单一实现**（service-worker 与 tools 共用；单节点口径 + `textDigest`） | B | 1 |
| MODIFY | `.../background/service-worker.ts` | `case 'chat'` 读 refs；`runChat(s,user,refs)`；`system: () => 基座 + 追加段`；ref-turn set/clear；（叶2）批次 `toolCalls` 捕获 + 计划缝 | B | 1 / 2 |
| MODIFY | `.../background/turn-queue.ts` | `QueuedTurn.refs`（排队回合自带快照） | B | 1 |
| NEW | `.../background/batch-plan.ts` | （叶2）计划结构 + **指纹** + 准入（纯函数；`buildPlan` / `planFingerprint` / `admitEntry`） | B | 2 |
| NEW | `.../src/tools/dom-anchor.ts` | `wrapDomEntryForAnchor`（覆写 schema + 替换 executor；解析后交**基线 executor**；`risk` 逐字段不放宽） | B | 1 |
| MODIFY | `.../src/tools/browser-tools.ts` | `dom` 条目接线包装层（base 零 diff） | B | 1 |
| **NOOP** | `packages/web-cli-base/**` / `src/content/**` / `manifest.json` | **零 diff**（显式登记） | — | 各叶 |

> 计数口径：`src/**` 表含 1 项 NOOP 与 14 个真实条目（NEW 7 / MODIFY 7）。

### 5.2 `test/**`（18 项）

| 操作 | 文件路径 | 说明 | 叶 |
|:--:|---|---|:--:|
| NEW | `test/law9-scope-reading.test.ts` | **法九门禁**（node）：四必判项 + 双向反证 + 三段控制（`ok`/`violated`/`n/a`）+ 真源切片（生产模块 + 写闸切片） | 1 |
| NEW | `test/ref-context-in-turn.test.ts` | 载荷 type-only / 两入口同构建点 / `KIND_SET` 40 / 系统段基座逐字 / 零引用零漂移 / 凭据掩码 | 1 |
| NEW | `test/dom-ref-anchor.test.ts` | `--ref` 词法 / `--selector` 互斥 / 序号越界 / 单节点闸 / 失配 EC 族 / `risk` 不放宽注入 | 1 |
| NEW | `test/batch-consent.test.ts` | （叶2）计划构建 / 指纹口径 / 准入 / 计划外回落 / 中止 / 特权不入批 / 审计零明文 | 2 |
| MODIFY | `test/s0-self-driven-chain.test.ts` | S0′ 逐环节（node 面）：载荷含引用事实 / 读数 `in-scope` / 改写处数 ≤ 引用数 / 留痕字段名 / **双向反证** | 1 |
| MODIFY | `test/ui/fixtures/s0-chain.mjs` | **S0′ 样本扩展**（node + Chromium 共用同一份；不新增样本） | 1 / 2 |
| MODIFY | `test/ui/s0-self-driven.mjs` | S0′ Chromium 面（真面板；**只加断言不加文件**；批量分支 S0P-7/8 由叶2 增） | 1 / 2 |
| MODIFY | `test/gate-integrity.test.ts` | node 门禁下界 **只增**（`law9-scope-reading` / 叶2 新 node 门禁入受审集合）；`CHROMIUM_GATES === 9` 逐字不动 | 1 / 2 |
| MODIFY | `test/op-wiring.test.ts` | **原判据不改**（`requestTurn` 恰 2）；增「主流程 diff = 0」复合读数（`maybeRecommend` 1/7 · `nextAfterSettle` 1/10） | 1 |
| MODIFY | `test/supersession-ledger.test.ts` | X-SGO-1/2/3/5 条目（叶1）+ X-SGO-4/6/7 条目（叶2）；`knownGap` 一致性；保护段处置 | 1 / 2 |
| MODIFY | `test/op-three-tier.test.ts` | （叶2）OT-⑩ **扩批量变体**（注入必红；`tierOf` 逐 op 不变） | 2 |
| MODIFY | `test/capability-wiring.test.ts` | （叶2）新增「批量路径不触达特权 op / `SW 永不 .request(`」断言 | 2 |
| MODIFY | `test/ui/law8-plaintext.mjs` | 法八四面：引用注入零明文（凭据掩码）+ 批量计划零明文 / 掩码；**36 断言不降级、计数只增** | 1 / 2 |
| MODIFY | `test/ui/no-dead-end.mjs` | WIDEN 二择后零死端（49 **只增**）+ 越界拦后可达 next | 1 / 2 |
| MODIFY | `test/ui/l1.mjs` / `test/ui/page-input.mjs` | X-SGO-5 等价重锚：「范围锚」读数双向反证（旧计数断言保留为新语义的一部分） | 1 |
| MODIFY | `test/l1-ref-validity.test.ts` | `valid/invalid/unknown` deny 方向**逐字不动** + 读数只消费不重判 | 1 |
| MODIFY | `test/size-baseline.ts` | **逐叶收口重登记**（五要素 + V3-VOL-3 三值 + metafile 逐模块归因；时间线只追加） | 1 / 2 |
| MODIFY | `test/ui/journey.mjs` / `test/ui/binding.mjs` | **保段优先**（段内零字节）；段外逐行登记；计数只增 | 1 / 2 |

### 5.3 `docs/**` 与配置（1 项）

| 操作 | 文件路径 | 说明 |
|:--:|---|---|
| MODIFY | `packages/web-cli-plugin/docs/v4-supersession-ledger.json` | `modifiedRanges[]`（X-SGO-1~6 落点）+ **X-SGO-7 未发生取代显式登记** + `protectedRanges[]`（保段或新 pin）+ 一致性门禁保留 |
| **NOOP** | `.sddu/specs-tree-root/ROADMAP.md` / `manifest.json` / `packages/web-cli-plugin/package.json`（无新依赖）/ `.opencode/opencode.json` | 零 diff（F-34 / v0.11.1 登记留收口） |

### 5.4 SDDU 本 Feature 目录（6 项）

| 操作 | 文件路径 |
|:--:|---|
| NEW | `plan.md`（本文件） |
| NEW | `ADR-SGO-001-ref-context-in-turn.md` ~ `ADR-SGO-008-open-points-rulings.md`（8 项） |
| NEW | `specs-tree-v55f-1-ref-context-and-anchor/plan.md` |
| NEW | `specs-tree-v55f-2-batch-consent/plan.md` |
| MODIFY | `state.json`（父）+ 2 叶 `state.json`（phase → `planned`；phaseHistory 追加） |
| MODIFY | `TREE.md`（父 + 2 叶，由 `sddu-tree` 定向更新） |

---

## 6. 风险评估

### 6.1 继承风险（discovery R-SGO-001~011 + spec R-SGO-901~910）

| # | 风险 | 等级 | 缓解（⇒ 承载 ADR） |
|---|---|:--:|---|
| R-SGO-001 | **批量授权被误用为「AI 代答 consent」的合法外衣（唯一红线级）** | **高** | **一次真实手势 + 计划指纹 + 计划外回落 + 特权不入批**；`RL-06` / OT-⑩ 扩批量变体注入必红（SGO-004） |
| R-SGO-002 | **范围漂移不可判 + 易造恒真断言**（v4.5 教训） | **高** | **先定读数再定法则**；四必判项各带反证 + 三段控制（SGO-002） |
| R-SGO-003 | **`packages/web-cli-base/**` 零 diff 被撞** | **高** | plugin 侧包装（`chrome-host.ts:206` 先例）；`insight-no-escalation` 必绿（SGO-003） |
| R-SGO-004 | **失配静默 ⇒ 写错节点** | **高** | `nodeCount === 1` 唯一通过 + 四类失配非静默（SGO-003） |
| R-SGO-005 | **法八被批量计划清单撞破** | **高** | 正文仅 UI 渲染 + 凭据形掩码 + 审计只记字段名/计数/指纹摘要（SGO-004） |
| R-SGO-006 | **体积越档位**（距档 35,777 B；v5 低估 2.8× / v55 +6,015 / R6 +5,199） | **中高** | 分列预算 + 15% 缓冲 + **充分利用 B 列** + 逐叶重登记 + 2.8× 最坏预置升档（SGO-007） |
| R-SGO-007 | **`KIND_SET` / 12 kind / 零宿主被撞** | **高** | refs / 计划 / 读数全 type-only；批量卡复用 `auth`；二择复用 `askuser`（SGO-001 / 004 / 005） |
| R-SGO-008 | **回合载荷扩张引发主流程门禁重锚** | **中高** | 唯一构建点 + 调用点计数不变（原判据不改）（SGO-001） |
| R-SGO-009 | **门禁严格串行 + `KL-N-10` flake 被误读为回归** | **低—中** | 串行 + 隔离复跑 ≥2 + 如实记录（§7） |
| R-SGO-010 | **断言只增的门禁规模**（`npm test` 1330 起只增） | **中** | 等价重锚替代新增同义断言；node 下界只增（§5.2） |
| R-SGO-011 | **方案先行风险** | **中高** | O-SGO-001~009 已全裁决；PD-SGO-001~007 在 §2.4 / SGO-008 显式裁决 |
| R-SGO-901 | **读数与引用判定双源漂移** | 中高 | 读数只**消费** store 的 `verdict`（不重判）；`refState` 快照即过滤条件（SGO-002） |
| R-SGO-902 | **type-only 被实现成新 kind** | 高 | `KIND_SET` 长度 + `content.js` sha（SGO-001） |
| R-SGO-903 | **范围读数被写成恒真** | 中高 | 三段控制 + 四必判项各带反证（SGO-002） |
| R-SGO-904 | **`--ref` 包装层偷偷放宽 risk** | 高 | 逐字段对照 base + 降档注入必红（SGO-003） |
| R-SGO-905 | **批量计划清单把正文写进 digest / 审计** | 高 | 审计只记字段名 + 计数 + 指纹摘要（SGO-004） |
| R-SGO-906 | **计划指纹被判成「形状相同即放行」** | 中高 | 指纹含**文本对**（逐字节入哈希）；计划 = 真实写入的 toolCalls（同源）（SGO-004） |
| R-SGO-907 | **WIDEN 二择被实现为「AI 自答」/「默认整页」** | 高 | 确认必须真人手势 + 入留痕；AI 不得自填（SGO-005） |
| R-SGO-908 | **无引用回合出现行为漂移** | 中高 | 逐字 baseline 断言（SGO-001） |
| R-SGO-909 | **S0′ 被写成「脚本绿」而非「链路可判」** | 中高 | 真源切片 + 双向反证（SGO-006） |
| R-SGO-910 | **体积评估被跳过 / 单叶合并登记** | 中高 | 先预算后落地 + 逐叶重登记（SGO-007） |

### 6.2 plan 新增风险（R-SGO-911~920）

| # | 风险 | 等级 | 缓解 |
|---|---|:--:|---|
| R-SGO-911 | **范围闸落错面**：把越界拦截做进 `policy.ts` / `auto-authorize.ts`（撞 `zeroDiffFiles`） | 高 | 拦截**只在 confirm 面（面板）**；`zeroDiffFiles` 9 项 pin 机核必绿（SGO-002 §4） |
| R-SGO-912 | **`refs` 快照被实现为回合中途再读取**（引入第二通道 / 每回合探测） | 中高 | 唯一构建点 + SW 引用唯一来源 = 回合载荷；「每回合页面探测次数不增」断言（SGO-001） |
| R-SGO-913 | **`--ref` 的 live 单节点闸被误读为「每回合重观测」**（破 NG-SGO-013） | 中 | 口径显式登记：写调用时的**每写一次**只读身份观测 ≠ 每回合重观测；NFR-SGO-008 断言只判「引用注入」面（SGO-003 §5） |
| R-SGO-914 | **批量计划卡把正文写进 `CardView.payload`**（撞 N-SGO-026） | 高 | 计划走**渲染用字段**（非 `payload`）+ 掩码 + 新零明文断言（SGO-004 §7） |
| R-SGO-915 | **「系统聚合」被实现为跨回合累积**（把多轮 set-text 合进一张卡） | 中高 | 计划边界 = **单条 assistant 消息**的 `toolCalls`（确定性）；跨轮即新计划 / 逐条（SGO-004 §1/§13） |
| R-SGO-916 | **指纹在批准前漂移仍放行**（DOM 变化 / 目标集合变了） | 中高 | 批准时对计划条目重校验入范围集合，漂移 ⇒ **显式失败** + 重新出计划（EC-SGO-014）（SGO-004 §4） |
| R-SGO-917 | **留痕「零值」口径与「扩围可读」自相矛盾** | 中 | 口径显式登记：`值` = 用户内容值；读数词 / actor / 计数属机器事实（SGO-002 §5，登记为 caliber） |
| R-SGO-918 | **范围读数新增第 4 个界面面**（入流内可见面）⇒ 撞密度 / 12 kind | 中 | PD-SGO-004 裁决 = 不入；走留痕 + 二择卡（SGO-008） |
| R-SGO-919 | **S0′ 的 Chromium 面新增门禁文件**（撞 `CHROMIUM_GATES === 9`） | 中 | 只在既有 `s0-self-driven.mjs` **加断言**；node 面法九门禁入 node 下界（SGO-006 §7） |
| R-SGO-920 | **叶1 未落地即排叶2**（叶2 硬依赖读数与锚定） | 中高 | 2 叶**串行**（`dependsOn` 链）；叶2 的「计划内 / 计划外」以叶1 读数为唯一判据（SGO-004 §2） |

### 6.3 风险 Top5（按「阻塞程度 × 影响面」）

| 序 | 风险 | 为什么是 Top5 |
|:-:|---|---|
| 1 | **R-SGO-001 + R-SGO-911/914** 批量授权侵蚀红线⑥ / 零明文 | 唯一「不可让渡」红线（AI 不得代答 consent）；一次手势 + 指纹 + 计划外回落 + 零明文是结构性防线 |
| 2 | **R-SGO-002 + R-SGO-903** 读数写成恒真 | 题眼即「范围可判」；恒真断言会让整条验收失效 ⇒ 三段控制 + 四必判项是唯一解 |
| 3 | **R-SGO-004 + R-SGO-913** 锚定失配静默 / 观测口径混淆 | 「写错节点」是高危；单节点闸 + 四类非静默 + 观测口径显式登记 |
| 4 | **R-SGO-006 + R-SGO-910** 体积与逐叶归因 | 余量 28,931 对 Σ 9.5~14.5 KB（上界 16.7 KB）；2.8× 最坏须**显式**升档，`pending-author-line` 不得伪称确认 |
| 5 | **R-SGO-909 + R-SGO-919** S0′ 失真 / 门禁面越界 | S0′ = 本 Feature 的验收锚；脚本绿 ≠ 链路可判；只加断言不加文件 |

---

## 7. 生成的 ADR

### 7.1 ADR 索引（**ADR-SGO-001~008，全部 ACCEPTED**；正文见同目录 `ADR-SGO-0xx-*.md`）

| ADR | 标题 | 状态 | 一句话主张 | 主责叶 |
|---|---|---|---|---|
| **ADR-SGO-001** | 引用事实进回合（`chat` type-only `refs` + 系统段基座/追加段 + 回合发起时快照 + 留痕口径） | ACCEPTED | 唯一构建点 = `requestTurn`；SW 引用唯一来源 = 回合载荷（零新通道）；无引用 ⇒ `system === 基座`（逐字）；`requestTurn(` 仍恰 2 | 叶1 |
| **ADR-SGO-002** | 范围读数单源（法九）+ 判定输入两路 + `law9-scope-reading` 门禁 | ACCEPTED | `l1/ref-scope.ts` 恰一处声明 4 值；`--ref` 命中 ∨ selector 命中；越界写在 confirm 面 fail-closed 拦 | 叶1 |
| **ADR-SGO-003** | `--ref <n>` 锚定解析链（plugin 侧包装 + live 单节点闸 + 失配 EC 家族） | ACCEPTED | 覆写 schema + 替换 executor（基线仍被调用）；`[data-wcli-ref="ref_n"]`；`nodeCount === 1` 唯一通过；base 零 diff | 叶1 |
| **ADR-SGO-004** | 任务级批量授权（系统聚合计划 + 指纹（逐字节入哈希）+ 一次手势 + 计划外回落 + 特权不入批 + 审计零明文） | ACCEPTED | 计划 = 单条 assistant 消息的 in-scope `set-text`；指纹含文本对；一次真实手势；计划外逐条；零新 kind | 叶2 |
| **ADR-SGO-005** | 扩围征询（`ask-user` 二择 + `out-of-scope-authorized` + 留痕 + 拒绝零死端） | ACCEPTED | 二择复用既有 `askuser`；只由用户确认产生 `authorized`；拒绝 ⇒ 可达 next | 叶2 |
| **ADR-SGO-006** | S0′ 双面机器化（`ty.md` 原案重放 + 双向反证 + 真源切片 + 人工面如实登记） | ACCEPTED | 样本单源（`s0-chain.mjs`）；node + Chromium 双面；**改写处数 ≤ 引用数**；去注入 ⇒ `no-ref` 必红 | 叶1 / 2 |
| **ADR-SGO-007** | 体积分列预算（A/B/C 列 + 15% 缓冲 + 2.8× 最坏 + 逐叶重登记 + 升档 EC 路径） | ACCEPTED | A Σ×1.15 = 10.9~16.7 KB ≤ 28,931 ⇒ 正常不触发；2.8× 最坏 ≈ 46.7 KB ⇒ 预置显式升档 + 作者一行 | 各叶 |
| **ADR-SGO-008** | PD-SGO-001~007 裁决汇总（读命令 / 重观测 / 字段集 / 可见面 / 计划生成 / 指纹文本对 / 条目上限） | ACCEPTED | 7 条逐条裁决 + 理由 + 判据锚；未采纳项显式登记 | 各叶 |

### 7.2 体积分列预算表（**硬要求**：A 列 Σ × 1.15 ≤ 余量 28,931）

**统一前提（本轮只读复核，承 spec §5.12.1）**：A 基线 **578,623 B** · 生效上限 **607,554 B**（距 **28,931 B**）· **档位 614,400 B**（距 **35,777 B**）· 绝对上限 **675,840 B**（距 **97,217 B**）· `authorConfirmation = pending-author-line`（**未闭合义务**）。**B 列（`dist/background.js`）不计入 sidepanel 账本**。

| 列 | 产物 | 叶1（范围底座）落地项 | 叶2（批量授权）落地项 | 计账 |
|:-:|---|---|---|:-:|
| **A** | `dist/sidepanel.js` | `l1/ref-scope.ts`（读数单源 + 快照投影）· `sidepanel.ts`（载荷构建 / 范围闸 / 留痕 / 二择接线）· `l1/ref-store.ts`（只读取用）· S0′ 断言支撑 | `chat-state.ts` / `cards/auth.ts`（计划渲染字段 + 计划行）· `sidepanel.ts`（计划 passthrough + 二择） | ✅ |
| **B** | `dist/background.js` | `service-worker.ts`（系统段组装 + 载荷签名 + active-refs 缝）· `ref-context.ts` / `ref-turn.ts` / `ref-observe.ts` · `src/tools/**`（包装 + 失配口径）· `turn-queue.ts` · `messaging.ts`（type-only） | `security/confirm.ts`（计划感知 + 指纹准入 + 计划外回落）· `batch-plan.ts` · `service-worker.ts`（批次捕获） | ❌ |
| **C** | `content.js` / `pick-layer.js` | **零触碰** | **零触碰** | 零容差 |

| 预算口径 | 叶1 | 叶2 | Σ | +15% 缓冲 | 结论 |
|---|--:|--:|--:|--:|---|
| **A 列（sidepanel 净增）** | **6.0~9.0 KB** | **3.5~5.5 KB** | **9.5~14.5 KB** | **10.9~16.7 KB** | **距生效上限余量 = 28,931 B；距档余量 = 35,777 B ⇒ 正常口径不触发升档**（16.7 KB < 28.9 KB < 35.8 KB） |
| **B 列（background.js，不计账）** | 5.0~8.0 KB | 3.0~5.0 KB | 8.0~13.0 KB | — | 不计入 sidepanel 账本（**充分利用**） |
| **v55 历史低估系数 2.8× 最坏（A 列）** | — | — | **≈26.6~40.6 KB** | **≈30.6~46.7 KB** | **可能跨档位 614,400** ⇒ **预置 EC-SGO-022 显式升档路径 + 作者一行**（N-SGO-023；**本阶段不触发**） |

**校准依据（实测增量，逐轮；承 ADR-V55-011 §1）**：

| 先例轮 | 实测 | 与本 Feature 对照 |
|---|--:|---|
| R6 快修轮（6 文件改动） | **+5,199** | 叶1 涉及 4~5 文件（1 新 + 4 改）⇒ 6.0~9.0 KB 有理 |
| v5.5-1 R1（3 新模块 + 接线） | **+2,755** | 叶1 面板侧新增小于该轮（读数模块 + 载荷构建） |
| v5.5-3 R2（护栏 + 仲裁 + 面板接线） | **+6,889** | 叶2 面板侧（计划渲染 + 二择接线）同量级偏小 ⇒ 3.5~5.5 KB |
| v5.5-2 小修轮 | **+635** | 修复轮量级参照 |

**零字节 / 不计账项（本 Feature 的主体工作）**：法九 / 载荷 / 锚定 / S0′ 四个 node 门禁 + 批量门禁 + 台账 + 人工面清单 + 全部 ADR/plan ⇒ `test/**` 与 `.sddu/**` **不进任何产物**；系统段组装 / `--ref` 解析 / 批量判定 / 计划指纹 / 载荷校验落 `background.js` ⇒ **不计入 sidepanel 账本**。

**减体积优先级（越预算时按序执行；均不触碰断言 / 容差 / 档位口径）**：
1. 把纯记账 / 判定逻辑下移 `background.js`（SW 产物，**不计账**）——系统段组装、`--ref` 解析、批量指纹天然属 SW 面；
2. 元组化声明数据（v5 `ops.ts#IMPL` 先例）；
3. 复用既有文案（系统行 / receipt / 静态三段模板），零新字符串；
4. 复用 `auth` 卡渲染面（计划行走既有渲染 + 一个渲染用字段）；
5. **显式登记未落地项**为未闭合义务 —— **绝不以删判据 / 放宽容差 / 静默下调档位实现**。

### 7.3 波次与任务数估算（供 `@sddu-tasks` 参考，**非需求**）

| 叶 | 波数 | 任务数（估） | 工作量集中区 |
|---|:--:|:--:|---|
| **v55f-1**（范围底座） | **4**（W1~W4） | **~30** | 载荷/系统段/留痕（W1）· 读数单源 + 法九门禁（W2）· `--ref` 包装 + 失配 EC（W3）· S0′ 双面 + 台账 + 体积重登记（W4） |
| **v55f-2**（批量授权） | **3**（W1~W3） | **~16** | 边界先行：RL-06/OT-⑩ 批量变体注入必红 + 特权不入批（W1）· 计划结构 + 指纹 + 准入 + 计划外回落 + 零明文（W2）· 二择 + 中止 + S0′ 批量分支 + 台账 + 体积重登记（W3） |
| **合计** | **7** | **~46** | — |

> 口径：任务数 = 可原子执行单元（≈1 文件内 1 项可验证改动 + 其判据），**不是** LLM 调用数；2 叶**串行**（v55f-1 → v55f-2）。

### 7.4 体积可行性结论（对应任务书硬要求）

**可行，正常口径不触发升档**：A 列 Σ 预算 9.5~14.5 KB（上界 14.5 KB）⇒ 加 15% 缓冲 10.9~16.7 KB **落在生效上限余量 28,931 B 与距档余量 35,777 B 之内**。**但**按 v5 历史低估系数 **2.8×** 的最坏情形，A 列 Σ 可达 ≈ 26.6~40.6 KB（×1.15 ≈ **30.6~46.7 KB**）⇒ **可能跨过已登记档位 614,400 B** ⇒ 按 **V3-VOL-3** 走**显式升档**（档位 → `ceilTo50KB(实测)`；绝对上限 → 档位 × 1.10），五要素重登记 + `pending-author-line` **保持占位、不得伪称已确认**。**预置、不静默、本阶段不触发**（EC-SGO-022）。

---

## 8. 遗留策略选择（spec §8 五条 PD → 本计划裁决，详见 ADR-SGO-008）

| # | spec 边界 | 本计划裁决 | 落点 |
|---|---|---|---|
| **PD-SGO-001** | 读命令 `--ref`（`read-element` / `structure`）是否同加 | **本阶段不做**（编排裁决 ④「先落写命令」；读命令登记后续轮）；`ref` 参数虽挂 `dom` schema，但非 `set-text` 子命令传 `--ref` ⇒ **EC-SGO-017 显式错误** | ADR-SGO-003 §3 / SGO-008 |
| **PD-SGO-002** | 是否每回合注入只读重观测最新摘要 | **不做**（NG-SGO-013）：用回合已有引用事实即可判范围；唯一的 live 只读观测是 `--ref` 的**每写一次**单节点闸（≠ 每回合重观测） | SGO-001 §8 / SGO-003 §5 |
| **PD-SGO-003** | 引用表字段集是否扩 `semanticPath` / `origin` / `navSeq` | **保持 7 项最小集**（`refNum`/`refId`/`selector`/`refMark`/`textDigest`/`refState`/`nodeCount`）；扩字段是加法，留后续轮（体积 + 判范围无必要） | SGO-001 §9 |
| **PD-SGO-004** | 范围读数是否入流内可见面 | **不入**（避免动密度预算与 12 kind 面）；读数走**留痕** + **二择卡**（叶2） | SGO-002 §6 |
| **PD-SGO-005** | 批量计划生成者：AI 一次产出完整计划 vs 系统在首次写入后聚合 | **系统聚合**（单条 assistant 消息的全 `toolCalls` 中 ref 范围内的 `set-text`）——计划与真实写入**同源**，结构性消除「计划漂移」 | SGO-004 §1 |
| **PD-SGO-006** | 计划指纹文本对比较口径（逐字节 vs 归一化摘要） | **逐字节入哈希、摘要出账**：条目按 `{selector, actionType, fromDigest, toText}` **逐字节**规范化后 sha256；出账只记摘要（零明文）；空白改动 ⇒ 指纹变（不放宽） | SGO-004 §3 |
| **PD-SGO-007** | 批量卡是否显示条目上限 | **展示上限 8 行 + 诚实计数行**（`共 N 条（显示前 8）`）；纯显示策略，指纹覆盖全部 N 条，**不改变授权范围** | SGO-004 §10 |

---

## 9. 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建（F-34 父 `plan.md` + 2 叶 `plan.md` + **ADR-SGO-001~008** 全 8 条正文）：§1 前置检查 + 偏差登记 + 两条硬性约束结论（A 列正常不触发升档 / B 列不计账充分利用）；§2 架构分析（七条结构性不变量 / 数据流 / **八条设计任务定案** / **X-SGO-1~7 逐条处置** / **N-SGO-001~030 红线继承** / T1~T13 不动面）；§3~4 方案对比与推荐（方案 A：既有面内扩张 + 读数单源 + plugin 包装）；§5 聚合文件影响 **≈38 项**（src 13 / test 18 / docs 1 / SDDU 6）；§6 风险（继承 R-SGO-001~011 + R-SGO-901~910 + plan 新增 **R-SGO-911~920** + Top5）；§7 ADR 索引（8 条 ACCEPTED）+ **体积分列预算表（A Σ×1.15 = 10.9~16.7 KB ≤ 28,931 ⇒ 正常不触发；2.8× 最坏 ≈ 46.7 KB ⇒ 预置 EC-SGO-022）** + 波次估算（2 叶 **7 波 / ~46 任务**）+ 体积可行性结论；§8 **PD-SGO-001~007 七条裁决**。**本轮只做 plan**：零 `src`/`test`/`dist`/`docs`/`design`/ROADMAP 改动，零门禁 / 构建 / Chromium，未调用任何受管 Provider（routing.v1 = `local_or_compute → none`） | 2026-09-24 | SDDU Plan Agent |
