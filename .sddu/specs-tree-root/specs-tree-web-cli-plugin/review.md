# 审查策略：specs-tree-web-cli-plugin（web-cli-plugin，v0.8 · P0 最小可用集）

> **文档定位**: SDDU 审查策略 — 指导 review Agent 执行自主审查的清单和方法；审查结果见 `review-report.md`
> **前置依赖**: `spec.md`（46 FR / 10 NFR / 16 EC / 12 AC）、`plan.md`（12 ADR + 架构 + 文件影响）、`tasks.md`（16 任务 + §4.5 F-1~F-8）、`build.md`（D-001~D-008 + 门禁）
> **创建人**: SDDU Review Agent
> **创建时间**: 2026-09-11
> **版本**: v1.0
> **更新人**: SDDU Review Agent
> **更新时间**: 2026-09-11
> **更新说明**: 初始创建（P0 审查策略）。审查范围 = P0 最小可用集 TASK-001~011 的产物；P1/P2（TASK-012~016）不在本轮，仅作范围标注。

## 1. 审查概要

| 维度 | 数值 |
|------|:--:|
| 审查范围 | P0 最小可用集（TASK-001~011）：`packages/web-cli-plugin/**`（新包 47 文件）+ `packages/lgdl-web/src/web-cli-host/**` + `public/.well-known/web-cli.json` + `index.html` + `src/App.tsx` 挂载 + devDep/package-lock |
| 审查文件数 | 源码 31 + 测试 8 + 文档/声明 7 + 工程配置 4 + LGDL 暴露点 4 ≈ 54 个（不含 dist/、dist-test/） |
| 通过项 | 见 review-report.md |
| 改进建议 | 见 review-report.md |
| 阻塞问题 | 见 review-report.md |

## 2. 自主审查清单（C1~C56）

**审查对象来源**：
- `spec.md`：P0 覆盖的 FR/NFR/EC/AC → 逐项核验实现完整性与正确性
- `plan.md`：ADR-001~012 + §2 架构 + §6 文件影响 → 架构遵循性
- `tasks.md`：P0 任务验收锚点 + §4.5 F-1~F-8 → 缺陷处理
- `build.md`：D-001~D-008 + 门禁声明 + 遗留 → 声明核实（含独立复跑）
- `packages/web-cli-plugin/**` + `packages/lgdl-web/src/web-cli-host/**` → 代码质量 / 安全基线 / 测试质量

**四维度指引**：① 代码质量；② 规范符合性；③ 架构一致性；④ 测试质量。

**方法**：静态代码走查（Read/Grep）+ 独立复跑门禁（build / test / 红线 grep / chromium headless 加载 + CDP 探针 / G-KEY 端点可达性）。

### 2.1 代码质量（CQ）

| # | 审查对象 | 审查基准 | 审查维度 | 审查方法 |
|---|---------|---------|---------|---------|
| C1 | 模块职责单一 / 命名可读 | §5.1 | 代码质量 | 走查全部 src 模块 |
| C2 | 错误处理：无空 catch / 无静默吞错 / 失败可读 | NFR-001、FR-008 | 代码质量 | grep `catch(...){}` + 走查 discovery/rpc/confirm |
| C3 | 常量集中（无魔法值） | §5.1 | 代码质量 | 走查常量定义 |
| C4 | 无死代码 / 冗余逻辑 | §5.1 | 代码质量 | grep 模块引用面（unsupported/extensionEnv/maxRounds 等） |

### 2.2 规范符合性（SPEC）

