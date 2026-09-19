# 任务分解：specs-tree-v4-2-chat-stream-model（V4-2 聊天流 append-only 事件模型与卡渲染）

> **文档定位**: SDDU 任务清单 — 本叶 12 个原子任务（TASK-601~612 / 叶内别名 V42-01~12）；**权威跨叶契约见父 `../plan.md` + 父 `../tasks.md`**
> **前置依赖**: 本叶 `plan.md` v1.0（ADR-V4-024~029）+ 父 `plan.md` v1.0（ADR-V4-002/004/012/013/011）+ 本叶/父 `spec.md` v1.0
> **创建人**: SDDU Tasks Agent
> **创建时间**: 2026-09-18
> **版本**: v1.0
> **更新人**: SDDU Tasks Agent
> **更新时间**: 2026-09-18
> **更新说明**: 初始创建（12 任务 / 7 波；叶间门禁：v4-1 收口绿后才开工）

## 0. 红线与纪律（本叶）

| # | 红线 | 守线任务 |
|---|------|---------|
| 1 | **零新增 kind**：`KIND_SET` 零 diff（+6 kind 实测 +307 B = 红线突破）；若必须新增 ⇒ 停下上报走独立校验器 | TASK-601 / TASK-612 |
| 2 | **永不 `textContent=''` / `replaceChildren()`**；DOM 删除路径唯一 = bound 淘汰 | TASK-604 |
| 3 | `seq` 单调不复用、**跨会话切换不重置** | TASK-601 / TASK-606 |
| 4 | 终态冻结：终态卡的 DOM 在 patch 后不得再被触碰（`outerHTML` 不变） | TASK-601 / TASK-604 / TASK-610 |
| 5 | **零明文**：摘要落库字段白名单（无正文/命令参数体/URL query/页面文本） | TASK-605 / TASK-609 |
| 6 | 12 个既有 `dispatch` action **零删除**；`chat-state` 只追加分支 | TASK-607 |
| 7 | 工具卡信息**逐项保留**（工具名/ok/ms/预览/折叠记忆 480B·10 行） | TASK-603 |
| 8 | 新增门禁**保留文件名**前置：`l0.mjs` 只追加不重命名 | TASK-611 |
| 9 | `CHROMIUM_GATES.length === 9` **不动**；`EXPECTED_AUDITED_FILES` 只追加 | TASK-611 |
| 10 | 门禁严格串行；日志 `/tmp/opencode/v4-gate-logs/v4-2/`（禁 tail 截断） | TASK-612 |

## 1. 依赖拓扑总览

```
[前置] v4-1 收口绿（CP-1：TASK-515）+ 占位宿主 data-transitional-host 存在

Wave 1 ── (无叶内依赖)
  TASK-601 [L] stream-model.ts：StreamEvent/StreamState/appendEvent/boundStreamEvents/project() + 终态冻结

Wave 2 ── (依赖 601)
  TASK-602 [M] cards/index.ts：CARD_TYPES(12) + 注册表 + 固化契约/DOM 契约单源
  TASK-605 [M] stream-digest.ts：摘要落库（零明文白名单 + LRU + 降级重建）

Wave 3 ── (依赖 602 / 601 / 605)
  TASK-603 [L] cards/{ai,user,system,tool,command,thinking,error,notice}.ts + 四类骨架
  TASK-604 [L] stream-render.ts：keyed 增量渲染 + 终态 DOM 冻结 + 滚动锚定 + 320px
  TASK-606 [M] 会话切换语义（seq 不重置 + 分段 system 行 + 内存段保留 + bound 淘汰登记）

Wave 4 ── (汇聚)
  TASK-607 [L] chat-state.ts 迁移 + sidepanel.ts render 切 streamRender + toolOpenState→cardId

Wave 5 ── (门禁)
  TASK-608 [M] test/stream-model.test.ts（node）
  TASK-609 [M] test/stream-persistence.test.ts（node）
  TASK-610 [L] test/ui/stream.mjs（Chromium；真实产物侧等价断言）

Wave 6 ── (联动门禁)
  TASK-611 [M] l0.mjs 追加 + sidepanel-view 契约④ + perf-budget + gate-integrity 追加 + package.json

Wave 7 ── (收口)
  TASK-612 [M] 全门禁串行 + 台账 counts + 五要素中间重登记

跨叶移交（约束型验收，不另立波次；与 TASK-602/603 同轮交付）
  TASK-613 [M] 卡预算 × 常驻入口准入重审（裁决或收紧）← 来源 N-03 / v4-1 validate R1
```

## 2. 任务列表

