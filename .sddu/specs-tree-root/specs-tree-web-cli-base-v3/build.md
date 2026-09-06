# 构建报告：web-cli-base-v3（AI 操作浏览器的完整工具集——子命令级权限分级 + evaluate 最高门禁）

> **文档定位**: SDDU 构建报告 — 记录全部任务的文件变更和实现结果，作为 review 阶段的输入
> **前置依赖**: tasks.md（任务清单）、plan.md（技术方案）、spec.md（需求规范）
> **创建人**: SDDU Build Agent
> **创建时间**: 2026-09-06
> **版本**: v1.9
> **更新人**: SDDU Build Agent
> **更新时间**: 2026-09-07
> **更新说明**: v1.9 — 追加 Wave 7 / GATE 收口 TASK-012（全仓门禁 + AC-001 收口 + validate 冒烟/基线移交，无源码业务改动）：全仓 build（9 包 tsc/vite）零错误 + 全仓 test **895 pass / 1 skip（预存 B11 env-gated）/ 0 fail**（base 369 + lgdl-web 58 增量零回归；v2 提交基线 base 205 + lgdl-web 51 → 现 +164/+7 全为新增增补，既有用例零删除零降级 = AC-001/AC-010）+ lgdl-web vite + 显式 tsc 零错误（NFR-006）+ grep 断言 5 项零残留（lgdl/react/业务 import / UI 代码 / 策略旁路 / 4 桩文案 / xlsx·截图依赖）+ D-005 测试守恒核验（v2 23 测试文件零删除，session.test 14 删除行全为 import/注释头改写非用例）+ validate 冒烟移交清单（platform-dom 31 ops 逐 ops ≥1 真实用例 + React 受控表单 + SPA wait + 截图 + chrome 授权两路 + 采集端到端，V13 方法扩展）+ v2 收口 3 项基线关联表（真实 AI 闭环 AC-008 / lgdl-web React 集成手测 / web-search 真实端点 → 标注「待基线」不阻塞，validate 承接）。本 Feature **12/12 任务全部 completed**（TASK-004/007 记录在 tasks.md 各自状态头；TASK-012 记录见 §11）。

## 1. 构建概要
> 本次构建的整体统计（范围 = TASK-005，Wave 3 / P1-b 域实现层 dom 工具；§7 = TASK-005 构建记录）

| 维度 | 数值 |
|------|:--:|
| 完成任务数 | 1 / 12（本版新增 TASK-005；本报告累计记录 6 = TASK-001/002/003/005/006/008） |
| 复杂度分布 | S×0 / M×0 / L×1（本次范围；累计 S×0 / M×3 / L×3） |
| 新增文件 | 0 个（本次全 MODIFY） |
| 修改文件 | 2 个（dom-tools.ts +616/-35；dom-tools.test.ts +387/-0） |

TASK-005 验证门禁（验收命令）全绿：
- `npm run build --workspace @lgdl/web-cli-base` → tsc 零错误
- `npm run test --workspace @lgdl/web-cli-base` → 全包 **356/356 通过**（含并行 Wave 3 TASK-004/006/007/008 已落地模块；dom-tools.test 12 用例 = v2 既有 7+ask-user 3 零改写全绿 + v3 新增 5）
- v2 零回归（AC-001 检查点③）：dom-tools.test.ts 既有 7 子命令用例**零删除零改写**（git diff numstat 387/0，0 删除行）；SUBCOMMANDS 既有 7 顺序保持（dispatch/schema 断言）；selector-only click 零回归（FR-020）；无参 snapshot 缺省路径逐字节同 v2
- lgdl-web vite build + 显式 tsc 零错误 = v2 调用方编译零破坏断言（entry risk:'ui' 回退面零变化）

> 下节为 v1.2（TASK-002）/ v1.1（TASK-003）/ v1.0（TASK-001）门禁记录，保持可追溯。

验证门禁（TASK-002 验收命令）全绿：
- `npm run build --workspace @lgdl/web-cli-base` → tsc 零错误
- `npm run test --workspace @lgdl/web-cli-base` → 全包 **249/249 通过**（新增 locator.test 17 + sensitive.test 17 = 34 用例；v2 既有 + TASK-001/003 增补全量零回归）
- v2 零回归（AC-001 检查点②）：platform.test（nodeEnv 面）/ router / permission / dom 7 等既有用例零删除零改写全绿（git diff 测试文件 0 删除行）；本任务零触碰既有文件（4 文件全 NEW）
- 两模块零 DOM/lgdl/react import（grep 断言零命中），零新增运行时依赖（NFR-001/AC-011）

> 下节为 v1.1（TASK-003）与 v1.0（TASK-001）门禁记录，保持可追溯。

验证门禁（TASK-003 验收命令）全绿：
- `npm run build --workspace @lgdl/web-cli-base` → tsc 零错误
- `npm run test --workspace @lgdl/web-cli-base` → 全包 **215/215 通过**
- v2 零回归（AC-001 检查点②）：platform.test.ts 既有 4 用例**零删除零改写**全绿（git diff 测试文件 0 删除行）；platform.ts 零行为代码改动 —— 仅类型声明面（+298/-4 行：-4 行为被替换的旧接口块声明/注释行，其中 click 为 sanctioned 追加可选 opts?、其余 3 行 JSDoc 刷新，readState/hover/scroll/zoom/fullscreen/snapshot 签名逐字节保持）
- v2 调用方编译零破坏断言：`npm run build --workspace @lgdl/lgdl-web`（vite）+ `npx tsc --noEmit -p packages/lgdl-web/tsconfig.json` → 零错误
- nodeEnv 零改动 → 新方法缺省 undefined，未注入「可读错误」语义（dom-tools.ts:32-38）保持

## 2. 文件变更
> 本次构建涉及的全部文件操作（TASK-005 2 文件 MODIFY 见顶部两行；下方为历史记录：TASK-002 NEW / TASK-003 MODIFY 落点）

| 操作 | 文件路径 | 对应任务 | 说明 |
|:--:|------|:--:|------|
| MODIFY | packages/web-cli-base/src/dom-tools.ts | TASK-005 | dom 工具 7→27 子命令族扩展（ADR-008/§2.3.3，+616/-35）：①`DomSubcommand`/`SUBCOMMANDS` 扩至 27（**既有 7 顺序保持**，PER+4 interactives/read-element/find/structure、INT+8 dblclick/contextmenu/long-press/drag/focus/blur/type/press、WR+8 set-text/set-attr/remove-attr/set-style/set-value/fill/add/remove；snapshot 结构化段 = 既有子命令升级参数 --structured/--sections/--offset/--limit/--maxLength 不加新名）；②executor 逐子命令映射 PlatformDomOps 新方法 + flat 参数解析（click 坐标/偏移 opts、read-element 读取面组合、structure parts/serialize、interactives 过滤/分页、long-press ms 缺省 500、type clear、fill fields JSON 双形态、set-style 三写形态、add attrs JSON/mode/to、press key/combo 别名…）+ 缺参/非法参数可读错误 + **子能力未注入守卫**（可选方法 undefined → 「未注入」可读错误不崩溃，FR-002）；③ToolEntry 增 `subcommandRisks`（read 6/ui 12/write 9 = 27 全覆盖；entry.risk 保持 'ui' 回退面零变化）；④DOM_SCHEMA flat args 合并扩展（42 properties 全可选）+ DOM_DESC/domHelp 逐子命令用法 + risk 分级 + NG-007/NG-002/FR-024 声明 + 定位语法面（FR-015） |
| MODIFY | packages/web-cli-base/src/dom-tools.test.ts | TASK-005 | v3 增补 5 用例（+387/-0，**v2 既有零删除零改写**）：①元数据面（27 子命令既有 7 顺序、schema enum 同步、subcommandRisks 分组全覆盖、entry.risk/ui 回退面、help 含 risk 分级/NG-007/NG-002/敏感字段）；②新增 20 子命令注入桩逐条参数解析/透传 + click 坐标/偏移 + snapshot 结构化段升级面；③缺参/非法参数可读错误矩阵 + 子能力未注入守卫（v2 7 方法桩逐子命令「未注入」断言）；④⑤dispatch 级子命令 risk —— 只读组免 ask（onAsk 零调用 + 执行器放行 = IMP-4 修复 AC-009 机制侧）/ ui·write 组 ask → allow / write deny 规则命中即拒且执行器不调用（EC-014） |
| NEW | packages/web-cli-base/src/locator.ts | TASK-002 | 定位语法面纯解析器（FR-015/ADR-007/EC-002，零 DOM import）：`parseLocator(input, opts?)` → 结构化 `LocatorQuery`（判别字段 `type: 'css'\|'text'`）；裸串 / `css:` 前缀 → CSS 基线；`text=` 精确 / `text*=` 包含（`caseSensitive`/`trim` 可配，trim 缺省开）；`role=`/`xpath=` → 显式「不支持 + 替代指引」（role→interactives FR-011、xpath→page-eval FR-037，绝不静默当 CSS，EC-002）；可静态识别非法 CSS（括号/引号不配对、悬空组合器、顶层 "=" 等）与 text= 空文本 → 可读错误 + 语法指引；`locatorSyntaxHelp()`/`LOCATOR_SYNTAX_GUIDE`/`LOCATOR_MULTI_MATCH_NOTE` 为语法事实源（多匹配 = 首元素 + 提示文档化，供 find 精确化） |
| NEW | packages/web-cli-base/src/locator.test.ts | TASK-002 | 解析矩阵 17 用例全绿：css 裸串/`css:` 前缀/空入参/合法复杂 CSS 无误伤/非法 CSS（10 形态）/text= 精确/text*= 包含/trim 缺省·关/case 缺省·开/text= 空文本/含 "=" 字面文本/role=/xpath=/未知前缀/type 判别/语法帮助 |
| NEW | packages/web-cli-base/src/sensitive.ts | TASK-002 | 敏感字段分类/脱敏纯数据函数（FR-024/ADR-004/EC-005，零 DOM import）：`sensitiveFieldMatch(field)` 三信号（type=password 最强 → autocomplete 凭据 token → name/id 凭据词元启发式，保守宁可遮不可漏）+ `isSensitiveField`；`maskValue(value, kind?)` 以「分类 + 长度 + 占位」代替明文（占位 ≤24 + 省略号，绝不含明文）；`sensitiveWriteDecision(field)` = 写侧 ask + `requiresTrusted`（非敏感 allow）；`SENSITIVE_READ_NOTE`/`SENSITIVE_WRITE_NOTE` 供 help/AskDialog 文案复用；公开只读 token 清单 |
| NEW | packages/web-cli-base/src/sensitive.test.ts | TASK-002 | 分类矩阵 + 脱敏 grep 断言 17 用例全绿：type=password（含大小写）/autocomplete token 矩阵/多 token/name-id 启发式（camel·snake·尾数字）/非敏感不受影响/多信号取最严重/脱敏无明文（单值 + 聚合 grep）/空值/超长占位截断/写裁决 ask+trusted/非敏感 allow/帮助文案 |
| MODIFY | packages/web-cli-base/src/platform.ts | TASK-003 | 类型层 additive 扩展（ADR-008/FR-002，零实现）：①`PlatformDomOpResult` 追加可选 `dataUrl?: string`（截图 PNG dataURL 独立载体，不进 output，P-03/FR-028）；②`PlatformDomOps` 既有 7 方法签名保持（click 追加可选 `opts?: PlatformClickOptions`，selector-only 旧调用方零回归，FR-020）并追加 §2.3.2 表 #1~#25 全部 **28 个可选方法**（含 focusEl/blurEl、setAttr/removeAttr、addElement/removeElement 对），每方法 JSDoc 标注 ↔ dom 子命令/工具映射 + FR 锚点 + 未注入语义；③配套导出 options 类型面（15 个接口 + 4 个联合类型别名，纯数据形态零 DOM lib 依赖，NFR-002）——含真实浏览器实现（TASK-004 platform-dom.ts）与 dom-tools/chrome/wait/page-eval/extract 执行器（TASK-005~008/010）依赖的全部入参形状；nodeEnv/browserEnv 行为代码零改动 |

## 3. 任务完成清单
> 每个任务的完成状态（本报告覆盖范围）

