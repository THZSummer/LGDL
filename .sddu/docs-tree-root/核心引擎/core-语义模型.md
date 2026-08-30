# 核心引擎 — core 语义模型深潜

> **文档定位**: sddu-docs-deepdive-core — @lgdl/core 包深潜：语言事实来源、手写 YAML 子集解析器、group-as-node 语义模型、增量变更协议、命令注册表与格式转换注册表
> **输出文件名**: core-语义模型.md
> **数据来源**: 代码扫描生成（实读 `packages/core/src/` 全部 16 个源文件约 4639 行，当日实测测试 281/281 通过）
> **创建人**: sddu-docs Agent
> **创建时间**: 2026-08-30
> **版本**: v1.0（feature/group-as-node @ `15e5b6b`）
> **更新说明**: 初始创建（批次 2b 语义层引擎深潜之一；承接批次 2a 的 L-D1/R-D1 全仓核实）

---

## 1. 包定位：语言事实来源、零依赖

| 属性 | 值 |
|------|-----|
| **包名** | `@lgdl/core`（packages/core/） |
| **版本** | 0.5.0（package.json:3） |
| **定位** | LGDL 语言事实来源：类型定义 + YAML 解析/校验 + 语义模型 + 增量变更 + 命令/格式注册表（package.json:4 `"description": "LGDL parser, model and validation (zero dependencies)"`） |
| **运行时依赖** | **零依赖**（package.json 无 `dependencies` 段，仅 devDependencies: typescript/@types/node）——手写 YAML 子集解析器即是为保持零依赖（parser.ts:4-6 模块头注释） |
| **被谁消费** | **4 个运行时包**：cli（cli/package.json:14）、layout（layout/package.json:19）、render（render/package.json:20）、web（web/package.json:19） |
| **测试** | 4 个测试文件（parser/mutations/operations/commands.test.ts），**当日实测 281/281 通过（1365ms）** |

> ⚠️ **口径修正（相对批次指令）**：任务描述写「被其余 5 包依赖」——实测 **router 零依赖**（router/package.json:18 `"dependencies": {}`，纯几何包，不 import core），因此 core 实际被 **4 包**依赖（cli / layout / render / web）。依赖方向与根级包依赖关系图一致（core 在依赖底端）。

**包内文件结构**（16 个源文件，约 4639 行）：

| 文件 | 职责 | 规模 |
|------|------|------|
| `src/types.ts` | 语义模型类型（LgdlDocument/Node/Edge/Group/Member）+ 单事实源常量 | 208 行 |
| `src/parser.ts` | 手写 YAML 子集解析 + error-only 严格校验（validate） | 751 行 |
| `src/groups.ts` | group-as-node 辅助：`groupNodes` / `deriveGroups` 投影 | 33 行 |
| `src/mutations.ts` | 增量编辑 API（add/remove/update × node/edge/group） | 546 行 |
| `src/operations.ts` | 结构化操作层：`applyOperation` / `applyOperations`（失败即停） | 220 行 |
| `src/commands.ts` | 命令注册表（COMMANDS）+ `buildOperation` 门禁（CLI/Web 共享） | 289 行 |
| `src/queries.ts` / `src/status.ts` | 只读查询与 status 文本（AI 读图） | 104+47 行 |
| `src/serialize.ts` | 确定性 .lgdl YAML 序列化器（增量工作流 diff 最小化） | 114 行 |
| `src/converters.ts` | 输出格式转换注册表（register/convert/list） | 31 行 |
| `src/mermaid.ts` | LGDL → Mermaid 导出（注册 'mermaid'） | 443 行 |
| `src/mermaid-import.ts` | Mermaid → LGDL 导入（6 方言） | 1553 行 |
| `src/plantuml.ts` / `src/json.ts` | PlantUML / JSON 导出（侧效应注册） | 106+15 行 |
| `src/templates.ts` | init 文档骨架模板（按图类型） | 80 行 |

---

## 2. 解析器：手写 YAML 子集 + error-only 严格校验

> ADR-005 锚点：error-only（无静默降级）。当日实测：parser.ts 中 `severity: 'error'` **42 处**，`severity: 'warning'` **0 处**（grep 计数）——主解析/校验路径无警告级降级，与 adr-index.md:114 描述一致。

### 2.1 手写 YAML 子集（parser.ts:444-749）

`parseLgdl(source)`（parser.ts:31-35）= `parseYamlShallow`（语法解析）+ `validate`（语义校验），**解析即校验，单一事实源**（ADR-005 备选否决项）。

