# 任务分解：specs-tree-v3-2-l1-disclosure-refs（V3-2 L1 就地展开与引用 / 回执）

> **文档定位**: SDDU 任务清单 — 将技术方案分解为可并行执行的原子任务，作为 build 阶段的输入  
> **前置依赖**: `plan.md`（本叶 v1.0，ADR-V3-020~024）+ 父 `plan.md` v1.0（ADR-V3-001~012）+ 父 `spec.md` v1.0 + 本叶 `spec.md` v1.0  
> **创建人**: SDDU Tasks Agent  
> **创建时间**: 2026-09-16  
> **版本**: v1.0  
> **更新人**: SDDU Tasks Agent  
> **更新时间**: 2026-09-16  
> **更新说明**: 初始创建（本叶 10 任务 / 6 波；含 L1 八类就地展开、引用失效 fail-closed 五维、两条恢复路径、回执三件套）

---

## 0. 跨叶定位与执行序（**本文件 = V3-2，4 叶第二环**）

| 项 | 内容 |
|---|---|
| 叶间顺序 | `v3-1` → **`{v3-2, v3-3}`** → `v3-4` |
| 本叶前置 | **v3-1 全门禁绿**（需要其 `disclosure` 契约 / 摘要计数契约 / 展开态记忆 / 密度门禁与基线 / 取代台账 / 选择题契约） |
| 与 v3-3 的关系 | **可并行分解**（任务排布层）；**门禁执行必须严格串行**（父 ADR-V3-010 第 1 条） |
| 本叶边界 | **纯 L0 → L1**；不触碰 L2 视图（只提供「查看全局树」「审计出口」的入口指向）与页面侧（只定义事实字段契约与判定，采集归 v3-4） |
| 本叶收尾要求 | **全门禁绿且严格串行**；**禁止**把红灯留给 v3-3 / v3-4（EC-V3-013） |
| 门禁纪律 | 一次只跑一个（本机 ~1.5GB、曾 OOM）；日志 `tee` 落盘 `/tmp/opencode/v3-gate-logs/*.log`，**禁 tail 截断** |
| 红线 | 不改 `src/security/**`、`manifest.json`、`src/content/**`、`src/insight/**`（只读复用）、`packages/web-cli-base/**`、`options.html`、`design/**`；零新增依赖 |

---

## 1. 依赖拓扑总览

### 1.1 任务总览表

| ID | 名称 | 复杂度 | 前置依赖 | 波次 | 类型 |
|----|------|:--:|------|:--:|:--:|
| TASK-201 | 引用失效 **fail-closed** 判定 `l1/ref-validity.ts` + `test/l1-ref-validity.test.ts`（五维 + 三态 + 唯一放行点） | M | 无（纯函数） | 1 | implementation |
| TASK-202 | 引用 id 单源 `l1/ref-store.ts`（`ref_<n>` + 事实字段集 + 截断 80/120 + 四处贯穿） | S | 无 | 1 | implementation |
| TASK-203 | 局部树取数 `l1/local-tree.ts`（复用 v2 `ownership-tree` 主归属链裁剪 ≤3 节点） | S | 无 | 1 | implementation |
| TASK-204 | 回执三件套 `l1/receipt.ts`（摘要 / 完整证据 / 审计出口 + 零明文） | M | 无 | 1 | implementation |
| TASK-205 | L1 八类**就地展开**（`l1/panels.ts` + 8 个 `[data-l1-panel]` + `disclosure` 白名单追加 + `view-model` + `sidepanel` 接线） | M | 202, 203, 204 | 2 | implementation |
| TASK-206 | 引用失效**呈现与阻断**（风险位第 5 类真实事件源 + chip 失效标记 + `dispatchRefAction` 前置 `isRefUsable` + **两条恢复路径**） | S | 201, 205 | 3 | implementation |
| TASK-208 | 既有门禁取代（`insight.mjs` 树 / 回执 / 确认同编号最小前置展开 + 台账追加 union 口径） | M | 205 | 3 | implementation |
| TASK-207 | L1 运行时门禁 `test/ui/l1.mjs`（8 类 ≤1 次 + 不遮挡 + 5 维注入 + unknown + 文案 + 阻断 + 两恢复 + 回执三件套 + 可发现性 + 密度不回归） | M | 206 | 4 | gate |
| TASK-209 | 体积守卫核对 + `sidepanel.js` 显式重登记（**条件触发**，披露要求见 §4.3） | S | 207 | 5 | gate |
| TASK-210 | **收口：全门禁绿串行验证 + 人工面如实登记** | M | 209, 208 | 6 | gate |

### 1.2 依赖拓扑（串行主轴 + 并行组）