### TASK-601（V42-01）: `stream-model.ts` 事件模型 + 纯投影 + 终态冻结不变式
| 属性 | 值 |
|------|-----|
| **复杂度** | L |
| **前置依赖** | 无叶内依赖（前置 = v4-1 收口 TASK-515） |
| **执行波次** | 1 |
| **对应 FR / AC** | FR-CHAT-020 / 021 / 025 · AC-CHAT-010 · NFR-CHAT-001 |
| **ADR / 风险** | ADR-V4-024 · ADR-V4-002/012 · R42-01 / R42-04 / R4-05 |

**描述**: 建 `StreamEvent{seq,ts,kind,cardId,sessionId,payload,terminal?}`（全 `readonly`）+ `StreamState`（`events`/`seq`/`sessionId`/`openAsks`/`dropped`）+ `createStreamState` / `appendEvent` / `boundStreamEvents(cap=2000)` / `project(state, deps) → CardView[]`（纯函数：无 DOM、无 `Date.now()`、无随机）。终态冻结 = 终态事件唯一决定 `terminal`/`terminalSeq`，其后任何事件不得改写。**不存在**「解析即置 `null` 使卡消失」路径。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| NEW | `packages/web-cli-plugin/src/ui/sidepanel/stream-model.ts` |

**验收标准**:
- [ ] 同一 `StreamEvent[]` ⇒ 同一 `CardView[]`（回放等价）；`project()` 零副作用
- [ ] 终态冻结：同 `cardId` 追加后续事件后 `terminal`/`terminalSeq` **不变**
- [ ] 取消 / 超时 / 取代后**原卡仍在** `project()` 结果中（无「置 null 消失」）
- [ ] `boundStreamEvents(cap=2000)`：只淘汰最旧已终结 `system`/`notice` 行；**永不淘汰** ask/auth 终态卡 / tool 卡 / ref 卡 / 当前会话段；`dropped` 计数可见
- [ ] `createStreamState()` 仅面板初始化调用一次（切换路径不重建 ⇒ `seq` 不重置）

**验证命令**:
```bash
npm run typecheck --workspace @lgdl/web-cli-plugin
```

### TASK-602（V42-02）: `cards/index.ts` 分类学单源 + 固化契约/DOM 契约
| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-601 |
| **执行波次** | 2 |
| **对应 FR / AC** | FR-CHAT-021 / 022 / 036 · AC-CHAT-002 / 003 |
| **ADR / 风险** | ADR-V4-026 · ADR-V4-013 · R42-05 / R4-12 |

**描述**: `CARD_TYPES`（**12 项** = 7 主类 + 5 过程族）+ `CARD_KIND_LAYER`（`primary`/`process`）+ 卡工厂注册表 + `appendSystem(kind, text)` 骨架；固化契约单源（`li[data-msg-type][data-card-key]` + `data-*` + `[hidden]` 切换 + `.ts`(HH:MM:SS) + `.card-fixed`）。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| NEW | `packages/web-cli-plugin/src/ui/sidepanel/cards/index.ts` |

**验收标准**:
- [ ] `CARD_TYPES` 12 项且 7 主类与 shim `CARD_TYPES` **逐字一致**（不多不少）
- [ ] 固化契约只有一处实现（不按卡型各写一套）；操作前/后字段（`data-answered` / `data-decision` / `data-ref-state`）单源登记
- [ ] 过程族与主类**同一套** DOM 契约（`data-msg-type` 区分；v1 类名保留用于样式复用）
- [ ] 扩展路径写入注释：任何 `CARD_TYPES` 变更须改 shim + `design-contract.test.ts` 常量 + 台账 `designContractChanges[]`（禁静默）
- [ ] `appendSystem` 仅面板内使用（**不进 `KIND_SET`**）
- [ ] **⚠️ 跨叶移交（来源 N-03 / v4-1 validate R1）：卡预算 × 常驻入口准入必须重审** —— 见 **TASK-613**（本卡分类学是「卡」的定义点，卡内可点预算与「常驻导航入口」的判定口径在同处定稿；**不得默认沿用 v4-1 的过渡卡口径**）

**验证命令**:
```bash
npm run typecheck --workspace @lgdl/web-cli-plugin && node design/ui-redesign/option-f-shim.mjs 2>&1 | tail -3
```

### TASK-603（V42-03）: 卡组件实现（7 主类 + 过程族 5 + 四类骨架）
| 属性 | 值 |
|------|-----|
| **复杂度** | L |
| **前置依赖** | TASK-602 |
| **执行波次** | 3 |
| **对应 FR / AC** | FR-CHAT-030~035 / 037 · AC-CHAT-002 / 005 / 011 |
| **ADR / 风险** | ADR-V4-026 / 027 · ADR-V4-013 · R42-05 / R4-12 / R4-13 |

