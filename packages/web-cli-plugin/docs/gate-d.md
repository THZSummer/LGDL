# Gate-D 条件清单：内置助手下线门槛（FR-037 / FR-038 / FR-040，ADR-008）

> **文档定位**: 定义「插件达到何种能力/安全/迁移条件方可下线内置助手代码」的**逐条可验收**门槛。
> **硬约束**: 条件未全达标 → **不得下线**（保持内置助手，EC-016「不静默进入无 AI 可用状态」）。
> **执行纪律**: 下线为单提交（可 `git revert`）；执行顺序 = 先回退预案（D-6）→ 再下线。

## 0. 使用方式

每条条件包含：**验收项 / 验收方法（命令或证据锚点）/ 通过标准**。验收时逐条记录 `PASS / FAIL / 降级`，任一 FAIL 即不得执行下线。

## 1. 条件清单（D-1 ~ D-7）

### D-1 能力对齐矩阵达标（最小能力集全部由插件覆盖）

| 项 | 内容 |
|----|------|
| 验收项 | `docs/capability-matrix.md` 的最小能力集每一项均标注「插件覆盖」 |
| 验收方法 | 打开 `docs/capability-matrix.md`，核对「最小能力集」表中每行归属=对齐/替代；`grep -n "最小能力集" docs/capability-matrix.md` |
| 通过标准 | 最小能力集 100% 有插件覆盖归属；无「后置/不适用」项落在最小集内 |
| 关联 | FR-022 / FR-042 |

### D-2 安全基线全达标（授权 / 二次确认 / 审计 / fail-closed / 脱敏）

| 项 | 内容 |
|----|------|
| 验收项 | per-origin 授权、危险档位二次确认、全量审计、fail-closed、零敏感明文 |
| 验收方法 | `npm run test --workspace @lgdl/web-cli-plugin`（security/host/content 用例）；红线 grep（无静默 allow / 无旁路 / 无明文） |
| 通过标准 | 单测全绿；`silentAllow`/旁路 grep 0 命中；审计覆盖发现/授权/确认/执行 |
| 关联 | FR-023~028 / NFR-001 / NFR-003 |

### D-3 LGDL 端到端闭环通过（站点协议暴露点）

| 项 | 内容 |
|----|------|
| 验收项 | LGDL 站点被插件发现 → 授权 → 工具面组装 → RPC 执行（图内容命令）→ 写回 |
| 验收方法 | `npm run test --workspace @lgdl/lgdl-web`（web-cli-host 单测）+ `docs/smoke-checklist.md` 人工面 H6 |
| 通过标准 | node 面全绿；人工面 H6 实测编辑器内容更新、既有功能零回归 |
| 关联 | FR-041 / FR-042 / AC-009 |

### D-4 通用站点端到端通过（非专用 fixture）

| 项 | 内容 |
|----|------|
| 验收项 | 非专用站点（fixture / 通用站点）完整闭环：发现→声明→授权→执行→审计 |
| 验收方法 | `npm run test --workspace @lgdl/web-cli-plugin`（`test/e2e.generality.test.ts` + `test/fixtures/site/`） |
| 通过标准 | 全链通过；双份工具面冲突检测无双重执行/重复注册 |
| 关联 | FR-043 / FR-004 / AC-010 |

### D-5 存量迁移路径可用（不自动迁移 + 手动重配）

| 项 | 内容 |
|----|------|
| 验收项 | `docs/migration.md` 存在且完整：不自动迁移原则、差异清单、手动重配指引、使用习惯对照 |
| 验收方法 | `ls docs/migration.md`；核对差异清单/重配步骤；grep 断言无自动迁移代码（不读写 `lgdl-ai-settings`） |
| 通过标准 | 指引可被存量用户独立执行；不阻断迁移期使用 |
| 关联 | FR-036 / FR-039 / S-015 |

### D-6 回退预案就绪（可 revert + 临时 flag 默认 off）

| 项 | 内容 |
|----|------|
| 验收项 | 下线为单提交（可 `git revert`）；临时入口 `VITE_AI_ASSISTANT_FALLBACK` 默认 off；显式移除时点 |
| 验收方法 | `docs/migration.md` §5.4；`grep -n "VITE_AI_ASSISTANT_FALLBACK" docs/migration.md`；确认 flag 默认关闭 |
| 通过标准 | 回退路径可执行；flag 默认 off；终止时点明确（避免长期双份并存） |
| 关联 | FR-038 / FR-040 |

### D-7 过渡期收敛计划（起止条件 + 终止时点）

