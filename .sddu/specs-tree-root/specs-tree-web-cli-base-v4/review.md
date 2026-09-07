# 审查策略：specs-tree-web-cli-base-v4

> **文档定位**: SDDU 审查策略（Feature 级固定产物）— 自主定义 C1~CN 审查清单、判定方法与通过标准；审查执行结果见 review-report.md（build 完成后每轮独立产出，使用 sddu-review-report.md.hbs 模板）
> **前置依赖**: spec.md v1.0（30 FR 十一组 / 8 NFR / 12 EC / 10 AC）+ plan.md v1.0（12 ADR / FR→模块落位表 §3.0 / 文件影响 §6 / 预算默认值口径）+ tasks.md v1.0（14 原子任务 / 9 波次）+ 上游 v2/v3 代码位（`feature/web-cli-base-v2` 分支）
> **创建人**: SDDU Review Agent
> **创建时间**: 2026-09-08
> **版本**: v1.0
> **更新人**: SDDU Review Agent
> **更新时间**: 2026-09-08
> **更新说明**: 初始创建（自主从 spec/plan/代码基线提取审查对象，定义 C01~C42 审查清单，覆盖四维度 + 全部 30 FR / 12 ADR / 8 NFR / 12 EC；风险分级 + 优先级排序 + build 阶段叮嘱）
> **审查语言定位**: 本 Agent 只做**静态分析**（阅读/对比/grep/读测试断言），不运行测试、不调浏览器——动态验证（跑测、冒烟、G-01/G-02 验证门、性能基准）归 validate 与 build 终收 GATE（TASK-014），review 对动态项只核验「记录存在 + 断言完备」，显式标注移交。

---

## 1. 审查目标与范围

### 1.1 审查目标

在 build 完成（tasks.md 全部 `completed`）后，对 v4 实施产物做四维静态审查：**代码质量 / 规范符合性（FR/NFR/EC）/ 架构一致性（12 ADR + plan §6 文件影响）/ 测试质量**，判定是否可进入 validate 动手验证阶段。审查基准 = spec.md + plan.md + v2/v3 既有代码位（本分支基线），产物 = `packages/web-cli-base/src/` + `packages/lgdl-web/src/ai/` 新增/修改文件 + 配套 `*.test.ts`。

### 1.2 v4 重点风险面（本策略聚焦，全部有对应 Cx）

| # | 风险面 | 核心关注 | 主要清单项 |
|---|--------|---------|-----------|
| R-1 | **push 通道正确性**（v4 最大新机制） | 全局 seq + lastId 增量无重复无遗漏；每订阅独立缓冲/游标；合并窗口只限抖动类；投递摘要进上下文、明细走拉取 | C20~C25 |
| R-2 | **additive 零回归**（作者红线） | dom 27 注册序零漂移；v3 全部工具无推式副作用；deriveTools/schema 顺序不漂移；既有测试守恒 | C05/C07~C10/C42 |
| R-3 | **安全门禁无旁路**（O-008） | 新写面 risk/subcommandRisks 全声明；仅经 dispatch 五步链裁决；untrusted 拒执行；evaluate 最高档不变 | C11~C13 |
| R-4 | **敏感/审计脱敏**（FR-006/007） | cookie 值/URL 查询串/header/键入/console·对话框/富剪贴板明文零进出；审计含子命令/裁决来源零明文 | C14~C17 |
| R-5 | **预算护栏**（O-011/ADR-004） | DEFAULT_BUDGETS 单一数据源；全局开关默认关零常驻；缓冲满/超限/洪峰行为可测 | C03/C22~C24 |
| R-6 | **依赖注入缝规范**（FR-002/NG-008） | env.events/clipboardRich 缝与 PlatformDomOps 新方法全可选缺省 undefined；nodeEnv 不预置 + EC-011 转译；机制层零 DOM | C02/C03 |
| R-7 | **EXT 零实现纪律**（裁决 1/O-005） | 扩展线纯文档面：不注册/不进 schema/零扩展工程痕迹/零依赖新增；out 面统一「不支持+归属」转译 | C34/C35/C38 |
| R-8 | **对话框缺省保守**（FR-017/EC-006） | confirm/prompt 缺省 dismiss；DESTRUCTIVE_PATTERNS deny-accept；prompt 值仅 trusted | C18 |

### 1.3 审查对象来源

- **spec.md**：30 FR（BSL/PRM/EVT/DIA/NET/CK/CLP/SHD/TCH/EXT/LGDL 十一组）+ 8 NFR + 12 EC + 10 AC → 逐项核验实现完整性与正确性
- **plan.md**：12 ADR（§8）+ FR→模块落位总表（§3.0）+ 文件影响分析（§6）+ 预算默认值口径（§4.3 表）→ 架构遵循性检查
- **tasks.md**：14 任务/9 波次验收定义 + 终收 GATE（TASK-014）→ 覆盖完整性检查 + build 完成度核对
- **代码基线**：`packages/web-cli-base/src/`（platform.ts / platform-dom.ts / dom-tools.ts / clipboard.ts / chrome-tools.ts / permission.ts / sensitive.ts / audit.ts / router.ts / tools.ts / locator.ts）+ `packages/lgdl-web/src/ai/session.ts`（v3 位，已核实：dom 27 子命令 SUBCOMMANDS 于 dom-tools.ts:92-97、PlatformEnv 缝 platform.ts:423-457 含 `[k:string]:unknown` :456、ToolRisk 六档 permission.ts:34、audit.ts AuditEventType :23-32、LGDL_DEFAULT_POLICY_RULES session.ts:206+、基线程 grep：emit/subscribe=0、cookie=0、base 无 lgdl/react import）
- **build 产物**（审查触发时存在）：新增/修改源文件 + 新增 `*.test.ts` + GATE 记录

### 1.4 审查执行前置（阶段 6/7 门禁）

1. tasks.md 全部任务状态 = `completed`（含 TASK-014 终收 GATE 记录）；
2. build 产物在位（plan §6 文件清单可对照）；
3. 本文档策略获作者确认（§8.1 步骤 1→2 纪律）；
4. 不满足 → 拒绝执行报告产出，提示先运行 `@sddu-build` 完成所有任务。

