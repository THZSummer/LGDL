# 验证策略：specs-tree-web-cli-base-v2（web-cli-base v2：面向浏览器生态位的 agent 能力完备化——九域浏览器原生工具集 + 增强/进阶层机制）

> **文档定位**: SDDU 验证策略 — 指导 validate Agent 执行自主验证的场景和方法（V1~VN 定义一次）；逐项验证结果见 validate-report.md（build 完成 + review passed 后每轮独立产出）
> **前置依赖**: spec.md v1.0（46 FR 十三组 REG/PRM/DOC/STR/SRC/NET/DOM/EXE/TSK/SES/EXT/LGDL/BSL + 10 NFR + 15 EC + 12 AC，S-01~S-09 已裁）、plan.md v1.0（8 ADR-001~008 + §2.3 扩展接口 + §4.2 测试策略 + §5 文件影响面 + §6 风险 R-001~012 + §8 波次交接）、discovery.md v1.1（§3.3 映射表 / §3.4 九域 / §3.5 不可承载面）、上游 F-23 validate.md/validate-report.md（场景先例 + AC-008 遗留 ⏭️）、state.json（phase=planned）
> **创建人**: SDDU Validate Agent
> **创建时间**: 2026-09-06
> **版本**: v1.0
> **更新人**: SDDU Validate Agent
> **更新时间**: 2026-09-06
> **更新说明**: 初始创建 — 自主定义 V1~V17 验证场景（代码类 Feature 全五维度），覆盖：全仓测试基线守恒 + F-23 additive 零回归（FR-043）、F-23 AC-008 真实闭环补跑前置基线（FR-045）、横切机制（REG 注册表 v2 / PRM 权限门禁）、九域工具逐域验收（DOC/STR/SRC/NET/DOM/EXE/TSK/SES/EXT/LGDL 参照 spec AC-002）、15 EC 验收映射、浏览器真实环境冒烟（对照 plan P-01 双轨决策）、不可承载面"不做"边界（NG-001~009）、跨会话/IndexedDB/Worker 生命周期（FR-029~035/EC-008/013/015）、schema 预算与性能（NFR-005/AC-011）、行为等价声明（FR-046）

## 1. 验证概要

| 维度 | 数值 |
|------|:--:|
| 验证对象 | 2 改动包（web-cli-base 机制+九域工具、lgdl-web 接入面）+ 全仓 9 包回归；base 新增 ~46 模块、lgdl-web 改动 7 + 新增 1（plan §5） |
| 验证场景 | V1~V17（五维度交叉覆盖：测试覆盖 / 接口数据 / 构建 / 性能边界 / 漂移检测） |
| Feature 类型 | 代码类（全五维度验证）——含少量 React UI（AskDialog/SettingsPanel/App 恢复入口归 lgdl-web 场景壳） |
| 验证基线 | git 工作区 build 产物 + spec.md v1.0（S-01~S-09 已裁冻结）+ plan.md v1.0（8 ADR）+ F-23 上游产物（specs-tree-web-cli-base-framework/validate-report.md，AC-008/testConnection 遗留 ⏭️ 记录于 :181-183） |
| 动态验证 | 全仓 npm test 真实执行 + 4 包 tsc --noEmit + lgdl-web vite build + 自主专项脚本（真实组装 / fake 后端注入 / 间谍断言 / mock fetch 与 mock 搜索端点 / 时钟注入 / 假裁决器） |
| 前置条件 | ⚠️ review 尚未执行（state.json phase=planned）——**validate.md 策略产出不依赖 review**（§8.1 ADR-004）；validate-report.md 执行前置 = review-report.md 状态 passed + build 产物就绪，见 §2 |

## 2. 前置条件与执行前提

1. **策略先行**：本 validate.md 于 plan 完成后产出（不依赖 tasks/build，ADR-004 步骤 1）；用户确认策略后，等待 build + review passed 再触发 validate-report（步骤 2，支持 R1/R2 多轮）。
2. **执行环境前提**（validate-report 阶段核验）：
   - 可执行环境：Node.js + workspace 测试框架 + tsc/vite（AC-009）；
   - F-23 遗留 ⏭️（真实 AI 闭环 AC-008 + testConnection 真实端点）需**真实浏览器 + 厂商 API Key**——v2 前置人工基线（FR-045），见 V4/V17；环境不具备时该面 ⏭️ 移交收口人工清单（沿 F-23 validate.md:59 同口径，不阻塞 node 面自动化判定）。
3. **P-01 双轨决策引用**（plan §4.3，待作者确认默认=维持现状）：base 零新增测试依赖——DOM/浏览器面以**注入桩 node 单测** + **validate 真实浏览器人工冒烟清单**承接；若作者改裁引入 playwright/jsdom，V10/V13 相应转为自动化脚本（见 §5 裁决点 D-1）。
4. **P2 试点可裁剪语义**（spec §9.4/plan §8 波 3）：FR-021 ws、FR-033 workflow、FR-037 MCP、FR-020 save 完整、FR-024 notify、FR-025 clipboard、FR-027 exec-remote、FR-028 worker-session、eval-wasm 完整 均标注「若入范围」——build 产物若裁剪，对应 FR/EC 验证标注 ⏭️「裁剪未入范围（spec 允许，不阻塞）」，validate-report 记录裁剪事实即可。
5. **波次执行对齐**：build/tasks 按 P0（波 1 横切四柱）/P1（波 2 域主体）/P2（波 3 试点）推进（plan §8）；validate-report 可按波次分批执行（每波独立 build+测试绿后即验），但本策略 V1~V17 以**完整 Feature 产物**为最终判定对象，不因波次拆分场景。

## 3. 自主验证场景（V1~V17）

**验证对象来源**：
- `spec.md`：AC-001~012（总体验收）+ FR-001~046（十三组）+ NFR-001~010 + EC-001~015 + NG-001~009 + D-5/D-6/A-01~A-04
- `plan.md`：ADR-001~008 + §2.3 扩展接口契约（ToolEntry additive / PermissionGate 挂点 / 全限定名三链）+ §4.2 测试策略（D-005 增删有据）+ §8 波次交接表
- `discovery.md`：§3.3 生态位映射表（A~F 组，NFR-010 锚点）+ §3.5 不可承载面清单（NG 边界锚点）
- F-23 上游：validate-report.md（遗留 ⏭️ 项 + 测试基线数）+ validate.md（V1~V12 场景先例）
- review.md/review-report.md：build 完成后注入（静态结论 + 改进项前置处理）

