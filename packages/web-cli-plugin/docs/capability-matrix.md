# 内置助手能力对照矩阵（FR-022 / TASK-002）

> **文档定位**: 能力对照矩阵 —— 内置助手工具面逐项归属（对齐/替代/不适用/后置），并标注**下线内置助手所需的最小能力集**（Gate-D D-1 验收基线）。
> **基线**: 内置助手注册矩阵（base 内建 + lgdl-web-cli/op-cli + P0/P1/v3/P2/v4 域工具，共 34 项）——**TASK-016 下线前基线**（助手源码目录已随 FR-038 移除，本表作为 Gate-D D-1 的存档对照）。
> **插件对应**: `packages/web-cli-plugin/src/`（P0 = TASK-001~011；P1 = TASK-012~015；P2/后置 = 明确不属本轮）。
> **四态定义**: **对齐**=插件已提供等价能力；**替代**=机制不同但结果等价；**不适用**=插件定位下不需要；**后置**=计划/可选，非 P0。

## 1. 矩阵

| # | 内置助手工具 | 能力 | 插件对应 | 状态 | 波次 | 最小能力集 |
|---|-------------|------|---------|:----:|:----:|:--:|
| 1 | `web-fetch` | 基础 web 获取 | 插件 background 经 `host_permissions` fetch（能力内建，非独立工具） | 替代 | P0 | 否 |
| 2 | `sleep` | 时序等待 | 宿主侧编排（无独立工具） | 不适用 | — | 否 |
| 3 | `web-cli-help` | 工具发现/自文档 | `CommandRouter.listHelp/helpFor` + `plugin.*` 管理工具 + side panel 状态 | 对齐 | P0 | 是 |
| 4 | `lgdl-web-cli` | 图内容操作（17 子命令/9 增量） | 站点声明工具 `site.lgdl-web-cli` 经页面 RPC 执行（LGDL `web-cli-host` 暴露） | 对齐 | P0 | **是** |
| 5 | `lgdl-web-op-cli` | UI 操作 | 站点声明工具 `site.lgdl-web-op-cli` 经页面 RPC 执行 | 对齐 | P1 (TASK-013) | 是 |
| 6 | `storage` | 域内 KV 存储 | 插件自身 `chrome.storage`（工具面不暴露给 LLM） | 不适用 | — | 否 |
| 7 | `storage-quota` | 存储配额查询 | 同上 | 不适用 | — | 否 |
| 8 | `settings` | 页内设置 | options 页 + `llm/key-store`（独立配置） | 替代 | P0 | 是 |
| 9 | `doc-read` | 文档读取 | `site.lgdl-web-cli` 读子命令经 RPC（页面 `getSource`） | 对齐 | P0 | 是 |
| 10 | `doc-edit` | 文档编辑 | 写回经 bridge `apply`（parseLgdl 校验 + onApply），不直连 React 状态 | 替代 | P0 | **是** |
| 11 | `session` | 会话持久/恢复 | 插件会话状态（`chrome.storage.session` + controller 快照） | 替代 | P0 | 是 |
| 12 | `context` | 上下文压缩/预算 | 沿用上游截断/摘要口径（NFR-007） | 替代 | P0 | 否 |
| 13 | `web-search` | 联网搜索（BYOK 端点） | 未纳入 P0；可由插件后续扩展 | 后置 | P2+ | 否 |
| 14 | `search-content` | 页内内容检索 | 站点声明工具按需（非插件内建） | 不适用 | — | 否 |
| 15 | `list-resources` | 资源清单 | 同上 | 不适用 | — | 否 |
| 16 | `dom` | 页面 DOM 操作 | （可选）通用 DOM 工具面 `content/dom-agent` | 后置 | P1 可选 (TASK-015) | 否 |
| 17 | `ask-user` | 任务内澄清提问 | 已接线：base `ask-user` 工具 + `background/ask-bridge.ts` → side panel Q&A（`ask-user-request`/`ask-user-response`） | 对齐 | P0 | 是 |
| 18 | `todo` | 任务清单 | 宿主 agent 循环内（非独立工具） | 不适用 | — | 否 |
| 19 | `goal` | 目标跟踪 | 同上 | 不适用 | — | 否 |
| 20 | `jobs` | 后台任务 | 同上 | 不适用 | — | 否 |
| 21 | `eval-js`（禁用） | Worker JS 执行 | 不提供（evaluate 最高档，插件 fail-closed） | 不适用 | — | 否 |
| 22 | `subagent`（禁用） | 子代理 | 不提供（P0 单会话） | 不适用 | — | 否 |
| 23 | `wait` | 条件等待 | 站点 RPC 超时/重试内建 | 不适用 | — | 否 |
| 24 | `extract` | 增量采集 | 插件不采集页面数据（O-002 通用消费端定位） | 不适用 | — | 否 |
| 25 | `export` | 采集导出 | 站点侧能力（如 op-cli `export-*`）经 RPC | 替代 | P1 | 否 |
| 26 | `page-eval`（禁用） | 页面求值（最高档） | 不提供（evaluate 档缺省 deny，fail-closed） | 不适用 | — | 否 |
| 27 | `chrome` | 浏览器外壳（print/back/forward/reload/screenshot） | 插件为独立扩展宿主，非页内工具 | 不适用 | — | 否 |
| 28 | `save` | 文件落盘 | 站点侧 op-cli `export-*` 经 RPC | 替代 | P1 | 否 |
| 29 | `notify` | 系统通知 | 扩展可后续扩展（非 P0） | 后置 | P2+ | 否 |
| 30 | `clipboard` | 剪贴板读写 | 站点侧 op-cli `copy-source` 经 RPC | 替代 | P1 | 否 |
| 31 | `events` | 事件订阅/观察 | content script 事件桥 → background 事件通道 | 对齐 | P1 (TASK-013) | 是 |
| 32 | `cookie`（禁用） | Cookie 读写 | 站点主权的站点侧能力（插件不越权） | 不适用 | — | 否 |
| 33 | `dialog`（禁用） | 页面对话框 | 同上 | 不适用 | — | 否 |
| 34 | `net`（禁用） | 网络拦截 | 不提供（P2 门禁；越权面） | 不适用 | — | 否 |

