# 技术计划：specs-tree-nda-1-next-tool-channel（NDA-1 `next` 工具产出通道 + 无条件触发 + 5 道校验链接入：机制核心）

> **文档定位**: SDDU 技术方案（**叶级切片**）— 父 `plan.md`（v1.0）与父级 9 个 ADR 在**本叶**的落地设计；作为本叶 tasks 阶段的输入
> **前置依赖**: 父 `../spec.md`（v1.0）+ `../plan.md`（v1.0）+ `../ADR-NDA-001~009` + 本叶 `spec.md`（v1.0）+ F-36 两叶 `validated` 产物 + 基座 `packages/web-cli-base/src/{llm.ts,runner.ts}`（只读）
> **创建人**: SDDU Plan Agent
> **创建时间**: 2026-09-27
> **版本**: v1.0
> **更新人**: SDDU Plan Agent
> **更新时间**: 2026-09-27
> **更新说明**: 初始创建（本叶 = 首叶 / 机制叶：`next` 工具注册 + `hooks.intercept` 捕获 + 5 道校验链保留接入 + 无条件触发 + `ai-led` 规则位等价重锚 + 围栏块通道替换 + `parity` 条目 + `ai-next-candidate` 门禁改写 + S0'''' 主线 A / 支线 B node 面 + B 列归因。**叶内新增 2 个 ADR**（ADR-NDA-101 / 102）；**零改基座**；**零运行时验证**）

---

## 1. 前置检查

| 检查项 | 状态 |
|--------|:--:|
| 本叶 `spec.md` 存在 | ✅ 305 行（承载父 FR ≈60 条切片；交付物 11 项；执行序 7 步） |
| 父 `spec.md` / `plan.md` / ADR-NDA-001~009 存在 | ✅（父 plan v1.0 已定：13 ADR 索引 / 7 组方案对比 / 分列预算 / 门禁三态） |
| 上游 F-36 产物可读 | ✅ `src/background/ai-next.ts`（5 道链逐字）/ `ref-context.ts`（契约句）/ `providers.ts`（`ai-next` provider）/ `test/ai-next-candidate.test.ts`（AI-N-1~11） |
| 基座缝 / 类型契约可读 | ✅ `runner.ts:50-55,161-168`（`intercept` 探针）+ `llm.ts:23-75,219-241`（`WebCliToolCall` / `parseToolArguments`）+ `router.ts:63-67,438-453`（`ToolEntry` / `deriveTools`） |
| 外部 API 文档缓存 | ⚠️ 不适用（零外部服务 / 零新依赖） |
| 依赖顺序 | ✅ 本叶 `dependsOn: []`（首叶）；叶2 依赖本叶已建立的工具通道与校验链接入 |
| 叶2 边界（**不做**） | ✅ 未配置分相 / nudge / 异常闭集 / 系统兜底 / 首开 / 体积终态 / 台账终态 —— 全属叶2（`../specs-tree-nda-2-fallback-and-gates/`） |

## 2. 架构分析（本叶）

### 2.1 本叶要证明的三件事

1. **产出通道换轨是真换轨**：`next` 工具出现在 `deriveTools()`，被 `hooks.intercept` 捕获，真实 `dispatch` **永不发生**，且围栏块路径**结构性消失**（不是「不调用」而是「不存在」）；
2. **换机制 ≠ 换安全闸**：5 道校验链（`ai-next.ts:105-143`）与判定分层（`admitCandidate` / `pressDecision`）**逐字保留**，只换上游输入面（`text` → `candidates`）；
3. **触发无条件是可判事实**：`next` 工具的 `when` 从不读 refs（`providers.ts:171` 逐字不变）+ 提示句删除 + `ai-led` 独立规则位 ⇒ 「无引用回合仍驱动」不依赖巧合。

### 2.2 关键契约与数据流（本叶）

```
[1] 回合开始（已配置；未配置在 SW :945-956 已 early-return ⇒ 工具面永不下发，FR-NDA-018 结构性成立）
      ↓ providerChat(cfg, [system, ...turns], s.host.deriveTools())          service-worker.ts:986-991
[2] 工具面含 next（host.ts 注册 ⇒ deriveTools() ⇒ router.deriveTools()）     host.ts:333 / router.ts:442-453
      ↓ 模型返回 toolCalls 含 { name:'next', rawArguments:'{"candidates":[…] }' }
[3] 基座逐条执行；dispatch 前问缝                                            runner.ts:155-164
      ↓ hooks.intercept(tc, commandText)
[4] SW 捕获：name 命中 ⇒ JSON.parse(rawArguments) ⇒ candidates（形状筛选）    NEW/改造 见 ADR-NDA-002
      ↓ 返回合成 ToolResult{ok:true, output:'✓ next 候选已记录'} ⇒ 短路 dispatch（runner.ts:164）
[5] 捕获态写入本回合 turnState（captured / lastCandidates，覆盖式）
      ↓ 基座继续循环（tool turn 回填）；events 对 next 零发射（ADR-NDA-102）
[6] 回合结束：onFinish ⇒ validateAiNext(turnState.lastCandidates, {refs})    service-worker.ts:1027-1043 改造
      ↓ 5 道链（admitCandidate 逐字）⇒ AiNextPayload{accepted, blocked}
[7] chat-result{done, aiNext?}（缺席 ⇒ 现状逐字，N-NDA-029）                 chat-events.ts:72 逐字不改
      ↓
[8] 面板单槽消费 → ctx.session.aiNext → ai-led 独立规则位产卡（≤3 chip）      sidepanel.ts:4224 / recommend.ts
```

**本叶不引入**：新 kind / 新 variant / 新 op / 新宿主 / 新真值源 / 新触发词 / 新契约句 / 第二产出通道 / 第二校验器。

### 2.3 组件与依赖（本叶）

| 组件 | 类型 | 说明 |
|---|:--:|---|
| `tools/next-tool.ts` | **NEW** | `NEXT_TOOL_NAME` / `NEXT_TOOL_SCHEMA`（enum 派生）/ `NEXT_TOOL_MAX_CANDIDATES` / `createNextToolEntry()`（`listed:false` + fail-closed `executor`） |
| `background/ai-next.ts` | MODIFY | 删围栏块三函数；`validateAiNext` 输入面改 `candidates`；`admitCandidate` **逐字保留** |
| `background/ref-context.ts` | MODIFY | 删 `NEXT_CONTRACT_GUIDANCE` + 注入点 |
| `background/host.ts` | MODIFY | 注册 `next`（always-registered 段） |
| `background/service-worker.ts` | MODIFY | `hooks.intercept` 接线 + `turnState` + events 过滤 + 装配点改造 |
| `ui/sidepanel/next-registry/providers.ts` | MODIFY | `ai-next.rule: 'ref-action' → 'ai-led'`（`when` / `chips` / `chipsFor` / `label` 逐字保留）；`DRIVER_DECLS_SRC['ai-next']` 逐字保留 |
| `ui/sidepanel/recommend.ts` | MODIFY | `NEXTSTEP_PRIORITY` 恰 5（`ai-led` 第 2 位）+ `NEXTSTEP_LABELS` 补项 |
| `ui/sidepanel/cards/nextstep.ts` | 复核（预期零改） | AI 候选复用既有 chip / `data-op` 单源分发 |
| `test/ai-next-candidate.test.ts` | 改写 | AI-N-1 换机制 + AI-N-12~14 |
| `test/parity/waivers.json` | MODIFY | `pluginExtras['next']` |
| `test/recommendation-sources.test.ts` | MODIFY | ③ 恰 4 → 恰 5 |
| `test/ui/s0-self-driven.mjs` + `test/ui/fixtures/s0-chain.mjs` | MODIFY | 只加断言；样本重锚 |
| `test/size-baseline.ts` / `test/gate-integrity.test.ts` / `docs/v4-supersession-ledger.json` | MODIFY | 叶1 重登记 / 下界只增 / `xNdaLedger` 骨架 |

## 3. 方案对比（本叶两个关键形态点）

> 父 plan §3 的 7 组对比已给全局结论；本叶只补两个**叶内**未覆盖的形态点。

### 3.1 `next` 工具定义放哪（单源 vs 就近）

| 维度 | 方案 A：定义写在 `background/ai-next.ts`（校验模块内） | 方案 B：**独立 `src/tools/next-tool.ts`**（推荐） | 方案 C：定义在 `host.ts` 内联 |
|------|:--|:--|:--|
| 优点 | 少一个文件；name 与校验同处 | **职责分明**（注册面 vs 校验面）；与 `src/tools/*-tools.ts` 惯例一致；`ai-next.ts` 保持「纯函数校验器」定位（AI-N-10 判据不变） | 零新文件 |
| 缺点 | `ai-next.ts` 变成「工具定义 + 校验」双责 ⇒ AI-N-10 的「纯函数」定位模糊；被 `host.ts`（注册）与 SW 双向 import（层次纠缠） | +1 文件（B 列，不计账） | `host.ts` 已 624 行；schema 字面量大（`host.ts` 是 SW 装配面，塞 schema 会污染可读性） |
| 风险 | 低 | 低 | 低 |
| 工作量 | 小 | 小 | 极小 |

### 3.2 `validateAiNext` 的输入面改造形态

| 维度 | 方案 A：新增 `validateNextToolArguments(raw)` 并**保留**旧 `validateAiNext(text)` 供兼容 | 方案 B：**改签名** `validateAiNext(candidates, facts)`，`rawArguments` 解析在其**上游**单独一步（推荐） | 方案 C：一个函数吃 `rawArguments`，内部完成解析 + 校验 |
|------|:--|:--|:--|
| 优点 | 零调用点变更 | 解析（IO 边界）与校验（纯逻辑）分离 ⇒ 两层各自可判、可注入反证；`validateAiNext` 仍在（FR-NDA-081 字面） | 调用点最少 |
| 缺点 | **双通道残留**（旧函数可被重新接线，`EC-NDA-020` 风险）；且旧签名只服务围栏块 ⇒ 死代码 | 调用点需改 1 处（`service-worker.ts:1036`） | 校验器不再纯（吃原文 → 混入解析） |
| 风险 | 中高（R-NDA-902） | 低 | 中（NFR-NDA-009 的「纯函数可判」受限） |
| 工作量 | 小 | 小 | 极小 |

## 4. 本叶设计定案（父 ADR 的叶内落地）

| 项 | 定案 | 依据 |
|---|---|---|
| 工具名 / schema | `NEXT_TOOL_NAME='next'`；`parameters` 逐字段见 **ADR-NDA-001 §②**；`enum` = `OP_IDS.filter(tierOf!=='gesture')`（7）；`params: {type:'string'}`（**订正 spec 的 `{type:'object'}`**，`COR-NDA-7` / `PD-NDA-012`） | ADR-NDA-001 |
| 注册面 | `host.ts:333` 旁 `router.register(createNextToolEntry())`；`listed:false`；fail-closed `executor` | ADR-NDA-001 §① |
| `parity` | `test/parity/waivers.json#pluginExtras['next'] = {reason, basis}`（**位置订正** `COR-NDA-6`）；`baseline-catalog.json` 零改 | ADR-NDA-001 代价段 |
| 捕获 | `hooks.intercept`（加法）+ `tc.name === NEXT_TOOL_NAME` + `tc.rawArguments` 严格 JSON + 合成 `ToolResult` | **ADR-NDA-002** |
| 流面 | `onCommandLine` / `onToolOutput` 对 `next` 零发射；`onToolDone` 逐字不动 | **ADR-NDA-102** |
| 同回合多次调用 | 覆盖式取最后一次；候选 ≤3 | ADR-NDA-002 §⑤ |
| 校验链 | `admitCandidate` **逐字保留**；`validateAiNext(candidates, facts)`（改签名）；`AI_NEXT_LABEL_MAX=48` / `AI_NEXT_PARAM_MAX=128` 保留 | ADR-NDA-004 §① |
| 围栏块 | `NEXT_CONTRACT_GUIDANCE` / `AI_NEXT_FENCE_INFO` / `FENCE` / `lastNextFenceBody` / `parseAiNextItems` **删除** | ADR-NDA-004 §① |
| 触发无条件 | 工具面恒含 `next`（已配置）；`ai-next.when` 逐字不变；`ai-led` 规则位 | **ADR-NDA-003** |
| 门禁 | `ai-next-candidate` 改写（等价或更强，`assertionsRemoved=0`）+ `recommendation-sources` ③ 重锚 + `parity` 条目 | ADR-NDA-004 §② / ADR-NDA-003 §④ |
| 体积 | 叶1：**A 列 +0.1~0.5 KB**（薄接线）；**B 列 +1.3~4.0 KB（不计账）**；B 列优先 | **ADR-NDA-008 §②** |
| 台账 | `xNdaLedger` 叶1 骨架（X-NDA-1/2/5/6/7/8/9/12） | **ADR-NDA-009 §①** |
| 零改基座 | 只读 `runner.ts` 形状 + `import type`；不 import base 实现 | ADR-NDA-009 §② |

## 5. 文件影响分析（本叶）

### 5.1 源码

| 操作 | 文件 | 列 | 预算 | 说明 |
|:--:|---|:--:|--:|---|
| NEW | `packages/web-cli-plugin/src/tools/next-tool.ts` | B | +1.0~1.9 KB | 工具名 / schema / 上限常量 / entry 工厂（纯模块：零 chrome / 零 DOM / 零 IO） |
| MODIFY | `packages/web-cli-plugin/src/background/host.ts` | B | +40~80 B | 注册一行（`createNextToolEntry()` 与 `createAskUserToolEntry` 同段） |
| MODIFY | `packages/web-cli-plugin/src/background/ai-next.ts` | B | −150~+350 B | 删 `FENCE`/`lastNextFenceBody`/`parseAiNextItems`/`AI_NEXT_FENCE_INFO`；`parseNextToolArguments(raw)`（NEW 函数）+ `validateAiNext(candidates, facts)`；`admitCandidate` 逐字 |
| MODIFY | `packages/web-cli-plugin/src/background/ref-context.ts` | B | −400~−250 B | 删 `NEXT_CONTRACT_GUIDANCE`（`:52-59`）与 `:100` 的注入（`REF_SCOPE_GUIDANCE` 保留） |
| MODIFY | `packages/web-cli-plugin/src/background/service-worker.ts` | B | +800~1.6 KB | `turnState` + `hooks.intercept` + events 过滤 + `onFinish` 装配改造 |
| MODIFY | `packages/web-cli-plugin/src/ui/sidepanel/next-registry/providers.ts` | A | +40~120 B | `ai-next.rule: 'ai-led'`（其余逐字） |
| MODIFY | `packages/web-cli-plugin/src/ui/sidepanel/recommend.ts` | A | +80~250 B | `NEXTSTEP_PRIORITY` 恰 5 + `NEXTSTEP_LABELS.ai-led` |
| 复核 | `packages/web-cli-plugin/src/ui/sidepanel/cards/nextstep.ts` | A | 0（预期） | AI 候选 / 终端渲染复用既有 |

### 5.2 测试 / 台账 / 文档

| 操作 | 文件 | 说明 |
|:--:|---|---|
| 改写 | `packages/web-cli-plugin/test/ai-next-candidate.test.ts` | AI-N-1 换机制（工具捕获 + 解析失败不抛 + 取最后一次 + ≤3）；AI-N-2~11 语义保留；新增 AI-N-12（schema 单源）/ AI-N-13（不上流）/ AI-N-14（`tc.args` 零使用）；对账表 + `assertionsRemoved = 0` |
| MODIFY | `packages/web-cli-plugin/test/parity/waivers.json` | `pluginExtras['next']`（reason + basis） |
| MODIFY | `packages/web-cli-plugin/test/recommendation-sources.test.ts` | ③ 恰 4 → 恰 5（逐项复算 + 注入反证）；`:143-145` 的 priority 自适应判据**不变**；`:625` 断言不变、注释重锚（AI 独立 `ai-led` 槽） |
| MODIFY | `packages/web-cli-plugin/test/ui/s0-self-driven.mjs` + `test/ui/fixtures/s0-chain.mjs` | S0'''' 主线 A + 支线 B node 面断言（Chromium 面叶2 终态）；样本重锚为工具捕获 |
| MODIFY | `packages/web-cli-plugin/test/size-baseline.ts` | 叶1 收口重登记（五要素 + 三值 + `nda1Rows`；B 列标注不计账） |
| MODIFY | `packages/web-cli-plugin/test/gate-integrity.test.ts` | 改写门禁入受审集合（下界只增）；`CHROMIUM_GATES === 9` 不动 |
| MODIFY | `packages/web-cli-plugin/docs/v4-supersession-ledger.json` | `xNdaLedger`（叶1 骨架）+ `xNdaGateReconciliation`（叶1 相关行） |
| MODIFY | `.sddu/.../specs-tree-nda-1-next-tool-channel/{plan.md,ADR-NDA-101,ADR-NDA-102,state.json,TREE.md}` | 本叶产物 |
| 零改（必须绿） | `test/ref-context-in-turn.test.ts`（RCT）/ `test/driver-timings.test.ts` / `test/op-wiring.test.ts` / `test/insight-no-escalation.test.ts` / `test/law8-plaintext.mjs` | 若红 = 实现缺陷，**不改判据** |

