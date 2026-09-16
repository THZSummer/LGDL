# 审查报告：specs-tree-v3-4-page-as-input

> **文档定位**: SDDU 审查报告 — 逐项记录自主审查的执行结果，作为 validate 阶段的输入
> **审查策略**: `review.md`（C1~C43 审查清单 + 四维度 + 第五维证据/文档保真 + 10 项安全面重点打假）
> **前置依赖**: `review.md` · `spec.md`（v1.1）· `plan.md`（ADR-V3-030~036）· `tasks.md`/`tasks.json`（TASK-401~415）· `build.md`（v1.0）· 父 `../spec.md`/`../plan.md`/`../discovery.md` · 已收口先例 v3-1/v3-2/v3-3 的 `{build.md, validate-report.md}`
> **创建人**: SDDU Review Agent
> **创建时间**: 2026-09-17
> **审查轮次**: R1
> **版本**: v1.0
> **更新人**: SDDU Review Agent
> **更新时间**: 2026-09-17
> **更新说明**: 初始创建（R1；HEAD `be54b70`，对照 `e528563..be54b70`）

---

## 1. 审查概要

| 维度 | 数值 |
|------|:--:|
| 审查项总数（C1~C43） | **43** |
| 通过 | **34** |
| 警告 | **6**（C8 · C10 · C21 · C30 · C34 · C41） |
| 失败 | **3**（C1 · C39 · C42 —— 归因 2 个阻塞根因） |
| 阻塞问题 | **2**（BLOCK-1 功能/生产路径；BLOCK-2 登记数字保真） |
| 复现实验 | `npm test` **795/795 pass, 0 skipped** · `test:supersession` **14/14** · `test:gate-integrity` **12/12** · `test:zero-injection` **20/0 PASS** · `test:page-input` **46/0 PASS**（全部本机重跑，非引用 build 日志） |
| 受控证伪实验 | **2 次 Chromium**（/tmp 副本、串行、profile 自清）：① 授权 origin 的 `/` vs `/app` A/B 注入 ② document_start 挂载后卸载的残留探针；**1 次右键/焦点行为探针**（nativeOnce 一次性 + 焦点占用/未复原） |
| 结论 | **❌ 不通过**（2 阻塞；改动量小、修复路径明确） |

---

## 2. 逐项审查结果（C1~C43）

