# 任务分解：web-cli-base v2：面向浏览器生态位的 agent 能力完备化（specs-tree-web-cli-base-v2）

> **文档定位**: SDDU 任务清单 — 将技术方案分解为可并行执行的原子任务，作为 build 阶段的输入
> **前置依赖**: plan.md v1.0（8 ADR + 两层模块 + P0/P1/P2 波次交接，文件影响 base NEW46/MODIFY5 + lgdl-web NEW1/MODIFY7）、spec.md v1.0（46 FR 十三组 + 10 NFR + 15 EC + 12 AC + S-01~S-09 已裁）
> **创建人**: SDDU Tasks Agent
> **创建时间**: 2026-09-06
> **版本**: v1.0
> **更新人**: SDDU Tasks Agent
> **更新时间**: 2026-09-06
> **更新说明**: 初始创建（基于 plan §2.6 波次先序 + §8 交接表 + §5 文件影响面拆分为 15 个原子任务 / 9 个执行波次；P0=机制层+存储/NET/会话首批载体 7 任务，P1=域工具主体+场景收敛 5 任务，P2=试点 2 任务，门禁 1 任务；F-23 红线：runner 主体零改动、ToolEntry additive、测试守恒基线 D-005 记录于 §4）

---

## 1. 依赖拓扑总览

> 任务依赖关系和执行顺序；每任务带「独立可验证」标志（✅ = 任务自身验证命令可自证完成，不依赖后续任务）；P0/P1/P2 = plan 波次标签，Wave N = 实际执行波次

### 1.1 任务总览表

| 编号 | 模块/落点 | 复杂度 | 依赖 | plan波次 | 独立可验证 | 一句话目标 |
|------|----------|:--:|------|:--:|:--:|------|
| TASK-001 | base 机制层三件套 | L | 无 | P0 | ✅ | permission.ts + audit.ts + platform.ts（门禁/审计/平台适配） |
| TASK-002 | base registry v2 | L | 001 | P0 | ✅ | router.ts 注册表 v2 + dispatch 门禁/审计接线（additive） |
| TASK-003 | base 存储域 | L | 002 | P0 | ✅ | storage 载体（mem/idb/opfs）+ storage-tools + settings |
| TASK-004 | base doc-tools | M | 003 | P0 | ✅ | doc-read / doc-edit 内容对象原语 |
| TASK-005 | base NET P0 | M | 002 | P0 | ✅ | web-fetch additive 升级 + web-search 骨架 |
| TASK-006 | base SES 域 | M | 003 | P0 | ✅ | session-store + session-tool + context-tool |
| TASK-007 | base assembly + lgdl-web v1 | L | 003/004/005/006 | P0 | ✅ | assembly.ts + index P0 导出 + session/provider 组装接入 |
| TASK-008 | base 检索域 | M | 003/006 | P1 | ✅ | search-content / list-resources |
| TASK-009 | base DOM/UI 域 | M | 001/002 | P1 | ✅ | dom-* 子命令族 + ask-user |
| TASK-010 | base 任务/状态域 | L | 003/006 | P1 | ✅ | todo + goal + jobs + subagent |
| TASK-011 | base 执行+扩展域 | M | 001/002 | P1 | ✅ | eval-js + skill-loader |
| TASK-012 | lgdl-web 场景收敛 v2 | L | 007~011 | P1 | ✅ | AskDialog/AiPanel/SettingsPanel/App + session 矩阵扩域 |
| TASK-013 | base P2 浏览器/网络试点 | M | 001/002 | P2 | ✅ | notify + clipboard + save-file 完整 + stream（可裁） |
| TASK-014 | base P2 执行/编排/扩展试点 | L | 010/011 | P2 | ✅ | exec-remote + worker-session + eval-wasm + workflow + mcp-client（可裁） |
| TASK-015 | 全仓门禁 | M | 全部 | GATE | ✅ | 全仓 build/test + grep 零残留 + D-005 核验 + FR-045/046 基线预备 |

### 1.2 依赖拓扑（串行链 + 并行组）

```
P0 机制/载体链（机制先行）：
  TASK-001 permission/audit/platform ──▶ TASK-002 registry v2 ──┬─▶ TASK-003 存储域 ──┬─▶ TASK-004 doc-tools
                                                                │                     └─▶ TASK-006 SES 域
                                                                └─▶ TASK-005 NET P0（并行于 TASK-003）
  TASK-007 assembly + lgdl-web v1（依赖 003~006；P0 收口）

P1 域工具主体（四域并行，均只依赖 P0 产物）：
  TASK-008 检索域 / TASK-009 DOM+ask-user / TASK-010 任务状态域 / TASK-011 执行+skill
  TASK-012 lgdl-web 场景收敛（依赖 007~011；P1 收口）

P2 试点（并行，独立可裁）：
  TASK-013 浏览器/网络试点   TASK-014 执行/编排/扩展试点
  TASK-015 全仓门禁（依赖全部）
```

### 1.3 并行分组（Wave）

