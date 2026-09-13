# 冒烟清单（TASK-011 收口；机械面 + 人工面分离）

> **文档定位**: 波1 收口冒烟清单（FR-045 / ADR-006）。机械面可由 CDP/脚本执行；人工面需真实浏览器交互。
> **构建前置**: `npm run build --workspace @lgdl/web-cli-plugin` → `dist/`。
> **插件加载**: `chrome://extensions` 开发者模式「加载已解压的扩展程序」→ 选择 `packages/web-cli-plugin/dist/`；或 headless：
> `chromium --headless=new --disable-extensions-except=dist --load-extension=dist --remote-debugging-port=9335 about:blank`

## 1. 机械面（CDP 驱动；本轮已实测项标注 ✅）

| # | 检查项 | 方法 | 期望 | 本轮 |
|---|--------|------|------|:----:|
| M1 | 扩展加载成功 | `--load-extension` 后 `/json` 查 `type=service_worker` | target 存在 | ✅ PASS |
| M2 | SW target 可达 | CDP `Runtime.evaluate` 取 `chrome.runtime.getManifest()` | name/mv=3 | ✅ PASS |
| M3 | 权限面最小化 | manifest 断言（静态 `permissions` 恰为 `activeTab/scripting/storage/sidePanel/tabs`；5 个能力仅在 `optional_permissions`；有 `optional_host_permissions`；无 `<all_urls>`、无静态 `content_scripts`） | 断言通过 | ✅ PASS |
| M4 | storage.local 往返 | SW 内 set/get/remove | 值一致 | ✅ PASS |
| M5 | sidePanel/scripting API 可达 | SW 内 `typeof chrome.sidePanel/scripting` | object | ✅ PASS |
| M6 | G-KEY 火山端点直连 | SW 内带 Authorization fetch | 返回 HTTP 状态（非 CORS 失败） | ✅ PASS（401） |
| M7 | fixture 静态声明 | 页面 `link[rel=web-cli]` href 解析 | 绝对 URL 正确 | ✅ PASS |
| M8 | fixture 运行时握手三态 | `web-cli:probe` → descriptor | tools 正确 | ✅ PASS |
| M9 | RPC 执行往返 | `web-cli:invoke` notes-add / notes-list | ok + trust=external | ✅ PASS |
| M10 | content script 动态注入 | 用户手势后 `chrome.scripting.executeScript` | 注入成功、页面无全局污染 | ⏳ 待人工手势（见 §2 H0） |
| M11 | 授权三路（allow/deny/超时） | node 集成测试 `test/security.test.ts` + `host.test.ts` | S1 deny / S2 ask / 超时 deny | ✅ PASS（node 面） |
| M12 | untrusted 危险档位 fail-closed | 未确认 write → deny；未知 risk → deny | 不执行 | ✅ PASS（node 面） |
| M13 | 无旁路 | `grep -rnE "\.executor\(" src` | 0 直接调用 | ✅ PASS |
| M14 | 敏感明文零命中 | 审计/确认摘要脱敏断言 | 无明文 | ✅ PASS |
| M15 | 审计落库 | `admin_audit-export` / `audit-sink` 测试 | 事件面齐全 | ✅ PASS（node 面） |
| M16 | 导航失效语义 | `controller.markNavigated()` 测试 | invalidated=true + 需重授权 | ✅ PASS（node 面） |
| M17 | 通用性端到端 | `test/e2e.generality.test.ts`（fixture） | 全链通过 | ✅ PASS |
| M18 | 风控暂停/中止可读阻断 | `test/host.test.ts` risk guard 用例（stop/pause → 不执行，resume 恢复） | 阻断可读、不静默 | ✅ PASS（node 面，P1） |
| M19 | 事件桥 + 上下文预算截断 | `test/content.test.ts`（subscribe/pull/notify）+ `test/sidepanel` 事件 | 预算摘要 + 可读截断 | ✅ PASS（node 面，P1） |
| M20 | 通用 DOM 工具面（默认关） | `test/dom-agent.test.ts` | 默认不装配、失败可读 | ✅ PASS（node 面，P1 可选） |
| M21 | 任务内 ask-user 问答桥 | `test/ask-bridge.test.ts` + `test/sidepanel.test.ts` + `test/host.test.ts` | 提问→作答→回填；超时/取消可读 | ✅ PASS（node 面，P1/R7） |
| M22 | `transport.channel` 动态绑定 | `test/content.test.ts` + `test/protocol.test.ts` | 声明通道绑定后 invoke/结果按新通道 | ✅ PASS（node 面，P1/R9-7） |
| M23 | 破坏性动词 denylist | `test/host.test.ts` R-BLK1a 用例（5 例伪装） | 不得 read→allow | ✅ PASS（node 面，P1/R-BLK1a） |
| M24 | **options 真实点击旅程** | `npm run test:ui`（`test/ui/journey.mjs`：全新 profile + 真实 dist + CDP 真实键入/点击） | 保存→读回 storage→刷新回显→测试连接 可读结果；0 异常 | ✅ PASS（41 断言，TASK-018/020） |
| M25 | **非扩展上下文守卫** | `npm run test:hardening`（A 场景：`file://.../options.html`）+ `test/env-guard.test.ts` | 横幅出现、保存/测试/清除禁用、诊断 ❌ 可读 | ✅ PASS（TASK-019） |
| M26 | **站点未声明协议说明** | `npm run test:hardening`（B 场景：普通站点；`unsupported`/`unknown` 两态）+ `test/sidepanel-view.test.ts` + `test/auto-probe.test.ts` | 「设计如此，非故障」说明；unknown 有可读原因 + **全自动重试状态**（TASK-032 已移除手动「重新探测」按钮，断言 `retryAbsent=true`） | ✅ PASS（TASK-019/032） |
| M27 | **环境自检 / 诊断面板** | `test/diagnostics.test.ts` + `test/ui/hardening.mjs`；一键复制文本 | 六项 ✅⚠❌ + 零明文（`sanitizeDiagText` 兜底） | ✅ PASS（TASK-019） |
| M28 | **旧扩展未重载可见** | `npm run test:hardening`（C 场景：build 后仅刷新 options，不点「重新加载」） | 诊断提示「页面/background 构建不一致 + 重新加载」 | ✅ PASS（TASK-019） |
| M29 | **保存后可验证 / 无活跃站点可自救** | `npm run test:ui`（#6d~#6f/#8d/侧栏 #11~#12）+ `test/sidepanel-view.test.ts` + `test/state-message.test.ts` | 保存后 `#key-state`=已写入、placeholder=已保存（不回显）、成功色；侧栏 LLM 行含 `Key ✅`；无活跃站点给具体原因 + 「重新绑定当前标签页」+ 发送禁用原因；侧栏「测试连接」复用 `llm-test` 可读结果 | ✅ PASS（TASK-020） |
| M30 | **站点绑定全链（真站点）** | `npm run test:binding`（真实 dist + 真实 `http://localhost:5173` lgdl-web + mock LLM）+ `test/binding-wiring.test.ts` | 绑定成功（tabId+origin）→ content.js 注入 → discovery `supported` → 【授权当前站点】成功（http host permission 路径）→ 发送按钮可用 → 输入 `11111` 跑通一轮 mock 对话；切换标签页标记失效 + 可读提示；无 `<all_urls>`；静态权限含 `tabs`（FR-049，作者批准，见 `docs/compliance.md` §9） | ✅ PASS（第四轮修复，33 断言） |

