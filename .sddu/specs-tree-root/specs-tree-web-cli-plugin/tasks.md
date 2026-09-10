# 任务分解：web-cli-plugin（浏览器插件，v0.8 主题「浏览器插件孵化」）（specs-tree-web-cli-plugin）

> **文档定位**: SDDU 任务清单 — 将技术方案分解为可并行执行的原子任务，作为 build 阶段的输入
> **前置依赖**: plan.md v1.0（12 ADR〔ACCEPTED 7 / PROPOSED 5，内嵌 §8〕+ §3.0 FR 落位总表 + §5.3 波次与最小可用裁剪 + §5.5 波次任务交接 + §6 文件影响 35+ 项 + §9 任务切分建议 TB-0A~TB-R）、spec.md v1.1（46 FR 十组 + 10 NFR + 16 EC + 12 AC，作者核签冻结）、discovery.md v1.1、state.json（phase=planned）
> **创建人**: SDDU Tasks Agent
> **创建时间**: 2026-09-11
> **版本**: v1.0
> **更新人**: SDDU Tasks Agent
> **更新时间**: 2026-09-11
> **更新说明**: 初始创建。plan §9 任务块 TB-0A~TB-R（22 块，其中 TB-Q 为 plan 标注「可选」）→ 按「文件所有权 + 依赖拓扑 + 波次门禁」整合为 **16 个原子任务 / 9 个执行波次**（Wave 0~8；15 核心 + 1 可选后置 TB-Q）。关键整合（D-001 类决策，详见 §4.4）：TB-0A+TB-0D 合并为 TASK-001（波0 两个验证门同属 spike、0D 依赖 0A）；TB-0B+TB-0C 合并为 TASK-002（波0 非产品交付文档面）；TB-B+TB-C 合并为 TASK-004（协议层与发现层同属纯逻辑、发现直接消费描述符，单所有权面一次成文）；TB-E+TB-F 合并为 TASK-006（background 控制面，`service-worker.ts`/`messaging.ts` 单文件所有权链 A→E→F，规避同文件跨任务并行冲突）；TB-K+TB-L 合并为 TASK-011（波1 收口 = 通用性验证 + 红线 grep + base 零回归 GATE）；TB-O+TB-P 合并为 TASK-014（P1 护栏 + 合规/迁移/调试文档收口）。**P0 最小可用必做集 = TASK-001~TASK-011**（波0 门槛 + 波1 四根柱子）。测试守恒 D-005 与每步门禁 AC-001 见 §4.1。

---

## 1. 依赖拓扑总览

> 任务依赖关系和执行顺序。plan 波次标签 = plan §5.3 波0/波1/波2/波3（spec §9.5 对齐），Wave N = 实际执行波次。
> **类型标注**：🛠 实施任务 / 📄 文档·契约预留任务 / ⚖️ 验证门·spike 任务（内嵌降级出口）。
> 红线贯穿：每任务完成后上游（web-cli-base / lgdl-web）既有测试零删除零降级 + 相关包测试全绿（AC-001 每步门禁，§4.1）；插件不改 base 源码；敏感明文零外泄。

### 1.1 任务总览表

| 编号 | TB | 模块/落点 | 类型 | 复杂度 | 依赖 | plan波次 | 执行波次 | 一句话目标 |
|------|----|----------|:--:|:--:|------|:--:|:--:|------|
| TASK-001 | 0A+0D | 波0 验证门：MV3 平台约束 + G-KEY 火山端点 | ⚖️ | M | 无 | 波0 | Wave 0 | MV3 隔离/CSP/跨域/权限/无头加载 + 扩展 background 直连火山 3 端点，逐项 PASS/FAIL/降级 |
| TASK-002 | 0B+0C | 波0 前置：协议本质+最小试点启动 + 能力矩阵 + 合规评估 | 📄 | M | 无 | 波0 | Wave 0 | 协议本质澄清 + 非 LGDL fixture 站点 + 内置助手能力对照矩阵 + 试点站点条款合规评估 |
| TASK-003 | A | 插件工程骨架（monorepo 独立包） | 🛠 | M | 无 | 波1 | Wave 1 | `packages/web-cli-plugin` 包/manifest/tsconfig/build.mjs/三面空入口，产出可加载 dist/ |
| TASK-004 | B+C | 协议与发现层（纯逻辑，node 可测） | 🛠 | L | 003 | 波1 | Wave 2 | descriptor/version/trust/rpc + discovery 三通道三态 + 失败降级 |
| TASK-005 | D | 安全层（授权/门禁/确认/审计/脱敏） | 🛠 | L | 004 | 波1 | Wave 3 | origin-store/policy(S1/S2/S3+riskDefaults)/confirm/audit-sink/redact，fail-closed 无旁路 |
| TASK-006 | E+F | 宿主与工具层（background 控制面） | 🛠 | L | 003/004/005 | 波1 | Wave 4 | host/controller/service-worker/messaging + extension-env + declared/admin-tools + unsupported |
| TASK-007 | G | KEY 层 + options | 🛠 | M | 003 | 波1 | Wave 2 | 8 厂商表 + key-store(chrome.storage.local) + options 设置/迁移指引，key 隔离 |
| TASK-008 | H | content script 数据面 | 🛠 | M | 003/004 | 波1 | Wave 4 | isolated world content-script + page-bridge RPC + 按 origin 动态注入 |
| TASK-009 | I | side panel（会话/授权/确认/审计） | 🛠 | M | 006 | 波1 | Wave 5 | 多轮 chat + 授权弹层 + 二次确认 + 审计查看，不注入宿主页 |
| TASK-010 | J | LGDL 站点协议暴露点 | 🛠 | L | 004/008 | 波1 | Wave 5 | `web-cli-host`(host-router/bridge/declaration) + `.well-known` + index.html link + App 挂载 |
| TASK-011 | K+L | 波1 收口 GATE + 通用性验证 | ⚖️🛠 | L | 全部波1 | 波1末 | Wave 6 | fixture 端到端 + 双份工具面冲突检测 + 明文/旁路/依赖 grep + base 零回归 + 冒烟清单 |
| TASK-012 | M | 协议完善（版本/中立文档/失败降级补强） | 📄🛠 | M | 004 | 波2 | Wave 7 | 版本协商补强 + `docs/protocol.md` 站点中立文档 + ≥3 失败降级场景 |
| TASK-013 | N | UI 操作 + 事件消费 | 🛠 | M | 008/010 | 波2 | Wave 7 | `site:lgdl-web-op-cli` 经 RPC 执行 + 事件桥 → background 事件通道 |
| TASK-014 | O+P | 风控护栏 + 合规/迁移/调试文档 | 🛠📄 | L | 005/009 | 波2 | Wave 7 | 频率限制/可中断/可暂停 + 知情同意/不适用清单 + 迁移/过渡期 + 调试/冒烟/Gate-D 文档 |
| TASK-015 | Q | （可选）通用 DOM 工具面 | 🛠 | M | 006/008 | 波2 | Wave 7 | `content/dom-agent` + extensionEnv 远程 dom 缝（**可后置，容量不足整块顺延**） |
| TASK-016 | R | 发布渠道 + Gate-D 下线执行 | 🛠📄 | L | 全部 + Gate-D | 波3 | Wave 8 | `docs/release.md` + Gate-D 前置检查 + 摘除 AI 助手层 + 回退预案 + ROADMAP 登记 |

### 1.2 依赖拓扑（串行主轴 + 并行组）

```
波0 门槛（先行，非产品交付；两者并行）：
  TASK-001 [M] MV3 验证门 + G-KEY 端点验证（⚖️ 结论驱动 FR-009/034 降级） ─┐
  TASK-002 [M] 协议本质+试点启动 + 能力矩阵 + 合规评估（📄）              ─┤（无依赖，Wave 0 并行）
                                                                          │
波1 P0 四柱（串行主轴：骨架 → 协议/发现 → 门禁 → 宿主/工具 → UI/LGDL → 收口）：
  TASK-003 [M] 工程骨架（manifest/service-worker stub/messaging stub/content stub/UI stub）  [Wave 1]
      ├─> TASK-004 [L] 协议与发现层（descriptor/version/trust/rpc + discovery/static/runtime） [Wave 2]
      └─> TASK-007 [M] KEY 层 + options（与 004 并行，均依赖 003 包骨架）                       [Wave 2]
  TASK-004 ─> TASK-005 [L] 安全层（origin-store/policy/confirm/audit-sink/redact）            [Wave 3]
  TASK-003/004/005 ─> TASK-006 [L] 宿主与工具层（host/controller/SW/messaging/extension-env/tools） [Wave 4]
  TASK-003/004     ─> TASK-008 [M] content script（content-script/page-bridge，与 006 并行）   [Wave 4]
  TASK-006         ─> TASK-009 [M] side panel（会话/授权/确认/审计）                          [Wave 5]
  TASK-004/008     ─> TASK-010 [L] LGDL 暴露点（web-cli-host + 声明 + index.html + App 挂载） [Wave 5]
  TASK-001~010     ─> TASK-011 [L] 波1 收口 GATE（通用性 + 冲突检测 + 红线 grep + 零回归）    [Wave 6]

波2 P1（四路并行 + 1 可选，均以波1 基座就绪为前提）：
  TASK-012 [M] 协议完善（dep 004）
  TASK-013 [M] UI 操作 + 事件消费（dep 008/010）
  TASK-014 [L] 风控护栏 + 合规/迁移/调试文档（dep 005/009）
  TASK-015 [M] （可选）通用 DOM 工具面（dep 006/008）                                          [Wave 7 并行]
  ⚠️ 同文件追加串行：012 MODIFY protocol/version.ts + discovery.ts（TASK-004 建）；014 MODIFY security/policy.ts（TASK-005 建）+ ui/sidepanel（TASK-009 建）+ docs/compliance.md（TASK-002 建）；013 MODIFY content/page-bridge.ts（TASK-008 建）+ web-cli-host/bridge.ts（TASK-010 建）。

波3 P2（严格前置）：
  TASK-016 [L] 发布渠道 + Gate-D 下线执行（dep 全部 + D-1~D-7 全达标；未达标 → 不下线）        [Wave 8]
```

### 1.3 并行分组（执行波次）

