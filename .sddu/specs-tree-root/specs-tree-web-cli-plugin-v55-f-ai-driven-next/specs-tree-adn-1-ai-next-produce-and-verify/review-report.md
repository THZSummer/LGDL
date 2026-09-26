# 审查报告：specs-tree-adn-1-ai-next-produce-and-verify

> **文档定位**: SDDU 审查报告 — 逐项记录自主审查的执行结果，作为 validate 阶段的输入
> **审查策略**: `review.md`（C1~C24 审查清单及四维度指引）
> **前置依赖**: `review.md`、本叶 `spec.md`（v1.0）、`plan.md`（v1.0）、`build.md`（v1.1）、父 ADR-ADN-001~010
> **创建人**: SDDU Review Agent
> **创建时间**: 2026-09-26
> **审查轮次**: R1
> **版本**: v1.0
> **更新人**: SDDU Review Agent
> **更新时间**: 2026-09-26
> **更新说明**: 初始创建（R1 执行报告；基线 HEAD `31f4622`，R1 `ae39b87` + R2 `7cd0ad8`，27/27 任务）

---

## 1. 审查概要

| 维度 | 数值 |
|------|:--:|
| 审查项总数 | 24 |
| 通过 | 23 |
| 警告 | 1 |
| 失败 | 0 |
| 阻塞问题 | 0 |

**被审范围**：`packages/web-cli-plugin` —— 12 个 `src/**` 生产文件（1 NEW + 11 MODIFY）、`test/ai-next-candidate.test.ts`（NEW）、`test/ui/fixtures/s0-chain.mjs`、`test/ui/s0-self-driven.mjs`、`test/ui/law8-plaintext.mjs`、6 个等价重锚门禁、`docs/v4-supersession-ledger.json`、`test/size-baseline.ts`。

**基线核验**：仓库 `/home/usb/wks/gits/GitHub/LGDL`，分支 `feature/web-cli-plugin`，HEAD `31f4622`，工作树干净；R1 = `ae39b87`（W01+W02 / TASK-ADN-101~117），R2 = `7cd0ad8`（W03 / TASK-ADN-118~127）。

### 1.1 亲跑证据总表（review 亲验，非转述）

| 命令 | 结果 | 与 build.md 声称 |
|---|---|---|
| `npm test`（全量 node） | **1478 / 0**（duration ≈278s） | ✅ 一致 |
| `npm run build`（独立重建） | EXIT 0；`dist/sidepanel.js` **603,205 B** / `dist/background.js` **1,641,872 B**；`content.js`（177,076 B，sha `52a82620…`）与 `pick-layer.js`（34,358 B，sha `77796bab…`）**逐字节不变** | ✅ 一致 |
| `npm run test:law8` | **64 / 0**（含新增 ⑪ AI 候选 label / 留痕零明文） | ✅ 一致 |
| `npm run test:gate-integrity` | **25 / 0**；`EXPECTED_AUDITED_FILES.length === 48`（末位 `ai-next-candidate`，恰出现 1 次）；`CHROMIUM_GATES === 9` | ✅ 一致 |
| `npm run test:supersession` | **51 / 0**；binding 保段 sha `be9ad0e9…` + startByte 107780 双绿；X5 逐行五要素齐备（603,205 B 同源） | ✅ 一致 |
| `npm run test:size-ruling-vol3` | **14 / 0** | ✅ 一致 |
| `npm run test:ref-pick-wiring` | **11 / 0** | ✅ |
| `npm run test:dead-end` | **53 / 0** | ✅ 一致 |
| `npm run test:s0-self-driven` | **3 轮：88/2、88/2、86/4**（未复现 90/0） | ⚠️ 见 I-1 |
| `npm run test:recommendation` | 2 轮：78/3（④+⑭×2）、79/1（④） | ⚠️ 见 O-1（④/⑭ 为既有环境 flake，非 ADN-1 面） |
| 独立注入脚本（审查自建，非仓库测试） | **全部 PASS**（见 §2 证据） | — |

---

## 2. 逐项审查结果（C1~C24）

