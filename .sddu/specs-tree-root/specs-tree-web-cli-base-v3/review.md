# 审查策略：specs-tree-web-cli-base-v3（web-cli-base v3：AI 操作浏览器的完整工具集——子命令级权限分级 + evaluate 最高门禁）

> **文档定位**: SDDU 审查策略 — 指导 review Agent 执行自主审查的清单和方法；审查结果见 review-report.md
> **前置依赖**: spec.md v1.1（45 FR 九组 + 8 NFR + 14 EC + 12 AC，冻结）、plan.md v1.0（8 ADR + 27 文件变更）、build.md v1.9（TASK-001~012 全 completed，全仓门禁 + validate 移交）
> **创建人**: SDDU Review Agent
> **创建时间**: 2026-09-07
> **版本**: v1.0
> **更新人**: SDDU Review Agent
> **更新时间**: 2026-09-07
> **更新说明**: 初始创建（自主定义 C1~C36 审查清单；四维度覆盖：架构一致性 7 / 规范符合性 27 / 代码质量 1 / 测试质量 1；45 FR 全覆盖映射；ADR-004 产物拆分：本文件 = 策略，review-report.md = R1 执行结果）

## 1. 审查概要
> 审查结果的量化总览（执行结果见 review-report.md R1）

| 维度 | 数值 |
|------|:--:|
| 审查清单项 | 36（C1~C36） |
| 覆盖 FR | 45/45（九组全映射，见 §3 覆盖矩阵） |
| 审查文件 | 13 base 源文件 + 4 lgdl-web 源/测试 + 8 v3 测试文件（含 3 测试文件增补） |

## 2. 自主审查清单（C1~C36）
> 审查 Agent 依据 spec/plan/build 产物自主定义；来源 = spec FR/NFR/EC（逐项核验）+ plan ADR（架构遵循）+ build.md 门禁/移交清单 + src/tests 静态走查。

### 2.0 审查对象来源与基准

| 来源 | 用途 |
|------|------|
| spec.md | 45 FR / 8 NFR / 14 EC / 12 AC → 逐项核验实现完整性与正确性 |
| plan.md | 8 ADR（§7）+ §2.3 扩展接口 + §5 文件影响 → 架构遵循性检查 |
| build.md v1.9 | §1~§11 门禁记录 + §11.3 grep 断言 + §11.5/11.6 validate 移交 → 覆盖完整性交叉核验 |
| src/ + tests/ | 静态走查代码质量、错误路径、测试质量（review 不跑测试，门禁证据引用 build 记录） |

### 2.1 清单总表