```
Wave 0 ─── (波0 门槛，并行组 ①：无依赖；结论驱动后续降级出口)
  TASK-001 [M] ⚖️ MV3 平台约束最小验证门 + G-KEY 火山端点验证
  TASK-002 [M] 📄 协议本质澄清 + 最小试点启动 + 能力矩阵 + 合规评估

Wave 1 ─── (P0 骨架，串行：包骨架为后续所有任务编译/测试前提)
  TASK-003 [M] 🛠 工程骨架（package/manifest/tsconfig/build.mjs/三面空入口）

Wave 2 ─── (P0 基座，并行组 ②：文件不相交；均依赖 TASK-003 包骨架)
  TASK-004 [L] 🛠 协议与发现层（protocol/* + discovery/*，纯逻辑 node 可测）
  TASK-007 [M] 🛠 KEY 层 + options（llm/* + ui/options/*）

Wave 3 ─── (P0 门禁，串行：策略引用声明工具语义)
  TASK-005 [L] 🛠 安全层（security/*）

Wave 4 ─── (P0 控制面/数据面，并行组 ③：文件不相交)
  TASK-006 [L] 🛠 宿主与工具层（background/* + platform/* + tools/*；填充 TASK-003 的 SW/messaging stub）
  TASK-008 [M] 🛠 content script（content/*；填充 TASK-003 的 content stub + MODIFY manifest）

Wave 5 ─── (P0 UI/实例站点，并行组 ④：文件不相交)
  TASK-009 [M] 🛠 side panel（ui/sidepanel/*）
  TASK-010 [L] 🛠 LGDL 暴露点（lgdl-web/src/web-cli-host/* + public/.well-known + index.html + App.tsx 挂载）

Wave 6 ─── (P0 收口 GATE，串行：依赖波1 全部)
  TASK-011 [L] ⚖️🛠 波1 收口（通用性端到端 + 双份工具面冲突检测 + 红线 grep + base 零回归 + validate 移交）

Wave 7 ─── (P1，并行组 ⑤：各自文件；⚠️ 同文件追加项按 004→012 / 005→014 / 008→013 / 009→014 / 010→013 串行)
  TASK-012 [M] 📄🛠 协议完善
  TASK-013 [M] 🛠 UI 操作 + 事件消费
  TASK-014 [L] 🛠📄 风控护栏 + 合规/迁移/调试文档
  TASK-015 [M] 🛠 （可选）通用 DOM 工具面

Wave 8 ─── (P2，串行：Gate-D 严格前置，未达标不下线)
  TASK-016 [L] 🛠📄 发布渠道 + Gate-D 下线执行
```

---

## 2. 任务列表

> 每个任务的详细定义。验证命令中 plugin = `packages/web-cli-plugin`（包 `@lgdl/web-cli-plugin`）、base = `packages/web-cli-base`（包 `@lgdl/web-cli-base`）、lgdl-web = `packages/lgdl-web`（包 `@lgdl/lgdl-web`）。
> 缩写对照：plan.md = 技术计划；spec.md = 需求规范；ADR-NN = plan §8 内嵌；EC-0NN/AC-0NN = spec §7/§8；S-0NN/O-0NN = spec §9 决策。
> **每步门禁（AC-001）**：任何任务完成后上游既有测试零删除零降级、相关包测试全绿 —— 详见 §4.1。

### TASK-001: 波0 平台与端点验证门（MV3 最小验证 + G-KEY）

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **类型** | ⚖️ 验证门（内嵌降级出口） |
| **前置依赖** | 无 |
| **执行波次** | Wave 0（plan 波0） |
| **对应 FR** | FR-009/034/045（+ NFR-002/004/006） |
| **TB 映射** | TB-0A + TB-0D（plan §9；**合并**，见 §4.4） |
| **风险** | R-002（MV3 约束致架构返工）、R-006（无头加载不可行）、R-007（CORS/host_permissions 假设不成立）—— 三者均由本任务结论先行驱动降级 |

**输入**: plan §3.1（MV3 最小验证门）+ §3.5（G-KEY CORS 处置）+ §5.3 波0 + ADR-002/006/011 + spec FR-009/034/045 + EC-006/007/009

**描述**: 波0 前置 spike（**非产品交付**，产出结论文档）。逐项验证并记录 PASS/FAIL/降级：(1) content script isolated world 隔离性与可达面；(2) 站点 CSP 对 content script / MAIN-world 注入的影响；(3) 扩展 background 的跨域 fetch 能力（是否受页面 CORS 预检约束）；(4) 权限最小化面（`activeTab`+`scripting`+`storage`+`sidePanel`+`optional_host_permissions`）是否满足全部功能；(5) `--headless=new --load-extension` 加载扩展可行性 + CDP 取 `service_worker` target（ADR-006）；(6) **G-KEY**：扩展 background 对火山 3 端点（`volc`/`volc-coding`/`volc-plan`，`browserDirect=false`）带 `Authorization` 直连可行性（FR-034 前置）。**每项 FAIL 必须给出降级出口**，不静默。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| NEW | `.sddu/specs-tree-root/specs-tree-web-cli-plugin/spike-mv3-gkey.md` |

> ⚠️ **plan 未覆盖标注**：plan §5.3 明确波0「产出为 spike/文档结论（非产品交付）」，但 §6 文件影响未显式列出波0 结论落点文件。本任务落在 Feature 目录（此时 `packages/web-cli-plugin` 骨架尚未由 TASK-003 建立），**属过程产物、非产品交付**，不构成对 plan 文件影响面的增补；如需并入产品文档可后续调整。

**验收标准**:
- [ ] MV3 六项验证逐项结论：每项含 PASS/FAIL/降级 + 证据（命令/日志/截图路径），**无「未测」项**（FR-009/AC-002）
- [ ] content script 隔离结论：isolated world 可达面 + 不污染页面全局断言可行（FR-007 前置）
- [ ] CSP 结论：站点 CSP 对 content/MAIN 注入的阻断面与可行注入路径（EC-006）
- [ ] 跨域结论：background fetch 对 `host_permissions` 端点的可达性 + 不可达时的如实转译口径（EC-007/FR-008）
- [ ] 无头加载结论：`--headless=new --load-extension` + CDP `service_worker` target 是否可达；不可行 → 降级出口（headful/xvfb / Playwright `launchPersistentContext`）（ADR-006/R-006）
- [ ] **G-KEY 结论**：火山 3 端点直连 PASS → 8 厂商全可用；FAIL → 降级出口 = ① 提示需本地代理（明确「未实现」不假装）② 可读转译「该厂商当前不可直连」（EC-009）；**不静默失败**（FR-034/ADR-011）
- [ ] 失败项触发范围裁剪建议（FR-009/034 降级结论驱动波1 范围）
- [ ] 结论表逐项有值，供 TASK-011 收口与 validate 引用

**验证命令**:
```bash
# 文档核对：结论表六项 + G-KEY 逐项有 PASS/FAIL/降级
grep -cE "PASS|FAIL|降级" .sddu/specs-tree-root/specs-tree-web-cli-plugin/spike-mv3-gkey.md
# 无头加载记录（示例，按实际 chromium 路径执行）
# chrome --headless=new --load-extension=<dist> --remote-debugging-port=9222
#   → curl http://127.0.0.1:9222/json 核对 service_worker target
```

### TASK-002: 波0 协议本质澄清 + 最小试点启动 + 能力矩阵 + 合规评估

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **类型** | 📄 文档/前置（非产品交付） |
| **前置依赖** | 无 |
| **执行波次** | Wave 0（plan 波0） |
| **对应 FR** | FR-016/022/030（+ FR-010/011 本质澄清输入；NFR-006/008/010） |
| **TB 映射** | TB-0B + TB-0C（plan §9；**合并**，见 §4.4） |
| **风险** | R-003（协议标准缺失/逐站点定制）、R-001（合规面）—— 以矩阵与合规结论先行界定 |

**输入**: plan §3.2（协议三层最小语义）+ §3.4（能力矩阵）+ §3.7（合规）+ §5.3 波0 + ADR-001 + spec FR-016/022/030 + EC-001

**描述**: 波0 前置（**非产品交付**）。(1) **协议本质澄清**：明确「发现 / 声明 / 执行」三层最小语义与三态判定规则草案（遵守 O-003：只澄清语义，不预设最终格式）；(2) **能力对照矩阵**：内置助手 20+ 工具逐项归属（对齐 / 替代 / 不适用 / 后置）+ 标注下线最小能力集（Gate-D D-1 验收基线，FR-022）；(3) **最小试点启动**：建立非 LGDL fixture 站点（静态声明 + RPC 监听端最小实现），记录 LGDL 页 + fixture 站点两站点试点路径（FR-016）；(4) **站点条款合规评估**：试点站点 ToS/robots/自动化约束 → 可用/受限/禁用结论 + 依据（FR-030）。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| NEW | `packages/web-cli-plugin/docs/capability-matrix.md` |
| NEW | `packages/web-cli-plugin/docs/compliance.md` |
| NEW | `packages/web-cli-plugin/test/fixtures/site/` |
| NEW | `.sddu/specs-tree-root/specs-tree-web-cli-plugin/spike-protocol-pilot.md` |

> ⚠️ **plan 未覆盖标注**：FR-016 试点「启动记录」在 plan §6 无显式文件；本任务落 Feature 目录 `spike-protocol-pilot.md`（过程产物）。`capability-matrix.md`/`compliance.md`/`test/fixtures/site/` 均为 plan §6 已列文件。

**验收标准**:
- [ ] 协议三层最小语义澄清完成：发现（如何被发现）/ 声明（如何声明工具面）/ 执行（如何被调用）—— 仅语义，**不固化格式**（O-003/FR-010/011/NG-002）
- [ ] 能力矩阵：内置助手全部工具逐项归属四态（对齐/替代/不适用/后置）+ 标注**下线最小能力集**（FR-022/AC-004；供 Gate-D D-1）
- [ ] 矩阵含「对齐/替代/不适用/后置」四列与内置助手工具条目数核对（无遗漏条目）
- [ ] fixture 站点存在：静态声明 + RPC 监听端最小实现（**非 LGDL、无 LGDL 私有依赖**）（FR-016/043 前置）
- [ ] 试点记录：≥2 站点（LGDL 页 + 非 LGDL fixture）路径与预期闭环（FR-016/AC-003）
- [ ] 合规评估：试点站点逐项条款结论（可用/受限/禁用）+ 依据可追溯（FR-030/AC-006）
- [ ] 文档可读（NFR-008）；合规结论变更可审计（NFR-010）