| 任务 | 名称 | 复杂度 | 状态 | 对应 FR |
|------|------|:--:|:--:|------|
| TASK-001 | 机制层：permission + router 子命令级 risk + evaluate 最高档门禁 | L | ✅ completed（v1.0 已记录） | FR-001/005/006/008（NFR-008） |
| TASK-002 | 纯逻辑：locator 定位语法面 + sensitive 敏感字段分类/脱敏 | M | ✅ completed | FR-015/024（EC-002/005） |
| TASK-003 | 类型层：platform.ts PlatformDomOps additive 扩展 | M | ✅ completed（v1.1 已记录） | FR-002（FR-020/ADR-008） |
| TASK-005 | dom 工具扩展：子命令族 7→27 | L | ✅ completed（v1.5 已记录，§7） | FR-009~024 / FR-031~036（AC-001 检查点③） |
| TASK-006 | wait 条件等待原语 | M | ✅ completed（v1.4 已记录，§6） | FR-025（ADR-005） |
| TASK-008 | 采集域：CollectBuffer + collect-tools（extract/export） | L | ✅ completed（v1.3 已记录，§5） | FR-038~040/042（FR-041 扩展点声明） |
| TASK-012 | 全仓门禁 + AC-001 收口 + validate 移交（Wave 7 / GATE） | M | ✅ completed（v1.9 已记录，§11） | FR-001/003/004 + AC-001~012 + NFR-001/002/003/006 + D-005 |
| TASK-010 | base chrome 工具（print/back/forward/reload/screenshot） | M | ✅ completed（v1.6 已记录，§8） | FR-026~028（ADR-003/P-03；AC-001 检查点红线） |
| TASK-009 | base index P1 导出 + lgdl-web 场景接入收口（IMP-4 修复生效点） | L | ✅ completed（v1.7 已记录，§9） | FR-043~045/007（FR-044 主体；AC-009） |
| TASK-011 | P2 接线收口：chrome/save/notify/clipboard 入矩阵 + chrome 规则 + AskDialog 尾项 | L | ✅ completed（v1.8 已记录，§10） | FR-029/030/026~028 矩阵呈现/FR-041/FR-044 尾项（EC-009/012） |

### 3.1 实现要点回顾（TASK-002，供 review 对照）

- **定位语法单点事实源（FR-015/ADR-007）**：`parseLocator` 是 v3 全部元素级子命令/extract/fill/wait 的 selector 语法入口 —— 输出判别式 `LocatorQuery`（`{type:'css', css}` / `{type:'text', mode:'exact'\|'contains', text, caseSensitive, trim}`），DOM 侧（platform-dom）按 type 分支：css → querySelector；text → 文本树走（**叶子优先**语义在模块头文档化，避免命中容器父级；trim/case 由解析结果携带）。裸串 CSS 走与 v2 完全相同的 CSS 基线（零回归）。
- **错误面可读可自愈（EC-002）**：`role=`/`xpath=` 返回 `kind:'unsupported'` + 替代指引（role→interactives FR-011、xpath→page-eval FR-037），**绝不静默当 CSS**；未知 `xxx=` 前缀、text= 空文本、可静态识别非法 CSS（引号/括号不配对、悬空/连续组合器、列表空项、顶层 "=" 均经单趟状态扫描，合法 CSS 的引号内/`:is()` 内字符不误伤）→ `kind:'invalid'` + 语法指引；错误面单测 10+ 形态覆盖。完整 CSS 合法性由 DOM 侧 querySelector 兜底（保守分层）。
- **敏感字段保守取向（FR-024/EC-005）**：三信号强度排序（type=password > autocomplete 凭据 token > name/id 词元启发式）；词元归一处理 camelCase/snake/尾随数字（`currentPassword`/`user_pass`/`passcode123` 均命中）；autocomplete 覆盖 current-password/new-password/one-time-code/cc-* 标准敏感面。`maskValue` 只输出「分类 + 长度 + ≤24 占位」，**明文零回显**（单值与聚合 grep 断言）。写侧 `sensitiveWriteDecision` = ask + requiresTrusted（执行面由 TASK-001 子命令级 risk + 场景策略承接，本模块为裁决事实函数）。
- **零依赖零触碰（AC-001 检查点②/NFR-001）**：两模块零 import 语句、零 DOM/lgdl/react 引用；本任务 4 文件全 NEW，既有文件零改动（含 platform.test nodeEnv 面零回归）。

> 下节 3.2 为 v1.1（TASK-003）实现要点与新增方法签名清单，保持可追溯。

### 3.2 新增方法签名清单（TASK-003，§2.3.2 表 #1~#25，全可选；出参统一 `Promise<PlatformDomOpResult>`）

| # | 方法 | 入参 | 对应 FR / dom 子命令或工具 |
|:--:|------|------|------|
| 1 | `interactives?` | `(opts?: PlatformInteractivesOptions)` — type/state/text 过滤 + offset/limit 分页 + maxItems 预算(默认200) | FR-011 interactives |
| 2 | `readElement?` | `(opts: PlatformReadElementOptions)` — selector + fields（attributes/text/styles/classList/geometry/state/value 读取面） | FR-012 read-element |
| 3 | `findElements?` | `(opts: PlatformFindElementsOptions)` — selector + limit + detail(稳定索引) | FR-013 find |
| 4 | `readStructure?` | `(opts: PlatformReadStructureOptions)` — selector + parts(children/outerHTML/links/images/headings/forms) + serialize + maxLength | FR-014 structure |
| 5 | `snapshotStructured?` | `(opts?: PlatformSnapshotStructuredOptions)` — offset/limit 分页 + maxLength + sections(interactives/headings) | FR-010 snapshot 结构化段 |
| 6 | `dblclick?` | `(selector: string)` | FR-018 dblclick |
| 7 | `contextmenu?` | `(selector: string)` | FR-018 contextmenu |
| 8 | `longPress?` | `(selector: string, ms: number)` | FR-019 long-press |
| 9 | `dragDrop?` | `(from: string, to: string)` | FR-019 drag |
| 10 | `focusEl?` / `blurEl?` | `(selector: string)` ×2 | FR-021 focus/blur |
| 11 | `typeText?` | `(selector: string, text: string, opts?: PlatformTypeTextOptions)` — opts.clear | FR-022 type |
| 12 | `pressKey?` | `(combo: string, opts?: PlatformPressKeyOptions)` — combo 如 "ctrl+Enter"；opts.selector 先 focus | FR-023 press |
| 13 | `setText?` | `(selector: string, text: string)` | FR-031 set-text |
| 14 | `setAttr?` / `removeAttr?` | `(selector, name, value? 布尔属性形态)` / `(selector, name)` | FR-032 set-attr/remove-attr |
| 15 | `setStyle?` | `(selector: string, opts: PlatformSetStyleOptions)` — cssText 覆盖/properties 增量/classAction add·remove·toggle | FR-033 set-style |
| 16 | `setValue?` | `(selector: string, value: string)` | FR-034 set-value |
| 17 | `fillForm?` | `(plan: PlatformFillFormOptions)` — fields[]（selector/value/byLabel）+ submit | FR-035 fill |
| 18 | `addElement?` / `removeElement?` | `(opts: PlatformAddElementOptions)` — tag/text/attrs/position{append·prepend·before·after} / `(selector)` | FR-036 add/remove |
| 19 | `waitFor?` | `(opts: PlatformWaitForOptions)` — conditions[](kind element/visible/interactable/gone/text) + mode any/all + timeout(≤30s) + interval | FR-025 wait 工具 |
| 20 | `evaluate?` | `(code: string, opts?: PlatformEvaluateOptions)` — as expression/script + timeoutMs + maxLength | FR-037 page-eval 工具 |
| 21 | `extractData?` | `(opts: PlatformExtractDataOptions)` — kind table/list/links/images/meta + selector/fields + maxItems | FR-038 extract 工具 |
| 22 | `printPage?` | `()` | FR-026 chrome print |
| 23 | `historyNav?` | `(delta: number)` — -1 back / +1 forward | FR-027 chrome back/forward |
| 24 | `reloadPage?` | `()` | FR-027 chrome reload |
| 25 | `screenshot?` | `(opts: PlatformScreenshotOptions)` — mode viewport/element/fullpage(不支持)+selector+width/height；dataUrl 回填 result.dataUrl | FR-028 chrome screenshot |

> 配套类型面（均导出）：PlatformClickOptions / PlatformInteractivesOptions / PlatformReadElementFields / PlatformReadElementOptions / PlatformFindElementsOptions / PlatformStructurePart / PlatformReadStructureOptions / PlatformSnapshotStructuredOptions / PlatformTypeTextOptions / PlatformPressKeyOptions / PlatformSetStyleOptions / PlatformFillField / PlatformFillFormOptions / PlatformInsertPosition / PlatformAddElementOptions / PlatformWaitKind / PlatformWaitCondition / PlatformWaitForOptions / PlatformEvaluateOptions / PlatformExtractKind / PlatformExtractDataOptions / PlatformScreenshotOptions。

实现要点回顾（TASK-003，供 review 对照）：
- **additive 契约（FR-002/ADR-008/R-007）**：全部新方法可选（`?`）→ nodeEnv/browserEnv/既有 fake ops 对象零编译破坏；PlatformDomOpResult 只加可选字段；click 只加可选第二参 —— v2 调用方逐字节零回归（下游 lgdl-web vite + tsc 双绿为编译断言）。
- **既有 7 方法零改动**：readState/hover/scroll/zoom/fullscreen/snapshot 签名逐字节保持；click 的 opts? 为 tasks.md 明示的 sanctioned additive（FR-020）。nodeEnv 未预置新方法 → 缺省 undefined → 沿用「该能力在当前环境未注入」executor 可读错误（dom-tools.ts:32-38）。
- **类型面为下游实现/执行器的入参事实源**：字段形状对齐 plan §2.3.3 DOM_SCHEMA args（selector/dx 族外新增 offsetX/offsetY/x/y/text/value/name/fields/mode/kind/limit/maxLength/submit/ms/from/to/key/mods/clear 等）与 spec FR 预算值（interactives 200、snapshot 20k、wait timeout ≤30s/interval 200、extract maxItems 200）；TASK-004 platform-dom.ts 与 TASK-005~008/010 执行器直接消费。
- **零 DOM lib 依赖**：元素/文档一律以 selector 定位串表达，options 全为 string/number/boolean/Record/数组纯数据形态（NFR-002）；本任务零新增 import、零新增运行时依赖。

## 4. 下一步

| 场景 | 操作 |
|------|------|
| Wave 2 完成（TASK-002 locator/sensitive + TASK-003 类型面均 completed）→ 启动 Wave 3 域实现层五路并行（TASK-004 platform-dom / 005 dom 7→27 / 006 wait / 007 page-eval / 008 collect，均依赖 Wave 2 纯逻辑与类型面） | 运行 `@sddu-build 实现 TASK-004`（等，TASK-005~008 可并行） |
| TASK-002/003 代码审查（检查点②纯逻辑/类型面可先行审查） | 运行 `@sddu-review specs-tree-web-cli-base-v3 TASK-002` / `... TASK-003` |
| 全部任务完成后再整体 review | 运行 `@sddu-review <<feature_name>>`（本 Feature 12 任务全部 completed 后） |

## 5. TASK-008 构建记录（v1.3 追加：采集域 CollectBuffer + collect-tools）

> 范围 = TASK-008（Wave 3 / P1-b 域实现层；plan ADR-006/P-04 + §2.3.5 数据流 + §3.5 方案 A）；前置 TASK-001/002/003 completed；4 文件全 NEW，**既有文件零改动**（AC-001 检查点③红线 = NEW 模块不改既有文件）。

### 5.1 构建概要（TASK-008）

| 维度 | 数值 |
|------|:--:|
| 任务 | TASK-008（L 级）——采集域：extract→CollectBuffer→export 通路 |
| 新增文件 | 4（collect.ts / collect.test.ts / collect-tools.ts / collect-tools.test.ts） |
| 修改文件 | 0（既有文件零触碰；与并行 TASK-004~007 文件零交集 = dom/eval 轴零冲突） |
| 新增测试 | 33 用例（collect 12 + collect-tools 21） |
| 验证门禁 | strict 与非 strict 双模式 tsc 零错误；33 用例隔离全绿 + 全量套件中 collect 面全绿；全仓 356 通过 352，4 失败均为并行在飞平台域模块（platform-dom extractData/typeText/fillForm、dom v3 executor 边界），与本任务文件零交集 |

### 5.2 文件变更

