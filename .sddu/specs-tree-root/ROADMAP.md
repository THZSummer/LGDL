# LGDL 版本 Roadmap

> **文档版本**: 1.15.0
> **创建日期**: 2026-08-31
> **状态**: 规划中（v0.6.0 已正式发布 2026-09-05；**v0.7 = web-cli-base 完备化〔F-25 v2 + v3 + F-26 v4〕——SDDU 全流程已 validate（2026-09-08）、代码在分支 feature/web-cli-base-v2 待作者合入发布**；作者裁决 2026-09-06：原 v0.7 工程质量与文档对齐内容后移；**作者裁决 2026-09-10：开启 v0.8 = 浏览器插件孵化〔F-14 web-cli-plugin 由 v1.1 提前至 v0.8 作该版主题〕，原 v0.8 工程质量 → v0.9.0、原 v0.9 AI 增强 → v0.10.0、v1.1 仅留 F-13 ② 开源；F-14 已立项（specs-tree-web-cli-plugin）并完成 SDDU P0 全流程 validate（2026-09-11，⚠️ 有条件通过 0 阻塞）；**F-14 已全流程完成并 validated（2026-09-12，16/16 任务；review R3 ✅ 通过 0 阻塞 / validate R2 ✅ 通过 0 阻塞；FR 46/46 · NFR 10/10 · EC 16/16 · AC 12/12；TASK-016 Gate-D 内置助手下线已执行 + 发布渠道就绪）**、代码在分支 feature/web-cli-plugin 未合入发布〔最新 `4e537a7`〕**）
> **规划基准**: 工作区 `feature/group-as-node` @ `0610458`（2026-08-31，v1.0.0 首版基线；该分支已随 v0.6.0 于 2026-09-05 合入 main @ `c92bf3d` 并删除，仓库现仅 main，见 v1.6.0 素材增补）；素材扫描基准 `.sddu/docs-tree-root/` @ `15e5b6b`（2026-08-30）；v1.4.0 素材基准增补：`docs/research/archify/lessons-for-lgdl.md` v1.1（2026-09-02，作者指令转正，见下方 v1.4.0 素材增补）
> **规划专家**: sddu-roadmap（独立辅助 Agent，不触发任何 phase）
> **素材甄别规则**: 严格执行《业务全景/空白与待确认.md》§3/§5 —— v0.6 仅采信带验证记录的已实施工程事实（What 层）；规划性描述一律标注「AI 提案待审视」，不得作为既定事实写入未来版本。
> **v1.4.0 素材增补（2026-09-02）**: 作者指令将 `docs/research/archify/lessons-for-lgdl.md` v1.1（素材源：archify-layout-secrets.md v1.1 + archify-usage-report.md v1.2）的**借鉴/规避清单转正**为规划依据——该报告原为 AI 提案，经作者裁决转正后**不再属待审视池**；其中门禁/收据类建议按报告 §2.4 结论落位「引擎开发阶段回归护栏」（非用户使用阶段运行时拦截）。本版新增 Feature 的来源统一标注「**作者指令 2026-09-02 转正，依据 lessons-for-lgdl.md v1.1**」。
> **v1.5.0 素材增补（2026-09-05）**: 登记已完成 Feature **F-23 web-cli-base 框架化**（specs-tree-web-cli-base-framework）——**作者对话 2026-09-05 立项**（web-cli-base 定位讨论，bash 类比），SDDU 全流程（discovery → spec → plan → tasks → build → review → validate）完成（phase=validated / status=tracked）；事实以该 Feature 目录下 build.md / review-report.md / validate-report.md（均 2026-09-05）为准（What 层已实施工程验证，可作规划承诺，素材甄别规则 2）。
> **v1.6.0 素材增补（2026-09-05）**: 同步 **v0.6.0 已正式发布** 的最新事实（全部代码/实测/发布验证，What 层引用）——①代码已合入 main（`c92bf3d`，feature/group-as-node 已删除，仓库仅 main 分支）；②v0.5.0（`10f66d0`）+ v0.6.0（`fecb9b2`）标签已打并推送；③**npm 8 包全部发布 0.6.0**（@lgdl/{lgdl-core,lgdl-layout,lgdl-router,lgdl-render,lgdl-cli} + @lgdl/{web-cli-base,lgdl-web-cli,lgdl-web-op-cli}——web 侧三包首次发布；lgdl-web 为 private 不发包）；④全局 lgdl-cli 已升级 0.6.0 并冒烟验证通过（init/add-node/add-edge/render/status 全绿）；⑤全仓测试 **583 = 582 pass + 1 skip**（lgdl-core 267 / lgdl-web-cli 84 / web-cli-base 73 / lgdl-web 41 / lgdl-web-op-cli 15 / lgdl-render 94+1skip / lgdl-router 8）；⑥F-01~F-05 收口五件套全部完成、F-13 ①（specs-tree-web-cli-v2）+ F-23（specs-tree-web-cli-base-framework）均随版本发布、CHANGELOG 0.6.0 段收尾（补 F-23 / 修 D6、D7 / 加发布说明）。来源 = 作者发布操作确认 + 仓库实测（git refs、package.json 版本、CHANGELOG、specs-tree state.json）——本版将 v0.6 全部承诺行转正为「✅ 已完成（v0.6.0，2026-09-05）」，并按质量基线 583 联动相关口径。
> **v1.7.0 素材增补（2026-09-05）**: 登记候选 Feature **F-24 渲染器终点汇聚路由优化（正交总线/缓冲层）**——来源 = **lgdl-cli v0.6.0 实际渲染 15 节点/19 边多终点决策图（969x1128）实测**（2026-09-05，v0.6.0 发布态 583 基线全绿下发现的体验类缺陷，What 层工程观察）：多终点汇聚到单 end 节点时边缘终点出现跨画布「蛇形绕行」折线——严重证据 1：`f3→end1` 路径 `M293,564 L273,564 L273,693 L399,693 L399,868 L504,868 L504,1022 L560,1022 L560,1064 L545,1064`（10 段折线、x 坐标 4 次折返 273→399→504→560→545，横跨整个画布）；严重证据 2：`f5→end1` 路径 `M422,740 L406,740 L406,868 L504,868 L504,1022 L560,1022 L560,1064 L545,1064`（8 段折线、被迫绕开正下方节点）。根因 = 终点汇聚层（end1 居中）与上方 f1~f5 终点层（占满画布宽度 x141~691）之间无缓冲层，边缘终点直下无路——**终点汇聚路由缺少缓冲层/正交总线规划**。已实测验证不存在次生问题（无节点重叠、无边穿透节点 bbox，碰撞规避可靠），纯属**路由质量缺陷**（体验类、非阻断）；中等伴随问题：多条 >350px 长水平横穿边、同端口多边共用起始段（d1/d3/d4 底部）、标签落在共用段上。登记为 🔧 待立项候选（v0.7 或 v1.x 待排期），事实以实测为准（证据路径字符串照实引用）。
> **v1.8.0 素材增补（2026-09-06）**: **F-24 完整复现 DSL 已内嵌于本文档**（作者要求：不建独立 fixture 目录，ROADMAP 自包含可复现——15 节点/19 边复现源 1.7KB 原样内嵌 + 复现步骤 + 预期输出对照 969x1128，见 §8.1 F-24 事实行后「F-24 完整复现 DSL」小节）；复现 DSL 不改变 F-24 定位（仍 🔧 待立项候选，v0.7 或 v1.x 待排期）。
> **v1.9.0 素材增补（2026-09-06）**: 登记已完成 Feature **F-25 web-cli-base 面向浏览器生态位的 agent 能力完备化**（specs-tree-web-cli-base-v2）——**作者对话 2026-09-06 立项**（浏览器生态位完备化讨论），SDDU 全流程（discovery → spec → plan → tasks → build → review → validate）完成（phase=validated / status=tracked，⚠️ 有条件通过）；事实以 Feature 目录过程产物为准（build.md / review-report.md / validate-report.md，均 2026-09-06，What 层已实施工程验证，素材甄别规则 2 可作规划承诺）。**版本落点裁决（作者，2026-09-06，spec 开放点 O-008）**：web-cli-base 完备化 = **最近的独立版本**（即 v0.7.0 版本位，代码在独立分支 feature/web-cli-base-v2，**未合入 main / 未发布**——合入与发布时间不承诺），**原本 v0.7（工程质量与文档对齐）内容后移为 v0.8.0、原 v0.8.0（AI 增强与生态）后移为 v0.9.0**（本版起版本时间线按此调整，系**作者裁决的优先级变更**，非 AI 排期推导）；F-24 候选落点随 v0.7 版本位变更同步调整（原「v0.7 或 v1.x 待排期」→「v0.8 或 v1.x 待排期」，见 §3.1/§4/§七 标注）。本版新增 Feature 来源统一标注「**作者对话 2026-09-06 立项 + SDDU 全流程完成**」。
> **v1.10.0 素材增补（2026-09-08）**: 同批登记第三 Feature **F-26 web-cli-base 浏览器外壳纵深与事件流 v4**（specs-tree-web-cli-base-v4；v2/v3 同分支 feature/web-cli-base-v2 叠加，作者立项 2026-09-07，R-01~R-03 + 裁决 1~4）——SDDU **build 阶段（2026-09-08）**：30 FR 十一组 / 8 NFR / 12 EC / 10 AC，14 任务 9 波次全量实现；全仓测试 **（v2/v3/v4 叠加）零失败**（web-cli-base 471 / lgdl-web 66 等全绿），全仓 build 零错误；P2 验证门 **G-01 合成 touch = PASS**（真实 headless chromium 实测 touchstart/move/end 各 ≥1 命中）与 **G-02 网络拦截改写 = PASS**（真实 chromium 同 realm fetch 改写 header/查询参数到达网络栈实测）+ SHD 穿透冒烟 PASS —— 三条 PASS 均实现对应面（dom tap/swipe/pinch + net 拦截引擎）；事件 push 通道（env.events/event-bus/events 工具）、cookie/dialog/net/clipboard 富、EXT 契约预留（ATTRIBUTION_MAP，F-14 继承基线）全部落地。版本位 = **v0.7.0 同批**（v4 = v0.7 内第三个 Feature，作者裁决 O-012）；**SDDU 全流程完成（2026-09-08）**：review ⚠️ 有条件通过（0 阻塞）→ validate R1 **V1~V17 全✅**（FR 30/30 · NFR 8/8 · 全仓 1007 pass/1 skip/0 fail · G-01/G-02 PASS · 真实 DeepSeek AI 闭环 11/11）——**v0.7 同批三 Feature（v2+v3+v4）齐全**，分支 feature/web-cli-base-v2 待合入 main。
> **v1.11.0 素材增补（2026-09-10）**: 登记已完成 Feature **F-07 README 门面对齐**（D4/D5/D8/G3）——**提前至 v0.7 分支完成**（作者指令 2026-09-10「更新文档再发布，版本位既定」）：README 头部版本行 → v0.7.0（2026-09-10）、版本历史表补 v0.7 行、架构树 web-cli-base 升级为「浏览器生态位 AI-CLI 框架」（CommandRouter/AgentRunner/DelayGate + 九域工具集 + 权限门禁 + 事件订阅通道）、lgdl-web-cli 命令数 6→9 修正、球链网状隐喻标题改「确定性分层布局（Sugiyama 框架）」（D5）、`## v0.4.0 核心特性` 标题错位修正（D8）、serve 代理旧承诺（P-04）如实标注「尚未实现」；F-07 自 v0.8 移出，开放项 Top 5 榜首由 F-20（27.0）接替。
> **v1.12.0 素材增补（2026-09-10）**: **作者裁决开启 v0.8 = 浏览器插件孵化**——将 **F-14 web-cli-plugin**（浏览器插件，可作用于 LGDL 的 Web 页面、**替代现有的内置 AI 助手**）由 **v1.1 提前至 v0.8**，作为该版本主题；**版本位重排**：原 v0.8.0「工程质量与文档对齐」→ **v0.9.0**、原 v0.9.0「AI 增强与生态」→ **v0.10.0**、v1.0.0「语义稳定首发」不变（时间窗口标注待复核）、v1.1.0「web-cli 开源线与生态消费端」= 仅 **F-13 ②**（开源）——F-14 移出 v1.1。F-14 属**作者规划/作者指令**性质（原为作者规划 2026-09-01，非审视池项），可作规划承诺；其技术细节（协议发现机制/插件架构）仍**不预设立场**，留给未来立项（见 §二 v0.8、§3.2 注记、§8.1）。
> **v1.13.0 素材增补（2026-09-11）**: 登记 **F-14 web-cli-plugin 立项与 SDDU 推进进展**（v0.8 主题）——Feature 已立项：`.sddu/specs-tree-root/specs-tree-web-cli-plugin/`；**SDDU 全流程 P0 最小可用集完成**（discovery → spec〔**46 FR / 10 NFR / 16 EC / 12 AC**〕→ plan〔**12 ADR**〕→ tasks〔**16 原子任务 / 9 波次**〕→ build〔**P0 TASK-001~011 实施**〕→ review〔**R1 ❌ 2 阻塞 → 修复 → R2 ⚠️ 有条件通过 0 阻塞**〕→ **validate〔⚠️ 有条件通过，0 阻塞〕**）；**phase=validated / status=completed（P0 范围）**，**P1/P2（TASK-012~016，含 TASK-016 Gate-D 内置助手下线）未实现**；代码在分支 **feature/web-cli-plugin（未合入 main / 未发布，HEAD `1a1c7cf`）**；测试基线全仓 **0 fail**（`web-cli-base 483` / `lgdl-web 75` / **`web-cli-plugin 68`** / `lgdl-core 267` / `lgdl-render 94+1skip` / `lgdl-router 8` / `lgdl-web-cli 84` / `lgdl-web-op-cli 15`），插件 `tsc` 0 error、**G-MV3 PASS / G-KEY PASS**（火山端点 HTTP 401）；**作者裁决（2026-09-10，已在 Feature 内落盘）**：O-001 v0.8 内代码下线内置助手（**对象区分**：下线 AI 助手层 / 保留页内 web-cli-base 机制层）、O-002 通用任意站点优先、O-003 不预设协议形态、O-008 per-origin 授权、O-009 只读默认 + 写面确认、O-010 声明默认 untrusted、O-012 外壳能力后置（S-012）、P1 五项采纳默认（S-004/S-005/S-007/S-011/S-015）；**遗留（非阻塞）** = 真实产物全链浏览器验证（H0/H6 人工面）/ R-BLK1a 破坏性动词 denylist 加固 / R7 askUser / R9 五项（IMP-6/7/8/10/12）/ P1+P2 未实现。事实以 Feature 目录过程产物（state.json / build.md / review-report.md / validate-report.md，2026-09-10~09-11）为准（What 层已实施工程验证，素材甄别规则 2 可作规划承诺）。
> **v1.14.0 素材增补（2026-09-12）**: 登记 **F-14 web-cli-plugin P1+P2 全量 build 完成 + TASK-016 内置助手下线执行**（v0.8 主题）——**16/16 任务实现完毕**（P0 TASK-001~011 + P1 TASK-012~015 + P2 TASK-016；phase=builded，待 review/validate），全仓 **build/test 0 fail**（`web-cli-base 483`〔零回归〕/ `lgdl-web 31`〔TASK-016 移除内置助手测试 47：provider 21 + session 26，web-cli-host EC-012 用例 1:1 改写保留计数〕/ **`web-cli-plugin 112`** + tsc 0 error / 其余包不变），插件 E2E 场景 A（非 LGDL fixture，AC-010）+ B（LGDL Workbench 真实 dist，AC-009）**PASS**。**Gate-D 与下线执行（What 层已实施）**：`docs/gate-d.md` D-1~D-7 逐条达标（D-3 人工面 H6 为已文档化非阻塞人工项）→ **已执行内置助手下线**——`packages/lgdl-web/src/ai/*` 整体删除 + `App.tsx` 摘除助手面板/设置/会话/ask 接线（**对象区分**：保留 base 机制层 + `web-cli-host` 协议暴露点）+ `package.json` test script 同步；回退预案 = 单提交 `git revert` + `VITE_AI_ASSISTANT_FALLBACK` 默认 off（落地 `src/fallback-flag.ts`，C-4 终止时点）；**EC-016 不静默** = 页内静态迁移告知；**FR-046 发布渠道就绪** = `docs/release.md`（本地 unpacked + 自托管/未打包分发；分发物/版本管理；商店发布后续 S-016）。**遗留（非阻塞）** = C-4/C-5 过渡期关闭（移除 flag + 文档归档）/ Gate-D D-3 人工面 H6 与其余真实浏览器人工 UX（H0/H2/H4/H6/H7/H8/H9/H10）/ 商店发布（S-016）。事实以 Feature 过程产物（state.json / build.md §12 / docs/gate-d.md §2 / docs/migration.md §5.5，2026-09-12）为准。
> **v1.15.0 素材增补（2026-09-12）**: 登记 **F-14 web-cli-plugin SDDU 全流程完成并 validated**（v0.8 主题）——**16/16 任务完成**（P0 TASK-001~011 + P1 TASK-012~015 + P2 TASK-016）；SDDU 全流程 discovery → spec（v1.3，**46 FR / 10 NFR / 16 EC / 12 AC**）→ plan（**12 ADR**）→ tasks（**16 原子任务 / 9 波次**）→ build（含 R1 修复轮 + 遗留清账轮）→ review（**R1 ❌ 2 阻塞 → R2 ⚠️ → R3 ✅ 通过 0 阻塞**）→ **validate（R1 ⚠️ → R2 ✅ 通过，0 阻塞）**；**指标 FR 46/46 · NFR 10/10（NFR-007 已量化并实测）· EC 16/16 · AC 12/12 · 阻塞 0**；phase=validated / status=tracked（state.json，updatedAt 2026-09-12）。**关键交付**：`packages/web-cli-plugin`（MV3 三面 + 站点中立协议 + per-origin 权限门禁/审计 + 风控护栏 + BYOK + 事件桥 + dom-agent）+ LGDL 暴露点 `web-cli-host` + `docs/{protocol,dev,compliance,migration,gate-d,release,smoke-checklist,capability-matrix}.md` + R8 E2E `test/e2e/fullchain.mjs`（`npm run test:e2e`）。**内置助手下线已执行（O-001）**：`packages/lgdl-web/src/ai/*` 8 文件移除 + `App.tsx` 摘除助手接线（**对象区分**：`web-cli-host` + base 机制层保留）；回退预案 `VITE_AI_ASSISTANT_FALLBACK` 默认 off + 单提交 revert 实测可行；EC-016 不静默告知落地。**测试基线（全仓 0 fail）**：`lgdl-core 267` / `lgdl-render 94(+1 skip)` / `lgdl-router 8` / `lgdl-web 31`（ai 测试删除为 TASK-016 授权范围，-47）/ `lgdl-web-cli 84` / `lgdl-web-op-cli 15` / **`web-cli-base 483`（零回归）** / **`web-cli-plugin 112`**。**门禁**：G-MV3 PASS / G-KEY PASS（火山端点 HTTP 401）/ GATE-011 PASS。**分支 `feature/web-cli-plugin`（未合入 main、未发布；最新 `4e537a7`）**。**剩余人工面（非阻塞，移交人工/后续里程碑）**：H0~H10（真实浏览器手势注入 / side panel 交互 / 真实 LLM / LGDL 真实页写回 UX / 风控·事件·ask 真实 UI）· C-4/C-5 过渡期关闭（移除 flag）· S-016 商店发布 · 扩展 SW 真实内存采样。事实以 Feature 过程产物（state.json / build.md / review-report.md / validate-report.md，2026-09-12）为准。

---

## 执行摘要

### 愿景陈述

LGDL 是一门面向 AI Agent 的**语义优先**图表描述语言：语义交给 AI、布局完全固化给程序——这是动手写代码前就立下的设计公理（G1-Q3 追问②，作者确认），痛点观察（现有布局算法效果不可预测地差）只是公理的现实印证。叙事主轴经作者收尾答复确认落在**哲学层面**（语义优先公理 + AI-first）。

关键转折点已越过：v0.5.0（Web AI 助手，2026-08-23）与 **v0.6.0（2026-09-05 正式发布）** 均已发布——v0.6.0 在收口期完成了**两件结构性工程**（布局引擎彻底自研 + group-as-node 语义模型统一，均带测试/commit 验证）与**收口五件套（F-01~F-05）**，并叠加了 **F-13 ① web-cli 独立包抽取（9 包体系）** 与 **F-23 web-cli-base 框架化**；发布前置已知缺陷（G1/R-D2/W-D3/W-D1）已**全部关闭后才发版**——v0.6 未带已知缺陷、未带未收口工程风险发布。代码合入 main（c92bf3d）、npm 8 包 0.6.0 已发布、全仓测试 **583 = 582 pass + 1 skip** 全绿。v0.6 之后作者裁决（2026-09-06）：**v0.7（最近的独立版本）= F-25 web-cli-base 面向浏览器生态位的 agent 能力完备化**——已走完 SDDU 全流程（46 FR 十三组九域工具集 + 权限门禁三者组合，全仓 **724 pass / 0 fail / 1 skip** 基线，validate ⚠️ 有条件通过留真实浏览器冒烟收口清单），代码在 feature/web-cli-base-v2 待作者合入发布；**原 v0.7（工程质量与文档对齐：文档零漂移 + F-06/F-11 护栏后置补课 + archify 借鉴批次）内容整体后移（2026-09-06 后移为 v0.8 → 2026-09-10 再后移为 v0.9）**（作者裁决的优先级变更）。本 Roadmap 的首要任务次序相应调整：**先随 v0.7 收口 F-25 → 再以 v0.8 浏览器插件孵化（F-14 web-cli-plugin，作者裁决 2026-09-10 由 v1.1 提前至 v0.8）→ 再以 v0.9 文档零漂移与回归护栏（v0.6 抽取/F-23 框架化/F-25 完备化的护栏后置补课）确立工程基线 → 再进入 v0.10 审视后立项**。

### 版本总览表

| 版本 | 主题 | 时间 | 状态 | 核心内容 |
|------|------|------|------|----------|
| **v0.5.0** | Web AI 助手 | 2026-08-23 | ✅ 已发布 | 原生 function calling 三工具、双 CLI 分离 + core 命令注册表、多厂商接入、next-actions、命令自文档化 |
| **v0.6.0** | 语义模型统一 + 收口（含 F-13 ①/F-23 web-cli 框架化） | 2026-09-05（提前于原 09-12 计划） | ✅ **已发布（2026-09-05）** | 自研 Sugiyama 布局（零 dagre/elkjs）、group-as-node 语义统一、AI 实战与视觉评审闭环、评审 Bug 修复；**收口五件套 F-01~F-05 全部关闭**；**F-13 ① web-cli 独立包抽取 + V2（9 包体系）**；**F-23 web-cli-base 框架化**（CommandRouter 下沉 + AgentRunner 上收 + DelayGate 全局 delay + 注册收敛）；npm 8 包 0.6.0 发布；全仓测试 **583 = 582 pass + 1 skip**（CHANGELOG 0.6.0 段收尾，详见 §二 v0.6） |
| **v0.7.0** | web-cli-base 面向浏览器生态位的 agent 能力完备化（**F-25**，最近的独立版本——作者裁决 2026-09-06，原 v0.7 内容后移） | 发布时间不承诺（SDDU 全流程已于 2026-09-06 validate；代码在 feature/web-cli-base-v2，待作者合入 main + 真实浏览器冒烟收口 + 发布） | 📋 已 validate、待合入发布 | **F-25 specs-tree-web-cli-base-v2**：46 FR 十三组（横切 REG/PRM/SES/LGDL/BSL + 九域浏览器原生工具集）+ 权限门禁三者组合（opencode 三元组 + 可插拔策略 + allowed-tools）；方向公理 = 面向浏览器生态位设计工具集（不照搬 OS read/write/bash），OS 能力代理未来 os-cli-base；全仓 **724 pass / 0 fail / 1 skip**（F-23 基线 582→724）；validate ⚠️ 有条件通过（真实浏览器冒烟收口人工清单 5 项移交，见 §二 v0.7） |
| **v0.8.0** | 浏览器插件孵化（**F-14 web-cli-plugin**，作者裁决 2026-09-10 由 v1.1 提前至 v0.8 作该版主题） | 门槛式启动（时间待作者重排；原 v0.8 工程质量内容后移 v0.9）；**F-14 P0~P2 全量 build 完成 + Gate-D 下线执行（2026-09-12）→ SDDU 全流程 validated（2026-09-12）** | ✅ 已完成（SDDU 全流程 validated，0 阻塞） | **F-14 web-cli-plugin 浏览器插件**（独立于 LGDL、可作用于 LGDL 的 Web 页面、替代现有内置 AI 助手；配置 LLM key 后驱动打开网站的 web-cli 完成业务）；隐含新基础设施 = web-cli 协议发现/声明机制；**SDDU P0 全流程完成 + P1/P2 实现**（specs-tree-web-cli-plugin，46 FR / 10 NFR / 16 EC / 12 AC，16 任务 9 波次，16/16 已完成；**review R3 ✅ / validate R2 ✅ 通过 0 阻塞；FR 46/46 · NFR 10/10 · EC 16/16 · AC 12/12**；**TASK-016 内置助手下线已执行（O-001）** + 发布渠道就绪；代码在 feature/web-cli-plugin 未合入发布〔最新 `4e537a7`〕；见 §二 v0.8） |
| **v0.9.0** | 工程质量与文档对齐（**原 v0.7→v0.8 内容整体后移**，含 archify 借鉴：验收闭环机械化） | 时间后移待重排（原 09 中下旬 / 09-30 / 10-09 里程碑不再成立） | 📋 规划（后移） | CI 强化（layout/cli/router 测试补齐）、文档零漂移（D1-D8/T-D1/L-D1/R-D4 等全量对齐）、遗留清理（G6/W-D2/R-D1）；**+ archify 借鉴批次 F-15~F-22**（作者指令 2026-09-02 转正：几何审计/字号预算/golden 哈希回归/类型矩阵/结构化诊断/原子交付/视觉收据/溯源元数据——引擎开发阶段回归护栏，见 §二 v0.9）+ F-24 候选挂靠 |
| **v0.10.0** | AI 增强与生态（**原 v0.8→v0.9 内容整体后移**；审视后立项） | 时间后移待重排（原 2026-10 窗口不再成立） | 📋 规划（后移） | 作者审视「AI 提案待审视池」后逐项立项；业务叙事补全（竞争定位 4 处空白等）；视觉评审遗留清单（F-13 ① 已按作者指令提前至 v0.6，见 §二 v0.6，v0.10 不再承载） |
| **v1.0.0** | 语义稳定首发 | 2026-11 目标（受 v0.7/v0.8/v0.9 排期变更影响，目标窗口待复核、不承诺） | 📋 规划 | 发布门槛：CI 全绿 + 文档零漂移 + 待审视池冻结 + 语义模型无破坏性变更 |
| **v1.1.0** | web-cli 开源线与生态消费端（**F-13 ②**；F-14 已移出，作者裁决 2026-09-10 提前至 v0.8） | 2026-12 起（门槛式） | 📋 规划 | F-13 ②独立 GitHub 开源项目（脱离 LGDL 仓库，独立发布/维护）；前置 = F-13 ①落地（**✅ v0.6.0 已完成发布**，web-cli-base 经 F-23 框架化后「装即自足」）+ 作者开源决策（许可/命名/仓库名/文档/发布管道，**决策待定**）；F-13 ② 仍为 F-14（已提前至 v0.8）的生态价值面前置 |