**Feature 类型自适应**：代码类 → 全五维度验证。性能维度说明：本 Feature 无数值型并发/响应阈值 NFR；性能语义性要求（NFR-005：schema 膨胀受控/超限护栏/无策略零开销）由 V16 时钟注入与体积断言 + EC-011 截断断言承接；浏览器真实面（真 IDB/OPFS/Notification/DOM/worker）为 ⏭️ 人工冒烟清单（V13）。

**场景分组结构**：A 基线守恒与构建（V1~V3）→ B F-23 真实闭环补跑（V4）→ C 横切机制（V5~V7）→ D 九域工具验收（V8~V12）→ E 浏览器真实冒烟（V13）→ F EC 覆盖交叉核对（V14）→ G 生态位纪律漂移（V15）→ H schema 预算/性能（V16）→ I 行为等价闭环（V17）。

### 组 A — 基线守恒与构建（测试覆盖 + 构建维度）

| # | 验证对象 | 验证步骤 | 预期结果 | 门禁标准 | 验证维度 | 验证方法 |
|---|---------|---------|---------|:--:|:--:|:--:|
| V1 | AC-009/NFR-006 + FR-043 全仓测试基线守恒 | ① `npm test`（root → 9 workspace 依序真实执行）逐包汇总；② 各包 tests/pass/fail 计数；③ 与 F-23 validate-report 基线数核对（router.test ≥13 / delay.test 10 / runner.test ≥11 / sleep.test ≥12 / lgdl-web session.test 既有用例 + lgdl-web-cli/op-cli tool-entry 用例）；④ git status 核对 F-23 既有测试文件零删除 | 9 包 0 失败；F-23 既有专项文件用例数只增不减（D-005 无删除）；lgdl-render 1 env-skip 为既有 LGDL_MATRIX_B11 门控（与本次无关） | 0 失败；F-23 测试删除 = 0（删除需 D-005 依据 + 等价承接断言） | 测试覆盖 | npm test（真实执行）+ git status |
| V2 | NFR-007/AC-009/AC-001 类型与构建完整性 | ① `npx tsc --noEmit -p` × 4 改动包（web-cli-base / lgdl-web-cli / lgdl-web-op-cli / lgdl-web）；② lgdl-web vite build；③ base 独立构建冒烟（无业务包环境：router + 内建 + 新域工具可列 schema/查 help/派发，AC-001） | 4 包 tsc 退出码 0、vite build 退出码 0；base index 导出面含新能力类型（registry v2/permission/audit/platform/assembly/域工具工厂/store 类型，NFR-007）；base 独立可用 | tsc/vite 零错误；base 导出面清单核验无缺 | 构建 | tsc + vite build + 独立构建脚本 |
| V3 | FR-043/AC-005/AC-007 F-23 契约 additive 零回归专项 | ① 抽取 F-23 专项（router/delay/runner/session）既有断言全绿（同 V1 计数守恒）；② 自主脚本（真实编译产物）：注册**无新字段**条目 → deriveTools 顺序 = F-23 契约（业务注册序 + 内建置末，router.test.ts:153 等价）、dispatch/help/schema 行为与旧一致；③ 新字段缺省断言：group 缺省→namespace→'general'、namespace 缺省 ''（注册键=name 与 F-23 完全一致）、enabled 缺省 true、risk 缺省 → 旧 5 工具路径行为逐字节等价；④ web-fetch 缺省调用（无 clean 参数）返回原文与旧 schema 兼容；⑤ 顶层 5 工具（无命名空间）dispatch/派生零回归 | 全部断言通过；F-23 顺序契约不回退；新字段缺省 = 旧行为完全一致 | F-23 专项零回归 + 缺省兼容断言通过 | 测试覆盖 + 接口数据 | 自主脚本（/tmp）+ node --test |
| V4 | FR-045/AC-008 F-23 真实 AI 闭环补跑（前置人工基线） | ① 真实浏览器（lgdl-web UI）+ 真实 API Key：跑 F-23 原闭环（5 工具路径：lgdl-web-cli/op-cli/web-fetch/sleep/help 消息流用户可感知行为）；② testConnection 真实端点核验；③ 记录基线结果（v2 叠加前） | F-23 AC-008 补跑通过并记录基线（validate-report 必含该记录，FR-045）；作为 V17 行为等价 diff 的对照基线 | 补跑记录存在 + 基线通过；环境不具备 → ⏭️ 标注 + 移交收口人工清单（不阻塞 node 面自动化，但 FR-045/046 最终判定受影响） | 接口数据 | 真实浏览器人工闭环（机械面脚本承接可自动化部分） |

### 组 B — 横切机制（REG 注册表 v2 + PRM 权限门禁；P0 波 1，测试覆盖 + 漂移维度）

