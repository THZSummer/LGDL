# 验证策略（validate.md）：specs-tree-ian-1-free-input-next

> **文档定位**: SDDU 验证策略 — 指导 validate Agent 执行**动手验证**的 V1~V8 场景矩阵与五维度方法；验证结果见 `validate-report.md`
> **前置依赖**: `spec.md`（v1.0 · 268 行）· `plan.md`（v1.0）· `tasks.md` / `tasks.json`（v1.0 · 27 任务 / 3 波）· `build.md`（v2.0 · R1+R2 叶1 收口）· `review.md`（v1.0 C1~C26）+ `review-report.md`（v1.0 R1 · **✅ 0 BLOCK / 3 I / 2 O**）· 父 `../spec.md` + `../plan.md`（ADR-IAN-001/002/003/008/009/010）
> **验证对象范围**: 叶1 = `feature/web-cli-plugin` @ **`537813d`**（R1 `e76f455` + R2 `2aa58ab`；27/27）
> **创建人**: SDDU Validate Agent
> **创建时间**: 2026-09-25
> **版本**: v1.0
> **更新人**: SDDU Validate Agent
> **更新时间**: 2026-09-25
> **更新说明**: 初始创建（叶1 流内自由输入 next 通道的 V1~V8 验证场景矩阵；覆盖 S0''-A 双面独立复刻 / R6 迁移行为级（含 review I-03）/ 提交通道 / 卡内输入安全 / 门禁全量 + 注入抽验 / 红线·体积终核 / 漂移检测；AC 逐条映射）

---

## 1. 验证概要（策略）

| 维度 | 策略 |
|------|------|
| Feature 类型 | **代码类**（16 个 `src/**` 切片 + 17 个 `test/**` + 3 个 `docs/**`）⇒ **五维度全覆盖** |
| 验证项总数 | **8**（V1~V8） |
| FR 覆盖策略 | spec §4 九组 FR 切片（GOV / FIM / CHAN / R6Q / CONV / S0'' / SUPERSEDE / GATE / VOL）逐组 ≥1 Vx |
| 维度覆盖策略 | 测试覆盖（V1/V2/V6）· 接口/数据（V4/V5/V7）· 构建（V6）· 性能/边界（V3/V5/V7）· 漂移（V8） |
| 注入抽验 | ≥2 处（requestId 共用退化 / `requestTurn(` 直连退化），逐字节还原 |
| 人工面 | M1 / M2 / M5 显式「⏳ 未执行」（禁冒充 PASS） |

## 2. 自主验证场景（V1~V8）

**验证对象来源**：
- `spec.md` §4（FR 切片）/ §5（NFR）/ §6（EC）/ §7（AC）→ 逐组验证
- `build.md` §2 文件变更清单 / §4 门禁对账 / §5 体积五要素 / §6 偏差登记 → 覆盖完整性 + 诚实性
- `review-report.md` §5（I-01~I-03）+ 附录 D（O-01/O-02）→ 行为级缺口补验与处置
- `src/**` + `test/**` + `dist/**` → 动态执行与亲核

