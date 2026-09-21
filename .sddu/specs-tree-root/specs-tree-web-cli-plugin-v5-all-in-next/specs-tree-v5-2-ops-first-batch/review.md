# 审查策略：specs-tree-v5-2-ops-first-batch（V5-2 首批 9 op 落地 + SW 执行器 + 断流首验收）

> **文档定位**: SDDU 审查策略 — 指导 review Agent 执行自主审查的清单和方法；审查结果见 `review-report.md`
> **前置依赖**: 本叶 `spec.md`（34 条 FR 切片）/ `plan.md`（ADR-V5-002/003/004/005，含父 `../ADR-V5-001~012`）/ `build.md`（R1+R2）/ 上游叶 v5-1 `build.md §6·§8`（承接项）
> **创建人**: SDDU Review Agent
> **创建时间**: 2026-09-22
> **版本**: v1.0
> **更新人**: SDDU Review Agent
> **更新时间**: 2026-09-22
> **更新说明**: 初始创建。**回填说明**：按 §8.1(ADR-004) 本策略应在 plan 阶段产出（`review.md`），实际缺失；本文件为 review 阶段**回填**（策略 + R1 报告同轮产出），并已由 R1 报告逐项引用。用户确认策略后，后续轮次（R2…）仅迭代 `review-report.md`。

---

## 1. 审查概要

| 维度 | 数值 |
|------|:--:|
| 审查文件数（源码/测试/登记） | 33 个（4 NEW 源码 + 5 NEW 测试/样本 + 22 MODIFY + 2 台账） |
| 审查项总数 | 59（C1~C59） |
| 覆盖 FR | 34 / 34（本叶 `spec.md` §4 全表） |
| 覆盖维度 | 4 / 4（代码质量 / 规范符合性 / 架构一致性 / 测试质量） |
| 独立复跑门禁 | 8 项（npm test / zero-injection / page-input / binding×2 / ask-auth / stream / recommendation + 保护段 sha 复算） |

## 2. 自主审查清单（C1~CN）

**审查对象来源**：
- `spec.md`（本叶）§4 34 条 FR + §5 NFR + §6 EC + §7 AC → 逐项核验实现完整性/正确性
- `plan.md` §2 9 op 五要素矩阵 / §2.3 双层执行器 / §2.4 双侧同源 / §2.5 权限最小集 / §2.6 settings 收编 / §5 文件影响 → 架构遵循性
- `build.md` R1（§6 停机上报 + 偏差登记）+ R2（R2-2~R2-5 逐任务结果/升档登记/门禁/人工面）→ 声明与产物一致性
- v5-1 `build.md §6`（①N-04 / ③修复 provider / ④校验钩子）+ §8（N-04 / N-05）→ 承接项闭环核验
- `src/**` + `test/**` + `docs/v4-supersession-ledger.json` + `test/size-baseline.ts` → 代码/测试/登记质量

**四维度指引**：
1. **代码质量** — 可读性、职责单一、错误处理、无硬编码、无冗余、注释与实现一致
2. **规范符合性** — 对照 `spec.md` 逐 FR/NFR/EC 核验（含 AC-ALLN-007 五要素齐备）
3. **架构一致性** — 对照 ADR-V5-002/003/004/005/011 + plan §5 文件影响 + 项目宪法（红线面）
4. **测试质量** — 测试存在性、核心路径、边界/错误场景、断言有效性、门禁独立复跑一致性