## 2. 人工面（真实浏览器交互）

| # | 检查项 | 步骤 | 期望 |
|---|--------|------|------|
| H0 | content script 注入 | 打开站点 → 点击扩展图标（用户手势）→ 检查页面无全局污染、控制台无错误 | 注入成功、宿主页零回归 |
| H1 | side panel 多轮对话 | 打开 side panel → 输入指令 → 观察多轮 assistant/tool 渲染 | 多轮 + 工具调用可见 |
| H2 | 授权弹层 | 点击「授权当前站点」 | 授权生效、状态可见、风险提示可读 |
| H3 | 二次确认 | 触发 untrusted write（如 `site_lgdl-web-cli` 写命令） | 弹出确认摘要；允许→执行；拒绝/超时→不执行 |
| H4 | 审计查看 | 点击「查看审计」 | 事件列表/计数可见、零明文 |
| H5 | 导航失效提示 | 授权后整页刷新 | 明示「会话失效，需重新授权/重连」，不静默续接 |
| H6 | LGDL 页端到端 | 在 LGDL 工作台加载插件 → 授权 → 经 RPC 执行图内容命令 + 写回 | 编辑器内容更新；既有功能零回归 |
| H7 | 真实 LLM 闭环（可选） | 配置 BYOK key → 在 options 点「测试连接」→ 发指令 | 测试连接给出可读结果（成功含 ms / 失败分类）；会话正常；火山端点可用（G-KEY PASS） |
| H8 | 风控暂停/中止控件 | side panel「暂停自动化 / 恢复 / 中止」 | 状态可读；暂停/中止后站点调用被阻断；恢复后可继续 |
| H9 | 事件订阅 + 预算截断 | side panel 触发事件订阅 → pull | 事件增量 + 「上下文预算截断」可读提示 |
| H10 | 任务内 ask-user 问答 | LLM 触发 `ask-user` → side panel 呈现 → 作答/取消 | 回答回填到工具输出；取消可读 |