| # | 审查对象 | 审查基准 | 审查维度 | 审查方法 |
|---|---------|---------|---------|---------|
| C1 | ToolEntry additive 契约（subcommandRisks/enabled 等可选字段） | FR-001 / ADR-008 / plan §2.3.1 | 架构一致性 | 静态走查 router.ts ToolEntry + git diff 对照 v2 + 派生顺序断言（router.test.ts:153 保持） |
| C2 | PlatformDomOps/PlatformEnv 缝 additive 扩展（28 可选方法 + dataUrl? + click opts?） | FR-002 / ADR-008 / plan §2.3.2 | 架构一致性 | platform.ts 类型面走查 + nodeEnv 不预置新方法 + dom-tools 未注入守卫语义 + lgdl-web tsc/vite 零错误 |
| C3 | browserEnv 4 桩补真 + 新能力浏览器面真实实现（DOM 触碰收敛 platform-dom.ts） | FR-003/016/017 / ADR-008 | 架构一致性 | platform-dom.ts createBrowserDomOps 走查（hover/scroll/zoom/fullscreen 真实现 + 24 新 ops）+ G4 桩文案 grep 零残留 + nodeEnv 保持 v2 桩 |
| C4 | v2 收口基线承接 + 版本同批（FR-004） | FR-004 / O-010 | 规范符合性 | build.md §11.6 v2 收口 3 项基线关联表（「待基线」不阻塞）+ validate 移交面核验 |
| C5 | 子命令级 risk 分级模型（dom 27 + chrome 5 subcommandRisks 全覆盖） | FR-005 / ADR-001 / plan §2.3.3 | 规范符合性 | dom-tools/chrome-tools subcommandRisks 分组计数（read 6+ui 12+write 9 / ui 3+write 2）+ router effectiveRisk 回退（v2 行为逐字节一致） |
| C6 | PolicyRule subcommand 过滤面 + glob + 正交 + deny 优先 + 审计含 subcommand | FR-006 / EC-013 / NFR-008 | 规范符合性 | permission.ts ruleMatches/globMatch 走查 + router dispatch 审计事件含 subcommand + permission.test 增补断言引用 |
| C7 | lgdl-web 默认子命令级策略（IMP-4 修复生效点 + evaluate deny 兜底） | FR-007 / AC-009 / ADR-001 | 规范符合性 | session.ts LGDL_DEFAULT_POLICY_RULES 常量 + App.tsx aiPolicy 引用 + session.test 场景断言（read 免 ask / click·set-text ask / evaluate deny） |
| C8 | page-eval 最高档门禁端到端（evaluate 档 default deny / 无策略 fail-closed / untrusted 拒 / 与 eval-js 语义区分） | FR-008/045 / AC-007 / ADR-002 / NG-010 | 规范符合性 | router.ts fail-closed 分支 + permission defaultActionForRisk('evaluate') + page-eval executor 双闸（--trusted true）+ eval-tools.ts 零改动（git diff）+ page-eval.test 拒执行间谍断言 |
| C9 | read-state 多字段升级 | FR-009 | 规范符合性 | platform-dom readState（url/title 行序兼容 + readyState/origin/referrer/lastModified/secureContext/viewport/fullscreen ≥2 新字段） |
| C10 | snapshot 结构化两态 + 分页 + 预算（20k/maxLength 可配 + 截断标记） | FR-010 / S-08 / EC-010 | 规范符合性 | dom-tools snapshot 无参缺省 v2 路径（git diff 对照）+ snapshotStructured 分页/预算 + interactives/headings 段 |
| C11 | interactives 可交互清单（过滤/分页/预算 200/password 只出类型不出值） | FR-011 / I-08 | 规范符合性 | platform-dom collectInteractives + platform-dom.test 856 行断言（无 value= 输出） |
| C12 | read-element 元素级多面读取（attributes/text/styles/classList/geometry/state/value + 敏感脱敏） | FR-012 / EC-005 | 规范符合性 | platform-dom readElement 全读取面走查 + value 面敏感掩码（maskValue）+ 脱敏测试断言 |
| C13 | find 定位查询（0 匹配 = ok:true + 计数非错误） | FR-013 / EC-001 | 规范符合性 | platform-dom findElements 0 匹配分支 + 测试 |
| C14 | structure 结构读取（parts/serialize 预算截断） | FR-014 / EC-010 | 规范符合性 | platform-dom readStructure parts 走查 + applyBudget |
| C15 | 定位语法面（CSS 基线 + text=精确/包含 + role=/xpath= 显式不支持） | FR-015 / EC-002 / ADR-007 | 规范符合性 | locator.ts parseLocator 解析矩阵 + platform-dom 叶子优先文本树 + 绝不静默当 CSS |
| C16 | 双击/右键/长按/拖放事件序列 + 合成事件局限说明 | FR-018/019 / EC-007 / NG-007 | 规范符合性 | platform-dom dispatchDblclickSequence/longPress/dragDrop + SYNTHETIC_EVENT_NOTE 返回说明 |
| C17 | click 升级（坐标 x/y + 偏移 offsetX/Y；selector-only 零回归） | FR-020 | 规范符合性 | platform-dom click 三形态（elementFromPoint/offset/selector-only）+ dom-tools 无坐标不传第二参 |
| C18 | focus/blur + 可聚焦判定 | FR-021 | 规范符合性 | platform-dom focusEl 可聚焦性 + activeElement 断言输出 |
| C19 | type/press（字符级事件 + React 受控 native setter 兼容 + 回读校验不静默成功） | FR-022/023 / NFR-004 / ADR-004 / EC-006 | 架构一致性 | platform-dom setNativeValue/typeText/pressKey + writeTextControl 回读 + file input 显式不可用 |
| C20 | 敏感字段策略（读脱敏/写 ask+trusted/审计无明文） | FR-024 / EC-005 / NFR-002 | 规范符合性 | sensitive.ts 三信号 + maskValue 无明文 + sensitiveWriteDecision + collect 写路径脱敏 + 帮助面声明 |
| C21 | wait 条件等待（observer/轮询双通道 + 统一超时最后状态 + risk read 免 ask + sleep 零回归） | FR-025 / AC-004 / ADR-005 / NFR-007 | 架构一致性 | wait-tools parse/委托 + platform-dom waitFor 双通道引擎 + sleep.ts 零触碰（git diff） |
| C22 | chrome print/back/forward/reload（破坏性 ask + 恢复提示；back/forward 会话内场景规则） | FR-026/027 / EC-009 | 规范符合性 | chrome-tools 5 子命令 + reload 恢复提示幂等兜底 + subcommandRisks + LGDL back/forward allow 前置规则序 |
| C23 | 截图近似（SVG foreignObject+canvas 零依赖 + dataUrl 下载链摘要 + 整页 out） | FR-028 / ADR-003 / P-03 / NG-005 | 架构一致性 | platform-dom screenshot（cleanClone/XMLSerializer/Image/canvas）+ chrome-tools deliverScreenshot（下载链 + {尺寸/字节/文件名} + include-dataurl 400 预算）+ fullpage 短路双保险 |
| C24 | save/notify/clipboard P2 接线（仅接线零逻辑改动 + 子命令级 ask 表达） | FR-029/030 / S-06 / EC-012 | 规范符合性 | session.ts P2 矩阵注册 + clipboard/notify/save-file git diff 零命中 + LGDL clipboard read/write ask 规则 |
| C25 | 写入族 set-text/set-attr/remove-attr/set-style（写后回读/非法值错误） | FR-031~033 | 规范符合性 | platform-dom setText/setAttr/removeAttr/setStyle 走查 |
| C26 | set-value/fill/add/remove（React 受控基元 + 表单类型化 + file out + 插入位置） | FR-034/035/036 / NG-004 / EC-006 | 规范符合性 | platform-dom setValue 回读 + fillForm 控件路由/requestSubmit + addElement/removeElement + 测试注入桩 |
| C27 | page-eval 执行器面（序列化/预算/异步超时/死循环诚实公开/审计摘要） | FR-037 / EC-003/004 / P-01 / NFR-008 | 规范符合性 | page-eval.ts 预算解析 + platform-dom evaluate（new Function 间接执行 + serializeEvaluate 循环安全 + Promise.race 超时）+ recordPageEvalAudit |
| C28 | extract 声明式抽取（table/list/links/images/meta → buffer 只回摘要） | FR-038 / ADR-006 | 规范符合性 | collect-tools executeExtractTool + platform-dom extractData 各 kind + 数据不进 output |
| C29 | 翻页采集原语组合 + 护栏（maxItems/总量/限速/去重/中止保留/trust 元数据/提示注入不回显） | FR-039/042 / EC-011 / R-010 | 规范符合性 | collect.ts CollectBuffer append 单点（护栏/脱敏/限速/去重）+ meta{url,at,trust} + collect-tools 限速预检先于 ops |
| C30 | export text/json/csv 类型化 + RFC4180 转义 + 元数据头 + xlsx out + 注入扩展点 + 落盘降级不丢数据 | FR-040/041 / EC-012 / NG-005 | 规范符合性 | collect-tools serializeRows*/csvEscapeCell/元数据头 + xlsx 不支持 + csv 指引 + xlsxSerializer? 扩展点 + save→download 两路 |
| C31 | lgdl-web 默认矩阵扩展（v3 P1/P2 注册序 + page-eval 禁用三链 + 三链一致） | FR-043 / v2 FR-004 语义 | 规范符合性 | session.ts v3 P1/P2 矩阵段（顺序扩展）+ session.test 派生/help/派发三链断言 |
| C32 | ask/授权 UI 呈现扩展（子命令/risk + 代码摘要 + 敏感写确认 + authNote；base 零 UI） | FR-044 / AC-009 | 规范符合性 | AskDialog buildPermissionAskEntry + AiPanel 连接器 + summarizeCode + SENSITIVE_WRITE_NOTE + G2 base 无 UI grep |
| C33 | lgdl-web page-eval 场景缺省（deny + 启用双条件） | FR-045 | 规范符合性 | session 矩阵 page-eval enabled:false + LGDL {risk:'evaluate',deny} + 测试断言 |
| C34 | 代码质量（全 v3 产物错误路径/职责单一/命名/类型 strict/硬编码/可读性） | 四维度指引 / NFR-006 | 代码质量 | 逐文件走查：错误分支可读、魔法值提取为常量（WAIT_*/PAGE_EVAL_DEFAULTS/COLLECT_DEFAULT_*）、executor 零 DOM、strict 类型面 |
| C35 | NFR 汇总（NFR-001 纯度零依赖 / 002 安全无旁路 / 003 预算 / 006 构建 / 007 性能 / 008 审计） | NFR-001~008 / AC-011/012 | 架构一致性 | build.md §11.2/§11.3 门禁（G1~G5 零残留）+ index.ts 导出面 + 审计事件含 subcommand/代码摘要 |
| C36 | 测试质量 + 门禁收口 + validate 移交（测试存在/核心路径/边界/错误场景/断言有效/D-005 守恒/S1~S7） | NFR-005 / D-005 / build §11.4/11.5 / AC-002~012 | 测试质量 | 8 NEW 测试文件 + 3 增补文件走查（断言强度、边界矩阵、间谍断言执行器不调用）+ build v1.9 全仓 test 895 pass/1 skip/0 fail + D-005 守恒核验 |

