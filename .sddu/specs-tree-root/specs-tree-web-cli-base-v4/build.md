# 构建报告：specs-tree-web-cli-base-v4（web-cli-base v4：浏览器外壳纵深与事件流）

> **文档定位**: SDDU 构建报告 — 记录全部任务的文件变更和实现结果，作为 review 阶段的输入
> **前置依赖**: tasks.md（14 任务/9 波次）、plan.md（12 ADR）、spec.md（30 FR / 8 NFR / 12 EC / 10 AC，冻结）
> **创建人**: SDDU Build Agent
> **创建时间**: 2026-09-08
> **版本**: v1.0
> **更新人**: SDDU Build Agent
> **更新时间**: 2026-09-08
> **更新说明**: 初始创建（14 任务 / 9 波次全量实现；G-01/G-02/SHD P2 验证门真实 chromium 实测 PASS；TASK-014 红线校验 + 终收口 GATE 全绿）

## 1. 构建概要
> 本次构建的整体统计（硬约束：additive 零回归、零新增依赖、EXT 组零扩展工程）

| 维度 | 数值 |
|------|:--:|
| 完成任务数 | 14 / 14 |
| 复杂度分布 | S×0 / M×8 / L×6 |
| 新增文件 | base 源 11 + 测试 9 = 20 个（src 面） |
| 修改文件 | base 10 + lgdl-web 4 + 文档 4 ≈ 18 个 |
| 门禁结果 | 全仓 build 零错误；全仓 test 零失败（web-cli-base 471 / lgdl-web 66 / 其余包全绿）；package.json 零 diff |

## 2. 文件变更
> 本次构建涉及的全部文件操作

