# 验证报告：specs-tree-v5-2-ops-first-batch（V5-2 首批 9 op 落地 + SW 执行器 + 断流首验收）

> **文档定位**: SDDU 验证报告 — 逐项记录 V1~V9 的**实测**结果，作为本叶工作流终点
> **验证策略**: `validate.md` v1.0（V1~V9 对抗优先场景矩阵 + 五维度方法学）
> **前置依赖**: `spec.md` v1.0 · `review-report.md` v2.0（R2 **✅ 通过**，0 阻塞 / 13 低危；审查对象 HEAD `13b7d76`）· 父 ADR-V5-001~012
> **创建人**: SDDU Validate Agent
> **创建时间**: 2026-09-22
> **验证轮次**: **R1**（独立动态验证；对象 = HEAD `9a9849b`（工作树含本轮 N-02/N-03 订正），基线 = 分支 `feature/web-cli-plugin` / v5-1 收口 `8526ef8`）
> **版本**: v1.0
> **更新人**: SDDU Validate Agent
> **更新时间**: 2026-09-22
> **更新说明**: 初始创建（V1~V9 全绿；对抗注入逐类判红并还原；红线/保护段/体积三值独立复算命中；N-02/N-03 订正落地，N-01 因**实测体积后果**转登记）

---

## 1. 验证概要

| 维度 | 数值 |
|------|:--:|
| 验证项总数 | 9（V1~V9，含 60+ 子断言 / 8 个自研探针） |
| 通过 | **9** |
| 失败 | 0 |
| 无法执行 | 1（人工面：浏览器原生权限弹窗体感 / 读屏实感 → `⏳`，按 EC-ALLN-007 / AC-ALLN-024 规定**不冒充 PASS**） |
| 阻塞问题 | **0** |
| 非阻塞登记（N） | 1（N-01 拒绝路径重复失败行；附实测体积后果与修复路径） |
| 新发现低危（F/N 观察） | 4（N-06~N-09；均不落空任何 FR/NFR/EC） |
| 红线 / 冻结面 | **逐字节命中**（`content.js` 177,076 / `52a82620…`；`pick-layer.js` 33,900 / `5f567d7e…`；保护段 `be9ad0e9…`；manifest / `src/content/**` / v3 台账零 diff） |
| 体积 | **542,150 B ≤ 生效上限 569,257 B**（档位 563,200 / 绝对上限 619,520 / `pending-author-line`） |
| 构建 | `npm run build` 退出码 **0**；冻结面**可复现**（重建后 sha 逐字节一致） |

---

## 2. 逐项验证结果（V1~V9）

