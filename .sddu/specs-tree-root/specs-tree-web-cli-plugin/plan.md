# 技术计划：specs-tree-web-cli-plugin（web-cli-plugin：独立于 LGDL 的浏览器插件——v0.8 主题「浏览器插件孵化」）

> **文档定位**: SDDU 技术方案 — 记录架构设计、方案对比和 ADR，作为 tasks 阶段的输入
> **前置依赖**: spec.md v1.1（46 FR 十组 + 10 NFR + 16 EC + 12 AC，已冻结）+ discovery.md v1.1（20 问题 Q-001~Q-020 / 假设 A-001~A-007 / 风险 R-001~R-008 / 开放点 O-001~O-016 + §7.3 作者裁决记录）+ 作者裁决硬约束（O-001 代码下线 / O-002 通用任意站点优先 / O-003 不预设方案形态但 plan 必须给方案 / O-008 授权模型 / O-009 安全边界 / O-010 协议信任 / O-006↔O-001 对象区分；P1 五项 S-004/S-005/S-007/S-011/S-015 已核签冻结）+ 上游资产事实（`packages/web-cli-base` v0.7.0 已发布稳定基线：CommandRouter/AgentRunner/DelayGate + 九域工具集 + PermissionGate/audit/sensitive + event-bus + `platform.ts` PlatformEnv 缝 + `ext-attribution.ts` ATTRIBUTION_MAP 契约预留；`packages/lgdl-web/src/ai/` 内置助手下线对象；`packages/lgdl-web-cli` / `lgdl-web-op-cli` 领域适配层）
> **创建人**: SDDU Plan Agent
> **创建时间**: 2026-09-11
> **版本**: v1.0
> **更新人**: SDDU Plan Agent
> **更新时间**: 2026-09-11
> **更新说明**: 初始创建——承接 spec §9.7 六项技术开放点（P-01 协议发现/声明格式 / P-02 插件架构 / P-03 权限模型实现 / P-04 与页内 web-cli-base 衔接 / P-05 扩展存储与 key / P-06 无头加载扩展冒烟），逐项给出选型 + 备选对比 + ADR；给出插件工程拓扑（monorepo 内独立包 `packages/web-cli-plugin`）、协议描述符 schema、MV3 三面架构（background 控制面 / content script 数据面 / side panel+options）、per-origin 授权与 PermissionGate 映射、对象区分下的桥接与下线执行/回退设计；46 FR → 模块/文件/波次落位总表（P0 最小可用四根柱子）；12 个 ADR（ACCEPTED 7 / PROPOSED 5）；文件影响面（新增独立包 + LGDL 页桥接暴露点 + 下线面）；风险与缓解；任务切分建议交 sddu-tasks。

## 1. 前置检查
> 启动技术规划前必须验证的前置条件

| 检查项 | 状态 |
|--------|:--:|
| spec.md 存在（`.sddu/specs-tree-root/specs-tree-web-cli-plugin/spec.md` v1.1，46 FR / 10 NFR / 16 EC / 12 AC） | ✅ |
| 外部 API 文档缓存 | ✅ 不适用（本 Feature 零第三方协议 API 引用：① LLM 为 **BYOK 用户自带 key**，厂商端点语义以 `packages/lgdl-web/src/ai/provider.ts` 8 厂商表为基线（无服务端 SDK 契约变更）；② 插件运行时能力 = **浏览器原生扩展 API（MV3）**，非外部服务；③ 协议发现/声明机制为本 Feature 自建，无外部规范可缓存。故无 API 文档缓存前置。） |
| 前置依赖已满足（上游 v0.7.0 发布基线 + 代码位核实） | ✅ |
| 开放点状态（spec §9.2：O-001~O-012/O-015 已裁决或核签；O-013/O-014/O-016 待核签但不阻塞 plan；§9.7 P-01~P-06 归本 plan，本文件全部给出最终决策并落 ADR） | ✅ |

**上游代码事实核实（v0.7.0 已发布稳定基线，本 plan 挂载面）**：

| 资产 | 事实（已核实） | 本 Feature 关系 |
|------|---------------|----------------|
| `packages/web-cli-base` | v0.7.0（npm + tag）；`index.ts` 导出面含 CommandRouter/ToolEntry/PermissionGate/AuditSink/event-bus/sensitive/llm/`PlatformEnv` 缝/`ext-attribution.ts` ATTRIBUTION_MAP | **additive 复用对象**（S-005） |
| `packages/lgdl-web/src/ai/` | `session.ts:262 createAiSession` 单一组装点；`AiPanel.tsx` / `AskDialog.tsx` / `SettingsPanel.tsx` / `provider.ts`（8 厂商 BYOK，key 存 `localStorage`，火山 3 端点 `browserDirect=false`） | **下线对象**（O-001 对象区分） |
| `packages/lgdl-web-cli` / `lgdl-web-op-cli` | v0.7.0；`createLgdlWebCliTool()` / `createOpCliToolEntry(registry)`；领域适配层 | LGDL 站点协议暴露面来源（FR-018/019） |
| `packages/lgdl-web` | private；vite，`base='/LGDL/'`（GH Pages 子路径）；`public/` 仅 `lgdl/`；`App.tsx:17-19` 挂 AiPanel/SettingsPanel/createAiSession | 站点桥接暴露点宿主 + 下线执行面 |
| 扩展工程痕迹 | 全仓 grep `chrome.runtime`/`manifest.json`/`service_worker` = **0 命中**（仅 `ext-attribution.ts` 注释/测试字符串） | 插件运行时为**全新工程领域**（R-002） |
| 无头浏览器先例 | v3/v4 已验证 **chromium headless + CDP + 静态伺服 + 自建 driver**（V13 方法论；`/tmp/opencode/cdp-run.mjs` 非仓库交付） | 扩展冒烟方法论基线（FR-045/P-06） |

> **零扩展痕迹纪律说明**：`web-cli-base` 的 `ext-attribution.test.ts` 含「零扩展工程痕迹」grep 断言（针对 base 包）；本 Feature 在**独立包 `packages/web-cli-plugin`** 内合法引入扩展 API，**不触碰 base 包该断言**（base 仍零扩展痕迹，NFR-005 additive 保持）。

---

## 2. 架构分析
> 分析现有架构影响和需要的新组件

### 2.1 现状基线（挂载面与结构性缺环）

```
现有（v0.7.0，页内消费端形态）：
  packages/web-cli-base/src/        机制层（domain-neutral，零 lgdl/react）
    router.ts        CommandRouter（ToolEntry 注册表 + dispatch 五步链：查→enabled→PermissionGate→delay→executor）
    permission.ts    PermissionGate（ToolRisk = read/write/external/ui/state/evaluate；PolicyRule{subcommand}；defaultActionForRisk）
    audit.ts         AuditSink（AuditEventType 联合：permission/tool-call/extension-register/subscribe/…）
    sensitive.ts     敏感字段分类/脱敏（maskValue/redactUrlQuery/isSensitiveHeader/maskTextPayload…）
    llm.ts           中性 LLM 机制（chat/parseToolArguments/classifyError；LlmConfig/LlmToolDef）
    runner.ts        AgentRunner（中性 agent 循环，零 react）
    platform.ts      PlatformEnv 缝（kind/fetch/kv/dom/events/clipboard/askUser/… + [k]:unknown 自由位）
    platform-dom.ts  createBrowserDomOps()（唯一 document/window 触碰点）
    ext-attribution.ts ATTRIBUTION_MAP（12 项需扩展能力 → 归属 + 扩展 API/CDP 域 + 契约预留）
  packages/lgdl-web/src/ai/        内置 AI 助手（session 组装 + AiPanel + provider BYOK）→ 本 Feature 下线对象
  packages/lgdl-web-cli / op-cli   LGDL 领域适配层（图内容 9 命令 / UI 操作）

本 Feature 需要的新组件（当前全仓不存在）：
  ✗ 站点协议发现/声明机制（descriptor schema / 静态声明 / 运行时握手 / 信任模型）
  ✗ 浏览器扩展运行时（MV3 manifest / background service worker / content script / side panel）
  ✗ per-origin 授权存储与门禁策略（OriginTrustStore + PermissionGate PolicyStrategy）
  ✗ 扩展存储 key 载体（chrome.storage 隔离于页面上下文）
  ✗ 页内 web-cli-base → 站点协议暴露点桥接（LGDL 侧）
  ✗ 无头/自动化加载扩展冒烟链路
```

**结构性缺环（spec §2.1 直接引用，本 plan 需闭合）**：① 站点级 web-cli 协议发现/声明机制不存在（Q-005/R-003）；② 协议信任另一半未定义（第三方声明面，Q-006/O-010）；③ MV3 载体边界与页内 web-cli-base 关系未定（Q-007）；④ LLM 驱动网页执行的安全/授权/审计边界未定义（Q-008/R-001）；⑤ 内置助手下线对象/保留对象需在工程上落实（O-001/O-006 对象区分）。

### 2.2 目标架构总览（插件工程拓扑）

```
┌──────────────────────────────────────────────────────────────────────────┐
│ packages/web-cli-plugin/  （monorepo 内独立包，S-004；独立构建产物，零 LGDL 私有依赖）│
│                                                                          │
│ ┌─ background service worker（控制面，唯一权威门禁）────────────────────┐ │
│ │  service-worker.ts   入口：chrome.runtime 消息路由 + 生命周期            │ │
│ │  controller.ts       WebCliController：活跃标签绑定(S-011) + 会话状态    │ │
│ │  host.ts             CommandRouter(web-cli-base) + AgentRunner 宿主     │ │
│ │    ├─ site:* 命名空间   站点声明工具（descriptor → ToolEntry，executor=RPC）│ │
│ │    └─ plugin 管理工具   origin-authorize/revoke/list、descriptor-show、   │ │
│ │                        audit-export、llm-config                         │ │
│ │  security/           OriginTrustStore + PolicyStrategy(授权/untrusted/    │ │
│ │                      fail-closed) + onAsk(二次确认) + AuditSink + 脱敏     │ │
│ │  llm/                providers.ts(8 厂商表对齐) + key-store.ts(不进页面)   │ │
│ │  platform/extension-env.ts  PlatformEnv 实现（fetch=扩展 fetch；kv=        │ │
│ │                      chrome.storage 适配器；dom/events=content script 代理）│ │
│ └──────────────────────────────────────────────────────────────────────┘ │
│ ┌─ content script（数据面，isolated world）───────────────────────────┐ │
│ │  content-script.ts   注入入口（activeTab 用户手势触发）                 │ │
│ │  discovery.ts        静态声明(well-known/HTML link/meta) + 运行时握手   │ │
│ │  page-bridge.ts      postMessage RPC ↔ 页面世界（声明工具 invoke/result）│ │
│ │  dom-agent.ts        （波2+）PlatformDomOps 远程代理（通用 DOM 工具面）  │ │
│ └──────────────────────────────────────────────────────────────────────┘ │
│ ┌─ side panel（会话 UI，扩展源隔离，不注入页面）────────────────────────┐ │
│ │  chat / 授权（per-origin + 危险档位二次确认）/ 审计查看 / 状态            │ │
│ └──────────────────────────────────────────────────────────────────────┘ │
│ ┌─ options page（设置）────────────────────────────────────────────────┐ │
│ │  LLM key/厂商/模型（8 厂商对齐）/ 不自动迁移指引 / 合规与不适用清单       │ │
│ └──────────────────────────────────────────────────────────────────────┘ │
│  manifest.json (MV3) / build.mjs (esbuild 打包 + manifest 拷贝)            │
└──────────────────────────────────────────────────────────────────────────┘
        │ postMessage RPC（站点协议执行通道）        │ chrome.* API（扩展特权面）
        ▼                                            ▼
┌──────────────────────────────┐        ┌──────────────────────────────────┐
│ 站点页面世界（page world）      │        │ 浏览器（tabs/storage/scripting/    │
│  LGDL 页：保留 web-cli-base    │        │  sidePanel/permissions）          │
│  机制层 + 新 web-cli-host 桥   │        └──────────────────────────────────┘
│  通用站点：自实现协议 RPC       │
└──────────────────────────────┘
```

**依赖方向（单向无环，NFR-009）**：`web-cli-plugin` → `@lgdl/web-cli-base`（公共框架，npm v0.7.0）；**零 `@lgdl/lgdl-web` 私有依赖**；`@lgdl/lgdl-web-cli`/`op-cli` **不被插件 import**（LGDL 领域命令由**页面侧**执行，插件只消费协议描述符）。LGDL 页仅新增「站点协议暴露点」（复用其保留的 web-cli-base 机制层）。