| # | 验证对象 | 验证步骤 | 预期结果 | 门禁标准 | 验证维度 | 验证方法 |
|---|---------|---------|---------|:--:|:--:|:--:|
| V5 | FR-001~004/038/EC-010/AC-005 + ADR-001 REG 注册表 v2 专项 | router.test 增补专项逐项断言：① group 声明 → listHelp 分组结构 + deriveTools 分组切片/全量两态（FR-001）；② 同基名不同命名空间共存（`search` vs `skill.search`），三链（schema function.name/dispatch 键/help 查询键）一致用全限定名 + 文本前缀可逆解析（FR-002）；③ 动态源 register→派生可见→派发可执行→unregister→schema/help/dispatch 全链即时消失；重复注册同命名空间同全限定名抛错（FR-003/EC-010 沿 EC-003）；④ enabled:false → schema 不含 / help 标注「已禁用」/ dispatch 返回显式「已禁用」错误，三链断言（FR-004/EC-001）；⑤ 卸载后 dispatch → EC-001「未注册」文案；⑥ 动态源 register 全程入审计（source/时间/命名空间/全限定名，FR-038）；⑦ 命名空间次序可配置（setNamespaceOrder）+ 缺省 = 首次注册序 | REG 四能力全链断言通过；顺序契约延续（组内注册序 + 内建置末）；EC-010 三场景（重名拒绝/卸载后走未注册/命名空间外注册拒绝）全部断言 | REG 专项全绿 + 顺序契约断言 + EC-010 三场景通过 | 测试覆盖 + 接口数据 | node --test 专项 + 自主脚本 |
| V6 | FR-005~007/EC-001/002/014/AC-004 + ADR-002 PRM 权限裁决矩阵 + ask 契约 | permission.test 专项：① 裁决矩阵 allow/ask/deny × 命中/未命中；② **间谍断言**：deny 规则 → dispatch ok:false「权限被拒」且执行器零调用；时钟断言 deny 短路在 delay gate 前（不产生等待）；③ 默认取向：敏感面（写/外联/UI 副作用 risk 分类）deny/ask、只读面 allow，场景可覆盖；④ dsh 可插拔策略对象注入生效（doc-edit read-before-edit 生态位：未先读 → ask，联动 V8）；⑤ ask 三路 fake 裁决器（allow/deny/超时→deny+审计）；runner 循环在 ask 挂起期间不推进、裁决后继续（FR-007 AC）；⑥ EC-002 用户取消/超时 → deny + 审计 + AI 自愈（机械面 runner 重述/换路径断言）；⑦ EC-014 扩展自带 allow 与全局 deny 冲突 → 默认 deny 优先 + 冲突裁决入审计；⑧ EC-001 三态文案互异断言（未注册/已禁用/权限被拒） | 裁决矩阵全绿；间谍断言 deny 时 executor 未被调用；ask 挂起 runner 不推进；deny 短路零 delay | permission.test 全绿 + 间谍/时钟断言通过 + EC-001/002/014 覆盖 | 测试覆盖 + 性能边界 | node --test 专项 + 间谍/时钟注入脚本 |
| V7 | FR-008~010/EC-003/007/NFR-003/009 + FR-038/FR-026 联动 PRM allowed-tools/授权转译/untrusted | ① allowed-tools（WorkBuddy 生态位）：扩展源声明授权集，授权工具注册成功 / 越权工具注册被拒或降级 ask（默认被拒 + 审计，FR-008/036 联动）；② FR-009 浏览器 API 授权失败转译：注入 NotAllowedError/SecurityError/NotFoundError（通知/剪贴板/文件句柄/权限查询桩）→ 工具 ok:false + 含授权路径指引的友好错误，会话不中断；③ untrusted（FR-010）：web-fetch/web-search 输出携带 ToolResult.trust（来源/时间/可信级）+ 入审计；标记不因 HTML→MD 清洗丢失；含注入指令的外部文本在 AI 闭环不回显执行（机械面）；④ audit.test：权限裁决/工具调用/扩展注册/上下文压缩四类审计事件记录 + sink 注入（NFR-009）；⑤ grep 断言无策略旁路实现（策略代码只存在于路由层，NFR-003） | 授权/未授权两场景断言；转译文案含授权路径指引；untrusted 标记与不自动执行语义成立；审计四类事件面单测通过 | 专项全绿 + 旁路 grep 零命中（旁路 = 严重漂移） | 测试覆盖 + 漂移检测 | node --test 专项 + grep 断言 |

### 组 C — 九域工具验收（DOC/STR/SRC/NET/DOM/EXE/TSK/SES/EXT/LGDL；接口数据 + 测试覆盖维度，域×FR 对照 AC-002）

