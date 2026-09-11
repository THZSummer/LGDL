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

## 9. 变更记录

| 版本 | 说明 |
|------|------|
| 1.0 | 首版：构建 / unpacked 加载 / 调试 / 热重载 / 冒烟方法论（无头可行性结论 + 机械面/人工面分离）。 |
| 1.1 | 补 §8 性能与上下文预算（NFR-007 量化阈值 + 实测，D-028）；冒烟清单新增 P1 机械面 M18~M23 与人工面 H8~H10 引用。 |
