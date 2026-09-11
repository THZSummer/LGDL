# 审查报告：specs-tree-web-cli-plugin（web-cli-plugin，v0.8 · P0 最小可用集）

> **文档定位**: SDDU 审查报告 — 逐项记录自主审查的执行结果，作为 validate 阶段的输入
> **审查策略**: `review.md`（C1~C56 审查清单 + 四维度指引）
> **前置依赖**: `review.md`、`spec.md`（46 FR / 10 NFR / 16 EC / 12 AC）、`plan.md`（12 ADR）、`tasks.md`（16 任务 + §4.5 F-1~F-8）、`build.md`（D-001~D-008）
> **创建人**: SDDU Review Agent
> **创建时间**: 2026-09-11
> **审查轮次**: R1（§1~§6）+ R2 复审（§7）+ R3 全量复审（§8）
> **版本**: v3.0
> **更新人**: SDDU Review Agent
> **更新时间**: 2026-09-12
> **更新说明**: v3.0 = R3 全量复审：核验 P1（TASK-012~015）+ 遗留清账（R-BLK1a/R7/R8/R9/minors/EC/AC/NFR-007）+ P2（TASK-016 发布渠道 + Gate-D 内置助手下线）的闭合真实性，独立复跑全仓门禁 + E2E + 自写 R-BLK1a 复现脚本。**最终结论 ✅ 通过（0 阻塞，可进入 validate）**。R1/R2 记录（§1~§7）保留为历史轮次。
> **R1 范围**: P0 最小可用集 TASK-001~011；独立复跑 build/test/红线 grep/chromium headless 加载 + CDP SW 探针/G-KEY 可达性。
> **R2 范围**: R1 的 2 阻塞 + 6 项高价值改进复验。
> **R3 范围**: P0+P1+P2 全量（16/16 任务）+ R2 §7.4 遗留 10 项 + validate R1 移交 11 项清账；基线 HEAD `d98eaaf`（分支 feature/web-cli-plugin）。

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

## 6. R1 结论（历史轮次，已被 §7 R2 复审取代）

> ⚠️ 本节为 R1 原始结论（当时 2 阻塞未修）。**最终结论见 §7.5：⚠️ 有条件通过（0 阻塞）。**

**结论**: ❌ 不通过（R1）

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

## 7. R2 复审（2026-09-11）

> **复审范围**：核验 R1 的 2 个阻塞 + 6 项声称已修的高价值改进是否真实落地；独立复跑全仓门禁与 G-MV3/G-KEY。
> **复审基线**：HEAD = `4e263d2 fix(web-cli-plugin): 修复 review 阻塞 BLK-1/BLK-2 + 6 项改进`；工作区 clean。
> **方法论**：静态分析（file:line + 测试锚点）+ 独立复跑（不引用 build 声明）+ 残余风险实证。

### 7.1 R1 阻塞复验

#### BLK-1（安全红线：站点自报 `riskHint` 作裁决依据）→ ✅ PASS（核心修复有效）

| 复验点 | 结果 | 证据 |
|--------|:--:|------|
| ① 无 `return decl.riskHint` 类模式 | ✅ | `grep -rnE "return[[:space:]]+[A-Za-z_.]*riskHint" src/` **0 命中**；`riskHint` 仅出现在 `declared-tools.ts:112` 的 presence 判定 `decl.riskHint !== undefined`（不取其值）与 `descriptor.ts` 解析/回显 |
| ② 负向用例（untrusted 站点自报 read 的写工具不得静默 allow） | ✅ | `test/host.test.ts:139-167`：`notes-delete` + `riskHint:'read'` → `effectiveRisk='write'`、`isSafeReadOnlyTool=false`、无确认 dispatch → `ok:false` 且 **RPC 未调用（called=0）**；`host.test.ts:169-199`：显式确认后 `asked=1` 才执行；`host.test.ts:201-213`：白名单按 id 判定，站点 hint 不可升/降 |
| ③ 白名单语义可否被恶意命名绕过 | ⚠️ **可绕过（实测）** | 独立实证（编译产物 `dist-test/src/tools/declared-tools.js`）：`purge-list`→read/allow、`delete-all-list`→read/allow、`wipe-get`→read/allow。即：**恶意站点把破坏性工具命名为 `*-list` 即可在「已授权 untrusted origin」上静默放行** |

**BLK-1 判定：PASS（R1 红线已关闭）**。原缺陷（站点自报 `riskHint` 直接作为门禁裁决依据）已被根除——`effectiveRisk` 完全由插件自决（白名单→read；声明了结构→write/ask；不可分类→undefined/S3 deny），返回值与站点 hint 解耦。`policy.ts:84-99` 的 `input.risk` 经 base `router.ts:543`（`subcommandRisks?.[subcommand] ?? entry.risk`）取自插件重算值，链路闭合。

