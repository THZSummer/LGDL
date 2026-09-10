# 审查报告：specs-tree-web-cli-plugin（web-cli-plugin，v0.8 · P0 最小可用集）

> **文档定位**: SDDU 审查报告 — 逐项记录自主审查的执行结果，作为 validate 阶段的输入
> **审查策略**: `review.md`（C1~C56 审查清单 + 四维度指引）
> **前置依赖**: `review.md`、`spec.md`（46 FR / 10 NFR / 16 EC / 12 AC）、`plan.md`（12 ADR）、`tasks.md`（16 任务 + §4.5 F-1~F-8）、`build.md`（D-001~D-008）
> **创建人**: SDDU Review Agent
> **创建时间**: 2026-09-11
> **审查轮次**: R1
> **版本**: v1.0
> **更新人**: SDDU Review Agent
> **更新时间**: 2026-09-11
> **更新说明**: 初始创建。审查范围 = P0 最小可用集 TASK-001~011；独立复跑 build/test/红线 grep/chromium headless 加载 + CDP SW 探针/G-KEY 可达性。P1/P2（TASK-012~016）不在本轮。

## 1. 审查概要

| 维度 | 数值 |
|------|:--:|
| 审查项总数 | 56 |
| 通过 | 37 |
| 警告 | 16 |
| 失败 | 3 |
| 阻塞问题 | 2（BLK-1 覆盖 C28+C36；BLK-2 覆盖 C20） |

**独立复跑结果（本审查实测，非引用 build 声明）**：

| 门禁 | 命令 | 实测结果 |
|------|------|---------|
| 插件构建 | `npm run build --workspace @lgdl/web-cli-plugin` | PASS（background.js 923KB / content.js 25.1KB / sidepanel.js 7.3KB / options.js 894KB + manifest/html 拷贝） |
| 插件测试 | `npm run test --workspace @lgdl/web-cli-plugin` | PASS（**54 pass / 0 fail**） |
| 插件类型检查 | `npm run typecheck --workspace @lgdl/web-cli-plugin` | PASS（`tsc --noEmit` 0 error） |
| 上游 base 零回归 | `npm run test --workspace @lgdl/web-cli-base` | PASS（**483 pass / 0 fail**） |
| lgdl-web 零回归 | `npm run test --workspace @lgdl/lgdl-web` | PASS（**66 pass / 0 fail**） |
| G-MV3 | `chromium --headless=new --load-extension=dist` + CDP | PASS（`service_worker` target `chrome-extension://mekg…/background.js`；SW 内 manifest.name=`web-cli plugin`、mv=3、permissions=`[activeTab,scripting,storage,sidePanel]`、storage 往返=true、sidePanel/scripting=object） |
| G-KEY | SW 内带 Authorization fetch 火山端点 | PASS（`HTTP 401`，非 CORS/网络失败） |
| 红线 grep（10 项） | 独立复跑 | 见 C7/C11/C36/C49；均 0 命中（唯一口径修正见 D-001） |
| base 零改动 | `git status --porcelain packages/web-cli-base` | 空（未改动） |

> 说明：HEAD = `2dfe405 feat(web-cli-plugin): P0 最小可用集实施…`；工作区 clean。提交仅触及 `packages/web-cli-plugin/**` 与 `packages/lgdl-web/**`，其余包（含 base）零改动，故其测试计数结构性守恒。

## 2. 逐项审查结果（C1~C56）

### 2.1 代码质量（CQ）

