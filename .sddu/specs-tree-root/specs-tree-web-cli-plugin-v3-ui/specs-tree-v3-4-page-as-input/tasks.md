# 任务分解：specs-tree-v3-4-page-as-input（V3-4 页面即输入）

> **文档定位**: SDDU 任务清单 — 将技术方案分解为可并行执行的原子任务，作为 build 阶段的输入  
> **前置依赖**: `plan.md`（本叶 v1.0，ADR-V3-030~036，含 **前置 spike A-UI-004**）+ 父 `plan.md` v1.0（ADR-V3-001~012）+ 父 `spec.md` v1.0 + 本叶 `spec.md` v1.0  
> **创建人**: SDDU Tasks Agent  
> **创建时间**: 2026-09-16  
> **版本**: v1.0  
> **更新人**: SDDU Tasks Agent  
> **更新时间**: 2026-09-16  
> **更新说明**: 初始创建（本叶 14 任务 / 8 波；**A-UI-004 spike 为硬前置**；含第 5 bundle、双触发/teardown/失败降级、右键自绘三退让、引用捕获共享口径、双向联动、执行可视化、未授权零注入、独立体积守卫）

---

## 0. 跨叶定位与执行序（**本文件 = V3-4，4 叶最后一环**）

| 项 | 内容 |
|---|---|
| 叶间顺序 | `v3-1` → `{v3-2, v3-3}` → **`v3-4`（最后开工）** |
| 本叶前置 | **v3-1 全门禁绿**（选择题契约 / 引用 chip 契约）+ **v3-2 全门禁绿**（引用证据 / 失效判定与呈现 / 事实字段集）+ **v3-3 全门禁绿** + **A-UI-004 spike 通过** |
| 风险集中 | R-UI-001 / R-UI-004 / R-UI-008 三险全部集中于此（父 plan §2.5） |
| **硬前置（不可跳过）** | **TASK-401 spike（S1~S4）未全过 → 不得进入 Wave 2 及之后的任何实现任务**（ADR-V3-035 第 5 条） |
| 唯一触碰 `src/content/**` 的叶子 | 但**冻结三文件零改动**：`src/content/{content-script,dom-agent,page-bridge}.ts` 不改，`CONTENT_SOURCE_SHA256` 三项 pin **不变**（新增文件不改 pin） |
| 本叶收尾要求 | **全门禁绿且严格串行**（AC-V3-013）；页面侧取代在本叶内闭合 |
| 门禁纪律 | 一次只跑一个（本机 ~1.5GB、曾 OOM）；日志 `tee` 落盘 `/tmp/opencode/v3-gate-logs/*.log`，**禁 tail 截断** |

### 0.1 红线（任何情况下不得触碰 —— 含两条降级路径）

| # | 红线 | 守线门禁 |
|:--:|------|---------|
| 1 | **不放宽 `CONTENT_MAX_BYTES`**（177,076 B 无容差） | 既有 `evaluateContentCeiling` + `test/pick-layer-budget.test.ts` |
| 2 | **不引入 `contextMenus`**（右键自绘） | `manifest.json` 零 diff 断言（AC-V3-017） |
| 3 | **不静态注入 / 不扩 `host_permissions`** | `manifest.json` 零 diff + 零注入门禁（AC-V3-018） |
| 4 | **不更新三 hash pin**（本叶不改冻结三文件） | `CONTENT_SOURCE_SHA256` 三项 pin 核对 |
| 5 | **不静默沿用失效引用** | v3-2 `isRefUsable` 唯一放行点 + 「拾取期间命令发送 = 0」 |
| 6 | **引用能力必须接线到生产**（v3-2 收口轮 N-06 收敛；**测试 seam 内的 `setEnv` 不算接线**） | **TASK-415** 的运行时门禁（AC-CONV-1 / AC-CONV-2：真实 env 注入点 + 唯一动作入口走 `dispatchRefAction` guard） |

---

## 1. 依赖拓扑总览

### 1.1 任务总览表

| ID | 名称 | 复杂度 | 前置依赖 | 波次 | 类型 |
|----|------|:--:|------|:--:|:--:|
| **TASK-401** | **A-UI-004 前置 spike（S1~S4；未过不得进入实现）** | M | 无（v3-1~v3-3 全绿后） | **1** | gate/spike |
| TASK-402 | 引用捕获口径 `src/content/ref-capture.ts` + `test/ref-capture.test.ts`（稳定优先路径 + `data-wcli-ref` + 截断 80/120） | M | 401 | 2 | implementation |
| TASK-403 | **第 5 bundle 构建与注入通路**（`build.mjs` 追加 entry + `messaging.ts` kind + `service-worker.ts` 两 case + 幂等 + teardown） | M | 401 | 2 | implementation |
| TASK-404 | 拾取层入口与消息桥 `pick-layer.ts` + `pick-bridge.ts`（Alt 状态机 + 双触发 + 幂等 + teardown 自卸载 + 宿主事件不吞五规则） | M | 402, 403 | 3 | implementation |
| TASK-405 | Shadow DOM 隔离宿主 `pick-overlay.ts`（描边 / 标签 / 胶囊 / 气泡 / 角标 + `all:initial` + 内联 CSS/SVG） | M | 402, 403 | 3 | implementation |
| TASK-406 | 右键自绘菜单 `pick-menu.ts`（路线 1 + **三退让** + `role="menu"` 键盘语义） | S | 403 | 3 | implementation |
| TASK-407 | **四项交互接线 + 失败降级 + 引用 chip 消费 + 双向高亮联动（P4）** | L | 404, 405, 406 | 4 | implementation |
| TASK-408 | **P5 执行可视化 + G1 双击 / G2 悬停⊕ + 手势表 6 项双向相等** | M | 407 | 5 | implementation |
| TASK-410 | 未授权**零注入**门禁 `test/ui/zero-injection.mjs` + `test/zero-injection.test.ts`（含反证） | M | 404 | 5 | gate |
| TASK-411 | `pick-layer.js` **独立硬上限 + 基线登记**（`test/pick-layer-budget.test.ts` + `size-baseline.ts` 追加） | M | 403 | 5 | gate |
| TASK-409 | 页面即输入门禁 `test/ui/page-input.mjs`（四项交互 + 三退让 + 零命令 + 双向同序号 + 宿主零影响） | M | 408 | 6 | gate |
| TASK-412 | 既有 `binding.mjs` 页面侧条目同编号最小改写 + 台账追加 | M | 409 | 6 | implementation |
| TASK-413 | `sidepanel.js` 体积核对 + 显式重登记（**条件触发**，披露要求见 §4.4） | S | 409, 412 | 7 | gate |
| TASK-415 | **引用能力生产接线（N-06 收敛，硬性）**：① 真实 env 注入点（origin / 授权 / documentId / navSeq / 声明 hash）② 唯一动作入口走 `dispatchRefAction` guard + 运行时可 FAIL 门禁 | M | 407 | 7 | implementation + gate |
| TASK-414 | **收口：全门禁绿串行验证 + 人工面如实登记** | M | 413 | 8 | gate |

### 1.2 依赖拓扑（spike 门 → 串行主轴 + 并行组）

```
Wave 1 ── **硬前置：spike 门**
  TASK-401 [M] A-UI-004 spike S1~S4  ← 未全过则 D1/D2 降级 + 回报编排器；**禁止进入 Wave 2**
        │  S1 注入可行 · S2 体积 ≤60,000 B · S3 零注入可验证 · S4 三退让可实现
        ▼  （全部通过）
Wave 2 ── 并行组 ①（文件不相交）
  TASK-402 [M] src/content/ref-capture.ts + test/ref-capture.test.ts
  TASK-403 [M] build.mjs 第 5 entry + messaging.ts + service-worker.ts 两 case

Wave 3 ── 并行组 ②（页面侧模块文件不相交）
  TASK-404 [M] pick-layer.ts + pick-bridge.ts      （dep 402,403）
  TASK-405 [M] pick-overlay.ts                     （dep 402,403）
  TASK-406 [S] pick-menu.ts                        （dep 403）

Wave 4 ── 串行（集成）
  TASK-407 [L] 四项交互接线 + 失败降级 + chip 消费 + 双向联动 P4  （dep 404,405,406）

Wave 5 ── 并行组 ③
  TASK-408 [M] P5 执行可视化 + G1/G2 + 手势表 6 项   （dep 407）
  TASK-410 [M] zero-injection 门禁（含反证）          （dep 404）
  TASK-411 [M] pick-layer 独立体积守卫 + 基线登记      （dep 403）

Wave 6 ── 并行组 ④
  TASK-409 [M] test/ui/page-input.mjs                （dep 408）
  TASK-412 [M] binding.mjs 同编号最小改写 + 台账       （dep 409）

Wave 7 ── 串行
  TASK-415 [M] 引用生产接线（真实 env 注入点 + 唯一动作入口走 guard）  （dep 407）
  TASK-413 [S] sidepanel.js 体积核对 / 条件重登记（dep 409, 412, 415）

Wave 8 ── 串行收口
  TASK-414 [M] 全门禁绿 + 人工面登记（dep 413）
```