| # | 审查对象 | 审查基准 | 评估 | 发现 | 严重程度 |
|---|---------|---------|:--:|------|:--:|
| C1 | `ChatResultEvent.aiNext?` 载体 | FR-ADN-011/018 · NFR-ADN-007 | ✅ | 单声明 type-only 加法字段；`messaging.ts` 零 diff ⇒ `KIND_SET` **逐字 40** 且 `aiNext ∉ kind`（亲验）；缺席 ⇒ 不附加字段 | 低 |
| C2 | 候选结构 + 缺 `opId` 非法 | FR-ADN-012 | ✅ | `admitCandidate` 首判 `opId`；缺/非字符串 ⇒ `unknown-op`；独立注入：`op.ghost ⇒ unknown-op` | 低 |
| C3 | 产出者声明三要素 + 零值 | FR-ADN-013 · NFR-ADN-016 | ✅ | `DRIVER_DECLS_SRC['ai-next'] = {timings:['idle'], driverClass:'ai-driven', priority:2, evidence:['session.aiNext']}`；`driverBlockedLine` 渲染 = `driver=ai-next \| timing=idle \| evidence=session.aiNext \| blocked=tier`（只字段名，零值） | 低 |
| C4 | `ai-next` provider / `PRIORITY` 4 / `chipsFor` 权威 | FR-ADN-014 · ADR-ADN-004 §② | ✅ | 第 12 行 `rule:'ref-action' + prepend:true + priority:2`；`NEXTSTEP_PRIORITY` 恒 4；独立实跑：AI 在场 ⇒ `ref-action` 槽 chips = AI label（替换陈旧候选）；缺席 ⇒ 确定性文案逐字 | 低 |
| C5 | 注入槽 + 顶层 7 源 | FR-ADN-015 · NFR-ADN-013 | ✅ | `NextCtx.session.aiNext?`（4 空格嵌套）/ `RecommendInput.session.aiNext?`；模块白名单恒 5、真值白名单恒 7（门禁 + 走查） | 低 |
| C6 | 解析 + 校验在 SW（B 列） | FR-ADN-016 · ADR-ADN-002 §② | ✅ | `service-worker.ts#onFinish` 唯一装配点；面板只收 `accepted`（`chipsFor` 只取 `opId`）；`sw-op-mirror` 门禁绿 | 低 |
| C7 | 零新 LLM / `recommend.ts` pure / 无引用基座逐字 | FR-ADN-017 · FR-CHAT-060 | ✅ | `refContextSegment` 仅在 `valid.length>0` 分支追加 `NEXT_CONTRACT_GUIDANCE` ⇒ 无引用仍 `''`；独立正则抽核 `recommend.ts` 零 `fetch(`/`chrome.`/`Date.now(`；RCT-3 门禁绿 | 低 |
| C8 | 未配置 ⇒ 零候选零网络 | FR-ADN-019 · EC-ADN-008 | ✅ | `lastAssistantText` 缺席 ⇒ `validateAiNext` 返回空 ⇒ `hasAiNext=false` ⇒ 不附 `aiNext`；S0''' D 支线 node 面实跑（`unconfiguredCandidates===0` / `unconfiguredNetwork===0`） | 低 |
| C9 | ①② 在册 / 三档 / gesture 恒拒 / confirm 可提案 / **顺序即优先级** | FR-ADN-020~023/027 | ✅ | 独立注入：幻觉 op⇒`unknown-op`、gesture⇒`tier`、`op.turn`+坏 ref⇒`ref`；顺序反证：未知 op+坏 ref⇒**只** `unknown-op`、gesture+坏 ref⇒**只** `tier` | 低 |
| C10 | ③ ref 有效（本回合快照） | FR-ADN-024 | ✅ | `refAdmitted` 要求 `refState==='valid'` ∧ (`refId` ∨ `ref_<n>`)；独立：裸数字/`#3`/选择器⇒`ref`、失效 `ref_7`⇒`ref`、命中 `ref_3`⇒接受、缺席⇒通过 | 低 |
| C11 | ④ param 与 `AskSpec` 相容 + `ask` 单源 | FR-ADN-025 | ✅ | `OpDescriptor.ask?` 单声明（恰 1 处）；`ask===undefined ⟺ ops.ts#IMPL params===null` 逐行机核（AI-N-11）；独立：无 ask 带参⇒`param`、数组/空串/超长⇒`param`、`op.llm-config` 合法串⇒接受 | 低 |
| C12 | ⑤ 丢弃 + 留痕（闭集 5 枚；零明文/不死端） | FR-ADN-026 · NFR-ADN-004/016 | ✅ | `AI_NEXT_BLOCKED_CODES` 逐字 `['unknown-op','tier','ref','param','label']`；`driverBlockedLine` 零值；law8 ⑪ 亲跑零明文 | 低 |
| C13 | 判定分层 + `pressDecision` **diff=0** | FR-ADN-030~035 · ADR-ADN-003 | ✅ | `ai-drive.ts` diff **仅新增 11 行**（`driverBlockedLine`），`pressDecision` 函数体零改；独立真值表：`op.turn`(auto) 接受可按下 / `op.llm-config`(confirm) 接受但 `blocked:tier` / `op.authorize`(gesture) 连接受都拒；双向反证（拒 confirm ⇒ 红、放行 gesture ⇒ 红） | 低 |
| C14 | 纯函数校验器 + 真源切片 | FR-ADN-028 · NFR-ADN-009 | ✅ | `ai-next.ts` 零 DOM/时钟/IO/chrome/fetch（独立正则 + 门禁）；只读 `shared/op-table` 与回合 refs 载荷；依赖面耦合见 I-3 | 低 |
| C15 | 五类注入反证族 + 逐字节还原 | FR-ADN-029 · EC-ADN-017/018 | ✅ | 审查自建独立脚本（非仓库测试）亲跑 39 项全 PASS：五类注入逐类被拦、拒绝码闭集 5、`pressDecision` 分层、载体计数、解析纪律、`label` 先扫后截、`requestTurn(` 调用点恰 1；门禁侧 `carrierProblems` 注入第 41 kind / 第 13 kind / 新宿主 / 第 7 行 ⇒ 必红 + sha256 还原 | 低 |
| C16 | S0''' 四支线双面 + 判据禁恒真 | FR-ADN-080/081/082/085 · ADR-ADN-007 | ⚠️ | **node 面**：`s0pppProblems` 十环节全绿 + 反证（未校验候选进 chips / 终端缺失 / 五类漏判 / D 未配置却产出 / 载体重线 ⇒ 各必红）；**Chromium 面**：A 支线断言 **3 轮中 2 轮红**（`rule: risk-recovery` 抢占 priority-0 恢复槽），未复现 build 记录的 90/0 —— 见 **I-1** | 中 |
| C17 | `DRIVER_DECLS_SRC` 12↔12 + evidence 同源 + 旧 11 行逐字 | FR-ADN-096 · ADR-ADN-010 §① | ✅ | 独立计数：声明表 12 / provider 12 / `ACT_TO_OP` 6 / `DRIVER_TIMINGS` 5；DQ-1/DQ-3/NR-10/AI-N-9 门禁绿；`ai-next` evidence=when-scope=`session.aiNext` | 低 |
| C18 | 断言只增 + 新门禁入下界 48 + `CHROMIUM_GATES` 9 | FR-ADN-110~115 · AC-ADN-022 | ✅ | `EXPECTED_AUDITED_FILES.length===48`（末位只追加 `ai-next-candidate`，恰 1 次）；6 升级门禁 diff 均"只增不减"；`V_ADN_NODE_GATE_FILES` 注释陈旧 —— 见 **I-2** | 低 |
| C19 | B 列归因 / 体积五要素同源 | FR-ADN-120~125 · NFR-ADN-001 | ✅ | `npm run build` metafile 同源；`adn1Rows` Σ = 1508+2033+237+154+139+94+58+56 = **4,279** + glue 0；前值 598,926 / 后值 603,205 / 日期 / 来源 / 理由五要素齐 | 低 |
| C20 | 越叶预算登记诚实性 | NFR-ADN-001 · R-ADN-006 | ✅ | ADR-ADN-008 §② 预算 +0.8~2.0 KB 被 +4,279 B 超越：**不删判据 / 不放宽容差**，`baselineAfterBytes=603,205`、`authorConfirmation='pending-author-line'`（不伪称已确认）、EC-ADN-016 三态显式"否"、B 列 +5,251 B 标注"不计账" | 低 |
| C21 | 特权恒 gesture / AI 不代答 consent | NFR-ADN-002/003 · EC-ADN-018 | ✅ | 独立：`tierOf(op.authorize)=gesture`、`tierOf(op.perm.request)=gesture`，`admitCandidate` 即拒；`ai-drive.ts` 无 `consent` 通道（正则）；`SW` 零 `permissions.request(` | 低 |
| C22 | 法八四面零明文 | NFR-ADN-004 · EC-ADN-014 | ✅ | `assertNoPlaintext` 先扫后截（截断不掩护泄漏）；`test:law8` **64/0**（R1 60 ⇒ +4，零降级）含 ⑪ AI 面；超长干净 label 截到 48 | 低 |
| C23 | 三冻结面 + `zeroDiffFiles` 9 + 保段 | NFR-ADN-005 · ADR-ADN-010 §③ | ✅ | 独立重建：`content.js` / `pick-layer.js` 逐字节同 sha；`git diff 99839d5..31f4622`：`manifest.json` / `web-cli-base/**` / `policy.ts` / `auto-authorize.ts` / 9 项 `zeroDiffFiles` **全 0 diff**；`journey.mjs` / `binding.mjs` 零改动；`test:supersession` 保段双绿 | 低 |
| C24 | X-ADN 台账骨架 + 门禁对账 | FR-ADN-090/096/101/112 · ADR-ADN-010 §①② | ✅ | 叶1 在册 8 行：`superseded`×2（X-1 产出权转移 / X-7 12↔12）+ `no-supersession`×6（X-2/3/4/5/6/9，理由非空）；X-8/10/11 **移交叶2**（未伪称已取代）；门禁对账 新增 1 + 升级 6 + 间接面，`assertionsRemoved=0`；见 O-4 口径说明 | 低 |

