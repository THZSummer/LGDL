# 审查报告：specs-tree-web-cli-base-v4（R1）

> **文档定位**: SDDU 审查报告 — 逐项记录自主审查的执行结果，作为 validate 阶段的输入
> **审查策略**: review.md v1.0（C01~C42 审查清单：A 架构一致性 6 / B 零回归 4 / C 安全门禁与脱敏 9 / D push 通道 10 / E 工具面 6 / F 场景·质量 7）
> **前置依赖**: review.md（审查策略）、spec.md v1.0（30 FR / 8 NFR / 12 EC / 10 AC）、plan.md v1.0（12 ADR / §3.0 落位表 / §6 文件影响）、build.md v1.0（14 任务 / 9 波次 / GATE 记录）
> **创建人**: SDDU Review Agent
> **创建时间**: 2026-09-08
> **审查轮次**: R1
> **版本**: v1.0
> **更新人**: SDDU Review Agent
> **更新时间**: 2026-09-08
> **更新说明**: 初始创建（R1 静态审查：C01~C42 全项执行；审查方法 [S] 静态走读 / [G] grep 断言 / [T] 测试静态核验 / [D] git diff 基线对比（HEAD = v3 代码位） / [B] build·GATE·验证门记录核验；动态真实浏览器项显式移交 validate）

## 1. 审查概要
> 审查结果的量化总览

| 维度 | 数值 |
|------|:--:|
| 审查项总数 | 42 |
| 通过 | 37 |
| 警告 | 5 |
| 失败 | 0 |
| 阻塞问题 | 0 |

## 2. 逐项审查结果（C01~C42）
> 对照 review.md 审查清单逐项评估（判定代号：S/G/T/D/B；评估 ✅=通过 ⚠️=通过含非阻塞发现 ❌=失败）

