# 任务分解：web-cli-base v3：AI 操作浏览器的完整工具集（specs-tree-web-cli-base-v3）

> **文档定位**: SDDU 任务清单 — 将技术方案分解为可并行执行的原子任务，作为 build 阶段的输入
> **前置依赖**: plan.md v1.0（8 ADR + 27 项文件变更：base 8 MODIFY/15 NEW + lgdl-web 4 MODIFY；P0/P1/P2 波次交接 §2.6/§4.4）、spec.md v1.1（45 FR 九组 + 8 NFR + 14 EC + 12 AC，冻结）、state.json（phase=planned）
> **创建人**: SDDU Tasks Agent
> **创建时间**: 2026-09-06
> **版本**: v1.0
> **更新人**: SDDU Tasks Agent
> **更新时间**: 2026-09-06
> **更新说明**: 初始创建（基于 plan §2.6 波次先序 + §4.4 交接表 + §5 文件影响面拆分为 12 个原子任务 / 7 个执行波次；P0=机制层 1 任务，P1=五层主体 8 任务，P2=接线/收口 3 任务；机制层先行（先机制后域）、纯逻辑/类型层并行、域实现层五路并行、lgdl-web session.ts 分两阶段顺序扩展（TASK-009→TASK-011）；AC-001 v2 零回归作为每步门禁 + TASK-012 收口专项，D-005 记录于 §4.3）

---

## 1. 依赖拓扑总览

> 任务依赖关系和执行顺序；每任务带「独立可验证」标志（✅ = 任务自身验证命令可自证完成，不依赖后续任务）；P0/P1/P2 = plan 波次标签（spec §9.4 对齐：P0=基座机制层 8 FR / P1=五层主体 31 FR / P2=接线 6 FR），Wave N = 实际执行波次

### 1.1 任务总览表

| 编号 | 模块/落点 | 复杂度 | 依赖 | plan波次 | 执行波次 | 一句话目标 |
|------|----------|:--:|------|:--:|:--:|------|
| TASK-001 | base 机制层：permission + router 子命令级 risk + evaluate 门禁 | L | 无 | P0 | Wave 1 | 子命令级 effectiveRisk + PolicyRule.subcommand + evaluate default deny/fail-closed（IMP-4 机制半） |
| TASK-002 | base 纯逻辑：locator + sensitive | M | 无 | P1 | Wave 2 | CSS+text= 定位解析面 + 敏感字段分类/脱敏（node 可测） |
| TASK-003 | base 类型层：platform.ts PlatformDomOps 扩展 | M | 无 | P1 | Wave 2 | ~25 可选方法 + dataUrl?（additive，nodeEnv 不预置） |
| TASK-004 | base 浏览器实现：platform-dom.ts + browserEnv 装配 | L | 002/003 | P1 | Wave 3 | 4 桩补真 + ~25 ops 真实实现（DOM 触碰收敛单文件） |
| TASK-005 | base dom 工具扩展 | L | 001/003 | P1 | Wave 3 | dom 7→27 子命令（PER5/INT8/WR8 + subcommandRisks + schema） |
| TASK-006 | base wait 工具 | M | 002/003 | P1 | Wave 3 | wait 条件等待（MutationObserver + 轮询 + 超时最后状态） |
| TASK-007 | base page-eval 工具 | M | 001/003 | P1 | Wave 3 | 宿主页 evaluate（untrusted 拒 + 预算 + 摘要审计） |
| TASK-008 | base 采集域 | L | 001/002/003 | P1 | Wave 3 | CollectBuffer + extract/export（text/json/csv + RFC4180 + xlsx out） |
| TASK-009 | base index 导出 + lgdl-web 场景收口 | L | 001/005~008 | P1 | Wave 4 | 矩阵注册 P1 集 + App 子命令级 policy（IMP-4 生效）+ AskDialog 主体 |
| TASK-010 | base chrome 工具 | M | 001/003 | P2 | Wave 5 | chrome 5 子命令（print/back/forward/reload/screenshot + dataUrl 下载链） |
| TASK-011 | P2 接线收口（lgdl-web 增量 + index） | L | 009/010 | P2 | Wave 6 | chrome/save/notify/clipboard 入矩阵 + back/forward 免 ask + AskDialog 尾项 |
| TASK-012 | 全仓门禁 + validate 冒烟/基线移交 | M | 全部 | P2 | Wave 7 | 全仓零回归 + grep 断言 + V13 冒烟清单 + v2 收口基线关联（AC-001 收口） |

### 1.2 依赖拓扑（串行链 + 并行组）

```
P0 机制层（先机制后域；任何写/evaluate 上线即有护栏）：
  TASK-001 permission+router 子命令级 risk + evaluate 最高档门禁（无依赖，Wave 1）

P1-a 纯逻辑/类型层（Wave 2，两任务并行；与 Wave 1 互不依赖，可按阶段序先等 P0）：
  TASK-002 locator + sensitive            TASK-003 platform.ts PlatformDomOps 类型扩展

P1-b 域实现层（Wave 3，五路并行；依赖 Wave 1/2 产物；各自独立文件零冲突）：
  TASK-004 platform-dom browserEnv 真实现（dep 002/003）
  TASK-005 dom-tools 7→27（dep 001/003）
  TASK-006 wait-tools（dep 002/003）
  TASK-007 page-eval（dep 001/003）
  TASK-008 collect + collect-tools（dep 001/002/003）

P1-c 场景收口（Wave 4；依赖 P1-b 模块建成 + 001）：
  TASK-009 base index P1 导出 + lgdl-web session/App/AskDialog（IMP-4 修复生效点）

P2-a（Wave 5；代码面仅依赖 001/003，与 P1-b 无耦合 —— 缺省按 plan 阶段序置后，人力富余可提前并行）：
  TASK-010 chrome-tools（print/back/forward/reload/screenshot）

P2-b 接线（Wave 6；依赖 009 的 P1 矩阵基线 + 010）：
  TASK-011 session.ts 矩阵增量（chrome/save/notify/clipboard）+ App chrome 规则 + AskDialog 尾项 + index chrome 导出

P2-c GATE（Wave 7；依赖全部）：
  TASK-012 全仓门禁 + AC-001 收口 + V13 冒烟清单 + v2 收口基线关联
```

### 1.3 并行分组（Wave）

```
Wave 1 ─── (P0，无依赖)
  TASK-001 [L] 机制层：permission + router（子命令级 risk + evaluate 最高档）

Wave 2 ─── (P1-a，两任务并行；均无依赖，可与 Wave 1 并行——按阶段序置后执行)
  TASK-002 [M] locator + sensitive 纯逻辑
  TASK-003 [M] platform.ts PlatformDomOps 类型扩展

Wave 3 ─── (P1-b，五路并行；依赖 Wave 1/2)
  TASK-004 [L] platform-dom.ts browserEnv 真实现（4 桩补真 + ~25 ops）
  TASK-005 [L] dom-tools 7→27 子命令扩展
  TASK-006 [M] wait-tools
  TASK-007 [M] page-eval
  TASK-008 [L] collect + collect-tools

Wave 4 ─── (P1-c 收口，依赖 P1-b)
  TASK-009 [L] base index P1 导出 + lgdl-web 场景接入（session/App/AskDialog）

Wave 5 ─── (P2-a，代码面可提前并行；缺省按 plan 阶段序)
  TASK-010 [M] chrome-tools

Wave 6 ─── (P2-b 接线，依赖 009/010)
  TASK-011 [L] P2 矩阵增量 + chrome 规则 + AskDialog 尾项

Wave 7 ─── (GATE，依赖全部)
  TASK-012 [M] 全仓门禁 + validate 冒烟/基线移交
```

---

## 2. 任务列表

> 每个任务的详细定义；验证命令中 base = `packages/web-cli-base`、lgdl-web = `packages/lgdl-web`；lgdl-web 相关含 vite build + 显式 tsc（vite 不做类型检查）；测试文件全部平铺 src 根（兼容 base 通配测试脚本）
> **每步门禁（AC-001）**：任何任务完成后 v2 既有测试零删除零降级、相关包测试全绿 —— 详见 §4.1 检查点表

### TASK-001: 机制层：permission + router 子命令级 risk + evaluate 最高档门禁

> **状态**: ✅ completed（2026-09-06 sddu-build；build 证据：base build 零错误 + 全包 test 215 通过；router.test 30 既有 + permission.test 13 既有零改写全绿，增补 v3 用例 router +6 / permission +4；git diff 测试文件 0 删除行）

| 属性 | 值 |
|------|-----|
| **复杂度** | L |
| **前置依赖** | 无 |
| **执行波次** | Wave 1（plan P0） |
| **对应 FR** | FR-005/006/008（+ FR-001 缺省回退契约、NFR-008 审计 subcommand） |
| **风险** | R-003（effectiveRisk 改变既有规则匹配面 → 缺省回退断言兜底）；R-007（additive 契约 → 只加可选字段/枚举值，v2 元数据零变化） |

