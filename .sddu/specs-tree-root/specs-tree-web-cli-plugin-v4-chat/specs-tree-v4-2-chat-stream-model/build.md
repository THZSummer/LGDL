# 构建报告：specs-tree-v4-2-chat-stream-model

> **文档定位**: SDDU 构建报告 — 记录全部任务的文件变更和实现结果，作为 review 阶段的输入
> **前置依赖**: 本叶 `tasks.md` v1.1（含 v4-1 移交的 TASK-613）、本叶 `plan.md`（ADR-V4-024~029）、父 `plan.md`（ADR-V4-002/003/004/012/013/026/028）、本叶/父 `spec.md`
> **创建人**: SDDU Build Agent
> **创建时间**: 2026-09-19
> **版本**: v1.0
> **更新人**: SDDU Build Agent
> **更新时间**: 2026-09-19
> **更新说明**: 初始创建（V4-2 全叶构建：13 任务（601~612 + 跨叶移交 613）· 7 波 · 20 门禁串行全绿 · 体积五要素中间重登记）

---

## 1. 构建概要

| 维度 | 数值 |
|------|:--:|
| 完成任务数 | **13 / 13**（TASK-601~612 + 跨叶移交 TASK-613） |
| 复杂度分布 | S×0 / M×8（602/605/606/608/609/611/612/613） / L×5（601/603/604/607/610） |
| 新增源文件 | **13**（stream-model / stream-digest / stream-render / cards（10 文件）） |
| 新增测试文件 | **3**（stream-model.test.ts / stream-persistence.test.ts / test/ui/stream.mjs） |
| 修改文件 | 17（见 §2） |
| 执行波次 | 7（+ 跨叶移交验收与 TASK-602/603 同轮交付） |
| 门禁 | **20 项串行全绿**（基线 19 + 新增 `test:stream`） |
| 体积 | `dist/sidepanel.js` 385,319 → **425,442 B**（+40,123 B，+10.41%；五要素重登记见 §9） |

**一句话结论**：把聊天流做成**不可变、单调、可回放的 append-only 事件流**（12 kind / 终态冻结 / 纯投影），落 **12 类卡**（7 主类 + 5 过程族）与**统一固化契约**，既有 5 种过程形态**零丢失**归位；渲染改为 **keyed 增量渲染**（永不清空、终态 DOM 冻结）；会话切换**不重置 `seq`**、旧段事件保留；摘要落库走**面板侧 `chrome.storage.local`** 的**零明文白名单**（零新权限、零 SW 改动、`KIND_SET`/`content.js` 零 diff）。

---

## 2. 文件变更

### 2.1 新增（NEW）

| 操作 | 文件路径 | 对应任务 | 说明 |
|:--:|------|:--:|------|
| NEW | `src/ui/sidepanel/stream-model.ts` | TASK-601 | `StreamEvent`（readonly + `Object.freeze`）/ `StreamState` / `appendEvent` / `boundStreamEvents(2000)` / `switchStreamSession` / `project()` 纯投影 / 终态冻结 / `liveCardIds` / `formatClock` |
| NEW | `src/ui/sidepanel/cards/index.ts` | TASK-602 / 603 | `CARD_TYPES`（12）单源 + `CARD_KIND_LAYER` 再导出 + 卡工厂注册表（total map）+ `askuser`/`auth`/`ref`/`nextstep` **骨架** + `patchCardNode` + 固化文案 |
| NEW | `src/ui/sidepanel/cards/shared.ts` | TASK-602 | 统一 DOM 契约（`createCardShell` / `clockNode` / `createFixedRegion`）+ 折叠阈值 **480/10** 单源 + 卡标签单源 |
| NEW | `src/ui/sidepanel/cards/ai.ts` | TASK-603 | AI 卡（富文本复用 `markdown.ts`，`patchAiCard` 无清空 API） |
| NEW | `src/ui/sidepanel/cards/user.ts` | TASK-603 | 用户卡（对侧气泡，verbatim） |
| NEW | `src/ui/sidepanel/cards/system.ts` | TASK-603 | `system` 单行事件行 + `command` 命令行（`.cmd`） |
| NEW | `src/ui/sidepanel/cards/tool.ts` | TASK-603 | 工具卡（工具名/✓✖/ms/预览/折叠记忆；失败卡 `.entry-error`）+ `patchToolCard` |
| NEW | `src/ui/sidepanel/cards/thinking.ts` | TASK-603 | 思考卡（两事件一卡 → 终态「已思考 N.Ns」；无 append 后 remove） |
| NEW | `src/ui/sidepanel/cards/error.ts` | TASK-603 | 错误卡（`.entry-error` 醒目 system 气泡） |
| NEW | `src/ui/sidepanel/cards/notice.ts` | TASK-603 | 工具通知卡（`.msg-notice`，与系统事件行分离） |
| NEW | `src/ui/sidepanel/stream-render.ts` | TASK-604 | keyed 增量渲染器（append/patch/remove(bound) + detach/re-attach + 空态占位；零清空 API） |
| NEW | `src/ui/sidepanel/stream-digest.ts` | TASK-605 | 摘要白名单 schema + `assertNoPlaintext` / `assertDigestSafe` + LRU 20 + 降级重建 `digestToEvents` |
| NEW | `test/stream-model.test.ts` | TASK-608 | node：不可变 / `seq` 单调（跨切换）/ 回放等价（双向）/ 终态冻结 / 无 null 消失 / bound 逐类不淘汰 / 分类学 |
| NEW | `test/stream-persistence.test.ts` | TASK-609 | node：白名单逐字段 / 零明文正反例（URL query · 命令参数体 · 密钥 · 标记）/ LRU 20 / 降级重建 / 篡改读回抛错 |
| NEW | `test/ui/stream.mjs` | TASK-610 | Chromium：12 卡型 / 过程族 5 形态字段 / 固化前后 / 节点引用不变 / 终态 `outerHTML` 冻结 / 滚动 / 320·400·520 / a11y / ≈320 卡长会话 / 计数守恒 |