```
Wave 1 ─── (P0-a，无依赖)
  TASK-001 [L] base 机制层三件套

Wave 2 ─── (P0-b，依赖 TASK-001)
  TASK-002 [L] base registry v2

Wave 3 ─── (P0-c，依赖 TASK-002；两任务并行)
  TASK-003 [L] base 存储域
  TASK-005 [M] base NET P0（web-fetch 升级 + web-search）

Wave 4 ─── (P0-d，依赖 TASK-003；两任务并行)
  TASK-004 [M] base doc-tools
  TASK-006 [M] base SES 域

Wave 5 ─── (P0-e，依赖 003~006)
  TASK-007 [L] assembly + base index P0 导出 + lgdl-web 组装接入 v1

Wave 6 ─── (P1-a，四域并行)
  TASK-008 [M] base 检索域
  TASK-009 [M] base DOM/UI 域
  TASK-010 [L] base 任务/状态域
  TASK-011 [M] base 执行+扩展域

Wave 7 ─── (P1-b，依赖 007~011)
  TASK-012 [L] lgdl-web 场景收敛 v2

Wave 8 ─── (P2，两试点并行，独立可裁)
  TASK-013 [M] base P2 浏览器/网络试点
  TASK-014 [L] base P2 执行/编排/扩展试点

Wave 9 ─── (依赖全部)
  TASK-015 [M] 全仓门禁 + grep 断言 + D-005 核验
```

---

## 2. 任务列表

> 每个任务的详细定义；验证命令中 lgdl-web 相关含 vite build + 显式 tsc（vite 不做类型检查）

### TASK-001: base 机制层三件套（permission.ts + audit.ts + platform.ts）

| 属性 | 值 |
|------|-----|
| **复杂度** | L |
| **前置依赖** | 无 |
| **执行波次** | Wave 1（plan P0-a） |
| **对应 FR** | FR-005/006/007/008/009；EC-001/002/003/014；AC-004；NFR-002/003/006/009 |
| **模块** | packages/web-cli-base |

**输入**: plan §2.3.2（PermissionGate 挂点/三者组合/ask 契约/审计）、§4.2 测试策略、ADR-002；spec PRM 组 FR-005~010 + EC-001/002/014

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| NEW | packages/web-cli-base/src/permission.ts |
| NEW | packages/web-cli-base/src/permission.test.ts |
| NEW | packages/web-cli-base/src/audit.ts |
| NEW | packages/web-cli-base/src/audit.test.ts |
| NEW | packages/web-cli-base/src/platform.ts |
| NEW | packages/web-cli-base/src/platform.test.ts |

**输出**: 机制层三个独立新模块（均零 LGDL/react import）——PermissionGate（三元组规则 + dsh 策略对象 + allowed-tools + 默认取向 + AskHandle 挂起契约）、AuditSink（memory/console 实现 + createAudit）、PlatformEnv（类型 + browserEnv/nodeEnv + 授权失败转译工具）

**验收标准**:
- [ ] permission.ts 导出 PermissionGate/PolicyRule/PolicyStrategy/AskHandle/PolicyConfig；裁决管线：规则集→策略对象→allowed-tools，缺省取向只读 allow/敏感 ask/危险 deny
- [ ] permission.test.ts：裁决矩阵（allow/ask/deny × 命中/未命中）+ deny 间谍断言（执行器未被调用）+ ask 三路（allow/deny/超时→deny+审计）+ EC-014 deny 优先 + EC-001 三态文案互异
- [ ] audit.ts：AuditSink/AuditEvent + memory/console 实现；audit.test.ts 覆盖权限/调用/扩展注册/压缩四类事件
- [ ] platform.ts：PlatformEnv 类型覆盖 fetch/storage/kv/clipboard/notify/filePicker/worker/dom/permissions/search 缝；browserEnv()/nodeEnv() 提供；授权失败（NotAllowedError/SecurityError/NotFoundError）→ 友好转译工具
- [ ] platform.test.ts：node fake 断言 + 转译注入
- [ ] base build + test 全绿；grep 无 lgdl/react import

**验证命令**:
```bash
npm run build --workspace @lgdl/web-cli-base && npm run test --workspace @lgdl/web-cli-base
```

### TASK-002: base registry v2（router.ts 注册表 v2 + dispatch 门禁/审计接线）

| 属性 | 值 |
|------|-----|
| **复杂度** | L |
| **前置依赖** | TASK-001 |
| **执行波次** | Wave 2（plan P0-b） |
| **对应 FR** | FR-001/002/003/004/005/038/043；EC-001/010；AC-005/011；NFR-004/005 |
| **模块** | packages/web-cli-base |

**输入**: plan §2.3.1（ToolEntry additive + 注册键三链 + RegisterOptions）+ §2.3.2（dispatch 挂点序）+ §3.1 方案 A + ADR-001/002；spec REG 组 FR-001~004 + BSL FR-043

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| MODIFY | packages/web-cli-base/src/router.ts |
| MODIFY | packages/web-cli-base/src/router.test.ts |

**输出**: CommandRouter 注册表 v2（全限定名键 + namespace/group/enabled/risk 元数据 + 动态注册/卸载/查询 + enabledTools/setNamespaceOrder + 分组派生 + dispatch enabled→PermissionGate→delay→executor→PostToolUse audit 五步链）

**验收标准**:
- [ ] ToolEntry 仅追加 group/namespace/enabled/risk（缺省=旧行为逐字节一致）；ToolResult.trust / ToolContext.services additive（FR-043/044）
- [ ] 注册键=全限定名 ns.name；三链一致（schema.function.name/dispatch 键/help 查询键）；同基名不同 ns 共存；重复注册同 ns 同名抛错（EC-010/EC-003）
- [ ] register(entry,{source,allowedTools}) 动态源注册入 audit（FR-038）；unregister → 三链即时消失；query({namespace,group,name,enabled})
- [ ] deriveTools(opts) 分组/命名空间/开关（缺省=原 F-23 顺序，router.test.ts:153 零回归 AC-005）；listHelp 按组分节
- [ ] dispatch 五步链：查条目→enabled 检查（已禁用显式错误 EC-001 文案互异）→PermissionGate（deny→权限被拒，执行器不被调用）→delay gate（effDelay 钳制保持）→executor→PostToolUse audit
- [ ] F-23 既有 router.test 13 例零回归

