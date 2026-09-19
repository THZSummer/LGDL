# 验证报告：specs-tree-v4-3-ask-auth-inflow（V4-3 ask-user / 授权卡流内化与留痕固化）

> **文档定位**: SDDU 验证报告 — 逐项记录自主验证的执行结果，作为工作流终点
> **验证策略**: `validate.md`（V1~V9 自主验证场景 + FR/NFR/EC→Vx 覆盖矩阵 + 五维度判据）
> **前置依赖**: `validate.md`、本叶 `spec.md` v1.0、`review-report.md`（R1，4 阻塞已修复待验证）、本叶 `build.md` v3.0（review 修复轮）
> **创建人**: SDDU Validate Agent
> **创建时间**: 2026-09-19
> **验证轮次**: V1（review 修复轮后的独立动态验证）
> **版本**: v1.0
> **更新人**: SDDU Validate Agent
> **更新时间**: 2026-09-19
> **更新说明**: 初始创建。**被验基线**：仓库 `/home/usb/wks/gits/GitHub/LGDL` · 分支 `feature/web-cli-plugin` · HEAD `c88811b`（v4-3 review 修复轮）。**纪律**：全程只读（探针全部写 `/tmp/opencode/v4-validate-v4-3/`，未改任何源码 / 测试 / 台账 / 产物；`git status` 验证前后干净）；门禁严格串行（一次一个 Chromium）、日志全量落盘；对抗优先。

---

## 1. 验证概要

| 维度 | 数值 |
|------|:--:|
| 验证项总数 | **9**（V1~V9） |
| 通过 | **9** |
| 失败 | **0** |
| 无法执行 | **0**（本叶无 N/A 场景） |
| 阻塞问题 | **0** |
| 非阻塞登记（N） | **3**（N-01 ledger 自描述读数滞后 / N-02 build §7 宿主计数 / N-03 ADR-V4-032 §2 字面 vs 代码） |
| 独立探针断言总数 | **V2/V4/V5 29 + V3 240,748 + V7 10 + Chromium 15 = 240,802** 条，**0 失败** |
| 门禁独立复跑 | 22/22 `exit=0`（与 build §10.6 登记逐项一致） |

**一句话结论**：审查抓过的 **4 个洞（BLOCK-01~04）在独立对抗下全部无法复现**——auth 卡三路径只渲染「已取消（未授权，不执行）」、伪造 approved 事件被终态冻结拒绝、ref-round 回合结束不写假超时、审计入口真实可达；终态机 **10,000 序列 / 240,748 断言零漏洞**；22 门禁 + 计数对账全绿。**✅ 通过**，附 3 项非阻塞登记。

---

## 2. 逐项验证结果（V1~V9）

| # | 验证对象 | 验证步骤 | 预期结果 | 实测结果 | 判定 |
|---|---------|---------|---------|---------|:--:|
| V1 | 22 门禁 + RP-V4-09 独立复跑 | 严格串行重跑全部 22 项；对账 build §10.6 计数 | 全 0；计数只增不减 | **22/22 `exit=0`**；npm 945/0、ask-auth 61/0、l1 111/0、supersession 31/0、l0 216/0 …（详见 §3.3） | ✅ |
| V2 | 假留痕对抗（4 洞） | ①三路径 auth cancelled 渲染 ②DOM 伪造 approved ③ref-round 回合结束 ④审计入口 | 四攻全败；无假「已批准」/假「超时」 | ① 9/9 ② 4/4 ③ 4/4 ④ 3/3 全绿（§4 对抗表） | ✅ |
| V3 | 终态机全路径遍历 | 10000 序列（10 操作字母表^4）+ 7 定向竞态 | 无漏路径 / 无越界终态 | **10000 序列 · 240,748 断言 · 0 fail**；7 边界全绿（§4.2） | ✅ |
| V4 | 答案真值 | node + Chromium：answered / 改选 / 取消 → L1 历史 | 文案 = 卡终态真值 | answered「查看站点声明」/ 改选 changed=true / 取消「已取消（用户）」（§4.3） | ✅ |
| V5 | 零明文 | 4 类 marker 注入 answer/prompt/label → 读回 | 摘要无自由文本、工厂 fail-closed、渲染零命中 | 9/9 全绿；`digestEntryOf` 字段 ⊆ 11 白名单；4 marker 全部抛错（§4.4） | ✅ |
| V6 | 展开态预算（I-03） | Chromium：收起/展开/两卡 + 自注入破坏 | 收起≤6 / 展开≤6 / 两卡≤8 / 注入必红 | 收起=4、展开=4、两卡合计=8、注入 ⇒ 14>8 必红、还原回绿（§4.5） | ✅ |
| V7 | R1 语义等价全链 | 后台提问→拾取→取代双留痕→ref-round 卡→回答→AI 继续 | 全链可读、无假超时、不掉线 | 10/10 全绿（§4.6） | ✅ |
| V8 | 规范 + 红线 + 体积 | AC 逐条 / redline diff / 五要素 / 保护段 | AC 全绿、0 diff、五要素一致 | 见 §3.4 / §3.7；红线逐项 0 变更 | ✅ |
| V9 | 修复落地抽查 | BLOCK-01~04 + I-01 label() + I-05 登记抽 3 | 修复真实落地、登记逐字命中 | I-01 生产调用点 3 处；I-05 登记 **127/127 逐字命中**（抽 3 条见 §4.8） | ✅ |

