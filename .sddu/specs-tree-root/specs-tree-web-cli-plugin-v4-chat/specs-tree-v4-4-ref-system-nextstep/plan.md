# 技术计划：specs-tree-v4-4-ref-system-nextstep（V4-4 引用卡 / 系统事件行 / 推荐卡 + 拾取入口迁移）

> **文档定位**: SDDU 技术方案（叶子切片） — 本叶技术方案与 ADR；**权威跨叶契约见父 `../plan.md`**
> **前置依赖**: 父 `../spec.md` v1.0 + 父 `../plan.md` v1.0 + 本叶 `spec.md` v1.0 + **v4-2**（`StreamEvent` / `project()` / `appendSystem` / 固化契约）+ 设计契约 `option-f-shim.mjs`（B4 / E1~E5 / H2~H12）
> **创建人**: SDDU Plan Agent
> **创建时间**: 2026-09-18
> **版本**: v1.0
> **更新人**: SDDU Plan Agent
> **更新时间**: 2026-09-18
> **更新说明**: 初始创建（V4-4 叶子技术方案：引用卡 + 系统事件行 6+ 通道归并 + 推荐卡 + 拾取入口迁移 + **V3-VOL-3 父级收口锚**；ADR-V4-035~040）。**本阶段只做 plan**：不写 tasks、不写代码、不改 `src/**`·`test/**`·`dist/**`·`manifest.json`·ROADMAP、不动 `main`、不 commit/push、**不跑门禁 / 构建 / Chromium**

本叶 = v4 的**过程全景收口**：把引用生命周期、系统事件（6+ 瞬时通道归并）、下一步推荐三类过程全部涌入流内，并处置「面板侧拾取入口消失」带来的可发现性与救援路径断裂。本叶是**最后完成的叶**（position = 4），承载 **V3-VOL-3 父级收口锚**（重定 `sidepanel` 基线 + 绝对上限带值闭合）。

---

## 1. 前置检查

| 检查项 | 状态 | 证据 / 说明 |
|--------|:--:|------|
| 父 `spec.md` / 父 `plan.md` / 本叶 `spec.md` 存在 | ✅ | 601 行 / 1,039 行 / 189 行 |
| v4-2 已落地（前置叶子）；建议 v4-3 之后串行门禁 | ⚠️ **本阶段不可验证（plan 阶段）** | 本叶按 v4-2 契约编写；与 v4-3 **无强耦合**（可并行分解，门禁串行） |
| 设计契约可读（本叶相关组） | ✅ | **B4**（推荐卡含可点 chips）· **E1**（系统事件行 ≥3 条带 `HH:MM:SS`）· **E2/E3/E4/E5**（失效事件行 / 失效卡含原因 + 重拾 + 改用描述 / 兜底默认收起 / 旧卡保留 + 新序号递增）· **H2/H3/H4/H5/H6/H7/H8/H12**（场景与风险 chips） |
| 既有可复用资产 | ✅ | `l1/ref-store.ts`（`seq` 单调不复用 / 退役不删除 / 退役原因冻结 / `repick`/`reanchor`；R3 append-only 先例）· `l1/ref-validity.ts`（五维 fail-closed）· `l1/receipt.ts`（零明文）· `l2/counts.ts`（计数单源）· `l2/audit.ts`（白名单 + URL 去参）· `insight/catalog-meta`（命令档案静态面）· `pick-input.ts#startPick()`（拾取入口） |
| **外部 API 文档缓存** | ⚠️ **N/A（0 个外部服务 API）** | 推荐**禁止**新增 LLM 产物（FR-CHAT-060 / 裁决 5）；**未调用任何受管 Provider** |
| 红线基线核对 | ✅ | `content.js` 177,076 / `pick-layer.js` 33,900 / `KIND_SET` / 判定链 **本叶零触碰**；`sidepanel.js` 收口轮带值闭合 |
| 本叶改动面自检 | ✅ | 侧栏侧 + `test/size-baseline.ts`（收口闭合）+ `test/size-ruling-vol3.test.ts`（`min()` 优先级）；**不碰 `src/content/**` / `pick-layer.js` / 权限** |

---

## 2. 架构分析

### 2.1 本叶切片（做 / 不做）

**做**：`ref` 卡（有效 / 失效 + 失效原因 + 两条恢复路径「重新拾取」/「改用描述」兜底默认收起 + 新序号递增 + 旧卡零改动）· `system` 事件行（单行 + `HH:MM:SS` + 只追加 + 不被覆盖）· **6+ 瞬时通道归并**（`#env-guard` / `#site-hint` / `#onboarding` / `#discovery-notice` / `#notice` / `#send-reason` + 导航失效 + 探测态）· **推荐卡**（真值白名单派生 + chips 即指令 + 规则表/优先级/上限 + 无候选不渲染 + `pending` 门控 + 安全边界）· **拾取入口迁移**（`requestPick()` 单一生产入口 + 页面侧可达 + 未授权设置视图引导 + `l1/panels.ts:259` 复用点断裂处置）· **V3-VOL-3 收口**（重定基线 + 绝对上限带值闭合 + `min()` 优先级 + 作者确认）· 清空全部 `data-transitional-host` 占位宿主。

**不做**：事件模型/卡渲染地基（v4-2）· ask/授权业务（v4-3）· 三区骨架与密度口径（v4-1）· 不新增 LLM 侧产物 / 不新增权限 / 不改判定链 / 不碰 `src/content/**` / 不碰 `pick-layer.js` / 不删除或降级任何既有断言 / 不预填 `PENDING_ABSOLUTE_CAP`。

### 2.2 引用生命周期入流（ADR-V4-035）

```text
页面侧 pick-layer.js（零改动）── 原始事实 ──▶ l1/ref-store.ts（判定权威唯一，五维 + fail-closed，零语义变更）
                                                   │  ① 摄取（ingest）
                                                   │  ② judge（valid / invalid / unknown）
                                                   │  ③ retireUnusable（退役不删除，原因冻结）
                                                   │  ④ repick / reanchor（新引用，旧引用零改动）
                                                   ▼
                                        ref 事件（投影点 + 事件记录）
                                        { cardId, refId, refNum, state:'valid'|'stale', why?, pointId }
                                                   ▼
                                        cards/ref.ts ──▶ 流内 ref 卡
                                        有效：引用序号 ① + 选择器/语义路径/文本摘要/捕获时间（证据层展开）
                                        失效：data-ref-state="stale" + .ref-stale-why + [data-act="repick"] + [data-act="describe"]
                                              旧卡**保留**（不改写）── 重拾/重锚 ⇒ **新 ref 卡**（refNum+1）
```

| 项 | 决策 |
|---|---|
| **投影点数量** | **三处 → 保持三处（重排，不新增第四处）**：① **页面侧角标**（`pick-layer.js`，零改动）② **流内 `ref` 卡**（含**证据层**与两条恢复路径）③ **状态栏风险 chip**（「引用失效」类）。原来的「L0 chip」（`#l0-ref-toggle` + `#l0-ref-badge`）与「L1 证据面板」（`#l1-ref`）**被吸入流内 `ref` 卡** ⇒ 投影点总数**不增加**（否决「新增第四处」：更多投影点 = 更多漂移面，R-CHAT-003 教训） |
| **真值源唯一** | `l1/ref-store.ts` 仍是**引用真值源**；`ref` 卡是**注册表的投影 + 事件记录**（O-CHAT-002②）；卡的 `data-ref-state` 由**实时判定**驱动（判定变化 ⇒ patch 卡到 `stale`，即**终态**），`refNum` 来自注册表单调序号 |
| **旧卡零改动** | 重拾 / 重锚 ⇒ 生成**新** `ref` 事件（新 `cardId`、`refNum+1`）⇒ **新卡**；旧卡冻结在 `stale`（沿用 R3 的 append-only 纪律） |
| **两条恢复路径** | 「重新拾取」→ `requestPick()`（ADR-V4-038 的单一入口）；「改用描述」→ 卡内兜底输入（**默认收起**，点开才出现）⇒ 法四 |
| **判定语义零变更** | `ref-validity.ts` 的五维 + fail-closed + `isRefUsable = verdict === 'valid'` **零改动**（不改判定链 / 不放宽） |

