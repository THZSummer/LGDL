# 验证报告：specs-tree-v4-4-ref-system-nextstep

> **文档定位**: SDDU 验证策略 — 指导 validate Agent 执行自主验证的场景和方法；验证结果见 validate-report.md
> **前置依赖**: spec.md（需求规范）、review-report.md（审查报告，状态 passed）
> **创建人**: SDDU Validate Agent
> **创建时间**: 2026-09-20
> **版本**: v1.0
> **更新人**: SDDU Validate Agent
> **更新时间**: 2026-09-20
> **更新说明**: 初始创建（V1~V8 独立动态验证场景 —— 门禁独立复跑 / 推荐链路对抗 / 系统事件单通道对抗 / 宿主与退役 / 引用四处呼应 / V3-VOL-3 闭合独立复核 / 规范与红线 / 修复落地抽检）

## 1. 验证概要
> 验证结果的量化总览（本页为**策略**；实测结果见 `validate-report.md`）

| 维度 | 目标 | 判定口径 |
|------|---------|:--:|
| FR 测试覆盖 | 100%（FR-CHAT-050~064 / 090~094 共 15 项） | 每项 ≥1 个 Vx 且通过 |
| NFR 测试覆盖 | ≥ 80%（NFR-CHAT-001/004/005/006/007/009/010/011/012 共 9 项） | 每项映射到门禁/探针 |
| 构建 | 退出码 0 | `typecheck` + `build` 独立复跑 |
| 接口一致性 | 单通道 payload 构造点 / 推荐输入形状 / 宿主注册表 | 独立复算，不信自报 |
| 漂移项 | 0 严重漂移 | 不动面 diff + spec 漂移 + 孤立代码 |
| 阻塞问题 | 0 | 三级分级 F-xx / N-xx |

**独立复算原则**：所有计数、体积三值、门禁断言均由 validate 侧重新执行/重新编译驱动，**不采信 build/review 的自报数值**；对抗优先（能红才算数）。

## 2. 自主验证场景（V1~V8）
> 从 spec（FR/NFR/EC）+ plan（ADR-V4-035~040）+ 实际产物提取验证对象；Feature 类型 = **代码类**（有 `src/**`、Chromium 门禁、体积契约）⇒ 全五维度覆盖。

**验证对象来源**：
- `spec.md`：FR-CHAT-050~064 / 090~094、NFR-CHAT-001~012、EC-CHAT-003/005/006/007/008/011/012/013、AC-CHAT-011/012/013/016/018/020/021/023/025
- `plan.md`：ADR-V4-035（引用三投影点）/ ADR-V4-036（唯一系统通道 + 归并矩阵）/ ADR-V4-037（推荐真值白名单）/ ADR-V4-038（拾取入口）/ ADR-V4-039（V3-VOL-3 八步闭合）
- 实际产物：`packages/web-cli-plugin/{src,test,dist,docs}`
- `review-report.md` v2.0：R1 三阻塞闭环 + I-01/I-03/I-06/I-07 + 新发现 I-09/I-10/I-11（快修轮已处置）

