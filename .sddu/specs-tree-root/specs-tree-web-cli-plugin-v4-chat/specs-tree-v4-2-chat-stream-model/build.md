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
| 门禁 | **20 项串行全绿**（基线 19 + 新增 `test:stream`）；review 修复轮后按最终产物复跑（见 §15） |
| 体积 | `dist/sidepanel.js` 385,319 → **425,094 B**（+39,775 B，+10.32%；五要素重登记见 §9）。构建轮首登值为 425,442 B（+40,123 B，+10.41%），review 修复轮移除死代码/死 CSS 后按**最终实测值**订正（中间值逐字保留） |

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
| MODIFY | `test/size-baseline.ts` | TASK-612 | **五要素中间重登记**（385,319 → 425,442；**review 修复轮按最终实测值订正为 425,094**，见 §9）+ 逐模块归因 `v42RoundRows` + v4-2 轮登记条目 |
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

**LRU / 降级**：`MAX_DIGEST_SESSIONS = 20`（与 SW `MAX_SESSIONS` 对齐，独立按 `sessionId`）；面板重开读回 → 事实字段（`seq`/`ts`/`kind`/`terminal`/`tool`/`ok`/`ms`/`refNum`/`askRequestId`）全部保留，正文显示 **「（历史摘要）」**（`DIGEST_DEGRADED_BODY`），**不编造正文**；截断规则显式登记 —— 〖review 修复轮 **I-01**〗本句原先即写「登记于台账」，但实测 `docs/v4-supersession-ledger.json` **没有该字段**（`grep` 0 命中），属**不实陈述**。现已补齐为机器事实：台账新增 `truncationRules[]`，其中 `scope:'panel-reopen'`、`kept` = 上述 **11 个白名单字段**（与 `stream-digest.ts#DIGEST_FIELDS` **逐字段机核**）、`degraded:['body']`、`reason`、`registeredOn`，并由 `test/supersession-ledger.test.ts` 的 `truncationRuleProblems()` 判 FAIL（源码存在 `DIGEST_DEGRADED_BODY` ⇒ 必须登记 `panel-reopen`+`degraded:[body]`；`kept` 与源码脱钩即红；另有反证证明判据非恒真）。另见本文件 §11 偏差 2 与会话收敛边界（`scopeLimit`）。

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

> 〖review 修复轮 **I-02**（2026-09-19）〗本节按**最终实测产物**订正为 425,094 B，并订正构建轮的一处**口径混用**：§9 ④ 原先把**累计口径**的未归因胶水 1,060 B 写进**本轮**等式（「+ 未归因胶水 1,060 B（= 累计增量的 0.81%）== 40,123 B」）——本轮胶水实为 **462**（39,661 + 462 = 40,123），1,060 是「v3-1 树 → 当前树」的**累计**值。两个口径现分列，历史值逐字保留。

| 要素 | 值 |
|------|------|
| ① 来源 | `packages/web-cli-plugin/dist/sidepanel.js`（真实产物 `stat`） |
| ② 前值 → 后值 | **385,319 → 425,094 B**（+39,775 B，**+10.32%**）〔构建轮首登：385,319 → 425,442 B（+40,123 B，+10.41%）；review 修复轮按最终实测值订正 −348 B，中间值逐字保留〕 |
| ③ 日期 / 命令 / 测量人 | 2026-09-19 · `npm run build --workspace @lgdl/web-cli-plugin` · SDDU v4-2 build round + **review 修复轮**（leaf `specs-tree-v4-2-chat-stream-model`） |
| ④ 理由 | 十二个**新必需模块**（stream-model +5,998 / stream-digest +6,253 / stream-render +2,489 / cards/{index 9,586, shared 2,172, ai 456, user 419, system 1,035, tool 2,784, thinking 1,636, error 445, notice 395} = **+33,668 B**）+ 四个既有模块接线（chat-state +4,891 / density-scope +501 / sidepanel +319 / receipt +2 = **+5,713 B**）+ 未归因胶水 **+394 B（本轮口径）** == **+39,775 B**。**口径分列（I-02 订正）**：构建轮的本轮等式为 Σ 模块 +39,661 + 胶水 **+462** == +40,123；**累计口径**（v3-1 树 → 当前树）胶水为 **+992 B**（= 累计增量 129,869 的 **0.76%**；构建轮累计为 1,060 B / 0.81% —— 历史值逐字保留）。逐模块表见 `SIDEPANEL_GROWTH_BREAKDOWN.rows`/`v42RoundRows`（`npm run size:attribution -- --rev cf2af32 --worktree` 与真实 metafile 双向核对，`nodes`↔`bytesInOutput` 逐条相等）。 |
| ⑤ 历史保留 | `SIDEPANEL_BASELINE_BYTES_TIMELINE` 追加 **425,442 → 425,094**（前值 385,319 与中间值 425,442 逐字保留）；`SIDEPANEL_RE_REGISTRATIONS['v4-2']` 登记 before/after/ceiling/日期/来源/理由/历史值/断言零删减台账条目（`V42-E-SVP-1/2`、`V42-E-CARDS-1`、`V42-E-STREAM-1`），其 `reason` 同时保留构建轮与修复轮两组归因数字。 |

- ceiling：`floor(425,094 × 1.05)` = **446,348 B**（容差 **5% 未动**；cap 仍 `record-only`，不参与判定）。**方向为下调**（构建轮为 446,714 B）—— 修复轮只删死代码/死 CSS，**没有放宽任何口径**。
- ⚠️ **相邻两轮告警**：v4-1 + v4-2 = 375,102 → 425,094（累计 **+13.33%**；构建轮为 +13.42%），**低于 15% 线**，仍按「最差相邻对」口径如实回报编排器（最差对仍是 v3-1 + v3-2 = +22.96%）。
- `content.js` **177,076 B** / `pick-layer.js` **33,900 B** 逐字节不变；`PENDING_ABSOLUTE_CAP` 保持 `resolved:false` 且未预填。
- 未解释字节判据：绝对 `< 1,500 B`（原 1,000，按 esbuild 胶水随模块数 57→69 增长登记调整）**∧ 新增更严的相对口径 `< 2%`（修复轮实测 992/129,869 = 0.76%）** —— 不是纯放宽（见 §11 偏差 4）。
- **逐模块归因（修复轮，去重后）**：`cards/index` 9,679 → 9,586（−93，移除不可达 `patchAiCard` 分支与 `deps` 形参）/ `cards/ai` 733 → 456（−277，删除死防御路径）/ `stream-render` 2,495 → 2,489（−6，调用点形参收敛）/ `chat-state` 9,304 → 9,414（+110，`stream-merge` 双键去重）/ `sidepanel` 62,726 → 62,712（−14，空态改单一投影源）＝ Σ **−280**；未归因胶水 462 → 394（−68）⇒ 合计 **−348**。

---

## 10. 红线核验