**验证命令**:
```bash
ls packages/web-cli-plugin/docs/capability-matrix.md packages/web-cli-plugin/docs/compliance.md \
   packages/web-cli-plugin/test/fixtures/site/
ls .sddu/specs-tree-root/specs-tree-web-cli-plugin/spike-protocol-pilot.md
# 矩阵条目数核对（人工面）：与内置助手工具数逐项对照，无遗漏
```

### TASK-003: 插件工程骨架（monorepo 独立包，可加载 dist/）

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **类型** | 🛠 实施 |
| **前置依赖** | 无 |
| **执行波次** | Wave 1（plan 波1） |
| **对应 FR** | FR-001/003/005/006（+ NFR-002/005/009） |
| **TB 映射** | TB-A（plan §9） |
| **风险** | ADR-009 devDep `esbuild` + `@types/chrome` **待作者确认**（被拒 → 备选手写类型 + tsc 拼装，成本高）；manifest 权限面过宽（须逐项与功能对应） |

**输入**: plan §2.2（工程拓扑）+ §3.1（MV3 清单）+ §6 文件影响 + ADR-002/009 + spec FR-001/003/005/006 + NFR-002

**描述**: 建立 monorepo 内独立包 `packages/web-cli-plugin`（S-004）。(1) `package.json`：运行时依赖**仅** `@lgdl/web-cli-base ^0.7.0`（FR-001），devDep `esbuild` + `@types/chrome`（单列，标注待作者确认），build/test scripts；(2) `tsconfig.json`（ES2022/strict）；(3) `manifest.json`（MV3 最小权限面，见验收）；(4) `build.mjs`（esbuild：background ESM / content IIFE / sidepanel+options HTML + manifest/静态资源拷贝到 `dist/`）；(5) **三面空入口 stub**：`src/background/service-worker.ts` + `messaging.ts`（**归 A→E→F/I 所有权链**）、`src/content/content-script.ts`（**归 A→H**）、`src/ui/sidepanel/*`、`src/ui/options/*`。本任务只建骨架与空入口，不填业务逻辑。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| NEW | `packages/web-cli-plugin/package.json` |
| NEW | `packages/web-cli-plugin/tsconfig.json` |
| NEW | `packages/web-cli-plugin/manifest.json` |
| NEW | `packages/web-cli-plugin/build.mjs` |
| NEW | `packages/web-cli-plugin/src/background/service-worker.ts`（stub，归 A→E→F/I） |
| NEW | `packages/web-cli-plugin/src/background/messaging.ts`（stub，归 A→E→F/I） |
| NEW | `packages/web-cli-plugin/src/content/content-script.ts`（stub，归 A→H） |
| NEW | `packages/web-cli-plugin/src/ui/sidepanel/index.html` + `sidepanel.ts`（stub） |
| NEW | `packages/web-cli-plugin/src/ui/options/index.html` + `options.ts`（stub） |

**验收标准**:
- [ ] `package.json`：`name=@lgdl/web-cli-plugin`、private、运行时依赖仅 `@lgdl/web-cli-base ^0.7.0`（**零新增运行时依赖**，FR-001/NFR-005）；devDep `esbuild`+`@types/chrome` 单列并注释「待作者确认」（ADR-009）
- [ ] `manifest.json`：`manifest_version:3`；`background.service_worker` + `type:'module'`；`permissions` 仅 `activeTab`/`scripting`/`storage`/`sidePanel`（**无宽泛 `tabs`**，FR-006）；`optional_host_permissions:["https://*/*"]` 运行时按 origin 申请；`host_permissions` 仅 LLM 厂商已知端点；`side_panel.default_path`；`options_page`；**无静态全站 `content_scripts`**（经 `chrome.scripting` 动态注入，FR-006/NFR-002）
- [ ] 目标浏览器与最低版本显式声明（Chromium ≥ 114；低于门槛 → 可读降级提示）（NFR-004）
- [ ] `tsconfig.json` ES2022/strict；`build.mjs` esbuild 产出 background ESM / content IIFE / sidepanel+options HTML + manifest 拷贝
- [ ] `npm run build --workspace @lgdl/web-cli-plugin` 成功产出 `dist/manifest.json` + 三面入口产物
- [ ] 三面空入口可编译；`base` 包零改动（NFR-005 零回归红线）
- [ ] 权限清单与功能逐项对应可核验（AC-002/NFR-002）

**验证命令**:
```bash
npm run build --workspace @lgdl/web-cli-plugin
node -e "const m=require('./packages/web-cli-plugin/dist/manifest.json'); if(m.manifest_version!==3) throw new Error('not mv3'); if(m.permissions.includes('tabs')) throw new Error('tabs too broad'); if(!m.optional_host_permissions) throw new Error('missing optional_host_permissions'); console.log('manifest ok')"
```

### TASK-004: 协议与发现层（descriptor/version/trust/rpc + discovery 三通道三态）

| 属性 | 值 |
|------|-----|
| **复杂度** | L |
| **类型** | 🛠 实施（纯逻辑，node 可测） |
| **前置依赖** | TASK-003（包骨架；**plan 未显式标注的软依赖**，见 §4.4 标注） |
| **执行波次** | Wave 2（plan 波1） |
| **对应 FR** | FR-010/011/012/013/014（+ NFR-006/009） |
| **TB 映射** | TB-B + TB-C（plan §9；**合并**，见 §4.4） |
| **风险** | R-003（协议标准缺失/逐站点定制）—— 站点中立描述符 + 双通道发现规避；版本协商边界（EC-014） |

**输入**: plan §2.3（描述符 schema/三通道/三态/RPC 契约）+ §3.2 + ADR-001/007 + spec FR-010~014 + EC-001/002/014

**描述**: 实现插件站点中立协议与发现层（纯逻辑，node 注入面可测）。(1) `protocol/descriptor.ts`：`WebCliDescriptor` schema（`protocolVersion`/`tools[]`/`transport`/`integrity`/`source`）+ 校验 + 归一化；(2) `protocol/version.ts`：协议版本协商，未知/不兼容 → 拒绝或降级 + 可读提示（EC-014）；(3) `protocol/trust.ts`：信任模型（默认 `untrusted`；`integrity` sha256 校验；无声明 = `integrityVerified:false` → 保守；`source` 溯源）；(4) `protocol/rpc.ts`：`web-cli:invoke`/`web-cli:result` postMessage RPC 契约 + 超时/错误可读；(5) `discovery/discovery.ts`：三通道依序（静态 `/.well-known/web-cli.json` → HTML `<link rel=web-cli>`/`<meta name=web-cli>` → MAIN-world postMessage 握手）+ 三态判定（支持/不支持/未知）+ ≥3 失败降级可读态；(6) `discovery/static-declaration.ts`：well-known/HTML link·meta 解析，**相对 href 解析为绝对 URL**（兼容 LGDL `base='/LGDL/'` 子路径）；(7) `discovery/runtime-handshake.ts`：`chrome.scripting.executeScript({world:'MAIN'})` 注入探测 + postMessage 握手（超时 3s）。**零逐站点硬编码、零 LGDL 私有格式**。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| NEW | `packages/web-cli-plugin/src/protocol/descriptor.ts` |
| NEW | `packages/web-cli-plugin/src/protocol/version.ts` |
| NEW | `packages/web-cli-plugin/src/protocol/trust.ts` |
| NEW | `packages/web-cli-plugin/src/protocol/rpc.ts` |
| NEW | `packages/web-cli-plugin/src/discovery/discovery.ts` |
| NEW | `packages/web-cli-plugin/src/discovery/static-declaration.ts` |
| NEW | `packages/web-cli-plugin/src/discovery/runtime-handshake.ts` |
| NEW | `packages/web-cli-plugin/test/protocol.test.ts` |
| NEW | `packages/web-cli-plugin/test/discovery.test.ts` |

**验收标准**:
- [ ] descriptor schema：字段（`protocolVersion`/`tools[]`/`transport`/`integrity`/`source`）校验 + 归一化；非法声明 → **可读拒绝**不崩溃（FR-011/014）
- [ ] version：协商正确；未知/不兼容版本 → 拒绝或降级 + 可读提示（EC-014/FR-013）
- [ ] trust：默认 `untrusted`；`integrity` sha256 校验；无声明 → `integrityVerified:false` 保守；`source` 溯源填充（FR-012/EC-002）
- [ ] rpc：`web-cli:invoke`/`web-cli:result` 契约往返；超时/错误可读（FR-011）
- [ ] discovery 三通道依序 + 三态（支持/不支持/未知）判定正确；≥3 失败降级场景可读（FR-010/014/EC-001）
- [ ] static-declaration：相对 href 解析为绝对 URL（`/LGDL/` 子路径兼容断言）
- [ ] runtime-handshake：MAIN-world 注入探测 + 3s 超时分支可测（fake 消息桩）
- [ ] **零 LGDL 私有格式耦合**（grep 断言，FR-015/NFR-009 前置）；无逐站点硬编码
- [ ] node 单测全绿（`protocol.test.ts`/`discovery.test.ts`，fake fetch/消息桩）；既有上游测试零回归（AC-001）

**验证命令**:
```bash
npm run build --workspace @lgdl/web-cli-plugin && npm run test --workspace @lgdl/web-cli-plugin
# 零 LGDL 私有格式耦合 grep（协议/发现层不得出现 lgdl 特化分支）
! grep -rniE "lgdl" packages/web-cli-plugin/src/protocol packages/web-cli-plugin/src/discovery
```

### TASK-005: 安全层（授权/门禁/二次确认/审计/脱敏）

| 属性 | 值 |
|------|-----|
| **复杂度** | L |
| **类型** | 🛠 实施 |
| **前置依赖** | TASK-004（策略引用声明工具语义） |
| **执行波次** | Wave 3（plan 波1） |
| **对应 FR** | FR-023/024/025/026/027/028（+ NFR-001/003） |
| **TB 映射** | TB-D（plan §9） |
| **风险** | R-001（安全面失控）—— background 单一权威门禁 + fail-closed + 无旁路；R-009（页面注入伪造）—— 结果按 `external` 处理 |

**输入**: plan §2.5（门禁映射）+ §3.3 + ADR-003/005 + spec FR-023~028 + EC-002/003/004/005/015 + NFR-001/003