**输入**: plan §2.3.1 + ADR-001（ToolEntry.subcommandRisks / effectiveRisk / PolicyRule.subcommand）+ ADR-002（ToolRisk 'evaluate' 档）+ §4.2 测试策略 + spec PRM 组 FR-005~008

**描述**: 完成子命令级权限机制（修复 v2 IMP-4 的机制半）与 evaluate 最高档门禁。permission.ts 扩展 ToolRisk 枚举与规则匹配面；router.ts 计算 effectiveRisk 并 fail-closed。**本任务零回归红线 = 无 subcommandRisks 的工具/规则行为与 v2 逐字节一致（AC-001/FR-001）**。lgdl-web 场景侧策略（FR-007）由 TASK-009 承接，本任务不做。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| MODIFY | packages/web-cli-base/src/permission.ts |
| MODIFY | packages/web-cli-base/src/permission.test.ts |
| MODIFY | packages/web-cli-base/src/router.ts |
| MODIFY | packages/web-cli-base/src/router.test.ts |

**验收标准**:
- [x] permission.ts：`ToolRisk` 新增 `'evaluate'`（最高档）；`defaultActionForRisk`：evaluate→`'deny'`、read/无→allow、其余→ask（FR-008 缺省不静默 allow）
- [x] `PolicyRule` 增可选 `subcommand`（glob：`*` 任意串 / `?` 单字符，与 pattern/group/namespace/risk **正交**，缺省不限）；`ruleMatches` 增 subcommand 过滤；`RuleCheckContext` 携带可选 subcommand（StrategyCheckContext/AskQuestion 沿用既有 subcommand 字段，零破坏）
- [x] router.ts：`ToolEntry` 增可选 `subcommandRisks?: Record<string, ToolRisk>`（缺省 = 回退 entry.risk）；dispatch 计算 `effectiveRisk = subcommandRisks?.[tc.subcommand] ?? entry.risk` 传入 `PermissionGate.check` 的 input.risk（规则匹配 + 缺省取向共用）
- [x] ★ fail-closed：`effectiveRisk === 'evaluate'` 且 policyGate 未装配 → 直接 deny（返回「page-eval 需场景策略显式开启 + 门禁装配」可读错误，**执行器不被调用**）
- [x] 审计：permission/tool-call 事件含 subcommand 字段（NFR-008）
- [x] permission.test.ts 增补：evaluate default deny / subcommand glob 命中·未命中 / 子命令级与工具级规则并存优先级 deny 优先（EC-013）/ defaultActionForRisk('evaluate')='deny'
- [x] router.test.ts 增补：effectiveRisk 命中/回退/缺省、evaluate 无策略 deny（间谍断言执行器未调用）、审计含 subcommand、无 subcommandRisks 工具行为与 v2 一致（回归断言）
- [x] **AC-001**：v2 既有 router/permission 用例零删除零改写；F-23 顺序契约断言（router.test.ts:153 派生顺序）保持；无 subcommandRisks 时派生/派发与 v2 逐字节一致
- [x] base build + test 全绿；零新增 import（无 lgdl/react）

**验证命令**:
```bash
npm run build --workspace @lgdl/web-cli-base && npm run test --workspace @lgdl/web-cli-base
```

### TASK-002: 纯逻辑：locator 定位语法面 + sensitive 敏感字段分类/脱敏

> **状态**: ✅ completed（2026-09-06 sddu-build；build 证据：base build 零错误 + 全包 test 249 通过（locator.test 17 + sensitive.test 17 新增；TASK-001/003 既有增补用例与 v2 全量零回归）；4 文件全 NEW，两模块零 DOM/lgdl/react import；git diff 测试文件 0 删除行）

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | 无 |
| **执行波次** | Wave 2（plan P1-a） |
| **对应 FR** | FR-015/024（+ EC-002/005） |
| **风险** | text= 文本二义性（首叶子语义需文档化，ADR-007）；凭据启发式误判/漏判 → 保守脱敏取向（宁可遮不可漏，FR-024） |

**输入**: plan §2.3.4 + ADR-007（locator 纯解析器）+ §2.3.3 敏感面标注 + ADR-004（敏感字段写 ask 联动）+ spec PER FR-015 / INT FR-024 + §4.2 测试策略

**描述**: 两个零 DOM 依赖的纯逻辑模块（base node 直接可测，platform-dom/wait/collect 复用）。locator 产出统一 `LocatorQuery`（v3 全部元素级子命令/extract/fill 的单一语法事实源）；sensitive 提供敏感字段分类与脱敏（password/凭据启发式）。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| NEW | packages/web-cli-base/src/locator.ts |
| NEW | packages/web-cli-base/src/locator.test.ts |
| NEW | packages/web-cli-base/src/sensitive.ts |
| NEW | packages/web-cli-base/src/sensitive.test.ts |

**验收标准**:
- [x] locator.ts：`css:` 显式前缀（可选）/ 裸 CSS 串（基线，v2 零回归语义）/ `text=精确文本` / `text*=包含文本`（可配 `case`、trim 默认开）→ 结构化 `LocatorQuery`（含 type 判别）
- [x] `role=` / `xpath=` 前缀 → 显式「不支持 + 替代指引」可读错误（role→interactives FR-011、xpath→page-eval FR-037；**绝不静默当 CSS 解析**，EC-002）
- [x] 非法 CSS / text= 语法错误 → 可读错误 + 语法指引（EC-002）；多匹配操作类语义 = 首元素 + 提示（文档化，供 find 精确化）
- [x] locator.test.ts：解析矩阵（css/text=精确/text*=包含/case/trim/role=/xpath=/非法语法错误）全绿
- [x] sensitive.ts：敏感字段分类（type=password + name/id/autocomplete 凭据启发式）+ `maskValue` 脱敏（占位/长度/类型代替，FR-024/EC-005）
- [x] sensitive.test.ts：分类矩阵 + 脱敏输出 grep 断言无明文
- [x] 两模块零 DOM/lgdl/react import；base build + test 全绿（node 纯逻辑全链）

**验证命令**:
```bash
npm run build --workspace @lgdl/web-cli-base && npm run test --workspace @lgdl/web-cli-base
```

### TASK-003: 类型层：platform.ts PlatformDomOps additive 扩展

> **状态**: ✅ completed（2026-09-06 sddu-build；build 证据：base build 零错误 + 全包 test 215 通过；platform.test 既有 4 用例零改写零回归全绿；lgdl-web vite build + 显式 tsc 零错误 = v2 调用方编译零破坏断言；git diff 测试文件 0 删除行、platform.ts 0 行为代码改动仅类型声明面）

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | 无 |
| **执行波次** | Wave 2（plan P1-a） |
| **对应 FR** | FR-002（additive 接口契约；缺省 undefined → 未注入可读错误） |
| **风险** | R-007（接口 additive 破坏既有 → 既有 7 方法签名零改动 + 新方法全可选，类型编译断言兜底） |

**输入**: plan §2.3.2 方法表（~25 新增可选方法）+ ADR-008（PlatformDomOps additive）+ §2.3.3 subcommandRisks 标注 + spec BSL FR-002/FR-001

**描述**: 为 platform.ts 的 `PlatformDomOps` 追加 v3 全部新能力方法签名（**全部可选**，缺省 undefined）与 `PlatformDomOpResult.dataUrl?` 可选字段。**本任务只改类型声明面**（含注释文档），不改任何实现行为、不动既有 7 方法签名、nodeEnv 不预置新方法（undefined → dom executor 沿用「该能力在当前环境未注入」可读错误，dom-tools.ts:32-38 语义）。既有 click 签名加**可选** `opts?`（坐标/偏移，FR-020），旧调用方零回归。browserEnv 真实现装配由 TASK-004 承接。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| MODIFY | packages/web-cli-base/src/platform.ts |

**验收标准**:
- [x] `PlatformDomOps` 增 §2.3.2 表 #1~#25 全部可选方法（interactives/readElement/findElements/readStructure/snapshotStructured/dblclick/contextmenu/longPress/dragDrop/focusEl/blurEl/typeText/pressKey/setText/setAttr/removeAttr/setStyle/setValue/fillForm/addElement/removeElement/waitFor/evaluate/extractData/printPage/historyNav/reloadPage/screenshot）；方法名与 dom 子命令/工具映射注释齐备
- [x] `PlatformDomOpResult` 增可选 `dataUrl?: string`（截图大 payload 独立字段，不进 output）；click 签名增可选 `opts?: {offsetX?, offsetY?, x?, y?}`（PlatformClickOptions 导出接口 = 同型四可选字段）
- [x] 既有 7 方法签名零改动（readState/hover/scroll/zoom/fullscreen/snapshot 逐字节保持 + click 仅追加可选 opts?；v2 调用方编译零破坏断言 = lgdl-web vite + tsc 全绿）；`nodeEnv` 不预置新方法（nodeEnv 代码零改动 → 新方法缺省 undefined）
- [x] **AC-001**：platform.test.ts 既有用例零删除零改写（git diff 测试文件 0 删除行）；base build + test 全绿（215 通过，类型扩展由全包 tsc 验证）
- [x] 新方法缺省 undefined 时无注入面调用返回「未注入」可读错误语义保持（沿用既有 executor 契约 dom-tools.ts:32-38；本任务仅类型层验证，各方法 JSDoc 标注未注入语义）

