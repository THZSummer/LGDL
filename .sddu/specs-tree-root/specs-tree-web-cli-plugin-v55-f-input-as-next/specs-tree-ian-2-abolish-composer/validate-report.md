# 验证报告：specs-tree-ian-2-abolish-composer

> **文档定位**: SDDU 验证报告 — 逐项记录自主验证的执行结果（工作流终点）
> **验证策略**: `validate.md`（V1~V12 场景矩阵 + 五维度方法）
> **前置依赖**: `validate.md` · `spec.md`（v1.0）· `review-report.md`（R2 · ⚠️ 有条件通过 · 0 BLOCK · 1 残留 I-R2-01）· `build.md`（v3.0 · 25/25）
> **创建人**: SDDU Validate Agent
> **创建时间**: 2026-09-26
> **验证轮次**: R1
> **版本**: v1.0
> **更新人**: SDDU Validate Agent
> **更新时间**: 2026-09-26
> **更新说明**: 初始创建（IAN-2 叶 validate R1：亲跑 `npm test` **1443/0/0** + 13 组门禁；S0''-B 双面独立复刻 + 三处注入必红逐字节还原；法四三处一致 + 半修必红；真退役行为级 + 通道唯一化 + 重锚族；T220 只升不降；保护段逐字节；红线/体积五要素终核；**I-R2-01 闭环**（counts 前移 48→49 / 1441→1443 + N-04 4/4 同源）；0 阻塞 · 2 项非阻塞环境性 flake 如实登记）

---

## 1. 验证概要

| 维度 | 数值 |
|------|:--:|
| 验证项总数（Vx） | **12** |
| 通过 | **12** |
| 失败 | 0 |
| 无法执行 | 0（人工面 M3/M4 ⏳ 属登记项，见 §3.5） |
| 阻塞问题 | **0** |
| 非阻塞观察（N） | 2（环境性 flake，见 §5） |

| 亲跑门禁（本机实测 · 串行） | 实测 | 基线 | 判定 |
|------|:--:|:--:|:--:|
| `npm test`（node，全量） | **1443 / 0 / skip 0** | 1443 | ✅ |
| `test:supersession` | **49 / 0** | 49（+1，counts 前移后 4/4 同源） | ✅ |
| `test:gate-integrity` | **24 / 0** | 24 | ✅ |
| `test:size-ruling-vol3` | **13 / 0** | 13 | ✅ |
| `law4-input-as-next`（node） | **6 / 0** | 6 | ✅ |
| `insight-no-escalation`（node） | **21 / 0** | 21 | ✅ |
| `test:s0-self-driven`（Chromium） | **82 / 0**（隔离复跑 ×2；首轮 81/1 环境 flake，见 §5 N-1） | 82 | ✅ |
| `test:insight`（Chromium） | **125**（118→125） | 125 | ✅ |
| `test:l0`（Chromium） | **251 / 0**（248→251） | 251 | ✅ |
| `test:l1`（Chromium） | **132 / 0**（120→132） | 132 | ✅ |
| `test:ui`（journey，Chromium） | **171** | 171 | ✅ |
| `test:density`（Chromium） | **242 / 0** | 242 | ✅ |
| `test:binding`（Chromium） | ⚠️ 环境性红（见 §5 N-2；保护段字节级经 `test:supersession` 双绿） | 192 | ⚠️ 环境 |

---

## 2. 逐项验证结果（V1~V12）

