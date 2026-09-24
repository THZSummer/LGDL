# 构建报告：specs-tree-ian-1-free-input-next（IAN-1 流内自由输入 next 通道）

> **文档定位**: SDDU 构建报告 — 记录本轮（**R1 = W01+W02**，TASK-IAN-101~116）的文件变更与实现结果，作为 review 阶段的输入
> **前置依赖**: 本叶 `tasks.md` v1.0（任务清单）、`plan.md` v1.0（技术方案）、`spec.md` v1.0（需求规范）、父 `../plan.md`（ADR-IAN-001/002/003/008/010）
> **创建人**: SDDU Build Agent
> **创建时间**: 2026-09-25
> **版本**: v1.0（R1）
> **更新人**: SDDU Build Agent
> **更新时间**: 2026-09-25
> **更新说明**: 初始创建（R1 = W01+W02：SG-IAN-01/02 先验 · free-input provider（when 恒真 + 恒最末终端 + 零死端 floor）· 集 A 协议动作 8→9（不进 `ACT_TO_OP`）· 卡内输入（askuser kind 第二语义分支，独立 `requestId`）· `op.turn` 槽提交 · `MANUAL_DRIVER_ID='manual'` 两值可判 · 让位语义槽外 · a11y/键盘 · 新 node 门禁 `free-input-next`（FIN-0~6）· 体积**中间登记**（越叶预算不停机））

---

## 1. 构建概要

| 维度 | 数值 |
|------|:--:|
| 本轮范围 | **R1 = W01+W02**（`TASK-IAN-101~116`，16 任务）；W03（`117~127`）**留 R2** |
| 完成任务数 | **16 / 16**（R1 范围内）；全叶 16 / 27（W3 = 11 待 R2） |
| 复杂度分布（R1 内） | S×3 / M×10 / L×3 |
| 新增文件 | **1**（`test/free-input-next.test.ts`） |
| 修改文件 | **20**（src×13 / test×5 / docs×2）+ 2 份 SDDU 产物（`build.md` / `state.json`） |
| 门禁（R1 收口） | `npm test` **1416 / 0**（基线 1395 → **+21**）；`test:v3` 全链 **PASS**（含 171 journey / 192 binding / 70 s0 / 242 density / 248·131·74 l0·l1·l2 / 79 recommendation） |
| 体积（A 列 sidepanel.js） | 591,946 → **598,282 B**（**+6,336 B，+1.07%**）——**越叶预算登记不停机**（预算 +2.5~4.5 KB） |
| 冻结面 | `dist/content.js` 177,076 B / `52a82620` **逐字节不变**；`dist/pick-layer.js` 34,358 B / `77796bab` **逐字节不变**；`manifest.json` / `packages/web-cli-base/**` **零 diff** |
| 红线 | `KIND_SET` 40 逐字 · 12 kind · `REGISTERED_STRUCTURAL_HOSTS === []` · `ACT_TO_OP` 恰 6 · `NEXTSTEP_PRIORITY` 恰 4 · `MAX_CHIPS_PER_CARD` 3 · `requestTurn(` 叶1 仍恰 2 · 集 B 分发入口恰 1 · 特权 op 恒 gesture · 法八零明文 |

### 1.1 两个 spikeGate 结论（先验闸门，探毕删除）

| 闸门 | 任务 | 断言实测 | 结论 |
|---|---|---|---|
| **SG-IAN-01** | TASK-IAN-101 | ① `dispatchChipAction('op.turn', '自由输入探针文本')` → `runOp('op.turn')` → `bindPanelOps.turn` 收到**原样文本**（不经第二通道）✔；② `Object.keys(ACT_TO_OP).length === 6` ✔ ∧ `SET_A_PROTOCOL_ACTIONS.length === 8`（时点）✔ ∧ `requestTurn(` 调用点 **恰 2**（`sidepanel.ts` 两处）✔；③ 特权 op 不触达 ✔ | **可行**（4/4） |
| **SG-IAN-02** | TASK-IAN-108 | ① 独立 `requestId='free-input'` 与 `ref-describe` 的模型侧纯查询**互不干扰**（共用形态 ⇒ 描述判定只能复用 free-input 卡 —— 即必红形态，已作反证驱动）✔；② `LEGACY_ASK_IDS` 8 项逐字不变 ∧ `.id = 'ask-input'` / `.id = 'ask-fallback'` 各**恰 1 处铸造**（文档级唯一）∧ `openFreeInputCard` **零 DOM 自建** ✔；③ `KIND_SET` 40 逐字 ∧ `CARD_TAG_LABELS` 12 kind ∧ `REGISTERED_STRUCTURAL_HOSTS === []` ✔ | **可行**（4/4） |