---

## 2. 审查清单 C01~C42

> 分组：A 架构一致性（C01~C06）/ B 零回归与 additive（C07~C10）/ C 安全门禁与脱敏（C11~C19）/ D push 通道正确性（C20~C29）/ E 页内能力工具面（C30~C35）/ F 场景·纯度·质量（C36~C42）
> 判定方法代号：**[S]** 静态代码走读 / **[G]** grep 断言（0 命中或存在位）/ **[T]** 测试静态核验（读断言，不运行）/ **[B]** build·GATE·验证门记录核验 / **[D]** git diff 基线对比（`feature/web-cli-base-v2` 分支 v3 位）
> 质量门槛（数量基线法）：30 FR 每项 ≥1 个 Cx（覆盖索引见 §4）；四个审查维度每维 ≥1 条（架构 C01~C06 / 规范符合 C07~C38 / 测试质量 C41~C42 / 代码质量 C24·C40）；清单总数 42 ≥ max(30 FR, 4 维度×1)。

### A 组 — 架构一致性（对照 plan §6 文件影响 + 12 ADR）

| # | 审查对象 | 审查基准 | 维度 | 判定方法 | 通过标准 | 风险 |
|---|---------|---------|------|---------|---------|:--:|
| C01 | **文件影响对齐 + 机制分层**：base 新增 8 文件（event-bus/platform-events/events-tools/dialog-tools/dialog-policy/net-tools/cookie-tools/ext-attribution）+ 修改 10+（platform/platform-dom/dom-tools/clipboard/sensitive/audit/locator/index）+ lgdl-web 3 文件（session/AiPanel/AskDialog） | plan §6 文件影响表 + §2.2 分层原则（event-bus 纯逻辑零 DOM import；DOM/window 触碰收敛 platform-dom.ts + platform-events.ts 两文件） | 架构一致性 | [D] [S] | 文件清单与 plan §6 完全对齐，无 plan 外新增源文件（测试文件例外需有据）；event-bus/dialog-policy/sensitive 扩展/locator 无 DOM import；platform-events.ts 确为浏览器实现工厂 | 中 |
| C02 | **缝 additive + 未注入转译**：PlatformEnv 新可选缝 `events?: PlatformEventHub` + `clipboardRich?: PlatformRichClipboard`；PlatformDomOps 新可选方法 cookieRead/cookieWrite/cookieDelete/touchDispatch（#26~#29） | FR-002 + ADR-002/009 + plan §2.4（新缝/方法全可选、缺省 undefined → 编译零破坏；nodeEnv 不预置 → EC-011「通道不可用」可读转译；`[k:string]:unknown` 不滥用） | 架构一致性 | [S] [G] [D] | 新缝/方法声明全部 optional 且缺省 undefined；既有 PlatformEnv/PlatformDomOps 成员零删除零改型；nodeEnv 装配路径无 events/clipboardRich 预置；未注入时 events/cookie/dialog/net 子命令 help/派发呈「未注入」可读态（v2 dom「ops 未注入」语义同构） | 高 |
| C03 | **browserEnv 真实现 + 惰性安装零常驻**：createBrowserEventHub(scope) 真实现（非桩）；构造零副作用；观察源/override/拦截 patch 于首个订阅/首条规则时惰性安装、末退订/末规则还原；无订阅无 listener/patch/轮询；全局通道开关默认关 | FR-003/008/014 + NFR-007 + ADR-002/008 | 架构一致性 | [S] [G] [T] | createBrowserEventHub 构造路径无副作用调用；每观察源安装/卸载成对（grep 还原位存在）；FR-003 各能力面真实现（真实 API 调用，非 throw 桩）；「零开销」单测存在（无订阅基准对比用例）；browserEnv() 装配 events 缝 | 高 |
| C04 | **订阅随文档销毁 + 跨导航语义**：hub 实例 = 当前文档作用域对象；整页导航/reload 后订阅与缓冲随文档销毁 = 天然失效（NG-009 out，无自动续接）；新文档 list() 空态 + help/生命周期明示「订阅已失效需重新 read-state + 重新订阅」；SPA 导航（hashchange/popstate 无整页加载）订阅保持 | FR-010 + EC-001/012 + NG-009 + ADR-002 | 架构一致性 | [S] [D] [G] | 实现作用域语义与 ADR-002 一致（session 每文档重建 env）；v3 reload 默认 ask 路径零改动（chrome-tools/权限规则 diff 无破坏）；失效提示文案可 grep；无跨导航持久化续接代码残留 | 中 |
| C05 | **注册序 additive + 矩阵尾接**：lgdl-web session.ts v4 块尾接既有注册链（P0 → P1 → v3 P1 → v3 P2 → v4 块），内建置末契约保持；全部新能力 = ToolEntry 追加，不重写九域架构 | FR-001/028 + v2 FR-043/v3 FR-001 + plan §2.1/§3.9 | 架构一致性 | [D] [S] [T] | session.ts v4 块纯追加（相对 v3 位）；既有注册块顺序零漂移；注册序断言单测存在（既有块相对序不变 + 新块尾接） | 高 |
| C06 | **共享 resolver 单点穿透**：shadow/iframe 穿透落 platform-dom.ts 共享元素解析 resolver（readElement/find/click/fill/extract 等全经同一路径）；深度护栏默认 ≤4 可配；命中带 `via:'shadow'/'iframe'`；closed shadow/跨域 iframe → 归属转译 | FR-023 + ADR-011 + v3 FR-015 定位语法 | 架构一致性 | [S] [G] | 穿透逻辑单点实现（未在各 dom executor 内各自复制）；主文档 CSS/text= 命中路径零改动；护栏可配；via 标注存在；closed/跨域返回「不支持+归属 content script(all_frames)/CDP」 | 中 |
| C07 | **dom 27 注册序逐字节一致**：SUBCOMMANDS 既有 27 项（v2 头部 7 + v3 20）与 v3 位完全一致；新 touch 子命令仅 enum/数组尾部追加（且 enum 与数组同步） | FR-001 + AC-001 + dom-tools.ts:58-97（v3 基线已核实） | 规范符合性 | [D] [G] | dom-tools.ts diff：既有 27 项（含注释分组）零改动；tap/swipe/pinch 尾部追加且 DomSubcommand 联合类型与 SUBCOMMANDS 数组同步 | 高 |
| C08 | **既有工具零推式副作用**：dom 27 / wait / page-eval / extract / export / chrome / clipboard 文本面无新增 emit/订阅/hub 直连副作用；事件入通道只经观察源（platform-events/event-bus），工具层零直连 | FR-001（验收含「既有工具无新增 emit/订阅副作用 grep 断言」） | 规范符合性 | [G] [D] | 既有工具文件 grep `emit|subscribe|hub.append|dispatchEvent 注入 hub` = 0 命中（基线已核实当前 = 0）；工具层 diff 无事件面接线 | 高 |
| C09 | **deriveTools 顺序 + schema 体积**：新增工具/子命令不使 tool_choice 漂移；禁用工具（矩阵 enabled:false）schema 不含；全量 schema 体积对比 v3 受控 | FR-001 + NFR-003 + AC-001 | 架构一致性 | [T] [D] | deriveTools 顺序断言单测存在且含 v4 块尾接断言；禁用工具不进 schema 断言存在；schema 快照/体积对比位存在 | 中 |
| C10 | **缺省兼容性（无注入面行为）**：新能力缺省（未注入缝/默认关/未注册）时行为与 v3 完全一致；观察类子命令未注入 → 可读错误不中断既有工具 | FR-001/002（缺省兼容断言）+ EC-011 | 规范符合性 | [S] [T] | 每新增工具/子命令缺省路径断言存在；events subscribe 于 events 缝 undefined 时返回可读「通道不可用」而非抛错中断 | 高 |

