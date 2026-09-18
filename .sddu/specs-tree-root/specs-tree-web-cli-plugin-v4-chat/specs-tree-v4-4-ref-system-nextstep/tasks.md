# 任务分解：specs-tree-v4-4-ref-system-nextstep（V4-4 引用卡 / 系统事件行 / 推荐卡 + 拾取入口迁移）

> **文档定位**: SDDU 任务清单 — 本叶 12 个原子任务（TASK-801~812 / 叶内别名 V44-01~12）；**权威跨叶契约见父 `../plan.md` + 父 `../tasks.md`**
> **前置依赖**: 本叶 `plan.md` v1.0（ADR-V4-035~040）+ 父 `plan.md` v1.0（ADR-V4-014 / 015 / 010 / 007 / 009 / 011）+ 本叶/父 `spec.md` v1.0
> **创建人**: SDDU Tasks Agent
> **创建时间**: 2026-09-18
> **版本**: v1.0
> **更新人**: SDDU Tasks Agent
> **更新时间**: 2026-09-18
> **更新说明**: 初始创建（12 任务 / 6 波；**末任务 = V3-VOL-3 收口锚**（重定基线 + 绝对上限带值 + 作者确认推导值）；收口含**宿主计数 = 0 断言**）

## 0. 红线与纪律（本叶）

| # | 红线 | 守线任务 |
|---|------|---------|
| 1 | 引用投影点**三处保持三处**（页面角标 / 流内 ref 卡含证据层 / 状态栏风险 chip）——**不新增第四处** | TASK-801 |
| 2 | `l1/ref-store.ts` 判定 / 序号 / 退役语义**零变更**（只追加投影接口）；`ref-validity.ts` 五维 + fail-closed 零改 | TASK-801 / TASK-812 |
| 3 | 系统事件行**只追加不覆盖**（`#notice` 覆盖语义被取代）；去重窗口 + 速率上限 + `dropped` **不静默** | TASK-802 |
| 4 | 推荐真值**白名单 7 项**；**禁**设置项计数类真值；无候选不渲染空卡；chips 走**同一生产入口** | TASK-804 / TASK-805 |
| 5 | 拾取入口：`requestPick()` **唯一生产入口**；未授权**零注入**；`pick-layer.js` **零改动** | TASK-806 |
| 6 | **V3-VOL-3 带值闭合**：`PENDING_ABSOLUTE_CAP` 三值齐备 + `absoluteCeilingBytes = ceilTo50KB(B_final) × 1.10` + **作者确认**；**禁预填、禁静默删除标记、禁伪闭合** | TASK-811 |
| 7 | 判定 `min(绝对上限, floor(基线×1.05))`；`SIDEPANEL_CEILING_CAP` 保持 `record-only`**不被读取** | TASK-811 |
| 8 | **宿主计数 = 0**：`document.querySelectorAll('[data-transitional-host]').length === 0` | TASK-812 |
| 9 | 不动面：`content.js` 177,076 / `pick-layer.js` 33,900 / manifest 零 diff / `KIND_SET` 零 diff / 判定链 pin | TASK-812 |
| 10 | 门禁严格串行（本叶收尾 **21 项**实测清单，8 个 Chromium；ADR-V4-040 记为「20 项」，差异见 §0 注）；日志 `/tmp/opencode/v4-gate-logs/v4-4/`（禁 tail 截断） | TASK-812 |

## 1. 依赖拓扑总览

```
[前置] v4-2 收口绿（CP-2：TASK-612）；v4-3 收口绿后执行门禁（CP-3，可并行分解）

Wave 1 ── (无叶内依赖)
  TASK-801 [L] cards/ref.ts + l1/ref-store.ts 投影接口 + 引用生命周期入流（三处保持三处）

Wave 2 ── (依赖 801 / 叶前置)
  TASK-802 [L] system-events.ts appendSystem 单通道 + cards/system.ts + stream-plaintext.ts
  TASK-804 [L] recommend.ts（真值白名单 + 规则表 + 优先级 + 上限 + 安全边界）

Wave 3 ── (依赖 802/804)
  TASK-803 [L] 6+ 通道归并接线 + index.html strips 移除 + 首装卡
  TASK-805 [M] cards/nextstep.ts（chips 即指令 + pending 门控 + 无候选不渲染）
  TASK-806 [M] requestPick() 单一入口 + 未授权设置视图引导（零注入）
  TASK-807 [M] cards/index.ts 注册 + statusbar 事件源 + view-model

Wave 4 ── (门禁)
  TASK-808 [M] test/recommendation-sources.test.ts + test/ref-pick-wiring.test.ts（node）
  TASK-809 [L] test/ui/recommendation.mjs（Chromium）

Wave 5 ── (联动门禁 + V3-VOL-3)
  TASK-810 [M] l1/l0/page-input 重锚 + gate-integrity 追加 + package.json
  TASK-811 [L] **V3-VOL-3 收口 8 步**（B_final → 五要素 → 绝对上限推导 → 作者确认 → 三值闭合 → min() → 3 反证）

Wave 6 ── (父级收口锚)
  TASK-812 [L] 宿主计数 = 0 断言 + 收尾 21 项门禁串行 + 不动面复核 + 台账 v3Vol3Closeout/counts
```

