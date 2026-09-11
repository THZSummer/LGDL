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

## 8. 变更记录

| 版本 | 说明 |
|------|------|
| 1.0 | 首版：构建 / unpacked 加载 / 调试 / 热重载 / 冒烟方法论（无头可行性结论 + 机械面/人工面分离）。 |