### B 组 — 零回归与 additive 红线（FR-001 / AC-001）

| # | 审查对象 | 审查基准 | 维度 | 判定方法 | 通过标准 | 风险 |
|---|---------|---------|------|---------|---------|:--:|
| C11 | **写面 risk/subcommandRisks 声明表**：cookie write/delete/read-detail、net 工具、dialog override-install/policy-add、events pull-sensitive/subscribe(--sensitive) 逐一声明 risk 档位 | FR-005 + plan §3.1~3.9 risk 声明 + O-008 | 规范符合性 | [S] [G] | 各写面工具 entry.risk 与子命令级 subcommandRisks 可查；档位 ≥ plan 取向（拦截 deny、明细 write+trusted、override 安装 ask、观察敏感订阅入审计）；无声明漏项；声明与派发裁决一致 | 高 |
| C12 | **门禁无旁路**：新写面全部经既有 dispatch 五步链（enabled → PermissionGate effectiveRisk → delay → executor），deny 先于执行器；无绕过 router 直呼 ops / 页面直执行拦截·override 的旁路路径 | NFR-002 + FR-005 + plan §2.4-5 | 规范符合性 | [S] [D] [G] | permission.ts / router.ts 本体零改动（diff 仅注释级或零）；新工具 ops 调用仅出现于各自 executor 且 executor 经 router 注册派发；grep 无旁路（如 executor 外直接 ops 调用/全局 patch 不经门禁） | 高 |
| C13 | **untrusted 拒执行**：拦截规则 / cookie 写值 / 对话框应答策略与 prompt 文本 / 敏感明细读取 缺省需显式 `--trusted true`；untrusted 来源 → ok:false + 「需 trusted 声明」可读错误 + 入审计；不降级执行、不静默 allow | FR-005/030 + EC-004 + v2 FR-010 语义沿 | 规范符合性 | [S] [T] | 各写面守卫统一 helper 或逐执行器覆盖；untrusted 拒执行三路断言测试存在（拒绝路径断言非弱）；错误文案可读 | 高 |
| C14 | **敏感字段模型函数族扩展**：sensitive.ts 增 redactUrlQuery / isSensitiveHeader+maskHeaderValue / maskTextPayload（key=value/Bearer/token: 启发式）/ 键入与 console·对话框文本策略；掩码/长度占位/类型替代三态沿 v3 maskValue | FR-006 + ADR-006 + v3 FR-024 | 规范符合性 | [S] [D] [T] | 函数族存在且为纯函数（node 可测）；v3 既有表单字段模型/maskValue 语义零回归（既有用例零删除零改断言）；纯函数单测存在 | 高 |
| C15 | **敏感接入点与明文零进出**：cookie 读值缺省掩码；网络 URL 查询串脱敏、敏感头不进事件负载、响应体不读取；键入事件负载不含明文值（key 名+修饰键布尔，敏感目标值掩码）；console/对话框文本脱敏策略可配（缺省保守）；富剪贴板文本同规则；明文 grep 零命中 | FR-006/012/019/011 + NFR-002 + EC-003 | 规范符合性 | [G] [S] | 各源负载构造引用掩码函数；明文 grep（cookie 明文值/token 串/键入明文/authorization 值/Bearer）于实现面与测试面 = 0 命中；掩码位存在 | 高 |
| C16 | **敏感明细 trusted+ask 通道**：明细值获取 = 独立子命令/参数（read-detail、pull-sensitive）+ risk write 档 + 显式 trusted + ask + 决策入审计；普通 read/pull 路径永不返回明文 | FR-006/008/019 + ADR-006（明细纪律） | 规范符合性 | [S] [G] | 明细路径独立且带门禁（非 read/pull 附带参数静默放行）；普通路径无明文序列化；决策审计记录点存在 | 高 |
| C17 | **审计面扩展**：audit.ts AuditEventType 增 subscribe/unsubscribe/event-delivery-summary/dialog/cookie/net-intercept；记录含子命令/来源/裁决来源/计数；写面·拦截·订阅操作可回放；审计负载零敏感明文 | FR-007 + NFR-008 + v2 NFR-009/v3 NFR-008 | 规范符合性 | [S] [D] [T] | AuditEventType 扩展位存在（现 :23-32 五型 → 十型左右）；各新面记录点 grep 可查；审计单测（字段/裁决来源）存在；明文 grep 零命中 | 高 |
| C18 | **对话框应答策略护栏**：dialog-policy.ts 纯模式匹配 node 可测；缺省保守（alert 记录即返回、confirm/prompt 无匹配 → dismiss + 事件 + 审计）；DESTRUCTIVE_PATTERNS（删除/覆盖/清除/提交类中英词元）命中且无显式 trusted accept → 永不自动 accept；prompt 自动输入仅 trusted 规则提供 | FR-017 + EC-005/006 + ADR-007 | 规范符合性 | [S] [T] | 策略三路断言测试存在（缺省保守/trusted accept/破坏性 deny-accept）；无绕过策略直 accept 的代码路径；护栏逻辑在纯逻辑层（node 可测） | 高 |
| C19 | **override 安装可逆与共存**：override-install 保存原引用 → 替换同 realm window.alert/confirm/prompt（含同源 iframe 各自 window；跨域 iframe → 归属说明）→ 卸载还原原生行为；安装前行为零变化回归；与页面既有 polyfill/React 共存冲突返回可读说明；安装 = write risk ask（deny 后不安装） | FR-016 + NFR-004 + ADR-007 | 规范符合性 | [S] [D] [T] | install/uninstall 成对实现；重复安装冲突文案可读；「安装前行为零变化」回归用例存在；跨域 iframe 归属转译 | 中 |