## 3. 降级出口

| 场景 | 降级 |
|------|------|
| `--headless=new --load-extension` 不可用 | headful + xvfb / Playwright `launchPersistentContext({args:['--load-extension=…']})` |
| 仍不可用 | 仅 node 注入面单测 + 本清单人工面，记入 validate |
| content script 注入需手势 | 由人工面 H0 覆盖（headless 自动化无法构造真实手势） |
| 真实产物全链（R8） | **已固化为 `npm run test:e2e`（`test/e2e/fullchain.mjs`）**：真实 dist + CDP headless，唯一偏差 = manifest 副本追加本地 origin 到 `host_permissions`（JS 字节与发布一致）。其余手势/权限弹窗/真实 LLM 仍归人工面（见 `docs/dev.md` §7.4） |
| options 真实点击旅程（TASK-018） | **已固化为 `npm run test:ui`（`test/ui/journey.mjs`）**：全新 profile + 真实 dist（字节未改）+ CDP 真实键入/点击（`Input.dispatchKeyEvent`/`Input.dispatchMouseEvent`）+ 本地 hermetic mock LLM，覆盖保存/读回/回显/测试连接（见 `docs/dev.md` §9） |
| 加固实证（TASK-019） | **已固化为 `npm run test:hardening`（`test/ui/hardening.mjs`）**：A 非扩展 `file://` 守卫（修复前/后对照）、B 未声明协议说明（`unsupported`/`unknown`）、C 旧扩展未重载构建不一致；B 的临时 dist 副本会把本地 origin 追加进 manifest `host_permissions`（headless 无 activeTab 手势）。见 `docs/dev.md` §10 |

## 4. validate 移交清单

- TASK-001 波0 结论：`spike-mv3-gkey.md`（MV3 六项 + G-KEY 逐项 PASS/FAIL/降级）
- TASK-002 试点结论：`spike-protocol-pilot.md`（协议三层 + ≥2 站点）
- 能力矩阵：`docs/capability-matrix.md`（最小能力集 6/8 P0 + 2/8 P1）
- 合规评估：`docs/compliance.md`
- 协议说明：`docs/protocol.md`
- 迁移指引：`docs/migration.md`
- 开发调试 + 冒烟方法论：`docs/dev.md`
- 红线 grep 结果：见 build 报告 §红线
- 全仓 `npm run build` + `npm test` 结果：见 build 报告 §门禁

## 5. v2 人工面：悬浮连接树（V2-2；`V2-H-*` 前缀，不与 §1 M1~M30 / §2 H0~H10 冲突）

> 自动化已固化：`npm run test:insight`（`test/ui/insight.mjs`，**108 断言**〔历史：原记 **45** 系 V2-2 时点；2026-09-13 v2 P0 修复轮新增 `#I-06c`/`#I-06d` 后实测 **52**；**2026-09-13 V2-4 新增 `#I-19a…h`（含 `#I-19h` 复用 `checkLayout` 展开 7 项）后实测 70**；**2026-09-13 R2 第 2 轮实测 102**；**同日 R2 修复轮（A1/A2/A3）再 +6 → 实测 108**（新增 `#I-20a2` 站点工具→子命令、`#I-20d2`/`#I-21b2` 只可收紧 ask/deny、`#I-22a~c` 交叉引用可交互下钻）；**2026-09-14 R2 收口复核确认 108（以现状为准）**〕，真实 dist + CDP，视口 400×900，开/关两态）覆盖 FAB/抽屉/四维度/徽标/降级/文案/过滤/几何量化 + V2-4 只读命令档案子视图（默认关 / 实时面卡数 / 字段可读 / `delay` 单源 / 只读过滤 / 档案容器零控件 / 开档案布局不回退）。以下为 headless 无法判定的**观感与真实交互体感**人工面；未执行一律标 `⏳ 待人工`。