---

## 3. 验证详细信息

### 3.1 FR / NFR 覆盖（100%）

| 需求 ID | spec 描述 | 测试用例 | 执行结果 | 覆盖率 |
|---------|----------|---------|:--:|:--:|
| FR-CHAT-040 | ask-user 迁入流内卡；独占槽移除 | `ask-auth-inflow.test.ts` ①② · `ask-auth-inflow.mjs` ①② · `l0.mjs`（宿主清零=0） | ✅ | 已覆盖 |
| FR-CHAT-041 | 操作前/后固化 | `ask-auth-inflow.mjs` ③④ + V2①/V4/V6 | ✅ | 已覆盖 |
| FR-CHAT-042 | 不可二次回答 / 取消留痕 | `ask-auth-inflow.mjs` ④（终态零控件） + V2②/V3/V4 | ✅ | 已覆盖 |
| FR-CHAT-043 | 60s 超时 → canceled 留痕 | `ask-auth-inflow.mjs` ⑤ + V2③/V3(E1) | ✅ | 已覆盖 |
| FR-CHAT-044 | supersededAsk = 取消 + 留痕 | `ask-auth-inflow.test.ts` ⑤ · V2①/V3(E3/E4/E5)/V7 | ✅ | 已覆盖 |
| FR-CHAT-045 | confirm → auth 卡；批准/拒绝固化 | `ask-auth-inflow.mjs` ⑥ + V2①/V2④ | ✅ | 已覆盖 |
| FR-CHAT-046 | 范围/后果预演 + 审计入口 + 不可重复 + 旧卡不消失 | `ask-auth-inflow.mjs` ⑥⑦⑫ + V2②/V2④/V5 | ✅ | 已覆盖 |
| FR-CHAT-047 | 授权记录流内可回看 + 审计分工 | `ask-auth-inflow.mjs` ⑦⑫ + V4/V8(AC-016) | ✅ | 已覆盖 |
| FR-CHAT-048 | busy / 回合语义 / 无「永远处理中」 | `ask-auth-inflow.test.ts` ③ + V3 遍历/E7 + V7 | ✅ | 已覆盖 |
| FR-CHAT-049 | 流内留痕零明文边界 | `ask-auth-inflow.test.ts` ④ + V5 | ✅ | 已覆盖 |
| NFR-CHAT-001 | 留痕完备性 | 六终态矩阵 + 遍历探针 + R1 全链 | ✅ | 已覆盖 |
| NFR-CHAT-004 | 固化态无障碍（aria-live / 焦点 / 收起不在 tab 序） | `ask-auth-inflow.mjs` ⑧（320/400/520 零溢出 + aria-live=polite） | ✅ | 已覆盖 |
| NFR-CHAT-005 | 安全：判定链零变化 / 零明文 / 零注入 | V5 + `zero-injection` 27/0 + 红线 0 diff | ✅ | 已覆盖 |
| NFR-CHAT-009 | 门禁严格串行 / 日志落盘 / 反证实跑 | V1（22 项独立进程 + 反证日志） | ✅ | 已覆盖 |
| NFR-CHAT-010 | 设计契约条款化 | `design-contract` 6/0（shim 60/60） | ✅ | 已覆盖 |
| NFR-CHAT-012 | 持久化边界：不写敏感明文；会话内可回放 | V5（摘要白名单结构证明 + 反向）+ `supersession` truncationRules | ✅ | 已覆盖 |

