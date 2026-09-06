# 技术计划：specs-tree-web-cli-base-v3（web-cli-base v3：AI 操作浏览器的完整工具集——五层 DOM/UI 全谱补齐 + 子命令级权限分级 + evaluate 最高门禁）

> **文档定位**: SDDU 技术方案 — 记录架构设计、方案对比和 ADR，作为 tasks 阶段的输入
> **前置依赖**: spec.md v1.1（45 FR 九组 + 8 NFR + 14 EC + 12 AC，已冻结）+ discovery.md v1.0（§3.3 五层映射 ≈34 缺口）+ 作者裁决（R-01~R-05 + I-01~I-08 全部采纳 S-01~S-08，2026-09-06）+ 上游 v2 产物（plan.md 8 ADR / platform.ts / dom-tools.ts / permission.ts / validate-report.md）
> **创建人**: SDDU Plan Agent
> **创建时间**: 2026-09-06
> **版本**: v1.0
> **更新人**: SDDU Plan Agent
> **更新时间**: 2026-09-06
> **更新说明**: 初始创建（45 FR → 模块/方法/工具面映射；子命令级 risk 模型 + evaluate 最高档落地为 router/permission 扩展；PlatformDomOps additive 扩展 + browserEnv 桩补真 + 五新工具模块；8 个 ADR；波次任务交接）

## 1. 前置检查
> 启动技术规划前必须验证的前置条件

| 检查项 | 状态 |
|--------|:--:|
| spec.md 存在（`.sddu/specs-tree-root/specs-tree-web-cli-base-v3/spec.md` v1.1 冻结，45 FR） | ✅ |
| 外部 API 文档缓存 | ✅ 不适用（本 Feature 零外部服务引用：全部依赖浏览器 Web 标准 API，无第三方 API 需缓存） |
| 前置依赖已满足（v2 代码位 `feature/web-cli-base-v2`：dom-tools.ts / platform.ts / permission.ts / router.ts / session.ts / App.tsx 已核实；state.json phase=specified） | ✅ |
| 开放点状态（spec §9.1：O-001/O-002/O-009/O-010 已裁 + I-01~I-08 已全部采纳 S-01~S-08 → 本 plan 无 spec 级待决项） | ✅ |

---

## 2. 架构分析
> 分析现有架构影响和需要的新组件

### 2.1 现状基线（v2 后，代码事实已核实）

```
packages/web-cli-base/src/          （domain-neutral，零 lgdl/react 依赖 NFR-001）
  dom-tools.ts    dom 工具：DomSubcommand 7 值 + SUBCOMMANDS 枚举（:22-24）
                  DOM_SCHEMA flat args（:93-113）；entry risk:'ui' group:'ui'
                  executor：SUBCOMMANDS.includes → env.dom.ops 同名方法（:27-83）
  platform.ts     PlatformDomOps 7 方法（:86-101，全 required）
                  browserEnv domOps：readState/click/snapshot 真实（snapshot=innerText
                  slice 20k :474-478）；hover/scroll/zoom/fullscreen = 抛 NotFoundError
                  转译桩（:461-473）；nodeEnv dom.ops 7 方法全抛桩（:285-294）
                  PlatformEnv [k:string]:unknown 自由扩展位（:161）
  permission.ts   PermissionGate 裁决管线（:208-294）：①allowed-tools ②三元组规则
                  （PolicyRule pattern/group/namespace/risk，:33-45）③策略对象
                  （StrategyCheckContext 已含 subcommand :67-75）④缺省取向
                  defaultActionForRisk：read/无→allow，其余→ask（:151-153）
                  AskQuestion 已含 subcommand 字段（:78-86）
  router.ts       dispatch 五步链（:519-586）：查条目→enabled→policyGate.check
                  （传入 e.risk + tc.subcommand :531-543）→delay→executor→审计
                  ToolEntry.risk 单值（:84-85）；audit permission 事件无 subcommand
  eval-tools.ts   eval-js/eval-wasm：worker 执行器注入（无 DOM 面）+ risk:'write'
                  + --trusted true 显式声明（untrusted 缺省拒）——NG-010 语义
  save-file.ts / notify.ts / clipboard.ts  工厂已建（save/download 两路径、
                  notify send、clipboard read/write），未入 lgdl-web 矩阵
  audit.ts / session-store.ts / …（v2 既有面，v3 不触碰主体）

packages/lgdl-web/src/ai/
  session.ts      唯一组装点：P0 matrix + P1 域注册（dom/eval-js(禁用)/… :178-188）
  App.tsx         aiPolicy = { rules:[{risk:'ui', action:'ask'}] }（:951-958）
                  → dom 全工具（含只读 read-state/snapshot）都触发 ask = v2 IMP-4 根因
```

**v3 缺口再确认（spec §2.1 直接引用）**：L1 只有页级文本快照；L2 4 转译桩 + 4 缺 + 键盘全缺；L3 截图/打印/导航缺 + save/notify/clipboard 未接线；L4 写入族/evaluate 全缺；L5 采集整段空缺；横切缺 wait；dom 工具级 risk 覆盖只读子命令（IMP-4）。

### 2.2 目标架构分层（v3 模块划分）

```
┌────────────────────────────────────────────────────────────────────┐
│ lgdl-web 场景壳（React UI；base 零 UI 纪律延续 NG-008）               │
│   ai/session.ts    默认矩阵扩展：dom(27 子命令) + chrome + wait +     │
│                    extract/export(共享 CollectBuffer) + page-eval    │
│                    （默认禁用）+ save/notify/clipboard 接线；env/     │
│                    policy/审计 装配点不变（顺序扩展）                  │
│   App.tsx          aiPolicy 子命令级规则扩展（IMP-4 修复 + chrome     │
│                    back/forward 免 ask + page-eval 门禁缺省）         │
│   AskDialog.tsx    ask 呈现扩展：子命令名/risk + page-eval 代码摘要    │
├────────────────────────────────────────────────────────────────────┤
│ web-cli-base —— 机制层（additive 扩展，零回归红线 FR-001/002）         │
│   router.ts        子命令级 risk 解析：ToolEntry.subcommandRisks +    │
│                    dispatch effectiveRisk（evaluate 无策略 fail-closed）│
│   permission.ts    ToolRisk 新增 'evaluate'（default deny）；          │
│                    PolicyRule.subcommand 过滤面（glob，与既有过滤正交） │
├────────────────────────────────────────────────────────────────────┤
│ web-cli-base —— DOM 域工具层（v3 主体；每模块 = 工厂 + executor +      │
│                   schema + help + subcommandRisks）                   │
│   DOM  dom-tools.ts(M)   dom 工具 7→27 子命令（PER6+INT13+WR8）        │
│        locator.ts(N)     CSS 基线 + text= 语法面解析（纯逻辑，node 可测）│
│        sensitive.ts(N)   敏感字段分类/脱敏（password/凭据启发式）       │
│        platform-dom.ts(N) browserEnv 真实 PlatformDomOps 实现工厂     │
│                          （4 桩补真 + ~24 新 ops；DOM 触碰全在此，     │
│                           base 其余零 document 假设）                  │
│   WT   wait-tools.ts(N)  wait 工具（MutationObserver + 轮询 + 超时）   │
│   CHR  chrome-tools.ts(N) chrome 工具（print/back/forward/reload/     │
│                          screenshot；back/forward 免 ask 规则面）      │
│   WR   page-eval.ts(N)   page-eval 工具（宿主页 DOM 上下文执行 +       │
│                          最高档门禁 evaluate + untrusted 拒）          │
│   COL  collect.ts(N)     CollectBuffer（采集缓冲区：rows/meta/护栏/    │
│                          trust，session 内存态）                       │
│        collect-tools.ts(N) extract + export 工具（声明式抽取 /         │
│                          text·json·csv 类型化序列化 + save 链）        │
└────────────────────────────────────────────────────────────────────┘
依赖方向（不变，单向无环 NFR-002）：业务包 → base；base 零业务依赖（NFR-001）。
平台能力触碰全部经 PlatformEnv/ops 注入（node 面桩 + 浏览器面真实实现双轨 NFR-005）。
```

**分层原则**：机制层零浏览器 import 假设；**DOM 触碰收敛到 platform-dom.ts 单一文件**（browserEnv 专用实现工厂），base 其余模块只经 ops 接口 + 纯逻辑工具（locator/sensitive/collect 序列化/csv 转义）与 DOM 解耦 → node 注入桩可全链单测、浏览器真实行为由 validate 冒烟（V13 方法扩展）。

### 2.3 扩展接口（本 plan 核心，FR-001/002 additive 红线）

#### 2.3.1 ToolEntry 子命令级 risk（FR-005/006/008，修复 IMP-4）