| # | 审查对象 | 审查基准 | 评估 | 发现 | 严重程度 |
|---|---------|---------|:--:|------|:--:|
| C1 | 四项交互逐项生成 1 引用 + 1 选择题 | FR-V3-060 / AC-V3-022 | ❌ | 门禁层（根路径夹具）46/0 全过、断言真实；**但生产路径在带路径的真实页面上完全不可用**：`service-worker.ts:970` 用 `normalizeStableOrigin(url)`（只 trim+去尾斜杠+小写）处理**完整 URL**，`http://h:p/app` ⇒ origin 字符串含路径 ⇒ `origins.isAuthorized()` 恒 false ⇒ `pick-layer-inject` 返回「未授权站点 …/app」且不注入。受控探针 A 原文：同 tab 在 `/` 时 `{"ok":true,"injected":true}`、`layer=object`、`shadowHosts=1`；换到 `/app` 后 `{"ok":false,"error":"未授权站点 http://127.0.0.1:44225/app：页面侧零注入…"}`、`layer=undefined`。**真实站点普遍带路径 ⇒ 四项交互在生产上不可达** | **阻塞** |
| C2 | 拾取结果非常驻输入框 | FR-V3-061 | ✅ | `acceptCapture()` 只 `dispatch({type:'ask',kind:'choice'})`；`page-input` ② 断言 `#ask-fallback` 全程 `hidden=true`；`index.html#composer` 默认 `hidden`（v3-1 已处置） | — |
| C3 | 唯一高亮 + 撤销零残留 + 拾取期间零命令 | FR-V3-062 | ✅ | `pick-overlay.ts:131` 单一 `.outline` 节点（结构上不可能两个）；`pick-layer.ts` 无任何命令通道（`grep` 无 `dispatch`/`commandSends` 写点）；`page-input` ③④ 断言 `visible outlines === 1`、`l1.commandSends === 0` | — |
| C4 | 拖动落点 / 未落点两路径 | FR-V3-063 | ✅ | `onPointerUp`（`:308-316`）未落点零副作用（连消息都不发）；`pick-input.ts#onDragOver/onDrop` 只认 `application/x-wcli-ref`；`page-input` ⑤ 两路径各断言 | — |
| C5 | 右键三退让 + manifest 零新增 | FR-V3-064 / AC-V3-017 | ✅ | 探针 B：① 未授权不拦截（另见零注入门禁）；② `nativeOnce` **真一次性**（第 2 次右键 `defaultPrevented=false`、`nativeOnce` 复位、页面自身 handler 收到；第 3 次恢复拦截 `menuOpen=true`）；③ `Esc` / 空白点击关闭且不执行动作。`manifest.json` 零 diff、无 `contextMenus` | — |
| C6 | 拖选气泡 + 动作候选 + 生成引用与选择题 | FR-V3-065 | ✅ | `onMouseUp` 三重守卫（可编辑区 / `MIN_SELECTION_CHARS=2` 去空白 / 自身 UI）；`showBubble` 用 `onclick`（不叠加处理器）；`page-input` ⑦ 断言气泡出现、宿主选区未破坏、输入框内不出现 | — |
| C7 | chip ↔ 角标同序号 + 双向 hover | FR-V3-066 | ✅ | id 单源 = `ref-store`，`acceptCapture` 把 id 回写页面（`data-wcli-ref` + `ordinalGlyph`）；`page-input` ⑧ 两向各断言 | — |
| C8 | 按需注入 / 未授权零注入（含绕过态枚举） | FR-V3-067 / NFR-V3-007 / AC-V3-018 | ⚠️ | **结构性主张成立**：独立枚举全仓仅两处 `executeScript`（`content.js` / `pick-layer.js`）、`registerContentScripts` 无 pick-layer、layer 的监听与 Shadow host 只在被注入时创建；`pick-layer-inject` 双闸门（OriginStore `isAuthorized` + Chrome host permission），未授权态返回可读拒绝且零注入（探针 + 门禁 20 断言复核）。**两个生命周期缺口**：(a) `teardownPickLayer()`（`:1020-1027`）只对**单个** target tab 发 teardown ⇒ 同一 origin 的**其它 tab** 在撤销后仍留有活层并继续 `preventDefault` 右键（序列：A/B 两 tab 均被注入 → 撤销 → 只拆 B）；(b) 层从不按 `bridge.env().authorized` 在交互时自检；`pushState('gone')` 从未被调用 ⇒ `pick-input` 的 `phase==='gone'` 分支是死路径、卸载后面板仍视为 `injected`。方向 fail-closed（判定链 `authorized:false` 会阻断动作），故非阻塞，但 EC-V3-003 的字面要求未在所有态成立 | 中 |
| C9 | 未授权/探测中 L0 明示零注入 + 入口禁用 | FR-V3-068 / EC-V3-003/005 | ✅ | `view-model.ts#l0ViewModel`（`unavailable` 优先于授权/探测分支）+ `l0/shell.ts` 追加风险行（在风险位唯一写入者之后，`data-risk-class=pageUnavailable`）；实跑门禁断言 `/零注入/`、`pickDisabled=true`、`data-disabled-reason` 可读 | — |
| C10 | 宿主样式污染可读 + 不吞宿主非目标事件 | FR-V3-069 / EC-V3-017 | ⚠️ | `all:initial` + shadow + `z-index 2147483000` 隔离成立；五规则逐条实现（Alt 不 `preventDefault`；非拾取态不接管 `pointerdown/move`；仅当前目标接管；菜单仅在自己打开时拦截；气泡不阻止选区）。**缺口（探针 B 实测）**：`menu.open()` 末句 `move(1,0)` 无条件 `rows[0].focus()` ⇒ 打开菜单即**夺走宿主焦点**（实测 `#host-input` → shadow 内 `ref` 行，`document.activeElement` 变影子宿主），关闭（Esc / 点空白 / 选中项）后**不还原**（实测回落 `BODY`，原输入框未恢复焦点）；且站点自带 `contextmenu` 处理器仍会执行（实测 `pageCm` 每次 +1），与自绘菜单并存（后者已如实登记为「右键菜单观感 ⏳ 未执行」） | 中 |
| C11 | 手势表条目数 = 实现数（单源渲染） | FR-V3-070 | ✅ | `view-model.ts:775#L1_GESTURE_LABELS` 为唯一清单（`L1_GESTURE_COUNT = length`），`panels.ts:286-292` 按清单渲染，`index.html` tbody 改为空壳 `#l1-gestures-rows`；`page-input` ⑩ 断言条目数 = 6 且**集合相等** | — |
| C12 | 引用 id 四处一致 | FR-V3-071 | ✅ | 同一 `refId` 贯穿 chip / badge / 证据层 / 失效风险行；`page-input` ⑧ 断言 `data-wcli-ref` = 侧栏铸造 id、角标 glyph 同序号 | — |
| C13 | `manifest.json` 零 diff 断言 | FR-V3-072 | ✅ | `git diff e528563..be54b70 --numstat -- manifest.json` = 空；`zero-injection.test.ts` ① 冻结 `permissions`/`optional_permissions`/`host_permissions`/`optional_host_permissions` 集合 + 无 `contextMenus`/`content_scripts`/`web_accessible_resources` + `minimum_chrome_version=116` | — |
| C14 | **AC-CONV-1** 真实 env 注入点 | spec §7.1 | ✅ | `sidepanel.ts:1028#syncRefEnv()` 由 `render()`（`:839`）每次调用 = 生产中唯一 `setEnv` 调用点（`grep` 独立复核：seam 之外恰 1 处）；字段来源真实：`currentOrigin/authorized` 取自面板状态、`documentId/navSeq` 取自**页面侧实报**（`pick-layer-state`）、`declarationHash` 取自 SW 对**采纳声明投影**的 `sha256Hex(...).slice(0,16)`（`service-worker.ts#declarationEnv`），无声明时 `''` ⇒ `missing-fact` 阻断（fail-closed）；门禁内含「抹掉生产调用点 ⇒ 判据变 0」的反证 | — |
| C15 | **AC-CONV-2** 唯一动作入口走 guard | spec §7.1 | ✅ | 独立 `grep -rn "dispatchRefAction" src/` 结果：定义 `panels.ts:381`、接口 `:125`、**调用点仅 `sidepanel.ts:1009` 一处**（与门禁期望 `['src/ui/sidepanel/sidepanel.ts: 1']` 一致）；`applyRefAction` 首句即 `l1?.dispatchRefAction(...)`（其内部首句 `isRefUsable` guard）；测试 seam 的 `act` 也改走 `applyRefAction`（无双实现）；`submitAsk` 引用回合不再走 `ask-user-response` | — |
| C16 | `content.js` ≤ 177,076（无容差）+ 三 pin | NFR-V3-003 / AC-V3-015 | ✅ | `stat -c %s dist/content.js` = **177076**；三源 `sha256sum` 与 `CONTENT_SOURCE_SHA256` 逐项相等（`a7290031…`/`7df782b3…`/`5737c40a…`）；`pick-layer-budget.test.ts` 复核 + RP-V3-06 三段日志（content/pick/pin 各 `2 tests / 1 pass` FAIL 段 + restore `2/2`） | — |
| C17 | `sidepanel.js` 显式重登记披露五要素 | NFR-V3-005 / AC-V3-016 | ✅ | 结构化字段自洽：`SIDEPANEL_BASELINE_BYTES=FINAL=362_777`（= 实测）、`ceiling=380_915=floor(362,777×1.05)`、容差 5%、cap record-only、`targetBudgetBytes/targetMet=null`、`_HISTORY/_TIMELINE/RE_REGISTRATIONS` 保留历史值、`previous*` 齐备；归因表逐模块可复现（见 C42 的算式复核）。（同文件**散文**数字错误另记 C42） | — |
| C18 | 权限与依赖零新增 | NFR-V3-006 / AC-V3-017 | ✅ | `manifest.json` 零 diff；`package.json` 仅追加 2 个 script（`dependencies`/`devDependencies` 零新增）；`manifest` 无 `externally_connectable`（页面脚本无法直连 `chrome.runtime`） | — |
| C19 | 零注入门禁「能真 FAIL」 | NFR-V3-007/013 / AC-V3-018 | ✅ | 本机重跑 `test:zero-injection` = 20 passed / 0 failed，含：Chrome 层拒绝（`Cannot access contents of url …`）、SW 层可读拒绝、注册扫描负控（同扫描能看见注册）、CDP 强制注入后 `marker=object/shadowHosts≥1/intercepted=true` 三项翻红、`unmount()` 后归零 | — |
| C20 | 计数只增不减 + 日志完整 | NFR-V3-012/014 | ✅ | 本机 `npm test` = `ℹ tests 795 / pass 795 / fail 0 / skipped 0`（下界 646）；`/tmp/opencode/v3-gate-logs/v3-4/` 逐门禁摘要与 build.md §1.2 逐项相等（journey 见 `ui.log`=167、insight 116、binding 192、density 127、l0 164、l1 103、l2 71、hardening 24、e2e PASS、meta 12）；日志**无 tail 截断**（全量文件在） | — |
| C21 | EC 落点逐条 | spec §6 | ⚠️ | EC-V3-003/005（零注入 + 探测不发命令）✅；EC-V3-006（元素消失 → 撤销高亮 + 上报）+ EC-V3-014（多 tab/origin 切换按失效）+ EC-V3-017（样式污染可读可关）✅（实现 + 门禁/探针）；EC-V3-012（余量 0 冲突 → 独立产物，未放宽上限）✅。**EC-V3-007（扩展重载 / SW 休眠恢复后重新解析注入与引用有效性）无专门断言**：恢复依赖 `render()` 的 `ensureInjected()` 与 `state` 重读（机制存在），但无「SW 重启后不注入失效引用」的机器判据；同一缺口的另一面见 C8(a)（teardown 单 tab） | 低-中 |
| C22 | 拾取不产生判定路径 / 零提权控件 / 零审计明文 | AC-V3-019 | ✅ | `pick-layer.ts`/`pick-bridge.ts` 只上报 facts（无 `dispatch`、无命令、无判定）；`pick-menu.ts` 5 项均为引用/目标类，无提权项；`page-input` 断言拾取全程命令发送 = 0 | — |
| C23 | ADR-V3-030 遵循 | ADR-V3-030 | ✅ | 第 5 entry（`build.mjs:63-72`，IIFE，既有 4 entry 零改）；双触发（`refreshState → ensureInjected` + `#l0-pick → startPick`）共用同一幂等 inject；幂等由 `window.__wcliPickLayer` marker 保证（门禁断言「再次注入不产生第二个 Shadow host」）；teardown 挂在 revoke / port disconnect / panel pagehide；失败降级可读 | — |
| C24 | ADR-V3-031 遵循（独立上限 / 不合并计数） | ADR-V3-031 | ✅ | `PICK_LAYER_BASELINE_BYTES = PICK_LAYER_CEILING = 32_391`（tolerance 0）、`PICK_LAYER_BASELINE_META` 齐备（source/buildCommand/measuredBy/spikeSkeletonBytes 8,606/`disambiguation` 明写不合并）；`pick-layer-budget.test.ts` ③ 用两个方向断言证明两侧守卫互不兜底 | — |
| C25 | ADR-V3-032 遵循 | ADR-V3-032 | ✅ | 路线 1（零权限）；5 项 × 三退让；`role=menu`/`menuitem` + roving tabindex + 方向键/Home/End/Enter + 视口钳制；**刻意不提供「复制选择器」**（会引入剪贴板权限）与注释一致 | — |
| C26 | ADR-V3-033 遵循（隔离 + 两世界边界 + 来源校验） | ADR-V3-033 | ⚠️ | 注入落 **ISOLATED world**（spike 记录，`page-input`/`zero-injection` 均以 `executeScript({func})` 读层状态，主世界读共享 DOM）；桥只有 `chrome.runtime`（facts only），**不存在 `postMessage` 桥** ⇒ 页面脚本无法伪造消息（且 manifest 无 `externally_connectable`）——「来源校验」在威胁模型上不需要。**但隔离是「CSS 隔离」而非「脚本隔离」**：`attachShadow({mode:'open'})` 使页面脚本可读/改自绘 UI；`data-wcli-ref` 落在共享 DOM；层的事件处理器**不检查 `ev.isTrusted`**，页面脚本合成 `dblclick`/`contextmenu`/`mouseup`/`dragstart` 即可驱动捕获或弹菜单（无命令通道，故不产生越权动作）。属加固面，非本叶红线 | 低 |
| C27 | ADR-V3-034 遵循（共享捕获口径） | ADR-V3-034 | ✅ | `ref-capture.ts` 为唯一捕获实现（稳定优先 `id → data-* → ≤6 级结构路径`；截断 80/120 与 v3-2 `ref-store` 常量**逐字相等**由单测断言）；`resolveRef` 只报观测（缺标记不冒充）；未改冻结三文件 | — |
| C28 | ADR-V3-035 遵循（spike 门 S1~S4） | ADR-V3-035 | ✅ | `/tmp/opencode/v3-gate-logs/v3-4/spike-evidence.json` 原文：S1 授权 `{ok:true}` / 未授权可读拒绝；S2 骨架 **8,606 B ≤ 60,000**；S3 五探针全负 + CDP 强制注入翻红 + unmount 归零；S4 三退让；未触发 D1/D2（登记在 §9.5） | — |
| C29 | ADR-V3-036 遵循（取代策略） | ADR-V3-036 | ✅ | `test/ui/binding.mjs` 在本 commit **零改动**（`git show --stat` 无该文件）；新增门禁 3 个（zero-injection / page-input / pick-layer-budget）+ 台账只追加（V34-*，旧值逐字保留）；受保护区 hash 断言通过（`test:supersession` 14/14） | — |
| C30 | 文件影响对齐（清单失真核查） | plan §5 / build.md §2 | ⚠️ | 实际 diff = 13 新增 + 18 修改 + 3 SDDU 产物（`git show --stat`）；build.md §2.2 **两条 MODIFY 失真**：`test/insight-archive.test.ts`、`test/density-thresholds.test.ts` 在本 commit **零 diff**（体积登记由导入同一常量自动同源，无需改动）；「修改文件 16」按「表格行」计而实际文件 18（行内合并了 2+3+2 个文件），口径未写明 | 低 |
| C31 | 方向性守卫语义变更性质（最差连续两轮） | NFR-V3-005 / 裁决 V3-VOL-1 ④ | ✅ | 读全文：`rounds` 先按 `feature + roundKind==='feature-round'` 过滤，再对**全部相邻对**取 `max` ⇒ ① 数学上等价于「相邻对最大增幅，一旦触发永不遗忘」（新轮只能新增一对、不能移除旧对，故告警只增不减）② 无可致误报的路径（阈值/文案/回报要求未动；文案仍逐字点明「必须显式回报编排器」）③ **配反证**：真实数据下 `cumulativePct > 0.15` 与文案 `/22\.9\d%/` 断言（若退回「最后两轮」口径，实测仅 +10.44% ⇒ 该断言必 FAIL，即语义回归会被抓住）+ synthetic 低于阈值不告警的反证。复算：worst pair = `v3-1 + v3-2`（266,500 → 327,679）= **+22.956%**。**判定：收紧，非偷换** | — |
| C32 | 可读性 / 职责单一 | 项目宪法 | ✅ | 六个 pick-* 模块职责清晰（layer=组装/状态机、overlay=画布、menu=菜单、bridge=消息、protocol=校验、ref-capture=口径）；`op()` 是唯一门禁派发器；无第二份截断/选择器/菜单行表实现（`MENU_ITEM_KEYS` 单一定义、`L1_GESTURE_LABELS` 单一清单） | — |
| C33 | 错误处理完善（不静默） | FR-V3-068 / NFR-V3-015 | ✅ | 注入失败 → `errorResponse('页面侧不可用：…')` + `data.benign` 分类（无站点标签页不误报风险行）；载荷解析失败 → 可读通知；`pick-layer` 内 `query()`/`selectionText()`/`scrollIntoView` 全部 try 保护；`bridge` 对无扩展运行时降级为不报错（负控可存活） | — |
| C34 | 无死代码 / 资源清理完整性（teardown 真实性） | §5.1 / ADR-V3-030 | ⚠️ | 产品路径 teardown **真清**（探针 A：`shadowHosts 0 / intercepted false / marker undefined`（两世界），12 个 document 监听全在 `listeners` 数组内成对移除、`cancelPlus()` 清定时器、`restorePush/Replace` 复原、`bridge.unmount()` 摘监听）。**三处残留（读码 + 探针 B 实测）**：(a) `pick-overlay.ts:116-124#mountHost` 在 `documentElement/body` 皆空时挂 `DOMContentLoaded` 监听，`unmount()`（`:263-267`）**不移除** ⇒ document_start 挂载后卸载，DOMContentLoaded 触发时 `parent.appendChild(host)` 把 Shadow host **复活**（探针 B：`{docElAtStart:'null', unmounted:true, markerAfterUnmount:'undefined'}` 且加载后 `shadowHosts: 1`，无监听、无拦截，纯残留节点）；(b) `flash()` 的 `setTimeout`（`:176`）未跟踪/未清除（命中已卸载节点，无害）；(c) `history.__wcliPickWrapped` 守卫只读不写 ⇒ 死判据（`patchHistory` 幂等实际由 marker 保证） | 中 |
| C35 | 测试存在性 + 真实断言 | §5.4 / NFR-V3-013 | ✅ | 本机重跑：`npm test` 795/0（含新增 4 个 node 测试文件 16 用例）；`test:page-input` 46 断言全部为行为级真实断言（`check('③ 唯一高亮：DOM 中可见描边节点恰好 1 个')`、`check('④ 拾取期间命令发送计数 = 0')`、失败降级 4 条等）；`test:zero-injection` 20 断言含负控 | — |
| C36 | 边界与错误场景覆盖 | §5.4 | ✅ | `ref-capture.test.ts`：截断边界（恰好 80/120 + 省略号）、稳定优先 3 级、8 字段集合 + 不含判定结论字段、输入区 4 类、`resolveRef` 4 态（resolved/missing/ambiguous/unreachable）；门禁含失败降级、非法载荷、拖拽未落点、Esc/空白 | — |
| C37 | 反证真 FAIL | NFR-V3-013/018 | ✅ | 逐条有 FAIL 段与还原证据：`RP-V3-06-{content,pick,pin}`（各 `2 tests / 1 pass`）、`RP-V3-03`（`126 passed / 1 failed` → restore `127/0`）、`RP-V3-05`（`15 tests / 14 pass`）、AC-CONV 两条（in-test 反证：抹掉生产 `setEnv` ⇒ 计数 0；伪造第二 `dispatchRefAction` 调用 ⇒ 集合不等）、绝对路径 `+1 B` 反证 | — |
| C38 | 元门禁自动纳入 + 虚绿扫描 | NFR-V3-012/014 | ✅ | 本机 `test:gate-integrity` = **12/12**；独立复算 `discoverGateFiles`（marker = `failures.push(` / `send(method, params` / `_v3-helpers.mjs`）得到 **14 个受审文件，含 `test/ui/page-input.mjs` 与 `test/ui/zero-injection.mjs`** ⇒ 两个新门禁确实被自动纳入，且 12/12 是**纳入之后**跑的；虚绿扫描见 §7.1（0 命中，2 处受产物存在性守卫的 `t.skip` 在本机实跑中 `skipped 0`） | — |
| C39 | 夹具代表性（全绿是否只是夹具选择） | NFR-V3-013 / AC-V3-022 | ❌ | 两个新门禁的 fixture 服务器对**任意路径**都返回页面，但导航只用 `${origin}/`（`page-input.mjs:84`、`zero-injection.mjs:96-97`）；`origin` 亦只取 `http://127.0.0.1:PORT`。**这正是 C1 缺陷能全绿的原因**：门禁从未在带路径的 URL 上注入过。夹具形态应至少含一条真实路径（与「真实站点」代表性直接相关） | **阻塞（与 C1 同根因）** |
| C40 | `build.md` 数字与实测一致 | build.md / §5 | ✅ | 逐项核对：**795**（本机）、**20 / 46**（本机）、**127 / 164 / 103 / 71 / 167 / 116 / 192 / 24 / 12 / e2e PASS**（门禁日志摘要逐条相等）、**32,391 / 362,777**（`stat`）、**380,915**（`=floor(362,777×1.05)` 复算）、**+36.13%**（`(362,777−266,500)/266,500` 复算）、**8,606**（spike 证据 JSON）；§5.2 四类分解 `50,443+16,388+265+456 = 67,552` = `362,777−295,225`，未解释字节 721 < 1,000、必需占比 98.9% 均复算成立 | — |
| C41 | 台账完整性（V34-* / 他叶追加 12 行 / 未登记修改） | AC-V3-011/012 | ⚠️ | 优点：`V34-*` 26 条（S1,S2,S4~S13 + N1~N14）`newTitle` 全部可定位（`test:supersession` 14/14 断言）；他叶（v3-3 叶段）追加的 **12 行**逐条独立复演：`git show bf5773d:<file>` 确认 12 行确在叶起点存在（`assert.equal(L1_GESTURE_COUNT, 4);`、`rounds[rounds.length - 2]`、`const cumulativePct = (toBytes - fromBytes) / fromBytes;`、`afterBytes: 13_280`、`/4 个手势/`、3 条 `344,062` 注释等），且**只追加未改写**既有登记项 ⇒ 该追加真实、理由成立。**三个缺口**：(a) `V34-S3` 编号缺失（全仓 0 引用）而 build.md/commit message 写「V34-S1..S13」；(b) `test/insight-protocol.test.ts` 本 commit 删改了 2 行（union guard 正则 + `unionGuard` 构造）却**在台账里零出现**（无 entry / 无 modifiedRange / 不在 protectedRanges），而删除行判据的文件集合正是由台账自身推导（`supersession-ledger.test.ts:355-360`）⇒ 该删除不可见；(c) v3-3 叶段追加项以 `file="*v3-4 轮在 v3-3 叶段范围内的重 pin（12 行）"` 合成文件名承载（判据按 `file` 精确匹配，`*` 前缀条目只被 `reason` 承载）——机制可用但可读性差 | 中 |
| C42 | 体积重登记数字自洽 / Feature 累计算法 | NFR-V3-005 / §1.10 | ❌ | **结构化字段正确**（362,777 / 380,915 与实测一致），**散文/注释/台账字段与实测冲突**，同一事实出现 3 个「终值」：`362,163` / `362,777`（真） / `362,865`。原文：`size-baseline.ts:323`「349,925 → 362_865 B（+12_940 B，+3.70%）」、`:327`「floor(362_865 × 1.05) = 381_008 B」、`:230` `SIDEPANEL_BASELINE_BYTES_TIMELINE` 追加了**两个中间值** `362_163, 362_865`（既非前值也非登记值）、`:523` `ceilingUncappedFormulaBytes: 380_271`（= floor(362,163×1.05) ≠ 380,915，且无任何门禁断言）、`consecutiveGrowthAlert` 写 `+22.95%`（复算 **+22.96%**）与 Feature 累计 `+36.16%`（复算 **+36.13%**）；`docs/v3-density-baseline.json:372/502` 同源散文同为 `362865 / 381008 / +12,940 / +3.50% / +36.16% / 22.95%`（且 `pick-input.ts 5,053 B` 与实测归因表 5,085 B 不符）；ledger 中 `362,163 / 380,271` 出现 **16 处**（`V34-S10/S11/S12` 的 newTitle/oldTitle 与 7 条 reason）。**Feature 累计算法与口径无漏轮**（含 v3-3 修复轮 349,925 与 v3-4 轮），故为**保真缺陷**而非口径错误 | **阻塞（中：登记/审计事实层）** |
| C43 | 红线与纪律零改动 | spec §2.2 / AC-V3-025 | ✅ | 见 §7.2 原文：红线六类零 diff、`content.js=177,076`、三冻结 hash = pin、判定链（`l1/ref-validity.ts`）未改、`main` 停留在 `2ddc922`（未动）、主界面保持无常驻输入框（`#composer` 默认 hidden）、风险位常驻不可折叠（密度 127 断言 + RP-V3-04）、人工面 6 项如实 `⏳ 未执行`、工作树 `git status` 干净、无 `git add -A`/force push 痕迹 | — |

