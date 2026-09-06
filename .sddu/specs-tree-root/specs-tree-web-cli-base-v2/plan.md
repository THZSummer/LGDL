# 技术计划：specs-tree-web-cli-base-v2（web-cli-base v2：面向浏览器生态位的 agent 能力完备化——九域浏览器原生工具集 + 增强/进阶层机制）

> **文档定位**: SDDU 技术方案 — 记录架构设计、方案对比和 ADR，作为 tasks 阶段的输入
> **前置依赖**: spec.md v1.0（46 FR 十三组 REG/PRM/DOC/STR/SRC/NET/DOM/EXE/TSK/SES/EXT/LGDL/BSL + 10 NFR + 15 EC + 12 AC，S-01~S-09 已裁）+ discovery.md v1.1（Q-001~Q-013 / §3.3 映射表 / §3.4 九域 / §3.5 不可承载面 / §3.6 衔接点）+ F-23 上游产物（spec/plan/build，phase=validated）+ 代码实测（packages/web-cli-base/src/ 13 文件 + lgdl-web ai/session.ts）
> **创建人**: SDDU Plan Agent
> **创建时间**: 2026-09-06
> **版本**: v1.0
> **更新人**: SDDU Plan Agent
> **更新时间**: 2026-09-06
> **更新说明**: 初始创建（spec 已裁决策 S-01~S-09 全量落到技术方案；F-23 契约 additive 保持零回归；九域模块划分 + 8 项 ADR + 波次交接）

---

## 1. 前置检查

> 启动技术规划前必须验证的前置条件

| 检查项 | 状态 |
|--------|:--:|
| spec.md 存在 | ✅（`.sddu/specs-tree-root/specs-tree-web-cli-base-v2/spec.md`，342 行，46 FR/10 NFR/15 EC/12 AC + D-5/D-6/A-01~A-04 已闭环 + S-01~S-09 已裁） |
| discovery.md 存在 | ✅（343 行，Q-001~Q-013 / 六大组映射 A-F / 九域 25+ 候选 / 不可承载面 / 衔接点 / O-001~O-008） |
| 外部 API 文档缓存 | ⚠️ 不适用（spec 无 base 内置外部服务：web-search / MCP / exec-remote 端点与凭据均为**场景注入**，base 零内置端点零内置 key NFR-002；llm 依赖 openai/anthropic SDK 为既有依赖，不新增外部服务） |
| 输出模板 | ⚠️ **用户自定义模板缺失**：`.sddu/templates/agents/output/sddu-plan.md.hbs` 不存在；**插件内置模板存在**：`.opencode/plugins/sddu/templates/output/sddu-plan.md.hbs`（79 行 8 章骨架）。本 plan 按内置模板骨架 + F-23 plan（specs-tree-web-cli-base-framework/plan.md，587 行）既有格式衔接 |
| 前置依赖已满足 | ✅（F-23 phase=validated 随 v0.6.0 发布：CommandRouter/ToolEntry/AgentRunner/DelayGate + lgdl-web session 单一组装点；base 现有 5 工具与 4 测试文件已实测核实，见 §2.1） |

**基线核实说明**：本 plan 全部 `文件:行号` 基于 2026-09-06 对实际源码的只读核实（与 discovery/spec 基线一致，并作如下补充确认，后续 tasks 以实测为准）：
1. **ToolEntry 现契约 9 字段**（router.ts:39-56：name/summary/schema/prefix/executor/help/delayMs/listed）——v2 全部新能力以**追加字段**接入（group/namespace/enabled/risk 等，缺省兼容 FR-043）；ToolResult（router.ts:59-68：ok/output/changed/source/error）与 ToolContext（:71-75：docId/source + index 签名 `[k:string]:unknown`）同样 additive（trust/ctx.services 走扩展位）；
2. **dispatch 同步链现状**（router.ts:259-272）：查条目 → 未注册报错 → delay gate（entry.delayMs ?? 全局，:264-265）→ 执行器 → 异常转 ok:false——**权限门禁（FR-005）插入点为查条目/启用态之后、delay gate 之前**（deny/ask 短路不应产生 delay 等待，且执行器零改动）；
3. **注册表两段平铺现状**（router.ts:104-106 business Map 注册序 + builtins Map 固定序；:131-135 构造自动注册 3 内建）——v2 命名空间/动态源/卸载在**同一 CommandRouter 内扩展**（ADR-001），不另起分发路径（FR-043）；
4. **deriveTools 顺序契约现状**（router.ts:200-205 = names() 业务注册序 + 内建置末；router.test.ts:153 断言 `['biz-1','biz-2','web-fetch','sleep','web-cli-help']`）——v2 分组/命名空间/开关派生**保持该相对顺序**（组内注册序 + 内建置末延续 FR-001/AC-005）；
5. **runner 循环**（runner.ts:88-207）：turns 内部维护（:92）、hooks 2（intercept/onToolDone :50-55）、事件 8（:30-47）——v2 会话恢复/上下文压缩经**场景 chat 闭包 + session store**承接，runner 主体**零改动**（FR-034/035 的 runner 集成面 = chat 闭包 pre/post 处理，见 ADR-007）；
6. **lgdl-web 单一组装点**（ai/session.ts:54-93）：router delayMs=600（:56）+ 注册 2 业务工具（:57-58）+ runAgent 装配（chatFn schema 供给 = router.deriveTools() :73-78、dispatch ctx 组装 {docId, source} :82-89）——v2 默认注册矩阵/env 绑定/ask 桥/服务注入全部挂此组装点（FR-039~042）；
7. **web-fetch 执行器**（web-fetch.ts:54-79）fetch 原文返回（schema tools.ts:12-48，仅 path 必填）——v2 升级**保持缺省行为与 schema 兼容**（新增参数可选，FR-018/AC）；
8. **test 脚本**：base = `tsc src/*.test.ts` 通配（package.json:16）——**新测试文件必须平铺 src/ 根**（子目录不进通配），本 plan 全部域工具模块平铺于 src 根（§5）；
9. **F-23 遗留 ⏭️**：真实 AI 闭环 AC-008 + testConnection 未闭合（validate-report.md:181-183）——v2 以**真实浏览器闭环为前置人工基线**（FR-045），plan 将其列为 validate 前置步骤与 P0 波次入口。

---

## 2. 架构分析

> 分析现有架构影响和需要的新组件

### 2.1 现状基线（F-23 后，已核实）

```
packages/web-cli-base/src/         （domain-neutral，零 lgdl/react 依赖，NFR-001 延续）
  router.ts   CommandRouter：注册表(业务+内建两段) / dispatch(含 delay gate) /
              deriveTools / deriveCommand / listHelp / helpFor   ★ F-23
  delay.ts    DelayGate + Clock（命令间最小间隔，sleep 条目 delayMs:0 免除）★ F-23
  runner.ts   AgentRunner 中性循环（事件 8 + hooks 2，零 react）★ F-23
  web-fetch.ts / sleep.ts / tools.ts / help.ts / llm.ts / exec.ts /
  commands.ts / operations.ts / protocol.ts      （机制壳 + 3 内建 schema）
  index.ts    导出面（router/delay/runner 类型与工厂）

工具面 = 5：lgdl-web-cli（业务 17 子命令）/ lgdl-web-op-cli（业务 19 子命令）/
            web-fetch / sleep / web-cli-help（base 内建）
场景面 = lgdl-web ai/session.ts（唯一组装点）+ AiPanel/App（渲染/回调 C 档）
```

**v2 缺口映射（本 plan 设计输入）**：九域工具零覆盖（§3.4）；无权限门禁（Q-005）；无状态/任务/会话（Q-006）；无扩展生态位（Q-007）；lgdl-web 接入面未定（Q-011）。能力全部落在**浏览器生态位**（OPFS/IDB/Worker/fetch/DOM/Permissions/Notification/Clipboard/File System Access），OS 形态工具名不进入（D-5/D-6）。

### 2.2 目标架构分层（v2 模块划分）

```
┌──────────────────────────────────────────────────────────────────┐
│ lgdl-web 场景壳（React UI / LGDL C 档不动；NG-008 UI 归场景）         │
│   ai/session.ts     单一组装点扩展：默认注册矩阵 + env 绑定 + ask 桥   │
│                       + services 注入 + 会话恢复入口（FR-039~042）     │
│   AiPanel / SettingsPanel / AskDialog（新增，场景 React 裁决 UI）     │
├──────────────────────────────────────────────────────────────────┤
│ web-cli-base —— 机制层（P0 横切四柱，全部 additive 零回归）           │
│   router.ts         注册表 v2：namespace/group/enabled/动态注册/      │
│                     卸载/查询/全限定名键/禁用三链（FR-001~004）        │
│   permission.ts     PermissionGate 框架级策略评估 + ask 契约 + 裁决    │
│                     审计（FR-005~008/EC-001/002/014）★ NEW           │
│   audit.ts          AuditSink 事件面（权限/调用/扩展注册/上下文压缩）   │
│                     （FR-009/010/NFR-003/009）★ NEW                 │
│   platform.ts       PlatformEnv 浏览器能力适配器 + browserEnv/nodeEnv │
│                     （DI 缝：fetch/storage/kv/clipboard/notify/       │
│                       filePicker/worker/dom/permissions/search）★ NEW │
├──────────────────────────────────────────────────────────────────┤
│ web-cli-base —— 域工具层（每域 1~N 平铺模块 = entry 工厂 + schema +    │
│                   executor + help，经 assembly 注册即得）             │
│   DOC  doc-tools.ts         doc-read/doc-edit（内容对象读写，非路径）  │
│   STR  storage-tools.ts     storage/storage-quota（OPFS+IDB 卷语义）  │
│        settings.ts          settings 通用 KV（可注入后端）            │
│        storage-opfs.ts / storage-idb.ts / storage-mem.ts  载体后端   │
│   SRC  search-tools.ts      search-content/list-resources（内容集）   │
│   NET  web-fetch.ts(M)      HTML→MD 清洗(默认关)/untrusted/护栏/分类  │
│        web-search.ts        web-search（端点注入，未配置禁用）         │
│        save-file.ts         save/download（FSA+下载链）              │
│        stream.ts            ws/eventsource（P2，可裁剪）             │
│   DOM  dom-tools.ts         dom-* 通用子命令族（同源宿主页）          │
│        ask-user.ts          ask-user（任务内澄清，场景应答器注入）     │
│        notify.ts / clipboard.ts  通知/剪贴板（浏览器适配器 + 转译）   │
│   EXE  eval-tools.ts        eval-js/eval-wasm（worker 执行器注入）    │
│        exec-remote.ts       exec-remote 代理桥预留契约（P2）         │
│        worker-session.ts    worker 持久执行上下文（P2）              │
│   TSK  todo.ts / goal.ts / jobs.ts / subagent.ts / workflow.ts(P2)  │
│   SES  session-store.ts     会话持久化存储（IDB + 冲突标记）          │
│        session-tool.ts / context-tool.ts  会话恢复 / 上下文压缩      │
│   EXT  skill-loader.ts      SKILL.md 加载（frontmatter+提示注入）     │
│        mcp-client.ts        MCP Streamable HTTP 客户端（P2 试点）    │
│   ──────────────────────────────────────────────────────────────    │
│   assembly.ts        默认目录/矩阵组装器（域→group 目录 + 顺序 +      │
│                      enable 集 + namespace 次序；场景选域即得）       │
└──────────────────────────────────────────────────────────────────┘
依赖方向（不变，单向无环 NFR-002）：业务包 → base；base 零业务依赖（NFR-001）
```