```ts
// router.ts ToolEntry 追加（缺省 = 行为与 v2 完全一致）：
subcommandRisks?: Record<string, ToolRisk>;  // 子命令 → risk；缺省回退 entry.risk
// dispatch 计算 effectiveRisk = subcommandRisks?.[tc.subcommand] ?? entry.risk，
// 传入 PermissionGate.check 的 input.risk（替换现 e.risk 直传）；
// ★ fail-closed：effectiveRisk === 'evaluate' 且 policyGate 未装配 → 直接 deny
//   （返回「page-eval 需场景策略显式开启 + 门禁装配」，执行器不被调用）
// ★ 审计 permission 事件追加 subcommand 字段（NFR-008）

// permission.ts
export type ToolRisk = 'read' | 'write' | 'external' | 'ui' | 'state' | 'evaluate';
export function defaultActionForRisk(risk?: ToolRisk): PolicyAction {
  // read/无 → allow；evaluate → 'deny'（最高档：无策略不得静默 allow）；其余 → ask
}
// PolicyRule 追加（与 pattern/group/namespace/risk 正交，缺省不限）：
subcommand?: string;   // glob 匹配（* 任意串、? 单字符）
// ruleMatches 增加 subcommand 过滤（input 含 subcommand）
```

规则匹配与缺省取向均改用 **effectiveRisk** → v2 lgdl-web 规则 `{risk:'ui', action:'ask'}` 从「锁死整个 dom 工具」变为「只锁 UI 副作用子命令」，只读子命令落缺省 allow = IMP-4 修复语义（FR-007）。

#### 2.3.2 PlatformDomOps additive 扩展（FR-002/003；接口加方法，缺省 undefined）

既有 7 方法签名零改动（readState/snapshot 输出升级在浏览器实现内完成）；新增方法**全部可选**（`?`），未注入 → dom executor 返回「该能力在当前环境未注入」可读错误（沿用 dom-tools.ts:32-38 语义），平台代码零编译破坏。`PlatformDomOpResult` 追加可选 `dataUrl?: string`（截图载体，不进 output 大文本）。

| # | 新增方法（全部可选） | 形态 | 对应 FR / dom 子命令或工具 |
|---|---|---|---|
| 1 | `interactives(opts?)` | 元素级 | FR-011 interactives |
| 2 | `readElement(opts)` | 元素级 | FR-012 read-element |
| 3 | `findElements(opts)` | 元素级 | FR-013 find |
| 4 | `readStructure(opts)` | 元素级/页级 | FR-014 structure |
| 5 | `snapshotStructured(opts?)` | 页级 | FR-010 snapshot 结构化段/分页 |
| 6 | `dblclick(selector)` | 交互 | FR-018 dblclick |
| 7 | `contextmenu(selector)` | 交互 | FR-018 contextmenu |
| 8 | `longPress(selector, ms)` | 交互 | FR-019 long-press |
| 9 | `dragDrop(from, to)` | 交互 | FR-019 drag |
| 10 | `focusEl(selector)` / `blurEl(selector)` | 交互 | FR-021 focus/blur |
| 11 | `typeText(selector, text, opts?)` | 键盘/写 | FR-022 type |
| 12 | `pressKey(combo, opts?)` | 键盘 | FR-023 press |
| 13 | `setText(selector, text)` | 写 | FR-031 set-text |
| 14 | `setAttr/removeAttr(selector, name, value?)` | 写 | FR-032 set-attr/remove-attr |
| 15 | `setStyle(selector, opts)` | 写 | FR-033 set-style |
| 16 | `setValue(selector, value)` | 写 | FR-034 set-value |
| 17 | `fillForm(plan)` | 写 | FR-035 fill |
| 18 | `addElement(opts)` / `removeElement(selector)` | 写 | FR-036 add/remove |
| 19 | `waitFor(opts)` | 横切 | FR-025 wait 工具 |
| 20 | `evaluate(code, opts)` | F12 等效 | FR-037 page-eval 工具 |
| 21 | `extractData(opts)` | 采集 | FR-038 extract 工具 |
| 22 | `printPage()` | chrome | FR-026 chrome print |
| 23 | `historyNav(delta)` | chrome | FR-027 chrome back/forward |
| 24 | `reloadPage()` | chrome | FR-027 chrome reload |
| 25 | `screenshot(opts)` | chrome | FR-028 chrome screenshot |

既有 click 升级坐标/偏移 = 签名加**可选** `opts?`（`click(selector, opts?: {offsetX?, offsetY?, x?, y?})`），旧调用方零回归（FR-020）。browserEnv 现有 4 桩由 platform-dom.ts 真实实现替换（FR-003/016/017），nodeEnv 新方法不预置（undefined → 禁用/可读错误）。

#### 2.3.3 dom 子命令族 7→27（SUBCOMMANDS 枚举 + DOM_SCHEMA 合并扩展）

```
DomSubcommand（27）：
  [v2 既有 7，顺序保持] read-state | click | hover | scroll | zoom | fullscreen | snapshot
  [PER +4] interactives | read-element | find | structure
  [INT +8] dblclick | contextmenu | long-press | drag | focus | blur | type | press
  [WR  +8] set-text | set-attr | remove-attr | set-style | set-value | fill | add | remove
  （snapshot 升级 = 既有子命令扩展参数，不加新名）
新增独立工具族（不进 dom，语义/门禁分离）：
  chrome（print|back|forward|reload|screenshot）5 子命令 + wait / page-eval / extract / export
  → DOM/UI/采集操作面合计 27+5+4 个命令动词（≈30+ 量级，schema 预算受控 NFR-003）
```

- **subcommandRisks 标注**（PRM 按子命令裁决的单一数据源）：
  - `read`（缺省 allow）：read-state / snapshot / interactives / read-element / find / structure
  - `ui`（缺省 ask）：click / hover / scroll / zoom / fullscreen / dblclick / contextmenu / long-press / drag / focus / blur / press
  - `write`（缺省 ask）：type / set-text / set-attr / remove-attr / set-style / set-value / fill / add / remove
  - chrome：print=`ui`；back/forward=`ui`（场景规则免 ask，EC-009）；reload=`write`（破坏性 ask）；screenshot=`write`
  - wait=`read`；extract=`read`；export=`write`（落盘 ask）；clipboard read=`ui`(敏感 ask) write=`write`；page-eval=`evaluate`（deny 缺省）
  - dom entry.risk 保持 `'ui'`（回退面 = v2 元数据零变化）
- **DOM_SCHEMA**：`subcommand.enum` 扩至 27，`args.properties` 合并扩展（全部可选 flat props：selector/dx/dy/percent/on/offsetX/offsetY/x/y/text/value/name/prop/cssText/classAction/fields/attrs/styles/mode/kind/item/limit/offset/maxLength/structured/include/mapping/submit/ms/from/to/key/mods/clear/combo…），property description 注明归属子命令 → 保持 v2「一个 args 对象」调用形态，AI 经 help/description 选参。
- **DOM_DESC/domHelp** 逐子命令列出用法 + risk 分级说明 + 合成事件局限声明（NG-007）+ 同源边界（NG-002）+ 敏感字段策略（FR-024）。

#### 2.3.4 定位语法面统一（FR-015，S-07 已裁）

`locator.ts` 纯解析器：`css:` 显式前缀（可选）/裸 CSS 串（基线）/`text=精确文本` / `text*=包含文本`（可配 `case`、trim 默认开）→ 结构化 `LocatorQuery`；`role=`/`xpath=` 前缀 → 显式「不支持 + 替代指引」可读错误（**绝不静默当 CSS 解析**，EC-002）。dom 元素级子命令 + extract/fill 统一消费；DOM 侧解析复用（platform-dom import locator，node 侧纯单测）。

#### 2.3.5 采集数据流（FR-038~042，S-05 已裁）

```
extract（声明式 selectors → ops.extractData）
  → CollectBuffer.append(id, rows, meta{url, at, trust:'untrusted'}, cap 护栏)
  → export --format text|json|csv（序列化器：RFC4180 转义 / JSON 元数据头 / xlsx=不支持+指引）
  → env.filePicker.save/download 落盘（手势拒绝 → 下载链降级 EC-012）
buffer 为 base 内存态（session 级，createCollectTools 共享注入）；刷新即失（导出即落盘，
跨刷新恢复 out，v2 jobs 先例）；护栏 = 单次 maxItems + 缓冲总量 + 限速间隔（FR-042）。
```

### 2.4 数据流变更图（v3 增改高亮）

