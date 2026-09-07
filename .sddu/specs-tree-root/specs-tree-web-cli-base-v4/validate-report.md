# 验证报告：specs-tree-web-cli-base-v4（web-cli-base v4：浏览器外壳纵深与事件流——事件 push/订阅通道 + 页内可达切面快赢 + 扩展线分界与契约预留）

> **文档定位**: SDDU 验证报告 — 逐项记录自主验证的执行结果，作为工作流终点
> **验证策略**: validate.md v1.0（V1~V17 验证场景：全五维度 + 双验证门 + 真实浏览器冒烟 12 面 + 真实 AI 闭环）
> **前置依赖**: validate.md（验证策略）、spec.md v1.0（30 FR / 8 NFR / 12 EC / 10 AC）、review-report.md v1.0（⚠️ 有条件通过：37 通过 + 5 警示 + 0 失败 + 0 阻塞；改进建议 10 条，代码位已含修复（C23 合并关窗语义于 event-bus.ts:617-647、C22 网络 URL 摘要于 events-tools.ts:337 等））
> **创建人**: SDDU Validate Agent
> **创建时间**: 2026-09-08
> **验证轮次**: R1
> **版本**: v1.0
> **更新人**: SDDU Validate Agent
> **更新时间**: 2026-09-08
> **更新说明**: R1 — 双轨实跑：轨 A node 注入面（base 473 / lgdl-web 66 / 全仓 1007 pass·1 skip·0 fail + tsc/vite 全零）+ 轨 B chromium headless 真实浏览器冒烟 148 断言 0 失败（EVT 订阅端到端/lifecycle 与 reload 两路/console·网络观察/洪峰预算/对话框三路/cookie/富剪贴板/shadow·iframe 穿透/合成 touch/网络拦截改写/授权 deny 面）+ v3 全工具真实浏览器重跑零回归（PhaseA 115/115 + PhaseB 11/11 + PhaseC 全绿）+ G-01/G-02 验证门独立复核 PASS + 真实 DeepSeek AI 闭环 11/11（FR-004 收口①闭合）；2 项低风险改进观察 + 人工/配置待基线沿 v3 收口登记；结论 ⚠️ 有条件通过（全部可执行门禁达标、0 阻塞）

## 1. 验证概要

| 维度 | 数值 |
|------|:--:|
| 验证项总数 | 17（V1~V17；FR 30/30 · NFR 8/8 · EC 12/12 · AC 10/10 承接） |
| 通过 | 17 |
| 失败 | 0 |
| 无法执行 | 0（收口②③ 待基线按 validate.md §7 标注，不阻塞判定） |
| 阻塞问题 | 0 |

真实浏览器断言汇总：driver4 冒烟 **148 断言 0 失败**（evt 22 / life 6 / reload-deny 2 / reload-allow 5 / netcon 13 / flood 13 / dialog 18 / cookie 19 / clip 14 / shd 11 / touch 8 / inter 15 / denyclip 2）+ miniG1/miniG2 验证门复核 **PASS** + v3 全工具重跑（PhaseA 115/115 + PhaseB 11/11 + PhaseC 全绿）+ V17 AI 闭环 **11/11**。

## 2. 逐项验证结果（V1~V17）