## 2. 任务列表

### TASK-801（V44-01）: `cards/ref.ts` + `ref-store` 投影接口 + 引用生命周期入流
| 属性 | 值 |
|------|-----|
| **复杂度** | L |
| **前置依赖** | 无叶内依赖（前置 = v4-2 收口 TASK-612） |
| **执行波次** | 1 |
| **对应 FR / AC** | FR-CHAT-050 / 051 / 052 · AC-CHAT-012 · EC-CHAT-005 |
| **ADR / 风险** | ADR-V4-035 · R44-05 / R4-11 |

**描述**: `ref` 卡（有效：序号 ① + 选择器/语义路径/文本摘要/捕获时间（证据层展开）；失效：`data-ref-state="stale"` + `.ref-stale-why` + `[data-act="repick"]` + `[data-act="describe"]` 兜底默认收起）；`l1/ref-store.ts` **只追加**投影点事件接口（判定 / 序号单调不复用 / 退役留痕零变更）；重拾 / 重锚 ⇒ **新 `ref` 卡**（`refNum+1`），旧卡冻结 `stale` 零改动。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| NEW | `packages/web-cli-plugin/src/ui/sidepanel/cards/ref.ts` |
| MODIFY | `packages/web-cli-plugin/src/ui/sidepanel/l1/ref-store.ts`（仅追加投影接口） |
| MODIFY | `packages/web-cli-plugin/src/ui/sidepanel/cards/index.ts` |

**验收标准**:
- [ ] 投影点**恰三处**（页面角标 / 流内 ref 卡 / 状态栏风险 chip）；`#l0-ref-toggle` 与 `#l1-ref` 被**吸入**卡内，总数不增
- [ ] `ref-store` 判定 / 序号 / 退役语义零变更（`isRefUsable = verdict === 'valid'` 仍在 `ref-validity.ts`）
- [ ] 旧卡零改动：重拾后旧卡 `data-ref-state` 保持 `stale` 且 DOM 不变
- [ ] 两条恢复路径齐备（重新拾取 → `requestPick()`；改用描述 → 兜底输入默认收起）
- [ ] 失效可发现性：状态栏「引用失效」风险 chip 在失效时可见（J2 联动）

**验证命令**:
```bash
npm run typecheck --workspace @lgdl/web-cli-plugin
git diff --stat -- packages/web-cli-plugin/src/ui/sidepanel/l1/ref-validity.ts
```

### TASK-802（V44-02）: `system-events.ts` `appendSystem` 单通道 + `cards/system.ts` + `stream-plaintext.ts`
| 属性 | 值 |
|------|-----|
| **复杂度** | L |
| **前置依赖** | TASK-801 |
| **执行波次** | 2 |
| **对应 FR / AC** | FR-CHAT-053 · AC-CHAT-011 · NFR-CHAT-011 / 012 |
| **ADR / 风险** | ADR-V4-036 · R44-03 / R44-04 / R4-07 |

**描述**: `appendSystem(kind, text)` **唯一通道**：① 净化（白名单 + `assertStreamPlaintext`）② 去重窗口（`dedupeKey = kind + ':' + normalizedText`，`SYSTEM_DEDUPE_WINDOW_MS = 5000`，窗口后重现阶段前缀「持续」）③ 速率上限（`SYSTEM_ROWS_PER_MINUTE_CAP = 20`，超出 ⇒ `dropped` +1 且状态栏可读）④ 追加（**不 patch、不覆盖**）；`cards/system.ts` 单行 + `.ts`；`stream-plaintext.ts` 字段白名单 + `label` 工厂（v4-3 共用）。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| NEW | `packages/web-cli-plugin/src/ui/sidepanel/system-events.ts` |
| NEW | `packages/web-cli-plugin/src/ui/sidepanel/cards/system.ts` |
| NEW | `packages/web-cli-plugin/src/ui/sidepanel/stream-plaintext.ts` |

