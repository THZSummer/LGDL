# 审查报告：specs-tree-v4-3-ask-auth-inflow

> **文档定位**: SDDU 审查策略 — 指导 review Agent 执行自主审查的清单和方法；审查结果见 `review-report.md`（R1）
> **前置依赖**: 本叶 `spec.md` v1.0（FR-CHAT-040~049 / AC-CHAT-003·005·014·015·016·021·023·025）、本叶 `plan.md` v1.0（ADR-V4-030~034）、本叶 `tasks.md` v1.1（HO-1/HO-2 + 11 任务）、本叶 `build.md` v2.0、父 `../spec.md` §5.5 / §8.3 / §10、`docs/v4-supersession-ledger.json`、`docs/v4-density-baseline.json`、v4-2 `review-report.md`（审查标准先例）
> **创建人**: SDDU Review Agent
> **创建时间**: 2026-09-19
> **版本**: v1.0
> **更新人**: SDDU Review Agent
> **更新时间**: 2026-09-19
> **更新说明**: 初始创建（策略与报告分离，ADR-004 步骤 1）：定义 **C1~C13** 审查清单（含 FR→Cx 覆盖矩阵 + 判据 + 四维度分布）。遵循用户指令「一次产出双文件」，本策略与 R1 报告同轮产出；`files.review` / `files.reviewReport` 的登记在报告 §9 提醒。

---

## 1. 审查概要（策略侧）

| 维度 | 数值 |
|------|:--:|
| 被审产物 | 6（本叶 spec/plan/tasks/build/state/TREE + 父 spec·plan 相关章节） |
| 被审 diff | `git diff 0f8a1fb..1fb26bb -- packages/web-cli-plugin` ⇒ **30 文件**（R1 `b58a52d`+`3eea886` + R2 `1fb26bb`）；生产代码 **5 NEW + 7 MODIFY + 1 RETIRE**；测试 **2 NEW + 14 MODIFY**；`docs/**` 2 台账；`package.json` 1 |
| 审查清单条数 | **C1~C13**（用户指定 8 个焦点面 + 补足代码质量/测试质量/AC 三个维度面） |
| 维度覆盖 | 代码质量（C1 局部 · C9 · C13）· 规范符合性（C1 · C3 · C5 · C6 · C8）· 架构一致性（C4 · C7 · C9 · C11）· 测试质量（C5 · C10 · C12） |
| FR 覆盖 | 本叶承载父 FR-CHAT-040~049 共 **10 项，逐项 ≥1 个 Cx**（见 §2.1） |
| 质量门槛校验 | FR 10 项 ≤ Cx 13 条 ✅ · 4 维度各 ≥1 条 ✅ · 无「不适用」项（本叶全部可静态审查） |

**审查方式**：静态分析（阅读 + 只读复核）为主，**并用只读复跑与最小复现脚本验证怀疑点**。工具：`git diff/numstat/log`、`sha256/stat`、`grep`、`python3`（JSON/字节/集合独立复算）、**复跑既有门禁**（`npm test`、`test:supersession`、`test:gate-integrity`、`test:design-contract`、`npx tsc --noEmit`）、**只读复现脚本**（`/tmp/opencode/v43-review/repro{1,2}.mjs`，驱动真实 `dist-test` 的 reducer + 投影 + 卡文案函数，不写入仓库）。**未修改任何源码/测试/文档**。

**本轮重点打假面**（对「终态可被绕过」「明文泄漏」两个安全语义保持最高怀疑）：

| P | 主题 | 映射 Cx |
|---|------|--------|
| P1 | 六终态 × 竞态（回答后超时 / 取代后再取代 / 批准后取消 / 回合结束 / 会话切换）是否有漏路径与**越界终态** | C1 |
| P2 | `MAX_OPEN_ASKS=2` 边界：第三张 supersede 哪张、两张同开是否产生重复 id 与错位操作 | C2 |
| P3 | 固化卡是否**结构性**不可再操作（表单移除 / 零控件 / `data-*` 冻结 / 后续事件不得改写） | C3 |
| P4 | 「独占决策槽移除」是否真兑现（宿主清零 / 流内唯一交互面 / L0 残留面是否登记） | C4 |
| P5 | 超时·取消·取代三条留痕的**因果真实性**（reason 是否被张冠李戴） | C5 |
| P6 | 零明文三层（渲染 / 生成侧工厂 / 摘要白名单）是否层数如声明，`digestEntryOf` 是否真不读 `answer` | C6 |
| P7 | auth 卡：批准能否被伪造、`cancelled` 终态的文案映射、审计入口是否真可达、后果预演是否含页面文本 | C7 |
| P8 | busy/回合语义（`pending` 解耦、无「永远处理中」）是否有产品消费点而非纸面 | C8 |
| P9 | 退役完整性（`decision-card.ts` 零残留 / `rounds[]` 事件派生）与「已答历史含改选」是否保住 | C9 |
| P10 | 测试与门禁是否覆盖真实新语义（含反向用例可 FAIL）、有无「因错而绿」 | C10 · C12 |
| P11 | 台账（71 entries / leafBases[1] 72 行 / 9 换锚）与体积五要素是否逐条可机核 | C11 |
| P12 | 门禁账 21+1 项、红线（content.js / pick-layer.js / 判定链 / manifest）独立复核 | C12 |
| P13 | 代码质量：职责单一、错误处理、死码与注释失真 | C13 |

