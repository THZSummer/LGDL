# 开发与调试（FR-044）；冒烟方法论（FR-045 / ADR-006）

> **文档定位**: 插件开发者本地加载、调试、日志与热重载指引；附冒烟验证方法论（无头/自动化可行性结论 + 机械面/人工面分离）。

## 1. 前置

- Node ≥ 18；仓库根 `npm install`。
- Chromium 系浏览器（Chrome/Edge）**≥ 114**（`sidePanel` API 门槛；manifest `minimum_chrome_version: 114`）。

## 2. 构建

```bash
# 仅插件
npm run build --workspace @lgdl/web-cli-plugin
# 或全仓
npm run build
```

产物落在 `packages/web-cli-plugin/dist/`：

| 文件 | 说明 |
|------|------|
| `manifest.json` | MV3 清单（拷贝） |
| `background.js` | service worker（ESM，`type:"module"`） |
| `content.js` | content script（IIFE，按需注入） |
| `sidepanel.js` / `sidepanel.html` | 侧栏 UI |
| `options.js` / `options.html` | 设置页 |

## 3. 本地 unpacked 加载（FR-044）

1. 构建（见 §2）。
2. 打开 `chrome://extensions` → 打开右上角「开发者模式」。
3. 点击「加载已解压的扩展程序」→ 选择 `packages/web-cli-plugin/dist/`。
4. 打开目标站点 → **首次**点击工具栏插件图标打开侧栏（或点图标直接绑定）→ 在侧栏点「授权当前站点」（浏览器弹一次站点权限框）。
5. **授权之后无需再点图标**：该站点每次页面加载都会自动注入、自动绑定（见 §12）；切换标签页也会自动识别并切到对应会话。
6. 若需站点事件通道：在 side panel 触发事件订阅后才会安装观察源（默认关 / 零常驻）。

> 首次授权会请求该 origin 的可选 host 权限（manifest `optional_host_permissions` 同时覆盖 `http://*/*` 与 `https://*/*`，本地 `http://localhost:5173` 开发站也能被持久授权）；拒绝则回退 `activeTab`（仍可用，但后台特权 fetch 能力受限）。
> 自动打开侧栏依赖 `chrome.sidePanel.open`（Chrome 116+，`minimum_chrome_version` 已提到 116）；若该调用失败，绑定仍然成功，面板会给出「请手动点图标打开侧栏」的可读提示。

### 3.1 首次使用（配置与授权顺序）

侧栏的首次使用引导是**状态驱动**的（未配置模型时只强调第 1 步；已配置未授权时强调授权），推荐顺序：

1. **配置模型**：侧栏顶部「配置模型 / 设置」按钮 → options 页选择厂商、填入 API Key 并保存（BYOK，仅存 `chrome.storage.local`，不回显明文）。
2. **打开目标站点**：打开声明了 web-cli 协议的站点标签页（本仓库的 LGDL Web 即一个实例站点）。
3. **首次绑定该站点**：点击插件图标 —— 点击处理在**同一用户手势**内绑定并打开侧栏。本版已获作者同意的 `tabs` 权限（见 §12.4），后台也能直接读取当前标签页 URL，但**点图标路径仍是未授权站点的主要绑定触发点**（自动探测仅对已授权站点生效）。
4. **授权当前站点（每个站点只需一次）**：在侧栏点击「授权当前站点」，确认知情同意与可选站点权限（浏览器弹一次权限框）。
5. **之后全自动**：该站点获得持久权限后，插件会注册**声明式注入**（`chrome.scripting.registerContentScripts`），此后该站点每次页面加载都自动注入、自动绑定，**不需要再点图标**；切换标签页自动切到该站点对应会话。
6. **输入指令**：在底部输入框发送，开始对话。

> **一句话**：**每个站点首次需授权一次（浏览器弹权限框），之后注入/握手/绑定全自动**。未授权站点仍需点图标（或先在侧栏授权），点图标路径始终保留为回退。

侧栏顶部会显示当前 LLM 状态（`未配置` / `厂商 · 模型`）；未配置时按钮变为「去配置模型」并以醒目提示引导。状态来自 background 的 `llm-status` 消息，只返回 `{configured, providerId, providerName, model}` 摘要，**绝不回传 API Key 明文**。

### 3.2 面板 / 设置页导航

| 目标 | 入口 |
|------|------|
| 侧栏（会话/授权/确认/审计/风控） | **点击工具栏插件图标**：点击处理函数先绑定当前标签页、再 `chrome.sidePanel.open({tabId})` 在同一手势内打开侧栏（**不是** `openPanelOnActionClick`——那个开关会吞掉 `action.onClicked`，导致只开面板、从不绑定） |
| 设置页（LLM 配置 / 迁移 / 合规） | 侧栏顶部「配置模型 / 设置」按钮 → `chrome.runtime.openOptionsPage()`；或 `chrome://extensions` → 插件「详情」→「扩展程序选项」 |
| 审计 | 侧栏「查看审计」（零明文导出） |
| 风控（暂停/恢复/中止） | 侧栏底部（**不**在知情同意折叠区，保持可操作） |
| 知情同意与能力边界全文 | 侧栏底部「▶ 知情同意与能力边界」折叠区（默认收起，文本零删改） |

## 4. 调试

| 目标 | 方法 |
|------|------|
| background / service worker | `chrome://extensions` → 插件卡片 → 「检查视图 service worker」→ DevTools Console |
| content script | 宿主页 DevTools Console（isolated world 日志可见）；Sources → Content scripts |
| side panel | 右键 side panel → 「检查」 |
| options 页 | 右键扩展图标 → 「选项」→ DevTools |
| 审计 | side panel「查看审计」或 `admin_audit-export`（零明文） |
| 站点 RPC | 页面世界 Console 观察 `web-cli:invoke` / `web-cli:result` / `web-cli:event` postMessage |

日志约定：失败一律可读（中文），不静默；不可达能力经归属转译输出。

## 5. 热重载可行路径

MV3 没有官方 HMR；实践中按下表操作：

| 改动 | 可行路径 | 说明 |
|------|----------|------|
| content script (`content.js`) | 重新构建 → 刷新宿主页（重新注入） | 已注入的旧脚本随页面卸载 |
| side panel / options | 重新构建 → 关闭并重开侧栏 / 刷新 options 页 | HTML/JS 重新加载 |
| background (SW) | 重新构建 → `chrome://extensions` 点插件卡片「重新加载」 | SW 重启；状态从 `chrome.storage.session/local` 恢复 |
| manifest | 重新构建 → 「重新加载」 | 权限变化可能需重新授权 |
| 全量 | `npm run build --workspace @lgdl/web-cli-plugin` → 「重新加载」 | 最可靠 |

> 开发循环建议：`node build.mjs`（esbuild 很快）+ 浏览器「重新加载」；SW 状态恢复了多轮会话与审计（EC-013）。

## 6. 测试与类型检查

```bash
npm run typecheck --workspace @lgdl/web-cli-plugin   # tsc --noEmit
npm run test --workspace @lgdl/web-cli-plugin        # node --test（机制层单测）
npm test                                             # 全仓
```

## 7. 冒烟方法论（FR-045 / ADR-006）

### 7.1 无头 / 自动化可行性结论

| 能力 | 结论 | 证据 |
|------|:----:|------|
| `--headless=new --load-extension=dist` 加载扩展 | **可行** | `spike-mv3-gkey.md` G-MV3：CDP `/json` 出现 `service_worker` target；SW 内 `getManifest()` 正常 |
| CDP 驱动 background（`Runtime.evaluate`） | **可行** | 同上；storage 往返、API 可达、G-KEY 401 |
| 无头下构造 `activeTab` 用户手势 | **不可行** | `permissions.request` 回调未授予；`executeScript` 报 *"Cannot access contents of the page…"*（见 validate V9b） |
| 真实产物全链（content→background→host→RPC）无头验证 | **不可行**（需人工面） | 同上；受控 harness 可验证机制面但不冒充真实产物全链 |

**结论**：机械面（扩展加载 / SW 可达 / storage / 权限清单 / 协议与安全机制）可自动化；**content 注入全链与 side panel 交互属人工面**，无头无法替代。

### 7.2 机械面 / 人工面分离

- **机械面（CDP 驱动，可脚本化）**：扩展加载、SW target、`manifest` 权限断言、`storage` 往返、发现三态、声明读取、门禁三路（allow/deny/超时）、untrusted fail-closed、RPC 往返、审计落库、明文 grep、导航失效。
- **人工面（真实浏览器交互）**：content script 注入（用户手势）、side panel 多轮对话、授权弹层与知情同意、二次确认、审计查看、真实 LGDL 页端到端（含写回）、可选真实 LLM 闭环。

> 逐项清单见 `docs/smoke-checklist.md`；降级出口（headful + xvfb / Playwright `launchPersistentContext`）见该清单 §3。

### 7.3 建议执行顺序

1. `npm run build --workspace @lgdl/web-cli-plugin`
2. 机械面：`chromium --headless=new --disable-extensions-except=dist --load-extension=dist --remote-debugging-port=<p> about:blank` + CDP 脚本
3. 人工面：按 `docs/smoke-checklist.md` §2 逐项

### 7.4 真实产物全链 E2E（R8，自动化可重复）

```bash
npm run build --workspace @lgdl/web-cli-plugin   # 先构建（脚本读取真实 dist/）
npm run test:e2e --workspace @lgdl/web-cli-plugin
```

`test/e2e/fullchain.mjs` 用 CDP 驱动 headless Chromium，加载**真实 `dist/` 字节**并打通
`content→background→host→RPC` 全链，两个场景：
- **A. 非 LGDL fixture（AC-010）**：发现 → 授权 → mock LLM 工具调用 → 真实 host 门禁/风险策略 →
  站点 postMessage RPC → 页面执行 → 二次确认门禁 → 结果回填 → 多轮会话 → 审计导出。
- **B. LGDL Workbench 真实构建（AC-009）**：加载 `packages/lgdl-web/dist` 真实产物 → 运行时握手
  发现 `site_lgdl-web-cli` → 授权 → `lgdl-web-cli status` 读全链返回图内容 → 审计。