**描述**: 实现安全层（门禁单一权威点）。(1) `security/origin-store.ts`：per-origin 授权/信任 CRUD（**授权与信任分离**）+ 审计；(2) `security/policy.ts`：三 `PolicyStrategy` 经上游 `PermissionGate` 注入 —— **S1** 未授权 origin → deny；**S2** `namespace=site` 且 untrusted 时 `write`/`evaluate`/`external` → ask、未知档位 → deny（fail-closed）；**S3** 无匹配 → deny；`riskDefaults` read→allow / 写面→ask / evaluate→deny；deny 优先；(3) `security/confirm.ts`：`onAsk` → side panel 二次确认 + 操作摘要构建；超时/取消 = 拒绝（EC-005）；(4) `security/audit-sink.ts`：`AuditSink` 实现（`chrome.storage` 环形缓冲 + 可回放/导出），事件面扩展 `origin-authorize`/`origin-revoke`/`descriptor-read`/`confirm`/`llm-config`；(5) `security/redact.ts`：import 复用 base `sensitive.ts` 脱敏。**prompt injection 护栏**：站点 RPC 返回按 `trust:'external'` 处理，不解释为系统指令。**无旁路、无静默 allow、零明文**。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| NEW | `packages/web-cli-plugin/src/security/origin-store.ts` |
| NEW | `packages/web-cli-plugin/src/security/policy.ts` |
| NEW | `packages/web-cli-plugin/src/security/confirm.ts` |
| NEW | `packages/web-cli-plugin/src/security/audit-sink.ts` |
| NEW | `packages/web-cli-plugin/src/security/redact.ts` |
| NEW | `packages/web-cli-plugin/test/security.test.ts` |

**验收标准**:
- [ ] origin-store：per-origin 授权/信任 CRUD 正确；**授权与信任分离**；变更入审计（FR-023/FR-012）
- [ ] policy 三策略裁决表全绿：S1 未授权 → deny；S2 untrusted 危险档位 → ask、未知档位 → deny（fail-closed）；S3 无匹配 → deny；**deny 优先**（FR-027/NFR-001）
- [ ] `riskDefaults`：read→allow / 写面→ask / evaluate→deny；**不可放宽至静默**（FR-026）
- [ ] confirm：`onAsk` 桥 + 操作摘要可读；超时/取消 = 拒绝（EC-005/FR-024）
- [ ] audit-sink：环形缓冲 + 事件面（`origin-authorize`/`origin-revoke`/`descriptor-read`/`confirm`/`llm-config`）+ 可回放/导出；审计不影响主流程（FR-025/NFR-003）
- [ ] redact：import 复用 base `sensitive.ts`（**零复制分叉**）；敏感明文零进上下文/日志/审计（FR-028/EC-015/NFR-001）
- [ ] **无旁路**：grep 无直接 executor 调用入口，所有执行经 `dispatch`；无静默 allow（NFR-001）
- [ ] 结果按 `trust:'external'` 处理，不将页面输出解释为指令（R-009/FR-028 延伸）
- [ ] node 单测（裁决表/fail-closed/deny 优先/脱敏/超时）+ 上游零回归（AC-001）

**验证命令**:
```bash
npm run build --workspace @lgdl/web-cli-plugin && npm run test --workspace @lgdl/web-cli-plugin
# 无旁路 grep（security 外不得直接调用 executor；无静默 allow）
! grep -rn "silentAllow\|allowSilently" packages/web-cli-plugin/src
```

### TASK-006: 宿主与工具层（background 控制面 + extension-env + 工具注册）

| 属性 | 值 |
|------|-----|
| **复杂度** | L |
| **类型** | 🛠 实施 |
| **前置依赖** | TASK-003/004/005 |
| **执行波次** | Wave 4（plan 波1） |
| **对应 FR** | FR-005/008/011/017/023（+ NFR-001/005） |
| **TB 映射** | TB-E + TB-F（plan §9；**合并**，见 §4.4） |
| **风险** | SW 生命周期（R-011）—— 状态落 `chrome.storage.session/local` 恢复；门禁权威点须在 background（不可被页面绕过） |

**输入**: plan §2.4（MV3 三面）+ §2.8（数据流）+ §3.4（CAP 会话）+ ADR-002/003/012 + spec FR-005/008/011/017/023 + EC-011/013

**描述**: 实现 background 控制面（**填充 TASK-003 的 `service-worker.ts`/`messaging.ts` stub**）。(1) `background/host.ts`：`CommandRouter` + `AgentRunner` 宿主 + 工具注册（site + admin）；(2) `background/controller.ts`：活跃标签绑定（单标签，S-011）+ 会话状态 + 导航失效明示（EC-011）；(3) `background/service-worker.ts`：消息路由 + 生命周期保活 + `chrome.storage.session/local` 恢复（EC-013/R-011）；(4) `background/messaging.ts`：background↔content↔sidepanel 跨面消息协议；(5) `platform/extension-env.ts`：`PlatformEnv` 实现（扩展 fetch / `chrome.storage` kv / 远程 dom·events 缝）；(6) `platform/unsupported.ts`：复用 base `ATTRIBUTION_MAP` 统一「不支持 + 归属」转译，**无静默 catch**（FR-008/EC-007）；(7) `tools/declared-tools.ts`：`descriptor.tools` → `ToolEntry[]`（`namespace:'site'`、`schema` 由 params 生成、`risk` 插件复核、`executor`=RPC）；(8) `tools/admin-tools.ts`：`origin-authorize`/`origin-revoke`/`origin-list`/`descriptor-show`/`audit-export`/`llm-config`。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| NEW | `packages/web-cli-plugin/src/background/host.ts` |
| NEW | `packages/web-cli-plugin/src/background/controller.ts` |
| MODIFY | `packages/web-cli-plugin/src/background/service-worker.ts`（填充 stub） |
| MODIFY | `packages/web-cli-plugin/src/background/messaging.ts`（填充 stub） |
| NEW | `packages/web-cli-plugin/src/platform/extension-env.ts` |
| NEW | `packages/web-cli-plugin/src/platform/unsupported.ts` |
| NEW | `packages/web-cli-plugin/src/tools/declared-tools.ts` |
| NEW | `packages/web-cli-plugin/src/tools/admin-tools.ts` |
| NEW | `packages/web-cli-plugin/test/host.test.ts` |

**验收标准**:
- [ ] host：`CommandRouter` + `AgentRunner`（base import 消费，**零复制分叉**）+ 工具注册（site + admin）（FR-017/NFR-005）
- [ ] controller：活跃标签绑定（单标签 S-011）；导航失效明示 + 需重新授权/重连，**不静默续接**（EC-011/FR-017）
- [ ] service-worker：消息路由 + SW 生命周期保活 + `chrome.storage.session/local` 恢复（EC-013/R-011）
- [ ] messaging：跨面消息协议完整（background↔content↔sidepanel）
- [ ] extension-env：`PlatformEnv` 实现（扩展 fetch / storage kv / 远程缝）；未注入能力可读转译（EC-007）
- [ ] unsupported：复用 `ATTRIBUTION_MAP` 统一「不支持+归属」；**无静默 catch 吞错**（grep 断言，FR-008）
- [ ] declared-tools：descriptor.tools → `ToolEntry`（`namespace:'site'`/schema/risk/executor=RPC）；help/schema 可读（FR-011）
- [ ] admin-tools：6 管理工具（origin-authorize/revoke/list、descriptor-show、audit-export、llm-config）
- [ ] **门禁单一权威点在 background**，页面不可绕过（NFR-001）；所有执行经 `dispatch`（无旁路）
- [ ] build/test；上游零回归（AC-001）

**验证命令**:
```bash
npm run build --workspace @lgdl/web-cli-plugin && npm run test --workspace @lgdl/web-cli-plugin
# 无静默 catch 吞错（unsupported 转译必须显式）
! grep -rnE "catch\s*\([^)]*\)\s*\{\s*\}" packages/web-cli-plugin/src
```

### TASK-007: KEY 层 + options（8 厂商表 + key 隔离 + 设置/迁移指引）

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **类型** | 🛠 实施 |
| **前置依赖** | TASK-003 |
| **执行波次** | Wave 2（plan 波1，与 TASK-004 并行） |
| **对应 FR** | FR-033/035（+ FR-034 表对齐；NFR-009） |
| **TB 映射** | TB-G（plan §9） |
| **风险** | S-007 冻结：独立配置不共享 `localStorage`；key 零明文回显；不自动迁移（S-015） |

**输入**: plan §2.7（存储）+ §3.5（KEY）+ ADR-005/011 + spec FR-033/034/035/036 + EC-009

**描述**: 实现 KEY 层与 options UI。(1) `llm/providers.ts`：8 厂商表（`deepseek`/`qwen`/`volc`/`volc-coding`/`volc-plan`/`tencent`/`openai`/`claude`）对齐 `provider.ts` 语义，`browserDirect` 保留为「需验证」标记；(2) `llm/key-store.ts`：`chrome.storage.local`（**不用 `sync`**），key 仅 background 持有；(3) `ui/options/*`：LLM 配置 / 迁移指引 / 合规清单入口，key 零明文回显。**不读写内置助手 `lgdl-ai-settings`/`localStorage`**（S-015/FR-036）。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| NEW | `packages/web-cli-plugin/src/llm/providers.ts` |
| NEW | `packages/web-cli-plugin/src/llm/key-store.ts` |
| MODIFY | `packages/web-cli-plugin/src/ui/options/index.html`（填充 stub） |
| MODIFY | `packages/web-cli-plugin/src/ui/options/options.ts`（填充 stub） |
| NEW | `packages/web-cli-plugin/test/llm.test.ts` |

**验收标准**:
- [ ] providers：8 厂商表与 base `provider.ts` 语义对齐（逐项核对）；`browserDirect` 标记保留（FR-034 前置）
- [ ] key-store：`chrome.storage.local`（不用 `sync`）；key 仅 background 持有（FR-033/035）
- [ ] options：LLM 配置 / 迁移指引 / 合规清单入口可用；key **零明文回显**（FR-033/NFR-008）
- [ ] **不读写内置助手 `lgdl-ai-settings`/`localStorage`**（grep 断言，S-015/FR-036）
- [ ] key 不进页面上下文/日志/审计（FR-035/EC-015）
- [ ] 迁移指引存在：不自动迁移 + 手动重配（FR-036，S-015；详细迁移文档归 TASK-014）
- [ ] build/test；上游零回归（AC-001）

