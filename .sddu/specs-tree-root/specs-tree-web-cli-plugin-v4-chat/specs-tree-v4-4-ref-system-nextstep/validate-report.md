# 验证报告：specs-tree-v4-4-ref-system-nextstep

> **文档定位**: SDDU 验证报告 — 逐项记录自主验证的执行结果，作为工作流终点
> **验证策略**: validate.md（包含 V1~V8 验证场景及五维度指引）
> **前置依赖**: validate.md（验证策略）、spec.md（需求规范）、review-report.md v2.0（审查报告，状态 passed）
> **创建人**: SDDU Validate Agent
> **创建时间**: 2026-09-20
> **验证轮次**: R1（独立动态验证；HEAD `d6c5449`，分支 `feature/web-cli-plugin`，2026-09-19 修复轮两轮后）
> **版本**: v1.0
> **更新人**: SDDU Validate Agent
> **更新时间**: 2026-09-20
> **更新说明**: 初始创建（8 组 26 个原子场景 + 86 条独立探针断言 + 23 门禁独立复跑 + 计数对账；结论见 §6）

## 1. 验证概要
> 验证结果的量化总览

| 维度 | 数值 |
|------|:--:|
| 验证项总数 | 26（V1~V8 组下的原子断言场景） |
| 通过 | 25 |
| 失败 | 0 |
| 无法执行（登记） | 1（重锚新卡序号的端到端 DOM 复现，见 §3.1） |
| 阻塞问题 | 0 |
| 独立探针断言 | 86（node 49 + Chromium 37） |
| 独立复跑门禁 | 23 项（+ design-contract），全绿 |

**范围**：`packages/web-cli-plugin`（`src/ui/sidepanel/**` + `test/**` + `docs/**`）。工作树干净（`git status --porcelain` 空）；`HEAD=d6c5449`。
**探针产物**：`/tmp/opencode/v4-validate-v4-4/`（`probe-node.mjs` / `probe-node2.mjs` / `probe-chrome.mjs` / `probe-halfload.mjs` / `probe-block03.mjs` + `logs/`）。
**独立复算声明**：所有门禁计数、体积三值、单通道构造点、推荐输入形状、宿主判据均由 validate 侧重新执行/重新编译驱动，**未采信 build/review 的自报数值**；对抗探针按「注入 ⇒ 必红」设计。

## 2. 逐项验证结果（V1~V8）
> 对照 validate.md 中定义的验证场景，逐项执行并记录实测结果