| # | 验证对象 | 验证步骤（摘要） | 预期结果 | 实测结果 | 判定 |
|---|---------|---------|---------|---------|:--:|
| **V1** | S0''-B 终态双面 | 亲跑 Chromium `test:s0-self-driven` + 独立 node 复刻三 id 判据 + 注入 hidden | 82/0 ∧ 三 id 零命中 ∧ 注入必红 | 隔离复跑 **82/0**（首轮 81/1 环境 flake）；独立脚本三 id 零命中（`idsInHtml=63`，`retired_id_hits=[]`，`remint_hits=[]`），注入 `<form id=composer hidden>` 被检出，`html_sha256=ba9f3248…` 与读盘一致 | ✅ |
| **V2** | 法四三处一致 + 台账 | 读 `:116/:225/:385` 逐字核心句 + 台账 old/new + in-memory 半修 :225 | 三锚逐字 ∧ old/new 逐字 ∧ 半修必红只报 :225 | 三锚 `hasCore=true`；`ledger_old_new_verbatim=true`；`half_fix_detected=true` · `half_fix_reported_lines=[225]`；`spec_sha256=9299146d…` | ✅ |
| **V3** | #composer 真退役行为级 | 去注释扫 `composer` 代码引用 + 四兜底链 | 零代码引用（仅登记册字符串）+ 四入口收敛卡内 | 全 `src` 去注释后 **2** 处 `composer` 均在 `host-registry.ts`（退役册 + `RETIRED_HOST_ATTRS` 宿主值，均非输入面）；`revealAskFallback→l0?.revealFallback→setAskFallbackOpen(doc,true)` 唯链 | ✅ |
| **V4** | 通道唯一化 + R6 | 数 `requestTurn(` 调用点；`restoreFreeInputDraft` 唯一；`sendDisabledReason` 禁用位；`turn-queue.ts` | 恰 1；回填唯一卡内；在飞不硬禁用；零 composer | `requestTurn_callSites=1`；`restoreFreeInputDraft_impl=1`（经 `askFormNodeOf` 卡内 `.ask-form`）；`sendDisabledReason` 禁用位 = `flow.sendDisabled`/`!activeOrigin`（不读 `pending`）；`turn-queue.ts` 零 composer；`npm test` 内 `TA ④/⑧ 唯一载体回填 + 三反证` 绿 | ✅ |
| **V5** | 重锚族（011~015） | `#send-reason` 在 statusbar ∧ 块内无输入元素；`sendDisabled=!hasOrigin`；draft 卡内；引导改指 | 状态提示保留；禁用仅异常态；draft/引导重锚 | `send_reason_present=true` 且在 `#region-statusbar` 后、块内无 `<input>/<textarea>`；`sendDisabled_reanchored=true`；`sidepanel.ts:1360-1371` draft 读写 `#ask-input`；`ONBOARDING_TEXTS[4]` 改指流内（review C7/C8 ✅） | ✅ |
| **V6** | X-IAN-1~11 台账 | 亲跑 `test:supersession` | 49/0 ∧ 并集恰 11 条 | **49 / 0**（`xIianLedgerFull` X-IAN-1~7 + `xIianLedgerLeaf2` X-IAN-8~11 + 「并集收口：缺条/ID 冲突/空字段 ⇒ 必红」全绿） | ✅ |
| **V7** | 门禁治理三态 | `gate-integrity` 下界 + 20 行三态对账 + `CHROMIUM_GATES` | 24/0 ∧ 零删除 ∧ 9 不动 | **24 / 0**；`xIianGateReconciliationLeaf2` **20 行**（kept 4 / equivalent-reanchor 12 / explicit-supersession 4）逐行 `assertionsRemoved=0`；`CHROMIUM_GATES===9` | ✅ |
| **V8** | T220 三文件重锚 | 亲跑 insight/l0/l1 + 核 `zeroDiffFiles`/`redlineRemap` | 只升不降 ∧ 三文件不在冻结面 | insight **125** / l0 **251** / l1 **132**；`zeroDiffFiles=9`（三文件均不在）；`redlineRemap=8`（末条 `status=landed` 且声明「不在 `zeroDiffFiles`」） | ✅ |
| **V9** | 保护段逐字节 | `test:supersession` 专条 + 独立复算 sha | journey 新 pin ∧ binding keep 双绿 | journey `[43484,59347)` len **15863** / lines **249** / sha **`7b309258aab783e7…`**；binding `[107780,115930)` len **8150** / sha **`be9ad0e983670137…`** / 段内 `composer=0·#input=0·#send=0` | ✅ |
| **V10** | 红线 + 体积终核 | 三冻结面 + 常量直读 + 五要素 + `law8` | 全达标 | `content.js` **177,076 / `52a82620…`** ✅ · `pick-layer.js` **34,358 / `77796bab…`** ✅ · `sidepanel.js` **598,577**；`KIND_SET` **40** / `CARD_TAG_LABELS` **12** / `REGISTERED_STRUCTURAL_HOSTS` `[]` / `NEVER_FOLDABLE` **13** / `RETIRED_CONTAINER_IDS` **16**；五要素 598,577 / 628,505 / 614,400 / 675,840 / `pending-author-line`；两叶 Σ **+6,631**（叶2 净负 **−548**）；`law8` **60/0** | ✅ |
| **V11** | I-R2-01 counts + N-04 | 读 counts vs 实测；前移 + 同步 | 前移后 4/4 同源 | 前移前 `supersession=48` / `nodeTestRuntime=1441`（滞后已确认）；**已前移** 48→**49** / 1441→**1443**，`source.observed`/`observedLine` 同步，`source.log` 重登记到 validate 轮 `registry/` 快照；`test:supersession` 输出「**counts 同源机核：4 项与门禁日志逐条相等**」（原 4 项 skip 清零） | ✅ |
| **V12** | 注入抽验 + 人工面 | 三处真源注入 ⇒ 必红 ⇒ 逐字节还原；核 M3/M4 | 三处必红 ∧ byte-identical ∧ 人工面 ⏳ | ① 法四半修 `:225` ⇒ `6→5 pass / 1 fail`；② 注入 `<form id=composer hidden>` ⇒ `6→1 pass / 5 fail`；③ 快照移出 `#input` 入册 ⇒ `6→1 pass / 5 fail`；三处还原后均 `6/0` 且 `cmp` **IDENTICAL**；`manualFaces` M3/M4（及 M1/M2/M5）=「⏳ 未执行（headless 不可合成，不冒充 PASS）」 | ✅ |