> **NFR 覆盖率 = 6/6 = 100%**（门槛 ≥80%）。

### 3.2 接口与数据（内部契约；0 外部 API）

| 检查项 | spec 要求 | 实测结果 | 一致？ |
|--------|----------|---------|:--:|
| 终态枚举（`data-answered` / `data-decision`） | `false/true/cancelled` · `pending/approved/rejected/cancelled` | V2①/V3 实测：auth `cancelled` 独立语义（既非 pending 亦非 approved） | ✅ |
| 终态卡操作控件 | 结构性 0（非 disabled） | `ask-auth-inflow.mjs` ④ + V2② 实测 0；终态卡内注入伪按钮点击无效 | ✅ |
| 取代留痕 | 卡内 + 系统行双留痕 | V2①b/V7 实测：卡 `cancelled(superseded)` + 系统行「上一轮提问已被新的拾取回合取代」 | ✅ |
| 摘要落库字段 | 白名单 11 项，无自由文本 | V5：`digestEntryOf` 输出键 ⊆ `DIGEST_FIELDS`；`answer/prompt/cancelReason` 均不落 | ✅ |
| 外部服务 API | 0 个（本叶声明零外部依赖） | 0 调用；路由门禁不涉及 | ✅ N/A |

### 3.3 构建与门禁脚本（22 项独立复跑 · 严格串行 · 日志全量落盘）

日志路径：`/tmp/opencode/v4-validate-v4-3/logs/`（`01`~`20` 逐项落盘）

| # | 门禁 | 命令 | 退出码 | 计数（实测原文） | vs build §10.6 |
|:--:|------|------|:--:|------|:--:|
| 1 | typecheck | `npm run typecheck` | 0 | tsc --noEmit 通过 | = |
| 2 | build | `npm run build` | 0 | `dist/sidepanel.js` **445,300 B** | = |
| 3 | npm test | `npm test` | 0 | `ℹ pass 945 / ℹ fail 0` | = |
| 4 | supersession | `npm run test:supersession` | 0 | `ℹ pass 31 / ℹ fail 0` | = |
| 5 | gate-integrity | `npm run test:gate-integrity` | 0 | `ℹ pass 12 / ℹ fail 0` | = |
| 6 | zero-injection | `npm run test:zero-injection` | 0 | `27 passed / 0 failed` | = |
| 7 | page-input | `npm run test:page-input` | 0 | `102 passed / 0 failed` | = |
| 8 | l0 | `npm run test:l0` | 0 | `216 passed / 0 failed` | = |
| 9 | l1 | `npm run test:l1` | 0 | `111 passed / 0 failed` | = |
| 10 | l2 | `npm run test:l2` | 0 | `73 passed / 0 failed` | = |
| 11 | density | `npm run test:density` | 0 | `171 passed / 0 failed` | = |
| 12 | journey | `npm run test:ui` | 0 | `167 assertions` PASS | = |
| 13 | insight | `npm run test:insight` | 0 | `116 assertions` PASS | = |
| 14 | binding | `npm run test:binding` | 0 | `192 assertions` PASS | = |
| 15 | hardening | `npm run test:hardening` | 0 | `24 assertions` PASS | = |
| 16 | e2e | `npm run test:e2e` | 0 | 全链 PASS | = |
| 17 | **ask-auth** | `npm run test:ask-auth` | 0 | `61 passed / 0 failed` | = |
| 18 | stream | `npm run test:stream` | 0 | `63 passed / 0 failed` | = |
| 19 | design-contract | `npm run test:design-contract` | 0 | `ℹ pass 6 / ℹ fail 0` | = |
| 20 | l1-reverse | `npm run test:l1-reverse` | 0 | 9 条「注入→FAIL→sha256 还原→PASS」 | = |
| 21 | l2-reverse | `npm run test:l2-reverse` | 0 | 10 条「注入→FAIL→sha256 还原→PASS」 | = |
| 22 | RP-V4-09 复验 | `npm run test:density -- --reverse RP-V4-09` | 0 | `9 passed / 0 failed`（14>8 必红，单卡仍 PASS） | = |

