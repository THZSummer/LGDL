# 验证策略：specs-tree-v55-1-driver-layer（V5.5-1 驱动者层 + 法七扩展底座）

> **文档定位**: SDDU 验证策略 — 指导 validate Agent 执行自主验证的场景和方法；验证结果见 `validate-report.md`
> **前置依赖**: `spec.md`（43 条 FR / 11 条 AC 锚点）、`plan.md`、`review-report.md`（R1+R2，状态 **passed**，0 阻塞）、`build.md`（R1+R2+R3 修复轮）
> **创建人**: SDDU Validate Agent
> **创建时间**: 2026-09-23
> **版本**: v1.0
> **更新人**: SDDU Validate Agent
> **更新时间**: 2026-09-23
> **更新说明**: 初始创建（V1~V9 对抗优先场景矩阵；对照 spec §7 的 11 条 AC 锚点逐条映射；五维度覆盖）

## 1. 验证概要

| 维度 | 实测数据 | 达标？ |
|------|---------|:--:|
| FR 测试覆盖 | 40/40（本叶承载父 FR 切片；review 映射 43/43） | ✅ |
| NFR 测试覆盖 | 7/7（本叶相关 NFR-SELF-001/004/005/006/007/009/010/011） | ✅ |
| 构建 | typecheck 0 + build 0 | ✅ |
| 接口一致性 | 驱动者集合↔provider 集合 / 四元组 / 时机源 / 终态词汇 —— 全绿 | ✅ |
| 漂移项 | 0 严重（冻结面 / 判定链 / 台账 / spec 全零漂移） | ✅ |
| 阻塞问题 | 0 | ✅ |

## 2. 自主验证场景（V1~V9）

**验证对象来源**：
- `spec.md`：§7 的 11 条 AC 锚点（AC-SELF-001/002/003/004/009/010/011/015/016/017/020/026）+ §4 的 40 条父 FR 切片 + §5 的 NFR + §6 的 EC。
- `build.md`：文件变更清单（源码 7 / 门禁 8 / fixture·台账 3）→ 覆盖完整性。
- `src/**` + `test/**`：新 6 门禁 + 升级 12 门禁 → 测试覆盖与运行。
- 构建产物：`dist/{content,pick-layer,sidepanel}.js` + `build-meta.json` → 构建完整性 / 冻结面。

**Feature 类型**：**代码类**（有 `src/` 源码、有 `test/` 门禁、有 node + Chromium 双面）⇒ 全五维度验证（测试覆盖 + 接口数据 + 构建 + 性能边界 + 漂移检测）。

**对抗优先原则**：不信任 build/review 已跑数字 —— 所有关键数字（S0 三总判据 / 双面计数 / 门禁计数 / 冻结面 sha / 体积五要素）均**亲跑复刻**；对 2 条关键判据执行**真源注入**必红抽验。

