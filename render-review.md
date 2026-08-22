# LGDL 渲染评审报告（doubao-seed-2-0-lite 视觉模型）

> 评审对象：examples/login-flow.png、examples/ecommerce-flow.png（flowchart 类型）

## 一、login-flow.png

| 维度 | 问题 | 严重度 |
|---|---|---|
| 布局 | 前端层与后端层纵向留白过大，整体松散 | 低 |
| 分组 | 认证模块（内层）虚线框与内部节点贴合松散 | 低 |
| 边与箭头 | **login→verify 连线中段呈紫色虚线、上下段灰色实线（样式不统一）** —— 聚合边 auth→backend 路径与节点边重叠 | **中** |
| 可读性 | 无截断/遮挡 | - |
| 颜色 | 层级分组区分度弱（同色背景） | 低 |
| 改进 | 后端层上移 180-200px 压缩留白；内层框收缩 20-30px；统一连线样式；分组加浅色背景 | - |

## 二、ecommerce-flow.png

| 维度 | 问题 | 严重度 |
|---|---|---|
| 布局 | **左侧（左下）大量冗余空白，重心偏右上，不平衡** | **中** |
| 分组 | 购物域/售后域框留白多；**交易域右边界偏左，指向右侧终止节点的边穿过框边界** | 中 |
| 边与箭头 | 流向"订单取消"的多条边杂乱未对齐；部分边标签离边远 | 低 |
| 可读性 | **聚合边标签"售后入口"截断显示不完整** | **中** |
| 颜色 | **起始/终止节点样式完全一致未区分**；决策节点黄底橙字对比度低；分组同色区分不足 | 中 |
| 改进 | 整体左移 150px；组框贴合；补全标签；start/end 分色；决策文字加深；终止节点对齐 | - |

## 三、渲染器代码层问题清单（对应位置）

| # | 问题 | 代码位置 | 优先级 |
|---|---|---|---|
| 1 | 聚合边路径与节点边重叠（login-flow） | packages/render/src/index.ts 聚合边绘制 | 高 |
| 2 | 聚合边标签截断（"售后入口"） | packages/render/src/index.ts 聚合边 label 定位 | 高 |
| 3 | start/end 节点样式未区分 | packages/render/src/index.ts FILL_BY_KIND/STROKE_BY_KIND | 中 |
| 4 | group 虚线框 padding 过大（贴合松散） | packages/render/src/index.ts computeGroupBox (pad=20) | 中 |
| 5 | 布局左侧冗余空白（dagre 重心偏移） | packages/layout/src/index.ts | 低（布局引擎级） |
| 6 | 决策节点黄底对比度 | packages/render/src/index.ts | 低 |

## 四、结论：优先修复 3 项
1. 聚合边标签截断 + 路径与节点边重叠（#1 #2 同源：聚合边渲染）
2. start/end 节点样式区分（#3）
3. group 框 padding 贴合（#4）

## 五、修复与复验结果（doubao 三轮复验）

| 问题 | 修复 | 复验结果 |
|---|---|---|
| 聚合边与节点边重叠 | 垂直对齐时水平偏移 40px 锚点 | ✅ 两图均确认分离 |
| 聚合边标签截断 | 标签 clamp 到边线内 + 画布内，短边自动缩字号 | ✅ 完整显示 |
| start/end 样式相同 | end 改浅绿填充+绿边（原浅蓝） | ✅ 明确区分 |
| group 框贴合松散 | padding 20→14 | ✅ ecommerce 确认贴合 |
| 布局间距 | RANK_SEP 60→48（更紧凑） | ✅ ecommerce 无遗留 |
| "发矩退款"/"灰色斜线" | 核查为模型误读（SVG 文本/路径正确） | - |

最终：ecommerce-flow 无遗留问题；login-flow 核心 3 项全部修复，剩余"分组留白"为框包含布局空隙的正常现象。