### 本周优先事项（2026-09-05 起，v0.6.0 发布后）

**v0.6 收口期排布项——已全部完成并随 v0.6.0 发布 ✅**
- [x] **F-01**（G1）`.github/workflows/deploy-pages.yml` 补 router 包构建——已随 v0.6.0 合入 main（c92bf3d），Pages 链路含 lgdl-router
- [x] **F-03**（R-D2）分组盒/泳道点击定位跨包断裂修复 + locate.test.ts fixture 现代语法化（C-D2）——renderer 三处 `groups[i]`→`nodes[i]`
- [x] **F-05**（W-D3）preview-click 假成功反馈修复（jumpToIssue 返回 boolean）——按真实结果反馈
- [x] **F-04**（W-D1）web-fetch 注册——被 F-23 框架化彻底解决（base 内建 + deriveTools 自动注册进 5 工具）
- [x] **F-02**（G2）CI 测试工作流（ci.yml：push main + PR，build 依赖序 + test workspaces）
- [x] **F-13 ①**（作者指令提前）web-cli 独立包抽取 + V2——9 包体系落地（specs-tree-web-cli-v2 validated）
- [x] **F-23**（作者对话立项）web-cli-base 框架化——已随 v0.6.0 发布（specs-tree-web-cli-base-framework validated）

**v0.7 推进（v1.9.0 更新：作者裁决 2026-09-06——v0.7 = F-25 web-cli-base 完备化，最近的独立版本；原 v0.7 工程质量内容后移 v0.8；v1.12.0：再后移 v0.9）**
- [x] **F-25 web-cli-base v2 完备化 SDDU 全流程完成**（2026-09-06 validate，全仓 724 pass / 0 fail / 1 skip，⚠️ 有条件通过）
- [ ] F-25 收口发布（时间不承诺）：真实浏览器冒烟收口人工清单 5 项 → 合入 main（feature/web-cli-base-v2）→ 打标签 + npm 发布（见 §七）
- [x] **v0.8（浏览器插件孵化，作者裁决 2026-09-10）立项 + SDDU P0 全流程完成（2026-09-11）**：**F-14 web-cli-plugin** 由 v1.1 提前至 v0.8 作该版主题——Feature 目录 `specs-tree-web-cli-plugin`，phase=validated / status=completed（P0 范围，⚠️ 有条件通过 0 阻塞；全仓 0 fail〔web-cli-plugin 68〕；代码在 feature/web-cli-plugin 未合入发布）
- [x] **v0.8 F-14 P1/P2 全量实现 + TASK-016 内置助手下线执行（2026-09-12）**：**16/16 任务**（P1 TASK-012~015 + P2 TASK-016）；全仓 build/test 0 fail（web-cli-base 483 零回归 / lgdl-web 31 / web-cli-plugin 112 + tsc 0 error）+ E2E 场景 A/B PASS；**Gate-D D-1~D-7 达标 → 已执行内置助手下线**（`lgdl-web/src/ai/*` 移除 + `App.tsx` 摘除，保留 base 机制层 + `web-cli-host`）；回退 = 单提交 `git revert` + `VITE_AI_ASSISTANT_FALLBACK` 默认 off（EC-016 不静默）；**FR-046 发布渠道就绪** = `docs/release.md`；phase=builded 待 review/validate（见 §二 v0.8）
- [x] **v0.8 F-14 SDDU 全流程完成并 validated（2026-09-12）**：review **R3 ✅ 通过 0 阻塞** + validate **R2 ✅ 通过 0 阻塞**；**FR 46/46 · NFR 10/10〔NFR-007 量化实测〕· EC 16/16 · AC 12/12 · 阻塞 0**；全仓 0 fail（web-cli-base 483 零回归 / web-cli-plugin 112）+ 门禁 G-MV3/G-KEY/GATE-011 PASS；代码在 feature/web-cli-plugin 未合入/未发布〔4e537a7〕（见 §二 v0.8）
- [ ] v0.8 收口（SDDU 已 validated，剩人工面）：遗留（非阻塞：C-4/C-5 过渡期关闭 / 真实浏览器人工 UX H0~H10〔含 Gate-D D-3 人工面 H6〕/ 商店发布 S-016 / 扩展 SW 真实内存采样）→ 合入与发布由作者执行（时间不承诺）
- [ ] v0.9（工程质量，原 v0.7→v0.8 后移）立项：F-06/F-11 测试护栏（v0.6 抽取/F-23 框架化/F-25 完备化的护栏后置补课）→ F-08 文档对齐（F-07 已提前至 v0.7 完成）→ F-09/F-10 清理（时间待重排，见 §七）
- [ ] 作者审视会：§五 P-01~P-11 逐项升降级裁决（v0.6 发布后第一周，见 §七；审视产出供 v0.10 立项与 v0.9 合并评估项引用）

### 功能优先级 Top 5（RICE 评分，开放项；明细见 §3.2）

> v1.6.0 起：v0.6 收口项（F-01 48.6 / F-04 36.0 / F-05 35.0 / F-03 31.5，原 Top 4）已全部完成并随 **v0.6.0 发布（2026-09-05）**，**不再列入**；历史评分保留于 §3.2（标注 ✅ 已完成）。下表只计开放项。

| 排名 | Feature | 版本 | RICE Score |
|------|---------|------|------------|
| 🥇 | F-20 原子交付（archify 借鉴批次） | v0.9 | 27.0 |
| 🥈 | F-17 确定性哈希回归（archify 借鉴批次） | v0.9 | 19.2 |
| 🥉 | F-15 产物侧几何审计（archify 借鉴批次） | v0.9 | 14.0 |
| 4 | F-09 W-D2 补全词典清理 / F-16 投影字号预算（并列） | v0.9 | 12.0 |
| 5 | F-08 技术文档对齐（D1/D2/D3/T-D1/L-D1/R-D4） | v0.9 | 11.3 |

> 注（v1.4.0，v1.6.0 更新；**v1.9.0 再更新**）：archify 借鉴批次（F-15~F-22，作者指令 2026-09-02 转正）经 §3.2 **如实评估**，最高 RICE = F-20 原子交付 27.0——v1.5.0 及以前因低于 Top 5 门槛（31.5）未入榜；v0.6 完成项移出后 **F-20 / F-17 / F-15 现居开放项 Top 2~4**。本批次落位 v0.7 系「主题契合（工程质量与文档对齐）+ 作者指令语义权重」驱动（与 F-13/F-14 同理），非 RICE 驱动；RICE 反映其「引擎开发阶段回归资产」的间接价值（详见 §3.2 批次注记）。**（v1.9.0：工程质量版本随作者裁决 2026-09-06 后移为 v0.8.0，本批次与 F-06~F-11 同步后移——上表版本列已更新为 v0.8；Top 5 全部为后移的工程质量项，v0.7〔F-25〕为已完成 Feature 不计开放项。v1.12.0：工程质量版本随作者裁决 2026-09-10 再后移为 v0.9.0——上表版本列已更新为 v0.9。）**
> **v1.11.0 注**：F-07 已提前至 v0.7 分支完成、移出开放项 Top 5——榜首由 F-20（27.0）接替，第 5 位由 F-08（11.3）补入。
> **v1.12.0 注**：v0.8 主题改为「浏览器插件孵化」（F-14，作者裁决 2026-09-10 由 v1.1 提前至 v0.8）——上表 Top 5 仍全部为工程质量项（随工程质量版本后移 v0.9）；F-14 为已规划承诺项（非 RICE 驱动，RICE 3.5 未入榜，见 §3.2）。

### 关键 Milestones

| 日期 | Milestone | 版本 |
|------|-----------|------|
| 2026-09-05 | ✅ **v0.6.0 正式发布**（提前于原 09-12 计划）：收口期工程基建就位（F-01+F-02）+ 发布前置缺陷全部关闭（F-03/F-04/F-05）+ **F-13 ① 独立包抽取/V2 落地（9 包体系）** + **F-23 web-cli-base 框架化**；npm 8 包 0.6.0 发布、583 测试全绿 | v0.6 |
| 2026-09-06 | ✅ **F-25 web-cli-base v2 完备化 SDDU 全流程完成**（validate R1 ⚠️ 有条件通过：全仓 **724 pass / 0 fail / 1 skip**、4 包 tsc + vite build 零错误、headless chromium UI 加载冒烟成功；真实浏览器冒烟收口人工清单 5 项移交） | v0.7 |
| 2026-09-11 | ✅ **F-14 web-cli-plugin P0 最小可用集 SDDU 全流程完成**（specs-tree-web-cli-plugin：spec 46 FR / 10 NFR / 16 EC / 12 AC → plan 12 ADR → tasks 16 任务 9 波次 → build P0 TASK-001~011 → review R1 ❌ 2 阻塞→修复→R2 ⚠️ 有条件通过 0 阻塞 → validate ⚠️ 有条件通过 0 阻塞；全仓 **0 fail**〔web-cli-plugin 68〕、G-MV3 PASS / G-KEY PASS；代码在 feature/web-cli-plugin 未合入发布；P1/P2 待续） | v0.8 |
| 2026-09-12 | ✅ **F-14 web-cli-plugin P1/P2 全量实现 + TASK-016 内置助手下线执行**（16/16 任务；全仓 0 fail〔web-cli-base 483 零回归 / lgdl-web 31 / web-cli-plugin 112〕+ tsc 0 error + E2E A/B PASS；Gate-D D-1~D-7 达标 → 下线执行；回退=单提交 revert + `VITE_AI_ASSISTANT_FALLBACK` 默认 off；EC-016 不静默；`docs/release.md` 发布渠道就绪；phase=builded 待 review/validate） | v0.8 |
| 2026-09-12 | ✅ **F-14 全部 16 任务完成 + SDDU 全流程 validated**（review R1 ❌ 2 阻塞 → R2 ⚠️ → **R3 ✅ 通过 0 阻塞**；validate R1 ⚠️ → **R2 ✅ 通过 0 阻塞**；**FR 46/46 · NFR 10/10〔NFR-007 量化实测〕· EC 16/16 · AC 12/12 · 阻塞 0**；内置助手下线已执行〔O-001〕；测试基线全仓 0 fail〔web-cli-base 483 零回归 / web-cli-plugin 112〕；门禁 G-MV3/G-KEY/GATE-011 PASS；分支 feature/web-cli-plugin 未合入/未发布〔4e537a7〕） | v0.8 |
| 待作者（时间不承诺） | v0.7 收口发布：真实浏览器冒烟收口清单 5 项 → 合入 main（feature/web-cli-base-v2）→ 打标签 + npm 发布（作者裁决 2026-09-06：最近的独立版本） | v0.7 |
| 门槛式启动（时间待作者重排） | v0.8 浏览器插件孵化（F-14 web-cli-plugin，作者裁决 2026-09-10 由 v1.1 提前至 v0.8）：插件立项（协议发现/声明机制设计 + 插件技术栈选型 + 安全边界评审）→ 推进孵化 | v0.8 |
| 2026-09-12 | 作者审视会：§五 P-01~P-11 逐项升降级（v0.6 发布后第一周，见 §七） | v0.10 前置（原 v0.8→v0.9；审视产出供 v0.10 立项与 v0.9 合并评估项引用） |
| 后移待重排（原 2026-09-30） | v0.9 测试护栏补齐（F-06/F-11：layout/cli/router 独立测试全绿，含 archify 组 A 随批收口）——原 v0.7/v0.8 里程碑随后移不成立 | v0.9 |
| 后移待重排（原 2026-10-09） | v0.9 文档零漂移达成（F-08/F-09/F-10 关闭；F-07 已提前至 v0.7 完成）+ **v0.9.0 发布**——原 v0.7/v0.8 里程碑随后移不成立 | v0.9 |
| 后移待重排（原 2026-10-30） | 待审视池首轮审视完成 + v0.10 增强项立项 | v0.10 |
| 2026-11 底 | **v1.0.0 语义稳定首发**（候选；受 v0.7/v0.8/v0.9 排期变更影响，目标窗口待复核、不承诺） | v1.0 |
| 2026-12 起 | v1.1 web-cli 开源线启动（**F-13 ② 开源**，门槛式：F-13 ① 已在 v0.6.0 落地 ✅ + 作者开源决策完成 + v1.0 首发；F-14 已移出本版、提前至 v0.8） | v1.1 |

---

## 一、素材甄别口径（规划的依据与红线）

本 Roadmap 的一切版本承诺建立在这套甄别规则上（来源：《业务全景/空白与待确认.md》§3/§5、《docs-overview.md》扫描口径声明）：

| # | 规则 | 内容 | 对本 Roadmap 的约束 |
|---|------|------|---------------------|
| 1 | **v0.6 混合段降级** | Unreleased 段混有未经作者审视的 AI 规划记录，作者原话「后续的规划仅记录，不作为参考」（G5-Q5） | 规划不得把语义 diff / CI 自动渲染 / SSE / serve 代理等 AI 规划项当作既定事实写进未来版本，除非标注「AI 提案待审视」 |
| 2 | **What/Why 分层引用** | 仅带验证记录的已实施工程事实（如测试全绿、commit 证据）可作 What 层引用 | v0.6 已实施工程（自研布局、group-as-node、评审闭环、Bug 修复）有 commit + 测试验证 ✅；其 Why 动机一律不编配故事 |
| 3 | **AI 自主决策标注** | 9 图类型（G3-Q6）、v0.6 路线图（G3-Q5）、YAML 语法形态（G4-Q3）均系 AI 自主规定，作者保留调整权 | 相关决策进入「待审视池」而非「已确认事实」 |
| 4 | **漂移以代码为准** | 存量文档（README/docs/CHANGELOG）与代码实际不一致时一律以代码为准（D1-D8 已记录） | 本 Roadmap 不修正任何存量文档，仅规划修复动作 |

**作者收尾答复（2026-08-30 确认）**：叙事主轴 = 哲学层面（语义优先公理先行 + AI-first）；访谈无其他遗漏必写项。

---

## 二、版本时间线

### v0.5.0（2026-08-23）✅ 已发布

**主题：Web AI 助手**。核心交付（CHANGELOG 0.5.0 段，全部带 commit 证据）：
- 原生 function calling 三平级工具（lgdl-web-cli / lgdl-web-op-cli / lgdl-web-fetch）——ADR-007
- 双 CLI 物理分离 + core 命令注册表单一实现（19 命令）——ADR-004
- 多厂商接入（8 厂商）+ 设置面板 + 连接测试
- next-actions 推荐胶囊、「AI 推荐 → 用户点选 → AI 执行」闭环
- 命令自文档化 `--help`（从 COMMANDS 动态生成）、方法论自动加载
- 共享操作层（LgdlOperation 9 种）——ADR-008；error-only 严格校验——ADR-005

**遗留到 v0.6 的已知缺陷**（本 Roadmap 建议 v0.6 收口期修复）：W-D1（lgdl-web-fetch 未注册进 OpenAI 兼容端点 tools，4/5 可直连厂商的 AI 无法 fetch）。

### v0.6.0（2026-09-05 正式发布）✅ 已发布

**发布声明（2026-09-05，作者发布操作确认）**：代码已合入 main（`c92bf3d`，feature/group-as-node 已删除、仓库仅 main 分支）；v0.5.0（`10f66d0`）+ v0.6.0（`fecb9b2`）标签已打并推送；**npm 8 包全部发布 0.6.0**（@lgdl/{lgdl-core,lgdl-layout,lgdl-router,lgdl-render,lgdl-cli} + @lgdl/{web-cli-base,lgdl-web-cli,lgdl-web-op-cli}——web 侧三包**首次发布**；lgdl-web 为 private 不发包）；全局 lgdl-cli 已升级 0.6.0 并冒烟验证通过（init/add-node/add-edge/render/status 全绿）；全仓测试 **583 = 582 pass + 1 skip**。**v0.6 实际时间**：2026-09-01 ~ 09-05，**提前于原计划（2 周窗口 09-01~09-12）发布**——发布前置缺陷全部关闭后即发。

**版本内容溯源**：v0.6 的 Unreleased 段曾是**混合段**（已实施工程事实 What 层 + AI 规划记录 Why 层并存）；本 Roadmap 此前按甄别规则拆解，收口期后全部兑现。CHANGELOG 0.6.0 段已收尾：补 F-23 条目、修 D6（DSL 双语中间态 → 拒绝旧语法口径）、修 D7（core 测试数 314→267 勘误）、加发布说明（P-04 serve 代理「未实现、待作者审视」如实标注 + 语义 diff/CI 渲染/SSE 不在本版本）。

#### ✅ 已实施工程事实（What 层，当日实测/commit 验证，全部随 v0.6.0 发布）

| 工程 | 验证记录 | 状态 |
|------|---------|------|
| 自研 Sugiyama 分层布局（layered.ts，零 dagre/elkjs，ADR-001 终态） | package-lock grep dagre/elkjs = 0 处；core 281 / render 21 / router 8 / web 107 全绿（2026-08-30 实测） | ✅ 完成 |
| group-as-node 语义模型统一（ADR-002）：group 蜕化为 `kind:'group'` 节点，`groups:` 旧语法 loud reject | parser.ts:53-55 注释 + 实测拒绝；serialize.ts 只输出 `kind: group` | ✅ 完成 |
| 分组感知两层布局（layoutGrouped，分组框超节点） | layout 文档 §4 实读 + 示例分组框分离验证 | ✅ 完成 |
| AI 实战与视觉评审闭环（docs/reviews-2026-08-24/） | 9 组示例三件套 + bugs.md 改进清单落盘 | ✅ 完成 |
| 评审 Bug 修复（正交绕障布线、标签避让、甘特自适应刻度、扇出标签合并、混排文本修复） | CHANGELOG v0.6 Bug 修复段 + 测试绿 | ✅ 完成 |
| 以上全部随 v0.6.0 发布（最终基线） | CHANGELOG 0.6.0 段（2026-09-05）+ 全仓 **583 = 582 pass + 1 skip**（lgdl-core 267 / lgdl-web-cli 84 / web-cli-base 73 / lgdl-web 41 / lgdl-web-op-cli 15 / lgdl-render 94+1skip / lgdl-router 8） | ✅ 已发布 |

#### ✅ 收口五件套（F-01~F-05）——发布前置，全部已关闭（随 v0.6.0 发布）

收口期原则不变——**带已知缺陷发布将直接打脸「语义优先、可预测」的立身之本**；五件套全部关闭后才发版，v0.6.0 **未带已知缺陷发布**（2026-09-05）：

| Feature | 缺陷/任务 | 来源 | 落地结果（CHANGELOG 0.6.0「v0.6 发布前置收口」段） |
|---------|------|------|---------------------|
| F-01 | deploy-pages.yml 未构建 router 包（合入 main 后 Pages 构建失败） | G1 | ✅ 已关闭：deploy-pages.yml 补 lgdl-router 构建（干净依赖下零 TS2307），已随 v0.6.0 合入 main |
| F-03 | render 发射 `groups[i]` loc ↔ web locate.ts 按顶层 `groups:` 解析 → 分组盒/泳道点击无法定位 + `preview-click` 假成功 | R-D2（+C-D2） | ✅ 已关闭：renderer 三处发射 `groups[i]` → `nodes[i]`（group-as-node 语义统一），分组/泳道定位恢复；locate.test.ts fixture 现代语法化 |
| F-05 | preview-click 定位失败仍回「✓ 已定位」假成功反馈 | W-D3 | ✅ 已关闭：App.tsx jumpToIssue 返回 boolean、handleWebOp 按真实结果反馈 |
| F-04 | lgdl-web-fetch 未注册进 OpenAI 兼容端点 tools | W-D1 | ✅ 已关闭：被 **F-23 框架化彻底解决**——web-fetch 为 web-cli-base 内建命令，deriveTools 自动注册进 5 工具（注册点随框架收敛，非一行补丁） |
| F-02 | CI 测试工作流缺失（回归仅人肉触发） | G2 | ✅ 已关闭：ci.yml（push main + PR；npm ci → build 依赖序 → test workspaces） |

#### 📋 待审视（AI 提案，不承诺、不排期，见 §五）

语义 diff / CI 自动渲染 / SSE 流式 / lgdl-cli serve 代理 / set-type / Mermaid 导入增强等（G5 已验证代码中无实现痕迹）——v0.6.0 **发布说明已如实标注**：serve 代理（P-04）「未实现、待作者审视」、语义 diff/CI 渲染/SSE **不在本版本**；是否排期由作者审视会裁决（§七）。

#### ✅ F-13 ① web-cli 独立包抽取（作者指令提前，2026-08-31）——已完成，随 v0.6.0 发布

**作者指令**：web-cli 独立包抽取提高优先级，放到当前开发的版本（原定 v0.8 → 提前至 v0.6）。非审视池项，作者直接立项（来源见 §3.1 F-13 行）。**落地状态：✅ 已完成**——抽取与 V2 重构一体交付（specs-tree-web-cli-v2，phase=validated，2026-08-31），9 包体系随 v0.6.0 发布；npm 8 包 0.6.0 全部可安装（web 侧三包首次发布）。

**抽取内容（落地实录）**：monorepo 由 6 包扩展为 **9 包体系**——6 包加 lgdl 前缀（core/layout/router/render/cli/web → @lgdl/lgdl-*，web = lgdl-web 为 private）+ 新增 @lgdl/web-cli-base（AI 可调用命令执行框架，纯机制零 LGDL 依赖）、@lgdl/lgdl-web-cli（图内容操作 9 增量命令）、@lgdl/lgdl-web-op-cli（UI 操作）；web-fetch 中性化纳入 web-cli-base。抽取对象 = 与 LGDL 领域解耦的「AI 可调用命令执行框架」底座（命令管线 + DomainApi<Op,Doc> 泛型契约 + LLM 工具封装）；web 侧接线迁出。**零破坏**：测试守恒 420 全绿（迁移零语义改动，逐字节一致）。开源细节（许可/命名/仓库/发布管道）仍**决策待定**，属第二步（F-13 ②，v1.1）范畴，本步不预设立场。

**排布复盘**：按原计划「收口五件套先行 → F-13 ① 紧随其后」（第 2 周窗口）执行——**未超窗**，未在刚修复的 source-loc 链路上叠加抽取风险；F-02（CI 测试工作流）按调整后方案充当 v0.6 内基础回归护栏。

**护栏后置补课（转原 v0.7、现 v0.9 首要任务）**：原规划 F-13 ① 依赖 v0.7 测试护栏（F-06/F-11）先行——提前至 v0.6 后该依赖**不再成立**，调整为：①v0.6 内 F-02（CI 测试工作流）作基础护栏 ✅ 已落地；②抽取时**手动全量回归门禁** ✅ 已执行（420 → 583 基线）；③抽取落定后原 v0.7（现 v0.9，工程质量版本）立即补 F-06/F-11 专项测试（**护栏后置补课，立项首位**，见 §四/§六 风险 9/§七）。

#### ✅ F-23 web-cli-base 框架化（作者对话 2026-09-05 立项，SDDU 全流程完成）——已随 v0.6.0 发布

**立项来源**：作者对话 2026-09-05（web-cli-base 定位讨论，**bash 类比**——web-cli-base 应像 bash：完整自足的 AI-CLI 环境〔shell 路由 + 内建命令 + 可注册业务命令〕，而非「机制零件 + 碎片工具」集合）。上游 = **specs-tree-web-cli-v2**（v0.6 V2，F-13 ① 抽取线，✅ 已完成：9 包体系 + web-cli-base 纯机制化零 lgdl 依赖，420 测试全绿）；本 Feature 为其后的**框架化进阶**（补齐 bash 缺失的 shell 路由层）。Feature 产物目录：`.sddu/specs-tree-root/specs-tree-web-cli-base-framework/`。

**作者决策（2026-09-05，四项）**：①新 Feature 立项并纳入 ROADMAP（本小节即登记）；②连带落地全局 delay（统一路由入口挂最小间隔）；③完全不兼容（内测阶段、无历史债，允许破坏性重构）；④核心原则——非 LGDL 特有场景能力一律归 web-cli-base 复用，lgdl-web 只留 LGDL 特有。

**落地内容（五项，2026-09-05 完成）**：
- **CommandRouter 路由下沉（base/router.ts）**：ToolEntry 统一注册条目（schema / 执行器 / 文本前缀 / help / 顺序 / delay 单点登记）→ dispatch / deriveTools / deriveCommand / listHelp / helpFor / **未知工具显式报错**（`✖ 未注册工具 "x"`，去静默兜底）——路由知识从 lgdl-web 散落 4 处（schema 组装 / 前缀映射 / 分发 if/else / help 聚合）收敛进注册表单一数据源。
- **全局 delay（base/delay.ts）**：DelayGate 挂 CommandRouter **统一分发入口**（命令间最小间隔 = max(delayMs, 执行耗时)，首分发不等待）；base 中性默认 0 / lgdl-web 场景 600ms / 钳制 [0,5000] + 一次警告；sleep 以 delayMs:0 显式免除、不双重叠加（EC-005）。
- **domain-neutral 接线面上收 base**：AgentRunner 中性 agent 循环（runner.ts，events 8 + hooks 2，**零 react import**）；schema 收集 / help 注册即得 / 文本前缀派生 / 文案中性化（base 零 LGDL 残留）——任何项目装 web-cli-base 即得完整 AI-CLI，无业务包耦合。
- **注册收敛**：lgdl-web-cli / lgdl-web-op-cli 各 tool-entry.ts **整体注册为工具**（C 档语义零改动）；op-cli OpHandlerRegistry 顶层角色移交 CommandRouter（executor 内部机制保留）；web-fetch / sleep / web-cli-help 3 内建命令自动注册（业务注册序在前、内建固定置末）。
- **lgdl-web 场景收敛**：session.ts **单一组装点**（delayMs=600 + 注册 2 业务工具 + runAgent 装配）；AiPanel 分发/特判/聚合面删除（改经 runner/session 驱动）；provider buildTools 手写数组删除 → router.deriveTools() 派生；**删除面 4 文件**（base + 场景 help-aggregator ×2 / lgdl-web.ts / lgdl-web.test.ts；D-005 增删有据、测试承接等价）。

**验证记录（validate-report.md v1.0 + review-report.md v1.0，2026-09-05）**：全仓 9 包 `npm test` **582 pass / 0 fail / 1 skip**（render env-gate 为既有门控；web-cli-base 71→**73** / lgdl-web-cli 84 / lgdl-web-op-cli 15 / lgdl-web 41 / core 267 / render 95 / router 8）；4 包 `tsc --noEmit` 零错误 + lgdl-web vite build 退出码 0；grep 13 组零残留 **CLEAN**；自主脚本 4 个共 67 断言全过（DelayGate 验收式 20 / deriveTools 顺序等价旧 provider.test:191 + 四链 25 / runner 机械闭环 17 / IMP-1 wire 5）；Review R1 **28 PASS / 0 WARN / 0 FAIL / 阻塞 0**（改进 4：IMP-1/2/4 已于 validate 处理，IMP-3 记遗留）；结论 ⚠️ 有条件通过、门禁指标全达标。**本 Feature 已随 v0.6.0 正式发布（2026-09-05）**，CHANGELOG 0.6.0 已补「web-cli-base 框架化（F-23）」条目。**遗留（非阻塞，移交整体收口）**：① IMP-3 spec FR-014/EC-005 措辞对齐（「完成时刻」→「执行起点」，实现已满足验收公式，仅文档文字）；② AC-008 真实 AI 实战闭环 + testConnection 各厂商实测（需浏览器 + API Key，机械面已由脚本承接）。

