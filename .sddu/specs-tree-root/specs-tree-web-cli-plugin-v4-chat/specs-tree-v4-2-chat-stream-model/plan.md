# 技术计划：specs-tree-v4-2-chat-stream-model（V4-2 聊天流 append-only 事件模型与卡渲染）

> **文档定位**: SDDU 技术方案（叶子切片） — 本叶技术方案与 ADR；**权威跨叶契约见父 `../plan.md`**
> **前置依赖**: 父 `../spec.md` v1.0 + 父 `../plan.md` v1.0（ADR-V4-001~016）+ 本叶 `spec.md` v1.0 + **v4-1**（三区骨架 + `#stream` 容器 + 密度新口径基线 + 占位宿主）+ 设计契约 `option-f-shim.mjs`（60 断言）
> **创建人**: SDDU Plan Agent
> **创建时间**: 2026-09-18
> **版本**: v1.0
> **更新人**: SDDU Plan Agent
> **更新时间**: 2026-09-18
> **更新说明**: 初始创建（V4-2 叶子技术方案：不可变事件流 + 投影 + 增量渲染 + 7 主类 + 过程卡族 + 固化契约 + 摘要落库；ADR-V4-024~029）。**本阶段只做 plan**：不写 tasks、不写代码、不改 `src/**`·`test/**`·`dist/**`·`manifest.json`·ROADMAP、不动 `main`、不 commit/push、**不跑门禁 / 构建 / Chromium**

本叶 = v4 的**模型与渲染地基**：把流做成不可变、单调、可回放的 append-only 事件流，落 7 主类 + 过程卡族（5 形态）的渲染与统一固化契约，并把既有 5 种过程形态（工具卡 / 命令行 / 思考指示 / 错误条目 / 工具通知）**零丢失**归位。本叶**不依赖 SW 契约变更**（用既有 12 个 `dispatch` action 喂数据），是 v4-3 / v4-4 的共同地基。

---

## 1. 前置检查

| 检查项 | 状态 | 证据 / 说明 |
|--------|:--:|------|
| 父 `spec.md` / 父 `plan.md` / 本叶 `spec.md` 存在 | ✅ | 601 行 / 1,039 行 / 181 行 |
| v4-1 已落地（前置叶子） | ⚠️ **本阶段不可验证（plan 阶段）** | 本叶的技术方案**按 v4-1 契约编写**（`#stream` / `#region-*` / `DENSITY_EXCLUDED_SUBTREES` / 占位宿主 / 门禁基线）；实施顺序硬约束见 §2.5，tasks 阶段不得把本叶排在 v4-1 之前 |
| 设计契约可读 | ✅ | B1~B4（7 类卡 + 流挂载 + 富文本 + chips）· C1~C11（ask 结构 + 固化）· D1~D7（auth 两态）· E1~E5（系统事件 / 引用）· H1~H12（场景） |
| **外部 API 文档缓存** | ⚠️ **N/A（0 个外部服务 API）** | 同父 plan §1；**未调用任何受管 Provider** |
| 红线基线核对 | ✅ | `content.js` 177,076（无容差）/ `pick-layer.js` 33,900 / `KIND_SET`（`messaging.ts`）**本叶零 diff** |
| 本叶改动面自检 | ✅ | 侧栏侧模型 + 渲染层 + `test/**`；**SW / content / 判定链 / `KIND_SET` 零触碰** |

---

## 2. 架构分析

### 2.1 本叶切片（做 / 不做）

**做**：`StreamEvent` 不可变结构 + `streamReducer`（append-only / `seq` 单调 / 终态冻结）· `project()` 纯投影（确定性 ⇒ 回放等价）· **keyed 增量渲染**（append/patch/remove(bound)，永不清空）· 统一固化契约（`data-*` + `[hidden]` + `.ts` + `.card-fixed`）· 7 主类渲染骨架（`ai`/`user`/`system`/`ref`/`nextstep` 落实现；`askuser`/`auth` 落**渲染骨架与固化契约**，业务态归 v4-3）· 过程卡族 5 形态归位（`tool`/`command`/`thinking`/`error`/`notice`）· 工具卡字段保留（工具名 / `ok` / `ms` / 预览 / 折叠记忆 480B·10 行）· 会话切换不丢过程元数据 + 截断规则登记 · **摘要落库**（零明文白名单 + LRU + 降级重建）· 滚动（`scroll-policy` 48px）与 320px · 无障碍（`role=log` / 卡 `role` / `.ts` 可读 / `aria-live` / 收起 `hidden`）。

**不做**：ask/授权**业务逻辑**（choice/text 提交、批准/拒绝、60 s 超时、`supersededAsk`）→ v4-3；引用**判定/重锚业务**与系统事件**通道归并**与推荐**生产者** → v4-4；三区骨架与密度（v4-1）；体积绝对上限闭合（v4-4）；不改判定链 / 不新增权限 / 不碰 `src/content/**` / 不降级既有断言。

### 2.2 模型结构（`stream-model.ts`）

```ts
export type StreamEventKind =
  | 'ai' | 'user' | 'nextstep' | 'askuser' | 'auth' | 'system' | 'ref'   // 7 主类
  | 'tool' | 'command' | 'thinking' | 'error' | 'notice';                // 过程卡族（AI 族子形态）

export type StreamTerminal =
  | 'answered' | 'cancelled' | 'approved' | 'rejected' | 'invalidated' | 'completed';

export interface StreamEvent {
  readonly seq: number;        // 单调递增、永不复用、跨会话切换**不重置**
  readonly ts: number;         // epoch ms（时间戳唯一来源；渲染期禁 Date.now()）
  readonly kind: StreamEventKind;
  readonly cardId: string;     // 卡归属键：一次「往返」的所有事件共享 ⇒ 同一张卡
  readonly sessionId: string;  // 事件归属会话（分段用）
  readonly payload: StreamPayload;      // 判别联合；**零明文**（ADR-V4-034）
  readonly terminal?: StreamTerminal;   // 终态事件专用
}

export interface StreamState {
  readonly events: readonly StreamEvent[];
  readonly seq: number;                 // 下一个可用 seq
  readonly sessionId: string;
  readonly openAsks: readonly string[]; // 未终态 ask/user 卡的 cardId（v4-3 消费）
  readonly dropped: number;             // bound 淘汰计数（状态栏可读，禁静默）
}

export function createStreamState(sessionId: string): StreamState;
export function appendEvent(s: StreamState, e: Omit<StreamEvent,'seq'|'sessionId'>): StreamState;
export function boundStreamEvents(s: StreamState, cap = 2000): StreamState;   // ADR-V4-003 第 3 条
export function project(s: StreamState, deps: ProjectDeps): CardView[];        // 纯函数
```

