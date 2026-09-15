# 技术计划：specs-tree-v3-2-l1-disclosure-refs（V3-2 L1 就地展开与引用 / 回执）

> **文档定位**: SDDU 技术方案 — 记录架构设计、方案对比和 ADR，作为 tasks 阶段的输入
> **前置依赖**: 本叶 `spec.md` v1.0（叶子切片）+ 父 `../spec.md`（权威条文 §5.3 / §8.2 / §8.4 / §10）+ 父 `../plan.md`（承接 **ADR-V3-006 / 007 / 008 / 009 / 010 / 011**）+ **叶子 V3-1**（`../specs-tree-v3-1-l0-shell-density/plan.md`：`disclosure.ts` 折叠器契约 / 摘要计数契约 / 展开态记忆 / 选择题契约 / 密度门禁与基线）+ 设计基准 `design/ui-redesign/option-e-progressive.html`
> **创建人**: SDDU Plan Agent
> **创建时间**: 2026-09-16
> **版本**: v1.0
> **更新人**: SDDU Plan Agent
> **更新时间**: 2026-09-16
> **更新说明**: 初始创建（L1 八类就地展开 + **引用失效 fail-closed 判定与常驻呈现** + 回执三件套 + 局部树；ADR-V3-020~024）。**只做 plan**：不写 tasks、不写代码、不改源码/测试/设计稿、不跑门禁与 Chromium。

---

## 1. 前置检查

| 检查项 | 状态 |
|--------|:--:|
| 本叶 `spec.md` 存在（13,989 B） | ✅ |
| 父 `spec.md` / `discovery.md` / `plan.md` 存在 | ✅ |
| **V3-1 契约可承接**（`disclosure.ts` 折叠器 / 摘要计数 / 展开态记忆 / 选择题契约；密度门禁与基线） | ✅（设计已定，实现在 v3-1 交付；本叶按**行为契约**消费，不依赖 v3-1 的实现细节） |
| 设计基准 `option-e-progressive.html`（L1 = ≤1 次交互的就地展开；E 稿 `#l1-status` / `#l1-gestures` / `.opt-cons` 结构） | ✅ |
| **外部 API 文档缓存** | ⚠️ **N/A** —— 本叶无外部服务 API（引用事实与策略投影均为进程内状态 + 页面侧上报消息） |
| 红线基线（`main` 未动；`manifest.json` / `src/security/**` / `src/content/**` 零改动） | ✅ |
| 本叶不新增权限 / 依赖 / 静态注入；不引入 `contextMenus`；不触碰 `content.js` | ✅ |
| 零明文纪律（回执与证据层不得回显敏感内容；URL 去参） | ✅（NFR-V3-016） |

**本叶承接的父 plan 约束（不重新讨论）**：

| 父 ADR | 对本叶的直接约束 |
|--------|----------------|
| ADR-V3-006 | 「引用失效」是**五类风险之一** → 其呈现位必须在 `#risk-rail`（**永不折叠**）；不得下沉到 L1 |
| ADR-V3-007 | 取代台账 = **同一份文件**（v3-1 建立）；本叶**只追加 `entries[]`**，不改 schema；insight 的 **union 计数**（`insight.mjs + l1.mjs + l2.mjs ≥ 108`）由本叶开始计入 |
| ADR-V3-008 | L1 展开一律 `hidden` + `aria-expanded`/`aria-controls` 成对 + 入口非空文字 + `aria-controls` 目标含摘要/计数；`:focus-visible`；数字键与焦点约定 |
| ADR-V3-009 | id 零重命名；`#topbar` 家族与 `#tree-*` 家族**不重命名**（只改归属） |
| ADR-V3-010 | 叶间契约：`window.__v3.disclosure` / 摘要计数（`data-summary` / `data-count`）/ 引用 id 命名空间 `ref_<n>` / 选择题（`#ask` 家族） |
| ADR-V3-011 | `sidepanel.js` 若超 ceiling → **本叶内**显式重登记 |

---

## 2. 架构分析

### 2.1 本叶的输入真值（现状，只读实测）

| 事实 | 值 | 对本叶的含义 |
|------|-----|-------------|
| 既有回执基建 | v2 `src/ui/tree/tree-receipt.ts`（三件套对象）+ `#tree-receipt`（抽屉内） | **复用语义**（不重写），新增 L1 回执证据位 |
| 既有树模型 | `src/insight/ownership-tree.ts`（主归属链 + 交叉引用徽标 + `path`）+ `project-tree.ts`（确定性快照） | 局部树**复用主链裁剪**，不新建模型 |
| 既有命令档案 | `src/insight/command-catalog.ts`（逐条有档 + clamp 原因） | 本叶只做「后果说明」引用其只读投影（命令目录视图归 v3-3） |
| 既有确认/历史 | `#confirm-*`（L0 直系，不折叠）、`#log` 内历史回合 | 「已决策历史」= 把历史回合索引化后放进 L1 |
| `#log` 现状 | 唯一滚动容器 | 历史回合整体 `hidden` → 索引行「已决策 N 步」在 L1；本叶不得新增第二个滚动容器 |
| 引用事实的来源 | 现状无引用概念（零基础） | 本叶定义**事实字段集**与**判定**（v3-4 负责采集上报；本叶可独立用注入态验证） |
| tokens | 复用 `:root` | 失效态用「文字 + 徽标 + 图标」三通道（不得仅变色） |

### 2.2 目标：L1 八类就地展开（逐类 ≤1 次交互）