| 操作 | 文件路径 | 对应任务 | 说明 |
|:--:|------|:--:|------|
| NEW | packages/web-cli-base/src/event-bus.ts | TASK-001 | EventBus 纯逻辑（订阅/缓冲/预算/合并/开关/lastId/审计钩子）+ DEFAULT_BUDGETS 单一数据源 |
| NEW | packages/web-cli-base/src/event-bus.test.ts | TASK-001 | 20 用例（生命周期/丢弃/截断/增量/合并/预算/开关/审计/明细） |
| MODIFY | packages/web-cli-base/src/sensitive.ts | TASK-002 | FR-006 脱敏函数族（redactUrlQuery/isSensitiveHeader/maskHeaderValue/maskTextPayload/maskByMode + 键入/console/对话框/富剪贴板策略常量） |
| MODIFY | packages/web-cli-base/src/sensitive.test.ts | TASK-002 | 函数族 13 用例 |
| MODIFY | packages/web-cli-base/src/audit.ts | TASK-002 | AuditEventType 扩展（subscribe/unsubscribe/event-delivery-summary/dialog/cookie/net-intercept）+ 字段 |
| MODIFY | packages/web-cli-base/src/audit.test.ts | TASK-002 | v4 事件面 4 用例 |
| MODIFY | packages/web-cli-base/src/platform.ts | TASK-003/004/008/011 | PlatformEnv events?/clipboardRich? 缝 + PlatformEventHub 类型面 + PlatformDomOps #26~29 可选方法 + browserEnv 装配 events/clipboardRich |
| MODIFY | packages/web-cli-base/src/platform.test.ts | TASK-003/004 | 缺省/未注入断言 + browserEnv 装配断言 |
| NEW | packages/web-cli-base/src/platform-events.ts | TASK-004/006/008/012 | createBrowserEventHub（domObserve/lifecycle/consolePatch/networkPatch + pasteCapture + dialogOverride + netIntercept；惰性安装零常驻；URL/键入/console 脱敏；AI 自请求不可见 ADR-008） |
| NEW | packages/web-cli-base/src/platform-events.test.ts | TASK-004/012 | 8+1 用例（零副作用/惰性/捕获/键入掩码/lifecycle/console 还原/fetch 观察+AI 自请求/netIntercept 改写） |
| MODIFY | packages/web-cli-base/src/platform-dom.ts | TASK-004/007/009/013 | synthetic 标志 + cookieRead/Write/Delete 真实现 + shadow/iframe 穿透 resolver（深度护栏 4/via）+ touchDispatch（G-01 PASS） |
| NEW | packages/web-cli-base/src/events-tools.ts | TASK-005/010 | events 11 子命令（schema/help/subcommandRisks/审计/归属表） |
| NEW | packages/web-cli-base/src/events-tools.test.ts | TASK-005 | fake hub 全链 + 预算 + pull-sensitive 双闸 |
| NEW | packages/web-cli-base/src/dialog-policy.ts | TASK-006 | 对话框应答策略纯匹配（缺省保守三路 + DESTRUCTIVE_PATTERNS 护栏） |
| NEW | packages/web-cli-base/src/dialog-policy.test.ts | TASK-006 | 三路/护栏/promptText 用例 |
| NEW | packages/web-cli-base/src/dialog-tools.ts | TASK-006/010 | dialog 6 子命令（override-install write ask + policy-add trusted 双闸） |
| NEW | packages/web-cli-base/src/dialog-tools.test.ts | TASK-006 | shim window 全链（缺省保守/trusted accept/卸载还原/router deny 不安装） |
| MODIFY | packages/web-cli-base/src/cookie-tools.ts → NEW | TASK-007/010 | cookie 工具（read/read-detail/write/delete + chrome.cookies 归属 + 审计名掩码） |
| NEW | packages/web-cli-base/src/cookie-tools.test.ts | TASK-007 | fake ops + parseCookieString + 门禁/归属/help |
| MODIFY | packages/web-cli-base/src/clipboard.ts | TASK-008/010 | write-html/write-image/paste-read（ClipboardItem + pasteCapture 槽）+ 归属表 help |
| NEW | packages/web-cli-base/src/clipboard.test.ts | TASK-008 | 富写/图/粘贴读/授权转译/文本零回归 |
| MODIFY | packages/web-cli-base/src/locator.ts | TASK-009 | 帮助面补 shadow/iframe 穿透说明（解析层零改动） |
| MODIFY | packages/web-cli-base/src/locator.test.ts | TASK-009 | 穿透说明断言 + 既有语义回归 |
| NEW | packages/web-cli-base/src/ext-attribution.ts | TASK-010 | ATTRIBUTION_MAP（12 能力）+ unsupportedAttribution + attributionHelpLines（零扩展工程） |
| NEW | packages/web-cli-base/src/ext-attribution.test.ts | TASK-010 | 覆盖/文案/接线/grep 断言 |
| MODIFY | packages/web-cli-base/src/dom-tools.ts | TASK-010/013 | 归属表 help 行 + tap/swipe/pinch 尾部子命令（30 = 27+3，头部零漂移） |
| MODIFY | packages/web-cli-base/src/dom-tools.test.ts | TASK-013 | 30 子命令元数据 + touch 透传用例 |
| MODIFY | packages/web-cli-base/src/net-tools.ts → NEW | TASK-012/010 | net 工具（rule-add/list/remove/intercept-on|off/status + 纯规则引擎 applyNetRules） |
| NEW | packages/web-cli-base/src/net-tools.test.ts | TASK-012 | 引擎命中/动作/trusted + 工具门禁 + router deny |
| MODIFY | packages/web-cli-base/src/index.ts | TASK-011 | v4 导出收口（event-bus/platform-events/events/cookie/dialog/net/clipboardRich/attribution/sensitive 族/类型面） |
| MODIFY | packages/lgdl-web/src/ai/session.ts | TASK-011/012/013 | v4 矩阵（events 默认开 + cookie/dialog/net 默认关）+ LGDL_DEFAULT_POLICY_RULES（观察 allow/cookie deny/net deny/touch deny/override ask）+ eventsSnapshot |
| MODIFY | packages/lgdl-web/src/ai/session.test.ts | TASK-011/012/013 | 矩阵顺序（FULL_NAMES/DISABLED）+ v4 策略断言 |
| MODIFY | packages/lgdl-web/src/ai/AiPanel.tsx | TASK-011 | 事件通道摘要行（FR-029，只读 status 计数，不撑爆上下文） |
| MODIFY | packages/lgdl-web/src/ai/AskDialog.tsx | TASK-011 | 新写面 ask 文案（cookie/override/策略/net/pull-sensitive/富剪贴板） |
| MODIFY | .sddu/specs-tree-root/ROADMAP.md | TASK-014 | v0.7 同批 F-26 登记 + F-14 契约预留继承基线 + v1.10.0 修订 |
| MODIFY | .sddu/specs-tree-root/specs-tree-web-cli-base-v4/state.json | TASK-014 | phase=builded + notes（G 门结论 + validate 移交） |
| MODIFY | .sddu/specs-tree-root/specs-tree-web-cli-base-v4/TREE.md | TASK-014 | build.md 登记 + Phase 5/7 |