### 2.3 投影与增量渲染

```text
StreamState ──project()──▶ CardView[] {cardId, kind, layer, firstSeq, lastSeq, ts, terminal?, payload}
                                    │
                                    ▼
stream-render.ts ── diff by cardId ──▶ ① append 新 <li data-msg-type data-card-key>
                                       ② patch 已存在但未终态的卡（只写 data-* / 固化区 / .ts）
                                       ③ 终态卡的 DOM 冻结（后续渲染不再触碰其内部）
                                       ④ remove：仅 bound 淘汰路径
```

| 关注点 | 实现 |
|---|---|
| **不整树重建** | 持有 `Map<cardId, HTMLElement>`；**永不** `textContent=''` / `replaceChildren()`；`cardCount(rendered) === cardCount(project())` 由门禁断言 |
| **滚动** | 复用 `scroll-policy.ts`（`BOTTOM_THRESHOLD_PX = 48`）+ `followToBottom` 双 rAF pin；用户上滚期间追加**不得抢滚动**；`#scroll-bottom` 的 `hidden` 切换保持 |
| **折叠记忆** | 键从 entry id → `cardId`（语义等价）；阈值 480 字符 / 10 行**单一常量** |
| **320px** | `white-space: pre-wrap` + `overflow-wrap: anywhere`；`pre`/`table` 横向滚动；长 URL 折行；零水平溢出 |
| **无障碍** | `ol#stream[role=log]`；每卡 `role="listitem"`（`li` 天然）+ `.ts` 可读；固化时 `aria-live="polite"` 播报；收起一律 `hidden` |
| **性能** | 目标：40 轮 ≈ 320 `li` 的追加不触发整层重排；由 `test/perf-budget.test.ts`（只增）与 `test/ui/stream.mjs` 的「渲染次数 / 节点复用」断言共同约束 |

### 2.4 固化契约（**全卡型唯一语言**）

| 面向 | 契约 |
|---|---|
| 操作前 | 表单/操作区可见；固化区 `hidden === true`；`data-answered="false"` / `data-decision="pending"` |
| 操作后（ask 答） | `data-answered="true"`；表单收起（`hidden`）；固化区显示「已答：{answer}」+ `.ts`（`HH:MM:SS`）+ `.card-fixed` |
| 操作后（ask 取消） | `data-answered="cancelled"`；固化文案「已取消（不代填默认值）」+ `.ts` + `.card-fixed` |
| 操作后（auth） | `data-decision="approved"` / `"rejected"`；操作按钮收起；固化文案 + `.ts` + 审计入口 |
| 终态冻结 | 终态卡的内部 DOM **不再被 patch**；不存在「撤销回答 / 撤销批准」控件（撤销 = 新 `system` 事件行） |
| 过程卡终态 | `tool` → `completed`（`ok`/`ms`）；`thinking` → `completed`（耗时）；`system`/`notice` **无终态**（单行只追加） |

### 2.5 依赖与波次衔接

```text
前置：v4-1（三区骨架 + #stream + 密度基线 + 占位宿主）
本叶产出（v4-3 / v4-4 的契约）：
  · StreamEvent / StreamState / appendEvent / project() / CardView（类型 + 纯函数）
  · cards/index.ts#CARD_TYPES（7 主类 + 5 过程族）+ data-msg-type 契约 + 卡工厂注册表
  · stream-render.ts（增量渲染器：append/patch/remove + 滚动锚定）
  · 固化契约（data-* / [hidden] / .ts / .card-fixed）与「终态冻结」不变式
  · stream-digest.ts（摘要落库 schema + bound + LRU + 降级重建）
  · appendSystem(kind, text)（v4-4 唯一通道入口）
  · 占位宿主换实现：把 v4-1 的 data-transitional-host="v4-4" 宿主中的**内容容器**接管为 cards 渲染（宿主标记由 v4-4 清空）
下游：v4-3（ask/auth 业务态）· v4-4（ref/system/nextstep + 通道归并 + 收口）
```

### 2.6 会话切换与持久化（本叶核心工程点）

| 项 | 决策 |
|---|---|
| **切换** | `{type:'history'}` 到达 ⇒ ① 追加 `system` 行「会话已切换：<label>」② `StreamState.events` **不清空**（旧段保留在内存 ⇒ 可上滚回看、`tool`/`ok`/`ms` 不丢）③ 按旧 `sessionId` 增量写摘要 ④ `pending=false`、未终态 ask 交给 v4-3 结算为 `cancelled(superseded)` |
| **`seq`** | 全局单调，跨切换**不重置**（消除 id 口径歧义） |
| **摘要落库（面板侧）** | `chrome.storage.local`（**已有 `storage` 权限**）；key = `web-cli/stream-digest:<sessionId>`；字段白名单 `{seq, ts, kind, cardId, terminal, label(≤80 截断), tool, ok, ms, refNum, askRequestId}`；**零明文**（无正文 / 命令参数体 / URL query / 页面文本） |
| **LRU / bound** | 摘要按 `sessionId` 独立 LRU（`MAX_DIGEST_SESSIONS = 20`，与既有 `MAX_SESSIONS` 对齐）；`boundStreamEvents(cap = 2000)` 只淘汰**最旧的已终结** `system`/`notice` 行，**永不淘汰** ask/auth 终态卡 / tool 卡 / ref 卡 / 当前会话段；淘汰计数写入状态栏（禁静默） |
| **降级重建** | 面板重开 ⇒ 读回摘要并**降级重建**（正文位置显示「（历史摘要）」并保留 `seq`/`ts`/`terminal`）；该降级**显式登记**为截断规则（EC-CHAT-003 / V42-O-4），由 `test/stream-persistence.test.ts` 锁死 |
| **不触碰 SW** | `session-store.ts` / `chat-session.ts` / `KIND_SET` **零 diff**（FR-CHAT-026）；新通道为零 |

