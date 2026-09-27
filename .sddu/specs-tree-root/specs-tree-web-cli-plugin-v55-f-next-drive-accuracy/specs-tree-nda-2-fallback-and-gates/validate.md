# 验证策略：specs-tree-nda-2-fallback-and-gates

> **文档定位**: SDDU 验证策略 — 指导 validate Agent 执行自主验证的场景和方法；验证结果见 `validate-report.md`
> **前置依赖**: `spec.md`（v1.0）、`plan.md`（v1.0 + ADR-NDA-201/202）、`build.md`（v1.1，21/21 + R1 修复轮）、`review-report.md`（R1，⚠️ 有条件通过 / 0 阻塞）
> **创建人**: SDDU Validate Agent
> **创建时间**: 2026-09-27
> **版本**: v1.0
> **更新人**: SDDU Validate Agent
> **更新时间**: 2026-09-27
> **更新说明**: 初始创建（叶2 兜底与判据叶验证策略：自主从 spec（8 目标 / ≈42 父 FR 切片 / 16 NFR / 15 EC）+ plan + 产物提取验证对象，设计 V1~V14 场景矩阵，五维度全覆盖；本叶 = 代码类 Feature → 全维度验证）

---

## 1. 验证概要（策略基线）

> 本节登记**策略阶段**的目标基线；逐项**实测数据**见 `validate-report.md` §1/§2。

| 维度 | 策略基线（来自 spec/plan/build 声明） | 验证归属 |
|------|---------|:--:|
| FR 覆盖 | 8 个目标（LG-NDA-2-001~008）承载 ≈42 父 FR 切片，逐目标 ≥1 Vx | V2~V14 |
| NFR 覆盖 | NFR-NDA-001~016（体积 / 单源 / 零死端 / 判定可判 / 法八零明文 …） | V1 / V5~V13 |
| 构建 | `typecheck` rc=0 ∧ `build` rc=0 ∧ 冻结面逐字节不变 | V1 |
| 门禁 | `npm test ≥1525` / `ai-next-candidate 28` / `supersession ≥56` / `gate-integrity ≥27` / `size-ruling-vol3 ≥14` / `law8 ≥72` / `dead-end ≥56` / `recommendation ≥85` / `s0-self-driven`（隔离 ×2） / `insight` / `density` / `e2e` | V2~V4 |
| 体积 | A 列 606,652 B（距档 7,748）∧ B 列不计账 ∧ 三值同源 ∧ EC-NDA-016 三分支皆「否」 | V1 / V10 |
| 漂移 | spec 零漂移 ∧ 断言零删除（`assertionsRemoved=0`）∧ 门禁守恒（`CHROMIUM_GATES===9`）∧ 零改基座 | V11~V13 |
| 阻塞 | 0 | 全程 |

**Feature 类型判定**：**代码类 Feature**（有 `src/` 源码、`test/` 套件、可执行门禁、dist 产物）⇒ 全五维度验证（测试覆盖 + 接口数据 + 构建 + 性能边界 + 漂移检测）。

---

## 2. 自主验证场景（V1~V14）

**验证对象来源**：
- `spec.md`：8 目标 / ≈42 父 FR 切片 / 16 NFR / 15 EC → 逐项验证实现完整性与验收锚
- `plan.md` + ADR-NDA-201/202：`next-drive-policy.ts` / `AiNextPayload.abnormal?` / `free-input.when` 分相 / `llm.abnormal` 第 13 行 / 门禁 12→13 → 覆盖完整性验证
- `build.md` §1/§6 + `review-report.md` §5：门禁声明 + I-1~I-6 → 独立复跑 + 反证
- `src/` + `test/` + `dist/`：源码（生产模块）/ 测试 / 构建产物 → 行为实测 + 字节机核

**质量门槛**：每个目标 LG-NDA-2-00x ≥ 1 个 Vx；每个维度 ≥ 1 条；Vx 总数 = max(8, 5×1) 起底 ⇒ 实际 **V1~V14**（14 条，满足）。