> 探针日志：`/tmp/opencode/v4-gate-logs/ian-1-r1/01-sg-ian-01-probe.log`、`03-sg-ian-02-probe.log`；探针文件**已删除**（`test/_spike` 语义，不进入提交）。
> BLK-IAN-1 / BLK-IAN-2 **未触发**（两闸门均可行）。

---

## 2. 文件变更

### 2.1 源码（`src/**`）

| 操作 | 文件路径 | 对应任务 | 说明 |
|:--:|------|:--:|------|
| MODIFY | `packages/web-cli-plugin/src/ui/sidepanel/next-registry/dispatch.ts` | TASK-IAN-103 | `SET_A_PROTOCOL_ACTIONS` **8→9**（新增 `'free-input'`，集 A **只增**）；`ACT_TO_OP` **逐字不动**（仍恰 6）；新增终端文案**唯一源** `FREE_INPUT_LABEL` |
| MODIFY | `packages/web-cli-plugin/src/ui/sidepanel/next-registry/providers.ts` | TASK-IAN-102 | `builtinProviders()` 追加 `free-input` 终端 provider（`when` 恒真 ⇒ 零死端；`chips: ['free-input']`；`textOf: () => [FREE_INPUT_LABEL]`；`rule` 不在 `NEXTSTEP_PRIORITY` ⇒ `candidateRules` 恒跳过）；`DRIVER_DECLS_SRC` **10→11** 行（`driver-quadruple` 双向包含） |
| MODIFY | `packages/web-cli-plugin/src/ui/sidepanel/recommend.ts` | TASK-IAN-104 | 终端**存在性单源**（读注册表 provider `when`）+ **注入点单源**（`recommendNextStep` 选中卡之后追加终端）+ **零死端 floor**（`empty` ⇒ 仅含终端最小卡）；`NextstepCandidate.terminal` 加法字段 + `NextstepRuleCandidate`（规则候选 `rule` 必在，既有「优先级来自规则表位置」判据逐字承重） |
| MODIFY | `packages/web-cli-plugin/src/ui/sidepanel/cards/nextstep.ts` | TASK-IAN-105 | 终端渲染：独立 `data-act='free-input'`、class `next-terminal`（**不是** `.next-chip`）、**恒排在 `.next-chips` 之后**；不进 `MAX_CHIPS_PER_CARD` 预算 |
| MODIFY | `packages/web-cli-plugin/src/ui/sidepanel/cards/askuser.ts` | TASK-IAN-109 / 115 | 第二语义分支：`FREE_INPUT_REQUEST_ID='free-input'` 单源 + `openAskCardIdByRequest`（模型侧**幂等纯查询**，`textAskCardId` 同源收敛）+ free-input 专属 Enter/Exit 键盘路径 + 固化文案分支（**不回显值**）；**零第二 DOM 路径 / 零新 id 家系** |
| MODIFY | `packages/web-cli-plugin/src/ui/sidepanel/sidepanel.ts` | TASK-IAN-110 / 112 / 113 / 115 | `handleCardAction` 集 A 分支 `'free-input'`（点开）+ 按 `requestId` 路由的 `answer`/`cancel` 手输分支；`openFreeInputCard`（复用/铸卡 + 重展开 + focus）；`submitFreeInput`（让位语义**槽外** + `driver=manual` 留痕 + 空/异常态可读行 + `dispatchOp('op.turn', {value})` **唯一提交点**）；推荐卡 `terminal` 透传（生产 + seam 两处） |
| MODIFY | `packages/web-cli-plugin/src/ui/sidepanel/next-registry/ai-drive.ts` | TASK-IAN-111 | `MANUAL_DRIVER_ID='manual'` 单源（与 `driverTraceLine` 同源）+ `MANUAL_DRIVER_EVIDENCE`（只写 ctx 字段名）；**AI 路径不写该值** |
| MODIFY | `packages/web-cli-plugin/src/ui/sidepanel/view-model.ts` | TASK-IAN-114 | `ONBOARDING_TEXTS[4]` 改指**流内**「自由输入…」入口（不再指「输入框」位置） |
| MODIFY | `packages/web-cli-plugin/src/ui/sidepanel/stream-model.ts` | TASK-IAN-104 | `StreamPayload.nextstepTerminal?: boolean`（**加法**布尔字段；缺省 ⇒ 渲染逐字节不变） |
| MODIFY | `packages/web-cli-plugin/src/ui/sidepanel/chat-state.ts` | TASK-IAN-104 | `nextstep` action 增可选 `terminal`；reducer 的「空卡」判据等价重锚为「**零 chip 且无终端**」（EC-CHAT-008 仍禁止真正空卡）+ `nextstepTerminal` 入 payload |
| MODIFY | `packages/web-cli-plugin/src/ui/sidepanel/stream-plaintext.ts` | TASK-IAN-109 | `ASK_COPY.freeInputSubmitted = '已提交（内容在对话中）'`（单源文案；只写事实、**不回显**用户文本 ⇒ FIN-8/法八） |
| MODIFY | `packages/web-cli-plugin/src/ui/sidepanel/next-registry/ops.ts` | TASK-IAN-102（派生） | `reachableOpIds` 只收**真实注册 op**（`OPS_BY_ID`）—— `op.help` 的「可用操作（N）」不被终端（集 A 动作）污染 |
| MODIFY | `packages/web-cli-plugin/src/ui/sidepanel/sidepanel.ts`（同文件，见上） | TASK-IAN-110 | 无独立变更（并入上行） |