| # | 审查对象 | 审查基准 | 评估 | 发现 | 严重程度 |
|---|---------|---------|:--:|------|:--:|
| C1 | 模块职责单一 / 命名可读 | §5.1 | ✅ | 模块边界清晰（protocol/discovery/security/tools/background/content/llm/platform/ui）；命名与 plan 一致 | — |
| C2 | 错误处理（无空 catch / 可读失败） | NFR-001、FR-008 | ✅ | grep 空 catch 0 命中；discovery/rpc/confirm 失败均有中文可读文案（如 `RpcTimeoutError`） | — |
| C3 | 常量集中 | §5.1 | ✅ | `WEB_CLI_PROTOCOL_VERSION`/`DEFAULT_INVOKE_TIMEOUT_MS`/`HANDSHAKE_TIMEOUT_MS`/`DEFAULT_AUDIT_CAPACITY`/`PLUGIN_RISK_DEFAULTS` 集中定义 | — |
| C4 | 无死代码 / 冗余 | §5.1 | ⚠️ | `platform/unsupported.ts` 全模块无引用；`extensionEnv()`/`chromeFetch()`/`createChromeSyncKv()` 无引用；`controller.clear()`/`host.activeOrigin()` 无调用；`options` 的 `maxRounds` 读取后未传入 runner（见 IMP-1/IMP-5） | 中 |

### 2.2 规范符合性（SPEC）

