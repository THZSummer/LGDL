# 验证策略：specs-tree-v4-2-chat-stream-model

> **文档定位**: SDDU 验证策略 — 指导 validate Agent 执行自主验证的场景和方法；验证结果见 `validate-report.md`
> **前置依赖**: 本叶 `spec.md`（FR-CHAT-020~026 / 030~037；AC-CHAT-001~003/005/010/011/020/022/023/025）、`plan.md`（ADR-V4-024~029）、`build.md` v1.1（含 §11 九项偏差 + §15 review 修复轮）、`review-report.md`（⚠️ 有条件通过 / 0 阻塞 / I-01~I-12）、父 `plan.md` ADR-V4-002/003/004/012/028
> **创建人**: SDDU Validate Agent
> **创建时间**: 2026-09-19
> **版本**: v1.0
> **更新人**: SDDU Validate Agent
> **更新时间**: 2026-09-19
> **更新说明**: 初始创建（本叶 V1~V8 验证场景矩阵：门禁独立复跑 / append-only 对抗 / 零明文对抗 / 迁移与切换 / 卡预算与渲染 / 修复落地抽查 / 规范符合性 / 红线终核）

---

## 1. 验证概要

本叶为**代码类 Feature**（新增 13 源文件 / 3 测试文件 / 修改 17 文件），故按全五维度验证：测试覆盖 + 接口数据 + 构建脚本 + 性能边界 + 漂移检测。

**被验基线**：仓库 `/home/usb/wks/gits/GitHub/LGDL` · 分支 `feature/web-cli-plugin` · HEAD `24da8b3`（review 修复轮落点）· diff 基线 `203261e`（v4-1 收口轮）。

**验证原则**：① **独立复算，不信自报**——门禁全部本机重跑，计数与台账/构建报告逐项对账；② **对抗优先**——append-only 与零明文是本叶两条命脉，主动构造破坏用例；③ **扰动可还原**——对源码/台账的任何注入均以 sha256 前后对照证明复原；④ **无法执行即如实标注**。

**通过门槛**（对齐 §6 验证标准）：

| 指标 | 要求 |
|------|------|
| FR 覆盖 | 100%（16 个本叶 FR 逐项有测试/探针且通过） |
| NFR 覆盖 | ≥ 80%（本叶 7 个 NFR 逐项覆盖） |
| 构建 | 退出码 0 |
| 严重漂移 | 0 |
| 阻塞问题 | 0 |

---

## 2. 自主验证场景（V1~V8）

**验证对象来源**：`spec.md`（16 FR / 7 NFR / 5 EC / 10 AC）→ 实现完整性与验收；`build.md`（文件变更 + §11 偏差 + §15 修复轮）→ 落地保真；`review-report.md`（I-01~I-12）→ 修复反证；实际产物（`dist/` + 台账 + `src/`）→ 构建/漂移/红线。