**唯一偏差（单条，明示）**：脚本把本地 fixture/LGDL/LLM origin（`http://127.0.0.1:<port>/*`）
追加进 `host_permissions`（dist 的 JS 与发布产物字节一致，仅 manifest 副本追加）。原因：
`optional_host_permissions` 的 `chrome.permissions.request` 需要真实用户手势 + 原生权限弹窗，
headless 无法合成（validate V9b 实证）。因此本脚本证明的是**机制全链**，而非手势驱动的权限
UX。**不得**把它表述为「无偏差真实产物全链 PASS」。

**剩余人工 UX 项**（无法自动化，随 `smoke-checklist.md` §2）：H0 content 注入手势、
H2 授权弹层与 `permissions.request` 原生弹窗、H4 审计 UI、H6 LGDL 真实页端到端、
H8 风控控件、H9 事件订阅 UI、H10 ask-user 问答 UI、H7 真实 LLM 闭环。

## 8. 性能与上下文预算（NFR-007）

> spec 原 NFR-007 未给量化阈值；本节定义**可验证阈值**并记录实测（回归护栏见 `test/perf-budget.test.ts`，决策 D-028）。

### 8.1 量化阈值

| 维度 | 阈值 | 落点 / 机制 |
|------|------|-------------|
| content script 注入体积 | `content.js` ≤ **64 KB**（IIFE，按需注入；无静态 `content_scripts`，空闲零开销） | `build.mjs` 产物；`test/perf-budget.test.ts`（有 dist 时断言） |
| background SW 体积 | `background.js` ≤ **1.2 MB**（含 base 全量工具面 + LLM SDK 浏览器分支） | 构建产物（仅记录，不设硬断言） |
| 事件上下文摘要 | 每次 pull ≤ **10** 条（`EVENT_CONTEXT_SUMMARY_N`），带可读截断提示 | `content/page-bridge.ts`；`content.test.ts` |
| 单事件负载 | ≤ **4096 字符**（base `DEFAULT_BUDGETS.payloadBudgetChars`，超限截断 + `truncated`） | `@lgdl/web-cli-base` 事件总线 |
| 全通道事件速率 | ≤ **200 条/s**（base 护栏，超限丢弃计数） | base `event-bus.ts` |
| 会话历史上限 | ≤ **40 turn**（`MAX_SESSION_TURNS`，裁剪后首条强制 user） | `background/chat-session.ts`；`chat-session.test.ts` |
| 审计环形缓冲 | ≤ **500** 事件（`DEFAULT_AUDIT_CAPACITY`，溢出计数不静默丢） | `security/audit-sink.ts` |
| 风控令牌桶 | 每 origin **60** 容量 / **6** token·s⁻¹（可配） | `security/policy.ts` `createRiskGuard` |
| RPC / 握手超时 | invoke **30s** / probe **3s**（超时可读失败，不挂起） | `protocol/rpc.ts` |
| 消息往返时延（node 机制面） | 50 次已授权读派发 < **250 ms**（≤5 ms/call） | `test/perf-budget.test.ts` |

### 8.2 实测（2026-09-12，本机）

| 对象 | 实测 | 阈值 | 判定 |
|------|------|------|:--:|
| `dist/content.js` | **33.9 KB**（34,711 B） | ≤ 64 KB | ✅ |
| `dist/sidepanel.js` | **15.1 KB** | — | ✅ |
| `dist/background.js` | **968,442 B**（≈945.7 KB） | ≤ 1.2 MB | ✅ |
| `dist/options.js` | **893.9 KB** | — | 记录 |
| 50 次已授权读派发 | ~0.9 ms/call（200 次 180.9 ms；含 setup） | < 5 ms/call | ✅ |
| 500 turn 提交后快照 | 40 turn / JSON < 64 KB | ≤ 40 turn | ✅ |
| 会话历史上限 | 40 | 40 | ✅ |

> **口径说明**：宿主页卡顿面主要由「按需注入 + 无静态 content_scripts + 事件默认零常驻监听」控制；扩展 SW 内存无法在 node 面直接测量，以上体积/时延为可重复的代理指标。真实浏览器内存采样属人工面残余项（见 `smoke-checklist.md` §2）。

## 9. UI 旅程测试（`npm run test:ui`，TASK-018）

真实用户点击路径的可重复门禁：`test/ui/journey.mjs` 用**全新 `--user-data-dir`（模拟首次安装）**
加载真实 `dist/`，并通过 CDP `Input.dispatchKeyEvent` / `Input.dispatchMouseEvent` 做**真实键入与点击**
（不是 JS 直接改 value / dispatch submit）。

```bash
npm run build --workspace @lgdl/web-cli-plugin   # 前置：脚本读取真实 dist/
npm run test:ui --workspace @lgdl/web-cli-plugin
```

覆盖的旅程与断言（97 项，失败即非零退出并打印页面异常 / console error）：

1. 全新 profile 加载真实 dist，`web-cli plugin` service worker 可达；
2. 真实打开 `chrome-extension://<id>/options.html`，无 load 期异常；
3. 表单元素齐全（`#form` / `#apiKey` / `#model` / `#save` / `#test`）+ 首次安装显示未配置警告；
4. 真实键盘切换厂商（typeahead + ArrowDown 兜底）→ `openai`；
5. 真实逐字键入 API Key / 模型 / Base URL（断言未被装饰）；
6. 真实点击「保存」→ `#saved` 出现「已保存」并使用成功色（`msg-ok`）、`#apiKey` 被清空、
   `#key-warning` 消失、`#key-state`=「Key ✅ 已写入（不回显）」、placeholder=「已保存（不回显）…」；
7. 从 **SW 上下文** `chrome.storage.local` 读回 `web-cli:web-cli:llm`，断言 active / apiKey / model / baseURL；
8. 刷新 options → 回显厂商 / 模型 / 配置摘要（含 `Key ✅`）、警告不出现，且「已写入」+ 已保存 placeholder 保持；
9. 真实点击「测试连接」→ 经 background 打本地 mock OpenAI 端点（`/v1/chat/completions`）→
   可读成功结果（含延迟 `ms`）；
10. 侧栏（`sidepanel.html`）LLM 行含 `Key ✅`；无活跃站点时显示**具体原因 + 下一步动作**与
    「重新绑定当前标签页」按钮，发送禁用原因在输入框旁可见；
11. **侧栏自动测试（TASK-028，#12~#12m）**：侧栏**不存在**独立「测试连接」按钮；面板加载后
    **自动**出现测试结果（成功态格式 `✓ <厂商> 连接正常（模型 <model>，<n> ms，最小 ping 请求）` +
    `ok` 样式）；同配置 60s 内为缓存命中（mock 计数不变）；重复 render / 消息追加 / 焦点轮询**不重复触发**
    （探针 `llm-test` 计数不变）；配置（模型）变更使缓存失效 → 发一次真实 ping（mock +1）；
    未配置时显示 `⚠ …API Key` 可读提示且**零请求**；
12. options 页与侧栏页各 0 未捕获异常、0 console error；
13. **三区布局门禁（TASK-023，#15a~#15q）**：固定 400×900 视口 → `#log` 为 flex 填充（非 45vh）、
    稳态高度占比 >45vh、composer 贴底（未被 consent 挤压）、文档级无水平溢出、三区结构 + 「回到底部」入口；
    注入长工具结果 → 工具卡片（标题=名+状态+耗时、长输出默认折叠、正文等宽+横向滚动、卡片内恶意 HTML 仍为文本）、
    命令块 `.cmd`、错误 system 气泡；真实点击摘要卡片展开；上滚显示「回到底部」/ 贴底隐藏；320px 窄栏零水平溢出。

> **hermetic mock**：脚本内置一个仅监听 `127.0.0.1` 的 mock OpenAI 端点（回 `? CORS` + PNA 头），
> 因此无需联网、可重复。`dist/` 字节未被修改（与 R8 的「manifest 副本追加 host_permissions」偏差不同）。
> 需要看 mock 往返时设 `UI_DEBUG=1`。

### 9.1 为什么需要它（验证盲区）

既有 `npm test`（node 机制层）与 `npm run test:e2e`（content→background 全链）都**不经过 options 页的
真实输入/点击**。用户实测反馈的「填 Key 没法保存 / 没有测试连接」正落在这一段盲区，故固化为常驻门禁。

## 10. 诊断与常见问题（TASK-019）

> options 页新增「环境自检 / 诊断」区块：扩展上下文 / 版本·构建 / `chrome.storage.local` 读写实测 /
> background 连通性（往返 ms）/ 已授权 origin + 活跃站点 / 已配置厂商·模型（零明文），逐项 ✅⚠❌ +
> 可读详情，并支持「复制诊断信息」（**绝不含 API Key**）。页面加载即自动跑一次，也可点「运行自检」。
> 复现/验证脚本：`npm run test:hardening`（`test/ui/hardening.mjs`，CDP 真实浏览器）。

### 10.1 「配置保存不了怎么办」

**先确认你在扩展环境里**。最常见原因不是代码 bug，而是把 `dist/options.html` 当**普通文件/普通网页**
打开（`file://…` 或非扩展页）：此时 `chrome.storage` 根本不存在，配置无处可存。TASK-019 起，options
与侧栏入口都会检测环境，并在页首显示**醒目阻断横幅**「⚠ 当前不在扩展环境（chrome.storage 不可用），
配置无法保存…」，同时**禁用**「保存 / 测试连接 / 清除」按钮，输入框旁给出原因。

排查顺序：

1. 打开方式对不对？必须走 `chrome://extensions` → 本插件 → 「扩展程序选项」，或侧栏顶部「配置模型 / 设置」。
2. options 页「环境自检 / 诊断」逐项看：「扩展上下文」是否 ❌；「chrome.storage.local 读写实测」是否 ✅。
3. 保存时若出现 `✖ 保存失败：…`，那是**可读失败**（不会静默）——复制诊断信息反馈即可。
4. 「测试连接」能区分 401 / 403 / 404 / CORS·网络 / 超时；火山端点直连受限会**如实**说明（G-KEY），不是保存问题。

> 实测对照（`test/ui/hardening.mjs` A 场景）：修复前 `file://` 页保存只在 `#saved` 显示底层错误
> `Cannot read properties of undefined (reading 'local')`，无环境提示、按钮可点；修复后横幅 + 按钮禁用 + 诊断 ❌。