---

## 2. 自主审查清单（C1~C13）

**审查对象来源**：
- `spec.md`：FR-CHAT-040~049 / NFR-CHAT-001·004·005·009·010·012 / EC-CHAT-001·002·003·009·013 → 逐项核验实现完整性与正确性
- `plan.md`：ADR-V4-030~034 + §2 状态机图 + §5 文件影响 + §6 风险表 → 架构遵循性检查
- `build.md` v2.0：终态事件表 / 文件变更清单 / HO-1 裁决 / HO-2 复算 / 门禁账 → 覆盖完整性与声明真实性
- `src/**` + `test/**`：源码与测试 → 代码质量与测试质量检查
- `docs/v4-supersession-ledger.json` + `docs/v4-density-baseline.json`：取代登记与体积 → 台账治理

### 2.1 FR → Cx 覆盖矩阵（质量门槛：每个 FR ≥ 1 个 Cx）

| 父 FR | 本叶切片 | 覆盖 Cx |
|-------|---------|--------|
| FR-CHAT-040 | ask-user 迁入流内卡；独占槽移除 | C4 · C2 |
| FR-CHAT-041 | ask 卡操作前/后固化 | C3 · C1 |
| FR-CHAT-042 | 不可二次回答；取消留痕 | C1 · C3 · C5 |
| FR-CHAT-043 | 60 s 超时 → canceled 留痕 | C5 · C1 |
| FR-CHAT-044 | `supersededAsk` 升级为「取消 + 留痕」 | C1 · C5 · C2 |
| FR-CHAT-045 | `confirm` 迁入 auth 卡；批准/拒绝固化 | C7 · C3 |
| FR-CHAT-046 | auth 卡范围/后果预演 + 审计入口；不可重复决策 | C7 |
| FR-CHAT-047 | 授权记录流内可回看 + 与审计视图分工 | C7 · C9 |
| FR-CHAT-048 | busy / 回合语义规则 | C8 · C2 |
| FR-CHAT-049 | 流内留痕零明文边界 | C6 |
| NFR-CHAT-001 / 004 / 005 / 009 / 010 / 012 | 留痕完备 / 固化态可达性 / 安全零明文 / 门禁纪律 / 设计契约 / 持久化边界 | C5 · C3 · C6 · C12 · C12 · C6 |
| EC-CHAT-001 / 002 / 003 / 009 / 013 | 超时 / 拾取交错 / 会话切换 / 固化态可达性 / 叶内无法完成的显式登记 | C5 · C1 · C1 · C3 · C11 |

### 2.2 清单