| # | 验证对象 | 验证步骤 | 预期结果 | 验证维度 | 验证方法 |
|---|---------|---------|---------|:--:|:--:|
| **V1** | 20 项门禁 + RP-V4-09（AC-CHAT-023 / NFR-CHAT-009） | 严格串行重跑 20 项门禁 + `test:density --reverse RP-V4-09`；逐项退出码/计数落盘；与台账 `counts.currentRuntime` 及 build §8/§15.3 逐项对账 | 逐项与登记同源；反证真会红→还原→绿 | 测试覆盖 + 构建 | 自动化（`run-gates.sh`） |
| **V2** | append-only 不可变 / 单调 / 终态冻结（FR-CHAT-020/025 · NFR-CHAT-001） | ① 运行时改写已入列事件（seq/payload/delete/defineProperty/数组 push·splice/state）；② terminal 置位后追加非终态/异终态事件；③ seq 回退与重复注入（`stream-merge` 双键去重）；④ `bound` 淘汰后内存与 DOM 一致性（含真实渲染器 destroy/detach） | 冻结真（strict 抛 TypeError）；终态不可解除；重复 seq 被拒；淘汰后 DOM==project 且受保护卡 detach 保身份 | 测试覆盖 + 性能边界 | 探针 `probe-appendonly.mjs`（node）+ `probe-render-esm.mjs`（真实 DOM） |
| **V3** | 零明文摘要与持久化边界（NFR-CHAT-012 · FR-CHAT-024） | ① `payload.text`/prompt/options/answer 塞正文·URL query·密钥·标记 → 落库与读回扫描必须无此串；② `label` 80 字符边界夹带（敏感词在第 79/81 位）；③ LRU 20 淘汰后 storage 残留扫描；④ 白名单越界/篡改读回必抛 | 正文零落库；截断不夹带；淘汰无残留；越界 fail-closed | 接口数据 | 探针 `probe-zero-plaintext.mjs`（node，真实模块 + 内存 store） |
| **V4** | 迁移与切换（EC-CHAT-003 · FR-CHAT-024） | ① 旧格式（v3 时代 entries）`history` 恢复不炸且可投影；② 会话切换 seq 不重置、旧段工具卡 `tool/ok/ms` 保留、切回不重复；③ 面板重开降级重建「（历史摘要）」+ `truncationRules` 登记一致性 | 不炸、投影成立、元数据零损、终态事实保留且正文占位 | 测试覆盖 + 接口数据 | 探针 `probe-migration-taxonomy.mjs`（node）+ 渲染器 ESM 探针 |
| **V5** | 卡预算裁决 + 渲染正确性（TASK-613 · FR-CHAT-072/073/075） | 真实 dist 独立注入：两卡 4+5（合计 9>8 必红）/ 单卡 6（绿）·7（红）/ 终态卡 patch 不可变 / 常驻导航形态判据（标记 + `.view-btn`）/ 渲染计数==投影 | 合计判据真的会红且单卡仍绿；终态 DOM 逐字冻结；guard 真抛错且可复原 | 性能边界 + 接口数据 | 探针 `probe-v5-budget-render.mjs`（Chromium，自研收集器 + 独立解析 caliber） |
| **V6** | review 修复落地抽查（I-01 / I-06 / I-11 / 体积） | ① I-01 `truncationRules` 机核反证（删登记 → FAIL；`kept` 脱钩 → FAIL；还原后 30/0）；② I-06 双键去重（重复事件注入 → 单次）；③ I-11 `KL-N-09` 真实存在；④ 体积 425,094 实测 + metafile 抽 3 模块 | 判据非恒真且可红；登记真实；体积与登记同源 | 构建 + 漂移 | 探针 `probe-volume-redline.py` + 台账注入/还原 |
| **V7** | 规范符合性（AC-CHAT-001~003/010/011/020 等） | 逐条对照 spec 验收锚点取机器证据；taxonomy 12 = 7 主类（设计稿顺序）+ 5 过程族；`ol#stream[role=log]`；`KIND_SET` 零新增 kind | 逐条 ✅（或标注不适用） | 测试覆盖 + 漂移 | 探针 + 门禁日志 + git diff |
| **V8** | 红线终核（AC-CHAT-020/023） | 不动面零 diff（content/background/manifest/design/security/options + 3 mjs）；`content.js` 177,076 / `pick-layer.js` 33,900 逐字节；保护段 active pin sha；`CHROMIUM_GATES.length===9` | 全绿、逐字节未动 | 漂移 | 探针 `probe-volume-redline.py` + git |

> **质量门槛核对**：本叶 16 FR → V2/V3/V4/V5/V6/V7 覆盖 16/16；7 NFR → V1/V2/V3/V4/V5/V7 覆盖 7/7；5 维度各有 ≥1 条 Vx（测试覆盖 V1/V2、接口数据 V3/V4/V5、构建 V1/V6、性能边界 V2/V5、漂移 V6/V7/V8）。

---

## 3. 测试覆盖验证（预期映射）

### 3.1 功能需求（FR）

| FR | spec 切片 | 主证据 |
|----|----------|--------|
| FR-CHAT-020 | 流事件不可变/单调/可回放；删置 null 路径 | `stream-model.test.ts` ①②③⑤ · V2 |
| FR-CHAT-021 | 类型集合 = 7 主类 + 5 过程族 | `stream-model.test.ts` taxonomy · V7 |
| FR-CHAT-022 | 统一固化契约（data-* / [hidden] / .ts / .card-fixed） | `test/ui/stream.mjs` ③⑦ · V5-D |
| FR-CHAT-023 | 只固化不撤销；无撤销控件 | `stream.mjs` ③ · V5-D |
| FR-CHAT-024 | 切换不丢过程元数据 + 截断规则登记 | `stream-model.test.ts` ② · V4 · `truncationRules` |
| FR-CHAT-025 | 留痕完备 + 可回放 | `stream-model.test.ts` ③⑤ · V2 |
| FR-CHAT-026 | 新增 kind 不进 KIND_SET | V7-6 · V8 |
| FR-CHAT-030 | 7 主类挂 `#stream` 的 `li` | `stream.mjs` ① · V7 |
| FR-CHAT-031 | `ai` 富文本 + `user` 对侧气泡 | `stream.mjs` ①② |
| FR-CHAT-032 | `system` 单行 + `HH:MM:SS` 只追加 | `stream.mjs` ①② |
| FR-CHAT-033 | `ref` 有效/失效 + 序号递增 | `stream.mjs` ① · V7-3 |
| FR-CHAT-034 | `nextstep` chips | `stream.mjs` ① · V5 |
| FR-CHAT-035 | 过程族 5 形态 + 工具卡字段 | `stream.mjs` ② |
| FR-CHAT-036 | 分类学登记；扩展须登记 | `design-contract.test.ts` 6/0 · shim 60/0 · V7-2 |
| FR-CHAT-037 | 卡可访问语义（role/ts/流 role=log） | `stream.mjs` ⑦ · V7-5 |

