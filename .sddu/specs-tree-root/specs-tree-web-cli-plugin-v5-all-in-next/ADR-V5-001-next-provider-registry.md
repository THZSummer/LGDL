# ADR-V5-001: NextProvider/NextOp 注册表与瘦分发（契约 v2 七点 + recommend.ts 取代路径）

## 状态
ACCEPTED

## 背景

现状下「新增一种需要用户操作的地方」必须改 ≥4 处（discovery §7.1 A1~A5，本轮实测）：

- **4 条手写规则**：`recommend.ts:52` `NEXTSTEP_PRIORITY = ['risk-recovery','ref-action','onboarding','capability-discovery']`；
- **act 闭集 6 项**：`recommend.ts:194` `NEXTSTEP_ACTS = ['next','repick','describe','authorize','rebind','help']`，被 `test/recommendation-sources.test.ts:281` + `test/local-act-wiring.test.ts:269` **逐字**钉死；
- **16 分支 switch**：`sidepanel.ts:184-277#handleCardAction`（`answer/choose/cancel/approve/reject/audit/next/repick/describe-submit/describe/hover/rebind/help/reanchor/authorize` + `:275` 兜底「将在 v4-3 / v4-4 落地」）；
- **chip 绑动作字符串**：`cards/nextstep.ts:59` `btn.setAttribute('data-act', act)`。

结果必然出现**假控件**（加了规则忘加分支）与**新死端**（加了阻塞态忘加入口）。父 spec §5.4 FR-ALLN-030~038 / §5.6 FR-ALLN-055~059 要求把操作收进**可逆注册的插件注册表**，并让 `handleCardAction` **per-op diff = 0**（N22）成为机核事实。

## 选项

| 选项 | 形态 | 优点 | 缺点 |
|---|---|---|---|
| **A 纯 TS 注册表**（选） | `NextProvider`/`NextOp` 接口 + `registerNextProvider()` + 单次查表分发器；旧规则**等价迁移为内置 provider** | 类型安全；零新加载面；义务表可静态机核；`diff = 0` 可静态抽取判据 | 需一次性的门禁等价重锚（4 门禁） |
| B JSON 声明式配置 | provider 由 JSON 描述 + 运行时加载 | 「不改代码」最彻底 | 引入**新加载面 / 新真值源**（违 NG-ALLN-015）；类型与校验全靠运行时；义务表 ↔ 注册表一致性无法静态机核 |
| C 注册表与旧规则**并存** | 新操作走注册表，旧 4 规则保留 | 改动面最小 | act 双词汇长期并存（LNG-V5-1-003）；`handleCardAction` 仍含 per-op 分支 ⇒ N22 不成立；死端机制基础仍在旧路径 |

## 决策

**采用 A**。落地形状（`src/ui/sidepanel/next-registry/`，v5-1 交付）：

```ts
// definition.ts —— Definition（Seam 三件套之一）
export const NEXT_SERVICES = Object.freeze(['session','snapshot','credentials','permissions','siteRegistry','pageSide'] as const);
export const NEXT_MODES = Object.freeze(['waterfall','emit'] as const);
export const NEXT_MOUNT_POINTS = Object.freeze(['next','params','consent','execute','receipt'] as const);
export const MOUNT_MODE = Object.freeze({ next:'waterfall', params:'waterfall', consent:'waterfall', execute:'waterfall', receipt:'emit' });
export const BLOCKED_TERMINALS = Object.freeze(['site.unauthorized','llm.unconfigured','perm.missing','binding.stale','ref.all-invalid'] as const);

export interface NextProvider {
  readonly id: string;
  readonly deps: readonly NextService[];          // R2：⊆ NEXT_SERVICES
  readonly priority: 0 | 1 | 2 | 3;               // R3：0 恢复 / 1 引导 / 2~3 发现（必填）
  readonly prepend?: boolean;                     // R3：同优先级置前
  readonly mode: 'waterfall' | 'emit';            // R4：∈ MOUNT_MODE 值集
  readonly fail: 'card-boundary' | 'snapshot-rollback'; // R5
  when(ctx: NextCtx): boolean;                    // 纯谓词（可单测、可并行）
  readonly chips: readonly string[];              // = opId 列表（渲染/点击由管线接管）
  dispose?(): void;
}
export interface NextOp {
  readonly opId: string;                          // 唯一权威词汇
  readonly risk: 'low' | 'mid' | 'high';
  readonly layer: 'panel' | 'sw';                 // FR-ALLN-065
  readonly params?: AskSpec;                      // 缺省 ⇒ 不插 ask
  readonly consent?: ConsentSpec;                 // 缺省 ⇒ 不插 auth
  execute(ctx: OpCtx): Promise<OpOutcome>;
  readonly receipt?: ReceiptSpec;
}
export function registerNextProvider(def: NextProvider, opts?: { overwrite?: boolean }):
  | { ok: true; id: string; unregister: () => number }
  | { ok: false; error: string; unregister: null };
```