| # | 验证对象 | 验证步骤（摘要） | 预期结果 | 实测结果 | 判定 |
|---|---------|----------------|---------|---------|:--:|
| **V1** | 门禁全量复跑 + 计数对账 | 串行复跑 node + Chromium 门禁；与 build/review 声明值对账 | 全绿 + 计数只增 | `npm test` **1172/1172/0**（exit 0）；recommendation **65/0**；stream **68/0**；ask-auth **71/0**；binding 首轮 188✔/5✖（KL-N-10）→ **复跑 192/0 PASS**；l0 **244/0**；density **232/0**；journey **PASS 171**；zero-injection **27/0**；size 三文件 **45/0** | ✅ |
| **V2** | 9 op 产品路径真实驱动 + 三面同执行体 | `runOp(opId)` 生产默认缝逐 op 驱动；三层面对照 | 9/9 唯一入口；空面 loud；三面同体 | 9/9 命中各自唯一 hook（turn/pick/describe/rebind/help/authorize/llmConfig/permRequest/revoke）；空面 `panel-hook-missing:<opId>`（无假成功）；panel/settings/options 三面各落储 1 次且值一致 | ✅ |
| **V3** | S2 断流全链独立复刻 | 5 类阻塞逐类判可达 + 真链 10 拍 + 反证 | 死端=0；反证可红 | 死端 **0**；逐类专属修复 op 全命中；`llm.unconfigured`/`perm.missing` 与恢复态**非同构**；10/10 拍全绿（含真 SW 两段握手 → `https://s2.test:granted`）；删恢复面 ⇒ 判据**红**；拒绝路径固化 + `NEXT:…:rejected` | ✅ |
| **V4** | SW 安全对抗 | 7 类伪造 + 3 类非法目标 + probe 只读 + `KIND_SET` 注入 | 伪造全拒；注入必红 | 7/7 伪造在执行体前拒绝；未注册 opId / 无 origin / 缺 permission 全拒；probe 后 `authorizeCalls=0`、commit 后 1；`KIND_SET` 40 项逐字、`'op-` 0、注入 3 个字面 ⇒ **判红**；`src/content/**` 9 文件 **0** 边；镜像字段 `{audit,fail,mode}` | ✅ |
| **V5** | 法八入口对抗 | 生产形状动作过真 reducer / 卡文案 / digest | 值零可见 | 终结 payload = `{"maskedLength":"8+"}`（无 `answer`、无原始长度）；全状态 JSON 不含密钥；反向带 `answer` ⇒ 泄漏（判据非恒真）；digest 闭集不含值/长度且 label 藏密钥**抛错**；卡 `type=password`+`data-secret`+aria；`keyStore.save(` 恰 **1** 处 | ✅ |
| **V6** | 失败语义对抗 | 半完成失败 + 反证 + 真 body 中途失败 | 失败+整体回滚，无假成功 | `{ok:false}` ⇒ `failed` + 三表 `db==before`（零半完成态）+ 失败行（无 ✓）+ 可达 next；短路回滚 / 恒 completed ⇒ 判据**红**；`revoke('permission')` 中途「仍持有」⇒ `ok=false` + 诚实回执；未在册 ⇒ `revoke-unregistered` | ✅ |
| **V7** | 红线与冻结面 | 自算 sha256 / `git diff` / 源码块扫描 | 逐字节命中 + 零 diff | `content.js` 177,076 / `52a82620…`；`pick-layer.js` 33,900 / `5f567d7e…`；保护段 8,150 B / `be9ad0e9…`；manifest / `src/content/**` / v3 台账对 `8526ef8` **零 diff**；`KIND_SET` 40 / `'op-` 0 | ✅ |
| **V8** | 体积三值同源 | 独立复算 + 越限注入 | 三值同源 + 越 1 B 红 | `SIDEPANEL_BASELINE_BYTES == FINAL == dist` = **542,150**；**569,257** = floor(542,150×1.05)；**563,200** = ceilTo50KB(542,150)；**619,520** = round(563,200×1.10)；生效 = min = **569,257**；`pending-author-line` 在位；569,258 / 619,521 ⇒ **红** | ✅ |
| **V9** | spec AC 抽验 + X1/X2 重锚 | 四态 / 单调用点 / X1 / X2 / 门禁清单 / 反证 | 全部成立 | 四态 `completed,cancelled,rejected,failed`；`op.execute(` 恰 **1**（`pipeline.ts:194`）；per-op 分支 **0**；特权恰 2；13 门禁在位；3 条伪造逐条**红**；`expectFailPattern` 97 条；人工面 `⏳` | ✅ |

> **⏭️**：AC-ALLN-024（浏览器原生权限弹窗体感）与 NFR-008 的**读屏实感**为人工面 —— headless `PENDING_TIMEOUT` 不可合成（`binding.mjs` 已如实记录），本轮**未执行**，标 `⏳`，**不冒充 PASS**。

---

## 3. 验证详细信息

### 3.1 测试覆盖（V1）

