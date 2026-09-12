# 构建报告：specs-tree-web-cli-plugin（web-cli-plugin，v0.8）

> **文档定位**: SDDU 构建报告 — 记录全部任务的文件变更和实现结果，作为 review 阶段的输入
> **前置依赖**: tasks.md v1.7（25 任务 / 18 波次）、plan.md v1.1（14 ADR〔ADR-013/014 为 v0.9 增补〕+ §6 文件影响）、spec.md v1.4（48 FR / 10 NFR / 20 EC / 12 AC）
> **创建人**: SDDU Build Agent
> **创建时间**: 2026-09-11
> **版本**: v1.16
> **更新人**: SDDU Build Agent
> **更新时间**: 2026-09-12
> **更新说明**: v1.16 = v0.9 架构级增补（TASK-024/025，作者 2026-09-12 决策①②）：自动探测（声明式注入 + 自上报握手，免点图标，无 `<all_urls>`/静态注入/新增 `tabs`）+ 多会话（按 origin 自动共享 + 可选会话组 + LRU + 不串台）；详见 §23。此前 v1.2~v1.15 见修订记录。

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
| **GATE-011 通用性** | **PASS（收敛口径）** | 非 LGDL fixture **页面级 CDP** 闭环：`link[rel=web-cli]` 解析 → `web-cli:probe` 得 tools → `notes-add` ok/trust=external → `notes-list` 确认写入；**node 级**新增 `packages/lgdl-web/src/web-cli-host/web-cli-host.test.ts`（9 用例：declaration/router/bridge probe·invoke·写回校验·隔离·异常）。**未**经「插件 content-script→background→host→RPC」全链浏览器验证（记为遗留 R8，validate 人工面 H0/H6） |
| **GATE-011 红线 grep** | **PASS** | 见 §5.2（R1 复跑：10 项 0 命中） |
| **GATE-011 上游零回归** | **PASS** | `web-cli-base` 483 测试全绿（零改动）；`lgdl-web` 66→75（新增 9，既有零删除零降级） |

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
| `@lgdl/lgdl-web` | **75 pass / 0 fail**（R1 +9：web-cli-host 单测；既有 66 零删除零降级） |
| `@lgdl/lgdl-web-cli` | 84 pass / 0 fail |
| `@lgdl/lgdl-web-op-cli` | 15 pass / 0 fail |
| `@lgdl/web-cli-base` | **483 pass / 0 fail**（零回归，D-005） |
| `@lgdl/web-cli-plugin` | **68 pass / 0 fail**（R1 +14：BLK-1×3 / chat-session×6 / discovery-audit×1 / extension-env×2 / unsupported×2） |
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
| D-009 | **BLK-1 修复：effectiveRisk 插件自决（不采信站点 riskHint）** | `declared-tools.ts` 新增 `SAFE_READ_VERBS` + `isSafeReadOnlyTool`；`effectiveRisk` = 白名单命中→`read`；否则站点声明了结构（riskHint 或 subcommands）→`write`（ask）、完全不可分类→`undefined`（S3 deny）。站点自报 `riskHint` 仅用于「是否声明了结构」的 presence 判定，**返回值绝不等于 riskHint**。plan §2.5/spike §1.2 语义落地 | 关闭 C28/C36 静默 allow 路径 |
| D-010 | **platform/extension-env.ts 死代码清理（IMP-1）** | 删除无消费者的 `extensionEnv()`/`chromeFetch()`/`createChromeSyncKv()`/`SyncKvHandle`（PlatformEnv 远程 DOM 缝为波2预留，P0 无消费方）；新增 `originPermissionPattern`/`requestOriginPermission`/`hasOriginPermission`（IMP-4）。波2 需要 PlatformEnv 时按 plan §2.4 重建 | 删除 > 保留死代码；不改变 P0 行为 |
| D-011 | **FR-008 转译接线落在 background（不在 content bundle）** | `capabilityFailure` 接入 `service-worker.ts` `invokeSite` 失败路径；`page-bridge.ts` 保持轻量可读超时文案——若在 content script 引 `unsupported.ts` 会把整个 base 打进 content bundle（实测 25.1KB→913KB），故显式不接线 content 面 | 保留 FR-008 可读转译 + 控制注入体积 |
| D-012 | **BLK-2 会话连续性 = 会话历史前缀（AgentRunner 单次语义不变）** | 上游 `AgentRunner` 的 `run()` 单次终结，无法原地复用实例；新增 `chat-session.ts`（历史保留/裁剪/快照）+ `chat-runner.ts`（每次 runner 调用前缀历史、结束后 commit）。历史落 `chrome.storage.session`（EC-013），导航/换 origin 清空（EC-011/ADR-012） | FR-017 多轮达成；不 fork base |
| D-013 | **会话历史裁剪口径** | 上限 40 turn，裁剪后首条强制为 `user`，保证 tool 结果必有 assistant `toolCalls` 父消息（合法 LLM 消息序列） | 防 session 存储无界增长 |
| D-014 | **FR-025 发现环节审计** | 新增 `security/discovery-audit.ts`，`discover` 成功/失败分支均 `recordPlugin({type:'descriptor-read', origin, trust, ok, detail})`（含 channel/integrity/tools/protocol） | 关闭 C26/C37 审计缺口 |
| D-015 | **IMP-4 host permission 申请** | `requestOriginPermission` 在 side panel 用户手势路径（主）+ background authorize handler（兜底）调用；失败可读降级到 activeTab，OriginStore 仍是权威门禁；http origin 不在 `optional_host_permissions` 声明内 → 回退 activeTab | 权限按需申请，最小化 |
| D-016 | **BLK-1 附带：声明了 subcommands 的工具归 `write`（ask）而非 deny** | LGDL 站点工具（`lgdl-web-cli`/`lgdl-web-op-cli`）无 `riskHint`，严格「无 hint→deny」会使 FR-018/FR-041 完全不可用（旧实现亦然）。按 review BLK-1 建议②「其余默认 ask」，`effectiveRisk` 对有 subcommands 声明的非白名单工具返回 `write`（强制确认），仍**无静默 allow**；完全不可分类（无 hint 无 subcommands）才 deny | 恢复 FR-018 可用性；安全语义不降级 |

## 7. 遗留与风险

| # | 项 | 说明 | 建议 |
|---|----|------|------|
| R1 | content 注入/side panel 人工面未实测 | 见 D-005 | validate 阶段按 `docs/smoke-checklist.md` 人工面执行 |
| R2 | `docs/protocol.md`（FR-015）未产出 | P1 TASK-012 | 下轮实现 |
| R3 | `docs/migration.md`/`dev.md`/`gate-d.md`（FR-036/044/037）未产出 | P1 TASK-014 | 下轮实现 |
| R4 | UI 操作（FR-019）/事件消费（FR-021）未接入 | P1 TASK-013；P0 最小集按 plan §5.3 裁剪（tasks F-6 已标注 AC-009 UI 操作部分由 P1 补齐） | 下轮实现 |
| R5 | `lgdl-web/src/ai/*` 保留 | TASK-016 在 Gate-D 达标后摘除；本轮零改动（测试守恒 D-005） | 保持 |
| R6 | 火山 G-KEY 结论基于「扩展 fetch 可达」 | 未用真实 key 验证业务成功；`browserDirect` 标记与降级分支保留 | validate 可选真实 key 复核 |
| R7 | 用户问答 `askUser` 缝未接入（IMP-3） | 权限 ask 经 `confirm.ts` 桥已可用；「任务内澄清 ask-user」需 side panel 问答 UI（choice/confirm/text），归 P1（review IMP-3 允许显式标注归 P1） | P1 TASK-013 或后续补齐 |
| R8 | 插件全链浏览器验证未做（IMP-9） | GATE-011 为「页面级 CDP + node 级」；content-script→background→host→RPC 全链未经真实浏览器验证（headless 无法构造 activeTab 手势，见 D-005） | validate 按 `docs/smoke-checklist.md` 人工面 H0/H6 执行 |
| R9 | 未修的 review 改进项 | IMP-6（discovery fetch 落 content vs plan §3.2 background 特权 fetch）、IMP-7（transport.channel 未动态绑定，P0 仅默认通道）、IMP-8（插件 vs 内置助手双工具面冲突用例）、IMP-10（`docs/gate-d.md`/`protocol.md` 未产出）、IMP-12（FR-037/038 spec P0 vs plan 波3 优先级不一致） | 归 P1/P2 或 validate 前按需处理 |

## 8. 下一步

| 场景 | 操作 |
|------|------|
| 全部 P0 任务已完成 | 运行 `@sddu-review specs-tree-web-cli-plugin` 开始审查 |
| 继续 P1 | 实现 TASK-012~015（协议文档 / UI 操作+事件 / 风控+合规迁移调试文档 / 可选 DOM 工具面） |

## 9. 审查修复记录（R1）

> 输入：`review-report.md` v1.0（2 阻塞 + 12 改进）。本轮修复 2 阻塞 + 6 高价值改进；其余改进项如实保留（见 R9）。

### 9.1 阻塞修复

| # | 位置（修复后） | 修复内容 | 证据（file:line） | 新增测试 |
|---|------|---------|------|------|
| **BLK-1** | `src/tools/declared-tools.ts:69-119` | `effectiveRisk` 改为插件自决：`SAFE_READ_VERBS` id 白名单命中→`read`；否则声明了结构（riskHint/subcommands）→`write`（ask）、完全不可分类→`undefined`（S3 deny）。返回值**绝不等同站点 `riskHint`**（仅用 presence 区分 ask/deny） | `declared-tools.ts:111-114` `if (isSafeReadOnlyTool(decl)) return 'read'; const declared = ...; return declared ? 'write' : undefined;`；`isSafeReadOnlyTool` L89-93 | `test/host.test.ts` 新增 3 用例（自报 read 的危险工具 → 不静默 allow / 仅确认后执行 / 白名单按 id 判定） |
| **BLK-2** | `src/background/chat-session.ts`（新）+ `src/background/chat-runner.ts`（新）+ `src/background/service-worker.ts:169-218` | 新增会话历史（保留/裁剪/快照/恢复）；`runChatTurn` 每次 runner 调用前缀历史、结束后 commit；历史落 `chrome.storage.session`（EC-013）；导航/换 origin 清空（EC-011/ADR-012）；`maxRounds` 从 settings 传入 runner | `service-worker.ts:194-197`（session/system/maxRounds）；`chat-runner.ts:49-60`；`chat-session.ts:66-84` | `test/chat-session.test.ts` 6 用例（二轮携带首轮上下文 / 导航清空 / maxRounds / 裁剪边界 / 快照恢复） |

### 9.2 高价值改进

| # | 位置 | 修复内容 | 证据 | 测试 |
|---|------|---------|------|------|
| FR-025 | `src/security/discovery-audit.ts`（新）+ `service-worker.ts` discover 分支 | 发现/声明读取成功/失败均入审计（origin/channel/trust/integrity/tools/protocol） | `discovery-audit.ts:19-46`；`service-worker.ts` `case 'discover'` 两分支 `audit.recordPlugin(...)` | `test/security.test.ts` 新增 1 用例 |
| FR-008 | `src/platform/unsupported.ts` + `service-worker.ts:75-82` | `capabilityFailure` 接入站点 RPC 失败路径；`ATTRIBUTION_MAP` 经 `unsupported.ts` 可达并有转译断言；删除无消费者的 PlatformEnv 工厂（D-010） | `service-worker.ts:77-82`；`unsupported.ts:23-35` | `test/unsupported.test.ts` 2 用例（转译可读 + ATTRIBUTION_MAP 查询/帮助面） |
| TASK-010 | `packages/lgdl-web/src/web-cli-host/web-cli-host.test.ts`（新） | web-cli-host 3 模块补 node 单测（declaration / router dispatch / bridge probe·invoke·写回校验·隔离·异常） | 测试文件 9 用例 | lgdl-web 66→75 |
| IMP-4 | `src/platform/extension-env.ts:61-113` + `sidepanel.ts` authorize + `service-worker.ts` authorize | `chrome.permissions.request({origins:[origin+'/*']})` 在用户手势路径（主）+ background（兜底）调用；失败可读降级 activeTab | `extension-env.ts:78-113` | `test/extension-env.test.ts` 2 用例（pattern 归一化 / 无 chrome 降级不抛） |
| maxRounds | `service-worker.ts:197` | `maxRounds: settings.maxRounds` 传入 runner | 同 BLK-2 | `chat-session.test.ts` maxRounds 用例 |
| GATE-011 | `build.md §4` | 表述收敛为「页面级 CDP + node 级」；全链浏览器验证记为 R8 遗留（不冒充全链 PASS） | §4 GATE-011 行 | — |

### 9.3 R1 复跑门禁

| 门禁 | 命令 | 结果 |
|------|------|------|
| 全仓构建 | `npm run build` | **PASS**（plugin: background 930.9KB / content 25.1KB / sidepanel 8.2KB / options 893.9KB） |
| 全仓测试 | `npm test` | **PASS，0 fail**（base 483 / lgdl-web 75 / plugin 68 / core 267 / render 94+1skip / web-cli 84 / op-cli 15 / router 8） |
| 插件类型检查 | `npm run typecheck --workspace @lgdl/web-cli-plugin` | **PASS**（`tsc --noEmit` 0 error） |
| G-MV3 复检 | `chromium --headless=new --load-extension=dist` + CDP | **PASS**（`service_worker` target `chrome-extension://mekg…/background.js`；SW 内 `getManifest()` → name=`web-cli plugin`、mv=3、permissions=`[activeTab,scripting,storage,sidePanel]`；chrome.log 仅 dbus/AppArmor 环境噪声，无扩展 JS 错误） |
| 红线 grep | 见 §5.2 + BLK-1 专项 | **0 命中**（`silentAllow` 0；`.executor(` 直调 0；content window 全局 0；`@lgdl/lgdl-web` 私有依赖 0；`effectiveRisk` 无 `return decl.riskHint`）；唯一 grep 命中为 `unsupported.ts` 注释里的 `catch {}` 字样（非代码） |
| base 零改动 | `git status --porcelain packages/web-cli-base` | **空**（NFR-005 红线保持） |
| 上游测试守恒 | lgdl-web 既有 66 用例全保留（+9 新增） | **零删除零降级** |

### 9.4 R1 文件变更清单

| 操作 | 文件 |
|------|------|
| NEW | `packages/web-cli-plugin/src/background/chat-session.ts` |
| NEW | `packages/web-cli-plugin/src/background/chat-runner.ts` |
| NEW | `packages/web-cli-plugin/src/security/discovery-audit.ts` |
| NEW | `packages/web-cli-plugin/test/chat-session.test.ts` |
| NEW | `packages/web-cli-plugin/test/extension-env.test.ts` |
| NEW | `packages/web-cli-plugin/test/unsupported.test.ts` |
| NEW | `packages/lgdl-web/src/web-cli-host/web-cli-host.test.ts` |
| MODIFY | `packages/web-cli-plugin/src/tools/declared-tools.ts`（BLK-1） |
| MODIFY | `packages/web-cli-plugin/src/security/policy.ts`（注释：risk 为插件复核值） |
| MODIFY | `packages/web-cli-plugin/src/background/service-worker.ts`（BLK-2 / FR-025 / FR-008 / IMP-4 / maxRounds） |
| MODIFY | `packages/web-cli-plugin/src/platform/extension-env.ts`（D-010 删死代码 + IMP-4） |
| MODIFY | `packages/web-cli-plugin/src/content/page-bridge.ts`（仅注释，保持轻量） |
| MODIFY | `packages/web-cli-plugin/src/ui/sidepanel/sidepanel.ts`（手势路径申请 host permission） |
| MODIFY | `packages/web-cli-plugin/test/host.test.ts`（BLK-1 负向用例） |
| MODIFY | `packages/web-cli-plugin/test/security.test.ts`（FR-025 用例） |
| MODIFY | `packages/lgdl-web/package.json`（test 脚本纳入 web-cli-host 测试；既有测试零删除） |
| MODIFY | `.sddu/.../build.md`、`.sddu/.../state.json` |

## 10. P1 实施记录（R2：TASK-012~015）

> 输入：`tasks.json` TASK-012~015（acceptance/verify 硬验收）+ `review-report.md` §7.4 遗留（R7/R9-10）+ `validate-report.md` §5 移交清单。分支 `feature/web-cli-plugin`；**未 git 提交**；`web-cli-base/**` 零改动。

### 10.1 任务完成清单

| 任务 | 名称 | 状态 | 主要落点 | 对应 FR/EC |
|------|------|:--:|------|------|
| TASK-012 | 协议完善（版本协商 + 站点中立协议文档 + 失败降级） | ✅ completed | `src/protocol/version.ts`、`src/discovery/discovery.ts`、`docs/protocol.md`、`test/protocol.test.ts`、`src/ui/options/index.html:54` | FR-013/014/015、EC-001/014 |
| TASK-013 | UI 操作 + 事件消费 | ✅ completed | `lgdl-web/src/web-cli-host/bridge.ts`、`plugin/src/content/page-bridge.ts`、`test/content.test.ts`、`lgdl-web/.../web-cli-host.test.ts` | FR-019/021、NFR-007 |
| TASK-014 | 风控护栏 + 合规/迁移/调试文档（P1 收口） | ✅ completed | `src/security/policy.ts`、`src/ui/sidepanel/sidepanel.ts`、`docs/compliance.md`、`docs/migration.md`、`docs/dev.md`、`docs/gate-d.md` | FR-029/031/032/036/037/039/040/044/045、EC-010/016 |
| TASK-015（可选） | 通用 DOM 工具面 | ✅ completed | `src/content/dom-agent.ts`、`src/platform/extension-env.ts`、`test/dom-agent.test.ts` | FR-008、EC-007、NFR-002/007 |

### 10.2 文件变更

| 操作 | 文件 | 任务 | 说明 |
|:--:|------|:--:|------|
| NEW | `packages/web-cli-plugin/docs/protocol.md` | 012 | 站点中立协议文档（descriptor/RPC/发现/信任/版本/事件/安全边界/标准化预留）；零私有格式耦合（grep 0 命中） |
| MODIFY | `src/protocol/version.ts` | 012 | `VersionNegotiation` 增 `notice`（可读提示）；导出 `isVersionUnusable`；accept/degrade/reject/非法四态均有可读文案 |
| MODIFY | `src/discovery/discovery.ts` | 012 | 新增 `failure.kind`（no-declaration / invalid-declaration / version-mismatch / transient）+ `failure.message`；`DiscoveryResult.version` 透出版本协商；成功态 `failure.kind='none'` |
| MODIFY | `src/security/audit-sink.ts` | 012 | 新增插件审计事件类型 `protocol-version` |
| MODIFY | `src/security/discovery-audit.ts` | 012 | 新增 `versionAuditEvent`（EC-014 入审计） |
| MODIFY | `src/content/content-script.ts` | 012/013 | discover 上报补 `failure/reason/version`；新增 `site-event` 路由 + 事件 push 转 background |
| MODIFY | `src/background/service-worker.ts` | 012/013/014 | discover 分支记录 `versionAuditEvent`；新增 `site-event`（转发 content）/`site-event-push`（fan-out）/`risk-control`（暂停/恢复/中止） |
| MODIFY | `src/ui/options/index.html:54` | 012 | 修正文档引用：指向现已存在的 `docs/compliance.md` / `docs/protocol.md` / `docs/migration.md`（闭合 R9-10） |
| MODIFY | `test/protocol.test.ts` | 012 | +7 用例（版本可读提示/审计 + 发现四类失败 + 成功态版本） |
| MODIFY | `packages/lgdl-web/src/web-cli-host/bridge.ts` | 013 | UI 操作经同一保留 router/op registry 执行（FR-019）；未注册工具可读拒绝；新增 `web-cli:event` 事件通道（懒装配 browser event hub，默认关） |
| MODIFY | `packages/web-cli-plugin/src/content/page-bridge.ts` | 013 | 新增事件桥 `events.{subscribe,pull,unsubscribe,status}` + `onEvent` push 下沉；pull 结果按上下文预算截断（NFR-007，含可读 note） |
| MODIFY | `test/content.test.ts` | 013 | +4 用例（事件代理/预算截断/notify 下沉/FR-019 门禁后 RPC） |
| MODIFY | `packages/lgdl-web/src/web-cli-host/web-cli-host.test.ts` | 013 | +2 用例（未注册工具可读失败 / 事件通道预算摘要） |
| MODIFY | `src/security/policy.ts` | 014 | 新增 `RiskGuard`（per-origin 令牌桶，可配 capacity/refillPerSec）+ pause/resume/stop/reset + 可读 block reason |
| MODIFY | `src/background/host.ts` | 014 | `site.*` dispatch 前置 `riskGuard.check`（可读 block，不静默）；暴露 `riskGuard/pauseRisk/resumeRisk/stopRisk` |
| MODIFY | `src/background/messaging.ts` | 013/014 | 新增消息种类 `site-event`/`site-event-push`/`risk-control` |
| MODIFY | `src/ui/sidepanel/sidepanel.ts` | 014 | 导出 `CONSENT_RISKS`/`CAPABILITY_BOUNDARY`/`consentSummary`；动态渲染知情同意区块 + 暂停/恢复/中止控件（不改 index.html）；模块底部加 `document/chrome` 守卫以支持 node 导入 |
| MODIFY | `test/security.test.ts` | 014 | +2 用例（令牌桶/可配/按 origin 独立；pause/stop/resume/reset） |
| MODIFY | `test/host.test.ts` | 014 | +1 用例（stop/pause 阻断可读、resume 恢复） |
| MODIFY | `test/sidepanel.test.ts` | 014 | +1 用例（知情同意/能力边界文案可读） |
| MODIFY | `docs/compliance.md` | 014 | §4 不适用清单补强：站点类型 S-1~S-7 / 操作类型 O-1~O-10 + 处置原则（FR-032） |
| NEW | `packages/web-cli-plugin/docs/migration.md` | 014 | 不自动迁移原则 + 差异清单 + 手动重配指引 + 过渡期双份维护控制（起止条件/收敛计划 C-1~C-5/终止时点/回退预案）（FR-036/039/040/S-015） |
| NEW | `packages/web-cli-plugin/docs/dev.md` | 014 | 本地 unpacked 加载 + 调试 + 热重载 + 冒烟方法论（无头可行性结论 + 机械面/人工面分离）（FR-044/045/ADR-006） |
| NEW | `packages/web-cli-plugin/docs/gate-d.md` | 014 | D-1~D-7 逐条可验收 + 验收记录模板 + 未达门槛处置（FR-037/EC-016）；`grep -c "D-[1-7]"`=17 |
| NEW | `packages/web-cli-plugin/src/content/dom-agent.ts` | 015 | `PlatformDomOps` 远程代理（transport 注入）+ 不可达可读转译 + 默认关 |
| MODIFY | `src/platform/extension-env.ts` | 015 | `assembleExtensionDom`：远程 DOM 缝装配；未注入 → `enabled:false` + 可读 reason |
| NEW | `packages/web-cli-plugin/test/dom-agent.test.ts` | 015 | +6 用例（必需/可选 op 代理、不可达转译、默认关、装配、稳定形状） |

### 10.3 验收对齐（tasks.json verify）

| 任务 | verify 命令 | 结果 |
|------|-------------|------|
| 012 | `npm run build && npm run test --workspace @lgdl/web-cli-plugin` | PASS（89 pass / 0 fail） |
| 012 | `! grep -rniE "lgdl" docs/protocol.md` | PASS（0 命中） |
| 013 | plugin + lgdl-web build/test | PASS（plugin 89 / lgdl-web 77，均 0 fail） |
| 014 | `ls docs/migration.md docs/dev.md docs/gate-d.md` | PASS（三文件存在） |
| 014 | `grep -c "D-[1-7]" docs/gate-d.md` | PASS（=17） |
| 015 | `npm run build && npm run test --workspace @lgdl/web-cli-plugin` | PASS |

### 10.4 全仓门禁 + 红线 grep（本轮复跑）

| 门禁 | 结果 |
|------|------|
| `npm run build` | PASS（plugin dist：background 936.5KB / content 33.4KB / sidepanel 12.2KB / options 893.9KB） |
| `npm test` | **0 fail**：core 267 / render 94(+1 skip) / router 8 / lgdl-web **77** / web-cli 84 / op-cli 15 / base **483** / plugin **89** |
| 插件 `tsc --noEmit` | PASS（0 error） |
| 红线 grep | 10 项 0 命中（私有依赖 / `.executor(` 直调 / content window 全局 / base 零改动 / protocol.md lgdl / silentAllow / ai-settings / llm localStorage / 空 catch / 运行时依赖仅 base） |

### 10.5 新增决策（D-017~D-020）

| # | 决策 | 说明 | 影响 |
|---|------|------|------|
| **D-017** | TASK-012「入审计」越出名义文件清单 | EC-014 要求版本协商「入审计」，但 TASK-012 名义文件仅 version/discovery/docs/test。实现新增 `protocol-version` 审计事件类型（audit-sink）+ `versionAuditEvent`（discovery-audit）+ content 上报 version + service-worker 记录，构成最小闭合链 | additive；不改 base；审计可追溯 |
| **D-018** | TASK-013 事件桥需扩展跨面消息 | FR-021「页内 env.events 代理 → background 事件通道」需在 messaging/content-script/service-worker 增加 `site-event`（请求代理）与 `site-event-push`（push 下沉）；`page-bridge.ts` 承载桥机制与上下文预算截断 | additive；默认关（订阅后才装配观察源） |
| **D-019** | TASK-014 风控护栏的 enforcement 落点 | `RiskGuard` 定义在 policy.ts，但真正生效需在 `host.dispatch` 对 `site.*` 前置检查；同时新增 `risk-control` 消息 + sidepanel 动态暂停/恢复/中止控件（不改 index.html）以达成 FR-029「用户可随时中止」 | additive；默认容量 60 / 补充 6·s⁻¹，可配；阻断可读不静默 |
| **D-020** | TASK-015 extension-env 装配远程 DOM 缝的依赖方向 | `platform/extension-env.ts` 值导入 `content/dom-agent.ts`（跨面 import）；dom-agent 仅 `import type` base，故 background bundle 未引入 base 新代码（936.5KB，+5.5KB 为 guard/dom-agent/消息面）；content bundle 33.4KB（+8.3KB 为事件桥，非 base） | 默认关；无消费者时 `enabled:false` + 可读 reason |

### 10.6 遗留（非阻塞，如实）

| # | 项 | 说明 | 归属 |
|---|----|------|------|
| — | LGDL 站点 `env.events` 事件 hub 未在 App 装配 | `bridge.ts` 已支持 `web-cli:event` 并默认懒建 browser event hub；App 未显式注入（无 UI 消费者）。站点事件通道 node 面已验证，真实浏览器事件闭环仍属人工面 | validate 人工面 |
| — | 任务内 `askUser`（R7）未接线 | 权限 ask 已可用；用户问答 ask 仍归后续（review §7.4 R7） | P1/后续 |
| — | R-BLK1a（id 白名单可被 `purge-list` 类命名绕过） | 本轮未加破坏性动词 denylist（不属 TASK-012~015 acceptance） | release 前 |
| — | 风控暂停/中止控件未纳入冒烟清单 | sidepanel 动态控件已在代码面就绪，未更新 `smoke-checklist.md` 人工面条目 | 下次文档同步 |

## 11. 遗留清账轮（R3：R8 / R-BLK1a / R7 / R9 / minors / EC / AC / NFR-007）

> **输入**: `validate-report.md` §5 遗留移交清单（11 项）+ `review-report.md` §7（R2 遗留 10 项）。
> **范围**: 只清账、不新增功能。**未 git 提交**（由上层统一提交）。`web-cli-base/**` 零改动。

### 11.1 遗留闭合表

| 遗留 | 严重度 | 结论 | 证据（file:line / 命令） |
|------|:--:|:--:|------|
| **R-BLK1a** 破坏性动词绕过 | 中·安全 | **已修复** | `src/tools/declared-tools.ts:89`（DESTRUCTIVE_VERBS）/`:175`（hasDestructiveVerb 逐段+子命令）/`:188`（isSafeReadOnlyTool 前置）；负向用例 `test/host.test.ts` R-BLK1a×4：validate 复现 5 例（purge-list/delete-all-list/wipe-get/drop-show/reset-status）全部 `≠read`；无确认 → deny 且 executor 未调用；有确认 → ask→allow |
| **R7** 任务内 askUser 未接线 | 低·功能 | **已修复** | `src/background/ask-bridge.ts:37`（deliver/timeout/settle，失败/超时可读取消）；`src/background/host.ts:84`（注册 base ask-user）；`service-worker.ts:111,124,393`（请求/应答桥）；`src/ui/sidepanel/chat-state.ts:144`（resolveAsk）+ sidepanel 问答 UI；`docs/capability-matrix.md` 第 17 行已与实现一致 |
| **R9-6** discovery fetch 落点 | 低 | **已决策并落实** | 选 content script 页面源 fetch（D-021）；`src/content/content-script.ts` 头部说明 + `docs/protocol.md §2` 落点说明；保持 discover() 可读降级（transient/absent/invalid） |
| **R9-7** transport.channel 动态绑定 | 低 | **已修复** | `src/content/page-bridge.ts:157,279`（bindTransport）；`src/content/content-script.ts:77`（发现成功后绑定）；`src/protocol/rpc.ts`（parseResult 支持声明 resultType）；`docs/protocol.md §6`；用例 `test/content.test.ts`、`test/protocol.test.ts` |
| **R9-8 / EC-012** 双工具面冲突用例 | 低 | **已修复** | `packages/lgdl-web/src/web-cli-host/web-cli-host.test.ts` 新增「assistant + host routers 共存」：无共享注册表 / 无重复注册 / 单次 RPC 仅执行一次 / `site.*` 与内置助手工具名不冲突（lgdl-web 77→78） |
| **R9-10** 文档引用一致性 | 低 | **已修复并回归** | `docs/protocol.md`/`gate-d.md`/`migration.md`/`dev.md` 均存在；`options/index.html:54-55` 引用 compliance/protocol/migration；`test/docs.test.ts`×3 断言文件存在 + options/smoke/capability-matrix 交叉引用无悬空 |
| **R9-12** FR-037/038 优先级不一致 | 低 | **已修复** | `spec.md` v1.1→v1.2：FR-037 归 P1（`docs/gate-d.md`，TASK-014）、FR-038 归 P2/波3；§5.8 增归属说明；修订记录 v1.2 |
| **minors** requestOriginPermission 双调用 | 低 | **已修复** | 双调用收敛（D-022）：side panel 手势内申请并上报 `hostPermissionGranted`（`sidepanel.ts`），background 读取上报值/回退 `hasOriginPermission`（`service-worker.ts:280`），Revoke 时 `removeOriginPermission` + 审计 `host-permission`（`:288-299`） |
| **minors** 死代码清理 | 低 | **已修复** | `unsupported.ts` 移除测试专属 re-export（D-023，保留 `capabilityFailure`）；`host.activeOrigin` 接入 `descriptor-show`（`service-worker.ts:141-149`）；`controller.clear` 接入 `chrome.tabs.onRemoved`（`service-worker.ts:480`）；另清零引用导出（PLUGIN_ADMIN_NAMESPACE/parseProbe/redactText/redactRecord/summarizeQuestion）；`normalizeDescriptor`/`defaultSource`/`isVersionUnusable` 接入 discovery 路径 |
| **minors** smoke-checklist 同步 | 低 | **已修复** | `docs/smoke-checklist.md` 新增 M18~M23（风控/事件桥/dom-agent/ask-user/动态通道/denylist）与 H8~H10 |
| **EC-008** 权限撤销流 | — | **已补齐** | `removeOriginPermission`（`extension-env.ts`）+ revoke 流 + `permissions.onRemoved` 审计（`service-worker.ts:428`）；用例 `test/extension-env.test.ts`「EC-008 revoke → 移除 → false → 重新申请」；授权（OriginStore）不受影响 |
| **EC-009** 逐厂商 CORS 结论 | — | **已补齐** | `docs/compliance.md §7` 8 厂商逐项直连结论（SW 扩展源不受页面 CORS；volc 3 端点 G-KEY 401 实测同 host）；用例 `test/llm.test.ts` 断言 8 厂商端点 host 均被 manifest `host_permissions` 覆盖 |
| **EC-012** 完整承接 | — | **已补齐** | 同上 R9-8（含页面 host router 单实例/无双重执行） |
| **AC-004** partial | — | **可达部分补齐** | ask 三路（权限确认 + 任务内 ask-user）齐备；事件桥/矩阵已更新；等价性以 node + e2e 承接 |
| **AC-007** partial | — | **可达部分补齐** | 逐厂商结论（EC-009）+ 独立配置 + `test/llm.test.ts` 断言 key-store 不触碰 `lgdl-ai-settings`/localStorage；迁移指引 `docs/migration.md` |
| **AC-011** partial | — | **可达部分补齐** | `docs/dev.md`（unpacked 调试 + 冒烟方法论 + R8 E2E）；`test/docs.test.ts` 断言文档存在/引用；发布渠道（FR-046）仍归 P2 |
| **AC-009 / AC-010（=R8）** | 中 | **自动化可重复（如实）** | 见 §11.4：真实产物 CDP headless 全链 PASS ×2 场景（非 LGDL fixture = AC-010；LGDL Workbench 真实构建 = AC-009）+ 唯一偏差披露；剩余人工 UX 清单已文档化 |
| **NFR-007** | — | **已定义阈值并实测** | 见 §11.5；`docs/dev.md §8` + `test/perf-budget.test.ts`×4 |

**未完成（如实）**：TASK-016（`docs/release.md` 发布渠道 + FR-038 下线执行，P2/Gate-D 前置）；LGDL 站点 `env.events` App 装配；真实浏览器人工 UX 项（H0/H2/H4/H6/H7/H8/H9/H10）；扩展 SW 真实内存采样。

### 11.2 新增/修改测试清单

| 文件 | 变更 | 用例数 |
|------|------|:--:|
| `test/host.test.ts` | +R-BLK1a×4、+ask-user×2 | +6 |
| `test/ask-bridge.test.ts` | 新增（deliver/settle/timeout/delivery-fail/unknown） | +4 |
| `test/sidepanel.test.ts` | +ask-user 状态/解析 | +1 |
| `test/content.test.ts` | +动态 transport 绑定 | +1 |
| `test/protocol.test.ts` | +声明 resultType 解析 | +1 |
| `test/extension-env.test.ts` | +EC-008 撤销流（并扩 no-chrome 断言 removeOriginPermission） | +1 |
| `test/llm.test.ts` | +EC-009 逐厂商覆盖、+AC-007 key-store 隔离 | +2 |
| `test/perf-budget.test.ts` | 新增（NFR-007 预算/会话/派发/产物体积） | +4 |
| `test/docs.test.ts` | 新增（R9-10/AC-011 文档存在与引用） | +3 |
| `packages/lgdl-web/src/web-cli-host/web-cli-host.test.ts` | +EC-012 双工具面 | +1 |
| `test/e2e/fullchain.mjs` | 新增 R8 全链脚本（`npm run test:e2e`，非 node:test） | 9 断言 |

> 既有测试零删除零降级：base 483 不变；lgdl-web 66→75→77→**78**（仅增）；plugin 68→89→**112**（仅增）。`test/unsupported.test.ts` 改为直接断言上游 base 归属契约（断言集合不变，非降级）。

### 11.3 全仓门禁 + 红线 grep（本轮复跑）

| 门禁 | 结果 |
|------|------|
| `npm run build` | PASS（plugin dist：background 968442B / content 34711B / sidepanel 15512B / options 915305B） |
| `npm test` | **0 fail**：core 267 / render 94(+1 skip) / router 8 / lgdl-web **78** / web-cli 84 / op-cli 15 / base **483** / plugin **112** |
| 插件 `tsc --noEmit` | PASS（0 error） |
| `npm run test:e2e` | **PASS**（真实 dist CDP headless 全链；见 §11.4） |
| `git status packages/web-cli-base` | 空（零改动） |
| 红线 grep | 0 命中：silentAllow/`return …riskHint` / `.executor(` 直调 / content `(window\|globalThis).*=` / 私有依赖 `@lgdl/(lgdl-web\|web-cli\|op-cli\|core…)` / `lgdl-ai-settings` / 空 catch（代码行）；插件运行时依赖仅 `@lgdl/web-cli-base ^0.7.0` |
| 无引用导出（新增检查） | 0 个「全仓（src+test+lgdl-web）零引用」导出；本轮已清 8 个（见 §11.1 minors）；剩余 `assembleExtensionDom/createDomAgent/buildResult/buildDescriptorMessage/parseInvoke/isWebCliMessage` 为协议页侧/契约/DOM 缝的测试参照面，均被 `test/` 引用（非零引用） |

### 11.4 R8 结论（真实产物全链）

- **真做到**：`test/e2e/fullchain.mjs`（`npm run test:e2e`）加载**真实 `dist/` 字节**（background.js/content.js 与发布一致），CDP 驱动 headless Chromium，打通 **content→background→host→RPC** 全链，两个场景均 **PASS**：
  - **A. 非 LGDL fixture（AC-010）**：发现上报 → 授权 → mock LLM 工具调用 → 真实 host 门禁/风险策略 → 站点 `postMessage` RPC → 页面执行 → 二次确认门禁 → 结果回填 → 多轮会话 → 审计导出（读回 `welcome` / 写经确认放行 / 二次读观察到 `from-e2e`）。
  - **B. LGDL Workbench 真实构建（AC-009）**：加载 `packages/lgdl-web/dist` 真实产物 → 运行时握手发现 `site.lgdl-web-cli` → 授权 → `lgdl-web-cli status` 读全链返回图内容（`nodes`）→ 审计。
- **唯一偏差（明示）**：manifest 副本的 `host_permissions` 追加本地 fixture/LLM origin（`http://127.0.0.1:<port>/*`）；dist 的 JS 字节与发布产物一致。原因：`optional_host_permissions` 的 `chrome.permissions.request` 需真实用户手势 + 原生权限弹窗，headless 无法合成（validate V9b 实证）。**不冒充「无偏差真实产物全链 PASS」**。
- **剩余人工 UX 项（已文档化）**：`docs/dev.md §7.4` + `docs/smoke-checklist.md §2`（H0/H2/H4/H6/H7/H8/H9/H10）。
- 顺带修复（additive）：content 上报 discover 时由 background 依 `sender.tab.id` 绑定会话（对按需注入路径更稳健；action-click 路径不变）——`service-worker.ts` discover 分支。

### 11.5 NFR-007 阈值定义与实测

| 维度 | 阈值 | 实测（2026-09-12） | 判定 |
|------|------|------|:--:|
| `content.js` 注入体积 | ≤ 64 KB | 33.9 KB（34711 B） | ✅ |
| `background.js` | ≤ 1.2 MB | 968442 B | ✅ |
| 事件上下文摘要 | ≤ 10 条/次 | 10（`EVENT_CONTEXT_SUMMARY_N`） | ✅ |
| 单事件负载 | ≤ 4096 字符 | base `DEFAULT_BUDGETS.payloadBudgetChars` | ✅ |
| 事件速率 | ≤ 200 条/s | base `event-bus` 护栏 | ✅ |
| 会话历史 | ≤ 40 turn | 500 turn 提交后快照 = 40，首条 user | ✅ |
| 审计缓冲 | ≤ 500 | `DEFAULT_AUDIT_CAPACITY` | ✅ |
| 风控令牌桶 | 60 / 6·s⁻¹ | `createRiskGuard` 默认 | ✅ |
| RPC / 握手超时 | 30s / 3s | `protocol/rpc.ts` | ✅ |
| 50 次已授权读派发 | < 250 ms | ~0.9 ms/call（200 次 180.9 ms） | ✅ |

> 回归护栏：`test/perf-budget.test.ts`；文档：`docs/dev.md §8`。扩展 SW 真实内存采样归人工面。

### 11.6 新增决策（D-021~D-029）

| # | 决策 | 说明 |
|---|------|------|
| **D-021** | R9-6 discovery fetch 落点 | ①② 由 content script 页面源 fetch（无 host 权限即可发现，失败可读降级）；plan §3.2 后台特权 fetch 留 wave-2（持权限后） |
| **D-022** | requestOriginPermission 收敛 + revoke 移除权限 | side panel 手势内申请并上报；background 读上报/回退 `hasOriginPermission`；revoke 调 `removeOriginPermission` + 审计 |
| **D-023** | unsupported.ts 死导出清理 | 移除测试专属 re-export/wrapper，保留 `capabilityFailure`；测试改断言上游 base 契约（等价） |
| **D-024** | R-BLK1a denylist | 破坏性动词逐段+子命令判定；命中不得 read→allow（write/ask 或 undefined/deny） |
| **D-025** | R7 askUser 接线 | base ask-user 工具 + `ask-bridge` + sidepanel Q&A + messaging 两 kind |
| **D-026** | R9-7 动态通道绑定 | `bindTransport` + discovery 后按 descriptor.transport 绑定 + parseResult 支持声明 resultType |
| **D-027** | R9-8/EC-012 | lgdl-web 双工具面共存用例（无共享注册表/无双重执行/命名空间不冲突） |
| **D-028** | NFR-007 量化 | 阈值定义 + `test/perf-budget.test.ts` + `docs/dev.md §8` |
| **D-029** | R8 E2E 固化 | `test/e2e/fullchain.mjs` + `npm run test:e2e`；唯一偏差披露，不冒充无偏差 |

### 11.7 未完成/偏差如实标注

- **FR-038 下线执行**未做（P2/波3 独立里程碑；EC-016 未达不下线）；`lgdl-web/src/ai/*` 仍在（TASK-016 才删）。
- **负偏差**：R8 为带唯一偏差的机制全链，非无偏差真实产物；**无把 harness 当真实产物 PASS**。
- 人工 UX 项（授权弹窗/真实 LLM/LGDL 真实页等）与 SW 内存采样未做，已列清单。
- `spec.md` 本轮修改（v1.2）仅补注 FR-037/038 归属与修订记录，需求语义零变更；这是应遗留 R9-12 的显式要求（用户指令优先于「不修改规范」通则）。

## 12. P2 终收口轮（R4：TASK-016 发布渠道 + Gate-D 内置助手下线执行）

> 执行顺序遵循任务要求：**步骤 0 Gate-D 前置评估 → 步骤 1 回退预案 → 步骤 2 下线执行 → 步骤 3 发布渠道 → 步骤 4 文档/登记联动**。未 git 提交（由上层统一提交）。

### 12.1 步骤 0：Gate-D 逐条评估（D-1~D-7）

| 条件 | 判定 | 证据 |
|------|------|------|
| D-1 能力对齐矩阵达标 | **PASS** | `docs/capability-matrix.md` §2：最小能力集 8/8 均由 P0（6）+ P1/TASK-013（2）实现承载；§1 矩阵 34 项逐项归属，无「后置/不适用」落在最小集内 |
| D-2 安全基线全达标 | **PASS** | 插件测试 112 pass / 0 fail（security/host/content/sidepanel）；`grep -rn "silentAllow\|allowSilently" src` = 0；`grep -rnE "\.executor\(" src` = 0（全经 dispatch）；审计覆盖发现/授权/确认/执行（`test/security.test.ts`） |
| D-3 LGDL 端到端闭环 | **PASS（自动化面）/ ⏳ 人工面 H6 待执行（已文档化非阻塞）** | lgdl-web 测试 31 pass（web-cli-host 12：声明/dispatch/写回校验/onApply 恰好一次/隔离/事件代理）；`npm run test:e2e` 场景 B（LGDL Workbench 真实 dist）PASS（发现→授权→`site.lgdl-web-cli` 读→审计 7 事件）；人工面 H6（真实页写回 + 零回归）属 `docs/smoke-checklist.md` §2 已文档化非阻塞人工项，未记为 PASS |
| D-4 通用站点端到端 | **PASS** | `test/e2e.generality.test.ts` 全绿；`npm run test:e2e` 场景 A（非 LGDL fixture）PASS（发现→声明→授权→写确认门禁→再现→审计 11 事件）；冲突检测无重复注册 |
| D-5 存量迁移路径可用 | **PASS** | `docs/migration.md` 含不自动迁移/差异清单/手动重配/习惯对照；插件 `src/` 无 `lgdl-ai-settings`（0 命中）、`src/llm` 无 `localStorage`（0 命中）；`test/llm.test.ts` AC-007 通过 |
| D-6 回退预案就绪 | **PASS** | `docs/migration.md` §5.4；flag 落地 `lgdl-web/src/fallback-flag.ts`（仅 `'on'` 启用，默认 off）+ `src/vite-env.d.ts`；无 `.env*` 设值；主回退 = 单提交 `git revert`；C-4 显式移除时点 |
| D-7 过渡期收敛计划 | **PASS** | `docs/migration.md` §5.1 起止/关闭时点 + §5.3 C-1~C-5（含执行状态）+ §5.5 下线执行记录 |

**判定**：D-1~D-7 达标（D-3 人工面 H6 为已文档化非阻塞人工项，依 TASK-016 指令口径不阻塞）→ 执行下线。记录同步写入 `docs/gate-d.md §2`。

### 12.2 步骤 1：回退预案（先于下线）

- **主预案**：下线为**单一提交/单一工作树**，可 `git revert` 恢复（前一版本保留 `ai/` 全量）。本仓库未 git 提交，回退单位 = 上层提交的下线提交。
- **开关**：新增 `packages/lgdl-web/src/fallback-flag.ts`（`AI_ASSISTANT_FALLBACK_ENABLED = import.meta.env.VITE_AI_ASSISTANT_FALLBACK === 'on'`，**默认 off**）+ `src/vite-env.d.ts` 类型声明；消费点 = AI 区域迁移告知（on 时额外显示回退路径）。**语义边界**：因同提交删除 `ai/*`，flag 不在本构建恢复旧面板，恢复须 `git revert`（D-032）。
- **显式终止时点**：`docs/migration.md` §5.3 C-4（下线后下一版本移除 flag）与 C-5（关闭过渡期）。
- **不静默（EC-016）**：App.tsx AI 区域静态迁移告知（提供插件安装/授权步骤 + 迁移/回退文档指引），无 `AiPanel` 时不留空白。

### 12.3 步骤 2：下线执行清单

| 操作 | 对象 | 说明 |
|------|------|------|
| DELETE | `packages/lgdl-web/src/ai/AiPanel.tsx` | 助手面板 |
| DELETE | `packages/lgdl-web/src/ai/AskDialog.tsx` | 授权 ask 桥 UI |
| DELETE | `packages/lgdl-web/src/ai/SettingsPanel.tsx` | 页内 BYOK 设置面板 |
| DELETE | `packages/lgdl-web/src/ai/prompts.ts` | system prompt |
| DELETE | `packages/lgdl-web/src/ai/provider.ts` | 助手 provider/设置持久化 |
| DELETE | `packages/lgdl-web/src/ai/session.ts` | `createAiSession` 组装点 |
| DELETE | `packages/lgdl-web/src/ai/provider.test.ts` | 删除（21 用例） |
| DELETE | `packages/lgdl-web/src/ai/session.test.ts` | 删除（26 用例） |
| — | `src/ai/` 目录 | 删除后不存在（`test ! -d` 通过） |
| MODIFY | `packages/lgdl-web/src/App.tsx` | 移除 5 条助手 import（AiPanel/SettingsPanel/createAiSession+LGDL_DEFAULT_POLICY_RULES/loadSettings+ProviderSettings/createIdbStorage+AskQuestion/AskResolution/StorageBackend）；移除 `aiSettings`/`aiSettingsOpen`/`saveAiSettings`/`aiSettingsRef`/`permAskTarget`/`aiPolicy`/`restorable`/`persistBackend`/`aiSession` 及其 effects；`applyAiSource` → `applySource`；AI 区域改为静态迁移告知；移除 SettingsPanel 模态；**保留** `web-cli-host` 挂载 + base 机制层 + 编辑器折叠/op-cli 工具面 |
| MODIFY | `packages/lgdl-web/package.json` | test script 移除 `src/ai/provider.test.ts`、`src/ai/session.test.ts` 及 `dist-test/ai/*.test.js` |
| MODIFY | `packages/lgdl-web/src/web-cli-host/web-cli-host.test.ts` | 移除 3 条助手 import；EC-012 双工具面用例 1:1 改写为「下线后单工具面不变量」（计数 12 不变，见 D-031） |
| NEW | `packages/lgdl-web/src/fallback-flag.ts` + `src/vite-env.d.ts` | 回退开关 + 类型 |
| MODIFY | `packages/lgdl-web/src/app.css` | 新增 `.ai-migrated-*` 迁移告知样式；遗留设置面板 CSS 注释中性化（D-033/D-034） |
| — | `packages/web-cli-base/**` | **零改动**（`git status` 空） |
| — | `packages/lgdl-web/src/web-cli-host/**` | **保留**（替代载体） |

### 12.4 步骤 3：发布渠道（FR-046）

新建 `packages/web-cli-plugin/docs/release.md`：首版渠道 = 本地 unpacked + 自托管/未打包分发；`dist/` 分发物构成与构建核对；版本管理（版本号来源/版本位约定/可重复构建/R8 偏差仅测试副本）；商店发布后续（S-016）；引用 dev/smoke/migration/compliance/protocol。

### 12.5 步骤 4：文档/登记联动

- `docs/gate-d.md`：§2 填入 D-1~D-7 实际验收记录（v1.1）；`docs/migration.md`：§1.1 不静默提示 / §5.1 终止与关闭时点 / §5.3 C-1~C-5 执行状态 / §5.4 flag 落地与语义边界 / §5.5 下线执行记录（v1.1）；`docs/capability-matrix.md`：最小能力集 8/8 复核 + 下线状态（v1.1）。
- `.sddu/specs-tree-root/ROADMAP.md`：v1.14.0 素材增补（P1/P2 全量实现 + TASK-016 下线执行 + 发布渠道就绪）；版本总览表/落地进展/里程碑/依赖树/修订记录联动。
- `state.json`：`buildProgress.completedTasks` += TASK-016；round/fixRound/buildTest/GATE-016/artifacts/deviations/notDone/notes 更新；phase=builded / workflow=6.review。

### 12.6 全仓门禁 + 红线 grep（本轮复跑）

- `npm run build` 全仓 **PASS**（含 lgdl-web vite build + 插件 esbuild dist）。
- `npm test` 全仓 **0 fail**：`lgdl-core 267` / `lgdl-render 94+1skip` / `lgdl-router 8` / **`lgdl-web 31`** / `lgdl-web-cli 84` / `lgdl-web-op-cli 15` / **`web-cli-base 483`（零回归）** / **`web-cli-plugin 112`**。
- 插件 `tsc --noEmit` **0 error**；`npm run test:e2e --workspace @lgdl/web-cli-plugin` **PASS**（场景 A fixture / 场景 B LGDL Workbench 真实 dist）。
- **lgdl-web 删除前后计数对照**：78 → 31（-47）。逐文件：`locate.test.ts 11`（不变）/ `snap.test.ts 8`（不变）/ `web-cli-host.test.ts 12`（EC-012 用例改写，计数不变）/ `ai/provider.test.ts 21`（删）/ `ai/session.test.ts 26`（删）= 删除 47。**除 `src/ai/*` 外无其他测试删除或降级**（D-005 守恒：明确例外 = 下线后 EC-012 用例语义改写，1:1 保留计数）。
- `test ! -d packages/lgdl-web/src/ai` **通过**（无「ai/ 未移除」输出）。
- `git status packages/web-cli-base` **空**（base 零改动）。
- 红线 grep（`AiPanel|SettingsPanel|createAiSession|src/ai/`）：**下线目标与活代码零残留**——`lgdl-web/src/App.tsx`、`package.json`、`web-cli-host/**`、`web-cli-plugin/src/**` 均 0 命中。剩余命中均为**历史/文档**：`web-cli-base/src/**`（5 文件迁移溯源注释，**红线不改**）、`lgdl-web-cli/src/{help,protocol}.ts`（旧路径迁移注释）、`web-cli-plugin/docs/{capability-matrix,migration}.md`（下线记录文档）。如实披露，未冒充全仓 0 命中。
- 安全红线复跑：`silentAllow` 0 命中、`.executor(` 0 命中、插件 `lgdl-ai-settings` 0 命中、`src/llm` `localStorage` 0 命中。

### 12.7 新增决策（D-030~D-035）

| # | 决策 | 说明 |
|---|------|------|
| **D-030** | Gate-D 判定口径 | D-1~D-7 达标；D-3 拆「自动化面 PASS + 人工面 H6 已文档化非阻塞」，按 TASK-016 指令口径执行下线，未把 H6 记为 PASS |
| **D-031** | EC-012 用例改写 | 助手删除后双工具面前提消失；`web-cli-host.test.ts` EC-012 改写为下线后单工具面不变量（1:1，计数 12 不变），非删除非降级 |
| **D-032** | `VITE_AI_ASSISTANT_FALLBACK` 落地 | `src/fallback-flag.ts` + `src/vite-env.d.ts`，默认 off；语义边界=不恢复旧面板，恢复须 `git revert`；锚定 C-4 |
| **D-033** | 不静默（EC-016） | AI 区域改为静态迁移告知卡片（`.ai-migrated-*`），不改布局结构 |
| **D-034** | 注释级红线清理 | 清理 `web-cli-plugin/src/llm/providers.ts` 旧路径交叉引用 + `lgdl-web-op-cli/src/handlers.ts` stale AiPanel 注释；`web-cli-base`/`lgdl-web-cli` 历史溯源注释依红线不改 |
| **D-035** | plan 字面张力消解 | plan §3.8「flag 启用旧面板」与删除 `ai/*` 冲突；以「主回退=revert、flag=里程碑锚点」消解，未改 spec/plan |

### 12.8 未完成/偏差如实标注

- **Gate-D D-3 人工面 H6**未执行（真实浏览器交互无法自动化，已文档化非阻塞）；自动化面已 PASS。
- **C-4/C-5 过渡期关闭**未做（下线后下一版本：移除 flag + 文档归档 + 遗留 CSS 清理）。
- **商店发布（S-016）**未做（FR-046 已定义渠道，商店为后续）。
- 剩余红线 grep 命中均为 `web-cli-base`（红线）与 `lgdl-web-cli` 历史溯源注释及下线文档，已如实披露（D-034）。
- 本仓库**未 git 提交**（由上层统一提交）。

## 13. UI 修复记录（TASK-017：首次截图式 UI 审查 F-1~F-9）

> 触发：P2 结束后对插件做首次**截图式 UI 审查**（`/tmp/ui-audit/` A~E 截图 + `report.json` + `audit.mjs`）。本轮只做 UI/UX 修复，**不改 base、不引入 UI 框架/新运行时依赖、不 git 提交**。证据脚本 `/tmp/ui-audit/measure.mjs`（audit.mjs 基础上增加溢出实测）。

### 13.1 第一步：先量化（实测数字，用数据说话）

复跑审计脚本，对 `sidepanel.html` / `options.html` 实测 `document.documentElement.scrollWidth` vs `clientWidth`、遍历 `getBoundingClientRect().width > innerWidth` 的元素、以及 `scrollWidth > clientWidth` 的文本元素。

| 页面 | innerWidth | doc scrollWidth/clientWidth（前） | 水平溢出 | 超宽元素 | 疑似「裁切」文本 |
|------|:--:|:--:|:--:|:--:|:--:|
| A options 900 | 900 | 900 / 900 | 否 | 0 | 0 |
| C options 900 | 900 | 900 / 900 | 否 | 0 | 0 |
| E options 400 | 400 | 400 / 400 | 否 | 0 | 0 |
| B sidepanel 400 | 400 | 385 / 385 | 否 | 0 | 0 |
| B sidepanel 320 | 320 | 305 / 305 | 否 | 0 | 0 |
| D sidepanel 400 | 400 | 385 / 385 | 否 | 0 | 0 |

**结论（重要）**：截图中「知情同意」区块文字右侧被裁切是**截图观感，不是真溢出**——`#consent` 的 `scrollWidth === clientWidth`（400px 视口下均为 369；320px 下均为 289），无任何元素宽度 > 视口，无 `scrollWidth > clientWidth` 的文本元素。真实观感成因 = `ul` 默认只有左缩进、无右留白，CJK 文本换行后贴边（且 CJK 标点可悬挂），看起来像被切。F-7 因此按「防御性排版 + 右留白」修复，而非修一个不存在的溢出。

### 13.2 F-1~F-9 逐项结果

| # | 需求 | 状态 | 证据（file:line） |
|---|------|:--:|------|
| **F-1** | side panel 明确「配置模型 / 设置」入口（调 `openOptionsPage`），位于顶部状态区 | ✅ | `src/ui/sidepanel/index.html:50-53`（`#open-options` 于 `#status` 下）；`sidepanel.ts:290-293`；纯缝 `view-model.ts:139` |
| **F-2** | 显示 LLM 状态：未配置（醒目 + 一键去配置）/ 已配置（厂商 · 模型）；background 只回摘要 | ✅ | 新消息 `messaging.ts:28,63` + `service-worker.ts:388-390`；摘要投影 `src/llm/status.ts:31`（丢弃 `apiKeyMasked`）；渲染 `sidepanel.ts:106-115` + `view-model.ts:28-42`；回归：`test/sidepanel-view.test.ts`（summary 无 key / 三态） |
| **F-3** | 首次使用分步引导，状态驱动（未配置只强调第 1 步；已配置未授权强调授权） | ✅ | `view-model.ts:45-84`（5 步 + `current`=首个未完成 + `configured&&authorized` 隐藏）；`sidepanel.ts:117-140`；测试覆盖四态 |
| **F-4** | 知情同意默认折叠、置于底部、文案零删改；风险控件不藏 | ✅ | `sidepanel.ts:207-243`（`<details>` + `CONSENT_DEFAULT_OPEN=false`）；控件在 `section.appendChild(details)` 之后保持可见；`view-model.ts:127-129`；测试断言 `<details>` 且无 `.open=true` |
| **F-5** | `#log` 空态显示占位文案 | ✅ | `sidepanel.ts:64-68` + `view-model.ts:119-122`；`index.html:26-29`（`.empty` 收缩居中）；测试断言文案 |
| **F-6** | 无 `activeOrigin` 时「撤销授权」disabled；复核 authorize/send/revoke 一致性 | ✅ | `view-model.ts:104-115`（revoke=有 origin 且已授权；send=pending 或无 origin）；`sidepanel.ts:82-85`；composer 同步守卫 `sidepanel.ts:300`（防 Enter 绕过 disabled）；测试覆盖 4 组 |
| **F-7** | 修水平溢出（如存在）+ 防御性样式；窄宽度无横向滚动/文字不裁切 | ✅（实测无溢出，按防御性修复） | `index.html:9,37,40`（`box-sizing`/`overflow-wrap:anywhere`/`#input{flex:1;min-width:0}`/`details` `min-width:0`）；**after 实测全页 0 溢出 / 0 超宽 / 0 截断** |
| **F-8** | options：如何使用 + 本页如何打开 + 未配置醒目提示 + 保存后清空 Key + maxRounds 说明 + 400px 不破版 | ✅ | `src/ui/options/index.html:27-39`（如何使用/本页如何打开）、`:41`（`#key-warning`）、`:59-61`（`#maxRounds-hint`）；`options.ts:32-36`（`setKeyWarning`）、`:74-77`（保存后清空 Key）；after E 实测 `apiKeyValueAfterSave === ''` |
| **F-9** | 默认模型 ID 核验（可能臆造） | ⚠️ 待核（**未改动**，见 §13.3） | `src/llm/providers.ts:39-46` 与原始实现 100% 一致 |

### 13.3 F-9 核验结论：与原始实现 100% 一致，但真实性待核（未改动）

核验方法 = 用 git 历史恢复被 TASK-016 删除的原始实现 `git show 762d3a6^:packages/lgdl-web/src/ai/provider.ts`，与 `src/llm/providers.ts` 逐项比对（脚本解析 `{ id, name, defaultModel }`）：

| 字段 | 原实现（762d3a6^） | 插件现值 | 一致？ | 依据 |
|------|------|------|:--:|------|
| deepseek.defaultModel | `deepseek-v4-flash` | `deepseek-v4-flash` | ✅ | `git show 762d3a6^:.../provider.ts` |
| qwen.defaultModel | `qwen-plus` | `qwen-plus` | ✅ | 同上 |
| volc.defaultModel | `doubao-seed-1-6-250615` | `doubao-seed-1-6-250615` | ✅ | 同上 |
| volc-coding.defaultModel | `deepseek-v4-flash` | `deepseek-v4-flash` | ✅ | 同上 |
| volc-plan.defaultModel | `ark-code-latest` | `ark-code-latest` | ✅ | 同上 |
| tencent.defaultModel | `hunyuan-turbo` | `hunyuan-turbo` | ✅ | 同上 |
| openai.defaultModel | `gpt-4o-mini` | `gpt-4o-mini` | ✅ | 同上 |
| claude.defaultModel | `claude-3-5-haiku-latest` | `claude-3-5-haiku-latest` | ✅ | 同上 |

**结论**：插件默认模型 **不是 TASK-016 臆造的**，而是逐字继承自原始实现（TASK-016 仅改了 provider.ts 的文档注释，`git show 762d3a6 -- src/llm/providers.ts` 实证；`defaultModel` 一字未动）。按本轮指令「若无法确证 → 如实标注为待核，不要乱改」，**未修改任何模型 ID**。

**遗留疑点（如实标注）**：`deepseek-v4-flash` 本身对公网 DeepSeek API 的真实性无法在本地确证——该 ID 由提交 `5a77a6c`（2026-08-23）把原 `deepseek-chat` 改为 `deepseek-v4-flash` 引入，而同日（2026-09-12）提交 `e9506ac` 又把 `.opencode/opencode.json` 里同名的 agent 模型改为 `deepseek-flash`。两者命名域不同（opencode agent provider vs. `api.deepseek.com`），**不能据此断言插件值错误**；标注为**待作者核签/联网核实**后再定，未擅自改动。`volc-coding` 用 `deepseek-v4-flash` 与原实现一致（火山 Coding 端点语义）。

### 13.4 测试与回归

- **新增测试**：`test/sidepanel-view.test.ts`（12 用例）——llm-status 摘要不泄露 key、三态视图、messaging `llm-status` kind、onboarding 状态驱动四态、按钮禁用语义四组、空态文案、折叠默认收起、`openSettingsPage` 调用、sidepanel/options 静态 UI 面与源码断言。
- **既有测试零删除零降级**：插件 112 → **124**（+12，全为新增文件）；base **483 零回归**；lgdl-web 31；core 267；render 94+1skip；router 8；web-cli 84；op-cli 15。
- **全仓**：`npm run build` 退出码 0；`npm test` 全仓 **0 fail**（合计 1106 pass / 1 skip）。
- **插件**：`tsc --noEmit` 0 error；`npm run test:e2e`（真实 dist 全链）场景 A/B **PASS**。
- **红线**：`packages/web-cli-base/**` `git status` 空；插件 `dependencies` 仍仅 `@lgdl/web-cli-base`、devDeps 不变；src 内 `react|vue|svelte|jquery|tailwind|jsdom` 0 命中；`src/ui/sidepanel/**` 无 `apiKey` 引用（摘要路径零明文）。
- **重截回归**（同脚本、同视口，输出 `/tmp/ui-audit/after/`）：水平溢出前后均无，但 after 额外达成 **0 超宽元素 / 0 截断文本**（前：E 因 CJK 标点悬挂有 1 处 3px `#saved` scrollWidth 差，after 加右留白后归零）；E 保存后 `apiKeyValueAfterSave` 前 `sk-test-xxxx` → 后 `''`。

### 13.5 新增决策（D-036~D-042）

| # | 决策 | 说明 |
|---|------|------|
| **D-036** | UI 修复「先量化」口径 | 实测确认截图右侧裁切为观感（`scrollWidth===clientWidth`，无超宽元素），非真溢出；F-7 按防御性排版（`box-sizing`/`overflow-wrap`/`min-width:0`/右留白）修复并新增 after 实测回归，不宣称修复了不存在的溢出来源。 |
| **D-037** | `llm-status` 只回摘要 | 新增零依赖模块 `src/llm/status.ts`：`toLlmStatusSummary` 只投影 `configured/providerId/providerName/model`，丢弃 `apiKeyMasked`；sidepanel 不 import key-store/providers，避免把 LLM SDK 打进侧栏 bundle（`sidepanel.js` 15.1→20.9KB 纯为新增 UI 逻辑）。 |
| **D-038** | 设置入口 | sidepanel 顶部 `#open-options` 调 `chrome.runtime.openOptionsPage()`（未配置时文案变「去配置模型」并醒目）；抽出 `openSettingsPage(api)` 可测缝。 |
| **D-039** | 引导/空态 | `buildOnboarding` 5 步状态驱动（`current`=首个未完成；`configured&&authorized` 隐藏）；`#log` 空态用 `LOG_EMPTY_TEXT` 占位并收缩高度，不再是一大块空白。 |
| **D-040** | 知情同意折叠 | 改 `<details>` 默认收起（`CONSENT_DEFAULT_OPEN=false`），置于面板底部；`CONSENT_RISKS`/`CAPABILITY_BOUNDARY` 文案零删改（既有断言仍通过）；风控控件留在折叠外。 |
| **D-041** | 按钮禁用语义统一 | `buttonStates`：authorize=有 origin 且未授权；revoke=有 origin 且已授权（F-6 修静默无效）；send=pending 或无 origin；composer 提交路径同守卫（Enter 不绕过 disabled）。 |
| **D-042** | F-9 不改模型 ID | 与原始实现逐项一致（无臆造），但 `deepseek-v4-flash` 真实性本地无法确证 → 如实标注待核，不擅自改（见 §13.3）。 |
| **D-043** | 日志空态 flex 不泄漏（post-validate 复核） | `#log.empty` 由 `display:flex` 改门控为 `#log.empty:not(:has(> *))`：仅当 `#log` 无条目元素时居中；有条目（即便 `.empty` 类陈旧）恒为普通块布局逐行堆叠。最小 CSS 改动、零 JS 改动，保留 `height:45vh; overflow:auto` 与 `white-space:pre-wrap`。详见 §13.7。 |
| **D-044** | `state` 回传授权位（R4-W1） | `service-worker.ts` 的 `state` 处理改用零依赖投影 `src/background/state-message.ts` `buildStateMessage`：除 `active`/`tools` 外补回当前 origin 的 `authorized`（`OriginStore.isAuthorized`；无 origin 恒 false）。侧栏 `refreshState()` 经纯函数 `stateActionFromPayload`（`view-model.ts`）同步 `authorized`，不再仅在点击时 dispatch。既有 `active`/`invalidated` 语义不变。详见 §13.8。 |
| **D-045** | `llm-config` 零 key 派生串（R4-W3） | `llm-config` 消息与 `plugin.llm-config` 管理工具统一经 `toLlmStatusSummary` 只回 `{configured, providerId, providerName, model}`；`key-store.maskedConfig()` 移除 `apiKeyMasked` 字段与 `maskValue` 用法（无任何展示依赖）。详见 §13.8。 |

### 13.6 未完成 / 偏差如实标注

- **F-9 未改动**：`deepseek`/`volc-coding` 的 `deepseek-v4-flash` 真实性未确证（本地无联网核验手段），按指令标注待核，未改。这是本轮唯一「未修」项，并非遗漏。
- **人工面 UI 验证**：真实浏览器中的点击「配置模型」（`openOptionsPage` 真实打开）、授权弹层、真实 LLM 闭环仍属人工面（headless 无手势/权限弹窗），本轮以 CDP 截图 + 单测覆盖可达部分。
- **可见性刷新**：LLM 状态在侧栏 `focus`/`visibilitychange` 时刷新；不监听 `chrome.storage.onChanged`（避免额外监听面），用户若在设置页保存后未切回焦点，状态下次刷新更新。
- 本轮**未 git 提交**（由上层统一提交）。

### 13.7 D-043：日志空态 flex 复核与修复（post-validate 回归复核，2026-09-12）

**复核对象**：TASK-017 后对 `/tmp/ui-audit/after/D-sidepanel-expanded.png` 的疑似回归——`#log` 三条日志（`user:`/`tool:`/`error:`）横向并排，而修复前（`/tmp/ui-audit/before/D-sidepanel-expanded.png`）逐行堆叠。

**先量化（headless Chromium 151.0.7922.34 + 真实 `dist`，复用 `/tmp/ui-audit/measure.mjs` 的 D 态构造方式；探针 `/tmp/ui-audit/check-log.mjs`，原始数据 `/tmp/ui-audit/log-probe-pre.json`）**：

| 场景 | `#log.className` | `display` | 子元素 rects（`y` / `x`） | 判定 |
|------|------------------|-----------|--------------------------|------|
| 空态（`render()` 加 `.empty` + 占位文案） | `empty` | `flex`（`align-items:center`/`justify-content:center`，高 64px） | 无元素子节点 | 居中占位成立 |
| D 态（原脚本方式：`textContent=''` 后直接 append 3 个 div，**未动 `.empty` 类**） | `empty`（陈旧） | `flex`，`flex-direction:row`，`flex-wrap:nowrap` | `y=280.5` ×3；`x=15 / 133.13 / 264.25` | **横向并排复现**（符合「y 相同、x 递增」判据） |
| 对照（真实 `render()` 路径：先 `classList.remove('empty')` 再 append） | `''` | `block` | `y=275 / 294.5 / 314`；`x=15` ×3 | 逐行堆叠（生产路径本就正确） |

**根因**：`#log.empty { display:flex }` 使 `#log` 成为 flex 容器；审计脚本直接注入子节点、未同步移除 `.empty` 类，旧规则即把 3 条目排成一行。生产 `render()` 会在追加条目前 `classList.remove('empty')`，故真实用户流程不横向；但「空态布局模式泄漏到非空内容」是**真实存在的脆弱耦合**——任何绕过 `render()` 的追加（脚本/未来代码）都会误伤，审计截图也因此失真。

**修复（最小改动，仅 CSS；`src/ui/sidepanel/index.html`）**：
- `#log.empty { … display:flex … }` → `#log.empty:not(:has(> *)) { … }`（`index.html:26-33`）。
- 语义：仅当 `.empty` 存在**且**无元素子节点时启用居中；有条目时（无论类状态）`#log` 回归普通块布局，条目各占一行。
- `#log { height:45vh; overflow:auto }`、`white-space:pre-wrap`、空态文案（`LOG_EMPTY_TEXT`）与 `render()` 均**未改**；零新依赖、`packages/web-cli-base/**` 零改动。
- `:has()` 自 Chrome 105 支持，manifest `minimum_chrome_version` 为 114，安全。

**复测（修复后重跑同一探针，`/tmp/ui-audit/log-probe-post.json`）**：

| 场景 | `display` | 子元素 rects（`y` / `x`） | 结论 |
|------|-----------|--------------------------|------|
| 空态 | `flex`，高 64px | 无 | 居中占位保留 |
| D 态 @400（陈旧 `.empty` + 3 条目） | `block` | `y=275 / 294.5 / 314`；`x=15`；高 360px（=45vh） | **y 递增 → 已逐行堆叠**；无水平溢出 |
| D 态 @320（陈旧 `.empty` + 3 条目） | `block` | `y=383 / 402.5 / 422`；`x=15` | **y 递增**；`documentElement` 无水平溢出 |

**新截图**：`/tmp/ui-audit/after2/B-sidepanel-empty.png`（空态）、`/tmp/ui-audit/after2/D-sidepanel-expanded.png`（D 态，已堆叠）、`/tmp/ui-audit/after2/D2-sidepanel-expanded-narrow-320.png`（320 窄屏）。

**测试/门禁**：新增静态回归断言 `test/sidepanel-view.test.ts`「empty-log centering is gated on #log having no entry elements (D-043)」（测试先行：修复前 124 pass / 1 fail，修复后通过）。插件 **125 pass / 0 fail**、`tsc --noEmit` 0 error；全仓 `npm test` **0 fail**（base **483 零回归**：core 267 / render 94+1skip / router 8 / lgdl-web 31 / web-cli 84 / op-cli 15 / base 483 / plugin 125）。

**偏差/未做如实标注**：本轮仅修复上述 CSS 耦合；D 态为审计脚本构造态（生产 `render()` 路径修复前后均正确），故判定为「审计可见的潜在回归」而非生产已发生回归，两处数据均已如实给出。未重跑 E2E（本轮仅 CSS + 静态断言，未触碰运行时逻辑）；未 git 提交。

### 13.8 R4 低危改进修复（W1 授权位跨重载 + W3 `llm-config` 收敛，2026-09-12）

> 触发：review R4 §9.7 的 W1/W3（均低危非阻塞）。本轮只收敛暴露面与修真实可用性问题，**不改 base、不动 `.opencode/opencode.json`、无新增依赖、不 git 提交**。

**W1 — 已授权态不跨 reload（真实可用性问题，优先）**

- 现象：侧栏点「授权当前站点」后关闭/重开（或 SW 重启），`state` 只回 `active/invalidated/tools`，侧栏回落「未授权」且「授权当前站点」又可点，与 OriginStore 已持久授权不一致。
- 修复：
  - `src/background/state-message.ts`（新增，零依赖投影）：`buildStateMessage({active,tools,isAuthorized})` 补回 `authorized`（`active ? await isAuthorized(active.origin) : false`）。
  - `src/background/service-worker.ts:259-275`：`state` 处理改用该投影（`isAuthorized: (origin) => s.origins.isAuthorized(origin)`）。
  - `src/ui/sidepanel/view-model.ts:117-151`：新增纯映射 `stateActionFromPayload`（有 origin 才取 `authorized===true`；无 origin 恒 false；缺省位不视为已授权）。
  - `src/ui/sidepanel/sidepanel.ts`：`refreshState()` 从「点击时 dispatch」改为刷新即 `dispatch(stateActionFromPayload(res.data))`。
  - 语义保持：无 origin → `authorized=false`；`active`/`invalidated` 行为不变。

**W1 实测（headless Chromium 151 + CDP，真实 `dist/`，探针 `/tmp/w1-verify/audit.mjs`，日志 `/tmp/w1-verify/audit.log`）**：

| 步骤 | `#status` 文本 | authorize.disabled | revoke.disabled | 判定 |
|------|----------------|:--:|:--:|:--:|
| 授权前（真实发现已绑定 origin） | `站点 http://127.0.0.1:39849 · 发现=supported · 未授权` | `false` | `true` | ✅ |
| 真实 `authorize` 后 background `state.authorized` | `true` | — | — | ✅ |
| **`Page.reload` 重载真实 `sidepanel.html` 后** | `站点 http://127.0.0.1:39849 · 发现=supported · 已授权` | `true` | `false` | ✅ 修复前会回落未授权 |

- 截图：`/tmp/w1-verify/sidepanel-before-authorize.png`（未授权，授权按钮可点）、`/tmp/w1-verify/sidepanel-after-reload.png`（重载后已授权，授权按钮禁用 / 撤销启用）。探针 11 断言全通过（`exit=0`）。

**W3 — `llm-config` 回传掩码串收敛**

- 修复：`llm-config` 消息（`service-worker.ts`）与 `plugin.llm-config` 管理工具的 `llmConfig` 依赖（`service-worker.ts`）统一经 `toLlmStatusSummary`，只回 `{configured, providerId, providerName, model}`；`src/llm/key-store.ts` 的 `MaskedLlmConfig`/`maskedConfig()` 移除 `apiKeyMasked` 字段与 `maskValue` 用法（grep 确认无任何展示消费方：options/sidepanel 均未使用）。
- **W3 实测**（同一 CDP 探针，真实 background 消息往返）：`llm-config` 返回 `{"configured":false,"providerId":"deepseek","providerName":"DeepSeek","model":"deepseek-v4-flash"}`，keys 恰为 `["configured","model","providerId","providerName"]`，不含 `apiKeyMasked`、不含 `•`/`sk-` 片段。`dist/*.js|html` grep `apiKeyMasked` **0 命中**。

**测试与门禁**：

- 新增 `test/state-message.test.ts`（4 用例：已授权 / 未授权 / 无 origin 不查询 store / 读绑定 origin）；`test/sidepanel-view.test.ts` +3（payload→action 四态、重载后 authorize disabled/revoke enabled、`llm-config` 源码只走摘要投影）；`test/llm.test.ts` 与 `test/host.test.ts` 同步调整（**零删除零降级**，改为更强的「无 key 派生串」断言）。
- 插件 **125 → 132 pass / 0 fail**（+7）；`tsc --noEmit` 0 error；全仓 `npm run build` 退出码 0、`npm test` **0 fail**（base **483 零回归**：core 267 / render 94+1skip / router 8 / lgdl-web 31 / web-cli 84 / op-cli 15 / base 483 / plugin 132）。
- 红线：`packages/web-cli-base/**` 零改动；`dependencies` 仍仅 `@lgdl/web-cli-base`；`.opencode/opencode.json` 零改动；`src/ui/sidepanel/**` 无 `apiKey` 引用；`src/**` 无 `apiKeyMasked` 值（仅 `status.ts` 文档注释说明丢弃）；`dist` 无 `apiKeyMasked`。
- E2E 复跑：`npm run test:e2e` 场景 A（7 断言）+ 场景 B（4 断言）**PASS**（真实 dist 全链；唯一偏差 `host_permissions` 预授予本地 origin，同前，非本轮引入）；未 git 提交。

## 14. options 保存链路加固 + 「测试连接」+ UI 旅程门禁（TASK-018，用户实测反馈）

> 触发：用户实测反馈「填模型 key 没法保存 / 很多功能不能用 / 没有测试连接（内置助手原有）」。
> 本轮**先真复现再修复**；未复现的假设如实记录，不制造根因。

### 14.1 阶段 1：真复现（结论与原始证据）

**方法**：全新 `--user-data-dir`（模拟首次安装）+ 真实 `dist/`（`npm run build` 后）+ CDP
`Input.dispatchKeyEvent` / `Input.dispatchMouseEvent` 做真实键入与点击；从 SW 上下文
`chrome.storage.local.get(null)` 读回。脚本 `/tmp/opencode/repro.mjs`（未入库）。

**首次保存路径**（原样证据）：

| 步骤 | 观测 | 判定 |
|------|------|:--:|
| 初始加载 | `provider=deepseek`、`model=deepseek-v4-flash`、`apiKey=''`、`#key-warning` 显示 | ✅ |
| 真实键入后 | `apiKey='sk-first-save-test-123456'`、`model='deepseek-chat'`（无装饰） | ✅ |
| **真实点击「保存」** | `#saved='✓ 已保存到扩展存储（chrome.storage.local，页面脚本不可读）'`、`#apiKey` 清空、`#key-warning` 消失 | ✅ **保存成功** |
| SW 读回 storage | `web-cli:web-cli:llm = { active:'deepseek', maxRounds:1000, providers:{ deepseek:{ apiKey:'sk-first-save-test-123456', model:'deepseek-chat' } } }` | ✅ 真落库 |
| 刷新 options | `provider=deepseek`、`model=deepseek-chat`、`#saved='已保存 Key（掩码显示，不回显明文）'`、警告消失 | ✅ 回显 |
| 再存一次（已存在路径） | 新 Key `sk-second-save-test-999` **覆盖成功** | ✅ |
| 页面异常 / console error | `exceptions=[]`、`console errors/warnings=[]` | ✅ |
| API 探针 | `chrome.storage.session` / `chrome.sidePanel` / `chrome.permissions` 均可用 | ✅ |

**可疑点核对（任务指定）**：`src/ui/options/options.ts` 的 `const existing = await store.loadProvider(...)`
之后使用 `existing.apiKey`。核对 `src/llm/key-store.ts:97-107`：`loadProvider` **恒返回对象**
（`apiKey: state?.apiKey ?? ''`），无既有配置时返回 `apiKey:''`，**不是 `undefined`**。`test/llm.test.ts:58-59`
亦断言 `(await store.loadProvider('openai')).apiKey === ''` 通过。→ **「TypeError 静默失败」假设不成立**。

**其他「不能用」项核查**：真实 background + 真实 sidepanel（CDP）实测——`llm-status` 回
`{configured:true, providerId, providerName, model}`；sidepanel DOM 无缺失元素、0 异常；带假 Key 发指令
得到**可读** `DeepSeek 拒绝了请求（HTTP 401）— API Key 可能无效或已过期`。→ 未复现 sidepanel/状态/会话的
具体故障；`#test`（测试连接）确认**确实缺失**。

**根因清单**：

| # | 现象 | 证据（file:line / 原始报错） | 判定 |
|---|------|------------------------------|------|
| R1 | 用户称「填 Key 没法保存」 | 上述首次/二次保存均成功、storage 真落库；`key-store.ts:97-107` 恒返回对象 | **未复现**（当前树）；可疑 TypeError 假设不成立 |
| R2 | 「没反应」类静默失败风险 | `options.ts` 原 submit 为 `void (async () => {…})()`，**无 try/catch** → 任何异常都被吞掉、无反馈 | **真实潜在缺陷**（与症状同类）→ 已修 |
| R3 | 未填 Key 时点保存 | 原逻辑 `apiKey: typed || existing.apiKey` 可写入空串并显示「✓ 已保存」→ 误导 | **真实缺陷** → 已修 |
| R4 | 没有「测试连接」 | options 页无该按钮；`test-connection` 能力在 base/内置助手里有（`web-cli-base/src/llm.ts`、`lgdl-web/dist-test/ai/provider.js`） | **真实缺失** → 已新增 |

### 14.2 阶段 2：修复逐项（位置 + 证据）

| 项 | 位置 | 说明 |
|----|------|------|
| 保存链路可读失败 | `src/ui/options/options.ts` `handleSave()` try/catch | 失败 → `#saved='✖ 保存失败：<message>'`；不再静默 |
| 空 Key 明确提示 | `handleSave()` `if (!key)` | `⚠ 未保存：未填写 <厂商> 的 API Key…`，不写空串、不显示成功 |
| 保存后清空 + 警告 + 摘要 | `handleSave()` / `renderSavedSummary()` | 清空 `#apiKey`、`setKeyWarning(true)`、`✓ 已保存：<厂商> · <模型> · Key ✅` |
| 厂商切换模型跟随 + 提示一致 | `wire()` change handler + `providerHint()` | 切换即 `provider.defaultModel`；提示带 G-KEY 直连说明 |
| 清除按钮可读失败 | `clear` handler try/catch | 失败可读 |
| `refresh()` 异常不再吞 | `refresh()` try/catch | 读配置失败显示可读错误 |
| 「测试连接」按钮 | `src/ui/options/index.html` `#save`/`#test`/`#test-result` | 真实按钮 + 结果区（aria-live） |
| 测试连接消息 | `src/background/messaging.ts`（+`llm-test` kind）；`service-worker.ts` `case 'llm-test'` | 用**当前表单值**（含未保存 Key）发最小真实请求 |
| 测试连接逻辑 | `src/llm/test-connection.ts`（新） | 注入 `providerChat`；no-key/401/403/404/CORS·网络/超时分类；成功含 ms；**结果对象不含 Key** |

### 14.3 「测试连接」设计 + 单测 + 真实跑一次

- **复用而非新造**：background 调用 `providerChat`（→ `@lgdl/web-cli-base` `chat`）发
  `[{role:'user',content:'ping'}]` + **零 schema tools**（base 已对空 tools 省略字段，规避兼容问题）。
- **key 边界**：明文 Key 仅作为 background 请求参数；**不进 logs、不进审计**（红线 grep：`src/llm/test-connection.ts` 无 `console.`/`audit`；`apiKey` 不与非 `console.`/`audit` 组合）。
- **火山口径**：`browserDirect=false` 且 HTTP 401 → `direct-restricted`，文案明确「端点已知需 G-KEY 验证（浏览器直连受限）……或改用支持浏览器直连的厂商」，**不假装成功**。
- **单测**（`test/test-connection.test.ts`，10 用例，全注入 chat 桩、无网络）：成功含 ms + 无 Key 泄漏 / 空 Key 短路（0 次请求）/ 401→invalid-key / 火山 401→direct-restricted / 403→forbidden / 404→model-not-found / CORS·网络→network / 超时→timeout（不挂起）/ 无结果变体含明文 Key / `extractStatus`。
- **真实跑一次**（UI 旅程内，本地 hermetic mock OpenAI 端点）：结果原文
  `✓ OpenAI GPT 连接正常（模型 journey-mock，<N> ms，最小 ping 请求）`；失败分支真实原文见 14.1（火山/401/CORS/超时由单测覆盖）。

### 14.4 新 UI 旅程测试（`npm run test:ui`）

- 脚本：`test/ui/journey.mjs`（Node 原生 CDP，零新依赖）；脚本：`package.json` `"test:ui": "node test/ui/journey.mjs"`。
- **25 断言**：全新 profile 真实 dist → 真实键盘切厂商 → 真实键入 Key/模型/BaseURL → 真实点击保存
  → SW 读回 storage（active/apiKey/model/baseURL）→ 刷新回显摘要 → 真实点击测试连接 → 本地 mock 成功含 ms → 0 异常 / 0 console error。
- **hermetic**：内置仅监听 `127.0.0.1` 的 mock OpenAI 端点（CORS + Private-Network-Access + 回显预检头）；
  `dist/` 字节**未修改**（区别于 R8 的 manifest `host_permissions` 偏差）。
- **CDP 真实键入坑（记录）**：`windowsVirtualKeyCode` 不能取 `codePointAt`（`.`=46=VK_DELETE 会被
  当作删除键；`/`=47 亦然），改为 `text` 驱动、不传 VK 码。
- 运行输出：`UI journey PASS — 25 assertions: 全新 profile 真实 dist，真实键入+点击：保存→读回→回显→测试连接`。
- 文档：`docs/dev.md` §9（新增）+ `docs/smoke-checklist.md` M24 / §3。

### 14.5 全仓门禁 + 红线

| 门禁 | 结果 |
|------|------|
| `npm run build --workspace @lgdl/web-cli-plugin` | ✅ |
| 插件 `npm run test` | ✅ **146 pass / 0 fail**（132→146，+14：test-connection 10 + 静态回归 4） |
| 插件 `tsc --noEmit` | ✅ 0 error |
| `npm run test:ui` | ✅ 25 断言 PASS |
| `npm run test:e2e` | ✅ 场景 A（7）+ B（4）PASS，真实 dist 全链 |
| 全仓 `npm run build` | ✅ 退出码 0 |
| 全仓 `npm test` | ✅ **0 fail**：core 267 / render 94+1skip / router 8 / lgdl-web 31 / web-cli 84 / op-cli 15 / **base 483 零回归** / plugin 146 |
| 红线 grep | ✅ base 零改动；`dependencies` 仍仅 `@lgdl/web-cli-base`（仅 +`test:ui` script，lock 未动）；`src` 无 `apiKey` 进 console/audit；`dist` grep `apiKeyMasked` 0；`.opencode/opencode.json` 零改动 |

### 14.6 新增决策（D-046~D-052）

- **D-046（真复现结论）**：用户「填 Key 没法保存」**未复现**——真实首启保存成功且 storage 真落库，
  `key-store.ts:97-107` `loadProvider` 恒返回对象（非 undefined），任务书可疑的 `existing.apiKey` TypeError
  **不成立**。如实记录，不制造根因；不以「已修复」冒充。
- **D-047（静默失败防御）**：即便具体 TypeError 未复现，options 原 `void (async)` 无 catch 仍是
  **真实潜在缺陷**（同类症状）→ `handleSave`/`handleTest`/`refresh`/clear 全部 try/catch + 可读文案；
  **不改** `key-store` 语义（保存仍为 per-provider 持久化、active 指针、默认模型回退）。
- **D-048（测试连接落点）**：测试连接在 **background** 执行（`llm-test` 消息 + `src/llm/test-connection.ts`
  注入 `providerChat`），复用 base `chat`，零 fork；key 只作请求参数，不入日志/审计。options 侧只发当前
  表单值并渲染结果（页面脚本不落库）。
- **D-049（失败分类口径）**：no-key / invalid-key(401) / direct-restricted(火山 401) / forbidden(403) /
  model-not-found(404) / network(CORS·不可达) / timeout / error；成功含延迟 ms。火山端点直连受限**如实呈现**
  并给可操作建议，绝不假装成功。
- **D-050（UI 旅程 hermetic 口径）**：`test/ui/journey.mjs` 用 `127.0.0.1` 本地 mock + CORS/PNA 头实现
  无网可重复；**dist 字节不改**（不沿用 R8 的 manifest `host_permissions` 偏差）。CDP 真实键入不传
  `windowsVirtualKeyCode`（避免 `.`=46=VK_DELETE 误删等假象）。
- **D-051（消息 additive）**：`PluginMessageKind`/`KIND_SET` 新增 `llm-test`；既有 kind、既有 handler 行为不变。
- **D-052（未复现项如实标注）**：「很多功能不能用」未定位到具体故障——sidepanel LLM 状态、首次引导、
  会话 401 可读转译、`chrome.storage.session/sidePanel` 可用性均实测正常；如实记录，未编造缺失能力。

### 14.7 未修复 / 未复现（如实）

- 用户所述「很多功能不能用」：**未复现**具体故障（未观察到崩溃/缺失元素/静默错误）；仅补了「测试连接」这一确切缺失项。
- 「填 Key 没法保存」：**未复现**（当前树）；已按同类静默失败做防御性加固（见 R2/R3）。
- 真实 `chrome://extensions` 错误列表：headless 下该页面不可 CDP 访问，改以 SW/options/sidepanel 的
  `Runtime.exceptionThrown` + `Log.entryAdded` 替代取证（均为 0）。
- 真实第三方厂商连通（含火山直连）仍属人工面 H7；本轮 UI 旅程用 hermetic mock，不冒充真实厂商直连。

## 15. 三成因加固 + 环境自检诊断 + 真实验证（TASK-019，用户实测反馈第二轮）

> 触发：用户实测「填模型 key 没法保存 / 很多功能不能用」；上一轮（TASK-018）在**全新 profile + 真实键入/点击**下
> **未能复现保存失败**（保存成功、storage 真落库）。本轮按**最可能的三个成因**做加固，使问题**要么消失、要么一眼可见**：
> ① 用户把 `dist/options.html` 当普通页面打开（非扩展上下文，`chrome.storage` 不存在）；
> ② 在未声明 web-cli 协议的普通站点上试用（设计如此，UI 未讲清）；
> ③ 用户无法自诊断。**未复现的根因不编造**，如实记录（§15.8）。

### 15.1 三成因与加固落点

| 成因 | 假设 | 加固 | 落点 |
|------|------|------|------|
| ① 非扩展上下文 | `file://`/非扩展页打开 options，`chrome.storage` 不存在 → 保存静默失效 | 入口环境检测 + 阻断横幅 + 按钮禁用 + 输入说明 | `src/platform/env-guard.ts`（纯逻辑）、`options.ts`、`sidepanel.ts`、两个 `index.html` |
| ② 站点未声明协议 | 普通站点「什么都不能用」= 设计如此，旧 UI 只显示 `发现=unsupported` | 三态显式说明（未声明 = 非故障；未知 = 可读原因 + 重试） | `view-model.ts:discoveryNotice`、`sidepanel.ts`、`index.html`、background `discover`/`reprobe` |
| ③ 无法自诊断 | 用户看不到「为什么」 | 「环境自检 / 诊断」六项 + 一键复制（零明文） | `src/ui/options/diagnostics.ts`、`src/background/diag-message.ts`、`options.ts`、`index.html` |
| （附带）旧扩展未重载 | 改了代码只 build 不「重新加载」 | 构建戳注入 + 页面/SW 构建不一致提示 | `src/build-info.ts`、`build.mjs`（esbuild define）、诊断面板 |

### 15.2 阶段 1：任务 A 的非扩展上下文**修复前实证**

**方法**：把上一轮（TASK-018）构建的 `dist/` 快照到 `/tmp/prefix-dist` 作为「修复前」；用 `.pw-browsers`
Chromium 无扩展加载 `file://…/options.html`，设置 `#apiKey` 后**真实点击「保存」**。

| 场景 | 观测（原始） | 判定 |
|------|--------------|------|
| 修复前初始 | `hasSave=true`、**无 `#env-guard` 元素**、`chrome=object`、`chrome.runtime.id=(none)`、`chrome.storage.local=(none)` | 页面可开，但无任何「你不在扩展里」提示 |
| 修复前点击保存 | `#saved="✖ 保存失败：Cannot read properties of undefined (reading 'local')"`，`#apiKey` 仍为输入值 | **非完全静默**（TASK-018 的 try/catch 已让其可读），但报错与「为什么」无关，按钮仍可点、无环境结论 |
| 修复后（当前 dist） | 阻断横幅出现（文案见下）、`save/test/clear` **禁用**、输入框旁说明出现、诊断面板 `❌ 扩展上下文 …` | ✅ 一眼可见 |

修复后横幅原文：
> ⚠ 当前不在扩展环境（chrome.storage 不可用），配置无法保存。请通过 chrome://extensions → 本扩展 → 「扩展程序选项」打开本页，或从侧栏「配置模型」进入。

> **诚实口径**：任务书假设的「保存**静默**失效」（点击无反应/无落库）在 `file://` 场景**未能复现**——上一轮已把
> `handleSave` 包进 try/catch，故表现为**底层 TypeError 文案**而非无反应。本轮的增量价值是把「底层错误」升级为
> **明确的扩展环境结论 + 阻断式禁用**，避免用户误以为「保存功能坏了」。

### 15.3 阶段 2：任务 B 的站点未声明协议说明

- **纯函数** `discoveryNotice(discoveryState, reason?)`（`view-model.ts`）：`supported`/未探测 → 不显示（不误报）；
  `unsupported` → 「当前站点未声明 web-cli 协议…设计如此，不是故障…可在 LGDL 工作台等声明了协议的站点使用」+
  验证方法；`unknown` → 可读原因 + 「重新探测」入口。**复用既有三态，不新增状态机**。
- **语义修正（真实缺陷）**：原 background `discover` 处理**只看 `descriptor` 有无**，把 content script 上报的
  `unknown`（声明无效/版本不匹配/暂时不可达）一律吞成 `unsupported`，导致侧栏永远无法给出「探测失败原因 + 重试」。
  现改为**尊重上报三态**并把 `reason` 持久化（`controller.discoveryReason` → `state` 消息 → 侧栏）。见 D-054。
- **重试入口（additive）**：侧栏「重新探测」→ 背景 `reprobe` → `ensureContentScript` → content script 重跑
  `discover()` 并回报；实测往返可读回执。见 D-055。

### 15.4 阶段 3：任务 C 的环境自检 / 诊断面板

- **六项检测**（每次 ✅/⚠/❌ + 详情）：① 扩展上下文（`chrome.runtime.id`/`chrome.storage.local`）；② 扩展版本/构建
  （manifest version + build stamp + SW 上报，含不一致提示）；③ `chrome.storage.local` 读写实测（写测试键→读回→删）；
  ④ background 连通性（`diag` 往返 + 耗时 + SW 启动时间）；⑤ 已授权 origin / 活跃站点（`OriginStore.list` 投影）；
  ⑥ 已配置厂商·模型（`llm-status` 非敏感摘要）。
- **一键复制**：`renderDiagText` 生成文本，`sanitizeDiagText` 兜底脱敏 `sk-*`/`ark-*`/Bearer/`apiKey=` 形态；
  数据来源本身零明文（`llm-status` 只回 4 个非敏感字段）。见 D-056。
- **构建戳**：`build.mjs` 经 esbuild `define` 注入 `__BUILD_STAMP__`（每次构建 ISO 时间戳，`src/build-info.ts` 读取；
  node 下 `typeof` 守卫回退 `dev`）。见 D-057。

### 15.5 阶段 4：真实验证（多环境）

`test/ui/hardening.mjs`（`npm run test:hardening`）用真实浏览器 + CDP 复跑三场景，**22 断言 PASS**：

| 场景 | 结果 |
|------|------|
| A 非扩展上下文（`file://` prefix vs 当前 dist） | ✅ 横幅 / 禁用 / 输入说明 / 诊断 ❌（修复前观测已记录，见 §15.2） |
| B 未声明协议（本地普通站点；`unsupported` + `unknown` 两态，含「重新探测」真实往返） | ✅ 说明块 / 非故障文案 / 可读原因 / 重试回执 |
| C 旧扩展未重载（build 后仅刷新 options，不点「重新加载」） | ✅ 诊断报「页面构建 X 与 background 构建 Y 不一致——…重新加载」 |

多浏览器 `test:ui`（任务 D 要求）：

| 浏览器 | 版本 | `test:ui` 结果 |
|--------|------|:--:|
| `.pw-browsers` chrome-for-testing | Google Chrome for Testing 151.0.7922.34 | ✅ 25 断言 PASS |
| 系统 Chromium（snap） | Chromium 152.0.7977.64 | ✅ 25 断言 PASS |
| 系统 Google Chrome | **未安装**（`google-chrome*` 不存在） | — 未测 |
| Microsoft Edge | **未安装**（无 `microsoft-edge*`） | — 未测 |

> C#4（`chrome.runtime.reload()` 后恢复一致）属**可选复验**（`HARDENING_C4=1`）：headless 下 `runtime.reload()`
> 会令目标半死/hang，默认跳过；核心可操作结论由 C#3（不一致提示）承载，未把「未验证」写成 PASS。

### 15.6 全仓门禁 + 红线（本轮复跑）

| 门禁 | 结果 |
|------|------|
| 插件 `npm run build` | ✅ 退出码 0（build 末行打印 build stamp） |
| 插件 `npm run test` | ✅ **173 pass / 0 fail**（146→173，+27：env-guard 7 + diagnostics 11 + diag-message 2 + controller 3 + 静态/投影 4） |
| 插件 `tsc --noEmit` | ✅ 0 error |
| `npm run test:ui` | ✅ 25 断言 PASS（.pw-browsers 151；系统 snap Chromium 152 亦 PASS） |
| `npm run test:e2e` | ✅ 场景 A（7）+ B（4）PASS，真实 dist 全链 |
| `npm run test:hardening` | ✅ 22 断言 PASS（A/B/C） |
| 全仓 `npm run build` | ✅ 退出码 0 |
| 全仓 `npm test` | ✅ **0 fail**：core 267 / render 94+1skip / router 8 / lgdl-web 31 / web-cli 84 / op-cli 15 / **base 483 零回归** / plugin 173 |
| 红线 grep | ✅ `packages/web-cli-base/**` 零改动；根 `package.json` 零改动；`.opencode/opencode.json` 零改动；`dependencies` 仍仅 `@lgdl/web-cli-base`（无新依赖，仅 +`test:hardening` script）；`src` 无 `apiKey` 进 console/audit；无空 catch；`dist` grep `apiKeyMasked` 0 |

### 15.7 新增决策（D-053~D-058）

- **D-053（任务 A 非扩展守卫）**：新增零依赖纯模块 `src/platform/env-guard.ts`：按**能力**（`runtime.id` +
  `storage.local.get/set`）判定扩展上下文，产出横幅文案、逐项原因与「保存/测试/清除」禁用语义。options/sidepanel
  入口应用；非扩展环境下 options 不调用真实 storage（避免底层异常），诊断照跑并显示 ❌。实证：修复前为底层
  TypeError 文案（非完全静默），修复后为明确环境结论 + 阻断；**不编造「静默失效」根因**。
- **D-054（`discover` 尊重上报三态 + 持久化原因）**：background `discover` 由「descriptor 有无」改为**尊重
  content script 上报的 `state`**（`supported`/`unsupported`/`unknown`）并持久化可读 `reason`
  （`controller.ActiveSession.discoveryReason` → `state` 消息 `active.discoveryReason` → 侧栏 notice）。修正原
  「unknown 被吞成 unsupported」的语义缺口（任务 B 的「可读原因」前提）。消息字段 additive，旧字段语义不变。
- **D-055（`reprobe` additive）**：新增 `PluginMessageKind: 'reprobe'`：侧栏「重新探测」→ background
  `ensureContentScript` + `tabs.sendMessage('reprobe')` → content script 重跑 discovery 并回报；往返可读，
  失败（无活跃站点 / 受限页面 / 无响应）均给出可读错误。既有 kind/handler 行为不变。
- **D-056（诊断面板 + 零明文）**：新增 `src/ui/options/diagnostics.ts`（纯逻辑：图标/汇总/复制文本/脱敏）与
  `src/background/diag-message.ts`（`diag` 消息投影：版本/构建/SW 启动/活跃站点/已授权 origin，零 key）。
  六项检测 + 一键复制；`sanitizeDiagText` 对 `sk-*`/`ark-*`/Bearer/`apiKey=` 兜底脱敏（纵深防御）。数据来源
  `llm-status` 只回 4 个非敏感字段。
- **D-057（构建戳与「未重载」可见）**：`build.mjs` 以 esbuild `define` 注入 `__BUILD_STAMP__`（构建 ISO 时间戳），
  `src/build-info.ts` 读取（node 回退 `dev`）；诊断「扩展版本/构建」比对页面构建戳与 SW 上报构建戳，不一致即提示
  「多半是改了代码只刷新了页面、没点『重新加载』」——把「旧扩展未重载」变成可操作结论。
- **D-058（实证探针与偏差披露）**：新增 `test:hardening`（`test/ui/hardening.mjs`）A/B/C 场景常驻可复现；B 的
  临时 dist 副本会把本地 origin 追加进 manifest `host_permissions`（headless 无法合成 activeTab 手势），JS 字节不改，
  **偏差如实披露**；C#4 为 headless 可选（`HARDENING_C4=1`），默认跳过且不记为 PASS。

### 15.8 未复现 / 未完成（如实）

- 「填 Key 没法保存」：**仍未在可复现环境下复现保存失败**（全新 profile + 真实键入/点击 + storage 真落库，与
  TASK-018 一致）。本轮只做**非扩展上下文防守**（成因①）并在 `file://` 下给出「修复前底层报错 → 修复后明确横幅 +
  禁用」的对照实证；**并未声称找到了保存失败的根因**。
- 「很多功能不能用」：**未定位到具体功能故障**；按成因②解释为「未声明协议的站点上设计如此」并给出显式说明。
- C#4（`chrome.runtime.reload()` 后构建恢复一致）：headless 下未稳定验证（默认跳过）；**不以未验证充通过**。
- 系统 Google Chrome / Microsoft Edge：**本机未安装**，未测；仅 `.pw-browsers` Chrome-for-Testing 151 与系统
  snap Chromium 152 各跑 `test:ui` 均 25 断言 PASS。
- 真实第三方厂商连通（含火山 G-KEY 直连）仍属人工面 H7，本轮不冒充。

## 16. 实测反馈第三轮：保存后呈现 + 「无活跃站点」自救 + Key/测试连接可见（TASK-020，post-validate additive）

> 触发：用户（真实 Google Chrome + `chrome://extensions` 加载 `dist`）实测反馈两个**真实 UX 缺陷**：
> ① 点保存 → 提示「✓ 已保存…」**但 API Key 框变成空的** → 用户判定「没保存成功 / 配置被阻塞」；
> ② 面板显示「无活跃站点 / 设置 / LLM：DeepSeek · deepseek-flash」，**发送按钮禁用**且无解释；
> 诉求「要能验证配置是否有效（测试连接）」。
> 本轮**按已定位根因修复**（不另起炉灶、不编造根因），并把这些 UX 行为固化为 `test:ui` 断言。

### 16.1 缺陷定位与前后行为对照

| # | 缺陷（根因） | 修复位置（file:line） | 修复前行为 | 修复后行为 |
|---|--------------|----------------------|------------|------------|
| R1 | **UX 回归**：TASK-017 的「F-8 保存后清空 API Key 输入框」把**成功做得像失败**（空框无任何标记） | `src/ui/options/options.ts:226` `setApiKeyPlaceholder(true)`、`:105` `renderKeyState`、`:113` `highlightSaved`；`src/ui/options/index.html` `#key-state` | 保存后 `#apiKey.value=''`，placeholder 仍是「仅写入扩展存储，不回显明文」，无「已保存」标记 → 用户看到空框误判失败 | value 仍为空（安全不回显），但 placeholder=「已保存（不回显）；如需更换请重新输入」+ `#key-state`=「Key ✅ 已写入（不回显）」+ 成功块绿底/加粗 + `scrollIntoView`/高亮闪烁 + 摘要「✓ 已保存：<厂商> · <模型> · Key ✅ 已写入」 |
| R2 | 「无活跃站点」**无解释、无出路**；`send` 因无绑定站点禁用但只显示灰按钮 | `src/ui/sidepanel/view-model.ts:133` `activeSiteNotice`、`:170` `sendDisabledReason`；`src/ui/sidepanel/sidepanel.ts:137/148`；`src/background/state-message.ts:58` `projectActiveTab`；`src/background/service-worker.ts:518` `case 'rebind'`；`src/ui/sidepanel/index.html` `#site-hint`/`#rebind`/`#send-reason` | `#status` 仅「无活跃站点」；发送禁用无原因 | 拆成三态具体原因（受限页 `chrome://`/扩展页/商店页、http(s) 未绑定、无可用标签页）+ 下一步动作；新增「**重新绑定当前标签页**」按钮（background `rebind` 复用既有 bindTab 语义，失败给可读原因）；`#send-reason` 在输入框旁显示禁用原因 |
| R3 | 侧栏 LLM 状态行**不含 Key 状态**（只显示厂商·模型），无法确认 Key 是否写入 | `src/ui/sidepanel/view-model.ts:35` `llmStatusView` | `LLM：DeepSeek · deepseek-flash` | `LLM：DeepSeek · deepseek-flash · Key ✅`（未配置：`… · Key ⚠未配置`）；仅由既有零明文 `configured` 布尔派生，**不新增 key 派生串** |
| R4 | 「测试连接」入口**不显眼**，侧栏内无法直接测 | `src/ui/options/index.html`（`#test` 加 `test-primary`、紧邻 `#save`）；`src/ui/sidepanel/index.html` `#llm-test`/`#llm-test-result`；`src/ui/sidepanel/sidepanel.ts:337` `handlePanelTest`；`src/background/service-worker.ts:447` `llm-test` | 仅 options 有「测试连接」；侧栏无入口 | options 按钮视觉突出且紧邻保存；侧栏新增「测试连接」按钮，复用同一 `llm-test` 消息；无 key 入参时 background **回退读取已保存配置**（key 只在 background 使用，不回传/不落日志/不审计）；结果可读（成功含 ms / 401 / 403 / 404 / CORS / 超时）；非扩展上下文下 options `#test` 与侧栏 `#llm-test`/`#rebind` 均禁用 |

### 16.2 阶段 1：真实验证（`test:ui` 断言先行）

`test/ui/journey.mjs` 在既有「全新 profile + 真实 dist + CDP 真实键入/点击」旅程上新增断言（25→**41**）：

| 断言 | 证据 |
|------|------|
| `#6d` 保存后 `#key-state`=「Key ✅ 已写入（不回显）」 | 真实点击保存后读取 DOM |
| `#6e` 保存后 placeholder=「已保存（不回显）…」 | 同上 |
| `#6f` `#saved` 使用成功色（`msg-ok`） | 同上（class 断言） |
| `#8d` 刷新 options 后仍显示「已写入」+ 已保存 placeholder | 刷新后读取 DOM（零明文摘要驱动） |
| `#11b` 侧栏 LLM 行含 `Key ✅` | 打开真实 `sidepanel.html` |
| `#11c~#11g` 无活跃站点显示具体原因 + 下一步动作 + 「重新绑定当前标签页」按钮 + 发送禁用原因就近可见 | 同上 |
| `#12~#12c` 侧栏「测试连接」真实点击 → 复用 `llm-test`（stored config）打本地 mock → 可读成功（含 ms） | 同上 |
| `#13/#13b` 侧栏页 0 未捕获异常 / 0 console error | CDP `Runtime.exceptionThrown` / `Log.entryAdded` |

运行输出（本机 `.pw-browsers` Chromium 1234）：`UI journey PASS — 41 assertions: …保存→读回→回显→测试连接`。

### 16.3 单测（node 面，+10）

- `test/sidepanel-view.test.ts`（+5）：TASK-020 C `llmStatusView` Key 标记；B `activeSiteNotice` 三态 + 动作；B `sendDisabledReason`（空仅当可发送）；B/D 侧栏 `site-hint`/`rebind`/`llm-test` 静态面；A options `#key-state`/placeholder/成功色 + 不泄露 key。
- `test/state-message.test.ts`（+5）：`projectActiveTab` http(s) 只暴露 origin（无 path/title）；受限页可读；无 tab/空 URL 可读；`state` payload 携带/显式 null；零明文。

### 16.4 全仓门禁 + 红线（本轮复跑）

| 门禁 | 结果 |
|------|------|
| 插件 `npm run build` | ✅ 退出码 0 |
| 插件 `npm run test` | ✅ **183 pass / 0 fail**（173→183，+10） |
| 插件 `tsc --noEmit` | ✅ 0 error |
| `npm run test:ui` | ✅ **41 断言 PASS**（含侧栏 0 异常 0 console error） |
| `npm run test:hardening` | ✅ 22 断言 PASS（A/B/C 未回归） |
| `npm run test:e2e` | ✅ 场景 A（7）+ B（4）PASS，真实 dist 全链 |
| 全仓 `npm run build` | ✅ 退出码 0 |
| 全仓 `npm test` | ✅ **0 fail**：cli 0 / core 267 / layout 0 / render 94+1skip / router 8 / lgdl-web 31 / web-cli 84 / op-cli 15 / **base 483 零回归** / plugin 183 |
| 红线 grep | ✅ `packages/web-cli-base/**` 零改动；根 `package.json` 未动；`dependencies` 仍仅 `@lgdl/web-cli-base`（无新依赖）；`.opencode/opencode.json` 零改动；`src` 无 `apiKey` 进 console/audit；侧栏 bundle 未引入 LLM SDK（`dist/sidepanel.js` 无 `apiKey`/厂商名） |

### 16.5 新增决策（D-059~D-063）

- **D-059（保存后「空框」必须读作已保存）**：保留 F-8 的「保存后不回显明文」，但用**placeholder=已保存** +
  `#key-state`=「Key ✅ 已写入（不回显）」+ 成功块（绿底/加粗）+ 滚动/高亮共同表达成功；`refresh()`/页面刷新后
  由零明文摘要驱动同一标记。修复前 `#apiKey.value=''` 且无任何「已写入」语义 → 用户误判「没保存」。
- **D-060（`#saved` 成功态增强）**：`#saved` 仍走既有 `msg-ok`（成功色），本轮增量为**填充底色 + 摘要内嵌
  「Key ✅ 已写入」+ `scrollIntoView` + 1.5s 高亮**；失败仍保持 `msg-err` 红字可读，未改失败文案。
- **D-061（「无活跃站点」三态化 + `rebind`）**：新增纯函数 `activeSiteNotice`（受限页 / 未绑定 http(s) / 无 tab）
  与 `sendDisabledReason`；新增 `PluginMessageKind: 'rebind'`，background 用 `chrome.tabs.query` 复用既有
  `bindTab` 语义，受限/无 tab/注入失败均给可读错误。`state` 消息 additive 增加**非敏感** `tab` 投影
  （只回 origin，不回 URL/title），不新增状态机。
- **D-062（侧栏 Key 状态零明文）**：`llmStatusView` 的 `Key ✅/⚠未配置` 只由既有 `configured` 布尔派生，
  不引入任何 key 派生串；沿用 `llm-status` 的四字段摘要。
- **D-063（侧栏测试连接复用 `llm-test` + stored 回退）**：侧栏无需 key 输入框；background `llm-test` 在
  `apiKey` 为空时回退读取已保存配置（key 只在 background 使用，绝不回传/日志/审计）。options 侧「当前表单值
  优先」行为不变（typed key 仍可测试未保存配置）。`#test` 增加 `test-primary` 视觉强调但保持紧邻 `#save`。

### 16.6 未完成 / 未复现（如实）

- 用户列出的 4 项均为**可定位的 UX/可见性缺陷**，非「后端保存失败」；本轮**未声称**曾存在 storage 写入失败。
  既有 `test:ui`/storage 读回仍证明保存真实落库（#7b~#7e）。
- 本项目**未在真实第三方厂商（含火山 G-KEY 直连）**上跑侧栏/options 的「测试连接」；UI 门禁用本地 hermetic
  mock（`127.0.0.1`），真实厂商连通仍属人工面 H7，不冒充。
- 系统 Google Chrome / Edge 本机未安装：`test:ui` 在 `.pw-browsers` Chromium 1234 上跑 41 断言 PASS；
  多浏览器矩阵沿用 §15.5（未重测 Edge）。
- 「重新绑定当前标签页」按钮的真实手势链路（`activeTab`）在 headless 下无法合成：本轮只断言按钮存在与
  `rebind` 消息可读路径；真实用户手势绑定仍属人工面 H0。

## 17. 站点绑定链路缺陷修复（用户实测第四轮，D-064~D-068）

> 场景：**真实 Google Chrome** + `chrome://extensions` 加载 `dist`。LLM 已配置且「测试连接」通过
> （DeepSeek · deepseek-flash · 1020ms）；站点 `http://localhost:5173/`（本仓 lgdl-web，已确认
> `public/.well-known/web-cli.json` 存在且 `index.html` 有 `<link rel="web-cli">`）；但侧栏**恒显示「无活跃
> 站点」**，错误详情「当前标签页不可注入：当前标签页没有可读取的地址」，「重新绑定当前标签页」同样失败，
> 发送按钮恒禁用。本轮由主 Agent 先做**代码级根因定位**（不重复调查），随后按定位结论修复并做**真站点全链实证**。

### 17.1 根因（代码级，已确认）

| # | 根因 | 位置（修复前） | 后果 |
|---|------|----------------|------|
| ① | `openPanelOnActionClick: true` 吞掉 `chrome.action.onClicked` | `service-worker.ts:581`（`onInstalled`）vs 绑定逻辑在 `:604` 的 `onClicked` | 点图标**只开面板、从不绑定**，绑定路径整体成死代码 |
| ② | 无 `tabs` 权限、无该站点 host 权限、无 activeTab 手势授权时 `tab.url === undefined` | `manifest.json`（permissions 无 `tabs`；`optional_host_permissions` 仅 `https://*/*`） | `projectActiveTab` → `restrictedPageReason('')` → 「没有可读取的地址」；`rebind` 的 `tab.url ?? ''` → `tabOrigin('')=null` → 不可绑定；`http://localhost:5173` 不被 https-only 覆盖，**连权限都无法申请** |

附：两处代码级证据（`test/ui/binding.mjs` 阶段 0 实证）——未授权时 `chrome.tabs.query().url === undefined`；
未授权头下 `chrome.permissions.request('http://localhost:5173/*')` 在 headless **一直 pending**（无原生弹窗，
非静默失败，如实记录）。

### 17.2 修复逐项（file:line 前后对照）

**A. 点图标可靠地「绑定 + 开面板」（核心）**

- `src/background/service-worker.ts:644-648`（前：`chrome.runtime.onInstalled` 内 `setPanelBehavior({openPanelOnActionClick: true})`）
  → `:647` `void configureSidePanelBehavior()`（`:134-141`，显式 `openPanelOnActionClick: false`，每次 SW 启动都执行，
  可修复 ≤0.8 升级残留）。
- `src/background/service-worker.ts:668-686`（前：`onClicked` 仅 `ensureContentScript` + 直接 `bindTab`）
  → `:673-687`：`onClicked(tab)` 内先**同步** `const opening = openSidePanel(tabId)`（`:115-127`，调用
  `chrome.sidePanel.open({tabId})`，同一用户手势内，**先于任何 await**），再 `bindTab(s, tabId, tab.url)`
  （`:92-107`，复用注入+绑定+换 origin 清会话），最后 `await opening`。`open` 抛错时 `panelNotice` 给可读提示
  「已绑定站点，但自动打开侧栏失败…请点击浏览器工具栏的插件图标」，**不静默失败、不撤销绑定**。
- `manifest.json:6` `minimum_chrome_version` `114 → 116`；`build.mjs:39` esbuild `target: chrome114 → chrome116`。
- 会话失效逻辑保留：`tabs.onUpdated(loading)`（`:711-724`）不变；**新增** `tabs.onActivated`（`:693-707`）：
  绑定标签页被切走时 `controller.markStale()`（`controller.ts:83-88`：置 `invalidated=true`，**保留**
  origin/discoveryState/descriptor，避免把「切标签页」误当「导航」而静默拆掉可用绑定）并给侧栏可读提示
  「已切换标签页：原绑定站点已标记失效…」。无 `tabs` 权限下 `onActivated` 拿不到新标签页 url，**只比较 tabId、
  不读 url、不报错**。

**B. http 站点可被持久授权**

- `manifest.json:17-20` `optional_host_permissions`：`["https://*/*"]` → `["http://*/*","https://*/*"]`（保留 https）。
- `src/platform/extension-env.ts`：新增 `requestOriginPermissionDetailed(origin)`（返回 `{granted, pattern, reason}`，
  http origin 生成 `http://localhost:5173/*`，失败给可读 reason）；侧栏 `#authorize` 改用它，回执明确「已获得站点
  访问权限（pattern）」或「未获得持久站点权限（原因），回退到 activeTab 临时授权——仅在点击插件图标的手势内有效」。

**C. 错误文案指向可执行动作**

- `src/background/state-message.ts:58-63`（前：`if (!url) return '当前标签页没有可读取的地址'`）
  → 明确「无法读取当前标签页地址（Chrome 尚未把该地址交给插件——通常是还没在目标站点点击插件图标授权）；请在
  目标站点标签页点击浏览器工具栏的插件图标」。
- `src/background/state-message.ts:78` 新增 `ActiveTabView.addressUnreadable`（`url` 为空即置位，区别于受限页）；
  `src/ui/sidepanel/view-model.ts:149-163` 据此走「尚未绑定（读不到标签页地址）」分类，**不再误称「不可注入」**，
  动作明确「点插件图标（绑定的唯一触发点）」。`rebind` 失败文案（`service-worker.ts:568-573`）同样明确指引。
- `view-model.ts:222` 首次引导第 3 步改为「点击浏览器工具栏的插件图标（这是绑定的唯一触发点）：插件会绑定并发现
  当前站点，然后自动打开侧栏」。

### 17.3 真站点全链路实证（`npm run test:binding`，33 断言 PASS）

真实 dist（JS 字节与发布一致）+ 真实 `http://localhost:5173` 的 lgdl-web（`/.well-known/web-cli.json` +
`<link rel="web-cli">`）+ 真实 Chromium（`.pw-browsers`，headless=new）+ 本地 mock LLM（不打真实厂商）。
逐步实测结果（原文）：

1. **绑定成功**：`rebind`（与 `onClicked` 共用 `bindTab()`）返回 `{ok:true,data:{origin:"http://localhost:5173",
   tabId:<id>, contentInjected:true}}`；`state.active.origin` 一致。✔
2. **content.js 注入成功**：`contentInjected=true`。✔
3. **discovery 走到 supported**：`state.active.discoveryState="supported"`，工具面含 `site.lgdl-web-cli`（well-known 通道）。✔
4. **【授权当前站点】成功**：真实点击 `#authorize` → `permissions.request('http://localhost:5173/*')` 立即 `true`
   （临时 dist 预授予；见披露②）→ 回执「已授权…；已获得站点访问权限（http://localhost:5173/*）…」，`state.authorized=true`。✔
5. **发送按钮变为可用**：`#send.disabled=false`，`#send-reason` 为空。✔
6. **mock LLM 一轮对话**：真实键入 `11111` → 点「发送」→ 侧栏出现 assistant 回复（含 `11111`），**无错误条目**。✔

另证 `tabs.onActivated`：切走绑定标签页后 `state.active.invalidated=true` 且 `panelNotice` 含「已切换标签页」。✔
侧栏页全程 **0 未捕获异常 / 0 console error**。

> **披露①**：Chrome 未暴露程序化触发 `chrome.action.onClicked` 的 API，本脚本改用与 `onClicked` **同一个
> `bindTab()`** 的等价绑定消息（`rebind`），并另行**实时断言**修复后的根因事实 `openPanelOnActionClick===false`
> + `chrome.sidePanel.open` 可用；「图标点击→绑定」的 wiring 由 `test/binding-wiring.test.ts` 静态钉住。
> **披露②**：headless 无法合成原生权限弹窗（未授权请求一直 pending，已用 4s race 记录为 `PENDING_TIMEOUT`），
> 故主链在临时 dist 副本里把 `http://localhost:5173/*` 预先加入 `host_permissions`（**JS 字节零改动**），使真实的
> `#authorize` 点击路径可跑通；`optional_host_permissions` 声明本身由阶段 0 实时读取 manifest 断言。

### 17.4 新增/调整测试

- 新增 `test/ui/binding.mjs` + `npm run test:binding`（**33 断言**，两阶段：真实 dist 复现根因 + 真站点全链）。
- 新增 `test/binding-wiring.test.ts`（3 测试：`openPanelOnActionClick` 不得为 true、`onClicked→bindTab/openSidePanel`
  wiring、`onActivated` 不读 url；最小权限红线）。
- `test/state-message.test.ts`：`restrictedPageReason('')` 断言改为「指向点击插件图标」且**不得**再含「没有可读取
  的地址」；补 `addressUnreadable` 断言。
- `test/sidepanel-view.test.ts`（+2）：`addressUnreadable` 归类为「尚未绑定」+ 指向插件图标 + 不得出现「不可注入」；
  引导第 3 步含「唯一触发点」。
- `test/controller.test.ts`（+1）：`markStale` 保留 origin/discovery/descriptor 仅置 invalidated。
- `test/extension-env.test.ts`（+2）：manifest `optional_host_permissions` 含 `http://*/*`、`min≥116`、无 `tabs`；
  `requestOriginPermissionDetailed` 对 `http://localhost:5173` 产出 `http://localhost:5173/*` 且失败有可读 reason。

### 17.5 门禁（本轮复跑）

| 门禁 | 结果 |
|------|------|
| `build`（插件） | PASS（build stamp 2026-09-12T07:20:50Z；`target=chrome116`） |
| `tsc --noEmit` | 0 error |
| `npm test`（插件） | **191 pass / 0 fail**（183→191，+8） |
| `test:ui` | PASS 41 断言 |
| `test:hardening` | PASS 22 断言 |
| `test:e2e` | PASS 场景 A/B |
| **`test:binding`（新增）** | **PASS 33 断言**（真站点 6 步全链） |
| 全仓 `build` + `test` | **0 fail**；base **483 零回归**（core 267 / render 94+1skip / router 8 / lgdl-web 31 / web-cli 84 / op-cli 15 / base 483 / plugin 191） |
| 红线 | base 零改动、无新依赖、**无 `<all_urls>`、无新增 `tabs` 权限**、无明文 key、未 git 提交 |

### 17.6 新增决策（D-064~D-068）

- **D-064（绑定唯一触发点 + 可读降级）**：`openPanelOnActionClick` 显式置 `false`（每次 SW 启动执行，修残留），
  `action.onClicked` 内**先同步** `sidePanel.open`（保手势）再 `bindTab`；`open` 失败**不撤销绑定**，仅给
  「请手动点图标开侧栏」可读提示。`minimum_chrome_version`/esbuild target 提到 116。`optional_host_permissions`
  补 `http://*/*` 让本地 http 开发站可申请持久授权；`requestOriginPermissionDetailed` 携带可读 reason 并明确
  activeTab 回退。**不引入 `tabs` 权限**——点击回调的 `tab.url` 在本手势下必含地址，是 Chrome 语义保证。
- **D-065（`tabs.onActivated` 只标记不拆除）**：绑定标签页被切走时新增 `controller.markStale()`（保留
  origin/discoveryState/descriptor，仅 `invalidated=true`）+ 可读提示；无 `tabs` 权限时**只比较 tabId、不读 url**，
  避免把「切标签页」误当「导航」而静默销毁可用绑定（`markNavigated` 语义保持不变，仅用于 loading 导航）。
- **D-066（`addressUnreadable` 分类）**：`projectActiveTab` 对空 `url` 输出独立标记，`activeSiteNotice` 归为
  「尚未绑定」而非「不可注入」，文案指向「点插件图标（唯一触发点）」；废除误导性的「当前标签页没有可读取的地址」。
- **D-067（真站点绑定门禁）**：新增 `test/ui/binding.mjs` + `npm run test:binding`，用真实 dist + 真实
  `http://localhost:5173` + mock LLM 固化 6 步全链；两处 headless 不可能（图标不可脚本触发 / 无原生权限弹窗）
  以「等价绑定消息 + 临时 dist 预授权 + 静态 wiring 断言」如实补位并在脚本头部披露，**不冒充真手势**。
- **D-068（可读提示通道 additive）**：`state` 消息新增一次性 `panelNotice`（`takePanelNotice()` 消费即清）；
  侧栏 `refreshState()` 在同步状态后以其覆盖 notice。既有 `state` 字段与 `PluginMessageKind` 均不变（零删除零降级）。

### 17.7 未完成 / 未复现（如实）

- **真实用户手势下的 `chrome.action.onClicked` 与原生权限弹窗**仍未在自动化中触发（Chrome 无脚本 API / headless
  无 UI）；本轮的替代证据（等价 `bindTab` 消息 + 运行时 `openPanelOnActionClick=false` + 真站点全链）已最大限度
  逼近，但**图标点击那一刻**的真实手势链路仍属人工面（见 §17.3 披露①②）。
- 本机系统 Google Chrome 仍未安装；`test:binding` 在 `.pw-browsers` Chromium 1234（headless=new）上跑。
- 站点使用**已在 `:5173` 运行**的 lgdl-web（本仓真实 dev/preview 服务）；无运行服务时脚本用 `vite preview` 起本仓
  `lgdl-web/dist`，未跑 `vite dev`（避免 predev 全量构建的不确定性）。

## 18. 工具名非法字符缺陷修复（用户实测第五轮，D-069~D-073）

### 18.1 根因（代码级，已确认，base 红线不可改）

- `packages/web-cli-base/src/router.ts:180-182` `fqNameOf(entry)` = `namespace ? namespace + '.' + name : name`；
  `router.ts:451-454` `deriveTools()` 把 **fqn 直接作为 LLM 工具名**（`return { name: fqn, ... }`）。
- 旧插件 `declared-tools.ts`：`name: decl.id` + `namespace: 'site'` → LLM 名 = `site.<decl.id>`
  （真实 LGDL 站点 = `site.lgdl-web-cli` / `site.lgdl-web-op-cli`）；`admin-tools.ts`：
  `namespace: 'plugin'` → `plugin.<name>`。**均含 `.`**。
- DeepSeek/OpenAI 的 function name 约束为 `^[a-zA-Z0-9_-]+$`，含 `.` 直接 HTTP 400
  （用户原文：`400 Invalid 'tools[0].function.name': string does not match pattern ...`）。

### 18.2 修复逐项（file:line 前后对照）

| 位置 | 前 | 后 |
|------|----|----|
| `tools/declared-tools.ts:37` | （无） | `sanitizeToolName()`：非 `[A-Za-z0-9_-]` → `_`，折叠连续 `_`，去首尾 `_`，空→`tool` |
| `tools/declared-tools.ts:61` | （无） | `allocateSiteToolNames()`：确定性碰撞分配（`_2`/`_3`…，不静默覆盖） |
| `tools/declared-tools.ts:300-330` | `name: decl.id` / `namespace: SITE_NAMESPACE` / `schema.name: site.<id>` / `group:'site'` | `name: site_<sanitized>` / `namespace: ''` / `schema.name` 同名 / `group: SITE_GROUP('site')`；`executor` 仍用**原始 `decl.id`** 调 `rpc.invoke`（RPC 保真） |
| `tools/declared-tools.ts:273` | `site.${decl.id} —— …` | `site_<sanitized> —— …` + 「站点原始工具 id：…（执行仍按原始 id…派发）」 |
| `tools/admin-tools.ts:18-20,47-149` | `name:'origin-authorize'` + `namespace:'plugin'` → `plugin.origin-authorize` | `name: admin_<name>` + `namespace:''` → `admin_origin-authorize` 等 6 个；`group: ADMIN_GROUP('plugin')` 不变 |
| `security/policy.ts:40,77,91,108` | `input.namespace !== 'site'` 判据 | `input.group !== PLUGIN_SITE_GROUP('site')`（等价可靠判据；执行门禁语义逐条不变，未放宽） |
| `background/host.ts:29,105,110-119,138` | `siteFqns.push(site.${entry.name})` / `tc.name.startsWith('site.')` | `siteFqns.push(fqNameOf(entry))` / `isSiteToolName(tc.name)`（`site_` 前缀）；碰撞写 `descriptor-read` 审计 detail「工具名去重：…」 |
| `background/service-worker.ts:54` | `Tools in the "site." namespace …` | `Tools named "site_*" are declared by the site … (original id preserved)` |
| `docs/`（dev/capability-matrix/gate-d/smoke-checklist/compliance/migration） | `site.lgdl-web-cli` / `plugin.audit-export` / `plugin.*` / `site:*` | `site_lgdl-web-cli` / `admin_audit-export` / `admin_*` / `site_*` |

**碰撞与 RPC 保真策略**：`decl.id` 仅用于 ① 页面 RPC（`executor` 闭包捕获原始 `decl.id`）② 插件自决
risk 启发式（`idSegments`/`isSafeReadOnlyTool`，未改）。发给 LLM/路由注册的名字是扁平 `site_<sanitized>`；
`allocateSiteToolNames` 按描述符顺序确定性分配，命中去重者记 `deduped:true` 并入审计、help 同时展示原始 id。

### 18.3 真站点 tools 捕获实证（`npm run test:binding`，38 断言 PASS）

`test/ui/binding.mjs` 的 mock LLM 现**捕获每个请求体的 `tools`**，在真实
`http://localhost:5173` lgdl-web + 输入 `11111` 一轮对话后断言。实测发给 LLM 的 12 个工具名（原文）：

```
admin_origin-authorize, admin_origin-revoke, admin_origin-list,
admin_descriptor-show, admin_audit-export, admin_llm-config,
ask-user, site_lgdl-web-cli, site_lgdl-web-op-cli,
web-fetch, sleep, web-cli-help
```

- `#6d` 全部匹配 `^[a-zA-Z0-9_-]+$` ✔（非法项空集）
- `#6e` 站点工具以 `site_lgdl-web-cli` 出现 ✔；`#6f` 管理工具以 `admin_*` 出现 ✔；`#6g` 零点号 ✔
- 同轮 `#6b` 对话过程**无错误条目** ✔（`400` 直接复现门禁）

### 18.4 附带疑点 B/C 结论 + 证据

**B「同一 400 出现两次」= base `AgentRunner` 的「失败重试一次」，非用户发两次、非重复渲染。**
- 证据：`web-cli-base/src/runner.ts:107-119` `handleLlmError`：首次失败 `failCount 0→1` → 调
  `events.onLLMError(msg, true)` 并 push 纠错 user turn 后**重试**；第二次失败 → `events.onLLMError(msg, false)` 停止。
- 旧插件 `service-worker.ts` 的 `onLLMError: (message) => …{variant:'error', text:message}` **丢弃 `willRetry`**，
  两次都发 `error`，侧栏两条 `system:` 完全相同（侧栏逐条 append，非重渲染）。
- 修复（additive，**base 未改**）：新增 `background/chat-events.ts:25 llmErrorEvent(message, willRetry)`——
  首次→`variant:'tool'`「⚠ LLM 调用失败，正在自动重试一次…（原因）」；最终→`variant:'error'`。重试本身是 base 既有设计。

**C「未授权」（首次引导第 4 步未完成）下的门禁 = 符合既有设计：授权只门禁「执行」，不门禁「声明」。**
- **执行 fail-closed**：`host.dispatch(site_notes-list)`（未授权）→ `ok:false`，输出 `权限被拒：策略 S1-origin-authorization 拒绝`，
  `rpc.invoke` **零调用**，审计记 `permission/deny`（断言：`test/host.test.ts`「compliance: unauthorized site tool is declared but NOT executable」）。
- **声明可见**：`host.activateSite` 无条件注册工具，未授权时 `deriveTools()` 仍含 `site_*`（能力面进入 LLM tools 列表）。
- **为何「未授权还能发消息」**：侧栏发送按钮只要求**存在活跃站点**（`view-model.ts:267 sendDisabled = pending || !hasOrigin`），
  与 `authorized` 无关——对话/LLM 调用本身不受站点授权门禁，只有**站点工具执行**受门禁。故用户所见「未授权仍可发消息并触发
  LLM 调用」属既有设计，且其 `nihao` 在工具执行前就因非法工具名被厂商 400 拦下（本次 §18.1 根因）。
- spec FR-023 只要求「未授权 origin 一律**拒执行**」，未禁止声明或对话；故**未改语义**。
- 影响与建议（未擅自改）：未授权时站点工具的 schema/summary 仍会随请求发给 LLM（**能力面披露**，非执行漏洞；
  且这些声明本就公开在站点 `/.well-known/web-cli.json`）。若后续要求「未授权不暴露工具面」，可在
  `host.deriveTools()` 按 origin 授权态过滤、并同步收紧 `sendDisabled`——这会改变现有 FR-016 的
  「发现→声明→工具面组装」时序与对话可用性，须经 spec/ADR 裁决，本轮不擅自更改。

### 18.5 新增/调整测试

- `test/host.test.ts` 新增 3：**LLM function names 强制门禁**（`host.deriveTools()` 每个 name 匹配
  `^[a-zA-Z0-9_-]+$`，含站点/管理/内建；覆盖 sanitize/去重/原始 id 保真/碰撞审计）、**RPC 保真**
  （`site_graph_read` 派发 `graph.read`；help 双展示）、**未授权声明可见+执行 fail-closed**。
- `test/security.test.ts` 新增 1：`site_*` 但 `group!=='site'` 不误入站点策略；既有 S1/S2/S3 用例改传 `group`。
- `test/chat-events.test.ts` 新增 1：重试→notice、最终→唯一 error。
- 既有 `host/e2e.generality/perf-budget/content/state-message/sidepanel-view/chat-session` 用例改扁平名。
- `test/e2e/fullchain.mjs` mock 工具名改 `site_*`（A/B 场景）。
- `test/ui/binding.mjs` +5 断言：捕获真实 `tools` + 合法性 + `site_*`/`admin_*`/零点号。

### 18.6 门禁（本轮复跑）

| 门禁 | 结果 |
|------|------|
| `tsc --noEmit`（插件） | 0 error |
| `npm test`（插件） | **196 pass / 0 fail**（191→196，+5） |
| `test:ui` | PASS 41 断言 |
| `test:hardening` | PASS 22 断言 |
| `test:e2e` | PASS 场景 A/B |
| `test:binding`（真站点全链） | **PASS 38 断言**（含真实 `tools` 合法性硬门禁） |
| 全仓 `build` + `test` | **0 fail**；**base 483 零回归**（core 267 / render 94+1skip / router 8 / lgdl-web 31 / web-cli 84 / op-cli 15 / base 483 / plugin 196） |
| 红线 | **base 零改动**（`git diff -- packages/web-cli-base` 空）、**无新依赖**（package.json 零 diff）、无新增权限、无明文 key、**未 git 提交** |

### 18.7 新增决策（D-069~D-073）

- **D-069（扁平工具名）**：所有发给 LLM 的插件工具名必须匹配 `^[a-zA-Z0-9_-]+$`；站点工具 =
  `site_<sanitizedId>`、管理工具 = `admin_<name>`，注册用 `namespace: ''`（避免 `fqNameOf` 拼点），
  **help 分组 `group` 不变**（`site`/`plugin`）。依据 = base `fqNameOf`/`deriveTools` 把 fqn 当 LLM 名。
- **D-070（RPC 保真）**：注册名可扁平化，**执行仍按站点原始 `decl.id`**（executor 闭包捕获）；站点侧零改动。
- **D-071（确定性碰撞分配 + 审计）**：`allocateSiteToolNames` 对 sanitize 同名者按描述符顺序加 `_2`/`_3`…，
  help 展示原始 id，`descriptor-read` 审计记「工具名去重」，**绝不静默覆盖**（base 重复注册会抛错）。
- **D-072（策略判据等价替换）**：站点策略由 `namespace==='site'` 改为 `group==='site'`（`PLUGIN_SITE_GROUP`）；
  risk/subcommandRisks/fail-closed 语义逐条不变，未放宽。
- **D-073（重试与错误的可读区分）**：base 重试语义不改；插件用 runner 提供的 `willRetry` 把可重试失败呈现为
  提示、仅最终失败呈现为 `error`（消除同一错误显示两次），并顺带修正「首次失败即提前清 pending」。

### 18.8 未完成 / 未复现（如实）

- 未在**真实 DeepSeek/OpenAI** 端点复跑（`test:binding`/`test:e2e` 用本地 mock；mock 不校验 function-name 约束，
  故另以「捕获 tools + 正则断言合法」直接复现本次事故的判定面）。真实厂商端到端仍属人工面 H7。
- `sanitizeToolName` 对 `:`/`/` 等字符的替换属**纵深防御**：站点描述符解析器（`protocol/descriptor.ts:100`）
  本就只接受 `[A-Za-z0-9_.-]`，实际触发的是 `.`（如 `graph.read`）。

## 19. 侧栏消息 Markdown 渲染与消息样式（TASK-022，用户实测第六轮）

### 19.1 现象与代码级定位

用户跑通全链后反馈：对话框里模型回复显示为**纯文本**——`# 标题`、`| 类别 | 示例 |`、
`**加粗**`、代码块全部原样显示成字符。代码级定位（直接采信）：

- `src/ui/sidepanel/sidepanel.ts`（改前）每条记录 `div.textContent = \`${entry.role}: ${entry.text}\``——**纯文本、无 Markdown、无消息样式**；
- `src/ui/sidepanel/index.html` 内联 `<style>`（构建时原样拷贝，CSS 没丢），但 `#log` 只有 `white-space: pre-wrap`；
- 记录条目已带 `entry.role`（user/assistant/tool/system）与 `entry.text`，已有 `.entry-tool`/`.entry-error` 类但几乎没用到。

### 19.2 实现

| 操作 | 文件 | 说明 |
|:--:|------|------|
| NEW | `packages/web-cli-plugin/src/ui/sidepanel/markdown.ts` | 零依赖安全 Markdown → DOM。`parseMarkdown`/`parseInline`/`safeHref` 纯逻辑；`renderMarkdown(src, doc)` 只依赖最小 `DomFactory`（真实 `document` 即可满足）。 |
| MODIFY | `src/ui/sidepanel/sidepanel.ts` | 新增 `ROLE_LABEL` 与 `renderEntry()`：每条消息 = 角色标签（`你/助手/工具/系统`）+ 内容区；assistant 调 `renderMarkdown`，其余 `textContent`；保留 `entry-<role>`/`entry-error` 旧类，新增 `msg msg-<role>`。 |
| MODIFY | `src/ui/sidepanel/index.html` | 追加消息块与 Markdown 样式（角色色条 / 小字灰标签 / `pre`+`table` 横向滚动 / `code` 等宽 / `overflow-wrap:anywhere`）。 |
| NEW | `packages/web-cli-plugin/test/markdown.test.ts` | 12 用例（最小假 DOM，node 环境）。 |
| MODIFY | `test/sidepanel-view.test.ts` | 静态钉住集成（消息类名/样式/无旧纯文本行）。 |
| MODIFY | `test/ui/journey.mjs` | mock LLM 增 Markdown 回复；新增 #14a~#14i。 |
| MODIFY | `docs/dev.md`（§10.8 + 变更记录）、`.sddu/.../build.md`、`tasks.md`、`state.json` | 文档与状态。 |

**支持的语法子集**：ATX 标题 `#`~`######`；水平线 `---`；引用 `>`；无序/有序列表（含简单嵌套）；
段落；行内 `**粗**` / `*斜*` / `` `code` `` / `~~删除~~`；围栏代码块 ```lang（原文保留、内部不解析）；
GFM 管道表格；`http`/`https` 链接。**不支持**（宁缺勿滥，未纳入）：图片、嵌套引用、任务列表、YAML
front-matter、脚注、HTML 块、转义反引号外的复杂嵌套强调——均按纯文本安全呈现，不影响其他块。

### 19.3 安全策略（为何无 XSS）

输入 = LLM 输出 + 站点内容，一律不可信。模块的安全性是**结构性**的：

1. **全程不解析 HTML**：不使用 inner-html / outer-html / adjacent-html 这类 HTML 字符串写入 DOM API；所有文本经
   `createTextNode` / `textContent` 注入，浏览器只会当纯文本。`<img src=x onerror=…>` / `<script>` 因此以字面文本
   呈现，永远不会变成元素或被执行。
2. **只创建白名单标签**：`h1`~`h6`/`p`/`hr`/`blockquote`/`ul`/`ol`/`li`/`pre`/`code`/`strong`/`em`/`del`/`a`/`table`/
   `thead`/`tbody`/`tr`/`th`/`td`。`img`/`script`/`iframe`/`style`/`link`/`object`/`embed` 无法被产出。
3. **链接 scheme 网关**（`safeHref`）：无显式 scheme 或非 `http(s)` 返回 `null`，调用方把整个 `[label](url)` 降级为
   纯文本；锚点属性用 `setAttribute` 写入，`target="_blank"` + `rel="noreferrer noopener"`。
4. 围栏 info string 仅保留 `[A-Za-z0-9_+.-]` 作为 `class="language-<x>"`，不拼接 HTML。

> 关于「先转义再解析」：本实现**不做输入转义**，因为转义后仍用 `textContent` 会双重转义、用 HTML 字符串 API 又会
> 引入解析面。改为「(a) 解析出纯数据结构 + (b) 只用 `createTextNode`/白名单 `createElement` 建 DOM」，等价于把
> 不可信输入安全落为文本且无双重转义——比转义方案更强。仓库内唯一 `outerHTML` 是
> `src/content/content-script.ts:70` 的**只读** `document.documentElement.outerHTML`（读取页面 `<link rel="web-cli">`），非注入。

### 19.4 消息呈现与保留语义

- **assistant** → Markdown；**user** → 纯文本 `pre-wrap`；**tool/system** → 等宽 + `pre-wrap`（保留空白/制表符，不解析）。
- 角色色条：`.msg-user` 蓝 / `.msg-assistant` 靛 / `.msg-tool` 灰 / `.msg-system` 琥珀；角色标签小字灰。
- 保留既有语义：`#log.empty:not(:has(> *))` 空态、`log.textContent = ''` 清空、`render()` 末尾 `scrollTop = scrollHeight`；
  `#log { height: 45vh; overflow: auto; ... white-space: pre-wrap; }` 原样保留（既有静态断言继续通过）。
- **窄侧栏防溢出**：`.msg-content { overflow-wrap: anywhere; }`，`pre`/`table` 各自 `overflow-x: auto`，`#log.scrollWidth === clientWidth`。

### 19.5 门禁结果

| 门禁 | 结果 |
|------|------|
| `npm run typecheck`（`tsc --noEmit`） | **0 error** |
| 插件 `npm run test` | **209 pass / 0 fail**（196→209，+13：`markdown.test.ts` 12 + 集成静态 1） |
| `npm run test:ui` | **PASS 50 断言**（41→50：新增 #14a~#14i；含"无水平溢出"复断言） |
| `npm run test:hardening` | **PASS 22 断言** |
| `npm run test:e2e` | **PASS 场景 A/B** |
| `npm run test:binding` | **PASS 38 断言**（保留 `.entry-assistant`/`.entry-error` 选择器 → 零回归） |
| 全仓 `build` + `test` | **0 fail**；**base 483 零回归**（core 267 / render 94+1skip / router 8 / lgdl-web 31 / web-cli 84 / op-cli 15 / base 483 / plugin 209） |
| 红线 | **base 零改动**（`git diff -- packages/web-cli-base` 空）、**无新依赖**（`package.json` 零 diff）、无新增权限、无明文 key、`src/` 无 inner-html 写入 API、**未 git 提交** |

### 19.6 新增决策（D-074~D-078）

- **D-074（结构化 DOM，拒绝 HTML 解析）**：安全 Markdown 渲染一律用 `createTextNode`/白名单 `createElement` 构建，
  **不引入任何 HTML 字符串写入 API**；不可信文本只可能成为文本节点。比「先转义再 innerHTML」更强且无双重转义。
- **D-075（解析 / 建 DOM 分离）**：`parseMarkdown`/`parseInline` 为纯函数（返回 AST），`renderMarkdown(src, doc)` 只依赖
  最小 `DomFactory`。既保证 node 环境可测（最小假 DOM，无需 jsdom 依赖），又让安全断言能直接检查「实际创建了哪些节点」。
- **D-076（按角色分级渲染）**：assistant → Markdown；tool/system → 等宽 `pre-wrap` 原文（CLI/整份文档不解析）；
  user → 纯文本。避免对工具结果误解析造成信息损失或注入面。
- **D-077（链接 scheme 白名单）**：仅显式 `http`/`https` 渲染 `<a>` 并加 `rel="noreferrer noopener"` + `target="_blank"`；
  其余 scheme（含 `javascript:`/`data:`/相对/协议相对）整段降级纯文本。
- **D-078（保留既有 DOM 语义 + 零水平溢出）**：保留 `.entry-<role>`/`.entry-error`（既有门禁选择器）与 `#log` 空态/
  `white-space: pre-wrap`/自动滚底；新样式以 `overflow-wrap:anywhere` + 子级 `overflow-x:auto` 保证窄侧栏不撑破。

### 19.7 未完成 / 降级（如实）

- `test:ui` 的 #14a~#14i 通过**真实面板的 `chat-result` 消息接缝**渲染（内容实时取自本地 mock LLM）。完整
  background chat 管线需要「已绑定 + 已授权站点」，而 `journey.mjs` 是无站点的 hermetic 旅程，故未走全链——该
  全链渲染由 `test:binding` 的 #6（真实站点 + mock LLM 对话）覆盖到「助手气泡出现且含回复文本」，但未在其中断言
  Markdown 元素（binding 的 mock 回复是纯文本）。两处互补，均如实披露。
- 未支持完整 GFM（见 §19.2 不支持清单）；未做语法高亮（无新依赖，代码块仅等宽 + 横向滚动）。
- 真实第三方厂商端到端仍属人工面 H7，不冒充。

## 20. 侧栏整体 UI/UX 重做（TASK-023，用户实测第七轮）

> 用户反馈：**插件侧栏的对话体验比「做插件之前原本的 AI 助手」明显更差**；要求整体重做（非继续打补丁），
> 设计基准 = 原 LGDL 内置 AI 助手（TASK-016 已移除，仍在 git 历史）。本轮**先读回原始实现**再重做。

### 20.1 现状诊断（主 Agent 已核对，采信）

`src/ui/sidepanel/index.html` 原为「功能优先堆叠」，一列 `#env-guard → #status → .topbar（8 按钮横铺）
→ #llm-test-result → #site-hint → #onboarding → #discovery-notice → #notice → 8 按钮行 → #log → #confirm
→ #ask → #composer → #send-reason → #consent`。核心缺陷（**实测复现，非推测**）：

- `#log { height: 45vh }` 硬编码（旧 `index.html:45`）：对话区恒为视口 45%，上下被控件挤压。
- composer 不在底部固定：`#consent` 压在其后；**内容一多 composer 被挤出视口**——before 实测
  `composerGapToViewportBottom = -64px`（视口 900px，composer 底边在 964px，见 §20.4）。
- 工具结果整块倾倒：无气泡/分组/卡片/折叠；整份图文档 JSON 占满消息区。
- 无 pending 指示、无滚动跟随策略、无明暗适配（固定浅色）。

### 20.2 设计参照（必须执行）——原 AI 助手 → 本插件对齐表

参照取自 `git show 762d3a6^:packages/lgdl-web/src/ai/AiPanel.tsx` 与同提交 `packages/lgdl-web/src/app.css`
（`git ls-tree -r --name-only 762d3a6^ -- packages/lgdl-web/src/ai` 列出 8 个文件，AiPanel/SettingsPanel/AskDialog/
prompts/provider/session + 2 测试）；**只读参照，未拷贝任何 LGDL 私有代码**（插件零依赖红线）。

| # | 参照项（原 AI 助手） | 来源 | 本插件对齐 | 结论 |
|:--:|------|------|------|------|
| 1 | `.ai-messages { flex:1; min-height:0; overflow-y:auto }` 可滚动消息列 | app.css:362 | `#log { flex:1 1 auto; min-height:0; overflow-y:auto }`（index.html:166） | 已对齐 |
| 2 | `.ai-input-bar { flex-shrink:0 }` 输入区固定底部 | app.css:832 | `#panel-bottom { flex:0 0 auto }` + `#composer` 为末元素（index.html:340/505/542） | 已对齐（并修正「composer 后有 consent」） |
| 3 | 用户气泡：indigo 底 / 白字 / 右对齐 / 右下小圆角 | app.css:394 | `.msg-user .msg-content` + `.msg-user{justify-content:flex-end}`（index.html:198/205） | 已对齐 |
| 4 | 助手气泡：slate 底 / 左对齐 / 左下小圆角 | app.css:400 | `.msg-assistant .msg-content`（index.html:211） | 已对齐 |
| 5 | 系统气泡：amber 底 / 边框 | app.css:406 | `.msg-system .msg-content`（index.html:219） | 已对齐 |
| 6 | 工具输出：深色终端 `pre` / 等宽 / 横向滚动 | app.css:418/430 | `.tool-card-body`（深色等宽 + `white-space:pre` + `overflow:auto`）（index.html:297） | 已对齐（**并升级为可折叠卡片**） |
| 7 | web-cli 命令块（紫底等宽） | app.css:437 | `.cmd`（index.html:242） | 已对齐 |
| 8 | 思考中三点动画 | app.css:691-714 | `renderThinking()`（sidepanel.ts:120）+ `@keyframes blink`（index.html:311） | 已对齐 |
| 9 | AI 推荐下一步胶囊（next-actions） | AiPanel NextActionsCard | 未移植 | 不适用：`next-actions` 是 LGDL `lgdl-web-op-cli` 的领域子命令，随内置助手（TASK-016）一并下线；通用插件协议无此面 |
| 10 | 预置提示词滑轨（PRESET_PROMPTS ×19） | AiPanel | 未移植 | 不适用：全部为 LGDL 领域提示词（画图/改图），通用站点插件不可内置 |
| 11 | 事件通道摘要行（EventsStatusLine 轮询） | AiPanel | 未移植 | 部分/不适用：插件经 `events` 工具暴露通道，无面板摘要行；非本轮 UI 重做目标 |
| 12 | Markdown 渲染（react-markdown + remark-gfm） | AiPanel MarkdownBody | 零依赖安全 Markdown（TASK-022 `markdown.ts`，本轮复用） | 已对齐（子集；无图片/任务列表/脚注） |
| 13 | AskDialog 模态裁决（权限 ask / ask-user） | AskDialog.tsx | 内联 `#confirm`/`#ask` 卡片（既有，本轮仅改排版） | 部分：能力在，形态为内联卡片而非模态遮罩（侧栏空间约束下的有意选择） |
| 14 | 无角色标签，靠气泡区分 | app.css:372-406 | 移除旧 `.msg-role` 文本标签；user/assistant 靠对齐+配色区分，保留 `aria-label` | 已对齐 |
| 15 | 新消息无条件滚底 | AiPanel `scrollToBottom` effect | 仅「用户已在底部或刚发送」时跟随；上滚不强制跳 + 「回到底部」入口 | **优于参照** |
| 16 | 无 token 流式（`onAssistantText` 每整条回复一次） | runner.ts:144/190 | 同样无流式；以 thinking 三点指示代替 | **与参照持平**（非本轮退步，见 §20.7） |

### 20.3 布局改动逐项（file:line 前后对照）

| 项 | 前 | 后 |
|------|------|------|
| 文档高度/滚动 | `body { margin:0; padding:8px; overflow-wrap:anywhere }`（页面整体滚动） | `html,body{height:100%}` + `body{display:flex;flex-direction:column;overflow:hidden}`（index.html:72-83） |
| 顶部区 | 无分区；8 按钮横铺（旧 `.row`） | `#panel-top{flex:0 0 auto}`：状态行 + 主操作（配置/测试/授权）+ `<details id="more-actions">`（撤销/重绑/审计/计数）（index.html:115/476） |
| 中部消息区 | `#log{height:45vh;overflow:auto}`（旧:45） | `#panel-main{flex:1 1 auto;min-height:0}` + `#log{flex:1 1 auto;min-height:0;overflow-y:auto}`（index.html:165-166） |
| 底部区 | composer 后压 `#send-reason`+`#consent`，会溢出 | `#panel-bottom{flex:0 0 auto}`：strips(max-height:34vh 内滚) → `#confirm` → `#ask` → `#send-reason` → `#consent-slot` → `#composer`（**composer 为末元素**）（index.html:340/505-546） |
| 回到底部 | 无 | `#scroll-bottom` 绝对定位浮标（index.html:320/501），随滚动显隐（sidepanel.ts:228） |
| 明暗适配 | 固定浅色（`#fffbeb`/`#f8fafc`…） | CSS 变量 + `@media (prefers-color-scheme: dark)` 覆盖（index.html:53）；`color-scheme:light dark` |
| 消息呈现 | 单行 `role: text`（TASK-022 前）/ 分组块无气泡 | 角色气泡 + 可折叠工具卡片 + 命令行 + 错误醒目（sidepanel.ts:149） |

### 20.4 前后量化对照（真实 dist + CDP，视口 400×900）

证据脚本：`/tmp/ui-redesign/shot.mjs`（真实 `packages/web-cli-plugin/dist` + `.pw-browsers` Chromium，CDP
`Emulation.setDeviceMetricsOverride` + `Page.captureScreenshot`，经真实 `chat-result` 接缝注入固定对话）。

| 指标 | before（旧） | after（新） | 判定 |
|------|------|------|------|
| `#log` 计算 `flex-grow` | `0` | `1` | ✅ 改为 flex 填充 |
| `#log` 高度（有内容） | 405px = **45.0%** 视口（`height:45vh` 硬编码） | 589px = **65.5%** 视口（稳态，隐藏首用条） | ✅ |
| composer 底边 / 视口底（有内容） | 964px / 900px → **-64px（被挤出视口）** | 892px / 900px → +8px（=面板 padding，贴底） | ✅ 关键修复 |
| 消息区可视行数 | 20 | 28（稳态） | ✅ |
| `#log` 水平溢出 `scrollWidth-clientWidth` | 0 | 0 | ✅ 保持 |
| 文档级水平溢出（400 / 320px） | 0（但纵向溢出） | 0 / 0 | ✅ |
| 工具卡片数量 / 可否折叠 | 0（整块倾倒） | 2；长输出 `open=false` + 摘要，真实点击后 `open=true` | ✅ |
| 恶意 HTML（工具卡片内 `<img onerror>`） | 不适用（纯文本） | `img` 节点 0，原文以文本呈现 | ✅ 零 XSS |

截图（各 4 张）：`/tmp/ui-redesign/before/{01-empty,02-populated}.png`；
`/tmp/ui-redesign/after/{01-empty,02-populated,03-operational,04-operational-320}.png`。
（before 仅 2 态：旧布局在窄/稳态无独立呈现价值；after 增 320px 窄栏与稳态。）

### 20.5 实现（file:line）

- **布局/设计令牌**：`src/ui/sidepanel/index.html`（重写；三区 flex + tokens + dark mode；全部既有 ID 保留）。
- **消息渲染**：`src/ui/sidepanel/sidepanel.ts`
  - `renderEntry`（:149）角色分流；`renderToolCard`（:76）折叠卡片（标题=工具名+状态+耗时+首行摘要）；
    `renderCommand`（:62）命令块；`renderThinking`（:120）三点指示。
  - 折叠阈值 `TOOL_LONG_CHARS=480 / TOOL_LONG_LINES=10`（:50）；`toolOpenState` Map 记住用户展开态，
    规避「每次 state 派发整表重建导致折叠态丢失」。
  - 滚动策略 `isAtBottom`（:223）/`updateScrollHint`（:228）/`render`（:239）跟随逻辑；`forceFollow`（:220/589）发送即跟随。
  - `chat-result` 处理扩为 `tool`（带 `tool/ok/ms`）与 `command` 变体（:699/:708）。
  - `renderConsent` 挂载点由 `document.body` 改为 `#consent-slot`（:488），保证 composer 为末元素。
- **工具卡片元数据来源**：base `onToolOutput(text)` 只带文本；本轮以
  `events.onCommandLine`（记开始）+ `hooks.onToolDone(tc,result)`（工具身份 + ok）在 background 配对，
  由 `toolResultEvent()`（`src/background/chat-events.ts`）下发 name/ok/ms。
  `src/background/chat-runner.ts` 新增 `hooks` 透传（additive，base 零改动）。
  发射点：`src/background/service-worker.ts:304/311/320`。
- **状态面 additive**：`SidepanelState.trust` + `state` 动作（`chat-state.ts`）；`buildStateMessage` 增
  `trustOf`（`state-message.ts`）→ `service-worker.ts` 传 `s.origins.trustOf`；`#status` 显示
  `origin · 发现 · 授权 · 信任`（sidepanel.ts:265）。零明文、只读。

### 20.6 门禁结果（本轮复跑，原文摘录）

- 插件 `npm test`：**222 pass / 0 fail**（209→222，+13：chat-events +3 / chat-runner hooks +2 /
  state-message trust +1 / sidepanel reducer +4 / sidepanel-view 布局与 trust +3）。
- 插件 `tsc --noEmit`：**0 error**。
- `npm run test:ui`：**67 断言 PASS**（50→67；新增 `#15a~#15q`：flex 填充/占比/composer 贴底/三区/工具卡片
  折叠展开/卡片内零 XSS/命令块/错误气泡/无水平溢出/回到底部/320px 窄栏）。
- `npm run test:hardening`：**22 断言 PASS**。
- `npm run test:e2e`：**PASS**（场景 A fixture AC-010 + B LGDL Workbench AC-009；唯一偏差仍为本地
  host_permissions 预授权）。
- `npm run test:binding`：**41 断言 PASS**（38→41；新增 `#6h/#6i/#6j`：真实用户气泡存在 + indigo 用户色
  `rgb(79,70,229)` + 右对齐 `flex-end`）。
- 全仓 `npm run build`：**退出码 0**；全仓 `npm test`：**0 fail**
  （plugin 222 / base 483〔零回归〕/ lgdl-core 267 / lgdl-render 94+1skip / lgdl-web 31 / lgdl-web-cli 84 /
  lgdl-web-op-cli 15 / lgdl-router 8 / lgdl-cli 0 / lgdl-layout 0）。
- 红线：**base 零改动**（`git status packages/web-cli-base` 空）；**无新依赖**（`package.json` 无 diff）；
  **无 `innerHTML` 式渲染**；**MV3 CSP 合规**（内联 `<style>`/外链 `sidepanel.js`，无 CDN/框架）；既有 ID/选择器全保留。

### 20.7 未完成 / 降级（如实，不粉饰）

- **流式输出：未实现（真实技术限制）**。base `chat()` 为 `Promise<ChatResult>` 单次返回、`AgentRunner`
  的 `onAssistantText` 每整条回复触发一次（`runner.ts:144/190`），无增量回调/SSE 选项；插件亦未自造 provider 流式。
  **原 AI 助手同样无流式**（同 base 单发语义）——故这是与参照持平，不是本轮退步，但确实未达「有流式」的理想。以
  thinking 三点指示 + 贴底跟随改善等待观感。**未假装已实现**。
- 首用态（未配置/未授权、引导条可见）消息区实测 31.5% < 45vh：因 `#site-hint`/`#onboarding`（5 步）现居底部区，
  首次使用场景下引导占位较大；**稳态（引导收起）65.5%**。这是「引导可见时对话区偏小」的真实权衡，非硬编码回归。
- 未移植 next-actions 胶囊 / 预置提示词滑轨（参照 #9/#10）：领域特定，随内置助手下线，不适用于通用插件。
- 未移植 AskDialog 模态遮罩：沿用内联 `#confirm`/`#ask` 卡片（能力完整，形态不同）。
- 无语法高亮、无完整 GFM（同 TASK-022 边界）。
- 系统 Google Chrome / Microsoft Edge 未重测（本轮 UI 门禁仅在 `.pw-browsers` Chromium）。
- before 截图仅 2 态；before「稳态」高度按 `height:45vh` 恒等式推得 45%（硬编码，与内容无关），已在 §20.4 标注。

### 20.8 新增决策（D-079~D-086）

- **D-079（三区 flex 取代 45vh；composer 必须为末元素）**：`html,body{height:100%}` + `body{display:flex;
  flex-direction:column;overflow:hidden}`；`#log` 改为 `flex:1;min-height:0`。与用户清单的一处**有意偏差**：
  用户列表把 `#consent` 置于 composer 之后，但本轮把 `#consent`（折叠条、标题常显）移到 composer **之前**
  （`#consent-slot`），否则「composer 贴底」与「consent 常显」互斥（正是原缺陷成因）。语义/文案零删改。
- **D-080（工具卡片元数据来源）**：base `events.onToolOutput` 仅文本，无法支撑「工具名+状态+耗时」标题。以
  background 侧配对（`onCommandLine` 记开始 + `hooks.onToolDone(tc,result)` 取身份/ok）组装，经
  `toolResultEvent()` additive 下发；`chat-runner` 增 `hooks` 透传。**不改 base**，未观察到的字段省略不伪造。
- **D-081（折叠阈值 + 折叠态记忆）**：长输出（>480 字符或 >10 行）默认折叠、短输出默认展开；因 `render()` 每次
  整表重建，`toolOpenState` Map 记住用户显式开合，防重渲染丢态。
- **D-082（无流式，如实声明）**：见 §20.7；不引入 provider 流式改造（超出「UI 重做」范围且有回归风险），
  以 thinking 指示承接等待态。
- **D-083（滚动策略）**：仅当用户已在底部（阈值 24px）或刚发送时自动跟随；否则保留滚动位置并提供
  `#scroll-bottom`。优于参照的无条件滚底。
- **D-084（trust 只读投影）**：`buildStateMessage` 增 `trustOf`（additive，缺省 untrusted）、`SidepanelState.trust`
  + `stateActionFromPayload` 映射；无 origin/无 lookup 恒 `untrusted`，杜绝假「trusted」。零明文。
- **D-085（明暗适配）**：CSS 变量 + `@media (prefers-color-scheme: dark)`；原固定浅色在多处（工具卡深底除外）
  在暗色下刺眼，本轮统一。
- **D-086（零回归红线）**：全部既有元素 ID 与 `.entry`/`.entry-<role>`/`.entry-error`/`.msg-content`/`#log.empty:not(:has(> *))`
  选择器保留；仅**有意更新 3 条静态 CSS 断言**（`height:45vh` 契约已废止、`.msg-content` padding、
  `#input` 多行格式）——这是重做的必然结果，非测试降级。

## 21. 消息不自动滚到新消息缺陷修复（用户实测第八轮，D-087~D-089）

> 用户原话：「聊天框消息没有自动滚动到新消息，需要手动点击回到底部按钮」。TASK-023 引入的
> 「仅当已在底部才跟随 + 回到底部入口」策略在真实使用中**基本不跟随**。本节为 A 部分实现与验收。

### 21.1 代码级定位（回归根因）

旧实现（`src/ui/sidepanel/sidepanel.ts`，TASK-023 版）：

```ts
const follow = forceFollow || isAtBottom(log);   // 24px 阈值
const prevTop = log.scrollTop;
log.textContent = '';                            // ← 清空后 scrollTop 归 0
...
if (follow) log.scrollTop = log.scrollHeight;
else log.scrollTop = prevTop;
```

两个成因叠加：

1. **判定在追加前、且阈值过紧（24px）**：`isAtBottom` 用「本次 render 之前」的旧 `scrollTop`/
   `scrollHeight` 判定；任何一次误判（面板底部引导条/notice 显隐导致 `#log` 高度变化、亚像素取整）
   会把 `follow` 置 false。
2. **误判即「棘轮」**：一旦某次没跟随，代码把 `scrollTop` **还原成 `prevTop`**，此后每次 render 的
   旧位置都离底部越来越远 → `isAtBottom` 恒 false → **永远不再跟随**，只能手点「回到底部」。
   这就是「基本不跟随」的机制。
   注：`isAtBottom` 在 `log.textContent=''` **之前**调用，本身还能读到旧内容；但棘轮一旦形成无法自愈。

### 21.2 实现（file:line）

- **新增纯策略模块** `src/ui/sidepanel/scroll-policy.ts`（DOM-free，node 可测）：
  - `BOTTOM_THRESHOLD_PX = 48`（宽松阈值，远大于旧 24px）；`distanceFromBottom` / `isNearBottom`
    纯函数；`createScrollFollow()` 维护「锚定」布尔 + 一次性 `forced`。
  - `observe(metrics)` 由**真实 `scroll` 事件与布局后重新测量**喂入（不再用追加前的旧读数）；
    `userSent()` 置一次性强制跟随；`returnedToBottom()` 重新锚定；`shouldFollow()` 消费一次强制位。
- `src/ui/sidepanel/sidepanel.ts`：
  - 删除模块级 `forceFollow`，改 `const scrollFollow = createScrollFollow()`（:220-229 区域）。
  - `metricsOf`/`syncScrollAnchor`/`isAtBottom`/`updateScrollHint` 全部改为读实时 metrics。
  - `render()`：`const follow = scrollFollow.shouldFollow()`；追加完成后 `follow → followToBottom(log)`，
    否则 `log.scrollTop = prevTop`；末尾 `syncScrollAnchor(log)` + `updateScrollHint()`。
  - `followToBottom(log)`：`requestAnimationFrame` 首帧 `scrollTop=scrollHeight`，次帧仅当**仍锚定**
    时再钉一次（吸收 markdown 表格/字体/折叠卡片的二次回流；用户中途上滚则以用户为准，绝不抢滚动）。
  - 提交处理：`scrollFollow.userSent()` → `dispatch({type:'user'})`（**无条件**到底）。
  - `#log` `scroll` 监听 → `syncScrollAnchor()` + `updateScrollHint()`；`#scroll-bottom` 点击 →
    设 `scrollTop` + `scrollFollow.returnedToBottom()`。
  - 需求逐条落点：① 发送无条件（`userSent`）② 追加时锚定即跟随 + 48px + rAF 布局后（`followToBottom`）
    ③ thinking 出现/消失走同一 `render()`（`state.pending` 触发）④ 上滚不抢（`observe` 清锚 + 保留
    `prevTop` + `#scroll-bottom` 显隐不变）⑤ 一次 render 至多 2 帧、不复用循环、锚定丢失即停 → 无死循环/不强制每次跳。

### 21.3 测试

- `test/sidepanel.test.ts` +7 用例（`scroll:`）：阈值 ≥48 与 48/49 边界、over-scroll 归零、
  **发送→无条件到底**、在底部→追加跟随、已上滚→追加不跳 + 显示入口、回到底部重新锚定、空列表默认锚定。
- `test/ui/journey.mjs`（真实 dist + CDP）+3 断言：
  `#15r` 已在底部追加长回复 → 残差 ≤48px 且入口隐藏；`#15s` 已上滚追加 → `scrollTop` 仍在顶部附近（不抢）；
  `#15t` 已上滚 → 「回到底部」入口出现。
- `test/ui/binding.mjs`（真实站点 + 真实发送）+3 断言：`#6k` 消息区可滚动、`#6k2` 上滚入口出现、
  **`#6l` 真实用户发送后无条件滚到底**（残差 ≤48px 且入口隐藏）。**说明（如实）**：`journey.mjs` 是
  无站点 hermetic 旅程、发送按钮按设计禁用，无法触发真实发送；「发送→到底」因此落在唯一能真实发送的
  `binding.mjs`，而 journey 用真实 `chat-result` 追加面覆盖「底部跟随/上滚不跳」。两者互补，非测试降级。

### 21.4 门禁结果（本轮复跑）

- 插件 `test`：222 → **229 pass / 0 fail**（+7）；`npm run typecheck`（`tsc --noEmit`）**0 error**。
- `test:ui`：67 → **70 断言 PASS**（`#15r`/`#15s`/`#15t`）；`test:binding`：41 → **44 断言 PASS**（`#6k`/`#6k2`/`#6l`）；
  `test:hardening`：**22 断言 PASS**；`test:e2e`：**场景 A/B PASS**。
- 全仓 `npm run build` + `npm test`：**0 fail**（base **483 零回归**、lgdl-core 267、lgdl-render 94(1 skip)、
  lgdl-web-cli 84、lgdl-web 31、lgdl-web-op-cli 15、lgdl-router 8、plugin 229）。
- 红线：**base 零改动**（`git diff packages/web-cli-base` 空）；`package.json`/`.opencode/opencode.json` 零改动；
  **无新依赖**；既有测试零删除（仅对已废止的静态实现细节做等价替换，见 21.6）。未 git 提交。

### 21.5 新增决策（D-087~D-089）

- **D-087（滚动跟随改为「实时锚定 + rAF 布局后钉底」，48px 阈值）**：判定不再用追加前的旧
  `scrollTop/scrollHeight`；锚定由真实 `scroll` 事件与布局后测量维护（`scroll-policy.ts`）。
  发送为一次性强制跟随；追加内容仅在锚定时跟随。修复 TASK-023 的「误判即棘轮、永不跟随」。
- **D-088（用户上滚绝对优先，可测的显式策略）**：`observe` 在离底 >48px 即清锚并保留 `prevTop`；
  `followToBottom` 次帧仅在仍锚定时二次钉底。策略抽为纯模块以便 node 面断言（不再依赖浏览器）
  且 sidepanel 仅消费决策。
- **D-089（测试落点如实分工）**：`journey.mjs` 无站点、发送按钮禁用 →「发送→到底」无法在 journey 触发，
  改在能真实发送的 `binding.mjs` 断言；journey 覆盖追加跟随与上滚不跳。已在 §21.3 披露，非删减既有断言。

### 21.6 未完成 / 边界（如实）

- 保留 `isAtBottom(el)` 作为对 `isNearBottom` 的薄封装，仅为满足既有静态契约断言
  `sidepanel-view.test.ts:592`（`assert.match(ts, /isAtBottom\(/)`），**该断言未改**（零删除/零改写）。
- 双击/触控板惯性滚动期间的瞬时「未到底」仍按用户上滚处理（不抢滚动），符合需求 4/5。
- 未引入平滑滚动（`scroll-behavior:smooth`）——避免动画期间 `isNearBottom` 采样抖动；行为是即时贴底。
- 系统 Google Chrome / Microsoft Edge 未重测（UI 门禁仍仅 `.pw-browsers` Chromium）。

---

## 22. 能力面审计报告（B 部分，**只报告，未改任何行为/注册**）

> 背景：用户实测模型列出的可用工具只有 **11 个**；质疑「没识别到 web-cli-base 提供的基础命令」。
> 已核实：`src/background/host.ts:64` 的 `createCommandRouter({delayMs:0,policy,audit})` **未指定 `builtins`**，
> 只拿到 base 默认 3 内建；**base 的其余域工具一个都没注册**；`docs/capability-matrix.md` 有若干行与代码
> **漂移**。本章为审计事实与建议，**未改动任何工具注册/行为，也未改动 `capability-matrix.md`**（等作者裁决）。

### 22.0 结论先行（一句话）

插件的工具面比 base 窄，**三类原因同时存在，不是单一原因**：
1. **设计取舍（有依据）**——通用扩展宿主只保留「base 内建 3 + 管理 6 + ask-user 1 + 站点声明 N」这一
   最小面；base 其余 30+ 域工厂多为**页内 realm/领域工具**（doc/search/dom/chrome/cookie/dialog/net/collect…），
   对通用插件不适用或不属本轮（matrix 多数行「不适用/替代/后置」有据）。
2. **实现遗漏**——插件**从未装配 `PlatformEnv`、从未注册任何 base 域工厂**；`extension-env.ts` 只提供
   storage 两个 KV + host 权限 + 默认关闭的 DOM 缝。当前面里的 `web-fetch`/`sleep`/`web-cli-help` 纯属 base
   **默认内建**（`router.ts:133/243-246`），不是插件有意注册的。故若作者本意包含任何域工具（storage/session/
   notify/todo…），那些就是**未实现**，而非「被移除」。
3. **文档漂移**——`capability-matrix.md` 第 1/2 行把 `web-fetch`/`sleep` 写成「非独立工具/无独立工具」，
   但 base 把它们注册为**独立工具**且插件确实下发；第 27/31 行对 chrome/events 的「不适用/对齐」表述与
   代码事实不符（见 §22.3）。

### 22.1 base 全量工具工厂清单（`packages/web-cli-base/src`，file:line）

> 「禁用档」说明：**base 源码中没有任何工厂自声明 `enabled:false`**（唯一受开关影响的是
> `web-search.ts:103` 的 `enabled: opts.enabled !== false`）。所谓「禁用」是**已删除的内置助手注册矩阵**
> （`git show 762d3a6^:packages/lgdl-web/src/ai/session.ts`）用 `enabled:false` 显式登记：eval-js(:305)、
> subagent(:306)、page-eval(:321)、cookie(:349)、dialog(:350)、net(:351)；`capability-matrix.md` 的 6 个
> 「（禁用）」与该 6 行逐一对应。base v4 规格亦要求 cookie 写/网络拦截/对话框 override **默认关**
> （`.sddu/specs-tree-root/specs-tree-web-cli-base-v4/spec.md:222` FR-028）。

| 工厂（file:line） | 工具名 | group | risk | 禁用档？ | 构造依赖 / 消费的 env 缝 |
|---|---|---|---|---|---|
| `createAskUserToolEntry` ask-user.ts:121 | `ask-user` | ui | read | 否 | `{askUser?}` |
| `createCommandRouter` 内建 router.ts:243-246 | `web-fetch` tools.ts:22 | general | — | 否 | `fetch`（经执行器） |
| 同上 | `sleep` tools.ts:74 | general | — | 否 | 无（delayMs:0） |
| 同上 | `web-cli-help` tools.ts:104 | general | — | 否（`listed:false` router.ts:281） | router 自身 |
| `createStorageToolEntry` storage-tools.ts:175 | `storage` | storage | write | 否 | `StorageBackend` |
| `createStorageQuotaToolEntry` storage-tools.ts:188 | `storage-quota` | storage | — | 否 | `StorageBackend` |
| `createSettingsToolEntry` settings.ts:220 | `settings` | settings | state | 否 | `SettingsKv`（同步） |
| `createDocReadToolEntry` doc-tools.ts:236 | `doc-read` | doc | read | 否 | `DocToolDeps{resolve,listReadable,apply}` |
| `createDocEditToolEntry` doc-tools.ts:249 | `doc-edit` | doc | write | 否 | 同上 |
| `createSessionToolEntry` session-tool.ts:162 | `session` | session | state | 否 | `{store,sessionId?,turnsOf?}` |
| `createContextToolEntry` context-tool.ts:129 | `context` | session | state | 否 | `{store,summarizer?,audit?}` |
| `createWebSearchToolEntry` web-search.ts:96 | `web-search` | net | external | **条件开**（web-search.ts:103） | `env.search` |
| `createSearchContentToolEntry` search-tools.ts:232 | `search-content` | search | read | 否 | `SearchToolDeps{provider?}` |
| `createListResourcesToolEntry` search-tools.ts:254 | `list-resources` | search | read | 否 | 同上 |
| `createDomToolEntry` dom-tools.ts:735 | `dom` | ui | ui | 否 | `env.dom`（PlatformDomOps） |
| `createTodoToolEntry` todo.ts:200 | `todo` | task | state | 否 | `{store,sessionId?}` |
| `createGoalToolEntry` goal.ts:220 | `goal` | task | state | 否 | `{store}` |
| `createJobsToolEntry` jobs.ts:301 | `jobs` | task | state | 否 | `{store,runner?,onDone?}` |
| `createEvalJsToolEntry` eval-tools.ts:215 | `eval-js` | exec | write | 否（旧助手禁用 session.ts:305） | `PlatformWorkerFactory` |
| `createEvalWasmToolEntry` eval-tools.ts:297 | `eval-wasm` | exec | write | 否 | `PlatformWorkerFactory` |
| `createSubagentToolEntry` subagent.ts:123 | `subagent` | task | write | 否（旧助手禁用 session.ts:306） | `{router,chat,system?,maxRounds?}` |
| `createWaitToolEntry` wait-tools.ts:382 | `wait` | ui | read | 否 | `env.dom` |
| `createExtractToolEntry` collect-tools.ts:612 | `extract` | collect | read | 否 | `env` + `CollectBuffer` |
| `createExportToolEntry` collect-tools.ts:632 | `export` | collect | write | 否 | `env` + `CollectBuffer` |
| `createPageEvalToolEntry` page-eval.ts:221 | `page-eval` | exec | **evaluate** | 否（旧助手禁用 session.ts:321） | `env.dom` |
| `createChromeToolEntry` chrome-tools.ts:402 | `chrome` | chrome | ui | 否 | `env.dom`（printPage/historyNav/reloadPage/screenshot）+ `env.filePicker` |
| `createSaveFileToolEntry` save-file.ts:83 | `save` | net | write | 否 | `env.filePicker` |
| `createNotifyToolEntry` notify.ts:80 | `notify` | ui | ui | 否 | `env.notify` |
| `createClipboardToolEntry` clipboard.ts:166 | `clipboard` | ui | ui | 否 | `env.clipboard` / `env.clipboardRich` / `env.events` |
| `createEventsToolEntry` events-tools.ts:440 | `events` | observe | read | 否 | `env.events`（PlatformEventHub）+ `env.fetch` |
| `createCookieToolEntry` cookie-tools.ts:191 | `cookie` | cookie | read | 否（旧助手禁用 session.ts:349） | `env.dom` |
| `createDialogToolEntry` dialog-tools.ts:192 | `dialog` | dialog | read | 否（旧助手禁用 session.ts:350） | `env.events` |
| `createNetToolEntry` net-tools.ts:324 | `net` | net | write | 否（旧助手禁用 session.ts:351） | `env.events` |
| `createStreamToolEntry` stream.ts:135 | `stream` | net | read | 否 | `env.stream`（连接器） |
| `createExecRemoteToolEntry` exec-remote.ts:85 | `exec-remote` | exec | write | 否 | `env.remoteExec` |
| `createWorkerSessionToolEntry` worker-session.ts:132 | `worker-session` | exec | write | 否 | `{factory: PlatformWorkerFactory}` |
| `createP0DomainTools` assembly.ts:78（矩阵 assembly.ts:51-61） | 8 项（storage/storage-quota/settings/doc-read/doc-edit/session/context/web-search） | 见矩阵 | 见矩阵 | 否 | 见各工厂 |
| `connectMcpSource`/`createMcpClient` mcp-client.ts:102/146 | 动态（`namespace:'mcp'` mcp-client.ts:146-154） | mcp | external | 否 | `McpJsonRpc` |
| `installSkill` skill-loader.ts:92 | 动态（`namespace:'skill'`） | skill | — | 否 | `SkillDef.registerTools` |

**`PlatformEnv` 缝全貌**（`platform.ts:692-731`）：`kind`、`fetch`、`storage?`、`kv?`、`permissions?`、
`clipboard?`、`notify?`、`filePicker?`、`workerFactory?`、`dom?`、`askUser?`、`search?`、`stream?`、
`remoteExec?`、`events?`、`clipboardRich?`、`[k:string]:unknown`。

**插件侧 `extension-env.ts` 已提供的缝**（`src/platform/extension-env.ts`）：`createChromeAsyncKv`
(:31)、`createChromeSessionKv` (:48)、`originPermissionPattern`/`requestOriginPermissionDetailed`/
`hasOriginPermission`/`removeOriginPermission` (:69-149)、`assembleExtensionDom(transport?)` (:169-183，
**默认 off、无 transport 即返回不可用 reason**)。**未提供**：完整 `PlatformEnv`、`PlatformDomOps` 真实现、
`PlatformEventHub`、clipboard/notify/filePicker/workerFactory/search/stream/remoteExec 适配器、同步 `kv`、
`storage` 配额缝、`browserEnv()` 替代。base 的 `browserEnv()`（`platform.ts:911`）**依赖 page 全局**
（`window`/`document`/`localStorage`/`navigator.clipboard`/`Notification`），**在 MV3 service worker 中不可直接用**。

### 22.2 插件实际注册面（从 `src/background/host.ts` 代码路径）

- `createCommandRouter({delayMs:0,policy,audit})` (`host.ts:64-75`) — **未传 `builtins`** → base 默认
  `BUILTIN_ORDER`（`router.ts:133`，构造默认全注册 `router.ts:237-246`）= **`web-fetch` / `sleep` / `web-cli-help`**。
- `createAdminToolEntries(...)` (`host.ts:78-85`) → **6 个**（`admin-tools.ts:47/69/91/112/133/149`）：
  `admin_origin-authorize`(write) / `admin_origin-revoke`(write) / `admin_origin-list`(read) /
  `admin_descriptor-show`(read) / `admin_audit-export`(read) / `admin_llm-config`(read)，均 `namespace:''`、`group:'plugin'`。
- `createAskUserToolEntry(...)` (`host.ts:90`) → **`ask-user`**。
- `activateSite` (`host.ts:100-106`) → `toToolEntries` (`declared-tools.ts:332`) 按站点声明注册；
  名 `site_<sanitize(decl.id)>`（`declared-tools.ts:65/274/302`，`group:'site'` `:317`）。LGDL 站点实测声明 2 个：
  `site_lgdl-web-cli` / `site_lgdl-web-op-cli`。
- 工具面经 `s.host.deriveTools()` 下发（`service-worker.ts:298`，工具名清单 `:398`）。

**合计（有绑定站点时）12 个**：`admin_*`×6 + `ask-user` + `site_lgdl-web-cli` + `site_lgdl-web-op-cli` +
`web-fetch` + `sleep` + `web-cli-help`。**`web-cli-help` 因 `listed:false`（`router.ts:281`）不出现在自身一览**
→ `web-cli-help` 的 `listHelp` 输出恰为 **11 个**（`router.ts:484-508`），与用户实测「模型列出 11 个」**逐字吻合**。
`test:binding` 运行时观测亦独立确认发给 LLM 的 12 个 tools（见 §21 门禁）。

### 22.3 漂移对照表（`docs/capability-matrix.md` 第 12-45 行，共 34 项）

图例：✅ 一致 / ⚠️ 漂移（含部分）。

| # | 行 | 文档声称 | 代码实际（file:line） | 判定 |
|---|---|---|---|---|
| 1 | :12 | `web-fetch`「能力内建，**非独立工具**」，替代/否 | base 注册为**独立工具** `web-fetch`（router.ts:251-261；tools.ts:22）；插件默认内建即下发（host.ts:64；binding 观测 12 tools 含 `web-fetch`） | ⚠️ **漂移**：把它说成「非独立工具」与事实相反 |
| 2 | :13 | `sleep`「宿主侧编排（**无独立工具**）」，不适用 | base 注册为**独立工具** `sleep`（router.ts:262-274；tools.ts:74）；插件同样下发 | ⚠️ **漂移** |
| 3 | :14 | `web-cli-help` 对齐/是 | base 内建 `web-cli-help`（router.ts:275-289，`listed:false` :281）随默认内建下发；`admin_*` 亦在注册面 | ✅ 一致 |
| 4 | :15 | `lgdl-web-cli` → `site_lgdl-web-cli` 对齐 | `activateSite`（host.ts:100-106）经声明注册；binding `#6e` 实测 | ✅ 一致 |
| 5 | :16 | `lgdl-web-op-cli` → `site_lgdl-web-op-cli` 对齐 | 同上 | ✅ 一致 |
| 6 | :17 | `storage`「工具面不暴露给 LLM」不适用 | base `createStorageTools`（storage-tools.ts:200）**未注册**；插件确用 chrome.storage 但无工具面 | ✅ 一致（设计取舍；但属实现遗漏面，见 §22.0-2） |
| 7 | :18 | `storage-quota` 同上 | `createStorageQuotaToolEntry`（storage-tools.ts:188）未注册 | ✅ 一致 |
| 8 | :19 | `settings` → options + key-store 替代 | 未注册（settings.ts:220）；options 页承载配置 | ✅ 一致（设计） |
| 9 | :20 | `doc-read` → site 读子命令 对齐 | 未注册（doc-tools.ts:236）；由 `site_lgdl-web-cli` 承载 | ✅ 一致（设计） |
| 10 | :21 | `doc-edit` → bridge `apply` 替代 | 未注册（doc-tools.ts:249） | ✅ 一致（设计） |
| 11 | :22 | `session` → chrome.storage.session + controller 替代 | base session 工具未注册（session-tool.ts:162）；插件 `chat-session.ts` 承载 | ✅ 一致（设计） |
| 12 | :23 | `context` → 上游截断口径 替代 | 未注册（context-tool.ts:129）；插件会话截断 D-013 | ✅ 一致（设计） |
| 13 | :24 | `web-search` 后置/P2+ | base 工厂存在（web-search.ts:96，条件开 :103）但**未注册**；插件无 `env.search` | ✅ 一致（后置） |
| 14 | :25 | `search-content` 不适用 | 未注册（search-tools.ts:232） | ✅ 一致（设计） |
| 15 | :26 | `list-resources` 不适用 | 未注册（search-tools.ts:254） | ✅ 一致（设计） |
| 16 | :27 | `dom` 后置（content/dom-agent 可选） | `assembleExtensionDom` 默认 off（extension-env.ts:169-183），无工具注册 | ✅ 一致（后置/off） |
| 17 | :28 | `ask-user` 对齐（ask-bridge） | 注册（host.ts:90；ask-user.ts:121）+ ask-bridge | ✅ 一致 |
| 18 | :29 | `todo`「宿主 agent 循环内（非独立工具）」不适用 | base `createTodoToolEntry`（todo.ts:200）未注册 | ✅ 一致（对插件而言确非独立工具） |
| 19 | :30 | `goal` 同上 | goal.ts:220 未注册 | ✅ 一致 |
| 20 | :31 | `jobs` 同上 | jobs.ts:301 未注册 | ✅ 一致 |
| 21 | :32 | `eval-js`（禁用）「evaluate 最高档」不适用 | eval-js 在 base 的 risk 是 **`write`**（eval-tools.ts:222），**不是 evaluate**；未注册；旧助手 `enabled:false`（session.ts:305） | ⚠️ **轻度漂移**：结论（不提供）对，理由（evaluate 档）错 |
| 22 | :33 | `subagent`（禁用）不适用 | 未注册；旧助手 `enabled:false`（session.ts:306） | ✅ 一致 |
| 23 | :34 | `wait` 不适用（站点 RPC 超时内建） | 未注册（wait-tools.ts:382，需 `env.dom`） | ✅ 一致（设计） |
| 24 | :35 | `extract` 不适用（不采集） | 未注册（collect-tools.ts:612） | ✅ 一致（设计） |
| 25 | :36 | `export` → site op-cli export-* 替代 | 未注册（collect-tools.ts:632） | ✅ 一致（设计） |
| 26 | :37 | `page-eval`（禁用）evaluate deny 不适用 | 未注册；risk **`evaluate`**（page-eval.ts:226）；旧助手 `enabled:false`（session.ts:321） | ✅ 一致 |
| 27 | :38 | `chrome`「插件为独立扩展宿主，非页内工具」**不适用** | base 工厂存在（chrome-tools.ts:402）但需 `env.dom`(页内 print/history/reload/screenshot) + `env.filePicker`，插件**未提供**且未注册；**但扩展宿主恰好原生拥有** `chrome.tabs`(goBack/goForward/reload) 与 `captureVisibleTab`(截图) —— 是「不同 API 下更适用」，非「不适用」 | ⚠️ **部分漂移/误判**（见 §22.4） |
| 28 | :39 | `save` → site op-cli export-* 替代 | 未注册（save-file.ts:83，需 `env.filePicker`）；扩展可用 `chrome.downloads` | ✅ 一致（替代）+ 可补缺口（§22.5） |
| 29 | :40 | `notify` 后置 P2+ | 未注册（notify.ts:80，需 `env.notify`）；扩展可 `chrome.notifications` | ✅ 一致（后置） |
| 30 | :41 | `clipboard` → site op-cli copy-source 替代 | 未注册（clipboard.ts:166，需 `env.clipboard`/`clipboardRich`/`events`） | ✅ 一致（设计） |
| 31 | :42 | `events`「content 事件桥 → background 事件通道」**对齐**/是 | 传输桥存在（service-worker.ts:497-516、content-script.ts:108-112、page-bridge.ts），但 base `events` 工具（events-tools.ts:440）**未注册**；LLM **无** `events` 工具可用，只有**页面 `env.events` 代理** | ⚠️ **部分漂移/错位**：把「传输层」写成「能力对齐」，未区分「站点可用」与「LLM 工具面」 |
| 32 | :43 | `cookie`（禁用）不适用 | 未注册；旧助手 `enabled:false`（session.ts:349） | ✅ 一致 |
| 33 | :44 | `dialog`（禁用）不适用 | 未注册；旧助手 `enabled:false`（session.ts:350） | ✅ 一致 |
| 34 | :45 | `net`（禁用）不适用 | 未注册；旧助手 `enabled:false`（session.ts:351） | ✅ 一致 |

**漂移小结**：明确漂移 = 第 1、2 行（web-fetch/sleep 被误写为「非独立工具」）；部分漂移/表述不实 = 第 27、31 行
（chrome/events）；轻度理由错误 = 第 21 行（eval-js 的 risk 是 write 非 evaluate）。其余 30 行与代码一致。
**另注**：`capability-matrix.md:4` 声称「与 `session.ts` 注册矩阵逐项核对」——该 `session.ts` 已随 TASK-016 删除，
现仅存 git 历史（`762d3a6^`），表格为存档性质。

### 22.4 未注册 base 工具的「扩展宿主适用性」评估

> 依据：base 工具所需 env 缝 vs 插件 `extension-env.ts` 已有缝（§22.1）；`browserEnv()` 在 SW 不可用。
> 落地代价 = 需新增的缝 + 权限面 + base 零改动约束下的适配量。

| 工具 | 适用性 | 理由 | 落地代价 / 安全面 | 建议 risk |
|---|---|---|---|---|
| `chrome`（print/back/forward/reload/screenshot） | **有条件适用** | 页内实现（`env.dom.ops`）不适用；但扩展宿主可用 `chrome.tabs.goBack/goForward/reload` + `tabs.captureVisibleTab`；**文档「不适用」不准确** | 需新增 tabs/captureVisibleTab 权限（当前 manifest 无 `tabs`，且红线禁扩权限面）+ 新适配器；安全面=导航/截图（用户可见） | ui / write（screenshot） |
| `notify` | **适用** | 扩展天然拥有 `chrome.notifications`（需 `notifications` 权限） | 新增 `notifications` 权限 + `PlatformNotify` 适配器（**不能**用 page `Notification`） | ui |
| `save` | **有条件适用** | `chrome.downloads`/`chrome.downloads.download` 可用 | 新增 `downloads` 权限 + `PlatformFilePicker` 适配器；写文件 | write |
| `clipboard` | **有条件适用** | SW 无 `navigator.clipboard`；需 offscreen document 或经 content script/侧栏手势 | offscreen 文档或 content 桥 + `env.clipboard`/`clipboardRich` 适配器；剪贴板=敏感 | ui（读=敏感） |
| `storage` / `storage-quota` | **有条件适用** | 插件已有 `chrome.storage`（`createChromeAsyncKv`），但需实现 base `StorageBackend` 接口（异步 KV 与 base 同步/字节配额模型不完全一致） | 适配器 + 数据域隔离（LLM 可读写扩展存储 → 与 LLM 配置同域则**安全面扩张**） | write / state |
| `settings` | **需裁决** | 需同步 `PlatformKv`；扩展无 `localStorage`（SW），可用 `chrome.storage` 但为异步 | 同步语义适配代价高；且会与 options 页配置交叉 | state |
| `session` / `context` | **需裁决** | 需 `SessionStore` over `StorageBackend`；插件已有 `chat-session.ts` 相似职责 | 适配 + 两套会话语义并存风险；跨会话持久=状态面 | state |
| `todo` / `goal` | **适用（低风险）** | 纯内存/状态编排，agent 循环常用；`{store}` 依赖 | 需 `SessionStore`/`GoalStore`（可在 SW 内存实现）；无外部副作用 | state |
| `jobs` | **有条件适用** | 后台任务需 `runner`（SW 生命周期短，MV3 会休眠） | runner 注入 + SW 唤醒策略；语义受限 | state |
| `wait` | **有条件适用** | 需 `env.dom` 条件源；通用宿主可退化为纯 sleep/poll | 需 `PlatformDomOps` 或退化为轮询；`wait --until dom…` 不适用 | read |
| `events` | **需裁决** | base 需 `PlatformEventHub`；插件已有自建桥（site-event），可暴露为工具但涉及预算/脱敏 | 适配 hub + 事件预算/脱敏（NFR-007）+ untrusted 门禁 | read |
| `web-search` | **需裁决** | 需 `env.search`（BYOK 端点/key）；外部网络面 | 需 key 管理 + 外部请求；与 LLM key 分离 | external |
| `dom` | **有条件适用** | 插件有 `content/dom-agent` + `assembleExtensionDom`（默认 off），注入 content transport 后可用 | 需 content transport 装配 + risk ui 写面门禁；页内写面=安全扩张 | ui |
| `page-eval` | **建议维持不启用** | 最高档 evaluate，页内任意代码执行 | 越权面；即便装配也应 fail-closed | evaluate |
| `eval-js` / `eval-wasm` | **建议维持不启用** | SW/Worker 内任意代码执行 | 代码执行=越权面 | write（实际） |
| `exec-remote` / `stream` | **不适用** | 需 `env.remoteExec`/`env.stream` 连接器（场景专属） | 无宿主；语义不匹配 | write / read |
| `worker-session` | **有条件适用** | SW 可用 `Worker`（`PlatformWorkerFactory`），但 MV3 生命周期/持久性受限 | Worker 适配 + 会话存活语义受限 | write |
| `search-content` / `list-resources` | **不适用** | 需页内资源提供者；通用插件由站点声明工具承载 | 由 `site_*` 承载即足 | read |
| `doc-read` / `doc-edit` | **不适用** | 需场景文档注册表；LGDL 由 `site_lgdl-web-cli` 承载 | 无通用语义 | read / write |
| `cookie` | **建议维持不启用** | 凭据/同源 cookie 读写；base v4 要求默认关 | 高敏感；需 trusted+ask | read / write |
| `dialog` | **建议维持不启用** | override 页面对话框/自动应答 | 高敏感；需门禁 | read |
| `net` | **建议维持不启用** | 网络拦截写面；base v4 要求整工具默认 deny | 越权面 | write |
| `subagent` | **建议维持不启用** | 递归子代理；P0 单会话定位 | 复制会话/工具面失控风险 | write |
| `extract` / `export` | **不适用** | 需 `CollectBuffer` + 采集定位；插件定位不采集页面数据 | — | read / write |
| `ask-user`（已注册） | 已启用 | `ask-bridge` 接线 | — | read |
| `mcp` / `skill`（动态） | **需裁决** | 动态外部源注册（`namespace:'mcp'`/`'skill'`）；base 有 `connectMcpSource`/`installSkill` | 外部工具注入=最大安全面扩张 | external |

### 22.5 建议分级（供作者决策，**本轮未实施**）

- **推荐启用（低风险、扩展宿主天然拥有、补用户可感知缺口）**：
  `notify`（chrome.notifications）、`save`（chrome.downloads）、`todo`/`goal`（SW 内存状态编排）。
  —— 代价：新增 `notifications`/`downloads` 权限 + 4 个 `PlatformEnv` 适配器；均不触碰站点/凭据面。
- **需裁决（安全面扩张或语义有争议）**：
  `chrome`（tabs/captureVisibleTab 权限）、`clipboard`（offscreen/敏感）、`storage`/`settings`/`session`/`context`
  （与现有配置/会话语义交叉）、`events`、`web-search`、`dom`、`worker-session`、`jobs`、`mcp`/`skill`。
- **建议维持不启用（base 禁用档 / 越权面）**：
  `page-eval`、`eval-js`、`eval-wasm`、`cookie`、`dialog`、`net`、`subagent`。
- **建议明确标注不适用（由站点声明工具承载）**：
  `doc-read`/`doc-edit`、`search-content`/`list-resources`、`extract`/`export`、`exec-remote`、`stream`、`wait`（dom 条件面）。

### 22.6 未改动声明（红线）

- 本章**未修改任何工具注册/行为**：`host.ts` 零 diff、`extension-env.ts` 零 diff、`manifest.json` 零权限变更。
- **未修改 `docs/capability-matrix.md`**（漂移仅报告，等作者裁决）。
- `packages/web-cli-base/**` 零改动（`git diff` 空）；全仓 `build`/`test` 0 fail（base 483 零回归）。

## 23. v0.9 增补：自动探测 + 多会话（作者 2026-09-12 两项架构级决策；TASK-024/025）

> 作者拍板：①**自动探测**采用方案 A —— 站点**首次授权一次**，之后注入/握手/绑定**全自动**（不引入全站静态注入/`<all_urls>`）；②**多会话**默认**按域名（origin）自动共享**（同域名所有标签页共用一会话，不同域名各自独立）+ 支持**手动并入同一会话组**；③`tabs` 权限本轮**不做**。本节为 build 产物与验收证据；实现文件：`src/background/session-store.ts`（新）、`src/background/content-script-registry.ts`（新）及既有 background/content/UI 的 additive 接线。

### 23.1 自动探测：声明式注入 + 自上报自动握手（FR-047 / ADR-014）

| 环节 | 实现（file:line） |
|------|------------------|
| 声明式注入注册/注销/对账 | `src/background/content-script-registry.ts`：`siteContentScriptId`(:53) / `registerSiteContentScript`(:91) / `unregisterSiteContentScript`(:113) / `reconcileSiteContentScripts`(:135)（`matches:[origin/*]`、`runAt:'document_idle'`、`persistAcrossSessions:true`） |
| 授权即注册 | `src/background/service-worker.ts:634` case `authorize` → `registerSiteContentScript(s.contentScripts, origin)`(:655)；回执含 `contentScript{ok,id,pattern}` |
| 撤销即注销 | `service-worker.ts:674` case `revoke` → `unregisterSiteContentScript(...)`(:683) |
| 启动对账 | `service-worker.ts:562` `reconcileContentScripts()`；触发点 = SW 启动（文件末尾 IIFE）、`permissions.onAdded`(:1058)、`permissions.onRemoved`、`onInstalled`(:1069)；补齐缺失/清理已撤销，失败**审计+日志可读** |
| 自上报握手 | content script 加载后发 `hello{origin}`（`src/content/content-script.ts:144-146`）；并响应 `whoami`（:128）回 `location.origin` |
| 免手势自动绑定 | `service-worker.ts:515` `autoBindFromTab()`（`tabs.sendMessage(whoami)` → origin → `bindOrigin`）；`:751` case `hello` 绑定 sender tab；`tabs.onActivated` 先 `autoBindFromTab`(:1112) |
| 未授权静默降级 | `tabs.onActivated` 握手失败 → 不 log error、返回 false → 回退既有 `markStale` + 可读提示；`action.onClicked` 路径**不变**（保留回退） |

**真实环境免点图标实测证据（`npm run test:binding` 阶段 2，#A0~#A7）**：
1. `#A1` 授权前 `chrome.scripting.getRegisteredContentScripts()` 中 `wcliSite_*` 计数 = **0**（基线）。
2. `#A2/#A2b/#A2c` 从侧栏发 `authorize`（`hostPermissionGranted:true`）→ 回执 `contentScript.ok=true`、`pattern=http://localhost:5173/*`。
3. `#A3/#A3b` SW 内真实 `chrome.scripting` 读取：注册表含 1 条 `wcliSite_*`，`matches=['http://localhost:5173/*']`、`persistAcrossSessions=true`、`runAt='document_idle'`。
4. `#A4/#A4b` **reload 站点标签页**（本阶段**从未调用 `rebind`、从未点图标**）→ content script 声明式注入 → 自上报 `hello` → `state.active.origin==='http://localhost:5173'` 且 `invalidated=false`。
5. `#A4c/#A4d` discovery 异步达到 `supported`，工具面装配 `site_lgdl-web-cli`。
6. `#A5` 切走到扩展页再切回站点标签页 → `whoami` 握手自动重绑（`active.origin` 正确、`invalidated=false`）。
7. `#A6` 未授权标签页（未在注册表 → 不注入 → `autoBindFromTab` 静默返回 false）→ `markStale`，`notice="…当前标签页尚未授权/未注入…"`，**无异常**（观测如实记录）。
8. `#A7` 阶段 2 侧栏 0 未捕获异常。

**权限纪律实测**：`manifest.json` `permissions=[activeTab,scripting,storage,sidePanel]`；`tabs∈permissions === false`；`host_permissions+optional_host_permissions` 无 `<all_urls>`/`*://*/*`；`content_scripts` 字段不存在（静态注入为零）。`src/**` 内 `<all_urls>` 字面 0 命中（注释亦已改为中文描述）。

### 23.2 多会话：按 origin 自动共享 + 可选会话组（FR-048 / ADR-013）

- **会话键派生**：`src/background/session-store.ts:63` `sessionIdForOrigin(origin, groups)` → 默认 `origin`，命中分组则 `group:<groupId>`；`:28` `MAX_SESSIONS=20`。
- **每会话独立历史**：`createSessionStore`(:120) 持久化 `chrome.storage.local['web-cli:session-store']`；`setHistory/historyOf/clearHistory`；历史用 `chat-session.ts:58` `boundHistory`（40 turn、首条 user）——**复用既有截断语义，不新造**。
- **分组**：`addOriginToGroup`(:235)/`removeOrigin`(:250)/`deleteGroup`(:265)——移出后 origin 回到自己的独立会话（原历史保留，可逆）；删除分组释放分组会话。
- **上限 LRU**：`enforceCap` 淘汰最不活跃会话并返回 `evicted[]`；SW `bindOrigin`(:128) 将淘汰写入可读 `panelNotice`（不静默丢数据）。
- **切换会话**：SW `switchSession`(:144) = 取消待决交互（见 23.3）→ `controller.setSessionId` → `chatSession.restore(historyOf(sessionId))` → 按 origin 从描述符缓存 `activateSite` → 广播 `session-changed`。消息面：`sessions`(:765)/`session-switch`(:784)/`session-group`(:810)。
- **切换标签页自动 adopt 会话**：`bindOrigin` 解析 origin 会话→ `switchSession`；`state` 消息增 `session` 投影（`state-message.ts:113/131`，只回 sessionId/label/origins/authorized，无 URL/title）。
- **不串台**：`session-store.test.ts`「each origin gets its own session with an isolated history」+「same origin re-activates the same session」；`test:ui` #16d/#16e/#16g 真实点击切换后 `#log` 仅含目标会话历史（alpha/beta 双向）。

**会话隔离/上限/待决处理证据**：
- **隔离**：`test/session-store.test.ts` 断言 A/B 两 origin 历史互不影响、清理 A 不动 B；`test:ui` 通过真实 `chrome.storage.local` 播种两会话 → 点击切换 → `#log` 只回显目标历史（`#16d` beta 有、alpha 无；`#16g` 反向）。
- **上限 LRU**：`test/session-store.test.ts` 以 `maxSessions:3` 激活 4 origin → `evicted===['https://b.test']`（最冷）、当前会话受保护、最新会话保留。
- **待决处理**：`test/session-actions.test.ts` `ask-bridge cancelAll` 断言两个待决提问 → 取消计数 2、均 resolve `{ok:false,canceled:true}`、再次取消为 0；`test/auto-session-wiring.test.ts` 静态钉住 `switchSession` 调 `askBridge.cancelAll()` + `cancelPendingConfirm()`。

### 23.3 与既有机制的交互（明确且不静默）

- **切换会话取消待决交互（EC-019）**：`service-worker.ts:144` `switchSession` 内 `askBridge.cancelAll()` + `cancelPendingConfirm()`(:173)；`confirmResponder` 现配 `pendingConfirmId` 追踪，取消即按 deny；可读 `panelNotice`。
- **工具面随会话一致**：`switchSession` 从 `descriptors: Map<origin, WebCliDescriptor>` 重新 `activateSite`（无缓存则 `deactivateSite`，由 content script 自动上报重新发现）。导航时 `descriptors.delete(origin)`。
- **授权仍 per-origin**：`OriginStore` 与风控 `riskGuard` 零改动；会话组不互相授权（UI 文案 + `test:ui` #16i 断言）。
- **行为变更（如实）**：`tabs.onRemoved` 不再清空对话历史（会话改为域名域、跨标签页保留）；导航 `tabs.onUpdated(loading)` 仍按 EC-011 清空**当前会话**历史。此变更与「多会话/历史保留」目标一致，已在 §23.6 诚实标注。

### 23.4 门禁结果（本轮复跑，原文摘录）

- 插件 `npm test`：**262 pass / 0 fail**（229→262，+33：session-store 11 / content-script-registry 7 / session-actions 6 / session-view 5 / auto-session-wiring 6〔其中 2 合并计〕）。
- 插件 `npx tsc --noEmit`：**0 error**。
- `npm run test:ui`：**79 断言 PASS**（70→79；新增 `#16a~#16i`：会话标记/切换器/历史隔离双向/分组控件/「分组≠授权」文案）。
- `npm run test:binding`：**58 断言 PASS**（44→58；新增阶段 2 `#A0~#A7`，14 断言：声明式注入注册 + 免点图标自动绑定 + discovery supported + 工具面 + whoami 切页重绑 + 未授权静默降级 + 0 异常）。
- `npm run test:hardening`：**22 断言 PASS**。
- `npm run test:e2e`：**PASS**（场景 A fixture AC-010 + 场景 B LGDL Workbench AC-009；唯一偏差仍为本地 host_permissions 预授权）。
- 全仓 `npm run build`：**退出码 0**；全仓 `npm test`：**0 fail**（plugin 262 / base **483 零回归** / lgdl-core 267 / lgdl-render 94+1skip / lgdl-router 8 / lgdl-web 31 / lgdl-web-cli 84 / lgdl-web-op-cli 15 / lgdl-cli 0 / lgdl-layout 0）。
- 红线：**base 零改动**（`git status packages/web-cli-base` 空）；**无新依赖**（`package.json` 零 diff）；**无 `tabs` 权限**、**无 `<all_urls>`**、**无静态 `content_scripts`**；`src/**` 无 `innerHTML`、无空 catch、无明文 key、无 `@lgdl/lgdl-web` 私有依赖；NFR-007 `content.js` 35,615 B ≤ 64 KB。
- 构建戳：`2026-09-12T09:45:16.759Z`。

### 23.5 新增决策（D-091~D-100）

- **D-091（自动探测选型 = 声明式注入 + 自上报，不扩权限）**：以 `chrome.scripting.registerContentScripts`（`persistAcrossSessions:true`）在**授权后**逐 origin 注册；由 content script 主动 `hello`/应答 `whoami` 完成绑定。**否决**：全站静态注入/`<all_urls>`（权限扩张）、申请 `tabs`（宽泛权限）、仅靠 `onUpdated`+URL（同样需权限且 SPA 边界复杂）。零新增权限达成「授权一次、之后全自动」。
- **D-092（启动对账对「已授权+已获权限」集合，而非 `permissions.getAll()` 全集）**：避免把 6 个 LLM `host_permissions` 误注册成站点注入；`desired = origins.list().filter(authorized) ∩ hasOriginPermission`，`managed` 仅取 `wcliSite_` 前缀（不动第三方脚本）。
- **D-093（确定性脚本 id + 从中注回 origin）**：id = `wcliSite_<FNV-1a(origin)>`（稳定、合法 `[A-Za-z0-9_]`）；对账时用注册项的 `matches` 反解 origin，无需额外持久映射。
- **D-094（未授权 tab 握手失败静默降级，不刷错误日志）**：`autoBindFromTab` catch 仅返回 false；`tabs.onActivated` 回退既有 `markStale` + 可读提示。**否决**：`console.warn` 每次切页（会刷屏，用户已明确要求不得）。
- **D-095（会话键派生为纯函数，默认 origin/分组 group:<id>）**：`sessionIdForOrigin` 单点定义「同域名共享 / 不同域名独立」；分组只改映射、不改授权。
- **D-096（分组不迁移/不删除成员历史——可逆）**：加入分组只改映射，成员原独立会话保留；移出即映回原会话（历史不丢）。**否决**：合并时把历史搬迁/删除（复杂且可能静默丢数据）。
- **D-097（切换会话取消待决 confirm/ask 为 fail-closed）**：`cancelPendingConfirm`（deny）+ `askBridge.cancelAll`（canceled）+ 可读提示（EC-019）；`chat-runner` 运行时按 `sessionIdAtStart` 落库，防止切换中串会话。
- **D-098（`tabs.onRemoved` 不再清空会话历史）**：会话改为**域名域**后，关闭某标签页不应销毁该域名会话（跨标签页保留）。导航 `onUpdated(loading)` 仍按 EC-011 清空当前会话。属**行为变更**，如实记录。此为本轮对 EC-011「关闭标签页清会话」旧语义的**有意调整**，与多会话目标一致。
- **D-099（首用引导/文档口径更新）**：`docs/dev.md` §3/§3.1/§10.6 + §12 明确「每个站点首次需授权一次（浏览器弹权限框），之后全自动；未授权站点仍需点图标」；options 页补充会话分组说明与「分组≠授权」。
- **D-100（能力矩阵漂移修正闭环）**：修正 `docs/capability-matrix.md` 第 1/2 行（web-fetch/sleep 实为 base 独立内建工具）、第 21 行（eval-js risk 实为 `write`）、第 27 行（chrome 扩展宿主原生更适用）、第 31 行（events 区分传输层与工具面）；新增 §3.1 说明 v0.9 增补**不新增任何 LLM 工具**。

### 23.6 未完成 / 未复现 / 降级（如实，不粉饰）

- **`tabs` 权限本轮不做**（作者决策③）：`close` 等标签页操作**未实现**；本轮只 list/switch/open（switch 经 `whoami` 扫描 + `tabs.update({active:true})`，其本身不需 `tabs` 权限）。
- **真实 Chrome 行为边界（headless 不可覆盖）**：本机门禁均在 `.pw-browsers` Chromium `--headless=new` 下；`chrome.action.onClicked` 无法脚本触发（沿用既有披露，用同一 `bindTab`/`rebind` 等价路径 + `binding-wiring` 静态钉住）；headless 无原生权限弹窗（阶段 2 用临时 dist **预授权** `host_permissions`，dist JS 字节未改，仅 manifest 副本偏差）。**声明式注入在真实 Chrome（非 headless）下的行为**由同一 `chrome.scripting` 真实 API 断言覆盖（#A3），但**系统 Chrome/Edge 未单独重测**。
- **未授权站点自动探测的「多标签全局扫描」成本**：`findTabForOrigin` 在 `session-switch` 时对所有标签页发 `whoami`（逐 tab catch 静默）；标签页极多时有一定消息开销，未做上限/缓存优化（当前可接受）。
- **待决交互取消的时序**：若 `confirm`/`ask` 恰在切换瞬间完成，取消为 best-effort（不应答即 deny；已应答则不重复）。已由 fail-closed 语义兜底，未做更强的一致性事务。
- **会话分组的 UI 自动化覆盖有限**：`test:ui` 断言分组**控件与文案**存在，未在 headless 下真实新建分组并验证跨 origin 共享（需多站点；已在 node 面用 `session-store.test.ts` 完整覆盖分组/隔离/LRU）。options 页分组管理同样以 node 面为主、UI 面为静态控件断言。
- **`session-store.load()` 每次 `sessions` 请求重读存储**：为让 options/侧栏跨上下文变更即时可见；频率受限于用户交互，未做去抖/缓存。
- **`capability-matrix.md` 其余 30 行未逐行重核**：本轮仅修正审计已确认的漂移（第 1/2/21/27/31 行）+ 补 §3.1；其余行沿用 TASK-016 存档口径。

## 24. v0.9 增补：标签页管理工具 + `tabs` 权限扩张（作者 2026-09-12 决策③；TASK-026）

> 作者**已拍板**：同意新增 `tabs` 权限（接受安装时「读取您的浏览记录」提示）；工具能力**仅 list / switch / open，明确不做 close**。本节为 build 产物与验收证据；实现文件：`src/tools/tabs-tools.ts`（新）、`src/background/tabs-setting.ts`（新）及既有 background/UI/manifest 的 additive 接线。**base 零改动、无新增依赖、无 `<all_urls>`/静态注入。**

### 24.1 实现（file:line 对照）

| 环节 | 实现（file:line） |
|------|------------------|
| 工具定义（扁平名 `tabs`，无点） | `src/tools/tabs-tools.ts:33` `TABS_TOOL_NAME='tabs'`；`:211` `createTabsToolEntry`（`namespace:''`、`group:'plugin'`） |
| risk 档（不放宽） | `tabs-tools.ts:42` `TABS_SUBCOMMAND_RISKS = { list:'read', switch:'ui', open:'write' }`；entry `subcommandRisks` 同源；兜底 `risk:'write'`（空/未知子命令绝不低于确认） |
| `list` 隐私默认 | `tabs-tools.ts:112` `redactTabUrl(raw, full)` → 默认 `origin+path`（去 query/fragment），`--full` 显式；`:158` `formatTabList` 输出显式标注隐私模式；`:254` case `list` |
| `switch` | `tabs-tools.ts:134` `parseTabRef`（`--id`/`--match` 二选一、数字校验）；`:297` case `switch`（受限页 `isAllowedTabUrl` 可读拒绝、歧义可读列出候选） |
| `open` scheme 拒绝 | `tabs-tools.ts:366` case `open`（仅 `http:`/`https:`，其余 scheme 可读拒绝）；`:399` 未知子命令可读列出支持集（含「不支持 close」） |
| 审计（每子命令） | `tabs-tools.ts` `auditSubcommand`（`type:'tabs'`，零明文、URL 去 query）；`src/security/audit-sink.ts:29` 事件类型并集增 `'tabs'` |
| 真实 `chrome.tabs` + 绑定链复用 | `src/background/service-worker.ts:587` `createTabsDeps`（`chrome.tabs.query/update/create`；`switch` 调 `bindTab` = origin→`ensureContentScript`→`bindOrigin`→`switchSession`；`open` 尽力 `bindOrigin`+注入） |
| 隐私开关存储 | `src/background/tabs-setting.ts:18` `TABS_SETTING_KEY`；`:34` `createTabsSettingStore`（默认开） |
| 工具随开关注册/移除 | `src/background/host.ts:49` `tabs?` deps；`:116` `registerTabs` / `:121` `unregisterTabs` / `:126` 初始注册；`:197` `setTabsEnabled`（关闭→`router.unregister('tabs')`，`enabled` 语义） |
| SW 接线 | `service-worker.ts:269` `tabsSetting.load()`；`:324` `tabs: createTabsDeps(...)`；`:333` `tabsEnabled: tabsSetting.get()`；`:1018` case `tabs-setting`（get/set + 审计 + 回执工具面） |
| 消息面 | `src/background/messaging.ts:42` 增 `'tabs-setting'` kind（`:88` KIND_SET） |
| options 开关 | `src/ui/options/index.html` `#tabs-enabled` + 隐私说明；`src/ui/options/options.ts:511` `renderTabsSetting` / `:532` `refreshTabsSetting` / `:548` `setTabsSetting` / `:566` change 监听 |
| manifest | `manifest.json:16` `permissions` 增 `"tabs"`（唯一新增） |

**门禁测试**：`test/tabs-tools.test.ts`（25 用例：子命令/risk/scheme/去 query/`--full`/开关/审计/无 close/host 门禁）、`test/tabs-wiring.test.ts`（5 用例：静态接线/权限面/无 close/未启用禁用档工具）。

### 24.2 `manifest.json` permissions 前后逐项对照

| # | 前 | 后 | 说明 |
|---|----|----|------|
| 1 | `activeTab` | `activeTab` | 不变 |
| 2 | `scripting` | `scripting` | 不变（声明式注入复用） |
| 3 | `storage` | `storage` | 不变 |
| 4 | `sidePanel` | `sidePanel` | 不变 |
| 5 | — | **`tabs`** | **唯一新增**（作者决策③；标签页工具；接受安装警告「读取您的浏览记录」） |
| — | 无 `content_scripts` | 无 `content_scripts` | 不变（零静态全站注入） |
| — | host/optional host 无 `<all_urls>` | 同左 | 不变 |

`test:binding` 阶段 0 实测（`chrome.runtime.getManifest()`）：`permissions` 逐项 = `['activeTab','scripting','sidePanel','storage','tabs']`（断言 `#0e`/`#0e2`）。

### 24.3 隐私默认与开关（实现 + 证据）

| 要求 | 实现 | 证据 |
|------|------|------|
| `list` 默认只返回 `origin+path`（去 query/fragment） | `redactTabUrl`（`tabs-tools.ts:112`）+ case list | 单测「default strips query + fragment」；`test:binding` `#7c` 断言真实工具结果不含 `TOPSECRET`（真实 secret query 标签页） |
| `--full` 显式返回完整 URL 并说明影响 | case list `full` 解析 + `formatTabList` 标注 | 单测「--full: explicit opt-in…」；`test:binding` `#7d/#7e` 断言完整 URL 可见 |
| 审计零明文 | `tabs-tools.ts` `auditSubcommand` 用 `redactTabUrl(url,false)` | 单测断言 audit JSON 不含 `SECRET`/`TOPSECRET` |
| options 开关（默认开） | `#tabs-enabled`（默认 `checked`；`tabs-setting` get/set） | `test:ui` `#17a` 默认开启；`#17b/#17d` 关/开回执；`#17c/#17e` `deriveTools` 随之不含/含 `tabs` |
| 关闭后从 LLM 工具面移除（`enabled` 语义） | `host.setTabsEnabled(false)` → `router.unregister('tabs')`；派发返回「未注册/已禁用」 | 单测「disabling the privacy switch…」；`test:ui` `#17c` |
| 工具无站点绑定亦可用 | `group:'plugin'`（不属 `group:'site'` → 不受 S1/S2/S3 origin 门禁） | 单测「no site bound / no origin authorized is still usable」+ host 无 site 注入仍 `list` 放行 |

### 24.4 门禁结果（本轮复跑，原文摘录）

- 插件 `npm test`：**292 pass / 0 fail**（262→292，+30：`tabs-tools.test.ts` 25 + `tabs-wiring.test.ts` 5）。
- 插件 `npx tsc --noEmit`：**0 error**。
- `npm run test:ui`：**85 断言 PASS**（79→85，+6：`#17a~#17e` 隐私开关 + `#15u` tabs 工具卡片）。
- `npm run test:binding`：**73 断言 PASS**（58→73，+15：`#0e2` 权限集合、`#7a/#7/#7b/#7c/#7d/#7e` 真实 `tabs list`/`--full`、`#8/#8b/#8d/#8e/#8f/#8g/#8h/#8i` 真实 `tabs switch` → 会话随之切换）。**真实证据**：`#8h` 断言 `state.session.sessionId === 'http://localhost:5173'`（切换前已绑定 `http://127.0.0.1:1`），`#8i` `active.origin` 为站点；`#7` 工具结果真实来自 `chrome.tabs.query`。
- `npm run test:hardening`：**22 断言 PASS**。
- `npm run test:e2e`：**PASS**（场景 A fixture AC-010 + 场景 B LGDL Workbench AC-009；唯一偏差仍为本地 host_permissions 预授权）。
- 全仓 `npm run build`：**退出码 0**；全仓 `npm test`：**0 fail**（plugin 292 / base **483 零回归** / lgdl-core 267 / lgdl-render 94+1skip / lgdl-router 8 / lgdl-web 31 / lgdl-web-cli 84 / lgdl-web-op-cli 15 / lgdl-cli 0 / lgdl-layout 0）。
- 红线：**base 零改动**（`git status packages/web-cli-base` 空）；**无新依赖**（`package.json` 零 diff）；`permissions` 仅多 `tabs`（逐项见 §24.2）；**无 `<all_urls>`/`*://*/*`**；**无静态 `content_scripts`**；无明文 key；禁用档工具（`page-eval`/`eval-js`/`eval-wasm`/`cookie`/`dialog`/`net`/`subagent`）零注册；`src/**` 无 `innerHTML`。
- 构建戳：`2026-09-12T10:26:50.415Z`。

### 24.5 新增决策（D-102~D-106）

- **D-102（标签页管理选型 = 新增 `tabs` 权限 + 插件级单工具）**：作者批准唯一一次权限扩张，工具为扁平名 `tabs`（`namespace:''`），子命令 `list/switch/open`，**明确不做 close**。**被否决**：不加权限仅限已授权站点（无法列出/切换未绑定但已打开站点）、拆成多个独立工具（工具面碎片化）、提供 close（不可逆且超范围）。对应 plan ADR-015 / spec FR-049。
- **D-103（risk 档按子命令、复用既有 policy，不放宽）**：`list=read`（allow）、`switch=ui`（ask）、`open=write`（ask）；`tabs` 用 `group:'plugin'` 而非 `'site'`，从而**不受 origin 授权门禁**（无站点绑定/未授权也可用）但风险档仍经 `PermissionGate` 与确认桥；兜底 `risk:'write'` 防止空子命令降档。
- **D-104（隐私默认去 query/fragment + `--full` 显式）**：`list` 工具结果默认仅 `origin+path`，避免用户查询串进入 LLM 上下文；`--full` 为显式 opt-in 并在输出/文档披露；审计同样只记去 query 的 URL。属**对 LLM 上下文摄入面的主动最小化**。
- **D-105（scheme 白名单可读拒绝）**：`open` 仅接受 `http(s)`；`javascript:`/`data:`/`file:`/`chrome:`/`about:`/`ftp:` 等一律可读拒绝；`switch` 目标为受限页同样可读拒绝；均入审计（EC-021），绝不静默。
- **D-106（隐私开关 = `enabled` 语义，非静默开关）**：options 页「允许助手查看/切换标签页（默认开）」；关闭经 `tabs-setting` 消息落库并调用 `host.setTabsEnabled(false)` → `tabs` **不在** `deriveTools()` 且派发可读拒绝；重开即恢复；开关状态与当前工具面在 options/回执可见（EC-022）。`tabs` 权限本身为 manifest 静态权限，应用内开关只关闭工具面（权限移除需停用/卸载扩展，已披露）。

### 24.6 未完成 / 未复现 / 降级（如实，不粉饰）

- **`tabs` 权限的真实 Chrome 行为**：本机门禁均在 `.pw-browsers` Chromium `--headless=new` 下，`chrome.tabs.query` 返回 URL/title、`switch` 的 `tabs.update` + 绑定链 + 会话切换均已**真实断言**（`#0f`/`#7`/`#8*`）；但**系统 Chrome/Edge 未单独重测**，且 headless 下**真实 `close` 不存在**（本就不实现），`open` 新标签页的「加载完成后再自动发现」时序只在 `#8` 的绑定路径覆盖，未单独对 `open` 的新页做加载后断言（`open` 的自动绑定为 best-effort，回执已注明）。
- **权限不可关闭性**：应用内开关只移除工具面；`tabs` 作为静态权限需停用/卸载扩展才能移除——已写入 `compliance.md` §9.1 与 `release.md` §5.1，**未**提供「卸载权限」按钮（浏览器 API 不允许撤销 manifest 静态权限）。
- **`list` 的 `--full` 会主动把完整 URL（含 query）送入 LLM 上下文**：这是显式选项，已披露，未做二次确认（作者要求的确认面是 `open` 的写入档；`list` 档位为 read）。如需对 `--full` 也加确认，属后续增强，本轮未做。
- **审计与 UI 的 `tabs` 计数**：`test:binding` 观测到工具面由 12 → **13**（新增 `tabs`）；既有测试中三处「无 tabs 权限」红线段言按作者决策③**更新为「已批准权限集合」**（`test/auto-session-wiring.test.ts`、`test/binding-wiring.test.ts`、`test/extension-env.test.ts`），属**决策驱动的断言语义更新**，非删除/降级（断言仍存在且更严：`deepEqual` 精确集合 + 无 `<all_urls>`）。

## 25. v0.9 缺陷修复：`web-fetch` CORS 预校验 + 失败可见（用户实测“插件加载报错”；TASK-027）

### 25.1 现状诊断（用户真机证据 + 代码级根因）

用户 `chrome://extensions` 错误列表原文：

```
Access to fetch at 'https://www.baidu.com/' from origin
'chrome-extension://faacmhkbceminaegdjdbodfgimjjohoh' has been blocked by CORS policy:
No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

同时侧栏助手回复「这里没有任何通知，往前走吧」——工具失败既没成为可见提示，模型也没告知用户。

根因（代码级，已核对）：

- base `packages/web-cli-base/src/web-fetch.ts:138` `const fetcher = opts.fetchImpl ?? globalThis.fetch.bind(globalThis)`；`:143` `fetcher(path, …)`——**在扩展 service worker 里直接 fetch**。
- 扩展页面是独立源（`chrome-extension://<id>`）；`manifest.host_permissions` 只有 6 个 LLM 端点，`https://www.baidu.com/` 不在其中 → 必然 CORS。
- `web-fetch` 因 base `BUILTIN_ORDER` 默认注册（`router.ts:243-246`），插件 `host.ts` 未传 `builtins` → 对 LLM 可见且可调用。
- 该工具**实际只在「已授予 host 权限的 origin」与 6 个 LLM 端点上可用**；对任意站点不可用。
- 失败的 `✖` 文案只进 tool 结果（LLM 上下文），侧栏未把它当错误事件呈现；system prompt 也没要求模型必须报告工具失败。

### 25.2 实现（file:line 对照）

| 项 | 位置 | 说明 |
|----|------|------|
| 受控 seam（URL/权限预校验） | NEW `src/tools/web-fetch-tool.ts:77` `resolveWebFetchTarget`、`:150` `untrustedOriginGuidance`、`:219` `createWebFetchToolEntry`、`:230` `hasHostPermission(target.origin)` | 相对路径→绑定 origin；绝对 http(s)→权限判定；**未覆盖 → 不发请求 + 可读拒绝 + 两条指引**；非 http(s) scheme → 可读拒绝 |
| 替换 base 同名内建 | `src/background/host.ts:98` `builtins: ['sleep','web-cli-help']` + `:146` 注册受控条目 | 排除 base `web-fetch` 内建、注册同名受控 business 条目（无重复注册；`web-cli-help`/`sleep` 不变），所有分发仍走 `router.dispatch`（门禁/审计不旁路） |
| 真实依赖注入 | `src/background/service-worker.ts:343-360` `webFetch` deps（`currentOrigin`/`hasOriginPermission`/`fetchImpl`/`fetchViaPage`） | 未传 seam 的宿主（node 单测）仍回退 base 内建 |
| 同源页面上下文（C） | `src/content/content-script.ts:66` `fetchSameOriginText`、`:165` `fetch-text` 分支；`web-fetch-tool.ts:183` `buildPageFetch` | 同源优先由 content script 用页面自身 origin fetch，结果包成 `Response` 交回 base executor → HTML→MD/护栏/untrusted 标记**零重复** |
| 失败可见（B） | `src/ui/sidepanel/chat-state.ts:120` 失败 tool 条目 `kind:'error'`（`.entry-error` + `.tool-status.fail`「✖ 失败」） | 失败不再只进 LLM 上下文 |
| system prompt | `src/background/service-worker.ts:61-69` | 工具失败必须向用户明确报告；未授权域名给授权指引 |
| 消息协议 | `src/background/messaging.ts` 新增 `fetch-text` kind | 后台↔content 的同源读取消息 |

### 25.3 门禁结果（本轮复跑，原文摘录）

- 插件 `npm test`：**309 pass / 0 fail**（292→309，+17：`test/web-fetch-tool.test.ts` 15 + `test/sidepanel-view.test.ts` +2）。
- 插件 `npx tsc --noEmit`：**0 error**。
- `npm run test:ui`：**87 断言 PASS**（85→87，+2：`#15v` 失败工具「✖ 失败」卡片可见 / `#15w` 失败条目 `.entry-error` 错误色）。
- `npm run test:binding`：**81 断言 PASS**（保留既有 73 + 新增 8：`#0h` 无扩展加载错误 / `#1d` SW ping 往返 / `#7f` 未授权可读拒绝 / `#7g` 拒绝含两条授权指引 / `#7h` **未授权域名零请求（真实本地目标服务器零命中）** / `#7i` 无 CORS 错误条目 / `#7j` 同源相对路径经页面上下文真实读取 / `#7k` 读取内容为站点真实声明）。
- `npm run test:hardening`：**22 断言 PASS**。
- `npm run test:e2e`：**PASS**（场景 A fixture AC-010 + 场景 B LGDL Workbench AC-009）。
- 全仓 `npm run build`：**退出码 0**；全仓 `npm test`：**0 fail**（plugin 309 / base **483 零回归** / lgdl-core 267 / lgdl-render 94+1skip / lgdl-router 8 / lgdl-web 31 / lgdl-web-cli 84 / lgdl-web-op-cli 15 / lgdl-cli 0 / lgdl-layout 0）。
- 红线：**base 零改动**（`git status packages/web-cli-base` 空）；**无新依赖**（`package.json` 零 diff）；**manifest 零 diff**（权限面不变，仍无 `<all_urls>`/`*://*/*`、无静态 `content_scripts`）；**`.opencode/opencode.json` 零改动**；无明文 key；无静默失败。
- 构建戳：`2026-09-12T10:49:41.615Z`（最终全仓 build）。

### 25.4 D 项核实结论：「插件加载报错」是否真有加载错误

- **结论：不存在与 `web-fetch` 相关的真实“加载错误”。** 用户看到的 CORS 是**运行期**网络策略拦截（请求已发出但响应被浏览器拒绝），不是 manifest/SW 注册/语法等**加载期**错误。
- 证据（`test/ui/binding.mjs` 阶段 0，真实 `dist` + fresh profile）：
  - `#0`：service worker 加载且可达（存在 `service_worker` CDP target 且可求值 manifest）。
  - `#0h`：SW 启动期未捕获异常 / `SyntaxError` / `Failed to load` / `Service worker registration` / `Manifest` 错误 = **0**（原文 `#0i SW 启动期 0 错误/异常`）。
  - `#1d`：SW 对真实 `ping` 消息往返返回 `pong`（注册与消息路由均正常）。
- 修复后触发一次未授权域名 `web-fetch`：`#7h` 真实本地目标服务器**零命中**（未发请求）；`#7i` SW 控制台/错误列表**无任何 CORS 条目**（`Access to fetch` / `blocked by CORS` = 0）。
- 如实说明：本机未通过 DOM 直接读取 `chrome://extensions` 内部页错误列表（该页为 shadow DOM 内部实现），以「真实目标服务器零命中 + SW 控制台零 CORS 条目 + 同源读取成功」作为**等价且更强**的取证；未掩盖任何观测到的真实加载错误（本轮观测为 0）。

### 25.5 新增决策（D-107~D-111）

- **D-107（先判定再请求，绝不发注定被 CORS 拦的请求）**：根因是「先 fetch 再被浏览器拦」，而请求一旦发出，浏览器网络栈就会写 `chrome://extensions` CORS 条目（与是否 catch 无关）。修复选择**预校验前置**：未授权域名**零请求**，从源头消除错误列表条目（EC-023）。**被否决**：捕获 CORS 后翻译文案（错误列表条目仍然产生，且仍可能被拦截）。
- **D-108（受控 seam 替换 base 同名内建，而非 host 旁路）**：通过 `createCommandRouter({ builtins:['sleep','web-cli-help'] })` 排除 base `web-fetch` 内建，再以插件 business 条目注册**同名**受控工具；`dispatch/deriveTools/deriveCommand/help` 全部仍走 `router.dispatch`，权限门禁与审计不旁路（对比：在 `host.dispatch` 里拦截会绕过 gate/audit，已否决）。**base 零改动**（红线）。
- **D-109（A 的零请求边界优先于 C 的页面上下文）**：同源读取走页面上下文（C）**仅在目标 origin 已获 host 权限时启用**；相对路径的绑定 origin 无 host 权限时仍严格按 A **不发请求**、可读拒绝。这样「未授权域名零请求」的可验证边界不被 C 破坏；若未来要在 activeTab-only 下读站点自身同源资源，属需另行裁定的增强，本轮不做。
- **D-110（失败可见 = 错误条目 + system prompt 强制报告）**：失败 tool 结果在侧栏标记为 `kind:'error'`（复用既有 `.entry-error`/`.tool-status.fail` 错误色），并在 system prompt 明确「工具失败必须向用户报告；未授权域名给授权指引」。LLM 收到的是**可读失败原因**（受控 seam 文案），而非裸 CORS 文本。
- **D-111（“加载错误”与“运行期 CORS”如实分离）**：以阶段 0 的 SW 注册/消息往返/零未捕获异常断言证明无加载错误；并把该结论与运行期 CORS 分开陈述（25.4），不把运行期错误说成加载错误，也不掩盖任何真实加载错误。

### 25.6 未完成 / 未复现 / 降级（如实，不粉饰）

- **真机浏览器范围**：门禁均在 `.pw-browsers` Chromium `--headless=new` 下（fresh profile + 真实 `dist`）；**系统 Chrome/Edge 未单独重测**。`chrome://extensions` 内部页错误列表未用 DOM 直读（见 25.4 等价取证）。
- **`host_permissions` 未变**：仍只有 6 个 LLM 端点（`manifest.json` 零 diff）；因此对任意未授权站点 `web-fetch` 仍**不可用**——这是显式边界（可读拒绝 + 指引），不是故障。
- **C 的适用范围**：同源页面上下文仅在「绑定站点 + 已获 host 权限」时启用；未覆盖 activeTab-only（无 host 权限）时的同源页面读取（D-109，遵循 A 的零请求红线）。
- **base 行为保持**：base `web-fetch` 仍允许 `data:`/相对路径等（`web-fetch.test.ts` 零回归）；非 http(s) 拒绝只发生在**插件受控层**，base 零改动。
- **`test:binding` 的 mock 分支**：通过 user 文本标记（`__WEBFETCH_UNAUTH__` / `__WEBFETCH_SAME__`）驱动真实工具调用，非真实模型决策；工具执行、网络、SW 控制台均为真实。

## 26. 侧栏自动测试当前模型配置（作者要求；TASK-028，Wave 20）

> 作者原话：「测试连接按钮放到：设置里面已经有了就可以了，外面不用单独放置：测试连接按钮，每次加载插件，自动去测试当前选择的模型配置，展示 `✓ DeepSeek 连接正常（模型 deepseek-flash，1181 ms，最小 ping 请求）` 这个状态就可以了」。

### 26.1 改动清单

| # | 文件 | 改动 |
|---|------|------|
| 1 | `src/ui/sidepanel/index.html` | 移除 `#llm-test` 独立按钮（保留 `#llm-test-result` 状态区；options 页 `#test` 不变） |
| 2 | `src/ui/sidepanel/sidepanel.ts` | 删除按钮点击处理；新增 `runPanelTest({auto})` + `autoTestConnectionOnce()`（模块级一次性守卫）；仅引导阶段调用一次；`focus`/`visibilitychange` 只刷新 LLM 摘要、不重测；`applyEnvGuard` 列表去掉 `'llm-test'` |
| 3 | `src/llm/test-cache.ts`（NEW） | `llmConfigFingerprint()`（厂商+模型+Base URL+Key 的不可逆 FNV-1a，trim 归一）+ `createTestConnectionCache(ttl=60s, now)` 内存单槽；命中返回 `{...result, cached:true}`（保留原 message/elapsedMs） |
| 4 | `src/llm/test-connection.ts` | `TestConnectionResult.cached?: boolean`（additive，仅缓存层设置） |
| 5 | `src/background/service-worker.ts` | 单例 `testCache`；`llm-test` 处理：算指纹 → 命中直接返回（不发请求）→ 否则真实 ping 后回填 |

### 26.2 缓存与防抖实测证据（`test:ui`，真实 dist + fresh profile + CDP）

| 断言 | 观测 | 结论 |
|------|------|------|
| `#12` | `document.getElementById('llm-test') === null` | 侧栏无独立按钮 |
| `#12c/#12d/#12e` | `✓ OpenAI GPT 连接正常（模型 journey-mock，**N** ms，最小 ping 请求）` + class 含 `ok` | 加载即自动出现成功态 |
| `#12f` | options 测试已填充缓存 → mock POST 计数 `1 → 1` | **同配置 TTL 内缓存命中，不发真实请求** |
| `#12g` | 探针 `{"sendMessage":1,"spyInstalled":true}` | 自动测试确实发了 1 次 `llm-test`（非空验证） |
| `#12h/#12i` | 追加 2 条消息 + 触发 `focus`/`visibilitychange` 后 `sendMessage` 仍 =1、mock 仍 =1 | **重复 render/消息追加/焦点轮询不重复触发** |
| `#12j/#12k` | 模型改 `journey-mock-2` → 重载 → 回显新模型；mock `1 → 2` | **配置变更 → 指纹失效 → 重测一次** |
| `#12l/#12m` | 清空 LLM 配置 → 回显 `⚠ …API Key`；mock `2 → 2` | **未配置零请求 + 可读提示** |

`test:binding`（真实 `http://localhost:5173` + 真实扩展 + mock LLM）：`#6-1` 侧栏加载即自动测试并显示 `✓ … 连接正常（模型 binding-mock，N ms，最小 ping 请求）`；`#6-2` 侧栏无独立按钮。

`npm test` 新增 `test/test-cache.test.ts`（6 用例）：指纹确定性/随厂商·模型·Base URL·Key 变化/不含 key 明文；命中返回原 message+elapsedMs 且零请求；指纹变化失效重测；TTL 边界（`TTL-1` 命中、`TTL` 过期重测）；未配置 `no-key` 零请求；失败分类（401→invalid-key）透传缓存。

### 26.3 门禁结果

- 插件 `npm test`：**315 pass / 0 fail**（309→315，+6）。
- `tsc --noEmit`：**0 error**。
- `test:ui`：**97 断言 PASS**（87→97；移除旧 #12/#12b/#12c 点击断言，新增 #12~#12m）。
- `test:binding`：**83 断言 PASS**（81→83；#6-1/#6-2）。
- `test:hardening`：**22 断言 PASS**；`test:e2e`：**A/B PASS**。
- 全仓 `npm run build` 退出码 0；`npm test` **0 fail**（plugin 315 / base **483 零回归** / lgdl-core 267 / lgdl-render 94+1skip / lgdl-router 8 / lgdl-web 31 / lgdl-web-cli 84 / lgdl-web-op-cli 15 / lgdl-cli 0 / lgdl-layout 0）。
- 红线：**base 零改动**、**manifest 零 diff**、**package.json 零 diff（无新依赖）**；新增文本无明文 key、无静默失败（失败均回显可读原因）。

### 26.4 新增决策（D-112~D-116）

- **D-112（入口分层：设置只保留 options，侧栏只做自动状态）**：按作者要求移除侧栏独立「测试连接」按钮，options 页 `#test` 原样保留。侧栏改为「加载即自动测 + 只读状态」，不再要求用户点击。
- **D-113（自动测试只在面板加载触发一次）**：`autoTestConnectionOnce()` 由引导阶段唯一调用（模块级 `autoTestStarted` 守卫），`render()` / 消息追加 / 状态轮询 / `focus` / `visibilitychange` **一律不触发**。**被否决**：放在 `render()` 或 `refreshLlmStatus()`（会随每次渲染/轮询刷屏重测，违反「不刷屏式重测」与作者预期）。
- **D-114（缓存放 background 单例，而非侧栏）**：缓存 = SW 内存单槽 + 配置指纹（厂商+模型+Base URL+Key 的不可逆哈希），跨「options 测试 → 侧栏自动测试」共享，且**只存内存**（不落 `chrome.storage` / session / 磁盘，不进日志/审计）。**被否决**：侧栏 `localStorage`/`sessionStorage` 缓存（指纹会落盘、多个面板页不共享、违反 key 派生串不落盘红线）。
- **D-115（命中返回原结果，不伪造新耗时）**：缓存命中直接返回原 `message`（含原 `elapsedMs`）并标记 `cached:true`，不重新计时、不假装成功。TTL = 60s（作者建议值）。
- **D-116（复用既有 `llm-test`，不新增请求路径）**：自动测试仍走既有消息与 `test-connection.ts` 逻辑；未配置在 `testLlmConnection` 内 `no-key` 短路，**零网络请求**。key 只在 background 请求内使用，绝不回显/落日志/审计。

### 26.5 未完成 / 降级（如实）

- **自动测试的触发时机限定为「面板加载」**：面板保持打开期间在 options 改配置并返回时，只刷新 LLM 摘要行，**不会**在面板内重测（D-113）；重新加载面板即按新指纹重测。这是对「不重复触发」要求的直接取舍。
- **`test:ui` 的「不重复触发」探针依赖 `Page.addScriptToEvaluateOnNewDocument` 注入**（包装 `chrome.runtime.sendMessage` 计数，`spyInstalled:true` 已实测）；若未来 Chrome 变更该注入语义，需回退为纯 mock 计数证据。
- 系统 Chrome/Edge 未单独重测（门禁均在 `.pw-browsers` Chromium `--headless=new`）。

## 27. 工具面基线对账门禁 + 浏览器能力补齐（FR-051 / ADR-016；TASK-029，Wave 21）

### 27.1 根因（作者机制问题：「为什么这种问题测试不出来」）

作者实测：`web-cli-help` 只列 10 个工具，原内置助手的 **DOM 操作 / 浏览器截图** 等命令全部丢失。**为什么既有测试抓不到**：

- 既有 `npm test`（315 用例）、`test:ui`、`test:binding`、`test:e2e` 断言的都是**插件自身内部行为**（控制器、门禁、绑定链路、UI 渲染），**没有任何测试把「原内置助手的工具面」当作被测对象**；
- `docs/capability-matrix.md` 是**手写表格**，既不被测试 import，也没有任何脚本校验 → 文档写「后置/不适用」与实际工具面可以无限期不一致，即**静默漂移**；
- 该缺陷**不依赖浏览器渲染**，纯属「夹具缺失 + 无对账断言」，因此任何 UI/E2E 都测不出来。

**本轮机制修复**：把基线工具面变成**机器可读夹具 + 双向对账门禁**，让 `npm test` 直接拦截漂移。

### 27.2 实现（file:line 对照）

| 组成 | 位置 | 说明 |
|------|------|------|
| 基线目录（夹具） | `test/parity/baseline-catalog.json` | 34 工具 / 142 子命令 + provenance（`main@2ddc92299ad10cfe0ea2b65403243a45ce7fb041`、提取脚本、时间） |
| 提取脚本（可重跑） | `test/parity/extract-baseline-catalog.mjs` | 读 main 的 `packages/lgdl-web/src/ai/session.ts` 注册矩阵 + 真实工厂 schema；**未登记工厂即失败**的防漂移守卫；`--baseline <临时克隆>` |
| 豁免登记 | `test/parity/waivers.json` | 逐项状态/理由/依据；`mapped.providedAs`；`pending-permission.permission+pending:true`；`pluginExtras`（插件新增工具） |
| 对账门禁 | `test/parity.test.ts` | 双向 + 子命令级 + `findCoverageGaps()` 可自测；失败列出缺失项与修复路径 |
| 浏览器工具工厂 | `src/tools/browser-tools.ts:60` `createBrowserToolEntries` | 按 `env` seam 注册 base `dom`/`chrome`/`wait`/`extract`/`export`/`save`/`events`/`web-search` |
| 扩展浏览器 env | `src/platform/browser-env.ts:40` `createExtensionBrowserEnv` | `dom.ops` = 远程代理；`filePicker` = 页面上下文下载链；`events` = 远端 hub |
| DOM 远程代理（content） | `src/content/content-script.ts:33` + `:176` `dom-op` | 隔离世界 `createBrowserDomOps()` 真实现；未知操作可读拒绝 |
| 页面下载链 | `src/content/content-script.ts:194` `file-save` | anchor 下载 + 12MB 体积护栏（**无 `downloads` 权限**） |
| 远程事件 hub | `src/tools/remote-events.ts:55` `createRemoteEventHub` | 映射既有 `site-event` 桥（subscribe/pull/unsubscribe/status）；其余可读「暂不支持」 |
| host 接线 | `src/background/host.ts:71` + `:137` | `browserTools` 选项 → 注册 base 条目 |
| SW 接线 | `src/background/service-worker.ts:313` | 真实 deps（dom-op / file-save / site-event 转发） |
| 消息类型 | `src/background/messaging.ts:47` | 新增 `dom-op` / `file-save` |
| 单测 | `test/browser-tools.test.ts`（13） | dispatch/风险档/无确认拒绝/可读失败/无标签页降级 |
| 真机 E2E | `test/e2e/fullchain.mjs` | mock LLM 发 `dom read-state` / `dom click` / `chrome screenshot` tool_call → 真实页面全链 |
| 文档 | `docs/capability-matrix.md`（重写）/ `docs/dev.md` §13 | 基线对账表 + 对账/豁免流程 |

### 27.3 门禁结果（本轮复跑，原文摘录）

- 插件 `npm test`：**336 pass / 0 fail**（315→336，+8 parity +13 browser-tools）。
- `tsc --noEmit`：**0 error**；插件 `build` 退出码 0（content.js 1.0MB / background.js 1.2MB）。
- `test:e2e`：**PASS**（真实 dist + headless Chromium；新增三条真机断言全部通过）：
  - `✔ A/fixture: dom read-state ran on the real page DOM (was missing)`
  - `✔ A/fixture: dom click ran through the confirmation gate`
  - `✔ A/fixture: chrome screenshot persisted via page download chain (was missing)`
- `test:ui`：**97 断言 PASS**；`test:hardening`：**22 断言 PASS**；`test:binding`：**83 断言 PASS**——其真实 LLM tools 清单（21 个）已含 `dom, chrome, wait, extract, export, save, events, web-search`。
- 全仓 `npm run build` 退出码 0；`npm test` **EXIT=0 / 0 fail**（plugin 336 / base **483 零回归** / lgdl-core 267 / lgdl-render 94+1skip / lgdl-router 8 / lgdl-web 31 / lgdl-web-cli 84 / lgdl-web-op-cli 15 / lgdl-cli 0 / lgdl-layout 0）。
- 红线 grep：`git diff packages/web-cli-base` **空**、`git diff packages/web-cli-plugin/manifest.json` **空（无新权限）**、`git diff .opencode/opencode.json` **空**、`git diff '**/package.json' package-lock.json` **空（无新依赖）**、无明文 key。

### 27.4 新增决策（D-117~D-122）

- **D-117（对账门禁机器化，不手工维护清单）**：基线目录必须由脚本从 main 代码提取，禁止手输工具/子命令；提取脚本对 `session.ts` 新工厂做覆盖守卫。**被否决**：继续手写 `capability-matrix.md`（本轮漂移根因）。
- **D-118（门禁双向 + 子命令级 + 可自测）**：既防「基线有、插件无」，也防「插件新增未登记工具」；断言到子命令（`chrome screenshot`、`dom read-state` 等），并提供 `findCoverageGaps()` 自测证明能抓两类漂移。**被否决**：只断言工具名（会漏掉「工具在但子命令缺失」）。
- **D-119（浏览器能力走 content 隔离世界远程代理，而非 background 直做）**：base `PlatformDomOps` 必须在有 DOM 的世界运行；content script 隔离世界复用 base `createBrowserDomOps()`，background 只做 `dom-op` 代理。**被否决**：在 background 用 `chrome.scripting.executeScript` 逐操作实现（重复实现、与 base 契约漂移）。
- **D-120（截图/导出/保存用页面上下文 anchor 下载链，不新增 `downloads`）**：`filePicker.download/save` 经 `file-save` 消息在页面上下文 `a[download]`；12MB 护栏。**被否决**：新增 `downloads` 权限（违反本轮权限纪律，且可无权限实现）。
- **D-121（`events` 复用既有桥，缺的如实说）**：`createRemoteEventHub` 只映射 `subscribe/pull/unsubscribe/status`；`pause/resume/clear/budget/switch/pull-sensitive` 返回可读「暂不支持」，**不假装成功**。**被否决**：为凑 11 子命令造假成功或扩页面协议。
- **D-122（需新权限者只报告不实施）**：`notify`（`notifications`）/`clipboard`（`clipboardRead`/`Write`）列入「待批准权限」表，作者批准前不实现、不申请。**被否决**：顺手把 `notify`/`clipboard` 做了（违反本轮权限纪律）。

### 27.5 未完成 / 未复现 / 降级（如实，不粉饰）

- **`events` 运行时仅 4 个桥操作可用**（subscribe/pull/unsubscribe/status）+ 本地 `list`；其余 6 个子命令返回可读「暂不支持」。工具面（11 子命令）已按基线对齐，但**运行时能力是部分的**——如实披露，不视为完全对齐。
- **`notify` / `clipboard` 未实施**：需新权限（`notifications` / `clipboardRead`·`clipboardWrite`），本轮**只报告不实施**（见上报「待批准权限」）。
- **`web-search` 默认禁用态**：无搜索端点配置入口，工具在工具面可达但执行返回可读「未配置」指引；启用需配置端点 + 该域 host 权限（本轮未做配置 UI）。
- **content bundle 体积增长**（约 1.0MB，内联 base DOM 实现）：未做 tree-shaking/分包优化；可接受但作为后续优化项。
- **`chrome screenshot` 用 base 近似截图**（foreignObject+canvas），非 `captureVisibleTab` 原生视口截图；与基线语义一致（同名同子命令），元素级可用、整页级不支持（归属 CDP）。
- 仅在 `.pw-browsers` Chromium `--headless=new` 实测；系统 Chrome/Edge 未单独复验。

## 28. 按 origin 自动授权（读/写多选；FR-052 / ADR-017；TASK-030，Wave 22）

### 28.1 根因 / 需求
作者要求：「自动授权多选：读操作自动、写操作自动，勾选之后，对应的操作无需用户手动同意授权」。既有门禁下，站点工具在 untrusted 声明时 `write/evaluate/external` 一律 `ask`（`security/policy.ts` S2），每次都要侧栏二次确认。需提供**按站点 origin**的用户显式收敛，且**不得降低 fail-closed 基线**。

### 28.2 生效位置（不修改 `riskDefaults` / 策略链）
- `createWebCliHost`（`background/host.ts`）在 `opts.onAsk` 外再包一层 `autoOnAsk`：策略链先出裁决，**只有最终为 `ask`** 时才进入自动授权前置判定。命中 → 直接 `{action:'allow'}`；`evaluate`/未知 risk → 直接 `{action:'deny'}`（`hardDeny`）；其余 → 落回既有 `createConfirmBridge`（侧栏确认，超时/取消 = deny）。
- 自动授权**不改** `PLUGIN_RISK_DEFAULTS`、不改 S1/S2/S3，也不改 `denyPriority`：S1（未授权）与 S3（未知 risk）在策略链即 `deny`，根本不产生 `ask`，天然不受影响。

### 28.3 设置模型与判定
- 新增 `security/auto-authorize.ts`：`createAutoAuthStore`（`chrome.storage.local` 键 `web-cli:auto-auth`）按 origin 持久化 `{ read: 默认 true, write: 默认 false }`；`isEnabled(origin,tier)` 读内存缓存 → **即时生效**；`set`/`clear` 入审计。`clear` = 一键关闭**读写都关**（否则默认 read=true 会让标记常驻）。
- 新增 `tools/declared-tools.ts` `isDestructiveInvocation(decl, subcommand)`：把工具 id 与**被调用子命令**按 `[._:/-]` 切段后逐段比对 `DESTRUCTIVE_VERBS`（修复既有 `hasDestructiveVerb` 对子命令只做整串精确匹配、漏判 `add-node`/`remove-node` 的问题；`hasDestructiveVerb` 本身**未改**以免影响既有分类）。host 在 `activateSite` 建立「扁平工具名 → 声明」映射；未知工具按破坏性处理。
- `decideAutoAuthorization` 纯函数硬编码硬底线：仅 `group === 'site'` 且 `risk ∈ {read,write}` 且（write 时）非破坏性，且对应 tier 已开启，才 `allow`；`evaluate`/未知 risk `hardDeny`；`ui`/`state`/`external` 不提供开关。

### 28.4 UI
- 侧栏「知情同意与能力边界」区新增 `#auto-read` / `#auto-write` 两个复选框 + `#auto-auth-badge`（开启时常驻，显示 `⚡ 自动授权：读` / `读+写`，点击一键关闭）+ `#auto-auth-note`（常显硬底线文案）；控件作用于当前 origin，无活跃站点时禁用。`state` 载荷新增 `autoAuth`（随刷新同步；关闭即时反映）。
- options 页新增「自动授权（按站点）」区：列出已显式设置的 origin 及读/写状态，可逐项开关或整体关闭；文案常显硬底线。

### 28.5 审计
- `security/audit-sink.ts` 新增独立事件类型 `auto-authorize`（与人工 `confirm` 可辨）：放行 `decision:'allow'` + `reason` 含「自动授权（用户设置）」+ origin/tool/subcommand/risk；硬底线拦截 `decision:'deny'`；设置变更 `enabled`/`disabled`。

### 28.6 新增决策（D-123~D-127）
- **D-123（在 `onAsk` 接缝前置判定，而非改 `riskDefaults`）**：自动授权只把「本会 ask 且非破坏性的 read/write」收敛为 allow；`deny` 从不进入 ask，故 S1/S3 优先级不变。**被否决**：直接把 `PLUGIN_RISK_DEFAULTS.write` 改成 allow（全局一刀切、无法按 origin、破坏性/ evaluate 无法保留、关闭需回滚策略表）。
- **D-124（按 origin，不做全局开关）**：与既有 per-origin 授权模型一致；A 站点开启不影响 B。**被否决**：全局自动授权（选择外溢）。
- **D-125（破坏性用 `isDestructiveInvocation` 分段判定）**：工具 id 与**被调用子命令**都按 `[._:/-]` 切段比对 denylist，抓住 `add-node`/`remove-node`；未知工具 fail-closed 按破坏性。**被否决**：只调 `hasDestructiveVerb`（对子命令整串精确匹配，`remove-node` 漏判）；站点自报 `riskHint`（不可信）。
- **D-126（`evaluate` 永不放行，硬编码 `hardDeny`）**：自动授权前置判定对 `evaluate`/未知 risk 直接返回 deny，不委托确认 UI。**被否决**：提供 evaluate 自动档 / 委托到确认（可能被人工放行）。
- **D-127（独立 `auto-authorize` 审计类型 + 一键关闭读写都关）**：放行记录与人工确认可辨；一键关闭把读写都置 false（而非恢复默认 read=true），否则常驻标记无法关闭。**被否决**：复用 `confirm` 类型（不可辨）/ clear 恢复默认（标记不消失）。

### 28.7 门禁与验证
- 新增 `test/auto-authorize.test.ts`（13 用例）：决策矩阵 + 4 条硬底线 + read 零回归 + 按 origin 隔离/持久化 + 即时关闭 + 审计可辨。
- `test:ui` 97→**113**（#18a~#18p：options 区/空态/列表/持久化/即时关闭；侧栏复选框默认值/常驻标记/刷新持久化/一键关闭/硬底线文案）。
- `test:binding` 83→**96**（#19a~#19l：真实站点默认写关、写关时 `status` 触发确认、开启写自动后 `status` 免确认直接执行、审计含「自动授权（用户设置）」、「`remove-node` 即使开启写自动仍弹确认」、关闭后立即恢复确认）。
- 插件 336→**349**、`tsc` 0 error、`test:hardening` **22**、`test:e2e` **PASS**、全仓 build/test **0 fail**（base **483 零回归**）。
- **base 零改动 / manifest 零 diff（无新权限） / 无新依赖 / 无 `<all_urls>` / 无明文 key / 无静默失败**；未 git 提交。

### 28.8 未完成 / 降级（如实）
- **`ui`/`state`/`external` 档本轮不提供自动开关**（保持 `ask`）——按作者要求与硬底线 #5，非缺陷。
- **读操作自动当前为“行为等价开关”**：既有 `riskDefaults.read → allow` 使只读调用本就不进入 `ask`，故 read 开关在现有策略下不改变行为（默认 true 与现状一致）；它作为「标记/一致性/未来若收紧只读也需确认」的显式声明保留。开关默认 `read:true` 使侧栏常驻标记在绑定站点后即显示「⚡ 自动授权：读」——已如实标注，一键关闭会同时关掉读/写并隐藏标记。
- **一键关闭会同时关闭读自动**：因默认 read=true，若只关写则标记仍常驻、用户无法「关闭标记」，故 `clear` 设为读写都关（读自动关闭在当前策略下仍不改变只读行为，仅为标记语义）。
- **真实站点上的“写操作”以 `lgdl-web-cli status`（write 档、非破坏性子命令）演示**：真实 lgdl-web 声明中 `lgdl-web-cli` 的变更子命令（`add-node`/`remove-node`）均命中破坏性 denylist，故用 write 档非破坏性子命令证明「免确认直接执行」，并用 `remove-node` 证明「破坏性仍确认」；未修改站点声明。
- **`AskQuestion` 破坏性信息来自 host 侧映射而非载荷**：base `AskQuestion` 不携带破坏性标记（base 零改动红线），host 维护 `activateSite` 生命周期内的「工具名 → 声明」映射；映射缺失按破坏性 fail-closed。

## 29. 切 tab 按 `tab.url` 驱动会话跟随（用户实测缺陷修复；TASK-031 / Wave 23）

### 29.1 根因
用户故障原话：「切换到新域名 TAB，不会自动新建会话，旧 TAB 可以切到已有的会话；重新打开插件，才能自动识别到当前域名」。

代码级根因（`src/background/service-worker.ts` 的 `chrome.tabs.onActivated`，修复前 :1398-1413）：
1. `if (!session) return;` —— 还没有当前会话就直接返回（首次切到新域名永远不建会话）；
2. `if (await autoBindFromTab(s, activeInfo.tabId)) return;` —— `autoBindFromTab`（:638-653）**只靠 content script `whoami` 握手**；**新域名未授权 → content script 不注入 → 握手必然失败**；
3. 于是落到 `markStale()` + 提示，**既不新建也不切换会话** → 面板不跟随；
4. 「重开插件才行」是因为面板重新拉 `state` 时走另一条路（`:1069`/`:1075` 用 `chrome.tabs.query` 读 URL → 切会话）；
5. 关键过时假设：该路径注释写「no `tabs` permission / `tab.url`」——但自 FR-049（作者决策③ 2026-09-12）起**已持有 `tabs` 权限**，`chrome.tabs.get(tabId).url` 可直接读。

### 29.2 修复（新增 `src/background/session-follow.ts`，依赖注入、可 node 单测）
`followActiveTab(deps, tabId, reason)` 统一被 `chrome.tabs.onActivated` 与 `chrome.tabs.onUpdated(status==='complete')` 调用：

| 当前标签页 | 行为 |
|------------|------|
| http(s) origin，已授权 | `bindOrigin`（切换/新建该 origin 会话）→ `ensureContentScript` → `kickDiscovery`（`reprobe`）→ 可读提示「已自动识别站点」 |
| http(s) origin，未授权 | `bindOrigin`（**仍然切换/新建会话**）→ 可读提示「尚未授权，可点【授权当前站点】」；**零注入、零发现**（自动切会话 ≠ 自动授权） |
| 同一 origin 的另一 tab | 复用同一会话（`sessionStore.activate` 幂等；不新建；LRU 上限规则不变） |
| 受限页（`chrome://`/`chrome-extension://`/`about:`/空 URL） | 先试 `whoami` 握手回退，仍失败且已有绑定 → `markStale()` + 既有可读提示；**不建会话** |
| 已是当前绑定（同 tab+origin 且 `!invalidated`） | 幂等 no-op（不重复绑定、不刷提示，握手路径与 URL 路径一致） |

- **面板免重开**：会话切换经既有 `switchSession` → `chrome.runtime.sendMessage('session-changed')`；`sidepanel.ts` 监听后 `refreshState()`/`refreshSessions()` 重读渲染。
- **`onUpdated`**：`status==='complete'` 同 URL 路径；`status==='loading'` 的 EC-011 失效语义（`markNavigated()` + 清 descriptor + `resetChatSession` + `persistSession`）**原样保留**。
- **移除的早退/死路**：删除 `if (!session) return;`（无会话首次 activate 也建会话）、删除「可读新域名落 `markStale`」分支；`autoBindFromTab`（whoami）保留，仅 `tab.url` 不可读时作补充/回退。
- **`tabOrigin` 本地副本移除**：改用 `session-follow.ts` 的导出（`bindTab`/`tabs open` 复用）。
- **权限/依赖零变**：`tabs` 权限早已持有（FR-049）；无新权限、无新依赖、`manifest.json` 零改动、base 零改动。

### 29.3 新增决策（D-128~D-131）
- **D-128（按 `tab.url` 驱动，而非仅靠 `whoami` 握手）**：持有 `tabs` 权限后 `tab.url` 是权威来源；新域名未授权时握手必然失败，不能作为主判据。**被否决**：继续依赖握手（新域名死路）/ 等 content script `hello`（新域名不注入，永不到来）。
- **D-129（未授权也切换/新建会话，但零注入）**：`bindOrigin` 只采用/创建会话并推面板；是否注入严格由 `OriginStore.isAuthorized` 决定，故「自动切会话 ≠ 自动授权」，per-origin 授权仍是执行门禁。**被否决**：未授权不切会话（回到用户故障）/ 顺手注入（越权，违反 FR-006/FR-023）。
- **D-130（抽 `session-follow.ts` 依赖注入，`onActivated` 与 `onUpdated(complete)` 复用）**：决策表可被 node mock-chrome 单测覆盖，避免两个 handler 各写一份条件而漂移。**被否决**：在 service-worker handler 内堆条件（不可单测、易回归）。
- **D-131（受限页保留 `markStale`、无会话首次 activate 不早退）**：受限页不建会话、走既有可读降级；可读 http(s) origin 一律 URL 驱动。**被否决**：所有 URL 不可读都建会话（受限页无 origin 可键）/ 保留 `if (!session) return`（首次 activate 不建会话）。

### 29.4 门禁与验证
- 新增 `test/session-follow.test.ts`（10 用例）：未授权新域名建会话+推送+零注入+不报错 / 已授权注入+发现 / 同 origin 复用会话 / 受限页不建会话 / `onUpdated(complete)` 新域名 / 无会话首次 activate（旧早退不回归）/ 幂等 / 握手回退 / 注入失败可读 / `tabOrigin` 白名单。
- `test:ui` 113→**119**（#16j~#16o：真实 dist 创建新域名 tab → 已打开面板自动更新会话、零注入、未重开；置于 #16/#18 后，避免扰动自动授权基线）。
- `test:binding` 96→**104**（阶段 1 #20a~#20f：真实站点面板自动跟随新域名会话 + 零注入 + 未授权；阶段 2 #A6/A6b/A6c 由「未授权 markStale」更新为「未授权新域名自动切/建会话 + 零注入 + 不抛错」；既有断言保留）。
- 插件 349→**360**、`tsc --noEmit` 0 error、`test:hardening` **22**、`test:e2e` **A/B PASS**、全仓 `npm run build` + `npm test` **0 fail**（base **483 零回归**）。
- **base 零改动 / manifest 零 diff（无新权限） / 无新依赖 / 无 `<all_urls>` / 无明文 key / 无静默失败**。

### 29.5 未完成 / 降级（如实）
- **同 origin 另一 tab 复用会话时会重置 `discoveryState` 再发现**：`bindOrigin` 走既有的 `controller.bindTab`（discovery 置 `unknown`）+ `switchSession` 从 descriptor 缓存重激活站点工具，随后 `ensure+reprobe` 刷新；功能正确但有一次冗余探测。既有语义如此，本轮未改 controller 以控制范围。
- **新建标签页的 `loading` 与 `onActivated` 存在事件顺序竞争**：若 `onActivated` 先绑定、随后同 tab 的 `loading` 到达，会短暂 `markNavigated` 失效，`complete` 再按 URL 重新绑定（最终态正确，测试以 `invalidated===false` 收敛等待）。未改 `loading` 语义以免回归 EC-011。
- **面板对 `session-changed` 的监听是 TASK-025 既有能力**：本轮未新增面板监听，仅补齐 URL 驱动路径使该推送在「新域名 tab」场景真正被触发；test:ui #16j 以「未重开面板」实证。

## 30. 探测改为全自动（移除手动「重新探测」；TASK-032 / Wave 24）

> 用户诉求（原话）：「web-cli 探测未完成（未知状态）… 可点「重新探测」重试… 改成自动探测吧，逻辑上不需要用户手动探测；快速改造」。

### 30.1 问题
侧栏在 `unknown` 时显示「未知状态 + 重新探测」手动按钮（`index.html#discovery-retry` + `sidepanel.ts` 的 `makeMessage('reprobe')` 点击处理 + `view-model.discoveryNotice().canRetry/retryLabel`）。用户必须先理解一个内部状态并点击，才会重新探测——与「发现站点应当是自动的」矛盾。

### 30.2 修复
- **新增** `src/discovery/auto-probe.ts`（纯逻辑、依赖注入 `probe` + 定时器，node 可测）：按 origin 去重（`inFlight` 不重复发起）、有界退避 `500ms→1s→2s→4s→8s→15s 封顶`、成功 / origin 变更 / 面板关闭 / 撤销停止重试、暂时性 vs 终态分类。
- **触发点全部接上**：面板打开（`state` → `focusBoundProbe`）/ `tabs.onActivated` / `tabs.onUpdated(complete)`（经 `session-follow` 的 `kickDiscovery`）/ content script `hello` / `authorize` / 失败后内部定时器。
- **面板关注（不常驻轮询）**：侧栏 `chrome.runtime.connect({name:'web-cli-panel'})`；SW `onConnect` 计数，面板全部关闭 → `setFocused(false)` 停重试。
- **状态投影**：`state` 携带 `probe`（`phase/attempts/retries/lastReason/lastClass/lastKind/nextDelayMs`）；`probe-changed` 推送让面板即时刷新。
- **文案**：暂时性 →「正在自动探测…（第 N 次重试）」+ 原因；终态 → 精确指出缺 `/.well-known/web-cli.json` / 声明无效 / 「协议版本不匹配：站点 vX，插件支持 vY」，并说明「站点修复/刷新/切换标签页自动重试 + 每 15 秒低频软重试」，**不再要求用户点重试**。
- **移除**：侧栏 `#discovery-retry` 按钮与 `.dn-retry` 样式、点击处理、`canRetry/retryLabel`、`discoveryReason` 本地变量；`reprobe` 消息保留为**内部通道**（auto-probe / kickDiscovery 使用），侧栏不再发送。
- **不回归**：自动探测 ≠ 自动授权（未授权 → `blocked`，**零注入**）；FR-047/048 免点图标自动发现不变；探测失败不报错刷屏。

### 30.3 新增决策（D-132~D-135）
- **D-132（探测协调器抽成纯模块 `discovery/auto-probe.ts`，mock 定时器单测）**：退避序列 / 去重 / 停止条件 / 分类可被完整钉住，不依赖浏览器与真实时间。**被否决**：把定时器逻辑直接写进 `service-worker.ts`（不可单测、易漂移）。
- **D-133（面板关注用 port 计数，而非后台无条件轮询）**：满足「仅在'有面板关注该 origin'或'该 origin 为当前绑定'时重试」「面板关闭 → 停止重试」。**被否决**：后台无条件定时探测（违反低功耗约束）。
- **D-134（`reprobe` 通道保留为内部通道，仅移除 UI 入口）**：content script 已有处理与自上报；复用避免改动数据面，风险最小。**被否决**：删除 `reprobe`（需重构 content-script 发现入口，范围外）。
- **D-135（暂时性与终态共用同一有界退避，文案区分）**：满足「终态也保留低频 15s 软重试」且序列唯一、易测。**被否决**：终态立即 15s、暂时性另用一套（两套序列，测试面翻倍）。

### 30.4 门禁与验证
- 新增 `test/auto-probe.test.ts`（13 用例）：退避序列 `500/1s/2s/4s/8s→15s` 封顶 / 成功即停 / origin 变更即停并丢弃在途结果 / 并发去重 / 暂时性 vs 终态分类 / 未授权（`blocked`）零重试 / `stop()` 取消定时器 / 面板关闭停止重试 / 出界成功上报即停 / 空目标 no-op。
- `test:ui` 119→**121**（#11b 无手动「重新探测」按钮 / #11c 说明不含手动重试文案）。
- `test:hardening` 22→**24**（B#3e 无手动按钮 / B#3f 自动重试说明 / B#5b 无手动入口 / B#6/B#6b 失败文案含自动重试、全程无手动入口）。
- `test:binding` 104→**114**（阶段 3 `AP#1~AP#8`+`AP#4b`：本地延迟就绪站点前 3 次 503 → 失败自动进入退避（`retries≥1`、`nextDelayMs≥500`）→ 站点就绪后**零点击**自动 `supported` + 工具面装配 + 0 未捕获异常）。
- 插件 360→**373**、`tsc --noEmit` 0 error、`test:e2e` **A/B PASS**、全仓 `npm run build` + `npm test` **0 fail**（base **483 零回归**）。
- **base 零改动 / manifest 零 diff（无新权限） / 无新依赖 / 无 `<all_urls>` / 无明文 key / 无静默失败**。

### 30.5 未完成 / 降级（如实）
- **终态仍未做「降频到 15s 之前不快速重试」的区分**：暂时性与终态共用同一序列（前 5 次 500ms~8s 快速重试），终态在前几秒会有几次无效探测；有界（封顶 15s）且不打扰用户，属设计权衡（D-135）。
- **面板连接为 tab 内打开的 `sidepanel.html` 时同样计数**：`test:ui`/`test:binding` 以扩展页 tab 打开侧栏，port 行为与真实 `chrome.sidePanel` 一致（同名 port），已由阶段 3 实证。
- **`reprobe` 内部通道仍可被扩展内其它上下文触发**：未做权限收紧（扩展内消息面本就受 `isPluginMessage` 白名单约束）。

## 31. 设置面板改为侧栏内视图（TASK-033 / Wave 25）

> 用户诉求（原话）：「改造下设置面板，不建议跳到浏览器的拓展的地址地面去：`chrome-extension://…/options.html`，用户体验很不好，**无法很方便回去**，建议**直接在拓展的当前的页面直接做展示**」。

### 31.1 问题
侧栏顶部「配置模型 / 设置」→ `openOptionsPage()` → **新标签页** `options.html`。用户离开面板后要「回去」得手动切标签页/重开侧栏，体验断裂；设置逻辑在 `options.ts` 与侧栏各自的 DOM 里各写一份，存在漂移风险。

### 31.2 修复
- **面板内设置视图（主路径，零跳转）**：`index.html` 新增 `#settings-view`（同文档），顶部按钮改为 `#open-settings`（「⚙ 设置」）→ 仅切换 `body.settings-open` + `#settings-view.show` 显隐；设置视图内 `#settings-back`（「← 返回对话」）返回。**不再调用 `openOptionsPage()`；不打开新标签页、不导航离开面板**。
- **聊天状态保留**：切换只隐藏 `#panel-top/#panel-main/#panel-bottom`，**不重建 DOM**；`src/ui/settings/view-switch.ts`（纯逻辑、可单测）在进入设置时捕获 `#log.scrollTop` 与 `#input` 草稿，返回时显式恢复。
- **共享模块（消除两套实现）**：新增 `src/ui/settings/`——
  - `view.ts`：纯视图模型（Key 状态/占位符、厂商选项/提示、tabs 状态文案、自动授权列表规范化、会话分组模型、分区清单、设置入口文案）；
  - `ops.ts`：全部设置操作（`llm-test`/`tabs-setting`/`auto-auth`/`sessions`/`session-group`/`diag`/`llm-status` + key-store），依赖注入、可 node 单测；
  - `panel.ts`：面板内设置视图渲染（`settings-*` 前缀 id）；
  - `diagnostics.ts`（由 `ui/options/` 迁入）：自检纯逻辑，两侧共用；
  - `styles.ts`：共享样式（注入一次）。
- **配置覆盖面（等价迁移，窄屏纵向堆叠）**：LLM 配置（厂商/Key 掩码与已存状态/模型/Base URL/maxRounds/保存/测试连接/结果/清除）、自动授权（当前 origin 读/写 + 已有显式设置站点列表可关闭）、标签页管理（隐私开关）、会话分组（列表/新建/并入）、环境自检（运行/结果/复制）、合规与迁移（`<details>` 折叠）。
- **文案同步**：首次引导第 1 步与 LLM 状态按钮改为「⚙ 设置（面板内）」；`view-model.ts` 移除 `openSettingsPage` 接缝。
- **兜底页保留、功能不退化**：`options.html` 仍可由 `chrome://extensions → 扩展程序选项` 打开（宽屏/排障友好）；其 LLM 保存/测试、tabs、自动授权、会话分组、诊断全部改为调用同一 `ops.ts`/`view.ts`，静态 HTML 仅作薄壳渲染。
- **工程顺带修复（TASK-032 遗留的真实缺陷）**：`authorize` 触发的自动探测 `probe-changed` 推送会 `refreshState`，其 `invalidated=true` 把「已授权」回执覆盖为「页面已导航…」——`chat-state.ts` 改为**仅在 `invalidated` 的 false→true 跃迁**写入该通知，重复刷新不再覆盖更新的用户操作回执（真实站点 `test:binding` #4b/#4c 由 FAIL 转 PASS 佐证）。

### 31.3 新增决策（D-136~D-140）
- **D-136（设置逻辑抽 `src/ui/settings/` 共享模块，面板与 options 兜底页共用）**：`view.ts`（纯映射）+ `ops.ts`（消息协议 + key-store，依赖注入）为唯一实现，options.ts 退化为「静态 DOM + 共享逻辑」。**被否决**：把面板设置视图写成第二份独立实现（必然漂移，正是用户担心的「两套」）。
- **D-137（视图切换只切显隐，不重建 DOM；scroll/草稿显式捕获恢复）**：满足「保留已渲染消息、滚动位置、输入草稿」。**被否决**：切换时 `render()` 重建聊天（会丢滚动与草稿，且破坏既有滚动跟随策略）。
- **D-138（options.html 保留为**功能完整**的兜底页，而非纯空壳）**：其静态 DOM 被 `test:ui`/`test:hardening` 大量既有断言锚定；保持静态结构 + 复用共享逻辑，既零回归又真正消除分叉。**取舍如实披露**：这是 B 节允许的「退为 options 薄壳复用同一消息协议与渲染函数」路径；未把它重写成完全由 `panel.ts` 渲染的空壳（成本/风险高、收益低）。
- **D-139（面板设置视图用 `settings-*` 前缀 id）**：与聊天视图既有控件（`#auto-auth`/`#auto-read`/`#group-name` 等）同文档共存，避免 `getElementById` 取到错误的重复 id。
- **D-140（只在失效跃迁时提示，重复刷新不覆盖新通知；binding 新标签页 url 就绪后再 rebind）**：前者修复 TASK-032 探针推送覆盖用户回执的真实缺陷；后者修复 `#8b` 对「新建标签页 `url` 仍在 `loading` 时为空」的竞态（等待地址可读后再绑定，断言不变）。

### 31.4 门禁与验证
- 新增 `test/settings.test.ts`（15 用例）：共享 view 纯函数 / `SETTINGS_SECTIONS` 覆盖 6+1 分区且 panel 渲染对应 id / 设置写入读取走既有通道（`llm-test`/`tabs-setting`/`auto-auth`/`sessions`/`session-group` 种类集合精确断言）/ 越界环境可读失败 / 诊断零明文 / **无 `openOptionsPage` 调用路径** / 协议未新增 `settings` 通道 / `options_page` 保留。
- 新增 `test/sidepanel.test.ts`：失效跃迁通知不被重复刷新覆盖。
- `test:ui` 121→**136**（#33a~#33o：同页渲染设置视图 / URL 仍 `sidepanel.html` / 6+1 分区 / 8 厂商 / 保存+测试连接 / **`openOptionsPage` 计数=0** / **page target 数不变** / 聊天消息+草稿保留 / 返回后文本与滚动位置保留）。既有断言零删除。
- `test:binding` 114→**125**（#33B1~#33B11：真实 dist + 真实扩展内读取已存配置 / 面板内测试连接（mock LLM）/ 面板内自动授权勾选即时持久化并恢复 / 返回聊天 / `openOptionsPage` 计数=0 / 全程零标签页跳转；#4b/#4c 由修复后转 PASS，既有断言保留）。
- `test:hardening` **24 PASS**、`test:e2e` **A/B PASS**、`test/parity.test.ts` 不回归。
- 插件 373→**389**（+16）、`tsc --noEmit` 0 error、全仓 `npm run build` + `npm test` **0 fail**（base **483 零回归**）。
- **base 零改动 / manifest 零 diff（`options_page` 保留；无新权限） / 无新依赖 / 无 `<all_urls>` / 无明文 key / 无静默失败**。

### 31.5 未完成 / 降级（如实）
- **options.html 非「纯空壳」**：保留其静态 HTML（D-138），逻辑已共享；未把整页重写为 `panel.ts` 渲染。功能不退化，且既有 options 断言零删除。
- **面板内设置视图为惰性挂载**：首次点开才构建 DOM（避免面板启动开销）；分区数据在每次打开时刷新。
- **设置视图与聊天视图同时存在于 DOM**（显隐切换），内存占用极小；未做虚拟化（面板本就单页轻量）。
- **`#8b` 竞态属测试脚手架健壮性修复**（等待新建标签页地址可读），非产品行为变更。

## 32. chrome screenshot 走真实像素（`captureVisibleTab`，插件侧提供者）+ 修正 chrome help 过时绝对表述（TASK-034 / Wave 26）

> 用户诉求（原话）：「base 的 `chrome` 工具是页内上下文时代的产物，`screenshot` 走 `env.dom.ops.screenshot` 的 `foreignObject+canvas` **近似**实现（外部图片/CSS 变量/滚动态不保真）。插件现在是**扩展宿主** → `chrome.tabs.captureVisibleTab` 可得**真实像素**。已授权 origin 已持有 host 权限 → **零新权限**。**红线**：`packages/web-cli-base/**` 零改动；真实截图必须在**插件侧**提供，文案修正必须在**插件层包装**。」

### 32.1 问题
- `packages/web-cli-base/src/chrome-tools.ts:394-397` 的 `help` 仍写「书签/标签页·窗口/跨域导航/下载历史 = **不可承载 out（NG-002/NG-003）**」——这是**页内上下文**时代的结论，在插件（扩展宿主）里已过时且误导，导致助手对用户宣称「书签做不到」。
- `screenshot` 走页内 `createBrowserDomOps()` 的 `foreignObject+canvas` 近似路径，不保真；插件已具备扩展宿主能力可得真实像素。

### 32.2 修复（base 零改动 / manifest 零 diff）
- **真实截图提供者（插件侧）**：新增 `src/platform/real-screenshot.ts` `createRealScreenshotOps(base, deps)`——用 `Proxy` **只覆盖 `screenshot`**：`mode=viewport` → `chrome.tabs.captureVisibleTab(windowId, {format:'png'})`；`mode=element` → 先经 `dom-op` 通道（插件侧 `wcliScreenshotRect`，复用 base `readElement` 定位语法）取目标元素 rect，再在 SW 用 `OffscreenCanvas`/`createImageBitmap` 裁剪；`mode=fullpage` **仍交给 base 返回「不支持」**（D2 单独一轮）。
- **装配点**：`src/platform/browser-env.ts` 在 `createExtensionBrowserEnv` 中把 `realScreenshot` deps 注入并提供者包装 `env.dom.ops`（同时把 per-env 路径记录 `meta` 非枚举挂到 `env`）；`src/background/service-worker.ts` 注入 `captureVisibleTab`（promise 形式 + `tab.active` 前置校验）、`hasOriginPermission` 判定与元素 rect 读取。
- **路径判定与**如实标注**（绝不谎称真实）**：已授权 http(s) origin + capture 成功 → 真实路径；未授权 / 受限页（非 http(s)）/ 无绑定标签页 / capture 失败（含速率限制 `MAX_CAPTURE_VISIBLE_TAB_CALLS_PER_SECOND`）/ 元素几何或裁剪失败 → **回退** base 既有近似路径。`src/tools/chrome-host.ts` 在 base 执行器返回后追加 `像素路径：真实像素（captureVisibleTab…）` 或 `像素路径：近似（canvas，原因：<具体原因>）`；真实路径同时改写 base 输出中的「近似」旧措辞。
- **契约不变**：仍返回 `PlatformDomOpResult{ok,output,dataUrl}`；输出摘要 / 自动下载链 / `--include-dataurl` / dataURL 不进上下文（P-03/ADR-003）全部保持（base `deliverScreenshot` 继续生效，插件只提供 `dataUrl`）。
- **透传纪律（关键陷阱）**：`browser-tools.ts` 用 `ops?.waitFor`/`ops?.extractData` 判定 `wait`/`extract`/`export` 注册；包装用 `Proxy` 只覆盖 `screenshot`，其余方法与属性可见性**全透传**（测试断言 `ops.waitFor === base.waitFor` 等），**不静默摘掉**这些工具。
- **文案修正（D4，插件层包装）**：`src/tools/chrome-host.ts` `wrapChromeEntryForHost()` 包装 `chrome` 条目的 `schema.description`/`help`：删除「…= 不可承载 out（NG-002/NG-003）」绝对表述，改写为「本工具只承载宿主页会话内的子集；书签 / 标签页·窗口 / 下载 / 跨域导航不是本工具的职责 —— 标签页见 `tabs` 工具；书签/下载等由插件按 origin 授权后的宿主层能力承载」，并声明 `screenshot` 两条路径；base 原文中仍然正确的部分保留。

### 32.3 新增决策（D-141~D-145）
- **D-141（真实像素提供者在插件侧，`Proxy` 只覆盖 `screenshot`，base 零改动）**：`createRealScreenshotOps()` 包装 `env.dom.ops`，其余方法全透传。**被否决**：改 base `chrome-tools.ts`/`platform-dom.ts`（违反红线）；用对象展开重建 ops（会丢失 `waitFor`/`extractData` 懒代理 → 静默摘掉 `wait`/`extract`/`export`）。
- **D-142（两条路径 + 如实标注，绝不谎称真实）**：真实 `captureVisibleTab` vs 近似 `canvas`；每条路径都在工具输出中显式标注，近似路径附**具体原因**。**被否决**：失败静默回退（用户无法区分数据来源）；直接返回 `ok:false`（丢失近似数据与下载链）。
- **D-143（`captureVisibleTab` 权限与 Promise 实测；零新权限）**：`test:e2e` 实测 —— 该 API 在 MV3 SW 返回 **Promise**；且**需要 `activeTab` 或 `<all_urls>`，仅站点 host 权限不足**。插件已声明 `activeTab`（真实使用中由点击插件图标的手势授予），**零新权限 / manifest 零 diff**；host 权限仅作「目标站点已授权」资格闸门，capture 仍可能失败 → 走 D-142 回退。**e2e 偏差如实披露**：headless 无法合成 activeTab 手势，故 e2e 临时 dist 副本追加 `<all_urls>`（JS 字节与产品 manifest 零改动）。
- **D-144（元素裁剪：`dom-op` 取 rect + SW `OffscreenCanvas`）**：元素 rect 经既有 `dom-op` 通道（插件侧 `wcliScreenshotRect`，内部复用 base `readElement` 以继承完整定位语法）取回 JSON（含 `dpr`/viewport）；SW 按 `bitmap.width / viewportWidth` 求 `scale` 后裁剪；元素不在视口内/裁剪区为空 → 回退（D-142）。`fullpage` 明确**留给 D2**，本轮不实现。
- **D-145（chrome 文案修正只在插件层包装）**：不改 base 源；`wrapChromeEntryForHost` 覆盖插件暴露条目的 `description`/`help`，删除「不可承载」绝对表述并指向 `tabs` / 宿主层能力；静态断言钉住插件暴露文案**不再包含**「不可承载」。**被否决**：改 base 文案（红线）；仅在系统提示词里解释（工具面文案仍误导）。

### 32.4 门禁与验证（本轮复跑原文摘录）
- 新增 `test/real-screenshot.test.ts`（16）：已授权→真实（base 近似零调用）/ 未授权→回退+标注原因 / 受限页（非 http(s)）→捕获前拒绝 / 无标签页→回退 / capture 失败（`MAX_CAPTURE_VISIBLE_TAB_CALLS_PER_SECOND`）→回退 / element→rect+crop / rect 失败→回退 / crop 失败→回退 / fullpage→交给 base 不标注 / **透传断言**（`waitFor`/`extractData` 与 base 同引用）/ `annotateScreenshotPath` 改写「近似」/ `isCapturableOrigin` / env 集成（wait/extract/export 仍注册）。
- `test/browser-tools.test.ts`：新增 D4 断言（插件暴露 chrome `description`/`help` **不含「不可承载」**、含 `书签` 与 `tabs` 指引、help 含真实像素路径）+ 透传后 `wait`/`extract`/`export` 仍在。
- 插件 `npm test`：**405 pass / 0 fail**（389→405，+16）。
- 插件 `tsc --noEmit`：**0 error**；`npm run build`：成功（dist）。
- `test:e2e`（真 dist + 真 Chromium + CDP）：**PASS**。新增断言原文：
  - `✔ captureVisibleTab returns a Promise in this MV3 SW ({"isPromise":true,"ok":true,"len":15886})`
  - `✔ captureVisibleTab yields a real PNG dataURL (...len:15886)`（LGDL 场景 `len:113770`）
  - `✔ chrome screenshot used REAL pixels (captureVisibleTab) via the page download chain`
  - `✔ screenshot honestly falls back to canvas + reason when the target tab is not visible`
  - 偏差：临时 dist 副本 `host_permissions += <all_urls>`（headless 无 activeTab 手势 / 无 `<all_urls>` 时 API 明确拒绝）；dist JS 字节与产品 manifest 零改动。
- `test:ui` **136 PASS**、`test:hardening` **24 PASS**、`test:binding` **125 PASS**、`test/parity.test.ts` 不回归。
- 全仓 `npm run build` + `npm test`：**0 fail**（base **483 零回归**；各 workspace：267/95(1 skip)/8/31/84/15/483/405）。
- **红线核验**：`git diff --stat -- packages/web-cli-base packages/web-cli-plugin/manifest.json packages/web-cli-plugin/package.json .opencode/opencode.json` **为空**；无新增依赖；无 `<all_urls>`（产品 manifest）；无明文 key；无静默失败（回退必带原因）。

### 32.5 未完成 / 降级（如实）
- **`mode=fullpage` 真实整页截图未实现**（本轮明确交给 base 返回「不支持」；D2 单独一轮做）。
- **`captureVisibleTab` 依赖 `activeTab` 手势**：真实使用中由用户点击插件图标授予；若用户经其他入口打开侧栏（无手势）或 capture 触发速率限制，则回退近似并标注原因——这是 API 语义决定，非本实现取舍。
- **e2e 的 `<all_urls>` 为测试副本偏差**（已披露）；产品 manifest 未改、仍需真实手势，故「点击图标后真实截图」的端到端手势链属人工面（同 H0）。
- **元素裁剪在 SW**：大图裁剪受 SW 内存/CPU 影响，未做分块/降采样；元素不在视口内时回退近似（不自动滚动后捕获）。

## 33. 整页截图（D2）+ 原生 back/forward（D6）（TASK-035 / Wave 27）

> 用户诉求（原话）：「D2 整页截图：`mode=fullpage` 现状返回 base「不支持」→ 实现滚动拼接（分屏 `captureVisibleTab` + SW 合成 + 遵守 2 次/秒速率限制 + 恢复滚动 + 上限 + 诚实标注 `position:fixed`/sticky 重复等局限）。D6 原生 back/forward：优先 `chrome.tabs.goBack/goForward`，失败可读回退页面 history 并如实标注；离开绑定 origin 要可读说明。**两者都在插件侧 ops 包装层，base 零改动、manifest 零改动、无新权限、无新依赖。**」

### 33.1 问题
- `chrome screenshot --mode fullpage` 在 base 执行器（`packages/web-cli-base/src/chrome-tools.ts:304`）**先行短路**返回「整页级截图不支持」，`env.dom.ops.screenshot` 根本不会被调用；插件虽为扩展宿主，但 fullpage 一直不可用。
- `chrome back/forward` 经 base `ops.historyNav(±1)` → 页面 `history.back/forward`，**只在 SPA 路由内可靠**；插件已具备扩展宿主能力，可用标签页级原生历史。

### 33.2 实现（base 零改动 / manifest 零 diff / 零新权限）
- **同一包装层**：`src/platform/real-screenshot.ts` 的 `createRealScreenshotOps()`（透传 `Proxy`）在只覆盖 `screenshot` 之外**新增覆盖 `historyNav`**；其余方法/属性（`waitFor`/`extractData` 等）**全透传**（断言加强：`printPage`/`reloadPage`/`waitFor`/`extractData`… 与 base 同引用）。
- **D2 fullpage（插件侧接管，因 base 短路）**：`src/tools/chrome-host.ts` `wrapChromeEntryForHost()` 检测 `screenshot + mode=fullpage` → 调 `ops.screenshot({mode:'fullpage'})`（插件提供者：`captureFullpageViaScreens()`）→ 复用 base **已导出**的 `summarizeScreenshotData`/`screenshotFilename`/`translateCapabilityError` 走同一套输出/下载策略（自动下载链、`{尺寸/字节/文件名}` 摘要、`--include-dataurl` 预算内头段、dataURL 不进上下文）。
  - **几何/滚动通道**：`content-script.ts` 新增插件专用 `dom-op` 方法 `wcliFullpageMetrics`（文档/视口/滚动位置/dpr）与 `wcliScrollTo`（`window.scrollTo` + 双 `rAF` 沉降，250ms 有界兜底）；`service-worker.ts` 经既有 `dom-op` 通道读取（`fullpageMetricsViaPage`/`scrollToViaPage`）。
  - **拼接算法**：屏数 `ceil(scrollHeight / viewportHeight)`；逐屏滚到 `min(i*vh, scrollHeight-vh)` → 按**实际沉降 `y`** `captureVisibleTab` → SW `OffscreenCanvas`/`createImageBitmap` 按设备像素 `y*dpr` 合成（末屏裁剪至剩余高度）。
  - **节流 / 退避**：`MAX_CAPTURE_VISIBLE_TAB_CALLS_PER_SECOND = 2` → `MIN_CAPTURE_INTERVAL_MS = 500`（相邻捕获**起始**间隔）；命中限流按 `CAPTURE_RATE_LIMIT_BACKOFFS_MS = [700, 1500]` **有界重试**（`isCaptureRateLimitError`），一屏瞬时限流不放弃整页。
  - **上限**：`MAX_FULLPAGE_SCREENS = 20`；`MAX_FULLPAGE_PIXELS = 40_000_000` → **捕获前**可读拒绝 + 已捕获范围（`0 屏（未开始捕获）`），**不得无界抓取**。
  - **恢复滚动**：成功/失败/超限（捕获后）均恢复原 `scrollX/scrollY`；恢复失败输出 `⚠ 原滚动位置恢复失败：…`（`restored:false`）。
  - **诚实标注（硬要求）**：成功输出必含 `像素路径：真实像素（captureVisibleTab ×N 屏拼接）` + `FULLPAGE_LIMITATION_NOTICE`：`position:fixed / sticky 元素会在每屏重复出现；懒加载内容可能尚未加载；动画/轮播状态在不同屏可能不一致`，并明示「非『完整/无损』整页」。失败/超限 → `✖ chrome screenshot：整页拼接不可用 —— <原因>`，**零静默**且不返回不完整图像。
- **D6 back/forward（同一包装层，risk 沿用 base `ui` 不放宽）**：优先 `chrome.tabs.goBack/goForward(tabId)`（`service-worker.ts` `hostHistoryNavViaTabs()`，返回导航后 origin/url）→ 输出 `历史路径：原生（tabs.goBack/goForward）`；不可用/失败（无 seam / 无绑定标签页 / 受限页 / 无历史）→ 回退 base 页面 `history` → 输出 `历史路径：页面 history（回退，原因：<具体原因>）`。原生成功且**离开绑定 origin** → 明确「已离开绑定 origin X → Y；原 origin 的会话/站点授权不适用于新站点；导航后重新探测，已授权自动绑定、未授权需点图标」，**不静默把会话带到别的站点**；新地址不可读亦提示需在面板确认。
- **文案修正同步**：`chrome` 的 `schema.description`/`help`/`schema.parameters.args.properties.mode.description` 在插件层包装中删除「整页级 out / 不支持」旧结论，改为「整页级 = 滚动分屏 captureVisibleTab 拼接（近似并声明局限）」+ back/forward 原生优先说明。

### 33.3 新增决策（D-146~D-150）
- **D-146（fullpage 由插件层接管命令与交付）**：base 执行器对 `fullpage` **先行短路**，故 `wrapChromeEntryForHost` 接管 fullpage 命令；输出/下载策略复用 base **已导出**助手（`summarizeScreenshotData`/`screenshotFilename`/`translateCapabilityError`）以免策略漂移。**被否决**：改 base 短路分支（红线）；把 fullpage 混进 `--mode viewport` 的 `deliverScreenshot`（文件名/标签会错）；只加 `ops.screenshot` 分支（永远不被调用）。
- **D-147（节流 + 有界退避 + 上限，不得无界抓取）**：`MIN_CAPTURE_INTERVAL_MS=500`（源自 2/s 硬限）+ 限流按 `[700,1500]ms` 有界重试；`MAX_FULLPAGE_SCREENS=20` / `MAX_FULLPAGE_PIXELS=40MP` 捕获**前**拒绝并给出范围。**被否决**：只按 500ms 硬节流（1 秒窗口内抖动会连续命中限流，e2e 实测第 9/10 屏被拒）；失败即整体放弃（丢失已捕获屏，无重试）。
- **D-148（始终恢复滚动 + 恢复失败如实披露）**：`finish()` 包装保证所有正常/失败/超限分支都恢复原 `scrollX/scrollY`；恢复异常记录 `restoreError` 并出现在最终输出（`restored:false`）。**被否决**：仅在成功路径恢复（失败会把页面留在底部）。
- **D-149（整页诚实标注：近似而非「完整/无损」）**：成功输出强制 `像素路径：真实像素（captureVisibleTab ×N 屏拼接）` + 局限声明（fixed/sticky 每屏重复、懒加载、动画/轮播状态不一致）。**被否决**：只标注「真实像素」而不说拼接近似（会误导为完整整页）。
- **D-150（D6 原生优先 + 路径标注 + 离开 origin 披露）**：`historyNav` 覆盖为原生 `chrome.tabs.goBack/goForward` 优先，失败回退页面 `history`；两条路径都标注实际路径与原因；离开绑定 origin 明确说明绑定/授权影响。risk 沿用 base `ui` 不放宽。**被否决**：静默用原生（可能把会话带到别的站点而不告知）；继续只用页面 history（跨导航不可靠）。

### 33.4 门禁与验证（本轮复跑原文摘录）
- 新增 `test/fullpage-screenshot.test.ts`（20）：屏数计算（`ceil(2000/600)=4`）/ 节流 `500ms ×3` 且 `MIN=1000/MAX` / 非零原点恢复 / 超屏数（`>20`）零捕获拒绝 + 范围 / 超像素（`>40MP`）零捕获拒绝 / 中途非限流失败报已捕获范围仍恢复 / 限流按 `700ms` 退避重试后成功 / 恢复失败披露 / 未授权拒绝 / 几何失败拒绝 / 缺少 seam 拒绝；D6：原生 back/forward 标注 + 停留 origin / 离开 origin 披露 / 原生失败回退带原因 / 无 seam·无 tab·非 http 回退 / 无 base `historyNav` 可读；**透传断言**（仅 `screenshot`/`historyNav` 被覆盖，`readState`/`snapshot`/`waitFor`/`extractData`/`printPage`/`reloadPage` 与 base 同引用）。
- `test/real-screenshot.test.ts`：fullpage 交给 base 的旧断言改为「无 seam → 可读拒绝且不落到 base 不支持路径」；新增 historyNav 覆盖 + 其余全透传 + env 集成（fullpage 交付含「像素路径 ×N 屏拼接 / fixed-sticky 局限 / 滚动已恢复」并经下载链；`chrome back` 原生标注）。
- `test/browser-tools.test.ts`：D4 断言加强——插件暴露的 chrome `description`/`help`/`schema.parameters.mode.description` **不含「整页级 out / 不支持」**，含「整页级 = 滚动分屏 captureVisibleTab 拼接」与 `tabs.goBack/goForward`。
- 插件 `npm test`：**425 pass / 0 fail**（405→425，+20）。插件 `tsc --noEmit`：**0 error**；`npm run build`：成功。
- `test:e2e`（真 dist + 真 Chromium + CDP）：**PASS**。新增/关键断言原文：
  - `✔ A/fixture(non-LGDL): fullpage stitched ≥2 screens with captureVisibleTab and declared the approximation limits`（实测 `尺寸: 780×4229px`、`×10 屏拼接`、viewport 437px → 拼接高 > 单屏；局限声明可见）
  - `✔ A/fixture(non-LGDL): fullpage restored the original scroll position (0 → 0)`
  - `✔ A/fixture(non-LGDL): back/forward prefers native tabs.goForward and labels the readable fallback with its reason`
  - `✔ A/fixture(non-LGDL): back/forward attempts native tabs.goBack with real history (headless fallback labeled; see deviation)`
  - `✔ A/fixture(non-LGDL): native back was attempted with ≥2 real history entries (history.length=3) — the fallback is the headless tabs API, not missing history`
- `test:ui` **136 PASS**、`test:hardening` **24 PASS**、`test:binding` **125 PASS**、`test/parity.test.ts` 不回归。
- 全仓 `npm run build` + `npm test`：**0 fail**（base **483 零回归**；各 workspace：267/94(1 skip)/8/31/84/15/483/425）。
- **红线核验**：`git diff --stat -- packages/web-cli-base packages/web-cli-plugin/manifest.json packages/web-cli-plugin/package.json .opencode/opencode.json` **为空**；无新增依赖；无 `<all_urls>`（产品 manifest）；无静态 `content_scripts`；无明文 key；无静默失败（回退/拒绝必带原因）。

### 33.5 未完成 / 降级（如实）
- **D6 原生 `tabs.goBack` 在 headless 无法成功**：headless Chrome for Testing 151 的 `chrome.tabs.goBack/goForward` 即便在 `history.length=2` 的真实历史下仍拒绝「Cannot find a next page in history」（另有独立实验：新标签页两次真实导航后同样拒绝，`webNavigation` 权限亦无效）。故 `test:e2e` 只能证明「**原生优先** + 失败可读回退标注」（回退原因即原生 API 错误，且已断言 `history.length≥2` 排除「无历史」）；**原生成功**由 `test/fullpage-screenshot.test.ts` 以注入 host-nav seam 确定性覆盖。真实 headed Chrome 下原生路径未重测（本机门禁均在 headless）。
- **整页拼接为近似**：`position:fixed`/sticky 元素会在每屏重复、懒加载内容可能未加载、动画/轮播状态可能不一致（已在输出声明）；页面存在横向滚动时只拼接视口宽度（未另行声明；`--mode viewport` 分次截取为建议出路）。
- **整页上限为硬拒绝**：>20 屏或 >40MP 直接可读拒绝（不自动降采样/分段多次抓取）。
- **e2e 的 `<all_urls>` 为测试副本偏差**（沿用 TASK-034 披露）；产品 manifest 未改，真实手势链仍属人工面。

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建：P0 最小可用集 TASK-001~011 构建报告（含门禁结果、红线 grep、D-001~D-008 决策、遗留风险） | 2026-09-11 | SDDU Build Agent |
| v1.1 | R1 审查修复轮：BLK-1（安全红线）/BLK-2（多轮会话）+ 6 高价值改进（FR-025/FR-008/TASK-010/IMP-4/maxRounds/GATE-011 表述）；D-009~D-015；插件 54→68、lgdl-web 66→75；全仓 0 fail | 2026-09-11 | SDDU Build Agent |
| v1.2 | P1 实施轮：TASK-012~015（协议完善/UI 操作+事件桥/风控+文档/可选 DOM 工具面）；D-017~D-020；插件 68→89、lgdl-web 75→77；全仓 0 fail；未 git 提交 | 2026-09-12 | SDDU Build Agent |
| v1.3 | 遗留清账轮（§11）：R-BLK1a/R7/R8/R9-6/7/8/10/12 + minors×2 + EC-008/009/012 + AC-004/007/011 + NFR-007；D-021~D-029；插件 89→112、lgdl-web 77→78、base 483 零回归；R8 E2E 固化并 PASS（唯一偏差披露）；未 git 提交 | 2026-09-12 | SDDU Build Agent |
| v1.4 | P2 终收口轮（§12）：TASK-016 发布渠道 `docs/release.md` + Gate-D D-1~D-7 评估 + 内置助手下线执行（`ai/*` 移除 + App.tsx 摘除，保留 base 机制层 + web-cli-host）+ 回退预案（单提交 revert + `VITE_AI_ASSISTANT_FALLBACK` 默认 off）+ EC-016 不静默迁移告知；D-030~D-035；lgdl-web 78→31（删除 47 = provider 21 + session 26，EC-012 用例 1:1 改写）、base 483 零回归、插件 112、E2E A/B PASS；未 git 提交 | 2026-09-12 | SDDU Build Agent |
| v1.5 | UI 修复轮（§13，TASK-017）：首次截图式 UI 审查 F-1~F-9——先量化确认无真实水平溢出；sidepanel 增设置入口/LLM 状态摘要（`llm-status` 零明文）/状态驱动引导/日志空态/知情同意默认折叠/按钮禁用语义；options 增使用说明/未配置提示/保存后清空 Key/maxRounds 说明；F-9 模型 ID 与原始实现 100% 一致（待核未改）；D-036~D-042；插件 112→124（+12，base 483 零回归，全仓 1106 pass/1 skip 0 fail），E2E A/B PASS，重截前后实测 0 溢出/0 超宽/0 截断；未 git 提交 | 2026-09-12 | SDDU Build Agent |
| v1.6 | post-validate 回归复核（§13.7）：量化复现「D 态日志横向并排」为审计脚本未同步 `.empty` 类 + `#log.empty{display:flex}` 泄漏所致（生产 `render()` 路径本就逐行）；最小 CSS 修复 `#log.empty:not(:has(> *))`（零 JS 改动，保留 `height:45vh`/`pre-wrap`/空态居中）；复测 @400/@320 子元素 y 递增、无水平溢出；新增静态断言（测试先行），插件 124→**125**、base 483 零回归、全仓 0 fail；D-043；未 git 提交 | 2026-09-12 | SDDU Build Agent |
| v1.7 | R4 低危改进（§13.8）：W1 `state` 补回授权位（新增 `state-message.ts` + `stateActionFromPayload`，刷新即同步 `authorized`；CDP 实测「未授权→授权→重载→已授权」+ 按钮态，截图 `/tmp/w1-verify/`）；W3 `llm-config` 收敛到非敏感摘要（移除 `apiKeyMasked`/`maskValue`，消息+管理工具统一 `toLlmStatusSummary`）；D-044/D-045；插件 125→**132**（+7）、`tsc` 0 error、全仓 build/test 0 fail（base 483 零回归）、E2E 场景 A/B PASS、base 与 `.opencode/opencode.json` 零改动、无新依赖；未 git 提交 | 2026-09-12 | SDDU Build Agent |
| v1.8 | TASK-018（§14）：用户实测反馈——**先真复现**（全新 profile + 真实 dist + CDP 真实键入/点击）：首次/二次保存均成功、storage 真落库，`loadProvider` 恒返回对象（非 undefined）→ 可疑 TypeError **假设不成立**，如实记录；据此做静默失败防御（保存/测试/刷新全部 try/catch 可读失败、空 Key 明确提示不假装成功、保存后清空 Key+摘要回显）+ 新增「测试连接」（background `llm-test` + `src/llm/test-connection.ts`，复用 base `chat`，可读分类 401/403/404/CORS/超时，火山直连受限如实呈现，key 不入日志/审计）+ 新增 `npm run test:ui`（`test/ui/journey.mjs`，全新 profile + 真实 dist + 真实点击，25 断言）常驻门禁；D-046~D-052；插件 132→**146**（+14）、base 483 零回归、全仓 0 fail、`test:ui` PASS、E2E A/B PASS、base/`.opencode/opencode.json` 零改动、零新增依赖；未 git 提交 | 2026-09-12 | SDDU Build Agent |
| v1.9 | TASK-019（§15）：三成因加固——① `src/platform/env-guard.ts` 非扩展上下文守卫（options/sidepanel 阻断横幅 + 保存/测试/清除禁用 + 输入说明；`file://` 修复前/后对照实证）；② `discover` 尊重上报三态 + 持久化可读 `reason` + `reprobe` 重试入口，侧栏三态显式说明（未声明 = 设计如此非故障；未知 = 可读原因 + 重新探测）；③ `diag` 消息 + 「环境自检/诊断」六项 + 一键复制（零明文，`sanitizeDiagText` 纵深脱敏）+ `__BUILD_STAMP__` 构建戳与「未重载」不一致提示；新增 `test:hardening` 实证探针（A/B/C，22 断言 PASS）；D-053~D-058；插件 146→**173**（+27）、`tsc` 0 error、全仓 build/test 0 fail（base 483 零回归）、`test:ui` PASS（Chrome-for-Testing 151 + 系统 snap Chromium 152）、E2E A/B PASS、base/根 `package.json`/`.opencode/opencode.json` 零改动、零新增依赖；**「填 Key 没法保存」仍未能复现根因，如实标注**；未 git 提交 | 2026-09-12 | SDDU Build Agent |
| v1.10 | TASK-020（§16，用户实测反馈第三轮）：修复两个**真实 UX 缺陷**——① 保存成功却像失败（TASK-017 F-8 清空 Key 框无标记）→ 保存后 placeholder=「已保存（不回显）…」+ `#key-state`=「Key ✅ 已写入（不回显）」+ 成功块/高亮/摘要；②「无活跃站点」无解释无出路 → 三态具体原因 + 「重新绑定当前标签页」(`rebind` 消息) + 发送禁用原因就近可见；侧栏 LLM 行补 `Key ✅/⚠未配置`（零明文）；侧栏新增「测试连接」（复用 `llm-test`，stored 回退，key 不回传/不落日志审计），options 测试按钮视觉突出紧邻保存；`test:ui` 25→**41** 断言（含侧栏 0 异常）；D-059~D-063；插件 173→**183**（+10）、`tsc` 0 error、全仓 build/test 0 fail（base 483 零回归）、`test:hardening` 22 断言 PASS、E2E A/B PASS、base/根 `package.json`/`.opencode/opencode.json` 零改动、零新增依赖；真实第三方厂商直连仍属人工面 H7 不冒充；未 git 提交 | 2026-09-12 | SDDU Build Agent |
| v1.11 | 站点绑定链路缺陷修复（§17，用户实测第四轮）：代码级根因 ① `openPanelOnActionClick:true` 吞掉 `action.onClicked` 使绑定成死代码 + ② 无 `tabs`/host 权限时 `tab.url===undefined` 被误报「没有可读取的地址」；修复：显式置 `openPanelOnActionClick:false` + `onClicked` 先同步 `sidePanel.open` 再 `bindTab`（open 失败可读降级不撤销绑定）、`optional_host_permissions` 补 `http://*/*`、`minimum_chrome_version` 114→116、新增 `tabs.onActivated` 切换失效提示（只比 tabId 不读 url）、`addressUnreadable` 分类 + 文案统一指向「点插件图标（唯一触发点）」；新增 `npm run test:binding`（`test/ui/binding.mjs`，真实 dist + 真实 `http://localhost:5173` lgdl-web + mock LLM，**33 断言**跑通绑定→注入→发现→授权→发送可用→11111 对话 6 步）+ `test/binding-wiring.test.ts`；D-064~D-068；插件 183→**191**（+8）、`tsc` 0 error、全仓 build/test 0 fail（base 483 零回归）、`test:ui` 41 PASS、`test:hardening` 22 PASS、E2E A/B PASS、无 `<all_urls>`/无新增 `tabs` 权限/无新依赖/base 与根 `package.json` 零改动；图标点击真实手势与原生权限弹窗仍属人工面（headless 不可能，已在脚本披露）；未 git 提交 | 2026-09-12 | SDDU Build Agent |
| v1.12 | 工具名非法字符缺陷修复（§18，用户实测第五轮）：根因 = base `deriveTools` 把含命名空间的 fqn 当 LLM 工具名，而 `site.<id>` / `plugin.<name>` 含 `.` → DeepSeek `400 Invalid 'tools[0].function.name'`；修复（base 零改动）：站点 `site_<sanitized>`、管理 `admin_<name>`（`namespace:''`，`group` 不变）、`sanitizeToolName`/`allocateSiteToolNames`（确定性去重 `_2`/`_3`… + 审计）、策略判据 `namespace==='site'`→`group==='site'`（未放宽）、RPC 仍用原始 `decl.id`；附带查清 B「同错误两次」= base `AgentRunner` 重试一次（用 `willRetry` 改为「重试提示 + 单条 error」）与 C「未授权」= 授权只门禁执行（声明可见，fail-closed 执行已断言，未改语义）；`test:binding` 扩展为**捕获真实发给 LLM 的 12 个 tools 并断言全部匹配 `^[a-zA-Z0-9_-]+$`**（38 断言）；D-069~D-073；插件 191→**196**（+5）、`tsc` 0 error、全仓 build/test 0 fail（base 483 零回归）、`test:ui` 41 / `test:hardening` 22 / E2E A/B / `test:binding` 38 全 PASS、base 与 package.json 零改动、无新依赖、无明文 key、未 git 提交 | 2026-09-12 | SDDU Build Agent |
| v1.13 | 侧栏消息 Markdown 渲染与消息样式（§19，TASK-022，用户实测第六轮）：根因 = `sidepanel.ts` 每条消息仅 `textContent = \`${role}: ${text}\`` 纯文本；新增零依赖 `ui/sidepanel/markdown.ts`（解析/建 DOM 分离；**不解析 HTML**，只用白名单标签 + `createTextNode`，链接仅 http/https，其余降级文本，`javascript:`/`data:` 不可能成为 `a.href`）；消息改角色分组块（assistant Markdown / tool+system 等宽 pre-wrap / user 纯文本），CSS 加角色色条 + `pre`/`table` 横向滚动 + `overflow-wrap:anywhere` 且保留 `#log` 空态/pre-wrap/滚底/`.entry-*` 选择器；新增 `test/markdown.test.ts`（12 用例）+ `test/ui/journey.mjs` #14a~#14i；D-074~D-078；插件 196→**209**（+13）、`tsc` 0 error、全仓 build/test 0 fail（base 483 零回归）、`test:ui` 41→**50** / `test:hardening` 22 / E2E A/B / `test:binding` 38 全 PASS、base 与 package.json 零改动、无新依赖、无明文 key、未 git 提交 | 2026-09-12 | SDDU Build Agent |
| v1.14 | 侧栏整体 UI/UX 重做（§20，TASK-023，用户实测第七轮）：先 `git show 762d3a6^:packages/lgdl-web/src/ai/AiPanel.tsx` + `app.css` **读回原 AI 助手**作设计基准（§20.2 逐条「参照→对齐」表，16 项：12 对齐 / 2 不适用 / 1 部分 / 1 优于参照）；核心修复=三区 flex 全高（`html,body{height:100%}`+`body{display:flex;flex-direction:column}`），`#log` 去 `45vh` 硬编码改 `flex:1;min-height:0`，composer 为底部区**末元素**（`#consent` 折叠条移到 composer 之前），8 按钮收为「3 主操作 + `<details>更多`」；消息改角色气泡（user indigo 右对齐 / assistant Markdown 气泡 / tool **可折叠卡片**（工具名+状态+耗时+首行摘要，长输出默认折叠）/ system·error 醒目 / command 紧凑块 / thinking 三点 / `#scroll-bottom` 跟随策略）；明暗适配 tokens；**零新依赖/无框架/无 innerHTML/MV3 CSP 合规**；前后量化对照（真实 dist+CDP，400×900）：`#log` 45.0%→**65.5%**（稳态）且 flex-grow 0→1、composer 底边 **-64px（被挤出视口）→ +8px 贴底**、工具卡片 0→2 可折叠、320px 零水平溢出；截图 `/tmp/ui-redesign/{before,after}/`；`test:ui` 50→**67**（#15a~#15q）、`test:binding` 38→**41**（真实用户气泡 #6h~#6j）、插件 209→**222**、`tsc` 0 error、全仓 build/test 0 fail（base 483 零回归）、`test:hardening` 22 / E2E A/B 全 PASS、base 与 package.json 零改动；**流式如实未实现（base 无增量能力，原助手亦无），首用态 31.5% 真实权衡**已披露；D-079~D-086；未 git 提交 | 2026-09-12 | SDDU Build Agent |
| v1.15 | ① 消息不自动滚动缺陷修复（§21，用户实测第八轮）：根因 = TASK-023「追加前判定 + 24px 阈值」的**误判即棘轮**（一次不跟随就还原 `prevTop`，此后恒不跟随）；修复 = 新增纯策略模块 `src/ui/sidepanel/scroll-policy.ts`（实时锚定 + 48px 阈值 + `userSent()` 一次性强制），`render()` 消费决策、`followToBottom` 以 `requestAnimationFrame` 布局后钉底（次帧仅仍锚定时，绝不抢用户上滚）；发送**无条件**到底，thinking 出现/消失同走 `render()`，上滚保留入口与位置；`test/sidepanel.test.ts` +7、`journey.mjs` +3（#15r/s/t）、`binding.mjs` +3（#6k/6k2/6l，真实发送到底）；D-087~D-089。② 能力面审计（§22，**只报告未改行为/注册**）：base 全量工厂清单 + 插件实际注册面（`host.ts:64` 未传 `builtins` → 仅 base 默认 3 内建 + 6 `admin_*` + `ask-user` + 站点声明 2 = **12**，`web-cli-help` `listed:false` → 自列 **11**，与用户实测吻合）+ 34 行漂移对照（明确漂移=第 1/2 行 web-fetch/sleep 被误写「非独立工具」；部分漂移=第 27/31 行 chrome/events；轻度=第 21 行 eval-js risk 理由）+ 未注册工具适用性/代价/risk 档 + 分级建议。门禁：插件 222→**229**、`tsc` 0 error、`test:ui` 67→**70**、`test:binding` 41→**44**、`test:hardening` 22、`test:e2e` A/B PASS、全仓 build/test **0 fail**（base **483 零回归**）、base/`package.json`/`.opencode/opencode.json` 零改动、无新依赖、`capability-matrix.md` 未改；未 git 提交 | 2026-09-12 | SDDU Build Agent |
| v1.16 | **v0.9 增补：自动探测 + 多会话**（§23，作者 2026-09-12 两项架构级决策；TASK-024/025）：①**自动探测（FR-047/ADR-014）**——新增 `src/background/content-script-registry.ts`（`registerContentScripts` + `persistAcrossSessions` + 启动/安装/权限变更对账，补齐缺失·清理已撤销·失败可读）；`authorize` 授权即注册、`revoke` 即注销；content script 主动 `hello` + 应答 `whoami` → **免点图标自动绑定**（无 `tab.url`、无 `tabs`、无手势）；未授权站点静默降级保留点图标回退。②**多会话（FR-048/ADR-013）**——新增 `src/background/session-store.ts`（`sessionId=origin` / `group:<id>`；每会话独立 40-turn 有界历史；上限 20 + LRU 可读披露；分组加入/移出/删除可逆且**分组≠授权**）；`chat-session` 增 `boundHistory` 复用；`controller`/`state-message`/`sidepanel`/`options` additive 接线；切换会话取消待决 confirm/ask（EC-019）。**真实环境免点图标实证**：`test:binding` 新增阶段 2 `#A0~#A7`（authorize→真实 `chrome.scripting` 注册→reload 触发 hello→自动绑定 origin+supported+工具面；whoami 切页重绑；未授权静默降级）。门禁：插件 229→**262**（+33，5 个新测试文件）、`tsc` 0 error、`test:ui` 70→**79**（#16a~#16i 会话切换器/历史隔离双向/分组≠授权）、`test:binding` 44→**58**、`test:hardening` 22、`test:e2e` A/B PASS、全仓 build/test **0 fail**（base **483 零回归**）；base/`package.json`/`.opencode/opencode.json` 零改动、**无新依赖**、**无 `tabs`**、**无 `<all_urls>`**、无静态 `content_scripts`、无 innerHTML/明文/私有依赖；spec v1.4（FR-047/048 + EC-017~020）/plan v1.1（ADR-013/014）/docs dev·compliance·capability-matrix（漂移修正 D-100）同步；D-091~D-100；未 git 提交 | 2026-09-12 | SDDU Build Agent |
| v1.17 | **v0.9 增补：标签页管理工具 + `tabs` 权限扩张**（§24，作者 2026-09-12 决策③；TASK-026）：新增 `src/tools/tabs-tools.ts`（插件级工具 `tabs`，list/switch/open，**明确不做 close**；risk list=read/switch=ui/open=write；`list` 默认去 query/fragment、`--full` 显式；非 http(s) scheme 可读拒绝；每子命令入审计）+ `src/background/tabs-setting.ts`（隐私开关，默认开）；`manifest.permissions` **唯一新增 `tabs`**（接受安装警告「读取您的浏览记录」）；`host.setTabsEnabled` 关闭即从 `deriveTools()` 移除（`enabled` 语义）；`switch` 复用 `bindTab` 绑定链并切到该 origin 会话；options 页隐私开关 + 披露文案；docs compliance §9 / release §5 / capability-matrix 第 27 行+§3.2 / dev §12.4。门禁：插件 262→**292**（+30，2 新测试文件）、`tsc` 0 error、`test:ui` 79→**85**（#17a~#17e 开关 + #15u tabs 卡片）、`test:binding` 58→**73**（真实 `tabs list`/`--full`/`tabs switch`→会话切换，工具面 12→13）、`test:hardening` 22、`test:e2e` A/B PASS、全仓 build/test **0 fail**（base **483 零回归**）；base/`package.json`/`.opencode/opencode.json` 零改动、**无新依赖**、无 `<all_urls>`、无静态注入；三处旧「无 tabs」断言语义按决策③更新为精确权限集合（非降级）；未 git 提交。 |
| v1.18 | **v0.9 缺陷修复：`web-fetch` CORS 预校验 + 失败可见**（§25，TASK-027，用户实测「插件加载报错」驱动）：根因 = base 内建 `web-fetch`（`web-fetch.ts:138/143`）在扩展 SW 内对未授权域名直接 `globalThis.fetch`，必然被 CORS 拦截（`chrome://extensions` 出现错误条目），且失败只进 LLM 上下文。修复（**base 零改动**）：新增 `src/tools/web-fetch-tool.ts` 受控 seam（相对路径解析绑定 origin / 绝对 http(s) 经 `chrome.permissions.contains` / **未授权 → 零请求 + 可读拒绝 + 两条授权指引** / 非 http(s) scheme 可读拒绝 / 同源优先页面上下文）；`host.ts` 传 `builtins:['sleep','web-cli-help']` 后注册受控同名条目**替换** base 内建（分发仍走 `router.dispatch`，门禁/审计不旁路）；`service-worker.ts` 注入真实 deps + system prompt 要求报告工具失败；`content-script.ts` 新增 `fetchSameOriginText` 同源读取；`chat-state.ts` 失败 tool 条目 `kind:'error'`（侧栏可见错误色）。门禁：插件 292→**309**（+17）、`tsc` 0 error、`test:ui` 85→**87**（#15v/#15w）、`test:binding` 73→**81**（#0h/#1d/#7f~#7k；**未授权域名零请求 + 无 CORS 条目 + 同源页面上下文真实读取**，保留既有断言）、`test:hardening` 22、`test:e2e` A/B PASS、全仓 build/test **0 fail**（base **483 零回归**）；**manifest 零 diff**（无新权限/无 `<all_urls>`）、无新依赖、`.opencode/opencode.json` 零改动；D 项核实：**无真实加载错误**（SW 可达 + ping 往返 + 0 未捕获异常），CORS 属运行期；D-107~D-111；未 git 提交。 |
| v1.19 | **侧栏自动测试当前模型配置**（§26，TASK-028，作者要求）：移除侧栏独立「测试连接」按钮（options 页保留）；面板加载**自动**复用既有 `llm-test` 在 `#llm-test-result` 展示可读状态（**不新增请求路径**、仅加载触发一次、`render()`/消息追加/`focus`/`visibilitychange` 均不重复触发）；`background` 新增 **60s TTL 内存单槽缓存** `src/llm/test-cache.ts`（指纹 = 厂商+模型+Base URL+Key 的不可逆 FNV-1a；**仅内存比较，不落盘/日志/审计**）——命中直接返回原结果（含原耗时 ms，`cached:true`）不发请求，配置变更/TTL 过期失效重测；未配置 `no-key` 零请求。门禁：插件 309→**315**（+6 `test-cache.test.ts`）、`tsc` 0 error、`test:ui` 87→**97**（#12~#12m：无按钮/自动成功态格式/缓存命中 mock 计数不变/重复 render 探针不变/配置变更 mock+1/未配置零请求）、`test:binding` 81→**83**（#6-1 真站点加载即出现状态 / #6-2 无按钮）、`test:hardening` 22、`test:e2e` A/B PASS、全仓 build/test **0 fail**（base **483 零回归**）；**base 零改动 / manifest 零 diff / 无新依赖 / 无新权限**；docs dev §10.10 + §9/§10.5/§11.1 + tasks TASK-028 同步；D-112~D-116；未 git 提交。 |
| v1.21 | **按 origin 自动授权（读/写多选）**（§28，TASK-030，FR-052/ADR-017，作者要求）：新增 `security/auto-authorize.ts`（按 origin 持久化 `{read 默认 true, write 默认 false}`，`web-cli:auto-auth`，内存缓存即时生效，`set`/`clear` 入审计；`clear` = 读写都关）；在 `host.ts` 的 `onAsk` 接缝**前置判定**（**不改 `riskDefaults`/S1·S2·S3/denyPriority**）——策略链先裁决，仅当最终为 `ask` 时命中「对应 tier 已开启且非破坏性 read/write」→ 直接 allow；`evaluate`/未知 risk → 直接 deny（hardDeny）；**4 条硬底线**（未授权 S1 deny / 未知 risk S3 deny / evaluate deny / 破坏性写 ask）+ `ui·state·external` 不提供开关。新增 `isDestructiveInvocation`（id + 被调用子命令按 `[._:/-]` 切段比对 `DESTRUCTIVE_VERBS`，抓 `add-node`/`remove-node`；既有 `hasDestructiveVerb` 未改）。审计独立类型 `auto-authorize`（allow/deny/enabled/disabled，与人工 `confirm` 可辨）。UI：侧栏两个复选框 + 常驻标记 `⚡ 自动授权：读/写`（点击一键关闭）+ 常显硬底线文案；options 按站点管理列表。门禁：插件 336→**349**（+13 `test/auto-authorize.test.ts`）、`tsc` 0 error、`test:ui` 97→**113**（#18a~#18p）、`test:binding` 83→**96**（#19a~#19l：真实站点「开启写自动→非破坏性 `status` 免确认直接执行」「破坏性 `remove-node` 仍弹确认」「关闭→立即恢复确认」）、`test:hardening` **22**、`test:e2e` **PASS**、全仓 build/test **0 fail**（base **483 零回归**）；**base 零改动 / manifest 零 diff（无新权限） / 无新依赖 / 无 `<all_urls>` / 无明文 key / 无静默失败**；D-123~D-127；未 git 提交。 |
| v1.20 | **工具面基线对账门禁 + 浏览器能力补齐**（§27，TASK-029，FR-051/ADR-016，作者实测「DOM 操作 / 浏览器截图等命令全部丢失」驱动）：根因 = 既有测试只断言插件内部行为、`capability-matrix.md` 手写无执行 → 工具面静默漂移。修复：①**只读**临时克隆 main（不碰 main/不改本仓 .git）→ 机器枚举原助手工具目录（`main@2ddc9229`，34 工具/142 子命令）固化为 `test/parity/baseline-catalog.json`（provenance + 可重跑提取脚本 `extract-baseline-catalog.mjs`，含新工厂守卫）；②`test/parity.test.ts` **双向 + 子命令级**对账门禁（同名实现 / `waivers.json` 显式豁免（理由+依据+`providedAs`/`permission`）/ 否则失败；防插件新增未登记工具；`findCoverageGaps()` 自测能抓两类漂移）；③补齐**无新权限**的浏览器能力——content 隔离世界 `createBrowserDomOps()` + background `dom-op` 远程代理，注册 base `dom`(30)/`chrome`(print/back/forward/reload/**screenshot**)/`wait`/`extract`/`export`/`save`/`events`(经既有事件桥)/`web-search`；截图/导出/保存走页面上下文 anchor 下载链（**不新增 `downloads`**）；④风险档沿用 base（不放宽，走 `router.dispatch`）；⑤**待批准权限**（`notify`→`notifications`、`clipboard`→`clipboardRead/Write`）只报告不实施；⑥`docs/capability-matrix.md` 重写为机器校验的基线对账表 + `docs/dev.md` §13 对账/豁免流程。门禁：插件 315→**336**、`tsc` 0 error、`test:ui` **97**、`test:hardening` **22**、`test:binding` **83**（真实 LLM tools 清单 21 个已含 dom/chrome/wait/extract/export/save/events/web-search）、`test:e2e` **PASS**（新增 `dom read-state`/`dom click`/`chrome screenshot` 三条真机断言）、全仓 build/test **0 fail**（base **483 零回归**）；**base 零改动 / manifest 零 diff（无新权限） / 无新依赖 / 无 `<all_urls>` / 无明文 key / 无静默失败**；D-117~D-122；未 git 提交。 |
| v1.22 | **切 tab 按 `tab.url` 驱动会话跟随**（§29，TASK-031，Wave 23，用户实测「切到新域名 TAB 不会自动新建会话，旧 TAB 可以；重开插件才识别当前域名」驱动）：根因 = `onActivated` 的 `if (!session) return;` + 仅靠 content-script `whoami` 握手（新域名未授权→不注入→握手必失败）→ `markStale` 死路。修复 = 新增 `src/background/session-follow.ts` `followActiveTab`（URL 驱动：未授权新域名**仍切换/新建会话 + `session-changed` 推送面板 + 零注入**；已授权顺带 `ensureContentScript` + `reprobe` 发现；同 origin 复用同一会话；受限页不建会话、保留既有可读降级；`whoami` 仅作 URL 不可读回退），`onUpdated(complete)` 同路径，`loading` 的 EC-011 失效语义不变；移除本地 `tabOrigin` 副本。门禁：新增 `test/session-follow.test.ts`（10）、`test:ui` 113→**119**（#16j~#16o）、`test:binding` 96→**104**（#20a~#20f + #A6/A6b/A6c，保留既有）、`tsc` 0 error、`test:hardening` **22**、`test:e2e` **A/B PASS**、全仓 build/test **0 fail**（base **483 零回归**）；**base 零改动 / manifest 零 diff / 无新依赖 / 无新权限 / 无明文 key / 无静默失败**；D-128~D-131；未 git 提交（由上层统一提交）。 |
| v1.23 | **探测改为全自动（移除手动「重新探测」）**（§30，TASK-032，Wave 24，用户要求「逻辑上不需要用户手动探测；快速改造」驱动）：移除侧栏 `#discovery-retry` 手动按钮与点击处理；新增 `src/discovery/auto-probe.ts`（按 origin 去重 + 有界退避 `500ms→1s→2s→4s→8s→15s 封顶` + 成功/origin 变更/面板关闭/撤销停止 + 暂时性/终态分类，纯逻辑 mock 定时器可测）；触发点 = 面板打开(`state`→`focusBoundProbe`) / `tabs.onActivated` / `tabs.onUpdated(complete)` / content `hello` / `authorize` / 失败后定时器；面板经 `chrome.runtime.connect('web-cli-panel')` 让后台感知「有面板关注」，全部关闭即停重试（无后台常驻轮询）；`state` 携带 `probe` 投影 + `probe-changed` 推送；暂时性文案「正在自动探测…（第 N 次重试）」+ 原因，终态精确指出缺 `/.well-known/web-cli.json` / 声明无效 / 版本不匹配并说明自动重试，**不再要求用户点重试**；`reprobe` 保留为内部通道（D-132~D-135）。门禁：新增 `test/auto-probe.test.ts`（13）、`test:ui` 119→**121**、`test:hardening` 22→**24**、`test:binding` 104→**114**（阶段 3 延迟就绪 + 退避 + 零点击自动 ready）、插件 360→**373**、`tsc` 0 error、`test:e2e` **A/B PASS**、全仓 build/test **0 fail**（base **483 零回归**）；**base 零改动 / manifest 零 diff / 无新依赖 / 无新权限 / 无明文 key / 无静默失败**；docs dev §15 / protocol §2.1 同步；未 git 提交（由上层统一提交）。 |
| v1.24 | **设置面板改为侧栏内视图（移除 `openOptionsPage` 主入口，零跳转）**（§31，TASK-033，Wave 25，用户诉求「不建议跳到 `chrome-extension://…/options.html`…建议直接在拓展当前页面展示」驱动）：`index.html` 新增 `#settings-view` + `#open-settings`/`#settings-back`，同文档显隐切换（**不重建 DOM**，`view-switch.ts` 捕获/恢复 `#log.scrollTop` 与 `#input` 草稿，聊天消息/滚动/草稿全保留）；**不再把 `openOptionsPage()` 作为设置入口**（侧栏/`view-model.ts` 零调用路径，页面内计数归零 + target 数不变双重佐证）；设置逻辑抽共享模块 `src/ui/settings/`（`view.ts` 纯映射 + `ops.ts` 既有消息通道/ key-store，依赖注入、node 可测 + `panel.ts` 面板渲染 + `diagnostics.ts` 迁入共用 + `styles.ts` 共享样式），options 兜底页改为静态薄壳**复用同一逻辑**（功能不退化，静态 DOM 零回归）；覆盖 LLM 配置（含测试连接/清除）/按站点自动授权（当前 origin 读写 + 列表）/标签页管理/会话分组/环境自检/合规与迁移（折叠），窄屏纵向堆叠无横向滚动；顺带修复 TASK-032 探针推送覆盖「已授权」回执（`chat-state.ts` 仅在失效 false→true 跃迁提示；binding #4b/#4c FAIL→PASS）。门禁：新增 `test/settings.test.ts`（15）+ `test/sidepanel.test.ts` 失效跃迁断言、插件 373→**389**、`tsc` 0 error、`test:ui` 121→**136**（#33a~#33o，既有断言零删除）、`test:binding` 114→**125**（#33B1~#33B11，保留既有）、`test:hardening` **24**、`test:e2e` **A/B PASS**、全仓 build/test **0 fail**（base **483 零回归**）；**base 零改动 / manifest 零 diff（`options_page` 保留）/ 无新依赖 / 无新权限 / 无 `<all_urls>` / 无明文 key / 无静默失败**；D-136~D-140；docs dev §3.1.1·§3.2·§4·§11.1 + release §2·§5.2·§7 同步；未 git 提交（由上层统一提交）。 |
| v1.25 | **chrome screenshot 走真实像素 + 修正 chrome help 过时表述**（§32，TASK-034 / D1+D4，Wave 26，用户实测第九轮）：插件侧新增 `src/platform/real-screenshot.ts`（`Proxy` 只覆盖 `env.dom.ops.screenshot`，base 零改动）：已授权 http(s) origin → `chrome.tabs.captureVisibleTab` **真实像素**（element 经 `dom-op` 取 rect + SW `OffscreenCanvas` 裁剪）；未授权/受限/失败 → **回退** base 近似路径并**如实标注**「真实像素（captureVisibleTab）」/「近似（canvas，原因：…）」（绝不谎称真实）；`fullpage` 仍「不支持」（D2 单独一轮）。`src/tools/chrome-host.ts` 在插件层包装 chrome 条目的 `description`/`help`，删除页内时代的「书签…= 不可承载」绝对表述（指向 `tabs`/宿主层能力）。**透传纪律**：`waitFor`/`extractData` 与 base 同引用 → `wait`/`extract`/`export` 不被摘除。**实测**：MV3 SW 下 `captureVisibleTab` 返回 Promise；该 API 需 `activeTab` 或 `<all_urls>`（仅 host 权限不足），插件已声明 `activeTab`（图标手势授予）→ **零新权限 / manifest 零 diff**。门禁：新增 `test/real-screenshot.test.ts`（16）+ browser-tools D4/透传断言、插件 **405 pass/0 fail**、`tsc --noEmit` 0 error、`test:e2e` **PASS**（含真实 PNG + 两条路径标注断言；临时 dist `<all_urls>` 偏差已披露）、`test:ui` **136**、`test:hardening` **24**、`test:binding` **125**、全仓 build/test **0 fail**（base **483 零回归**）；**base 零改动 / manifest 零 diff / 无新依赖 / 无明文 key / 无静默失败**；docs dev §13.7 + compliance §11 同步；未 git 提交（由上层统一提交）。 |
| v1.26 | **整页截图（D2）+ 原生 back/forward（D6）**（§33，TASK-035，Wave 27，用户要求「D2 滚动分屏 captureVisibleTab 拼接（节流/上限/恢复滚动/诚实标注 fixed-sticky 重复）+ D6 原生 tabs.goBack/goForward（失败可读回退并标注路径）」）：同一包装层（`real-screenshot.ts` 透传 `Proxy`）新增覆盖 `historyNav`；因 base 执行器对 fullpage **先行短路**，fullpage 命令与输出/下载策略由 `chrome-host.ts` 接管（复用 base 已导出 `summarizeScreenshotData`/`screenshotFilename`/`translateCapabilityError`）：`ceil(h/vh)` 屏滚动 + `captureVisibleTab` + SW `OffscreenCanvas` 拼接；**遵守 2 次/秒**（500ms 节流 + `[700,1500]ms` 有界退避重试）、**上限**（≤20 屏 / ≤40MP，捕获前可读拒绝 + 已捕获范围）、**始终恢复滚动**（失败如实披露）；成功输出必含 `像素路径：真实像素（captureVisibleTab ×N 屏拼接）` + `FULLPAGE_LIMITATION_NOTICE`（fixed/sticky 每屏重复·懒加载·动画/轮播不一致，**非「完整/无损」**）。D6 优先原生 `chrome.tabs.goBack/goForward`（失败回退页面 `history` 并标注路径；离开绑定 origin 明确说明授权/会话影响）。新增 `test/fullpage-screenshot.test.ts`（20）+ real-screenshot/browser-tools 断言加强；插件 405→**425**、`tsc --noEmit` 0 error、`test:e2e` **PASS**（整页 ≥2 屏拼接 + 尺寸 > 单屏 + 局限可见 + 滚动已恢复；back/forward 原生优先 + 回退标注 + `history.length≥2` 佐证）、`test:ui` **136**、`test:hardening` **24**、`test:binding` **125**、全仓 build/test **0 fail**（base **483 零回归**）；**base 零改动 / manifest 零 diff / 无新依赖 / 无新权限 / 无明文 key / 无静默失败**；D-146~D-150；docs dev §13.8 + compliance §11 同步；**headless `tabs.goBack` 非功能偏差已披露**（原生成功由单测注入覆盖）。 |