**分层原则**：机制层（router/permission/audit/platform/assembly）零浏览器 import 假设（全部经 PlatformEnv 注入，node 面可测）；域工具层每个模块 = `createXxxTool(env, deps): ToolEntry` 工厂，executor 只经 PlatformEnv/ctx 触碰浏览器能力（**双轨测试缝**，NFR-006）。

### 2.3 与 F-23 的扩展接口（本 plan 核心，FR-043 红线）

#### 2.3.1 ToolEntry additive 字段（router.ts:39-56 追加，缺省全兼容）

```ts
export interface ToolEntry {
  /* …F-23 既有 9 字段（name/summary/schema/prefix/executor/help/delayMs/listed）逐字节保持… */
  // v2 追加（FR-001/002/004/043；缺省 = 与旧行为完全一致）：
  group?: string;        // 目录分组（help 一览按组分节；缺省按命名空间归组 → 再缺省 'general'）
  namespace?: string;    // 命名空间（'' 顶层业务 / 内建；skill / mcp / ext: 动态源）；缺省 ''（顶层）
  enabled?: boolean;     // 工具开关声明（缺省 true；FR-004）
  risk?: ToolRisk;       // 敏感面分类提示（'read'|'write'|'external'|'ui'|'state'；供 PRM 默认取向参考，非裁决本身）
}
export type ToolRisk = 'read' | 'write' | 'external' | 'ui' | 'state';
```

**注册键与三链派生**（FR-002/FR-043）：注册表键 = **全限定名** `ns.name`（namespace 为空时 = `name`，与 F-23 完全一致）；schema function.name / dispatch 键 / help 查询键三链一致使用全限定名；文本前缀 = 全限定名（`skill.search --query x` 可逆解析回 `{namespace:'skill', name:'search'}`）；**同基名不同命名空间可共存**（`search` vs `skill.search`），顶层 5 工具无命名空间零回归。

```ts
export interface RegisterOptions {
  /** 动态源标识（skill:/mcp:/ext:…）；FR-038 审计 + FR-008 allowed-tools 门禁输入 */
  source?: string;
  /** 技能级 allowed-tools（WorkBuddy 生态位）：声明该源允许的工具全限定名集 */
  allowedTools?: string[];
}
export class CommandRouter {
  // FR-003 运行时动态注册/卸载/查询（EC-010 沿 EC-003 语义）
  register(entry: ToolEntry, opts?: RegisterOptions): this;
  unregister(name: string): boolean;                 // 卸载 → 三链即时消失
  query(filter?: { namespace?: string; group?: string; name?: string; enabled?: boolean }): ToolEntry[];
  // FR-004 启用集（场景组装时声明）：router.setEnabled(names/namespaces/groups 或 keep 语义）
  enabledTools(names: Iterable<string>): void;       // 白名单式；缺省全启用
  // FR-001 分组派生（默认全量 = 原 deriveTools 顺序）
  deriveTools(opts?: { group?: string; namespace?: string; grouped?: boolean }): LlmToolDef[];
  // FR-002 命名空间次序（可配置）：setNamespaceOrder([...])；缺省 = 首次注册序
  setNamespaceOrder(ns: string[]): void;
}
```

#### 2.3.2 权限挂点（PermissionGate 插入 dispatch，FR-005 与 delay gate 同层先于执行器）

```
dispatch(tc, ctx)
  ├─ 1 查条目（全限定名）→ 未注册 ok:false（F-23 EC-001 文案保持）
  ├─ 2 enabled 检查 → 已禁用显式错误（EC-001「已禁用」文案互异）
  ├─ 3 ★ PermissionGate.check(tc, ctx)（FR-005；deny → ok:false「权限被拒」，执行器不被调用）
  │     ① 三元组规则集（allow/ask/deny + pattern 全限定名 glob/group/namespace）
  │     ② dsh 可插拔策略对象（部署方注入；read-before-edit 等）
  │     ③ allowed-tools 授权校验（扩展源注册时已校验；此处冗余护栏）
  │     → ask 命中：分发挂起 Promise（AskHandle），等场景裁决（FR-007）
  ├─ 4 delay gate（既有；effDelay 钳制语义保持）
  ├─ 5 executor（零改动）
  └─ 6 ★ PostToolUse 审计（audit.ts：tc/decision/result/duration/trust）
```

- **策略代码只存在于路由层**（grep 断言无业务包内自行绕过，NFR-003）；`RouterOptions.policy?: PolicyConfig`（rules + strategies + defaultAction + onAsk 桥）；`RouterOptions.audit?: AuditSink`；
- **裁决时机与 UI 归属（ADR-008）**：裁决计算发生在 base dispatch（框架级、与场景 hooks 分层）；ask **UI 呈现归场景**（React 弹层），base 只暴露 `onAsk(question): Promise<{action:'allow'|'deny'|'ask-again'}>` 桥 + 挂起状态/事件；取消/超时 → deny + 审计（EC-002）；
- **浏览器 API 授权失败转译（FR-009）**：各域工具经 PlatformEnv 调浏览器能力时，捕获 NotAllowedError/SecurityError/NotFoundError → ok:false + 授权路径指引（`需在浏览器地址栏权限设置允许通知` 等），会话不中断。

#### 2.3.3 注册分组与动态源（FR-001/002/038）

- 分组 = group 字段（help 一览按组输出 `[内容域] doc-read …`）；缺省 group = namespace；
- 命名空间次序可配置（setNamespaceOrder）；默认命名空间 = 业务（''）先、内建固定置末的 **F-23 顺序契约不破坏**（组内注册序延续）；
- 动态源 register 全流程入 audit（source/时间/命名空间/全限定名，FR-038）；卸载清理完整（schema/help/dispatch/审计联动）；
- 跨命名空间重名策略化（允许共存 FR-002；同命名空间同全限定名重复 → 抛错 EC-010 沿 EC-003）；
- allowed-tools（FR-008）：扩展源注册时若声明 allowedTools 且所注册工具不在授权集 → 注册被拒或降级 ask（策略决定，默认被拒 + 审计）。

#### 2.3.4 世界模型扩展（FR-044：文档态 → 状态态）

```ts
export interface ToolContext { /* F-23 docId/source 保留 */
  docId?: string; source?: string;
  services?: ToolServices;   // v2 追加：跨工具状态访问面（场景组装注入）
}
export interface ToolServices {
  session?: SessionStore; goals?: GoalStore; jobs?: JobStore; audit?: AuditSink;
}
```
- 文档态契约（docId/source）保留——lgdl-web-cli 等文档工具零回归（FR-044 AC）；
- 状态态 = ctx.services（会话/存储/goal/jobs 状态经 ctx 或注册表状态服务获取，实现由场景注入 base 的 store 工厂，见 §2.4）；
- dispatch ctx 组装点 = session.ts（场景）扩展；base 提供 store 工厂（IDB 实现 + memory 实现）供场景装配。

#### 2.3.5 lgdl-web 组装点扩展（FR-039~042）

session.ts 在既有 router(600ms)+2 业务注册之上追加：
1. **默认注册矩阵**（FR-039，S-08 已裁）：`assembly.buildDefaultMatrix()` 返回 域→启用集（推荐：storage/session/todo/goal/jobs/context/doc-*/search/list-resources 默认开；dom-* 开但写子命令经 PRM；web-search 条件开=配 key 后；skill/MCP/exec-remote/save/ws 默认关显式装载）；场景可按域裁剪 → 单点变更全链可见（NFR-004）；
2. **env 绑定**：browserEnv()（真实浏览器适配器）注入各域工具；
3. **ask 桥**：router policy.onAsk → AiPanel/AskDialog 场景 UI（FR-041）；
4. **services**：SessionStore/GoalStore/JobStore 组装（IDB 载体）+ ctx.services 注入 dispatch；
5. **web-search key/端点**：provider 应用态扩展 `webSearch?: { endpoint: string; apiKey: string }`（FR-040，BYOK；未配置 → 工具禁用态 + 配置指引 EC-006；key 不进 schema/help/日志）。

### 2.4 数据流变更图