| # | L1 内容类 | 承载容器（新增） | 入口（L0） | 展开后约束 |
|:--:|---------|----------------|-----------|-----------|
| ① | 状态与连接详情 | `[data-l1-panel="l1-status"]`（承载 `#topbar` 家族 + 站点/策略/自动授权/LLM 详情） | `#l0-status-band` | 展开后 `#risk-rail` 与决策卡**仍在视口内可见**（FR-V3-030） |
| ② | 选项的后果说明与影响预演 | `[data-l1-panel="l1-consequences"]` | 选项内的「会发生什么」入口（`data-disclose="l1-consequences"`） | 每选项**两段必填**（会发生 / 不会发生）；破坏性选项额外**不可逆性声明** |
| ③ | 引用 chip 证据 | `[data-l1-panel="l1-ref-evidence"]` | `#l0-ref-toggle` 或 chip 上的「证据」入口 | 四要素齐备（稳定选择器 / 语义路径 / 文本摘要截断 / 捕获时间）；**只读**（写入控件 = 0） |
| ④ | 局部树（2~3 节点） | `[data-l1-panel="l1-local-tree"]` | 当前对象行的「归属」入口 | 节点数 **≤3**；含归属父链；含「查看全局树」入口（→ L2，2 次交互可达） |
| ⑤ | 已决策历史（含改选） | `[data-l1-panel="l1-history"]` | 决策卡上方摘要行「已决策 N 步」 | N **可复算**；**回看不改变已执行动作**（零副作用断言） |
| ⑥ | 回执三件套完整证据 | `[data-l1-panel="l1-receipt"]` | L0 回执摘要行 | 三件齐备（摘要 / 证据 / 审计出口）；摘要**常驻 L0** |
| ⑦ | 页面交互说明（手势表） | `[data-l1-panel="l1-gestures"]`（承载 `#l1-gestures` 语义） | 状态详情内的「页面交互说明（N 个手势）」 | 条目数 = **实际实现并验证**的手势数（v3-4 双向一致，本叶先落 4 项基础手势 + v3-4 补齐） |
| ⑧ | 「更多选项」其余选项 | `[data-l1-panel="l1-more"]` | `#l0-more` | 计数 = 真值 N；**destructive 选项不在其中**（结构过滤） |

**统一约束（父 ADR-V3-008 落地）**：每个入口 = `data-disclose="<panelId>"` + `aria-expanded` + `aria-controls`，且入口**可见文字**含摘要或计数（如「页面交互说明（4 个手势）」「已决策 4 步」「还有 3 个选项」）；`disclosure.ts` 的目标白名单**新增**这 8 个 panelId（仍**不含** `#risk-rail`）。

### 2.3 目标：引用失效 **fail-closed** 判定（本叶核心）

**（1）五维判定（父 FR-V3-036 落地为可执行表）**

| 维 | 判定信号 | 数据来源 | 判定条件 |
|:--:|---------|---------|---------|
| D1 `dom-gone` | 选择器解析失败 **或** 解析到的节点不是捕获时同一节点 | 侧栏侧（经既有 `dom-op` 通道读回；节点身份用捕获时写入的 `data-wcli-ref` 标记 + 失败即视为不在） | 任一成立 → 失效 |
| D2 `origin-changed` | 当前绑定 origin ≠ `ref.origin` | 侧栏状态（`state` 消息） | 不等 → 失效 |
| D3 `navigated` | 页面导航计数 / `documentId` 变化（含 SPA 路由） | 页面侧上报（v3-4）+ 侧栏比对 `ref.documentId` / `ref.navSeq` | 变化 → 失效 |
| D4 `declaration-changed` | 站点声明 `hash` / `version` 变化 | 侧栏状态（探测结果） | 变化 → 失效 |
| D5 `authorization-revoked` | origin 离开已授权集合 | 侧栏状态（`origin-store`） | 离开 → 失效 |

**（2）三态 + 唯一放行点（fail-closed 的结构实现）**

```ts
type RefVerdict = 'valid' | 'invalid' | 'unknown';
// 判定：evaluateRefValidity(ref, env) → { verdict, dimension?, readableReason? }
// 放行：isRefUsable(ref, env) === (evaluateRefValidity(...).verdict === 'valid')
// 即：只有显式 'valid' 才放行；'unknown' 与 'invalid' 一律阻断（默认拒绝）
```

**判定规则（确保「不确定即失效」是结构必然，而非分支遗漏）**：

1. 捕获事实集 = `{ refId, selector, semanticPath, textDigest, origin, documentId, navSeq, declarationHash, capturedAt }`；
2. **任一事实缺失 / 不可得 / 无法比对 → `verdict = 'unknown'`**（包括：元素被替换为同标签同类新元素、选择器歧义命中多个、页面侧不可达（未授权 / 探测中）、扩展重载后引用状态未恢复）；
3. `isRefUsable()` 的判定式**只接受** `'valid'`；任何新增判定分支若返回非 `'valid'` 都会被阻断 → **新增分支默认拒绝**；
4. 判定**只发生在侧栏侧**（`l1/ref-validity.ts`，纯函数 + 注入式 `env`）→ node 可测、不依赖页面侧在场（本叶可独立全绿）；页面侧（v3-4）**只上报原始事实**，不做判定。

**（3）呈现与阻断**：失效 → ① `#risk-rail` 出现该条（三通道 + 可读原因，指到**哪一维**触发）；② 对应 chip 标失效（`aria-disabled="true"` + 失效徽标 + 三通道）；③ **阻断**：`dispatchRefAction()` 前置 `isRefUsable()`，非 `valid` 直接返回可读原因且**不发命令**（负向断言：失效态下命令发送计数 = 0）；④ 恢复路径：「重新拾取」（≤1 次交互，走 v3-4 的拾取入口；v3-2 用注入的「重新拾取」事件验证）+ 「改用描述」（走 `#ask` 末项兜底输入）。

