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
4. 打开目标站点 → 点击工具栏插件图标（用户手势）→ side panel 打开 → 授权当前站点。
5. 若需站点事件通道：在 side panel 触发事件订阅后才会安装观察源（默认关 / 零常驻）。

> 首次授权会请求该 origin 的可选 host 权限；拒绝则回退 `activeTab`（仍可用，但后台特权 fetch 能力受限）。

### 3.1 首次使用（配置与授权顺序）

侧栏的首次使用引导是**状态驱动**的（未配置模型时只强调第 1 步；已配置未授权时强调授权），推荐顺序：

1. **配置模型**：侧栏顶部「配置模型 / 设置」按钮 → options 页选择厂商、填入 API Key 并保存（BYOK，仅存 `chrome.storage.local`，不回显明文）。
2. **打开目标站点**：打开声明了 web-cli 协议的站点标签页（本仓库的 LGDL Web 即一个实例站点）。
3. **点击插件图标**：让插件绑定并发现当前站点（`activeTab` 手势）。
4. **授权当前站点**：在侧栏点击「授权当前站点」，确认知情同意与可选站点权限。
5. **输入指令**：在底部输入框发送，开始对话。

侧栏顶部会显示当前 LLM 状态（`未配置` / `厂商 · 模型`）；未配置时按钮变为「去配置模型」并以醒目提示引导。状态来自 background 的 `llm-status` 消息，只返回 `{configured, providerId, providerName, model}` 摘要，**绝不回传 API Key 明文**。

### 3.2 面板 / 设置页导航

| 目标 | 入口 |
|------|------|
| 侧栏（会话/授权/确认/审计/风控） | 点击工具栏插件图标（`openPanelOnActionClick`）；或 `chrome://extensions` → 插件「详情」→「扩展程序选项」旁无侧栏入口时用图标 |
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
| 审计 | side panel「查看审计」或 `plugin.audit-export`（零明文） |
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
  发现 `site.lgdl-web-cli` → 授权 → `lgdl-web-cli status` 读全链返回图内容 → 审计。

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

覆盖的旅程与断言（41 项，失败即非零退出并打印页面异常 / console error）：

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
11. 侧栏「测试连接」真实点击 → 复用 `llm-test`（读取已保存配置）→ 可读成功结果（含 `ms`）；
12. options 页与侧栏页各 0 未捕获异常、0 console error。

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
| 当前标签页是 `chrome://` / 扩展页 / 应用商店等受限页 | 「当前标签页不可注入（…）」 | 切换到目标站点标签页 → 点工具栏插件图标；或点侧栏「**重新绑定当前标签页**」 |
| 已打开 http(s) 站点但尚未绑定（未点图标 / 扩展刚重载） | 「当前站点尚未绑定（https://…）」 | 点工具栏插件图标，或点「**重新绑定当前标签页**」 |
| 没有可用标签页 | 「没有可用标签页」 | 打开目标站点标签页后再点插件图标 |
| 已在目标站点但发现态非 `supported` | 由 `#discovery-notice` 说明（未声明 = 设计如此非故障；未知 = 可读原因 + 「重新探测」） | 按提示「重新探测」或换到声明了协议的站点 |
| 上一条指令仍在处理 | 「发送已禁用：上一条指令仍在处理中」 | 等当前轮结束 |

侧栏顶部同时提供「**测试连接**」（无需打开 options，复用已保存配置），结果在侧栏内可读展示。

## 11. 变更记录

| 版本 | 说明 |
|------|------|
| 1.0 | 首版：构建 / unpacked 加载 / 调试 / 热重载 / 冒烟方法论（无头可行性结论 + 机械面/人工面分离）。 |
| 1.1 | 补 §8 性能与上下文预算（NFR-007 量化阈值 + 实测，D-028）；冒烟清单新增 P1 机械面 M18~M23 与人工面 H8~H10 引用。 |
| 1.2 | TASK-017 UI 修复：补 §3.1 首次使用（配置与授权顺序）+ §3.2 面板/设置页导航；侧栏新增设置入口 / LLM 状态 / 状态驱动引导 / 日志空态 / 知情同意折叠，options 页新增使用说明与未配置提示。 |
| 1.3 | TASK-018：补 §9 UI 旅程测试（`npm run test:ui`，真实 dist + 真实键入/点击）；options 保存链路加 try/catch 可读失败 + 空 Key 明确提示 + 配置摘要回显；新增「测试连接」（background 最小真实请求 + 可读分类）。 |
| 1.4 | TASK-019：补 §10 诊断与常见问题（非扩展上下文守卫 / 站点未声明协议说明 / 未重载扩展构建不一致）+ 「配置保存不了怎么办 / 站点用不了是正常的 / 改了代码要重新加载扩展」三问；新增 `npm run test:hardening` 实证探针。 |
| 1.5 | TASK-020（用户实测反馈第三轮）：修复「保存成功却像失败」（保存后不再把 Key 框显示为空框——改 placeholder + `#key-state`=Key ✅ 已写入 + 成功色/高亮 + 摘要），侧栏 LLM 行补 `Key ✅/⚠未配置`；「无活跃站点」拆成具体原因 + 下一步动作并新增「重新绑定当前标签页」按钮，发送禁用原因就近可见；侧栏新增「测试连接」（复用 `llm-test`，读取已保存配置）；补 §10.4/§10.5 两问；`test:ui` 25→41 断言。 |