### 2.2 修改（MODIFY）

| 操作 | 文件路径 | 对应任务 | 说明 |
|:--:|------|:--:|------|
| MODIFY | `src/ui/sidepanel/chat-state.ts` | TASK-606 / 607 | 新增 `stream: StreamState` + `streamBranch`（**追加**在 v1 reducer 之后；12 个既有 action 零删除）；`ask-resolved` 追加 `answer?/canceled?`；`history` 追加 `sessionId?/sessionLabel?`；新增 `stream-session` / `stream-merge` |
| MODIFY | `src/ui/sidepanel/sidepanel.ts` | TASK-604 / 605 / 607 | `render()` 流渲染段切 `streamRender(project(state.stream))`（退役清空 + `prevTop` 回写）；`toolOpenState` 键 `number → cardId`；摘要落库/读回接线；`dispatch` 注入 `at`；`reset()` 测试 seam 清流；新增 `streamSeed/streamStats/streamReset` 测试 seam |
| MODIFY | `src/ui/sidepanel/index.html` | TASK-603 / 604 | 卡契约样式（`.card-col`/`.card-head`/`.card-tag`/`.ts`/`.card-fixed`/`.ask-*`/`.auth-*`/`.ref-*`/`.next-*`）；`[hidden]` 显式复权 |
| MODIFY | `src/ui/sidepanel/density-scope.ts` | TASK-613 | 收紧：`MAX_STREAM_RESIDENT_CLICKABLES = 8` + `RESIDENT_NAV_ATTRS`（`data-chrome-control`/`data-toolbar-slot`）+ `RESIDENT_NAV_CLASSES`（`.view-btn`）+ `assertChromeNotInStream` 形态判据 |
| MODIFY | `test/ui/density.mjs` | TASK-613 | 新增 **RP-V4-09**（形态判据 + 首屏合计上限，两段证伪 9 条断言） |
| MODIFY | `test/ui/density-metrics.mjs` | TASK-613 | `MAX_STREAM_RESIDENT_CLICKABLES` 抽取 + `evaluateStreamResidentBudget` + `evaluateFirstScreen` 纳入合计上限 |
| MODIFY | `test/ui/density-metrics.d.mts` | TASK-613 | 类型面同步（新常量 + 新函数 + limits 字段） |
| MODIFY | `test/density-thresholds.test.ts` | TASK-613 | 纯判定新增（合计 ≤8 边界、可归因、上限可放开即 PASS/FAIL 的反证） |
| MODIFY | `test/ui/l0.mjs` | TASK-611 | 追加 §⑮ 两条（`#stream` 内卡不污染外壳密度 + 反向「该卡真的带 3 可点」）；不重命名文件 |
| MODIFY | `test/sidepanel-view.test.ts` | TASK-607 / 611 | 3 条静态断言按同语义重锚到 `cards/*` + 契约 ④ 追加（空态由流渲染器拥有） |
| MODIFY | `test/perf-budget.test.ts` | TASK-611 | 追加「320 卡 `project()` 有界且回放稳定 + bound 不淘汰受保护卡」 |
| MODIFY | `test/gate-integrity.test.ts` | TASK-611 | `EXPECTED_AUDITED_FILES` 追加 `test/ui/stream.mjs`（**不动** `CHROMIUM_GATES.length === 9`）；in-gate 例外扩到 RP-V4-01~09 |
| MODIFY | `test/size-baseline.ts` | TASK-612 | **五要素中间重登记**（385,319 → 425,442）+ 逐模块归因 `v42RoundRows` + v4-2 轮登记条目 |
| MODIFY | `test/size-budget.test.ts` / `test/size-growth-evidence.test.ts` / `test/size-ruling-vol3.test.ts` | TASK-612 | 方向敏感断言按新实测值重 pin；v4-1 轮 metafile 判据泛化为「最新一轮 rows」 |
| MODIFY | `package.json` | TASK-611 | scripts 追加 `test:stream` |
| MODIFY | `docs/v4-supersession-ledger.json` | TASK-612 / 613 | v4-2 `counts`/`v4GateFloors`/`entries`/`modifiedRanges`/`leafBases.registeredUncoveredLines`/`unfrozenZeroDiffFiles` 追加 |
| MODIFY | `docs/v4-density-baseline.json` | TASK-613 / 612 | `perCardBudget` 合计上限 + 形态判据 + `knownLimitations[0]` 重审结论 + `volume` 体积重登记 |