```
Wave 1 ── 无依赖，4 路并行写入（文件不相交，纯函数/纯数据模块）
  TASK-201 [M] l1/ref-validity.ts + l1-ref-validity.test.ts   ← 关键路径起点（判定权威）
  TASK-202 [S] l1/ref-store.ts                                ← 关键路径起点（id 单源）
  TASK-203 [S] l1/local-tree.ts
  TASK-204 [M] l1/receipt.ts

Wave 2 ── 串行（L1 渲染接线；index.html / sidepanel.ts / view-model.ts 单所有者）
  TASK-205 [M] l1/panels.ts + index.html 8 个 [data-l1-panel] + disclosure 白名单 + 接线  （dep 202,203,204）

Wave 3 ── 并行组 ①（presentation 与 test-rewrite 文件不相交）
  TASK-206 [S] 引用失效呈现与阻断 + 两条恢复路径   （dep 201,205）
  TASK-208 [M] insight.mjs 同编号最小前置展开 + 台账追加   （dep 205）

Wave 4 ── 串行（Chromium 门禁，一次一个）
  TASK-207 [M] test/ui/l1.mjs

Wave 5 ── 串行
  TASK-209 [S] 体积核对 / 条件重登记（dep 207）

Wave 6 ── 串行收口
  TASK-210 [M] 全门禁绿 + 人工面登记（dep 209, 208）
```

### 1.3 并行分组（执行波次）

| 波次 | 任务 | 并行性 | 必须串行的部分 |
|:--:|------|------|------|
| 1 | 201, 202, 203, 204 | **可并行**（4 文件不相交） | — |
| 2 | 205 | 串行（`index.html` / `view-model.ts` / `sidepanel.ts` 单所有者） | 本波全部 |
| 3 | 206, 208 | **可并行写入**（`l1/*.ts` 与 `test/ui/insight.mjs` 不相交） | ⚠️ 门禁执行严格串行 |
| 4 | 207 | 串行（Chromium） | ⚠️ 绝不与 `test:density` / `test:ui` / `test:binding` 并发 |
| 5 | 209 | 串行 | 本波全部 |
| 6 | 210 | 串行（单条链式命令） | 本波全部 |

---

## 2. 任务列表

### TASK-201: 引用失效 **fail-closed** 判定 `l1/ref-validity.ts` + `test/l1-ref-validity.test.ts`
> 本叶核心；EC-V3-001 的唯一判定权威

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | 无（纯函数 + 注入式 `env`，node 可测） |
| **执行波次** | Wave 1 |
| **对应 FR / AC / ADR** | FR-V3-036 / FR-V3-037 · NFR-V3-008 · EC-V3-001 / EC-V3-006 / EC-V3-007 / EC-V3-014 · AC-V3-023 · ADR-V3-020 |

**描述**: 新建侧栏侧纯函数判定模块。`type RefVerdict = 'valid' | 'invalid' | 'unknown'`；`evaluateRefValidity(ref, env) → { verdict, dimension?, readableReason? }`；**`isRefUsable(ref, env) === (evaluateRefValidity(...).verdict === 'valid')`** —— 只有显式 `'valid'` 放行，`'unknown'` 与 `'invalid'` **一律阻断**（默认拒绝）。五维判定表：**D1** `dom-gone`（选择器解析失败 ∨ 解析到的不是同一节点，身份用捕获时写入的 `data-wcli-ref` 标记）/ **D2** `origin-changed` / **D3** `navigated`（`documentId` / `navSeq` 变化，含 SPA 路由）/ **D4** `declaration-changed`（`declarationHash` ∨ `declarationVersion` 任一不同；两者都取不到 → `unknown`）/ **D5** `authorization-revoked`。**任一事实缺失 / 不可得 / 无法比对 → `unknown`**（元素被替换为同标签同类新元素、选择器歧义命中多个、页面侧不可达（未授权/探测中）、扩展重载后引用状态未恢复）。可读原因按维**逐字 pin**（`plan.md` §2.3(4) 表）。判定**只发生在侧栏侧**（页面侧不做判定）。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| NEW | `packages/web-cli-plugin/src/ui/sidepanel/l1/ref-validity.ts` |
| NEW | `packages/web-cli-plugin/test/l1-ref-validity.test.ts` |

**验收标准**:
- [ ] 五维逐一注入 → 判定 `'invalid'`，且 `dimension` 命中对应维
- [ ] **`unknown` 必阻断**：事实缺失 / 页面不可达 / 选择器歧义 → `verdict === 'unknown'` ∧ `isRefUsable() === false`
- [ ] `isRefUsable` 的判定式**只接受** `'valid'`（新增判定分支若返回非 `'valid'` 自动被阻断 → 结构上默认拒绝）
- [ ] 逐维可读原因文案与 `plan.md` §2.3(4) 表**逐字相等**（含 `unknown` 模板）
- [ ] 纯函数（无 `chrome.*`、无 `document` 直接访问）；`env` 注入式 → node 单测全覆盖
- [ ] 判定不依赖页面侧在场（未授权 / 探测中仍可判定 → `unknown` → 失效）

**验证命令**:
```bash
cd packages/web-cli-plugin && npm test 2>&1 | tee /tmp/opencode/v3-gate-logs/npm-test-v32-w1.log
```

---

### TASK-202: 引用 id 单源 `l1/ref-store.ts`
> 「四处贯穿」的唯一 id 来源（FR-V3-071）