## 6. 风险评估（本叶）

| 风险 | 概率 | 影响 | 缓解 |
|---|:--:|:--:|---|
| **R-NDA-905**（`next` 工具被实现成「第二产出内核 / 有执行体」） | 中 | 高 | 合成 `ToolResult` ⇒ 短路 dispatch；`executor` fail-closed；反证「dispatch 被调 ⇒ 必红」 |
| **R-NDA-001**（校验链 / 分层被误伤） | 中 | 高 | `admitCandidate` 逐字保留（切片哈希可判）；四类注入反证；`pressDecision` diff=0 |
| **R-NDA-908**（门禁改写静默删断言） | 中 | 高 | 语义对账表 + `assertionsRemoved = 0` + 反证「删 AI-N-1 不补等价 ⇒ 必红」 |
| **R-NDA-902**（围栏块影子产出残留） | 低 | 高 | **函数级删除**（结构性消除）+ 反证「重新接线旧解析 ⇒ 必红」 |
| **R-NDA-008**（schema 与候选结构不一致 ⇒ 入口漂移） | 中 | 中高 | schema 与 `AiNextCandidate` 同构；`params` 类型订正（`COR-NDA-7`）；AI-N-12 重算式判据 |
| **R-NDA-904 / R-NDA-003**（分相相关） | — | — | **叶1 不触**（分相属叶2）；叶1 只保证「未配置 ⇒ 不下发工具」（`FR-NDA-018`，结构性成立） |
| **R-NDA-911**（`next` 上流污染） | 高（若不处置） | 中 | ADR-NDA-102 过滤 + AI-N-13 判据 |
| **R-NDA-912**（第二解析面） | 中 | 中高 | `tc.args` 零使用 + AI-N-14 源扫描 |
| **R-NDA-006 / R-NDA-906**（体积） | 中 | 中高 | B 列优先（A 列仅 +0.1~0.5 KB）+ 叶1 即时重登记（不等两叶） |
| **R-NDA-007**（`NEXTSTEP_PRIORITY` 恰 4 被破） | 高（**已决定破**） | 中高 | 显式取代 + 台账 + 密度重锚（ADR-NDA-003 §③④） |
| **R-NDA-012**（`KL-N-10` flake） | 中 | 低—中 | 门禁串行 + 隔离复跑 ≥2 + 如实记录不阻塞 |
| **R-NDA-915**（异常判定双判） | — | — | **叶1 不触**（判定属叶2） |