### 3.2 非功能需求（NFR）

| NFR | 切片 | 主证据 |
|-----|------|--------|
| NFR-CHAT-001 | 留痕完备 + 可回放 | `stream-model.test.ts` · V2② |
| NFR-CHAT-003 | 不整树重建 + scroll-policy 48px | `stream.mjs` ④⑤⑧ · V2④(浏览器) |
| NFR-CHAT-004 | role + .ts + aria-live + hidden + :focus-visible | `stream.mjs` ⑦ |
| NFR-CHAT-009 | 门禁串行 + 日志落盘 + 反证实跑 | V1 |
| NFR-CHAT-010 | 设计契约条款化 | design-contract 6/0 + shim 60/0 |
| NFR-CHAT-011 | 过程族折叠 480/10；固化卡/系统行不压缩 | `cards/shared.ts` 单源 + `stream.mjs` ② |
| NFR-CHAT-012 | 持久化边界 + 不写敏感明文 | `stream-persistence.test.ts` · V3 |

### 3.3 边界情况（EC）

| EC | 切片 | 主证据 |
|----|------|--------|
| EC-CHAT-003 | 切换元数据不丢或截断显式登记 | V4 |
| EC-CHAT-004 | 320px 零水平溢出 | `stream.mjs` ⑥ |
| EC-CHAT-006 | ≈40 轮长会话 | `stream.mjs` ⑧ · perf-budget |
| EC-CHAT-009 | 固化卡键盘/读屏可达 | `stream.mjs` ⑦ |
| EC-CHAT-013 | 不留红灯/缩范围显式登记 | V1 · V8 |

---

## 4. 接口与数据实测（计划）

| 检查项 | 期望 | 方法 |
|--------|------|------|
| `DigestEntry` 白名单 | 恰 11 字段，无自由文本 | 真实模块 + 越界注入 |
| 摘要落库字节 | 不含正文/URL query/密钥/标记 | 内存 store 读写回扫描 |
| `truncationRules[panel-reopen].kept` | == `DIGEST_FIELDS`（逐字段） | 真实模块 + 台账机核 + 注入反证 |
| `dist/build-meta.json` | `sidepanel 425,094` / 抽 3 模块 `bytesInOutput` 与登记相等 / inputs 69 | 独立解析 |

## 5. 构建与脚本验证（计划）

| 检查项 | 命令 | 期望 |
|--------|------|:--:|
| 类型 | `npm run typecheck` | 退出码 0 |
| 构建 | `npm run build` | 退出码 0，5 产物，sidepanel 425,094 |
| node 全量 | `npm test` | 920 / 0 / skipped 0 |

## 6. 性能与边界验证（计划）

| 对象 | 要求 | 方法 |
|------|------|------|
| `project()` 320 卡 | < 250ms 且回放稳定 | `test/perf-budget.test.ts`（门禁内） |
| 卡预算 | 单卡 ≤6 ∧ 首屏合计 ≤8 ∧ 首屏卡 ≤2 | V5 独立注入 |
| 终态 DOM | patch 后逐字不变 | V5-D |
| `bound` 淘汰 | 仅非当前段 system/notice；受保护卡不淘汰；DOM 同步 | V2④ |

## 7. 漂移检测（计划）

| 漂移类型 | 方法 |
|---------|------|
| 孤立代码 | 导出符号引用扫描 + 新增模块 ↔ FR 对照 |
| 需求缺失 | 16 FR ↔ 测试/探针覆盖矩阵 |
| 规格漂移 | `git log/diff` 本叶 `spec.md`（build 期不得改） |

## 8. 结论（策略预期）

若 V1~V8 全绿 → ✅ 通过；若出现非阻塞偏差（潜在不变式缺口 / 环境性门禁抖动）→ ⚠️ 有条件通过；若出现未覆盖 FR / 构建失败 / 严重漂移 / 安全语义被破 → ❌ 不通过。**实际判定见 `validate-report.md`。**

---

## 9. 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建（V1~V8 场景矩阵 + FR/NFR/EC 覆盖映射 + 五维度方法；独立复算 + 对抗优先 + 扰动可还原纪律） | 2026-09-19 | SDDU Validate Agent |