| 门禁 | 基线（v5-1/前轮） | 本轮实测 | 计数口径 | 判定 |
|------|:--:|:--:|:--:|:--:|
| `npm test`（node，含 supersession 35 / gate-integrity 14 / design-contract 19 / size-ruling-vol3 12 / op-wiring 7 / sw-op-mirror 5 / next-pipeline 20 / blocked-terminals 9 / s2-deadend-chain 6 …） | 1130 → 1141 → 1166 | **1172 / 1172 / 0**（exit 0） | `node --test` 汇总 | ✅ 只增 +7 |
| `test:recommendation` | 65 | **65 / 0** | `passed / failed` | ✅ |
| `test:stream` | 63 | **68 / 0** | `passed / failed` | ✅ +5 |
| `test:ask-auth` | 61 | **71 / 0** | `passed / failed` | ✅ +10 |
| `test:binding` | 192 | 首轮 **188✔ / 5✖**（`ERR:CDP socket not open`）→ 隔离复跑 **192 / 0 PASS** | assertions | ✅（KL-N-10 如实登记） |
| `test:l0` | 244 | **244 / 0** | `passed / failed` | ✅ |
| `test:density` | 231（R1）/ 232（R2） | **232 / 0** | `passed / failed` | ✅ |
| `test:ui`（journey，真机） | 171 | **PASS — 171 assertions** | assertions | ✅ |
| `test:zero-injection` | 27 | **27 / 0** | `passed / failed` | ✅ |
| size-budget + size-ruling-vol3 + size-growth-evidence | — | **45 / 0** | `node --test` 汇总 | ✅ |

**FR 覆盖账（34/34 = 100%）**：`FR-ALLN-040 041 042 043 044 045 046 047 048 049 / 014 016 / 020 021 022 / 065 066 067 068 069 / 075 076 077 078 / 110 111 116 / 003 / 120 121 124 125 / 130 133` 逐条落于 V2~V9（映射见 `validate.md` §3.1），**无未覆盖项**。

**NFR 覆盖账（9/9 = 100%）**：`003 009 010 011 006 007 002 008 005` 逐条有实测判据；其中 **NFR-008 的「读屏实感」子面**属人工面（`⏳`），代码面（`type=password` / `data-secret` / `aria-label`）实测在位。

### 3.2 接口与数据实测（V2 / V3 / V4 / V5 / V6 / V9）

| 检查项 | spec / 声明要求 | 实测结果 | 一致？ |
|--------|---------------|---------|:--:|
| 9 op 描述符 | 9 行 `{id, layer, mode, fail, audit}` | 9/9，`layer` 分布 panel 7 + sw 2 | ✅ |
| 特权 op 清单 | 恰 2（`op.authorize` / `op.perm.request`） | `SW_OP_DESCRIPTORS = op.authorize, op.perm.request` | ✅ |
| SW 镜像字段集 | `{id, mode, fail, audit}` | `{mode, fail, audit}` 由同一 op 表派生（`id` 为键） | ✅ |
| 伪造 `op-exec`（7 类） | 无 consent ⇒ 不得执行 | 7/7 在执行体前拒绝（无/空 token、缺/非布尔 gesture、坏 phase、非 op-* kind、null） | ✅ |
| probe 阶段 | 只读、无状态变更 | `authorizeCalls=0`、audit 0 条 | ✅ |
| commit 阶段 | 唯一提交点 | `authorizeCalls=1`、audit 1 条；抛错 commit ⇒ 无状态变更 | ✅ |
| `op.perm.request` 在册校验 | 「新增项必须在册」 | 面板/options 侧 `unregisteredCapabilityIds` 强制；**SW commit 只校验字段存在性**（见 N-06） | ⚠️ 口径 |
| 三面同执行体 | panel / settings / options 同 body | `runOp` / `dispatchOp('settings')` / `dispatchOp('options')` 各真实落储 1 次，值一致（`sk-three-face` / `maxRounds=40`） | ✅ |
| 掩码终结 payload | `{opId, ts, maskedLength(类别), result}` | `{"maskedLength":"8+"}`；无 `answer` / 无原始长度 | ✅ |
| 值 sink | 恰 1 处 | `sidepanel.ts` 中 `keyStore.save(` 代码调用点 **1** | ✅ |
| digest 面 | 零明文 | 闭集字段 11 项，不含 `answer`/`maskedLength`/`text`；label 藏密钥**抛错** | ✅ |
| 三表整体回滚 | `{ok:false}` ⇒ 全表还原 | `db == before`（零半完成态）；反向短路回滚 ⇒ 判据红 | ✅ |
| 管线四态 | 唯一四态、无 per-op 旁路 | `completed / cancelled / rejected / failed` 逐一实测；`op.execute(` 恰 1 调用点 | ✅ |
| 逐 op 布线 | 唯一调用点 + ≥3 反证 | 实测 `[]`；3 条伪造逐条判红（复制调用点 / 本地 op 接 `requestTurn` / 本地 op 受 pending 门控） | ✅ |