### 2.3 协议机制设计（P-01 核心；站点中立，O-002/O-003/S-013）

**三层结构：发现（Discovery）→ 声明（Descriptor）→ 执行（RPC Transport）**，三者解耦、可独立演进。

#### 2.3.1 协议描述符 schema（`protocol/descriptor.ts`，站点中立，无 LGDL 私有格式）

```ts
/** web-cli 协议版本（语义化；plan 首版 = '1.0'）。 */
export const WEB_CLI_PROTOCOL_VERSION = '1.0';

export interface WebCliDescriptor {
  /** 协议版本（FR-011/FR-013 最小字段语义）。 */
  protocolVersion: string;
  /** 站点标识（展示用；非信任依据）。 */
  siteName?: string;
  /** 声明暴露的工具面（FR-011：能力标识/用途/入参语义/风险档位提示/协议版本）。 */
  tools: WebCliToolDecl[];
  /** 执行通道绑定（站点如何被调用；FR-011 执行语义）。 */
  transport: WebCliTransport;
  /** 可选完整性摘要（FR-012 篡改可检测；缺省 = 无完整性声明 → 按 untrusted 保守处理）。 */
  integrity?: { algorithm: 'sha256'; digest: string };
  /** 声明来源溯源（FR-012 来源可追溯；插件填充，站点无需提供）。 */
  source?: WebCliDescriptorSource;
}

export interface WebCliToolDecl {
  /** 能力标识（站点内唯一；插件注册为 `site:<id>`）。 */
  id: string;
  /** 用途（进 LLM tool schema description）。 */
  summary: string;
  /** 入参语义（JSON-schema 子集：properties/required；供 tool schema 组装）。 */
  params?: Record<string, { type: 'string' | 'number' | 'boolean'; desc?: string; required?: boolean }>;
  /** 子命令清单（可选；供 subcommandRisks 与 help）。 */
  subcommands?: string[];
  /** 风险档位提示（站点自报，**不作为裁决依据**；插件按 fail-closed 复核）。 */
  riskHint?: 'read' | 'write' | 'external' | 'ui' | 'state' | 'evaluate';
}

/** 执行通道（首版：postMessage RPC；站点实现监听端）。 */
export interface WebCliTransport {
  kind: 'page-message';
  /** postMessage 通道命名空间（避免与页面其他消息冲突）。 */
  channel: string;
  /** 请求/响应消息 type 约定（缺省 'web-cli:invoke' / 'web-cli:result'）。 */
  invokeType?: string;
  resultType?: string;
}

export interface WebCliDescriptorSource {
  origin: string;                          // 来源 origin
  channel: 'well-known' | 'html-link' | 'runtime-handshake';
  fetchedAt: number;
  integrityVerified: boolean;              // 完整性校验结果（无 integrity 声明 = false）
  trust: 'untrusted' | 'trusted';          // 与用户显式授权分离的信任态（FR-012）
}
```

#### 2.3.2 发现三通道（FR-010 三态：支持 / 不支持 / 未知或失败）

| 通道 | 机制 | 适用 | 优先级 |
|------|------|------|:--:|
| **① 静态声明文件** | `GET <origin>/.well-known/web-cli.json`（background 经 host permission fetch，无 CORS） | 根路径部署站点 | 主（根部署） |
| **② HTML 标记** | 页面 `<link rel="web-cli" href="web-cli.json">` 或 `<meta name="web-cli" content="<url>">`（相对 href → 兼容子路径部署，如 LGDL `/LGDL/` GH Pages） | 子路径部署 SPA / 无 well-known 权限 | 主（子路径/SPA） |
| **③ 运行时握手** | content script 经 `chrome.scripting.executeScript({world:'MAIN'})` 注入探测片段 → `window.postMessage({type:'web-cli:probe'})` → 页面桥回 `{type:'web-cli:descriptor', descriptor}` | 动态站点 / 不提供静态声明 | 补（增强） |

**发现判定与优先级**：① → ② → ③ 依序尝试；首个成功即采用（记录 `source.channel`）；全部失败/无效/超时 → **「未知/发现失败」可读态**（FR-014，不误报支持）。发现过程**无逐站点硬编码白名单**（FR-010 断言）。

#### 2.3.3 执行 RPC 契约（`protocol/rpc.ts`，站点实现监听端）

```
插件（content script） → 页面世界：
  { type: 'web-cli:invoke', channel, id, tool, subcommand, args: Record<string,string> }
页面世界 → 插件：
  { type: 'web-cli:result', channel, id, ok: boolean, output: string, changed?: boolean,
    source?: string, error?: string, trust?: 'external' }
```

- **超时/取消**：invoke 超时（默认 30s，可配）→ 可读失败 + 审计（EC-005 语义同族）；页面导航/桥卸载 → 进行中请求置失败。
- **结果信任**：页面返回 `trust:'external'`（或未声明）→ 结果按**外部内容**处理（不因清洗丢失，沿 base `ToolResult.trust` 语义）；**不信任页面输出为指令**（prompt injection 面护栏，见 §3.3）。
- **执行失败可读**：站点未实现 RPC / 通道无响应 / 抛错 → 可读态 + 归属说明（FR-008/014），不静默、不假装生效。

> **为何 RPC 而非「插件直接注入站点函数」**：① content script 与页面世界 JS 全局隔离（isolated world），不能直接调用页面函数；② 站点执行语义（LGDL 的 app 状态/opRegistry/onApply）只在页面世界可达；③ postMessage 是站点中立、跨浏览器、可审计的最小通用契约（S-013 开源中立）；④ 站点可在 RPC 监听端自行做速率/权限/合规二次护栏（站点主权，O-009）。

### 2.4 插件运行时与宿主形态（P-02）

**MV3 三面架构**（推荐；详见 §4.1 方案对比）：

| 面 | 角色 | 关键点 |
|----|------|--------|
| **background service worker** | 控制面（权威门禁 + 编排） | CommandRouter/AgentRunner 宿主；PermissionGate 单一裁决点；LLM 调用（扩展源 fetch，规避页面 CSP/CORS）；key/授权/审计持久化（chrome.storage）；`type:'module'` 支持 ESM import |
| **content script** | 数据面（执行代理） | isolated world；协议发现 + postMessage 桥；不持有 key、不做裁决、不渲染 UI |
| **side panel** | 会话 UI | 扩展源页面（不注入宿主页，零页面污染）；多轮对话/授权/二次确认/审计查看 |
| **options page** | 设置 | LLM 配置/迁移指引/合规文档入口 |

**关键约束与设计**：
- **service worker 生命周期（MV3）**：SW 空闲会被回收 → ① 活跃任务期间经 `chrome.runtime.connect` 长连接 + 进行中 fetch 保活；② 会话状态落 `chrome.storage.session`（运行态）+ `chrome.storage.local`（持久态），SW 重启后恢复（EC-013）；③ 长 agent 循环在 SW 内执行，受 `maxRounds` 上限保护（对齐内置助手 `DEFAULT_MAX_ROUNDS=1000`）。
- **content script 打包**：MV3 content script **不支持 ESM 直接加载** → 需打包为单文件 IIFE（新 devDep `esbuild`，见 ADR-009）；background SW 可 `"type":"module"`。
- **`PlatformEnv` 实现（`platform/extension-env.ts`，additive 复用上游缝）**：background 无 DOM，故 `extensionEnv()` 提供：`fetch`=扩展 fetch（host permission 门控）；`kv`=chrome.storage.local 适配器（非密钥设置；密钥走独立 key-store）；`dom`/`events`=**content script 远程代理缝**（波2+ 通用 DOM 工具面用，波1 可不注入）；`askUser`=side panel 应答。**上游 `PlatformEnv` 缝零改动**（NFR-005）。
- **上游契约 additive 保持**：插件只 **import 消费** `@lgdl/web-cli-base` 导出面（CommandRouter/ToolEntry/PermissionGate/AuditSink/llm/sensitive/AgentRunner），**不复制、不分叉、不修改** base 源码（FR-002 grep 断言）；base 既有 8 包发布契约零破坏。

### 2.5 安全模型映射（P-03；O-008/O-009/O-010 → 上游 PermissionGate）

**授权与信任分离**（FR-012/023）：

```
用户显式授权 origin（chrome.permissions.request 可选 host 权限 + OriginTrustStore 记录）
        │
        ▼
┌─ 插件门禁（PermissionGate，复用上游裁决管线）──────────────────────────────┐
│  ① 工具注册面：站点声明工具注册于 namespace='site'，risk = 插件复核后的 effectiveRisk │
│  ② PolicyStrategy（插件注入，依序）：                                        │
│     S1 OriginAuthorizationStrategy：目标 origin 未授权 → 'deny'（FR-023/EC-004）│
│     S2 UntrustedDeclaredStrategy：namespace='site' 且 trust!=='trusted'：    │
│         risk∈{write,evaluate,external} → 'ask'（危险档位强制确认 FR-027）     │
│         risk==='read' → null（交缺省，只读默认放行 FR-026）                    │
│         未知/无 risk → 'deny'（fail-closed，不静默 allow FR-027/NFR-001）     │
│     S3 FailClosedStrategy：任何 namespace='site' 且无匹配策略 → 'deny'        │
│  ③ riskDefaults（插件配置）：read→allow；write/external/ui/state→ask；        │
│     evaluate→deny（沿上游 defaultActionForRisk 语义，NFR-001 不可低于确认）    │
│  ④ ask 命中 → onAsk 桥 → side panel 二次确认（操作摘要：站点/工具/子命令/参数摘要/风险档位）│
│     拒绝/超时/取消 → deny（缺省保守，EC-005）→ 审计                            │
└──────────────────────────────────────────────────────────────────────────┘
        │ allow
        ▼
   executor（站点工具 = content script RPC；插件管理工具 = background 本地）
        │
        ▼
   AuditSink（chrome.storage，零明文）← 发现/声明读取、授权变更、裁决、执行、确认全量入审计
```

**要点**：
- **裁决单一权威点 = background PermissionGate**：content script 只执行已裁决调用（拿不到未裁决路径）；页面无法直接触发插件工具（无特权入口）。
- **站点 `riskHint` 只作提示不作依据**：插件按**工具 id 白名单 + 参数形态 + 用户确认**复核 effectiveRisk；危险档位强制 ask、未知档位 deny（fail-closed）。
- **授权 ≠ 信任**：授权（能否操作该 origin）与信任（是否信任其声明来源）分离；trusted 提升需显式用户操作 + 审计（FR-012）。
- **脱敏复用上游**：`sensitive.ts`（`redactUrlQuery`/`isSensitiveHeader`/`maskTextPayload`/`maskValue`）直接 import 复用；审计/日志/上下文零敏感明文（FR-028/NFR-001）。
- **无旁路断言**：所有工具调用必经 `router.dispatch` 五步链（enabled→PermissionGate→delay→executor）；插件不提供绕过 dispatch 的直执行入口（NFR-001 grep 断言）。

### 2.6 与页内 web-cli-base 衔接与对象区分（P-04；O-006↔O-001 消解）

**对象区分（作者裁决 2026-09-10）**：

| 对象 | 处置 | 工程落点 |
|------|------|---------|
| **下线对象 = 内置 AI 助手层** | v0.8 内代码下线（Gate-D 达标后） | `packages/lgdl-web/src/ai/`（`AiPanel.tsx`/`AskDialog.tsx`/`SettingsPanel.tsx`/`prompts.ts`/`provider.ts`/`session.ts` 的助手语义部分）+ `App.tsx` 接线 |
| **保留对象 = 页内 web-cli-base 机制层** | 保留，作为 LGDL 站点的协议暴露点/宿主 | `@lgdl/web-cli-base`（npm 依赖，不动）+ **新增** `packages/lgdl-web/src/web-cli-host/`（站点协议暴露点） |

**桥接关系（推荐 = 桥接 Bridge；详见 §4.3）**：

```
插件 background CommandRouter ──site:lgdl-web-cli (executor)──> content script ──postMessage──>
   LGDL 页面世界 web-cli-host bridge ──dispatch──> 保留的 web-cli-base CommandRouter
        └─ 注册 createLgdlWebCliTool() + createOpCliToolEntry(opRegistry)（沿用 session.ts 既有工具面组装）
        └─ 提供 onApply 写回通道（FR-020：桥暴露 apply 能力，插件经 RPC 调用；无 React 内部状态直连）
```

