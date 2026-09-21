/**
 * V5-1 **TASK-V5-118 / 119** (ADR-V5-008 · FR-ALLN-100~103 · AC-ALLN-016 / 017 · X4) —
 * the **design 稿 G** half of the dual design contract: the four frozen constants and
 * the **127-row** assertion map (`A1`~`N17`, the shim's own order — duplicates of
 * `I2` / `M17` / `M20` included, because the shim really does declare them more than
 * once and a map that "cleans" that up would no longer be the shim's map).
 *
 * ── Why a separate module ────────────────────────────────────────────────────
 *
 * `design-contract.test.ts` carries the **F** contract verbatim (four constants, the
 * 60-row map and six `test(...)` names must not be touched — N21 / FR-ALLN-100「F 冻结
 * 不替换」). Keeping the 127 new rows here means the F half's diff is **purely
 * additive**: the gate imports this table and re-exports it, so both halves stay
 * readable while neither can quietly rewrite the other.
 *
 * ── 计数口径（SG-1 结论，TASK-V5-106）─────────────────────────────────────────
 *
 * The id sequence is extracted from the shim with `check\('([A-Z]\d+)` — **without**
 * the `\s` tail anchor. `ADR-V5-008`'s draft regex (`check\('([A-Z]\d+)\s`) drops the
 * 10 call sites that carry no trailing space (it yields 117, groups I9/M21), so it can
 * never line up with a 127-row map. The gate asserts the map's sequence equals the
 * **unchanged-anchor** extraction, which is the one that matches the shim's own
 * `127 passed` self-run.
 *
 * @module test/g-design-map
 */