| 红线 | 实测 | 结论 |
|------|------|:--:|
| `dist/content.js` 177,076 B（无容差） | `stat` = 177,076；`src/background/**`、`src/content/**`、`manifest.json` **零 diff** | ✅ |
| `dist/pick-layer.js` 33,900 B | `stat` = 33,900 | ✅ |
| `KIND_SET` 零 diff（`background/messaging.ts`） | `git diff HEAD -- src/background/` **空**；**零新增 kind** | ✅ |
| 判定链 pin / R1R2R3 语义 | `test:binding`/`test:supersession` protectedRanges 全绿；journey 保护段 **active pin `43054..55259`**（sha `e2b500df…`）字节零改；旧 pin `42766..54004`（sha `6b45c3fa…`）仅作 `supersededFrom` 历史留档 —— 〖N-03 订正：§10 原文只写「保护段字节零改」未带号，收口轮补上 active/旧 pin 的区分口径〗 | ✅ |
| sidepanel ≤ ceiling | **425,094 ≤ 446,348**（review 修复轮按最终实测值重登记后；构建轮为 425,442 ≤ 446,714） | ✅ |
| 测试只增不减 | node 881 → 918（build 轮）→ **920**（review 修复轮 +2：`truncationRules` 判据 + 反证）；l0 210 → **212**；density/journey/insight/binding/hardening/l1/l2/page-input/zero-injection/supersession/gate-integrity/design-contract **逐项不减**；新增 stream 63。**零删除断言** | ✅ |
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
| 2 | **面板重开的降级重建面收敛**：自动读回只重放**已终态的 `askuser`/`auth` 决策卡** | ADR-V4-028 §5 的动机原文是「授权记录可回看」；全量重放（含 tool/system/未答 ask）会改变新面板的首屏读数并撞上冻结的 `test/ui/l0.mjs` ⑩（320/400 常驻集合相等）与空态契约。浏览器实测：全量重放 ⇒ l0 209/1；仅重放未终态 ⇒ 仍红（未答 ask 已是 stale）；**仅重放已终态决策卡 ⇒ 212/0**。零明文/白名单/LRU/降级文案与 `digestToEvents` 全能力**不变**（TASK-609 覆盖全 kind）。 | 登记于 `sidepanel.ts#restoreStreamDigest` 注释 + `docs/v4-supersession-ledger.json#truncationRules[0]`（〖review 修复轮 **I-01**〗**已从「只在正文/注释登记」补成台账机器事实**：`scope:'panel-reopen'` / `kept`=11 白名单字段 / `degraded:['body']` / `reason` / `registeredOn`，并由 `test/supersession-ledger.test.ts#truncationRuleProblems()` 机核 `kept` ↔ `DIGEST_FIELDS`，声称截断未登记即 FAIL）；下游（v4-3 落 ask 卡流内化时）按 `scopeLimit` 放宽该面并重算 |
| 3 | **`askuser`/`auth` 的流内化不在本叶** | 本叶 `spec.md` §2.2 明列「不做 ask-user / 授权卡的**流内化**与业务逻辑 → v4-3（本叶只提供骨架与固化契约）」。故 live `ask`/`confirm` 仍由 `#l0-decision` 占位宿主承载，卡型骨架经 `cards/index.ts` 工厂 + `window.__v3.testing.streamSeed` seam 渲染与门禁断言。 | 已在 `chat-state.ts#streamBranch` 注释 + 本表登记；TASK-610 以 seam 驱动真实工厂/渲染器（无影子实现） |
| 4 | **未解释字节绝对口径 1,000 → 1,500 B** | esbuild 共享胶水随输入模块数（57 → 69）自然增长，v4-2 实测 1,060 B；该值不是产品阈值而是归因自检。**同时新增更严的相对口径 `< 2%`**（实测 1.02%）。 | 登记于 `test/size-growth-evidence.test.ts` 注释 + v4 台账 `entries.V42-E-VOL-1` |
| 5 | **反证编号 RP-V4-09（而非 08）** | v4 台账保护段反证已占用 `RP-V4-08`（journey pin 判据，`test/supersession-ledger.test.ts`）。避免一号两义。 | 见 §7.2；`density.mjs` / `gate-integrity` in-gate 例外 / 密度基线同步 |
| 6 | **`cards/shared.ts` 为 plan 文件清单外的第 9 个 cards 文件** | TASK-602 要求「固化契约只有一处实现」+ 卡组件与注册表**不得循环依赖**；把 DOM 原语拆到 `shared.ts` 是唯一不产生 ESM 循环的实现方式。 | 见 §2.1；`test/design-contract.test.ts` 只校验设计稿，不受影响 |
| 7 | **`MODIFY view-model.ts`（`cardViewModel()` 消费 `CARD_KIND_LAYER`）实测零 diff —— 该实现被 `CardView` 投影吸收** | 〖review 修复轮 **I-03**（2026-09-19）〗plan §5 点名本叶 MODIFY `view-model.ts` 并新增 `cardViewModel()`，实测 `git diff 203261e..611afdd -- src/ui/sidepanel/view-model.ts` **为空**（零 diff）。实因：本叶的卡视图投影落成 `stream-model.ts#project() → CardView`（`{cardId,kind,ts,firstSeq,terminal,payload,frozen,layer}`），`CARD_KIND_LAYER` 由 `cards/index.ts` 直接消费（`layer` 字段随 `CardView` 一起产出），因此**不需要**在 v1 派生视图模块里再建一个平行入口 —— 平白新增会造出**第二套卡视图真值源**（违反单一投影源）。故**不补实现**，如实登记为「实现方式变更（被吸收）」。 | 本节 + §4「12 kind 枚举表」的 `layer` 列（`primary`/`process` 由 `CARD_KIND_LAYER` 单源）；`test/stream-model.test.ts` 的 taxonomy/layer 全覆盖断言即等价证据 |
| 8 | **`appendSystem()` 未落地 —— 由 `CardView` + `systemRowPayload` + `cards/system.ts#createSystemCard` 取代（并入既有通道）** | 〖review 修复轮 **I-03**〗plan §2.5 把 `appendSystem()` 定名为「v4-4 唯一通道入口」，实测全仓 **`grep` 0 命中**。实因：本叶的 system 行**不是**由一个专用 helper 产出，而是走**与其它 11 类完全相同的统一路径** —— 生产者构造 `SystemRowPayload` → `appendEvent(kind:'system')` → `project()` → `cards/system.ts#createSystemCard`。若为 system 单开 `appendSystem()`，等于给 12 类里的一类开**第二套写入通道**，与 ADR-V4-024「唯一 append 入口」冲突。故**不补实现**，如实登记为「改名/内联」：`appendSystem()` ⇒ `appendEvent()` + `systemRowPayload`，v4-4 的通道归并**沿用同一条 `appendEvent` 入口**。 | 本节 + §4 表 `system` 行 + `stream-model.ts#appendEvent` 头注释；`test/stream-model.test.ts` ④（生来冻结集含 `system`）与 `test/ui/stream.mjs` ①（`.msg-system` 渲染）为等价证据 |
| 9 | **plan 清单中的 `cards/command.ts` 实际并入 `cards/system.ts`** | 〖review 修复轮 **I-03**〗plan §5 的卡文件清单列出 `cards/command.ts`，实测不存在；`createCommandCard` 落在 `cards/system.ts:28`（system 单行与 command 紧凑行是**同族事件行**，共享「只追加、生来冻结、无终态」语义与 `.ts` 时间戳载体）。拆成两个文件会把同族契约复制两份。 | 本节 + §2.1 `cards/system.ts` 行（已写明「`system` 单行事件行 + `command` 命令行（`.cmd`）」）；`test/ui/stream.mjs` ① 覆盖 `.msg-system` 与 `.cmd` 两种形态 |

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
| `test/supersession-ledger.test.ts`（+2，review 修复轮 I-01） | I-01 | `truncationRules` 判据（scope/carrier/kept/degraded/reason/registeredOn + `kept` ↔ 源码 `DIGEST_FIELDS` 逐字段机核 + 「源码有 `DIGEST_DEGRADED_BODY` ⇒ 必须登记 `panel-reopen`+`body`」）+ 反证（漏登记 / kept 脱钩 / kept 虚增 / degraded 缺 body / 非法日期 / 理由过短 / 未知 scope / carrier 缺失 / 字段整体缺失 逐项必红） |

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
| 全部任务已完成 | ~~运行 `@sddu-review`~~ → **已执行（R1，⚠️ 有条件通过 / 0 阻塞 / I-01~I-12）**，本文件 §15 为修复轮全量处置 |
| 下游叶 | v4-3（ask/auth 流内化 + 业务态；**承接 §15 的 I-05 / I-01 跨叶义务**，见其 `tasks.md` §5）· v4-4（ref/system/nextstep + 通道归并 + 占位宿主清零 + 体积绝对上限闭合） |
| 提交 | `fix(web-cli-plugin): v4-2 review 修复轮——I-01~I-12 全处置（台账截断规则补登/胶水订正/偏差登记/KL 终态/v4-3 前置义务移交）`（显式路径清单，禁 `git add -A`） |

