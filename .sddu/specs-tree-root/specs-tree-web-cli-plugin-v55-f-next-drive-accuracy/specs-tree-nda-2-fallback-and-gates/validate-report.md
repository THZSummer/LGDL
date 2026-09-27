# 验证报告：specs-tree-nda-2-fallback-and-gates

> **文档定位**: SDDU 验证报告 — 逐项记录自主验证的执行结果，作为工作流终点
> **验证策略**: `validate.md`（v1.0，V1~V14 验证场景矩阵 + 五维度指引）
> **前置依赖**: `validate.md`（v1.0）、`spec.md`（v1.0）、`review-report.md`（R1，⚠️ 有条件通过 / 0 阻塞）、`build.md`（v1.1，21/21 + R1 修复轮）
> **创建人**: SDDU Validate Agent
> **创建时间**: 2026-09-27
> **验证轮次**: R1
> **版本**: v1.0
> **更新人**: SDDU Validate Agent
> **更新时间**: 2026-09-27
> **更新说明**: 初始创建（叶2 兜底与判据叶 R1 动手验证：全门禁独立复跑 + I-1 新边界双向注入必红 + 作者口径端到端复核 + 红线/保护段/体积/台账机核 + 漂移检测；**不采信自报**，环境 flake 隔离复跑 ≥2 后如实记录）

---

## 1. 验证概要

| 维度 | 数值 |
|------|:--:|
| 验证项总数 | 14 |
| 通过 | 12 |
| 有条件通过（环境 flake，如实登记） | 2（V4 内 2 面；不计阻塞） |
| 失败 | 0 |
| 无法执行（人工面） | 0（另：真实 LLM 观感 / M1~M6 人工面 ⏭️，见 §5） |
| 阻塞问题 | **0** |

**验证方式**：**动手执行**（独立复跑全门禁 / 注入源码看判据是否必红 / 直读编译产物读生产模块行为 / 字节与哈希机核 / git diff）。所有数值均为**本轮实跑**，不采信 build/review 自报。验证脚本见 §4。

---

## 2. 逐项验证结果（V1~V14）

