# Feature Specification：specs-tree-v5-2-ops-first-batch（V5-2 首批 9 op 落地 + SW 执行器 + 断流首验收）

> **文档定位**: SDDU 需求规范（叶子切片） — 本叶承载的父 FR / NFR / EC / AC 的**实施范围切片**；权威条文见父 `../spec.md`
> **前置依赖**: 父 `../spec.md` v1.0（2026-09-22）+ 父 `../discovery.md` v1.0（2026-09-22）+ **上游叶** `specs-tree-v5-1-next-registry-pipeline`（注册表 / 管线 / 义务表机制）
> **创建人**: SDDU Spec Agent
> **创建时间**: 2026-09-22
> **版本**: v1.0
> **更新人**: SDDU Spec Agent
> **更新时间**: 2026-09-22
> **更新说明**: 初始创建（V5-2 叶子规范：9 op 落地 + SW 双层执行器 + `optional_permissions` + 掩码 llm-config + settings 收编 + **断流首验收**；**次叶，P0**）

本叶 = v5 的**次叶**，交付「**一站式闭环真的能用**」：把 9 个 op（设计稿 8 个 + `op.turn`）逐个注册到 `v5-1` 的注册表上，按统一管线四态跑通；把需要在 SW 侧执行的特权 op 经 **type-only `op-*` 消息族**落到 SW 执行器（`content.js` 逐字节零增长）；放开 `optional_permissions`（安装期静态权限不变）；把 LLM 配置做成**掩码输入卡 + 值直达存储**（法八）；把设置面板与 chat chip 收编为**同一执行入口**（零双路径）；最后把**真机 S2 断流样板**做成 headless 全链回归判据（断言「死端 = 0」）。

---

## 1. 元数据

| 字段 | 值 |
|------|-----|
| Feature ID | specs-tree-v5-2-ops-first-batch（V5-2 首批 9 op 落地 + SW 执行器 + 断流首验收） |
| 父 Feature | specs-tree-web-cli-plugin-v5-all-in-next（depth=1，F-32，v0.10.0） |
| 名称 | V5-2 首批 9 op 落地 + SW 执行器 + `optional_permissions` + 掩码 llm-config + settings 收编 + 断流首验收 |
| 优先级 | P0 |
| 目标版本 | v0.10.0（登记留给收口） |
| 目录深度 | depth=2（叶子，`leaf: true`） |
| 交付顺序 | **position = 2**（依赖 `v5-1`） |
| 分支 / HEAD | `feature/web-cli-plugin` / `4c1dbe1`（spec 阶段起点） |
| 基线产物 | `dist/sidepanel.js` = **498,521 B**（生效上限 **523,447 B**）；`dist/content.js` = **177,076 B**（**零容差**）；`dist/pick-layer.js` = **33,900 B** |
| 依赖 | **`specs-tree-v5-1-next-registry-pipeline`**（`NextProvider` / `NextOp` 接口 + 注册表 API + 管线四态 + 义务表机核 + chip `data-op`） |
| 下游叶 | `specs-tree-v5-3-chrome-face`（依赖本叶的 `op.authorize` / `op.revoke` / `op.rebind` 落地） |
| 相关干系人 | 作者（唯一真实用户 + 决策者，已授权编排器代行决策）；编排器（DC-ALLN-001 / 003 / 004 / 005）；下游 @sddu-plan / @sddu-tasks / @sddu-build / @sddu-review / @sddu-validate |
| 关联问题 | Q-ALLN-002（跳来跳去，核心）/ Q-ALLN-006（浏览器权限流内入口，次要）/ Q-ALLN-007（撤销流内闭环，次要）/ Q-ALLN-001（断流首验收，核心）/ Q-ALLN-004（法八入口侧，核心）/ Q-ALLN-010（单一执行入口，次要）/ Q-ALLN-012（`content.js` 红线，潜在） |
| 关联风险 | R-ALLN-002（content.js 红线，高）/ R-ALLN-003（权限面，高）/ R-ALLN-008（法八可核性，中高）/ R-ALLN-012（双入口漂移，中高）/ R-ALLN-014（弹窗人工面，中）；+ R-ALLN-904 / 905 |

---

## 2. 上下文与边界

### 2.1 上下文