| 操作 | 文件路径 | 说明 |
|:--:|------|------|
| NEW | packages/web-cli-base/src/collect.ts | CollectBuffer（session 内存态，ADR-006/P-04）：`createCollectBuffer(opts?)` 工厂（maxItemsPerAppend 默认 200 / maxTotalRows 默认 5000 / minAppendIntervalMs 默认 300 / dedupe 可选 / maskSensitive 默认开 / 时钟注入）；`append(id, rows, meta?)` 写入单点（护栏：单次上限截断、总量部分收容 + over-cap 中止保留已采 EC-011、限速按 id、去重行 JSON hash 键序归一跨批持久）、`get/has/list/stats/checkAppendReady/clear`；**脱敏单点**：表单字段描述行（{name/id/type/autocomplete, value}）经完整 FieldIdentity 信号 + 普通行按敏感列名（password/token/apikey/card…）→ maskValue 占位脱敏（FR-024/EC-005，明文零残留）；meta{url, at, trust:'untrusted'} 来源上下文 + schema；默认护栏常量导出（FR-042 预算收敛源）；零 DOM/lgdl/react import |
| NEW | packages/web-cli-base/src/collect.test.ts | 12 用例：append 创建/meta 缺省 untrusted/翻页同 id 增量 + at 刷新/多 id 独立/单次 maxItems 截断保留前 N/总量部分收容 + over-cap 中止保留（EC-011）/限速时钟注入 + appendReady 预检（waitMs）/去重跨批 + 键序归一/脱敏无明文（敏感列 + 描述行 + 非敏感原样）/maskSensitive:false/clear·list·stats/0 行不建条目/默认常量 |
| NEW | packages/web-cli-base/src/collect-tools.ts | extract + export 工具工厂/执行器 + 序列化器：extract（risk:'read'，kind=table/list/links/images/meta，selector/fields 经 locator 语法面预校验 EC-002，list fields JSON 解析 + 逐字段校验，缓冲限速预检**先于 ops**（FR-042 无谓 DOM 抽取拦截），ops.extractData 注入 + 输出契约解析（JSON 数组 / {rows,truncated}），append 后回摘要（{ok,条数,bufferId,截断标记}，**数据不进 output**，AC-012/提示注入不回显），空集非错误，over-cap 中止原因可读）；export（risk:'write'，format text/json/csv + RFC4180 转义 csvEscapeCell/表头/CRLF，json 元数据头 {source, collectedAt, trust, bufferId, rowCount, fields}，text 逐行 tab 拼接；落盘两路 save→download 降级（EC-012），双路不可用 → 截断内容 + 长度降级 + untrusted 标记不丢数据；`.xlsx` 入参 → 「不支持 + csv 替代指引」，`createExportToolEntry(env,{buffer,xlsxSerializer?})` 注入扩展点声明不默认实现（FR-041/NG-005）；`createCollectToolEntries` 共享 buffer 组装便捷工厂；extractHelp/exportHelp 含数据流/语法/翻页原语/护栏/xlsx 边界） |
| NEW | packages/web-cli-base/src/collect-tools.test.ts | 21 用例：extract（fake ops 注入 JSON 行 → buffer 只回摘要行内容零回显/fields 透传/maxItems/meta 来源 URL/空集非错误不建条目/role=/xpath= 及字段定位错误且 ops 未被调用/参数错误矩阵/ops 未注入·失败·授权转译/限速预检间谍断言/over-cap 保留/敏感脱敏）→ export（csv RFC4180 精确转义断言 + 落盘内容核验/json 元数据头/text/成功只回摘要 + 缺省文件名/落盘两路 save 拒→download/双路不可用降级内容 + trust/xlsx 不支持 + 注入 serializer 可用/id 不存在引导）→ dispatch 元数据与风险（extract group collect + risk read 放行 / export risk write 规则 deny → /权限被拒/）+ parseExtractedOutput 契约 + 帮助面 |

### 5.3 实现要点回顾（TASK-008，供 review 对照）

- **数据通路（ADR-006）**：extract（ops.extractData 契约 = output JSON 行数组或 {rows, truncated}）→ `buffer.append`（护栏/脱敏/限速/去重全部单点收敛）→ export 序列化 → env.filePicker.save/download。**大结果全程不进 AI 上下文**（只回摘要 + trust 来源标记）；翻页 = AI 以 wait/click + 同 id extract 编排原语（不工具化，FR-039）。
- **护栏中止不丢数据（EC-011）**：单次超限截断保留前 N（truncated/dropped 计数）；总量按剩余容量部分收容，容量 0 → over-cap 整批中止，已采数据保留可导出；限速在 ops 调用前预检（checkAppendReady），时钟注入单测断言第二次未触碰 DOM。
- **脱敏写单点（FR-024/EC-005）**：敏感页面内容在 append 路径自动脱敏 —— 导出即不可能含明文（grep/断言双验证）；sensitive.ts 复用（type/autocomplete/name·id 信号 + maskValue 占位）。提示注入文本不回显执行（FR-042/v2 EC-007 延续，测试断言行内容零回显）。
- **export 诚实两路（EC-012，不伪造成功）**：save 手势被拒/不可用 → download 下载链自动降级并如实标注；双路均不可用 → ok:false + 截断内容 + 长度降级（不静默丢数据，输出含 untrusted 标记）；.xlsx 缺省返回「不支持 + csv 替代指引」，注入 `xlsxSerializer` 后走扩展点（FR-041 声明存在不默认实现）。
- **结构窄化兼容（工程说明）**：包 test 脚本 tsc 不带 --strict（`tsc src/*.test.ts …`），负向判别式窄化（`if (!x.ok) …` 分支内取成员）在该模式下不生效 —— 按 locator.test 既有先例改用 `'成员' in union` 结构窄化，strict / 非 strict 双模式均零错误。
- **零冲突零回归（AC-001 检查点③）**：本任务 4 文件全 NEW，未触碰任何既有文件（含并行 TASK-004 platform-dom / TASK-005 dom-tools 等文件零交集）；base build 双模式零错误；collect 面 33 用例在隔离与全量套件均全绿（全仓 356 中其余 4 失败位于并行在飞平台域模块，待各自任务收口后由 TASK-012 全仓门禁复核）。

## 6. TASK-006 构建记录（v1.4 追加：wait 条件等待工具）

> 范围 = TASK-006（Wave 3 / P1-b 域实现层；plan ADR-005 + §3.4 方案 A + spec WT FR-025）；前置 TASK-002（locator）/ TASK-003（platform.ts PlatformWaitForOptions 类型面）completed；2 文件全 NEW，**既有文件零改动**（红线：sleep 零回归 = sleep.ts 零触碰；wait 与 dom 轴零冲突 = dom-tools.ts 零触碰、独立工具 name 'wait'）。

### 6.1 构建概要（TASK-006）

| 维度 | 数值 |
|------|:--:|
| 任务 | TASK-006（M 级）——wait 条件等待原语（WT 横切，FR-025） |
| 新增文件 | 2（wait-tools.ts / wait-tools.test.ts） |
| 修改文件 | 0（既有文件零触碰；sleep.ts / dom-tools.ts 零改动 = 红线① sleep 零回归 / 红线② dom 轴零冲突） |
| 新增测试 | 20 用例（条件解析矩阵 9 + 执行器委托与错误面 6 + ToolEntry/门禁/sleep 并存 4 + ADR-005 引擎契约占位 1） |
| 验证门禁 | strict（build）与非 strict（base 测试脚本真实编译形态）双模式 tsc 零错误；wait-tools.test **20/20 全绿**；sleep.test 15 既有用例零改动零回归（AC-001 检查点③）；**全仓 base build + test 356/356 全绿**（Wave 3 五路并行全部收口后复核） |

### 6.2 文件变更

| 操作 | 文件路径 | 说明 |
|:--:|------|------|
| NEW | packages/web-cli-base/src/wait-tools.ts | wait 工具（FR-025/ADR-005，独立单动词工具，零 DOM import）：`parseWaitArgs(args)` 条件解析（单条件 kind+selector(/text) / 多条件 `--conditions` JSON 数组字符串二选一；kind 全集 element/visible/interactable/gone/text；selector/text 定位统一经 locator 校验 O-011，role=/xpath=/坏 CSS/text= 语法非法 → 可读错误 + 语法指引 EC-002；kind=text 三形态：裸文本精确包裹 / selector text= 语法 / CSS 容器 + text；timeout 缺省 10000 上限 30000 钳制、interval 缺省 200、mode 缺省 any、显式常量 WAIT_* 导出）→ `executeWaitTool(ops, args)` 单次委托 ops.waitFor（NFR-007 工具层零忙等；未注入 → 「未注入」可读错误 FR-002；命中/超时均透传 ops 状态摘要，超时 ok:false 含最后观察状态不抛异常 = 会话不中断 EC-014；授权异常统一 translateCapabilityError）→ `createWaitToolEntry(env)` ToolEntry（name 'wait' / risk:'read' 只读免 ask IMP-4 语义 / group 'ui' / schema args 单对象含 kind/selector/text/mode/timeout/interval/conditions）→ `waitHelp()` 与 sleep 语义显式区分 + ADR-005 observer/轮询策略工程声明 + locatorSyntaxHelp 语法面复用 |
| NEW | packages/web-cli-base/src/wait-tools.test.ts | 20 用例全绿：①条件解析矩阵（element 单条件缺省 / 数值解析 + timeout 45000→30000 钳制 + selector trim / gone·visible 经 text= 定位 O-011 / kind=text 三形态 / conditions 数组 mode any·all / 非法 kind·缺条件·缺 selector·text 缺目标 / role=·坏 CSS·text= 非法前缀可读错误 EC-002 / mode·timeout·interval 非法参数 / kind 与 conditions 二选一 + JSON 形态错误）；②执行器（命中透传 + **单次委托零空转**（calls.length===1 + 委托立即完成无自身 interval 延时，NFR-007）/ 超时 ok:false 最后状态透传不中断 / output 空超时兜底 / waitFor 未注入可读错误 FR-002 / 授权异常转译 / 解析失败 ops 不被调用）；③ToolEntry 元数据（risk read / group ui / schema kind enum 与 WAIT_KINDS 一致）/ dispatch 级（risk:'ui' ask 规则不命中 → read 缺省 allow 免 ask；riskDefaults read:deny 场景收紧 → deny 且执行器不被调用 / pattern deny 拦截）；④sleep 并存零回归断言（parseSleepCommand 行为照旧 + SLEEP_TOOL 独立 + help 语义区分文案）；⑤ADR-005 引擎契约占位（interval/timeout 透传 + 命中即止 1 tick + 超时有界 ≈timeout/interval + 返回最后状态；真实双通道引擎归属 platform-dom ops.waitFor TASK-004，validate V13 冒烟承接） |

### 6.3 实现要点回顾（TASK-006，供 review 对照）

- **条件解析单点事实源（FR-025/ADR-005）**：kind（element/visible/interactable/gone/text）+ 定位语法（selector/text=）统一复用 locator（O-011 语法面一致）；`--conditions` JSON 数组字符串承载多条件（any 任一命中 / all 全部满足）；非法条件一律返回可读错误 + 语法指引（EC-002：role=/xpath= 绝不静默当 CSS）。
- **分层零 DOM（ADR-008）**：wait-tools 只做「条件解析 → 单次委托 ops.waitFor → 结果映射」，MutationObserver + 轮询降级 + 统一超时引擎归属 platform-dom.ts ops.waitFor（TASK-004 #19，ADR-005）；help 面工程声明 observer/轮询策略与 sleep 语义区分；工具自身零 document/零忙等（NFR-007 低开销：观察期外零常驻，委托单点）。
- **语义与 sleep 区分（FR-025 零回归）**：sleep = 固定延时（sleep.ts **零改动**，15 用例既有零回归）；wait = 条件驱动（命中即返 / 超时 ok:false + 最后观察状态摘要，不中断会话 —— AI 可据最后状态调整，EC-014 联动）。
- **risk:'read' 免 ask（IMP-4 语义扩展面）**：ToolEntry.risk='read'（只读观察），无 subcommandRisks → effectiveRisk 回退 'read' → PRM 缺省 allow（dispatch 级断言：risk:'ui' ask 规则不命中、onAsk 零调用）；场景可经 riskDefaults read:deny 收紧（deny 时执行器不被调用 = 门禁先于执行）。
- **非 strict 编译兼容（工程说明）**：base 测试脚本 tsc 不带 --strict（sleep.ts 先例），判别式收窄统一用显式 `=== true/false` 比较而非 `!x.ok` 反向收窄 —— wait-tools.ts/wait-tools.test.ts 在 strict（build）与非 strict（测试脚本）双模式均零错误。
- **零冲突零回归（AC-001 检查点③ + 红线①/②）**：本任务 2 文件全 NEW；sleep.ts / dom-tools.ts / platform.ts 等既有文件**零触碰**（wait 与 dom 轴零冲突：独立工具名 'wait'、不进入 dom 27 子命令族）；git diff 测试文件 0 删除行；全仓 356/356 全绿（Wave 3 并行 TASK-004/005/007/008 全部收口后复核）。

## 7. TASK-005 构建记录（v1.5 追加：dom 工具 7→27 子命令族扩展）

