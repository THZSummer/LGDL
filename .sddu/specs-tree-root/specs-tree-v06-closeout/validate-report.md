# 验证报告：specs-tree-v06-closeout（v0.6 收口五件套 F-01~F-05）

> **文档定位**: SDDU 验证报告 — 逐项记录自主验证的执行结果，作为工作流终点
> **验证策略**: validate.md v1.0（V1~V19 验证场景及五维度指引）
> **前置依赖**: validate.md（验证策略）、spec.md v1.0（11 FR/4 NFR/6 EC）、review-report.md v1.0（R1，20/20 PASS，0 阻塞）
> **创建人**: SDDU Validate Agent
> **创建时间**: 2026-09-01
> **验证轮次**: R1
> **版本**: v1.0
> **更新人**: SDDU Validate Agent
> **更新时间**: 2026-09-01
> **更新说明**: 初始创建 — 按 validate.md V1~V19 逐项动态执行（npm ci / build / test / PyYAML / grep / 自定义验证脚本 / 代码走查），全部基于实测数据；发现 2 项 WARN（非阻塞）：ops.ts 遗留 groups[0] 帮助文案、review 改进① tasks.md「六步」口径未同步

## 1. 验证概要

| 维度 | 数值 |
|------|:--:|
| 验证项总数 | 19（V1~V19） |
| 通过 | 19 |
| 失败 | 0 |
| 无法执行 | 0 |
| 阻塞问题 | 0 |

## 2. 逐项验证结果（V1~V19）

