# 验证策略：specs-tree-v55f-1-ref-context-and-anchor（V5.5F-1 范围底座：引用事实进回合 + 范围读数 + `--ref` 锚定）

> **文档定位**: SDDU 验证策略 — 定义本叶 V1~V10 验证场景与方法；逐项**实测**结果见 `validate-report.md`
> **前置依赖**: 本叶 `spec.md` v1.0（≈62 条父 FR 切片 / 15 NFR 面 / 20 EC 面 / 12 AC 锚点）+ `review-report.md` v1.0（R1 结论 **✅ 通过**，37 Cx / 0 BLOCK / 2 I / 6 O；对象 HEAD `42cf28d`，I-01/I-02 于 `6b9b982` 微修闭环）+ 本叶 `plan.md` v1.0 + 父 ADR-SGO-001~008
> **创建人**: SDDU Validate Agent
> **创建时间**: 2026-09-24
> **版本**: v1.0
> **更新人**: SDDU Validate Agent
> **更新时间**: 2026-09-24
> **更新说明**: 初始创建（对抗优先的 V1~V10 场景矩阵；策略先于报告产出）

---

## 1. 验证概要

| 维度 | 目标 | 达标线 |
|------|------|:--:|
| FR 测试覆盖 | 本叶承载的父 FR 切片逐条 ≥ 1 个 Vx 且实测通过 | 100% |
| NFR 测试覆盖 | 15 NFR 面逐条有实测证据或如实标注 | ≥ 80% |
| EC 边界覆盖 | 20 EC 逐条有实测证据或如实标注（本叶子集） | ≥ 80% |
| 构建 | `npm run build` 退出码 0 ∧ 冻结面逐字节可复现 | 退出码 0 |
| 对抗红绿 | 注入/伪造必须**判红**，逐字节还原必须**判绿**（非恒真） | 0 空转 |
| 严重漂移 | 0 项 | 0 |
| 阻塞问题 | 0 项 | 0 |
| 人工面 | 语义遵从观感 / SPA 锚定提示可理解度 = `⏳`（不冒充 PASS） | 如实 |

**Feature 类型判定**：**代码类**（`src/**` + `test/**` + 构建产物 + Chromium 真机门禁）⇒ 全五维度验证（测试覆盖 / 接口数据 / 构建 / 性能边界 / 漂移检测）。

**核心断言（编排点名）**：S0′ 的 **S0P-4 改写处数 ≤ 引用数**（注入 extraWrites 必红）与 **S0P-7 去注入 no-ref 必红 + sha 还原绿**；法九四值行为级可判 + 第二声明必红；`--ref` 合成锚恰 1 命中 + 失配非静默 + risk 不放宽。

---

## 2. 自主验证场景（V1~V10）

**验证对象来源**：
- `spec.md`：FR-SGO-001~006 / 010~019 / 020~028 / 030~038 / 070~077 / 080·083·084 / 090~094 / 100~107 / 110~116 / 120~125 + 15 NFR + 20 EC + 12 AC
- `build.md`（R1+R2）+ `review-report.md` 中的**声明值**（门禁计数、红线 sha、体积五要素、S0′ 双面读数）
- 实际产物：`src/**`（ref-scope / ref-turn / ref-context / dom-anchor / ref-observe / 接线）+ `dist/**`（红线与体积）+ `test/**` 门禁

**对抗优先原则**：每个「声明」都要有一条**可判红**的反证（删掉机制 ⇒ 同一判据必须 FAIL）；每条红线 / 体积 / 锚定面都要**独立复算**（不复用仓库测试的断言，自写探针）。