### C 组 — push 通道正确性（EVT 核心，R-02 必做）

| # | 审查对象 | 审查基准 | 维度 | 判定方法 | 通过标准 | 风险 |
|---|---------|---------|------|---------|---------|:--:|
| C20 | **订阅生命周期 API**：subscribe（唯一 subId）/list/unsubscribe/pause/resume/clear 全实现；同一时刻多订阅并发互不干扰（按订阅过滤投递）；订阅注册/撤销走门禁 + 审计钩子 | FR-008 + ADR-002 | 规范符合性 | [S] [T] | event-bus 注册表/缓冲隔离实现正确；生命周期 API 单测全绿定义存在；多订阅隔离用例存在；审计钩子挂点存在 | 高 |
| C21 | **全局 seq + lastId 增量拉取**：hub 入口分配全局单调 seq（跨源总序）；每订阅本地游标；pull{lastId} 返回 seq>lastId 全部事件（无重复无遗漏）；事件以不可变负载入缓冲 | FR-008/013 + ADR-003 + AC-002 | 规范符合性 | [S] [T] | 增量拉取多轮断言单测存在（含空/满/跨合并边界）；seq 分配单调；无拉取侧篡改路径（不可变） | 高 |
| C22 | **缓冲预算/丢弃/截断/投递**：每订阅独立缓冲（默认 200 上限 1000 可配）；满 → 最旧丢弃 + dropped 计数标记（不静默丢计数）；单事件负载 4KB 超限截断 + truncated 标记；投递 = 摘要（最近 N 默认 10）+ 计数 + 「明细可拉取」提示；事件流不整段进工具 output | FR-013 + NFR-003 + EC-002 + ADR-004 | 规范符合性 | [S] [T] [G] | 丢弃计数准确断言；截断标记断言；pull 输出形态 = 摘要+计数（grep 大负载不进 output 断言位存在）；缓冲有界（无 unbounded 数组） | 高 |
| C23 | **抖动合并窗口**：仅 scroll/resize/mousemove/mouseover 可合并；同类型+同目标+窗口内（默认 800ms 可配，0=关）合并为单条 count 事件（含 first/last 时间戳）；其余类型保真不合并 | FR-014 + ADR-003 + EC-002 | 规范符合性 | [S] [T] | 合并白名单精确（其余类型不合并断言）；窗口可配；合并计数/时间戳语义测试存在 | 中 |
| C24 | **预算常量单一数据源（代码质量横切）**：DEFAULT_BUDGETS（缓冲 200/累计 2000/并发 8/速率 200 条/s/窗口 800ms/摘要 N10/负载 4KB）于 event-bus.ts 单点声明；events 工具/各单测引用常量、零硬编码 | FR-014 + ADR-004 预算默认值口径表 + D-001（tasks） | 代码质量 | [S] [G] | DEFAULT_BUDGETS 常量存在且值域与 ADR-004 表一致；工具层/测试 grep 预算数字硬编码 = 0 命中（200/2000/8/800/10/4096 等只出现于常量定义与测试期望） | 中 |
| C25 | **dom observe 落位 + 过滤 + 键入敏感**：dom observe（FR-009）语义 = `events subscribe --kind dom`（帮助面显式别名标注，不新增 dom 子命令）；kind 枚举含 dom/lifecycle/console/network/paste/dialog；订阅级过滤 = 事件类型(csv) ∩ selector(css:/text=) ∩ URL 模式 ∩ level，glob 沿既有语义，过滤在 hub 入口按订阅执行；键入敏感面（keydown/input）负载设计符合 FR-006 | FR-009/015 + ADR-005 + P-04 | 规范符合性 | [S] [G] [T] | kind 枚举与别名文案存在；过滤命中/未命中单测存在；keydown 负载无明文值字段（key 名+修饰键布尔） | 高 |
| C26 | **lifecycle 观察源**：hashchange/popstate（SPA 会话内导航）/visibilitychange/pagehide/beforeunload 挂载于 window/document；只产生事件、不干预 v3 reload 破坏性语义（chrome reload ask 路径零改动）；SPA 订阅保持；list 空态 + 失效提示（EC-001） | FR-010 + plan §2.5 挂载点表 | 规范符合性 | [S] [D] | 监听器类型齐全且与挂载点表一致；监听器添加/移除成对；reload 语义路径零 diff | 中 |
| C27 | **console 观察源**：console.* patch（log/warn/error/info/debug）于首个 console 订阅、末退订还原；捕获不改变页面 console 行为（原输出仍达 DevTools）；早于订阅的既有输出不回溯；事件负载 = level + 脱敏文本摘要 + 时间戳（默认关 stack） | FR-011 + plan §2.5 | 规范符合性 | [S] [T] | patch/unpatch 成对；透传原 console 引用断言存在；文本经脱敏函数（引用 C15 掩码位） | 中 |
| C28 | **network 观察 + AI 自请求默认不可见**：fetch/XHR 单点包装（XHR 经 open/send 双 wrap）记录 method/URL(脱敏)/status/耗时/响应头子集（content-type 等，缺省不含敏感头）；响应体默认不读取；source 标记 page-fetch/xhr；web-fetch 走 env.fetch **早期绑定原生引用**（browserEnv 构造时绑定）→ AI 自请求不入观察流 | FR-012 + ADR-008（公开差异）+ NG-010 | 规范符合性 | [S] [D] [T] | networkPatch 安装点与 ADR-008 一致；早绑定代码位（browserEnv 构造时 env.fetch = 原生引用）可查；无订阅零开销；观察单测含 source 标记与脱敏断言 | 高 |
| C29 | **synthetic 来源标记 + 局限公开**：platform-dom 合成派发辅助（v3 click/type 等路径）dispatchEvent 前置模块级 synthetic 标志 → dom 观察源读标志给事件 `source:'synthetic'`（真实事件缺省 'page'）；help/帮助面公开局限（不升级 isTrusted、同 realm、跨 realm/worker/非 JS 子资源不可达、被 stopImmediatePropagation 吞掉不可承诺） | FR-015 + NG-007 + NFR-004 | 规范符合性 | [S] [G] | 标志埋点（派发侧）与读取（观察侧）成对存在；source 字段进负载；局限声明文案可 grep | 低 |

