# LGDL 技术全景 — 全景入口

> **文档定位**: sddu-docs-overview — 本级全景入口
> **输出文件名**: docs-overview.md
> **数据来源**: 技术全景 = 代码扫描生成（用户指令触发）+ Feature 产物聚合（specs-tree-web-cli-v2 全套产物，2026-09-01 增量更新）。业务全景 = Feature 产物聚合（specs-tree-business-panorama discovery 阶段，2026-08-30 增量追加）
> **创建时间**: 2026-08-30
> **版本**: v2.0（基于工作区 `feature/group-as-node` @ `d03dca4`，2026-09-01；V2 重构 9 包体系）
> **生成方式**: 全量构建（代码级扫描，模式②）+ 增量追加（业务域，模式①）+ 增量更新（V2 9 包体系，模式②实测 + 模式①聚合 specs-tree-web-cli-v2）

---

## ⚠️ 扫描口径声明

- 扫描基准为**当前工作区**（分支 `feature/group-as-node`，HEAD `d03dca4`，2026-09-01 V2 重构入库）。`main` 分支停在 `de2381e`，**不含** v0.6 改动（无 router 包、无 group-as-node、非 9 包体系）——两者差异已在各文档中标注。
- 测试数字、语法行为、依赖清单均为**当日实测**结果，非文档转述（全仓 420 例全绿，见 §3.3）。
- CHANGELOG.md Unreleased 段中**仅采信带验证记录的工程事实**；规划性描述（语义 diff、CI 自动渲染、SSE 等）标注「待审视」，未纳入全景。
- V2 重构（commit `d03dca4`）的架构决策引用 specs-tree-web-cli-v2（discovery/spec/plan/tasks/review/validate 全套，phase=validated）的 9 条 ADR，见 adr-index.md §2（V2 段）。

---

## 1. 项目概览

| 属性 | 值 |
|------|-----|
| **项目** | LGDL（Logical Graph Description Language） |
| **定位** | 面向 AI Agent 的语义优先图表描述语言：只描述图的逻辑（节点/关系/层级），从不描述布局（坐标/样式）；布局由确定性引擎自动完成 |
| **形态** | npm workspaces monorepo（TypeScript，ESM，Node ≥ 20） |
| **已发布** | v0.5.0（2026-08-23，`@lgdl/lgdl-cli` 已上 npm——V2 由 `@lgdl/cli` 更名；Web 工作台上 GitHub Pages）；v0.6.0 开发中（当前分支） |
| **规模** | 9 包（6 个 lgdl-* 语言包 + 2 个 V2 适配包 + 1 个纯机制框架）/ 9 个内置示例（每种图类型一套 `.lgdl`+`.svg`+`.png` 三件套） |
| **全景覆盖** | What 层：技术全景（系统架构/核心引擎，代码扫描模式②）；Why 层：业务全景（业务全景/，Feature 产物聚合模式①） |

## 2. 子组件（文档树导航）