| # | 验证对象 | 验证步骤 | 预期结果 | 实测结果 | 判定 |
|---|---------|---------|---------|---------|:--:|
| V1 | AC-001/NFR-005/006/010 全仓回归 + 构建门禁 + dist 新鲜度 | `npm run build`（9 ws）+ 全仓 `npm test` + base/lgdl-web workspace test；dom 30 注册序检查 | 全仓 0 fail（≥ v3 898/1skip）；构建退出码 0；dom 27 头部零漂移 | 全仓 **1007 pass / 1 skip（render env-gate 既有）/ 0 fail**（base 473、lgdl-web 66、core 267、render 94+1skip、router 8、web-cli 84、web-op 15）；base tsc 0 / lgdl-web vite 0（12.7s）/ 9 ws build 0；dom 30 = 27 头 + tap/swipe/pinch 尾（dom-tools.ts:97-103）；dist mtime ≥ src；deriveTools/schema 矩阵断言随 66 pass | ✅ |
| V2 | FR-001/002/025~027/NFR-001/002/008 + AC-001/008 红线 grep | grep g1~g3 + package.json diff + ROADMAP F-14 + spec/plan/tasks mtime | 零命中 / 规格零漂移 / 依赖图谱零新增 | g1 既有工具无 emit/subscribe 副作用零命中；g2 base 零 lgdl/react import 零命中；g3 扩展实现面真调用零命中（3 处命中全在 ext-attribution.ts 注释/契约字符串位）；package.json + lockfile 全仓 diff=0；spec.md/plan.md mtime 先于 build 零改动（tasks.md 末次 touch = TASK-014 状态回填，非 spec 漂移）；ROADMAP F-14 行不变（TASK-014 仅 F-26 v1.10.0 登记） | ✅ |
| V3 | FR-008/013/014/002/EC-001/002/011/012 event-bus 机制 node 面 | v3-node-bus.mjs（时钟注入）+ base 单测 suite | 增量/并发/丢弃/合并/预算/开关全绿 | node 复核 **11/11**：默认关→开关、多订阅并发隔离（click/keydown 各自投递）、100 条 click 增量 3 次拉取无重复遗漏、bufferLimit=50+60 事件→缓冲 50/丢弃 10 计数、抖动 5 条同 target scroll 窗口内合并 count=5 + 窗口外新条目、autoPauseAt=4→自动暂停（delivered=4）+ resume 归零、全局关 ingest 丢弃计数、幽灵 subId 可读失效错误、DEFAULT_BUDGETS 与 ADR-004 表逐项一致（+sensitiveDetailLimit=200）；base 473 含 event-bus/events-tools 全链 | ✅ |
| V4 | AC-002/FR-009/015 + EC-003 EVT dom observe 端到端 | run.html?sc=evt：subscribe dom click → CDP Input 真实 click + dom click 合成 → pull 增量/过滤/来源标记/键入敏感 | 22 断言 0 失败 | **22/22**：browserEnv 构造零副作用（console/fetch 未 patch）；订阅后 domObserve 惰性安装；真实 click 捕获 source=**page**；dom 工具合成 click source=**synthetic**；type 过滤不收 scroll；6 次 click 增量无重复无遗漏（lastId 精确空增量/再拉 6 条）；password 键入 keydown 无明文（key 名 + keyLength）、input 值掩码（valueMasked/valueRead=false）；events pull 工具输出摘要可读 | ✅ |
| V5 | AC-003/FR-010/EC-001/012 生命周期 + 跨导航语义 | sc-life（hash/pushState+back/visibilitychange/订阅保持/退订卸载）+ sc-reload（deny/allow 两路 + 新文档失效语义） | 13 断言 0 失败 | **13/13**：hashchange 命中且订阅保持；popstate（pushState→back）命中；visibilitychange hidden/visible 双态命中；unsubscribe 后 lifecycle active=false（卸载成对）；reload ask deny → URL 不变、订阅存活、sessionStorage 保留；reload ask allow → 真实刷新（sessionStorage 跨文档保留）；新文档 hub.list()=空（NG-009 无自动续接）；旧 subId pull →「订阅不存在或已失效」可读错误不中断；重新订阅可完成（EC-001 全链） | ✅ |
| V6 | AC-004/FR-011/012/015 网络/console 观察 | sc-netcon：console.error/warn + fetch/XHR（token）+ env.fetch AI 自请求 + 原行为保持 | 13 断言 0 失败 | **13/13**：console error/warn 捕获（level/文本），token=SECRETC/W 无明文进事件；早于订阅的 PREWARN 不回溯；fetch（window.fetch wrap 透传）正常响应 + 事件含 method/status/durationMs、URL token 掩码；XHR 捕获掩码；**AI 自请求不可见**（env.fetch 构造期绑定原生，ADR-008 真实浏览器实证：`/echo?ai=1&token=CCC` 零事件）；pull 工具输出 url=redactUrlQuery 可见（review 改进 #1 修复面生效） | ✅ |
| V7 | AC-005/FR-014/NFR-003/007 + EC-002 预算与开关 | sc-flood：零常驻基准/抖动合并/非抖动/缓冲丢弃/自动暂停/全局关 | 13 断言 0 失败 | **13/13**：无订阅四观察源 active=false（零常驻）；80 scroll+80 mousemove 突发→每类 ≤3 条目 count≥40 承载合并计数；非抖动 click 3 次不合并；bufferLimit=5 + 20 click → delivered=20/dropped=15/缓冲 5（最旧丢弃计数可读）；autoPauseAt=4 → 8 click 后自动暂停（delivered=4）+ resume 归零恢复；switch off → disabledDropped 计数；pull 输出受摘要预算约束（<2000 字符） | ✅ |
| V8 | AC-006/FR-016/017 + EC-004/005/006/010 对话框三路 + 护栏 | sc-dialog：LGDL 同构 router 门禁（override-install/policy-add/uninstall=ask） | 18 断言 0 失败 | **18/18**：安装前原生引用零变化；install ask **deny** → 不安装（window.alert 仍原生）；ask **allow** → 安装（引用替换 + installed()=true + 审计）；alert 捕获不阻塞（页面继续运行）；无规则 confirm→false/prompt→null（缺省保守 EC-005）；trusted accept 规则命中 → confirm true；破坏性文案「确认删除该文件?」无 trusted 规则 → deny-accept（false，EC-006）；promptText trusted 规则 → 自动输入 'auto-v4'；dialog 三类型事件入通道 + 审计（override/policy/决策含 no-plaintext）；uninstall ask allow → 原生引用逐一还原 | ✅ |
| V9 | AC-007/FR-019/020 + EC-003/004/007/009 cookie roundtrip | sc-cookie：掩码 read/read-detail trusted+ask/write·delete 门禁三路/审计 | 19 断言 0 失败 | **19/19**：read 名完整 + 值缺省掩码（`sid_v4=v4secret123` → 掩码位，无明文）+ 掩码说明；read-detail 无 --trusted → untrusted 拒；read-detail trusted + ask allow → 明文取回 + 决策入审计 + 审计无明文；write untrusted → 拒写值不变；write LGDL deny（router deny）→ cookie 未写（值不变）；场景 ask allow → 写后回读一致（document.cookie 含 w_new=hello-v4 + SameSite）；ask deny → 不写；delete ask deny → 保留 / ask allow → 删后回读为空；全链路审计/输出无明文 | ✅ |
| V10 | FR-021/022 + EC-003/008 CLP 富剪贴板 | sc-clip：grant 态 write-html/write-image → navigator.clipboard.read 保真 + paste-read + 文本零回归；denyclip（reset） | 14+2 断言 0 失败 | **14/14 + denyclip 2/2**：文本 write/read roundtrip（v3 零回归）；write-html → ClipboardItem text/html 读回含 `<h1>V4 富文本</h1>`+clip 内容保真；write-image 1×1 png → image/png type + 字节 >0 + createImageBitmap 1×1；合成 paste（ClipboardEvent+DataTransfer 富内容+File）→ paste-read 捕获槽 text/html+text/plain+文件项元数据（note-v4.txt）+ paste 事件入通道 hasFiles=true；空槽 paste-read 可读说明；permissions reset 后 read → NotAllowed 可读转译（EC-008）；write 在 127.0.0.1 secure-context 缺省可写（Chromium 语义，信息项） | ✅ |
| V11 | FR-023/EC-009/NFR-007 SHD 穿透定位 | sc-shd：open shadow ×2 + 同源 iframe + closed + 6 层深链 + 跨域 iframe（&xo=） | 11 断言 0 失败 | **11/11**：CSS 直选主文档零回归；read-element #shBtn 命中（via: shadow）；click 命中（穿透定位 via:shadow）计数器=1；shadow input set-value + read-element 值回读；2 层嵌套 shadow click 命中；同源 iframe click（via:iframe）真实 onclick 生效（#inFrameSpan 0→1）；iframe 内 input fill 跨文档回读一致；closed shadow → not-found + content script/F-14 归属文案；6 层深度 > 护栏 4 → not-found 含「深度护栏 4」提示不拖垮；跨域 iframe（独立 9887 伺服）→ F-14/content script 归属文案 | ✅ |
| V12 | AC-008/FR-025/026/027 + NFR-001 EXT 归属 + 契约预留 | v12-attribution.mjs + V2 grep 交叉 | 17 断言 0 失败 | **17/17**：ATTRIBUTION_MAP 12 能力全覆盖（multi-tab-window/downloads/fullpage-screenshot/cookie-httpOnly-crossDomain/network-global/persistent-subscription/closed-shadow/cross-origin-iframe/native-dialog/trusted-input/permission-sim/file-real-path）+ DataTransfer C-05 面并入 file-real-path；逐项 entry 六字段（capability/desc/reason/home/extensionSurface/contract）齐全；unsupportedAttribution 统一文案含「浏览器扩展宿主 F-14 / CDP」；映射纯常量零实现形态；grep 交叉零扩展工程痕迹（V2-g3） | ✅ |
| V13 | AC-009/FR-028/029/030 + EC-004 LGDL 场景接入 | lgdl-web session.test 66（产品编译码）+ 浏览器 cookie/dialog/net LGDL 同构门禁 + lgdl-web React app 实跑 | 矩阵/策略/三路/禁用断言全绿 | **66/66**（session 矩阵默认开/关、LGDL_DEFAULT_POLICY_RULES 顺序与不可低于 ask、ask 三路 allow/deny/超时→deny（session.test:212）、bindPermissionAsk/bindAskUser 桥、禁用工具 schema 不含 + 派发可读（cookie/dialog/net enabled:false）、eventsSnapshot 数据源、untrusted 拒执行）；真实浏览器同构复验 = V8（dialog override ask deny/allow/审计）+ V9（cookie deny/ask 三路）+ V15（net LGDL deny）+ V16 PhaseB（lgdl-web React 11/11 实跑）；FR-029 AskDialog/事件摘要区 UI 呈现 = 收口② ⏳ 待手测（待基线，不阻塞，沿 v3） | ✅（node 面 + 冒烟双轨；UI 呈现待基线不阻塞） |
| V14 | **V-touch 验证门**（FR-024/G-01/ADR-010 + Q-013/A-004） | sc-touch（dom tap/swipe/pinch → touch 监听页计数器）+ 独立复核 | tap/swipe/pinch 各 ≥1 命中断言 | **8/8 + G-01 复核 PASS**：Touch/TouchEvent 可构造；tap 派发后 touchstart/touchend ≥1；swipe → touchmove 增量；pinch → 双触点 start/end 增量；输出含合成局限（isTrusted=false / 目标未处理 → page-eval 备用）；LGDL 场景默认关 deny 由 session 规则（LGDL_DEFAULT_POLICY_RULES tap/swipe/pinch deny）+ session.test 断言承接；build G-01 PASS 记录独立复核一致（真实 chromium 监听页收到序列） | ✅ |
| V15 | **V-net 验证门**（FR-018/G-02/ADR-008 + 裁决 2） | sc-inter + sc-g2（独立复核） | fetch 真实改写回显 + deny/untrusted/归属三路 | **15/15 + G-02 复核 PASS**：无规则零改写（基线）；untrusted rule-add 拒；net LGDL deny（router deny）；trusted rule-add（rule-v4-1: addHeader x-inject + addQuery y）→ intercept-on → 页面 fetch /echo 回显 header=x-inject:v4inject + query y=v4q + 原 token 参数保留；命中事件 meta.intercepted 含规则 id + URL 脱敏（token 无明文）+ 审计 rule-add/intercept-on 记录；响应伪造类 op 观察（见 §5 观察-1）；help 归属文案（webRequest/DNR/CDP）；intercept-off + remove 后零改写恢复；**G-02 独立复核 PASS**（独立规则 × fetch → echo 回显 header/query 改写） | ✅ |
| V16 | FR-001/NFR-005 零回归真实浏览器重跑（v3 全工具 v4 代码位） | v3 driver.mjs + siteA 复制至验证目录重跑（lgdl-web dist / base dist = v4 代码位） | 与 v3 基线等价全绿 | **PhaseA 115/115**（S1 35 ops + S3 wait + S4 截图 + S5 grant + S6 采集 e2e + S7 门禁 e2e，下载 7 文件核验 csv/json/png/txt 内容一致）+ **PhaseB lgdl-web React 11/11**（type-clear/追加/set-value/fill 值变更+onChange、SettingsPanel select deepseek→qwen + apiKey 不回显）+ **PhaseC 全绿**（clipboard/notify deny 转译两路、history back/forward URL 往返、reload 存活 + 恢复提示）→ 与 v3 报告基线（115/115、11/11）等价，**零回归** | ✅ |
| V17 | FR-004/AC-002 完整 AI 闭环（真实 DeepSeek 驱动 v4 事件通道） | v17-real-ai-loop.mjs：真实 createAiSession + env.events CDP 桥到真实页面 hub + DeepSeek deepseek-chat 驱动 | AI subscribe→捕获→pull→响应闭环 | **11/11 PASS（runAgent outcome=completed，13 LLM 轮）**：DeepSeek 依次调用 events subscribe(--kind dom --type click)/switch --on true/pull（空则重试）/dom read-element；harness 在通道 enabled 后注入**真实用户 click**（CDP Input）；事件被捕获（events=「click target=#go source=page seq/ts」）；AI pull 取回 click 事件并经 read-element 读 #out=「click#1」完成「感知→响应」闭环（无臆造，事实陈述）；订阅全程存活；bridge selftest 独立 6 步探针全绿 | ✅ |