**残余风险 R-BLK1a（严重度：中；判定：非阻塞，须跟踪）**：id 白名单启发式可被恶意命名绕过（`purge-list`/`delete-all-list`/`wipe-get` 实测归 read）。**不判阻塞的理由**：① R1 自身的修复建议②即「建立插件侧安全工具 id 白名单」，本修复正是该方案；② FR-026 明确「只读/幂等操作可缺省放行」，纯 fail-closed（一律 ask）会与该验收项冲突；③ 站点 RPC 语义本由站点控制，任何基于 id/名称的分类都固有可绕过；④ 触发前提是用户已对恶意 origin 显式授权（S1 仍生效）。**建议（release 前或 P1 处理）**：增加破坏性动词 denylist（`delete/purge/drop/remove/reset/clear/wipe/exec/run/install/uninstall/apply/update/set/create`）覆盖白名单；或在 untrusted origin 上仅对 `*-list/status/read` 等窄集放行、其余一律 ask。已纳入 §7.4 遗留清单。

#### BLK-2（多轮会话 / FR-017）→ ✅ PASS（核心达成）

| 复验点 | 结果 | 证据 |
|--------|:--:|------|
| 多轮上下文真实保持 | ✅ | `chat-runner.ts:36-54`（`session.prefix(turns)` 前缀历史 + run 后 `session.commit(current)`）；`test/chat-session.test.ts:36-56` 断言第二 LLM 调用看到 `['first','reply 1','second']`（user1→assistant1→user2）；`service-worker.ts:194-217` 经 `s.chatSession` 单例 + `finally` 持久化 |
| 历史落 `chrome.storage.session` | ✅ | `service-worker.ts:169-175` `persistChatHistory` → `sessionKv`（`createChromeSessionKv`）；启动恢复 `service-worker.ts:146-153`（EC-013） |
| 导航 / 换 origin 清空 | ✅ | `service-worker.ts:347-360` `onUpdated` → `markNavigated` + `resetChatSession`；`service-worker.ts:287`（discover 换 origin）+ `:337`（action 点击换 origin）→ reset；测试 `chat-session.test.ts:58-74`（EC-011） |
| 裁剪边界 | ✅ | `chat-session.ts:16,46-51` `MAX_SESSION_TURNS=40`，裁剪后首条强制为 `user`（保证 tool 结果有 assistant toolCalls 父消息）；测试 `chat-session.test.ts:25-34` |
| `maxRounds` 传入并生效 | ✅ | `service-worker.ts:197` `maxRounds: settings.maxRounds` → `chat-runner.ts:50` → base `runner.ts:89,123`；测试 `chat-session.test.ts:76-92` |
| 与 ADR-012（单标签绑定）一致 | ✅ | `controller.ts` 单标签 + `markNavigated` 失效；会话随导航清空，无静默续接 |

**BLK-2 判定：PASS**。`AgentRunner` 单次语义未 fork（additive），会话连续性由 background 历史前缀达成，满足 FR-017「多轮对话/会话状态保持」与 EC-011/EC-013。

**残余 R7（非阻塞，R1 已允许）**：任务内用户问答 `askUser` 缝仍未接入（权限 ask 经 `confirm.ts` 已可用）。R1 的 IMP-3 明确给出替代口径「或显式标注『用户问答 ask 归 P1』」，build 已如实标注为 R7/P1。故不构成 BLK-2 未达成。

### 7.2 R1 高价值改进复验（6 项）

| # | 改进项 | 结果 | 证据（file:line + 测试锚点） |
|---|--------|:--:|------|
| 1 | FR-025 发现/声明读取入审计 | ✅ PASS | 新增 `src/security/discovery-audit.ts:15-41`；`service-worker.ts:280`（supported）/`:284`（unsupported）双分支 `audit.recordPlugin(...)`；测试 `test/security.test.ts:149-176`（ok/trust/channel/integrity/tools） |
| 2 | FR-008 转译接线（`unsupported.ts`/`ATTRIBUTION_MAP` 不再死代码） | ✅ PASS | `service-worker.ts:22,82` `capabilityFailure(err, …)` 接入 `invokeSite` 失败路径（可读转译 + 归属）；测试 `test/unsupported.test.ts:11-35`（2 用例）。注：`unsupportedCapability/isAttributed/attributionHelpLines` 仍仅测试引用（次要，非阻塞） |
| 3 | TASK-010 `web-cli-host` 补测 | ✅ PASS | 新增 `packages/lgdl-web/src/web-cli-host/web-cli-host.test.ts`（184 行 / 9 用例：declaration、router 图读、UI op、bridge probe/invoke/写回校验×2/隔离/异常）；lgdl-web 66→**75 pass / 0 fail** |
| 4 | `optional_host_permissions` 实际申请 | ✅ PASS | `manifest.json:17-19` 声明 `https://*/*`；`extension-env.ts:66-101` `originPermissionPattern/requestOriginPermission/hasOriginPermission`；`sidepanel.ts` 授权点击（用户手势，主）+ `service-worker.ts:255`（兜底）；测试 `test/extension-env.test.ts:5-26` |
| 5 | `maxRounds` 传参 | ✅ PASS | `service-worker.ts:197` → `chat-runner.ts:50` → base runner；测试 `test/chat-session.test.ts:76-92`（`onRoundLimit=[1]`） |
| 6 | GATE-011 表述收敛 | ✅ PASS | `build.md:121` 明确「非 LGDL fixture **页面级 CDP** + **node 级**」，并声明「**未**经插件 content-script→background→host→RPC 全链浏览器验证（记为 R8）」，不再冒充全链 PASS；`state.json` GATE-011 同步收敛 |

