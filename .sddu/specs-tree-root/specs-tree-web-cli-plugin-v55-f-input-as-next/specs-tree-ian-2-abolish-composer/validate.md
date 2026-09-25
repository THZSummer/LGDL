# 验证报告（策略）：specs-tree-ian-2-abolish-composer

> **文档定位**: SDDU 验证策略 — 自主定义 V1~V12 验证场景矩阵与五维度方法论；执行结果见 `validate-report.md`
> **前置依赖**: `spec.md`（v1.0）· `review-report.md`（R2 · ⚠️ 有条件通过 · 0 BLOCK · 1 残留 I-R2-01）· `build.md`（v3.0 · 25/25）· `plan.md`（ADR-IAN-004~010）
> **创建人**: SDDU Validate Agent
> **创建时间**: 2026-09-26
> **版本**: v1.0
> **更新人**: SDDU Validate Agent
> **更新时间**: 2026-09-26
> **更新说明**: 初始创建（IAN-2 叶策略：S0''-B 双面独立复刻 / 法四三处一致行为级 / 真退役行为级 / 通道唯一化 / 重锚族 / 台账 / 门禁治理 / T220 重锚 / 保护段 / 红线体积 / I-R2-01 处置 / 注入抽验 + 人工面）

---

## 1. 验证概要（对象与范围）

> 本叶 = F-35 末叶 / 拆除叶：`#composer`/`#input`/`#send` **DOM 真退役（非 hidden）** + 法四原地修订 + 判据重锚 + 保护段决策 + 体积净负重登记。校验对象 = 生产真源（`src/**`）+ 门禁（`test/**`）+ 立法台账（`docs/v4-supersession-ledger.json` + `.sddu/.../v4-chat/spec.md`）+ 体积登记。

**Feature 类型**：**代码类**（有 `src/` 生产源码 + `test/` 门禁 + Chromium 运行时）⇒ 全五维度验证（测试覆盖 / 接口数据 / 构建 / 性能边界 / 漂移）。**本叶承载 NFR**（001~007 / 009 / 010 / 012 / 013 / 014）⇒ 性能与边界维度**适用**。

**验证对象来源**：
- `spec.md` §4（FR）/ §5（NFR）/ §6（EC）/ §7（AC）→ 逐项映射 V1~V12
- `build.md` §2 文件影响 / §5 体积五要素 → 覆盖完整性 + 体积终核
- `src/**` + `test/**` + `docs/*.json` + `.sddu/.../v4-chat/spec.md` → 真源切片与判据
- `dist/`（`sidepanel.js` 598,577 B / `content.js` / `pick-layer.js`）→ 构建产物与冻结面

> **本策略与报告同轮产出**（编排器授权单轮闭环）；报告中场景判定基于实测数据。

## 2. 自主验证场景（V1~V12）

| # | 验证对象 | 验证步骤 | 预期结果 | 验证维度 | 验证方法 |
|---|---------|---------|---------|:--:|:--:|
| **V1** | **S0''-B 终态双面**（AC-IAN-001 / 005 / 017） | ① 亲跑 Chromium `test:s0-self-driven`（三 id DOM 零命中 ∧ 注入 hidden 必红）；② 独立重实现 node 判据读 `index.html` + 注入 `<form id=composer hidden>` | ① **82/0**；② 三 id 零命中且注入必红；真源字节不变 | 测试覆盖 + 构建 + 漂移 | `npm run test:s0-self-driven` + 自主脚本 `A-*` |
| **V2** | **法四三处一致 + 台账逐字**（AC-IAN-008） | 读 `v4-chat/spec.md` `:116`/`:225`/`:385` 逐字核心句；台账 `law4InplaceRevision` old/new 逐字；in-memory 半修 :225 | 三锚逐字含核心句；old/new 逐字相符；半修必被检出且只报 :225 | 接口数据 + 测试覆盖 | 自主脚本 `B-*` |
| **V3** | **#composer 真退役行为级**（AC-IAN-005 / 006） | 生产源去注释后扫 `composer` 代码引用；四兜底入口 → `revealAskFallback` → l0 卡内链 | 零 `composer` 代码引用（仅登记册字符串）；四入口全收敛卡内 | 接口数据 + 漂移 | 自主脚本 `C-*` |
| **V4** | **通道唯一化 + R6 回填**（AC-IAN-003 / 007 / 017） | 数 `requestTurn(` 生产调用点；核 `restoreFreeInputDraft` 唯一；核 `sendDisabledReason` 禁用位不依赖 `pending`；`turn-queue.ts` 零 composer | 恰 1 提交点；回填唯一且卡内；在飞不硬禁用 | 测试覆盖 | 自主脚本 `C-*` +(`npm test` 内 TA-4/S0PP-B) |
| **V5** | **重锚族**（`#send-reason` / `sendDisabled` / draft / 引导 / a11y）（AC-IAN-011~015） | 核 `#send-reason` 保留于 statusbar 且块内无输入元素；`sendDisabled = !hasOrigin`；draft 读写 `#ask-input`；`ONBOARDING_TEXTS[4]` 改指 | 状态提示保留 ≠ 输入面；禁用仅异常态；draft/引导重锚 | 接口数据 | 自主脚本 `C-*` + review C7/C8/C14 |
| **V6** | **X-IAN-1~11 台账编号语义**（AC-IAN-010） | 亲跑 `test:supersession`（含 `xIianLedgerFull` X-IAN-1~7 ∧ `xIianLedgerLeaf2` 8~11 ∧ 并集收口反证） | 49/0；并集恰 11 条且字段齐 | 接口数据 | `npm run test:supersession` |
| **V7** | **门禁治理三态**（AC-IAN-018~023） | 亲跑 `gate-integrity`（下界只增）；核 20 行三态对账 `assertionsRemoved=0`；核 `CHROMIUM_GATES===9` | 24/0；零删除零降级；文件数不动 | 构建 + 测试覆盖 | `npm run test:gate-integrity` + 台账直读 |
| **V8** | **T220 三文件法四等价重锚**（AC-IAN-022 / 023） | 亲跑 `insight`（125）/ `l0`（251）/ `l1`（132）；核三文件不在 `zeroDiffFiles`；核 `redlineRemap`=8 | 只升不降（118→125 / 248→251 / 120→132）；`zeroDiffFiles` 9 不动 | 测试覆盖 + 漂移 | Chromium 亲跑 + 自主脚本 `E-*` |
| **V9** | **保护段逐字节**（journey 新 pin / binding keep） | 亲跑 `test:supersession` 专条 + 独立复算 `journey.mjs[43484,59347)` sha / `binding.mjs[107780,115930)` sha | journey `7b309258…`/15863B/249 行；binding `be9ad0e9…`/8150B/段内零退役 id | 漂移 + 测试覆盖 | 自主脚本 `D-*` + `test:supersession` |
| **V10** | **红线 + 体积终核**（AC-IAN-009 / 016 / 024 / 025） | 三冻结面 sha+size；`KIND_SET` 40 / 12 kind / 零宿主 / 16 册 / 13 `NEVER_FOLDABLE`；五要素 598,577 / 628,505 / 614,400 / 675,840 / pending-author-line；两叶 Σ +6,631；`law8` 60/0 | 全部达标；体积诚实登记（净负 −548，未达 A 列带如实登记，EC-IAN-016 三态皆否） | 性能边界 + 构建 | 自主脚本 `F-*` + `test:law8` |
| **V11** | **I-R2-01 counts 处置 + N-04 同源**（AC-IAN-021 / 022） | 读台账 `counts.{supersession,nodeTestRuntime}` vs 实测日志；前移 48→49 / 1441→1443 + `source.observed` 同步 + 日志重登记 | 前移后 `counts` 4/4 与门禁日志逐条相等（无 skip） | 接口数据 | 自主脚本 `G-*` + `test:supersession` |
| **V12** | **注入抽验 + 人工面登记**（AC-IAN-017 / 027） | 三处真实注入（法四半修 / `<form id=composer hidden>` / 入册移出 `#input`）⇒ 必红 ⇒ 逐字节还原；核 M3/M4 `⏳ 未执行` 不冒充 PASS | 三处必红且还原 byte-identical；人工面如实 ⏳ | 漂移 | 自主脚本 `H-*`（bash）+ 台账直读 |

