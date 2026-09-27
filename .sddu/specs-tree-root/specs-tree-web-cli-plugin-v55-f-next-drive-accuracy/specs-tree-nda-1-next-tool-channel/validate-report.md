# 验证报告：specs-tree-nda-1-next-tool-channel

> **文档定位**: SDDU 验证报告 — 逐项记录自主验证的执行结果，作为工作流终点
> **验证策略**: `validate.md`（v1.0，V1~V18 验证场景及五维度指引）
> **前置依赖**: `spec.md`（v1.0）、`plan.md`（v1.0 + ADR-NDA-101/102）、`review-report.md`（v1.0/1.1，⚠️ 有条件通过 / 0 阻塞；R1-FIX 已执行）
> **创建人**: SDDU Validate Agent
> **创建时间**: 2026-09-27
> **验证轮次**: R1
> **版本**: v1.0
> **更新人**: SDDU Validate Agent
> **更新时间**: 2026-09-27
> **更新说明**: 初始创建（V1~V18 全量执行：12 门禁独立复跑 + 3 组注入反证 + 红线/保护段/体积逐字节复算 + 漂移扫描。**结论 ⚠️ 有条件通过 / 0 阻塞**）
> **底层约束**: 全部结论基于**本机实测**；凡与环境时序相关者均按 `KL-N-10` 做**隔离复跑 ≥2 + 基线（`git stash` 至本叶前 HEAD）对照**，不采信 build/review 自报。

---

## 1. 验证概要

| 维度 | 数值 |
|------|:--:|
| 验证项总数 | 18（V1~V18） |
| 通过 | 15 |
| 有条件通过（非阻塞偏差） | 3（V6 / V7 / V16 的 flake 与弱读数，见 §5） |
| 失败 | 0 |
| 无法执行 | 0 |
| 阻塞问题 | **0** |
| 注入反证（临时缺陷 ⇒ 必红 ⇒ 还原） | 5 组（I-1 三段 + I-2 + I-3）**全部判红成功** |

**验证环境**: Node v24.15.0；Chromium `.pw-browsers/chromium-1234/chrome-linux64/chrome`。工作树 = `feature/web-cli-plugin` @ `a75466a` + 本叶未提交产物（24 个 tracked 文件修改 + 1 NEW）。

---

## 2. 逐项验证结果（V1~V18）