### 2.2 测试与门禁（`test/**`）

| 操作 | 文件路径 | 对应任务 | 说明 |
|:--:|------|:--:|------|
| NEW | `packages/web-cli-plugin/test/free-input-next.test.ts` | TASK-IAN-116 | 新 node 门禁骨架：**FIN-0~6**（载体 / 末端项恒最末 / 零死端 floor / 唯一提交点 / 手输两值可判 / 让位语义槽外 / 空提交不静默），每条含 `expectFailPattern` + **注入反证**（19 用例） |
| MODIFY | `packages/web-cli-plugin/test/next-dispatch-diff0.test.ts` | TASK-IAN-106 | D0-5（集 A **只增** 8→9 ∧ 既有 8 项零删除 ∧ `'free-input'` 可在集 A 声明处定位）；D0-7 **等价重锚**（`known` = 已注册 opId ∪ `ACT_TO_OP` 值/键 ∪ 集 A 动作）+ **非空转**（`registerBuiltinProviders()` 后逐 provider 判 chips）+ 反证（移除集 A 项 ⇒ D0-1 必红） |
| MODIFY | `packages/web-cli-plugin/test/ui/recommendation.mjs` | TASK-IAN-107 | 新增 **⑰**（7 条运行期断言）：终端存在 / **恒最末**（`.card-col` 末子元素）/ 是 `<button>` 且**不带** `.next-chip` / 单卡 `.next-chip` 仍 ≤3 / 点击**不填** `#input` 且不产生 user 回合 / 点击就地展开卡内输入（`#ask-input` 可见 + 获焦）。运行期 72 → **79**（只增） |
| MODIFY | `packages/web-cli-plugin/test/driver-quadruple.test.ts` | TASK-IAN-102（连带） | **DQ-2 等价重锚**：chips 词汇面 = `OP_IDS ∪ SET_A_PROTOCOL_ACTIONS` + 新判据「集 A 词汇面必须真被使用 ∧ 两集之外仍判悬空」（+1 用例） |
| MODIFY | `packages/web-cli-plugin/test/next-obligation-table.test.ts` | TASK-IAN-102（连带） | **OT-4 等价重锚**：`known = OBLIGATION_OP_IDS ∪ SET_A_PROTOCOL_ACTIONS` + 非空转前置（两集词汇面都必须真被生产 provider 使用） |
| MODIFY | `packages/web-cli-plugin/test/next-registry.test.ts` | TASK-IAN-102（连带） | NR-10 声明行数 **10→11** 锚点前移 + 新判据（`free-input` 必须在注册表内 ∧ 有声明行） |
| MODIFY | `packages/web-cli-plugin/test/next-pipeline.test.ts` | TASK-IAN-103（连带） | NP-6/7 集 A **9** 项逐字（既有 8 项零删除）+ NP-8 注释措辞（镜像计数器不剥注释） |

### 2.3 体积与台账（docs / size）