现状下「用户需要操作的地方」有 **一半以上不经过 chat**：LLM 配置在 `settings-llm`（`settings/panel.ts:130-179`）、浏览器可选权限在 `settings-capabilities`（`:261`，唯一申请手势路径 `requestCapability(row)`；门禁明确「SW 永不调用 `.request(`」）、撤销分布在三处（`settings-capabilities` / `settings-auto-auth` / 连接树 `tree-view.ts:549`）。同时真机 23:12:59 的 ✖ 行之后**无路可走**（死端）。

本叶的工作 = **把操作搬进流**（9 op + 统一管线）+ **把权限面精确放开**（只 `optional_permissions`）+ **把值请出流**（法八掩码卡）+ **把入口收成一条路**（settings 收编）+ **把断流变成回归测试**（S2 机器化）。

### 2.2 范围（做 / 不做）

**做（in）**：

- **9 个 op** 逐个注册（`op.authorize` / `op.rebind` / `op.llm-config` / `op.perm.request` / `op.revoke` / `op.pick` / `op.describe` / `op.help` / `op.turn`），每个五要素齐备（风险级 / params / consent / 执行层 / 回执）。
- **SW 双层执行器**：panel-local op 在面板执行；特权 op（`op.authorize` 的 origin 权限 / `op.perm.request`）经 **type-only `op-*` 消息族**走 SW；SW 侧**小型注册表镜像契约**（id / 模式 / 失败语义 / 审计）。
- **`optional_permissions`** 放开（安装期静态 `permissions` / `host_permissions` 逐字不变）+ 权限项最小集论证。
- **掩码 `secret` 卡 + `form` 扩形**（`askuser` 扩形，不新增 kind）+ **值直达 key-store** + 流内只留事实。
- **设置面 4 类重叠收编**（authorize / revoke / rebind / llm-config）为 op **单一执行入口**（零双路径）+ 单一调用点机核；其余设置操作不动。
- **拒绝不是死端**（consent 被拒 / 权限被拒 → 固化 + 可达 next）。
- **S2 断流样板机器化首验收**（headless 全链，断言死端 = 0）。
- 本叶范围的门禁等价重锚（X1 权限面 / X2 消息族 / `test:ask-auth` / `test:binding` 段外 / `test:page-input`）。

**不做（out）**：

- 不落地 `error` 卡出生带恢复区 / 死端守护门禁（`v5-3`）；不落地授权 chip / 可拖动宽度 / 密度连续口径（`v5-3`）；不落地法八**四面零明文机核**（`v5-3`）——本叶只交付掩码卡与投递路径。
- 不落地注册表 / 管线 / 契约 v2 / 双契约（`v5-1`）。
- 不改 `KIND_SET`；不碰 `src/content/**`；不新增安装期静态权限；不改判定链；不改 12 卡类型学；不新增流内固定宿主；不改 ROADMAP；不碰 `design/**`。

### 2.3 与父规范 / 上游叶的关系

- **权威条文 = 父 `../spec.md`**（§5.5 OPS / §5.7 SW / §5.8 SETTINGS / §5.2 LAW7 的 014·016 / §5.3 LAW8 的 020~022 / §5.11 X1·X2）。本叶只做范围切片 + 实施口径；偏离须先回父规范登记。
- **接口契约 = `v5-1` 的 Definition**：本叶只**注册**与**执行**，不改注册表语义；若发现接口不足，须回 `v5-1` 走取代登记（不得在 `v5-2` 私自扩接口）。

---

## 3. 目标与非目标（本叶）

### 3.1 目标

| # | 目标 |
|---|------|
| LG-V5-2-001 | **9 op 全部流内闭环**：授权 / 重绑 / LLM 配置 / 浏览器权限 / 撤销 / 拾取 / 描述 / 帮助 / 发回合，都在 chat 里以 next 走完（不跳走）。 |
| LG-V5-2-002 | **权限面精确放开**：只 `optional_permissions`；安装期静态权限逐字不变；新增项有最小必要论证。 |
| LG-V5-2-003 | **值不入流（入口侧）**：掩码卡输入 → 值直达 key-store；流内只留「事实 + 时间戳 + 掩码长度」。 |
| LG-V5-2-004 | **零双路径**：设置面板按钮与 chat chip 是**同一执行入口**的两个触发器。 |
| LG-V5-2-005 | **拒绝不是死端**：同意被拒 / 权限被拒 → 固化 + 可达 next。 |
| LG-V5-2-006 | **断流首验收机器化**：真机 S2 序列在 headless 下全链复刻，断言「死端 = 0」；弹窗体感如实入人工面。 |
| LG-V5-2-007 | **`content.js` 零增长**：`op-*` 走 type-only；177,076 B / sha 逐字节命中。 |

