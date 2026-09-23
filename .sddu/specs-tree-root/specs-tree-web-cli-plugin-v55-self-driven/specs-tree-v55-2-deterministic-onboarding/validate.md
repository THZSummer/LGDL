# 验证策略：specs-tree-v55-2-deterministic-onboarding（V5.5-2 主题① 确定性系统流）

> **文档定位**: SDDU 验证策略 — 自主定义 V1~VN 验证场景矩阵（验证对象 / 步骤 / 预期 / 维度 / 方法）与 AC 逐条映射；验证**结果**见 `validate-report.md`
> **前置依赖**: 本叶 `spec.md`（23 承载 FR / 10 本叶 NFR / 7 EC）、`review-report.md`（结论 ✅ 通过 / 0 BLOCK）、`build.md`（R1 + R2 收口段 + 小修轮段）、父 `../spec.md`（§5.5 / §5.9 X-SELF-3 / §5.12 S0 分支 B）
> **创建人**: SDDU Validate Agent
> **创建时间**: 2026-09-23
> **版本**: v1.0
> **更新人**: SDDU Validate Agent
> **更新时间**: 2026-09-23
> **更新说明**: 初始创建（代码类 Feature ⇒ 全五维度；V1~V15 场景矩阵 + 10 条父 AC 锚点逐条映射）

## 1. 验证对象来源与 Feature 类型

| 来源 | 提取对象 |
|---|---|
| `spec.md` §4 | 23 承载 FR（FR-SELF-040~052 / 102 / 107 / 110 / 111 / 113 / 115 / 116 / 120·123 / 131 / 134） |
| `spec.md` §5 | 10 本叶相关 NFR（009 确定性 / 003 安全 / 004 单源 / 007 反证 / 010 可逆 / 013 打扰 / 002 可用 / 008 无障碍 / 005 体积 / 006 兼容） |
| `spec.md` §6 | 7 EC（009 取消 / 010 外部完成 / 011 失效 / 012 空悬置 / 022 配置双套 / 004 双命中 / 020 保段） |
| `spec.md` §7 | 10 父 AC 锚点（001 / 003 / 007 / 012 / 013 / 016 / 017 / 020 / 025 / 026） |
| `build.md` | 文件变更清单（NEW 3 / MODIFY ·）；R1/R2/小修轮门禁读数；§8 差异 D1~D4 / E1~E5 / F1~F6 |
| 产物 | `dist/{sidepanel,content,pick-layer}.js`、`src/**`、`test/**`、`docs/v4-supersession-ledger.json`、`test/size-baseline.ts` |

**Feature 类型** = **代码类**（有 `src/` 代码 + `test/` 门禁 + API/运行期链路）⇒ **全五维度验证**（测试覆盖 / 接口数据 / 构建 / 性能·边界 / 漂移检测）。

## 2. 验证场景矩阵（V1~V15）

> 质量门槛：23 个 FR 每个 ≥1 个 Vx；五维度各 ≥1 条；下界 = max(23, 5×1) = 23 ⇒ 以「FR 覆盖 × AC 映射」展开为 15 个可执行场景（每场景覆盖多条 FR，逐条在 §3 映射）。