### 2.2 FR→Cx 覆盖矩阵（45 FR 全映射；质量门槛满足：每 FR ≥ 1 个 Cx、每维度 ≥ 1 条）

| 组 | FR | 覆盖 Cx |
|----|----|---------|
| BSL | FR-001 / FR-002 / FR-003 / FR-004 | C1+C2 / C2 / C3 / C4 |
| PRM | FR-005 / FR-006 / FR-007 / FR-008 | C5 / C6 / C7 / C8 |
| PER | FR-009 / FR-010 / FR-011 / FR-012 / FR-013 / FR-014 / FR-015 | C9 / C10 / C11 / C12 / C13 / C14 / C15 |
| INT | FR-016~017 / FR-018 / FR-019 / FR-020 / FR-021 / FR-022 / FR-023 / FR-024 | C3 / C16 / C16 / C17 / C18 / C19 / C19 / C20 |
| WT | FR-025 | C21 |
| CHR | FR-026 / FR-027 / FR-028 / FR-029 / FR-030 | C22 / C22 / C23 / C24 / C24 |
| WR | FR-031 / FR-032 / FR-033 / FR-034 / FR-035 / FR-036 / FR-037 | C25 / C25 / C25 / C26 / C26 / C26 / C27 |
| COL | FR-038 / FR-039 / FR-040 / FR-041 / FR-042 | C28 / C29 / C30 / C30 / C29 |
| LGDL | FR-043 / FR-044 / FR-045 | C31 / C32 / C33 |

