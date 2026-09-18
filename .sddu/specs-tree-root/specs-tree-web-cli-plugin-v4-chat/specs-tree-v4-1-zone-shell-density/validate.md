# 验证报告：specs-tree-v4-1-zone-shell-density

> **文档定位**: SDDU 验证策略 — 指导 validate Agent 执行自主验证的场景和方法；验证结果见 `validate-report.md`
> **前置依赖**: 本叶 `spec.md` v1.0、`build.md`（R1~R3 + review 修复轮）、`review-report.md` R1（⚠️ 有条件通过 / **0 阻塞** / 13 改进项，passed）、父 `../spec.md` §12 裁决记录、`docs/v4-density-baseline.{json,md}`、`docs/v4-supersession-ledger.json`
> **创建人**: SDDU Validate Agent
> **创建时间**: 2026-09-19
> **版本**: v1.0
> **更新人**: SDDU Validate Agent
> **更新时间**: 2026-09-19
> **更新说明**: 初始创建（R1 策略：V1~V8 验证场景矩阵 + 对抗探针设计；**独立复算 + 对抗优先**）

---

## 1. 验证概要

| 维度 | 计划 | 达标基准 |
|------|---------|:--:|
| FR 测试覆盖 | 15 个 FR-CHAT（004 / 010~017 / 070~075） | 100%（每个 FR ≥ 1 个 Vx 且有机器证据） |
| NFR 测试覆盖 | 5 个 NFR-CHAT（002 / 004 / 008 / 009 / 010） | ≥ 80% |
| 构建 | typecheck + build | 退出码 0 |
| 接口/数据一致性 | 产物字节 / metafile / 密度登记格 / journey pin / 台账计数 | 逐项与登记值一致 |
| 漂移项 | 红线零 diff / 孤立代码 / 需求缺失 / 规格漂移 | 0 项严重漂移 |
| 阻塞问题 | — | 0 项 |

**被验基线**：仓库 `/home/usb/wks/gits/GitHub/LGDL` · 分支 `feature/web-cli-plugin` · HEAD `4c3169f`（review 修复轮提交）· 本叶 diff 基线 `187c205`（leafBase）· 工作区干净（`git status --porcelain` 空）。

**验证纪律**：
1. **不信任 build/review 的自报** —— 所有计数、pin、字节、行数**全部亲手复算**（Python/sha256sum/`wc`），门禁**全部独立串行复跑**。
2. **对抗优先** —— 本轮最大风险是「换口径 = 放松」。V2 五条 + 滥用形态 + V3 两条注入由验证 Agent **自己动手注入 → 观测红 → 还原 → 观测绿**，探针产物落 `/tmp/opencode/v4-validate-v4-1/`。
3. **扰动一律可还原** —— 任何落盘扰动前后做 sha256 对照；运行期 DOM 扰动只存在于被测浏览器会话。
4. **Feature 类型自适应**：本叶为**代码类**（TS 模块 + Chromium 门禁 + 静态契约），全五维度覆盖；无服务端 API/数据库 schema，故「接口与数据」维度改写为**产物级数据契约**（产物字节 / metafile 归因 / 密度登记格 / pin / 台账 counts）。

**验证对象来源**：
- `spec.md`：FR-CHAT-004/010~017/070~075 + NFR-CHAT-002/004/008/009/010 + EC-CHAT-004/007/010/013/014 + AC-CHAT-004~009/022/023/025
- `plan.md`：ADR-V4-017~023（尤其 ADR-V4-020 三条防滥用反证、ADR-V4-021 登记格、ADR-V4-023 门禁规程）
- `review-report.md`：I1~I13（13 项改进项 → 逐条抽验修复落地）
- 实际产物：`dist/{sidepanel,content,pick-layer}.js`、`dist/build-meta.json`、`src/ui/sidepanel/**`、`test/**`、`docs/v4-*`

---

## 2. 自主验证场景（V1~V8）