**验证命令**:
```bash
npm run build --workspace @lgdl/web-cli-plugin && npm run test --workspace @lgdl/web-cli-plugin
# 不共享内置助手存储 grep
! grep -rn "lgdl-ai-settings" packages/web-cli-plugin/src
! grep -rn "localStorage" packages/web-cli-plugin/src/llm
```

### TASK-008: content script 数据面（isolated world + page-bridge RPC）

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **类型** | 🛠 实施 |
| **前置依赖** | TASK-003/004 |
| **执行波次** | Wave 4（plan 波1，与 TASK-006 并行） |
| **对应 FR** | FR-007/011（+ FR-005 manifest 动态注入；NFR-002） |
| **TB 映射** | TB-H（plan §9） |
| **风险** | R-010（content script 与页面脚本冲突）—— isolated world + 不挂全局 + 不改原型链 |

**输入**: plan §2.3.3（RPC 契约）+ §2.4 + §3.1（隔离）+ ADR-001/004 + spec FR-007/011 + EC-006 + NFR-002

**描述**: 实现 content script 数据面（**填充 TASK-003 的 `content-script.ts` stub**）。(1) `content/content-script.ts`：isolated world 入口；不向页面 `window` 挂全局、不修改原型链；经 `chrome.scripting` 按 origin **动态注入**（无静态全站注入）；(2) `content/page-bridge.ts`：页面世界 postMessage RPC 桥（`web-cli:invoke`/`web-cli:result`）；(3) MODIFY `manifest.json`：如 `web_accessible_resources`/`scripting` 配置所需（与 TASK-003 权限面兼容，不扩权限）。默认无操作零常驻开销。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/web-cli-plugin/src/content/content-script.ts`（填充 stub） |
| NEW | `packages/web-cli-plugin/src/content/page-bridge.ts` |
| MODIFY | `packages/web-cli-plugin/manifest.json`（动态注入所需配置，**不扩权限面**） |
| NEW | `packages/web-cli-plugin/test/content.test.ts` |

**验收标准**:
- [ ] isolated world：**不挂页面 `window` 全局**、**不修改原型链**、对宿主页关键路径零常驻开销（FR-007/NFR-002；grep 断言无 `window.` 赋值）
- [ ] page-bridge：`web-cli:invoke`/`web-cli:result` RPC 桥往返正确（FR-011）
- [ ] 经 `chrome.scripting` 按 origin **动态注入**，无静态全站 `content_scripts`（FR-006）
- [ ] manifest 变更与 TASK-003 权限面兼容，**未扩大权限**（NFR-002）
- [ ] 与页面脚本冲突可读提示（EC-006/FR-008）
- [ ] build/test；上游零回归（AC-001）

**验证命令**:
```bash
npm run build --workspace @lgdl/web-cli-plugin && npm run test --workspace @lgdl/web-cli-plugin
# 全局污染 grep（不得向页面 window 赋值）
! grep -rnE "(window|globalThis)\.[A-Za-z_]+\s*=" packages/web-cli-plugin/src/content
```

### TASK-009: side panel（会话/授权/二次确认/审计查看）

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **类型** | 🛠 实施 |
| **前置依赖** | TASK-006 |
| **执行波次** | Wave 5（plan 波1） |
| **对应 FR** | FR-017/024/025（+ NFR-003/008） |
| **TB 映射** | TB-I（plan §9） |
| **风险** | 人工面交互（机械不可测）—— 列入 TASK-011 冒烟人工面清单；不注入宿主页（FR-007） |

**输入**: plan §2.4（side panel）+ §3.4（会话）+ §3.3（确认/审计）+ ADR-002/012 + spec FR-017/024/025 + EC-005/011 + NFR-008

**描述**: 实现 side panel UI（**填充 TASK-003 的 sidepanel stub**）：多轮对话渲染 + 工具调用展示；`askUser` 缝接 side panel；per-origin 授权弹层（含知情同意风险提示，风险提示文案细节归 TASK-014）；敏感操作二次确认呈现（操作摘要可读）；审计查看/导出；关键状态可见（已授权/活跃操作/审计）；导航失效提示（EC-011）。**不注入宿主页**。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/web-cli-plugin/src/ui/sidepanel/index.html`（填充 stub） |
| MODIFY | `packages/web-cli-plugin/src/ui/sidepanel/sidepanel.ts`（填充 stub） |
| NEW | `packages/web-cli-plugin/test/sidepanel.test.ts`（可测逻辑面，DOM 无关） |

**验收标准**:
- [ ] 多轮对话渲染 + 工具调用展示；`askUser` 缝接 side panel（FR-017）
- [ ] 授权弹层：per-origin 授权交互可用（知情同意风险提示文案由 TASK-014 补强）
- [ ] 二次确认：操作摘要可读；超时/取消 = 拒绝（EC-005/FR-024）
- [ ] 审计查看/导出可用（FR-025/NFR-003）
- [ ] 关键状态可见（已授权/活跃操作/审计）；导航失效提示（NFR-008/EC-011）
- [ ] **不注入宿主页**（FR-007）
- [ ] build/test；人工面交互列入 TASK-011 冒烟清单

**验证命令**:
```bash
npm run build --workspace @lgdl/web-cli-plugin && npm run test --workspace @lgdl/web-cli-plugin
# 人工面（冒烟）：side panel 多轮/授权弹层/二次确认/审计查看 —— 见 TASK-011 清单
```

### TASK-010: LGDL 站点协议暴露点（web-cli-host + 静态声明 + App 挂载）

| 属性 | 值 |
|------|-----|
| **复杂度** | L |
| **类型** | 🛠 实施 |
| **前置依赖** | TASK-004/008 |
| **执行波次** | Wave 5（plan 波1） |
| **对应 FR** | FR-041/042/020（+ FR-018 图内容命令；NFR-009） |
| **TB 映射** | TB-J（plan §9） |
| **风险** | R-008（双份工具面冲突）—— 对象区分：保留机制层、移除助手专属；`App.tsx` 跨波次串行（挂载 J → 摘除 R） |

**输入**: plan §2.6（对象区分/桥接）+ §3.6（LGDL 暴露点）+ ADR-004 + spec FR-041/042/020/018 + EC-012 + O-006↔O-001 对象区分裁决

**描述**: 在 LGDL 页新增站点协议暴露点（**保留 web-cli-base 机制层**）。(1) `packages/lgdl-web/src/web-cli-host/host-router.ts`：复用保留的 base `CommandRouter` + `createLgdlWebCliTool()` + `createOpCliToolEntry(opRegistry)`（工具面组装从 `session.ts` 迁移/保留），**移除助手专属**（runner/provider/system prompt）；(2) `bridge.ts`：`window.postMessage` 监听 `web-cli:invoke` → `router.dispatch` → `web-cli:result`；提供 `apply` 写回通道（页内 `parseLgdl` 校验 + `onApply`）；(3) `declaration.ts` + `public/.well-known/web-cli.json` + `index.html` `<link rel="web-cli" href="web-cli.json">`（相对路径兼容 `base='/LGDL/'`）；(4) `App.tsx`：**挂载 `web-cli-host`**（本任务不摘除内置助手，摘除归 TASK-016）。无 React 内部状态直连。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| NEW | `packages/lgdl-web/src/web-cli-host/host-router.ts` |
| NEW | `packages/lgdl-web/src/web-cli-host/bridge.ts` |
| NEW | `packages/lgdl-web/src/web-cli-host/declaration.ts` |
| NEW | `packages/lgdl-web/public/.well-known/web-cli.json` |
| MODIFY | `packages/lgdl-web/index.html`（`<link rel="web-cli">`） |
| MODIFY | `packages/lgdl-web/src/App.tsx`（挂载 `web-cli-host`） |

**验收标准**:
- [ ] host-router：复用保留 base `CommandRouter` + 领域工具注册（`lgdl-web-cli` + op-cli）；**移除助手专属**（runner/provider/system prompt）（FR-041/对象区分）
- [ ] bridge：`web-cli:invoke` → `router.dispatch` → `web-cli:result` 往返；`apply` 写回通道（`parseLgdl` 校验 + `onApply`，**无 React 内部状态直连**）（FR-020/042）
- [ ] declaration + `.well-known/web-cli.json` + `index.html` link（**相对路径兼容 `base='/LGDL/'`**）（FR-041）
- [ ] `App.tsx` 挂载 `web-cli-host`；**内置助手 `ai/` 本任务不删改**（摘除归 TASK-016，EC-012）
- [ ] 图内容命令（`lgdl-web-cli` 9 命令）经 RPC 可达（FR-018）
- [ ] lgdl-web build/test 全绿；LGDL 既有功能**零回归**（AC-009）；base 零改动
- [ ] 无 LGDL 私有接口依赖暴露给插件侧（插件零 LGDL 私有依赖）

**验证命令**:
```bash
npm run build --workspace @lgdl/lgdl-web && npm run test --workspace @lgdl/lgdl-web
ls packages/lgdl-web/public/.well-known/web-cli.json
# index.html link 断言
grep -n 'rel="web-cli"' packages/lgdl-web/index.html
```

### TASK-011: 波1 收口 GATE + 通用性验证（红线 grep + 零回归 + 冒烟清单）

| 属性 | 值 |
|------|-----|
| **复杂度** | L |
| **类型** | ⚖️🛠 收口 GATE（含通用性端到端验证） |
| **前置依赖** | TASK-001~TASK-010（波1 全部） |
| **执行波次** | Wave 6（plan 波1 末） |
| **对应 FR** | FR-043/004/002/016（+ NFR-001/005/006） |
| **TB 映射** | TB-K + TB-L（plan §9；**合并**，见 §4.4） |
| **风险** | 通用性不足（R-003）—— fixture 端到端暴露站点硬编码；D-005 测试守恒红线 |

**输入**: plan §5.4（测试策略）+ §5.3 柱4 + ADR-004/009/010 + spec FR-002/004/016/043 + EC-012 + AC-001/003/010

