# 构建报告：specs-tree-adn-1-ai-next-produce-and-verify

> **文档定位**: SDDU 构建报告 — 记录全部任务的文件变更和实现结果，作为 review 阶段的输入  
> **前置依赖**: 本叶 `tasks.md` / `tasks.json`（v1.0）、本叶 `plan.md`（v1.0）、父 `plan.md` / `spec.md`（ADR-ADN-001~010）  
> **创建人**: SDDU Build Agent  
> **创建时间**: 2026-09-26  
> **版本**: v1.0  
> **更新人**: SDDU Build Agent  
> **更新时间**: 2026-09-26  
> **更新说明**: 初始创建（ADN-1 R1 = W01+W02 / TASK-ADN-101~117；W03 留 R2）

---

## 0. 本轮范围与结论（R1 = W01+W02）

| 项 | 内容 |
|---|---|
| 范围 | **W01（载体与校验链）+ W02（分层与注入）** = `TASK-ADN-101~117`（17 任务） |
| 留待 R2 | W03 = `TASK-ADN-118~127`（升级 6 重锚 / S0''' 四支线双面 / gate-integrity 受审下界 / 体积叶1 终态收口 / X-ADN 台账终态） |
| 先验闸门 | **SG-ADN-01 = 可行（13/13，探毕删除）**；**SG-ADN-02 = 可行（真值表四情形实跑，见 §2/§5）** |
| 交付 | `src/background/ai-next.ts`（NEW）+ 12 源文件/测试变更 + `test/ai-next-candidate.test.ts`（NEW，14 用例） |
| 门禁 | `npm test` **1463 / 0**（基线 1449 ⇒ +14，零删除） |

---

## 1. 构建概要

| 维度 | 数值 |
|------|:--:|
| 完成任务数 | 17 / 17（本轮 W01+W02；W03 10 任务留 R2） |
| 复杂度分布 | S×6 / M×7 / L×4（TASK-ADN-106 / 114 / 115 + 107 计入 M） |
| 新增文件 | 2 个（`src/background/ai-next.ts`、`test/ai-next-candidate.test.ts`） |
| 修改文件 | 17 个（12 源码/文档 + 5 测试/台账） |

### 1.1 SG-ADN-01（TASK-ADN-101）先验结论

`test/_spike/sg-adn-01-probe.mjs`（探毕删除，不入版本库）**13 PASS / 0 FAIL ⇒ 可行**：

- 取**本回合最后一条** assistant 文本的**最后一个** info=`next` 围栏块（大小写不敏感）；中间轮次不参与；
- 严格 `JSON.parse` + 顶层必须数组（否则零候选，**不写 blocked**）；项非对象 ⇒ 丢弃；
- `KIND_SET` 恰 40（实测 40）∧ ∌ `aiNext`；`ChatResultEvent` 既有 7 字段逐字；候选类型 ∉ `KIND_SET`；
- 反证可红：注入第 41 个 `KIND_SET` ⇒ 判据可 FAIL。

### 1.2 SG-ADN-02（TASK-ADN-108）先验结论

`test/_spike/sg-adn-02-probe.mjs`（探毕删除）**可行**；真值表四情形由 `admitCandidate` / `pressDecision` 实跑承载（见 §3 AI-N-5）：

| 情形 | `admitCandidate` | `pressDecision`（actor=ai, configured, armed） |
|---|---|---|
| `op.turn`（auto） | ✅ 接受 | ✅ `ok:true`（可自动按下） |
| `op.llm-config`（confirm） | ✅ 接受 | ❌ `blocked:'tier'`（**不可自动按下**） |
| `op.authorize`（gesture） | ❌ `blocked:'tier'`（**连接受都拒**） | ❌ `blocked:'tier'` |
| `op.ghost`（未知） | ❌ `blocked:'unknown-op'` | ❌ `blocked:'unknown-op'` |

**分层结论**：`admitCandidate.ok === true ∧ pressDecision(...).blocked === 'tier'`（`op.llm-config`）成立 ⇒ 接受 ≠ 按下；`pressDecision` 语义 **diff = 0**（未改动）；两层共享 `tierOf` 单源（零第二档位表）。

---

## 2. 文件变更

| 操作 | 文件路径 | 对应任务 | 说明 |
|:--:|------|:--:|------|
| NEW | `packages/web-cli-plugin/src/background/ai-next.ts` | TASK-ADN-106 / 109 | 解析（尾随 `next` 围栏块 + 严格 JSON 数组）+ 5 道校验链 + `admitCandidate`（纯函数，B 列） |
| MODIFY | `packages/web-cli-plugin/src/ui/sidepanel/next-registry/definition.ts` | TASK-ADN-102 | `AiNextCandidate` / `AiNextBlockedCode` / `AiNextPayload` 3 类型 + `NextCtx.session.aiNext?` + `NextProvider.chipsFor?`/`label?` |
| MODIFY | `packages/web-cli-plugin/src/background/chat-events.ts` | TASK-ADN-103 | `ChatResultEvent.aiNext?`（type-only 单声明；∉ `KIND_SET`；缺席 ⇒ 现状逐字） |
| MODIFY | `packages/web-cli-plugin/src/background/ref-context.ts` | TASK-ADN-104 | `NEXT_CONTRACT_GUIDANCE` 产出契约句（**只在有引用分支**；无引用 ⇒ `''` ⇒ 基座逐字） |
| MODIFY | `packages/web-cli-plugin/src/shared/op-table.ts` | TASK-ADN-105 | `OpDescriptor.ask?: 'choice'\|'form'`（param 相容单源；`ask===undefined ⟺ IMPL params===null`） |
| MODIFY | `packages/web-cli-plugin/src/background/service-worker.ts` | TASK-ADN-107 | 累积**末条** assistant 文本；`done` 装配 `aiNext`（零新 LLM 调用） |
| MODIFY | `packages/web-cli-plugin/src/ui/sidepanel/next-registry/providers.ts` | TASK-ADN-109/110 | `ai-next` provider（第 12 行：rule=`ref-action` + `prepend` + `chipsFor` + `label`）+ `DRIVER_DECLS_SRC` 第 12 行（12↔12）+ 注释订正 |
| MODIFY | `packages/web-cli-plugin/src/ui/sidepanel/next-registry/ai-drive.ts` | TASK-ADN-111 | `driverBlockedLine` 单源（与 `driverSuppressedLine` 同构；拒绝码闭集，零值零明文） |
| MODIFY | `packages/web-cli-plugin/src/ui/sidepanel/next-registry/registry.ts` | TASK-ADN-112 | `chipsFor`/`label` 加法 loud 校验（既有 `empty-chips` 判据不删） |
| MODIFY | `packages/web-cli-plugin/src/ui/sidepanel/next-registry/ops.ts` | TASK-ADN-112 | `reachableOpIds` 优先 `chipsFor(ctx)` |
| MODIFY | `packages/web-cli-plugin/src/ui/sidepanel/recommend.ts` | TASK-ADN-113 | `RecommendInput.session.aiNext?` + 透传 + `chipsFor` 权威解析 + 卡片 label 覆盖 |
| MODIFY | `packages/web-cli-plugin/src/ui/sidepanel/sidepanel.ts` | TASK-ADN-114 | `done` 事件作用域单槽消费（`consumeAiNext`）+ 被拦留痕 + `testing.aiNext` 测试缝 |
| NEW | `packages/web-cli-plugin/test/ai-next-candidate.test.ts` | TASK-ADN-115/116/117 | 新 node 门禁 `ai-next-candidate`（AI-N-1~11 + 五类注入反证 + 真源切片 + 三段控制；14 用例） |
| MODIFY | `packages/web-cli-plugin/test/next-registry.test.ts` | TASK-ADN-110（间接面） | NR-10 反证「还原 PASS」声明行 11 → **12** |
| MODIFY | `packages/web-cli-plugin/test/size-baseline.ts` | 体积五要素 | 中间登记 598,926 → **603,205 B**；`adn1R1Rows`；`deltaBytes`/`closeoutDeltaBytes`/`wiringBytes`；`RE_REGISTRATIONS['adn-1-r1']` |
| MODIFY | `packages/web-cli-plugin/test/size-budget.test.ts` | 体积五要素 | 基线/生效上限重 pin（603,205 / 633,365）+ `measuredOn` |
| MODIFY | `packages/web-cli-plugin/test/size-growth-evidence.test.ts` | 体积五要素 | 最新一轮指向 `adn1R1Rows` + `closeoutDeltaBytes` 锚 + `requiredBy` 引用面接受 `FR-ADN-*` + 轮次组 39 |
| MODIFY | `packages/web-cli-plugin/test/size-ruling-vol3.test.ts` | 体积五要素 | 基线/生效上限重 pin + 软纪律边界值上移 |
| MODIFY | `packages/web-cli-plugin/docs/v4-supersession-ledger.json` | 台账（机械登记） | `ADN1-E-VOL-1`（断言零删减）+ 体积三值同源 + 叶段 scope/逐字删除面登记（4 叶段） |
| MODIFY | `packages/web-cli-plugin/docs/v4-density-baseline.json` | 体积五要素 | `volume.registeredBaselineBytes` / `ceilingBytes` 同源前移 |

### 2.1 红线巡检（零新增载体 / 零破）

| 红线 | 实测 | 结论 |
|---|---|---|
| `KIND_SET` | **40** 逐字（AI-N-8 机核） | ✅ 零新增 kind |
| 12 kind | 不变（`CARD_TAG_LABELS` 12） | ✅ |
| 零宿主 | `REGISTERED_STRUCTURAL_HOSTS === []` | ✅ |
| `ACT_TO_OP` | **恰 6** 行 | ✅ |
| 特权恒 gesture | `op.authorize` / `op.perm.request` 恒 `gesture`；接受层即拒 | ✅ |
| 三冻结面 | `content.js` **177,076 B / sha `52a82620…`**、`pick-layer.js` **34,358 B / sha `77796bab…`** 逐字节不变；`manifest.json` / `packages/web-cli-base/**` 零 diff | ✅ |
| FR-CHAT-060 | `recommend.ts` 零 `fetch(`/`chrome.`/时钟（AI-N-10 机核）；零新 LLM 调用 | ✅ 不破 |
| 判定链零触碰 | `policy.ts` / `auto-authorize.ts` 零 diff | ✅ |
| 法八零明文 | `law8-plaintext` **60 / 0** | ✅ |

---

## 3. 任务完成清单

| 任务 | 名称 | 复杂度 | 状态 | 对应 FR |
|------|------|:--:|:--:|------|
| TASK-ADN-101 | SG-ADN-01 围栏块解析 + 载荷加法字段探针 | M | ✅ completed（可行 13/13，探毕删除） | FR-ADN-010/011/012/016/018/028 |
| TASK-ADN-102 | `definition.ts` AiNext* 3 类型 + `session.aiNext?` + `chipsFor?`/`label?` | S | ✅ completed | FR-ADN-011/012/015 |
| TASK-ADN-103 | `chat-events.ts` `ChatResultEvent.aiNext?` | S | ✅ completed | FR-ADN-011/018 |
| TASK-ADN-104 | `ref-context.ts` 有引用分支追加产出契约句 | S | ✅ completed | FR-ADN-010 |
| TASK-ADN-105 | `shared/op-table.ts` `OpDescriptor.ask?` | S | ✅ completed | FR-ADN-016/025 |
| TASK-ADN-106 | `background/ai-next.ts` 解析 + 5 道校验链 + `admitCandidate` | L | ✅ completed | FR-ADN-016/020~029 |
| TASK-ADN-107 | `service-worker.ts` 末条 assistant 文本 + `done` 装配 | M | ✅ completed | FR-ADN-010/016/017 |
| TASK-ADN-108 | SG-ADN-02 分层共享 `tierOf` 且 `pressDecision` diff=0 探针 | M | ✅ completed（可行；四情形实跑） | FR-ADN-030~035 |
| TASK-ADN-109 | `admitCandidate` 接受层真值表 | M | ✅ completed（AI-N-5） | FR-ADN-030~033 |
| TASK-ADN-110 | `providers.ts` ai-next 第 12 行 + `DRIVER_DECLS_SRC` 第 12 行 | M | ✅ completed（AI-N-9） | FR-ADN-013/014/096 |
| TASK-ADN-111 | `ai-drive.ts` `driverBlockedLine` 单源 | S | ✅ completed | FR-ADN-013/026 |
| TASK-ADN-112 | `registry.ts` chipsFor loud 校验 + `ops.ts` `reachableOpIds` | S | ✅ completed | FR-ADN-014/015 |
| TASK-ADN-113 | `recommend.ts` 透传 + `chipsFor` 解析 + label 覆盖 | M | ✅ completed | FR-ADN-015/018/098 |
| TASK-ADN-114 | `sidepanel.ts` done 消费（事件作用域单槽 + 留痕）+ `testing.aiNext` | L | ✅ completed | FR-ADN-010/018/026 |
| TASK-ADN-115 | `ai-next-candidate` 骨架 AI-N-1~4/11 | L | ✅ completed | FR-ADN-020/024/025/027/028 |
| TASK-ADN-116 | `ai-next-candidate` AI-N-5/8/9/10 | M | ✅ completed | FR-ADN-030/035/011/096/017 |
| TASK-ADN-117 | `ai-next-candidate` AI-N-6/7 五类注入反证 + 真源切片 + 三段控制 | M | ✅ completed | FR-ADN-029/082/085/111 |

**W03（留 R2）**：TASK-ADN-118~127（`recommendation-sources`/`driver-timings`/`driver-quadruple`/`op-wiring`/`next-registry`/`op-three-tier`/`gate-integrity` 重锚 + `s0-self-driven.mjs`/`law8-plaintext.mjs` 断言增量 + 红线巡检 + 体积叶1 终态重登记 + X-ADN 台账骨架）。

---

## 4. 测试覆盖

| 门禁 | 用例 | 结论 | 日志 |
|---|:--:|:--:|---|
| `npm test`（node） | **1463** | ✅ **1463 / 0**（基线 1449 ⇒ +14，零删除） | `/tmp/opencode/v4-gate-logs/adn-1-r1/test-final2.log` |
| `ai-next-candidate`（新） | 14 | ✅ 14 / 0 | 同上（含） |
| `supersession` | 49 | ✅ 49 / 0 | `/tmp/opencode/v4-gate-logs/adn-1-r1/supersession6.log` |
| `test:ui`（journey） | 171 | ✅ PASS（保护段 keep） | `/tmp/opencode/v4-gate-logs/adn-1-r1/journey.log` |
| `test:s0-self-driven` | 82 | ✅ 82 / 0 | `/tmp/opencode/v4-gate-logs/adn-1-r1/s0.log` |
| `test:law8` | 60 | ✅ 60 / 0 | `/tmp/opencode/v4-gate-logs/adn-1-r1/law8.log` |
| `test:dead-end` | 53 | ✅ 53 / 0 | `/tmp/opencode/v4-gate-logs/adn-1-r1/dead-end.log` |
| `test:recommendation` | — | ✅ PASS（首轮 ⑭ 授权 chip 环境 flake，隔离复跑 PASS） | `recommendation-r2.log` |
| `test:binding` | 192 | ⚠️ **环境红（如实记录）**：4 次隔离复跑失败点漂移（`#8f~#8i` tabs switch / `#8e` `#confirm-allow` / `#6l` 滚动），与 ADN 改动面无交集；保护段 sha `be9ad0e9…` + `startByte 107780` 由 `supersession` 双绿机核（49/0）。KL-N-10 处置：≥2 隔离复跑 + 全量日志，仍红不阻塞收口。 | `binding*.log` |

> **注**：`ai-next-candidate` 入 `gate-integrity` 受审下界（`EXPECTED_AUDITED_FILES` + `V_ADN_NODE_GATE_FILES`）为 **W03 / TASK-ADN-123**（留 R2）；本轮新门禁已由目录扫描自动纳入受审集合（`gate-integrity` 在 `npm test` 内 0 fail）。

### 4.1 反证摘要（五类注入 + 分层双向 + 载体注入）

| 注入 | 期望 | 实测 |
|---|---|---|
| gesture op（`op.authorize`） | `blocked='tier'` | ✅ |
| 幻觉 op（`op.delete-everything`） | `blocked='unknown-op'` | ✅ |
| 越界 / 失效 ref（`ref_999` / `ref_7`） | `blocked='ref'` | ✅ |
| 越界 param（`op.turn` 带参 / 数组 / 空串 / 超长） | `blocked='param'` | ✅ |
| label 含凭据（`sk-…` / `api_key:`） | `blocked='label'`（先扫后截） | ✅ |
| confirm 也拒（退回混同） | `layeringProblems` 必红 | ✅ |
| gesture 放行 | `layeringProblems` 必红 | ✅ |
| 第 41 `KIND_SET` / 第 13 kind / 新宿主 / `ACT_TO_OP` 多一行 | `carrierProblems` 必红 → 逐字节还原 sha256 相同 | ✅ |
| 声明表少一行 / 多一行 / 漂移 | `driverDeclProblems` 必红 | ✅ |
| `ai-next.ts` 注入 `fetch(` / 第二 MAX 常量 / `recommend.ts` 注入时钟 | `purityProblems` 必红 | ✅ |
| `ask` 表漂移一行 | `askConsistencyProblems` 必红 | ✅ |
| 三段控制 | `ok` / `violated` / `n/a` 逐态可达（n/a 不冒充 ok） | ✅ |

---

## 5. 已知偏差与诚实登记

1. **ADR-ADN-002 §③ 真值表的 `op.perm.request` 行**：该 op 是 `gesture` 档 ⇒ 5 道链**② 即拒**（`blocked='tier'`），**到不了 ④ param 判**。其 `ask='form'` 仍由 AI-N-11（descriptor ↔ `ops.ts#IMPL` 逐行一致）机核。已在 `test/ai-next-candidate.test.ts#AI-N-4` 显式登记该口径（不是放宽）。
2. **体积（A 列，中间登记；W03/R2 终态）**：`dist/sidepanel.js` **598,926 → 603,205 B（+4,279 B，+0.71%）** —— 越 ADR-ADN-008 §② 叶1 预算（+0.8~2.0 KB）与 +15% 上界（+0.9~+2.3 KB）；按「**越叶预算登记不停机**」如实登记。
   - 五要素：前值 598,926 / 后值 603,205 / 日期 2026-09-26 / 来源 `dist/sidepanel.js`（`npm run build`；真实 `dist/build-meta.json`）/ 理由 = 见 `SIDEPANEL_RE_REGISTRATIONS['adn-1-r1']`；历史保留 `[598_926, 598_577, 599_125, 598_282]`。
   - 三值：`newBaselineBytes = 603,205` / 档位 `ceilTo50KB = 614,400`（**未跨档位**）/ 绝对上限 `675,840`（不动）；生效上限 `floor(603,205 × 1.05) = 633,365`；`authorConfirmation = pending-author-line`（**不伪称已确认**）。
   - 逐模块：`sidepanel.ts +1,508` / `providers.ts +2,033` / `registry.ts +237` / `ai-drive.ts +154` / `recommend.ts +139` / `definition.ts +94` / `ops.ts +58` / `op-table.ts +56`（Σ **+4,279** + glue **0**）。
   - B 列 `dist/background.js` 1,641,872 B（+5,251 B，**不计账**；`ai-next.ts` NEW + `service-worker.ts` + `ref-context.ts` + `chat-events.ts`）。
   - EC-ADN-016 三态：越生效上限 = 否 / 越档位 = 否 / 越绝对上限 = 否。
3. **`op.perm.request` 的 param 可达性**：见 ①。
4. **`params` 本轮不参与派发**（ADR-ADN-002 §③ 诚实登记）：仅作候选元数据。
5. **binding Chromium 门禁环境红**：见 §4（4 次隔离复跑，失败点漂移；保护段由 supersession 双绿）。
6. **X-ADN-1/X-7 台账骨架 / `no-supersession` 骨架**：属 W03 / TASK-ADN-127（留 R2）；本轮只做**机械可判**的台账登记（`ADN1-E-VOL-1` + 体积三值同源 + 叶段 scope/逐字删除面），以满足既有门禁「零删减登记」与「台账同源」判据。

---

## 6. 下一步

| 场景 | 操作 |
|------|------|
| R1 完成 | 运行 `@sddu-review specs-tree-adn-1-ai-next-produce-and-verify`（或直接进入 R2 执行 W03） |
| R2（W03） | `TASK-ADN-118~127`：升级 6 等价重锚 + S0''' 四支线双面 + `gate-integrity` 受审下界只增（`ai-next-candidate`）+ 体积叶1 终态重登记 + X-ADN 台账骨架 |

---

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建（ADN-1 R1 = W01+W02，TASK-ADN-101~117；SG-ADN-01/02 可行；npm test 1449→1463/0；体积中间登记 +4,279 B） | 2026-09-26 | SDDU Build Agent |