| # | 验证对象 | 验证步骤 | 预期结果 | 验证维度 | 验证方法 |
|---|---------|---------|---------|---------|---------|
| V1 | 23 项门禁 + design-contract（不含自报） | 1. `typecheck`/`build`；2. `npm test` 全量；3. 逐项跑 supersession/gate-integrity/design-contract/ref-pick-wiring/size-ruling-vol3/l0/density/recommendation/l1/l2/stream/page-input/zero-injection/ask-auth/ui/insight/hardening/e2e/binding/l1-reverse/l2-reverse | 全绿；计数与 build/review 登记逐项一致（npm 992 / recommendation 49 / l0 221 / density 175 / supersession 33 / ref-pick-wiring 11 / size-ruling-vol3 10） | 测试覆盖 + 构建 | 串行实跑 + 计数对账 |
| V2-① | 推荐链路三+一生产时机（FR-CHAT-060/061/063/AC-CHAT-013） | SW→面板真实 `ref-captured`（pick）/ dom-gone 救援 `.then`（stale）/ 真实 `chat-result done`（idle）/ 真·首装（firstRun）；全部**不经** `window.__v3.testing.recommend()` | 各时机 `lastRecommend().trigger` 命中，且产出对应规则卡（onboarding / risk-recovery×2）；无候选时 `suppression=empty` 不渲染空卡 | 接口数据 + 测试覆盖 | Chromium 真实产品路径驱动 |
| V2-② | 推荐不依赖被禁真值（FR-CHAT-060 / AC-CHAT-013） | 1. 注入 `settings`/`deriveCounts` 派生字段 ⇒ 输出对比；2. 静态核 `recommend.ts` 导入集 ⊆ 白名单 + 零 settings 引用 + 零时钟/网络面；3. 生产侧 `RecommendInput` 构造块零设置派生 | 注入后输出**逐字节不变**；结构上够不到设置计数 | 接口数据 + 漂移检测 | node 纯函数对照 + 源码扫描 |
| V2-③ | 推荐抑制逻辑（FR-CHAT-062/063 / EC-CHAT-008） | 纯函数驱动 pending / interval（边界 9999 vs 10000）/ empty / safety（fail-closed 到 chip 级）/ 本地动作不受 deny 误伤 | 各抑制值正确；边界精确 | 测试覆盖 + 性能边界 | node 独立用例 |
| V2-④ | 首装**双闸门**（I-09 快修断言） | 运输层挂起 `state` 回包（llm 已到 / state 未应用）⇒ 断言无 onboarding 卡；释放 state ⇒ 卡片出现 | 半加载不产卡；释放后产卡（证明闸门为阻塞点） | 边界条件 | Chromium addScriptToEvaluateOnNewDocument + reload |
| V3-① | 系统事件**单通道**（FR-CHAT-053/054 / AC-CHAT-011） | 全仓 + **产物** grep `kind:'system'` 构造点；核 `switchStreamSession` 产品可达性；核 dispatch 调用点全部汇入 reducer `systemRow` | 产品可达 payload 构造点恰 1（`chat-state.ts#systemRow`）；产物字面量恰 1；3 处 dispatch 共享唯一通道 | 漂移检测 | grep + 独立分类脚本 |
| V3-② | 速率上限真跑（NFR-CHAT-011 / FR-CHAT-053） | 纯函数 21 条 distinct；Chromium 30 条入流；读 `dropped` 与 `#statusbar-text` | 第 21 条 `text=null` + `dropped+1` + `total=20`；状态栏「限速丢弃」可读（禁静默） | 性能边界 | node + Chromium |
| V3-③ | I-01 同文案不同事实（N 卡 ⇒ N 行）独立复现 | 1. 纯 `appendSystem` 事实标识；2. 独立驱动编译 reducer：2 张不同 kind 未终态卡 + 会话切换；负控单卡 | 2 卡 ⇒ 2 行；同事实窗口内 ⇒ 不追加；单卡 ⇒ 恰 1 行 | 测试覆盖 + 接口数据 | node 独立复现（不读 shipped 用例） |
| V3-④ | 5 通道变化才追加（FR-CHAT-054 / NFR-CHAT-011） | 同值二次 `refresh()`（真实 state 回包 → `eventizeChannels`） | 系统行数不变（不刷屏） | 接口数据 | Chromium 真实 refresh |
| V4 | 宿主与退役（FR-CHAT-055 / review BLOCK-02） | `data-transitional-host` 全仓/DOM=0；`RETIRED_HOST_IDS` 零残留；`evaluateHostRegistry` 5 组伪造读数；DOM `li[data-host]` == 注册集合；5 strips 保留 | 真实读数 `problems=[]`；复活退役容器/过渡标记/未登记宿主/缺失宿主**均判红**（判据非空转） | 漂移检测 + 测试覆盖 | node 纯函数伪造驱动 + Chromium DOM 读 |
| V5 | 引用四处呼应 + R3 等价（FR-CHAT-050/051/052 / AC-CHAT-012） | dom-gone 拾取 ⇒ 系统事件行 + 失效卡 + 恢复路径 + 角标；`refEvidenceRows` 单源；R3 重锚/救援按钮 | 事件行 + `data-ref-state=stale` + 原因 + repick/describe + 兜底默认收起；证据层 4 行同源 | 接口数据 + 测试覆盖 | Chromium 真实捕获 + 静态单源核 |
| V6 | V3-VOL-3 带值闭合独立复核（FR-CHAT-090~094 / AC-CHAT-018 / EC-CHAT-011） | 1. 三值复算；2. `ceilTo50KB(478,897)`、绝对上限、`min()` 生效；3. `authorConfirmation` 机核；4. 时间线抽 4 点；5. **越限红测** | 档位 512,000 / 绝对上限 563,200 / 生效 502,841；`B_final=465,000` 历史保真；478,897×1.06 与 563,201 **必须 FAIL** | 性能边界 + 构建 | node 独立值复算 + 反证注入 |
| V7 | 规范 + 红线（AC-CHAT-020/021/023/025） | 1. AC 逐条映射；2. 不动面 diff（manifest / `src/content/**` / `src/background/**` / journey / binding / 判定链）；3. `content.js`/`pick-layer.js` 字节核；4. 零注入 27；5. spec/plan 漂移 | 零 diff；字节不变；零注入通过；spec 零漂移，plan 仅登记订正注 | 漂移检测 | `git diff` + sha256 + 门禁 |
| V8 | 修复落地抽检（BLOCK-01/02/03 + I-09/I-10/I-04） | BLOCK-01（V2-①）/ BLOCK-02（V4）/ BLOCK-03（独立驱动 describe-submit）/ I-09（V2-④）/ I-10 算术机核反证 / I-04 reset 清投影记忆 | 三项阻塞均闭环；I-10 判据可 FAIL；I-04 机制消除 | 测试覆盖 + 漂移检测 | 独立探针 + sha256 扰动 |