```
【v3 数据流】AI 指令（五层场景）
  lgdl-web AiPanel → session.runAgent → AgentRunner（零改动）
    └ chat(router.deriveTools)  ← schema 现含 dom(27)/chrome/wait/extract/export（save 等）
    └ dispatch(tc, ctx)
        └ CommandRouter.dispatch
            ├ 1 查条目 → 2 enabled（page-eval 缺省禁用 → 显式「已禁用」）
            ├ 3 ★ effectiveRisk = subcommandRisks?.[sub] ?? entry.risk
            │     ★ risk==='evaluate' 且无 policyGate → deny（fail-closed）
            │     └ PermissionGate.check({risk: effectiveRisk, subcommand, …})
            │         ① rules（PolicyRule 增 subcommand 过滤）② strategies ③ allowed-tools
            │         ④ riskDefaults/defaultActionForRisk（evaluate→deny；read→allow；ui/write→ask）
            │         → ask 命中：AskDialog（子命令名/risk + page-eval 代码摘要 FR-044）
            ├ 4 delay gate（保持）→ 5 executor（新模块 executor）
            │    └ ops：dom ops（platform-dom 真实现/桩）| waitFor | evaluate | extractData |
            │        screenshot（dataUrl → 下载链）| filePicker（export/save 落盘）
            └ 6 审计（permission/tool-call 均含 subcommand + evaluate 代码摘要 NFR-008）
   场景状态：CollectBuffer（session 内存）+ v2 各 store（不动）
```

### 2.5 依赖关系与运行时依赖（NFR-001/002）

- v3 新增**零运行时依赖**：MutationObserver/Fullscreen/HTML5 DnD/native setter/canvas/SVG foreignObject/XMLSerializer/csv 转义全为 Web 标准 API；截图/真 xlsx 不引第三方库（NG-005，FR-028 降级出口、FR-041 注入扩展点仅声明不实现）。
- base 新增模块零 lgdl/react import（grep 断言）；platform-dom.ts 是唯一 document 触碰点且经浏览器注入。
- 测试依赖不新增：node 面注入桩单测 + validate 真实浏览器冒烟（chromium V13 方法扩展，NFR-005），维持 v2 P-01 取向。
- 包依赖图不变：lgdl-web → {lgdl-web-cli, lgdl-web-op-cli, web-cli-base}。

### 2.6 波次可拆性（tasks 分波/模块边界，spec §9.4 对齐）

| 波次（spec §9.4） | 模块边界 | FR 锚点 | 依赖先序 |
|---|---|---|---|
| **波 1 P0 = 基座与护栏** | router.ts（subcommandRisks/effectiveRisk/evaluate fail-closed/审计 subcommand）+ permission.ts（evaluate 档 + PolicyRule.subcommand）+ 双模块测试 + 零回归基线 | FR-001~008（BSL+PRM） | 先机制后域；v2 全仓回归每步绿 |
| **波 2 P1 = 五层主体** | locator.ts + sensitive.ts + platform-dom.ts（桩补真 + 全部新 ops 实现）+ dom-tools.ts 扩展（PER/INT/WR）+ dom-tools.test + wait-tools + collect.ts + collect-tools + page-eval + index.ts 导出 + lgdl-web session.ts 矩阵 + App.tsx policy + AskDialog 扩展 | FR-009~025 / FR-031~037 / FR-038~040 / FR-042 / FR-043~045（不含 FR-026~030/041） | 依赖波 1（effectiveRisk/门禁就绪才放写与 evaluate） |
| **波 3 P2 = chrome/接线/边界** | chrome-tools CHR 子命令完整（print/back/forward/reload/screenshot）+ FR-041 excel 边界 + FR-044 ask 呈现完整（save/截图/剪贴板授权提示）+ save/notify/clipboard 入矩阵 + validate 真实浏览器冒烟清单 + v2 收口项基线关联 | FR-026~030 / FR-041 / FR-044 尾项 | 依赖波 2；真实浏览器冒烟逐子命令 |

> 说明：P0/P1/P2 仅定先序不砍域（O-001 已裁一次补齐）；单 Feature 完整表达默认不拆子特性；tasks 按本表拆原子任务即可得独立可验证单元。

---

## 3. 方案对比

> 五个对比主题 = 本 plan 剩余的技术形态决策（spec 已锁范围/方向）

### 3.1 对比主题一：page-eval 安全执行形态（FR-008/037，O-002 已裁范围）

| 维度 | 方案 A：宿主页上下文直接执行 + 最高档门禁（推荐） | 方案 B：同源 iframe 中转执行 | 方案 C：worker 桥执行（复用 eval-js 通道） |
|------|:--|:--|:--|
| 描述 | 在宿主页同源 JS 上下文间接 eval/new Function 执行（等效 F12 console 权限），配 evaluate 最高 risk + untrusted 拒 + ask 审计 | 建隐藏同源 iframe 注入代码经 postMessage 中转 | 在 worker 内执行代码（无 DOM 面） |
| 优点 | 语义 = F12 console（可读写宿主 DOM/存储/调页面函数）；实现最直；DOM 读写在同 realm 零障碍 | 代码运行域与宿主 UI 脚本隔离（异常不串全局） | 可中断/超时强 |
| 缺点 | 同步死循环无法中断（主线程同 realm 平台限制，Chrome DevTools console 同限）；CSP unsafe-eval 缺失时被禁 | **同源 iframe 与父页共享同一 event loop**——死循环同样冻结页面，隔离收益≈0；且 DOM 访问须走 parent 链，语义绕 | worker 无 DOM → 非 F12 等效；与 NG-010「worker 沙箱不混入页面 evaluate」冲突 |
| 风险 | 中（死循环限制必须工程公开，靠门禁+代码预算收敛暴露面） | 高（假隔离 + 复杂度，R-002 假抽象风险） | 高（语义违背 spec 红线 NG-010） |
| 工作量 | ≈2 人日 | ≈3.5 人日 | ≈1.5 人日（但语义错） |

**推荐 A**：唯一满足「宿主页同源 DOM/JS 上下文 + F12 console 等效」的方案（FR-037/NG-010）。同步死循环不可中断为平台硬约束 → 工程公开 + 暴露面收敛（见 ADR-002）。

### 3.2 对比主题二：截图近似方案（FR-028，零依赖约束 NFR-002）

| 维度 | 方案 A：SVG foreignObject 序列化 + canvas 光栅（推荐） | 方案 B：纯 canvas 程序化重绘 | 方案 C：引第三方库（html2canvas） |
|------|:--|:--|:--|
| 描述 | clone 目标子树（含内联样式 + 匹配 CSS 规则复制）→ XMLSerializer → SVG foreignObject → Image → canvas drawImage → PNG dataURL | 按 DOM 结构手写 canvas 绘制器 | 引入 html2canvas 等截图库 |
| 优点 | 零依赖（Web 标准 API）；保真度最好（真实 CSS 布局近似）；元素级精确裁剪 | 零依赖 | 保真度高、维护省心 |
| 缺点 | 近似度声明（外部图片/CSS 变量/滚动态不保真）；CSP/跨源样式读取受限；canvas taint 风险 | 重绘器 ≈ 重写渲染引擎，工作量爆炸且保真最差 | 违反 NFR-002 零新增运行时依赖（需作者 O-004 例外裁决，NG-005） |
| 风险 | 中（真实不可达 → 按 spec 降级 out 出口 FR-028 已备） | 高（成本/保真双输） | 中（依赖面 + 授权例外） |
| 工作量 | ≈3 人日 | ≈6+ 人日 | ≈0.5 人日（+评审/例外流程） |

**推荐 A**：零依赖面达成「近似截图」；元素级/视口级入、整页 out；失败按转译返回 + 可降级 out（S-02/I-02 已裁出口）。

### 3.3 对比主题三：键盘/表单合成事件（FR-022/034/035，React 受控兼容）

| 维度 | 方案 A：native setter + input/change 事件序列 + 字符级事件（推荐） | 方案 B：仅 .value 赋值 + 单 input 事件 | 方案 C：仅原生 KeyboardEvent 派发 |
|------|:--|:--|:--|
| 描述 | 对受控 input：`HTMLInputElement.prototype.value` setter 直设 + 派发 input（React 顶层委托可捕获）；type 模式补字符级 keydown/input/keyup 序列 | 直接赋值 + 一次 input | 逐个派发 KeyboardEvent 不碰 value |
| 优点 | React 受控 onChange 触发（playwright 同源技巧先例）；非受控/原生同样生效；可读性/可测性 | 简单 | 对监听 keydown 的组件有效 |
| 缺点 | 需区分 React 受控 vs 非受控（tracker 检测）；contenteditable 另走 execCommand/文本节点插入 | React 可能不触发 onChange（内部 value tracker 未更新，值被还原） | React onChange 不触发（事件不改变 value） |
| 风险 | 低（EC-006 有兜底 + 写入后回读校验兜底） | 高（React 受控表单 AC-003/006 必达验收失败） | 高（同上） |
| 工作量 | ≈2.5 人日 | ≈0.8 人日（返工） | ≈1 人日（返工） |

**推荐 A**：S-04/I-04 已裁「兼容路径为必达验收」→ native setter 基元（set-value/fill 用）+ 字符级 type（贴近真人键入）双模式；合成事件 isTrusted=false 局限帮助面公开（NG-007）。

