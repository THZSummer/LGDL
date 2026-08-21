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

## Edge

```yaml
- from: string           # 必填，源节点 id
  to: string             # 必填，目标节点 id
  label: string          # 可选，边上的文本
  attrs: {...}           # 可选，扩展属性（如 ER 基数 cardinality）
```

## Group

```yaml
- id: string             # 必填，唯一标识
  label: string          # 可选，分组标题
  contains: [node_id]    # 必填，包含的节点 id 列表
  attrs: {...}           # 可选，扩展属性
```

## attrs 扩展属性（逃生舱）

`attrs` 是节点/边/分组的**任意扩展属性**，用于承载图类型专属字段，**不会破坏核心模型**：

- 解析器原样保留，未知 key 不报错
- 序列化器原样写回（数字/布尔/数组/嵌套对象类型保持）
- 各图类型按需读取，例如：
  - 甘特图：`attrs: { start: 0, duration: 3 }`（起始日/工期）
  - ER 图：`attrs: { cardinality: "1..*" }`（关系基数）
- 未来新增图类型的专属字段都放这里，**无需改核心接口**

## 校验规则

1. 所有 node id 必须唯一
2. edge 的 from/to 必须引用存在的 node id
3. group 的 contains 必须引用存在的 node id
4. 节点不能同时属于两个 group（v0.1 限制，后续放开）
5. type 必须是支持的图类型之一

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
