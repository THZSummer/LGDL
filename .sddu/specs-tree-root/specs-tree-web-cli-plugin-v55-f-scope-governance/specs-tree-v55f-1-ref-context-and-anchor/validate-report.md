# 验证报告：specs-tree-v55f-1-ref-context-and-anchor（V5.5F-1 范围底座）

> **文档定位**: SDDU 验证报告 — 逐项记录 V1~V10 的**实测**结果，作为本叶工作流终点
> **验证策略**: `validate.md` v1.0（V1~V10 对抗优先场景矩阵 + 五维度方法学）
> **前置依赖**: `spec.md` v1.0 · `review-report.md` v1.0（R1 **✅ 通过**，0 BLOCK / 2 I / 6 O；审查对象 HEAD `42cf28d`，I-01/I-02 于 `6b9b982` 微修闭环）· 本叶 `plan.md` v1.0 · 父 ADR-SGO-001~008
> **创建人**: SDDU Validate Agent
> **创建时间**: 2026-09-24
> **验证轮次**: **R1**（独立动态验证；对象 = HEAD `6b9b982`（微修后），基线 = 分支 `feature/web-cli-plugin`）
> **版本**: v1.0
> **更新人**: SDDU Validate Agent
> **更新时间**: 2026-09-24
> **更新说明**: 初始创建（V1~V10 全绿；自研 5 探针 + 2 处源码注入逐字节还原；红线/体积独立复算命中；法九 / `--ref` / S0′ 核心断言行为级承重；`page-input` 首跑环境性 flake 清理后隔离复跑绿，如实登记）

---

## 1. 验证概要

| 维度 | 数值 |
|------|:--:|
| 验证项总数 | 10（V1~V10，含 60+ 子断言 / 5 个自研探针 + 2 处源码注入） |
| 通过 | **10** |
| 失败 | 0 |
| 无法执行 | 1（人工面：S0′ 语义遵从观感 M1 / SPA 锚定失败提示可理解度 M4 → `⏳`，按 AC-SGO-026 规定**不冒充 PASS**） |
| 阻塞问题 | **0** |
| 红线 / 冻结面 | **逐字节命中**（`content.js` 177,076 / `52a82620…`；`pick-layer.js` 34,358 / `77796bab…`；base / security / content src / manifest 零 diff） |
| 体积 | **585,732 B ≤ 生效上限 615,018 B**（档位 614,400 / 绝对上限 675,840 / `pending-author-line` / `cap=record-only`） |
| 构建 | `npm test` 退出码 **0**（1375/1375/0）；逐门禁复跑全绿；注入还原后复绿 |

---

## 2. 逐项验证结果（V1~V10）