### 3.2 非目标（本叶）

继承父 §3.2 的 `NG-ALLN-001~020` 全部适用。**本叶额外强调**：

| # | 本叶明确不做 |
|---|-------------|
| LNG-V5-2-001 | **不把 `op-*` 加进 `KIND_SET`**（零余量红线；须走 type-only 先例）。 |
| LNG-V5-2-002 | **不在面板侧直接申请 origin / 浏览器权限**（特权 op 必须走 SW 执行器 + 用户手势路径）。 |
| LNG-V5-2-003 | **不让设置面板自实现执行路径**（收编 = 同调 op 入口；否则双写复辟）。 |
| LNG-V5-2-004 | **不把掩码值写进流内任何节点 / 属性 / digest**（值只进存储）。 |
| LNG-V5-2-005 | **不以自动判据冒充浏览器弹窗验收**（headless `PENDING_TIMEOUT` ⇒ 如实标注人工面）。 |
| LNG-V5-2-006 | **不提前落地 `v5-3` 的界面面**（授权 chip / 宽度 / 四面机核 / 死端守护门禁）。 |

---

## 4. 功能需求（本叶承载的父 FR）

> 需求条文以父为准；下表给出**本叶落地切入点**。

| 父 FR | 本叶落地切入点 | 优先级 |
|---|---|---|
| FR-ALLN-040 | `op.authorize`：无 params + consent（auth 卡 + 后果预演）+ SW 执行（origin 权限）+ 固化区 / 系统行回执 | P0 |
| FR-ALLN-041 | `op.rebind`：无 params + 无 consent + 复用 `#rebind` 单一生产入口 + 零 `requestTurn` | P0 |
| FR-ALLN-042 | `op.llm-config`：厂商 choice + 模型 + **API Key `secret` 掩码** + consent + 测试连接 → 掩码写存储 + 快照回滚 | P0 |
| FR-ALLN-043 | `op.perm.request`：权限项 `form` 多选（来自 `optional_permissions`）+ consent + 原生弹窗 + **批准 / 拒绝都固化** + 快照回滚 | P0 |
| FR-ALLN-044 | `op.revoke`：目标 choice + **不可逆确认卡** + 三表快照回滚 + 回执带审计入口 | P0 |
| FR-ALLN-045 | `op.pick`：进入拾取态 + 复用既有拾取单一入口 + 取消 / 超时 → 错误卡 + 恢复 next | P0 |
| FR-ALLN-046 | `op.describe`：`text` 采参 + 复用 `submitDescribe` 单一入口 + 空描述卡内校验零副作用 | P0 |
| FR-ALLN-047 | `op.help`：列出当前 ctx 可达 op（由注册表 `when(ctx)` 派生，不硬编码）+ 零回写 | P1 |
| FR-ALLN-048 | `op.turn`：**唯一**经 `requestTurn` 的发回合入口；其余 op 零 `requestTurn` | P0 |
| FR-ALLN-049 | 会话 / 分组**不收编**（`deferred` 登记，含触发条件） | P0 |
| FR-ALLN-014 | 拒绝不是死端：consent 被拒 / 权限被拒 / ask 取消 → 固化 + 可达 next | P0 |
| FR-ALLN-016 | **S2 断流样板机器化首验收**（headless 全链 10 环节；死端 = 0；弹窗入人工面） | P0 |
| FR-ALLN-020 | 敏感值唯一入口 = `secret` 掩码卡（`askuser` 扩形；`type=password` / `data-secret`） | P0 |
| FR-ALLN-021 | 值直达 key-store（值入存储调用点**恰一处**；流内零中转） | P0 |
| FR-ALLN-022 | 流内只留事实（固化区 = {opId, ts, maskedLength, result}；`digest` 只 `••••••`） | P0 |
| FR-ALLN-065 | 双层执行器：每个 op 的 `execute` 层次归属**显式**（panel / SW） | P0 |
| FR-ALLN-066 | 特权 op 清单**恰 2 项**（`op.authorize` / `op.perm.request`）；手势路径语义保留 | P0 |
| FR-ALLN-067 | `op-*` 消息族 **type-only**（`KIND_SET` 零新增；运行时校验独立模块） | P0 |
| FR-ALLN-068 | SW 侧小型注册表镜像契约（{id, mode, fail, audit}，与面板同源） | P0 |
| FR-ALLN-069 | `content.js` 177,076 B / `pick-layer.js` 33,900 B 逐字节零容差 | P0 |
| FR-ALLN-075 | 4 类重叠（authorize / revoke / rebind / llm-config）收编为 op 单一执行入口 | P0 |
| FR-ALLN-076 | 零双写（执行面）：同一 op 无两条执行 / 留痕路径 | P0 |
| FR-ALLN-077 | 其余设置操作不动（8 分区结构 / 签名 / 行为零变化） | P0 |
| FR-ALLN-078 | 单一调用点机核（逐 op 布线门禁 + ≥3 条伪造反证；无 `requestTurn` 除 `op.turn`） | P0 |
| FR-ALLN-110 | X1：允许新增 `optional_permissions`；静态 `permissions` 逐字不变；最小集论证 | P0 |
| FR-ALLN-111 | X2：`op-*` type-only（默认禁止进 `KIND_SET`） | P0 |
| FR-ALLN-116 | 取代一律等价重锚（本叶负责 X1 / X2 的等价对账） | P0 |
| FR-ALLN-003 | 断言零删除零降级、计数只增（本叶面） | P0 |
| FR-ALLN-120 | 门禁等价重锚（本叶主责：`capability-wiring` / `binding-wiring` / `auto-session-wiring` / `test:binding` 段外 / `test:ask-auth` / `test:page-input` / `test:content` / `pick-layer-budget` / `insight-protocol` / `test:ref-pick-wiring`） | P0 |
| FR-ALLN-121 | 反证不空转（两段证伪） | P0 |
| FR-ALLN-124 | 门禁严格串行 + `KL-N-10` 纪律（`test:binding` 尤其） | P0 |
| FR-ALLN-125 | 新门禁（断流门禁 / op 布线门禁 / SW 镜像一致性）纳入 `gate-integrity` | P0 |
| FR-ALLN-130 / 133 | 体积五要素（本叶增量）+ 红线逐字节复核 | P0 |

