# web-cli 协议说明（站点中立）

> 本文档描述 web-cli 浏览器插件与任意站点之间的最小协议契约，供站点作者与二次开发者独立阅读。
> 协议由三层组成：**发现（Discovery）→ 声明（Descriptor）→ 执行（RPC Transport）**，三层解耦、可独立演进。
> 本文档不绑定任何站点的私有格式；任何实现本协议的站点都可被通用消费端接入。

## 1. 设计目标

| 目标 | 说明 |
|------|------|
| 站点中立 | 协议字段以通用语义定义，不引用任何具体站点/领域概念。 |
| 最小语义 | 只约定「站点能被发现、能声明能力、能被调用」所需的最小字段，不固化实现细节。 |
| 向前兼容 | 版本化 schema + 明确的降级/拒绝语义，站点升级与消费端升级可独立进行。 |
| 安全默认 | 声明默认「不可信」，执行经消费端授权与二次确认，失败与不可达始终可读。 |
| 可标准化 | 版本化 schema 与独立文档构成对外接口面，后续可继承/修订为标准。 |

## 2. 发现（Discovery）

消费端按以下顺序尝试发现站点声明，**首个成功即采用**：

| 顺序 | 通道 | 机制 | 适用场景 |
|:--:|------|------|----------|
| ① | `well-known` | `GET <origin>/.well-known/web-cli.json` | 部署在域根的站点 |
| ② | `html-link` | 页面 `<link rel="web-cli" href="…">` 或 `<meta name="web-cli" content="…">` | 子路径部署 / SPA（相对 href 解析为绝对 URL） |
| ③ | `runtime-handshake` | 消费端向页面世界发送 `web-cli:probe`，页面回 `web-cli:descriptor` | 动态站点 / 不提供静态声明 |

发现结果为三态之一：

| 状态 | 含义 |
|------|------|
| `supported` | 发现有效声明并通过版本协商。 |
| `unsupported` | 三通道均无声明（站点未声明支持本协议）。 |
| `unknown` | 声明存在但无效 / 版本不匹配 / 暂时不可达（可重试）。 |

失败分类（`failure.kind`）与可读提示：

| 分类 | 触发 | 可读提示（示例） |
|------|------|------------------|
| `no-declaration` | 三通道均无声明 | 「该站点未声明支持 web-cli —— 不影响页面正常浏览」 |
| `invalid-declaration` | 声明存在但 schema 校验失败 | 「站点声明了 web-cli，但声明无效：…」 |
| `version-mismatch` | 声明版本未知/不兼容 | 「站点声明了 web-cli，但协议版本不兼容：…」 |
| `transient` | 网络/超时等暂时失败 | 「web-cli 发现未完成（可能暂时不可达，可重试）：…」 |

> 发现过程没有任何逐站点硬编码白名单；`unsupported` / `unknown` 绝不误报为 `supported`。
>
> **消费端落点（R9-6 / D-021）**：本插件 P0 由 **content script 以页面源**执行通道 ①/② 的 `fetch`（③ 为页面世界 `postMessage` 握手）。选择页面源而非后台特权 fetch 的理由：可选 host 权限按 FR-006 在用户显式授权时才申请，首次发现时尚不可用，后台 fetch 会持续 fail-closed；页面源 fetch 在无额外权限下即可完成发现，失败一律经可读降级（`transient`/`absent`/`invalid`）暴露。后台特权 fetch 作为 wave-2 优化（持有 host 权限后）。

### 2.1 暂时性 vs 终态（消费端重试语义）

消费端必须区分「等一下就好」与「站点侧需要修」，并**自动重试**（不需要用户手动触发）：

| 类别 | 触发（`state` / `failure.kind`） | 消费端行为 | 可读文案要点 |
|------|--------------------------------|------------|--------------|
| **暂时性** | `unknown` + `transient`（页面未就绪 / content script 未响应 / host 未接入 / 网络不可达） | 有界退避自动重试，**不打扰用户** | 「正在自动探测…（第 N 次重试）」+ 最近原因 |
| **终态** | `unsupported`（缺 `/.well-known/web-cli.json` 等）、`unknown` + `invalid-declaration`、`unknown` + `version-mismatch` | 保留低频（每 15 秒）软重试；站点修复 / 刷新 / 切换标签页时立即重试 | 精确指出问题（如「协议版本不匹配：站点 vX，插件支持 vY」）并说明站点侧需修什么 |