**计数对账（只增不减）**：node 945（build 945 =）；supersession 31（=）；ask-auth 61（=）；l1 111（=）；l0 216 / l2 73 / density 171 / journey 167 / insight 116 / binding 192 / hardening 24 / stream 63 / page-input 102 / zero-injection 27 / gate-integrity 12 / design-contract 6（全部 =）。**22/22 与 build §10.6 登记逐项一致，无「只增不减」违例。**

### 3.4 规范符合（AC 逐条证据）

| AC | 要求 | 实测证据 | 判定 |
|----|------|---------|:--:|
| AC-CHAT-003 | 固化契约统一：ask（答/取消）+ auth（批准/拒绝）逐态成立；已固化卡不可二次 | `ask-auth-inflow.mjs` ③④⑥；V2①/V4；`ask-auth-inflow.test.ts` ① | ✅ |
| AC-CHAT-005 | 法二：无撤销控件；撤销 = 新系统事件行 | 终态卡 `button/input/select/textarea` = 0（V2② 实测）；`cancelSystemLine` 生成新事件行 | ✅ |
| AC-CHAT-014 | supersededAsk = 取消 + 留痕；pending 门控一致；无「永远处理中」 | V7（双留痕全链）；V3 遍历（10000 序列无卡死出口）；E7（pending 回落） | ✅ |
| AC-CHAT-015 | 60s 超时 ⇒ canceled 留痕、不代填；主动取消同样留痕 | V2③（真超时结算 + 无假超时）；V3(E1)；`ask-auth-inflow.mjs` ⑤ | ✅ |
| AC-CHAT-016 | 批准/拒绝流内固化可读 + 时间戳 + **审计入口**；站点级授权可发现可读 | V2④（点击前不可见 → 点击后可见）；`ask-auth-inflow.mjs` ⑥⑦⑫ | ✅ |
| AC-CHAT-021 | 零明文 + 安全反向断言 + 未授权零注入 27 保持 | V5（9/9）；`zero-injection` 27/0；红线 0 diff | ✅ |
| AC-CHAT-023 | 门禁纪律：严格串行 / 日志落盘 / 反证实跑 / 每叶全绿 | §3.3（22 项独立进程 + 反证 l1/l2-reverse + RP-V4-09） | ✅ |
| AC-CHAT-025 | 设计契约机器化（shim 60/60）+ 真实产物侧复算 | `design-contract` 6/0；产品侧 C/D 断言在 `ask-auth-inflow.mjs`/`stream.mjs` | ✅ |

### 3.5 性能与边界

| NFR / EC | 要求 | 实测 | 达标？ |
|----------|------|------|:--:|
| 单卡可点（收起态） | ≤6 | **4**（3 选项 + 末项「其他…」） | ✅ |
| 单卡可点（展开态，I-03） | ≤6 且可见选项行=0 | **4**（输入+提交+取消+切换）；可见选项行 **0** | ✅ |
| 首屏合计（两卡全展开） | ≤8 | **8**（4+4） | ✅ |
| 反证（注入「选项行不收起」） | 必红 | 单卡 **7>6** / 两卡 **14>8** ⇒ 判据 FAIL；还原回绿 | ✅ |
| 体积（sidepanel） | ≤ floor(445,300×1.05)=**467,565** | **445,300 B**（余量 22,265 B） | ✅ |
| 体积（content / pick-layer） | 无容差 | **177,076 / 33,900** 逐字节不变 | ✅ |
| EC-CHAT-001（超时 fail-closed） | 不代填、不永久阻塞 | 后台 ask → `cancelled(timeout)` + 系统行；ref-round 不结算（无假超时）；`pending` 可回落 | ✅ |
| EC-CHAT-002（拾取交错） | 被取代取消 + 留痕 | V7 双留痕；E5 ref 优先 | ✅ |

### 3.6 漂移检测

| 漂移类型 | 检测方法 | 结果 |
|---------|---------|------|
| 孤立代码（有代码无需求） | 退役符号 grep：`decision-card` / `turnStuck` / `STREAM_FIELD_WHITELIST` / `rounds[] 差分` | ✅ 无（`turnStuck` 仅存于退役说明注释；`STREAM_FIELD_WHITELIST` 已删；`data-transitional-host="v4-3"` 计数 = 0） |
| 需求缺失（有需求无代码） | FR-CHAT-040~049 逐条映射 | ✅ 10/10 有落点（§3.1） |
| 规格漂移（spec/plan 被修改） | `git log -- spec.md/plan.md` + `git status` | ✅ spec.md / plan.md 自立项 commit `a7af431` 零修改；工作树干净 |
| 红线漂移 | `git diff --numstat 0f8a1fb..HEAD` | ✅ `src/background/**`、`src/content/**`、`manifest.json`、`policy.ts`、`auto-authorize.ts`、`ask-bridge.ts` **全 0** |
| 台账自描述漂移 | `leafBases[].summary` vs 分项之和 | ⚠️ **N-01**（见 §5） |