支持语法面（模块头 parser.ts:437-443 声明，实读确认）：

| 语法能力 | 位置 | 说明 |
|---------|------|------|
| BOM 剥离 | parser.ts:447 | `\uFEFF` 剥离，避免首键变 `"\uFEFFtitle"` 报误导性缩进错 |
| 顶层标量 / 嵌套对象 / 对象列表 | parseBlock 457-523 / parseListItems 530-617 | 缩进驱动，`findTopLevelColon` 619-629 引号感知 |
| 内联列表 `[a, b, c]` / 内联对象 `{a: 1, b: 2}` | parseScalar 718-735 | `splitTopLevel` 635-657 括号深度感知，引号内分隔符保留 |
| 标量类型 | parseScalar 710-749 | 数字/布尔/null/双引号转义（`\n \t \" \\` 736-744）/单引号 |
| 行内注释 ` # 成员` | stripInlineComment 670-687 | 仅值首或前置空白处 `#` 为注释，引号内保留 |
| **标识符字段强制字符串** | parseFieldValue 693-708 | `id/from/to/cardinalityFrom/To` + TEXT_FIELDS（label/title/name/type/params/visibility/kind）保持字符串——节点 id `1111` 是标识符不是数字 |

**严格拒绝（错误即报，不吞不降级）**：
- 缩进越界 → error + 行号（parser.ts:476-479）
- 错位列表项（`- id: x` 出现在字段位置）→ error「misplaced "-"」（parser.ts:488-498, 572-584）——历史教训：以前被解析成名为 `- id` 的字段、节点被静默吞掉
- 列表位置非列表项 → error（parser.ts:546-548）

### 2.2 严格校验：error-only（validate，parser.ts:38-434）

**字段 allowlist 拒绝未知字段**（parser.ts:24-28 定义，拒绝点 67-75 / 80-88 / 271-279）——拼错/错放的字段一律 error，绝不静默忽略：

```
NODE_FIELDS = {id, label, kind, members, attrs, contains}   // parser.ts:26
EDGE_FIELDS = {from, to, label, cardinalityFrom, cardinalityTo, attrs}  // :27
DOC_FIELDS  = {title, type, nodes, edges, meta}              // :28
```

**逐项校验规则**（实读确认的关键门禁）：

| 规则 | 位置 | 说明 |
|------|------|------|
| 图类型白名单 | parser.ts:58-64 | 9 种 DIAGRAM_TYPES |
| 节点 id 格式 + 去重 | :89-102 | `/^[A-Za-z0-9_-]+$/` |
| kind 白名单 | :104-110 | 9 种 NODE_KINDS |
| gantt attrs 数值强校验 | :115-132 | `start` 必须是 number；`duration` 非负 number——`-5`/`abc` 会静默损坏时间轴 |
| members 严格按 kind/type | :137-205 | 仅 `entity` kind、仅 uml-class/er 类型；member 必须有 kind+name；visibility 白名单；**er 禁 visibility**（:183-189）；attribute 禁 params（:190-196）；method params 必须 string |
| **旧式 newline 打包成员拒绝** | :207-221 | label 含 `\n` 的 entity 直接 error——「User\n- id: int」旧语法废弃 |
| contains 仅限 group | :223-237 | 非 group 节点带 contains → error |
| **节点/组 id 同命名空间** | :253-263 | 非 group 节点与 group id 冲突 → error |
| 边：自环/重复/坏引用 | :280-313 | 自环 error；重复键 `from\0to\0label\0relation`（:291）；端点必须存在（节点或组） |
| 基数白名单 | :314-331 | `1 / * / 0..1 / 0..* / 1..*`，`"many"` 之类编造值 → error（:322-329）——防止导出时静默映射成 0..* |
| **label/attrs 混入多重性拒绝** | :335-350 | label 尾部 `1..*` → error；`attrs.cardinality` 逃生舱失效 → error |
| 组成员校验 | :356-398 | 组 id 唯一、contains 引用存在、**一成员只能属一组**（:386-398） |
| **包含环检测** | :400-431 | DFS 三色标记，环上所有组报 error——与 layout 的 group 超节点布局前提呼应 |

### 2.3 旧 `groups:` 语法拒绝（实读确认）

parser.ts:53-55 注释明确声明：

```ts
// The model is UNIFIED: a group is a node (`kind === 'group'`). There is no
// `groups:` top-level field — the legacy syntax is rejected loudly by the
// unknown-document-field check below. `groups` in the input is NOT accepted.
```

