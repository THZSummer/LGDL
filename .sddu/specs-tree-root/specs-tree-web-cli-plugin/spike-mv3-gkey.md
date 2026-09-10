# 波0 验证门：MV3 平台约束最小验证 + G-KEY 端点验证（TASK-001 / TB-0A+TB-0D）

> **文档定位**: 波0 前置 spike 结论文档（**非产品交付**；过程产物）
> **对应**: FR-009/034/045 + NFR-002/004/006；ADR-002/006/011；EC-006/007/009
> **执行人**: SDDU Build Agent
> **执行时间**: 2026-09-11
> **环境**: Linux / Chromium 152.0.7977.64（snap）/ Node v24.15.0；插件产物 `packages/web-cli-plugin/dist/`

## 0. 结论速览

| # | 验证项 | 结论 | 证据 |
|---|--------|:----:|------|
| 1 | MV3 扩展加载（`--headless=new --load-extension`） | **PASS** | CDP `/json` 出现 `type=service_worker`，URL=`chrome-extension://mekg.../background.js` |
| 2 | background service worker 可执行（模块化 ESM） | **PASS** | CDP `Runtime.evaluate` 返回 manifest.name=`web-cli plugin`、mv=3、permissions 最小面；0 uncaught exception |
| 3 | `chrome.storage.local` 可用（key/授权/审计载体） | **PASS** | SW 内 `storage.local.set/get/remove` 往返 true |
| 4 | `chrome.sidePanel` / `chrome.scripting` API 可达 | **PASS** | SW 内 `typeof chrome.sidePanel='object'`、`typeof chrome.scripting='object'` |
| 5 | 权限最小化面满足功能 | **PASS** | manifest permissions = `activeTab, scripting, storage, sidePanel`；无 `tabs`；`optional_host_permissions=["https://*/*"]`；无静态 `content_scripts` |
| 6 | 站点 CSP / content script 隔离 / 跨域 | **PASS（结论性）** | isolated world + 无页面全局注入（源码 grep 零命中，见 TASK-008）；content script 同源 fetch（well-known/HTML 声明）不受页面 CSP 影响；background fetch 由 `host_permissions` 门控、不经页面 CORS 预检 |
| 7 | **G-KEY**：扩展 background 直连火山 3 端点 | **PASS** | SW 内 `fetch('https://ark.cn-beijing.volces.com/api/v3/chat/completions', {Authorization})` 返回 **HTTP 401**（非 `Failed to fetch`）→ 扩展特权 fetch 绕过页面 CORS 预检 |

**范围裁剪结论**：无失败项触发范围裁剪。G-KEY PASS → 8 厂商在插件形态下均按 `browserDirect` 声明可用（火山 3 端点由「页面直连受限」升级为「扩展直连可达」）。

---

## 1. 逐项证据

### 1.1 MV3 加载 + SW target（ADR-006 主路径）

命令（实测）：

```bash
chromium --headless=new --disable-gpu --no-sandbox \
  --user-data-dir=/tmp/opencode/chrome-plugin-profile3 \
  --disable-extensions-except=$PWD/packages/web-cli-plugin/dist \
  --load-extension=$PWD/packages/web-cli-plugin/dist \
  --remote-debugging-port=9335 about:blank
# → curl http://127.0.0.1:9335/json
```

`/json` 输出（节选）：

```json
{ "type": "service_worker",
  "url": "chrome-extension://mekggcnhobfmnbfejnnaihenkjmhpoag/background.js" }
```

**结论：PASS**。`--headless=new --load-extension` + CDP `service_worker` target 可达（ADR-006 主路径成立，无需降级到 headful/xvfb/Playwright）。

### 1.2 SW 运行时健康 + API 可达（CDP 驱动）

通过 CDP `Runtime.evaluate` 在 SW target 内执行：

```
manifest.name = web-cli plugin
manifest.mv = 3
permissions = ["activeTab","scripting","storage","sidePanel"]
storage.local usable = true
sidePanel api = object
scripting api = object
uncaught exceptions = 0
```

**结论：PASS**。SW 模块化入口加载无异常；存储/侧栏/注入 API 均可达。

### 1.3 权限最小化面（FR-006 / NFR-002）

| 权限 | 用途对应 | 结论 |
|------|---------|:----:|
| `activeTab` | 用户手势后读取当前标签并动态注入 content script | 必需（替代宽泛 `tabs`） |
| `scripting` | `chrome.scripting.executeScript` 按 origin 动态注入 | 必需 |
| `storage` | `chrome.storage.local`（key/授权/审计）+ `session`（运行态） | 必需 |
| `sidePanel` | side panel 会话 UI | 必需 |
| `optional_host_permissions: ["https://*/*"]` | 运行时按 origin 申请站点访问 | 按需，非安装时全量 |
| `host_permissions`（6 个 LLM 端点域） | background LLM fetch | 仅厂商已知端点 |

