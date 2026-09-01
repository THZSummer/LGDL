# 验证策略：specs-tree-v06-closeout（v0.6 收口五件套 F-01~F-05）

> **文档定位**: SDDU 验证策略 — 指导 validate Agent 执行自主验证的场景和方法；验证结果见 validate-report.md
> **前置依赖**: spec.md v1.0（11 FR / 4 NFR / 6 EC / D-001）、review-report.md v1.0（R1，20/20 PASS，0 阻塞，2 改进）
> **创建人**: SDDU Validate Agent
> **创建时间**: 2026-09-01
> **版本**: v1.0
> **更新人**: SDDU Validate Agent
> **更新时间**: 2026-09-01
> **更新说明**: 初始创建 — 从 spec 11 FR + 4 NFR + 6 EC + review C1~C20 结论 + build 产物中自主提取 V1~V19 验证场景，五维度全覆盖；build 已完成，策略与报告同批产出（用户授权一并执行）

## 1. 验证概要
> 验证结果的量化总览（规划值，实际执行见 validate-report.md）

| 维度 | 规划数据 | 达标？ |
|------|---------|:--:|
| FR 测试覆盖 | 100%（11/11） | ✅ |
| NFR 测试覆盖 | 100%（4/4） | ✅ |
| 构建 | 退出码 0（规划） | ✅ |
| 接口一致性 | 动态实测（buildTools / render→locate） | ✅ |
| 漂移项 | 0 项（规划） | ✅ |
| 阻塞问题 | 0 项（规划） | ✅ |

## 2. 自主验证场景（V1~VN）

**验证对象来源**：
- `spec.md`：11 个 FR（F-01×2 / F-02×1 / F-03×4 / F-04×2 / F-05×2）+ 4 个 NFR + 6 个 EC → 逐项验证实现完整性与验收标准
- `review-report.md`：C1~C20 结论（静态已 PASS）→ validate 聚焦 review 标注的动态可验证项（FR-007 端到端 / FR-009 端点 tools 实测 / F-05 交互三态 / F-02 CI 首跑本地等价）+ 2 项改进跟踪
- 修复后代码：8 文件（deploy-pages.yml / ci.yml / lgdl-render index.ts / svg.test.ts / locate.test.ts / provider.ts / provider.test.ts / App.tsx）

**Feature 类型自适应**：代码类 Feature（缺陷修复 + 测试联动 + CI 配置）→ 全五维度验证（测试覆盖 + 接口数据 + 构建脚本 + 性能边界 + 漂移检测）。

