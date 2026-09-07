# 验证策略：specs-tree-web-cli-base-v4（web-cli-base v4：浏览器外壳纵深与事件流——事件 push/订阅通道 + 页内可达切面快赢 + 扩展线分界与契约预留）

> **文档定位**: SDDU 验证策略 — 指导 validate Agent 执行自主验证的场景和方法（V1~VN 定义一次，ADR-004 步骤 1）；逐项执行结果见 validate-report.md（build 完成 + review passed 后每轮独立产出，ADR-004 步骤 2）
> **前置依赖**: spec.md v1.0（30 FR 十一组 BSL4/PRM3/EVT8/DIA2/NET1/CK2/CLP2/SHD1/TCH1/EXT3/LGDL3 + 8 NFR + 12 EC + 10 AC + 作者三裁 R-01~R-03）、plan.md v1.0（push 通道架构 = event-bus.ts Hub + env.events 缝 + platform-events.ts；12 ADR 中 ACCEPTED 10/PROPOSED 2 = ADR-010 touch 验证门；预算默认值口径 ADR-004 表；验证门 G-01/G-02 §5.2）、tasks.md v1.0（14 任务 9 波次；W8 = TASK-012 NET G-02 + TASK-013 TCH G-01 双验证门任务内嵌降级出口；W9 = TASK-014 终收口 GATE + validate 移交清单）、上游 v3 validate.md/validate-report.md v1.1（双轨方法先例：node 注入面全绿 + chromium headless 真实浏览器冒烟 V13 方法扩展；Phase A 115/B 11/C 全绿；真实 DeepSeek 驱动闭环先例）、state.json（phase=tasked → builded → review passed 后触发本策略执行）
> **创建人**: SDDU Validate Agent
> **创建时间**: 2026-09-08
> **版本**: v1.0
> **更新人**: SDDU Validate Agent
> **更新时间**: 2026-09-08
> **更新说明**: 初始创建 — 承接 spec/plan/tasks 三方输入（AC 10 项 + NFR-005 双轨门禁 + ADR-002~004 push 通道语义 + ADR-010/G-01 touch 验证门 + G-02 网络拦截验证门），自主定义 V1~V17 验证场景：node 注入面单测全绿（轨 A）+ chromium 真实浏览器冒烟（轨 B，V13/v3 方法扩展至 v4 观察/override/cookie/剪贴板/穿透/touch/拦截面）+ 全仓回归 + tsc/vite 门禁 + 漂移/红线 grep；双验证门（V-touch/V-net）内嵌降级出口；零回归双保险（V1 node 面 + V16 真实浏览器重跑）；完整 AI 闭环（V17 真实 DeepSeek 驱动 v4 事件通道）

## 1. 验证概要

| 维度 | 数值 |
|------|:--:|
| 验证对象 | web-cli-base v4 新增面（event-bus.ts / platform-events.ts / events·dialog·cookie·net 工具 / sensitive·audit 扩展 / resolver 穿透 / ext-attribution / clipboard 富子命令 / dom touch）+ lgdl-web v4 场景面 + v2/v3 零回归基线 |
| 验证场景 | V1~V17（FR 覆盖 30/30、NFR 覆盖 8/8、EC 覆盖 12/12、AC 承接 10/10；全五维度） |
| Feature 类型 | 代码类（全维度）+ 真实浏览器冒烟为核心（新增面 = 浏览器真实行为：观察源/override/patch/剪贴板/穿透/合成事件） |
| 动态验证 | 轨 A = node 注入面（fake Hub/fake ops/假缝 + 时钟注入）单测全绿；轨 B = chromium headless 真实浏览器冒烟（自建 fixtures 宿主页 + 真实 lgdl-web React 页 + touch 监听页 + 拦截目标页，CDP 自动化）；全仓回归 + tsc/vite 门禁 |
| 验证门 | V-touch（G-01 合成 touch 最小浏览器验证）→ 失败降级 out 记录；V-net（G-02 网络拦截真实改写验证）→ 失败降级 out 记录（§6.3） |
| 前置条件 | ✅（执行时）review-report.md = passed + build 产物就绪（TASK-014 W9 终收口 GATE 通过、state notes 含 G-01/G-02 结果归档、validate 移交清单就位） |

## 2. 验证目标与方法论

### 2.1 验证对象提取与 Feature 类型自适应

验证对象从 spec（30 FR/8 NFR/12 EC/10 AC）+ plan（push 通道架构 §2.3、FR→落位总表 §3.0、ADR-002~012、预算默认值表 ADR-004、验证门 §5.2）+ tasks.md（14 任务 9 波次、TASK-014 移交清单）+ 实际产物提取。Feature 类型 = **代码类** → 全五维度验证；其中 v4 的核心验证面是「浏览器真实行为」——观察源捕获、override/拦截 patch、富剪贴板、穿透定位、合成事件、订阅随 reload 失效均为 FR-003「browserEnv 真实实现」的验收对象，必须以 chromium 真实浏览器实跑为准（node 注入面只验证纯逻辑与门禁）。