**验收标准**:
- [ ] 通道唯一：`appendSystem` 是唯一写入 system 事件行的入口（静态断言；无第二处直写）
- [ ] 四条管线齐备且可单测（净化 / 去重窗口 / 速率上限 / 追加）
- [ ] 丢弃**不静默**：`dropped` 计数在状态栏可读
- [ ] system 行**只追加**：`#notice` 覆盖语义不再出现（断言「同一 key 不覆盖既有行」）
- [ ] 零明文：反向用例（URL query / 页面文本）⇒ 抛错

**验证命令**:
```bash
npm run typecheck --workspace @lgdl/web-cli-plugin && npm test --workspace @lgdl/web-cli-plugin 2>&1 | tee /tmp/opencode/v4-gate-logs/v4-4/node.log
```

### TASK-803（V44-03）: 6+ 通道归并接线 + `#panel-bottom` 移除 + 首装卡
| 属性 | 值 |
|------|-----|
| **复杂度** | L |
| **前置依赖** | TASK-802 |
| **执行波次** | 3 |
| **对应 FR / AC** | FR-CHAT-054 · AC-CHAT-011 · EC-CHAT-003 / 006 / 007 |
| **ADR / 风险** | ADR-V4-036 · R44-03 / R4-18 |

**描述**: 逐通道归并：`#env-guard` / `#site-hint` / `#notice` / `#send-reason`（仅原因变化时追加）→ `system` 行；导航失效（`invalidated` false→true **跳变**）→ `system` 行；探测态（相位**变化**时追加，R2 稳态去噪保留）→ `system` 行；`#onboarding` / `#discovery-notice` → **首装卡**（`firstRun` 档 + 可终结）；`#panel-bottom` + 6 strips 容器移除。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/web-cli-plugin/src/ui/sidepanel/sidepanel.ts` |
| MODIFY | `packages/web-cli-plugin/src/ui/sidepanel/index.html` |
| MODIFY | `packages/web-cli-plugin/src/ui/sidepanel/view-model.ts` |

**验收标准**:
- [ ] 归并矩阵逐行落地（来源 ∈ {env-guard, site-hint, onboarding, discovery-notice, notice, send-reason, 导航失效, 探测态, 会话切换, 超时/取代, 引用失效/重锚}）
- [ ] 既有语义零丢：onboarding/discovery-notice **可终结**条件保留；R2 退避 + 稳态语义零改动
- [ ] `#panel-bottom` 与 6 strips 容器从 `index.html` 移除（台账登记）
- [ ] 首装卡计入 `firstRun` 档（不与 default 混算）；欢迎卡 ≤1 张且 ≤8 行
- [ ] 探测态**稳态不刷屏**（只在相位变化追加）

**验证命令**:
```bash
node -e "const h=require('fs').readFileSync('packages/web-cli-plugin/src/ui/sidepanel/index.html','utf8');if(h.includes('panel-bottom'))throw new Error('panel-bottom residual');console.log('panel-bottom: removed')"
npm run typecheck --workspace @lgdl/web-cli-plugin
```

### TASK-804（V44-04）: `recommend.ts`（真值白名单 + 规则表 + 优先级 + 上限 + 安全边界）
| 属性 | 值 |
|------|-----|
| **复杂度** | L |
| **前置依赖** | 无叶内依赖（前置 = v4-2 的 `project()`） |
| **执行波次** | 2 |
| **对应 FR / AC** | FR-CHAT-060 / 062 / 064 · AC-CHAT-013 · EC-CHAT-008 |
| **ADR / 风险** | ADR-V4-037 · ADR-V4-015 · R44-01 / R44-06 |

**描述**: 推荐生产者：真值**白名单 7 项**（引用状态 / 会话状态（含未答卡数）/ 站点授权与信任态 / 命令档案静态面 `toolCount`·`subcommandCount` / 探测状态 / 五类风险态 / onboarding 步骤）；常量 `MAX_NEXTSTEP_CARDS_PER_ROUND=1` / `MAX_CHIPS_PER_CARD=3` / `NEXTSTEP_PRIORITY=['risk-recovery','ref-action','onboarding','capability-discovery']` / `NEXTSTEP_MIN_INTERVAL_MS=10000`；**明确排除** `deriveCounts().settings` 与任何「视图有 N 项」派生；安全边界（不推荐被拦 / deny 动作；不确定 ⇒ 不推荐）。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| NEW | `packages/web-cli-plugin/src/ui/sidepanel/recommend.ts` |

**验收标准**:
- [ ] 导入集合 ⊆ 白名单模块集合（静态可断言）；**零** `settings` / `deriveCounts(…).settings` 引用
- [ ] 规则表以常量导出且可复算（4 条优先级 + 上限 + 间隔）
- [ ] 无候选 ⇒ 返回空集（**不渲染**空卡）
- [ ] 四个产生时机齐备（拾取后 / 引用失效后 / 空闲时 / 首装）
- [ ] 零新增 LLM 调用 / 零新增网络面

