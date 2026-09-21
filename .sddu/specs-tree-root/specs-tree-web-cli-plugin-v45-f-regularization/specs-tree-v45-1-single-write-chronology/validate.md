# 验证策略：specs-tree-v45-1-single-write-chronology（V4.5-1 单写化 + 宿主时间序化）

> **文档定位**: SDDU 验证策略 — 指导 validate Agent 执行自主验证的场景和方法；验证结果见 `validate-report.md`
> **前置依赖**: 本叶 `spec.md` v1.0（44 FR / 8 NFR / 13 EC / 22 AC）、`plan.md` v1.1（ADR-V45-001~012）、`build.md` v1.3（§8 = review R1 修复轮 + 本轮 §8.0 现场差异）、`review-report.md` v2.0（R2 ⚠️ 有条件通过 / 0 阻塞 / 可进 validate）
> **创建人**: SDDU Validate Agent
> **创建时间**: 2026-09-21
> **版本**: v1.0
> **更新人**: SDDU Validate Agent
> **更新时间**: 2026-09-21
> **更新说明**: 初始创建（V4.5-1 独立动态验证策略：V1~V10 场景矩阵，对抗优先、独立复算、不信自报）

## 1. 验证概要

| 维度 | 说明 |
|------|------|
| Feature 类型 | **代码类**（浏览器扩展 `packages/web-cli-plugin`，含 `src/**` + Chromium 运行时门禁 + node 门禁）→ 全五维度验证 |
| 验证基线 | 分支 `feature/web-cli-plugin` / HEAD `9e85783` / 工作树干净 |
| 验证对象 | spec（44 FR / 8 NFR / 13 EC / 22 AC）+ plan（12 ADR / 63 文件影响）+ 实际产物（`src/**` / `test/**` / `docs/*.json` / `dist/*`）|
| 对抗策略 | **不信自报**：门禁独立复跑 + 字节级独立复算 + 纯函数层注入反证 + 文件层 1 byte 注入 |
| 脚本产出路径 | `/tmp/opencode/v45-validate/R1/`（brief 指定探针根；等价于 ADR-003 的 `/tmp/sddu-validate-<feature>-<ts>/`） |

**质量门槛**：每个 FR ≥ 1 个 Vx（本叶 44 FR 归并为 12 组承载面，逐组 ≥1 Vx）；每个验证维度（测试覆盖 / 接口数据 / 构建 / 性能边界 / 漂移）≥ 1 条 Vx。

## 2. 自主验证场景（V1~V10）