| 组件 | 类型 | 描述 | 关系说明 |
|------|------|------|---------|
| **系统架构/** | 域目录 | 9 包 monorepo 依赖关系、端到端数据流、三层包体系（语言层/适配层/框架层）、部署拓扑 | 全景的「骨架」视图 |
| **核心引擎/** | 域目录 | 四大引擎深潜：core 语义模型、layout 布局、router 布线、render 渲染、web AI 助手（含 V2 三层结构：lgdl-web-cli / lgdl-web-op-cli / web-cli-base） | 全景的「器官」视图，技术含量最高 |
| **业务全景/** | 域目录 | 业务定位（16 条有效 Why）、双层消费模型、核心场景与流程、空白与待确认（含 v0.6 置信度降级） | 全景的「价值」视图（Why 层，聚合自 specs-tree-business-panorama discovery 产物） |
| **语言参考/** | 域目录 | 类型集中清单：图类型（9）/ 节点 kind（9）/ 成员级类型 / 边结构，三清单合一，带源码证据与漂移标注 | 全景的「类型字典」视图（单一事实源收敛） |
| **adr-index.md** | ADR 索引 | 从 CHANGELOG + git 历史 + 代码证据提炼的 8 条架构决策 + V2 9 条 ADR（specs-tree-web-cli-v2 plan.md §7） | 决策「为什么」视图 |
| **source.md** | 产物溯源 | 本全景聚合的全部原始素材清单（文件 + 实测动作） | 可追溯性 |

## 3. 技术全景（跨域摘要）

### 3.1 技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| **TypeScript** | ^5.5.0 | 全部 9 包语言（strict 模式，NodeNext / Bundler 双模块策略） |
| **Node.js** | ≥ 20（engines 约束） | 运行时；测试用内置 `node:test` |
| **React + Vite** | 18.3 / 5.4 | 仅 lgdl-web 包（工作台前端） |
| **CodeMirror 6** | 6.x | 仅 lgdl-web 包（编辑器：高亮/补全/lint） |
| **openai SDK / @anthropic-ai/sdk** | ^7.5.0 / ^0.120.0 | lgdl-web 包 + web-cli-base（多厂商 AI 接入 / 框架层 LLM 工具） |
| **commander** | ^12.0.0 | 仅 lgdl-cli 包（argv 解析） |
| **核心自研零依赖** | — | lgdl-core / lgdl-router 零第三方运行时依赖；web-cli-base 零 @lgdl/* 依赖（仅 LLM SDK）（已实测 package-lock） |

### 3.2 一图看懂系统（依赖与数据流合并视图）

![LGDL 9 包依赖与数据流合并视图](diagrams/architecture-packages.visual-check.1440x900.light.png)

> **[打开交互图：LGDL 9 包依赖与数据流合并视图](diagrams/architecture-packages.html)**
> 自包含 HTML（Archify 编译，IR 源文件 `diagrams/ir/architecture-packages.json`），支持亮/暗主题切换、平移缩放、聚焦与上下游依赖追踪。

### 3.3 质量基线（2026-09-01 实测）

| 包 | 测试数 | 通过 | 失败 | 说明 |
|----|-------:|-----:|-----:|------|
| lgdl-core | 258 | 258 | 0 | parser 严格校验 / mutations / operations / commands 四测试文件（V2 纯改名） |
| lgdl-web-cli | 76 | 76 | 0 | V2 新包：commands/operations/protocol/help/exec/tools 随迁 76 例 |
| lgdl-web | 32 | 32 | 0 | locate / snap / provider / lgdl-web 四测试文件（V2 收敛，107→32：ops/web-cli/help/next-actions/web-fetch 迁出） |
| lgdl-render | 21 | 21 | 0 | svg 渲染 + ascii 渲染 |
| web-cli-base | 14 | 14 | 0 | V2 纯化：protocol 1 + llm 5 + web-fetch 8 例收敛 |
| lgdl-web-op-cli | 11 | 11 | 0 | V2 新包：tool 1 + ops 3 + next-actions 4 + handlers 3 |
| lgdl-router | 8 | 8 | 0 | routeEdge 绕障与贴边回归 |
| lgdl-layout / lgdl-cli | 0 | — | — | 无独立测试文件（layout 逻辑被 render/core 测试间接覆盖；cli 依赖端到端使用） |

> **合计 420 例全绿（守恒基线 ≥388 ✓）**，与 commit d03dca4 记载一致。
> ⚠️ CHANGELOG.md:15 记载「core 314」，实测 258——差异已记入根级漂移清单（D7 沿革）。

### 3.4 已知漂移与缺口（仅记录，未修改任何存量文档）

**漂移清单**（存量文档 vs 代码实际）：

| # | 位置 | 文档说法 | 代码实际 |
|---|------|---------|---------|
| D1 | docs/design.md:33 | 默认布局 elkjs，`config.ts` 可切回 dagre | 自研 `layered.ts`；`config.ts` 已删除 |
| D2 | docs/lgdl-spec.md:15,137 | `groups:` 旧语法可用 | 顶层 `groups:` 已被拒绝（实测报 error） |
| D3 | docs/lgdl-spec.md:23-34 | elkjs 层级 + `LAYOUT_ENGINE` 切换 | 自研引擎；config.ts 不存在 |
| ~~D4~~ | ~~README.md:164-175~~ | ~~架构树列 5 包~~ | ✅ **已解决（2026-09-01）**：README 架构树已更新为 9 包（commit d03dca4 后由本次全景更新同步） |
| D5 | README.md:177-186 | 「球链网状算法」物理张弛隐喻 | 实现是确定性 Sugiyama 分层，无物理仿真（同节后半段自述 Sugiyama，节内表述自相矛盾） |
| D6 | CHANGELOG.md:21-22 | 「DSL 双语：groups: 与 kind:'group' 均接受」 | 当前代码**拒绝**旧语法——该描述是开发中间态，已过时 |
| D7 | CHANGELOG.md:15,27 | core 314 个测试 | 实测 258（V2 纯改名后计数，原 281 亦为 drift） |
| D8 | README.md:57 | 「v0.4.0 核心特性」标题 | 其 §5 内容为 v0.5 特性（Web AI 助手） |

**遗留缺口**：

| # | 缺口 | 影响 |
|---|------|------|
| G1 | `.github/workflows/deploy-pages.yml` 构建步骤含 lgdl-core/lgdl-layout/lgdl-render/web-cli-base/lgdl-web-cli/lgdl-web-op-cli，**仍不含 lgdl-router 与 lgdl-cli**（V2 已补两个新适配包，router 未补） | CI 裸机上 lgdl-render 构建依赖 lgdl-router dist（NodeNext 解析），缺 router 会构建失败——G1 沿革（V2 只补了部分） |
| G2 | 无 CI 测试工作流（仅本地 `npm test`） | 回归只能靠人肉触发 |
| G3 | README 架构树此前未提 router 包职责 | 新人/Agent 无法从门面文档发现布线引擎（V2 全景更新后 README 已含 9 包树，router 仍在） |
| G4 | lgdl-layout / lgdl-cli 两包零直接测试 | 布局回归靠 render 测试间接覆盖 |
| G5 | v0.6 规划项（语义 diff、CI 自动渲染、SSE 流式、`lgdl-cli serve` 代理等）在代码中**无实现痕迹**（已 grep 验证） | 属「待审视」规划，不应被当作既成事实引用 |
| G6 | `layoutDocument` 保留 `async` 签名 | elkjs wasm 时代遗留，当前实现全同步 |

---

## 4. 9 包体系（V2 重构，commit d03dca4）

> 数据来源：代码实测（packages/*/package.json）+ specs-tree-web-cli-v2 全套产物聚合（phase=validated，9 条 ADR 见 adr-index.md §2.2）。