> **质量门槛**：每个 AC ≥ 1 个 Vx（§4 映射表逐条对齐）；五维度各 ≥ 1 条 Vx；无法执行项仅人工面 M3/M4（显式 ⏳ + 原因），不编造数据。

## 3. 五维度方法映射

| §5.x 维度 | 落点场景 | 方法 |
|---|---|---|
| §5.1 测试覆盖 | V1 / V4 / V6 / V7 / V8 / V9 | `npm test`（1443）+ 13 组门禁 + 反证 |
| §5.2 接口与数据 | V2 / V3 / V5 / V6 / V11 | 生产真源切片 + 台账 JSON 直读 + DOM/常量判据 |
| §5.3 构建与脚本 | V1 / V7 / V10 | Chromium 真面板 + `gate-integrity` 下界 + 体积三值同源 |
| §5.4 性能与边界 | V10 | 体积五要素 + EC-IAN-016 三态 + 冻结面零容差 |
| §5.5 漂移与孤立 | V1 / V3 / V8 / V9 / V12 | 零 composer 代码引用 + 保护段逐字节 + 注入必红 + 人工面登记 |

## 4. AC 逐条映射

| AC | spec 判据 | 覆盖 Vx |
|---|---|---|
| AC-IAN-001 | S0''-B 终态 | V1 |
| AC-IAN-003 | `requestTurn(` 恰 1 | V4 |
| AC-IAN-005 | 流外零输入面 | V1 / V3 |
| AC-IAN-006 | 输入面单一化 | V3 |
| AC-IAN-007 / 017 | R6 唯一化 + TA-4 | V4 / V12 |
| AC-IAN-008 | 法四原地修订 + 门禁 | V2 / V9 |
| AC-IAN-009 | 零新增载体 | V10 |
| AC-IAN-010 | X-IAN-1~11 等价重锚 | V6 / V8 |
| AC-IAN-011 | `#send-reason` 保留 + 重锚 | V5 |
| AC-IAN-012 | `sendDisabled` 重锚 | V5 |
| AC-IAN-013 | draft 重锚 | V5 |
| AC-IAN-014 | a11y（无悬空焦点） | V5 |
| AC-IAN-015 | 首装引导改指 | V5 |
| AC-IAN-016 | 法八零明文 | V10 |
| AC-IAN-018~023 | 门禁治理终态 | V7 / V8 / V11 |
| AC-IAN-024~025 | 冻结面 / 体积净负 | V9 / V10 |
| AC-IAN-027 | 人工面如实登记 | V12 |

## 5. 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建：V1~V12 场景矩阵（S0''-B 双面 / 法四三处 / 真退役 / 唯一化 / 重锚族 / 台账 / 门禁治理 / T220 / 保护段 / 红线体积 / counts / 注入+人工面）；AC 逐条映射；五维度全覆盖 | 2026-09-26 | SDDU Validate Agent |