### 2.3 系统事件行与 6+ 通道归并（ADR-V4-036）

```text
6 条 strips + 导航失效 + 探测态 + 会话切换 + 超时/取代 + 引用失效/重锚
        │  （每个来源只调用 appendSystem(kind, text) —— **唯一通道**）
        ▼
appendSystem(kind, text) ── ① 净化（白名单 + assertStreamPlaintext）
                          ② 去重窗口（dedupeKey + 时间窗）
                          ③ 速率上限（每分钟行数 cap；超出 ⇒ 丢弃计数入状态栏，禁静默）
                          ④ 追加 system 事件（单行 + .ts）
        ▼
cards/system.ts ──▶ <li data-msg-type="system"> 单行 + <time class="ts">HH:MM:SS</time>
```

| 来源 | 归并后形态 | 既有语义保留 |
|---|---|---|
| `#env-guard`（role=alert） | `system` 行（`kind='env'`）+ 风险 chip（若属环境守卫类） | 异常态可见（仍是 alert 语义的流内等价物：`role="status"` 行 + 风险 chip） |
| `#site-hint` | `system` 行 | 站点提示可回看 |
| `#onboarding` / `#discovery-notice` | **首装卡**（`firstRun` 档的流内卡，计入该档密度）+ 可**终结**（沿用既有「已终结」条件） | 首装态独立档不被误判为默认密度；仍可终结 |
| `#notice`（**覆盖语义**） | `system` 行（**只追加，不再覆盖**） | `notice` 的最后一次覆盖语义被**取代**（FR-CHAT-053） |
| `#send-reason` | `system` 行（**按需**：仅在原因变化时追加，避免刷屏） | `sendDisabledReason` 文本与来源不改 |
| 导航失效 | `system` 行（沿用 `state.invalidated` 的 false→true **跳变**语义，`chat-state.ts:161-167`） | 只在跳变时追加（不重复） |
| 探测态（`probe.phase` / `steady` / `declarationAttempt`） | `system` 行（**稳态去噪**：只在相位**变化**时追加；R2 的稳态显示保留） | R2 的退避 + 稳态语义零改动（`auto-probe` 零改动） |
| 会话切换 / 超时 / 取代（v4-3） | `system` 行 | 复用 v4-3 的文案模板 |
| 引用失效 / 重锚（本叶） | `system` 行（「引用 N 已失效：目标元素已不存在」/「引用 N 已重锚为引用 N+1」） | E2 断言 |

**去噪规则（V44-O-3）**：
- `dedupeKey = kind + ':' + normalizedText`；同一 key 在 `SYSTEM_DEDUPE_WINDOW_MS = 5000` 内**不追加新行**（窗口过期后再次出现 ⇒ 追加新行，并前缀「持续」）；
- **速率上限** `SYSTEM_ROWS_PER_MINUTE_CAP = 20`；超出 ⇒ 不追加但 `dropped` 计数 +1，且该计数在**状态栏**可读（**禁静默**）；
- **只追加、不被下一次渲染/notice 覆盖**（FR-CHAT-053）：`system` 行一旦追加即不可变（无终态字段亦不 patch）。

### 2.4 推荐卡（ADR-V4-037）

**真值白名单（7 项，父 ADR-V4-015 / 裁决 5）**：引用状态 · 会话状态（含未答卡数）· 站点授权与信任态 · 命令档案静态面（`toolCount` / `subcommandCount`）· 探测状态 · 五类风险态 · onboarding 步骤。
**明确排除**：`deriveCounts().settings`（设置分区渲染计数）与任何「某视图有 N 项所以推荐它」的派生。

| 产生时机 | 候选来源 | 典型 chip |
|---|---|---|
| **拾取后** | 引用刚刚有效（`ref-store` 最新有效引用） | 「用引用 ① 做原地翻译」/「查看引用证据」 |
| **引用失效后** | 失效引用数 ≥1 | 「重新拾取」/「改用描述」/「查看失效原因」 |
| **空闲时**（一轮完成 ∧ 无未终态 ask ∧ 非 `pending` ∧ 无待用推荐卡） | 命令档案静态面 / 站点授权态 / 探测完成 | 「看看这页能做什么（命令目录 N 条）」/「打开审计查看已授权记录」 |
| **首装** | onboarding 步骤 | 「授权当前站点」/「了解 6 个页面手势」 |

**规则表与上限（可复算）**：

| 常量 | 值 | 依据 |
|---|---|---|
| `MAX_NEXTSTEP_CARDS_PER_ROUND` | **1** | 与「首屏卡 ≤2」和长会话可读性一致；推荐是**引导**而非列表 |
| `MAX_CHIPS_PER_CARD` | **3** | 与「单卡可点 ≤6」一致（3 chips + 兜底路径 ≤ 6） |
| `NEXTSTEP_PRIORITY` | `['risk-recovery', 'ref-action', 'onboarding', 'capability-discovery']` | 恢复类优先于发现类（风险优先原则） |
| `NEXTSTEP_MIN_INTERVAL_MS` | `10000` | 空闲态推荐的最小间隔（防刷屏；由 `pending`/轮次完成触发） |

| 约束 | 实现 |
|---|---|
| **chips 即指令** | 点击 → `requestTurn(chip)`：与 composer 提交**同一生产入口**（防旁路；仿 v3-4 的 `AC-CONV-2` 唯一入口纪律） |
| **`pending` 门控** | `pending === true` ⇒ chips **禁用**（`disabled` + `aria-disabled`，不隐藏）且**不生成新推荐卡**（FR-CHAT-063）；`pending` 结束 ⇒ 重新评估候选 |
| **无候选不渲染** | 候选集为空 ⇒ **不渲染** `nextstep` 卡（EC-CHAT-008；禁「下一步：无」式假推荐） |
| **安全边界** | ① **不推荐被拦 / 被 deny 的动作**（候选生成前查 `insight` 策略投影与 `evaluate` 结论；不确定 ⇒ 不推荐）② **不含明文**（文案走 `assertStreamPlaintext` + 静态文案/结构化字段拼接）③ 不推荐会变更授权集合的动作 |

### 2.5 拾取入口迁移与救援路径重锚（ADR-V4-038）

| 项 | 现状 | v4 |
|---|---|---|
| 面板侧入口 | `#l0-pick`「从页面拾取」是 L0 常驻入口（`index.html:1243`；`l0/shell.ts:100-102` 渲染禁用态与原因） | **退役**（法一：一次性交互不得在工具栏/浮层；拾取 = 一次性交互） |
| 页面侧入口 | `pick-layer.js`（v3-4 第 5 bundle，已授权站点按需注入） | **保持可达**（**零改动**） |
| 引用卡「重新拾取」 | `l1/panels.ts:259` `el('l1-ref-repick').addEventListener('click', () => pick.click())` —— 依赖 `#l0-pick` 的 DOM 按钮 | **替换为 `requestPick()`**：`pick-input.ts` 新增单一生产入口（`startPick()` 的薄封装）；`cards/ref.ts` 与设置视图引导都调用它 |
| 未授权站点 | 需在 `#topbar`（默认 `hidden`）里发现 `#authorize` | `#settings-view` 的「站点与授权」分区（v4-1 落地）内含 `#authorize` + 拾取指引文案；**未授权零注入**（不为了拾取而注入任何东西） |
| 可发现性 | `#l0-pick` 常驻可点 | ① 已授权站点：页面侧入口（页面内拾取 UI）② 面板内：`ref` 卡的「重新拾取」/ 推荐卡的「重新拾取」chip ③ 未授权：设置视图内的授权入口 + 指引 |
| **布线门禁** | —— | 新增 `test/ref-pick-wiring.test.ts`（仿 `test/ref-wiring.test.ts` 的 AC-CONV-2 模式）：断言 `requestPick()` 是**唯一**生产入口（`startPick()` 只被它调用；DOM 上不存在指向 `#l0-pick` 的引用） |

