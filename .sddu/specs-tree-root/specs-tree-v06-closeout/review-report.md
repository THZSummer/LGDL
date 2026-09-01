# 审查报告：specs-tree-v06-closeout（v0.6 收口五件套 F-01~F-05）

> **文档定位**: SDDU 审查报告 — 逐项记录自主审查的执行结果，作为 validate 阶段的输入
> **审查策略**: review.md v1.0（C1~C20 审查清单及四维度指引）
> **前置依赖**: review.md（审查策略）、spec.md v1.0（11 FR/4 NFR/6 EC）、plan.md v1.0（实施设计/决策表）、tasks.md v1.0（7 任务 completed + build 偏差记录）
> **创建人**: SDDU Review Agent
> **创建时间**: 2026-09-01
> **审查轮次**: R1
> **版本**: v1.0
> **更新人**: SDDU Review Agent
> **更新时间**: 2026-09-01
> **更新说明**: 初始创建 — 对 build 后代码（8 文件）按 review.md C1~C20 逐项静态审查；全部结论基于实际代码证据（文件读取 + git diff + grep + PyYAML 复跑），未做动态执行（属 validate 职责）

## 1. 审查概要

| 维度 | 数值 |
|------|:--:|
| 审查项总数 | 20 |
| 通过 | 20 |
| 警告 | 0 |
| 失败 | 0 |
| 阻塞问题 | 0 |

## 2. 逐项审查结果（C1~CN）