---

## 3. 方案对比（本叶开放点）

### 3.1 P-V42-01 会话切换的实现位置（面板侧 vs SW 侧）

| 维度 | **方案 A：面板侧事件流分段 + 面板侧摘要落库** | 方案 B：扩展 `session-store.ts` 存事件 + 新增 SW↔面板通道 | 方案 C：沿用 `history` 重建（不保留旧段） |
|------|:--|:--|:--|
| 描述 | `{type:'history'}` 由面板拦截：旧段保留在内存 + 摘要写 `chrome.storage.local`；SW 零改动 | SW 存事件并推流；需新增 kind | 沿用现状（`entries` 整体替换） |
| 优点 | ① **SW / `KIND_SET` 零 diff**（`content.js` 无容差红线）② 零新权限（`storage` 已在静态权限）③ 面板独立可测（node 单测零 Chromium）④ 与既有 `session-store` 的 LRU/bound 纪律对齐 | 重开后完全还原 | 零改动 |
| 缺点 | 重开后正文降级为截断摘要（**必须显式登记**） | ① **触碰 `KIND_SET` 红线**（先例：+6 kind = +307 B = FAIL）② 需 SW 侧持久化 schema 变更 ③ 引入新的 SW↔面板契约面 | **直接违反 FR-CHAT-024**（丢 `tool`/`ok`/`ms`） |
| 风险 | 低（截断规则登记） | **高**（红线 + 新契约面） | **不可接受** |
| 工作量 | 中 | 中大 | 零 |

### 3.2 P-V42-02 增量渲染的 diff 策略

| 维度 | **方案 A：`cardId` keyed Map + 三操作（append/patch/remove）** | 方案 B：虚拟列表（只渲染视口内卡） | 方案 C：保留全量重建但加 `requestIdleCallback` 节流 |
|------|:--|:--|:--|
| 描述 | 与 `project()` 输出逐 `cardId` 比对；只动变化的部分；终态卡 DOM 冻结 | 维护视口窗口，滚出即卸载 | 仍 `textContent=''`，靠节流降频 |
| 优点 | ① 结构最简、与「追加式流」语义同构 ② 折叠记忆 / 滚动锚定天然稳定 ③ 终态冻结可机器断言（`outerHTML` 不变） | 长会话内存最优 | 改动最小 |
| 缺点 | 长会话（≈320 `li`）常驻 DOM（可接受：`li` 轻量 + 内容折叠） | ① 卸载/重建会破坏「终态冻结」与折叠记忆 ② 「可上滚回看」的几何断言复杂化 ③ 与 `content-visibility` 的关系需额外登记 | **违反 NFR-CHAT-003**（不整树重建）且滚动锚定在每次重建后需回写（现状痛点） |
| 风险 | 低 | 中高（与留痕/冻结语义张力） | **不可接受** |
| 工作量 | 中 | 高 | 低 |

### 3.3 P-V42-03 「thinking」形态的实现

| 维度 | **方案 A：`thinking` + `thinking-done` 事件 → 同卡 patch 为终态 `completed`** | 方案 B：瞬时元素（append 后 remove） | 方案 C：只在状态栏显示「思考中」（不入流） |
|------|:--|:--|:--|
| 描述 | 与工具卡同构（两事件一卡；终态冻结） | 现状形态（`renderThinking()` 随 `pending` 增删） | 思考不产生流条目 |
| 优点 | ① append-only（无 DOM 删除路径）② 留痕（「思考了 1.2s」可回看）③ **不丢既有过程形态**（FR-CHAT-035 / NG-CHAT-006）④ 终态冻结统一 | 改动最小 | 状态栏语义自然 |
| 缺点 | 需要 `thinking-done` 事件（`pending` 变化时补发） | 引入 DOM 删除路径 ⇒ 与 append-only 张力；且思考过程**不留痕**（与 G-CHAT-001 冲突） | **丢弃既有形态**（`thinking` 是 5 形态之一，NG-CHAT-006 明禁） |
| 风险 | 低 | 中 | **不可接受** |
| 工作量 | 低 | 低 | 低 |

### 3.4 P-V42-04 过程卡族的 DOM 契约

| 维度 | **方案 A：与主类同一套契约（`li[data-msg-type][data-card-key]` + `data-*` + `.card-fixed`）** | 方案 B：过程族沿用 v1 的 `.tool-card` / `.cmd` / `.msg-thinking` / `.entry-error` / `.msg-notice` 类名体系 | 方案 C：把 5 形态并入 `ai`/`system` 两类 |
|------|:--|:--|:--|
| 描述 | 过程族 = `CARD_TYPES` 的 `layer='process'` 成员；DOM 结构与主类一致，仅在 `data-msg-type` 上区分 | 保留 v1 类名；过程族与主类两套体系 | 合并类别 |
| 优点 | ① `CARD_TYPES` 单源登记 ② 固化契约与无障碍规则**一处实现** ③ 门禁可批量断言（`[data-msg-type]` 统一选择器） | 既有样式与断言可直接复用 | 类别最少 |
| 缺点 | 既有 `.tool-card` 样式需要迁移（**保留类名**以复用样式，见决策） | 两套体系 ⇒ 固化契约 / 无障碍 / 密度逐卡判定都要写两遍 | **丢信息**（工具名 + 状态 + 耗时 + 折叠记忆 无归属）＋违反 FR-CHAT-035 |
| 风险 | 低 | 中（重复实现） | **不可接受** |
| 工作量 | 中 | 中 | 低 |

---

## 4. 推荐方案