**验证命令**:
```bash
npm run build --workspace @lgdl/web-cli-base && npm run test --workspace @lgdl/web-cli-base
```

### TASK-003: base 存储域（storage 载体 + storage-tools + settings）

| 属性 | 值 |
|------|-----|
| **复杂度** | L |
| **前置依赖** | TASK-002 |
| **执行波次** | Wave 3（plan P0-c） |
| **对应 FR** | FR-013/014/015/042；EC-004/005/013；AC-006；NFR-006 |
| **模块** | packages/web-cli-base |

**输入**: plan §3.3 方案 A + ADR-003（OPFS+IDB 双载体 + StorageBackend 抽象 + memory 双轨）+ §5.1 存储行；spec STR 组 FR-013~015

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| NEW | packages/web-cli-base/src/storage-mem.ts |
| NEW | packages/web-cli-base/src/storage-idb.ts |
| NEW | packages/web-cli-base/src/storage-opfs.ts |
| NEW | packages/web-cli-base/src/storage-tools.ts |
| NEW | packages/web-cli-base/src/storage-tools.test.ts |
| NEW | packages/web-cli-base/src/settings.ts |
| NEW | packages/web-cli-base/src/settings.test.ts |

**输出**: StorageBackend 统一抽象 + mem/idb/opfs 三实现 + storage/storage-quota 工具（ToolEntry 工厂）+ settings 同步 KV 工具

**验收标准**:
- [ ] StorageBackend 接口（list/read/write/remove + estimate/persist）；memory 实现（node 测试/降级默认 EC-005）；idb 实现（对象库/事务/写冲突标记原语 EC-013）；opfs 实现（卷/目录/文件句柄/worker 同步）
- [ ] storage-tools.test.ts：fake/memory 后端断言 CRUD 全链 + quota 假值输出格式 + EC-004/005 转译
- [ ] settings：get/set/list/remove 同步语义 + localStorage 适配器/memory + 命名空间隔离；settings.test.ts node 假后端 CRUD + 隔离
- [ ] 真实浏览器冒烟（OPFS/IDB 真持久）预留清单写入测试注释（validate 承接）
- [ ] base build + test 全绿

**验证命令**:
```bash
npm run build --workspace @lgdl/web-cli-base && npm run test --workspace @lgdl/web-cli-base
```

### TASK-004: base doc-tools（内容对象读写原语）

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-003 |
| **执行波次** | Wave 4（plan P0-d） |
| **对应 FR** | FR-011/012；AC-002 |
| **模块** | packages/web-cli-base |

**输入**: plan §5.1 doc 行 + §2.2 DOC 域；spec DOC 组 FR-011/012（对象模型非文件路径；编辑原语 str_replace/insert/create；read-before-edit 由 PRM 承载）

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| NEW | packages/web-cli-base/src/doc-tools.ts |
| NEW | packages/web-cli-base/src/doc-tools.test.ts |

**验收标准**:
- [ ] doc-read：ctx.docId/source 或 storage 卷条目/ctx.services 读取内容对象；无上下文→友好错误 + 可读对象列表；无路径遍历语义
- [ ] doc-edit：str_replace/insert/create 原语；ToolResult ok/output/changed/source 兼容 F-23
- [ ] doc-tools.test.ts：假 ctx 读写 + 无上下文错误 + 编辑原语 changed/source 推进 + read-before-edit 策略联动（未先读→ask）
- [ ] base build + test 全绿

**验证命令**:
```bash
npm run build --workspace @lgdl/web-cli-base && npm run test --workspace @lgdl/web-cli-base
```

### TASK-005: base NET P0（web-fetch additive 升级 + web-search 骨架）

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-002 |
| **执行波次** | Wave 3（plan P0-c） |
| **对应 FR** | FR-018/019/010/040；EC-006；AC-009；NFR-005 |
| **模块** | packages/web-cli-base |

**输入**: plan §3.6 方案 A（additive 参数 + 缺省兼容）+ ADR-009 语义 + §5.1 NET 行；spec NET 组 FR-018/019

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| MODIFY | packages/web-cli-base/src/web-fetch.ts |
| MODIFY | packages/web-cli-base/src/tools.ts |
| MODIFY | packages/web-cli-base/src/web-fetch.test.ts |
| NEW | packages/web-cli-base/src/web-search.ts |
| NEW | packages/web-cli-base/src/web-search.test.ts |

**验收标准**:
- [ ] web-fetch schema 追加可选参数（clean/护栏上限），缺省行为逐字节兼容（FR-018 AC/FR-043）；HTML→MD 清洗默认关（零依赖最小转换器）；大小/时长护栏截断 + 元信息；网络/CORS/HTTP 错误分类可读
- [ ] untrusted：外部结果 ToolResult.trust（来源/时间/可信级），清洗不丢标记（FR-010）
- [ ] web-fetch.test.ts 增补：mock fetch 原文/清洗两态 + 标记 + 截断 + CORS 分类（既有用例零回归）
- [ ] web-search：query→结果列表（标题/摘要/来源/untrusted）；端点/凭据经 env.searchEndpoint 注入（base 零内置端点零内置 key）；未配置→禁用态 + 指引（EC-006）
- [ ] web-search.test.ts：假搜索服务全链 + 未配置态
- [ ] base build + test 全绿

**验证命令**:
```bash
npm run build --workspace @lgdl/web-cli-base && npm run test --workspace @lgdl/web-cli-base
```