## 7. 生成的 ADR

| ADR | 标题 | 状态 | 说明 |
|-----|------|:--:|------|
| ADR-NDA-001（父） | `next` 工具产出通道与注册面 | PROPOSED | 本叶落地：工具定义 / 注册 / parity |
| ADR-NDA-002（父） | `hooks.intercept` 捕获、合成 `ToolResult`、流面过滤与合并口径 | PROPOSED | 本叶落地：接线 / 捕获 / 合并 |
| ADR-NDA-003（父） | 触发无条件与 `ai-led` 独立规则位 | PROPOSED | 本叶落地：规则表 + provider |
| ADR-NDA-004（父） | 围栏块通道替换与 `ai-next-candidate` 门禁改写 | PROPOSED | 本叶落地：删除 + 门禁 |
| ADR-NDA-008（父） | 体积分列预算与升档预案 | PROPOSED | 本叶：B 列归因 + 叶1 重登记 |
| ADR-NDA-009（父） | 取代台账 / 零改基座 / 保护段 | PROPOSED | 本叶：`xNdaLedger` 骨架 |
| **ADR-NDA-101**（叶） | 捕获参数面与解析失败口径（`rawArguments` 严格 JSON；`tc.args` 零使用） | PROPOSED | 本叶新增 |
| **ADR-NDA-102**（叶） | `next` 工具调用不上流（events 加法过滤）与 `onToolDone` 语义不动 | PROPOSED | 本叶新增 |