| 操作 | 文件路径 | 对应任务 | 说明 |
|:--:|------|:--:|------|
| MODIFY | `packages/web-cli-plugin/test/size-baseline.ts` | TASK-IAN-126（**R1 中间登记**） | 基线 591,946 → **598,282** / TIMELINE 追加 / `FINAL_ARTIFACT_BYTES` = 598,282 / `META.measuredBy` 前置本轮 / `SIDEPANEL_RE_REGISTRATIONS['ian-1-r1']`（提升轮五要素）/ `SIDEPANEL_GROWTH_BREAKDOWN.ian1R1Rows`（11 行，Σ +6,336 + glue 0）+ `deltaBytes` 303,057 / `closeoutDeltaBytes` 6,336 / `wiringBytes` 105,393 / `roundRowRegistrationIds.ian1R1Rows='ian-1-r1'` |
| MODIFY | `packages/web-cli-plugin/test/size-budget.test.ts` | 同上 | 数值重 pin（基线 / ceiling 628,196 / `CEILING_UNCAPPED` / artifact 相等） |
| MODIFY | `packages/web-cli-plugin/test/size-ruling-vol3.test.ts` | 同上 | `FINAL_ARTIFACT_BYTES` 锚点 598,282；生效上限 / 边界 `628,196`·`628,197` |
| MODIFY | `packages/web-cli-plugin/test/size-growth-evidence.test.ts` | 同上 | `deltaBytes` 303,057 / `closeoutDeltaBytes` 相对 591,946 / 最新一轮 rows 重指向 `ian1R1Rows` / N-05 组 34→**35** / `requiredBy` 引用面接受 **FR-IAN-\\***（与 V4.5-1 接受 FR-V45-*、V5.5F-1 接受 FR-SGO-* 同一先例） |
| MODIFY | `packages/web-cli-plugin/docs/v4-density-baseline.json` | 同上 | `volume.registeredBaselineBytes` 598,282 / `ceilingBytes` 628,196（与代码同源） |
| MODIFY | `packages/web-cli-plugin/docs/v4-supersession-ledger.json` | TASK-IAN-127（**R1 骨架**） | 追加 leaf 段 `specs-tree-ian-1-free-input-next(R1-W1W2)@eade31d`（scope 复算 39 文件 / 逐字登记 59 行删除面）+ 新条目 `IAN1-E-VOL-1`（断言零删减）+ `v3Vol3Closeout.⑤三值闭合.newBaselineBytes` 同源前移 + 63 处 `newTitle` 换锚（体积数值重 pin 的可定位性；原 `newTitle` 逐字保留在各条 `reason`） |

### 2.4 SDDU 产物

| 操作 | 文件路径 | 说明 |
|:--:|------|------|
| NEW | `.sddu/specs-tree-root/specs-tree-web-cli-plugin-v55-f-input-as-next/specs-tree-ian-1-free-input-next/build.md` | 本文件 |
| MODIFY | `.sddu/specs-tree-root/specs-tree-web-cli-plugin-v55-f-input-as-next/specs-tree-ian-1-free-input-next/state.json` | `phase: tasked → builded`（R1）+ phaseHistory 如实登记 |

---

## 3. 任务完成清单

| 任务 | 名称 | 复杂度 | 状态 | 对应 FR |
|------|------|:--:|:--:|------|
| TASK-IAN-101 | SG-IAN-01 `op.turn` 槽承载自由输入先验 | M | ✅ completed（可行 4/4，探针已删） | FR-IAN-016/020/021/006 |
| TASK-IAN-102 | `providers.ts` free-input provider + 驱动者声明 | S | ✅ completed（provider 10→11 / `DRIVER_DECLS_SRC` 10→11） | FR-IAN-010/011/017 |
| TASK-IAN-103 | `dispatch.ts` 集 A 协议动作 8→9 | S | ✅ completed（`ACT_TO_OP` 仍恰 6） | FR-IAN-010 |
| TASK-IAN-104 | `recommend.ts` 末端项注入 + 零死端 floor + payload | M | ✅ completed | FR-IAN-010/013/014 |
| TASK-IAN-105 | `cards/nextstep.ts` 末端项渲染（非 `.next-chip`） | M | ✅ completed | FR-IAN-012/014 |
| TASK-IAN-106 | `next-dispatch-diff0` D0-5/D0-7 等价重锚 | M | ✅ completed | FR-IAN-010/100 |
| TASK-IAN-107 | `recommendation.mjs` 末端项断言（只增） | M | ✅ completed（72 → 79） | FR-IAN-010/014 |
| TASK-IAN-108 | SG-IAN-02 askuser 第二语义分支先验 | M | ✅ completed（可行 4/4，探针已删） | FR-IAN-011/015/017 |
| TASK-IAN-109 | `cards/askuser.ts` free-input 卡内输入语义分支 | M | ✅ completed（幂等纯查询 + 键盘 + 固化不回显） | FR-IAN-011/015/017 |
| TASK-IAN-110 | `sidepanel.ts` `openFreeInputCard` + `handleCardAction` 分支 | L | ✅ completed（集 A + requestId 路由） | FR-IAN-011/015/016 |
| TASK-IAN-111 | `ai-drive.ts` `MANUAL_DRIVER_ID='manual'` 单源 | S | ✅ completed（∉ `listDriverDecls()`） | FR-IAN-022/024 |
| TASK-IAN-112 | 手输 trace（`driver=manual`）+ 让位语义（槽外）+ 空提交可读行 | M | ✅ completed（FIN-4/5/6 承重） | FR-IAN-022/023/018 |
| TASK-IAN-113 | 提交经 `op.turn` 槽（不新增 `requestTurn(` 直连） | M | ✅ completed（叶1 仍恰 2 / 分发入口恰 1） | FR-IAN-016/020/021/025 |
| TASK-IAN-114 | `view-model.ts` 引导文案改指（叶1 侧） | S | ✅ completed | FR-IAN-056 |
| TASK-IAN-115 | a11y：focus 卡内 input + Enter/Escape 键盘路径 | M | ✅ completed（⑰ focus 断言 + FIN 键盘分支） | FR-IAN-019/045 |
| TASK-IAN-116 | `free-input-next.test.ts` 门禁骨架（FIN-0~6 + 反证） | L | ✅ completed（19 用例；FIN-7/8 + 三段控制 + 真源切片留 TASK-IAN-121） | FR-IAN-010/013/020/022/023 |