### D 组 — 页内能力工具面（DIA/NET/CK/CLP/SHD/TCH 实现 + EXT 文档面）

| # | 审查对象 | 审查基准 | 维度 | 判定方法 | 通过标准 | 风险 |
|---|---------|---------|------|---------|---------|:--:|
| C30 | **cookie 工具与 ops**：PlatformDomOps.cookieRead/Write/Delete 真实现（document.cookie 收敛 platform-dom.ts）+ cookie-tools read/read-detail/write/delete；读缺省掩码；写/删 write risk ask + untrusted 拒 + 写后回读断言；Secure/HttpOnly/仅 HTTPS 分类转译（EC-007）；HttpOnly 读/跨域/域级批量 → 归属 chrome.cookies | FR-019/020 + ADR-009 + EC-007 | 规范符合性 | [S] [T] | ops 真实现非桩；read 缺省掩码位存在；write/delete 门禁声明 + untrusted 守卫（引用 C13）；回读断言测试存在；转译/归属文案可读；审计名掩码无明文 | 高 |
| C31 | **富剪贴板/粘贴读**：clipboardRich 新缝（navigator.clipboard.write + ClipboardItem：text/html / image/png / text/plain 并存，与既有文本缝互不覆盖）；clipboard 工具子命令 write-html/write-image/paste-read 尾部追加（文本 read/write 零回归，enum 追加 + 分支追加）；paste 捕获源 = 用户主动粘贴触发（hub paste 槽）；授权失败转译（v3 FR-009 沿）；无手势系统剪贴板读/历史 = 不支持说明；读 ask + FR-006 脱敏 | FR-021/022 + ADR-009 + EC-008 + NG-012 | 规范符合性 | [S] [D] [T] | clipboard.ts diff 仅追加（文本面零改动）；paste-read 依赖 paste 订阅激活语义正确；ClipboardItem 不可用 → 授权转译；文本写既有用例零回归断言存在 | 中 |
| C32 | **合成 touch 验证门（G-01）结果与实现**：G-01 真实 chromium 最小验证记录归档（tasks/build 留痕）；PASS → PlatformDomOps.touchDispatch（TouchEvent 构造序列 touchstart/move/end）+ dom tap/swipe/pinch 尾部追加 + session touch 默认关行 + isTrusted=false 局限公开；FAIL → FR-024 out 记录 + CDP Input.dispatchTouchEvent 归属说明 + **零实现**（dom-tools/ops 无变更） | FR-024 + ADR-010 + Q-013/A-004 | 规范符合性 | [B] [D] [G] | 验证门记录两路其一且与实现状态一致（PASS→有实现；FAIL→grep 零 touchDispatch/tap 实现残留）；降级 out 记录存在于 build/任务注记 | 中 |
| C33 | **net 拦截工具（P2 门禁）**：net-tools rule-add/list/remove + intercept-on/off + status；规则引擎纯逻辑 node 可测（URL 模式匹配 → 发出前增/改 header、查询参数、请求体字段）；net 工具整工具默认关 + risk 缺省 deny + 规则注册显式 trusted；拦截命中全量审计（规则 id + URL 脱敏摘要 + 动作）；响应伪造/缓存篡改/先网络栈/跨 realm 入参 → 不支持+归属（webRequest/DNR/CDP）；与观察共享 instrumentation 不互相干扰 | FR-018 + ADR-008 + 裁决 2 + NG-010 | 规范符合性 | [S] [T] | 改写仅限请求发出前（无响应侧/缓存篡改路径）；引擎单测（URL 匹配/改写动作）存在；deny/trusted 守卫与矩阵默认关断言存在；归属转译文案（C34 接线）| 高 |
| C34 | **EXT「不支持+归属」统一转译面 + 纪律**：ext-attribution.ts ATTRIBUTION_MAP 覆盖全部需扩展/系统级面（多标签/窗口、下载管理、整页截图、HttpOnly/跨域 cookie 与域级、DevTools 全局面网络、跨导航持久订阅、closed shadow、跨域 iframe、浏览器原生对话框、真受信触控、权限模拟、file 真路径注入、C-05 DataTransfer 注入面）；unsupportedAttribution(capability) helper 产出统一文案（v3 chrome-tools fullpage 同构）且各新工具 executor/help 接线；不静默降级/不假装生效/不 catch 吞错；帮助面归属表与 §2.5/NG 表一致；零扩展工程痕迹 grep（chrome.runtime/tabs/downloads/webRequest/manifest/@types/chrome 实现面 = 0）；不触碰 F-14 门禁；ROADMAP 无 v4 扩展工程承诺文案 | FR-025/027 + ADR-001/012 + AC-008 | 规范符合性 | [S] [G] | 归属表条目 ≥ §2.5 🔴 列 + 例外项；out 入参逐项转译断言（每项 ≥1）；grep 零命中；转译接线在 executor 层可查 | 中 |
| C35 | **契约预留文档面（FR-026）**：ATTRIBUTION_MAP 每项含建议契约面（目标工具/子命令建议名、入参语义、返回形态、门禁/敏感面挂点、与页内对应能力的切面关系）；形态 = 类型占位注释 + 常量映射，**不注册工具、不进 schema、不接线**；schema 体积零变化断言 | FR-026 + ADR-012 + plan §3.8 | 规范符合性 | [S] [G] [T] | 映射字段完整；契约预留不参与 deriveTools（schema 体积对比 v3 断言）；无工具注册/无 schema 接线 | 中 |