---

## 15. review 修复轮（R1 **I-01~I-12** 全量处置，2026-09-19）

> **来源**：本叶 `review-report.md` R1（⚠️ 有条件通过 / **0 阻塞** / 12 项非阻塞改进）。**处置分两段完成**，如实标注：
> **第一段** = 上一修复轮（代码级 I-06/07/08/09/11/12，随 `dist/sidepanel.js` 重建至 425,094 B）；
> **第二段** = 本轮收尾（台账/文档级 I-01~I-05 + I-10 + 悬空引用 + 体积按最终实测值重登记 + 门禁全量复跑）。**两段合计 = I-01~I-12 全处置，无遗留**。

### 15.1 全量处置表

| # | 严重度 | R1 缺陷（摘要） | 处置 | 段落 | 证据落点 |
|:--:|:--:|------|------|:--:|------|
| **I-01** | 中 | `docs/v4-supersession-ledger.json` 缺 `truncationRules`（plan ADR-V4-028 dec.5 要求 `{scope:'panel-reopen', kept, degraded:['body'], reason, registeredOn}`），而 build §5/§11 声称「已登记」⇒ **不实陈述** | **补登 + 加机核断言**：台账新增 `truncationRules[]`（`panel-reopen`：`kept`=11 白名单字段 / `degraded:['body']` / `reason` / `registeredOn` / `carrier` / `scopeLimit`）；`test/supersession-ledger.test.ts` 新增 `truncationRuleProblems()` + 正/反证两条用例（源码有 `DIGEST_DEGRADED_BODY` ⇒ 必须登记 `panel-reopen`+`body`；`kept` 与源码 `DIGEST_FIELDS` **逐字段相等**，脱钩即 FAIL） | 第二段 | 台账 `truncationRules[0]`；`test/supersession-ledger.test.ts`（`truncationRules` 判据 + 反证）；build §5/§11-2 |
| **I-02** | 中 | build §9 ④ 把**累计口径**胶水 1,060 塞进**本轮**等式（应 462；39,661+462=40,123）；且体积登记未按最终产物 425,094 订正 | **订正 + 按最终实测值五要素重登记**：§9 重写（本轮胶水 **394** / Σ 模块 **39,381** / 轮增量 **39,775**；构建轮 462/40,123 与累计 992/1,060 两口径**分列保留**）；基线 425,442 → **425,094**（ceiling 446,348），逐模块归因重算并双向核对真实 metafile（−280 模块 + −68 胶水 = −348） | 第二段 | build §1/§9/§10/§12；`test/size-baseline.ts`（`SIDEPANEL_BASELINE_BYTES`/`TIMELINE`/`RE_REGISTRATIONS`/`v42RoundRows`/`v42RoundUnattributedGlueBytes`）；`test/size-budget.test.ts`、`test/size-ruling-vol3.test.ts`、`test/size-growth-evidence.test.ts` 同轮重 pin；`docs/v4-density-baseline.json#volume` |
| **I-03** | 中 | 计划交付物未落地且未登记：`MODIFY view-model.ts` 零 diff / `appendSystem()` 全仓 0 命中 / `cards/command.ts` 并入 `cards/system.ts` | **如实登记三条偏差（§11 偏差 7/8/9，不静默）**：① `cardViewModel()` 被 `CardView` 投影吸收（`project()` 直接产出 `layer`），补实现会造第二套卡视图真值源 ⇒ 不补、登记；② `appendSystem()` ⇒ `appendEvent()` + `systemRowPayload` + `createSystemCard`（为 system 单开写入通道违反 ADR-V4-024「唯一 append 入口」）⇒ 不补、登记「改名/内联」；③ `cards/command.ts` ⇒ `cards/system.ts:28`（同族事件行共契约） | 第二段 | build §11 偏差 7/8/9；等价证据：`test/stream-model.test.ts` taxonomy/layer 全覆盖、④ 生来冻结集、`test/ui/stream.mjs` ① |
| **I-04** | 中 | ledger `knownLimitations` KL-N-02 仍称形态/位置判据「需改 `toolbar.ts`…留待下游」，与 `density-baseline` N-02 + 已落地的 TASK-613 实现**口径分裂** | **KL-N-02 终态更新**：注明形态判据已由 v4-2 TASK-613 在 `density-scope.ts` 落地（`[data-chrome-control]`/`[data-toolbar-slot]`/`.view-btn` ⇒ 抛错），**不再需要改 `toolbar.ts` 字节**；残余面（全新 class 可绕过）由首屏合计 ≤8 兜底；与 density-baseline 的 N-02 条目**口径一致**；`status:'closed-by-v4-2-TASK-613'` + 原文逐字保留于 `noteHistory` | 第二段 | 台账 `knownLimitations[KL-N-02]`；`docs/v4-density-baseline.json#knownLimitations`（N-02 双层防线） |
| **I-05** | 中 | 「首屏合计可点 ≤8」的**前提**未登记为下游义务：8 = 1 张 ask(5) + 1 张 nextstep(3)；v4-3 若使两张 askuser（5+5=10）同屏可达则超限 | **跨叶移交登记（编排器授权）**：① `density-baseline#knownLimitations` 追加 **v4-3 前置义务**条目（必须按真实产品态复算；若「两张 ask = 10」判合法须显式裁决 + 重推三档上限 + 登记两册 + 复跑 RP-V4-09；禁静默沿用/放宽）；② **v4-3 `tasks.md` 追加 §5 跨叶移交登记（HO-1/HO-2）+ TASK-711 两条验收勾选项** | 第二段 | `docs/v4-density-baseline.json#knownLimitations`（末条）、`.sddu/.../specs-tree-v4-3-ask-auth-inflow/tasks.md` §5 + TASK-711 |
| **I-06** | 低 | `chat-state.ts#stream-merge` 只按 `cardId` 去重，可与既有事件撞 `seq`（破坏「单调不复用」） | **双键去重**：`known` 同时收 `cardId` 与 `seq`，冲突项跳过（**不重编号** —— 不能把摘要事件静默改写为另一事实） | 第一段 | `src/ui/sidepanel/chat-state.ts`（`stream-merge` 分支注释 + 实现）；`test/stream-model.test.ts` |
| **I-07** | 低 | `sidepanel.ts` 空态用 `isLogEmpty(state.entries.length)`（v1 派生视图）⇒ digest 恢复（有决策卡、无 entries）时空态占位与卡**同屏** | **单一投影源**：`const empty = views.length === 0 && !state.pending;`（`views` = 刚交给渲染器的同一数组，占位与卡不可能不一致）；移除已无引用的 `isLogEmpty` 导入 | 第一段 | `src/ui/sidepanel/sidepanel.ts#render()`；`test/sidepanel-view.test.ts` 契约 ④ |
| **I-08** | 低 | `patchAiCard` 用 `removeChild` 循环重建 markdown，且 `ai` ∈ `BORN_FROZEN_KINDS` ⇒ 产品**不可达**死防御路径（且误导：广告了冻结契约禁止的能力） | **删除死分支**：删 `patchAiCard`、`patchCardNode` 的 `ai` 分支与 `deps` 形参（`patchCardNode(view,node)`）；注释写明「不存在也不可达」+ 仅 4 类（thinking/tool/askuser/auth）有真实 in-progress→settled 迁移 | 第一段 | `src/ui/sidepanel/cards/ai.ts`、`cards/index.ts`、`stream-render.ts`（调用点）；`test/ui/stream.mjs` ④ 断言不变 |
| **I-09** | 低 | RP-V4-09 处理函数误名 `reverseRpV408`（08 已被 journey pin 反证占用） | **重命名** `reverseRpV409`（含 `case` 分派与注入 `data-card-key` 前缀 `rp409-*`）；`gate-integrity` R4b 只核 FAIL 段模式文本，不受影响 | 第一段 | `test/ui/density.mjs` |
| **I-10** | 低 | `size-baseline.ts#closeoutDeltaBytes` 的 doc-comment 仍写「最近一轮（v4-1）375,102 → 385,319，Σ+10,075+142」，与字段现值（v4-2 的 40,123）脱节 | **按实测重写**：字段语义明写为「最新一轮 = 当前基线 − 385,319」，值订正为 **39,775**（与 `size-growth-evidence.test.ts` 的同一等式机核），v4-1 轮增量逐字保留于 `v41RoundRows` 注释 | 第二段 | `test/size-baseline.ts`（`closeoutDeltaBytes` 注释 + 值）；`test/size-growth-evidence.test.ts:339` |
| **I-11** | 低 | 两份 `assertNoPlaintext` 实现（非共享单源）差异只靠隐含；`askRequestId` 白名单字段**未截断** | **显式交叉引用 + 台账登记**：两侧 doc-comment 互指并写明「为何**故意**不合并」（合并只能放宽 v3-2 冻结口径或削掉流侧两类 fail-closed 形状）；`askRequestId` 明确为**业务键**（`ask-<n>`/`ref-round-<n>`，重开做身份相等比较，截断会错位）—— 不截断但仍过 `assertNoPlaintext`（被污染的 id 会**抛错**而不落库）；新增台账 **KL-N-09** | 第一段（注释）/ 第二段（KL-N-09 + 交叉引用闭环） | `src/ui/sidepanel/stream-digest.ts`、`l1/receipt.ts`；台账 `knownLimitations[KL-N-09]`；`test/stream-persistence.test.ts` |
| **I-12** | 低 | ① default 档 check 文案仍写「单卡 ≤6 ∧ 首屏卡 ≤2」而实际已含合计 ≤8；② `.ask-choices` / `.ref-chip.mono` 为死 CSS | **① 文案补全 + ② 删死 CSS**：check 文案改为「∧ 首屏合计可点 ≤`MAX_STREAM_RESIDENT_CLICKABLES`（逐卡动态格）」；`index.html` 删除两条无使用类 | 第一段 | `test/ui/density.mjs:583`；`src/ui/sidepanel/index.html` |