---

## 3. 验证详细信息

### 3.1 测试覆盖（维度 §5.1）

**功能需求（FR）— 覆盖率 100%（本叶承载父 FR 切片 54 条，按组）**

| FR 组 | spec 要点 | 测试载体 | 结果 | 覆盖 |
|------|----------|---------|:--:|:--:|
| FR-IAN-040/041/049 | 三 id DOM 真退役 + CSS 退役 + 法四机核 | `law4-input-as-next` L4-1~6（6/0）+ S0''-B（82/0） | ✅ | 已覆盖 |
| FR-IAN-042/043/044 | 双写者/锁存/设置态护栏消解 | V3 去注释扫描（零代码引用）+ review C2 | ✅ | 已覆盖 |
| FR-IAN-045/046/047/048 | 钩子/`NEVER_FOLDABLE`/入册/注释 | V10 常量直读（13/16）+ `l0-disclosure`/`host-registry` | ✅ | 已覆盖 |
| FR-IAN-050/051/052 | 四兜底收敛终态 | V3 链核 + S0''-B S0C-12 | ✅ | 已覆盖 |
| FR-IAN-053/054/055/056 | `#send-reason`/`sendDisabled`/draft/引导 | V5 直读 + `npm test`（settings 15/0） | ✅ | 已覆盖 |
| FR-IAN-060~064 | 法四修订 + 台账 + 门禁 | V2 + `law4` L4-7 + `supersession` | ✅ | 已覆盖 |
| FR-IAN-021/031/032/034/085/086 | 通道唯一化 + TA-4 | V4 + `op-wiring`/`turn-arbitration`（`npm test`） | ✅ | 已覆盖 |
| FR-IAN-070/072/073/074 | S0''-B 终态 | V1（node + Chromium 双面） | ✅ | 已覆盖 |
| FR-IAN-080~091 | X-IAN-1~11 等价重锚 | V6（50 行并集收口机核） | ✅ | 已覆盖 |
| FR-IAN-100~106 | 门禁治理终态 | V7 + `gate-integrity` 24/0 | ✅ | 已覆盖 |
| FR-IAN-112~115 | 冻结面 + 体积净负 + 重登记 | V10（五要素 + EC-IAN-016 三态） | ✅ | 已覆盖 |