### 2.6 V3-VOL-3 收口锚（ADR-V4-039 / ADR-V4-040）

**收口操作序列（本叶收口轮执行，逐步骤留痕）**：

| 步 | 动作 | 产物 / 判据 |
|:--:|---|---|
| 1 | `npm run build --workspace @lgdl/web-cli-plugin` → `stat -c %s dist/sidepanel.js` | `B_final`（实测字节，唯一数值来源） |
| 2 | 五要素重登记 `SIDEPANEL_BASELINE_BYTES = B_final` | `_HISTORY` + `_TIMELINE` + `SIDEPANEL_RE_REGISTRATIONS`（前值 / 新值 / 日期 / 来源 / 理由 / 历史保留） |
| 3 | 推导绝对上限：`absoluteCeilingBytes = ceilTo50KB(B_final) × 1.10`，`ceilTo50KB(x) = ⌈x / 51200⌉ × 51200` | 推导记录（`B_final` + 档位 + 余量） |
| 4 | **交作者一句确认** | `docs/v4-supersession-ledger.json#v3Vol3Closeout.authorConfirmation`（日期 + 原话/结论） |
| 5 | `PENDING_ABSOLUTE_CAP` 置 `resolved: true` + `newBaselineBytes` + `absoluteCeilingBytes` + `resolvedOn`（`YYYY-MM-DD`） | `evaluatePendingAbsoluteCap()` 通过；**未预填、未静默删除标记** |
| 6 | `evaluateSidepanelSize()` 判定改为 `effectiveCeiling = min(absoluteCeilingBytes, floor(currentBaseline × 1.05))` | 「绝对上限是硬墙、5% 是轮内软纪律」（裁决 6） |
| 7 | 反证（实跑）：① `sidepanel.js` +1 B 至**超过 absoluteCeiling** ⇒ FAIL；② 构造「≤ 绝对上限但 > 5% 公式」的格 ⇒ FAIL（证明软纪律仍生效）；③ 构造「≤ 5% 公式但 > 绝对上限」的格 ⇒ FAIL（证明硬墙生效）；三者还原 ⇒ PASS | `test/size-ruling-vol3.test.ts`（**只增**断言）+ 日志落盘 |
| 8 | `SIDEPANEL_CEILING_CAP` 保持 `record-only` **不被读取** | 判定器不读 cap 的断言（FR-CHAT-093） |

---

## 3. 方案对比（本叶开放点）

### 3.1 P-V44-01 引用投影点数量

| 维度 | **方案 A：保持三处（重排：页面角标 / 流内 ref 卡含证据 / 状态栏风险 chip）** | 方案 B：四处（保留 L0 chip，另加流内卡） | 方案 C：两处（删状态栏风险 chip，只留页面角标 + 流卡） |
|------|:--|:--|:--|
| 描述 | L0 chip 与 L1 证据面板**吸入**流内 ref 卡；状态栏保留「引用失效」风险 chip | L0 chip + 流卡 + 页面角标 + 风险 chip | 风险 chip 不再承载引用失效 |
| 优点 | ① 投影点**不增加**（R-CHAT-003 教训）② 证据层与恢复路径**同卡**（用户不需跨区找）③ 风险 chip 仍保证「失效可发现」 | L0 常驻 chip 让失效在默认屏更醒目 | 投影点最少 |
| 缺点 | 失效的可发现性依赖状态栏 chip 与流内卡（需门禁保证） | **多一个漂移面**；且 `#l0-ref-toggle` 属被取代的 L0 骨架（保留会拖住取代） | **违反 FR-CHAT-004 / FR-CHAT-013**（引用失效是五类风险之一，必须常驻可发现） |
| 风险 | 低 | 中高（漂移） | **不可接受** |
| 工作量 | 中 | 中 | 低 |

### 3.2 P-V44-02 系统事件的去噪策略

| 维度 | **方案 A：追加前去重窗口 + 速率上限 + 丢弃计数登记（只追加，不 patch）** | 方案 B：合并到已有行（改写既有行文本） | 方案 C：无去噪（全部追加） |
|------|:--|:--|:--|
| 描述 | `dedupeKey` + 5 s 窗口；每分钟上限 20；超出计 `dropped` 并在状态栏可读 | 找到同 key 的已有行并更新其文本/计数 | 每条来源变化都追加 |
| 优点 | ① **符合「只追加、不被覆盖」**（FR-CHAT-053）② 稳态不刷屏（R2 稳态语义协和）③ 丢弃**不静默** | 行数不增 | 实现最简 |
| 缺点 | 窗口内的事件被「吞掉」（但语义相同 ⇒ 无信息损失；且窗口后仍会追加） | **改写既有行 = 覆盖**（违反 FR-CHAT-053 与「留痕即事实」） | 稳态刷屏（NFR-CHAT-011 长会话可读性） |
| 风险 | 低 | 中高 | 中 |
| 工作量 | 低 | 低 | 零 |

### 3.3 P-V44-03 推荐 chip 的点击语义实现

| 维度 | **方案 A：复用 composer 提交的同一生产入口（`requestTurn`）** | 方案 B：chip 自带 handler 直接发消息 | 方案 C：chip 把文本填入 composer 并聚焦（等用户再点发送） |
|------|:--|:--|:--|
| 描述 | chip 点击 → `requestTurn(chipCommand)`，与用户键入提交**同一条路径**（同一校验/门控/审计） | 每个 chip 一个 handler | 填入输入框 |
| 优点 | ①「直接发起回合」满足 FR-CHAT-061 ② 门控（`pending` / `sendDisabledReason`）**必然一致**（同一路径）③ 布线门禁可断言唯一入口（仿 v3-4 AC-CONV-2） | 实现直白 | 用户可控 |
| 缺点 | 需要把 composer 提交逻辑抽为可复用入口（小重构） | 门控易漂移（两处判 `pending`）⇒ 与 FR-CHAT-063 张力；布线门禁难 | **违反 FR-CHAT-061**（不直接发起回合；且「不复制到输入框」被逐字禁止） |
| 风险 | 低 | 中高 | **不可接受** |
| 工作量 | 中 | 低 | 低 |

### 3.4 P-V44-04 「未授权站点」的拾取可发现性

| 维度 | **方案 A：设置视图内「站点与授权」分区（授权入口 + 拾取指引文案）；未授权零注入** | 方案 B：工具栏加一个常驻「拾取」入口 | 方案 C：未授权站点也注入拾取层（仅用于引导） |
|------|:--|:--|:--|
| 描述 | 法则六：管理操作归视图；首装路径在设置视图内可发现授权入口 + 指引 | 工具栏新增入口 | 未授权也注入 |
| 优点 | ① 满足 EC-CHAT-007 与 FR-CHAT-016 ② **未授权零注入**（`test/zero-injection` 27 断言保持）③ 工具栏可点保持 5 | 最易发现 | 引导最直接 |
| 缺点 | 需一次打开设置视图的交互 | **打破工具栏 ≤5**（需置换掉一个视图入口）且违反法一（拾取是一次性交互） | **直接违反零注入红线**（FR-CHAT-055 / AC-CHAT-020） |
| 风险 | 低 | 中高（纪律违规） | **不可接受** |
| 工作量 | 低 | 低 | 低 |