### E 组 — 场景·纯度·构建·质量（LGDL / NFR / 测试）

| # | 审查对象 | 审查基准 | 维度 | 判定方法 | 通过标准 | 风险 |
|---|---------|---------|------|---------|---------|:--:|
| C36 | **lgdl-web 默认矩阵 + 策略规则**：session.ts v4 块——events/观察（dom/lifecycle/console/network 订阅与拉取）默认开（观察只读免 ask，IMP-4 沿）；dialog override 默认关；cookie/net 默认关；clipboard 富子命令默认开（既有权限沿）；dom touch 默认关（P2）；LGDL_DEFAULT_POLICY_RULES 增 cookie write/delete + net deny（或 ask，不可静默 allow）、dialog 自动 accept deny、override-install ask、观察只读 allow 前置规则（置于既有 ask 规则前）；场景覆盖取向不可低于 ask | FR-028/030 + plan §3.9 | 规范符合性 | [D] [S] [T] | 矩阵默认开/关与 FR-028 表逐项一致；策略规则条文案/顺序正确（allow 前置、deny 兜底）；矩阵单测断言存在（启用集 → schema 一致 + 默认关工具 schema 不含/help 标注/派发禁用可读） | 高 |
| C37 | **场景 UI 呈现 + base 零 UI**：AiPanel 事件摘要区（事件计数/摘要/拉取入口 + 订阅状态/预算水位/自动退订提示，hub.status/pull 为数据源）；AskDialog 新写面 ask 文案（cookie 写/删、拦截规则、对话框策略注册 + 规则摘要，v3 FR-044 onAsk 契约沿）；**base 只提供只读状态/事件面，无 UI 代码** | FR-029 + plan §3.9 + NG-008（base 零 UI） | 规范符合性 | [S] [G] | lgdl-web UI 呈现接入点存在（事件区/订阅状态/新写面 ask 文案）；base grep React/JSX/UI 代码 = 0 命中 | 低 |
| C38 | **base 纯度 + 零新增依赖**：base 新增/修改文件零 lgdl/react/业务 import；package.json 依赖图谱（含 devDep）零新增（不增 @types/chrome 等扩展依赖）；node 面无 OS 专用运行时依赖 | NFR-001 + AC-010 + FR-027/O-010 | 规范符合性 | [G] [D] | base 全文件 grep `from 'lgdl|from 'react|require('react')` = 0 命中（基线已核实当前 = 0）；package.json diff = 0 变化；零扩展 API import | 高 |
| C39 | **构建与类型完整性**：全仓 tsc / vite build 零错误（GATE 记录）；base index.ts 导出面追加新能力类型（PlatformEventHub/订阅类型/写面 risk 类型/脱敏函数族/attribution 常量/契约预留占位类型）且既有导出零删除 | NFR-006 + FR-003 + plan §2.4-6 | 规范符合性 | [B] [D] | build GATE 记录零错误（跑测结果留 validate 复核）；index.ts diff 纯追加（现 ~101 导出零删除）；导出面覆盖 plan §2.4-6 清单 | 中 |
| C40 | **代码质量横切**（新模块通用）：executor/schema/help/subcommandRisks 模块同构（工具工厂模式一致）；命名清晰、职责单一、错误可读（沿用既有中文「✖ …可读错误」风格）；无重复逻辑（unsupportedAttribution/guard/redact/脱敏 helper 复用而非复制）；异常路径覆盖（权限失败/授权失败/无注入/超限各有分支）；无魔法数字/硬编码字符串残留（预算值见 C24） | 项目宪法 + v2/v3 编码规范 + NFR-005 | 代码质量 | [S] [G] | 同构模式一致；helper 复用而非复制（grep 重复实现 = 低）；错误分支齐全；硬编码抽查零命中 | 中 |
| C41 | **测试质量横切（断言有效性）**：新模块 *.test.ts 断言非弱断言（具体值/计数/拒绝路径/掩码位断言，非仅 ok:true）；覆盖错误路径与 EC 场景（EC-001~012 抽样）；node 注入面用 fake ops/假缝（faker env/hub）而非真实浏览器 | NFR-005 + plan §5.3 测试策略 | 测试质量 | [T] [S] | 每新模块测试文件断言强度抽样 ≥ 合格线；错误路径用例存在；fake 注入面用例存在（非仅真实环境用例） | 中 |
| C42 | **测试守恒 + 每 FR 断言可查 + FR-004 移交面**：既有测试文件零删除零降级（D-005：删除行 = 0 或逐条有据）；每 FR ≥1 断言用例可查（FR→test 映射）；FR-004 收口移交面存在——v2/v3 收口人工基线关联表 + FR 验收「待基线」标注清单 + ROADMAP v0.7 同批登记（FR-004/027） | FR-001/004 + AC-010 + D-005（tasks） | 测试质量 | [D] [T] [B] | diff 无既有测试删除/降级；抽样 FR→test 映射齐全；FR-004 三件套文件/记录存在（人工基线闭合本身 = validate 移交，review 只核存在性） | 中 |

---

## 3. 判定方法与执行约束

### 3.1 方法图例