- **LGDL 站点协议暴露点**（`web-cli-host/`）：复用保留的 web-cli-base 机制层（CommandRouter + `lgdl-web-cli`/`op-cli` 工具注册 + delay + audit），**移除助手专属部分**（system prompt/runner/provider/AiPanel 接线）；对外仅暴露 §2.3.3 RPC 监听端 + §2.3.2 静态声明（`public/.well-known/web-cli.json` + `index.html` `<link rel="web-cli">`，相对 href 兼容 `base='/LGDL/'`）。
- **写回（FR-020）**：桥接端提供 `apply` 能力（页内已有 `parseLgdl` 校验 + `onApply` 回调），插件经 RPC 调用 `site:lgdl-web-cli` 的写回子命令；插件侧不依赖 React 内部状态（评审断言）。
- **通用站点**：站点自实现 RPC 监听端 + 静态声明；插件侧零站点特化（无 `if (origin === 'lgdl')` 类硬编码，FR-041/043 评审）。
- **双份工具面冲突（FR-004/EC-012）**：过渡期（插件就绪 ~ 内置助手下线）两形态不得双重执行/重复注册 —— 检测用例：① 同一 RPC invoke 在页面仅执行一次；② 页面 CommandRouter 仅一份实例；③ 插件注册表无与页面工具同名的本地重复。过渡期收敛计划见 FR-040。

### 2.7 存储载体与 key（P-05；S-007 冻结 + FR-033/035）

| 数据 | 载体 | 理由 |
|------|------|------|
| LLM key/厂商/模型/baseURL | `chrome.storage.local`（**不用 `sync`**） | 扩展源隔离（页面脚本不可读，FR-035）；不云同步（避免 key 出本机） |
| per-origin 授权/信任 | `chrome.storage.local`（`origins` 命名空间） | 跨标签/跨会话持久；可查看/撤销（FR-023） |
| 审计记录 | `chrome.storage.local` 环形缓冲（容量上限 + 溢出计数） | 可回放/可导出；零明文（FR-025/NFR-003） |
| 描述符缓存 | `chrome.storage.session`（运行态，SW 回收即失效，重发现） | 避免陈旧声明；不落持久盘 |
| 会话/运行态 | `chrome.storage.session` + `local` 快照 | SW 生命周期恢复（EC-013） |

**key 安全设计（FR-035/NFR-001）**：
- key 仅存于 `chrome.storage.local`；**运行时仅 background 读取**，经 `chrome.runtime.sendMessage` 从不回传 content script / side panel 的页面上下文（side panel 是扩展源页面，可显示掩码）。
- key **不进** LLM 上下文、日志、审计（grep 断言零明文）；`llm-config` 工具输出掩码（`maskValue`）。
- 不自动迁移内置助手 `localStorage`（S-015/FR-036）：插件**不读写** `lgdl-ai-settings`（grep 断言）；options 提供手动重配指引。
- 加固（可选后置）：WebCrypto AES-GCM + 不可导出密钥（IndexedDB 密钥句柄）——首版不做，记录为后续加固项（不阻塞）。

### 2.8 数据流变更与依赖关系

```
变更前（v0.7，页内）：用户 ──> AiPanel ──> createAiSession(CommandRouter) ──> 同源 DOM/app 工具（request→response）
变更后（v0.8 插件）：
  用户 ──> side panel ──> background Controller ──> AgentRunner ──> LLM(扩展 fetch, BYOK key)
                                                     │
                                              CommandRouter.dispatch
                                                     │ PermissionGate（授权/untrusted/fail-closed）→ 审计
                                                     ├─ site:* 工具 ──> content script ──postMessage──> 站点页面 RPC 执行
                                                     └─ plugin 管理工具 ──> background 本地
  LGDL 页：保留 web-cli-base 机制层（web-cli-host 暴露点）执行 LGDL 领域命令 + 写回
依赖关系：web-cli-plugin → @lgdl/web-cli-base（唯一运行时依赖）；零 LGDL 私有包；零第三方运行时依赖。
```

---

## 3. 分模块技术方案
> 各组实现要点；FR → 模块/文件落位以 §3.0 为准

### 3.0 FR → 落位总映射（traceability，供 tasks/review/validate）

| 组 | FR | 落位（模块 / 文件 / 缝） | 波 |
|---|---|---|:--:|
| BSL | FR-001 | `package.json` 依赖 `@lgdl/web-cli-base ^0.7.0` + 基线核对（npm/tag） | 1 |
| BSL | FR-002 | 复用面清单（import 消费）+ 零分叉 grep（无复制 base 源码） | 1 |
| BSL | FR-003 | `packages/web-cli-plugin` 独立包 + 依赖图谱零 LGDL 私有 | 1 |
| BSL | FR-004 | 对象区分清单（下线/保留）+ 双份工具面冲突检测用例（§2.6） | 1/3 |
| PLG | FR-005 | `manifest.json`(MV3) + `src/background/service-worker.ts` + content/sidepanel/options 入口 | 1 |
| PLG | FR-006 | `manifest.json` 权限最小化：`activeTab`+`scripting`+`sidePanel`+`storage`+**`optional_host_permissions`**；per-origin 动态授权 | 1 |
| PLG | FR-007 | content script isolated world（`content-script.ts`）+ 宿主页全局零污染断言 | 1 |
| PLG | FR-008 | 不可达能力如实转译（复用 `ext-attribution.ts` + 插件侧 `platform/unsupported.ts`） | 1 |
| PLG | FR-009 | MV3 平台约束最小验证门（波0 spike，见 §5.3） | 0 |
| DSC | FR-010 | `discovery/discovery.ts` 三态判定（三通道依序，§2.3.2） | 1 |
| DSC | FR-011 | `protocol/descriptor.ts`（schema + 校验 + 归一化）+ `tools/declared-tools.ts`（→ ToolEntry） | 1 |
| DSC | FR-012 | `protocol/trust.ts` + `security/origin-store.ts`（默认 untrusted + 显式 trusted + 溯源） | 1 |
| DSC | FR-013 | `protocol/version.ts` 版本协商/未知版本拒绝或降级（EC-014） | 1 |
| DSC | FR-014 | 失败降级可读态（`discovery.ts` 各失败分支，≥3 场景） | 1 |
| DSC | FR-015 | `docs/protocol.md` 站点中立协议文档 + 零 LGDL 私有格式耦合（F-13 ② 预留） | 2 |
| DSC | FR-016 | 最小试点：LGDL 页 + 本地非 LGDL fixture 站点（§5.3；波0 启动、波1 闭环） | 0/1 |
| CAP | FR-017 | `background/host.ts`（CommandRouter+AgentRunner）+ `ui/sidepanel/chat` 多轮/工具调用/ask | 1 |
| CAP | FR-018 | 站点 `site:lgdl-web-cli` 声明工具经 RPC 执行（页内 `lgdl-web-cli` 9 命令） | 1 |
| CAP | FR-019 | 站点 `site:lgdl-web-op-cli`（UI 操作）经 RPC 执行 | 2 |
| CAP | FR-020 | 页桥 `apply` 写回通道 + 插件 `site:*` 写回子命令（无 React 内部状态直连） | 1 |
| CAP | FR-021 | 事件消费：content script 事件桥 / 页内 events hub 代理 → background 事件通道 | 2 |
| CAP | FR-022 | `docs/capability-matrix.md`（内置助手 20+ 工具 ↔ 插件能力对照 + 最小能力集） | 0 |
| SEC | FR-023 | `security/origin-store.ts` + `security/policy.ts`(S1 OriginAuthorizationStrategy) | 1 |
| SEC | FR-024 | `security/confirm.ts`（onAsk → side panel 二次确认 + 操作摘要） | 1 |
| SEC | FR-025 | `security/audit-sink.ts`（chrome.storage 环形缓冲 + 可回放/导出） | 1 |
| SEC | FR-026 | `security/policy.ts` riskDefaults（read→allow / 写面→ask；不可放宽至静默） | 1 |
| SEC | FR-027 | `security/policy.ts`(S2 UntrustedDeclaredStrategy + S3 FailClosedStrategy) | 1 |
| SEC | FR-028 | `security/redact.ts`（import 复用 base `sensitive.ts`）+ 各接入点脱敏 | 1 |
| SEC | FR-029 | 越权拒执行 + 风控护栏（频率限制/可中断/可暂停） | 2 |
| CMP | FR-030 | `docs/compliance.md` 站点条款合规评估（试点站点结论表） | 0/2 |
| CMP | FR-031 | 授权流程知情同意 + `ui/sidepanel/authorize` 风险提示文案 | 2 |
| CMP | FR-032 | `docs/compliance.md` 不适用清单 | 2 |
| KEY | FR-033 | `llm/key-store.ts` + `ui/options/settings`（chrome.storage.local，独立配置） | 1 |
| KEY | FR-034 | `llm/providers.ts` 8 厂商对齐 + CORS 受限处置验证门（§3.5） | 2 |
| KEY | FR-035 | key 仅 background 持有 + 零明文 grep + 不读写内置助手 localStorage | 1 |
| KEY | FR-036 | `docs/migration.md` 不自动迁移 + 手动重配指引 | 2 |
| MIG | FR-037 | `docs/gate-d.md` Gate-D 条件清单（D-1~D-7） | 1（门槛定义） |
| MIG | FR-038 | 下线执行路径 + 回退预案（§3.8）+ 临时恢复入口终止时点 | 3 |
| MIG | FR-039 | `docs/migration.md` 存量迁移路径 + 差异清单 | 2 |
| MIG | FR-040 | 过渡期双份维护控制（起止条件 + 收敛计划） | 2 |
| LGDL | FR-041 | `packages/lgdl-web/src/web-cli-host/`（站点协议暴露点）+ `public/.well-known/web-cli.json` + `index.html` link | 1 |
| LGDL | FR-042 | 等价替代验收（对照矩阵 + 等价用例） | 1 |
| LGDL | FR-043 | 通用性验证（非 LGDL fixture 站点端到端，无 LGDL 私有接口） | 1 |
| REL | FR-044 | `build.mjs`（esbuild）+ 本地 unpacked 加载调试文档 | 2 |
| REL | FR-045 | 冒烟方法论（无头加载扩展，§3.9/P-06） | 0/2 |
| REL | FR-046 | 发布渠道定义（自托管/未打包分发）+ `docs/release.md` | 3 |

### 3.1 PLG — 插件载体与平台约束（FR-005~009）

- **manifest.json（MV3 最小权限面）**：
  - `manifest_version: 3`；`background.service_worker`（`type:'module'`）。
  - `permissions`: `activeTab`、`scripting`、`storage`、`sidePanel`（+ `tabs` 仅用于读取当前标签 URL/标题？——优先用 `activeTab` 避免宽泛 `tabs`；若必须读取 URL 则用 `chrome.tabs.query` 配 `activeTab` 授权态）。
  - `optional_host_permissions`: `https://*/*`（**运行时按 origin 申请**，不在安装时全量授权，FR-006）。
  - `host_permissions`: 仅 LLM 厂商已知端点（可选声明，见 §3.5）；默认不申请站点访问。
  - `side_panel.default_path`；`options_page`。
  - `content_scripts`: 不静态全站注入；经 `chrome.scripting` 在用户手势/授权后按 origin 动态注入（权限最小化 + 无操作零开销 NFR-002）。
  - **目标浏览器与最低版本显式声明**（NFR-004）：Chromium 系（Chrome/Edge）≥ 114（`sidePanel` API）；低于门槛 → 可读降级提示。
- **content script 隔离（FR-007）**：isolated world 默认；不向页面 `window` 挂全局；注入脚本不修改页面原型链；对宿主页关键路径零常驻开销（默认无操作零监听，NFR-002）。
- **不可达能力如实转译（FR-008）**：复用 `ATTRIBUTION_MAP`（`ext-attribution.ts`）产出「不支持 + 归属」文案；插件侧新增 `platform/unsupported.ts` 统一转译 helper；**无静默 catch 吞错**（grep 断言）。
- **MV3 最小验证门（FR-009，波0）**：见 §5.3，逐项 PASS/FAIL/降级记录。

### 3.2 DSC — 协议发现/声明机制（FR-010~016）