| # | 验证对象 | 验证步骤摘要 | 预期结果 | 实测结果 | 判定 |
|---|---------|---------|---------|---------|:--:|
| V1 | 23 门禁 + design-contract | 串行实跑全部门禁 + 计数对账 | 全绿且计数一致 | 23/23 绿；计数逐项一致（见 §3.3） | ✅ |
| V2-① | 推荐三+一生产时机 | SW→面板真实 ref-captured / dom-gone 救援 / chat-result done / 真·首装 | 各 timing 命中且出对应卡 | firstRun=onboarding / pick=risk-recovery / stale=risk-recovery / idle（有候选）=risk-recovery；均 `trigger` 命中，**不经 `testing.recommend()`** | ✅ |
| V2-② | 推荐不依赖被禁真值 | 注入 settings 派生 + 源码扫描 | 输出不变；结构够不到 | 注入后输出**逐字节不变**；导入集 ⊆ 白名单；零 `settings`/`deriveCounts`/时钟/网络面 | ✅ |
| V2-③ | 推荐抑制逻辑 | pending/interval/empty/safety 纯函数驱动 | 各抑制精确 | pending/interval(9,999)/empty/safety 全对；10,000ms 放行；本地动作不被 deny 误伤 | ✅ |
| V2-④ | 首装双闸门 | 半加载面板（state 挂起）⇒ 释放 | 半加载不产卡；释放后产卡 | 挂起时 0 卡；释放后 onboarding 卡出现（trigger=firstRun） | ✅ |
| V3-① | 系统事件单通道 | 全仓+产物 grep + 布线可达性 | 产品可达 payload 构造点恰 1 | src 2 处（1 产品可达 = `chat-state#systemRow`，1 纯模型不可达）；dist 字面量恰 1；3 dispatch 共享唯一通道 | ✅ |
| V3-② | 速率上限真跑 | 纯函数 21 条 + Chromium 30 条 | dropped+1 且状态栏可读 | 第 21 条 `text=null`/`dropped=1`/`total=20`；Chromium `dropped=14`/`rows=20`/状态栏「限速丢弃」 | ✅ |
| V3-③ | I-01 N 卡 ⇒ N 行 | 独立驱动 reducer（2 卡+会话切换/单卡） | 2 ⇒ 2 行；单 ⇒ 1 行 | 2 行（同文案不塌）；单卡 1 行；键随事实标识 | ✅ |
| V3-④ | 5 通道变化才追加 | 同值二次真实 refresh | 行数不变 | 4 → 4 | ✅ |
| V4 | 宿主与退役 | 伪造读数 + DOM 读 | 判据可 FAIL | 真实 `problems=[]`；5 组伪造**均判红**；DOM `li[data-host]` == 注册；`data-transitional-host` DOM=0；退役容器零残留 | ✅ |
| V5 | 引用四处呼应 | 真实 dom-gone 捕获 + 静态单源 | 行+卡+路径+角标 | 事件行「已失效」+ `data-ref-state=stale` + 原因 + repick/describe + 兜底收起 + 角标「失效」；证据层 4 行同源 | ✅（F-01 见 §5） |
| V6 | V3-VOL-3 闭合复核 | 三值复算 + 越限红测 | 档位/上限/min()/红测 | 512,000 / 563,200 / 502,841；`B_final=465,000` 保真；507,631 FAIL；563,201 FAIL；`authorConfirmation` 机核真 | ✅ |
| V7 | 规范+红线 | diff + sha + 门禁 | 零 diff / 零漂移 | 不动面零 diff；content.js 177,076 / pick-layer.js 33,900 逐字节不变；zero-injection 27/27；spec 零漂移 | ✅ |
| V8 | 修复落地抽检 | BLOCK-01/02/03 + I-09/I-10/I-04 | 闭环 | BLOCK-01（V2-①）/BLOCK-02（V4）/BLOCK-03（5/5）/I-09（V2-④）/I-10 反证可 FAIL 全闭环；I-04 机制消除 | ✅ |

## 3. 验证详细信息

### 3.1 测试覆盖

**独立探针的 86 条断言全绿**（明细见 §4）。关键覆盖：

| 需求 ID | spec 描述 | 覆盖证据 | 执行结果 | 覆盖率 |
|---------|----------|---------|:--:|:--:|
| FR-CHAT-050 | 引用卡（有效/失效 + 序号） | 推荐门禁 ⑦ + 探针 V5（stale 卡 + 角标） | ✅ | 已覆盖 |
| FR-CHAT-051 | 重拾/重锚新卡 + 旧卡零改动 | 门禁 ⑦（`refNums=1,2,3`）；端到端重锚（真实 dom-gone→救援→重锚）**未在本环境复现**（需页面侧唯一匹配+用户确认），如实登记 | ⏭️ | 部分（判据由门禁覆盖） |
| FR-CHAT-052 | 失效卡原因 + 两条恢复路径 | 探针 V5 + BLOCK-03 探针 5/5 | ✅ | 已覆盖 |
| FR-CHAT-053 | 系统事件行单行+时间戳+只追加 | 探针 V3-①/②/④；系统行 `HH:MM:SS` 实测 | ✅ | 已覆盖 |
| FR-CHAT-054 | 6+ 通道归并 | 探针 V3-①/④ + 门禁 system-merge（10 用例，含在 npm 992） | ✅ | 已覆盖 |
| FR-CHAT-055 | 拾取入口迁移后救援重锚 | 探针 V4（退役容器/结构宿主）+ V5（恢复路径） | ✅ | 已覆盖 |
| FR-CHAT-060 | 推荐真值派生 | 探针 V2-②（注入不变 + 白名单） | ✅ | 已覆盖 |
| FR-CHAT-061 | chips 即指令 | 探针 V2-①（chips `data-act` 齐备） + 门禁 ① | ✅ | 已覆盖 |
| FR-CHAT-062 | 规则表/优先级/上限 | 探针 V2-③ 常量复算 + 优先级序 | ✅ | 已覆盖 |
| FR-CHAT-063 | pending 门控一致 | 探针 V2-③ + 门禁 ③（disabled ∧ aria-disabled ∧ 不隐藏） | ✅ | 已覆盖 |
| FR-CHAT-064 | 推荐安全边界 | 探针 V2-③（fail-closed 到 chip 级） | ✅ | 已覆盖 |
| FR-CHAT-090~094 | V3-VOL-3 收口锚 | 探针 V6（a~o，14 条） | ✅ | 已覆盖 |