| # | 验证对象 | 验证步骤 | 预期结果 | 门禁标准 | 验证维度 | 验证方法 |
|---|---------|---------|---------|:--:|:--:|:--:|
| V8 | FR-011/012/013/014/015/042 + EC-004/005 + ADR-003 DOC+STR 内容/存储域（P0） | ① doc-read：假 ctx（source/docId）→ 读回内容；无上下文 → 可读错误并列可读对象；语义不含路径遍历（grep 断言，D-5）；② doc-edit：str_replace/insert/create 原语 → changed+source 推进（与 lgdl-web-cli 文档变更契约兼容）；read-before-edit 策略启用未先读 → ask（联动 V6）；③ storage：注入 fake StorageBackend(memory) → list/read/write/remove 全链；边界断言（origin 私有/卷内目录/无 origin 外访问）；④ storage-quota：注入假 estimate → 输出可读 + 可解析；⑤ settings：node 假后端 CRUD + 隔离命名空间；⑥ EC-004：配额超限注入 → 「配额不足」可读错误 + 清理建议（联动 quota）；⑦ EC-005：存储不可用注入（IDB/OPFS 抛错）→ 降级内存态 + 明示「本次会话不持久」；⑧ lgdl-web provider 应用态（localStorage `lgdl-ai-settings`）读写行为不回归（平移未做则行为原样，FR-042） | 全链断言通过；错误转译含指引；doc/storage 无路径遍历语义；provider 旧字段读写零回归 | doc/storage/settings 专项全绿 + EC-004/005 转译断言 | 接口数据 + 测试覆盖 | node --test 专项（fake 后端注入） |
| V9 | FR-016~020 + EC-006/011 SRC+NET 检索/网络域（P0 web-fetch/web-search + P1 SRC + P2 save） | ① search-content：注入小内容集 → 命中含上下文行/位置；无索引退化为线性扫描且结果一致；超大内容集预算护栏生效（EC-011 上限声明）；② list-resources：写入/注册资源后 list 含条目；help 文本断言与 web-cli-help 工具目录语义不混淆（FR-017）；③ web-fetch 升级：mock fetch 断言——缺省无 clean 参数返回原文（逐字节兼容 FR-043）/clean 两态/超限截断含输出元信息（长度/截断标记）/网络·CORS·HTTP 状态错误分类可读/untrusted 标记内置（FR-018/010）；④ web-search：注入假搜索服务 → 成功（标题/摘要/来源/untrusted 标记）/空结果/失败/鉴权错全链；未配置态 → 禁用（schema 不含或 dispatch 报禁用）+ 配置指引（FR-019/EC-006）；⑤ save/download（若入范围 P2）：授权桩保存成功/用户拒绝两路转译 + 下载链冒烟 | 断言通过；错误分类文案可读互异；web-fetch 缺省路径与旧行为一致 | search/web-fetch/web-search 专项全绿 | 接口数据 + 测试覆盖 | node --test 专项（mock fetch / 假搜索服务注入） |
| V10 | FR-022~028 + EC-003/009 + ADR-005 + NG-003/005 DOM+EXE 域（P1 dom/ask-user/eval-js + P2 notify/clipboard/exec-remote/worker-session/wasm） | ① dom-\*：注入桩逐子命令（read-state/click/hover/scroll/zoom/fullscreen/snapshot）；写类操作（risk:'ui'）在 deny 策略下被拦截（间谍断言联动 V6）；无 op-cli React handler 依赖（grep dom-tools 无 React/LGDL import）；help 面显式声明「仅宿主应用自身同源页面」（NG-003 边界）；② ask-user：fake 应答器三型（选择/确认/文本）断言；契约与 PRM ask（FR-007）语义区分（文档/grep 不混用）；③ notify/clipboard（P2 若入范围）：授权桩允许/拒绝两路 → FR-009 转译 + 降级路径；④ eval-js：注入执行器 → 纯计算返回正确；DOM/网络副作用尝试在默认策略下被拦截（间谍断言 FR-026）；untrusted 输入默认拒执行（EC-007）；worker 崩溃 → 主会话不中断（EC-009）；⑤ exec-remote（P2）：mock 端点成功/失败/鉴权错/超时全链；未配置 → 禁用 + 指引（EC-006）；工具描述显式声明「代理 OS 能力、非本框架实现」（FR-027/NG-004）；⑥ worker-session（P2）：worker 桩两调用间状态保持；无 PTY/ANSI/终端语义字段（grep，NG-005） | 逐子命令断言通过；写操作 deny 拦截；eval 副作用门禁 + untrusted 拒执行生效 | dom/eval 专项全绿 + deny/副作用拦截间谍断言 + NG 边界 grep | 接口数据 + 测试覆盖 | node --test 专项（注入桩 + 间谍断言 + grep） |
| V11 | FR-029~035 + EC-008/013/015 + ADR-004/007 TSK+SES 任务/会话域（P0 session-store + P1 todo/goal/jobs/subagent/context；跨会话/IDB/Worker 生命周期核心） | task-state.test 专项：① todo：会话级 CRUD + 会话持久化恢复后清单仍在（memory fake 重开模拟，FR-029/S-01）；② goal：create/get/update/archive+进度 CRUD；持久→重开可查；双实例并发写 → 冲突标记/last-write（FR-030/EC-013/S-02）；③ jobs：submit→jobId → status/result/log/cancel 全生命周期；模拟卸载中断 → interrupted 标记落库 → 恢复可查→重试（FR-031/EC-008/S-03）；完成通知授权两路（notify 桩联动）；④ EC-015：jobs 启动类命令即时返回 jobId、不叠加 delay 等待（时钟断言 delayMs:0 免除沿 FR-016）；sleep 语义不变（F-23 EC-005 保持）；⑤ subagent：fake chat 子会话委派并回收结果；子会话失败 → ok:false 且主会话不中断（FR-032/EC-009）；子会话工具白名单（子集）生效；⑥ session：持久→重开恢复 turns 等价断言；恢复后 runAgent 续跑冒烟（机械面）；多标签冲突标记（FR-034/EC-013）；⑦ context：压缩后 turns 体量下降 + 关键工具结果可检索找回（summarizer 桩）；压缩动作可审计（FR-035/NFR-009） | 全生命周期断言通过；interrupted/冲突标记/子会话隔离/即时返回均成立 | task-state.test 全绿 + EC-008/013/015 断言 | 接口数据 + 测试覆盖 | node --test 专项（fake 后端 + 时钟注入） |
| V12 | FR-036~042 + EC-012 + AC-007/012 + ADR-006/008 EXT+LGDL 扩展生态位 + lgdl-web 接入面（P0 矩阵/webSearch + P1 skill/ask UI + P2 MCP 试点） | ① skill-loader：内置 skill 加载 → 提示注入 + allowed-tools 门禁生效（越权注册被拒，FR-036/008）；运行时加载接口存在 + CSP/connect-src 约束文档化（NFR-008）；② mcp-client（P2 若入范围）：mock MCP HTTP 服务器 initialize/tools/list/call 全链；mcp:\* 命名空间动态注册；端点不可达 → 该源工具降级 + 其余工具与会话不受影响（FR-037/EC-012）；③ 扩展注册治理：注册审计含来源；跨命名空间重名策略（允许共存）；卸载后 schema/help/dispatch/审计残留为零（grep 级，FR-038）；④ 默认注册矩阵：session.test 增补断言——启用集派生 schema 与矩阵一致（storage/session/todo/goal/jobs/context/doc-* 默认开；web-search 条件开=配 key 后；dom-* 开但写经 PRM；skill/MCP/exec-remote 默认关显式装载）；矩阵变更单点生效（FR-039/AC-007）；⑤ web-search key：配置前禁用态 / 配置后全链可用；key 不出现在 schema/help/日志（grep 断言 FR-040）；⑥ ask UI 归属：base 无 UI 代码（grep——AskDialog/React 仅存在于 lgdl-web，NG-008）；fake ask 桥断言 session 接线（FR-041）；⑦ settings 骨架 + provider 数据不强迁（联动 V8，FR-042） | 扩展专项 + lgdl-web session.test 增补全绿；key 零泄漏；矩阵断言与推荐取向一致 | skill/mcp/session 专项全绿 + key 泄漏 grep 零命中 + 矩阵单点生效 | 接口数据 + 测试覆盖 + 漂移检测 | node --test 专项 + mock HTTP 服务器 + grep |

### 组 D — 浏览器真实环境冒烟（对照 plan P-01 双轨；接口数据 + 性能边界维度）