- **实现要点**：§2.3 三层（发现/声明/执行）。核心模块：
  - `discovery/static-declaration.ts`：`fetch(origin + '/.well-known/web-cli.json')`（background，host permission）；HTML `<link rel="web-cli">`/`<meta name="web-cli">` 解析（content script，相对 href 解析为绝对 URL）。
  - `discovery/runtime-handshake.ts`：`chrome.scripting.executeScript({world:'MAIN'})` 注入探测 → `postMessage` 握手（超时 3s）。
  - `protocol/descriptor.ts`：schema 校验（版本/工具字段/transport）+ 归一化；非法声明 → 可读拒绝（FR-014）。
  - `protocol/trust.ts`：默认 `untrusted`；`integrity` 摘要校验（sha256，无声明 = `integrityVerified:false` → 保守）；`source` 溯源填充。
  - `protocol/version.ts`：`protocolVersion` 协商；未知/不兼容 → 拒绝或降级（EC-014）+ 可读提示。
- **信任模型（FR-012/O-010）**：站点声明**默认 untrusted**；用户可显式将 origin 提升为 trusted（与授权分离）；被篡改/来源不可信 → 拒用或降级 + 审计（EC-002）。
- **工具面组装（FR-011）**：descriptor.tools → `ToolEntry[]`（`namespace:'site'`、`schema` 由 params 生成、`risk` 由插件复核、`executor` = RPC）；注册进 background CommandRouter；help/schema 可读。
- **关键 ADR**：ADR-001（协议机制）、ADR-007（协议中立与 F-13 ② 预留）。

### 3.3 SEC — 安全·授权·审计（FR-023~029）

- **实现要点**：§2.5 门禁映射。`security/policy.ts` 三个 `PolicyStrategy`（S1/S2/S3）；`security/origin-store.ts`（授权/信任 CRUD + 审计）；`security/confirm.ts`（onAsk 桥 + 操作摘要构建）；`security/audit-sink.ts`（`AuditSink` 实现，chrome.storage 环形缓冲，扩展事件类型 `origin-authorize`/`origin-revoke`/`descriptor-read`/`confirm`/`llm-config`）；`security/redact.ts`（import 复用 base sensitive）。
- **prompt injection 护栏（FR-028 延伸，新增）**：站点 RPC 返回内容按 `trust:'external'` 处理；**不将页面输出解释为系统指令**；工具输出进上下文前经脱敏 + 截断（沿用 base 上下文预算口径）。
- **风控护栏（FR-029，波2）**：per-origin 调用频率限制（令牌桶，可配）、可中断（side panel stop）、可暂停（EC-010）。
- **无旁路（NFR-001）**：所有执行经 dispatch；grep 断言无直接 executor 调用入口。
- **关键 ADR**：ADR-003（权限模型映射）、ADR-005（存储）、ADR-011（CORS/厂商）。

### 3.4 CAP — 能力面对齐（FR-017~022）

- **会话/多轮/工具调用/ask（FR-017）**：background `host.ts` 用 `AgentRunner`（base）+ `router.deriveTools()` 供 schema；side panel 渲染多轮；`askUser` 缝接 side panel；权限 ask 接 `security/confirm.ts`。
- **LGDL 图内容/UI 操作（FR-018/019）**：站点声明工具经 RPC 执行页内保留的 `lgdl-web-cli`/`op-cli`；插件不 import 领域包。
- **写回（FR-020）**：页桥 `apply` 通道（页内 `parseLgdl` 校验 + `onApply`）；无 React 内部状态直连。
- **事件消费（FR-021，波2）**：content script 事件桥（页内 `env.events` hub 代理）→ background 事件通道；或直接订阅页面 DOM 事件（isolated world 可达）。
- **能力对照矩阵（FR-022，波0）**：`docs/capability-matrix.md` —— 内置助手 20+ 工具逐项归属（对齐/替代/不适用/后置）+ 下线最小能力集；作为 Gate-D D-1 验收基线。

### 3.5 KEY — LLM Key 管理（FR-033~036）

- **实现要点**：`llm/providers.ts`（8 厂商表对齐 `provider.ts`：deepseek/qwen/volc/volc-coding/volc-plan/tencent/openai/claude；`browserDirect` 语义保留为「需验证」标记）；`llm/key-store.ts`（chrome.storage.local）；LLM 调用在 background 经 `llm.ts` `chat`。
- **CORS 受限厂商处置（FR-034，验证门）**：假设——扩展 background 对已授权 `host_permissions` 的厂商端点发起 fetch，**不受页面 CORS 预检限制**（扩展特权），故火山 3 端点（`browserDirect=false`）在插件形态**可能可直连**。**波0/波2 验证门 G-KEY**：真实扩展环境请求火山端点（带 Authorization）→ 若成功 → 8 厂商全可用；若失败 → 降级出口 = ① 提示需本地代理（明确「未实现」不假装）；② 可读转译「该厂商当前不可直连」（EC-009）。**不静默失败**。
- **key 安全（FR-035）**：§2.7；不读写内置助手 `localStorage`（FR-033/036 grep 断言）。
- **关键 ADR**：ADR-011（CORS 处置验证门）。

### 3.6 LGDL — 站点协议暴露点与等价替代（FR-041~043）

- **实现要点**：新增 `packages/lgdl-web/src/web-cli-host/`：
  - `host-router.ts`：复用保留的 web-cli-base `CommandRouter` + `createLgdlWebCliTool()` + `createOpCliToolEntry(opRegistry)`（工具面组装从 `session.ts` 迁移/保留），移除助手专属（runner/provider/system prompt）。
  - `bridge.ts`：`window.postMessage` 监听端 → 解析 `web-cli:invoke` → `router.dispatch` → 回 `web-cli:result`；提供 `apply` 写回能力。
  - `declaration.ts` + `public/.well-known/web-cli.json` + `index.html` `<link rel="web-cli" href="web-cli.json">`（相对路径兼容 `base='/LGDL/'`）。
- **等价替代验收（FR-042）**：对照矩阵 LGDL 相关项全达标 + 同输入同结果/差异显式说明。
- **通用性（FR-043）**：非 LGDL fixture 站点端到端；无站点硬编码评审（grep `lgdl` 不出现在 discovery/policy 特化分支）。

### 3.7 CMP — 合规（FR-030~032）

- `docs/compliance.md`：站点自动化条款评估清单（ToS/robots/自动化约束）→ 试点站点可用性结论（可用/受限/禁用）；不适用清单（明确禁止自动化的站点类型/操作类型）；与 FR-030 评估一致；用户可见（options 入口）。
- 知情同意（FR-031）：授权流程含风险提示（账号风控/条款冲突/数据外泄面）+ 能力边界；文案可读（NFR-008）。

### 3.8 MIG — 内置助手下线执行与回退设计（Gate-D；FR-037~040）

**Gate-D 条件清单（FR-037，`docs/gate-d.md`，独立里程碑，不并入任何波次首版）**：

| # | 条件 | 关联 |
|---|------|------|
| D-1 | 能力对齐矩阵达标（最小能力集全部由插件覆盖） | FR-022/042 |
| D-2 | 安全基线全达标（授权/二次确认/审计/fail-closed/脱敏） | FR-023~028/NFR-001 |
| D-3 | LGDL 端到端闭环通过 | FR-041/042/AC-009 |
| D-4 | 通用站点端到端通过 | FR-043/AC-010 |
| D-5 | 存量迁移路径可用 | FR-036/039 |
| D-6 | 回退预案就绪 | FR-038 |
| D-7 | 过渡期收敛计划（终止时点） | FR-040 |

**下线执行路径（FR-038，波3，Gate-D 全达标后）**：
1. 前置检查：逐条验收 Gate-D 并记录（未达门槛 → **不下线**，EC-016）。
2. 移除助手接线：`App.tsx` 摘除 `AiPanel`/`SettingsPanel`/`createAiSession` 引用，挂载 `web-cli-host`。
3. 归档下线对象：`packages/lgdl-web/src/ai/`（AiPanel/AskDialog/SettingsPanel/prompts/provider/session）随本版本移除；**保留** `web-cli-base` 机制层 + `web-cli-host`。
4. 迁移与差异文档（FR-039）+ 过渡期收敛（FR-040）。

**回退预案设计（FR-038；不长期双份并存）**：
- **主预案 = 版本回退**：下线为**单一提交/分支**（可 `git revert`）；前一版本（v0.7）保留 `ai/` 全量，用户/作者可回退到含内置助手的版本（紧急回退入口）。
- **可选临时入口**：构建期 flag `VITE_AI_ASSISTANT_FALLBACK`（**默认 off**），仅在紧急期启用旧面板；**显式终止时点**（过渡期收敛时移除该 flag，避免长期双份并存 R-007）。
- **不静默进入无 AI 可用状态**（EC-016）：下线前置检查未过 → 保持内置助手。

### 3.9 REL — 发布/调试/冒烟链路（FR-044~046；P-06）

- **本地加载调试（FR-044）**：`build.mjs`（esbuild 打包 background/content/sidepanel/options + 拷贝 manifest/静态资源到 `dist/`）→ 浏览器 `chrome://extensions` 开发者模式「加载已解压的扩展程序」；调试文档 `docs/dev.md`（热重载可行路径：改 content script 重注入、改 SW 重载扩展）。
- **无头/自动化加载扩展冒烟（FR-045/P-06）**：§5.4 测试策略 + ADR-006。
- **发布渠道（FR-046，波3）**：首版本地 unpacked + 自托管/未打包分发；`docs/release.md` 定义分发物/版本管理；商店发布后续（S-016 待核签）。

### 3.10 BSL — 基线与边界（FR-001~004）

- **FR-001**：`package.json` 依赖 `@lgdl/web-cli-base ^0.7.0`；基线核对（npm 版本 + tag）。
- **FR-002**：复用面清单（import 消费 CommandRouter/ToolEntry/PermissionGate/AuditSink/AgentRunner/llm/sensitive/event-bus）；**零复制分叉** grep（插件 `src/` 无 base 源码副本）；base 全量测试零回归。
- **FR-003**：独立包；依赖图谱零 `@lgdl/lgdl-web` 私有包。
- **FR-004**：对象区分清单 + 双份工具面冲突检测（§2.6）。

---

## 4. 方案对比
> 3 个关键技术选型主题 × 各 3 方案；推荐以「★」标注

### 4.1 主题一：插件宿主形态（P-02）

| 维度 | 方案 A：MV3 三面（background 控制面 + content script 数据面 + side panel）★ | 方案 B：content script 宿主（runner/router 全在 content script） | 方案 C：offscreen document 宿主 |
|------|:--|:--|:--|
| 描述 | background SW 持 CommandRouter/AgentRunner/PermissionGate/key/审计；content script 仅发现+执行代理；side panel 呈现 | 全逻辑在 content script（browserEnv 原生），background 仅做 key 保险箱 + LLM 代理 | 用 MV3 offscreen document 承载 DOM 相关逻辑 |
| 优点 | 门禁单一权威点（不可被页面绕过）；key 与页面上下文隔离最强；跨标签/授权/审计全局一致；side panel 不注入页面（FR-007 零污染）；贴合 MV3 最佳实践 | 复用 `browserEnv()` 最自然；无跨面 RPC 开销；per-tab 生命周期天然单标签绑定 | DOM API 在扩展源可用（不受页面 CSP） |
| 缺点 | 需 `extensionEnv()` + content script 远程缝（波2 通用 DOM 工具面才有成本）；SW 生命周期需保活/恢复 | 裁决点分散在每标签；key 需经消息传（风险面大）；页面导航即丢失；side panel 与 content script 多跳通信；扩展源与页面源混淆 | offscreen 生命周期/用途受限（仅特定 API 白名单），不适合 agent 宿主；额外 API 学习成本 |
| 风险 | 中（远程缝复杂度可控，波1 不需要） | 高（安全权威点分散 + key 传页面域） | 高（offscreen 不保证长驻/DOM 受限，返工面大） |
| 工作量 | 中 | 小（短视） | 中高 |

### 4.2 主题二：协议发现/声明载体（P-01）

| 维度 | 方案 A：描述符 + 双通道（静态 well-known/HTML link 主 + 运行时握手补）★ | 方案 B：仅静态声明文件 | 方案 C：仅运行时握手 |
|------|:--|:--|:--|
| 描述 | 统一 `WebCliDescriptor` schema；发现经 ①`/.well-known/web-cli.json` ②HTML `<link rel="web-cli">` ③MAIN-world postMessage 握手 | 仅 well-known JSON | 仅页面运行时应答 |
| 优点 | 站点中立（S-013）；兼容根部署与子路径 SPA（LGDL `base='/LGDL/'`）；动态站点可握手；发现不依赖逐站点硬编码；开源标准化友好 | 实现最小；缓存友好；无页面协作 | 动态站点天然支持；无需静态文件 |
| 缺点 | 需维护三通道优先级与一致性 | 子路径部署（GH Pages `/LGDL/`）无法放域根 well-known → LGDL 不可用；纯静态站点无运行时也需文件 | 依赖页面实现且需 MAIN-world 注入（`scripting` 权限）；页面未实现则永远「未知」；无声明清单可离线读取 |
| 风险 | 低（通道可独立降级） | 高（对 LGDL 不可行 + 动态站点不可达） | 中（权限面 + 时序） |
| 工作量 | 中 | 小 | 中 |