### 15.2 悬空引用修复（R1 之外的连带项）

| 项 | 问题 | 处置 |
|------|------|------|
| `stream-digest.ts` 引用 `KL-N-09` | 注释声称「Registered in `docs/v4-supersession-ledger.json#knownLimitations` (KL-N-09)」，但台账**无该条目**（悬空引用 = 同一类「文档声称、台账查不到」缺陷） | **在台账真建 KL-N-09**（不删注释）：条目写明两份 `assertNoPlaintext` 的职责差异（receipt 窄集 vs stream 超集）、**为何分列**、以及 `askRequestId` 作为业务键不截断的理由；`grep KL-N-09` 现可双向命中（源码 ↔ 台账） |

### 15.3 修复轮门禁复跑（20 项全量串行 + RP-V4-09 复验）

日志目录 `/tmp/opencode/v4-gate-logs/v4-2-reviewfix/`（**全量落盘，禁 tail 截断**；严格串行、一次一个 Chromium、`finally` 自清 profile）。

| # | 门禁 | 命令 | 实测 | 基线 | EXIT | 变动 |
|:--:|------|------|------|:--:|:--:|------|
| 1 | 类型 | `npm run typecheck` | 0 error | 0 | 0 | 不变 |
| 2 | 构建 | `npm run build` | 5 artifacts / sidepanel **425,094 B** | 425,442 | 0 | **−348 B**（按最终实测值重登记） |
| 3 | node 全量 | `npm test` | **920 / 0** | 918 | 0 | **+2**（I-01 判据 + 反证） |
| 4 | 取代台账 | `npm run test:supersession` | **30 / 0** | 28 | 0 | **+2** |
| 5 | 元门禁 | `npm run test:gate-integrity` | **12 / 0** | 12 | 0 | 不变 |
| 6 | 零注入 | `npm run test:zero-injection` | **27 / 0** | 27 | 0 | 不变 |
| 7 | 页面即输入 | `npm run test:page-input` | **102 / 0** | 102 | 0 | 不变 |
| 8 | L0 外壳 | `npm run test:l0` | **212 / 0** | 212 | 0 | 不变 |
| 9 | L1 | `npm run test:l1` | **108 / 0** | 108 | 0 | 不变 |
| 10 | L2 | `npm run test:l2` | **73 / 0** | 73 | 0 | 不变 |
| 11 | 密度 | `npm run test:density` | **171 / 0** | 171 | 0 | 不变 |
| 12 | journey | `npm run test:ui` | PASS — **167 assertions** | 167 | 0 | 不变 |
| 13 | insight | `npm run test:insight` | PASS — **116 assertions** | 116 | 0 | 不变 |
| 14 | binding | `npm run test:binding` | PASS — **192 assertions** | 192 | 0 | 不变 |
| 15 | hardening | `npm run test:hardening` | PASS — **24 assertions** | 24 | 0 | 不变 |
| 16 | e2e | `npm run test:e2e` | PASS（real dist full chain） | PASS | 0 | 不变 |
| 17 | 设计契约 | `npm run test:design-contract` | **6 / 0**（shim 60） | 6 | 0 | 不变 |
| 18 | L1 反证 | `npm run test:l1-reverse` | **9 条** 注入→FAIL→逐字节还原（sha256 复原）→PASS | 9 | 0 | 不变 |
| 19 | L2 反证 | `npm run test:l2-reverse` | **10 条** 同口径 | 10 | 0 | 不变 |
| 20 | 流 | `npm run test:stream` | **63 / 0** | 63 | 0 | 不变 |
| — | 密度反证（in-gate） | `npm run test:density -- --reverse RP-V4-09` | **9 / 0** | 9 | 0 | 不变 |