```
【v2 数据流】用户指令
  lgdl-web AiPanel send()
    └ session.runAgent(user)
       └ web-cli-base AgentRunner（turns 内部维护，循环零改动）
           ├ chat(system, turns)           ← scene chat 闭包：读 session store 历史
           │                                 → provider.chat(settings, turns, router.deriveTools(启用集))
           ├ dispatch(tc, ctx)             ← scene dispatch 闭包：ctx = {docId, source, services}
           │   └ CommandRouter.dispatch
           │       ├ 条目查找（全限定名）→ enabled → PermissionGate（规则+策略+allowed-tools）
           │       ├  [ask] → onAsk 桥 → 场景 UI 裁决 → allow/deny
           │       ├  delay gate（600ms/钳制，保持）
           │       ├  executor（经 PlatformEnv 触碰浏览器能力：storage/fetch/DOM/worker/…）
           │       └  PostToolUse → audit sink + runner onToolDone → 场景 onApply/渲染
           └ events（消息流渲染 / ask 挂起事件 / onRoundLimit…）
  场景状态载体（新增）：
     SessionStore(IDB) ← 会话 turns/恢复点持久化（刷新可恢复，EC-005 降级内存态）
     GoalStore(IDB)    ← 跨会话目标 + 进度（同源多标签共享读+写冲突标记 EC-013）
     JobStore(IDB)     ← jobs 状态/结果/interrupted（页面卸载标记 EC-008）
     AuditSink         ← 权限/调用/扩展注册/压缩审计（NFR-009）
```

### 2.5 依赖关系与运行时依赖（NFR-001/002）

- base 新增模块**零新运行时依赖**：OPFS/IDB/Worker/fetch/Notification/Clipboard/File System Access 全为 Web 标准 API，经 platform.ts 适配（node 面 = memory/no-op fake）；HTML→MD 清洗 = 内置最小转换器（不引库）；MCP = 轻量 Streamable HTTP 客户端（fetch + SSE 自解析，不引 @modelcontextprotocol/sdk，ADR-006）；
- 测试依赖：不引入 jsdom/playwright 到 base devDeps（DOM/浏览器面以注入桩单测 + validate 真实浏览器冒烟承接，P-03 待作者确认）；
- 包依赖图不变：lgdl-web → {lgdl-web-cli, lgdl-web-op-cli, web-cli-base}；base 零业务边。

### 2.6 任务可拆性（tasks 阶段分波/模块边界）

| 波次（spec §9.4） | 模块边界 | FR 锚点 | 依赖先序 |
|---|---|---|---|
| **波 1 P0 = 横切与基座** | router.ts 注册表 v2 + permission.ts + audit.ts + platform.ts + assembly 骨架；storage 载体（mem/idb/opfs）+ storage-tools + settings；doc-tools 读；web-fetch 升级；session-store/session-tool；web-search 骨架；lgdl-web session 矩阵接入 + provider webSearch 字段；F-23 真实闭环补跑基线 | FR-001~015/018~019/034/039/040/043~046 | 先 mechanism 后 tools；每步 build+相关包测试绿 |
| **波 2 P1 = 域工具主体** | search-tools/list-resources；dom-tools/ask-user；todo/goal/jobs/subagent；eval-tools(js)；skill-loader；lgdl-web ask UI（AskDialog）+ context-tool | FR-016/017/022/023/026/029~032/035/036/041 | 依赖波 1（权限/registry/services） |
| **波 3 P2 = 增强/试点** | stream(ws/sse)；exec-remote/worker-session；eval-wasm 完整；workflow；mcp-client；notify/clipboard；save-file 完整；provider 数据平移可选 | FR-020/021/024/025/027/028/033/037/042 | 依赖波 1/2；试点独立可裁 |

> 说明：P0/P1/P2 仅定排布先序，**不砍域**（九域全做 A-01）；单 Feature 完整表达，默认不拆分子特性（spec §9.4 注）；tasks 阶段按本表波次拆原子任务即可得到独立可验证的模块单元。

---

## 3. 方案对比

> 五个对比主题（spec 已锁范围/方向，plan 对比剩余的技术形态决策）

### 3.1 对比主题一：注册表 v2 形态（namespace/group/enabled 的承载）

| 维度 | 方案 A：单 router 内二维有序索引（推荐） | 方案 B：每命名空间独立子 router + 组合代理 | 方案 C：平铺名哈希（ns 拼进 name 无元数据） |
|------|:--|:--|:--|
| 描述 | 现有 business/builtins 两 Map 扩展为「全限定名 → 条目」单 Map + namespace 首次注册序数组；group 为派生视图 | 每个命名空间建一个 CommandRouter，外层 RouterGroup 按 ns 转发 dispatch/派生 | 注册键直接存 `skill.search` 字符串，无 namespace 元数据，help/group 靠 name 前缀 parse |
| 优点 | 与 F-23 结构同构增量最小；顺序契约天然保持（注册序数组）；卸载/查询 O(1)；无代理层 | 命名空间天然隔离；未来可独立 delay/策略配置 | 实现最简 |
| 缺点 | 需在派生/help/前缀处统一加 ns 过滤逻辑 | 派生顺序/前缀/help 跨 router 聚合复杂；dispatch 多一层间接；F-23 测试面改动大 | 丢失命名空间结构信息：重名策略/按 ns 开关/目录切片/审计来源均难表达；元数据后补重构风险 |
| 风险 | 低（F-23 顺序契约单点延续） | 中（聚合顺序与 tool_choice 优先序漂移） | 高（FR-002/003/038 的查询/开关/审计全部退化为字符串 hack） |
| 工作量 | ≈2.5 人日 | ≈3.5 人日 | ≈1.5 人日（后续返工风险高） |

**推荐 A**：理由：① F-23 deriveTools 顺序契约（router.test.ts:153）是 AC-005 红线，方案 A 以注册序数组单点延续；② namespace/group/enabled 都是「条目的元数据视图」，单 Map + 有序索引足够表达（FR-002 查询/FR-003 动态/FR-004 开关三链一致）；③ 避免子 router 组合带来的顺序/前缀/help 跨层聚合复杂度（方案 B 需重写 listHelp/deriveTools 聚合）。**配套决策**：group 不建独立存储（派生视图），avoid 数据冗余（NFR-004 单一数据源）。

### 3.2 对比主题二：权限门禁挂点与形态

| 维度 | 方案 A：router.dispatch 内 PermissionGate（推荐） | 方案 B：runner hooks 层拦截 | 方案 C：executor 包装器（每工具包策略） |
|------|:--|:--|:--|
| 描述 | 框架级策略评估插入 dispatch（与 delay gate 同层、先于执行器）；规则/策略/ask 契约在 RouterOptions | runner 循环在 dispatch 前经场景 hooks.intercept 调策略 | 每个 ToolEntry 创建时包一层策略检查 |
| 优点 | 所有已注册工具（含未来动态源）自动获得门禁；策略代码只存在于路由层（NFR-003 grep）；ask 挂起与 runner 天然协作（runner await dispatch） | 实现位置与现 hooks 近 | 每工具可定制 |
| 缺点 | router 需认知策略类型（纯机制可接受） | 场景级 hooks 与框架级策略职责混淆（spec FR-005 明示分层）；新工具需场景记得接；无法覆盖非 runner 调用路径 | 策略逻辑重复 N 份；动态注册工具易漏包；无法统一审计/顺序；「业务包内自行绕过」无法 grep 断言 |
| 风险 | 低 | 中（分层违规 + 覆盖不全） | 高（NFR-003 无旁路断言失败） |
| 工作量 | ≈2 人日 | ≈1 人日（后续返工） | ≈2.5 人日 |

**推荐 A**：理由：① FR-005「框架级策略挂点、与 delay gate 同层、先于执行器、无旁路」直接指向 router.dispatch；② deny 短路在 delay 前（不产生无谓等待）；③ 统一 PostToolUse 审计点；④ runner 场景 hooks（intercept/onToolDone）保持场景级职责不混层（F-23 分层延续）。

### 3.3 对比主题三：浏览器持久载体选型（STR/SES/TSK 的宿主）

| 维度 | 方案 A：OPFS（卷）+ IndexedDB（结构化状态）双载体（推荐） | 方案 B：全 IndexedDB | 方案 C：全 OPFS |
|------|:--|:--|:--|
| 描述 | storage 工具 = OPFS 卷（list/read/write/remove 目录+文件语义）+ quota；goal/jobs/session/settings 结构化记录 = IDB 对象库 | 卷/文件语义也落 IDB（key 存 path + blob/value） | 结构化状态序列化为 JSON 文件存 OPFS |
| 优点 | 各用所长：OPFS 目录/文件语义 + worker 同步访问（storage 工具可运行于 worker FR-013）+ FileSystemFileHandle 导出；IDB 事务/索引/游标适合会话/goal/jobs 记录、跨标签共享 | 单一存储心智；IDB 兼容性优于 OPFS（Safari 早期） | 单一 API 面；可借 OPFS 的 worker 同步句柄 |
| 缺点 | 两套 API + 两套适配器；需统一 StorageBackend 抽象 | OPFS 语义（卷/目录/句柄/配额）用 IDB 表达别扭；大文件 blob 进 IDB 低效；无真实「卷」概念 | IDB 无原生事务索引（目标进度/会话按时间查询弱）；JSON 整读整写并发冲突放大 |
| 风险 | 低（抽象层隔离，node 用 memory fake） | 中（FR-013 卷语义失真 + 大内容性能） | 中（EC-013 并发 + 查询面弱） |
| 工作量 | ≈2.5 人日 | ≈2 人日 | ≈2.5 人日 |

