# 技术计划：specs-tree-v5-2-ops-first-batch（V5-2 首批 9 op 落地 + SW 执行器 + 断流首验收；次叶）

> **文档定位**: SDDU 技术方案（叶子切片）—— 记录本叶的实施切入点、落地形状、文件影响与波次；**权威跨切契约见父 `../plan.md` + `../ADR-V5-001~012-*.md`**
> **前置依赖**: 父 `../spec.md` / `../discovery.md` / `../plan.md` + **上游叶 v5-1**（`NextProvider`/`NextOp` 接口 + 注册表 API + 管线四态 + 义务表机核 + `data-op` + `BLOCKED_TERMINALS`）+ 本叶 `spec.md` v1.0
> **创建人**: SDDU Plan Agent
> **创建时间**: 2026-09-22
> **版本**: v1.0
> **更新人**: SDDU Plan Agent
> **更新时间**: 2026-09-22
> **更新说明**: 初始创建（V5-2 次叶技术方案：9 op 五要素 / SW 双层执行器 + `op-*` type-only / `optional_permissions` 最小集 / 掩码 `secret` + `form` 扩形 / settings 4 类收编 / S2 断流机器化首验收；主责 **ADR-V5-002（执行侧）/ 003 / 004 / 005**；7 波 / ~30 任务）

---

## 1. 前置检查

| 检查项 | 状态 | 证据 |
|--------|:--:|------|
| 本叶 `spec.md` 存在 | ✅ | `specs-tree-v5-2-ops-first-batch/spec.md`（250 行，v1.0） |
| 上游叶 v5-1 交付接口 | ✅ 计划态 | 父 `../plan.md` §7.2（v5-1 5 波 / ~22 任务）；本叶**只注册与执行，不改注册表语义**（若接口不足须回 v5-1 走取代登记） |
| 外部 API 文档缓存 | ✅ N/A | 零外部 API；浏览器原生权限弹窗 headless 不可合成（EC-ALLN-007 ⇒ 人工面） |
| 分支 / HEAD | ✅ | `feature/web-cli-plugin` / `ea47ffd` |
| 写入范围 | ✅ | 仅本叶 SDDU 目录 |

---

## 2. 架构分析（本叶）

### 2.1 本叶题眼

把「用户需要操作的地方」搬进 chat（9 op + 统一管线）、把权限面**精确**放开（只 `optional_permissions`，本批 0 项新增）、把值请出流（掩码卡 + 值直达 key-store）、把入口收成一条路（settings 4 类收编）、把断流变成回归测试（S2 机器化）。

### 2.2 9 op 落地矩阵（五要素）

| op | 风险级 | params | consent | 执行层 | execute | receipt |
|---|---|---|---|---|---|---|
| `op.authorize` | 低·可撤销 | 无 | **必需**（auth 卡 + 后果预演） | **SW** | SW 裁决授权登记 + 页面手势申请 origin | 固化区 + 系统行「✓ 授权已生效」 |
| `op.rebind` | 低·幂等 | 无 | 不需要 | panel | 复用 `#rebind` 单一入口 | 系统行「✓ 已重新绑定当前标签页」 |
| `op.llm-config` | 中·写凭据 | 厂商 choice + 模型 + **Key `secret`** | **必需** | panel | 测试连接 → 掩码写存储 | 工具卡 + 系统行「✓ 已配置 LLM（掩码 · 零明文）」 |
| `op.perm.request` | 中·浏览器权限 | 权限项 **`form`** | **必需**（consent + 原生弹窗） | **SW** | 运行时申请（**手势在 page**） | 工具卡 + 系统行（批准 / 拒绝都固化） |
| `op.revoke` | **高·不可逆** | 目标 choice（站点 / 权限 / 凭据） | **必需**（不可逆说明） | panel | 撤销 + **三表快照回滚** | 系统行「✓ 已撤销…」+ 审计入口 |
| `op.pick` | 低·只读 | 无 | 不需要 | panel | 复用既有拾取单一入口 | 引用卡（序号递增） |
| `op.describe` | 低·只读 | `text` | 不需要 | panel | 复用 `submitDescribe` | 系统行 + 新引用 / 回答固化 |
| `op.help` | 低·只读 | 无 | 不需要 | panel | 列当前 ctx 可达 op（由 `when(ctx)` 派生） | `notice` / 系统行（零回写） |
| `op.turn` | 低 | 指令文本（chip 自带） | 不需要 | panel | **唯一**经 `requestTurn` | 既有流内回合留痕 |

### 2.3 双层执行器与 `op-*` 消息族

```
panel-local（7）：op.rebind / op.pick / op.describe / op.help / op.turn / op.llm-config / op.revoke
特权（2）：op.authorize / op.perm.request —— SW 执行器（授权裁决 / 快照 / 审计 owner），
          浏览器权限申请手势留在 page（Chrome 强制；SW 内 .request( 零命中保留）
         两段握手：op-exec{consentToken} → SW 裁决 → op-exec-result{needsGesture} →
                  page 手势申请（唯一既有入口） → op-exec{gestureResult} → SW commit/rollback → receipt
```