| # | 审查对象 | 审查基准 | 评估 | 发现（证据 file:line） | 严重程度 |
|---|---------|---------|:--:|------|:--:|
| C5 | 上游基线 v0.7.0 | FR-001 | ✅ | `packages/web-cli-plugin/package.json:14` `@lgdl/web-cli-base ^0.7.0`；本地 `packages/web-cli-base/package.json` version=0.7.0 | — |
| C6 | additive 复用 / 零分叉 | FR-002、NFR-005 | ✅ | `security/redact.ts:8-19` re-export base `sensitive`；无 base 源码副本；base 483 pass | — |
| C7 | 独立包 / 零 LGDL 私有依赖 | FR-003、NFR-009 | ✅ | grep `@lgdl/lgdl-web|lgdl-web-cli|op-cli|lgdl-core` 于 `packages/web-cli-plugin/src` 0 命中 | — |
| C8 | 对象区分 + 双份工具面冲突检测 | FR-004、EC-012 | ⚠️ | 对象区分经作者核签（spec §9.4）；`test/e2e.generality.test.ts:136-156` 仅验证插件侧重复注册被拒，**未覆盖「插件 vs 内置助手」双执行/双注册**（见 IMP-8） | 中 |
| C9 | 插件载体可加载运行 | FR-005 | ✅ | 复跑 headless load PASS；`dist/` 含 manifest + 三面入口 | — |
| C10 | 权限最小化 + 运行时授权 | FR-006、NFR-002 | ⚠️ | `manifest.json:11-19` permissions 最小（无 tabs）、`optional_host_permissions` 存在；但全 src **无 `chrome.permissions.request`**，`extension-env.ts:122` 仅 `contains({permissions})`（不查 origins）——「运行时按 origin 申请站点访问」未落地（见 IMP-4） | 中 |
| C11 | content script 隔离无侵入 | FR-007 | ✅ | grep `(window\|globalThis).X=` 于 `src/content` 0 命中；`test/content.test.ts:77-82` 负向断言；isolated world | — |
| C12 | CSP/跨域不可达如实转译 | FR-008、EC-007 | ⚠️ | `platform/unsupported.ts` 实现统一转译但**未被任何模块 import**，`ATTRIBUTION_MAP` 未接入运行路径；discovery/RPC 失败有可读文案但非经该 helper（见 IMP-1） | 中 |
| C13 | MV3 平台约束最小验证门 | FR-009 | ✅ | 独立复跑 headless + CDP SW 探针 PASS；`spike-mv3-gkey.md` 逐项结论无「未测」 | — |
| C14 | 站点可被发现三态 | FR-010、EC-001 | ✅ | `discovery/discovery.ts:21,171-183` 三态；`test/discovery.test.ts:24-88` | — |
| C15 | 站点可声明工具面最小语义 | FR-011 | ✅ | `protocol/descriptor.ts:20-74`（id/summary/params/subcommands/riskHint/protocolVersion/transport） | — |
| C16 | 默认 untrusted + 完整性/溯源 | FR-012、EC-002 | ✅ | `protocol/trust.ts:30-59`；`test/protocol.test.ts:102-126` | — |
| C17 | 协议版本演进兼容 | FR-013、EC-014 | ✅ | `protocol/version.ts:38-68` accept/degrade/reject；单测覆盖 | — |
| C18 | 发现/声明失败降级（≥3） | FR-014 | ✅ | `discovery.ts` absent/transient/invalid 分支；`test/discovery.test.ts` | — |
| C19 | 最小试点（≥2 站点） | FR-016、AC-003 | ⚠️ | `spike-protocol-pilot.md` 记录 LGDL + 非 LGDL fixture；fixture 为**页面级 CDP**（非经插件全链），LGDL 侧浏览器级注入未做（见 IMP-9） | 中 |
| C20 | 会话/多轮/工具/ask 对齐 | FR-017 | ❌ | `service-worker.ts:153-177` `runChat` 每次消息**新建 runner 且仅传当前 user**，无跨消息会话历史（`singletons` 不保存 turns）；`askUser` 用户问答缝未接入（仅权限确认 ask）——「多轮对话/会话状态保持」未实现（BLK-2） | 阻塞 |
| C21 | LGDL 图内容操作对齐 | FR-018 | ⚠️ | `host-router.ts:37` 注册 `lgdl-web-cli`；RPC 链路代码就绪，但**无浏览器级 E2E**（见 IMP-9） | 中 |
| C22 | 编辑器写回 onApply 替代 | FR-020 | ✅ | `bridge.ts:82-89` `parseLgdl` 校验 + `onApply`；无 React 内部状态直连 | — |
| C23 | 能力对照矩阵 + 最小能力集 | FR-022 | ✅ | `docs/capability-matrix.md` 34 项逐项归属 + 8 项最小能力集 | — |
| C24 | per-origin 显式授权 | FR-023、EC-004 | ✅ | `security/origin-store.ts`；`policy.ts:57-68` S1 未授权 deny；`test/security.test.ts:50-57` | — |
| C25 | 敏感操作二次确认 | FR-024、EC-005 | ✅ | `security/confirm.ts:52-108` 无应答/超时/异常→deny；单测覆盖 | — |
| C26 | 全程可审计 | FR-025、NFR-003 | ⚠️ | 授权变更/确认/裁决/执行/descriptor-show/llm-config 均入审计；但**「站点发现/声明读取」未入审计**——`service-worker.ts:225-238` `discover` handler 无 `audit.recordPlugin`，`descriptor-read` 仅由 `admin-tools.ts:123` 触发（见 IMP-2） | 中 |
| C27 | 只读默认 / 写面确认 | FR-026 | ✅ | `policy.ts:27-34` read→allow / write/external/ui/state→ask / evaluate→deny | — |
| C28 | untrusted + 危险档位强制确认 + fail-closed | FR-027、O-010 | ❌ | `tools/declared-tools.ts:53-55` `effectiveRisk()` **直接返回站点 `riskHint`** 作为裁决依据，未按 plan §2.5 / spike §1.2「riskHint 仅提示、不作裁决依据，插件复核 effectiveRisk」复核；untrusted 站点可自报 `riskHint:'read'` 使危险工具走 read→allow **静默放行**（无二次确认），违反 O-010 / NFR-001（BLK-1） | 阻塞 |
| C29 | 敏感数据脱敏不外泄 | FR-028、EC-015 | ✅ | `security/redact.ts` 复用 base；`audit-sink.ts:72-78` sanitize 抹 `args`；`test/security.test.ts:133-145` 明文负向断言 | — |
| C30 | 站点条款合规评估先行 | FR-030、AC-006 | ✅ | `docs/compliance.md` 试点站点逐项结论 + 不适用清单初版 | — |
| C31 | 插件独立配置 key | FR-033 | ✅ | `llm/key-store.ts`（chrome.storage.local）；不读写 `lgdl-ai-settings`（grep 0） | — |
| C32 | key 安全隔离 | FR-035 | ✅ | key 仅 background 读取（`service-worker.ts:154-163`）；页面脚本不可读 chrome.storage；`maskedConfig` 掩码 | — |
| C33 | 作用于 LGDL Web 页 | FR-041 | ⚠️ | `index.html:8` link + `public/.well-known/web-cli.json` + `declaration.ts` + `bridge.ts` 就绪；浏览器级未实测（见 IMP-9） | 中 |
| C34 | LGDL 功能等价替代 | FR-042 | ⚠️ | 矩阵差异显式说明；**等价性「同输入同结果」无浏览器级断言**，node 面未覆盖 web-cli-host（见 IMP-9/IMP-11） | 中 |
| C35 | 通用性验证 | FR-043、AC-010 | ⚠️ | `test/e2e.generality.test.ts:27-44` 使用**内存 reimplementation**（非真实 `fixtures/site/rpc.js`）；真实 rpc.js 仅页面级 CDP 驱动，插件全链浏览器级未验证（见 IMP-9） | 中 |
| C36 | 安全基线（无旁路/无静默 allow/明文零命中） | NFR-001 | ❌ | 无旁路（`.executor(` 直调 0）、无 `silentAllow`、明文零命中均 PASS；但存在 C28 所述**静默 allow 路径**（站点自报 read）——NFR-001「任何路径不得静默 allow」未满足（BLK-1） | 阻塞 |
| C37 | 权限最小/审计完整/平台兼容 | NFR-002/003/004 | ⚠️ | NFR-002/004 达标；NFR-003 审计完整性缺「发现/声明读取」环节（同 C26） | 中 |
| C38 | 上游零回归 / 独立性 | NFR-005/009 | ✅ | base 483 / lgdl-web 66 复跑 PASS；测试文件零删除（`git show` 确认）；依赖图谱零 LGDL 私有 | — |
| C39 | 可测试性 / 可理解性 | NFR-006/008 | ✅ | 54 单测覆盖机制层；失败/授权/确认文案中文可读 | — |
| C40 | Gate-D 条件清单（spec 标 P0） | FR-037/038 | ⚠️ | `docs/gate-d.md` **未产出**（build §7 R3 归 P1 TASK-014）；spec FR-037/038 优先级为 **P0** 而 plan §5.3 归波3/P2，tasks §4.5 F 列表未标注该优先级不一致；`options/index.html:54` 引用不存在的 `docs/protocol.md`（见 IMP-10/IMP-12） | 中 |

