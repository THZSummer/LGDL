/**
 * matrix-docs-b — B 档等价类合成文档注册表（FR-003 / plan §7 表 / NFR-006）。
 *
 * 每条 = { id, type, title, qRefs, intent, semanticLock, source }：
 *   - source 为 parser 可接受的**合法现代 DSL**（接受性由 matrix-b.test.ts 实测）；
 *   - qRefs 映射 plan §7 表 Q-xxx（discovery 缺口回溯，评审可追溯）；
 *   - semanticLock=true 的文档属「语义锁」（EC-003/EC-004）：静默忽略/漏画
 *     不判六类违例，以「渲染不炸 + 审计（KNOWN_B 已知集或 0）+ 双渲染字节一致 +
 *     元素级断言」锁现状；
 *   - B11 为 P2 大图（Q-001），meta.optional=true + LGDL_MATRIX_B11 env 启用。
 *   - B12 为 LR 宽>高卡片链回归档（D-003-3 / Q-005 / B2-LR 偏差，meta 见该条 intent）。
 *   - 审计断言统一在 matrix-b.test.ts KNOWN_B 处理：G6 沿框边借道新增后
 *     B1/B4b/B5/B7/B9 为已知 G6 缺口（EC-001 同款记录，engine 贴边走线另 Feature 修复）。
 *
 * 注册表文档 id 集合：B1~B10（B4 拆 a/b、B10 拆 a/b 子用例）+ B11 + B12，共 14 条。
 * 单测文件名 matrix-b.test.ts 与之配对；等价类归属（E1~E6）见各条 intent。
 */
export interface BDocMeta {
  id: string;
  type: string;
  title: string;
  /** plan §7 表 Q-xxx 映射 */
  qRefs: string[];
  /** 覆盖维度 + 等价类归属 + 设计意图（NFR-006 可追溯） */
  intent: string;
  /** EC-003/EC-004 语义锁文档：真红不放宽审计、不修引擎，只记录 */
  semanticLock?: boolean;
  /** B11（P2）：默认 skip，LGDL_MATRIX_B11=1 启用 */
  optional?: boolean;
  source: string;
}

/** B11 大图源（flowchart ~130 节点链式边 → layoutGrid 分支，>120 阈值）。 */
function buildBigChainSource(): string {
  const N = 130;
  const nodes: string[] = [];
  for (let i = 0; i < N; i++) {
    nodes.push(`  - id: n${i}\n    label: 节点 ${i}`);
  }
  const edges: string[] = [];
  for (let i = 0; i < N - 1; i++) {
    edges.push(`  - from: n${i}\n    to: n${i + 1}`);
  }
  return `title: B11 大图 grid（Q-001 边界，>120 节点）\ntype: flowchart\n\nnodes:\n${nodes.join('\n')}\n\nedges:\n${edges.join('\n')}\n`;
}