**描述**: 实现 `cards/{ai,user,system,tool,command,thinking,error,notice}.ts`（`ai`/`user` 富文本与对侧气泡复用 `markdown.ts`；`system` 单行 + `.ts` 只追加；`tool` 保留工具名/✓✖/耗时/预览/折叠记忆；`command`/`thinking`/`error`/`notice` 逐形态归位）；`askuser`/`auth`/`ref`/`nextstep` 按父 ADR-V4-013 第 5 条提供**最小骨架**（业务态归 v4-3 / v4-4）。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| NEW | `packages/web-cli-plugin/src/ui/sidepanel/cards/{ai,user,system,tool,command,thinking,error,notice}.ts` |
| MODIFY | `packages/web-cli-plugin/src/ui/sidepanel/cards/index.ts` |

**验收标准**:
- [ ] 5 种既有过程形态**零丢失**：工具卡 / 命令行 `.cmd` / 思考 `.msg-thinking` / 错误 `.entry-error` / 通知 `.msg-notice` 各有存在性断言
- [ ] 工具卡字段逐项保留（工具名 + `ok` + `ms` + 预览非空 + 折叠记忆 480 字符 / 10 行**单一常量**）
- [ ] 固化卡与系统事件行**不压缩**；过程族可折叠
- [ ] `thinking` = 两事件一卡（`thinking` → `thinking-done` → 终态 `completed`），**不是** append 后 remove
- [ ] 每卡模板**结构性**限制可点元素（choice ≤3+兜底+取消=5 / text 3 / auth 3）⇒ 全部 ≤6

**验证命令**:
```bash
npm run typecheck --workspace @lgdl/web-cli-plugin && npm test --workspace @lgdl/web-cli-plugin 2>&1 | tee /tmp/opencode/v4-gate-logs/v4-2/node.log
```

### TASK-604（V42-04）: `stream-render.ts` keyed 增量渲染 + 终态 DOM 冻结
| 属性 | 值 |
|------|-----|
| **复杂度** | L |
| **前置依赖** | TASK-601 |
| **执行波次** | 3 |
| **对应 FR / AC** | FR-CHAT-022 / 023 / 037 · AC-CHAT-005 / 022 · NFR-CHAT-003 / 011 |
| **ADR / 风险** | ADR-V4-025 · ADR-V4-004/012 · R42-02 / R4-13 |

**描述**: `Map<cardId, HTMLElement>` + 三操作（append 新 `li` / patch 未终态卡 / remove 仅 bound 淘汰）；**永不**清空容器；终态卡 DOM 冻结；滚动复用 `scroll-policy.ts`（48px + 双 rAF pin）且上滚期不抢滚动；320px 折行（`pre-wrap` + `overflow-wrap:anywhere`）。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| NEW | `packages/web-cli-plugin/src/ui/sidepanel/stream-render.ts` |
| MODIFY | `packages/web-cli-plugin/src/ui/sidepanel/sidepanel.ts`（滚动接线最小改动） |

**验收标准**:
- [ ] 静态零命中：渲染模块内无 `textContent = ''` / `replaceChildren(`
- [ ] 同一 `cardId` 的 DOM 节点引用在后续渲染后**不变**（`===`）；`cardCount(rendered) === cardCount(project())`
- [ ] 终态卡 `outerHTML` 在后续渲染后**逐字不变**
- [ ] 用户上滚期间追加新卡**不抢滚动**（`scrollFollow.shouldFollow()` 保持权威）；`#scroll-bottom` `hidden` 切换正确
- [ ] 320px：长 URL/长卡零水平溢出

**验证命令**:
```bash
grep -nE "textContent\s*=\s*''|replaceChildren\(" packages/web-cli-plugin/src/ui/sidepanel/stream-render.ts | tee /tmp/opencode/v4-gate-logs/v4-2/render-clear.log
npm run typecheck --workspace @lgdl/web-cli-plugin
```

### TASK-605（V42-05）: `stream-digest.ts` 摘要落库（零明文白名单 + LRU + 降级重建）
| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-601 |
| **执行波次** | 2 |
| **对应 FR / AC** | FR-CHAT-024 / 025 · AC-CHAT-010 · NFR-CHAT-012 · EC-CHAT-003 |
| **ADR / 风险** | ADR-V4-028 · ADR-V4-003 · R42-03 / R4-07 |

**描述**: 面板侧 `chrome.storage.local`（**已有 `storage` 权限**）下 `web-cli/stream-digest:<sessionId>`；字段白名单 `{seq, ts, kind, cardId, terminal, label(≤80 截断), tool, ok, ms, refNum, askRequestId}`；`MAX_DIGEST_SESSIONS = 20`（与既有 `MAX_SESSIONS` 对齐）；面板重开读回**降级重建**（正文位置显示「（历史摘要）」并保留 `seq`/`ts`/`terminal`），截断规则**显式登记**。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| NEW | `packages/web-cli-plugin/src/ui/sidepanel/stream-digest.ts` |