**推荐 A**：理由：① FR-013 要「OPFS 卷 + IndexedDB 对象库两载体语义」是 spec 原文（表意明确）；② FR-030/031/034 的结构化记录（goal/jobs/session turns）天然适合 IDB 对象库（索引/事务/跨标签）；③ storage 工具需运行于页面与 worker（FR-013 AC），OPFS worker 同步访问是其独有优势（IDB 在 worker 可用但异步）。**配套决策**：统一后端抽象 `StorageBackend`（list/read/write/remove + estimate/persist），浏览器 = opfs/idb 适配器、node = memory fake（双轨测试缝 ADR-003）；settings = 同步 KV 语义独立小后端（localStorage 适配器 + memory），非 OPFS/IDB（FR-015）。

### 3.4 对比主题四：执行/计算域沙箱边界（eval-js/wasm 的形态）

| 维度 | 方案 A：worker 执行器注入 + PRM 门禁 + untrusted 拒（推荐） | 方案 B：主线程直接 eval/Function | 方案 C：iframe sandbox + postMessage |
|------|:--|:--|:--|
| 描述 | eval-js/eval-wasm 经 PlatformEnv.workerFactory 生成 worker 执行（无 DOM 面、可中断、主线程不卡）；执行前 PRM 策略裁决副作用；untrusted 输入默认拒执行（FR-010/026） | 主线程 new Function/WebAssembly 直接执行 | 隐藏 iframe sandbox（allow-scripts 无 allow-same-origin）跑代码，postMessage 取结果 |
| 优点 | worker 天然无 DOM/UI 面（浏览器「进程」替代位）；可 terminate 中断；主线程流畅；CSP 友好（blob worker） | 实现最简单；同步返回值 | 隔离最强（opaque origin 无同源能力） |
| 缺点 | 需 worker 通信协议（postMessage 异步）；结构化克隆限制 | 可触碰 DOM/fetch/存储（副作用需门禁兜底——FR-026 明示默认拦截）；长任务卡主线程；CSP script-src 可能禁 eval（记录约束） | iframe 生命周期/消息往返复杂；CSP frame-src 约束；base 无 DOM 依赖原则下测试成本高 |
| 风险 | 中（worker 通信正确性，桩可测） | 高（副作用默认拦截难以完整实现 + CSP） | 高（复杂 + CSP/浏览器差异，R-002 假抽象风险） |
| 工作量 | ≈2 人日 | ≈0.8 人日 | ≈3 人日 |

**推荐 A**：理由：① FR-026「页内沙箱计算 + 非 shell + 副作用受 PRM + untrusted 拒执行」——worker 提供结构性的「无 DOM 面」基底，PRM 提供写/外联门禁，两者叠加最接近「浏览器进程」语义；② 执行器经 PlatformEnv 注入 → node 面桩测试、浏览器面真 worker 冒烟（NFR-006）；③ wasm 实例化天然在 worker 内完成（不阻塞 UI）。**边界声明**：worker 非 OS 沙箱（无 seccomp/VM 语义，NG-001）；不做 PTY/终端（NG-005）；eval 输入默认视为 untrusted 来源代码（EC-007 拒执行）除非显式 trusted 策略放行。

### 3.5 对比主题五：MCP Streamable HTTP 试点实现路线（FR-037 P2）

| 维度 | 方案 A：base 内置轻量客户端（fetch + SSE 自解析，推荐） | 方案 B：引入官方 @modelcontextprotocol/sdk | 方案 C：场景（lgdl-web）侧实现，base 只留协议类型 |
|------|:--|:--|:--|
| 描述 | mcp-client.ts 实现 Streamable HTTP/JSON-RPC 最小客户端（initialize/tools/list/tools/call + SSE 流），命名空间 mcp:*，1-2 连接器试点 | 依赖官方 SDK（TypeScript），用其 StreamableHTTPTransport | MCP 客户端代码放 lgdl-web，base 定义 mcp 工具源接口 |
| 优点 | base 零新运行时依赖（NFR-002）；控制面与数据面同构 fetch；CSP connect-src 约束单点记录；协议知识内聚 base（F-14 前置雏形） | 协议实现省心、演进跟随官方 | base 依赖最小 |
| 缺点 | 需自维护协议子集（试点 1-2 连接器够用）；SSE 解析自实现（~150 行） | 官方 SDK 偏 Node 生态（stdio 优先），浏览器侧体积/兼容成本；新依赖需评审（NFR-002）；与本 Feature「试点」定位不符 | 扩展源逻辑散布场景，F-14/v1.1 消费端拿不到；注册治理/审计断裂 |
| 风险 | 低（协议子集可测，mock 服务器断言 FR-037 AC） | 中（依赖面/体积/浏览器适配） | 中（架构回潮：base 扩展生态位又依赖场景） |
| 工作量 | ≈2 人日 | ≈1.5 人日 | ≈1.5 人日 |

**推荐 A**：理由：① NFR-002「搜索/MCP/skill/exec-remote 均为可选注入、base 零默认外部服务」+ 新依赖清单评审记录——自研轻量子集把依赖增量归零；② 官方 SDK 以 Node/stdio 为中心，与本 Feature 浏览器生态位（Streamable HTTP 必须、stdio 不可承载 NG-001）取向不符；③ 协议知识留在 base 是 F-14/v1.1 协议发现机制的前置雏形面（spec §1 下游关联标注）。

### 3.6 对比主题六：web-fetch 升级形态（FR-018）

| 维度 | 方案 A：additive 参数 + 缺省兼容（推荐） | 方案 B：新工具 web-fetch2 并存 | 方案 C：直接改缺省行为 |
|------|:--|:--|:--|
| 描述 | schema 追加可选参数（clean/untrusted 标记内置/护栏上限），缺省 = 原文返回（现行为）；HTML→MD 清洗默认关 | 另建新工具名承载清洗/护栏 | 默认即清洗 + 截断 |
| 优点 | 既有 5 工具 schema/行为零回归（FR-043）；lgdl-web 现调用无感 | 新语义与旧解耦 | 一次到位 |
| 缺点 | executor 需在缺省路径保持逐字节兼容（分支可控） | 工具名膨胀 + help/schema 双份（与 v2「schema 预算受控」冲突）；AI 选错工具 | 行为回归（AC 零回归红线破坏）；AI 上下文变化不可审计 |
| 风险 | 低 | 中 | 高（FR-046 未声明差异） |
| 工作量 | ≈1 人日 | ≈0.8 人日 | ≈0.5 人日 |

**推荐 A**：additive 参数 + 缺省兼容。理由：FR-018 AC 明文「缺省行为与现 web-fetch 兼容（schema 不变）」；untrusted 标记（FR-010）对 web-fetch 输出为**内置常开**（不改变原文文本，只加元数据通道 ToolResult.trust + 审计，见 ADR-009）。

---

## 4. 推荐方案

**推荐**：单 router 二维有序索引注册表（§3.1 A）+ dispatch 内 PermissionGate（§3.2 A）+ OPFS/IDB 双载体（§3.3 A）+ worker 执行器注入沙箱（§3.4 A）+ base 内置轻量 MCP 客户端（§3.5 A）+ web-fetch additive 升级（§3.6 A）。整体技术路线已在 §2 展开，落地顺序与波次见 §2.6。

### 4.1 关键设计决策汇总（spec 决策 → 技术落点）

| spec 决策（红线输入） | 技术落点（本 plan 章节） |
|---|---|
| D-5/D-6 浏览器生态位公理；OS 工具名不进入 | §2.2：九域工具全以浏览器生态位语义落点（OPFS/IDB/Worker/fetch/DOM/Permissions/Notification/Clipboard/FSA）；OS 形态工具零出现（AC-003 grep） |
| A-01 九域全做 | §2.2 域模块表 + §2.6 P0/P1/P2 波次（不砍域） |
| A-02 不可承载面代理原则 | NG 清单 grep 断言（无真 bash/文件树/socket/stdio MCP/常驻守护）；exec-remote 仅预留契约（FR-027 P2 禁用态 + 代理声明） |
| A-03 权限门禁三者组合 | §2.3.2 PermissionGate：①三元组规则 ②dsh 策略注入 ③allowed-tools；ask UI 归场景（ADR-008） |
| A-04 最近独立版本 | 目标版本 = 最近独立版本（ROADMAP 登记待 sddu-roadmap 排布，本 plan 不占位）；版本号与发布窗口见 §6 时间风险 |
| S-01~S-09（O-004~007 建议默认全部采纳） | todo 随会话（session store）；goal/jobs 落 IDB；jobs 页面存活期+interrupted+Notification；subagent 入 v2 同线程子会话；workflow P2；多形态内核不同批；skill 内置打包先行+接口预留；MCP P2 试点；lgdl-web 矩阵+web-search BYOK；settings 骨架入 base、场景数据不强迁——分别落 §2.2/§2.3/§2.6 与 ADR-003/004/005/007 |
| FR-043 additive 契约保持 | §2.3.1 ToolEntry 追加字段缺省兼容 + deriveTools 顺序契约延续（router.test.ts:153 零回归） |
| FR-044 世界模型文档态→状态态 | §2.3.4 ToolContext.services + store 工厂 |
| FR-045 真实浏览器闭环前置基线 | 波 1 入口：F-23 AC-008 补跑（validate 前置人工基线，需浏览器+API Key） |
| FR-046 行为等价/声明改进 | 行为清单逐项 diff（lgdl-web 现 5 工具路径在 v2 叠加下的用户可感知差异记录 + ask/新工具按声明项改进） |

### 4.3 技术开放点（供作者裁决；均带推荐默认，默认已按推荐写入本文档，作者确认即冻结、调整仅波及对应节）