### 2.2 方法论：v3 双轨沿 + v4 扩展（五维度）

沿用 v3 双轨骨架（v3 validate-report R1/R2 先例）并扩展 v4 事件通道/观察面：

| 维度 | v4 承接重点 | 方法 |
|------|-----------|------|
| ① 测试覆盖 | 轨 A node 注入面：event-bus 纯逻辑（fake hub 时钟注入）+ events/cookie/dialog/net/clipboard 工具 executor（fake ops/假缝）+ sensitive/audit 纯函数 + dialog-policy 纯匹配 + ext-attribution + router 门禁；v2/v3 既有用例零删除（D-005） | `npm run test --workspace @lgdl/web-cli-base` + 全仓 `npm test` |
| ② 接口数据 | 轨 B chromium 真实浏览器：逐能力真实断言（订阅命中/lifecycle 事件/console·network 捕获/对话框三类型/cookie roundtrip/富剪贴板 roundtrip/穿透命中/合成 touch/拦截改写） | V13/v3 方法扩展：自建 driver.mjs + fixtures 宿主页 + CDP（详细单 §4） |
| ③ 构建与脚本 | base tsc + lgdl-web vite + 全仓 9 workspace build/test 零错误；dist 与 src 新鲜度 | `npm run build --workspace ...` / `npx tsc` |
| ④ 性能与边界 | 预算护栏实测（洪峰合并/缓冲满丢弃计数/超限自动暂停/全局关零常驻基准对比/上下文只见摘要计数 grep）+ 深度护栏 ≤4 + 12 EC 逐项断言 | node 时钟注入 + chromium 洪峰页 + 基准对比 |
| ⑤ 漂移检测 | 规格零漂移（git diff spec/plan/tasks）；孤立代码/需求缺失扫描；红线 grep（明文零命中/零扩展痕迹/既有工具无推式副作用/依赖图谱零新增/schema 体积）；validate 顺手修复须登记并回归 | git diff + grep 清单 + review C 承接核对 |

### 2.3 质量门槛

每个 FR ≥ 1 个 Vx；每个验证维度 ≥ 1 条；Vx 总数 ≥ max(FR 30, 维度 5)；无法在当前环境执行的项显式标注「⏭️ 待基线/待手测」并注明原因（v2/v3 收口项沿 FR-004，不阻塞其余）；验证脚本自主编写执行（ADR-003），存放 `/tmp/sddu-validate-specs-tree-web-cli-base-v4-<ts>/`，不污染项目源码目录。

## 3. 自主验证场景矩阵（V1~V17）