### TASK-006: base SES 域（session-store + session-tool + context-tool）

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-003 |
| **执行波次** | Wave 4（plan P0-d） |
| **对应 FR** | FR-034/035；EC-005/013；AC-006；NFR-009 |
| **模块** | packages/web-cli-base |

**输入**: plan §2.3.4（services/状态态）+ §2.4 数据流（SessionStore IDB←turns/恢复点）+ ADR-007（runner 主体零改动，chat 闭包承接）+ §5.1 SES 行；spec SES 组 FR-034/035 + S-01/S-02

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| NEW | packages/web-cli-base/src/session-store.ts |
| NEW | packages/web-cli-base/src/session-tool.ts |
| NEW | packages/web-cli-base/src/context-tool.ts |
| NEW | packages/web-cli-base/src/task-state.test.ts |

**验收标准**:
- [ ] session-store：turns/恢复点序列化 + IDB 载体 + 冲突标记/last-write（EC-013）+ 降级内存态（EC-005）；store 工厂（IDB+memory 双轨）
- [ ] session-tool：持久化/恢复查询/恢复点管理（恢复入口 UI 归场景，base 只做契约/状态）
- [ ] context-tool：turns/工具输出摘要压缩（summarizer env 注入）；原始记录保留可检索；压缩动作入 audit（NFR-009）
- [ ] task-state.test.ts（session/context 段，node fake 后端）：持久→恢复 turns 等价 + 冲突标记 + 摘要后体量下降且关键结果可检索 + 压缩可审计
- [ ] 不修改 runner.ts（ADR-007：集成面=chat 闭包 + session store）
- [ ] base build + test 全绿

**验证命令**:
```bash
npm run build --workspace @lgdl/web-cli-base && npm run test --workspace @lgdl/web-cli-base
```

### TASK-007: assembly.ts + base index P0 导出 + lgdl-web 组装接入 v1

| 属性 | 值 |
|------|-----|
| **复杂度** | L |
| **前置依赖** | TASK-003、TASK-004、TASK-005、TASK-006 |
| **执行波次** | Wave 5（plan P0-e） |
| **对应 FR** | FR-039/040/044/042；AC-007；NFR-007 |
| **模块** | packages/web-cli-base + packages/lgdl-web |

**输入**: plan §2.3.5（lgdl-web 组装点扩展四步：矩阵/env 绑定/ask 桥/services）+ §5.1 assembly 行 + §5.2 lgdl-web 行 + ADR-008；spec LGDL 组 FR-039/040/042/044 + BSL FR-043（F-23 派生顺序/600ms 保持）

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| NEW | packages/web-cli-base/src/assembly.ts |
| NEW | packages/web-cli-base/src/assembly.test.ts |
| MODIFY | packages/web-cli-base/src/index.ts |
| MODIFY | packages/lgdl-web/src/ai/session.ts |
| MODIFY | packages/lgdl-web/src/ai/session.test.ts |
| MODIFY | packages/lgdl-web/src/ai/provider.ts |
| MODIFY | packages/lgdl-web/src/ai/provider.test.ts |

**输出**: base 侧组装器 + P0 导出面；lgdl-web 组装点扩展 v1（P0 矩阵子集 + browserEnv + ask 桥 + services + webSearch 条件注册）；session.ts 在本任务 + TASK-012 顺序扩展（非并行）

**验收标准**:
- [ ] assembly.ts：buildDefaultMatrix()（域→group/enabled/条件开 + namespace 次序 + 顺序契约）+ createDefaultRouter(env, opts)；工厂由调用方注入（不 import 未建域工厂 → P1 扩域不改本文件，仅 session.ts 增注册）
- [ ] assembly.test.ts：矩阵派生断言（schema/help/dispatch 三链与矩阵一致；顺序契约延续）
- [ ] base index.ts 追加导出：permission/audit/platform/assembly + P0 域工具工厂 + store 类型（NFR-007）
- [ ] lgdl-web session.ts：browserEnv() 注入 + 矩阵消费（storage/doc/session 默认开、web-search 条件开）+ router policy.onAsk 桥配置 + audit 装配 + ctx.services（SessionStore）注入；web-search 未配置→禁用态（EC-006）
- [ ] provider.ts：ProviderSettings 扩展 webSearch?: {endpoint; apiKey}（BYOK；key 不进 schema/help/日志）；既有 localStorage 读写零回归（FR-042）
- [ ] session.test.ts：派生顺序断言改写承接矩阵（D-005 记录）+ ask 桥 fake 三路 + services 注入断言；provider.test.ts 增 webSearch 读写/缺省用例；F-23 既有 session 用例保留语义等价
- [ ] 既有 2 业务注册 + delayMs 600 保持（FR-043）；lgdl-web vite build + 显式 tsc 零错误；base + lgdl-web test 全绿

**验证命令**:
```bash
npm run build --workspace @lgdl/web-cli-base && npm run test --workspace @lgdl/web-cli-base && npm run build --workspace @lgdl/lgdl-web && npx tsc --noEmit -p packages/lgdl-web/tsconfig.json && npm run test --workspace @lgdl/lgdl-web
```

### TASK-008: base 检索域（search-tools）

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-003、TASK-006 |
| **执行波次** | Wave 6（plan P1-a） |
| **对应 FR** | FR-016/017；EC-011；AC-002/011 |
| **模块** | packages/web-cli-base |

**输入**: plan §5.1 search 行；spec SRC 组 FR-016/017（内容集非文件路径；预算受控 EC-011）

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| NEW | packages/web-cli-base/src/search-tools.ts |
| NEW | packages/web-cli-base/src/search-tools.test.ts |