## 3. 验证详细信息

### 3.1 测试覆盖（FR 30/30 · NFR 8/8 · AC 10/10）

**FR 覆盖 = 30/30（入范围口径）**：轨 A node 注入面（base 473 / lgdl-web 66）+ 轨 B 真实浏览器冒烟（148 断言）+ V16/v3 重跑 + V17 AI 闭环双轨承接。

| 需求 | spec 描述 | 承接 Vx | 实测结果 |
|------|----------|:--:|---------|
| FR-001 契约零破坏 + additive | V1/V2/V16 | ✅ dom 27 头零漂移（30=27+3）；v3 全工具浏览器重跑等价；既有测试零删除（base 473 较 v3 372 +101 全绿） |
| FR-002 缝 additive + 未注入转译 | V2/V3 | ✅ 无注入可读转译（events「通道不可用」、cookie/dialog/net opMissing）由 473 node 面断言；零残留 grep |
| FR-003 browserEnv 真实实现 | V4~V11/V14/V15 | ✅ 12 面真实浏览器逐能力冒烟全绿（订阅/生命周期/观察/对话框/cookie/富剪贴板/穿透/touch/拦截） |
| FR-004 v0.7 同批叠加基线 | V17 | ✅ 收口① 真实 AI 闭环**已闭合**（DeepSeek 驱动事件通道 11/11）；收口②③ 待基线不阻塞（§3.6） |
| FR-005 写面 risk 分级与门禁 | V2/V8/V9/V13/V15 | ✅ LGDL 同构 router deny/ask 实测（dialog install deny 不安装、cookie write deny 不写、net 整工具 deny）；untrusted 拒（cookie/net/dialog policy 三处实测） |
| FR-006 敏感字段模型扩展 | V2/V3/V4/V6/V9/V10 | ✅ cookie 值掩码/URL token 掩码/键入无明文/console·dialog·富剪贴板掩码/审计无明文（各场景负向断言） |
| FR-007 审计面扩展 | V2/V8/V9/V15 | ✅ dialog/cookie/net/订阅/投递审计记录可回放、无明文（memory audit 实测） |
| FR-008 事件订阅机制 | V3/V4 | ✅ 生命周期 API + 并发隔离 + 增量 lastId（node 11/11 + 浏览器 6 连点无重复遗漏） |
| FR-009 dom observe DOM 流 | V3/V4 | ✅ 真实/合成 click 捕获 + type/selector 过滤 + 键入敏感脱敏 |
| FR-010 生命周期与跨导航 | V5 | ✅ hash/popstate/visibility + reload deny/allow 两路 + 失效语义全链 |
| FR-011 console 观察 | V6 | ✅ error/warn 捕获脱敏 + 原输出透传 + 不回溯 |
| FR-012 网络观察 | V6 | ✅ fetch/XHR 字段 + token 掩码 + AI 自请求不可见（ADR-008 实证） |
| FR-013 缓冲与投递语义 | V3/V7 | ✅ 丢弃计数/上下文只见摘要/pull 增量精确/截断标记 |
| FR-014 预算与开关 | V7 | ✅ 合并 count/自动暂停/全局关零常驻/disabledDropped |
| FR-015 观察真实性与局限公开 | V4/V6 | ✅ source 标记可区分 + 局限文案（isTrusted=false/touch/跨 realm） |
| FR-016 dialog override 捕获 | V8 | ✅ ask deny 不安装/allow 安装可逆/事件捕获不阻塞 |
| FR-017 应答策略护栏 | V8 | ✅ 缺省保守/trusted accept/破坏性 deny-accept/promptText trusted 四路 |
| FR-018 网络拦截改写 | V15 | ✅ 真实改写回显 + deny/untrusted/归属三路 + 命中 meta 审计（见 §5 观察-1 低风险） |
| FR-019 cookie 读 | V9 | ✅ 掩码清单 + trusted+ask 明细 + 审计名掩码 |
| FR-020 cookie 写/删 | V9 | ✅ deny/ask 三路 + untrusted 拒写 + 写后回读/删后回读 |
| FR-021 富剪贴板写 | V10 | ✅ ClipboardItem 富写 roundtrip 保真（html/png） |
| FR-022 富内容/文件读（paste 面） | V10 | ✅ paste 捕获槽富内容 + 文件元数据 + 无手势说明 |
| FR-023 定位穿透 | V11 | ✅ open shadow/同源 iframe via 标注 + 深度护栏 + closed/跨域归属 |
| FR-024 合成 touch（验证门） | V14 | ✅ **G-01 PASS**（构造可派发 + 监听页 tap/swipe/pinch 各 ≥1 计数）|
| FR-025「不支持+归属」转译 | V12 | ✅ 12 能力逐项 ≥1 断言 + 统一文案（F-14/CDP）+ grep 零扩展实现 |
| FR-026 契约预留 | V12 | ✅ 六字段映射 + DataTransfer 并入 + 不注册/不进 schema（node + deriveTools 断言） |
| FR-027 扩展线纪律 | V2/V12 | ✅ ROADMAP F-14 行不变 + package.json 零 diff + grep 零痕迹 |
| FR-028 默认矩阵扩展 | V13 | ✅ session 66：events 默认开 / cookie·dialog·net enabled:false / schema 不含 / 派发禁用可读 / 矩阵顺序断言 |
| FR-029 事件/订阅 UI（归场景） | V13 | ✅ base 零 UI grep（V2）+ eventsSnapshot/AskDialog 文案/事件摘要数据源 node 断言；React 弹层呈现 = 收口② ⏳ 待手测（沿 v3，不阻塞） |
| FR-030 lgdl-web 新写面策略缺省 | V13 | ✅ LGDL_DEFAULT_POLICY_RULES 逐条断言（cookie deny / net deny / dialog ask / touch deny / 观察 allow；不可低于 ask）+ untrusted 拒呈现可读 |

