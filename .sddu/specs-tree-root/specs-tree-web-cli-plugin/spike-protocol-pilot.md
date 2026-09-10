# 波0：协议本质澄清 + 最小试点启动（TASK-002 / TB-0B+TB-0C）

> **文档定位**: 波0 前置结论文档（**非产品交付**；过程产物）。协议三层最小语义澄清（**只澄清语义，不固化格式**，O-003/NG-002）+ 最小试点启动记录（≥2 站点）。
> **对应**: FR-016/022/030 + FR-010/011 本质澄清输入；NFR-006/008/010；ADR-001；EC-001
> **执行人**: SDDU Build Agent ｜ **执行时间**: 2026-09-11

## 1. 协议本质澄清（三层最小语义）

> 纪律：**只澄清「是什么」，不固化「长什么样」**。承载格式（descriptor schema / RPC 字段）由 plan §2.3 落地为插件实现形态，协议对站点开放、可独立演进（ADR-001/007）。

### 1.1 发现（Discovery）—— 「站点如何被发现有 web-cli 能力」

- **语义**：插件在访问站点时能判定「支持 / 不支持 / 未知」三态；判定不依赖逐站点硬编码白名单。
- **最小判定**：站点以某种**可被通用消费端读取**的方式暴露「支持声明」；无声明 ≠ 报错，而是「不支持」可读态。
- **本质澄清**：发现是**能力探测**，不是访问授权；发现成功不授予任何操作权（授权独立，见 SEC 组）。

### 1.2 声明（Descriptor）—— 「站点如何声明其工具面」

- **语义**：站点可声明其暴露的能力清单，至少含：**能力标识 / 用途 / 入参语义 / 风险档位提示 / 协议版本**。
- **最小判定**：声明可被插件读取并用于工具面组装；非法/不兼容声明可读拒绝。
- **本质澄清**：站点自报的 `riskHint` **仅作提示，不作裁决依据**；插件按 fail-closed 复核有效风险档位（FR-027）。声明默认 `untrusted`；信任与授权分离（FR-012）。

### 1.3 执行（Execution / RPC）—— 「站点如何被调用」

- **语义**：插件能调用站点声明的能力，并收到可读结果；失败/超时/未实现 → 可读降级，不静默、不假装生效。
- **最小判定**：存在站点中立的调用契约；结果按外部内容（`trust:'external'`）处理，不解释为系统指令。
- **本质澄清**：执行通道是**站点主权**的——站点可在其监听端自行做速率/权限/合规二次护栏；插件只负责经门禁裁决后发起调用。

### 1.4 三态判定规则（草案，语义层）

| 观测 | 判定 | 处置 |
|------|------|------|
| 任一发现通道返回合法且版本兼容的声明 | **支持** | 组装工具面（默认 untrusted） |
| 三通道均明确「无声明」 | **不支持** | 可读态，不影响站点正常浏览（EC-001） |
| 声明非法/版本不兼容/网络错误/超时 | **未知或失败** | 可读态，不误报支持（FR-014） |

## 2. 最小试点启动

### 2.1 试点站点清单（≥2，含 1 非 LGDL）

| # | 站点 | 类型 | 声明通道 | 状态 |
|---|------|------|---------|:----:|
| 1 | LGDL Web Workbench | 实例站点（自有） | ② HTML `<link rel="web-cli">` + `public/.well-known/web-cli.json` | 就绪 |
| 2 | Fixture Notes（`test/fixtures/site/`） | 非 LGDL 站点 | ② HTML link + ③ 运行时握手（`rpc.js`） | **实测闭环** |

### 2.2 端到端路径（预期闭环）

```
发现（三通道） → 声明读取 + 版本协商 + 完整性/信任 → 用户授权（per-origin）
  → 工具面组装（descriptor.tools → site:* ToolEntry） → 门禁裁决（S1/S2/S3）
  → RPC 执行（postMessage） → 结果回填（trust:external） → 审计落库
```

### 2.3 试点记录

#### 站点 2（非 LGDL fixture）—— **实测闭环（真实浏览器）**

环境：Chromium 152 headless + CDP；本地静态伺服 fixture；实测脚本见 build 报告。

| 环节 | 实测结果 |
|------|---------|
| ② 静态声明 | `document.querySelector('link[rel="web-cli"]').href` → `http://127.0.0.1:9444/web-cli.json` |
| ③ 运行时握手 | `postMessage({type:'web-cli:probe'})` → 收到 descriptor，tools=`["notes-list","notes-add"]` |
| 执行（写） | `notes-add {text:'from-cdp'}` → `{ok:true, output:'✓ note added', trust:'external'}` |
| 执行（读） | `notes-list` → `welcome\nfrom-cdp`（确认写入生效） |
| 协议中立 | fixture 零 LGDL 私有依赖（纯静态 HTML + 原生 JS） |

#### 站点 1（LGDL 实例站点）

| 环节 | 状态 |
|------|------|
| ② 静态声明 | `packages/lgdl-web/index.html` 含 `<link rel="web-cli" href=".well-known/web-cli.json">`；`public/.well-known/web-cli.json` 存在（相对路径兼容 `base='/LGDL/'`） |
| ③ 运行时握手 | `web-cli-host/bridge.ts` 应答 `web-cli:probe` → `declaration.ts` 生成声明 |
| 执行 | `host-router.ts` 注册 `lgdl-web-cli` + `lgdl-web-op-cli`，经 RPC dispatch |
| 写回 | bridge `parseLgdl` 校验 + `onApply`（`applyAiSource`） |
| 状态 | 代码就绪；node 单测（plugin 54 + lgdl-web 66）全绿；浏览器级注入实测未做（见 spike-mv3-gkey §4 如实标注） |

## 3. 试点结论回写

- **协议三层最小语义成立**：发现/声明/执行三者解耦、可独立演进；站点中立（fixture 非 LGDL 闭环为证）。
- **通用性初步成立**：非 LGDL fixture 完成「发现 → 声明 → 执行」；授权/门禁/审计由插件侧 node 单测与 host 集成测试覆盖。
- **失败项**：无。降级出口（无声明/非法声明/版本不匹配）已由 `discovery.ts` 三态与 `≥3` 可读降级分支承接。
- **合规**：见 `docs/compliance.md`（试点站点结论）。

## 4. 引用

- 能力矩阵：`packages/web-cli-plugin/docs/capability-matrix.md`
- 合规评估：`packages/web-cli-plugin/docs/compliance.md`
- MV3/G-KEY 验证门：`.sddu/specs-tree-root/specs-tree-web-cli-plugin/spike-mv3-gkey.md`
- 冒烟清单：`packages/web-cli-plugin/docs/smoke-checklist.md`