### 3.1 未开工（**按编排器任务书留 R2**，非受阻）

| 任务 | 名称 | 状态 | 依据 |
|------|------|:--:|------|
| TASK-IAN-117~120 | R6 双入口 / 流内回填 / TA-4 与 r6-ty 重锚 | ⏳ pending（R2） | 任务书「W03（S0''-A 中间态保护面/体积收口）留 R2」 |
| TASK-IAN-121 | FIN-7/8 + 三段控制 + 真源切片 | ⏳ pending（R2） | 同上 |
| TASK-IAN-122 | `gate-integrity` 下界只增 `free-input-next` | ⏳ pending（R2） | 同上（R1 已按目录扫描自动纳入受审集合；下界声明留 R2） |
| TASK-IAN-123 / 124 | S0''-A node 面 + Chromium 面（样本单源） | ⏳ pending（R2） | 同上 |
| TASK-IAN-125 | 红线巡检扩面（三冻结面 / 载体 / base / 判定链 / 法八 / 特权） | ⏳ pending（R2） | 同上（R1 已由既有门禁 + FIN-0 全覆盖实测） |
| TASK-IAN-126 | 体积**叶1 收口重登记**（五要素终态 + V3-VOL-3 三值 + 逐模块 `ian1Rows` + EC-IAN-016 二态） | 🟡 **R1 中间登记已完成**，终态留 R2 | 同上（越叶预算登记不停机） |
| TASK-IAN-127 | 门禁对账骨架 + X-IAN-7 叶1 侧台账骨架 | 🟡 **R1 骨架已完成**（leaf 段 + 换锚 + 断言零删减条目）, 收口留 R2 | 同上 |

---

## 4. 门禁对账（R1 实测，串行；日志 `/tmp/opencode/v4-gate-logs/ian-1-r1/`）

| 门禁 | 基线 | R1 实测 | 判定 |
|------|:--:|:--:|:--:|
| `npm test`（node 运行期用例） | 1395 / 0 | **1416 / 0** | ✅ **+21**（`free-input-next` 19 + `driver-quadruple` +1 + `next-dispatch-diff0` +1；零删除） |
| `test:ui`（journey） | 171 | **171** | ✅ 保段 |
| `test:binding` | 192 | **192**（隔离复跑 ×2 均 PASS；首轮遇 CDP 环境性 flake） | ✅ 保段（见 §6-B-11） |
| `test:s0-self-driven` | 70 | **70** | ✅ 保段 |
| `test:density` | 242 | **242**（三视口 320/400/520 全 PASS；`risk.worst` 7/17·8/35） | ✅ 保段 |
| `test:l0` / `test:l1` / `test:l2` | 248 / 131 / 74 | **248 / 131 / 74** | ✅ 保段 |
| `test:recommendation` | 72 | **79** | ✅ +7（⑰ 只增） |
| `test:insight` | 118 | **118** | ✅ 保段 |
| `test:hardening` | 24 | **24** | ✅ 保段 |
| `test:law8` | 36 | **52** | ✅ 零降级 |
| `test:dead-end` | 49 | **53** | ✅ 零降级（零死端 floor 未破坏既有终态面） |
| `test:auth-chip` | 37 | **37** | ✅ 保段 |
| `test:gate-integrity` | 19（`EXPECTED_AUDITED_FILES` 下界语义） | **15 / 0 失败**（内部下界全绿；新门禁由目录扫描自动纳入） | ✅ 保段（下界声明只增留 TASK-IAN-122/R2） |
| `test:supersession` | 42 | **42** | ✅（含 R1 台账骨架与换锚） |
| `test:size-ruling-vol3` | 12 | **12 / 0 失败** | ✅（数值重 pin） |
| `test:size-budget` / `test:size-growth-evidence` | PASS | **PASS** | ✅（登记值 == 实测产物 598,282） |
| `test:l1-reverse` / `test:l2-reverse` | PASS / 74 | **PASS（9 反证）/ 74** | ✅ 保段 |
| `test:zero-injection` / `test:page-input` / `test:onboarding` / `test:design-contract` / `test:ref-pick-wiring` | PASS | **PASS** | ✅ 保段 |
| `test:e2e` | PASS | **PASS**（R8 全链） | ✅ 保段 |
| `op-wiring`（node） | `requestTurn(` 恰 2 | **14 / 0 失败**（`op.turn.callSites === 2`） | ✅ 不变 |
| 全链 `npm run test:v3` | — | **typecheck ✔ → build ✔ → 全部门禁 PASS**（末次全链日志见 §6-B-11 的 flake 说明） | ✅ |