| # | 人工面 | 步骤 | 期望 | 本轮结论 |
|---|--------|------|------|:--:|
| V2-H-A | 悬浮观感 / 抽屉进入退出动画 / 明暗主题观感 | 真实 Chrome 打开 side panel → 观察左下角「连接树」FAB；点开/关闭抽屉；切换系统明暗主题各看一次 | FAB 与「回到底部」左右分居、不重叠、不遮挡输入框；抽屉覆盖消息区时不闪烁/不跳动；明暗两态对比度可读 | ⏳ 待人工 |
| V2-H-B | 长站点名 / 长文案 / 320px 窄栏字重与拥挤度 | 在窄侧栏（拖到最窄，≈320px）打开抽屉，观察长 origin / 长工具名 / 长文案的换行与拥挤度 | 文本自动换行（`overflow-wrap:anywhere`），无截断丢字、无横向滚动；徽标不撑破行 | ⏳ 待人工 |
| V2-H-C | 多显示器 / 高 DPI 下 FAB 位置观感 | 在不同 DPI/缩放的显示器上分别打开 side panel | FAB 锚定 `#panel-main` 左下、与 composer 保持不重叠；缩放后位置正确 | ⏳ 待人工 |
| V2-H-D | 键盘 / 焦点遍历真实体感（Tab / Esc / 焦点回归） | 仅用键盘：Tab 至 FAB → Enter 开抽屉 → 在抽屉内 Tab 遍历过滤框/关闭按钮 → Esc 关闭 | 焦点可见（`focus-visible`）；Esc 关闭且焦点回到 FAB；`aria-expanded` 随开合切换；无焦点陷阱 | ⏳ 待人工 |

**口径与偏差（D-V22-01，必读）**：布局硬阈值 `#log` 稳态 `clientHeight ≥ 589px` / 占比 `≥ 65.0%`（ADR-V2-006）在 `test:insight` 中按**去镀铬稳态**测量（隐藏 `#site-hint`/`#onboarding`/`#discovery-notice`/`#consent-slot`/`#send-reason`，实测 674px / 74.9%）。原因：`docs/dev.md` §11.3 记录的 589px 测于 TASK-023，早于 FR-052 自动授权块 + `#risk-status` + `#llm-test-result` 落地；今日同一 dist 仅隐藏导航条时 `#log` = 418px / 46.4%（v1 `journey.mjs` #15b 自身只断言 `>45%` 且通过）。脚本另以 v1 口径（仅隐藏导航条）断言 `#log ≥ 405px`（v1 自身 `>45vh` 下限）证明零回归，并以**开/关逐字段相等**证明 V2-2 覆盖层不改变任何稳态几何。详见 `specs-tree-v2-2-floating-tree-ui/build.md` §决策。

## 6. v2 人工面：撤销与取消授权操作面（V2-3；`V2-H-*` 前缀，不与 §1 M / §2 H0~H10 / §5 V2-H-A~D 冲突）

> 自动化已固化：`npm run test:insight`（`test/ui/insight.mjs`：真实控件 + `#tree-receipt`/`#tree-confirm` 容器 + `deny` 行无控件）与 `npm run test:binding`（`#21a~#21n`：真实站点 + 真实 dist，站点取消授权 / 能力撤销失败可读 / 开关关断→工具即时移出）。以下为 headless 无法判定的**真实交互 / 浏览器壳 / 视觉判断**人工面；未执行一律标 `⏳ 待人工`。