**NFR 覆盖 = 8/8**：

| NFR | 实测 | 达标 |
|-----|------|:--:|
| NFR-001 纯度 + 零依赖 | grep 零命中 + package.json diff=0（V2/V12） | ✅ |
| NFR-002 安全基线 | dispatch 门禁先于执行器（deny 短路实测）、untrusted 拒、明文零进出（V2/V8/V9/V13/V15） | ✅ |
| NFR-003 上下文预算 | 摘要/计数形态 pull 输出 <2000 字符 + 合并/截断（V7 + node） | ✅ |
| NFR-004 事件真实性/兼容 | source 标记 + 局限公开 + 剪贴板文本零回归 + override 共存可逆（V4/V8/V10/V16） | ✅ |
| NFR-005 测试门禁双轨 | 全仓 1007/1skip/0fail + base tsc + vite 0 + 冒烟 148 + v3 重跑 + AI 闭环（V1/V3~V17） | ✅ |
| NFR-006 类型与构建完整性 | base tsc 0 / lgdl-web vite 0 / 全仓 build 0（V1） | ✅ |
| NFR-007 性能 | 零常驻基准（无订阅无 patch）+ 洪峰预算护栏 + 缓冲有界（V7/V3） | ✅ |
| NFR-008 可观测性/审计 | 订阅/投递/写面/拦截/对话框审计可回放 + 无明文（V8/V9/V15） | ✅ |