### 2.3 架构一致性（ARCH）

| # | 审查对象 | 审查基准 | 评估 | 发现 | 严重程度 |
|---|---------|---------|:--:|------|:--:|
| C41 | 协议机制（描述符 + 双通道 + RPC） | ADR-001 | ✅ | schema/三通道/RPC 与 plan §2.3 一致；D-003（握手改 content postMessage）已如实记录 | — |
| C42 | MV3 三面职责边界 | ADR-002 | ⚠️ | background=唯一裁决点+key（`host.ts:49-60`/`service-worker.ts:154`）；content 不裁决/不持 key；side panel 不注入页。**偏差**：discovery ①/② fetch 落 content script（页面源）而非 plan §3.2 的 background 特权 fetch（见 IMP-6） | 中 |
| C43 | 权限模型 = 三 PolicyStrategy | ADR-003 | ✅ | `policy.ts:101-116` 三策略 + `denyPriority:true` + `askTimeoutMs` + `onAsk`，经 `host.ts:51-58` 注入上游 `CommandRouter.policy`；未改 `permission.ts`/`router.ts` | — |
| C44 | 桥接 + 对象区分 | ADR-004 | ✅ | `web-cli-host/*` 复用保留机制层；`App.tsx:1177-1189` 挂载；`ai/` 未摘除（归 TASK-016） | — |
| C45 | 存储 = local + session；key 不进页面 | ADR-005 | ✅ | `platform/extension-env.ts:26-57`；`key-store.ts` local；`controller.snapshot` → session | — |
| C46 | 独立包与构建/依赖纪律 | ADR-009 | ✅ | 运行时依赖仅 base；devDep esbuild+@types/chrome（D-006 记录，作者授权）；`build.mjs` ESM/IIFE 分面 | — |
| C47 | 单标签绑定与会话生命周期 | ADR-012 | ✅ | `controller.ts:46-88` 单标签 + `markNavigated` 失效明示；`service-worker.ts:293-304` onUpdated | — |
| C48 | 文件影响面对齐 | plan §6 | ⚠️ | 计划文件未产出：`docs/protocol.md`/`migration.md`/`dev.md`/`gate-d.md`/`release.md`、`content/dom-agent.ts`（均 P1/P2，build §7 如实列出）；无越界新增（除 `unsupported.ts` 属计划内但未接线） | 中 |
| C49 | web-cli-base 零改动红线 | NFR-005 | ✅ | `git status --porcelain packages/web-cli-base` 空；`git show 2dfe405` 仅触及 plugin + lgdl-web | — |
| C50 | plan/tasks 缺陷处理（D/F） | build §6/§7、tasks §4.5 | ⚠️ | D-001~D-008 处理合理且如实（D-005 未做项明示不标 PASS）；F-1~F-8 均有处理；**新发现** FR-037/038 spec P0 与 plan 波3 不一致未在 F 列表标注（见 IMP-12） | 中 |