**验收标准**:
- [ ] `DigestEntry` 类型层面**无自由文本字段**；`label` 走既有截断 + 净化（复用 `l1/receipt.ts#assertNoPlaintext` 口径）
- [ ] **零新增权限**（只用已有 `storage`）；**零 SW 改动**（`session-store.ts` / `chat-session.ts` / `KIND_SET` 零 diff）
- [ ] LRU 20 按 `sessionId` 独立；写入幂等（upsert）
- [ ] 降级重建路径可读且**不编造正文**；降级规则登记入 `docs/v4-supersession-ledger.json#entries`
- [ ] 反向用例：注入 URL query / 命令参数体 ⇒ `assertNoPlaintext` **抛错**

**验证命令**:
```bash
git diff --numstat -- packages/web-cli-plugin/src/background/session-store.ts packages/web-cli-plugin/src/background/chat-session.ts packages/web-cli-plugin/src/background/messaging.ts
npm run typecheck --workspace @lgdl/web-cli-plugin
```

### TASK-606（V42-06）: 会话切换语义（seq 不重置 + 分段 + 内存段保留 + bound 登记）
| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-605 |
| **执行波次** | 3 |
| **对应 FR / AC** | FR-CHAT-024 / 025 · AC-CHAT-010 · EC-CHAT-003 / EC-CHAT-006 |
| **ADR / 风险** | ADR-V4-028 · ADR-V4-003 · R42-04 / R42-07 |

**描述**: `{type:'history'}` 到达 ⇒ ① 追加 `system` 行「会话已切换：<label>」② `events` **不清空**（旧段保留 ⇒ 可上滚回看、`tool`/`ok`/`ms` 不丢）③ 按旧 `sessionId` 增量写摘要 ④ `pending=false`，未终态 ask 交 v4-3 结算为 `cancelled(superseded)`。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/web-cli-plugin/src/ui/sidepanel/chat-state.ts` |
| MODIFY | `packages/web-cli-plugin/src/ui/sidepanel/stream-model.ts`（bound 与分段协作） |
| MODIFY | `packages/web-cli-plugin/src/ui/sidepanel/stream-digest.ts` |

**验收标准**:
- [ ] 切换后 `seq` 严格大于切换前最大值（**不重置**）
- [ ] 切换前段的 `tool`/`ok`/`ms` 在切换后仍可读（内存段保留）
- [ ] 截断规则与 `boundStreamEvents` 参数写入 v4 台账（`entries[]`），淘汰计数在状态栏可读（**不静默**）
- [ ] `pending` 在切换时复位；未终态 ask 的结算路径为**留痕**（不静默丢弃）

**验证命令**:
```bash
npm run typecheck --workspace @lgdl/web-cli-plugin && npm test --workspace @lgdl/web-cli-plugin 2>&1 | tee /tmp/opencode/v4-gate-logs/v4-2/node.log
```

### TASK-607（V42-07）: `chat-state.ts` 迁移 + `render()` 切换 + 折叠记忆键迁移
| 属性 | 值 |
|------|-----|
| **复杂度** | L |
| **前置依赖** | TASK-603 / TASK-604 / TASK-606 |
| **执行波次** | 4 |
| **对应 FR / AC** | FR-CHAT-020 / 022 / 026 · AC-CHAT-010 / 020 |
| **ADR / 风险** | ADR-V4-024 · ADR-V4-029 · R42-06 / R4-08 |

**描述**: `chat-state.ts` 新增 `stream: StreamState` 与 `streamReducer` **追加分支**（12 个既有 action **零删除**，既有 case 语义不改）；`entries`/`nextId` **保留为派生视图**；`sidepanel.ts` 的 `render()` 流渲染段替换为 `streamRender(project(state.stream))`；`toolOpenState` 键从 entry id → `cardId`。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/web-cli-plugin/src/ui/sidepanel/chat-state.ts` |
| MODIFY | `packages/web-cli-plugin/src/ui/sidepanel/sidepanel.ts` |
| MODIFY | `packages/web-cli-plugin/src/ui/sidepanel/view-model.ts` |

**验收标准**:
- [ ] 12 个既有 action **零删除**；`render()` 内无 `textContent = ''` / `replaceChildren(`
- [ ] `KIND_SET` 零 diff（新 kind **零新增**）；`entries`/`nextId` 派生视图仍可供未迁移断言共用
- [ ] `toolOpenState` 键改 `cardId` 后折叠记忆行为等价（同一卡重渲染后折叠态保持）
- [ ] `cardCount(rendered) === cardCount(project())` 在会话切换 / 视图往返后仍成立