### 3.3 构建脚本（V1 / V7 / V8）

| 命令 | 退出码 | 耗时 | 输出摘要 | 结果 |
|------|:--:|------|---------|:--:|
| `npm run build`（末轮，源 = 含 N-02/N-03 订正） | **0** | ≈ 8 s | `content.js` 177,076 / `pick-layer.js` 33,900 / `sidepanel.js` **542,150** / `background.js`；`dist/build-meta.json` 产出 | ✅ |
| 可复现性（冻结面） | — | — | 重建后 `content.js` sha `52a82620…`、`pick-layer.js` sha `5f567d7e…` **逐字节一致** | ✅ |
| 登记一致性 | — | — | 重建后 `size-budget` + `size-ruling-vol3` + `size-growth-evidence` **45/0**（登记值 == 实测产物） | ✅ |

> 过程记录：本轮先对**含 N-01 试验性改动**的源做了一次构建（`sidepanel.js` → **542,064 B**，−86 B），据此测得 N-01 的体积后果；**该改动已完整还原**（`git checkout` 源文件 + 重建），末轮产物回到 542,150 并全绿 —— 属「扰动可还原」纪律的实证。

### 3.4 性能与边界（V2-D / V8）

| 判据 | 要求 | 实测 | 达标？ |
|------|------|------|:--:|
| `sidepanel.js` ≤ 生效上限 | 542,150 ≤ 569,257 | 542,150 ≤ min(619,520, floor(542,150×1.05)=569,257) | ✅ |
| 档位 / 绝对上限 | 563,200 / 619,520 | `ceilTo50KB(542,150)=563,200`；`round(563,200×1.10)=619,520` | ✅ |
| 越限注入 | 越 1 B 即 FAIL | 569,258 ⇒ FAIL；619,521 ⇒ FAIL（纯函数/公式复算，判据非恒真） | ✅ |
| `pending` 门控边界 | 本地 op 永不入队；带卡 op 可入队 | `op.turn/pick/rebind/help/describe`（`openAsks=99`）均未 `queued`；`op.llm-config` ⇒ `queued` | ✅ |
| 人工面体积口径 | 不得越档位 | `authorConfirmation.status = pending-author-line`（占位，不伪称已确认） | ✅ |

### 3.5 漂移检测（V4 / V7 / V9）

| 漂移类型 | 检测命令/方法 | 结果 |
|---------|-------------|------|
| 孤立代码（有代码无需求） | 9 op 描述符 ↔ spec §4 逐条对照；`op.execute(` / `keyStore.save(` 单点扫描 | ✅ 无（9/9 有 FR 归属；无第二执行/留值路径） |
| 需求缺失（有需求无代码） | 34 FR 逐条找承接点 | ✅ 无（34/34） |
| 规格漂移（spec 被修改） | `git status` / `git diff 4c1dbe1..HEAD -- …/spec.md` | ✅ 本叶 `spec.md` 未被改动 |
| 冻结面漂移 | `git diff 8526ef8 -- manifest.json src/content docs/v3-supersession-ledger.json` | ✅ 三者**全空** |
| 红线漂移 | 自算 sha256（content / pick-layer）+ 保护段 sha | ✅ 逐字节命中 |
| `KIND_SET` 漂移 | 字面块逐字比对（40 项）+ `'op-` 计数 | ✅ 0 新增；注入反证可红 |
| 断言删减口径（FR-ALLN-003） | `git diff 4c1dbe1..HEAD -- test/` 逐行审计 | ⚠️ 删除 53 行含断言的行（新增 4,558 行）；**全部落在 `docs/v4-supersession-ledger.json` 已登记的 `V52R2-MR-*` / `V52R3-MR-*` modifiedRanges（13 条）内**，形态为①**数值重锚**（体积登记随基线前移：498,521/512,000/563,200 → 507,315/518,543/542,150/619,520 等）与②**结构重锚**（`handleCardAction` 逐 act 分支断言 → op 表逐 op 布线断言，判据等价且两段证伪在位）。计数**只增**（node 1130→1172 / stream 63→68 / ask-auth 61→71 / binding 192→192）；`supersession` 35/0 + `size-growth-evidence` 的 `assertionNonRemovalEntries` 断言全绿。 |