export const MATRIX_DOCS_B: BDocMeta[] = [
  {
    id: 'B1',
    type: 'flowchart',
    title: 'B1 全形状 kind 混排 + 双向边 + 中英 label（E2，Q-004/Q-012）',
    qRefs: ['Q-004', 'Q-012'],
    intent:
      'E2 形状敏感档（default 系）：单图混排 8 个形状 kind——start/end（药丸）、process（圆角）、' +
      'decision（菱形）、entity（圆柱）、note（折角）、state/milestone（回退矩形）；' +
      '含同对双向边 A→B 与 B→A（均须渲染）与中英混排 label。',
    source: `title: B1 全形状 kind 混排图
type: flowchart

nodes:
  - id: n0
    label: 开始 Start
    kind: start
  - id: n1
    label: 处理 Process
    kind: process
  - id: n2
    label: 判断 Decision
    kind: decision
  - id: n3
    label: 实体 Entity
    kind: entity
  - id: n4
    label: 便签 Note
    kind: note
  - id: n5
    label: 状态 State
    kind: state
  - id: n6
    label: 里程碑 Milestone
    kind: milestone
  - id: n7
    label: 结束 End
    kind: end

edges:
  - from: n0
    to: n1
    label: 进入 Enter
  - from: n1
    to: n0
    label: 回退 Back
  - from: n1
    to: n2
    label: 判定 Judge
  - from: n2
    to: n3
    label: 命中 Hit
  - from: n2
    to: n4
    label: 提示 Note
  - from: n3
    to: n5
  - from: n5
    to: n6
  - from: n6
    to: n7
    label: 完成 Done
`,
  },
  {
    id: 'B2',
    type: 'uml-class',
    title: 'B2 uml-class 折叠档：混 kind + entity members 全字段（E3，Q-004）',
    qRefs: ['Q-004'],
    intent:
      'E3 形状折叠档：uml-class 下 process/decision/note/无 kind 全部渲染为类卡片 ' +
      '（无菱形/折角/圆柱专属形状）；entity 带 members 全字段（attribute+method、visibility/type/params），' +
      '成员行以 nodes[i].members[j] 定位。⚠️ 引擎实证（2026-09-02）：LR 无 group 文档中宽>高的短卡片' +
      '（process/decision/note 高 48 宽 160）与相邻 rank 重叠并撑破画布（layered.ts LR 画布按 last-rank 高度估算）——' +
      '故本文档取**单 rank 纵排**（零边）验证折叠语义。偏差 B2-LR 已由 **B12 档**（LR 多 rank 宽>高卡片链）' +
      '覆盖回归（2026-09-02 修复：rankMaxW 步进 + maxNodeRight 画布兜底），本文档维持单 rank 纵排验证形态。',
    source: `title: B2 uml-class 折叠混排（单列）
type: uml-class

nodes:
  - id: ctrl
    label: OrderController
    kind: decision
  - id: svc
    label: OrderService
    kind: process
  - id: util
    label: OrderUtil
    kind: note
  - id: plain
    label: PlainHelper
  - id: order
    label: Order
    kind: entity
    members:
      - kind: attribute
        name: id
        type: long
        visibility: private
      - kind: attribute
        name: status
        type: string
        visibility: private
      - kind: attribute
        name: total
        type: decimal
        visibility: private
      - kind: method
        name: pay
        type: void
        params: "(acct)"
        visibility: public
      - kind: method
        name: cancel
        type: void
        params: "()"
        visibility: public

edges: []
`,
  },
  {
    id: 'B3',
    type: 'mindmap',
    title: 'B3 mindmap + group 语义锁（Q-013 / U-1 / EC-004）',
    qRefs: ['Q-013'],
    intent:
      'kind×type 语义怪角（E3/EC-004，R-009）：mindmap 文档含 group 容器（root 一分支叶被 contains）。' +
      'mindmap 布局忽略 group、渲染仍画 group box 的行为与 spec「被忽略」表述存在张力（U-1）——' +
      '不强断言绘制/忽略，锁定「渲染不炸 + 折叠（decision 叶为圆角 rect 无 polygon）+ 审计 0 + 双渲染字节一致」。',
    semanticLock: true,
    source: `title: B3 mindmap 带 group 语义锁
type: mindmap

nodes:
  - id: root
    label: AI 项目
    kind: start
  - id: br1
    label: 模型分支
    kind: process
  - id: br2
    label: 框架分支
    kind: process
  - id: leaf-a
    label: 折叠叶 A
    kind: decision
  - id: leaf-b
    label: 叶 B
    kind: decision
  - id: g1
    label: 容器组
    kind: group
    contains: [leaf-b]

edges:
  - from: root
    to: br1
  - from: root
    to: br2
  - from: br1
    to: leaf-a
  - from: br1
    to: leaf-b
`,
  },
  {
    id: 'B4a',
    type: 'sequence',
    title: 'B4a sequence + group 语义锁（Q-013 / EC-004）',
    qRefs: ['Q-013'],
    intent:
      'sequence 文档含 group（contains 1 参与者）+ 1 条 from=groupId 边（EC-004 聚合边漏画锁）：' +
      'group 不产生参与者头（lgdl-participant 数 = 3），from=group 的边不是 node edge → 布局/渲染忽略；' +
      '锁定「渲染不炸 + participant 计数 + 审计 0 + 双渲染一致」（消息漏画不判违例）。',
    semanticLock: true,
    source: `title: B4a sequence 带 group 语义锁
type: sequence

nodes:
  - id: u
    label: 用户
    kind: start
  - id: s
    label: 服务端
    kind: process
  - id: d
    label: 数据库
    kind: entity
  - id: auth
    label: 认证组
    kind: group
    contains: [s]

edges:
  - from: u
    to: s
    label: 登录请求
  - from: s
    to: d
    label: 查询
  - from: d
    to: s
    label: 返回结果
  - from: auth
    to: u
    label: 组级聚合（应被忽略）
`,
  },
  {
    id: 'B4b',
    type: 'gantt',
    title: 'B4b gantt + group 分区 + 聚合边漏画锁（Q-013 / EC-004）',
    qRefs: ['Q-013'],
    intent:
      'gantt 含 2 分区 group（各含任务）+ 任务依赖 + 1 条 group→task 聚合边：' +
      'group→task 边不参与 nodeEdges → 不成 lgdl-dep；lane band 按组绘制。' +
      '锁定「渲染不炸 + lgdl-dep 数 = 任务依赖数 + 审计 0 + 双渲染一致」。',
    semanticLock: true,
    source: `title: B4b gantt 带分区语义锁
type: gantt

nodes:
  - id: t1
    label: 需求分析
    kind: process
    attrs:
      start: 0
      duration: 2
  - id: t2
    label: 原型设计
    kind: process
    attrs:
      start: 2
      duration: 2
  - id: t3
    label: 开发实现
    kind: process
    attrs:
      start: 4
      duration: 3
  - id: t4
    label: 测试验收
    kind: process
    attrs:
      start: 7
      duration: 2
  - id: g1
    label: 阶段一
    kind: group
    contains: [t1, t2]
  - id: g2
    label: 阶段二
    kind: group
    contains: [t3, t4]

edges:
  - from: t2
    to: t3
    label: 依赖
  - from: g1
    to: t4
    label: 阶段聚合（应不成 dep）
`,
  },
  {
    id: 'B5',
    type: 'flowchart',
    title: 'B5 聚合边 g→n 补全（E5 三态 / Q-005）',
    qRefs: ['Q-005'],
    intent:
      'E5 聚合边三态补全：A 档已覆盖 g→g（architecture/datastream）与 n→g（architecture user→core），' +
      '本档补 g→组外节点。断言 lgdl-aggregate-edge path 正交（d 仅 M/L，G2 过）+ label 白底 rect 存在 + 审计 0。',
    source: `title: B5 聚合边 g 到组外节点
type: flowchart

nodes:
  - id: a
    label: 模块 A
    kind: process
  - id: b
    label: 模块 B
    kind: process
  - id: c
    label: 模块 C
    kind: process
  - id: out
    label: 外部依赖
    kind: process
  - id: g1
    label: 内部组
    kind: group
    contains: [a, b, c]

edges:
  - from: a
    to: b
    label: 内部流转
  - from: b
    to: c
  - from: g1
    to: out
    label: 整体外呼
`,
  },
  {
    id: 'B6',
    type: 'flowchart',
    title: 'B6 扇出标签合并（Q-006）',
    qRefs: ['Q-006'],
    intent:
      '扇出合并语义（render 按 from+label 分组，≥2 targets 只渲染一次于 owner）：' +
      '1 源 → 3 同 label target + 1 异 label target。断言同 label 文本渲染次数 = 1、异 label = 1。',
    source: `title: B6 扇出标签合并
type: flowchart

nodes:
  - id: src
    label: 网关
    kind: process
  - id: t1
    label: 服务一
    kind: process
  - id: t2
    label: 服务二
    kind: process
  - id: t3
    label: 服务三
    kind: process
  - id: t4
    label: 审计服务
    kind: process

edges:
  - from: src
    to: t1
    label: 转发
  - from: src
    to: t2
    label: 转发
  - from: src
    to: t3
    label: 转发
  - from: src
    to: t4
    label: 审计
`,
  },
  {
    id: 'B7',
    type: 'gantt',
    title: 'B7 gantt 依赖三型 + 负日期（Q-008 / D4 / U-2）',
    qRefs: ['Q-008'],
    intent:
      'Q-008/D4：attrs.start 负值（-3 起，归一后条不越轴左缘）；三段依赖——gap≥20 / gap≈0 ' +
      '（target.start=source.end）/ 目标在左（< -4 绕行）。按「相邻行 + 空列」构造使垂直段不穿中间条（U-2 规避，' +
      '构造不出则 EC-001 降级记录）。断言三型全正交（G2 过）+ 负日期条不从轴外起 + 审计 0。',
    source: `title: B7 gantt 负日期与依赖三型
type: gantt

nodes:
  - id: t0
    label: 预热准备
    kind: process
    attrs:
      start: -3
      duration: 3
  - id: t1
    label: 阶段甲
    kind: process
    attrs:
      start: 20
      duration: 3
  - id: t2
    label: 阶段乙
    kind: process
    attrs:
      start: 23
      duration: 3
  - id: t3
    label: 阶段丙
    kind: process
    attrs:
      start: 24
      duration: 3

edges:
  - from: t0
    to: t1
  - from: t1
    to: t2
  - from: t2
    to: t3
`,
  },
  {
    id: 'B8',
    type: 'er',
    title: 'B8 er 混 kind + 基数全枚举（Q-007 / E2）',
    qRefs: ['Q-007'],
    intent:
      'Q-007/E2/E5：entity×3（members）+ decision/note 混入（er mode 下真实绘制菱形/折角）；' +
      '基数 1/0..1/0..*/1..* 双向全覆盖。断言基数锚点 22px 外置不压框（G4）+ 关系 label 与基数互不压 + 审计 0。',
    source: `title: B8 er 基数全枚举
type: er

nodes:
  - id: user
    label: 用户
    kind: entity
    members:
      - kind: attribute
        name: id
      - kind: attribute
        name: name
      - kind: attribute
        name: email
  - id: order
    label: 订单
    kind: entity
    members:
      - kind: attribute
        name: id
      - kind: attribute
        name: userId
      - kind: attribute
        name: amount
  - id: product
    label: 商品
    kind: entity
    members:
      - kind: attribute
        name: id
      - kind: attribute
        name: name
  - id: note1
    label: 用户可拥有多个订单
    kind: note
  - id: decide
    label: 大额订单需审核
    kind: decision

edges:
  - from: user
    to: order
    label: 下单
    cardinalityFrom: "1"
    cardinalityTo: "0..*"
  - from: order
    to: user
    label: 归属
    cardinalityFrom: "0..1"
    cardinalityTo: "1"
  - from: product
    to: order
    label: 明细
    cardinalityFrom: "1..*"
    cardinalityTo: "*"
  - from: note1
    to: user
    label: 注释
  - from: decide
    to: order
    label: 约束
`,
  },
  {
    id: 'B9',
    type: 'datastream',
    title: 'B9 datastream `_other` 混合态（Q-009 / EC-003）',
    qRefs: ['Q-009'],
    intent:
      'Q-009/EC-003：2 真实 group（各含节点）+ 未分组节点 → layout 合成 `_other` 尾列（无 lane rect 底框）。' +
      '锁定现状：lgdl-lane rect 数 = 2（`_other` 无底框，开放问题 #7）+ `_other` 列节点走画布检查降级 + 审计 0 + 双渲染一致。',
    semanticLock: true,
    source: `title: B9 datastream 混合态
type: datastream

nodes:
  - id: web
    label: 下单网关
    kind: start
  - id: svc
    label: 订单服务
    kind: process
  - id: ops
    label: 运维平台
    kind: process
  - id: db
    label: 订单主库
    kind: entity
  - id: legacy
    label: 遗留系统
    kind: process
  - id: report
    label: 报表系统
    kind: entity
  - id: app
    label: 应用层
    kind: group
    contains: [web, svc, ops]
  - id: store
    label: 存储层
    kind: group
    contains: [db]

edges:
  - from: web
    to: svc
    label: 创建订单
  - from: svc
    to: db
    label: 写入
  - from: db
    to: legacy
    label: 同步
  - from: legacy
    to: report
    label: 抽取
  - from: app
    to: store
    label: 整体落库
`,
  },
  {
    id: 'B10a',
    type: 'state',
    title: 'B10a state 多入口（Q-011：findInitialState null）',
    qRefs: ['Q-011'],
    intent:
      'Q-011 初始伪态分支：2 个 in-degree 0 状态 → findInitialState 返回 null → 不画 initial 点。' +
      '断言无 <g class="lgdl-initial"> + 审计 0。对照组 = A 档 state（单入口有 initial）。',
    source: `title: B10a state 多入口
type: state

nodes:
  - id: s1
    label: 入口一
    kind: state
  - id: s2
    label: 入口二
    kind: state
  - id: s3
    label: 汇聚
    kind: state
  - id: done
    label: 完成
    kind: end

edges:
  - from: s1
    to: s3
    label: 分支一
  - from: s2
    to: s3
    label: 分支二
  - from: s3
    to: done
`,
  },
  {
    id: 'B10b',
    type: 'state',
    title: 'B10b state 纯环（Q-011：全体 in-degree≥1，无 initial）',
    qRefs: ['Q-011'],
    intent:
      'Q-011 初始伪态分支：纯环状态机（全体 in-degree≥1）→ 无入口 → findInitialState null → 不画 initial 点。' +
      '断言无 <g class="lgdl-initial"> + 审计 0。',
    source: `title: B10b state 纯环
type: state

nodes:
  - id: ca
    label: 环 A
    kind: state
  - id: cb
    label: 环 B
    kind: state
  - id: cc
    label: 环 C
    kind: state

edges:
  - from: ca
    to: cb
  - from: cb
    to: cc
  - from: cc
    to: ca
`,
  },
  {
    id: 'B11',
    type: 'flowchart',
    title: 'B11 大图 grid 边界（Q-001，>120 节点，P2）',
    qRefs: ['Q-001'],
    intent:
      'Q-001 布局大图分支：>120 无 group 节点链式边 → layoutGrid（O(n) grid）路径。' +
      'P2（spec 开放问题 #8 / plan 裁量）：默认 skip，LGDL_MATRIX_B11=1 才执行，不计常规时长预算。',
    optional: true,
    source: buildBigChainSource(),
  },
  {
    id: 'B12',
    type: 'uml-class',
    title: 'B12 LR 多 rank 宽>高短卡片链回归档（D-003-3，Q-005 / B2-LR 偏差）',
    qRefs: ['Q-005'],
    intent:
      'D-003-3/B2-LR 回归档：暴露 layered.ts LR 方向「秩轴步距按节点高度 rankMaxH + LR 画布宽' +
      '按末秩高度估算」缺陷（Q-005 实证：4 张 160×48 宽>高无成员卡链 a→b→c→d 相邻 rank 重叠' +
      '16px×48、画布 560 < 末卡右缘 632 溢出 72px → G5）。修复（rankMaxW 步进 + maxNodeRight 画布兜底）' +
      '后 0 违例；测试侧显式断言两两 bbox 不相交 + 全部节点 x+width ≤ layout.width（重叠/溢出非 G1~G6，' +
      '显式断言不可省，FR-007-①）。修复前红（EC-010）：git stash layered.ts 后 B12 断言红（G5 溢出）。',
    source: `title: B12 LR 宽卡片链回归档
type: uml-class

nodes:
  - id: a
    label: CardA
  - id: b
    label: CardB
  - id: c
    label: CardC
  - id: d
    label: CardD

edges:
  - from: a
    to: b
  - from: b
    to: c
  - from: c
    to: d
`,
  },
];