| # | 验证对象 | 验证步骤（摘要） | 预期结果 | 实测结果 | 判定 |
|---|---------|----------------|---------|---------|:--:|
| **V1** | 门禁全量复跑 + 计数对账 | `npm test` + 逐门禁单独复跑 + 与 build/review 声明对账 | 全绿 + 计数只增（基线 1375） | `npm test` **1375/1375/0**（exit 0）；law9 **12/0** · ref-context-in-turn **9/0** · dom-ref-anchor **7/0** · s0-self-driven-chain **24/0** · gate-integrity **20/0** · supersession **39/0** · insight-no-escalation **20/0** · op-wiring **14/0** · l1-ref-validity **21/0** —— 逐项与声明**逐字一致** | ✅ |
| **V2** | 法九行为级 | 驱动生产 `scopeReading` / `scopeWriteGate` + 真源切片判据 | 四值互异可判；`authorized` 纯输入；第二声明必红；三段控制非布尔 | 探针 **13/13**：四值逐值可判且互异；`no-ref ≠ in-scope`；同目标仅因 `authorized` 输入跨值（AI 不自判）；生产 confirm 面 `authorized: false` 恒值（无 `authorized: true` / 无自赋值）；第二声明（读数值 / 判定函数）注入 ⇒ **必红**；写闸 deny/pass 与 `no-ref` 不阻断正确；三段控制互异 | ✅ |
| **V3** | `--ref` 行为级 | 驱动 `resolveRefAnchor` / `wrapDomEntryForAnchor` + 假观测缝 | 合成锚；失配非静默；risk 不放宽；基 executor 失配不执行 | 探针 **16/16**：`--ref 1` ⇒ `[data-wcli-ref="ref_1"]`；`--ref`+`--selector` ⇒ EC-SGO-015 拒；读命令 ⇒ EC-SGO-017 拒；词法 6 形态 / 越界 / 失效逐条拒；单节点闸 0/多/缺/不可达/`nodeCount≠1` 全失配 + 显式命中数；失配 ⇒ 基线 executor **未被调用**（seen=0）；锚定通过 ⇒ 恰 1 次写且目标 = 合成锚；`risk` 逐字段等于 base ∧ 降档注入必红；删单节点闸 ⇒ 多命中被放行（真实现 fail-closed）⇒ 闸承重 | ✅ |
| **V4** | refs 载荷端到端 | 生产模块模拟 拾取 ⇒ 构建点 ⇒ `makeMessage` ⇒ SW 校验 ⇒ 系统段 | 载荷同源；零引用逐字；掩码单点；每回合 set/clear | 探针 **12/12**：真拾取 ⇒ 载荷 `refId/refNum/selector` 与拾取同源；`validateRefPayload` 保留；系统段 = 基座 + 追加段；无引用 ⇒ `refs` **字段缺席**（非空数组）⇒ `system===SYSTEM_PROMPT` **逐字**；凭据形 mask（`sk-…` ⇒ `•••`）且非凭据不误伤；holder `set`/`clear` ⇒ 零跨回合漂移；排队回合自带快照；唯一构建点 + SW 唯一来源静态切片成立 | ✅ |
| **V5** | **S0′ node 面独立复刻** | 自建读数驱动共享纯判据 `s0pProblems` + 核心断言对抗 | S0P-1~8 全绿；S0P-4/S0P-7 必红；sha 还原 | 探针 **14/14**：**★ S0P-4** `extraWrites`（改写 2 > 引用 1）⇒ 必红；**★ S0P-7** 去注入 ⇒ 载荷无引用 ∧ `noInjectionReading=no-ref` ∧ 判据必红（S0P-1/2/3）；伪造 `in-scope` ⇒ S0P-7 红；真源改判 ⇒ 切片判据红 + 字节真变 + **生产文件 sha256 前后逐字节相同**；S0P-5 扩围=用户批准 ⇒ `out-of-scope-authorized` + 留痕 `scope.authorized=user`；写目标 = 合成锚恰 1 次写 | ✅ |
| **V6** | S0′ Chromium 面 | 亲跑 `test/ui/s0-self-driven.mjs`（真面板） | 65/0（含 S0P-C1~C5）；`CHROMIUM_GATES===9` | **65 passed / 0 failed**：`S0P-C1` 真面板回合载荷含引用事实（`refNum=2` 与本次拾取同源，样本 canonical=1 由 node 面机核）；`S0P-C2` 系统段 = 基座 + 追加段在位（真产物字节）；**`S0P-C3` 合成锚在真 DOM 恰 1 命中 ∧ 注入第二节点 ⇒ 2 ∧ 移除后回 1**（判据非恒真）；`S0P-C4` 范围留痕独立成行且零用户内容值；`S0P-C5` 样本单源；人工面 M1/M4 = `⏳` 未执行（不冒充 PASS） | ✅ |
| **V7** | 留痕 + 法八四面 | 亲跑 `test/ui/law8-plaintext.mjs` | 46/0（36 零降级）；留痕零值 | **46 passed / 0 failed**：⑧ 引用注入路径四面零明文（payload ×3 / digest / 审计渲染+存储 / DOM value+属性逐项）+ 范围留痕只含字段名 + 机器枚举（零用户内容值）+ 凭据形掩码单点 + **注入一条卡 payload ⇒ 同一扫描必命中（非恒真）⇒ 还原零命中**；36 段零降级 | ✅ |
| **V8** | 红线 / 冻结面 / 载体 | 自算 sha256 + `git diff` + 生产模块导入 | 逐字节命中 / 零 diff；零新载体 | 探针 20/20（红线部分全绿）：`content.js` **177,076 / sha `52a82620…`**；`pick-layer.js` **34,358 / sha `77796bab…`**；`base / security / content src / manifest` 对 `68848af` **零 diff**；`KIND_SET` **40** ∧ `refs` 非 kind；`requestTurn(` **2** ∧ `maybeRecommend` **1/7** ∧ `nextAfterSettle` **1/10**；特权手势 **恰 2**（sw 层，恒 `gesture`）；**12 kind ∧ 零宿主**；`zeroDiffFiles` **9** 项（含 policy / auto-authorize） | ✅ |
| **V9** | 体积五要素 + 分列预算 | 独立复算式 + 产物 stat + metafile 归因 | 五要素同源；预算内；EC 未触发 | `BASELINE == FINAL == dist` = **585,732**；生效上限 = `floor(585,732×1.05)` = **615,018**（未越）；档位 `ceilTo50KB` = **614,400**；绝对上限 ×1.10 = **675,840**（未跨）；`pending-author-line` ∧ `cap=record-only`；A 列 **+7,109 B ≈ 6.94 KiB** 在预算 6.0~9.0 KB（上界 10.35 KB）内；逐模块归因 **Σ +7,070 + glue 39 == +7,109**；EC-SGO-022 三分支均未触发 | ✅ |
| **V10** | 注入抽验 + 漂移 + X 台账 | 2 处源码注入（逐字节还原）+ 台账 / spec / 孤立码扫描 | 注入全红且可还原；台账如实；0 漂移 | **注入 A**（法九真源 `no-ref → in-scope`，重编译）⇒ `law9` **8 pass / 4 fail**（L9-2 / L9-8 / L9-114① / L9-114③）、`s0-self-driven-chain` **19 pass / 5 fail**（含 S0P-7）⇒ `git checkout` 还原 ⇒ `ref-scope.ts` sha `9109b539…` **逐字节相同** ⇒ 复绿 12/0、24/0；**注入 B**（删 `dom-anchor` live 单节点闸 + 身份一致检查）⇒ `dom-ref-anchor` **5 pass / 2 fail**（DRA-2 / DRA-5）⇒ 还原 ⇒ `dom-anchor.ts` sha `f1363fed…` **逐字节相同** ⇒ 复绿 7/0；X-SGO 台账 rows **4 superseded（1/2/3/5）+ 3 no-supersession（4/6/7）** ∧ note 口径一致（I-01 已订正）；本叶 `modifiedRanges` **12** 项 ∧ 第 9 个 `leafBases` 段（`68848af` / `registeredLines 47`）；`spec.md` **未被修改**（零规格漂移）；无孤立代码 / 无需求缺失 | ✅ |