| # | 验证对象 | 验证步骤 | 预期结果 | 验证维度 | 验证方法 |
|---|---------|---------|---------|---------|---------|
| **V1** | 门禁全量复跑 + 计数对账（AC-SGO-017~022 / FR-SGO-110~116） | ① `npm test`（node 全量）；② 逐门禁单独复跑取计（law9 12 / ref-context-in-turn 9 / dom-ref-anchor 7 / s0-self-driven-chain 24 / gate-integrity 20 / supersession 39 / insight-no-escalation 20 / op-wiring 14 / l1-ref-validity 21）；③ 与 build/review 声明值对账 | 全绿 + 计数**只增**（基线 1375） | 测试覆盖 + 构建 | 串行复跑（Chromium 门禁严格串行）+ 计数对账 |
| **V2** | **法九行为级**（AC-SGO-003 / FR-SGO-020~028 / 070~077） | ① 生产判定函数逐值判四值（`no-ref` / `in-scope` / `out-of-scope-unauthorized` / `out-of-scope-authorized`）；② `authorized` 是否**纯输入事实**（同目标跨值）+ 生产 confirm 面是否**恒 false**（不自判）；③ 第二声明 / 第二判定函数注入 ⇒ 必红；④ 写闸 deny/pass / no-ref 不阻断；⑤ 三段控制 `ok`/`violated`/`n/a` 非布尔 | 四值互异可判；authorized 只由输入（用户确认）产生；第二声明必红 | 接口数据 + 测试覆盖 | 自写探针（直接驱动生产 `scopeReading` / `scopeWriteGate` + 真源切片判据） |
| **V3** | **`--ref` 行为级**（AC-SGO-007 / FR-SGO-030~038 / EC-SGO-001~004/015~017） | ① `--ref 1` → 合成锚 `[data-wcli-ref="ref_1"]`；② `--ref`+`--selector` ⇒ 拒；③ 读命令 `--ref` ⇒ 拒；④ 词法 / 越界 / 失效逐条拒；⑤ live 单节点闸：`nodeCount===1` 唯一通过，0 / 多命中 / 标记缺失 / 不可达 ⇒ 失配（非静默）；⑥ 失配 ⇒ 基线 executor **不被调用**；⑦ `risk` 逐字段对照 base + 降档注入必红 | 合成锚恰 1 命中；失配 fail-closed 非静默；risk 不放宽 | 接口数据 + 测试覆盖 | 自写探针（`resolveRefAnchor` / `wrapDomEntryForAnchor` + 假观测缝；真 DOM 恰 1 命中由 V6 机核） |
| **V4** | **refs 载荷端到端**（AC-SGO-002 / 011 / 012 / FR-SGO-010~019 / NFR-SGO-009） | ① 真拾取（store judge=valid）⇒ `turnRefsOf` 唯一构建点 ⇒ `makeMessage('chat', …)` ⇒ SW `validateRefPayload` ⇒ `refContextSegment`；② 无引用回合 ⇒ `refs` 字段**缺席** ⇒ `system===SYSTEM_PROMPT` 逐字；③ 凭据形 mask 单点；④ holder 每回合 set/clear + 排队快照；⑤ 静态：两入口同构建点 / SW 唯一来源 | 载荷与拾取同源；零引用零漂移；只取 valid | 接口数据 + 漂移检测 | 自写探针（生产模块驱动，不经测试 seam） |
| **V5** | **S0′ node 面独立复刻**（AC-SGO-001 / 013 / 014 / FR-SGO-090~092） | ① 自建读数驱动共享纯判据 `s0pProblems`（S0P-1~8 正读全绿）；② **S0P-4**：注入 `extraWrites`（改写 2 > 引用 1）⇒ 必红；③ **S0P-7**：去注入 ⇒ 载荷无引用 ∧ no-ref ∧ 判据必红；伪造 no-ref 为 in-scope ⇒ 必红；真源切片改判 ⇒ 必红 + sha 还原绿；④ S0P-4 真源切片：写目标 = 合成锚恰 1 次写 | 核心断言承重、判据非恒真 | 测试覆盖 + 接口数据 | 自写探针（生产模块 + 共享样本 `s0-chain.mjs`） |
| **V6** | **S0′ Chromium 面**（AC-SGO-001 / 026 / FR-SGO-090 / 094） | 亲跑 `test/ui/s0-self-driven.mjs`：真面板回合载荷含引用事实（S0P-C1）、系统段追加段在位（S0P-C2）、**合成锚在真 DOM 恰 1 命中 ∧ 注入第二节点 ⇒ 2**（S0P-C3）、范围留痕独立成行（S0P-C4）、样本单源（S0P-C5）；人工面 M1/M4 = `⏳` | 65/0（含 S0P-C1~C5 全绿）；`CHROMIUM_GATES===9` 不动 | 测试覆盖 + 接口数据 | Chromium 真机串行（一次一个） |
| **V7** | **留痕 + 法八四面**（AC-SGO-010 / 011 / NFR-SGO-004/011 / FR-SGO-080·083·084） | 亲跑 `test/ui/law8-plaintext.mjs`：⑧ 引用注入路径零明文（payload/digest/审计/DOM + 留痕零值 + 凭据形掩码单点 + 反证）；36 段零降级 | 46/0（36 零降级）；留痕只含字段名 | 测试覆盖 + 接口数据 | Chromium 真机串行 + 源码切片 |
| **V8** | **红线 / 冻结面 / 载体**（AC-SGO-006 / 023~025 / FR-SGO-120~125） | ① `content.js` 177,076 / sha `52a82620…`；② `pick-layer.js` 34,358 / sha `77796bab…`；③ `base / security / content src / manifest` 对 R1 起点零 diff；④ `KIND_SET` 40 ∧ `refs` 非 kind；⑤ `requestTurn(` 恰 2 ∧ `maybeRecommend` 1/7 ∧ `nextAfterSettle` 1/10；⑥ 特权手势恰 2（sw 层，恒 gesture）；⑦ 12 kind 零宿主；⑧ `zeroDiffFiles` 9 项 | 逐字节命中 / 零 diff；零新载体 | 漂移检测 + 构建 | 自写探针（自算 sha256 + `git diff` + 生产模块导入） |
| **V9** | **体积五要素 + 分列预算**（AC-SGO-025 / EC-SGO-022 / NFR-SGO-001 / FR-SGO-120~125） | ① `BASELINE == FINAL == dist` = 585,732；② 生效上限 = `floor(585,732×1.05)` = 615,018（未越）；③ 档位 `ceilTo50KB` = 614,400 / 绝对上限 ×1.10 = 675,840（未跨）；④ `pending-author-line` / `cap=record-only`；⑤ A 列 +7,109 在预算 6.0~9.0 KB；⑥ 逐模块归因 Σ + glue 39 == +7,109 | 五要素同源；预算内；未触发 EC 任分支 | 性能边界 + 构建 | 自写探针（独立复算式 + 产物 stat + metafile 归因） |
| **V10** | **注入抽验 + 漂移 + X 台账**（AC-SGO-004 / 013 / 018 / FR-SGO-100~107 / 111 / 112） | ① **注入 A**：法九真源 `no-ref → in-scope` ⇒ `law9` + `s0-self-driven-chain` 判红 → `git checkout` 还原 ⇒ sha 逐字节相同 + 复绿；② **注入 B**：删 `dom-anchor` live 单节点闸（多命中按首元素）⇒ `dom-ref-anchor` 判红 → 还原 ⇒ sha 相同 + 复绿；③ X-SGO 台账 rows 4 superseded（1/2/3/5）+ 3 no-supersession（4/6/7）∧ note 口径一致（I-01 已订正）；④ spec 未被修改（零规格漂移）；⑤ 孤立代码 / 需求缺失扫描 | 注入全红且可还原；台账如实；0 漂移 | 漂移检测 + 测试覆盖 | 自写探针 + 源码注入（逐字节还原）+ `git diff` |

