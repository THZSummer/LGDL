# ADR-SGO-005: 扩围征询（`ask-user` 二择 + `out-of-scope-authorized` + 留痕 + 拒绝零死端）

## 状态
ACCEPTED

## 背景

**根因 / 现状**：无范围法则时，用户说「整页」与说「原地」在机制上**无差别**；越界写不需征询且不可判（Q-SGO-002）。真机 `ty.md:1885-1893` 显示用户**只被反问一次就答了** ⇒ 他愿答，问题只是**系统没在范围层问过**。若硬禁止越界，则正当全页任务被卡住（Q-SGO-011 / NG-SGO-015）。

**spec 裁决（O-SGO-006 / DC-SGO-006 / FR-SGO-060~063）**：扩大范围走**正向路径** —— 写动作前 `ask-user` **二择**（「仅引用范围内」/「整页」）；用户确认 **= 范围扩张的可判事实**（入留痕）；**不硬禁止**；拒绝 / 取消后**零死端**；二择卡**复用既有 ask 机制**（零新增卡类型）。

## 决策

### 1. 二择卡 = 既有 `askuser` 机制（零新增 kind）

- 触发：写闸判定为 `out-of-scope-unauthorized`（ADR-SGO-002 §4）时，面板经**既有** `ask-user-request` 通道提出二择：`{kind:'choice', prompt:'本次写动作超出引用范围，是否扩大到整页？', options:['仅引用范围内','整页（扩大范围）']}`。
- 卡片 = 既有 `askuser` kind（`chat-state.ts` 的 `ask` 分支）；**零新增卡类型 / 宿主**（N-SGO-009/010）。
- `MAX_OPEN_ASKS = 2` 语义 / `ASK_CANCEL_REASONS` 4 项**逐字不变**（FR-SGO-063）。

### 2. 转值：`out-of-scope-authorized` 只由**用户确认**产生

- 用户选「整页」⇒ 面板记录本回合 `authorized=true` ⇒ `scopeReading` 对后续越界写返回 **`out-of-scope-authorized`**（放行），并**入留痕**（FR-SGO-061）。
- **AI 不得自判 / 自填 `authorized`**（FR-SGO-026 / R-SGO-907）：`authorized` 只由面板的**真实用户点击**（既有 ask 卡选项）写入；SW / AI 路径**无**写入面。
- 反证：注入「AI 自填 authorized = true」⇒ 必红。

### 3. 拒绝 / 取消后零死端（FR-SGO-062 / EC-SGO-006）

- 选「仅引用范围内」或取消 ⇒ 越界写**被拒绝**（fail-closed）+ 可读理由 + **可达 next**（回到引用范围内任务 / 取消整轮）。
- **不形成死端**：`test/ui/no-dead-end.mjs`（49）**只增**且必绿；反证「拒绝后无下一步 ⇒ 必红」。
- **不跳走**：零视图切换（不打开设置页 / `options` 代偿）（NFR-SGO-012）。

### 4. 留痕与审计（FR-SGO-081）

- 范围行（ADR-SGO-002 §5 单源）：`scope.reading=out-of-scope-authorized | scope.authorized=user`。
- 审计：`{scopeReading:'out-of-scope-authorized', scopeAuthorized:'user'}`（enum + actor；**零用户内容值**）。
- 扩围事实**可判**（FR-SGO-081）：留痕 / 审计可读出「本次越界已获征询批准」。

### 5. 与批量的关系（叶2 交付）

- 二择卡与批量计划的**耦合处**落地：批量计划本身若**全部 in-scope** ⇒ 不出二择；若含越界条目 ⇒ 越界条目不进计划（ADR-SGO-004 §1）、走二择后再逐条 / 重出计划。
- 叶1 先交付**读数 + 转值底座**（越界写 fail-closed 拦 + 可达 next）；叶2 交付**二择卡接线**（正向路径）。两叶**串行**（`dependsOn` 链）。

### 6. 与 X-SGO-6 的关系（**不新增终态字面量**）

- 二择与读数**不**新增流终态（`STREAM_TERMINALS` 6）/ 驱动者终态（`DRIVER_TERMINALS` 4）字面量；`BLOCKED_TERMINALS` 不动。
- 承父 spec §12：X-SGO-6 = **「以读数承载、未扩张」**（如实登记，不制造假条目）；若 plan 证不可行才登记词汇扩张——**本计划证：可行（读数 + 既有 ask 卡承载）**。

## 后果

**正面**
- 扩大范围有**正向路径**而非硬禁止（Q-SGO-011 过度约束反风险被消除）。
- 用户确认 = **范围扩张的可判事实**（入留痕 / 审计）⇒ 事后可判。
- 拒绝后零死端（法七不退化）。

**负面 / 代价**
- 面板需在越界写时**先问再写**（多一次交互）—— 但这正是「把范围判断还给用户」的题眼；计划内批量已把交互次数降到一次。
- 二择卡的选项文案 / 触发时机的**体感**属人工面（S0′ M1 / M4），`⏳ 未执行`，不冒充 PASS。

**被否决的替代**
- **硬禁止越界**（NG-SGO-015）：正当全页任务被卡。
- **默认整页 / AI 自答**（R-SGO-907）：consent 红线被侵蚀。
- **直接执行写越界留痕**（DC-SGO-006 ② 未采纳）：先斩后奏，用户无否决点。

**判据锚**：`test/ui/no-dead-end.mjs`（49 只增）· `test/law9-scope-reading.test.ts`（转值 + 拦）· `test/batch-consent.test.ts`（叶2 批量耦合）· 留痕逐行断言。