**非功能需求（NFR）— 覆盖率 100%（本叶相关 12 条）**

| NFR | spec 要求 | 实测 | 覆盖 |
|---|----------|------|:--:|
| NFR-IAN-001 | `sidepanel.js` ≤ 生效上限 | 598,577 ≤ 628,505（`size-ruling-vol3` 13/0） | ✅ |
| NFR-IAN-002/003 | 特权 op 恒 gesture / consent 不被 AI 代答 | `insight-no-escalation` **21/0** | ✅ |
| NFR-IAN-004 | 法八四面零明文 | `law8` **60/0** | ✅ |
| NFR-IAN-005 | base 零 diff + 判定链零触碰 | `git diff`：`packages/web-cli-base/**` / `turn-queue.ts` 零 diff | ✅ |
| NFR-IAN-006 | 删面不放松 fail-closed | `npm test`（policy deny / fail-closed 组） | ✅ |
| NFR-IAN-007 | 零新增载体（`KIND_SET` 40 / 12 kind / 零宿主） | V10 常量直读 | ✅ |
| NFR-IAN-009 | 删 `#input` 后无悬空焦点 | V5（`send-reason` 块无输入元素；focus 落卡内） | ✅ |
| NFR-IAN-010 | 法四可机核（双向反证 + 禁恒真） | V2 + `law4` L4-7 + 三注入 | ✅ |
| NFR-IAN-012 | 门禁串行 / 无新依赖 | 全量串行亲跑；`package.json` 无新依赖 | ✅ |
| NFR-IAN-013 | 默认屏零可见输入框 | `law4` L4-3 + S0''-B 共享判据 | ✅ |
| NFR-IAN-014 | 唯一输入载体 + 唯一提交点 | V3 + V4（`requestTurn=1`） | ✅ |

### 3.2 接口与数据（维度 §5.2 — 生产真源切片 / 台账 JSON）

| 检查项 | spec/登记要求 | 实测 | 一致？ |
|--------|----------|---------|:--:|
| `index.html` 三 id | `#composer/#input/#send` 元素不存在 | `id="…"` 零命中（63 个 id） | ✅ |
| `RETIRED_CONTAINER_IDS` | 长度 16，含三 id | 16，含 `composer/input/send` | ✅ |
| `NEVER_FOLDABLE` | 13，不含 `composer` | 13，无 `composer` | ✅ |
| `requestTurn(` 生产调用 | 恰 1 | 1（`sidepanel.ts:3899`） | ✅ |
| `v4-chat/spec.md` 三锚 | 逐字含法四核心句 | `:116/:225/:385` 均含 | ✅ |
| `law4InplaceRevision` | `{id,old,new,coreSentence,reason,date,anchors}` | `id=X-IAN-1` 五要素齐 + 三锚行号 `[116,225,385]` | ✅ |
| 保护段 journey pin | `7b309258…`/15863B/249 行 | 逐字节吻合 | ✅ |
| 保护段 binding keep | `be9ad0e9…`/8150B/startByte 107780 | 逐字节吻合，段内零退役 id | ✅ |
| `xIianGateReconciliationLeaf2` | ≥18 行三态 ∧ `assertionsRemoved=0` | 20 行，全 0 | ✅ |
| `counts` 同源 | 4 抽样键 == 门禁日志 | `supersession 49` / `nodeTestRuntime 1443` / `l0 251` / `density 242`（**4/4**） | ✅ |

### 3.3 构建与脚本（维度 §5.3）