### 3.7 体积五要素抽查（445,300 B）

| 要素 | 登记值（`test/size-baseline.ts`） | 实测 / 判据 | 一致？ |
|------|------|------|:--:|
| 基线 | `SIDEPANEL_BASELINE_BYTES = 445_300` | `dist/sidepanel.js` = 445,300 B | ✅ |
| ceiling | `SIDEPANEL_CEILING = floor(445,300×1.05)` = **467,565** | 公式复核 `445300*1.05=467565` | ✅ |
| 最终产物 | `SIDEPANEL_FINAL_ARTIFACT_BYTES = 445_300` | 实测 445,300 B（== 登记） | ✅ |
| 历史值 | 时间线保留 `440_698 / 426_487 / 425_094 …` | 台账 `historyRetainedBytes` 含三者 | ✅ |
| 归因 | `v43ReviewfixRows`（beforeBytes = v4-3 轮 afterBytes） | 存在，Σ 与 `445,300` 衔接 | ✅ |

---

## 4. 对抗探针（核心）

### 4.1 V2 假留痕对抗（四条）

| # | 攻击 | 结果 | 判定 |
|---|------|------|:--:|
| ① | **auth 卡三路径 → 假批准**：会话切换 / 被第 3 张取代 / 回合结束，读取真实渲染函数 `decisionState()`+`authFixedText()` | 三路径均 `terminal=cancelled` → `decisionState='cancelled'` + 文案「已取消（未授权，不执行）」，**无一处 `'approved'` / 「已批准」**；正控真批准仍 `approved`（非恒真） | ✅ 攻击失败 |
| ② | **DOM 伪造 approved**：① 全局注入 `<button data-act=approve>` 点击 ② 终态卡内注入伪按钮点击 ③ 晚到伪造终端事件 ④ 未知 requestId | ① 0 张 approved，卡仍 `pending` ② 终态不变（非 approved） ③ 已批准卡不被改写、已取消卡不被翻成 approved ④ fail-closed（0 新事件） | ✅ 攻击失败 |
| ③ | **回合结束对 ref-round-* → 假超时** | `ref-round-ref_1` 在 `pending:false` 后 **frozen=false / cancelReason=undefined / open=1**；系统行无「超时」，仅有「本轮已结束：引用提问仍在等待你的选择」；对照后台 ask 真超时正确结算 | ✅ 攻击失败 |
| ④ | **审计入口 → 死链** | `.audit-entry` 点击前 `[data-l2-view=audit]` 不可见、点击后可见（判据非恒真） | ✅ 攻击失败 |

> **BLOCK-01/02/04 独立复现结论**：修复轮的三处「两段证伪」在独立探针下**不可复现**——即修复真实、非门禁空转。

### 4.2 V3 终态机全路径遍历

- **规模**：10 操作字母表（`ask_bg` / `ask_ref` / `confirm` / `answer` / `cancel(user)` / `approve` / `reject` / `done` / `error` / `switch`）的**长度 4 全排列 = 10,000 序列**，每步后断言 5 类不变量：`open ≤ MAX_OPEN_ASKS(2)` · 每卡至多 1 个终态且属闭合词表 · **无伪造 approved**（approved 卡必属显式批准集）· **ref-round 永不 timeout** · `seq` 严格递增唯一。
- **结果**：**240,748 断言 / 0 失败**。
- **定向边界序**：E1 先答后超时（answered 不改写）· E2 先批后取代（approved 保持）· E3 双卡开 + 第三张（**supersede 最旧**，新卡+次旧保留）· E4 ask+auth 混合三卡（auth 被取代渲染 cancelled）· E5 ref 优先（仅 ref 留存）· E6 先答后取消（保持 answered）· E7 不答+等超时（pending 回落）——**全绿**。
- **补测**：`error` 收尾对 ref-round 同样不结算（不写假 `aborted`），仅留痕。
- **「最旧 vs 最新」产品合理性判定**：超限时取代**最旧**（最不相关者先出），保留最新（与当前上下文最相关）——合理；`ref-round` 优先清**后台** ask（用户主动动作优先）——与 R1 语义一致。