---

## 4. 推荐方案

| 开放点 | 推荐 | 理由 |
|--------|------|------|
| P-V44-01 投影点数量 | **方案 A**（保持三处，重排） | 投影点不增加（抗漂移）；证据层与恢复路径同卡（用户不必跨区）；风险 chip 保住失效可发现性 |
| P-V44-02 去噪策略 | **方案 A**（追加前去重 + 速率上限 + 丢弃登记） | 唯一与「只追加、不被覆盖」相容的形态；丢弃不静默 |
| P-V44-03 chip 点击 | **方案 A**（同一生产入口） | 唯一让「chips 即指令」与「门控一致性」同时成立的形态；可被布线门禁断言 |
| P-V44-04 未授权可发现性 | **方案 A**（设置视图内引导 + 零注入） | 唯一同时满足法则六、工具栏 ≤5、零注入红线的形态 |

**本叶编排器决策承接**：裁决 5（推荐真值白名单）· 裁决 6（绝对上限 vs 5% 的 `min()` 优先级）· O-CHAT-002（ref 卡 = 注册表投影 + 事件记录）· O-CHAT-004（绝对上限推导规则）· O-CHAT-006（推荐真值派生 + chips 即指令）· O-CHAT-009（竞品非阻塞、不编造）· D-P-V4-06（V3-VOL-3 父级收口锚由最后完成叶执行）· D-P-V4-07（取代与体积纪律）。

---

## 5. 文件影响分析（本叶）

| 操作 | 文件路径 | 说明 |
|:--:|------|------|
| NEW | `src/ui/sidepanel/cards/ref.ts` | `ref` 卡（有效 / 失效 / 原因 / 重拾 / 改用描述兜底默认收起 / 证据层 / 序号） |
| NEW | `src/ui/sidepanel/cards/system.ts` | `system` 事件行（单行 + `.ts` + 只追加） |
| NEW | `src/ui/sidepanel/cards/nextstep.ts` | 推荐卡（chips 即指令 + 上限 + 无候选不渲染） |
| NEW | `src/ui/sidepanel/recommend.ts` | 推荐生产者（真值白名单）+ 规则表 + 优先级 + 上限 + 安全边界判定 |
| NEW | `src/ui/sidepanel/system-events.ts` | `appendSystem(kind, text)` 单一通道（净化 + 去重窗口 + 速率上限 + `dropped` 计数） |
| NEW | `src/ui/sidepanel/stream-plaintext.ts` | 流内留痕零明文字段白名单 + `label` 工厂（v4-3 由 ask/auth 侧共用；本叶用于 ref/system/nextstep） |
| MODIFY | `src/ui/sidepanel/l1/ref-store.ts` | **仅追加**投影点事件接口（判定 / 序号 / 退役语义零变更） |
| MODIFY | `src/ui/sidepanel/l1/panels.ts` | `#l1-ref` 证据层吸入 `ref` 卡；`#l1-ref-repick` 的 `pick.click()` → `requestPick()` |
| MODIFY | `src/ui/sidepanel/pick-input.ts` | 新增 `requestPick()`（`startPick()` 的薄封装；**行为零变更**） |
| MODIFY | `src/ui/sidepanel/statusbar.ts` | 风险 chips 的事件源（失效 / 重锚 / 探测 / 硬底线）接入 `appendSystem` 的同一事件流 |
| MODIFY | `src/ui/sidepanel/sidepanel.ts` | 6 strips + `notice` + `send-reason` + 导航失效 + 探测态 → `appendSystem`；拾取入口接线 |
| MODIFY | `src/ui/sidepanel/index.html` | `#panel-bottom` 与 6 strips 容器移除（其语义已入流）；清空 `data-transitional-host` 占位宿主；`#onboarding`/`#discovery-notice` → 首装卡 |
| MODIFY | `src/ui/sidepanel/view-model.ts` | `systemEvents` / `refCards` / `nextstepCards` 视图模型 + 首装卡 |
| MODIFY | `src/ui/sidepanel/cards/index.ts` | 注册 `ref`/`system`/`nextstep`（12 项不变） |
| MODIFY | `test/size-baseline.ts` | **V3-VOL-3 带值闭合**（五要素 + `PENDING_ABSOLUTE_CAP` 三值 + `min()` 判定） |
| MODIFY | `test/size-ruling-vol3.test.ts` | 追加 `min()` 优先级断言 + 三条反证（**只增**） |
| MODIFY | `test/ui/l1.mjs` | 证据层 / 恢复路径 / 回执相关断言重锚（下界 ≥64 只增） |
| MODIFY | `test/ui/l0.mjs` | 风险 chips 事件源 + 零 `data-transitional-host` 收口断言 |
| MODIFY | `test/ui/page-input.mjs` | 面板侧拾取入口消失后的可达性断言（页面侧仍可达；102 断言只增） |
| NEW | `test/recommendation-sources.test.ts` | node：真值白名单（禁设置项计数）+ 规则表可复算 + 上限 + 无候选不渲染 + 安全边界 |
| NEW | `test/ui/recommendation.mjs` | Chromium：chips 即指令（同一入口）+ 上限 + `pending` 门控 + 无候选不渲染 + 系统事件行（`HH:MM:SS` + 只追加 + 去噪） |
| NEW | `test/ref-pick-wiring.test.ts` | node：`requestPick()` 唯一生产入口 + 无 `#l0-pick` 引用残留 |
| MODIFY | `test/gate-integrity.test.ts` | `EXPECTED_AUDITED_FILES` 追加 `test/ui/recommendation.mjs`（**不动 `CHROMIUM_GATES.length === 9`**） |
| MODIFY | `package.json` | scripts 追加 `test:recommendation` / `test:ref-pick-wiring` |
| MODIFY | `docs/v4-supersession-ledger.json` | 本叶 `entries` / `protectedRanges`（若 binding 段涉改则留痕；预期 keep）/ `counts` / **`v3Vol3Closeout`** 追加 |
| MODIFY | `docs/v4-density-baseline.json` | 首装卡 / 空态欢迎卡的实测登记 + 收口轮复测 |
| NEW | `.sddu/.../specs-tree-v4-4-ref-system-nextstep/plan.md` | 本文件 |
| MODIFY | `.sddu/.../specs-tree-v4-4-ref-system-nextstep/state.json` | `phase: specified → planned` |

---

## 6. 风险评估（本叶）