**规范符合性偏差 = 0 项**（无 FR/NFR/EC 未实现或违背项）。

---

## 3. 审查维度汇总

| 审查维度 | 审查项数 | 通过 | 警告 | 失败 | 通过率 |
|---------|:--:|:--:|:--:|:--:|:--:|
| 代码质量 | 2 | 2 | 0 | 0 | 100% |
| 规范符合性 | 14 | 14 | 0 | 0 | 100% |
| 架构一致性 | 5 | 5 | 0 | 0 | 100% |
| 测试质量 | 3 | 2 | 1 | 0 | 67% |
| **合计** | **24** | **23** | **1** | **0** | **95.8%** |

> 代码质量 2 项 = C14 + 命名/职责/错误处理/硬编码抽检；规范符合性 14 项 = C1~C4、C7~C13、C17、C20~C22；架构一致性 5 项 = C5/C6/C19/C23/C24；测试质量 3 项 = C15/C16/C18。

---

## 4. 阻塞问题

| # | 位置 | 问题 | 对应 Cx | 修复建议 |
|---|------|------|:--:|---------|
| — | — | **无阻塞问题** | — | — |

> 安全核心 5 道校验链（幻觉 op / gesture / 越界 ref / 越界 param / label 凭据）由审查独立脚本逐类亲测**全部被拦**；判定分层（`confirm` 可见不可自动按下、`gesture` 连接受都拒）亲测成立；零新增载体（`KIND_SET` 40 / 12 kind / 零宿主 / `ACT_TO_OP` 6）亲测成立；`pressDecision` diff=0 亲测成立。**不存在触达特权 / 不可逆面的路径**。