**验证命令**:
```bash
npm run build --workspace @lgdl/web-cli-base && npm run test --workspace @lgdl/web-cli-base
```

### TASK-004: 浏览器 ops 真实现：platform-dom.ts + browserEnv 装配（4 桩补真 + ~25 ops）

> **状态**: ✅ completed（2026-09-07 sddu-build；build 证据：base build 零错误 + 全包 test 356 通过（platform-dom.test 新增 38 全绿，node 注入 shim DOM 零第三方；含 v2 全量零回归 + 并发 Wave3 wait/page-eval/collect 产物）、lgdl-web 显式 tsc 零错误；platform.ts 4 桩内联 domOps 移除改为 createBrowserDomOps() 装配；4 桩 NotFoundError 文案 grep 零残留（platform.ts 余留 NotFoundError = clipboard/notify/filePicker/storage 等既有能力缝 + nodeEnv 桩，非 4 桩）；base 零新增 lgdl/react import；git diff 测试文件 0 删除行）

| 属性 | 值 |
|------|-----|
| **复杂度** | L |
| **前置依赖** | TASK-002、TASK-003 |
| **执行波次** | Wave 3（plan P1-b） |
| **对应 FR** | FR-003/016/017（+ FR-009~037 ops 实现面：read-state 升级/snapshotStructured/合成事件族/waitFor/evaluate/extractData/screenshot 等；S-01 4 桩补真归 v3） |
| **风险** | R-002（平台硬限制：截图 foreignObject/CSP、合成事件 isTrusted=false、Fullscreen 手势 → ADR-003/004 工程公开 + 失败转译 EC-008）；R-008（浏览器差异漂移 → Chromium 基线）；文件体量最大 → 按 ops 族分批实现、每族保持签名/转译一致 |

**输入**: plan §2.3.2（方法表 + dataUrl?）+ ADR-003（截图 foreignObject+canvas 零依赖 + 下载链）、ADR-004（native setter 基元 + 字符级 type + 回读校验）、ADR-005（wait 双通道 ops.waitFor 面）、ADR-007（locator 复用）、ADR-008（DOM 触碰收敛单文件）+ spec FR-003（4 桩补真）/FR-016/017 + §4.2 测试策略（真实行为 validate V13 冒烟承接）

**描述**: 新建 `platform-dom.ts` 提供 `createBrowserDomOps()`：浏览器面真实 PlatformDomOps 工厂，替换 browserEnv 现有 4 个转译桩（hover/scroll/zoom/fullscreen 不再抛 NotFoundError）并实现 ~25 个新 ops。**DOM 触碰全收敛本文件**（base 其余模块零 document 假设）；locator/sensitive 复用；授权失败统一 translateCapabilityError 转译。真实浏览器逐 op 行为断言由 validate V13 冒烟清单（TASK-012 移交）承接，本任务以类型/构建 + 无桩残留为门禁。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| NEW | packages/web-cli-base/src/platform-dom.ts |
| MODIFY | packages/web-cli-base/src/platform.ts（browserEnv domOps 装配 createBrowserDomOps()，4 桩移除） |

**验收标准**:
- [ ] `createBrowserDomOps()` 导出：hover（pointer/mouse 事件序列）/scroll（scrollBy/scrollTo/scrollIntoView/scrollTop）/zoom（根元素 zoom/transform 近似 + 恢复 100%）/fullscreen（Fullscreen API 进入/退出 + 手势失败转译）—— 4 桩 NotFoundError 文案 grep 零残留（FR-016/017/003）
- [ ] 感知 ops：interactives（含预算默认 200 可配 + password 只出类型不出值）/readElement（属性/文本/computed style/几何/交互状态/表单值 + 敏感脱敏）/findElements/readStructure/snapshotStructured（20k 默认预算 + maxLength 可配 + 截断标记 + 分页 offset/limit）与 read-state 升级（≥2 新字段，url/title 兼容）
- [ ] 交互/键盘 ops：dblclick/contextmenu/longPress(ms 可配)/dragDrop（HTML5 DnD 序列 + 不处理返回可读提示 EC-007）/focusEl·blurEl（可聚焦判定）/click 坐标偏移 opts/typeText（native setter + input/change 序列 = React 受控基元 + 字符级 keydown/input/keyup；ADR-004）/pressKey（修饰符组合）
- [ ] 写入 ops：setText/setAttr·removeAttr/setStyle/setValue/fillForm（控件类型路由 + requestSubmit + file input 显式不可用 NG-004）/addElement·removeElement；**写入后回读校验**（不一致 → 「事件已派发但值可能未同步」可读提示，不静默成功 EC-006）
- [ ] 横切/chrome/采集 ops：waitFor（MutationObserver + 轮询降级 + 统一超时含最后状态）/evaluate（宿主页同源上下文 + 预算）/extractData（table/list/links/images/meta）/printPage/historyNav/reloadPage/screenshot（foreignObject+canvas + dataUrl 下载链 + 尺寸/字节摘要；整页级返回「不支持 + F-14 归属」）
- [ ] 授权/能力失败统一 `translateCapabilityError` 转译（EC-008）；sensitive/locator 复用（text= 树走 + 敏感值脱敏）
- [ ] **AC-001**：platform.test.ts（nodeEnv 面）既有用例零回归零改写；新方法在 nodeEnv 不预置；base build + test 全绿
- [ ] 真实浏览器冒烟用例清单以测试注释预留在 platform-dom.ts 头部（V13 逐 ops ≥1 用例，validate 承接）

**验证命令**:
```bash
npm run build --workspace @lgdl/web-cli-base && npm run test --workspace @lgdl/web-cli-base
# 4 桩残留检查（期望零匹配）：
grep -n "NotFoundError\|转译桩" packages/web-cli-base/src/platform.ts || true
```

### TASK-005: dom 工具扩展：子命令族 7→27

> **状态**: ✅ completed（2026-09-06 sddu-build；build 证据：base build 零错误 + 全包 test 356 通过（含并行 Wave 3 TASK-004/006/007/008 落地模块）；dom-tools.test 既有 7+3 v2 用例零删除零改写全绿（git diff 0 删除行）+ 新增 v3 用例 5 个；lgdl-web vite build + 显式 tsc 零错误 = v2 调用方零破坏断言；AC-001 检查点③红线（既有 7 顺序保持 + v2 dom 用例零改写）满足）

| 属性 | 值 |
|------|-----|
| **复杂度** | L |
| **前置依赖** | TASK-001、TASK-003 |
| **执行波次** | Wave 3（plan P1-b） |
| **对应 FR** | FR-009~024 / FR-031~036（dom 工具面：PER 感知子命令 + INT 交互 + WR 写入族；read-state/snapshot 升级参数面） |
| **风险** | R-003（subcommandRisks 误伤 → 只读 read 免 ask / 写 ui·write ask 标注正确性由 dispatch 级断言兜底）；R-007（SUBCOMMANDS 既有 7 顺序保持，v2 dom 用例零回归） |

**输入**: plan §2.3.3（27 子命令枚举 + DOM_SCHEMA 合并扩展 + subcommandRisks 标注 + DOM_DESC/help 升级）+ ADR-008（工具面模块划分）+ §4.2 dom-tools.test 增补 + spec PER/INT/WR 组 FR + AC-002/003/006

**描述**: dom-tools.ts 由 7 → 27 子命令（**既有 7 顺序保持** + PER5 interactives/read-element/find/structure + INT8 dblclick/contextmenu/long-press/drag/focus/blur/type/press + WR8 set-text/set-attr/remove-attr/set-style/set-value/fill/add/remove；snapshot 升级为既有子命令扩展参数不加新名）。executor 按 §2.3.2 方法名映射到 PlatformDomOps 新方法；entry 增 `subcommandRisks`（read/ui/write 分组标注，§2.3.3 单一数据源）；DOM_SCHEMA flat args 合并扩展 + help 逐子命令用法/risk/合成事件局限（NG-007）/同源边界（NG-002）/敏感字段策略（FR-024）。DOM 触碰仍零（在 ops 面）。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| MODIFY | packages/web-cli-base/src/dom-tools.ts |
| MODIFY | packages/web-cli-base/src/dom-tools.test.ts |