**验证命令**:
```bash
grep -rn "\.settings\|deriveCounts" packages/web-cli-plugin/src/ui/sidepanel/recommend.ts | tee /tmp/opencode/v4-gate-logs/v4-4/recommend-settings.log
npm run typecheck --workspace @lgdl/web-cli-plugin
```

### TASK-805（V44-05）: `cards/nextstep.ts`（chips 即指令 + `pending` 门控 + 无候选不渲染）
| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-804 |
| **执行波次** | 3 |
| **对应 FR / AC** | FR-CHAT-061 / 062 / 063 · AC-CHAT-013 · EC-CHAT-008 |
| **ADR / 风险** | ADR-V4-037 · R44-02 / R44-06 |

**描述**: 推荐卡渲染（≤3 chips）；chip 点击 → `requestTurn(chipCommand)`（与 composer 提交**同一生产入口**，同一校验/门控/审计）；`pending === true` ⇒ chips `disabled` + `aria-disabled`（**不隐藏**）且**不生成新卡**；`pending` 结束 ⇒ 重新评估候选。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| NEW | `packages/web-cli-plugin/src/ui/sidepanel/cards/nextstep.ts` |
| MODIFY | `packages/web-cli-plugin/src/ui/sidepanel/sidepanel.ts`（`requestTurn` 抽取为可复用入口） |

**验收标准**:
- [ ] 单卡 chips ≤3；单卡可点 ≤6（3 chips + 兜底）
- [ ] chip 点击走**同一生产入口**（无旁路 handler；布线可断言）
- [ ] `pending` 期间 chips `disabled` 且不生成新卡；`pending` 结束重新评估
- [ ] 无候选不渲染（无「下一步：无」式假推荐）
- [ ] 文案零明文（静态文案 / 结构化字段拼接）

**验证命令**:
```bash
npm run typecheck --workspace @lgdl/web-cli-plugin && node packages/web-cli-plugin/design/ui-redesign/option-f-shim.mjs 2>&1 | tail -3
```

### TASK-806（V44-06）: `requestPick()` 单一生产入口 + 未授权引导（零注入）
| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-801 |
| **执行波次** | 3 |
| **对应 FR / AC** | FR-CHAT-055 · AC-CHAT-012 / 020 · EC-CHAT-007 |
| **ADR / 风险** | ADR-V4-038 · R44-05 / R4-11 |

**描述**: `pick-input.ts` 暴露 `requestPick()`（`startPick()` 薄封装，**行为零变更**）；`l1/panels.ts:259` 的 `pick.click()`（依赖被退役的 `#l0-pick` DOM）替换为 `requestPick()`；`cards/ref.ts` 与设置视图引导都调用它；未授权站点：设置视图「站点与授权」分区内含 `#authorize` + 拾取指引文案（**不注入任何东西**）。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/web-cli-plugin/src/ui/sidepanel/pick-input.ts` |
| MODIFY | `packages/web-cli-plugin/src/ui/sidepanel/l1/panels.ts` |
| MODIFY | `packages/web-cli-plugin/src/ui/sidepanel/index.html`（设置视图指引文案） |

**验收标准**:
- [ ] `requestPick()` 为**唯一**生产入口（`startPick()` 只被它调用）
- [ ] 全仓无指向 `#l0-pick` 的 DOM 引用残留；页面侧入口**保持可达**（`pick-layer.js` 零改动）
- [ ] 未授权零注入：未授权站点不因拾取引导产生任何注入（`test:zero-injection` 27 断言保持）
- [ ] 可发现性三路径齐备（页面侧入口 / 流内卡与推荐 chip / 未授权设置视图引导）

**验证命令**:
```bash
grep -rn "l0-pick" packages/web-cli-plugin/src/ui/sidepanel/ | tee /tmp/opencode/v4-gate-logs/v4-4/l0-pick-residual.log
git diff --stat -- packages/web-cli-plugin/src/content/pick-layer.ts
npm run test:zero-injection --workspace @lgdl/web-cli-plugin 2>&1 | tee /tmp/opencode/v4-gate-logs/v4-4/zero-injection.log
```

### TASK-807（V44-07）: 卡注册 + 状态栏事件源 + 视图模型
| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-801 / TASK-802 |
| **执行波次** | 3 |
| **对应 FR / AC** | FR-CHAT-050 / 053 / 054 · AC-CHAT-011 / 012 |
| **ADR / 风险** | ADR-V4-035 / 036 · R44-09 |