| 属性 | 值 |
|------|-----|
| **复杂度** | S |
| **前置依赖** | 无 |
| **执行波次** | Wave 1 |
| **对应 FR / AC / ADR** | FR-V3-071 / FR-V3-033（证据字段）· AC-V3-023 · ADR-V3-023 |

**描述**: 新建引用状态单源：`createRef(facts) → refId = 'ref_' + seq`（**单调递增，不重用**已失效 id）。事实字段集 = `{ refId, selector, semanticPath, textDigest, origin, documentId, navSeq, declarationHash, capturedAt }`。四处贯穿**同一 id**：页面角标（v3-4 渲染）/ 侧栏 chip / 证据层行 / 失效风险行。截断口径：`textDigest` **80 字符**（去空白 + `…`）、`semanticPath` **120 字符**；**不提供展开全文**（V32-O-2）。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| NEW | `packages/web-cli-plugin/src/ui/sidepanel/l1/ref-store.ts` |

**验收标准**:
- [ ] `createRef` 产出 `ref_<n>`；同一事实集合重复创建不产生重复 id；失效后 id **不重用**
- [ ] 四处 id 集合相等（门禁断言，TASK-207 落地）
- [ ] `textDigest` 截断 = 80 字符 + `…`；`semanticPath` = 120 字符；两者均**无**全文展开控件
- [ ] 事实字段集齐备（9 字段），缺字段不静默（交给 TASK-201 判 `unknown`）
- [ ] 纯数据模块（无渲染副作用）；`npm run typecheck` 0 error

**验证命令**:
```bash
cd packages/web-cli-plugin && npm run typecheck 2>&1 | tee /tmp/opencode/v3-gate-logs/typecheck-v32-w1.log
```

---

### TASK-203: 局部树取数 `l1/local-tree.ts`
> 复用 v2 主归属链，零新模型（ADR-V3-022）

| 属性 | 值 |
|------|-----|
| **复杂度** | S |
| **前置依赖** | 无（`src/insight/**` 只读复用） |
| **执行波次** | Wave 1 |
| **对应 FR / AC / ADR** | FR-V3-034 · AC-V3-023 · ADR-V3-022 |

**描述**: 新建局部树取数模块，从 v2 `ownership-tree` 快照取「当前对象节点 + 其**主归属父链**」共 **≤3** 节点（父链更长则截断到最近 2 个祖先）；非主归属以**交叉引用徽标**呈现（**不复制节点**）；含「查看全局树」入口（→ L2，2 次交互可达）。**不新建归属模型**（避免两套归属口径）。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| NEW | `packages/web-cli-plugin/src/ui/sidepanel/l1/local-tree.ts` |

**验收标准**:
- [ ] 节点数 **≤3**（上限，非建议值）；包含当前节点及其父链
- [ ] 交叉引用以徽标呈现，**不复制节点**
- [ ] 「查看全局树」入口存在且指向 L2（v3-3 提供目标视图）
- [ ] 不修改 `src/insight/**`（只读复用）；纯数据裁剪（node 可测）
- [ ] `npm run typecheck` 0 error

**验证命令**:
```bash
cd packages/web-cli-plugin && npm run typecheck 2>&1 | tee /tmp/opencode/v3-gate-logs/typecheck-v32-w1b.log
git diff --numstat -- packages/web-cli-plugin/src/insight/
```

---

### TASK-204: 回执三件套 `l1/receipt.ts`
> 摘要（L0 常驻）+ 完整证据 + 审计出口；零明文

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | 无 |
| **执行波次** | Wave 1 |
| **对应 FR / AC / ADR** | FR-V3-039 · NFR-V3-008 / NFR-V3-016 · AC-V3-019 / AC-V3-023 · ADR-V3-022 |

**描述**: 新建回执三件套对象（复用 v2 `tree-receipt` 语义，**不重写**）：① **摘要常驻 L0**（状态栏摘要位或决策卡上方一行）；② 完整证据落 `[data-l1-panel="l1-receipt"]`（≤1 次交互）；③ 审计出口**直接跳 L2 审计视图** 且在 L1 回执面板内**内联一条最新审计摘要**（`data-summary`），保证「三件齐备」在 L1 内可判（V32-O-4）。**零明文纪律**：命令参数只记长度 / 路径 / basename；URL 去参；通知-剪贴板-书签内容零审计明文。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| NEW | `packages/web-cli-plugin/src/ui/sidepanel/l1/receipt.ts` |

**验收标准**:
- [ ] 三件齐备（摘要 / 证据 / 审计出口）；缺一即 FAIL
- [ ] 摘要在**默认态可见**（L0 常驻）；证据 ≤1 次交互可达
- [ ] 零明文：字段白名单（命令名 / 动作 id / 结果 / 耗时 / 时间 / 审计 id）+ 反例扫描（`apiKey` / 剪贴板正文 / 通知正文零命中；URL 去参）
- [ ] 复用 v2 `tree-receipt` 语义（不新建重复对象模型）
- [ ] `npm run typecheck` 0 error

