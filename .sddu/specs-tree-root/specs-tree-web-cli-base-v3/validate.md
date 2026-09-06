# 验证策略：specs-tree-web-cli-base-v3（web-cli-base v3：AI 操作浏览器的完整工具集——五层 DOM/UI 全谱补齐 + 子命令级权限分级 + evaluate 最高门禁）

> **文档定位**: SDDU 验证策略 — 指导 validate Agent 执行自主验证的场景和方法（V1~VN 定义一次）；逐项验证结果见 validate-report.md（build 完成 + review passed 后每轮独立产出）
> **前置依赖**: spec.md v1.0（45 FR 九组 BSL/PRM/PER/INT/WT/CHR/WR/COL/LGDL + 8 NFR + 14 EC + 12 AC + NG-001~010）、plan.md v1.0（8 ADR + §2.3 契约 + PlatformDomOps additive 扩展面）、tasks.md v1.0（12 任务 7 波次，D-005 守恒）、build.md v1.9 §11.5/§11.6（validate 移交 S1~S7 冒烟清单 + v2 收口 3 项基线关联表）、review-report.md R1（✅ 通过，C1~C36）、上游 v2 validate.md/validate-report.md v1.1（V13 chromium headless 方法先例 + 收口 3 项）、state.json（phase=builded → validated）
> **创建人**: SDDU Validate Agent
> **创建时间**: 2026-09-07
> **版本**: v1.0
> **更新人**: SDDU Validate Agent
> **更新时间**: 2026-09-07
> **更新说明**: 初始创建 — 以 build.md §11.5 S1~S7 冒烟清单为输入面（V13 方法扩展：chromium headless + CDP 自动化 + 自建宿主页 + 真实 lgdl-web React 应用页），自主定义 V1~V9 验证场景；代码类 Feature 全维度验证 + 真实浏览器实跑为主。作者指令本批直接执行冒烟并出报告（策略即执行，ADR-004 步骤 1+2 合并于用户确认清单 S1~S7）

## 1. 验证概要

| 维度 | 数值 |
|------|:--:|
| 验证对象 | web-cli-base v3 五层全谱（platform-dom.ts 35 ops / 27 dom 子命令 / wait / chrome / page-eval / extract·export）+ lgdl-web React 受控接入面 + v2 零回归 |
| 验证场景 | V1~V9（承接 build §11.5 冒烟 7 面 S1~S7 + 回归/构建 + 漂移/收口基线） |
| Feature 类型 | 代码类（全五维度）+ 真实浏览器冒烟（chromium headless，V13 方法扩展） |
| 动态验证 | 全仓 npm test + base tsc build + lgdl-web vite build + chromium headless 真实浏览器（siteA fixtures 宿主页 + 真实 lgdl-web React 页 + probe 页）CDP 自动化（S1~S7 逐项断言） |
| 前置条件 | ✅ review-report R1 = passed（2026-09-07，C1~C36 无阻塞）+ build 产物就绪（base dist / lgdl-web dist 均为最新构建） |

## 2. 验证对象提取与 Feature 类型自适应

- 验证对象从 spec（FR/NFR/EC/AC）+ plan（ADR-001~008 / PlatformDomOps 扩展面）+ build.md（§11.5 冒烟清单 / §11.6 收口表）+ 实际产物（platform-dom.ts 真实实现 / dom-tools 27 子命令 / wait·chrome·page-eval·collect 模块 / lgdl-web session 接入）提取。
- Feature 类型 = 代码类 → 全维度验证；其中浏览器真实面（真 DOM/React/截图/授权/Worker）是 v3 新增能力的核心验证面（FR-003 浏览器面真实实现收口）。
- 无法在当前环境执行的项显式标注：需真实用户手势（fullscreen 进出/真实 save 选择器/真实系统通知展示）、需厂商 API Key（真实 AI 闭环 AC-008）、需 React 弹层人工点验（AskDialog 呈现）→ ⏭️「待基线/人类授权交互待手测」不阻塞。

## 3. 自主验证场景（V1~VN）