### 1.3 并行分组（执行波次）

| 波次 | 任务 | 并行性 | 必须串行的部分 |
|:--:|------|------|------|
| **1** | **401** | **串行（spike 门）** | 本波全部；**spike 未过禁止推进** |
| 2 | 402, 403 | **可并行**（文件不相交） | — |
| 3 | 404, 405, 406 | **可并行**（三个页面侧模块文件不相交） | — |
| 4 | 407 | 串行（集成） | 本波全部 |
| 5 | 408, 410, 411 | **可并行写入** | ⚠️ **门禁执行严格串行**：`test:zero-injection` / `test:page-input` 与既有 Chromium 门禁一次只跑一个 |
| 6 | 409 → 412 | 串行（**波内串行链**，`tasks.json` 中以 `serialWithinWave: true` 显式声明） | ⚠️ 门禁执行严格串行（412 需引用 409 建立的新门禁文件） |
| 7 | 413 | 串行 | 本波全部 |
| 8 | 414 | 串行（单条链式命令） | 本波全部 |

---

## 2. 任务列表

### TASK-401: **A-UI-004 前置 spike（S1~S4）**
> **本叶硬前置**：spike 未通过前**不得进入实现**（ADR-V3-035 第 5 条）

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | v3-1 / v3-2 / v3-3 全门禁绿（本任务自身无叶内依赖） |
| **执行波次** | **Wave 1（串行门）** |
| **对应 FR / AC / ADR** | FR-V3-067 · NFR-V3-003 / NFR-V3-004 / NFR-V3-007 · EC-V3-012 · AC-V3-015 / AC-V3-018 · ADR-V3-030 · ADR-V3-031 · ADR-V3-035 |

**描述**: 在 `/tmp/opencode/v3-spike/`（**临时目录，不入版本库**）做**可行性验证**（**不写产品代码**），四条验收**全部必须通过**：
- **S1 注入可行**：已授权 fixture 站点上用 `executeScript({target:{tabId}, files:['<最小实验产物>']})` 成功注入并注册监听；**未授权** origin 上同一调用**失败且报可读原因**（证明零注入红线可由机制保证）。
- **S2 体积可控**：把「描边 + 标签 + 胶囊 + 气泡 + 菜单 + 消息桥」的最小骨架打包，实测产物字节数 **≤ 60,000 B**（若超 → 记录实测值并给出精简方案；**不得**通过合并进 `content.js` 解决）。
- **S3 零注入可验证**：未授权 origin 上断言「无 `registerContentScripts` 注册 / 无注入 / 无监听 / 无 Shadow host / 右键未被拦截」全部成立（spike 脚本以计数与 DOM 探针方式验证）。
- **S4 三退让可实现**：① 仅已授权站点拦截；② 「交给原生菜单」出口可用（下一次右键不被拦截）；③ `Esc` 与点击空白可关。

**失败处置（逐级降级，两条）**：**D1 形态降级**——按需注入不可行 → 采用**方案 C**（第二个**登记式** content script，`registerSiteContentScript` 的 `js` 追加 `pick-layer.js`），仍**不改 `content.js` 字节**、仍满足未授权零注入，并**显式登记取舍 + 回报编排器**；**D2 范围降级**——若 D1 也不可行（如体积不可控）→ **不自行扩权/放宽**，把结论与实测数据**回报编排器**，由编排器裁决是否缩小本叶范围。**结论摘要（通过 / 不通过 + 实测值）写入本叶 build 报告**，并作为 `PICK_LAYER_BASELINE_BYTES` 的来源依据。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| NEW（**临时，不入版本库**） | `/tmp/opencode/v3-spike/`（spike 脚本 + 最小实验产物 + 完整日志） |
| NEW | `/tmp/opencode/v3-gate-logs/spike-*.log`（证据，不入版本库） |

**验收标准**:
- [ ] **S1**：已授权注入成功 ∧ 未授权注入失败且**报可读原因**（两段日志都在）
- [ ] **S2**：最小骨架实测字节 **≤ 60,000 B**；超限时给出精简方案（**不得**并入 `content.js`）
- [ ] **S3**：未授权 origin 上五项探针（注册 / 注入 / 监听 / Shadow host / 右键拦截）全部为「无」
- [ ] **S4**：三退让逐条验证成立（含「下一次右键不被拦截」的显式验证）
- [ ] **红线自证**：spike 全程未改 `CONTENT_MAX_BYTES`、未引入 `contextMenus`、未静态注入、**未更新三 hash pin**
- [ ] 结论摘要（通过 / 不通过 + 实测值 + 降级路径）写入 build 报告；临时文件**不入版本库**（`git status` 干净）
- [ ] **若未全过 → 走 D1 / D2 并回报编排器，禁止进入 Wave 2**

**验证命令**:
```bash
mkdir -p /tmp/opencode/v3-gate-logs && node /tmp/opencode/v3-spike/spike.mjs 2>&1 | tee /tmp/opencode/v3-gate-logs/spike-all.log
# 红线自证
git diff --numstat -- packages/web-cli-plugin/manifest.json packages/web-cli-plugin/src/content/content-script.ts packages/web-cli-plugin/src/content/dom-agent.ts packages/web-cli-plugin/src/content/page-bridge.ts
git status --porcelain | grep -v '^?? /tmp' || echo "no unexpected changes"
```

---

### TASK-402: 引用捕获口径 `src/content/ref-capture.ts` + `test/ref-capture.test.ts`
> 页面侧与证据层**同源口径**（ADR-V3-034）

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-401（spike 通过） |
| **执行波次** | Wave 2 |
| **对应 FR / AC / ADR** | FR-V3-071 · NFR-V3-003 · AC-V3-023 · ADR-V3-034 |

**描述**: 新建纯函数捕获模块（页面侧唯一捕获实现；v3-2 证据层消费同一口径）：产出 `{ selector, semanticPath, textDigest, origin, documentId, navSeq, declarationHash, capturedAt }`。**稳定优先**路径：`id` → `data-*` 稳定键 → 结构性路径（`tagName` + `nth-of-type` 逐级，**最多 6 级**）→ 截断 **120 字符**；同时**在目标上写 `data-wcli-ref="ref_<n>"` 标记**（供 v3-2 的 D1 身份判定）。`textDigest` 去空白 + 截断 **80 字符**。纯函数 + node 单测（**同一 DOM 两次生成结果相等**）。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| NEW | `packages/web-cli-plugin/src/content/ref-capture.ts` |
| NEW | `packages/web-cli-plugin/test/ref-capture.test.ts` |

**验收标准**:
- [ ] 稳定优先路径算法实现（`id` → `data-*` → 结构性路径 ≤6 级）；**同 DOM 两次结果相等**
- [ ] 截断口径：`textDigest` 80 / `semanticPath` 120（单测断言边界值）
- [ ] 事实字段**齐备**（8 字段）；缺失不静默（交给 v3-2 判 `unknown`）
- [ ] 目标上写 `data-wcli-ref` 标记（供 D1 节点身份判定）
- [ ] **不修改**冻结三文件 `src/content/{content-script,dom-agent,page-bridge}.ts`（`CONTENT_SOURCE_SHA256` 三项 pin 不变）
- [ ] 纯函数（无 `chrome.*` 业务调用）；`npm run typecheck` 0 error

**验证命令**:
```bash
cd packages/web-cli-plugin && npm run typecheck && npm test 2>&1 | tee /tmp/opencode/v3-gate-logs/npm-test-v34-w2.log
git diff --numstat -- src/content/content-script.ts src/content/dom-agent.ts src/content/page-bridge.ts
```

---

