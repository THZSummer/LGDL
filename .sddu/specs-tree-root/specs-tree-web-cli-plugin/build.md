# 构建报告：specs-tree-web-cli-plugin（web-cli-plugin，v0.8）

> **文档定位**: SDDU 构建报告 — 记录全部任务的文件变更和实现结果，作为 review 阶段的输入
> **前置依赖**: tasks.md v1.0（16 任务 / 9 波次）、plan.md v1.0（12 ADR + §6 文件影响）、spec.md v1.1（46 FR / 10 NFR / 16 EC / 12 AC）
> **创建人**: SDDU Build Agent
> **创建时间**: 2026-09-11
> **版本**: v1.0
> **更新人**: SDDU Build Agent
> **更新时间**: 2026-09-11
> **更新说明**: 初始创建。本轮实现 **P0 最小可用集 TASK-001~TASK-011**（波0 门槛 + 波1 四根柱子）；P1/P2（TASK-012~016）不在本轮。未 git 提交。

## 1. 构建概要

| 维度 | 数值 |
|------|:--:|
| 完成任务数 | 11 / 11（P0 集；全清单 16，P1/P2 5 项本轮不做） |
| 复杂度分布 | M×6（001/002/003/007/008/009） / L×5（004/005/006/010/011） |
| 新增文件 | 49（源码 26 + 测试 8 + 文档/声明 7 + 工程配置 4 + 其它 4） |
| 修改文件 | 4（lgdl-web/index.html、lgdl-web/src/App.tsx、package.json、package-lock.json） |

**包/产物**：
- 新包 `@lgdl/web-cli-plugin`（`packages/web-cli-plugin`，v0.8.0，private；独立构建产物 `dist/`）
- LGDL 站点暴露点 `packages/lgdl-web/src/web-cli-host/*` + `public/.well-known/web-cli.json` + `index.html` link + `App.tsx` 挂载

## 2. 文件变更

### 2.1 插件工程（`packages/web-cli-plugin`）