**AC 10/10 承接**：AC-001（V1/V2/V16）/ AC-002（V3/V4/V17）/ AC-003（V5）/ AC-004（V6）/ AC-005（V7）/ AC-006（V8）/ AC-007（V2/V9/V8/V13/V10）/ AC-008（V2/V12）/ AC-009（V13）/ AC-010（V1/V3~V17 全景）。

### 3.2 接口数据（真实浏览器面）

| 检查项 | 调用方式 | 预期 | 实测 | 一致？ |
|--------|---------|------|------|:--:|
| 真实 vs 合成 click 来源 | CDP Input vs dom click | source page / synthetic 区分 | 真实 `#btnA` click → source=page；dom click `#btnB` → source=synthetic（evt） | ✅ |
| lastId 增量精确 | 6 连点 + lastId 再拉 | 无重复无遗漏 | 首批 6 条 seq 单调无重复；lastId 拉取 0 增量；从 seq[0]-1 再拉恰 6 条 | ✅ |
| reload deny/allow | chrome reload router ask | deny 不刷新 / allow 刷新 | deny：URL 不变订阅存活；allow：真导航，新文档 list 空 + 旧 subId 失效可读 | ✅ |
| console/fetch URL 脱敏 | token=AAA/SECRET 触发 | 无明文 + 事件字段 | console 文本、network URL 均无 token 明文；pull 输出 url 脱敏可见（改进 #1） | ✅ |
| AI 自请求不可见 | env.fetch（构造期原生绑定） | 不入观察流 | `/echo?ai=1&token=CCC` 事件数 = 0（ADR-008） | ✅ |
| dialog 应答三路 | alert/confirm/prompt 页面按钮 | 缺省/trusted/破坏性 | false / true（trusted accept）/ false（deny-accept）；promptText 'auto-v4' | ✅ |
| cookie 掩码→明细细 | read / read-detail trusted+ask | 掩码 vs 明文两通道 | read `••` 掩码；read-detail allow 返回 v4secret123 + 审计 | ✅ |
| cookie 写三路 | untrusted/LGDL deny/ask allow | 拒/不写/写后回读 | 拒写值不变；deny 值不变；allow 后 w_new=hello-v4 回读一致 | ✅ |
| 富剪贴板 roundtrip | write-html/write-image → clipboard.read | 结构/字节保真 | text/html 含原 HTML；png image/png + 1×1；paste-read 文件元数据 | ✅ |
| 穿透命中 | read-element/click/set-value | via 标注 + 真效果 | via:shadow / via:iframe；iframe 内 onclick span 0→1；closed/跨域/深度归属提示 | ✅ |
| 网络拦截改写 | 规则 → fetch /echo | header/query 已变 | echo 收到 x-inject:v4inject + y=v4q；原 token 保留；事件 meta.intercepted 含规则 id | ✅ |
| touch 监听 | dom tap/swipe/pinch | 监听页收到序列 | touchstart/move/end 计数器各手势增量；isTrusted=false 局限公开 | ✅ |