### 4.3 V4 答案真值（node + Chromium）

- answered ⇒ 卡 `payload.answer` 即真值，固化文案「已答：查看站点声明」；两轮同主题改选**各自保留**且 `changed=true`；取消 ⇒「已取消（用户）」`canceled=true`，**非**「（无回答）」。
- 与 BLOCK-03 修复一致：`decisionRounds()` 从 `project()` 的**终态 askuser 卡**派生，无 `lastUserText` 回落。

### 4.4 V5 零明文（注入 marker 读回）

| 注入面 | marker | 结果 |
|--------|--------|------|
| 答案 | `sk-ABCDEFGHIJKL` | `digestEntryOf` 输出无 `answer` 字段、无该串；字段 ⊆ 11 项白名单 |
| prompt | `https://a.test/x?token=SECRETVAL123` | 摘要不含 `prompt`、不含该串 |
| label 工厂 | `?token=` / `--password=` / `sk-` / `<img src=x>` | 四类**全部抛错**（fail-closed） |
| ASK_COPY | 全常量 | 全过 `assertStreamPlaintext` |
| 取代系统行 | — | `label` 过扫描 |

> **N 类安全属性**：`answer` 是**用户自己的话**，设计允许在流内渲染（V5 不判渲染面含答案），但**结构上不可能**入摘要（`digestEntryOf` 不读该字段）。

### 4.5 V6 展开态预算（Chromium 实测 + 自注入破坏）

| 状态 | 单卡可点 | 可见选项行 | 合计 | 判定 |
|------|:--:|:--:|:--:|:--:|
| 收起 1 卡 | 4 ≤6 | 4（选项） | 4 | ✅ |
| 展开兜底 | 4 ≤6 | **0**（互斥披露） | 4 | ✅ |
| 两卡全展开 | 4 / 4 | 0 | **8 ≤8** | ✅ |
| **自注入**「展开时保留选项行」 | **7 >6** | 3 | **14 >8** | ✅ **必红** |
| 还原 | 4 ≤6 | 0 | 8 | ✅ 回绿 |

### 4.6 V7 R1 语义等价全链（node ESM 真实 reducer）

`user('帮我处理') → ask(ask-7) → supersededAsk{ask-7,mustTrace:true} → ask-resolved(superseded){卡 cancelled + 系统行} → ask(ref-round-ref_1){卡出现} → done{pending 回落，ref 卡仍可答，无假超时} → ask-resolved(answer:'作为操作目标'){answered 留痕} → assistant{新 ai 卡 + 0 未终态卡}` —— **10/10 全绿**，AI 继续不掉线。

### 4.7 V1 门禁对账

见 §3.3。22 项独立复跑与 build §10.6 逐项一致（count 全部 `=`，无删减）。

### 4.8 V9 修复落地抽查