| # | 验证对象（FR/NFR/EC/产物） | 验证步骤摘要 | 预期结果 | 验证维度 | 验证方法 |
|---|------|---------|---------|:--:|:--:|
| V1 | AC-001/NFR-005/006/AC-010 全仓回归 + 构建门禁 + dist 新鲜度（v2/v3 零回归 node 面） | 全仓 `npm test` + `npm run build`（base tsc / lgdl-web vite / 9 workspace）；deriveTools 顺序断言；schema 体积对比 v3 | 全仓 0 fail（≥ v3 基线 898 pass/1 skip，新增 v4 用例全绿）；构建退出码 0；dom 27 头部注册序零漂移；既有测试零删除 | 测试覆盖 + 构建 | npm test + tsc/vite |
| V2 | FR-001/002/025~027/NFR-001/002/008 + AC-001/008 红线 grep 专项 | grep 断言：既有工具无新增 emit/订阅副作用；base 零 lgdl/react import；package.json 依赖图谱（含 devDep）零新增；零扩展工程痕迹（chrome.runtime/tabs/downloads/webRequest/manifest/@types/chrome）；明文零命中（cookie 值/URL token/键入/console·对话框/富剪贴板）；审计无明文；规格/plan/tasks git diff 零改动 | 各 grep 零命中；规格零漂移；schema 体积零变化（契约预留不进 schema） | 漂移检测 | grep + git diff + 依赖图谱 |
| V3 | FR-008/013/014/002/EC-001/002/011/012 event-bus 机制 node 面 + events 工具注入面 | node 单测：订阅生命周期（注册/list/退订/暂停·恢复/清空）；多订阅并发互不干扰；lastId 增量拉取无重复无遗漏；缓冲满最旧丢弃+dropped 计数；合并窗口计数；每订阅/全通道预算 + 自动暂停；全局开关默认关零开销（时钟注入）；失效/越权拉取可读错误；未注入转译 | 全链单测全绿（fake hub + 时钟注入）；默认关零常驻断言；增量语义精确 | 测试覆盖 + 性能边界 | node 注入面单测 |
| V4 | AC-002/FR-009/015 + EC-003 EVT dom observe 端到端（push 链路） | chromium：订阅 `events subscribe --kind dom`（filter selector/事件类型）→ 页面真实 click/keydown/input → 事件入缓冲 → `pull` 摘要/计数 + lastId 增量取回 → 断言无重复遗漏；**合成派发 vs 真实用户事件来源标记**（v3 click 合成 → source:synthetic / 手动点击 → source:page）；键入敏感面 keydown 不含明文值 | 真实事件命中（type/target 摘要/时序断言）；增量精确；来源标记可区分；selector 过滤只收目标子树；脱敏生效 | 接口数据 + 测试覆盖 | harness 宿主页 + CDP |
| V5 | AC-003/FR-010/EC-001 生命周期观察 + 跨导航语义 | chromium SPA fixtures：hashchange/popstate 触发命中且订阅保持；visibilitychange/pagehide 命中；**整页 reload 两路**：deny → 不刷新；放行 → 新文档 `list()` 空 + 失效提示可查；旧 subId 拉取返回可读失效错误 | 会话内导航订阅保持；reload deny 不刷新；导航后失效语义明示；v3 reload ask 默认行为零回归 | 接口数据 | harness + CDP reload 两路 |
| V6 | AC-004/FR-011/012/015 网络/console 观察 | chromium：页面 console.error/warn → 捕获（level/文本脱敏摘要）；页面 fetch/XHR（含 404/带 token 查询串）→ 事件命中 method/URL/status/耗时；URL token 掩码断言；响应头仅子集；**AI 自请求默认不可见**（env.fetch 绑定原生）→ 工具侧请求不入观察流；早于安装的请求不回看；原 console/网络行为不改变 | console 捕获不改变页面行为（原输出仍达 DevTools）；fetch 事件字段断言 + 脱敏；AI 自请求不可见差异与 ADR-008 一致 | 接口数据 | harness 动态 fetch 按钮 + CDP |
| V7 | AC-005/FR-014/NFR-003/007 + EC-002 预算与开关 | chromium 洪峰页（scroll/mousemove 抖动 + 高频轮询）：合并窗口计数正确；缓冲满最旧丢弃 + dropped 计数准确；超每订阅/全通道预算 → 自动暂停 + 提示；**全局关 = 零监听器/零 patch**（基准对比：无订阅 vs 有订阅）；上下文只见摘要/计数（大负载/明文 grep 不进 output）；单事件 4KB 截断 + truncated | 洪峰受控计数准确；自动暂停可 resume；全局关零常驻（基准）；上下文预算断言 | 性能边界 | harness 洪峰页 + 基准对比 |
| V8 | AC-006/FR-016/017 + EC-004/005/006/010 对话框 override + 应答策略三路 | chromium：override-install 触发 ask（deny 后不安装；allow 后安装）→ 页面 alert/confirm/prompt 被捕获为事件 + 文本脱敏；**护栏三路**：缺省保守（confirm→dismiss 否定值 + 事件 + 审计）/ 显式 trusted accept 规则命中放行 / 破坏性文案（删除/覆盖/提交）无 trusted 规则 → 不 accept；prompt 自动输入仅 trusted 提供生效；卸载还原原生行为；跨域 iframe 不可 hook → 归属说明；安装前行为零变化 | 三类型捕获 + 三路应答断言；事件/审计可查；override 可逆；HTTP auth 等原生对话框 → 归属转译（不假装已捕获） | 接口数据 + 测试覆盖 | dialog fixtures 页 + router gate + CDP |
| V9 | AC-007/FR-019/020 + EC-003/004/007/009 cookie 读写删 | chromium：页面预置同源 cookie → read 清单（名断言 + 值缺省掩码）；read-detail trusted+ask 路径取明细（决策入审计）；write/delete 触发 ask（deny 后值不变；allow 后回读断言）；untrusted 值拒写可读错误；Secure/HttpOnly 分类转译；HttpOnly 读/跨域 → 不支持 + 归属 chrome.cookies；审计名掩码无明文 | 掩码缺省 + trusted 明细路径成立；写后回读一致；deny/untrusted/归属三路可读；审计无明文 | 接口数据 + 测试覆盖 | cookie fixtures + CDP + audit 核验 |
| V10 | FR-021/022 + EC-003/008 CLP 富剪贴板 | chromium（CDP grant）：`clipboard write-html` → ClipboardItem text/html 写 → 页面读回保真；`write-image`（png dataURL）→ 字节/尺寸断言；**paste 事件读**：页面内执行 document.execCommand paste 或 CDP 注入粘贴 → `clipboard paste-read` 捕获槽读富内容/文件项元数据；既有文本 read/write 零回归；授权失败（安全上下文/权限）→ v3 FR-009 转译；无手势系统剪贴板读 → 不支持说明 | 富写 roundtrip 保真（html 结构/png 字节断言）；paste-read 命中；文本既有用例零回归；授权两路转译可读 | 接口数据 + 测试覆盖 | clipboard fixtures + CDP grant/reset |
| V11 | FR-023/EC-009/NFR-007 SHD 穿透定位 | chromium：fixtures 含 open shadow 组件（嵌套 ≤2 层）+ 同源 iframe：CSS/text= 未命中 → 穿透命中 open shadow 内元素（read-element/click/fill 断言 + via:'shadow' 标注）；同源 iframe contentDocument 内命中（via:'iframe'）；深度护栏默认 ≤4（构造 5+ 层嵌套 → 护栏提示）；closed shadow/跨域 iframe → 不支持 + 归属 content script/CDP；既有 CSS/text= 定位零回归 | 穿透命中 + via 标注；护栏触发提示；closed/跨域归属转译；既有定位零回归 | 接口数据 + 测试覆盖 | shadow/iframe fixtures + CDP |
| V12 | AC-008/FR-025/026/027 + NFR-001 EXT 归属转译 + 契约预留 | node + grep：ATTRIBUTION_MAP 覆盖 §2.5 🔴 列全部 out 面（逐项 ≥1 断言：多标签/下载/整页截图/HttpOnly cookie/全局网络/持久订阅/closed shadow/原生对话框/真受信输入/权限模拟/file 注入/DataTransfer）；统一文案含归属；各工具 help 含归属表；契约预留不进 schema（体积零变化）；零扩展工程痕迹 + 依赖图谱零新增（与 V2 交叉核验）；ROADMAP F-14 行不变 | 全部 out 面转译逐项断言 ≥1；归属表与 spec §2.5/NG 一致；grep 零命中 | 接口数据 + 漂移检测 | node 断言 + grep |
| V13 | AC-009/FR-028/029/030 + EC-004 LGDL 场景接入 | lgdl-web 真实 React 会话：矩阵单测（观察默认开/override·cookie·net 默认关 schema 不含 + 派发禁用可读）；LGDL_DEFAULT_POLICY_RULES（cookie 写/拦截 deny、dialog accept deny、override-install ask、观察只读免 ask）；真实会话三路（allow/deny/超时）；untrusted 配置拒执行呈现；事件摘要 UI 可见且不撑爆上下文（预算）；base grep 无 UI 代码 | 矩阵/策略单测全绿；真实会话 ask 三路；UI 预算断言；untrusted 拒呈现可读 | 接口数据 + 测试覆盖 | lgdl-web React 页 + session 注入 |
| V14 | **V-touch 验证门**（FR-024/G-01/ADR-010 + Q-013/A-004） | chromium 最小验证（独立于 TASK-013 记录复核）：touch 监听页挂 touchstart/move/end + 区域 → 合成 tap/swipe/pinch 序列派发各 ≥1 命中断言（TouchEvent 可构造 + 派发 + 目标收到） | 通过 → dom tap/swipe/pinch 实现面真实断言（序列/坐标/局限文案 + session 默认关）；**失败 → FR-024 降级 out 记录 + 归属 CDP Input.dispatchTouchEvent**（§6.3） | 接口数据 | touch fixtures 页 + CDP |
| V15 | **V-net 验证门**（FR-018/G-02/ADR-008 + 裁决 2） | chromium 最小改写验证（独立于 TASK-012 记录复核）：拦截目标页发出 fetch → 预置规则改写 header/查询参数 → 服务端回显断言改写生效；未声明 trusted 规则 → deny + 可读错误；无规则零改写；响应伪造/缓存篡改入参 → 归属 webRequest/DNR/CDP；命中审计（URL 脱敏摘要 + 规则 id） | 真实改写断言（header/参数已变）；deny/untrusted/归属三路可读；审计可查 | **失败 → FR-018 降级 out 记录（P2 门禁 in 降级为 FR-026 契约预留，须作者知悉，S-10 出口）** | 接口数据 | intercept fixtures + CDP + 回显伺服 |
| V16 | FR-001/NFR-005 **零回归真实浏览器重跑**（v2/v3 全工具在 v4 代码位） | 复用 v3 冒烟方法：siteA fixtures 宿主页重跑 v3 既有 27 dom 子命令 + wait/page-eval/extract/export/chrome + clipboard 文本 read/write 真实浏览器断言（Phase 方法，v4 代码位） | 与 v3 报告基线等价的真实浏览器断言全绿（无回归）；既有工具零推式副作用已由 V2 grep 承接 | 接口数据 + 漂移检测 | harness 宿主页 + CDP（driver 复用扩展） |
| V17 | FR-004/AC-002 + v2/v3 收口基线延续 **完整 AI 闭环** | 真实 DeepSeek（deepseek-chat，v3 R2 先例）驱动 lgdl-web 会话：AI `events subscribe --kind dom` 监听 click → 页面注入真实点击（或用户/脚本触发）→ AI `events pull` 取回事件 → 依据事件执行后续工具（如 read-element 验证点击副作用）→ 闭环断言 | AI 经事件通道「感知-响应」闭环：subscribe→捕获→pull→响应全链路真实命中（runAgent completed）；与 v3 收口①基线衔接登记 | 测试覆盖（真实闭环） | 真实 LLM + lgdl-web 会话驱动（需 DeepSeek key，见 §7） |