### 10.2 「站点用不了是正常的」

本插件**只能操作声明了 web-cli 协议的站点**。在 google.com 这类普通站点上「什么都不能用」是**设计如此，
不是故障**。侧栏现在会在发现态为非 `supported` 时显示明确说明：

- **未声明**（`unsupported`）：标题「当前站点未声明 web-cli 协议」，说明「设计如此，不是故障；可在 LGDL
  工作台等声明了协议的站点使用」，并给出验证方法（查看 `<link rel="web-cli">` / `/.well-known/web-cli.json`）。
- **探测失败/未知**（`unknown`：声明无效 / 版本不匹配 / 暂时不可达）：显示**可读原因** + 「重新探测」按钮。

在声明了协议的站点（如本仓库的 LGDL Web）打开 → 点工具栏插件图标 → 侧栏「授权当前站点」→ 输入指令。

### 10.3 「改了代码要重新加载扩展」

MV3 没有 HMR。改源码后 `npm run build` 只更新了 `dist/` 磁盘字节；**已加载的扩展不会自动生效**：

| 改动 | 生效方式 |
|------|----------|
| content script | 重新 build → 刷新宿主页 |
| side panel / options | 重新 build → 关闭重开侧栏 / 刷新 options |
| **background SW / manifest / 全量** | 重新 build → `chrome://extensions` 点插件卡片「**重新加载**」 |

诊断面板的「扩展版本 / 构建」会比对**页面构建戳**与 **background 上报构建戳**：只刷新页面没重载扩展时，
会显示「页面构建 X 与 background 构建 Y 不一致——…请在 chrome://extensions 点『重新加载』」。

> 实测（`test/ui/hardening.mjs` C 场景）：重新 build 后仅刷新 options（不点「重新加载」）→ 诊断确实报不一致；
> 点「重新加载」后重开则恢复一致（headless 下后者为可选复验 `HARDENING_C4=1`）。

### 10.4 「明明提示已保存，为什么 Key 框是空的？」

**这是正常的「不回显」，不是没保存成功。** 出于安全，插件在保存成功后**不会把 Key 回显到输入框**
（页面脚本永远读不到明文）。TASK-020 起，为了避免把「成功」做得像「失败」，保存成功后会：

- 输入框 `value` 仍为空，但 placeholder 变为「**已保存（不回显）；如需更换请重新输入**」；
- 输入框下方 `#key-state` 显示「**Key ✅ 已写入（不回显）**」（未配置时显示「⚠ 未配置 Key —— 保存后仍无法调用 LLM」）；
- `#saved` 用**成功色（绿）**给出摘要「✓ 已保存：<厂商> · <模型> · Key ✅ 已写入」，并高亮 / 滚动到该提示。

刷新页面后，标记同样由后台的零明文摘要驱动并保持。**要确认配置真的有效，请点「测试连接」**（见 10.5），
它会用当前/已保存配置发一次最小真实请求并给出可读结果（成功含延迟 `ms`；失败区分 401 / 403 / 404 / CORS·网络 / 超时）。

> 若你看到的不是上述「已写入」标记，而是 `✖ 保存失败：…`，那才是真的失败，且失败原因一定可读——
> 复制 options 页「环境自检 / 诊断」的信息反馈即可。

### 10.5 「为什么发送是灰的？」

发送按钮在**没有可用的已绑定站点**或**上一条指令仍在处理中**时禁用（避免发出去无工具可调）。TASK-020 起，
侧栏会把**禁用原因写在输入框附近**（`#send-reason`），并在顶部把「无活跃站点」拆成**具体原因 + 下一步动作**：

| 情况 | 侧栏提示 | 怎么解决 |
|------|----------|----------|
| 当前标签页的地址读不到（未点图标授权；Chrome 不向插件提供 `tab.url`） | 「当前站点尚未绑定（读不到标签页地址）」+ 说明「这不是页面故障」 | **在目标站点标签页点击工具栏插件图标**（绑定的唯一触发点）；或点侧栏「**重新绑定当前标签页**」 |
| 当前标签页是 `chrome://` / 扩展页 / 应用商店等受限页 | 「当前标签页不可注入（…）」 | 切换到目标站点标签页 → 点工具栏插件图标；或点侧栏「**重新绑定当前标签页**」 |
| 已打开 http(s) 站点但尚未绑定（已点图标但扩展刚重载等） | 「当前站点尚未绑定（https://…）」 | 点工具栏插件图标，或点「**重新绑定当前标签页**」 |
| 没有可用标签页 | 「没有可用标签页」 | 打开目标站点标签页后再点插件图标 |
| 已在目标站点但发现态非 `supported` | 由 `#discovery-notice` 说明（未声明 = 设计如此非故障；未知 = 可读原因 + 「重新探测」） | 按提示「重新探测」或换到声明了协议的站点 |
| 切到别的标签页（该站点已授权） | 无提示——自动握手识别并切到该站点对应会话 | 无需操作 |
| 切到未授权/受限标签页 | 「已切换标签页：当前标签页尚未授权/未注入…」 | 在目标站点授权一次（之后自动），或点插件图标 |
| 上一条指令仍在处理 | 「发送已禁用：上一条指令仍在处理中」 | 等当前轮结束 |

侧栏顶部不再单独放「测试连接」按钮（TASK-028）：面板**加载时自动**用已保存配置跑一次最小 ping，
结果在侧栏 `#llm-test-result` 可读展示（详见 §10.10）。

### 10.6 「为什么以前一定要点插件图标？现在还要吗？」（绑定逻辑）

**结论（v0.9 起）：每个站点首次授权一次，之后注入/握手/绑定全自动**；只有**未授权**站点仍需点图标（点图标路径永久保留为回退）。

- **Chrome 只在「用户手势」里把标签页地址交给扩展。** manifest **没有**（也不应该有）`tabs` 权限；`host_permissions` 只覆盖 6 个 LLM 域名。因此在**点击插件图标之前**，`chrome.tabs.query(...).url` 对任何普通网页都是 `undefined`——包括正常的 `http://localhost:5173`。旧文案把它写成「当前标签页没有可读取的地址」，让人以为页面有问题；实际含义是「**你还没在目标站点点插件图标**」。
- **首次授权 = 声明式注入的开关。** 在侧栏点「授权当前站点」且浏览器授予该站点权限后，background 调 `chrome.scripting.registerContentScripts({ matches:['<origin>/*'], js:['content.js'], persistAcrossSessions:true })`。此后该 origin **每次页面加载自动注入** content script，无需点图标。
- **自动握手 = 免手势绑定。** content script 加载后主动上报自身 `location.origin`（`hello` 消息）；`tabs.onActivated` 切换标签页时 background 发 `whoami`，content script 回 origin → 自动绑定该标签页并 adopt 其会话。**不读 `tab.url`、不需要 `tabs` 权限、不需要手势。**
- **未授权站点静默降级。** 未授权 origin 不注册、不注入；握手失败时**静默**返回「未绑定」并给可读提示（不刷错误日志、不弹错），点图标路径仍可用。
- **启动对账。** SW 启动 / `onInstalled` / `permissions.onAdded|onRemoved` 时读 `getRegisteredContentScripts()` 与「已授权 + 已获权限」集合对账：**补齐缺失、清理已撤销**；失败写入审计与日志（可读）。
- **为什么以前点了图标也不绑定？** 旧实现调用了 `chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })`。Chrome 语义：**该开关开启时 `chrome.action.onClicked` 不会触发**——于是点图标只开面板、绑定逻辑（在 `onClicked` 里）成了死代码。现在改为显式 `openPanelOnActionClick: false`，并由点击处理函数在**同一手势内**调用 `chrome.sidePanel.open({ tabId })`。
- **切换标签页会自动重绑（已授权站点）。** `tabs.onActivated` 先做 `whoami` 握手：成功 → 自动绑定并切到对应会话（不弹提示）；失败（未授权/受限）→ 标记 stale 并给可读提示，绝不因此报错。

排查顺序：① 未授权站点先在目标标签页点插件图标；② 看侧栏顶部是否出现站点 origin（不再是「无活跃站点」）；③ 点「授权当前站点」（每个站点一次）；④ 之后刷新页面/切标签页应**自动**绑定（无需再点图标）；⑤ 发送按钮应变为可用。仍不行时用 options 页「环境自检 / 诊断」反馈。

> 机械面实证：`npm run test:binding`（`test/ui/binding.mjs`）阶段 1 用**真实 dist + 真实 `http://localhost:5173` 的 lgdl-web + mock LLM** 跑通「绑定 → 注入 → 发现 supported → 授权（http host permission 路径）→ 发送可用 → 输入 11111 对话」6 步；**阶段 2 专证自动探测**：authorize → `chrome.scripting` 真实注册 → **reload 页面触发 hello 自上报 → 免点图标自动绑定 `origin` + discovery supported + 工具面装配**（#A0~#A7），并验证 whoami 切标签页重绑与未授权站点静默降级。图标点击不可脚本触发与 headless 无原生权限弹窗两处偏差已在该脚本头部如实披露。该门禁同时**捕获真实发给 LLM 的 `tools` 数组并断言每个 `name` 匹配 `^[a-zA-Z0-9_-]+$`**（见 §10.7）。

### 10.7 「发消息报 HTTP 400：Invalid 'tools[0].function.name'（工具名非法字符）」

**现象**：侧栏发送任意消息后报 `400 ... string does not match pattern '^[a-zA-Z0-9_-]+$'`（同一条可能显示两次，原因见下）。

**根因**：上游 `CommandRouter` 把 LLM 工具名派生为 `namespace ? namespace + '.' + name : name`（`fqNameOf`）。旧插件把站点工具注册在 `site` 命名空间，于是工具名变成 `site.lgdl-web-cli`、管理工具变成 `plugin.origin-authorize`——**含 `.`，不匹配 OpenAI/DeepSeek 的 function-name 约束**，请求在发送前（或服务端校验）即 400。