**验收标准**:
- [ ] search-content：对可及内容集（文档对象/卷条目/会话记录）模式+全文搜索；无索引退化线性扫描且结果一致；索引预算护栏（EC-011）
- [ ] list-resources：列出可及资源（与 web-cli-help 工具目录区分，help 文本断言）
- [ ] search-tools.test.ts：注入小内容集命中（含上下文行/位置）+ 退化一致 + 护栏
- [ ] base build + test 全绿

**验证命令**:
```bash
npm run build --workspace @lgdl/web-cli-base && npm run test --workspace @lgdl/web-cli-base
```

### TASK-009: base DOM/UI 域（dom-tools + ask-user）

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-001、TASK-002 |
| **执行波次** | Wave 6（plan P1-a） |
| **对应 FR** | FR-022/023；EC-003；AC-002/004 |
| **模块** | packages/web-cli-base |

**输入**: plan §2.2 DOM 行 + §5.1 dom/ask 行；spec DOM 组 FR-022/023（宿主同源 NG-003；ask-user 与 PRM ask 语义区分）

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| NEW | packages/web-cli-base/src/dom-tools.ts |
| NEW | packages/web-cli-base/src/dom-tools.test.ts |
| NEW | packages/web-cli-base/src/ask-user.ts |

**验收标准**:
- [ ] dom-tools：read-state/click/hover/scroll/zoom/fullscreen/snapshot 等子命令族；经 PlatformEnv.dom 注入（无 op-cli React handler 依赖）；写操作 risk:'ui' 走 PRM；help 声明同源边界（NG-003）
- [ ] ask-user：问题结构/选项/自由文本 + 回答回填（应答器 env 注入）；help 与权限 ask 区分（FR-023）
- [ ] dom-tools.test.ts：注入桩逐子命令 + deny 策略拦截写操作（间谍断言）+ ask-user fake 三型契约
- [ ] base build + test 全绿

**验证命令**:
```bash
npm run build --workspace @lgdl/web-cli-base && npm run test --workspace @lgdl/web-cli-base
```

### TASK-010: base 任务/状态域（todo + goal + jobs + subagent）

| 属性 | 值 |
|------|-----|
| **复杂度** | L |
| **前置依赖** | TASK-003、TASK-006 |
| **执行波次** | Wave 6（plan P1-a） |
| **对应 FR** | FR-029/030/031/032；EC-008/009/013/015；AC-002/006 |
| **模块** | packages/web-cli-base |

**输入**: plan §2.2 TSK 行 + §5.1 tsk 行 + ADR-004（jobs 生命周期：页面存活期+IDB+interrupted+Notification）；spec TSK 组 FR-029~032 + S-01~S-04（todo 随会话/goal·jobs 落 IDB/subagent 入 v2）

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| NEW | packages/web-cli-base/src/todo.ts |
| NEW | packages/web-cli-base/src/goal.ts |
| NEW | packages/web-cli-base/src/jobs.ts |
| NEW | packages/web-cli-base/src/subagent.ts |
| MODIFY | packages/web-cli-base/src/task-state.test.ts |

**验收标准**:
- [ ] todo：add/list/update/mark-done/remove，宿主=session store（S-01 随会话持久化）
- [ ] goal：create/get/update/archive+进度，宿主=IDB origin 级，多标签共享读 + 写冲突标记（EC-013）
- [ ] jobs：submit→jobId/status/result/log/cancel；页面存活期执行 + 状态结果落 IDB + beforeunload 标记 interrupted（可查/可重试 EC-008）+ 完成通知授权两路降级 + 条目 delayMs:0（EC-015 即时返回）
- [ ] subagent：嵌套 AgentRunner 同线程子会话（**runner.ts 主体零改动**——复用既有 createAgentRunner 类型/事件面）；会话隔离非进程隔离（help 声明安全边界由 PRM 承担）；工具集白名单裁剪；chat 工厂 env 注入；失败→ok:false 主会话不中断（EC-009）
- [ ] task-state.test.ts 扩展：CRUD/持久恢复/冲突标记/interrupted→恢复→重试/EC-015 即时返回/jobs 通知两路
- [ ] base build + test 全绿

**验证命令**:
```bash
npm run build --workspace @lgdl/web-cli-base && npm run test --workspace @lgdl/web-cli-base
```

### TASK-011: base 执行+扩展域（eval-tools js 面 + skill-loader）

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-001、TASK-002 |
| **执行波次** | Wave 6（plan P1-a） |
| **对应 FR** | FR-026/036/008/038；EC-007；AC-004/012 |
| **模块** | packages/web-cli-base |

**输入**: plan §3.4 方案 A + ADR-005（worker 执行器注入 + PRM + untrusted 拒）+ §5.1 eval/skill 行；spec EXE FR-026 + EXT FR-036 + S-06（skill 内置打包先行 + 运行时接口预留）

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| NEW | packages/web-cli-base/src/eval-tools.ts |
| NEW | packages/web-cli-base/src/eval-tools.test.ts |
| NEW | packages/web-cli-base/src/skill-loader.ts |
| NEW | packages/web-cli-base/src/skill-loader.test.ts |