**验证命令**:
```bash
git diff --numstat -- packages/web-cli-plugin/src/background/messaging.ts
grep -rnE "textContent\s*=\s*''|replaceChildren\(" packages/web-cli-plugin/src/ui/sidepanel/sidepanel.ts | tee /tmp/opencode/v4-gate-logs/v4-2/clear-path.log
npm run typecheck --workspace @lgdl/web-cli-plugin
```

### TASK-608（V42-08）: `test/stream-model.test.ts`（node）
| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-601 / TASK-607 |
| **执行波次** | 5 |
| **对应 FR / AC** | FR-CHAT-020 / 025 · AC-CHAT-010 · NFR-CHAT-001 |
| **ADR / 风险** | ADR-V4-024 · R42-01 / R42-04 |

**描述**: node 单测：不可变 / `seq` 单调不复用（含跨切换）/ 回放等价 / 终态冻结 / **无「置 null 消失」路径** / `boundStreamEvents` 淘汰规则（三类卡永不淘汰）/ 会话切换 `seq` 不回退。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| NEW | `packages/web-cli-plugin/test/stream-model.test.ts` |

**验收标准**:
- [ ] 六组用例齐备（不可变 / 单调 / 回放 / 冻结 / 无 null 消失 / bound）
- [ ] 回放等价为**双向**断言（同输入同输出 + 不同输入不同卡）
- [ ] bound 用例断言「ask/auth 终态卡 + tool 卡 + ref 卡 + 当前段」**逐类不被淘汰**
- [ ] `npm test` 运行期用例**只增**（本叶新增计入 `nodeTestRuntime`）

**验证命令**:
```bash
npm test --workspace @lgdl/web-cli-plugin 2>&1 | tee /tmp/opencode/v4-gate-logs/v4-2/node.log
```

### TASK-609（V42-09）: `test/stream-persistence.test.ts`（node，零明文 + 降级）
| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-605 / TASK-606 |
| **执行波次** | 5 |
| **对应 FR / AC** | FR-CHAT-024 · AC-CHAT-010 / 021 · NFR-CHAT-012 · EC-CHAT-003 |
| **ADR / 风险** | ADR-V4-028 · R42-03 / R4-07 |

**描述**: node 单测：摘要 schema 逐字段 / 零明文白名单（正例通过 + 反向用例注入 URL query 与命令参数体**必须抛错**）/ LRU 20 与 bound / 会话切换还原与**降级登记**。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| NEW | `packages/web-cli-plugin/test/stream-persistence.test.ts` |

**验收标准**:
- [ ] 白名单**逐字段**断言（多一个自由文本字段 ⇒ FAIL）
- [ ] 反向用例 ≥2（URL query / 命令参数体）⇒ 抛错
- [ ] 降级重建：正文位置显示「（历史摘要）」+ `seq`/`ts`/`terminal` 保留；**不编造正文**
- [ ] LRU 与既有 `MAX_SESSIONS=20` 对齐断言

**验证命令**:
```bash
npm test --workspace @lgdl/web-cli-plugin 2>&1 | tee /tmp/opencode/v4-gate-logs/v4-2/node.log
```

### TASK-610（V42-10）: `test/ui/stream.mjs`（Chromium；真实产物侧等价断言）
| 属性 | 值 |
|------|-----|
| **复杂度** | L |
| **前置依赖** | TASK-607 |
| **执行波次** | 5 |
| **对应 FR / AC** | AC-CHAT-001 / 002 / 003 / 005 / 011 / 022 / 025 · FR-CHAT-030~037 |
| **ADR / 风险** | ADR-V4-011 第 4/7 条 · ADR-V4-025/026/027 · R42-02 / R4-20 |

**描述**: 新 Chromium 门禁：7 主类 + 过程族 5 渲染 / 固化契约（操作前→后）/ 增量渲染（不清空 + 终态 `outerHTML` 冻结 + 节点引用不变）/ 滚动（48px 跟随 + 上滚不抢）/ 320px / 无障碍（`role=log` + `.ts` 可读 + `aria-live` + 收起 `hidden`）。**真实产物侧的 shim 等价断言落在本文件**（R4-20：设计稿/真产物分列）。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| NEW | `packages/web-cli-plugin/test/ui/stream.mjs` |