### 3.4 对比主题四：wait 条件等待实现（FR-025）

| 维度 | 方案 A：MutationObserver 优先 + 轮询降级（推荐） | 方案 B：纯 setInterval 轮询 | 方案 C：requestAnimationFrame 循环 |
|------|:--|:--|:--|
| 描述 | document 级 MutationObserver（childList/subtree）驱动条件重判；几何/可见类条件 + 降级路径用 interval 轮询；命中即返、超时返最后状态 | 固定 interval 轮询全部条件 | rAF 每帧重判 |
| 优点 | 低开销（NFR-007：观察者驱动不空转）；插入/删除即时命中 | 实现最简、无观察者心智 | 动画/布局类条件每帧最新 |
| 缺点 | 可见性/文本几何条件观察者不直接覆盖（需辅助轮询） | 固定空转开销；SPA 插入与轮询节拍错位 | 后台标签 rAF 暂停；开销高于观察者 |
| 风险 | 低 | 中（NFR-007 开销 + 时序） | 中（后台/开销） |
| 工作量 | ≈1.5 人日 | ≈0.8 人日 | ≈1 人日 |

**推荐 A**：观察者（结构/存在/消失）+ 轮询（几何可见/可交互/文本）双通道 + 统一超时中止（含最后观察状态返回，FR-025 AC）。

### 3.5 对比主题五：extract→export 数据通路（FR-038~042）

| 维度 | 方案 A：session 内存 CollectBuffer + 工具间共享（推荐） | 方案 B：extract 结果原文回传，export 再传参 | 方案 C：落持久存储（IDB/OPFS） |
|------|:--|:--|:--|
| 描述 | extract 写 buffer（id/rows/meta/护栏），export 按 id 读并序列化落盘；buffer 组装点共享注入 | extract 输出 = 完整结构化文本（进上下文），export 收文本再解析 | 采集结果落 v2 StorageBackend（IDB） |
| 优点 | 大结果不占用 AI 上下文（翻页增量 append 只回摘要）；护栏/trust 元数据集中管理；多轮采集累积自然 | 无状态、实现最简 | 跨会话/刷新可恢复 |
| 缺点 | 需跨工具共享状态（base 工厂注入 buffer 实例） | 大数据往返上下文（NFR-003 预算爆）；翻页累积不可表达 | 与「导出即落盘」价值重叠；引入持久化生命周期成本 |
| 风险 | 低（组装点单点注入，memory 态） | 高（上下文预算 + 累积语义） | 中（超出本 Feature 价值，FR-039 无需跨刷新） |
| 工作量 | ≈2 人日 | ≈1 人日（返工） | ≈2.5 人日 |

**推荐 A**：内存态 buffer（session 生命周期，刷新即失但导出即落盘 = 采集价值链闭环）；护栏/trust/脱敏集中在 buffer 写入路径（FR-042 单点）。

### 3.6 对比主题六：定位语法面（FR-015，补充于 ADR-007 内展开取舍）

| 维度 | 方案 A：CSS 基线 + text= 增补（推荐，S-07 已裁） | 方案 B：全 xpath 支持 | 方案 C：role=/aria 语法支持 |
|------|:--|:--|:--|
| 描述 | 裸串/CSS 前缀走 querySelector；text=/text*= 树走文本匹配 | 引入 xpath 解析/求值 | 引入 role/accessible-name 匹配面 |
| 优点 | v2 CSS 全链零回归；text= 覆盖「按可见文字点按钮」最高频场景；零依赖 | 表达力强 | 可访问性语义定位 |
| 缺点 | 文本二义性（首个叶子匹配语义需文档化） | 实现/预算成本高；与 A2 高频场景重叠少 | role 信息已经 interactives 清单输出（FR-011）；重复面 |
| 风险 | 低 | 中（成本/预算） | 中（与 FR-011 重复） |
| 工作量 | ≈1.5 人日 | ≈3 人日 | ≈2.5 人日 |

**推荐 A**：spec S-07 已裁；xpath 语义经 page-eval（FR-037）可表达、role 经 interactives 输出，均记录 out（EC-002 显式不支持）。

---

## 4. 推荐方案

**推荐**：宿主页上下文执行 + evaluate 最高档门禁（§3.1 A）+ SVG foreignObject 截图（§3.2 A）+ native setter/字符级合成事件（§3.3 A）+ MutationObserver/轮询双通道 wait（§3.4 A）+ session 内存 CollectBuffer 通路（§3.5 A）+ CSS+text= 定位面（§3.6 A）。整体技术路线见 §2，波次落点见 §2.6 与 §4.4。

### 4.1 spec 决策 → 技术落点映射（红线输入对齐表）

| spec 决策（已冻结） | 技术落点（本 plan 章节/ADR） |
|---|---|
| R-01 核心定位 / R-02 O-001 五层全谱一次补齐 | §2.2 模块划分：PER/INT/WR 收 dom（27 子命令）+ chrome/wait/page-eval/extract/export 五新工具；§2.6 波次不砍域 |
| R-03 O-010 v3 与 v2 同批 v0.7 | §2.1 开发基线 = feature/web-cli-base-v2 分支位；FR-004 收口基线关联（validate 报告承接） |
| R-04 O-002 独立 evaluate + 最高门禁 | ADR-002：page-eval 独立工具 + ToolRisk 'evaluate'（default deny）+ 无策略 fail-closed + untrusted 拒 + 与 eval-js 语义公开区分（NG-010） |
| R-05 O-009 子命令级 risk | ADR-001：ToolEntry.subcommandRisks + dispatch effectiveRisk + PolicyRule.subcommand；lgdl-web aiPolicy 修复 IMP-4 |
| S-01（O-003）4 桩补真归 v3 | ADR-008 + §2.3.2：platform-dom.ts browserEnv 真实实现替换 4 转译桩 |
| S-02（O-004）截图元素/视口近似 + 整页 out | ADR-003：foreignObject+canvas；整页/跨域返回不支持 + 归属 F-14；不可达降级 out |
| S-03（O-005）打印触发 + back/forward 入 + reload ask + 书签 out | chrome 工具 5 子命令 + subcommandRisks（reload write ask；back/forward 场景规则 allow EC-009） |
| S-04（O-006）合成事件 + React 受控 + 敏感字段 | ADR-004（type/fill/set-value native setter 路径）+ sensitive.ts（FR-024 读脱敏写 ask） |
| S-05（O-007）独立 extract + 循环不工具化 + text/json/csv + xlsx out | ADR-006：collect buffer + extract/export；翻页 = AI 原语编排（护栏 FR-042）；xlsx = 不支持 + 指引 + 注入扩展点 |
| S-06（O-008）save/notify/clipboard 随 v3 入矩阵 | 波 3 接线：session.ts 矩阵 + subcommandRisks（clipboard read ask） |
| S-07（O-011）定位语法 CSS + text= | ADR-007：locator.ts；role=/xpath 显式不支持 |
| S-08（O-012）快照两态 + 分页 + 预算 + interactives 预算 | snapshotStructured op + 20k 默认预算/maxLength 可配 + 截断标记；interactives 默认 200 条可配（I-08 采纳） |
| FR-043 page-eval 默认关 / FR-045 场景缺省 deny | lgdl-web 矩阵 page-eval enabled:false + policy evaluate 缺省 deny（解锁 = 规则 ask/allow + 启用集翻转，双条件） |
| FR-044 ask UI 归场景 | AskDialog 扩展（子命令/risk/代码摘要）——base 零 UI（grep 断言） |
| FR-001/002 additive 契约 / FR-003 桩补真 | §2.3 全节：ToolEntry/PlatformDomOps 只加可选字段与方法；v2 全仓专项零回归门禁 |

### 4.2 测试策略（NFR-005 双轨，v2 先例延续）

**base node 注入面（全绿门禁）**：
- `router.test.ts` 增补：effectiveRisk 解析（subcommandRisks 命中/回退/缺省）；evaluate 无策略 fail-closed deny；审计含 subcommand；v2 顺序契约零回归（F-23 router.test.ts:153 断言保持）。
- `permission.test.ts` 增补：evaluate default deny；PolicyRule.subcommand glob（命中/未命中/与 risk 规则并存优先级 EC-013）；defaultActionForRisk(evaluate)='deny'。
- `locator.test.ts`：CSS/text=精确/text*=包含/case/trim/role=/xpath= 显式不支持错误矩阵。
- `sensitive.test.ts`：password/凭据启发式分类 + 脱敏输出无明文（grep 断言审计无明文）。
- `collect.test.ts`：buffer append/cap/trust 元数据/限速/截断标记；`collect-tools.test.ts`：extract（fake ops 注入 JSON 行）→ buffer → export text/json/csv 三格式 + RFC4180 转义（逗号/引号/换行）+ xlsx 不支持指引 + 落盘两路（fake picker）。
- `wait-tools.test.ts`：时钟注入断言 observer/轮询路径 + 超时含最后状态。
- `chrome-tools.test.ts`：fake ops 各子命令 + 授权两路转译 + screenshot dataUrl 摘要/下载断言。
- `page-eval.test.ts`：untrusted 拒（无 --trusted true）→ 可读错误；异常/超时返回且页面存活（fake op）；审计含代码摘要。
- `dom-tools.test.ts` 扩展：27 子命令注入桩逐条（事件序列/参数解析/EC-001/002/007 边界）；read 子命令免 ask 与写子命令 ask 的 dispatch 级断言（IMP-4 修复验收 AC-009）。
- **真实浏览器冒烟面**（validate 报告）：platform-dom 逐 ops ≥1 真实用例（V13 方法扩展）+ lgdl-web React 受控表单 type/fill/set-value 值变更（NFR-004）+ 动态 SPA wait + 截图尺寸 + v2 收口 3 项基线关联（FR-004）。