### TASK-403: **第 5 bundle 构建与注入通路**（`build.mjs` + `messaging.ts` + `service-worker.ts`）
> 按需注入的机制层（零新增权限，复用既有 `executeScript` 通路）

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-401（spike 通过） |
| **执行波次** | Wave 2 |
| **对应 FR / AC / ADR** | FR-V3-067 / FR-V3-072 · NFR-V3-003 / NFR-V3-004 / NFR-V3-006 · AC-V3-015 / AC-V3-017 · ADR-V3-030 · ADR-V3-031 |

**描述**: ① `build.mjs` **追加**第 5 个 `entryPoint`（`src/content/pick-layer.ts` → `dist/pick-layer.js`，IIFE，**既有 4 个 entry 零改动**）。② `src/background/messaging.ts` 的 `PluginMessageKind` **追加**拾取层相关 kind（`pick-layer-inject` / `pick-layer-teardown` / `ref-captured` / `highlight`），**既有 kind 零改动**。③ `src/background/service-worker.ts` **追加** `case 'pick-layer-inject'` / `'pick-layer-teardown'`：注入走 `chrome.scripting.executeScript({target:{tabId}, files:['pick-layer.js']})`（**复用既有通路**）；注入前**再次校验授权集合**（未授权直接拒绝 + 可读原因）；**幂等**（层内 `window.__wcliPickLayer` 已存在则直接返回）；teardown 转发卸载指令。④ **失败降级**：注入失败（无 host permission / tab 不可注入 / `chrome://` 等受限页）→ SW **回报可读原因**（不静默失败）。**既有 case 零改动。**

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/web-cli-plugin/build.mjs`（仅追加第 5 个 entryPoint） |
| MODIFY | `packages/web-cli-plugin/src/background/messaging.ts`（仅追加 kind） |
| MODIFY | `packages/web-cli-plugin/src/background/service-worker.ts`（仅追加 2 个 case） |

**验收标准**:
- [ ] `npm run build` 产出 `dist/pick-layer.js`（第 5 bundle）；**既有 4 个产物字节逻辑不变**（`content.js` 仍 = 177,076 B）
- [ ] `build.mjs` 既有 4 个 entry **零改动**；`manifest.json` **零 diff**（不加 `web_accessible_resources`、不加 `content_scripts`、不加权限）
- [ ] SW 两 case **追加**（既有 case 零改动）；注入前**再次校验授权集合**
- [ ] **幂等**：重复注入不产生第二个 Shadow host / 不重复注册监听
- [ ] 注入失败 → **可读原因**回报（不静默）
- [ ] `npm run typecheck` 0 error

**验证命令**:
```bash
cd packages/web-cli-plugin && npm run typecheck && npm run build && node -e "const fs=require('fs');const c=fs.statSync('dist/content.js').size;console.log({content:c,pick:fs.existsSync('dist/pick-layer.js')?fs.statSync('dist/pick-layer.js').size:'MISSING'});if(c!==177076)throw new Error('content.js drifted: '+c)"
git diff --numstat -- packages/web-cli-plugin/manifest.json
```

---

### TASK-404: 拾取层入口与消息桥 `pick-layer.ts` + `pick-bridge.ts`
> 生命周期与幂等的宿主

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-402, TASK-403 |
| **执行波次** | Wave 3 |
| **对应 FR / AC / ADR** | FR-V3-060 / FR-V3-062 / FR-V3-067 / FR-V3-068 / FR-V3-069 / FR-V3-071 · NFR-V3-007 · AC-V3-018 / AC-V3-022 · ADR-V3-030 · ADR-V3-031 · ADR-V3-033 · ADR-V3-034 |

**描述**: 新建 `pick-layer.ts`（组装 + Alt 状态机 + 幂等标记 `window.__wcliPickLayer = { version, state, unmount() }` + `unmount` 移除全部监听 + 移除 Shadow host + `delete window.__wcliPickLayer`）与 `pick-bridge.ts`（与 SW / 侧栏消息：`ref-captured` / `highlight` / `teardown`；**注入幂等**；**宿主事件不吞五规则**：① Alt 监听**不** `preventDefault`（只读 `altKey` 状态）；② 非拾取态**不**接管 `pointerdown/move`；③ 仅**当前目标元素**在拾取态 `preventDefault`；④ 自绘菜单**只在自己打开时**拦截 `contextmenu`；⑤ 气泡不阻止选区默认行为（点击气泡才 `stopPropagation`））。`Esc` 关闭菜单 / 撤销高亮 / 退出拾取态。**触发形态（双触发）**：面板在场（已授权 origin）注入 + 「从页面拾取」点击再注入（幂等）。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| NEW | `packages/web-cli-plugin/src/content/pick-layer.ts` |
| NEW | `packages/web-cli-plugin/src/content/pick-bridge.ts` |

**验收标准**:
- [ ] `window.__wcliPickLayer` 幂等标记（version / state / `unmount()`）；重复注入不重复注册
- [ ] `teardown` → 全部监听移除 + Shadow host 移除 + `delete window.__wcliPickLayer`
- [ ] **宿主事件不吞五规则**逐条实现（门禁在 TASK-409 断言宿主交互零影响）
- [ ] `Esc` 可关闭菜单 / 撤销高亮 / 退出拾取态
- [ ] **拾取路径只产出引用素材**（`ref-captured`），**不进入**动作派发（命令发送 = 0）
- [ ] 不改冻结三文件（三 hash pin 不变）

**验证命令**:
```bash
cd packages/web-cli-plugin && npm run typecheck && npm run build 2>&1 | tee /tmp/opencode/v3-gate-logs/build-v34-w3.log
git diff --numstat -- src/content/content-script.ts src/content/dom-agent.ts src/content/page-bridge.ts
```

---

### TASK-405: Shadow DOM 隔离宿主 `pick-overlay.ts`
> 双向隔离（宿主污染不进 / 我方样式不漏）

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-402, TASK-403 |
| **执行波次** | Wave 3 |
| **对应 FR / AC / ADR** | FR-V3-060 / FR-V3-062 / FR-V3-063 / FR-V3-065 / FR-V3-069 · EC-V3-017 · AC-V3-022 · ADR-V3-030 · ADR-V3-033 |

**描述**: 新建 Shadow DOM 隔离宿主：单一 host 元素 `[data-wcli-pick-root]`（唯一属性选择器）+ `host.attachShadow({mode:'open'})` + `all: initial` 基线 + 高 `z-index`（`2147483000`）；承载**描边**（唯一目标，多点同时高亮即 FAIL）/ **浮动标签**（语义路径 › 极短选择器 › 文本摘要）/ **跟随胶囊**（Alt 拖动）/ **气泡**（拖选文本，选区右下 12px，「引用选中内容（N 字）」，**1.8s 自动淡出**）/ **角标**（`①②③`，与侧栏 chip **同序号**）。内联 CSS + 内联 SVG（**无外链**，CSP 安全）。拖选：最小 **2 字符**（去空白后）；在 `input` / `textarea` / `[contenteditable]` 内**禁用**；**只读选区，不读剪贴板**。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| NEW | `packages/web-cli-plugin/src/content/pick-overlay.ts` |

**验收标准**:
- [ ] 全部自绘 UI 在 **open Shadow DOM** 内；host 用唯一属性选择器 + `all: initial` + `z-index = 2147483000`
- [ ] 内联 CSS / 内联 SVG（**无外链**）
- [ ] 描边**唯一目标**（不得多点同时高亮）；`Esc` / 释放 Alt 即撤销，撤销后页面**零残留**
- [ ] 气泡：拖选 ≥2 字符出现；`input`/`textarea`/`[contenteditable]` 内**不出现**；1.8s 自动淡出；**只读选区不读剪贴板**
- [ ] 角标序号与侧栏 chip **同序号**（同一 `ref_<n>`）
- [ ] 宿主全局 `* { … !important }` + 高 z-index 全屏元素污染夹具下仍**可读且可关**（EC-V3-017）

**验证命令**:
```bash
cd packages/web-cli-plugin && npm run typecheck && npm run build 2>&1 | tee /tmp/opencode/v3-gate-logs/build-v34-w3b.log
```

---

### TASK-406: 右键自绘菜单 `pick-menu.ts`（路线 1 + 三退让）
> 零新增权限（不引入 `contextMenus`）

| 属性 | 值 |
|------|-----|
| **复杂度** | S |
| **前置依赖** | TASK-403 |
| **执行波次** | Wave 3 |
| **对应 FR / AC / ADR** | FR-V3-064 · NFR-V3-006 / NFR-V3-011 · EC-V3-017 · AC-V3-017 / AC-V3-022 · ADR-V3-032 |

**描述**: 新建右键自绘菜单（**路线 1，零新增权限**）：`contextmenu` 拦截**仅在层在场时**；菜单在 Shadow DOM 内（`role="menu"` + `role="menuitem"` + roving `tabindex` + 方向键 / `Home` / `End` / `Enter`）；菜单项 = 纳入引用 / 作为操作目标 / 引用选中文本 / 在此处拾取 / **交给页面原生菜单**。**三退让逐条**：① 仅**已授权站点**生效（层不在场 → **完全不拦截**）；② 菜单**首项保留「交给页面原生菜单」出口**（下 1 次右键不再拦截 / 或 `Shift+Alt`）；③ `Esc` 与点击空白即关。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| NEW | `packages/web-cli-plugin/src/content/pick-menu.ts` |

**验收标准**:
- [ ] `manifest.json` **零 diff**（**无 `contextMenus`**、无新权限）
- [ ] `role="menu"` + `role="menuitem"` + roving `tabindex` + 方向键 / `Home` / `End` / `Enter` 全部实现
- [ ] **三退让**逐条成立（① 仅已授权；② 原生菜单出口 → 下一次右键不被拦截；③ `Esc` / 点击空白即关）
- [ ] 菜单**仅在自己打开时**拦截 `contextmenu`（layer 不在场 → 完全不拦截）
- [ ] 菜单内不出现任何「提权 / 放宽」项

**验证命令**:
```bash
cd packages/web-cli-plugin && npm run typecheck && npm run build 2>&1 | tee /tmp/opencode/v3-gate-logs/build-v34-w3c.log
git diff --numstat -- packages/web-cli-plugin/manifest.json
```

---

### TASK-407: **四项交互接线 + 失败降级 + 引用 chip 消费 + 双向高亮联动（P4）**
> 本叶集成核心（FR-V3-060~066）

| 属性 | 值 |
|------|-----|
| **复杂度** | **L** |
| **前置依赖** | TASK-404, TASK-405, TASK-406 |
| **执行波次** | Wave 4（**串行**） |
| **对应 FR / AC / ADR** | FR-V3-060 / FR-V3-061 / FR-V3-062 / FR-V3-063 / FR-V3-064 / FR-V3-065 / FR-V3-066 / FR-V3-068 / FR-V3-071 · NFR-V3-007 · EC-V3-003 / EC-V3-005 / EC-V3-006 / EC-V3-014 · AC-V3-022 / AC-V3-023 · ADR-V3-030 · ADR-V3-033 · ADR-V3-034 |

**描述**: 接线**四项交互**并与侧栏闭环：① **Alt 悬停拾取** → `ref-captured` → 侧栏 chip `ref_<n>` + **一道选择题**（`#ask`）；② **Alt 拖动到侧栏** → 跟随胶囊 + 落到侧栏区域（侧栏 `dragover` 落点高亮）→ 松手生成 chip + 选择题；**未落到侧栏 → 「已取消引用」零副作用**；③ **右键自绘菜单**（消费 TASK-406）；④ **拖选文本气泡**（消费 TASK-405）。**双向高亮联动（P4）**：点侧栏 chip → 页面元素描边闪动 + 滚动到可见 + 角标；hover 角标 → 通知侧栏高亮 chip；**同序号**。**侧栏侧接线**：`sidepanel.ts` 追加「面板在场注入触发 / teardown / 引用事件订阅 / 角标联动 / 拾取入口接线」（**既有 handler 零删改**）；**失败降级**：注入失败 → `#risk-rail`（或 L1 状态详情）明示「页面侧不可用（原因）」且「从页面拾取」入口**禁用**（不静默失败）。**拾取全过程不进入动作派发**（命令发送 = 0）。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/web-cli-plugin/src/content/pick-layer.ts`（四交互组装与状态机） |
| MODIFY | `packages/web-cli-plugin/src/ui/sidepanel/sidepanel.ts`（注入触发 / teardown / 引用订阅 / 角标联动 / 拾取入口接线） |
| MODIFY | `packages/web-cli-plugin/src/ui/sidepanel/l1/panels.ts`（手势表条目补齐 + 证据层消费同一 `ref-capture` 口径） |
| MODIFY | `packages/web-cli-plugin/src/ui/sidepanel/index.html`（引用 chip / 角标联动标记与样式，复用 `:root` tokens） |

