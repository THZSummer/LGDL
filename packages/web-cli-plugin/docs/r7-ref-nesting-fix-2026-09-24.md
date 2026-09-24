# R7 缺陷修复轮 — `--ref` 真机失效（schema 嵌套层级错误）修复记录

- **日期**：2026-09-24
- **分支**：`feature/web-cli-plugin`（基线 HEAD `6d1f5ce`）
- **诊断结论**：`--ref` 真机失效 = **schema 嵌套层级错误**（只读诊断，置信度 0.92）
- **性质**：真机暴露的 P3 缺陷快修（非新功能）；作者裁决「嵌套修正 + 门禁订正 + 解析层回归 + 引导边界 + 两条 deferred」
- **纪律**：测试只增（≥1394）；门禁串行 + 日志 `logs/r7-ref-nesting`；三冻结面 / base 零 diff；体积五要素登记；不动 `.sddu`。

---

## 基线（修复前）

| 项 | 值 |
|---|---|
| `npm test` | 1394 / 0 |
| `dist/sidepanel.js` | 591,946 B（生效上限 621,543 / 档 614,400 / 绝对 675,840 / `pending-author-line`） |
| `dist/content.js` | 177,076 B（sha `52a82620…`，冻结） |
| `dist/pick-layer.js` | 34,358 B（sha `77796bab…`，冻结） |

---

## 根因（真机失效链，逐层）

```
LLM 依 schema 发顶层 ref
  → base llm.ts#parseToolArguments 只读 subcommand/args，未知顶层键**静默丢弃**
    → tc.args.ref === ''（undefined）
      → 包装层 dom-anchor.ts 早退：refArg.length === 0 ⇒ return baseExecutor(tc, ctx)
        → base set-text 无 selector ⇒ '✖ dom set-text 缺少 --selector <CSS 选择器>'
```

真机逐字命中失败信息 = **`✖ dom set-text 缺少 --selector <CSS 选择器>`**（ref 被静默丢弃后回落到基线未锚定路径）。

### 缺陷形态（修复前 `src/tools/dom-anchor.ts`）

`schema.parameters.properties` 顶层新增 `ref`（与 `subcommand` / `args` 同级），而 base
schema（`declared-tools.ts#paramsToSchema`）的 `selector` / `text` 在
`properties.args.properties` 内：

```
properties:
  subcommand: {...}
  args: { type: object, properties: { selector, text, ... } }
  ref: {...}          ← 错误：被 LLM 当作顶层键发出
```

- `src/tools/dom-anchor.ts:154-174`（覆写块）把 `ref` 加在**顶层**；
- `packages/web-cli-base/src/llm.ts#parseToolArguments`（219-236）仅读 `subcommand` / `args`，
  未知顶层键被丢弃（**不报错**）；
- 包装层 `dom-anchor.ts:176-177` 以 `tc.args?.ref` 为空 ⇒ 直接回落基线 executor。

### 门禁为何全绿（绕过的层）

原 `test/dom-ref-anchor.test.ts`（DRA-1~6）**手工构造 `tc` 直调 executor**，从未经过
`parseToolArguments` ⇒ schema 声明位置与解析层行为之间**无判据**覆盖。DRA-4 当时只断言
「顶层新增恰 `ref`」——恰好把这个缺陷形态**钉成了绿色**。

---

## 修法（三项）

### 1. 嵌套修正（`src/tools/dom-anchor.ts`）

把 `ref` 移入 `params.properties.args.properties`（与 `selector` / `text` 同级）；顶层
`properties` 逐字保留 base（仅追加声明，不新增顶层键）。覆写逻辑改经
`topProps` / `argsSchema` 两级展开，仍在 base 之上**仅新增 ref 一个参数**。

### 2. 门禁订正 + 补解析层回归（`test/dom-ref-anchor.test.ts`）

- **DRA-4 订正**：断言 `ref` 必须落在 `args.properties`，且**顶层不得出现 ref**；保留
  required / 子命令集合不动；反证改为双层（顶层多增 ⇒ 红 / args 内多增 ⇒ 红）。
- **新增 DRA-7（解析层回归，`parseToolArguments` 端到端）**：`llmArgsJson(entry, …)` **依
  schema** 合成 LLM 会发出的 JSON（模型按声明的参数位置决定 ref 放顶层还是 `args`）——
  这正是原门禁绕过的那一层。真机形态
  `{"subcommand":"set-text","args":{"ref":"1","text":"…"}}` → `parseToolArguments` → 包装层
  executor → 合成锚 `[data-wcli-ref="ref_1"]` 命中。
- **注入反证**：把 `ref` 放回顶层（从 base 顶层重建 schema）⇒ `llmArgsJson` 产出
  `{"subcommand":"set-text","ref":"1","args":{"text":"…"}}` ⇒ 解析层丢弃 `ref`
  ⇒ 必红，且失败信息逐字为 `缺少 --selector`。

### 3. 引导段补边界（`src/background/ref-context.ts#REF_SCOPE_GUIDANCE`）

补一句：`--ref <n>` 仅 `dom set-text` 生效，读命令请用 `--selector`（SW 侧 B 列，不计账）：

```
Note: `--ref <n>` is accepted only by `dom set-text`; read commands must use `--selector` instead.
```