**（4）可读原因模板（逐维 pin 文案，门禁逐字断言）**

| 维 | 模板 |
|:--:|------|
| D1 | `引用 {n} 的目标元素已不存在（选择器解析失败或元素被替换）` |
| D2 | `引用 {n} 属于 {ref.origin}，当前站点已是 {currentOrigin} —— 跨站引用不可用` |
| D3 | `引用 {n} 捕获后页面已导航（含单页路由切换），目标可能已重建` |
| D4 | `引用 {n} 捕获后站点声明已变化（{oldHash} → {newHash}），目标语义可能已改变` |
| D5 | `引用 {n} 所在站点已被撤销授权` |
| `unknown` | `无法确认引用 {n} 的目标是否仍然有效（{reason}）—— 按失效处理` |

### 2.4 目标：引用 id 单源 + 四处贯穿 + 回执三件套

1. **单一 id 源**：`l1/ref-store.ts#createRef(facts) → refId = 'ref_' + seq`（单调递增，**不重用**已失效 id）；四处引用同一 id：**页面角标**（v3-4 渲染）/ **侧栏 chip** / **证据层行** / **失效风险行**；门禁断言四处 id 集合相等（FR-V3-071）。
2. **回执三件套**：动作完成后 ① 摘要常驻 L0（状态栏摘要位或决策卡上方一行）；② 完整证据在 `[data-l1-panel="l1-receipt"]`（≤1 次交互）；③ 审计出口（指向 v3-3 的审计视图，或内联一条摘要——由 ADR-V3-022 定）；三件缺一即 FAIL；**零明文**（不打印命令参数全文 / URL 去参 / 通知-剪贴板-书签内容只记长度·路径·basename）。
3. **零提权**：L1 内「放宽 / 提权」控件计数 = 0（只读投影；v2 既有覆盖控件归 v3-3 的命令目录视图）。

### 2.5 与 v3-1 / v3-3 / v3-4 的边界

| 边界 | 归属 |
|------|------|
| L0 常驻骨架 / 风险位 / 密度门禁 / 基线登记 | **v3-1**（本叶**复用**并保持密度不回归） |
| L2 四类视图（全局树 / 命令目录 / 审计 / 设置） | **v3-3**（本叶只提供「查看全局树」「审计出口」的**入口指向**） |
| 页面侧采集（Alt 悬停 / 拖动 / 右键 / 拖选 / 角标 / 双向联动） | **v3-4**（本叶提供**事实字段契约**与**判定/呈现**；页面侧只上报） |
| 引用失效**判定与呈现** | **本叶**（唯一判定权威） |
| 手势表条目数 | 本叶落基础 4 项（Alt 悬停 / Alt 拖动 / 右键 / 拖选）；v3-4 补齐并做**双向相等**断言 |

---

## 3. 方案对比

### 3.1 P-V32-01 引用失效判定的位置

| 维度 | **方案 A：侧栏侧纯函数判定（页面侧只上报事实）** | 方案 B：页面侧判定后回报结论 | 方案 C：SW 侧判定 |
|------|:--|:--|:--|
| 描述 | `l1/ref-validity.ts` 纯函数 + 注入式 `env`；页面侧只上报原始事实 | 页面侧比对选择器后回报「有效 / 失效」 | SW 汇总判定 |
| 优点 | ① node 可测（判定表 + 三态 + 文案 pin）；② **不依赖页面侧在场**（未授权 / 探测中 / 页面不可达时仍可判定 → `unknown` → 失效）；③ 判定权威唯一（无两处判定） | 页面侧有最真实的 DOM 视角 | 与 v2 投影同处，模型统一 |
| 缺点 | 页面不可达时只能给 `unknown`（但按 fail-closed 这正是**正确**结论） | ① 页面侧不在场时**无法判定**（必须回退到「怀疑即失效」的隐式行为）→ 违反「单一判定权威」；② 页面侧代码在按需层，判定逻辑会与 v3-4 生命周期纠缠 | SW 需要为「引用」新增持久状态与消息面（面更大）；与 v2 投影职责（连接树）混叠 |
| 风险 | 低 | 中高（双判定 + 生命周期耦合） | 中（面变大，取代/回归风险高） |
| 工作量 | 中 | 中 | 高 |

### 3.2 P-V32-02 「不确定」的语义

| 维度 | **方案 A：三态 + 唯一放行点（只有 `valid` 放行）** | 方案 B：两态 + 判定函数内部兜底 `default: invalid` | 方案 C：两态 + `default: valid`（乐观） |
|------|:--|:--|:--|
| 描述 | `evaluateRefValidity` 返回 `valid` / `invalid` / `unknown`；`isRefUsable = verdict === 'valid'` | 判定返回布尔；未知分支落 `invalid` | 未知分支落 `valid` |
| 优点 | 「不确定即失效」是**结构必然**（新增分支默认拒绝）；`unknown` 可携带**可读原因**（对用户更有信息量） | 实现最简 | 少误报 |
| 缺点 | 需在 UI 文案上区分 invalid 与 unknown | 无法区分「已确认失效」与「无法确认」→ 文案只能笼统；且新增分支需人工记得落到 `invalid`（**靠自觉**） | **违反 fail-closed**（不确定时沿用失效引用 → 用户对错误目标下指令） |
| 风险 | 低 | 中（腐化风险：某天有人加了分支忘了默认拒绝） | **不可接受** |
| 工作量 | 低 | 低 | 低 |