| # | 验证对象 | 验证步骤 | 预期结果 | 验证维度 | 验证方法 |
|---|---------|---------|---------|---------|---------|
| **V1** | **S0 双面独立复刻**（AC-SELF-001 / FR-SELF-130~133） | ① 自写 node 探针直连共享样本 `s0-chain.mjs` + 编译产物，复刻三总判据；② 反证：清空驱动者+终态+候选 / 抽掉悬置；③ 亲跑 Chromium 面 `test/s0-self-driven.mjs`，读 A/B 独立计数 | node：`silentWindows=0 ∧ silentOk=6 ∧ deadEnds=0 ∧ answerNotDropped=true`；反证 `silentWindows=6` / `answerNotDropped=false`；Chromium 24/0，A/B 分别计 check | 测试覆盖 + 漂移 | 自写探针 + `npm run test:s0-self-driven` |
| **V2** | **法七扩展：四类终态逐类有驱动者 + 可达 next**（AC-SELF-003 / FR-SELF-020/021） | ① 亲跑 `law7x-ext`（L7X-1~4）与 `driver-terminals`（DTM-1~4）；② 真面板：answered-ref（S0 ⑥）/ describe-submitted（recommendation ⑫ + ask-auth ⑮）/ bg·late（V3 行为探针） | 四类（ref/op/bg/describe）逐类：来源→终态→时刻→驱动者→可达 next 五段全过；L7X 5/0、DTM 8/0 | 测试覆盖 | `node --test` + Chromium |
| **V3** | **取消后台 ask ⇒ 不登记 answered（BLOCK-01 行为级）**（FR-SELF-023 / EC-SELF-005） | 自写真面板探针：SW 投递 `ask-user-request` → 面板渲染卡 → 变体 A 点 `#ask-cancel`；变体 B 填文本点 `#ask-submit`（正对照） | A：`suspensions=[]` ∧ 仍可达 next；B：`suspensions=[{source:'late',kind:'answered-late'}]` ⇒ 守卫区分取消/作答，非恒真 | 接口数据 + 测试覆盖 | 自写 Chromium 探针 |
| **V4** | **驱动者四元组 + 时机源**（AC-SELF-002/009 / FR-SELF-010~019/030~036） | ① 亲跑 `driver-quadruple`/`driver-timings`/`op-wiring`；② 静态计数：`requestTurn(` / `maybeRecommend(` / `nextAfterSettle(` 定义与调用点 | 集合 ≡ provider（双向包含）；时机闭集恰 5 含 `answered`、旧 4 逐字；`requestTurn(` 恰 2（diff=0）、`maybeRecommend(` 定义 1 / 调用 7、`nextAfterSettle(` 定义 1 | 测试覆盖 + 漂移 | `node --test` + grep 计数 |
| **V5** | **applyRefAction 驱动化 + submitDescribe 补齐**（AC-SELF-010/011 / FR-SELF-025/026/027） | ① 亲跑 `l1-ref-validity`（生产调用点恰 1 / sends 不足 / 裁决+驱动顺序）；② 亲跑 `ask-auth` ⑮ + `recommendation` ⑫；③ 静态：`applyRefAction(` 三处归类 | 生产调用点恰 1（+seam 1）；`sends += 1` 递增不足以满足；空描述零副作用且不入终态；非空 ⇒ 悬置+驱动 | 接口数据 + 测试覆盖 | `node --test` + Chromium + grep |
| **V6** | **门禁全量亲跑 + 关键注入抽验**（AC-SELF-016/017/020 / FR-SELF-110/111/116） | ① `npm test` 全量（起始 + 全部还原后各一次）；② **注入 1**：真删 `terminals.ts` 的 `'answered-bg'` ⇒ `no-dead-end`；③ **注入 2**：真删 `sidepanel.ts` 取消守卫 ⇒ `law7x-ext#L7X-4`；④ 各注入后 `git checkout` 逐字节还原再复跑 | npm 1246/0（不减）；注入 1 ⇒ `no-dead-end` 红（终态词真删必红）；注入 2 ⇒ `L7X-4` 红；还原后 sha 逐字节一致且复绿 | 测试覆盖 + 漂移 | `npm test` + 真源注入 |
| **V7** | **构建 + 类型 + 体积五要素**（NFR-SELF-005 / AC-SELF-026） | ① `npm run typecheck`；② `npm run build`；③ 亲跑 `size-ruling-vol3`/`size-budget`/`size-growth-evidence`；④ 复核四值 | 退出码全 0；五要素 = **557,883 / 585,777 / 563,200 / 619,520** | 构建 | npm 脚本 + `node --test` |
| **V8** | **红线 / 冻结面 / 保护段终核**（FR-SELF-123 / AC-SELF-026） | ① `stat`+`sha256sum` 三冻结面；② `KIND_SET` 计数；③ 特权手势 grep；④ `law8` / `journey` / `binding`；⑤ 保护段经 `test:supersession` 机核 | content.js 177,076 B / sha `52a82620…b5f6`；pick-layer.js 34,358 B / sha `77796bab…575e`；sidepanel 557,883 B；`KIND_SET` 40；`permissions.request` 只在手势助手内；law8 33/0；journey 171 PASS；binding 保护段 sha `be9ad0e9…` + startByte 107780 双绿 | 漂移 | `stat`/`sha256sum`/`grep`/门禁 |
| **V9** | **漂移 / 台账 / 孤代码**（AC-SELF-004 / FR-SELF-107/113 / NFR-SELF-004） | ① 台账 `X-SELF` 命中与 `xSelfLedger` 七行；② `git diff --name-only` 零 diff 清单；③ spec.md 是否被动过 | X-SELF-1~7 齐备（4 superseded / 2 handed-over / 1 no-supersession）；冻结面 / 判定链 / manifest / ROADMAP / design 零 diff；leaf+parent spec.md 自创建后零改 | 漂移 | 台账检索 + `git diff` + `git log` |

> **质量门槛（数量基线法）**：40 条 FR 逐条映射到 V1~V9（V1↔130~133 / V4↔010~019·030~036 / V2↔020~024 / V3↔023 / V5↔025~027·100~105 / V6↔110~116 / V7↔120 / V8↔123 / V9↔107·113）；五维度（测试覆盖 / 接口数据 / 构建 / 性能边界 / 漂移）各 ≥1 条。**性能边界维度**：本叶无新增性能 NFR，NFR-SELF-001（首屏/滚动不退化）由 `journey` 保护段承担；**接口数据维度**以驱动者四元组 / 时机源 / 终态映射 / 后台 ask 载荷替代 HTTP API（本叶零外部 API）。

## 3. 覆盖矩阵（FR / NFR → Vx）

| FR 组 | Vx | FR 组 | Vx | NFR | Vx |
|---|---|---|---|---|---|
| FR-SELF-010~019 | V4 | FR-SELF-104/105 | V5/V9 | NFR-SELF-001 | V8 |
| FR-SELF-020~024 | V2 | FR-SELF-107 | V9 | NFR-SELF-004 | V4/V9 |
| FR-SELF-025~028 | V5 | FR-SELF-110/111 | V6 | NFR-SELF-005 | V7 |
| FR-SELF-030~036 | V4 | FR-SELF-113 | V9 | NFR-SELF-006 | V7 |
| FR-SELF-100~103 | V4/V5 | FR-SELF-115/116 | V6 | NFR-SELF-007 | V6 |
| FR-SELF-120/123 | V7/V8 | FR-SELF-130~133 | V1 | NFR-SELF-009 | V2 |
| | | | | NFR-SELF-010 | V2/V3 |
| | | | | NFR-SELF-011 | V8 |

## 4. 结论分级口径

- **BLOCK**：P0 FR 在生产路径不成立 / 冻结面或红线被破 / 构建失败 / 严重漂移。
- **N（登记）**：环境性 flake / 已登记偏差 / 低 severity 残留，不阻塞。
- **⏳（人工面）**：headless 不可合成（主动接手体感 / 打断感 / 文案可读性），**不冒充 PASS**。

## 5. 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建（V1~V9 场景矩阵；11 条 AC 锚点逐条映射；五维度覆盖；对抗优先 + 真源注入抽验） | 2026-09-23 | SDDU Validate Agent |