> 范围 = TASK-005（Wave 3 / P1-b 域实现层；plan §2.3.3 + ADR-001/ADR-008 + spec PER/INT/WR 组 FR）；前置 TASK-001（subcommandRisks/effectiveRisk 门禁）+ TASK-003（PlatformDomOps 类型面）completed；2 文件 MODIFY，executor 面零 DOM 触碰（ADR-008：DOM 实现收敛 platform-dom.ts TASK-004）。

### 7.1 构建概要（TASK-005）

| 维度 | 数值 |
|------|:--:|
| 任务 | TASK-005（L 级）——dom 7→27 子命令族（PER4 + INT8 + WR8 + snapshot 结构化段升级 + click 坐标升级） |
| 修改文件 | 2（dom-tools.ts +616/-35；dom-tools.test.ts +387/-0） |
| 新增测试 | 5 用例（v2 既有 7+ask-user 3 用例零删除零改写；dom-tools.test 12/12 全绿） |
| 验证门禁 | base build tsc 零错误；全包 **356/356 通过**（Wave 3 并行模块落地后全量）；lgdl-web vite build + 显式 tsc 零错误（v2 调用方零破坏编译断言）；git diff dom-tools.test.ts 0 删除行（AC-001 检查点③红线） |

### 7.2 文件变更（TASK-005）

| 操作 | 文件路径 | 说明 |
|:--:|------|------|
| MODIFY | packages/web-cli-base/src/dom-tools.ts | 27 子命令族：①SUBCOMMANDS 既有 7 顺序保持 + PER/INT/WR 20 新值（DomSubcommand 联合类型同扩）；②executor 逐子命令 → PlatformDomOps 新方法映射（interactives→interactives / read-element→readElement / find→findElements / structure→readStructure / dblclick→dblclick / contextmenu→contextmenu / long-press→longPress(ms 缺省 500) / drag→dragDrop(from/to) / focus·blur→focusEl·blurEl / type→typeText(clear) / press→pressKey(key·combo 别名) / set-text→setText / set-attr→setAttr(value 缺省=布尔属性形态) / remove-attr→removeAttr / set-style→setStyle(cssText|prop+value|classAction+className) / set-value→setValue / fill→fillForm(fields JSON 对象/数组双形态 + submit) / add→addElement(tag+attrs JSON+mode append·prepend·before·after+to) / remove→removeElement）；click 坐标/偏移 opts（FR-020，selector-only 零回归）；snapshot --structured true → snapshotStructured(offset/limit/maxLength/sections)（无参缺省路径逐字节同 v2）；③**子能力未注入守卫**（可选方法 undefined → 「该能力在当前环境未注入（env.dom.ops.xxx 缺省）」可读错误，FR-002 语义）；缺参/非法参数（整数/enum 清单/JSON）→ 可读错误 + 指引（EC-002）；④subcommandRisks 27 全覆盖（read 6 / ui 12 / write 9；entry.risk 保持 'ui' = v2 回退面零变化）；⑤DOM_SCHEMA flat args 合并扩展（42 properties 全可选 flat + 归属子命令描述）+ DOM_DESC/domHelp（逐子命令用法 + risk 分级 + NG-007 合成事件局限 + NG-002/003 同源边界 + FR-024 敏感字段策略 + FR-015 定位语法面） |
| MODIFY | packages/web-cli-base/src/dom-tools.test.ts | v3 增补 5 用例（追加式，v2 既有零删除零改写）：①元数据面断言（27 顺序/头部 7 不漂移/schema enum 同步/subcommandRisks 全分组/entry.risk·group 回退面/help 含 risk 分级·NG-007·NG-002·敏感字段）；②新增 20 子命令注入桩逐条（makeOpsV3 seen 记录参数，断言解析/透传：click 坐标两形态、read-element fields 组合 + 缺省、structure parts/serialize 页级、long-press ms 缺省、type clear 缺省、fill JSON 双形态 + submit、set-style 三写形态、add attrs/mode、snapshot structured 升级面 + 无参缺省）；③缺参/非法参数矩阵（30+ 形态：整数/enum/JSON/缺 selector/text/key/name/from/to/tag/fields…）+ 子能力未注入守卫逐子命令（v2 7 方法桩 → 「未注入」可读错误不崩溃）；④dispatch 级 risk（lgdl-web 形态 {risk:'ui',ask} 规则 + onAsk spy：read 6 组免 ask 执行器放行 onAsk 零调用；click/dblclick ask→allow；set-text write 缺省 ask→allow —— IMP-4 修复 AC-009 机制侧）；⑤write deny 规则命中即拒 + 执行器不调用 + read 不受影响（EC-014） |

### 7.3 实现要点回顾（TASK-005，供 review 对照）

- **既有 7 零回归（AC-001 检查点③）**：SUBCOMMANDS 头部 7 逐字节保持；executor read-state/hover/scroll/zoom/fullscreen 分支与错误文案逐字节同 v2；click 无坐标参数时不传第二参（= v2 调用形态）；snapshot 无 --structured 时调用 ops.snapshot()（v2 路径）；v2 dom 测试（read-state 注入桩/缺参/未知子命令/操作面未注入/deny 拦截/元数据）零改写全绿（git diff 0 删除行）。
- **子命令级 risk = PRM 单一数据源（FR-005/ADR-001）**：read 6（read-state/snapshot/interactives/read-element/find/structure）→ 'read'（缺省 allow 免 ask = IMP-4 修复）；ui 12 → 'ui'（缺省 ask）；write 9（type/set-text/set-attr/remove-attr/set-style/set-value/fill/add/remove）→ 'write'（缺省 ask + ops 面回读校验）；entry.risk 保持 'ui' 使**无规则场景回退面 = v2 元数据零变化**（FR-001）。dispatch 级断言证明：lgdl-web 形态 `{risk:'ui',action:'ask'}` 规则不再锁死只读子命令（修复点），write 组缺省 ask、deny 优先（EC-014）且执行器不被调用（门禁先于执行）。
- **未注入守卫（FR-002/ADR-008）**：v3 新方法全可选（TASK-003）→ executor 逐子命令 `typeof ops.xxx === 'function'` 守卫，undefined → 可读「该能力在当前环境未注入」错误（沿用 dom-tools.ts:32-38 整面语义扩展至子能力面）；v2 7 方法桩（nodeEnv 形态）下新子命令全部安全降级不崩溃。
- **executor 零 DOM（ADR-008）**：selector 透传（v3 定位语法面 FR-015 由 platform-dom 解析）、敏感字段脱敏（FR-024）与写后回读（EC-006）均为 ops 面（TASK-004）职责；executor 只做参数解析/预算/门禁语义，node 注入桩全链单测。
- **schema/help 事实源升级**：DOM_SCHEMA args 42 flat properties 全可选（保持 v2「一个 args 对象」调用形态），property description 注明归属子命令；DOM_DESC 供 AI 选参；domHelp 逐子命令用法 + risk 分级 + NG-007（合成事件 isTrusted=false 局限）/NG-002（同源边界）/FR-024（敏感字段读脱敏写 ask）显式声明（既有 /NG-003/、/PRM/、/同源/ 断言 token 保持）。
- **命名说明（供 review）**：WR 子命令名 = `add`/`remove`（spec FR-036 + plan §2.3.3 + tasks.md 验收清单一致），对应 PlatformDomOps 方法 addElement/removeElement；snapshot 结构化段不新增子命令名（升级参数面，FR-010）。
- **零依赖零 import 新增面**：本任务新增 import 仅为 platform.ts 类型面（option 接口）+ 既有 router 类型，零新增运行时依赖、零 lgdl/react（NFR-001）。

## 8. TASK-010 构建记录（v1.6 追加：chrome 工具 5 子命令 + 截图输出策略）

> 范围 = TASK-010（Wave 5 / P2-a chrome 工具；plan §2.3.3 + ADR-003/P-03 + §3.2 方案 A + spec CHR FR-026~028 + §4.2 chrome-tools.test）；前置 TASK-001（subcommandRisks/effectiveRisk 门禁）+ TASK-003（PlatformDomOps printPage/historyNav/reloadPage/screenshot + dataUrl? 类型面）completed；2 文件全 NEW，**既有文件零改动**（AC-001 检查点③红线 = NEW 模块不改既有文件；index.ts chrome 导出收口归 TASK-011）。

### 8.1 构建概要（TASK-010）

| 维度 | 数值 |
|------|:--:|
| 任务 | TASK-010（M 级）——chrome 工具：print/back/forward/reload/screenshot |
| 新增文件 | 2（chrome-tools.ts / chrome-tools.test.ts） |
| 修改文件 | 0（既有文件零触碰；与并行在途 TASK-009/011 lgdl-web 组装文件零交集） |
| 新增测试 | 13 用例（chrome-tools.test 13/13 全绿） |
| 验证门禁 | strict（build）与非 strict（base 测试脚本真实编译形态）双模式 tsc 零错误；**全包 test 369/369 全绿**（356 v2 基线 + 13 新增）；AC-001 检查点红线满足 |

### 8.2 文件变更

| 操作 | 文件路径 | 说明 |
|:--:|------|------|
| NEW | packages/web-cli-base/src/chrome-tools.ts | chrome 工具（FR-026~028/ADR-003/P-03，零 DOM 触碰 ADR-008）：`ChromeSubcommand`/`CHROME_SUBCOMMANDS`（print/back/forward/reload/screenshot 5 子命令）→ `createChromeToolEntry(env)` ToolEntry（name 'chrome' / group 'chrome' / entry.risk 保持 'ui' 回退面 + `subcommandRisks`：print/back/forward→'ui'（back/forward 场景规则免 ask 面 EC-009 归 TASK-011 App 规则）、reload/screenshot→'write'，plan §2.3.3 单一数据源）；`executeChromeTool(env, subcommand, args)` executor → env.dom.ops：print→printPage（--format 显式文件格式如 pdf → 「不支持 + CDP/F-14 归属」FR-026 out，default/dialog 放行）/ back·forward→historyNav(-1/+1) / reload→reloadPage（破坏性：输出若未含恢复指引则执行器补 EC-009 提示、含则单份不重复） / screenshot→screenshot（参数解析：mode 缺省 viewport、element 需 --selector、width/height 非负整数、非法/缺参可读错误；**fullpage 执行器面先行短路**「不支持 + F-14/CDP 归属」ops 不被调用 = 双保险 FR-028 out）；未知子命令/整面未注入/子能力未注入 → 可读错误（FR-002）；ops 授权异常 → translateCapabilityError（EC-008）会话不中断；**截图输出策略（ADR-003/P-03）**：`summarizeScreenshotData`（PNG dataURL 头段解析尺寸 `parsePngSizeFromDataUrl`（atob 前 24 字节 sig+IHDR 宽高）+ base64 长度×3/4−padding 折算字节 + 头段预算）+ `screenshotFilename`（collect 时间戳命名先例）→ `deliverScreenshot` 默认自动触发 env.filePicker.download（降级锚点：未注入/授权拒绝 → ok:false 可读「未落盘」+ 摘要 + 长度，不静默丢数据 EC-012）并返回 {尺寸/字节/文件名} 摘要（dataURL 不整段进上下文 AC-012）；--include-dataurl true 预算内（SCREENSHOT_DATAURL_HEAD_BUDGET=400）回带头段 + 截断标记；schema（CHROME_SCHEMA 5 子命令 enum + args format/mode/selector/width/height/include-dataurl）+ CHROME_DESC + `chromeHelp`（打印用户侧确认/PDF out · reload 破坏性恢复提示 EC-009 · back/forward 会话内场景规则 · 截图近似度 ADR-003 公开 + fullpage/整页 F-14/CDP out · 书签/标签页·跨域 NG-002/003 out） |
| NEW | packages/web-cli-base/src/chrome-tools.test.ts | 13 用例全绿：①元数据面（name/risk ui 回退/subcommandRisks 5 全覆盖/schema enum 与 CHROME_SUBCOMMANDS 同步/参数面 format·mode·selector·width·height·include-dataurl/deriveTools 三链）；②help 面公开（window.print 用户侧确认 · reload 破坏性 + read-state/EC-009 · 近似/foreignObject/ADR-003 · 整页/F-14/CDP · include-dataurl/下载链）；③fake ops 注入各子命令透传（print → printPage；print --format pdf → 不支持 + CDP/F-14 且 ops 零调用；back→historyNav(-1)/forward→historyNav(+1)；reload 恢复提示兜底 + ops 已含提示单份不重复）；④错误面（未知子命令/整面未注入/子能力未注入逐子命令「未注入」）；⑤screenshot 参数解析（viewport 缺省精确透传 {mode:'viewport'} / element selector + width/height 整数 / element 缺 selector / width·height·mode 非法可读错误 / **fullpage 短路输出「不支持+F-14/CDP」ops 不被调用**）；⑥默认输出 {尺寸: 2×3px, 字节, 文件名} 摘要 + 下载链调用断言（data 与 ops dataUrl 一致 + 文件名正则）+ 完整 dataURL 不进 output（AC-012）；⑦--include-dataurl true 预算内头段 + 截断标记（大图）+ 小图全量无截断 + 下载链仍触发；⑧下载链降级（filePicker 未注入 / download NotAllowed → ok:false 可读「未落盘」+ 摘要不静默丢数据 EC-012/EC-008）；⑨EC-008 授权两路转译（print NotAllowed / screenshot SecurityError / reload NotFound → 可读 + 后续调用正常 = 会话不中断）；⑩dispatch reload deny（risk write deny 规则 → 权限被拒 + 间谍 ops.reloadPage 未被调用，EC-014）+ screenshot 同 deny；⑪dispatch back/forward 免 ask 规则面（allow 规则前置 → 零 ask 放行执行 / print 仍 ask / 无规则缺省 ask（ask 携带子命令名）/ onAsk deny → 拒且执行器不调用）；⑫summarizeScreenshotData/parsePngSizeFromDataUrl/screenshotFilename 单元（尺寸解析/非法降级/字节折算/头段预算/文件名固定时间）；⑬executeChromeTool 直调 env 注入形态 + ops 缺省可读 |