> 无法执行项（⏭️ 预备标注）：真实系统通知/文件保存 picker 等需真实用户手势的授权路径（v3 已断言转译、真手势待手测，沿 v2 收口②「lgdl-web React 手测」待基线）；web-search 真实端点（需配置 key 的搜索服务，v2 收口③，FR-004「待基线」不阻塞）；真实 DeepSeek 闭环（V17）需可用 key —— 无 key 时标注「⏭️ 待基线」不阻塞其余，闭合路径已由 v3 R2 验证可行。

## 4. 场景详设（每条 = 前置 + 步骤 + 断言）

> 矩阵已含步骤摘要与预期；本节补充每条**执行前置**与**关键断言点**（validate-report 逐项引用）。V1~V17 均在 build 完成 + review passed 后执行（ADR-004 步骤 2），本策略定义一次、报告可多轮（R1/R2…）。

| # | 执行前置 | 关键断言点（可判定） |
|---|---------|---------------------|
| V1 | review passed；build 产物就绪（base dist/lgdl-web dist 新鲜）；TASK-014 GATE 记录就位 | 全仓 0 fail；base tsc 0；vite 0；dom 27 头部注册序与 v3 逐字节一致；既有测试文件零删除（D-005）；deriveTools 顺序断言 |
| V2 | 同上 + TASK-014 grep 移交清单 | 各 grep 零命中（逐条输出文件:行号为空）；spec/plan/tasks git diff 空；package.json 图谱零新增 |
| V3 | node 环境就绪 | 每订阅独立缓冲/游标；lastId 增量 100 条事件 pull 3 次无重复遗漏；合并窗口计数 = 预期 count；缓冲满 dropped 计数准确；超 2000 自动暂停可 resume；开关关 → 零事件零开销；越权 subId → 可读错误 |
| V4 | chromium fixtures 宿主页含可点/可输入/滚动区 | 手动 click 事件 source:'page'；v3 click 工具合成 click 事件 source:'synthetic'（标记可区分）；pull 增量无重复无遗漏；filter selector 只收子树；keydown 负载无明文值 |
| V5 | SPA fixtures（hash 链接/pushState 按钮） | hashchange/popstate 命中且 list() 订阅保持；visibilitychange（切后台/回前台）命中；reload deny → URL 不变；reload 放行 → 新文档 list() 空 + 失效文案；旧 subId pull → 失效错误不中断会话 |
| V6 | 动态 fetch/XHR 按钮 + console 触发 + 带 token 查询串端点 | console.error/warn 捕获（level/文本摘要）；fetch/XHR 事件（method/URL/status/耗时）；URL 中 token=xxx 掩码为占位；AI web-fetch 请求不入观察流；页面原 fetch 仍正常工作（包装透传） |
| V7 | 洪峰页（自动滚动 + setInterval fetch/console） | 抖动类合并后单条 count 事件；非抖动类不合并保真；缓冲满 dropped 计数 = 实际丢弃数；自动暂停提示可读 + resume 恢复；全局关：页面无额外监听器（MutationObserver 数/patch 标志对比） |
| V8 | dialog fixtures（alert/confirm/prompt 按钮 + 破坏性文案按钮） | 安装 ask deny → 页面 alert 原样弹出；allow 后 alert/confirm/prompt 全被捕获为事件；confirm 无策略 → 返回否定值（页面代码分支断言）；trusted accept 规则命中 → 确认值分支；破坏性文案无 trusted → 不 accept；prompt 自动输入仅 trusted 生效；卸载后原行为恢复 |
| V9 | cookie fixtures（document.cookie 预置会话/偏好 cookie） | read 输出名完整 + 值掩码（非明文）；read-detail 走 trusted+ask 取回明文且入审计；write ask deny → 值不变；allow → 回读断言新值；`--trusted` 缺失 → untrusted 拒写；Secure cookie 在 http 页写 → 分类转译；HttpOnly cookie 读 → 不支持+归属 |
| V10 | clipboard fixtures + CDP grant clipboard-read/write | write-html 后页面 navigator.clipboard.read 读回 html 保真（含标签结构）；write-image png 字节/尺寸断言；paste-read 捕获槽返回 text/html + files 元数据；文本 read/write 用例与 v3 一致；权限 reset 后写 → NotAllowed 转译可读 |
| V11 | shadow fixtures（<my-widget> open shadow 内 input/button，嵌套 5 层链 + 同源 iframe 页） | read-element/click/fill 命中 shadow 内元素（结果带 via:'shadow'）；同源 iframe 文档内元素命中（via:'iframe'）；5 层嵌套超护栏 → 可读提示不拖垮；closed shadow 构造 → 不支持+归属；CSS 直选主文档元素照旧命中（零回归） |
| V12 | base dist + index 导出面 | ATTRIBUTION_MAP 键集合 ⊇ §2.5 🔴 列（逐项断言）；unsupportedAttribution 文案含「归属浏览器扩展宿主（F-14 v1.1 线）/CDP」；契约预留类型不注册不进 schema（deriveTools 输出无 ext 工具）；grep 零扩展痕迹 |
| V13 | lgdl-web dist + session v4 矩阵块 | 矩阵单测：观察类默认开、override/cookie/net 默认关（schema 不含 + help 标注 + 派发禁用）；cookie 写/拦截策略 deny；override-install ask；真实会话 ask 弹层 allow/deny/超时三路可完成；untrusted 策略注册 → 拒执行说明；事件摘要区计数增长且 output 受预算约束；base 目录 grep 无 UI 代码 |
| V14 | touch 监听 fixtures（touchstart/move/end 计数器 + 区域） | tap/swipe/pinch 合成序列派发后计数器 ≥1（各手势独立断言）；PASS → 实现面序列/坐标断言 + session 默认关；FAIL → out 记录（降级出口 §6.3），grep dom-tools 无 tap/swipe/pinch |
| V15 | intercept fixtures（fetch 目标 = 本地回显伺服 /echo?x=1） | 规则改写 header（X-Inject）+ 参数（y=2）后回显断言；无 trusted → deny；无规则 → 原样请求（零改写）；响应伪造入参 → 归属文案；命中审计含规则 id + URL 脱敏摘要 |
| V16 | v3 siteA fixtures 同源伺服（v4 代码位 dist） | 27 dom 子命令 + chrome/wait/page-eval/extract/export + clipboard 文本真实断言与 v3 报告基线等价全绿（重点：reload/历史/截图/授权 deny 面回归） |
| V17 | DeepSeek key 可用 + lgdl-web 会话驱动基建（v3 R2 脚本先例） | AI subscribe(dom click) → 脚本触发真实 click → AI pull 取回含该事件 → AI 依事件执行后续工具 → runAgent completed + 断言链闭合；无 key → ⏭️ 待基线标注不阻塞 |