| 代号 | 方法 | 说明（review = 静态分析，不执行） |
|------|------|------|
| S | 静态代码走读 | 阅读实现，评估正确性/职责/错误处理/可读性 |
| G | grep 断言 | 0 命中类（无旁路/无明文/无扩展痕迹/无副作用）或存在位类（掩码位/审计点/还原位/文案） |
| T | 测试静态核验 | 读测试文件：断言存在性、覆盖路径、断言强度；**不运行** |
| B | build/GATE/验证门记录核验 | 读 tasks 完成记录、TASK-014 终收 GATE 产物、G-01/G-02 验证门归档；动态结果复核归 validate |
| D | git diff 基线对比 | 以 `feature/web-cli-base-v2` 分支 v3 代码位为基线做 diff（零改动/纯追加判定） |

### 3.2 通过标准（§6 门禁，执行阶段适用）

| 条件 | 要求 | 说明 |
|------|------|------|
| 阻塞问题 | 0 个 | 规范符合率 < 100%（任一 FR/ADR 缺失或语义偏离）或架构红线（additive 零回归/安全旁路/明文泄漏/EXT 越界）→ FAIL |
| 改进项 | < 5 个 | 非阻塞优化建议计数 |
| 结论 | ✅ 通过 / ⚠️ 有条件通过 / ❌ 不通过 | 见结论类型 |

**无法静态判定项**：真实浏览器行为（订阅真事件命中/对话框三路/override 共存/富剪贴板 roundtrip/穿透定位/touch G-01/拦截 G-02/cookie 真读写/性能基准）由 validate 冒烟面承接——review 只核验「node 注入面断言完备 + 冒烟清单移交记录存在」，报告中显式标注「动态验证 → validate」。FR-004 人工基线闭合同理标注「待基线」。

---

## 4. FR / ADR / NFR / EC 覆盖索引

### 4.1 FR → Cx（30 FR 全覆盖）

| FR | Cx | FR | Cx | FR | Cx |
|----|----|----|----|----|----|
| FR-001 | C05/C07~C10/C42 | FR-011 | C27 | FR-021 | C31 |
| FR-002 | C02/C03/C10 | FR-012 | C28 | FR-022 | C31 |
| FR-003 | C02/C03/C39 | FR-013 | C21/C22 | FR-023 | C06 |
| FR-004 | C42 | FR-014 | C03/C23/C24 | FR-024 | C32 |
| FR-005 | C11~C13 | FR-015 | C25/C29 | FR-025 | C34 |
| FR-006 | C14~C16 | FR-016 | C19 | FR-026 | C35 |
| FR-007 | C17 | FR-017 | C18 | FR-027 | C34/C38 |
| FR-008 | C20~C22/C16 | FR-018 | C33/C28 | FR-028 | C05/C36 |
| FR-009 | C25 | FR-019 | C30/C15/C16 | FR-029 | C37 |
| FR-010 | C04/C26 | FR-020 | C30/C13 | FR-030 | C36/C13 |

### 4.2 ADR → Cx（12 ADR 全覆盖）

ADR-001→C34 · ADR-002→C02/C04/C20 · ADR-003→C21/C23 · ADR-004→C24 · ADR-005→C25 · ADR-006→C14 · ADR-007→C18/C19 · ADR-008→C28/C33 · ADR-009→C30/C31 · ADR-010→C32 · ADR-011→C06 · ADR-012→C34/C35

### 4.3 NFR / EC → Cx

- NFR-001→C38 · NFR-002→C11~C17 · NFR-003→C09/C22/C24 · NFR-004→C19/C29/C31 · NFR-005→C41/C42 · NFR-006→C39 · NFR-007→C03 · NFR-008→C17
- EC-001/012→C04/C21 · EC-002→C22/C23 · EC-003→C15 · EC-004→C13 · EC-005/006→C18 · EC-007→C30 · EC-008→C31 · EC-009/010→C34 · EC-011→C02/C10

---

## 5. 风险分级与优先级

### 5.1 分级统计

| 级别 | 项数 | 清单项 | 判级逻辑（概率 × 影响） |
|------|:--:|------|------|
| **高** | 19 | C02/C03/C05/C07/C08/C10/C11/C12/C13/C14/C15/C16/C17/C18/C20/C21/C22/C25/C28/C30/C33/C36/C38 | 命中即触碰红线（安全旁路/明文泄漏/additive 破坏/通道错乱/依赖漂移），或影响面 = 全工具面/全会话 |
| **中** | 16 | C01/C04/C06/C09/C19/C23/C26/C27/C31/C32/C34/C35/C39/C40/C41/C42 | 偏离可检出可修复，或影响限于单能力面 |
| **低** | 3 | C24/C29/C37 | 违约代价低或有验证门兜底 |

（注：C32 touch 判中——G-01 验证门已约束失败面；C24 判低——硬编码易检出。）

### 5.2 风险面排序（对 build/validate 的优先级指引）

| 序 | 风险面 | 级别 | 依据 | 关联 Cx |
|----|--------|:--:|------|---------|
| P1 | **安全门禁无旁路 + 敏感/审计脱敏** | 高 | 凭据面泄漏/误确认/拦截误改 = 作者 US-004 最高关切（O-008）；泄漏即不可逆 | C11~C17 |
| P2 | **additive 零回归** | 高 | 作者红线（FR-001/AC-001）：v2 46 FR + v3 45 FR 行为破坏 = 整 Feature 返工 | C05/C07~C10/C42 |
| P3 | **push 通道正确性** | 高 | v4 最大新机制（R-02 必做）：seq/lastId/缓冲错误 = 事件驱动场景数据错漏，AC-002/005 验收不可达 | C20~C24 |
| P4 | **依赖注入缝规范 + 惰性安装零常驻** | 高 | 缝违规 = 编译破坏/平台面语义错位；常驻泄漏 = NFR-007 验收失败 | C02/C03 |
| P5 | **对话框缺省保守应答** | 高 | 误确认 = 真实破坏（EC-006）；护栏绕过 = 安全事故 | C18/C19 |
| P6 | **预算护栏** | 中 | 洪峰撑爆上下文/内存无界 = NFR-003/007 风险（有合并/预算双保险缓解） | C22~C24 |
| P7 | **EXT 零实现纪律** | 中 | 纪律漂移（注册/接线/依赖）即抢跑 F-14（NG-002），影响发布边界非运行安全 | C34/C35/C38 |
| P8 | **质量门槛（构建/测试/守恒）** | 中 | tsc/测试失败或既有测试降级 = 门禁不过，阻断 validate | C39/C41/C42 |