## 3. 任务完成清单
> 每个任务的完成状态

| 任务 | 名称 | 复杂度 | 状态 | 对应 FR |
|------|------|:--:|:--:|------|
| TASK-001 | event-bus.ts 事件总线核心（预算常量单一数据源） | M | ✅ completed | FR-008/013/014 |
| TASK-002 | sensitive 脱敏函数族扩展 + audit 审计事件面扩展 | M | ✅ completed | FR-006/007 |
| TASK-003 | platform.ts 新缝类型面 + PlatformDomOps 可选方法 | M | ✅ completed | FR-001/002/005 |
| TASK-004 | platform-events.ts 观察源工厂 + browserEnv 装配 env.events | L | ✅ completed（node 注入面 + 真实浏览器冒烟记录） | FR-003/009~012/015 |
| TASK-005 | events-tools.ts 事件订阅/拉取工具（11 子命令） | L | ✅ completed | FR-008~015 |
| TASK-006 | 对话框 override + 应答策略（dialog-policy/tools） | L | ✅ completed | FR-016/017 |
| TASK-007 | cookie 读/写/删 + cookie-tools | M | ✅ completed | FR-019/020 |
| TASK-008 | 富剪贴板 write-html/write-image/paste-read | M | ✅ completed（roundtrip 冒烟归 validate） | FR-021/022 |
| TASK-009 | shadow/iframe 穿透定位（resolver + via 标注） | M | ✅ completed（真实 chromium SHD 冒烟 PASS） | FR-023 |
| TASK-010 | EXT「不支持 + 归属」统一转译面 + 契约预留 | M | ✅ completed | FR-025/026/027 |
| TASK-011 | lgdl-web 场景接入 + base index 导出收口 | L | ✅ completed（vite build 通过） | FR-028/029/030 |
| TASK-012 | 网络拦截（net-tools + 拦截引擎）— G-02 | L | ✅ completed（**G-02 PASS** → 实现拦截引擎） | FR-018 |
| TASK-013 | 合成 touch 派发（dom tap/swipe/pinch）— G-01 | M | ✅ completed（**G-01 PASS** → 实现 PASS 分支） | FR-024 |
| TASK-014 | 红线校验 + 终收口 GATE（AC-001 专项 + 移交） | L | ✅ completed | FR-001/003/004 + NFR/AC 全量 |

## 4. 验证门与红线结论（真实 chromium）

> 执行环境：linux 无 GUI；**headless chromium（snap）真实可达**（`--headless=new --no-sandbox`）。
> 验证 harness：`/tmp/opencode/cdp-run.mjs`（零依赖 node 原生 fetch + WebSocket CDP 驱动；文档化，非仓库交付）。