### 3.3 P-V32-03 局部树的取数方式

| 维度 | **方案 A：复用 v2 `ownership-tree` 主归属链裁剪（≤3 节点）** | 方案 B：新建局部树模型 | 方案 C：复用全局树快照前端裁剪 |
|------|:--|:--|:--|
| 描述 | 从既有快照的 `ownershipTree` 取「当前对象 → 父链」的 ≤3 节点 + 归属链 | 新写一个轻量树模型 | 用 L2 全局树渲染器裁剪到 3 节点 |
| 优点 | ① 与 v2 真层级树**同源**（不会出现两套归属口径）；② 纯数据裁剪，node 可测；③ 零新模型（无漂移风险） | 实现自由 | 复用渲染器 |
| 缺点 | 依赖 v2 快照结构（只读，不改） | **两套归属口径** → 与 L2 全局树不一致（作者会立刻发现矛盾） | 会把 L2 渲染器拖进 L1（耦合 + 体积） |
| 风险 | 低 | 高 | 中 |
| 工作量 | 低 | 中 | 中 |

---

## 4. 推荐方案

| 开放点 | 推荐 | 理由 |
|--------|------|------|
| P-V32-01 判定位置 | **方案 A**（侧栏纯函数） | 唯一能「node 可测 + 不依赖页面侧在场 + 判定权威唯一」的形态（ADR-V3-020） |
| P-V32-02 不确定语义 | **方案 A**（三态 + 唯一放行点） | fail-closed 从「分支纪律」升级为「结构必然」（ADR-V3-020） |
| P-V32-03 局部树 | **方案 A**（复用 v2 主链裁剪） | 与 v2/L2 同源，零新模型（ADR-V3-022） |

**本叶开放点裁决（V32-O-1~4，逐条落定）**：

| # | 开放点 | 裁决 | 落点 |
|---|--------|------|------|
| V32-O-1 | 「站点声明版本变化」的具体判定信号（声明内容 hash / version / 两者组合） | **两者组合，任一变化即失效**：`declarationHash = sha256(规范化的声明 JSON)` ∧ `declarationVersion`（若站点提供）；比较时**任一不同 → D4 失效**；两者都取不到 → `unknown` → 失效 | ADR-V3-020 |
| V32-O-2 | 引用证据层「文本摘要（截断）」的截断长度与是否可展开全文 | **截断 80 字符**（`textDigest`，去空白后截断 + `…`）；**不提供展开全文**（避免零明文风险与体积膨胀）；语义路径也做 120 字符截断 | ADR-V3-021 / ADR-V3-023 |
| V32-O-3 | 局部树 2~3 节点的取数来源与多归属主链裁剪规则 | 复用 v2 `ownership-tree` 的**主归属链**：取「当前对象节点 + 其主归属父链」共 **≤3** 节点（若父链更长则截断到最近 2 个祖先）；非主归属以**交叉引用徽标**呈现（不复制节点）；「查看全局树」→ L2 视图 | ADR-V3-022 |
| V32-O-4 | 回执「审计出口」是直接跳 L2 审计视图还是内联一条摘要 | **直接跳 L2 审计视图**（`#l0-statusbar` → 入口面板 → 审计），并在 L1 回执面板内**内联一条最新的审计摘要**（`data-summary`），保证「三件齐备」在 L1 内可判 | ADR-V3-022 |

---

## 5. 文件影响分析

| 操作 | 文件路径 | 说明 |
|:--:|------|------|
| NEW | `packages/web-cli-plugin/src/ui/sidepanel/l1/panels.ts` | L1 八类内容渲染（逐类 ≤1 次交互；入口 `data-disclose` + ARIA 成对 + 摘要/计数） |
| NEW | `packages/web-cli-plugin/src/ui/sidepanel/l1/ref-validity.ts` | **fail-closed 判定**（五维 + 三态 + 唯一放行点 + 逐维可读原因模板；纯函数 + 注入式 `env`） |
| NEW | `packages/web-cli-plugin/src/ui/sidepanel/l1/ref-store.ts` | 引用 id 单源（`ref_<n>`）+ 引用态（事实 / chip / 失效标记）+ 四处贯穿的视图状态 |
| NEW | `packages/web-cli-plugin/src/ui/sidepanel/l1/receipt.ts` | 回执三件套对象（摘要 / 证据 / 审计出口；复用 v2 `tree-receipt` 语义；零明文） |
| NEW | `packages/web-cli-plugin/src/ui/sidepanel/l1/local-tree.ts` | 局部树取数（复用 v2 主归属链裁剪 ≤3 节点 + 交叉引用徽标 + 全局树入口） |
| MODIFY | `packages/web-cli-plugin/src/ui/sidepanel/index.html` | 追加 8 个 `[data-l1-panel]` 容器标记与样式（默认 `hidden`）；`#topbar` 家族迁入 `l1-status`；样式复用 `:root` tokens |
| MODIFY | `packages/web-cli-plugin/src/ui/sidepanel/sidepanel.ts` | 追加 L1 挂载、引用事件订阅、失效重判（既有 handler 零删改） |
| MODIFY | `packages/web-cli-plugin/src/ui/sidepanel/view-model.ts` | 追加 L1 视图模型（8 类内容 + 引用态 + 回执摘要；纯函数） |
| MODIFY | `packages/web-cli-plugin/src/ui/sidepanel/disclosure.ts` | 白名单**追加** 8 个 L1 panelId（**仍不含** `#risk-rail`）；不改 `assertFoldable` 语义 |
| NEW | `packages/web-cli-plugin/test/ui/l1.mjs` | L1 门禁：8 类 ≤1 次可达 + 展开不遮挡（boundingRect）+ 5 维失效注入 + 不确定场景 + 可读原因逐维 + 阻断（命令发送 = 0）+ 两条恢复路径 + 回执三件套 + 可发现性 + 密度不回归 |
| NEW | `packages/web-cli-plugin/test/l1-ref-validity.test.ts` | 纯单测：五维判定表 + 三态 + **`unknown` 必阻断**（默认拒绝）+ 逐维文案 pin + 事实缺失 → `unknown` |
| MODIFY | `packages/web-cli-plugin/docs/v3-supersession-ledger.json` | **追加** `entries[]`（本叶 old→new）+ 更新 `counts.insight.note`（union 口径：`insight.mjs + l1.mjs + l2.mjs ≥ 108`） |
| MODIFY | `packages/web-cli-plugin/package.json` | 追加 script `test:l1`；`test:v3` 串行链追加本叶门禁（依赖零新增） |
| MODIFY | `packages/web-cli-plugin/test/ui/insight.mjs` | 树 / 回执 / 确认相关断言的**最小前置展开步骤** + 逐条 `old→new` 台账；几何 3 条由 v3-1 的 union 迁移承接 |
| MODIFY | `packages/web-cli-plugin/test/size-baseline.ts` | 若 `sidepanel.js` 超 ceiling → 本叶内显式重登记（前后值 + 日期 + 来源 + 理由 + 历史保留） |