**下游关联**：本 Feature 的统一注册/路由模型是 **F-14 web-cli-plugin（v0.8 线，作者裁决 2026-09-10 由 v1.1 提前）** 协议发现机制的「可能前置雏形」（spec A-002 标注：仅关联、不承诺、不预设立场）；同时为消费端铺平「base 装即自足」基础。

### v0.7.0（web-cli-base 面向浏览器生态位的 agent 能力完备化）📋 已 validate、待合入发布

**版本位裁决（作者，2026-09-06，spec 开放点 O-008）**：本版本 = **最近的独立版本**——作者将原本列在 v0.7 的「工程质量与文档对齐」内容整体后移（见下方 v0.9.0），v0.7 由 **F-25 web-cli-base 完备化**占据。本 Roadmap 不编造发布时间承诺：代码在独立分支 `feature/web-cli-base-v2`（**未合入 main / 未发布**），收口动作（真实浏览器冒烟人工清单 → 合入 → 打标签/npm 发布）由作者执行。

#### ✅ F-25 web-cli-base 面向浏览器生态位的 agent 能力完备化（作者对话 2026-09-06 立项，SDDU 全流程完成）——v0.7 承载，待合入发布

**立项来源**：作者对话 2026-09-06（web-cli-base 面向浏览器生态位 agent 能力完备化）。上游 = **specs-tree-web-cli-base-framework**（F-23 框架化，✅ 已随 v0.6.0 发布）——F-23 交付框架机制层（CommandRouter/AgentRunner/DelayGate + 5 工具），本 Feature 在其上补齐浏览器生态位能力。前置输入：`docs/research/agent-capabilities/`（2026-09-06 调研，10 框架能力矩阵 + MVP/增强/进阶分层）。Feature 产物目录：`.sddu/specs-tree-root/specs-tree-web-cli-base-v2/`。

**方向公理（作者裁决 2026-09-06，discovery D-5）**：**面向浏览器生态位设计工具集**——不照搬面向操作系统的工具集（read/write/edit/bash/grep/glob 是 OS/文件系统生态位语义），而是面向浏览器原生组成（DOM / 存储 / Web API / Worker / fetch / Permissions）做生态位对应设计；**OS 生态位能力显式不做、代理给未来 os-cli-base**（scope NG-001~009 高内聚守职责边界）。

**作者裁决（2026-09-06）**：①O-001 首批九域全做；②O-002 不可承载面 = 高内聚守职责边界，代理给未来 os-cli-base；③O-003 权限门禁 = **三者组合**（opencode 三元组骨架 + dsh 可插拔策略 + WorkBuddy 技能级 allowed-tools）；④O-008 版本落点 = 最近的独立版本（原 v0.7 内容后移，即本小节）；⑤spec 开放点 I-01~I-09 全部采纳建议默认（S-01~S-09，spec v1.1 冻结）。

**成果（What 层，2026-09-06 全流程产物）**：
- **46 FR 十三组**（横切四柱 REG 注册表 v2 / PRM 权限门禁 / SES 会话 / LGDL+BSL 接线与契约 + **九域浏览器原生工具集**：DOC 内容文档 / STR 存储 / SRC 检索 / NET 网络 / DOM·UI 自动化 / EXE 执行计算 / TSK 任务状态 / EXT 扩展生态位 skill·MCP / 会话上下文）+ 10 NFR + 15 EC + 12 AC
- **15 任务 / 9 波次**（P0 横切四柱 + P1 域工具主体 + P2 增强试点 + GATE）全绿
- **权限门禁三者组合落地**：PermissionGate 裁决管线（规则集/策略对象/allowed-tools/ask 契约/EC-014 deny 优先）+ AuditSink 审计 + platform 授权失败转译
- 全仓 **724 pass / 0 fail / 1 skip**（F-23 基线 582 → 724，v2 净增 142：web-cli-base 205 / lgdl-web 51 / lgdl-web-cli 84 / lgdl-web-op-cli 15 / lgdl-core 267 / lgdl-render 94+1skip / lgdl-router 8）；4 包 `tsc --noEmit` 零错误 + vite build + base 独立构建；专项文件 158 例 + 自主脚本 6 个 37 断言 + V14 EC 15/15 + V15 生态位 grep 15/15 CLEAN

**验证记录（validate-report.md v1.0 + review-report.md v1.0，2026-09-06）**：Review R1 **49 PASS / 4 WARN / 0 FAIL / 0 阻塞**（改进 IMP-1~5：IMP-1 eval-wasm untrusted 默认拒 / IMP-2 lgdl-web IDB 载体注入 / IMP-3 audit ask 死类型 / IMP-5 exec-remote trust 标记已修复，门禁不破 base 204→205；**IMP-4 dom 只读子命令 risk 分级记遗留附实现建议**）；validate V1~V17 全维度真实执行（含 headless chromium UI 加载冒烟成功）；结论 **⚠️ 有条件通过、门禁指标全达标**。**遗留移交收口人工清单 5 项**（需真实浏览器 + API Key）：① V4 / F-23 AC-008 真实 AI 闭环补跑；② V13 真实浏览器交互面（真 IDB/OPFS/授权/DOM/worker/多标签）；③ IMP-4 dom 子命令 risk 分级；④ worker-session trust 差异声明（记录在案）；⑤ DB 名旧库清理（未发布无迁移）。validate 顺手修复 storage-idb 缺省 DB 名 `lgdl-web-cli-base`→`web-cli-base`（NFR-001 中性纯度）。

**版本落点与下游**：代码在独立分支 **feature/web-cli-base-v2**，**v0.7.0 = 最近的独立版本（作者裁决），发布待作者合入 + 真实浏览器冒烟收口，时间不承诺**；下游关联——①F-06/F-11 测试护栏（v0.9 工程质量立项首位）对 F-25 同为「护栏后置补课」（v2 净增 142 测试后更需独立护栏）；②v2 会话/任务/扩展能力为 v0.8 线消费端（F-14）提供「浏览器生态位完备」底座（仅关联、不承诺；F-14 已提前至 v0.8，见 §二 v0.8）。

**v0.7 同批登记（v1.10.0，2026-09-08）——F-26 web-cli-base v4（浏览器外壳纵深与事件流）**：作者裁决 O-012 = v4 落 **v0.7.0 同批叠加**（v0.7 内第三个 Feature，与 F-25 v2 / v3 同分支 feature/web-cli-base-v2 代码位开发，v3 为 v0.7 内第二个 Feature 见其 Feature 目录）；SDDU 推进至 build 完成（phase=builded，2026-09-08）：事件 push/缓冲/订阅通道（event-bus.ts + env.events + events 工具 11 子命令 + platform-events.ts 浏览器观察源）＋ 页内快赢切面（dialog override/cookie 读写/富剪贴板/shadow·同源 iframe 穿透/合成 touch/网络拦截 P2）＋ EXT 统一转译面与契约预留（ext-attribution.ts）——**F-14（web-cli-plugin，作者裁决 2026-09-10 由 v1.1 提前至 v0.8）契约预留继承基线**（FR-026/027/ADR-012：ATTRIBUTION_MAP 覆盖 §2.5 🔴 列 12 能力，仅供 F-14 立项继承/修订，非承诺；F-14 门禁不变）。P2 验证门结论（真实 chromium headless）：**G-01 PASS / G-02 PASS / SHD 冒烟 PASS**（记录于本 Feature build.md §5 与 validate 移交清单）。**SDDU 全流程完成（2026-09-08）**：review ⚠️ 有条件通过（0 阻塞：37 通过 + 5 警示 + 0 失败，改进建议均非阻塞）+ validate R1 **V1~V17 全✅**（FR 30/30 · NFR 8/8 · EC 12/12 · AC 10/10，全仓 1007 pass / 1 skip / 0 fail，G-01/G-02 PASS，真实 DeepSeek AI 闭环 11/11，结论 ⚠️ 有条件通过 = 2 低风险改进观察 + 2 人工/配置待基线非阻塞）——**v0.7 同批三 Feature（v2+v3+v4）齐全**（F-25/F-26 同批叠加，本 Feature phase=validated）；代码在分支 **feature/web-cli-base-v2 待合入 main**（发布与 F-25 同批待作者合入，时间不承诺）。

### v0.8.0（浏览器插件孵化——F-14 web-cli-plugin）✅ 已完成（SDDU 全流程 validated，0 阻塞；门槛式启动，时间待作者重排）

**版本位裁决（作者，2026-09-10）**：开启 **v0.8 = 浏览器插件孵化**——将 **F-14 web-cli-plugin** 由 **v1.1 提前至 v0.8**，作为该版本主题；原 v0.8.0「工程质量与文档对齐」→ **v0.9.0**、原 v0.9.0「AI 增强与生态」→ **v0.10.0**、v1.0.0「语义稳定首发」不变（时间窗口标注待复核）、v1.1.0「web-cli 开源线与生态消费端」= 仅 **F-13 ②**（开源）——F-14 移出 v1.1。本 Roadmap 不编造发布时间承诺：本版门槛式启动、时间待作者重排。

#### F-14 web-cli-plugin（浏览器插件，web-cli 生态消费端，作者规划 2026-09-01）——v0.8 承载

**作者原话**：「提供浏览器插件，web-cli-plugin，配置完大模型的 key 之后，就支持借助打开的网站的 web-cli 完成业务」（2026-09-01）。**非审视池项**，等同 F-13 的作者指令性质——可直接写入规划承诺；但技术细节（协议发现方案 / 插件架构）**不预设立场**，留给未来立项。

**定位（作者 2026-09-10 补充）**：**独立于 LGDL 的浏览器插件**（web-cli-plugin）——可作用于 LGDL 的 Web 页面、**替代现有的内置 AI 助手**。原为作者规划 2026-09-01（非审视池项），登记于 v1.1 开源线；现作者裁决提前至 **v0.8 作为该版本主题**。作为 web-cli 生态的**消费端新形态**——在 web-cli-base（公共框架层，v0.6.0 发布：V2 + F-23 框架化完成）/ lgdl-web-cli、lgdl-web-op-cli（LGDL 领域适配层，v0.6.0 发布）之上新增第三层：**通用消费端**。让任何支持 web-cli 协议的网站都能被 AI 驱动（不限于 LGDL 工作台）。

**隐含新基础设施**：web-cli **协议发现/声明机制**（网站如何声明自己支持 web-cli、暴露哪些工具）——**当前不存在**，属 v0.8 内新立项；具体方案（声明格式 / 发现流程 / 安全约定）留待立项设计，本 Roadmap 不编造。

**依赖（详见 §四）**：①web-cli-base 框架（✅ **v0.6.0 已发布**：V2 9 包体系 + F-23 框架化——CommandRouter/AgentRunner/DelayGate「装即自足」，583 基线；**F-25 完备化〔v0.7 待发布〕后为浏览器生态位自足**；v0.9 补 F-06/F-11 护栏后基础更稳）；②web-cli 协议发现/声明机制（❌ 缺失，新基础设施）；③插件运行时（❌ 新工程领域：浏览器扩展开发）；④LLM key 管理（LGDL web 多厂商 key 管理先例可参考，非新增难点）。

**与 F-13 ② 的排布**：F-13 ②（开源）原为 F-14 生态价值面的前置（外部站点须在协议公开后才可规模化接入）；**F-14 提前至 v0.8 后与 F-13 ② 不再同线并行**——两线解耦：F-14 门槛式推进（v0.8），F-13 ② 照常按 v1.1 门槛推进；F-14 不阻塞 F-13 ②（F-14 为其生态价值面提供先行验证/驱动，仅关联、不承诺）。

**门槛（F-14 自身立项动作）**：①F-13 ① 落地（✅ **v0.6.0 已完成并发布**，web-cli-base 经 F-23 框架化后对消费端「装即自足」）；②F-14 立项动作：协议发现机制设计 + 插件技术栈选型 + 安全边界评审（立项时展开）。**原 v1.1 线门槛中「作者开源决策完成」「v1.0 语义稳定首发」随 F-14 提前至 v0.8 而不再构成本版门槛**（作者裁决 2026-09-10 覆盖原 v1.1 归属论证）——具体门槛以未来立项为准，本 Roadmap 不预设立场。时间不承诺、门槛式启动。

#### F-14 落地进展（v1.13.0 登记，2026-09-11）

**Feature 已立项**：`.sddu/specs-tree-root/specs-tree-web-cli-plugin/`（v0.8 主题；phase=validated / status=completed〔P0 范围〕）。

**SDDU P0 全流程完成（What 层已实施工程验证）**：discovery → spec（**46 FR / 10 NFR / 16 EC / 12 AC**）→ plan（**12 ADR**）→ tasks（**16 原子任务 / 9 波次**）→ build（**P0 TASK-001~011 实施**）→ review（**R1 ❌ 2 阻塞 → 修复 → R2 ⚠️ 有条件通过 0 阻塞**）→ **validate（⚠️ 有条件通过，0 阻塞）**。

**P0 范围与测试基线**：全仓 **0 fail**——`web-cli-base 483` / `lgdl-web 75` / **`web-cli-plugin 68`** / `lgdl-core 267` / `lgdl-render 94+1skip` / `lgdl-router 8` / `lgdl-web-cli 84` / `lgdl-web-op-cli 15`；插件 `tsc` 0 error；**G-MV3 PASS**（MV3 权限最小化 + SW 可达）/ **G-KEY PASS**（火山端点 HTTP 401 → 3 端点可直连）。

**作者裁决（2026-09-10，已在 Feature 内落盘）**：O-001 v0.8 内代码下线内置助手（**对象区分**：下线 AI 助手层 / 保留页内 web-cli-base 机制层）；O-002 通用任意站点优先；O-003 不预设协议形态；O-008 per-origin 授权；O-009 只读默认 + 写面确认；O-010 声明默认 untrusted；O-012 外壳能力后置（S-012）；P1 五项采纳默认（S-004/S-005/S-007/S-011/S-015）。

**P1/P2 实现 + 下线执行（v1.14.0 登记，2026-09-12）**：P1 TASK-012~015（协议完善 / UI 操作 + 事件桥 / 风控 + 合规迁移文档 / 可选 DOM 工具面）+ P2 TASK-016（**发布渠道 `docs/release.md`** + **Gate-D 内置助手下线执行**）全部实现，**16/16 任务**；全仓 **build/test 0 fail**（`web-cli-base 483` 零回归 / `lgdl-web 31` / `web-cli-plugin 112` / 插件 tsc 0 error）+ E2E 场景 A/B PASS。**Gate-D D-1~D-7 达标 → 已执行下线**：`packages/lgdl-web/src/ai/*` 移除 + `App.tsx` 摘除助手接线（保留 base 机制层 + `web-cli-host`）；回退 = 单提交 `git revert` + `VITE_AI_ASSISTANT_FALLBACK` 默认 off；**EC-016 不静默** = 页内静态迁移告知。**遗留（非阻塞）**：C-4/C-5 过渡期关闭 / Gate-D D-3 人工面 H6 与真实浏览器人工 UX（H0/H2/H4/H6/H7/H8/H9/H10）/ 商店发布（S-016）/ 真实 SW 内存采样。

**版本落点**：代码在分支 **feature/web-cli-plugin（未合入 main / 未发布；最新 `4e537a7`）**，P0 基线 HEAD `1a1c7cf`；**SDDU 全流程已完成并 validated（2026-09-12）**，本 Roadmap 不编造发布时间承诺——合入与发布由作者执行。

#### F-14 完成进展（v1.15.0 登记，2026-09-12）

**SDDU 全流程完成并 validated（0 阻塞）**：discovery → spec（v1.3，**46 FR / 10 NFR / 16 EC / 12 AC**）→ plan（**12 ADR**）→ tasks（**16 原子任务 / 9 波次**）→ build（P0 TASK-001~011 + P1 TASK-012~015 + P2 TASK-016，含 R1 修复轮 + 遗留清账轮）→ review（**R1 ❌ 2 阻塞 → R2 ⚠️ → R3 ✅ 通过 0 阻塞**）→ **validate（R1 ⚠️ → R2 ✅ 通过，0 阻塞；phase=validated / status=tracked）**。

**指标（100% 达标）**：FR **46/46** · NFR **10/10**（NFR-007 已量化并实测）· EC **16/16** · AC **12/12** · **阻塞 0**。

**关键交付**：`packages/web-cli-plugin`（MV3 三面 + 站点中立协议 + per-origin 权限门禁/审计 + 风控护栏 + BYOK + 事件桥 + dom-agent）+ LGDL 暴露点 `web-cli-host` + `docs/{protocol,dev,compliance,migration,gate-d,release,smoke-checklist,capability-matrix}.md` + R8 E2E `test/e2e/fullchain.mjs`（`npm run test:e2e`）。

**内置助手下线已执行（O-001）**：`packages/lgdl-web/src/ai/*` 8 文件移除 + `App.tsx` 摘除助手接线（**对象区分**：`web-cli-host` + base 机制层保留）；回退预案 `VITE_AI_ASSISTANT_FALLBACK` 默认 off + 单提交 revert 实测可行；EC-016 不静默告知落地。

**测试基线与门禁（全仓 0 fail）**：`lgdl-core 267` / `lgdl-render 94(+1 skip)` / `lgdl-router 8` / `lgdl-web 31`（ai 测试删除为 TASK-016 授权范围，-47）/ `lgdl-web-cli 84` / `lgdl-web-op-cli 15` / **`web-cli-base 483`（零回归）** / **`web-cli-plugin 112`**；**G-MV3 PASS / G-KEY PASS（火山端点 HTTP 401）/ GATE-011 PASS**。

**剩余人工面（非阻塞，移交人工/后续里程碑）**：H0~H10 真实浏览器人工 UX（手势注入 / side panel 交互 / 真实 LLM / LGDL 真实页写回 UX / 风控·事件·ask 真实 UI）· C-4/C-5 过渡期关闭（移除 flag）· S-016 商店发布 · 扩展 SW 真实内存采样。

### v0.9.0（工程质量与文档对齐——原 v0.7→v0.8 内容整体后移）📋 规划（时间待重排）

> **v1.9.0 后移注（作者裁决 2026-09-06，O-008）**：本节原为 v0.7.0（2026-09 中下旬、约 4 周）；因 F-25 web-cli-base 完备化落「最近的独立版本」（v0.7.0），本节**整体后移为 v0.8.0**。原里程碑（09-30 测试护栏全绿 / 10-09 发布）**不再成立**；时间待作者按 F-25 发布节奏重排（不预设立场、不编造时间承诺）。本节内 Feature 表 / 排布说明原样保留（内容不变，仅版本位后移）。
>
> **v1.12.0 再后移注（作者裁决 2026-09-10）**：因 v0.8 改由 **F-14 浏览器插件孵化**占据（见上），本节**再由 v0.8.0 后移为 v0.9.0**（原 v0.7 → v0.8 → v0.9）。内容不变，仅版本位再后移。

**主题：工程质量与文档对齐**——把「代码是干净的、文档是干净的、回归是有护栏的」确立为工程基线。

**v0.9 双轨结构（v1.4.0 扩展；v1.6.0 更新；v1.9.0 版本位由 v0.7 后移；v1.12.0 由 v0.8 再后移）**：主线 = 对齐与护栏（**F-06/F-11 测试护栏 = v0.6 抽取/F-23 框架化/F-25 完备化的「护栏后置补课」，立项首位**；F-02 已随 v0.6.0 落地，不再占 v0.9）+ 文档对齐（F-08/F-09/F-10；F-07 已提前至 v0.7 完成）；并行线 = **archify 借鉴批次「验收闭环机械化」（F-15~F-22，作者指令 2026-09-02 转正，依据 lessons-for-lgdl.md v1.1）**——lessons-for-lgdl.md §5（:248-258）确认该批与本版主题（工程质量与文档对齐）天然同主题（验收类借鉴并入既有 Feature 加内容权重），无需开新版本。门禁落位修正详见下方批次小节。

| Feature | 内容 | 来源 | 优先级 |
|---------|------|------|--------|
| ~~F-02~~ | ~~CI 测试工作流~~（**✅ v0.6.0 已落地**：ci.yml 随 2026-09-05 发布，push main + PR、build 依赖序 + test workspaces——v0.9 不再承载） | G2 | P0 |
| F-06 | layout/cli 两包独立测试补齐（布局是核心卖点，回归无直接护栏；**v0.6 抽取/V2/F-23 的护栏后置补课**） | G4 / L-D2 | P1 |
| F-11 | router 包健康化：降级路径专项测试（R-D3）+ routeDefault 兜底测试（R-D5）+ recentreExit 死代码清理（R-D1） | R-D3/R-D5/R-D1 | P2 |
| ~~F-07~~ | ~~README 门面对齐（D4/D5/D8/G3）~~（**✅ 已提前至 v0.7 分支完成**，2026-09-10：版本行 v0.7 / 版本历史 v0.7 行 / 架构树 web-cli-base 浏览器生态位描述 + 命令数 9 / 球链网状隐喻标题修正 / v0.4 标题错位修正 / serve 旧承诺如实标注；v0.9 不再承载） | D4/D5/D8/G3 | P1 |
| F-08 | 技术文档对齐：design.md elkjs 过时（D1）、lgdl-spec groups 旧语法（D2）、lgdl-spec LAYOUT_ENGINE（D3）、~~CHANGELOG 双语中间态（D6——✅ 已随 v0.6.0 收尾：拒绝旧语法口径）~~、~~测试数 314→281 勘误（D7——✅ 已随 v0.6.0 收尾：core 314→267）~~、design.md kind 8→9（T-D1）、layout description（L-D1）、render PNG 归因（R-D4） | D1/D2/D3/D6/D7/T-D1/L-D1/R-D4 | P1 |
| F-09 | Web 补全词典旧语法残留清理（TOP_KEYS 含 `groups` 等） | W-D2 | P2 |
| F-10 | layoutDocument async 签名清理（elkjs 时代遗留，0 处 await） | G6 | P2 |
| F-15 | 产物侧几何审计：render 出口纯几何审计（非有限坐标/斜段/边穿节点/标签压框/泳道越界），失败即 exit 非零拒绝（error-only 同构）；通过后打一行几何摘要到 stdout；**与 F-11 同批执行**（R-D3/R-D5 兜底分支 = 审计专项测试载体，审计函数建议留 router 纯几何） | **作者指令 2026-09-02 转正**（lessons-for-lgdl.md v1.1 §3 P1-1，:114-125） | P1 |
| F-16 | 投影字号预算：layout 阶段按参考容器宽先算缩放后最小字号写入 LayoutResult/几何摘要；CLI render/status 输出预算值（warning 级，不进 core error-only）；Web 预览低于安全值报提示；预算口径文档经 F-08 载体 | **作者指令 2026-09-02 转正**（lessons-for-lgdl.md v1.1 §3 P1-2 + §4.2，:127-138,212-215） | P1 |
| F-17 | 确定性哈希回归：examples 全量 golden SVG 快照（sha256 + 字节文件），CI 断言重渲染逐字节一致；布局/渲染改动显式更新快照走 diff 审阅；barycenter 文档序 tie-break 契约注释 + 测试；**随 F-06 一并收口**（既有测试基线只增不删） | **作者指令 2026-09-02 转正**（lessons-for-lgdl.md v1.1 §3 P1-3，:140-151） | P1 |
| F-18 | 类型可用性矩阵 + per-type 行为矩阵：9 类型 ×（布局单测断言确定性 + render 冒烟 + data-lgdl-loc 全覆盖）；同命令 × 9 类型行为一致，呈现层特判在 --help/lgdl-spec 明示；**F-06 落地时建立**，局限标注经 F-08 载体 | **作者指令 2026-09-02 转正**（lessons-for-lgdl.md v1.1 §4.3 + §4.5，:217-220,229-235） | P1 |
| F-19 | 结构化诊断：LgdlIssue 加稳定 code（unknown-kind/duplicate-id/bad-ref/unknown-field…）+ CLI validate/status `--format json`（{code, location, message, supportedFixes?}）；supportedFixes 先做 4-6 个高频 code；语义不变、不加 warning 档 | **作者指令 2026-09-02 转正**（lessons-for-lgdl.md v1.1 §3 P2-5，:167-178） | P2 |
| F-20 | 原子交付：共享 atomicWrite（tmp 同目录 + rename），render 与全部 mutation 命令共用，防半成品污染（.lgdl 是 AI 高频操作唯一事实源） | **作者指令 2026-09-02 转正**（lessons-for-lgdl.md v1.1 §3 P2-6，:180-188） | P2 |
| F-21 | 视觉验收闭环（开发期评审机械化）：①轻量几何收据（examples 全量，字段来自 F-15/F-16，**绑成品 hash**，schemaVersion + `visualReview:"pending"` 诚实边界）②浏览器收据（CI 无头渲染 4 视口截图 + JSON，与审视池 P-02 合并评估）；①确定进 v0.9、②容量门槛式 | **作者指令 2026-09-02 转正**（lessons-for-lgdl.md v1.1 §3 P2-4 + §4.4，:153-165,222-227） | P2 |
| F-22 | 溯源元数据：render 在 SVG 头写 `<!-- lgdl-cli <version> · source <file> sha256 <hash> · layout <type> -->`；render 测试断言头含版本与源 hash；不设门禁、只做溯源 | **作者指令 2026-09-02 转正**（lessons-for-lgdl.md v1.1 §3 P3-7，:190-198） | P2 |

**v0.9 里程碑（后移待重排）**：原 v0.7 里程碑（09-30 测试护栏全绿 → 10-09 文档零漂移达成、发布）**随后移不再成立**，待作者按 F-25（v0.7）发布节奏重排；含 archify 批次后按 §六 风险 15/16 做容量复核。

#### archify 借鉴批次（验收闭环机械化）排布说明（v1.4.0 新增）

- **门禁落位修正（关键约束，依据 lessons-for-lgdl.md v1.1 §2.4，:90-105）**：archify 门禁拦截「作者摆的坐标」、失败作者改 IR 重渲（**作者在环**）；LGDL 确定性下**用户改不了输出**（DSL 无坐标语法——parser allowlist 物理封死；改语义则输出是另一张图），门禁失败只有**引擎开发者**能重新输出（**用户在环外**）——把 archify 式门禁照搬到用户使用阶段会从「质量保证」退化成「拒绝服务」。因此 F-15~F-22 **全部落位「引擎开发阶段」**：是造引擎者的**回归护栏**（CI 审计 / golden 快照 / 视觉评审机械化），拦截「改算法引入的回归」，不是「用户画的图不合格」；用户侧只保持 error-only 语义校验（ADR-005 边界不动）。呼应既有雏形：`docs/reviews-2026-08-24/` AI 视觉评审闭环（v0.6 已实施）= LGDL 的开发期门禁，本轮借鉴 = 把它**机械化 + 收据化**（lessons :105）。
- **与既有 v0.9 Feature 的排布关系**（v1.9.0：版本位由 v0.7 后移；v1.12.0：由 v0.8 再后移 v0.9，排布关系不变）：F-15 ↔ F-11 **同批合并执行**（审计函数留 router 纯几何、render 只画不判，lessons :125；F-11 的 R-D3/R-D5 兜底分支测试作为审计专项测试载体）；F-17/F-18 ↔ F-06（golden 快照层 + 9 类型矩阵随 layout/render 测试护栏批次一并收口，lessons :151,233）；F-16/F-18 ↔ F-08（lgdl-spec 补 9 类型呈现层边界 / ascii 局限 / 预算口径，经 F-08 载体，lessons :215,234）；F-19 ↔ 审视池 P-05（status 优化）候选面重叠——P-05 仍待作者审视、若转正则合并收口、不阻塞 F-19；F-21② ↔ 审视池 P-02（CI 自动渲染）合并评估；F-20 全量回归走 F-02 CI 护栏。
- **批次内执行顺序建议**：**组 A（回归护栏核心，随 F-06/F-11 测试护栏批次收口）**：F-15 → F-17 → F-18 → F-16（预算字段是 F-21① 收据的前置输入）；**组 B（工具面/收据文化，随容量收口）**：F-19 → F-20 → F-22 → F-21①（轻量几何收据）→ F-21②（浏览器流水线，容量门槛式）。F-16 虽成本极低但横切 layout/cli/web 三面，建议随 layout 测试批次内落地以共享回归护栏。
- **容量与里程碑**：本节（原 v0.7）约 4 周容量未含本批次；原 09-30 测试护栏全绿 / 10-09 发布两里程碑**随后移待重排**，需按批次落地进度做**容量复核**，超窗项由作者裁决顺延落点（不预设立场，见 §六 风险 15/16）。