**改进复验结论：6/6 真实落地，无「声称已修但未生效」**。

### 7.3 R2 独立复跑（本审查实测，不引用 build 声明）

| 门禁 | 命令 | 实测结果 |
|------|------|---------|
| 全仓构建 | `npm run build` | ✅ PASS（插件 dist：background 931KB / content 25.1KB / sidepanel 8.2KB / options 893.9KB） |
| 全仓测试 | `npm test` | ✅ **0 fail**：core 267 / render 94（1 skip）/ router 8 / **lgdl-web 75** / web-cli-cli 84 / op-cli 15 / **base 483** / **plugin 68** |
| 插件类型检查 | `npm run typecheck --workspace @lgdl/web-cli-plugin`（`tsc --noEmit`） | ✅ PASS（0 error） |
| 红线 grep | 独立复跑 | ✅ 0 命中：`return …riskHint` 0；`silentAllow/allowSilently` 0；`.executor(` 直调 0；`src/content` window/globalThis 全局赋值 0；plugin src 无 `@lgdl/lgdl-web`/`lgdl-web-cli`/`op-cli`/`lgdl-core` 私有依赖 |
| base 零改动 | `git status --porcelain packages/web-cli-base` | ✅ 空；`git show --name-only 4e263d2` 未触及 base |
| G-MV3 | `/snap/bin/chromium --headless=new --load-extension=dist` + CDP SW 探针 | ✅ PASS：`service_worker` target 可达（`chrome-extension://mekg…/background.js`）；SW 内 `manifest.name=web-cli plugin`、`mv=3`、`permissions=[activeTab,scripting,storage,sidePanel]`、`optional_host_permissions=["https://*/*"]`、`storage.local` 往返 true、`sidePanel`/`scripting`=object、uncaught=0 |
| G-KEY | SW 内带 Authorization fetch 火山端点 | ✅ PASS（`HTTP 401`，非 CORS/网络失败） |

> 如实记录：G-MV3 首次探针出现一次瞬态 `Uncaught`（SW 未就绪/时序），同一产物重跑干净 PASS；上表为最终复跑结果。
> 未复跑：GATE-011 的「非 LGDL fixture 页面级 CDP」闭环（R2 未重跑该 fixture；其 node 级部分已由 lgdl-web 75 pass 覆盖），全链浏览器验证仍为 R8 遗留。

### 7.4 剩余遗留清单（非阻塞）

| # | 遗留 | 严重度 | 归属 | 说明 |
|---|------|:--:|------|------|
| R-BLK1a | id 白名单可被恶意命名绕过（`purge-list` 等 → read/allow） | 中 | P1 / release 前 | 建议破坏性动词 denylist 覆盖白名单（§7.1） |
| R7 | 任务内 `askUser` 问答缝未接入 | 低 | P1（TASK-013） | R1 IMP-3 已允许显式归 P1；权限 ask 已可用 |
| R8 | 插件 content-script→background→host→RPC 全链浏览器验证未做 | 中 | validate 人工面 H0/H6 | headless 无法构造 activeTab 手势（D-005） |
| R9 | IMP-6 discovery fetch 落 content（vs plan §3.2 background 特权 fetch） | 低 | P1/P2 | 已可读降级，不静默 |
| R9 | IMP-7 `transport.channel` 未动态绑定（P0 仅默认通道） | 低 | P1/P2 | 建议协议文档记录 |
| R9 | IMP-8 「插件 vs 内置助手」双工具面冲突用例缺失 | 低 | P1（过渡期） | 仅插件侧重复注册已测 |
| R9 | IMP-10 `docs/gate-d.md`/`protocol.md` 未产出；`options/index.html:54` 引用不存在的 `docs/protocol.md` | 低 | P1（TASK-014） | 文案指向待修 |
| R9 | IMP-12 FR-037/038 spec P0 与 plan 波3/P2 优先级不一致未在 tasks §4.5 标注 | 低 | P1/P2 | 建议补注降级理由 |
| — | `requestOriginPermission` 双调用（sidepanel + background）：background 无用户手势大概率返回 false，使 OriginStore note 记「未授予」与 sidepanel 提示不一致 | 低 | P1 | 仅注记/文案不一致，门禁以 OriginStore 为准 |
| — | `unsupported.ts` 的 `unsupportedCapability/isAttributed/attributionHelpLines` 仅测试引用 | 低 | P1/P2 | 次要；主转译路径已接线 |

### 7.5 R2 结论

**结论：⚠️ 有条件通过（Conditional Pass）**

| 指标 | 结果 |
|------|------|
| R1 阻塞（BLK-1/BLK-2） | **2/2 已修复**（核心红线关闭；BLK-2 多轮达成） |
| R1 高价值改进 | **6/6 真实落地** |
| R2 新增阻塞 | **0** |
| 独立复跑 | 构建 / 全仓 0 fail / tsc / 红线 grep / base 零改动 / G-MV3 / G-KEY 全 PASS |
| 剩余遗留 | 10 项（1 中安全加固 + 1 中全链验证 + 8 低），均非阻塞 |
| 可进入 validate | **是**（阻塞清零；遗留项由 validate 人工面 / P1 承载） |