| 开放点 | 推荐 | 理由 |
|--------|------|------|
| P-V42-01 切换实现位置 | **方案 A**（面板侧） | 唯一让 `KIND_SET` / `content.js` 红线零风险的形态；且符合 NFR-CHAT-012 的最小要求 |
| P-V42-02 diff 策略 | **方案 A**（cardId keyed 三操作） | 与追加式流语义同构；终态冻结可机器断言；虚拟列表与「冻结 + 回看」张力过大 |
| P-V42-03 thinking | **方案 A**（两事件一卡 → 终态） | 唯一同时满足 append-only 与「不丢既有形态」的形态 |
| P-V42-04 过程族契约 | **方案 A**（同一套 `data-*` 契约 + **保留** v1 类名用于样式复用） | 单源登记 + 固化契约一处实现 + 既有样式零重写（`data-msg-type` 与类名并存，互不冲突） |

**本叶编排器决策承接**：D-P-V4-03（卡分类学 7 + 过程族 5）· 裁决 1（append-only + 终态冻结）· O-CHAT-001（折叠阈值 480/10 单源；固化卡与系统事件行**不压缩**）· O-CHAT-002（`seq` 统一口径；`ref` 卡 = 注册表投影 + 事件记录）· O-CHAT-008（过程族归并为 AI 族子形态）。

---

## 5. 文件影响分析（本叶）

| 操作 | 文件路径 | 说明 |
|:--:|------|------|
| NEW | `src/ui/sidepanel/stream-model.ts` | `StreamEvent` / `StreamState` / `appendEvent` / `boundStreamEvents` / `project()` / 终态冻结不变式 |
| NEW | `src/ui/sidepanel/stream-render.ts` | keyed 增量渲染器 + 滚动锚定 + 终态 DOM 冻结 |
| NEW | `src/ui/sidepanel/stream-digest.ts` | 摘要落库（零明文白名单 + bound + LRU + 降级重建） |
| NEW | `src/ui/sidepanel/cards/index.ts` | `CARD_TYPES`（12 项）+ `CARD_KIND_LAYER` + 卡工厂注册表 + `appendSystem()` |
| NEW | `src/ui/sidepanel/cards/{ai,user,system,tool,command,thinking,error,notice}.ts` | 卡组件（含固化契约；工具卡字段 + 折叠记忆；`askuser`/`auth`/`ref`/`nextstep` 骨架在本叶以最小实现占位） |
| MODIFY | `src/ui/sidepanel/chat-state.ts` | 新增 `stream` 字段 + `streamReducer` 分支（**既有 12 个 action 零删除**；`entries+nextId` 保留为派生视图） |
| MODIFY | `src/ui/sidepanel/sidepanel.ts` | `render()` 的流渲染段替换为 `streamRender(project(state.stream))`；`toolOpenState` 键改 `cardId` |
| MODIFY | `src/ui/sidepanel/view-model.ts` | `cardViewModel()` / `CARD_KIND_LAYER` 消费；`stream` 派生计数 |
| NEW | `test/stream-model.test.ts` | node：不可变 / `seq` 单调不复用 / 回放等价 / 终态冻结 / **无「置 null 消失」路径** / bound 淘汰规则 |
| NEW | `test/stream-persistence.test.ts` | node：摘要 schema / 零明文白名单 / LRU / bound / 切换还原与降级登记 |
| NEW | `test/ui/stream.mjs` | Chromium：7 主类 + 过程族渲染 + 固化契约 + 增量渲染（不清空 / 终态冻结）+ 滚动 + 320px + 无障碍 |
| MODIFY | `test/ui/l0.mjs` | 追加「`#stream` 内卡不污染外壳密度」复算（本叶新增 1~2 条） |
| MODIFY | `test/sidepanel-view.test.ts` | 契约 ④ `#log.empty` → `#stream` 空态等价改写（本叶负责；契约 ①②③ 由 v4-1 完成） |
| MODIFY | `test/gate-integrity.test.ts` | `EXPECTED_AUDITED_FILES` 追加 `test/ui/stream.mjs`（**不动 `CHROMIUM_GATES.length === 9`**） |
| MODIFY | `test/perf-budget.test.ts` | 追加长会话（40 轮 ≈ 320 卡）增量渲染不回退断言 |
| MODIFY | `test/size-baseline.ts` | 本叶**五要素中间重登记** |
| MODIFY | `package.json` | scripts 追加 `test:stream` |
| MODIFY | `docs/v4-supersession-ledger.json` | 本叶 `entries` / `modifiedRanges` / `counts`（`nodeTestRuntime` / `l0.mjs` / `sidepanel-view`）追加 |
| MODIFY | `docs/v4-density-baseline.json` | 本叶（若产生新的登记格漂移）追加登记 |
| NEW | `.sddu/.../specs-tree-v4-2-chat-stream-model/plan.md` | 本文件 |
| MODIFY | `.sddu/.../specs-tree-v4-2-chat-stream-model/state.json` | `phase: specified → planned` |

---

## 6. 风险评估（本叶）

| 风险 | 概率 | 影响 | 缓解措施 |
|------|:--:|:--:|----------|
| **R42-01 投影层未真正冻结终态（实现腐化）** | 中高 | 高 | 终态冻结不变式由 `test/stream-model.test.ts` 断言（对同一 `cardId` 追加新事件后 `terminal` 与 `terminalSeq` 不变）；DOM 侧由 `test/ui/stream.mjs` 断言终态卡 `outerHTML` 不变（ADR-V4-012 第 6 条） |
| **R42-02 增量渲染退化为「隐式全量重建」** | 中 | 高 | 门禁断言：① 同一 `cardId` 的 DOM 节点**引用不变**（`=== `）② 渲染函数内零 `textContent=''` / `replaceChildren()`（静态零命中 + 运行时计数）③ `perf-budget.test.ts` 只增 |
| **R42-03 摘要落库破零明文** | 中 | **极高** | `stream-digest.ts` 只接受**白名单字段**（类型层面：`DigestEntry` 无自由文本字段，`label` 走既有截断 + 净化）；`test/stream-persistence.test.ts` 断言 `assertNoPlaintext` 对构造出的所有摘要行通过 + 反向用例（注入 URL query / 命令参数体 ⇒ 抛错） |
| **R42-04 `seq` 在会话切换时被重置** | 中 | 中高 | `createStreamState()` 只在面板初始化调用一次；切换路径**不重建** `StreamState`；单测断言「切换后 `seq` 严格大于切换前的最大值」 |
| **R42-05 过程族归位丢字段** | 中 | 高 | 工具卡字段逐项断言（`tool` / `ok` / `ms` / 预览非空 / 折叠记忆 480B·10 行）；命令行 `.cmd` / 思考 / 错误 / 通知各有存在性断言（FR-CHAT-035 的 5 形态矩阵） |
| **R42-06 新 kind 被加入 `KIND_SET`** | 低 | **极高** | 设计上零新 kind；`KIND_SET` 零 diff 断言；若某叶发现必须新增 → **停下上报**（父 plan §2.9 A / ADR-V4-029） |
| **R42-07 长会话内存/性能回退** | 中 | 中 | `boundStreamEvents(cap=2000)` + 淘汰规则只淘汰已终结轻量行；`perf-budget.test.ts` 追加用例；淘汰计数写入状态栏（不静默） |
| **R42-08 卡内可点数超 6（触发 v4-1 的 A1 防滥用）** | 中 | 中 | 本叶在 `cards/*` 的模板中**结构性限制**每卡可点元素（`evaluateCardBudget` 在门禁侧判定）；`askuser`/`auth` 的完整业务态在 v4-3 落地时需复算 |