| # | 验证对象 | 验证步骤 | 预期结果 | 实测结果 | 判定 |
|---|---------|---------|---------|---------|:--:|
| V1 | F-01 paths 触发清单（FR-001） | 读 deploy-pages.yml paths 区块逐条核对 | paths 含 `packages/lgdl-router/**` | deploy-pages.yml:11 含 `- 'packages/lgdl-router/**'`（:10 render 之后，paths 顺序不敏感）；git diff 确认系本次新增行 | ✅ |
| V2 | F-01 build 命令顺序 + 干净依赖跑通（FR-002） | `npm ci`（56s，202 包）→ 按 deploy-pages.yml:41 命令原样执行 | 顺序 …layout→router→render…；干净依赖构建 exit 0，无 TS2307 | 命令顺序 …lgdl-layout → **lgdl-router** → lgdl-render…（render 前）；干净依赖构建 7 包 tsc 全过，exit 0，零 TS2307（33s）；步骤 name 同步含 router 字样 | ✅ |
| V3 | F-02 ci.yml 语法/结构（FR-003/NFR-004） | PyYAML 解析两 workflow + 步骤链走查 | YAML 有效；步骤 ≥5；build 先于 test | ci.yml 解析有效，单 job `build-and-test` 5 步：checkout@v4→setup-node@v4（node 20, cache npm）→npm ci→Build（依赖序）→Run tests；**build 严格先于 test**（R-004 满足）；deploy-pages.yml 亦解析有效（jobs: build/deploy） | ✅ |
| V4 | F-02 触发 + build 命令单一事实源（Q-②） | 走查触发配置 + diff 两 workflow build 行 | push:main+pull_request 全量触发；build 命令逐 token 一致 | ci.yml:3-8 触发 = push:main + pull_request（无 paths，注释留 v0.7 收窄）；ci.yml:30 与 deploy-pages.yml:41 全量依赖序 build 命令**逐 token 一致**（diff 通过）；deploy-pages.yml:44 web 单独 build 为 Pages 专属步骤（非全量依赖序，不参与对比） | ✅ |
| V5 | F-03 renderer 三处发射 nodes[i]（FR-004） | 代码走查 groupNodeIdx + 动态脚本渲染 3 模式提取 loc | 三处发射 nodes[i]，idx>=0 守卫，无 groups[ 发射 | index.ts:440-442 `groupNodeIdx = (doc, group) => doc.nodes.findIndex((n) => n.kind === 'group' && n.id === group.id)`；动态实测：datastream 泳道 lgdl-lane loc=nodes[2]、flowchart 分组盒 lgdl-group loc=nodes[2]、gantt 泳道 lgdl-gantt-lane loc=nodes[2]——三处发射点全部 nodes[i] 且守卫生效 | ✅ |
| V6 | F-03 无 groups[ 残留（NFR-003） | 全仓 grep + 端到端脚本输出扫描 | 源码发射路径零残留 | grep `data-lgdl-loc="groups[`：仅命中 svg.test.ts:193 残留断言的否定字符串；动态渲染输出 4 个 loc 全部 nodes[i]/edges[i]，零 groups[ | ✅ |
| V7 | F-03 svg.test.ts 断言联动（FR-005） | 读取断言 + 运行 render 包测试 | 断言 nodes[2]/残留断言/locs>=4；21 全绿 | svg.test.ts:191 `includes('data-lgdl-loc="nodes[2]"')` + :193 `!includes('data-lgdl-loc="groups[')` + :195 `locs.length >= 4`；`npm run test --workspace @lgdl/lgdl-render` 21/21 全绿 | ✅ |
| V8 | F-03 locate.test.ts fixture 现代语法化（FR-006/EC-004） | 走查 fixture + 运行 web 测试 + parseLgdl 可解析 | fixture 现代语法；nodes[2]→18 行；测试全绿 | fixture（:9-35）g1 kind:group 节点（:18-20）+ contains [user,order]；:87 断言 nodes[2] lineSpan 18；:100-106 parseLgdl 可解析断言（valid=true, g1.kind='group', contains deepEqual）；locate.test.ts 11 用例全绿；lgdl-web 35/35 全绿 | ✅ |
| V9 | F-03 端到端 render→locate 链路（FR-007） | 自定义脚本 parseLgdl→layoutDocument→renderSvg→提取 loc→locateIssue | 4 个发射 loc 全部非 null；groups[0]/nodes[99] null | 脚本实测（e2e-loc-chain.mjs）：渲染输出 4 loc = [nodes[2], nodes[0], nodes[1], edges[0]]，**全部解析非 null**（DocSpan 实测）；反向验证 groups[0]→null、nodes[99]→null、nodes[2].contains[5]→null（EC-006）；render→locate 链路打通 | ✅ |
| V10 | F-04 buildTools 三工具齐备（FR-008） | 动态调用 buildTools() | 3 工具 [lgdl-web-cli, lgdl-web-op-cli, web-fetch]，fetch 末尾，schema 完整 | 脚本实测（buildtools-check.mjs）：返回 3 工具，顺序 `["lgdl-web-cli","lgdl-web-op-cli","web-fetch"]`（fetch 末尾）；三工具均含 name/description/parameters（type/properties/required 完整）；与旧 Claude 分支逐字段等价（review C11 已静态比对） | ✅ |
| V11 | F-04 7 provider 共享 + 回归（FR-008/FR-009） | 走查 chat() 组装点 + provider.test.ts +2 用例 + web-cli-base 测试 | chat() 单一组装点；7 非 claude provider 全获三工具；llm 分发全绿 | provider.ts:274 chat() 内唯一 `const tools = buildTools()`（:245 为定义，grep 复核仅 1 调用点）；isClaude 零残留；provider.test.ts 新增 2 用例（:189-196 三工具顺序 deepEqual 强断言 + :198-203 7 provider baseURL 断言）；lgdl-web 35/35 + web-cli-base 14/14 全绿（llm 分发回归） | ✅ |
| V12 | F-05 jumpToIssue boolean（FR-010/NFR-002） | 代码走查 + lgdl-web build + 调用点核对 | 签名 (string\|undefined)=>boolean；三失败 return false；调用点零改动编译通过 | App.tsx:929 签名 `(location: string \| undefined): boolean`；三失败路径全 return false（:931 editor 空/location 缺失、:933 span null）；成功 dispatch+scrollIntoView+focus 后 return true（:934-939）；调用点 :1218/:1222 onLocate、:1265 onClick 零改动；`npm run build --workspace @lgdl/lgdl-web` vite build 通过（8.8s，仅既有 chunk size 警告） | ✅ |
| V13 | F-05 preview-click 三态反馈（FR-011/EC-006） | 代码走查三态分支 + 文案对照 | loc 缺失→参数文案 / 失败→✖ / 成功→✓ | App.tsx:1012-1017：loc 缺失→「✖ preview-click 需要 loc 参数（如 nodes[3]）」；失败→「✖ 未定位到 ${loc}（locate 失败）」；成功→「✓ 已定位到 ${loc}（编辑器已跳转）」；preview-hover:1028 失败文案「（试试 nodes[3] / edges[1]）」已去 groups[0]；:467 注释清理完成 | ✅ |
| V14 | 测试守恒（NFR-001） | 干净依赖下全仓 test --workspaces 统计 | 423 ≥ 420，全绿 | 干净依赖（npm ci 后）复跑：core 258 + render 21 + router 8 + web 35 + web-cli 76 + web-op-cli 11 + web-cli-base 14 = **423**（cli/layout 0 空包，EC-005），全绿 exit 0；420 基线 +3（locate +1 / provider +2），NFR-001 不降反升 | ✅ |
| V15 | 构建与类型检查（NFR-002） | 7 包依赖序构建 + lgdl-web vite build | 全 exit 0，零 TS 错误 | 7 包 tsc 构建全过（两次：npm ci 前后各 1 次，均 exit 0）；lgdl-web vite build exit 0；F-05 返回类型变化 / F-04 chat 签名零破坏（AiPanel.tsx:390 调用点零改动） | ✅ |
| V16 | CI 效率（NFR-004） | ci.yml 步骤数核对 + 无嵌套循环确认 | 步骤 ≥5；两阶段 build→test | ci.yml 5 步 ≥5（checkout/setup-node/ci/build/test），「Build all packages → Run all package tests」两阶段，无逐包嵌套循环 | ✅ |
| V17 | 零新功能 + 零核心漂移（NG-001/NG-004） | git status 对比 plan 文件影响集合 | 改动文件与 plan 一致；核心零改动 | git status：7 MODIFY（deploy-pages.yml / lgdl-render index.ts / svg.test.ts / App.tsx / provider.test.ts / provider.ts / locate.test.ts）+ 1 NEW（ci.yml）+ feature 目录——与 plan.md 各节改动文件集合完全一致；lgdl-core/parser/types/groups 语言核心零改动 | ✅ |
| V18 | review 2 项改进跟踪 | ① tasks.md 六步 vs ci.yml 5 步；② actionlint 是否纳入 | 改进①同步或记录；②保持可选 | ① tasks.md:22/79/99 仍写「单 job 六步」/「步骤链 6 步」——ci.yml 实测 5 步，文档口径未同步（**WARN-1**，低优非阻塞，review 改进①原样保留）；② actionlint 未纳入 ci.yml（**WARN-2**，保持可选增强，review 改进②原样保留）；两改进均不阻塞验证结论 | ✅ |
| V19 | EC 边界（EC-001/EC-005） | 动态脚本：无 group datastream + node --test 空包 | 合成 _default 不发 loc；空包 exit 0 | 动态实测（e2e-three-emitters.mjs 场景 4）：无 group datastream 渲染，lgdl-lane=0（合成 _default 泳道无 loc，全部 loc=nodes[0]/nodes[1]/edges[0] 均为真实节点）——EC-001 守卫生效；node --test 空匹配 lgdl-cli / lgdl-layout 均 tests 0 / pass 0 / fail 0 / **exit 0**（EC-005 不阻塞 CI） | ✅ |

## 3. 验证详细信息

### 3.1 测试覆盖

| 需求 ID | spec 描述 | 测试用例 | 执行结果 | 覆盖率 |
|---------|----------|---------|:--:|:--:|
| FR-001 | deploy-pages.yml paths 补 lgdl-router | 无单测（CI 配置，V1 文件核对） | ✅ | 已覆盖（静态验证） |
| FR-002 | build 步骤补 lgdl-router（render 前） | 无单测（V2 干净依赖构建实测） | ✅ | 已覆盖（动态验证） |
| FR-003 | 新建 CI 测试工作流 | 无单测（V3 PyYAML + V14 全仓测试等价） | ✅ | 已覆盖（动态验证） |
| FR-004 | renderer 分组 loc 改发射 nodes[i] | svg.test.ts:191 nodes[2] + :193 残留断言 | ✅ | 已覆盖 |
| FR-005 | svg.test.ts 断言同步 | svg.test.ts 7 用例（含 nodes[2]/残留/locs>=4） | ✅ | 已覆盖 |
| FR-006 | locate.test.ts fixture 现代语法化 | locate.test.ts 11 用例（nodes[2]→18 行、contains 定位、parseLgdl 可解析） | ✅ | 已覆盖 |
| FR-007 | 端到端链路可验证 | e2e-loc-chain.mjs（4 loc 全非 null） | ✅ | 已覆盖（脚本实测） |
| FR-008 | OpenAI 兼容分支补 WEB_FETCH_TOOL | provider.test.ts「F-04: buildTools exposes all three tools in stable order」 | ✅ | 已覆盖 |
| FR-009 | 工具数变化回归验证 | provider.test.ts「F-04: OpenAI-compatible endpoints share the three-tool set」+ web-cli-base llm.test.ts | ✅ | 已覆盖 |
| FR-010 | jumpToIssue 返回 boolean | 无单测（React 组件，V12 代码走查 + vite build 类型检查） | ✅ | 已覆盖（静态+构建验证） |
| FR-011 | preview-click 按结果反馈 | 无单测（React 组件，V13 代码走查三态分支） | ✅ | 已覆盖（静态验证） |

### 3.2 接口数据

| 检查项 | 调用方式 | 预期 | 实测 | 一致？ |
|--------|---------|------|------|:--:|
| renderer loc 发射（3 模式） | e2e-three-emitters.mjs | nodes[i]（i=group 文档序） | datastream 泳道 / flowchart 分组盒 / gantt 泳道均发射 `nodes[2]`（g1 文档序索引 2） | ✅ |
| buildTools() 输出 | buildtools-check.mjs | 3 工具 fetch 末尾 | `['lgdl-web-cli','lgdl-web-op-cli','web-fetch']`，schema 完整 | ✅ |
| locateIssue 解析 | e2e-loc-chain.mjs | nodes[i] 非 null / groups[0] null | 4 个发射 loc 全部非 null（DocSpan 实测）；groups[0]/nodes[99]/contains 越界均 null | ✅ |
| 合成 _default 泳道 loc | e2e-three-emitters.mjs 场景 4 | 无 loc | lgdl-lane=0，无合成 loc 发射 | ✅ |

### 3.3 构建脚本

| 命令 | 退出码 | 耗时 | 输出摘要 | 结果 |
|------|:--:|------|---------|:--:|
| `npm ci --no-audit --no-fund`（干净依赖） | 0 | 56.5s | added 202 packages | ✅ |
| `npm run build --workspace …7 包`（干净依赖后） | 0 | 32.9s | 7 包 tsc 全过，零 TS2307 | ✅ |
| `npm run build --workspace …7 包`（npm ci 前） | 0 | 30.8s | 7 包 tsc 全过 | ✅ |
| `npm run build --workspace @lgdl/lgdl-web` | 0 | 8.8s | vite build 成功（既有 chunk size 警告，非本次引入） | ✅ |
| `npm run test --workspaces`（干净依赖） | 0 | ~33s | **423 全绿**（258+21+8+35+76+11+14），0 fail | ✅ |
| PyYAML 解析两 workflow | 0 | — | deploy-pages.yml jobs=[build,deploy]、ci.yml jobs=[build-and-test]，均解析有效 | ✅ |

### 3.4 性能边界

| NFR/EC | 指标要求 | 实测值 | 偏差 | 达标？ |
|-----|---------|-------|------|:--:|
| NFR-004 | ci.yml 步骤数 ≥5，无逐包嵌套循环 | 5 步（checkout/setup-node/ci/build/test） | N/A | ✅ |
| EC-001 | 合成 _default 泳道不发 loc | 无 group datastream：lgdl-lane=0，无合成 loc | N/A | ✅ |
| EC-005 | 空测试包（cli/layout）exit 0 | node --test 空匹配：tests 0/pass 0/fail 0/exit 0 | N/A | ✅ |

### 3.5 漂移检测

| 漂移类型 | 检测命令/方法 | 结果 |
|---------|-------------|------|
| 孤立代码（有代码无需求） | git status vs plan 文件影响集合（V17） | ✅ 无——7 MODIFY + 1 NEW 与 plan 完全一致 |
| 需求缺失（有需求无代码） | FR 逐项对照（V1~V13） | ✅ 无——11 FR 全部有实现且验证通过 |
| 规格漂移（spec 被修改） | git status feature 目录 | ✅ 无——feature 目录整体 ?? 未跟踪（新增），无 spec 二次修改痕迹 |
| 残留文案 | grep `groups[0]` / `groups[` 全仓 | ⚠️ 1 项（WARN）：`packages/lgdl-web-op-cli/src/ops.ts:51` preview-hover 帮助文案含 `groups[i]`（:47 preview-click 含 `groups[0]` 示例）——**非本次 build 改动文件**（git status 无 ops.ts），属既有遗留帮助文案；不产生运行期 loc 发射，不构成功能漂移，建议 v0.7 随文档零漂移处理 |

## 4. 验证脚本执行记录

> ADR-003 落地：validate Agent 自主编写并直接执行的验证脚本记录
> 脚本存放路径：`/tmp/sddu-validate-specs-tree-v06-closeout-20260902/`

| 脚本文件 | 用途 | 对应场景 | 退出码 | 关键输出 |
|---------|------|:--:|:--:|---------|
| e2e-loc-chain.mjs | F-03 端到端 render→locate（FR-007）：parseLgdl→layoutDocument→renderSvg→提取 loc→locateIssue 解析 + 反向 null 验证 | V9 | 0 | 4 loc 全非 null（nodes[2]/nodes[0]/nodes[1]/edges[0]）；groups[0]/nodes[99]/contains 越界→null；render→locate 链路打通 |
| e2e-three-emitters.mjs | F-03 三处发射点独立触发 + EC-001 合成泳道守卫（FR-004） | V5/V19 | 0 | datastream 泳道 lgdl-lane=nodes[2]、flowchart 分组盒 lgdl-group=nodes[2]、gantt 泳道 lgdl-gantt-lane=nodes[2]；无 group datastream 合成 _default 无 loc |
| buildtools-check.mjs | F-04 buildTools 三工具实测（FR-008/FR-009） | V10/V11 | 0 | 3 工具 `['lgdl-web-cli','lgdl-web-op-cli','web-fetch']`，schema 完整；chat() 单一组装点（:274 唯一调用），isClaude 零残留 |

> 另用命令型验证（非脚本文件）：`npm ci`（V2/V14 干净依赖）、`npm run build --workspace …`（V2/V15）、`npm run test --workspaces`（V14 423 全绿）、PyYAML `yaml.safe_load`（V3）、`grep -rn 'data-lgdl-loc="groups['`（V6）、`git status`（V17）。

## 5. 阻塞问题

| # | 位置 | 问题 | 对应 Vx | 修复建议 |
|---|------|------|:--:|---------|
| — | — | 无（0 项） | — | — |

**非阻塞 WARN 清单**（不影响结论）：

| # | 位置 | 问题 | 对应 Vx | 严重度 | 建议 |
|---|------|------|:--:|:--:|------|
| WARN-1 | tasks.md:22/79/99（TASK-002 名称与验收） | 「单 job 六步」/「步骤链 6 步」vs ci.yml 实际 5 步（review 改进①原样保留） | V18 | 低（文档口径） | 随 v0.7 或下次文档同步改为「五步」，与实现和 NFR-004（≥5）对齐 |
| WARN-2 | .github/workflows/ci.yml | actionlint 语义自检未纳入（review 改进②保持可选） | V18 | 低（工具链增强） | 可选：ci.yml 增加 `npx --yes actionlint` 步骤固化校验 |
| WARN-3 | packages/lgdl-web-op-cli/src/ops.ts:47/:51 | preview-click/preview-hover 帮助文案含 `groups[0]`/`groups[i]` 示例——现代语法下已不存在的旧格式，属既有遗留（非本次 build 改动文件） | V6 | 低（帮助文案，不影响运行期 loc） | 随 v0.7 文档零漂移清理为 `nodes[i]` 示例 |

## 6. 结论

**结论**: ✅ 通过

**指标达标矩阵**：

| 指标 | 要求 | 实测 | 达标？ |
|------|------|------|:--:|
| FR 测试覆盖 | 100% | 100%（11/11，含动态脚本实测） | ✅ |
| NFR 测试覆盖 | ≥80% | 100%（4/4） | ✅ |
| 构建退出码 | 0 | 0（npm ci 前后两次全量构建 + web vite build） | ✅ |
| 阻塞问题数 | 0 | 0 | ✅ |
| 漂移项 | 0（严重） | 0 严重漂移（3 项低优 WARN，均非阻塞） | ✅ |

**理由**: V1~V19 全部通过（19/19，0 失败，0 无法执行），全部结论基于实测数据：① F-01 干净依赖（npm ci 后）下 deploy-pages.yml build 命令跑通，router 在 render 前，零 TS2307（FR-001/FR-002）；② F-02 ci.yml PyYAML 有效、5 步 build→test 硬约束、与 deploy-pages.yml build 命令逐 token 一致，本地全仓 423 测试等价 CI 首跑（FR-003/NFR-004）；③ F-03 三处发射点动态实测全部 nodes[i]、端到端 render→locate 链路 4 loc 全解析非 null、无 groups[ 残留、locate fixture 现代语法化（FR-004~FR-007）；④ F-04 buildTools 动态实测三工具齐备 fetch 末尾、7 个 OpenAI 兼容 provider 共享单一组装点、llm 分发回归全绿（FR-008/FR-009）；⑤ F-05 jumpToIssue boolean + preview-click 三态 + hover 文案清理，vite build 类型兼容（FR-010/FR-011）；⑥ 测试守恒 423 ≥ 420（NFR-001 不降反升）、接口零破坏（NFR-002）、loc 语义可信（NFR-003）、CI 效率 5 步（NFR-004）；⑦ 漂移检测 0 严重项（改动文件与 plan 一致、语言核心零改动）。3 项 WARN 均为低优非阻塞（tasks 文档口径、actionlint 可选、ops.ts 既有帮助文案遗留），建议随 v0.7 处理，不阻塞 Feature 关闭。

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建（R1）— 按 validate.md V1~V19 逐项动态执行：19/19 通过，0 阻塞；3 项 WARN（tasks 六步口径 / actionlint 可选 / ops.ts 既有文案遗留）；结论 ✅ 通过 | 2026-09-01 | SDDU Validate Agent |