| # | 开放点（一句话） | 推荐默认 | 关联 |
|---|-----------------|---------|------|
| P-01 | 浏览器冒烟工具链选型：base 是否引入 jsdom/playwright devDeps，还是维持「注入桩 node 单测 + validate 真实浏览器人工冒烟清单」双轨现状？ | 维持现状（零新增测试依赖；DOM/浏览器面注入桩 + validate 冒烟，NFR-002 依赖评审最小化） | §4.2/NFR-006 |
| P-02 | MCP 试点客户端实现：base 内置轻量 fetch+SSE 客户端（零运行时依赖）vs 引入官方 @modelcontextprotocol/sdk？ | base 内置轻量客户端（§3.5 方案 A / ADR-006） | FR-037/NFR-002 |
| P-03 | HTML→MD 清洗：内置最小转换器（零依赖）vs 引入成熟库（turndown 等）？ | 内置最小转换器（新增依赖需评审记录，清洗默认关、仅基础语义） | FR-018/NFR-002 |
| P-04 | 浏览器兼容基线：Chromium 现行版为验证基线 + Firefox 声明兼容（能力降级转译），是否采纳为 v2 基线？（NFR-008 建议态作者可裁） | Chromium 验证 + Firefox 声明兼容（OPFS/Notification/clipboard 差异走 FR-009 转译） | NFR-008/EC-003 |
| P-05 | web-search 的 lgdl-web 默认矩阵开向：矩阵推荐「条件开（配 key 后）」——是否在 v2 内提供 SettingsPanel key 配置 UI，还是仅 base 禁用态+指引、UI 留后续？ | v2 内提供 SettingsPanel 最小配置面（FR-040/041 S-08/S-09 已裁场景做），base 不内置 | FR-040/041 |

> 注：P-01~P-05 均为**技术实现取向**级开放点（spec 已裁决策不重开）；除 P-05 外均不影响 FR/AC 范围，仅影响依赖面与验证工具链。作者确认默认即可冻结 plan v1.0。

### 4.2 测试策略（NFR-006 双轨，D-005 先例延续）

**新机制专项（base，纯 node 无浏览器）**：
- `router.test.ts` 增补：注册表 v2（命名空间共存/查询/卸载/全限定名派发/禁用三链/分组派生/顺序契约延续/动态源审计）——F-23 既有 13 例零回归（AC-005）；
- `permission.test.ts`：裁决矩阵（allow/ask/deny × 命中/未命中）+ 策略对象注入 + 间谍断言（deny 时执行器未被调用 FR-005）+ 无旁路 grep + ask 三路（allow/deny/超时 → deny + 审计 FR-007）+ EC-014 deny 优先 + EC-001 三态文案互异；
- `audit.test.ts`：权限/调用/扩展注册/压缩四类事件记录 + sink 注入；
- `storage-*.test.ts` / `storage-tools.test.ts`：注入 fake StorageBackend（memory）断言 storage CRUD 全链 + quota 假值输出格式 + EC-004/005 转译；
- 域工具逐模块：search/dom/eval/todo/goal/jobs/subagent/session/context/skill/web-search/save 各注入桩全链单测（含 EC-002~015 边界）；
- **真实浏览器冒烟面**（lgdl-web/validate）：IDB/OPFS 真持久、Notification/clipboard 授权两路、ask UI 弹层、dom-* 真 DOM、eval worker、F-23 闭环补跑——记录于 validate 报告（FR-045/AC-008）。

**改写/删除有依据（D-005）**：无 F-23 用例删除（additive 零回归）；session.test.ts 增补矩阵派生断言（承接 FR-039）；provider.test.ts 增 webSearch 字段读写用例。

**门禁**：全仓 9 包测试命令全绿 + 4 包 tsc 零错误 + vite build 零错误（AC-009）；grep 断言零残留（OS 工具名/策略旁路/UI 上收 NFR-001/003/010）。

---

## 5. 文件影响分析

> 所有需要创建/修改/删除的文件（路径基于 2026-09-06 实测；测试文件一律平铺 src/ 根兼容通配测试脚本 §1-8）

### 5.1 web-cli-base（base 机制扩展 + 九域工具；新增模块全部 domain-neutral 零 LGDL）

| 操作 | 文件路径 | 说明 |
|:--:|------|------|
| MODIFY | packages/web-cli-base/src/router.ts | 注册表 v2：ToolEntry 追加 group/namespace/enabled/risk；注册键=全限定名 ns.name；register/unregister/query；setEnabled/setNamespaceOrder；deriveTools 分组/命名空间/开关选项（缺省全量=原顺序）；help 分组一览；dispatch 插入 enabled 检查 + PermissionGate + PostToolUse 审计（FR-001~004/005/038/043） |
| MODIFY | packages/web-cli-base/src/index.ts | 导出面扩充：permission/audit/platform/assembly 类型与工厂 + 域工具工厂 + store 类型（NFR-007） |
| NEW | packages/web-cli-base/src/permission.ts | PermissionGate + PolicyRule/PolicyStrategy/AskHandle/PolicyConfig + 裁决管线（三元组规则/策略/allowed-tools）+ 默认取向（FR-005~008/EC-001/002/014） |
| NEW | packages/web-cli-base/src/permission.test.ts | 权限专项（§4.2） |
| NEW | packages/web-cli-base/src/audit.ts | AuditSink + AuditEvent 类型 + memory/console 实现 + createAudit 工厂（FR-009/010/NFR-003/009） |
| NEW | packages/web-cli-base/src/audit.test.ts | 审计专项 |
| NEW | packages/web-cli-base/src/platform.ts | PlatformEnv 类型 + browserEnv()（真实浏览器适配器：fetch/storage/kv/clipboard/notify/filePicker/worker/dom/permissions/search）+ 授权失败转译工具（FR-009/NFR-002/006） |
| NEW | packages/web-cli-base/src/platform.test.ts | env 面专项（node fake 断言 + 转译注入） |
| NEW | packages/web-cli-base/src/assembly.ts | 默认目录/矩阵组装器：域→group 目录、namespace 次序、enable 集、顺序契约、createDefaultRouter(env, opts)（FR-001/004/039 的 base 侧承载；场景选域即得） |
| NEW | packages/web-cli-base/src/assembly.test.ts | 矩阵派生断言（schema/help/dispatch 三链与矩阵一致） |
| NEW | packages/web-cli-base/src/doc-tools.ts | doc-read/doc-edit 执行器 + schema + help（内容对象读写：ctx.docId/source 或 storage 卷条目；str_replace/insert/create 原语；ToolResult changed/source 兼容 FR-011/012） |
| NEW | packages/web-cli-base/src/doc-tools.test.ts | 假 ctx 读写 + 无上下文可读错误 + 策略 read-before-edit 联动 |
| NEW | packages/web-cli-base/src/storage-tools.ts | storage（list/read/write/remove）+ storage-quota（estimate/persist 可读+可解析输出）执行器 + schema + help（FR-013/014） |
| NEW | packages/web-cli-base/src/storage-opfs.ts | StorageBackend OPFS 实现（浏览器卷：目录+文件句柄；worker 可访问；EC-004/005 转译）（FR-013） |
| NEW | packages/web-cli-base/src/storage-idb.ts | StorageBackend IndexedDB 实现（对象库/事务；跨标签共享读 + 写冲突标记原语 EC-013）（FR-013/030/031/034 载体） |
| NEW | packages/web-cli-base/src/storage-mem.ts | StorageBackend memory 实现（node 测试/无持久降级默认，EC-005 内存态）（FR-013/NFR-006） |
| NEW | packages/web-cli-base/src/storage-tools.test.ts | fake 后端全链 + quota + EC-004/005（node）+ 真实浏览器冒烟预留清单 |
| NEW | packages/web-cli-base/src/settings.ts | settings 通用 KV 工具（get/set/list/remove 同步语义；可注入后端：localStorage 适配器/memory）+ lgdl-web provider 数据平移不强绑（FR-015/042） |
| NEW | packages/web-cli-base/src/settings.test.ts | node 假后端 CRUD + 隔离命名空间 |
| NEW | packages/web-cli-base/src/search-tools.ts | search-content（可及内容集全文/模式搜索：文档对象/卷条目/会话记录；可选索引预算 EC-011）+ list-resources（资源目录，与 web-cli-help 工具目录区分）（FR-016/017） |
| NEW | packages/web-cli-base/src/search-tools.test.ts | 注入小内容集命中 + 退化线性一致 + 预算护栏 |
| NEW | packages/web-cli-base/src/web-search.ts | web-search 执行器 + schema + help（query→结果列表；端点/凭据=env.searchEndpoint 注入；未配置 → 禁用态+指引 EC-006；结果 untrusted 标记 FR-010/019） |
| NEW | packages/web-cli-base/src/web-search.test.ts | 假搜索服务全链 + 未配置态 |
| MODIFY | packages/web-cli-base/src/web-fetch.ts | 升级：HTML→MD 清洗（可选默认关）、大小/时长护栏、错误分类（网络/CORS/HTTP→可读）、untrusted 标记（ToolResult.trust + 审计，缺省路径逐字节兼容）（FR-018/010） |
| MODIFY | packages/web-cli-base/src/tools.ts | WEB_FETCH_TOOL schema 追加可选参数（clean/护栏上限），缺省行为不变（FR-018/043） |
| MODIFY | packages/web-cli-base/src/web-fetch.test.ts | 增补 mock fetch 两态/标记/截断/CORS 分类（既有用例零回归） |
| NEW | packages/web-cli-base/src/save-file.ts | save/download（File System Access 存用户文件 / blob 下载链两路径；手势授权失败转译 FR-009/020）（P2 完整化；波 1 可仅下载链） |
| NEW | packages/web-cli-base/src/save-file.test.ts | 授权桩成功/拒绝两路 + 下载链冒烟（P2） |
| NEW | packages/web-cli-base/src/stream.ts | ws/eventsource 实时订阅工具（连接/订阅/接收/关闭；env 注入）（FR-021 P2，可裁剪） |
| NEW | packages/web-cli-base/src/dom-tools.ts | dom-* 通用 DOM 操作子命令族（read-state/click/hover/scroll/zoom/fullscreen/snapshot 等；执行目标=宿主页同源；写操作 risk:'ui' 走 PRM；dom 操作经 PlatformEnv.dom 注入——无 op-cli React handler 依赖 FR-022） |
| NEW | packages/web-cli-base/src/dom-tools.test.ts | jsdom/注入桩逐子命令 + deny 拦截间谍断言 |
| NEW | packages/web-cli-base/src/ask-user.ts | ask-user 工具（问题结构/选项/回答回填；应答器 env 注入；与 PRM ask FR-007 语义区分 FR-023） |
| NEW | packages/web-cli-base/src/notify.ts | notify 工具（Notification API；授权两路转译 FR-009/024；配合 jobs 完成提醒） |
| NEW | packages/web-cli-base/src/clipboard.ts | clipboard 读写工具（navigator.clipboard；手势/权限失败转译 FR-009/025） |
| NEW | packages/web-cli-base/src/eval-tools.ts | eval-js/eval-wasm（worker 执行器注入：PlatformEnv.workerFactory；纯计算语义；副作用门禁 PRM；untrusted 默认拒执行 FR-010/026/EC-007） |
| NEW | packages/web-cli-base/src/eval-tools.test.ts | 注入执行器纯计算 + 副作用拦截 + untrusted 拒（P1 js / P2 wasm） |
| NEW | packages/web-cli-base/src/exec-remote.ts | exec-remote 代理桥预留契约（端点/鉴权/超时=env 注入；未配置禁用+指引；描述显式声明「代理 OS 能力、非本框架实现」FR-027/NG-004）（P2） |
| NEW | packages/web-cli-base/src/worker-session.ts | 持久执行上下文（worker 会话：变量/上下文跨调用存活；无 PTY/终端语义 FR-028/NG-005）（P2） |
| NEW | packages/web-cli-base/src/todo.ts | todo 会话级任务清单（add/list/update/mark-done/remove；宿主=session store 随会话持久 FR-029 S-01） |
| NEW | packages/web-cli-base/src/goal.ts | goal 跨会话持久目标（create/get/update/archive+进度；宿主=IDB origin 级；多标签共享读+写冲突标记 FR-030/EC-013 S-01/S-02） |
| NEW | packages/web-cli-base/src/jobs.ts | jobs 后台任务句柄（submit→jobId；status/result/log/cancel；页面存活期执行+状态结果落 IDB+完成 Notification+卸载标记 interrupted 可查可重试 FR-031/EC-008 S-03；EC-015 启动命令即时返回不叠 delay） |
| NEW | packages/web-cli-base/src/subagent.ts | subagent 子会话（嵌套 AgentRunner 同线程；会话隔离非进程隔离；工具集裁剪=白名单子集；chat 工厂 env 注入；子会话失败 ok:false 主会话不中断 FR-032/EC-009 S-04） |
| NEW | packages/web-cli-base/src/workflow.ts | workflow 声明式多步编排（步骤/扇出/条件汇聚；P2 S-04 后置，入范围则执行 FR-033） |
| NEW | packages/web-cli-base/src/session-store.ts | 会话持久化存储：turns/恢复点序列化 + IDB 载体 + 冲突标记/last-write + EC-005 降级内存态（FR-034/EC-013 S-01/S-02） |
| NEW | packages/web-cli-base/src/session-tool.ts | session 工具（持久化/恢复查询/恢复点管理；恢复入口 UI 归场景 FR-034） |
| NEW | packages/web-cli-base/src/context-tool.ts | context 摘要/压缩工具（turns/工具输出摘要压缩；summarizer env 注入；原始记录保留可检索；压缩动作审计 FR-035） |
| NEW | packages/web-cli-base/src/task-state.test.ts | todo/goal/jobs/session-store 状态专项（node 注入 fake 后端：CRUD/持久恢复/冲突标记/interrupted/重试/EC-015） |
| NEW | packages/web-cli-base/src/skill-loader.ts | SKILL.md 加载（frontmatter name/description/allowed-tools + 正文提示注入；来源=内置打包先行+运行时加载接口预留 CSP 约束记录+用户导入可选 FR-036 S-06；FR-008 门禁联动） |
| NEW | packages/web-cli-base/src/skill-loader.test.ts | 内置 skill 加载 → 提示注入 + 越权注册被拒 |
| NEW | packages/web-cli-base/src/mcp-client.ts | MCP Streamable HTTP/SSE 轻量客户端（JSON-RPC：initialize/tools/list/call；命名空间 mcp:*；单源端点不可达降级其余不受影响 FR-037/EC-012 S-07）（P2 试点） |
| NEW | packages/web-cli-base/src/mcp-client.test.ts | mock MCP HTTP 服务器全链（P2，若入范围） |