---

## 4. 验证脚本执行记录（ADR-003）

> 脚本由本 Agent 自主编写并**直接执行**（不走 task→build）；探针目录 = 编排器指定 `/tmp/opencode/v5-2-validate/`（模板默认 `/tmp/sddu-validate-<feature>-<timestamp>/`）；日志在 `logs/`。

| 脚本文件 | 用途 | 对应场景 | 退出码 | 关键输出 |
|---------|------|:--:|:--:|---------|
| `logs/run-gates.sh` | 门禁串行复跑（recommendation→stream→ask-auth→binding） | V1 | 0 | 65/0 · 68/0 · 71/0 · 192/0（binding 首轮 flake 后复跑） |
| `probe-v2-ops.mjs` | 9 op 产品路径驱动 + 三面同执行体 + pending 门控 | V2 | 0 | 9/9 hook 命中；空面 `panel-hook-missing`；三面 3 次落储 |
| `probe-v3-s2.mjs` | S2 全链独立复刻（逐类可达 / 真握手 / 反证） | V3 | 0 | 死端 0；10/10 拍；删恢复面 ⇒ 红 |
| `probe-v4-sw.mjs` | SW 伪造对抗 + `KIND_SET` 注入 + `src/content` 边扫描 | V4 | 0 | 7/7 拒；probe 只读；注入 ⇒ 红 |
| `probe-v5-law8.mjs` | 法八入口四面（payload / 卡文案 / digest / 源码面） | V5 | 0 | 终结 payload 仅类别；反向泄漏（非恒真）；digest 抛错 |
| `probe-v6-failure.mjs` | 失败语义 + 三表回滚 + 真 body 中途失败 | V6 | 0 | `db==before`；反向判红；诚实失败回执 |
| `probe-v78-static.mjs` | 红线 sha / 冻结面 diff / 体积三值复算 | V7 / V8 | 0 | 逐字节命中；三值同源；越限红 |
| `probe-v9-ac.mjs` | AC 抽验 + X1/X2 重锚 + 反证函数实跑 | V9 | 0 | 四态；`op.execute(` 1；3 伪造红；97 条 `expectFailPattern` |
| `probe-n01.mjs` | N-01 复现（拒绝路径失败行计数） | N-01 | 0 | 复现形态 **2 行**（panel hook + pipeline settle）；去重形态 1 行 |
| `/tmp/opencode/v5-2-validate/logs/*.log` | 全部门禁与探针原始输出 | V1~V9 | — | 见 §3.1 / 各 Vx 实测列 |

---

## 5. 阻塞问题

**无（0）**。

---

## 6. 非阻塞登记与 F/N 清单