| # | 审查对象 | 审查基准 | 评估 | 发现 | 严重程度 |
|---|---------|---------|:--:|------|:--:|
| C01 | 文件影响对齐 + 机制分层 | plan §6 / §2.2 分层 | ✅ | [D] 源文件清单与 plan §6 完全对齐：8 新源（event-bus/platform-events/events-tools/dialog-tools/dialog-policy/net-tools/cookie-tools/ext-attribution，git untracked 实证）+ 9 新测试 + 8 改源（platform/platform-dom/dom-tools/clipboard/sensitive/audit/locator/index）+ lgdl-web 3 源 1 测试 + 文档 4，无 plan 外源文件；event-bus/sensitive/dialog-policy/ext-attribution 零 DOM import（grep），DOM/window 触碰收敛 platform-dom.ts + platform-events.ts 两文件。注：build.md §1 统计行「新增 base 源 11/修改 base 10」口径与实际（8/8 源）不符 → 见改进 #6 | 低 |
| C02 | 缝 additive + 未注入转译 | FR-002 + ADR-002/009 + plan §2.4 | ✅ | [S][G] PlatformEnv.events?/clipboardRich?（platform.ts:726-728）与 PlatformDomOps #26~29 cookieRead/Write/Delete/touchDispatch（:473-479）全 optional；nodeEnv 不预置 events/clipboardRich（platform.test「node 面不预置」断言）；既有成员零删除零改型；`[k:string]:unknown` :730 保留；未注入转译 events-tools.ts:105-113「事件通道不可用（EC-011）」/ cookie opMissing / dialog/net 同构「未注入」可读态 | — |
| C03 | browserEnv 真实现 + 惰性安装零常驻 | FR-003/008/014 + NFR-007 + ADR-002/008 | ✅ | [S][G][T] browserEnv() 装配 env.events（platform.ts:1034-1039）+ clipboardRich；createBrowserEventHub 构造零副作用（platform-events.ts:170-173 仅 new EventBus + Map）；观察源 0→1 首订阅安装 / 1→0 末退订卸载成对（dom/lifecycle/console/paste installers/uninstallers + network refreshNetwork）；还原位存在（console 还原原引用、fetch/XHR proto 还原、listener 成对）；「零副作用」用例（platform-events.test:107-115 无监听器断言）；FR-003 各面真实 API（addEventListener/console 原引用透传/fetch wrap/document.cookie/TouchEvent），非 throw 桩 | — |
| C04 | 订阅随文档销毁 + 跨导航语义 | FR-010 + EC-001/012 + NG-009 + ADR-002 | ✅ | [S][D][G] hub = browserEnv() 每次会话构造的文档作用域对象 → 整页导航销毁天然失效；失效订阅 pull/unsubscribe 可读错误含「重新 read-state + 订阅（EC-001）」（event-bus.ts:228-233/499、events-tools.ts:178 list 空态 + help:419）；SPA hashchange/popstate 订阅保持（listener 在 win/doc）；v3 reload 破坏性语义零改动（chrome-tools/reload 路径 diff=0，permission/router 零 diff）；无跨导航续接代码残留 | — |
| C05 | 注册序 additive + 矩阵尾接 | FR-001/028 + plan §2.1/3.9 | ✅ | [D][T] session.ts v4 块纯追加（git diff 实证：v4Entries 于 v3 p2Entries 后尾接，cookie/dialog/net 置 enabled:false）；LGDL_DEFAULT_POLICY_RULES v4 行尾插于既有 clipboard 行后、v2 risk 规则前（additive）；FULL_NAMES 尾接 events/cookie/dialog/net（session.test:82-86）+ 注册序断言 deepEqual(deriveTools→DERIVE_NAMES)（:103-109）+ names()=FULL_NAMES（:117-119）；help 33 断言 | — |
| C06 | 共享 resolver 单点穿透 | FR-023 + ADR-011 | ✅ | [S][G] 穿透单点实现 resolveDeepIn/firstOfDeep（platform-dom.ts:398-458），全部元素级 executor 26 处调用 firstOfDeep（grep :934-2551 全为 firstOfDeep，无各自复制）；主文档 CSS/text= 命中路径 resolveQueryIn 零改动；深度护栏 PENETRATION_MAX_DEPTH=4（:382，导出 + 测试断言）；via:'shadow'/'iframe' 标注 + 命中结果带穿透提示（:412/:425/:449，read-element 输出 via 行 :1164）；closed shadow/跨域 iframe not-found 文案含「content script(all_frames)/CDP = F-14」（:454-455）。注：护栏为常量非按调用可配（FR-023「可配」为源码级）→ 见改进 #10 关联 | 低 |
| C07 | dom 27 注册序逐字节一致 | FR-001 + AC-001 | ✅ | [D][G] git diff 实证既有 27 项（含注释分组）零改动，仅尾部追加 'tap','swipe','pinch'（dom-tools.ts:97-102 SUBCOMMANDS 与 DomSubcommand 联合同步）；v3 基线 HEAD 比对逐字节一致；测试断言 subs.slice(0,7) 头 7 + subs.slice(27)=[tap,swipe,pinch] + 30 长度 + subcommandRisks 30 全覆盖（dom-tools.test:325-355） | — |
| C08 | 既有工具零推式副作用 | FR-001 验收 | ✅ | [G][D] chrome-tools/wait-tools/page-eval/collect-tools/doc-tools/save-file/web-fetch/web-search/eval-tools/storage-tools 等既有工具 grep `bus.ingest|emitEvent|hub.append|.subscribe(` = 0 命中（EXIT:1）；工具层 diff 无事件面接线；事件入通道仅经 platform-events 观察源 + event-bus ingest | — |
| C09 | deriveTools 顺序 + schema 体积 | FR-001 + NFR-003 + AC-001 | ⚠️ | [T][D] deriveTools 顺序断言存在（v4 块尾接，session.test:103-109）+ 禁用工具不进 schema（cookie/dialog/net 剔除于 DERIVE_NAMES :94-97 + 派发禁用可读 :624-633）；但 schema 体积对比 v3 无**显式测试断言**（体积对比仅 ROADMAP/build.md 文字位） | 低 |
| C10 | 缺省兼容性（无注入面行为） | FR-001/002 + EC-011 | ✅ | [S][T] events 缝 undefined → 可读「事件通道不可用」不抛不中断（events-tools.test:68-75）；cookie/dialog/net 未注入 → 各自 opMissing/不可用转译（cookie-tools.test:134-139、dialog-tools.test:61-65、net-tools.test:135-140）；subscribe 于 hub 未注入无 side effect；dom touch 未注入 → opMissing 断言（dom-tools.test:663-665） | — |
| C11 | 写面 risk/subcommandRisks 声明表 | FR-005 + O-008 | ✅ | [S][G] cookie read-detail/write/delete='write'（cookie-tools.ts:198-203）；net rule-add/remove/intercept-on|off='write'（net-tools.ts:302-309）；dialog override-install/uninstall/policy-add='write'（dialog-tools.ts:199-206）；events pull-sensitive='write'、subscribe/pull/list/status='read'（events-tools.ts:434-446）；clipboard write-html/write-image='write'、paste-read='ui'（clipboard.ts diff）；dom tap/swipe/pinch='ui'（dom-tools.ts:768-775）；档位 ≥ plan 取向（拦截 deny 由矩阵规则承接） | — |
| C12 | 门禁无旁路 | NFR-002 + FR-005 | ✅ | [D][G] permission.ts / router.ts 本体 git diff = 0（实证）；新工具 ops 调用仅出现于各自 executor（cookie/net/dialog executor 为唯一 ops/ctrl 调用点），executor 全部经 router.register + dispatch 派发；无 executor 外直呼 ops/全局 patch 不经门禁；dispatch deny 先于执行器（cookie/net/dialog 三测试断言 deny 后 ops 未被调用/spy 为空） | — |
| C13 | untrusted 拒执行 | FR-005/030 + EC-004 | ✅ | [S][T] cookie write/delete/read-detail 显式 --trusted true 守卫（cookie-tools.ts:71-77/90-96/114-120，deny 入审计）；net rule-add/remove/intercept 守卫 trustedGuard（net-tools.ts:181-191）；dialog policy-add trusted 守卫（dialog-tools.ts:80-89）+ controller addRule trusted 兜底（platform-events.ts:795-798）；events pull-sensitive trusted 守卫（events-tools.ts:247-257）；每条拒绝路径 ok:false + 「需 trusted 声明」可读文案 + 审计，三路断言测试存在（各自 test 文件） | — |
| C14 | 敏感字段模型函数族扩展 | FR-006 + ADR-006 | ✅ | [S][D][T] sensitive.ts 追加 redactUrlQuery/isSensitiveHeader/maskHeaderValue/maskTextPayload/maskByMode + 策略常量（TYPING/CONSOLE/DIALOG/RICH_CLIPBOARD_TEXT_POLICY）+ SENSITIVE_URL_PARAM_NAMES/HEADER_NAMES；纯函数零 DOM；v3 既有字段模型/maskValue 零改动（git diff 纯尾部追加，既有用例零删除）；函数族 13+ 用例（sensitive.test v4 段：URL/header/文本/掩码位断言） | — |
| C15 | 敏感接入点与明文零进出 | FR-006/012/019/011 + NFR-002 + EC-003 | ✅ | [G][S] cookie 读缺省掩码 maskValue（platform-dom.ts:2465）；network URL redactUrlQuery（platform-events.ts:367/385/443）；console/对话框/富剪贴板文本 maskTextPayload（:527/:706/:156-163）；键入负载无明文值（key 名+修饰键布尔，敏感目标值掩码 :194-221）；敏感头不进网络事件负载（network 事件 meta 仅 method/url(脱敏)/status/durationMs/content-type）；实现面明文 grep 零命中（测试面含负向断言用例） | — |
| C16 | 敏感明细 trusted+ask 通道 | FR-006/008/019 + ADR-006 | ⚠️ | [S][G] cookie read-detail 独立子命令 + risk write + trusted + ask + 决策入审计（cookie-tools.ts:69-83）成立，普通 read 永不返回明文；但事件面 pull-sensitive：event-bus 侧库机制完备（sensitiveDetailLimit/越权拒，event-bus.test:453-472 断言），**浏览器观察源却从不传 sensitiveDetail**（platform-events.ts 各 ingest 调用无一处携带）→ 真实浏览器 events pull-sensitive 恒返回「无保留明细」；events help/subscribe 文案宣称明细走该通道（events-tools.ts:403/:160）→ 功能承诺悬空（安全面保守无泄漏，见改进 #3） | 中 |
| C17 | 审计面扩展 | FR-007 + NFR-008 | ✅ | [S][D][T] AuditEventType 六型追加（audit.ts:31-37 subscribe/unsubscribe/event-delivery-summary/dialog/cookie/net-intercept）+ v4 字段（subId/subKind/sensitive/count/action/domain）；各新面记录点 grep 可查（events-tools auditSubscribe/Delivery/Decision、cookie auditCookie 名掩码、dialog auditDialog、net netHitAudit）；审计用例（字段/裁决来源/无明文）audit.test v4 段 4 用例；负载零明文 | — |
| C18 | 对话框应答策略护栏 | FR-017 + EC-005/006 + ADR-007 | ✅ | [S][T] dialog-policy.ts 纯逻辑零 DOM；缺省保守三路（alert accept/confirm·prompt dismiss，:93-95）；DESTRUCTIVE_PATTERNS 中英词元（:37-41）+ 破坏性文案无 trusted accept → deny-accept（:72-76）；prompt 自动输入仅 trusted 规则显式 text（:82-90）；三路断言测试（dialog-policy.test 5 用例：缺省/trusted accept/破坏性 deny/promptText/规则匹配）；无绕过策略直 accept 路径（override capture 唯一经 resolveDialogAction platform-events.ts:709） | — |
| C19 | override 安装可逆与共存 | FR-016 + NFR-004 + ADR-007 | ✅ | [S][D][T] install 保存原引用 → hookedHosts Map → uninstall 还原（platform-events.ts:724-741/783-790）；重复安装冲突可读文案（:717-720）；「安装前行为零变化」回归（dialog-tools.test:76-77 原生返回断言 + :110-114 卸载还原）；iframe 尽力 hook（同源 contentWindow；跨域 SecurityError 捕获不跨 SOP :756-763）；install = write ask 经 router deny 不安装（dialog-tools.test:146-155）。注：跨域 iframe 冲突文案为「宿主无 alert/confirm/prompt」而非归属文案（改进 #9，validate 冒烟复核真实行为） | 低 |
| C20 | 订阅生命周期 API | FR-008 + ADR-002 | ✅ | [S][T] subscribe/unsubscribe/pause/resume/clear/list/pull/status/budget/switch 全实现（event-bus.ts + hub async 面）；唯一 subId 计数器；多订阅并发互不干扰用例（event-bus.test:113-134，按类型/kind 过滤独立投递）；多源并发（platform-events.test:288-304）；审计钩子窄事件面（subscribe/unsubscribe/delivery-summary，event-bus.test:426-449）；订阅注册/撤销走工具层门禁 + 审计 | — |
| C21 | 全局 seq + lastId 增量拉取 | FR-008/013 + ADR-003 + AC-002 | ✅ | [S][T] 全局单调 seq 跨源总序（event-bus.ts:571，测试 :308-325）；每订阅本地游标 lastId；pull{lastId} 返回 seq>lastId（:488-533）；增量无重复无遗漏多轮断言（event-bus.test:175-208：全量→增量 lastId=3→空增量）；事件冻结不可变（freezeEventClone + Object.freeze，测试 :210-234 含篡改 throws） | — |
| C22 | 缓冲预算/丢弃/截断/投递 | FR-013 + NFR-003 + EC-002 + ADR-004 | ✅ | [S][T][G] 每订阅独立缓冲有界（bufferLimit 200/上限 1000 校验）；满→最旧丢弃 + dropped 计数（测试 :138-156 计数=2 准确）；4KB 截断 + truncated 标记（:158-171，引用 DEFAULT_BUDGETS.payloadBudgetChars 非硬编码）；投递 = 摘要+计数（events-tools pull 只示 ≤N=10 摘要 :221-238，测试 :151-168 大负载不进 output + output<4000）；事件流不整段进工具 output。注：network 事件摘要不呈现 URL（脱敏位）→ 见改进 #1 | 中 |
| C23 | 抖动合并窗口 | FR-014 + ADR-003 + EC-002 | ⚠️ | [S][T] 合并白名单精确 = scroll/resize/mousemove/mouseover（JITTER_EVENT_TYPES，event-bus.test:37-41 非抖动不合并断言）；窗口可配（默认 800，0=关，测试 :272-304）；合并 ts=首事件/lastTs=末事件/count 语义断言（:238-270）；但**已 pull 的合并尾部会继续被 ingest 累计 count/lastTs**（deliverTo 对 buffer 尾部原地累加 :624-637），而 pull 只返回 seq>lastId（:503）→ 连续高频抖动流下（窗口内 AI 已拉取后仍在合并），后续 pull 恒 0 增量，AI 看不到已拉尾部的更新计数/末时间（EC-002/AC-005 洪峰语义边界缺口）→ 见改进 #2 | 中 |
| C24 | 预算常量单一数据源 | FR-014 + ADR-004 + D-001 | ✅ | [S][G] DEFAULT_BUDGETS 于 event-bus.ts:32-51 单点声明且值域与 ADR-004 表逐项一致（测试 :26-35 断言 200/1000/2000/8/200/800/10/4096）；工具层/观察源零硬编码（grep events-tools.ts/platform-events.ts 只引用常量）；测试期望值经常量引用 | — |
| C25 | dom observe 落位 + 过滤 + 键入敏感 | FR-009/015 + ADR-005 + P-04 | ✅ | [S][G][T] dom observe = events subscribe --kind dom 别名（events-tools EVENTS_DESC/help :129/:352/:396 显式标注，不新增 dom 子命令）；kind 枚举 6 含 dom/lifecycle/console/network/paste/dialog（OBSERVE_KINDS）；过滤 = 类型∩selector∩URL∩level 于 hub 入口 busFilterMatch（event-bus.test 命中/未命中断言 :327-364）；keydown 负载无明文值字段（key 名+修饰键布尔+keyLength；platform-events.test:162-194 明文不进负载断言） | — |
| C26 | lifecycle 观察源 | FR-010 + plan §2.5 | ✅ | [S][D] window hashchange/popstate/pagehide/beforeunload + doc visibilitychange（platform-events.ts:109-110/233-264，挂载点表一致）；监听添加/移除成对（cleanups 还原 :260-263）；只产生事件不干预 reload 语义（chrome/permission reload 路径 diff=0）；SPA 订阅保持（同一 hub/doc 监听面）；EC-001 失效提示（C04 证据） | — |
| C27 | console 观察源 | FR-011 + plan §2.5 | ✅ | [S][T] console.* 首订阅 patch / 末退订还原（originals Map + 还原 :272-295）；原输出透传（orig.apply 后 ingest，测试 :243-245 原输出仍达 + :246-248 卸载还原原引用断言）；早于订阅不回溯（仅 patch 后调用捕获，惰性安装语义）；负载 = level + 脱敏文本摘要（maskTextPayload CONSOLE_TEXT_POLICY）+ 时间戳（bus 分配 ts） | — |
| C28 | network 观察 + AI 自请求默认不可见 | FR-012 + ADR-008 + NG-010 | ✅ | [S][D][T] fetch/XHR 单点共享 instrumentation（platform-events.ts:334-469 + refreshNetwork netNeed 联合控制）；XHR open/send 双 wrap（:404-464）；记录 method/URL(redactUrlQuery)/status/耗时/响应头子集 content-type（缺省不含敏感头）；响应体默认不读；AI 自请求早期绑定：browserEnv `fetch: globalThis.fetch.bind(globalThis)` 构造时完成（platform.ts:1038）+ eventsHub 构造（:1034）→ 网络订阅后 wrap 的 window.fetch 不影响 env.fetch；node 断言（platform-events.test:251-286 nativeFetch 入流 = 0 事件） | — |
| C29 | synthetic 来源标记 + 局限公开 | FR-015 + NG-007 + NFR-004 | ✅ | [S][G] 模块级 syntheticDispatchFlag + isSyntheticDispatch/withSyntheticDispatch（platform-dom.ts:162-177）+ dispatchSynth 包裹全合成派发（grep :481-2576 鼠标/键盘/焦点/拖拽/touch）；domObserve handler 读标志 → source:'synthetic'（platform-events.ts:190）；事件负载带 src=（events-tools pull :227）；局限声明 help 文案（isTrusted/同 realm/stopImmediatePropagation/worker 非 JS 子资源不可达，events-tools.ts:418-420 + dom-tools.ts touch 局限行 + events-tools.test:203-212 断言） | — |
| C30 | cookie 工具与 ops | FR-019/020 + ADR-009 + EC-007 | ✅ | [S][T] PlatformDomOps cookieRead/Write/Delete 真实现（document.cookie 收敛 platform-dom.ts:2455-2523，非桩）；read 缺省掩码（:2465，maskValue）；write/delete risk write + untrusted 守卫（C11/C13）+ 写后回读断言（:2501-2505 回读空→错误；删后回读 :2518-2521）；Secure 仅 HTTPS/localhost 转译（:2486-2493 EC-007）；HttpOnly/跨域 → chrome.cookies 归属文案（工具 help + ops 输出透传，cookie-tools.test:148-153）；审计名掩码 + 域 + 动作（C17）；测试含 fake ops 全链 + router deny | — |
| C31 | 富剪贴板/粘贴读 | FR-021/022 + ADR-009 + EC-008 + NG-012 | ✅ | [S][D][T] clipboardRich 新缝（navigator.clipboard.write + ClipboardItem text/html+image/png+text/plain 并存，platform.ts browserEnv clipboardRichSeam :917-932，与文本缝互不覆盖）；clipboard.ts diff 纯追加（文本 read/write 既有 executor 零改动，富子命令路由分支）；write-html/write-image/paste-read 尾部追加 + enum/分支同步（CLIPBOARD_RICH_SUBCOMMANDS）；paste-read 读 pasteCapture 槽（用户主动粘贴才捕获，platform-events.ts:471-540）；授权失败 v3 FR-009 转译（clipboard.test:93-108 NotAllowedError→可读）；ClipboardItem 不可用 → 授权转译（browserEnv :922-924）；无手势读 → 不支持说明（NG-012 文案 + 测试 :76-80）；文本既有用例零回归（:13-21 + p2-web-tools.test 保留） | — |
| C32 | 合成 touch 验证门（G-01）结果与实现 | FR-024 + ADR-010 | ✅ | [B][D][G] G-01 PASS 记录（build.md §4：真实 headless chromium touchstart/move/end 各 1 命中，harness /tmp/opencode/cdp-run.mjs 非仓库交付）+ tasks TASK-013 注记 → PASS 分支实现 = PlatformDomOps.touchDispatch（platform-dom.ts:2527-2632 TouchEvent 构造序列）+ dom tap/swipe/pinch 尾部（dom-tools.ts enum/SUBCOMMANDS/executor/help/subcommandRisks 四同步）+ LGDL deny 默认关 + isTrusted=false 局限公开（:2630）；验证门记录两路其一且与实现状态一致 | — |
| C33 | net 拦截工具（P2 门禁） | FR-018 + ADR-008 + 裁决 2 | ✅ | [S][T] 规则引擎纯逻辑 node 可测（applyNetRules/netRuleMatches，URL glob 匹配 → add/set/removeHeader/Query + set/removeBodyField 请求发出前，net-tools.ts:45-164）；改写仅限发出前（无响应侧/缓存篡改路径）；引擎单测（URL 命中/动作序列/untrusted 不应用/非可改体跳过，net-tools.test:21-58）；net 整工具 P2 write + 矩阵默认关 + LGDL deny + trusted 守卫（C11/C13）+ 命中审计（netHitAudit URL 脱敏）；响应伪造/缓存/先网络栈/跨 realm 归属转译（help + status 文案）；与观察共享 instrumentation（platform-events.test:308-341）。注：fetch 拦截仅查询命中时也重建 Headers → 见改进 #8 | 低 |
| C34 | EXT「不支持+归属」统一转译面 + 纪律 | FR-025/027 + ADR-001/012 | ✅ | [S][G] ATTRIBUTION_MAP 12 能力全量覆盖 spec §2.5 🔴 列 + 例外项（multi-tab-window/downloads/fullpage-screenshot/cookie-httpOnly-crossDomain/network-global/persistent-subscription/closed-shadow/cross-origin-iframe/native-dialog/trusted-input/permission-sim/file-real-path(含 DataTransfer C-05 面)）；unsupportedAttribution 统一文案（不支持+归属+契约预留，v3 fullpage 同构）；events/dialog/cookie/clipboard/dom 5 工具 help 接线（attributionHelpLines + 各自归属文案）；零扩展工程痕迹（实现面 grep chrome.runtime/tabs/downloads/webRequest/manifest/@types/chrome 调用=0，仅字符串/注释位）；不触碰 F-14 门禁（ROADMAP F-14 行不变，v1.10.0 仅登记 F-26 继承基线非承诺）；逐项转译断言 ≥1（ext-attribution.test:35-50） | — |
| C35 | 契约预留文档面（FR-026） | FR-026 + ADR-012 + plan §3.8 | ✅ | [S][G][T] 映射字段完整（capability/desc/reason/home/extensionSurface/contract 六字段，ext-attribution.test:31 字段齐全断言）；形态 = 常量映射 + 类型占位（AttributionEntry interface + 注释），不注册工具、不进 schema、不接线（index.ts 仅导出常量/helper；ext-attribution 无 ToolEntry 工厂；「契约预留不进 deriveTools」测试 :52-60）；schema 体积变化 = events 尾接 + 富子命令 enum 追加（C09 关联） | — |
| C36 | lgdl-web 默认矩阵 + 策略规则 | FR-028/030 + plan §3.9 | ⚠️ | [S][D][T] 矩阵默认开/关与 FR-028 表一致（events 默认开 + cookie/dialog/net enabled:false 默认关 + 富剪贴板随条目默认开 + dom touch LGDL deny 默认关）；矩阵单测存在（session.test:623-647 派生 schema 一致 + schema 不含禁用 + 派发禁用可读）；LGDL_DEFAULT_POLICY_RULES：观察只读 allow 前置（:231-234）→ cookie deny（:236-238）→ dialog ask（:240-242）→ net deny（:244）→ touch deny（:247-249）→ v2 risk 兜底 ask/deny（尾），取向不可低于 ask；allow 规则置于 ask 前顺序正确。注：events subscribe allow 规则（:231）无法区分 --sensitive true（PermissionGate 按 pattern+subcommand 匹配），注释 :230 声称「敏感订阅不在此放行」与实际不符（敏感订阅实际免 ask 仅入审计；明细细仍受 pull-sensitive write 档 + 零明细供给双保险，泄漏风险低）→ 改进 #4 | 低 |
| C37 | 场景 UI 呈现 + base 零 UI | FR-029 + plan §3.9 + NG-008 | ✅ | [S][G] AiPanel EventsStatusLine（订阅数/缓冲水位/通道开关/自动暂停提示，hub.status 数据源，AiPanel.tsx:239-276，只读摘要不撑爆上下文）；AskDialog 新写面 ask 文案（cookie 写/删/read-detail、dialog override/policy、net、events pull-sensitive、clipboard 富 — AskDialog.tsx authPathNote v4 段）；base grep React/JSX/UI = 0 命中（C38 纯度同证）。注：AiPanel 无条件 4s 轮询 → 改进 #7 | 低 |
| C38 | base 纯度 + 零新增依赖 | NFR-001 + AC-010 + FR-027 | ✅ | [G][D] base 全文件 grep `from 'lgdl|from 'react|require('react')|from '\.\./lgdl` = 0 命中（EXIT:1）；package.json git diff = 0（web-cli-base 与 lgdl-web 均零变化）；零扩展 API import（无 @types/chrome 等 devDep） | — |
| C39 | 构建与类型完整性 | NFR-006 + FR-003 + plan §2.4-6 | ✅ | [B][D] build GATE 记录全仓 build 零错误 + 全仓 test 零失败（base 471/lgdl-web 66，TASK-014 记录；动态复跑属 validate）；index.ts diff 纯尾部追加（~50 新导出：event-bus/platform-events/events/cookie/dialog/net/sensitive 族/clipboardRich/ext-attribution/穿透常量/PlatformEventHub 类型面），既有导出零删除；导出面覆盖 plan §2.4-6 清单（PlatformEventHub/PlatformRichClipboard/PlatformDomOps cookie·touch 扩展/脱敏函数族/ATTRIBUTION_MAP/契约预留类型） | — |
| C40 | 代码质量横切 | 项目宪法 + NFR-005 | ✅ | [S][G] 新模块 executor/schema/help/subcommandRisks 四件套同构（工具工厂模式一致：entry/risk/group/subcommandRisks/executor/help）；命名清晰职责单一；错误沿用「✖ 可读中文」风格 + error 英文机器码；helper 复用（unsupportedAttribution/auditCookie/maskValue/redactUrlQuery/translateCapabilityError 而非复制）；异常路径齐全（无注入/权限失败/授权失败/超限各有分支）；预算/截断值经常量（C24）；硬编码抽查零命中 | — |
| C41 | 测试质量横切（断言有效性） | NFR-005 + plan §5.3 | ⚠️ | [T][S] 新模块 *.test.ts 断言强度总体合格（具体值/seq/计数/丢弃数/拒绝路径/掩码位/冻结篡改 throws/还原引用断言，非仅 ok:true）；错误路径与 EC 场景抽样覆盖（EC-001~012 均有对应）；node 注入面用 fake ops/假缝（fakeHub/makeScope shim/真实 EventBus async 包装）而非真实浏览器。注：两处弱断言 —— dialog-tools.test:139 `assert.ok(!join.includes('稍等') || true)` 恒真（哑断言）；audit.test:88/:107 token 无明文断言平凡真（detail 恒不含 token）→ 改进 #5 | 低 |
| C42 | 测试守恒 + 每 FR 断言可查 + FR-004 移交面 | FR-001/004 + AC-010 + D-005 | ✅ | [D][T][B] git diff 无既有测试删除（全部为追加/等价改写，D-005 有据：session.test FULL_NAMES/DERIVE_NAMES 矩阵改写续记）；FR→test 映射抽样齐全（30 FR 全覆盖索引见 review.md §4.1，关键 FR 断言位可查）；FR-004 收口三件套存在 = build.md §5 移交清单（v2/v3 收口人工基线关联表 + 「待基线」标注 + ROADMAP v0.7 同批 F-26 登记实证 v1.10.0 行，F-14 门禁行不变）；「待基线」不阻塞语义标注 | — |