**验证命令**:
```bash
cd packages/web-cli-plugin && npm run typecheck 2>&1 | tee /tmp/opencode/v3-gate-logs/typecheck-v32-w1c.log
```

---

### TASK-205: L1 八类**就地展开**（渲染 + 容器 + 白名单 + 接线）
> FR-V3-030~035 / FR-V3-040 的落地

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-202, TASK-203, TASK-204 |
| **执行波次** | Wave 2（**串行**） |
| **对应 FR / AC / ADR** | FR-V3-030 / FR-V3-031 / FR-V3-032 / FR-V3-033 / FR-V3-034 / FR-V3-035 / FR-V3-040 · EC-V3-011 · AC-V3-010 / AC-V3-023 · ADR-V3-008 · ADR-V3-021 · ADR-V3-022 · ADR-V3-023 |

**描述**: 新建 `l1/panels.ts`，渲染 **8 类内容**（逐类 ≤1 次交互）：① 状态与连接详情（`l1-status`，承载 `#topbar` 家族）/ ② 选项的后果说明与影响预演（`l1-consequences`，每选项**两段必填**：会发生 / 不会发生；破坏性选项额外**不可逆性声明**）/ ③ 引用 chip 证据（`l1-ref-evidence`，四要素齐备 + **只读**，写入控件 = 0）/ ④ 局部树（`l1-local-tree`，消费 TASK-203）/ ⑤ 已决策历史含改选（`l1-history`，N 可复算 + **回看零副作用**）/ ⑥ 回执三件套证据（`l1-receipt`，消费 TASK-204）/ ⑦ 页面交互说明手势表（`l1-gestures`，本叶先落 **4 项基础手势**）/ ⑧ 「更多选项」其余项（`l1-more`，**destructive 结构性不在其中**）。`index.html` 追加 8 个 `[data-l1-panel]`（默认 `hidden`）；`disclosure.ts` 的 `COLLAPSIBLE_TARGETS` **追加**这 8 个 panelId（**仍不含** `#risk-rail`，不改 `assertFoldable` 语义）；`view-model.ts` 追加 L1 视图模型（纯函数）；`sidepanel.ts` 追加 L1 挂载与引用事件订阅（**既有 handler 零删改**）。统一约束：每入口 = `data-disclose="<panelId>"` + `aria-expanded` + `aria-controls`，且入口**可见文字**含摘要或计数。**就地展开不得新增第二个面板级滚动容器**；长内容用内部滚动块。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| NEW | `packages/web-cli-plugin/src/ui/sidepanel/l1/panels.ts` |
| MODIFY | `packages/web-cli-plugin/src/ui/sidepanel/index.html`（追加 8 个 `[data-l1-panel]` + 样式；`#topbar` 家族迁入 `l1-status`） |
| MODIFY | `packages/web-cli-plugin/src/ui/sidepanel/disclosure.ts`（仅追加 8 个 panelId） |
| MODIFY | `packages/web-cli-plugin/src/ui/sidepanel/view-model.ts`（追加 L1 视图模型） |
| MODIFY | `packages/web-cli-plugin/src/ui/sidepanel/sidepanel.ts`（追加 L1 挂载与订阅） |

**验收标准**:
- [ ] **8 类逐类**可达（不是「至少一类」），每类 ≤1 次交互
- [ ] 每选项「会发生什么」/「不会发生什么」**两段必填**（缺失即 FAIL）；破坏性选项含不可逆性声明（不得只写「危险」）
- [ ] 引用证据四要素齐备（稳定选择器 / 语义路径 / 文本摘要截断 / 捕获时间）；证据层**写入控件 = 0**
- [ ] 「已决策 N 步」的 N 可复算；展开前后**已执行动作序列零变化**（回看零副作用）
- [ ] `l1-more` 计数 = 真值 N；**destructive 不在其中**（结构过滤）
- [ ] 8 个 `[data-l1-panel]` **默认 `hidden = true`**；折叠只能经 `window.__v3.disclosure`（S2）
- [ ] 每个 L1 入口有**非空文字标签 + 摘要/计数**（无「只有图标」入口）
- [ ] `#risk-rail` **不在**白名单（`assertFoldable('#risk-rail')` 仍抛错）
- [ ] 展开后**不新增第二个面板级滚动容器**；既有 handler 零删改

**验证命令**:
```bash
cd packages/web-cli-plugin && npm run typecheck && npm test 2>&1 | tee /tmp/opencode/v3-gate-logs/npm-test-v32-w2.log
```

---

### TASK-206: 引用失效**呈现与阻断** + 两条恢复路径
> FR-V3-037 / FR-V3-038；D3 铁律第 5 类的真实事件源

| 属性 | 值 |
|------|-----|
| **复杂度** | S |
| **前置依赖** | TASK-201, TASK-205 |
| **执行波次** | Wave 3 |
| **对应 FR / AC / ADR** | FR-V3-037 / FR-V3-038 · EC-V3-001 / EC-V3-006 / EC-V3-014 · AC-V3-023 · ADR-V3-020 · ADR-V3-023 |