| # | 验证对象 | 验证步骤 | 预期结果 | 实测结果 | 判定 |
|---|---------|---------|---------|---------|:--:|
| V1 | FR-NDA-082/116 + 全链回归 | `npm test`（tsc 编译 test + `node --test`） | ≥1517/0，rc=0 | **1517 passed / 0 failed**，rc=0；AI-N-1~15 全绿（含 AI-N-8 零载体 / AI-N-12 schema 单源 / AI-N-15 短路） | ✅ |
| V2 | law8 ★NDA-1 ⑫（FR-NDA-013/028 · NFR-NDA-004 · EC-NDA-022） | `npm run test:law8` + 三段注入 | ≥69/0；三段各自可判红 | **69/0** rc=0；注入 A/B/C 各 ⇒ **68/1 判红**于精确判据（§5 I-1） | ✅ |
| V3 | 取代台账 + `assertionsRemoved` 机核（FR-NDA-110/111/114~118/121/082/116） | `npm run test:supersession` + `assertionsRemoved=1` 注入 | ≥55/0；注入必红 | **55/0** rc=0；注入 ⇒ **54/1 判红**于 `★ NDA-1 xNdaGateReconciliation` | ✅ |
| V4 | 改写门禁入下界（FR-NDA-130~137/135/117） | `npm run test:gate-integrity` + 模块独立 import 复算 | ≥27/0；`CHROMIUM_GATES=9`；下界 48 | **27/0** rc=0；独立 import ⇒ `CHROMIUM_GATES.length=9` ∧ `EXPECTED_AUDITED_FILES.length=48` ∧ `ai-next-candidate` 在受审集合 | ✅ |
| V5 | 分列预算 / 距档 / 三值 pin（FR-NDA-140~145） | `npm run test:size-ruling-vol3` + size-* 套件（在 npm test 内） | 全绿 | **14/0** rc=0；size-* 系列随 npm test 全绿 | ✅ |
| V6 | S0'''' 主线/支线 node+Chromium（FR-NDA-100~103/105/106 · EC-NDA-025） | `test:s0-self-driven` 隔离复跑 ×2 + 基线（HEAD）×2 | 与基线同根因 flake | 本叶 **96/2 ×2（rc=1）**；基线 **91/2 ×2（rc=1）**；失败集**非确定**（{14,15} vs {13,15}）⇒ **环境 flake（probe.steady 时序）**，node 面确定性覆盖 | ⚠️ |
| V7 | 零死端 / 边界（FR-NDA-044/045 · EC-NDA-001~006） | `test:dead-end` / `test:insight` / `test:density` / `test:recommendation` | 全绿 | dead-end **53/0**；insight **125 assertions PASS**；density **242/0**；recommendation **81/1 → 82/0 ×4**（flake，见 §5 O-flake） | ⚠️ |
| V8 | intercept 短路永久回归（FR-NDA-021~024 · R-NDA-905） | npm test 内 AI-N-15 + SW 命中分支注入 `return null` | 绿；注入必红 | AI-N-15 绿；注入 ⇒ `ai-next-candidate` **24/1 判红**于 AI-N-15 | ✅ |
| V9 | `next` schema / `enum` 单源（FR-NDA-010~012） | 从编译产物独立 re-derive | 恰 7 枚，排除 gesture | `NEXT_TOOL_ALLOWED_OP_IDS = ["op.turn","op.pick","op.describe","op.rebind","op.help","op.llm-config","op.revoke"]`（7）；独立复算 `OP_IDS(9) − gesture(op.authorize/op.perm.request)` 逐项相同；`maxItems=3` | ✅ |
| V10 | `chat-result.aiNext` 加法字段（FR-NDA-016/019/026/027） | 源码切片 + node 面 payload 装配读 | 只增不改 / 缺席 / ≤3 装配层 | `onFinish` 装配 `slice(0, NEXT_TOOL_MAX_CANDIDATES)`；`hasAiNext = accepted.length>0 ‖ blocked.length>0`（缺席 ⇒ 不附加）；`onToolDone` 逐字 | ✅ |
| V11 | xnDa 台账 schema（FR-NDA-082/116） | 独立读 ledger JSON + 判据源码 | 12 行携字段；`!==0` 必红 | 12 行均 `assertionsRemoved:0`；`xNdaReconProblems` 对 `!==0` push（L3465）；缺字段必红（L3524） | ✅ |
| V12 | 交付可编译（NFR-NDA-012） | `npm run typecheck` | rc=0 | **rc=0**（24.8s） | ✅ |
| V13 | 可构建 + 体积（NFR-NDA-001） | `npm run build`；复算 dist | rc=0；尺寸/冻结面一致 | **rc=0**；`content.js=177,076`（sha `52a82620…`）/`pick-layer.js=34,358`（sha `77796bab…`）逐字节不变；`sidepanel.js=605,239`；`background.js=1,644,437` | ✅ |
| V14 | 无条件注册 + parity（FR-NDA-015/020/117） | npm test（parity 套件）+ 源码切片 | `next ∈ deriveTools()`；注册无 refs 条件 | `host.ts` 注册 `createNextToolEntry()`（always-registered 段，附近无 refs）；`waivers.json#pluginExtras['next']` reason/basis 非空；`ai-next.when` 逐字（不读 refs） | ✅ |
| V15 | 体积上限 / 距档（NFR-NDA-001 · FR-NDA-140~145） | 独立脚本测量 | ≤635,500 ∧ ≤614,400 | `sidepanel.js=605,239` ⇒ 距生效上限 **30,261 B**、距档位 **9,161 B**；`background.js` B 列不计账 | ✅ |
| V16 | EC 边界（EC-NDA-014/015/002/003/018） | node 面判据（AI-N-1/5/6）+ 源码切片 | 解析失败不抛 / 覆盖式 / ≤3 / gesture 恒拒 / confirm 不可按下 | AI-N-1 五层筛法（坏形态 ⇒ `[]` 不抛）∧ AI-N-5 分层（confirm `admit=true`/`gesture` 拒）∧ AI-N-6 五类注入各拦；`slice` 在装配层；`enum` 不含 gesture（更强 fail-closed） | ✅ |
| V17 | 漂移（孤立 / 缺失 / 规格） | 文件集 vs plan §5；mtime；git diff | 0 项 | 孤立 0 / 缺失 0 / spec·plan mtime 早于 build（无漂移）；`ROADMAP.md` 零 diff | ✅ |
| V18 | 红线 / 保护段 / 判定链（FR-NDA-001~006/142 · NFR-NDA-005） | 脚本 byte-diff + sha 复算 | 全部命中 | 基座零 diff；保护段 sha 命中；`admitCandidate`·`onToolDone` 函数体 **byte-identical to HEAD**；载体常量守恒（§3.5） | ✅ |

> **说明**：V6 / V7 的判定为「⚠️」= **非阻塞环境 flake**（本机实测，附基线对照与同根因证据），不降低结论为「不通过」。

---

## 3. 验证详细信息

### 3.1 全门禁独立复跑结果表（不采信自报）

| # | 门禁 | 命令 | 实测 | rc | build/review 自报 | 判定 |
|:-:|------|------|:--:|:--:|:--:|:--:|
| 1 | 主套件 | `npm test` | **1517 / 0** | 0 | 1517 / 0 | ✅ 一致 |
| 2 | 法八 | `npm run test:law8` | **69 / 0** | 0 | 69 / 0 | ✅ 一致 |
| 3 | 取代台账 | `npm run test:supersession` | **55 / 0** | 0 | 55 / 0 | ✅ 一致 |
| 4 | 门禁元完整性 | `npm run test:gate-integrity` | **27 / 0** | 0 | 27 / 0 | ✅ 一致 |
| 5 | 体积裁决 | `npm run test:size-ruling-vol3` | **14 / 0** | 0 | — | ✅ |
| 6 | S0 自驱链（Chromium） | `npm run test:s0-self-driven` | **96 / 2**（×2） | 1 | 95 / 3（build）/ 95 / 3（R1-FIX） | ⚠️ flake（计数即随环境漂移） |
| 7 | 洞见/档案 | `npm run test:insight` | **125 assertions PASS** | 0 | — | ✅ |
| 8 | 密度 | `npm run test:density` | **242 / 0** | 0 | — | ✅ |
| 9 | 零死端 | `npm run test:dead-end` | **53 / 0** | 0 | — | ✅ |
| 10 | 推荐/系统行/引用卡 | `npm run test:recommendation` | **81/1 → 82/0 ×4** | 1,0,0,0,0 | — | ⚠️ flake（4/5 绿） |
| 11 | 类型检查 | `npm run typecheck` | 通过 | 0 | 0 | ✅ 一致 |
| 12 | 构建 | `npm run build` | 通过 | 0 | 0 | ✅ 一致 |

**基线对照（`git stash` 至本叶前 HEAD，`dist/sidepanel.js=604,602 B`）**：

| 门禁 | 本叶工作树 | HEAD 基线 | 结论 |
|------|:--:|:--:|------|
| `test:s0-self-driven` | 96/2（失败集 {14,15}）/ 96/2（{13,15}） | 91/2（{13,14}）/ 91/2（{13,14}） | **同根因**（`route:"risk-recovery"` 抢槽；probe.steady 时序）；**非本叶引入**，且本叶失败集**不确定** ⇒ 环境 flake |
| `test:recommendation` | 81/1（④）→ 82/0 ×4 | 81/2（⑭ 授权 chip）→ 82/0 ×2 | **基线与本叶皆 flake**，红点位置不同 ⇒ 环境时序 |

### 3.2 接口 / 契约数据（无 HTTP API / DB，落在三面契约）

| 检查项 | 契约要求 | 实测 | 一致？ |
|--------|---------|------|:--:|
| `next` 工具 `enum` | `OP_IDS − gesture`（单源派生） | 独立复算 = 导出值（7 枚）；`op.authorize`/`op.perm.request` 排除 | ✅ |
| `next` 工具 `maxItems` | ≤3 | `NEXT_TOOL_MAX_CANDIDATES = 3`；装配层 `slice(0,3)` | ✅ |
| 捕获输入面 | 仅 `tc.rawArguments`（严格 JSON） | `tc.args` 零使用（AI-N-14）；SW `intercept` 用 `tc.rawArguments` | ✅ |
| `chat-result.aiNext` | 加法字段；缺席 ⇒ 现状逐字 | `hasAiNext` 门控；`chat-events.ts` 逐字不改 | ✅ |
| `xnDaGateReconciliation` | 12 行 × `assertionsRemoved` | 12 行全 `0`；机核判据存在 | ✅ |
| 工具注册（`deriveTools()`） | `next` ∈ `deriveTools()`；`listed:false` | `host.ts` 注册；parity `pluginExtras['next']` 非空 | ✅ |

### 3.3 构建脚本

| 命令 | 退出码 | 耗时 | 输出摘要 | 结果 |
|------|:--:|:--:|---------|:--:|
| `npm run typecheck` | 0 | 24.8 s | 无诊断 | ✅ |
| `npm run build` | 0 | 6.7 s | `dist/sidepanel.js 591.1kb` / options 等；build stamp 写入 | ✅ |
| `test/size-ruling-vol3` | 0 | — | 14/0 | ✅ |

### 3.4 性能边界（体积 = 唯一在线 NFR）

| NFR/EC | 要求 | 实测 | 偏差 | 达标？ |
|--------|------|------|------|:--:|
| NFR-NDA-001（生效上限） | ≤ `floor(605,239×1.05)=635,500` | **605,239 B** | 余 **30,261 B** | ✅ |
| FR-NDA-144（距档） | ≤ 档位 `614,400` | **605,239 B** | 余 **9,161 B** | ✅ |
| 冻结面零容差（FR-NDA-142） | 逐字节不变 | `content.js 177,076 / 52a82620…`；`pick-layer.js 34,358 / 77796bab…` | 0 B | ✅ |
| B 列归因（FR-NDA-024/140~145） | 不计侧栏账本 | `background.js 1,644,437 B`（+2,565 B，不计账） | — | ✅ |
| EC-NDA-016 | 越限二态皆「否」 | 越生效上限「否」∧ 越档位「否」 | — | ✅ |

### 3.5 漂移与红线检测

| 漂移类型 | 检测方法 | 结果 |
|---------|---------|------|
| 孤立代码（有代码无需求） | 文件集 vs plan §5 | ✅ 无（NEW `next-tool.ts` ↔ FR-NDA-010~014；6 src + 18 test/docs 逐项对应） |
| 需求缺失（有需求无代码） | 11 交付物逐项 | ✅ 无（§8.3 十一项全部落地） |
| 规格漂移（spec/plan 被改） | mtime（spec 13:18 / plan 13:46 < build 18:11） | ✅ 无 |
| 基线（`web-cli-base/**`） | `git diff --name-only` | ✅ 零 diff |
| 判定链（`press-decision.ts`/`ai-drive.ts`/`turn-queue.ts`） | `git diff` | ✅ 零 diff |
| `admitCandidate` 函数体 | byte-diff 工作树 vs HEAD | ✅ 逐字节相同 |
| `onToolDone` 函数体 | byte-diff 工作树 vs HEAD | ✅ 逐字节相同 |
| 保护段 journey `[43484,59347)` | 字节切片 sha256 | ✅ `7b309258…`（len 15,863）∧ 文件相对 HEAD 零 diff |
| 保护段 binding `[107780,115930)` | 字节切片 sha256 | ✅ `be9ad0e9…`（len 8,150）∧ 文件相对 HEAD 零 diff |
| 围栏块 5 符号（`NEXT_CONTRACT_GUIDANCE`/`AI_NEXT_FENCE_INFO`/`AI_NEXT_FENCE`/`lastNextFenceBody`/`parseAiNextItems`） | `src/**` 词界扫描 | ✅ 零命中（单一产出通道） |
| 载体守恒 | KIND_SET / ACT_TO_OP / CHROMIUM_GATES / 下界 | ✅ `KIND_SET=40` ∧ `ACT_TO_OP=6` ∧ `CHROMIUM_GATES=9` ∧ `EXPECTED_AUDITED_FILES=48` ∧ `JUDGEMENTS=15`（'AI-N-1'~'15'，旧 14 id 逐字保留） |
| `.sddu` 外零触碰 | `git diff -- '*.sddu*'` | ✅ `ROADMAP.md` 零 diff |

---

## 4. 验证脚本执行记录

> ADR-003 落地：由 validate Agent 自主编写并直接执行。目录：`/tmp/sddu-validate-specs-tree-nda-1-next-tool-channel-20260927-181411/`

| 脚本文件 | 用途 | 对应场景 | 退出码 | 关键输出 |
|---------|------|:--:|:--:|---------|
| `redline-check.py` | 基座零 diff / 冻结面 sha / 体积 / 保护段字节 sha / 围栏块符号 / 载体常量 | V13/V15/V17/V18 | 0 | `15/15 PASS`（fails=[]） |
| `gate-consts.mjs` | 从编译产物独立 import 复算门禁常量 + `enum` re-derive | V4/V9 | 0 | `9/9 PASS`；`CHROMIUM_GATES=9`、`EXPECTED_AUDITED_FILES=48`、`enum=7` 排除 gesture |
| `core-claims.py` | `admitCandidate`/`onToolDone` byte-diff；判定链零 diff；`ai-next.when` 不读 refs；无条件注册；围栏块删除；规格漂移 mtime | V14/V16/V17/V18 | 0 | `14/14 PASS` |
| `inj-A-law8.log` | 注入：禁用 `recommend.ts` anti-flicker 短路 ⇒ 法八必红（还原） | V2（I-1 正控） | 1→0 | `68 passed / 1 failed`，红点 = ⑫ **运行面正控**；还原 **69/0** |
| `inj-B-law8.log` | 注入：去掉 `stream-plaintext.ts#label()` 的 `assertStreamPlaintext` ⇒ 法八必红（还原） | V2（I-1 负控） | 1→0 | `68 / 1`，红点 = ⑫ **AI label 零明文（运行面）** `threw:false`；还原 **69/0** |
| `inj-C-law8.log` | 注入：把 ⑫ 反证的 seed 载荷换成非哨兵 ⇒ 三面读数必不命中（还原） | V2（I-1 反证） | 1→0 | `68 / 1`，红点 = ⑫ **(FAIL 段) 三面读数非恒真**；还原 **69/0** |
| `inj-I2.log` | 注入：ledger 行 `assertionsRemoved=1` ⇒ supersession 必红（还原） | V3（I-2 机核） | 1→0 | `54 / 1`，红点 = `★ NDA-1 xNdaGateReconciliation`；还原 **55/0** |
| `inj-I3.log` | 注入：SW `intercept` 命中分支 `return null` ⇒ AI-N-15 必红（还原） | V8（I-3 永久门禁） | 1→0 | `24 / 1`，红点 = **AI-N-15 intercept 短路永久回归**；还原绿 |
| `npm-test.log` / `test-*.log` / `s0-*.log` / `rec-baseline-*.log` | 各门禁原始输出（含隔离复跑与基线） | V1/V5/V6/V7 | 见 §3.1 | 见 §3.1 |
| `inject-backups/` | 注入前文件备份（逐字节还原凭证：`sha256sum -c` 全 OK） | — | — | 三处注入源文件还原 sha 校验通过；ledger diff 归位 815 行、SW 55 行 |

> **还原完整性**：注入涉及的 `recommend.ts` / `stream-plaintext.ts` / `law8-plaintext.mjs` / `service-worker.ts` / `v4-supersession-ledger.json` 均从备份逐字节还原；`git diff --stat` 归位（ledger 815、SW 55）；还原后 `supersession=55/0`、`law8=69/0`、`build` 后 `dist` 尺寸回位。

---

## 5. 非阻塞偏差与观察项

### 5.1 非阻塞偏差（不升级为阻塞）

| # | 位置 | 现象 | 独立证据 | 处置 |
|---|------|------|---------|------|
| F-1 | `test:s0-self-driven`（Chromium） | 本叶 96/2（rc=1） | 失败集**非确定**（{14,15} vs {13,15}）；**基线 HEAD 亦 91/2**，同根因 `rule:"risk-recovery"`（probe.steady 未置稳 ⇒ priority-1 抢 ai-led 槽）；同语义由 node 面 `S0''''`（12 环节 + 四类注入）**确定性**覆盖 | 按 `KL-N-10` 如实记录，**不阻塞**（非本叶引入） |
| F-2 | `test:recommendation`（Chromium） | 第 1 次 81/1（④ `rule:null` floor 卡）；后续 4 次 82/0 | **基线 HEAD 亦 flake**（81/2，红点在 ⑭ 授权 chip，位置不同） | 按 `KL-N-10` 如实记录，**不阻塞** |

