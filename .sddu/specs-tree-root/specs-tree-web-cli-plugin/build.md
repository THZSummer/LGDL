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

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建：P0 最小可用集 TASK-001~011 构建报告（含门禁结果、红线 grep、D-001~D-008 决策、遗留风险） | 2026-09-11 | SDDU Build Agent |
| v1.1 | R1 审查修复轮：BLK-1（安全红线）/BLK-2（多轮会话）+ 6 高价值改进（FR-025/FR-008/TASK-010/IMP-4/maxRounds/GATE-011 表述）；D-009~D-015；插件 54→68、lgdl-web 66→75；全仓 0 fail | 2026-09-11 | SDDU Build Agent |
| v1.2 | P1 实施轮：TASK-012~015（协议完善/UI 操作+事件桥/风控+文档/可选 DOM 工具面）；D-017~D-020；插件 68→89、lgdl-web 75→77；全仓 0 fail；未 git 提交 | 2026-09-12 | SDDU Build Agent |