| NFR | 覆盖证据 | 执行结果 | 覆盖率 |
|-----|---------|:--:|:--:|
| NFR-CHAT-001 / 011 / 012 | 探针 V3（单通道/速率/去重）+ V5 | ✅ | 已覆盖 |
| NFR-CHAT-004 | 门禁 l0 221 / l1 111（键盘/ARIA 断言含在内） | ✅ | 已覆盖 |
| NFR-CHAT-005 | 零注入 27/27 + 探针 V2-②/③（label fail-closed） | ✅ | 已覆盖 |
| NFR-CHAT-006 | 探针 V6（三值/五要素/min()/红测） | ✅ | 已覆盖 |
| NFR-CHAT-007 / 009 / 010 | 门禁全绿 + 计数只增 + design-contract 6/6 | ✅ | 已覆盖 |

### 3.2 接口数据

| 检查项 | spec/ADR 要求 | 实测 | 一致？ |
|--------|----------|---------|:--:|
| `kind:'system'` 产品可达构造点 | 唯一（`systemRow`） | `chat-state.ts` 1 处（+ `stream-model.ts` 纯模型 1 处，产品零调用） | ✅ |
| dist 产物 `kind: "system"` 字面量 | 1 | 1（payload 构造）+ 3（dispatch，均汇入 `systemRow`） | ✅ |
| `recommend.ts` 导入集 | ⊆ `RECOMMEND_MODULE_WHITELIST` | `['./stream-plaintext.js']` | ✅ |
| 推荐规则表常量 | 1 / 3 / 10,000 / 4 优先级 | 1 / 3 / 10,000 / `risk-recovery,ref-action,onboarding,capability-discovery` | ✅ |
| `RETIRED_HOST_IDS` | 恰 `l0-pick`,`l0-status-band` | 一致；DOM 零残留 | ✅ |
| `STRIP_CHANNEL_KINDS` | 每通道绑定 kind | 6 条：`env/site/firstRun/probe/send/notice` | ✅ |
| `refEvidenceRows` | 单一证据构造 | `ref-store.ts:90` 定义，`projectRefCard` 与 `panels.ts:294` 共用 | ✅ |
| V3-VOL-3 三值 | 478,897 / 512,000 / 563,200 | `ceilTo50KB(478,897)=512,000`；`round(512,000×1.1)=563,200`；`min(563,200,502,841)=502,841` | ✅ |

### 3.3 构建脚本