**验收标准**:
- [x] `DomSubcommand`/`SUBCOMMANDS` 扩至 27（既有 7 顺序保持，头部不漂移）；schema `subcommand.enum` 同步 27
- [x] executor 映射全部新子命令 → PlatformDomOps 新方法（fake ops 注入桩可逐条驱动）；参数解析（dx/dy/percent/on/offsetX/offsetY/x/y/text/value/name/prop/classAction/fields/attrs/styles/mode/kind/item/limit/maxLength/submit/ms/from/to/key/mods/clear/combo…）；未知子命令/缺参 → 可读错误
- [x] entry 增 `subcommandRisks`：read 组（read-state/snapshot/interactives/read-element/find/structure）→ 'read'；ui 组（click/hover/scroll/zoom/fullscreen/dblclick/contextmenu/long-press/drag/focus/blur/press）→ 'ui'；write 组（type/set-text/set-attr/remove-attr/set-style/set-value/fill/add/remove）→ 'write'；entry.risk 保持 'ui'（回退面 = v2 元数据零变化）
- [x] DOM_DESC/domHelp：逐子命令用法 + risk 分级 + 合成事件局限（NG-007）+ 同源边界（NG-002）+ 敏感字段策略（FR-024）；DOM_SCHEMA args 全部可选 flat（保持 v2「一个 args 对象」调用形态）
- [x] dom-tools.test.ts：27 子命令注入桩逐条（事件序列/参数解析/EC-001·002·007 边界）+ **dispatch 级断言：只读子命令免 ask、写子命令 ask（IMP-4 修复验收 AC-009 机制侧）**
- [x] **AC-001**：v2 dom-tools.test 既有 7 子命令用例零删除零改写；既有 selector-only click 调用零回归（FR-020）；无参 snapshot 缺省输出兼容 v2 消费方（截断标记为附加元信息）
- [x] base build + test 全绿

**验证命令**:
```bash
npm run build --workspace @lgdl/web-cli-base && npm run test --workspace @lgdl/web-cli-base
```

### TASK-006: wait 工具（条件等待原语）

> **状态**: ✅ completed（2026-09-06 sddu-build；build 证据：wait-tools.ts + wait-tools.test.ts 两文件全 NEW，零既有文件改动（sleep.ts/dom-tools.ts 零触碰 = 红线①/②零冲突）；strict 与非 strict（base 测试脚本真实编译形态）双模式编译零错误；wait-tools.test 20 例全绿（条件解析矩阵 9 / 执行器委托与错误面 6 / ToolEntry·门禁语义·sleep 并存 4 / ADR-005 引擎契约占位 1）；sleep.test 15 既有零改动零回归；全仓 base build + test 356/356 全绿（Wave 3 五路并行全部收口后复核）；git diff 测试文件 0 删除行）

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-002、TASK-003 |
| **执行波次** | Wave 3（plan P1-b） |
| **对应 FR** | FR-025（WT 条件等待；与 sleep 并存零回归） |
| **风险** | R-002（SPA 时序/几何条件 observer 不直接覆盖 → 轮询降级通道 + 超时最后状态返回）；NFR-007 开销 → 观察者驱动不空转断言 |

**输入**: plan §3.4 方案 A + ADR-005（MutationObserver 优先 + 轮询降级 + 统一超时）+ §2.3.2 ops.waitFor 表行 + spec WT FR-025 + §4.2 wait-tools.test 测试策略

**描述**: 新建独立 wait 工具（与既有 sleep 固定延时区分、sleep 语义不破坏）：条件解析（element/text= 定位语法经 locator、kind 结构化 + 多条件 mode any/all）→ executor 调 ops.waitFor → 返回命中/超时 + 当前状态摘要。工具 risk:'read'（只读观察免 ask）。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| NEW | packages/web-cli-base/src/wait-tools.ts |
| NEW | packages/web-cli-base/src/wait-tools.test.ts |

**验收标准**:
- [x] wait 工具 schema：条件参数（kind: element/visible/interactable/gone/text + selector/text= + mode: any/all）+ timeout（默认可配，上限 30s 钳制）+ interval（默认 200ms）；help 与 sleep 语义区分说明
- [x] executor → ops.waitFor（PlatformDomOps 注入）；返回：命中 ok + 状态摘要；超时 ok:false + **最后观察状态摘要**（各条件当前满足与否/匹配数），不中断会话
- [x] 条件解析复用 locator（text= 语法面一致，O-011）；非法条件 → 可读错误 + 语法指引
- [x] wait-tools.test.ts：时钟注入断言 observer/轮询路径（NFR-007 无空转）+ 超时含最后状态 + any/all 语义 + sleep 并存零回归（sleep 模块零改动断言）
- [x] **AC-001**：sleep.test.ts 既有用例零改动零回归
- [x] base build + test 全绿

**验证命令**:
```bash
npm run build --workspace @lgdl/web-cli-base && npm run test --workspace @lgdl/web-cli-base
```

### TASK-007: page-eval 工具（宿主页 evaluate + 最高档门禁执行器面）

> **状态**: ✅ completed（2026-09-06 sddu-build；build 证据：page-eval.ts + page-eval.test.ts 两文件全 NEW（严格 tsc 零错误）；page-eval.test 11 例全绿（untrusted 拒 + 间谍断言 ops 未调 / trusted 放行执行 / 预算转发 / 异常·超时透传 / 未注入 / 审计含代码摘要 / dispatch 门禁端到端 fail-closed·deny·allow / 帮助面 P-01·CSP·NG-010 公开）；v2 零回归隔离子集 135 通过（eval-tools.test 零改动零回归 / sleep / router / permission / platform / audit / locator / sensitive，git diff eval-tools 0 行）；Wave 3 并行任务（TASK-004/005/006 文件在途）致全仓 tsc 暂不可整体编译 → 全仓 AC-001 收口由 TASK-012 复核，本任务仅 NEW 文件不改既有面）
| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-001、TASK-003 |
| **执行波次** | Wave 3（plan P1-b） |
| **对应 FR** | FR-037（+ FR-008 门禁联动执行器面 / EC-003/004 / NG-010 与 eval-js 语义区分） |
| **风险** | R-002/R-006（同步死循环不可中断平台硬约束 → 帮助面工程公开 P-01；untrusted 拒双闸 + 预算 + ask 摘要审计）；R-007（与 eval-js worker 沙箱语义显式区分，eval-tools.ts 零改动） |

**输入**: plan §3.1 方案 A + ADR-002（宿主页同源执行 + evaluate 档门禁 + untrusted 拒 + 预算）+ §2.3.3 工具面 + P-01 默认 + spec WR FR-037 + §4.2 page-eval.test 测试策略

**描述**: 新建独立 page-eval 工具（**不进 dom、不复用 eval-js**）：宿主页同源 JS 上下文执行（等效 F12 console；跨域仍 SOP = F-14）；entry.risk = 'evaluate'（TASK-001 门禁语义）；执行器层 untrusted 拒（须显式 `--trusted true`，缺省视为 untrusted）+ 代码长度预算 + 异常捕获 + 异步超时中止 + 审计代码摘要/来源/裁决。同步死循环不可中断 → 帮助面工程公开（P-01 默认）。与 eval-js（worker 无 DOM 面）在 help/schema 显式区分（NG-010）。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| NEW | packages/web-cli-base/src/page-eval.ts |
| NEW | packages/web-cli-base/src/page-eval.test.ts |

**验收标准**:
- [x] page-eval 工具 schema：code + trusted（默认 false）+ 表达式形态声明（as expression|script）+ 预算参数（codeMax/timeoutMs/maxLength）；entry.risk='evaluate'（无 subcommandRisks 场景单动词）；enabled 缺省语义留给场景（FR-043 默认关）
- [x] executor → ops.evaluate（PlatformDomOps 注入）；返回 = 序列化结果（JSON 可解析或文本）+ 预算截断标记；运行时异常/超时 → 可读错误 + 页面存活语义（EC-004 可达成子集，透传 ops ok:false 可读面）
- [x] untrusted 拒执行：无 `--trusted true` → ok:false + 「需 trusted 声明」可读错误（不降级执行、不截断执行，EC-003）；审计含代码摘要/来源/裁决（NFR-008，recordPageEvalAudit）
- [x] 帮助面：死循环不可中断工程公开（P-01）+ CSP unsafe-eval 约束 + 与 eval-js worker 沙箱语义区分（NG-010，DOM 有无/worker vs 宿主）
- [x] page-eval.test.ts：untrusted 拒 → 可读错误（fake op 间谍断言 ops.evaluate 未被调用）/ trusted + 门禁放行执行 / 异常·超时返回且可读 / 审计含代码摘要
- [x] **AC-001/零回归**：eval-tools.ts 零改动（NG-010 语义隔离，git diff 0 行）；全仓 build + test 收口由 TASK-012 复核（Wave 3 并行任务在途期以隔离子集 135 全绿为步内门禁）

**验证命令**:
```bash
npm run build --workspace @lgdl/web-cli-base && npm run test --workspace @lgdl/web-cli-base
```

### TASK-008: 采集域：CollectBuffer + collect-tools（extract/export）

> **状态**: ✅ completed（2026-09-06 sddu-build；build 证据：collect/collect-tools 双模块 4 文件全 NEW，零既有文件改动；strict 与非 strict 双模式编译零错误；33 新增用例隔离 + 全量套件均全绿；全仓 356 中 352 通过，其余 4 失败为并行 Wave-3 任务平台域在飞模块（platform-dom extractData/typeText/fillForm、dom v3 边界），与本任务文件零交集，待各自任务收口后随 TASK-012 全仓门禁复核）