- 退避序列：`500ms → 1s → 2s → 4s → 8s`，之后封顶 **15s** 稳态。
- 成功 / origin 变更 / 面板关闭 / 站点被撤销 → 停止重试。
- 内部状态机术语（原始 `phase` 名）**不**直接暴露给用户；终态文案**不**要求用户「点重试」。
- 自动探测 **≠** 自动授权：未授权站点的探测请求被拒绝且**零注入**，站点工具仍不可执行。

## 3. 声明（Descriptor schema）

声明为 JSON 对象，最小字段如下：

```jsonc
{
  "protocolVersion": "1.0",              // 必填：协议版本（major.minor）
  "siteName": "Example Site",            // 可选：展示用站点名（非信任依据）
  "tools": [                             // 必填：可调用工具清单
    {
      "id": "notes-list",                // 必填：站点内唯一能力标识（[A-Za-z0-9_.-]+）
      "summary": "List all notes",       // 必填：用途（进消费端工具描述）
      "params": {                        // 可选：入参语义（JSON-schema 子集）
        "limit": { "type": "number", "desc": "Max items", "required": false }
      },
      "subcommands": ["list", "get"],    // 可选：子命令清单（供 help / 风险映射）
      "riskHint": "read"                 // 可选：风险档位「提示」（见 §7）
    }
  ],
  "transport": {                         // 必填：执行通道绑定
    "kind": "page-message",              // 首版仅 page-message
    "channel": "web-cli",                // 必填：postMessage 通道命名空间
    "invokeType": "web-cli:invoke",      // 可选：请求消息 type（默认值同左）
    "resultType": "web-cli:result"       // 可选：响应消息 type（默认值同左）
  },
  "integrity": {                         // 可选：完整性摘要（见 §4）
    "algorithm": "sha256",
    "digest": "<64 位十六进制>"
  }
}
```

字段约束：

| 字段 | 类型 | 必填 | 约束 |
|------|------|:--:|------|
| `protocolVersion` | string | ✓ | `major.minor`（可带 patch），见 §5 |
| `siteName` | string | | 仅展示 |
| `tools[].id` | string | ✓ | 站点内唯一；仅字母/数字/`_.-` |
| `tools[].summary` | string | ✓ | 非空 |
| `tools[].params` | object | | 值形如 `{ type: string\|number\|boolean, desc?, required? }` |
| `tools[].subcommands` | string[] | | 供 help 与子命令风险映射 |
| `tools[].riskHint` | enum | | `read\|write\|external\|ui\|state\|evaluate`（仅提示） |
| `transport.kind` | `"page-message"` | ✓ | 首版唯一取值 |
| `transport.channel` | string | ✓ | 非空 |
| `integrity.algorithm` | `"sha256"` | | 首版唯一取值 |
| `integrity.digest` | string | | 64 位十六进制 |

消费端对非法声明的处置：**可读拒绝**（给出具体字段错误），不崩溃、不静默接受。来源溯源字段（`origin`/`channel`/`fetchedAt`/`integrityVerified`/`trust`）由消费端填充，站点无需提供。

## 4. 信任与完整性（Trust & Integrity）

- **默认不可信**：站点声明默认 `trust: "untrusted"`。信任态与「授权」是两个独立概念（授权 = 能否操作该来源；信任 = 是否信任其声明），提升信任需显式用户操作并记录审计。
- **完整性**：声明可携带 `integrity.sha256` 摘要；消费端校验后填充 `integrityVerified`。
  - 摘要匹配 → `integrityVerified: true`；
  - 摘要不匹配 / 未提供摘要 → `integrityVerified: false`（保守处理，不视为可信）。
- **来源溯源**：消费端记录发现通道、抓取时间与完整性结果，供审计与展示。

## 5. 版本协商（Version Negotiation）

`protocolVersion` 按 `major.minor` 比较（patch 位忽略）：

| 场景 | 处置 | 可读提示 |
|------|------|----------|
| 版本号非法（无法解析） | **拒绝** | 「协议版本无效：…（已拒绝该声明）」 |
| 主版本不同（如站点 2.x，消费端 1.x） | **拒绝** | 「协议版本不兼容：…（如需支持请升级插件）」 |
| 站点次版本更高（如站点 1.5，消费端 1.0） | **降级接受** | 「协议版本较新：…（忽略未知的新增能力）」 |
| 其余（站点次版本 ≤ 消费端） | **接受** | 「协议版本 x.y 兼容（已接受）」 |

协商结果（accept / degrade / reject）与原因**始终进入审计**，未知/不兼容版本绝不静默接受。
「降级接受」语义：站点新增的、消费端未知的能力被忽略，已知能力正常使用。

