# 技术计划：specs-tree-adn-1-ai-next-produce-and-verify（ADN-1 产出通道 + 5 道校验链 + 判定分层：安全核心）

> **文档定位**: SDDU 技术方案（**叶级切片**）— 父 `../plan.md`（v1.0）在本叶的适用范围与落地口径；作为本叶 tasks 阶段的输入
> **前置依赖**: 父 `../spec.md` v1.0 + 父 `../plan.md` v1.0（含 `ADR-ADN-001`~`005` / `007` / `008` / `009`）+ 本叶 `spec.md` v1.0（承载父 FR ≈48 条切片）
> **创建人**: SDDU Plan Agent
> **创建时间**: 2026-09-26
> **版本**: v1.0
> **更新人**: SDDU Plan Agent
> **更新时间**: 2026-09-26
> **更新说明**: 初始创建（ADN-1 叶技术方案：围栏块协议 + 载荷加法字段 + 5 道校验链（SW 侧）+ `admitCandidate`/`pressDecision` 分层 + `ai-next` provider + `chipsFor` 加法契约 + `DRIVER_DECLS_SRC` 12 + 新 node 门禁 + S0''' 主线/B/D node 面 + B 列归因）

---

## 1. 前置检查

| 检查项 | 状态 | 证据 |
|--------|:--:|------|
| 本叶 `spec.md` 存在 | ✅ | `spec.md`（275 行，v1.0，2026-09-26） |
| 父 `spec.md` / `plan.md` 存在 | ✅ | `../spec.md`（933 行）/ `../plan.md`（v1.0，含 `ADR-ADN-001~010` 索引） |
| 上游叶依赖 | ✅ | `dependsOn: []`（首叶 / 底座叶；叶2 强依赖本叶） |
| 外部 API 文档缓存 | ✅ N/A | 零外部 API / 零新依赖 / 零新权限 |
| 关键约束可核 | ✅ | `ref-context-in-turn.test.ts` RCT-3（system 工厂逐字 + 基座 5 条 + 零引用 ⇒ 基座）；`recommendation-sources` 白名单 5；`KIND_SET` 40；`NEXTSTEP_PRIORITY` 恰 4 |
| 写入范围 | ✅ | 仅本叶 SDDU 目录（`plan.md` / `state.json` / `TREE.md`）；未跑门禁 / 构建 / Chromium |

---

## 2. 架构分析（本叶）

**本叶的验收锚**：把「LLM 结构化产出的下一步」变成**受 5 道校验约束、可注入、可判定的候选流**，且**在确定性路径不被破坏的前提下**——本叶**不动**兜底 / 合并 / 首开（那是叶2）。

**落地结构（本叶切片）**：

```
src/background/
├── ai-next.ts        ← NEW：parseAiNextBlock + admitCandidate + validateAiNext（纯函数，B 列）
├── chat-events.ts    ← ChatResultEvent +`aiNext?`（单声明）
├── ref-context.ts    ← refContextSegment 有引用分支追加产出契约句
└── service-worker.ts ← 累积末条 assistant 文本；done 时解析 + 校验 + 装配

src/ui/sidepanel/next-registry/
├── definition.ts     ← AiNext* 类型 + NextCtx.session.aiNext? + NextProvider.chipsFor?/label?
├── providers.ts      ← `ai-next` provider（第 12 行）+ DRIVER_DECLS_SRC 第 12 行 + 注释订正
├── ai-drive.ts       ← driverBlockedLine（留痕单源）
├── registry.ts       ← validateNextProvider 对 chipsFor 的 loud 校验（加法）
└── ops.ts            ← reachableOpIds 优先 chipsFor(ctx)

src/shared/op-table.ts   ← OpDescriptor.ask?（param 相容校验单源）
src/ui/sidepanel/recommend.ts   ← RecommendInput.session.aiNext? + 透传 + chipsFor 解析
src/ui/sidepanel/sidepanel.ts   ← done 分支消费 aiNext（事件作用域 + 留痕）+ testing.aiNext 测试缝
```

**本叶不做的**：兜底语义终态 / free-input 终端终态验收 / 合并与替换口径终态 / R6 同因去重扩展 / 护栏六常量接线与关断两相 / 首开边界落地 / 升级 6 门禁重锚终态 / 保护段 / X-ADN 台账终态 / 体积叶2 重登记。

---

## 3. 方案对比（本叶两个关键形态点）

| 维度 | **方案 A：尾随围栏块 + SW 校验 + `chipsFor` 加法契约（推荐）** | 方案 B：工具调用产候选 + 面板侧校验 |
|---|---|---|
| 描述 | `background/ai-next.ts` 解析末条 assistant 文本；5 道校验 SW 侧；`ai-next` provider 用 `chipsFor` 动态产 chip | 模型调「next」工具；面板侧校验 |
| 优点 | 零新增 kind / 零新 LLM / 零新工具面；基座与工厂零改；旁路 A 列档位压力 | 「结构化」由工具 schema 化 |
| 缺点 | 依赖模型文本遵从度（不遵从 ⇒ 支线 C 兜底） | 新增工具面 ⇒ 动 `toolCount` / 工具目录 / parity 契约；面板校验压 A 列账本 / 或引第二校验器（违规） |
| 风险 | R-ADN-012（⇒ 纯函数校验器 + 注入反证） | R-ADN-008 / R-ADN-006（高） |
| 工作量 | 中（B 列一模块 + A 列薄接线 + 1 门禁） | 高且多处越界 |

**推荐：方案 A**（理由见父 `ADR-ADN-001` / `ADR-ADN-002` / `ADR-ADN-004`）。

---

## 4. 本叶设计定案（父 ADR 的叶内落地）

| # | 落地项 | 定案 | 判据锚 |
|:-:|---|---|---|
| 1 | 时机 | 复用既有 `'idle'`；**只在 `done`** 解析（不新增触发词；`DRIVER_TIMINGS` 恰 5 不动） | `ADR-ADN-001` §①；DT-2/DT-3 |
| 2 | 载体 | `ChatResultEvent.aiNext?`（**单声明**，type-only；∉ `KIND_SET`；缺席 ⇒ 现状逐字） | `ADR-ADN-001` §②；AI-N-8 |
| 3 | 提示 | `refContextSegment` 有引用分支追加产出契约（**基座 / 工厂形态零改**；无引用 ⇒ `''`） | `ADR-ADN-001` §③；RCT-3 保持 |
| 4 | 协议 | 尾随 `next` 围栏块 + 严格 JSON 数组；取**最后一条** assistant 文本的**最后**一块；逐项容错；无块/非数组 ⇒ 零候选 | `ADR-ADN-001` §④；AI-N-1 |
| 5 | 5 道校验链 | ① opId 在册 → ② `tierOf` 三档（gesture 拒）→ ③ ref 有效 → ④ param 在 `AskSpec` 内 → ⑤ 丢弃 + `blocked=` 留痕；**顺序即优先级** | `ADR-ADN-002` §①；AI-N-2/3/4 |
| 6 | 拒绝码闭集 | `unknown-op` / `tier` / `ref` / `param` / `label`（从 `PressBlocked` 派生 + 2 新码；`parse` 级失败不写码） | `ADR-ADN-002` §① |
| 7 | param 单源 | `OpDescriptor.ask?: 'choice'|'form'`（纯加法）+ 与 `ops.ts#IMPL` 的 `params===null` **逐行一致** | `ADR-ADN-002` §③；AI-N-4/11 |
| 8 | 判定分层 | 新增 `admitCandidate`（接受层：auto/confirm 接受、gesture 拒）；`pressDecision` **diff=0**；共享 `tierOf` | `ADR-ADN-003`；AI-N-5 |
| 9 | provider | `ai-next`（`rule:'ref-action'` + `priority:2` + `prepend:true`；`chipsFor` 权威 + 静态 `chips` 下界） | `ADR-ADN-004` §②③；AI-N-9 |
| 10 | 注入槽 | `NextCtx.session.aiNext?`（嵌套 ⇒ 顶层仍 7 源）+ `RecommendInput.session.aiNext?`；**类型落 `definition.ts`** ⇒ 白名单恒 5 | `ADR-ADN-004` §①；recommendation-sources 绿 |
| 11 | 留痕 | `driverId='ai-next'` / `timing='idle'` / `evidence=['session.aiNext']`；`driverBlockedLine` 单源；**零值** | `ADR-ADN-006` §①②；AI-N-9 |
| 12 | 新门禁 | `test/ai-next-candidate.test.ts`（AI-N-1~11）入 `gate-integrity` 下界（**只增**）；`CHROMIUM_GATES === 9` 不动 | `ADR-ADN-009` §①③ |
| 13 | S0''' node 面 | 主线（合法被采纳）+ 支线 B（非法被拦 + 留痕）+ 支线 D（未配纯确定性）+ 注入反证族（五类） | `ADR-ADN-007` §①②③ |
| 14 | 体积 | 叶1 A 列 **+0.8~2.0 KB** / B 列 **+1.5~3.5 KB（不计账）**；收口五要素 + 三值重登记 | `ADR-ADN-008` §② |