**验收标准**:
- [ ] **四项交互各自**生成 1 个引用 + 1 道选择题（不是「至少一项可用」）
- [ ] 拾取后**不出现常驻输入框**（结果 = 引用 chip + 选择题）
- [ ] Alt 悬停**唯一高亮**且可撤销（`Esc` / 释放 Alt）；撤销后页面**零残留**
- [ ] **拾取期间命令发送计数 = 0**（可监听计数断言）
- [ ] Alt 拖动**落点 / 未落点两路径**各验证一次；未落点 → **零副作用**（不生成引用、不改状态）
- [ ] 右键三退让成立（同 TASK-406 门槛）
- [ ] 拖选气泡出现 + ≥1 个动作候选 + 选择后生成引用与选择题
- [ ] **chip ↔ 角标同序号**；双向 hover 互相高亮；目标移出视口 / 消失走 v3-2 判定
- [ ] **失败降级**：注入失败 → 风险位明示「页面侧不可用（原因）」+ 拾取入口禁用（不静默）
- [ ] 侧栏既有 handler **零删改**

**验证命令**:
```bash
cd packages/web-cli-plugin && npm run typecheck && npm test 2>&1 | tee /tmp/opencode/v3-gate-logs/npm-test-v34-w4.log
```

---

### TASK-408: **P5 执行可视化 + G1 双击 / G2 悬停⊕ + 手势表 6 项双向相等**
> 页面侧手势面补齐（FR-V3-070）

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-407 |
| **执行波次** | Wave 5 |
| **对应 FR / AC / ADR** | FR-V3-070 · AC-V3-022 · ADR-V3-034 |