**描述**: `cards/index.ts` 注册 `ref`/`system`/`nextstep`（**12 项不变**）；`statusbar.ts` 的风险 chips 事件源接入 `appendSystem` 同一事件流（失效 / 重锚 / 探测 / 硬底线）；`view-model.ts` 增加 `systemEvents` / `refCards` / `nextstepCards` + 首装卡视图模型。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/web-cli-plugin/src/ui/sidepanel/cards/index.ts` |
| MODIFY | `packages/web-cli-plugin/src/ui/sidepanel/statusbar.ts` |
| MODIFY | `packages/web-cli-plugin/src/ui/sidepanel/view-model.ts` |

**验收标准**:
- [ ] `CARD_TYPES` 仍为 12 项（不新增卡型）
- [ ] 风险 chip 与系统事件行**同源**（失效/重锚一次只产生一处事实 + 一处展示）
- [ ] 新增视图模型函数为纯函数
- [ ] 与 v4-3 的文件级分工明确（本叶不动 ask/auth 卡与 `stream-model` 终态事件类型）

**验证命令**:
```bash
npm run typecheck --workspace @lgdl/web-cli-plugin && npm test --workspace @lgdl/web-cli-plugin 2>&1 | tee /tmp/opencode/v4-gate-logs/v4-4/node.log
```

### TASK-808（V44-08）: `test/recommendation-sources.test.ts` + `test/ref-pick-wiring.test.ts`（node）
| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-804 / TASK-806 |
| **执行波次** | 4 |
| **对应 FR / AC** | FR-CHAT-060 / 062 / 055 · AC-CHAT-013 / 012 / 021 |
| **ADR / 风险** | ADR-V4-037 / 038 · R44-01 / R44-05 |

**描述**: `recommendation-sources.test.ts`：真值白名单（导入集合 ⊆ 白名单 + 禁 `settings` 计数真值）+ 规则表可复算 + 上限 + 无候选不渲染 + 安全边界；`ref-pick-wiring.test.ts`：`requestPick()` 唯一生产入口（`startPick()` 只被它调用）+ 无 `#l0-pick` 引用残留（仿 v3-4 `AC-CONV-2` 模式）。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| NEW | `packages/web-cli-plugin/test/recommendation-sources.test.ts` |
| NEW | `packages/web-cli-plugin/test/ref-pick-wiring.test.ts` |
| MODIFY | `packages/web-cli-plugin/package.json` |

**验收标准**:
- [ ] 导入集合静态断言（⊆ 白名单；出现 `settings` ⇒ FAIL）
- [ ] 规则表 4 条逐条可复算断言；上限与间隔断言
- [ ] `requestPick()` 唯一入口断言（`startPick()` 调用点唯一）
- [ ] 无 `#l0-pick` 引用残留断言（源码 + DOM）

**验证命令**:
```bash
npm test --workspace @lgdl/web-cli-plugin 2>&1 | tee /tmp/opencode/v4-gate-logs/v4-4/node.log
```

### TASK-809（V44-09）: `test/ui/recommendation.mjs`（Chromium）
| 属性 | 值 |
|------|-----|
| **复杂度** | L |
| **前置依赖** | TASK-805 / TASK-807 |
| **执行波次** | 4 |
| **对应 FR / AC** | FR-CHAT-061 / 062 / 063 / 064 / 053 · AC-CHAT-011 / 013 / 025 |
| **ADR / 风险** | ADR-V4-037 / 036 · R44-02 / R44-03 |

**描述**: Chromium 门禁：chips 即指令（同一生产入口可证）+ 上限（≤1 卡 / ≤3 chips）+ `pending` 门控（disabled 不隐藏）+ 无候选不渲染 + 系统事件行（`HH:MM:SS` + 只追加 + 去重窗口 + 速率上限 + `dropped` 可见）+ 首装卡（≤1 张 ≤8 行）。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| NEW | `packages/web-cli-plugin/test/ui/recommendation.mjs` |

**验收标准**:
- [ ] chips 点击经**同一入口**发起回合（与 composer 提交路径一致；可断言）
- [ ] `pending` 期间 chips `disabled` + `aria-disabled`，且不生成新卡
- [ ] 系统事件行：去重窗口内不追加 + 窗口后前缀「持续」+ 超速率 `dropped` +1 且状态栏可读
- [ ] shim E1/E2/E3/E4/E5 + B4 的等价断言（真实产物侧）
- [ ] 无候选 ⇒ `nextstep` 卡不存在

**验证命令**:
```bash
npm run build --workspace @lgdl/web-cli-plugin && node packages/web-cli-plugin/test/ui/recommendation.mjs 2>&1 | tee /tmp/opencode/v4-gate-logs/v4-4/recommendation.log
```