### 5.2 观察项（转作者 / 叶2，不阻塞）

| # | 项 | 独立复核 |
|:-:|---|---|
| O-1 | `S0''''-2` 的 `unconditional`/`unconfiguredToolSent` 为**常量读数** | 已复核 `test/ai-next-candidate.test.ts:1244-1245`：`unconditional = createNextToolEntry().name === NEXT_TOOL_NAME`（恒真）、`unconfiguredToolSent = false`（硬编码）⇒ 两条读数不可 FAIL；实质保障在 `parity.test.ts`（`next ∈ deriveTools()`）+ SW `:944-956` early-return 结构 |
| O-3 | `next` 调用后多一轮 agent step 的**助手文本**会上流 | 已复核 `src/background/service-worker.ts:1011` `onAssistantText` **未**对 `next` 过滤（ADR-NDA-102 只覆盖 `command`/`tool`）；真实面板可能多一条助手气泡 —— 建议作者 / 叶2 确认可见面 |
| O-4 | `KL-N-10` ≥2 次隔离复跑 | 已完成：本叶工作树 **2 次** + 基线 HEAD **2 次**（§3.1） |
| O-6 | A 列实测 +637 B 略超 ADR-NDA-008 §② 叶1 估（+0.1~0.5 KB） | 已复核：+0.62 KB，**未跨档位**（距档 9,161 B），不搬列规避 ⇒ 符合 ADR 纪律 |