| 项 | 内容 |
|----|------|
| 验收项 | 过渡期起止条件、双份维护成本/收敛计划、差异文档化 |
| 验收方法 | `docs/migration.md` §5（起止条件 / 收敛计划表 C-1~C-5 / 终止时点）；`docs/compliance.md` 不适用清单 |
| 通过标准 | 收敛计划有明确时点；不承诺长期双份并存 |
| 关联 | FR-040 / R-007 |

## 2. 验收记录（TASK-016 执行，2026-09-12）

| 条件 | 结论（PASS/FAIL/降级） | 证据（file:line / 命令输出） | 验收时间 |
|------|:---------------------:|------------------------------|----------|
| D-1 | **PASS** | `docs/capability-matrix.md` §2：最小能力集 8/8 均由 P0（6）+ P1/TASK-013（2）承载，无「后置/不适用」落在最小集内；`npm run test --workspace @lgdl/web-cli-plugin` = 112 pass / 0 fail | 2026-09-12 |
| D-2 | **PASS** | `npm run test --workspace @lgdl/web-cli-plugin` = 112 pass / 0 fail（security/host/content/sidepanel 用例）；红线 grep：`silentAllow|allowSilently` 0 命中、`\.executor\(` 0 命中（全部经 dispatch）；审计覆盖发现/授权/确认/执行/版本（`test/security.test.ts`） | 2026-09-12 |
| D-3 | **PASS（自动化面）/ ⏳ 人工面 H6 待执行（已文档化非阻塞）** | `npm run test --workspace @lgdl/lgdl-web` = 31 pass / 0 fail（web-cli-host 12：声明/dispatch/写回校验/onApply 恰好一次/隔离/事件代理）；`npm run test:e2e` 场景 B（LGDL Workbench 真实 dist）全链 PASS：发现→授权→`site.lgdl-web-cli` 读→审计 7 事件。人工面 H6（真实页写回 + 既有功能零回归）见 `docs/smoke-checklist.md` §2，为已文档化非阻塞人工项 | 2026-09-12 |
| D-4 | **PASS** | `test/e2e.generality.test.ts` 全绿 + `npm run test:e2e` 场景 A（非 LGDL fixture）全链 PASS（发现→声明→授权→写确认门禁→再现→审计 11 事件）；冲突检测：`host.test.ts` re-activation 不重复注册 | 2026-09-12 |
| D-5 | **PASS** | `packages/web-cli-plugin/docs/migration.md` 存在且含不自动迁移原则/差异清单/手动重配指引/使用习惯对照；grep 断言：插件 `src/` 无 `lgdl-ai-settings`（0 命中）、`src/llm` 无 `localStorage`（0 命中），`test/llm.test.ts` AC-007 用例通过 | 2026-09-12 |
| D-6 | **PASS** | `docs/migration.md` §5.4；flag 落地 `packages/lgdl-web/src/fallback-flag.ts`（`=== 'on'`，默认 off）+ `src/vite-env.d.ts`；无 `.env*` 设值（默认 off）；主回退 = 单提交 `git revert`；C-4 显式移除时点 | 2026-09-12 |
| D-7 | **PASS** | `docs/migration.md` §5.1 起止/关闭时点 + §5.3 收敛计划 C-1~C-5（含执行状态）+ §5.5 下线执行记录；不承诺长期双份并存 | 2026-09-12 |

> **判定**：D-1、D-2、D-4~D-7 达标；**D-3 = PASS（自动化面）/ ⏳ 人工面 H6 待执行**（已文档化非阻塞人工项，依 TASK-016 指令口径不阻塞；**未记为整体达标/PASS**）。据此**执行下线**（2026-09-12）。详见 `build.md §12` 与 `docs/migration.md §5.5`。

> 除已文档化非阻塞人工项（D-3 人工面 H6）外，条件全部 PASS 方可执行 TASK-016 下线；任一 FAIL/降级 → **不下线**（内置助手保留）。

## 3. 未达门槛的处置（EC-016）

- 保持内置助手可用，**不静默进入无 AI 可用状态**。
- 记录 FAIL 项与原因，回到对应 P1/P2 任务补齐后复审。
- Gate-D 为独立里程碑，不并入任何波次首版交付（ADR-010）。

## 4. 变更记录

| 版本 | 说明 |
|------|------|
| 1.0 | 首版：D-1~D-7 逐条可验收 + 验收记录模板 + 未达门槛处置。 |
| 1.1 | TASK-016（2026-09-12）：§2 填入实际验收记录（D-1~D-7；D-3 自动化面 PASS + 人工面 H6 已文档化非阻塞）+ 判定与下线执行锚点。 |