### 3.3 构建与脚本验证

| 检查项 | 命令 | 退出码 | 结果 |
|--------|------|:--:|:--:|
| base 构建（tsc） | `npm run build --workspace @lgdl/web-cli-base` | 0 | ✅ |
| lgdl-web 构建（vite） | `npm run build --workspace @lgdl/lgdl-web` | 0 | ✅ ✓ built in 12.74s |
| 全仓构建 | `npm run build` | 0 | ✅（9 workspace tsc/vite 零错误） |
| base 测试 | `npm run test --workspace @lgdl/web-cli-base` | 0 | ✅ **473/473** |
| lgdl-web 测试 | `npm run test --workspace @lgdl/lgdl-web` | 0 | ✅ **66/66** |
| 全仓测试 | `npm test` | 0 | ✅ 1007 pass / 1 skip（render env-gate 既有）/ 0 fail |
| dist 新鲜度 | dist mtime ≥ src 最近修改 | 通过 | ✅（event-bus dist 03:44 > src 03:42 等抽样） |

### 3.4 性能边界

| NFR/EC | 指标要求 | 实测 | 达标 |
|-----|---------|-------|:--:|
| NFR-007/EC 零常驻 | 无订阅无 instrumentation | browserEnv 构造后 console/fetch 引用零 patch、四观察源 active=false（V7） | ✅ |
| FR-014/EC-002 洪峰合并 | 高频合并计数不撑爆上下文 | 160 突发 → 每类 ≤3 条目 count≥40；pull 输出 <2000 字符摘要（V7） | ✅ |
| FR-013 缓冲有界 | 满→最旧丢弃 + 计数 | bufferLimit=5 → 20 事件 dropped=15 计数准确（V7/V3 node） | ✅ |
| FR-014 自动暂停 | 超每订阅预算暂停可 resume | autoPauseAt=4 → autoPaused + resume 归零恢复（V7） | ✅ |
| FR-023 深度护栏 | ≤4 层防深递归 | 6 层链 → 护栏提示不拖垮（V11） | ✅ |
| 合并窗口关窗语义（review 改进 #2） | 已 pull 尾部不再原地累计 | event-bus.ts:624-647 实现；node 合并断言 5 条窗口内 count=5 + 窗口外新条目（V3） | ✅ |
| （本 Feature 无数值型并发/响应阈值 NFR；性能语义面由 node 时钟注入 + 真实浏览器洪峰断言承接，v3 口径同） | — | — | ✅ |

### 3.5 漂移检测

| 漂移类型 | 检测结果 |
|---------|---------|
| 规格漂移（spec/plan） | ✅ 无（spec.md 23:43 / plan.md 23:56 mtime 先于 build；validate 阶段零修改；git diff 空） |
| tasks.md 末次变更 | ✅ 非漂移（01:43:38 = TASK-014 状态回填与 build 同刻，非规范内容变更） |
| 孤立代码（有代码无需求） | ✅ 无（review C01~C42 + 浏览器 12 面逐 FR 锚点；V2 grep 无残留） |
| 需求缺失（有需求无代码） | ✅ 无（V1~V17 覆盖 30 FR 全谱 + v3 重跑 PhaseA 115 断言） |
| 依赖越界 | ✅ package.json + lockfile 全仓 diff = 0（NFR-001/002） |
| 扩展工程痕迹 | ✅ 实现面零命中（g3；3 处命中均为 ext-attribution.ts 注释/契约字符串位，非 API 调用） |
| ROADMAP 漂移 | ✅ F-14 门禁行不变；v1.10.0 仅登记 F-26 继承基线（TASK-014） |