## 3. 审查维度汇总

| 审查维度 | 审查项数 | 通过 | 警告 | 失败 | 通过率 |
|---------|:--:|:--:|:--:|:--:|:--:|
| 代码质量 | 2 | 2 | 0 | 0 | 100% |
| 规范符合性 | 31 | 28 | 3 | 0 | 100%（含警示 90.3% 纯通过） |
| 架构一致性 | 7 | 6 | 1 | 0 | 100%（含警示 85.7% 纯通过） |
| 测试质量 | 2 | 1 | 1 | 0 | 100%（含警示 50% 纯通过） |

## 4. 阻塞问题

无（0 个）—— 架构红线（additive 零回归 / 安全旁路 / 明文泄漏 / EXT 越界）经 [D]/[G] 实证零触碰；无 FR/ADR 缺失或语义偏离到需返工程度。

## 5. 改进建议
> 非阻塞但建议优化的问题（按风险排序）

| # | 位置 | 问题 | 对应 Cx | 建议 |
|---|------|------|:--:|------|
| 1 | events-tools.ts:324-337（summarizeMeta network 分支） | events pull 的网络事件摘要**不呈现 URL**（仅 method/status/耗时；meta.url 存在但未进 output 文本）→ AI 上下文无法区分请求目标，FR-012/AC-004 冒烟断言若走工具输出面会拿不到 URL 断言位 | C22/C28 | network 分支补 `url=redactUrlQuery(meta.url)`（截断 120）——URL 已脱敏，无泄漏面 |
| 2 | event-bus.ts:624-637（deliverTo 合并）+ :488-533（pull 只回 seq>lastId） | 已 pull 的合并尾部被后续 ingest 原地累加 count/lastTs，但后续 pull 恒不回该尾部 → 连续高频抖动流（scroll/mousemove 不停）场景下 AI 拿不到更新计数/末事件时间（EC-002/AC-005 洪峰语义边界） | C23 | pull 时对尾部做「关窗提交」（flush 末批）或返回 tail 变更标记（如 updatedTs）；validate 洪峰冒烟覆盖「窗口内拉取」路径 |
| 3 | platform-events.ts（各观察源 ingest 均不携带 sensitiveDetail） | 事件面 pull-sensitive 通道在真实浏览器**恒无明细供给**（侧库仅在 ingest 携带 sensitiveDetail 时保留，event-bus.ts:581）→ events help/subscribe 文案（events-tools.ts:160/:403 宣称「明细走 pull-sensitive」）承诺悬空 | C16/C20 | 保持零明细细（保守安全），但修正文案为「事件面缺省不保留明文细（cookie read-detail 为唯一明细细通道）」；或将 dialog/console 观察源 trusted 场景接入明细供给 |
| 4 | session.ts:230-231（events subscribe allow 注释/规则） | 注释声称「--sensitive 订阅不在此放行」，但规则按 subcommand=subscribe 全放行（PermissionGate 无 args 粒度）→ sensitive 订阅注册实际免 ask（仅审计标记；下游 write 档 + 零明细双保险，风险低） | C36 | 注释如实标注「subscribe allow 含 --sensitive（审计标记）；明细细受 pull-sensitive write 档门禁」；或 events executor 对 --sensitive 提升 risk/要求场景规则 |
| 5 | dialog-tools.test.ts:139；audit.test.ts:88/:107 | 弱断言：dialog `assert.ok(!join.includes('稍等') || true)` 恒真（哑断言）；audit 无明文断言平凡真（detail 恒不含 token） | C41 | 改为断言真实字段（如 audit 事件 action/decision 具体值；dialog audit 用含 pattern 的 detail 做负向断言） |
| 6 | build.md §1/§3 + 任务描述统计行 | 「新增 base 源 11 + 测试 9 / 修改 base 10」口径与实际不符：实证 = 新源 8（git untracked）+ 新测试 9 + 修改源 8 + 修改测试 6 + lgdl-web 4 + 文档 4（与 plan §6 完全一致） | C01 | 校正统计口径（8 新源/9 新测试/8 改源），避免下游消费（docs/ROADMAP）误读 |
| 7 | AiPanel.tsx:241-276（EventsStatusLine） | 无条件 4s setInterval 轮询 hub.status()（通道关/无订阅亦轮询）——FR-029 呈现满足，但与 NFR-007「默认关零常驻」精神有张力（UI 层开销小，非页面 instrumentation） | C37 | 仅在有 env.events 且（通道开或有订阅）时轮询，否则一次性快照；或改事件驱动刷新 |
| 8 | platform-events.ts:345-362（fetch 拦截应用） | 仅查询参数命中（无 header 动作）时也重建 `new Headers(...)`（小写归一/重复头合并），与页面原始请求头可能有轻微语义差 | C33 | 仅在确有 header/body 改写动作时重建 Headers；纯 query 改写直接改 URL |
| 9 | platform-events.ts:744-765（collectIframeHosts）+ :717-722 | 跨域 iframe contentWindow 属性能见面受限 → 落入「宿主无 alert/confirm/prompt（无法 hook）」冲突文案，非「跨域归属说明」；真实浏览器行为待冒烟确认 | C19 | 区分「不可 hook 原因」：跨域 window 识别后返回归属文案（EC-009/FR-025 同构）；validate 冒烟补真页面含跨域 iframe 场景 |
| 10 | platform-dom.ts:382（PENETRATION_MAX_DEPTH） | 穿透深度护栏为常量（默认 4），FR-023「可配」仅源码级（无按调用/按场景配置入参） | C06 | 如需场景级可配，将 maxDepth 提为 resolver/调用可选参数（缺省常量）；或帮助面明示「护栏常量可源码调」 |