| # | 验证对象（FR/NFR/EC/产物） | 验证步骤 | 预期结果 | 验证维度 | 验证方法 |
|---|------|---------|---------|:--:|:--:|
| V1 | AC-001/NFR-005/006 全仓回归 + 构建门禁（v2 零回归） | 全仓 npm test；base tsc build；lgdl-web vite build；确认 dist 与 src 同步 | 全仓 pass/0 fail（v2 基线守恒）；构建退出码 0 | 测试覆盖 + 构建 | npm test + tsc/vite |
| V2 | S1 platform-dom 31 ops 逐 ops ≥1 真实用例（FR-003/AC-002/003/006/007/008；readState~screenshot 全谱 + 门禁/工具面） | chromium headless 加载自建 fixtures 宿主页 → ops 级逐 ops 真实 DOM 断言 + dom 工具/路由器 gate 端到端 | 每 op ≥1 真实用例通过；只读免 ask / 写 ask / deny；错误面 EC-001/002/003/006 可读 | 接口数据 + 测试覆盖 | siteA harness + CDP（drv-sitea） |
| V3 | S2 lgdl-web React 受控表单 type/fill/set-value 值变更 + onChange（NFR-004/FR-022/034/035） | 真实 lgdl-web React 应用页加载 → .ai-input textarea / SettingsPanel select+apiKey input 上 type/fill/set-value；send 按钮 disabled 态 = React state 提交证据 | 值变更 + onChange 触发（受控 state 提交） | 接口数据 | lgdl-s2 注入模块 + CDP |
| V4 | S3 SPA 动态 wait（FR-025/AC-004） | fixtures 页定时插入/移除元素 → wait element/gone/text/all/超时含最后状态 | 命中/消失/超时最后状态语义正确 | 接口数据 + 性能边界 | harness wait-tools + ops |
| V5 | S4 截图尺寸（FR-028/ADR-003） | ops 面 viewport/element 截图 dataURL 解码尺寸断言；fullpage out 文案；chrome 工具下载链落盘 | element=320×180；viewport=根近似尺寸；fullpage「不支持+F-14」 | 接口数据 + 漂移 | harness + CDP 下载捕获 |
| V6 | S5 chrome 授权两路（AC-005/FR-029/030） | clipboard write→read roundtrip + 读 ask 门禁；notify granted show / denied 降级两路；save download 成功 + FSA 手势拒绝转译（真实 picker 手势 ⏭️） | 两路转译正确、会话不中断；真实手势项标注待手测 | 接口数据 + 漂移 | harness + CDP grant/reset + probe 页 |
| V7 | S6 采集端到端（FR-038~042/AC-008） | extract table/list/links/meta → 翻页（click+wait+同 id 增量）→ export text/json/csv；护栏（限速/总量上限/中止保留）+ trust 元数据 + csv RFC4180 转义 + 提示注入不回显 | 导出三格式文件落盘且内容正确；护栏触发保留；trust=untrusted | 接口数据 + 测试覆盖 | harness + 下载文件内容核验 |
| V8 | S7 page-eval 门禁端到端（FR-008/037/045/AC-007） | router+gate 组装：untrusted 拒 / 无策略 fail-closed / ask 放行 trusted 执行 / deny 不执行 / 代码预算拒 / 审计含代码摘要 / 与 eval-js 语义区分 | 门禁四道全部生效；审计记录可查；页面存活 | 接口数据 + 测试覆盖 | harness router+gate+audit |
| V9 | 漂移/收口基线（FR-004/AC-010/011） | git 状态核对（spec/plan 未改）；v2 收口 3 项基线关联登记（真实 AI 闭环 / lgdl-web React 手测 / web-search 真实端点）；D2 顺手修复回归 | 规格零漂移；3 项「待基线」标注不阻塞；修复后 base 全绿 | 漂移检测 | git diff + 全仓回归 |

> 无法执行项（⏭️ 预备标注）：fullscreen 进出/真实 save picker/真实系统通知展示 = 需真实用户手势（EC-008 授权路径已断言转译，真手势待手测）；真实 AI 闭环（AC-008）= 需厂商 API Key + 交互式浏览器（v2 收口①）；AskDialog/SettingsPanel 弹层人工点验 = lgdl-web React 渲染层手测（v2 收口②，base ask 契约已由 S6/V6 gate 等效断言 + lgdl-web SettingsPanel select/apiKey 值变更已机械实跑）；web-search 真实端点 = 需配置 key 的搜索服务（v2 收口③）。

## 4. 执行前提与环境

1. **执行环境**：本机 Node v24 + 全仓 workspace + `.pw-browsers/chromium-1234` headless chromium + Node 内置 WebSocket（CDP）+ 静态伺服（lgdl-web dist / base dist / fixtures 同源 http://127.0.0.1）。
2. **产物新鲜度核验**：base dist（platform-dom.js 构建于 src 最新修改之后）与 lgdl-web dist（vite dist 晚于 App/AiPanel 最近源码修改）——V1 前核验通过。
3. **D1/D2 说明**：真实浏览器冒烟首轮发现 2 项缺陷——D2（contenteditable caret 插入误报 value-not-synced）已顺手修复并回归；D1（type 首次合成键入 React 受控字段 onChange 未同步）如实记录，修复建议移交（不阻塞，见 validate-report §5/§6）。