| # | 审查对象 | 审查基准 | 维度 | 审查方法（含独立复跑/探针） |
|---|---------|---------|------|--------------------------|
| C1 | 命名/可读性/纯数据模块职责 | 项目宪法 + op-table/ops/pipeline/snapshot | 代码质量 | 逐文件走查（107+375+214+84 行） |
| C2 | 函数职责单一（派生表、单源） | plan §2.4 / NFR-ALLN-004 | 代码质量 | 走查 `OP_DESCRIPTORS`/`SW_OPS`/`OP_PARAM_SEQUENCE` 派生链 |
| C3 | 错误处理与失败语义（`ok:false` / 回滚触发） | FR-042/043/044 · EC-ALLN-011/012 · ADR-V5-002 §1 | 代码质量 | **node 探针**：注入 `ok:false` 观察 settle 状态/回滚次数 |
| C4 | 无硬编码（文案/参数序列单源） | FR-047 · ADR-V5-002 §2 | 代码质量 | grep 文案字面量 `ASK_COPY`/`opReceiptText`/`reachableOpIds` |
| C5 | 无冗余逻辑/死代码 | NFR-ALLN-004 | 代码质量 | grep 遗留原生语句 / 不可达分支 |
| C6 | 注释与实现一致 | FR-048 · FR-043 · 门禁文案 | 代码质量 | `grep -n requestTurn` / `permission` / SW-M④ 文案比对 |
| C7 | `op.authorize` 五要素 + SW 裁决/手势两段握手 | FR-040 / FR-065/066 · ADR-V5-003 §3 | 规范符合性 | `OPS_BY_ID` 逐要素对表 + `authorizeOrigin` 单例 |
| C8 | `op.rebind` 无 params/consent + 复用 `#rebind` + 零 requestTurn | FR-041 | 规范符合性 | op-wiring OP-W①/③ + 单例 grep |
| C9 | `op.llm-config` 三参数流转 + 掩码写存储 + 失败回滚 | FR-042 / AC-ALLN-007 | 规范符合性 | **探针**：`dispatchOp('op.llm-config',{value:JSON},'settings'/'options')` |
| C10 | `op.perm.request` form 多选 + 双固化 + 快照回滚 + 在册校验 | FR-043 / FR-110 · ADR-V5-004 §3 | 规范符合性 | 走查 `permRequest` + `unregisteredCapabilityIds` + 探针失败态 |
| C11 | `op.revoke` 三目标 + 不可逆确认 + 审计入口 + 三表回滚 | FR-044 / AC-ALLN-007/011 | 规范符合性 | 走查 `revokeTarget` + 探针失败态/回滚 |
| C12 | `op.pick` 复用单一入口 + 取消/超时恢复 | FR-045 / EC-ALLN-005 | 规范符合性 | op-wiring + `requestPick` 调用点 |
| C13 | `op.describe` `params` 五要素齐备 | FR-046 / AC-ALLN-007 | 规范符合性 | `OPS_BY_ID['op.describe'].params` 实测（探针 C） |
| C14 | `op.help` 由 `when(ctx)` 派生（禁硬编码） | FR-047 | 规范符合性 | `reachableOpIds` 走查 + 反证（R-V5-104） |
| C15 | `op.turn` 唯一 `requestTurn`（其余 8 op 零） | FR-048 · N22/N25 · R-ALLN-905 | 规范符合性 | `grep -n "requestTurn("` 全 `src/**` 独立复算 |
| C16 | 会话/分组 `deferred` 登记 + 首批恰 9 op | FR-049 | 规范符合性 | 父 `state.json#pendingObligations` + `OP_DESCRIPTORS.length` |
| C17 | 拒绝非死端（consent 拒/权限拒/ask 取消 → 固化 + 可达 next） | FR-014 · EC-ALLN-006/008 | 规范符合性 | S2 gate ④ + 探针（拒绝后 settle 状态） |
| C18 | S2 断流首验收（死端 = 0 / 5 类阻塞驱动真实性 / ✖ 行不裸奔） | FR-016 · AC-ALLN-001 · ADR-V5-009 | 规范符合性 | **node 探针复跑** fixture `judgeStates` + 逐类读数审计 |
| C19 | 掩码卡唯一入口（`type=password`/`data-secret`，单一构造） | FR-020 | 规范符合性 | 走查 `cards/askuser.ts` + `data-secret` grep |
| C20 | 值直达 key-store（值入存储调用点恰一处） | FR-021 · ADR-V5-010 §1 | 规范符合性 | grep `keyStore.save(` + 调用链（submitSecret/restoreCredentials） |
| C21 | 流内只留事实（{opId, ts, maskedLength, result}，digest `••••••`） | FR-022 · ADR-V5-010 §2 | 规范符合性 | `maskedLength` 溯源（`submitSecret` → payload → 渲染） |
| C22 | 双层执行器（layer 显式） | FR-065 | 规范符合性 | `OP_DESCRIPTORS` 9 行 layer + SW_OPS 派生 |
| C23 | 特权 op 恰 2 + 手势路径语义保留 | FR-066 | 规范符合性 | `SW_OP_DESCRIPTORS.length` + 面板请求入口计数 + SW 零 `.request(` |
| C24 | `op-*` type-only（`KIND_SET` 零新增 + `content.js` 逐字节） | FR-067/111 · X2 · ADR-V5-003 §1 | 规范符合性 | KIND_SET 逐字扫描 + `stat`/`sha256sum` 复算 |
| C25 | SW 侧镜像契约 {id,mode,fail,audit} 同源 | FR-068 · ADR-V5-003 §2 | 规范符合性 | `SW_OPS` 派生 + `sw-op-mirror` 恰一处声明扫描 |
| C26 | 红线逐字节（content/pick-layer + `src/content/**` 零 diff） | FR-069 · AC-ALLN-022 | 规范符合性 | `stat -c %s` + `sha256sum` 独立复算 |
| C27 | settings/options 4 类收编为 op 单一执行入口（零双路径） | FR-075/076 · ADR-V5-005 | 规范符合性 | 探针（settings/options 面 dispatchOp）+ 遗留语句 grep |
| C28 | 其余设置操作零改动（8 分区 + 签名/行为） | FR-077 | 规范符合性 | `SETTINGS_SECTION_IDS` + `settings/ops.ts` 其余方法走查 |
| C29 | 单一调用点机核 + ≥3 伪造反证 | FR-078 · FR-121 | 规范符合性 | `test/op-wiring.test.ts` 独立复跑（5 判据 + 3 反证） |
| C30 | X1：manifest 零 diff + 显式名单 + 新增项在册 + 最小集论证 | FR-110 · NFR-ALLN-009 | 规范符合性 | `git diff` manifest + `capability-wiring` X1⑤ 复跑 |
| C31 | X2：`op-*` 默认禁入 `KIND_SET`（含注入反证） | FR-111 | 规范符合性 | `op-protocol` OP-P①/④ 复跑 |
| C32 | 取代一律等价重锚（台账登记 + 计数不减 + 反证） | FR-116 | 规范符合性 | `supersession` 35/0 复跑 + 台账逐条抽验 |
| C33 | 断言零删除零降级、计数只增 | FR-003 | 规范符合性 | 计数对账（npm test / stream / ask-auth）+ 台账删除行 |
| C34 | 本叶主张门禁等价重锚清单逐项 | FR-120 · AC-ALLN-019 | 规范符合性 | 10 门禁在位核对 + 独立复跑 page-input/zero-injection |
| C35 | 反证不空转（两段证伪） | FR-121 · AC-ALLN-021 | 规范符合性 | 逐门禁反证据实跑 + 独立复跑确认可红 |
| C36 | 门禁严格串行 + KL-N-10 纪律（`test:binding` 尤其） | FR-124 · R-ALLN-015 | 规范符合性 | **独立复跑 binding ×2**（首轮 flake / 复跑 192） |
| C37 | 新门禁纳入 `gate-integrity` 受审集合 | FR-125 | 规范符合性 | `EXPECTED_AUDITED_FILES` + JUDGEMENTS 标记 + 14/0 |
| C38 | 体积五要素（前后值/日期/来源/理由/历史保留 + metafile 归因） | FR-130 · ADR-V5-011 §2 | 规范符合性 | `size-baseline`/`size-growth`/`size-ruling` 复跑 + 台账 |
| C39 | 红线冻结面逐字节复核（含 `design/**` / 判定链 / v3 台账） | FR-133 | 规范符合性 | `git diff --stat 8526ef8` 逐面 |
| C40 | NFR-009 权限最小化（静态面零漂移 + 不可静默回收如实说明） | NFR-ALLN-009 | 规范符合性 | manifest grep + consent 文案 grep |
| C41 | NFR-010 改状态 op 有快照/回滚 + 两侧镜像语义一致 | NFR-ALLN-010 | 规范符合性 | `snapshot.ts` 走查 + `sw-op-mirror` |
| C42 | NFR-011 可观测性（{opId,ts,result,maskedLength} + 回执→审计入口） | NFR-ALLN-011 | 规范符合性 | 走查 audit 接缝 + receipt 文案 |
| C43 | NFR-002/008 320px 零溢出 + 掩码/form 卡键盘与读屏可达 | NFR-ALLN-002/008 | 规范符合性 | 断言存在性 + （本审查未独立复跑 journey/density） |
| C44 | EC-005/006 取消与拒绝固化（非异常、不 loud） | EC-ALLN-005/006 | 规范符合性 | `ASK_CANCEL_REASONS` 闭集 + 探针 |
| C45 | EC-009 掩码空值/取消零副作用（`op.describe` 空描述同口径） | EC-ALLN-009 | 规范符合性 | `submitSecret` 空值分支走查 + S2 cancel 探针 |
| C46 | EC-011 三表整体回滚（禁单表） | EC-ALLN-011 · R-ALLN-904 | 规范符合性 | **探针**：非抛错失败 → 回滚次数（期望 1） |
| C47 | EC-012/016 连接失败回滚 + 双入口并发单一执行 | EC-ALLN-012/016 | 规范符合性 | `llmConfig` 内部 restoreCredentials + `viaOp` 两入口 |
| C48 | ADR-V5-002 管线四态唯一 + `params`/`consent` 缺省语义 | ADR-V5-002 §1 | 架构一致性 | `pipeline.runOp` 逐态走查（含 `op.execute(` 恰 1） |
| C49 | ADR-V5-003 SW 执行器 + type-only + 双侧同源 + 两段握手校验 | ADR-V5-003 | 架构一致性 | 走查 `op-protocol`/`op-executors`/`service-worker` 接线 |
| C50 | ADR-V5-004 最小集 + `form` 选项同源 | ADR-V5-004 | 架构一致性 | `OPTIONAL_CAPABILITY_FORM_OPTIONS` 派生 + 反证 |
| C51 | ADR-V5-005 4 类收编 + options consent 载体登记 | ADR-V5-005 | 架构一致性 | 三面（panel/settings/options）dispatchOp 接线核对 |
| C52 | ADR-V5-011 档位升档 + 绝对上限口径 + authorConfirmation 占位 | ADR-V5-011 §2 | 架构一致性 | 常量子算 + 台账 `v3Vol3Closeout` + ADR 预案对照 |
| C53 | 文件影响分析对齐（plan §5 增删文件 vs 实际） | plan.md §5 | 架构一致性 | `git diff --stat 8526ef8` 逐文件对表 |
| C54 | 测试文件存在性（6 新文件/样本） | build.md R2 | 测试质量 | `ls` + 门禁复跑 |
| C55 | 核心逻辑路径覆盖（四态/opId/镜像/镜像漂移） | ADR-V5-002/003 | 测试质量 | 测试文件走查 |
| C56 | 边界与错误场景覆盖（拒绝/取消/队列/回滚/空选择） | EC 族 | 测试质量 | 测试文件走查 + 探针对照 |
| C57 | 断言有效性（弱断言/陈旧断言/恒真） | FR-121 | 测试质量 | 逐断言走查（OP-W / SW-M / S2 / X1） |
| C58 | 门禁独立复跑一致性（计数/红线/保护段） | FR-003 · AC-ALLN-025 | 测试质量 | 8 项独立复跑对账（含 `npm test` 计数口径） |

