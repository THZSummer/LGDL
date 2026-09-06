# 审查报告：specs-tree-web-cli-base-v3（web-cli-base v3：AI 操作浏览器的完整工具集——子命令级权限分级 + evaluate 最高门禁）

> **文档定位**: SDDU 审查报告 — 逐项记录自主审查的执行结果，作为 validate 阶段的输入
> **审查策略**: review.md v1.0（C1~C36 审查清单 + 四维度 + 45 FR 覆盖矩阵）
> **前置依赖**: review.md（策略）、spec.md v1.1、plan.md v1.0、build.md v1.9、tasks.md v1.0（12/12 completed）
> **创建人**: SDDU Review Agent
> **创建时间**: 2026-09-07
> **审查轮次**: R1
> **版本**: v1.0
> **更新人**: SDDU Review Agent
> **更新时间**: 2026-09-07
> **更新说明**: 初始执行（静态审查 13 base 源文件 + 4 lgdl-web 文件 + 测试面；git diff/numstat 静态证据交叉核验 build.md 门禁记录；结论 ✅ 通过，3 项改进建议不阻塞 validate）

## 1. 审查概要
> 审查结果的量化总览

| 维度 | 数值 |
|------|:--:|
| 审查项总数 | 36 |
| 通过 | 34 |
| 警告 | 2（C12、C34；含 3 项改进发现） |
| 失败 | 0 |
| 阻塞问题 | 0 |

## 2. 逐项审查结果（C1~C36）