| # | 人工面 | 步骤 | 期望 | 本轮结论 |
|---|--------|------|------|:--:|
| V2-H-1 | 真实授权弹窗（`chrome.permissions.request`；V2-3 **只撤销不授予**） | 真实 Chrome：在未授权站点点击插件图标 / 「授权当前站点」→ 观察原生权限弹窗；随后在树内点「撤销该站点授权」 | 授权弹窗由浏览器原生呈现（V2-3 树内**无任何授予入口**）；撤销后工具即时离开工具面并给可读回执 | ⏳ 待人工 |
| V2-H-2 | 原生 `tabs.goBack` / `goForward` 等浏览器壳行为 | 真实 Chrome：用 `tabs` 工具触发浏览器前进/后退，观察壳层行为与历史恢复 | 行为与浏览器一致；与树内 `tabs` 开关关断/恢复无冲突（开关关断后工具离开工具面） | ⏳ 待人工 |
| V2-H-3 | 剪贴板真读焦点（`clipboard read` 成功与否取决于页面焦点） | 真实 Chrome：切换页面焦点后经助手触发 `clipboard read`（`state` 档，永须人工确认） | 有焦点时可读、无焦点时可读失败原因；**任何情况下都不会被「读操作自动」自动放行** | ⏳ 待人工 |
| V2-H-4 | 真实用户手势下 `permissions.remove` 的浏览器回执观感 | 真实 Chrome：对已授予的可选能力（书签/下载/通知/剪贴板），在树内点撤销并在确认框点「确认执行」 | 浏览器侧权限真实移除、工具即时移出工具面、回执显示「已从 LLM 工具面移除」；失败时显示可读「权限仍保留」 | ⏳ 待人工 |
| V2-H-5 | `chrome://extensions` 外部撤销后树内实时刷新观感 | 真实 Chrome：打开树抽屉 → 在 `chrome://extensions` 手动移除某站点访问权限 / 某可选权限 → 回到侧栏观察树 | 树**自动重投影**（`insight-changed`/`capability-changed` 推送，无需重开面板）；状态与工具面即时一致，不显示陈旧态 | ⏳ 待人工 |
| V2-H-6 | 二次确认文案在窄栏/长站点名下的可读性与拥挤度 | 真实 Chrome：拖窄侧栏（≈320px）→ 对超长 origin 的站点触发撤销 → 观察 `#tree-confirm` 与 `#tree-receipt` | 作用对象/后果/不可逆说明完整可读、自动换行、无横向滚动；确认/取消按钮不重叠 | ⏳ 待人工 |

**口径与偏差（D-V23-01，必读）**：`test:binding` 的 `#21g`「站点工具即时移出 `deriveTools()`」要求撤销站点时**同时**撤下该站点在 router 中注册的工具。v1 `revoke` 处理器原先只做 `unregisterContentScript` + `removeOriginPermission` + `OriginStore.revoke`（工具名仍留在 registry，仅在派发时 S1-deny）。V2-3 按 FR-V2-030「工具面即时移出」补了一行**既有** `host.deactivateSite()` 调用（绑定 origin 被撤销时），是**只收紧**（fail-closed）的必要接线：不新增 `case` / 消息语义 / 判定路径；未授权 origin 经 tab-follow 也不会被重新注册（该路径先查 `origins.isAuthorized`）。详见 `specs-tree-v2-3-revoke-ops/build.md` §决策。

## 7. v2 人工面：命令档案浏览器（V2-4；`V2-H-*` 前缀，不与 §1 M / §2 H0~H10 / §5 V2-H-A~D / §6 V2-H-1~6 冲突）

> 自动化已固化：`npm run test:insight`（`test/ui/insight.mjs` 追加 `#I-19a…h`：档案开关默认关 / 实时面卡数 == 头部 N+M / 每卡 action·sourceKind·delayMs 字段与 `deny` 成因 / `site_*` origin 或 0 张计数 / `delay` 单源（`非可配置档位` 恰 1 次）/ 只读检索收窄与清空恢复 / `.tree-archive` 内零 `.tree-control`·零 `button[data-action-id]`·零 checkbox / 开档案布局不回退）与 node 门禁 `test/insight-archive.test.ts`（三层口径行级并集 100%、`deny` 分层全量交叉 × 站点域矩阵）。以下为 headless 无法判定的**视觉与感知判断**人工面；本轮未执行，一律标 `⏳ 待人工`（**不冒充 PASS**）。

