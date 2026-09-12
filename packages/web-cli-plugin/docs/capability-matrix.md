# 内置助手能力对账矩阵（FR-022 / FR-051）

> **文档定位**: 「原内置助手工具面 ↔ 插件工具面」的**逐项对账表**。本表**由 `test/parity.test.ts` 机器校验**——不再允许手工漂移。
> **基线出处**: `main@2ddc92299ad10cfe0ea2b65403243a45ce7fb041`，机器提取自 `packages/lgdl-web/src/ai/session.ts` 注册矩阵 → 固化为 `test/parity/baseline-catalog.json`（34 工具 · 142 子命令，含 provenance）。
> **对账门禁**: `packages/web-cli-plugin/test/parity.test.ts`（双向 + 子命令级 + 失败可读） + 豁免登记 `test/parity/waivers.json`。
> **复现提取**: `node packages/web-cli-plugin/test/parity/extract-baseline-catalog.mjs --baseline <main 临时克隆>`（步骤见 `docs/dev.md` §13）。

## 0. 为什么有这张表（机制根因）

2026-09 作者实测发现插件只暴露 10 个工具，而原内置助手的 **DOM 操作、浏览器截图**等命令全部丢失。既有测试没抓到，是因为它们只断言插件**自身内部行为**，而本表此前是**手写、无执行**的 → 工具面静默漂移。**现已改为机器对账**：任何「基线有、插件无」或「插件新增未登记」都会让 `npm test` 失败。

## 1. 对账矩阵（34 项，逐项）

状态定义：**已提供** = 同名工具在 `deriveTools()` 可达且子命令覆盖；**已映射** = 由插件中另一工具承载（如站点声明 `site_*`）；**已豁免** = `waivers.json` 显式登记理由与依据；**待批准权限** = 可实现但需新权限，本轮只报告不实施；**基线禁用** = 原助手即 `enabled:false`，从未在暴露面。