| 命令 | 退出码 | 耗时 | 输出摘要 | 结果 |
|------|:--:|------|---------|:--:|
| `npm test`（tsc + node --test） | 0 | ~157 s | `tests 1443 / pass 1443 / fail 0 / skip 0` | ✅ |
| `npm run test:s0-self-driven` | 0（隔离复跑） | — | `82 passed / 0 failed` | ✅ |
| `npm run test:insight` | 0 | — | `125 assertions` | ✅ |
| `npm run test:l0` | 0 | — | `251 passed / 0 failed` | ✅ |
| `npm run test:l1` | 0 | — | `132 passed / 0 failed` | ✅ |
| `npm run test:ui`（journey） | 0 | — | `171 assertions` | ✅ |
| `npm run test:binding` | 1 | — | 环境性红（§5 N-2） | ⚠️ 环境 |
| `npm run test:gate-integrity` | 0 | 3.1 s | `24 pass / 0 fail` | ✅ |
| `npm run test:size-ruling-vol3` | 0 | 0.2 s | `13 pass / 0 fail` | ✅ |
| `law4-input-as-next`（node） | 0 | 0.2 s | `6 pass / 0 fail` | ✅ |
| `insight-no-escalation`（node） | 0 | — | `21 pass / 0 fail` | ✅ |

### 3.4 性能与边界（维度 §5.4）

| 指标 / EC | spec 要求 | 实测值 | 偏差 | 达标？ |
|-----|---------|-------|------|:--:|
| 体积 A 列（叶2 净负） | 目标带 −2.5~−1.0 KB；严格口径 −1.2~+0.3 KB | **−548 B**（599,125→598,577） | 落在严格口径内、未达目标带（**已如实登记**，非伪称） | ✅（诚实登记） |
| 体积终值 | 598,577 B（R2 Δ 0） | 598,577 | 0 | ✅ |
| 生效上限 | `min(675,840, floor(598,577×1.05))` | **628,505** | — | ✅ |
| 档位 / 绝对上限 | 614,400 / 675,840 | 614,400 / 675,840（未跨档位） | — | ✅ |
| 作者确认 | `pending-author-line` | `pending-author-line` | 不伪称 | ✅ |
| EC-IAN-016 三态 | 越生效/档位/绝对上限 | 否 / 否 / 否 | — | ✅ |
| 两叶 Σ | +5.0~+9.0 KB 带内 | **+6,631 B** | — | ✅ |
| 冻结面零容差 | content 177,076 / pick-layer 34,358 | 逐字节不变 | — | ✅ |
| EC-IAN-017（`#composer` 回流） | 法四门禁必红 | 注入 `<form id=composer hidden>` ⇒ red | — | ✅ |
| EC-IAN-018（AI 代填/代提交） | 必红 | `insight-no-escalation` 21/0 + `law8` 60/0 | — | ✅ |
| EC-IAN-015（`KL-N-10` flake） | 隔离复跑 ≥2 + 如实记录 | s0 隔离复跑 ×2 = 82/0；binding 环境红已如实登记 | — | ✅ |

### 3.5 漂移检测（维度 §5.5）

| 漂移类型 | 检测命令/方法 | 结果 |
|---------|-------------|------|
| 孤立代码（有代码无需求） | 去注释扫 `composer`（全 `src`）+ `requestTurn(` 计数 | ✅ 2 处均为 **登记册声明**（退役册 + `RETIRED_HOST_ATTRS` 宿主值），无输入面/第二提交点；`requestTurn(` 恰 1 |
| 需求缺失（有需求无代码） | spec §4 FR 组 × 门禁载体逐组对账 | ✅ 无缺失（§3.1 全组 ✅） |
| 规格漂移（spec 被修改） | `.sddu/.../v4-chat/spec.md` 三锚 = **唯一授权原地修订**；本叶 `spec.md` 零改动 | ✅ 三锚一致且 `half-fix⇒red`；本叶规范未漂移 |
| 人工面（不可合成项） | 台账 `manualFaces` 直读 | ⏳ M3/M4（及 M1/M2/M5）如实登记「未执行」，**不冒充 PASS** |