**判定理由**：R1 的两条阻塞均已从根因修复并经负向用例与独立复跑验证——BLK-1 的「站点自报 `riskHint` 作裁决依据」红线已根除，BLK-2 的跨消息会话历史已由 `chat-session`/`chat-runner` 落地并覆盖导航清空/裁剪/`maxRounds`。6 项声称已修的改进逐项有 file:line 与测试锚点，无虚报。全仓 0 fail、上游 base 483 零回归、base 零改动、G-MV3/G-KEY 独立复现 PASS。

**未判 ✅ 通过的原因**（按审查标准「改进项 < 5」）：仍有 10 项非阻塞遗留，其中 **R-BLK1a（id 白名单可被恶意命名绕过 → 破坏性工具可静默放行）为安全加固项**，虽不阻塞 validate，但应在面向真实 untrusted 站点发布前处置。故给「有条件通过」而非「通过」，条件即 §7.4 遗留清单（尤其 R-BLK1a 与 R8）。

**遗留条件**：① validate 阶段按 `docs/smoke-checklist.md` 人工面 H0/H6 补全链浏览器验证（R8）；② release 前为 `effectiveRisk` 增加破坏性动词 denylist（R-BLK1a）；③ P1 补齐 `askUser`（R7）与 R9 五项。

## 8. R3 全量复审（2026-09-12，P0+P1+P2）

> **复审范围**：P1 TASK-012~015（协议完善/UI 操作+事件消费/风控+合规迁移调试文档/可选 DOM 工具面）+ 遗留清账轮（R-BLK1a / R7 / R8 / R9-6·7·8·10·12 / minors×2 / EC-008·009·012 / AC-004·007·009·010·011 / NFR-007）+ P2 TASK-016（`docs/release.md` + Gate-D 内置助手下线）。
> **复审基线**：HEAD = `d98eaaf`（分支 `feature/web-cli-plugin`）；P1/P2 变更已由上层提交（`b57bece` P1 / `b53ddfe` 遗留清账 / `762d3a6` P2 / `d98eaaf` 收尾 fix），工作区仅 `.opencode/opencode.json` 无关改动。
> **方法论**：静态分析（file:line + 测试锚点）+ **独立复跑门禁（不引用 build 声明）** + 自写 R-BLK1a 对抗复现脚本。

### 8.1 遗留闭合真实性复验（逐项）