**验收标准**:
- [ ] eval-tools（js 面）：PlatformEnv.workerFactory 注入执行器（无 DOM 面/可中断/主线程不卡）；纯计算语义；副作用尝试默认策略拦截；untrusted 输入默认拒执行（EC-007）；CSP worker-src 约束记录 help；help 声明「worker 非 OS 沙箱」（NG-001）
- [ ] eval-tools.test.ts（js 面）：注入执行器纯计算 + DOM/网络副作用拦截间谍 + untrusted 拒
- [ ] skill-loader：SKILL.md frontmatter（name/description/allowed-tools）+ 正文提示注入；内置打包先行 + 运行时加载接口预留（CSP 约束文档化）+ 用户导入可选；经 router 动态注册为 skill:*（FR-038 注册审计）；越权注册被拒（FR-008/AC-012）
- [ ] skill-loader.test.ts：内置 skill 加载→提示注入 + allowed-tools 越权被拒
- [ ] base build + test 全绿

**验证命令**:
```bash
npm run build --workspace @lgdl/web-cli-base && npm run test --workspace @lgdl/web-cli-base
```

### TASK-012: lgdl-web 场景收敛 v2（AskDialog + AiPanel + SettingsPanel + App + session 矩阵扩域）

| 属性 | 值 |
|------|-----|
| **复杂度** | L |
| **前置依赖** | TASK-007~TASK-011 |
| **执行波次** | Wave 7（plan P1-b） |
| **对应 FR** | FR-041/007/023/034/039；AC-004/007；NFR-007 |
| **模块** | packages/lgdl-web + packages/web-cli-base |

**输入**: plan §5.2（lgdl-web MODIFY 7 + NEW AskDialog）+ §2.3.5（session 矩阵扩域到 P1 工具）+ ADR-008（ask/配置 UI 归场景）；spec LGDL FR-041/039 + NG-008

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| NEW | packages/lgdl-web/src/ai/AskDialog.tsx |
| MODIFY | packages/lgdl-web/src/ai/AiPanel.tsx |
| MODIFY | packages/lgdl-web/src/ai/SettingsPanel.tsx |
| MODIFY | packages/lgdl-web/src/App.tsx |
| MODIFY | packages/lgdl-web/src/ai/session.ts |
| MODIFY | packages/lgdl-web/src/ai/session.test.ts |
| MODIFY | packages/web-cli-base/src/index.ts |

**输出**: 场景层 UI 与组装收敛——AskDialog（权限 ask + ask-user 双入口）、AiPanel 接线（policy.onAsk→AskDialog + ask 挂起/恢复渲染）、SettingsPanel（web-search BYOK 配置 + skill/MCP 入口）、App（会话恢复入口 + services 组装持有）、session.ts 矩阵扩域（P1 默认开域）、base index P1 导出追加

**验收标准**:
- [ ] base index.ts 追加导出 P1 域工具工厂（search/dom/eval/skill/todo/goal/jobs/subagent/context）（NFR-007）
- [ ] session.ts 矩阵扩域：search/todo/goal/jobs/context 默认开；dom-* 开（写经 PRM）；web-search 条件开；skill/MCP/exec-remote/save/ws 默认关显式装载
- [ ] AskDialog.tsx：allow/deny/记住选择 + ask-user 三型；AiPanel 在 ask 挂起期间正确呈现/恢复（AC-004）
- [ ] SettingsPanel：web-search 端点/key 配置（BYOK，FR-040）+ skill/MCP 配置入口（若入范围 FR-041）；provider 应用态 localStorage 读写零回归
- [ ] App.tsx：session store 恢复点提示恢复入口（FR-034）+ services（Session/Goal/JobStore）组装持有
- [ ] session.test.ts 增补矩阵扩域断言（D-005 记录改写依据）；vite build + tsc --noEmit 零错误；base + lgdl-web test 全绿

**验证命令**:
```bash
npm run build --workspace @lgdl/web-cli-base && npm run test --workspace @lgdl/web-cli-base && npm run build --workspace @lgdl/lgdl-web && npx tsc --noEmit -p packages/lgdl-web/tsconfig.json && npm run test --workspace @lgdl/lgdl-web
```

### TASK-013: base P2 浏览器/网络试点（notify + clipboard + save-file 完整 + stream）

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-001、TASK-002 |
| **执行波次** | Wave 8（plan P2） |
| **对应 FR** | FR-020/021/024/025；EC-003；AC-002 |
| **模块** | packages/web-cli-base |

**输入**: plan §5.1 save/notify/clipboard/stream 行；spec NET FR-020/021 + DOM FR-024/025（P2，授权失败转译 FR-009/EC-003）

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| NEW | packages/web-cli-base/src/notify.ts |
| NEW | packages/web-cli-base/src/clipboard.ts |
| NEW | packages/web-cli-base/src/save-file.ts |
| NEW | packages/web-cli-base/src/save-file.test.ts |
| NEW | packages/web-cli-base/src/stream.ts |

**验收标准**:
- [ ] notify：Notification API（授权两路转译 FR-009/EC-003；拒绝→降级路径提示）；配合 jobs 完成提醒
- [ ] clipboard：读/写（navigator.clipboard；手势/权限失败转译）
- [ ] save-file：File System Access 存用户文件 + blob 下载链两路径；save-file.test.ts 授权桩成功/拒绝两路 + 下载链冒烟
- [ ] stream：ws/eventsource 实时订阅（连接/订阅/接收/关闭；env 注入；错误重连语义）
- [ ] notify/clipboard/stream 授权失败转译单测（注入桩）
- [ ] base build + test 全绿；（试点，可整体裁剪不阻塞发布）

**验证命令**:
```bash
npm run build --workspace @lgdl/web-cli-base && npm run test --workspace @lgdl/web-cli-base
```

### TASK-014: base P2 执行/编排/扩展试点（exec-remote + worker-session + eval-wasm + workflow + mcp-client）

