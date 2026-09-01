# 审查报告：specs-tree-v06-closeout（v0.6 收口五件套 F-01~F-05）

> **文档定位**: SDDU 审查策略 — 指导 review Agent 执行自主审查的清单和方法；审查结果见 review-report.md
> **前置依赖**: spec.md v1.0（11 FR / 4 NFR / 6 EC / D-001）、plan.md v1.0（实施设计 / 决策表 / 风险矩阵）、tasks.md v1.0（7 任务全部 completed + build 偏差记录）
> **创建人**: SDDU Review Agent
> **创建时间**: 2026-09-01
> **版本**: v1.0
> **更新人**: SDDU Review Agent
> **更新时间**: 2026-09-01
> **更新说明**: 初始创建 — 轻量 review 策略：从 spec 11 FR + plan 实施设计 + build 4 项偏差中自主提取 20 项审查清单（C1~C20），四维度全覆盖；build 已完成，策略与报告同批产出

## 1. 审查概要

| 维度 | 数值 |
|------|:--:|
| 审查文件数 | 8 个（deploy-pages.yml、ci.yml、lgdl-render/src/index.ts、svg.test.ts、locate.test.ts、provider.ts、provider.test.ts、App.tsx） |
| 通过项 | 20（C1~C20，规划值；实际执行见 review-report.md） |
| 改进建议 | 2（规划值） |
| 阻塞问题 | 0（规划值） |

## 2. 自主审查清单（C1~CN）

**审查对象来源**：
- `spec.md`：11 个 FR（F-01×2 / F-02×1 / F-03×4 / F-04×2 / F-05×2）+ 4 个 NFR（回归守恒 / 接口零破坏 / loc 语义可信 / CI 效率）+ 6 个 EC（合成泳道 / 嵌套分组 / hover 文案 / fixture 行号 / 空测试包 / groups[i] 假成功）
- `plan.md`：3 项开放问题决策（Q-① buildTools 提取 + 单测 / Q-② CI 全量触发 / Q-③ 按 id findIndex）+ 文件影响分析 + 风险矩阵 R-001~R-009
- `tasks.md`：7 任务验收标准 + build 执行摘要的 4 项偏差记录
- 修复后代码：8 个文件（git diff HEAD 验证改动范围）

**四维度指引**（清单覆盖 4 个维度，每个 FR ≥ 1 条 Cx，每维度 ≥ 1 条）：
1. **代码质量** — 可读性、职责单一性、错误处理、无冗余/无硬编码
2. **规范符合性** — 对照 spec.md 逐 FR/NFR/EC 核验
3. **架构一致性** — 对照 plan.md 决策表、文件影响分析与 build 偏差记录
4. **测试质量** — 覆盖率、边界条件、错误场景、断言有效性