| # | 验证对象 | 验证步骤 | 预期结果 | 验证维度 | 验证方法 |
|:--:|---------|---------|---------|:--:|:--:|
| **V1** | **S0 分支 B 端到端**（FR-131 / AC-001） | ① node 亲跑 `s0-self-driven-chain`（S0N-7/8）；② Chromium 亲跑 `test:s0-self-driven` 的 `S0C-7` 真产品路径；③ 自写独立复刻脚本从真源派生 reading | 未配置 ⇒ detect 系统行 + 悬置 ⇒ `op.llm-config` chip ⇒ 三段 params（`secret`=password 掩码卡）⇒ 成功回执 ⇒ **自动续接** ⇒ 留痕逐字为原话；删自动续接 ⇒ FAIL | 接口数据 + 测试覆盖 | 自动化（node + Chromium + 独立脚本） |
| **V2** | **I-04 冷启动竞态**（FR-041/102 / AC-007/016） | 自写脚本验 `llmBlockedFactApplies` 真值 + 源码接线；亲跑 OD-17 | `applies(true,false)=true`（裁定单独成立）∧ `applies(false,true)=true`（被动保留）∧ `applies(false,false)=false`（非恒真）；主动分支显式传裁定 | 接口数据 | 自动化（独立脚本 + test:onboarding） |
| **V3** | **I-03 失败可重试**（FR-046/050 / EC-009） | 自写脚本验 `recordsDeclinedCause` 真值表 + 同因去重模拟 + 源码接线；亲跑 OD-18 | 仅 `cancelled/rejected` 记因；`failed` 不并入 ⇒ 同因引导保持可重试；取消路径仍 force 可达 next | 接口数据 + 性能·边界 | 自动化（独立脚本 + test:onboarding） |
| **V4** | **I-02 超容留痕**（FR-045 / R-SELF-904） | 真源驱动：登记第一条 ⇒ 第二条不同意图 ⇒ 读 `over-capacity` + pending；源码接线；亲跑 OD-19 | 第二条 ⇒ `over-capacity` ∧ 原任务（最早意图）优先保留；调用方消费返回值并 `dispatch` 留痕（口径「原任务优先保留」，不伪称「已被取代」） | 接口数据 | 自动化（独立脚本 + test:onboarding） |
| **V5** | **两场景 + 已配置零引导**（FR-043/051/052 / AC-013） | `onboardScenario` 真值表 + provider `when` 源文本判据 + 亲跑 OD-14 | `firstRun=T,configured=F`⇒`first-install`；`F,F`⇒`installed-unconfigured`（`via:'risk'`，不依赖 firstRun）；已配置⇒`none`；既有 `onboarding` provider 保留 | 测试覆盖 | 自动化（node） |
| **V6** | **取消非死端 + 同因不重复**（FR-046 / EC-009） | `suppressOnboardCause` 真值 + 源码接线（只压同因 / force 求值）+ 亲跑 OD-15 | 同因被压、新因照旧；取消走 `nextAfterSettle(force)` ⇒ 可达 next（非死端） | 接口数据 + 性能·边界 | 自动化（node） |
| **V7** | **门禁全量**（FR-110/113/115/116 / AC-016/026） | `typecheck` + `build` + `npm test`（基线 1283）+ 全部 node/Chromium 子门禁逐条亲跑 | 全绿、计数只增、`CHROMIUM_GATES=9`、`gate-integrity` 受审集合含新门禁 | 测试覆盖 + 构建 | 自动化 |
| **V8** | **注入反证抽验**（FR-111 / AC-017） | ① 真源删自动续接 ⇒ 跑 `s0-self-driven-chain` + `test:onboarding`；② 真源把 `failed` 并入去重 ⇒ 跑 `test:onboarding`；各还原后复绿 | ① S0N-7 必红（复现「配完还要重说一遍」）；② OD-18 必红；还原后 sha 逐字节一致 | 测试覆盖 | 自动化（真源注入 + git 还原） |
| **V9** | **红线 / 体积终核**（FR-049/120·123 / AC-012/020 / NFR-003/005/006） | 三冻结面 sha/字节；`KIND_SET` 40；`law8` 36/0；特权手势判据；`journey`/`binding` 保段；五要素复算；zeroDiff 路径排除 | content 177,076/`52a82620…`、pick 34,358/`77796bab…`、sidepanel 563,780；KIND_SET 40（无 `llm-unconfigured`）；法八 36/0；五要素 = 563,780 / 614,400 / 675,840 / 591,969 / `pending-author-line` | 性能·边界 + 构建 | 自动化（脚本 + 门禁） |
| **V10** | **配置判据 / 引导流单源 / 零 LLM / 零跳走**（FR-040/042/044/047/048/052 / AC-007） | OD-1~OD-9 逐条 + 源码扫描（`ONBOARD_STEPS` 恰 4 / 第二序列 ⇒ FAIL / 无 `#open-settings` / `status.ts` 零 LLM） | 判据恰 3 字段单源；引导恰 4 步单源；采集复用既有 `OP_PARAM_SEQUENCE`；零 provider 调用 / 零视图切换 | 测试覆盖 + 漂移 | 自动化 |
| **V11** | **`runChat` 前置判据源码序**（FR-040 / NFR-009） | OD-5：判据 < `chatBusy=true` < `providerChat(`；未配置 ⇒ `chat-result{variant:'llm-unconfigured'}` + early return | 零 provider 调用 / 零 token / 无 `llmErrorEvent`；判据先于 provider | 接口数据 | 自动化（源码序 + 注入） |
| **V12** | **双源并存 + 恢复链零改写 + X-SELF-3 台账**（FR-041/102/107 / AC-016） | OD-7 / OD-16 / `test:supersession`；`OPS_RECOVERY_ROWS` 逐字；台账条目可定位 | 被动保留 + 主动新增折叠同一 `risk` 源、幂等；恢复链零改写；台账 `X-SELF-3`/`X-SELF-3-SW` 落账且不伪称取代 | 测试覆盖 + 漂移 | 自动化 |
| **V13** | **悬置单源 / 有界 / 失效重校验 / 空悬置非死端**（FR-045/050 / EC-011/012 / NFR-010） | OD-10/OD-11/OD-12/OD-13 + 真源驱动 | 登记恰一处；超 `MAX=1` 拒；站点/会话变 ⇒ `invalidated` 不假成功；空 ⇒ 可达 next | 接口数据 + 性能·边界 | 自动化 |
| **V14** | **人工面如实 `⏳`**（FR-134 / AC-025） | 检查 Chromium 门禁末行人工面读数；确认无伪造 PASS | 引导文案可读性 / 主动引导体感 / 读屏掩码卡 = ⏳ 未执行，不冒充 PASS | 测试覆盖 | 手动（如实登记） |
| **V15** | **漂移检测**（NFR-004 / 全 FR） | ① spec 是否被 build 期改动；② 孤立代码；③ 需求缺失；④ 取代台账一致性 | spec 零改动；23/23 FR 有实现；严重漂移 0 | 漂移 | 自动化（git diff + 扫描）+ 手工比对 |