> **⏭️**：AC-SGO-026 的人工面 **M1（「原地」语义遵从观感）/ M4（SPA 锚定失败提示可理解度）** 属人工面 —— headless 不可合成，本轮**未执行**，标 `⏳`，**不冒充 PASS**（Chromium 门禁内已如实登记）。

---

## 3. 验证详细信息

### 3.1 测试覆盖（V1）

| 门禁 | build/review 声明 | 本轮实测 | 判定 |
|------|:--:|:--:|:--:|
| `npm test`（node 全量） | 1375 / 0 | **1375 / 1375 / 0**（exit 0，112.6 s） | ✅ |
| `law9-scope-reading`（新） | 12 / 0 | **12 / 0** | ✅ |
| `ref-context-in-turn`（新） | 9 / 0 | **9 / 0** | ✅ |
| `dom-ref-anchor`（新） | 7 / 0 | **7 / 0** | ✅ |
| `s0-self-driven-chain`（node S0P-1~8） | 24 / 0 | **24 / 0** | ✅ |
| `gate-integrity` | 20 / 0 | **20 / 0** | ✅ |
| `test:supersession` | 39 / 0 | **39 / 0** | ✅ |
| `insight-no-escalation` | 20 / 0 | **20 / 0** | ✅ |
| `op-wiring` | 14 / 0 | **14 / 0** | ✅ |
| `l1-ref-validity` | 21 / 0 | **21 / 0** | ✅ |
| `s0-self-driven`（Chromium） | 65 / 0 | **65 / 0** | ✅ |
| `test:law8`（Chromium） | 46 / 0 | **46 / 0** | ✅ |
| `test:l1`（Chromium） | 131 / 0 | **131 / 0** | ✅ |
| `test:page-input`（Chromium） | 125 / 0 | **125 / 0**（首跑环境性 flake，详见 §5；清理后隔离复跑绿） | ✅ |
| `CHROMIUM_GATES.length` | 9 | **9**（逐字不动） | ✅ |
| `V55F1_NODE_GATE_FILES` | ≥3（3 枚在册） | **3 / 3**（`ref-context-in-turn` · `law9-scope-reading` · `dom-ref-anchor`） | ✅ |