| 操作 | 文件路径 | 任务 | 说明 |
|:--:|------|:--:|------|
| NEW | `package.json` | 003 | 独立包；运行时依赖仅 `@lgdl/web-cli-base ^0.7.0`；devDep `esbuild`+`@types/chrome`+`typescript` |
| NEW | `tsconfig.json` | 003 | ES2022/strict/ESNext+bundler；types=[chrome,node] |
| NEW | `manifest.json` | 003 | MV3；权限 `activeTab/scripting/storage/sidePanel`；`optional_host_permissions`；6 个 LLM `host_permissions`；无静态 `content_scripts`；`side_panel`+`options_page`；`minimum_chrome_version:114` |
| NEW | `build.mjs` | 003 | esbuild（background ESM / content·sidepanel·options IIFE）+ node: stub 插件 + manifest/HTML 拷贝 |
| NEW | `src/background/service-worker.ts` | 003/006 | SW 入口：消息路由 + 生命周期 + 会话恢复 + side panel 行为 |
| NEW | `src/background/messaging.ts` | 003/006 | 跨面消息协议（kind 判别 + 校验 + 响应封装） |
| NEW | `src/background/host.ts` | 006 | `CommandRouter` + 站点工具注册 + 管理工具（单一权威门禁） |
| NEW | `src/background/controller.ts` | 006 | 单标签绑定 + 导航失效 + 快照/恢复 |
| NEW | `src/protocol/descriptor.ts` | 004 | `WebCliDescriptor` schema 校验/归一化（站点中立） |
| NEW | `src/protocol/version.ts` | 004 | 版本协商 accept/degrade/reject |
| NEW | `src/protocol/trust.ts` | 004 | 默认 untrusted + sha256 完整性 + 溯源 |
| NEW | `src/protocol/rpc.ts` | 004 | postMessage RPC 契约 + 超时 + 消息解析 |
| NEW | `src/discovery/discovery.ts` | 004 | 三通道编排 + 三态判定 + 失败降级 |
| NEW | `src/discovery/static-declaration.ts` | 004 | well-known + HTML link/meta 解析（相对 href → 绝对 URL） |
| NEW | `src/discovery/runtime-handshake.ts` | 004 | MAIN-world/postMessage 握手 + 3s 超时 |
| NEW | `src/security/origin-store.ts` | 005 | per-origin 授权/信任分离 CRUD + 审计 |
| NEW | `src/security/policy.ts` | 005 | S1/S2/S3 策略 + riskDefaults（fail-closed） |
| NEW | `src/security/confirm.ts` | 005 | onAsk 桥 + 操作摘要（脱敏）+ 超时/取消 deny |
| NEW | `src/security/audit-sink.ts` | 005 | `AuditSink` → 环形缓冲 + 事件面扩展 + 回放/导出 |
| NEW | `src/security/redact.ts` | 005 | import 复用 base `sensitive.ts`（零分叉） |
| NEW | `src/tools/declared-tools.ts` | 006 | descriptor.tools → `site:*` ToolEntry（executor=RPC） |
| NEW | `src/tools/admin-tools.ts` | 006 | 6 管理工具（origin-authorize/revoke/list、descriptor-show、audit-export、llm-config） |
| NEW | `src/platform/extension-env.ts` | 006 | `PlatformEnv` 实现（扩展 fetch / chrome.storage kv / session） |
| NEW | `src/platform/unsupported.ts` | 006 | 复用 `ATTRIBUTION_MAP` 统一「不支持+归属」转译 |
| NEW | `src/llm/providers.ts` | 007 | 8 厂商表（对齐 `provider.ts` 语义）+ `providerChat`（复用 base chat） |
| NEW | `src/llm/key-store.ts` | 007 | `chrome.storage.local` key 存储 + 掩码配置 |
| NEW | `src/content/content-script.ts` | 003/008 | isolated world 入口 + 自动发现上报 + site-invoke 处理 |
| NEW | `src/content/page-bridge.ts` | 008 | 页面世界 postMessage RPC 桥（invoke/handshake） |
| NEW | `src/ui/sidepanel/index.html` + `sidepanel.ts` | 003/009 | 会话/授权/二次确认/审计查看 UI |
| NEW | `src/ui/sidepanel/chat-state.ts` | 009 | DOM 无关状态 reducer（可测逻辑面） |
| NEW | `src/ui/options/index.html` + `options.ts` | 003/007 | LLM 配置 / 迁移指引 / 合规入口（key 零明文回显） |
| NEW | `test/protocol.test.ts` | 004 | 13 用例 |
| NEW | `test/discovery.test.ts` | 004 | 11 用例 |
| NEW | `test/security.test.ts` | 005 | 9 用例 |
| NEW | `test/host.test.ts` | 006 | 8 用例 |
| NEW | `test/llm.test.ts` | 007 | 3 用例 |
| NEW | `test/content.test.ts` | 008 | 5 用例 |
| NEW | `test/sidepanel.test.ts` | 009 | 4 用例 |
| NEW | `test/e2e.generality.test.ts` | 011 | 4 用例（fixture 端到端 + 冲突检测） |
| NEW | `test/fixtures/site/index.html`+`web-cli.json`+`rpc.js` | 002/011 | 非 LGDL 试点 fixture 站点（静态声明 + RPC 监听端） |
| NEW | `docs/capability-matrix.md` | 002 | 内置助手 34 工具对照矩阵 + 最小能力集 |
| NEW | `docs/compliance.md` | 002 | 试点站点条款合规评估 + 不适用清单（初版） |
| NEW | `docs/smoke-checklist.md` | 011 | 机械面 + 人工面冒烟清单 |

### 2.2 LGDL 站点暴露点（`packages/lgdl-web`）

| 操作 | 文件路径 | 任务 | 说明 |
|:--:|------|:--:|------|
| NEW | `src/web-cli-host/host-router.ts` | 010 | 复用保留 base `CommandRouter` + `lgdl-web-cli`/`op-cli` 注册（无助手专属） |
| NEW | `src/web-cli-host/bridge.ts` | 010 | postMessage RPC 监听端 + `parseLgdl` 校验 + `onApply` 写回 |
| NEW | `src/web-cli-host/declaration.ts` | 010 | 站点中立声明生成（运行时握手） |
| NEW | `public/.well-known/web-cli.json` | 010 | LGDL 静态声明 |
| MODIFY | `index.html` | 010 | `<link rel="web-cli" href=".well-known/web-cli.json">` |
| MODIFY | `src/App.tsx` | 010 | 挂载 `web-cli-host`（**ai/ 未摘除**，摘除归 TASK-016） |

### 2.3 工程/过程产物

| 操作 | 文件路径 | 任务 | 说明 |
|:--:|------|:--:|------|
| MODIFY | `package.json`（根） | 003 | workspace 自动纳入新包（无手改，仅 lock 同步） |
| MODIFY | `package-lock.json` | 003 | 新增 devDep 同步 |
| NEW | `.sddu/.../spike-mv3-gkey.md` | 001 | MV3 六项 + G-KEY 验证门结论 |
| NEW | `.sddu/.../spike-protocol-pilot.md` | 002 | 协议三层语义 + 最小试点记录 |
| MODIFY | `.sddu/.../state.json` | 011 | buildProgress / phase=builded |
| NEW | `.sddu/.../build.md` | — | 本文件 |

## 3. 任务完成清单