| # | 验证对象 | 验证步骤 | 预期结果 | 验证维度 | 验证方法 |
|---|---------|---------|---------|---------|---------|
| **V1** | 构建完整性 + 体积字节（NFR-NDA-001 / FR-NDA-141~145） | 1. `npm run typecheck`；2. `npm run build`；3. `stat -c %s` 四个 dist 产物；4. `sha256sum` 两冻结面 | rc=0；`sidepanel.js`=606,652 ∧ `background.js`=1,666,653 ∧ `content.js`=177,076/`52a82620…` ∧ `pick-layer.js`=34,358/`77796bab…` | 构建 + 性能边界 | 命令 + 字节机核（脚本） |
| **V2** | 全量回归套件（AC-NDA-020，断言零删除） | `npm test` | ≥1525 tests，0 fail，rc=0 | 测试覆盖 | `npm test` |
| **V3** | 定向门禁（AI 驱动 / 取代 / 门禁完整性 / 体积裁决） | `node --test dist-test/test/{ai-next-candidate,supersession-ledger,gate-integrity,size-ruling-vol3}.test.js` + `AI-N-17` 定向 | 28/0 · ≥56/0 · ≥27/0 · ≥14/0 · AI-N-17 定向 1/0 | 测试覆盖 | `node --test` |
| **V4** | Chromium / UI 面门禁（法八 / 死端 / 推荐 / 自驱链 / insight / density / e2e） | `node test/ui/{law8-plaintext,no-dead-end,recommendation,s0-self-driven,insight,density}.mjs` + `node test/e2e/fullchain.mjs` | law8 72/0 · dead-end 56/0 · recommendation 85/0 · s0-self-driven 观察 · insight PASS · density 242/0 · e2e PASS | 测试覆盖 | Chromium 脚本 |
| **V5** | **I-1 新边界（review 优先核对项）**（FR-NDA-070/073，LG-NDA-2-004/005） | 1. 直接调 `abnormalVerdict`：`captured=true,accepted=0,blocked=0 ⇒ null`；`captured=false ⇒ no-tool-call`；2. **注入①** 删 policy 的 `if (f.captured) return null;`；3. **注入②** 删 SW 的 `, captured: capture.captured`；各跑 `AI-N-17`；4. 逐字节还原复绿 | 直读两方向分相 ∧ 两注入各「必红」∧ 还原后绿 | 接口数据 + 漂移 | 独立脚本 + 源码注入（脚本） |
| **V6** | 作者口径①**未配置**（FR-NDA-050~056，LG-NDA-2-001/002） | 独立脚本：`free-input.when(risk=['llmBlocked'])` ∧ `recommendNextStep(risks=['llmBlocked'])` 卡 | `when=false` ∧ 卡 `terminal!==true` ∧ chip `op.llm-config` 文案「配置 LLM 凭据（写入本机 · 掩码）」可达 ∧ 零死端 | 接口数据 | 生产模块直读（脚本） |
| **V7** | 作者口径②**已配置恒常驻**（FR-NDA-052，AC-NDA-018） | 独立脚本：`free-input.when(risk=[])` ∧ `recommendNextStep()` 卡 | `when=true` ∧ 卡 `terminal===true`（R8/F-35 不回归） | 接口数据 | 生产模块直读（脚本） |
| **V8** | 作者口径③**提醒补一次有界**（FR-NDA-060~066，LG-NDA-2-003） | 独立脚本：`shouldNudge` 五条件真值表（含 `nudgeUsed=true ⇒ false` / `configured=false ⇒ false`）+ `AI-N-16` 门禁 | 五条件齐 ⇒ true；有界 / 未配置 / 已捕获 / 有 toolCalls / 无回复 ⇒ false；置位先于续呼 | 接口数据 + 测试覆盖 | 生产模块 + `node --test` |
| **V9** | 作者口径④**异常兜底链**（FR-NDA-070~076，LG-NDA-2-004/005） | 独立脚本：三情真值表 + `llm.abnormal.when` 分相 + `recommendNextStep(risks=['llmAbnormal'])` 卡 + `AI-N-18` 门禁 | `no-tool-call`/`llm-failed`/`all-blocked` 可判；`when(llmAbnormal)=true` ∧ `when(llmBlocked)=false` ∧ `when([])=false`；兜底 chip `op.llm-config` 文案「配置新的 LLM（切换 / 重配）」可达 ∧ 已配置终端恒常驻 | 接口数据 + 测试覆盖 | 生产模块 + `node --test` |
| **V10** | 红线（零改基座 / 冻结面 / 保护段 keep）（NFR-NDA-005，FR-NDA-142 / GATE 130~137） | `git diff --stat`（基座 / ROADMAP / opencode.json / journey / binding / 判定链）+ 分段 `sha256`（journey `[43484,59347)` / binding `[107780,115930)`） | 全部 diff 空；journey 段 sha `7b309258…` ∧ binding 段 sha `be9ad0e9…` 命中 | 漂移 | git + 分段哈希（脚本） |
| **V11** | 载体守恒（NFR-NDA-007/013，FR-NDA-075） | 独立脚本从编译产物读：`KIND_SET`/`ACT_TO_OP`/`REGISTERED_STRUCTURAL_HOSTS`/`BLOCKED_TERMINALS`/`OPS_RECOVERY*`/`RECOVERY_PROVIDER_IDS`/`DRIVER_TERMINALS`/`PROACTIVE_MOMENTS`/`DRIVER_TIMINGS`/`DRIVER_DECLS_SRC`/`CHROMIUM_GATES` | 40 / 6 / `[]` / 5 / 2·2 / 5 / 4 / 7 / 5 / 13 / 9 逐字 | 性能边界 + 漂移 | 编译产物直读（脚本） |
| **V12** | 台账终态 + 断言零删除（FR-NDA-112/113/119/120/122，AC-NDA-022/023） | 结构化机核 `docs/v4-supersession-ledger.json` | `xNdaLedger`=12 ∧ `xNdaGateReconciliation`=25（`assertionsRemoved` 全 0 / 无「未处置」）∧ `xNdaLedgerFull`=7/1/4（keep 子项 9） | 漂移 + 性能边界 | JSON 机核（脚本） |
| **V13** | 漂移检测（孤立代码 / 需求缺失 / 规格漂移 / 命名 I-2） | 1. 工作树改动集 vs plan §5 对账；2. test( 调用点 HEAD vs 工作树；3. `spec.md`/`plan.md` mtime + 旧名残留扫描 | 无孤立 / 无缺失；test( 只增不减；spec mtime 停在 spec 相位；叶内旧名零残留 | 漂移 | git + grep（脚本） |
| **V14** | `KL-N-10` 环境 flake 隔离复跑（EC-NDA-025，FR-NDA-136） | `s0-self-driven` 工作树隔离复跑 ×2；`recommendation` 三跑对比失败项签名 | 失败项随复跑漂移（同根因 `probe.steady` 时序）⇒ 判 flake，如实记录不阻塞 | 测试覆盖 | 隔离复跑（脚本） |

> **维度覆盖自检**：测试覆盖 V2/V3/V4/V8/V9/V14；接口数据 V5~V9；构建 V1；性能边界 V1/V10/V11/V12；漂移 V10/V11/V12/V13 —— **五维度全覆盖**。
> **无法执行项声明**：真实 LLM 观感（I-6 / PD-NDA-016）与人工面 M1~M6 需真实浏览器 + 人工观察，本环境不可执行 ⇒ 标注 ⏭️ 并如实登记。

---

## 3. 测试覆盖验证（策略）

### 3.1 功能需求（8 目标 → ≈42 父 FR 切片）— 目标覆盖率 100%

| 目标 | 承载父 FR | 对应 Vx |
|---------|----------|:--:|
| LG-NDA-2-001 未配置确定性引导 | FR-NDA-050/054/055/056 | V6 |
| LG-NDA-2-002 自由输入分相 | FR-NDA-051/052/053 | V6 / V7 |
| LG-NDA-2-003 提醒补一次 | FR-NDA-060~066 | V8 |
| LG-NDA-2-004 异常判定闭集 | FR-NDA-070/071/075 | V5 / V9 |
| LG-NDA-2-005 系统兜底推荐 | FR-NDA-072~076 | V9 |
| LG-NDA-2-006 首开边界 | FR-NDA-090~093 | V4（S0C-16/onboarding） |
| LG-NDA-2-007 S0'''' 终态 + 人工面 | FR-NDA-100/103/104 | V3 / V4 |
| LG-NDA-2-008 体积 + 门禁 + 台账终态 | FR-NDA-112/113/119/120/122/130~137/141~145 | V1 / V10 / V11 / V12 |

### 3.2 非功能需求（16 条）— 目标覆盖率 ≥80%

| NFR | 验证方式 | 对应 Vx |
|---------|----------|:--:|
| NFR-NDA-001（体积从紧） | A 列字节 + 三值同源 | V1 |
| NFR-NDA-002/003（特权 gesture / consent 不代答） | `AI-N-18` `pressDecision=blocked:tier` | V3 / V9 |
| NFR-NDA-004（法八零明文） | `law8` NDA-2 ⑬ | V4 |
| NFR-NDA-005（base 零 diff / 判定链零触碰） | `git diff` | V10 |
| NFR-NDA-007/013（零新载体 / 单源） | 常量机核 + 面板零第二分类器 | V11 |
| NFR-NDA-009/014（判定可判 / 提醒有界可判） | 真值表 + 注入反证 | V5 / V8 |
| NFR-NDA-010（零死端） | `no-dead-end` ND-11 + 未配置/异常相 | V4 / V6 / V9 |
| NFR-NDA-015/016（唯一有界往返 / 留痕可判） | `AI-N-16` providerChat=1 | V3 / V8 |

---

## 4. 接口与数据实测（策略）

本 Feature 无对外网络 API；「接口」= 生产模块的**行为契约**（provider `when` / 卡片产出 / 纯函数判据）。以独立脚本 + 门禁直读生产模块验证，见 V5~V9。

## 5. 构建与脚本验证（策略）

`npm run typecheck` / `npm run build` 退出码 + dist 字节/sha，见 V1。

## 6. 性能与边界验证（策略）

无时延/吞吐 NFR；性能边界 = **体积**（A/B 列、三值同源、距档、EC-NDA-016 三分支）+ 载体守恒，见 V1 / V10 / V11 / V12。

## 7. 漂移检测（策略）

孤立代码 / 需求缺失 / 规格漂移 / 命名对齐 / 断言零删除 / 门禁守恒，见 V10~V13。

## 8. 结论（策略）

**策略结论**: 场景矩阵就绪（V1~V14，五维度全覆盖，每目标 ≥1 Vx）。

| 指标 | 策略门槛 |
|------|------|
| FR 覆盖率 | 100%（8/8 目标） |
| NFR 覆盖率 | ≥80%（16 条） |
| 构建 | rc=0 |
| 漂移 | 0 项 |
| 阻塞 | 0 项 |

**理由**: 本叶价值在「可判性」——策略以**独立复跑**（不采信自报）+ **注入必红**（判据可 FAIL）+ **字节/哈希机核**（治理不失血）三条线覆盖全部四链（未配置引导 / 分相 / 提醒 / 兜底）与治理面（体积 / 门禁 / 台账 / 红线）。

---

## 9. 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建（叶2 验证策略：V1~V14 场景矩阵；五维度全覆盖；FR 8 目标 / NFR 16 条；I-1 新边界与作者口径端到端列为本叶题眼） | 2026-09-27 | SDDU Validate Agent |