### v0.10.0（AI 增强与生态——原 v0.8→v0.9 内容整体后移）📋 规划（时间待重排）

> **v1.9.0 后移注（作者裁决 2026-09-06，O-008）**：本节原为 v0.8.0（2026-10、约 4 周）；因工程质量与文档对齐后移为 v0.8.0，本节**顺延为 v0.9.0**。原 2026-10 窗口与 10-30 审视立项里程碑**不再成立**；时间待作者重排（不预设立场、不编造时间承诺）。
>
> **v1.12.0 再后移注（作者裁决 2026-09-10）**：因 v0.8 改由 **F-14 浏览器插件孵化**占据，工程质量与文档对齐再由 v0.8 后移为 v0.9，本节**顺延为 v0.10.0**（原 v0.8 → v0.9 → v0.10）。内容不变，仅版本位再后移。

**主题：AI 增强与生态（审视后立项）**。**前置条件：作者对「AI 提案待审视池」做首轮审视**（见 §五 清单，逐项升降级或冻结）。审视通过的项才进入本版本：

- 候选工程项（从待审视池，标注「AI 提案待审视 → 待作者立项」）：Mermaid 导入增强、set-type 命令、本地代理 `lgdl-cli serve`（README v0.5 §5 与 provider.ts 头注释双证据承诺，需作者确认兑现与否）、语义 diff/评审（如审视通过）、子图引用/参数化模板
- **F-12 业务叙事补全**（文档/验证类，P2）：G1-Q1 具体案例还原（布局拉扯循环具象化）、G2 竞争定位 4 处空白（Q2 PlantUML/Graphviz 继承反叛、Q3 D2 评估、Q5 换与不换判断标准、Q6 Graphviz DOT 候选对比）、G3-Q3 双端动机、G4-Q4 零猜测边界、G5-Q1/Q4/Q6 版本叙事
- **视觉评审遗留清单关闭**（bugs.md 剩余项：决策节点分支校验、状态机合法性校验、甘特渲染行高等——需作者确认哪些仍未修）
- ~~**F-13 第一步：web-cli 独立包抽取**~~（**已按作者指令提前至 v0.6**，2026-08-31——见 §二 v0.6 小节；v0.10 不再承载，原「v0.7 测试护栏前置 + v0.8 容量约束」依赖已随之解除〔原 v0.7/v0.8 即现 v0.9/v0.10 位〕）

> **F-14 web-cli-plugin（浏览器插件）已移出本版**：F-14 系作者直接规划（2026-09-01，非审视池项）；**作者裁决 2026-09-10 已将其提前至 v0.8 作为该版主题**（见 §二 v0.8），故不在本版（v0.10，AI 增强与生态）承载。原「归属 v1.1 开源线门槛式立项」论证已被作者裁决覆盖（论证更新见 §3.2 注记）。

### v1.0.0（2026-11 目标）📋 规划

**主题：语义稳定首发**。发布门槛（建议）：
1. CI 全绿（**ci.yml 测试工作流 ✅ v0.6.0 已落地 + Pages 部署链路含 router ✅ v0.6.0 已落地**；v0.9 补 F-06/F-11 后 layout/cli/router 独立测试全绿）
2. 文档零漂移（D1-D8/T-D1/L-D1/R-D1/R-D4/W-D2 全部关闭；**CHANGELOG 侧 D6/D7 已随 v0.6.0 收尾**，剩余漂移 v0.9 全量对齐）
3. 待审视池冻结（作者审视完毕，未立项项显式冻结而非默许）
4. 语义模型无破坏性变更（error-only 校验、group-as-node、增量协议稳定——v0.6.0 发布说明已确认「语义模型无破坏性变更」）
5. 视觉评审遗留清单关闭

> F-13 第一步已按作者指令提前至 v0.6 落地并随 v0.6.0 发布（2026-08-31 提前 / 2026-09-05 发布，见 §二 v0.6）——架构演进不占发布门槛；第二步（开源）不阻塞 v1.0 首发，若在 v1.0 窗口内启动，其 LGDL 侧依赖必须满足门槛 4（零破坏：仅包位置迁移，不改语义模型）。

### v1.1.0（2026-12 起，web-cli 开源线与生态消费端）📋 规划（v1.3.0 扩展主题）

**主题：web-cli 底座独立开源**（F-13 第二步；**F-14 web-cli-plugin 已移出本版——作者裁决 2026-09-10 提前至 v0.8**，见 §二 v0.8）。**时间不承诺、门槛式启动**——以下前置全部满足即启动：
1. **F-13 第一步落地**（✅ **v0.6.0 已完成并发布**：LGDL 内独立包已抽取（9 包体系，specs-tree-web-cli-v2 validated），8 包 npm 0.6.0 已发布、零破坏验证通过（583 基线全绿）；第一步已按作者指令提前至 v0.6，2026-08-31 提前 / 2026-09-05 随 v0.6.0 发布）
2. **作者开源决策完成**（**决策待定项**：开源许可、项目命名、仓库名、独立文档、npm 发布管道——未定项不编造方案）
3. **v1.0 语义稳定首发达成**（语言基线确立后再对外开源，避免「开源即背债」）

**第二步内容**：脱离 LGDL 仓库成立独立 GitHub 开源项目，独立发布/维护；LGDL 仓库转为消费方（依赖独立包，走 npm 版本管理）。**建议单独版本线理由**：①开源是外部承诺，应排在 v1.0 语义稳定首发之后，避免与首发焦点（语言稳定性）抢注意力；②第二步时间完全依赖作者开源决策（许可/命名/管道），不可排期、只能给门槛；③第一步为第二步硬前置，两步骤现跨 v0.6 → v1.1 两个版本窗口（第一步已按作者指令提前至 v0.6 并随 **v0.6.0 发布**），第二步仍不宜塞进既有的工程质量（v0.9）、AI 增强（v0.10）与 v1.0 单版本（v1.9.0：原 v0.8 指 AI 增强版；v1.12.0 再后移后，现编号下工程质量 v0.9 / AI 增强 v0.10）。F-14（生态消费端）已按作者裁决 2026-09-10 提前至 v0.8，不再随本版并行。

> **F-14 web-cli-plugin 已移出本版**（作者裁决 2026-09-10：提前至 v0.8 作该版主题）——完整定位 / 隐含新基础设施 / 依赖 / 门槛见 §二 v0.8.0 小节；本版（v1.1）仅承载 **F-13 ②**（开源），F-13 ② 仍为 F-14 生态价值面的前置（仅关联、不承诺）。

---

## 三、Feature 候选清单与优先级（含来源标注）

### 3.1 候选清单总表

**编号规则**：P0 = 发布阻塞/公理冲突级；P1 = 用户可感知缺陷或质量基线；P2 = 清理/文档补全类。**F-13 为作者新增的架构演进规划**（非缺陷/非质量基线，2026-08-31 作者指令）：①按 **P1 等价管理**（作者指令纳入 v0.6 收口期承诺，2026-08-31 提前，接受与收口五件套同批排布）；②仍门槛式、不排期。建议版本见行内标注。**F-14 为作者新增的产品演进规划**（web-cli-plugin 浏览器插件，2026-09-01 作者指令，非审视池项）：按 **P1 等价管理**（作者指令；**作者裁决 2026-09-10 提前至 v0.8 作该版主题**，原「承诺进入 v1.1 开源线」已被覆盖）；门槛式、不排期；技术细节（协议发现机制/插件架构）不预设立场，留给未来立项。建议版本见行内标注。**F-15~F-22 为作者指令转正的借鉴/规避批量**（2026-09-02，依据 lessons-for-lgdl.md v1.1，AI 提案但**作者已裁决转正，不再属待审视池**，来源标注「作者指令 2026-09-02 转正」）：覆盖该报告 §3 的 P1-1/P1-2/P1-3/P2-4/P2-5/P2-6/P3-7 与 §4.3/4.5 护栏动作；按 **P1/P2 分级管理**（见各行动优先级列）；**全部落工程质量主题版本**（原 v0.7，v1.9.0 作者裁决后移为 v0.8、v1.12.0 再后移为 v0.9）——门禁/收据类按报告 §2.4 结论定位为「引擎开发阶段的回归护栏」（造引擎者的回归资产，非用户使用阶段的运行时拦截）；RICE 如实评、不因转正虚抬（见 §3.2 批次注记）。建议版本见行内标注。**F-23 为已完成 Feature 的登记行**（specs-tree-web-cli-base-framework，web-cli-base 框架化，2026-09-05）：来源 = **作者对话 2026-09-05 立项**（web-cli-base 定位讨论，bash 类比）+ **SDDU 全流程完成（discovery → spec → plan → tasks → build → review → validate，phase=validated / status=tracked）**；按 **架构演进 P1 等价管理**（同 F-13 先例：作者指令立项，非缺陷/非质量基线）——已实施完成，非待排期候选；事实依据 = Feature 目录过程产物（build.md / review-report.md / validate-report.md，What 层已实施工程验证），按素材甄别规则 2 可作规划承诺。建议版本见行内标注。**F-24 为渲染器路由质量缺陷的候选登记行**（specs-tree-root 候选，2026-09-05，lgdl-cli v0.6.0 实际渲染 15 节点决策图实测取证：多终点→单 end 汇聚蛇形绕行，见头部 v1.7.0 素材增补）——非审视池项（无作者规划记录）、非已完成项：系 **What 层已实测工程观察**（含证据路径字符串），登记为 🔧 待立项候选（v0.9 或 v1.x 待排期——原「v0.7 或 v1.x」中 v0.7 已由 F-25 占据、v0.8 已由 F-14 占据，见头部 v1.9.0/v1.12.0 素材增补）；按 **P2 体验/质量类**管理（非阻断，当前唯一已知渲染质量短板）。建议版本见行内标注。**F-25 为已完成 Feature 的登记行**（specs-tree-web-cli-base-v2，web-cli-base 面向浏览器生态位的 agent 能力完备化，2026-09-06）：来源 = **作者对话 2026-09-06 立项**（浏览器生态位完备化讨论；方向公理 D-5 = 面向浏览器生态位设计工具集、不照搬 OS read/write/bash，OS 能力代理未来 os-cli-base）+ **SDDU 全流程完成（discovery → spec → plan → tasks → build → review → validate，phase=validated / status=tracked，⚠️ 有条件通过——真实浏览器冒烟收口人工清单 5 项移交）**；按 **架构演进 P1 等价管理**（同 F-23/F-13 先例：作者指令立项，非缺陷/非质量基线）——已实施完成，非待排期候选；**版本落点 = v0.7.0（最近的独立版本，作者裁决 2026-09-06 O-008，原 v0.7 内容后移）——代码在独立分支 feature/web-cli-base-v2，未合入 main / 未发布，发布时间不承诺**；事实依据 = Feature 目录过程产物（build.md / review-report.md / validate-report.md，What 层已实施工程验证），按素材甄别规则 2 可作规划承诺。建议版本见行内标注。

**v1.6.0 状态注**：F-01~F-05（收口五件套）与 F-13 ① 已由「🔧 收口」转正为「✅ 已完成（v0.6.0）」——全部随 **v0.6.0 于 2026-09-05 发布**（npm 8 包 + 583 测试基线）；F-23 状态补「+ v0.6.0 发布」。表内**待排期候选现为**：v0.9（原 v0.7，v1.9.0 后移 v0.8、v1.12.0 再后移 v0.9）的 F-06~F-11 + archify 批次 F-15~F-22、v0.9/v1.x 候选 F-24（🔧 待立项待排期）、v0.10（原 v0.8，v1.9.0 后移 v0.9、v1.12.0 再后移 v0.10）的 F-12、v0.8 的 F-14、v1.1 线的 F-13 ②。

**v1.7.0 状态注**：新增候选 **F-24 渲染器终点汇聚路由优化（正交总线/缓冲层）**（🔧 待立项，v0.7 或 v1.x 待排期）——**已实测取证、可进 spec**（来源：lgdl-cli v0.6.0 实际渲染 15 节点/19 边多终点决策图 969x1128，2026-09-05；f3→end1 / f5→end1 蛇形绕行证据路径照实引用）；F-24 为**候选未立项**，状态必须是待排期（不得写成已完成），是否排期由作者裁决。

**v1.9.0 状态注**：新增已完成 Feature **F-25 web-cli-base 面向浏览器生态位的 agent 能力完备化**（specs-tree-web-cli-base-v2，作者对话 2026-09-06 立项 + SDDU 全流程完成）——**版本位 = v0.7.0（最近的独立版本，作者裁决 O-008：原 v0.7 工程质量内容后移 v0.8、原 v0.8 AI 增强后移 v0.9）**；代码在 feature/web-cli-base-v2 分支，**未合入 main / 未发布**——状态为「✅ 已完成（SDDU 全流程，2026-09-06）＋📋 v0.7 待合入发布」，**不得写成已发布**；F-24 候选落点同步调整为 **v0.8 或 v1.x 待排期**（v0.7 版本位已由 F-25 占据）。

**v1.12.0 状态注（版本位重排，作者裁决 2026-09-10）**：开启 **v0.8 = 浏览器插件孵化**——**F-14 web-cli-plugin 由 v1.1 提前至 v0.8**（作该版主题）；**工程质量与文档对齐由 v0.8 后移 v0.9、AI 增强与生态由 v0.9 后移 v0.10**；**v1.1 仅承载 F-13 ②（开源）**（F-14 移出）。表内待排期候选版本位同步：F-06~F-11 + archify 批次 F-15~F-22 → **v0.9**；F-12 → **v0.10**；F-24 候选 → **v0.9 或 v1.x**（v0.8 版本位已由 F-14 占据）；F-14 → **v0.8**（状态 📋 规划，门槛式）。

**v1.13.0 状态注（F-14 落地进展，2026-09-11）**：**F-14 web-cli-plugin 已立项**（Feature 目录 `specs-tree-web-cli-plugin`）并完成 **SDDU P0 全流程**（discovery → spec → plan → tasks → build → review → validate；phase=validated / status=completed〔P0 范围〕，⚠️ 有条件通过 **0 阻塞**）——状态由 **📋 规划 → 🚧 推进中（P0 validated，P1/P2 待续）**；**P1/P2（TASK-012~016，含 TASK-016 Gate-D 内置助手下线）未实现**；代码在分支 **feature/web-cli-plugin（未合入 main / 未发布，HEAD `1a1c7cf`）**，测试基线全仓 0 fail（web-cli-base 483 / lgdl-web 75 / web-cli-plugin 68 / lgdl-core 267 / lgdl-render 94+1skip / lgdl-router 8 / lgdl-web-cli 84 / lgdl-web-op-cli 15）；事实依据 = Feature 目录过程产物（state.json / build.md / review-report.md / validate-report.md，2026-09-10~09-11，What 层已实施工程验证，素材甄别规则 2 可作规划承诺）。

**v1.14.0 状态注（F-14 P1/P2 完成 + 下线执行，2026-09-12）**：**P1/P2 全量实现（16/16 任务；phase=builded 待 review/validate）**——全仓 build/test 0 fail（web-cli-base 483 零回归 / lgdl-web 31〔TASK-016 移除内置助手测试 47〕/ web-cli-plugin 112 + tsc 0 error）+ E2E 场景 A/B PASS；**Gate-D D-1~D-7 达标 → 已执行内置助手下线**（`lgdl-web/src/ai/*` 移除 + `App.tsx` 摘除，保留 base 机制层 + `web-cli-host`）；回退 = 单提交 `git revert` + `VITE_AI_ASSISTANT_FALLBACK` 默认 off（EC-016 不静默 = 页内静态迁移告知）；**FR-046 发布渠道就绪** = `docs/release.md`。事实依据 = Feature 过程产物（state.json / build.md §12 / docs/gate-d.md §2 / docs/migration.md §5.5，2026-09-12）。

**v1.15.0 状态注（F-14 SDDU 全流程 validated，2026-09-12）**：**F-14 web-cli-plugin SDDU 全流程完成并 validated（0 阻塞）**——16/16 任务（P0 TASK-001~011 + P1 TASK-012~015 + P2 TASK-016）；review R1 ❌ 2 阻塞 → R2 ⚠️ → **R3 ✅ 通过 0 阻塞**、validate R1 ⚠️ → **R2 ✅ 通过 0 阻塞**；**FR 46/46 · NFR 10/10（NFR-007 量化实测）· EC 16/16 · AC 12/12 · 阻塞 0**；**F-14 状态由 🚧 推进中 → ✅ 已完成（v0.8）**；内置助手下线已执行（O-001）、测试基线全仓 0 fail（web-cli-base 483 零回归 / web-cli-plugin 112）、门禁 G-MV3/G-KEY/GATE-011 PASS；代码在分支 **feature/web-cli-plugin（未合入 main / 未发布，最新 `4e537a7`）**——合入与发布由作者执行（时间不承诺）。事实依据 = Feature 过程产物（state.json / build.md / review-report.md / validate-report.md，2026-09-12）。

| # | Feature | 来源 | 优先级 | 建议版本 | 预估影响面 | 状态 |
|---|---------|------|:--:|------|-----------|------|
| F-01 | Pages 部署补 router 包（paths 触发 + build 步骤） | **G1** | **P0** | v0.6（✅ 随 v0.6.0 发布） | 线上工作台全量访问（发布链路） | ✅ 已完成（v0.6.0） |
| F-02 | CI 测试工作流（核心 4 包测试已全绿，接入即用） | **G2** | **P0** | v0.6（✅ 随 v0.6.0 发布） | 全部回归护栏（ci.yml：push main + PR） | ✅ 已完成（v0.6.0） |
| F-03 | 修复分组盒/泳道点击定位跨包断裂（renderer 三处 `groups[i]` → `nodes[i]`）+ locate.test.ts fixture 现代语法化 | **R-D2** + **C-D2** | **P0** | v0.6（✅ 随 v0.6.0 发布） | Web 工作台分组交互 + AI `preview-click`（核心场景二） | ✅ 已完成（v0.6.0） |
| F-04 | lgdl-web-fetch 注册进 OpenAI 兼容端点 tools（provider.ts:504） | **W-D1** | **P1** | v0.6（✅ 随 v0.6.0 发布） | 4/5 可直连厂商（deepseek/qwen/tencent/openai）AI 的 fetch 能力 | ✅ 已完成（v0.6.0；F-23 框架化后为 base 内建 + deriveTools 自动注册） |
| F-05 | preview-click 定位失败反馈修复（jumpToIssue 返回 boolean，handleWebOp 区分反馈） | **W-D3** | **P1** | v0.6（✅ 随 v0.6.0 发布） | AI 助手可信度（假成功误导 AI 与用户） | ✅ 已完成（v0.6.0） |
| F-06 | layout/cli 两包独立测试补齐（**v0.6 抽取/V2/F-23 的护栏后置补课**） | **G4** / **L-D2** | **P1** | v0.9（立项首位；v1.9.0 由 v0.7 后移、v1.12.0 由 v0.8 后移） | 布局（核心卖点「确定性布局」）与 CLI 的回归护栏 | 📋 规划 |
| F-07 | README 门面对齐（架构树与包体系对齐——v0.6.0 后 9 包，落地以现状核对、Sugiyama 表述、版本标题、router 职责） | **D4/D5/D8/G3** | **P1** | **✅ v0.7（提前完成，2026-09-10）** | 新人/Agent 第一入口（双层消费模型中「人必须读得懂」的落地） | ✅ 已完成（提前至 v0.7 分支） |
| F-08 | 技术文档对齐（design/lgdl-spec/CHANGELOG 全量漂移；D6/D7 CHANGELOG 侧已随 v0.6.0 收尾） | **D1/D2/D3/D6/D7/T-D1/L-D1/R-D4** | **P1** | v0.9（D6/D7 已随 v0.6.0 收尾；D1/D2/D3/T-D1/L-D1/R-D4 全量对齐；v1.9.0 由 v0.7 后移、v1.12.0 由 v0.8 后移） | Agent 按文档学语法（旧 groups 语法会被学走） | 📋 规划 |
| F-09 | Web 补全词典旧语法残留清理 | **W-D2** | **P2** | v0.9 | Web 编辑器补全体验（轻微，error 可见） | 📋 规划 |
| F-10 | layoutDocument async 签名清理（同步化 + 2 处消费方） | **G6** | **P2** | v0.9 | 接口语义精度（零功能影响） | 📋 规划 |
| F-11 | router 包健康化：降级路径测试（R-D3）+ routeDefault 测试（R-D5）+ recentreExit 清理（R-D1） | **R-D3/R-D5/R-D1** | **P2** | v0.9 | 布线 A* 失败分支/兜底路径回归护栏 + 死代码 | 📋 规划 |
| F-12 | 业务叙事补全：G1-Q1 案例还原 + G2 竞争定位 4 处 + G3-Q3/G4-Q4/G5-Q1/Q4/Q6 | **业务空白点** | **P2** | v0.10（作者补写为主；v1.9.0 由 v0.8 后移、v1.12.0 由 v0.9 后移） | 业务全景叙事张力（痛点印证层，辅叙事） | 📋 规划 |
| F-13 | web-cli 独立化（两步走）：①抽取 LGDL 内独立包（**✅ 已完成并随 v0.6.0 发布**：9 包体系 + V2 重构一体交付，specs-tree-web-cli-v2 validated，抽取内容见 §二 v0.6）②独立 GitHub 开源项目（脱离 LGDL 仓库，独立发布/维护） | **作者新增规划（2026-08-31，非漂移/缺口）；作者指令提前①至 v0.6（2026-08-31）** | **P1（作者指令，架构演进）** | v0.6（①，✅ 已随 v0.6.0 发布）→ v1.1（②，以①为前置 ✅，门槛式） | ①web AI 接线（ops.ts/provider.ts 迁出）+ core 命令注册表边界；②LGDL 仓库边界与开源生态 | ✅ 已完成（①，v0.6.0）/ 📋 规划（②） |
| F-14 | web-cli-plugin 浏览器插件（web-cli 生态消费端）：**独立于 LGDL 的浏览器插件，可作用于 LGDL 的 Web 页面、替代现有内置 AI 助手**；配置 LLM key 后，借助打开的网站的 web-cli 协议完成业务——任何支持 web-cli 协议的网站可被 AI 驱动（不限于 LGDL 工作台）；隐含新基础设施：web-cli 协议发现/声明机制（网站声明支持 web-cli 及暴露工具，方案不预设立场） | **作者新增规划（2026-09-01，非审视池项）；作者裁决 2026-09-10 提前至 v0.8（原登记于 v1.1 开源线）** | **P1（作者指令，产品演进）** | **v0.8（作者裁决 2026-09-10 提前至 v0.8，作该版主题；门槛式）** | web-cli 生态消费端（新形态）+ 协议发现机制（新基础设施） | ✅ 已完成（v0.8；**SDDU 全流程 validated 2026-09-12，0 阻塞**——16/16 任务；**FR 46/46 · NFR 10/10〔NFR-007 量化实测〕· EC 16/16 · AC 12/12**；review R3 ✅ / validate R2 ✅ 通过；内置助手下线已执行〔O-001〕；关键交付 = `packages/web-cli-plugin`〔MV3 三面 + 站点中立协议 + per-origin 权限门禁/审计 + 风控护栏 + BYOK + 事件桥 + dom-agent〕+ `web-cli-host` + `docs/{protocol,dev,compliance,migration,gate-d,release,smoke-checklist,capability-matrix}.md` + R8 E2E `test/e2e/fullchain.mjs`；Feature 目录 `specs-tree-web-cli-plugin`；分支 `feature/web-cli-plugin` 未合入/未发布〔最新 `4e537a7`〕；测试基线 web-cli-base 483〔零回归〕/ lgdl-web 31 / web-cli-plugin 112 / lgdl-core 267 / lgdl-render 94+1skip / lgdl-router 8 / lgdl-web-cli 84 / lgdl-web-op-cli 15，全仓 0 fail；门禁 G-MV3/G-KEY/GATE-011 PASS） |
| F-15 | 产物侧几何审计（净空/正交/有限性）：render 出口加纯几何审计函数（非有限坐标/斜段/边穿节点/标签压框/泳道越界），**失败即 exit 非零拒绝**（error-only 同构，非提示是拒绝）；通过后打一行几何摘要到 stdout；补 orthogonalize/routeRectilinear 兜底分支专项测试 | **作者指令 2026-09-02 转正，依据 lessons-for-lgdl.md v1.1 §3 P1-1（:114-125）** | **P1** | v0.9（与 F-11 合并执行、同批收口；v1.9.0 由 v0.7 后移、v1.12.0 由 v0.8 后移） | 全部渲染产物（兜底最差解路径零专项审计；render 21 例仅断言包含结构、不审计整图） | 📋 规划 |
| F-16 | 投影字号预算（先算后渲染）：layout 阶段按参考容器宽计算缩放后最小字号，写入 LayoutResult/几何摘要；CLI render/status 输出预算值（warning 级，不进 core error-only，保持 ADR-005 边界）；Web 预览缩放低于安全值报提示 | **作者指令 2026-09-02 转正，依据 lessons-for-lgdl.md v1.1 §3 P1-2（:127-138）+ §4.2 预算前置（:212-215）** | **P1（成本极低）** | v0.9（随 F-06 layout 测试批次落地；预算口径文档经 F-08 载体；v1.9.0 由 v0.7 后移、v1.12.0 由 v0.8 后移） | 嵌入/缩放场景可读性（工作台预览 / PNG 内嵌 / 文档等比缩小——当前零预算零告警） | 📋 规划 |
| F-17 | 确定性哈希回归：examples 每图建 golden SVG 快照（sha256 + 字节文件），CI 断言重渲染**逐字节一致**；布局/渲染改动显式更新快照走 diff 审阅（防「悄悄全图变丑」）；barycenter 文档序 tie-break 补注释 + 测试（固化「文档序即稳定性契约」） | **作者指令 2026-09-02 转正，依据 lessons-for-lgdl.md v1.1 §3 P1-3（:140-151）** | **P1** | v0.9（随 F-06 一并收口；v1.9.0 由 v0.7 后移、v1.12.0 由 v0.8 后移） | 核心卖点「同输入同输出」的字节级回归（现状仅 includes(...) 结构断言，参数一动全图平移无感） | 📋 规划 |
| F-18 | 类型可用性矩阵 + per-type 行为矩阵（9 类型 × 布局单测断言确定性 / render 冒烟 / data-lgdl-loc 全覆盖）；同命令 × 9 类型断言行为一致，呈现层特判在 --help/lgdl-spec 明示不留静默角落；lgdl-spec 同步标注呈现层局限 | **作者指令 2026-09-02 转正，依据 lessons-for-lgdl.md v1.1 §4.3（:217-220）+ §4.5（:229-235）** | **P1** | v0.9（F-06 落地时建立；局限标注经 F-08 载体；v1.9.0 由 v0.7 后移、v1.12.0 由 v0.8 后移） | 9 类型「声称 = 可用」的证明力度（layout 包当前 0 测试；防 archify workflow 式「5 类型实为 4」重演） | 📋 规划 |
| F-19 | 结构化诊断：LgdlIssue 加稳定 code 字段（unknown-kind/duplicate-id/bad-ref/unknown-field…，parser 42 处 error 点顺手标注）+ CLI validate/status `--format json`（{code, location, message, supportedFixes?}）；supportedFixes 先做 4-6 个高频 code（对齐 archify「不追求全量、追求命中率」）；语义不变、不加 warning 档 | **作者指令 2026-09-02 转正，依据 lessons-for-lgdl.md v1.1 §3 P2-5（:167-178）** | **P2** | v0.9（与审视池 P-05「status 优化」合并评估；P-05 仍待审视、不阻塞本项；v1.9.0 由 v0.7 后移、v1.12.0 由 v0.8 后移） | AI 消费方「对号入座」修复（当前只能从 message 文本猜修法） | 📋 规划 |
| F-20 | 原子交付：新增共享 atomicWrite（tmp 同目录 + rename），render 与全部 mutation 命令共用；对「目标已存在时覆盖仍原子」做单测 | **作者指令 2026-09-02 转正，依据 lessons-for-lgdl.md v1.1 §3 P2-6（:180-188）** | **P2** | v0.9（替换后全量回归走 F-02 CI 护栏；v1.9.0 由 v0.7 后移、v1.12.0 由 v0.8 后移） | CLI render/mutation 写路径（.lgdl 是 AI 高频操作唯一事实源；半成品会被下一次 op 读到） | 📋 规划 |
| F-21 | 视觉验收闭环（开发期评审机械化）：①轻量几何收据——对 examples 全量记录几何收据 JSON（画布尺寸/溢出/最小字号预算，字段来自 F-15/F-16，**绑成品 hash**，schemaVersion + `visualReview:"pending"` 诚实边界，成品变更自动 stale）②浏览器收据——CI 无头渲染关键示例 4 视口截图 + JSON（与审视池 P-02「CI 自动渲染」合并评估） | **作者指令 2026-09-02 转正，依据 lessons-for-lgdl.md v1.1 §3 P2-4（:153-165）+ §4.4 绑 hash（:222-227）** | **P2** | v0.9（①确定；②容量门槛式，依赖无头浏览器基建、需作者确认投入；v1.9.0 由 v0.7 后移、v1.12.0 由 v0.8 后移） | examples 全量渲染的机械化回归收据（引擎开发期门禁，非用户运行时检查） | 📋 规划 |
| F-22 | 溯源元数据：render 在 SVG 头写 `<!-- lgdl-cli <version> · source <file> sha256 <hash> · layout <type> -->`（XML 注释/metadata）；render 测试断言头含版本与源 hash；**不设门禁、只做溯源** | **作者指令 2026-09-02 转正，依据 lessons-for-lgdl.md v1.1 §3 P3-7（:190-198）** | **P2** | v0.9（与 F-17 共享成品 sha256 口径；v1.9.0 由 v0.7 后移、v1.12.0 由 v0.8 后移） | 脱离源码的 SVG 自证「哪版语义渲染」（溯源叙事一致性） | 📋 规划 |
| F-23 | web-cli-base 框架化：CommandRouter 路由下沉 + domain-neutral 能力归属（**AI-CLI 的 bash**）——① CommandRouter 下沉 base（router.ts：ToolEntry 统一注册条目 / dispatch / deriveTools / deriveCommand / listHelp / 未知工具显式报错，路由知识从 lgdl-web 散落 4 处收进注册表单一数据源）；② 全局 delay（delay.ts DelayGate 挂统一分发入口；base 默认 0 / lgdl-web 场景 600ms / 钳制 5000；sleep 以 delayMs:0 免除不叠加）；③ domain-neutral 接线面上收 base（runner.ts AgentRunner 中性 agent 循环，零 react；schema 派生 / help 注册即得 / 前缀派生 / 文案中性化）；④ 注册收敛（lgdl-web-cli / lgdl-web-op-cli 各 tool-entry.ts 整体注册为工具；op-cli OpHandlerRegistry 顶层角色移交 CommandRouter；web-fetch/sleep/web-cli-help 3 内建自动注册）；⑤ lgdl-web 场景收敛（session.ts 单一组装点 delayMs=600；AiPanel 分发/特判面删除；provider buildTools 由 deriveTools 派生；删除面 4 文件）。上游 = specs-tree-web-cli-v2（F-13 ① 线，v0.6 V2 ✅）；成果：全仓 582 测试 0 失败 + 1 skip（base 71→73 / lgdl-web-cli 84 / op-cli 15 / lgdl-web 41）+ 4 包 tsc 零错误 + grep 零残留 CLEAN | **作者对话 2026-09-05 立项（bash 类比）+ SDDU 全流程完成（validated）** | **P1（作者指令，架构演进，同 F-13 先例）** | ✅ v0.6 收口期完成（2026-09-05）并随 **v0.6.0 发布** | web-cli-base / lgdl-web-cli / lgdl-web-op-cli / lgdl-web（四包） | ✅ 已完成 + v0.6.0 发布 |
| F-24 | 渲染器终点汇聚路由优化（正交总线/缓冲层）：多终点→单汇聚点场景消除蛇形绕行——增加终点汇聚**缓冲层/正交总线（bus lane）**规划（边缘终点先入汇聚总线再统一进 end，消除「直下无路」导致的跨画布 x 折返）；顺带处理多条 >350px 长水平横穿边 + 同端口多边共用起始段（d1/d3/d4 底部）+ 标签落在共用段上。**已实测取证**（lgdl-cli v0.6.0 渲染 15 节点/19 边决策图 969x1128）：`f3→end1` 10 段折线 x 坐标 4 次折返（273→399→504→560→545，横跨全画布）、`f5→end1` 8 段折线（被迫绕开正下方节点）；根因 = 终点汇聚层（end1 居中）与上方 f1~f5 终点层（x141~691 占满画布宽）间无缓冲层。价值 = 提升所有多分支流程图渲染质量（**当前唯一已知渲染质量短板**）；非阻断（无节点重叠/无边穿透节点 bbox，碰撞规避可靠；583 基线全绿下发现的体验类缺陷） | **lgdl-cli v0.6.0 渲染实测（2026-09-05）** | **P2**（体验/质量类，非阻断） | v0.9 或 v1.x（🔧 候选待排期；v1.9.0 起 v0.7 版本位 = F-25、v1.12.0 起 v0.8 版本位 = F-14，不再承载本候选） | lgdl-web-cli / web-cli-base 的 SVG 渲染器（渲染器路由/布线输出；全部多终点流程图产物） | 🔧 待立项（候选，v0.9 或 v1.x 待排期；已实测取证，可进 spec） |
| F-25 | web-cli-base 面向浏览器生态位的 agent 能力完备化（**最近的独立版本 v0.7.0**）：方向公理 = **面向浏览器生态位设计工具集**（不照搬 OS read/write/bash；DOM/存储/Web API/Worker/fetch/Permissions 生态位对应设计），**OS 能力显式不做、代理未来 os-cli-base**（NG-001~009）——①**46 FR 十三组**（REG 注册表 v2 四能力 / PRM 权限门禁六能力〔PermissionGate 规则集+可插拔策略对象+allowed-tools+ask 契约+deny 优先〕/ DOC 内容对象读写 / STR 存储卷·quota·settings / SRC 内容集检索 / NET web-fetch 升级+web-search+save+stream / DOM dom-*+ask-user+notify+clipboard / EXE eval-js·wasm+exec-remote 代理桥+worker 持久上下文 / TSK todo·goal·jobs·subagent / SES session 持久化+context 压缩 / EXT skill 目录+MCP HTTP 试点 / LGDL 默认注册矩阵+web-search BYOK / BSL F-23 additive 契约+世界模型文档态→状态态+真实浏览器闭环补跑）②**权限门禁三者组合**（opencode 三元组 + dsh 可插拔策略 + WorkBuddy 技能级 allowed-tools）③**15 任务 9 波次**全绿；全仓 **724 pass / 0 fail / 1 skip**（F-23 582→724 净增 142：web-cli-base 205 / lgdl-web 51 / lgdl-web-cli 84 / lgdl-web-op-cli 15 / lgdl-core 267 / lgdl-render 94+1skip / lgdl-router 8）；4 包 tsc 零错误 + vite build + base 独立构建；Review R1 49 PASS / 0 FAIL（IMP-1/2/3/5 修复、IMP-4 遗留）；validate ⚠️ 有条件通过（真实浏览器冒烟收口人工清单 5 项移交）。上游 = specs-tree-web-cli-base-framework（F-23，✅ v0.6.0 发布） | **作者对话 2026-09-06 立项 + SDDU 全流程完成（validated）** | **P1（作者指令，架构演进，同 F-23/F-13 先例）** | **v0.7.0（最近的独立版本，作者裁决 2026-09-06 O-008：原 v0.7 内容后移）——代码在 feature/web-cli-base-v2，未合入 main / 未发布，发布时间不承诺** | web-cli-base / lgdl-web-cli / lgdl-web-op-cli / lgdl-web（四包 + base 能力矩阵） | ✅ 已完成（SDDU 全流程，2026-09-06）+ 📋 v0.7 待合入发布 |