**FR 覆盖账（承载父 FR 切片 100%）**：`FR-SGO-001~006 / 010~019 / 020~028 / 030~038 / 070~077 / 080·083·084 / 090~094 / 100~107 / 110~116 / 120~125` 逐条落于 V1~V10（映射见 `validate.md` §3.1），**无未覆盖项**。

**NFR 覆盖账（11/11 本叶相关面 = 100%）**：`NFR-SGO-001 / 004 / 005 / 006 / 007 / 008 / 009 / 010 / 011 / 013 / 014` 逐条有实测判据。本叶**不承载** NFR-SGO-002 / 003 / 012 的批量侧断言（属叶2）—— 本叶未使其回退（`op-wiring` / `supersession` 复跑绿）。

**EC 覆盖账（本叶子集）**：EC-SGO-001/002/003/004/008/015/016/017/018/019/022 逐条有实测证据（§2 V2/V3/V4/V9），EC-SGO-018 由法九真源切片（不读 `SYSTEM_PROMPT`）+ 注入反证覆盖。

### 3.2 接口与数据实测（V2 / V3 / V4 / V5）

| 检查项 | spec / 声明要求 | 实测结果 | 一致？ |
|--------|---------------|---------|:--:|
| 范围读数四值 | `in-scope` / `out-of-scope-authorized` / `out-of-scope-unauthorized` / `no-ref` 唯一单源 | `SCOPE_READINGS` 恰 4 项且互异；`scopeReading` 逐值可判；第二声明 ⇒ 红 | ✅ |
| `no-ref ≠ in-scope` | 逐字区分 | 无引用 ⇒ `no-ref`；有引用命中 ⇒ `in-scope`；对照段成立 | ✅ |
| `authorized` 来源 | 只由用户确认产生（AI 不自判） | 读数仅由输入事实翻转；生产 confirm 面 `authorized: false` 恒值（无自赋值 / 无 `true`） | ✅ |
| 越界写拦 | `out-of-scope-unauthorized` fail-closed | `scopeWriteGate.blocked===true` + 可读理由 + 可达 next；`in-scope`/`no-ref` 不阻断 | ✅ |
| `--ref` 合成锚 | `[data-wcli-ref="ref_n"]`（恰一处铸造） | `--ref 1` ⇒ `[data-wcli-ref="ref_1"]`；与 `anchorSelectorFor` 单源 | ✅ |
| `--ref` + `--selector` | 显式错误（不静默择一） | EC-SGO-015 拒 | ✅ |
| live 单节点闸 | 仅 `nodeCount===1` 通过；失配非静默 | 0 / 多 / 缺 / 不可达 / `≠1` 全失配；多命中显式报告节点数 | ✅ |
| 基 executor 交接 | 失配 ⇒ 不被调用 | 失配 `seen=0`；通过 ⇒ 恰 1 次写 + 合成锚 + `ref` 剥离 | ✅ |
| `risk` 不放宽 | 逐字段对照 base | `risk='ui'` / `set-text='write'` 逐字；降档注入 ⇒ 红 | ✅ |
| 回合载荷字段 | type-only 7 字段（`refNum/refId/selector/refMark/textDigest/refState/nodeCount`） | 单声明；`refState` 恒 `'valid'`；`KIND_SET` 40 不动 | ✅ |
| 凭据掩码 | 凭据值不入上下文；掩码单点 | `sk-…`/`token=…` ⇒ 掩码；普通文本不误伤；`turnRefsOf` 单点 | ✅ |
| 系统段 | 基座 + 追加段；零引用逐字 | `refContextSegment([])===''` ⇒ `system===SYSTEM_PROMPT` 逐字 | ✅ |
| SW 唯一来源 | 引用事实只来自回合载荷 | SW 无 `ref-store` import；`case 'chat'` 读 `message.refs`；每回合 set/finally clear | ✅ |
| S0′ S0P-4 | 未授权时改写处数 ≤ 引用数 | 注入 extraWrites（2>1）⇒ **必红** | ✅ |
| S0′ S0P-7 | 去注入 ⇒ 读数空 / `no-ref` 否则必红 | 去注入 ⇒ 载荷无引用 ∧ `no-ref` ∧ 必红；伪造 `in-scope` ⇒ S0P-7 红 | ✅ |