| 命令 | 退出码 | 输出摘要 | 结果 |
|------|:--:|---------|:--:|
| `npm run typecheck` | 0 | 无类型错误 | ✅ |
| `npm run build` | 0 | `dist/sidepanel.js` = **478,897 B** | ✅ |
| `npm test`（node 全量） | 0 | **tests 992 / pass 992 / fail 0** | ✅ |
| `test:supersession` | 0 | 33/33 | ✅ |
| `test:gate-integrity` | 0 | 12/12（`CHROMIUM_GATES.length===9` 未动） | ✅ |
| `test:design-contract` | 0 | 6/6 | ✅ |
| `test:ref-pick-wiring` | 0 | 11/11 | ✅ |
| `test:size-ruling-vol3` | 0 | 10/10 | ✅ |
| `test:l0` | 0 | 221/221 | ✅ |
| `test:l1` | 0 | 111/111 | ✅ |
| `test:l2` | 0 | 73/73 | ✅ |
| `test:stream` | 0 | 63/63 | ✅ |
| `test:page-input` | 0 | 102/102 | ✅ |
| `test:zero-injection` | 0 | 27/27 | ✅ |
| `test:ask-auth` | 0 | 61/61 | ✅ |
| `test:recommendation` | 0 | 49/49 | ✅ |
| `test:ui`（journey） | 0 | 167 assertions | ✅ |
| `test:insight` | 0 | 116 assertions | ✅ |
| `test:hardening` | 0 | 24 assertions | ✅ |
| `test:e2e` | 0 | PASS | ✅ |
| `test:binding` | 0（**隔离复跑 retry1**） | 192/192（首轮批量跑 1 项 `#6l` 环境性 flake，见 N-03） | ✅ |
| `test:l1-reverse` | 0 | 9/9（注入→FAIL→sha256 复原→PASS 全套） | ✅ |
| `test:l2-reverse` | 0 | 10/10（内含 l2 73/73 前置） | ✅ |

**计数对账（与 build/review 自报）**：npm **992 == 992**；recommendation **49 == 49**；l0 **221 == 221**；density **175 == 175**；supersession **33 == 33**；ref-pick-wiring **11 == 11**；size-ruling-vol3 **10 == 10** ⇒ **0 处差异**。

### 3.4 性能边界

| NFR / EC | 要求 | 实测 | 达标？ |
|-----|---------|-------|:--:|
| 系统行速率上限 | 20/min，超出 dropped 且可读 | 第 21 条不追加 + `dropped=1`（纯）；Chromium `dropped=14`、`rows=20`、状态栏「限速丢弃」 | ✅ |
| 推荐反抖间隔 | 10,000ms | 9,999ms 抑制 / 10,000ms 放行 | ✅ |
| 单轮体积容差 | 5%；`min(绝对上限, 公式)` | 生效上限 502,841；边界含等号、+1B FAIL | ✅ |
| EC-CHAT-011 越限 | 超绝对上限必红 | `ceil(478,897×1.06)=507,631` ⇒ FAIL；`563,201` ⇒ FAIL | ✅ |
| EC-CHAT-008 无候选 | 不渲染空卡 | 0 卡（`suppression=empty`） | ✅ |
| 推荐安全边界 | 被拦动作不推荐 | 任一 next chip 被拦 ⇒ 整卡抑制（`safety`） | ✅ |

### 3.5 漂移检测

| 漂移类型 | 检测方法 | 结果 |
|---------|-------------|------|
| 孤立代码（有代码无需求） | `switchStreamSession` 产品可达性 + 全仓 grep | 产品 src 零调用（仅 `stream-model.test.ts` 驱动）；布线门禁禁止产品直呼 ⇒ 登记 N-01，非孤立 |
| 需求缺失（有需求无代码） | FR↔产物映射 | **0 项** |
| 规格漂移（spec 被修改） | `git diff eb879bb..HEAD -- spec.md` | **0 字节** |
| 不动面漂移 | `git diff` manifest / `src/content/**` / `src/background/**` / `test/ui/journey.mjs` / `test/ui/binding.mjs` / `l1/ref-validity.ts` / `ref-wiring.test.ts` | **零 diff** |
| 红线字节 | `sha256sum dist/content.js dist/pick-layer.js` | 177,076 / 33,900 逐字节不变 |
| 文档口径漂移 | `git diff plan.md` | 仅 +1 行 v1.1 订正注（I-11 显式登记，非静默） |