---

## 5. 非功能需求（本叶相关）

| 父 NFR | 本叶关注点 | 验收锚点 |
|---|---|---|
| NFR-ALLN-003 | **安全**：流内零明文（本叶入口侧）+ 净化面语义不变；属性面同过净化 | 掩码卡断言 + `test:zero-injection ≥27` |
| NFR-ALLN-009 | **权限最小化**：新增 / 沿用 optional 项最小必要；安装期静态面零漂移；浏览器权限不可静默回收如实说明 | FR-ALLN-110 全绿 + 最小集论证 + 口径一致 |
| NFR-ALLN-010 | 改状态 op 有快照 / 回滚（无半完成态）；两侧注册表语义一致 | 三表回滚断言 + 镜像漂移反证 |
| NFR-ALLN-011 | 可观测性：审计记录 {opId, ts, result, maskedLength} 且零明文；回执 → 审计入口可达 | 审计字段断言 + 零明文 + 入口可达 |
| NFR-ALLN-006 | 兼容性：`#input` / `#send` / `#rebind` / `#authorize` / 设置面 ids 读取契约不破 | 兼容面逐 id 断言 |
| NFR-ALLN-007 | 每条新 / 改判据可 FAIL + `expectFailPattern` | 反证留证 |
| NFR-ALLN-002 | 320px 零溢出；键盘可达（掩码卡 / form 卡 / consent 卡） | `journey` 320px + 键盘断言 |
| NFR-ALLN-008 | 无障碍：掩码输入读屏可达（`type=password` + `data-secret` + 标签）；form 多选读屏可达 | ARIA 断言 + 人工面读屏项 |
| NFR-ALLN-005 | `sidepanel.js` ≤ 生效上限；本叶 byte 变化走五要素 | `test:size-budget` / `size-growth-evidence` |

---

## 6. 边界情况（本叶相关）

父 `EC-ALLN-001~021` 全部适用；本叶执行时**重点验**：