**计数只增不减**：node 918 → **920**（+2）；supersession 28 → **30**（+2）；其余**逐项等于基线**（无一项下降）。

**台账同源机核（N-04）**：`counts` 抽样四键（l0 / density / nodeTestRuntime / supersession）**全部 checked（4 项与门禁日志逐条相等）**，无 skip。
> ⚠️ 修复轮踩到并已登记的口径纪律：`counts.*.source.log` **不得指向门禁运行时自己的 tee 目标** —— 门禁在自己的读取时刻尚未写出汇总行（`ℹ pass`），会误判「找不到 pattern」。修复轮把登记路径改为 `registry/` 快照（一次完整绿 run 的日志副本，运行期间不被截断），实时日志留在上级目录；该纪律已写入台账 `counts.nodeTestRuntime.note` / `counts.supersession.note`。

**红线复验（逐字节）**：`dist/content.js` **177,076 B** / sha256 `52a826205553b4…`、`dist/pick-layer.js` **33,900 B** / sha256 `5f567d7ededc…`（= v4-1 pin，逐字节未变）；`dist/sidepanel.js` 425,094 B（构建戳变、字节数 == 登记值）；`git diff 203261e -- src/content/** src/background/** manifest.json design/** src/security/** src/ui/options/** test/ui/{hardening,page-input,zero-injection}.mjs` **全空**（`KIND_SET` / SW / manifest 零 diff）；journey 保护段 **active pin `43054..55259`**（194 行 / sha256 `e2b500df…`）与 binding `107780..115930`（sha256 `be9ad0e9…`）由 `protectedRanges` 字节 sha 判据复跑**零改**（supersession 30/0 内含）。

> 〖**N-03 订正**（v4-2 收口轮，validate R1）〗本行原文写作「journey 保护段 `42766..54004`」—— 那是 **v4-1 已显式取代的 `supersededFrom` 旧 pin**（185 行 / sha `6b45c3fa…`，仅作历史留档），**不是** 台账 `protectedRanges` 里的 active pin。active pin 由 v4-1 TASK-513 第 ⑤ 步写入：`{file: test/ui/journey.mjs, status: 'active', startByte: 43054, endByte: 55259, lineCount: 194, sha256: 'e2b500df9049f69979892076ad798fabfc4a638a3403902c7e57d7f1e1ac244f', supersededFrom: '6b45c3fa…'}`。**口径**：`active`（受判、必须逐字节命中）与 `supersededFrom`（历史、只读留档）是**两个 pin**，不得混引 —— 见 `docs/v4-supersession-ledger.json#protectedRanges[0]`。原文（旧 pin）在本订正注中逐字保留。

---

## 16. 收口轮（v4-2 closeout：处置 validate R1 的 **F-01~F-03 + N-01~N-03**，2026-09-19）

> **来源**：本叶 `validate-report.md` R1（⚠️ 有条件通过 / **0 阻塞** / 3 项发现 F + 3 项备注 N）。
> **纪律**：收口**不降级** —— `state.json` 的 `phase` 保持 **`validated`**（本小节只记录处置与证据，不改阶段语义）。
> **性质**：validate → build 回环的**第 2 轮**（第 1 轮 = review 修复轮 §15）。本轮只处置 validate 的 F/N，**不动** spec/plan/tasks。

### 16.1 F-01~F-03 修法与反证（回退 → 红 ∧ 还原 → 绿）

**F-01（中，必修）— `payload.options` / `payload.chips` 数组深冻结**

| 项 | 内容 |
|----|------|
| validate 复现 | `probe-appendonly.mjs` ①：`Object.freeze` 是**浅**冻结 ⇒ 嵌套数组可经 **① 事件引用 ② `project()` 的 `CardView` ③ 调用方原数组** 三处改写，实测改写后 `project()` 输出随之改变 |
| 修法 | `src/ui/sidepanel/stream-model.ts` 新增模块私有 **`deepFreeze()`**（copy-and-freeze：数组逐元素重建、纯对象逐 own-key 重建、每层 `Object.freeze`）；**入**口 `appendEvent`：`payload: deepFreeze({ ...(input.payload ?? {}) })`；**出**口 `project()`：`payload: deepFreeze({ ...acc.payload })`。copy 语义同时解决两件事：冻结不副作用到调用方对象 ∧ 事件不再别名调用方数组 |
| 三条路径逐条断言 | ① 事件：`options[0]=` / `options.push()` ⇒ **TypeError** 且值不变；② `CardView`：`view.payload.options[0]=` / `project(s)[1].payload.chips[0]=` ⇒ **TypeError**；③ caller：`options[0]='HACK'` / `chips.push('HACK')` ⇒ 事件与投影**值均不变**（不共享引用）；另加嵌套数组逐层冻结用例（`[['内层']]`，事件侧 + 投影侧均 `Object.isFrozen(inner)===true`） |
| **反证（回退 → 红）** | 把 `deepFreeze(...)` 两处回退为 `Object.freeze(...)`（浅冻结）⇒ `node --test dist-probe/test/stream-model.test.js` = **`tests 20 / pass 18 / fail 2`**，失败原文：`✖ v4-2 ① F-01 深冻结：payload.options/chips 的三条改写路径全部堵死` → `AssertionError [ERR_ASSERTION]: 事件载荷的 options 数组必须被冻结（F-01）`；`✖ v4-2 ① F-01 深冻结：嵌套数组/对象逐层冻结（不遗留可写内层）` |
| **反证（还原 → 绿）** | 还原后 **`tests 20 / pass 20 / fail 0`**；`stream-model.ts` sha256 = `68996245060314f10c40c5cb35bb7f2306f03e2016a0a368b6144b2f2dd8815c`（与回退前备份逐字节相同，`sha256sum` 双算对比） |
| 测试落点 | `test/stream-model.test.ts` ① 组 2 条（三条路径 + 嵌套逐层） |