- **R1 可逆注册**：`unregister` 闭包 = `removeRowById(id)`，**幂等**（第二次调用不再减，返回同一 `countProviders()`）。
- **R2 依赖声明式**：`validateNextProvider` 校验 `deps ⊆ NEXT_SERVICES`（未知 ⇒ `{ok:false,error}`）；`resolveOrder` = `topoByDeps(list)` 后稳定排序 `(priority asc, prepend desc, registrationSeq asc)` —— **顺序不来自数组位置**（置换列表测试）。
- **R3 优先级显式化**：`priority` 必填（缺 ⇒ loud）；`{overwrite:true}` 按 id **整行替换**（`replaceRowById`，计数不变）。
- **R4 分发模式公开契约**：`MOUNT_MODE` 表 = 唯一权威；`mode ∉ NEXT_MODES` 或与挂载点声明不符 ⇒ loud。
- **R5 失败语义三级**：① `execute` 抛错 → 单卡边界捕获 → 流内错误卡 + 恢复 next；② 注册失败（重复 id / 未知 deps / 非法 mode / chips 悬空）⇒ 拒绝 + `data-state="fail"` 红显；③ 改状态 op 执行前快照、失败整体回滚。
- **R6 Seam 三件套**：Definition（本 ADR 接口）/ Provider（`registry.ts`）/ Consumer（`dispatch.ts` + `handleCardAction` 单次查表）。
- **R7 证明义务表**：`obligation-table.ts` 9 行四要素（功能名 / 触发 provider / 挂载点·模式 / 失败语义）+ 表尾明示契约义务。

### 分发模式表（挂载点 × 模式，唯一权威）

| 挂载点 | 语义 | 模式 |
|---|---|---|
| `next` | 候选求值（`when(ctx)` 纯谓词） | `waterfall` |
| `params` | 参数采集（插 ask 卡并读应答） | `waterfall` |
| `consent` | 同意门（返回放行 / 拒绝 typed decision） | `waterfall` |
| `execute` | 执行阶段（`op.execute()`，失败卡边界捕获） | `waterfall` |
| `receipt` | 回执（追加固化区 + 系统行，只留痕） | `emit` |

### recommend.ts 取代路径（X3 / X6，**取代不是并存**）