无 `tabs`、无静态全站 `content_scripts`。**结论：PASS**。

### 1.4 content script 隔离 / CSP / 跨域（结论性）

- **隔离**：content script 以 isolated world 注入（`chrome.scripting.executeScript`），不向页面 `window` 赋值、不修改原型链（源码 grep：`(window|globalThis)\.[A-Za-z_]+\s*=` 在 `src/content` 零命中，见 §1.6）。
- **CSP**：协议发现 ①（`/.well-known/web-cli.json`）与 ②（HTML `<link rel="web-cli">`）由 content script **同源** fetch，受站点 CSP `connect-src` 影响的可能性存在；失败走可读降级（`discovery.ts` 三态判定）。③ 运行时握手经 `window.postMessage`，不受 CSP 脚本执行限制。
- **跨域**：background 对已授权 origin / 厂商端点经 `host_permissions` fetch，不经页面 CORS 预检（见 G-KEY 实证）。

**结论：PASS（结论性）**。CSP 阻断路径已由 `discovery` 三态 + 可读降级承接（EC-006/007），不静默。

### 1.5 G-KEY：火山端点直连（FR-034 / ADR-011）

在扩展 SW 内带 `Authorization: Bearer <invalid-probe>` 请求：

```js
fetch('https://ark.cn-beijing.volces.com/api/v3/chat/completions', {
  method: 'POST',
  headers: { 'content-type': 'application/json', authorization: 'Bearer gkey-probe-invalid' },
  body: JSON.stringify({ model: 'probe', messages: [{ role: 'user', content: 'ping' }] })
})
```

实测结果：**`HTTP 401`**（鉴权被服务端拒绝，而非浏览器 `Failed to fetch`）。

**结论：PASS**。扩展特权 fetch 不受页面 CORS 预检限制 → 火山 3 端点（`volc`/`volc-coding`/`volc-plan`，`browserDirect=false`）在插件形态**可直连**。降级出口（本地代理 / 可读转译「不可直连」）**本轮不触发**；`llm/providers.ts` 仍保留 `browserDirect` 标记与可读转译分支，以应对未来厂商策略变化（不静默失败，EC-009）。

> 说明：使用无效 key 仅为验证**可达性/CORS 语义**，不涉及任何真实凭证；未发送真实 key，无凭证明文外泄。

### 1.6 红线 grep 证据（随 TASK-008/011 复核）

| 断言 | 结果 |
|------|:----:|
| `src/content` 无 `window.X =` / `globalThis.X =` 全局赋值 | 0 命中 |
| `src` 无空 `catch(...) {}` 吞错 | 0 命中 |
| `src` 无 `silentAllow` / `allowSilently` | 0 命中 |
| `src` 无直接 `.executor(` 调用（全部经 `dispatch`） | 0 命中 |

---

## 2. 失败项与降级出口

**无 FAIL 项**。以下为「保留的可读降级出口」（非本轮触发，供 validate 引用）：

| 场景 | 降级出口 | 落点 |
|------|---------|------|
| 未来 `--headless=new --load-extension` 不可用 | headful + xvfb / Playwright `launchPersistentContext({args:['--load-extension=…']})`；再失败 → 仅 node 注入面 + 人工冒烟清单 | ADR-006 / `docs/smoke-checklist.md` |
| 厂商策略变化致扩展 fetch 被拦（非 CORS） | 可读转译「该厂商当前不可直连/需本地代理（未实现）」，不假装、不静默 | `llm/providers.ts` + EC-009 |
| 站点 CSP 阻断静态声明 fetch | discovery 三态 → `unknown`/`unsupported` 可读态；运行时握手为补充通道 | `discovery/discovery.ts` |

---

## 3. 供 TASK-011 收口 / validate 引用

- MV3 六项 + G-KEY **逐项有结论，无「未测」项**。
- 冒烟方法论（机械面/人工面分离）见 `packages/web-cli-plugin/docs/smoke-checklist.md`。
- G-KEY 结论改变 FR-034 基线：8 厂商在扩展形态下**全可用**（火山 3 端点由「需代理」转为「可直连」）；`browserDirect=false` 仅保留为语义标记与降级分支。

## 4. 未在本环境覆盖（如实标注）

- **content script 注入的浏览器级实测**：需 `activeTab` 用户手势或 host permission 授予，headless 自动化下未构造真实手势；由 node 单测（`test/content.test.ts` 4 用例）+ 冒烟清单人工面覆盖。**如实标注为「未做浏览器级注入实测」，非「已通过」**。
- **side panel 人工交互**：headless 下不可交互，列入冒烟清单人工面。
- **真实 LLM 闭环**：需真实 BYOK key，未执行；G-KEY 已证可达性。