**F-02（低，修）— `stream-merge` 只接纳 `seq > 已知最大值`**

| 项 | 内容 |
|----|------|
| validate 复现 | `probe-appendonly.mjs` ③：I-06 的双键去重只拦「**已占用**」的 `cardId`/`seq`；对「**小于当前最大值且未占用**」的 `seq`（实测注入 `0`）仍接纳 ⇒ 事件数组逆序（实测 `1,2,3,0,9`），破坏「单调不复用」排序不变式 |
| 修法 | `src/ui/sidepanel/chat-state.ts#stream-merge`：候选**按 `seq` 升序**应用，只接纳 `seq > max(已知 seq)` 且 `cardId` 未占用者；被拒候选计入 **`StreamState.mergeSkipped`**（`stream-model.ts` 新增该字段，`createStreamState` 置 0）—— **不静默丢弃、不重编号**（stale 摘要行宁可丢，也不改写成另一事实） |
| **反证（回退 → 红）** | 把 `chat-state.ts` 回退到 HEAD（双键去重）⇒ `node --test dist-probe/test/sidepanel.test.js` = **`tests 20 / pass 19 / fail 1`**，失败原文：`AssertionError [ERR_ASSERTION]: 低于已知最大值的 seq 必须被拒（实测 1,2,3,0,9）`（与 validate 复现**逐字同形**） |
| **反证（还原 → 绿）** | 还原后 **`tests 20 / pass 20 / fail 0`**；`chat-state.ts` sha256 = `7666fd8d76612343183bbd0928775566c4d0829c5b457be83f58e52aa5caf1e` |
| 测试落点 | `test/sidepanel.test.ts`：逆序注入 ⇒ 数组 `1,2,3,9` 严格单调 ∧ `mergeSkipped===1` ∧ 被拒卡不得混入；重复合并幂等（`mergeSkipped===3`）；合法前向追加仍工作（`seq 10` 入列、`state.seq===11`、计数不增）—— 判据不恒真也不恒假 |

**F-03（低，修）— `sanitizeLabel` 顺序反转为「先全串扫描再截断」**

| 项 | 内容 |
|----|------|
| validate 复现 | `probe-zero-plaintext.mjs` V3-②b / **F-V3-01**：`'x'.repeat(71) + 'sk-ABCDEFGHIJKLMNOP'` ⇒ 旧顺序（先 `slice(0,80)` 再扫描）落库 80 字符、尾部含 **`sk-ABCDEF`**（= 密钥前 9 字符；`SECRET` 正则要求 `sk-` 后 ≥8 字符，故前缀片段不触发） |
| 修法 | `src/ui/sidepanel/stream-digest.ts#sanitizeLabel`：`assertNoPlaintext([firstLine])` 移到 `slice(0, DIGEST_LABEL_MAX)` **之前** —— 敏感触发子判定在**完整 label** 上做，截断只决定落库长度 |
| **反证（回退 → 红）** | 回退为「截断后扫描」⇒ `node --test dist-probe/test/stream-persistence.test.js` = **`tests 19 / pass 18 / fail 1`**，失败原文：`AssertionError [ERR_ASSERTION]: 跨界密钥不得以任何形式落库（旧实现落库 80 字符且尾部含 'sk-ABCDEF'；实测 "xxxxxxx…sk-ABCDEF"）`（validate 复现**逐字命中**） |
| **反证（还原 → 绿）** | 还原后 **`tests 19 / pass 19 / fail 0`**；`stream-digest.ts` sha256 = `231e570c8a016d967c5f064c8b58f793fc56f13940d59124213cb59c81254020` |
| **口径收紧（显式登记，非放宽）** | 完整串命中即抛错 ⇒ ① 80 内完整密钥：仍抛错（不变）；② **71 位跨界**：由「落库前缀」变为**抛错**（收紧）；③ 触发子**完全在 80 之外**：旧行为是「截掉不落库」，现为**抛错**（fail-closed 半径扩大）。因此 validate 探针 V3-②b/②c 的 `rec`（断言「**不抛错** ∧ 落库 80」）在收口后**按设计不再成立** —— 它们的 finding（F-V3-01）不再复现；本轮以新单测承接**同一复现输入**，判据改写为「不抛错则不得含 `sk-`」∧「完整串命中必抛错」。无触发子的长串仍按 80 截断（`'y'.repeat(400)` ⇒ 80，判据不恒真） |
| 测试落点 | `test/stream-persistence.test.ts`：71 位跨界（validate 复现）、79/80/81 位起点、60 位完整命中、80 位界外触发子、长串正常截断、多行取首行 |

### 16.2 N-01~N-03 处置

| # | validate 原文 | 收口轮处置 | 登记落点 |
|:--:|------|------|------|
| **N-01** | `test:binding` 3 次独立重跑均失败且**失败项互异**（R1 `#54B10 下载记录` / R2 `#3d/#3e/#3f discovery` / R3 `#7d/#7e tabs list --full`）；`binding.mjs` 对基线零 diff、今日 build/reviewfix 均绿、历史 `v4-1-r2` 同现象 | **登记为环境性已知限制**：`docs/v4-supersession-ledger.json#knownLimitations` 新增 **`KL-N-10`**（现象 + 4 条证据链 + **复跑纪律**「串行 / 首轮异常隔离复跑 ≥2 / 日志全量 / 仍红如实记录不阻塞收口」+ 建议「三处时序断言加就绪等待或有界重试」）。**收口轮复跑结果见 §16.4 尾注** | `KL-N-10`；本轮日志 `…/v4-2-closeout/runA/14-binding.log` 与 `…/gates/14-binding.log` |
| **N-02** | `stream-model.ts#hasSegment` 导出无消费者（`chat-state.ts#history` 内联了等价 `events.some(...)`） | **接线（wiring），不删除**：`src/ui/sidepanel/sidepanel.ts#restoreStreamDigest` 的内联 `state.stream.events.some((e) => e.sessionId === sid)` 改为 `hasSegment(state.stream, sid)`（与 `switchStreamSession` doc 引用的语义**同一谓词**），孤儿导出变为生产消费者在用的模型判据（该路径由 `test/stream.test` 的摘要重开场景 + `test/stream-model.test.ts` ② 组「切回不重复追加」共同覆盖） | `sidepanel.ts`（含 N-02 注释）；台账 `V42-E-SEQ-1` 同轮条目 |
| **N-03** | `build.md` §10 / §15.3 引用 journey 保护段 `42766..54004`（v4-1 的 `supersededFrom` **旧 pin**），而台账 **active pin** 为 `43054..55259` | **订正为 active pin**：§15.3 红线行改写为 `active pin 43054..55259`（194 行 / sha `e2b500df…`），旧 pin `42766..54004`（185 行 / sha `6b45c3fa…`）显式标注为 `supersededFrom` **历史留档**；§10 行补 active/旧 pin 区分口径；**原文逐字保留于订正注** | `build.md` §10 + §15.3；`docs/v4-supersession-ledger.json#protectedRanges[0]` |

### 16.3 收口轮体积五要素重登记（TASK-612 纪律沿用）