| 风险 | 概率 | 影响 | 缓解措施 |
|------|:--:|:--:|----------|
| **R44-01 推荐生产者越界（引入 LLM 产物或设置项计数真值）** | 中 | 高 | ADR-V4-037 的**真值白名单** + `test/recommendation-sources.test.ts` 的**导入集合静态断言**（⊆ 白名单模块）+ 禁 `deriveCounts().settings` 引用；若必须新增 LLM 侧 → **属新面，停下上报** |
| **R44-02 推荐 chip 点击绕开门控（`pending` 时仍可点）** | 中高 | 高 | chip 点击走**同一生产入口**（P-V44-03 方案 A）⇒ 门控必然一致；布线门禁断言唯一入口；`test/ui/recommendation.mjs` 断言 `pending` 期间 chips `disabled` |
| **R44-03 系统事件刷屏（长会话不可读）** | 中高 | 中 | 去重窗口 + 速率上限 + `dropped` 登记（P-V44-02 方案 A）；`NFR-CHAT-011` 长会话断言（≈320 卡 + 系统行轻量单行） |
| **R44-04 系统事件破零明文（URL query / 页面文本入流）** | 中高 | **极高** | `appendSystem` 的**唯一通道** + 净化（白名单 + `assertStreamPlaintext`）+ 渲染前二次校验；反向用例注入 ⇒ 抛错 |
| **R44-05 拾取入口迁移后救援路径断裂（EC-CHAT-007 / R-CHAT-012）** | 中 | 高 | `requestPick()` 单一入口 + `test/ref-pick-wiring.test.ts`（无 `#l0-pick` 残留）+ `test/ui/page-input.mjs` 的页面侧可达断言 + 未授权设置视图引导（**零注入**） |
| **R44-06 推荐卡与「首屏卡 ≤2 / 单卡可点 ≤6」冲突** | 中 | 中 | `MAX_NEXTSTEP_CARDS_PER_ROUND=1` + `MAX_CHIPS_PER_CARD=3` ⇒ 单卡可点 ≤6；空态下欢迎卡 ≤1；门禁逐卡复算 |
| **R44-07 收口体积超 ceiling / 绝对上限推导被质疑** | **高** | 中 | 五要素中间重登记（本叶 + 前三叶）→ 收口实测 `B_final`；`PENDING_ABSOLUTE_CAP` **不预填**、**不静默删除**；推导规则 = 「实测值上取整 50 KB 档 + 10% 余量」+ **作者确认**；`SIDEPANEL_CEILING_CAP` 保持 `record-only` |
| **R44-08 `counts` 下界在四叶重定标后跌破** | 中 | 高 | 每叶只增；v4 台账 `countMethod` 唯一合法值；反证 RP-V4-08（删 1 条 → FAIL） |
| **R44-09 与 v4-3 并行修改 `cards/index.ts` / `stream-model.ts`** | 中 | 中 | 文件级分工（本叶只加 ref/system/nextstep 卡与 `appendSystem`）；**门禁严格串行**；若冲突以 v4-3 先落 |
| **R44-10 收口轮「宿主清零」被遗漏（过渡态永久化）** | 中 | 中 | `test/ui/l0.mjs` 断言「v4 收口时 `document.querySelectorAll('[data-transitional-host]').length === 0`」（R4-18 结构性防护） |

---

## 7. 生成的 ADR（本叶：ADR-V4-035~040）

| ADR | 标题 | 状态 |
|-----|------|:--:|
| ADR-V4-035 | `ref-store` → 流内引用卡投影（**三处保持三处**：页面角标 / 流内 ref 卡含证据层 / 状态栏风险 chip；重拾生成新卡 + 旧卡零改动） | ACCEPTED |
| ADR-V4-036 | 系统事件行与 6+ 通道归并（`appendSystem` 单一通道 + 去重窗口 + 速率上限 + 丢弃计数登记 + 只追加不覆盖） | ACCEPTED |
| ADR-V4-037 | 推荐卡：真值白名单（7 项，禁设置项计数）+ 规则表/优先级/上限 + chips 即指令（同一生产入口）+ `pending` 门控 + 安全边界 | ACCEPTED |
| ADR-V4-038 | 拾取入口迁移与救援路径重锚（`requestPick()` 单一生产入口 + 页面侧可达 + 未授权设置视图引导 + 零注入 + 布线门禁） | ACCEPTED |
| ADR-V4-039 | **V3-VOL-3 收口序列**：重定基线（五要素）+ 绝对上限推导（50 KB 档 × 1.10 + 作者确认）+ `PENDING_ABSOLUTE_CAP` 带值闭合 + `min(绝对上限, 5% 公式)` 判定 | ACCEPTED |
| ADR-V4-040 | 每叶五要素中间重登记细则 + 本叶收尾全门禁清单 + 过渡态宿主清零 + 计数下界只增 | ACCEPTED |

### ADR-V4-035: `ref-store` → 流内引用卡投影

## 状态
ACCEPTED（承父 ADR-V4-014 上下文 + O-CHAT-002② / FR-CHAT-050~052 / AC-CHAT-012 / R-CHAT-012 / Q-CHAT-006；替代方案见 §3.1）

## 背景
现状引用生命周期投影在**3 个互不相邻位置**：① L0 chip + 徽标（`index.html:1249-1254` / `l0/shell.ts:106-113`）② L1 证据面板（默认 `hidden`，`index.html:1264-1281` / `l1/panels.ts:271-305`）③ 风险行（`l0/risk-rail.ts` + `shell.ts:120`）；数据源 `l1/ref-store.ts`（`seq` 单调**永不复用**、`retireUnusable()` 退役不删除、退役原因冻结、`repick()` 生成新引用且旧引用零改动 —— **已是 append-only 的现成先例**）。R3 已落地「新事实追加、旧事实冻结」的范式；Q-CHAT-006 记录「流内无引用卡」。

## 决策
1. **投影点数量 = 三处（重排，不新增第四处）**：① **页面侧角标**（`pick-layer.js`，**零改动**）② **流内 `ref` 卡**（含**证据层**与两条恢复路径）③ **状态栏风险 chip**（「引用失效」类）。原 L0 chip 与 L1 证据面板**被吸入** `ref` 卡 ⇒ 总数不变。**否决「新增第四处」**（更多投影点 = 更多漂移面；R-CHAT-003 教训）。
2. **真值源唯一 + 投影语义**：`l1/ref-store.ts` 仍是**引用真值源**（判定 / 序号 / 退役语义**零变更**）；`ref` 卡 = **注册表的投影 + 事件记录**（O-CHAT-002②）；每张卡携带 `{cardId, refId, refNum, pointId}`，`state` 由**实时判定**驱动。
3. **`ref` 事件与终态**：摄取 ⇒ `ref` 事件（`state:'valid'`）；判定转 `invalid` ⇒ **追加 `ref` 事件**（`state:'stale'`, `why`）使该卡进入**终态**（父 ADR-V4-012 的「已失效」终态）；终态卡**冻结**。
4. **重拾 / 重锚 ⇒ 新卡**：`repick()` / `reanchor()` 生成**新引用** ⇒ 追加**新 `ref` 事件**（新 `cardId`、`refNum+1`、`state:'valid'`）⇒ **新卡**；**旧卡零改动**（沿用 R3 append-only 纪律；`test/ui/stream.mjs` 断言旧卡 `outerHTML` 不变）。
5. **失效卡内容**（shim E3/E4）：`data-ref-state="stale"` + `.ref-stale-why`（可读原因）+ `[data-act="repick"]`（重新拾取）+ `[data-act="describe"]`（改用描述）+ **兜底输入默认收起**（`hidden`，点开才出现）。
6. **恢复路径实现**：「重新拾取」→ **`requestPick()`**（ADR-V4-038 的单一生产入口；**不再** `#l0-pick.click()`）；「改用描述」→ 卡内兜底输入 + 复用 `#ask` 的提交路径。
7. **系统事件行联动**：失效 ⇒ `appendSystem('ref', '引用 N 已失效：目标元素已不存在')`；重锚 ⇒ `appendSystem('ref', '引用 N 已重锚为引用 N+1（旧引用保留）')`（shim E2/E5 + H3）。
8. **判定语义零变更**：`ref-validity.ts` 的五维 + `isRefUsable = verdict === 'valid'`（fail-closed，**唯一放行点**）**零改动**；不放宽任何断言。

## 后果
- 「解析即消失」在引用面上被彻底消除：失效卡**保留**、原因可读、恢复路径在卡内、重锚生成新序号（旧卡零改动）。
- 投影点不增加 ⇒ 三处必须**同 id / 同序号**（`ref_<n>` 贯穿），这由既有 `ref-store` 单源 + 门禁的 id 贯穿断言保证。
- 代价：`#l0-ref-toggle` / `#l0-ref-badge` / `#l1-ref` 的既有断言需重锚到 `ref` 卡（同编号等价改写 + 台账），但语义（证据层只读 / 两条恢复路径）**保留**。

### ADR-V4-036: 系统事件行与 6+ 通道归并