> **质量门槛核对**：本叶承载的父 FR 切片逐条落在 V2~V10（见 §3）；相关维度 5 个（测试覆盖 / 接口数据 / 构建 / 性能边界 / 漂移检测）各 ≥ 1 条 Vx；Vx = 10。**说明**：本策略按**维度聚簇**设计（每个 Vx 是一族对抗场景，内含逐条 FR/AC 子断言，实测见 `validate-report.md` 逐项表）。

---

## 3. FR / NFR / EC → Vx 映射（覆盖账）

### 3.1 FR（本叶承载的父 FR 切片）

| 父 FR | 承接点 | 主判 Vx |
|---|---|---|
| FR-SGO-001~006 结构 / 纪律 / 主流程零扩张 | `requestTurn(` 2 · `maybeRecommend` 1/7 · `nextAfterSettle` 1/10 | V8、V1（op-wiring） |
| FR-SGO-010 / 011 载荷 type-only 7 字段 + `KIND_SET` 40 | `ChatRefFact` 单声明 / `refs` 非 kind | V4、V8 |
| FR-SGO-012 / EC-SGO-019 口径写死 + 凭据掩码 | `maskRefDigest` 单点 | V4、V7 |
| FR-SGO-013 / 014 唯一构建点 + 两入口 | `turnRefsOf(` 恰 1（requestTurn 内） | V4、V8 |
| FR-SGO-015 / 016 / 017 基座 + 追加段 + 零引用不变 | `SYSTEM_PROMPT + refContextSegment(refs)` | V4、V6 |
| FR-SGO-018 / 019 只取 valid + SW 唯一来源 | `isActiveRef` / SW 只读载荷 | V4、V8 |
| FR-SGO-020~024 法九条文 + 读数单源 | `SCOPE_READINGS` / `scopeReading` 唯一 | V2 |
| FR-SGO-025~028 越界拦 + 扩围只由用户确认 + 零新时机 | `scopeWriteGate` / `authorized` 恒 false | V2、V4 |
| FR-SGO-030~032 `--ref` → 合成锚 + plugin 包装 + risk 不放宽 | `anchorSelectorFor` / `wrapDomEntryForAnchor` | V3 |
| FR-SGO-033~037 单节点 + 失配非静默 + 互斥 + 判定链零触碰 | `resolveRefAnchor` 逐级 | V3、V8 |
| FR-SGO-038 失效可判 | staleRef EC | V3 |
| FR-SGO-070~077 法九门禁（双向反证 / 禁恒真 / 真源切片） | `law9-scope-reading` 12/0 | V1、V2 |
| FR-SGO-080 / 083 / 084 留痕字段名 + 零值 | `SCOPE_TRACE_FIELDS` / `scopeReadingTrace` | V2、V7 |
| FR-SGO-090 / 091 / 092 S0′ 全链 + 改写处数 ≤ 引用数 + 双向反证 | `s0pProblems` S0P-1~8 | V5、V6 |
| FR-SGO-094 人工面如实登记 | M1/M4 `⏳` | V6 |
| FR-SGO-100~107 X-SGO-1~7 等价重锚 | `xSgoLedger` rows | V10 |
| FR-SGO-110~116 门禁只增 / 受审集合 / 串行 | `gate-integrity` 20/0 · `V55F1_NODE_GATE_FILES` | V1、V8 |
| FR-SGO-120~125 分列预算 / 冻结面 / 逐叶重登记 | 五要素 + 三值 | V9 |