| # | 验证对象 | 验证步骤 | 预期结果 | 验证维度 | 验证方法 |
|---|---------|---------|---------|---------|---------|
| **V1** | 24 项门禁 + 计数对账（FR-V45-003/004 · AC-V45-017） | 1. `typecheck` / `build`；2. `npm test`；3. 6 项 node 单跑；4. 15 项 Chromium 串行（一次一个） | 24/24 绿；计数逐项 ≥ 基线且 == 自报（1045/244/232/108/116…） | 测试覆盖 + 构建 | 自动化：逐门禁脚本 + 日志全量落盘 |
| **V2** | 单写对抗（FR-V45-010~015 · AC-V45-001/003/004） | ① 复活退役 `#notice`/`#env-guard` 等 → 载体判据；② 同 kind 第二行 → raw 计数；③ firstRun 卡+行双载体；④ `title` 注入 `?token=`/密钥；⑤ 五通道各驱动一次真事实 | ①②③ 注入必红；④ 抛错；⑤ 流内恰 1 载体 | 接口数据 + 性能边界 | 探针：`probe-v45.mjs` 纯函数注入 + 门禁内 live 反证 |
| **V3** | 纯时间序对抗（FR-V45-020/023/024 · AC-V45-002/005） | ① 注入 `li[data-host]` → 零宿主判据；② `#composer` 位置 + hidden 双护栏；③ 产品自断言 `assertStreamPureCardOrder` 真跑 | ① 必红；② 父=body ∧ 非流后代 ∧ body 尾 ∧ hidden；③ 自断言通过 | 接口数据 + 漂移 | 探针 + journey `#15c/#15e-1/#15e-2` + 静态 DOM 核查 |
| **V4** | journey 链诚实性（FR-V45-080/083/084 · AC-V45-014） | ① 三链节 `git show` 字节复算；② v3 legacy pin 严格命中必须失败、链式才命中；③ `#15b` 门槛逐字；④ `#15c` 出流契约 | 三链 sha 命中；legacy 严格 MISS / 链式 HIT；65% 逐字；契约在位 | 漂移 + 测试覆盖 | `git show` + dd/sha256sum + 账本链遍历脚本 |
| **V5** | binding 保段（FR-V45-081 · AC-V45-015） | ① sha + startByte 107780 双绿独立复算；② 段内注入 1 字节 → 必红（复算）| 双绿；段内注入必红 | 漂移 + 接口数据 | dd/sha256sum + 文件注入 + `test:supersession` |
| **V6** | density 非放宽（FR-V45-070~074 · AC-V45-018） | ① 31 格 before/after 与 `#tiers` 同源；② 唯一变更格方向；③ 越阈注入（+1 格）→ 红；④ 阈值面零 diff | 31 格齐备；唯一真变更格 tighten-only；越阈必红；阈值 7/15·9/20·17/35 零 diff | 性能边界 + 漂移 | 账本解析 + `evaluateDensity` 纯函数注入 + `git diff` |
| **V7** | act 布线（FR-V45-030~033/040~042 · AC-V45-010/011/012） | ① help/rebind/authorize 产品路径真实驱动；② `NEXTSTEP_ACTS` 6 项逐字；③ 帮助分区 6 行 + 单源 | 三者各有唯一入口 + 零 `requestTurn`；6 项逐字；6 行单源 | 接口数据 + 测试覆盖 | `test:local-act-wiring` + `test:settings-help` + `test:recommendation` live |
| **V8** | 体积三值（FR-V45-090~093 · AC-V45-019） | ① 498,521/523,447/512,000/563,200 同源；② 档位不下移；③ `pending-author-line` 保持；④ 越限红测（×1.06 / 523,448 / 563,201） | 三值同源；档位不下移；状态保持；越限必红 | 性能边界 + 漂移 | `evaluateSidepanelSize` 纯函数注入 + 常量读取 + 账本 JSON |
| **V9** | 规范 + 红线（AC-V45-013/016/020/021/022） | ① 22 AC 逐条判定；② 不动面 diff；③ 保护段；④ 零注入；⑤ spec 零漂移 | 22 AC 逐条有判据；红线面零 diff；保护段逐字节；零注入 27/0；叶子 spec 零漂移 | 漂移 | `git diff --name-status` + 静态核查 + 门禁 |
| **V10** | 修复落地抽检（review R1 BLOCK-01~04 + I-01~08 + O-04~O-08） | ① BLOCK-01~04 闭环态；② I-01~08；③ O-04~O-08 状态如实 | 逐项真实落地；I-07/I-08 本轮零字节订正；O 项如实登记 | 漂移 + 测试覆盖 | grep/字节复算 + 门禁 |

> **不适用项**：本 Feature 无外部 API / 无数据库 schema / 无新依赖（NG-V45-004/015）⇒「接口与数据」维度以「产品内部 DOM/合约 + 门禁报告结构」代替，无外部接口调用。

## 3. 测试覆盖验证（覆盖度矩阵）

### 3.1 功能需求（FR）— 44 FR 归并为 12 承载面

| FR 组 | spec 描述 | 承载门禁 | 预期 |
|---------|----------|:--:|:--:|
| FR-V45-001~004 | 编号/单叶/断言零删除/计数只增对账 | `npm test` + 各门禁 | ✅ |
| FR-V45-010 | 5 条提示带 + strips DOM 移除 | `test:l0` / `test:hardening` / `test:journey` | ✅ |
| FR-V45-011~015 | 首屏三事实恰 1 + 单通道 4 规则 + 富提示承载 + firstRun 归并 + 归并判据 | `test:l0` / `test:stream` / `test:system-merge` | ✅ |
| FR-V45-020~026 | `#stream` 纯卡序 + decision 壳/l1-panels 退役 + `#composer` 出流 + messageAnchor + disclosure | `test:l0` / `test:journey` / `test:l1` / `test:l2` | ✅ |
| FR-V45-030~033 | risk-recovery 扩展 + act 闭集 6 + 布线门禁 | `test:recommendation` / `test:local-act-wiring` | ✅ |
| FR-V45-040~042 | 设置「帮助」分区 + chip `act:'help'` | `test:settings-help` / `test:recommendation` | ✅ |
| FR-V45-050~052 | options 纯文案解冻 + 范围门禁 | `test:zero-injection` + 解冻范围门禁 | ✅ |
| FR-V45-060~062 | 零宿主断言 + 退役清单扩容 + 5 类问题串 | `test:host-registry` / `test:l0` | ✅ |
| FR-V45-070~074 | 密度口径零放宽 + 重算 + 反证 | `test:density` / `test:density-thresholds` | ✅ |
| FR-V45-080~084 | journey 二次八步 + binding 保段 + 11 处重锚 | `test:supersession` / `test:journey` / `test:binding` | ✅ |
| FR-V45-090~093 | 体积五要素 + 算数机核 + 三值同源 + 红线 | `test:size-ruling-vol3` / `test:size-budget` / `test:size-growth-evidence` | ✅ |