| 任务 | 名称 | 复杂度 | 状态 | 对应 FR |
|------|------|:--:|:--:|------|
| TASK-001 | 波0 平台与端点验证门（MV3 + G-KEY） | M | ✅ completed | FR-009/034/045 |
| TASK-002 | 波0 协议本质澄清 + 试点 + 矩阵 + 合规 | M | ✅ completed | FR-016/022/030 |
| TASK-003 | 插件工程骨架（可加载 dist/） | M | ✅ completed | FR-001/003/005/006 |
| TASK-004 | 协议与发现层 | L | ✅ completed | FR-010~014 |
| TASK-005 | 安全层（授权/门禁/确认/审计/脱敏） | L | ✅ completed | FR-023~028 |
| TASK-006 | 宿主与工具层（background 控制面） | L | ✅ completed | FR-005/008/011/017/023 |
| TASK-007 | KEY 层 + options | M | ✅ completed | FR-033/035 |
| TASK-008 | content script 数据面 | M | ✅ completed | FR-007/011 |
| TASK-009 | side panel（会话/授权/确认/审计） | M | ✅ completed | FR-017/024/025 |
| TASK-010 | LGDL 站点协议暴露点 | L | ✅ completed | FR-041/042/020 |
| TASK-011 | 波1 收口 GATE + 通用性验证 | L | ✅ completed | FR-043/004/002/016 |

> P1（TASK-012~015）与 P2（TASK-016）本轮**未实现**（不属 P0 最小可用集）。

## 4. 验证门结论（含降级）

| 门 | 结论 | 证据 |
|----|:----:|------|
| **G-MV3** | **PASS** | `chromium --headless=new --load-extension=dist` → CDP `/json` 出现 `service_worker` target；SW 内探针：manifest.name=`web-cli plugin`、mv=3、storage.local 往返、sidePanel/scripting 可达、**0 uncaught exception** |
| **G-KEY** | **PASS** | SW 内带 `Authorization` fetch 火山 `ark.cn-beijing.volces.com/api/v3/chat/completions` → **HTTP 401**（非 CORS/网络失败）→ 扩展特权 fetch 绕过页面 CORS 预检，火山 3 端点可直连；降级分支保留（EC-009） |
| **GATE-011 通用性** | **PASS** | 非 LGDL fixture 真实浏览器闭环：`link[rel=web-cli]` 解析 → `web-cli:probe` 得 tools → `notes-add` ok/trust=external → `notes-list` 确认写入 |
| **GATE-011 红线 grep** | **PASS** | 见 §5 |
| **GATE-011 上游零回归** | **PASS** | `web-cli-base` 483 测试全绿；`lgdl-web` 66 全绿；base 零改动 |

**降级/未达成项（如实标注）**：
- content script **浏览器级注入实测未做**（headless 无法构造 `activeTab` 用户手势）→ 由 node 单测 + 冒烟清单人工面 H0 覆盖；**不标注为已通过**。
- side panel 人工交互、真实 LLM 闭环未做（列入冒烟清单人工面）。

## 5. 全仓门禁与红线 grep 结果

### 5.1 构建 + 测试（`npm run build` / `npm test`）

| 包 | 结果 |
|----|------|
| `@lgdl/lgdl-core` | 267 pass / 0 fail |
| `@lgdl/lgdl-render` | 94 pass / 0 fail（1 skip） |
| `@lgdl/lgdl-router` | 8 pass / 0 fail |
| `@lgdl/lgdl-web` | 66 pass / 0 fail |
| `@lgdl/lgdl-web-cli` | 84 pass / 0 fail |
| `@lgdl/lgdl-web-op-cli` | 15 pass / 0 fail |
| `@lgdl/web-cli-base` | **483 pass / 0 fail**（零回归，D-005） |
| `@lgdl/web-cli-plugin` | **54 pass / 0 fail**（新增） |
| 全仓 | `npm run build` PASS；`npm test` 0 fail |

### 5.2 红线 grep

| # | 断言 | 结果 |
|---|------|:----:|
| 1 | `src` 无 base 源码副本/分叉 | OK（仅 import 消费 base 导出面） |
| 2 | 插件依赖图谱零 `@lgdl/lgdl-web` 私有包 | OK（0 命中） |
| 3 | `discovery`/`policy` 无 lgdl 特化分支 | OK（排除中性 base 包名后 0 命中，见 D-001） |
| 4 | 无旁路（`.executor(` 直调 0；全部经 `dispatch`） | OK（0 命中） |
| 5 | 无 `silentAllow`/`allowSilently` | OK（0 命中） |
| 6 | 无空 `catch(...) {}` 吞错 | OK（0 命中） |
| 7 | `src/content` 无 `window.X =` 全局赋值 | OK（0 命中） |
| 8 | `src` 无 `lgdl-ai-settings`；`src/llm` 无 `localStorage` | OK（0 命中） |
| 9 | `packages/web-cli-base/**` 零改动 | OK（`git status` 为空） |
| 10 | 运行时依赖仅 `@lgdl/web-cli-base ^0.7.0` | OK |