### 3.3 构建脚本（V1 / V8 / V9）

| 命令 | 退出码 | 耗时 | 输出摘要 | 结果 |
|------|:--:|------|---------|:--:|
| `npm test`（node 全量） | **0** | ≈ 113 s | tests 1375 / pass 1375 / fail 0 | ✅ |
| `tsc`（test 编译，注入轮） | **0** | — | 注入后重编译 ⇒ 判据可见真源改动（还原后复绿） | ✅ |
| 冻结面复算 | — | — | `content.js` sha `52a82620…`、`pick-layer.js` sha `77796bab…` **逐字节命中** | ✅ |

> 说明：本叶 R2 全部改动落 B 列（`background.js`），A 列产物 `sidepanel.js` 的最终构建由 build 轮完成并登记；本轮 validate 以**产物 stat + sha 复算 + 门禁复跑**验证「登记值 == 实测产物」（`size-budget` / `size-ruling-vol3` / `supersession` 红线③ 复跑绿）。

### 3.4 性能与边界（V9）

| 判据 | 要求 | 实测 | 达标？ |
|------|------|------|:--:|
| `sidepanel.js` ≤ 生效上限 | 585,732 ≤ 615,018 | `floor(585,732×1.05)=615,018`；585,732 未越 | ✅ |
| 档位 / 绝对上限 | 614,400 / 675,840 | `ceilTo50KB(585,732)=614,400`；`614,400×1.10=675,840`；均未跨 | ✅ |
| A 列净增 vs 预算 | 6.0~9.0 KB | +7,109 B ≈ 6.94 KiB（上界 10.35 KB 未越） | ✅ |
| 逐模块归因 | Σ rows + glue == 登记增量 | Σ +7,070 + glue 39 == **+7,109** | ✅ |
| 人工面体积口径 | 不越档位 / 不伪称 | `authorConfirmation=pending-author-line`；`cap=record-only` | ✅ |
| EC-SGO-022 二态 | 越上限 / 越档位 / 越绝对上限 | 均 **否** ⇒ 三分支未触发 | ✅ |

### 3.5 漂移检测（V8 / V10）

| 漂移类型 | 检测命令/方法 | 结果 |
|---------|-------------|------|
| 孤立代码（有代码无需求） | 新增 5 `src` 模块 ↔ spec §4 逐条对照 | ✅ 无（ref-scope/ref-turn/ref-context/dom-anchor/ref-observe 均有 FR 归属） |
| 需求缺失（有需求无代码） | 承载父 FR 切片逐条找承接点 | ✅ 无 |
| 规格漂移（spec 被修改） | `git diff 68848af..6b9b982 -- …/spec.md` | ✅ **空**（spec 最后由 `850ae82` 提交，build/validate 期间零改动） |
| 冻结面漂移 | `git diff 68848af..6b9b982 -- base/src-security/src-content/manifest` | ✅ **空**（零 diff） |
| 红线漂移 | 自算 sha256（content / pick-layer）+ `zeroDiffFiles` 9 项 | ✅ 逐字节命中；判定链零触碰 |
| `KIND_SET` 漂移 | 字面块逐字比对（40 项）+ `refs` 非 kind | ✅ 0 新增 |
| 台账漂移 | X-SGO rows ↔ note ↔ `modifiedRanges` ↔ `leafBases` | ✅ 一致（I-01 微修后 rows 4/3 与 note 口径闭合） |

---

## 4. 验证脚本执行记录（ADR-003）

> 脚本由本 Agent 自主编写并**直接执行**（不走 task→build）；目录 = 编排器指定 `/tmp/opencode/v4-gate-logs/v55f-1-validate/`（模板默认 `/tmp/sddu-validate-<feature>-<timestamp>/`；本次按编排器指令使用固定目录）。