## 4. 验证脚本执行记录
> ADR-003 落地：validate Agent 自主编写并直接执行的验证脚本记录
> 脚本存放路径：`/tmp/opencode/v4-validate-v4-4/`

| 脚本文件 | 用途 | 对应场景 | 退出码 | 关键输出 |
|---------|------|:--:|:--:|---------|
| `probe-node.mjs` | 独立编译模块复算：推荐抑制/白名单/单通道/宿主注册表/V3-VOL-3 三值与越限红测/I-10 反证 | V2-②③、V3-①②③、V4、V6 | 0 | **46/46 PASS**（V6-f 507,631 FAIL、V6-g 563,201 FAIL、V4-b~e 4 组伪造判红） |
| `probe-node2.mjs` | 独立驱动编译 reducer 复现 I-01（N 卡 ⇒ N 行） | V3-③ | 0 | **3/3 PASS**（2 卡 ⇒ 2 行；单卡 ⇒ 1 行） |
| `probe-chrome.mjs` | Chromium 真实产品路径：三+一推荐时机（pick/stale/idle/firstRun）/ 速率上限 / 变化才追加 / 宿主与退役 / 引用呼应 | V2-①、V3-②④、V4、V5 | 0 | **28/28 PASS**（pick/stale/idle/firstRun 四时机 trigger 全命中；stale 经 `maybeRescue().then`） |
| `probe-halfload.mjs` | 半加载面板双闸门（挂起 state 回包） | V2-④、V8-I-09 | 0 | **4/4 PASS**（半加载 0 卡 → 释放后 onboarding 卡出现） |
| `probe-block03.mjs` | `describe-submit` 真实结算独立复现 | V8-BLOCK-03 | 0 | **5/5 PASS**（兜底唯一 + 真实结算 + 无占位） |
| `probe-patchtest.mjs` | 运输层拦截可写性诊断（辅助） | V2-① | 0 | `writable:true/configurable:true`，patch 生效 |

**对抗探针红绿如实表**：

| 探针 | 注入/驱动 | 结果 |
|------|----------|------|
| V2-① pick | 真 `ref-captured`（dom-gone） | 绿：`risk-recovery` 卡 + ref 卡 |
| V2-① stale | 真 dom-gone + 救援观察（运输层应答） | 绿：`trigger=stale` 且独立产卡 |
| V2-① idle | 真 `chat-result done`（先经产品 DOM 结算 ask） | 绿：`trigger=idle` + 追加卡 |
| V2-① firstRun | 真·首装（未授权/无模型） | 绿：`onboarding` 卡 |
| V2-④ 半加载 | 挂起 `state` 回包 | 绿：0 卡；释放后产卡（判据非恒真） |
| V3-② 速率上限 | 30 条 distinct（真跑） | 绿：`dropped=14`、rows=20、状态栏可读 |
| V3-③ 同文案 N 事实 | 2 卡 + 会话切换 | 绿：2 行（负控 1 行） |
| V3-④ 同值二次 refresh | 真实 refresh ×2 | 绿：行数不变 |
| V6-a `ceilTo50KB(478,897)` | 独立复算 | 绿：512,000 |
| V6-f `×1.06 = 507,631` | 注入 | **红（FAIL）** |
| V6-g `563,201` | 注入 | **红（FAIL）** |
| V6-o 伪造 Δ 12,683 | 注入披露元组 | **红（reasonArithmetic）** |
| V4-b~e 伪造宿主读数 | 复活 `#l0-pick` / 过渡标记=1 / 未登记宿主 / 缺失宿主 | **4/4 红** |
| V3-1b `switchStreamSession` | 产品可达性 grep | 绿（零调用） |

## 5. 阻塞问题

**阻塞问题：0 项。**

**F-xx（发现，附分级）**：