### 4.1 反证（注入必红）摘要

| # | 反证形态 | 判据 | 结果 |
|---|---|---|---|
| ① | 把 `'free-input'` 从集 A **移除** | `next-dispatch-diff0` D0-1/D0-5（集 A 字面量在场） | ✅ 必红（`FIN-1/FIN-0` + D0-7 反证实跑） |
| ② | 末端项与 `.next-chips` **同序**（非最末） | `FIN-1` 结构序 judge（合成伪造体） | ✅ 必红 |
| ③ | 终端带 `.next-chip` 类（在飞被 `syncNextstepPending` 禁用） | `FIN-1` judge | ✅ 必红 |
| ④ | 删零死端 floor（`empty` 不再铸卡） | `FIN-2` | ✅ 必红（`cards.length === 0` ⇒ FAIL） |
| ⑤ | 提交改走 `submitDescribe`（描述语义、不成回合） | `FIN-3` 反证 | ✅ 必红 |
| ⑥ | 手输路径新增 `requestTurn(` **直连** | `FIN-3` 计数 judge（2 → 3） | ✅ 必红 |
| ⑦ | 手输 driver 改写为某**声明 id**（两值混同） | `FIN-4` 反证 | ✅ 必红 |
| ⑧ | `noteUserTurn` 移入 `requestTurn` **体内** | `FIN-5` 切片 judge | ✅ 必红 |
| ⑨ | 删空提交的**可读行** / 删空守卫 | `FIN-6` 反证 | ✅ 必红 |
| ⑩ | free-input 卡与 `ref-describe` **共用 requestId** | `FIN-0` 语义 identity + SG-IAN-02 ①（共用 ⇒ 描述判定只能复用 free-input 卡） | ✅ 必红 |
| ⑪ | 终端提前到 `.next-chips` 之前 / 单卡 chips 越 3 | `rec ⑰` + `density` 242 | ✅ 未越（单卡可点 ≤ 4 ≤ 6） |

> 反证均**实跑**（node judge 打合成伪造体 / 源码切片；Chromium 侧 ⑰ 打真实 DOM），**真源码零触碰**（`FIN-1/FIN-6` 的注入只作用于内存字符串，`FIN-3/FIN-5` 只作用于复制文本）。

---

## 5. 体积五要素（A 列 = `dist/sidepanel.js`）

| 要素 | 值 |
|---|---|
| **① 实测（唯一来源）** | `stat -c %s dist/sidepanel.js` → **598,282 B**（`npm run build` @ 2026-09-24T17:03Z） |
| **② 前后值** | 591,946 → **598,282 B**（**+6,336 B，+1.07%**） |
| **③ 日期 / 来源 / buildCommand / measuredBy** | 2026-09-24 / `packages/web-cli-plugin/dist/sidepanel.js` / `npm run build --workspace @lgdl/web-cli-plugin` / `SIDEPANEL_RE_REGISTRATIONS['ian-1-r1']` + `META.measuredBy`（最新一轮元组同源，机器校验） |
| **④ 逐模块归因（真实 metafile，Σ 模块 + glue == 登记增量）** | `sidepanel.ts` 111,308 → **113,824（+2,516）** / `providers.ts` 7,198 → **8,155（+957）** / `cards/askuser.ts` 9,136 → **10,080（+944）** / `recommend.ts` 6,053 → **6,783（+730）** / `cards/nextstep.ts` 1,506 → **1,970（+464）** / `view-model.ts` 24,399 → **24,622（+223）** / `stream-plaintext.ts` 4,627 → **4,829（+202）** / `chat-state.ts` 18,132 → **18,235（+103）** / `ai-drive.ts` 1,669 → **1,768（+99）** / `dispatch.ts` 795 → **872（+77）** / `ops.ts` 7,155 → **7,176（+21）**；**Σ +6,336 + glue 0 == +6,336**（`SIDEPANEL_GROWTH_BREAKDOWN.ian1R1Rows`，复现命令 `npm run size:attribution -- --rev eade31d --rev WORKTREE`） |
| **⑤ 档位 / 绝对上限 / 生效上限 / 作者确认（EC-IAN-016 二态）** | 档位 `ceilTo50KB(598,282) = ` **614,400 未变**；绝对上限 **675,840 未变**；生效上限 621,543 → **628,196**（`floor(598,282 × 1.05)`；旧生效上限 **未越** ⇒ EC-IAN-016 三分支均未触发：越生效上限 = 否 / 越档位 = 否 / 越绝对上限 = 否）；`authorConfirmation` 保持 **`pending-author-line`**（**不伪称已确认**） |