### 5.2 lgdl-web（场景接入面 + ask/配置 UI 归场景）

| 操作 | 文件路径 | 说明 |
|:--:|------|------|
| MODIFY | packages/lgdl-web/src/ai/session.ts | 组装点扩展：默认注册矩阵（assembly.buildDefaultMatrix 场景裁剪）+ browserEnv 注入 + router policy（ask 桥）/audit 装配 + services（Session/Goal/JobStore）注入 ctx + web-search 条件注册（FR-039/040/044；既有 2 业务注册与 600ms 保持） |
| MODIFY | packages/lgdl-web/src/ai/session.test.ts | 增矩阵派生断言 + ask 桥 fake 三路 + services 注入断言（既有用例零回归） |
| MODIFY | packages/lgdl-web/src/ai/provider.ts | ProviderSettings 扩展 `webSearch?: { endpoint; apiKey }`（BYOK 存储位 FR-040；key 不出现在 schema/help/日志） |
| MODIFY | packages/lgdl-web/src/ai/provider.test.ts | 增 webSearch 字段读写/缺省用例 |
| NEW | packages/lgdl-web/src/ai/AskDialog.tsx | 场景 ask 裁决 UI（allow/deny/记住选择；权限 ask 与 ask-user 双入口）（FR-041/007） |
| MODIFY | packages/lgdl-web/src/ai/AiPanel.tsx | session.runAgent 接线：policy.onAsk → AskDialog 呈现；ask 挂起/恢复状态渲染（FR-041；C 档消息流保留） |
| MODIFY | packages/lgdl-web/src/App.tsx | 会话恢复入口（session store 有恢复点 → 提示恢复）+ services 组装持有（FR-034 恢复入口归场景） |
| MODIFY | packages/lgdl-web/src/ai/SettingsPanel.tsx | web-search 端点/key 配置 UI（BYOK）+ skill/MCP 配置入口（若入范围 FR-040/041） |
| —（不动） | lgdl-web-cli / lgdl-web-op-cli / lgdl-core / lgdl-layout / lgdl-render / lgdl-router / lgdl-cli | C 档内容零改动（NG-002）；op-cli 是 DOM 自动化域 LGDL 形态先例，机制借鉴、内容不动 |

### 5.3 不改动面（明确排除）

ROADMAP 登记（sddu-roadmap 职责，本 plan 不占位）；docs/research/agent-capabilities（调研基线文档）；`.opencode/` 与 `.sddu/templates/`；root package.json/tsconfig/CI（无包新增删除）；base 既有机制源码零语义改动（exec/commands/operations/protocol/llm/sleep/help 逻辑不动，仅 tools.ts/web-fetch.ts 按 §5.1 升级）。

---

## 6. 风险评估

| 风险 | 概率 | 影响 | 缓解措施 |
|------|:--:|:--:|----------|
| R-001 范围蔓延（九域全做 + 横切机制容量） | 高 | 高 | spec §9.4 P0/P1/P2 波次承载（§2.6）；默认不拆子 Feature；每波独立可验证；波 3 试点项（MCP/workflow/ws/exec-remote）可裁剪不阻塞 |
| R-002 浏览器约束误判（OPFS/worker/MCP/沙箱的 ◐/✕ 边界） | 高 | 高 | §3.3/3.4/3.5 方案以「注入适配器 + node 桩先行」降低试错成本；真实浏览器冒烟每波随行（FR-045）；映射表（§3.3 discovery）作验收锚点（NFR-010） |
| R-003 schema 膨胀冲击 tool_choice/上下文预算（46 FR 工具全量派生） | 中 | 高 | FR-004 启用集 + FR-001 分组派生双控（lgdl-web 默认矩阵只开必要域，AC-011）；deriveTools 体积/顺序专项断言；web-search/skill/MCP/exec-remote 默认禁用态（EC-006） |
| R-004 与 F-14/v1.1 抢跑（通用 DOM 自动化/多形态内核/协议发现） | 中 | 中 | NG-003 边界：dom-* 仅限宿主同源页面；多形态内核不同批（S-05）；MCP 注册表命名空间标注为 F-14「前置雏形面」仅关联不承诺 |
| R-005 行为回归不可见（F-23 AC-008 未闭合即叠加权限/新工具） | 中 | 高 | FR-045：真实 AI 闭环补跑作为波 1 前置人工基线先行（validate 记录）；FR-046 行为清单 diff；全仓回归零失败门禁 |
| R-006 权限门禁误伤/自愈不足（ask 打断 AI 流畅度） | 中 | 中 | 默认取向分级（只读 allow、敏感面 ask、危险 deny FR-006）；规则可配置；模型可据拒绝结果自愈（EC-002 测试）；read-before-edit 等策略按 dsh 先例只对写工具生效 |
| R-007 F-23 契约回归（additive 破坏既有 5 工具） | 中 | 高 | ToolEntry/ToolResult/ToolContext 只追加字段（§2.3）；F-23 专项测试零回归为每步门禁（router/delay/runner/session）；缺省行为逐字节兼容（web-fetch §3.6 A） |
| R-008 存储配额/隐私模式/兼容漂移（IDB/OPFS 不可用、Safari/FF 差异） | 中 | 中 | EC-004/005 转译 + 内存降级；StorageBackend 抽象隔离载体；Chromium 验证基线 + Firefox 声明兼容（NFR-008，P-04）；quota 观测工具（FR-014） |
| R-009 状态并发（多标签 goal/session 写冲突、jobs interrupted 丢失） | 中 | 中 | IDB 写冲突标记/last-write（EC-013 单测）；jobs 状态+结果落库 + beforeunload interrupted 标记 + 恢复可查可重试（EC-008）；真实浏览器多标签冒烟 |
| R-010 扩展安全（skill/MCP 注入、allowed-tools 绕过、untrusted 执行） | 中 | 高 | FR-008 注册门禁 + FR-010 untrusted 不自动执行（eval 默认拒）+ audit 全程记录（FR-038）+ CSP connect-src 约束文档化（NFR-008）；注入攻击文本在 AI 闭环不回显执行（AC 断言） |
| R-011 **时间风险**（九域 + 横切在单版本全量落地） | 高 | 中 | 波次先序（§2.6）保证 P0 四柱先立（任何域工具都有护栏与宿主）；波 3 P2 试点可裁剪不阻塞发布；每波独立 build+测试门禁（沿用 V2 M0~M11 可构建先例） |
| R-012 版本窗口冲突（原 v0.7 内容后移、最近独立版本占位） | 中 | 中 | A-04 已裁；ROADMAP 登记由 sddu-roadmap 排布（本 plan 不占位）；发布窗口以 ROADMAP 更新为准 |