### 4.1 三层结构

| 层 | 包 | 定位 |
|----|-----|------|
| **框架层** | `@lgdl/web-cli-base` | **纯机制框架**（类似 Spring 的公共框架）：DomainApi<Op,Doc> 泛型化契约、createExecutor 管线、createOperationApplier 泛型工厂、协议解析骨架、LLM 工具封装、web-fetch 通用工具（中性名）。**零 @lgdl/* 依赖**（deps 仅 openai/anthropic SDK），与 LGDL 业务解耦，任意领域可实例化 |
| **适配层** | `@lgdl/lgdl-web-cli` | **图内容操作适配**：6 个增量命令注册表（COMMANDS）、LgdlOperation 协议、lgdl-web-cli 工具定义（17 子命令 enum）、协议解析（lgdl-web-cli 前缀）、help 自文档、lgdlDomain/lgdlExecutor 组装单点。依赖 base（机制）+ lgdl-core（类型契约） |
| | `@lgdl/lgdl-web-op-cli` | **UI 操作适配**：OP_COMMANDS 元数据单一数据源（16 条）→ WEB_OP_TOOL 动态生成、webOpHelp、next-actions 解析、**OpHandlerRegistry 注入面**（包定义协议/分发，web 注入 React 回调；零 React/DOM）。依赖 base（仅 HelpArg/HelpEntry 类型） |
| **语言层** | `@lgdl/lgdl-core` / `@lgdl/lgdl-layout` / `@lgdl/lgdl-router` / `@lgdl/lgdl-render` / `@lgdl/lgdl-cli` / `@lgdl/lgdl-web` | V2 统一更名（6 包加 lgdl- 前缀，git mv 保留历史，零语义改动）：语言核心（零依赖）/ 布局引擎 / 布线引擎（零依赖）/ SVG·ASCII 渲染 / 终端 CLI（bin lgdl-cli 不变）/ Web 工作台（private，不发布） |

### 4.2 依赖方向（单向无环，package.json 实测）

```
lgdl-core（零依赖）          web-cli-base（零 @lgdl/*，纯机制）
    ▲  ▲                        ▲        ▲
    │  └── lgdl-web-cli ────────┘        │
    │        ▲  ▲                       │
    │        │  └── lgdl-web-op-cli ─────┘
    │   lgdl-cli / lgdl-web（消费入口）
    ├── lgdl-layout ──▶ lgdl-render ◀─── lgdl-cli
    ├── lgdl-router ──▶ lgdl-render      lgdl-web
```

- **web-cli-base 零 lgdl 依赖**（C3/FR-018）：机制契约全部泛型化或中性化；lgdl-core 类型由 lgdl-web-cli 以类型参数实例化（TS 结构化类型兼容，lgdl-core 类型定义零改动）
- **lgdl-web-cli → base + lgdl-core**：依赖 base 泛型机制（createExecutor/createOperationApplier/tokenizeCli/parseArgs/HelpArg/HelpEntry）+ lgdl-core 类型契约（LgdlOperation/LgdlDocument）
- **lgdl-web-op-cli → base**（仅类型）：零 React/DOM/localStorage（NFR-004 验收 grep 通过）
- **cli → lgdl-web-cli**（9 个 mutation 命令 import 切换，commit d03dca4）与 cli → lgdl-core 并存；**web → 适配层 ×2 + base + 引擎 ×3**

### 4.3 关键机制变化（V2）

| 机制 | V1（6 包时代） | V2（9 包） |
|------|--------------|-----------|
| 命令注册表（9 增量命令） | web-cli-base/commands.ts | 迁至 **lgdl-web-cli/commands.ts**（机制壳 CommandSpec/KindResolver 留 base） |
| 执行管线 | web-cli-base/exec.ts（DomainApi 19 符号含 LGDL 面） | **泛型化 DomainApi<Op,Doc> + ExecutorOptions 注入参数**（commandPrefix/parseBatch/describeSubcommand），LGDL 组装随迁 lgdl-web-cli/adapters/lgdl.ts |
| 工具三件套 | WEB_CLI_TOOL / WEB_OP_TOOL / WEB_FETCH_TOOL 定义在 web 包 | WEB_CLI_TOOL → lgdl-web-cli；WEB_OP_TOOL → lgdl-web-op-cli（OP_SUBCOMMANDS 动态生成）；**WEB_FETCH_TOOL 中性化改名 web-fetch 归 base** |
| UI 操作执行 | web App.tsx handleWebOp 16 分支 | **OpHandlerRegistry 注入面**：lgdl-web-op-cli 定义协议/分发，web 以 useMemo 注册 16 个 handler 回调 |
| ChatResult | 三桶分流（toolCalls/opCalls/fetchCalls） | **单列表 toolCalls**（lgdl-web-cli / lgdl-web-op-cli / web-fetch 透传，消费方按工具名分发） |
| 测试分布 | web-cli-base 82 + web 48 + core 258 + router 8 + render 21 = 417 | lgdl-web-cli 76 + lgdl-web 32 + lgdl-core 258 + lgdl-web-op-cli 11 + web-cli-base 14 + router 8 + render 21 = **420**（守恒 ≥388 ✓） |

---

## 修订记录

| 生成时间 | 变更 Feature | 生成方式 | 修订人 |
|---------|-------------|:--:|--------|
| 2026-08-30 | 代码级扫描全量生成（feature/group-as-node @ 15e5b6b） | 全量构建 | sddu-docs Agent |
| 2026-08-30 | 增量追加业务全景域（specs-tree-business-panorama discovery 产物聚合，HEAD 9855e7e） | 增量追加 | sddu-docs Agent |
| 2026-08-30 | 增量追加语言参考域（类型参考，三清单合一，实读 types.ts 等；新增漂移 T-D1：design.md:79 kind 8 种 vs 源码 9 种） | 增量追加 | sddu-docs Agent |
| 2026-09-01 | **V2 9 包体系增量更新**（HEAD 15e5b6b → d03dca4；6 包 → 9 包：重命名 lgdl-* + 新增 lgdl-web-cli/lgdl-web-op-cli + web-cli-base 纯化；质量基线实测 420 例；9 包体系章节；D4 漂移解决；G1 沿革标注；6 张图重绘） | 增量更新（模式②实测 + 模式①聚合 specs-tree-web-cli-v2） | sddu-docs Agent |