**修复（插件侧，base 零改动）**：
- 所有注册进 `CommandRouter` 的工具名改为**扁平、无点**：站点工具 `site_<sanitizedId>`、管理工具 `admin_<name>`；实现为 `namespace: ''` + 合法 `name`，**help 分组 `group` 保持不变**（`site` / `plugin`）。
- `sanitizedId` = 原始 `decl.id` 中非 `[A-Za-z0-9_-]` 字符替换为 `_`、折叠连续 `_`、去掉首尾 `_`（`declared-tools.ts:sanitizeToolName`）。
- **RPC 保真**：`executor` 内仍用**原始 `decl.id`** 调 `rpc.invoke`；站点按自己的 id 派发，无感知。help 同时展示扁平名与原始 id。
- **碰撞**：两个 `decl.id` sanitize 后同名时确定性加 `_2`/`_3` … 后缀（`allocateSiteToolNames`），并写入审计（`descriptor-read` detail 含「工具名去重」），绝不静默覆盖。
- **策略链同步**：`security/policy.ts` 的 S1/S2/S3 由 `namespace === 'site'` 改为**等价可靠判据 `group === 'site'`**（`PLUGIN_SITE_GROUP`）；站点工具仍走插件自决 risk + fail-closed，未放宽。

**为什么错误显示两次**：base `AgentRunner` 对 LLM 调用失败会**自动重试一次**（`runner.ts handleLlmError`），两次都触发 `onLLMError`；旧插件把两次都转发成 `variant:'error'`，故侧栏出现两条完全相同的 `system:` 错误。插件现用 `willRetry` 区分：首次是可读的「正在自动重试一次…」提示，仅最终失败才是 `error`（`chat-events.ts:llmErrorEvent`）。retry 本身是 base 既有设计，未改动 base。

**回归门禁**：`test/host.test.ts`「LLM function names…强制门禁」断言 `host.deriveTools()` 的**每一个** name 匹配 `^[a-zA-Z0-9_-]+$`（含站点/管理/内建），并覆盖 sanitize/去重/原始 id 保真；`npm run test:binding` 在真站点下捕获发给 LLM 的真实 `tools` 并断言合法（本次事故直接复现）。

### 10.8 消息渲染（Markdown）与安全说明（TASK-022）

**现象**：模型回复里的 `# 标题` / `| 表格 |` / `**加粗**` / 围栏代码块在侧栏原样显示成字符——旧实现对每条消息只做 ``textContent = `${role}: ${text}` `` 的纯文本写入。

**现在**：每条消息渲染为「角色标签 + 内容区」分组块（`你 / 助手 / 工具 / 系统`，类名 `.msg-user` / `.msg-assistant` / `.msg-tool` / `.msg-system`）。**assistant** 走安全 Markdown 渲染；**tool/system** 保持等宽 + 保留空白/制表符（工具结果常是 CLI 文本或整份文档，不做 Markdown 解析）；**user** 纯文本。

支持子集（`src/ui/sidepanel/markdown.ts`，**零新依赖**）：

- 标题 `#`~`######`、水平线 `---`、引用 `>`；
- 无序/有序列表（含简单嵌套）、段落；
- 行内 `**粗**` / `*斜*` / `` `code` `` / `~~删除~~`；
- 围栏代码块 ```lang（原文保留、等宽字体 + 横向滚动、内部不解析 Markdown）；
- GFM 管道表格（窄侧栏内可横向滚动）；
- 链接：仅当 scheme 为 `http` / `https` 时渲染 `<a target="_blank" rel="noreferrer noopener">`；其他 scheme（`javascript:` / `data:` / 相对路径 / 协议相对 `//host`）**降级为纯文本**。

**为什么没有 XSS**（输入 = LLM 输出 + 站点内容，一律视为不可信）：

1. **全程不解析 HTML**：不使用 inner-html / outer-html / adjacent-html 这类「HTML 字符串写入」DOM API；所有文本一律经 `createTextNode` / `textContent` 注入，浏览器只能当纯文本。`<img src=x onerror=…>` / `<script>` 以字面文本呈现，永远不会变成元素或被执行。
2. **只创建白名单标签**：`h1`~`h6` / `p` / `hr` / `blockquote` / `ul` / `ol` / `li` / `pre` / `code` / `strong` / `em` / `del` / `a` / `table` / `thead` / `tbody` / `tr` / `th` / `td`；`img` / `script` / `iframe` / `style` / `link` 等无法被产出。
3. **链接 scheme 网关**（`safeHref`）：无显式 scheme 或非 http(s) 一律返回 `null`，调用方降级为文本；锚点属性经 `setAttribute` 写入，不拼接 HTML。
4. 围栏语言仅保留 `[A-Za-z0-9_+.-]` 后作为 `class="language-<x>"`。

> 这是「不解析 HTML」的**结构性安全**，比「先转义再 innerHTML」更强且无双重转义。仓库内唯一一处 `outerHTML` 是 `src/content/content-script.ts:70` 的**只读** `document.documentElement.outerHTML`（读取页面 `<link rel="web-cli">` 声明），非注入。

**窄侧栏防溢出**：`.msg-content { overflow-wrap: anywhere; }`；`pre` / `table` 各自 `overflow-x: auto`，容器不被撑破；`.content-assistant` 重置 `white-space: normal`，tool/system 保持 `pre-wrap`。`test:ui` 断言 `#log.scrollWidth === #log.clientWidth`。

**回归门禁**：`test/markdown.test.ts`（12 用例：XSS / 链接 scheme / 表格 / 代码块 / 列表 / 标题 / 行内 / 未闭合语法 / 纯解析 / 无 HTML 注入 API）；`test/sidepanel-view.test.ts` 静态钉住集成与样式；`npm run test:ui` 新增 **#14a~#14i**（mock LLM 返回含恶意 HTML 的 Markdown → 经真实 `chat-result` 渲染 → 断言真实 `h1`/`strong`/`table`/`pre>code`、无 `script`/`img`、恶意内容为文本、无水平溢出）。

### 10.9 「为什么 web-fetch 报 CORS？如何正确使用」（FR-050 / EC-023）

**现象**：在 `chrome://extensions` 的错误列表里出现

```
Access to fetch at 'https://www.baidu.com/' from origin
'chrome-extension://<扩展 id>' has been blocked by CORS policy:
No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

同时助手的回复像「没有任何通知，往前走吧」——工具失败既没成为可见提示，也没有可读原因。

**根因（代码级）**：base 的 `web-fetch`（`packages/web-cli-base/src/web-fetch.ts:138,143`）在 **MV3 service worker** 里直接 `globalThis.fetch`。扩展页面本身是一个源（`chrome-extension://<id>`），对任何**不在 `manifest.host_permissions`** 的站点都是跨源请求 → Chrome 必然 CORS 拦截；而且请求一旦发出，浏览器网络栈就会把该 CORS 错误写进 `chrome://extensions`，与代码是否 `catch` 无关。旧实现还把失败只作为 tool 结果塞进 LLM 上下文，侧栏没有把它当错误事件呈现。

**现在（受控预校验，先判断再请求）**：插件侧用 `src/tools/web-fetch-tool.ts` 的同名受控工具**替换** base 内建（`host.ts` 传 `builtins: ['sleep','web-cli-help']` 后注册受控条目；`service-worker.ts` 注入真实依赖）。执行前先做预校验：

| `--path` 形态 | 判定 | 行为 |
|---------------|------|------|
| 相对路径（如 `guide.md`） | 用**当前绑定站点 origin** 解析为绝对 URL；该 origin 需有 host 权限 | 有 → 读；无 → **不发请求**，可读拒绝 + 指引 |
| 绝对 `http(s)` URL | `chrome.permissions.contains({origins:[origin+'/*']})` | 覆盖 → 读；未覆盖 → **不发请求**，可读拒绝 + 指引 |
| `file:`/`data:`/`javascript:`/`chrome:`/`about:` 等 | scheme 白名单 | 可读拒绝，不发请求 |

因此**未授权域名零请求**，`chrome://extensions` 不再出现该 CORS 错误条目（`test:binding` #7h/#7i 用真实本地目标服务器 + 真实 SW 控制台取证）。拒绝文案包含原因（未授权域名 + 扩展跨源限制）与两条可执行指引：① 在该站点标签页点插件图标 →「授权当前站点」→ 重试；② 用 `tabs open` 打开该站点并授权，再由站点工具/页面上下文读取。

**同源读取真正可用（C）**：相对路径 / 同源资源在**已授权**时优先走**页面上下文**——后台经 `fetch-text` 消息请求绑定标签页的 content script（`content/content-script.ts` 的 `fetchSameOriginText`，页面自身同源 `fetch`），把结果包成一个 `Response` 交回 base executor，因此 HTML→Markdown 清洗 / 大小护栏 / untrusted 标记仍由 base 单一实现（零重复）。页面上下文不可用时回退到宿主 fetch（此时 host 权限已授予，不会 CORS）。

**失败可见（B）**：失败的工具结果在侧栏渲染为**红色错误条目**（`chat-state.ts` 对 `ok:false` 的 tool 条目使用 `kind:'error'` → `.entry-error` + `.tool-status.fail`「✖ 失败」），不再只进 LLM 上下文；system prompt 明确要求「工具失败必须向用户报告，不得一带而过」，并在未授权域名场景给出授权指引。

**如何使用（正确姿势）**：

- 读**当前绑定站点自己的资源** → 用同源相对路径：`web-fetch --path guide.md`（先绑定并授权该站点）。
- 读**其他域名** → 先在该站点标签页点插件图标并「授权当前站点」，再传完整 `https://…` URL。
- 只是想在那个站点页面上做事 → 用 `tabs open --url https://…` 打开并授权，让站点工具/页面上下文去读。
- 不要指望对**未授权域名**发 `web-fetch` 成功——会被明确拒绝（这是设计，不是故障）。

**为什么不是「插件加载报错」**：CORS 是**运行期**的网络策略拦截（请求已发但响应被浏览器拒绝），不是 manifest/SW 注册/语法等**加载期**错误。`test:binding` 阶段 0 另行断言 SW 已注册、可响应消息、且无未捕获异常/语法/SW 注册/manifest 加载错误（#0h），把「加载错误」与「运行期 CORS」如实分开。

### 10.10 侧栏加载自动测试当前模型配置 + 60s TTL 缓存（TASK-028）

作者要求：**「测试连接」只放在设置里即可**，侧栏不再单独放按钮；侧栏**每次加载自动**测试当前
选择的模型配置并展示状态，例如：

