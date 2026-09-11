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
| M3 | 权限面最小化 | manifest 断言（无 `tabs`，有 `optional_host_permissions`，无静态 `content_scripts`） | 断言通过 | ✅ PASS |
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
| M15 | 审计落库 | `plugin.audit-export` / `audit-sink` 测试 | 事件面齐全 | ✅ PASS（node 面） |
| M16 | 导航失效语义 | `controller.markNavigated()` 测试 | invalidated=true + 需重授权 | ✅ PASS（node 面） |
| M17 | 通用性端到端 | `test/e2e.generality.test.ts`（fixture） | 全链通过 | ✅ PASS |
| M18 | 风控暂停/中止可读阻断 | `test/host.test.ts` risk guard 用例（stop/pause → 不执行，resume 恢复） | 阻断可读、不静默 | ✅ PASS（node 面，P1） |
| M19 | 事件桥 + 上下文预算截断 | `test/content.test.ts`（subscribe/pull/notify）+ `test/sidepanel` 事件 | 预算摘要 + 可读截断 | ✅ PASS（node 面，P1） |
| M20 | 通用 DOM 工具面（默认关） | `test/dom-agent.test.ts` | 默认不装配、失败可读 | ✅ PASS（node 面，P1 可选） |
| M21 | 任务内 ask-user 问答桥 | `test/ask-bridge.test.ts` + `test/sidepanel.test.ts` + `test/host.test.ts` | 提问→作答→回填；超时/取消可读 | ✅ PASS（node 面，P1/R7） |
| M22 | `transport.channel` 动态绑定 | `test/content.test.ts` + `test/protocol.test.ts` | 声明通道绑定后 invoke/结果按新通道 | ✅ PASS（node 面，P1/R9-7） |
| M23 | 破坏性动词 denylist | `test/host.test.ts` R-BLK1a 用例（5 例伪装） | 不得 read→allow | ✅ PASS（node 面，P1/R-BLK1a） |

## 2. 人工面（真实浏览器交互）

| # | 检查项 | 步骤 | 期望 |
|---|--------|------|------|
| H0 | content script 注入 | 打开站点 → 点击扩展图标（用户手势）→ 检查页面无全局污染、控制台无错误 | 注入成功、宿主页零回归 |
| H1 | side panel 多轮对话 | 打开 side panel → 输入指令 → 观察多轮 assistant/tool 渲染 | 多轮 + 工具调用可见 |
| H2 | 授权弹层 | 点击「授权当前站点」 | 授权生效、状态可见、风险提示可读 |
| H3 | 二次确认 | 触发 untrusted write（如 `site.lgdl-web-cli` 写命令） | 弹出确认摘要；允许→执行；拒绝/超时→不执行 |
| H4 | 审计查看 | 点击「查看审计」 | 事件列表/计数可见、零明文 |
| H5 | 导航失效提示 | 授权后整页刷新 | 明示「会话失效，需重新授权/重连」，不静默续接 |
| H6 | LGDL 页端到端 | 在 LGDL 工作台加载插件 → 授权 → 经 RPC 执行图内容命令 + 写回 | 编辑器内容更新；既有功能零回归 |
| H7 | 真实 LLM 闭环（可选） | 配置 BYOK key → 发指令 | 会话正常；火山端点可用（G-KEY PASS） |
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