`op-exec` / `op-exec-result` / `op-audit` = **union type-only**（`KIND_SET` 零新增；`src/background/op-protocol.ts` 独立校验）⇒ `content.js` 逐字节零增长。

### 2.4 双侧注册表同源

`src/shared/op-table.ts`（纯数据，零 chrome）= 9 行 `{id, layer, mode, fail, audit}`；面板注册表与 `src/background/op-executors.ts` **都从它派生**（SW 镜像字段集恰 `{id, mode, fail, audit}`）⇒ 漂移可机核。

### 2.5 `optional_permissions` 最小集（ADR-V5-004）

- 9 op 的真实权限需求：`op.authorize`（静态 `activeTab`/`scripting` + 已有 `optional_host_permissions` 2 条）；`op.perm.request`（现有 `OPTIONAL_CAPABILITIES` 4 类 / 5 条可选权限）；其余 7 op 零浏览器权限。
- **结论 = 首批 0 项新增** ⇒ `manifest.json` **零 diff**；判据升级为「显式名单 + 新增项在册」。

### 2.6 settings 4 类收编（ADR-V5-005）

4 类（`authorize` / `revoke` / `rebind` / `llm-config`）执行体**只在 op 表**；面板设置视图按钮与 chat chip 同调 `dispatchOp`；`options.html` 走同一 `execute`（**同执行体、不同 consent 载体**，显式登记）。其余 13 个设置操作**零改动**。

---

## 3. 方案对比（本叶）

| 维度 | **A 统一管线 + type-only 消息族 + 4 类单源收编**（选） | B 各 op 自实现执行路径 / `op-*` 进 `KIND_SET` | C 权限项静态化 + 值经流内中转 |
|---|---|---|---|
| 描述 | 9 op 注册 + 管线四态；`op-*` type-only；收编为单一执行体 | 各自为政；kind 入 `KIND_SET` | 免申请；值经 payload 转存 |
| 优点 | 零双路径；`content.js` 零增长；权限面零漂移 | 单点实现省 | 免弹窗 |
| 缺点 | 需 4 门禁等价重锚 + 两段握手 | `content.js` **红线破**；双写复辟 | 违 NG-ALLN-005 / 法八（值入流） |
| 风险 | R-ALLN-002 / 003 / 012（均有机制化缓解） | R-ALLN-002 **成真**（零余量） | N8 / N24 **破** |
| 工作量 | ~7 波 / ~30 任务 | ~4 波，**不达标** | ~6 波，**越界** |

## 4. 推荐方案

**推荐 A**。理由：`op-*` type-only 是 `content.js` 零余量约束下的唯一可行通路（有 `command-policy` / `pick-layer-*` / `ref-rescue` 三个先例）；settings 收编是消除双写（R-ALLN-012）的唯一形态（FIX-1 `authorizeCurrentSite()` 先例）；权限面零改动把 R-ALLN-003 / R-ALLN-016 归零。

---

## 5. 文件影响分析（本叶）

| 操作 | 文件路径 | 说明 |
|:--:|---|---|
| NEW | `src/ui/sidepanel/next-registry/ops.ts` | 9 op 执行体（五要素；panel 7 + 特权 2 的 SW 侧入口） |
| NEW | `src/shared/op-table.ts` | 9 行 op 描述符（纯数据；双侧同源唯一来源） |
| NEW | `src/background/op-protocol.ts` | `isOpMessage`（type-only 校验；仿 `pick-protocol.ts`） |
| NEW | `src/background/op-executors.ts` | SW 执行器镜像（由 `op-table` 派生） |
| MODIFY | `src/background/messaging.ts` | union **type-only** 扩 `op-exec`/`op-exec-result`/`op-audit`（`KIND_SET` 不动） |
| MODIFY | `src/background/service-worker.ts` | `case 'op-exec'` + 入口闸门追加 `!isOpMessage(raw)` + 执行器接线 |
| MODIFY | `src/ui/sidepanel/cards/askuser.ts` | `secret` / `form` 扩形渲染 + 固化文案（掩码） |
| MODIFY | `src/ui/sidepanel/stream-model.ts` | `askKind` 扩值 + `formOptions` / `maskedLength` 字段 |
| MODIFY | `src/ui/sidepanel/sidepanel.ts` | `submitSecret`（值直达 key-store）+ op 触发器接线 |
| MODIFY | `src/ui/settings/ops.ts` | 4 类委派 op 执行体（其余 13 项零改） |
| MODIFY | `src/ui/settings/panel.ts` | 4 类按钮 → `dispatchOp`；`form` 选项源 = `OPTIONAL_CAPABILITIES` |
| **NOOP** | `manifest.json` | **零 diff**（0 项新增；显式登记） |
| NEW | `test/op-wiring.test.ts` | 逐 op 单一调用点 + 无 `requestTurn`（除 `op.turn`）+ ≥3 反证 |
| NEW | `test/sw-op-mirror.test.ts` | SW 镜像 `{id,mode,fail,audit}` 同源 + 漂移反证 |
| NEW | `test/op-protocol.test.ts` | type-only / `KIND_SET` 零新增 / `content.js` 逐字节 |
| MODIFY | `test/authorize-chip-wiring.test.ts` | 特权 op 等价重锚（SW 零 `.request(` 保留） |
| MODIFY | `test/capability-wiring.test.ts` | 可选集合显式名单 + 「新增项在册」分支 |
| MODIFY | `test/binding-wiring.test.ts` / `test/auto-session-wiring.test.ts` | 判据句式等价改写（计数不减） |
| MODIFY | `test/content.test.ts` / `test/pick-layer-budget.test.ts` | X2 等价重锚（逐字节零增长） |
| MODIFY | `test/ui/stream.mjs`（63）/ `test/ui/ask-auth-inflow.mjs`（61） | `secret`/`form` + 拒绝非死端（**增**） |
| MODIFY | `test/ui/binding.mjs`（192） | **段内零改**；段外逐行登记 |
| MODIFY | `test/supersession-ledger.test.ts` | X1 / X2 条目 + `modifiedRanges[]` |
| MODIFY | `test/gate-integrity.test.ts` | 新门禁（op 布线 / SW 镜像 / 协议）纳入受审集合 |
| MODIFY | `test/size-baseline.ts` | 五要素重登记（本叶增量） |