| 属性 | 值 |
|------|-----|
| **复杂度** | L |
| **前置依赖** | TASK-001、TASK-002、TASK-003 |
| **执行波次** | Wave 3（plan P1-b） |
| **对应 FR** | FR-038/039/040/042（+ FR-041 xlsx 注入扩展点声明；COL 采集层 + 护栏/trust） |
| **风险** | R-005/R-010（采集结果爆上下文/注入文本回显 → buffer 不回流上下文 + 护栏单点 + trust 元数据 + 提示注入不回显执行）；R-002（RFC4180/序列化边界） |

**输入**: plan §3.5 方案 A + ADR-006（session 内存 CollectBuffer 通路）+ §2.3.5 数据流 + P-04 默认（内存态，刷新即失导出即落盘）+ spec COL FR-038~042 + §4.2 collect/collect-tools.test 测试策略

**描述**: 新建采集双模块：`collect.ts` = CollectBuffer（session 内存态，createCollectBuffer 工厂，组装点共享注入）+ `collect-tools.ts` = extract（声明式 kind：table/list/links/images/meta，selector 经 locator）+ export（text/json/csv 序列化 + RFC4180 转义 + 元数据头 + xlsx 注入扩展点声明 `xlsxSerializer?` 不默认实现）。数据不进 output 只回摘要；落盘经 env.filePicker.save/download 两路（save 手势拒绝 → 下载链降级 EC-012）；护栏单点（单次 maxItems 默认 200 + 总量上限 + 限速 300ms + 可选去重）+ trust 元数据（url/at/untrusted）+ sensitive 脱敏。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| NEW | packages/web-cli-base/src/collect.ts |
| NEW | packages/web-cli-base/src/collect.test.ts |
| NEW | packages/web-cli-base/src/collect-tools.ts |
| NEW | packages/web-cli-base/src/collect-tools.test.ts |

**验收标准**:
- [x] collect.ts：CollectBuffer append(id, rows, meta{url, at, trust:'untrusted'})/get/list/stats；createCollectBuffer() 工厂；护栏 = 单次 maxItems（默认 200 可配）/缓冲总量上限/限速间隔（默认 300ms 可配）+ 可选去重（行 JSON hash）
- [x] collect.test.ts：append/cap 触发/限速（时钟注入）/trust 元数据/截断标记/去重；超限中止保留已采数据（EC-011）
- [x] collect-tools.ts：extract 工具（只读 risk:'read'）——kind=table/list/links/images/meta 声明式抽取 → buffer 返回 {ok, 条数, bufferId, 截断标记}（**数据不进 output**）；无匹配返回空集 + 说明（非错误）
- [x] export 工具（risk:'write' 落盘 ask）——--format text/json/csv：csv RFC4180 转义（含逗号/引号/换行字段）；json 元数据头 {source url, collectedAt, trust}；经 env.filePicker.save/download 落盘两路；无落盘面 → 截断内容 + 长度降级（EC-012）
- [x] `.xlsx` 入参 → 「不支持 + csv 替代指引」；`createExportToolEntry(env, {buffer, xlsxSerializer?})` 注入扩展点类型声明存在（FR-041，不默认实现）
- [x] sensitive 联动：敏感页面内容采集脱敏（FR-024/EC-005）；提示注入文本不回显执行（v2 EC-007 语义延续，AC-008）
- [x] collect-tools.test.ts：fake ops 注入 JSON 行 → buffer → export 三格式 + 转义 + xlsx 指引 + 落盘两路（fake picker 成功/拒绝）
- [x] **AC-001**：v2 用例零回归（本任务全 NEW，无既有文件改动）；base build + test 全绿（collect 面 33 用例全绿；全仓 4 失败均在并行平台域在飞文件，非本任务）

**验证命令**:
```bash
npm run build --workspace @lgdl/web-cli-base && npm run test --workspace @lgdl/web-cli-base
```

### TASK-009: base index P1 导出 + lgdl-web 场景接入收口（IMP-4 修复生效点）

> **状态**: ✅ completed（2026-09-07 sddu-build；build 证据：base build 零错误 + 全包 test 369/369 全绿；lgdl-web vite build + 显式 tsc 零错误 + test 55/55 全绿（新增 4 场景用例：v3 P1 矩阵三链 / wait 全链 / extract→export 共享 buffer 落盘 / IMP-4 只读免 ask·写 ask·evaluate deny）；grep 断言 base 零 lgdl/react import 零 UI 代码；index.ts +40/-0 既有导出零删除；App aiPolicy 唯一有意变更 = IMP-4 修复（行为 diff 声明落 App/session 注释）；D-005 记录续记 session.test 派生断言改写有据 + AiPanel.tsx 以 buildPermissionAskEntry 连接器承载 AskQuestion 完整数据面（FR-044 数据链路实际可通，见 §5.2 交付说明））

| 属性 | 值 |
|------|-----|
| **复杂度** | L |
| **前置依赖** | TASK-001、TASK-005、TASK-006、TASK-007、TASK-008 |
| **执行波次** | Wave 4（plan P1-c） |
| **对应 FR** | FR-043/044（主体）/045/007（IMP-4 修复生效点）+ FR-001 deriveTools 顺序契约；AC-009 |
| **风险** | R-003/R-007（矩阵扩展改派生顺序 → D-005 改写有据 + F-23 顺序断言等价承接；IMP-4 修复为 App aiPolicy 唯一有意变更，行为 diff 声明）；FR-044 base 零 UI（grep 断言） |

**输入**: plan §2.2 lgdl-web 场景壳 + §2.3.5（session.ts 矩阵扩展单点）+ ADR-001（lgdl-web aiPolicy 子命令级规则落地）+ §4.2 测试策略 + spec LGDL FR-043~045 + §5.2 lgdl-web 文件行 + §5.1 index.ts 行

**描述**: P1 收口任务（跨包）：①base `index.ts` 追加导出面（DomSubcommand 新值 + locator/sensitive/platform-dom/wait/page-eval/collect/collect-tools 类型与工厂，NFR-006）；②lgdl-web `session.ts` 默认矩阵扩展 P1 集（dom27 已注册不动 + wait/extract/export（共享 CollectBuffer）+ page-eval enabled:false）；③`App.tsx` aiPolicy 升级子命令级规则（既有 `{risk:'ui', action:'ask'}` 保持 + 只读免 ask = IMP-4 修复生效点 + page-eval 缺省 deny 说明 FR-045）；④`AskDialog.tsx` ask 呈现主体扩展（子命令名/risk + page-eval 代码摘要 FR-044 + 敏感字段写入确认文案）。env 组装点以 createBrowserDomOps 为浏览器 domOps 面（4 桩消失落地，TASK-004 产物接线）。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| MODIFY | packages/web-cli-base/src/index.ts |
| MODIFY | packages/lgdl-web/src/ai/session.ts |
| MODIFY | packages/lgdl-web/src/ai/session.test.ts |
| MODIFY | packages/lgdl-web/src/App.tsx |
| MODIFY | packages/lgdl-web/src/ai/AskDialog.tsx |

**验收标准**:
- [x] base index.ts：导出 DomSubcommand 新值 + locator/sensitive/platform-dom（createBrowserDomOps）/wait/page-eval/collect/collect-tools 类型与工厂（NFR-006）；既有导出零删除（git diff +40/-0）
- [x] session.ts：矩阵注册 wait/extract/export（createCollectToolEntries 共享 createCollectBuffer 注入）+ page-eval（enabled:false，schema 不含/help 标注/派发报禁用 v2 FR-004 语义沿）；dom 既有注册不动；env.dom.ops = createBrowserDomOps() 装配（browserEnv 真实现生效，deps.env.dom.ops 覆盖缝保留）
- [x] session.test.ts：矩阵派生断言改写有据（D-005 记录 §4.3）——启用集 → schema/help/dispatch 三链与矩阵一致；page-eval 禁用三链；派生顺序不漂移断言承接 F-23（FR-001/AC-001）
- [x] App.tsx aiPolicy：子命令级规则——只读子命令（read-state/snapshot/read-element/find/interactives/structure）免 ask 放行、UI 写/敏感子命令默认 ask、evaluate 缺省 deny（FR-007/045）；**行为 diff 声明：IMP-4 修复为唯一有意变更**（rules 共用 session 导出 LGDL_DEFAULT_POLICY_RULES 单一数据源）
- [x] AskDialog.tsx：ask 呈现含子命令名/risk + page-eval 代码摘要（summarizeCode）+ 敏感字段写入确认文案（FR-044 主体；save/截图/剪贴板授权提示尾项归 TASK-011）；AiPanel 经 buildPermissionAskEntry 注入完整 AskQuestion 数据面
- [x] **AC-001**：F-23 既有 session 用例语义等价保留（派生顺序断言改写有据）；v2 既有矩阵注册顺序保持
- [x] lgdl-web vite build + 显式 tsc 零错误；base + lgdl-web test 全绿（369 + 55）；grep 断言 base 无 UI 代码/lgdl·react import 新增（FR-044/AC-011）