---

## 3. 审查维度汇总

| 审查维度 | 审查项数 | 通过 | 警告 | 失败 | 通过率 |
|---------|:--:|:--:|:--:|:--:|:--:|
| 代码质量 | 3 | 2 | 1 | 0 | 66.7% |
| 规范符合性 | 22 | 18 | 3 | 1 | 81.8% |
| 架构一致性 | 9 | 8 | 1 | 0 | 88.9% |
| 测试质量 | 5 | 4 | 0 | 1 | 80.0% |
| 证据/文档保真（第五维） | 3 | 1 | 1 | 1 | 33.3% |
| 纪律 | 1 | 1 | 0 | 0 | 100% |
| **合计** | **43** | **34** | **6** | **3** | **79.1%** |

---

## 4. 阻塞问题（必须修复后才能进入 validate）

| # | 位置 | 问题 | 对应 Cx | 修复建议（可执行） |
|---|------|------|:--:|---------|
| **BLOCK-1** | `src/background/service-worker.ts:970`（`pickLayerTarget`） | **把完整 URL 当作 origin**：`const origin = normalizeStableOrigin(url)`（该函数只做 `trim + 去尾斜杠 + toLowerCase`）。带路径的真实页面（`https://site/app`）⇒ 返回 `https://site/app` ⇒ ① `candidate.expect`（真 origin）比对失败、② `origins.isAuthorized('https://site/app')` = false ⇒ `pick-layer-inject` 拒绝注入并**误报「未授权站点 …/app」**，`ref-highlight` / `pick-layer-teardown` 同样 target 解析失败。后果：**「页面即输入」在除站点根页外的所有真实页面不可用**（FR-V3-060~072 生产交付失败），且 L0 风险位对**已授权**站点显示「未授权…零注入」（FR-V3-068 可读原因的诚实性）。受控探针 A 已复现（`/` ok=true vs `/app` ok=false，同一 tab 同一授权） | C1 / C8 / C9 / C39 | 一行修复：`const origin = tabOrigin(url);`（`session-follow.js` 已导出并在本文件 `:53` 导入，内部按 `new URL(url).origin` 处理并拒绝非 http(s)）——若需保留 `file:`/`blob:` 的 benign 语义，可写 `const origin = (() => { try { return tabOrigin(url) ?? '' } catch { return '' } })()` 并在空值时 `continue`（`tabOrigin` 已在本文件 `:53` 导入：`export function tabOrigin(url)` 对 http(s) 返回 `u.origin`、其余返回 `null`）。**注意**：`normalizeStableOrigin` 在 `:1773` 另有用途（OriginStore 授权集合比对），**不要**删除该导入。**同时**（a）核对 `pickLayerTarget` 内 `candidate.expect` 与 `tabOrigin` 的口径一致（两者都应是真 origin）；（b）在 `page-input.mjs` 夹具中把站点 tab 导航到 `${site.origin}/app`（并保留一条根路径断言）新增 **1 条回归断言**：授权 origin 的**带路径**页面上 `pick-layer-inject` 必须 `ok:true` 且 `window.__wcliPickLayer` 为 `object`——这条断言必须能 FAIL（先本地回退修复验证）。修复后重跑：`test:page-input` / `test:zero-injection` / `npm test` / `test:supersession` / `test:density`+`test:l0`（L0 文案相关）。 |
| **BLOCK-2** | `test/size-baseline.ts:230,323,327,523` · `docs/v3-density-baseline.json:372,502` · `docs/v3-supersession-ledger.json`（16 处 `362,163/380,271`）· `test/size-growth-evidence.test.ts:158-160`（注释 `5,053 / 66,938`） | **登记/审计事实层数字与实测冲突**：同一产物存在 `362,163` / `362,777`（真） / `362,865` 三个"终值"与 `380,271` / `380,915` 两个 ceiling；`SIDEPANEL_BASELINE_BYTES_TIMELINE` 混入两个非登记中间值；`ceilingUncappedFormulaBytes` 与 `ceilingAfterBytes` 自相矛盾；散文百分比 `+3.50%/+3.70%/+36.16%/22.95%` 与实测 `+3.67%/+36.13%/22.96%` 不符；`pick-input.ts` 归因 5,053 vs 实测表 5,085。结构化字段（机器断言）正确 ⇒ 缺陷不会被门禁发现，但它是本叶的**登记册与台账**（下一叶/validate 的比对基准） | C17 / C30 / C40 / C42 | 一次性对齐（不动物理产物、不动阈值）：① 把 `size-baseline.ts` 的 `reason`/`consecutiveGrowthAlert`/`reRegisteredFrom` 及 `SIDEPANEL_BASELINE_BYTES_TIMELINE` 收敛到 `349,925 → 362,777`（`+12,852 / +3.67%`）、`ceiling=380,915`（`floor(362,777×1.05)`）、Feature 累计 `+36.13%`、worst-pair `+22.96%`；② `ceilingUncappedFormulaBytes: 380_271 → 380_915`（并补一条机器断言 `ceilingUncappedFormulaBytes === Math.floor(baselineAfterBytes*1.05)`，让该类漂移以后必 FAIL）；③ 删除或注明 `TIMELINE` 中 `362,163/362,865` 两个中间值（中间测量值不应进「已登记基线」时间线）；④ `docs/v3-density-baseline.json` 的 `directionalAlert`/`note` 同步；⑤ ledger 16 处 `362,163/380,271` 按「定位串随轮次重 pin」约定改写为 `362,777/380,915`（保留历史理由文字）；⑥ `size-growth-evidence.test.ts` 注释 `5,053/66,938 → 5,085/67,552`。修复后跑 `npm test` + `test:supersession` + `test:density`。 |
| （建议同轮） | `test/insight-protocol.test.ts`（`git diff` 第 169-193 行） | 该文件 2 行被**同编号改写为更强断言**（三校验器）但**台账零登记** ⇒ 违反本叶 AC-V3-011「取代逐条台账登记」；且删除行判据因文件不在台账文件集合内而**结构性看不见**（C41(b)） | C41 / C43 | 用缺失的 **`V34-S3`** 承接这两行（`oldTitle` = `if (!isPluginMessage(raw) && !isInsightMessage(raw)) return undefined;` 与 `const unionGuard = (v: unknown) => isPluginMessage(v) || isInsightMessage(v);`，`modificationType='same-id-stronger'`），并把 build.md §2.2「V34-S1..S13」与台账 id 对齐；后续轮若再删改 `test/insight-protocol.test.ts`，顺手把它加入台账文件集合（否则永久盲区）。 |