**明确不改**：`manifest.json` · `src/security/**` · `src/content/**` · `src/insight/**`（只读复用） · `packages/web-cli-base/**` · `options.html` · `design/**` · v1/v2 SDDU 目录 · `ROADMAP.md` · 依赖段 · L0 常驻骨架与风险位（归 v3-1）。

---

## 6. 风险评估

| 风险 | 概率 | 影响 | 缓解措施 |
|------|:--:|:--:|----------|
| **R32-01 「不确定」被实现成「视为有效」**（fail-closed 被破坏） | 中 | 极高 | 三态 + **唯一放行点** `isRefUsable = verdict === 'valid'`（ADR-V3-020）；新增分支默认拒绝；负向单测：事实缺失 / 页面不可达 / 选择器歧义 → `unknown` → 阻断；UI 文案区分 `invalid` 与 `unknown` |
| **R32-02 L1 展开遮挡 L0（风险位或决策卡被推离视口）** | 中 | 高 | 就地展开（不新增第二个滚动容器）；门禁用 `boundingRect` 断言展开后 `#risk-rail` 与决策卡仍在视口内且交面积 = 0（FR-V3-030）；高风险内容（证据表 / 手势表）用内部滚动而非整体撑高 |
| **R32-03 L1 入口缺摘要/计数（可发现性回归，D6）** | 中 | 高 | 每个入口 `data-summary` / `data-count` + 非空文字；门禁遍历断言（AC-V3-010）；`l1-more` 计数与真值同源双向断言 |
| **R32-04 引用 chip 与页面角标序号漂移** | 中 | 中 | `ref_<n>` 单源（`ref-store`）+ 四处 id 相等断言；id **不重用**（失效后保留序号） |
| **R32-05 密度回归（L1 内容泄漏进 L0 计数）** | 中 | 高 | 复用 v3-1 门禁（默认档 + 展开/收起往返复测）；L1 内容必须在 `[data-l1-panel]` 内（静态结构断言）；往返后密度复测 = 默认档阈值 |
| **R32-06 回执 / 证据层泄漏明文** | 低 | 高 | 零明文纪律：命令参数只记长度 / 路径 / basename；URL 去参；门禁字段白名单 + 反例扫描（`apiKey` / 剪贴板正文 / 通知正文零命中） |
| **R32-07 取代量超预期（insight 树 / 回执 / 确认断言集中）** | 中 | 中 | 优先「同编号前置展开」而非重写选择器（id 零重命名红利）；台账 hunk 映射门禁；本叶收尾必须全门禁绿，不得留红灯给 v3-3 / v3-4 |
| **R32-08 `sidepanel.js` 超 ceiling** | 中 | 中 | 复用既有 view-model / 渲染路径；静态结构落 html；超限则本叶内显式重登记（ADR-V3-011） |
| **R32-09 门禁并发 OOM** | 中 | 高 | `test:v3` 串行链；日志全量落盘（禁 tail） |

### 交付门槛（本叶，收尾必须全绿且串行）

| 门禁 | 断言要点 |
|------|---------|
| `npm run typecheck` / `npm test`（含 `l1-ref-validity.test.ts`） | 0 error / 全绿；`test(` 计数只增 |
| `npm run test:l1` | 8 类 ≤1 次可达 + 不遮挡 + 5 维失效 + unknown + 文案 + 阻断 + 两条恢复 + 回执三件套 + 可发现性 + 密度不回归 |
| `node test/ui/density.mjs`（复用） | 默认/展开往返后 L0 密度仍达标（三档 × 三视口） |
| `npm run test:supersession` | 本叶 hunk 全部命中台账；union 计数 ≥108；`protectedRanges` hash 不变 |
| `npm run test:ui` / `test:insight` / `test:binding` / `test:hardening` | journey ≥167；insight union ≥108；binding ≥192；hardening 24 |
| `npm run test:e2e` | PASS |
| 体积 / 零改动 | `content.js` ≤177,076（无容差）；`sidepanel.js` ≤ ceiling（超则本叶内重登记）；`manifest.json` / `src/security/**` / `src/content/**` / `base` / `options.html` / `design/**` 零 diff |
| 人工面 | 展开动画体感 / 引用高亮体感 / 读屏真实体感 → 登记「**未执行**」 |