| # | 位置 | 问题 | 对应 Vx | 严重程度 | 建议 |
|---|------|------|:--:|:--:|---------|
| F-01 | `src/ui/sidepanel/sidepanel.ts:1739-1753`（`projectRef`）+ `:1721`/`:1789` 两个调用点 | **同一序号的 `ref` 卡在 dom-gone 救援观察落地时被重复投影**：探针 V5 实测 `data-ref-num = ["1","1"]`（两张 stale 卡）。`projectRef` 的「同一事实不重复投影」抑制被 `if (!systemText && …) return` **绕过**——传入 `systemText`（拾取投影 / 救援投影各一次）时无条件 dispatch，因此同一引用「捕获」与「救援」两次投影产生两张同序号卡。旧卡零改动（append-only）成立，规格亦未明文禁止；但流内出现两张「引用 1」失效卡属可讨论的观感冗余（system 行侧已按「持续：」规则表现，见 §3.1 备注）。密度门禁 175/175 未红，因夹具不驱动救援路径。 | V5 | 低（非阻塞） | 二选一：① 让抑制对同 `refId`+同名 marker 生效（仅 `why` 变化时只更新/只写 system 行），或 ② 显式登记为「救援线索落地 = 新事实，允许同序号再投影」。任选其一并在 `build.md`/ADR-V4-035 登记，避免口径悬空。 |

**N-xx（登记 / 环境 / 说明，均非阻塞）**：

| # | 位置 | 说明 | 严重程度 |
|---|------|------|:--:|
| N-01 | `src/ui/sidepanel/stream-model.ts:573` | 纯模型 API `switchStreamSession` 仍能构造一个绕过唯一通道的 `kind:'system'` 事件（无净化/去重/速率）。**产品路径零调用**（V3-1b 实测；布线门禁 `test:ref-pick-wiring` 禁止产品直呼），与 build.md §8 残余一致。 | 低 |
| N-02 | `build.mjs` / `dist/sidepanel.js` | 产物**非逐字节可复现**：`BUILD_STAMP` 内嵌时间戳，同源码两次 build sha256 不同（字节大小恒 478,897 B）。不影响门禁（体积/结构按字节数判定；RP 在单次构建内 sha256 复原）。 | 低 |
| N-03 | `test/ui/binding.mjs` | `test:binding` 批量串行首轮出现 `#6l`（`residual=undefined` + CDP `readyState=3`）红；**隔离复跑 retry1 = 192/192 绿**，签名与 build.md §6/§7、review 记录的历史现场同签名 ⇒ 环境性（KL-N-10 口径）；`binding.mjs` 零 diff。 | 低（环境） |
| N-04 | I-04 覆盖边界 | 「夹具**严格序无关性**」未设独立门禁（build.md §8 已登记）；本轮验证「机制消除」（`testing.reset()` 清空 `projectedRefState`，`sidepanel.ts:829`）+ 登记顺序下 `density` 175/175 绿。 | 低 |
| N-05 | 口径说明 | 用户 V5 表述「救援按钮在卡内」：实测一键重锚按钮 `#l1-ref-rescue` 位于 **L1 引用面板**（`#l1-ref`，仅「唯一文本匹配」时 `data-rescue=unique` 可见）；流内 `ref` 卡携带的是「重新拾取 / 改用描述」两条路径。属口径差异，非缺陷。 | 说明 |

## 6. 结论
> 验证最终结论

**结论**: ✅ 通过

**指标达标矩阵**：

| 指标 | 要求 | 实测 | 达标？ |
|------|------|------|:--:|
| FR 测试覆盖 | 100% | 15/15 项有覆盖（FR-CHAT-051 的重锚端到端 DOM 复现因环境无页面侧唯一匹配而登记为 ⏭️，判据由门禁覆盖） | ✅ |
| NFR 测试覆盖 | ≥ 80% | 9/9 项有覆盖（100%） | ✅ |
| 构建退出码 | 0 | typecheck 0 / build 0 | ✅ |
| 阻塞问题数 | 0 | 0 | ✅ |
| 漂移项 | 0 严重 | 0 严重（1 低 F-01 + 4 登记 N-xx） | ✅ |
| 独立探针断言 | 全绿 | 86/86（node 49 + Chromium 37） | ✅ |
| 门禁全绿 | 23/23 | 23/23（binding 隔离复跑） | ✅ |