---

## 3. 任务完成清单

| 任务 | 名称 | 复杂度 | 状态 | 对应 FR |
|------|------|:--:|:--:|------|
| TASK-601 | `stream-model.ts` 事件模型 + 纯投影 + 终态冻结 | L | ✅ completed | FR-CHAT-020/021/025 · AC-CHAT-010 · NFR-CHAT-001 |
| TASK-602 | 卡分类学单源 + 固化/DOM 契约 | M | ✅ completed | FR-CHAT-021/022/036 |
| TASK-603 | 卡组件（7 主类 + 过程族 5 + 四类骨架） | L | ✅ completed | FR-CHAT-030~035/037 |
| TASK-604 | keyed 增量渲染 + 终态 DOM 冻结 | L | ✅ completed | FR-CHAT-022/023/037 · NFR-CHAT-003/011 |
| TASK-605 | 摘要落库（零明文白名单 + LRU + 降级重建） | M | ✅ completed | FR-CHAT-024/025 · NFR-CHAT-012 |
| TASK-606 | 会话切换语义（`seq` 不重置 + 分段 + 内存段保留） | M | ✅ completed | FR-CHAT-024/025 · EC-CHAT-003/006 |
| TASK-607 | `chat-state` 迁移 + `render()` 切换 + 折叠键迁移 | L | ✅ completed | FR-CHAT-020/022/026 |
| TASK-608 | `test/stream-model.test.ts`（node，六组） | M | ✅ completed | FR-CHAT-020/025 · NFR-CHAT-001 |
| TASK-609 | `test/stream-persistence.test.ts`（node，零明文 + 降级） | M | ✅ completed | FR-CHAT-024 · NFR-CHAT-012 |
| TASK-610 | `test/ui/stream.mjs`（Chromium，新门禁） | L | ✅ completed | AC-CHAT-001~005/011/022/025 · FR-CHAT-030~037 |
| TASK-611 | 联动门禁（l0 / sidepanel-view / perf / gate-integrity / scripts） | M | ✅ completed | FR-CHAT-022/023/084 · NFR-CHAT-003 |
| TASK-612 | 收口（全门禁串行 + 台账 + 五要素重登记） | M | ✅ completed | AC-CHAT-023 · FR-CHAT-094 |
| **TASK-613** | **卡预算 × 常驻入口准入重审（跨叶移交 N-03）** | M | ✅ completed | FR-CHAT-072/073/075 · AC-CHAT-023/025 |

> 逐项证据：TASK-601 → §4/§6；602/603 → §4/§5；604 → §6；605 → §5；606/607 → §7；608/609/610 → §8；611 → §8；612 → §9/§10；613 → §7.3。

---

## 4. 12 kind 枚举表（FR-CHAT-021 / FR-CHAT-036 / ADR-V4-026）

`stream-model.ts#STREAM_EVENT_KINDS` = `cards/index.ts#CARD_TYPES` = **12**（单一登记点，`test/stream-model.test.ts` 断言长度 12 ∧ 前 7 项与设计契约 `option-f-shim.mjs#CARD_TYPES` 逐字一致）。

| # | kind | 层 | 终端态 | 卡内可点上限（实测） | 样式载体（兼容类名） |
|:--:|------|:--:|------|:--:|------|
| 1 | `ai` | primary | 生来冻结（历史行） | 0 | `.msg-assistant` |
| 2 | `user` | primary | 生来冻结 | 0 | `.msg-user` |
| 3 | `nextstep` | primary | 生来冻结（骨架） | ≤3（chips） | `.msg-next` |
| 4 | `askuser` | primary | `answered` / `cancelled`（骨架，业务 v4-3） | 5（choice：≤3+其他+取消）/ 3（text） | `.msg-ask` |
| 5 | `auth` | primary | `approved` / `rejected`（骨架，业务 v4-3） | 2（+1 审计入口 at 终态） | `.msg-auth` |
| 6 | `system` | primary | **无终态**（单行只追加） | 0 | `.msg-system` |
| 7 | `ref` | primary | 生来冻结（骨架，判定 v4-4） | 2（stale：重新拾取/改用描述） | `.msg-ref` |
| 8 | `tool` | process | `completed`（`ok`/`ms`） | 0（`summary` 不计入） | `.tool-card` + 失败 `.entry-error` |
| 9 | `command` | process | 生来冻结（历史行） | 0 | `.cmd` |
| 10 | `thinking` | process | `completed`（两事件一卡） | 0 | `.msg-thinking` |
| 11 | `error` | process | 生来冻结（历史行） | 0 | `.entry-error` |
| 12 | `notice` | process | **无终态**（单行只追加） | 0 | `.msg-notice` |

**扩展纪律（禁静默，ADR-V4-029）**：新增第 13 类须同时改 ① `stream-model.ts#STREAM_EVENT_KINDS` ② 本注册表 ③ 设计 shim ④ `test/design-contract.test.ts` 常量与映射表 ⑤ v4 台账 `designContractChanges[]`。本叶**零新增 kind**、**零 `KIND_SET` diff**（`src/background/messaging.ts` 与 `manifest.json` 逐字节未动 —— 见 §10）。