**描述**: 波1 收口 GATE。(1) **通用性端到端**：非 LGDL fixture 站点完成「发现 → 声明 → 授权 → 工具面组装 → 执行 → 审计」全链（FR-043/016/AC-010）；(2) **双份工具面冲突检测**：无双重执行/重复注册（EC-012/FR-004）；(3) **红线 grep**：无复制 base 源码分叉（FR-002/NFR-005）、无 LGDL 私有依赖（FR-003/NFR-009）、discovery/policy 无 lgdl 特化分支（FR-043）、无旁路（NFR-001）、敏感明文零命中（EC-015）；(4) **上游零回归**：base 全量测试零删除零降级（D-005）；(5) 机械面 + 人工面**冒烟清单** + validate 移交。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/web-cli-plugin/test/fixtures/site/`（补全端到端可跑） |
| NEW | `packages/web-cli-plugin/test/e2e.generality.test.ts` |
| NEW | `packages/web-cli-plugin/docs/smoke-checklist.md`（机械面 + 人工面；⚠️ plan §6 未显式列出，收口产物） |
| MODIFY | `.sddu/specs-tree-root/specs-tree-web-cli-plugin/state.json`（收口结论 notes） |

> ⚠️ **plan 未覆盖标注**：冒烟清单文件 plan §6 未显式列出（§5.4 要求「冒烟清单存在」）。落 `docs/smoke-checklist.md` 属收口产物，非方案变更。

**验收标准**:
- [ ] fixture 站点端到端全链通过：发现 → 声明 → 授权 → 工具面组装 → 执行 → 审计（**不依赖 LGDL 私有接口**，FR-043/AC-010）
- [ ] 双份工具面冲突检测：**无双重执行 / 无重复注册**（EC-012/FR-004）
- [ ] grep ①：插件 `src/` **无 base 源码副本/分叉**（FR-002/NFR-005）
- [ ] grep ②：插件依赖图谱**零 `@lgdl/lgdl-web` 私有包**（FR-003/NFR-009）
- [ ] grep ③：`discovery`/`policy` **无 `lgdl` 特化分支**（FR-043 通用性评审）
- [ ] grep ④：**无旁路**（所有执行经 `dispatch`，无直接 executor 入口）；无静默 allow（NFR-001）
- [ ] grep ⑤：敏感明文零命中（cookie/URL token/键入/console·对话框/LLM key）（EC-015/NFR-001）
- [ ] **D-005 测试守恒**：base 全量既有测试零删除零降级；`npm run test --workspace @lgdl/web-cli-base` 全绿（NFR-005）
- [ ] 冒烟清单：机械面（扩展加载/SW target/content 注入/fixture 三态/授权三路/untested fail-closed/RPC 往返/审计落库/导航失效）+ 人工面（side panel 多轮/授权弹层/二次确认/审计查看）逐项可执行
- [ ] validate 移交清单（含 TASK-001 波0 结论 + G-KEY 结论 + 降级出口记录）

**验证命令**:
```bash
npm run test --workspace @lgdl/web-cli-base
npm run build --workspace @lgdl/web-cli-plugin && npm run test --workspace @lgdl/web-cli-plugin
# 红线 grep（逐项须零命中）
! grep -rn "@lgdl/lgdl-web" packages/web-cli-plugin/src
! grep -rniE "lgdl" packages/web-cli-plugin/src/discovery packages/web-cli-plugin/src/security/policy.ts
grep -rn "executor" packages/web-cli-plugin/src | grep -v "dispatch" || true
```

### TASK-012: 协议完善（版本协商 + 站点中立协议文档 + 失败降级补强）

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **类型** | 📄🛠 实施 + 文档 |
| **前置依赖** | TASK-004（MODIFY `version.ts`/`discovery.ts` 同文件串行） |
| **执行波次** | Wave 7（plan 波2） |
| **对应 FR** | FR-013/015/014（+ NFR-009） |
| **TB 映射** | TB-M（plan §9） |
| **风险** | S-013（O-013）**待作者核签**：协议中立/标准化预留为暂定基线，未核签不阻塞 |

**输入**: plan §3.2 + §3.0 FR-015 落位 + ADR-001/007 + spec FR-013/014/015 + EC-014 + NFR-009

**描述**: P1 协议完善。(1) `protocol/version.ts` 补强：未知/不兼容版本 → 拒绝或降级 + 可读提示 + 入审计（EC-014）；(2) `docs/protocol.md`：站点中立协议文档（descriptor schema / RPC / 发现 / 信任 / 版本），**零 LGDL 私有格式耦合**，为 F-13 ② 标准化预留接口（FR-015，S-013）；(3) `discovery/discovery.ts` 失败降级 ≥3 场景可读态补强（EC-001/014）。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/web-cli-plugin/src/protocol/version.ts`（TASK-004 建） |
| MODIFY | `packages/web-cli-plugin/src/discovery/discovery.ts`（TASK-004 建） |
| NEW | `packages/web-cli-plugin/docs/protocol.md` |
| MODIFY | `packages/web-cli-plugin/test/protocol.test.ts` |

**验收标准**:
- [ ] 版本协商补强：未知/不兼容 → 拒绝或降级 + 可读提示 + 入审计（EC-014/FR-013）
- [ ] `docs/protocol.md`：descriptor schema / RPC / 发现 / 信任 / 版本齐全；**零 LGDL 私有格式**（grep 断言）；留标准化接口（FR-015/ADR-007）
- [ ] 失败降级 ≥3 场景可读态补强（无声明/声明无效/版本不匹配）（FR-014/EC-001）
- [ ] build/test 全绿；上游零回归（AC-001）

**验证命令**:
```bash
npm run build --workspace @lgdl/web-cli-plugin && npm run test --workspace @lgdl/web-cli-plugin
! grep -rniE "lgdl" packages/web-cli-plugin/docs/protocol.md
```

### TASK-013: UI 操作 + 事件消费（op-cli RPC + 事件桥）

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **类型** | 🛠 实施 |
| **前置依赖** | TASK-008/010 |
| **执行波次** | Wave 7（plan 波2） |
| **对应 FR** | FR-019/021（+ NFR-007） |
| **TB 映射** | TB-N（plan §9） |
| **风险** | 事件预算（NFR-007）—— 沿用上游截断/摘要口径；UI 操作经 RPC 不越权（经门禁） |

**输入**: plan §3.4（UI 操作/事件消费）+ ADR-004 + spec FR-019/021 + NFR-007

**描述**: P1 能力面补全。(1) **UI 操作**：站点 `site:lgdl-web-op-cli`（UI 操作）经 RPC 执行（经 background 门禁，不越权）（FR-019）；(2) **事件消费**：content script 事件桥（页内 `env.events` hub 代理）→ background 事件通道；或直接订阅页面 DOM 事件（isolated world 可达）（FR-021）；(3) 上下文预算沿用上游截断/摘要口径（NFR-007）。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/lgdl-web/src/web-cli-host/bridge.ts`（TASK-010 建；op-cli RPC） |
| MODIFY | `packages/web-cli-plugin/src/content/page-bridge.ts`（TASK-008 建；事件桥） |
| MODIFY | `packages/web-cli-plugin/test/content.test.ts` |

**验收标准**:
- [ ] UI 操作：`site:lgdl-web-op-cli` 经 RPC 执行，**经门禁裁决**（FR-019）
- [ ] 事件消费：content script 事件桥（页内 `env.events` hub 代理）→ background 事件通道（FR-021）
- [ ] 上下文预算沿用上游截断/摘要口径（NFR-007）
- [ ] build/test（plugin + lgdl-web）；上游零回归（AC-001）

**验证命令**:
```bash
npm run build --workspace @lgdl/web-cli-plugin && npm run test --workspace @lgdl/web-cli-plugin
npm run build --workspace @lgdl/lgdl-web && npm run test --workspace @lgdl/lgdl-web
```

### TASK-014: 风控护栏 + 合规/迁移/调试文档（P1 收口）

| 属性 | 值 |
|------|-----|
| **复杂度** | L |
| **类型** | 🛠📄 实施 + 文档 |
| **前置依赖** | TASK-005/009（MODIFY `policy.ts`/`ui/sidepanel` 同文件串行） |
| **执行波次** | Wave 7（plan 波2） |
| **对应 FR** | FR-029/031/032/036/039/040/044/045/037（+ NFR-003/008/010） |
| **TB 映射** | TB-O + TB-P（plan §9；**合并**，见 §4.4） |
| **风险** | R-001（风控/合规）—— 频率限制 + 可中止；R-007 过渡期双份并存—— 收敛终止时点 |

**输入**: plan §3.3（风控）+ §3.7（合规）+ §3.8（迁移/Gate-D 门槛）+ §3.9（调试/冒烟）+ ADR-006/008 + spec FR-029/031/032/036/039/040/044/045/037 + EC-010/016

**描述**: P1 收口。(1) **风控护栏**：per-origin 调用频率限制（令牌桶，可配）+ 可中断（side panel stop）+ 可暂停（EC-010）（FR-029）；(2) **合规**：授权流程知情同意风险提示（账号风控/条款冲突/数据外泄面）+ `docs/compliance.md` 不适用清单（FR-031/032）；(3) **迁移**：`docs/migration.md` 不自动迁移 + 手动重配指引 + 差异清单 + 过渡期双份维护控制起止条件/收敛计划（FR-036/039/040）；(4) **调试/冒烟**：`docs/dev.md` 本地 unpacked 加载/热重载（FR-044）+ 冒烟方法论（FR-045）；(5) `docs/gate-d.md`：Gate-D 条件清单 D-1~D-7（FR-037，门槛定义）。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/web-cli-plugin/src/security/policy.ts`（TASK-005 建；风控） |
| MODIFY | `packages/web-cli-plugin/src/ui/sidepanel/sidepanel.ts`（TASK-009 建；stop/pause + 知情同意文案） |
| MODIFY | `packages/web-cli-plugin/docs/compliance.md`（TASK-002 建；不适用清单） |
| NEW | `packages/web-cli-plugin/docs/migration.md` |
| NEW | `packages/web-cli-plugin/docs/dev.md` |
| NEW | `packages/web-cli-plugin/docs/gate-d.md` |

**验收标准**:
- [ ] 风控：per-origin 频率限制（令牌桶，可配）+ 可中断（stop）+ 可暂停（EC-010/FR-029）
- [ ] 知情同意：授权流程风险提示（账号风控/条款冲突/数据外泄面）+ 能力边界，文案可读（FR-031/NFR-008）
- [ ] `docs/compliance.md` 不适用清单（明确禁止自动化的站点类型/操作类型）（FR-032）
- [ ] `docs/migration.md`：不自动迁移 + 手动重配指引 + 差异清单（FR-036/039，S-015）
- [ ] 过渡期双份维护控制：起止条件 + 收敛计划（终止时点）（FR-040）
- [ ] `docs/dev.md`：本地 unpacked 加载 + 热重载可行路径（改 content 重注入 / 改 SW 重载扩展）（FR-044）
- [ ] 冒烟方法论：无头/自动化可行性结论 + 机械面/人工面分离（FR-045/ADR-006）
- [ ] `docs/gate-d.md`：D-1~D-7 条件清单逐条可验收（FR-037）
- [ ] build/test 全绿；上游零回归（AC-001）