| # | 审查对象 | 审查基准 | 评估 | 发现 | 严重程度 |
|---|---------|---------|:--:|------|:--:|
| C1 | ToolEntry additive 契约 | FR-001 / ADR-008 | ✅ | router.ts ToolEntry 仅追加可选 subcommandRisks（:95，缺省回退 entry.risk）；git diff 显示既有机制文件（delay/audit/runner/sleep/eval-tools/clipboard/notify/save-file）零改动；SUBCOMMANDS 既有 7 头部序保持（dom-tools.ts:92-97） | — |
| C2 | PlatformDomOps/PlatformEnv 缝 additive 扩展 | FR-002 / ADR-008 | ✅ | platform.ts 既有 7 方法签名保持（click 追加可选 opts?），#1~#25 共 28 个新方法全可选；PlatformDomOpResult.dataUrl? 可选；nodeEnv 不预置新方法（platform.ts:580-588 仍为 v2 7 桩）；dom-tools opMissing 未注入守卫语义统一 | — |
| C3 | browserEnv 4 桩补真 + DOM 触碰收敛 | FR-003/016/017 / ADR-008 | ✅ | platform.ts 内联桩整体移除改为 createBrowserDomOps()（git diff 删除行 = 桩块本体）；platform-dom.ts hover:817/scroll:830/zoom:889/fullscreen:918 真实现（事件序列/scrollBy/zoom 近似/fullscreen API）；nodeEnv 保留 v2 桩属基线面；G4 grep 零残留 | — |
| C4 | v2 收口基线承接 + 版本同批 | FR-004 / O-010 | ✅ | build.md §11.6 移交基线关联表 3 项（真实 AI 闭环/lgdl-web React 集成手测/web-search 真实端点）标注「待基线」不阻塞；validate 报告承接 + v0.7 同批登记面齐备 | — |
| C5 | 子命令级 risk 分级模型 | FR-005 / ADR-001 | ✅ | dom subcommandRisks 27 全覆盖（read 6/ui 12/write 9，dom-tools.ts:695-723 逐项核数无误）；chrome 5 全覆盖（ui 3/write 2）；entry.risk 保持 'ui'（回退面 = v2 元数据零变化）；effectiveRisk = subcommandRisks?.[sub] ?? entry.risk（router.ts:543） | — |
| C6 | PolicyRule.subcommand + 审计 subcommand | FR-006 / EC-013 / NFR-008 | ✅ | PolicyRule.subcommand（glob）+ ruleMatches 正交过滤（permission.ts:215-222）；deny 优先语义保持（:248-250）；router permission/tool-call 审计事件均含 subcommand（router.ts:561/596） | — |
| C7 | lgdl-web 默认子命令级策略（IMP-4 修复） | FR-007 / AC-009 | ✅ | LGDL_DEFAULT_POLICY_RULES 单源（session.ts:206-227）：dom 只读 6 allow 前置 → 既有 risk:'ui' ask 收窄到 UI 子命令 → write 缺省 ask → evaluate deny；App.tsx aiPolicy.rules 引用同常量（:962）；session.test 场景断言 onAsk 零调用（IMP-4 修复生效） | — |
| C8 | evaluate 最高档门禁端到端 | FR-008/045 / AC-007 / ADR-002 | ✅ | 四道门禁齐备：①ToolRisk 'evaluate' + defaultActionForRisk → deny（permission.ts:169-172）②router 无策略 fail-closed 直接 deny 且执行器不调用（router.ts:570-585）③executor untrusted 拒（page-eval.ts:127-138，须 --trusted true，不降级不截断）④审计含代码摘要（recordPageEvalAudit）；eval-tools.ts git diff 零命中（NG-010 语义隔离成立）；page-eval 矩阵登记禁用（enabled:false） | — |
| C9 | read-state 多字段升级 | FR-009 | ✅ | platform-dom readState 输出 url/title 行序保持（兼容旧消费方）+ readyState/origin/referrer/lastModified/secureContext/viewport/fullscreen（新增 ≥6 字段 > 验收 ≥2） | — |
| C10 | snapshot 两态 + 分页 + 预算 | FR-010 / S-08 / EC-010 | ✅ | 无参缺省逐字节 v2（platform-dom.ts:947-955 slice 20k 不加标记）；--structured → snapshotStructured（offset/limit/maxLength/sections + applyBudget 截断标记/总长/续读提示）；测试断言分页拼接 | — |
| C11 | interactives 清单 | FR-011 / I-08 | ✅ | collectInteractives 覆盖 button/a[href]/input/select/textarea/contenteditable/role 面（platform-dom.ts:117-133）；type/state/text 过滤 + offset/limit 分页 + maxItems 200 预算 + 截断提示；password kind 只出类型不出值（interactiveKind:543）；测试断言 output 无 value= | — |
| C12 | read-element 多面读取 + 敏感脱敏 | FR-012 / EC-005 | ⚠️ | 七读取面齐备 + value 面经 maskValue 掩码（platform-dom.ts:1078-1091）；**改进发现**：fields.attributes=true 走 Array.from(el.attributes) 原文回显（:1019-1034），对 type=password 等敏感控件若存在服务端预填的 value 属性会回显明文默认值（value 面已掩码但 attributes 面未过滤）——建议 attributes 路径对敏感控件跳过/掩码 value 属性（与 sensitive.ts「保守宁可遮不可漏」取向一致）；readStructure outerHTML/serialize 为 F12 结构视图（FR-014「与 DOM 一致」），建议帮助面补充声明即可不掩码 | 中 |
| C13 | find 定位查询 | FR-013 / EC-001 | ✅ | findElements 0 匹配返回 ok:true + 「未找到——查询语义非错误」计数（platform-dom.ts:1104-1108）；limit/摘要/detail 唯一化建议；find 分支与测试断言一致 | — |
| C14 | structure 结构读取 | FR-014 / EC-010 | ✅ | readStructure parts 六形态（children/outerHTML/links/images/headings/forms）+ 页级序列化 serialize + applyBudget 截断标记（:1143-1201）；forms 段对敏感控件标 敏感! 且不出值（:1186-1190） | — |
| C15 | 定位语法面 | FR-015 / EC-002 / ADR-007 | ✅ | locator.ts parseLocator 四分支（裸串/css:/text=/text*= + case/trim 可配）+ role=/xpath= 显式「不支持+替代指引」（不静默当 CSS）+ 可静态识别非法 CSS 形态；platform-dom 叶子优先文本树 + 去祖先（resolveTextQuery:288-314）；多匹配首元素 + multiMatchNote | — |
| C16 | 双击/右键/长按/拖放 | FR-018/019 / EC-007 / NG-007 | ✅ | dispatchDblclickSequence（mousedown/up×2 + click + dblclick detail 递增）；contextmenu；longPress pointerdown→(ms)→pointerup；dragDrop HTML5 DnD 序列；SYNTHETIC_EVENT_NOTE 合成事件局限返回说明 + page-eval 备用路径建议（不假装可信生效） | — |
| C17 | click 坐标/偏移升级 | FR-020 | ✅ | 三形态：x/y → elementFromPoint（:762-782）/ offset → 中心点偏移（:786-805）/ selector-only → el.click() 零回归（:807-814）；dom-tools 无坐标时不传第二参（= v2 调用形态） | — |
| C18 | focus/blur + 可聚焦判定 | FR-021 | ✅ | focusEl 先 isFocusable（disabled/不可见/非聚焦标签 → 可读错误 EC-001）再 focus + activeElement 回读断言；blur 失焦回读 | — |
| C19 | type/press + React 受控兼容 | FR-022/023 / NFR-004 / ADR-004 / EC-006 | ✅ | setNativeValue 走 HTMLInputElement.prototype value setter（platform-dom.ts:453-475）；typeText 字符级 keydown/input/keyup + change + 写入后回读校验（不一致 → 「事件已派发但值可能未同步」errResult，EC-006 不静默成功）；contenteditable execCommand/insertText 路径；file input 显式不可用（NG-004）；pressKey 修饰符组合 + 命名键表 + focus 目标；shim 测试明示 native setter 真值路径由 V13 冒烟承接 | — |
| C20 | 敏感字段策略 | FR-024 / EC-005 / NFR-002 | ✅ | sensitive.ts 三信号强度排序 + tokenizeIdentifier 归一（camel/snake/尾数字）+ maskValue 只出「分类+长度+≤24 占位」绝不含明文；写侧 sensitiveWriteDecision = ask + requiresTrusted；collect 写路径自动脱敏；帮助面/AskDialog 文案复用（SENSITIVE_READ/WRITE_NOTE）；测试 grep 断言无明文 | — |
| C21 | wait 双通道 + 超时最后状态 | FR-025 / AC-004 / ADR-005 / NFR-007 | ✅ | wait-tools 条件解析（kind element/visible/interactable/gone/text + locator 复用 + conditions JSON 多条件 any/all + timeout 30s 钳制 + interval 200）→ 单次委托 ops.waitFor（工具层零忙等）；platform-dom waitFor MutationObserver 通道 + 轮询降级通道（几何类条件）+ 超时 ok:false 含最后观察状态（不中断会话）；sleep.ts 零改动 = 语义零回归 | — |
| C22 | chrome print/back/forward/reload | FR-026/027 / EC-009 | ✅ | print 默认 dialog 放行、显式格式（pdf）→ 「不支持 + CDP/F-14 归属」且 ops 零调用；historyNav delta ±1；reload 写档缺省 ask（LGDL 无规则命中 → 缺省 ask）+ 放行后恢复提示幂等兜底（正则判断不重复）；back/forward allow 规则前置（LGDL 规则序 = allow 先于 risk:'ui' ask）；dispatch 间谍断言 deny 后执行器不调用 | — |
| C23 | 截图近似零依赖 + 下载链摘要 | FR-028 / ADR-003 / P-03 / NG-005 | ✅ | platform-dom screenshot：cleanClone（去 script/iframe/link/file）+ XMLSerializer → SVG foreignObject（encodeURIComponent）→ Image → canvas drawImage → PNG dataURL + 超时护栏（3s）；fullpage 短路（executor 面 + ops 面双保险）；chrome-tools deliverScreenshot：默认自动下载链 + {尺寸(PNG IHDR 头段解析)/字节(base64 折算)/文件名} 摘要，dataURL 不进上下文；--include-dataurl 400 预算内头段 + 截断标记；下载链不可用 ok:false 不静默丢数据（EC-012）；零第三方依赖 | — |
| C24 | save/notify/clipboard P2 接线 | FR-029/030 / S-06 / EC-012 | ✅ | session.ts v3 P2 矩阵增量注册（仅接线零逻辑改动：clipboard/notify/save-file git diff 零命中）；clipboard 读=敏感 ask/写=ask 经 LGDL 子命令级规则表达（clipboard.ts 零改动）；save 承载 export 落盘链同锚点；notify 默认开 + 授权失败转译 | — |
| C25 | 写入族 set-text/attr/style | FR-031~033 | ✅ | setText（textContent 覆盖语义）/ setAttr（value 缺省 = 布尔属性形态）/ removeAttr / setStyle 三写形态（cssText 覆盖 | prop+value 增量 | classAction add·remove·toggle）+ 非法属性名/值可读错误；写入后回读（EC-006 语义由各 op 输出面保证） | — |
| C26 | set-value/fill/add/remove | FR-034/035/036 / NG-004 / EC-006 | ✅ | setValue = native setter + input/change 基元 + 回读校验（:1675-1705）；fillForm 控件类型路由（text-like→写基元 / select value·byLabel / checkbox·radio checked 语义 / file 显式不可用）+ requestSubmit/隐式提交 + 逐字段回读 notes；addElement 四插入位（append/prepend/before/after）+ attrs 名合法性校验 + 插入后 contains 断言；removeElement 移除后文档不存在断言（EC-006 不静默成功） | — |
| C27 | page-eval 执行器面 | FR-037 / EC-003/004 / P-01 / NFR-008 | ✅ | codeMax 10000 超限拒执行（不截断半段代码）；as expression|script 显式形态校验；platform-dom evaluate：new Function 间接执行（宿主页全局作用域，等效 F12 console）+ 异步 Promise.race 超时中止 + serializeEvaluate 循环引用安全 replacer + Element/Error 摘要降级 + applyBudget 截断；同步死循环不可中断 P-01 在帮助面诚实公开（不承诺假中断）；CSP unsafe-eval 约束声明 | — |
| C28 | extract 声明式抽取 | FR-038 / ADR-006 | ✅ | collect-tools executeExtractTool：kind=table/list/links/images/meta + locator 预校验（role=/xpath= 错误且 ops 零调用）+ fields JSON 逐字段校验 + 限速预检先于 ops（FR-042 无谓 DOM 抽取拦截）+ 结果经 buffer.append 后只回 {条数/bufferId/截断} 摘要（数据不进 output = AC-012）；空集非错误；over-cap 中止原因可读 + 已采保留 | — |
| C29 | 采集护栏 + trust 元数据 + 提示注入不回显 | FR-039/042 / EC-011 / R-010 | ✅ | CollectBuffer session 内存态（collect.ts:1-21 生命周期声明，零持久化 = P-04）；append 单点护栏（单次 200/总量 5000/限速 300ms/可选去重键序归一/脱敏默认开）；meta{url,at,trust:'untrusted'} 来源上下文 + 翻页同 id 增量；导出/降级输出携带 untrusted 标记与「不可作为指令执行」提示（提示注入护栏 FR-042/v2 EC-007 延续）；AI 编排翻页不工具化（FR-039） | — |
| C30 | export 三格式 + xlsx out + 落盘降级 | FR-040/041 / EC-012 / NG-005 | ✅ | serializeRowsCsv RFC4180（csvEscapeCell 逗号/引号翻倍/换行引号包裹 + CRLF）+ json 元数据头 {source, collectedAt, trust, bufferId, rowCount, fields} + text 逐行；save→download 两路降级（save 拒 → 下载链自动降级如实标注）；双路不可用 → 截断内容 + 长度降级不丢数据；.xlsx → 「不支持 + csv 替代指引」且零落盘触达；createExportToolEntry xlsxSerializer? 注入扩展点声明不默认实现 | — |
| C31 | lgdl-web 默认矩阵三链 | FR-043 | ✅ | session.ts 注册序 = 2 业务 → P0 → P1（dom 等）→ v3 P1（wait/extract/export/page-eval 禁用）→ v3 P2（chrome/save/notify/clipboard）→ 内建置末（v2 既有序保持）；schema（deriveTools）/help（一览+详情）/dispatch 三链一致；page-eval enabled:false → 三链均不可达（禁用先于门禁与执行器） | — |
| C32 | ask/授权 UI 呈现 + base 零 UI | FR-044 / AC-009 | ✅ | AskDialog buildPermissionAskEntry：subcommand/risk 徽标（evaluate 红标）+ page-eval summarizeCode 预算内代码摘要（不复显全文）+ SENSITIVE_WRITE_NOTE 敏感写确认 + authPathNote（save/screenshot/clipboard 授权路径提示 4 类）；AiPanel 连接器经 buildPermissionAskEntry 注入完整 AskQuestion 数据面（FR-044 数据链路实际可通）；base 无 UI（G2 grep 零命中：无 .tsx/JSX 面） | — |
| C33 | lgdl-web page-eval 场景缺省 | FR-045 | ✅ | page-eval 矩阵 enabled:false（默认关）+ LGDL {risk:'evaluate', action:'deny'} 兜底规则（场景启用后仍缺省 deny，显式规则/riskDefaults 才可放行且不可低于 ask）；session.test PermissionGate 规则面断言 deny | — |
| C34 | 代码质量 | 四维度 / NFR-006 | ⚠️ | 整体高质（executor 零 DOM 分层、错误面可读自愈、魔法值收敛为常量 WAIT_*/PAGE_EVAL_DEFAULTS/COLLECT_DEFAULT_*/预算默认、strict 类型面纯数据形态、注释含 FR/EC/ADR 锚点可追溯）。**改进发现 2 项**（低）：①dom-tools.ts:245-257 legacy 分支对**显式非法数值参数静默回退**（zoom --percent abc → undefined → 恢复 100%；scroll dx/dy 非法 → 0；fullscreen --on 非法 → 退出）——v2 期仅桩无实际效果代价低，v3 补真后误输入代价上升，建议严格解析报可读错误（缺省路径保持 v2 兼容）；②platform-dom readElement --styles true 对 computed cssText 截 800 字符无截断标记（:1047），建议补截断提示 | 低 |
| C35 | NFR 汇总（纯度/安全/预算/构建/性能/审计） | NFR-001~008 / AC-011/012 | ✅ | G1 base 零 lgdl/react/业务 import 零命中；G2 base 零 UI 零命中；G3 写/evaluate ops 唯一执行入口 = router.dispatch → PermissionGate.check（deny 先于执行器，间谍断言）；G4 4 桩文案零命中（nodeEnv unsupported 为 v2 基线占位逐字节保留）；G5 package.json git diff 零变更（零新增依赖）；index.ts 导出面纯增（+40/-0 后又 +chrome 导出）；audit 事件含 subcommand + evaluate 代码摘要；wait 观察者驱动无空转（NFR-007）；lgdl-web vite + 显式 tsc --noEmit 零错误 + base 独立构建零错误（NFR-006，build §11.2③） | — |
| C36 | 测试质量 + 门禁收口 + validate 移交 | NFR-005 / D-005 / AC-002~012 | ✅ | 8 NEW 测试文件（locator 17/sensitive 17/collect 12/collect-tools 21/wait 20/page-eval 11/chrome 13/platform-dom 38）+ 3 增补（router +6/permission +4/dom-tools +5/session +7 净增）；断言有效性强（dispatch 级 risk、间谍执行器不调用、脱敏 grep 无明文、RFC4180 精确转义、双模式 strict/非 strict 编译）；边界/错误场景矩阵覆盖（EC-001/002/003/004/005/006/007/008/009/011/012/013/014）；platform-dom shim 局限诚实声明（native setter/observer 真值归 V13）；D-005 守恒核验通过（v2 测试文件零删除、既有测试删除行 = 0、session.test -14 全为 import/注释头改写）；build 门禁全仓 895 pass/1 skip/0 fail + AC-001 收口确认；validate 移交 S1~S7 冒烟清单 + v2 收口 3 项「待基线」关联表落盘 | — |