### 2.3 关键红线审查提示（本次审查重点）

1. **零回归红线（AC-001/FR-001）**：ToolEntry additive（subcommandRisks 可选，缺省回退 entry.risk）；PlatformDomOps 既有 7 方法签名零改动（click 仅可选 opts?）；v2 用例零删除（git numstat 0 删除行 + D-005）。
2. **安全性（ADR-001/002 + AC-007/FR-008）**：page-eval 门禁 fail-closed + untrusted 拒 + 无策略旁路；子命令级 risk 正确性（只读免 ask / 写 ask）。
3. **架构一致性（ADR-003~008）**：截图零依赖 foreignObject；合成事件 native setter（React 受控）；wait 双通道；采集 CollectBuffer 内存态不回流上下文；定位 CSS+text=；DOM 触碰收敛 platform-dom.ts。
4. **规范符合性**：敏感字段脱敏（FR-024/EC-005）；提示注入不回显（AC-012）；同源边界（NG-002/003）；非伪造成功（EC-006/012）。
5. **代码质量**：错误路径、可读性、命名、类型安全（strict）。

## 3. 审查方法说明

- **静态分析**：review 不跑测试/构建（属 validate），门禁结论引用 build.md v1.9 记录；本 Agent 补充的静态证据 = git diff numstat（删除行核验）+ grep 断言复核 + 源码走查。
- **严重程度口径**：阻塞（必须修复后才能 validate）/ 高 / 中 / 低（改进建议）。
- **结论口径**：✅ 通过（0 阻塞 + 改进 < 5 + 规范符合率 100%）/ ⚠️ 有条件通过 / ❌ 不通过。

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建：自主定义 C1~C36（45 FR 全覆盖；架构 7 / 规范 27 / 质量 1 / 测试 1），ADR-004 双文件拆分（本文件 = 策略） | 2026-09-07 | SDDU Review Agent |
