# 验证策略：specs-tree-nda-1-next-tool-channel

> **文档定位**: SDDU 验证策略 — 指导 validate Agent 执行自主验证的场景和方法；验证结果见 validate-report.md
> **前置依赖**: `spec.md`（v1.0）、`plan.md`（v1.0 + ADR-NDA-101/102）、`build.md`（v1.0/1.1）、`review-report.md`（v1.0/1.1，状态：⚠️ 有条件通过 / 0 阻塞 / R1-FIX 已执行）
> **创建人**: SDDU Validate Agent
> **创建时间**: 2026-09-27
> **版本**: v1.0
> **更新人**: SDDU Validate Agent
> **更新时间**: 2026-09-27
> **更新说明**: 初始创建（V1~V18 场景矩阵；代码类 Feature 全五维度；本叶无外部 API / 数据库 ⇒ 接口维度落在「工具 schema / 载荷契约 / 台账 schema」；零运行时外部依赖 ⇒ 性能维度落在「体积上限 / 边界条件」）

---

## 1. 验证概要

| 维度 | 目标 | 说明 |
|------|------|------|
| FR 测试覆盖 | 13/13 承载组（100%） | spec §4 的 13 组父 FR 切片各组 ≥1 Vx |
| NFR 覆盖 | ≥80% | 本叶承载 NFR-NDA-001~009/011~016（NFR-NDA-010 终态属叶2，记「不适用」） |
| 构建 | 退出码 0 | `typecheck` + `build` |
| 接口/契约一致性 | 全部一致 | `next` 工具 schema / `chat-result.aiNext` 载荷 / xnDa 台账 schema |
| 漂移项 | 0 项 | 孤立代码 / 需求缺失 / 规格漂移 |
| 阻塞问题 | 0 项 | — |

**Feature 类型**: 代码类（`src/**` 生产代码 + `test/**` 门禁 + Chromium/Node 双面）→ 五维度全量验证。

**环境**: Node v24.15.0；Chromium `.pw-browsers/chromium-1234`（`test/ui/_v3-helpers.mjs` 自带 CDP 客户端，零外部依赖）。

**验证策略自主要点**（独立复跑，不采信 build/review 自报）：
1. **全门禁独立复跑**：`npm test` / `test:law8` / `test:supersession` / `test:gate-integrity` / `test:size-ruling-vol3` / `test:insight` / `test:density` / `test:dead-end` / `test:recommendation` / `test:s0-self-driven`（隔离 ≥2 + 基线对照）/ `typecheck` / `build`。
2. **I-1 修复真实性**：law8 ★NDA-1 ⑫ 三段（正控 / 负控 / 反证）各自**临时注入缺陷 ⇒ 必红 ⇒ 还原**。
3. **红线 / 保护段 / 体积**：逐字节 + sha 独立复算（不读自报数字）。
4. **漂移**：孤立代码 / 需求缺失 / spec·plan 漂移。
5. **观察项**：O-1（常量读数）/ O-3（额外 agent step 文本上流）/ O-4（KL-N-10 ≥2 复跑）/ O-6（A 列 +637 B）。

---

## 2. 自主验证场景（V1~V18）

**验证对象来源**：
- `spec.md`：§4（13 组父 FR 切片）、§5（NFR）、§6（EC）、§8.3（11 交付物）
- `plan.md`：§2.2 数据流 8 步、§4 定案表、§5 文件影响、§6 风险
- `build.md` / `review-report.md`：文件变更清单、R1-FIX 记录（**仅作对照，不作证据**）
- 产物：`packages/web-cli-plugin/{src,test,docs,dist}`