> 合计 **34 项**（与 `session.ts` 注册矩阵逐项核对，无遗漏条目）。

## 2. 下线最小能力集（Gate-D D-1 基线）

以下 8 项为「插件替代内置助手」的**最小能力集**，全部由 P0/P1 覆盖：

1. 多轮会话 + 工具调用 + `ask`（FR-017）—— `background/host.ts` + side panel（P0）；任务内 `ask-user` 经 `background/ask-bridge.ts` 接入 side panel 问答 UI（R7 已闭合）
2. LGDL 图内容操作 `lgdl-web-cli`（FR-018）—— `site.lgdl-web-cli` RPC（P0）
3. LGDL UI 操作 `lgdl-web-op-cli`（FR-019）—— `site.lgdl-web-op-cli` RPC（P1 TASK-013）
4. 编辑器写回 `onApply` 等价（FR-020）—— bridge `apply`（P0）
5. 事件/观察消费（FR-021）—— content 事件桥（P1 TASK-013）
6. 页内设置/BYOK（FR-033/034/035）—— options + key-store（P0）
7. 会话持久/恢复（FR-017）—— controller + storage.session（P0）
8. 工具发现/自文档（FR-017）—— router help + `plugin.*`（P0）

**结论**：最小能力集中 **6/8 在 P0 覆盖，2/8 在 P1（TASK-013）覆盖**（P1 已实施完成）。P0 最小可用集（TASK-001~011）已满足「插件可用 + 安全基线 + 通用站点闭环 + LGDL 图内容/写回」，UI 操作与事件消费为 P1 增量（与 plan §5.3 裁剪一致，见 tasks.md F-6）。**TASK-016 下线前复核：8/8 项均有已实施实现承载（Gate-D D-1 PASS）。**

## 3. 差异显式说明（FR-042 等价性）

- **机制差异（非功能差异）**：内置助手在页内直接调用领域工具；插件经 postMessage RPC 由页面 `web-cli-host` 执行。结果语义一致（同输入同结果），执行路径不同（可审计、可授权）。
- **UI 操作**：P1 TASK-013 已补齐（`site.lgdl-web-op-cli` 经 RPC + 门禁裁决）；内置助手已随 TASK-016 下线，由插件承载。
- **不适用项**：属页内宿主专属能力或插件定位外（不采集页面数据、不做浏览器外壳工具），不构成能力缺口。

## 4. 引用

- Gate-D 条件清单：`docs/gate-d.md`（TASK-014 产出，P1）
- 合规评估：`docs/compliance.md`
- 冒烟清单：`docs/smoke-checklist.md`
- 协议说明（站点中立）：`docs/protocol.md`
- 迁移指引（不自动迁移）：`docs/migration.md`
- 开发与调试 + 冒烟方法论：`docs/dev.md`
- 发布渠道与版本管理：`docs/release.md`