### TASK-810（V44-10）: 联动门禁（l1/l0/page-input 重锚 + gate-integrity 追加 + scripts）
| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-809 |
| **执行波次** | 5 |
| **对应 FR / AC** | FR-CHAT-084 · AC-CHAT-020 / 023 · NFR-CHAT-007 |
| **ADR / 风险** | ADR-V4-011 第 6 条 · R4-16 / R4-19 |

**描述**: `l1.mjs` 证据层/恢复路径/回执断言重锚（≥103）；`l0.mjs` 追加「宿主计数 = 0」收口断言（清理 R4-18）；`page-input.mjs` 面板侧拾取入口消失后的页面侧可达性断言（≥61 只增）；`gate-integrity.test.ts` 的 `EXPECTED_AUDITED_FILES` **追加 `test/ui/recommendation.mjs`**（**不动 `CHROMIUM_GATES.length === 9`**）；`package.json` 追加 `test:recommendation` / `test:ref-pick-wiring`。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/web-cli-plugin/test/ui/l1.mjs` |
| MODIFY | `packages/web-cli-plugin/test/ui/l0.mjs` |
| MODIFY | `packages/web-cli-plugin/test/ui/page-input.mjs` |
| MODIFY | `packages/web-cli-plugin/test/gate-integrity.test.ts` |
| MODIFY | `packages/web-cli-plugin/package.json` |

**验收标准**:
- [ ] `test/ui/l0.mjs` 含 `document.querySelectorAll('[data-transitional-host]').length === 0` 断言（v4 收口）
- [ ] `EXPECTED_AUDITED_FILES` 含 `test/ui/recommendation.mjs`；`CHROMIUM_GATES.length === 9` **未改**
- [ ] `page-input.mjs` ≥61（只增）；页面侧可达断言保留
- [ ] `l1.mjs` ≥103；`l0.mjs` ≥164

**验证命令**:
```bash
npm run test:l0 --workspace @lgdl/web-cli-plugin 2>&1 | tee /tmp/opencode/v4-gate-logs/v4-4/l0.log
npm run test:page-input --workspace @lgdl/web-cli-plugin 2>&1 | tee /tmp/opencode/v4-gate-logs/v4-4/page-input.log
npm run test:gate-integrity --workspace @lgdl/web-cli-plugin 2>&1 | tee /tmp/opencode/v4-gate-logs/v4-4/gate-integrity.log
```

### TASK-811（V44-11）: **V3-VOL-3 收口 8 步**（重定基线 + 绝对上限带值 + 作者确认推导值）
| 属性 | 值 |
|------|-----|
| **复杂度** | L |
| **前置依赖** | TASK-810 |
| **执行波次** | 5 |
| **对应 FR / AC** | FR-CHAT-090 / 091 / 092 / 093 / 094 · **AC-CHAT-018** · NFR-CHAT-006 · EC-CHAT-011 |
| **ADR / 风险** | ADR-V4-039 / 040 · ADR-V4-010 · R44-07 / R4-09 |

**描述**: 逐步骤留痕执行：① `npm run build` → `stat -c %s dist/sidepanel.js` = `B_final`（唯一数值来源）② 五要素重登记 `SIDEPANEL_BASELINE_BYTES = B_final`（前值/新值/日期/来源+构建命令/理由+历史保留）③ 推导 `absoluteCeilingBytes = ceilTo50KB(B_final) × 1.10`，`ceilTo50KB(x) = ⌈x / 51200⌉ × 51200` ④ **交作者一句确认** ⑤ `PENDING_ABSOLUTE_CAP` 置 `resolved: true` + 三值齐备（`resolvedOn` 用实测日期）⑥ `evaluateSidepanelSize()` 判定改为 `effectiveCeiling = min(absoluteCeilingBytes, floor(currentBaseline × 1.05))` ⑦ 三条反证实跑 ⑧ `SIDEPANEL_CEILING_CAP` 保持 `record-only` 不被读取。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/web-cli-plugin/test/size-baseline.ts` |
| MODIFY | `packages/web-cli-plugin/test/size-ruling-vol3.test.ts`（**只增**） |
| MODIFY | `packages/web-cli-plugin/docs/v4-supersession-ledger.json`（`v3Vol3Closeout`） |