| # | 审查对象 | 审查基准 | 评估 | 发现 | 严重程度 |
|---|---------|---------|:--:|------|:--:|
| C1 | deploy-pages.yml paths 触发清单补 lgdl-router | FR-001 / spec.md §5 组1 | ✅ | deploy-pages.yml:11 含 `- 'packages/lgdl-router/**'`（:10 render 之后，paths 顺序不敏感）；git diff 确认系本次新增行 | — |
| C2 | deploy-pages.yml build 命令 router 先于 render | FR-002 / R-005 | ✅ | deploy-pages.yml:41 命令顺序 …lgdl-layout → **lgdl-router** → lgdl-render…（render 之前）；:40 步骤 name 同步补「router」字样（plan 可选低优项已做）；与 lgdl-web predev 顺序（core→layout→router→render）一致 | — |
| C3 | ci.yml 步骤链完整且 build 先于 test | FR-003 / NFR-004 / R-004 | ✅ | ci.yml 存在，单 job `build-and-test` 5 步：checkout@v4→setup-node@v4（node 20, cache npm）→Install dependencies（npm ci --no-audit --no-fund）→Build all packages（依赖序）→Run all package tests；**build 严格先于 test**（R-004 硬约束满足）；PyYAML 复跑解析有效 | — |
| C4 | ci.yml MVP 全量触发 + build 命令单一事实源 | plan.md §3.2 Q-② | ✅ | ci.yml:3-8 触发 = push:main + pull_request，无 paths 过滤，注释（:7-8）说明 Q-② 决策（F-01 paths 漏配教训 + 留 v0.7 收窄）；ci.yml:30 build 命令与 deploy-pages.yml:41 **逐 token 一致**（单一事实源） | — |
| C5 | groupNodeIdx helper 正确性 | FR-004 / Q-③ / D-001 | ✅ | index.ts:440-442 `groupNodeIdx = (doc, group) => doc.nodes.findIndex((n) => n.kind === 'group' && n.id === group.id)` —— 按 id 反查（deriveGroups 新对象无节点引用，Q-③ 决策），kind==='group' 限定防普通节点误匹配，findIndex 返回 -1 语义即「无对应节点」；:435-438 注释明确守卫语义（:427 edgeIdx / :595 initIdx 同款模式 + 合成 _default 泳道说明）；LgdlGroup 类型已导入无需补 import（:471 区域确认） | — |
| C6 | renderer 三处发射改 nodes[i] | FR-004 / NFR-003 / plan.md §3.3.2 | ✅ | git diff 确认三处发射逐一替换：① :562 datastream 泳道 `groups[${i}]`→`nodes[${idx}]`（`const idx = groupNodeIdx(doc, group)`，:560，i 保留用于 laneX/fill）；② :598 分组盒 `groups[${groupIdx}]`→`nodes[${idx}]`（:596，原 :583 `groups.indexOf(group)` 已删除无未用变量，:594-595 注释更新为「ORIGINAL document index (group node's position in doc.nodes)」）；③ :1079 gantt 泳道 `groups[${gi}]`→`nodes[${idx}]`（:1076，gi 保留用于 :1080/1081 laneFills 取色）；三处统一 `idx >= 0` 守卫 | — |
| C7 | renderer 无 groups[ 残留 | NFR-003 | ✅ | 全仓 grep `data-lgdl-loc="groups[`：仅命中 svg.test.ts:193 残留断言的否定字符串与 dist-test 编译产物，源码发射路径零残留 | — |
| C8 | svg.test.ts 断言联动 | FR-005 / R-001 | ✅ | :191 断言 `data-lgdl-loc="nodes[2]"`（fixture :170-172 nodes=[a,b,g1]，g1 第 3 节点索引 2，核算正确）；:193 新增 `!includes('data-lgdl-loc="groups[')` 残留断言；:195 `locs.length >= 4` 保持（nodes[0]/nodes[1]/edges[0]/nodes[2] = 4） | — |
| C9 | locate.test.ts fixture 现代语法化 + 行号逐条核对 | FR-006 / EC-004 / R-006 | ✅ | fixture（:9-35）：顶层 `groups:` 节（旧 :24-26）删除，nodes 节 order 后追加 g1 节点（:18-20 `id: g1`/`kind: group`/`contains: [user, order]`）；新行号表与 plan §3.3.3 完全一致：nodes[0]→5、nodes[1]→15、members[0/1]→9/12、edges[0]→23（旧 20）、nodes[2]→18、contains[0/1]→'user'/'order'（行 20 内联列表）、line 2→2、nodes[9]→null 保持（:117）；:99-106 新增 parseLgdl 可解析断言（valid=true + g1.kind='group' + contains deepEqual）——FR-006「fixture 可解析」验收直接落地；locate.ts **零改动**（git status 确认） | — |
| C10 | EC-001 合成泳道守卫 + EC-002 嵌套分组语义 | EC-001 / EC-002 | ✅ | EC-001：datastream 合成 `_default` 泳道仅进 boxOf 计算（:475 lanes 回退），发射循环为 `groups.forEach`（:555）不含合成项，且 :560 idx=groupNodeIdx 对 `_default` 返回 -1 → :562 守卫不发 loc（双保险，与 :427 同模式）；EC-002：分组盒 :590 `orderedGroups` 分层绘制（内层在上），:596 在 forEach 内对**每个 box 计算自身 group 的 idx** → 内层 box 点击跳内层 group 节点行，保留现状行为 | — |
| C11 | buildTools() 提取正确性 + 与旧 Claude 分支等价 | FR-008 / Q-① / NG-005 | ✅ | provider.ts:245-263 `buildTools()` 导出，三工具顺序 WEB_CLI→WEB_OP→**WEB_FETCH**（fetch 末尾，与旧 Claude 分支一致，tool_choice 优先序不变）；git diff 逐字段比对：新 buildTools 三项内容与旧 isClaude 分支三工具 name/description/parameters **逐字段一致**（行为等价）；chat() 内仅一处 `buildTools()` 调用（:274），无双份组装漂移 | — |
| C12 | chat() 简化 + isClaude 删除 + 签名不变 | FR-008 / FR-009 / NG-005 / R-008 | ✅ | diff 确认三元分支整体替换为 `const tools = buildTools()`；isClaude 变量已删除（grep 无残留，R-008 排除）；:272-273 注释更新为「三工具统一组装（F-04…）」；chat(settings, turns) 签名不变 → AiPanel.tsx:390 调用点零改动（NG-005 边界内小重构） | — |
| C13 | provider.test.ts 2 用例有效性 | FR-008 / R-007 | ✅ | :189-196 用例 1：`deepEqual(tools.map(t=>t.name), ['lgdl-web-cli','lgdl-web-op-cli','web-fetch'])`（强断言）+ description/parameters 存在性断言；:198-203 用例 2：`nonClaude.length === 7` + 逐 provider baseURL 断言（覆盖 openai/deepseek/qwen/tencent/volc/volc-coding/volc-plan）；工具集一致性由 chat() 统一走 buildTools() 的结构保证（注释标注审查点，合理）；现有 12 用例零改动（git diff 确认仅追加） | — |
| C14 | jumpToIssue 返回 boolean 语义 | FR-010 / plan.md §3.5 | ✅ | App.tsx:929-940：签名 `(location: string \| undefined): boolean`；三处失败路径全部 return false（:931 editor 空/location 缺失、:933 span null）+ 成功路径 dispatch+scrollIntoView+focus 后 return true（:934-939）；注释（:927-928）说明「no more fake success」 | — |
| C15 | preview-click 三态反馈 | FR-011 / EC-006 | ✅ | App.tsx:1012-1018：loc 缺失 →「✖ preview-click 需要 loc 参数（如 nodes[3]）」（原文案保留）；`const ok = jumpToIssue(loc)` 后成功 →「✓ 已定位到 ${loc}（编辑器已跳转）」/ 失败 →「✖ 未定位到 ${loc}（locate 失败）」（与 preview-hover 失败分支 :1028「✖ 未找到元素」风格一致）；EC-006（groups[i] 现代语法 → locate null → 真实失败反馈）由该路径覆盖 | — |
| C16 | preview-hover 文案 + App.tsx:467 注释清理 | EC-003 | ✅ | :1028 失败文案「（试试 nodes[3] / edges[1]）」——`groups[0]` 已去除（git diff 确认）；:467-468 handleClick 注释示例「"nodes[3]", "edges[1]", "nodes[0].members[2]"...」——无 groups[0] 残留（build 偏差③已处理）；全文件 grep `groups\[0\]` 零命中 | — |
| C17 | 调用点兼容 | FR-010 / NFR-002 | ✅ | :1218/:1222 `onLocate={jumpToIssue}`：ZoomableSvg onLocate prop 类型 `(loc: string) => void`（:302），jumpToIssue `(string \| undefined) => boolean` 赋给 void 返回位——TS 允许（参数逆变兼容 + void 位置返回值忽略），build 摘要 vite build 通过佐证；:1265 issue 列表 onClick 忽略返回值（`onClick={() => jumpToIssue(issue.location)}`）；三调用点零改动（git diff 确认） | — |
| C18 | 零新功能审查 | NG-001 / NG-004 | ✅ | git status：7 个 MODIFY（deploy-pages.yml / lgdl-render/index.ts / svg.test.ts / App.tsx / provider.test.ts / provider.ts / locate.test.ts）+ 1 个 NEW（ci.yml）+ feature 目录——与 plan.md 各节「改动文件」集合**完全一致**，无多余文件；lgdl-core/parser/types/groups（语言核心）零改动（NG-004 满足）；diff 总量 113+/63- 均为缺陷修复与测试联动 | — |
| C19 | 测试守恒 423 ≥ 420 | NFR-001 / S4 | ✅ | 测试文件 test() 计数：locate.test.ts 11（旧 10，+1 新增 parser 断言用例）、provider.test.ts 14（旧 12，+2 buildTools 用例）、svg.test.ts 7（断言 1 改 1 增，用例数不变）；总数 +3 = 423 ≥ 420（NFR-001 不降反升）；build 摘要 TASK-007 回归门禁「423 全绿 exit=0 + root build 0 TS 错误」与计数自洽 | — |
| C20 | build 4 项偏差复核 | tasks.md build 摘要 / plan.md | ✅ | ① **buildTools 返回类型**：实际 `parameters: Record<string, unknown>`（provider.ts:245）vs plan 的 `unknown`——与 LlmToolDef 定义（web-cli-base/src/llm.ts:54 `parameters: Record<string, unknown>`）精确匹配，类型更精确行为等价，修正正确；② **ci.yml 步骤数**：实际 5 步 vs plan/tasks 声称 6 步——NFR-004「步骤数 ≥5 且无逐包嵌套循环」仍满足（PyYAML 复跑确认 5 步），属文档计数偏差非功能缺陷；③ **App.tsx:467 注释清理**：已确认无 groups[0]（C16 复核）；④ **actionlint→PyYAML**：本环境 actionlint 不可用，build 改用 PyYAML 校验——复跑 `yaml.safe_load` 两 workflow 均解析有效（ci.yml jobs=['build-and-test'] 5 步；deploy-pages.yml jobs=['build','deploy'] build 6 步），校验有效 | — |

## 3. 审查维度汇总

| 审查维度 | 审查项数 | 通过 | 警告 | 失败 | 通过率 |
|---------|:--:|:--:|:--:|:--:|:--:|
| 代码质量 | 4（C5/C11/C14/C18） | 4 | 0 | 0 | 100% |
| 规范符合性 | 11（C1~C4/C6~C9/C12/C15/C16） | 11 | 0 | 0 | 100% |
| 架构一致性 | 4（C10/C13/C17/C20） | 4 | 0 | 0 | 100% |
| 测试质量 | 4（C8/C9/C13/C19） | 4 | 0 | 0 | 100% |
| **合计** | **20** | **20** | **0** | **0** | **100%** |

## 4. 阻塞问题

无（0 项）。

## 5. 改进建议

| # | 位置 | 问题 | 对应 Cx | 建议 |
|---|------|------|:--:|------|
| 1 | tasks.md TASK-002 名称「单 job 六步」+ tasks.json acceptance「步骤链 6 步」 | 文档计数与实际实现（ci.yml 5 步）不一致——build 偏差②已记录但 tasks 文档文本未同步更新 | C20 | 低优：tasks.md 名称与 tasks.json 验收描述改为「五步」，与实现和 NFR-004（≥5）口径对齐 |
| 2 | .github/workflows/ci.yml | CI 无 workflow 语义自检：build 阶段以 PyYAML 兜底校验仅覆盖 YAML 有效性，GitHub Actions 语义（actions 版本/缓存路径等）错误只能在 CI 运行时暴露 | C20 | 低优：可选在 ci.yml 增加 `npx --yes actionlint` 步骤（或后续安装后纳入），把校验固化进 CI 而非一次性手工执行 |

## 6. 结论

**结论**: ✅ 通过

| 指标 | 结果 |
|------|------|
| 审查通过率 | 100%（20/20） |
| 阻塞问题数 | 0 |
| 规范符合性偏差 | 0 项（build 4 项偏差复核全部成立且处理正确：①返回类型修正更精确 ②5 步满足 NFR ③注释清理完成 ④PyYAML 校验有效） |
| 可进入 validate | 是 |

**理由**: 20 项审查全部 PASS，无阻塞问题，改进项 2 条（均为低优文档口径/工具链增强，不阻塞验证）。规范符合率 100%：F-01~F-05 的 11 个 FR 均有对应实现且验收标准满足（router 构建就位且顺序正确、ci.yml 五步 build→test 硬约束、renderer 三处发射改 nodes[i] 且无残留、buildTools 三工具同构与旧 Claude 分支逐字段等价、jumpToIssue boolean + preview-click 三态反馈）；4 个 NFR 满足（423 ≥ 420 测试守恒、接口零破坏、loc 语义可信、CI 效率）；6 个 EC 覆盖（合成泳道不发 loc、嵌套分组语义保留、hover 文案清理、fixture 行号逐条核对、空测试包容忍、groups[i] 真实失败反馈）。零新功能（改动文件与 plan 完全一致）。可进入 validate 阶段动手验证（FR-007 端到端点击定位、FR-009 端点 tools 实测、F-05 交互三态、F-02 CI 首跑）。

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建（R1）— 按 review.md C1~C20 逐项执行静态审查：20/20 PASS，0 阻塞，2 改进（tasks 文档计数口径 / CI actionlint 可选增强）；build 4 项偏差复核全部成立；结论 ✅ 通过 | 2026-09-01 | SDDU Review Agent |