> **质量门槛**：FR 15 项 → V2/V3/V5/V6/V7 覆盖；NFR 9 项 → V1/V3/V4/V6/V7 覆盖；五维度（测试覆盖/接口数据/构建/性能边界/漂移检测）均 ≥1 条。V1~V8 共 8 组、26 个原子断言场景。

## 3. 测试覆盖验证（策略）
> 运行测试套件，统计覆盖率，逐项标注

### 3.1 功能需求 (FR) — 目标覆盖率 100%

| 需求 ID | spec 描述 | 覆盖场景 | 覆盖率目标 |
|---------|----------|:--:|:--:|
| FR-CHAT-050 | 引用卡（有效/失效 + 失效保留 + 新序号递增） | V5 / V2-① | 已覆盖 |
| FR-CHAT-051 | 重拾/重锚新卡 + 旧卡零改动 | V5 | 已覆盖 |
| FR-CHAT-052 | 失效卡含原因 + 恢复路径 | V5 / V8 | 已覆盖 |
| FR-CHAT-053 | 系统事件行单行 + 时间戳 + 只追加 | V3-①/②/④ | 已覆盖 |
| FR-CHAT-054 | 6+ 瞬时通道归并 | V3-①/④ / V4 | 已覆盖 |
| FR-CHAT-055 | 拾取入口迁移后救援路径重锚 | V4 / V5 | 已覆盖 |
| FR-CHAT-060 | 推荐生产者真值派生（不新增 LLM 产物） | V2-①/② | 已覆盖 |
| FR-CHAT-061 | chips 即指令 | V2-① / V1 | 已覆盖 |
| FR-CHAT-062 | 规则表 + 优先级 + 上限 | V2-③ | 已覆盖 |
| FR-CHAT-063 | 推荐与 pending 门控一致 | V2-③ | 已覆盖 |
| FR-CHAT-064 | 推荐内容安全边界 | V2-②/③ | 已覆盖 |
| FR-CHAT-090 | 收口重定 sidepanel 基线 | V6 | 已覆盖 |
| FR-CHAT-091 | 绝对上限带值闭合（三值齐备） | V6 | 已覆盖 |
| FR-CHAT-092 | 推导规则（50KB 档 + 10% 余量 + 作者确认） | V6 | 已覆盖 |
| FR-CHAT-093 | 不设自缚装置（cap = record-only） | V6 | 已覆盖 |
| FR-CHAT-094 | 各叶中间重登记（本叶为收口点） | V6 | 已覆盖 |

### 3.2 非功能需求 (NFR) — 目标覆盖率 ≥ 80%

| 需求 ID | spec 描述 | 覆盖场景 | 覆盖率目标 |
|---------|----------|:--:|:--:|
| NFR-CHAT-001 | 留痕完备性（引用/系统/推荐可回放） | V3-③ / V5 | 已覆盖 |
| NFR-CHAT-004 | chips / 恢复按钮无障碍与键盘可达 | V1（l0/l1） / V5 | 已覆盖 |
| NFR-CHAT-005 | 零注入 / 零明文 | V7 / V2-② | 已覆盖 |
| NFR-CHAT-006 | 体积纪律（五要素 + 绝对上限闭合） | V6 | 已覆盖 |
| NFR-CHAT-007 | 测试守恒（计数不减 / 取代走台账 / 反证实跑） | V1 / V6 | 已覆盖 |
| NFR-CHAT-009 | 门禁严格串行 / 日志完整落盘 | V1 | 已覆盖 |
| NFR-CHAT-010 | 设计契约条款化（E/H 断言） | V1（design-contract） | 已覆盖 |
| NFR-CHAT-011 | 长会话：系统行轻量化 / 不压缩固化卡 | V3-②/④ | 已覆盖 |
| NFR-CHAT-012 | 持久化边界：不写敏感明文 | V7 / V2-② | 已覆盖 |