```
✓ DeepSeek 连接正常（模型 deepseek-flash，1181 ms，最小 ping 请求）
```

- **触发点（唯一）**：`sidepanel.ts` 引导阶段调用一次 `autoTestConnectionOnce()`；`render()` / 消息追加 /
  状态轮询（含窗口 `focus` / `visibilitychange`）**都不会**再触发它（模块级一次性守卫 + 静态钉住
  `void autoTestConnectionOnce()` 只有一处）。
- **复用既有链路**：仍走 `llm-test` 消息 → background `testLlmConnection` → 最小 `ping` 请求；
  **不新增请求路径**。key 只在 background 请求内使用，绝不回显/落日志/进审计。
- **未配置零请求**：无 API Key 时 `testLlmConnection` 直接返回 `no-key` 可读提示（`⚠ …API Key`），
  **不发任何网络请求**（`test:ui` 用 mock 计数断言不变）。
- **60s TTL 缓存（background）**：`src/llm/test-cache.ts` 提供**内存单槽**缓存，key = 配置指纹
  （厂商 + 模型 + Base URL + **Key 的不可逆 FNV-1a 哈希**）；命中且未过期 → 直接返回**原结果**
  （含原耗时 ms，`cached:true`）**不再发真实请求**；指纹变化（厂商/模型/Key 任一变更）或 TTL 过期
  → 失效并重新测试。指纹与 key **只在内存比较**，绝不落盘 / 日志 / 审计。
- **实测证据**：`test:ui`（#12f 缓存命中 mock 计数不变；#12h 重复 render 探针计数不变；
  #12k 配置变更 mock +1；#12m 未配置零请求）、`test:binding`（#6-1 真站点 + 真扩展加载即出现状态）。
- **成本说明**：自动测试会在缓存未命中时产生一次最小 ping 请求（成本极小）；TTL 用于避免频繁重测。

## 11. 侧栏对话界面布局（TASK-023 整体重做）

> 用户实测反馈：插件侧栏的对话体验比「做插件之前原本的 AI 助手」明显更差。本轮**先 `git show` 读回原
> AI 助手**（`762d3a6^:packages/lgdl-web/src/ai/AiPanel.tsx` + `app.css`，TASK-016 已移除）作设计基准，
> 再整体重做侧栏布局与消息呈现，非继续打补丁。

### 11.1 三区 flex 全高布局

```
┌─ #panel-top     （flex:0 0 auto，不滚动）
│   状态行：站点 origin · 发现 · 授权 · 信任 ＋ LLM 状态
│   主操作：配置模型/设置 · 授权当前站点 · 〈更多 ▾〉（撤销/重绑/审计/计数）
│   自动测试状态：#llm-test-result（加载即自动跑一次最小 ping，见 §10.10）
├─ #panel-main    （flex:1 1 auto，min-height:0）
│   #log          （唯一滚动区：消息列表）
│   #scroll-bottom（浮动：仅上滚时出现）
└─ #panel-bottom  （flex:0 0 auto，不滚动）
    提示条（cap 34vh 内滚）：env-guard / site-hint / onboarding / discovery-notice / notice
    交互卡：confirm / ask ；#send-reason ；#consent（折叠条，标题常显）
    #composer（input + 发送）——**最后一个元素**，因此永远贴底
```

- 关键点：旧 `#log { height: 45vh }` 硬编码已删除，改为 `flex: 1 1 auto; min-height: 0`。旧布局 composer
  之后还压着 `#consent`，内容一多 **composer 被挤出视口**；现在 `#consent` 折叠条移到 composer 之前，
  composer 为末元素。
- 次要操作收进 `<details id="more-actions">`，不再 8 个按钮横铺在对话上方。
- 全部既有元素 ID 与 `.entry`/`.entry-<role>`/`.entry-error` 选择器保留（测试门禁零回归）。
- 明暗适配：CSS 变量 + `@media (prefers-color-scheme: dark)`；`color-scheme: light dark`。

### 11.2 消息呈现

- **user**：右对齐 indigo 气泡；**assistant**：左对齐气泡 + 安全 Markdown（§10.8）；
  **tool**：**可折叠卡片**（标题=工具名 + 状态 + 耗时，折叠时附首行摘要；正文深色等宽、可展开、横向滚动；
  长输出默认折叠、短输出默认展开，用户开合态跨重渲染记忆）；无工具名的 tool 条目（如 LLM 重试提示）降级为
  紧凑虚线提示；**system/error**：醒目气泡；**command**：紧凑等宽命令行；处理中显示三点动画。
- 工具卡片的 name/status/duration 由 background 配对 `onCommandLine`（记开始）与 `hooks.onToolDone(tc,result)`
  （工具身份 + ok）得到；base `onToolOutput` 只带文本，未观察到的字段一律省略不伪造。
- **滚动策略**：仅当用户已在底部（阈值 24px）或刚发送时自动跟随；上滚不强制跳，显示「回到底部」。
- **流式**：base `chat()` 为单次返回、`AgentRunner.onAssistantText` 每整条回复触发一次，**无增量能力**，
  故未实现 token 流式（原 AI 助手同样没有）；以 thinking 指示承接等待态，不假装已实现。

### 11.3 量化对照（真实 dist + CDP，视口 400×900）

| 指标 | before（旧） | after（新） |
|------|------|------|
| `#log` 计算 `flex-grow` | 0 | 1 |
| `#log` 高度（有内容） | 405px = 45.0%（`45vh` 硬编码） | 589px = **65.5%**（稳态） |
| composer 底边 − 视口底 | **−64px（被挤出视口）** | +8px（= 面板 padding，贴底） |
| 工具卡片 / 可折叠 | 0（整块倾倒） | 2；长输出折叠、点击展开 |
| 水平溢出（400 / 320px） | 0 / —（纵向溢出） | 0 / 0 |

证据脚本 `/tmp/ui-redesign/shot.mjs`；截图 `/tmp/ui-redesign/{before,after}/`。

### 11.4 回归门禁

- `test/ui/journey.mjs` 新增 **#15a~#15q**（50→67 断言）：flex 填充 / 高度占比 / composer 贴底 / 三区 /
  工具卡片折叠展开 / 卡片内零 XSS / 命令块 / 错误气泡 / 无水平溢出 / 回到底部 / 320px 窄栏。
- `test/ui/binding.mjs` 新增 **#6h~#6j**（38→41）：真实绑定站点对话中，用户消息渲染为 indigo 右对齐气泡。
- `test/sidepanel.test.ts`（reducer 工具元数据/命令/trust）与 `test/sidepanel-view.test.ts`（三区静态契约、
  工具卡片样式、trust 投影）新增静态断言；`test/chat-events.test.ts` 增 command/tool 事件形状。
- 纯 node 门禁 `npm test`（插件 222）、`tsc --noEmit`、`test:hardening`（22）、`test:e2e`、`test:binding`（41）。

## 12. 自动探测与多会话（v0.9 增补）

> 作者 2026-09-12 两项架构级决策：①**自动探测**（首次授权一次，之后全自动，不引入全站静态注入）；②**多会话**（默认按域名自动共享，可手动并入会话组）。对应 spec FR-047/048、plan ADR-013/014。**不新增任何权限、不新增 LLM 工具**。

### 12.1 自动探测（FR-047 / ADR-014）

| 环节 | 实现 | 位置 |
|------|------|------|
| 声明式注入 | `authorize` 且 `hostPermissionGranted=true` → `registerContentScripts({ id:'wcliSite_<hash>', matches:['<origin>/*'], js:['content.js'], runAt:'document_idle', persistAcrossSessions:true })` | `background/content-script-registry.ts`；`service-worker.ts` case `authorize` |
| 启动对账 | SW 启动 / `onInstalled` / `permissions.onAdded·onRemoved` → 读注册表与「已授权+已获权限」集合对账，**补齐缺失·清理已撤销**；失败审计+日志 | `service-worker.ts` `reconcileContentScripts()` |
| 自上报握手 | content script 加载后 `hello{origin}`；`tab.url` 不可读时 background 发 `whoami`，content 回 `origin`（补充/回退） | `content/content-script.ts`；`service-worker.ts` case `hello` / `autoBindFromTab` |
| 未授权降级 | 未授权 origin 不注册不注入；切 tab 时**仍按 `tab.url` 切换/新建其会话**（见 §12.5），但不注入、不报错，保留点图标/「授权当前站点」回退 | `service-worker.ts` `chrome.tabs.onActivated` / `onUpdated`；`background/session-follow.ts` |
| 撤销 | `revoke` → `unregisterContentScripts`(best-effort) + 可读回执；随后 `permissions.onRemoved` 再对账 | `service-worker.ts` case `revoke` |

**权限纪律**：manifest `permissions` = `activeTab/scripting/storage/sidePanel` **+ `tabs`（FR-049，作者决策③，2026-09-12）**；`optional_host_permissions` 仍为 `http://*/*`+`https://*/*`；`host_permissions` 仍为 6 个 LLM 域名；**无静态 `content_scripts`、无全站匹配、无 `<all_urls>`**。`tabs` 仅用于插件级 `tabs` 工具（§12.4），并可由 options 页开关从 LLM 工具面移除。

### 12.2 多会话（FR-048 / ADR-013）

- **会话键派生**：默认 `sessionId = origin`；origin 属于某会话组 G 时 `sessionId = group:<G.groupId>`（纯函数 `sessionIdForOrigin`）。同域名标签页恒映射同一会话 → 共享同一份历史；不同域名天然隔离。
- **存储**：`background/session-store.ts` → `chrome.storage.local['web-cli:session-store']`，结构 `{ groups[], sessions[{ sessionId, origins[], history[], createdAt, lastActiveAt, title? }] }`；历史从对话提交时 `setHistory(currentSessionId, …)` 写入，切换会话 `chatSession.restore(historyOf(sessionId))`。历史边界沿用既有 40 turn（`boundHistory`）。
- **上限与回收**：默认 20 会话，超出按 LRU 淘汰最不活跃者并**可读披露**（侧栏 notice）。
- **分组**：侧栏「更多」→ 会话区（新建分组 / 把当前域名并入 / 切换会话）；options 页「会话分组」可移出域名 / 删除分组。**分组只共享对话，不代表互相授权**（每 origin 仍单独授权；风控按 origin）。
- **切换标签页**：`onActivated` 与 `onUpdated(complete)` 均**按 `tab.url` 驱动**（见 §12.5）→ adopt/新建该 origin 对应会话 → 广播 `session-changed` → 面板 `sessions` 重读并回显历史（不串台）；`tab.url` 不可读时才回退到 `whoami` 握手。
- **待决交互**：切换会话时若有待决 `confirm`/`ask-user` → `cancelPendingConfirm()` + `askBridge.cancelAll()`（=拒绝/取消，fail-closed）+ 可读提示（EC-019），不静默挂起。