**验收标准**:
- [ ] `B_final` 为**实测**（非预估）；五要素齐备；`SIDEPANEL_BASELINE_BYTES_HISTORY` + `_TIMELINE` + `SIDEPANEL_RE_REGISTRATIONS` 均追加
- [ ] `PENDING_ABSOLUTE_CAP = {resolved:true, newBaselineBytes:B_final, absoluteCeilingBytes, resolvedOn:"YYYY-MM-DD"}`；`evaluatePendingAbsoluteCap()` 通过；**未预填、未静默删除标记**
- [ ] **作者确认**写入 `v3Vol3Closeout.authorConfirmation`（日期 + 结论；未确认 ⇒ 保持 `resolved:false` 并如实登记，**不伪闭合**）
- [ ] 三条反证实跑：① 超绝对上限 ⇒ FAIL ② ≤绝对上限但 >5% 公式 ⇒ FAIL（软纪律生效）③ ≤5% 公式但 >绝对上限 ⇒ FAIL（硬墙生效）；还原 ⇒ PASS
- [ ] `SIDEPANEL_CEILING_CAP` **零判定用法**（不被 `evaluateSidepanelSize` 读取）；`size-ruling-vol3.test.ts` 断言**只增**

**验证命令**:
```bash
npm run build --workspace @lgdl/web-cli-plugin && stat -c %s packages/web-cli-plugin/dist/sidepanel.js
npm run test:size-ruling-vol3 --workspace @lgdl/web-cli-plugin 2>&1 | tee /tmp/opencode/v4-gate-logs/v4-4/size-ruling-vol3.log
node -e "const s=require('fs').readFileSync('packages/web-cli-plugin/test/size-baseline.ts','utf8');if(!/PENDING_ABSOLUTE_CAP[\s\S]{0,400}resolved:\s*true/.test(s))throw new Error('cap not closed');console.log('absolute cap closed')"
```

### TASK-812（V44-12）: **父级收口**（宿主计数 = 0 + 收尾 21 项门禁 + 不动面复核 + 台账收口）
| 属性 | 值 |
|------|-----|
| **复杂度** | L |
| **前置依赖** | TASK-811（本叶末任务；**父级收口锚**） |
| **执行波次** | 6 |
| **对应 FR / AC** | FR-CHAT-090~094 · AC-CHAT-018 / 020 / 023 · NFR-CHAT-005/006/007/009 |
| **ADR / 风险** | ADR-V4-040 / 011 / 009 · R4-18 / R4-15 / R44-10 |