---

## 5. 摘要落库：字段白名单 + 零明文实测（FR-CHAT-024 / NFR-CHAT-012 / ADR-V4-028）

**存储**：面板侧 `chrome.storage.local`，key = `web-cli/stream-digest:<sessionId>`（**零新增权限**；`storage` 已在静态权限），value = `{ v:1, updatedAt, entries }`（`updatedAt` 只服务 LRU）。

**白名单（`DigestEntry`，11 字段，类型层面无自由文本）**：
`seq · ts · kind · cardId · terminal · label(≤80，经 `sanitizeLabel` 截断 + 扫描) · tool · ok · ms · refNum · askRequestId`

**结构性保证**：`digestEntryOf()` **不读 `payload.text`** —— 没有显式 `label`/`tool` 的卡**不落任何文本**（`test/stream-persistence.test.ts`「label 永不从 payload.text 回退」）。

**零明文 FAIL 段原文**（注入 ⇒ 必抛错；日志 `/tmp/opencode/v4-gate-logs/v4-2/test.log`）：

```
✔ v4-2 摘要 ② 反向用例 1：URL query 注入 ⇒ assertNoPlaintext 必须抛错 (0.25ms)
   └ 抛错文案：流摘要出现 URL query：零明文纪律要求摘要不含 URL 参数（去参后只保留长度 / 路径 / basename）
✔ v4-2 摘要 ② 反向用例 2：命令参数体注入 ⇒ assertNoPlaintext 必须抛错 (4.39ms)
   └ 抛错文案：流摘要出现命令参数体：零明文纪律要求摘要不含命令参数（只允许命令名 / 动作 id / 结果 / 耗时）
✔ v4-2 摘要 ② 反向用例 3：密钥 / 原始标记注入 ⇒ 抛错 (6.64ms)
✔ v4-2 摘要 ① 白名单逐字段：DIGEST_FIELDS 恰为 11 个登记字段
✔ v4-2 摘要 ① assertDigestSafe：白名单外字段必须抛错（/白名单外字段/）
✔ v4-2 摘要 ④ 端到端：project(摘要事件) 复现时间线且正文为占位符 — 序列化串不含 REAL-USER-BODY / TOOL-BODY
✔ v4-2 摘要 ④ 读回时再次校验：落库被篡改（含 URL query）⇒ 抛错
```

`assertNoPlaintext` 四类形态：URL query · 命令参数体 · 密钥/令牌（含 bearer）· 原始标记（`< > \``）。**正例**：`site_notes-list` / `会话已切换：alpha.test` / 中文短语通过。

**LRU / 降级**：`MAX_DIGEST_SESSIONS = 20`（与 SW `MAX_SESSIONS` 对齐，独立按 `sessionId`）；面板重开读回 → 事实字段（`seq`/`ts`/`kind`/`terminal`/`tool`/`ok`/`ms`/`refNum`/`askRequestId`）全部保留，正文显示 **「（历史摘要）」**（`DIGEST_DEGRADED_BODY`），**不编造正文**；截断规则显式登记（`docs/v4-supersession-ledger.json` + 本文件 §11 偏差 2）。

---

## 6. keyed 增量渲染证据（FR-CHAT-022/023 · NFR-CHAT-003 · ADR-V4-025）

**唯一允许的 DOM 变更 = append / patch（仅未终态）/ remove（仅 `bound` 淘汰）**；`stream-render.ts` 内**零清空 API**（门禁静态 grep + 运行期节点身份断言）。

实测（`test/ui/stream.mjs`，真实 `dist/`，日志 `/tmp/opencode/v4-gate-logs/v4-2/test-stream.log`）：