| 属性 | 值 |
|------|-----|
| **复杂度** | L |
| **前置依赖** | TASK-010、TASK-011 |
| **执行波次** | Wave 8（plan P2） |
| **对应 FR** | FR-027/028/033/037/026；EC-009/012；AC-012 |
| **模块** | packages/web-cli-base |

**输入**: plan §3.5 方案 A + ADR-006（MCP 轻量客户端零 SDK）+ §5.1 P2 行；spec EXE FR-027/028 + TSK FR-033 + EXT FR-037 + S-04/S-07

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| NEW | packages/web-cli-base/src/exec-remote.ts |
| NEW | packages/web-cli-base/src/worker-session.ts |
| MODIFY | packages/web-cli-base/src/eval-tools.ts |
| MODIFY | packages/web-cli-base/src/eval-tools.test.ts |
| NEW | packages/web-cli-base/src/workflow.ts |
| NEW | packages/web-cli-base/src/mcp-client.ts |
| NEW | packages/web-cli-base/src/mcp-client.test.ts |

**验收标准**:
- [ ] exec-remote：代理桥预留契约（端点/鉴权/超时=env 注入；未配置禁用+指引；help 声明「代理 OS 能力、非本框架实现」NG-004）
- [ ] worker-session：持久执行上下文（worker 会话内跨调用状态；无 PTY/终端语义 NG-005；页面卸载即失声明）；worker 崩溃重建主会话不中断（EC-009）
- [ ] eval-wasm：eval-tools.ts 扩展 wasm 完整面（worker 内实例化不阻塞 UI）；eval-tools.test.ts 增补 wasm 段
- [ ] workflow：声明式多步编排（步骤/扇出/条件汇聚；经 subagent 扇出）；假步骤扇出/汇聚计数断言
- [ ] mcp-client：Streamable HTTP/SSE 轻量客户端（initialize/tools/list/call；命名空间 mcp:* 动态注册 + allowed-tools + 注册审计 FR-038）；端点不可达→该源降级其余不受影响（EC-012）；mcp-client.test.ts mock 服务器全链
- [ ] base build + test 全绿；（试点，可整体裁剪不阻塞发布）

**验证命令**:
```bash
npm run build --workspace @lgdl/web-cli-base && npm run test --workspace @lgdl/web-cli-base
```

### TASK-015: 全仓门禁 + grep 零残留 + D-005 核验 + FR-045/046 基线预备

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-001 ~ TASK-014 全部 |
| **执行波次** | Wave 9（GATE） |
| **对应 FR** | FR-043/045/046；AC-001~012；NFR-001/002/003/006/007/010 |
| **模块** | 全仓（9 包） |

**输入**: plan §4.2（门禁 + grep 断言清单）+ §5.3（不改动面）；spec BSL FR-043/045/046 + NFR/AC 汇总

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| —（门禁验证，无源码改动） | 全仓 |

**验收标准**:
- [ ] 全仓 9 包 build + test 全绿（AC-009）；全仓 tsc/vite 零错误（AC-010，含 lgdl-web vite build + 显式 tsc）
- [ ] grep 断言零残留：base 无 lgdl/react/业务 import 与文案（NFR-001/AC-010/AC-012）；无 OS 生态位工具名（bash/PTY/文件路径语义 AC-003/NFR-010）；无策略旁路实现（NFR-003）；base 无 UI 代码（NG-008）
- [ ] D-005 核验：F-23 既有用例零删除；session.test.ts 派生顺序断言改写有据（矩阵扩展）；测试增删记录完整可审计
- [ ] AC-001 base 独立自足冒烟（router + 内建 + 域工具可列 schema/查 help/派发）
- [ ] FR-045/046 基线预备：F-23 AC-008 真实 AI 闭环补跑 + v2 浏览器工具冒烟清单 = validate 前置人工基线（需浏览器+API Key）；行为等价/声明改进 diff 清单落 validate 输入面（本任务只做代码级门禁与基线就绪检查）

**验证命令**:
```bash
npm run build && npm test && npx tsc --noEmit -p packages/lgdl-web/tsconfig.json
```

---

## 3. 任务汇总

> 任务数量、复杂度和波次的统计总览

| 统计项 | 数值 |
|--------|:--:|
| 总任务数 | 15 |
| S 级 (简单) | 0 |
| M 级 (中等) | 8（TASK-004/005/006/008/009/011/013/015） |
| L 级 (复杂) | 7（TASK-001/002/003/007/010/012/014） |
| 执行波次 | 9 |
| plan 波次覆盖 | P0×7（TASK-001~007）/ P1×5（TASK-008~012）/ P2×2（TASK-013~014）/ GATE×1（TASK-015） |

> 注：任务数取 plan §8 交接行的「模块级原子单位」上限口径——机制层三件套合并为 1 任务、同域工具合并、lgdl-web 组装分两阶段；P2 试点（TASK-013/014）为可裁剪任务，裁剪后不影响 P0/P1 交付与门禁。

---

## 4. 执行策略

> 各波次的执行说明

| 波次 | 任务 | 策略 |
|:--:|------|------|
| 1 | TASK-001 | 串行启动（机制层三件套先行，全 Feature 依赖其类型/契约） |
| 2 | TASK-002 | 串行（registry v2 依赖 permission/audit 类型；dispatch 五步链接线） |
| 3 | TASK-003, TASK-005 | 并行（存储域 / NET P0 互不依赖，均只依赖 registry v2） |
| 4 | TASK-004, TASK-006 | 并行（doc-tools 与 SES 域均依赖存储域；互不依赖） |
| 5 | TASK-007 | 串行（assembly + lgdl-web v1 收口 P0；P1 域工具未建故矩阵只含 P0 子集） |
| 6 | TASK-008, TASK-009, TASK-010, TASK-011 | 并行（检索/DOM/任务状态/执行+skill 四域互不依赖） |
| 7 | TASK-012 | 串行（lgdl-web 场景收敛 + session 矩阵扩域到 P1 工具 + base index P1 导出） |
| 8 | TASK-013, TASK-014 | 并行（P2 试点独立可裁，任一裁剪不影响发布） |
| 9 | TASK-015 | 收尾门禁（全部完成后跑全仓） |