**不立 Feature 的项**（说明处理方式）：
- **C-D1**（「core 被 5 包依赖」口径）：描述精度修正，已在 core 深潜文档内修正完毕，无需 Feature。
- **G5**（v0.6 规划项无实现痕迹）：甄别原则本身，已在本 Roadmap 的「待审视池」落地，不立 Feature。
- **AI 自主决策 3 例**（9 图类型 G3-Q6、YAML 形态 G4-Q3）：作者保留调整权，属决策留白而非缺陷，进入 §五 待审视。
- **§4.1 手排布局陷阱护栏**（lessons-for-lgdl.md v1.1，:204-210）：公理级护栏而非 Feature——任何「DSL 增加坐标/布局覆盖语法」提案按**公理修订请求**处理、需作者显式裁决（反方论证可引用 workflow 前科：每坐标一次试错 × 操作次数）；如需人工微调走独立「呈现覆盖层」（不改 .lgdl、不动语义，属 v1.x 提案，本 Roadmap 不预设立场）。
- **§4.2/4.5 类型局限文档面**（lessons-for-lgdl.md v1.1，:212-215,234）：lgdl-spec 标注 9 类型呈现层边界/预算口径（不留静默角落）——并入 **F-08** 执行范围，不新增文档 Feature；4.2 的「预算前置」本体由 F-16 承载。
- **§4.4 收据-成品脱钩**（lessons-for-lgdl.md v1.1，:222-227）：设计约束而非独立 Feature——收据**绑死成品 hash**（成品变更即 stale），作为 F-19/F-21 的实现约束与验收标准（防「假成功」复发，与 F-05/W-D3 同款公理）。
- **§4.6 纪律工具化**（lessons-for-lgdl.md v1.1，:237-240）：实现约束而非独立 Feature——F-15（审计）/F-19（诊断）/F-21（收据）的失败与重试上限写进协议与工具返回值，不依赖模型自律（延续 LGDL ADR-006/008「纪律内建在工具层」传统）。

### 3.2 优先级排序逻辑（语义推导，非硬编码）

排序综合 **影响面 × 用户/作者价值 × 依赖关系** 三维推导：

**维度一：影响面（触及范围 + 失败后果）**
- 发布链路（G1）> 线上核心交互（R-D2/W-D3）> AI 能力通道（W-D1）> 回归护栏（G2/G4）> 认知入口（文档）> 清理项。
- R-D2 影响面不只在「点击定位」这一交互：它是 **Web 工作台与 AI 助手共用的** source-loc 链路，一端失效、另一端假成功。

**维度二：用户/作者价值（对照叙事主轴 = 哲学层面）**
- **与「语义优先 / AI-first 可预测性」公理直接冲突的缺陷价值最高**：F-03（R-D2）与 F-05（W-D3）的「假成功」= 输出不可信任 = 直接打脸 LGDL 的立身之本（G1-Q2「输出不可信任」是痛点本质，假成功正是同一病症在自家产品上的复发）。这比功能缺失更伤——功能缺失是「做不到」，假成功是「假装做到了」。
- 次高：AI-first 能力完整性（W-D1：fetch 是 AI「取上下文」通道）。
- 再其次：双层消费模型中「人类必须读得懂」（G4-Q6）→ 文档正确性（F-07/F-08）对人是第一入口；Agent 按错误文档学走旧语法（D2）会复制出不可解析的图。
- 作者价值：叙事主轴=哲学层面 → 哲学一致性（无静默失败、无灰色地带）优先于功能堆砌。

**维度三：依赖关系**
- F-01（G1）依赖 v0.6 合入 main（发布动作本身）→ **✅ 已在 v0.6 内落地**（v0.6.0 合入 main @ c92bf3d）。
- F-03（R-D2）依赖 group-as-node 已落地（缺陷是其引入的）→ 缺陷随版本走、v0.6 内修，**✅ 已随 v0.6.0 修复关闭**。
- F-05 依赖 F-03 同路径（jumpToIssue 是 locate 链路的终点）→ 同批，**✅ 与 F-03 同批关闭（v0.6.0）**。
- F-08 依赖 v0.6 特性定型（否则改完又漂）→ **✅ v0.6.0 已定型发布**：D6/D7（CHANGELOG 侧）已随发布收尾；D1/D2/D3/T-D1/L-D1/R-D4 剩余漂移于工程质量版本（原 v0.7，v1.9.0 后移 v0.8、v1.12.0 再后移 v0.9）全量对齐。
- 待审视池立项依赖作者审视动作（见 §五）→ 无法排期，只能给门槛（v0.6 已发布，审视会窗口已开）。
- F-13 ① 依赖 v0.6 收口关闭（W-D1/W-D3，web AI 接线面稳定后再动接线）→ **✅ 已按此排布执行**：紧随 F-04/F-05 关闭后落地（v0.6.0，specs-tree-web-cli-v2 validated）；原依赖工程质量版本护栏（F-06/F-11，原 v0.7、v1.9.0 后移 v0.8、v1.12.0 再后移 v0.9）调整为「v0.6 内 F-02 兜底 + 抽取时手动全量回归 + 工程质量版本补专项测试」（✅ 前两项已执行；F-06/F-11 补课转工程质量版本立项首位，见 §四/§六 风险 9）。
- F-14 依赖 web-cli 协议发现机制（新基础设施，当前不存在）→ **作者裁决 2026-09-10 提前至 v0.8 门槛式推进**（原「归属 v1.1 开源线、与 F-13 ② 同线并行」已被覆盖）；F-13 ② 仍按 v1.1 门槛推进，F-14 不阻塞 F-13 ②（见 §3.2 注记）。

**RICE 评分表**（Reach 1-10 / Impact 1-10 / Confidence 0.5-1.0 / Effort 1-5；RICE = R×I×C÷E；Effort 为周级工作量估算）：

> 注（v1.6.0）：标 ✅ 的行 = **已完成并随 v0.6.0 发布（2026-09-05）**——评分保留作历史决策记录（v0.6 收口期排序依据）；执行摘要「Top 5」自 v1.6.0 起只计开放项，不再含以下完成行。

| Feature | Reach | Impact | Confidence | Effort | RICE |
|---------|:--:|:--:|:--:|:--:|:--:|
| F-01 G1 Pages 补 router ✅ | 6 | 9 | 0.9 | 1 | **48.6** |
| F-04 W-D1 fetch 注册 ✅ | 6 | 6 | 1.0 | 1 | **36.0** |
| F-05 W-D3 假成功反馈 ✅ | 5 | 7 | 1.0 | 1 | **35.0** |
| F-03 R-D2 跨包断裂 ✅ | 7 | 9 | 1.0 | 2 | **31.5** |
| F-07 README 对齐 ✅ | 7 | 5 | 0.9 | 1 | **31.5** |
| F-02 G2 CI 工作流 ✅ | 8 | 8 | 0.9 | 2 | **28.8** |
| F-09 W-D2 补全词典 | 4 | 3 | 1.0 | 1 | **12.0** |
| F-06 G4 layout/cli 测试 | 6 | 7 | 0.8 | 3 | **11.2** |
| F-08 技术文档对齐 | 5 | 5 | 0.9 | 2 | **11.3** |
| F-11 router 健康化 | 4 | 5 | 0.8 | 2 | **8.0** |
| F-10 G6 async 清理 | 2 | 2 | 0.9 | 1 | **3.6** |
| F-12 业务叙事补全 | 3 | 4 | 0.6 | 2 | **3.6** |
| F-13 ① web-cli 独立包抽取 ✅ | 3 | 6 | 0.7 | 2 | **6.3** |
| F-14 web-cli-plugin（v0.8 线，作者裁决 2026-09-10 提前） | 5 | 7 | 0.5 | 5 | **3.5** |
| F-15 产物侧几何审计（v0.9，与 F-11 合并；v1.9.0 由 v0.7 后移、v1.12.0 由 v0.8 后移） | 5 | 7 | 0.8 | 2 | **14.0** |
| F-16 投影字号预算（v0.9，随 F-06） | 6 | 5 | 0.8 | 2 | **12.0** |
| F-17 确定性哈希回归（v0.9，随 F-06） | 8 | 8 | 0.9 | 3 | **19.2** |
| F-18 类型/行为矩阵（v0.9，随 F-06） | 5 | 5 | 0.8 | 2 | **10.0** |
| F-19 结构化诊断（v0.9） | 7 | 6 | 0.8 | 3 | **11.2** |
| F-20 原子交付（v0.9） | 5 | 6 | 0.9 | 1 | **27.0** |
| F-21 视觉验收闭环（v0.9，两段拆分） | 4 | 6 | 0.6 | 5 | **2.9** |
| F-22 溯源元数据（v0.9） | 4 | 3 | 0.9 | 1 | **10.8** |
| F-24 渲染器终点汇聚路由优化（v0.9 或 v1.x 候选） | 8 | 5 | 0.6 | 3 | **8.0** |

> RICE 为决策辅助；P0/P1/P2 判定优先遵循 §3.1 的语义推导（如 F-03 的 RICE 非最高分，但因「与公理冲突 + 发布伴随回归」定 P0）。F-13 ① 为架构演进项，**v1.2.0 重评**（Effort 4→2 / Impact 5→6 / Confidence 0.6→0.7，RICE 2.3→6.3）：Effort 收窄因原 4 为「两步走」整体、本次仅评第一步**纯搬移抽取**（零破坏、不改语义，ADR-004 架构根基已实证）；Impact 上调因作者指令提前至 v0.6 后第一步升级为「生态化第一落地 + v1.1 开源线硬前置」且为 web AI 接线（ops.ts/provider.ts）提供清晰边界；Confidence 0.7 因抽取路径明确（纯搬移 + 全量回归门禁），不确定性主要剩「与收口五件套同窗口的排布风险」；Reach 3 不变（项目内复用面，开源后第二步再重评）。重评后 RICE 6.3 仍远低于当时 Top 5 门槛（31.5）——RICE 反映其「非用户面即时价值」，价值在战略面（底座复用 / 生态化 / v1.1 硬前置）；本次提前至 v0.6 系**作者指令的语义权重最高**（非 RICE 驱动），按 §3.1 语义推导排入 v0.6 收口期——不因 RICE 低而冻结、也不因提前而虚抬评分。**（v1.6.0 注：该项已随 v0.6.0 落地发布——9 包体系随 npm 8 包 0.6.0 可安装，specs-tree-web-cli-v2 validated；历史评分保留，② 按 v1.1 线门槛推进。）**

> **F-14 版本归属论证（v1.12.0 更新：原「v1.1 合适」论证已被作者裁决 2026-09-10 覆盖）**：原论证为「①工程质量版本不宜（原 v0.7，后移 v0.8）——主题为工程质量与文档对齐，与浏览器插件产品面冲突；②审视后立项版本不宜（原 v0.8，后移 v0.9）——F-14 非审视池项（作者直接规划，等同 F-13 性质）；③**v1.1 合适**——web-cli 开源线（F-13 ②）是 F-14 的天然生态母体（开源 → 协议公开 → 外部站点规模化接入 → 插件生态价值兑现）」。**作者裁决 2026-09-10 将 F-14 提前至 v0.8 作该版主题**：原②「审视后立项版本不宜」的版本位现由工程质量版本（v0.9）与 AI 增强版本（v0.10）占据，F-14 提前后不再与工程质量/AI 增强主题冲突（v0.8 独立成版、以插件孵化为主题）；原③「v1.1 合适」被覆盖——F-14 不再依赖 F-13 ② 开源作生态前置（提前于开源线启动），v1.1 仅承载 F-13 ②。**RICE 3.5（Reach 5 × Impact 7 × Confidence 0.5 ÷ Effort 5）**：Reach 5 = 生态潜在用户面广（任何 web-cli 站点用户）但当前协议采用率为零、落地依赖生态增长；Impact 7 = 生态消费端旗舰 + web-cli 生态战略价值（可作用于 LGDL Web 页面、替代现有内置 AI 助手）；Confidence 0.5 = 意图明确（作者原话）但协议发现机制未设计、插件技术栈未定，不确定性高；Effort 5 = 插件运行时 + 协议发现机制 + 安全边界，单作者最大档。与 F-13 同理：**作者指令的语义权重最高**（作者裁决提前至 v0.8 作该版主题），非 RICE 驱动；RICE 3.5 远低于 Top 5 门槛（31.5），未入 Top 5。**（v1.15.0 注：F-14 已 SDDU 全流程 validated，2026-09-12，0 阻塞；本评分保留作立项期历史记录。）**

> **F-15~F-22 批次注记（v1.4.0；v1.6.0 更新；v1.9.0 版本位后移）**：本批次系**作者指令转正**（2026-09-02，依据 lessons-for-lgdl.md v1.1）纳入 v0.7（工程质量主题），但 **RICE 如实评估、不因转正虚抬**——最高分 F-20（27.0）、次高 F-17（19.2）在 v1.5.0 及以前均低于 Top 5 门槛（31.5），**当时执行摘要 Top 5 不变**；**v1.6.0 起 v0.6 完成项移出 Top 5 后，F-20（27.0）/F-17（19.2）/F-15（14.0）已进入开放项 Top 2~4**。落位工程质量版本系「主题契合（工程质量与文档对齐）+ 作者指令语义权重」驱动（与 F-13/F-14 先例一致，非 RICE 驱动）；RICE 反映其「**引擎开发阶段回归资产**」属性——用户面即时价值低、防回归价值高，与 F-06（11.2）/F-11（8.0）同量级（语义推导维度二：哲学一致性「输出可信」的机械化落地）。各项评分口径：F-15 Reach 5（保护全部渲染产物但属开发期）、Impact 7（拦截静默最差解，与「假成功」同族）、Effort 2（与 F-11 合并摊薄）；F-17 Reach 8/Impact 8（核心卖点「同输入同输出」全量字节级回归，防参数一动全图平移无感）、Effort 3（快照基建 + CI + 更新流程）；F-20 Effort 1（约 10 行级工具）抬高 RICE 至 27.0；F-21（2.9）最低——②浏览器基建投入不确定（Confidence 0.6 × Effort 5），其①轻量几何收据段价值已由 F-15/F-16 字段承担，②段按容量门槛式推进（见 §六 风险 16）。**（v1.9.0：工程质量版本随作者裁决 2026-09-06 由 v0.7 后移为 v0.8——本批次与 F-06~F-11 同步后移，RICE/评分口径不变。v1.12.0：工程质量版本随作者裁决 2026-09-10 再由 v0.8 后移为 v0.9——本批次同步再后移，RICE/评分口径不变。）**

> **F-24 评分注记（v1.7.0）**：RICE **8.0** = Reach 8 × Impact 5 × Confidence 0.6 ÷ Effort 3——**Reach 高（8）**：每张多终点汇聚图都受影响（渲染器所有多终点场景皆经此汇聚路由，非单图缺陷）；**Impact 中（5）**：仅视觉质量（体验类，非正确性——碰撞规避可靠、无节点重叠/无边穿透，数据与结构无损，不影响「确定性布局」公理）；**Confidence 中（0.6）**：缺陷已实测取证（证据路径照实引用）但修复方案（汇聚缓冲层/正交总线）尚待设计验证，且路由算法调整存在次生回归可能（无护栏裸改风险）；**Effort 中（3）**：需终点汇聚路由算法调整（缓冲层/总线规划 + 伴随问题处理），周级工作量。RICE 8.0 与 F-11（8.0）同量级、低于 Top 5 门槛（12.0），**未入 Top 5**；为**当前唯一已知渲染质量短板**（语义推导维度二：质量基线体验类，非公理冲突）。排位参考：落 v0.9 候选时排在 F-06/F-11 测试护栏之后（先护栏后修复，护栏提供路由质量断言载体）；v0.9 容量不足则顺延 v1.x（见 §四/§七）。（v1.9.0：候选落点由原「v0.7 或 v1.x」调整为「v0.8 或 v1.x」——v0.7 版本位已由作者裁决给 F-25。v1.12.0：候选落点再由「v0.8 或 v1.x」调整为「v0.9 或 v1.x」——v0.8 版本位已由作者裁决给 F-14。）

---

## 四、依赖关系分析