**验证命令**:
```bash
npm run build --workspace @lgdl/web-cli-plugin && npm run test --workspace @lgdl/web-cli-plugin
ls packages/web-cli-plugin/docs/migration.md packages/web-cli-plugin/docs/dev.md packages/web-cli-plugin/docs/gate-d.md
grep -c "D-[1-7]" packages/web-cli-plugin/docs/gate-d.md
```

### TASK-015: （可选）通用 DOM 工具面（dom-agent + extensionEnv 远程 dom 缝）

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **类型** | 🛠 实施（**可后置**） |
| **前置依赖** | TASK-006/008（MODIFY `extension-env.ts` 同文件串行） |
| **执行波次** | Wave 7（plan 波2；容量不足可整块顺延） |
| **对应 FR** | NFR-007 延伸（支撑 FR-019/021 通用 DOM 可达面） |
| **TB 映射** | TB-Q（plan §9，plan 明确标注「可选」） |
| **风险** | 范围膨胀（R-004）—— **P0 不需要**；仅当容量允许时实施，可整块顺延不影响 P0/P1 验收 |

**输入**: plan §3.4 + §5.3 波2「通用 DOM 工具面（`extensionEnv` 远程 dom 缝，可选）」+ spec NFR-007

**描述**: （可选）实现通用 DOM 工具面：`content/dom-agent.ts`（`PlatformDomOps` 远程代理，content script 在页面上下文执行 DOM 操作）+ `platform/extension-env.ts` 装配远程 dom 缝。不可达能力如实转译；默认关/零常驻开销。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| NEW | `packages/web-cli-plugin/src/content/dom-agent.ts` |
| MODIFY | `packages/web-cli-plugin/src/platform/extension-env.ts`（TASK-006 建；远程 dom 缝） |
| NEW | `packages/web-cli-plugin/test/dom-agent.test.ts` |

**验收标准**:
- [ ] `PlatformDomOps` 远程代理（content script 执行页面 DOM 操作）可用（NFR-007 延伸）
- [ ] `extensionEnv` 远程 dom 缝装配；未注入/不可达 → 可读转译（FR-008）
- [ ] 默认关/零常驻开销（NFR-002/007）
- [ ] build/test 全绿；上游零回归（AC-001）
- [ ] **可后置声明**：本任务不属 P0/P1 必做集；容量不足可整块顺延，不阻塞 AC-001~AC-011 核心验收

**验证命令**:
```bash
npm run build --workspace @lgdl/web-cli-plugin && npm run test --workspace @lgdl/web-cli-plugin
```

### TASK-016: 发布渠道 + Gate-D 下线执行（P2，严格前置）

| 属性 | 值 |
|------|-----|
| **复杂度** | L |
| **类型** | 🛠📄 实施 + 文档（**含不可逆下线，严格前置**） |
| **前置依赖** | TASK-001~TASK-015（全部）+ **Gate-D D-1~D-7 全达标** |
| **执行波次** | Wave 8（plan 波3） |
| **对应 FR** | FR-046/038/037（+ FR-040 收敛；NFR-004） |
| **TB 映射** | TB-R（plan §9） |
| **风险** | R-008（下线回退风险）—— 未达门槛**不下线**（EC-016）；单提交可 revert；**S-016（O-016）待作者核签** |

**输入**: plan §3.8（下线执行/回退）+ §3.9（发布渠道）+ ADR-006/008 + spec FR-037/038/046/040 + EC-016 + S-016

**描述**: P2 收口（**Gate-D 全达标后执行，未达标不下线**）。(1) `docs/release.md`：发布渠道定义（本地 unpacked + 自托管/未打包分发；分发物/版本管理；商店后续）（FR-046/S-016）；(2) **Gate-D 前置检查**：逐条验收 D-1~D-7 并记录（未达 → 不下线，EC-016）；(3) **下线执行**：`App.tsx` 摘除 `AiPanel`/`SettingsPanel`/`createAiSession` 引用（保留 `web-cli-host` 挂载），删除 `packages/lgdl-web/src/ai/*`（AiPanel/AskDialog/SettingsPanel/prompts/provider/session）；**保留** base 机制层 + `web-cli-host`（FR-038/对象区分）；(4) **回退预案**：单提交/分支可 `git revert` + 构建期 flag `VITE_AI_ASSISTANT_FALLBACK`（默认 off）+ 显式终止时点（FR-038/040）；(5) ROADMAP v0.8/F-14 登记。

> ⚠️ **plan 未覆盖标注（任务内顺序依赖）**：Gate-D D-6「回退预案就绪」是 TASK-016 自身输出之一，而 D-6 又是下线前置条件 → **本任务内部必须先完成回退预案（子步骤 a）再执行下线（子步骤 b）**，不可并发。此顺序在 plan §3.8 隐含但未在 §9 TB-R 显式标注。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| NEW | `packages/web-cli-plugin/docs/release.md` |
| MODIFY | `packages/lgdl-web/src/App.tsx`（摘除 AiPanel/SettingsPanel/createAiSession 接线；保留 web-cli-host） |
| DELETE | `packages/lgdl-web/src/ai/AiPanel.tsx`、`AskDialog.tsx`、`SettingsPanel.tsx`、`prompts.ts`、`provider.ts`、`session.ts` |
| DELETE | `packages/lgdl-web/src/ai/provider.test.ts`、`session.test.ts`（随下线对象移除；**须同步更新 lgdl-web test script 文件清单**） |
| MODIFY | `packages/lgdl-web/package.json`（test script 移除已删测试文件条目） |
| MODIFY | `.sddu/specs-tree-root/ROADMAP.md`（v0.8/F-14 推进登记） |
| MODIFY | `.sddu/specs-tree-root/specs-tree-web-cli-plugin/state.json`（下线结论 notes） |

> ⚠️ **plan 未覆盖标注**：plan §6 DELETE 行仅列 `ai/AiPanel.tsx 等`（未含 `provider.test.ts`/`session.test.ts`），且 `lgdl-web/package.json` test script 显式引用这两个测试文件 —— **删除 `ai/*` 必然需要同步修改 test script**，否则 `npm run test --workspace @lgdl/lgdl-web` 失败。此为 plan 文件影响面的遗漏，已如实补入本任务涉及文件（属执行必需，非方案变更）。

**验收标准**:
- [ ] `docs/release.md`：本地 unpacked + 自托管/未打包分发；分发物/版本管理；商店后续（FR-046/S-016）
- [ ] **Gate-D 前置检查逐条记录 D-1~D-7**；**未达门槛 → 不下线**（EC-016/FR-037）
- [ ] 下线执行：`App.tsx` 摘除 `AiPanel`/`SettingsPanel`/`createAiSession`；`ai/*` 移除；**保留** base 机制层 + `web-cli-host`（FR-038/对象区分）
- [ ] 回退预案：单提交可 `git revert` + `VITE_AI_ASSISTANT_FALLBACK` 默认 off + 显式终止时点（FR-038/040）
- [ ] **不静默进入无 AI 可用状态**（EC-016）
- [ ] `lgdl-web/package.json` test script 同步（删除已删测试文件条目）；`npm run test --workspace @lgdl/lgdl-web` 全绿
- [ ] ROADMAP v0.8/F-14 登记
- [ ] 全仓 `npm run build && npm test` 全绿；上游（base）零回归（AC-001）
- [ ] **执行顺序**：先回退预案（D-6）→ 再下线（子步骤串行）

**验证命令**:
```bash
npm run build --workspace @lgdl/lgdl-web && npm run test --workspace @lgdl/lgdl-web
test ! -d packages/lgdl-web/src/ai || echo "ai/ 未移除（Gate-D 未达标或未执行）"
npm run build && npm test
```

---

## 3. 任务汇总

| 统计项 | 数值 |
|--------|:--:|
| 总任务数 | 16（15 核心 + 1 可选后置 TASK-015/TB-Q） |
| S 级 (简单) | 0 |
| M 级 (中等) | 9（001/002/003/007/008/009/012/013/015） |
| L 级 (复杂) | 7（004/005/006/010/011/014/016） |
| 执行波次 | 9（Wave 0~8） |
| plan 波次覆盖 | 波0 = 001/002；波1(P0) = 003~011；波2(P1) = 012~015；波3(P2) = 016 |
| **P0 最小可用必做集** | **TASK-001~TASK-011**（波0 门槛 + 波1 四根柱子） |
| 实施任务 | 13（003~010、012~015、016） |
| 文档/契约预留任务 | 2（002；012/014 的文档面） |
| 验证门/spike 任务（内嵌降级出口） | 2（001 = MV3+G-KEY；011 = 通用性+红线收口） |
| TB 块整合 | 22 块 → 16 任务（见 §4.4） |

### 3.1 P0 四根柱子 → 任务映射（plan §5.3）

| 柱子 | 内容 | 任务 |
|------|------|------|
| 柱1 插件可用 | 包骨架 + manifest + background/content/side panel 加载运行 | TASK-003 + TASK-006 + TASK-008 + TASK-009 |
| 柱2 安全基线 | per-origin 授权 + 二次确认 + 审计 + fail-closed + 脱敏 + key 隔离 | TASK-005 + TASK-007 |
| 柱3 通用站点最小闭环 | 发现三态 + 声明读取 + 授权 + 工具面组装 + RPC 执行 + 审计 | TASK-004 + TASK-006 + TASK-008 |
| 柱4 LGDL 等价 | `web-cli-host` 暴露点 + 图内容命令 + 写回 + 端到端 | TASK-010 + TASK-011 |

---

## 4. 执行策略

### 4.1 每步门禁（AC-001 零回归 + D-005 测试守恒，贯穿所有任务）