| # | 验证对象 | 验证步骤 | 预期结果 | 门禁标准 | 验证维度 | 验证方法 |
|---|---------|---------|---------|:--:|:--:|:--:|
| V13 | FR-045/AC-006/NFR-006/008 真实浏览器冒烟面（lgdl-web 或最小宿主页；Chromium 现行版基线，Firefox 声明兼容——P-04 待裁） | ① storage：真实浏览器 IDB/OPFS 真持久——storage 工具 write→**页面刷新**→read 回读一致；② session/goal/jobs：刷新恢复 turns 等价 / goal 跨会话可查 / jobs 页面卸载→interrupted 标记→重开可查可重试（beforeunload 模拟或真实刷新）；③ Notification/clipboard 授权两路：浏览器权限弹窗人工授予/拒绝 → FR-009 转译文案呈现；④ dom-\*：真实宿主页同源 DOM 操作冒烟（read-state/click/快照导出）；⑤ eval worker：真实 worker 执行器纯计算返回；⑥ ask UI：AskDialog 弹层呈现 + allow/deny 裁决后 AI 会话继续（FR-041）；⑦ web-search：SettingsPanel 配 key 后真实端点搜索（若 key 可用）；⑧ 多标签：goal/session 双标签写冲突标记可见（EC-013）；⑨ 安全上下文：localhost/https 下运行确认（NFR-008） | 冒烟清单逐项通过并记录于 validate-report（清单表：项/操作/实测/通过）；node 面已覆盖项在此面做真实验证交叉确认 | 浏览器冒烟记录完整；环境不具备 → ⏭️ 记录 + 移交人工清单（该面缺失影响 FR-045/AC-006 结论完整性，标注条件通过/遗留，不阻塞 node 面自动化判定） | 接口数据 + 性能边界 | 真实浏览器人工冒烟清单（对照 plan P-01 维持现状决策） |

### 组 E — EC 覆盖交叉核对（漂移检测维度：防 EC 遗漏）

| # | 验证对象 | 验证步骤 | 预期结果 | 门禁标准 | 验证维度 | 验证方法 |
|---|---------|---------|---------|:--:|:--:|:--:|
| V14 | EC-001~015 全量验收映射交叉核对 | 逐 EC 核对 §4.3 承接场景 + 断言存在：EC-001 三态文案互异（V5/V6）→ EC-002 ask 超时/取消 deny+自愈（V6）→ EC-003 浏览器 API 拒绝/不支持转译（V7/V10/V12 + V13）→ EC-004 配额超限（V8）→ EC-005 隐私/存储不可用降级（V8 + V13）→ EC-006 未配置禁用+指引（V9/V10）→ EC-007 untrusted 注入不执行（V7/V10）→ EC-008 jobs interrupted 恢复（V11 + V13）→ EC-009 子会话/worker 异常主会话不中断（V10/V11）→ EC-010 动态注册冲突三场景（V5）→ EC-011 大输出截断护栏（V9/V16）→ EC-012 MCP/skill 端点不可达降级（V12）→ EC-013 多标签并发冲突标记（V11 + V13）→ EC-014 扩展 allow×全局 deny 冲突（V6/V12）→ EC-015 jobs 即时返回不叠 delay（V11） | 15 EC 每项 ≥1 承接场景且含测试/冒烟断言锚点；无未承接项 | EC 全覆盖映射成立（15/15）；遗漏项 = 策略缺口需补场景 | 漂移检测 | read + 断言点交叉核对 |

### 组 F — 生态位纪律 / 不可承载面"不做"边界 + 中性纯度（漂移检测维度）

| # | 验证对象 | 验证步骤 | 预期结果 | 门禁标准 | 验证维度 | 验证方法 |
|---|---------|---------|---------|:--:|:--:|:--:|
| V15 | NG-001~009/AC-003/010 + NFR-001/002/010 + D-5/D-6 + discovery §3.5 不可承载面"不做"边界 grep 门禁 | grep/read 清单：① base/src OS 生态位零命中——真 bash/PTY/终端 TTY 语义、路径语义 read/write/edit/grep/glob/bash 工具注册、原始 socket/UDP/DNS、MCP stdio transport、常驻守护/系统包管理/git 本地仓库（NG-001/005/007 逐项，OS 工具名照搬 = 严重漂移）；② exec-remote 帮助面含「代理 OS 能力、非本框架实现」声明（FR-027/NG-004）；③ base grep `react`/`@lgdl/` import + LGDL 文案残留 → 零命中（NFR-001/AC-010）；④ base 无 UI 代码（AskDialog/SettingsPanel/React 只在 lgdl-web，NG-008 反向断言）；⑤ dom-\* 帮助面「仅宿主应用自身同源页面」边界声明 + 无跨域/第三方站点驱动代码（NG-003）；⑥ package.json 依赖图谱：base 无 base→业务边、无新增运行时依赖（对照 plan §2.5 零新依赖声明——若引入需评审记录，NFR-002）；⑦ 九域工具语义对照 discovery §3.3 映射表逐域核验（D-5/D-6：语义落在 DOM/存储/WebAPI/Worker/fetch/Permissions，NFR-010/AC-003）；⑧ eval 帮助面「worker 非 OS 沙箱」边界声明（ADR-005，R-002 缓解） | grep 清单全 CLEAN（文档化注释除外）；工具语义全部可锚定到 §3.3 映射表浏览器承载列；out 清单显式记录不可承载面 | 严重漂移 0（OS 工具名照搬/策略旁路/UI 上收/业务依赖 = 严重）；grep 断言逐项有记录 | 漂移检测 | grep 脚本 + read + package.json 核验 |

### 组 G — schema 预算 / 性能 / 单一数据源（性能边界 + 接口数据维度）

| # | 验证对象 | 验证步骤 | 预期结果 | 门禁标准 | 验证维度 | 验证方法 |
|---|---------|---------|---------|:--:|:--:|:--:|
| V16 | NFR-004/005 + AC-011 + FR-001/004 单一数据源四链 + schema 预算/性能 | ① 变更冒烟（NFR-004）：注册一个假工具（含 namespace/group/enabled 声明）→ schema 派生/help/dispatch/前缀四链自动可见（单点变更全链可见）；② 千级条目派生时长断言：注册 1000 假条目 → deriveTools 全量派生耗时实测记录（阈值按实际环境定并记录，无硬指标时记录实测值）；③ 分组派生/启用集启用后派生数组体积与顺序可断言；tool_choice 优先序观察不漂移（顺序断言，承接 F-23 AC-006 面扩展，AC-011）；④ 超大响应截断断言：web-fetch/搜索/日志大输出 → 截断/分页 + 元信息（长度/截断标记）（EC-011/NFR-005）；⑤ 无策略配置时 dispatch 零额外开销：时钟注入——无 policy 配置的 dispatch 无额外等待/挂起（NFR-005） | 四链可见断言通过；派生体积/顺序断言成立；截断护栏生效；无策略零开销 | 派生时长/截断/零开销断言通过（语义性 NFR——实测值记录于报告）；顺序漂移 = 失败 | 性能边界 + 接口数据 | 自主脚本（时钟/体积断言） |