```
✔ ④ 追加后既有卡节点引用不变（===，未整层重建）
✔ ④ 终态卡节点引用不变
✔ ④ 终态卡 outerHTML 逐字不变（DOM 冻结）
✔ ④ 追加只 +1 张卡（其余节点复用）
✔ ④ 容器 children 数 == project() 卡数（渲染与投影逐张一致）
✔ ④ 静态零命中：stream-render.ts 无 `textContent = ''`
✔ ④ 静态零命中：stream-render.ts 无 `replaceChildren(`
✔ ⑤ 上滚期间追加**不抢滚动**（scrollTop 保持不变）
✔ ⑤ 上滚后「回到底部」显示（hidden=false） / 点击后贴底（距离 ≤48px） / 贴底后 hidden 收起
✔ ⑥ 320/400/520px 文档级与 #stream 内零水平溢出（含长 URL 卡）
✔ ⑧ 批量追加 300 卡后总数 = 之前 + 300 ∧ 最早卡节点引用仍不变 ∧ 渲染卡数 == 投影卡数
```

**会话切换的 DOM 语义（登记项）**：`project()` 按**当前 `sessionId` 分段投影**（既有 journey #16e/#16g 「不串台」隔离断言是硬约束、本叶不得改弱）；非当前段的卡**从容器 detach 但仍留在 `nodes: Map`**（切回时**重挂同一个节点**，冻结 DOM 与折叠记忆零损失）。真正的**销毁**只发生在 `liveCardIds` 未命中时 —— 即 `boundStreamEvents` 淘汰路径。逻辑见 `stream-render.ts` 头注释（详见 §11 偏差 1）。

---

## 7. TASK-613 裁决：卡预算 × 常驻入口准入重审（来源 N-03 / v4-1 validate R1）

### 7.1 裁决文本（原文，禁默认沿用 v4-1 过渡口径）

> **裁决（2026-09-19，V4-2 build 轮）：保留「单卡可点 ≤6」，并按 v4-1 validate R1 的 N-03 结论**收紧**两条新判据 ——**
> **① 形态判据**：`#stream` 子树内出现带 `[data-chrome-control]`、`[data-toolbar-slot]` 或 `.view-btn` 的控件 ⇒ 判为**常驻导航入口**（不是「卡内容交互」），`assertChromeNotInStream()` 必须抛错。这是 N-02 指出、v4-1 收口轮「按红线只登记不修」的**第一层反向判定**，v4-2 在有产品改动的前提下落地（`density-scope.ts`）。
> **② 合计上限**：首屏（`default` / `empty` 档）可见卡**合计**可点 ≤ **8**（`MAX_STREAM_RESIDENT_CLICKABLES`，单源 `density-scope.ts`，纳入 `evaluateFirstScreen()`）。
> **判据合理性（可核）**：产品 12 类卡的**单卡**可点上限实测 = **5**（ask-user choice：≤3 选项 +「其他…」+ 取消）；首屏可见卡 ≤2（FR-CHAT-073）∧ 既有法一「一次恰一张决策卡」（FR-V3-011）⇒ **合法最坏首屏 = 1 张 ask 卡(5) + 1 张 nextstep 卡(3) = 8**，与上限严丝合缝；`default`/`empty` 档实测合计 **0**。
> **方向 = 收紧**：单卡 6 / 首屏 2 / 欢迎 1·8 行 / 密度阈值 `7/15 · 9/20 · 17/35` 逐字不变；新增的 8 是**新增上限**，不是放宽。v4-1 的理论形态「2 卡 × 6 = 12 个常驻入口」不再无判据可拦。

### 7.2 可 FAIL 反证（RP-V4-09，真会红 → 还原 → 必绿）

编号说明：v4 台账保护段反证已占用 `RP-V4-08`（journey pin 判据），故本叶新增反证编号为 **RP-V4-09**（避免双编号同义）。

`npm run test:density -- --reverse RP-V4-09`（日志 `/tmp/opencode/v4-gate-logs/v4-2/density-reverse.log`）：

```
▶ RP-V4-09：流内常驻导航入口（形态判据）+ 首屏卡合计可点 > 8 → 必须 FAIL → 还原 → PASS
✔ RP-V4-09 前置：基线首屏预算 PASS ∧ guard PASS（判据不恒真）
✔ RP-V4-09 (FAIL 段 ①) 首屏两卡合计 10 可点 ⇒ 首屏预算必须 FAIL
✔ RP-V4-09 FAIL 段 ① 诊断含「流内卡合计可点 10 > 8」
✔ RP-V4-09 归因：单卡预算仍 PASS（红的必须是**合计**，不是单卡规则）
✔ RP-V4-09 (FAIL 段 ②) 工具栏形态控件进入 #stream ⇒ 豁免守卫必须抛错
✔ RP-V4-09 FAIL 段 ② 诊断含「常驻导航入口」
✔ RP-V4-09 (还原后 PASS 段) 还原后首屏预算 + guard 均回到 PASS
▶ density RP-V4-09 反证: 9 passed / 0 failed    （EXIT=0）
```

### 7.3 登记落地

- `docs/v4-density-baseline.json#knownLimitations[0]`：由「v4-2 必须重审」**更新为「已重审 + 结论」**（原文见文件；同时保留 v4-1 历史文本，只追加不改写）。
- `perCardBudget` 新增 `streamResidentClickableLimit: 8` / `aggregateLimit: 8` / `aggregateCaliber` / `residentNavFormCriterion`。
- `density-scope.ts#CARD_BUDGET_LIMITS` 扩为五项；`test/density-thresholds.test.ts` 纯判定新增（合计边界 8 PASS / 10 FAIL + 上限可放开即变绿的反证）。
- **不影响既有反证**：RP-V4-01（单卡第 7 可点）/02（首屏第 3 卡）/03（第 2 欢迎卡、>8 行）/04/05/06/07 全部保持绿（density 171/0）。

---

## 8. 门禁账（TASK-612：20 项严格串行，全量日志 `/tmp/opencode/v4-gate-logs/v4-2/`）

| # | 门禁 | 命令 | 实测 | 基线 | EXIT | 日志 |
|:--:|------|------|------|:--:|:--:|------|
| 1 | 类型 | `npm run typecheck` | 0 error | 0 | 0 | `typecheck.log` |
| 2 | 构建 | `npm run build` | 5 artifacts | — | 0 | `build.log` |
| 3 | node 全量 | `npm test` | **918 / 0** | 881 | 0 | `test.log` |
| 4 | 取代台账 | `npm run test:supersession` | **28 / 0** | 28 | 0 | `test-supersession.log` |
| 5 | 元门禁 | `npm run test:gate-integrity` | **12 / 0** | 12 | 0 | `test-gate-integrity.log` |
| 6 | 零注入 | `npm run test:zero-injection` | **27 / 0** | 27 | 0 | `test-zero-injection.log` |
| 7 | 页面即输入 | `npm run test:page-input` | **102 / 0** | 102 | 0 | `test-page-input.log` |
| 8 | L0 外壳 | `npm run test:l0` | **212 / 0** | 210 → +2 | 0 | `test-l0.log` |
| 9 | L1 | `npm run test:l1` | **108 / 0** | 108 | 0 | `test-l1.log` |
| 10 | L2 | `npm run test:l2` | **73 / 0** | 73 | 0 | `test-l2.log` |
| 11 | 密度 | `npm run test:density` | **171 / 0** | 171 | 0 | `test-density.log` |
| 12 | journey | `npm run test:ui` | **167 / 0** | 167 | 0 | `test-ui.log` |
| 13 | insight | `npm run test:insight` | **116 / 0** | 116 | 0 | `test-insight.log` |
| 14 | binding | `npm run test:binding` | **192 / 0** | 192 | 0 | `test-binding.log` |
| 15 | hardening | `npm run test:hardening` | **24 / 0** | 24 | 0 | `test-hardening.log` |
| 16 | e2e | `npm run test:e2e` | PASS | PASS | 0 | `test-e2e.log` |
| 17 | 设计契约 | `npm run test:design-contract` | **6 / 0** | 6 | 0 | `test-design-contract.log` |
| 18 | L1 反证 | `npm run test:l1-reverse` | 9 条 注入→FAIL→还原→PASS | 9 | 0 | `test-l1-reverse.log` |
| 19 | L2 反证 | `npm run test:l2-reverse` | 10 条 注入→FAIL→还原→PASS | 10 | 0 | `test-l2-reverse.log` |
| 20 | **流（新增）** | `npm run test:stream` | **63 / 0** | —（首次实测） | 0 | `test-stream.log` |
| — | 密度反证（in-gate） | `npm run test:density -- --reverse RP-V4-09` | 9 / 0 | —（新增） | 0 | `density-reverse.log` |

**计数只增不减**：l0 210 → **212**（+2，只增）；node 881 → **918**（+37，只增）；新增 `stream` 口径 **63**（下界 61，首次实测登记）；其余逐项等于基线。`supersession` 台账 `counts` 与门禁日志**同源机核**（N-04：`source.observed == currentRuntime == 日志实测`）。

**门禁纪律**：严格串行（一次一个 Chromium）、日志全量落盘（**禁 tail 截断**）、`finally` 自清 profile（`chrome.kill('SIGKILL')`）。**未新增 Chromium 门禁文件** —— `CHROMIUM_GATES.length === 9` 与 `EXPECTED_AUDITED_FILES`（追加 `test/ui/stream.mjs`）均按 `page-input.mjs` 先例处理。

---

## 9. 体积五要素中间重登记（TASK-612 / ADR-V4-010）

| 要素 | 值 |
|------|------|
| ① 来源 | `packages/web-cli-plugin/dist/sidepanel.js`（真实产物 `stat`） |
| ② 前值 → 后值 | **385,319 → 425,442 B**（+40,123 B，**+10.41%**） |
| ③ 日期 / 命令 / 测量人 | 2026-09-19 · `npm run build --workspace @lgdl/web-cli-plugin` · SDDU v4-2 build round（leaf `specs-tree-v4-2-chat-stream-model`） |
| ④ 理由 | 十二个**新必需模块**（stream-model +5,998 / stream-digest +6,253 / stream-render +2,495 / cards/{index 9,679, shared 2,172, ai 733, user 419, system 1,035, tool 2,784, thinking 1,636, error 445, notice 395} = **+34,044 B**）+ 四个既有模块接线（chat-state +4,781 / density-scope +501 / sidepanel +333 / receipt +2 = **+5,617 B**）+ 未归因胶水 **1,060 B**（= 累计增量的 0.81%）== 40,123 B。逐模块表见 `SIDEPANEL_GROWTH_BREAKDOWN.rows`/`v42RoundRows`（`npm run size:attribution -- --rev cf2af32 --worktree` 与真实 metafile 双向核对）。 |
| ⑤ 历史保留 | `SIDEPANEL_BASELINE_BYTES_TIMELINE` 追加 425,442（前值 385,319 逐字保留）；`SIDEPANEL_RE_REGISTRATIONS['v4-2']` 登记 before/after/ceiling/日期/来源/理由/历史值/断言零删减台账条目（`V42-E-SVP-1/2`、`V42-E-CARDS-1`、`V42-E-STREAM-1`） |

- ceiling：`floor(425,442 × 1.05)` = **446,714 B**（容差 **5% 未动**；cap 仍 `record-only`，不参与判定）。
- ⚠️ **相邻两轮告警**：v4-1 + v4-2 = 375,102 → 425,442（累计 **+13.42%**），**低于 15% 线**，仍按「最差相邻对」口径如实回报编排器（最差对仍是 v3-1 + v3-2 = +22.96%）。
- `content.js` **177,076 B** / `pick-layer.js` **33,900 B** 逐字节不变；`PENDING_ABSOLUTE_CAP` 保持 `resolved:false` 且未预填。
- 未解释字节判据：绝对 `< 1,500 B`（原 1,000，按 esbuild 胶水随模块数 57→69 增长登记调整）**∧ 新增更严的相对口径 `< 2%`（实测 1.02%）** —— 不是纯放宽（见 §11 偏差 4）。

---

## 10. 红线核验

| 红线 | 实测 | 结论 |
|------|------|:--:|
| `dist/content.js` 177,076 B（无容差） | `stat` = 177,076；`src/background/**`、`src/content/**`、`manifest.json` **零 diff** | ✅ |
| `dist/pick-layer.js` 33,900 B | `stat` = 33,900 | ✅ |
| `KIND_SET` 零 diff（`background/messaging.ts`） | `git diff HEAD -- src/background/` **空**；**零新增 kind** | ✅ |
| 判定链 pin / R1R2R3 语义 | `test:binding`/`test:supersession` protectedRanges 全绿；journey 保护段字节零改 | ✅ |
| sidepanel ≤ ceiling | 425,442 ≤ **446,714**（重登记后） | ✅ |
| 测试只增不减 | node 881 → 918；l0 210 → 212；density/journey/insight/binding/hardening/l1/l2/page-input/zero-injection/supersession/gate-integrity/design-contract **逐项不变**；新增 stream 63 | ✅ |
| 零明文边界 | 摘要白名单 11 字段 + 反向注入 3 例必红；journey#16r close 摘要零 query 仍绿 | ✅ |
| 占位宿主 4 处不动 | `test/ui/l0.mjs` ① 断言宿主计数 **== 4** 仍绿（本叶只建不销） | ✅ |
| 门禁严格串行 + 日志全量 + finally 自清 profile | §8（一次一个 Chromium；日志未截断；`SIGKILL` 于 `finally`） | ✅ |
| 不动 main / v1 / v2 / design**/ / web-cli-base/ | `git status` 无这些路径改动 | ✅ |
| 不 `git add -A` | 提交按显式路径清单（见 §14） | ✅ |

---

## 11. 与 plan / ADR 的偏差登记（显式，不静默）

| # | 偏差 | 依据 / 理由 | 处置 |
|:--:|------|------|------|
| 1 | **会话切换的 DOM 语义**：`project()` 按当前段投影（非当前段 detach 而非销毁） | 父 ADR-V4-003 第 2 条要求「旧段事件在内存 ⇒ 可上滚回看」；但 journey #16e/#16g 的「不串台」隔离断言是**既有仍绿**的硬约束且本叶不得改弱。二者只能同时满足于「**事件层保留 + 视图层按段投影**」：切回时**重挂同一节点**（冻结 DOM 与折叠记忆零损失），`tool`/`ok`/`ms` 由事件重放（v3 的 `history` 投影会丢）。 | 已在 `stream-render.ts` 头注释 + 本节 + v4 台账登记；`test/stream-model.test.ts` 断言「切换不重置 seq ∧ 旧段事件保留 ∧ 切回不重复追加」 |
| 2 | **面板重开的降级重建面收敛**：自动读回只重放**已终态的 `askuser`/`auth` 决策卡** | ADR-V4-028 §5 的动机原文是「授权记录可回看」；全量重放（含 tool/system/未答 ask）会改变新面板的首屏读数并撞上冻结的 `test/ui/l0.mjs` ⑩（320/400 常驻集合相等）与空态契约。浏览器实测：全量重放 ⇒ l0 209/1；仅重放未终态 ⇒ 仍红（未答 ask 已是 stale）；**仅重放已终态决策卡 ⇒ 212/0**。零明文/白名单/LRU/降级文案与 `digestToEvents` 全能力**不变**（TASK-609 覆盖全 kind）。 | 登记于 `sidepanel.ts#restoreStreamDigest` 注释 + `docs/v4-supersession-ledger.json#knownLimitations`；下游（v4-3 落 ask 卡流内化时）可放宽该面并重算 |
| 3 | **`askuser`/`auth` 的流内化不在本叶** | 本叶 `spec.md` §2.2 明列「不做 ask-user / 授权卡的**流内化**与业务逻辑 → v4-3（本叶只提供骨架与固化契约）」。故 live `ask`/`confirm` 仍由 `#l0-decision` 占位宿主承载，卡型骨架经 `cards/index.ts` 工厂 + `window.__v3.testing.streamSeed` seam 渲染与门禁断言。 | 已在 `chat-state.ts#streamBranch` 注释 + 本表登记；TASK-610 以 seam 驱动真实工厂/渲染器（无影子实现） |
| 4 | **未解释字节绝对口径 1,000 → 1,500 B** | esbuild 共享胶水随输入模块数（57 → 69）自然增长，v4-2 实测 1,060 B；该值不是产品阈值而是归因自检。**同时新增更严的相对口径 `< 2%`**（实测 1.02%）。 | 登记于 `test/size-growth-evidence.test.ts` 注释 + v4 台账 `entries.V42-E-VOL-1` |
| 5 | **反证编号 RP-V4-09（而非 08）** | v4 台账保护段反证已占用 `RP-V4-08`（journey pin 判据，`test/supersession-ledger.test.ts`）。避免一号两义。 | 见 §7.2；`density.mjs` / `gate-integrity` in-gate 例外 / 密度基线同步 |
| 6 | **`cards/shared.ts` 为 plan 文件清单外的第 9 个 cards 文件** | TASK-602 要求「固化契约只有一处实现」+ 卡组件与注册表**不得循环依赖**；把 DOM 原语拆到 `shared.ts` 是唯一不产生 ESM 循环的实现方式。 | 见 §2.1；`test/design-contract.test.ts` 只校验设计稿，不受影响 |

---

## 12. 测试覆盖（新增 37 + 3 文件；断言零删减）

| 文件 | 覆盖 | 关键断言 |
|------|------|------|
| `test/stream-model.test.ts`（node，18） | TASK-601/602/606/608 | 不可变（`Object.freeze` 运行时）/ `seq` 单调不复用 + 跨切换不重置 / 回放等价双向 / 终态冻结（terminal/terminalSeq/payload 三重）/ 无 null 消失 / bound 四类逐类不淘汰 / 分类学 12 + layer 全覆盖 |
| `test/stream-persistence.test.ts`（node，18） | TASK-605/609 | 白名单逐字段 + 越界字段抛错 / label 不回退 `text` / 零明文 3 反向 + 正例 / LRU 20 / 幂等 upsert / 降级重建保事实不造正文 / 篡改读回抛错 |
| `test/ui/stream.mjs`（Chromium，63） | TASK-610 | 12 卡型 / 过程族 5 形态字段（工具名·✓✖·ms·预览·折叠 / `.cmd` / `.msg-thinking` / `.entry-error` / `.msg-notice`）/ 固化前后（`data-*` + form hidden + `.card-fixed` + `.ts` + aria-live + 无撤销）/ 节点引用与 `outerHTML` 冻结 / 渲染计数 == 投影 / 滚动 48px / 320·400·520 / a11y / ≈320 卡 / 计数守恒 |
| `test/perf-budget.test.ts`（+1） | TASK-611 | 320 卡 `project()` < 250ms 且回放稳定；bound ≤2000 且受保护卡不淘汰 |
| `test/ui/l0.mjs`（+2） | TASK-611 | 流内 3 可点卡不改变外壳 C1/C3（豁免子树）+ 反向「该卡真的渲染出 3 可点」 |
| `test/density-thresholds.test.ts`（+4） | TASK-613 | 合计 ≤8 边界 PASS / 10 FAIL ∧ 可归因 ∧ 上限放开即变绿 |

---

## 13. 不变量自检（机器事实）

- `project()` 纯函数：同 `StreamEvent[]` ⇒ 同 `CardView[]`（deepEqual 双向）；无 `Date.now()`/DOM/随机。
- `seq`：`createStreamState()` 只在面板初始化调用一次；切换走 `switchStreamSession`（不重置）。
- 终态冻结：终态事件唯一决定 `terminal`/`terminalSeq`；后续同卡事件被投影忽略（含 payload 不再折叠）。
- `boundStreamEvents(2000)`：只淘汰**非当前段的** `system`/`notice`；`openAsks`/`dropped` 可见（状态栏 `流已淘汰 N 条`）。
- `CARD_TYPES` 扩展登记路径写死在 `cards/index.ts` 头注释（禁静默）。

---

## 14. 下一步

| 场景 | 操作 |
|------|------|
| 全部任务已完成 | 运行 `@sddu-review specs-tree-v4-2-chat-stream-model` 开始代码审查 |
| 下游叶 | v4-3（ask/auth 流内化 + 业务态）· v4-4（ref/system/nextstep + 通道归并 + 占位宿主清零 + 体积绝对上限闭合） |
| 提交 | `feat(web-cli-plugin): v4-2 append-only 事件流模型与卡渲染（12 kind/摘要落库零明文/keyed 渲染/卡预算裁决 TASK-613）`（显式路径清单，禁 `git add -A`） |

---

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建：V4-2 全叶构建（13 任务 / 7 波 / 20 门禁串行全绿）。事件模型（601）→ 分类学与摘要（602/605）→ 卡/渲染/切换（603/604/606）→ 迁移（607）→ 三门禁（608/609/610）→ 联动（611）→ 收口（612）+ 跨叶移交 **TASK-613 卡预算裁决（形态判据 + 合计 ≤8 + RP-V4-09 真会红 + knownLimitations 更新）**。体积 385,319 → **425,442 B**（五要素重登记，逐模块归因 Σ+39,661 + 胶水 462 == 轮增量 40,123）；`content.js` 177,076 / `pick-layer.js` 33,900 / `KIND_SET` 零 diff。 | 2026-09-19 | SDDU Build Agent |
