# ADR-IAN-001: 流内「自由输入…」next 面形态（provider + 恒最末终端 + `data-act` 命名 + 零死端）

## 状态
ACCEPTED（裁决 PD-IAN-001 / PD-IAN-004 / PD-IAN-005；承父 spec FR-IAN-010~014 / DC-IAN-002）

## 背景

父规范 §5.2 要求：存在一个**流内** next 选项「自由输入…」，是**推荐区按需最末项**（与「其他…（我来描述）」同构），**不常驻**、**零新增 kind**、**恒可达**（含无其他候选时），点击后**就地展开卡内输入**。四条开放点留给 plan：

- **PD-IAN-001**：触发的精确候选集合（何时出现 / 与其它 provider 的产出次序 / 顺序抑制）；
- **PD-IAN-004**：与「其他…（我来描述）」同卡并存时的互斥披露口径（谁是末项）；
- **PD-IAN-005**：是否需新 `data-act` 名（须满足「不新增 kind」前提）。

**只读事实（本轮实测，`feature/web-cli-plugin` @ `a14aa19`）**：

| 面 | 事实 | 位置 |
|---|---|---|
| 推荐生产者 | `recommendNextStep` 最多产出 **1** 张卡（`MAX_NEXTSTEP_CARDS_PER_ROUND = 1`，`sorted.slice(0, 1)`） | `recommend.ts:459` |
| 规则闭集 | `candidateRules` **只保留 `rule ∈ NEXTSTEP_PRIORITY`** 的候选（`seen` 去重一条规则一候选） | `recommend.ts:59,395-409` |
| 规则表 | `NEXTSTEP_PRIORITY = ['risk-recovery','ref-action','onboarding','capability-discovery']`（**恰 4**，门禁 `recommendation-sources.test.ts:139` 逐字断言） | `recommend.ts:60` |
| 卡渲染 | `createNextstepCard` 用 `payload.chips/nextstepActs`，`texts.slice(0, MAX_CHIPS_PER_CARD=3)`；chip 带 `data-act`，`data-op = ACT_TO_OP[act] ?? (op-prefixed)` | `cards/nextstep.ts:53-75` |
| 单源分发 | `ACT_TO_OP` **恰 6 行**（门禁 `next-dispatch-diff0.test.ts:307`）；两集互斥（集 A 协议动作 ∩ 集 B 动作 = ∅，`:302-313`）；`handleCardAction` 体**不得**出现集 B 字面量、**必须**含全部集 A 字面量（`D0-1`） | `dispatch.ts:11-46` / `sidepanel.ts:239-294` |
| 同构先例 | 「其他…（我来描述）」= **卡内终端项**（`card-more` 内 `data-key='ask-other'`，`aria-controls='ask-fallback'`），由**渲染器铸造**而非 provider 产出 | `cards/decision-region.ts:162-170` / `cards/askuser.ts:312-326` |
| 零候选 | `rules.length === 0 ⇒ 不产卡`（EC-CHAT-008「下一步：无」式假推荐禁止） | `recommend.ts:454-457` |
| 不常驻 | 默认屏可见输入框 = 0（法四静态半 + 运行时），`#composer` 默认 `hidden` | `density-thresholds.test.ts:411-416` |

**矛盾点**：若把「自由输入…」做成**独立的第 5 条 rule 候选**，因 `MAX_NEXTSTEP_CARDS_PER_ROUND = 1` 且按 priority 升序取首卡，它**永远不会被渲染**（除非无任何更高优先级规则命中）；若做成**每卡 chip 之一**，`MAX_CHIPS_PER_CARD = 3` 会与既有 provider 的 3 chips 争位。

## 决策

**① 形态 = 推荐卡末端的「终端项」（card terminal），存在性由新注册的 next provider `free-input` 单源决定。**

- 注册 `free-input` provider（`builtinProviders()` 追加一行 + `DRIVER_DECLS_SRC` 同步追加一条，满足 `driver-quadruple` 双向包含）。其 `when(ctx)` **恒真**（零死端）；`chips: ['free-input']`；`textOf: () => ['自由输入…']`。
- **不改 `NEXTSTEP_PRIORITY`**（仍恰 4 项；`'free-input'` 不作为独立 rule 候选）——避免「第 5 rule 永不渲染」死形态，也避免 `recommendation-sources.test.ts:139` 的规则表重锚。
- 注入点**单源** = `recommendNextStep`：当轮选中卡（`sorted[0]`）之后**追加** `free-input` 终端项；若**无任何候选**（原 `suppression ∈ {'empty','safety'}`）且 `!busy` 且间隔已过 ⇒ 铸造**仅含该终端**的最小推荐卡（EC-IAN-001 零死端）。`MAX_NEXTSTEP_CARDS_PER_ROUND = 1` 语义不变（仍 ≤1 卡）。
- **终端项不进 `MAX_CHIPS_PER_CARD` 预算**：`MAX_CHIPS_PER_CARD = 3` 逐字不动（只约束 provider chips）；终端以独立 `data-act` 铸造，单卡可点 = ≤3 chips + 1 终端 = **4 ≤ MAX_CLICKABLES_PER_CARD = 6**，首屏合计与密度阈值 **7/15 · 9/20 · 17/35 逐字不动**。
- **恒最末**：终端在卡片 DOM 中**恒排在 `.next-chips` 之后** ⇒ FR-IAN-014「最末项」可判（结构序 + 文本序双判据）。