**改写/删除有依据**：无 v2 用例删除（additive 零回归）；session.test.ts 增矩阵派生断言；App.tsx policy 改写在场景测试断言（read 免 ask/click ask/back 免 ask/evaluate deny）。

**门禁**：全仓测试全绿 + tsc/vite 零错误 + grep 断言（base 无 lgdl/react import；无策略旁路；无 UI 上收；xlsx/截图无新依赖残留）。

### 4.3 技术开放点（供作者裁决；均带推荐默认，默认已按推荐写入本文档）

> spec 级 I-01~I-08 已全部采纳冻结，本表为 **plan 级新增技术实现取向**开放点：不影响 FR/AC 范围与产品表面，仅影响实现策略/边界声明；作者确认默认即冻结 plan v1.0。

| # | 开放点（一句话） | 推荐默认 | 关联 |
|---|-----------------|---------|------|
| P-01 | page-eval 同步死循环在主线程 DOM 上下文**无法中断**（同 realm 平台硬约束，F12 console 同限）——EC-004「防拖垮」是否接受「诚实公开 + 门禁/预算收敛暴露面」的降级实现（异常可捕获、异步可超时中止、同步死循环披露不承诺）？ | 接受降级实现并帮助面/ADR 公开（不做假中断；validate 冒烟断言异常/异步超时路径页面存活） | FR-037/EC-004/ADR-002 |
| P-02 | 最高风险档以**扩展 ToolRisk 枚举**（新增 'evaluate'）表达（default deny），而非仅靠场景 riskDefaults 兜底——是否采纳枚举扩展（影响 base 公共类型面）？ | 采纳枚举扩展（公共类型 additive，缺省回退语义零破坏） | FR-008/ADR-002 |
| P-03 | 截图默认输出 = **自动触发下载链 + 返回尺寸/字节摘要**（dataURL 不整段进上下文），另提供 `--include-dataurl` 预算内返回头段——是否采纳（替代「dataURL 全量回传由 save 落盘」的上下文重载路径）？ | 采纳自动下载 + 摘要（数据不进上下文；FSA 手势失败自动降级下载链） | FR-028/ADR-003 |
| P-04 | CollectBuffer 生命周期 = **session 内存态**（刷新即失，导出即落盘）vs 落持久存储（IDB 可跨刷新恢复）——是否确认内存态即可（恢复采集进度归属未来/F-14）？ | 确认内存态（导出落盘即价值闭环；跨刷新恢复不做） | FR-038~042/ADR-006 |

### 4.4 波次任务交接表（tasks 输入：落点/模块/FR 锚点）

> 仅标注落点与验收锚点，不做任务拆分（tasks 职责）；每步沿用「可构建 + 相关包测试绿」门禁；波次先序见 §2.6

| 波次 | 落点 | 模块/文件 | 关联 FR/AC 锚点 |
|:--:|------|----------|----------------|
| 波 1 | 子命令级 risk 机制 | router.ts + permission.ts + router.test.ts + permission.test.ts | FR-001~008；AC-001/009；IMP-4 关闭 |
| 波 2 | 定位/敏感纯逻辑 | locator.ts(+test) + sensitive.ts(+test) | FR-015/024；AC-002/003 |
| 波 2 | 浏览器 ops 真实现 | platform-dom.ts（4 桩补真 + 新 ops）+ platform.ts 类型 | FR-002/003/016/017；AC-002/003 |
| 波 2 | dom 工具扩展 | dom-tools.ts + dom-tools.test.ts | FR-009~024/031~036；AC-002/003/006 |
| 波 2 | wait | wait-tools.ts(+test) | FR-025；AC-004 |
| 波 2 | 采集 | collect.ts + collect-tools.ts(+test) | FR-038~040/042；AC-008 |
| 波 2 | page-eval | page-eval.ts(+test) | FR-008/037/045；AC-007 |
| 波 2 | 场景接入 | lgdl-web session.ts + App.tsx + AskDialog.tsx(+test) | FR-043~045；AC-009；FR-044 base 零 UI grep |
| 波 3 | chrome/接线/边界 | chrome-tools.ts(+test) + save/notify/clipboard 矩阵 + FR-041 注入扩展点 + index.ts 导出收口 | FR-026~030/041；AC-005/012 |
| 波 3 | 冒烟/收口 | validate 真实浏览器清单 + v2 收口 3 项基线关联 | FR-003/004；AC-010/011/012 |

---

## 5. 文件影响分析
> 所有需要创建/修改的文件（路径基于 2026-09-06 实测；测试平铺 src/ 根兼容通配测试脚本）

### 5.1 web-cli-base（机制扩展 + DOM 域工具；新增模块 domain-neutral 零 LGDL）

| 操作 | 文件路径 | 说明 |
|:--:|------|------|
| MODIFY | packages/web-cli-base/src/router.ts | ToolEntry.subcommandRisks?；dispatch effectiveRisk 解析 + evaluate 无策略 fail-closed deny + permission 审计含 subcommand（FR-005/008/NFR-008） |
| MODIFY | packages/web-cli-base/src/router.test.ts | effectiveRisk/回退/evaluate fail-closed/顺序契约零回归增补 |
| MODIFY | packages/web-cli-base/src/permission.ts | ToolRisk +'evaluate'；defaultActionForRisk(evaluate)='deny'；PolicyRule.subcommand + ruleMatches + RuleCheckContext.subcommand（FR-005/006/008） |
| MODIFY | packages/web-cli-base/src/permission.test.ts | evaluate deny / subcommand glob / 冲突优先级（EC-013）增补 |
| MODIFY | packages/web-cli-base/src/dom-tools.ts | 27 子命令执行器（SUBCOMMANDS 扩展 + DOM_SCHEMA 合并 + subcommandRisks + help/描述升级；locator/sensitive 联动；EC-001/002/007 边界） |
| MODIFY | packages/web-cli-base/src/dom-tools.test.ts | 27 子命令注入桩 + dispatch risk 断言 + IMP-4 修复用例 |
| MODIFY | packages/web-cli-base/src/platform.ts | PlatformDomOps ~25 个可选新方法 + PlatformDomOpResult.dataUrl?；nodeEnv 新方法不预置；类型导出 |
| NEW | packages/web-cli-base/src/platform-dom.ts | browserEnv 真实 PlatformDomOps 工厂 createBrowserDomOps（4 桩补真 + 新 ops：interactives/readElement/findElements/readStructure/snapshotStructured/合成事件族/waitFor/evaluate/extractData/screenshot 等；locator/sensitive 复用；授权分类转译） |
| NEW | packages/web-cli-base/src/locator.ts | CSS/text= 语法面解析（LocatorQuery；role=/xpath= 显式不支持）（FR-015/EC-002） |
| NEW | packages/web-cli-base/src/locator.test.ts | 解析矩阵 |
| NEW | packages/web-cli-base/src/sensitive.ts | 敏感字段分类/脱敏（password/凭据启发式 + maskValue）（FR-024/EC-005） |
| NEW | packages/web-cli-base/src/sensitive.test.ts | 分类/脱敏/无明文 |
| NEW | packages/web-cli-base/src/collect.ts | CollectBuffer（rows/meta{url,at,trust}/cap/限速/去重）+ createCollectBuffer（FR-042） |
| NEW | packages/web-cli-base/src/collect.test.ts | buffer 护栏/元数据 |
| NEW | packages/web-cli-base/src/collect-tools.ts | extract/export 工具工厂 + 执行器 + text/json/csv 序列化器（RFC4180 转义）+ xlsx 注入扩展点声明（FR-038~041） |
| NEW | packages/web-cli-base/src/collect-tools.test.ts | 抽取/序列化/落盘两路 |
| NEW | packages/web-cli-base/src/wait-tools.ts | wait 工具（条件解析 + ops.waitFor；observer/轮询策略声明） |
| NEW | packages/web-cli-base/src/wait-tools.test.ts | 时钟注入观察者/轮询/超时 |
| NEW | packages/web-cli-base/src/page-eval.ts | page-eval 工具（untrusted 拒 + --trusted true + 代码摘要审计 + 预算）（FR-008/037/045） |
| NEW | packages/web-cli-base/src/page-eval.test.ts | 拒执行/放行/异常/审计 |
| NEW | packages/web-cli-base/src/chrome-tools.ts | chrome 工具（print/back/forward/reload/screenshot + subcommandRisks + dataUrl 下载链）（FR-026~028） |
| NEW | packages/web-cli-base/src/chrome-tools.test.ts | 授权两路/截图摘要/back 免 ask 规则面 |
| MODIFY | packages/web-cli-base/src/index.ts | 导出面追加：locator/sensitive/collect/collect-tools/wait/page-eval/chrome/platform-dom 类型与工厂 + DomSubcommand 新值（NFR-006） |