| # | 遗留项 | 结论 | 证据（file:line / 命令 / 测试锚点） |
|---|--------|:--:|------|
| 1 | **R-BLK1a** 破坏性动词绕过 | ✅ **真实闭合** | `src/tools/declared-tools.ts:89`（`DESTRUCTIVE_VERBS`）/`:175`（`hasDestructiveVerb`：逐段+子命令）/`:187-192`（`isSafeReadOnlyTool` 前置 denylist）/`:209-213`（`effectiveRisk` 完全插件自决）。**自写复现脚本**（`dist-test/src/tools/declared-tools.js`）：validate 原 5 例 `purge-list`/`delete-all-list`/`wipe-get`/`drop-show`/`reset-status` 在站点自报 `riskHint:'read'` 下**全部 `≠read`**（无结构→`undefined`/S3 deny，有结构→`write`/ask），合法读工具 `notes-list`/`notes-status`/`foo.show` 仍 `read`。测试锚点 `test/host.test.ts:267-345`（4 用例：分类、executor 未调用 `called=0`、显式确认 `asked=1`、读工具不误伤）。 |
| 2 | **R7** 任务内 `askUser` | ✅ **真实接线（非桩）** | `src/background/ask-bridge.ts:37-71`（deliver/settle/timeout，失败/超时→`canceled` fail-closed）；`src/background/host.ts:84` 注册 base `createAskUserToolEntry({askUser})`；`src/background/service-worker.ts:111,124`（`askBridge.askUser` 注入 host）/`:393-403`（`ask-user-response` → `settle`）；`src/ui/sidepanel/chat-state.ts:144`（`resolveAsk`）+ `sidepanel.ts:292`（`ask-user-request` UI）。测试 `test/ask-bridge.test.ts`（4）+ `test/host.test.ts:347+`（2）+ `test/sidepanel.test.ts`（1）。 |
| 3 | **R9-6** discovery fetch 落点 | ✅ **已决策并落实** | D-021：选 content script 页面源 fetch（无 host 权限即可发现）；`src/content/content-script.ts:9-16` 头部记录理由；`docs/protocol.md §2`「消费端落点（R9-6 / D-021）」明示；失败经 `transient`/`absent`/`invalid` 可读降级（不静默）。 |
| 4 | **R9-7** `transport.channel` 动态绑定 | ✅ **真实生效** | `src/content/page-bridge.ts:157`（接口）/`:279-283`（`bindTransport` 改写 `channel`/`invokeType`/`resultType` 闭包变量）；`src/content/content-script.ts:75-77` 发现成功后 `bridge.bindTransport(result.descriptor.transport)`；`src/protocol/rpc.ts` `parseResult` 支持声明 `resultType`。测试 `test/content.test.ts:52-68`（绑定后 invoke 用 `custom:invoke`/`custom`，结果按新通道解析）+ `test/protocol.test.ts:142`。 |
| 5 | **R9-8 / EC-012** 双工具面冲突 | ✅ **合理改写（非失效）** | `ai/*` 已删除，原「助手 vs 插件」双面前提消失；`packages/lgdl-web/src/web-cli-host/web-cli-host.test.ts:237-276`（D-031）1:1 改写为「下线后单工具面不变量」：领域工具各注册一次 / 页面侧无 `site.*` 命名空间 / 单次 dispatch 只执行一次（`sourceReads===1`）。计数 12→12，非删除非降级；改写理由写在测试头部注释。 |
| 6 | **R9-10** 文档引用一致性 | ✅ **闭合并回归** | `docs/{protocol,gate-d,migration,dev}.md` 均存在；`src/ui/options/index.html:52-55` 指向 `docs/compliance.md`/`protocol.md`/`migration.md`（原悬空的 `docs/protocol.md` 已消解）；`test/docs.test.ts:16-38`（3 用例：文件存在 + options 引用无悬空 + smoke/matrix 交叉引用）。 |
| 7 | **R9-12** FR-037/038 优先级 | ✅ **仅注释/归属，未削弱需求** | `git show b53ddfe -- spec.md`：v1.1→v1.2 仅改版本行 + FR-037/038 优先级列补注 + §5.8 归属说明段 + 修订记录；FR 描述与验收标准**零变更**。 |
| 8 | **minors** `requestOriginPermission` 双调用文案 | ✅ **收敛（D-022）** | `sidepanel.ts:221-222`（用户手势内申请 + 上报 `hostPermissionGranted`）；`service-worker.ts:274-275`（读上报值，缺省回退 `hasOriginPermission`，不再重复申请）；revoke 时 `removeOriginPermission`（`:288-299`）+ `permissions.onRemoved` 审计（`:428`）。 |
| 9 | **minors** 死代码清理 | ✅ **闭合** | `host.activeOrigin` 接入 `descriptor-show`（`service-worker.ts:141`）；`controller.clear` 接入 `chrome.tabs.onRemoved`（`:480-484`）；`unsupported.ts` 移除测试专属 re-export（现仅 `capabilityFailure`，`:22`）；独立「零/单引用导出」扫描（200 个导出）**0 命中**。 |
| 10 | **minors** smoke-checklist 同步 | ✅ | `docs/smoke-checklist.md` 新增 M18~M23（风控/事件桥/dom-agent/ask-user/动态通道/denylist）与 H8~H10。 |
| 11 | **EC-008** 权限撤销流 | ✅ | `removeOriginPermission`（`extension-env.ts:111`）+ `service-worker.ts:288-299` revoke + `permissions.onRemoved` 审计；`test/extension-env.test.ts:34-55`「revoke → 移除 → false → 重新申请」。 |
| 12 | **EC-009** 逐厂商 CORS | ✅ | `docs/compliance.md §7` 8 厂商逐项直连结论（SW 扩展源不受页面 CORS；volc 3 端点同 host，G-KEY 401 实测）；`test/llm.test.ts:72-80` 断言 8 厂商端点 host 均被 manifest `host_permissions` 覆盖。 |
| 13 | **AC-004 / 007 / 009 / 010 / 011** | ✅ **可达部分补齐** | AC-004：ask 三路（权限确认 + 任务内 ask-user）齐备、事件桥/矩阵更新；AC-007：EC-009 逐厂商结论 + 独立配置 + `test/llm.test.ts` key-store 隔离（无 `lgdl-ai-settings`/`localStorage`）+ `docs/migration.md`；AC-009/010：E2E 场景 A/B（见 §8.5）；AC-011：`docs/dev.md` + `docs.test.ts`。 |
| 14 | **NFR-007** 量化 | ✅ **已定义阈值并实测** | `test/perf-budget.test.ts`（4 用例：预算常量 / 500 turn→40 快照 / 50 派发 <250ms 实测 ~0.9ms·call / dist content ≤64KB）；`docs/dev.md §8`。 |
| 15 | **R8** 全链浏览器验证 | ✅ **机制全链已自动化固化**（带唯一偏差，明示） | `test/e2e/fullchain.mjs` + `npm run test:e2e`；加载**真实 dist 字节**，CDP headless 打通 content→background→host→RPC，场景 A（非 LGDL fixture，AC-010）+ B（LGDL Workbench 真实 dist，AC-009）**均 PASS**；唯一偏差 = manifest 副本 `host_permissions` 追加本地 origin（headless 无法构造 `permissions.request` 手势），**未冒充无偏差全链 PASS**。剩余手势/权限弹窗人工面 H0/H2/H4/H6/H8/H9/H10 归 validate。 |

**小结**：上述 15 项遗留**逐项真实闭合**，无「声称已修但未生效」。其中 R-BLK1a 经**自写脚本独立复现**确认（非引用 build 测试）。

### 8.2 P2 内置助手下线正确性核验