---

## 7. 生成的 ADR

> 本叶产出 **ADR-V3-020~024**（5 个），与父 `ADR-V3-001~012` / v3-1 `ADR-V3-013~019` / v3-3·v3-4 `ADR-V3-025~036` **零编号冲突**。状态 = ACCEPTED。

| ADR | 标题 | 状态 |
|-----|------|:--:|
| ADR-V3-020 | 引用失效 = 侧栏纯函数 fail-closed 判定（五维 + 三态 + **唯一放行点** + 逐维可读原因 + 单判定权威） | ACCEPTED |
| ADR-V3-021 | L1 八类就地展开契约（≤1 次交互 / 不遮挡 L0 / 入口带摘要计数 / 同一折叠语言） | ACCEPTED |
| ADR-V3-022 | 回执三件套 + 局部树（复用 v2 主归属链裁剪 ≤3 节点）+ 证据层只读三约束 | ACCEPTED |
| ADR-V3-023 | 引用 id 单源（`ref_<n>` 不重用）+ 四处贯穿 + 事实字段集契约（供 v3-4 采集）+ 摘要截断口径 | ACCEPTED |
| ADR-V3-024 | 本叶取代策略（insight 树 / 回执 / 确认断言的同编号前置展开 + union 计数口径落地） | ACCEPTED |

### ADR-V3-020: 引用失效 = 侧栏纯函数 fail-closed 判定

## 状态
ACCEPTED（承父 FR-V3-036~038 / EC-V3-001 / EC-V3-006 / AC-V3-023 + O-UI-002 裁决）

## 背景
D3 把「引用失效」列为必须常驻的五类风险之一；若静默沿用失效引用，用户会对**不存在的目标**下指令（R-UI-011）。父 spec 已裁决「五维 + 不确定即失效（fail-closed）」，但「不确定即失效」若只写成一句纪律，实现期必然出现「兜底分支忘了返回失效」的腐化。

## 决策
1. **判定位置 = 侧栏侧纯函数**（`l1/ref-validity.ts`）+ 注入式 `env`（当前 origin / 授权集 / 声明 hash·version / 导航序号 / 节点解析结果）。
   - **理由**：node 可测；**不依赖页面侧在场**（页面不可达 → `unknown` → 失效，这是正确结论）；判定权威唯一（页面侧只上报事实，SW 不参与判定）。
2. **五维 + 判定式**（任一成立即 `invalid`）：
   - D1 `dom-gone`：选择器解析失败 ∨ 解析节点 ≠ 捕获节点（节点身份 = 捕获时写入的 `data-wcli-ref` 标记 + `documentId` 一致性）；
   - D2 `origin-changed`：当前 origin ≠ `ref.origin`；
   - D3 `navigated`：`documentId` / `navSeq` 变化（含 SPA 路由）；
   - D4 `declaration-changed`：`declarationHash`（`sha256(规范化声明 JSON)`）**或** `declarationVersion` 任一不同；
   - D5 `authorization-revoked`：origin 不在已授权集合。
3. **三态 + 唯一放行点（fail-closed 的结构实现）**：`evaluateRefValidity(ref, env) → {verdict, dimension?, readableReason?}`，`verdict ∈ {'valid','invalid','unknown'}`；`isRefUsable(ref, env) ≜ evaluateRefValidity(ref, env).verdict === 'valid'`。
   - **任一捕获事实缺失 / 不可得 / 无法比对 → `unknown`**（含：选择器歧义命中多个、元素被替换为同类新元素、页面侧不可达、扩展重载后引用态未恢复）；
   - `'unknown'` **与** `'invalid'` 一律阻断 → 新增判定分支**默认拒绝**（无需再记「记得返回失效」）。
4. **可读原因逐维模板化**（§2.3(4) 的表）并**逐字 pin**（单测 + 门禁双断言）；`unknown` 文案必须说明「无法确认 → 按失效处理」。
5. **阻断是结构性的**：所有「用某引用发起动作」的入口统一走 `dispatchRefAction(ref, action)`，其**第一行**即 `if (!isRefUsable(ref, env)) return { ok: false, reason }`（负向断言：失效态下命令发送计数 = 0）。
6. **恢复路径**：「重新拾取」（≤1 次交互；v3-2 用注入的 `re-pick` 事件验证，v3-4 接真实拾取）+ 「改用描述」（走 `#ask` 末项兜底输入）；恢复后引用回到 `valid`（判定重跑）。
7. **生命周期事件**：`origin` 变更 / 导航 / 授权撤销 / 声明变化 / SW 恢复 均触发**重判**（不是增量假定有效）；EC-V3-007 要求「无法确认的引用一律按失效处理」→ 重判失败即 `unknown`。

## 后果
- 「不确定即失效」成为**结构必然**（唯一放行点只认 `valid`），不依赖实现纪律。
- `unknown` 与 `invalid` 的区分让用户看到更准确的原因（对「页面不可达」这类情形尤其重要）。
- 页面侧（v3-4）职责收窄为「采集 + 上报 + 呈现失效标记」，判定逻辑零重复。

### ADR-V3-021: L1 八类就地展开契约

## 状态
ACCEPTED（承父 FR-V3-030~035 / FR-V3-040 / AC-V3-010）