**描述**: ① **P5 执行可视化**：页面侧描边**闪动** + 侧栏「回合进行中 → 已处理」角标联动（设计基准 P5 语义）。② **G1 双击即引用** / **G2 悬停 600ms 出现 ⊕ 引用**（复用与 P1/P2/P3/P6 同一条捕获路径）。③ **手势表补齐至 6 项**（Alt 悬停拾取 / Alt 拖动入侧栏 / 右键引用 / 拖选文本 / 双击即引用 G1 / 悬停 ⊕ 引用 G2）并与 `l1-gestures` 面板做**双向相等**断言；**G3~G5（长按 500ms / 滚动候选 / Alt+数字绑定）明确标为「规格未实现」**（不列入）。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/web-cli-plugin/src/content/pick-layer.ts`（P5 / G1 / G2） |
| MODIFY | `packages/web-cli-plugin/src/content/pick-overlay.ts`（闪动 / ⊕ 角标） |
| MODIFY | `packages/web-cli-plugin/src/ui/sidepanel/l1/panels.ts`（手势表 6 项） |

**验收标准**:
- [ ] P5：执行可视化（页面描边闪动 + 侧栏「回合进行中 → 已处理」角标）可用
- [ ] G1 双击 / G2 悬停 600ms ⊕ → 各生成 1 引用 + 1 选择题
- [ ] 手势表条目数 = **6** 且与实际实现**集合相等**（不许多列未实现手势）
- [ ] G3~G5 明确标为「规格未实现」（不列入手势表）
- [ ] 复用 `ref-capture` 同一捕获路径（不另写一份）

**验证命令**:
```bash
cd packages/web-cli-plugin && npm run typecheck && npm run build 2>&1 | tee /tmp/opencode/v3-gate-logs/build-v34-w5.log
```

---

### TASK-410: 未授权**零注入**门禁 `test/ui/zero-injection.mjs` + `test/zero-injection.test.ts`
> FR-V3-067 / NFR-V3-007 / AC-V3-018（**必须能真 FAIL**）

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-404 |
| **执行波次** | Wave 5 |
| **对应 FR / AC / ADR** | FR-V3-067 / FR-V3-068 · NFR-V3-007 / NFR-V3-013 · EC-V3-003 / EC-V3-005 · AC-V3-018 · ADR-V3-030 · ADR-V3-031 |

**描述**: 新建两段零注入门禁（`npm run test:zero-injection` + 纳入 `npm test` 的 node 段）：在**未授权 fixture origin** 上断言「无 `registerContentScripts` 注册 / 无注入 / 无监听 / 无 Shadow host / 无拾取 UI / 无气泡 / 无自绘菜单 / 右键未被拦截」**全部成立**；**反证**：故意注入 → **必须 FAIL**（证明确实能检测）；L0 风险位明示「未授权」+「页面侧零注入」且「从页面拾取」入口**禁用**。node 段断言 `manifest.json` 静态权限零新增（5 项不变 / 6 域不变 / **无 `contextMenus`** / 无静态 `content_scripts` / `optional_permissions` 不变）。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| NEW | `packages/web-cli-plugin/test/ui/zero-injection.mjs` |
| NEW | `packages/web-cli-plugin/test/zero-injection.test.ts` |
| MODIFY | `packages/web-cli-plugin/package.json`（追加 `test:zero-injection`；`test:v3` 追加） |

**验收标准**:
- [ ] 未授权 origin 上**七项**（注册 / 注入 / 监听 / Shadow host / UI / 气泡 / 右键拦截）全部为「无」
- [ ] **反证**：故意注入 → 门禁 **FAIL**（留日志）
- [ ] L0 风险位「未授权 + 页面侧零注入」文案成立；「从页面拾取」入口 `disabled`
- [ ] `manifest.json` 静态权限零新增（**无 `contextMenus`**）；零 diff（门禁内机器核对）
- [ ] 单 Chromium 实例；日志全量落盘禁 tail

**验证命令**:
```bash
cd packages/web-cli-plugin && npm run test:zero-injection 2>&1 | tee /tmp/opencode/v3-gate-logs/zero-injection.log
```

---

### TASK-411: `pick-layer.js` **独立硬上限 + 基线登记**
> 显式体积任务：新 artifact 独立守卫（无容差）

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-403 |
| **执行波次** | Wave 5 |
| **对应 FR / AC / ADR** | NFR-V3-003 / NFR-V3-004 · AC-V3-015 / AC-V3-016 · EC-V3-012 · ADR-V3-011 · ADR-V3-031 · ADR-V3-035 |

**描述**: ① 在 `test/size-baseline.ts` **仅追加**（既有常量与断言零改动）：`PICK_LAYER_BASELINE_BYTES` = 首轮 `npm run build` 后的**实测值**；`PICK_LAYER_CEILING = 该实测值`（**无容差**，与 `content.js` 同级「不增长」口径）；`PICK_LAYER_BASELINE_META` 记 `measuredOn` / `source`（`dist/pick-layer.js`）/ `buildCommand` / `measuredBy`（`v3-4 + 轮次`）/ `previousBaselineBytes`（`null`，首轮）/ `direction`（`initial`）。② 新建 `test/pick-layer-budget.test.ts`：断言 `dist/pick-layer.js` ≤ `PICK_LAYER_CEILING`；**反证**：+1 B → **必须 FAIL**；**同时**复核 `dist/content.js` ≤ 177,076 B（无容差）与 `CONTENT_SOURCE_SHA256` **三项 pin 不变**；**不与 `content.js` 合并计数**（合并会互相掩盖）。**超限处置**：**只能改实现**（拆 CSS / 去重复 / 复用已有纯函数），**不得**放宽上限。基线来源依据 = TASK-401 spike 的 S2 实测值。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/web-cli-plugin/test/size-baseline.ts`（**仅追加** `PICK_LAYER_*`；既有常量与断言零改动） |
| NEW | `packages/web-cli-plugin/test/pick-layer-budget.test.ts` |

**验收标准**:
- [ ] `PICK_LAYER_BASELINE_BYTES` = 首轮实测值（无容差）；`PICK_LAYER_CEILING` = 该值
- [ ] `PICK_LAYER_BASELINE_META` 含 `measuredOn` / `source` / `buildCommand` / `measuredBy` / `previousBaselineBytes` / `direction`
- [ ] **反证**：`dist/pick-layer.js` +1 B → 守卫**必须 FAIL**（留日志）
- [ ] `dist/content.js` ≤ 177,076 B 复核；`CONTENT_SOURCE_SHA256` **三项 pin 不变**
- [ ] **不合并计数**（`pick-layer.js` 与 `content.js` 各自独立断言）
- [ ] `test/size-baseline.ts` 既有常量与断言**零删改**（仅追加）
- [ ] 超限时**只能改实现**（不得放宽上限）

**验证命令**:
```bash
cd packages/web-cli-plugin && npm run build && npm test 2>&1 | tee /tmp/opencode/v3-gate-logs/pick-layer-budget.log
node -e "const fs=require('fs');console.log('pick-layer.js =',fs.statSync('dist/pick-layer.js').size,'B; content.js =',fs.statSync('dist/content.js').size,'B')"
```

---

### TASK-409: 页面即输入门禁 `test/ui/page-input.mjs`
> 本叶验收的唯一实跑载体（AC-V3-022 / AC-V3-023）

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-408 |
| **执行波次** | Wave 6 |
| **对应 FR / AC / ADR** | FR-V3-060~066 / FR-V3-069 / FR-V3-070 / FR-V3-071 · NFR-V3-012 / NFR-V3-013 · AC-V3-022 / AC-V3-023 / AC-V3-024 · ADR-V3-030 · ADR-V3-032 · ADR-V3-033 · ADR-V3-034 |

**描述**: 新建页面即输入 Chromium 门禁（`npm run test:page-input`），在**已授权 fixture 站点**上断言：① 四项交互**各生成 1 引用 + 1 选择题**；② **唯一高亮可撤销** + 撤销后零残留；③ **拾取期间命令发送计数 = 0**；④ Alt 拖动**落点 / 未落点两路径**；⑤ **右键三退让**；⑥ 气泡出现 + ≥1 动作候选 + 1.8s 淡出；⑦ **双向同序号**（chip ↔ 角标）+ 双向 hover；⑧ **宿主交互零影响**（点击 / 拖动 / 输入 / 选区在宿主 fixture 上行为不变）；⑨ **手势表条目数双向相等**（= 6，不多列）；⑩ 注入失败降级可读（风险位明示 + 入口禁用）。**确定性夹具**（无网络、无定时器依赖）+ `waitFor` 带超时与可读失败原因；**flake 若出现如实登记**并加确定性等待（**不掩盖**）。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| NEW | `packages/web-cli-plugin/test/ui/page-input.mjs` |
| MODIFY | `packages/web-cli-plugin/package.json`（追加 `test:page-input`；`test:v3` 追加） |

**验收标准**:
- [ ] ①~⑩ 全部断言落地；缺任一项即 FAIL
- [ ] 拾取期间命令发送计数 = 0（监听既有消息通道）
- [ ] 宿主交互零影响（点击 / 拖动 / 输入 / 选区四类）
- [ ] 手势表条目数 = 6 且与实现集合相等
- [ ] 确定性夹具（无网络/定时器依赖）；`waitFor` 带超时与可读失败原因
- [ ] 单 Chromium 实例；日志全量 `tee` 落盘禁 tail；不触碰既有 4 个 `test/ui/*.mjs`
- [ ] flake（若有）**如实登记**，不掩盖

**验证命令**:
```bash
cd packages/web-cli-plugin && npm run test:page-input 2>&1 | tee /tmp/opencode/v3-gate-logs/page-input.log
```

---

### TASK-412: 既有 `binding.mjs` 页面侧条目同编号最小改写 + 台账追加
> 取代面控制（`#21*` / `#22*` 字节零改）

| 属性 | 值 |
|-----|-----|
| **复杂度** | M |
| **前置依赖** | TASK-409 |
| **执行波次** | Wave 6 |
| **对应 FR / AC / ADR** | FR-V3-004 · NFR-V3-014 · AC-V3-011 / AC-V3-012 · EC-V3-013 · ADR-V3-007 · ADR-V3-036 |

**描述**: ① `test/ui/binding.mjs`——页面侧相关条目**编号不变**，必要时插入「前置条件」（如先打开面板使其在场 / 先进入拾取态）；逐条进台账（`oldId == newId`，`reason` 具体）。**`#21*` / `#22*` 区域字节零改**。**tree 相关条目归 v3-3 处理，本叶不改**（避免两叶同时改同一区域）；若本叶发现必须改 → **先在台账登记 + 回报编排器**，**不改动 `#21*`/`#22*` 区域**。② 新增断言落新文件（计数只增）：`test/ui/page-input.mjs` / `test/ui/zero-injection.mjs` / `test/ref-capture.test.ts` / `test/pick-layer-budget.test.ts`（前二者已由 TASK-409 / 410 建立，本条只做台账登记）。③ `docs/v3-supersession-ledger.json` **追加**本叶 `entries[]`；**不改 schema / 不改他叶条目**；`counts.binding.currentRuntime ≥ 192` 与 union 口径（insight）保持不变。④ 安全断言**只增**：新增「未授权零注入（反证）」「拾取期间命令发送 = 0」「picker 不产生判定路径」三条；**不删**任何既有安全断言。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/web-cli-plugin/test/ui/binding.mjs`（页面侧相关条目同编号最小改写；`#21*`/`#22*` 字节零改） |
| MODIFY | `packages/web-cli-plugin/docs/v3-supersession-ledger.json`（仅追加本叶 `entries[]`） |