**验证命令**:
```bash
npm run build --workspace @lgdl/web-cli-base && npm run test --workspace @lgdl/web-cli-base && npm run build --workspace @lgdl/lgdl-web && npx tsc --noEmit -p packages/lgdl-web/tsconfig.json && npm run test --workspace @lgdl/lgdl-web
```

### TASK-010: chrome 工具（print/back/forward/reload/screenshot）

> **状态**: ✅ completed（2026-09-06 sddu-build；build 证据：chrome-tools.ts + chrome-tools.test.ts 两文件全 NEW（严格 tsc 零错误 + 非 strict 测试编译零错误）；chrome-tools.test **13 例全绿**（元数据面/schema enum/subcommandRisks/help 公开 · fake ops print·back·forward·reload 透传 + reload 恢复提示兜底不重复（EC-009）· 未知子命令/整面未注入/子能力未注入 · screenshot 视口/元素级参数解析透传 + fullpage out 短路间谍 + 缺参/非法参数矩阵 · dataUrl 摘要 {尺寸/字节/文件名} + 自动下载链 + dataURL 不进上下文 · --include-dataurl 预算内头段 + 截断标记 · 下载链降级未注入/授权拒绝 ok:false 不静默丢数据 · EC-008 授权两路转译 + 会话不中断 · dispatch reload deny 执行器间谍不调用（EC-014）· back/forward 免 ask 规则面 allow→零 ask / 无规则 ask / ask deny 拒 · summarize/parsePng/screenshotFilename 单元）；**base build + 全包 test 369/369 全绿**（356 v2 基线 + 13 新增；v2 既有用例零删除零改写，本任务 2 文件全 NEW 未触碰既有文件）；AC-001 检查点红线满足）

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-001、TASK-003 |
| **执行波次** | Wave 5（plan P2-a；代码面与 P1-b 无耦合，可提前并行 —— 缺省按 plan 阶段序执行） |
| **对应 FR** | FR-026/027/028（CHR chrome 操作层 + subcommandRisks 标注） |
| **风险** | R-002（打印/截图真实可达性 + reload 破坏性语义 → 转译 + ask 兜底 EC-008/009）；R-005（dataUrl 上下文爆炸 → ADR-003 自动下载 + 摘要，P-03 默认） |

**输入**: plan §3.2 方案 A（截图近似）+ ADR-003（截图输出策略 + 整页 out）+ §2.3.3（chrome 5 子命令 + subcommandRisks：print=ui/back·forward=ui（EC-009 场景免 ask）/reload=write/screenshot=write）+ §4.2 chrome-tools.test + spec CHR FR-026~028

**描述**: 新建 chrome 工具模块：5 子命令 print（window.print 触发）/back/forward（会话内 history）/reload（破坏性默认 ask + 恢复提示 EC-009）/screenshot（元素/视口级近似 + 整页 out）。executor → PlatformDomOps（printPage/historyNav/reloadPage/screenshot，TASK-004 真实现/fake ops 注入）。截图输出策略 = 默认自动下载链 + 尺寸/字节摘要（dataURL 不进上下文）；`--include-dataurl true` 预算内回带头段（P-03）。entry 增 subcommandRisks。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| NEW | packages/web-cli-base/src/chrome-tools.ts |
| NEW | packages/web-cli-base/src/chrome-tools.test.ts |

**验收标准**:
- [x] chrome 工具 schema：5 子命令 + 参数（format/selector/include-dataurl 等）；entry 增 subcommandRisks：print→'ui'、back/forward→'ui'（场景规则免 ask 面 EC-009 由 TASK-011 App 规则落地）、reload→'write'、screenshot→'write'
- [x] executor → ops.printPage/historyNav/reloadPage/screenshot；未知子命令/缺参 → 可读错误
- [x] screenshot 输出：默认返回 {尺寸/字节/文件名} 摘要 + 自动触发下载链（env.filePicker.download 降级锚点）；--include-dataurl 预算内头段 + 截断标记；整页级入参 → 「不支持 + F-14/CDP 归属」说明
- [x] help：打印对话框用户侧确认语义 / reload 破坏性提示（重载后需重新 read-state/恢复会话，EC-009）/截图近似度局限公开（ADR-003）
- [x] chrome-tools.test.ts：fake ops 各子命令 + reload deny 后执行器不调用（间谍）+ 授权两路转译（EC-008）+ 截图 dataUrl 摘要/下载链断言 + back 免 ask 规则面（规则配置下 allow，无规则 ask）
- [x] **AC-001**：v2 用例零回归（本任务全 NEW）；base build + test 全绿

**验证命令**:
```bash
npm run build --workspace @lgdl/web-cli-base && npm run test --workspace @lgdl/web-cli-base
```

### TASK-011: P2 接线收口：chrome/save/notify/clipboard 入矩阵 + chrome 规则 + AskDialog 尾项

> **状态**: ✅ completed（2026-09-07 sddu-build；build 证据：base build 零错误 + 全包 test **369/369** 全绿（356 v2 基线 + TASK-010 chrome 13 新增零回归）；lgdl-web vite build + 显式 tsc 零错误 + test **58/58** 全绿（新增 3 场景用例：v3 P2 矩阵三链 / chrome back·forward 免 ask·reload ask·clipboard 读写 ask 场景策略 / FR-041 export .xlsx 不支持 + csv 指引矩阵链路）；grep 断言 clipboard.ts/notify.ts/save-file.ts **零改动**（git diff 零命中，仅接线零逻辑改动红线）；base index.ts chrome 导出收口既有导出零删除（git diff 纯增无删行）；LGDL_DEFAULT_POLICY_RULES 增 chrome back/forward 前置 allow + clipboard 读写显式 ask（App aiPolicy 单源自动携带，不破坏 IMP-4 修复 = AC-001 检查点④）；v2 既有注册顺序保持（D-005 记录续记 session.test 派生断言改写有据）；真实浏览器授权两路用例清单写入 session.test 注释（validate 承接 AC-005）；build.md v1.8 §10 记录）

| 属性 | 值 |
|------|-----|
| **复杂度** | L |
| **前置依赖** | TASK-009、TASK-010 |
| **执行波次** | Wave 6（plan P2-b） |
| **对应 FR** | FR-029/030（+ FR-026~028 矩阵呈现、FR-044 尾项：save/截图/剪贴板授权提示、FR-041 矩阵级断言） |
| **风险** | R-009（P2 尾项 + v2 收口基线时序 → 独立成波不阻塞 P0/P1；收口项标注「待基线」不阻塞其余）；session.ts/App.tsx 二次改动 → 与 TASK-009 串行（v2 session.ts 两阶段先例） |

**输入**: plan §2.6 波3（P2=chrome/接线/边界）+ §4.4 交接表波3行 + ADR-001（chrome back/forward allow 规则前置）+ §5.2 lgdl-web 文件行（S-06 save/notify/clipboard 入默认矩阵）+ §5.1 index.ts 收口行 + spec FR-029/030/041/044 尾项

**描述**: P2 接线收口（lgdl-web session.ts/App.tsx/AskDialog.tsx 第二段顺序扩展，串行于 TASK-009）：session.ts 矩阵增量注册 chrome（TASK-010 产物）+ save/notify/clipboard（v2 既有工厂，仅接线零逻辑改动——clipboard 读 ask 写 ask 经 App 子命令级规则表达，不修改 clipboard.ts）；App.tsx 增 chrome back/forward allow 前置规则；AskDialog.tsx 补 save/截图/剪贴板授权路径提示尾项；base index.ts 追加 chrome 导出收口。FR-041 xlsx 边界在矩阵链路断言（export xlsx 入参可读不支持 + csv 指引）。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| MODIFY | packages/web-cli-base/src/index.ts（chrome 导出追加收口） |
| MODIFY | packages/lgdl-web/src/ai/session.ts（chrome/save/notify/clipboard 矩阵增量） |
| MODIFY | packages/lgdl-web/src/ai/session.test.ts（矩阵增量断言） |
| MODIFY | packages/lgdl-web/src/App.tsx（chrome back/forward allow 前置规则） |
| MODIFY | packages/lgdl-web/src/ai/AskDialog.tsx（save/截图/剪贴板授权提示尾项） |