---

## 5. 改进建议

| # | 位置 | 问题 | 对应 Cx | 建议 |
|---|------|------|:--:|------|
| I-1 | `test/ui/s0-self-driven.mjs:1392-1423`（S0C-13 A） | **Chromium A 支线断言 flaky**：3 轮亲跑 = 88/2、88/2、86/4，**未复现 build 记录的 90/0**。A 断言 `rule === 'ref-action'`，但当面板 ref 源出现 stale / 恢复条件时，priority-0 `risk-recovery` 会**正确地**抢占 `ref-action` 槽（即同文件 ⑦A 已登记的"环境探测相位可让恢复类优先"），A 断言未做同等宽容 ⇒ 间歇红。`build.md` §5.1-9 记"落点与 S0C-13 无交集"**不准确**。 | C16 | 二选一：**(a)** 按 ⑦A 先例放宽 A 的规则断言为闭集 ∧ 强制干净 ref 前置（清 `stale()` / 复位 `state.invalidated`）；或 **(b)** 保留严格断言但前置"注入前强制 recompute + 轮询到 ref-action 槽可用"。同时**如实更正** `build.md` 的 flake 登记（A 支线确有 flake，非"无交集"）。安全语义不受影响（node 面 `S0PPP-4` 已确定性覆盖替换语义，且 A 支线在 run2 转绿）。 |
| I-2 | `test/gate-integrity.test.ts:372-382`（`V_ADN_NODE_GATE_FILES` JSDoc） | 注释写"`EXPECTED_AUDITED_FILES` 下界 **+1**（R2 实测 **40 → 41**）"，与同文件断言及 `build.md` 的 **47 → 48** 不一致（陈旧字面残留）。判据本体正确（实测 48），仅注释失真。 | C18 | 把注释改为"R1 现场实测 47 ⇒ 本叶 +1 = 48（`COR-ADN-3` 按语义增量重锚，不照抄陈旧字面 40）"，与断言/台账同源。 |
| I-3 | `src/background/ai-next.ts:26` | `background` 侧**值导入** `../ui/sidepanel/stream-digest.ts#assertNoPlaintext` —— 这是本叶引入的**首个 background→ui 运行期耦合**（`chat-events.ts` 的 ui 导入为 type-only，会擦除），使 B 列 bundle 拉入 UI 模块。ADR-ADN-002 §① 只指定"复用既有零明文 caliber"，未规定落点。**不违反任何门禁**（无背景不得导入 UI 的判据），但削弱 B 列"SW 自足"的边界清晰度。 | C14 | 建议后续轮将零明文 caliber 上移到 `src/shared/`（或 `background/`）单一实现，两侧共用；本轮可接受（已在 B 列体积如实归因）。 |