### 8.3 实现要点回顾（TASK-010，供 review 对照）

- **子命令级 risk 标注（FR-005/ADR-001）**：chrome 5 子命令 subcommandRisks 全覆盖 —— print/back/forward='ui'（默认 ask；back/forward 为会话内 history 导航不中断上下文，EC-009「场景规则 allow 免 ask」面由 TASK-011 lgdl-web App 规则落地 —— dispatch 级测试已证明 allow 规则前置形态：前置 allow → 零 ask 放行；无规则 → 缺省 ask；ask deny → 拒且执行器不调用）；reload/screenshot='write'（破坏性/落盘副作用缺省 ask）。entry.risk 保持 'ui'（无 subcommandRisks 回退面与 dom 同构零变化）。
- **截图输出策略（ADR-003/P-03）**：成功 dataUrl 走独立字段 → **默认自动下载链**（env.filePicker.download 降级锚点：未注入/授权拒绝 → ok:false 可读「未落盘」+ {尺寸/字节/长度} 摘要不静默丢数据，EC-012 语义）→ 返回 **{尺寸/字节/文件名} 摘要**（尺寸经 PNG dataURL 头段 24 字节解析（atob 前 32 base64 字符，sig + IHDR 宽高大端），字节经 base64 长度 ×3/4 − padding 精确折算 —— 不依赖 ops 文本、fake ops 全链可测）；`--include-dataurl true` 预算内（400 字符）回带头段 + 截断标记（AC-012）；dataURL 整段永不进 output。
- **整页级 out（FR-028）**：fullpage 入参在 **executor 面先行短路**返回「不支持 + F-14/CDP 归属」（ops.screenshot 不被调用，间谍断言）—— 与 platform-dom ops 面同文案双保险；print --format pdf 同理返回「不支持 + CDP/F-14 归属」（FR-026 out），AI 可自愈（改用对话框手动另存）。
- **破坏性 reload（FR-027/EC-009）**：默认 ask 在门禁面（risk 'write'，dispatch deny 测试间谍断言执行器不调用）；放行后执行器对成功输出兜底恢复提示「重新 read-state/恢复会话上下文（EC-009）」—— ops 输出已含提示则单份不重复（正则判断幂等）。
- **零依赖零触碰（NFR-001/002，AC-001 检查点③）**：本文件新增 import 仅 platform.ts（类型 + translateCapabilityError）+ router.ts 类型；dataURL 解析走 globalThis.atob（node ≥16 / 浏览器双端可用，非 DOM lib），零新增运行时依赖、零 lgdl/react；2 文件全 NEW，既有文件零改动；git diff 既有测试文件 0 删除行。

## 9. TASK-009 构建记录（v1.7 追加：base index P1 导出收口 + lgdl-web 场景接入 —— IMP-4 修复生效点）

> 范围 = TASK-009（Wave 4 / plan P1-c 场景收口，L 级跨包）；输入 plan §2.2 lgdl-web 场景壳 + §2.3.5（session.ts 矩阵扩展单点 + CollectBuffer 共享注入）+ ADR-001（子命令级规则落地）+ §5.1 index.ts 行 + §5.2 lgdl-web 文件行 + spec LGDL FR-043~045 + PRM FR-005~008 + AC-009；前置 TASK-001/005/006/007/008 completed（+ TASK-010 已提前并行落地）。

### 9.1 构建概要（TASK-009）

| 维度 | 数值 |
|------|:--:|
| 任务 | TASK-009（L 级）——base index P1 导出 + lgdl-web session/App/AskDialog 场景接入（IMP-4 修复生效点） |
| 新增文件 | 0（全 MODIFY） |
| 修改文件 | 6（base index.ts +40/-0；lgdl-web session.ts / App.tsx / AskDialog.tsx / AiPanel.tsx(连接器) / session.test.ts） |
| 新增测试 | 4 场景用例（session.test 51→55：v3 P1 矩阵三链 / wait 全链 / extract→export 共享 buffer 落盘 / IMP-4 只读免 ask·写 ask·evaluate deny） |
| 验证门禁 | base build 零错误 + **base test 369/369**；lgdl-web vite build 零错误 + 显式 tsc 零错误 + **lgdl-web test 55/55**；grep 断言 base 零 lgdl/react import 零 UI 代码；AC-001 检查点④红线满足（既有注册顺序保持 + session 派生断言改写有据 D-005） |

### 9.2 文件变更（TASK-009）

| 操作 | 文件路径 | 说明 |
|:--:|------|------|
| MODIFY | packages/web-cli-base/src/index.ts | **+40/-0 零删除**（NFR-006 导出面收口）：v3 P1 导出块追加 —— locator（parseLocator/locatorSyntaxHelp/LOCATOR_SYNTAX_GUIDE/LOCATOR_MULTI_MATCH_NOTE + 类型面）、sensitive（sensitiveFieldMatch/isSensitiveField/maskValue/sensitiveWriteDecision/SENSITIVE_READ_NOTE/SENSITIVE_WRITE_NOTE + 类型面）、platform 扩展面类型（PlatformDomOps/PlatformDomOpResult/PlatformDomState + PlatformClickOptions~PlatformScreenshotOptions 等 24 类型）、platform-dom（createBrowserDomOps + DomOpsScope）、wait（createWaitToolEntry/executeWaitTool/parseWaitArgs/waitHelp/WAIT_* + ParsedWaitArgs 等类型）、page-eval（createPageEvalToolEntry/executePageEval/pageEvalHelp/summarizeCode/recordPageEvalAudit/PAGE_EVAL_DEFAULTS + PageEvalDecision 等）、collect（createCollectBuffer/maskCollectRow(s)/collectFields/COLLECT_DEFAULT_* + CollectBuffer 全类型面）、collect-tools（createCollectToolEntries/createExtractToolEntry/createExportToolEntry/execute*/serializeRows*/csvEscapeCell/resolveExportFormat/defaultExportFilename/extractHelp/exportHelp/COLLECT_* /EXPORT_DEGRADE_PREVIEW_MAX + 类型面）。DomSubcommand 新值随既有类型导出原位扩展（dom-tools 27 值）。 |
| MODIFY | packages/lgdl-web/src/ai/session.ts | ①默认矩阵扩展（FR-043）：`createCollectBuffer()` 单例 → `createCollectToolEntries(env, buffer)` 注册 extract/export（共享 session 内存缓冲，ADR-006/P-04）+ `createWaitToolEntry(env)` + `{...createPageEvalToolEntry(env), enabled:false}`（page-eval 缺省禁用：schema 不含/help 标注/派发报禁用 v2 FR-004 语义），注册于 P1 之后内建之前（v2 既有注册序保持）；②`env.dom.ops = createBrowserDomOps()` 显式装配（TASK-004 真实现接线，4 桩消失落地；`deps.env.dom.ops` 注入覆盖缝保留 —— 测试 fake ops/场景替换优先，不整缝覆盖）；③新增导出 `LGDL_DEFAULT_POLICY_RULES: PolicyRule[]`（App aiPolicy.rules 与 session.test 共用单一数据源）：dom 只读 6 子命令 `{pattern:'dom', subcommand: read-state/snapshot/interactives/read-element/find/structure, action:'allow'}`（IMP-4 修复生效点，显式免 ask）+ 既有 `{risk:'ui', action:'ask'}` 规则保持 + `{risk:'evaluate', action:'deny'}`（FR-008/045 兜底门禁）；行为 diff 声明注释落常量头部（IMP-4 为唯一有意变更，R-007/D-005）。 |
| MODIFY | packages/lgdl-web/src/App.tsx | aiPolicy 子命令级规则落地：`rules: LGDL_DEFAULT_POLICY_RULES`（import 自 ./ai/session；useMemo 依赖 [] 不变）；注释升级含 ★ 行为 diff 声明（IMP-4 修复 = 唯一有意变更；其余工具裁决语义与 v2 逐字节一致）。 |
| MODIFY | packages/lgdl-web/src/ai/AskDialog.tsx | v3 ask 呈现主体扩展（FR-044 主体；save/截图/剪贴板授权提示尾项归 TASK-011）：`AskDialogEntry.permission` 增可选 subcommand/risk/args/codeSummary/sensitiveWrite；`buildPermissionAskEntry(q: AskQuestion)` 导出构建函数（单一呈现数据源 —— 子命令名/risk 透传、page-eval 或 evaluate 档时 summarizeCode(args.code) 预算内代码摘要、dom 写子命令（DOM_WRITE_SUBCOMMANDS）且 risk:'write' 时置 sensitiveWrite）；渲染：子命令名/risk 徽标行（risk 中文标签 + evaluate 红标）+ page-eval 代码摘要块（含「untrusted 拒执行 + 需 --trusted true」说明）+ SENSITIVE_WRITE_NOTE 敏感字段写入确认文案块；user 分支零改动。 |
| MODIFY | packages/lgdl-web/src/ai/AiPanel.tsx | **连接器改动（plan §5.2 未列，实际代码缺口闭环）**：permHandler 原 `{kind:'permission', tool, reason}` 手工构造改为 `buildPermissionAskEntry(q)` —— AskQuestion 完整数据面（subcommand/risk/args）实际流入 AskDialog 呈现（FR-044 数据链路可通）；行为零变更（裁决路径/挂起/超时语义不变）。 |
| MODIFY | packages/lgdl-web/src/ai/session.test.ts | D-005 续记：FULL_NAMES 尾部增 wait/extract/export/page-eval（内建置末前，v2 既有注册顺序保持）；DERIVE_NAMES 剔除集增 page-eval；listHelp 21→25 个 + [collect]/[exec] 组头断言；新增 4 场景用例（矩阵三链 / wait 全链 fake ops / extract→export 共享 buffer + fake filePicker 落盘 / IMP-4 场景策略：只读 dispatch onAsk 零调用、click·set-text ask→allow（onAsk 收到 subcommand/risk）、PermissionGate({rules:LGDL_DEFAULT_POLICY_RULES}).check evaluate → deny）。 |

### 9.3 实现要点回顾（TASK-009，供 review 对照）

- **IMP-4 修复生效点（FR-007/AC-009）**：机制半（TASK-001 effectiveRisk + TASK-005 dom subcommandRisks：read 6→'read'）已在 base 生效；本任务把「只读免 ask」落为**场景显式子命令级策略**（App aiPolicy.rules = LGDL_DEFAULT_POLICY_RULES：dom 6 只读子命令 pattern+subcommand 显式 allow；既有 `{risk:'ui',ask}` 规则保持但有效面收窄到 ui 子命令；write 组无规则命中 → 缺省 ask）。session.test 场景断言：dispatch dom read-state onAsk **零调用**（修复验收）、click/subcommand=click·risk=ui ask→allow、set-text/risk=write 缺省 ask→allow、evaluate 规则面 deny（不静默 allow，FR-008/045）。
- **矩阵三链（FR-043/v2 FR-004 语义沿）**：wait/extract/export 默认开 → schema（deriveTools 含、注册序连续）+ help（一览含 + 详情可查）+ dispatch（fake ops/picker 全链可达）三链一致；page-eval enabled:false → schema 不含（deriveTools 剔除）、help 标注（一览「（已禁用）」+ 详情「该工具当前已禁用」）、dispatch 报「已禁用」（先于门禁与执行器 = evaluate 不触达 = 场景零注入面）。v2 既有注册顺序零漂移（2 业务 → P0 → P1 → v3 P1 → 内建置末）。
- **extract→export 共享 CollectBuffer（ADR-006）**：session 组装点单一 `createCollectBuffer()`，createCollectToolEntries 双条目共享注入 —— extract 增量采集（数据不进 output 只回摘要，fake rows 零回显断言）→ export 读同一 buffer 序列化 json（含 meta.source/collectedAt/trust）+ env.filePicker.save 落盘（save 手势/下载链两路由既有 base 语义，TASK-011 矩阵级断言扩展）。
- **base index 零删除零 UI（NFR-006/FR-044/AC-011）**：index.ts git diff **+40/-0**（纯追加导出块）；grep 断言 base src 无 `from '@lgdl/` / react import 新增、无 JSX/组件代码面；新增导出全部指向既有 v3 模块（无新依赖）。**AiPanel.tsx 连接器说明**：tasks/plan §5.2 只列 session/App/AskDialog 三 lgdl 文件，但实际 AskDialogEntry 由 AiPanel.permHandler 构造（v2 事实），子命令/risk/args 数据若不在此透传则 FR-044 呈现主体无数据源 —— 以 buildPermissionAskEntry 闭环节点（行为零变更），供 review/validate 知悉。
- **D-005 测试守恒**：session.test 派生顺序断言改写有据（矩阵增 4 注册名 → FULL_NAMES/DERIVE_NAMES 常量续记，派生断言承接 F-23 顺序语义等价覆盖；listHelp 21→25 为矩阵派生事实更新）；v2 既有 session 测试块（派生/600ms/既有注册/桥接/禁用语义）**零删除**，语义断言等价保留，全部全绿（55/55）。