### 3.2 非功能需求（NFR）

| NFR | 关注点 | 承载判据 | 预期 |
|---------|----------|:--:|:--:|
| NFR-V45-001 | `#region-stream` ≥65.0% | `journey #15b` / `#15p-#15t` | ✅ |
| NFR-V45-002 | 320px 零溢出 / 键盘序 / role=log | `journey #15q` / `test:l0` ⑩ / `#stream[role=log]` | ✅ |
| NFR-V45-003 | `title` 同过净化 | `test:system-merge` `TITLE_PLAINTEXT_JUDGEMENTS` + `zero-injection ≥27` | ✅ |
| NFR-V45-004 | 各单源恰一处声明 | 各「声明恰一次」门禁 + 反证 | ✅ |
| NFR-V45-005 | `sidepanel.js` ≤ floor(baseline×1.05) | `test:size-budget` / `test:size-growth-evidence` | ✅ |
| NFR-V45-006 | 兼容读取面 ids | journey/binding 读取面断言 | ✅ |
| NFR-V45-007 | 新/改判据可 FAIL + `expectFailPattern` | 各判据表反证 | ✅ |
| NFR-V45-008 | 长文案不退化为仅 `title` | 新增断言 + **人工面读屏项（⏳）** | ✅（机器）/ ⏳（人工） |

## 4. 接口与数据实测

| 检查项 | spec 要求 | 实测方式 | 预期 |
|--------|----------|---------|:--:|
| `evaluateStripChannels` | 载体面 ≤1 ∧ 缺失即红 ∧ emitter 恰 1 | 纯函数注入 6 通道 | 注入必红 / 合法绿 |
| `evaluateHostRegistry` | 任意深度零宿主 + 退役项负向 + 5/6 类问题串 | 纯函数注入 | 注入必红 |
| `plaintextTitle` | `?token=`/密钥抛错 + `<link>` 剥标记 | 直接 import 编译产物 | ① 抛错 ② 剥标记 |
| `#stream` DOM 形态 | 零 `data-host` + 零退役 id + `#composer` body 尾 hidden | 静态 `index.html` 核查 | 全部成立 |
| 保护段 | journey/binding sha + 偏移 | dd/sha256sum | 逐字节命中 |

## 5. 构建与脚本验证

| 检查项 | 命令 | 预期退出码 | 预期结果 |
|--------|------|:--:|:--:|
| 类型检查 | `npm run typecheck` | 0 | ✅ |
| 构建 | `npm run build` | 0 | ✅ 产物 498,521 B |
| node 门禁 | `npm test` | 0 | 1045/0 |
| Chromium 门禁 | `npm run test:{l0,l1,l2,density,ui,…}` | 0 | 逐项 ≥ 基线 |

## 6. 性能与边界验证

| NFR/EC | spec 要求 | 实测方式 | 预期 |
|-----|----------|---------|:--:|
| NFR-V45-001 | 流区高度占比 ≥65.0% | `journey #15b` | ≥65 |
| NFR-V45-005 | ≤ 523,447 B | 产物 `stat` + 纯函数 | 达标 |
| AC-V45-018 边界 | 越阈 +1 格违规 | `evaluateDensity` 注入 | 必红 |
| AC-V45-019 边界 | ×1.06 / 523,448 / 563,201 | `evaluateSidepanelSize` 注入 | 必红 |
| AC-V45-015 边界 | binding 段内 1 byte | 文件注入 | 必红 |
| EC-V45-001 | 空态 0 计数控件零渲染 | `test:density` 空态档 | ✅ |

## 7. 漂移检测

| 漂移类型 | 检测方法 | 预期 |
|---------|---------|:--:|
| 孤立代码（有代码无需求） | `git diff --name-status 08e3932..HEAD` 逐项归因 | ✅ 无（23 文件逐项可归因） |
| 需求缺失（有需求无代码） | 44 FR × 承载门禁矩阵 | ✅ 无 |
| 规格漂移（spec 被修改） | 叶子 `spec.md` `git log` + `diff` | ✅ 无（仅 269a0c5 创建） |
| 红线漂移 | `src/content/**` / `manifest.json` / `design/**` / v3 台账 / ROOT | ✅ 无 |

## 8. 结论

**结论**: 以 `validate-report.md` 的实测数据为准（三态：✅ 通过 / ⚠️ 有条件通过 / ❌ 不通过）。

## 9. 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建（V1~V10 独立动态验证策略；对抗优先 / 独立复算 / 不信自报） | 2026-09-21 | SDDU Validate Agent |