| # | 人工面 | 步骤 | 期望 | 本轮结论 |
|---|--------|------|------|:--:|
| V2-H-7 | 档案长文案 / 320px 窄栏下 122 卡的拥挤度与可读性 | 真实 Chrome：打开 side panel（拖到最窄 ≈320px）→ 点「查看命令档案（只读）」→ 用「分组」切换为「按工具」→ 上下滚动全部卡片，观察长命令名 / 长成因文案 / 长抑制原因 / 徽标的换行与拥挤度 | 卡片文本自动换行（`overflow-wrap:anywhere`），无截断丢字、无横向滚动；字段（处置 / 成因 / 自动授权层 / 来源 / delayMs）层次可读；徽标不撑破卡片；122 卡滚动流畅无卡顿 | ⏳ 待人工 |
| V2-H-8 | 分组维度切换 / 折叠展开的观感与动效 | 真实 Chrome：依次切换「分组」为 按工具 / 按档位 / 按 risk / 按来源 / 按 deny 成因；在每个维度下滚动并观察分组标题与计数 | 分组标题与计数即时更新且与卡片数自洽；切换无闪烁 / 无跳动；同一维度内排序稳定（按 `cardId`）；无重复卡 | ⏳ 待人工 |
| V2-H-9 | 真实站点绑定后 `site_*` 卡片增长时的观感 | 真实 Chrome：绑定并授权一个声明了 `site_*` 工具的站点 → 打开档案 → 按来源切到 `site-declared` → 观察站点卡（含所属 origin）与自动授权层文案 | site 卡逐张标注所属 origin；`evaluate`/不可分类档显示「自动授权层：硬底线」，`read`/`write` 显示「适用」；无绑定 origin 的站点工具如实标「不适用」；卡数增长后分组计数同步、无横向溢出 | ⏳ 待人工 |

**口径与偏差（D-V24-01，必读）**：档案头部只显示「实时面 N 条目 / M 子命令 = K 卡」（**当次快照真实计数**）+「对账基线 34/142（来源 commit）」+ parity 结论，**绝不**出现「34/142 已全部渲染」类夸大表述；`accounted = carded ∪ waived` 的行级 100% 覆盖由 node 门禁 `test/insight-archive.test.ts` 以真实基线行注入验证（运行时只给计数口径，不打包 baseline JSON）。档案是**只读展示面**：`.tree-archive` 内无任何 `.tree-control` / `button[data-action-id]` / checkbox（`#I-19g` 运行期断言），不得把 `deny`/`delay` 误读为可关档位。**〔R2 起部分取代（保留上句为历史口径）：档案卡按同款分层渲染——硬底线卡零 `[data-policy]` + 可读原因；只可收紧卡（ui/state/external/破坏性）渲染 ask/deny（无 allow，A1）；可覆盖卡渲染 allow/ask/deny；写入仍走唯一 tree-ops 通路，为保 P0 红线用自有类 `.tree-archive-policy*` 且不带 `data-action-id`；详见 §8 与 `specs-tree-web-cli-plugin-v2-insight/build.md`〕**。详见 `specs-tree-v2-4-command-archive/build.md` §决策。

## 8. v2 R2 人工面：真层级树 + 命令级覆盖 + 档案分层（`V2-H-10~14`；不与 §1 M / §2 H0~H10 / §5 V2-H-A~D / §6 V2-H-1~6 / §7 V2-H-7~9 冲突）

> 自动化已固化：`npm run test:insight`（`test/ui/insight.mjs` 追加 `#I-20a~k` / `#I-21a~e`：作者两例在真实 DOM 逐层展开/收起、惰性渲染、面包屑、键盘（方向键/Home/End）、deny 分层三态控件、硬底线零控件 + `.tree-clamp-reason`、覆盖即时生效、多状态布局守卫〔关/开/深展开/收起 drift=0〕、档案卡分层 + 默认/生效分列 + 同一 tree-ops 写路径）与 node 门禁 `test/insight-tree-hierarchy.test.ts` / `test/tree-view.test.ts` / `test/insight-archive.test.ts`；`npm run test:binding` 追加 `#22a~l`（UI 三档 → 真实 dispatch 生效 → reset → 持久化）。以下为 headless 无法判定的**真实交互 / 视觉与感知判断**人工面；本轮未执行，一律标 `⏳ 待人工`（**不冒充 PASS**）。