### 组 H — 行为等价闭环（接口数据 + ⏭️ 真实面）

| # | 验证对象 | 验证步骤 | 预期结果 | 门禁标准 | 验证维度 | 验证方法 |
|---|---------|---------|---------|:--:|:--:|:--:|
| V17 | FR-046/AC-007/008 + R-005 v2 叠加后 lgdl-web 行为等价/声明改进 | ① 行为清单构建：F-23 现 5 工具路径（lgdl-web-cli/op-cli/web-fetch/sleep/help）在 v2 叠加（权限门禁/新工具/矩阵/恢复入口）下用户可感知差异清单；② 机械面：真实组装 session（矩阵默认启用集 + browserEnv 桩 + fake ask 桥）→ runAgent 驱动脚本化 LLM 两轮 → 事件流/工具结果回填/ask 挂起恢复断言（沿 F-23 V10 先例）；deny 命中 → AI 据拒绝结果自愈（重述/换路径）；③ 真实闭环面（需浏览器 + API Key）：在 V4 基线之上叠加 v2 工具（storage/session/web-search/ask 路径）会话记录 → diff V4 基线 | 机械面断言通过；行为差异逐项可归因为声明项改进（矩阵默认开/权限 ask/恢复入口等）或等价；**无未声明差异** | 机械面全绿；未声明差异 = 0（真实面 ⏭️ 记录移交人工清单，判定受影响） | 接口数据 | 自主脚本（真实编译产物）+ 真实浏览器闭环记录 |

> **无法执行项说明（⏭️ 预备标注）**：① V4/V13/V17 真实浏览器面（真实 AI 闭环 + 真 IDB/OPFS/Notification/DOM/worker + ask UI 弹层 + web-search 真实端点）需浏览器环境 + 厂商 API Key + 用户手势授权——validate 无此环境时该面以人工冒烟清单移交收口（沿 F-23 validate.md:59 同口径），node 注入桩面（V5~V12/V16）不受影响；② P2 试点项（FR-021/033/037 等）若 build 裁剪 → 对应断言标注「裁剪未入范围」不阻塞。

## 4. 测试覆盖预期矩阵

### 4.1 功能需求 (FR) — 覆盖率目标 100%（46/46）

| 需求 ID | spec 描述（组） | 验证场景 | 覆盖率 |
|---------|---------------|:--:|:--:|
| FR-001 | 工具分组/目录（REG） | V5, V16 | 已覆盖 |
| FR-002 | 命名空间（REG） | V5 | 已覆盖 |
| FR-003 | 运行时动态注册/卸载（REG） | V5 | 已覆盖 |
| FR-004 | 工具开关模型（REG） | V5, V16 | 已覆盖 |
| FR-005 | 框架级策略挂点 PreToolUse/PostToolUse（PRM） | V6, V7 | 已覆盖 |
| FR-006 | 权限裁决语义（PRM） | V6 | 已覆盖 |
| FR-007 | ask 交互契约（PRM） | V6, V12, V17 | 已覆盖 |
| FR-008 | 技能级 allowed-tools（PRM） | V7, V12 | 已覆盖 |
| FR-009 | 浏览器 API 级授权失败转译（PRM） | V7, V10, V12, V13 | 已覆盖 |
| FR-010 | 内容可信约定 untrusted（PRM） | V7, V9, V10 | 已覆盖 |
| FR-011 | doc-read 内容对象读（DOC） | V8 | 已覆盖 |
| FR-012 | doc-edit 内容对象编辑原语（DOC） | V8, V6 | 已覆盖 |
| FR-013 | storage 通用持久卷（STR） | V8, V13 | 已覆盖 |
| FR-014 | storage-quota/persist（STR） | V8 | 已覆盖 |
| FR-015 | settings 通用 KV（STR） | V8, V12 | 已覆盖 |
| FR-016 | search-content 内容集搜索（SRC） | V9 | 已覆盖 |
| FR-017 | list-resources 资源目录（SRC） | V9 | 已覆盖 |
| FR-018 | web-fetch 升级（NET） | V9, V3 | 已覆盖 |
| FR-019 | web-search 网络搜索（NET） | V9, V12 | 已覆盖 |
| FR-020 | save/download 存为文件（NET） | V9（P2 若入范围） | 已覆盖*（裁剪则 ⏭️） |
| FR-021 | ws/eventsource 实时连接（NET） | V9（P2 若入范围） | 已覆盖*（裁剪则 ⏭️） |
| FR-022 | dom-\* 宿主同源 DOM 自动化（DOM） | V10, V13 | 已覆盖 |
| FR-023 | ask-user 任务内澄清（DOM） | V10 | 已覆盖 |
| FR-024 | notify 系统通知（DOM） | V10, V11（P2 若入范围） | 已覆盖*（裁剪则 ⏭️） |
| FR-025 | clipboard 剪贴板（DOM） | V10（P2 若入范围） | 已覆盖*（裁剪则 ⏭️） |
| FR-026 | eval-js/eval-wasm 页内沙箱（EXE） | V10, V13 | 已覆盖 |
| FR-027 | exec-remote 远程代理桥（EXE） | V10（P2 若入范围） | 已覆盖*（裁剪则 ⏭️） |
| FR-028 | 持久执行上下文 worker 会话（EXE） | V10（P2 若入范围） | 已覆盖*（裁剪则 ⏭️） |
| FR-029 | todo 会话级任务清单（TSK） | V11 | 已覆盖 |
| FR-030 | goal 跨会话持久目标（TSK） | V11, V13 | 已覆盖 |
| FR-031 | jobs 后台任务句柄（TSK） | V11, V13 | 已覆盖 |
| FR-032 | subagent 子会话（TSK） | V11 | 已覆盖 |
| FR-033 | workflow 编排脚本（TSK） | V11（P2 若入范围） | 已覆盖*（裁剪则 ⏭️） |
| FR-034 | session 会话持久化/恢复（SES） | V11, V13 | 已覆盖 |
| FR-035 | context 上下文膨胀管理（SES） | V11 | 已覆盖 |
| FR-036 | skill 目录加载（EXT） | V12 | 已覆盖 |
| FR-037 | MCP Streamable HTTP 试点（EXT） | V12（P2 若入范围） | 已覆盖*（裁剪则 ⏭️） |
| FR-038 | 扩展注册治理（EXT） | V5, V12 | 已覆盖 |
| FR-039 | lgdl-web 默认注册矩阵（LGDL） | V12, V17 | 已覆盖 |
| FR-040 | web-search key/端点来源（LGDL） | V12, V17 | 已覆盖 |
| FR-041 | ask UI 与扩展配置 UI 归属（LGDL） | V12, V13, V17 | 已覆盖 |
| FR-042 | provider 应用态上收复议（LGDL） | V8, V12 | 已覆盖 |
| FR-043 | F-23 契约保持与 additive 扩展（BSL） | V1, V3 | 已覆盖 |
| FR-044 | 世界模型扩展 文档态→状态态（BSL） | V3, V11, V17 | 已覆盖 |
| FR-045 | 真实浏览器闭环验证基线（BSL） | V4, V13 | 已覆盖（真实面 ⏭️ 人工清单） |
| FR-046 | AI 行为等价/声明改进（BSL） | V17 | 已覆盖（真实面 ⏭️ 人工清单） |