**验收标准**:
- [ ] `binding.mjs` 的 `#21*`/`#22*` 区段字节 hash **不变**；断言计数 **≥192**
- [ ] 改写条目 `oldId == newId` 且 `reason` 具体；台账**只追加**（schema 与他叶条目不动）
- [ ] 新增三条安全断言（零注入反证 / 拾取零命令 / picker 不产生判定路径）**落地且不弱化既有断言**
- [ ] union 口径（insight）与 `counts.binding` 下界满足；`npm run test:supersession` 通过
- [ ] tree 相关条目**未在本叶改动**（归属 v3-3）

**验证命令**:
```bash
cd packages/web-cli-plugin && npm run test:supersession 2>&1 | tee /tmp/opencode/v3-gate-logs/supersession-v34.log
git diff --numstat -- test/ui/binding.mjs docs/v3-supersession-ledger.json
```

---

### TASK-413: `sidepanel.js` 体积核对 + 显式重登记（**条件触发**）
> 显式任务：触发时必须走完整披露流程，**禁止**静默放宽容差

| 属性 | 值 |
|-----|-----|
| **复杂度** | S |
| **前置依赖** | TASK-409, TASK-412 |
| **执行波次** | Wave 7 |
| **对应 FR / AC / ADR** | NFR-V3-005 · AC-V3-015 / AC-V3-016 · EC-V3-012 · ADR-V3-011 |

**描述**: 核对 `dist/sidepanel.js` ≤ ceiling **279,825 B**（基线 266,500，容差 5%）。本叶新增引用 chip / 角标联动侧逻辑会增重（预估 `+3~5 KB`）。**若超 ceiling**，**在本叶内**完成显式重登记：`SIDEPANEL_BASELINE_BYTES` 更新为新实测值；旧值**必须**加入 `SIDEPANEL_BASELINE_BYTES_HISTORY`；`SIDEPANEL_BASELINE_META` 补全 `measuredOn` / `source` / `buildCommand` / `measuredBy`（`v3-4 + 轮次`）/ `previousBaselineBytes` / `previousCeilingBytes` / `direction`（`raised` 时写明**有意增重的功能理由**）/ `reRegisteredFrom`；**容差 5% 不变**；`targetBudgetBytes` / `targetMet` **保持 `null`**；**断言零删减**；反证（+1 B → FAIL）在**新值上重新驱动**并留日志。若未超 → 零改动并登记「未触发」。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| MODIFY（**条件触发**） | `packages/web-cli-plugin/test/size-baseline.ts`（`SIDEPANEL_*` 段） |

**验收标准**:
- [ ] `sidepanel.js` 实测值与 ceiling 比较结果如实记录
- [ ] 若触发：五要素齐备（前后值 + 日期 + 来源 + 理由 + `_HISTORY`）；`_META` 8 字段补全
- [ ] 容差 5% 不变；`targetBudgetBytes` / `targetMet` 保持 `null`；断言零删减
- [ ] 反证（+1 B → FAIL）在新值上**重新驱动**并留完整日志
- [ ] **不得**与 `pick-layer.js` 的 `PICK_LAYER_*`（TASK-411）混淆或合并计数
- [ ] 本叶内完成（EC-V3-013）

**验证命令**:
```bash
cd packages/web-cli-plugin && npm run build && node -e "const fs=require('fs');for(const f of ['content','sidepanel','pick-layer']){const p='dist/'+f+'.js';console.log(p,fs.statSync(p).size)};const s=fs.statSync('dist/sidepanel.js').size;if(s>279825)console.error('CEILING EXCEEDED -> 走显式重登记');" | tee /tmp/opencode/v3-gate-logs/size-v34.log
```

---

### TASK-414: **收口：全门禁绿串行验证 + 人工面如实登记**
> AC-V3-013 / NFR-V3-015；本 Feature 最后一叶的收口

| 属性 | 值 |
|-----|-----|
| **复杂度** | M |
| **前置依赖** | TASK-413 |
| **执行波次** | Wave 8（串行收口） |
| **对应 FR / AC / ADR** | FR-V3-003 / FR-V3-086 / FR-V3-087 · NFR-V3-012 / NFR-V3-014 / NFR-V3-015 · AC-V3-013 / AC-V3-024 / AC-V3-025 / AC-V3-027 · EC-V3-013 · ADR-V3-010 |

**描述**: 严格串行跑完本叶全部门禁（一次只跑一个，`&&` 串联，日志全量 `tee` 落盘）。**特定项**：① 页面侧门禁（`test:page-input` / `test:zero-injection`）与既有 5 个 Chromium 门禁**一次只跑一个**；② 体积三线核对（`content.js` ≤177,076 无容差 / `sidepanel.js` ≤ceiling / `pick-layer.js` ≤独立上限）+ **RP-V3-06 的 `pick-layer.js` 段实跑**；③ `CONTENT_SOURCE_SHA256` **三项 pin 不变**；④ 零改动核对（`manifest.json` / `src/security/**` / 冻结三文件 / `packages/web-cli-base/**` / `options.html` / `design/**` 零 diff + `manifest.json` **无 `contextMenus`**）；⑤ **人工面如实登记为「未执行」**（拾取观感 / 拖动体感 / 右键菜单观感 / 真实宿主兼容 / 多显示器 / 高 DPI），**不得冒充 PASS**；⑥ 输出收口结论（含每门禁实测断言数 vs 下界 + 体积三线实测值）。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| NEW | `/tmp/opencode/v3-gate-logs/*.log`（15 步串行门禁全量日志，不入版本库） |

**验收标准**:
- [ ] 全门禁绿（§4.1 顺序，逐条串行）；日志完整落盘、禁 tail 截断
- [ ] 断言计数 ≥ 下界：journey ≥167 / insight union ≥108 / binding **≥192** / `sidepanel-view` ≥38 / node ≥646
- [ ] 体积三线：`content.js` ≤177,076（无容差）/ `sidepanel.js` ≤ceiling / `pick-layer.js` ≤独立上限；**RP-V3-06** 两段（content 段在 v3-1、pick-layer 段在本叶）日志齐备
- [ ] `CONTENT_SOURCE_SHA256` **三项 pin 不变**；`manifest.json` 零 diff 且**无 `contextMenus`**
- [ ] 零改动核对全部通过（6 类文件零 diff）
- [ ] 人工面逐项标注「未执行 / PASS」
- [ ] 收口结论含体积三线实测值与各门禁断言数
- [ ] **AC-CONV-1 / AC-CONV-2 门禁绿**（TASK-415：真实 env 注入点存在且被生产路径调用 + 唯一动作入口调用 `dispatchRefAction`）；未接线 ⇒ **不得收口**

**验证命令**:
```bash
cd packages/web-cli-plugin && bash -c '
set -e
run(){ echo "=== $1 ==="; eval "$2" 2>&1 | tee /tmp/opencode/v3-gate-logs/$1.log; }
run typecheck "npm run typecheck"
run build "npm run build"
run npm-test "npm test"
run supersession "npm run test:supersession"
run zero-injection "npm run test:zero-injection"
run page-input "npm run test:page-input"
run density "npm run test:density"
run l0 "npm run test:l0"
run l1 "npm run test:l1"
run l2 "npm run test:l2"
run ui "npm run test:ui"
run insight "npm run test:insight"
run binding "npm run test:binding"
run hardening "npm run test:hardening"
run e2e "npm run test:e2e"
echo ALL-GREEN
'
```

---

### TASK-415: **引用能力生产接线（N-06 收敛，硬性）**
> AC-CONV-1 / AC-CONV-2（本叶 `spec.md` §7.1，v1.1 追加）；来源 = v3-2 `validate-report.md` R1 §5.1 **N-06**