```
v0.6.0（2026-09-05 已发布 ✅，main @ c92bf3d）── 收口期落地全链路（原依赖已全部兑现）：
        │
        ├── F-01（G1 Pages 补 router）✅ deploy-pages.yml 含 lgdl-router 构建 → Pages 构建不失败
        ├── F-02（G2 CI 测试工作流）✅ ci.yml（push main + PR；build 依赖序 + test workspaces）
        ├── F-03（R-D2 跨包断裂）+ C-D2 ✅ renderer 三处 groups[i]→nodes[i] + locate.test.ts 现代 fixture
        │      └── 同链路（render→locate→feedback）：F-05（W-D3）✅ jumpToIssue 返回 boolean——R-D2/C-D2/W-D3 聚簇同批关闭
        ├── F-04（W-D1 web-fetch 注册）✅ 被 F-23 框架化解决（web-fetch = base 内建，deriveTools 自动注册 5 工具）
        ├── F-13 ①（独立包抽取）+ V2 ✅ specs-tree-web-cli-v2 validated（9 包体系 + web-cli-base 纯机制化零 lgdl 依赖）
        └── F-23（web-cli-base 框架化）✅ specs-tree-web-cli-base-framework validated（CommandRouter / AgentRunner / DelayGate）

v0.6.0 发布后依赖线（v1.6.0 更新；v1.9.0 版本位调整：v0.7 = F-25、原 v0.7 工程质量 → v0.8、原 v0.8 → v0.9；v1.12.0 再调整：v0.8 = F-14、工程质量 → v0.9、AI 增强 → v0.10）：
        │
        ├── v0.7（最近的独立版本，作者裁决 2026-09-06）── F-25 web-cli-base 完备化 ✅ SDDU 全流程完成（2026-09-06 validate，724 基线）
        │      ├── 上游依赖 = F-23 框架化（✅ v0.6.0 发布）→ 依赖已满足
        │      └── 发布待作者：真实浏览器冒烟收口人工清单 5 项 → 合入 main（feature/web-cli-base-v2）→ 打标签 + npm 发布（时间不承诺）
        ├── v0.8（浏览器插件孵化，作者裁决 2026-09-10）── F-14 web-cli-plugin（✅ 已完成：**SDDU 全流程 validated 2026-09-12，0 阻塞**〔16/16 任务；FR 46/46 · NFR 10/10 · EC 16/16 · AC 12/12；review R3 ✅ / validate R2 ✅〕+ TASK-016 内置助手下线执行；由 v1.1 提前至 v0.8 作该版主题）──依赖──
        │      ├── web-cli-base 框架 ✅ v0.6.0 已发布（V2 9 包 + F-23 框架化，装即自足，583 基线；F-25 完备化〔v0.7 待发布〕后为浏览器生态位自足；v0.9 补 F-06/F-11 护栏后基础更稳）
        │      ├── web-cli 协议发现/声明机制（❌ 新基础设施，v0.8 内立项设计，方案不预设立场）
        │      ├── 插件运行时（❌ 新工程领域：浏览器扩展开发）
        │      ├── LLM key 管理（LGDL web 多厂商 key 管理先例可参考）
        │      └── F-13 ②（独立开源）——原为 F-14 生态价值面前置；F-14 提前至 v0.8 后两线解耦：F-13 ② 仍按 v1.1 门槛推进，F-14 不阻塞 F-13 ②（F-14 为其生态价值面提供先行验证/驱动，仅关联、不承诺）
        ├── v0.9 文档对齐（F-08，原 v0.7→v0.8 后移；F-07 已提前至 v0.7 完成）── 依赖 v0.6 语义模型定型 → ✅ 已定型（v0.6.0 发布），依赖解除可启动；
        │      CHANGELOG 侧 D6/D7 ✅ 已随 v0.6.0 收尾；D1/D2/D3/T-D1/L-D1/R-D4 经 F-08 于 v0.9 全量对齐
        ├── v0.9 测试护栏（F-06/F-11，原 v0.7→v0.8 后移）── v0.6 抽取/V2/F-23/F-25 的「护栏后置补课」（v0.9 立项首位）
        ├── v0.10 待审视池立项（原 v0.8→v0.9 后移）──依赖── 作者审视动作（§五，前置门槛；v0.6 已发布，审视会窗口 09-12 前后）
        ├── F-12 业务叙事 ──依赖── 作者补写/访谈还原（作者资源，非工程资源；v1.9.0 后移至 v0.9、v1.12.0 再后移 v0.10）
        ├── F-13 ②（独立开源）──依赖── F-13 ①（硬前置）✅ 已满足（v0.6.0）
        │      └── 作者开源决策（许可 / 命名 / 仓库名 / 文档 / 发布管道——决策待定项，见 §二 v1.1）

v0.9 archify 借鉴批次（F-15~F-22，作者指令 2026-09-02 转正；v1.9.0 由 v0.7 后移、v1.12.0 由 v0.8 后移）──依赖── lessons-for-lgdl.md v1.1（来源依据）+ 门禁落位修正（§2.4：引擎开发阶段回归护栏，非用户运行时门禁）
        │
        ├── F-15（几何审计）── 与 F-11 同批执行（R-D3/R-D5 兜底分支 = 审计专项测试载体；审计函数留 router 纯几何）
        ├── F-17（哈希回归）── 随 F-06 收口（layout/render 护栏批次内建 golden 快照层；sha256 口径同时服务 F-21 收据 artifactHash 与 F-22 SVG 头）
        ├── F-18（类型矩阵）── F-06 落地时建立（9 类型 × 布局单测/render 冒烟/data-lgdl-loc）
        ├── F-16（字号预算）── 预算字段进 LayoutResult → 供 CLI status 几何摘要 + F-21① 收据输入
        ├── F-19（结构化诊断）── 依赖 parser 现有 42 处 error 点 + location（只加外壳、不动语义）；与审视池 P-05（status 优化）候选面重叠（P-05 待审视、不阻塞）
        ├── F-20（原子交付）── render + mutation 命令全量替换 → 回归走 F-02 CI 护栏（✅ ci.yml 已随 v0.6.0 就绪）
        ├── F-21（视觉验收闭环）── ①轻量几何收据依赖 F-15/F-16 收据字段 + F-17 成品 hash 口径（4.4：收据绑死成品 hash）
        │        └── ②浏览器 4 视口流水线依赖无头浏览器基建（❌ 新领域，容量门槛式，需作者确认基建投入）
        └── F-22（溯源元数据）── 与 F-17 共享成品 sha256 计算口径；不设门禁只做溯源

文档面（§4.2/4.5 类型局限标注 + F-16 预算口径）── 经 F-08 载体落地（lgdl-spec），不新增文档 Feature

F-24 渲染器终点汇聚路由优化（v1.7.0 登记，🔧 待立项——v0.9 或 v1.x 待排期，v1.9.0 起 v0.7 版本位 = F-25、v1.12.0 起 v0.8 版本位 = F-14）──依赖── web-cli-base/render 渲染器（SVG 渲染器布线输出端：多终点汇聚布局与边路由由渲染器产出）
        │
        ├── 缺陷根因链：终点汇聚层（end1 居中）与上方 f1~f5 终点层（x141~691 占满画布宽）间无缓冲层 → 边缘终点直下无路 → 跨画布蛇形绕行（f3→end1 10 段折线 x 4 次折返 / f5→end1 8 段折线，已实测取证）
        ├── 与 F-06（v0.9 测试护栏）联动：F-06 落地时补「路由质量断言用例」（多终点汇聚无蛇形绕行的回归断言载体）——F-24 修复须排在 F-06/F-11 护栏之后（先护栏后修复，防路由改动无断言裸奔）
        ├── 与 F-11（router 健康化）/ F-15（几何审计）共享 router 布线模块——同模块技术债：F-11/F-15 属 v0.9 批次，F-24 为同模块候选，可同批评估排期
        └── 与 v0.9 技术债批次关系（原 v0.7→v0.8，v1.9.0/v1.12.0 后移）：同为「583 基线全绿下暴露/可暴露」的质量类候选——v0.9 主线（护栏先行）就位后 F-24 方有回归断言覆盖；非阻断（碰撞规避可靠），排期 v0.9 后段或 v1.x 由作者裁决，不承诺、不越界

无循环依赖；v0.6 收口期五件套 + F-13 ① + F-23 全部按序落地、零回滚，无前后依赖错误。
```

**技术共享分析**（v1.6.0 更新：前 4 条共享已随 v0.6.0 落地 ✅）：
- F-03 + F-05 + C-D2 共享 locate 链路 → **✅ 已交付**：一次「source-loc 链路健康化」迭代完成（renderer groups[i]→nodes[i] + fixture 现代语法化 + jumpToIssue boolean，v0.6.0）。
- F-01 + F-02 共享 CI/部署基建 → **✅ 已落地**：workflows 目录一次成型（deploy-pages.yml 含 router + ci.yml 测试工作流，v0.6.0）。
- F-06 + F-11 共享测试基建 → v0.9 测试护栏批次（**v0.6 抽取/V2/F-23/F-25 的护栏后置补课，立项首位**；v1.9.0 由 v0.7 后移、v1.12.0 由 v0.8 后移）。
- F-13 ① 与 F-02 共享 CI 基建（v0.6 内基础护栏）+ 与 F-06/F-11 共享测试基建 → **✅ 护栏调整已执行**：v0.6 内 F-02 兜底 + 抽取时手动全量回归（420→583 基线）均完成；F-06/F-11 补课转 v0.9 立项首位（护栏后置补课，v1.9.0 由 v0.7 后移、v1.12.0 由 v0.8 后移，见 §四 依赖图）。
- F-14 提前至 v0.8（作者裁决 2026-09-10）后与 F-13 ②（v1.1 开源线）解耦：F-13 ② 的协议公开文档 / 发布管道 / 生态落地为 F-14 生态价值面的长期前置（仅关联）；F-14 的协议发现机制设计在 v0.8 内独立立项，不再与 F-13 ② 同线并行。
- F-15 与 F-11 共享 router 兜底分支测试载体 → 合并为一次「产物侧几何审计 + 兜底路径专项测试」迭代（v0.9，v1.9.0 由 v0.7 后移、v1.12.0 由 v0.8 后移）。
- F-17 与 F-06 共享 layout/render 测试护栏批次 → golden 快照层并入 F-06 收口；F-17 的 sha256 口径同时服务 F-21 收据 artifactHash 与 F-22 SVG 头溯源。
- F-18 与 F-06 共享测试矩阵基建 → 9 类型可用性矩阵在 F-06 测试补齐时一并建立。
- F-16 与 F-18 的文档面（预算口径 / 类型局限标注）→ 经 F-08 载体（lgdl-spec 补呈现层边界），不新增文档 Feature。
- F-19 与审视池 P-05（status 优化）候选面重叠 → P-05 待作者审视；若转正则合并收口，F-19 不依赖该审视动作（结构化诊断外壳本身即 status 优化前置）。
- F-24 与 F-11/F-15 共享 router 布线模块、与 F-06 共享测试护栏批次 → 路由质量断言用例随 F-06 建立（F-24 修复的回归断言载体）；与 v0.9 技术债批次同模块候选（原 v0.7→v0.8，v1.9.0/v1.12.0 后移），可同批评估排期（v1.7.0 登记，🔧 待立项）。

---

## 五、AI 提案待审视池（甄别规则落地，不作为既定事实）

> 以下项全部来自 **AI 自主规划/规定**（G3-Q5 作者原话「仅记录，不作为参考」；G3-Q6/G4-Q3 未专项论证）。**未获作者审视前，不得写入任何版本的发布承诺**。**v0.6.0 已于 2026-09-05 发布——集中审视会窗口已开启**（§七 步骤 2，建议发布后第一周 ~09-12 完成，30 分钟逐项过）。

| # | 待审视项 | 来源证据 | 现状核实 | 建议处理 |
|---|---------|---------|---------|---------|
| P-01 | 语义 diff / 图即代码评审 | README v0.6 段；G3-Q5 | 代码无实现痕迹（G5 grep 验证） | 作者审视：保留为 v0.10+ 候选（原 v0.8+，v1.9.0 后移 v0.9、v1.12.0 再后移 v0.10）或冻结 |
| P-02 | CI 自动渲染 | 同上 | 无实现痕迹（F-02 CI 测试工作流 ✅ 已落地 v0.6.0，但无渲染环节） | 审视：与 F-02（✅ 已落地）有天然结合点，可并入 CI 基建扩展或与 F-21② 合并评估 |
| P-03 | SSE 流式输出 | 同上 | 无实现痕迹 | 审视：AI 面板体验增强，非核心承诺 |
| P-04 | 本地代理 `lgdl-cli serve`（绕火山 CORS） | README v0.5 §5「需本地代理（v0.6）」+ provider.ts 头注释「本地代理 lgdl serve 在 v0.6 提供」 | 无实现痕迹；**v0.6.0 发布说明已如实标注「未实现、待作者审视」**（免责标注落地，未带承诺发布） | **双证据承诺，需作者明确兑现/撤回**——README 曾向用户承诺 v0.6 提供；发布说明已显式标注未兑现（避免发布即失信），审视会上裁决：兑现（排期）/ 撤回（改文档）/ 冻结 |
| P-05 | set-type 命令 / 增量命令 attrs 删除 / status 输出优化 / Agent 集成提示词模板 / Mermaid 导入增强 | README v0.6 段 | 无实现痕迹 | 审视：Mermaid 导入增强与生态迁移（场景四）关联度高，可优先 |
| P-06 | 图解释 / 评审 / 选区操作 | 同上 | 无实现痕迹 | 审视：属 AI 增强，v0.10 候选（原 v0.8，v1.9.0 后移 v0.9、v1.12.0 再后移 v0.10） |
| P-07 | 子图引用 / 参数化模板 | 同上 | 无实现痕迹 | 审视：模块化方向，与「语义优先」契合但设计成本高 |
| P-08 | 大图优化 / 布局打磨 | 同上；与视觉评审 bugs.md 遗留清单呼应 | 大图降级（>120 网格）已存在；打磨项需对照 bugs.md 确认剩余 | 审视：bugs.md 剩余项（决策分支校验、状态机合法性、甘特行高等）先由作者确认哪些仍未修 |
| P-09 | state 显性 `initial` 字段 | 同上 | 无实现痕迹（state 初始伪节点当前由 renderer 特判） | 审视：与「显性化零猜测」哲学一致，候选价值较高 |
| P-10 | 9 种图类型圈定 | G3-Q6「AI 自行规定的，未做严格统计」 | 9 种已实现（DIAGRAM_TYPES 常量） | **作者保留调整权**：不撤销，但记录为 AI 规定、无统计依据 |
| P-11 | YAML 缩进 DSL 形态 | G4-Q3「AI 默认选择，若 JSON 更好可更换」 | 已实现（手写 YAML 子集解析器） | **作者开放更换**：换语法是破坏性变更，须作者明确发起 |

---

## 六、风险评估与缓解

| # | 风险 | 等级 | 应对 |
|---|------|:--:|------|
| 1 | **v0.6 带缺陷发布**：R-D2（分组定位断裂 + AI 假成功）/ W-D1（fetch 不可用）随 v0.6 交付给用户 | ✅ 已解除 | F-03/F-04/F-05 定为发布前置，v0.6 收口期关闭后才发版——**已执行：2026-09-05 v0.6.0 未带已知缺陷发布** |
| 2 | **v0.6 合入 main 后 Pages 构建失败**（G1）——部署拓扑缺 router，工作台下线 | ✅ 已解除 | F-01 定为合入前置——**已执行：deploy-pages.yml 含 lgdl-router 构建随 v0.6.0 合入 main（c92bf3d），Pages 链路正常** |
| 3 | **文档漂移教坏 Agent**：D2/D6/T-D1 的旧 groups 语法若被 AI 学走，产出的 .lgdl 全部被 parser 拒绝（error-only，ADR-005） | 🟡 中 | **部分缓解**：D6/D7（CHANGELOG 侧）✅ 已随 v0.6.0 收尾（拒绝旧语法口径）；lgdl-spec D2/T-D1 等文档面漂移经 F-08 于 v0.9 全量对齐（v1.9.0 由 v0.7 后移、v1.12.0 由 v0.8 后移）；README 门面对齐（F-07）已提前至 v0.7 分支完成（2026-09-10），不再随 v0.9 延期（后移系作者裁决，风险敞口随 F-25 分支待合入时长增加，见风险 19） |
| 4 | **布局回归无护栏**（G4/L-D2）：layout 零独立测试，Sugiyama 分层改动靠 render 间接覆盖 | 🟡 中 | F-06 v0.9 优先（立项首位，v1.9.0 由 v0.7 后移、v1.12.0 由 v0.8 后移）；在此之前布局改动必须跑 render 全量示例回归 |
| 5 | **待审视池承诺漂移**：README 已向用户承诺 serve 代理（P-04）但无实现，v0.6 发布后可能被用户追责 | 🟡 中 | **✅ 已缓解**：v0.6.0 发布说明显式标注 serve 代理「未实现、AI 提案待审视」；作者审视会（§七 步骤 2）表态：兑现 / 撤回 / 冻结 |
| 6 | **多 Feature 同时开工资源分散**（v0.6 收口期纳入 F-13 ① 后工作量增加；**与收口五件套并发的小心机**——抽取若与 F-03/F-05 修复并行，source-loc 链路改动与接线迁移叠加，回归难定位） | ✅ 已化解 | 已按顺序排布执行：v0.6 收口五件套（F-01~F-05）为主线 → F-13 ① **紧随其后、顺序排布**（不与五件套重叠并行），未超窗、未叠加；工程质量版本（原 v0.7，v1.9.0 后移 v0.8、v1.12.0 再后移 v0.9）只做对齐与护栏，不跨版本并行 |
| 7 | **R-D2 修复引入新回归**（render loc 发射方式改动影响 svg.test.ts:190 断言） | ✅ 已化解 | 已执行测试先行：svg.test.ts + locate.test.ts 断言同步更新，修复随 v0.6.0 发布，全仓 583 全绿零回归 |
| 8 | **文档对齐范围蔓延**（漂移 20 项逐个改易拖期） | 🟢 低 | F-08 成包交付、一次性评审，不逐条排期（F-07 已提前至 v0.7 完成） |
| 9 | **web-cli 抽取回归风险**（**从 v0.8 提前至 v0.6 收口期**）：执行层（ops.ts）/tools 定义（provider.ts）/命令注册表接线迁往独立包时，LGDL 侧 AI 助手功能回归——尤其刚修复的 R-D2/W-D3 链路再坏 | ✅ 已解除 | **已按序执行并解除**：F-03/F-05（locate 链路）+ F-04（fetch 注册）**先行关闭 → F-13 ① 紧随其后**（未在刚修复的链路上叠加抽取）；回归门禁执行完毕（v0.6 内 F-02 CI 兜底 + 抽取时全量回归），**583 = 582 pass + 1 skip 全绿、R-D2/W-D3 链路零回归**；F-06/F-11 护栏后置补课转 v0.9 立项首位（v1.9.0 由 v0.7 后移、v1.12.0 由 v0.8 后移） |
| 10 | **开源解耦成本与维护负担**：第二步独立仓库后 LGDL 需经 npm 消费独立包（版本管理/发布管道）；单作者维护双仓库；许可/命名等决策未定可能返工 | 🟡 中 | 作者先定决策待定项（许可/命名/仓库名/发布管道）再启动第二步；第一步包设计即预留「无 LGDL 依赖」边界（领域解耦），开源时零成本剥离；可先以镜像分仓低风险起步 |
| 11 | **web-cli 协议发现标准缺失**：无统一「网站如何声明支持 web-cli」机制，插件将被迫逐站点定制，无法规模化覆盖任意网站——生态价值落空 | 🟡 中 | F-14 立项首项即协议发现/声明机制设计（**v0.8 内，作者裁决 2026-09-10 提前至 v0.8**；原「v1.1 线内与 F-13 ② 协议公开文档同批」已被覆盖）；先以 LGDL 自家站点 + 少量试点站点验证机制，再推广 |
| 12 | **LLM 直接操作网页的安全/合规边界**：AI 按 key 驱动网页执行业务操作，存在越权操作、敏感数据外泄、账号风控与站点自动化条款冲突等风险 | 🔴 高 | 立项评审先行：安全边界设计（用户授权模型、敏感操作二次确认、操作可审计）、只读/幂等默认原则；合规评估（站点条款 / 自动化约束）；具体方案不预设立场 |
| 13 | **跨域与浏览器扩展平台限制**：content script 与页面隔离、站点 CSP、跨域请求、扩展权限最小化（Manifest V3 等）约束插件能力边界 | 🟡 中 | 插件架构设计期即做平台约束调研与试点验证（权限最小化原则），试点站点先行 |
| 14 | **F-14 与开源线（F-13 ②）节奏耦合（v1.12.0 更新：F-14 已提前至 v0.8）**：F-14 提前后不再依赖 F-13 ② 开源作生态前置，两线时序解耦；但 F-14 生态价值仍受 F-13 ② 协议公开进度影响（长期），反向若 F-14 挤压资源则两线互拖 | 🟡 中 | 两线解耦承诺：F-14 不阻塞 F-13 ②、各自门槛式推进；F-13 ② 的协议公开为 F-14 生态价值面长期前置（仅关联）；两线不跨版本并行（F-14 = v0.8，F-13 ② = v1.1） |
| 15 | **v0.9 范围膨胀 / 里程碑超窗**（v1.9.0 由 v0.7 后移、v1.12.0 由 v0.8 后移）：archify 借鉴批次（F-15~F-22）并入后，原约 4 周容量（未含本批次的 09-30/10-09 里程碑）承压，组 B 工具面与 F-21② 基建叠加可能拖期 | 🟡 中 | 批次内分期：**组 A（F-15~F-18）随 F-06/F-11 测试护栏批次收口**（复用同一回归基建，边际成本低于独立立项）；组 B（F-19/F-20/F-22/F-21①）低成本工具面逐项收口；F-21② 容量门槛式（见风险 16）；里程碑按批次落地进度**容量复核**，超窗项由作者裁决顺延落点（不预设立场），不在 v0.9 内跨版本并行 |
| 16 | **视觉收据的浏览器基建成本**：F-21② 无头浏览器 4 视口截图 + JSON 流水线进 CI = 新基建 + 持续维护面，且与 LGDL「维持零第三方依赖底线」（本 § 资源需求）存在冲突面 | 🟡 中 | F-21 拆两段：①轻量几何收据（纯 node 侧、绑成品 hash）**确定进 v0.9**（v1.9.0 由 v0.7 后移、v1.12.0 由 v0.8 后移）；②浏览器流水线**容量门槛式**——作者确认基建投入与依赖策略（CI 专用容器 / 独立脚本，不进 core/layout 零依赖包）后再启动，可先本地跑不阻塞 CI；沿用 archify 诚实边界（收据 `visualReview:"pending"`，自动化只出证据、不出验收结论） |
| 17 | **哈希快照维护成本**：examples golden 快照对每次布局/渲染改动都要求显式更新 + diff 审阅；更新噪音大或漏更 → 快照与实现漂移，「悄悄全图变丑」被快照固化成新基线（护栏反而背书回归） | 🟡 中 | 快照更新走显式命令 + **diff 审阅流程**（防静默吞变更）；F-17③ 固化「文档序即稳定性契约」（barycenter tie-break 注释 + 测试）压低无意义快照抖动；快照变更纳入 PR/评审；必要时快照分层/按需全量（大图性能预算，避免全量重渲过慢） |
| 18 | **收据-成品脱钩（假成功复发）**：F-21/F-19 收据若不绑成品 hash，成品变更后收据仍显示旧状态——复现 archify §4.4 收据脱钩教训与 LGDL W-D3「✓ 已定位」假成功前科 | 🔴 高 | **绑成品 hash 已定为设计约束**（§4.4 护栏动作 1，lessons :225-227）：F-21 收据 schema 含 artifactHash、成品变更即自动置 stale；F-19 supportedFixes 不得声称未经验证的修复；两条均写入验收测试（schema 断言 + stale 机制单测）；AI 工具层反馈基于真实返回值（沿用 F-05/W-D3 三态反馈模式——该模式已在 v0.6.0 落地 ✅） |
| 19 | **版本位重排连带敞口（v1.9.0 新增，作者裁决 2026-09-06；v1.12.0 更新，作者裁决 2026-09-10 再后移）**：①工程质量与文档对齐（含 F-06/F-11 回归护栏 + archify 回归资产 + 文档零漂移）整体后移（v0.8 → v0.9）——layout 核心卖点回归覆盖（风险 4）与文档漂移（风险 3）的敞口期被拉长；②F-25 分支（feature/web-cli-base-v2，净增 142 测试）未合入 main 前为大分支待合并状态，分支漂移风险随等待时长累积；③v0.7 发布时间不承诺 + v0.8 改由 F-14 插件孵化占据 → v0.9/v0.10/v1.0 计划窗口连锁受压 | 🟡 中 | ①风险 3/4 缓解持续有效但敞口期拉长，README（F-07 已提前完成）/lgdl-spec 等面向 Agent 的文档在 v0.9 对齐前如有改动需同步核对；②F-25 合入 main 走 F-02 CI + 724 全量回归门禁（validate 已绿，机械面就绪），合入前避免与 main 端无关改动叠加；③版本窗口由作者按 F-25 发布节奏裁决，本 Roadmap 不预设立场、不编造时间承诺 |

> **风险状态总注（v1.6.0；v1.9.0/v1.12.0 更新）**：风险 1/2（带缺陷发布、Pages 构建失败）与风险 6/7/9（资源分散、R-D2 回归、抽取回归）已**解除/化解**（✅，随 v0.6.0 发布与 583 全绿验证）；风险 3/5 **部分缓解**（D6/D7 已收尾 / P-04 发布说明已标注），待 v0.9 F-08 与作者审视会收尾；其余（4/8/10~18）仍为开放风险、应对不变（**v1.12.0：4/8/15~18 属 v0.9 执行面〔原 v0.7→v0.8，作者裁决后移〕；10~14 属 v0.8/v1.1 线〔F-14 已提前至 v0.8〕**）；**v1.9.0 新增风险 19**（版本位重排连带敞口：工程质量后移 + F-25 大分支待合入 + 版本窗口连锁受压；v1.12.0 更新为「v0.8 改由 F-14 占据」）。

**资源需求分析**（v1.6.0 更新：v0.6 执行面已收口，以下为落地结果与后续版本产能；**v1.9.0 版本位调整：v0.7 = F-25、原 v0.7 工程质量 → v0.8；v1.12.0 再调整：v0.8 = F-14、工程质量 → v0.9、AI 增强 → v0.10**）：
- 开发：单作者制项目（访谈确认「唯一作者兼决策者」）。**v0.6 已按 2 周窗口提前完成（09-01 ~ 09-05）**：收口五件套（Effort 1-2）+ F-13 ①（纯搬移抽取，Effort 2）均未超窗、零剥离；**v0.7（F-25）主体工程已于 SDDU 全流程内完成**（15 任务 9 波次，2026-09-06 validate 全绿），剩余为作者人工收口（真实浏览器冒烟 5 项 + 合入 + 发布）；v0.9 测试补齐（F-06/F-11，护栏后置补课）是原 v0.7 的最大工作量块（~2-3 周，建议测试先行、写测试即文档），随版本后移时间待重排。
- 测试：全部 node:test 本地跑通，**基线 583 = 582 pass + 1 skip（2026-09-05 发布态）→ F-25 validate 后为 724 pass / 0 fail / 1 skip（2026-09-06 分支态，feature/web-cli-base-v2）**；**F-02 CI 已随 v0.6.0 落地**（ci.yml push main + PR），v0.9 无需再搭测试工作流。
- 外部依赖：无新增第三方依赖（维持 core/layout/router 零依赖底线；npm 8 包 0.6.0 发布后消费面走版本管理）。
- **F-14 产能说明**（**v0.8 线，作者裁决 2026-09-10 提前**）：浏览器插件 + 协议发现机制 + 安全评审为**新工程领域**，单作者产能下建议 v0.8 内专项立项、不跨版本并行（不与 v0.9/v0.10 叠加）；LLM key 管理可参考 LGDL web 现有多厂商实现，非新增难点。
- **v0.9 archify 借鉴批次产能说明**（v1.4.0；v1.9.0 版本位由 v0.7 后移、v1.12.0 由 v0.8 再后移）：组 A（F-15/F-16/F-17/F-18）复用 F-06/F-11 测试护栏批次基建收口（边际成本低于独立立项，其中 F-20 为约 10 行级共享工具）；组 B（F-19/F-20/F-22/F-21①）为低成本工具面逐项收口；**F-21② 浏览器流水线属新工程领域**（无头浏览器/截图依赖，与零第三方依赖底线的冲突面需作者裁决），容量门槛式——原 v0.7 里程碑（09-30/10-09）**随后移待重排**，需按批次进度容量复核（见风险 15/16），超窗项由作者裁决顺延。

---

## 七、下一步行动（立即可执行）