### 5.2 lgdl-web（场景接入面；ask/授权 UI 归场景）

| 操作 | 文件路径 | 说明 |
|:--:|------|------|
| MODIFY | packages/lgdl-web/src/ai/session.ts | 默认矩阵扩展：注册 chrome/wait/extract/export（共享 CollectBuffer）+ page-eval（enabled:false）+ save/notify/clipboard；dom 已注册不动（FR-029/030/043） |
| MODIFY | packages/lgdl-web/src/ai/session.test.ts | 矩阵派生断言（schema 含新工具 / page-eval 禁用三链） |
| MODIFY | packages/lgdl-web/src/App.tsx | aiPolicy 升级子命令级：`{pattern:'chrome', subcommand:'back\|forward', action:'allow'}` 前置 + 既有 `{risk:'ui', action:'ask'}` 保持 + evaluate 缺省 deny 说明（FR-005~007/045；IMP-4 修复生效点） |
| MODIFY | packages/lgdl-web/src/ai/AskDialog.tsx | ask 呈现扩展：子命令名/risk 展示 + page-eval 代码摘要 + 敏感字段写入确认文案（FR-044；save/截图/剪贴板授权提示尾项波 3） |
| —（不动） | lgdl-web-cli / lgdl-web-op-cli / lgdl-core / lgdl-layout / lgdl-render / lgdl-router / lgdl-cli | C 档内容零改动（NG-006） |

### 5.3 不改动面（明确排除）

ROADMAP 登记（sddu-roadmap 职责）；docs/research/agent-capabilities；`.opencode/` 与 `.sddu/templates/`；root package.json/tsconfig/CI（零新依赖无包新增）；base 既有机制源码零语义改动（runner/delay/audit/eval-tools/save-file/notify/clipboard 逻辑主体不动——clipboard/notify 仅随矩阵接线，save 复用为 export 落盘链）；v2 测试零删除。

---

## 6. 风险评估

| 风险 | 概率 | 影响 | 缓解措施 |
|------|:--:|:--:|----------|
| R-001 **范围/容量**（45 FR 单版本全量 + 与 v2 同批 v0.7） | 高 | 高 | spec §9.4 P0/P1/P2 波次承载（§2.6/§4.4）；每波独立可验证；与 v2 同批发布窗口同步（FR-004 基线关联）；默认不拆子特性 |
| R-002 **平台硬限制误判**（page-eval 同步死循环不可中断 / CSP unsafe-eval / 截图 foreignObject 不可达 / 合成事件 isTrusted） | 中 | 高 | ADR-002/003/004 工程公开 + 失败转译 + spec 降级出口（FR-028 out）；validate 真实浏览器冒烟逐项先行（V13 方法扩展）；P-01~P-03 作者确认默认 |
| R-003 **子命令级 risk 回归/误伤**（effectiveRisk 改变既有规则匹配面） | 中 | 高 | 缺省回退 entry.risk（无 subcommandRisks 行为逐字节同 v2，回归断言）；lgdl-web 规则增补顺序可预测（deny 优先 EC-013/014 语义保持）；IMP-4 修复验收 = 真实会话只读免 ask |
| R-004 **React 受控兼容不可达**（native setter 路径在真实闭环失效） | 中 | 高 | S-04/I-04 已裁必达验收 + EC-006 兜底（回读校验不一致即报，不静默成功）+ O-006 降级记录条款；lgdl-web React 表单真实闭环为波 2 验收门 |
| R-005 **截图/采集输出爆炸上下文**（dataUrl/大结果进 turns） | 中 | 高 | ADR-003 自动下载 + 摘要；ADR-006 buffer 不回流上下文 + maxItems/预算截断标记（FR-042）；AC-012 schema/大输出预算断言 |
| R-006 **evaluate 暴露面**（untrusted 拒执行被绕过 / 门禁旁路） | 低 | 高 | evaluate 缺省 deny + 无策略 fail-closed + 禁用态默认 + untrusted(--trusted true 显式)双闸 + ask 代码摘要人审 + 全量审计（NFR-002 grep 无旁路）；AC-007 专项 |
| R-007 **v2 契约回归**（ToolEntry/接口/枚举 additive 破坏既有） | 中 | 高 | 只加可选字段/方法/枚举值（§2.3）；v2 全仓专项测试零回归为每步门禁（AC-001）；lgdl-web 现 aiPolicy 行为 diff 声明（IMP-4 修复为唯一有意变更） |
| R-008 **浏览器差异漂移**（Fullscreen 手势 / 剪贴板 / save / 截图样式跨浏览器） | 中 | 中 | Chromium 验证基线 + Firefox 声明兼容（v2 P-04 取向沿）；授权失败统一转译（EC-008）；零依赖面能力降级可读（FR-009 语义） |
| R-009 **时间风险**（P2 chrome/接线尾项 + v2 收口 3 项人工基线未闭合） | 高 | 中 | P2 可独立成波不阻塞 P0/P1；v2 收口项作为相关 FR 验收前置/并行基线标注「待基线」不阻塞其余（FR-004）；与 v2 同批合入动作并行 |
| R-010 **采集不收敛/注入文本**（无限滚动 / 提示注入回显执行） | 中 | 中 | 护栏中止保留已采数据（EC-011/FR-042）；trust 元数据 + 注入文本不回显执行（v2 EC-007 语义延续 AC-008）；页数/条数/限速上限可配 |

---

## 7. 生成的 ADR

> 本次规划产出的架构决策记录（本 Feature 独立编号 ADR-001 起；正文内嵌本表后，独立 ADR 文件由 tasks 阶段视需要落盘——沿用 v2 先例）

| ADR | 标题 | 状态 |
|-----|------|:--:|
| ADR-001 | 子命令级 risk = ToolEntry.subcommandRisks + dispatch effectiveRisk + PolicyRule.subcommand（v2 additive，修复 IMP-4） | PROPOSED |
| ADR-002 | page-eval = 宿主页同源上下文执行 + ToolRisk 'evaluate' 最高档（default deny / 无策略 fail-closed / untrusted 拒），与 eval-js worker 沙箱语义公开区分 | PROPOSED |
| ADR-003 | 截图 = SVG foreignObject 序列化 + canvas 光栅近似（零依赖）；整页 out；dataURL 走下载链不进上下文 | PROPOSED |
| ADR-004 | 键盘/表单 = native value setter + input/change 事件序列（React 受控兼容基元）+ 字符级 type；isTrusted=false 工程公开 + 回读校验 | PROPOSED |
| ADR-005 | wait = MutationObserver 驱动 + 轮询降级 + 统一超时（最后状态返回） | PROPOSED |
| ADR-006 | 采集 = extract→session 内存 CollectBuffer→export（text/json/csv + RFC4180 + trust 元数据；xlsx out + 注入扩展点） | PROPOSED |
| ADR-007 | 定位语法 = CSS 基线 + text= 增补（locator 纯解析器）；role=/xpath= 显式不支持（不静默当 CSS） | PROPOSED |
| ADR-008 | dom 子命令族 7→27 + chrome/wait/page-eval/extract/export 新工具模块划分 + PlatformDomOps additive 扩展（零回归承载） | PROPOSED |

### ADR-001: 子命令级 risk = ToolEntry.subcommandRisks + dispatch effectiveRisk + PolicyRule.subcommand（v2 additive，修复 IMP-4）

