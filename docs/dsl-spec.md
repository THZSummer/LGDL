# LGDL DSL 规范（v0.1 草案）

## 文件格式

- 扩展名：`.sdg`（semantic diagram graph）
- 格式：YAML（v0.1 只支持 YAML；后续考虑 JSON 导入）

## 顶层结构

```yaml
title: string            # 可选，图的标题
type: flowchart          # 必填，图类型
nodes: [...]             # 必填，节点列表
edges: [...]             # 可选，边列表
groups: [...]            # 可选，分组列表
meta: {...}              # 可选，元信息（作者、版本等）
```

## Node

```yaml
- id: string             # 必填，唯一标识（字母数字下划线）
  label: string          # 可选，显示文本（默认用 id）
  kind: process          # 可选，节点类型（默认 process）
  # kind: start | end | process | decision | entity | note
```

## Edge

```yaml
- from: string           # 必填，源节点 id
  to: string             # 必填，目标节点 id
  label: string          # 可选，边上的文本
  # 可选：style: dashed | solid（v0.2）
```

## Group

```yaml
- id: string             # 必填，唯一标识
  label: string          # 可选，分组标题
  contains: [node_id]    # 必填，包含的节点 id 列表
```

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