| 属性 | 值 |
|-----|-----|
| **复杂度** | M |
| **前置依赖** | TASK-407（四项交互接线 —— 页面侧捕获回调就位后才有真实事实可注入） |
| **执行波次** | Wave 7（与体积核对同波；**TASK-413 依赖本任务**） |
| **对应 FR / AC / ADR** | FR-V3-036 / FR-V3-037（父）· **AC-CONV-1 / AC-CONV-2**（本叶 §7.1）· AC-V3-023 · NFR-V3-012 / NFR-V3-014 |

**描述**: v3-2 交付了判定纯函数 + 状态机 + 呈现，但 `setEnv` / `dispatchRefAction` 的**唯一调用点都在 `installV3TestHooks()` 测试 seam 内** ⇒ 生产路径既不注入页面侧事实、也没有「用引用发起动作」的入口（线上引用恒 `unknown`，方向安全但**未被真实覆盖**）。本任务把引用能力**接线到生产**，两件都必须做：

1. **真实 env 注入点（AC-CONV-1）**：在生产路径（SW / 侧栏消息处理 / 导航与授权变更 / SW 恢复）把 `currentOrigin` / `authorized` / `documentId` / `navSeq` / 声明 `hash`(±`version`) 注入 v3-2 判定入口（`l1.setEnv` 或等价契约）。**测试 seam 内的注入不算接线**（门禁须断言 `setEnv` 的调用点不止 `installV3TestHooks()`）。
2. **唯一动作入口走 guard（AC-CONV-2）**：由引用发起动作的**唯一**入口调用 v3-2 `dispatchRefAction`（首句 `isRefUsable`）；不得直接 `store.dispatch`、不得绕过判定发命令；页面侧拾取 / 捕获回调**只上报事实**，不产出判定。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/web-cli-plugin/src/ui/sidepanel/sidepanel.ts`（生产 env 注入 + 唯一动作入口；**替换**而非并列第二套实现） |
| MODIFY | `packages/web-cli-plugin/src/background/service-worker.ts` / `messaging.ts`（导航 / 授权变更 / SW 恢复时的 env 更新消息，如需） |
| NEW | `packages/web-cli-plugin/test/ref-wiring.test.ts`（调用点唯一性 + 生产路径注入的 node 级断言） |
| MODIFY | `packages/web-cli-plugin/test/ui/page-input.mjs`（运行时断言：缺字段 ⇒ `unknown` 阻断；观测匹配 ⇒ `valid` 放行；绕过 guard 直发 ⇒ FAIL） |

**验收标准**:
- [ ] **AC-CONV-1**：生产路径存在真实 env 注入点；`setEnv` 调用点**不止** `installV3TestHooks()`（全仓调用点断言，可 FAIL）
- [ ] **AC-CONV-1**：缺任一必需字段 ⇒ 引用 `unknown` 且被阻断；字段齐备 + 观测匹配 ⇒ `valid`（运行时断言，两类都必须实跑）
- [ ] **AC-CONV-2**：唯一动作入口调用 `dispatchRefAction`（guard 首句）；全仓唯一调用点断言 + 失效态穷举控件 ⇒ 命令发送计数增量恒 0
- [ ] **AC-CONV-2**：绕过 guard 直接发送的注入形态 ⇒ 门禁 **FAIL**（反证实跑、日志留原文）
- [ ] 断言只增不减；计数对照（journey/insight/binding/sidepanel-view/node）不减

**验证命令**:
```bash
cd packages/web-cli-plugin && npm run typecheck && node --test dist-test/test/ref-wiring.test.js && npm run test:page-input
```

---

## 3. 任务汇总

| 统计项 | 数值 |
|--------|:--:|
| 总任务数 | **15**（v1.1 追加 TASK-415） |
| S 级 (简单) | 2（406 / 413） |
| M 级 (中等) | 12（401 / 402 / 403 / 404 / 405 / 408 / 409 / 410 / 411 / 412 / 414 / **415**） |
| L 级 (复杂) | 1（**407** 集成核心） |
| 执行波次 | **8** |

### 3.1 需求条目 → 任务映射

| 需求 | 承载任务 |
|------|---------|
| FR-V3-060（四项交互齐备） | TASK-404 / 405 / 406 / 407 / 409 |
| FR-V3-061（拾取结果 = 引用 + 选择题） | TASK-407 |
| FR-V3-062（Alt 悬停唯一高亮 / 可撤销 / 零命令） | TASK-405 / 407 / 409 |
| FR-V3-063（Alt 拖动两路径） | TASK-405 / 407 / 409 |
| FR-V3-064（右键自绘 + 零新增权限 + 三退让） | TASK-406 / 407 / 409 |
| FR-V3-065（拖选气泡） | TASK-405 / 407 / 409 |
| FR-V3-066（双向联动同序号） | TASK-405 / 407 / 409 |
| FR-V3-067 / FR-V3-068（按需注入 / 未授权零注入） | TASK-401 / 403 / 410 |
| FR-V3-069（宿主污染可读 / 不吞事件） | TASK-404 / 405 / 409 |
| FR-V3-070（手势表双向一致 6 项） | TASK-408 / 409 |
| FR-V3-071（引用 id 四处一致） | TASK-402 / 407 |
| FR-V3-072（零新增权限 / 不扩 host_permissions） | TASK-403 / 406 / 410 / 414 |
| NFR-V3-003 / 004（`content.js` 冻结 / 按需注入） | TASK-401 / 403 / 411 / 414 |
| NFR-V3-005（`sidepanel.js` 体积） | TASK-413 |
| NFR-V3-006 / 007（零新增权限 / 登记式零注入） | TASK-406 / 410 |
| NFR-V3-012 / 013 / 014（串行 / 能真 FAIL / 计数不减） | TASK-410 / 411 / 412 / 414 |
| AC-V3-015 / 016（体积） | TASK-411 / 413 / 414 |
| AC-V3-017 / 018（权限 / 零注入） | TASK-410 / 414 |
| AC-V3-022 / 023（页面即输入 / 引用失效） | TASK-409 |
| AC-V3-013 / 024 / 025 / 027（全绿 / 日志 / 人工面 / 不做项） | TASK-414 |
| **FR-V3-036 / FR-V3-037 生产接线（N-06 收敛：AC-CONV-1 真实 env 注入点 / AC-CONV-2 唯一动作入口走 guard）** | **TASK-415** |

### 3.2 交付门槛矩阵（本叶）

| 门禁 | 命令 | 承载任务 | 断言要点 |
|------|------|:--:|------|
| **spike（前置）** | `/tmp/opencode/v3-spike/spike.mjs` | **401** | S1~S4 全过；否则 D1/D2 降级 + 回报编排器 |
| 类型 / 单测 | `npm run typecheck` / `npm test` | 402 / 411 / 410 | 0 error；`ref-capture` / `pick-layer-budget` / `zero-injection` 全绿 |
| 零注入（Chromium + node） | `npm run test:zero-injection` | 410 | 未授权七项全无 + 反证 FAIL |
| 页面即输入（Chromium） | `npm run test:page-input` | 409 | 四项交互 + 三退让 + 零命令 + 双向同序号 + 宿主零影响 + 手势 6 项 |
| 体积（三线） | `size-baseline` / `pick-layer-budget.test.ts` | 411 / 413 / 414 | `content.js` ≤177,076；`sidepanel.js` ≤ceiling；`pick-layer.js` ≤独立上限（+1B → FAIL） |
| 台账 | `npm run test:supersession` | 412 | `#21*`/`#22*` hash 不变；hunk 全命中；union ≥108 |
| 既有门禁 | `test:ui` / `test:insight` / `test:binding` / `test:hardening` / `test:e2e` | 414 | ≥167 / union ≥108 / ≥192 / 24 / PASS |
| 零改动 | `git diff --numstat` | 414 | `manifest.json` / `src/security/**` / 冻结三文件 / `base` / `options.html` / `design/**` 零 diff |
| **引用生产接线（N-06）** | `npm run test:page-input` + `node --test dist-test/test/ref-wiring.test.js` | **415** | AC-CONV-1/2：真实 env 注入点存在、唯一动作入口走 `dispatchRefAction`、缺字段 ⇒ 阻断、绕过 guard ⇒ FAIL |

### 3.3 断言只增不减（具体保证方式）