## 状态
ACCEPTED（承 FR-CHAT-032/053/054 / AC-CHAT-011 / NFR-CHAT-011 / Q-CHAT-005 / V44-O-3；替代方案见 §3.2）

## 背景
现状系统信息散落 **6+ 条瞬时通道**：`#env-guard`（role=alert）/ `#site-hint` / `#onboarding` / `#discovery-notice` / `#notice` / `#send-reason`（`index.html:1370-1391`）+ 导航失效（仅跳变写一次，`chat-state.ts:161-167`）+ 探测态（`view-model.ts:166-222`）+ 顶部风险行（`l0/risk-rail.ts`）；`#notice` 是**覆盖语义**（`chat-state.ts:74,196-197`）⇒ 无时间戳、可被下一次覆盖、无顺序。shim E1 要求 ≥3 条带 `HH:MM:SS` 的事件行；H12 要求「声明无效 chip 与引用失效 chip 并存」。

## 决策
1. **唯一通道 `appendSystem(kind, text)`**（`system-events.ts`）：**所有**系统信息来源（6 strips + 导航失效 + 探测态 + 会话切换 + 超时/取代 + 引用失效/重锚）**只能**经此追加；无第二个写入点。
2. **四步管线**：① 净化（`assertStreamPlaintext` + 生成侧文案白名单）② 去重（`dedupeKey = kind + ':' + normalizedText`；`SYSTEM_DEDUPE_WINDOW_MS = 5000` 内不追加）③ 速率上限（`SYSTEM_ROWS_PER_MINUTE_CAP = 20`；超出 ⇒ `StreamState.dropped += 1`，**不追加**，计数在**状态栏**可读）④ 追加 `system` 事件。
3. **只追加、不被覆盖**：`system` 行一旦追加即**不可变**（无终态字段，也不 patch）；`#notice` 的覆盖语义被**取代**（同一事实的再次出现走**去重窗口**，窗口后仍会追加新行 ⇒ 不丢事实）。
4. **单行 + 时间戳**：`<li data-msg-type="system"><time class="ts">HH:MM:SS</time> text</li>`（shim E1 的「≥3 条可区分」）。
5. **语义保留矩阵**（§2.3 表）：`onboarding` / `discovery-notice` → **首装卡**（`firstRun` 档）+ **仍可终结**（沿用既有「已终结」条件）；`env-guard` 的 alert 语义 → `role="status"` 流内行 + 风险 chip；`send-reason` → 只在原因**变化**时追加；导航失效 → 沿用 false→true **跳变**语义；探测态 → 只在相位**变化**时追加（R2 的稳态去噪保留）。
6. **风险 chips 与系统行同源**：状态栏 chips 的「引用失效 / 声明无效 / 探测中」等由**同一事件流**派生（避免两套来源）；风险 chips **永不折叠**（v4-1 的 J1~J4 判据不变）。
7. **否决**：合并到已有行（§3.2 方案 B：改写 = 覆盖）、无去噪（方案 C：稳态刷屏，破坏 NFR-CHAT-011）。

## 后果
- 「系统事件有顺序、有时间戳、可回看、不被覆盖」由**单一通道 + 四步管线**保证；6 条通道的既有语义逐条保留（§2.3 矩阵）。
- `dropped` 计数写入状态栏 ⇒ 丢弃**不静默**（可审计）。
- 代价：`system` 行在长会话中数量可观（受速率上限约束）；`#panel-bottom` / 6 strips 容器移除 ⇒ 相关既有断言需重锚（同编号等价改写 + 台账）。

### ADR-V4-037: 推荐卡（真值白名单 + 规则表 + chips 即指令 + 门控 + 安全边界）

## 状态
ACCEPTED（承父 ADR-V4-015 / §12 裁决 5 / O-CHAT-006 / FR-CHAT-060~064 / AC-CHAT-013 / A-CHAT-009 / EC-CHAT-008；替代方案见 §3.3）

## 背景
「下一步推荐」是本 Feature **唯一需要新增生产者**的内容类型（Q-CHAT-003：现状无生产者/无通道/无 UI，grep 零命中；5 处静态字符串散落）。父裁决 5 明确：**禁止依赖设置项计数类真值**（避开 v3 F6 豁免坑），只允许**面板级可得真值**；FR-CHAT-060 明确**不新增 LLM 侧产物**。

## 决策
1. **真值白名单（7 项，唯一允许的派生来源）**：
   ① 引用状态（`l1/ref-store`：有效 / 失效 / 最近重锚）
   ② 会话状态（活跃 `sessionId` / 未答卡数 / 当前段是否为空）
   ③ 站点授权与信任态（`authorized` / `trust`）
   ④ 命令档案**静态面**（`insight/catalog-meta`：`toolCount` / `subcommandCount`）
   ⑤ 探测状态（`probe.phase` / `steady`）
   ⑥ 五类风险态
   ⑦ onboarding 步骤（首装态专用）
   **明确排除**：`l2/counts.ts#deriveCounts().settings`（设置分区渲染计数）；任何「因为某视图有 N 项所以推荐它」的派生；任何需要新 LLM 调用的内容。
2. **规则表（可复算，落 `recommend.ts` 常量 + `NEXTSTEP_RULES`）**：

   | 规则 id | 触发条件（真值） | 候选 chips | 优先级 |
   |---|---|---|---|
   | `R-RISK-RECOVERY` | 失效引用 ≥1 ∨ 声明无效 ∨ 硬底线被拦 | 「重新拾取」/「改用描述」/「查看失效原因」 | 1（最高） |
   | `R-REF-ACTION` | 存在**有效**引用 ∧ 无待用推荐卡 | 「用引用 N 做原地翻译」/「查看引用证据（选择器/路径/摘要）」 | 2 |
   | `R-ONBOARDING` | `firstRun` 档 ∧ onboarding 未终结 | 「授权当前站点」/「了解 6 个页面手势」 | 3 |
   | `R-CAPABILITY` | 授权 ∧ 探测完成 ∧ 空闲（§2.4 的时机） | 「看看这页能做什么（命令目录 N 条）」/「打开审计查看已授权记录」 | 4 |

3. **上限与节奏**：`MAX_NEXTSTEP_CARDS_PER_ROUND = 1` · `MAX_CHIPS_PER_CARD = 3` · `NEXTSTEP_MIN_INTERVAL_MS = 10000`（空闲态）；**无候选 ⇒ 不渲染卡**（EC-CHAT-008）。
4. **产生时机**：拾取后 / 引用失效后 / 空闲时（一轮完成 ∧ `openAsks` 为空 ∧ 非 `pending` ∧ 无待用推荐卡）/ 首装；**不在** `pending` 期间生成（FR-CHAT-063）。
5. **chips 即指令（同一生产入口）**：chip 点击 → `requestTurn(command)`，与 composer 提交走**同一条路径**（同一门控 / 同一校验 / 同一审计）⇒ 「直接发起回合」（FR-CHAT-061）与「与 `pending` 门控一致」（FR-CHAT-063）**同时由结构保证**；**不跳浮层 / 不复制到输入框**（逐字禁止）。
6. **`pending` 门控**：`pending === true` ⇒ chips `disabled` + `aria-disabled`（**不隐藏**，避免布局跳动）且不生成新卡。
7. **安全边界**：
   - **不推荐被拦 / 被 deny 的动作**：候选生成前查 `insight` 策略投影与既有 `evaluate` 结论；**不确定 ⇒ 不推荐**（fail-closed）；
   - **不含明文**：文案走 `assertStreamPlaintext` + 静态文案 / 结构化字段拼接（`label` 工厂）；
   - **不推荐会变更授权集合的动作**（推荐面只做「发起回合」与「打开视图」）。