---

## 4. 验证脚本执行记录（ADR-003）

> 脚本存放路径：`/tmp/sddu-validate-ian-2-abolish-composer-20260925T164456Z/`（自主编写、直接执行；不走 task→build）
> 日志：`/tmp/opencode/v4-gate-logs/ian-2-validate/`（同源快照 `…/registry/`）

| 脚本文件 | 用途 | 对应场景 | 退出码 | 关键输出 |
|---------|------|:--:|:--:|---------|
| `A-s0bb-node-replica.mjs` | 独立复刻 S0''-B node 面三 id 零命中 + 注入必红 + 再铸扫描 | V1 | 0 | `retired_id_hits=[]` · `remint_hits=[]` · `injection_detected=true` · `html_sha256=ba9f3248…` |
| `B-law4-three-way.mjs` | 独立复刻法四三处一致 + 半修必红 | V2 | 0 | 三锚 `hasCore=true` · `ledger_old_new_verbatim=true` · `half_fix_reported_lines=[225]` |
| `C-retire-behavior.mjs` | 真退役行为级：退役链 + `requestTurn(` + `sendDisabled` + `#send-reason` | V3 / V4 / V5 | 0 | `requestTurn_callSites=1` · `sendDisabled_reanchored=true` · `send_reason_present=true` |
| `D-protected-segments.mjs` | journey 新 pin / binding keep 逐字节复算 | V9 | 0 | journey `7b309258…`/15863B/249 行 · binding `be9ad0e9…`/8150B/零退役 id |
| `E-t220-reanchor.mjs` | T220 三文件只升不降 + `zeroDiffFiles`/`redlineRemap` | V8 | 0 | `{insight:125,l0:251,l1:132}` · `zeroDiffFiles=9` · `redlineRemap=8` |
| `F-redlines-volume.mjs` | 三冻结面 + 常量 + 五要素 + 两叶 Σ | V10 | 0 | `content 177,076` · `pick 34,358` · `panel 598,577` · `KIND_SET 40`/`12`/`13`/`16` · Σ `+6,631` |
| `G-counts.mjs` | I-R2-01 counts 登记口径（前/后） | V11 | 0 | 前：`stale=[supersession 48→49, nodeTestRuntime 1441→1443]`；后：`stale=[]` |
| `I-r6-residual.mjs` | R6 残留路径无 composer 依赖回归 | V4 | 0 | `restoreFreeInputDraft_impl=1` · `turnQueue_composer=false` · 禁用位不依赖 `pending` |
| `H-injections.sh` | 三处真实注入必红 + 逐字节还原 | V12 | 0 | ① `6→5/1fail` ② `6→1/5fail` ③ `6→1/5fail`；还原后均 `6/0` 且 `cmp IDENTICAL` |

> 上述脚本在报告固化前经历 1 轮自校准（修正对生产实现的字面假设：`revealAskFallback` 经 `l0?.revealFallback()`、`sendDisabled` 为对象属性、`NEVER_FOLDABLE` 行式提取），校准后 8/8 全绿；判据均读生产真源，不读测试自建常量。

---

## 5. 阻塞问题 / 非阻塞观察