**关键原子性提醒**：
- **runner 主体零改动（F-23 红线）**：TASK-006（会话恢复/压缩经 chat 闭包 + session store 承接）、TASK-010（subagent 复用既有 AgentRunner）均不改 runner.ts——grep/测试双重守卫
- **ToolEntry additive 契约（FR-043）**：TASK-002 只追加可选字段（group/namespace/enabled/risk + ToolResult.trust + ToolContext.services），F-23 router.test.ts:153 顺序断言零回归为每步门禁
- **测试守恒基线（D-005）**：全部 15 任务零删除 F-23 既有用例；仅 session.test.ts 派生顺序断言在 TASK-007/TASK-012 随矩阵扩展「改写有据」（记录于 §4.1），等价覆盖由矩阵派生断言承接
- **lgdl-web session.ts 顺序扩展**：TASK-007（P0 子集矩阵）→ TASK-012（P1 扩域）为同一文件的两个串行波次改动，非并行；assembly.ts 不 import 未建工厂，故 P1 扩域只在 session.ts 增注册、不改 assembly
- **每步沿用「相关包 build + test 绿」门禁**（base 测试通配自动纳入平铺 src 根的新测试文件；lgdl-web 为显式列表，无新增 lgdl-web 测试文件需重列）
- **test 文件平铺**：所有新增 base 测试文件平铺 packages/web-cli-base/src/ 根（兼容 `tsc src/*.test.ts` 通配脚本）

### 4.1 D-005 测试增删依据记录

| 既有/新测试 | 操作 | 依据（被何承接） |
|---------|------|-----------------|
| F-23 router.test.ts 13 例 | 保留 + 增补（TASK-002） | additive 零回归；v2 registry/门禁专项为增补用例 |
| F-23 session.test.ts（派生顺序/600ms/5 工具 dispatch） | 改写增补（TASK-007/TASK-012） | 派生顺序断言改写为「矩阵扩展后顺序」；既有语义用例等价保留，矩阵派生断言承接（FR-039/AC-007） |
| web-fetch.test.ts 既有用例 | 保留 + 增补（TASK-005） | 升级 additive，缺省行为逐字节兼容 |
| runner.test.ts / delay.test.ts / sleep.test.ts / llm.test.ts / protocol.test.ts | 保留零改动 | runner 主体零改动红线；无相关 v2 语义变更 |
| 新测试文件（permission/audit/platform/assembly/doc-tools/storage-tools/settings/search-tools/web-search/save-file/dom-tools/eval-tools/task-state/skill-loader/mcp-client.test.ts） | NEW（平铺 src 根） | 各域模块注入桩全链单测（NFR-006），自动纳入 base 通配测试 |
| lgdl-web provider.test.ts / session.test.ts | 增补 | webSearch 字段读写 + ask 桥 fake + services 注入 + 矩阵扩域断言 |

### 4.2 关键并行组摘要（build 可同时开工的任务簇）

| 并行簇 | 任务 | 前提（先完成） |
|------|------|------|
| A：机制基座 | TASK-001 | 无 |
| B：注册表门禁 | TASK-002 | A |
| C：首批载体域 | TASK-003 + TASK-005（并行） | B |
| D：内容/会话域 | TASK-004 + TASK-006（并行） | C（存储域） |
| E：P1 域工具四组 | TASK-008 + TASK-009 + TASK-010 + TASK-011（并行） | B（+ 存储/SES 供 008/010） |
| F：P2 试点两组 | TASK-013 + TASK-014（并行，独立可裁） | B（+ 010/011 供 014） |

### 4.3 validate 预备移交（本任务面不执行）

build 完成后，validate 阶段以 AC-008/FR-045 为准执行：①F-23 真实 AI 闭环补跑（前置人工基线，需浏览器+API Key）；②v2 浏览器工具真实浏览器冒烟清单（OPFS/IDB 真持久、Notification/clipboard 授权两路、ask UI 弹层、dom-* 真 DOM、eval worker、web-search BYOK 全链）；③FR-046 行为等价/声明改进逐项 diff（无未声明差异）。真实浏览器面测试不属于本 15 任务的验证命令（node 面注入桩 + 门禁为 build 责任）。

---

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建：基于 plan §8 交接表（P0 9 行/P1 7 行/P2 1 行）+ §2.6 波次先序 + §5 文件影响面拆分为 15 原子任务 / 9 执行波次。机制层合并（permission/audit/platform 一件 + registry v2 一件）；同域工具合并（NET P0、SES、DOM+ask、任务状态域、执行+skill）；lgdl-web 组装分两阶段（session.ts 顺序扩展：P0 v1 子集 → P1 场景收敛扩域）；P2 试点独立可裁。F-23 红线落地：runner 主体零改动（SES/subagent）、ToolEntry additive（registry v2）、测试守恒 D-005 记录 §4.1。15 任务中 base 12 / lgdl-web 2 / 全仓 1；测试文件全部平铺 src 根兼容 base 通配脚本 | 2026-09-06 | SDDU Tasks Agent |