---

## 6. 阻塞问题

| # | 位置 | 问题 | 对应 Vx | 修复建议 |
|---|------|------|:--:|---------|
| — | — | **无（0 个）** | — | — |

> 说明：V6 / V7 的 Chromium 失败与 O-1 / O-3 的弱读数均**不影响生产正确性**（同根因 flake 已在基线复现；弱读数处另有更强覆盖），不计入阻塞。

---

## 7. 结论

**结论**: ⚠️ **有条件通过**

**指标达标矩阵**：

| 指标 | 要求 | 实测 | 达标？ |
|------|------|------|:--:|
| FR 测试覆盖（13 组父 FR 切片） | 100% | **13/13 = 100%** | ✅ |
| NFR 测试覆盖（本叶承载 15 项） | ≥80% | **15/15 = 100%**（NFR-NDA-010 终态属叶2，记「不适用」） | ✅ |
| 构建退出码 | 0 | `typecheck=0` ∧ `build=0` | ✅ |
| 阻塞问题数 | 0 | **0** | ✅ |
| 漂移项 | 0 | **0**（孤立/缺失/规格三面全 0） | ✅ |
| 注入反证真实性（I-1/I-2/I-3） | 必红 | **5 组全判红 + 逐字节还原** | ✅ |
| 红线 / 保护段 / 体积 | 命中 | 基座零 diff ∧ 冻结面双锚 ∧ 保护段双锚 ∧ 体积达标 | ✅ |

