# 构建报告：specs-tree-v5-1-next-registry-pipeline（R1 = TASK-V5-101~113）

> **文档定位**: SDDU 构建报告 — 记录本轮任务的文件变更、实现结果与门禁读值，作为 review 阶段的输入
> **前置依赖**: 本叶 `tasks.md`（22 任务 / 5 波）、`plan.md`（ADR-V5-001/002/008）、父 `spec.md`（FR-ALLN-030~038 / 055~059 / X3·X4·X6-chip）
> **创建人**: SDDU Build Agent
> **创建时间**: 2026-09-22
> **版本**: v1.0（R1 中间轮）
> **更新人**: SDDU Build Agent
> **更新时间**: 2026-09-22
> **更新说明**: 初始创建 —— R1 = 波 A~C（TASK-V5-101~113）；R2（114~122）待续

---

## 1. 构建概要

| 维度 | 数值 |
|------|:--:|
| 完成任务数 | 13 / 13（R1 范围 101~113；叶总 22，R2 = 114~122） |
| 复杂度分布 | S×2（106 spike / 112） / M×9（101~104 / 107~111） / L×2（105 / 113） |
| 新增文件 | 5 源码 + 2 测试 = 7 个 |
| 修改文件 | 11 个（3 源码 + 5 测试 + 2 台账 + 1 尺寸登记） |
| 体积 | `dist/sidepanel.js` **507,315 B**（Δ = **+8,794 B**，本叶预算 8,800 B，余 6 B） |
| 红线冻结面 | `content.js` 177,076 B / `52a82620…`、`pick-layer.js` 33,900 B / `5f567d7e…` **逐字节不变** |

---

## 2. 文件变更

| 操作 | 文件路径 | 对应任务 | 说明 |
|:--:|------|:--:|------|
| NEW | `src/ui/sidepanel/next-registry/definition.ts` | 101 | Definition（`NEXT_SERVICES`/`NEXT_MODES`/`NEXT_MOUNT_POINTS`/`MOUNT_MODE`/`BLOCKED_TERMINALS`(5)/`NextCtx`(7 源)/`NextProvider`/`NextOp`） |
| NEW | `src/ui/sidepanel/next-registry/registry.ts` | 102/103/104 | `validateNextProvider`（loud）+ `topoByDeps`/`resolveOrder`（列表位置置换不变）+ `registerNextProvider`（幂等 unregister / overwrite 整行替换 / `REGISTRY` 单点写入） |
| NEW | `src/ui/sidepanel/next-registry/providers.ts` | 105 | 4 内置 provider（5 P0 恢复 + onboarding/ref-action/capability-discovery），旧 `recommend.ts` 规则表等价迁移 |
| NEW | `src/ui/sidepanel/next-registry/pipeline.ts` | 107/108/109/110 | `runOp` 四态 + `pendingOps` FIFO 仲裁 + 快照/回滚语义位 + R5 失败三级 + `OPS_BY_ID`(6) + `bindPanelOps` |
| NEW | `src/ui/sidepanel/next-registry/dispatch.ts` | 111 | `ACT_TO_OP`(6) + `OP_TO_ACT` + `SET_A_PROTOCOL_ACTIONS`(8) + `dispatchChipAction`（一次查表零 per-op 分支） |
| NEW | `test/next-registry.test.ts` | 102/103/104 | R1~R7 单测骨架 + 置换/幂等/覆盖/loud + 反证（16 用例） |
| NEW | `test/next-pipeline.test.ts` | 107~113 | 管线四态 / FIFO / 快照回滚 + `ACT_TO_OP`/两集 + per-op 分支=0 + `op.execute(` 恰 1 调用点 + `data-op`（15 用例） |
| MODIFY | `src/ui/sidepanel/recommend.ts` | 105 | 常量逐字保留；规则求值委托注册表；`RECOMMEND_MODULE_WHITELIST` 纳入 4 个注册表模块（设置/计数排除不变） |
| MODIFY | `src/ui/sidepanel/sidepanel.ts` | 113 | `handleCardAction` 两集改造（集 A 8 项保留 / 集 B 7→1 次 `dispatchChipAction`，per-op 分支=0）+ `bindPanelOps` 接线 |
| MODIFY | `src/ui/sidepanel/cards/nextstep.ts` | 112 | chip 增 `data-op`（= `ACT_TO_OP[act]`）；`data-act` 降渲染别名 |
| MODIFY | `test/local-act-wiring.test.ts` | 113（预迁移 115） | 本地 act 判据从「`if (action === 'x')` 分支体」等价重锚为「`bindPanelOps` op 槽 → 单一入口」（判据力只升） |
| MODIFY | `test/authorize-chip-wiring.test.ts` | 113（预迁移 115/148） | 授权 chip 判据等价重锚为 op 槽 + `ACT_TO_OP.authorize` 同源；被替换旧行逐字登记入 v4.5 叶段 |
| MODIFY | `test/size-baseline.ts` | 121（中间轮） | 五要素重登记 498,521 → **507,315** + `v51R1Rows` + 新区块；`_TIMELINE` 只追加 |
| MODIFY | `test/size-budget.test.ts` / `test/size-growth-evidence.test.ts` / `test/size-ruling-vol3.test.ts` | 121（中间轮） | ceiling 523,447 → **532,680**、基线 498,521 → **507,315**、`groups.length` 15→16、FR regex 接受 `FR-ALLN-*` |
| MODIFY | `docs/v4-density-baseline.json` | 121（中间轮） | `volume.registeredBaselineBytes`/`ceilingBytes` 同源前移 + `v51R1Note` |
| MODIFY | `docs/v4-supersession-ledger.json` | 121 / 台账 | 活指针 `newTitle` 同源前移（39 处）+ `v3Vol3Closeout` 三值 ⑤ + 各叶段 `registeredUncoveredLines` 按真实 `git diff` 逐字复算 |