### 3.6 v2/v3 收口基线关联（FR-004，validate 报告承接 build §5.3 移交）

| 收口项 | 本报告状态 | 标注 |
|------|-----------|------|
| ① 真实 AI 闭环（真实 DeepSeek 驱动） | **已闭合**：v3 R2 先例扩展至 v4 事件通道 —— DeepSeek subscribe(dom click)→ switch → pull（真实 click 注入 source:page）→ read-element 验证 → 报告闭环；runAgent completed，11/11 断言（v17-result.json） | ✅ 闭合 |
| ② lgdl-web React 集成面手测（AskDialog 弹层呈现 / 事件摘要区 UI / 真实系统通知） | lgdl-web React app 已机械实跑（V16 PhaseB 11/11，含 SettingsPanel/受控表单）；AskDialog/事件摘要区真实 UI 点验、真实系统通知 = 人工点验 | ⏳ 待基线（不阻塞，沿 v3 收口②） |
| ③ web-search 真实端点（需配置 key） | untrusted 语义面由 V6/V15/单测承接；真实端点调用 | ⏳ 待基线（不阻塞，沿 v3 收口③） |

## 4. 验证脚本执行记录

> ADR-003：脚本由 validate Agent 自主编写并直接执行（不走 task→build），存放于 `/tmp/sddu-validate-specs-tree-web-cli-base-v4-20260908-034908/`；不污染项目源码目录（git status 无新增仓库文件）。

| 脚本文件 | 用途 | 对应场景 | 退出码 | 关键输出 |
|---------|------|:--:|:--:|---------|
| v1-*-build.log / v1-*-test.log（轨 A 输出） | 全仓/workspace build + test 记录 | V1/V13 | 0 | base 473、lgdl-web 66、全仓 1007 pass/1 skip/0 fail；build 全 0 |
| v2-grep.log（+git diff） | 红线 grep g1~g3 / package.json diff / ROADMAP | V2/V12 | 0 | 零命中清单；g3 3 处字符串位分类说明 |
| v3-node-bus.mjs | event-bus 纯逻辑复核（时钟注入） | V3 | 0 | 11/11 PASS（增量/隔离/丢弃/合并/自动暂停/开关/预算常量） |
| v12-attribution.mjs | EXT 归属 + 契约预留映射复核 | V12 | 0 | 17/17 PASS（12 能力 + DataTransfer + 六字段 + 统一文案 + 纯常量） |
| browser/driver4.mjs + fx/sc-*.mjs + lib/h.js（harness） | chromium headless + CDP 冒烟总编排（12 场景 + 双门复核 + 授权 deny） | V4~V11/V14/V15 | 0 | **148 断言 0 失败**；miniG1/G2 PASS；driver4-summary.json |
| browser/fx/sc-evt.mjs | EVT 订阅端到端（真实 CDP click 注入协调） | V4 | 0 | 22/22（source page/synthetic、增量精确、键入脱敏） |
| browser/fx/sc-life.mjs / sc-reload.mjs | 生命周期 + reload 两路 + 失效语义 | V5 | 0 | life 6/6、reload-deny 2/2、reload-allow 5/5 |
| browser/fx/sc-netcon.mjs | console/network 观察 + AI 自请求不可见 | V6 | 0 | 13/13 |
| browser/fx/sc-flood.mjs | 洪峰预算/开关/合并/丢弃/暂停 | V7 | 0 | 13/13 |
| browser/fx/sc-dialog.mjs | 对话框三路 + 护栏 | V8 | 0 | 18/18 |
| browser/fx/sc-cookie.mjs | cookie roundtrip + 门禁 | V9 | 0 | 19/19 |
| browser/fx/sc-clip.mjs + sc-denyclip.mjs | 富剪贴板 roundtrip + 授权 deny 面 | V10 | 0 | clip 14/14 + denyclip 2/2 |
| browser/fx/sc-shd.mjs | shadow/iframe 穿透 + 护栏 + 归属 | V11 | 0 | 11/11 |
| browser/fx/sc-touch.mjs | 合成 touch 复核 | V14 | 0 | 8/8（= G-01 复核） |
| browser/fx/sc-inter.mjs + sc-g2.mjs | 网络拦截改写端到端 + G-02 复核 | V15 | 0 | inter 15/15 + g2 PASS |
| v16/driver.mjs（v3 driver 复制）+ siteA/ | v3 全工具真实浏览器重跑（v4 代码位） | V16 | 0 | PhaseA 115/115 + PhaseB 11/11 + PhaseC 全绿 + 下载 7 文件核验 |
| v17-real-ai-loop.mjs（SELFTEST=1 支持 bridge 探针） | 真实 DeepSeek 驱动事件通道 AI 闭环 | V17 | 0 | 11/11 PASS（runAgent completed / 13 LLM 轮 / 事件 source:page / v17-result.json） |

> 脚本路径约定：全部写入 `/tmp/sddu-validate-specs-tree-web-cli-base-v4-20260908-034908/`（浏览器 harness 子目录 browser/、v16 重跑子目录 v16/、日志 logs/），chromium 使用 `.pw-browsers/chromium-1234` headless + CDP（`--headless=new --no-sandbox`），未新增任何仓库文件。