---

## 7. 生成的 ADR

> 本次规划产出的架构决策记录（本 Feature 独立编号；完整正文内嵌本表后，独立 ADR 文件由 tasks 阶段视需要落盘——沿用 F-23 先例）

| ADR | 标题 | 状态 |
|-----|------|:--:|
| ADR-001 | 注册表 v2：单 router 二维有序索引（全限定名键 + namespace/group/enabled 元数据），F-23 顺序契约 additive 延续 | PROPOSED |
| ADR-002 | 权限门禁 = router.dispatch 内 PermissionGate（框架级 PreToolUse 生态位 + PostToolUse 审计），ask UI 归场景 | PROPOSED |
| ADR-003 | 存储载体 = OPFS（卷语义）+ IndexedDB（结构化状态）双载体 + StorageBackend 抽象（node memory 双轨） | PROPOSED |
| ADR-004 | Worker 生命周期 = jobs 页面存活期 + IDB 状态 + interrupted + Notification，无跨页保活/常驻守护；worker 会话状态跨调用级 | PROPOSED |
| ADR-005 | eval-js/wasm 沙箱 = worker 执行器注入（无 DOM 面）+ PRM 门禁 + untrusted 拒执行；非 OS 沙箱声明 | PROPOSED |
| ADR-006 | MCP Streamable HTTP = base 内置轻量客户端（零 SDK 依赖、fetch+SSE），命名空间 mcp:* 试点 | PROPOSED |
| ADR-007 | 会话恢复/上下文压缩 = session store + 场景 chat 闭包承接（runner 主体零改动），services 经 ctx 注入 | PROPOSED |
| ADR-008 | ask/配置 UI 归属场景 + web-search BYOK + settings 骨架入 base（provider 数据不强迁） | PROPOSED |

### ADR-001: 注册表 v2：单 router 二维有序索引（全限定名键 + namespace/group/enabled 元数据），F-23 顺序契约 additive 延续

**状态**: PROPOSED
**背景**: v2 需目录分组（Q-009）、命名空间（skill:/mcp:/ext:）、运行时动态注册/卸载、按需开关（FR-001~004），而 F-23 注册表为 business/builtins 两段平铺（router.ts:104-106），deriveTools 顺序契约有测试断言（router.test.ts:153）；FR-043 要求 additive 不破坏既有契约。
**决策**: 在既有 CommandRouter 内扩展为「全限定名（`ns.name`）→ 条目」单 Map + namespace 首次注册序数组 + 派生视图（group）；ToolEntry 仅追加 group/namespace/enabled/risk 可选字段（缺省行为与旧完全一致）；dispatch/help/schema/前缀四链统一使用全限定名并可逆解析；同基名不同命名空间共存；register 增加 source/allowedTools 注册选项（FR-038/008）；不另起子 router、不另起分发路径（FR-043）。
**后果**: 新能力单点变更全链可见（NFR-004）；F-23 顺序契约零回归（组内注册序 + 内建置末延续）；schema 膨胀经分组派生与启用集双控（AC-011）；动态源卸载清理完整；为 F-14 协议发现提供「条目可序列化」雏形面（仅关联不承诺）。

### ADR-002: 权限门禁 = router.dispatch 内 PermissionGate（框架级 PreToolUse 生态位 + PostToolUse 审计），ask UI 归场景

**状态**: PROPOSED
**背景**: Q-005：router.dispatch 除 delay gate 外无钩子；spec A-03 裁「三者组合（opencode 三元组 + dsh 可插拔策略 + WorkBuddy allowed-tools）」，FR-005 要求框架级挂点、与 delay gate 同层、先于执行器、无旁路；FR-007 ask 交互 UI 归场景（NG-008）。
**决策**: dispatch 在查条目/启用态之后、delay gate 之前插入 PermissionGate：①三元组规则集（allow/ask/deny × 全限定名 glob/group/namespace，白名单优先、deny 优先默认 EC-014）②dsh 可插拔策略对象（部署方注入）③allowed-tools 授权集；ask 命中 → 分发挂起 Promise，经 RouterOptions.policy.onAsk 桥交场景 UI（React 弹层）裁决，取消/超时 → deny + 审计（EC-002）；执行器之后统一 PostToolUse 审计（audit.ts）。策略代码只存在于路由层（grep 断言 NFR-003）。
**后果**: 所有已注册工具（含未来动态源）自动获得门禁与审计（FR-013 同层机制先例）；deny 短路在 delay 前零等待；base 零 UI（NG-008 grep 断言）；runner 场景 hooks 与框架级策略职责清晰分层（F-23 hooks 语义不变）；AI 会话在 ask/deny 下可自愈（EC-002 测试面）。

### ADR-003: 存储载体 = OPFS（卷语义）+ IndexedDB（结构化状态）双载体 + StorageBackend 抽象（node memory 双轨）

**状态**: PROPOSED
**背景**: FR-013 明文「OPFS 卷 + IndexedDB 对象库两载体语义」；goal/jobs/session/todo 为结构化记录需索引/事务/跨标签共享（FR-030/031/034 EC-013）；双轨测试要求 node 可测（NFR-006）；storage 工具需运行于页面与 worker（FR-013 AC，OPFS worker 同步访问为独有优势）。
**决策**: 定义统一 `StorageBackend`（list/read/write/remove + estimate/persist），浏览器实现 = opfs（卷/目录/句柄 + worker 同步）+ idb（对象库/事务/冲突标记原语），node 实现 = memory（降级/测试默认 EC-005）；storage/storage-quota 工具经该抽象触达；settings 独立同步 KV 小后端（localStorage 适配器 + memory，FR-015）不入 OPFS/IDB；store 工厂（session/goal/jobs）基于 idb 载体并提供 memory 双轨。
**后果**: 载体切换只动适配器（单一抽象缝）；node 面全链可测（注入 fake）；隐私模式/配额超限统一转译（EC-004/005）；OPFS 卷与 IDB 对象库各用所长（§3.3 取舍）；多标签冲突语义在 IDB 层提供原语（EC-013）。

### ADR-004: Worker 生命周期 = jobs 页面存活期 + IDB 状态 + interrupted + Notification，无跨页保活/常驻守护；worker 会话状态跨调用级

**状态**: PROPOSED
**背景**: 浏览器无 OS 进程/常驻守护承载（§3.5 NG）；O-004 建议（S-03 已裁）：后台作业 = 页面存活期执行 + 状态/结果落 IDB + 完成 Notification + 卸载标记 interrupted（可查/可重试）；跨页存活/服务端守护 = out（代理原则）；FR-028 持久执行上下文无 PTY 语义（NG-005）。
**决策**: jobs 工具 = 任务句柄（submit→jobId；status/result/log/cancel），执行 = 页面内存异步任务，生命周期事件（完成/失败/中断）落 JobStore（IDB），beforeunload/Page Lifecycle 标记 interrupted，恢复后可查/取消/重试（EC-008）；完成通知经 notify 适配器（授权失败转译 FR-009）；启动类命令即时返回 jobId、不叠 delay（EC-015，jobs 条目 delayMs:0 沿 FR-016 免除通道）；worker-session（FR-028）仅承诺「worker 进程存活期内状态跨调用」，页面卸载即失（记录于 help/工具描述，不冒充常驻）。
**后果**: 无服务端依赖达成「后台任务可跟踪可恢复」（浏览器生态位语义降级而非假装守护）；subagent/worker 崩溃重建、主会话不中断（EC-009）；Notification 权限由浏览器手势承担、应用侧转译授权失败（FR-009）。

### ADR-005: eval-js/wasm 沙箱 = worker 执行器注入（无 DOM 面）+ PRM 门禁 + untrusted 拒执行；非 OS 沙箱声明