**验收标准**:
- [x] base index.ts：chrome-tools 类型与工厂导出收口（NFR-006）；既有导出零删除
- [x] session.ts：矩阵增 chrome 5 子命令 + save（schema/help/dispatch 可查可调，FR-029）+ notify（默认开，授权失败转译 FR-030）+ clipboard（读=敏感 ask / 写=ask）；page-eval 保持禁用缺省
- [x] App.tsx：`{pattern:'chrome', subcommand 匹配 back/forward, action:'allow'}` 前置规则 + 既有 risk:'ui' ask 规则保持 + evaluate deny（EC-009：会话内导航不触发 ask）
- [x] AskDialog.tsx：save/截图/剪贴板授权路径提示文案（FR-044 尾项）；save 手势拒绝 → 下载链降级提示（EC-012）
- [x] session.test.ts：矩阵增量断言（chrome/save/notify/clipboard 入列 + page-eval 仍禁用 + back/forward 免 ask 场景规则命中、reload ask、clipboard 读 ask/写 ask）；FR-041 矩阵链路断言（export .xlsx → 不支持 + csv 指引）
- [x] **AC-001/零回归**：v2 既有注册顺序保持；clipboard.ts/notify.ts/save-file.ts 逻辑零改动（grep 断言）；lgdl-web vite build + 显式 tsc 零错误；base + lgdl-web test 全绿
- [x] 真实浏览器授权两路（save 成功/拒绝、clipboard roundtrip、notify 两路转译）用例清单写入测试注释（validate 承接，AC-005）

**验证命令**:
```bash
npm run build --workspace @lgdl/web-cli-base && npm run test --workspace @lgdl/web-cli-base && npm run build --workspace @lgdl/lgdl-web && npx tsc --noEmit -p packages/lgdl-web/tsconfig.json && npm run test --workspace @lgdl/lgdl-web
```

### TASK-012: 全仓门禁 + AC-001 收口 + validate 冒烟/基线移交

> **状态**: ✅ completed（2026-09-07 sddu-build；build 证据：build.md v1.9 §11 + §12 —— 全仓门禁 9 包 build 零错误 + 全仓 test **895 pass / 1 skip / 0 fail**（base **369/369** = v2 提交基线 205 零删除 + 164 新增/增补零降级；lgdl-web **58/58** = v2 基线 51 + 7 净增；lgdl-core 267 / lgdl-render 94+1skip 预存 B11 env-gated / lgdl-router 8 / lgdl-web-cli 84 / lgdl-web-op-cli 15 与 v2 逐字节一致；lgdl-cli/lgdl-layout dist 无测试产物 = v2 同口径）+ lgdl-web vite build + 显式 tsc --noEmit 零错误 + base 独立构建零错误（NFR-006）；grep 断言 5 项零残留（G1 lgdl/react/业务 import 零命中 / G2 UI 代码零命中（无 .tsx + React 组件标识零） / G3 策略旁路零（写/evaluate ops 仅经 router.dispatch → PermissionGate.check，deny 先于执行器） / G4 4 转译桩文案零残留（v2「最小桩/浏览器面冒烟承接」文案全仓零命中；platform-dom 4 ops 真实现 hover:817/scroll:830/zoom:889/fullscreen:918） / G5 xlsx/截图零第三方依赖（package.json git diff 零变更））；D-005 核验通过（v2 23 base + 4 lgdl-web 测试文件零删除；既有测试文件删除行 = 0；session.test -14 行全为 import/注释头改写非用例、2 标题矩阵改写有据 §4.3）—— AC-001 收口确认；validate 移交清单已落盘（§11.5 冒烟 7 面 S1~S7 + §11.6 v2 收口 3 项基线关联表「待基线」不阻塞 FR-004/O-010 v0.7 同批）；游离产物清理 1 件（src/locator.js）在案。12/12 任务全部 completed，下一步 = @sddu-review specs-tree-web-cli-base-v3

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-001 ~ TASK-011 全部 |
| **执行波次** | Wave 7（GATE / plan P2-c） |
| **对应 FR** | FR-001/003/004（+ AC-001~012 收口、NFR-001/002/003/006、D-005 核验） |
| **风险** | R-009（v2 收口 3 项人工基线未闭合 → 标注「待基线」不阻塞本任务与其余验收，validate 承接）；R-007（收口回归发现 → 按 additive 契约修复） |

**输入**: plan §4.2 门禁清单 + §5.3 不改动面 + ADR-008（零回归承载）+ spec AC-001~012 + NFR/EC 汇总 + FR-004（v2 收口基线承接 + v0.7 同批登记）

**描述**: 全 Feature 收口任务（门禁验证 + 移交文档，无源码业务改动）：全仓零回归 + 构建门禁 + grep 断言零残留 + D-005 测试守恒核验 + validate 输入面预备（真实浏览器冒烟清单 V13 扩展 + v2 收口 3 项基线关联表）。8 ADR 保持内嵌 plan §7 不单独落盘（沿用 v2 先例）。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| —（门禁验证 + 移交清单，无业务源码改动） | 全仓（packages/web-cli-base + packages/lgdl-web + …） |

**验收标准**:
- [x] 全仓 build + test 全绿（含 v2 基线零回归：router/delay/permission/dom 7/session/sleep 等既有用例零删除零降级 —— AC-001/AC-010）
- [x] lgdl-web vite build + 显式 tsc --noEmit 零错误；base 独立构建零错误（NFR-006）
- [x] grep 断言零残留：base 无 lgdl/react/业务 import 新增（NFR-001/AC-011）；base 无 UI 代码（NG-008/FR-044）；无策略旁路实现（evaluate/写无绕过门禁，NFR-002/AC-007）；4 转译桩文案零残留（AC-003）；xlsx/截图无第三方库依赖新增（NFR-001）
- [x] D-005 核验：测试增删记录完整（§4.3 表核对：v2 用例零删除；session.test.ts 派生断言改写有据）—— AC-001 收口确认
- [x] 冒烟清单预备（validate 输入面）：platform-dom 逐 ops ≥1 真实用例（V13 方法扩展）+ lgdl-web React 受控表单 type/fill/set-value 值变更（NFR-004）+ SPA 动态 wait + 截图尺寸 + chrome 授权两路 + 采集端到端 —— 写入 validate 移交清单（build.md §11.5）
- [ ] v2 收口基线关联表：v2 遗留 3 项（真实 AI 闭环 AC-008、lgdl-web React 集成手测、web-search 真实端点）作为 v3 写入/键盘/evaluate 类验收的前置或并行人工基线（标注「待基线」不阻塞，FR-004/O-010 同批 v0.7 登记）—— validate 报告承接

**验证命令**:
```bash
npm run build && npm test && npx tsc --noEmit -p packages/lgdl-web/tsconfig.json
```

---

## 3. 任务汇总

> 任务数量、复杂度和波次的统计总览

| 统计项 | 数值 |
|--------|:--:|
| 总任务数 | 12 |
| S 级 (简单) | 0 |
| M 级 (中等) | 6（TASK-002/003/006/007/010/012） |
| L 级 (复杂) | 6（TASK-001/004/005/008/009/011） |
| 执行波次 | 7 |
| plan 波次覆盖 | P0×1（TASK-001）/ P1×8（TASK-002~009）/ P2×3（TASK-010~012） |

> 注：任务数取 plan §4.4 交接行按依赖与文件所有权整合——机制层（router+permission）合 1 任务（TASK-001）；纯逻辑 locator+sensitive 合 1 任务（TASK-002）；platform.ts 类型层独立于 platform-dom 实现拆 2 任务（TASK-003→TASK-004 串行）以最大化 P1 并行面；同域双模块 collect+collect-tools 合 1 任务（TASK-008）；lgdl-web 组装分两阶段（TASK-009 P1 矩阵 → TASK-011 P2 接线，session.ts/App.tsx/AskDialog.tsx 顺序扩展，非并行）；chrome 独立成任务（TASK-010）按 plan 阶段序置 P2（代码面可与 P1-b 并行）；TASK-012 = 收口门禁 + validate 基线移交。8 ADR 内嵌 plan §7，不单独落盘（沿用 v2 先例）。

---

## 4. 执行策略

> 各波次的执行说明

| 波次 | 任务 | 策略 |
|:--:|------|------|
| 1 | TASK-001 | 串行启动（机制层先行：effectiveRisk/evaluate 门禁就绪才放写与 evaluate 域工具，plan「先机制后域」） |
| 2 | TASK-002, TASK-003 | 并行（纯逻辑 locator+sensitive / platform.ts 类型扩展；互不依赖、零冲突；均无 P0 依赖，按阶段序置 Wave 2） |
| 3 | TASK-004, TASK-005, TASK-006, TASK-007, TASK-008 | 并行（浏览器真实现 / dom 工具 / wait / page-eval / 采集域 五路互不阻塞，各持独立文件，仅依赖 Wave 1/2 产物） |
| 4 | TASK-009 | 串行收口 P1（base index 导出 + lgdl-web 场景接入——依赖 P1-b 模块建成；session.ts 第一段扩展） |
| 5 | TASK-010 | chrome 工具（依赖 001/003 类型与门禁；代码面与 P1-b 无耦合可提前并行，缺省按 plan 阶段序） |
| 6 | TASK-011 | 串行（P2 接线收口：session.ts 第二段扩展 + App chrome 规则 + AskDialog 尾项 + index chrome 导出） |
| 7 | TASK-012 | 收尾门禁（全部完成后跑全仓 + grep + 基线移交） |