| # | 验证对象 | 验证步骤 | 预期结果 | 实测结果 | 判定 |
|---|---------|---------|---------|---------|:--:|
| **V1** | 构建 + 体积字节 | `typecheck` → `build` → `stat`/`sha256sum` | rc=0；sidepanel 606,652 / background 1,666,653 / content 177,076·`52a82620…` / pick 34,358·`77796bab…` | `typecheck` rc=0；`build` rc=0；`sidepanel.js`=**606,652** ∧ `background.js`=**1,666,653** ∧ `content.js`=**177,076** sha `52a82620…` ∧ `pick-layer.js`=**34,358** sha `77796bab…`（**逐字节命中冻结锚**） | ✅ |
| **V2** | 全量回归套件 | `npm test` | ≥1525 / 0 fail / rc=0 | **1525 passed / 0 failed / rc=0**（duration 343,958 ms） | ✅ |
| **V3** | 定向门禁 | `node --test` 四个 test.js + `AI-N-17` 定向 | 28 / ≥56 / ≥27 / ≥14 / 1 | ai-next-candidate **28/0**；AI-N-17 定向 **1/0**；supersession **56/0**；gate-integrity **27/0**；size-ruling-vol3 **14/0** | ✅ |
| **V4** | Chromium/UI 面门禁 | `law8`/`dead-end`/`recommendation`/`s0-self-driven`/`insight`/`density`/`e2e` | law8 72/0 · dead-end 56/0 · recommendation 85/0 · insight PASS · density 242/0 · e2e PASS · s0-self-driven 观察 | law8 **72/0** rc=0；dead-end **56/0** rc=0；density **242/0** rc=0；insight **PASS**（125 assertions）rc=0；e2e **PASS** rc=0；recommendation **84/1→83/3→85/0**（flake）；s0-self-driven **101/2→100/3**（flake）—— 详见 §3.1 / §3.5 | ⚠️ |
| **V5** | **I-1 新边界**（题眼） | 直读 `abnormalVerdict` 双向 + 注入①删 policy captured 分支 + 注入②删 SW captured 入参 + 逐字节还原 | 两方向分相 ∧ 两注入必红 ∧ 还原绿 | `{completed,0,0,captured:true}⇒null` ∧ `{…,captured:false}⇒no-tool-call`；**注入①** AI-N-17 **FAIL**（actual `no-tool-call` / expected `null`）；**注入②** AI-N-17 **FAIL**（`SW 必须把 captured（capture.captured）传入 abnormalVerdict`）；还原 sha256 `OK` → 复绿 | ✅ |
| **V6** | 作者口径①未配置 | 独立脚本直读 `free-input.when` + 生产卡 | `when=false` ∧ 无终端 ∧ 引导 chip 可达 | `when(risk=['llmBlocked'])=**false**`；卡 `terminal=undefined`；chips=`[{act:'op.llm-config',text:'配置 LLM 凭据（写入本机 · 掩码）'}]` ⇒ 确定性「去配置 LLM」引导可达 ∧ free-input 不显示 | ✅ |
| **V7** | 作者口径②已配置恒常驻 | 独立脚本直读 | `when=true` ∧ 终端恒常驻 | `when(risk=[])=**true**`；卡 `terminal=**true**`（R8/F-35 不回归） | ✅ |
| **V8** | 作者口径③提醒补一次 | 独立脚本 `shouldNudge` 真值表 + `AI-N-16` | 恰一次 + 防环 + 未配置不提醒 | 五条件齐⇒true；`nudgeUsed=true`/`configured=false`/`captured=true`/`toolCalls≠0`/`hasReply=false` ⇒ 均 false；`AI-N-16` 28/0 含「置位先于续呼」反证 | ✅ |
| **V9** | 作者口径④异常兜底链 | 独立脚本三情真值表 + `llm.abnormal.when` + 生产卡 + `AI-N-18` | 三情 ∧ 词表分相 ∧ 兜底 chip 可达 | `no-tool-call`/`llm-failed`/`all-blocked` 可判；`when(llmAbnormal)=true` ∧ `when(llmBlocked)=false` ∧ `when([])=false`；卡 chips=`[{op.llm-config,'配置新的 LLM（切换 / 重配）'}]` ∧ 终端 `true`（零死端） | ✅ |
| **V10** | 红线 | `git diff --stat` ×9 + 分段 `sha256` | diff 全空 ∧ 段 sha 命中 | 基座/ROADMAP/opencode.json/journey/binding/turn-queue/chat-runner/op-table/host-registry **diff 全 0**；journey `[43484,59347)`=**15863 B** sha `7b309258aab7…`；binding `[107780,115930)`=**8150 B** sha `be9ad0e98367…`（**命中**） | ✅ |
| **V11** | 载体守恒 | 独立脚本读编译产物 | 40/6/[]/5/2·2/5/4/7/5/13/9 | `KIND_SET`=40 · `ACT_TO_OP`=6 · `REGISTERED_STRUCTURAL_HOSTS`=[] · `BLOCKED_TERMINALS`=5 · `OPS_RECOVERY_ROWS`=2 · `OPS_RECOVERY_PROVIDER_IDS`=2 · `RECOVERY_PROVIDER_IDS`=5 · `DRIVER_TERMINALS`=4 · `PROACTIVE_MOMENTS`=7 · `DRIVER_TIMINGS`=5 · `DRIVER_DECLS_SRC`=13 · `CHROMIUM_GATES`=9（逐字命中） | ✅ |
| **V12** | 台账 + 断言零删除 | JSON 结构化机核 | 12 / 25 / 7-1-4 / assertionsRemoved 全 0 | `xNdaLedger`=**12**（superseded 7 / keep 1 / no-supersession 4）；`xNdaGateReconciliation`=**25**（dispositions 5 类，**无「未处置」**）；`assertionsRemoved` **全 0**；`xNdaLedgerFull`=**7 / 1（keep 9 子项）/ 4** | ✅ |
| **V13** | 漂移检测 | 改动集对账 + test( 计数 + mtime/旧名扫描 | 无孤立/缺失/规格漂移 | 工作树改动集 = plan §5（叶2 源码 5 文件：1 NEW + 4 MODIFY；其余属叶1）**无孤立**；test( 调用点 HEAD vs 工作树**只增不减**（ai-next 18→28 / free-input 23→27 / gate-integrity 26→27 / supersession 53→56，其余持平）；`spec.md` mtime 停在 spec 相位（13:19）**规格零漂移**；叶内旧名零残留（I-2 已落） | ✅ |
| **V14** | `KL-N-10` flake 隔离复跑 | s0-self-driven ×2 + recommendation 三跑 | 失败签名随复跑漂移 ⇒ 判 flake | s0-self-driven **101/2** vs **100/3**（失败集变化）；recommendation **84/1** vs **83/3** vs **85/0**（失败项不同）⇒ 同根因环境 flake（`probe.steady` 时序），非确定性回归 | ⚠️ |

> **维度过关**：测试覆盖 V2/V3/V4/V8/V9/V14；接口数据 V5~V9；构建 V1；性能边界 V1/V10/V11/V12；漂移 V10~V13。

---

## 3. 验证详细信息

### 3.1 测试覆盖（全门禁独立复跑结果表）

| 门禁 | 命令 | 声明基线 | 本轮实测 | rc | 判定 |
|------|------|:--:|:--:|:--:|:--:|
| typecheck | `npm run typecheck` | rc=0 | rc=0 | 0 | ✅ |
| build | `npm run build` | rc=0 | rc=0 | 0 | ✅ |
| **npm test** | `npm test` | ≥1525 | **1525 / 0** | 0 | ✅ |
| ai-next-candidate（全量） | `node --test dist-test/test/ai-next-candidate.test.js` | 28 | **28 / 0** | 0 | ✅ |
| ai-next-candidate（AI-N-17 定向） | `node --test --test-name-pattern="AI-N-17" …` | 1 | **1 / 0** | 0 | ✅ |
| supersession | `node --test dist-test/test/supersession-ledger.test.js` | ≥56 | **56 / 0** | 0 | ✅ |
| gate-integrity | `node --test dist-test/test/gate-integrity.test.js` | ≥27 | **27 / 0** | 0 | ✅ |
| size-ruling-vol3 | `node --test dist-test/test/size-ruling-vol3.test.js` | ≥14 | **14 / 0** | 0 | ✅ |
| law8 | `node test/ui/law8-plaintext.mjs` | ≥72 | **72 / 0** | 0 | ✅ |
| dead-end | `node test/ui/no-dead-end.mjs` | ≥56 | **56 / 0** | 0 | ✅ |
| recommendation | `node test/ui/recommendation.mjs` | ≥85 | **85 / 0**（复跑第 3 次；前两次 84/1、83/3） | 1↔0 | ⚠️ flake |
| s0-self-driven（隔离 ×2） | `node test/ui/s0-self-driven.mjs` | 观察 | **101/2** · **100/3** | 1 | ⚠️ flake |
| insight | `node test/ui/insight.mjs` | PASS | **PASS**（125 assertions） | 0 | ✅ |
| density | `node test/ui/density.mjs` | 242/0 | **242 / 0** | 0 | ✅ |
| e2e | `node test/e2e/fullchain.mjs` | PASS | **PASS** | 0 | ✅ |

**§3.1.1 叶内新增判据块实测命中**（非自报，取自本轮日志）：
- `law8`：`★ NDA-2 ⑬ 两文案各自在场且相异` / `两文案零明文` / `异常相文案随兜底 chip 呈现` **3/3 ✔**（段 72/0）。
- `dead-end`：`ND-11 未配置相（无终端 ∧ 引导 chip 可达）` / `ND-11 异常相（兜底 chip ∧ 终端恒常驻）` / `ND-11 反证（when 不得退回恒真）` **3/3 ✔**（段 56/0）。
- `recommendation`：`★ NDA-2 已配置相 / 未配置相 / 异常相` **3/3 ✔**（在三次复跑中**均绿**，与 flake 无关）。
- `ai-next-candidate`：`AI-N-16`（提醒有界）/ `AI-N-17`（异常闭集 + I-1 边界）/ `AI-N-18`（兜底分相）**全绿**。

### 3.2 接口数据（生产模块行为直读）

独立脚本 `author-caliber-e2e.mjs` 直读 `dist-test` 编译产物（生产模块，零打桩），**22 / 22 断言通过**：

| 检查项 | 期望 | 实测 | 一致？ |
|--------|------|------|:--:|
| 未配置 `free-input.when` | false | false | ✅ |
| 未配置卡终端 | 非 true | `undefined` | ✅ |
| 未配置卡引导 chip | `op.llm-config` ∧ 「配置 LLM 凭据（写入本机 · 掩码）」 | 一致 | ✅ |
| 已配置 `free-input.when` | true | true | ✅ |
| 已配置卡终端 | true | true | ✅ |
| `llm.abnormal.when(llmAbnormal/llmBlocked/[])` | true/false/false | true/false/false | ✅ |
| 异常相兜底 chip | `op.llm-config` ∧ 「配置新的 LLM（切换 / 重配）」 | 一致 | ✅ |
| 异常相终端 | true | true | ✅ |
| `shouldNudge` 五条件 | 恰一次 ∧ 未配置不提醒 | 一致 | ✅ |
| `abnormalVerdict` 六情形 | 三情 + `stopped⇒null` + `accepted>0⇒null` + `captured∧空⇒null` | 一致 | ✅ |

### 3.3 构建脚本

| 命令 | 退出码 | 耗时 | 输出摘要 | 结果 |
|------|:--:|------|---------|:--:|
| `npm run typecheck` | 0 | — | 无诊断 | ✅ |
| `npm run build` | 0 | ~2s | `dist/` 重建完成（stamp 2026-09-27T13:37Z） | ✅ |
| `dist/sidepanel.js` | — | — | **606,652 B**（= 登记） | ✅ |
| `dist/background.js` | — | — | **1,666,653 B**（B 列，不计账） | ✅ |
| `dist/content.js` | — | — | **177,076 B** / sha `52a826205553b46a896ccad54225d63ba62f5f7fe7c969a9bc2e655448d5b5f6` | ✅ |
| `dist/pick-layer.js` | — | — | **34,358 B** / sha `77796babd9c93893542195424d160e0877d8acca4142f8faf2232e217fbd575e` | ✅ |

### 3.4 性能边界（体积 + 载体）

| NFR/EC | 要求 | 实测 | 达标？ |
|--------|------|------|:--:|
| NFR-NDA-001 A 列 | `sidepanel.js ≤` 生效上限 636,984 | **606,652 B**（余 30,332） | ✅ |
| FR-NDA-141 距档 | 距档 614,400 = 7,748 B | **7,748 B** | ✅ |
| FR-NDA-142 冻结面 | 零容差 | content/pick **逐字节命中** | ✅ |
| EC-NDA-016 三分支 | 皆「否」 | 越生效上限/越档/越绝对上限 = **否/否/否** | ✅ |
| FR-NDA-145 不跨列混算 | A 列 Σ +2,050 B（叶1 637 + 叶2 1,413） | 一致；B 列不计账 | ✅ |
| NFR-NDA-007 载体 | KIND_SET 40 / ACT_TO_OP 6 / 零宿主 | 40 / 6 / `[]` | ✅ |
| FR-NDA-130 门禁守恒 | `CHROMIUM_GATES===9` | **9** | ✅ |

### 3.5 漂移检测

| 漂移类型 | 检测命令/方法 | 结果 |
|---------|-------------|------|
| 孤立代码（有代码无需求） | 工作树改动集 vs plan §5 | ✅ 无（叶2 = `next-drive-policy.ts` NEW + `service-worker.ts`/`definition.ts`/`providers.ts`/`sidepanel.ts` MODIFY；其余 `ai-next.ts`/`host.ts`/`ref-context.ts`/`recommend.ts`/`next-tool.ts` 属叶1） |
| 需求缺失（有需求无代码） | 8 目标 vs 产物 | ✅ 无（10 交付物逐项落地，V5~V12 覆盖） |
| 规格漂移（spec 被修改） | `spec.md` mtime + 内容 | ✅ 无（mtime 停在 spec 相位 13:19；实现未反改 spec） |
| 文档漂移（plan/ADR 命名 I-2） | grep 旧名 | ⚠️ 叶内**已清零**（plan.md/ADR-201 于 21:32 更新 = 登记的 I-2 文档对齐）；**父级** `specs-tree-web-cli-plugin-v55-f-next-drive-accuracy/{plan.md,tasks.md,ADR-NDA-007}` 仍含旧名 —— 属**已登记 openItem**（超本叶改动集，留父级收口轮） |
| 断言删除 | `xNdaGateReconciliation` 25 行 `assertionsRemoved` | ✅ 全 0 |
| 断言降级（test( 调用点） | HEAD vs 工作树逐文件计数 | ✅ 只增不减（ai-next 18→28 / free-input 23→27 / gate-integrity 26→27 / supersession 53→56，余持平） |

**§3.5.1 规格漂移边界如实声明**：`.sddu/**` 属未纳入 git 的产物区（`git status` 显示为未跟踪），本报告以 mtime + 语义一致性判定「未反改 spec / plan 语义」；plan.md 于 21:32 的改动 = 修复轮 **I-2 命名对齐**（登记于 `build.md §6.2` / `state.json#reviewFix`），**非静默漂移**。

### 3.6 I-1 新边界双向复核（review §5 I-1，题眼）

| 方向 | 注入构造 | 期望判定 | 实测 | 判定 |
|------|---------|---------|------|:--:|
| ① 调用 `next` 但空候选（`captured=true, candidates=[]`） | `abnormalVerdict({completed,0,0,captured:true})` | **`null`**（健康「无建议」⇒ 走确定性兜底 / free-input 终端，**不得**推「配置新 LLM」） | `null` | ✅ |
| ② 真未调用（`captured=false`） | `abnormalVerdict({completed,0,0,captured:false})` | **`no-tool-call`**（提醒补一次 → 仍失败 → 兜底） | `no-tool-call` | ✅ |

**「注入必红」实测（真跑，非静态）**：

| # | 注入 | 命令 | 结果 |
|:-:|------|------|:--:|
| ① | 删 `next-drive-policy.ts` 的 `if (f.captured) return null;`（回退旧语义） | 重编译 + `node --test --test-name-pattern="AI-N-17"` | ❌ **FAIL**：`I-1：调用但空候选 ⇒ 合法「无建议」` — actual `no-tool-call` / expected `null` |
| ② | 删 `service-worker.ts` 的 `, captured: capture.captured` | 同上 | ❌ **FAIL**：`SW 必须把 captured（capture.captured）传入 abnormalVerdict（「调用但空候选」边界）` |
| — | 逐字节还原（sha256 `OK`）后复跑 | 同上 | ✅ **PASS**（1/0） |

> `review-report.md` 的 **I-1（语义 bug，中）** 经 R1-FIX 修复后，本轮**独立复现**了其宣称的两条注入必红（actual/expected 逐字命中）与还原复绿。**I-1 已闭合**。

### 3.7 `KL-N-10` flake 隔离复跑（EC-NDA-025 / FR-NDA-136）

| 门禁 | 第 1 跑 | 第 2 跑 | 第 3 跑 | 失败项签名 | 判定 |
|------|:--:|:--:|:--:|------|:--:|
| `s0-self-driven` | 101 / 2 | 100 / 3 | — | `S0C-14` / `S0C-15`（两跑共有）+ `S0C-13 A`（仅第 2 跑）；全部 `rule:"risk-recovery"`（probe 恢复卡抢槽，`terminalLast` 漂移） | ⚠️ 环境 flake |
| `recommendation` | 84 / 1 | 83 / 3 | **85 / 0** | 第 1 跑 = `★ ADN-2 S0'''`（同 probe 根因）；第 2 跑 = `④ settled` / `⑭ 授权 chip`×2（不同项） | ⚠️ 环境 flake |

**根因（同 build §1.4 / review C28）**：headless 沙箱内 `probe.steady` 未及时置稳 ⇒ `risk-recovery`（priority 0，probe 触发）抢在 `ai-led` 之前出卡。**失败项随复跑漂移**（非固定集）⇒ 判**环境时序 flake**，非本叶确定性回归。**叶内新增判据块**（NDA-2 分相三相 / ND-11 / law8 ⑬）在全部复跑中**恒绿**。按 `KL-N-10`：如实记录、不阻塞收口、不改判据、不伪造串行绿。

---

## 4. 验证脚本执行记录

> ADR-003 落地：validate Agent 自主编写并直接执行；路径约定 `/tmp/sddu-validate-nda-2-<timestamp>/`（本轮 = `/tmp/sddu-validate-nda-2-20260927-213631/`）。**注意**：注入实验后两源码文件已 `sha256sum -c` 逐字节还原（`OK`），版本库未留残留。

| 脚本文件 | 用途 | 对应场景 | 退出码 | 关键输出 |
|---------|------|:--:|:--:|---------|
| `author-caliber-e2e.mjs` | 直读编译产物复核作者口径（未配置/已配置/异常兜底/提醒/闭集），22 断言 | V5~V9 | 0 | `AUTHOR-CALIBER E2E: 22 passed / 0 failed` |
| `compile-and-run-ain17.sh` | 重编译 `dist-test` 后跑 `AI-N-17` 定向（注入实验主驱动） | V5 | 0¹ | 注入①/②：`RUN rc=1`（fail=1）；还原：`RUN rc=0`（pass=1） |
| `constants-check.mjs` | 从编译产物机核常量守恒 + `CHROMIUM_GATES` | V11 | 0 | 11 项常量 + 门禁数逐字命中 |
| `run-gate.sh` | 统一门禁运行器（记录 rc / tests / pass / fail / secs） | V2~V4、V14 | — | 见 §3.1 表 |
| `protected-segments.json`（+ 内联 python 分段哈希） | 保护段 journey/binding 分段 `sha256` | V10 | 0 | journey `7b309258aab7…` / binding `be9ad0e98367…` |
| （内联）ledger 机核 python | `xNdaLedger*`/`assertionsRemoved`/`CHROMIUM_GATES` 结构化机核 | V12 | 0 | 12 / 25 / 0 / 7-1-4 / 9 |
| （内联）git 对账 | 红线 `git diff` ×9 + test( HEAD↔工作树计数 + mtime/旧名扫描 | V10 / V13 | 0 | diff 全 0；test( 只增不减；spec 零漂移 |

> ¹ `compile-and-run-ain17.sh` 的 rc 随实验预期变化（注入期 1 / 还原期 0）；脚本内含编译失败即中止（rc=9）的护栏。

**日志留档**：`gates/`（`npm-test.log` / `typecheck.log` / `build.log` / 各门禁 `.log` / `ain17-inj1.log` / `ain17-inj2.log` / `ain17-restored.log` / `author-caliber-e2e.log` / `constants-check.log`）、`orig/orig.sha256`（还原锚）。

---

## 5. 阻塞问题

| # | 位置 | 问题 | 对应 Vx | 修复建议 |
|---|------|------|:--:|---------|
| — | — | **无阻塞问题（0）** | — | — |

**非阻塞留观项（如实登记，不阻塞收口）**：

| # | 项 | 状态 |
|:-:|---|---|
| N-1 | `test:s0-self-driven` / `test:recommendation` 环境 flake（`probe.steady` 时序） | ⚠️ 隔离复跑 ≥2 判定 flake；叶内新增判据恒绿；**建议**后续统一加固 probe 置稳等待（跨叶共性，非本叶） |
| N-2 | plan/ADR 命名父级残留（`LLM_ABNORMAL_CODES` / `AiNextAbnormalCode`） | 叶内已清零（I-2）；父级留收口轮对齐（已登记 `state.json#openItems`） |
| N-3 | `PD-NDA-001`（首开 AI 化）/ `PD-NDA-016`（提醒时点早一步） | 登记，不转正；首开保持确定性 |
| N-4 | 叶2 A 列 +1,413 B 越 ADR 叶预算 13 B | 如实登记（在 spec §5.14.1 包线内；未跨档，距档 7,748） |
| N-5 | 真实 LLM 观感（I-6）/ 人工面 M1~M6 | ⏭️ 本环境不可执行（需真实浏览器 + 人工）—— 不冒充 PASS |

---

## 6. 结论

**结论**: ⚠️ **有条件通过**

**指标达标矩阵**：

| 指标 | 要求 | 实测 | 达标？ |
|------|------|------|:--:|
| FR 测试覆盖 | 100% | 8/8 目标（≈42 父 FR 切片）均有 Vx 覆盖且通过 | ✅ |
| NFR 测试覆盖 | ≥80% | 16/16 有对应验证（NFR-NDA-010 终态有效覆盖） | ✅ |
| 构建退出码 | 0 | typecheck 0 / build 0 | ✅ |
| 阻塞问题数 | 0 | **0** | ✅ |
| 漂移项 | 0 | 严重漂移 0（文档父级残留 1 项已登记，非本叶） | ✅ |
| 全量回归 | ≥1525 / 0 | **1525 / 0** | ✅ |
| 红线（基座/冻结面/保护段） | 零改 | diff 全 0 ∧ sha 命中 ∧ 保护段段 sha 命中 | ✅ |
| 断言零删除 | `assertionsRemoved=0` | 25 行全 0 | ✅ |
| I-1 修复闭合 | 双向分相 + 注入必红 | 两方向分相 ∧ 两注入必红 ∧ 还原绿 | ✅ |

**理由**：本叶价值全在**可判性**与**治理不失血**。本轮**动手验证**确认：① 四条链（未配置确定性引导 / 自由输入分相 / 提醒补一次 / 异常兜底）均落地且**可 FAIL**（I-1 双向注入必红 + 作者口径 22/22 端到端复核）；② 治理面零失血（`npm test 1525/0`、体积 606,652 B 逐字节命中、三冻结面 sha 双锚、保护段分段 sha 命中、`assertionsRemoved=0`、`CHROMIUM_GATES===9`）；③ 零改基座 / 零规格漂移。唯一非达标项是 `s0-self-driven` / `recommendation` 的**环境时序 flake**（`probe.steady`，隔离复跑 ≥2 判为 flake，且叶内新增判据在全部复跑中恒绿），按 `KL-N-10` 如实登记、不阻塞。据此结论为 **⚠️ 有条件通过（0 阻塞）**。

**证据边界（如实声明）**：真实 LLM 端到端观感（review I-6 / `PD-NDA-016`）与人工面 M1~M6 需真实浏览器 + 人工观察，本环境**不可执行**，已标 ⏭️，**未冒充 PASS**。`.sddu/**` 未纳入 git ⇒ 规格漂移以 mtime + 语义一致性判定（见 §3.5.1）。

---

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建（叶2 R1 动手验证：V1~V14 逐项实测；全门禁独立复跑（npm test 1525/0 · ai-next 28/0 · supersession 56/0 · gate-integrity 27/0 · size-ruling-vol3 14/0 · law8 72/0 · dead-end 56/0 · density 242/0 · insight/e2e PASS）；I-1 新边界双向 + 两注入必红并逐字节还原；作者口径端到端 22/22；红线/保护段/体积/台账机核命中；s0-self-driven 101/2·100/3 与 recommendation 84/1·83/3·85/0 判为环境 flake（KL-N-10 如实登记）；结论 ⚠️ 有条件通过 / **0 阻塞**） | 2026-09-27 | SDDU Validate Agent |