---

## 3. 任务完成清单

| 任务 | 名称 | 复杂度 | 状态 | 对应 FR |
|------|------|:--:|:--:|------|
| TASK-V5-101 | `definition.ts` 三件套 + 常量单源 | M | ✅ completed | FR-ALLN-030/031/033/035 |
| TASK-V5-102 | `validateNextProvider` + loud + 单测骨架 | M | ✅ completed | FR-ALLN-031/033/035 |
| TASK-V5-103 | `topoByDeps` + `resolveOrder` | M | ✅ completed | FR-ALLN-031/032 |
| TASK-V5-104 | 可逆注册（幂等 / 覆盖 / 单点写入） | M | ✅ completed | FR-ALLN-030/032 |
| TASK-V5-105 | 4 内置 provider（规则等价迁移） | L | ✅ completed | FR-ALLN-030~038/013 |
| TASK-V5-106 | **spikeGate-1**（G shim 127 抽取 + 混池防御预证） | S | ✅ completed（结论入 §4） | FR-ALLN-100/101 |
| TASK-V5-107 | `runOp` 四态骨架 | M | ✅ completed | FR-ALLN-055/034① |
| TASK-V5-108 | `pendingOps` FIFO + `MAX_OPEN_ASKS` 仲裁 | M | ✅ completed | FR-ALLN-055 / EC-ALLN-010 |
| TASK-V5-109 | 快照 · 回滚语义位（多表） | M | ✅ completed | FR-ALLN-034③ / EC-ALLN-011 |
| TASK-V5-110 | R5 失败三级 + `op.execute(` 恰 1 调用点 | M | ✅ completed | FR-ALLN-034/035 |
| TASK-V5-111 | `ACT_TO_OP`(6) + `dispatchChipAction` | M | ✅ completed | FR-ALLN-056/057/058 |
| TASK-V5-112 | chip `data-op`（`data-act` 降别名） | S | ✅ completed | FR-ALLN-057 |
| TASK-V5-113 | `handleCardAction` 两集改造（集 B 7→1） | L | ✅ completed | FR-ALLN-058/059 |

> R2（114~122）未执行：`next-dispatch-diff0` / X3 三处门禁 opId 重锚（`recommendation.mjs` 等）/ 义务表 9 行 / 双契约 G 127 入册 / `BLOCKED_TERMINALS` 跨源「声明恰一次」扫描 / 体积收口 / 全门禁收口。

---

## 4. SG-1 结论（TASK-V5-106，只读探针，未落版本库）

探针脚本 `/tmp/opencode/v5-spike/g-shim-probe.mjs`，日志 `/tmp/opencode/v4-gate-logs/v5-1-r1/w1-spike-g-shim.log`。

