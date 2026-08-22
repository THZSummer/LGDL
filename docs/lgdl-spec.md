# LGDL 语言规范（v0.2）

## 文件格式

- 扩展名：`.lgdl`（semantic diagram graph）
- 格式：YAML（目前只支持 YAML；后续考虑 JSON 导入）

## 顶层结构

```yaml
title: string            # 可选，图的标题
type: flowchart          # 必填，图类型（9 种，见下表）
nodes: [...]             # 必填，节点列表
edges: [...]             # 可选，边列表
groups: [...]            # 可选，分组列表
meta: {...}              # 可选，元信息（作者、版本等）
```

## 图类型

| type | 说明 | 布局 |
|---|---|---|
| `flowchart` | 业务流程图 | dagre 层级（TB） |
| `mindmap` | 思维导图 | 径向树 |
| `sequence` | 时序图 | 时间轴（参与者列） |
| `uml-class` | UML 类图 | dagre 层级（LR）+ 类卡片 |
| `arch` | 架构图 | dagre 层级（TB）+ 分组 |
| `datastream` | 数据流图 | 泳道 |
| `er` | ER 图 | dagre 层级（LR） |
| `state` | 状态机图 | dagre 层级（TB） |
| `gantt` | 甘特图 | 时间轴（条） |

## Node

```yaml
- id: string             # 必填，唯一标识（字母数字下划线连字符）
  label: string          # 可选，显示文本（默认用 id）
  kind: process          # 可选，节点类型（默认 process）
  # kind: start | end | process | decision | entity | note | state | milestone
  attrs: {...}           # 可选，扩展属性（逃生舱）
```

⚠️ `kind` 必须是上表列出的值之一。**未知 kind 是错误（error），会阻断渲染**——严格模式防止无效 kind 悄悄被忽略。

## Edge

```yaml
- from: string           # 必填，源 id（node id 或 group id）
  to: string             # 必填，目标 id（node id 或 group id）
  label: string          # 可选，边上的文本
  attrs: {...}           # 可选，扩展属性（如 ER 基数 cardinality）
```

**聚合边（aggregate edge）**：`from`/`to` 除了 node id，也可以是 **group id**，表示"组作为整体参与流向/依赖"（不绑定组内具体节点）：

```yaml
edges:
  - from: auth        # 认证模块（group）
    to: backend       # 后端层（group）
    label: 整体调用
```

- 支持 group → group、group → node、node → group 三种混合
- 渲染为紫色虚线箭头，从源组边框连到目标组边框（节点边为灰色实线）
- 聚合边**不参与节点布局**（节点位置只由节点边决定），布局层会忽略它们
- 常见场景：架构分层（接入层→核心层→数据层）、模块间依赖、泳道间数据流

## Group

```yaml
- id: string             # 必填，唯一标识
  label: string          # 可选，分组标题
  contains: [id]         # 必填，成员 id 列表（node id 或嵌套 group id）
  attrs: {...}           # 可选，扩展属性
```

**嵌套分组**：`contains` 可以直接引用另一个 group 的 id，形成层级（如泳道内的子区域、订单核心包住支付网关）：

```yaml
groups:
  - id: inner
    label: 支付网关
    contains: [pay]
  - id: outer
    label: 订单核心
    contains: [start, inner]   # 引用 node id + group id
```

嵌套规则：
- 每个 node / group 只能属于**一个** group（不允许同时出现在两个 contains 里）
- group 不能直接或间接包含自身（禁止环）
- 移除 group 时，会同时从父 group 的 contains 中摘除；其成员保持存在（变为未分组）

## attrs 扩展属性（逃生舱）

`attrs` 是节点/边/分组的**任意扩展属性**，用于承载图类型专属字段，**不会破坏核心模型**：

- 解析器原样保留，未知 key 不报错
- 序列化器原样写回（数字/布尔/数组/嵌套对象类型保持）
- 各图类型按需读取，例如：
  - 甘特图：`attrs: { start: 0, duration: 3 }`（起始日/工期）
  - ER 图：`attrs: { cardinality: "1..*" }`（关系基数）
- 未来新增图类型的专属字段都放这里，**无需改核心接口**

## 校验规则

**严格模式**：以下任何一条违规都是 **error**，文档无效、渲染被阻断（不静默忽略）：

1. 所有 node id 必须唯一
2. 所有 group id 必须唯一
3. edge 的 from/to 必须引用存在的 node id **或 group id**（聚合边）
4. group 的 contains 必须引用存在的 node id **或 group id**
5. 节点/group 不能同时属于两个 group
6. group 不能直接或间接包含自身（检测环）
7. type 必须是支持的图类型之一
8. kind 必须是支持的节点类型之一
9. 缩进必须合法（意外的缩进是错误）

## 示例

```yaml
title: 用户登录流程
type: flowchart

nodes:
  - id: start
    label: 用户访问
    kind: start
  - id: login
    label: 输入账号密码
    kind: process
  - id: verify
    label: 验证凭据
    kind: decision

edges:
  - from: start
    to: login
    label: 打开页面
  - from: login
    to: verify
  - from: verify
    to: ok
    label: 通过
  - from: verify
    to: fail
    label: 失败
```