---

## 注入反证（回退嵌套 ⇒ 解析层用例必红，实测证据）

临时 `git stash` `dom-anchor.ts`（回退到 HEAD 缺陷形态）后重编译运行 `dom-ref-anchor.test.js`：

```
✖ DRA-4 schema 覆写只把 `ref` 新增到 `args.properties`（顶层不得有 ref / 零新子命令 / required 不动）
  AssertionError：顶层不得新增参数（ref 必须嵌套在 args 内）
✖ DRA-7 解析层回归：LLM 依 schema 发的 JSON 经 `parseToolArguments` 后仍能锚定（真机路径）
  AssertionError：schema 必须把 ref 声明在 args 内，模型才会把它放进 args
  + '{"subcommand":"set-text","ref":"1","args":{"text":"你好"}}'   ← 回退后模型形态（顶层 ref）
  - '{"subcommand":"set-text","args":{"ref":"1","text":"你好"}}'
```

还原修复后：`dom-ref-anchor.test.js` 8/8 PASS（DRA-4 绿 ∧ DRA-7 绿）。判据非恒真。

---

## 登记（不修，deferred）

| # | 面 | 现象 | 处理 |
|---|---|---|---|
| D1 | base `llm.ts#parseToolArguments`（219-236） | **未知顶层键静默丢弃** —— 模型发错层级的参数不报错、不留痕，最终以「缺参」误报（本轮真机失效的放大器） | 不动（base、blast radius 大）；另立 follow-up |
| D2 | `src/background/service-worker.ts:1024-1027` | 重观测钩子（`onToolDone` 的 `targetSelector`）对 **`--ref` 写不触发** —— ref 写经包装层后 args 里是**合成锚 selector**，但该路径不带 `args.selector` 原始值形态，R6 的「改写后重评」在 ref 路径上为静默空转 | 不动；写入 R7 deferred，留待 ref 路径重评专项 |

---

## 门禁对账

| 门禁 | 基线 | 本轮 |
|---|---|---|
| `npm test` | 1394 / 0 | **1395 / 0**（+1：新 `DRA-7` 解析层回归） |
| supersession-ledger | 42 | 42 / 0（v4 台账 v55f-2 叶段登记 `dom-ref-anchor.test.ts` 删除面） |
| journey（`test:ui`） | 171 | **171 / 171**（首跑 flake，隔离复跑 PASS） |
| s0-self-driven | 59 | **70 / 70** |
| density | 242 | 242 / 0 |
| page-input / l0 / l1 / l2 | 118 / 248 / 120 / 74 | 125 / 248 / 131 / 74 |
| zero-injection / recommendation | 28 / 72 | 28 / 72 |
| law8 / dead-end / auth-chip | 36 / 49 / 37 | 52 / 53 / 37 |
| stream / ask-auth / hardening / insight | 76 / 78 / 24 / 116 | 76 / 78 / 24 / 118 |
| e2e | PASS | PASS（real dist full chain） |
| l1-reverse / l2-reverse | 9 / 10 | 9 / 10（注入 → FAIL → sha256 复原 → PASS） |
| **binding** | 192 | **环境性 flake**：`#confirm-allow` 未渲染 + `CDP socket not open`；**HEAD 基线复跑同样 FAIL（4 项）** ⇒ 与本轮改动无关（KL-N-10 同族） |

---

## 体积五要素（**零重登记**：sidepanel 逐字节不变）

| 要素 | 值 |
|---|---|
| 前值 → 后值 | 591,946 → **591,946 B**（Δ 0；`dom-anchor` / `ref-context` 均**不在** sidepanel bundle —— `build-meta.json` 机核） |
| 逐模块归因 | sidepanel A 列 Δ = 0（无模块进出）；修改模块落在 **background/SW bundle（B 列）** → 1,635,850 → 1,636,621 B（+771 B，B 列不计账） |
| 档位 / 绝对上限 | **614,400 / 675,840 均不动**（未跨档位） |
| 生效上限 | `floor(591,946 × 1.05) = 621,543`（公式派生，不动） |
| 披露 / 占位 | `SIDEPANEL_CEILING_CAP_ROLE === 'record-only'`；`authorConfirmation` 保持 `pending-author-line`（不伪称已确认） |

- 三冻结面：`dist/content.js` 177,076 B（sha `52a82620…`）、`dist/pick-layer.js` 34,358 B
  （sha `77796bab…`）、`dist/sidepanel.js` 591,946 B **逐字节不变**。

---

## 零触碰确认

- `packages/web-cli-base/**`（base）零 diff；`src/content/**` 零改动（`content.js` sha 复核）。
- `src/security/policy.ts` / `auto-authorize.ts`（判定链）未触达（`test/dom-ref-anchor` DRA-6 机核）。
- `manifest.json` / `KIND_SET` / 特权 op 恒 `gesture` / 法八（零明文）零改动。
- 台账登记：`docs/v4-supersession-ledger.json` 的 v55f-2 叶段追加
  `scope.files += test/dom-ref-anchor.test.ts` + `registeredUncoveredLines`（16 行逐字 + `count` + `reason`），
  `summary` 同源自描述（1 文件 / 16 行）；未新增取代条目（不改全局注册集）。