## 10. TASK-011 构建记录（v1.8 追加：P2 接线收口 —— chrome/save/notify/clipboard 入矩阵 + chrome 规则 + AskDialog 尾项）

> 范围 = TASK-011（Wave 6 / plan P2-b 接线收口，L 级跨包；lgdl-web session.ts/App.tsx/AskDialog.tsx 第二段顺序扩展，串行于 TASK-009）；输入 plan §2.6 波3 + §4.4 交接表波3行 + ADR-001（chrome back/forward allow 规则前置）+ §5.1 index.ts 收口行 + §5.2 lgdl-web 文件行（S-06 save/notify/clipboard 入默认矩阵）+ spec FR-029/030/041/044 尾项；前置 TASK-009（P1 矩阵基线）+ TASK-010（chrome 工具）completed。

### 10.1 构建概要（TASK-011）

| 维度 | 数值 |
|------|:--:|
| 任务 | TASK-011（L 级）——P2 接线收口（chrome/save/notify/clipboard 入矩阵 + chrome back/forward 规则 + AskDialog save/截图/剪贴板授权提示尾项 + base index chrome 导出收口） |
| 新增文件 | 0（全 MODIFY；chrome-tools.ts 等 TASK-010 产物仅接线零改动） |
| 修改文件 | 5（base index.ts chrome 导出追加；lgdl-web session.ts / App.tsx / AskDialog.tsx / session.test.ts） |
| 新增测试 | 3 场景用例（session.test 55→58：v3 P2 矩阵三链 / chrome back·forward 免 ask·reload ask·clipboard 读写 ask 场景策略 / FR-041 export .xlsx 不支持 + csv 指引矩阵链路） |
| 验证门禁 | base build 零错误 + **base test 369/369**（v2 基线 356 + chrome 13 零回归）；lgdl-web vite build 零错误 + 显式 tsc 零错误 + **lgdl-web test 58/58**；grep 断言 clipboard.ts/notify.ts/save-file.ts 零改动（git diff 零命中）；AC-001 检查点④红线满足（v2 既有注册顺序保持 + LGDL_DEFAULT_POLICY_RULES 协调不破坏 IMP-4 修复） |

### 10.2 文件变更（TASK-011）

| 操作 | 文件路径 | 说明 |
|:--:|------|------|
| MODIFY | packages/web-cli-base/src/index.ts | v3 P2 chrome 导出收口（NFR-006 追加导出块，既有导出零删除 —— git diff 纯增无删行）：createChromeToolEntry/executeChromeTool/chromeHelp/CHROME_SUBCOMMANDS/SCREENSHOT_DATAURL_HEAD_BUDGET/parsePngSizeFromDataUrl/summarizeScreenshotData/screenshotFilename + ChromeSubcommand/ScreenshotDataSummary 类型（TASK-010 chrome-tools.ts 全量可达，消费端 lgdl-web session.ts 自此可 import）。 |
| MODIFY | packages/lgdl-web/src/ai/session.ts | ①默认注册矩阵 v3 P2 增量（第二段顺序扩展，串行于 TASK-009；v2 既有注册序保持）：`createChromeToolEntry(env)`（TASK-010 产物 5 子命令接线）+ `createSaveFileToolEntry(env)` + `createNotifyToolEntry(env)` + `createClipboardToolEntry(env)`（save/notify/clipboard = v2 既有工厂**仅接线零逻辑改动**，红线 grep 断言），注册于 v3 P1（page-eval）之后、内建之前；②`LGDL_DEFAULT_POLICY_RULES` 常量增补（App aiPolicy 与 session.test 单一数据源不变）：chrome back/forward **前置** allow 规则（`{pattern:'chrome', subcommand:'back'/'forward', action:'allow'}`，置于既有 `{risk:'ui',ask}` 规则之前 = 规则序生效面：命中 allow 免 ask = EC-009 会话内导航不触发 ask；reload/screenshot 写类不入规则 → 缺省 ask）+ clipboard 读写显式 ask 规则（`{pattern:'clipboard', subcommand:'read'/'write', action:'ask'}`，读=敏感面/写=写入 = FR-030 子命令级表达，不修改 clipboard.ts）；③行为 diff 范围声明注释更新（TASK-011 增补不构成 v2 回归：chrome 为 v3 新工具、clipboard 显式 ask 与既有 risk:'ui' 裁决一致）。 |
| MODIFY | packages/lgdl-web/src/App.tsx | aiPolicy.rules 引用不变（LGDL_DEFAULT_POLICY_RULES 单源自动携带 chrome/clipboard 新规则）；注释升级：v3 P2（TASK-011）chrome back/forward 前置 allow + clipboard 读写 ask 说明 + ★ 行为 diff 声明扩展（IMP-4 唯一有意变更 + TASK-011 chrome/clipboard 规则增补范围，规则明细见 session.ts 常量文档）。 |
| MODIFY | packages/lgdl-web/src/ai/AskDialog.tsx | FR-044 尾项（TASK-011）：`AskDialogEntry.permission` 增可选 `authNote`；新增 `authPathNote(tool, subcommand)` —— save（允许后弹系统文件保存对话框 FSA、取消/拒绝不中断会话、系统保存不可用/被拒 → export/save 落盘自动降级下载链 EC-012）/ chrome+screenshot（成功即自动触发下载链 + {尺寸/字节/文件名} 摘要、dataURL 不进上下文 --include-dataurl 才预算内回带、下载链不可用可读降级 ADR-003）/ clipboard+read（读=敏感面：允许后剪贴板文本进 AI 上下文，仅可信可展示时允许 FR-030）/ clipboard+write（允许后 AI 写入系统剪贴板）四路径提示；buildPermissionAskEntry 挂接 authNote；渲染蓝底信息块（置于敏感写入/代码摘要块后、remember 勾选前）；user 分支零改动。 |
| MODIFY | packages/lgdl-web/src/ai/session.test.ts | D-005 续记：FULL_NAMES 尾部增 chrome/save/notify/clipboard（v3 P2 段，内建置末前；DISABLED_NAMES 不变 = 四工具默认开）；listHelp 25→29 个 + [chrome]/[net] 组头断言；新增 3 场景用例 = ①v3 P2 矩阵三链（chrome/save/notify/clipboard 注册在册 + 派生连续序 + help 一览/详情可查 + dispatch 可调（fake ops historyNav / fake filePicker download / notify granted / clipboard seam）+ page-eval 仍禁用派发）②v3 P2 场景策略（LGDL_DEFAULT_POLICY_RULES：chrome back/forward dispatch onAsk 零调用（免 ask = EC-009）、reload ask（risk write）→ allow、clipboard read/write ask → allow（onAsk 收到 subcommand）、PermissionGate 规则面注入记录桥断言 ask 命中）③FR-041 矩阵链路断言（extract 入 buffer → export format xlsx → 「不支持 + csv 替代指引」且零落盘触达 → export csv → filePicker.save 落盘成功 = EC-012 数据保留可重导）。 |

### 10.3 实现要点回顾（TASK-011，供 review 对照）

- **P2 矩阵收口（FR-029/030 + FR-026~028 矩阵呈现）**：chrome（TASK-010 产物）与 v2 既有 save/notify/clipboard 三工厂在 lgdl-web session 组装点**仅注册接线零逻辑改动**（红线：clipboard.ts/notify.ts/save-file.ts 逻辑零改动，git diff 零命中）；矩阵派生顺序 = 2 业务 → P0 → P1 → v3 P1（wait/extract/export/page-eval）→ **v3 P2（chrome/save/notify/clipboard）** → 内建置末（v2 既有注册顺序保持，D-005 断言改写有据）。四工具默认开 → schema（deriveTools 含、注册序连续）+ help（一览含 + 详情可查）+ dispatch（fake ops/seam 全链可达）三链一致；save 工具同时承载 FR-029「export 落盘链」同源语义（export 走 env.filePicker，与 save 两路径同锚点）。
- **chrome back/forward 前置 allow 规则（EC-009/ADR-001）**：chrome back/forward subcommandRisks='ui'，若无显式规则将命中既有 `{risk:'ui',ask}` → 每次会话内导航都 ask；`LGDL_DEFAULT_POLICY_RULES` 增 `{pattern:'chrome', subcommand:'back'/'forward', action:'allow'}` 且**置于既有 risk:'ui' ask 规则之前**（PermissionGate 顺序首个 + deny 优先语义 = 规则序敏感）。session.test dispatch 断言 back/forward onAsk **零调用**（免 ask）、reload（subcommandRisks='write'）无规则命中 → 缺省 ask、screenshot 同 write 档缺省 ask。App.tsx aiPolicy.rules 引用同常量自动携带（单一数据源防漂移，不破坏 IMP-4 修复 = dom 只读 6 子命令 allow 规则保持原位）。
- **clipboard 读/写 ask 子命令级表达（FR-030，不修改 clipboard.ts）**：clipboard entry.risk='ui'（v2 工厂，无 subcommandRisks），既有 `{risk:'ui',ask}` 规则本已使其读/写均 ask；TASK-011 增 `{pattern:'clipboard', subcommand:'read'/'write', action:'ask'}` 显式规则把「读=敏感面/写=写入」语义固化到子命令级单一数据源（防未来 risk 档位调整漂移），行为与 v2 既有裁决一致 → 无新增回归面（行为 diff 声明）。AskDialog 侧 read 授权路径提示明示「允许后剪贴板文本原文将进入 AI 上下文」（敏感面）。
- **AskDialog 授权路径提示尾项（FR-044 尾项/EC-012）**：`authPathNote` 文案与 base 执行器/帮助面同源语义（save-file.ts / chrome-tools.ts / clipboard.ts），场景 UI 对 save/截图/剪贴板三类授权 ask 呈现「允许后发生什么 / 拒绝或系统授权失败如何降级」——save 手势拒绝 → 下载链降级（EC-012）、截图自动下载链 + dataURL 不进上下文（P-03/ADR-003）、clipboard 读=敏感进上下文/写=写入。渲染为独立蓝底信息块，user 分支零改动。
- **FR-041 矩阵级断言**：export .xlsx 入参 → 「不支持 + csv 替代指引」（xlsx 校验先于落盘 = 零 filePicker 触达断言）；csv 替代路径落盘成功（数据保留可重导 = EC-012 不静默丢数据）。base 层既有 collect-tools.test xlsx 边界用例零改动（矩阵链路断言为场景面承接）。
- **门禁/红线全绿**：base build 零错误 + test **369/369**（v2 基线 + TASK-010 chrome 13 用例零回归）；lgdl-web vite build 零错误 + 显式 tsc 零错误 + test **58/58**（+3）；grep 断言 clipboard/notify/save-file 三文件 git diff 零命中（零改动红线）；base index.ts 既有导出零删除（git diff 纯增无删行）。真实浏览器授权两路（save 成功/拒绝、clipboard roundtrip、notify 两路转译）用例清单写入 session.test 注释承接 validate（AC-005 冒烟输入面预备）。

## 11. TASK-012 构建记录（v1.9 追加：全仓门禁 GATE + AC-001 收口 + validate 冒烟/基线移交）