> F-01/F-02/F-03/N-02 动了**源文件字节** ⇒ 按「登记值 == 实测产物」的既有判据（`test/size-budget.test.ts`）**必须**重登记；容差 **5% 未动**，**禁压缩凑数**（本轮的 F-03/N-02 恰好是**减重**，如实保留负号）。

| 要素 | 值 |
|------|------|
| ① 来源 | `packages/web-cli-plugin/dist/sidepanel.js`（真实产物 `stat` + `dist/build-meta.json` metafile 双向核对） |
| ② 前值 → 后值 | **425,094 → 426,487 B**（**+1,393 B，+0.33%**） |
| ③ 日期 / 命令 / 测量人 | 2026-09-19 · `npm run build --workspace @lgdl/web-cli-plugin` · SDDU v4-2 **closeout round**（leaf `specs-tree-v4-2-chat-stream-model`） |
| ④ 理由（逐模块可归因，Σ 模块 == 真实产物差，未归因胶水 **0**） | F-01 `stream-model` 5,998 → **6,908**（+910）/ F-02 `chat-state` 9,414 → **9,953**（+539）/ F-03 `stream-digest` 6,253 → **6,220**（**−33**）/ N-02 `sidepanel` 62,712 → **62,689**（**−23**）== **+1,393**。对应 validate **F-01 / F-02 / F-03 / N-02** |
| ⑤ 历史保留 | `SIDEPANEL_BASELINE_BYTES_TIMELINE` 追加 **426,487**（前值 385,319 / 425,442 / 425,094 逐字保留）；新增 `SIDEPANEL_RE_REGISTRATIONS['v4-2-closeout']`（`roundKind: 'registry-fidelity-round'`，含 before/after + ceiling + 日期 + 来源 + `buildCommand` + `measuredBy` + reason + 断言零删减台账条目 `V42-E-SVOL-1/2` + `V42-E-DFREEZE-1` + `V42-E-SEQ-1` + 历史值）；新增 `v42CloseoutRows`（最新一轮 rows，机核真实 metafile）+ `v42CloseoutUnattributedGlueBytes: 0`；`rows` 累计口径同步（`deltaBytes` 129,869 → **131,262**、`newRequiredModuleBytes` 100,937 → **101,814**、`wiringBytes` 27,607 → **28,123**、未归因胶水 **1,060 不变**）；`closeoutDeltaBytes` 39,775 → **41,168** |

- ceiling：`floor(426,487 × 1.05)` = **447,811 B**（上一轮 446,348 **由公式抬高**，不是放宽容差）；cap 仍 `record-only`。
- ⚠️ **相邻两轮告警**：v4-1 + v4-2（build + review 修复轮 + 收口轮）= 375,102 → 426,487（累计 **+13.70%**），**低于 15% 线**，仍按「最差相邻对」口径如实回报（最差对仍是 v3-1 + v3-2 = +22.96%）。
- `content.js` **177,076 B** 与 `pick-layer.js` **33,900 B** 逐字节不变（sha256 `52a82620…` / `5f567d7e…`，本轮前后两次采样相同）。
- `docs/v4-density-baseline.json#volume` 同步：`registeredBaselineBytes` **426,487** / `ceilingBytes` **447,811**（`directionalAlert` / `closeoutNote` 追加收口轮段，历史文字逐字保留）。
- 断言零删减：node **920 → 924**（+4），其余 18 项**逐项不减**（见 §16.4）。

### 16.4 收口轮门禁复跑（20 项严格串行 + RP-V4-09；日志 `/tmp/opencode/v4-gate-logs/v4-2-closeout/`）

> **串行纪律**：`run-gates.sh` 一次一条命令、一次一个 Chromium，`finally` 自清 profile；日志**全量落盘**（禁 tail 截断）。
> **两轮全量**：`runA/`（首轮，含 1 项环境性抖动）与 `gates/`（复跑，**21/21 rc=0**）。`registry/` 是计数同源判据所用的「一次完整绿 run 日志副本」。

| # | 门禁 | 命令 | 实测（**run B，最终**） | run A | 基线 | 变动 |
|:--:|------|------|------|:--:|:--:|------|
| 1 | 类型 | `npm run typecheck` | 0 error | 0 | 0 | 不变 |
| 2 | 构建 | `npm run build` | 5 artifacts / sidepanel **426,487 B** | 同 | 425,094 | **+1,393 B**（五要素重登记，§16.3） |
| 3 | node 全量 | `npm test` | **924 / 0 / skipped 0** | 同 | 920 | **+4**（F-01×2 / F-02×1 / F-03×1） |
| 4 | 取代台账 | `npm run test:supersession` | **30 / 0** | 同 | 30 | 不变（含 v4 段删除行逐字集合相等 / 双台账 / 截断规则 / counts 同源） |
| 5 | 元门禁 | `npm run test:gate-integrity` | **12 / 0** | 同 | 12 | 不变 |
| 6 | 零注入 | `npm run test:zero-injection` | **27 / 0** | 同 | 27 | 不变 |
| 7 | 页面即输入 | `npm run test:page-input` | **102 / 0** | 同 | 102 | 不变 |
| 8 | L0 外壳 | `npm run test:l0` | **212 / 0** | 同 | 212 | 不变 |
| 9 | L1 | `npm run test:l1` | **108 / 0** | 同 | 108 | 不变 |
| 10 | L2 | `npm run test:l2` | **73 / 0** | 同 | 73 | 不变 |
| 11 | 密度 | `npm run test:density` | **171 / 0**（产物 426,487 == 登记 ∧ ≤ ceiling 447,811） | 同 | 171 | 不变 |
| 12 | journey | `npm run test:ui` | PASS — **167 assertions** | 同 | 167 | 不变 |
| 13 | insight | `npm run test:insight` | PASS — **116 assertions** | 同 | 116 | 不变 |
| 14 | binding | `npm run test:binding` | **PASS — 192 assertions** | **FAILED (2)：`#7d tabs list --full` / `#7e --full query 可见`** | 192 | 不变（run A 抖动 → **N-01 / KL-N-10**） |
| 15 | hardening | `npm run test:hardening` | PASS — **24 assertions** | 同 | 24 | 不变 |
| 16 | e2e | `npm run test:e2e` | PASS（real dist full chain：fixture + Workbench） | 同 | PASS | 不变 |
| 17 | 设计契约 | `npm run test:design-contract` | **6 / 0**（shim 60） | 同 | 6 | 不变 |
| 18 | L1 反证 | `npm run test:l1-reverse` | **9 条**：注入→FAIL→sha256 逐字节还原→PASS | 同 | 9 | 不变 |
| 19 | L2 反证 | `npm run test:l2-reverse` | **10 条** 同口径（含叶段台账 expectFailPattern） | 同 | 10 | 不变 |
| 20 | 流 | `npm run test:stream` | **63 / 0** | 同 | 63 | 不变 |
| — | 密度反证（in-gate） | `npm run test:density -- --reverse RP-V4-09` | **9 / 0** | 同 | 9 | 不变 |

**N-01 收口轮复跑结论（如实记录）**：