| 核验点 | 结论 | 证据 |
|--------|:--:|------|
| `lgdl-web/src/ai/` 完全移除 | ✅ | `test ! -d packages/lgdl-web/src/ai` 通过；`git show 762d3a6` 删除 8 文件（AiPanel/AskDialog/SettingsPanel/prompts/provider/session + provider.test/session.test）。 |
| **无残留引用（活代码）** | ✅ | 全仓 grep `AiPanel\|SettingsPanel\|createAiSession\|src/ai/`：活代码 0 命中；**唯一命中为历史/文档注释**——`web-cli-base/src/{runner,sleep}.ts`（红线文件，不许改，D-034）、`lgdl-web-cli/src/{help,protocol}.ts`（旧路径溯源注释）、`lgdl-web/src/fallback-flag.ts` 与 `plugin/docs/*`（下线说明）。无 `import ... from './ai/*'` 类活引用。 |
| App.tsx 摘除干净 + **保留 web-cli-host + base 机制层** | ✅ | `src/App.tsx:17-19` 仍 import `createWebCliHostRouter`/`startWebCliBridge`/`buildDeclaration`；`:1144-1155` 仍挂载 host + bridge（`onApply: applySource`）；AI 区域改为静态迁移告知（`:1298-1325`）。对象区分 O-001 成立。 |
| `lgdl-web/package.json` test script 同步 | ✅ | `git show 762d3a6^:…package.json` vs `762d3a6:`——test script 已移除 `src/ai/provider.test.ts`/`src/ai/session.test.ts` 及 `dist-test/ai/*.test.js`；`npm test` lgdl-web 31 pass/0 fail。 |
| **Gate-D D-1~D-7 判定诚实** | ✅（WARN 级措辞，见 §8.7） | `docs/gate-d.md §2`：D-3 明写「**PASS（自动化面）/ ⏳ 人工面 H6 待执行（已文档化非阻塞）**」，**未记为整体 PASS**；build §12.1/§12.8 同步披露。 |
| **回退预案成立** | ✅ | `VITE_AI_ASSISTANT_FALLBACK` 默认 off（`fallback-flag.ts:12` + `vite-env.d.ts`，仅 `'on'` 启用）；无 `.env*` 设值（grep 空）；主回退 = 单提交 `git revert`（`migration.md §5.4`）；终止时点 C-4 明示（`migration.md §5.3`，状态 ⏳ 待执行）。语义边界（flag 不恢复旧面板）如实标注。 |
| **不静默告知（EC-016）** | ✅ | `App.tsx:1299-1316` 静态迁移告知卡（安装步骤 + 插件构建 + 授权 + 迁移/回退文档指引），`.ai-migrated-*` 样式（`app.css:330-378`）；无 `AiPanel` 时不留空白。 |
| **测试删除授权范围** | ✅ | lgdl-web 78→31（-47）**仅** `ai/provider.test.ts`（21）+ `ai/session.test.ts`（26）；其余 `locate.test.ts 11` / `snap.test.ts 8` / `web-cli-host.test.ts 12`（EC-012 用例 1:1 改写，计数不变）。独立复跑 lgdl-web = **31 pass / 0 fail**，全仓其余包计数不变（base **483** 零回归）。 |
| ROADMAP 登记 | ✅ | `ROADMAP.md` v1.14.0 §v1.8 行 + 版本总览 + 里程碑「P1/P2 全量实现 + TASK-016 下线执行」。 |

### 8.3 P1 任务（TASK-012~015）验收核验

| 任务 | 验收要点 | 结论 | 证据 |
|------|---------|:--:|------|
| TASK-012 | 版本协商可读+入审计；`docs/protocol.md` 零 LGDL；失败降级 ≥3 | ✅ | `protocol/version.ts` accept/degrade/reject/非法四态 `notice`；`discovery.ts` `failure.kind` 四类；`docs/protocol.md`（191 行，含 schema/RPC/发现/信任/版本/事件/标准化预留）；`! grep -rniE lgdl docs/protocol.md` **0 命中**；`test/protocol.test.ts` +7。 |
| TASK-013 | UI 操作经门禁（FR-019）；事件消费（FR-021）；预算口径 | ✅ | `web-cli-host/bridge.ts`（UI op 经同一 router/registry，未注册可读拒绝 + `web-cli:event` 事件通道）；`content/page-bridge.ts`（`events.{subscribe,pull,unsubscribe,status}` + `capEventData` 预算截断+可读 note）；`test/content.test.ts` +4、`web-cli-host.test.ts:212-235`。 |
| TASK-014 | 风控令牌桶可配+暂停/中止；知情同意；compliance/migration/dev/gate-d 文档 | ✅ | `security/policy.ts:127-260` `createRiskGuard`（per-origin 令牌桶 + pause/resume/stop/reset + 可读 reason）；`host.ts:116-127` `site.*` 前置 `riskGuard.check`；4 份文档实质齐备（`gate-d.md` 含 D-1~D-7 + 验收记录 + EC-016 处置）；`test/security.test.ts` +2、`host.test.ts` +1、`sidepanel.test.ts` +1。 |
| TASK-015（可选） | dom-agent 远程代理；默认关/不可达可读 | ✅ | `content/dom-agent.ts`（`createRemoteDomOps` 惰性代理 + `domUnreachable` 可读转译 + `createDomAgent(transport?)` 默认 `undefined`）；`extension-env.ts` `assembleExtensionDom`（未注入→`enabled:false`+reason）；`test/dom-agent.test.ts` ×6；无 `window` 全局污染。 |