**描述**: 接线三件事：① **呈现**——失效时 `#risk-rail` 出现该条（复用 v3-1 `renderRiskRow` 三通道 + **可读原因指到哪一维**触发），对应 chip 标失效（`aria-disabled="true"` + 失效徽标 + 三通道）；② **阻断**——`dispatchRefAction()` **前置** `isRefUsable()`，非 `valid` 直接返回可读原因且**不发命令**；③ **两条恢复路径**——「重新拾取」（≤1 次交互；本叶用**注入的重新拾取事件**验证，真实入口归 v3-4）与「改用描述」（走 `#ask` 末项兜底输入，复用 FR-V3-012）。**不得静默沿用**、**不得静默丢弃**（丢弃也是静默）。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/web-cli-plugin/src/ui/sidepanel/l1/panels.ts`（失效呈现位 + 阻断前置） |
| MODIFY | `packages/web-cli-plugin/src/ui/sidepanel/l1/ref-store.ts`（失效标记 / `aria-disabled`） |
| MODIFY | `packages/web-cli-plugin/src/ui/sidepanel/l1/local-tree.ts`（引用态联动，如需） |
| MODIFY | `packages/web-cli-plugin/src/ui/sidepanel/sidepanel.ts`（引用事件订阅与重判触发） |

**验收标准**:
- [ ] 失效态下 `#risk-rail` 出现该条（三通道）；可读原因**指到触发维**
- [ ] 对应 chip `aria-disabled="true"` + 失效徽标；**未授权/探测中** 时也走 `unknown` → 失效
- [ ] 阻断生效：失效态下**命令发送计数 = 0**（负向断言）
- [ ] 两条恢复路径均可达；恢复后引用回到 **`valid`** 态
- [ ] 「改用描述」复用 `#ask` 末项兜底输入（不新造输入框）
- [ ] 跨 origin 场景（EC-V3-014）：A 站点引用带到 B 站点 → 立即 `invalid`（D2）

**验证命令**:
```bash
cd packages/web-cli-plugin && npm run typecheck && npm test 2>&1 | tee /tmp/opencode/v3-gate-logs/npm-test-v32-w3.log
```

---

### TASK-208: 既有门禁取代（`insight.mjs` 同编号最小前置展开 + 台账追加）
> 取代面控制（id 零重命名红利）

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-205 |
| **执行波次** | Wave 3 |
| **对应 FR / AC / ADR** | FR-V3-004 · NFR-V3-014 · AC-V3-011 / AC-V3-012 · EC-V3-013 · ADR-V3-007 · ADR-V3-024 |

**描述**: ① `test/ui/insight.mjs`——树 / 回执 / 确认相关断言的**最小前置展开步骤**（`await openLayer('<panelId>')` 后沿用既有 `getElementById`），逐条 `old→new` 登记；**既有条目零删除**。② `docs/v3-supersession-ledger.json`——**追加**本叶 `entries[]`（**不改 schema / 不改他叶条目**）并更新 `counts.insight.note`，写明 **union 口径**：`runtime(insight.mjs) + runtime(l1.mjs) + runtime(l2.mjs) ≥ 108`。③ `package.json` 追加 script `test:l1`，并把 `test:v3` 串行链追加本叶门禁（**依赖零新增**）。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/web-cli-plugin/test/ui/insight.mjs`（树/回执/确认最小前置展开） |
| MODIFY | `packages/web-cli-plugin/docs/v3-supersession-ledger.json`（仅追加 `entries[]` + `counts.insight.note`） |
| MODIFY | `packages/web-cli-plugin/package.json`（追加 `test:l1`；`test:v3` 追加） |

**验收标准**:
- [ ] `insight.mjs` 既有条目**零删除**；断言计数不减
- [ ] 台账**只追加**：schema 未改、他叶条目未改；`countMethod` 仍为 `runtime-check-calls`
- [ ] union 口径写入 `counts.insight.note`，门禁可读且 ≥108
- [ ] 台账门禁 `npm run test:supersession` **通过**（本叶 hunk 全部命中）
- [ ] `package.json` 依赖段零 diff

**验证命令**:
```bash
cd packages/web-cli-plugin && npm run test:supersession 2>&1 | tee /tmp/opencode/v3-gate-logs/supersession-v32.log
git diff --numstat -- test/ui/insight.mjs docs/v3-supersession-ledger.json package.json
```

---

### TASK-207: L1 运行时门禁 `test/ui/l1.mjs`
> 本叶验收的唯一实跑载体

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-206 |
| **执行波次** | Wave 4（**串行 Chromium**） |
| **对应 FR / AC / ADR** | FR-V3-030~040 · NFR-V3-001 / NFR-V3-002 / NFR-V3-012 / NFR-V3-013 · AC-V3-010 / AC-V3-023 · ADR-V3-021 · ADR-V3-024 |

**描述**: 新建 L1 Chromium 门禁（`npm run test:l1`）：① 8 类**逐类** ≤1 次可达；② 展开后 **`#risk-rail` 与决策卡仍在视口内可见**（`boundingRect`）且交面积 = 0（FR-V3-030 / R32-02）；③ **5 维失效逐一注入** → 判失效 + 可读原因逐维断言；④ **`unknown` 场景**（选择器歧义 / 元素被替换为同类新元素 / 页面不可达）→ 判失效；⑤ **阻断**：命令发送计数 = 0；⑥ **两条恢复路径**各一次；⑦ 回执三件套逐件可达；⑧ 可发现性遍历（AC-V3-010：入口非空文字 + ARIA 成对 + `aria-controls` 目标含非空摘要/计数）→（`l1-more` 计数与真值**双向**断言）；⑨ **密度不回归**：展开/收起往返后复用 v3-1 `test:density` 的默认档测量仍达标（三档 × 三视口）。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| NEW | `packages/web-cli-plugin/test/ui/l1.mjs` |