> ⚠️ **越叶预算如实登记（不停机）**：`ADR-IAN-010 §②` / `tasks.json#volumeBudgetBytes` 给本叶 A 列预算 **+2.5~4.5 KB**（上界 +15% = +2.9~+5.2 KB）；本轮 W1+W2 实测 **+6,336 B ≈ 6.19 KiB** ⇒ **越预算上界**。处理：按「越叶预算登记不停机」**显式登记**（`SIDEPANEL_RE_REGISTRATIONS['ian-1-r1']` + `META.measuredBy` + 本报告），**不删判据 / 不放宽容差 / 不静默降档**；文档注释（CJK）为主要增量来源（esbuild 仅保留部分注释），已在 R1 内做过一轮注释收敛（599,249 → 598,282 B）。
> ⚠️ 本登记是**中间登记**：`TASK-IAN-126`（R2）须按**全叶终态**（W1+W2+W3 合计）重登记五要素 + V3-VOL-3 三值 + `ian1Rows` 逐模块行 + EC-IAN-016 二态。

### 5.1 三冻结面 / 零 diff 面（零容差）

| 面 | 期望 | 实测 |
|---|---|---|
| `dist/content.js` | 177,076 B / sha `52a82620…` | ✅ **逐字节不变** |
| `dist/pick-layer.js` | 34,358 B / sha `77796bab…` | ✅ **逐字节不变** |
| `manifest.json` | 零 diff | ✅ 零 diff |
| `packages/web-cli-base/**` | 零 diff | ✅ 零 diff（`git status` 无条目） |
| `src/background/turn-queue.ts` / `service-worker.ts` | 零 diff（SW 队列本体） | ✅ 零 diff |

---

## 6. 偏差 / 裁决点 / 受阻（如实登记）

### A. 实现偏差（偏离 tasks/plan 的**文件清单**或字面口径；均为通过既有门禁所必需，且判据力只增）