---

## 7. 生成的 ADR（本叶：ADR-V4-024~029）

| ADR | 标题 | 状态 |
|-----|------|:--:|
| ADR-V4-024 | `StreamEvent` 结构 + `streamReducer` + `project()` 纯投影 + 终态冻结不变式 + `chat-state.ts` 迁移路径 | ACCEPTED |
| ADR-V4-025 | 增量渲染架构（keyed 三操作 + 滚动锚定 + 320px + 性能门禁） | ACCEPTED |
| ADR-V4-026 | 卡组件与 view-model 映射 + DOM/类名契约（`data-msg-type` + `data-card-key` + `.ts` + `.card-fixed`） | ACCEPTED |
| ADR-V4-027 | 过程卡族归位（5 形态）+ 工具卡字段保留 + 折叠阈值单源（480/10）+ 固化卡/系统事件行不压缩 | ACCEPTED |
| ADR-V4-028 | 会话切换不丢过程元数据 + 摘要落库（零明文白名单）+ `boundStreamEvents` 截断规则显式登记 | ACCEPTED |
| ADR-V4-029 | 新 kind 治理：`KIND_SET` 零 diff + 独立校验器模式（若必须新增）+ `CARD_TYPES` 扩展登记 | ACCEPTED |

### ADR-V4-024: `StreamEvent` 结构 + `project()` 纯投影 + `chat-state.ts` 迁移路径

## 状态
ACCEPTED（承父 ADR-V4-002/012/013；替代方案见父 plan §3.1）

## 背景
现状 `entries: ChatEntry[]` + `nextId` 已是 append-only 数据层（`chat-state.ts:111-128`），但 `role` 4 类 / `kind` 4 类，且 `ask`/`confirm` 是可变单槽 + 置 `null`（`:169-185`）；`render()` 每次 `textContent=''` 全量重建。既有 12 个 `dispatch` action 被 `sidepanel.ts` 与多个门禁直接使用（不能删除）。

## 决策
1. **类型（不可变 + 单调 + 分段）**：见 §2.2 的 `StreamEvent` / `StreamState`（`readonly` 字段；`seq` 全局单调不复用；`cardId` 为卡归属键；`sessionId` 为分段键；时间戳只来自 `ts`）。
2. **`project(state, deps) → CardView[]` 是纯函数**：无 DOM、无 `Date.now()`、无随机；同一 `StreamEvent[]` ⇒ 同一 `CardView[]`（**回放等价**）。
3. **终态冻结不变式**：`CardView.terminal` 由**终态事件**（`terminal !== undefined`）唯一决定；同一 `cardId` 上出现终态事件之后，**任何后续事件不得改变** `terminal` / `terminalSeq`（后者为**附加 kind/事件、新卡或 `system` 行**）。单测专门断言。
4. **`chat-state.ts` 迁移（最小半径）**：
   - 既有 12 个 action **零删除**；新增 `stream: StreamState` 字段与 `streamReducer` 的**追加分支**（在既有 `reduce()` 之后串联，不改既有 case 语义）；
   - `entries` / `nextId` **保留为派生视图**（`project()` 的逗号投影），供未迁移的既有断言与 `renderEntry` 路径在过渡期共用（**本叶收尾时 `render()` 的流渲染段已切到 `streamRender`**）；
   - `ask` / `confirm` 单槽保留（作为「当前未终态 ask 卡」的便捷视图），其 `null` 置位**不再**是「卡消失」的信号 —— 卡由事件流保持（**无「置 null 消失」路径**）。
5. **装饰（decorators）注入**：`project()` 的 `deps` 提供引用状态（`ref-store`）/ 探测状态 / L2 counts 的**只读快照**；`project()` 自身不订阅、不写状态（保证纯函数与可回放）。
6. **`boundStreamEvents`**：见 ADR-V4-028。
7. **否决**：事件可变（父 plan §3.1 方案 C）、卡记录自身 append-only（方案 B：卡数翻倍破坏工具卡同卡契约）。

## 后果
- 「append-only」与「状态迁移允许」的精确表达落地：**事件层冻结 + 投影终态不变式**（父裁决 1）。
- 模型可 node 单测（`test/stream-model.test.ts`，零 Chromium）⇒ 快速反馈，且在 1.5 GB 机器上随时可跑。
- 代价：`entries` 与 `stream` 在过渡期并存（双写）；v4-2 收尾后 `entries` 仅作为派生值存在，`render` 不再依赖它（避免长期双源）。

### ADR-V4-025: 增量渲染架构

## 状态
ACCEPTED（承 NFR-CHAT-003 / NFR-CHAT-011 / ADR-V4-004；替代方案见 §3.2）

## 背景
现状 `render()` 每帧 `log.textContent=''` 再逐条 append（`sidepanel.ts:809-833`），并靠 `scrollTop` 回写维持阅读位置；`toolOpenState: Map<number,boolean>` 按 entry id 记忆折叠。40 轮 × 多事件的量级下，重建会造成卡内折叠态与滚动锚定的反复抖动。

