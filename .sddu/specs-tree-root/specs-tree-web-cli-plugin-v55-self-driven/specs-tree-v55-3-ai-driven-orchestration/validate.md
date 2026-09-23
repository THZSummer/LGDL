# 验证策略：specs-tree-v55-3-ai-driven-orchestration（V5.5-3 主题② AI 驱动编排 + 治理收口）

> **文档定位**: SDDU 验证策略 — 指导 validate Agent 执行自主验证的场景和方法；验证结果见 `validate-report.md`
> **前置依赖**: `spec.md`（42 承载父 FR / 13 叶内 NFR 行 / 10 EC / 16 父 AC 锚点）、`plan.md` v1.0、`review-report.md` v1.0（**R1：45 Cx / 0 BLOCK / 2 I / 8 O；状态 passed**）、`build.md` v1.3（R1+R2+R3 收口 + review 微修 I-01/I-02）
> **创建人**: SDDU Validate Agent
> **创建时间**: 2026-09-23
> **版本**: v1.0
> **更新人**: SDDU Validate Agent
> **更新时间**: 2026-09-23
> **更新说明**: 初始创建（V1~V9 场景矩阵；对抗优先 + 行为级动手验证；对照 spec §7 的 16 条父 AC 锚点逐条映射；五维度覆盖）

## 1. 验证概要

| 维度 | 实测数据 | 达标？ |
|------|---------|:--:|
| FR 测试覆盖 | 42/42（本叶承载父 FR 切片；逐条映射 Vx） | ✅ |
| NFR 测试覆盖 | 13/13（本叶 §5 列出的叶内 NFR 行） | ✅ |
| 构建 | typecheck 0 + build 0（dist 二次重建逐字节稳定） | ✅ |
| 接口一致性 | S0-A 真面板 + 真管线 / 三档清分 / 仲裁 / 护栏 —— 全绿 | ✅ |
| 漂移项 | 0 严重（冻结面 / 判定链 / 台账 / spec 全零漂移） | ✅ |
| 阻塞问题 | 0 | ✅ |

## 2. 自主验证场景（V1~V9）

**验证对象来源**：
- `spec.md`：§7 的 16 条父 AC 锚点（AC-SELF-004/005/006/008/014/016/017/018/019/020/021/022/023/024/025/026）+ §4 的 42 条父 FR 切片 + §5 的 13 条叶内 NFR 行 + §6 的 10 EC。
- `plan.md`：文件影响清单（NEW `turn-queue.ts` / `guard.ts` / `ai-drive.ts` + 3 新门禁；MODIFY 12；NOOP 面）→ 覆盖完整性。
- `review-report.md`：R1 的 2 I（已微修 fdcbae8）+ 8 O → 行为级独立复核。
- 构建产物：`dist/{content,pick-layer,sidepanel}.js` + `build-meta.json` + 冻结台账 → 红线 / 体积 / 漂移。

**Feature 类型**：**代码类**（有 `src/` 源码、`test/` 门禁、node + Chromium 双面、API/op 面）⇒ 全五维度验证（测试覆盖 + 接口数据 + 构建 + 性能边界 + 漂移检测）。

**对抗优先原则**：不信任 build/review 已跑数字 —— 关键数字（S0-A 零按键端到端 / 护栏四项越限 / 安全边界四项 / 仲裁三路径 / 门禁计数 / 冻结面 sha / 体积五要素）均**亲跑复刻**；并自写独立脚本对判据本体执行**真源注入**必红抽验（≥2，实际 10+）。