| 保证 | 方式 |
|------|------|
| 新断言落**新文件** | `test/ui/page-input.mjs` / `test/ui/zero-injection.mjs` / `test/ref-capture.test.ts` / `test/pick-layer-budget.test.ts` |
| 既有门禁零删除 | `binding.mjs` 页面侧条目**同编号最小改写**；删除行必须命中台账 |
| 受保护区域 | `#21*`/`#22*` 用**字节区间 hash** pin（未被本叶改动） |
| 计数下界 | journey ≥167 / insight union ≥108 / binding ≥192 / sidepanelView ≥38 / node ≥646 |
| 安全断言只增 | 未授权零注入（反证）+ 拾取期间命令发送 = 0 + picker 不产生判定路径 |
| 体积守线 | `content.js` 无容差（字节不变）+ `pick-layer.js` 独立上限（无容差）+ 二者**不合并计数** |

---

## 4. 执行策略

### 4.1 **spike 门槛（硬前置）**

```
TASK-401 spike  ── S1 注入可行 ──┐
                  S2 体积 ≤60,000 B ──┤  四条全过 → 放行 Wave 2（实现）
                  S3 零注入可验证 ──┤  任一条不过 → 走 D1（形态降级）→ 仍不过 → D2（范围降级 + 回报编排器）
                  S4 三退让可实现 ──┘   ⚠️ 禁止：并入 content.js / 放宽 CONTENT_MAX_BYTES / 引入 contextMenus / 静态注入 / 更新三 hash pin
```

- **未过怎么办**：**不得进入 Wave 2~8 的任何实现任务**（ADR-V3-035 第 5 条）。
  - **D1（形态降级）**：采用方案 C（第二个**登记式** content script，`registerSiteContentScript` 的 `js` 追加 `pick-layer.js`）→ 仍不改 `content.js` 字节、仍满足未授权零注入 → **显式登记取舍 + 回报编排器**。
  - **D2（范围降级）**：若 D1 也不可行 → **不自行扩权 / 不放宽上限**，把结论与实测数据**回报编排器**，由编排器裁决是否缩小本叶范围（如仅保留「拖选文本气泡 + 右键引用」两项或推迟）。
- **spike 结论**（通过 / 不通过 + 实测值）写入 build 报告，并作为 `PICK_LAYER_BASELINE_BYTES` 的**来源依据**（TASK-411）。

### 4.2 门禁串行纪律（**一次只跑一个**）

> 本机 ~1.5GB、曾 OOM（R3-10 / R34-10）。**任何两个 Chromium 门禁绝不并发**；日志 `tee` 到 `/tmp/opencode/v3-gate-logs/<gate>.log`，**禁 tail 截断**。

**严格串行顺序**：

```
① npm run typecheck
② npm run build
③ npm test                            ← Node 单测（ref-capture / pick-layer-budget / zero-injection 等）
④ npm run test:supersession
⑤ npm run test:zero-injection         ← Chromium（未授权零注入 + 反证）
⑥ npm run test:page-input             ← Chromium（页面即输入）
⑦ npm run test:density                ← Chromium（拾取/联动后密度不回归）
⑧ npm run test:l0 / test:l1 / test:l2 ← Chromium（逐条，一次一个）
⑨ npm run test:ui                     ← Chromium（journey ≥167）
⑩ npm run test:insight                ← Chromium（union ≥108）
⑪ npm run test:binding                ← Chromium（≥192）
⑫ npm run test:hardening              ← Chromium（24）
⑬ npm run test:e2e                    ← Chromium（全链路）
⑭ 体积三线核对 + 反证（RP-V3-06 的 pick-layer.js 段实跑）
⑮ 零改动核对（含 manifest 无 contextMenus）
```

### 4.3 文件所有权（防并行冲突）

| 文件 | 唯一所有者（本叶） |
|------|------|
| `/tmp/opencode/v3-spike/**` | TASK-401（临时，不入版本库） |
| `src/content/ref-capture.ts` + `test/ref-capture.test.ts` | TASK-402 |
| `build.mjs` / `src/background/messaging.ts` / `src/background/service-worker.ts` | TASK-403 |
| `src/content/pick-layer.ts` / `pick-bridge.ts` | TASK-404（407 / 408 追加） |
| `src/content/pick-overlay.ts` | TASK-405（408 追加） |
| `src/content/pick-menu.ts` | TASK-406 |
| `src/ui/sidepanel/sidepanel.ts` / `l1/panels.ts` / `index.html` | TASK-407（408 追加） |
| `test/ui/zero-injection.mjs` / `test/zero-injection.test.ts` | TASK-410 |
| `test/pick-layer-budget.test.ts` + `test/size-baseline.ts`（`PICK_LAYER_*`） | TASK-411 |
| `test/ui/page-input.mjs` | TASK-409 |
| `test/ui/binding.mjs` + `docs/v3-supersession-ledger.json` | TASK-412 |
| `test/size-baseline.ts`（`SIDEPANEL_*`） | TASK-413 |
| `package.json`（scripts 段） | TASK-410 / 409（只追加，不删既有 script） |

### 4.4 体积 / 取代 / 冻结纪律

1. **`content.js` 无容差不可重登记**：冻结三文件**字节零改**；`dist/content.js` 必须仍 = **177,076 B**；`CONTENT_SOURCE_SHA256` **三项 pin 不变**；`CONTENT_MAX_BYTES` **禁止**修改。
2. **`pick-layer.js` 新 artifact 独立硬上限**：`PICK_LAYER_BASELINE_BYTES` = 首轮实测值（无容差）；**不与 `content.js` 合并计数**；超限**只能改实现**。
3. **`sidepanel.js` 条件重登记**：TASK-413 的 4 条披露要求（前后值 / 日期 / 来源 / 理由 / 历史保留 + 容差 5% 不变 + `null` 保持 + 断言零删减 + 反证复跑）。
4. **台账只追加**：本叶 `entries[]` 只追加；`#21*`/`#22*` 字节零改（hash pin 证明）；tree 相关条目**不在本叶改**（归 v3-3）。
5. **「按需」语义边界（显式登记）**：不打进常驻 `content.js` ∧ 未授权站点零注入 ∧ 面板在场期间才注入 ∧ 面板关闭即卸载。**代价如实登记**：若侧栏从未打开 → 页面**不**拦截右键（交回原生菜单）。
6. **失败不静默**：注入失败 → 风险位明示「页面侧不可用（原因）」+ 拾取入口禁用；flake 如实登记不掩盖。

---

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.1 | **追加**（历史保留：v1.0 原文未改）：承接 v3-2 收口轮的 validate R1 **N-06** —— 红线表增第 6 条；新增 **TASK-415「引用能力生产接线（N-06 收敛，硬性）」**（Wave 7，dep 407；**AC-CONV-1 真实 env 注入点 / AC-CONV-2 唯一动作入口走 `dispatchRefAction` guard**）；TASK-413 依赖追加 415；TASK-414 收口清单追加 AC-CONV 门禁项；§3.1 / §3.2 追加映射；任务总数 14 → **15**。 | 2026-09-16 | SDDU Build Agent（v3-2 收口轮） |
| v1.0 | 初始创建：V3-4 任务分解（14 任务 / 8 波；S×2 / M×11 / L×1）。**覆盖编排器必含项**：①**先跑 A-UI-004 spike（S1~S4）为 Wave 1 硬前置**——**spike 未过不得进入实现**，失败走 D1（形态降级 = 第二个登记式 content script）/ D2（范围降级 + 回报编排器），红线为**不放宽 `CONTENT_MAX_BYTES` / 不引入 `contextMenus` / 不静态注入 / 不更新三 hash pin**；②**第 5 bundle `dist/pick-layer.js`（独立无容差上限 + 基线登记 + 反证 + 不合并计数）**；③双触发 / 幂等 / teardown 自卸载 / 失败降级；④右键自绘菜单路线 1 + **三退让** + `role="menu"` 键盘；⑤Shadow DOM 双向隔离 + 宿主事件不吞五规则；⑥引用捕获共享口径（稳定优先语义路径 + `data-wcli-ref` + 截断 80/120）；⑦四项交互 + **双向高亮联动（P4）** + **执行可视化（P5）** + G1/G2 + 手势表 6 项双向相等；⑧**未授权零注入门禁（含反证）**；⑨`binding.mjs` 页面侧条目同编号最小改写（`#21*`/`#22*` 字节零改）。**门禁严格串行**（15 步链式，一次一个）。**只做 tasks**：未写代码、未改 `src/**`·`test/**`·`manifest.json`·`design/**`·`ROADMAP.md`、未动 `main`、未 commit、**未跑门禁/构建/Chromium**。 | 2026-09-16 | SDDU Tasks Agent |