## 5. 双轨执行清单

### 5.1 轨 A — node 注入面（fake Hub/事件/授权）命令清单

```bash
npm run build --workspace @lgdl/web-cli-base && npm run test --workspace @lgdl/web-cli-base   # base 单测（event-bus/events-tools/cookie/dialog-policy/net-tools/clipboard 富子命令/sensitive/audit/locator/ext-attribution + v2/v3 既有零回归）
npm run build --workspace @lgdl/lgdl-web && npm run test --workspace @lgdl/lgdl-web          # lgdl-web（矩阵单测/策略规则）
npm test                                                                                     # 全仓 9 workspace（v2/v3 基线 + v4 新增，D-005 守恒）
```

### 5.2 轨 B — chromium 真实浏览器冒烟清单（validate 报告逐项记录）

方法沿 V13/v3（chromium headless + CDP + 静态伺服 + 自建 fixtures/driver，脚本放 `/tmp/sddu-validate-specs-tree-web-cli-base-v4-<ts>/`）：

| 冒烟面 | 对应 Vx | 清单 |
|-------|:--:|------|
| EVT 订阅端到端（dom observe 真实事件/lastId 增量/来源标记） | V4 | 订阅→捕获→pull 增量→去重顺序→synthetic/page 区分 |
| lifecycle + 跨导航（SPA 导航保持 / reload 两路 / 订阅失效清单） | V5 | hashchange/popstate/visibilitychange/pagehide + deny/放行两路 |
| console/network 观察（捕获/脱敏/AI 自请求不可见） | V6 | console.error + fetch/XHR + token 掩码 + 原行为不改变 |
| 预算与开关（洪峰合并/丢弃计数/自动暂停/全局关零常驻） | V7 | 抖动洪峰页基准对比 + 水位断言 |
| 对话框三路 + 护栏（缺省保守/trusted/破坏性） | V8 | alert/confirm/prompt 捕获 + EC-005/006 三路 |
| cookie roundtrip（掩码 + trusted 明细 + 写后回读 + 归属） | V9 | read/read-detail/write/delete + 门禁 deny/untrusted |
| 富剪贴板 roundtrip + paste 捕获 | V10 | write-html/write-image → 读回保真；paste-read；文本零回归 |
| 穿透定位（open shadow + 同源 iframe + 深度护栏） | V11 | via 标注 + 护栏 + closed/跨域归属 |
| **G-01 合成 touch 最小验证** | V14 | tap/swipe/pinch 各 ≥1（touch 监听页）；结果归档（通过 or out） |
| **G-02 网络拦截真实改写验证** | V15 | fetch header/参数改写回显断言；deny/untrusted/归属三路 |
| v3 全工具零回归重跑 | V16 | dom 27 + wait/page-eval/extract/export/chrome + clipboard 文本 |
| lgdl-web 真实会话（矩阵/策略/ask 三路/UI 预算） | V13 | session 注入 + ask allow/deny/超时 |
| 完整 AI 闭环（真实 DeepSeek 驱动 v4 事件通道） | V17 | subscribe→捕获→pull→响应（无 key → ⏭️ 待基线） |