**理由**：

1. **推荐链路（V2）**：四个生产时机（拾取后 / 引用失效后 / 空闲回合结束 / 真·首装）在**真实产品路径**下逐一驱动成功，`lastRecommend().trigger` 与流内规则卡均命中，且未使用 `testing.recommend()` 作为驱动源；推荐输出对注入的设置派生计数**逐字节不变**，源码结构（导入白名单 + 零 settings 引用 + 零时钟/网络面）证明其够不到被禁真值；抑制逻辑（pending / 间隔 / 空 / 安全）边界精确、fail-closed 到 chip 级；首装「双事实闸门」经半加载面板复现——挂起 state 回包时 0 卡，释放后产卡，证明闸门是真实阻塞点而非路径缺失。
2. **系统事件单通道（V3）**：src 与 **dist 产物**中产品可达的 `kind:'system'` payload 构造点唯一（`chat-state#systemRow`），3 处 dispatch 全部汇入；`switchStreamSession` 构造点产品零调用（已登记 N-01）。速率上限真跑（纯函数第 21 条 `dropped+1`；Chromium `dropped=14` 且状态栏可读），I-01「N 卡 ⇒ N 行」以独立编写的 reducer 驱动复现（2 行 + 单行负控），同值二次真实 refresh 不追加。
3. **宿主与退役（V4）**：`data-transitional-host` 全仓/DOM=0，退役容器零残留，DOM 宿主集合 == 注册集合；纯函数判据在 5 组伪造读数下**逐组判红**（非空转）。
4. **引用呼应（V5）**：真实 dom-gone 捕获下，系统事件行 + 失效卡（原因 + 两条恢复路径 + 兜底默认收起）+ 角标三者一致，证据层 4 行来自单一 `refEvidenceRows` 构造。发现 F-01（低，见 §5）。
5. **V3-VOL-3 闭合（V6）**：`ceilTo50KB(478,897)=512,000`、绝对上限 `563,200`、生效上限 `min()=502,841` 独立复算成立；`B_final=465,000` 历史保真；时间线抽 4 点（266,500/375,102/465,000/478,897）齐备；`authorConfirmation` 占位机器判据真实（`pending-author-line` 诚实占位，未伪称已确认）；**越限红测**（+6% = 507,631、563,201）与 I-10 伪造 Δ 均**必红**；`SIDEPANEL_CEILING_CAP` 仍 `record-only`。
6. **规范与红线（V7）**：不动面（manifest / `src/content/**` / `src/background/**` / journey / binding / 判定链 / ref-wiring）零 diff，`content.js` 177,076 / `pick-layer.js` 33,900 逐字节不变，零注入 27/27，spec.md 零漂移，plan.md 仅 +1 行显式订正注（I-11，非静默）。
7. **修复落地（V8）**：R1 三阻塞（BLOCK-01/02/03）均以独立探针复现闭环；I-09 首装双闸门、I-10 算术机核反证、I-02/I-01 单通道与事实标识均闭环；I-04 的跨夹具投影记忆机制已由 `testing.reset()` 消除（严格序无关性登记为 N-04）。
8. **处置建议**：F-01 为本轮唯一功能观察项（低优先，可讨论），建议在下一轮一并处置（或在台账显式登记为设计选择）；N-01~N-04 为已登记残余/环境项，无需阻塞 Feature 关闭。

## 修订记录
> 记录本文档的版本变更历史

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建（R1 独立动态验证：23 门禁 + 86 条对抗探针断言；结论 ✅ 通过；F-01 + N-01~N-05） | 2026-09-20 | SDDU Validate Agent |