## 4. 接口与数据实测（策略）
> 关键纯数据/引用的实测对照（结果见 validate-report.md §3.2）

| 检查项 | spec/ADR 要求 | 实测方法 |
|--------|----------|---------|
| 单通道 payload 构造点 | `kind:'system'` 唯一（`systemRow`） | 全仓 + dist 独立 grep/分类 |
| 推荐真值白名单 | 恰 7 项且导入 ⊆ 白名单 | 独立读取导出常量 + 源码扫描 |
| 推荐规则表 | 1 卡 / 3 chips / 10s / 4 优先级 | 独立复算常量 + 纯函数驱动 |
| 宿主注册表 | DOM 集合 == 注册集合；退役零残留 | 纯函数 5 组伪造读数 |
| refEvidenceRows | 单一证据构造 | 静态调用点核 + Chromium 证据层行数 |
| V3-VOL-3 三值 | 478,897 / 512,000 / 563,200 + min() | 独立复算 |

## 5. 构建与脚本验证（策略）
> 运行构建、类型检查，确认可交付

| 检查项 | 命令 | 判定 |
|--------|------|:--:|
| 类型检查 | `npm run typecheck` | 退出码 0 |
| 构建 | `npm run build` | 退出码 0；产物 = 478,897 B |
| 红线字节 | `stat -c %s dist/content.js` / `pick-layer.js` | 177,076 / 33,900 逐字节不变 |

## 6. 性能与边界验证（策略）
> 对 NFR / EC 中的性能与边界指标执行测量

| 指标 | spec 要求 | 判定 |
|-----|----------|:--:|
| 系统行速率上限 | 20 行/min，超出 `dropped` 且状态栏可读 | 第 21 条不追加 + dropped+1 |
| 推荐反抖间隔 | `NEXTSTEP_MIN_INTERVAL_MS=10,000` | 9,999ms 抑制 / 10,000ms 放行 |
| 体积单轮容差 | 5%；生效上限 = `min(绝对上限, floor(基线×1.05))` | 502,841 边界含等号 |
| EC-CHAT-011 越限 | 超绝对上限 ⇒ FAIL | 563,201 与 +6% 必红 |
| EC-CHAT-008 无候选 | 不渲染空卡 | 0 卡 |
| 推荐安全性 | 任一 next chip 被拦 ⇒ 整卡不推荐 | fail-closed |

## 7. 漂移检测（策略）
> 扫描代码库，检测实现与规范的偏离

| 漂移类型 | 检测方法 | 判定 |
|---------|---------|------|
| 孤立代码（有代码无需求） | `switchStreamSession` 产品可达性 / 死常量 | 产品零调用即登记 |
| 需求缺失（有需求无代码） | FR↔产物映射 | 0 项 |
| 规格漂移（spec 被修改） | `git diff <leaf-base>..HEAD -- spec.md` | 0 字节 |
| 不动面漂移 | `git diff` manifest / `src/content/**` / `src/background/**` / journey / binding / 判定链 | 零 diff |

## 8. 结论（判定规则）
> 验证最终结论基于 validate-report.md 的实测数据

**判定规则**: 满足「FR 覆盖 100% ∧ NFR ≥80% ∧ 构建退出码 0 ∧ 严重漂移 0 ∧ 阻塞 0」⇒ ✅ 通过；存在非阻塞偏差 ⇒ ⚠️ 有条件通过；存在未覆盖 FR / 构建失败 / 严重漂移 ⇒ ❌ 不通过。

| 指标 | 要求 |
|------|------|
| FR 覆盖率 | 100% |
| NFR 覆盖率 | ≥ 80% |
| 构建 | 退出码 0 |
| 漂移 | 0 严重 |
| 阻塞 | 0 |

## 9. 修订记录
> 记录本文档的版本变更历史

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建（V1~V8 验证场景矩阵；Feature 类型 = 代码类，全五维度覆盖） | 2026-09-20 | SDDU Validate Agent |