### 5.3 全仓回归 + tsc/vite 门禁

| 检查项 | 命令 | 达标 |
|--------|------|:--:|
| 全仓回归 | `npm test` | 0 fail（v2/v3 基线 + v4 新增） |
| base 构建（tsc） | `npm run build --workspace @lgdl/web-cli-base` | 退出码 0 |
| lgdl-web 构建（vite） | `npm run build --workspace @lgdl/lgdl-web` | 退出码 0 |
| 全仓构建 | `npm run build` | 退出码 0（9 workspace） |
| dist 新鲜度 | dist 时间戳 ≥ src 最近修改 | 通过（V1 前核验） |

## 6. 验收判定

### 6.1 AC ↔ Vx 映射表

| AC | 验收项 | 承接 Vx |
|----|-------|:--:|
| AC-001 | v2/v3 零回归 + additive 契约（含无推式副作用 grep） | V1/V2/V16 |
| AC-002 | EVT 通道端到端（订阅→捕获→缓冲→摘要/计数→lastId 增量，多订阅并发） | V3/V4/V17 |
| AC-003 | 生命周期事件 + 跨导航语义（SPA 命中 + reload ask 两路 + 失效清单） | V5 |
| AC-004 | console/网络观察（捕获/脱敏/工具侧来源标记） | V6 |
| AC-005 | 预算与开关（合并/自动退订/全局关零开销/上下文只见摘要） | V7 |
| AC-006 | 对话框 override + 策略应答端到端（三类型 + 护栏三路） | V8 |
| AC-007 | 安全模型（cookie 掩码/明细路径/deny-or-ask/untrusted/明文零进出/审计回放） | V2/V9/V8/V13 |
| AC-008 | 扩展线分界（out 面逐项转译 + 契约预留覆盖 + 零扩展痕迹 + 依赖零新增） | V2/V12 |
| AC-009 | 场景接入（矩阵默认开/关 + 策略 + 事件 UI 预算） | V13 |
| AC-010 | 双轨测试 + 构建门禁 + 纯度（node 全绿 + 冒烟清单 + 回归 + tsc/vite + 零依赖） | V1/V3~V17 全景 |