| # | 验证对象 | 验证步骤 | 预期结果 | 验证维度 | 验证方法 |
|---|---------|---------|---------|---------|---------|
| **V1** | 门禁集合（19 项串行 + RP-V4-01~07） | 1. 自写串行脚本逐项跑 19 门禁；2. 逐项抓退出码/计数；3. 与 build.md §B.6/§B.8 与 v4 台账逐项比对 | 19 项退出码 0；计数与报账逐项一致（差异必须可解释） | 测试覆盖 + 构建 | 自动化（`run-gates.sh`，日志全量落盘） |
| **V2** | 密度防滥用与豁免口径（FR-CHAT-070~075） | 自写 Chromium 驱动，逐条注入对抗态：① 工具栏控件移入 `#stream`（带/不带标记）；② 单卡第 7 可点；③ CSS 隐身；④ 首屏第 3 卡；⑤ 第 2 张欢迎卡 / 欢迎文本 >8 行；⑥ 滥用形态：6/7 个常驻入口塞入流内卡；⑦ 工具栏第 6 可点驱动 `render()`；⑧ 三视口可点/零溢出；⑨ chars 容差注入差 4 | 每条「注入 → 必红 → 还原 → 必绿」，且**红必须由产品/门禁自身的判据给出**（不是探针自说自话） | 测试覆盖 + 性能边界 + 漂移 | 自动化 + 手动注入（探针驱动 + 真门禁静态注入） |
| **V3** | journey 取代完整性（FR-CHAT-082 / AC-CHAT-017） | 1. Python 独立切片复算新旧 pin（byte/sha256/行数）；2. 复算保护段与全文件 `check(` 计数；3. 静态注入 0.60 比例布局 → 跑真 journey 看 `#15b`；4. 静态注入常驻可见输入框 → 看 `#15c`；5. binding 保护段 187c205↔HEAD 逐字节比对 | pin 逐字一致；计数零降；两条注入必红且还原必绿；binding 保护段字节零改 | 漂移 + 测试覆盖 | Python 复算 + 真门禁注入 |
| **V4** | 体积真值与归因（NFR 相关 / 父 ADR-V4-010） | 1. `stat`/sha256 `dist/sidepanel.js`；2. 逐模块归因 11 行 vs 真实 metafile；3. ceiling 公式复算；4. `PENDING_ABSOLUTE_CAP` 状态；5. inputs 计数 | 385,319 B == 登记值；11 行 afterBytes 全命中 metafile；Σ+glue == 10,217；ceiling=404,584；cap 仍 `resolved:false` 且未预填 | 接口数据 + 构建 | Python 脚本 + 真 metafile |
| **V5** | review 修复落地（I1~I13） | 逐条抽取关键证据：I1/I2 台账字段 + 新增断言；I3/I13 数字订正；I4 工具栏 FAIL 段实跑；I5 theme 单测 + EC-CHAT-014；I6 容差收紧 + 根因；I7 宿主 4；I8 inputs 57；I12 反向 ARIA 断言 | 每条「修法可核 + 反证可 FAIL + 断言只增」 | 测试覆盖 + 漂移 | 只读核对 + 源文件实跑 + 探针 |
| **V6** | 三区行为（AC-CHAT-007/008/022） | 1. 工具栏可点 320/400/520 恰 5；2. `#region-statusbar` chips 展开态流区高度占比 ≥0.65（3 格）；3. 占位宿主计数 == 4；4. 明暗主题可读 | 三视口 ≤5 且零水平溢出；展开态 ≥0.65；宿主 ==4；双主题可读且不只靠颜色 | 性能边界 + 测试覆盖 | 探针驱动 + 真门禁日志 |
| **V7** | 规范符合性（AC-CHAT-004~009/022/023/025） | 逐条 AC 找机器证据（门禁断言 / 实跑日志）判定 满足 / 部分 / 不满足 | 9 条 AC 全部「满足」（部分满足须给出缺口与影响说明） | 漂移 | 只读核对 + 门禁日志 |
| **V8** | 红线与守恒终核（父 ADR-V4-004/011） | 1. `git diff --stat 187c205..HEAD` 全量核对不动面；2. 产物 sha256；3. 密度阈值逐字；4. `CHROMIUM_GATES.length` / `EXPECTED_AUDITED_FILES` 未动；5. 测试守恒账（静态 `check(` / 台账 counts） | 不动面零 diff；阈值逐字；门禁集合未缩；计数只增不减 | 漂移 | git diff + sha256 + grep + 计数 |

**质量门槛核对**：FR 15 条 → V1/V2/V3/V5/V6/V7 覆盖全部 15 条；NFR 5 条 → V1（009）、V3（009）、V4（010）、V6（002/004/008）、V7（全）；EC 5 条 → V1/V5/V6/V7。相关维度（测试覆盖 / 接口数据 / 构建 / 性能边界 / 漂移）各 ≥1 条，合格。

