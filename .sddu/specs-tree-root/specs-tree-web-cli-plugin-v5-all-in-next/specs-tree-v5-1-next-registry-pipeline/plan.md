# 技术计划：specs-tree-v5-1-next-registry-pipeline（V5-1 NextProvider 注册表 + op 管线；首叶）

> **文档定位**: SDDU 技术方案（叶子切片）—— 记录本叶的实施切入点、落地形状、文件影响与波次；**权威跨切契约见父 `../plan.md` + `../ADR-V5-001~012-*.md`**
> **前置依赖**: 父 `../spec.md` v1.0 + 父 `../discovery.md` v1.0 + 父 `../plan.md` v1.0（红线继承 / 不动面 / 体积预算 / 波次）+ 本叶 `spec.md` v1.0 + 设计基准 `option-g-all-in-next.html`（`a7c0a77a…`）/ `option-g-shim.mjs`（`d0107ecb…`，127 断言，**只读零触碰**）
> **创建人**: SDDU Plan Agent
> **创建时间**: 2026-09-22
> **版本**: v1.0
> **更新人**: SDDU Plan Agent
> **更新时间**: 2026-09-22
> **更新说明**: 初始创建（V5-1 首叶技术方案：契约 v2 注册表 / 统一管线四态 / act→opId + 瘦分发 / 双契约 / 证明义务机核；主责 **ADR-V5-001 / 002（机制侧）/ 008**；5 波 / ~22 任务）

---

## 1. 前置检查

| 检查项 | 状态 | 证据 |
|--------|:--:|------|
| 本叶 `spec.md` 存在 | ✅ | `specs-tree-v5-1-next-registry-pipeline/spec.md`（246 行，v1.0） |
| 父 `spec.md` / 父 `plan.md` 存在 | ✅ | `../spec.md`（757 行）+ `../plan.md` + `../ADR-V5-001~012` |
| 上游叶依赖 | ✅ N/A | **无前置叶**（本叶是依赖链起点；`dependsOn: []`） |
| 外部 API 文档缓存 | ✅ N/A | 零外部 API / 零新依赖（`manifest.json` 零 diff） |
| 分支 / HEAD | ✅ | `feature/web-cli-plugin` / `ea47ffd` |
| 写入范围 | ✅ | 仅本叶 SDDU 目录（`plan.md` / `state.json` / `TREE.md` 由 sddu-tree 更新） |

---

## 2. 架构分析（本叶）

### 2.1 本叶题眼

把「操作」变成注册表条目、把「分发」变成查表、把「设计-实现一致」变成机器证据。**本叶不落地 9 个 op 的业务能力**（那是 v5-2），只落地「op 能被注册、被分发、被证明」的机制 + 双契约入册。

### 2.2 落地形状（Seam 三件套）

```
Definition  next-registry/definition.ts
            NextProvider{id,deps,priority,prepend?,mode,fail,when,chips,dispose}
            NextOp{opId,risk,layer,params?,consent?,execute,receipt?}
            NEXT_SERVICES / NEXT_MODES / MOUNT_MODE / BLOCKED_TERMINALS(5) / NEXTSTEP_MIN_INTERVAL_MS
Provider    next-registry/registry.ts
            validateNextProvider / topoByDeps / resolveOrder(priority,prepend,seq) /
            registerNextProvider → 幂等 unregister / {overwrite:true} 按 id 整行替换
Consumer    next-registry/dispatch.ts + sidepanel.ts#handleCardAction
            ACT_TO_OP(6) / dispatchChipAction（一次查表，零 per-op 分支）
```

### 2.3 `handleCardAction` 两集模型（本叶核心判据）

| 集 | 动作 | 处理 |
|---|---|---|
| **A 卡协议**（8） | `answer` / `choose` / `cancel` / `approve` / `reject` / `audit` / `hover` / `reanchor` | **保留**（askuser / auth / ref 卡族协议，从不携带 `data-op`） |
| **B next-chip**（7→1） | `next` / `repick` / `describe` / `describe-submit` / `rebind` / `help` / `authorize` | 合并为 `dispatchChipAction`：`ACT_TO_OP[action] ?? OPS_BY_ID[action]` → `runOp` |