| # | 验证对象 | 验证步骤 | 预期结果 | 验证维度 | 验证方法 |
|---|---------|---------|---------|---------|---------|
| V1 | FR-NDA-082/116 + 全链回归（`npm test`） | 独立复跑 `npm test` | ≥1517 通过 / 0 失败 / rc=0；AI-N-1~15 全绿；断言零删除 | 测试覆盖 | 自动化 |
| V2 | FR-NDA-013/028 · NFR-NDA-004 · EC-NDA-022（law8 ⑫） | 复跑 `test:law8`；三段判据**注入必红**验证 | ≥69/0；正控 / 负控 / 反证各自可判红 | 测试覆盖 | 自动化 + 注入 |
| V3 | FR-NDA-110/111/114~118/121 · FR-NDA-082/116（取代台账 + `assertionsRemoved` 机核） | 复跑 `test:supersession`；`assertionsRemoved=1` 注入 | ≥55/0；注入 ⇒ 必红 | 测试覆盖 + 接口数据 | 自动化 + 注入 |
| V4 | FR-NDA-130~137/135/117（改写门禁入下界） | 复跑 `test:gate-integrity`；独立复算 `CHROMIUM_GATES` / `EXPECTED_AUDITED_FILES` | ≥27/0；9 / 48；`ai-next-candidate` 在受审集合 | 测试覆盖 + 接口数据 | 自动化 + 模块独立 import |
| V5 | FR-NDA-140~145（分列预算 / 距档 / 冻结面零容差） | 复跑 `test:size-ruling-vol3` + `npm test` 内 size-* 套件 | 全绿；三值 pin 一致 | 测试覆盖 + 性能边界 | 自动化 |
| V6 | FR-NDA-100~103/105/106 · EC-NDA-025（KL-N-10） | `test:s0-self-driven` 隔离复跑 ≥2 + `git stash` 基线对照 ≥2 | 本叶与基线**同根因**失败；node 面确定性覆盖 | 测试覆盖 + 漂移 | 自动化（隔离复跑） |
| V7 | FR-NDA-044/045 · EC-NDA-001~006（零死端 / 边界） | 复跑 `test:dead-end` / `test:insight` / `test:density` / `test:recommendation` | 全绿（flake 隔离复跑后判定） | 测试覆盖 + 性能边界 | 自动化 |
| V8 | FR-NDA-021~024 · R-NDA-905（intercept 短路永久回归） | 复跑 `npm test`（AI-N-15）；SW `intercept` 命中分支注入 `return null` | AI-N-15 绿；注入 ⇒ 必红 | 测试覆盖 + 接口数据 | 自动化 + 注入 |
| V9 | FR-NDA-010~012（`next` 工具 schema / `enum` 单源） | 从编译产物独立 re-derive `enum = OP_IDS − gesture`；比对导出值 | 恰 7 枚；排除 `gesture`；`maxItems=3` | 接口数据 | 自动化（模块 import） |
| V10 | FR-NDA-016/019/026/027（`chat-result.aiNext` 加法字段） | 源码切片 + node 面读到 payload 装配 | 只增不改；未产出 ⇒ 缺席；`≤3` 截断在装配层 | 接口数据 | 源码切片 + 自动化 |
| V11 | FR-NDA-082/116（xnDa 台账 schema 机核） | 独立读 `v4-supersession-ledger.json`；核对 12 行字段 + 判据逻辑 | 12 行均携 `assertionsRemoved:0`；`!==0` 必红 | 接口数据 | 脚本 |
| V12 | 交付可编译性（NFR-NDA-012） | `npm run typecheck` | rc=0 | 构建 | 自动化 |
| V13 | 交付可构建性 + 体积（NFR-NDA-001） | `npm run build`；复算 `dist/*` 尺寸 + 冻结面 sha | rc=0；`sidepanel.js=605,239`；冻结面逐字节不变 | 构建 + 性能边界 | 自动化 |
| V14 | FR-NDA-015/020/117（无条件注册 + parity） | 复跑 `npm test`（parity 套件）；源码切片 `host.ts` 注册点 | `next ∈ deriveTools()`；`pluginExtras['next']` reason+basis 非空；注册无 refs 条件 | 测试覆盖 + 接口数据 | 自动化 + 源码切片 |
| V15 | NFR-NDA-001 · FR-NDA-140~145（体积上限 / 距档） | 独立测量 `dist/sidepanel.js` / `background.js` | 605,239 ≤ 635,500（生效上限）∧ ≤ 614,400（距档 9,161） | 性能边界 | 脚本 |
| V16 | EC-NDA-014/015/002/003/018（解析失败 / 多次调用 / gesture / confirm） | 复跑 node 面判据（AI-N-1/5/6）；源码切片 | 解析失败 ⇒ 零候选不抛；覆盖式取最后；`≤3`；gesture 恒拒；confirm 可提案不可按下 | 性能边界 | 自动化 + 注入 |
| V17 | 漂移（孤立代码 / 需求缺失 / spec 漂移） | 文件集 vs plan §5；spec/plan mtime vs build；`git diff` 扫描 | 0 项漂移 | 漂移 | 脚本 + git |
| V18 | FR-NDA-001~006/142 · NFR-NDA-005（红线 / 保护段 / 判定链） | 独立复算基座零 diff / 冻结面 sha / 保护段字节 sha / `admitCandidate`·`onToolDone` byte-diff / 载体常量 | 全部命中；判定链零 diff | 漂移 + 构建 | 脚本（byte-diff） |