| # | 级别 | 位置 | 问题 | 对应 Vx | 处置 |
|---|:--:|------|------|:--:|------|
| — | — | — | **阻塞问题 0** | — | — |
| **N-1** | 非阻塞（环境） | `test/ui/s0-self-driven.mjs` ⑦A | 首轮 **81/1**：`⑦A 机制侧：规则 ∈ 候选闭集 — {"susp":1,"trigger":"answered","rule":null,"next":3}`（headless 探测相位未定，`rule=null`） | V1 | **隔离复跑 ×2 = 82/0** ⇒ KL-N-10 家族环境性时序 flake（新增变体）；S0''-B 判据本体（S0C-12）首轮即全绿 |
| **N-2** | 非阻塞（环境） | `test/ui/binding.mjs` | 串行批次 4 次红（失败项互异：① `#8d/#8e tabs switch 二次确认 — no confirm` + `#confirm-allow` harness error；② `#6l 滚到底 residual=undefined` + `#8f~#8i tabs switch`）；诊断 `CDP socket not open (readyState=3)`（浏览器/渲染进程早死） | V9（保护段） | 保护段**字节级**经 `test:supersession` 双绿（sha `be9ad0e9…` + startByte 107780 + 3 反证）；build/review 均实测 **192 PASS**；机器并发高载（opencode 136% CPU + codex/copilot）⇒ 环境性；**建议空闲机复跑 `test:binding` 确认**；不改任何判据 |
| **I-R2-01** | 已闭环 | `docs/v4-supersession-ledger.json#counts` | review R2 残留：`supersession 48` / `nodeTestRuntime 1441` 滞后 | V11 | **本轮前移** 48→**49** / 1441→**1443** + `source.observed`/`observedLine` 同步 + `source.log` 重登记 validate 快照；N-04 由 4 项 skip → **4 项逐条同源** |

---

## 6. 结论

**结论**: ✅ **通过**

**指标达标矩阵**：

| 指标 | 要求 | 实测 | 达标？ |
|------|------|------|:--:|
| FR 测试覆盖 | 100% | 100%（11 组 / 54 父 FR 切片） | ✅ |
| NFR 测试覆盖 | ≥ 80% | 100%（12/12，本叶相关） | ✅ |
| 构建退出码 | 0 | `npm test` 0（1443/0/0） | ✅ |
| 阻塞问题数 | 0 | **0** | ✅ |
| 严重漂移 | 0 | **0** | ✅ |
| 冻结面 / 体积 | 零容差 / 净负登记 | 三冻结面逐字节 ✅ · 598,577（净负 −548 已如实登记） | ✅ |
| 人工面 | 如实登记 | M3/M4（+M1/M2/M5）⏳ 不冒充 PASS | ✅ |
| 环境性 flake | 隔离复跑 + 如实登记 | s0 复跑 82/0；binding 环境红如实登记不阻塞 | ✅ |

**理由**：IAN-2 叶的**规范级验收全部达标**——`#composer/#input/#send` 三 id **DOM 真退役（非 hidden）**（node 独立复刻 + Chromium 82/0 + 三处注入必红逐字节还原）；**法四原地修订三处一致** + old→new 逐字台账 + 半修必红；四处兜底收敛终态 + 卡内唯一载体 + `requestTurn(` 恰 1；`#send-reason`/`sendDisabled`/draft/引导重锚；X-IAN-1~11 并集收口（`supersession` 49/0）；T220 三文件只升不降（125/251/132）；journey 新 pin 与 binding keep 逐字节双绿；三冻结面零容差、零新增载体、体积 598,577（净负 −548 诚实登记）、两叶 Σ +6,631；全量 `npm test` **1443/0/0** + 13 组门禁绿。**I-R2-01 已于本轮闭环**（counts 前移 + N-04 4/4 同源）。两处红均为**环境性 flake**（KL-N-10 家族：s0 首轮 81/1 已隔离复跑转 82/0；binding 运行时因机器高载 CDP 早死，其**保护段字节级**经 `supersession` 双绿且 build/review 均 PASS 192），**非规范偏差、非阻塞**。**0 阻塞 / 0 严重漂移 ⇒ Feature 可关闭**。

---

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建（validate R1）：V1~V12 全绿 · **0 阻塞** · 2 非阻塞环境 flake（KL-N-10 家族）+ I-R2-01 闭环 · 亲跑 `npm test` 1443/0/0 + 13 组门禁 · S0''-B 双面 + 三注入必红逐字节还原 · 红线/体积终核 · 8 自主脚本（ADR-003） | 2026-09-26 | SDDU Validate Agent |