**验收标准**:
- [ ] 8 类逐类可达断言；缺任一类即 FAIL
- [ ] 展开态几何：风险位与决策卡可见且交面积 = 0
- [ ] 5 维注入 + `unknown` 场景全部判失效；可读原因逐维**逐字**匹配
- [ ] 失效态命令发送计数 = 0；两条恢复路径各 1 次
- [ ] 回执三件套 + 可发现性遍历 + `l1-more` 双向计数
- [ ] 展开/收起往返后密度复测 = 默认档阈值（复用 v3-1 门禁与口径，**不新增口径**）
- [ ] 单 Chromium 实例、单 page target；日志全量 `tee` 落盘禁 tail；不触碰既有 4 个 `test/ui/*.mjs`

**验证命令**:
```bash
cd packages/web-cli-plugin && npm run test:l1 2>&1 | tee /tmp/opencode/v3-gate-logs/l1.log
npm run test:density 2>&1 | tee /tmp/opencode/v3-gate-logs/density-v32.log
```

---

### TASK-209: 体积守卫核对 + `sidepanel.js` 显式重登记（**条件触发**）
> 显式任务：触发时必须走完整披露流程，**禁止**静默放宽容差

| 属性 | 值 |
|------|-----|
| **复杂度** | S |
| **前置依赖** | TASK-207 |
| **执行波次** | Wave 5 |
| **对应 FR / AC / ADR** | NFR-V3-005 · AC-V3-015 / AC-V3-016 · EC-V3-012 · ADR-V3-011 |

**描述**: 跑 `npm run build` 后核对 `dist/content.js` ≤ **177,076 B**（无容差；本叶零改动，仅复核）与 `dist/sidepanel.js` ≤ ceiling **279,825 B**。本叶预估 `+6~9 KB`——**若实测超 ceiling**，在**本叶内**完成显式重登记（不得留给 v3-3 / v3-4，EC-V3-013）：`SIDEPANEL_BASELINE_BYTES` 更新为新实测值；旧值**必须**加入 `SIDEPANEL_BASELINE_BYTES_HISTORY`；`SIDEPANEL_BASELINE_META` 补全 `measuredOn` / `source` / `buildCommand` / `measuredBy`（`v3-2 + 轮次`）/ `previousBaselineBytes` / `previousCeilingBytes` / `direction`（`raised` 时写明**有意增重的功能理由**）/ `reRegisteredFrom`；**容差 5% 不变**；`targetBudgetBytes` / `targetMet` 保持 `null`；**断言零删减**；反证（+1 B → FAIL）在**新值上重新驱动**并留日志。若未超 → `test/size-baseline.ts` **零改动**并登记「未触发」。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| MODIFY（**条件触发**） | `packages/web-cli-plugin/test/size-baseline.ts` |

**验收标准**:
- [ ] `content.js` ≤ 177,076 B；`CONTENT_SOURCE_SHA256` 三项 pin 不变
- [ ] `sidepanel.js` 实测值与 ceiling 比较结果如实记录
- [ ] 若触发：五要素齐备（前后值 + 日期 + 来源 + 理由 + `_HISTORY`）；容差 5% 不变；断言零删减；反证在新值上复跑并留日志
- [ ] 若未触发：`test/size-baseline.ts` diff = 0 且登记「未触发」

**验证命令**:
```bash
cd packages/web-cli-plugin && npm run build && node -e "const fs=require('fs');const c=fs.statSync('dist/content.js').size,s=fs.statSync('dist/sidepanel.js').size;console.log({content:c,sidepanel:s});if(c>177076)process.exit(1);if(s>279825)console.error('CEILING EXCEEDED -> 走显式重登记');" | tee /tmp/opencode/v3-gate-logs/size-v32.log
```

---

### TASK-210: **收口：全门禁绿串行验证 + 人工面如实登记**
> AC-V3-013 / NFR-V3-015

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-209, TASK-208 |
| **执行波次** | Wave 6（串行收口） |
| **对应 FR / AC / ADR** | FR-V3-003 / FR-V3-086 / FR-V3-087 · NFR-V3-012 / NFR-V3-014 / NFR-V3-015 · AC-V3-013 / AC-V3-024 / AC-V3-025 / AC-V3-027 · EC-V3-013 · ADR-V3-010 |