**FR 覆盖**：FR-001(V1/V2/V16)、FR-002(V2/V3)、FR-003(V4~V11/V14/V15)、FR-004(V17)、FR-005(V2/V8/V9/V13)、FR-006(V2/V3/V4/V6/V9/V10)、FR-007(V2/V8/V9/V15)、FR-008(V3/V4)、FR-009(V3/V4)、FR-010(V5)、FR-011(V6)、FR-012(V6)、FR-013(V3/V7)、FR-014(V7)、FR-015(V4/V6)、FR-016(V8)、FR-017(V8)、FR-018(V15)、FR-019(V9)、FR-020(V9)、FR-021(V10)、FR-022(V10)、FR-023(V11)、FR-024(V14)、FR-025(V12)、FR-026(V12)、FR-027(V2/V12)、FR-028(V13)、FR-029(V13)、FR-030(V13) → **30/30**。
**NFR 覆盖**：NFR-001(V2/V12)、NFR-002(V2/V8/V9/V13)、NFR-003(V7/V13)、NFR-004(V4/V10/V16)、NFR-005(V1/§5 全清单)、NFR-006(V1)、NFR-007(V3/V7/V11)、NFR-008(V2/V8/V9/V15) → **8/8**。
**EC 覆盖**：EC-001(V5/V3)、EC-002(V7)、EC-003(V4/V6/V9/V10)、EC-004(V8/V9/V13/V15)、EC-005(V8)、EC-006(V8)、EC-007(V9)、EC-008(V10)、EC-009(V9/V11/V12)、EC-010(V8/V12)、EC-011(V3/V2)、EC-012(V3/V5) → **12/12**。