| 脚本文件 | 用途 | 对应场景 | 退出码 | 关键输出 |
|---------|------|:--:|:--:|---------|
| `probe-law9.mjs` | 法九四值 / 唯一声明 / 写闸 / 三段控制 + 第二声明注入 | V2 | 0 | 13/13；第二声明 / 第二判定函数 ⇒ 必红 |
| `probe-ref-anchor.mjs` | `--ref` 解析链 + 单节点闸 + risk 对照 + 基 executor 交接 | V3 | 0 | 16/16；失配 seen=0；删闸 ⇒ 多命中放行 |
| `probe-refs-e2e.mjs` | 拾取 ⇒ 构建点 ⇒ SW 系统段端到端 + 零引用逐字 + 掩码 | V4 | 0 | 12/12；无引用 ⇒ `system===base` 逐字 |
| `probe-s0p-node.mjs` | S0′ node 独立复刻（S0P-1~8 + S0P-4/S0P-7 核心断言） | V5 | 0 | 14/14；S0P-4 必红；S0P-7 去注入必红 + sha 零改写 |
| `probe-redline-size.mjs` | 红线 / 冻结面 / 载体 / 体积五要素 / X 台账独立复算 | V8 / V9 / V10 | 0 | 20/20；sha 逐字节命中；+7,109 预算内；rows 4/3 |
| `gate-*.log` | 逐门禁单独复跑原始输出 | V1 | 0 | 12/0 · 9/0 · 7/0 · 24/0 · 20/0 · 39/0 · 20/0 · 14/0 · 21/0 |
| `injectA-law9b.log` / `injectA-s0pb.log` | 注入 A（法九真源改判）后门禁红 | V10 | 1 | law9 8/4；s0p 19/5（含 S0P-7） |
| `injectB-dra.log` | 注入 B（删 live 单节点闸）后门禁红 | V10 | 1 | dom-ref-anchor 5/2（DRA-2 / DRA-5） |
| `injection-pre-shas.txt` | 注入前后 sha256 复核 | V10 | 0 | `ref-scope.ts 9109b539…` / `dom-anchor.ts f1363fed…` 还原 OK |
| `npm-test-first.log` / `final-npm-test.log` | node 全量复跑（首轮 / 还原后终轮） | V1 | 0 | 1375/0（×2） |
| `s0-self-driven.log` / `law8.log` / `l1.log` / `page-input-retry2.log` | Chromium 门禁串行复跑 | V6 / V7 / V1 | 0 | 65/0 · 46/0 · 131/0 · 125/0 |

---

## 5. 阻塞问题

**无（0）**。

---

## 6. 非阻塞登记与 F/N 清单

| # | 来源 | 位置 | 问题 | 分级 | 处置 |
|---|------|------|------|:--:|------|
| **N-01** | 本轮 | `test/ui/page-input.mjs` 首跑 | 首跑在「BLOCK-1 对照：根路径 `pick-layer-inject`」处 `Cannot access contents of the page` ⇒ 57✔/1✖ 中止；根因 = `/tmp` 下累积 **572 个陈旧 fixture 目录（2.3 GB）** 把 tmpfs 推到 **79%**，注入时序受扰（与 KL-N-10 同族环境性） | **N（登记）** | 清理陈旧 `/tmp/web-cli-*`（tmpfs → 39%）后**隔离复跑 125/0 PASS**。**不伪称首跑绿**；本叶零改动 `page-input` 的 BLOCK-1 段（改动仅 ⑰ 追加）。 |
| **O-01** | 本轮 | `sidepanel.ts` confirm 面 | `authorized: false` 恒值：本叶无扩围确认路径（WIDEN 二择卡属叶2）⇒ confirm 面 fail-closed；`out-of-scope-authorized` 本叶只能由读数输入事实触达（门禁用例覆盖） | **O（登记）** | 与 build 偏差登记 4 / review O-01 同源；属设计取舍，非缺陷 |
| **O-02** | 本轮 | 脚本目录 | 采用编排器指定固定目录（`/tmp/opencode/v4-gate-logs/v55f-1-validate/`）而非模板默认时间戳目录 | **O（登记）** | 与 v5-2 等前例一致；日志与脚本同目录，可回溯 |
| **O-03** | 本轮 | S0′ Chromium 面 `refNum=2` | 真面板给的序号为 `2`（本门禁前已拾取过一次），样本 canonical=1；判据写成「与本次拾取**同源** ∧ `refState=valid` ∧ `selector` 非空」 | **O（登记）** | 与 build 偏差登记 6 / review O-06 同源；**如实标注、不伪称 refNum=1**；canonical=1 由 node 面机核 |