**验收标准**:
- [ ] 12 卡型逐型存在性 + `data-msg-type` 正确；过程族 5 形态信息零丢失
- [ ] 增量渲染三条：无清空 API 调用 / 节点引用不变 / 终态 `outerHTML` 不变
- [ ] 固化契约：操作前 `data-*` 初值 + 表单可见；操作后表单 `hidden` + 固化区可见 + `.ts` 格式 `HH:MM:SS`
- [ ] 320 / 400 / 520 三宽度零水平溢出；长会话（≈320 `li`）追加不整层重建
- [ ] 与 shim B/C/D/E 分组的**等价断言**逐组存在（首轮实测计数登记入 v4 台账）

**验证命令**:
```bash
npm run build --workspace @lgdl/web-cli-plugin && node packages/web-cli-plugin/test/ui/stream.mjs 2>&1 | tee /tmp/opencode/v4-gate-logs/v4-2/stream.log
```

### TASK-611（V42-11）: 联动门禁（l0 追加 / sidepanel-view 契约④ / perf-budget / gate-integrity / scripts）
| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-610 |
| **执行波次** | 6 |
| **对应 FR / AC** | FR-CHAT-022 / 023 / 084 · AC-CHAT-023 / 025 · NFR-CHAT-003 |
| **ADR / 风险** | ADR-V4-011 第 3/6 条 · R4-16 / R4-19 / R4-20 |

**描述**: `l0.mjs` 追加「`#stream` 内卡不污染外壳密度」复算（+1~2 条，**不重命名文件**）；`sidepanel-view.test.ts` 契约 ④（`#log.empty` → `#stream` 空态）本叶等价改写；`perf-budget.test.ts` 追加长会话增量渲染不回退；`gate-integrity.test.ts` 的 `EXPECTED_AUDITED_FILES` **追加 `test/ui/stream.mjs`**（**不动 `CHROMIUM_GATES.length === 9`**）；`package.json` 追加 `test:stream`。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/web-cli-plugin/test/ui/l0.mjs` |
| MODIFY | `packages/web-cli-plugin/test/sidepanel-view.test.ts` |
| MODIFY | `packages/web-cli-plugin/test/perf-budget.test.ts` |
| MODIFY | `packages/web-cli-plugin/test/gate-integrity.test.ts` |
| MODIFY | `packages/web-cli-plugin/package.json` |

**验收标准**:
- [ ] `EXPECTED_AUDITED_FILES` 含 `test/ui/stream.mjs`；`CHROMIUM_GATES.length === 9` 字面量**未改**
- [ ] `l0.mjs` 计数 ≥164（只增）；`sidepanel-view.test.ts` ≥38（只增）
- [ ] `perf-budget.test.ts` 新用例断言 ≈320 `li` 增量渲染不回退（不整改树重建语义）
- [ ] `npm run test:stream` 可在 `test:v4` 链内串行执行；in-gate 例外文本（若涉及）只增

**验证命令**:
```bash
npm run test:l0 --workspace @lgdl/web-cli-plugin 2>&1 | tee /tmp/opencode/v4-gate-logs/v4-2/l0.log
npm run test:gate-integrity --workspace @lgdl/web-cli-plugin 2>&1 | tee /tmp/opencode/v4-gate-logs/v4-2/gate-integrity.log
```

### TASK-612（V42-12）: 本叶收口（全门禁串行 + 台账 counts + 五要素中间重登记）
| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-608 / 609 / 610 / 611 |
| **执行波次** | 7 |
| **对应 FR / AC** | AC-CHAT-023 · FR-CHAT-094 · NFR-CHAT-006/007/009 |
| **ADR / 风险** | ADR-V4-010/011 · R4-09 / R4-15 / R4-16 |

**描述**: 严格串行跑全门禁（`typecheck → build → npm test → supersession → gate-integrity → zero-injection → page-input → l0 → l1 → l2 → density → ui(journey) → insight → binding → hardening → e2e → stream`），日志落盘；v4 台账追加本叶 `entries`/`modifiedRanges`/`counts`（`nodeTestRuntime` / `l0.mjs` / `sidepanel-view`）；五要素中间重登记（`PENDING_ABSOLUTE_CAP` 保持 `resolved:false`）。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/web-cli-plugin/test/size-baseline.ts` |
| MODIFY | `packages/web-cli-plugin/docs/v4-supersession-ledger.json` |
| NEW（临时日志） | `/tmp/opencode/v4-gate-logs/v4-2/*.log` |

**验收标准**:
- [ ] 全 17 项门禁绿；计数只增（l0 ≥164 / journey ≥167 / density ≥127 / nodeTestRuntime ≥ max(646, 实测)）
- [ ] 五要素齐备；容差 5% 不变；`PENDING_ABSOLUTE_CAP` 不预填
- [ ] 不动面：`content.js` 177,076 / `pick-layer.js` 33,900 / `KIND_SET` 零 diff / 判定链 pin 不变
- [ ] `dist/sidepanel.js` 实测值重登记并写明「有意增重」功能理由