### 6.2 验证门与降级出口

| 验证门 | 场景 | 判定 | 降级出口（build 已内嵌，validate 复核归档） |
|-------|:--:|------|------------------------------------------|
| G-01（合成 touch 最小浏览器验证，ADR-010/裁决 3） | V14 | chromium touch 监听页收到 tap/swipe/pinch 序列各 ≥1 | **失败 → FR-024 降级 out 记录**：state notes/validate 移交「合成 touch 降级 out + 归属 CDP Input.dispatchTouchEvent」，grep dom-tools 无 tap/swipe/pinch 残留（零实现），移动端价值假设不扩大投入 |
| G-02（网络拦截真实改写验证，ADR-008/裁决 2） | V15 | fetch header/查询参数被规则真实改写（回显断言） | **失败 → FR-018 降级 out 记录**：P2 门禁 in 降级为 FR-026 契约预留（S-10 出口），须作者知悉；net 工具不实现，观察面（FR-012）不受影响 |
| —（对话/观察/剪贴板面浏览器能力误判） | V8/V9/V10/V11 | 真实行为与 spec 不符 | v3 S-02 先例：不合格项如实记录 + 归属转译/修复建议移交（不阻塞判定按严重度） |

### 6.3 指标达标矩阵与结论三态

| 指标 | 要求 |
|------|------|
| FR 覆盖率 | 100%（30/30，node 注入面 + 浏览器冒烟双轨；「待基线」项显式标注不阻塞） |
| NFR 覆盖率 | ≥ 80%（目标 8/8） |
| 构建 | 退出码 0（base tsc + lgdl-web vite + 全仓） |
| 严重漂移 | 0 项（规格 diff 空；grep 红线零命中） |
| 阻塞问题 | 0 项（验证门失败经降级出口 = 非阻塞记录；真实能力缺陷按严重度） |

**结论三态**：✅ 通过（门禁全达标 + 浏览器冒烟全绿 + 无阻塞）／ ⚠️ 有条件通过（非阻塞偏差/待基线/降级 out 记录）／ ❌ 不通过（未覆盖 FR/构建失败/严重漂移/阻塞缺陷）。

## 7. 执行前提与环境

1. **执行环境**：本机 Node v24 + 全仓 workspace + `.pw-browsers/chromium-*` headless chromium + Node 内置 WebSocket（CDP）+ 静态伺服（lgdl-web dist / base dist / fixtures 同源 http://127.0.0.1）。
2. **前置就绪**：review-report.md 状态 passed（含 v4 新模块 C 项）→ 本策略方可进入执行；TASK-014 W9 终收口记录（G-01/G-02 结果归档 + validate 移交清单 + state notes 回填）为 build 侧输入面。
3. **验证脚本自主编写**（ADR-003）：driver/harness/fixtures 放 `/tmp/sddu-validate-specs-tree-web-cli-base-v4-<ts>/`，validate-report §4 记录文件名/用途/对应 Vx/退出码/关键输出；长期回归测试如需入仓 → 新 Feature 走完整 SDDU 流程。
4. **v2/v3 收口基线关联（FR-004）**：v3 收口①（真实 AI 闭环，v3 R2 已闭合 = V17 方法先例）；收口②（lgdl-web React 集成手测）/③（web-search 真实端点）沿「⏳ 待基线」不阻塞；v0.7 同批发布登记由 sddu-roadmap 承接（V17/FR-004 报告含状态清单）。
5. **V17 真实 AI 闭环**：需可用 DeepSeek key + lgdl-web 会话驱动基建；key 不可用 → ⏭️ 标注待基线（不阻塞其余判定），闭合脚本结构沿用 v3 R2 `/tmp/sddu-ac008-real-ai-loop/` 先例。

## 8. 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建：承接 spec（30 FR/8 NFR/12 EC/10 AC）+ plan（push 通道架构/ADR-002~012/预算口径 ADR-004/G-01·G-02 验证门）+ tasks（14 任务 9 波次/双验证门降级出口/终收口移交）；定义 V1~V17 验证场景（node 注入面全绿 + chromium 真实浏览器冒烟 + 零回归双保险 + 真实 AI 闭环）；双轨清单 + AC↔Vx 映射 + 降级出口（V-touch/V-net） | 2026-09-08 | SDDU Validate Agent |