**状态**: PROPOSED
**背景**: FR-026 页内沙箱计算（浏览器「进程」替代位），副作用受 PRM、untrusted 不自动执行（FR-010 EC-007）；真 shell/OS 面不可承载（NG-001）；无 PTY（NG-005）；浏览器沙箱（渲染进程/CSP）是架构级非工具层（discovery §3.3 D 组）。
**决策**: eval-js/eval-wasm 执行器 = PlatformEnv.workerFactory 生成 worker（blob/模块），消息协议执行代码并返回结构化结果，天然无 DOM/UI 面、可 terminate；执行前 PRM 门禁裁决（写/外联默认 ask/deny，risk 分类提示）；输入默认为 untrusted 代码——含 untrusted 来源内容（web-fetch/web-search 结果 FR-010 标记）默认拒执行，除非显式 trusted 策略放行；CSP（worker-src/script-src）约束文档化；node 面 = 注入桩执行器（NFR-006）。
**后果**: 「执行/计算域」有浏览器原生落点（对标 shell 生态位但语义正确）；DOM/网络副作用结构性收窄 + 策略门禁双保险；untrusted 注入防护有可测基线（EC-007）；worker 非 OS 沙箱的边界显式声明（帮助面文案），不做假抽象（R-002 缓解）。

### ADR-006: MCP Streamable HTTP = base 内置轻量客户端（零 SDK 依赖、fetch+SSE），命名空间 mcp:* 试点

**状态**: PROPOSED
**背景**: FR-037 P2 试点 MCP Streamable HTTP（1-2 连接器）；stdio 不可承载（NG-001）；NFR-002 base 零默认外部服务、新依赖需评审；官方 @modelcontextprotocol/sdk 以 Node/stdio 为中心、浏览器侧适配成本高；F-14 协议发现为下游关联面（不承诺）。
**决策**: mcp-client.ts 实现最小 Streamable HTTP/JSON-RPC 客户端（initialize → tools/list → tools/call + SSE 流解析），工具以 mcp:* 命名空间动态注册进 router（复用 FR-003 动态注册 + FR-008 allowed-tools + FR-038 审计）；服务器配置/凭据 = 场景注入（env.mcpServers），端点不可达 → 该源工具降级、其余不受影响（EC-012）；CSP connect-src 约束记录于扩展帮助面（NFR-008）；不引入官方 SDK（§3.5 方案 A）。
**后果**: base 零新增运行时依赖（NFR-002 保持）；试点成本可控（可裁剪不阻塞发布）；协议知识内聚 base = F-14 前置雏形面；mock MCP HTTP 服务器全链可测（FR-037 AC，P2 入范围时）。

### ADR-007: 会话恢复/上下文压缩 = session store + 场景 chat 闭包承接（runner 主体零改动），services 经 ctx 注入

**状态**: PROPOSED
**背景**: FR-034 会话持久化/恢复（IDB，刷新可恢复）；FR-035 上下文压缩（摘要保留可检索）；runner turns 内部维护（runner.ts:92）、chat/hooks/events 为场景注入面；F-23 runner 测试 12 例零回归是红线（AC-009）。
**决策**: 会话持久化（turns/事件流/恢复点）由 base `SessionStore`（IDB + memory 双轨）承接，恢复路径 = 场景（lgdl-web）在 chat 闭包前预置历史 turns、恢复入口 UI 归场景；上下文压缩由 `context-tool`/summarizer（env 注入）生成摘要，压缩触发策略由场景在 chat 闭包声明（超阈值先压缩再送 LLM），原始记录保留于 session store 可检索（FR-035 AC）；AgentRunner 主体零改动（仅消费侧扩展：ctx 组装 + chat 闭包）；ToolContext.services 承载跨工具状态访问面（FR-044），docId/source 文档态契约保留。
**后果**: runner 零回归（F-23 测试不动）；会话/上下文能力全部落在浏览器持久化优势（IDB）上；多标签冲突 = 冲突标记/last-write（EC-013 S-02）；摘要动作可审计（NFR-009）；场景（lgdl-web）获得「刷新不丢、长会话不爆」的接入路径（FR-046 行为改进声明项）。

### ADR-008: ask/配置 UI 归属场景 + web-search BYOK + settings 骨架入 base（provider 数据不强迁）

**状态**: PROPOSED
**背景**: NG-008 权限 ask / MCP·skill 配置 / 消息渲染一律归场景，base 只定契约/状态/事件；O-007 建议（S-08/S-09 已裁）：lgdl-web 默认注册矩阵、web-search key 场景注入（BYOK 未配置禁用）、settings 骨架入 base 且 lgdl-web provider 数据平移不强绑（向后兼容优先 FR-042）。
**决策**: base 侧：router policy.onAsk 只暴露裁决桥与挂起事件（FR-007/041 联动）、assembly 提供默认矩阵/目录、settings 工具提供通用 KV 骨架（FR-015）、零 UI 代码（grep 断言）；lgdl-web 侧：AskDialog（React）呈现权限 ask 与 ask-user（FR-023/041）、SettingsPanel 增加 web-search 端点/key 配置（FR-040）与 skill/MCP 配置入口（若入范围 FR-041）、provider 应用态 localStorage `lgdl-ai-settings`（provider.ts:72）扩展 webSearch 字段且旧字段读写行为不回归（FR-042）。
**后果**: base 保持中性纯度（NFR-001/AC-010）；「做了有人用」闭环（Q-011 解）：矩阵默认开场景必要域、web-search 配 key 即用、ask 有弹层；场景数据不强迁避免回归（向后兼容优先）；key 永不进 schema/help/日志（FR-040 AC）。

---

## 8. 交接 tasks（落点模块清单与波次）

> 仅标注落点与验收锚点，不做任务拆分（tasks 职责）；每步沿用「可构建 + 相关包测试绿」门禁；波次先序见 §2.6

| 波次 | 落点 | 模块/文件 | 关联 FR/AC 锚点 |
|:--:|------|----------|----------------|
| 波 1 | registry v2 | web-cli-base/src/router.ts + router.test.ts 增补 | FR-001~004/038/043；AC-005/011；F-23 router.test 零回归 |
| 波 1 | 权限门禁 | permission.ts + audit.ts + platform.ts（+测试） | FR-005~010；AC-004；EC-001/002/014；NFR-003/009 |
| 波 1 | 存储载体 | storage-{mem,idb,opfs}.ts + storage-tools.ts + settings.ts（+测试） | FR-013~015/042；AC-006；EC-004/005/013；NFR-006 |
| 波 1 | 内容对象读 | doc-tools.ts（读面 + 编辑原语壳） | FR-011/012；AC-002 |
| 波 1 | web-fetch 升级 | web-fetch.ts + tools.ts schema（+测试增补） | FR-018/010/043；AC-009；缺省兼容 |
| 波 1 | 会话持久化 | session-store.ts + session-tool.ts（+测试） | FR-034/035（store 面）；AC-006；EC-005/013；S-01/S-02 |
| 波 1 | web-search 骨架 | web-search.ts（未配置禁用态 + 注入面） | FR-019/040；EC-006；S-08 |
| 波 1 | 组装/接入 | assembly.ts + lgdl-web session.ts/provider.ts（矩阵+env+ask 桥+services+webSearch） | FR-039/040/044；AC-007；S-08/S-09 |
| 波 1 | 基线补跑 | F-23 AC-008 真实 AI 闭环前置人工基线（validate 预备） | FR-045/046；AC-008；R-005 |
| 波 2 | 检索域 | search-tools.ts（search-content/list-resources） | FR-016/017；AC-002/011；EC-011 |
| 波 2 | DOM/UI 域 | dom-tools.ts + ask-user.ts | FR-022/023；AC-002/004；EC-003 |
| 波 2 | 任务/状态域 | todo.ts + goal.ts + jobs.ts + subagent.ts | FR-029~032；AC-002/006；EC-008/009/013/015；S-01~S-04 |
| 波 2 | 执行域 js | eval-tools.ts（js 面） | FR-026；AC-002/004；EC-007；S-04 |
| 波 2 | skill 加载 | skill-loader.ts | FR-036/008/038；AC-012；S-06 |
| 波 2 | 上下文压缩 | context-tool.ts（+session 恢复入口 lgdl-web App） | FR-035/034；AC-006；NFR-009 |
| 波 2 | ask UI | lgdl-web AskDialog.tsx + AiPanel 接线 + SettingsPanel 扩展 | FR-041/007/023；AC-004/007；NG-008 |
| 波 3 | 增强/试点 | stream.ts / exec-remote.ts / worker-session.ts / eval-wasm / workflow.ts / mcp-client.ts / notify.ts / clipboard.ts / save-file.ts 完整 / provider 平移可选 | FR-020/021/024/025/027/028/033/037/042；AC-002/012；NG-001/004/005 |
| 全波 | 门禁 | 全仓测试全绿 + tsc/vite 零错误 + grep 零残留断言（OS 工具名/策略旁路/UI 上收/中性纯度） | NFR-001/003/006/007/010；AC-001/003/009/010 |

---

## 9. 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建：基于 spec.md v1.0（S-01~S-09 全量已裁）+ discovery v1.1 + F-23 产物 + 代码实测（9 项基线核实说明）。产出：①九域模块划分（机制层 router v2/permission/audit/platform/assembly + 域工具层 9 域 20+ 平铺模块，含 OPFS/IDB/mem 载体）；②F-23 扩展接口三件套（ToolEntry additive 字段 group/namespace/enabled/risk、PermissionGate 挂 router.dispatch 与 delay 同层先于执行器、动态源 register 分组 + 全限定名三链一致派生）；③方案对比六主题（注册表形态/权限挂点/存储载体/eval 沙箱/MCP 实现/web-fetch 升级）各 2-3 案 + 推荐理由；④文件影响面（base MODIFY 5 / NEW 46 / lgdl-web MODIFY 7 / NEW 1，跨 2 包，测试平铺 src 根兼容通配脚本）；⑤风险矩阵 R-001~R-012；⑥ADR-001~008 完整正文（注册表 v2/权限门禁/存储双载体/worker 生命周期/eval 沙箱/MCP 轻量客户端/会话恢复 runner 零改动/UI 归属与 BYOK）；⑦波次交接（P0/P1/P2 模块×FR/AC 锚点表）；⑧技术开放点 P-01~P-05 列 §4.3（待作者确认） | 2026-09-06 | SDDU Plan Agent |