### 12.3 回归门禁

- `npm test`：新增 `test/session-store.test.ts`（键派生/隔离/分组/上限 LRU/有界历史/持久化）、`test/content-script-registry.test.ts`（注册/对账/失败可读）、`test/auto-session-wiring.test.ts`（静态钉住自动探测/会话切换处置/权限纪律）、`test/session-view.test.ts`、`test/session-actions.test.ts`。
- `npm run test:binding`：阶段 2（#A0~#A7）真站点证明**免点图标自动绑定**（authorize→真实 `registerContentScripts`→reload 触发 hello→自动绑定+supported+工具面；whoami 切页重绑；未授权静默降级）。
- `npm run test:ui`：新增 **#16a~#16i**（会话标记/切换器/历史隔离双向/分组控件/「分组≠授权」文案）。
- `npm run test:hardening`（22）/`npm run test:e2e`（A/B）复跑 PASS。

### 12.4 标签页管理工具 `tabs` 与隐私开关（FR-049，作者决策③ 2026-09-12）

作者已同意新增 `tabs` 权限（接受 Chrome 安装提示「读取您的浏览记录」），用于**插件级**工具 `tabs`（`list` / `switch` / `open`；**明确不做 `close`**）。它是 v0.9 增补中**唯一新增**的 LLM 工具，且**不受 origin 授权门禁**（无需站点绑定即可用），但其敏感子命令仍走 policy 风险档。

| 子命令 | risk | 行为 | 使用方法 |
|--------|:----:|------|---------|
| `list` | `read`（allow） | 列出打开的标签页（id / 标题 / URL / 是否激活 / 是否已授权 / 对应会话） | `tabs list`；默认**仅 origin+path**（去 query/fragment）；`tabs list --full true` 返回完整 URL（隐私影响已在输出/文档披露） |
| `switch` | `ui`（ask） | 激活指定标签页 → 复用 `bindTab`（origin→注入→`bindOrigin`）→ **切到该 origin 的会话** | `tabs switch --id <tabId>` 或 `tabs switch --match <域名/URL 片段>`；`--id`/`--match` 二选一；受限页（`chrome://` 等）可读拒绝 |
| `open` | `write`（ask） | 打开新标签页并尽力自动绑定；确认摘要显示目标 URL | `tabs open --url <http(s) URL>`；**仅 http(s)**，`javascript:`/`data:`/`file:`/`chrome:`/`about:` 等一律可读拒绝 |

- **安全/隐私边界**：不关闭标签页（无 `close`）；不读取浏览历史（`tabs` 只覆盖已打开标签页）；不注入未授权站点；每个子命令入审计（零明文，URL 以去 query 的形式记录）。
- **隐私开关**：options 页「标签页管理（隐私）」→ **「允许助手查看/切换标签页（默认开）」**。关闭后后台经 `tabs-setting` 消息调用 `host.setTabsEnabled(false)`，`tabs` 从 `deriveTools()` 移除且派发被拒（`enabled` 语义，不静默保留）；开关状态与工具面回执可在 options 页看到。
- **实现位置**：`src/tools/tabs-tools.ts`（工具与纯逻辑）、`src/background/tabs-setting.ts`（开关存储）、`service-worker.ts` `createTabsDeps`（真实 `chrome.tabs` 调用 + 复用绑定链）、`host.ts` `setTabsEnabled`。
- **回归门禁**：`test/tabs-tools.test.ts`（子命令/risk/scheme/去 query/开关/审计）、`test/tabs-wiring.test.ts`（静态接线/权限面/无 close）、`test/ui/binding.mjs` 阶段 1 新增真实 `tabs list`/`tabs switch`（断言会话随之切换）、`test:ui` 开关与 `tabs` 结果呈现。

### 12.5 切 tab 的会话跟随行为（TASK-031 / D-128，2026-09-12 缺陷修复）

**用户故障**：切换到一个**新域名**的标签页后，不会自动新建会话（旧标签页之间可以切到已有会话）；必须重新打开插件面板才识别到当前域名。

**根因**：`chrome.tabs.onActivated` 曾以 `if (!session) return;` 早退 + 仅靠 content-script `whoami` 握手判定 `autoBindFromTab`；**新域名尚未授权 → content script 未注入 → 握手必然失败** → 走到 `markStale()`（既不新建也不切换会话）→ 面板不跟随。而面板重开时 `state`/`sessions` 走另一条路（`chrome.tabs.query` 读 URL）能恢复，故「重开才行」。根因的过时假设是「只能靠握手、不能读 URL」——但自 FR-049 起已持有 `tabs` 权限，`tab.url` 可直接读。

**修复（`background/session-follow.ts`，依赖注入、可单测）**：`onActivated` 与 `onUpdated(status==='complete')` 统一调用 `followActiveTab`：

| 当前标签页 | 行为 |
|------------|------|
| http(s) origin，**已授权** | 切换/新建该 origin 会话 + `ensureContentScript` + 触发 `reprobe` 重新发现 → 站点工具免点图标装配 |
| http(s) origin，**未授权** | **仍然切换/新建会话**（`bindOrigin`）并可读提示「尚未授权，可点【授权当前站点】」；**零注入**（自动切会话 ≠ 自动授权） |
| 同一 origin 的另一个标签页 | 复用**同一会话**（`sessionStore.activate` 幂等；LRU 仅在超限时按既有规则淘汰） |
| 受限页（`chrome://`/`chrome-extension://`/`about:`/空 URL） | **不建会话**：先试 `whoami` 握手回退，仍失败且已有绑定 → `markStale()` + 可读提示（既有降级语义，EC-011 导航失效不变） |
| 已是当前绑定（同 tab+origin 且未失效） | 幂等 no-op（不重复绑定、不刷提示） |

- **推送通道复用**：会话切换经既有 `switchSession` → `chrome.runtime.sendMessage('session-changed')`；侧栏 `sidepanel.ts` 监听后 `refreshState()`/`refreshSessions()` 重读并渲染，**无需重开面板**（面板自 TASK-025 起已监听该推送，本轮补齐 URL 驱动路径使其真正被触发）。
- **早退/死路移除**：删除 `if (!session) return;`（无会话首次 activate 也建会话）与「可读新域名落入 `markStale`」的分支；`autoBindFromTab`（whoami）保留，仅在 `tab.url` 不可读时作补充/回退。
- **导航失效不回归**：`onUpdated(status==='loading')` 的 `markNavigated()` + 清 descriptor + `resetChatSession` + `persistSession` 原样保留（EC-011）。
- **权限/依赖零变**：`tabs` 权限早已持有；无新权限、无新依赖、`manifest.json` 零改动、base 零改动。

**回归门禁**：`test/session-follow.test.ts`（10 用例：未授权新域名建会话+推送+零注入 / 已授权注入+发现 / 同 origin 复用 / 受限不建会话 / `onUpdated(complete)` 新域名 / 无会话首次 activate / 幂等 / 握手回退 / 注入失败可读）；`test:ui` 新增 **#16j~#16o**（真实 dist：创建新域名 tab → 已打开面板自动更新，零注入）；`test:binding` 阶段 1 **#20a~#20f** 与阶段 2 **#A6/A6b/A6c**（真站点 + 真扩展：切到新域名 tab → 会话自动切换且面板更新、未授权零注入、静默不抛错），既有 96 断言保留（#A6 由「未授权 markStale」更新为新语义）。

## 13. 能力对账与豁免流程（FR-051 / TASK-029）

### 13.1 为什么需要「机器化对账门禁」

2026-09 作者实测发现：插件 `web-cli-help` 只列出 10 个工具，而原内置助手的**完整命令面（DOM 操作、浏览器截图等）全部丢失**。既有测试之所以没抓到，是因为它们只断言**插件自身内部行为**（单测 / UI / 绑定），而 `docs/capability-matrix.md` 是**手写表格、无任何测试执行** → 基线 ↔ 插件的工具面静默漂移。

根治办法：把「基线工具面 ↔ 插件工具面」变成**可执行门禁**。

### 13.2 门禁组成

| 组件 | 作用 |
|------|------|
| `test/parity/baseline-catalog.json` | 机器可读的**基线工具目录**（34 工具 / 142 子命令），带 provenance（main SHA + 提取脚本 + 时间） |
| `test/parity/extract-baseline-catalog.mjs` | 可重跑的**提取脚本**（读 `main` 的 `packages/lgdl-web/src/ai/session.ts` 注册矩阵 + 真实工厂 schema；含「新工厂未登记即失败」防漂移守卫） |
| `test/parity/waivers.json` | 逐项**豁免登记**（理由 + 依据 spec/FR/ADR + 是否待实施 + 待批准权限）；另含 `pluginExtras`（插件新增的面向 LLM 的工具，必须登记） |
| `test/parity.test.ts` | 门禁本体：**双向**断言 + 子命令级核对 + 失败可读（直接列出缺失项与修复指引） |

### 13.3 如何复现基线目录（只读，永不碰 main）

```bash
TS=$(date +%s)
git clone --branch main --single-branch /path/to/LGDL /tmp/lgdl-baseline-$TS
node packages/web-cli-plugin/test/parity/extract-baseline-catalog.mjs \
  --baseline /tmp/lgdl-baseline-$TS \
  --out packages/web-cli-plugin/test/parity/baseline-catalog.json
```

> 克隆为独立临时目录，只读；不 checkout/commit/push main，也不改动本仓工作区。

### 13.4 新增工具的流程