### 2.4 测试质量（TEST）

| # | 审查对象 | 审查基准 | 评估 | 发现 | 严重程度 |
|---|---------|---------|:--:|------|:--:|
| C51 | 测试文件存在 + 规模 | NFR-006 | ✅ | 8 文件；复跑 54 pass / 0 fail | — |
| C52 | 核心逻辑路径覆盖 | §5.4 | ✅ | protocol/discovery/security/host/llm/content/sidepanel/e2e 均有真实断言 | — |
| C53 | 边界 + 错误场景 | EC-* | ✅ | 超时、非法声明、未授权 deny、untrusted write deny、未知 risk deny、确认桥异常、环形溢出均覆盖 | — |
| C54 | 断言有效性（非空跑/负向） | §5.4 | ✅ | 负向断言：executor 未被调用（`host.test.ts:87-107`）、明文不存在（`security.test.ts:133-139`）、window 无全局（`content.test.ts:77-82`） | — |
| C55 | 上游测试守恒 | tasks §4.1 D-005 | ✅ | base 483 / lgdl-web 66 复跑全绿；`git show` 确认无上游测试文件改动；`ai/*.test.ts` 保留 | — |
| C56 | 新增 LGDL web-cli-host 测试 | TASK-010 验收 | ⚠️ | `packages/lgdl-web/src/web-cli-host/*`（3 文件，L 级）**零测试**；无测试引用该模块（见 IMP-11） | 中 |

## 3. 审查维度汇总

| 审查维度 | 审查项数 | 通过 | 警告 | 失败 | 通过率 |
|---------|:--:|:--:|:--:|:--:|:--:|
| 代码质量 | 4 | 3 | 1 | 0 | 75% |
| 规范符合性 | 36 | 22 | 11 | 3 | 61% |
| 架构一致性 | 10 | 7 | 3 | 0 | 70% |
| 测试质量 | 6 | 5 | 1 | 0 | 83% |
| **合计** | **56** | **37** | **16** | **3** | **66%** |

> **不适用项**：无。所有 Cx 均可静态审查；浏览器级/人工面项以「覆盖边界」形式标注（非跳过）。

## 4. 阻塞问题