| 项 | 关键证据 | 结论 |
|---|---------|------|
| BLOCK-01 | `cards/auth.ts#decisionState` 含 `'cancelled'`；`authFixedText` 返 `ASK_COPY.authCancelled`；sha256 `auth.ts = cc545f27…`（**与 build §10.2 登记逐字一致**） | ✅ 真实落地 |
| BLOCK-02 | `chat-state.ts#settleTurnEnd` 按 `isRefRound` 分流；`ASK_COPY.turnEndRefPending` 存在；sha256 `chat-state.ts = fdf2c125…`（= build 登记） | ✅ |
| BLOCK-03 | `sidepanel.ts#decisionRounds()` 从 `project()` 终态派生；`l1/panels.ts#observe` 只赋值；sha256 `sidepanel.ts = 80f995e2…`（= build 登记） | ✅ |
| BLOCK-04 | `patchAuthCard(view,node,deps)` + `patchCardNode(...,deps)` + `stream-render` 传 `cardDeps()` | ✅ |
| I-01 | `label(` **生产调用点 3 处**（`chat-state.ts:314/417/430`）；`assertStreamCopySafe()` 在 `stream-plaintext.ts:128` **模块求值期**执行；`STREAM_FIELD_WHITELIST` 已删（0 命中） | ✅ 接线 + 删重 |
| I-02 | `askFlowView` 真实消费点 = `sidepanel.ts:1147`（`#send-reason` 文案/禁用）；`turnStuck` 仅存于退役注释 | ✅ |
| I-03 | 见 §4.5（互斥披露 + 破坏必红） | ✅ |
| I-05 | 叶段登记独立复算：`leafBases[1].registeredUncoveredLines` **127 行 / 14 文件**，与 `git diff 0f8a1fb..HEAD` 删除行**逐字命中 127/127**；新增可见文件（`ui/stream.mjs` 8 / `density-thresholds.test.ts` 2 / `size-ruling-vol3.test.ts` 2 / `supersession-ledger.test.ts` 28 = **+55**，与 build §10.3 一致）。抽 3 条：`stream.mjs` `formHidden: c.querySelector('.ask-form').hidden === true,` · `supersession-ledger.test.ts` `test('ledger(V4 段)反证…'` · `density-thresholds.test.ts` `const V4_RETIRED_IDS…` —— 三要素（oldTitle 命中 / newTitle 可定位 / reason ≥40）全过 | ✅ |
| I-06 | `case 'error'` → `settleTurnEnd(...,'aborted')` + `ASK_COPY.abortedSystem`；V2③/V3 补测绿 | ✅ |
| I-07 | `cardIdForRequest` 只认无终态卡；`terminalDecision` 给 requestId 却解析不到 ⇒ fail-closed；`clearAsk` 按 kind 派发 | ✅ |
| I-08 | `docs/v4-supersession-ledger.json#knownLimitations` 含 `KL-V43RV-01`（后果预演代入卡片自身已显示范围文本，仅渲染、不入摘要） | ✅ |

---

## 5. 验证脚本执行记录

> **ADR-003**：以下脚本由 validate Agent 自主编写、直接执行；存于用户指定探针目录 `/tmp/opencode/v4-validate-v4-3/`（本次验证专用时间戳目录），日志同级 `logs/`。全部只读，不改仓库。

| 脚本文件 | 用途 | 对应场景 | 退出码 | 关键输出 |
|---------|------|:--:|:--:|---------|
| `v2-v4-v5-node.mjs` | 假留痕三路径 / 伪造终态 / ref-round 假超时 / 答案真值 / 零明文注入 | V2①②③·V4·V5 | 0 | `29 passed / 0 failed` |
| `v3-state-machine.mjs` | 终态机 10000 序列 × 10 操作遍历 + 7 定向边界 | V3 | 0 | `10000 序列 · 240748 passed / 0 failed` |
| `v7-r1-chain.mjs` | R1 语义等价全链（后台提问→拾取→取代→ref-round→回答→AI 继续） | V7 | 0 | `10 passed / 0 failed` |
| `v2-v4-v6-chromium.mjs` | Chromium：DOM 伪造 / 审计入口可达 / L1 历史真值 / 展开态预算与自注入破坏 | V2②④·V4·V6 | 0 | `15 passed / 0 failed` |
| 门禁日志 `logs/01-*.log … 20-*.log` | 22 项门禁独立串行复跑全量日志 | V1 | 0 | 22/22 `exit=0`，计数见 §3.3 |
| 内联 python 复算（`git diff` + ledger JSON） | 红线零 diff / 体积五要素 / I-05 登记逐字比对 | V8·V9 | 0 | 红线 0 变更；登记 `127/127` 逐字命中 |

---

## 6. 非阻塞登记（N-xx）