## 3. 父 AC 锚点逐条映射

| 父 AC | 判定要点（spec §7） | 覆盖场景 |
|---|---|:--:|
| **AC-SELF-001** | S0 分支 B 必判项：未配置 ⇒ 引导 ⇒ 掩码卡 ⇒ 完成 ⇒ **自动续接** ⇒ 留痕；反证删自动续接 ⇒ FAIL | **V1** / V8 |
| AC-SELF-003 | 法七扩展本叶面：未配置作为「已表达意图之后」的终态必有驱动者 | V1 / V12 |
| **AC-SELF-007** | 前置判据先于 provider；未配置 ⇒ 引导；步骤单源且逐步可判；零 LLM / 同输入同路径；零视图切换；掩码卡 + 法八不退化 | V2 / V6 / V10 / V11 |
| **AC-SELF-012** | 配置执行体唯一（`op.llm-config`）+ 法八不退化 | V9 / V10 |
| AC-SELF-013 | 首装 / 已装未配各自产出引导；`firstRun=false` 注入仍须产出 | V5 |
| AC-SELF-016 | 本叶主责门禁等价重锚清单逐项（含 X-SELF-3） | V7 / V12 |
| AC-SELF-017 | 反证不空转（每条新/改判据两段证据） | V8 / V10 |
| AC-SELF-020 | 本叶面计数只增 | V7 / V9 |
| AC-SELF-025 | 人工面逐项 `⏳` / `PASS` | V14 |
| **AC-SELF-026** | 本叶收尾全门禁绿 + 计数只增基线 | V7 |

## 4. FR → Vx 覆盖映射（23/23）

| FR | 覆盖 Vx | FR | 覆盖 Vx |
|---|---|---|---|
| FR-SELF-040 | V11, V10 | FR-SELF-102 | V12, V2 |
| FR-SELF-041 | V12, V2 | FR-SELF-107 | V12 |
| FR-SELF-042 | V10 | FR-SELF-110 | V7 |
| FR-SELF-043 | V5 | FR-SELF-111 | V8 |
| FR-SELF-044 | V10, V9 | FR-SELF-113 | V7 |
| FR-SELF-045 | V4, V13 | FR-SELF-115 | V7 |
| FR-SELF-046 | V3, V6 | FR-SELF-116 | V7 |
| FR-SELF-047 | V10 | FR-SELF-120/123 | V9 |
| FR-SELF-048 | V10 | FR-SELF-131 | V1 |
| FR-SELF-049 | V9 | FR-SELF-134 | V14 |
| FR-SELF-050 | V3, V13 | | |
| FR-SELF-051 | V5 | | |
| FR-SELF-052 | V10, V5 | | |

## 5. NFR / EC 覆盖映射

| NFR | 覆盖 Vx | EC | 覆盖 Vx |
|---|:--:|---|:--:|
| NFR-SELF-009 确定性 | V10, V11 | EC-SELF-009 取消 | V3, V6 |
| NFR-SELF-003 安全 | V9 | EC-SELF-010 外部完成 | V5 |
| NFR-SELF-004 单源 | V10, V13, V15 | EC-SELF-011 失效 | V13 |
| NFR-SELF-007 反证 | V8 | EC-SELF-012 空悬置 | V13 |
| NFR-SELF-010 可逆 | V13, V3 | EC-SELF-022 配置双套 | V9, V10 |
| NFR-SELF-013 打扰 | V6 | EC-SELF-004 双命中 | V12 |
| NFR-SELF-002 可用 | V9 | EC-SELF-020 保段 | V9 |
| NFR-SELF-008 无障碍 | V14, V9 | | |
| NFR-SELF-005 体积 | V9 | | |
| NFR-SELF-006 兼容读面 | V9 | | |

## 6. 不能验证 / 受限项（显式登记）

| 项 | 原因 | 处置 |
|---|---|---|
| `test:binding` 保护段 | 本机 CDP harness 环境性 flake（`#confirm-allow` / CDP socket），`binding.mjs` 不在本叶变更面 | 由 `test:supersession` 36/0 独立机核保段兜底（V9）；不冒充 PASS |
| 人工面（引导文案可读性 / 主动引导体感 / 读屏掩码卡） | headless 不可合成真人读屏 / 体感 | V14 如实 `⏳` |
| 跨 `options.html` 独立页完成配置触发续接（EC-010 口径） | 悬置活在面板内存；跨页仅刷新 `llm-status` | review O-05 已登记，随本轮登记 |

## 7. 结论判定标准

| 条件 | 要求 |
|---|---|
| FR 覆盖率 | 100%（23/23 有测试/判据且通过） |
| NFR 覆盖率 | ≥ 80% |
| 构建通过 | 退出码 0 |
| 严重漂移 | 0 项 |
| 阻塞问题 | 0 项 |

## 8. 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建（V1~V15 场景矩阵，对照 10 条父 AC 锚点 + 23 FR / 10 NFR / 7 EC 逐条映射；代码类 ⇒ 全五维度；受限项显式登记） | 2026-09-23 | SDDU Validate Agent |