执行落点：DOC_FIELDS allowlist 检查（parser.ts:66-75）——顶层 `groups:` 键不在 `{title, type, nodes, edges, meta}` 内，报 `Unknown document field "groups"`。**与批次 2a 及根级 D2/D6 漂移清单一致**：docs/lgdl-spec.md:15,137 与 CHANGELOG.md:21-22 仍记载旧语法可用——已过时，以代码为准（当前代码拒绝）。

**错误可定位性**：每条 issue 带 `location`（如 `nodes[3].id`、`edges[1].cardinalityTo`、`line 12`），web 侧 locate.ts 消费同一路径格式（见 render 文档 §5 消费链）。

---

## 3. 语义模型：group-as-node（types.ts / groups.ts）

> ADR-002 锚点：group 是 `kind:'group'` 的特殊节点，不是独立字段。

**模型统一性**（types.ts:1-9 模块头 + 182-187 注释）：

```ts
export interface LgdlDocument {
  title?: string;
  type: DiagramType;
  nodes: LgdlNode[];   // 含 kind:'group' 容器节点
  edges: LgdlEdge[];
  meta?: LgdlMeta;
}                      // types.ts:188-194 —— 无顶层 groups 字段
```

- `LgdlNode.kind` 9 种含 `group`（types.ts:51-60）；`contains` 是 group 节点的成员 id 列表（types.ts:146）
- `LgdlGroup` 接口（types.ts:169-176）**保留但降级为投影形状**——`deriveGroups(doc)` 从 nodes 投影（groups.ts:24-33），消费方无需特判 group（layout 引擎「布局永不特判组」的设计前提，layout 文档 §4）
- 解析器同样在 validate 内做投影（parser.ts:247-249）

**辅助导出**（index.ts:5 转发）：
- `groupNodes(doc)`（groups.ts:15-17）：按文档序返回 group 节点本体（可读 kind/label/contains/attrs）
- `deriveGroups(doc)`（groups.ts:24-33）：投影为 `{id, label, contains, attrs}` 容器形状——layout/render/status/queries 全部经它取组（layout/index.ts:16、render/index.ts:438、status.ts:11）

**其它模型要点**：
- **结构化成员**（types.ts:102-113）：`LgdlMember`（kind/name/visibility/type/params）——可见性用显式枚举 `MemberVisibility`（types.ts:96），renderer 从不从文本解析 `+/-/#` 标记；`VIS_SYMBOL`（types.ts:116-121）是 layout + render 共享的显示符号单事实源
- **扩展属性逃生舱**（types.ts:128）：`LgdlAttrs` 保留任意键值，未知键由 parser/serializer 原样保留（gantt start/duration、ER relation）
- **ER/uml 多重性显式字段**（types.ts:162-164）：`cardinalityFrom/To`——renderer 从不从 label 解析基数

---

## 4. 增量变更协议（operations.ts / mutations.ts）

> ADR-008 锚点：AI 永不整图重写——结构化 `LgdlOperation` 是 CLI 与 Web AI 的**唯一**增量编辑协议（operations.ts:1-15 模块头）。

### 4.1 操作层（operations.ts）

**9 种操作变体**（operations.ts:31-84）：add/remove/update × node/edge/group，JSON 可序列化（未知字段忽略）。

**单一映射入口**：`applyOperation(doc, op)`（operations.ts:111-175）——switch 到 mutations 的 9 个函数，这是 op → mutation 的唯一映射点（模块头 operations.ts:12-14：「adding a new incremental command means adding one op variant here... never a second implementation」）。

**批量失败即停**：`applyOperations`（operations.ts:199-220，注释 189-198）：

```ts
for (let i = 0; i < ops.length; i++) {
  try { const r = applyOperation(current, ops[i]); ... }
  catch (err) {
    results.push(null);
    while (results.length < ops.length) results.push(null);  // 未执行 op 填 null 槽位
    return { document: current, results, failedIndex: i, error: (err as Error).message };  // :211-216
  }
}
```

- 失败时返回**截至最后一个成功 op 的文档** + `failedIndex` + error 消息——调用方决定保留部分结果还是回滚（operations.ts:190-194 注释）
- **`validate()` 不在此运行**（operations.ts:195-197）：mutations 已保证结构不变量，全量校验是调用方职责（CLI 保存前重校验、Web 渲染前校验）——门禁分层，非缺失

### 4.2 变更门禁（commands.ts buildOperation）

`buildOperation(command, args, docType)`（commands.ts:124-220）是 CLI 与 Web AI 的**共享业务逻辑唯一实现**（模块头 commands.ts:1-10）：