| 父 EC | 本叶执行要点 |
|---|---|
| EC-ALLN-005 | chip execute 抛错（拾取取消 / 超时）→ 单卡边界捕获 + 错误卡 + 恢复 next |
| EC-ALLN-006 | consent 被拒绝 → 固化「已拒绝」（非异常、不 loud）+ 可达 next；不重试同一授权 |
| EC-ALLN-007 | 浏览器原生弹窗 headless 不可合成 → 只走人工面（`⏳` / `PASS`，不得冒充）；机器化止于「params 卡 → consent 卡 → 申请调用点」 |
| EC-ALLN-008 | 浏览器权限被拒 → 固化 + 可达 next；如实说明不能静默回收 |
| EC-ALLN-009 | 掩码输入为空 / 取消 → 卡内校验、零副作用；取消走 `ASK_CANCEL_REASONS` 既有语义 |
| EC-ALLN-010 | `MAX_OPEN_ASKS = 2`：管线 params / consent 卡达上限时**不新开 ask**，排队 / 合并提示，不得静默丢弃 |
| EC-ALLN-011 | `op.revoke` 失败 → **三表整体回滚**，不留跨表半完成态 |
| EC-ALLN-012 | LLM 连接测试失败 → 凭据表快照回滚（旧配置逐字段不变）+ 错误卡 + 恢复 next |
| EC-ALLN-013 | 非首装未授权会话 → `op.authorize` 可达（配合 `v5-1` 的常驻候选） |
| EC-ALLN-016 | 设置面板按钮与 chat chip 并发触发同一 op → 单一执行入口、无重复回执 |
| EC-ALLN-017 | `pending` 门控下本地 op（pick / describe / rebind / help / authorize）不受门控、零 `requestTurn` |

---

## 7. 验收锚点（本叶 → 父 AC）

| 父 AC | 本叶判定要点 |
|---|---|
| **AC-ALLN-001** | **断流样板机器化主验收（本叶核心）**：headless 全链 10 环节（绑定 → 探测 → 未授权 → ✖ 阻塞 → 授权 next → auth 卡 → execute → ✓ 回执 → 探测恢复 → 拾取 next）+ 「死端 = 0」+ 弹窗入人工面 |
| AC-ALLN-007 | 9 op 逐条五要素齐备且与设计稿 §③（+ `op.turn`）一致 |
| AC-ALLN-008 | 统一管线四态唯一（无 per-op 旁路）；`params` / `consent` 缺省语义正确 |
| AC-ALLN-010 | 双层执行器（特权恰 2 项）+ `op-*` type-only（`KIND_SET` 零新增）+ `content.js` 逐字节 + SW 镜像同源 |
| AC-ALLN-011 | 4 类收编零双路径 + 其余设置操作零改动 + 单一调用点机核 |
| AC-ALLN-003 | 法八**入口侧**：掩码卡唯一入口 + 值直达 key-store（**四面零明文机核本体在 `v5-3`**） |
| AC-ALLN-019 | 本叶主责门禁等价重锚清单逐项（权限面 / 消息族 / ask-auth / binding 段外 / page-input / ref-pick-wiring） |
| AC-ALLN-021 | 反证不空转（本叶每条新 / 改判据两段证据） |
| AC-ALLN-022 | 红线逐字节（content / pick-layer） |
| AC-ALLN-024 | 人工面：**浏览器原生权限弹窗体感**（`⏳` / `PASS`） |
| **AC-ALLN-025** | **本叶收尾全门禁绿 + 计数只增基线**（`test:binding` 按 `KL-N-10` 纪律；保护段保段） |

---

## 8. 交付与执行

### 8.1 上游依赖

**`specs-tree-v5-1-next-registry-pipeline`**（必须已完成）：`NextProvider` / `NextOp` 接口 + 注册表 API + 管线四态 + 义务表机核 + chip `data-op` + 阻塞态枚举单源。本叶只**注册**与**执行**。

### 8.2 下游consumer

| 叶 | 依赖点 |
|---|---|
| `specs-tree-v5-3-chrome-face` | `op.authorize` / `op.revoke` / `op.rebind` 已落地（授权 chip 黄点击产 next / 绿态管理详情）+ S2 断流的持久化形态（死端守护门禁基于本叶的样本） |

### 8.3 交付物（本叶）