> **质量门槛核对**：34 条 FR 各 ≥1 个 Cx（C7~C40 一一对应，另 NFR/EC 族 C40~C47）；4 维度各 ≥1（代码质量 C1~C6 / 规范符合性 C7~C47 / 架构一致性 C48~C53 / 测试质量 C54~C58）；总数 58 ≥ max(34, 4)。「不适用」项：无（本叶无外部 API / 无性能面，相关条目以 NFR-005 体积门禁替代）。

## 3. 审查详情（维度锚点）

### 3.1 代码质量
| # | 检查项 | 文件 | 评估锚点 |
|---|--------|------|:--:|
| 1 | 职责单一 / 纯数据 | `shared/op-table.ts` / `next-registry/ops.ts` | 派生链（单源） |
| 2 | 错误处理 | `pipeline.ts` / `ops.ts` / `sidepanel.ts#revokeTarget` | 失败态 → settle 口径 / 回滚 |
| 3 | 无硬编码 | `ops.ts#OP_PARAM_SEQUENCE` / `opReceiptText` | 文案与序列单源 |
| 4 | 无冗余/死代码 | `settings/ops.ts` / `sidepanel.ts#collectOpParams` | 遗留原生分支 |
| 5 | 注释一致 | `ops.ts` / `op-protocol.ts` | 注释 vs 实测 |