## 5. 阻塞问题

无（0 个）—— 全部可执行门禁达标：FR 30/30 覆盖、NFR 8/8、全仓回归 1007/1skip/0fail、构建退出码 0、真实浏览器冒烟 148+115+11 断言 0 失败、G-01/G-02 验证门 PASS、AI 闭环闭合、漂移 0 严重项。

**非阻塞改进观察（不阻塞判定，供下一迭代/维护参考）**：

| # | 位置 | 观察 | 严重度 | 建议 |
|---|------|------|:--:|------|
| 1 | net-tools.ts rule-add actions 校验（:207-209 仅查 op 存在性与 name 类型） | 未知 op（如 `fakeResponse`）注册返回 ok、运行期静默无动作 —— 与 FR-018 out 面「不假装生效」的边界诚实有张力（浏览器实测观察，sc-inter response-forgery 断言记录） | 低 | 注册期对 actions.op ∈ 六元操作（addHeader/setHeader/removeHeader/addQuery/setQuery/removeQuery/setBodyField/removeBodyField）白名单校验，未知 op 拒注册 + 归属文案 |
| 2 | platform-events.ts collectIframeHosts（review 改进 #9 关联） | 跨域 iframe override hook 冲突文案为「宿主无 alert/confirm/prompt」而非「跨域归属说明」；真实浏览器冒烟未覆盖 dialog×跨域 iframe 组合（review 已标低，延续） | 低 | 下迭代按 review #9 建议区分「不可 hook 原因」；validate 冒烟补 dialog 页含跨域 iframe 场景 |

## 6. 结论

**结论**: ⚠️ 有条件通过（全部可执行门禁指标达标 + 真实浏览器冒烟全绿 + 0 阻塞；2 项低风险改进观察 + 2 项人工/配置待基线（收口②③）非阻塞移交，沿 v3 结论口径）

**指标达标矩阵**：

| 指标 | 要求 | 实测 | 达标？ |
|------|------|------|:--:|
| FR 测试覆盖 | 100%（30/30） | 30/30（node 注入面 473 + lgdl-web 66 + 真实浏览器冒烟 148 + v3 重跑 + AI 闭环双轨；FR-029 UI 呈现 = 收口② 待基线标注不阻塞） | ✅ |
| NFR 测试覆盖 | ≥80%（目标 8/8） | 8/8 | ✅ |
| 构建退出码 | 0 | 0（base tsc + lgdl-web vite + 全仓 9 ws build） | ✅ |
| 阻塞问题数 | 0 | 0 | ✅ |
| 漂移项（严重） | 0 | 0（规格零漂移；grep 红线零命中；ROADMAP F-14 行不变） | ✅ |

**理由**：
- **功能面**：30 FR 双轨全覆盖 —— 事件 push 通道（EVT 端到端 = 真实订阅→真实 click 捕获→缓冲→lastId 增量→来源标记→键入脱敏，node 11/11 + 浏览器 22/22 + AI 闭环 11/11）、生命周期与整页导航失效（reload ask deny/allow 两路 + 新文档空订阅 + 旧 id 可读失效）、console/网络观察（含 ADR-008 AI 自请求不可见真实实证与 URL 脱敏改进修复面）、洪峰预算（合并 count/丢弃计数/自动暂停/全局关零常驻）、对话框 override 三路 + 破坏性护栏、cookie 掩码/明细细双通道 + 写删门禁三路、富剪贴板 roundtrip + paste 捕获、shadow/同源 iframe 穿透（via 标注 + 深度护栏 + closed/跨域归属）、合成 touch（G-01 PASS）、网络拦截改写（G-02 PASS + deny/untrusted/归属三路）、EXT 归属转译与契约预留（12 能力逐项 + 零扩展痕迹 + 零依赖 diff）。
- **安全面**：明文零进出（cookie 值/URL token/键入/console/对话框/审计逐面负向断言）、写面全经 dispatch 门禁 deny/ask 实测、untrusted 拒执行、对话框缺省保守 + 破坏性 deny-accept。
- **零回归面**：v3 全工具真实浏览器重跑 PhaseA 115/115 + PhaseB 11/11 + PhaseC 全绿（等价 v3 基线）；dom 27 头部注册序零漂移；全仓 1007 pass/1 skip（render env-gate 既有）/0 fail；package.json 零 diff。
- **验证门**：G-01 合成 touch 与 G-02 网络拦截改写均独立复核 **PASS**（与 build 记录归档一致，无降级出口触发）。
- 2 项低风险改进观察（net actions op 白名单、跨域 dialog 文案）与收口②③ 待基线非阻塞移交；review 改进 #1/#2 等已在代码位生效并经实测复核。

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | R1 初始创建（V1~V17 全项执行：轨 A 473/66/1007·0fail + 轨 B 真实浏览器 148 断言 0 失败 + G-01/G-02 独立复核 PASS + v3 全工具重跑 115/115·11/11 + 真实 DeepSeek AI 闭环 11/11；0 阻塞；结论 ⚠️ 有条件通过 + 2 低风险观察 + 2 待基线） | 2026-09-08 | SDDU Validate Agent |