| # | 验证对象 | 验证步骤 | 预期结果 | 验证维度 | 验证方法 |
|---|---------|---------|---------|---------|---------|
| **V1** | **门禁全量亲跑 + 构建**（FR-SELF-116 / NFR-SELF-004/005） | ① `npx tsc --noEmit`；② `node build.mjs` ×2（比较 dist 三面字节 + sha）；③ `npm test`；④ 逐门禁亲跑（op-three-tier / proactivity-guard / turn-arbitration / s0-self-driven-chain / supersession / gate-integrity / size-*）；⑤ Chromium 回归（s0-self-driven / journey / law8 / dead-end / binding / insight / stream / ask-auth / l0 / density / l1 / l2 / e2e…） | typecheck 0；build 0 且二次重建 dist 三面字节稳定；`npm test` **1319/0**；点名门禁计数 = build 登记；Chromium 全 PASS | 测试覆盖 + 构建 | 亲跑 + 自写脚本 |
| **V2** | **S0-A node 真管线**（FR-SELF-060/063/065 · AC-SELF-008） | 自写 node 脚本：`bindPanelOps` + `pressCandidate` 真管线，答案原样交回合入口 | 链上首拍放行 ∧ 恰 1 次按下 ∧ 答案逐字 ∧ 三要素留痕 ∧ **零明文** | 接口数据 | 自写 `v553-node-behavior.mjs` |
| **V3** | **S0-A Chromium 真面板端到端**（FR-SELF-060/063/070 · AC-SELF-001/008） | 自写 Chromium 脚本：夹具 `LLM：Key ✅` ⇒ 真点击作答 ⇒ 零按键量具 ⇒ 恰 1 条 `chat`（原文）⇒ 三要素**独立成行** ⇒ `command` 续流 ⇒ `done` 收口 | 零按键 = 0 ∧ chat = 1 ∧ 原文逐字 ∧ 留痕独立成行（非 suppressed 超集）∧ command ≥1 ∧ 收口无 ask/无阻塞 | 接口数据 + 测试覆盖 | 自写 `v553-s0a-panel.mjs` |
| **V4** | **护栏行为级**（FR-SELF-064/090/091/092 · NFR-SELF-013/014 · EC-SELF-014/015） | 自写脚本用**可注入时钟**沿链序穷举：频次第 7 / 链深第 3 / 预算第 9；窗口滚动 / 用户手势后恢复；确定性面不受控 | 第 7 ⇒ `frequency`、第 3 ⇒ `chain-depth`、第 9 ⇒ `budget`；恢复放行（非恒真）；关断态 `deterministic` 恒放行 | 性能边界 + 测试覆盖 | 自写 + `proactivity-guard` |
| **V5** | **安全边界行为级**（FR-SELF-080~086/067/085 · NFR-SELF-003 · EC-SELF-017/018 · R-SELF-001） | 真判据直调：特权恒 `gesture`；AI 发起特权 ⇒ `blocked:tier`；consent 不代答；auto 档三表写入注入必红；新 op 未归档必红 | 特权恰 2 恒 gesture；AI 对 confirm/gesture 全拒；`WRITE_POINTS` 无 auto 档；注入必红 ∧ 基线零红 | 接口数据 + 测试覆盖 | 自写 + `op-three-tier` 判据函数 |
| **V6** | **并发仲裁行为级**（FR-SELF-061/096 · EC-SELF-013 · AC-SELF-014） | 直调 `classifyChatRequest` / `createTurnQueue`：非在飞 ⇒ executed；在飞 ⇒ queued（`drain` 同文）；满 ⇒ busy-rejected + 草稿回填（源码事实 + 注入必红）；AI 撞车 ⇒ `blocked:busy` 不排队 | 队列恒 ≤1 ∧ drain 同文 ∧ 回填仅在空输入 ∧ AI 不排队 ∧ 回填删则必红 | 接口数据 + 边界 | 自写 + `turn-arbitration` 判据函数 |
| **V7** | **红线 / 体积 / 漂移终核**（FR-SELF-095/100/107/120~124 · AC-SELF-020/021/022/023/024 · EC-SELF-019） | 自写脚本：三冻结面字节 + sha；红线 RL-01~12；五要素；`zeroDiffFiles` 逐文件 git diff；`requestTurn(` 恰 2；`KIND_SET` 40；零宿主；耗时前移二态 | 12/12 全绿；五要素 = 573,424 / 602,095 / 614,400 / 675,840 / pending-author-line；冻结面逐字节 + sha（content 命中 pin）；判定链零 diff | 漂移检测 + 构建 | 自写 `v553-redline-volume.mjs` |
| **V8** | **关断真设置面 + 主题① 例外**（FR-SELF-069/094 · NFR-SELF-010 · EC-SELF-016） | 真设置面切 `#settings-proactive-enabled`（真 change 事件 + 持久化）⇒ 新意图被抑制可读；主题① `recommend('idle')` 仍产出；恢复 ON | 关断 ⇒ `suppressed=disabled` ∧ 真不发 ∧ 主题① 仍放行 ∧ 可逆 | 接口数据 + 边界 | 自写 `v553-s0a-panel.mjs` |
| **V9** | **注入抽验（判据不恒真）**（FR-SELF-111 · NFR-SELF-007 · AC-SELF-017） | 注入 ≥2：特权降 auto / auto 写三表 / AI 代答 consent / op.ghost / 草稿回填删除 / 红线坏一项 | 各注入**必红** ∧ 逐字节/还原 PASS；基线零红 | 测试覆盖 | 自写 + 门禁判据本体 |

> **质量门槛（数量基线法）**：每个 FR ≥ 1 个 Vx（映射见 `validate-report.md` §3.1），每个相关验证维度 ≥ 1 条 Vx（测试覆盖 V1/V3/V4/V5/V9、接口数据 V2/V3/V5/V6/V8、构建 V1/V7、性能边界 V4、漂移检测 V7）。Vx 总数 9 ≥ max(FR 42 …) 的维度下界（维度侧 5/5 覆盖，FR 侧经 §3.1 逐条映射闭合）。

## 3. 测试覆盖验证

> 见 `validate-report.md` §3.1 / §3.2（逐 FR / NFR 映射与实测）。覆盖率：FR 42/42 = **100%**；NFR 13/13 = **100%**。

## 4. 接口与数据实测

> 见 `validate-report.md` §3.4（S0-A 真面板读数 / 三档清分 / 仲裁三路径 / 护栏六常量）。

## 5. 构建与脚本验证

> 见 `validate-report.md` §3.3（`tsc --noEmit` / `node build.mjs`×2 / `npm test`）。

## 6. 性能与边界验证

> 见 `validate-report.md` §3.5（护栏越限穷举 + EC-SELF-013~021 边界）。

## 7. 漂移检测

> 见 `validate-report.md` §3.6（孤立代码 / 需求缺失 / 规格漂移 / 冻结面）。

## 8. 结论

> 结论与指标达标矩阵见 `validate-report.md` §6。

## 9. 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建（V1~V9 场景矩阵：门禁全量 / S0-A 双面 / 护栏 / 安全边界 / 仲裁 / 红线体积 / 关断 / 注入抽验；16 父 AC 逐条映射；五维度覆盖） | 2026-09-23 | SDDU Validate Agent |