## 背景
E 稿的 L1 = 「点开即见、用完收起」的就地展开（≤1 次交互），与 v2 的**覆盖式抽屉**（`#tree-drawer`，`role="dialog"` + `aria-modal`）语义不同。若 L1 用浮层/抽屉，会与 FR-V3-047（不引入第二个滚动容器、不做浮层）冲突，并遮挡 L0 的风险位与决策卡。

## 决策
1. **就地展开，零浮层**：8 个 `[data-l1-panel]` 容器全部是 `#panel-main` / `#l0-decision` 内的**文档流内**节点，默认 `hidden`；展开 = 移除 `hidden`（`disclosure.ts`）→ **不新增滚动容器**（仅 `#log` 保持 `overflow-y:auto`；证据表 / 手势表等长内容用**内部** `max-height + overflow:auto` 的局部滚动块，不改变「面板级滚动容器计数 = 1」）。
2. **≤1 次交互**：每类内容各有唯一入口（`data-disclose="<panelId>"` + `aria-expanded` + `aria-controls`）；同层不嵌套二次展开（例外：`l1-gestures` 由状态详情内的入口进入——仍为**一次**点击，因为状态详情本身是入口的**内容**而非必经层级；门禁按「从默认态到目标内容的点击次数 = 1」判定，并同时注册「从 L0 直接入口」的替代路径）。
3. **不遮挡 L0**：展开后断言 `#risk-rail` 与当前决策卡仍在视口内（`rect.top < innerHeight ∧ rect.bottom > 0`）且与展开区 `boundingRect` 交面积 = 0（FR-V3-030）。
4. **入口三要素**：非空文字 + `aria-expanded`/`aria-controls` 成对 + `aria-controls` 目标含非空摘要/计数（`data-summary` 或 `data-count`）（AC-V3-010）。
5. **内容清单逐类落实**（§2.2 表）：① 状态详情 ② 后果说明与影响预演（两段必填 + 破坏性不可逆声明）③ 引用证据（四要素 + 只读）④ 局部树（≤3）⑤ 已决策历史（N 可复算 + 零副作用）⑥ 回执三件套证据 ⑦ 手势表 ⑧ 「更多选项」其余项。
6. **展开态往返**：进 L2 视图再返回，展开态**保持进入前原状**（复用 v3-1 `disclosure.snapshot()/restore()`；FR-V3-023 / FR-V3-047）。

## 后果
- 与 v2 抽屉语义明确分离：**L1 = 就地展开（无 dialog 语义）**；L2 = 视图替换（v3-3）。
- 「面板级滚动容器计数 = 1」成为可断言口径，避免「两段滚动」失控。
- 手势表条目数在本叶先落 4 项基础手势，v3-4 补齐并做双向相等断言（FR-V3-070）。

### ADR-V3-022: 回执三件套 + 局部树 + 证据层只读三约束

## 状态
ACCEPTED（承父 FR-V3-033~035 / FR-V3-039 / NFR-V3-008 / NFR-V3-016）

## 背景
v2 已建立回执三件套语义（`tree-receipt.ts`：回执 + 工具面证据 + 审计出口）与真层级树的主归属链（`ownership-tree.ts`）。v3 的 L1 要求「摘要常驻 L0、完整证据 1 次可达、审计出口可达」，并新增「局部树（2~3 节点）」。

## 决策
1. **回执三件套（复用 v2 语义，不重写）**：① **摘要**常驻 L0（状态栏摘要位或决策卡上方一行，含「已处理 / 失败」+ 命令名 + 耗时）；② **完整证据**在 `[data-l1-panel="l1-receipt"]`（≤1 次交互）；③ **审计出口** = 进入 L2 审计视图的入口（v3-3 提供目标）+ L1 内联一条最新审计摘要。**三件缺一即 FAIL**。
2. **零明文**：回执与证据层字段白名单 = {命令名, 动作 id, 结果状态, 耗时, 目标**摘要**（截断）, 审计条目 id, 时间}；**禁止**出现命令参数全文 / URL 原文（去参）/ 通知·剪贴板·书签正文（只记长度 / 路径 / basename）；门禁做字段白名单 + 反例扫描（`apiKey`、剪贴板正文、通知正文零命中）。
3. **局部树 = 复用 v2 主归属链裁剪**：`buildLocalTree(snapshot, nodeId, {maxNodes: 3})` 取「当前节点 + 其主归属父链（最近 ≤2 个祖先）」；非主归属关系以**交叉引用徽标**呈现（沿用 ADR-V2-003「不复制节点」）；节点数 **≤3 是硬上限**（门禁遍历断言），并含「查看全局树」入口（→ L2，2 次交互可达）。
4. **证据层只读三约束**：① 证据层「写入 / 提权」控件计数 = 0；② 只渲染**只读投影**（策略档 / 后果 / clamp 原因均为文本 + 徽标）；③ 不提供任何「重新决策 / 直接执行」按钮（恢复路径只有「重新拾取」与「改用描述」两条）。
5. **「已决策历史」零副作用**：历史面板只渲染已执行回合的**只读记录**（含改选），不提供重放；门禁断言「展开历史前后已执行动作序列零变化」（FR-V3-035）。

## 后果
- 回执/证据与 v2 语义连续（不重复造），且满足 v3 的「摘要常驻 + 证据 1 次可达」。
- 局部树与 L2 全局树**同源**（同一快照、同一主链规则）→ 不会出现「两套归属口径」。
- 零明文与只读约束把 L1 排除在「写入面」之外（写入仍只有 v1/v2 既有唯一通路 + SW 侧 clamp）。

### ADR-V3-023: 引用 id 单源 + 四处贯穿 + 事实字段集契约 + 摘要截断口径