**计数对账（F/N）**：`F = 0`（无 I 项修复落地 — review 的 I-01/I-02 已在 `6b9b982` 微修闭环，本轮 validate 复核其成立）· `N = 1`（N-01 环境性 flake，已隔离复跑绿）· `O = 3` · 阻塞 `0`。

---

## 7. 结论

**结论**: ✅ **通过**

**指标达标矩阵**：

| 指标 | 要求 | 实测 | 达标？ |
|------|------|------|:--:|
| FR 测试覆盖 | 100% | 承载父 FR 切片 **100%**（逐条 Vx 映射） | ✅ |
| NFR 测试覆盖 | ≥ 80% | 本叶相关 **11/11 = 100%** | ✅ |
| EC 覆盖 | ≥ 80% | 本叶子集逐条有实测证据（11/11） | ✅ |
| 构建退出码 | 0 | **0**（`npm test` 1375/0；冻结面 sha 逐字节命中） | ✅ |
| 严重漂移 | 0 | **0**（冻结面 / 红线 / `KIND_SET` / 台账全命中；spec 零改动） | ✅ |
| 阻塞问题数 | 0 | **0** | ✅ |
| 对抗判红 | 全类可红 | 法九真源改判 / 删单节点闸 / 第二声明 / 去注入 / extraWrites / risk 降档 / 恒绿检测 —— **全红且逐字节还原后全绿** | ✅ |
| 人工面 | 不冒充 PASS | 语义遵从观感 / SPA 锚定提示可理解度 = `⏳`（1 项无法执行，如实标注） | ✅ |

**理由**：

1. **门禁与声明值逐项可复现**：`npm test` 1375/0；逐门禁单独复跑计数（12/9/7/24/20/39/20/14/21）与 build/review 声明**逐字一致**；四张 Chromium 主门禁（s0-self-driven 65 / law8 46 / l1 131 / page-input 125）全绿，`CHROMIUM_GATES===9` 与 `V55F1_NODE_GATE_FILES===3` 不动。
2. **核心断言承重（编排点名）**：**S0P-4** 注入 extraWrites（改写 2 > 引用 1）⇒ 必红；**S0P-7** 去注入 ⇒ 读数为空 / `no-ref` ⇒ 必红，伪造 `in-scope` 亦必红，真源改判 ⇒ 红且 **sha256 还原逐字节相同**；法九四值逐值可判、`authorized` 为纯输入事实、第二声明 / 第二判定函数必红；`--ref 1` ⇒ 合成锚，失配 fail-closed 非静默（基线 executor 不被调用），`risk` 逐字段对照 base 不放宽。
3. **载荷端到端可用**：真拾取 ⇒ 回合载荷与拾取同源；无引用回合 ⇒ `refs` 字段缺席 ⇒ `system===SYSTEM_PROMPT` **逐字**（零漂移）；凭据形掩码单点；每回合 set/finally clear 零跨回合漂移。
4. **红线与体积锚未被扰动**：`content.js` 177,076 / `52a82620…`、`pick-layer.js` 34,358 / `77796bab…` 逐字节；base / security / content src / manifest 零 diff；判定链 `zeroDiffFiles` 9 项；`KIND_SET` 40；12 kind 零宿主；体积 `585,732 / 615,018 / 614,400 / 675,840 / pending-author-line` 同源，A 列 +7,109 在预算内，EC-SGO-022 三分支未触发。
5. **注入抽验独立成立**：两处源码注入（法九真源改判 / 删单节点闸）均**判红且逐字节还原**（sha 相同、复绿），证明门禁判据非橡皮图章；X-SGO 台账 rows（4 superseded / 3 no-supersession）与 note 口径经 I-01 微修后闭合。
6. **人工面如实**：M1/M4 无 headless 合成路径，标 `⏳`，**不冒充 PASS**。

🎉 全部 7 阶段工作流已完成（discovery → spec → plan → tasks → build → review → **validate**）。

---

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建（R1 动态验证：V1~V10 全绿 / 5 个自研探针 + 2 处源码注入逐字节还原；红线·冻结面·体积五要素独立复算命中；法九 / `--ref` / S0′ 核心断言行为级承重；`page-input` 首跑环境性 flake 清理后隔离复跑绿，如实登记；结论 ✅ 通过 / 0 阻塞） | 2026-09-24 | SDDU Validate Agent |