`docs/{release,migration,dev,gate-d,compliance,capability-matrix,smoke-checklist}.md` 均为**实质内容**（非空壳，各 69~191 行，见 §8.6 文档引用）。

### 8.4 R3 独立复跑（本审查实测，不引用 build 声明）

| 门禁 | 命令 | 实测结果 |
|------|------|---------|
| 全仓构建 | `npm run build` | ✅ 退出码 0；插件 dist：background 946.6kb / content 34.1kb / sidepanel 15.1kb / options 893.9kb + manifest/html |
| 全仓测试 | `npm test` | ✅ **0 fail**：core 267 / render 94(+1 skip) / router 8 / **lgdl-web 31** / web-cli 84 / op-cli 15 / **base 483** / **plugin 112**（= 执行 build 声明一致） |
| 插件类型检查 | `npm run typecheck --workspace @lgdl/web-cli-plugin` | ✅ PASS（`tsc --noEmit` 0 error） |
| 插件 E2E | `npm run test:e2e --workspace @lgdl/web-cli-plugin` | ✅ **PASS**（默认 `.pw-browsers/chromium-1234`：场景 A 7 断言 + 场景 B 4 断言，全 ✔；真实 dist 字节；唯一偏差 host_permissions 已披露） |
| R-BLK1a 复现 | 自写脚本 `/tmp/rblk1a-repro.mjs`（编译产物 `dist-test/src/tools/declared-tools.js`） | ✅ 5 例全 `≠read`；合法读工具仍 `read`（见 §8.1-1） |
| 红线 grep（10 项） | 独立复跑 | ✅ 0 命中：插件 src 无 LGDL 私有依赖；`silentAllow/allowSilently` 0；`.executor(` 直调 0；content `(window\|globalThis).*= ` 0；`lgdl-ai-settings` 0；`src/llm` `localStorage` 0；空 catch 0；`return …riskHint` 0；运行时依赖仅 `{"@lgdl/web-cli-base":"^0.7.0"}` |
| 零引用导出 | 独立扫描（200 导出） | ✅ 0/1 引用项 0 |
| base 零改动 | `git status --porcelain packages/web-cli-base` + `git log merge-base..HEAD -- packages/web-cli-base` | ✅ 工作区空 + 分支上**零 base 提交**；base 483 零回归 |

> 如实记录：`npm run test:e2e` 使用脚本默认的仓库内 Playwright Chromium（`.pw-browsers/chromium-1234/chrome-linux64/chrome`）**PASS**；以系统 `/snap/bin/chromium`（`CHROME_BIN`）复跑时**未能暴露扩展 service worker target**（snap 沙箱限制），非业务失败。脚本支持 `CHROME_BIN` 覆盖（见 §8.7-W3）。

### 8.5 R8 固化质量（`test/e2e/fullchain.mjs`）

- **确为真实 dist**：`cp(dist, EXT_DIR)` 后仅改 manifest 副本的 `host_permissions`；注释/输出均声明「dist 的 JS 字节与发布产物一致」（`:15-23, :387-395`）。
- **偏差被明示**，非冒充无偏差：头部 SINGLE DOCUMENTED DEVIATION + `docs/dev.md §7.4` + `build.md §11.4` 三处一致声明「不得表述为无偏差真实产物全链 PASS」。
- **npm script 可用**：`package.json.test:e2e = node test/e2e/fullchain.mjs`；退出码 0/1 语义清晰。
- **场景真实性**：A 走「发现→授权→mock LLM 工具调用→host 门禁→postMessage RPC→页面执行→确认门禁→回填→第二次读观察持久化→审计」；B 加载 `packages/lgdl-web/dist` 真实构建，运行时握手发现 `site.lgdl-web-cli` → 图读 → 审计。均为断言（非日志）。

### 8.6 spec/plan/tasks 漂移核验

| 对象 | 本轮变更 | 判定 |
|------|---------|:--:|
| `spec.md` | v1.1→v1.2（`b53ddfe`）：仅版本行 + FR-037/038 优先级补注 + §5.8 归属说明 + 修订记录；**FR 描述/验收标准零变更** | ✅ 未削弱既有需求（R9-12 的显式要求） |
| `plan.md` | 自初始 `c699220` 后**零改动** | ✅ |
| `tasks.json` | 自初始 `bee1ec1` 后**零改动** | ✅ |
| `tasks.md` | `762d3a6` 仅加 1 行 TASK-016「状态 ✅ completed」 | ✅ 登记性改动 |
| `docs/protocol.md` | `! grep -rniE lgdl` **0 命中**（站点中立） | ✅ |
| 唯一署名提示 | `spec.md` v1.2 由 **Build Agent** 署名（规范文件改动） | ⚠️ 见 §8.7-W4 |

### 8.7 R3 新增/残余改进项（均非阻塞）