> *注：FR-020/021/024/025/027/028/033/037 为 P2「若入范围」项（spec 允许裁剪不阻塞）；build 产物未交付时对应项标 ⏭️「裁剪未入范围」，FR 覆盖率按入范围口径统计并明示。

### 4.2 非功能需求 (NFR) — 覆盖率目标 ≥80%（10 项全覆盖）

| 需求 ID | spec 描述 | 验证场景 | 覆盖率 |
|---------|----------|:--:|:--:|
| NFR-001 | domain-neutral 纯度（零 LGDL/react/业务依赖） | V2, V15 | 已覆盖 |
| NFR-002 | 依赖方向与运行时依赖（单向无环/零默认外部服务） | V2, V15 | 已覆盖 |
| NFR-003 | 安全基线（无旁路/untrusted/门禁/审计） | V6, V7 | 已覆盖 |
| NFR-004 | 单一数据源（注册条目单点全链可见） | V16 | 已覆盖 |
| NFR-005 | 性能与上下文预算（schema 膨胀/截断/零开销） | V16, V9 | 已覆盖（语义性，实测记录） |
| NFR-006 | 测试门禁双轨（node 全绿 + 浏览器冒烟记录 + 全仓回归） | V1, V13 | 已覆盖 |
| NFR-007 | 类型与构建完整性 | V2 | 已覆盖 |
| NFR-008 | 浏览器兼容与安全上下文（CSP/基线） | V13, V15 | 已覆盖（P-04 基线待裁） |
| NFR-009 | 可观测性（审计/trace 关联） | V7, V11 | 已覆盖 |
| NFR-010 | 范围与生态位纪律（NG 清单 + §3.3 锚点） | V15 | 已覆盖 |

### 4.3 边界情况 (EC) — 15/15 承接映射（V14 交叉核对）

| EC | 场景 | 处理方式（验收锚点） | 承接 Vx |
|:--:|------|--------------------|:--:|
| EC-001 | 未注册/已禁用/未授权三态 | dispatch 错误文案互异、可读、会话不中断 | V5, V6 |
| EC-002 | ask 超时/用户取消 | deny + 审计 + AI 自愈 | V6 |
| EC-003 | 浏览器 API 授权拒绝/不支持 | ok:false + 授权路径指引；AI 闭环自愈 | V7, V10, V12, V13 |
| EC-004 | 存储配额超限/写入失败 | 「配额不足」可读错误 + 清理建议；不静默丢数据 | V8 |
| EC-005 | 隐私模式/存储不可用 | 降级内存态 + 明示不持久 | V8, V13 |
| EC-006 | web-search/exec-remote 未配置 | 禁用态 + 配置指引；不影响其他工具 | V9, V10 |
| EC-007 | untrusted 注入指令 | 不自动执行（eval 默认拒）；标记保留；可审计 | V7, V10 |
| EC-008 | 页面卸载/刷新 jobs 在途 | interrupted 标记 + 结果落库 + 可查/取消/重试 | V11, V13 |
| EC-009 | 子会话/worker/嵌套 runner 异常 | ok:false 主会话不中断；worker 崩溃重建 | V10, V11 |
| EC-010 | 动态注册冲突三场景 | 重名拒绝/卸载后未注册/命名空间逃逸拒绝 | V5 |
| EC-011 | 大文档/大响应/超长日志 | 截断/分页/超时护栏 + 元信息 | V9, V16 |
| EC-012 | MCP/skill 端点不可达/协议错误 | 该源降级 + 明确错误；其余不受影响 | V12 |
| EC-013 | 会话/目标多标签并发写 | 冲突标记/last-write；不静默覆盖 | V11, V13 |
| EC-014 | 扩展 allow 与全局 deny 冲突 | deny 优先默认 + 入审计 | V6, V12 |
| EC-015 | 异步 jobs 与 delay/sleep 交互 | 启动类即时返回 jobId 不叠 delay；sleep 不变 | V11 |

### 4.4 总体验收 (AC) — 12/12 承接映射