## 决策
1. **渲染器状态**：`{ nodes: Map<cardId, HTMLElement>, order: string[] }`。
2. **三操作（唯一允许的 DOM 变更）**：
   - `append(card)`：新 `cardId` ⇒ 创建 `<li data-msg-type data-card-key>` 并追加到 `#stream` 末尾（正序）；
   - `patch(card)`：既有 `cardId` 且**未终态** ⇒ 只写 `data-*` / 固化区内容 / `.ts` / `hidden` 切换；终态卡**不 patch**；
   - `remove(cardId)`：**仅** `boundStreamEvents` 淘汰路径。
3. **禁止**：`textContent = ''`、`replaceChildren()`、`innerHTML =`（在流容器上）；`#stream` 的 `children` 数量必须恒等于 `project()` 的卡数（门禁断言）。
4. **DOM 冻结断言**：对终态卡记录 `outerHTML`，在其后追加 ≥1 个事件并重渲染 ⇒ `outerHTML` 必须不变。
5. **滚动**：复用 `scroll-policy.ts`（`BOTTOM_THRESHOLD_PX = 48`）+ `followToBottom`（双 rAF pin）；**不再需要 `prevTop` 回写**（无清空 ⇒ 无需还原）；`#scroll-bottom` 的 `hidden` 由 `isNearBottom` 决定。
6. **折叠记忆**：`toolOpenState` 键改为 `cardId`；`toggle` 只改该卡的 `details[open]`，不触发重渲染。
7. **320px 与性能**：长内容按 `white-space: pre-wrap` + `overflow-wrap: anywhere`；`pre`/`table` 横向滚动；**不使用虚拟列表**（与「终态冻结 + 可上滚回看」张力）；可选 `content-visibility: auto` 仅在实测必要且经父 plan §2.9 杠杆评估后启用（启用须登记）。
8. **无障碍**：`ol#stream[role=log]`；`li` 即 `listitem`；`.ts` 有可读文本；固化时容器 `aria-live="polite"` 播报；键盘/读屏顺序即文档序（正序）。

## 后果
- 「不整树重建」从文档要求变为**机器事实**（节点引用不变 + 容器 children 计数 + 静态零命中）。
- 滚动逻辑**简化**（去掉 `prevTop` 回写分支）⇒ 与 `scroll-policy` 的 48 px 跟随语义更纯粹。
- 代价：渲染器持有 `Map`/`order` 状态，需在会话切换（不清空）与 bound 淘汰（删除节点）两条路径上保持一致；两者都有单测与门禁断言。

### ADR-V4-026: 卡组件与 view-model 映射 + DOM/类名契约

## 状态
ACCEPTED（承父 ADR-V4-013 / FR-CHAT-022 / FR-CHAT-030~037 / NFR-CHAT-004；替代方案见 §3.4）

## 背景
既有渲染散落 `sidepanel.ts:118-240`（命令行 / 工具卡 / 思考 / 错误 / 通知）与 `l0/decision-card.ts`（ask/confirm），各有自己的类名与 DOM 结构；shim B2 要求「每类卡挂在 `#stream` 的 `li` 上」，B3 要求 AI 卡富文本，B4 要求推荐卡含 chips。

## 决策
1. **DOM 契约（全卡型唯一）**：
   ```html
   <li data-msg-type="<kind>" data-card-key="<cardId>" role="listitem">
     <div class="card-head">…<time class="ts">HH:MM:SS</time></div>
     <div class="card-body">…</div>
     <div class="card-fixed" hidden>…固化区…</div>
   </li>
   ```
   `li[data-msg-type]` 是**门禁与密度的统一选择器**（`[data-msg-type]` 与 shim 的 `[data-msg-type]` 逐字一致）。
2. **类名并存（**保留** v1 类名用于样式复用）**：`tool` 卡同时带 `data-msg-type="tool"` 与 `.tool-card`；`command` 带 `.cmd`；`thinking` 带 `.msg-thinking`；`error` 带 `.entry-error`；`notice` 带 `.msg-notice`；`ai`/`user` 保留 `.msg-assistant` / `.msg-user`（既有样式与 `journey` 断言继续命中）。**新契约（`data-*`）是规范入口，旧类名是样式载体**。
3. **卡↔view-model 映射**：`view-model.ts` 导出 `cardViewModel(card, deps)`（纯函数）供卡组件消费；卡组件**不做业务判定**（只渲染已定稿的 `CardView`），业务判定留在 `project()`（模型层）。
4. **固化契约**：见 §2.4（操作前 / 操作后 / 终态冻结 / 过程卡终态）。
5. **无障碍**：卡内可读时间戳（`.ts`）；`ai` 卡富文本走既有 `markdown.ts`（零改动，安全 Markdown）；`user` 卡对侧气泡；错误卡为醒目 `system` 气泡（沿用既有样式）；`aria-live` 只在固化时播报（避免整流播报噪声）。
6. **`CARD_TYPES` 单源**：`cards/index.ts` 导出 12 项 + `CARD_KIND_LAYER`（`primary` / `process`）+ 工厂注册表；扩展必须显式登记（父 ADR-V4-013 第 4 条）。
7. **否决**：过程族用第二套类名体系（§3.4 方案 B：固化契约/无障碍/密度逐卡判定要写两遍）、把 5 形态并入 `ai`/`system`（方案 C：丢信息）。

## 后果
- 门禁可用**统一选择器**（`[data-msg-type]`）批量断言 12 类卡，同时既有类名样式与断言零破坏。
- 卡组件成为**哑渲染器** ⇒ 业务态一律在模型层，v4-3/v4-4 只需扩展 `project()` 与添加卡类型，不改渲染器结构。
- 代价：`li` 上同时存在 `data-*` 与旧类名，需在 `cards/index.ts` 的注册表里显式登记「每卡的规范属性 + 兼容类名」以免漂移。

### ADR-V4-027: 过程卡族归位 + 工具卡字段保留 + 折叠阈值单源

## 状态
ACCEPTED（承父 ADR-V4-013 / NG-CHAT-006 / FR-CHAT-035 / O-CHAT-001 / O-CHAT-008 / R-CHAT-013；替代方案见 §3.3/§3.4）