**关键原子性提醒**：
- **ToolEntry/PlatformDomOps additive 契约（FR-001/002）**：TASK-001 只加可选字段（subcommandRisks）+ 枚举值（'evaluate'），TASK-003 只加可选方法 + dataUrl?——v2 调用方编译零破坏为每步门禁；F-23 顺序契约断言（router.test.ts:153 / session 派生顺序）零回归
- **先机制后域**：TASK-005（dom 写子命令）/TASK-007（page-eval）/TASK-008（export 落盘 ask）依赖 TASK-001 的 effectiveRisk/evaluate 门禁语义，未装配前不得放行写/evaluate 域实现
- **lgdl-web session.ts/App.tsx/AskDialog.tsx 顺序扩展**：TASK-009（P1 矩阵主体 + IMP-4 规则 + AskDialog 主体）→ TASK-011（P2 增量 + chrome 规则 + AskDialog 尾项）为同一批文件的串行波次改动，非并行
- **platform.ts 两任务串行**：TASK-003 只改类型声明面（不接线）→ TASK-004 建 platform-dom 并装配 browserEnv（4 桩移除）；避免类型未就绪即实现的双向依赖
- **每步沿用「相关包 build + test 绿」门禁**（base 测试通配自动纳入平铺 src 根的新测试文件；lgdl-web 为显式列表）
- **test 文件平铺**：所有新增 base 测试文件平铺 packages/web-cli-base/src/ 根（兼容 `tsc src/*.test.ts` 通配脚本）
- **零新增依赖**：全部任务禁引第三方库（截图/xlsx 等以 Web 标准 API / 扩展点声明达成，NFR-001/NG-005）；root package.json/CI 零改动
- **v2 不改动面保持**：runner/delay/audit/eval-tools 逻辑主体零改动（NG-010 语义隔离由 TASK-007 grep 守护）；clipboard/notify/save-file 仅随矩阵接线零逻辑改动（TASK-011 grep 守护）

### 4.1 AC-001 BehaviorRetention：与 v2 零回归检查点安排

> v2 零回归（AC-001/v2 FR-043 延续）= 每步门禁 + 收口专项；「专项检查」列 = 该任务完成后立即跑相关包既有用例，「收口核验」列 = TASK-012 全仓复核

| 检查点 | 任务 | v2 既有用例范围 | 零回归红线（每步验收） |
|:--:|------|-----------------|----------------------|
| ① 机制层 | TASK-001 | router.test（13 例，含 :153 派生顺序断言）/ permission.test | ToolEntry/PolicyRule 只加可选字段；无 subcommandRisks 工具行为逐字节同 v2；既有用例零删除零改写 |
| ② 纯逻辑/类型 | TASK-002/003 | platform.test（nodeEnv 面）/ 全包既有 | PlatformDomOps 既有 7 方法签名零改动；新方法全可选缺省 undefined；nodeEnv 行为不变 |
| ③ 域实现层 | TASK-004~008 | dom-tools.test（7 子命令既有用例）/ sleep.test / eval-tools.test / 全包既有 | SUBCOMMANDS 既有 7 顺序保持；snapshot 无参输出兼容；sleep 语义零破坏；eval-tools 零改动（NG-010）；NEW 模块不改既有文件 |
| ④ 场景收口 | TASK-009/011 | session.test（派生顺序/600ms/既有注册）/ App 行为 | 既有注册顺序保持；session 派生断言改写有据（D-005 §4.3，矩阵派生断言承接等价覆盖）；App aiPolicy 唯一有意变更 = IMP-4 修复（行为 diff 声明） |
| ⑤ 收口专项 | TASK-012 | **全仓**（v2 基线全量） | 全仓专项测试零回归全绿；deriveTools 顺序断言不漂移；D-005 增删记录核验；4 桩文案零残留；测试守恒（只增不减） |

> 执行约定：每任务验收首条即其检查点红线（见各任务「AC-001」验收项）；⑤在 TASK-012 全仓复核后向 validate 移交（AC-010 双轨：node 注入面全绿 + 真实浏览器冒烟清单 = validate 报告承接）。

### 4.2 关键并行组摘要（build 可同时开工的任务簇）

| 并行簇 | 任务 | 前提（先完成） |
|------|------|------|
| A：机制基座 | TASK-001 | 无 |
| B：纯逻辑/类型层 | TASK-002 + TASK-003（并行） | 无（可与 A 并行，按阶段序置后） |
| C：域实现五路 | TASK-004 + TASK-005 + TASK-006 + TASK-007 + TASK-008（并行） | A + B（各层互不阻塞：浏览器实现/dom/wait/page-eval/采集 各持独立文件） |
| D：场景收口 | TASK-009 | C（P1 模块建成 + index 导出） |
| E：chrome/接线 | TASK-010（代码面可并入 C 并行）→ TASK-011 | A + B → D + TASK-010 |
| F：全仓门禁 | TASK-012 | A~E 全部 |

**分层互不阻塞说明**：感知/交互/写入（dom-tools）/横切（wait）/F12（page-eval）/采集（collect）六能力线在 C 簇并行——它们之间无文件冲突（platform-dom 单文件收敛 DOM、各工具模块只依赖 ops 接口 + 纯逻辑），任一模块先完成即可独立验收（fake ops 注入桩全链单测）。

### 4.3 D-005 测试增删依据记录

| 既有/新测试 | 操作 | 依据（被何承接） |
|---------|------|-----------------|
| v2 router.test.ts 13 例 | 保留 + 增补（TASK-001） | additive 零回归；effectiveRisk/evaluate 门禁专项为增补用例 |
| v2 permission.test.ts | 保留 + 增补（TASK-001） | ToolRisk 'evaluate'/subcommand glob/EC-013 优先级为增补用例 |
| v2 platform.test.ts | 保留 + 增补（TASK-003/004） | 类型扩展编译断言 + nodeEnv 不预置；真实行为由 validate V13 冒烟承接 |
| v2 dom-tools.test.ts（7 子命令） | 保留 + 增补（TASK-005） | 27 子命令注入桩 + dispatch risk 断言；既有 7 用例零改写 |
| v2 sleep.test.ts / eval-tools.test.ts | 保留零改动（TASK-006/007） | sleep 语义零回归；page-eval 与 eval-js 语义隔离（NG-010） |
| v2 session.test.ts（派生顺序/600ms/矩阵） | 改写增补（TASK-009 → TASK-011） | 矩阵扩展后派生顺序断言改写有据；既有语义用例等价保留，矩阵派生断言承接（FR-043/AC-007） |
| v2 lgdl-web provider.test.ts / App 手测基线 | 保留（TASK-009/011） | provider 无涉；App aiPolicy 变更由 session.test 场景断言 + validate AI 闭环承接 |
| 新测试文件（locator/sensitive/collect/collect-tools/wait-tools/page-eval/chrome-tools.test.ts） | NEW（平铺 src 根） | 各模块注入桩全链单测（NFR-006），自动纳入 base 通配测试 |

### 4.4 validate 预备移交（本任务面不执行）

build 完成后，validate 阶段以 AC-002~012 为准执行：①platform-dom 逐 ops ≥1 真实浏览器用例（V13 方法扩展：hover/scroll/zoom/fullscreen 实际生效、React 受控表单 type/fill/set-value、SPA wait、截图尺寸、chrome 授权两路）；②采集端到端（真实多页列表 extract→翻页原语→export 三格式 + 护栏触发 + trust 元数据）；③v2 收口 3 项基线关联（FR-004：真实 AI 闭环 AC-008 / lgdl-web React 集成手测 / web-search 真实端点 —— 标注「待基线」并行不阻塞）；④行为等价/声明改进 diff。真实浏览器面测试不属于本 12 任务的验证命令（node 注入面 + 门禁为 build 责任；冒烟清单由 TASK-012 移交）。

---

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建：基于 plan §2.6 波次先序 + §4.4 交接表（P0 1 行/P1 7 行/P2 2 行）+ §5 文件影响面拆分为 12 原子任务 / 7 执行波次。机制层合并（permission+router 一件）；纯逻辑/类型层拆并行（locator+sensitive、platform.ts 类型）；platform.ts 类型层与 platform-dom 实现拆两任务串行（TASK-003→TASK-004）最大化 P1 并行面；域实现五路并行（platform-dom/dom/wait/page-eval/collect）；lgdl-web 组装分两阶段（TASK-009 P1 矩阵 → TASK-011 P2 接线，session.ts/App.tsx/AskDialog.tsx 顺序扩展）；chrome 独立 P2 任务；TASK-012 收口门禁 + validate 基线移交。红线落地：additive 契约（subcommandRisks/ToolRisk 'evaluate'/PlatformDomOps 可选方法）、先机制后域（TASK-005/007/008 依赖 TASK-001）、AC-001 v2 零回归每步门禁 + 收口专项（§4.1 检查点）、测试守恒 D-005 记录 §4.3。12 任务中 base 10 / lgdl-web 跨包 1 / 全仓 1；测试文件全部平铺 src 根兼容 base 通配脚本 | 2026-09-06 | SDDU Tasks Agent |