**描述**: 严格串行跑完本叶全部门禁（一次只跑一个，`&&` 串联，日志全量 `tee` 落盘），全部绿后才允许 v3-3 / v3-4 继续。串行顺序见 §4.1。另：① 零改动核对（`manifest.json` / `src/security/**` / `src/content/**` 三 hash / `src/insight/**` / `packages/web-cli-base/**` / `options.html` / `design/**` 零 diff）；② **人工面如实登记为「未执行」**（展开动画体感 / 引用高亮体感 / 读屏真实体感），**不得冒充 PASS**。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| NEW | `/tmp/opencode/v3-gate-logs/*.log`（证据，不入版本库） |

**验收标准**:
- [ ] 全门禁绿（§4.1 顺序，逐条串行）；日志完整落盘、禁 tail 截断
- [ ] 断言计数 ≥ 下界：journey ≥167 / **insight union ≥108（含 l1.mjs）** / binding ≥192 / `sidepanel-view` ≥38 / node ≥646
- [ ] 零改动核对全部通过（7 类文件零 diff）
- [ ] 人工面逐项标注「未执行 / PASS」
- [ ] **无红灯遗漏**给 v3-3 / v3-4（EC-V3-013）

**验证命令**:
```bash
cd packages/web-cli-plugin && bash -c '
set -e
run(){ echo "=== $1 ==="; eval "$2" 2>&1 | tee /tmp/opencode/v3-gate-logs/$1.log; }
run typecheck "npm run typecheck"
run build "npm run build"
run npm-test "npm test"
run supersession "npm run test:supersession"
run l1 "npm run test:l1"
run density "npm run test:density"
run ui "npm run test:ui"
run insight "npm run test:insight"
run binding "npm run test:binding"
run hardening "npm run test:hardening"
run e2e "npm run test:e2e"
echo ALL-GREEN
'
```

---

## 3. 任务汇总

| 统计项 | 数值 |
|--------|:--:|
| 总任务数 | **10** |
| S 级 (简单) | 4（202 / 203 / 206 / 209） |
| M 级 (中等) | 6（201 / 204 / 205 / 207 / 208 / 210） |
| L 级 (复杂) | 0 |
| 执行波次 | **6** |

### 3.1 需求条目 → 任务映射

| 需求 | 承载任务 |
|------|---------|
| FR-V3-030（就地展开不遮挡 L0） | TASK-205 / 207 |
| FR-V3-031（8 类逐类可达） | TASK-205 / 207 |
| FR-V3-032（后果两段 + 不可逆声明） | TASK-205 |
| FR-V3-033（引用证据四要素 + 只读） | TASK-202 / 205 |
| FR-V3-034（局部树 ≤3 节点） | TASK-203 / 205 |
| FR-V3-035（已决策历史 + 回看零副作用） | TASK-205 |
| FR-V3-036（fail-closed 五维 + 不确定即失效） | TASK-201 / 206 |
| FR-V3-037 / FR-V3-038（呈现 + 阻断 + 两条恢复） | TASK-206 / 207 |
| FR-V3-039（回执三件套） | TASK-204 / 207 |
| FR-V3-040（L1 入口摘要/计数） | TASK-205 / 207 |
| FR-V3-071（引用 id 四处贯穿） | TASK-202 / 207 |
| NFR-V3-001 / 002（密度不回归） | TASK-207 |
| NFR-V3-005（体积） | TASK-209 |
| NFR-V3-008 / 016（只读投影 / 零明文） | TASK-204 / 206 |
| NFR-V3-012 / 013 / 014（串行 / 能真 FAIL / 计数不减） | TASK-207 / 208 / 210 |
| AC-V3-010（可发现性） | TASK-205 / 207 |
| AC-V3-023（引用失效 fail-closed） | TASK-201 / 206 / 207 |
| AC-V3-011 / 012 / 013（台账 / 计数 / 全绿） | TASK-208 / 210 |

### 3.2 交付门槛矩阵（本叶）

| 门禁 | 命令 | 承载任务 | 断言要点 |
|------|------|:--:|------|
| 类型 | `npm run typecheck` | 201~206 | 0 error |
| 单测 | `npm test`（含 `l1-ref-validity.test.ts`） | 201 | 五维 + 三态 + `unknown` 必阻断 + 文案 pin |
| L1（Chromium） | `npm run test:l1` | 207 | 8 类 ≤1 次 + 不遮挡 + 5 维 + unknown + 阻断 + 两恢复 + 回执三件套 + 可发现性 + 密度不回归 |
| 密度（复用） | `npm run test:density` | 207 | 展开往返后默认档仍达标 |
| 台账 | `npm run test:supersession` | 208 | 本叶 hunk 全命中；union 计数 ≥108；`protectedRanges` hash 不变 |
| 既有三门禁 | `test:ui` / `test:insight` / `test:binding` / `test:hardening` | 210 | ≥167 / union ≥108 / ≥192 / 24 |
| 端到端 | `npm run test:e2e` | 210 | PASS |
| 体积 | `size-baseline` | 209 | `content.js` ≤177,076；`sidepanel.js` ≤ceiling（超则显式重登记） |