## 状态
ACCEPTED（承父 FR-V3-071 / FR-V3-033 / NFR-V3-016）

## 背景
FR-V3-071 要求「同一引用 id 贯穿页面角标 / 侧栏 chip / 证据层 / 失效风险行四处」；FR-V3-033 要求证据四要素（选择器 / 语义路径 / 文本摘要截断 / 捕获时间）。若 id 在多处各自生成（页面侧一套、侧栏一套），序号必然漂移，双向联动与失效标记都会错位。

## 决策
1. **单一 id 源 = 侧栏 `l1/ref-store.ts`**：`createRef(facts) → 'ref_' + seq`（单调递增，**不重用**已失效 id——避免「失效的 ② 变成有效的 ②」这类歧义）。
2. **四处只用同一 id**：页面角标文案 `①②③…`（由序数映射派生）/ 侧栏 chip / 证据层行标题 / `#risk-rail` 失效行。页面侧**不生成 id**，只回报事实并在收到确认后渲染对应序数。
3. **事实字段集契约（v3-4 采集，本叶消费）**：
   `{ origin, documentId, navSeq, declarationHash, declarationVersion?, selector, semanticPath, textDigest, capturedAt }`（全部为**原始事实**；无判定结论字段）。任一字段缺失 → `unknown` → 失效（ADR-V3-020 第 3 条）。
4. **截断口径（V32-O-2 裁决）**：`textDigest` = 去空白后**截断 80 字符** + `…`（超长时）；`semanticPath` 截断 120 字符；**不提供展开全文**（避免零明文风险 + 体积膨胀）；截断长度常量 pin 在 `ref-store.ts`，门禁逐字断言。
5. **id 一致性门禁**：四处 id 集合相等（FR-V3-071）；chip 与角标的**序数映射**相等；hover 联动（v3-4 实现）以同一 id 为键。

## 后果
- 序号漂移在结构上不可能（唯一生成点 + 不重用）。
- 事实字段集成为 v3-2 ↔ v3-4 的**正式接口**（v3-4 只上报，不判定）→ 两叶可独立开发与验证。
- 截断口径固定，零明文风险受控（不展开全文）。

### ADR-V3-024: 本叶取代策略（同编号前置展开 + union 计数口径落地）

## 状态
ACCEPTED（承父 ADR-V3-007 / ADR-V3-009）

## 背景
`test/ui/insight.mjs`（108 断言）大量钉住树 / 回执 / 确认相关 DOM；本叶改动（L1 就地展开、`#topbar` 家族迁入 L1、`#log` 历史回合折叠为 L1）会打破其中一部分。父 plan 已定：insight 走「**新断言落新文件** + 逐条 old→new 登记 + union 计数 ≥108」。

## 决策
1. **优先「同编号前置展开」**（id 零重命名的红利）：断言表达式**不变**，只在其前插入一步 `await openLayer('<panelId>')`；这类改动逐条进台账 `entries[]`（`oldId == newId`，`reason = 前置展开步骤`）。
2. **union 计数口径落地**：`counts.insight` 的 `countMethod = 'runtime-check-calls'`，`note` 必须写明 `runtime(insight.mjs) + runtime(l1.mjs) + runtime(l2.mjs) ≥ 108`；本叶收尾时把 `currentRuntime` 更新为三文件之和（`l2.mjs` 尚未存在时按 0 计，v3-3 补齐后更新）。
3. **不可就地修复的条目** → 迁到 `test/ui/l1.mjs` 并以**等价或更强**断言重写（台账 `newTitle` 必须可定位）；**禁止**降级为弱断言。
4. **`#log` 历史折叠的连带**：凡是「注入一条消息后立刻断言其可见/可滚」的条目，改为「当前回合」语义（最新条目仍可见）→ 若其语义确被取代，走第 3 条；否则保留原断言（前置无需展开）。
5. **安全 / 硬底线类断言只增**：新增「L1 证据层写入控件 = 0」「失效引用命令发送 = 0」「L1 无提权控件」三条反向断言。
6. **本叶不做**：不改 `journey.mjs`（v3-1 已处理 `#15c`）；不改 `binding.mjs`（若发现必须改，**必须在台账登记**并回报编排器）。

## 后果
- 取代量可控且可追溯；insight 的「108」以 union 口径客观兑现（口径写进台账，避免 r2 的跨口径歧义）。
- 本叶收尾必须全门禁绿（含台账门禁），不得把红灯留给 v3-3 / v3-4（EC-V3-013）。

---

## 8. 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建（V3-2「L1 就地展开与引用 / 回执」技术方案，ADR-V3-020~024）。**范围**：L1 八类就地展开（≤1 次交互 / 不遮挡 L0 / 入口带摘要计数）+ **引用失效 fail-closed 判定（五维 + 三态 + 唯一放行点 + 逐维可读原因 + 单判定权威）** + 失效呈现（风险位常驻 + chip 失效标记）+ 阻断与两条恢复路径 + 回执三件套 + 局部树（复用 v2 主归属链 ≤3 节点）+ 引用 id 单源四处贯穿。**裁决**：V32-O-1（声明变化 = hash ∪ version 任一不同）/ V32-O-2（摘要截断 80 字符，不展开全文）/ V32-O-3（局部树复用主链裁剪）/ V32-O-4（审计出口 = L2 视图 + L1 内联摘要）。**不做**：L0 骨架本体、L2 视图内容、页面侧采集实现、任何放宽（体积 / 密度 / 权限）。**只做 plan**：未写 tasks/代码、未改源码与测试、未跑门禁/构建/Chromium、未 commit。 | 2026-09-16 | SDDU Plan Agent |