### 2.4 数据流

```
ctxOf(scene) → NextCtx（7 源：ref/session/site/catalog/probe/risk/onboarding）
  → resolveOrder(REGISTRY) → providers.filter(p => p.when(ctx)) → 候选 chips
  → nextstep 卡（data-op）→ 点击 → dispatchChipAction(action) → ACT_TO_OP → runOp(opId) → 管线四态
```

### 2.5 不动面（本叶）

`src/content/**` / `dist/content.js` / `dist/pick-layer.js` / `KIND_SET` / `manifest.json` / 判定链 / 12 kind 契约 / `design/**` / ROADMAP。本叶**不改** `optional_permissions`（v5-2）也不改 SW 执行器（v5-2）。

---

## 3. 方案对比（本叶）

| 维度 | **A 纯 TS 注册 + 旧规则等价迁移为内置 provider**（选） | B 注册表与旧规则并存 | C JSON 声明式 |
|---|---|---|---|
| 描述 | 4 规则 → 内置 provider；6 act → `ACT_TO_OP`；16 分支 → 两集模型 | 新层独立，旧路径保留 | JSON 描述 provider |
| 优点 | per-op diff = 0 可机核；act 双词汇退役；4 门禁判据力**上升**（闭集 → opId 集） | 单轮改动小 | 「不改代码」 |
| 缺点 | 需 4 门禁等价重锚（迁移量最大） | N22 不成立；死端机制基础仍在旧路径 | 新加载面（违 NG-ALLN-015） |
| 风险 | R-ALLN-004（高） | R-ALLN-004 降级但**目标落空** | 义务表无法静态机核 |
| 工作量 | ~5 波 / ~22 任务 | ~3 波，**不达标** | ~8 波，**越界** |

## 4. 推荐方案

**推荐 A**。理由：只有「取代」才能让 `handleCardAction` per-op diff = 0 成为静态事实（N22 / AC-ALLN-005）；死端守护（v5-3）需要本叶的阻塞态枚举单源 + 候选可达性；`ACT_TO_OP` 让旧闭集判据**升级**为 opId 集判据（判据力上升而非下降）。

---

## 5. 文件影响分析（本叶）

| 操作 | 文件路径 | 说明 |
|:--:|---|---|
| NEW | `src/ui/sidepanel/next-registry/definition.ts` | Definition（接口 / 常量 / `SERVICES` / `MODES` / `MOUNT_MODE` / `BLOCKED_TERMINALS`） |
| NEW | `src/ui/sidepanel/next-registry/registry.ts` | Provider（validate / topo / resolveOrder / register·unregister·overwrite） |
| NEW | `src/ui/sidepanel/next-registry/pipeline.ts` | `runOp` 四态 + `pendingOps` 队列 + 快照 / 回滚**语义位** |
| NEW | `src/ui/sidepanel/next-registry/dispatch.ts` | `ACT_TO_OP`(6) + `dispatchChipAction` |
| NEW | `src/ui/sidepanel/next-registry/providers.ts` | 4 内置 provider（旧 `recommend.ts` 4 规则等价迁移） |
| NEW | `src/ui/sidepanel/next-registry/obligation-table.ts` | 9 行四要素 + 表尾明示义务 |
| MODIFY | `src/ui/sidepanel/recommend.ts` | 常量逐字保留（阈值 / 上限 / 间隔 / 7 源 / `RECOVERY_CHIP_ORDER` 语义）；规则迁出 |
| MODIFY | `src/ui/sidepanel/sidepanel.ts` | `handleCardAction` 集 B 收敛；`dispatchOp` 接线（**op 执行体占位由 v5-2 填**） |
| MODIFY | `src/ui/sidepanel/cards/nextstep.ts` | chip 增 `data-op`；`data-act` 降渲染别名 |
| MODIFY | `src/ui/sidepanel/stream-model.ts` | `error.payload.recovery` 字段（**类型位**，渲染在 v5-3） |
| NEW | `test/next-registry.test.ts` | R1~R7 逐点 + 往返读数 + deps 置换 + overwrite + loud |
| NEW | `test/next-obligation-table.test.ts` | 注册表 ↔ 义务表（行数 / opId 集 / 四要素 / 无悬空） |
| NEW | `test/next-dispatch-diff0.test.ts` | 集 B 零 per-op 分支 + 四操作哈希不变 |
| MODIFY | `test/design-contract.test.ts` | F 逐字保留 + G 常量 / 127 映射 / 实跑 / 混池防御（6 → ≥13） |
| MODIFY | `test/recommendation-sources.test.ts` | 闭集 → opId 集；源白名单 7 语义保留 |
| MODIFY | `test/local-act-wiring.test.ts` | 本地 act 槽 → 本地 op 槽；零 `requestTurn` |
| MODIFY | `test/ui/recommendation.mjs`（59） | opId 化等价重锚 + 增断言 |
| MODIFY | `test/supersession-ledger.test.ts` | X3 / X4 / X6(chip 侧) 条目 + `designContractChanges` |
| MODIFY | `test/gate-integrity.test.ts` | 新增 3 门禁纳入受审集合 |
| MODIFY | `test/size-baseline.ts` | 五要素重登记（本叶增量；时间线只追加） |
| MODIFY | `docs/v4-supersession-ledger.json` | `designContractChanges[]`（空 → G 条目）+ `modifiedRanges[]`（X3/X4/X6-chips） |