| # | 位置 | 问题 | 对应 Cx | 修复建议 |
|---|------|------|:--:|---------|
| BLK-1 | `packages/web-cli-plugin/src/tools/declared-tools.ts:53-55`（`effectiveRisk`）+ `src/security/policy.ts:71-85`（S2） | **安全红线**：`effectiveRisk` 直接采用站点自报 `riskHint` 作为门禁裁决依据，未按 plan §2.5 / spike-protocol-pilot §1.2「riskHint 仅提示、不作裁决依据」复核。untrusted 站点可声明 `riskHint:'read'` 将危险工具伪装为只读 → S2 返回 null → `riskDefaults.read='allow'` → **静默放行、无二次确认**，违反 O-010「危险档位强制确认」与 NFR-001「任何路径不得静默 allow」。 | C28、C36 | 对 `namespace='site'` 且 `trust!=='trusted'` 的声明，**不得以 riskHint 为放行依据**：① 所有非插件白名单内工具一律 `ask`（或 `deny`）；或 ② 建立插件侧「安全工具 id 白名单」（如 `*-list`/`*-status`/`*-read` 且无写子命令）方允许 read→allow，其余默认 ask。修复后补「站点谎报 read 的危险工具必须 ask/deny」负向单测。 |
| BLK-2 | `packages/web-cli-plugin/src/background/service-worker.ts:153-177`（`runChat`） | **FR-017 未达成**：每次 `chat` 消息新建 `createAgentRunner` 且仅传当前 user 文本，`singletons` 不保存会话 turns；跨用户消息**无任何会话历史**，「多轮对话 / 会话状态保持」不成立（side panel 的 entries 仅用于展示，不回灌模型）。`askUser` 用户问答缝亦未接入。 | C20 | 在 `Singletons` 中维护会话 turn 历史（落 `chrome.storage.session` 以兼顾 EC-013），`runChat` 以历史 turns 初始化 runner；接入 `askUser` 缝；补「第二轮消息携带第一轮上下文」的断言。 |

## 5. 改进建议

| # | 位置 | 问题 | 对应 Cx | 建议 |
|---|------|------|:--:|------|
| IMP-1 | `src/platform/unsupported.ts` 全模块 / `src/platform/extension-env.ts:70-131` | 死代码：`unsupported.ts` 无引用，`ATTRIBUTION_MAP`/`translateCapabilityError` 未接入任何失败路径；`extensionEnv()`/`chromeFetch()`/`createChromeSyncKv()` 无引用。FR-008「复用 ATTRIBUTION_MAP 统一转译」未生效。 | C4、C12 | 将 `capabilityFailure()` 接入 RPC 超时/权限拒绝/CSP 失败等路径；删除或接线未使用的 PlatformEnv 工厂；补 ≥1 条不可达转译断言。 |
| IMP-2 | `src/background/service-worker.ts:225-238` | `discover` handler 未记录审计事件；`descriptor-read` 仅 `descriptor-show` 触发，发现/声明读取环节审计缺失。 | C26、C37 | 在 `discover` 成功/失败分支 `audit.recordPlugin({type:'descriptor-read', …})`（含 origin/channel/trust/integrity）。 |
| IMP-3 | `src/background/service-worker.ts:153-177` | 通用用户问答 `askUser` 缝未接入（仅权限 ask 经 confirm 桥）。 | C20 | 接入 `env.askUser` → side panel 问答，或显式标注「用户问答 ask 归 P1」。 |
| IMP-4 | `manifest.json:17-19` + 全 src | `optional_host_permissions` 声明后从未 `chrome.permissions.request`；`extension-env.ts:120-127` 只 `contains({permissions})` 不查 origins。 | C10 | 在用户授权 origin 时同步 `chrome.permissions.request({origins:[origin+'/*']})`，或移除未用声明并说明以 activeTab 达成最小权限。 |
| IMP-5 | `src/background/service-worker.ts:156-174` | options 的 `maxRounds` 被读取但未传入 `createAgentRunner({maxRounds})`，配置无效。 | C4 | 传入 `maxRounds: settings.maxRounds`。 |
| IMP-6 | `src/content/content-script.ts:32-48` | discovery ①/② 由 content script 以页面源 fetch（受站点 CSP/CORS 影响），与 plan §3.2「well-known 由 background 特权 fetch」不一致。 | C42 | 通道①改由 background（host permission）fetch，或更新 plan/spike 明确落点并保留可读降级。 |
| IMP-7 | `src/content/content-script.ts:30` + `page-bridge.ts:40-41` | 描述符 `transport.channel`/`invokeType`/`resultType` 被解析但执行端硬编码 `channel='web-cli'`，未按声明绑定。 | C41 | 依据 descriptor.transport 动态绑定桥通道，或明确「P0 仅默认通道」并在协议文档记录。 |
| IMP-8 | `test/e2e.generality.test.ts:136-156` | 双份工具面冲突检测仅覆盖插件侧重复注册，未覆盖「插件 vs 内置助手」双执行。 | C8 | 增加过渡期用例：同一 LGDL 命令在页内仅执行一次、页面 CommandRouter 单实例。 |
| IMP-9 | `test/e2e.generality.test.ts:27-44` + `spike-protocol-pilot.md §2.3` | 「通用性端到端」为 node 内存 reimplementation + 页面级 CDP，**未经插件 content-script→background→host→RPC 全链浏览器验证**；LGDL 侧同理。 | C19、C21、C33、C34、C35 | validate 阶段按 `docs/smoke-checklist.md` 人工面 H0/H6 补真实浏览器全链；或把 build「GATE-011 通用性 PASS」表述收敛为「页面级 + node 级」。 |
| IMP-10 | `packages/web-cli-plugin/docs/` + `src/ui/options/index.html:54` | `docs/gate-d.md` 未产出（FR-037）；options 引用不存在的 `docs/protocol.md`。 | C40、C48 | P1 TASK-014 补 `gate-d.md`/`protocol.md`；在此之前修正 options 文案指向存在的文档。 |
| IMP-11 | `packages/lgdl-web/src/web-cli-host/{host-router,bridge,declaration}.ts` | TASK-010 新增 L 级模块零测试（bridge 的 `handle` 已留测试缝却未用）。 | C56 | 为 `startWebCliBridge.handle`（probe/invoke/写回校验）与 `buildDeclaration` 补 node 单测（注入 fake window）。 |
| IMP-12 | `spec.md:228-229`（FR-037/038 P0）vs `plan.md:553`（波3/P2） | spec 标 P0、plan 归波3/P2 的优先级不一致，tasks §4.5 F 列表未标注；F-6 仅覆盖 AC-009/FR-019。 | C50 | 在 tasks/plan 补注 FR-037/038 的波次降级理由，或将 Gate-D 条件清单文档纳入 P0 门槛。 |