---

## 5. 改进建议（非阻塞，按严重程度分级）

| # | 位置 | 问题 | 分级 | 建议 |
|---|------|------|:--:|------|
| I-01 | `src/background/service-worker.ts:1020-1027`（`teardownPickLayer`）+ `:1944`/`:2497`；`src/content/pick-layer.ts`（交互处理器）；`pick-layer-state` 的 `phase:'gone'` 死路径 | 撤销/关面板只拆**一个** tab ⇒ 同 origin 其它 tab 仍留活层并拦截右键；层不在交互时自检 `authorized`；卸载不告知面板 | 中 | ① teardown 改为按 origin 广播（撤销前先 `chrome.tabs.query({})` 记住候选 tabId，或维护「已注入 tabId/origin」集合，逐个 `sendMessage(teardown)`）；② 层侧加固：`onContextMenu`/`onPointerOver`/`onDblClick` 首句 `if (!bridge.env().authorized) { unmount(); return; }`（env 已缓存，零新增通道）；③ `unmount()` 里 `bridge.pushState('gone', '页面侧已卸载')`（让 `pick-input` 的既有 `gone` 分支真正生效，同时消除 `injected` 事实漂移）；④ 补 1 条门禁：授权→注入→撤销→**另一 tab** 再探五探针必须全零 |
| I-02 | `src/content/pick-overlay.ts:116-124` / `:263-267` | `mountHost` 的 `DOMContentLoaded` 监听不在 `unmount()` 清除 ⇒ document_start 挂载后卸载会**复活** Shadow host（探针 B 实证） | 中 | 记录该监听并在 `unmount()` 移除 + 加 `let disposed = false`（`mountHost` 首句 `if (disposed) return;`，`unmount` 置 true）；另在 `page-input.mjs` 补一条「卸载后 Shadow host 恒 0（含加载完成之后）」的断言 |
| I-03 | `src/content/pick-menu.ts:202`（`move(1, 0)`）+ `:106-109#close` | 打开右键菜单即夺走宿主焦点，Esc / 点空白 / 选中项后**不还原**（探针 B 实证：`#host-input → 影子内 ref 行 → BODY`） | 中 | `open()` 里记住 `doc.activeElement`，`close()` 时 `(prev as HTMLElement)?.focus?.({preventScroll:true})`；或延迟到首次方向键/`Tab` 再 `focus()`（菜单本身不需要预先聚焦）。补 1 条门禁：宿主输入聚焦 → 右键 → Esc → `document.activeElement` 必须仍是宿主输入 |
| I-04 | `test/ui/page-input.mjs` / `zero-injection.mjs` | 夹具只覆盖根路径（BLOCK-1 的成因）；另缺「站点自带 `contextmenu`」夹具（实测两者并存） | 中 | 夹具增加 `/app`（深层路径）与「自带右键菜单」两个变体（见 BLOCK-1 建议与 C10） |
| I-05 | `test/supersession-ledger.test.ts:355-360`（删除行判据的文件集合） | 判据的覆盖面由台账自身文件集合推导 ⇒ 未登记文件里的删除行（本叶 `test/insight-protocol.test.ts`）永久不可见；判据标题「既有门禁文件零删除」表述强于实际 | 中 | 文件集合改为「台账集合 ∪ `git diff base --name-only -- test/**` 实测集合」，或在 `counts` 侧新增一条「本 commit 改动过但不在台账集合的 test 文件清单」断言（0 命中才过） |
| I-06 | `src/ui/sidepanel/pick-input.ts:219` | `startPick()` 发 `{kind:'pick-layer-env', activeOrigin, authorized, declaration}`：SW **无该 case**（落 `default` → `未知消息类型`，返回值被丢弃）；字段名与层的 `accept` 期望（`origin`/`declarationHash`/`declarationVersion`）不符 ⇒ 死路径 + 契约漂移 | 低-中 | 二选一：实现 SW 的 `pick-layer-env` 路由（把 env 下发到层）或删除该 send（env 已由 inject 通路下发），并在 `pick-protocol.ts` 注释里把「panel → SW → layer」的 `pick-layer-env` 标为 SW 侧主动下发（避免误读为面板可发） |
| I-07 | `src/content/pick-*.ts`（open shadow root / `data-wcli-ref` / 事件处理器） | 页面脚本可读改自绘 UI、可合成事件驱动捕获（无 `isTrusted` 过滤）；无命令通道故不越权，但「隔离」只对 CSS 成立 | 低 | 加固项（非本叶红线）：对 `dblclick`/`contextmenu`/`mouseup` 加 `ev.isTrusted !== false` 的保守过滤；文档明确「open shadow = CSS 隔离，非脚本隔离」，避免后续 ADR 误以为页面脚本不可及 |
| I-08 | `test/gate-integrity.test.ts:119` | 注释「（the user's list; `page-input.mjs` never existed）」在本叶后**已失真**（page-input.mjs 已存在且是受审门禁） | 低 | 改注释为「v3-4 起 `page-input.mjs` 存在并自动纳入；原注当时为真」；同时把 `CHROMIUM_GATES` 的「eight」措辞改为「the gate list」 |
| I-09 | `test/pick-layer-budget.test.ts:48,86` | 产物缺失走 `t.skip`（跳过而非失败）⇒ 若将来有人在未 build 的树上跑 `npm test`，该守卫静默不判（本机实跑 `skipped 0`，`test:v3` 也先 build，故当前非虚绿） | 低 | 改为 `assert.ok(size !== undefined, '先 npm run build')` 或落 `t.diagnostic` + 非零退出（与 `size-budget.test.ts` 同族口径保持一致） |
| I-10 | `src/content/pick-layer.ts:349-363` · `pick-overlay.ts:176` | 死判据（`history.__wcliPickWrapped` 只读不写）与未跟踪定时器（`flash()` 的 `setTimeout`） | 低 | 删除死守卫或补上写点；`flash()` 计时器纳入 overlay 的 `browserTimer` 集合在 `unmount()` 统一清除 |
| I-11 | `build.md §2.2/§8` · `tasks.md` | §2.2 两条 MODIFY 失真（`insight-archive.test.ts`/`density-thresholds.test.ts` 零 diff）、「修改文件 16」口径未写明（实际 18）；`tasks.json` 无 `status` 字段（完成态只能由 build.md + `state.json.phase=builded` 间接证明） | 低 | build.md 改为「修改 18（其中 2 个文件仅因导入同源常量而无需改动，已在行为层同源）」；tasks.json 增补 `status` 字段（或 build.md 明写「tasks.json 不含状态字段，完成态见 §3 表」） |