| # | 审查对象 | 审查基准 | 审查维度 | 审查方法 |
|---|---------|---------|---------|---------|
| C5 | 上游基线 v0.7.0 引用 | FR-001 | 规范符合性 | package.json + 本地包版本核对 |
| C6 | additive 复用 / 零分叉 | FR-002、NFR-005 | 规范符合性 | grep 源码副本 + base 测试零回归 |
| C7 | 独立包 / 零 LGDL 私有依赖 | FR-003、NFR-009 | 规范符合性 | 依赖图谱 grep |
| C8 | 对象区分（下线/保留）+ 双份工具面冲突检测 | FR-004、EC-012 | 规范符合性 | 走查 spec §9.4 + e2e 冲突用例 |
| C9 | 插件载体可加载运行 | FR-005 | 规范符合性 | headless 加载 + dist 产物 |
| C10 | 权限最小化 + 站点访问按需/运行时授权 | FR-006、NFR-002 | 规范符合性 | manifest 断言 + grep permissions.request |
| C11 | content script 隔离无侵入 | FR-007 | 规范符合性 | grep window 全局 + isolated world |
| C12 | CSP/跨域不可达如实转译 | FR-008、EC-007 | 规范符合性 | 走查 unsupported.ts 接线 + 失败文案 |
| C13 | MV3 平台约束最小验证门 | FR-009 | 规范符合性 | 复跑 headless + CDP SW 探针 |
| C14 | 站点可被发现三态 | FR-010、EC-001 | 规范符合性 | discovery 单测 + 走查 |
| C15 | 站点可声明工具面最小语义 | FR-011 | 规范符合性 | descriptor schema + declared-tools |
| C16 | 默认 untrusted + 完整性/溯源 | FR-012、EC-002 | 规范符合性 | trust.ts + 单测 |
| C17 | 协议版本演进兼容 | FR-013、EC-014 | 规范符合性 | version.ts + 单测 |
| C18 | 发现/声明失败降级（≥3 场景可读） | FR-014 | 规范符合性 | discovery 单测 |
| C19 | 最小试点（≥2 站点，含 1 非 LGDL） | FR-016、AC-003 | 规范符合性 | spike-protocol-pilot + fixture |
| C20 | 会话/多轮/工具调用/ask 对齐 | FR-017 | 规范符合性 | 走查 runChat 会话状态 + ask 缝 |
| C21 | LGDL 图内容操作对齐 | FR-018 | 规范符合性 | host-router + RPC |
| C22 | 编辑器写回 onApply 替代 | FR-020 | 规范符合性 | bridge parseLgdl + onApply |
| C23 | 能力对照矩阵 + 最小能力集 | FR-022 | 规范符合性 | capability-matrix.md |
| C24 | per-origin 显式授权 | FR-023、EC-004 | 规范符合性 | origin-store + policy S1 |
| C25 | 敏感操作二次确认 | FR-024、EC-005 | 规范符合性 | confirm.ts + policy S2 |
| C26 | 全程可审计 | FR-025、NFR-003 | 规范符合性 | 走查各环节 audit 触发点 |
| C27 | 只读默认 / 写面确认 | FR-026 | 规范符合性 | riskDefaults |
| C28 | untrusted + 危险档位强制确认 + fail-closed | FR-027、O-010 | 规范符合性 | effectiveRisk 来源 + S2/S3 |
| C29 | 敏感数据脱敏不外泄 | FR-028、EC-015 | 规范符合性 | redact + audit sanitize |
| C30 | 站点条款合规评估先行 | FR-030、AC-006 | 规范符合性 | compliance.md |
| C31 | 插件独立配置 key | FR-033 | 规范符合性 | key-store + options |
| C32 | key 安全隔离 | FR-035 | 规范符合性 | 存储载体 + 页面不可读 |
| C33 | 作用于 LGDL Web 页 | FR-041 | 规范符合性 | index.html link + declaration + bridge |
| C34 | LGDL 功能等价替代 | FR-042 | 规范符合性 | 矩阵差异 + 等价用例 |
| C35 | 通用性验证（不依赖 LGDL 私有接口） | FR-043、AC-010 | 规范符合性 | e2e.generality + 试点记录 |
| C36 | 安全基线（无旁路 / 无静默 allow / 明文零命中） | NFR-001 | 规范符合性 | grep + 走查放行路径 |
| C37 | 权限最小/审计完整/平台兼容 | NFR-002/003/004 | 规范符合性 | manifest + audit + MV3 门 |
| C38 | 上游零回归 / 独立性 | NFR-005/009 | 规范符合性 | 复跑 base/lgdl-web 测试 + 依赖 grep |
| C39 | 可测试性 / 可用性可理解性 | NFR-006/008 | 规范符合性 | 单测面 + 文案走查 |
| C40 | Gate-D 条件清单（spec 标 P0） | FR-037/038 | 规范符合性 | 产物存在性 + 波次一致性 |