## 3. 审查维度汇总

| 审查维度 | 审查项数 | 通过 | 警告 | 失败 | 通过率 |
|---------|:--:|:--:|:--:|:--:|:--:|
| 代码质量 | 1 | 0 | 1 | 0 | 0%（见注） |
| 规范符合性 | 27 | 27 | 0 | 0 | 100% |
| 架构一致性 | 7 | 7 | 0 | 0 | 100% |
| 测试质量 | 1 | 1 | 0 | 0 | 100% |

> 注：代码质量维度 C34 单条承载全产物质量评估，按「条目级结论 = ⚠️（含 2 项低severity 改进发现）」计；按发现粒度计通过 34 项 / 警告 2 条（3 项改进发现），改进项 3 < 5 达标。规范符合率 = 100%（无规范偏差，C12 改进建议属保守加固非违反——FR-012 值面已掩码、FR-014 outerHTML 为结构视图语义）。

## 4. 阻塞问题

无（阻塞问题 = 0）。

## 5. 改进建议

| # | 位置 | 问题 | 对应 Cx | 建议 |
|---|------|------|:--:|---------|
| 1 | platform-dom.ts:1019-1034（readElement attributes 面） | 敏感控件（type=password/凭据）若带服务端预填 value 属性，--attributes true 会原文回显该默认值（fields.value 面已掩码但 attributes 面未过滤） | C12 | attributes 迭代对 isSensitiveControl(el) 命中时跳过/占位 value 属性（对齐 sensitive.ts「保守宁可遮不可漏」）；readStructure outerHTML/serialize 为 F12 结构视图（FR-014 与 DOM 一致），建议帮助面补充声明不作掩码；可走 @sddu-fast 或回 TASK-004 补 1~2 条断言（敏感控件 + value 属性 → attributes 无明文） |
| 2 | dom-tools.ts:245-257（zoom/scroll/fullscreen legacy 分支） | 显式非法数值参数静默回退（zoom --percent abc → 恢复 100%；scroll dx/dy 非法 → 0；fullscreen --on 非法串 → 退出）——v2 期 4 桩无实际效果代价低，v3 补真后误输入代价上升 | C34 | 对显式非空但非法入参报可读错误（引用 platform-dom ops 面已存在的边界校验），仅缺省路径保持 v2 兼容；可随 @sddu-fast 一并处理 |
| 3 | platform-dom.ts:1047（readElement --styles true） | computed cssText 截 800 字符无截断标记（缺元信息） | C34 | 追加 `…（styles 已截断：全量 N 字符）` 标记，与 applyBudget 元信息风格一致 |