## 背景
现状 5 种过程形态各有独立 DOM 与样式：工具卡（`details.tool-card` + `ok`/`ms` + 预览 + 折叠）、命令行（`.cmd`）、思考指示（`.msg-thinking`）、错误条目（`.entry-error`）、工具通知（`.msg-notice`）。F 稿 7 类**没有** tool 卡型；若并入 `ai`/`system` 会丢「工具名 + 状态 + 耗时 + 折叠」信息与 `journey#15f~#15o` 的断言（TASK-023 既有能力）。O-CHAT-001 已裁决折叠阈值沿用 480 字符 / 10 行、且**固化卡与系统事件行不压缩**。

## 决策
1. **5 形态全部归位为过程卡族**（`layer='process'`），**保留全部信息字段**：

   | 形态 | `data-msg-type` | 必须保留的信息 | 终态 |
   |---|---|---|---|
   | 工具卡 | `tool` | 工具名 / `ok`（✓/✖）/ `ms` / 预览（首行摘要）/ 折叠记忆（480 字符 · 10 行） | `completed`（`tool-result` 到达时 patch） |
   | 命令行 | `command` | 命令文本（`.cmd` 紧凑样式） | 无（历史条目） |
   | 思考指示 | `thinking` | 「思考中…」→「已思考 N.Ns」 | `completed` |
   | 错误条目 | `error` | 错误文本 + `.entry-error` 醒目样式 | 无 |
   | 工具通知 | `notice` | 通知文本（单行） | 无 |

2. **折叠阈值单源**：`TOOL_PREVIEW_CHARS = 480` / `TOOL_PREVIEW_LINES = 10` 常量**只在一处**定义（`cards/index.ts`），**不按卡型各写一套**；折叠实现沿用既有 `<details>`（`open` 状态即折叠记忆）。
3. **固化卡与系统事件行不压缩**（O-CHAT-001 ① ②）：`askuser` / `auth` 卡进入终态后**不折叠、不摘要**（压缩 = 丢事实）；`system` / `notice` 保持**单行**（轻量），但**不压缩其文本**。
4. **`thinking` 的 append-only 实现**：`thinking` 事件 + `thinking-done` 事件 → 同卡 patch 为终态（**不得** append 后 remove，§3.3 方案 B 否决）。
5. **`error` 与失败工具卡**：失败工具卡沿用既有语义（`ok === false` ⇒ 卡同时具备 `data-msg-type="tool"` 与错误样式类），保证 `journey#15m`（失败工具卡可见）与 `FR-050` 语义不变。
6. **`notice` 与系统事件行分离**：`notice` = **工具通知**（AI 族的过程形态）；`system` = **系统事件行**（连接/导航/探测/会话切换，单行 + `HH:MM:SS`）。两者不混（v4-4 的通道归一只产出 `system`）。

## 后果
- 「不丢弃任何既有过程形态」（NG-CHAT-006）由**类型清单 + 5 形态矩阵断言**保证；既有样式与 `journey#15f~#15q` 断言只需选择器重锚到 `[data-msg-type]`。
- 折叠行为在 v4 下统一（一处常量），且「固化卡不压缩」与「系统事件行不压缩」成为**明文约束**（可由门禁断言「终态 ask/auth 卡内无折叠控件」）。
- 代价：`thinking` 需要一个额外的 `thinking-done` 事件（由 `pending` 变化时补发），模型层多一条事件语义。

### ADR-V4-028: 会话切换不丢过程元数据 + 摘要落库 + bound 截断规则

## 状态
ACCEPTED（承父 ADR-V4-003 / FR-CHAT-024 / NFR-CHAT-012 / EC-CHAT-003 / O-CHAT-002④ / V42-O-1 / V42-O-4；替代方案见 §3.1）

## 背景
`{type:'history'}` 整体替换 `entries` 且把 tool 条目降级为 `kind:'tool'`（丢 `ok`/`ms`/`tool`）；`session-store.ts#projectHistory()` 只投影 `{role,text}`；`KIND_SET` 加 kind 会破 `content.js` 无容差红线（先例 +6 kind = +307 B）。父 spec §13 #1 把「持久化范围」留给 plan，约束 = **至少内存 append-only + 会话内可回放 + 零明文**。

## 决策
1. **会话切换（面板侧拦截）**：
   - 追加 `system` 行「会话已切换：<label>」；
   - `StreamState.events` **不清空**（旧段保留在内存 ⇒ `tool`/`ok`/`ms` 不丢 ⇒ FR-CHAT-024 由结构保证）；
   - 按**旧** `sessionId` 增量写摘要（幂等 upsert）；
   - `pending = false`；未终态 ask 卡交由 **v4-3** 结算为 `cancelled(superseded)` 并留痕（本叶负责「不静默丢弃」的模型侧保证：`openAsks` 列表随事件流保留）。
2. **`seq` 全局单调、跨切换不重置**（消除 id 口径歧义；父 ADR-V4-003 第 1 条）。
3. **摘要落库（面板侧 `chrome.storage.local`）**：
   - key：`web-cli/stream-digest:<sessionId>`（**已有 `storage` 权限**，零新权限）；
   - 条目字段白名单（**类型层面即无自由文本**）：`{seq, ts, kind, cardId, terminal?, label(≤80 字符，经净化/截断), tool?, ok?, ms?, refNum?, askRequestId?}`；
   - **零明文**：不写正文 / 命令参数体 / URL query / 页面文本；`label` 走既有截断 + `assertNoPlaintext` 等价净化；渲染前再过一次白名单（ADR-V4-034 由 v4-3 细化）。
4. **bound 与淘汰规则**：
   - `MAX_DIGEST_SESSIONS = 20`（与既有 `MAX_SESSIONS` 对齐，LRU）；
   - `boundStreamEvents(cap = 2000)`：超限时淘汰**最旧的已终结** `system` / `notice` 行；**永不淘汰** `askuser` / `auth` 终态卡、`tool` 卡、`ref` 卡、**当前会话段**；
   - 淘汰计数 `StreamState.dropped` 写入**状态栏**（可读，**禁静默**）。