**理由**：

1. **换轨是真换轨、且可判**：`next` 工具进入 `deriveTools()`（`parity` 反向机核）；`hooks.intercept` 命中 ⇒ 合成 `ToolResult{ok:true,output:NEXT_TOOL_ACK}` ⇒ 基座 `intercepted ?? dispatch` 保证 **dispatch 永不发生**（AI-N-15 真跑基座 `dispatchCalls===0`，且我独立注入 `return null` ⇒ 必红）。围栏块 5 符号在 `src/**` **结构性零命中**（单一产出通道）。
2. **换机制 ≠ 换安全闸**：`admitCandidate` 与 `onToolDone` 函数体独立 byte-diff **与 HEAD 逐字节相同**；`press-decision.ts`/`ai-drive.ts`/`turn-queue.ts` 零 diff；`gesture` 恒拒（`enum` 更以「不含 gesture」实现比 spec 字面更强 fail-closed）；`confirm` 可提案不可按下。
3. **触发无条件 + 规则位等价重锚**：`ai-next.when` 逐字不读 refs（`(ctx.session.aiNext?.length ?? 0) > 0 …`）；`NEXTSTEP_PRIORITY` 恰 5（`ai-led` 索引 1 < `ref-action` 索引 2，`risk-recovery` 仍最高）；注册无 refs 条件。
4. **无阻塞**：V6 / V7 的 Chromium 失败经**本机基线复现**证明为环境 flake（失败集不确定 + 基线同失败）；I-1（`law8 ⑫` 空转）已由**三段注入必红**证实转为真实判据；I-2/I-3 亦经独立注入证明机核可判红。
5. **结论口径**：因存在**非阻塞**偏差（V6/V7 flake + O-1/O-3 弱读数/观察项），按判定规则取 **⚠️ 有条件通过 / 0 阻塞**（不夸大为 ✅ 通过，亦不误判为 ❌ 不通过）。

**可关闭性**：无阻塞项 ⇒ 本叶机制核心已达成；叶2（`specs-tree-nda-2-fallback-and-gates`，`BLK-NDA-9`）可解锁。

---

## 8. 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建（validate R1 执行报告）：V1~V18 全量执行；12 门禁独立复跑（1517/0、69/0、55/0、27/0、14/0、125 断言、242/0、53/0；s0 96/2 与 recommendation 81/1 经 ≥2 隔离复跑 + HEAD 基线对照判为环境 flake）；I-1 三段 + I-2 + I-3 五组注入反证全判红并逐字节还原；红线/保护段/体积/载体独立复算；漂移 0。**结论 ⚠️ 有条件通过 / 0 阻塞** | 2026-09-27 | SDDU Validate Agent |