### 4.3 主题三：与页内 web-cli-base 衔接（P-04）

| 维度 | 方案 A：桥接（page bridge over 保留机制层）★ | 方案 B：复用（插件 content script 内重建 router + 直接注册领域工具） | 方案 C：接管（插件替换页面 router） |
|------|:--|:--|:--|
| 描述 | 页面保留 web-cli-base 机制层并新增 RPC 暴露点；插件经 postMessage 调用页面执行 | 插件 bundle web-cli-base，在 isolated world 重建 CommandRouter，直接注册 `lgdl-web-cli`/`op-cli` | 插件接管页面既有 router 实例 |
| 优点 | 与「对象区分」一致（保留机制层）；LGDL app 状态（opRegistry/onApply/docId）可达；插件零 LGDL 私有依赖；通用站点同一契约 | 插件自足、无页面协作 | 单一路由，无双份 |
| 缺点 | 站点需实现 RPC 暴露点（协议采用成本，但正是生态目标） | isolated world 拿不到 React app 状态（opRegistry/onApply）→ LGDL 等价不可行；插件需 import 领域包（违 FR-003）；双份 router 冲突 | 与「保留机制层」冲突；页面世界与 isolated world 隔离，技术上无法直接接管页面实例；破坏宿主页 |
| 风险 | 低（契约清晰、可审计） | 高（LGDL 等价落空 + 依赖边界破坏） | 高（不可行 + 破坏宿主页） |
| 工作量 | 中 | 中高（且不可行） | 高（不可行） |

---

## 5. 推荐方案

**推荐**：主题一方案 A（MV3 三面）+ 主题二方案 A（描述符 + 双通道发现）+ 主题三方案 A（桥接）。
**理由**：三者合力满足 spec 五条硬约束——① **O-002 通用任意站点优先**：站点中立描述符 + postMessage RPC，任何实现协议的站点（含非 LGDL）可接入，不依赖逐站点硬编码；② **O-001 代码下线 + 对象区分**：桥接使「保留 = 页内 web-cli-base 机制层」「下线 = AI 助手层」工程可落地，LGDL app 状态经页面执行可达；③ **O-008/O-009/O-010 安全红线**：background 单一权威门禁 + 上游 PermissionGate additive 映射 + fail-closed，无旁路；④ **S-005 上游契约保持**：全部能力经 import 消费与缝实现，base 零改动零回归；⑤ **R-004 容量可控**：波次切分下，波1 仅需「协议（声明+RPC）+ 门禁 + key + 会话」，通用 DOM 工具面（远程 PlatformEnv 缝）后置波2，P0 四根柱子不膨胀。

### 5.1 spec 决策 → 技术落点映射（红线输入对齐表）

| spec 决策/裁决 | 技术落点 | 关联 |
|---|---|---|
| O-001 代码下线 + O-006 对象区分 | §2.6 桥接 + §3.8 Gate-D/下线执行/回退；下线对象 = `lgdl-web/src/ai/` 助手层，保留对象 = web-cli-base 机制层 + `web-cli-host` | ADR-004/008 |
| O-002 通用任意站点优先 | §2.3 站点中立描述符 + RPC；插件零站点硬编码；LGDL 为实例站点 | ADR-001/007 |
| O-003 不预设形态（plan 给方案） | §2.3 双通道发现 + 描述符 schema（本 plan 定形态） | ADR-001 |
| O-008 授权模型 | §2.5 OriginTrustStore + S1 策略 + 二次确认 + 审计 | ADR-003/005 |
| O-009 安全边界 | §2.5 riskDefaults（只读默认/写面确认）+ §3.7 合规评估先行 | ADR-003 |
| O-010 信任模型 | §2.3 trust（默认 untrusted）+ S2/S3 策略 + fail-closed | ADR-003 |
| S-004 独立包 | §2.2 `packages/web-cli-plugin` + 独立构建产物 | ADR-009 |
| S-005 additive 复用 | §2.4 import 消费 + 零分叉 grep | ADR-002/009 |
| S-007 key 独立 | §2.7 chrome.storage.local，不共享 localStorage | ADR-005 |
| S-011 单标签 | §2.4 活跃标签绑定 + 导航失效明示 | ADR-012 |
| S-013 协议中立（待核签） | §2.3 零 LGDL 私有格式 + `docs/protocol.md` | ADR-007 |
| S-015 不自动迁移 | §2.7 不读写 `lgdl-ai-settings` + 手动指引 | ADR-005 |
| S-016 发布链路（待核签） | §3.9 本地 unpacked + 自托管 | ADR-006 |
| R-004 范围风险 | §5.3 波次 + P0 四柱 | ADR-010 |

### 5.2 技术开放点最终决策（承接 spec §9.7 P-01~P-06）

| # | 开放点 | 最终决策（推荐默认，直接写入） | ADR |
|---|--------|------------------------------|-----|
| P-01 | 协议发现/声明格式形态 | **描述符 schema + 双通道发现（静态 well-known/HTML link 主 + 运行时 postMessage 握手补）+ postMessage RPC 执行契约**；站点中立、开源中立 | ADR-001/007 |
| P-02 | 插件架构选型 | **MV3 三面**：background SW（CommandRouter/AgentRunner/PermissionGate/key/审计控制面）+ content script（发现/RPC 数据面，isolated world）+ side panel/options；目标 Chromium ≥ 114 | ADR-002 |
| P-03 | 权限模型实现 | **插件 PolicyStrategy（S1 授权 origin 门禁 / S2 untrusted 声明危险档位强制确认 / S3 fail-closed）+ riskDefaults**，经上游 PermissionGate 裁决管线；授权与信任分离；onAsk 二次确认；审计零明文 | ADR-003 |
| P-04 | 与页内 web-cli-base 衔接 | **桥接**：页面保留机制层 + 新增 `web-cli-host` RPC 暴露点；插件经 postMessage 调用页面执行；对象区分下线 AI 助手层 | ADR-004 |
| P-05 | 扩展存储与 key | **chrome.storage.local**（key/授权/审计，不用 sync）+ `session`（运行态/描述符缓存）；key 仅 background 持有、不进页面/日志/审计 | ADR-005 |
| P-06 | 无头加载扩展冒烟 | **`--headless=new --load-extension` + CDP + 本地 fixture 站点**；失败降级 headful/xvfb；机械面（CDP 驱动 background/content/协议/安全）与人工面（side panel 交互）分离 | ADR-006 |

### 5.3 波次与最小可用裁剪（R-004 缓解；spec §9.5 承接）

**波 0（门槛/前置验证，先于架构落地）**：
- FR-009 MV3 平台约束最小验证门（content script 隔离 / 站点 CSP / 跨域 fetch / 权限最小化 / **无头加载扩展**可行性）→ 逐项 PASS/FAIL/降级。
- FR-016 协议本质澄清 + 最小试点启动（LGDL 页 + 非 LGDL fixture 站点）。
- FR-022 能力对照矩阵（内置助手 20+ 工具 ↔ 插件能力）。
- FR-030 站点条款合规评估（试点站点）。
- **验证门 G-KEY**：扩展 background 对火山 3 端点直连可行性（FR-034 前置）。
- 产出为 spike/文档结论（非产品交付）；失败项触发范围裁剪。

**波 1（P0 最小可用，必做）——「四根柱子」**：
1. **插件可用**：`packages/web-cli-plugin` 骨架 + manifest + background/content/side panel 加载运行（FR-001/002/003/005~008）。
2. **安全基线**：per-origin 授权 + 二次确认 + 审计 + fail-closed + 脱敏 + key 隔离（FR-023~028/033/035）。
3. **通用站点最小闭环**：发现三态 + 声明读取 + 授权 + 工具面组装 + RPC 执行 + 审计（FR-010~014/043）。
4. **LGDL 等价**：`web-cli-host` 暴露点 + 图内容命令 + 写回 + 端到端（FR-017/018/020/041/042）。
- 覆盖 FR：FR-001/002/003, 005~008, 010~014, 017/018/020, 023~028, 033/035, 041~043。
- **任何操作面上线即有护栏**（门禁先行）。

**波 2（P1，核心价值层）**：协议版本/中立性/失败降级完善（FR-013/015/014 补强）；UI 操作 + 事件消费（FR-019/021）；越权/风控护栏（FR-029）；合规告知/边界文档（FR-031/032）；厂商 CORS 处置（FR-034）；存量迁移 + 过渡期控制（FR-036/039/040）；调试/冒烟链路（FR-044/045）；通用 DOM 工具面（`extensionEnv` 远程 dom 缝，可选）。

**波 3（P2，可后置）**：发布渠道（FR-046）；**Gate-D 下线执行**（FR-038，独立里程碑，D-1~D-7 全达标后）；外壳能力（多标签/下载/截图/CDP 级，S-012 明确不做，可顺延）；商店发布（NG-009）。

**可裁剪性（R-004）**：若容量不足，波1 内可先交付「柱子 1+2+3」（插件可用 + 安全基线 + 通用站点闭环），LGDL 等价（柱子 4）作为紧接增量；波2/波3 整体可顺延。**通用站点优先于 LGDL 特化**（O-002），LGDL 仅作为实例站点。

### 5.4 测试策略（NFR-006 双轨）

- **node 注入面（全链单测，无浏览器）**：`protocol/descriptor`（schema 校验/归一化/版本协商）、`protocol/trust`（untrusted 默认/完整性/溯源）、`discovery`（三态判定/失败分支，fake fetch/消息桩）、`security/policy`（S1/S2/S3 裁决表 + riskDefaults + fail-closed + deny 优先）、`security/origin-store`（授权/信任 CRUD + 审计）、`security/audit-sink`（事件面/环形/零明文）、`tools/declared-tools`（descriptor→ToolEntry）、`llm/providers`（厂商表对齐）、`security/redact`（脱敏复用断言）。**机制层用 base 既有 node 可测能力**（PermissionGate/audit/sensitive 直接 import 单测）。
- **真实浏览器冒烟（chromium，扩展加载；ADR-006）**：
  - 机械面（CDP 驱动）：扩展加载成功 / SW 目标可达 / content script 注入 / fixture 站点发现三态 / 声明读取 / 授权门禁三路（allow/deny/超时）/ untrusted 危险档位 fail-closed / RPC 执行往返 / 审计事件落库 / 明文 grep 零命中 / 导航失效语义。
  - 人工面：side panel 交互（多轮对话/授权弹层/二次确认呈现/审计查看）；真实 LLM 闭环（BYOK，可选）。
- **LGDL 等价（V13 先例扩展）**：`web-cli-host` 暴露点 + 图内容命令 RPC + 写回端到端；LGDL 既有功能零回归（注入后）。
- **零回归**：base 全量测试零回归；插件不改 base 源码（grep）；base 零扩展痕迹保持（grep）。
- **AC-012 NG 核验**：不重写框架/不固化格式（本 plan 定的是插件实现形态，非站点格式垄断）/不做 OS/不启动开源决策/不自动迁移/不捆绑缺陷/不做多标签/不做商店/不承诺无缝回退。

### 5.5 波次任务交接提示（tasks 输入）

- 波 0 串行：G-MV3（FR-009）→ G-KEY（FR-034）→ 试点启动（FR-016）→ 矩阵（FR-022）+ 合规（FR-030）。
- 波 1 主轴：协议（descriptor/discovery/trust/version）→ 门禁（origin-store/policy/confirm/audit）→ 宿主（host/extension-env）→ 工具（declared-tools/admin-tools）→ key（providers/key-store）→ UI（sidepanel/options）→ LGDL 暴露点（web-cli-host）。
- 波 2：协议完善/UI 操作/事件/风控/合规/迁移/调试并行。
- 波 3：Gate-D 下线（严格前置）。
- 任务块划分建议见 §9。

---

## 6. 文件影响分析