8. **机器化**：`test/recommendation-sources.test.ts` 静态断言 `recommend.ts` 的导入集合 ⊆ 白名单模块 + 禁 `settings` 引用 + 规则表可复算 + 上限 + 无候选不渲染 + 安全边界（deny 动作不入候选）；`test/ui/recommendation.mjs` 断言 chips 点击走同一入口、`pending` 门控、无候选不渲染。
9. **否决**：引入 LLM 侧产物（新面）、以设置项计数为真值（F6 豁免坑复现）、chip 把文本填入 composer（§3.3 方案 C，违反 FR-CHAT-061）。

## 后果
- 推荐（能力发现 G-CHAT-004）**零新增网络/隐私/成本面**，生产者可被静态门禁约束（白名单 + 唯一入口）。
- `pending` 门控与 chips 可用性一致 ⇒ AC-CHAT-014 在本叶也有支撑点。
- 代价：推荐内容被限制在「既有真值能表达」的集合内（刻意：优先「可机器验证 + 零新面」）；若未来需要 LLM 侧推荐 → 另立 feature/ADR。

### ADR-V4-038: 拾取入口迁移与救援路径重锚

## 状态
ACCEPTED（承 FR-CHAT-055 / EC-CHAT-007 / AC-CHAT-012 / R-CHAT-012 / NFR-CHAT-005；替代方案见 §3.4）

## 背景
现状面板侧 `#l0-pick`「从页面拾取」是 L0 常驻入口（`index.html:1243`；`l0/shell.ts:100-102` 渲染禁用态与原因）。F 稿把拾取入口放在**页面侧**（「拾取入口在页面里，不占面板密度预算」）。连带问题：① 引用卡「重新拾取」**复用了 `l1/panels.ts:259` 的 `pick.click()`** ⇒ 该复用点失效；② v3 的可发现性契约（凡收起必有摘要/计数 + 文字入口）在面板侧失去对应拾取入口；③ 页面侧注入只在**已授权站点**存在（零注入红线）。

## 决策
1. **面板侧 `#l0-pick` 退役**（法一：拾取是一次性交互，不得在工具栏/状态栏；且它属被取代的 L0 骨架）。
2. **`requestPick()` = 单一生产入口**（`pick-input.ts` 新增；`startPick()` 的**薄封装**，行为零变更）：
   - `cards/ref.ts` 的「重新拾取」调用它；
   - 推荐卡的「重新拾取」chip 调用它（经由 `requestTurn`? **不** —— 拾取是本地动作，不经回合入口；见第 5 条）；
   - **不得**再有第二处直接调用 `startPick()`。
3. **页面侧入口保持可达**（`pick-layer.js` **零改动**）：已授权站点的页面内拾取 UI（Alt 悬停 / 拖动 / 双击 / 悬停⊕ / 右键自绘）继续可用。
4. **未授权站点的可发现性**：`#settings-view` 的「站点与授权」分区内含 `#authorize` + **拾取指引文案**（说明「授权后在页面内拾取」）；**未授权零注入**（不为了拾取而注入任何脚本/内容脚本；`test/zero-injection.test.ts` 的 27 断言保持）。
5. **两个入口的分工（明确）**：
   - **拾取（本地动作）** → `requestPick()`（不经回合入口、不受 `pending` 门控，因为它是用户主动的页面侧交互）；
   - **推荐 chip（发起回合）** → `requestTurn()`（受 `pending` 门控）。
   两者**不同入口**且各自唯一，均由布线门禁断言。
6. **布线门禁**：新增 `test/ref-pick-wiring.test.ts`：
   - 断言 `startPick()` 的**唯一调用点**是 `requestPick()`；
   - 断言 `src/ui/sidepanel/**` 内**零** `#l0-pick` / `getElementById('l0-pick')` 引用；
   - 断言 `cards/ref.ts` 的 repick 走 `requestPick()`。
7. **既有断言迁移**：`test/ui/l0.mjs` 的「拾取入口可发现性」断言改为「设置视图内授权入口可发现 + 未授权零注入」；`test/ui/page-input.mjs` 的页面侧断言保持（102 只增）。
8. **否决**：工具栏加常驻拾取入口（§3.4 方案 B：打破 ≤5 + 违反法一）、未授权也注入（方案 C：破零注入红线）。

## 后果
- 拾取入口消失带来的**可发现性与救援路径断裂**被三条资产补上：① ref 卡内「重新拾取」② 推荐卡的恢复 chip ③ 设置视图内的授权引导；且**未授权零注入**不变。
- `requestPick()` / `requestTurn()` 两个单一入口把「本地动作」与「回合动作」的语义边界固定，避免未来的门控漂移。
- 代价：`requestPick()` 作为一层薄封装看似冗余，但它是**唯一调用点**的可断言载体（防旁路）。

### ADR-V4-039: V3-VOL-3 收口序列与绝对上限推导

## 状态
ACCEPTED（承父 ADR-V4-010 / §12 裁决 6 / FR-CHAT-090~093 / AC-CHAT-018 / O-CHAT-004 / EC-CHAT-011）

## 背景
`PENDING_ABSOLUTE_CAP{resolved:false, 三值 null}` + `evaluatePendingAbsoluteCap()`（标记缺失 ⇒ FAIL / `resolved:false` 禁止预填 / `resolved:true` 三值齐备 ∧ `absoluteCeilingBytes ≥ newBaselineBytes` ∧ `resolvedOn ∈ YYYY-MM-DD`）。义务原文：「**方案 F 重构（聊天流统一承载）落地收口时，必须重新定 sidepanel 体积基线并设置绝对值上限**」。当前 `SIDEPANEL_BASELINE_BYTES = 375_102` / `SIDEPANEL_CEILING = 393_857`（×1.05）；`SIDEPANEL_CEILING_CAP` 已是 `record-only`（V3-VOL-1 ② 的教训：不设自缚装置）。v4 是**净增** Feature。

## 决策
1. **收口序列**（§2.6 的 8 步，逐步留痕）：build → 实测 `B_final` → 基线五要素重登记 → 推导绝对上限 → **作者一句确认** → `PENDING_ABSOLUTE_CAP` 带值闭合 → `min()` 判定 → 反证。
2. **新基线** = `B_final`（唯一数值来源 = `stat -c %s dist/sidepanel.js`），五要素：`previousBaselineBytes = 375_102` / `newBaselineBytes = B_final` / `measuredOn` / `source = dist/sidepanel.js` + `buildCommand` / `reason = 「方案 F 重构落地收口（三区 + 聊天流统一承载 + 留痕）」` / 历史保留（`_HISTORY` + `_TIMELINE` + `SIDEPANEL_RE_REGISTRATIONS`）。
3. **绝对上限推导（不预填先验魔法数）**：`absoluteCeilingBytes = ceilTo50KB(B_final) × 1.10`，其中 `ceilTo50KB(x) = ⌈x / 51200⌉ × 51200`；推导记录（`B_final` + 档位 + 余量）写入 `docs/v4-supersession-ledger.json#v3Vol3Closeout.derivation`。
4. **作者确认**：绝对上限数值交**作者一句确认**后写入；确认记录（日期 + 结论）落 `#v3Vol3Closeout.authorConfirmation`。**未获确认不得闭合**（可保持 `resolved:false` 并在收口报告如实登记）。
5. **`min()` 优先级（裁决 6）**：`evaluateSidepanelSize()` 的判定 = `effectiveCeiling = min(absoluteCeilingBytes, floor(currentBaselineBytes × 1.05))`。**绝对上限是硬墙（长期）、5% 公式是轮内软纪律**；两者并存时取小。
6. **不设自缚装置**：`SIDEPANEL_CEILING_CAP` 保持 `record-only`，**判定器不得读取它**（FR-CHAT-093 / NG-CHAT-007）；绝对上限的哲学 = 「实测值 + 10% 余量」（**不是**「Feature 冻结上限」式自缚）。
7. **反证（实跑，逐条声明 `expectFailPattern`）**：① `sidepanel.js` +1 B 至**超过** `absoluteCeilingBytes` ⇒ FAIL；② 构造「≤ 绝对上限但 > 5% 公式」的格 ⇒ FAIL（软纪律仍生效）；③ 构造「≤ 5% 公式但 > 绝对上限」的格 ⇒ FAIL（硬墙生效）；三者还原 ⇒ PASS；日志落盘（FAIl 段 + PASS 段，禁 tail 截断）。
8. **边界情况**（EC-CHAT-011）：若收口实测 `B_final` 使 `absoluteCeilingBytes` 约束过紧、挡住合法功能 → **不静默放宽**，须作者裁决心（显式重登记 / 参数微调）；若 `sidepanel.js` 超限 → 门禁 FAIL（收敛体积或走显式重登记）。