- **必填参数门禁**：`requireParams`（commands.ts:101-107）——缺 `--id`/`--from`/`--to` 抛中文错误
- **no-change 门禁**：`assertChangeRequested`（commands.ts:110-116）——update 系列至少一个变更参数，否则抛「no change requested」
- **attrs 无损解析**：`parseAttrsSpec`（commands.ts:233-254）——`"1.10"` 保持字符串不变成 `1.1`、`"080"` 保持 `"080"` 不变成 `80`（有损转换是静默错误，注释 :231-232）
- **member 解析**：`parseMemberSpec`（commands.ts:257-289）——引号感知逗号切分，`kind=`/`name=` 必填
- **默认 kind**：`defaultKindFor`（commands.ts:223-227）——er/uml-class → entity、state → state、其余 process

### 4.3 变更原语（mutations.ts）

| 原语 | 位置 | 关键行为 |
|------|------|---------|
| `addNode` | mutations.ts:107-148 | id 唯一 + 格式校验；`group` 参数把节点写进组节点的 contains（:134-145，组不存在抛错） |
| `removeNode` | :150-172 | **级联清理**：删除节点同时清掉所有触及边 + 从各组 contains 摘除（:158-165） |
| `addEdge` | :174-215 | 端点须是节点或组；自环拒绝；**去重规则**：有 label 时同 from/to 不同 label 合法（ER 多关系），无 label 时 a→b 只能一条（:191-200） |
| `removeEdge` | :217-240 | label 歧义**拒绝删除**（多条同 label 边无法区分 → 抛错，:229-233）；多条平行边无 label 也拒绝（:237-240）——防静默数据丢失 |
| `assertMemberShape` | :16-34 | member 结构校验（mutations 层独立于 parser 层的双保险） |

**与 ADR-008 呼应**：adr-index.md:169 证据锚点 `operations.ts:1-18` + `:195-220` 与实读一致 ✓；CHANGELOG.md:64「共享操作层：结构化增量操作协议 9 种 + applyOperation/applyOperations 批量、失败即停」✓。

---

## 5. 命令注册表：19 命令（commands.ts + cli registry + web-cli 子集）

> ADR-004 锚点：双 CLI 物理分离 + core 命令注册表单一实现。

**三层结构**（实读确认）：

```
core/commands.ts COMMANDS（9 个增量命令的 CommandSpec：参数/必填/changeKeys）
        ↑ 业务逻辑唯一实现
        ├── packages/cli/registry.ts（19 命令注册，--file 磁盘文件 + commander argv）
        └── packages/web/src/ai/web-cli.ts（子集，--doc 编辑器文档 + 文本协议解析）
```

**19 命令清单**（cli/registry.ts:38-58 数组实读，数 = 19，与 ADR-004 证据 P3 一致）：

| 类别 | 命令 | 数量 |
|------|------|-----:|
| 基础 | init / render / status | 3 |
| 只读查询 | doc-info / list-node-kinds / get-node / get-edge / find-node | 5 |
| 格式 | convert / import | 2 |
| **增量编辑** | add-node / remove-node / update-node / add-edge / remove-edge / update-edge / add-group / remove-group / update-group | 9 |

**web-cli 子集**（web-cli.ts:84-146 实读）：status / validate / init / convert + **9 个增量命令**（全走 `buildOperation`，web-cli.ts:100-134）+ 6 个只读查询（doc-info/get-node/get-edge/find-node/list-node-kinds/list-diagram-types）。`help.ts:11` 从 core `COMMANDS` 动态生成帮助（命令自文档化，ADR-004 理由之一）。

**命令注册表消费链验证**：ops.ts:204-217（Web AI function calling 执行分支）同样走 `core/buildOperation`；help.ts:151-192 增量命令示例从 COMMANDS 注册表取——「业务逻辑只写一次，两端行为严格一致」（commands.ts:8-9）。

---

## 6. 格式转换注册表：convert / import

**输出侧（convert）**——`converters.ts` 注册表（converters.ts:12-31，`registerConverter`/`listFormats`/`convert`，未知格式抛错）：

| 格式 | 注册点 | 说明 |
|------|--------|------|
| `mermaid` | mermaid.ts:443 | 支持 flowchart/mindmap/sequence/er/state/gantt；uml-class/arch/datastream 降级 flowchart 输出（mermaid.ts:5-8 头注释）——**CLI 对降级有显式告警**（cli convert.ts:24-27） |
| `plantuml` | plantuml.ts:106 | 仅 flowchart 活动图；CLI 对非 flowchart **拒绝导出**（convert.ts:78-80「refusing to emit a misleading activity diagram」） |
| `json` | json.ts:15 | 文档直接序列化 |