| 操作 | 文件路径 | 说明 |
|:--:|------|------|
| NEW | `packages/web-cli-plugin/package.json` | 独立包；运行时依赖仅 `@lgdl/web-cli-base ^0.7.0`；devDep = `esbuild` + `@types/chrome`（**单列待作者确认**，见 ADR-009） |
| NEW | `packages/web-cli-plugin/tsconfig.json` | TS 配置（ES2022 / strict） |
| NEW | `packages/web-cli-plugin/manifest.json` | MV3 清单（权限最小化 + optional_host_permissions + side_panel + options） |
| NEW | `packages/web-cli-plugin/build.mjs` | esbuild 打包（background ESM / content IIFE / sidepanel+options HTML）+ manifest/静态资源拷贝 |
| NEW | `packages/web-cli-plugin/src/background/service-worker.ts` | SW 入口：消息路由 + 生命周期 |
| NEW | `packages/web-cli-plugin/src/background/controller.ts` | WebCliController：活跃标签绑定 + 会话状态 |
| NEW | `packages/web-cli-plugin/src/background/host.ts` | CommandRouter + AgentRunner 宿主 + 工具注册 |
| NEW | `packages/web-cli-plugin/src/background/messaging.ts` | 跨面消息协议（background↔content↔sidepanel） |
| NEW | `packages/web-cli-plugin/src/protocol/descriptor.ts` | WebCliDescriptor schema + 校验 + 归一化 |
| NEW | `packages/web-cli-plugin/src/protocol/version.ts` | 协议版本协商/降级 |
| NEW | `packages/web-cli-plugin/src/protocol/trust.ts` | 信任模型（默认 untrusted/完整性/溯源） |
| NEW | `packages/web-cli-plugin/src/protocol/rpc.ts` | postMessage RPC 契约与实现 |
| NEW | `packages/web-cli-plugin/src/discovery/discovery.ts` | 三通道发现编排 + 三态判定 |
| NEW | `packages/web-cli-plugin/src/discovery/static-declaration.ts` | well-known / HTML link·meta 解析 |
| NEW | `packages/web-cli-plugin/src/discovery/runtime-handshake.ts` | MAIN-world 注入 + postMessage 握手 |
| NEW | `packages/web-cli-plugin/src/content/content-script.ts` | content script 入口 |
| NEW | `packages/web-cli-plugin/src/content/page-bridge.ts` | 页面世界 RPC 桥 |
| NEW | `packages/web-cli-plugin/src/content/dom-agent.ts` | （波2）PlatformDomOps 远程代理（通用 DOM 工具面） |
| NEW | `packages/web-cli-plugin/src/security/origin-store.ts` | per-origin 授权/信任存储 |
| NEW | `packages/web-cli-plugin/src/security/policy.ts` | S1/S2/S3 PolicyStrategy + riskDefaults |
| NEW | `packages/web-cli-plugin/src/security/confirm.ts` | 二次确认 onAsk 桥 + 操作摘要 |
| NEW | `packages/web-cli-plugin/src/security/audit-sink.ts` | AuditSink → chrome.storage（环形缓冲） |
| NEW | `packages/web-cli-plugin/src/security/redact.ts` | 脱敏接入（import 复用 base sensitive） |
| NEW | `packages/web-cli-plugin/src/tools/declared-tools.ts` | descriptor.tools → ToolEntry（namespace='site'） |
| NEW | `packages/web-cli-plugin/src/tools/admin-tools.ts` | 插件管理工具（origin-authorize/revoke/list、descriptor-show、audit-export、llm-config） |
| NEW | `packages/web-cli-plugin/src/llm/providers.ts` | 8 厂商表（对齐 `provider.ts` 语义，独立实现） |
| NEW | `packages/web-cli-plugin/src/llm/key-store.ts` | key 存储（chrome.storage.local） |
| NEW | `packages/web-cli-plugin/src/platform/extension-env.ts` | `PlatformEnv` 实现（扩展 fetch/chrome.storage kv/远程 dom·events 缝） |
| NEW | `packages/web-cli-plugin/src/platform/unsupported.ts` | 不可达能力统一转译（复用 ATTRIBUTION_MAP） |
| NEW | `packages/web-cli-plugin/src/ui/sidepanel/*` | 会话/授权/二次确认/审计查看（HTML+TS） |
| NEW | `packages/web-cli-plugin/src/ui/options/*` | LLM 配置/迁移指引/合规清单（HTML+TS） |
| NEW | `packages/web-cli-plugin/docs/protocol.md` | 站点中立协议文档（FR-015；F-13 ② 预留） |
| NEW | `packages/web-cli-plugin/docs/capability-matrix.md` | 能力对照矩阵（FR-022） |
| NEW | `packages/web-cli-plugin/docs/compliance.md` | 合规评估/不适用清单（FR-030/032） |
| NEW | `packages/web-cli-plugin/docs/migration.md` | 存量迁移/差异（FR-036/039） |
| NEW | `packages/web-cli-plugin/docs/gate-d.md` | Gate-D 条件清单（FR-037） |
| NEW | `packages/web-cli-plugin/docs/dev.md` / `docs/release.md` | 调试链路（FR-044）/ 发布渠道（FR-046） |
| NEW | `packages/web-cli-plugin/test/*.test.ts` | node 注入面单测（§5.4） |
| NEW | `packages/web-cli-plugin/test/fixtures/site/` | 非 LGDL 试点 fixture 站点（静态声明 + RPC 监听端） |
| NEW | `packages/lgdl-web/src/web-cli-host/host-router.ts` | LGDL 站点协议暴露点：复用保留的 web-cli-base 机制层 + 领域工具注册（从 session.ts 迁移工具面组装） |
| NEW | `packages/lgdl-web/src/web-cli-host/bridge.ts` | postMessage RPC 监听端 + apply 写回通道 |
| NEW | `packages/lgdl-web/src/web-cli-host/declaration.ts` | 静态声明生成/加载 |
| NEW | `packages/lgdl-web/public/.well-known/web-cli.json` | LGDL 站点静态声明 |
| MODIFY | `packages/lgdl-web/index.html` | 增 `<link rel="web-cli" href="web-cli.json">`（相对路径兼容 `base='/LGDL/'`） |
| MODIFY | `packages/lgdl-web/src/App.tsx` | 挂载 `web-cli-host`（波1）；**波3 Gate-D 后**摘除 AiPanel/SettingsPanel/createAiSession 接线 |
| DELETE | `packages/lgdl-web/src/ai/AiPanel.tsx` 等（`AskDialog.tsx`/`SettingsPanel.tsx`/`prompts.ts`/`provider.ts`/`session.ts`） | **波3 Gate-D 达标后**下线（FR-038）；未达标不下线（EC-016） |
| MODIFY | `.sddu/specs-tree-root/specs-tree-web-cli-plugin/state.json` | phase=planned（本文件交付物之一） |
| MODIFY | `.sddu/specs-tree-root/specs-tree-web-cli-plugin/TREE.md` | 目录导航登记 plan.md |
| MODIFY | `ROADMAP.md`（登记面） | v0.8/F-14 推进登记（供 tasks/validate） |

**明确不改动**：`packages/web-cli-base/**`（**零改动**，NFR-005 零回归红线；插件仅 import 消费）；`packages/lgdl-web-cli`/`lgdl-web-op-cli`（不改，由页面侧消费）；base 既有 8 包发布契约；`permission.ts`/`router.ts` 裁决管线本体（插件经 PolicyStrategy/riskDefaults 配置，不加机制）；根 `package.json` workspaces（`packages/*` 自动纳入新包，零改动）。

**新增依赖（单列，不擅自引入；见 ADR-009）**：

| 依赖 | 类型 | 用途 | 理由 |
|------|------|------|------|
| `esbuild` | devDep | content script 打包（MV3 content script 不支持 ESM）+ 扩展产物构建 | 唯一可行打包路径；单依赖、零传递运行时依赖；**待作者确认** |
| `@types/chrome` | devDep | 扩展 API 类型 | 类型安全；**待作者确认** |

> **运行时依赖零新增**（仅 `@lgdl/web-cli-base`，workspace/npm 已有）；上述为**工程/devDep**，符合「零新增运行时依赖」底线（v4 discovery :283 同口径：运行时依赖不增，工程依赖可增）。若作者拒绝，备选：手写最小 chrome API 类型声明（无 `@types/chrome`）+ 用 `tsc` 拼装 + 自写极简 bundle（成本高、不推荐）。

---

## 7. 风险评估

| 风险 | 概率 | 影响 | 缓解措施 |
|------|:--:|:--:|----------|
| **R-001 安全/合规面失控**（越权操作/敏感外泄/账号风控/条款冲突） | 中 | 高 | 门禁先行（background 单一权威点 + fail-closed + 无旁路）；per-origin 授权 + 危险档位强制确认 + 全量审计 + 脱敏；合规评估先行（波0 FR-030）；风控护栏（波2 FR-029） |
| **R-002 MV3 平台约束导致架构返工**（隔离/CSP/跨域/SW 生命周期/权限最小化） | 中 | 高 | 波0 最小验证门（FR-009）先行，逐项 PASS/FAIL/降级；SW 生命周期保活 + 存储恢复；权限按需申请；失败项走降级出口 |
| **R-003 协议标准缺失/逐站点定制** | 中 | 中 | 站点中立描述符 + 双通道发现 + RPC；无逐站点硬编码；最小试点 ≥2 站点验证通用性 |
| **R-004 范围/架构双膨胀（单作者单版本）** | 高 | 高 | 波次切分 + P0 四柱；通用站点优先、LGDL 特化后置；波1 不含通用 DOM 工具面；波2/波3 可顺延；Gate-D 独立里程碑 |
| **R-005 上游基线（v0.7.0 发布 vs F-25/F-26 待合入 main）** | 中 | 中 | 依赖**发布版本 `^0.7.0`**（npm + tag）而非分支；validate 含基线核对；插件不改 base 源码 |
| **R-006 无头加载扩展不可行** | 中 | 中 | ADR-006 降级出口：`--headless=new` 失败 → headful + xvfb / Playwright `launchPersistentContext`；机械面/人工面分离；失败项记 validate |
| **R-007 厂商 CORS/host_permissions 假设不成立**（火山 3 端点） | 中 | 中 | 验证门 G-KEY 先行；失败 → 可读转译「需本地代理/不可直连」（不假装，EC-009）；降级出口明确 |
| **R-008 双份工具面冲突 / 下线回退风险**（R-007 spec 家族） | 中 | 中 | 对象区分 + 冲突检测用例（无双执行/无重复注册）；Gate-D 未达不下线；下线单提交可 revert + 回退预案；过渡期终止时点 |
| **R-009 页面内容注入/伪造结果**（站点 RPC 返回恶意内容诱导） | 中 | 中 | 结果按 `trust:'external'` 处理；不将页面输出解释为指令；脱敏 + 截断；站点声明默认 untrusted；危险档位强制确认 |
| **R-010 content script 与页面脚本冲突**（全局污染/原型修改） | 低 | 中 | isolated world；不挂页面全局；不修改原型链；宿主页零回归断言（FR-007） |
| **R-011 SW 生命周期导致会话/审计丢失** | 中 | 中 | 状态落 `chrome.storage.session/local`；SW 重启恢复；审计落盘先于响应（EC-013） |

---

## 8. 生成的 ADR
> 12 个 ADR，承接 spec §9.7 P-01~P-06 + 作者裁决；状态 ACCEPTED（承接已核签裁决）或 PROPOSED（plan 推荐默认，待作者核签）

| ADR | 标题 | 状态 |
|-----|------|:--:|
| ADR-001 | 协议机制 = 站点中立描述符 + 双通道发现（静态 well-known/HTML link 主 + 运行时 postMessage 握手补）+ postMessage RPC 执行契约（P-01） | PROPOSED |
| ADR-002 | 插件架构 = MV3 三面（background 控制面 + content script 数据面 + side panel/options）（P-02） | PROPOSED |
| ADR-003 | 权限模型 = 插件 PolicyStrategy（授权 origin / untrusted 危险档位 / fail-closed）映射上游 PermissionGate（P-03） | ACCEPTED |
| ADR-004 | 与页内 web-cli-base 衔接 = 桥接 + 对象区分（下线 AI 助手层 / 保留机制层）（P-04） | ACCEPTED |
| ADR-005 | 扩展存储 = chrome.storage.local（key/授权/审计）+ session（运行态）；key 不进页面上下文（P-05） | ACCEPTED |
| ADR-006 | 无头/自动化加载扩展冒烟 = `--headless=new --load-extension` + CDP + fixture 站点（失败降级出口）（P-06） | PROPOSED |
| ADR-007 | 协议中立与 F-13 ② 标准化预留（零 LGDL 私有格式；独立协议文档）（S-013/FR-015） | PROPOSED |
| ADR-008 | 内置助手下线 Gate-D 门槛与执行/回退（O-001/FR-037/038） | ACCEPTED |
| ADR-009 | 独立包与构建/依赖纪律（monorepo `packages/web-cli-plugin`；零运行时新依赖；devDep 单列）（S-004/S-005） | ACCEPTED |
| ADR-010 | 范围可裁剪与波次纪律（P0 四柱；通用站点优先于 LGDL 特化）（R-004） | ACCEPTED |
| ADR-011 | LLM key 与厂商 CORS 处置 = background fetch + host_permissions 验证门 G-KEY（FR-034） | PROPOSED |
| ADR-012 | 单标签绑定与会话生命周期（活跃标签 + 导航失效明示 + 存储恢复）（S-011/EC-011/013） | ACCEPTED |