| # | 来源 | 位置 | 问题 | 分级 | 处置 |
|---|------|------|------|:--:|------|
| **N-01** | review R2 | `sidepanel.ts#permRequest`（≈:1447） + `pipeline.ts#defaultSettle('failed')` | `op.perm.request` **拒绝路径**同一失败事实行**写 2 行**（panel hook 与管线 settle 各一次；本轮探针独立复现：`notices=[拒绝文案, 拒绝文案, NEXT:…]`） | **N（登记）** | **未落地，附实测后果**：该去重是**删一条 bundle 语句**，实测 `dist/sidepanel.js` **542,150 → 542,064 B（−86 B）**，触发 4 条产物/归因断言（`size-budget` 产物等式、`size-growth-evidence` 汇总与 v4-1 轮逐模块字节、`SIDEPANEL_GROWTH_BREAKDOWN` 末轮）红灯 ⇒ **须走一轮五要素体积重登记**（`SIDEPANEL_BASELINE_BYTES/FINAL/CEILING 字面 pin ×5 + 登记行 + v4 台账 modifiedRanges`）。validate 阶段**不静默移动已冻结的体积锚**（V8 目标值即由编排器指定复核）⇒ 转登记，修复路径：下一 build 轮按上述 6 文件清单重登记后落地（`-86 B` 为向下变更，档位 563,200 与绝对上限 619,520 不变，生效上限降为 569,167，**更紧更安全**）。**非阻塞**（重复行不改变事实语义、不落空任何 FR/NFR/EC）。 |
| **F-01** | review R2 **N-02** | `src/ui/settings/ops.ts`（`dispatchOp` docstring） | 仍称执行体「lives exactly once (in `next-registry/ops.ts`'s table)」，实际共享执行体在 `settings/op-bodies.ts` | **F（已订正）** | 已改为指向 `settings/op-bodies.ts`（三面注入原子）；**零字节影响**（TS 注释/接口声明不进产物——重建后 `sidepanel.js` 仍 542,150） |
| **F-02** | review R2 **N-03** | `size-budget.test.ts`（3 处）/ `size-ruling-vol3.test.ts`（2 处）/ `ADR-V5-011` v5.1 注 / 父 `state.json#PO-ALLN-005` | 体积登记**时效**：注释分母写 `541,505`（判定值 `569,257` 实为 `floor(542,150×1.05)`）；ADR 注与 PO 仍锚 R2 时点值 `535,821 / 562,612` | **F（已订正）** | ① 5 处注释分母 → `542,150`；② `ADR-V5-011` 追加 **v5.2 时效注**（现行锚 `542,150 / 569,257 / 563,200 / 619,520`；v5.1 的 `535,821 / 562,612` 保留作历史）；③ 父 `PO-ALLN-005` 刷新为三轮 `507,315 → 542,150（+6.87%）` + 生效上限 `569,257`。**零字节影响**（测试注释/文档）；`size-budget`/`size-ruling-vol3`/`size-growth-evidence` 复跑 **45/0** |
| **N-04** | review R2 | `options.ts#bindPanelOps`（无 `snapshotTables`/`restoreTables`） | options 面失败路径回滚为 no-op（四类执行体均单 sink 原子写，无半完成态） | **N（登记）** | 维持 review 登记（口径项，非缺陷） |
| **N-05** | review R2 | `op-bodies.ts#revoke('permission')` + `snapshot.ts` permission 写 | 多能力撤销中途失败时 permission 表**只能 reconcile**（Chrome 仅手势可授） | **N（登记）** | 维持 review 登记；本轮实测「仍持有」路径**如实失败**（`permission-still-held:clipboard`），无假成功 |
| **N-06** | 本轮 | `op-executors.ts#execSwOp`（`op.perm.request` commit 分支） vs `op-protocol.ts` docstring | docstring 称「SW refuses an **unregistered** one（在册能力 id）」，实测 SW **只校验 `permission` 字段存在**（`permission:'ghost-cap'` ⇒ `ok:true`），在册判据实际在页侧 `op-bodies.permRequest` | **N（登记）** | 低危：SW 侧仅落审计（授予由 Chrome 手势决定），页侧在册判据真实生效；建议把 docstring 降级为「字段存在性（在册判据在页侧）」或把 `unregisteredCapabilityIds` 下沉至 SW |
| **N-07** | 本轮 | `service-worker.ts` `onMessage` | 对**任何** kind 都无发送方校验 ⇒ `op-exec` 与既有 `authorize` 消息**同等可伪造**（与 review I-08 的如实降级一致，非新增边界） | **N（登记）** | 维持 I-08 口径；若需强绑定，走「面板签发 nonce + SW 一次校验」（已在 I-08 登记为 open item） |
| **N-08** | 本轮 | `src/ui/settings/panel.ts:786`（`requestCapability`） | 设置视图的能力行仍有**自己的**手势入口 `requestCapabilityPermissionOnGesture(cap)`（对 v5-1 基线 `8526ef8` **零 diff**，pre-existing） | **N（登记）** | **范围外**：FR-ALLN-075 只收编 4 类（authorize/revoke/rebind/llm-config），FR-ALLN-077「其余设置操作不动」；语义上与 `op.perm.request` 重叠 ⇒ 建议登记给 v5-3 / 后续波次统一（不改本叶结论） |
| **N-09** | 本轮 | `test/ui/fixtures/s2-chain.mjs`（恢复态） | S2 ⑩「拾取 next 产出」拍在恢复态下产出的是 `act='next'`（→`op.turn`）chip，而非字面 `op.pick` chip；`op.pick` 由 `binding.stale`/`ref.all-invalid` 两类阻塞态提供 | **N（口径）** | 判据口径为「**可行动的** next（`act=next` ∨ op-direct）且 opId 已注册」，与本叶 AC-ALLN-001 的「死端=0」一致；如实登记，不改判 |

**计数对账（F/N）**：`F = 2`（F-01/F-02，均实测闭环且**零字节影响**）· `N = 8`（N-01 + N-04~N-09 + KL-N-10）· 阻塞 `0`。

---

## 7. 结论

**结论**: ✅ **通过**

**指标达标矩阵**：

| 指标 | 要求 | 实测 | 达标？ |
|------|------|------|:--:|
| FR 测试覆盖 | 100% | **34/34 = 100%** | ✅ |
| NFR 测试覆盖 | ≥ 80% | **9/9 = 100%**（NFR-008 读屏实感入人工面 `⏳`） | ✅ |
| EC 覆盖 | ≥ 80% | 11/11 有实测或如实口径（5 条实测 + 6 条按设计/口径） | ✅ |
| 构建退出码 | 0 | **0**（且冻结面可复现） | ✅ |
| 严重漂移 | 0 | **0**（冻结面/红线/`KIND_SET` 全命中） | ✅ |
| 阻塞问题数 | 0 | **0** | ✅ |
| 对抗判红 | 全类可红 | 伪造 7/7、注入、越限、短路回滚、恒 completed、删恢复面、3 条布线伪造 —— **全红且还原后全绿** | ✅ |
| 人工面 | 不冒充 PASS | 弹窗体感 / 读屏实感 = `⏳`（1 项无法执行，如实标注） | ✅ |

**理由**：

1. **门禁与声明值逐项可复现**：node 1172/0、四张 Chromium 主门禁（recommendation 65 / stream 68 / ask-auth 71 / binding 192）与补跑门禁（l0 244 / density 232 / journey 171 / zero-injection 27）全绿，计数只增；唯一一次红为 `binding` 的 **KL-N-10 环境性 flake**（`ERR:CDP socket not open`），隔离复跑 192/0 PASS，与 review R1/R2 登记同源。
2. **对抗面全部可判红**：SW 伪造（7 类）在执行体前被拒、probe 严格只读；`KIND_SET` 注入 3 个字面 ⇒ 逐字判据红；体积越 1 B ⇒ 红；短路回滚 / 恒 `completed` ⇒ 红；删恢复面 ⇒ S2 死端判据红；3 条布线伪造逐条红。**无空转判据**。
3. **红线与体积锚未被扰动**：`content.js` / `pick-layer.js` / 保护段 / manifest / `src/content/**` / v3 台账逐字节或零 diff；体积三值 `542,150 / 569,257 / 563,200 / 619,520` 同源且 `pending-author-line` 占位；重建后 `size` 三门禁 45/0。
4. **review 建议的订正已按「低风险 + 可还原」纪律处置**：N-02/N-03 **F 级闭环且零字节影响**；**N-01 实测为「−86 B 的产物变更」**（非文案级），会触发五要素体积重登记，validate 阶段按纪律转 `N` 登记并给出精确修复清单 —— 不静默移动编排器指定复核的体积锚。N-04/N-05 维持登记，新增 N-06~N-09 四项低危口径观察（均不落空任何 FR/NFR/EC）。
5. **人工面如实**：浏览器原生权限弹窗体感与读屏实感无 headless 合成路径，标 `⏳` 并保留在父 `PO-ALLN-007`，**不冒充 PASS**。

🎉 全部 7 阶段工作流已完成（discovery → spec → plan → tasks → build → review → **validate**）。

---

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建（R1 动态验证：V1~V9 全绿 / 8 个自研探针 + 门禁串行复跑；对抗全类判红并还原；红线·保护段·体积三值独立复算命中；N-02/N-03 订正落地，N-01 因 −86 B 体积后果转登记；结论 ✅ 通过 / 0 阻塞） | 2026-09-22 | SDDU Validate Agent |