> 范围 = TASK-012（Wave 7 / GATE / plan P2-c 收口，M 级，**无源码业务改动**）；输入 plan §4.2 门禁清单 + §5.3 不改动面 + ADR-008（零回归承载）+ spec AC-001~012 + NFR/EC 汇总 + FR-004；前置 TASK-001~011 全部 completed。验证命令 = `npm run build && npm test && npx tsc --noEmit -p packages/lgdl-web/tsconfig.json`（全仓）。8 ADR 保持内嵌 plan §7 不单独落盘（沿用 v2 先例）。

### 11.1 构建概要（TASK-012）

| 维度 | 数值 |
|------|:--:|
| 任务 | TASK-012（M 级）——全仓门禁 + AC-001 收口 + validate 移交（纯验证/移交，无源码业务改动） |
| 涉及文件 | 0 业务源码改动（门禁验证 + 移交文档；build.md 本记录 + tasks.md TASK-012 状态 + 游离产物清理 1 件） |
| 全仓 build | 9 包（lgdl-cli/core/layout/render/router/web/web-cli/web-op-cli/web-cli-base）tsc + vite 全部零错误，exit 0 |
| 全仓 test | **895 pass / 1 skip（预存 B11 env-gated）/ 0 fail**（web-cli-base **369/369** + lgdl-web **58/58** + lgdl-core 267 + lgdl-render 94+1skip + lgdl-router 8 + lgdl-web-cli 84 + lgdl-web-op-cli 15；lgdl-cli/lgdl-layout dist 无测试产物 = 0 与 v2 基线同口径） |
| 构建门禁 | lgdl-web vite build 零错误 + 显式 `tsc --noEmit` 零错误；base 独立构建零错误（NFR-006） |
| grep 断言 | 5 项全零残留（详见 11.3） |
| D-005 核验 | ✅ 测试守恒（v2 用例零删除；session.test 派生断言改写有据，详见 11.4） |

### 11.2 全仓门禁证据（AC-001/AC-010/NFR-006）

**① 全仓 build 零错误**：`npm run build`（root → 9 workspaces）exit 0，逐包 tsc/vite 零 error（lgdl-web vite 仅 @anthropic-ai/sdk node:fs/path externalized 提示 = v2 既有，非本 Feature 引入）。

**② 全仓 test 895 pass / 1 skip / 0 fail**（exit 0）：
- `@lgdl/web-cli-base`：**369/369**（v2 提交基线 205 用例全保留零删除零降级 + v3 新增/增补 164 = 8 新测试文件 149 例 + dom-tools.test +5/permission.test +4/router.test +6 增补）
- `@lgdl/lgdl-web`：**58/58**（v2 提交基线 51 = locate 11/snap 8/provider 17/session 15 全保留 + session.test +7 净增）
- 其余包与 v2 基线逐字节一致：lgdl-core 267 / lgdl-render 94+1skip（B11 P2 环境门控预存跳过，非回归）/ lgdl-router 8 / lgdl-web-cli 84 / lgdl-web-op-cli 15
- 守恒算术核验：base 205→369（+164 = 149 NEW 文件 + 15 增补，**0 删除行**）；lgdl-web 51→58（+7 全在 session.test）；git diff 既有测试文件删除行 = 0（dom-tools.test +387/-0、permission.test +77/-0、router.test +179/-0、session.test +351/-14 中 -14 全为 import 行/注释头改写，用例零删）

**③ 构建门禁（NFR-006）**：`npm run build --workspace @lgdl/lgdl-web`（vite）零错误；`npx tsc --noEmit -p packages/lgdl-web/tsconfig.json` 零错误（0 输出行）；`npm run build --workspace @lgdl/web-cli-base`（tsc strict）零错误。

**④ v2 收口基线零回归（AC-001 检查点⑤）**：router/delay/permission/dom 7/sleep/session 等 v2 既有用例全绿零降级；deriveTools 派生顺序断言零漂移（F-23 顺序契约，session.test FULL_NAMES/DERIVE_NAMES 改写有据 D-005）。

### 11.3 grep 断言零残留（NFR-001/002、NG-008、AC-003/007/011、FR-044）

| # | 断言 | 方法 | 结果 |
|:--:|------|------|:--:|
| G1 | base 无 lgdl/react/业务 import 新增（NFR-001/AC-011） | 全 src 非测试 .ts 扫 `from '@lgdl/` / `from 'react'/react-dom` / `lgdl-` 前缀 | ✅ 零命中 |
| G2 | base 无 UI 代码（NG-008/FR-044，base 不上收 UI） | 无 .tsx；React 组件标识/JSX 面零命中（仅 `document.createElement` DOM API = 下载链/canvas 非 UI） | ✅ 零命中 |
| G3 | 无策略旁路实现（NFR-002/AC-007：evaluate/写无绕过门禁） | executor 调用点全量审计：ops.evaluate/typeText/setText/setValue/fillForm 等仅在 dom-tools/page-eval/chrome-tools executor 内、经 router.dispatch → PermissionGate.check（deny 先于执行器，间谍断言）→ 唯一执行入口；lgdl-web 无直连 ops/executor | ✅ 无旁路 |
| G4 | 4 转译桩文案零残留（AC-003） | v2 桩文案特征（「最小桩」「由浏览器面冒烟承接」）全仓扫；platform-dom.ts 4 ops 真实现（hover:817/scroll:830/zoom:889/fullscreen:918，FR-016/017） | ✅ 零命中（nodeEnv `unsupported('DOM 悬停')` 等 = v2 基线 node 面注入语义占位，非 browserEnv 桩，逐字节同 v2 保留） |
| G5 | xlsx/截图无第三方库依赖新增（NFR-001） | root + base + lgdl-web package.json git diff 零变更；base deps 仅既有 @anthropic-ai/sdk/openai | ✅ 零新增 |

> 附：不改动面（plan §5.3）守护 —— runner/delay/audit/eval-tools/clipboard/notify/save-file/sleep 等 v2 逻辑主体 git diff 零命中（sleep.ts 零触碰 = sleep 语义零回归红线）；root package.json/tsconfig/CI 零变更。游离产物清理 1 件：`src/locator.js`（未跟踪、与 tsc 编译输出逐字节一致的直接 tsc 残留，非业务源码）——已移除并在本记录在案。

### 11.4 D-005 测试守恒核验（AC-001 收口确认）

| 核验项 | 结论 |
|------|------|
| v2 测试文件零删除 | HEAD v2 23 个 base 测试文件 + 4 个 lgdl-web 测试文件全部现存（comm 对比零缺失）；base 新增 8 文件全 NEW（locator/sensitive/collect/collect-tools/wait-tools/page-eval/chrome-tools/platform-dom.test.ts） |
| v2 用例零删除 | 标题级 diff：session.test v2 15 标题 → 现 22（+9 新增 − 2 改写有据 + …）；删除行统计 base 既有测试文件 = 0 删除行；session.test -14 行全为 import 行 + 注释头（D-005 记录头）改写 + DERIVE_NAMES 常量重构，**非用例删除** |
| session.test 派生断言改写有据 | 2 个矩阵派生顺序标题改写（「P0/P1 矩阵 → P0/P1/v3-P1」+「AC-006 D-005 矩阵改写 → 续记」）= tasks.md §4.3 记录的矩阵扩展后派生断言改写；语义用例等价保留零删除 |
| 增删依据记录完整 | tasks.md §4.3 D-005 表逐行核对：router/permission/platform/dom-tools/sleep/eval-tools/session/provider 各行操作与实际 git diff 一致 |

### 11.5 validate 移交：真实浏览器冒烟清单（validate 输入面，V13 方法扩展）

> 以下为 validate 阶段真实浏览器（chromium，V13 CDP 方法扩展）输入面；node 注入面已全绿（本任务门禁），真实浏览器面不属于 build 验证命令（tasks.md §4.4 口径）。

| # | 冒烟面 | 逐项清单 | 关联 |
|:--:|------|---------|------|
| S1 | platform-dom 逐 ops ≥1 真实用例（V13 方法扩展） | **31 ops 全量**：v2 既有 7（readState/click 坐标·偏移/hover/scroll/zoom/fullscreen/snapshot 无参兼容）+ v3 24（interactives/readElement 读取面组合/findElements/readStructure/snapshotStructured 分页/interactives 预算/dblclick/contextmenu/longPress 时长可配/dragDrop/focusEl/blurEl/typeText React 受控 native setter 路径/pressKey 组合键/setText/setAttr/removeAttr/setStyle 三形态/setValue/fillForm 多字段+submit/addElement 四插入位/removeElement/waitFor SPA 动态/ evaluate trusted 执行/extractData/printPage/historyNav/reloadPage/screenshot 尺寸） | FR-003/AC-002/003/006/007/008 |
| S2 | lgdl-web React 受控表单 type/fill/set-value 值变更 | AiPanel prompt input / AskDialog textarea / SettingsPanel select+apiKey input 等受控面：type/fill/set-value 后值变更 + onChange 触发 | NFR-004/FR-022/034/035 |
| S3 | SPA 动态 wait | 延迟插入元素命中（SPA 渲染）+ 消失等待 + 超时含最后状态 | FR-025/AC-004 |
| S4 | 截图尺寸 | viewport/element 截图 dataURL 可生成且尺寸正确（2×3px 断言面扩展）；fullpage out 文案 | FR-028/ADR-003 |
| S5 | chrome 授权两路 | save 成功/拒绝两路、clipboard write→read roundtrip + 读 ask、notify 授权两路转译（session.test:437-442 注释清单承接） | AC-005/FR-029/030 |
| S6 | 采集端到端 | 真实多页列表 extract→翻页原语（wait+click）→ export 三格式 + 护栏触发保留 + trust 元数据 + csv 转义核验 | FR-038~042/AC-008 |
| S7 | evaluate 门禁端到端 | page-eval untrusted 拒执行 + trusted/ask 放行 + 审计（含代码摘要）+ eval-js 语义区分 | AC-007/FR-037/045 |

### 11.6 v2 收口基线关联表（FR-004：v3 写入/键盘/evaluate 类验收前置或并行人工基线）

> v2 遗留人工收口 3 项（validate-report v1.1 收敛清单）作为 v3 相关 FR 验收的**前置或并行人工基线**；未闭合时相关 FR 验收标注「**待基线**」不阻塞其余（R-009/FR-004）。validate 报告承接此表并登记 v0.7 同批（O-010：v3 与 v2 同属 v0.7 第二个 Feature 同批发布）。

| v2 收口项（来源 validate-report v1.1） | v3 关联验收面 | 关联关系 | 状态标注 |
|------|--------------|---------|---------|
| ① 真实 AI 闭环 AC-008（F-23 真实 LLM 消息流，需厂商 API Key + 交互式浏览器） | FR-022 type / FR-023 press / FR-034 set-value / FR-035 fill / FR-037 page-eval 的**真实闭环值变更断言**（lgdl-web React 受控 + evaluate trusted 放行） | v3 写入/键盘/evaluate 类真实闭环的前置人工基线（消息流编排 + 值变更人工对比） | ⏳ **待基线**（不阻塞 build/validate node 面与门禁；v3 机械面已由 fake ops 注入 + lgdl-web 58 用例承接） |
| ② lgdl-web React 集成面手测（AskDialog/SettingsPanel 弹层呈现、会话恢复入口 chip、真实系统通知展示） | FR-044 ask/授权 UI 呈现扩展（子命令/risk 徽标、page-eval 代码摘要、敏感写入确认、authNote 授权路径提示） | v3 AskDialog 新呈现面的并行人工点验基线（React 组件渲染层） | ⏳ **待基线**（node 面 buildPermissionAskEntry 单测 + vite build 已绿；真实弹层点验 validate 承接） |
| ③ web-search 真实端点（需配置 key 的搜索服务） | v3 采集/评估类验收的**外部数据面基线**（untrusted 来源标记语义对照：采集内容/extract 输出同源 untrusted 标记） | v2 既有工具真实端点基线，作为 v3「外部内容 → untrusted 标记」验收的并行人工基线（语义一致性对照） | ⏳ **待基线**（v3 自身不新增外部端点依赖；untrusted 语义面已由 collect/page-eval 单测全绿承接） |

> 移交登记：v3 与 v2 同批 v0.7 发布（O-010/FR-004），ROADMAP/CHANGELOG 同步为 sddu-roadmap 职责（plan §5.3 不改动面）；本表随 build.md 移交 validate 报告承接（AC-010 双轨 = node 注入面全绿 + 真实浏览器冒烟清单）。

## 12. 下一步（TASK-012 完成后）