---

## 5. 文件影响分析（本叶）

| 操作 | 文件路径 | 说明 |
|:--:|---|---|
| NEW | `src/background/ai-next.ts` | 解析 + 5 道校验链 + `admitCandidate` + label 预筛（纯函数） |
| MODIFY | `src/background/chat-events.ts` | `ChatResultEvent.aiNext?`（单声明） |
| MODIFY | `src/background/ref-context.ts` | 产出契约句（有引用分支） |
| MODIFY | `src/background/service-worker.ts` | 末条 assistant 文本累积 + `done` 装配 |
| MODIFY | `src/ui/sidepanel/next-registry/definition.ts` | 3 类型 + 2 加法字段 |
| MODIFY | `src/shared/op-table.ts` | `OpDescriptor.ask?` |
| MODIFY | `src/ui/sidepanel/next-registry/providers.ts` | `ai-next` provider + 第 12 行声明 + 注释订正 |
| MODIFY | `src/ui/sidepanel/next-registry/ai-drive.ts` | `driverBlockedLine` |
| MODIFY | `src/ui/sidepanel/next-registry/registry.ts` | `chipsFor` loud 校验（加法） |
| MODIFY | `src/ui/sidepanel/next-registry/ops.ts` | `reachableOpIds` 优先 `chipsFor` |
| MODIFY | `src/ui/sidepanel/recommend.ts` | 注入槽透传 + `chipsFor` 解析（**不做** R6 扩展 / 替换口径终态） |
| MODIFY | `src/ui/sidepanel/sidepanel.ts` | `done` 分支消费 + 留痕 + 测试缝 |
| NEW | `test/ai-next-candidate.test.ts` | AI-N-1~11 + 反证 + 三段控制 |
| MODIFY | `test/recommendation-sources.test.ts` / `driver-timings.test.ts` / `driver-quadruple.test.ts` / `op-wiring.test.ts` / `next-registry.test.ts` / `op-three-tier.test.ts` / `gate-integrity.test.ts` | 等价重锚（详见父 `ADR-ADN-009`） |
| MODIFY | `test/ui/s0-self-driven.mjs` / `test/ui/law8-plaintext.mjs` | S0''' node 面对应的 Chromium 断言增量（**只加断言**） |
| MODIFY | `test/size-baseline.ts` + `test/size-growth-evidence.test.ts` | 叶1 五要素 + 三值 + 逐模块行 |
| MODIFY | `packages/web-cli-plugin/docs/v4-supersession-ledger.json` | X-ADN 台账**骨架**（X-1 / X-7 / X-2·3·4·5·6·9 no-supersession） |
| MODIFY | 本叶 `state.json` / `TREE.md` | 阶段推进 |

**零改动（本叶）**：`test/ui/journey.mjs` / `test/ui/binding.mjs`（保护段 keep）；C 列冻结面；`packages/web-cli-base/**`。

---

## 6. 风险评估（本叶）

| # | 风险 | 等级 | 缓解 |
|---|---|:--:|---|
| R-ADN-001 | AI 幻觉 op / 越界 ref / 越界 param 触达特权 / 不可逆面 | 高 | 5 道校验链先于接受；gesture 恒拒；纯函数校验器 + 五类注入必红 |
| R-ADN-902 | 校验链写成「先展示后校验」 | 高 | 校验在 SW；面板只收已校验；反证「未校验候选进 chips ⇒ 必红」 |
| R-ADN-901 | 判定混同（`confirm` 不可见 / `gesture` 被放行） | 高 | 分层真值表 + 双向反证（ADR-ADN-003） |
| R-ADN-008 | `KIND_SET` 40 / 12 kind / 零宿主被撞 | 高 | 复用 `chat-result` 加法字段（type-only）；AI-N-8 |
| R-ADN-904 | AI 候选被做成「第 5 规则位 / 第二产出内核」 | 高 | 骑 `ref-action` 位 + `prepend`；`recommendNextStep` 唯一内核；反证必红 |
| R-ADN-905 | 载荷加法字段破坏兼容 | 中高 | 「缺席 ⇒ 现状逐字」断言；类型落 `definition.ts` |
| R-ADN-012 | 门禁难断言不确定 LLM 输出 | 中 | 纯函数校验器 + 注入反证 + 真源切片 |
| R-ADN-903 | 校验器读测试自建常量 / 判据恒真 | 中高 | 真源切片 + 三段控制 + 注入必红 |
| R-ADN-006 | 体积（A 列薄接线仍可能越预算） | 中高 | B 列优先 + 先出预算；叶1 收口实测重登记 |
| R-ADN-014 | 形态被顺手定下 | 中高 | PD-ADN-002/003/004/005/006/007/008 已在父 `plan.md` §7.1 裁决 |
| R-ADN-011 | 中间态裸放（只接产出不补校验） | 中高 | 本叶**一次交付通道 + 校验 + 分层**；S0''' 支线 B 独立可判 |