### ADR-001: 协议机制 = 站点中立描述符 + 双通道发现 + postMessage RPC 执行契约（P-01）

## 状态
PROPOSED（承接 O-002/O-003 + S-013；作者「不预设方案形态」授权 plan 给方案）

## 背景
站点级 web-cli 协议发现/声明机制当前不存在（Q-005/R-003）；spec 只定义最小语义与验收边界（FR-010~016），格式归 plan（NG-002）。作者裁决 O-003「先澄清本质 + 最小试点，不预设形态」，但要求 plan 给出方案（P-01）。LGDL 部署于 GH Pages 子路径（`base='/LGDL/'`），域根 `/.well-known/` 不可达。

## 决策
1. **描述符 schema（`WebCliDescriptor`）**：站点中立最小字段——`protocolVersion` / `tools[]`（id/summary/params/subcommands/riskHint）/ `transport`（首版 `page-message` + channel）/ 可选 `integrity`（sha256）/ `source`（插件填充溯源）。
2. **发现三通道（依序，首个成功即用）**：① `GET <origin>/.well-known/web-cli.json`（根部署，background fetch）；② HTML `<link rel="web-cli" href>` / `<meta name="web-cli">`（子路径/SPA，相对 href 兼容 LGDL）；③ MAIN-world 注入 + `window.postMessage` 运行时握手（动态站点）。三态判定：支持 / 不支持 / 未知或失败（不误报）。
3. **执行 = postMessage RPC**：`web-cli:invoke` / `web-cli:result`；站点在页面世界实现监听端（LGDL 由 `web-cli-host` 实现，通用站点自实现）；超时/取消可读失败。
4. **站点 `riskHint` 仅提示不作裁决依据**；插件按白名单 + 参数形态 + 用户确认复核 effectiveRisk。
5. **协议形态对站点开放**：文档独立可读，不绑定 LGDL 私有格式；为 F-13 ② 预留标准化接口（ADR-007）。

## 后果
任何实现协议的站点（含非 LGDL）可被通用消费端接入（O-002）；LGDL 子路径部署可发现（HTML link）；动态站点可握手；三通道可独立降级。成本：需维护三通道一致性与描述符校验。备选（仅 well-known / 仅握手）分别在子路径部署、页面协作依赖上不可行（§4.2）。

### ADR-002: 插件架构 = MV3 三面（background 控制面 + content script 数据面 + side panel/options）（P-02）

## 状态
PROPOSED（承接 NG-002；plan 技术选型）

## 背景
插件运行时为全新工程领域（零扩展痕迹，R-002）；需在 MV3 约束下确定宿主形态、执行面、UI 面，并保持上游契约 additive（S-005）。

## 决策
1. **background service worker（控制面，`type:'module'`）**：CommandRouter/AgentRunner 宿主；PermissionGate 单一权威裁决点；LLM 调用（扩展源 fetch）；key/授权/审计持久化；`extensionEnv()` 实现 `PlatformEnv`（fetch=扩展 fetch；kv=chrome.storage；dom/events=content script 远程缝，波2+）。
2. **content script（数据面，isolated world）**：协议发现 + postMessage RPC 桥；不持 key、不裁决、不渲染。
3. **side panel**（会话/授权/二次确认/审计）+ **options page**（LLM 配置/迁移/合规）；扩展源页面，不注入宿主页（FR-007 零污染）。
4. **打包**：content script IIFE（esbuild）；background ESM；目标 Chromium ≥ 114。
5. **SW 生命周期**：活跃任务经长连接 + fetch 保活；状态落 `chrome.storage.session/local`，重启恢复。
6. **上游契约保持**：仅 import 消费 base 导出面，零复制/零分叉（FR-002）。

## 后果
安全权威点单一（不可被页面绕过）；key 与页面上下文隔离；跨标签授权/审计一致；MV3 最佳实践。成本：`extensionEnv` 远程缝（波2 通用 DOM 工具面才需）；SW 生命周期管理。备选（content script 宿主 / offscreen）在安全权威分散、key 传页面域、生命周期受限上不可取（§4.1）。

### ADR-003: 权限模型 = 插件 PolicyStrategy 映射上游 PermissionGate（P-03）

## 状态
ACCEPTED（承接 O-008/O-009/O-010 作者裁决 + FR-023~027/NFR-001；上游 PermissionGate additive 复用）

## 背景
上游 PRM 信任模型只覆盖「消费端本地注册工具」（`permission.ts`），无第三方声明面（Q-006）；插件形态下 per-origin 授权/信任/危险档位/fail-closed 需实现映射（spec §9.7 P-03）。

## 决策
1. **授权与信任分离**：`OriginTrustStore`（chrome.storage）记录 per-origin 授权（用户显式 `chrome.permissions.request`）与信任（untrusted 默认 / 用户显式 trusted）；两者独立。
2. **门禁复用上游 PermissionGate 裁决管线**，插件注入三个 `PolicyStrategy`：
   - **S1 OriginAuthorizationStrategy**：目标 origin 未授权 → `deny`（FR-023/EC-004）。
   - **S2 UntrustedDeclaredStrategy**：`namespace='site'` 且 trust≠trusted：write/evaluate/external → `ask`（危险档位强制确认）；read → null（交缺省）；未知/无 risk → `deny`（fail-closed）。
   - **S3 FailClosedStrategy**：`namespace='site'` 且无匹配策略 → `deny`。
3. **riskDefaults**（插件配置）：read→allow；write/external/ui/state→ask；evaluate→deny（沿 `defaultActionForRisk`，不可低于确认）。
4. **ask → onAsk → side panel 二次确认**（操作摘要：站点/工具/子命令/参数摘要/风险档位）；拒绝/超时/取消 → deny（EC-005）+ 审计。
5. **审计**：`AuditSink` 实现落 chrome.storage 环形缓冲；发现/声明读取/授权变更/裁决/执行/确认全量入审计；零明文（FR-025/028）。
6. **无旁路**：全部执行经 `router.dispatch`；无绕过 dispatch 的直执行入口（grep 断言）。

## 后果
站点声明默认 untrusted + 危险档位强制确认 + fail-closed 可测可断言；上游 PRM 语义 additive 复用（零机制改动）；授权/信任分离支持 FR-012。第三方声明面风险受控（Q-006 解）。

### ADR-004: 与页内 web-cli-base 衔接 = 桥接 + 对象区分（P-04）

## 状态
ACCEPTED（承接 O-006↔O-001 对象区分作者裁决 2026-09-10 + FR-004/041）

## 背景
O-001 裁决「v0.8 内代码下线内置助手」与 S-006「页内保留」字面冲突；作者采纳「对象区分」消解（§9.4）：下线对象 = 内置 AI 助手层（AiPanel/session 组装/工具面接线/BYOK）；保留对象 = 页内 web-cli-base 机制层（LGDL 站点协议暴露点/宿主）。插件与页内已运行机制层的关系（复用/桥接/接管）需实现（P-04）。

## 决策
1. **桥接（Bridge）**：LGDL 页保留 web-cli-base 机制层，新增 `packages/lgdl-web/src/web-cli-host/`（`host-router.ts` 复用 CommandRouter + `lgdl-web-cli`/`op-cli` 工具注册；`bridge.ts` postMessage RPC 监听端 + `apply` 写回；`declaration.ts` + `public/.well-known/web-cli.json` + `index.html` link）。插件经 RPC 调用页面执行。
2. **插件零 LGDL 私有依赖**：插件不 import `@lgdl/lgdl-web`/`lgdl-web-cli`/`op-cli`；LGDL 领域命令由页面执行（FR-003）。
3. **写回（FR-020）**：页桥 `apply` 通道（页内 `parseLgdl` 校验 + `onApply`）；无 React 内部状态直连。
4. **通用站点**：站点自实现 RPC 监听端 + 静态声明；插件侧零站点特化。
5. **下线执行（波3/Gate-D）**：移除 `App.tsx` 助手接线 + 归档 `lgdl-web/src/ai/`；保留机制层 + `web-cli-host`（ADR-008）。
6. **冲突检测**：过渡期双份工具面不得双重执行/重复注册（检测用例）。

## 后果
对象区分工程可落地；LGDL app 状态经页面执行可达（opRegistry/onApply）；通用站点同一契约；插件依赖边界干净。备选（插件内重建 router / 接管页面 router）在 app 状态不可达、依赖边界破坏、技术不可行上被否（§4.3）。

### ADR-005: 扩展存储 = chrome.storage.local + session；key 不进页面上下文（P-05）

## 状态
ACCEPTED（承接 S-007 冻结 + FR-033/035/NFR-001）

## 背景
内置助手 key 明文存页面 `localStorage`（`provider.ts`），页面脚本可读；插件形态需扩展源隔离存储（Q-010/P-05）。

## 决策
1. **`chrome.storage.local`**（不用 `sync`）：LLM key/厂商/模型/baseURL、per-origin 授权/信任、审计环形缓冲。
2. **`chrome.storage.session`**：运行态 + 描述符缓存（SW 回收失效，重发现）。
3. **key 仅 background 读取**：从不回传 content script/页面上下文；side panel 显示掩码。
4. **零明文**：key 不进 LLM 上下文/日志/审计（grep 断言）；`llm-config` 输出掩码。
5. **不自动迁移**：不读写内置助手 `lgdl-ai-settings`（grep 断言）；options 手动重配指引（S-015/FR-036）。
6. 加固后置：WebCrypto AES-GCM + 不可导出密钥（首版不做，记录为后续）。

## 后果
key 与页面上下文隔离（FR-035 断言）；授权/审计持久且可查看/撤销/导出；不云同步避免 key 出本机。成本：存储容量需环形/上限管理。

### ADR-006: 无头/自动化加载扩展冒烟（P-06）

## 状态
PROPOSED（承接 FR-009/045；技术选型待验证）

## 背景
v3/v4 已用 chromium headless + CDP + 静态伺服验证页内能力（V13 方法论），但**未验证扩展加载**（Q-017/R-002）；MV3 扩展无头加载可行性未知。

## 决策
1. **主路径**：`chromium --headless=new --disable-extensions-except=dist --load-extension=dist --remote-debugging-port=<p>` + 静态伺服 fixture 站点；CDP `Target.getTargets` 取 `service_worker` target → `Runtime.evaluate` 驱动插件逻辑。
2. **机械面/人工面分离**：机械面 = 扩展加载/SW 可达/content script 注入/发现三态/门禁三路/RPC 往返/审计落库/明文 grep；人工面 = side panel 交互/真实 LLM 闭环。
3. **降级出口**：`--headless=new` 失败 → headful + xvfb（CI）或 Playwright `launchPersistentContext({args:['--load-extension=…']})`；仍失败 → 降级为「仅 node 注入面 + 人工冒烟清单」，记录 validate。
4. **构建前置**：冒烟前先 `npm run build`（esbuild 产物）。

## 后果
扩展链路机械可验证；失败有明确降级出口，不阻塞交付；方法论文档化（FR-045）。

### ADR-007: 协议中立与 F-13 ② 标准化预留（S-013/FR-015）

## 状态
PROPOSED（S-013 待作者核签）

## 背景
F-14 提前至 v0.8 后与 F-13 ② 开源线解耦（ROADMAP:220/296）；若插件协议私有化，未来标准化可能返工（R-005 spec 家族）。

## 决策
1. 协议设计**不绑定 LGDL 私有格式**：descriptor schema/RPC 契约以站点中立语义定义，文档（`docs/protocol.md`）可独立于 LGDL 理解。
2. 为 F-13 ② 预留标准化接口（版本化 schema + 独立文档），**不承诺**开源决策/许可/命名。
3. 协议文档零 LGDL 私有耦合（评审）；F-13 ② 可继承/修订（交接面存在）。

## 后果
长期标准化可继承（R-005 缓解）；插件定位「web-cli 生态通用消费端」自洽。不启动 F-13 ②（NG-005）。