1. 在 `src/tools/*.ts` 实现（`group` + 扁平合法名 `^[a-zA-Z0-9_-]+$` + risk 档 + 走 `router.dispatch` + 可读失败 + 入审计）。
2. 在 `host.ts` 接线并让它在 `deriveTools()` 中可达。
3. **若它不是基线同名工具** → 在 `test/parity/waivers.json` 的 `pluginExtras` 登记（理由 + 依据），否则 `test/parity.test.ts` 失败（防未登记的工具）。
4. 为它写单测；涉及浏览器能力的补 `test:e2e` 真机断言。

### 13.5 登记豁免的流程

基线工具**本轮不实现**时，在 `test/parity/waivers.json` 的 `waivers` 加一条，字段必须齐全：

| 字段 | 含义 |
|------|------|
| `status` | `mapped` / `not-applicable` / `delegated` / `pending-permission` / `baseline-disabled` |
| `reason` | 可读理由（面向上级/用户） |
| `basis` | 依据（spec FR / plan ADR / 基线 enabled 位） |
| `providedAs` | `mapped` 时：插件中实际承载该能力的工具名（如 `site_lgdl-web-cli`） |
| `permission` + `pending:true` | `pending-permission` 时：需要什么权限、本轮**只报告不实施** |

删除/变更基线工具时，过期豁免会因 `test/parity.test.ts` 的「无过期豁免」断言失败，必须同步复核。

### 13.6 本轮补齐的浏览器能力（FR-051）