## 6. 结论

**结论**: ❌ 不通过

| 指标 | 结果 |
|------|------|
| 审查通过率 | 66%（37/56） |
| 阻塞问题数 | 2（BLK-1 覆盖 C28+C36；BLK-2 覆盖 C20） |
| 规范符合性偏差 | 3 项失败（C20/C28/C36）+ 11 项警告 |
| 可进入 validate | 否（修复 BLK-1/BLK-2 后可复审进入） |

**理由**：P0 交付的工程质量整体较高——构建/类型检查/54 新测 + 上游 483/66 零回归均独立复跑通过；红线 grep（无旁路、无静默 allow 字面、无全局污染、零 LGDL 私有依赖、base 零改动）全部 0 命中；G-MV3/G-KEY 门禁独立复现 PASS；build 对 content 注入未做、side panel 人工面等降级项如实标注（未冒充通过），D-001~D-008 决策合理。

但存在 **2 个阻塞问题**：
1. **BLK-1（安全红线）**：`effectiveRisk` 直接采信站点自报 `riskHint`，untrusted 站点可将危险工具伪装为 `read` 触发静默放行，直接违反 O-010 与 NFR-001，且与 plan §2.5、spike §1.2、代码自身注释「advisory only, never the decision basis」自相矛盾。这是 P0「安全基线」柱子的核心承诺，必须修复。
2. **BLK-2（功能）**：跨用户消息无会话历史，FR-017「多轮对话/会话状态保持」未实现。

此外有 16 项警告（12 条改进建议），其中 FR-025 发现环节审计缺失、FR-008 ATTRIBUTION_MAP 未接线、TASK-010 模块零测试为优先修复项。上述修复均为局部改动，不涉及架构返工；修复并补测后可复审。

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建：P0 审查报告（C1~C56 逐项结果；独立复跑 build/test/typecheck/红线 grep/headless+CDP/G-KEY；2 阻塞 + 12 改进） | 2026-09-11 | SDDU Review Agent |