/** G 稿 shim（`option-g-shim.mjs`）的冻结 sha256 —— 改动必须走 `designContractChanges` 登记。 */
export const G_SHIM_SHA256 = 'd0107ecbbd56edfe19592e256a66d27fb3d1c5c1a2d87c1773364f4520e609ce';
/** G 稿本体（`option-g-all-in-next.html`）的冻结 sha256（只读；本叶零触碰）。 */
export const G_DRAFT_SHA256 = 'a7c0a77ac6253e32d1ccef894f32eb8d0dc2d10c99f145261a69ebc699cc83c9';
/** 断言**调用点**数（`check('…'`）；`check(` 的**全部**出现次数 = 本值 + 1（1 处函数声明）。 */
export const G_SHIM_CHECK_CALLS = 127;
export const G_SHIM_CHECK_DECLARATIONS = 1;
/** A~N 十四组（G 稿比 F 多出 J~N 五组：死端对比 / 收尾 / 全链 / 授权 chip / 契约 v2）。 */
export const G_ASSERTION_GROUPS: readonly string[] = Object.freeze(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N']);

/**
 * 127 条断言 → 契约条款 → 承载 FR/AC。
 *
 * `clause` 逐条取自 **shim 自身的断言文案**（唯一来源，零编造）；`owner` 按 A~N 十四组
 * 归属到已裁决的 FR/AC（多组同源，属预期）。行序 == shim 实测序。
 */
export const G_ASSERTION_MAP: ReadonlyArray<{ id: string; clause: string; owner: string }> = [
  { id: 'A1', clause: '三区结构存在（#region-toolbar / #region-stream / #region-statusbar）', owner: 'FR-ALLN-100 / AC-ALLN-016（三区骨架（设计稿侧））' },
  { id: 'A2', clause: '三区顺序正确：工具栏 → 聊天流 → 状态栏', owner: 'FR-ALLN-100 / AC-ALLN-016（三区骨架（设计稿侧））' },
  { id: 'A3', clause: '工具栏语义：header[role=toolbar]', owner: 'FR-ALLN-100 / AC-ALLN-016（三区骨架（设计稿侧））' },
  { id: 'A4', clause: '聊天流语义：main 容器内含 ol[role=log]（追加式日志）', owner: 'FR-ALLN-100 / AC-ALLN-016（三区骨架（设计稿侧））' },
  { id: 'A5', clause: '状态栏语义：footer[role=contentinfo]', owner: 'FR-ALLN-100 / AC-ALLN-016（三区骨架（设计稿侧））' },
  { id: 'A6', clause: '消息流本体是 ol[role=log] 且挂在 <main> 内（正序、追加）', owner: 'FR-ALLN-100 / AC-ALLN-016（三区骨架（设计稿侧））' },
  { id: 'B1', clause: '12 kind 契约：7 primary + 5 process，顺序与契约一致', owner: 'FR-ALLN-124 / FR-CHAT-021（12 kind 卡类型学零新增）' },
  { id: 'B2', clause: '12 类卡样例全部存在（每类至少 1 个 [data-msg-type] 样例）', owner: 'FR-ALLN-124 / FR-CHAT-021（12 kind 卡类型学零新增）' },
  { id: 'B3', clause: '每类卡都挂在流（#stream）的 li 上', owner: 'FR-ALLN-124 / FR-CHAT-021（12 kind 卡类型学零新增）' },
  { id: 'B4', clause: '流内不存在契约外的卡型（零新增卡类型）', owner: 'FR-ALLN-124 / FR-CHAT-021（12 kind 卡类型学零新增）' },
  { id: 'B5', clause: 'AI 答复卡支持富文本（编号列表 / 代码 / 表格摘要），下一步推荐卡含可点 chips', owner: 'FR-ALLN-124 / FR-CHAT-021（12 kind 卡类型学零新增）' },
  { id: 'C1', clause: 'ask-user secret 扩形：卡内含 type=password 的掩码输入（输入在卡内，法四）', owner: 'FR-ALLN-019~021 / FR-ALLN-043（askuser secret / choice / form 扩形）' },
  { id: 'C2', clause: 'ask-user choice 扩形：≥3 选项 + 末项「其他…（我来描述）」且兜底输入默认收起', owner: 'FR-ALLN-019~021 / FR-ALLN-043（askuser secret / choice / form 扩形）' },
  { id: 'C3', clause: 'ask-user form 扩形：参数表单（≥3 个权限项 checkbox · 承载 op 的 params 步）', owner: 'FR-ALLN-019~021 / FR-ALLN-043（askuser secret / choice / form 扩形）' },
  { id: 'C4', clause: '操作前：掩码卡未答，表单可见、固化区隐藏', owner: 'FR-ALLN-019~021 / FR-ALLN-043（askuser secret / choice / form 扩形）' },
  { id: 'C5', clause: '掩码值经输入框提交 → 固化（走真实输入路径，不由外部直传）', owner: 'FR-ALLN-019~021 / FR-ALLN-043（askuser secret / choice / form 扩形）' },
  { id: 'C6', clause: '固化文案 = 「已答：+ 掩码摘要 + 长度」，且零明文', owner: 'FR-ALLN-019~021 / FR-ALLN-043（askuser secret / choice / form 扩形）' },
  { id: 'C7', clause: '固化带时间戳（HH:MM:SS）', owner: 'FR-ALLN-019~021 / FR-ALLN-043（askuser secret / choice / form 扩形）' },
  { id: 'C8', clause: '已固化卡不可二次回答；已答卡取消也被拒（只固化不撤销）', owner: 'FR-ALLN-019~021 / FR-ALLN-043（askuser secret / choice / form 扩形）' },
  { id: 'D1', clause: '授权卡含批准 / 拒绝 + 范围 + 后果预演；consent 卡另有不可逆性说明', owner: 'FR-ALLN-014 / FR-ALLN-044（auth · consent 卡：不可逆 + 拒绝不是死端）' },
  { id: 'D2', clause: 'consent 卡是 auth 卡的变体（零新增卡类型）', owner: 'FR-ALLN-014 / FR-ALLN-044（auth · consent 卡：不可逆 + 拒绝不是死端）' },
  { id: 'D3', clause: 'S2 操作前：auth-site-2 待批，操作按钮可见、固化区隐藏', owner: 'FR-ALLN-014 / FR-ALLN-044（auth · consent 卡：不可逆 + 拒绝不是死端）' },
  { id: 'D4', clause: '批准后固化 + 自动续流：data-decision=approved，续流卡从隐藏变为可见', owner: 'FR-ALLN-014 / FR-ALLN-044（auth · consent 卡：不可逆 + 拒绝不是死端）' },
  { id: 'D5', clause: '拒绝也固化：consent 卡拒绝 → 已拒绝（不执行）+ 拒绝后仍有可达 next', owner: 'FR-ALLN-014 / FR-ALLN-044（auth · consent 卡：不可逆 + 拒绝不是死端）' },
  { id: 'D6', clause: '已决策授权卡不可重复决策', owner: 'FR-ALLN-014 / FR-ALLN-044（auth · consent 卡：不可逆 + 拒绝不是死端）' },
  { id: 'E1', clause: '哨兵值不出现在聊天流（#stream）文本里', owner: 'FR-ALLN-021~024 / AC-ALLN-003（法八流内四面零明文）' },
  { id: 'E2', clause: 'digest / 审计零明文：哨兵不出现，且 digest 只出现掩码 ••••••', owner: 'FR-ALLN-021~024 / AC-ALLN-003（法八流内四面零明文）' },
  { id: 'E3', clause: '全 #panel 元素属性里零出现（值不落任何 data-* / value）', owner: 'FR-ALLN-021~024 / AC-ALLN-003（法八流内四面零明文）' },
  { id: 'E4', clause: '提交后掩码输入被清空（值不留痕）', owner: 'FR-ALLN-021~024 / AC-ALLN-003（法八流内四面零明文）' },
  { id: 'E5', clause: '掩码输入不回显：type=password + 无 value 属性 + autocomplete=off', owner: 'FR-ALLN-021~024 / AC-ALLN-003（法八流内四面零明文）' },
  { id: 'E6', clause: 'S4 的已答掩码卡：固化文案含掩码 / 零明文，且无任何明文片段', owner: 'FR-ALLN-021~024 / AC-ALLN-003（法八流内四面零明文）' },
  { id: 'E7', clause: '命令记录卡以掩码出现（法八：留痕的是事实，不是值）', owner: 'FR-ALLN-021~024 / AC-ALLN-003（法八流内四面零明文）' },
  { id: 'F1', clause: '阻塞终态登记表：5 类（未授权 / 未配置 / 权限缺失 / 绑定失效 / 引用失效）', owner: 'FR-ALLN-010~016 / AC-ALLN-002（法七：阻塞终态 5 类 + 恢复 next 可达）' },
  { id: 'F2', clause: '法七主断言：每个阻塞终态在所属场景内都有可达 next（机核 checkNoDeadEnds）', owner: 'FR-ALLN-010~016 / AC-ALLN-002（法七：阻塞终态 5 类 + 恢复 next 可达）' },
  { id: 'F3', clause: '法七逐场景复核：5 类阻塞在各自场景下 next 可见（内联或紧随）', owner: 'FR-ALLN-010~016 / AC-ALLN-002（法七：阻塞终态 5 类 + 恢复 next 可达）' },
  { id: 'F4', clause: '✖ 行不裸奔（未授权）：✖ 行内即含恢复 next（op.authorize）', owner: 'FR-ALLN-010~016 / AC-ALLN-002（法七：阻塞终态 5 类 + 恢复 next 可达）' },
  { id: 'F5', clause: '✖ 行紧随恢复 next：✖ 之后可见的下一个兄弟是推荐卡且含恢复 next', owner: 'FR-ALLN-010~016 / AC-ALLN-002（法七：阻塞终态 5 类 + 恢复 next 可达）' },
  { id: 'F6', clause: '✖ 行不裸奔（绑定失效 · S6）：行内恢复 next = op.rebind，紧随推荐卡也在', owner: 'FR-ALLN-010~016 / AC-ALLN-002（法七：阻塞终态 5 类 + 恢复 next 可达）' },
  { id: 'F7', clause: '阻塞态「LLM 未配置」（S1）：可见后继是含 next 的推荐卡', owner: 'FR-ALLN-010~016 / AC-ALLN-002（法七：阻塞终态 5 类 + 恢复 next 可达）' },
  { id: 'F8', clause: '阻塞态「权限缺失」（S3）：推荐卡自身即带恢复 next（op.perm.request）', owner: 'FR-ALLN-010~016 / AC-ALLN-002（法七：阻塞终态 5 类 + 恢复 next 可达）' },
  { id: 'F9', clause: '阻塞态「引用全失效」（S6）：卡内含 ≥2 个可见恢复 next（op.pick / op.describe）', owner: 'FR-ALLN-010~016 / AC-ALLN-002（法七：阻塞终态 5 类 + 恢复 next 可达）' },
  { id: 'F10', clause: '拒绝不是死端：权限被拒 → 回执固化 + 「改用描述继续」可达 next 入流', owner: 'FR-ALLN-010~016 / AC-ALLN-002（法七：阻塞终态 5 类 + 恢复 next 可达）' },
  { id: 'F11', clause: '批准也固化：权限获准 → tool 卡结算 ok + 系统行回执入流', owner: 'FR-ALLN-010~016 / AC-ALLN-002（法七：阻塞终态 5 类 + 恢复 next 可达）' },
  { id: 'G1', clause: 'chip 契约：每个 [data-act="next"] 都带 opId（data-op）与 data-command', owner: 'FR-ALLN-055~059 / AC-ALLN-009（chip 契约 + 管线五态 + 查表分发）' },
  { id: 'G2', clause: '每个 chip 的 opId 都在 op 清单里（无悬空 opId）', owner: 'FR-ALLN-055~059 / AC-ALLN-009（chip 契约 + 管线五态 + 查表分发）' },
  { id: 'G3', clause: 'op 清单 = 首批 8 个，opId 与设计一致', owner: 'FR-ALLN-055~059 / AC-ALLN-009（chip 契约 + 管线五态 + 查表分发）' },
  { id: 'G4', clause: '每个 op 元数据完整：风险级 / params / consent / execute / receipt', owner: 'FR-ALLN-055~059 / AC-ALLN-009（chip 契约 + 管线五态 + 查表分发）' },
  { id: 'G5', clause: 'op 管线：5 态齐全，params / consent / execute / receipt 四态各有场景与证据卡', owner: 'FR-ALLN-055~059 / AC-ALLN-009（chip 契约 + 管线五态 + 查表分发）' },
  { id: 'G6', clause: '管线落在既有卡类型上：params=askuser 卡，consent=auth/askuser 卡（零新增卡类型）', owner: 'FR-ALLN-055~059 / AC-ALLN-009（chip 契约 + 管线五态 + 查表分发）' },
  { id: 'G7', clause: 'handleCardAction 查表分发：8 个 op 全部 true，未知 opId 返回 false', owner: 'FR-ALLN-055~059 / AC-ALLN-009（chip 契约 + 管线五态 + 查表分发）' },
  { id: 'G8', clause: 'chip 点击走真实事件路径 → 进入 op 分发（is-chosen + data-op-state=dispatched）', owner: 'FR-ALLN-055~059 / AC-ALLN-009（chip 契约 + 管线五态 + 查表分发）' },
  { id: 'H1', clause: '视察器渲染了全部注册表项（#reg-list li 数 = registry 数）', owner: 'FR-ALLN-030~038 / AC-ALLN-004（契约 v2 视察器 + 分发器 diff = 0）' },
  { id: 'H2', clause: '视察器指标：registry 8 / op 清单 8 / diff 0', owner: 'FR-ALLN-030~038 / AC-ALLN-004（契约 v2 视察器 + 分发器 diff = 0）' },
  { id: 'H3', clause: '与场景联动（S2）：site.unauthorized 为活跃 provider，其 chips 指向 op.authorize', owner: 'FR-ALLN-030~038 / AC-ALLN-004（契约 v2 视察器 + 分发器 diff = 0）' },
  { id: 'H4', clause: '多 next 仲裁（S6）：活跃 provider ≥5 且按「恢复(0) 优先」排序；仲裁卡首 chip 为恢复项', owner: 'FR-ALLN-030~038 / AC-ALLN-004（契约 v2 视察器 + 分发器 diff = 0）' },
  { id: 'H5', clause: '新增操作 = 注册插件：N→N+1，handleCardAction 分发器 diff 恒为 0', owner: 'FR-ALLN-030~038 / AC-ALLN-004（契约 v2 视察器 + 分发器 diff = 0）' },
  { id: 'H6', clause: 'op 管线状态与场景联动（S2 → consent 态高亮；S6 → next 态高亮）', owner: 'FR-ALLN-030~038 / AC-ALLN-004（契约 v2 视察器 + 分发器 diff = 0）' },
  { id: 'H7', clause: '注册表项契约完整：{id, when, chips} 且 chips 全是合法 opId', owner: 'FR-ALLN-030~038 / AC-ALLN-004（契约 v2 视察器 + 分发器 diff = 0）' },
  { id: 'I1', clause: '场景切换器存在 7 个场景（S1~S7）', owner: 'FR-ALLN-089~091·114 / AC-ALLN-013（场景 / 连续宽度 / 密度 / 法一法四）' },
  { id: 'I2', clause: 'a 宽度分隔条存在：侧栏左缘 role=separator + ARIA 语义五件套 + tabindex=0', owner: 'FR-ALLN-089~091·114 / AC-ALLN-013（场景 / 连续宽度 / 密度 / 法一法四）' },
  { id: 'I2', clause: 'b 拖动分隔条实时改写 --panel-w：向左拖 60px → 460px（读数 / aria-valuenow 同步）', owner: 'FR-ALLN-089~091·114 / AC-ALLN-013（场景 / 连续宽度 / 密度 / 法一法四）' },
  { id: 'I2', clause: 'c clamp 生效：拖到 100 → 280（min）；拖到 900 → 640（max）', owner: 'FR-ALLN-089~091·114 / AC-ALLN-013（场景 / 连续宽度 / 密度 / 法一法四）' },
  { id: 'I2', clause: 'd 键盘可达：← +10 / → −10 / Home → 280 / End → 640', owner: 'FR-ALLN-089~091·114 / AC-ALLN-013（场景 / 连续宽度 / 密度 / 法一法四）' },
  { id: 'I2', clause: 'e 双击复位 400：任意宽度 → dblclick → 400px（读数 / aria 同步）', owner: 'FR-ALLN-089~091·114 / AC-ALLN-013（场景 / 连续宽度 / 密度 / 法一法四）' },
  { id: 'I2', clause: 'f 宽度 radio 组零残留：#width-switch / [data-width-set] / 宽度 radiogroup 全为 0', owner: 'FR-ALLN-089~091·114 / AC-ALLN-013（场景 / 连续宽度 / 密度 / 法一法四）' },
  { id: 'I2', clause: 'g 实时读数元素存在且随宽度联动（拖动 / 键盘 / 复位三路都更新）', owner: 'FR-ALLN-089~091·114 / AC-ALLN-013（场景 / 连续宽度 / 密度 / 法一法四）' },
  { id: 'I2', clause: 'h 连续宽度契约：setWidth 越界被 clamp，窄屏兜底改由 data-narrow（≤360px）触发', owner: 'FR-ALLN-089~091·114 / AC-ALLN-013（场景 / 连续宽度 / 密度 / 法一法四）' },
  { id: 'I3', clause: '双主题切换器 + 工具栏主题按钮；切到深色真实生效，切回跟随系统移除属性', owner: 'FR-ALLN-089~091·114 / AC-ALLN-013（场景 / 连续宽度 / 密度 / 法一法四）' },
  { id: 'I4', clause: 'S1 默认屏密度：工具栏 5 / 状态栏 1（授权 chip 常显）/ 合计 6 ≤7，chips ≤3', owner: 'FR-ALLN-089~091·114 / AC-ALLN-013（场景 / 连续宽度 / 密度 / 法一法四）' },
  { id: 'I5', clause: 'S6 风险稳态密度：工具栏 5 / 状态栏 2（授权 chip + 风险 chip）/ 合计 7 ≤7', owner: 'FR-ALLN-089~091·114 / AC-ALLN-013（场景 / 连续宽度 / 密度 / 法一法四）' },
  { id: 'I6', clause: '法四（通用形式）：#panel 内所有可见 input/textarea 都在消息卡内（无常驻输入框）', owner: 'FR-ALLN-089~091·114 / AC-ALLN-013（场景 / 连续宽度 / 密度 / 法一法四）' },
  { id: 'I7', clause: '法一：工具栏与状态栏内不存在 ask-user / 授权 / 推荐类卡', owner: 'FR-ALLN-089~091·114 / AC-ALLN-013（场景 / 连续宽度 / 密度 / 法一法四）' },
  { id: 'I8', clause: 'S7 全景：12 kind 同屏可见（含 5 过程卡）', owner: 'FR-ALLN-089~091·114 / AC-ALLN-013（场景 / 连续宽度 / 密度 / 法一法四）' },
  { id: 'I9', clause: '风险 chip 永不折叠：点 chip → 内联详情 + 「本阶段不发命令、不改授权」', owner: 'FR-ALLN-089~091·114 / AC-ALLN-013（场景 / 连续宽度 / 密度 / 法一法四）' },
  { id: 'I10', clause: 'L2 按需视图：打开审计（含 digest 演示）→ 流隐藏；返回后恢复', owner: 'FR-ALLN-089~091·114 / AC-ALLN-013（场景 / 连续宽度 / 密度 / 法一法四）' },
  { id: 'J1', clause: '死端对比表存在且 ≥5 行（S2 前后逐环节判定）', owner: 'AC-ALLN-008 / FR-ALLN-015（死端对比表 + G 相对 F 的变化点）' },
  { id: 'J2', clause: '死端对比表逐字保留真机缺陷与 G 的恢复项', owner: 'AC-ALLN-008 / FR-ALLN-015（死端对比表 + G 相对 F 的变化点）' },
  { id: 'J3', clause: '死端结论可机核：死端 1 → 0', owner: 'AC-ALLN-008 / FR-ALLN-015（死端对比表 + G 相对 F 的变化点）' },
  { id: 'J4', clause: 'G 相对 F 的变化点 6 条（含 error 独立卡 + 12 kind 不动 + 授权态下移）', owner: 'AC-ALLN-008 / FR-ALLN-015（死端对比表 + G 相对 F 的变化点）' },
  { id: 'J5', clause: '架构区：op 清单表 8 行 + 12 kind 表 12 行 + 注册表代码含 handleCardAction', owner: 'AC-ALLN-008 / FR-ALLN-015（死端对比表 + G 相对 F 的变化点）' },
  { id: 'K1', clause: '收尾：切回 S1 后密度仍 ≤7，且 5 类阻塞仍全部无死端', owner: 'AC-ALLN-025 / NG-ALLN-005（收尾 / 零外链 / 交付面完整）' },
  { id: 'K2', clause: '零外链：无 <link> / 无外链 src / 无 @import / 单内联脚本', owner: 'AC-ALLN-025 / NG-ALLN-005（收尾 / 零外链 / 交付面完整）' },
  { id: 'K3', clause: '交付面完整：lang=zh-CN + 三区角色齐备 + 面板容器唯一', owner: 'AC-ALLN-025 / NG-ALLN-005（收尾 / 零外链 / 交付面完整）' },
  { id: 'L1', clause: 'S1 全链闭环：掩码配置 → 续流 1/3；授权 → 续流 3/3（引用卡），全程同一 #panel 内', owner: 'FR-ALLN-011 / AC-ALLN-001（S1/S4/S5 全链闭环）' },
  { id: 'L2', clause: 'S4 换厂商 / 改 Key：next → 厂商已答固化 → 掩码卡已答固化 → 回执系统行', owner: 'FR-ALLN-011 / AC-ALLN-001（S1/S4/S5 全链闭环）' },
  { id: 'L3', clause: 'S5 管理操作也可 chat 发起：op.revoke 确认卡已答 + 回执 + 设置视图仍在（法六）', owner: 'FR-ALLN-011 / AC-ALLN-001（S1/S4/S5 全链闭环）' },
  { id: 'L4', clause: 'data-scenes 取值全部合法（无笔误场景键）', owner: 'FR-ALLN-011 / AC-ALLN-001（S1/S4/S5 全链闭环）' },
  { id: 'M1', clause: '工具栏区零授权态文本：四词（未授权 / 已授权 / 零注入 / supported）零出现', owner: 'FR-ALLN-085~088·092 / AC-ALLN-012·015（授权 chip 唯一载体 + 零双写 + 密度对账）' },
  { id: 'M2', clause: '工具栏摘要构成 = origin · 会话（无授权态徽标 / 无场景声明）', owner: 'FR-ALLN-085~088·092 / AC-ALLN-012·015（授权 chip 唯一载体 + 零双写 + 密度对账）' },
  { id: 'M3', clause: '状态栏授权 chip 存在 + 两态齐备 + 全 UI 唯一常显载体（#panel 内 chip 原文只在 chip）', owner: 'FR-ALLN-085~088·092 / AC-ALLN-012·015（授权 chip 唯一载体 + 零双写 + 密度对账）' },
  { id: 'M4', clause: 'S1~S7 逐场景：授权 chip 恒显其一，两态归属 = ctxOf(scene).site.authorized', owner: 'FR-ALLN-085~088·092 / AC-ALLN-012·015（授权 chip 唯一载体 + 零双写 + 密度对账）' },
  { id: 'M5', clause: '两态原文逐字：黄「未授权 · 零注入」/ 绿「已授权 · supported」+ 点击行为写在 title', owner: 'FR-ALLN-085~088·092 / AC-ALLN-012·015（授权 chip 唯一载体 + 零双写 + 密度对账）' },
  { id: 'M6', clause: '黄态点击 → 流内产出「授权当前站点」next 卡（op.authorize · 法七）', owner: 'FR-ALLN-085~088·092 / AC-ALLN-012·015（授权 chip 唯一载体 + 零双写 + 密度对账）' },
  { id: 'M7', clause: '黄态点击 → 流内追加一条系统事件行（「事实发生」追加式留痕，与 chip 角色不同）', owner: 'FR-ALLN-085~088·092 / AC-ALLN-012·015（授权 chip 唯一载体 + 零双写 + 密度对账）' },
  { id: 'M8', clause: 'S2 断流样板：黄 chip 全程可见 → 批准授权 → 同一场景内转绿（不换场景）', owner: 'FR-ALLN-085~088·092 / AC-ALLN-012·015（授权 chip 唯一载体 + 零双写 + 密度对账）' },
  { id: 'M9', clause: '绿态点击 → 展开管理详情（撤销授权 op.revoke / 重新绑定 op.rebind）；再点收起', owner: 'FR-ALLN-085~088·092 / AC-ALLN-012·015（授权 chip 唯一载体 + 零双写 + 密度对账）' },
  { id: 'M10', clause: '风险 rail 零双写：无 [data-risk="auth"]、零四词、只留其余风险类', owner: 'FR-ALLN-085~088·092 / AC-ALLN-012·015（授权 chip 唯一载体 + 零双写 + 密度对账）' },
  { id: 'M11', clause: '风险 rail 无风险时显示「无其他风险」（状态栏永不折叠）', owner: 'FR-ALLN-085~088·092 / AC-ALLN-012·015（授权 chip 唯一载体 + 零双写 + 密度对账）' },
  { id: 'M12', clause: '状态栏第一行只承载会话 / 队列事实（零四词）—— 不与 chip 双写', owner: 'FR-ALLN-085~088·092 / AC-ALLN-012·015（授权 chip 唯一载体 + 零双写 + 密度对账）' },
  { id: 'M13', clause: '密度对账：默认可点 = 工具栏 5 + 授权 chip 1 = 6 ≤ 7（法五不破）', owner: 'FR-ALLN-085~088·092 / AC-ALLN-012·015（授权 chip 唯一载体 + 零双写 + 密度对账）' },
  { id: 'M14', clause: '管理详情 = 按需面：默认折叠 + data-density-exempt → 展开后默认屏读数仍 6', owner: 'FR-ALLN-085~088·092 / AC-ALLN-012·015（授权 chip 唯一载体 + 零双写 + 密度对账）' },
  { id: 'M15', clause: '口径说明区登记修订：唯一载体 / 零双写 / 角色口径 / 6 ≤ 7 / 依据 = 作者 2026-09-21 反馈', owner: 'FR-ALLN-085~088·092 / AC-ALLN-012·015（授权 chip 唯一载体 + 零双写 + 密度对账）' },
  { id: 'M16', clause: 'F→G 变化点第 6 条 = 授权态下移（工具栏只剩 origin · 会话；唯一载体 = 状态栏 chip）', owner: 'FR-ALLN-085~088·092 / AC-ALLN-012·015（授权 chip 唯一载体 + 零双写 + 密度对账）' },
  { id: 'M17', clause: '已知取舍如实登记：状态栏高度微增 + chip 两态由 JS 按 ctx 求值 + rail 空态', owner: 'FR-ALLN-085~088·092 / AC-ALLN-012·015（授权 chip 唯一载体 + 零双写 + 密度对账）' },
  { id: 'M17', clause: 'b 头注 / 区一构成说明同步：覆盖 F 的工具栏构成 + 修订依据（作者 2026-09-21 反馈）', owner: 'FR-ALLN-085~088·092 / AC-ALLN-012·015（授权 chip 唯一载体 + 零双写 + 密度对账）' },
  { id: 'M18', clause: '演示控制台读数联动：S2 黄 → 批准授权 → chip 读数转绿，默认屏读数不变（6）', owner: 'FR-ALLN-085~088·092 / AC-ALLN-012·015（授权 chip 唯一载体 + 零双写 + 密度对账）' },
  { id: 'M19', clause: '收尾：切回 S1 → chip 回黄态、留痕清零、密度 6 ≤7、5 类阻塞仍全部无死端', owner: 'FR-ALLN-085~088·092 / AC-ALLN-012·015（授权 chip 唯一载体 + 零双写 + 密度对账）' },
  { id: 'M20', clause: '真实浏览器回归：内联脚本不得在 querySelectorAll 结果上直接用数组方法（NodeList 无 filter）', owner: 'FR-ALLN-085~088·092 / AC-ALLN-012·015（授权 chip 唯一载体 + 零双写 + 密度对账）' },
  { id: 'M20', clause: 'b 两处已知调用点已改走 $$()（maxChipsPerCard / nextCountIn 的 chips 遍历）', owner: 'FR-ALLN-085~088·092 / AC-ALLN-012·015（授权 chip 唯一载体 + 零双写 + 密度对账）' },
  { id: 'M21', clause: '实测修订登记（自检区）：真实浏览器实测 + 两处修订（NodeList.filter / 时间戳 nowrap）', owner: 'FR-ALLN-085~088·092 / AC-ALLN-012·015（授权 chip 唯一载体 + 零双写 + 密度对账）' },
  { id: 'N1', clause: '引用注记已升级为「已核实」：仓库元数据 + Cordis + 三处出处文件（头注 + 架构区）', owner: 'FR-ALLN-030~038 / AC-ALLN-004（契约 v2 R1~R7 + 口径登记）' },
  { id: 'N2', clause: 'R1 可逆注册往返：N → N+1 → N（disposer 幂等，注册表计数与读数同步）', owner: 'FR-ALLN-030~038 / AC-ALLN-004（契约 v2 R1~R7 + 口径登记）' },
  { id: 'N3', clause: 'R1b disposer 契约：注册返回幂等 unregister()，重复调用结果一致', owner: 'FR-ALLN-030~038 / AC-ALLN-004（契约 v2 R1~R7 + 口径登记）' },
  { id: 'N4', clause: 'R5 ② 注册失败 = loud：重复 id 被拒 + 红显 data-state=fail + 计数不变', owner: 'FR-ALLN-030~038 / AC-ALLN-004（契约 v2 R1~R7 + 口径登记）' },
  { id: 'N5', clause: 'R5 ②b 未知 deps → loud（注册被拒）；R4 非法 mode / 悬空 chips / 缺 when 同拒', owner: 'FR-ALLN-030~038 / AC-ALLN-004（契约 v2 R1~R7 + 口径登记）' },
  { id: 'N6', clause: 'R2 依赖声明：每个 provider 有 deps 数组且 ⊆ SERVICES（含 snapshot 依赖实存）', owner: 'FR-ALLN-030~038 / AC-ALLN-004（契约 v2 R1~R7 + 口径登记）' },
  { id: 'N7', clause: 'R2b 依赖解析：被依赖者先就绪（顺序来自服务依赖，不来自列表位置）', owner: 'FR-ALLN-030~038 / AC-ALLN-004（契约 v2 R1~R7 + 口径登记）' },
  { id: 'N8', clause: 'R3 优先级显式：priority / prepend 字段齐备；覆盖按 id 定位整行（计数不变）', owner: 'FR-ALLN-030~038 / AC-ALLN-004（契约 v2 R1~R7 + 口径登记）' },
  { id: 'N9', clause: 'R3b S6 多 next 仲裁：首活跃 provider = site.unauthorized（P0 + prepend）', owner: 'FR-ALLN-030~038 / AC-ALLN-004（契约 v2 R1~R7 + 口径登记）' },
  { id: 'N10', clause: 'R4 分发模式公开契约：#mode-table 逐挂载点标注 waterfall / emit；provider.mode ∈ MODES', owner: 'FR-ALLN-030~038 / AC-ALLN-004（契约 v2 R1~R7 + 口径登记）' },
  { id: 'N11', clause: 'R5 失败语义三级文本：#fail-levels 恰三条（单卡边界 / loud / 快照回滚）', owner: 'FR-ALLN-030~038 / AC-ALLN-004（契约 v2 R1~R7 + 口径登记）' },
  { id: 'N12', clause: 'R5 ③ 改状态操作快照 / 回滚：3 个 op 在 provider 表与证明义务表内逐行明示', owner: 'FR-ALLN-030~038 / AC-ALLN-004（契约 v2 R1~R7 + 口径登记）' },
  { id: 'N13', clause: 'R6 Seam 三件套：Definition / Provider / Consumer 文案齐备且实指到代码', owner: 'FR-ALLN-030~038 / AC-ALLN-004（契约 v2 R1~R7 + 口径登记）' },
  { id: 'N14', clause: 'R7 证明义务表：8 个 op 各一行 + 每行四要素 + tfoot 明示契约义务', owner: 'FR-ALLN-030~038 / AC-ALLN-004（契约 v2 R1~R7 + 口径登记）' },
  { id: 'N15', clause: 'R7b 契约断言：注册 / 卸载 / 重复 id 三操作下分发器 diff 恒 0、指纹不变', owner: 'FR-ALLN-030~038 / AC-ALLN-004（契约 v2 R1~R7 + 口径登记）' },
  { id: 'N16', clause: '架构区扩写为 §①~§⑧ 八节 + provider 表 8 行（场景 S1~S7 零重构）', owner: 'FR-ALLN-030~038 / AC-ALLN-004（契约 v2 R1~R7 + 口径登记）' },
  { id: 'N17', clause: '口径区登记契约 v2 验收口径 + 头注 ⑨ 本轮修订（含「不改 S1~S7」承诺）', owner: 'FR-ALLN-030~038 / AC-ALLN-004（契约 v2 R1~R7 + 口径登记）' },
];