## 6. 结论

**结论**: ⚠️ 有条件通过（PASS with 警示）

| 指标 | 结果 |
|------|------|
| 审查通过率 | 37/42 通过 + 5/42 含警示通过 = 100%（0 失败） |
| 阻塞问题数 | 0 |
| 规范符合性偏差 | 0 项（30 FR / 12 ADR / 8 NFR / 12 EC 全覆盖，无缺失无红线触碰） |
| 可进入 validate | 是 |

**理由**: 四维静态审查（代码质量 / 规范符合性 / 架构一致性 / 测试质量）C01~C42 全项执行：
- **零回归红线全绿**：dom 27 头部注册序 diff=0（仅 tap/swipe/pinch 尾部，enum/数组同步）；v3 全工具（chrome/wait/page-eval/extract/export/collect 等）diff=0 或零推式副作用（grep emit/subscribe/hub=0）；permission.ts/router.ts 本体零 diff；deriveTools 顺序断言不漂移；既有测试零删除。
- **additive 缝规范成立**：events?/clipboardRich? 缝与 PlatformDomOps cookie/touch 全 optional 缺省；nodeEnv 不预置；EC-011 未注入可读转译；browserEnv 装配 env.events（构造零副作用、观察源惰性安装成对还原、默认关零常驻有断言）。
- **安全无旁路**：写面（cookie/net/dialog/events pull-sensitive/clipboard 富）全经 dispatch 五步链 + subcommandRisks 声明 + untrusted 守卫 + 审计；明文 grep 零命中（cookie 值缺省掩码/URL 查询串脱敏/键入无明文值/console·对话框·富剪贴板掩码/审计名掩码）；对话框缺省保守 + 破坏性 deny-accept 护栏成立。
- **push 通道机制完备**：DEFAULT_BUDGETS 单一数据源零硬编码；seq/lastId 增量无重复无遗漏断言；缓冲丢弃计数/4KB 截断标记/摘要 N 预算/合并白名单（仅 4 抖动类）全部有强断言测试；AI 自请求 env.fetch 早期绑定不可见（node 断言 + 构造序实证）。
- **EXT 纪律零漂移**：ATTRIBUTION_MAP 12 能力纯常量/helper（不注册/不进 schema/不接线）；零扩展工程痕迹（实现面 grep 零命中）；package.json 零 diff（含 devDep）；ROADMAP 无 v4 扩展工程承诺。
- 5 个警示（C09 schema 体积对比缺显式断言 / C16+C23 pull-sensitive 明细供给悬空与合并窗口尾部计数边界 / C36 subscribe--sensitive 规则粒度注释不符 / C41 两处弱断言）均为**非阻塞改进项**，建议在 validate 阶段或下一迭代消化（改进 #1/#2 优先）。

**移交 validate（动态验证项，review 静态面不承接）**：真实浏览器冒烟 = AC-002 订阅端到端、AC-003 生命周期+整页导航失效、AC-004 console/network 捕获与 URL 掩码、AC-006 对话框三路 + 护栏（含跨域 iframe 页场景，对应改进 #9）、cookie roundtrip、富剪贴板 roundtrip + 粘贴、穿透定位真实命中、G-01 touchDispatch ops 冒烟、G-02 拦截端到端、洪峰连续流合并计数（对应改进 #2）；FR-004 v2/v3 收口人工基线闭合标注「待基线」；全仓 build/测试复跑复核（build.md §4 GATE 记录的动态复核）。移交清单见 build.md §5。

**提醒（产物注册）**：state.json `files` 尚未登记 `review`（策略文档）与 `reviewReport` 字段 —— 请协调者/状态机登记 `review` → review.md、`reviewReport` → review-report.md（§8.2/8.3 协议）。

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建（R1：C01~C42 全项静态审查；37 通过 + 5 警示 + 0 失败 + 0 阻塞；改进建议 10 条 + validate 移交面 + 产物注册提醒） | 2026-09-08 | SDDU Review Agent |