**② `data-act = "free-input"` 是集 A 卡族协议动作（**只增** `SET_A_PROTOCOL_ACTIONS` 8→9），不进 `ACT_TO_OP`（仍恰 6 行）。**

- 点击不携 opId，由 `handleCardAction` 的集 A 分支处理（与 `choose-other` / `reanchor` / `hover` 同构）——**零第二 act→op 表**。
- **FR-IAN-010 的读法登记**：其验收举例「`data-act` 落在 `ACT_TO_OP` 单源」读作「**分发经唯一两集模型（集 A `handleCardAction` / 集 B `dispatchChipAction`），零第二张 act→op 表**」，而非字面要求该 act 必须出现在 `ACT_TO_OP` 的 6 行内（`choose-other` / `reanchor` / `hover` 三个既有集 A 动作同样不在 `ACT_TO_OP`，且 `D0-1` 明确要求它们在 `handleCardAction` 体内）。PD-IAN-005 已把「是否需新 act 名」显式留给 plan。
- 由此**不需要**新 op（NG-IAN-014 守）、**不需要**新 kind（NG-IAN-008 守）、`KIND_SET` 40 逐字不动。

**③ 与「其他…（我来描述）」的关系（PD-IAN-004 裁决）**：二者**属不同卡的终端**——`free-input` 属**推荐卡（`nextstep`）**，「其他…（我来描述）」属**问询卡（`askuser`/`auth`）的决策池**。故「同卡并存」形态不存在；同屏并存时**各自为其卡的末项**，互不争末位。渲染层不做互斥（无同卡冲突）；唯一的共同约束是**单卡可点 ≤6 / 流内可点 ≤8 / 密度阈值不动**（由既有密度门禁给上界，本 Feature 只**只增**断言）。

**④ 不常驻**：终端项本身是 `<button>`（chip / 选项），**不是输入框**；默认屏可见 `input/textarea/select/[contenteditable]` 计数仍 = 0（法四静态半 + 运行时双证）。

## 后果

- **正面**：形态与「其他…（我来描述）」同构（一个 face 一个 terminal），零新增 rule / op / kind；`MAX_CHIPS_PER_CARD` 与密度阈值零改；「恒最末 + 恒可达」由 `recommendNextStep` 单点保证 ⇒ 可判、可反证。
- **代价 / 登记的重锚**：
  - `next-dispatch-diff0.test.ts` D0-7（「四个内置 provider 的 chips 全部是可分发的 opId」）——`known` 集**等价重锚**为「opId ∪ `ACT_TO_OP` 值 ∪ `ACT_TO_OP` 键 ∪ 集 A 协议动作」；判据力**只增**（`'free-input'` 必须在集 A 声明处可定位，否则仍红）。
  - `next-registry`/`driver-quadruple`：provider 10 → 11 + 驱动者声明同步一条（双向包含 + 四元组 + timing ⊆ `DRIVER_TIMINGS` + evidence ⊆ `CTX_FIELD_SERVICE`）。
  - 推荐卡 payload 增一个**布尔字段**（终端存在性 = provider `when` 的产物；**不是新 kind**）。该字段是 `nextstep` payload 的**加法字段**，`KIND_SET` / 12 kind / `BIN_FROZEN_KINDS` 零改。
- **反证**：
  - 反证 ①：把 `free-input` 从 `SET_A_PROTOCOL_ACTIONS` 移除 ⇒ `D0-1`（集 A 字面量在场判据）必红；
  - 反证 ②：让终端与 `.next-chips` 同序（非最末）⇒ FIN-1「恒最末」必红；
  - 反证 ③：删零死端 floor ⇒ EC-IAN-001 场景（无其他候选）fin-input 不可达 ⇒ `free-input-next` FIN-2 必红；
  - 反证 ④：注入第 2 张推荐卡 ⇒ `MAX_NEXTSTEP_CARDS_PER_ROUND` 判据必红（未改，既有门禁继续承重）。

## 影响文件（预估）

| 操作 | 文件 | 说明 |
|:--:|---|---|
| MODIFY | `src/ui/sidepanel/next-registry/providers.ts` | `free-input` provider 行 + `DRIVER_DECLS_SRC` 一条（`chips:['free-input']`） |
| MODIFY | `src/ui/sidepanel/next-registry/dispatch.ts` | `SET_A_PROTOCOL_ACTIONS` +`'free-input'`（8→9）；`ACT_TO_OP` 逐字不动 |
| MODIFY | `src/ui/sidepanel/recommend.ts` | `recommendNextStep` 末项注入 + 零死端 floor（单源）；`NEXTSTEP_PRIORITY` 逐字不动 |
| MODIFY | `src/ui/sidepanel/cards/nextstep.ts` | 终端项渲染（`.next-chips` 之后，独立 `data-act`；不进 `.next-chip` 类 ⇒ 不被 pending 禁用） |
| MODIFY | `src/ui/sidepanel/sidepanel.ts` | `handleCardAction` 集 A 分支 `'free-input'`；payload 布尔字段透传 |
| MODIFY | `test/next-dispatch-diff0.test.ts` | D0-5 / D0-7 等价重锚（集 A 只增 + known 集扩张） |
| MODIFY | `test/recommendation.mjs` | 新增「末端项存在 + 不填输入 + 不越预算」断言（只增） |