## 6. 结论

**结论**: ✅ 通过

| 指标 | 结果 |
|------|------|
| 审查通过率 | 94.4%（34/36 条目全绿；警告条目为低/中加固建议） |
| 阻塞问题数 | 0 |
| 规范符合性偏差 | 0 项 |
| 可进入 validate | 是 |

**理由**：
- **零回归红线（AC-001/FR-001）成立**：git numstat 静态核验既有测试删除行 = 0（dom-tools.test +387/-0、permission.test +77/-0、router.test +179/-0、session.test +351/-14 中 -14 全为 import/注释头改写）；SUBCOMMANDS 既有 7 头部序保持；sleep/eval-tools/clipboard/notify/save-file/runner/delay/audit git diff 零命中；PlatformDomOps 既有 7 签名零改动（click 仅可选 opts?）；全仓 895 pass/1 skip/0 fail 门禁（build v1.9 记录）。
- **安全性红线（FR-008/AC-007）成立**：evaluate 四道门禁齐备（default deny + 无策略 fail-closed + untrusted 双闸 + 全量审计），无策略旁路（G3）；子命令级 risk 只读免 ask / 写 ask / deny 优先语义正确（含 chrome back/forward 前置 allow 规则序与 clipboard 子命令级 ask）。
- **架构一致性（ADR-003~008）成立**：截图零依赖 foreignObject+canvas + dataURL 下载链摘要不进上下文；type/fill/set-value native setter + 回读校验（EC-006 不静默成功）；wait observer+轮询双通道 + 超时最后状态；CollectBuffer session 内存态不回流上下文 + trust/脱敏/护栏单点；CSS+text= 定位单源（role=/xpath= 显式不支持）；DOM 触碰收敛 platform-dom.ts（base 其余模块零 document）。
- **规范符合率 100%**：45 FR 九组逐项对照实现齐全（含建议态 S-01~S-08 采纳落点、NG-002/003/004/005/007/010 边界公开、EC-001~014 错误面覆盖）；8 ADR 全部遵循。
- **测试质量与移交面完备**：8 NEW + 3 增补测试断言有效、边界/错误场景矩阵覆盖、D-005 守恒核验通过；validate 冒烟清单（S1~S7）+ v2 收口 3 项「待基线」关联表已落盘 build §11.5/§11.6。

3 项改进建议（1 中 / 2 低）均不阻塞 validate：其中改进 #1（readElement attributes 敏感 value 属性加固）建议在 validate 真实浏览器 read-element 冒烟前顺手修复（可走 @sddu-fast 或回 TASK-004），#2/#3 可随后续迭代处理。

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | R1 初始执行：C1~C36 静态审查（34 通过 / 2 警告 3 改进发现 / 0 失败 / 0 阻塞）；结论 ✅ 通过，可进入 validate | 2026-09-07 | SDDU Review Agent |