> **S2 断流首验收**的机器化判据（`test/ui/no-dead-end.mjs` 的 S2 全链）由 **v5-3** 与死端守护门禁**同文件**落地（避免两叶各建一次 Chromium 门禁 ⇒ FR-ALLN-004 共享面纪律）；本叶提供其上游样本（9 op 全部可用）。

---

## 6. 风险评估（本叶）

| # | 风险 | 等级 | 缓解 |
|---|---|:--:|---|
| R-ALLN-002 | `content.js` 红线通路 | 高 | `op-*` type-only；`KIND_SET` 零新增；逐字节门禁 |
| R-ALLN-003 | 权限面判据精确集合 | 高 | 0 项新增 + 显式名单 + SW 零 `.request(` 保留 |
| R-ALLN-012 | 双入口漂移（设置页 vs chat） | 中高 | 4 类收编 + 逐 op 布线门禁 |
| R-ALLN-904 | 快照回滚只覆盖单表 | 中高 | `op.revoke` 三表整体回滚断言 |
| R-ALLN-905 | `requestTurn` 边界被侵蚀 | 中 | 零 `requestTurn` 机核（除 `op.turn`） |
| R-ALLN-014 | 弹窗 headless 不可合成 | 中 | EC-ALLN-007；人工面 `⏳`/`PASS` 不冒充 |
| R-ALLN-001 | 体积（本叶增量最大） | 高 | 父 ADR-V5-011 预算（本叶 ≈ 8,900 B）+ 分级预案 |
| R-V5-101 | 两段握手新半完成态 | 中高 | SW 的 commit 点为唯一提交点；未 commit 失败 ⇒ 无状态变更 |
| R-V5-102 | `pendingOps` 与 `MAX_OPEN_ASKS` 仲裁冲突 | 中 | FIFO + 只在 `ask-resolved` drain；同一 ask 不得二次 resolve |
| R-V5-108 / 109 | `options.html` consent 载体 / 回执不同构 | 中 | 显式登记 + 回执同源构造断言 |

---

## 7. 生成的 ADR（本叶主责）

| ADR | 标题 | 本叶落地切入点 |
|---|---|---|
| **ADR-V5-002** | op 管线四态 + 扩形 + `error` 恢复区 | **执行侧**（`secret`/`form` 渲染 + `submitSecret` + `params`/`consent` 卡 + `MAX_OPEN_ASKS` 队列） |
| **ADR-V5-003** | SW 执行器 + `op-*` type-only + 双侧同源 | 全条 |
| **ADR-V5-004** | `optional_permissions` 最小集 | 全条（0 项新增 + 判据显式名单） |
| **ADR-V5-005** | settings 4 类收编 | 全条 + 逐 op 布线门禁 |

（本叶依赖 ADR-V5-001 的接口与 ADR-V5-009 的 S2 判据；体积登记见 ADR-V5-011。）

---

## 8. 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建（V5-2 次叶技术方案：9 op 五要素矩阵 + 双层执行器（特权恰 2，手势在 page，SW 为裁决 / 快照 / 审计 owner）+ `op-*` type-only + 双侧同源 + 权限最小集（0 项）+ `secret`/`form` 扩形 + settings 4 类收编 + S2 上游样本；7 波 / ~30 任务；主责 ADR-V5-002（执行侧）/ 003 / 004 / 005） | 2026-09-22 | SDDU Plan Agent |