1. ~~**v0.6 收口迭代**~~ **✅ 已完成（2026-09-05）**：F-01（G1）+ F-02（G2）工程基建 → F-03/F-05（source-loc 链路健康化）→ F-04（fetch 注册）→ F-13 ① 独立包抽取 + V2（9 包体系）→ **F-23 web-cli-base 框架化** → 全仓 583 测试全绿；**v0.6.0 已正式发布**（合入 main @ c92bf3d、标签 v0.5.0/v0.6.0、npm 8 包 0.6.0、lgdl-cli 0.6.0 冒烟全绿）。
2. **作者审视会**（v0.6 发布后第一周，~09-12）：§五 P-01~P-11 逐项升降级，输出「待审视池裁决表」——作为 v0.10（原 v0.8，v1.9.0 后移 v0.9、v1.12.0 再后移 v0.10）立项输入；其中与 v0.9 工程质量项合并评估者（P-02 ↔ F-21②、P-05 ↔ F-19）审视结论直接供 v0.9 排布引用；P-04（serve 代理）发布说明已免责标注，审视会定兑现/撤回/冻结。
3. **v0.7 收口发布（2026-09-06 起，时间不承诺）——F-25 web-cli-base 面向浏览器生态位的 agent 能力完备化**（作者裁决 2026-09-06：最近的独立版本，原 v0.7 工程质量内容后移 v0.8）：✅ SDDU 全流程已完成（46 FR 十三组九域工具集 + 权限门禁三者组合，15 任务 9 波次，724 pass / 0 fail / 1 skip，Review 49 PASS / 0 FAIL，validate ⚠️ 有条件通过）→ **真实浏览器冒烟收口人工清单 5 项**（V4/F-23 AC-008 真实 AI 闭环补跑〔浏览器+API Key〕、V13 真实浏览器交互面〔真 IDB/OPFS/授权/DOM/worker/多标签〕、IMP-4 dom 子命令 risk 分级、worker-session trust 差异声明、DB 名旧库清理）→ 合入 main（feature/web-cli-base-v2，走 F-02 CI + 724 全量回归门禁）→ 打标签 + npm 发布（见 §二 v0.7）。
4. **v0.8（浏览器插件孵化，作者裁决 2026-09-10）——F-14 web-cli-plugin ✅ SDDU 全流程完成并 validated（2026-09-12，0 阻塞）**（由 v1.1 提前至 v0.8 作该版主题）：✅ P0 SDDU 全流程完成 + ✅ P1/P2 全量实现（16/16 任务）+ ✅ **review R3 ✅ 通过 0 阻塞 / validate R2 ✅ 通过 0 阻塞**（`specs-tree-web-cli-plugin`；**FR 46/46 · NFR 10/10〔NFR-007 量化实测〕· EC 16/16 · AC 12/12**；代码在 feature/web-cli-plugin 未合入/未发布〔最新 `4e537a7`〕）→ **TASK-016 已执行内置助手下线（Gate-D D-1~D-7 达标；回退=单提交 revert + flag 默认 off；EC-016 不静默）+ FR-046 发布渠道 `docs/release.md` 就绪** → 剩遗留非阻塞项（C-4/C-5 过渡期关闭 / 真实浏览器人工 UX H0~H10〔含 Gate-D D-3 人工面 H6〕/ 商店发布 S-016 / 扩展 SW 真实内存采样）→ 合入与发布由作者执行（时间不承诺，见 §二 v0.8）；定位 = 独立于 LGDL、可作用于 LGDL Web 页面、替代现有内置 AI 助手。技术细节（协议发现机制/插件架构）不预设立场。
5. **v0.9（工程质量与文档对齐，原 v0.7→v0.8 后移）立项**（时间待作者按 v0.7/v0.8 发布节奏重排）：**F-06/F-11 测试护栏（v0.6 抽取/V2/F-23/F-25 的护栏后置补课，立项首位）** → **F-08 文档对齐**（F-07 已提前至 v0.7 完成；CHANGELOG 侧 D6/D7 已随 v0.6.0 收尾；D1/D2/D3/T-D1/L-D1/R-D4 全量对齐）→ F-09/F-10 清理 → **F-24 渲染器终点汇聚路由优化（正交总线/缓冲层）纳入 v0.9 候选**（v1.7.0 登记、v1.9.0/v1.12.0 落点调整为 v0.9 或 v1.x，🔧 待立项——**排在 F-06/F-11 测试护栏之后**：先护栏后修复，路由改动须有断言覆盖；RICE 8.0 与 F-11 并列，按 RICE 亦居 F-06/F-11 之后。**已实测取证（f3→end1/f5→end1 蛇形绕行证据路径），可进 spec**；v0.9 容量不足则顺延 v1.x，排期由作者裁决）。
6. **v0.9 archify 批次随批收口**（v1.9.0 版本位由 v0.7 后移、v1.12.0 由 v0.8 再后移）：组 A（F-15/F-17/F-18/F-16）随 F-06/F-11 测试护栏批次落地；组 B（F-19/F-20/F-22/F-21①）容量收口；F-21② 门槛式（作者确认基建投入）。
7. **F-12 业务叙事**：作者空闲期按《空白与待确认.md》§6 的优先级（收尾两问已完成 → G1-Q1 案例 → G2 竞争定位 4 处）补写，不占工程节奏（v1.9.0：随原 v0.8 后移 v0.9、v1.12.0 再后移 v0.10）。
8. **v1.1 线前瞻**：F-13 ① 硬前置 ✅ 已满足（v0.6.0）；剩余门槛 = 作者开源决策（许可/命名/仓库名/文档/发布管道）+ v1.0 首发——决策完成即启动 **F-13 ②** 门槛推进（**F-14 已提前至 v0.8，不在 v1.1 线内**）。

---

## 八、事实来源分离声明（作者确认 vs AI 提案）

> 本 Roadmap 的规划依据分两层。**规划承诺**只建立在「作者已确认事实」上；「AI 提案待审视」仅以候选/待裁决形式出现，不构成任何版本的发布承诺。

### 8.1 作者已确认事实（访谈答复 / 已实施工程验证）

| 类别 | 内容 | 来源 |
|------|------|------|
| 设计公理 | 「语义优先」为立项前公理（非事后标签）；AI-first 定位从未摇摆 | G1-Q3 追问② / G1-Q4 |
| 痛点本质 | 现有布局算法效果不可预测地差 → 输出不可信任；烈度 = 效率/体验型 | G1-Q2 / G1-Q5 |
| 竞争定位 | 排除 Mermaid 在语言哲学层（混色等非业务逻辑关注点）；对内弃错误设计、对外 convert/import 担迁移成本 | G2-Q1 / G2-Q4 |
| 目标用户 | 双 CLI 全为 AI Agent 设计；「AI 不直写源码」命令面强约束；op-cli 协调层（可见性/参与感） | G3-Q1/Q2/Q4 |
| 产品哲学 | 用户量为零故不留兼容包袱；error 非 warning（不制造灰色地带）；**双层消费模型**（人类理解/决策 → AI 经 CLI 操作）修正 design.md:73 | G4-Q1/Q2/Q6 |
| 版本演进 | CLI 优先（AI Agent 使用软件大势）；v0.4/v0.5 同日完成是巧合；v0.1 决策集回望无偏差 | G5-Q2/Q3/Q7 |
| 收尾答复 | 叙事主轴 = **哲学层面**（语义优先公理先行 + AI-first）；无其他必写 Why | 收尾两问（2026-08-30） |
| v0.6 工程事实 | 自研 Sugiyama 布局、group-as-node、分组感知布局、评审闭环、评审 Bug 修复——全部带测试/commit 验证 | CHANGELOG v0.6 段（What 层）+ 全景当日实测 |
| 质量基线 | core 281 / render 21 / router 8 / web 107 全绿（2026-08-30 实测） | docs-overview §3.3 |
| 质量基线（v0.6.0 发布态） | 全仓 **583 = 582 pass + 1 skip**（lgdl-core 267 / lgdl-web-cli 84 / web-cli-base 73 / lgdl-web 41 / lgdl-web-op-cli 15 / lgdl-render 94+1skip / lgdl-router 8；2026-09-05 实测） | CHANGELOG 0.6.0（2026-09-05）+ 全仓 npm test |
| archify 借鉴转正 | lessons-for-lgdl.md v1.1 的借鉴/规避清单经作者指令转正（2026-09-02，AI 提案 → 作者裁决转正，非审视池项）；门禁落位修正：门禁/收据类建议属**引擎开发阶段**回归资产（§2.4——确定性下用户改不了输出，失败只有引擎开发者能重新输出），非用户使用阶段运行时拦截 | 作者指令 2026-09-02 + lessons-for-lgdl.md v1.1 §2.4（:90-105） |
| F-23 立项与全流程工程验证 | specs-tree-web-cli-base-framework（web-cli-base 框架化：CommandRouter 路由下沉 + domain-neutral 能力归属）经**作者对话 2026-09-05 立项**（bash 类比；决策 ①立项纳入 ROADMAP / ②连带落地全局 delay / ③完全不兼容〔内测无历史债〕/ ④非 LGDL 特有一律归 base 复用）+ **SDDU 全流程完成**（phase=validated / status=tracked）：全仓 582 测试 0 失败、4 包 tsc 零错误、grep 零残留 CLEAN——What 层已实施工程验证（素材甄别规则 2），可作规划承诺 | 作者对话 2026-09-05 + specs-tree-web-cli-base-framework/ build.md · review-report.md · validate-report.md（2026-09-05） |
| **v0.6.0 正式发布（2026-09-05）** | 代码合入 main（`c92bf3d`；feature/group-as-node 已删除、仓库仅 main 分支）；v0.5.0（`10f66d0`）+ v0.6.0（`fecb9b2`）标签已打并推送；**npm 8 包 0.6.0 全部发布**（@lgdl/{lgdl-core,lgdl-layout,lgdl-router,lgdl-render,lgdl-cli} + @lgdl/{web-cli-base,lgdl-web-cli,lgdl-web-op-cli}——web 侧三包**首次发布**，lgdl-web private）；全局 lgdl-cli 0.6.0 冒烟全绿（init/add-node/add-edge/render/status）；F-01~F-05 收口五件套完成；CHANGELOG 0.6.0 段收尾（补 F-23 / 修 D6、D7 / 加发布说明：P-04 serve 未兑现标注 + 语义 diff/CI 渲染/SSE 不在本版本） | 作者发布操作确认 + 仓库实测（git refs / package.json / CHANGELOG / specs-tree state.json，2026-09-05） |
| F-24 渲染路由缺陷（已实测，候选 Feature 登记依据） | lgdl-cli v0.6.0 实际渲染 15 节点/19 边多终点决策图（969x1128，2026-09-05 实测）：多终点→单 end 汇聚时边缘终点跨画布蛇形绕行——`f3→end1` 路径 `M293,564 L273,564 L273,693 L399,693 L399,868 L504,868 L504,1022 L560,1022 L560,1064 L545,1064`（10 段折线、x 坐标 4 次折返 273→399→504→560→545）、`f5→end1` 路径 `M422,740 L406,740 L406,868 L504,868 L504,1022 L560,1022 L560,1064 L545,1064`（8 段折线、被迫绕开正下方节点）；根因 = 终点汇聚层（end1 居中）与 f1~f5 终点层（x141~691 占满画布宽）间无缓冲层/正交总线规划；无节点重叠、无边穿透节点 bbox（次生问题已实测不存在）——纯路由质量缺陷（体验类、非阻断，v0.6.0 发布态 583 基线全绿下发现）；F-24 为 🔧 待立项候选（v0.9 或 v1.x 待排期——v1.9.0 起 v0.7 版本位 = F-25、v1.12.0 起 v0.8 版本位 = F-14），非已完成 | lgdl-cli v0.6.0 实际渲染实测（2026-09-05，证据路径字符串照实引用） |
| F-25 立项与全流程工程验证（web-cli-base 面向浏览器生态位的 agent 能力完备化） | specs-tree-web-cli-base-v2 经**作者对话 2026-09-06 立项**（方向公理 D-5 = 面向浏览器生态位设计工具集、不照搬 OS read/write/bash，OS 能力代理未来 os-cli-base；作者裁决 O-001 首批九域全做 / O-002 不可承载面代理 / O-003 权限门禁三者组合 / O-008 版本落点 = 最近的独立版本）+ **SDDU 全流程完成**（phase=validated / status=tracked，⚠️ 有条件通过）：46 FR 十三组（横切四柱 + 九域浏览器原生工具集）+ 10 NFR + 15 EC + 12 AC；15 任务 9 波次全绿；Review R1 49 PASS / 4 WARN / 0 FAIL / 0 阻塞（IMP-1/2/3/5 已修复、IMP-4 遗留附建议）；validate V1~V17 真实执行——全仓 **724 pass / 0 fail / 1 skip**（F-23 582→724 净增 142）、4 包 tsc 零错误 + vite build + base 独立构建、专项 158 例、自主脚本 6 个 37 断言、V14 EC 15/15、V15 生态位 grep 15/15 CLEAN、headless chromium UI 加载冒烟成功——What 层已实施工程验证（素材甄别规则 2），可作规划承诺 | 作者对话 2026-09-06 + specs-tree-web-cli-base-v2/ build.md · review-report.md · validate-report.md（2026-09-06，代码在 feature/web-cli-base-v2 分支） |
| F-25 版本落点裁决（v0.7 = 最近的独立版本） | 作者裁决（2026-09-06，spec 开放点 O-008）：web-cli-base 完备化 = **最近的独立版本**（v0.7.0 版本位），**原 v0.7（工程质量与文档对齐）内容后移为 v0.8.0、原 v0.8.0（AI 增强与生态）后移为 v0.9.0**——系作者裁决的优先级变更（非 AI 排期推导）；F-25 代码在独立分支 feature/web-cli-base-v2，**未合入 main / 未发布**（发布时间不承诺，本 ROADMAP 不编造）；真实浏览器冒烟收口人工清单 5 项移交作者 | 作者裁决 2026-09-06 + specs-tree-web-cli-base-v2/ state.json phaseNote（O-008） |
| **F-14 版本位裁决（v0.8 = 浏览器插件孵化，作者裁决 2026-09-10）** | 作者裁决（2026-09-10）：开启 **v0.8 = 浏览器插件孵化**——将 **F-14 web-cli-plugin** 由 v1.1 **提前至 v0.8** 作该版主题；**版本位重排**：原 v0.8（工程质量与文档对齐）→ **v0.9.0**、原 v0.9（AI 增强与生态）→ **v0.10.0**、v1.0.0（语义稳定首发）不变（时间窗口标注待复核）、v1.1.0「web-cli 开源线与生态消费端」= 仅 **F-13 ②**（开源）——F-14 移出 v1.1。F-14 属**作者规划/作者指令**性质（原为作者规划 2026-09-01，非审视池项），可作规划承诺；**定位（作者 2026-09-10 补充）**：独立于 LGDL 的浏览器插件，可作用于 LGDL 的 Web 页面、替代现有内置 AI 助手；技术细节（协议发现机制/插件架构）仍不预设立场，留给未来立项 | 作者裁决 2026-09-10（本 ROADMAP v1.12.0 素材增补） |

#### F-24 完整复现 DSL（v1.8.0 内嵌，自包含可复现）

> **作者要求（2026-09-06）**：不建独立 fixture 目录，复现 DSL 直接内嵌本文档——ROADMAP 自包含可复现。以下即触发 `f3→end1` / `f5→end1` 蛇形绕行的 **15 节点 / 19 边复现源（1.7KB）**，与上方 §8.1 F-24 事实行 / §3.1 F-24 行登记证据同源（2026-09-05 lgdl-cli v0.6.0 发布态 583 基线实测）；F-24 仍为 🔧 待立项（候选，v0.9 或 v1.x 待排期——v1.9.0 起 v0.7 版本位 = F-25、v1.12.0 起 v0.8 版本位 = F-14）。

**① 复现源（完整 DSL，存为 `.lgdl` 文件，yaml）**：

```yaml
type: flowchart

nodes:
  - id: start
    label: 饿了，今天吃什么？🤔
    kind: start
  - id: d1
    label: 在家吃，还是出去吃？
    kind: decision
  - id: d2
    label: 自己做，还是点外卖？
    kind: decision
  - id: d3
    label: 想吃辣，还是清淡？
    kind: decision
  - id: d4
    label: 一个人，还是约朋友？
    kind: decision
  - id: d5
    label: 大家能吃辣吗？
    kind: decision
  - id: p1
    label: 翻翻冰箱 · 下厨开做 🍳
  - id: p2
    label: 打开外卖 App 挑店 📱
  - id: f1
    label: 麻辣烫 / 重庆小面 🌶️
  - id: f2
    label: 粥粉面 / 轻食简餐 🥗
  - id: f3
    label: 街边小店 · 快餐便当 🍱
  - id: f4
    label: 川湘菜馆，辣得过瘾 🌶️🌶️
  - id: f5
    label: 粤式茶餐厅 / 鸳鸯火锅 🍲
  - id: note1
    label: 选择困难？抛硬币、剪刀石头布，交给命运 ✨
    kind: note
  - id: end1
    label: 开饭！🍚
    kind: end

edges:
  - from: start
    to: d1
  - from: d1
    to: d2
    label: 在家吃
  - from: d1
    to: d4
    label: 出去吃
  - from: d1
    to: note1
    label: 纠结中…
  - from: d2
    to: p1
    label: 自己做
  - from: d2
    to: p2
    label: 点外卖
  - from: p1
    to: end1
  - from: p2
    to: d3
  - from: d3
    to: f1
    label: 想吃辣
  - from: d3
    to: f2
    label: 清淡点
  - from: d4
    to: f3
    label: 一个人
  - from: d4
    to: d5
    label: 和朋友
  - from: d5
    to: f4
    label: 能吃辣
  - from: d5
    to: f5
    label: 不能吃辣
  - from: f1
    to: end1
  - from: f2
    to: end1
  - from: f3
    to: end1
  - from: f4
    to: end1
  - from: f5
    to: end1
```

**② 复现步骤**（lgdl-cli v0.6.0 发布态，583 基线）：

```bash
# 将①完整保存为 .lgdl 文件后执行（自包含、无外部依赖）
lgdl-cli render --file <① 存成的 .lgdl 文件> -o out.svg --format svg
```

**③ 预期输出对照**（与 §3.1 / §8.1 F-24 行已登记证据一致）：画布 **969x1128**、**15 nodes / 19 edges**；观察 `f3→end1`（10 段折线、x 坐标 4 次折返 273→399→504→560→545）与 `f5→end1`（8 段折线、被迫绕开正下方节点）两条**蛇形绕行**路径——即上表 F-24 事实行登记的路由质量缺陷证据。

### 8.2 AI 提案待审视（未获作者论证，引用时必标注）

| 类别 | 内容 | 来源 |
|------|------|------|
| v0.6 路线图规划 | 语义 diff / CI 自动渲染 / SSE 流式 / serve 代理 / set-type / 增量命令 attrs 删除 / status 输出优化 / Agent 提示词模板 / Mermaid 导入增强 / 图解释评审选区 / 子图引用 / 参数化模板 / 大图优化 / 布局打磨 / state 显性 initial | README v0.6 段 + G3-Q5（作者：「仅记录，不作为参考」） |
| 9 种图类型圈定 | AI 自行规定、无统计依据 | G3-Q6 |
| YAML 缩进 DSL 形态 | AI 默认选择，若 JSON 更好可更换 | G4-Q3 |
| 全景中 v0.6 Why 层 | 布局引擎迁移动机、group-as-node 统一动机、AI 评审闭环动机等一概未作素材 | 《空白与待确认.md》§3（元结论 ③） |

### 8.3 本 Roadmap 中的分层使用说明

- **已确认事实 → 规划承诺**：v0.6 收口五件套（F-01~F-05）+ **F-13 ①**（作者指令立项并提前至 v0.6，2026-08-31）、v0.7 对齐与护栏（F-06~F-11，**v1.9.0 起该工程质量版本后移为 v0.8、v1.12.0 再后移为 v0.9**）、业务叙事（F-12，**v1.9.0 起后移为 v0.9、v1.12.0 再后移为 v0.10**）均基于作者确认的工程事实、哲学公理推导与作者直接指令，可排期。**v1.4.0 增补**：v0.7 archify 借鉴批次（**F-15~F-22**）基于作者指令转正（2026-09-02，依据 lessons-for-lgdl.md v1.1，AI 提案但已裁决转正）——不再属待审视池，可排期（门禁/收据类按 §2.4 落位引擎开发阶段回归护栏）。**v1.5.0 增补**：**F-23**（web-cli-base 框架化，specs-tree-web-cli-base-framework）系**作者对话 2026-09-05 立项 + SDDU 全流程（validated）完成的已实施项**——事实依据为 Feature 目录过程产物（build.md / review-report.md / validate-report.md 的 What 层验证记录：582 测试 0 失败、4 包 tsc 零错误、grep CLEAN），本版作为规划承诺登记（✅ v0.6 收口期完成，2026-09-05；见 §二 v0.6 / §3.1 F-23 行 / §8.1）。**v1.6.0 增补**：**v0.6.0 正式发布事实**（合入 main @ c92bf3d、标签 v0.5.0/v0.6.0、npm 8 包 0.6.0、lgdl-cli 0.6.0 冒烟全绿、583 测试基线、CHANGELOG 0.6.0 段收尾）为作者发布操作 + 仓库实测的 **What 层已确认事实**（§8.1 新增行）——本版将 v0.6 全部承诺行**转正为已完成**：F-01~F-05 / F-13 ① 由「🔧 收口」→「✅ 已完成（v0.6.0）」，F-23 补「+ v0.6.0 发布」；执行摘要 / §二 / §3.1 / §3.2 / §四 / §六 / §七 全量联动，v0.7 承接剩余开放项。**v1.7.0 增补**：**F-24**（渲染器终点汇聚路由优化）系 **lgdl-cli v0.6.0 实测取证的 What 层缺陷观察**（§8.1 新增已确认事实行，证据路径照实引用）——登记为**候选 Feature（🔧 待立项，v0.7 或 v1.x 待排期）**，属「已确认事实 → 候选登记」而非排期承诺：未写入任何版本的发布承诺，立项/排期由作者裁决（RICE 8.0 未入 Top 5；语义推导 P2 体验类非阻断）。**v1.8.0 增补（复现口径）**：F-24 的**完整复现 DSL 已内嵌于本文档**（§8.1 F-24 事实行后「F-24 完整复现 DSL」小节：复现源 yaml + 复现步骤 + 预期输出对照）——**本文档自包含可复现，无需外部文件**（作者要求不建独立 fixture 目录）；复现 DSL 系 §8.1 F-24 已确认事实行的支撑附件，不改变 F-24 候选定位（🔧 待立项，非排期承诺）。**v1.9.0 增补（版本位裁决 + F-25 登记）**：**F-25**（specs-tree-web-cli-base-v2，web-cli-base 面向浏览器生态位的 agent 能力完备化）系**作者对话 2026-09-06 立项 + SDDU 全流程（validated）完成的已实施项**（§8.1 新增两行：全流程工程验证 + 版本落点裁决）——本版作为**已确认事实 → 规划承诺**登记：版本位 **v0.7.0（最近的独立版本，作者裁决 O-008）**，代码在 feature/web-cli-base-v2 **未发布**（状态 = ✅ 已完成 + 📋 待合入发布，不得写成已发布）；**版本编号调整口径（作者裁决的优先级变更）**：原 v0.7（工程质量与文档对齐，F-06~F-11 + archify F-15~F-22）→ **v0.8.0**、原 v0.8（AI 增强与生态）→ **v0.9.0**，F-24 候选落点随之为 **v0.8 或 v1.x**；§8.3 本条及执行摘要 / §二 / §3.1 / §3.2 / §四 / §五 / §六 / §七 全量联动（历史叙述中「v0.7」若指工程质量版本，其当下对应为 v0.9）。**v1.12.0 增补（版本位重排：v0.8 = 浏览器插件孵化）**：**作者裁决 2026-09-10** 开启 **v0.8 = 浏览器插件孵化**——**F-14 web-cli-plugin** 由 v1.1 **提前至 v0.8** 作该版主题（§8.1 新增版本位裁决行；F-14 属作者规划/作者指令性质、可作规划承诺，技术细节不预设立场）；**版本位再调整**：工程质量与文档对齐 v0.8 → **v0.9**、AI 增强与生态 v0.9 → **v0.10**、v1.1 = 仅 **F-13 ②**；F-24 候选落点随之为 **v0.9 或 v1.x**；执行摘要 / §二 / §3.1 / §3.2 / §四 / §五 / §六 / §七 全量联动。
- **AI 提案 → 待审视池**：§五 P-01~P-11 全部标注「待审视」，v0.10 候选项（原 v0.8，v1.9.0 后移 v0.9、v1.12.0 再后移 v0.10）必须经作者审视会裁决后才可转正（审视会窗口已开，§七 步骤 2）。
- **P-04（serve 代理）特例标注**：README 与 provider.ts 双证据承诺且作者未审视——本 Roadmap 不把它写入 v0.6 承诺，并提示在发布说明中显式表态避免「发布即失信」；**✅ 已落实**：v0.6.0 发布说明（2026-09-05）已显式标注「`lgdl-cli serve` 本地代理未实现、AI 提案待审视」，作者裁决（兑现/撤回/冻结）留审视会。