## 6. 实现决策（D-xxx）与 plan/spec 缺陷记录

| # | 决策/发现 | 说明 | 影响 |
|---|----------|------|------|
| D-001 | **红线 grep 与依赖名字面冲突**（plan/tasks 缺陷） | tasks §TASK-004/011 的 `! grep -rniE "lgdl" src/protocol src/discovery` 与唯一运行时依赖 `@lgdl/web-cli-base`（包名含 lgdl）字面冲突，任何 import 必命中。精化口径 = 排除该中性 base 包名后 0 命中；已确认 protocol/discovery/policy 无任何站点/领域特化分支 | 非方案变更；建议 review 修订 grep 口径 |
| D-002 | **静态声明 href 与文件位置不一致**（plan 缺陷） | plan §6 文件落在 `public/.well-known/web-cli.json`，但 §3.6 字面写 `href="web-cli.json"`。实现取相对 `href=".well-known/web-cli.json"` 以正确解析（兼容 `base='/LGDL/'`） | 非方案变更 |
| D-003 | **运行时握手不注入 MAIN world** | 以 content script `window.postMessage` 直达页面世界完成 probe/descriptor，替代 plan §2.3.2 的 `chrome.scripting world:'MAIN'` 注入探测片段；少一次注入、少一权限面；`runtime-handshake.ts` 保留 io 注入契约，未来可换实现 | 实现简化；FR-010 通道③语义不变 |
| D-004 | **S3 策略不误杀 read** | 若 S3 对 `namespace='site'` 一律 deny，会覆盖 S2 对 read 的 `null`（缺省 allow）。实现 S3 仅对 risk 非法/缺失 deny，保留 read→riskDefaults allow | fail-closed 语义保持 |
| D-005 | **content script 浏览器级注入未实测** | headless 自动化无法构造 `activeTab` 用户手势；如实标注未做，由 node 单测 + 人工面覆盖 | 验证覆盖缺口（已列降级出口） |
| D-006 | **devDep 引入（作者授权）** | `esbuild ^0.21.5`（content IIFE 打包；MV3 content script 不支持 ESM）+ `@types/chrome ^0.2.9`（类型）；仅 devDep，零运行时新增；`package-lock.json` 已同步 | ADR-009 落地；运行时依赖仍仅 base |
| D-007 | **base LLM SDK 打包** | base 根导出含 `openai`/`@anthropic-ai/sdk`，后者含 node-only 动态 import；`build.mjs` 用 node: stub 插件将 `node:*` 置空（浏览器不执行路径），bundle 成功（background ~923KB） | 构建可行性；无运行时副作用 |
| D-008 | **S2/S3 策略为插件注入，不复制 base 机制** | 三策略经 `RouterPolicy.strategies` 注入上游 `PermissionGate`；插件不修改 `permission.ts`/`router.ts` | NFR-005 additive |

## 7. 遗留与风险

| # | 项 | 说明 | 建议 |
|---|----|------|------|
| R1 | content 注入/side panel 人工面未实测 | 见 D-005 | validate 阶段按 `docs/smoke-checklist.md` 人工面执行 |
| R2 | `docs/protocol.md`（FR-015）未产出 | P1 TASK-012 | 下轮实现 |
| R3 | `docs/migration.md`/`dev.md`/`gate-d.md`（FR-036/044/037）未产出 | P1 TASK-014 | 下轮实现 |
| R4 | UI 操作（FR-019）/事件消费（FR-021）未接入 | P1 TASK-013；P0 最小集按 plan §5.3 裁剪（tasks F-6 已标注 AC-009 UI 操作部分由 P1 补齐） | 下轮实现 |
| R5 | `lgdl-web/src/ai/*` 保留 | TASK-016 在 Gate-D 达标后摘除；本轮零改动（测试守恒 D-005） | 保持 |
| R6 | 火山 G-KEY 结论基于「扩展 fetch 可达」 | 未用真实 key 验证业务成功；`browserDirect` 标记与降级分支保留 | validate 可选真实 key 复核 |

## 8. 下一步

| 场景 | 操作 |
|------|------|
| 全部 P0 任务已完成 | 运行 `@sddu-review specs-tree-web-cli-plugin` 开始审查 |
| 继续 P1 | 实现 TASK-012~015（协议文档 / UI 操作+事件 / 风控+合规迁移调试文档 / 可选 DOM 工具面） |

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建：P0 最小可用集 TASK-001~011 构建报告（含门禁结果、红线 grep、D-001~D-008 决策、遗留风险） | 2026-09-11 | SDDU Build Agent |