| # | 项 | 严重度 | 建议 |
|---|----|:--:|------|
| W1 | `test/perf-budget.test.ts:6` 注释引用 `docs/dev.md §9`，实际性能章节为 **§8**（§9 为变更记录） | 低 | 改为 §8 |
| W2 | `docs/gate-d.md §2` 判定语「D-1~D-7 达标」与 D-3 行「PASS（自动化面）/⏳ H6」并存；§1 规则「全部 PASS 方可下线」口径宜明确「除已文档化人工项外」 | 低 | 收窄措辞，避免「达标」读作全 PASS |
| W3 | E2E 默认依赖仓库内 `.pw-browsers` 缓存；系统 chromium（snap）不可用；`CHROME_BIN` 覆盖可用但未文档化 | 低 | 在 `docs/dev.md §7.4` 记录 `CHROME_BIN` 与浏览器获取方式 |
| W4 | `spec.md` v1.2 由 Build Agent 署名（规范变更本应由 spec 阶段/作者确认） | 低 | 规范修订记录补作者确认（或将补注迁至 plan/build） |

**非阻塞遗留（validate / 后续里程碑承载，非代码缺陷）**：
- R8 人工面：真实浏览器手势/权限弹窗/真实 LLM/LGDL 真实页交互 UX —— H0/H2/H4/H6/H7/H8/H9/H10（已文档化）。
- C-4/C-5 过渡期关闭（移除 flag + 文档/CSS 归档）。
- 商店发布（S-016，`docs/release.md` 已定义渠道，本版不承诺时间表）。
- 扩展 SW 真实内存采样（人工面）。

### 8.8 R3 结论

**结论：✅ 通过（0 阻塞，可进入 validate）**

| 指标 | 结果 |
|------|------|
| R2 §7.4 遗留（10 项） | **全部闭合**（R-BLK1a 由自写脚本独立复现确认） |
| validate R1 移交（11 项） | **全部闭合或可达部分补齐**（R7/R8/R9/minors/EC/AC/NFR-007） |
| P1（TASK-012~015）验收 | **逐条核验通过**（协议/UI+事件/风控+文档/DOM 工具面） |
| P2（TASK-016） | **下线正确**：`ai/*` 移除 + 无活引用 + App.tsx 保留 web-cli-host/base + test script 同步 + 回退预案 + EC-016 不静默 + Gate-D D-3 诚实标注 |
| 新增阻塞 | **0** |
| 新增改进项 | **4**（W1~W4，均低，< 5 门槛） |
| 规范符合率 | **100%**（46 FR/10 NFR/16 EC/12 AC 均有证据或显式归属） |
| 独立复跑 | build / test（全仓 0 fail，base 483 零回归）/ tsc / E2E A·B / 红线 grep 10 项 / base 零改动 —— **全 PASS** |
| 可进入 validate | **是** |

**判定理由**：R2/validate 移交的全部非阻塞遗留已逐项**真实闭合**（非声称），其中曾是唯一中危安全项的 **R-BLK1a 经自写脚本独立复现**确认——站点自报 `riskHint:'read'` + 破坏性命名（`purge-list` 等 5 例）**不再 read→allow**，合法读工具零误伤；R7 `askUser` 为真实接线（非桩）；R9-7 动态通道真实绑定；R8 已从「无法执行」升级为**真实 dist 全链自动化 E2E（唯一偏差明示）**。P2 内置助手下线严格按「先回退预案→后下线」执行，对象区分（下线助手层 / 保留 base 机制层 + `web-cli-host`）成立，测试删除严格限于 `src/ai/*`（-47），其余零删除零降级，Gate-D D-3 人工面 H6 如实标注为待执行而非 PASS。全仓独立复跑 0 fail、base 零回归、红线全 0。

**遗留条件（validate 阶段）**：① 执行 `docs/smoke-checklist.md §2` 人工面 H0/H2/H4/H6/H7/H8/H9/H10（真实浏览器手势/权限弹窗/真实 LLM/LGDL 真实页/风控与事件 UI）；② 后续里程碑 C-4/C-5 过渡期关闭与 S-016 商店发布。上述均属 validate/未来里程碑，不阻塞进入 validate。

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v3.0 | R3 全量复审：P1（TASK-012~015）+ 遗留清账（R-BLK1a/R7/R8/R9/minors/EC/AC/NFR-007）+ P2（TASK-016）逐项核验；独立复跑全仓 build/test/tsc/E2E/红线 grep + 自写 R-BLK1a 复现脚本；**最终结论 ✅ 通过（0 阻塞，可进入 validate）** | 2026-09-12 | SDDU Review Agent |
| v2.0 | R2 复审：BLK-1/BLK-2 复验 PASS + 6 项改进 6/6 落地 + 独立复跑（全仓 0 fail / tsc / 红线 grep / base 零改动 / G-MV3 / G-KEY）+ 残余 R-BLK1a 实证；**最终结论 ⚠️ 有条件通过（0 阻塞，可进入 validate）** | 2026-09-11 | SDDU Review Agent |
| v1.0 | 初始创建：P0 审查报告（C1~C56 逐项结果；独立复跑 build/test/typecheck/红线 grep/headless+CDP/G-KEY；2 阻塞 + 12 改进） | 2026-09-11 | SDDU Review Agent |