---

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|----------|------|--------|
| v1.0.0 | 初始创建：基于 `.sddu/docs-tree-root/` 全景（技术 20 项漂移 + 缺口 G1-G6 + 业务全景空白点 + ADR 8 条）制定多版本路线图；新建（此前无 ROADMAP.md） | 2026-08-31 | sddu-roadmap Agent |
| v1.1.0 | 增量更新：新增 F-13 web-cli 独立化两步走规划（作者指令，2026-08-31）——§3.1 候选清单 + §3.2 RICE 新增 F-13 行；§二 v0.8 落点（第一步）+ 新增 v1.1 开源线小节（第二步，门槛式）；§四 依赖 ×2 条；§六 风险 ×2 条；执行摘要版本总览表/里程碑联动 | 2026-08-31 | sddu-roadmap Agent |
| v1.2.0 | 增量更新：F-13 第一步优先级提升 v0.8 → v0.6（作者指令，2026-08-31）——§3.1 F-13 行 P2→P1、建议版本 v0.6（①）、来源补「作者指令提前至 v0.6」；§二 v0.6 新增 F-13 ① 小节（与收口五件套排布 + 2 周时间表 + 护栏依赖调整）、v0.8 段落移除 F-13 ①、v1.0/v1.1 引用联动；§3.2 F-13 行重评（Effort 4→2 / Impact 5→6 / Confidence 0.6→0.7，RICE 2.3→6.3）与注记更新；§四 F-13 ① 护栏依赖调整（v0.7 先行 → v0.6 内 F-02 兜底 + 手动全量回归 + v0.7 补课）；§六 风险 6/9 应对更新；执行摘要版本总览表/本周优先事项/Top 5 注记/里程碑/资源分析/下一步行动联动 | 2026-08-31 | sddu-roadmap Agent |
| v1.3.0 | 增量更新：新增 F-14 web-cli-plugin 浏览器插件规划（**作者规划 2026-09-01，非审视池项**）——§3.1 候选清单新增 F-14 行 + 编号规则补注；§3.2 RICE 新增 F-14 行（Reach 5 / Impact 7 / Confidence 0.5 / Effort 5，RICE 3.5，未入 Top 5）+ 版本归属论证注记（v0.7 主题冲突 / v0.8 审视池前提不符 + 开源前半标准重做风险 / v1.1 同线并行论证）；§二 v1.1 主题扩展「开源线 + 生态消费端」、新增 F-14 规划小节（定位 / 隐含协议发现机制 / 依赖 / 与 F-13 ② 排布 / 门槛）、v0.8 段落补「F-14 不入本版」注；执行摘要版本总览表 v1.1 行 + 关键 Milestones v1.1 行联动；§四 依赖图新增 F-14 块 + 技术共享补 F-14 与 F-13 ② 共享开源线生态基建；§六 风险新增 11~14（协议发现标准缺失 / LLM 直接操作网页安全合规 / 跨域与扩展平台限制 / 与开源线节奏耦合）+ 资源需求分析补 F-14 产能说明；文档版本 1.2.0 → 1.3.0 | 2026-09-01 | sddu-roadmap Agent |
| v1.4.0 | 增量更新：作者指令（2026-09-02）将 `docs/research/archify/lessons-for-lgdl.md` v1.1 借鉴/规避清单**转正**纳入规划（AI 提案 → 作者裁决转正，非审视池项，来源标注「作者指令 2026-09-02 转正，依据 lessons-for-lgdl.md v1.1」；**门禁落位修正**：门禁/收据类按 §2.4 落位引擎开发阶段回归护栏，非用户侧运行时门禁）——§3.1 新增 F-15~F-22 共 8 条（P1-1 几何审计 / P1-2 字号预算 / P1-3 golden 哈希回归 / §4.3+4.5 类型与 per-type 行为矩阵 / P2-5 结构化诊断 / P2-6 原子交付 / P2-4 视觉验收闭环 / P3-7 溯源元数据）+ 编号规则补注 + 「不立 Feature 的项」补 4 条护栏动作（§4.1 / §4.2 文档面 / §4.4 / §4.6）；§3.2 RICE 新增 8 行（最高 F-20 27.0、次高 F-17 19.2，均低于 Top 5 门槛 31.5，**Top 5 不变**）+ 批次注记（转正不虚抬 RICE；v0.7 落位系主题契合 + 作者指令语义权重，同 F-13/F-14 先例）；§二 v0.7 表新增 8 行 + archify 批次排布小节（门禁落位说明、与 F-06/F-11/F-08 载体关系、组 A/组 B 执行顺序、容量复核）；执行摘要版本总览 v0.7 行 + Top 5 注记联动；§四 依赖图新增批次块 + 技术共享补 5 条；§六 风险新增 15~18（v0.7 范围膨胀 / 浏览器基建成本 / 哈希快照维护成本 / 收据脱钩——绑成品 hash 已定）+ 资源需求补批次产能说明；§8.1 增补 archify 借鉴转正行 + §8.3 规划承诺口径联动；头部 v1.4.0 素材增补；文档版本 1.3.0 → 1.4.0 | 2026-09-02 | sddu-roadmap Agent |
| v1.5.0 | 增量更新：登记已完成 Feature **F-23 web-cli-base 框架化**（specs-tree-web-cli-base-framework；**作者对话 2026-09-05 立项**，bash 类比 + SDDU 全流程完成 validated）——§3.1 候选清单新增 F-23 行（来源「作者对话 2026-09-05 立项 + SDDU 全流程完成（validated）」，优先级 P1 架构演进同 F-13 先例，建议版本「✅ v0.6 收口期完成（2026-09-05）」，影响面四包 base/lgdl-web-cli/lgdl-web-op-cli/lgdl-web，状态 ✅ 已完成）+ 编号规则补注；§二 v0.6 新增 F-23 落地小节（紧随 F-13 ①：作者决策 ①~④ + 五项落地〔router 下沉 / 全局 delay / runner 上收 / 注册收敛 / 场景收敛〕+ 验证记录〔582 测试 0 失败、4 包 tsc、grep CLEAN〕+ 遗留 2 项移交收口 + F-14 下游关联）；执行摘要版本总览 v0.6.0 行联动；§8.1 作者已确认事实表增补 F-23 立项与全流程工程验证行 + §8.3 规划承诺口径联动（作者指令 + 已实施工程验证 What 层，素材甄别规则 2）；头部 v1.5.0 素材增补；文档版本 1.4.0 → 1.5.0 | 2026-09-05 | sddu-roadmap Agent |
| v1.6.0 | 增量更新：**同步 v0.6.0 已正式发布（2026-09-05）** 的最新事实（代码/实测/发布全验证，What 层引用）——头部：文档版本 1.5.0 → 1.6.0、状态行改「v0.6.0 已发布、v0.7 立项推进中」、规划基准补分支合入注 + 新增 v1.6.0 素材增补行（合入 main @ c92bf3d / 标签 v0.5.0@10f66d0、v0.6.0@fecb9b2 / npm 8 包 0.6.0（web 侧三包首发，lgdl-web private）/ lgdl-cli 0.6.0 冒烟全绿 / 583 = 582 pass + 1 skip / F-01~F-05 + F-13 ① + F-23 完成 / CHANGELOG 0.6.0 收尾）；执行摘要：愿景段转发布后叙事、版本总览 v0.6.0 行 ⏳→✅ 已发布（主题补 F-23）、本周优先事项勾选 + 重排 v0.7 项、Top 5 改开放项（v0.6 完成项移出，F-07 31.5 / F-20 27.0 / F-17 19.2 / F-15 14.0 / F-09·F-16 并列 12.0）、Milestones v0.6 两行合并为「09-05 ✅ 已达成（提前发布）」+ 新增审视会 09-12 行；§二 v0.6：标题改「✅ 已发布」、新增发布声明与版本内容溯源段、已知缺陷表 → 收口五件套全关闭表（F-01~F-05 ✅）、待审视段补发布说明如实标注、F-13 ① 小节改落地实录（删除 2 周计划表）、F-23 小节标注随 v0.6.0 发布；§二 v0.7：F-02 行标记已落地、F-06 补「护栏后置补课首位」、F-07 架构树按 9 包重核、F-08 标注 D6/D7 已收尾；§二 v1.0/v1.1：门槛与前置同步（F-13 ① ✅ v0.6.0、web-cli-base V2+F-23 发布态）；§3.1：编号规则补 v1.6.0 状态注 + F-01~F-05/F-13 ① 状态 🔧→✅ 已完成（v0.6.0）、F-23 补「+ v0.6.0 发布」、F-07/F-08 行内容联动；§3.2：维度三完成标注、RICE 表完成行标 ✅ + 表首注、F-13 ① 注记补落地、archify 批次注记 v1.6.0 更新（F-20/F-17/F-15 入开放项 Top 2~4）；§四：依赖图改「v0.6.0 已发布 + 发布后依赖线」、技术共享前 4 条标已落地；§五：审视会窗口已开（~09-12）、P-02/P-04 现状核实与建议处理联动（发布说明已免责标注）；§六：风险 1/2/6/7/9 解除或化解（✅，583 全绿 + 未带缺陷发布）、风险 3/5 部分缓解 + 表后风险状态总注、资源需求转 v0.6 落地结果 + 583 基线；§七：v0.6 收口/发布清单标已完成、重排为审视会 → v0.7 立项（F-06/F-11 首位）→ archify 组 A/组 B → F-12 → v1.1 前瞻；§8：§8.1 增补「质量基线（v0.6.0 发布态）583」+「v0.6.0 正式发布」两行、§8.3 补 v1.6.0 增补口径 + P-04 已落实标注；头部 v1.6.0 素材增补；文档版本 1.5.0 → 1.6.0 | 2026-09-05 | sddu-roadmap Agent |
| v1.7.0 | 增量更新：登记候选 Feature **F-24 渲染器终点汇聚路由优化（正交总线/缓冲层）**（来源 = **lgdl-cli v0.6.0 实际渲染 15 节点/19 边多终点决策图 969x1128 实测**，2026-09-05，v0.6.0 发布态 583 基线全绿下发现的体验类缺陷）——头部：文档版本 1.6.0 → 1.7.0、新增 v1.7.0 素材增补行（f3→end1 / f5→end1 蛇形绕行证据路径照实引用、根因 = 终点汇聚路由缺缓冲层/正交总线、次生问题已实测排除）；§3.1：编号规则段补 F-24 候选定位（What 层已实测观察、P2 体验类非阻断）+ 候选清单新增 F-24 行（F-23 后，状态 🔧 待立项〔候选，v0.7 或 v1.x 待排期〕）+ v1.7.0 状态注（待排期候选面含 F-24、候选未立项状态必须待排期）；§3.2：RICE 表新增 F-24 行（Reach 8 高——每张多终点图都受影响 / Impact 5 中——仅视觉质量 / Confidence 0.6 中——路由模块待设计验证 / Effort 3 中——需路由算法调整，RICE 8.0 与 F-11 并列、未入 Top 5）+ 评分注记段；§四：依赖图新增 F-24 块（依赖 web-cli-base/render 渲染器；与 F-06 联动补路由质量断言用例；与 F-11/F-15 共享 router 布线模块；注明与 v0.7 技术债批次关系——护栏先行、先护栏后修复）+ 技术共享补 1 条；§七：步骤 3 将 F-24 纳入 v0.7 候选（排在 F-06/F-11 测试护栏之后，RICE 亦居其后；标注「已实测取证，可进 spec」；容量不足顺延 v1.x 由作者裁决）；§8：§8.1 增补「F-24 渲染路由缺陷（已实测）」已确认事实行（证据路径照实引用）、§8.3 补 v1.7.0 候选登记口径（已确认事实 → 候选登记，非排期承诺）；头部 v1.7.0 素材增补；文档版本 1.6.0 → 1.7.0 | 2026-09-05 | sddu-roadmap Agent |
| v1.8.0 | 增量更新：**F-24 完整复现 DSL 内嵌于本文档**（作者要求 2026-09-06：不建独立 fixture 目录，ROADMAP 自包含可复现）——§8.1 F-24 事实行后新增「F-24 完整复现 DSL」小节：①完整复现源（触发 f3→end1 / f5→end1 蛇形绕行的 **15 节点 / 19 边**源文件，yaml，1.7KB **原样内嵌**）②复现步骤（`lgdl-cli render --file <① 存成的 .lgdl 文件> -o out.svg --format svg`，lgdl-cli v0.6.0 发布态 583 基线）③预期输出对照（画布 **969x1128** / **15 nodes / 19 edges** / 两条蛇形绕行路径——`f3→end1` 10 段折线 x 4 次折返 273→399→504→560→545、`f5→end1` 8 段折线，与 §3.1 / §8.1 F-24 行已登记证据一致）；§8.3 补 v1.8.0 复现口径（复现 DSL 内嵌于本文档，可直接复现、无需外部文件；系 §8.1 F-24 事实行的支撑附件，不改候选定位）；头部：文档版本 1.7.0 → 1.8.0、新增 v1.8.0 素材增补行；F-24 仍为 🔧 待立项（候选，v0.7 或 v1.x 待排期）；文档版本 1.7.0 → 1.8.0 | 2026-09-06 | sddu-roadmap Agent |
| v1.9.0 | 增量更新：登记已完成 Feature **F-25 web-cli-base 面向浏览器生态位的 agent 能力完备化**（specs-tree-web-cli-base-v2；**作者对话 2026-09-06 立项**，方向公理 D-5 = 面向浏览器生态位设计工具集、不照搬 OS read/write/bash，OS 能力代理未来 os-cli-base；+ **SDDU 全流程完成** validated，⚠️ 有条件通过）+ **版本落点裁决（作者 2026-09-06 O-008：最近的独立版本，原 v0.7 内容后移）**——头部：文档版本 1.8.0 → 1.9.0、状态行改「v0.7 = F-25 已 validate、待合入发布（作者裁决原 v0.7 工程质量内容后移）」+ 新增 v1.9.0 素材增补行（46 FR 十三组九域工具集 / 权限门禁三者组合 / 15 任务 9 波次 / 724 pass·0 fail·1 skip / 真实浏览器冒烟收口清单 5 项；版本编号调整：原 v0.7 工程质量 → v0.8.0、原 v0.8 AI 增强 → v0.9.0，系作者裁决的优先级变更；F-24 候选落点同步调整为 v0.8 或 v1.x）；执行摘要：愿景段转 v0.7=F-25 叙事、版本总览表重排（新增 v0.7.0 = F-25 行，v0.7.0 原工程质量 → v0.8.0 行、v0.8.0 原 AI 增强 → v0.9.0 行、v1.0.0 时间标待复核）、本周优先事项重排（v0.7 = F-25 收口发布 + v0.8 后移立项 + 审视会）、Top 5 版本列 v0.7→v0.8 + 注记补 v1.9.0、Milestones（新增 09-06 F-25 validate 达成行 + v0.7 收口发布待作者行；原 09-30/10-09/10-30 里程碑改「后移待重排」；审视会行版本位 v0.8→v0.9）；§二：新增 v0.7.0（F-25）完整小节（立项来源/方向公理/作者裁决/成果/验证记录/遗留人工清单 5 项/版本落点与下游）、原 v0.7 工程质量小节改 v0.8.0（后移注 + 双轨/里程碑/排布引用更新）、原 v0.8 AI 增强小节改 v0.9.0（后移注）、v1.0/v1.1 门槛与依赖引用更新（v0.7→v0.8）；§3.1：编号规则补 F-25 登记说明 + v1.9.0 状态注（F-25 状态 = ✅ 已完成 + 📋 v0.7 待合入发布，不得写成已发布）+ 候选清单新增 F-25 行（来源「作者对话 2026-09-06 立项 + SDDU 全流程完成（validated）」，优先级 P1 架构演进同 F-23 先例，建议版本 v0.7.0，状态 ✅ 已完成 + 待合入发布）+ F-06~F-22 行建议版本 v0.7→v0.8、F-12 行 v0.8→v0.9、F-24 行 v0.7 或 v1.x→v0.8 或 v1.x；§3.2：RICE 表行版本标 v0.7→v0.8（F-15~F-22/F-24）+ 批次注记/F-24 评分注记/F-14 归属论证补 v1.9.0 版本位口径；§四：依赖图新增 v0.7 = F-25 节点块（上游 F-23 ✅、发布待作者）+ 工程质量/审视立项版本位更新；§五：P-01/P-06 建议处理版本位 v0.8→v0.9；§六：风险 3/4/9/15/16 应对版本位更新 + **新增风险 19**（v0.7 排期变更连带敞口：工程质量后移 + F-25 大分支待合入 + 版本窗口连锁）+ 风险状态总注与资源需求分析更新（724 分支基线、F-25 人工收口说明）；§七：步骤 2 审视会输出改 v0.9 立项输入 + 步骤 3 改 v0.7 = F-25 收口发布（人工清单 5 项 → 合入 → 发布，时间不承诺）+ 步骤 4 v0.8 立项 + 步骤 5 archify 批次后移 + 步骤 6 F-12 后移 v0.9；§8：§8.1 新增「F-25 立项与全流程工程验证」+「F-25 版本落点裁决」两行已确认事实、F-24 事实行落点更新、§8.3 补 v1.9.0 增补口径（版本编号调整语义：历史叙述中「v0.7」若指工程质量版本其当下对应 v0.8）；头部 v1.9.0 素材增补；文档版本 1.8.0 → 1.9.0 | 2026-09-06 | sddu-roadmap Agent |
| v1.10.0 | 增量更新：登记 v0.7 同批第三 Feature **F-26 web-cli-base 浏览器外壳纵深与事件流 v4（specs-tree-web-cli-base-v4）**（作者立项 2026-09-07，基线同 F-25 分支）——SDDU **全流程完成（2026-09-08）**：review ⚠️ 有条件通过（37 通过 + 5 警示 + 0 失败 + 0 阻塞）、validate R1 **V1~V17 全✅**（FR 30/30 · NFR 8/8 · EC 12/12 · AC 10/10，全仓 **1007 pass / 1 skip / 0 fail**，G-01/G-02 独立复核 PASS，真实 DeepSeek AI 闭环 11/11）——头部素材增补 v1.10.0 行 + 状态行联动（v0.7 = F-25/F-26 同批叠加，v2 分支未发布）；§二 v0.7 增 F-26 同批登记小节（P2 验证门 G-01/G-02/SHD PASS 记录 + F-14 契约预留继承基线 FR-026/027）；文档版本 1.9.0 → 1.10.0 | 2026-09-08 | sddu-build Agent |
| v1.11.0 | 增量更新：登记 **F-07 README 门面对齐提前至 v0.7 分支完成**（作者指令 2026-09-10；覆盖 D4/D5/D8/G3）——头部：文档版本 1.10.0 → 1.11.0 + 新增 v1.11.0 素材增补行；执行摘要：Top 5 移出 F-07（榜首由 F-20 接替、第 5 位 F-08 补入）+ 本周优先事项/里程碑去 F-07；§二 v0.8 双轨结构与 F-07 表行标记完成；§3.1 F-07 行状态 📋→✅（提前至 v0.7）、§3.2 RICE 表 F-07 行标 ✅；§四/§六/§七 中「F-07/F-08」联动为「F-08（F-07 已完成）」；文档版本 1.10.0 → 1.11.0 | 2026-09-10 | sddu-roadmap Agent |
| v1.12.0 | 增量更新：**作者裁决 2026-09-10 开启 v0.8 = 浏览器插件孵化**——将 **F-14 web-cli-plugin** 由 v1.1 **提前至 v0.8** 作该版主题；**版本位重排**：原 v0.8（工程质量与文档对齐）→ v0.9.0、原 v0.9（AI 增强与生态）→ v0.10.0、v1.0.0 不变（时间窗口标注待复核）、v1.1.0 = 仅 F-13 ②（开源）、F-14 移出 v1.1。头部：文档版本 1.11.0 → 1.12.0 + 状态行补作者裁决 2026-09-10 + 新增 v1.12.0 素材增补行（F-14 提前/版本位重排/技术细节不预设立场）。执行摘要：愿景段任务次序改「v0.7 收口 → v0.8 插件孵化 → v0.9 工程基线 → v0.10 审视后立项」、版本总览表新增 v0.8.0 = F-14 行 + 工程质量 v0.8→v0.9 行 + AI 增强 v0.9→v0.10 行 + v1.0 时间标 + v1.1 行仅 F-13 ②、本周优先事项新增 v0.8 = F-14 立项/推进 + 工程质量 v0.8→v0.9、Top 5 版本列 v0.8→v0.9 + v1.12.0 注、Milestones 新增 v0.8 = F-14 行 + 后续版本位 v0.9/v0.10。§二：新增 v0.8.0（浏览器插件孵化 F-14）小节（版本位裁决 + F-14 定位作者 2026-09-10 补充「独立于 LGDL、替代内置 AI 助手」+ 依赖/与 F-13 ② 排布/门槛）、原 v0.8 工程质量小节改 v0.9.0（再后移注 + 双轨/里程碑/排布引用更新）、原 v0.9 AI 增强小节改 v0.10.0（再后移注 + F-14 已移出注）、v1.1 小节移除 F-14 小节并调整为仅 F-13 ②、v1.0 门槛引用 v0.8→v0.9。§3.1：编号规则 F-14 补作者裁决 2026-09-10 提前至 v0.8 + F-15~F-22 版本位补 v1.12.0 + F-24 落点 v0.8→v0.9 + 新增 v1.12.0 状态注；候选清单 F-06~F-22 建议版本 v0.8→v0.9、F-12 v0.9→v0.10、F-14 v1.1→v0.8（内容补独立于 LGDL/替代内置 AI 助手）、F-24 v0.8 或 v1.x→v0.9 或 v1.x。§3.2：RICE 表 F-14 行 v1.1→v0.8 + F-15~F-22/F-24 行 v0.8→v0.9 + F-14 版本归属论证改写（原「v1.1 合适」被作者裁决覆盖）+ 批次注记/F-24 评分注记补 v1.12.0。§四：依赖图新增 v0.8 = F-14 节点块（含协议发现机制/插件运行时/与 F-13 ② 解耦）+ 工程质量/审视立项版本位 v0.9/v0.10 + F-14 块自 v1.1 移出 + 技术共享 F-14/F-13 ② 解耦 + F-24/archify 版本位更新。§五：P-01/P-06 建议处理版本位 v0.9→v0.10。§六：风险 3/4/9/11/14/15/16/19 版本位与 F-14 线更新 + 风险状态总注 + 资源需求分析（F-14 产能改 v0.8 线、archify 版本位）。§七：步骤 2 审视会输出改 v0.10 立项输入 + 步骤 4 新增 v0.8 = F-14 立项/推进 + 步骤 5 工程质量立项改 v0.9 + 步骤 6 archify 改 v0.9 + 步骤 7 F-12 改 v0.10 + 步骤 8 v1.1 前瞻（F-14 移出）。§8：§8.1 新增「F-14 版本位裁决（v0.8 = 浏览器插件孵化）」已确认事实行 + F-24 落点更新 + §8.3 补 v1.12.0 增补口径。文档版本 1.11.0 → 1.12.0 | 2026-09-10 | sddu-roadmap Agent |
| v1.13.0 | 增量更新：登记 **F-14 web-cli-plugin 立项与 SDDU 推进进展**（v0.8 主题，2026-09-11）——头部：文档版本 1.12.0 → 1.13.0、状态行联动（v0.8 = F-14 已立项并 P0 validated、代码在 feature/web-cli-plugin 未合入发布、P1/P2 待续）+ 新增 v1.13.0 素材增补行（Feature 目录 specs-tree-web-cli-plugin / SDDU P0 全流程 discovery→spec 46 FR·10 NFR·16 EC·12 AC→plan 12 ADR→tasks 16 任务 9 波次→build P0 TASK-001~011→review R1 ❌ 2 阻塞→修复→R2 ⚠️ 0 阻塞→validate ⚠️ 0 阻塞 / phase=validated·status=completed〔P0〕/ 全仓 0 fail〔web-cli-base 483·lgdl-web 75·web-cli-plugin 68·core 267·render 94+1skip·router 8·web-cli 84·op-cli 15〕/ 插件 tsc 0 error·G-MV3 PASS·G-KEY PASS / 作者裁决 2026-09-10 O-001~O-012 与 P1 五项采纳默认 / 遗留非阻塞清单 / P1+P2 未实现）。执行摘要：版本总览表 v0.8.0 行状态 📋 规划 → 🚧 推进中（P0 validated，P1/P2 待续）+ 补 P0 validated 事实（2026-09-11）、本周优先事项 v0.8 立项条目改 `[x]` 并补 P0 完成与 P1/P2 待续、Milestones 新增 2026-09-11「F-14 P0 SDDU 全流程完成」行。§二：v0.8.0 小节标题状态 📋 规划 → 🚧 推进中（P0 validated，P1/P2 待续）+ 新增「F-14 落地进展」小节（Feature 目录 / SDDU P0 全流程 / 测试基线 + G-MV3·G-KEY / 作者裁决 / 待续 P1/P2 / 版本落点 feature/web-cli-plugin 未合入发布）。§3.1：新增 v1.13.0 状态注（F-14 状态由 📋 规划 → 🚧 推进中）+ 候选清单 F-14 行状态更新并补 Feature 目录名/分支/测试基线。§七：步骤 4 补 P0 已完成 + P1/P2 待续与遗留人工面收口。§8：不改其他 Feature 定义。文档版本 1.12.0 → 1.13.0 | 2026-09-11 | sddu-roadmap Agent |
| v1.14.0 | 增量更新：登记 **F-14 web-cli-plugin P1/P2 全量实现 + TASK-016 内置助手下线执行**（v0.8 主题，2026-09-12）——头部：文档版本 1.13.0 → 1.14.0、状态行联动（P1/P2 已全量实现、TASK-016 下线已执行、phase=builded 待 review/validate）+ 新增 v1.14.0 素材增补行（16/16 任务 / 全仓 build·test 0 fail〔web-cli-base 483 零回归·lgdl-web 31·web-cli-plugin 112·tsc 0 error〕+ E2E A/B PASS / Gate-D D-1~D-7 达标 → 下线执行〔ai/* 移除 + App.tsx 摘除，保留 base 机制层 + web-cli-host〕/ 回退=单提交 revert + VITE_AI_ASSISTANT_FALLBACK 默认 off / EC-016 不静默 / FR-046 docs/release.md 发布渠道就绪 / 遗留非阻塞〔C-4/C-5 过渡期关闭·人工面 H6 等·商店 S-016〕）。执行摘要：版本总览表 v0.8.0 行状态更新（P0~P2 全量 build 完成、待 review/validate）+ 内容补下线执行与发布渠道、本周优先事项新增 2026-09-12 P1/P2 完成条目并改原条目状态、Milestones 新增 2026-09-12「F-14 P1/P2 全量实现 + TASK-016 下线执行」行。§二：v0.8.0 小节标题状态更新 + 「F-14 落地进展」小节补 P1/P2 实现与下线执行段 + 版本落点更新。§3.1：新增 v1.14.0 状态注 + 候选清单 F-14 行状态更新。§七：步骤 4 更新为 P0~P2 全量实现 + 待 review/validate。§四：依赖图 F-14 节点状态更新。文档版本 1.13.0 → 1.14.0；§8 不改其他 Feature 定义。 | 2026-09-12 | sddu-build Agent |
| v1.15.0 | 增量更新：登记 **F-14 web-cli-plugin SDDU 全流程完成并 validated**（v0.8 主题，2026-09-12）——头部：文档版本 1.14.0 → 1.15.0、状态行联动（F-14 已全流程完成并 validated 0 阻塞；分支最新 `4e537a7`）+ 新增 v1.15.0 素材增补行（16/16 任务 / SDDU 全流程 discovery→spec v1.3·46 FR·10 NFR·16 EC·12 AC→plan 12 ADR→tasks 16 任务 9 波次→build 含 R1 修复+遗留清账→review R1 ❌2 阻塞→R2 ⚠️→**R3 ✅ 0 阻塞**→validate R1 ⚠️→**R2 ✅ 0 阻塞** / 指标 FR 46/46·NFR 10/10〔NFR-007 量化实测〕·EC 16/16·AC 12/12·0 阻塞 / 关键交付 packages/web-cli-plugin + web-cli-host + docs 八件 + R8 E2E test/e2e/fullchain.mjs / 内置助手下线已执行 O-001〔ai/* 8 文件移除 + App.tsx 摘除，保留 base 机制层 + web-cli-host〕+ 回退=单提交 revert + VITE_AI_ASSISTANT_FALLBACK 默认 off + EC-016 不静默 / 测试基线全仓 0 fail〔web-cli-base 483 零回归·web-cli-plugin 112〕/ 门禁 G-MV3·G-KEY·GATE-011 PASS / 剩余人工面 H0~H10·C-4/C-5·S-016·SW 内存采样）。执行摘要：版本总览表 v0.8.0 行状态 🚧 推进中 → ✅ 已完成（SDDU 全流程 validated，0 阻塞）+ 时间/内容补 validated 指标、本周优先事项新增 F-14 validated 条目并改 v0.8 收口条目为剩人工面、Milestones 新增 2026-09-12「F-14 全部 16 任务完成 + SDDU 全流程 validated」行。§二：v0.8.0 小节标题状态 ✅ 已完成 + 版本落点补最新 `4e537a7` + 新增「F-14 完成进展」小节（全流程 / 指标 100% / 关键交付 / 内置助手下线已执行 / 测试基线与门禁 / 剩余人工面）。§3.1：新增 v1.15.0 状态注 + 候选清单 F-14 行状态 🚧 → ✅ 已完成（v0.8；SDDU validated 2026-09-12，0 阻塞）+ 补交付/指标/分支。§3.2：F-14 归属论证补 v1.15.0 validated 注。§四：依赖图 F-14 节点状态更新为 ✅ validated。§七：步骤 4 更新为 SDDU 全流程 validated。§8：不改其他 Feature 定义。文档版本 1.14.0 → 1.15.0 | 2026-09-12 | sddu-roadmap Agent |