`dom`（30 子命令）、`chrome`（print/back/forward/reload/**screenshot**）、`wait`、`extract`、`export`、`save`、`events`（经既有 content 事件桥，subscribe/pull/unsubscribe/status 真实可用，其余可读「暂不支持」）、`web-search`（未配置端点时可读禁用态）已接入 `deriveTools()`。实现方式：content script 用 base `createBrowserDomOps()` 在**页面隔离世界**提供真实 DOM 能力，background 经 `dom-op` 消息做远程代理；截图/导出落盘走**页面上下文 anchor 下载链**（无需 `downloads` 权限）。

- 风险档沿用 base（未放宽）：`dom` 只读子命令 `read`（免确认）、UI 子命令 `ui`（确认）、`chrome reload/screenshot` `write`（确认）。
- **无新权限**：复用 `activeTab` / `scripting` / `tabs`；未新增 `downloads` / `notifications` / `clipboardWrite` 等。
- 真机验证：`test:e2e` 新增 `dom read-state`、`dom click`、`chrome screenshot` 三条真实页面全链断言。

## 14. 自动授权（按站点读/写；FR-052 / ADR-017）

### 14.1 如何工作（在 `onAsk` 接缝前置判定，不放宽 `riskDefaults`）

```
router.dispatch → PermissionGate.check
  ① allowed-tools → ② 规则集 → ③ 策略链 S1/S2/S3 → ④ riskDefaults
  → 若最终 action = ask → ⑤ onAsk 接缝
        ├─ 自动授权前置判定（host.ts autoOnAsk）
        │    origin + tier 已开启 且 非破坏性 read/write → 直接 allow（审计 auto-authorize）
        │    evaluate / 未知 risk → 直接 deny（硬底线，硬编码在 decideAutoAuthorization）
        │    其它（未开启 / 破坏性 / ui·state·external）→ 落到人工确认
        └─ createConfirmBridge → 侧栏二次确认（超时/取消 = deny）
```

- **设置模型**：`security/auto-authorize.ts` 的 `createAutoAuthStore`，按 origin 持久化 `{ read: boolean（默认 true）, write: boolean（默认 false） }`（存储键 `web-cli:auto-auth`，经 `chrome.storage.local`）。`isEnabled(origin, tier)` 同步读内存缓存，故开关**即时生效**。
- **破坏性判定**：`tools/declared-tools.ts` `isDestructiveInvocation(decl, subcommand)` —— 把工具 id 与**被调用子命令**都按 `[._:/-]` 切段后逐段比对 `DESTRUCTIVE_VERBS`（能抓住 `add-node` / `remove-node` 这类连字符子命令）。host 在 `activateSite` 时建立「扁平工具名 → 声明」映射，判定**来自插件真值，绝不猜测**；映射缺失（未知工具）一律按破坏性处理（fail-closed）。
- **红线不变**：S1（未授权）/ S3（未知 risk）在策略链即 `deny`，不产生 `ask`；`evaluate` 档由 `decideAutoAuthorization` 直接 `hardDeny`。`base` 零改动。

### 14.2 如何审计（可辨，不与人工确认混淆）

审计事件类型 `auto-authorize`（在 `security/audit-sink.ts` 的 `PluginAuditEventType` 中独立登记）：

| 事件 | decision | 关键字段 | 含义 |
|------|----------|----------|------|
| 因自动授权放行 | `allow` | `origin`、`tool`、`subcommand`、`risk`、`reason`（含「自动授权（用户设置）」） | 未经人工二次确认，被用户设置收敛为放行 |
| 硬底线拦截 | `deny` | `risk`（evaluate/未知）、`reason` | 自动授权前置判定直接拒绝 |
| 设置变更 | `enabled` / `disabled` | `origin`、`risk`（tier）、`reason` | 用户开启/关闭/一键关闭自动授权 |

侧栏「查看审计」/ `audit-export` 消息可导出全部记录；人工确认仍是类型 `confirm`、`detail: 用户确认放行`。`test/auto-authorize.test.ts` 断言「放行写入 `auto-authorize`/`allow`」「破坏性调用不产生 `auto-authorize`/`allow`」。

### 14.3 UI 位置

- **侧栏**「知情同意与能力边界」区：两个复选框（读/写）+ 常驻标记 `#auto-auth-badge`（开启时显示 `⚡ 自动授权：读` / `读+写`，点击一键关闭）+ 常显硬底线文案 `#auto-auth-note`。控件作用于**当前站点 origin**，无活跃站点时禁用。
- **options 页**「自动授权（按站点）」区：列出已显式设置的 origin 及其读/写状态，可逐项开关或整体关闭；文案同样常显硬底线。

### 14.4 回归门禁

- `test/auto-authorize.test.ts`（13 用例）：4 条硬底线（破坏性仍 ask、evaluate 仍 deny、未授权仍 deny、未知 risk 仍 deny）+ read 零回归 + 按 origin 隔离/持久化 + 即时关闭 + 审计可辨。
- `test:ui`（113）：侧栏复选框默认值/常驻标记/一键关闭/持久化 + 硬底线文案；options 管理列表。
- `test:binding`（96）：真实站点上「开启写自动 → 非破坏性写档免确认直接执行」「破坏性 `remove-node` 仍弹确认」「关闭 → 立即恢复确认」。

## 15. 全自动探测与有界退避重试（TASK-032）

旧行为：`unknown`（探测未完成 / 失败）时侧栏显示「未知状态 + 重新探测」**手动按钮**，用户必须先点一下才会重新探测。这与「发现站点」应当是自动的相矛盾。本版改为**全自动探测**，移除手动入口。

### 15.1 触发时机（全部幂等、按 origin 去重）

| # | 触发 | 代码位置 | 语义 |
|---|------|----------|------|
| 1 | 面板打开 / 绑定站点 | `state` 消息处理 → `focusBoundProbe()` | 面板 `state` 请求即「面板关注该 origin」 |
| 2 | 切 tab 到该 origin | `tabs.onActivated` → `session-follow` → `kickDiscovery` | 新信号，重置退避立即探测 |
| 3 | 导航完成 | `tabs.onUpdated(complete)` → 同路径 | 同上 |
| 4 | content script `hello` / host 重连 | `hello` 消息处理 | 同上 |
| 5 | 失败后自动重试 | `auto-probe` 内部定时器 | 有界退避 |
| 6 | 授权 | `authorize` 消息处理 | 授权后才可注入，授权即探测 |

同一 origin 的探测**进行中去重**（`inFlight` 不重复发起），不会并发风暴。

### 15.2 退避策略（有界）

失败 → 自动重试，退避 `500ms → 1s → 2s → 4s → 8s`，之后**封顶 15s 稳态**继续（`src/discovery/auto-probe.ts`：`BACKOFF_MS` / `BACKOFF_CAP_MS` / `delayForRetry()`）。

- **成功** → 立即停止重试，进入 `ready`。
- **origin 变更** → 丢弃旧 origin 的在途结果，旧重试作废。
- **面板关闭** → 端口断开，`setFocused(false)` 停止重试（**不做后台常驻轮询**）。
- **站点撤销** → `autoProbe.stop()` 忘记目标并取消定时器。
- 仅在「有面板关注该 origin」或「该 origin 为当前绑定」时重试。

### 15.3 暂时性 vs 终态（可读且可执行）

- **暂时性**（页面未就绪 / content script 未响应 / host 未接入 / 网络不可达）→ 文案 `正在自动探测…（第 N 次重试）` + 最近原因，**继续自动重试**。
- **终态**（缺少 `/.well-known/web-cli.json` / 声明 JSON 无效 / **协议版本不匹配**）→ 文案精确指出问题与站点侧需修什么，并说明「站点修复 / 刷新 / 切换标签页会自动重试，插件也会每 15 秒低频软重试」，**不再要求用户点重试**。
- 内部状态机术语（原始 `phase` 名）**不**直接展示给用户。

### 15.4 边界（不回归）

- 自动探测 **≠** 自动授权：未授权站点 `auto-probe` 直接 `blocked`，**零注入**、不执行站点工具。
- 已授权站点免点图标自动发现（FR-047/048）不变。
- 探测失败**不报错刷屏**：可读降级 + 静默有界重试。
- 无新权限、无新依赖、`base` 零改动、`manifest.json` 零改动。

### 15.5 回归门禁

- `test/auto-probe.test.ts`（13 用例）：退避序列 `500/1s/2s/4s/8s→15s` 封顶 / 成功即停 / origin 变更即停并丢弃在途结果 / 并发去重 / 暂时性 vs 终态分类 / 未授权零重试 / `stop` 取消定时器 / 面板关闭停止重试 / 出界成功上报即停。
- `test:ui`（119→121）：无手动「重新探测」按钮 + 探测说明不含手动重试文案。
- `test:hardening`（22→24）：未声明协议文案改为自动重试（无手动入口）+ unknown 终态文案可读。
- `test:binding`（104→114，新增阶段 3）：本地延迟就绪站点（前 3 次 `/.well-known/web-cli.json` 返回 503）→ 失败后自动进入退避重试（`nextDelayMs ≥ 500`）→ 站点就绪后**零点击**自动 `supported` + 工具面装配；阶段内 0 未捕获异常。

## 16. 变更记录

| 版本 | 说明 |
|------|------|
| 1.0 | 首版：构建 / unpacked 加载 / 调试 / 热重载 / 冒烟方法论（无头可行性结论 + 机械面/人工面分离）。 |
| 1.1 | 补 §8 性能与上下文预算（NFR-007 量化阈值 + 实测，D-028）；冒烟清单新增 P1 机械面 M18~M23 与人工面 H8~H10 引用。 |
| 1.2 | TASK-017 UI 修复：补 §3.1 首次使用（配置与授权顺序）+ §3.2 面板/设置页导航；侧栏新增设置入口 / LLM 状态 / 状态驱动引导 / 日志空态 / 知情同意折叠，options 页新增使用说明与未配置提示。 |
| 1.3 | TASK-018：补 §9 UI 旅程测试（`npm run test:ui`，真实 dist + 真实键入/点击）；options 保存链路加 try/catch 可读失败 + 空 Key 明确提示 + 配置摘要回显；新增「测试连接」（background 最小真实请求 + 可读分类）。 |
| 1.4 | TASK-019：补 §10 诊断与常见问题（非扩展上下文守卫 / 站点未声明协议说明 / 未重载扩展构建不一致）+ 「配置保存不了怎么办 / 站点用不了是正常的 / 改了代码要重新加载扩展」三问；新增 `npm run test:hardening` 实证探针。 |
| 1.5 | TASK-020（用户实测反馈第三轮）：修复「保存成功却像失败」（保存后不再把 Key 框显示为空框——改 placeholder + `#key-state`=Key ✅ 已写入 + 成功色/高亮 + 摘要），侧栏 LLM 行补 `Key ✅/⚠未配置`；「无活跃站点」拆成具体原因 + 下一步动作并新增「重新绑定当前标签页」按钮，发送禁用原因就近可见；侧栏新增「测试连接」（复用 `llm-test`，读取已保存配置）；补 §10.4/§10.5 两问；`test:ui` 25→41 断言。 |
| 1.6 | 站点绑定链路缺陷修复（用户实测：配置正常、站点正确却恒「无活跃站点」）：根因 = `setPanelBehavior({openPanelOnActionClick:true})` 吞掉 `action.onClicked` 使绑定成死代码 + 无 `tabs`/host 权限时 `tab.url` 为 `undefined` 被误报成「没有可读取的地址」。改为 `openPanelOnActionClick:false` + 点击处理内 `bindTab` 后同手势 `sidePanel.open`；`optional_host_permissions` 补 `http://*/*`、`minimum_chrome_version` 114→116；新增 `tabs.onActivated` 标签页切换失效提示；错误文案改为指向「点插件图标」；补 §10.6 与 §3/§3.1/§3.2/§10.5；新增 `npm run test:binding`（真站点全链 33 断言）。 |
| 1.7 | 工具名非法字符缺陷修复（用户实测：`400 Invalid 'tools[0].function.name'`）：站点/管理工具改为扁平无点 `site_*` / `admin_*`（`namespace:''`，`group` 不变），策略链判据改 `group==='site'`；RPC 仍用原始 id；碰撞确定性加后缀并审计；`AgentRunner` 重试导致的重复错误改为「重试提示 + 单条 error」。补 §10.7；`test:binding` 扩展为捕获真实 LLM `tools` 并断言合法。 |
| 1.8 | TASK-022（用户实测第六轮）：侧栏消息从纯文本改为「角色标签 + 内容区」分组块；assistant 走**零依赖、无 HTML 解析**的安全 Markdown 渲染（标题/列表/引用/行内/围栏代码/GFM 表格/仅 http(s) 链接），tool/system 保持等宽 `pre-wrap`，user 纯文本；新增 `src/ui/sidepanel/markdown.ts` + `test/markdown.test.ts`（12 用例），`test:ui` 41→50 断言（#14a~#14i），补 §10.8。 |
| 1.9 | TASK-023（用户实测第七轮，整体 UI/UX 重做）：先读回原 AI 助手（git 历史）作设计基准；侧栏改**三区 flex 全高**（`#log` 去 `45vh` 改 flex 填充、composer 为末元素贴底、8 按钮收为「主操作 + 〈更多〉`<details>`」）；消息改角色气泡（user indigo 右对齐 / assistant Markdown / tool **可折叠卡片** / system·error 醒目 / command 紧凑块 / thinking 三点 / 「回到底部」跟随策略）；明暗适配 tokens；零新依赖、无框架、无 `innerHTML`、MV3 CSP 合规。补 §11；`test:ui` 50→67（#15a~#15q）、`test:binding` 38→41（#6h~#6j 用户气泡）、插件 209→222、全仓 0 fail（base 483 零回归）。**流式如实未实现（base 无增量能力，原助手亦无）**。 |
| 2.0 | **v0.9 增补（FR-047/048 / ADR-013/014）**：①自动探测——`authorize` 后声明式注入 + 自上报自动握手（免点图标）+ 启动对账；未授权站点静默降级；权限面零新增。②多会话——`session-store.ts` 按 origin/会话组派生会话键，每会话独立 40-turn 有界历史，上限 20 + LRU 可读披露；切换标签页/会话自动 adopt 并回显（不串台）；切换时待决 confirm/ask 明确取消（EC-019）。补 §3/§3.1/§10.5/§10.6 与 §12；`test:ui` 70→79（#16a~#16i）、`test:binding` 44→58（阶段 2 #A0~#A7）、插件 229→262、全仓 0 fail（base 483 零回归）、`test:hardening` 22、`test:e2e` A/B PASS；无 `<all_urls>`/无 `tabs`/无新依赖/base 零改动。 |
| 2.1 | **FR-049（作者决策③ 2026-09-12）**：新增 `tabs` 权限与插件级标签页管理工具 `tabs`（list/switch/open，**不含 close**）；list 隐私默认去 query/fragment（`--full` 显式）；switch 复用绑定链并切会话；open 仅 http(s)；options 新增隐私开关（关闭即从工具面移除）；补 §12.4 + 更新 §3.1/§12.1 权限纪律；`tabs-tools.test.ts` / `tabs-wiring.test.ts` + `test:binding` 新增真实 `tabs list`/`tabs switch`。 |
| 2.2 | **TASK-028（作者要求）**：移除侧栏独立「测试连接」按钮（options 页保留）；侧栏**每次加载自动**测试当前模型配置并在 `#llm-test-result` 展示可读状态（复用既有 `llm-test`，不新增请求路径）；background 新增 60s TTL **内存**缓存（`src/llm/test-cache.ts`，指纹 = 厂商+模型+Base URL+Key 的不可逆哈希，仅内存比较、不落盘/日志/审计）——命中直接返回原结果（含原耗时）不发请求，配置变更/TTL 过期即失效；未配置零请求。补 §10.10 + 更新 §9/§10.5/§11.1；`test:ui` 87→97（#12~#12m）、`test:binding` 81→83（#6-1/#6-2）、新增 `test-cache.test.ts`（6 用例）；插件 309→315。 |
| 2.3 | **TASK-029 / FR-051（作者实测：DOM 操作 / 浏览器截图等命令全部丢失）**：建立**机器化对账门禁**（`test/parity/`：baseline-catalog.json + extract 脚本 + waivers.json + parity.test.ts，双向 + 子命令级）；按基线补齐**无新权限**的浏览器能力 `dom` / `chrome`（含 screenshot）/ `wait` / `extract` / `export` / `save` / `events` / `web-search`（content 隔离世界真实现 DOM + background 远程代理 + 页面上下文 anchor 下载链）；补 §13；新增 `test/parity.test.ts`（8）+ `test/browser-tools.test.ts`（13），`test:e2e` 新增 dom/chrome 三条真机断言；插件 315→336，全仓 0 fail（base 483 零回归）、无新权限/依赖、base 零改动。 |
| 2.4 | **FR-052 / ADR-017（作者要求：自动授权多选）**：新增按 origin 的「读操作自动 / 写操作自动」设置（`security/auto-authorize.ts`，存 `web-cli:auto-auth`，读默认开/写默认关，即时生效）；在 host `onAsk` 接缝**前置判定**——对应档位开启且非破坏性 read/write → 直接 allow（审计类型 `auto-authorize`/`reason: 自动授权（用户设置）`），不放宽 `riskDefaults`；`evaluate`（fail-closed 直接 deny）/ 未授权 origin（S1 deny）/ 未知 risk（S3 deny）/ 破坏性操作（`isDestructiveInvocation` 子命令分段判定）/ `ui·state·external` 仍保持确认或拒绝；侧栏新增复选框 + 常驻标记 + 一键关闭 + 硬底线常显文案，options 页新增按站点管理列表。补 §14 + §10（compliance）；新增 `test/auto-authorize.test.ts`（13）；`test:ui` 97→113、`test:binding` 83→96；插件 336→349，全仓 0 fail（base 483 零回归）、无新权限/依赖、manifest 零 diff、base 零改动。 |
| 2.5 | **TASK-032（用户要求：探测改为全自动，逻辑上不需要用户手动探测）**：移除侧栏「重新探测」按钮；新增 `src/discovery/auto-probe.ts`（按 origin 去重 + 有界退避 500ms→1s→2s→4s→8s→15s 封顶 + 成功/origin 变更/面板关闭/撤销停止 + 暂时性/终态分类）；触发点 = 面板打开(`state`) / `tabs.onActivated` / `tabs.onUpdated(complete)` / content `hello` / 授权 / 失败重试；面板通过 `chrome.runtime.connect('web-cli-panel')` 让后台感知「有面板关注」，关闭即停重试（无后台常驻轮询）。补 §15；新增 `test/auto-probe.test.ts`（13）；`test:ui` 119→121、`test:hardening` 22→24、`test:binding` 104→114（阶段 3 延迟就绪 + 退避 + 零点击自动 ready）；插件 360→373，全仓 0 fail（base 483 零回归）、**base 零改动 / manifest 零 diff / 无新依赖 / 无新权限**。 |