| # | 验证对象 | 验证步骤 | 预期结果 | 验证维度 | 验证方法 |
|---|---------|---------|---------|---------|---------|
| **V1** | S0''-A 中间态 **node 面**（TASK-IAN-123）：新入口真管线 + 旧入口接线 + 双回填源码切片 + 反证族 | 1. `npm test`（含 `s0-self-driven-chain`）；2. 取 S0PP-A 正读 / 反证族 / 真源切片三用例；3. 核 `S0PP_A` 判据数与非恒真 | 3 用例全绿；反证族「破坏旧入口 / 回填覆盖非空 / 在飞禁用终端 / 撞红线」逐条判红后还原 | 测试覆盖 | 自动化（node 门禁） |
| **V2** | S0''-A 中间态 **Chromium 面**（TASK-IAN-124）：真面板双入口各跑通一轮 + 双回填互不覆盖 + 样本单源 | 1. `npm run test:s0-self-driven`；2. 逐条核 S0C-12（点末端项→获焦→真键入→真提交→旧 `#composer` 可用→双回填）；3. 核样本单源（`s0-chain.mjs`）与人工面 ⏳ | 81/0；S0C-12 全绿；R2 零新增样本文件；M1/M2/M5 = ⏳ | 测试覆盖 | 自动化（Chromium 真面板） |
| **V3** | **R6 迁移行为级**（含 review **I-03**）：在飞 pending 点终端 ⇒ `queued`；空提交 ⇒ notice 非静默；双回填三分支；在飞终端不被压制 | 1. 自研行为级探针（真 DOM + 真 reducer + 真生产消息处理器）；2. `setPending(true)` ⇒ 判别 chips disabled ∧ 终端 enabled；3. 点终端→获焦；4. 真键入+真提交→user 行 + 真 `chat` 派出 + SW `queued` ⇒ 可读行；5. 空提交→notice 且零 user 行；6. busy-rejected 三载体分支；7. Enter/Escape | V-B1~V-B6 全绿；`queued` 可读行上屏；空提交非静默；双载体互不覆盖 | 测试覆盖 + 性能边界（EC） | 手动/脚本（`ian1-behavior.mjs`） |
| **V4** | **提交通道行为级**：经 `op.turn` 槽（`requestTurn(` 恰 2）· driver=manual 与 AI 留痕两值可判 · 让位语义槽外 | 1. 亲数 `requestTurn(` 调用点；2. `op-wiring` 14/0 复跑；3. `FIN-3` / `FIN-4` / `FIN-5` 判据 + 反证；4. 行为级断言手输留痕含 `driver=manual`；5. `MANUAL_DRIVER_ID ∉ listDriverDecls()` | `requestTurn(` == 2；集 B 分发入口 == 1；`manual` ∉ 11 声明 id；`noteUserTurn` 在 `requestTurn` 体外 | 接口/数据 + 测试覆盖 | 自动化（node）+ 脚本（行为） |
| **V5** | **卡内输入安全**：独立 requestId（共用必红注入复验）· 法八零明文含 ⑩ · a11y Enter/Escape/focus | 1. 注入 A：`FREE_INPUT_REQUEST_ID → 'ref-describe'` ⇒ FIN-0/FIN-8 必红后还原；2. `test:law8` 60/0（含 ⑩ 自由输入零明文面）；3. `FIN-8` 真源切片 + 哨兵；4. 行为级 Enter/Escape/focus | 注入 A：FIN 20/2（FIN-0 + FIN-8 红）；law8 60/0；a11y 三态行为级全绿 | 接口/数据 + 性能边界（EC/安全） | 注入（临时改写 + 还原）+ 自动化 |
| **V6** | **门禁全量亲跑 + 注入抽验**：node 基线 1431 · Chromium 全量 · 对账骨架 | 1. `npm test`（基线 1431）；2. Chromium 串行（s0/law8/journey/binding/recommendation/dead-end/density/insight/hardening/l0/l1/l2/auth-chip/zero-injection/page-input/e2e）；3. `gate-integrity` 23 + `supersession` 45 + `op-wiring` 14 + size 三件套 47（skipped=0）；4. 注入 B：`submitFreeInput` 直连 `requestTurn(` ⇒ FIN-3 / op-wiring 必红后还原 | 1431/0 ×2（注入前/还原后）；全量 Chromium 保段；注入 B：FIN 20/2 + OPW 8/6 | 测试覆盖 + 构建 | 自动化 |
| **V7** | **红线 / 体积 / 冻结面终核**：三冻结面 sha · base/判定链零 diff · KIND_SET 40 · 12 kind · 特权手势 · 体积五要素 · 越叶预算诚实性 | 1. `sha256` / `stat` 亲测三冻结面；2. `git diff` 核 base/manifest/turn-queue/SW 零 diff；3. 探针读 `KIND_SET` / 12 kind / 零宿主 / `ACT_TO_OP` 6 / 集 A 9 / 特权 tier；4. 体积五要素同源 + EC-IAN-016 三档；5. 越叶预算登记诚实性 | content 177,076/`52a82620…` · pick-layer 34,358/`77796bab…` 逐字节不变；`KIND_SET` 40 · 12 kind · 零宿主；`ACT_TO_OP` 6 / 集 A 9（`free-input` 不在表）；特权恒 `gesture`；599,125 / 629,081 / 614,400 / 675,840 / `pending-author-line` | 接口/数据 + 性能边界 | 脚本（`ian1-probe.mjs`）+ 命令亲测 |
| **V8** | **漂移与孤立代码检测 + AC 映射 / I·O 处置** | 1. `git diff` spec/plan 零 drift；2. 新增文件只 `test/free-input-next.test.ts`（R2 零新增）；3. FR 逐条映射 Vx（无需求缺失 / 无孤立代码）；4. review I-01~I-03 / O-01~O-02 处置 | spec/plan 零 diff；R2 零新增文件；9 组 FR 全映射；3 I → 1 闭环 + 2 登记 N；2 O → 登记 N | 漂移检测 | 脚本 + 人工比对 |