### 2.3 架构一致性（ARCH）

| # | 审查对象 | 审查基准 | 审查维度 | 审查方法 |
|---|---------|---------|---------|---------|
| C41 | 协议机制（描述符 + 双通道发现 + RPC） | ADR-001、plan §2.3 | 架构一致性 | 走查 protocol/discovery |
| C42 | MV3 三面职责边界（background 控制面 / content 数据面 / side panel） | ADR-002、plan §2.4 | 架构一致性 | 走查三面 + 裁决/key 归属 |
| C43 | 权限模型 = 三 PolicyStrategy 映射上游 PermissionGate | ADR-003、plan §2.5 | 架构一致性 | 走查 policy.ts + 注入点 |
| C44 | 与页内 web-cli-base 桥接 + 对象区分 | ADR-004、plan §2.6 | 架构一致性 | 走查 web-cli-host + App.tsx |
| C45 | 扩展存储 = local + session；key 不进页面 | ADR-005、plan §2.7 | 架构一致性 | 走查 extension-env/key-store |
| C46 | 独立包与构建/依赖纪律 | ADR-009、plan §6 | 架构一致性 | package.json + build.mjs |
| C47 | 单标签绑定与会话生命周期 | ADR-012、EC-011/013 | 架构一致性 | controller + service-worker |
| C48 | 文件影响面对齐（无遗漏/无越界） | plan §6 | 架构一致性 | 产物清单比对 |
| C49 | web-cli-base 零改动红线 | NFR-005 | 架构一致性 | git status + grep |
| C50 | plan/tasks 缺陷处理（D-001~D-008 / F-1~F-8） | build §6/§7、tasks §4.5 | 架构一致性 | 逐条核对处理合理性 |

### 2.4 测试质量（TEST）

| # | 审查对象 | 审查基准 | 审查维度 | 审查方法 |
|---|---------|---------|---------|---------|
| C51 | 测试文件存在 + 规模（54 用例） | NFR-006 | 测试质量 | 文件清单 + 复跑 |
| C52 | 核心逻辑路径覆盖 | §5.4 | 测试质量 | 走查 8 个测试文件 |
| C53 | 边界条件 + 错误场景覆盖 | EC-* | 测试质量 | 走查 timeout/invalid/deny/fail-closed |
| C54 | 断言有效性（非空跑 / 负向断言） | §5.4 | 测试质量 | 走查断言强度 |
| C55 | 上游测试守恒（base 483 / lgdl-web 66 零删除零降级） | tasks §4.1 D-005 | 测试质量 | 复跑 + git diff 测试文件 |
| C56 | 新增 LGDL web-cli-host 测试覆盖 | TASK-010 验收 | 测试质量 | 测试引用面 grep |

> **质量门槛（数量基线法）**：C1~C56 共 56 条 ≥ 46 FR（满足「每 FR ≥ 1 个 Cx」）；四维度各 ≥ 4 条（满足「每维度 ≥ 1 条」）。无法审查项将显式标注「不适用」并说明原因（见 review-report.md）。

## 3. 审查详情

> 详见 `review-report.md`（逐项评估 + 证据 + 阻塞/改进判定）。

## 4. 改进建议

> 详见 `review-report.md` §5。

## 5. 阻塞问题

> 详见 `review-report.md` §4。

## 6. 结论

> 详见 `review-report.md` §6。

## 7. 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建：P0 审查策略（C1~C56，覆盖代码质量/规范符合性/架构一致性/测试质量四维度；含独立复跑门禁方法） | 2026-09-11 | SDDU Review Agent |