- **run A（首轮全量）**：`#14 binding` **rc=1**，失败项 `✖ #7d tabs list --full 显式返回完整 URL` / `✖ #7e --full 模式下 query 可见（显式选项，已披露）`，诊断栈落盘 `/tmp/opencode/r2-3/logs/binding-diagnostics-1789788594429.log`（原文见 `runA/14-binding.log`）。
- **run B（全量复跑，同一工作树、同一天、串行）**：`#14 binding` **rc=0 / 192 assertions PASS**（`gates/14-binding.log`）。
- ⇒ 与 validate R1 的 3 次失败（失败项互异）**同形**，且**同一产物在 1 小时内先红后绿**，构成「**环境性宿主时序抖动、非本叶回归**」的直接证据；现象、纪律与建议已登记 `docs/v4-supersession-ledger.json#knownLimitations[KL-N-10]`。
- **计数只增不减**：node 920 → **924**（+4）；supersession 30 / gate-integrity 12 / zero-injection 27 / page-input 102 / l0 212 / l1 108 / l2 73 / density 171 / journey 167 / insight 116 / binding 192 / hardening 24 / design-contract 6 / l1-reverse 9 / l2-reverse 10 / stream 63 / RP-V4-09 9 **逐项不减**。

### 16.5 红线核验（收口轮，逐字节）

| 红线 | 实测 | 结论 |
|------|------|:--:|
| `dist/content.js` **177,076 B**（无容差） | `stat` = 177,076；sha256 `52a826205553b46a896ccad54225d63ba62f5f7fe7c969a9bc2e655448d5b5f6`（**run A/B 前后两次采样相同**） | ✅ |
| `dist/pick-layer.js` **33,900 B** | `stat` = 33,900；sha256 `5f567d7ededc58183afe4ce45e3293b68204dfbe788dc6b9fb09bdc6e0d13e59`（同上不变） | ✅ |
| `KIND_SET` / SW / `manifest.json` 零 diff | `git status` 无 `src/background/**` / `src/content/**` / `manifest.json` 改动；`test:zero-injection` 27/0 | ✅ |
| 判定链 pin / 保护段 | journey **active pin** `43054..55259`（sha `e2b500df…`）与 binding `107780..115930`（sha `be9ad0e9…`）由 `test:supersession` 30/0 内含的字节 sha 判据复跑零改（N-03 已订正引用口径） | ✅ |
| sidepanel ≤ ceiling | **426,487 ≤ 447,811**（`floor(426,487 × 1.05)`；容差 5% 未动、cap 仍 record-only） | ✅ |
| 测试只增不减 | node **+4**；其余 18 项逐项不减；**零删除断言** | ✅ |
| 门禁串行 + 日志全量 | `…/v4-2-closeout/runA/`（首轮）+ `…/gates/`（复跑 21/21）+ `…/registry/`（计数同源快照）；`manifest.tsv` 逐项记 rc | ✅ |
| 不 `git add -A` | 提交按显式路径清单（见 §16.6） | ✅ |

### 16.6 收口轮台账/证据落点（显式路径）

- 源码 4：`src/ui/sidepanel/stream-model.ts`（F-01 + `StreamState.mergeSkipped`）、`chat-state.ts`（F-02）、`stream-digest.ts`（F-03）、`sidepanel.ts`（N-02）。
- 测试 3：`test/stream-model.test.ts`（+2）、`test/sidepanel.test.ts`（+1）、`test/stream-persistence.test.ts`（+1，并补 `mergeSkipped` 到一处 `StreamState` 字面量）。
- 体积/台账：`test/size-baseline.ts`（baseline/ceiling/TIMELINE/`RE_REGISTRATIONS['v4-2-closeout']`/`v42CloseoutRows`/`rows`/`GROWTH_BREAKDOWN` 累计口径）、`test/size-budget.test.ts`、`test/size-ruling-vol3.test.ts`、`test/size-growth-evidence.test.ts`、`docs/v4-supersession-ledger.json`（`entries` 新增 4 + 既有 6 条 `newTitle`/reason 重 pin + `counts` 4 源 + `knownLimitations[KL-N-10]`）、`docs/v4-density-baseline.json#volume`。
- 文档：本 `build.md`（§16 + §10/§15.3 的 N-03 订正）、`state.json`（`closeoutRounds`）。

---

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建：V4-2 全叶构建（13 任务 / 7 波 / 20 门禁串行全绿）。事件模型（601）→ 分类学与摘要（602/605）→ 卡/渲染/切换（603/604/606）→ 迁移（607）→ 三门禁（608/609/610）→ 联动（611）→ 收口（612）+ 跨叶移交 **TASK-613 卡预算裁决（形态判据 + 合计 ≤8 + RP-V4-09 真会红 + knownLimitations 更新）**。体积 385,319 → **425,442 B**（五要素重登记，逐模块归因 Σ+39,661 + 胶水 462 == 轮增量 40,123）；`content.js` 177,076 / `pick-layer.js` 33,900 / `KIND_SET` 零 diff。 | 2026-09-19 | SDDU Build Agent |
| **v1.1** | **review 修复轮（I-01~I-12 全量处置）**：新增 **§15**（处置表 + 悬空引用修复 + 门禁复跑）；§1/§5/§9/§10/§11/§14 按最终实测产物与台账事实订正 —— 体积 **425,094 B**（五要素，含修复轮归因；ceiling 446,348）、截断规则**已入台账**（I-01）、三条计划交付物偏差**已登记**（I-03）、KL-N-02 **终态**（I-04）、v4-3 **前置义务移交**（I-05）、`closeoutDeltaBytes` 订正 39,775（I-10）、**KL-N-09** 真建（I-11 悬空引用）。**两段完成如实标注**：第一段 I-06/07/08/09/11/12（代码级，随 425,094 重建）；第二段 I-01~I-05 + I-10 + 悬空 + 体积订正 + 门禁全量复跑。 | 2026-09-19 | SDDU Build Agent（v4-2 review 修复轮） |
| **v1.2** | **收口轮（处置 validate R1 的 F-01~F-03 + N-01~N-03，phase 保持 `validated` 不降级）**：新增 **§16**；**F-01** `payload.options/chips` 深冻结（`deepFreeze` 入/出口，三条改写路径全堵死 + 2 条反证用例）、**F-02** `stream-merge` 只接纳 `seq > 已知最大值`（+`mergeSkipped` 计数）、**F-03** `sanitizeLabel` 顺序反转为「先全串扫描再截断」；**N-01** 登记 `KL-N-10` + 复跑、**N-02** `hasSegment` 接线（不删）、**N-03** journey 保护段订正为 **active pin `43054..55259`**。体积 **425,094 → 426,487 B**（五要素重登记，ceiling **447,811**；Σ 模块 +1,393 + 胶水 0）；node **920 → 924**；20 项门禁串行复跑 + RP-V4-09（binding 环境性抖动，见 N-01/KL-N-10）；红线 `content.js` 177,076 / `pick-layer.js` 33,900 逐字节不变。 | 2026-09-19 | SDDU Build Agent（v4-2 收口轮） |