| 旧对象 | 迁移为 | 语义等价点 |
|---|---|---|
| `NEXTSTEP_PRIORITY` 4 规则 | 内置 provider 组（priority 0/1/2/3） | `risk-recovery`→0 · `onboarding`→1 · `ref-action`→2 · `capability-discovery`→3（顺序等价：恢复 > 引导 > 发现） |
| `activeRecoveryTrigger` 5 触发集 | `site.unauthorized` / `ref.stale` / `binding.stale` / `probe.unsettled` / `declaration.invalid` 5 个 P0 provider | 5 触发逐条等价；`site` 触发 **去掉 `firstRun` 依赖**（FR-ALLN-013） |
| `RECOVERY_CHIP_ORDER` act 表 | provider 的 `chips: [opId]` 列表 | `site`/`probe` 首项 = `op.rebind`；`refInvalid` 首项 = `op.pick` |
| `candidateRules` 4 谓词 | provider 的 `when(ctx)` 纯谓词 | 逐谓词等价（含 `openAsks === 0` / `probe.phase === 'ready'` / `!busy`） |
| `recommend()` 门控（pending / interval / empty / safety） | 管线 `next` 挂载点门控 + `MAX_CHIPS_PER_CARD` / `MAX_NEXTSTEP_CARDS_PER_ROUND` / `NEXTSTEP_MIN_INTERVAL_MS` **常量逐字保留** | 4 抑制原因 `RecommendSuppression` 语义不变 |
| `NEXTSTEP_ACTS` 6 act | `ACT_TO_OP` 6 行映射（`next→op.turn` / `repick→op.pick` / `describe→op.describe` / `authorize→op.authorize` / `rebind→op.rebind` / `help→op.help`） | 映射表为唯一权威、双向可查 |
| `NEXTSTEP_SOURCE_WHITELIST` 7 源 | 注册表读入的 `NextCtx` 字段集 = 同 7 源 | 源白名单 7 项语义保留（判据等价重锚，不是放宽） |
| `handleCardAction` 16 分支 | **两集模型**（见下） | per-op 分支 = 0 |

### `handleCardAction` 瘦分发的**两集模型**（证明义务的精确口径）

`handleCardAction` 里的 16 个 `if` 分两类，**必须显式区分**（这是「per-op diff = 0」可机核的前提）：

- **集 A = 卡协议动作**（`answer` / `choose` / `cancel` / `approve` / `reject` / `audit` / `hover` / `reanchor`）：属于 `askuser` / `auth` / `ref` **卡族自身的协议**，从不携带 `data-op`，**保留在 `handleCardAction`**（不是 op 分发）。
- **集 B = next-chip 动作**（`next` / `repick` / `describe` / `describe-submit` / `rebind` / `help` / `authorize`）：全部改为**数据驱动**：
  ```ts
  function dispatchChipAction(action: string, value?: string): boolean {
    const opId = ACT_TO_OP[action] ?? (OPS_BY_ID[action] ? action : undefined); // 一次查表，零 per-op 分支
    if (!opId) return false;
    void runOp(opId, { value });
    return true;
  }
  ```
  集 B 的 7 个分支合并为 **1 次查表 + 1 个调用点**；`cards/nextstep.ts` 增设 `data-op`（`data-act` 降为渲染别名，**不得作分发依据**）。

## 后果

**正面**：新增操作 = 注册一个 provider + 自带测试；`handleCardAction` 集 B 分支数 = 0；契约 v2 七点逐点可机核；死端守护有了机制基础（阻塞态枚举单源 + 候选可达性）。

**代价 / 风险**：4 个既有门禁需**等价重锚**（`recommendation-sources` / `local-act-wiring` / `authorize-chip-wiring` / `test:recommendation` 59）+ 新门禁 3 条（注册表往返 / 义务表一致性 / 分发器 diff=0）；`SIDEPANEL_BASELINE_BYTES` 需五要素重登记（ADR-V5-011）。

**实现层铁律**：`REGISTRY` 单点写入（唯一 `push` / `splice`）；`OPS_BY_ID` 单源；`resolveOrder` 不得回退为数组顺序。

## 影响 FR

FR-ALLN-010 / 011 / 013 / 030~038 / 055~059 / 112 / 115 / 120 / 121 / 125；NFR-ALLN-004 / 007 / 010 / 012；N22；AC-ALLN-004 / 005 / 009 / 019。

## 回滚

注册表整层 (`src/ui/sidepanel/next-registry/`) 与 `dispatchChipAction` 为**新增**，`recommend.ts` 的旧导出（4 规则 / 6 act / 7 源）在重锚期**保留为内置 provider 的实现体**，因此回滚 = 把 `dispatchChipAction` 换回两个显式分支 + 恢复 `cards/nextstep.ts` 的 `data-op` 为可选，**门禁侧**回滚 = 还原 4 个重锚判据（逐字节）。回滚不触碰 `dist/content.js`（红线未动）。