| # | 审查对象 | 审查基准 | 审查维度 | 审查方法 |
|---|---------|---------|---------|---------|
| C1 | **终态机正确性**（六终态 × 竞态；越界终态；终态冻结） | FR-CHAT-041/042/043/044 · ADR-V4-030 §2/§4 · EC-CHAT-001/002/003 | 规范符合性 | 逐 case 走查 `chat-state.ts#streamBranch` + `stream-model.ts#project/arbitrate/closeOpenAsks`；用 `dist-test` 真实 reducer 跑场景矩阵（回答后超时 / 取代后再取代 / 批准后取消 / 回合结束 / 会话切换） |
| C2 | **未终态卡仲裁与上限**（`MAX_OPEN_ASKS=2` / ref 优先 / 最旧 supersede / 同开两卡的 DOM 身份） | FR-CHAT-044/048 · ADR-V4-032 §1~§3/§8 | 规范符合性 | 读 `arbitrateOpenAsks` 边界（open=1/2/3、ref/非 ref）；查 `data-card-key` 与 legacy id 唯一性；grep 全部 `getElementById('ask*')` 读取方 |
| C3 | **固化不可逆与零控件**（结构性不可二次 / `data-*` 冻结 / 可达性） | FR-CHAT-041/042 · AC-CHAT-003/005 · shim C5~C10 | 规范符合性 | 读 `cards/askuser.ts#patchAskuserCard`/`buildTerminal` + `cards/index.ts#patchCardNode` + `stream-render.ts` 冻结分支；断言面 vs 结构面区分 |
| C4 | **承载层内化**（独占槽退役 / 宿主清零 / 残留面登记） | FR-CHAT-040 · ADR-V4-030 §4/§6/§7 · HO-2 | 架构一致性 | `index.html` id 与 `data-transitional-host` 计数实核；L0/L1 残留交互面的**归属登记**是否显式（不得当缺陷误判） |
| C5 | **留痕因果与文案单源**（user/timeout/superseded 三条 × 卡内 + 系统行） | FR-CHAT-042/043/044 · ADR-V4-031 §2/§3 · NFR-CHAT-001 | 规范符合性 | 读 `ASK_COPY` 单源与 `cancelSystemLine`；逐条核对触发点；检查 reason 是否会被张冠李戴 |
| C6 | **零明文三层**（渲染 / 生成侧工厂 / 摘要白名单） | FR-CHAT-049 · ADR-V4-034 · AC-CHAT-021 · NFR-CHAT-005/012 | 规范符合性 | `digestEntryOf` 字段读取面静态证明；`label`/`STREAM_FIELD_WHITELIST`/`assertStreamCopySafe` 调用点穷举；反向用例（URL query / 命令参数体 / 密钥 / 标记） |
| C7 | **auth 卡安全面**（伪造批准 / 越界终态文案 / 审计入口可达 / 后果预演） | FR-CHAT-045/046/047 · AC-CHAT-016 · ADR-V4-033/034 | 架构一致性 | 事件仲裁路径穷举（能否不走真实交互触发 approved）；`authFixedText`/`decisionState` 全终态枚举；`patchAuthCard` 的 deps 透传；预演的数据来源 |
| C8 | **回合语义**（`pending` 门控边界 / 无「永远处理中」/ 会话切换） | FR-CHAT-048 · ADR-V4-032 §4~§7 · AC-CHAT-014 | 规范符合性 | `askFlowView` 的**消费点**穷举（有无产品消费者）；`pending` 真→假 的所有到达路径；`turnStuck` 语义自洽性 |
| C9 | **退役完整性**（`decision-card.ts` 零残留 / `rounds[]` 派生等价 / 已答历史含改选） | ADR-V4-030 §7/§8 · build TASK-707 · FR-CHAT-047 | 架构一致性 | 全仓 grep 退役符号；`l1/panels.ts#observe` 的答案来源链（谁写 `pendingAnswer`）与生产路径逐段对照 |
| C10 | **测试质量**（新语义覆盖 / 边界与错误场景 / 断言有效性 / 反向可 FAIL） | NFR-CHAT-009 · AC-CHAT-023 · build §5 | 测试质量 | 逐条比对「新增/变更语义 ↔ 门禁断言」；找**无门禁覆盖**的语义面；检查断言是否含「因错而绿」形态 |
| C11 | **台账与体积**（71 entries / leafBases[1] / 9 换锚 / 五要素 / 抽样口径） | 父 §10 取代台账纪律 · build §4/§5/§7 | 架构一致性 | `python3` 独立复算：oldTitle 逐字命中率 / newTitle 可定位率 / count==清单长度 / 叶段删除行 vs `git diff --numstat` 逐文件对账；体积五要素与 `dist` 实测对账 |
| C12 | **门禁账与红线 + AC 证据** | AC-CHAT-021/023/025 · NFR-CHAT-005/009/010 · 父 D6 | 测试质量 | 22 行门禁账逐项抽样复跑；`git diff --stat` 红线文件零 diff；AC 逐条映射到可执行证据（无证据者标偏差） |
| C13 | **代码质量**（职责单一 / 错误处理 / 死码 / 注释失真） | 项目宪法 · build §2 | 代码质量 | 阅读新增/重写模块；穷举导出符号的调用点；核对注释/ADR 声明与实现的字面一致性 |

---

## 3. 判据与纪律（策略侧约定）

1. **证据优先**：每条结论必须落到 `file:line` 或可复跑命令/脚本输出；无证据的推断一律降级为「未能验证」。
2. **真实缺陷优先**：不以「门禁全绿」替代实现审查；门禁盲区（漏测语义）与实现缺陷分别记账。
3. **不做形态误判**：先确认「这是设计意图（已登记）」还是「缺陷」——例如 L0/L1 残留交互面若属 v4-4 退役范围且已被计数门禁登记，则不判缺陷，只在报告中显式说明归属。
4. **安全面最高怀疑**：① 终态能否被绕过（假终态 / 假批准 / 二次操作）；② 明文能否泄漏（渲染、系统行、摘要、label、预演）。
5. **只读复跑**：允许跑单条既有门禁与最小复现脚本；不改代码、不改测试、不改台账、不修 `state.json` 的他人字段。
6. **结论口径**：`✅ 通过 / ⚠️ 有条件通过 / ❌ 不通过`；阻塞项记 `BLOCK-xx`，改进项记 `I-xx`，不阻塞但需登记的归属记「观察项」。

## 4. 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建（策略与报告分离：C1~C13 清单 + FR→Cx 矩阵 + 12 个打假面 + 判据纪律；与 R1 报告同轮产出） | 2026-09-19 | SDDU Review Agent |