**状态**: PROPOSED
**背景**: v2 dom 工具整体 risk:'ui'（dom-tools.ts:141），lgdl-web aiPolicy `{risk:'ui', action:'ask'}`（App.tsx:953）使只读子命令 read-state/snapshot 也触发 ask（v2 IMP-4 遗留，spec Q-010）；O-009 已裁「子命令级权限 risk」+ FR-005~007 要求只读免 ask、写/敏感 ask/deny；v2 已有半程支持：StrategyCheckContext/AskQuestion 含 subcommand（permission.ts:67-86）、router.dispatch 已传 tc.subcommand，唯 risk 为工具级单值。
**决策**: ToolEntry 追加可选 `subcommandRisks?: Record<string, ToolRisk>`（缺省 = 回退 entry.risk，v2 行为逐字节一致）；dispatch 计算 `effectiveRisk = subcommandRisks?.[tc.subcommand] ?? entry.risk` 后传入 PermissionGate.check 的 input.risk（规则匹配 + 缺省取向共用）；PolicyRule 追加可选 `subcommand`（glob，与 pattern/group/namespace/risk 正交）；permission 审计事件追加 subcommand；**special fail-closed**：effectiveRisk==='evaluate' 且 policyGate 未装配 → 直接 deny（evaluate 工具在无策略宿主绝不静默执行）。lgdl-web aiPolicy 以「chrome back/forward allow 规则前置 + 既有 risk:'ui' ask 规则保持」落地 IMP-4 修复。
**取舍/理由**: 方案 B（每子命令独立 ToolEntry）破坏 dom 单工具形态与 DOM_SCHEMA 契约；方案 C（executor 内自判）绕过统一门禁 = NFR-002 旁路。A 使门禁认知子命令但不改注册/分发结构；`effectiveRisk` 让**规则 risk 过滤面**与缺省取向同源（v2 规则 risk:'ui' 从「锁死全工具」精确到「只锁 UI 副作用子命令」）。
**后果**: 只读子命令免 ask（IMP-4 修复验收 AC-009）；写/敏感子命令走 ask/deny；无 subcommandRisks 的工具与规则行为零回归（AC-001）；规则可到子命令粒度 = 场景可按需 allow back/forward（EC-009）或 deny reload；审计可回放子命令级裁决（NFR-008）。

### ADR-002: page-eval = 宿主页同源上下文执行 + ToolRisk 'evaluate' 最高档（default deny / 无策略 fail-closed / untrusted 拒），与 eval-js worker 沙箱语义公开区分

**状态**: PROPOSED
**背景**: O-002/R-04 已裁「独立 evaluate 工具 + 最高门禁 + untrusted 拒执行，与 worker 沙箱 eval-js 语义区分」（NG-010）；FR-008/037/045 要求缺省 deny 或 ask（不静默 allow）、untrusted 来源代码拒执行、全程审计；worker 无 DOM 面（eval-tools.ts 语义）故不能承载 DOM 面 evaluate；真 F12 console 等效 = 宿主页同 realm。
**决策**: 独立工具 `page-eval`（不进 dom、不复用 eval-js）：执行面 = PlatformDomOps.evaluate 在**宿主页同源 JS 上下文**间接 eval/new Function（等效 F12 console 对该页权限；跨域仍 SOP = F-14）；门禁 = ①ToolRisk 新增 `'evaluate'`，defaultActionForRisk('evaluate')='deny'（现有档位之外的最高档）②router 无 policyGate 时 effectiveRisk evaluate 直接 deny（fail-closed）③executor 层 untrusted 拒：代码默认视为 untrusted，须显式 `--trusted true`（v2 eval-js EC-007 同源模式；真可信面 = 场景策略 ask 人审，FR-045 白名单规则）④ask 呈现代码摘要（FR-044）⑤审计含代码摘要/来源/裁决（NFR-008）；执行预算 = 代码长度上限 + 异常捕获 + 异步 Promise 超时中止；**同步死循环不可中断为主线程同 realm 平台硬约束（F12 console 同限）→ 帮助面/ADR 工程公开，不承诺假中断**（P-01 默认）。返回 = 序列化结果（JSON 可解析/文本）+ 预算截断标记；运行时异常/超时 → 可读错误页面存活（EC-004 可达成子集）。
**取舍/理由**: 方案 B 同源 iframe 中转与宿主共享 event loop（假隔离）且 DOM 访问绕 parent 链；方案 C worker 无 DOM 违背 NG-010。A 是唯一 F12 等效面；「不中断」以门禁/预算/审计收敛暴露面而非技术上消灭（诚实降级，P-01 作者确认默认）。
**后果**: 写入/evaluate 工具群上线即带护栏（G-003）；untrusted 注入有可测基线（AC-007）；与 eval-js worker 语义在 help/schema 显式区分（无 DOM vs 有 DOM；worker vs 宿主）；宿主必须显式装配策略才可启用（FR-043/045 默认关 + deny）；代码执行审计可回放。

### ADR-003: 截图 = SVG foreignObject 序列化 + canvas 光栅近似（零依赖）；整页 out；dataURL 走下载链不进上下文

**状态**: PROPOSED
**背景**: FR-028/S-02 已裁「元素/视口级同源近似入 v3 + 整页 out + 零新增依赖 NFR-002」；真 captureVisibleTab/CDP = F-14/扩展宿主（NG）；截图 dataURL 可达 MB 级，直接回传 ToolResult 会爆上下文预算（NFR-003）。
**决策**: ops.screenshot 实现 = 目标子树 clone（含内联 style + 同源样式表匹配规则复制）→ XMLSerializer（XHTML 命名空间包裹）→ 注入 SVG foreignObject（尺寸 = 元素 rect 或视口 innerWidth/innerHeight + scroll 平移近似）→ Image(data:image/svg+xml) → canvas drawImage（devicePixelRatio 缩放）→ toDataURL('image/png')。**元素级 = selector 首匹配精确裁剪；视口级 = 文档根 + 视口 clip 近似；整页级入参返回「不支持 + 归属 F-14/CDP」说明**。输出策略（P-03 默认）：默认自动触发下载链（env.filePicker.download 降级锚点）并返回 {尺寸/字节/文件名} 摘要；`--include-dataurl true` 才在 output 回带头段 + 截断标记；CSP/跨源样式读取/canvas taint/序列化失败 → classifyCapabilityError 转译（EC-008）。`PlatformDomOpResult` 追加可选 `dataUrl?: string`（大 payload 走独立字段不进 output）。真实不可达 → 按 spec 降级 out 记录（FR-028 出口）。
**取舍/理由**: 纯 canvas 重绘 = 重写渲染引擎（成本/保真双输）；引库违反零依赖红线（NG-005 需作者例外）。foreignObject 是零依赖下保真最优近似；「下载 + 摘要」把大 payload 挡在上下文之外（与 ADR-006 buffer 同哲学）。
**后果**: 「AI 截个图给用户看」的浏览器内价值闭环（文件落下载/用户文件）；近似度局限帮助面公开（外部资源/CSS 变量/滚动态不保真）；失败路径全部可读可降级；上下文预算不被 dataURL 击穿（AC-012）。

### ADR-004: 键盘/表单 = native value setter + input/change 事件序列（React 受控兼容基元）+ 字符级 type；isTrusted=false 工程公开 + 回读校验

**状态**: PROPOSED
**背景**: FR-022/034/035（S-04/I-04 已裁）要求 type/fill/set-value 对 React 受控表单**必达**值变更 + onChange（lgdl-web React 表单为验收靶）；纯 KeyboardEvent 派发不改 value（React 内部 tracker 还原）、纯 .value 赋值不触发 onChange；NG-007 声明合成事件 isTrusted=false 不承诺可信事件绑定。
**决策**: 三个写入层共用「React 受控兼容基元」：**受控检测**（元素 value tracker/owner 特征）→ **native setter**：`Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el, v)` + 派发 `input`（bubbles，React 17+ 根委托可捕获 → onChange）；`set-value` = 单次基元；`type` = 字符级 keydown（按平台能力）/input/keyup 序列（贴近真人键入，逐字符触发 onChange 增量）；`fill` = 按控件类型路由：text/number/email/textarea→type 或 set-value、select→value+change、checkbox/radio→checked/click、contenteditable→Selection/Range + insertText 降级 textContent+input；表单提交 = requestSubmit（存在时）。**写入后回读校验**：值不一致 → 返回「事件已派发但值可能未同步」可验证提示（EC-006 兜底，不静默成功）；type=file 显式不可用（NG-004）。敏感字段（type=password 等，sensitive.ts）读不回显、写默认 ask（FR-024）。
**取舍/理由**: 方案 B（纯赋值）对 React 必达验收失败、方案 C（纯键盘事件）值不变；A = playwright/同源先例「native setter + 事件序列」是浏览器侧对受控组件唯一可靠路径。字符级 type 增加真实性而不牺牲受控路径（两模式并存按控件路由）。
**后果**: React 受控表单填写闭环可验收（NFR-004/AC-003/006）；isTrusted=false 局限写入帮助面（NG-007/EC-007 拖放/长按同局限声明）；写入有可验证回读基线，不假装成功。

### ADR-005: wait = MutationObserver 驱动 + 轮询降级 + 统一超时（最后状态返回）