| # | 验证对象 | 验证步骤 | 预期结果 | 验证维度 | 验证方法 |
|---|---------|---------|---------|---------|---------|
| V1 | F-01 paths 触发清单（FR-001） | ① 读 deploy-pages.yml paths 区块；② 逐条目核对 | paths 含 `packages/lgdl-router/**` 条目 | 规范符合性 | 文件读取 + grep |
| V2 | F-01 build 命令顺序 + 干净依赖跑通（FR-002 / R-005） | ① 核对 workspace 顺序（router 在 render 前）；② `npm ci` 后按 deploy-pages.yml build 命令原样执行 | 顺序 …layout→router→render…；干净依赖下构建 exit 0，render 无 TS2307 | 构建脚本 + 规范符合性 | npm ci + 本地同命令 |
| V3 | F-02 ci.yml 语法/结构（FR-003 / NFR-004） | ① PyYAML 解析两 workflow；② 步骤链走查（checkout→setup-node→npm ci→build→test）；③ 确认 build 先于 test | YAML 解析有效；ci.yml 步骤数 ≥5；build 严格先于 test（R-004） | 构建脚本 + 规范符合性 | PyYAML + 逻辑走查 |
| V4 | F-02 触发范围 + build 命令单一事实源（plan Q-②） | ① 走查 ci.yml 触发配置；② diff 两 workflow build 命令 | push:main + pull_request 全量触发（无 paths 过滤）；build 命令与 deploy-pages.yml 逐 token 一致 | 规范符合性 + 漂移检测 | 文件走查 + diff |
| V5 | F-03 renderer 三处发射 nodes[i]（FR-004） | ① 代码走查 groupNodeIdx（按 id findIndex）；② 动态脚本渲染 3 种模式（datastream/flowchart/gantt），提取发射 loc | 三处发射均为 `nodes[i]`（i=group 文档序索引），统一 idx>=0 守卫，无 `groups[` 发射 | 接口数据 + 代码质量 | 代码走查 + 动态脚本 |
| V6 | F-03 无 groups[ 残留（NFR-003） | ① 全仓 grep `data-lgdl-loc="groups[`；② 端到端脚本渲染输出扫描 | 源码发射路径零残留（仅测试残留断言的否定字符串） | 漂移检测 | grep + 动态脚本 |
| V7 | F-03 svg.test.ts 断言联动（FR-005） | ① 读取断言（nodes[2] / 残留断言 / locs>=4）；② 运行 render 包测试 | 断言正确（g1 索引 2）；render 21 测试全绿 | 测试覆盖 | 读取 + npm test |
| V8 | F-03 locate.test.ts fixture 现代语法化（FR-006 / EC-004） | ① 走查 fixture（g1 kind:group 节点 + 行号表）；② 运行 web 包测试；③ parseLgdl 可解析断言 | fixture 现代语法；nodes[2] 定位第 18 行（g1 定义行）；locate 侧测试全绿 | 测试覆盖 | 读取 + npm test |
| V9 | F-03 端到端 render→locate 链路（FR-007） | ① 编写脚本 parseLgdl→layoutDocument→renderSvg；② 提取全部 data-lgdl-loc；③ 逐 loc 调 locateIssue；④ 反向验证 groups[0]/nodes[99] 返回 null | 4 个发射 loc 全部解析非 null；旧语法/越界 loc 返回 null（EC-006） | 接口数据 | 自定义验证脚本 |
| V10 | F-04 buildTools 三工具齐备（FR-008） | ① 动态调用 buildTools()；② 断言三工具名称/顺序/schema | 3 工具 = [lgdl-web-cli, lgdl-web-op-cli, web-fetch]，fetch 末尾，schema 完整 | 接口数据 | 自定义验证脚本 |
| V11 | F-04 7 个 OpenAI 兼容 provider 共享 + 回归（FR-008/FR-009 / R-003） | ① 走查 chat() 单一组装点（无 isClaude 分支）；② 运行 provider.test.ts +2 用例；③ 运行 web-cli-base 测试 | chat() 对所有 provider 统一走 buildTools()；7 个非 claude provider 全部获得三工具；llm 分发测试全绿 | 测试覆盖 + 接口数据 | 代码走查 + npm test |
| V12 | F-05 jumpToIssue 返回 boolean（FR-010 / NFR-002） | ① 代码走查签名与三处失败 return false；② lgdl-web build 类型检查；③ 调用点（onLocate/onClick）兼容核对 | 签名 `(string \| undefined) => boolean`；三失败路径 return false；调用点零改动编译通过 | 代码质量 + 构建脚本 | 代码走查 + vite build |
| V13 | F-05 preview-click 三态反馈（FR-011 / EC-006） | ① 代码走查 handler 三态分支；② 文案对照 preview-hover 风格 | loc 缺失→参数文案 / 失败→「✖ 未定位到 X（locate 失败）」/ 成功→「✓ 已定位到 X」 | 规范符合性 | 代码走查 |
| V14 | 测试守恒（NFR-001） | ① 干净依赖下全仓 `npm run test --workspaces`；② 统计各包 test 数 | 423 ≥ 420 基线不降（locate +1 / provider +2），全绿 | 测试覆盖 | npm test 全量 |
| V15 | 构建与类型检查（NFR-002） | ① 7 包依赖序构建；② lgdl-web vite build | 全 exit 0，零 TS 错误；F-05 返回类型变化/F-04 chat 签名零破坏 | 构建脚本 | npm run build |
| V16 | CI 效率（NFR-004） | ① ci.yml 步骤数核对；② 确认无逐包嵌套循环 | 步骤数 ≥5；两阶段 build→test（非逐包串行） | 性能边界 | 文件走查 |
| V17 | 零新功能 + 零核心漂移（NG-001 / NG-004） | ① git status 对比 plan 文件影响集合；② 确认 lgdl-core/parser/types/groups 零改动 | 改动文件与 plan 完全一致；语言核心零改动 | 漂移检测 | git status + diff |
| V18 | review 2 项改进跟踪 | ① tasks.md「六步」口径 vs ci.yml 实际 5 步；② actionlint 是否纳入 ci.yml | 改进①已同步或记录为待办；改进②保持可选不阻塞 | 漂移检测 | 文件核对 |
| V19 | EC 边界（EC-001 / EC-005） | ① 动态脚本：datastream 无 group → 合成 _default 泳道不发 loc；② node --test 空匹配包（cli/layout）exit 0 | EC-001：合成泳道无 data-lgdl-loc；EC-005：空测试包 exit 0 不阻塞 CI | 性能边界 | 动态脚本 + node --test |

> **质量门槛（数量基线法）**：11 个 FR 每个 ≥ 1 个 Vx（FR-001→V1、FR-002→V2、FR-003→V3/V4、FR-004→V5/V6、FR-005→V7、FR-006→V8、FR-007→V9、FR-008→V10/V11、FR-009→V11、FR-010→V12、FR-011→V13）✓；5 个验证维度每条 ≥ 1 个 Vx（测试覆盖 V7/V8/V11/V14、接口数据 V5/V9/V10/V11、构建脚本 V2/V3/V12/V15、性能边界 V16/V19、漂移检测 V4/V6/V17/V18）✓；Vx 总数 19 ≥ max(11, 5) ✓。清单合格。

## 3. 测试覆盖验证（规划）
> 运行测试套件，统计覆盖率，逐项标注（实际执行见 validate-report.md）

### 3.1 功能需求 (FR) — 覆盖率 100%（规划）

| 需求 ID | spec 描述 | 测试结果 | 覆盖率 |
|---------|----------|:--:|:--:|
| FR-001 | deploy-pages.yml paths 补 lgdl-router | ✅ 待执行 | 已覆盖（V1） |
| FR-002 | build 步骤补 lgdl-router（render 前） | ✅ 待执行 | 已覆盖（V2） |
| FR-003 | 新建 CI 测试工作流（build→test） | ✅ 待执行 | 已覆盖（V3） |
| FR-004 | renderer 分组 loc 改发射 nodes[i] | ✅ 待执行 | 已覆盖（V5） |
| FR-005 | svg.test.ts 断言同步 | ✅ 待执行 | 已覆盖（V7） |
| FR-006 | locate.test.ts fixture 现代语法化 | ✅ 待执行 | 已覆盖（V8） |
| FR-007 | 端到端链路可验证 | ✅ 待执行 | 已覆盖（V9） |
| FR-008 | OpenAI 兼容分支补 WEB_FETCH_TOOL | ✅ 待执行 | 已覆盖（V10） |
| FR-009 | 工具数变化回归验证 | ✅ 待执行 | 已覆盖（V11） |
| FR-010 | jumpToIssue 返回 boolean | ✅ 待执行 | 已覆盖（V12） |
| FR-011 | preview-click 按结果反馈 | ✅ 待执行 | 已覆盖（V13） |

### 3.2 非功能需求 (NFR) — 覆盖率 100%（规划）

| 需求 ID | spec 描述 | 测试结果 | 覆盖率 |
|---------|----------|:--:|:--:|
| NFR-001 | 全仓测试守恒（420 不降） | ✅ 待执行 | 已覆盖（V14） |
| NFR-002 | 对外接口零破坏 | ✅ 待执行 | 已覆盖（V15） |
| NFR-003 | loc 输出语义可信 | ✅ 待执行 | 已覆盖（V6） |
| NFR-004 | CI 效率（≥5 步） | ✅ 待执行 | 已覆盖（V16） |

## 4. 接口与数据实测（规划）

| 检查项 | spec 要求 | 实测结果 | 一致？ |
|--------|----------|---------|:--:|
| renderer loc 发射（F-03） | nodes[i]（i=group 文档序） | 待执行（V5/V9） | — |
| buildTools() 输出（F-04） | 3 工具 fetch 末尾 | 待执行（V10） | — |
| locateIssue 解析（F-03） | nodes[i] 非 null / groups[0] null | 待执行（V9） | — |

## 5. 构建与脚本验证（规划）

| 检查项 | 命令 | 退出码 | 结果 |
|--------|------|:--:|:--:|
| 全量构建（依赖序） | `npm run build --workspace …7 包` | 0（规划） | ✅ 待执行 |
| 干净依赖构建 | `npm ci` + 同命令 | 0（规划） | ✅ 待执行 |
| web 构建 | `npm run build --workspace @lgdl/lgdl-web` | 0（规划） | ✅ 待执行 |
| 全仓测试 | `npm run test --workspaces` | 0（规划） | ✅ 待执行 |

## 6. 性能与边界验证（规划）

| NFR/EC | spec 要求 | 实测数据 | 达标？ |
|-----|----------|---------|:--:|
| NFR-004 | ci.yml 步骤数 ≥5，无逐包嵌套循环 | 待执行（V16） | — |
| EC-001 | 合成 _default 泳道不发 loc | 待执行（V19） | — |
| EC-005 | 空测试包（cli/layout）exit 0 | 待执行（V19） | — |

## 7. 漂移检测（规划）

| 漂移类型 | 检测结果 |
|---------|---------|
| 孤立代码（有代码无需求） | 待执行（git status vs plan，V17） |
| 需求缺失（有需求无代码） | 待执行（FR 逐项对照，V1~V13） |
| 规格漂移（spec 被修改） | 待执行（feature 目录 git 状态，V17） |

## 8. 结论

**结论**: 待报告产出后判定（策略规划：预计 ✅ 通过 — 11/11 FR、4/4 NFR、构建 exit 0、0 阻塞、0 严重漂移）

| 指标 | 结果 |
|------|------|
| FR 覆盖率 | 100%（规划） |
| NFR 覆盖率 | 100%（规划） |
| 构建 | ✅（规划） |
| 漂移 | 0 项（规划） |
| 阻塞 | 0 项（规划） |

**理由**: review 已静态 PASS（20/20），validate 聚焦动态执行：V9 端到端 render→locate 打通（FR-007）、V10 buildTools 三工具实测（FR-009 端点 tools）、V13 preview-click 三态（F-05）、V3/V4 CI 本地等价（F-02）、V2 干净依赖构建（F-01）。预期全绿，若出现 WARN 级发现（文档口径/遗留文案类）按非阻塞处理。

## 9. 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建 — 自主 V1~V19 场景矩阵（五维度全覆盖、每 FR ≥1 Vx、review 动态可验证项入清单、2 项改进跟踪入清单）；策略与报告同批产出（build 已完成，用户授权一并执行） | 2026-09-01 | SDDU Validate Agent |