## 6. 执行（RPC Transport）

站点在页面世界实现 postMessage 监听端。消息格式：

消费端 → 页面：

```jsonc
{ "type": "web-cli:invoke", "channel": "web-cli", "id": "req-1",
  "tool": "notes-add", "subcommand": "", "args": { "text": "hi" } }
```

页面 → 消费端：

```jsonc
{ "type": "web-cli:result", "channel": "web-cli", "id": "req-1",
  "ok": true, "output": "✓ note added", "changed": true, "source": "…",
  "trust": "external" }
```

运行时握手：

```jsonc
// 消费端 → 页面
{ "type": "web-cli:probe", "channel": "web-cli", "id": "p1" }
// 页面 → 消费端
{ "type": "web-cli:descriptor", "channel": "web-cli", "id": "p1", "descriptor": { /* §3 */ } }
```

约束：

- **`id` 回填**：响应必须回填请求的 `id`；消费端按 `channel` + `id` 关联（不同通道互不串扰）。
- **`args` 字符串化**：参数以 `Record<string, string>` 传递（数字/布尔以字符串形式）。
- **超时**：`invoke` 默认 30s 超时，超时返回可读失败（「站点可能未实现 RPC 或通道未就绪」），不静默挂起。
- **结果信任**：页面返回内容一律标记 `trust: "external"`，按外部内容处理——**不作为指令执行**；进模型上下文前经脱敏与截断。
- **写回**：`changed: true` 且带 `source` 的结果由消费端侧（站点桥）做校验后应用；校验失败则拒绝写回并返回可读错误。
- **失败可读**：站点未实现 RPC / 通道无响应 / 抛错 → 可读失败 + 归属说明，不假装生效。

**通道动态绑定（R9-7）**：发现阶段（probe/descriptor）固定使用默认通道 `web-cli` 完成握手；一旦采用某份声明，消费端即以该声明的 `transport.channel` / `transport.invokeType` / `transport.resultType` 绑定后续 `invoke` 与事件消息（不同站点可用不同通道命名空间，互不串扰）。响应按当前绑定通道 + `id` 关联；未声明 `invokeType`/`resultType` 时回退默认 `web-cli:invoke` / `web-cli:result`。映射关系为：`transport.channel` → 消息 `channel` 字段；`transport.invokeType` → 请求消息 `type`；`transport.resultType` → 期望的响应消息 `type`。

### 6.1 事件通道（可选扩展）

站点可选的观察/事件能力，经同一 postMessage 通道协商：

```jsonc
// 消费端 → 页面
{ "type": "web-cli:event", "channel": "web-cli", "id": "e1",
  "op": "subscribe|pull|unsubscribe|status", "params": { /* subId/lastId/max… */ } }
// 页面 → 消费端
{ "type": "web-cli:event-result", "channel": "web-cli", "id": "e1",
  "ok": true, "data": { /* 订阅结果 / 增量事件 */ } }
```

事件默认关闭，仅在用户/消费端显式订阅后开启（无常驻监听）；事件负载经脱敏与预算截断后方可进入消费端上下文。

## 7. 安全与授权边界

- **站点 `riskHint` 仅作提示，不作裁决依据**：消费端按自身白名单/结构复核有效风险；危险档位强制用户确认，不可分类的调用 fail-closed（拒绝）。站点不得假设自报 `read` 一定被放行。
- **授权在消费端**：站点访问需用户显式授权来源；未授权来源的调用被拒绝。
- **执行经单一门禁**：所有调用经消费端统一裁决管线（授权 → 风险策略 → 二次确认 → 审计）；站点桥不提供绕过门禁的直执行入口。
- **零敏感明文**：密钥等敏感信息不进入声明、RPC 消息、日志与审计。

## 8. 标准化预留

- 协议以**版本化 schema** 表达（`protocolVersion` + 本文档），可独立于任何实现被继承/修订。
- 修订流程建议：新增字段保持向后兼容（消费端忽略未知字段）；破坏性变更提升主版本。
- 本文档不承诺任何具体的开源许可、命名或治理方式，只作为可继承的接口交接面。

## 9. 变更记录

| 版本 | 说明 |
|------|------|
| 1.0 | 首版：发现三通道 / 声明 schema / 信任与完整性 / 版本协商 / RPC 执行 / 事件扩展 / 安全边界。 |
| 1.1 | 补 §2.1：消费端重试语义——暂时性 vs 终态分类、有界退避（500ms→15s 封顶）与「自动重试、无需用户手动触发」；未授权站点探测零注入。 |