| # | 人工面 | 步骤 | 期望 | 本轮结论 |
|---|--------|------|------|:--:|
| V2-H-10 | 树逐层展开/收起的观感与动效 | 真实 Chrome：打开侧栏 → 点「连接树」→ 依次展开/收起 授权的站点 → 站点 → 支持的命令 → 工具，以及 支持的命令 → 系统内置命令 → `dom` → `dom read-state`；观察缩进层级、展开箭头与内容对齐 | 每层可独立展开/收起；缩进层级清晰、无错位；展开态在后台重投影后保持（会话内不回弹）；滚动流畅（122 卡不卡顿） | ⏳ 待人工 |
| V2-H-11 | 长归属路径 / 320px 窄栏下的面包屑与拥挤度 | 真实 Chrome：拖窄侧栏（≈320px）→ 展开深层节点并把焦点落到 `dom read-state` → 观察 `#tree-breadcrumb` 与行内徽标/子标签 | 面包屑完整可读、自动换行、无横向滚动；缩进有上限不挤爆卡片；长站点名/长命令名不撑破抽屉 | ⏳ 待人工 |
| V2-H-12 | 键盘操作真实体感（焦点可见 / roving tabindex） | 真实 Chrome：Tab 进入树 → 用 ↑/↓ 移动焦点、→/← 展开收起/回父、Enter/Space 切换、Home/End 跳首尾；观察焦点环与 `aria-selected` 同步 | 焦点可见且始终唯一；方向键行为符合 ARIA tree 约定；Esc 关闭后焦点回到 FAB；读屏（如开启）能读出 `aria-expanded`/`aria-level` | ⏳ 待人工 |
| V2-H-13 | 命令级覆盖设置后**即时生效**的观感（三档 + 二次确认） | 真实 Chrome：展开到可覆盖命令（如 `dom` / `dom read-state`）→ 分别设 allow/ask/deny；设 allow（放宽方向）时观察 `#tree-confirm` 二次确认；随后在助手对话中触发同一命令，观察是否按新档生效 | 设置后树内生效档即时更新、回执可读；放宽方向必弹二次确认，收紧/reset 不弹；真实调用行为与所设档一致（deny 可读拒绝 / ask 弹确认 / allow 放行）；`reset` 回到默认 | ⏳ 待人工 |
| V2-H-14 | deny 分层与 clamp 原因可读性（硬底线 vs 只可收紧 vs 可覆盖） | 真实 Chrome：展开 `dom` 子树 → 对比 `dom click`（ui 只可收紧）与 `dom remove`（破坏性，只可收紧）与 `dom read-state`（可覆盖）三行 | 硬底线行（evaluate/S1/S3）**无任何开关**且展示 `.tree-clamp-reason`；只可收紧行仅 ask/deny 两档（**无 allow**）+ 原因可读；可覆盖行 allow/ask/deny 三档齐备、选中态清晰；`delay`（=deny）不被误读为可配置档位 | ⏳ 待人工 |

**口径与偏差（R2，必读）**：§7 的 D-V24-01 中「档案是只读展示面、`.tree-archive` 内无任何命令级控件」按 R2 **部分取代**——档案卡现按**同款分层**渲染（硬底线卡零 `[data-policy]` + 可读原因；**只可收紧卡 ask/deny 两档（A1）**；可覆盖卡有 allow/ask/deny），写入仍走**唯一** tree-ops 通路；为保持 P0 运行期红线（`#I-19g`：`.tree-archive` 内零 `.tree-control` / 零 `button[data-action-id]` / 零 checkbox），档案控件使用**自有类** `.tree-archive-policy*` 且不带 `data-action-id`。**作者示例①「工具→子命令」已达成（R2 修复轮 A3）**：站点声明工具的 `subcommandRisks`（由 `decl.subcommands` 生成）在 `service-worker#projectToolSurface` 中作为 schema `subcommand.enum` 的回退来源，故真实 DOM 下 `站点 → 支持的命令 → site_notes → site_notes list / show` 可逐层展开（`#I-20a2`）；**不改 base**、不改 `declared-tools.ts`。详见 `specs-tree-web-cli-plugin-v2-insight/build.md` §R2 第 3 轮。