**描述**: 收尾全门禁**21 项严格串行**（ADR-V4-040 第 2 条记为 20 项 = 未含 `size-ruling-vol3`；本清单含之，只增不减）（一次一个 Chromium）；**宿主计数 = 0** 断言（R4-18 结构性清零）；不动面逐项复核；v4 台账写入 `v3Vol3Closeout` + `counts`（末轮实测，`countMethod = runtime-check-calls`）+ `leafBases` 四叶段；为父 Feature `closeout.md` 提供证据输入（不代父收口）。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/web-cli-plugin/docs/v4-supersession-ledger.json` |
| MODIFY | `packages/web-cli-plugin/docs/v4-density-baseline.json`（收口轮复测 + 首装卡/空态实测登记） |
| NEW（临时日志） | `/tmp/opencode/v4-gate-logs/v4-4/*.log` |

**验收标准**:
- [ ] 21 项门禁全绿：`typecheck → build → npm test → supersession → gate-integrity → zero-injection → page-input → l0 → l1 → l2 → density → ui → insight → binding → hardening → e2e → stream → ask-auth → recommendation → design-contract → size-ruling-vol3`；日志全量落盘
- [ ] `document.querySelectorAll('[data-transitional-host]').length === 0`（**v4 收口清零**）
- [ ] 计数只增：journey ≥167 / insight ≥116 / binding 192 / l0 ≥164 / l1 ≥103 / l2 ≥71 / density ≥127 / sidepanel-view ≥38 / nodeTestRuntime ≥ max(646, 实测)；新增三门禁首轮实测登记
- [ ] 不动面逐项复核：`content.js` 177,076 / `pick-layer.js` 33,900 / `manifest.json` 零 diff / `KIND_SET` 零 diff / 判定链 sha256 pin / `src/content/**` 三 hash / `packages/web-cli-base/**` 零 diff / v1·v2·v3 SDDU 目录零 diff
- [ ] 台账 `v3Vol3Closeout`（含作者确认）+ `counts`（`countMethod` 唯一合法值）+ `leafBases` 四段齐备

**验证命令**:
```bash
node -e "const h=require('fs').readFileSync('packages/web-cli-plugin/src/ui/sidepanel/index.html','utf8');const n=(h.match(/data-transitional-host/g)||[]).length;if(n!==0)throw new Error('transitional host residual: '+n);console.log('transitional hosts: 0')"
for s in typecheck build test test:supersession test:gate-integrity test:zero-injection test:page-input test:l0 test:l1 test:l2 test:density test:ui test:insight test:binding test:hardening test:e2e test:stream test:ask-auth test:recommendation test:design-contract test:size-ruling-vol3; do npm run $s --workspace @lgdl/web-cli-plugin 2>&1 | tee "/tmp/opencode/v4-gate-logs/v4-4/${s//:/-}.log" || exit 1; done
stat -c %s packages/web-cli-plugin/dist/content.js packages/web-cli-plugin/dist/pick-layer.js packages/web-cli-plugin/dist/sidepanel.js
```

## 3. 任务汇总

| 统计项 | 数值 |
|--------|:--:|
| 总任务数 | **12**（TASK-801~812 / V44-01~12） |
| S 级 | 0 |
| M 级 | 5 |
| L 级 | 7（TASK-801 / 802 / 803 / 804 / 809 / 811 / 812） |
| 执行波次 | **6** |

## 4. 执行策略

| 波次 | 任务 | 策略 |
|:--:|------|------|
| 1 | TASK-801 | 串行（引用生命周期入流，ref 卡与投影接口） |
| 2 | TASK-802, TASK-804 | 并行（系统事件通道 ∥ 推荐生产者；文件不相交） |
| 3 | TASK-803, TASK-805, TASK-806, TASK-807 | 并行（通道接线 ∥ 推荐卡 ∥ 拾取入口 ∥ 注册与视图模型）；805/807 共享 `sidepanel.ts`/`cards/index.ts` ⇒ 本叶内串行化 807 后于 805 |
| 4 | TASK-808, TASK-809 | 写入可并行；运行严格串行（node → Chromium） |
| 5 | TASK-810, TASK-811 | 串行（联动门禁 → V3-VOL-3 收口；811 须在门禁全绿后取 `B_final`） |
| 6 | TASK-812 | 串行（父级收口锚：21 项门禁 + 宿主清零 + 不动面复核） |

**D-005 测试守恒账（本叶）**：

| 门禁 | v3 末轮实测基线 | 本叶处置 | 本叶预期 |
|------|:--:|------|:--:|
| 新增 `test/ui/recommendation.mjs` | — | **新增**（Chromium；chips 即指令 + 门控 + 系统行） | 首轮实测登记 |
| 新增 `test/recommendation-sources.test.ts` | — | **新增**（node；白名单 + 规则表 + 安全边界） | 新增用例计入 node |
| 新增 `test/ref-pick-wiring.test.ts` | — | **新增**（node；唯一入口 + 无 `#l0-pick` 残留） | 新增用例计入 node |
| `test/ui/l1.mjs` | **103** | 证据层/恢复路径/回执重锚（同编号） | **≥103** |
| `test/ui/l0.mjs` | **164** | 追加「宿主计数 = 0」收口断言 | **≥164** |
| `test/ui/page-input.mjs` | **61** | 面板侧入口消失后的页面侧可达断言（只增） | **≥61** |
| `test/ui/journey.mjs` | **167** | 零改动（v4-1 已新 pin；本叶不动保护段） | **167** |
| `test/ui/l2.mjs` / `density.mjs` / `insight.mjs` / `binding.mjs` | 71 / 127 / 116 / 192 | 零改动 | 不变 |
| `test/sidepanel-view.test.ts` | **38** | 零改动（①②③④ 已在 v4-1/v4-2 完成） | **38** |
| `npm test`（node 运行期） | 台账 **832** / 末轮 **795** | 新增 2 个 node 文件 | **≥ max(646, 实测)** |
| `size-ruling-vol3.test.ts` | 只增 | 追加 `min()` 优先级断言 + 3 反证 | **只增** |

## 5. 收口锚（本叶 = 父级收口执行叶）

| 步骤 | 产出 | 卡点 |
|:--:|------|------|
| TASK-811 ①~③ | `B_final` + 五要素重登记 + 绝对上限推导 | 数值必须来自**实测**，禁预估 |
| TASK-811 ④ | **作者一句确认** | 未确认 ⇒ 保持 `resolved:false` + 如实登记（**不伪闭合**） |
| TASK-811 ⑤~⑧ | `PENDING_ABSOLUTE_CAP` 三值 + `min()` 判定 + 3 反证 + cap record-only | AC-CHAT-018 带值闭合 |
| TASK-812 | 宿主计数 = 0 + 21 门禁 + 台账 `v3Vol3Closeout` | 父 Feature `closeout.md` 的证据输入（不代父收口） |

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建。12 任务 / 6 波；**末任务（TASK-812）= 父级收口锚**；TASK-811 = **V3-VOL-3 八步带值闭合**（重定基线 + `ceilTo50KB(B_final)×1.10` + 作者确认 + `min()` + 3 反证 + cap record-only）；宿主计数 = 0 断言落 TASK-810/812（R4-18）；含 D-005 守恒账。 | 2026-09-18 | SDDU Tasks Agent |
