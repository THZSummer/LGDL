# 核心引擎 — web-cli-base 浏览器 Agent 谱系（F-23 → v2 → v3 → v4）

> **文档定位**: sddu-docs-feature-lineage — Feature 产物聚合：web-cli-base（浏览器生态位 AI-CLI 框架）四代演进的业务/技术全景。聚合 specs-tree-root 下 framework / v2 / v3 / v4 四个 Feature 目录的 discovery/spec/plan/tasks/review/validate 产物，不做代码级扫描，不替代根级「系统架构/CLI 架构全景」代码视角
> **输出文件名**: web-cli-base浏览器Agent谱系.md
> **数据来源**: Feature 产物聚合（`.sddu/specs-tree-root/specs-tree-web-cli-base-{framework,v2,v3,v4}/` 的 state.json + spec.md/plan.md/review-report.md/validate-report.md）+ ROADMAP.md v1.9.0/v1.10.0 版本登记
> **创建时间**: 2026-09-08
> **生成方式**: 增量更新（Feature 产物聚合模式①）
> **聚合口径**: What 层（已实施工程验证：phase=validated 的 build/review/validate 报告数字）；v4 以 validate-report.md v1.0（2026-09-08 04:53）结论为准

---

## 1. 谱系概述

web-cli-base 是 LGDL monorepo 中的**领域中立纯机制框架**（`@lgdl/web-cli-base`，零 @lgdl/* 依赖），自 v0.6 起沿四条 Feature 迭代演进，从「机制壳 + 5 工具」成长为**面向浏览器生态位的完整 AI Agent 框架**：

| 迭代 | Feature 目录 | ROADMAP | 版本位 | 阶段 | 主题 |
|------|-------------|---------|--------|------|------|
| **F-23** | specs-tree-web-cli-base-framework | F-23 | v0.6.0（已随 2026-09-05 发布） | ✅ validated | 框架化：CommandRouter 路由下沉 + AgentRunner 上收 + DelayGate + 注册收敛（bash 类比） |
| **v2（F-25）** | specs-tree-web-cli-base-v2 | F-25 | v0.7.0（同批第一 Feature） | ✅ validated | 面向浏览器生态位的 agent 能力完备化：九域浏览器原生工具集 + 权限门禁三者组合 |
| **v3** | specs-tree-web-cli-base-v3 | —（v0.7 第二 Feature） | v0.7.0（同批第二 Feature） | ✅ validated | AI 操作浏览器完整工具集：五层全谱补齐 + 子命令级 risk + 独立 evaluate |
| **v4** | specs-tree-web-cli-base-v4 | F-26 | v0.7.0（同批第三 Feature） | ✅ validated（见 §6 异常标注） | 浏览器外壳纵深与事件流：push/订阅通道 + 页内可达切面 + 扩展线分界与契约预留 |

> **作者裁决的演进公理（贯穿 v2~v4）**：
> - 定位：**web-cli-base = AI 帮人类操作浏览器**（对偶于 OS agent 操作操作系统）——面向**浏览器原生组成**（DOM/存储/Web API/Worker/fetch/Permissions）做生态位对应设计，不照搬 OS 工具语义（read/write/bash/grep）。
> - 分界：OS 生态位能力不做（高内聚守职责边界，代理给未来 os-cli-base）；跨域/第三方站点与浏览器外壳能力（标签/窗口/下载/整页截图等）不做扩展工程，只契约预留（归 F-14/v1.1）。
> - v2/v3/v4 同分支 **feature/web-cli-base-v2** 叠加开发，**未合入 main / 未发布**，v0.7.0 收口发布待作者执行。

---

## 2. Feature 全景索引（阶段状态 / 版本脉络 / ROADMAP 关联）

| Feature（目录） | phase | workflow | 最后产物 | spec 规模 | 验证基线 | 产物完整性 | 版本位 / ROADMAP |
|----------------|:--:|---------|----------|-----------|----------|:--:|------------------|
| **specs-tree-web-cli-base-framework** | validated | 7.validate | 2026-09-05 | 机制四件套（router/runner/delay/注册收敛） | 全仓 582 pass / 0 fail / 1 skip（web-cli-base 71→73） | ✅ 全套 | v0.6.0 已发布；ROADMAP F-23 ✅ |
| **specs-tree-web-cli-base-v2** | validated | 7.validate | 2026-09-06 | 46 FR 十三组 / 10 NFR / 15 EC / 12 AC | 全仓 724 pass / 0 fail / 1 skip（base 205） | ✅ 全套（含 build.md） | v0.7.0（同批第一）；ROADMAP F-25 📋 待合入 |
| **specs-tree-web-cli-base-v3** | validated | 7.validate | 2026-09-07 | 45 FR 九组 / 8 NFR / 14 EC / 12 AC | 全仓 898 pass / 1 skip / 0 fail（base 372 + lgdl-web 58） | ✅ 全套 | v0.7.0（同批第二）；ROADMAP v1.10.0 登记 |
| **specs-tree-web-cli-base-v4** | validated（state.json 滞后 builded，见 §6） | 7.validate（产物）/ 5.build（state） | 2026-09-08 | 30 FR 十一组 / 8 NFR / 12 EC / 10 AC | 全仓 **1007 pass / 1 skip / 0 fail**（base 473 + lgdl-web 66） | ✅ 全套（discovery/spec/plan/tasks/build/review/validate） | v0.7.0（同批第三，作者裁决 O-012）；ROADMAP F-26 📋（build 阶段登记，待 @sddu-roadmap 升 validated） |

**产物完整性说明**：四个 Feature 的 spec.md / plan.md / tasks.md / tasks.json / review.md / review-report.md / validate.md / validate-report.md 均齐备；framework/v2/v3/v4 另含 build.md（v2 起 build 阶段纳入 artifacts）。

---

## 3. 版本脉络（v0.6 → v0.7 同批叠加）

```
v0.6.0（2026-09-05 已发布）
└── F-23 web-cli-base 框架化（CommandRouter/AgentRunner/DelayGate + 注册收敛）
        · bash 类比：完整自足的 AI-CLI 环境（shell 路由 + 内建命令 + 可注册业务命令）
        · CommandRouter 统一注册表 → dispatch/deriveTools/deriveCommand/help 单一数据源
        · 未知工具显式报错（去静默兜底）；延迟门禁 DelayGate；AgentRunner 中性 agent 循环（零 react）
        · lgdl-web 收敛为单一组装点 session.ts（delayMs=600）
        · 发布后 web-cli-base 自带 5 工具：lgdl-web-cli / lgdl-web-op-cli 注册 + web-fetch/sleep/help 内建

v0.7.0（作者裁决 2026-09-06：最近的独立版本；同分支 feature/web-cli-base-v2 叠加，未发布）
├── 第一 Feature v2（F-25，validated 2026-09-06）
│       · 方向公理（D-5）：面向浏览器生态位设计工具集，不照搬 OS 工具集
│       · 九域工具集（DOC 内容/STR 存储/SRC 检索/NET 网络/DOM/EXE 执行/TSK 任务/SES 会话/EXT 扩展）
│       · 权限门禁三者组合：opencode 三元组骨架 + dsh 可插拔策略 + WorkBuddy allowed-tools
│       · 机制：CommandRouter v2 注册表（group/namespace/enabled/risk）+ PermissionGate + AuditSink
│       · 会话持久化（IDB+OPFS 双载体）+ jobs 后台作业 + subagent 子会话预留
│       · 全仓 724 pass / 0 fail / 1 skip；遗留移交人工清单（真实浏览器/AI 闭环/web-search key 等）
├── 第二 Feature v3（validated 2026-09-07）
│       · 定位：AI 操作浏览器完整工具集——人类操作浏览器场景为纲全面查缺补漏
│       · 五层全谱：感知层（结构化 DOM 读取/元素属性·文本·样式·几何）/ 交互层（click/hover/scroll/
│         zoom/fullscreen 补真 + 长按/双击/右键/拖放/focus/type·press 键盘）/ chrome 操作（截图/打印/
│         刷新导航）/ 读写层（改文字/表单/增删元素/evaluate）/ 采集层（extract/翻页/导出 text·json·csv）
│       · 子命令级权限 risk（只读免 ask、写/敏感走 ask/deny）；独立 evaluate 工具（最高档 default deny）
│       · dom 7→27 子命令 + chrome/wait/page-eval/extract/export 五新工具；真实浏览器双轨冒烟
│       · 全仓 898 pass / 1 skip / 0 fail；AC-008 真实 AI 闭环（DeepSeek）已闭合
└── 第三 Feature v4（F-26，validated 2026-09-08）★ 本次重点
        · 浏览器外壳纵深 + 事件流——详见 §4
```

**ROADMAP 版本位关键事实**：v0.7.0 = v2（F-25）+ v3 + v4（F-26）**三个 Feature 同批**（v4 = 第三个，作者裁决 O-012）；原 v0.7 工程质量内容后移为 v0.8.0。代码全部在 `feature/web-cli-base-v2`，未合入 main；发布动作由作者执行（时间不承诺）。

---

## 4. v4 纵深聚合（specs-tree-web-cli-base-v4，★ 本次全景重点纳入）

### 4.1 定位与范围裁决

**Feature**：web-cli-base v4 — 浏览器外壳纵深与事件流（11 项能力缺口整体排查 + 实现载体分层）。立项 = 作者 2026-09-07，上游 v2/v3 同分支基线。

**关键裁决（作者 2026-09-07，spec/plan 红线输入）**：

| 裁决 | 内容 | 落点 |
|------|------|------|
| **裁决 1（最重要）** | v4 范围判定标准统一 = **「是否依赖浏览器扩展」**：页内可达（不依赖扩展）→ 全实现；依赖浏览器扩展 → 只「契约预留 + 不支持转译」，不实现扩展工程 | ADR-001（载体判据）；页内组 EVT/DIA/CK/CLP/SHD/TCH 实现，EXT 组文档面 |
| 裁决 2 | 网络请求拦截（发出前修改）以 **P2 门禁**入 v4，缺省 deny | FR-018 / ADR-007/008 |
| 裁决 3 | 合成 touch 以**最小浏览器验证门**入 P2（失败降级 out + CDP 归属） | FR-024 / ADR-010；G-01 实测 PASS |
| 裁决 4 | 权限模拟（geolocation/camera/mic）整项 **out**（页内假 API 注入 = 欺骗注入不允许） | FR-025 归属转译 |
| O-012 | v4 = v0.7 内第三个 Feature，同批发布 | ROADMAP F-26 登记 |
| O-006 | NG-003/NG-004（标签·窗口·下载/整页截图/DataTransfer 文件）保持 out，仅契约预留 | ADR-001/012 |

**载体分层表**（discovery 关键产出，按切面而非能力划分）：🟢 网页内可达（C-07 富剪贴板）/ 🔴 需扩展（C-02 多标签窗口、C-10 下载）/ 🟡 分层体（C-01 事件观察、C-03 对话框、C-04 网络、C-06 cookie、C-08 touch、C-09 shadow·iframe）/ 🟠 待定后裁（C-05 file input → out、C-11 权限模拟 → out）。

### 4.2 核心能力（30 FR 十一组，全谱实现）

**① EVT 事件 push/订阅通道（本 Feature 结构性核心，v3 前不可表达）**
- `event-bus.ts` 事件总线：订阅注册表 / 独立缓冲 / **lastId 增量拉取**（无重复无遗漏）/ 去重·合并窗口（抖动类 800ms，count 计数）/ 每订阅+全局预算 / 自动暂停 / 全局开关（默认关、无订阅零常驻 NFR-007）/ 失效语义
- `env.events` PlatformEnv 新可选缝 + `events` 工具 11 子命令（subscribe/pull/status/switch…）+ `platform-events.ts` 浏览器观察源工厂（真实浏览器）
- 观察面：dom observe（真实 click source=**page** vs dom 合成 source=**synthetic** 来源标记；键入敏感脱敏——无明文）、console 观察、网络观察（fetch/XHR，URL token 掩码）、生命周期（hashchange/popstate/visibilitychange + **整页导航/reload 订阅失效语义**：ask deny 不刷新订阅存活 / allow 真导航新文档空订阅、旧 id 可读失效）
- **ADR-008 隐私纪律**：AI 自请求默认不可见（env.fetch 构造期绑定原生引用，不进观察流）——真实浏览器实证

**② 页内快赢切面（分层体页内可达部分全实现）**
- **DIA 对话框 override**：同 realm 捕获 alert/confirm/prompt（引用替换可逆 uninstall）；缺省保守应答 + trusted accept 规则 + **破坏性 deny-accept 护栏**（「确认删除…?」无 trusted 规则 → 自动拒绝）；promptText 自动输入；事件入通道 + 审计
- **CK cookie**：read 缺省掩码 → read-detail trusted+ask 明文双通道；write/delete 门禁三路（untrusted 拒 / LGDL router deny / ask allow·deny 实测写后回读）；审计零明文
- **CLP 富剪贴板/粘贴读**：ClipboardItem 富写（text/html、image/png 字节保真 roundtrip）；paste 捕获槽（DataTransfer 富内容 + 文件项元数据 hasFiles）；文本零回归；权限 reset 后 NotAllowed 可读转译
- **SHD shadow/iframe 穿透定位**：共享 resolver 增强——open shadow ×2 / 同源 iframe / 深度护栏 4 层 / via 标注；closed shadow + 跨域 iframe → 归属文案（content script / F-14）
- **TCH 合成 touch**（P2 验证门 G-01 PASS）：dom tap/swipe/pinch 子命令 → TouchEvent 构造序列真实派发（touchstart/move/end 命中）；局限公开（isTrusted=false / 目标不处理 → page-eval 备用）
- **NET 网络拦截改写**（P2，缺省 deny）：与观察共享同 realm fetch/XHR 单点 instrumentation；规则 op 六元操作（addHeader/setHeader/removeHeader/addQuery/setQuery/removeQuery/setBodyField/removeBodyField）→ 真实改写回显（G-02 PASS）；untrusted 拒、命中事件 meta.intercepted 审计、AI 自请求不可见

**③ EXT「不支持 + 归属」统一转译面 + 契约预留（F-14 继承基线）**
- `ext-attribution.ts` ATTRIBUTION_MAP：12 项扩展归属能力逐项六字段（capability/desc/reason/home/extensionSurface/contract）纯常量零实现
- 覆盖：multi-tab-window / downloads / fullpage-screenshot / cookie-httpOnly-crossDomain / network-global / persistent-subscription / closed-shadow / cross-origin-iframe / native-dialog / trusted-input / permission-sim / file-real-path
- 纪律（ADR-012）：零扩展工程痕迹（grep 零命中）、零依赖新增（package.json diff=0）、ROADMAP F-14 行不变；契约预留仅供 F-14 立项继承/修订（非承诺）

**④ 横切（PRM + LGDL）**
- risk 声明表（EVT 读免 ask / DIA·CK·NET·CLP 写面分级）；untrusted 守卫（拦截规则/对话框策略/cookie 写值/明细声明需 `--trusted true`）；敏感字段模型扩展到 v4 新对象（cookie 值/URL query/header/键入负载/console·对话框文本——redactUrlQuery/maskHeaderValue/maskTextPayload 函数族）；审计扩展（subscribe/unsubscribe/event-delivery-summary/dialog/cookie/net-intercept，无敏感明文）
- lgdl-web 场景接入（FR-028~030）：events 默认开、cookie/dialog/net 默认关（enabled:false、schema 不含、派发禁用可读）；LGDL_DEFAULT_POLICY_RULES 顺序断言（cookie deny/net deny/dialog ask/touch deny/观察 allow，不可低于 ask）；AskDialog/事件摘要区 UI（事件摘要数据源 eventsSnapshot）

### 4.3 验证结论（validate-report v1.0，2026-09-08）

**结论：⚠️ 有条件通过（0 阻塞）**——V1~V17 全 ✅，FR 30/30 · NFR 8/8 · EC 12/12 · AC 10/10 承接：

| 维度 | 实测 |
|------|------|
| 全仓回归 | **1007 pass / 1 skip（render env-gate 既有）/ 0 fail**（base 473 / lgdl-web 66 / core 267 / render 94+1skip / router 8 / web-cli 84 / web-op 15）|
| 构建 | base tsc 0 / lgdl-web vite 0 / 全仓 9 ws build 0 |
| 真实浏览器冒烟 | chromium headless + CDP **148 断言 0 失败**（12 场景：evt 22/life 13/netcon 13/flood 13/dialog 18/cookie 19/clip 14+2/shd 11/touch 8/inter 15）|
| 验证门 | G-01 合成 touch **PASS** / G-02 网络拦截改写 **PASS**（独立复核 miniG1/miniG2）|
| v3 零回归 | v3 全工具真实浏览器重跑 PhaseA **115/115** + PhaseB lgdl-web React **11/11** + PhaseC 全绿 |
| **真实 AI 闭环（FR-004 收口①）** | **V17：真实 DeepSeek 驱动事件通道 11/11 PASS**（subscribe dom click → switch on → pull → CDP 注入真实用户 click source=page → AI 感知响应闭环；runAgent completed / 13 LLM 轮）|
| Review | R1 ⚠️ 有条件通过：37 通过 + 5 警示 + 0 失败 + 0 阻塞；改进 10 条（代码位已含修复：#1 URL 摘要脱敏于 events-tools.ts:337、#2 合并窗口关窗语义于 event-bus.ts:617-647 等）|
| 漂移 | 规格零漂移（spec/plan mtime 先于 build）；grep 红线零命中；ROADMAP F-14 行不变；package.json+lockfile diff=0 |
| 待基线（不阻塞） | 收口② lgdl-web React UI 人工点验（AskDialog 弹层/事件摘要区/系统通知）；收口③ web-search 真实端点（需 key）；2 项低风险改进观察（net actions op 白名单校验、跨域 dialog 归属文案）|

**架构纪律（对上游契约的承诺，FR-001/002）**：dom 27 头部注册序零漂移（30 = 27 头 + tap/swipe/pinch 尾）；既有工具零 emit/subscribe 副作用（grep 零命中）；additive 缝扩展（env.events/clipboardRich 可选，未注入可读转译）；base 零 lgdl/react import；DOM/window 触碰扩展为双文件纪律（platform-dom.ts 一次性操作 + platform-events.ts 有生命周期共享状态观察源）。

---

## 5. 技术全景聚合（跨四代的关键决策链）

| 机制层演进 | F-23 | v2 | v3 | v4 |
|-----------|------|-----|-----|-----|
| 路由/注册 | CommandRouter v1 | 注册表 v2（group/namespace/enabled/risk） | subcommandRisks 子命令级 | events 工具注册（11 子命令）|
| 权限 | DelayGate | PermissionGate + 三者组合 | ToolRisk=evaluate 最高档 default deny | untrusted 守卫 + PolicyRule.subcommand |
| 执行器 | createExecutor 泛型 | 域工具层 9 域平铺 | dom 27 子命令 + 5 新工具 | 事件驱动（pull 增量，非推式）|
| 平台缝 | PlatformEnv 雏形 | 9 域平台能力注入 | platform-dom 真实浏览器面 | + env.events / clipboardRich 可选缝 |
| 契约 | ToolEntry additive | additive 字段扩展 | additive ~25 方法 | **ATTRIBUTION_MAP 契约预留（F-14 继承线）** |

**架构不变量（四代贯穿，validate 逐代红线核验）**：①base 零 @lgdl/* 零 react 依赖（中性纯度 NFR-001）；②additive 契约（下游零回归）；③dispatch 门禁先于执行器（deny 短路）；④审计可回放零明文；⑤真实浏览器双轨冒烟 = 验证底线（v2 起）；⑥测试只增不删（582 → 724 → 898 → 1007 全仓只增）。

---

## 6. 异常标注

- **⚠️ v4 state.json 滞后**：`.sddu/specs-tree-root/specs-tree-web-cli-base-v4/state.json` 仍为 `phase=builded / workflow=5.build / agent=sddu-build`（updatedAt 2026-09-08），且 artifacts/files 仅登记到 build.md——但 review.md/review-report.md（01:57）/validate.md（00:15）/validate-report.md（04:53）已落盘且结论完备（review ⚠️ 有条件通过 37+5→0 阻塞；validate V1~V17 全 ✅）。**判定**：验证工作已完成，state.json 的 phase 回填（→ validated）与 files.validate/validationReport 注册缺失，属协调/回填滞后，**本全景不改写任何 state.json**（遵守 sddu-docs 约束），标注以 validate-report 实物为准；建议协调者触发 v4 收口（由持有方更新 state.json 后 @sddu-roadmap 同步 ROADMAP 状态）。
- **同批分支事实**：v2/v3/v4 同分支 `feature/web-cli-base-v2`（当前工作区即该分支 HEAD ecf82f5），未合入 main；本全景质量基线数字均为此分支实测，与 main 上 v0.6.0 基线（583）口径不同，引用时注意区分。
- **待基线非阻塞**：v3/v4 均遗留人工/配置待基线项（web-search 真实端点需 key、UI 人工点验），沿 v0.7 收口清单登记，不阻塞 validated 判定。

---

## 修订记录

| 生成时间 | 变更 Feature | 生成方式 | 修订人 |
|---------|-------------|:--:|--------|
| 2026-09-08 | 新建：聚合 specs-tree-web-cli-base-framework（F-23）+ v2（F-25）+ v3 + v4（F-26）四代谱系；重点纳入 v4（事件流/外壳纵深 + 载体分层裁决 + validate 全绿 1007） | 增量更新（Feature 产物聚合） | sddu-docs Agent |