**状态**: PROPOSED
**背景**: FR-025 要求条件等待（出现/可见/可交互/消失/文本），SPA 动态渲染真实命中 + 超时可读，NFR-007 低开销；sleep 是固定延时不可感知 DOM；采集翻页（FR-039）需要 wait 保证时序稳定。
**决策**: ops.waitFor 双通道：**MutationObserver**（document childList+subtree+attributes）观察结构/内容/属性类条件（element/text/gone 依赖 DOM 变化即时重判）；**轮询通道**（interval 可配，默认 200ms）兜底几何类条件（visible/interactable = getBoundingClientRect 非零 + 非 display:none + 非 disabled）与 observer 不可用降级；条件 = 结构化解构（kind/selector/text），多条件 mode any/all（FR-025 可配）；统一超时（默认可配，上限 30s 钳制）→ ok:false + **最后观察状态摘要**（各条件当前满足与否/匹配数）不中断会话；命中 → ok + 当前状态摘要。wait 工具 risk:'read'（只读观察免 ask）；observer 常驻开销 = 无（观察期外零成本，NFR-007）。
**取舍/理由**: 纯轮询空转开销 + SPA 节拍错位；纯 rAF 后台暂停。A 观察者为主 = 结构性变化零延迟低开销、轮询为辅补几何盲区（observer 不感知布局）。
**后果**: SPA 延迟插入/无限滚动加载的「等元素再操作」原语成立；采集翻页循环可复现（FR-039）；与 sleep 并存零回归（sleep 语义不动）；超时自愈信息让 AI 可据最后状态调整（EC-014 联动建议）。

### ADR-006: 采集 = extract→session 内存 CollectBuffer→export（text/json/csv + RFC4180 + trust 元数据；xlsx out + 注入扩展点）

**状态**: PROPOSED
**背景**: FR-038~042（S-05/I-05 已裁）：extract 独立声明式工具（非 evaluate 组合）、翻页循环不工具化（AI 原语编排）、导出 text/json/csv、真 xlsx out（NFR-002 零依赖）；大结果直接回传上下文会击穿预算（NFR-003）；跨工具共享采集结果需要状态载体。
**决策**: `CollectBuffer`（session 内存态，base 工厂 `createCollectBuffer()` 组装点共享注入 extract/export；P-04 默认不落 IDB）：条目 = {id, rows: object[], meta:{url, at, trust:'untrusted', schema?}, stats}；**写入护栏单点** = 单次 maxItems（默认 200 可配）/缓冲总量上限/限速间隔（两次 append 最小间隔，默认 300ms 可配）+ 可选去重（行 JSON hash）；翻页增量 extract 追加同 id。`extract` 工具：声明式 kind = table（table→行×列）/list（item selector + 字段 selector 映射）/links/images（集合抽取）/meta（title/meta），入参统一定位语法（ADR-007），返回 {ok, 条数, bufferId, 截断标记}（数据不进 output，只回摘要）。`export` 工具：--format text（原样/拼接）/json（结构化数组 + 元数据头 {source url, collectedAt, trust}）/csv（表头 + RFC4180 转义：含逗号/引号/换行字段正确引号包裹）；经 env.filePicker.save/download 落盘（save 手势拒绝 → 下载链降级 EC-012）；无落盘面 → 截断内容 + 长度降级；`.xlsx` 入参 → 「不支持 + csv 替代指引」；注入扩展点 = createExportToolEntry(env,{buffer, xlsxSerializer?}) 类型声明（FR-041 不默认实现，作者另行裁决 O-007 例外才引库）。trust 元数据贯穿（FR-042，下游可识别外部数据面）；敏感页面内容采集经 sensitive.ts 脱敏（FR-024/EC-005）；提示注入文本不回显执行（v2 EC-007 语义延续）。
**取舍/理由**: extract 结果回流上下文（方案 B）翻页累积不可表达且预算爆炸；落 IDB（方案 C）与「导出即落盘」价值重叠。A 使「收集→导出」全链数据不出内存、护栏/脱敏单点收敛。
**后果**: 采集价值链（extract→翻页→增量→export→落盘）以原语组合达成（FR-039）；AI 上下文只吃摘要不吃数据（AC-012）；护栏中止保留已采数据可导出（EC-011）；导出文件携带来源/时间/trust 元数据（FR-042/AC-008）。

### ADR-007: 定位语法 = CSS 基线 + text= 增补（locator 纯解析器）；role=/xpath= 显式不支持（不静默当 CSS）

**状态**: PROPOSED
**背景**: FR-015（S-07/I-07 已裁）：v3 全部元素级工具（read-element/find/click/fill/extract 等）统一 selector 入参；语法面 = CSS 基线 + text=（精确/包含）；role=/xpath 不做；EC-002 禁止把未知前缀静默当 CSS 解析。
**决策**: `locator.ts` 纯解析器（base node 可测，platform-dom 复用）产出 `LocatorQuery`：裸串 / `css:` 前缀 → CSS querySelector；`text=精确文本` → DOM 文本树走（叶子优先语义：文本节点归属元素且不含子元素文本，避免命中容器父级；默认 trim、可配大小写）；`text*=包含文本` 同树走子串匹配；解析失败（非法 CSS/text= 语法）→ 可读错误 + 语法指引；`role=`/`xpath=` 前缀 → 显式「不支持」错误 + 替代指引（role 信息经 interactives 清单 FR-011；xpath 语义经 page-eval FR-037 可表达）；多匹配操作类 = 首元素 + 提示（可经 find 精确化，EC-002）。全部元素级子命令/extract/fill 经同一解析器 → 语法面单一事实源。
**取舍/理由**: xpath 引入解析/求值面成本高且与高频场景重叠低；role 面与 interactives 重复。text= 覆盖「按可见文字点击/读取」最高频 AI 场景（A1/A2 公理）。
**后果**: 定位语法单点可测可演进（新增语法只改 locator.ts）；CSS 全链 v2 零回归；错误面可读可自愈（不把 text=/xpath= 当 CSS 静默命中错元素 = 安全面收益）。

### ADR-008: dom 子命令族 7→27 + chrome/wait/page-eval/extract/export 新工具模块划分 + PlatformDomOps additive 扩展（零回归承载）

**状态**: PROPOSED
**背景**: FR-001~003（additive 红线）：v3 全部新增以 ToolEntry 追加/PlatformDomOps 加可选方法接入既有 CommandRouter；五层 ≈34 项一次补齐需清晰模块边界（O-001）；browserEnv 4 转译桩（hover/scroll/zoom/fullscreen）真实实现归 v3（S-01）；dom 单文件 7→27 子命令会膨胀，需 DOM 触碰收敛。
**决策**: **工具面 = dom（27 子命令：既有 7 序保持 + PER5 + INT8 + WR8，subcommandRisks 见 §2.3.3）+ chrome（print/back/forward/reload/screenshot）+ wait + page-eval + extract + export**（语义分离：元素/页操作 vs 浏览器外壳 vs 条件等待 vs F12 执行 vs 采集读 vs 导出写）；每新工具 = 独立模块（工厂 + executor + schema + help），统一走 CommandRouter 注册与 PRM；**DOM 触碰全收敛 platform-dom.ts**（browserEnv 真实 ops 工厂，4 桩补真 + ~25 方法），dom-tools/collect-tools/wait/chrome/page-eval 的 executor 只做参数解析/预算/序列化/门禁语义，node 面注入桩可全链单测；PlatformDomOps 全部新方法**可选**（缺省 undefined → 可读「未注入」错误），既有 7 方法签名零改动；PlatformDomOpResult 追加可选 dataUrl?；nodeEnv 新方法不预置。
**取舍/理由**: 全塞 dom（~40 子命令）schema 描述爆炸且 chrome/wait/采集/执行语义混组（AI 选型/help 混乱）；每能力拆独立工具则工具数过多且与 spec「dom 新增 xx 子命令」措辞对不上（FR 可追溯性）。27+5+1+1+1+1 动词合计 ≈30+ 操作面（spec 口径「~30+」）且按语义聚组。
**后果**: FR-001/002/043 additive 契约零破坏（AC-001：缺省行为与 v2 一致、deriveTools 顺序断言不漂移）；4 桩消失 = v3 零转译桩（G-004/AC-003）；base 其余模块保持零 document 假设（node 测试 + 浏览器冒烟双轨 NFR-005）；后续 F-14 消费端拿到完整同源机制底座（US-007）。

---

## 8. 修订记录
> 记录本文档的版本变更历史

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建：以 spec.md v1.1（45 FR 九组冻结 + I-01~I-08 全部采纳）+ v2 代码事实为输入；架构分析（五层模块划分 / dom 7→27 + 五新工具 / PlatformDomOps ~25 可选方法 / subcommandRisks / CollectBuffer 数据流）+ 六主题方案对比 + 推荐方案（决策映射 / 双轨测试 / P-01~P-04 技术开放点 / 波次任务交接）+ 文件影响（base 8 MODIFY + 15 NEW；lgdl-web 4 MODIFY）+ 风险评估 + 8 ADR（PROPOSED） | 2026-09-06 | SDDU Plan Agent |