### 3.3 断言只增不减（具体保证方式）

| 保证 | 方式 |
|------|------|
| 新断言落**新文件** | `test/ui/l1.mjs` / `test/l1-ref-validity.test.ts` |
| 既有门禁零删除 | `insight.mjs` 只加「前置展开步骤」；删除行必须命中台账（hunk ↔ 台账映射） |
| union 口径 | `counts.insight.note` 显式写明 `insight + l1 + l2 ≥ 108` |
| 计数下界 | journey ≥167 / insight union ≥108 / binding ≥192 / sidepanelView ≥38 / node ≥646 |
| 安全断言 | 引用阻断（命令发送 = 0）+ 零提权控件 + 零明文（只增） |

---

## 4. 执行策略

### 4.1 门禁串行纪律（**一次只跑一个**）

> 本机 ~1.5GB、曾 OOM（R3-10 / R32-09）。**任何两个 Chromium 门禁绝不并发**；日志 `tee` 到 `/tmp/opencode/v3-gate-logs/<gate>.log`，**禁 tail 截断**。

**严格串行顺序**：

```
① npm run typecheck
② npm run build
③ npm test                            ← Node 单测（含 l1-ref-validity.test.ts）
④ npm run test:supersession
⑤ npm run test:l1                     ← Chromium（L1 门禁）
⑥ npm run test:density                ← Chromium（展开往返后密度不回归）
⑦ npm run test:ui                     ← Chromium（journey ≥167）
⑧ npm run test:insight                ← Chromium（union ≥108）
⑨ npm run test:binding                ← Chromium（≥192）
⑩ npm run test:hardening              ← Chromium（24）
⑪ npm run test:e2e                    ← Chromium（全链路）
⑫ 体积守卫核对（条件重登记 + 反证复跑）
⑬ 零改动核对
```

### 4.2 文件所有权（防并行冲突）

| 文件 | 唯一所有者（本叶） |
|------|------|
| `src/ui/sidepanel/l1/ref-validity.ts` + `test/l1-ref-validity.test.ts` | TASK-201 |
| `src/ui/sidepanel/l1/ref-store.ts` | TASK-202（206 追加失效标记） |
| `src/ui/sidepanel/l1/local-tree.ts` | TASK-203 |
| `src/ui/sidepanel/l1/receipt.ts` | TASK-204 |
| `src/ui/sidepanel/l1/panels.ts` | TASK-205（206 追加呈现/阻断前置） |
| `src/ui/sidepanel/index.html` / `view-model.ts` / `sidepanel.ts` | TASK-205（Wave 2 独占） |
| `src/ui/sidepanel/disclosure.ts` | TASK-205（**只追加** 8 个 panelId） |
| `test/ui/insight.mjs` + `docs/v3-supersession-ledger.json` | TASK-208 |
| `test/ui/l1.mjs` | TASK-207 |
| `test/size-baseline.ts` | TASK-209（条件触发） |

### 4.3 体积 / 取代 / 失败面纪律

1. **`content.js` 无容差不可重登记**：本叶不碰 `src/content/**`；让它**字节不变**。
2. **`sidepanel.js` 条件重登记**：TASK-209 的 4 条披露要求（前后值 / 日期 / 来源 / 理由 / 历史保留 + 容差不变 + 断言零删减 + 反证复跑）。
3. **台账只追加**：本叶不改 schema、不改他叶条目；union 口径必须写进 `counts.insight.note`。
4. **fail-closed 不得腐化**：`isRefUsable` 只接受 `'valid'`；新增判定分支必须自动被阻断（结构必然，非分支纪律）。
5. **不得新增第二个滚动容器**：展开用就地展开 + 内部滚动块。

---

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建：V3-2 任务分解（10 任务 / 6 波；S×4 / M×6 / L×0）。**覆盖编排器必含项**：①就地展开 8 类（FR-V3-031，逐类 ≤1 次交互，含两段后果说明与不可逆声明、只读证据层、局部树 ≤3 节点、已决策历史零副作用、回执三件套、手势表、更多选项结构过滤）；②**引用失效 fail-closed**（五维 D1~D5 + 三态 + **唯一放行点** `isRefUsable = verdict === 'valid'` + `unknown` 必阻断 + 逐维可读原因逐字 pin）；③**两条恢复路径**（「重新拾取」≤1 次交互 + 「改用描述」走 `#ask` 末项兜底）；④**回执三件套**（摘要常驻 L0 + 完整证据 L1 + 审计出口跳 L2 且内联摘要，零明文）。**门禁严格串行**（13 步链式，一次一个）。**只做 tasks**：未写代码、未改 `src/**`·`test/**`·`manifest.json`·`design/**`·`ROADMAP.md`、未动 `main`、未 commit、**未跑门禁/构建/Chromium**。 | 2026-09-16 | SDDU Tasks Agent |