## 3. AC 逐条映射（spec §7）

| 父 AC | 本叶判据 | 对应 Vx | 判据来源 |
|---|---|:--:|---|
| **AC-IAN-001** | S0''-A 中间态（双入口均可提交） | **V1 / V2** | S0PP-A node + S0C-12 Chromium |
| **AC-IAN-002** | 流内「自由输入…」next 面（存在 / 最末 / 卡内展开 / 不常驻 / 零死端） | **V1 / V2 / V6** | `recommendation ⑰` + S0C-12 + `dead-end 53` + FIN-1/2 |
| **AC-IAN-003** | 流内提交经 `op.turn` 槽（唯一通道） | **V4** | `FIN-3` + `op-wiring 14` |
| **AC-IAN-004** | 手输 ≠ AI 驱动（两值可判 + 注入必红 + 让位语义） | **V4 / V5** | `FIN-4/5` + 行为级 `driver=manual` |
| **AC-IAN-006** | 四处兜底入口只展开卡内（流内载体内接线） | **V1 / V2** | `handleCardAction('free-input')` 单路 `openFreeInputCard` + S0C-12 |
| **AC-IAN-007 / 017** | R6 零回归（双入口 + 流内回填 + 不覆盖） | **V3 / V6** | 行为级 V-B1~V-B5 + `TA-8` + `dead-end 53` |
| **AC-IAN-009** | 零新增载体 | **V7** | 探针 `KIND_SET` 40 / 12 kind / 零宿主 |
| **AC-IAN-014** | a11y focus（叶1 侧） | **V3 / V5** | S0C-12 + 行为级 focus/Enter/Escape |
| **AC-IAN-016** | 法八四面零明文 | **V5** | `law8 60/0`（含 ⑩）+ `FIN-8` |
| **AC-IAN-018~023** | 门禁治理（只增 / 反证 / 新增门禁 / 串行） | **V6** | `npm test 1431` + `gate-integrity 23` + `supersession 45` |
| **AC-IAN-024~025** | 冻结面零容差 / 分列预算 | **V7** | sha 双锚 + 体积五要素 |
| **AC-IAN-027** | 人工面如实登记 | **V2** | S0C-12 尾注 M1/M2/M5 = ⏳ |

## 4. 质量门槛核对

| 门槛 | 要求 | 本策略 |
|------|------|:--:|
| 每个 FR ≥ 1 Vx | 9 组 FR 全覆盖 | ✅（V1~V7） |
| 每个验证维度 ≥ 1 条 | 五维度 | ✅（测试 V1/V2/V6 · 接口 V4/V5/V7 · 构建 V6 · 性能/边界 V3/V5/V7 · 漂移 V8） |
| 无法验证项显式标注 | 人工面 / 不可合成项 | ✅（M1/M2/M5 = ⏳） |
| 注入抽验 | ≥2 | ✅（V5 注入 A + V6 注入 B） |

> 本 Feature 为代码类，无「接口数据」之外的外部系统依赖；「性能边界」维度由 EC-IAN-002/003/004/010/014/016 承载（在飞仲裁 / 空提交 / 窄视口密度 / 体积三档）。

## 5. 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建（V1~V8 验证场景矩阵；nine-group FR 覆盖 + 五维度；AC 逐条映射；注入抽验 ≥2；人工面 ⏳ 显式） | 2026-09-25 | SDDU Validate Agent |