---

## 6. 结论

**结论**: ❌ **不通过**

| 指标 | 结果 |
|------|------|
| 审查通过率 | 79.1%（34/43） |
| 阻塞问题数 | **2**（BLOCK-1 功能/生产路径；BLOCK-2 登记数字保真） |
| 规范符合性偏差 | **3** 项（C1：FR-V3-060~072 生产路径不可达；C39：夹具代表性；C42：登记册数字） |
| 可进入 validate | **否**（修复 BLOCK-1/BLOCK-2 并重跑指定门禁后可进入） |

**理由**：
1. 本叶的安全面**主张成立且可证伪**：未授权 origin 零注入是结构性的（双闸门 + Chrome 权限层，门禁与受控探针双向确认）；`content.js` 逐字节冻结、`manifest.json` 零 diff、三 pin 一致；AC-CONV-1/2（N-06 收敛）**真实接线**（生产 `syncRefEnv` 调用点存在、`dispatchRefAction` 全仓唯一调用点 = `sidepanel.ts:1009`），两条硬 AC 有可 FAIL 的反证；方向性守卫语义变更为**收紧**（最差相邻对，告警只增不减）并配了真实数据反证。
2. 但`pickLayerTarget` 的 origin 解析缺陷（`normalizeStableOrigin(完整URL)`）使**本叶核心能力在带路径的真实页面上完全不可用、且误报「未授权站点」**；而两个新门禁只用根路径夹具，因此 46 + 20 断言全绿也没能看见它——这是本轮 review 必须拦下的典型「门禁绿 ≠ 生产可用」。
3. 体积重登记的结构化字段正确，但同一登记册/台账里同时存在 `362,163/362,777/362,865` 三个「终值」与 `380,271/380,915` 两个 ceiling，以及 `+36.16%/22.95%/5,053` 等与实测冲突的散文数字（ledger 16 处）；这类「同一事实多版本」正是 v3-3 审查 I-03⑤ 已立过的规矩要避免的，需在收口轮一次性对齐并补一条「ceiling 字段 = 公式值」的机器断言。
4. 修复量很小（BLOCK-1 为一行 + 1 条回归断言；BLOCK-2 为纯文案/字段对齐 + 1 条断言），且不触碰任何红线；建议**同轮**顺带修 I-01/I-02/I-03/I-06 与 C41(b) 的台账登记（`V34-S3`）。