**验证命令**:
```bash
for s in typecheck build test test:supersession test:gate-integrity test:zero-injection test:page-input test:l0 test:l1 test:l2 test:density test:ui test:insight test:binding test:hardening test:e2e test:stream; do npm run $s --workspace @lgdl/web-cli-plugin 2>&1 | tee "/tmp/opencode/v4-gate-logs/v4-2/${s//:/-}.log" || exit 1; done
stat -c %s packages/web-cli-plugin/dist/sidepanel.js
```

### TASK-613（跨叶移交，来源 N-03 / v4-1 validate R1）: 卡预算 × 常驻入口准入重审（裁决或收紧，禁默认沿用）
| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-602 / TASK-603（7 主类卡落地后） |
| **执行波次** | 与 TASK-602/603 同轮（验收型，不另立波次） |
| **对应 FR / AC** | FR-CHAT-072 / 073 / 075（v4-1 定义）+ FR-CHAT-021/022/030（本叶 7 主类卡）· AC-CHAT-023 / 025 |
| **ADR / 风险** | 父 ADR-V4-020（密度新口径与两条防滥用）· R42-05 |
| **登记来源** | 横切登记（非本叶原生任务）：`.sddu/.../specs-tree-v4-1-zone-shell-density/validate-report.md` §5 **N-03**（severity 中）+ 本叶 v4-1 `build.md` 收口轮小节 |

**描述（移交义务，原文要点）**: v4-1 的密度豁免口径为「`#stream` 子树不计入密度」，两条防滥用为「单卡可点 ≤6」与「首屏（空流欢迎态）卡 ≤2」。validate R1 以对抗探针实测：一张流内 `[data-msg-type]` 卡装 **6 个**常驻入口时 **guard 不抛、单卡预算 PASS、首屏预算 PASS、密度 C1 不变** ⇒ **无门禁变红**（7 个才红）；理论上「首屏 2 卡 × 每卡 6 可点 = **12 个常驻入口**」可全部落在豁免子树内（v3 全局面板上限为 7）。v4-1 之所以不拦，是因为其卡面是**过渡卡口径**（`#l0-decision` 等占位宿主的内容体，`data-transitional-host` 尚未清零，本叶才落 7 主类卡）。

**本叶必须交付（二选一，不得沉默）**:
1. **裁决并落地判定**：明确「卡内可点 = 内容交互（不计常驻导航入口）」与「常驻导航入口（工具栏/状态栏/固定视图入口）不得进入 `#stream`」的**可判定标记/形态判据**（如 `data-toolbar-slot` / `.view-btn` / `data-chrome-control` 的形态或位置判定），并在 `test/ui/density.mjs` 的防滥用反证里加一条**真会红**的注入；
2. **收紧**：给「首屏可见卡内常驻可点总量」设上限（≤ 现状实测值），并把上限与反证一并登记进 `docs/v4-density-baseline.json`（阈值/上限只允许收紧，禁放宽）。