1. 9 个 op 的注册条目（五要素）与执行体（panel / SW 分层）。
2. SW 执行器 + `op-*` type-only 消息族 + SW 侧注册表镜像。
3. `manifest.json` 的 `optional_permissions` 放开（静态面零漂移）+ 最小集论证。
4. `askuser` 扩形（`secret` / `form`）卡 + 值直达 key-store 投递路径。
5. 设置面 4 类收编（单一执行入口）+ 单一调用点布线门禁。
6. 断流 S2 headless 全链判据 + 人工面清单条目。
7. 本叶范围门禁等价重锚 + 反证留证。

### 8.4 叶内执行序（供 plan / tasks 参考，**不是需求**）

① 先 `op.pick` / `op.describe` / `op.rebind` / `op.help` / `op.turn`（**无 consent / 无 params** 或纯本地，风险最低，可先证管线）→ ② 再 `op.authorize`（特权 op + SW 执行器 + origin 权限单一入口）→ ③ 再 `op.llm-config`（`secret` 扩形 + 值直达存储 + 快照回滚，法八入口侧）→ ④ 再 `op.perm.request`（`form` 扩形 + `optional_permissions` + 原生弹窗 + 双固化）→ ⑤ 再 `op.revoke`（高风险确认 + **三表**快照回滚）→ ⑥ 再做 settings 4 类收编 + 单一调用点机核 → ⑦ 最后做 **断流 S2 全链首验收**（需前面 op 全部可用）+ 门禁等价重锚 + 体积五要素 + 收尾全门禁。

---

## 9. 风险（本叶）

| # | 风险 | 等级 | 应对 |
|---|---|:--:|---|
| R-ALLN-002 | `content.js` 红线通路（`op-*` 若进 `KIND_SET`） | 高 | FR-ALLN-067 / 069 / 111；AC-ALLN-010 |
| R-ALLN-003 | 权限面安全评审 + 判据精确集合（静态 5 / 可选 / host 6 / 手势路径） | 高 | FR-ALLN-110 / 066；NFR-ALLN-009 |
| R-ALLN-012 | 双入口漂移（设置页与 chat 并存的执行路径） | 中高 | FR-ALLN-075~078；EC-ALLN-016 |
| R-ALLN-008 | 法八实现层可核性（入口侧；四面机核在 `v5-3`） | 中高 | FR-ALLN-020~022；与 `v5-3` 边界明确 |
| R-ALLN-904 | 快照回滚只覆盖单表 ⇒ 跨表半完成态 | 中高 | FR-ALLN-044；EC-ALLN-011（三表整体回滚） |
| R-ALLN-905 | 本地 op 与 `op.turn` 的 `requestTurn` 边界被侵蚀 | 中 | FR-ALLN-048 / 059 / 078 |
| R-ALLN-014 | 浏览器弹窗 headless 不可合成 | 中 | EC-ALLN-007；AC-ALLN-024（不冒充 PASS） |
| R-ALLN-001 | 体积越限（本叶增量最大：9 op + 掩码 / 表单扩形 + SW 执行器） | 高 | FR-ALLN-130 / 134（**先评估后落地**；必要时拆叶控体积由父显式裁决） |
| R-ALLN-015 | `test:binding` / `test:ui #54g` 环境性 flake 被误读为回归 | 低 | FR-ALLN-124（隔离复跑 ≥2、如实登记） |

---

## 10. 开放问题（本叶相关）

父 §8 的 O-ALLN-001~012 **全部已裁决**；本叶直接相关：**O-ALLN-001**（9 op 范围 + 会话 / 分组 `deferred`，DC-ALLN-001）、**O-ALLN-003**（SW 双层执行器 + type-only，DC-ALLN-003）、**O-ALLN-004**（settings 4 类收编，DC-ALLN-004）、**O-ALLN-005**（断流机器化 + 弹窗人工面，DC-ALLN-005）。**无遗留未决项**。

---

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建（V5-2 叶子规范：9 op 落地 + SW 双层执行器 + `optional_permissions` + 掩码 llm-config + settings 收编 + 断流首验收；承载父 §5.5 / §5.7 / §5.8 / LAW7·LAW8 的入口侧 / X1·X2 共 34 条 FR 的实施切片；次叶 / P0，依赖 `v5-1`） | 2026-09-22 | SDDU Spec Agent |