---

## 6. 对 build 阶段的重点叮嘱（供实施校正 + validate 移交）

1. **文件所有权与串行追加纪律**（防并行冲突）：platform-events.ts（TASK-004→006→008→012 跨波次增量）、platform-dom.ts（004→007→009→013）、platform.ts（003→004→008）、session.ts（011→012/013）须按 tasks 依赖图顺序追加，不跨任务并行改同文件；**不新增 plan §6 外源文件**（测试文件例外需注记）。
2. **dom/clipboard 追加仅尾部**：dom-tools SUBCOMMANDS 既有 27 项逐字节不动（v2 头部 7 + v3 20），tap/swipe/pinch 仅尾部且 enum/数组/help/executor/subcommandRisks 四同步；clipboard read/write 文本面零改动，write-html/write-image/paste-read 尾部追加。
3. **DEFAULT_BUDGETS 先行 + 零硬编码**（D-001/TASK-001）：常量于 event-bus.ts 单点声明后再写工具与测试；工具/测试只引用常量，不允许散落 200/2000/8/800/10/4096 字面量。
4. **写面先声明后实现**：每个新写面（cookie write/delete/read-detail、net、dialog override-install/policy-add、pull-sensitive、sensitive 订阅）先落 risk/subcommandRisks 声明与 untrusted 守卫，再写 executor；只经 router dispatch 五步链，**不得在工具外直呼 ops/patch**；permission.ts/router.ts 本体保持零改动。
5. **敏感明文红线自查**（每任务）：cookie 明文值 / URL 查询串 token / 键入明文值 / authorization 等 header 值 / 富剪贴板敏感文本——实现面与测试面均不得以明文落负载/审计/日志/断言；一律经 sensitive.ts 掩码函数族；明细仅 read-detail/pull-sensitive trusted+ask 通道。
6. **platform-events 源成对安装/还原**：每个 patch（console/fetch/XHR/override/dom 监听）首装末卸成对，防监听器/patch 泄漏常驻（NFR-007 基准断言依赖此）；fetch/XHR 包装透传原引用；AI 自请求 env.fetch 早期绑定须在 browserEnv 构造时完成（勿后装）。
7. **EXT 纪律**：ATTRIBUTION_MAP/契约预留 = 常量 + 注释 + helper，**不注册工具、不进 schema、不接线**；不引入 @types/chrome 等扩展 devDep；转译文案与 v3 chrome-tools fullpage（chrome-tools.ts:303-310）同构；帮助面归属表与 spec §2.5/NG 表一致。
8. **矩阵与规则序**：session.ts v4 块尾接既有注册链；默认开/关与 FR-028 表一致（观察默认开、override/cookie/net 默认关、富剪贴板默认开、touch 默认关）；LGDL_DEFAULT_POLICY_RULES 规则序 = 观察只读 allow 前置 → 写面 deny/ask 兜底，取向不可低于 ask；新增规则带 note 文案。
9. **G-01/G-02 验证门留痕**：touch（TASK-013）与拦截（TASK-012）的验证结果如实归档（PASS 保留实现 / FAIL 降级 out 记录），review 与 validate 依记录判定；失败降级须走 v3 S-02 出口（out 记录 + CDP/归属说明），不得静默留半成品。
10. **TASK-014 终收 GATE 产物齐备**（review-report 直接消费）：grep 断言清单（明文/副作用/扩展痕迹/纯度）、依赖图谱零新增核验、schema 体积对比、冒烟清单扩展（V13/v3→v4）、FR-004 收口基线关联表 + 「待基线」标注清单、ROADMAP v0.7 同批登记——缺记录项按「待 validate」标注而非默认通过。
11. **每任务缺省兼容断言**：新增能力缺省（缝未注入/默认关/未注册）时行为与 v3 完全一致（FR-001 缺省兼容）——随任务断言，勿只留到 TASK-014。
12. **review 执行时机**：本策略就绪且获作者确认后，待 build 全部任务 completed 再触发审查报告（review-report.md）；G-01/G-02 等真实浏览器项由 validate 冒烟复核。

---

## 7. 报告执行约定（衔接 §8.1/8.3）

- 审查执行（build 后）每轮产出/更新 **review-report.md**（路径 `.sddu/specs-tree-root/specs-tree-web-cli-base-v4/review-report.md`，模板 sddu-review-report.md.hbs），逐项 C01~C42 评估（审查对象/基准/评估/发现/严重程度）+ 维度汇总 + 阻塞问题 + 改进建议 + 结论（✅/⚠️/❌）。
- 策略文档（本文件）不变时报告可多轮迭代（R1/R2…）；报告产出后经状态机更新 state.json `files.reviewReport`，并核对 `files.review` 是否指向本文件（未注册则提醒作者手动登记文件关联）。
- 报告结论 = ❌ 不通过（阻塞）→ 交回 build 修复后重审；⚠️ 有条件通过 / ✅ 通过 → 交 `@sddu-validate` 动手验证。

---

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建：v4 审查策略——自主从 spec v1.0（30 FR/8 NFR/12 EC/10 AC）+ plan v1.0（12 ADR/落位表/文件影响/预算口径）+ v3 代码基线（dom-tools.ts:58-97 等实锚）提取审查对象；C01~C42 审查清单（A 架构 6 / B 零回归 4 / C 安全 9 / D 通道 10 / E 工具面 6 / F 场景·质量 7）；每项含维度/判定方法/通过标准/风险级；FR/ADR/NFR/EC 全覆盖索引；风险分级（高 19/中 16/低 3）+ 风险面排序 P1~P8；对 build 12 条叮嘱 | 2026-09-08 | SDDU Review Agent |