**验收标准**:
- [ ] 给出显式裁决文本（写入本叶 `build.md`），或给出收紧后的机器判据 —— **二者必居其一，禁止「沿用 v4-1 过渡口径」**
- [ ] 新增/变更的判据配**可 FAIL 反证**（注入 → 必红 → 还原 → 必绿），日志落 `/tmp/opencode/v4-gate-logs/v4-2/`
- [ ] `docs/v4-density-baseline.json#knownLimitations[0]`（「v4-2 落 7 主类卡后必须重审」）在本任务完成后更新为「已重审 + 结论」，不得留着旧状态
- [ ] 断言只增不减；阈值 `7/15 · 9/20 · 17/35` 与 §v4 体积口径零放宽

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/web-cli-plugin/test/ui/density.mjs`（防滥用判据/反证） |
| MODIFY | `packages/web-cli-plugin/docs/v4-density-baseline.json`（上限与 knownLimitations 结论） |
| MODIFY（必要时） | `packages/web-cli-plugin/src/ui/sidepanel/density-scope.ts`（若裁决需要新常量/标记） |

**验证命令**:
```bash
npm run typecheck --workspace @lgdl/web-cli-plugin
npm run test:density --workspace @lgdl/web-cli-plugin 2>&1 | tee /tmp/opencode/v4-gate-logs/v4-2/density.log
npm run test:density --workspace @lgdl/web-cli-plugin -- --reverse <新增反证编号> 2>&1 | tee /tmp/opencode/v4-gate-logs/v4-2/density-reverse.log
```

## 3. 任务汇总

| 统计项 | 数值 |
|--------|:--:|
| 总任务数 | **12**（TASK-601~612 / V42-01~12） |
| S 级 | 0 |
| M 级 | 7 |
| L 级 | 5（TASK-601 / 603 / 604 / 607 / 610） |
| 执行波次 | **7** |
| **跨叶移交任务** | **1**（TASK-613，来源 **N-03 / v4-1 validate R1**；不计入上表 12 任务与 7 波次 —— 它是**约束型验收任务**，必须与 TASK-602/603 同轮交付裁决或收紧） |

## 4. 执行策略

| 波次 | 任务 | 策略 |
|:--:|------|------|
| 1 | TASK-601 | 串行（模型地基，全部卡与渲染的唯一前置） |
| 2 | TASK-602, TASK-605 | 并行（分类学单源 ∥ 摘要落库） |
| 3 | TASK-603, TASK-604, TASK-606 | 并行（卡组件 ∥ 渲染器 ∥ 切换语义；文件不相交） |
| 4 | TASK-607 | 串行（`chat-state`/`sidepanel` 汇聚单点） |
| 5 | TASK-608, TASK-609, TASK-610 | 写入可并行；**运行严格串行**（node → node → Chromium） |
| 6 | TASK-611 | 串行（联动门禁 + 元门禁追加） |
| 7 | TASK-612 | 串行收口 |

**D-005 测试守恒账（本叶）**：

| 门禁 | v3 末轮实测基线 | 本叶处置 | 本叶预期 |
|------|:--:|------|:--:|
| 新增 `test/ui/stream.mjs` | — | **新增**（Chromium；7 主类 + 过程族 + 固化 + 增量 + 320px + 无障碍） | 首轮实测登记（只增） |
| 新增 `test/stream-model.test.ts` | — | **新增**（node，六组） | 新增用例计入 node |
| 新增 `test/stream-persistence.test.ts` | — | **新增**（node，零明文 + LRU + 降级） | 新增用例计入 node |
| `test/ui/l0.mjs` | **164** | 追加 1~2 条（不重命名） | **≥164** |
| `test/sidepanel-view.test.ts` | **38** | 契约 ④ 等价改写（本叶负责；①②③ 在 v4-1） | **≥38** |
| `test/perf-budget.test.ts` | 只增 | 追加长会话增量渲染用例 | **只增** |
| `npm test`（node 运行期） | 台账 **832** / 末轮 **795** | 新增 2 个 node 文件 | **≥ max(646, 实测)** |
| `test/ui/journey.mjs` / `l1` / `l2` / `density` / `insight` / `binding` | 167 / 103 / 71 / 127 / 116 / 192 | **零改动**（本叶不触碰这些文件的语义；仅选择器不受影响） | 不变 |

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建。12 任务 / 7 波；模型（601）→ 分类学与摘要（602/605）→ 卡/渲染/切换（603/604/606）→ 迁移（607）→ 三门禁（608/609/610）→ 联动（611）→ 收口（612）。含 D-005 守恒账与 R4-19/R4-20 的落点（`countMethod` 显式 + 设计稿/真产物分列）。 | 2026-09-18 | SDDU Tasks Agent |
| v1.1 | **跨叶移交追加（编排器授权的登记，非本叶重排）**：追加 **TASK-613**（卡预算 × 常驻入口准入重审 —— 裁决或收紧，禁默认沿用 v4-1 过渡卡口径），来源 = 叶 `specs-tree-v4-1-zone-shell-density` 的 `validate-report.md` §5 **N-03（中）**（流内卡 6 个常驻入口不被任何门禁拦，7 个才红；理论 2 卡 × 6 = 12 常驻入口可落入豁免子树）。同步：TASK-602 验收标准加注该约束、§3 汇总表加「跨叶移交任务」一行。**不改变**原 12 任务 / 7 波的结构与计数；阈值与体积口径零放宽。 | 2026-09-19 | SDDU Build Agent（v4-1 收口轮，N-03 移交） |

---

## 5. 构建完成状态（sddu-build，2026-09-19）

| 任务 | 状态 | 证据 |
|------|:--:|------|
| TASK-601~612 | ✅ completed | 源文件/测试见 `build.md` §2；门禁账 §8；体积五要素 §9 |
| **TASK-613（跨叶移交）** | ✅ completed | 裁决原文 + RP-V4-09 真会红反证 + `knownLimitations[0]` 更新见 `build.md` §7 |

- 门禁 20 项串行全绿（基线 19 + 新增 `test:stream`）；日志 `/tmp/opencode/v4-gate-logs/v4-2/`。
- 体积：`dist/sidepanel.js` 385,319 → **425,442 B**（五要素中间重登记）；`content.js` 177,076 / `pick-layer.js` 33,900 / `KIND_SET` 零 diff。
- 下一阶段：`@sddu-review specs-tree-v4-2-chat-stream-model`。