---

## 7. 交付物与执行序（供 tasks 参考，**非需求**）

**交付物（9 项）**：① `ai-next.ts` 解析 + 5 道校验链；② `chat-result` 加法字段 + 面板消费（事件作用域 + 留痕）；③ 判定分层（`admitCandidate` + `pressDecision` diff=0）；④ `ai-next` provider（第 12）+ 声明 12 + `chipsFor` 契约；⑤ 注入槽（`session.aiNext`）+ 透传 + `chipsFor` 解析；⑥ 新 node 门禁 `ai-next-candidate`；⑦ S0''' 主线/B/D node 面 + 注入反证族；⑧ `gate-integrity` 下界 +1 + 对账骨架；⑨ 叶1 体积重登记（A/B 分列）。

**执行序（3 波）**：
1. **W1 载体与校验链**：`definition.ts` 类型 + `chat-events` 字段 + `ref-context` 契约句 + `service-worker` 累积/装配 + `background/ai-next.ts`（解析 → ①→②→③→④→⑤）+ `shared/op-table.ask` + AI-N-1~4/11。
2. **W2 分层与注入**：`admitCandidate` + `pressDecision` 不动 + `ai-next` provider + `chipsFor` + `DRIVER_DECLS_SRC` 12 + `driverBlockedLine` + 注入透传 + 面板 `done` 消费 + `testing.aiNext` 缝 + AI-N-5/8/9/10。
3. **W3 门禁与验收**：新门禁全量（AI-N-1~11 + 反证实跑 + 还原）+ `recommendation-sources`/`driver-timings`/`driver-quadruple`/`op-wiring`/`next-registry`/`op-three-tier`/`gate-integrity` 重锚 + S0''' node/Chromium 增量 + X-ADN 台账骨架 + 体积叶1 重登记。

**Gate 硬要求**：`test` / `test:ui` / `test:binding` **串行**；新增 `test/ai-next-candidate.test.ts` 入 `gate-integrity` 下界（只增）；**不新增 Chromium 门禁文件**；反证必实跑 + 逐字节还原 sha256。

---

## 8. 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建（ADN-1 叶 plan：§1 前置检查 · §2 本叶架构（安全核心 / 不动兜底合并首开）· §3 两方案对比（推荐 A：围栏块 + SW 校验 + `chipsFor`）· §4 14 项设计定案 · §5 文件影响 18 项 · §6 风险 11 条 · §7 交付物 9 项 + 3 波执行序） | 2026-09-26 | SDDU Plan Agent |