### 3.2 规范符合性
FR-040~049 / 014 / 016 / 020~022 / 065~069 / 075~078 / 110 / 111 / 116 / 003 / 120 / 121 / 124 / 125 / 130 / 133 逐条（见 §2 清单）。

### 3.3 架构一致性
ADR-V5-002（C48）/ 003（C49）/ 004（C50）/ 005（C51）/ 011（C52）+ 文件影响（C53）。

### 3.4 测试质量
存在性（C54）/ 核心路径（C55）/ 边界与错误（C56）/ 断言有效性（C57）/ 独立复跑一致性（C58）。

## 4. 审查方法学（本轮）

1. **静态走查**：逐文件阅读实现与测试（不跑业务逻辑之外的东西）。
2. **独立复跑**（≥6 项）：`npm test`、`test:zero-injection`、`test:page-input`、`test:binding`（×2，KL-N-10）、`test:ask-auth`、`test:stream`、`test:recommendation`；另独立复算红线 `stat`/`sha256sum` 与保护段 sha。
3. **受控探针**（静态判定，不改仓库）：用 `dist-test/src/**` 编译产物驱动
   - 委托面探针：`dispatchOp('op.llm-config', {value: JSON}, 'settings'/'options')`
   - 失败语义探针：注入 `ok:false` / 抛错，观察 settle 状态与回滚次数
   - S2 驱动探针：复跑共享 fixture `judgeStates` 与逐类 ctx 审计
4. **登记对账**：`docs/v4-supersession-ledger.json` / `test/size-baseline.ts` / 父 `state.json#pendingObligations`。

## 5. 结论

**策略就绪**：C1~C58 覆盖本叶 34 条 FR + 4 维度。审查执行结果见 `review-report.md`（R1）。

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建（review 阶段回填；C1~C58 自主清单 + 四维度锚点 + 本轮方法学） | 2026-09-22 | SDDU Review Agent |