| # | 位置 | 问题 | 对应 Vx | 严重度 | 建议 |
|---|------|------|:--:|:--:|------|
| **N-01** | `packages/web-cli-plugin/docs/v4-supersession-ledger.json#leafBases[].summary` | 自描述读数滞后：v4-3 段 `summary.registeredLines = 72`（note 称「10 个文件」），但 `registeredUncoveredLines` 实际分项之和 = **127 / 14 文件**（+55 由 review 修复轮 I-05 追加，summary 未同步）；v4-1 段同样 `729` vs 实际 `761`；`filesWithUnregisteredLeafDeletions = 10` vs 实际 14。门禁只断言「每组 `count == 清单长度」与 scope 复算，**未校验该 summary 字段** ⇒ 漂移可长期存活 | V9·V8 | 低 | 一行订正（按各组分项之和重算 summary，或把该字段降级为「R2 快照」并注明）；建议在门禁补一条「summary 口径 = Σ分项」机核 |
| **N-02** | 本叶 `build.md` §7「`index.html` 占位宿主：v4-4 保留 **3**」 | 实际 `<li data-transitional-host>` 宿主 = **2**（`data-host="l1-panels"` / `"strips"`）；第 3 处命中是 CSS/注释里的字符串。`l0.mjs` 登记值 = **2** 且门禁绿，故为 build 文档计数口径问题（`grep -c` 把注释计入） | V8 | 低 | build 文档口径改为「`<li>` 宿主 = 2（另有 1 处注释提及）」 |
| **N-03** | `plan.md#ADR-V4-032 §2` 字面「新引用回合 ask 到达 ⇒ 先 supersede **所有**后台 ask」 | `arbitrateOpenAsks` 有早退 `if (open.length < MAX_OPEN_ASKS) return []` ⇒ 仅当 `open ≥ 2` 时该优先规则生效；`open=1 后台 + 入场 ref` 时两卡并存（=2，仍 ≤ 上限），功能无违例（由 `supersededAsk` 兜住）。review C2 已以「注释/ADR 与代码字面不一致（无功能后果）」登记 | V3 | 低 | 在 ADR/注释补一句「优先规则仅在到达上限时触发（`open ≥ MAX_OPEN_ASKS`）」，或调整早退条件（需重跑门禁） |

> **无阻塞问题（BLOCK 级 0 项）**；N-01 属治理台账的自描述字段，**不影响**产品字节、判定链、安全属性或任何门禁（规范性内容「每组逐字登记 127/127」已独立 100% 验证）。

---

## 7. 结论

**结论**: **✅ 通过**

**指标达标矩阵**：

| 指标 | 要求 | 实测 | 达标？ |
|------|------|------|:--:|
| FR 测试覆盖 | 100% | 100%（10/10） | ✅ |
| NFR 测试覆盖 | ≥80% | 100%（6/6） | ✅ |
| 构建退出码 | 0 | 0（typecheck + build） | ✅ |
| 阻塞问题数 | 0 | **0** | ✅ |
| 漂移项（严重） | 0 | **0**（N-01~N-03 为非阻塞登记） | ✅ |
| 22 门禁 + RP-V4-09 | 全绿 | 22/22 `exit=0` | ✅ |
| 对抗探针（假留痕 / 终态机） | 全部攻击失败 | V2 四攻失败；V3 10,000 序列 0 漏洞 | ✅ |

**理由**：本叶的立身之本是「留痕即事实」，而 review R1 的 4 个洞恰好打在这一点上。本轮**未依赖 build 自报**，独立复跑了 22 门禁（计数逐项对账一致），并用自写探针在**真实 reducer + 真实 Chromium 产物**上重放审查的攻击：auth 卡三路径不再出现「已批准」、伪终端被终态冻结拒绝、回合结束不再对面板自有 ask 写假超时、审计入口真实可达；终态机 10,000 序列穷举零漏洞；答案真值 / 零明文 / 展开态预算（含自注入必红）全绿；红线零 diff、spec/plan 零漂移、体积五要素一致。修复落地经 sha256 与 build 登记逐字互证。因此判 **✅ 通过**，登记 3 项非阻塞（N-01 建议随下次台账维护一并订正）。

---

## 8. 状态文件关联（§8.2 / §8.3）

- 本叶 `state.json`：`phase: reviewed → validated`，`files.validate` / `files.validationReport` 已登记指向本目录 `validate.md` / `validate-report.md`。
- 父 `specs-tree-web-cli-plugin-v4-chat/state.json`：`childrens[]` 中 v4-3 的 `phase` 同步为 `validated`。
- `TREE.md`：本叶目录导航同步（phase / 产物）。
- 本轮只读仓库（探针在 `/tmp/opencode/v4-validate-v4-3/`）；提交仅含 SDDU 文档 + state/TREE 同步，**不含任何 `src/**` / `test/**` / `dist/**` / 台账字节改动**。

---

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建（V1~V9 独立动态验证：22 门禁复跑 + 240,802 探针断言 + 假留痕对抗 + 终态机遍历 + 零明文 + 展开态预算 + R1 全链 + 修复落地抽查；结论 ✅ 通过，附 N-01~N-03 非阻塞登记） | 2026-09-19 | SDDU Validate Agent |