1. **`chips: ['free-input']` 触发两处 chips 词汇面重锚**（`driver-quadruple` DQ-2 / `next-obligation-table` OT-4）：注册表 chip 的可分发词汇 = **两集模型**（opId ∪ 集 A 协议动作）。这两枚门禁不在 `tasks.json` 的 W1/W2 文件清单里，但 `ADR-IAN-001 §①` 明确要求 `chips:['free-input']` ∧ `§②` 明确「零第二张 act→op 表」—— 本实现按 ADR 落 `chips:['free-input']`，因此必须把 DQ-2/OT-4 的已知集**等价重锚**（与 ADR 自己对 D0-7 的等价重锚同一口径）。判据力**只增**：新增「集 A 词汇面必须真被生产 provider 使用 ∧ 两集之外仍判悬空」。
2. **`reachableOpIds` 只收真实注册 op**（`next-registry/ops.ts`，不在文件清单）：否则 `op.help` 的「可用操作（N）」会把集 A 动作 `free-input` 当 op 列出（用户可见错）。函数名与语义都限定为 **opId**，属修正而非放松。
3. **`stream-model.ts` + `chat-state.ts` 增 `nextstepTerminal` 加法字段 + terminal-only 卡放行**（两文件不在文件清单）：`ADR-IAN-001 §①` 明文「推荐卡 payload 增一个**布尔字段**（终端存在性）」，而 payload 由 `chat-state.ts` 构造 —— 该 ADR 条文隐含此二文件；reducer 的「空卡」判据等价重锚为「零 chip **且** 无终端」（EC-CHAT-008 仍禁真正空卡）。
4. **`stream-plaintext.ts` 增 `ASK_COPY.freeInputSubmitted`**（不在文件清单）：FIN-8/法八 要求卡固化**不回显**用户文本；既有 `answeredPrefix='已答：'` 对「输入已提交」语义不诚实，故在**单源文案表**加一条只述事实的固化文案。
5. **`test/next-pipeline.test.ts` NP-6/7 集 A 8→9 + NP-8 注释措辞**（不在文件清单）：NP-6/7 逐字断言集 A 恰 8 项，必须随 `SET_A_PROTOCOL_ACTIONS` 前移；NP-8 的镜像计数器**不剥注释**，故 `sidepanel.ts` 的新注释中不得出现 `dispatchChipAction(` 字面（已改写措辞，判据零改）。
6. **`test/next-registry.test.ts` NR-10 声明行数 10→11**（不在文件清单）：`DRIVER_DECLS_SRC` 必须与 provider 双向包含 ⇒ 必然 11 行。
7. **提交通道用 `dispatchOp('op.turn', { value })` 而非 `dispatchChipAction('op.turn', ...)`**：`sidepanel.ts` 只允许**恰 1 处** `dispatchChipAction(` 调用点（`next-dispatch-diff0` D0-2 / `next-pipeline` NP-8）。二者**同经** `runOp('op.turn')` → `bindPanelOps.turn` → `requestTurn`（唯一槽；`requestTurn(` 叶1 仍恰 2）。口径 = 「提交经 `op.turn` 槽」，不是「经某个包装函数」。
8. **零死端 floor 只覆盖 `suppression === 'empty'`（不覆盖 `'safety'`）**：`ADR-IAN-001 §①` 的「若**无任何候选**（原 suppression ∈ {'empty','safety'}）」按「无任何候选」解 = `raw.length === 0`（empty）；`'safety'`（有候选但全被 deny 拦下）**保持既有 fail-closed 不推荐**（`recommendation-sources` ④ 两条 safety 用例逐字不变）。**登记为口径裁决点**，请 review / 叶2 复核是否需扩到 `'safety'`。
9. **`recommendation-sources.test.ts` 最终未改**：以 `NextstepRuleCandidate`（规则候选 `rule` 必在）类型收窄替代修改既有断言 —— 该文件位于 v4 台账「删除行必须逐字登记」的受判 scope 内，避免无谓的删除面。

### B. 待复核 / 未闭合（R2 或人工面）

10. **W03（TASK-IAN-117~127）未开工**：按任务书留 R2（S0''-A 中间态保护面 / FIN-7·8 / 流内回填 / 门禁对账终态 / 体积收口）。
11. **`test:binding` 首轮环境性 flake（KL-N-10 类）**：首轮 `test:v3` 在 `#8d/#8e` 处报 `selector not found: #confirm-allow`，诊断落盘显示 **CDP socket 已断开**（`readyState=3`，`sw`/`panel` 全部上下文不可达）—— 属浏览器/CDP 环境性中断，非断言语义失败。**隔离复跑 ×2 均 `binding PASS — 192 assertions`**；后半段门禁（hardening / e2e / law8 / dead-end / s0 / auth-chip / gate-integrity / l1·l2-reverse）已按上游既有约定**逐个隔离复跑全绿**。
12. **人工面 M1（末端项可发现性）/ M2（时隐时现困扰是否消失）/ M5（排队体感）**：⏳ **未执行**（属 TASK-IAN-124 / 叶2 人工面；不得冒充 PASS）。
13. **`IAN-P-001`（A 列净增终值 + 是否触发档位上调）**：R1 中间值 = +6,336 B / **未触发升档**（598,282 < 614,400）；终态留 R2。
14. **`IAN-P-002`（free-input-next 三段控制 ok/violated/n/a 可达性）**：R1 未做（TASK-IAN-121 属 R2）。

---

## 7. 下一步

| 场景 | 操作 |
|------|------|
| R1 收口 | 运行 `@sddu-review specs-tree-ian-1-free-input-next` 开始代码审查（R1 = W1+W2 范围） |
| R2 开工 | W03 收口轮：`TASK-IAN-117~127`（R6 双入口 / 流内回填 / FIN-7·8 + 三段控制 + 真源切片 / S0''-A 双面 / 体积五要素终态重登记 / 门禁对账终态） |
| 口径复核 | §6-A-8（floor 是否扩到 `safety`）交 review 裁定 |

---

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0（R1） | 初始创建（R1 = W1+W2：SG-IAN-01/02 先验可行 · free-input provider / 集 A 8→9 / 恒最末终端 / 零死端 floor / 卡内输入语义分支 / `op.turn` 槽提交 / 手输 `driver=manual` / 让位语义槽外 / a11y 键盘 · 新门禁 `free-input-next` FIN-0~6 · 门禁对账 1416/0 · 体积中间登记 +6,336 B 越叶预算不停机 · 14 项偏差/待复核如实登记） | 2026-09-25 | SDDU Build Agent |