---

## 7. 证据附录（原文）

### 7.1 虚绿扫描原文

```bash
# ① 新增/改动的测试文件内「恒真 / 吞异常 / 提前成功」形态
$ grep -rn "assert\.ok(true)" src/ test/ | wc -l
0
$ grep -rn "|| true" test/ui/page-input.mjs test/ui/zero-injection.mjs \
    test/ref-wiring.test.ts test/zero-injection.test.ts test/pick-layer-budget.test.ts test/ref-capture.test.ts | wc -l
0
$ grep -rn "process\.exit(0)\|process\.exitCode *= *0" test/ src/
test/ui/_v3-helpers.mjs:74:  process.exit(0);          # 既有 finish()（无 failure 才走此路，元门禁 R1a/R2 已审）
test/ui/l2-reverse.mjs:219:  process.exit(0);          # v3-3 既有
test/ui/l1-reverse.mjs:192:  process.exit(0);          # v3-3 既有
test/reverse-proof-judge.mjs:527,548:  process.exit(0); # v3-3 既有
# 本 commit 的 3 个新门禁均未新增 exit(0)；两个新 Chromium 门禁仅 process.exit(1)
$ grep -n "process.exit" test/ui/page-input.mjs test/ui/zero-injection.mjs
test/ui/page-input.mjs:410:  process.exit(1);
test/ui/zero-injection.mjs:229:  process.exit(1);

# ② 过宽 skip（本 commit 新增仅 2 处，且受「产物存在性」守卫）
$ git diff e528563..be54b70 -- test/ | grep -n "^+" | grep -E "\.skip\("
+    t.skip('dist/pick-layer.js not present — build first to measure the new artifact budget');
+    t.skip('dist/content.js not present — build first');
# 本机 npm test 实测：ℹ skipped 0（未触发）

# ③ 断言被 try/catch 包裹后吞掉（两个新门禁的 catch 全在清理/降级位）
$ grep -n "catch" test/ui/page-input.mjs test/ui/zero-injection.mjs
page-input.mjs:397 } catch {          # finally 内 kill chromium
page-input.mjs:402-403 ... .catch(() => {});   # rm 临时 profile/dist
page-input.mjs:408 main().catch((err) => { console.error(...); process.exit(1); });
zero-injection.mjs:114,125,131 ...then(...).catch(...)   # 门禁自身探针的「可读失败」记录
zero-injection.mjs:210 } catch {      # finally 内 kill
zero-injection.mjs:216,219 ... .catch(() => {});  # rm
zero-injection.mjs:227 main().catch(...process.exit(1));

# ④ 元门禁受审集合（独立复算，非引用门禁自述）
marker = /failures\.push\(|send\(method, params|_v3-helpers\.mjs/
AUDITED = 14
["test/ui/_v3-helpers.mjs","test/ui/binding.mjs","test/ui/density.mjs","test/ui/hardening.mjs",
 "test/ui/insight.mjs","test/ui/journey.mjs","test/ui/l0.mjs","test/ui/l1-reverse.mjs","test/ui/l1.mjs",
 "test/ui/l2-reverse.mjs","test/ui/l2.mjs","test/ui/page-input.mjs","test/ui/zero-injection.mjs",
 "test/e2e/fullchain.mjs"]
$ npm run test:gate-integrity   → ℹ tests 12 / pass 12 / fail 0   （含两个新门禁）
```