| AC | 验收项 | 承接 Vx |
|:--:|--------|:--:|
| AC-001 | base 独立可用（扩展后自足） | V2, V15 |
| AC-002 | 九域工具面覆盖（每域 ≥1 可达） | V8~V12（域×FR 对照核验） |
| AC-003 | 生态位纪律（无 OS 工具 + out 清单记录） | V15 |
| AC-004 | 权限门禁端到端（含 AI 闭环 ask 手测） | V6, V7, V17, V13 |
| AC-005 | 注册表扩展端到端（四链可见 + 顺序契约） | V5, V3 |
| AC-006 | 持久化闭环（刷新恢复/goal/jobs interrupted 真实浏览器） | V11, V13 |
| AC-007 | lgdl-web 接入面（矩阵/web-search key/ask UI） | V12, V17, V13 |
| AC-008 | 真实 AI 闭环基线（F-23 补跑 + v2 核心工具闭环） | V4, V17 |
| AC-009 | 双轨测试 + 构建门禁（全仓回归 + tsc/vite） | V1, V2 |
| AC-010 | 中性纯度（grep 清单逐项核验） | V15 |
| AC-011 | schema 上下文预算受控（体积/顺序断言） | V16 |
| AC-012 | 扩展生态试点（skill 端到端 + MCP HTTP ≥1） | V12 |

## 5. 需作者裁决/协调点

| # | 开放点 | 影响验证方式 | 建议默认 |
|---|--------|------------|---------|
| D-1 | **P-01 浏览器冒烟工具链**（plan §4.3）：维持「注入桩 node + validate 真实浏览器人工冒烟清单」双轨现状 vs 引入 playwright/jsdom 自动化 | 决定 V10/V13 是人工清单记录还是自动化脚本断言；默认维持现状 → V13 以人工冒烟清单记录（validate-report 记录项） | 维持现状（零新增测试依赖） |
| D-2 | **P-04 浏览器兼容基线**（plan §4.3/NFR-008）：Chromium 现行版验证 + Firefox 声明兼容 | 决定 V13 冒烟浏览器集合与 EC-003 转译断言范围 | Chromium 验证 + Firefox 声明兼容 |
| D-3 | **P-05 web-search key 配置 UI**（plan §4.3/FR-040）：v2 内提供 SettingsPanel 最小配置面 vs 仅 base 禁用态+指引留后续 | 决定 V12/V17 验证范围（SettingsPanel 扩展是否交付） | v2 内提供 SettingsPanel 最小配置面 |
| D-4 | **P2 试点裁剪确认**（spec §9.4/plan §8 波 3）：FR-021/033/037/020 完整/024/025/027/028/eval-wasm 完整 是否全部入范围 or 裁剪 | 决定 FR 覆盖率统计口径与对应断言执行（裁剪项 ⏭️ 不阻塞） | 按 build 实际交付核验；裁剪需在 build 记录明示 |
| D-5 | **V4/V13/V17 真实浏览器 + API Key 环境协调**（FR-045/AC-008）：F-23 遗留 ⏭️ 补跑需真实浏览器 + 厂商 API Key + 用户手势授权 | 决定真实闭环面是 validate 执行还是移交收口人工清单（沿 F-23 先例） | validate 具备环境则执行并记录；不具备 → 人工清单移交 + 结论标注条件通过 |
| D-6 | **review 状态依赖**：validate-report 执行前置 = review-report passed（§4 前置验证）；当前 phase=planned review 未执行 | 策略阶段不受影响；报告阶段需等 review + build 完成 | 待 build/review 完成后触发 validate-report |

## 6. 验证执行说明

- **验证方式**：全仓/逐包测试真实执行 + tsc/vite 构建真实执行 + 自主专项脚本（真实组装 / fake 后端注入 / 间谍断言 / mock fetch·搜索·MCP 端点 / 时钟注入 / 假裁决器 / 千级条目派生）动态验证 + 静态 read/grep/git 核验 + 真实浏览器人工冒烟清单（V13，条件具备时）。
- **验证脚本（ADR-003）**：由 validate Agent 在报告阶段自主编写并直接执行，存放于 `/tmp/sddu-validate-specs-tree-web-cli-base-v2-<timestamp>/`；validate-report.md §4 逐项记录（文件名/用途/对应场景/退出码/关键输出）。验证脚本为执行工具非正式产物，不污染项目源码目录。
- **⏭️ 标注规则**：无法在当前环境执行的动态项（真实浏览器/真实 API Key/P2 裁剪项）显式标注「⏭️ 不适用/裁剪未入范围/移交人工清单」并说明原因，不编造数据。
- **结论标准**（§6 验证标准）：FR 覆盖率 100%（入范围口径）、NFR 覆盖率 ≥80%、构建退出码 0、严重漂移 0、阻塞 0 → ✅ 通过；非阻塞偏差（浏览器面 ⏭️ 移交/文档措辞项）→ ⚠️ 有条件通过；否则 ❌ 不通过。
- **策略与报告分离（ADR-004）**：本 validate.md 定义一次；validate-report.md 每轮执行独立产出（R1/R2…），策略不变时报告可多轮迭代；报告产出后需更新 state.json `files.validationReport` 并检查 `files.validate` 指向本策略路径（§8.2——当前 state.json 未记录 files.validate，需在报告阶段一并提醒注册）。

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建：基于 spec.md v1.0（46 FR 十三组 + 10 NFR + 15 EC + 12 AC + S-01~S-09 已裁）+ plan.md v1.0（8 ADR + §2.3 契约 + §4.2 测试策略 + §8 波次）+ discovery §3.3/3.5 锚点 + F-23 validate 先例。产出：①V1~V17 场景矩阵（组 A 基线守恒与构建 V1~V3 / 组 B F-23 闭环补跑 V4 / 组 C 横切机制 V5~V7 / 组 D 九域工具 V8~V12 / 组 E 浏览器冒烟 V13 / 组 F EC 核对 V14 / 组 G 生态位纪律 V15 / 组 H schema 预算 V16 / 组 I 行为等价 V17）；②FR 46 覆盖表 + NFR 10 表 + EC 15 承接映射 + AC 12 承接映射；③需作者裁决点 D-1~D-6（P-01/P-04/P-05 引用 plan §4.3 + P2 裁剪 + 浏览器/Key 环境 + review 依赖）；④双轨验证：node 注入桩面全自动化 + 真实浏览器人工冒烟清单（对照 plan P-01）；⑤P2「若入范围」项裁剪语义与 ⏭️ 标注规则；⑥F-23 AC-008 遗留补跑（FR-045）列为 V4 前置人工基线 | 2026-09-06 | SDDU Validate Agent |