> **质量门槛（数量基线法）**：承载 13 组父 FR 切片 ⇒ 每组 ≥1 Vx（V1~V18 覆盖）；五维度各 ≥1 条（测试覆盖 V1~V8；接口数据 V3/V4/V8~V11/V14；构建 V12/V13/V18；性能边界 V5/V7/V13/V15/V16；漂移 V6/V17/V18）。满足。

---

## 3. 五维度方法论映射

| 维度（§5.1~§5.5） | 本叶落地方式 | 对应场景 |
|-------------------|-------------|---------|
| 测试覆盖验证（§5.1） | 12 门禁独立复跑 + 断言增量复算 | V1~V8 |
| 接口与数据验证（§5.2） | 无 HTTP API / DB ⇒ 落在「工具 schema / 载荷契约 / 台账 schema」三面 | V3/V4/V8~V11/V14 |
| 构建与脚本验证（§5.3） | `typecheck` + `build` + 产物复算 | V12/V13/V18 |
| 性能与边界验证（§5.4） | 体积上限（唯一在线 NFR）+ EC 边界 | V5/V7/V13/V15/V16 |
| 漂移与孤立代码检测（§5.5） | 孤立 / 缺失 / 规格漂移 + byte-diff | V6/V17/V18 |

## 4. 「不适用」标注

| 项 | 原因 |
|---|------|
| 外部 API 调用 / 数据库 schema | 本叶零外部服务 / 零 DB / 零新依赖（`package.json` 零 diff）⇒ 接口维度以工具 schema / 载荷 / 台账 schema 替代 |
| NFR-NDA-010（零死端**终态**断言） | 属叶2（未配置引导 / 提醒 / 系统兜底 / 首开）；本叶只保证「捕获 / 校验 / 未产出」段不引入死端（记「不适用」） |
| 并发 / 吞吐压测 | 本叶无服务端；Chromium 门禁串行纪律（NFR-NDA-012）⇒ 无并发指标 |

## 5. 结论判定规则

- **✅ 通过**：13/13 FR 组覆盖 ∧ NFR ≥80% ∧ 构建 rc=0 ∧ 漂移 0 ∧ 阻塞 0。
- **⚠️ 有条件通过**：存在非阻塞偏差（flake 门禁 / 弱判据观察项 / 登记项）但无阻塞。
- **❌ 不通过**：存在未覆盖 FR / 构建失败 / 严重漂移 / 阻塞。

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建（V1~V18 场景矩阵；五维度；13 组父 FR 覆盖；「不适用」四项标注） | 2026-09-27 | SDDU Validate Agent |