5. **降级重建（显式登记为截断规则）**：面板重开 ⇒ 读回摘要 → 重建「事实时间线」（`seq`/`ts`/`kind`/`terminal`/`tool`/`ok`/`ms`/`refNum` 全部保留；**正文**显示为「（历史摘要）」）；该截断规则写入 `docs/v4-supersession-ledger.json#truncationRules`（`{scope: 'panel-reopen', kept: [...], degraded: ['body'], reason, registeredOn}`）与 `docs/v4-density-baseline.json` 无关（体积面）——**禁静默**。
6. **不触碰 SW**：`src/background/session-store.ts` / `chat-session.ts` / `messaging.ts#KIND_SET` **零 diff**（FR-CHAT-026 / 父 plan §2.9 B）。
7. **否决**：扩展 `session-store.ts` 存事件 + 新通道（§3.1 方案 B：破红线）、沿用 `history` 重建（方案 C：违反 FR-CHAT-024）。

## 后果
- FR-CHAT-024（切换不丢过程事实）**由内存段保留 + 摘要含 `tool`/`ok`/`ms` 双重保证**；EC-CHAT-003 的截断规则被**显式登记**（只在「面板重开」这一条路径上降级正文）。
- 零明文风险被压到最小（摘要无自由文本字段）；`KIND_SET` 与 `content.js` 零风险。
- 代价：`StreamState` 内存随会话数增长 ⇒ 依赖 `bound` 兜底；两条淘汰/降级路径都必须有单测与登记。

### ADR-V4-029: 新 kind 治理（`KIND_SET` 零 diff + 独立校验器 + `CARD_TYPES` 扩展登记）

## 状态
ACCEPTED（承 FR-CHAT-026 / AC-CHAT-020 / R-CHAT-009 / V42-O-5）

## 背景
`KIND_SET`（`background/messaging.ts:103+`）打包进 `dist/content.js`（**177,076 B，无容差，+1 B 即 FAIL**）；先例：v2-3 的 `command-policy` 家族与 v3-4 的 6 个 `pick-layer-*` / `ref-rescue` **一律不进 `KIND_SET`**，改由独立校验器（`insight-protocol.ts` / `content/pick-protocol.ts`）校验，原因逐字记录（+6 kind 实测 **+307 B**）。

## 决策
1. **v4 设计上不新增任何 SW↔面板 kind**：v4 的全部流事件都是**面板内模型**（`StreamEvent` 只在 `src/ui/sidepanel/**` 内流转）；系统事件行（v4-4）也只在面板内生成；持久化走**面板侧** `chrome.storage.local`（不经 SW）。
2. **零 diff 断言**：`KIND_SET` 与 `src/background/messaging.ts` 相对 `187c205` **零 diff**（AC-CHAT-020）；`CONTENT_SOURCE_SHA256` 三项 hash 不变；`content.js` 字节不变。
3. **若必须新增 kind（期望不发生）**：**立即停下并上报**，唯一合法路径 = ① 新增**独立校验器**（仿 `pick-protocol.ts` 的「白名单 + 形状校验 + 明确注释为什么不能进 `KIND_SET`」）② **不**改 `KIND_SET` ③ 在 v4 台账登记 `newMessageKinds[]`（含「为什么不能用既有 kind」）。
4. **`CARD_TYPES` 扩展登记**：若需新增卡型（≥13 项）→ ① 改 `cards/index.ts` 的 `CARD_TYPES` ② 更新 `test/design-contract.test.ts` 的 sha256/计数（**仅当**同时扩展设计契约）③ 在 v4 台账登记 `designContractChanges[]`；**禁**静默改断言（父 ADR-V4-013 第 4 条）。
5. **门禁**：`test/gate-integrity.test.ts` 的 `EXPECTED_AUDITED_FILES` 追加 `test/ui/stream.mjs`（additive，**不动 `CHROMIUM_GATES.length === 9`**）；`test/stream-model.test.ts` 断言 `CARD_TYPES.length === 12`（7 + 5）且 `CARD_KIND_LAYER` 覆盖全部成员。

## 后果
- 不动面（`content.js` / `KIND_SET` / manifest）在 v4-2 全叶零风险：**v4 没有任何新增消息 kind**。
- 卡型清单与设计契约变更都有**显式登记位**，不会出现「悄悄加一个 kind/卡型」的路径。
- 代价：若未来确实需要跨进程流事件（例如 SW 侧生成推荐），必须另立方案（独立校验器 + 新消息面），本 Feature 不隐含。

---

## 8. 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建（V4-2 叶子技术方案）。**产出**：本叶 `plan.md`（含 §1~§8 + **ADR-V4-024~029**）。**关键裁决**：① 模型 = `StreamEvent{seq,ts,kind,cardId,sessionId,payload,terminal?}` 不可变 + `appendEvent`/`boundStreamEvents`/`project()` 纯投影 + **终态冻结不变式** + `chat-state.ts` **最小半径迁移**（12 个 action 零删除；`entries+nextId` 保留为派生视图）；② 渲染 = **keyed 三操作**（append / patch（仅未终态）/ remove（仅 bound））+ 终态 DOM 冻结 + `children === project().length` 断言 + 复用 `scroll-policy` 48px；③ 卡契约 = `li[data-msg-type][data-card-key]` + `.ts` + `.card-fixed` + **`data-*` 为规范入口、v1 类名为样式载体**（并存） + `cards/index.ts` 单源登记 `CARD_TYPES`（12 项）；④ 过程族 5 形态归位 + 工具卡字段逐项保留 + 折叠阈值 480/10 单源 + 固化卡与系统事件行**不压缩** + `thinking` 两事件一卡终态；⑤ 会话切换 = 内存段保留 + `seq` 不重置 + **面板侧摘要落库**（零明文白名单 + LRU 20 + `boundStreamEvents(2000)` 只淘汰已终结轻量行）+ **降级重建显式登记**；⑥ `KIND_SET` **零 diff** + 独立校验器模式 + `CARD_TYPES` 扩展登记。**本阶段只做 plan**：不写 tasks、不写代码、不改 `src/**`·`test/**`·`dist/**`·`manifest.json`·ROADMAP、不动 `main`、不 commit/push、**不跑门禁 / 构建 / Chromium**。 | 2026-09-18 | SDDU Plan Agent |