### 3.2 NFR

| NFR | 判据 | 主判 Vx |
|---|---|---|
| NFR-SGO-001 体积 ≤ 生效上限（公式唯一） | 585,732 ≤ 615,018 | V9 |
| NFR-SGO-004 法八四面不退化 | law8 46/0（36 零降级） | V7 |
| NFR-SGO-005 base 零 diff + 判定链零触碰 | `git diff` 零行 / `zeroDiffFiles` 9 | V8 |
| NFR-SGO-006 锚定 / 读数 fail-closed | EC 家族逐条非静默 | V2、V3 |
| NFR-SGO-007 零新增载体（`KIND_SET` 40 / 12 kind / 零宿主） | V8 ⑥⑦ | V8 |
| NFR-SGO-008 引用注入零额外页面探测 | holder 每写一次 live 闸 | V3、V4 |
| NFR-SGO-009 无引用回合逐字不变 | `system===base` | V4 |
| NFR-SGO-010 法九门禁全绿（双向反证 + 禁恒真） | V2 / V5 注入 | V2 |
| NFR-SGO-011 留痕可判且零值 | 留痕机器格式 | V7 |
| NFR-SGO-013 门禁串行 / 无新依赖 | 串行复跑 | V1 |
| NFR-SGO-014 读数单源 + 唯一声明 | 第二声明必红 | V2 |