---

## 3. 测试覆盖验证（策略）

| 需求 | 覆盖场景 | 覆盖方式 |
|------|---------|---------|
| FR-CHAT-004（风险永不折叠语义新判据） | V1 / V6 / V7 | `test:l0` ④ J1~J4 + EC-CHAT-010；状态栏本体无 hidden |
| FR-CHAT-010（三区结构/顺序/语义） | V1 / V7 | `density-thresholds.test.ts` 静态三区 + `l0` ① |
| FR-CHAT-011（工具栏 ≤5 + 徽标 + 只读摘要） | V2 / V6 / V7 | `l0` ②/⑨ + 单测 `toolbar` + 探针 P8 |
| FR-CHAT-012（法一静态） | V7 / V8 | `density-thresholds.test.ts` 法一静态半 |
| FR-CHAT-013（状态栏常驻） | V1 / V6 / V7 | `l0` ④ J1/J2 |
| FR-CHAT-014（法四） | V2 / V3 / V7 | `l0` ③/⑪ + journey `#15c`（含注入） |
| FR-CHAT-015（L2 视图替换） | V1 / V7 | `test:l2` + `l1` ① |
| FR-CHAT-016（法则六管理操作入视图） | V1 / V7 | `l1` ① + `#authorize/#revoke` 静态归属 |
| FR-CHAT-017（风险 chip 形态） | V1 / V7 | `l0` ④/⑤/⑥ |
| FR-CHAT-070（测量根/豁免单源） | V2 / V4 | `density` stage F + 单源扫描 |
| FR-CHAT-071（豁免只认 hidden） | V2 | 探针 P3 |
| FR-CHAT-072（单卡 ≤6） | V2 | 探针 P2/P6 + RP-V4-01 |
| FR-CHAT-073（首屏 ≤2） | V2 | 探针 P4/P5 + RP-V4-02 |
| FR-CHAT-074（阈值保留 + 登记格重算） | V1 / V4 | `density` 169→171 / 真门禁 171 断言 |
| FR-CHAT-075（可 FAIL 反证含滥用反证） | V2 / V3 | 探针 P1/P6 + RP-V4-06 + 真门禁静态注入 |
| NFR-CHAT-002（320–560 零溢出） | V6 | 探针 P8（320/400/520 overflowX=0）+ `l0` ⑩ |
| NFR-CHAT-004（无障碍） | V1 / V5 | `l0` ⑥/⑧/⑧b |
| NFR-CHAT-008（双主题三态） | V5 / V6 | `theme.test.ts` 19 条 + `l0` ⑬ |
| NFR-CHAT-009（门禁串行/日志/反证） | V1 / V3 | 自写串行链 + 全量日志 + 注入实跑 |
| NFR-CHAT-010（口径同源可交叉复算） | V2 / V4 | 探针与门禁共用 `density-metrics.mjs` 纯函数 |

---

## 4. 漂移检测（策略）

| 漂移类型 | 检测方法 |
|---------|---------|
| 孤立代码（有代码无需求） | 本叶新增/改动文件逐一对 FR/ADR 溯源（`build.md §2` 清单 vs `git diff --name-only`） |
| 需求缺失（有需求无代码） | 15 FR × 15 AC × 5 EC 逐条找机器证据（V7） |
| 规格漂移（spec/redline 被改） | `git diff 187c205..HEAD -- spec.md/manifest/src/content/security/background/options/design/v3-*` 必须为空 |
| 门禁集合漂移 | `CHROMIUM_GATES.length`、`EXPECTED_AUDITED_FILES`、密度阈值字面量逐字比对 |

---

## 5. 结论（策略）

判定规则：**每个 FR 有机器证据且通过** + **19 门禁绿（退出码 0）** + **红线零改动** + **0 阻塞** ⇒ ✅ 通过；非阻塞偏差（登记保真 / 断言强度类）⇒ ⚠️ 有条件通过；存在未覆盖 FR / 构建失败 / 严重漂移 ⇒ ❌ 不通过。

**执行结果见 `validate-report.md`。**

---

## 6. 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建（R1 策略：V1~V8 场景矩阵；对抗优先——V2/V3 注入探针为核心交付；Feature 类型自适应为代码类全维度） | 2026-09-19 | SDDU Validate Agent |