### 7.2 零改动核验原文

```bash
$ git diff e528563..be54b70 --numstat -- manifest.json src/security \
    src/content/content-script.ts src/content/dom-agent.ts src/content/page-bridge.ts \
    packages/web-cli-base src/ui/options design
（空 = 零 diff）

$ stat -c '%s %n' dist/content.js dist/pick-layer.js dist/sidepanel.js
177076 dist/content.js
32391 dist/pick-layer.js
362777 dist/sidepanel.js

$ sha256sum src/content/content-script.ts src/content/dom-agent.ts src/content/page-bridge.ts
a72900313ab77c018961aa2b8e02bb1b630a9960c1b622f2a85addf543f99e82  src/content/content-script.ts
7df782b349b32839d0ec25fa515ee293441f85f75242083dae37e5ccfd601e0f  src/content/dom-agent.ts
5737c40a2014e7adf2bf4091a31a347af6600ecfea80f8882d52e9407191f4ac  src/content/page-bridge.ts
（与 test/size-baseline.ts:765-769 的 CONTENT_SOURCE_SHA256 三项逐字相等）

$ git rev-parse HEAD   → be54b70d8e743815f6d2449002caacc9a0dab149
$ git log --oneline -1 main → 2ddc922 docs(sddu): ROADMAP 登记 F-07 README 门面对齐提前至 v0.7 完成（v1.11.0）
（main 未动）

$ git status --porcelain → （空）
$ grep -c "contextMenus" manifest.json → 0
$ grep -c "externally_connectable" manifest.json → 0
$ git diff e528563..be54b70 -- package.json → 仅 +2 个 script（dependencies/devDependencies 零新增）
$ git diff e528563..be54b70 --numstat -- src/ui/sidepanel/l1/ref-validity.ts → （空；判定链未动）
```

### 7.3 复现实验记录（受控、/tmp 副本、串行、profile 自清）

```bash
$ df -h /tmp   → tmpfs 3.7G / 可用 2.6G（实验前 30%、实验后 31%，无占满）
$ pgrep -af "chrome-linux64/chrome" → 实验后无残留进程

# 实验 A（/tmp/opencode/v34-probes/probe.mjs）：授权 origin 的 / vs /app，同一 tab
"tabUrl": "http://127.0.0.1:44225/app",
"stateAfterAuth": {"ok":true,"active":"http://127.0.0.1:44225","authorized":true},
"injectOnPathUrl": {"ok":false,"error":"未授权站点 http://127.0.0.1:44225/app：页面侧零注入（不注册 / 不注入 / 不拦截右键）"},
"layerOnPathUrl": "undefined",
"tabUrlRoot": "http://127.0.0.1:44225/",
"injectOnRootUrl": {"ok":true,"injected":true,"tabId":1428234784},
"layerOnRootUrl": "object", "shadowHostsOnRoot": 1,
"afterTeardown": {"shadowHosts":0,"intercepted":false,"marker":"undefined"},
"afterTeardownMarkerInIso": "undefined",
# 实验 B（同文件后半）：document_start 挂载 + 立即 unmount → 残留
"docStartProbe": {"probe":{"docElAtStart":"null","unmounted":true,"markerAfterUnmount":"undefined"},
                  "shadowHosts":1,"readyState":"complete","marker":"undefined"},
"docStartProbeLater": {"shadowHosts":1,"readyState":"complete","marker":"undefined"}
# 实验 C（/tmp/opencode/v34-probes/probe2.mjs）：三退让 + 焦点
"focusBefore": "host-input",
"rc1": {"menu":{"menuOpen":true,"nativeOnce":false},"shadowActive":"ref","activeId":"DIV"}   # 菜单夺焦点
"afterNativeClick": {"menu":{"menuOpen":false,"nativeOnce":true},"activeId":"BODY"}          # 关闭后未复原
"rc2": {"cm":[false,false],"menu":{"menuOpen":false,"nativeOnce":false},"pageCm":2}           # 一次性交还（页面 handler 收到）
"rc3": {"menu":{"menuOpen":true},"pageCm":3}                                                  # 之后恢复拦截
"afterEsc": {"menu":{"menuOpen":false},"activeId":"BODY"}                                     # Esc 关闭但焦点未复原
```

### 7.4 数字三源交叉（build.md × 门禁日志 × 编译产物）

```text
本机重跑：npm test = ℹ tests 795 / pass 795 / fail 0 / skipped 0 / cancelled 0
        npm run test:supersession  = ℹ tests 14 / pass 14
        npm run test:gate-integrity= ℹ tests 12 / pass 12
        npm run test:zero-injection= ▶ 20 passed / 0 failed（EXIT=0）
        npm run test:page-input    = ▶ 46 passed / 0 failed（EXIT=0）
build 轮日志（/tmp/opencode/v3-gate-logs/v3-4/）：ui.log 167 · insight.log 116 · binding.log 192 ·
        density.log 127 · l0.log 164 · l1.log 103 · l2.log 71 · hardening.log 24 · e2e.log E2E PASS
编译产物复算（dist-test 里的常量与函数）：
        SIDEPANEL_BASELINE_BYTES=362777 == 实测 362777 · CEILING=380915 == floor(362777×1.05)
        (362777−266500)/266500 = +36.13%
        worst-feature-pair = v3-1+v3-2: 266500 → 327679 = +22.956%（散文写 +22.95%）
        v3-4 逐模块增量 = 5085+4784+1830+694+422 = 12815（+37 未归因胶水 = 12852 = 362777−349925）
        v3-4 累计 = 50443+16388+265+456 = 67552 == SIDEPANEL_BASELINE_BYTES − previousBaselineBytes(295225)
        v3-4 轮登记 ceilingUncappedFormulaBytes = 380271 ≠ floor(362777×1.05)=380915（= floor(362163×1.05)）
        TIMELINE 尾部 = […, 349925, 362163, 362865, 362777]（含 2 个非登记中间值）
spike：spike-evidence.json s2.bytes = 8606 ≤ limit 60000
```

### 7.5 §1 十项重点打假逐条判定