### 3.3 EC（本叶子集）

| EC | 判据 | Vx |
|---|---|---|
| EC-SGO-001 / 002 / 003 | 0 命中 / 多命中 / 标记缺失 ⇒ 非静默 + 指引（不回退 `--selector`） | V3 |
| EC-SGO-004 / 015 / 016 / 017 | 失效 / 互斥 / 越界 / 读命令 ⇒ 显式拒绝 | V3 |
| EC-SGO-008 | 无引用回合 ⇒ `no-ref` + 逐字不变，不阻断 | V4、V2 |
| EC-SGO-018 | 页面文本注入法则 ⇒ 机制判据不受影响（真源切片） | V9 |
| EC-SGO-019 | 凭据形值 ⇒ 掩码（掩码单点） | V4、V7 |
| EC-SGO-022 | 体积越限 ⇒ 越上限重登记（本叶三分支均未触发） | V9 |

---

## 4. 验证维度与方法

| 维度 | 方法 | 落点 |
|------|------|------|
| 测试覆盖 | 复跑 node（`npm test`）与 Chromium 门禁并计数对账 | V1 / V6 / V7 |
| 接口数据 | 直接驱动生产模块（ref-scope / ref-context / ref-turn / dom-anchor / ref-observe / messaging），比对字段与语义 | V2 / V3 / V4 / V5 |
| 构建 | `dist/**` 产物 stat + 冻结面 sha 复算（可复现性） | V8 / V9 |
| 性能边界 | 体积五要素独立复算 + 越限边界（公式）+ metafile 归因 | V9 |
| 漂移检测 | 冻结面 `git diff`、`KIND_SET` 字面块、台账 `modifiedRanges`、spec 漂移 | V8 / V10 |

**脚本约定**：验证脚本由本 Agent 自主编写并直接执行（ADR-003），存放于编排器指定目录 `/tmp/opencode/v4-gate-logs/v55f-1-validate/`（模板默认 `/tmp/sddu-validate-<feature>-<timestamp>/`；本次按编排器指令使用固定目录，日志同名）。探针均**只读**或以**源码副本 + 逐字节还原**方式对抗，不改仓库。

---

## 5. 纪律

1. **扰动可还原**：所有源码注入均先记录 sha256，注入后 `git checkout` 还原，再复核 sha 逐字节相同；`.sddu` 外零残留（`git status` 终态干净）。
2. **判定三态**：`✅ 通过` / `⚠️ 有条件通过` / `❌ 不通过`；无法执行项标 `⏭️` 并说明原因。
3. **人工面**：语义遵从观感（M1）/ SPA 锚定失败提示可理解度（M4）= `⏳`，**不得冒充 PASS**。
4. **计数只增**：门禁断言只增不减；数值重 pin 落在台账登记的 `modifiedRanges` 内。

---

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建（V1~V10 对抗优先场景矩阵；承载父 FR 切片 / 15 NFR / 20 EC / 12 AC 的 Vx 映射；五维度方法学；扰动可还原与人工面纪律） | 2026-09-24 | SDDU Validate Agent |