| 场景 | 操作 |
|------|------|
| 12/12 任务全部 completed → 代码审查 | 运行 `@sddu-review specs-tree-web-cli-base-v3`（本 Feature 整体 review，以 build.md §1~§11 + tasks.md 状态为输入） |
| review 通过 → validate 真实浏览器冒烟 | `@sddu-validate specs-tree-web-cli-base-v3`（承接 §11.5 冒烟清单 + §11.6 基线关联表；v2 收口 3 项标注「待基线」不阻塞） |
| v0.7 同批发布登记 | sddu-roadmap 承接（FR-004/O-010，plan §5.3 不改动面） |

## 修订记录
> 记录本文档的版本变更历史

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建：TASK-001（Wave 1 / P0 机制层）实施完成，4 文件 MODIFY，增补 10 测试用例，v2 零回归全绿 | 2026-09-06 | SDDU Build Agent |
| v1.1 | 追加 TASK-003（Wave 2 / P1-a 类型层）：platform.ts PlatformDomOps additive 扩展完成 —— 1 文件 MODIFY（+298/-4），PlatformDomOpResult.dataUrl? + 28 可选方法 + click opts? + 15 接口/4 别名配套类型面导出；base build 零错误 + 全包 test 215 通过 + lgdl-web vite/tsc 零错误（v2 调用方零破坏编译断言）；platform.test 既有用例零改写（测试文件 0 删除行） | 2026-09-06 | SDDU Build Agent |
| v1.2 | 追加 TASK-002（Wave 2 / P1-a 纯逻辑层）：locator.ts（parseLocator → LocatorQuery，CSS 基线 + text=/text*= + role=/xpath= 显式不支持 + 非法 CSS/text= 可读错误 + locatorSyntaxHelp 事实源）+ sensitive.ts（type=password/autocomplete/name-id 三信号分类 + maskValue 无明文脱敏 + sensitiveWriteDecision ask+trusted）—— 4 文件全 NEW；base build 零错误 + 全包 test 249 通过（新增 34 用例）；两模块零 DOM/lgdl/react import；既有文件零触碰（AC-001 检查点②） | 2026-09-06 | SDDU Build Agent |
| v1.3 | 追加 TASK-008（Wave 3 / P1-b 采集域）：collect.ts（CollectBuffer + createCollectBuffer：护栏单点 200/5000/300ms 可配 + 限速/去重 + 脱敏写单点 + trust 元数据，P-04 内存态）+ collect-tools.ts（extract 只读工具 + export 写工具：text/json/csv + RFC4180 转义 + 元数据头 + save/download 两路 + 降级不丢数据 + xlsx 注入扩展点 xlsxSerializer?）—— 4 文件全 NEW（collect.test 12 + collect-tools.test 21 = 33 用例）；strict/非 strict 双模式 tsc 零错误；隔离 + 全量套件中 collect 面全绿；既有文件零触碰（AC-001 检查点③）；全仓 356 中 4 失败位于并行平台域在飞模块（platform-dom/dom v3），与本任务零交集 | 2026-09-06 | SDDU Build Agent |
| v1.4 | 追加 TASK-006（Wave 3 / P1-b wait 工具）：wait-tools.ts（parseWaitArgs 条件解析复用 locator（kind element/visible/interactable/gone/text + selector/text= + conditions JSON 多条件 + mode any/all + timeout 缺省 10000/上限 30s 钳制 + interval 缺省 200）+ executeWaitTool 单次委托 ops.waitFor（命中/超时透传状态摘要、未注入可读错误、NFR-007 零忙等）+ createWaitToolEntry（risk:'read' 免 ask / schema/help 与 sleep 语义区分 + ADR-005 observer/轮询策略声明））+ wait-tools.test.ts —— 2 文件全 NEW（20 用例）；strict/非 strict 双模式 tsc 零错误；wait 20/20 + sleep.test 15 既有零回归；既有文件零触碰（红线①sleep 零回归 / 红线②dom 轴零冲突，AC-001 检查点③）；**全仓 base build + test 356/356 全绿**（Wave 3 五路并行收口后复核） | 2026-09-06 | SDDU Build Agent |
| v1.5 | 追加 TASK-005（Wave 3 / P1-b dom 工具 7→27）：dom-tools.ts（SUBCOMMANDS 27 既有 7 顺序保持 + PER4 interactives/read-element/find/structure + INT8 dblclick/contextmenu/long-press/drag/focus/blur/type/press + WR8 set-text/set-attr/remove-attr/set-style/set-value/fill/add/remove；executor 逐子命令 → PlatformDomOps 可选方法映射 + 子能力未注入守卫 + 参数解析（click 坐标/read-element fields/structure parts/fill fields JSON/set-style 三写/add attrs·mode…）+ 缺参/非法可读错误；snapshot --structured 升级面；click 坐标 opts FR-020；subcommandRisks 27 全覆盖 read 6/ui 12/write 9，entry.risk 保持 'ui'；DOM_SCHEMA 42 flat properties + DOM_DESC/domHelp 升级）+ dom-tools.test.ts（+387/-0，5 v3 用例：元数据面/20 新子命令注入桩逐条/错误矩阵+未注入守卫/dispatch 级 read 免 ask·write ask = IMP-4 AC-009 机制侧/deny 优先 EC-014）；v2 既有 7+3 用例零删除零改写（git diff 0 删除行）；base build + 全包 test 356/356 全绿；lgdl-web vite/tsc 零错误（v2 调用方零破坏编译断言）；AC-001 检查点③红线满足 | 2026-09-06 | SDDU Build Agent |
| v1.6 | 追加 TASK-010（Wave 5 / P2-a chrome 工具）：chrome-tools.ts（print/back/forward/reload/screenshot 5 子命令 executor → PlatformDomOps printPage/historyNav/reloadPage/screenshot；subcommandRisks print/back/forward='ui'（back/forward 场景免 ask 面归 TASK-011）/reload/screenshot='write'，entry.risk 'ui' 回退；print --format pdf out；reload EC-009 恢复提示兜底幂等；screenshot fullpage 执行器短路 out + mode/selector/width/height/include-dataurl 参数面；dataUrl 输出策略 ADR-003/P-03 = summarizeScreenshotData（PNG 头段尺寸解析 + base64 字节折算）+ screenshotFilename + 默认自动下载链（filePicker.download 降级锚点 → 未落盘 ok:false 可读降级）+ {尺寸/字节/文件名} 摘要 + --include-dataurl 400 预算头段截断标记；CHROME_SCHEMA/CHROME_DESC/chromeHelp（用户侧确认/EC-009/近似度 ADR-003/NG-002·003 out））+ chrome-tools.test.ts —— 2 文件全 NEW（13 用例）；strict/非 strict 双模式 tsc 零错误；全包 test **369/369 全绿**（356 v2 基线 + 13 新增，v2 用例零删除零改写）；既有文件零触碰（AC-001 检查点③红线）；dispatch 级 reload deny 间谍 + back/forward allow 规则免 ask / 无规则 ask 规则面全绿 | 2026-09-06 | SDDU Build Agent |
| v1.7 | 追加 TASK-009（Wave 4 / P1-c 场景收口，IMP-4 修复生效点，跨包 6 文件）：base index.ts **+40/-0** v3 P1 导出面收口（locator/sensitive/platform-dom createBrowserDomOps/DomOpsScope + PlatformDomOps 扩展面 ~24 类型/wait/page-eval/collect/collect-tools 类型与工厂；既有导出零删除）；lgdl-web session.ts（默认矩阵注册 wait + extract/export（createCollectToolEntries 共享 createCollectBuffer）+ page-eval enabled:false；env.dom.ops = createBrowserDomOps() 显式装配（deps.env.dom.ops 覆盖缝保留）；新增 `LGDL_DEFAULT_POLICY_RULES` 场景子命令级策略常量 = App aiPolicy 与 session.test 单一数据源）+ App.tsx（aiPolicy.rules → 常量：dom 只读 6 子命令显式 allow 免 ask + 既有 risk:'ui' ask 规则保持 + evaluate 缺省 deny；★ 行为 diff 声明 = IMP-4 修复唯一有意变更）+ AskDialog.tsx（v3 呈现主体：子命令名/risk 徽标 + page-eval summarizeCode 代码摘要 + SENSITIVE_WRITE_NOTE 敏感写入确认文案 + `buildPermissionAskEntry(q)` 呈现数据构建函数）+ AiPanel.tsx（permHandler 经 buildPermissionAskEntry 注入完整 AskQuestion 数据面 —— **连接器改动**：AskDialog 数据链路实际可通，plan §5.2 未列 AiPanel，实际代码缺口以本改动闭环，行为零变更）+ session.test.ts（D-005 续记：FULL_NAMES 增 wait/extract/export/page-eval 尾部序、listHelp 21→25、新增 4 场景用例 = v3 P1 矩阵三链 / wait 全链 fake ops / extract→export 共享 buffer 落盘 fake picker / IMP-4 只读免 ask·ui·write ask·evaluate deny）；门禁：base build 零错误 + test **369/369**；lgdl-web vite build + 显式 tsc 零错误 + test **55/55**；grep 断言 base 零 lgdl/react import 零 UI 代码（FR-044/AC-011）；v2 既有矩阵注册顺序保持（F-23 派生断言改写有据，D-005 tasks.md §4.3） | 2026-09-07 | SDDU Build Agent |
| v1.8 | 追加 TASK-011（Wave 6 / P2-b 接线收口，L 级跨包 5 文件）：base index.ts chrome 导出收口（TASK-010 产物全量可达，既有导出零删除）；lgdl-web session.ts（v3 P2 矩阵增量第二段扩展，串行 TASK-009：createChromeToolEntry + save/notify/clipboard v2 工厂仅接线零逻辑改动 —— 红线 clipboard/notify/save-file 零改动 grep 断言 + LGDL_DEFAULT_POLICY_RULES 增 chrome back/forward 前置 allow（EC-009 会话内导航免 ask，规则序置于既有 risk:'ui' ask 前）+ clipboard 读写显式 ask（FR-030 子命令级表达）+ 行为 diff 范围声明）；App.tsx（aiPolicy 引用单源常量自动携带新规则 + 注释升级）；AskDialog.tsx（FR-044 尾项 authPathNote：save FSA 手势/下载链降级 EC-012 + chrome screenshot 自动下载链 dataURL 不进上下文 ADR-003 + clipboard 读=敏感进上下文/写=写入 四路径授权提示，buildPermissionAskEntry 挂接 + 蓝底渲染，user 分支零改动）；session.test.ts（D-005 续记：FULL_NAMES 增 chrome/save/notify/clipboard、listHelp 25→29 + [chrome]/[net] 组头、3 新场景用例 = v3 P2 矩阵三链 / chrome back·forward 免 ask·reload ask·clipboard 读写 ask 场景策略 / FR-041 export .xlsx 不支持 + csv 指引矩阵链路 + AC-005 真实浏览器两路用例清单注释）；门禁：base build 零错误 + test **369/369**；lgdl-web vite build + 显式 tsc 零错误 + test **58/58**；v2 既有矩阵注册顺序保持 + LGDL_DEFAULT_POLICY_RULES 协调不破坏 IMP-4（AC-001 检查点④）；累计 completed TASK-001~011（TASK-012 待门禁波次） | 2026-09-07 | SDDU Build Agent |
| v1.9 | 追加 TASK-012（Wave 7 / GATE 收口门禁，M 级，**无源码业务改动**）：全仓 build（9 包）零错误 + 全仓 test **895 pass / 1 skip / 0 fail**（web-cli-base 369/369 = v2 提交基线 205 零删除 + 164 新增/增补；lgdl-web 58/58 = v2 基线 51 + 7 净增；其余包与 v2 逐字节一致）+ lgdl-web vite + 显式 tsc --noEmit 零错误 + base 独立构建零错误（NFR-006）；grep 断言 5 项零残留（lgdl/react/业务 import、UI 代码、策略旁路、4 转译桩文案、xlsx/截图依赖 —— §11.3 G1~G5）；D-005 测试守恒核验（23 v2 base 测试文件 + 4 lgdl-web 测试文件零删除；既有测试文件删除行 = 0；session.test -14 行全为 import/注释头改写、2 标题矩阵改写有据 —— §11.4）；validate 移交：真实浏览器冒烟清单 7 面（platform-dom 31 ops 逐 ops ≥1 / React 受控表单 type·fill·set-value / SPA wait / 截图尺寸 / chrome 授权两路 / 采集端到端 / evaluate 门禁 —— §11.5）+ v2 收口 3 项基线关联表（真实 AI 闭环 AC-008 / lgdl-web React 集成手测 / web-search 真实端点 → 「待基线」不阻塞，FR-004/O-010 v0.7 同批 —— §11.6）；游离产物清理 1 件（src/locator.js 直接 tsc 残留）；本 Feature **12/12 任务全部 completed**（TASK-004/007 记录在 tasks.md 各自状态头），下一步 = @sddu-review 全 Feature | 2026-09-07 | SDDU Build Agent |