- **sha 双命中**：`option-g-shim.mjs` = `d0107ecbbd56edfe19592e256a66d27fb3d1c5c1a2d87c1773364f4520e609ce` ✓；`option-g-all-in-next.html` = `a7c0a77ac6253e32d1ccef894f32eb8d0dc2d10c99f145261a69ebc699cc83c9` ✓。
- **实跑**：`node option-g-shim.mjs` 退出码 0，输出 `127 passed / 0 failed`（共 127 条）。
- **计数口径**：`check(` 子串 **128** / 声明 **1** ⇒ 调用 **127** ✓。
- **id 抽取**：`/check\('([A-Z]\d+)/g` ⇒ **127** 项 / **14** 组（A6 B5 C8 D6 E7 F11 G8 H7 **I17** J5 K3 L4 **M23** N17）✓。
  - ⚠️ **登记偏差（交 118/119 处置）**：`ADR-V5-008` 给的 `^check\('([A-Z]\d+)\s` 正则带 `\s` 尾锚，会漏掉 10 条无尾空白的调用 ⇒ 只得 **117**（分组 I9/M21）。G 断言映射表（118）**必须用不带 `\s` 的 `check\('([A-Z]\d+)`**，否则 127 行映射会对不上。
- **R-ALLN-909 混池防御关键发现**：F id 集（60，`A1`~`I1`）∩ G id 集（127，`A1`~`N17`）= **51 项，非空**。⇒ 混池防御**不得**依赖「id 集互斥」，必须用「**两侧各自独立计数 + 各自 `test` 块 + 共享 helper 各调用一次**」。
- **`git status`**：探针零仓库改动（本轮工作区改动均为 R1 实施面）。

---

## 5. 门禁复跑 vs 基线（日志 `/tmp/opencode/v4-gate-logs/v5-1-r1/`）

| 门禁 | 基线 | 本轮 | 结论 |
|------|:--:|:--:|:--:|
| `npm test`（node，含 `next-registry` + `next-pipeline` 新门禁） | 1045 | **1076** | ✅ 只增 |
| `test:l0` | 244 | 244 | ✅ |
| `test:l1` | 116 | 116 | ✅ |
| `test:l2` | 74 | 74 | ✅ |
| `test:density` | 232 | 232 | ✅ |
| `test:ui`（journey） | 171 | 171 | ✅ |
| `test:binding` | 192 | 192（**环境性 flake**：4 次中 2 次绿 192，2 次红在不同无关断言） | ⚠️ 如实登记（KL-N-10，不阻塞收口） |
| `test:recommendation` | 59 | 59 | ✅ |
| `test:stream` | 63 | 63 | ✅ |
| `test:ask-auth` | 61 | 61 | ✅ |

- **保护段**：`test:binding` 的 `be9ad0e9…` + `107780` 段与 `test:ui` 的 journey pin `cc79f413…` **未改**（binding 192 绿轮与 journey 171 绿轮均命中）。
- **体积**：`dist/sidepanel.js` 507,315 B ≤ 523,447 B（生效上限）；本叶预算 8,800 B，实测 **+8,794 B**（余 6 B）。
- **零宿主**：`REGISTERED_STRUCTURAL_HOSTS = []` 未动。

### 5.1 反证（每处新/改判据可 FAIL）

| 判据 | 反证 | 结果 |
|---|---|---|
| `validateNextProvider` loud | 未知 deps / 非法 mode / priority 缺失 / 空 chips | 注入 ⇒ FAIL → 还原 ⇒ PASS（文件内实跑） |
| `resolveOrder` 置换不变 | 回退为数组顺序 | FAIL（用例内断言 notDeepEqual） |
| 幂等 unregister / 覆盖 | 二次 unregister / 追加式覆盖 | PASS（往返读数机核） |
| per-op 分支 = 0 | 注入 `if (action === 'rebind')` | FAIL（`NP-8 反证`） |
| `op.execute(` 恰 1 调用点 | 源文本扫描全 `src/ui/sidepanel/**` | == 1（`pipeline.ts`） |
| local-act 重锚 | 槽改 requestTurn / 删槽 | FAIL（LLx 反证实跑） |
| authorize 重锚 | 槽改 requestTurn / 二次权限请求 | FAIL（AC-2 反证实跑） |

---

## 6. 下一步

| 场景 | 操作 |
|------|------|
| 继续 R2 | 运行 `@sddu-build specs-tree-v5-1-next-registry-pipeline` 执行 **TASK-V5-114~122**（diff0 门禁 / X3 三处重锚 / 义务表 / 双契约 G 127 / 单源扫描 / 体积收口 / 全门禁收口） |
| 完成本叶后 | 运行 `@sddu-review specs-tree-v5-1-next-registry-pipeline` |

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建（R1 = 波 A~C：101~113；含 SG-1 结论与门禁复跑） | 2026-09-22 | SDDU Build Agent |