**输入侧（import）**——cli import.ts `--from` choices `['mermaid', 'json']`：
- **mermaid-import.ts**（1553 行）：解析 exportMermaid 产出的 6 个方言（flowchart/sequence/mindmap/state/er/gantt）→ LgdlDocument；**容错**（返回 issues 而非 throw，模块头注释）；**注意**：这是全 core 唯一含 `severity: 'warning'` 的文件（ADR-005 明示的例外——宽容转换非主解析路径）
- **json**：文档 JSON 直接解析 + validate 后落盘（import.ts:51-82）
- **导入后强制 re-validate**（import.ts:104-114）：导入产物必须通过自身校验器，否则拒绝写出——「import must never produce a .lgdl file that its own validator rejects」

---

## 7. 测试基线：281 个测试（当日实测复验）

**当日实测**：`cd packages/core && npm test` → **281/281 通过（fail 0，1365ms）**。四个测试文件：

| 文件 | 规模 | 覆盖主题（实读测试名抽样） |
|------|-----:|------|
| parser.test.ts | 829 行 | 严格校验全套：旧 groups: 拒绝、成员规则（visibility/params/er 例外）、基数白名单（"many" 拒绝）、BOM 剥离、行内注释、负数字 attrs、嵌套组合法、一组两属报错 |
| mutations.test.ts | 2987 行 | 增删改全矩阵：id 冲突、级联清边、组放置、边去重（label 区分平行边）、removeEdge 歧义拒绝 |
| operations.test.ts | 129 行 | applyOperation 九变体、批量失败即停/failedIndex/槽位填充 |
| commands.test.ts | 120 行 | buildOperation 门禁：必填缺失抛错、no-change 抛错、attrs 无损解析、member 解析 |

> 根级 D7 漂移：CHANGELOG.md:15,27 记载「core 314」——实测 281，差异已在根级漂移清单记录（本档不再重复展开）。

---

## 8. 与 ADR-004 / ADR-005 / ADR-008 的呼应（实读核实表）

| ADR | 核心决策 | 本档证据落点（实读） | 状态 |
|-----|---------|---------------------|------|
| **ADR-004** | 双 CLI 物理分离 + core 命令注册表单一实现 | commands.ts:1-10 模块头（「lgdl-cli 与 lgdl-web-cli 共享的业务逻辑层」）；COMMANDS 注册表 commands.ts:26-90；web-cli.ts:100-134 增量命令全走 buildOperation；cli/registry.ts:38-58 19 命令 | ✅ 与 adr-index.md:104-108 证据锚点一致 |
| **ADR-005** | error-only 严格校验（无静默降级） | parser.ts 42 处 error / 0 处 warning（当日 grep 实测）；allowlist 拒绝未知字段；旧 groups:/newline 成员/编造基数全部 error；mermaid-import 例外（warning 仅存在于导入器） | ✅ 与 adr-index.md:121-122 一致 |
| **ADR-008** | 增量编辑协议（AI 永不整图重写） | operations.ts:31-84 九变体；applyOperation 单一映射 :111-175；applyOperations 失败即停 :199-220；mutations 结构不变量双保险 | ✅ 与 adr-index.md:169-170 一致 |

---

## 9. 漂移与缺口（本批新增记录，未修改任何文件）

| # | 位置 | 说明 |
|---|------|------|
| C-D1 | 批次指令口径 vs 实测 | 「core 被其余 5 包依赖」——实测 router 零依赖（router/package.json:18），core 被 **4 包**（cli/layout/render/web）依赖。属描述精度修正，非代码漂移 |
| C-D2 | parser.test.ts fixture | locate.test.ts（web 包）的 SRC fixture 仍含顶层 `groups:` 节（locate.test.ts:24-26）——该测试路径只覆盖旧版语法，与 group-as-node 的现代序列化（serialize.ts 从不输出 `groups:`）不对应。**该断裂的完整分析见 render 文档 §9 R-D2**（render 发射 `groups[i]` 定位 ↔ web locate 解析的跨包缺口） |
| C-D3 | 无 | 本批未发现 core 内部代码与既有文档的其它不一致；根级 D1-D8 中涉及 core 的 D2/D6（旧 groups 语法）已在本档 §2.3 从代码侧复验 |

---

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建（批次 2b：语义层引擎深潜 · core） | 2026-08-30 | sddu-docs Agent |