> 任何任务完成后必须满足，否则视为未完成：
> ①**上游既有测试零删除、零降级**（D-005 测试守恒；base 与 lgdl-web 既有测试文件不得因插件任务被删改，**唯一例外 = TASK-016 Gate-D 达标后按 O-001 裁决删除 `lgdl-web/src/ai/*` 及其对应测试条目**）；②相关包 build + test 全绿；③插件不改 `packages/web-cli-base/**`（grep 断言）；④涉及 manifest 的任务：权限面**只减不增**（除 TASK-008 必要的动态注入配置，且不得新增宽泛权限）；⑤敏感明文零外泄 grep 随任务自查。
> 既有 `lgdl-web` 内置助手在 TASK-001~TASK-015 期间**保持可用**（不摘除），过渡期双份并存冲突由 TASK-011 检测、TASK-014 收敛计划、TASK-016 执行。

| 波次 | 任务 | 策略 |
|:--:|------|------|
| 0 | TASK-001, TASK-002 | 并行组 ①（无依赖；均为非产品交付；001 结论驱动 003/007 降级） |
| 1 | TASK-003 | 串行（包骨架为后续所有任务编译/测试前提） |
| 2 | TASK-004, TASK-007 | 并行组 ②（均依赖 003 包骨架；文件不相交：protocol/discovery \| llm/ui/options） |
| 3 | TASK-005 | 串行（策略引用声明工具语义；依赖 004） |
| 4 | TASK-006, TASK-008 | 并行组 ③（006 依赖 003/004/005；008 依赖 003/004；文件不相交：background+platform+tools \| content；⚠️ 008 MODIFY manifest 与 003 同文件，须在 003 后） |
| 5 | TASK-009, TASK-010 | 并行组 ④（009 依赖 006；010 依赖 004/008；文件不相交：plugin ui/sidepanel \| lgdl-web web-cli-host） |
| 6 | TASK-011 | 收口 GATE（依赖波1 全部；通用性端到端 + 红线 grep + 零回归 + 冒烟清单） |
| 7 | TASK-012, TASK-013, TASK-014, TASK-015 | 并行组 ⑤（P1；⚠️ 同文件追加项按 004→012 / 005→014 / 008→013 / 009→014 / 010→013 串行；015 可选可顺延） |
| 8 | TASK-016 | P2 终收口（Gate-D 严格前置，未达标不下线） |

### 4.2 降级出口（验证门任务）

| 任务 | 验证门 | 通过 | 失败（降级出口） |
|:--:|------|------|------|
| TASK-001 | MV3 六项 + G-KEY 火山端点 | 按结论继续波1；G-KEY PASS → 8 厂商全可用 | MV3 某项 FAIL → 逐项降级记录（无头加载失败 → headful/xvfb / Playwright `launchPersistentContext`）；G-KEY FAIL → 可读转译「需本地代理/不可直连」（EC-009/FR-034），**不假装、不静默**；失败项触发范围裁剪建议 |
| TASK-011 | 通用性端到端 + 红线 grep + 上游零回归 | 波1 收口，进入 P1 | 任一红线 grep 命中 → 修复后重跑，不得带病进入 P1；通用性失败 → 记录站点硬编码位置并返工 |

> 降级出口记录落点：`state.json` notes + `docs/smoke-checklist.md` / validate 移交清单（v4 先例：降级不返工、不静默、归属公开）。

### 4.3 文件所有权说明（防并行冲突）

- **`background/service-worker.ts` + `messaging.ts`**：TASK-003 建 stub → TASK-006 填充 → TASK-009/TASK-013 接线（**跨任务串行**，禁止并行改写）。
- **`manifest.json`**：TASK-003 建 → TASK-008 MODIFY（动态注入配置，**不扩权限**）。
- **`packages/lgdl-web/src/App.tsx`**：TASK-010 挂载 `web-cli-host` → TASK-016 摘除 `AiPanel`/`SettingsPanel`/`createAiSession`（**跨波次串行**）。
- **`packages/lgdl-web/src/ai/*`**：**仅 TASK-016** 在 Gate-D 达标后删除；TASK-001~TASK-015 期间零改动。
- **`platform/extension-env.ts`**：TASK-006 建 → TASK-015 MODIFY（远程 dom 缝）。
- **`protocol/version.ts` + `discovery/discovery.ts`**：TASK-004 建 → TASK-012 MODIFY。
- **`security/policy.ts`**：TASK-005 建 → TASK-014 MODIFY（风控）。
- **`content/page-bridge.ts`**：TASK-008 建 → TASK-013 MODIFY（事件桥）。
- **`ui/sidepanel/*`**：TASK-009 建 → TASK-014 MODIFY（stop/pause + 知情同意）。
- **`docs/compliance.md`**：TASK-002 建 → TASK-014 MODIFY（不适用清单）。
- **`test/fixtures/site/`**：TASK-002 建 → TASK-011 补全端到端。
- **单一数据源**：manifest 权限面 = TASK-003 唯一定义；插件能力面清单 = TASK-002 能力矩阵（TASK-016 Gate-D D-1 只引用不另立）。

### 4.4 TB 块 → 任务整合记录（D-001 类决策，供 review 追溯）

| plan §9 TB 块 | 任务 | 整合说明 |
|------|------|------|
| TB-0A + TB-0D | TASK-001 | **合并**：同属波0 平台/端点验证门；0D 依赖 0A，合并后单任务内串行（先 MV3 再 G-KEY），避免两个 spike 任务同波互相等待 |
| TB-0B + TB-0C | TASK-002 | **合并**：同属波0 非产品交付文档面（协议本质/试点 + 矩阵/合规），单任务收口，减少波0 任务碎片 |
| TB-A | TASK-003 | 一一对应 |
| TB-B + TB-C | TASK-004 | **合并**：协议层与发现层同属纯逻辑、发现直接消费描述符；单所有权面一次成文，规避跨任务类型/接口往返 |
| TB-D | TASK-005 | 一一对应 |
| TB-E + TB-F | TASK-006 | **合并**：同属 background 控制面；`service-worker.ts`/`messaging.ts` 为单文件所有权链 A→E→F，合并 E+F 规避同文件跨任务并行冲突（v4 TASK-004 先例） |
| TB-G | TASK-007 | 一一对应 |
| TB-H | TASK-008 | 一一对应 |
| TB-I | TASK-009 | 一一对应 |
| TB-J | TASK-010 | 一一对应 |
| TB-K + TB-L | TASK-011 | **合并**：通用性验证与波1 收口同属验证/收口性质，一次 GATE 完成（红线 grep + 零回归 + 冒烟清单） |
| TB-M | TASK-012 | 一一对应 |
| TB-N | TASK-013 | 一一对应 |
| TB-O + TB-P | TASK-014 | **合并**：P1 护栏 + 合规/迁移/调试/Gate-D 文档同属「护栏与文档收口」，文件不相交且均以波1 基座为前提 |
| TB-Q | TASK-015 | 一一对应（**plan 明确标注「可选」**；容量不足可整块顺延，不阻塞核心验收） |
| TB-R | TASK-016 | 一一对应（Gate-D 严格前置） |

**任务数说明**：plan §9 列 22 个 TB 块（含可选 TB-Q）→ 整合为 16 任务；核心必做 15，可选 1。符合「文件所有权 + 依赖拓扑 + 波次门禁」合并原则，未丢失任何 plan 工作项。

### 4.5 ⚠️ plan 未覆盖的依赖/冲突标注（如实记录，不擅自补方案）

| # | 标注 | 处理 |
|---|------|------|
| F-1 | plan §9 称「TB-A/B/G 并行」，但新包 `package.json`/`tsconfig`/`build.mjs`（TB-A）是 TB-B/TB-G 编译与测试的前提 → **存在 plan 未显式标注的软依赖** | 本清单设 TASK-004/007 `dependsOn=[TASK-003]`；并行意图保留于编码层（可并行撰写、串行验证） |
| F-2 | plan §5.3/§6 未显式列出波0 spike 结论文件落点 | TASK-001/002 结论落 Feature 目录 `spike-*.md`（过程产物，非产品交付），已在任务内标注 |
| F-3 | plan §5.4 要求「冒烟清单存在」但 §6 未列清单文件 | TASK-011 产出 `docs/smoke-checklist.md`，已标注 |
| F-4 | plan §6 DELETE 仅列 `ai/AiPanel.tsx 等`，未含 `ai/provider.test.ts`/`ai/session.test.ts`，但 `lgdl-web/package.json` test script 显式引用二者 → **删除 `ai/*` 必致 lgdl-web 测试失败** | TASK-016 涉及文件已补入两个测试文件 + `lgdl-web/package.json` test script 同步，并标注为 plan 遗漏 |
| F-5 | TB-R 内含「Gate-D D-6 回退预案就绪」这一前置条件，而回退预案本身是 TB-R 输出 → **任务内自引用顺序依赖** | TASK-016 验收标准要求「先回退预案 → 再下线」子步骤串行 |
| F-6 | P0（波1）柱4「LGDL 等价」按 plan §5.3 仅含 FR-017/018/020/041/042，**不含 FR-019（UI 操作）**；而 AC-009 描述含「执行图内容/UI 操作」 → P0 最小集**不能完整满足 AC-009** | 如实标注：AC-009 的 UI 操作部分由 P1 TASK-013 补齐；P0 最小集仅满足 AC-009 的图内容/写回部分（与 plan §5.3 裁剪一致，非冲突） |
| F-7 | S-013（O-013 协议中立）、S-016（O-016 发布链路）仍**待作者核签** | TASK-012（FR-015）与 TASK-016（FR-046）承载暂定基线；未核签不阻塞，但验收以核签结果为准 |
| F-8 | ADR-009 devDep `esbuild` + `@types/chrome` **待作者确认**（plan §6 单列） | TASK-003 依赖此二 devDep；若被拒 → plan 备选（手写类型 + tsc 拼装），TASK-003 需相应调整（不属本清单决策） |

---

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建（plan §9 TB-0A~TB-R 22 块 → 16 原子任务 / 9 波次（Wave 0~8）：波0 门槛 TASK-001〔0A+0D〕/002〔0B+0C〕；波1 P0 四柱 TASK-003~011〔TB-B+C→004、TB-E+F→006、TB-K+L→011 合并〕；波2 P1 TASK-012~015〔TB-O+P→014；TB-Q 可选〕；波3 P2 TASK-016〔TB-R，Gate-D 严格前置〕。P0 最小可用必做集 = TASK-001~011。D-001 类整合记录见 §4.4；D-005 测试守恒 + AC-001 每步门禁见 §4.1；plan 未覆盖依赖/冲突 8 项见 §4.5） | 2026-09-11 | SDDU Tasks Agent |