## 后果
- `PENDING_ABSOLUTE_CAP` 从「未闭合的硬义务」变为「带值闭合 + 可 FAIL 判定」；V3-VOL-3（D7①）完成。
- `min()` 让「绝对硬墙」与「轮内 5% 护栏」同时有效且互不掩盖；`SIDEPANEL_CEILING_CAP` 的教训（自缚装置）不再重演。
- 代价：收口必须等 `B_final` 稳定（因此由**最后完成叶**执行）；作者确认是一次外部依赖（未确认时保持 `resolved:false` 并如实登记，**不伪闭合**）。

### ADR-V4-040: 每叶五要素中间重登记细则 + 收尾门禁清单

## 状态
ACCEPTED（承父 ADR-V4-010 / FR-CHAT-094 / AC-CHAT-018/019/023 / NFR-CHAT-007/009）

## 背景
v4 是净增 Feature，四叶各自会抬升 `sidepanel.js`。父 spec §10.4 规定：单轮五要素披露（中间重登记）由**各叶**在自身轮次内执行；重定基线 + 设绝对上限由**最后完成叶**收口执行。同时「每叶收尾全门禁绿」（EC-CHAT-013）是硬纪律。

## 决策
1. **每叶五要素中间重登记（各叶收尾内完成，禁留给下一叶）**：
   `{measuredOn, newBaselineBytes, previousBaselineBytes, previousCeilingBytes, source, buildCommand, reason（direction=raised 时必须写「有意增重」的功能理由）, measuredBy（叶子 + 轮次）, reRegisteredFrom}`；旧值进 `SIDEPANEL_BASELINE_BYTES_HISTORY` / `_TIMELINE` / `SIDEPANEL_RE_REGISTRATIONS`；**容差 5% 不变**；`targetBudgetBytes` / `targetMet` 保持 `null`；断言零删减；反证（+1 B → FAIL）在新值上**重新驱动**。
2. **本叶收尾门禁清单（严格串行、一次一个 Chromium）**：
   `typecheck` → `build` → `npm test`（含新增 node 门禁）→ `test:supersession` → `test:gate-integrity` → `test:zero-injection` → `test:page-input` → `test:l0` → `test:l1` → `test:l2` → `test:density` → `test:ui` → `test:insight` → `test:binding` → `test:hardening` → `test:e2e` → `test:stream` → `test:ask-auth` → `test:recommendation` → `test:design-contract` → **`test:size-ruling-vol3`（收口闭合）**。
3. **过渡态清零**：`test/ui/l0.mjs` 断言 `document.querySelectorAll('[data-transitional-host]').length === 0`（v4 收口时零残留，R4-18）。
4. **计数下界只增**：journey ≥167 / insight ≥108 / binding ≥192 / l0 ≥73 / l1 ≥64 / l2 ≥68 / density ≥60 / sidepanel-view ≥38 / nodeTestRuntime ≥ max(646, 832)；v4 台账 `countMethod` 唯一合法值 `runtime-check-calls`；反证 RP-V4-08（删 1 条 → FAIL → 还原 → PASS）。
5. **元门禁**：`EXPECTED_AUDITED_FILES` 追加 `test/ui/recommendation.mjs`（**不动 `CHROMIUM_GATES.length === 9`**）；in-gate 反证例外文本追加 RP-V4 说明；`expectFailPattern` 声明数**只增**。
6. **不动面复核（逐项）**：`content.js` 177,076（无容差）/ `pick-layer.js` 33,900 / `manifest.json` 零 diff / `KIND_SET` 零 diff / 判定链 sha256 pin / `src/content/**` 三文件 hash / `packages/web-cli-base/**` 零 diff / v1·v2·v3 SDDU 目录零 diff。
7. **日志纪律**：全部门禁输出 `tee` 到 `/tmp/opencode/v4-gate-logs/<gate>.log`（**禁 tail 截断**）；反证必须实跑 FAIL → 还原 → PASS。
8. **本叶是最后完成叶** ⇒ 同时承担**父级收口总账**（`closeout.md`）的输入：把四叶的中间重登记链、V3-VOL-3 闭合证据、门禁末轮计数、取代台账条目数汇总（由父 Feature 的收口负责，本叶只提供证据）。

## 后果
- 「中间重登记」与「收口闭合」的职责边界清晰（各叶 vs 最后完成叶），不会出现「中间态被反复重登记」或「收口无人执行」。
- 过渡态宿主被结构性清零 ⇒ 不可能留下永久占位。
- 代价：本叶收尾门禁链最长（20 项，其中 6 个 Chromium 门禁），必须在排期里前置计入（R-CHAT-016）。

---

## 8. 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建（V4-4 叶子技术方案）。**产出**：本叶 `plan.md`（含 §1~§8 + **ADR-V4-035~040**）。**关键裁决**：① 引用投影点 = **三处保持三处**（页面角标 / 流内 `ref` 卡含证据层 / 状态栏风险 chip；L0 chip 与 L1 证据面板被**吸入**卡内；重拾生成新卡 + 旧卡零改动；判定语义零变更）；② 系统事件 = `appendSystem` **唯一通道** + 四步管线（净化 / 去重窗口 5 s / 速率上限 20 行每分钟 + `dropped` 登记 / 追加）+ **只追加不覆盖** + 6+ 通道语义保留矩阵 + 首装卡承载 onboarding/discovery-notice；③ 推荐卡 = **真值白名单 7 项**（禁设置项计数）+ 规则表 4 条 + `MAX_NEXTSTEP_CARDS_PER_ROUND=1` / `MAX_CHIPS_PER_CARD=3` / `NEXTSTEP_MIN_INTERVAL_MS=10000` + **chips 即指令走同一生产入口** + `pending` 门控 + 安全边界（不推荐被拦动作 / 不含明文）+ 无候选不渲染；④ 拾取入口 = `#l0-pick` 退役 + **`requestPick()` 单一生产入口**（与 `requestTurn()` 分工明确）+ 页面侧可达 + 未授权设置视图引导 + **零注入** + `test/ref-pick-wiring.test.ts` 布线门禁；⑤ **V3-VOL-3 收口 8 步**（build 实测 `B_final` → 五要素重登记 → `ceilTo50KB(B_final) × 1.10` → 作者确认 → `PENDING_ABSOLUTE_CAP` 三值闭合 → `min(绝对上限, 5% 公式)` → 三条反证 → `SIDEPANEL_CEILING_CAP` 保持 `record-only`）；⑥ 收尾门禁 20 项 + **过渡态宿主清零** + 计数下界只增 + 不动面逐项复核。**本阶段只做 plan**：不写 tasks、不写代码、不改 `src/**`·`test/**`·`dist/**`·`manifest.json`·ROADMAP、不动 `main`、不 commit/push、**不跑门禁 / 构建 / Chromium**。 | 2026-09-18 | SDDU Plan Agent |