## 8. 交付物与执行序（供 tasks 参考，**非需求**）

**交付物**（= 本叶 `spec.md` §8.3 的 11 项）：① `next` 工具注册 → ② `hooks.intercept` 接线与捕获 → ③ 5 道校验链保留接入 + 留痕 → ④ 判定分层保持 → ⑤ 触发无条件 + 规则位等价重锚 → ⑥ 围栏块通道替换 → ⑦ `parity` 新条目 → ⑧ `ai-next-candidate` 门禁改写（入 `gate-integrity` 下界）→ ⑨ S0'''' 主线 A / 支线 B node 面 + 注入反证族 → ⑩ 体积叶1 重登记 + 对账表骨架 → ⑪ 本叶 plan/tasks/build/review/validate 产物。

**执行序（承父 §14.1「先立工具通道与安全闸」）**：

| 步 | 内容 | 出口 |
|:--:|---|---|
| 1 | **B 列先行**：`tools/next-tool.ts` + `host.ts` 注册（先不动校验链） | `deriveTools()` 含 `next`；`parity` 条目 |
| 2 | **捕获接线**（ADR-NDA-002 / 102）：`turnState` + `intercept` + events 过滤 | 捕获可判；`next` 不上流 |
| 3 | **校验链接入**（ADR-NDA-004 §①）：删围栏块 + `validateAiNext(candidates)` + 装配 | 四类注入反证；`admitCandidate` 逐字 |
| 4 | **触发 / 规则位**（ADR-NDA-003）：`NEXTSTEP_PRIORITY` 恰 5 + `ai-next.rule='ai-led'` | 无引用仍驱动；`recommendation-sources` 重锚 |
| 5 | **门禁改写 + 反证族**（ADR-NDA-004 §②）：AI-N-1 换机制 + AI-N-12~14 + 对账表 | `assertionsRemoved = 0`；`gate-integrity` 下界只增 |
| 6 | **S0'''' 主线 A / 支线 B node 面** + Chromium 断言增量（样本重锚） | 双面可判 |
| 7 | **体积叶1 重登记** + `xNdaLedger` 骨架 + 对账表骨架 | 五要素齐备；`CHROMIUM_GATES===9` |

> **步序纪律**：第 1~3 步**只落 B 列**（A 列零增量）⇒ 体积压力最迟在第 4 步出现，且届时已有实测数字；第 4 步之后若 A 列实测超估 ⇒ 按 ADR-NDA-008 §③ 走 EC 路径（**不得**搬列规避）。

## 9. 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建（NDA-1 叶技术方案）：前置检查 + 本叶三件待证事项 + 契约数据流（8 步）+ 组件依赖表 + 2 组叶内方案对比（工具定义落点 / `validateAiNext` 输入面）+ 父 ADR 的叶内定案表 + 文件影响（A/B 列 + 预算）+ 叶内风险 12 条 + 8 个相关 ADR（父 6 + 叶 2）+ 7 步执行序（**B 列先行**）。**零运行时验证**；routing.v1 = `local_or_compute → none`。 | 2026-09-27 | SDDU Plan Agent |
