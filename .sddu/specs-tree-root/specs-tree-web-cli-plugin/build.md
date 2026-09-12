# 构建报告：specs-tree-web-cli-plugin（web-cli-plugin，v0.8）

> **文档定位**: SDDU 构建报告 — 记录全部任务的文件变更和实现结果，作为 review 阶段的输入
> **前置依赖**: tasks.md v1.0（16 任务 / 9 波次）、plan.md v1.0（12 ADR + §6 文件影响）、spec.md v1.1（46 FR / 10 NFR / 16 EC / 12 AC）
> **创建人**: SDDU Build Agent
> **创建时间**: 2026-09-11
> **版本**: v1.2
> **更新人**: SDDU Build Agent
> **更新时间**: 2026-09-12
> **更新说明**: v1.2 = P1 实施轮（TASK-012~015）：协议版本协商可读化 + 入审计（EC-014）、`docs/protocol.md` 站点中立文档（FR-015）、发现失败四类可读降级（FR-014/EC-001）；UI 操作经门禁 RPC（FR-019）+ 事件桥（FR-021）；风控令牌桶 + 暂停/中止（FR-029/EC-010）+ 知情同意（FR-031）+ 不适用清单（FR-032）+ 迁移/调试/Gate-D 文档（FR-036/037/039/040/044/045）；可选通用 DOM 工具面（TASK-015）。web-cli-base 零改动红线保持；未 git 提交。

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