| # | 打假项 | 判定 | 证据摘要 |
|:--:|------|:--:|------|
| 1 | 零注入是否结构性成立 / 未被覆盖的态 | ⚠️ **结构成立，2 态未覆盖** | 独立枚举：`executeScript` 仅 2 处（`:922` content.js / `:1984` pick-layer.js）、`registerContentScripts` 无 pick-layer、layer 监听/Shadow host 仅在被注入时创建；未授权态由 OriginStore + Chrome 权限双闸门拒绝（探针 + 20 断言）。**未被覆盖的态**：(a)「曾授权→撤销→**同 origin 另一 tab**」（`teardownPickLayer` 单 target）；(b)「本 tab 未授权但 bound tab 已授权」（此态实际安全：只注入 bound/active 且各自校验，`/app` 缺陷除外）；「授权流程进行中 / 声明探测中」= 仅 fail-closed（不发命令、`declarationHash=''` ⇒ 阻断），无注入风险 |
| 2 | teardown 真实性 / 残留监听 / 复活路径 | ⚠️ **产品路径真清；3 处残留（1 处已实证复活）** | 探针 A：`shadowHosts 0 / intercepted false / marker undefined`（两世界）。残留：① `mountHost` 的 `DOMContentLoaded` 监听未清 ⇒ document_start 卸载后 host **复活**（探针 B 实证 `shadowHosts:1`，无监听故不复活拦截）；② `flash()` 定时器未跟踪；③ `__wcliPickWrapped` 死判据。另：`pushState('gone')` 从未调用 ⇒ 面板侧 `gone` 分支为死路径 |
| 3 | `pick-layer.js` 世界与探针 / 两世界桥来源校验 | ✅ **边界清晰；来源校验在威胁模型上不需要** | 层在 ISOLATED world（`files:` 注入），**无 `postMessage` 桥**（`grep postMessage` 仅命中 v1 `content-script/page-bridge`），消息面只有 `chrome.runtime`（facts only）；manifest 无 `externally_connectable` ⇒ 页面脚本不能发扩展消息。**但**页面脚本可读改 open shadow root、`data-wcli-ref` 在共享 DOM、事件处理器无 `isTrusted` 过滤（可被合成事件驱动捕获/弹菜单，无命令通道）→ 见 I-07 |
| 4 | AC-CONV-1/2 独立性 | ✅ **独立成立，反证真跑** | `syncRefEnv()` 为 render 时生产调用点（env 五字段来自真实来源，缺字段保持缺失）；独立 `grep` 得 `dispatchRefAction(` 调用点 **恰 1 处**（`sidepanel.ts:1009`）；`ref-wiring.test.ts` 内含「抹掉生产调用点 ⇒ 判据 0」与「伪造第二调用点 ⇒ 集合不等」两条反证，且断言文本可用 `node --test` 独立复跑（本机 `npm test` 通过） |
| 5 | 三条退让 / 焦点恢复 / 站点自带右键 | ⚠️ **三退让成立；焦点与并存问题** | 探针 C：`nativeOnce` 真一次性（rc2 不拦截、rc3 恢复拦截）；Esc/空白关闭不执行动作；**焦点被夺且不还原**；站点自带 `contextmenu` 处理器仍执行（两菜单并存，人工面已 ⏳ 登记） |
| 6 | 方向性守卫语义变更性质 | ✅ **收紧（非偷换）** | 过滤后对全部相邻对取 max ⇒ 告警只增不减、无新误报、阈值/文案/回报要求零改；真实数据反证：退回「最后两轮」会让 `>15%` 断言 FAIL（+10.44%）⇒ 回归可被抓；复算 worst-pair `+22.956%` |
| 7 | 他叶登记字段触碰（v3-3 叶段追加 12 行） | ✅ **追加真实、理由成立、只追加** | 逐行 `git show bf5773d:<file>` 复算：12 行确在 v3-3 叶起点存在且现已改写；每行对应 `V34-S1/S2/S4~S9/S10~S12/S13`；既有登记项未被改写（`test:supersession` 14/14 的「多一条/少一条/改一字都 FAIL」判据）|
| 8 | 体积重登记披露 / 归因可复现 / 累计算法 | ❌ **结构化正确、散文/字段不自洽** | 归因表逐模块可复现（5,085+4,784+1,830+694+422+37 = 12,852）；累计 +67,552 与四类分解恒等；Feature 累计 +36.13% 无漏轮。**但** `362,163/362,777/362,865` 三终值、`380,271/380,915` 两 ceiling、`+3.50%/+3.70%`、`+36.16%`、`22.95%`、`5,053` 与实测冲突（ledger 16 处）⇒ BLOCK-2 |
| 9 | 无虚绿门禁 / 元门禁纳入 | ✅ **0 虚绿；纳入已独立确认** | §7.1 全部 0 命中（唯一 2 处 `t.skip` 受产物存在性守卫，本机 `skipped 0`）；独立复算受审集合 14 文件含两个新门禁；`test:gate-integrity` 12/12 本机重跑 |
| 10 | 文档数字保真 | ✅ **build.md 一致** / ❌ **登记册（另三处文件）不一致** | build.md 列出的 17 个数字**逐项与实测相等**（§7.4）；冲突出现在 `size-baseline.ts` / `v3-density-baseline.json` / `ledger` 的散文与一个数值字段（记 BLOCK-2） |

### 7.6 我未能验证的项（如实列出）

1. **`dist/content.js` 相对上一轮的「逐字节」身份**：`dist/` 未被 git 跟踪（`git ls-files dist` 为空），无法直接 `diff` 上一轮产物。已核实的替代证据：字节数 = 177,076（无容差上限，超出 1 B 即 FAIL）、三个被 pin 的源文件 hash 不变、本 commit 未改冻源、`messaging.ts` 的改动为类型擦除（零字节）。**未做**：重建上一轮产物做二进制比对（需改工作树产物，超出只读边界）。
2. **SW 休眠/重启后的「不回放失效引用」**：EC-V3-007 无专门门禁（C21 记 ⚠️）；未构造 MV3 SW 被回收再唤醒的实验。
3. **多 tab 撤销残留**（C8(a) / I-01）与**关面板 teardown**：仅读码与门禁日志推断，未跑「两 tab 同 origin → 撤销 → 探另一 tab」实验（Chromium 预算用了 2 次，留 1 次余量给复现阻塞项；该态由用户可复现步骤明确给出）。
4. **门禁的「45/43/…」类运行期计数**（journey 167 / insight 116 / binding 192 / hardening 24 / density 127 / l0 164 / l1 103 / l2 71 / e2e）：本机只重跑了 node 与两个新门禁；其余取自 build 轮日志（`/tmp/opencode/v3-gate-logs/v3-4/`）并逐条与 build.md 对齐，未逐个重跑 Chromium 门禁（每个 ~1.5–4 min）。
5. **真实站点兼容 / 拾取观感 / 拖动体感 / 多显示器 / 高 DPI / Alt 聚焦浏览器菜单栏**：人工面，build.md 已如实登记 `⏳ 未执行`，本审查未代跑（NFR-V3-015 要求如实登记，已满足）。
6. **`--worktree` 归因工具 TDZ 修复后的端到端复现**：只读码确认哨兵前置 + 读 `size-attribution-v31-to-v34.txt` 产物，未重跑该命令（`test:gate-integrity` 未覆盖它）。
7. **页面脚本 tamper 的可利用性**：仅静态判定「无命令通道 ⇒ 不越权」，未构造恶意页面实验（属加固面 I-07）。

### 7.7 纪律核验

| 项 | 结果 |
|---|------|
| 未修改任何源码/测试/文档/配置 | ✅ 本审查全程只读；`git status --porcelain` 为空（唯一新增是本轮产物 `review.md`/`review-report.md`，按 SDDU 流程产出，未 `git add`） |
| 未 commit / 未 push / 未 `git add` | ✅ 无任何 git 写操作；HEAD 仍 `be54b70` |
| `main` 未动 | ✅ `main = 2ddc922`（与本叶无关） |
| 实验仅在 `/tmp/**` 副本 | ✅ `/tmp/opencode/v34-probes/`（脚本）· `/tmp/opencode/v34-probe2-work/`（临时 dist/profile） |
| Chromium 一次一个 + profile 自清 | ✅ 3 次串行（每次 `finally` kill + `rm -rf work/ext`）；结束 `pgrep` 无残留、`df -h /tmp` 31%（2.6G 可用） |
| 未启用 v1/v2 SDDU、未改 `main` | ✅ |
| 流程待办（非本 Agent 权限） | `state.json` 需登记 `files.review`/`files.reviewReport` 并把 `phase` 由 `builded` 推进到 `reviewed`（本环境未提供 `sddu_update_state` 工具，未能执行；建议由状态机/编排器执行 `{"feature":"specs-tree-v3-4-page-as-input","phase":"reviewed"}`）；`sddu-tree` Skill 未在本会话可用技能列表中，目录导航（`TREE.md`）未由本 Agent 定向更新 |

---

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | R1 初始创建：43 项逐项结果（34 通过 / 6 警告 / 3 失败）；2 个阻塞（`pickLayerTarget` 的 origin 解析致生产不可用 + 登记册数字不自洽）；6 项改进（各含可执行修法）；10 项安全面打假逐条判定；虚绿扫描 / 零改动核验 / 复现实验 / 数字三源交叉原文；7 项未能验证如实登记。 | 2026-09-17 | SDDU Review Agent |