| # | 基线工具 | 子命令 | 插件实现 / 豁免 | 状态 | 依据 |
|---|---------|:------:|----------------|:----:|------|
| 1 | `lgdl-web-cli` | 17 | 站点声明工具 `site_lgdl-web-cli`（页面 RPC） | 已映射 | FR-011 / FR-018；ADR-003 |
| 2 | `lgdl-web-op-cli` | 19 | 站点声明工具 `site_lgdl-web-op-cli`（页面 RPC） | 已映射 | FR-011 / FR-019 |
| 3 | `storage` | 4 | 页面宿主应用自身存储；插件用 `chrome.storage`，不对 LLM 暴露 | 已豁免（不适用） | FR-022（O-002 通用消费端） |
| 4 | `storage-quota` | 2 | 同上 | 已豁免（不适用） | FR-022 |
| 5 | `settings` | 4 | options 页 + `llm/key-store`（替代） | 已豁免（delegated） | FR-033 / FR-035 |
| 6 | `doc-read` | 0 | `site_lgdl-web-cli`（`doc-info`/`get-node`） | 已映射 | FR-011 / FR-018 |
| 7 | `doc-edit` | 3 | `site_lgdl-web-cli` + bridge `apply`（FR-020 写回） | 已映射 | FR-020 |
| 8 | `session` | 5 | 插件 `session-store.ts` 多会话（非 LLM 工具） | 已豁免（不适用） | FR-017 / FR-048 |
| 9 | `context` | 1 | 上游截断/预算（宿主循环内） | 已豁免（不适用） | NFR-007 |
| 10 | `web-search` | 0 | **base `web-search`**（端点未配置时可读禁用态） | **已提供** | FR-051 |
| 11 | `search-content` | 0 | 页内检索属站点声明能力 | 已豁免（不适用） | FR-022（O-002） |
| 12 | `list-resources` | 0 | 同上 | 已豁免（不适用） | FR-022 |
| 13 | `dom` | 30 | **base `dom`**；content 隔离世界 `createBrowserDomOps()` + background 远程代理 | **已提供** | FR-051 |
| 14 | `ask-user` | 0 | base `ask-user` + `ask-bridge`（侧栏问答） | 已提供 | FR-017 |
| 15 | `todo` | 5 | 宿主 agent 任务清单（非浏览器能力） | 已豁免（不适用） | FR-022 |
| 16 | `goal` | 5 | 同上 | 已豁免（不适用） | FR-022 |
| 17 | `jobs` | 7 | 同上 | 已豁免（不适用） | FR-022 |
| 18 | `eval-js` | 0 | 不提供（原助手 `enabled:false`） | 基线禁用 | 基线 enabled:false；FR-027 |
| 19 | `subagent` | 0 | 不提供（原助手 `enabled:false`） | 基线禁用 | 基线 enabled:false |
| 20 | `wait` | 0 | **base `wait`**（经 `ops.waitFor`） | **已提供** | FR-051 |
| 21 | `extract` | 0 | **base `extract`**（经 `ops.extractData` + 共享 CollectBuffer） | **已提供** | FR-051 |
| 22 | `export` | 0 | **base `export`**（页面上下文 anchor 下载链落盘） | **已提供** | FR-051 |
| 23 | `page-eval` | 0 | 不提供（原助手 `enabled:false`；evaluate 档 fail-closed） | 基线禁用 | 基线 enabled:false；FR-027 |
| 24 | `chrome` | 5 | **base `chrome`**：`print`/`back`/`forward`/`reload`/**`screenshot`** | **已提供** | FR-051 |
| 25 | `save` | 2 | **base `save`**（页面上下文 anchor 下载链） | **已提供** | FR-051 |
| 26 | `notify` | 1 | 需 `notifications` 权限 | **待批准权限** | FR-006；本任务权限纪律 |
| 27 | `clipboard` | 5 | 需 `clipboardRead`/`clipboardWrite` 权限 | **待批准权限** | FR-006 / FR-028 |
| 28 | `events` | 11 | **base `events`**；经既有 content 事件桥（subscribe/pull/unsubscribe/status 真实可用；list 本地；其余子命令返回可读「暂不支持」） | **已提供（运行时部分）** | FR-051 / FR-021 |
| 29 | `cookie` | 4 | 不提供（原助手 `enabled:false`） | 基线禁用 | 基线 enabled:false |
| 30 | `dialog` | 6 | 不提供（原助手 `enabled:false`） | 基线禁用 | 基线 enabled:false |
| 31 | `net` | 6 | 不提供（原助手 `enabled:false`） | 基线禁用 | 基线 enabled:false |
| 32 | `web-fetch` | 0 | 插件侧受控 seam（未授权域名零请求 + 可读拒绝） | 已提供 | FR-050 |
| 33 | `sleep` | 0 | base 内建 | 已提供 | base FR-020 |
| 34 | `web-cli-help` | 0 | `CommandRouter` 自文档 + `admin_*` | 已提供 | FR-017 |

**汇总**：已提供 12 · 已映射 4 · 已豁免（不适用/delegated）10 · 待批准权限 2 · 基线禁用 6 = **34**。

## 2. 待批准权限（本轮只报告，未实施）

| 基线工具 | 能力 | 需要什么权限 | 安装提示影响 | 状态 |
|---------|------|-------------|-------------|------|
| `notify` | 系统通知 | `notifications` | 安装时新增「显示通知」权限提示 | **未实施（待批准）** |
| `clipboard` | 剪贴板读/写 | `clipboardRead`（读）/ `clipboardWrite`（写） | 安装时新增剪贴板权限提示 | **未实施（待批准）** |

> 作者未批准前**不实现、不申请**。若批准，建议在 manifest 显式披露 + options 隐私开关（对齐 `tabs` 的做法）。

## 3. 插件新增（非基线同名）的面向 LLM 的工具

以下工具不在基线目录中，但属插件定位所必需，已在 `waivers.json` 的 `pluginExtras` 登记（未登记会被门禁拦下）：

| 工具 | 用途 | 依据 |
|------|------|------|
| `admin_origin-authorize` / `admin_origin-revoke` / `admin_origin-list` | per-origin 授权管理 | FR-023 |
| `admin_descriptor-show` | 查看当前声明 | FR-011 / FR-022 |
| `admin_audit-export` | 导出审计 | FR-025 |
| `admin_llm-config` | 掩码 LLM 配置 | FR-033 / FR-035 |
| `tabs` | 标签页 list/switch/open（不含 close） | FR-049 |

## 4. 最小能力集（Gate-D D-1 基线）

原「下线内置助手最小能力集」8 项仍全部有承载：P0 覆盖会话/ask、图内容、写回、BYOK、会话持久、工具发现；P1 覆盖 UI 操作、事件消费。见 `docs/gate-d.md`。FR-051 之后，浏览器外壳/DOM 采集能力（`dom`/`chrome`/`extract`/`export`/`save`/`wait`/`events`/`web-search`）也纳入插件工具面。

## 5. 引用

- 对账门禁：`packages/web-cli-plugin/test/parity.test.ts`（+ `test/parity/{baseline-catalog,waivers}.json`）
- 对账流程：`docs/dev.md` §13（复现提取 / 新增工具 / 登记豁免）
- Gate-D 条件清单：`docs/gate-d.md`
- 协议说明（站点中立）：`docs/protocol.md`
- 迁移指引（不自动迁移）：`docs/migration.md`
- 合规评估：`docs/compliance.md`