---

## 6. 结论

**结论**: ✅ **通过**（⚠️ 有条件通过 —— 0 阻塞，3 改进建议；安全核心 24 项中 23 项通过、1 项（C16）为 Chromium 测试面环境 flake，无安全语义缺陷）

| 指标 | 结果 |
|------|------|
| 审查通过率 | 95.8%（23/24；安全维度关键项全部 ✅） |
| 阻塞问题数 | **0** |
| 规范符合性偏差 | **0** 项 |
| 可进入 validate | **是** |

**理由**：
1. **安全核心 100% 成立**（R-ADN-001 闭环）：5 道校验链逐类注入亲测被拦（`unknown-op` / `tier` / `ref` / `param` / `label`），拒绝码闭集恰 5 枚；判定分层 (`admitCandidate` 接受 ≠ `pressDecision` 按下) 与 `pressDecision` diff=0 双向反证成立；特权 op 恒 `gesture` 且接受层即拒；`confirm` 可提案但 AI 不可代按；载体纪律（`KIND_SET` 40 / 12 kind / 零宿主 / `ACT_TO_OP` 6）逐字不动。
2. **通道与兼容**：`chat-result{aiNext?}` type-only 加法字段、零新增 kind、缺席逐字；`recommend.ts` 仍 pure；无引用 ⇒ 基座逐字（FR-CHAT-060 不破）；零新 LLM 调用。
3. **门禁与台账**：新增 `ai-next-candidate` 入受审下界（实测 **48**）、6 门禁等价重锚（只增不减）、X-ADN 叶1 骨架如实（2 superseded + 6 no-supersession + X-8/10/11 移交叶2）；自跑 `npm test` **1478/0**、`law8` **64/0**、`supersession` **51/0**、`gate-integrity` **25/0**。
4. **体积诚实**：独立重建 `dist/sidepanel.js` = **603,205 B**；越叶预算 +4,279 B **如实登记不停机**（不删判据 / 不放宽容差 / 不搬列规避），`authorConfirmation` 标注 `pending-author-line`。
5. **红线零触碰**：`content.js` / `pick-layer.js` 重建后逐字节同 sha；`manifest` / `web-cli-base` / 判定链 / 9 项 `zeroDiffFiles` 全零 diff；journey / binding 保段双绿。
6. **改进项**：I-1（Chromium S0C-13 A flaky，建议加固 + 更正登记）、I-2（门禁注释陈旧字面）、I-3（background→ui 零明文字段耦合，建议后续上移 shared）——均非阻塞，建议 validate 前处置 I-1/I-2。

**遗留观察（O，非改进项）**：
- **O-1**：`test:recommendation` 亲跑未复现 79/0（最好 79/1），红点 ④ `settled 态必有可行动卡且规则 ∈ 闭集` 为**基线既有**判据（`99839d5` 已存在、ADN-1 零改动），与环境探测相位相关；⑭ 授权 chip 亦为既有 flake。与 ADN-1 面无交集。
- **O-2**：`NEXT_CONTRACT_GUIDANCE` 仅引导模型提议 5 个 `auto` 档 op（`op.turn/pick/describe/rebind/help`），而校验器对 `confirm` 档**接受**（FR-ADN-023）。属 B 轨保守引导，非判据放宽；如产品希望 AI 提议 `op.llm-config` 等，需同步更新契约句。
- **O-3**：`params` **未**过 `assertNoPlaintext`（仅 `label`），但 `params` 既**不渲染**也**不派发**（ADR-ADN-002 §③ 诚实登记），无泄漏面；若未来参数化派发落地，须补 `params` 零明文面。
- **O-4**：用户口径"X-ADN 台账 4 已发生/6 未发生/1 等价重锚"是**跨叶终态计数**（ADR-ADN-010 §①：X-1/7/8/11 已发生、X-2/3/4/5/6/9 未发生、X-10 等价重锚）；叶1 台账**只登记其在册 8 行**（2 superseded + 6 no-supersession）并把 X-8/10/11 **移交叶2**，与 ADR-ADN-010 §② 分工**一致且如实**（不伪称未落地者已取代）。

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建（R1 执行报告）：四维度 C1~C24 逐项结果；独立注入脚本亲跑（39 项全 PASS）；npm/门禁/Chromium 亲跑实测；0 阻塞 + 3 改进 + 4 观察 | 2026-09-26 | SDDU Review Agent |