### ADR-008: 内置助手下线 Gate-D 门槛与执行/回退（O-001/FR-037/038）

## 状态
ACCEPTED（承接 O-001 作者裁决 + A-007 无数据风险控制）

## 背景
O-001 裁决「插件就绪后代码下线内置助手」（非默认，不可逆方向）；A-007（存量用户接受迁移）无数据；需明确「何时可下线」与「下线执行纪律/回退」。

## 决策
1. **Gate-D 条件（D-1~D-7）**：能力矩阵达标 / 安全基线全达标 / LGDL 端到端 / 通用站点端到端 / 迁移路径可用 / 回退预案就绪 / 过渡期收敛计划。**未达门槛不得下线**（EC-016）。
2. **下线执行（波3）**：逐条验收 Gate-D → 摘除 App 助手接线 → 归档 `lgdl-web/src/ai/` → 挂载 `web-cli-host` → 迁移/差异文档。
3. **回退预案**：主 = 单提交可 `git revert`（前一版本保留 ai/）；可选临时入口 `VITE_AI_ASSISTANT_FALLBACK`（默认 off + 显式移除时点）；**不长期双份并存**（R-007）。
4. **不静默进入无 AI 可用状态**：前置检查未过保持内置助手。

## 后果
下线有明确门槛与执行纪律；回退风险受控（A-007 无数据下最低要求）；过渡期有终止时点。

### ADR-009: 独立包与构建/依赖纪律（S-004/S-005）

## 状态
ACCEPTED（S-004/S-005 已核签；新增 devDep 待作者确认）

## 背景
S-004 = monorepo 内独立包 + 独立构建产物；S-005 = additive 复用不重写框架；底线 = 零新增运行时依赖，devDep 单列不擅自引入。

## 决策
1. **包形态**：`packages/web-cli-plugin`（monorepo 内独立包，独立构建产物 `dist/`）。
2. **运行时依赖**：仅 `@lgdl/web-cli-base ^0.7.0`；零 LGDL 私有包；零第三方运行时依赖。
3. **新增 devDep（单列，待作者确认）**：`esbuild`（content script 打包，MV3 不支持 content script ESM）+ `@types/chrome`（类型）。理由与备选见 §6。
4. **上游契约**：仅 import 消费 base 导出面；零复制/分叉（grep 断言）；base 零回归。
5. **构建**：`build.mjs`（esbuild）+ manifest/静态资源拷贝；不改根 workspaces（`packages/*` 自动纳入）。

## 后果
插件独立可构建/可移植（NFR-009）；上游零分叉（NFR-005）；依赖面最小且透明。devDep 若被拒 → 手写类型 + tsc 拼装（成本高，不推荐）。

### ADR-010: 范围可裁剪与波次纪律（R-004）

## 状态
ACCEPTED（承接 spec §9.5 + R-004 缓解）

## 背景
O-001（代码下线）+ O-002（通用任意站点）组合使单作者单版本容量压力大（R-004 🔴）。

## 决策
1. **波次**：波0 门槛验证（FR-009/016/022/030 + G-KEY）；波1 P0 四柱（插件可用/安全基线/通用站点闭环/LGDL 等价）；波2 P1 完善；波3 P2 + Gate-D 下线。
2. **P0 四柱**见 §5.3；**通用站点优先于 LGDL 特化**（O-002）。
3. **可裁剪**：波1 内可先交付柱 1+2+3，LGDL 等价（柱 4）作紧接增量；波2/波3 可顺延。
4. **波1 不含通用 DOM 工具面**（`extensionEnv` 远程 dom 缝后置波2），避免膨胀。
5. Gate-D 下线为独立里程碑，不并入任何波次首版。

## 后果
单版本容量可控；最小可用优先；裁剪决策显式可执行。

### ADR-011: LLM key 与厂商 CORS 处置 = background fetch + 验证门 G-KEY（FR-034）

## 状态
PROPOSED（验证门驱动）

## 背景
内置助手 8 厂商中火山 3 端点 `browserDirect=false`（页面 CORS 预检拦 Authorization），缓解承诺「本地代理」未实现（Q-003）；插件形态下扩展 background 是否可直连未知。

## 决策
1. **LLM 调用在 background**（扩展源 fetch，配 `host_permissions` 或 `optional_host_permissions` 申请厂商端点）。
2. **假设**：扩展特权 fetch 不受页面 CORS 预检限制 → 火山 3 端点可能可直连。
3. **验证门 G-KEY（波0）**：真实扩展环境请求火山端点（带 Authorization）→ 成功 = 8 厂商全可用；失败 = 降级出口：可读转译「需本地代理（未实现）/不可直连」（EC-009），**不静默失败**。
4. 厂商表对齐 `provider.ts` 语义（独立实现，不 import lgdl-web）。

## 后果
8 厂商可用性有明确结论（FR-034/AC-007）；CORS 假设失败有可读降级，不阻塞其他能力。

### ADR-012: 单标签绑定与会话生命周期（S-011/EC-011/013）

## 状态
ACCEPTED（S-011 已核签冻结）

## 背景
多站点/跨标签上下文模型未定（Q-014）；S-011 = 首版单标签绑定；EC-011 导航失效；EC-013 崩溃/更新/降级。

## 决策
1. **单标签绑定**：Controller 绑定当前活动标签；切换标签 → 会话上下文切换（不静默续接他标签）。
2. **导航失效明示**：整页导航/reload → content script 重建 → 会话上下文失效 + 需重新授权/重连（可读提示，不静默续接）；SPA 会话内导航保持。
3. **存储恢复**：运行态落 `chrome.storage.session`，持久态落 `local`；SW 回收/扩展更新后恢复会话与审计（EC-013）；审计不丢。
4. **多标签/跨标签**归后续（NG-008/S-011）。

## 后果
首版上下文模型明确、可测；导航失效不误当 bug（帮助面/提示）；崩溃/更新会话可恢复或明示丢失。

---

## 9. 任务切分建议（sddu-tasks 输入；tasks.json/tasks.md 由 sddu-tasks 产出）
> 可并行原子任务块划分建议（含依赖提示），不替代 sddu-tasks 的依赖拓扑/验收细化。

| 任务块 | 内容 | 关联 | 建议波 | 依赖 |
|---|---|---|---|---|
| TB-0A | MV3 平台约束最小验证门 spike（隔离/CSP/跨域/权限/无头加载）+ 结论记录 | FR-009/045 + ADR-006 | 波0 | 无（先行） |
| TB-0B | 协议本质澄清 + 最小试点（LGDL 页 + 非 LGDL fixture 站点）端到端记录 | FR-016 + ADR-001 | 波0 | 无 |
| TB-0C | 能力对照矩阵（内置助手 20+ 工具 ↔ 插件）+ 站点合规评估 | FR-022/030 | 波0 | 无 |
| TB-0D | G-KEY 验证门（扩展 background 请求火山端点） | FR-034 + ADR-011 | 波0 | TB-0A |
| TB-A | 工程骨架：`packages/web-cli-plugin` 包 + manifest + tsconfig + `build.mjs` + 三面空入口 | FR-001/003/005/006 + ADR-009 | 波1 | 无 |
| TB-B | 协议层：`protocol/descriptor|version|trust|rpc`（纯逻辑 node 可测） | FR-011/012/013 + ADR-001 | 波1 | 无（可并行） |
| TB-C | 发现层：`discovery/*`（三通道 + 三态 + 失败降级） | FR-010/014 + ADR-001 | 波1 | TB-B |
| TB-D | 安全层：`security/origin-store|policy|confirm|audit-sink|redact` | FR-023~028 + ADR-003/005 | 波1 | TB-B（策略引用声明工具语义） |
| TB-E | 宿主层：`background/host|controller|service-worker|messaging` + `platform/extension-env` | FR-017/005 + ADR-002 | 波1 | TB-A/D |
| TB-F | 工具层：`tools/declared-tools|admin-tools` | FR-011/023 + ADR-003 | 波1 | TB-B/D/E |
| TB-G | KEY 层：`llm/providers|key-store` + options 设置 | FR-033/035 + ADR-005/011 | 波1 | TB-A |
| TB-H | content script：`content/content-script|page-bridge`（RPC 桥） | FR-007/011 + ADR-001/004 | 波1 | TB-B/C |
| TB-I | side panel：chat/授权/二次确认/审计查看 | FR-017/024/025 + ADR-002 | 波1 | TB-D/E/F |
| TB-J | LGDL 暴露点：`lgdl-web/src/web-cli-host/*` + 静态声明 + index.html link | FR-041/042/020 + ADR-004 | 波1 | TB-B/H |
| TB-K | 通用性验证（非 LGDL fixture 端到端）+ 双份工具面冲突检测 | FR-043/004 + ADR-004 | 波1 | TB-H/J |
| TB-L | 波1 收口：明文/旁路/依赖/扩展痕迹 grep + base 零回归 + 冒烟清单 + validate 移交 | FR-002/NFR-001/005/006 | 波1 末 | 全部波1 |
| TB-M | 协议完善（版本/中立文档/失败降级补强） | FR-013/015/014 | 波2 | TB-B/C |
| TB-N | UI 操作 + 事件消费（op-cli RPC + 事件桥） | FR-019/021 | 波2 | TB-H/J |
| TB-O | 风控护栏 + 合规告知/边界文档 + 迁移/过渡期文档 | FR-029/031/032/036/039/040 | 波2 | TB-D/I |
| TB-P | 调试链路 + 冒烟方法论文档（FR-044/045） | FR-044/045 + ADR-006 | 波2 | TB-0A/L |
| TB-Q | （可选）通用 DOM 工具面：`content/dom-agent` + `extensionEnv` 远程 dom 缝 | NFR-007 延伸 | 波2 | TB-E/H |
| TB-R | 发布渠道定义 + **Gate-D 下线执行**（严格前置） | FR-046/038/037 + ADR-008 | 波3 | 全部 + Gate-D 全达标 |

**并行组摘要（build 可同时开工）**：波0 = TB-0A/0B/0C 并行 → TB-0D；波1 = TB-A/B/G 并行 → TB-C/D → TB-E → TB-F/H/I 并行 → TB-J → TB-K → TB-L；波2 = TB-M/N/O/P 并行（TB-Q 可选）；波3 = TB-R（Gate-D 前置）。

**同文件/跨波次所有权提示（供 sddu-tasks 合并）**：`background/service-worker.ts` + `messaging.ts`（TB-A 建、TB-E 填充、TB-F/I 接线）与 `manifest.json`（TB-A/TB-H）存在跨块写；`lgdl-web/src/App.tsx`（TB-J 挂载、TB-R 摘除）跨波次串行；`packages/lgdl-web/src/ai/*` 仅在 TB-R 删除。建议 sddu-tasks 按「文件所有权 + 依赖拓扑」合并（v4 TASK-004/011 先例）。

---

## 10. 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建：以 spec.md v1.1（46 FR 十组 + 10 NFR + 16 EC + 12 AC）+ discovery.md v1.1（Q/A/R/O）+ 作者裁决（O-001 代码下线 / O-002 通用任意站点优先 / O-003 不预设形态但 plan 给方案 / O-008/O-009/O-010 安全红线 / O-006↔O-001 对象区分；S-004/S-005/S-007/S-011/S-015 核签冻结）为红线输入；给出插件工程拓扑（monorepo 内独立包 `packages/web-cli-plugin`）、协议机制（站点中立描述符 schema + 双通道发现 + postMessage RPC 执行）、MV3 三面架构（background 控制面 / content script 数据面 / side panel+options）、权限模型映射（三 PolicyStrategy + riskDefaults + fail-closed + onAsk 二次确认）、对象区分下的桥接与 Gate-D 下线执行/回退设计、存储载体（chrome.storage.local + session，key 隔离）；46 FR → 模块/文件/波次落位总表（P0 最小可用四根柱子）+ 波次与裁剪；方案对比 3 主题（宿主形态 / 发现载体 / 衔接方式）× 3 方案 + 推荐；技术开放点 P-01~P-06 全部采纳推荐默认并落 ADR；12 ADR（ACCEPTED 7 / PROPOSED 5，正文内嵌 §8）；文件影响面（新增独立包 ~35 文件 + LGDL 暴露点 + 下线面；零运行时新依赖，devDep `esbuild`+`@types/chrome` 单列待作者确认）；风险 11 项 + 缓解；任务切分建议 TB-0A~TB-R（§9，tasks 产出归 sddu-tasks） | 2026-09-11 | SDDU Plan Agent |