| # | 审查对象 | 审查基准 | 审查维度 | 审查方法 |
|---|---------|---------|---------|---------|
| C1 | deploy-pages.yml paths 触发清单补 lgdl-router | FR-001 / spec.md §5 组1 | 规范符合性 | 文件读取 + 逐条目核对 |
| C2 | deploy-pages.yml build 命令 router 位于 render 之前（顺序硬约束） | FR-002 / plan.md §3.1（R-005） | 规范符合性 | 文件读取 + workspace 顺序核对 + 与 lgdl-web predev 对照 |
| C3 | ci.yml 存在且步骤链完整：checkout→setup-node→npm ci→build→test，build 先于 test | FR-003 / NFR-004（R-004 硬约束） | 规范符合性 | 文件读取 + 步骤序核对 + PyYAML 解析校验 |
| C4 | ci.yml MVP 全量触发（push main + pull_request，无 paths 过滤）+ build 命令与 deploy-pages.yml 一致 | plan.md §3.2 Q-② 决策 / 单一事实源 | 规范符合性 | 文件读取 + 两 workflow build 命令 diff 对照 |
| C5 | groupNodeIdx helper 正确性：按 id findIndex（deriveGroups 新对象无节点引用），kind==='group' 限定，注释含守卫语义 | FR-004 / plan.md §3.3.2（Q-③）/ D-001 | 代码质量 | 代码走查 + 与 :595 initIdx 同款模式对照 |
| C6 | renderer 三处发射改 nodes[i]：datastream 泳道 / 分组盒 / gantt 泳道，idx 为 doc.nodes 文档序索引，统一 idx>=0 守卫 | FR-004 / NFR-003 / plan.md §3.3.2 | 规范符合性 | git diff 验证发射点改动 + 上下文走查（i/gi 保留用途、groupIdx 删除） |
| C7 | renderer 输出无 `data-lgdl-loc="groups[` 残留 | NFR-003 / plan.md §3.3.4 | 规范符合性 | 全仓 grep `data-lgdl-loc="groups[` |
| C8 | svg.test.ts 断言联动：:190 `groups[0]`→`nodes[2]` + 残留断言 + `locs.length >= 4` 保持 | FR-005 / plan.md §3.3.4（R-001） | 测试质量 | 测试文件读取 + fixture 节点索引核算（g1 第 3 节点 = 索引 2） |
| C9 | locate.test.ts fixture 现代语法化：顶层 `groups:` 节删除、nodes 追加 g1 kind:group、行号逐条核对（R-006）、parseLgdl 可解析断言 | FR-006 / EC-004 / plan.md §3.3.3 | 测试质量 | 测试文件读取 + 新 fixture 行号表逐条核算 + 断言 lineSpan 对照 |
| C10 | EC-001 守卫（合成 `_default` 泳道 findIndex=-1 不发 loc）+ EC-002 嵌套分组语义保留（每 box 发射自身 group 索引） | EC-001 / EC-002 / FR-004 | 架构一致性 | 代码走查 datastream lanes 合成路径 + 分组盒 orderedGroups 循环 |
| C11 | buildTools() 提取正确性：三工具同构（WEB_CLI→WEB_OP→WEB_FETCH，fetch 末尾），与旧 Claude 分支逐字段等价 | FR-008 / plan.md §3.4.1（Q-①）/ NG-005 | 代码质量 | git diff 新旧组装逐字段比对 + 工具顺序核对 |
| C12 | chat() 简化正确性：单一 buildTools() 调用点、isClaude 删除、注释更新、chat 签名不变（AiPanel 零改动） | FR-008 / FR-009 / NG-005 / plan.md §3.4.1（R-008） | 规范符合性 | 代码走查 + grep isClaude 无残留 + chat 签名核对 |
| C13 | provider.test.ts 2 用例有效性：三工具稳定顺序 + 7 个非 claude provider 均 baseURL 型；断言强度（非弱断言） | FR-008 / plan.md §3.4.1（R-007） | 测试质量 | 测试文件读取 + 断言有效性评估 |
| C14 | jumpToIssue 返回 boolean 语义：三处静默失败 return false / 成功 dispatch+scrollIntoView+focus return true | FR-010 / plan.md §3.5 | 规范符合性 | 代码走查 + 三态分支逐条核对 |
| C15 | preview-click 三态反馈：loc 缺失→参数文案 / locate 失败→✖ 未定位 / 成功→✓ 已定位 | FR-011 / EC-006 / plan.md §3.5 | 规范符合性 | 代码走查 + 文案对照 preview-hover 失败分支风格 |
| C16 | preview-hover 失败文案去 groups[0] + App.tsx:467 注释清理（EC-003 连带项） | EC-003 / plan.md §3.5 | 规范符合性 | grep `groups\[0\]` 于 App.tsx + 注释走查 |
| C17 | 调用点兼容：onLocate prop（:1214/:1218）类型兼容、issue 列表 onClick（:1261）忽略返回值 | FR-010 / NFR-002 / plan.md §3.5 | 架构一致性 | 类型走查（onLocate 定义 vs jumpToIssue 签名）+ 调用点读取 |
| C18 | 零新功能审查：改动文件集合与 plan 文件影响分析完全一致，无多余/遗漏文件 | NG-001 / NG-004 / plan.md §3.x 改动文件 | 代码质量 | git status + git diff --stat 与 plan 对照 |
| C19 | 测试守恒：全仓测试 423 ≥ 420 基线不降（locate +1、provider +2），svg/locate/provider 新增断言覆盖修复 | NFR-001 / plan.md §3.3.1 S4 | 测试质量 | 测试文件 test() 计数 + build 摘要回归证据核对 |
| C20 | build 4 项偏差复核：① buildTools 返回类型 unknown→Record<string, unknown>（与 LlmToolDef 匹配）；② ci.yml 5 步 vs plan 6 步（NFR-004 ≥5 仍满足）；③ App.tsx:467 注释清理；④ actionlint→PyYAML 校验有效性 | tasks.md build 执行摘要 / plan.md 偏差 | 架构一致性 | 类型定义核对（llm.ts）+ 步骤计数 + 注释走查 + PyYAML 复跑 |

> **质量门槛（数量基线法）**：11 个 FR 每个 ≥ 1 条 Cx（C1/C2→F-01，C3/C4→F-02，C5~C10→F-03，C11~C13→F-04，C14~C17→F-05）✓；4 个审查维度每条 ≥ 1 条（代码质量 C5/C11/C14/C18、规范符合性 C1~C4/C6~C9/C12/C15/C16、架构一致性 C10/C13/C17/C20、测试质量 C8/C9/C13/C19）✓；Cx 总数 20 ≥ max(11, 4) ✓。清单合格。

## 3. 审查详情

> 审查执行详情见 **review-report.md**（ADR-004：策略与报告分离；本文件仅定义策略，报告为独立产物）。

## 4. 改进建议

> 见 review-report.md §5（执行后填写）。

## 5. 阻塞问题

> 见 review-report.md §4（执行后填写）。

## 6. 结论

**结论**: 待报告产出后判定（策略规划：预计 ✅ 通过 — 无阻塞、改进 <5、规范符合率 100%）

## 7. 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建 — 自主审查清单 C1~C20（20 项）：四维度全覆盖、每 FR ≥ 1 条、build 4 项偏差复核项入清单；策略与报告同批产出（build 已完成，用户授权一并执行） | 2026-09-01 | SDDU Review Agent |