---

## 6. 风险评估（本叶；逐条缓解）

| # | 风险 | 等级 | 缓解 |
|---|---|:--:|---|
| R-ALLN-004 | 注册表取代既有推荐器（4 门禁 + 主流程 3 处） | 高 | 等价重锚逐条对账（FR-ALLN-112 / 120）；`ACT_TO_OP` 6 行唯一权威 |
| R-ALLN-005 | design-contract 契约真空 | 高 | 双契约（ADR-V5-008）；F 常量逐字 |
| R-ALLN-010 | 保护段（若推荐面 / 状态栏改动波及 journey） | 中高 | 本叶**不改**状态栏 / 流结构 ⇒ 保护段不动；若波及走第三次八步（ADR-V5-012） |
| R-ALLN-901 | 注册表 ↔ 义务表漂移 | 中高 | 三类注入反证（多一行 / 多一 op / chips 悬空） |
| R-ALLN-902 | `deps` 定序被列表位置绕过 | 中 | 列表位置置换测试 |
| R-ALLN-903 | 分发模式混用 | 中 | 越集 / 混用反证 |
| R-ALLN-909 | 双契约断言 id 混池 | 中 | F / G 两侧独立计数 + 交集断言 |
| R-ALLN-001 | 体积（余量 24,926 B） | 高 | 本叶增量登记（预算 ≈8,400 B 计入父 ADR-V5-011） |
| R-V5-103 | 两集划分被模糊化 | 中 | 集 B action 字符串只出现在 `ACT_TO_OP` 数据模块（静态扫描） |

---

## 7. 生成的 ADR（本叶主责）

| ADR | 标题 | 本叶落地切入点 |
|---|---|---|
| **ADR-V5-001** | NextProvider 注册表与瘦分发 | 全条（Definition / Provider / Consumer / 两集模型 / 取代路径） |
| **ADR-V5-002** | op 管线四态 + 扩形 + `error` 恢复区 | **机制侧**（`runOp` 骨架 / 快照语义位）；扩形与渲染在 v5-2 / v5-3 |
| **ADR-V5-008** | 双稿双 shim design-contract | 全条（F 保留 + G 新增 + 台账登记） |

（其余 9 条 ADR 见父 `../plan.md` §7.1；本叶提供契约 v2 七点、`MOUNT_MODE`、`BLOCKED_TERMINALS`、`ACT_TO_OP`、9 op 义务表骨架 —— 均为后续叶的接口前置。）

---

## 8. 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建（V5-1 首叶技术方案：Definition / Provider / Consumer 三件套 + 契约 v2 七点 + 统一管线四态机制 + `ACT_TO_OP` + 两集模型 + 双契约入册；5 波 / ~22 任务；主责 ADR-V5-001 / 002（机制侧）/ 008） | 2026-09-22 | SDDU Plan Agent |