| 门 | 验证方式 | 结果 |
|:--:|------|:--:|
| G-01 合成 touch（TASK-013） | 真实 chromium 页：touch 监听元素收到 `new Touch/TouchEvent` 派发序列 | ✅ **PASS**：constructable=true；touchstart/touchmove/touchend 计数各 1 → 实现 touchDispatch + dom tap/swipe/pinch（尾部）+ LGDL deny 默认关 |
| G-02 网络拦截（TASK-012） | 真实 chromium 同 realm 包装 window.fetch（改 header/查询参数）→ 本地 echo 服务器实测 | ✅ **PASS**：echo 收到 `url /probe?token=AAA&__gate=1` + header `x-gate: yes` → 实现拦截引擎 + net 工具 + 共享 instrumentation |
| SHD 穿透（TASK-009 冒烟） | 真实 chromium open shadow + 同源 iframe | ✅ **PASS**：shadow-btn 与 in-frame 均可命中 → resolver 穿透面有效（浏览器级证据） |
| AC-001 红线 | dom 27 头部注册序 / v3 全工具行为 / deriveTools 顺序 | ✅ 零漂移（dom 30 = 27 头 + tap/swipe/pinch 尾，测试断言 30/头 7/尾 3；session FULL_NAMES 断言通过） |
| 纯度/依赖 | base 零 lgdl/react import；package.json 零 diff；零扩展实现（仅契约文案字符串） | ✅ CLEAN |
| 明文 | cookie 值缺省掩码 / URL token 脱敏 / 键入无明文 / console·对话框掩码 / 富剪贴板脱敏 | ✅ 抽样 CLEAN（敏感面 grep 无泄漏路径） |
| 全仓门禁 | `npm run build`（9 包 tsc/vite）零错误；`npm test` 全仓零失败 | ✅ 通过（web-cli-base 471 / lgdl-web 66 / 其余包 8~267 全绿；v2/v3 既有用例零删除零降级） |

## 5. 遗留给 validate 的移交清单（G-01/G-02 结果归档 + 冒烟面）

1. **G-01 / G-02 / SHD 结果归档**：PASS（本文件 §4 + state.json notes）；PASS 分支产物 = touchDispatch/tap·swipe·pinch/net 拦截引擎已实现。
2. **v4 浏览器冒烟面（validate 承接，V13/v3 方法扩展）**：
   - 订阅端到端 AC-002（真实事件 → 缓冲 → pull 增量）；lifecycle AC-003（hashchange/visibilitychange + 整页 reload 失效语义）
   - console/network 观察 AC-004（真实页面 console.error + fetch 捕获；URL token 掩码；AI 自请求不可见）
   - 对话框三路 AC-006（真实页面 alert/confirm/prompt 捕获 + 缺省保守/trusted accept/破坏性 deny-accept）
   - cookie roundtrip（真实同源 cookie：掩码清单 + read-detail trusted 明细 + 写/删回读 + Secure/HttpOnly 转译）
   - 富剪贴板 roundtrip + paste（write-html/write-image 保真 + 用户粘贴读）
   - 穿透定位 read-element/click（open shadow + 同源 iframe via 标注）
   - G-01 touchDispatch 真实 ops 冒烟（可选：harness /tmp/opencode/cdp-run.mjs g1）+ G-02 net 拦截端到端（规则 → 页面 fetch 改写实测）
   - 整页导航订阅失效提示（EC-001）
3. **v2/v3 收口人工基线关联表（FR-004「待基线」不阻塞）**：v2 真实 AI 闭环 AC-008 / lgdl-web React 集成手测 / web-search 真实端点 —— v4 事件/观察类工具验收以其为并行人工基线，未闭合标注「待基线」。
4. 工作区注意事项：验证 harness 在 /tmp（非仓库交付）；chromium 需 `--no-sandbox`（snap 环境）。

## 6. 下一步

| 场景 | 操作 |
|------|------|
| 全部任务已完成 | 运行 `@sddu-review specs-tree-web-cli-base-v4` 开始审查 |

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建（14 任务/9 波次全量实现 + G-01/G-02/SHD 真实 chromium PASS + TASK-014 终收口 GATE 全绿 + validate 移交清单） | 2026-09-08 | SDDU Build Agent |
