# 任务分解：specs-tree-examples-consolidation（示例图整合）

> **文档定位**: SDDU 任务清单 — 将技术方案分解为可并行执行的原子任务，作为 build 阶段的输入
> **前置依赖**: plan.md v1.0（技术方案）、spec.md v1.0（需求规范，14 FR / 5 NFR / 7 EC / D-001~D-004）
> **创建人**: SDDU Tasks Agent
> **创建时间**: 2026-09-03
> **版本**: v1.0
> **更新人**: SDDU Tasks Agent
> **更新时间**: 2026-09-03
> **更新说明**: 初始创建 — 将 plan 的 6 步迁移（内容面 → 镜像 → 测试联动 → 脚本修复+磁盘 → golden 快照重建+diff 审阅 → 总验收）分解为 10 个原子任务、6 个执行波次

## 1. 依赖拓扑总览
> 任务依赖关系、执行波次、依赖图与关键路径

### 1.1 波次图（串行主链 + 并行侧链）

```
Wave 1 ─── (无依赖，并行)
  TASK-001 [L]  examples.ts 内容面 11→9（删 2 条目 + er/gantt/ecommerce-flow 3 例 source 终态改写）
  TASK-002 [S]  脚本包路径修复（gen-examples.mjs 4 处 + render-one.mjs 3 处）

Wave 2 ─── (依赖 TASK-001)
  TASK-003 [M]  examples-sources.ts 镜像同步 11→9（逐字 + 头注释）

Wave 3 ─── (依赖 TASK-003，并行)
  TASK-004 [M]  kind-coverage.test.ts 换档（login-flow→ecommerce-flow 3 处 + er typed 适配 + 核对表）
  TASK-005 [S]  snapshot.test.ts 计数断言 11→9（:73 + 头注释/文案）
  TASK-006 [S]  matrix-a / matrix-b 零改动复核（只读验证）

Wave 4 ─── (磁盘清理；TASK-007 无硬依赖，按 plan §2.4 六步序置于测试联动之后)
  TASK-007 [M]  examples/ 删 12 组三件套（10 孤儿 + microservices/login-flow，36 文件）

Wave 5 ─── (依赖前序，并行)
  TASK-008 [M]  磁盘重生成 9 组三件套（dist 构建 → gen-examples → 双向比对）（依赖 TASK-001/002/007）
  TASK-009 [M]  golden 快照重建 + git diff 审阅（5 判据）（依赖 TASK-003/004/005/006）

Wave 6 ─── (依赖全部)
  TASK-010 [M]  全仓验收：四面一致 + 测试守恒 + 引擎零 diff
```

### 1.2 依赖图

```
内容主链:  TASK-001 ──► TASK-003 ──► TASK-004 ──┐
                    (examples.ts)  (镜像 9)      ├─► TASK-009 ──► TASK-010
                                          TASK-005 ─┤  (golden重建+审阅) (总验收)
                                          TASK-006 ─┘
脚本侧链:  TASK-002 ──────────────────► TASK-008 ─►┘
                    (路径修复)             (重生成 9)      ▲
磁盘清理:  TASK-007（无硬依赖，Wave 4）──────────► TASK-008
```

### 1.3 关键路径

```
TASK-001 → TASK-003 → (TASK-004 ‖ TASK-005 ‖ TASK-006) → TASK-009 → TASK-010
```
- **长度**: 5 个任务 / 跨越 6 个波次（主链串行，任选一条测试支路均等效）
- **侧链（非关键）**: TASK-002 → TASK-008（及 TASK-007 → TASK-008）并行于主链，Wave 5 汇入验收
- **判定依据**: 内容必须定稿才能镜像同步；镜像 9 集是测试联动与快照重建的对象集（snapshot.test.ts:41-49 以 EXAMPLES_SOURCES 为渲染源）；golden 只能在全内容 + 镜像 + 测试断言终态后重建一次（ADR-003 显式重建纪律，避免二次重建）

## 2. 任务列表
> 每个任务的详细定义

### TASK-001: examples.ts 内容面 11→9（删 2 例 + 3 例 source 终态改写）
> 单一事实源主体变更（FR-001~FR-005），9 图 DSL 终态落盘

| 属性 | 值 |
|------|-----|
| **复杂度** | L |
| **前置依赖** | 无 |
| **执行波次** | 1 |
| **对应 FR** | FR-001 / FR-002 / FR-003 / FR-004 / FR-005 |

**描述**: 编辑 `packages/lgdl-web/src/examples.ts`，使 `EXAMPLES.length` 由 11 → 9：
1. **删除 2 个整条目**（含周边空行）：`microservices`（arch 重复例，:21-25）、`login-flow`（flowchart 重复例，:41-45）
2. **er 条目 source 整体替换**为 plan §2.3.3 终态 DSL（参照 spec D-003）：5 实体（user/order/product/order-item/新 promotion）members 全部带 `type`（id: bigint / name: varchar / price: decimal / amount: decimal / quantity: int，**quantity 依据 spec D-003 决策 1 明列**）；amount-note note 混 kind 便签；6 条边（5 带基数 + 1 note→order 无基数约束边）；**edges[0] = user→order 守序**（matrix-a.test.ts:131 专项）；基数值域覆盖 1 / 0..1 / 0..* / 1..* / *..*（双多 n:m promotion↔product）
3. **gantt 条目 source 整体替换**为 plan §2.3.4 终态 DSL（参照 spec D-004 / ADR-001）：launch 里程碑 `attrs.duration: 0`（原 1）；**新增 doc（文档编写）/ retro（发布复盘）2 个 process 节点**；6 条依赖边覆盖三型——gap≈0 链 4 条（research→design→develop→test→launch，target.start=source.end）+ 目标在左 1 条（test→doc：doc.start=10 < test.end=18）+ gap≥20 1 条（test→retro：retro.start 38 − test.end 18 = 20）；节点声明序 research/design/develop/doc/test/retro/launch（layoutGantt 按声明序逐行堆叠，保证垂直段空列不穿条）
4. **ecommerce-flow 条目**：在 after-sale 组声明（`contains: [refund]`）之后、`edges:` 之前**插入 1 个外层分组节点** `platform`（label 电商平台 / kind group / `contains: [shopping, trade, fulfillment, after-sale]`），实现 platform ⊃ shopping ⊃ browse/cart 2 层嵌套（D-002，承接 login-flow 删除后流失的 A 档嵌套载体）；**14 业务节点 + 17 边 + 既有 4 域组内容零改动**；group 数 4→5
5. **保留 6 例（architecture/datastream/mindmap/sequence/state/uml-class）source 逐字零改动**（FR-005）；文件头 "single source of truth" 注释保留

**约束**: source 为单行转义字符串（gen-examples.mjs:25 正则硬解析），保持既有 `\n` 转义格式；禁止改动其余 6 例任何字符。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/lgdl-web/src/examples.ts` |

**验收标准**:
- [ ] `EXAMPLES.length === 9`，id 序恰为 architecture/datastream/er/gantt/ecommerce-flow/mindmap/sequence/state/uml-class，无 microservices/login-flow；`EXAMPLES[0].id === 'architecture'`
- [ ] er source 含 promotion 实体、5 实体 members 全部带 `type`、amount-note（kind note）、6 条边且 edges[0]=user→order、基数 token 全集 {1, 0..1, 0..*, 1..*, *} 出现
- [ ] gantt source 中 launch `attrs.duration === 0`；doc/retro 节点存在；按 source 数值逐边验算：链式边 target.start = source.end（gap≈0）×4、test→doc target.start(10) < test.end(18)（目标在左）、test→retro target.start(38) − test.end(18) ≥ 20（gap≥20）
- [ ] ecommerce-flow source 含 platform 组声明（contains 4 域组 id），业务节点数 14、边数 17、group 数 5
- [ ] `git diff -- packages/lgdl-web/src/examples.ts` 审阅：变更仅限上述 5 个条目，6 保留例无任何字符变化
- [ ] 9/9 source 被 parser 接受（parseLgdl valid，实测命令见下）

**验证命令**:
```bash
node --input-type=module - <<'EOF'
import { readFileSync } from 'node:fs';
import { parseLgdl } from './packages/lgdl-core/dist/index.js';
const ts = readFileSync('packages/lgdl-web/src/examples.ts', 'utf8');
const re = /id: "([^"]+)",\s*label: "([^"]*)",\s*source: "((?:[^"\\]|\\.)*)"/g;
let m; const ids = [];
while ((m = re.exec(ts))) {
  ids.push(m[1]);
  const { valid } = parseLgdl(JSON.parse('"' + m[3] + '"'));
  if (!valid) throw new Error('parse fail: ' + m[1]);
}
const want = ['architecture','datastream','er','gantt','ecommerce-flow','mindmap','sequence','state','uml-class'];
if (JSON.stringify(ids) !== JSON.stringify(want)) throw new Error('ids 序不符: ' + ids.join(','));
console.log('OK 9/9 parse valid, 序 =', ids.join(','));
EOF
```

### TASK-002: 生成脚本包路径修复（gen-examples.mjs 4 处 + render-one.mjs 3 处）
> 修复 V2 9 包重命名后断裂的产物生成链路（FR-007）

| 属性 | 值 |
|------|-----|
| **复杂度** | S |
| **前置依赖** | 无 |
| **执行波次** | 1 |
| **对应 FR** | FR-007 |

**描述**: 替换两个脚本中的旧包路径（V2 前目录名，实测 ERR_MODULE_NOT_FOUND）为现 lgdl-* 路径；其余逻辑零改动（PNG 可选 @resvg/resvg-js 容错保留，:25 正则、:47-55 PNG 逻辑不动）。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `scripts/gen-examples.mjs` |
| MODIFY | `scripts/render-one.mjs` |

**验收标准**:
- [ ] gen-examples.mjs：`:3` 注释与 `:20` 读路径 `packages/web/src/examples.ts` → `packages/lgdl-web/src/examples.ts`；`:15-17` import `../packages/core|layout|render/dist/index.js` → `../packages/lgdl-core|lgdl-layout|lgdl-render/dist/index.js`（4 处）
- [ ] render-one.mjs：`:12-14` 三处 import 同上换 lgdl-* 前缀（3 处）
- [ ] 全仓 grep 无残留旧路径 `packages/core/dist` / `packages/layout/dist` / `packages/render/dist` / `packages/web/src`
- [ ] 链路冒烟（不改动仓库产物）：对 /tmp 副本渲染旧 .lgdl 成功产出 svg

**验证命令**:
```bash
grep -rn 'packages/core/dist\|packages/layout/dist\|packages/render/dist\|packages/web/src' scripts/ && exit 1 || echo '无残留旧路径'
cp examples/er.lgdl /tmp/opencode/smoke-er.lgdl && node scripts/render-one.mjs /tmp/opencode/smoke-er.lgdl
ls -la /tmp/opencode/smoke-er.svg   # 期望存在且非空
```

### TASK-003: examples-sources.ts 镜像同步 11→9（逐字）
> ADR-002 受管镜像与单一事实源对齐（FR-009）

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-001 |
| **执行波次** | 2 |
| **对应 FR** | FR-009 |

**描述**: 同步 `packages/lgdl-render/src/test-support/examples-sources.ts` 与 examples.ts 终态：
1. 删除 `microservices`、`login-flow` 两个单行条目
2. `er` / `gantt` / `ecommerce-flow` 三条 source 与 examples.ts 终态**逐字等价**（含全部增强内容）
3. 保留 6 条（architecture/datastream/mindmap/sequence/state/uml-class）零改动；条目序与 examples.ts 一致
4. 文件头注释 `:2` "11 source" → "9 source"

**约束**: 禁止 import `@lgdl/lgdl-web`（render→web 反向依赖成环）；同步以 source 字符串逐字一致为验收（脚本比对）。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/lgdl-render/src/test-support/examples-sources.ts` |

**验收标准**:
- [ ] 镜像条目数 9、id 序与 examples.ts 9 例完全一致
- [ ] 脚本双向比对：镜像 9 条 source 字符串与 examples.ts 9 条 source **逐字相等（0 差异）**
- [ ] 文件头注释为 "9 source"；无残留 "11 source"
- [ ] `npm run build:test`（lgdl-render 包）编译通过

**验证命令**:
```bash
cd packages/lgdl-render && npm run build:test && node --input-type=module - <<'EOF'
import { readFileSync } from 'node:fs';
const web = readFileSync('../../packages/lgdl-web/src/examples.ts', 'utf8');
const mir = readFileSync('src/test-support/examples-sources.ts', 'utf8');
const re = /id: "([^"]+)",\s*(?:label: "[^"]*",\s*)?source: "((?:[^"\\]|\\.)*)"/g;
const grab = (txt) => { const map = new Map(); let m; while ((m = re.exec(txt))) map.set(m[1], JSON.parse('"' + m[2] + '"')); return map; };
const a = grab(web), b = grab(mir);
if (a.size !== 9 || b.size !== 9) throw new Error('size: web=' + a.size + ' mir=' + b.size);
for (const [id, src] of a) { if (b.get(id) !== src) throw new Error('diff @ ' + id); }
if ([...a.keys()].join(',') !== [...b.keys()].join(',')) throw new Error('id 序不一致');
console.log('OK 镜像 9/9 与 web 逐字一致');
EOF
```

### TASK-004: kind-coverage.test.ts 断言换档（login-flow→ecommerce-flow）+ er typed 适配
> 删除例断言语义等价迁移，数量不缩减（FR-012）

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-003 |
| **执行波次** | 3 |
| **对应 FR** | FR-012 |

**描述**: `packages/lgdl-render/src/kind-coverage.test.ts` 中 login-flow 相关断言全部迁移至 ecommerce-flow，并适配 er typed 行文本；断言强度等价，禁止静默删除/弱化：
1. 文件头核对表：`:9` start/end 行、`:11` decision 行引用 login-flow → ecommerce-flow；`:13` note 行删 microservices 引用（`architecture、microservices / B1/B8` → `architecture / B1/B8`）；`:16` group 行 `login-flow(2 层嵌套)` → `ecommerce-flow(2 层嵌套)`
2. start/end 药丸用例（:53-57）：`example('login-flow')` + node 'start' → `example('ecommerce-flow')` + node 'browse'（browse 为 start kind）
3. decision 菱形用例（:83-96）：`example('login-flow')` + node 'verify' → `example('ecommerce-flow')` + node 'validate'（validate 为 decision kind）
4. er members 行文本断言（:106-109）：`>id</text>`/`>name</text>`/`>email</text>` → typed 行文本 `>id: bigint</text>`/`>name: varchar</text>`/`>email: varchar</text>`（断言强度等价）
5. 嵌套组用例（:167-187）：test 名与 `example('login-flow')` → ecommerce-flow；lgdl-group rect 计数 3 → **5**（:176）；外含内判定取 platform 外框 vs shopping 内框（:181-182，frontend→platform、auth→shopping）
6. **不改动**: :138-154 gantt milestone 菱形断言（duration=0 不影响 kind 判定，须保持通过）、:189-197 datastream 泳道、:201-207 mindmap 无 kind

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/lgdl-render/src/kind-coverage.test.ts` |

**验收标准**:
- [ ] git diff 逐一对应上述迁移清单：每处 login-flow→ecommerce-flow 迁移显式可见；无静默删断言、无断言弱化
- [ ] 单独运行 kind-coverage 测试文件全绿（含迁移后的 ecommerce-flow start/decision/嵌套断言、er typed 断言、gantt milestone 菱形断言原样通过）
- [ ] 文件头核对表无 login-flow / microservices 残留引用

**验证命令**:
```bash
cd packages/lgdl-render && npm run build:test && node --test dist-test/kind-coverage.test.js
```

### TASK-005: snapshot.test.ts 计数断言 11→9
> 快照 manifest 完整性断言与文案联动（FR-010）

| 属性 | 值 |
|------|-----|
| **复杂度** | S |
| **前置依赖** | TASK-003 |
| **执行波次** | 3 |
| **对应 FR** | FR-010 |

**描述**: `packages/lgdl-render/src/snapshot.test.ts` 中所有 "11" 计数断言与文案更新为 9：
1. `:73` `assert.equal(manifest.ids.length, 11` → `9`（含错误消息文案）
2. 注释与 test 名：`:4` "11 源"、`:8` "长度 11"、`:10-11` "重写 11 svg"、`:41` "渲染 11 例"、`:69` test 名 "11 ids" → 对应 9
3. **不改动**: :51-67 更新门（LGDL_UPDATE_SNAPSHOTS=1）、:89-97 逐例双校验循环（随 EXAMPLES_SOURCES 自动 9 条）

**注**: 本任务静态验收即可；运行时绿色在 TASK-009 golden 重建后达成（重建 9 组 svg + manifest 后本文件 9 条双校验 + manifest 完整性断言自证）。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/lgdl-render/src/snapshot.test.ts` |

**验收标准**:
- [ ] `:73` ids.length 断言为 9；全文件无残留 "11" 计数断言/文案（"11 源/长度 11/重写 11/渲染 11 例/11 ids"）
- [ ] LGDL_UPDATE_SNAPSHOTS=1 重建后 manifest 完整性 test 名体现 9 ids（TASK-009 运行时验证）
- [ ] `npm run build:test` 编译通过（运行时验证留 TASK-009）

**验证命令**:
```bash
grep -n 'ids.length, 11\|长度 11\|11 源\|重写 11\|渲染 11 例\|11 ids\|11 svg' packages/lgdl-render/src/snapshot.test.ts && exit 1 || echo '无 11 残留断言'
cd packages/lgdl-render && npm run build:test
```

### TASK-006: matrix-a / matrix-b 零改动复核（只读验证）
> A 档几何门禁 + state 对照组在增强内容下保持成立（FR-013）

| 属性 | 值 |
|------|-----|
| **复杂度** | S |
| **前置依赖** | TASK-003 |
| **执行波次** | 3 |
| **对应 FR** | FR-013 |

**描述**: **零文件改动**，仅运行验证（matrix-a.test.ts / matrix-b.test.ts 均不改动）：
1. matrix-a 遍历自动 9 条（:123-133）：9 例 audit **0 违例**（H2/H3 风险门：er n:m *..* 双多、gantt 里程碑新几何、ecommerce 嵌套组边路由均为未断言/新组合）
2. 专项断言成立：er `assertNoOwnBoxPierce('er', 0)`（edges[0]=user→order 守序由 TASK-001 内容保证）、uml-class `assertNoOwnBoxPierce('uml-class', 1)`（source 零改动）
3. matrix-b B10 对照组成立：A 档 state 单入口有 initial（matrix-b.test.ts:249-251），state source 零 diff 锁定
4. **零改动**：git diff 无 matrix-a.test.ts / matrix-b.test.ts 任何改动

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| KEEP | `packages/lgdl-render/src/matrix-a.test.ts`（零改动，只读验证） |
| KEEP | `packages/lgdl-render/src/matrix-b.test.ts`（零改动，只读验证） |

**验收标准**:
- [ ] matrix-a 9 条全绿（audit 0 违例 + er edges[0] / uml-class edges[1] 专项穿体断言）
- [ ] matrix-b 全绿（A 档 state 对照组 + B 档 fixture）
- [ ] `git status --short` 确认 matrix-a/matrix-b 两测试文件零改动

**验证命令**:
```bash
cd packages/lgdl-render && npm run build:test && node --test dist-test/matrix-a.test.js dist-test/matrix-b.test.js
git status --short src/matrix-a.test.ts src/matrix-b.test.ts   # 期望无输出
```

### TASK-007: examples/ 磁盘删 12 组三件套（10 孤儿 + microservices/login-flow）
> 磁盘孤儿与重复例清理（FR-006）

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | 无（按 plan §2.4 六步序置于 Wave 4，与 TASK-008 同段保证磁盘终态先于验收） |
| **执行波次** | 4 |
| **对应 FR** | FR-006 |

**描述**: 删除 examples/ 下 12 组 `.lgdl/.svg/.png` 三件套共 **36 文件**：
- 孤儿 10 组: arch-ecommerce / datastream-log / er-orders / flowchart-auth / gantt-saas-roadmap / group-node-demo / mindmap-product / sequence-order / state-order / uml-class-order（discovery §2.1 精确清单）
- 重复例镜像 2 组: microservices / login-flow
- 删除须在 TASK-008 重生成前完成（或由其兜底清理后复核），终态与 9 例重生成产物一致

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| DELETE | `examples/{arch-ecommerce,datastream-log,er-orders,flowchart-auth,gantt-saas-roadmap,group-node-demo,mindmap-product,sequence-order,state-order,uml-class-order,microservices,login-flow}.{lgdl,svg,png}`（36 文件） |

**验收标准**:
- [ ] `ls examples/*.lgdl` 恰 9 个且 id 集 = {architecture, datastream, er, gantt, ecommerce-flow, mindmap, sequence, state, uml-class}
- [ ] `.svg`、`.png` 各恰 9 个；无 12 删除组中任何残留三件套文件

**验证命令**:
```bash
ls examples/*.lgdl | wc -l   # 期望 9
ls examples/*.svg  | wc -l   # 期望 9
ls examples/*.png  | wc -l   # 期望 9
for f in arch-ecommerce datastream-log er-orders flowchart-auth gantt-saas-roadmap group-node-demo mindmap-product sequence-order state-order uml-class-order microservices login-flow; do
  test -e "examples/$f.lgdl" && echo "残留: $f.lgdl" && exit 1
done
echo 'OK 12 组三件套已删除'
```

### TASK-008: 磁盘重生成 9 组三件套（dist 构建 → gen-examples → 双向比对）
> 产物生成链路修复后重建磁盘终态（FR-008 / NFR-002）

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-001（内容终态）/ TASK-002（脚本修复）/ TASK-007（先删后生成） |
| **执行波次** | 5 |
| **对应 FR** | FR-008 |

**描述**: 前置确认/执行 4 包 dist 构建（gen-examples.mjs:15-17 import dist；引擎 src 零 diff 故 dist 字节与改动前一致），随后运行修复后的生成脚本重生成 9 组三件套：
1. `npm run build --workspaces`（或至少 lgdl-core/lgdl-layout/lgdl-render 三包）
2. `node scripts/gen-examples.mjs`：对 9 例逐一输出 `.lgdl`/`.svg`（解析失败须报错退出码非 0，不静默跳过——EC-006）；`.png` 缺失时明确跳过不报错
3. 非增强 6 组 `.svg` 若与旧磁盘字节不同，属修正 render-gate D-002 记录的磁盘漂移（snapshot.test.ts:5 注释佐证）——以「磁盘 .lgdl ↔ examples.ts 逐字一致 + .svg 为当前引擎渲染字节」为验收，**不以旧磁盘字节为基线**

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| NEW/覆盖 | `examples/{architecture,datastream,er,gantt,ecommerce-flow,mindmap,sequence,state,uml-class}.{lgdl,svg,png}`（经脚本重写） |

**验收标准**:
- [ ] 脚本退出码 0；磁盘 9 组 .lgdl 与 examples.ts 9 条 source **逐字一致 9/9**（脚本双向比对，FR-008/NFR-002）
- [ ] `ls examples/*.lgdl` / `.svg` = 9；.png 存在或脚本明确跳过记录（无 @resvg 时以 lgdl/svg 为验收主体）
- [ ] examples/ 文件集合与 EXAMPLES id 集完全相等（无孤儿、无缺漏）

**验证命令**:
```bash
npm run build --workspaces
node scripts/gen-examples.mjs && ls examples/*.lgdl | wc -l && ls examples/*.svg | wc -l
# 逐字比对 9/9：复用 TASK-003 的抓取比对思路，源文件改为 examples/<id>.lgdl
```

### TASK-009: golden 快照重建 + git diff 审阅（5 判据）
> 快照 11→9 显式重建与范围核验（FR-011 / NFR-003 / NFR-005 / plan §4.2）

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-003（镜像 9 = 快照对象集）/ TASK-004 / TASK-005 / TASK-006（测试断言终态就位） |
| **执行波次** | 5 |
| **对应 FR** | FR-011 |

**描述**: 删除 2 张孤儿 svg 后以 `LGDL_UPDATE_SNAPSHOTS=1` 显式重建 golden 资产，并做 git diff 审阅：
1. **DELETE**: `test-assets/golden/login-flow.svg`、`microservices.svg`（重建只写镜像 9 集，两文件不自动清理）
2. **显式重建**: `LGDL_UPDATE_SNAPSHOTS=1` 跑 lgdl-render snapshot 测试 → 重写 9 组 svg + manifest.json（ids 9 / files sha256 9）；重建后普通模式复跑 9 条字节+sha 双校验自证全绿
3. **git diff 审阅（plan §4.2 五判据）**:
   - 判据 1（变更集上界）: git 变更文件 ⊆ plan §5 文件影响表；无 scope.out 越界（引擎 4 包 src/dist、README/docs/op-cli 文档串、router.test.ts 注释零 diff）
   - 判据 2（golden 目录）: 字节变更 = er.svg / gantt.svg / ecommerce-flow.svg + manifest.json；删除 = login-flow.svg / microservices.svg；**0 diff 必证** = architecture/datastream/mindmap/sequence/state/uml-class 六 svg（确定性自证）
   - 判据 3（manifest 语义）: ids 恰 9 且与镜像 id 集一致（顺序同）；files 键齐无多余；version=1；无时间戳/env 字段
   - 判据 4（三变更 svg diff 内容核验）: er.svg 出现第 5 实体卡片 promotion + note 折角 path + members 行文本 `: bigint` 等 type 后缀 + 基数锚点文本 0..1/0..*/1..*/1..* 双端组合；gantt.svg launch 菱形文本 `18d +0d` + 任务行 7 + 依赖箭头 6（含 1 向左绕行目标在左 + 1 长距 gap≥20）；ecommerce-flow.svg `lgdl-group` rect 5 个且 platform 外框完整含 shopping/trade/fulfillment/after-sale 四内框
   - 判据 5（回归）: lgdl-render snapshot 9 条双校验（字节 + sha256）全绿（snapshot.test.ts:89-97 自动循环）

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| DELETE | `packages/lgdl-render/test-assets/golden/login-flow.svg` |
| DELETE | `packages/lgdl-render/test-assets/golden/microservices.svg` |
| MODIFY（显式重建） | `packages/lgdl-render/test-assets/golden/{er,gantt,ecommerce-flow}.svg` |
| MODIFY（显式重建） | `packages/lgdl-render/test-assets/golden/manifest.json` |
| KEEP（0 diff 自证） | `packages/lgdl-render/test-assets/golden/{architecture,datastream,mindmap,sequence,state,uml-class}.svg` |

**验收标准**:
- [ ] 重建后 manifest ids.length === 9 且与镜像 9 集一致（顺序同）、files 键齐、version=1、无时间戳字段
- [ ] 六 svg 0 diff（git diff 无输出）；login-flow.svg / microservices.svg 已删除
- [ ] 三变更 svg diff 内容满足判据 4 的逐项核验
- [ ] 普通模式（无 env）复跑 snapshot 测试 9 条双校验全绿，确认无静默写盘分支
- [ ] git 变更文件集 ⊆ plan §5 影响表（无 scope.out 越界）

**验证命令**:
```bash
rm packages/lgdl-render/test-assets/golden/login-flow.svg packages/lgdl-render/test-assets/golden/microservices.svg
cd packages/lgdl-render && LGDL_UPDATE_SNAPSHOTS=1 npm test        # 显式重建（含 9 条双校验自证）
npm test                                                             # 普通模式复跑全绿（无写盘）
git diff --stat packages/lgdl-render/test-assets/golden/            # 审阅变更集（三 svg + manifest + 2 删除）
git diff packages/lgdl-render/test-assets/golden/er.svg             # 判据 4 逐项核验
```

### TASK-010: 全仓验收（四面一致 + 测试守恒 + 引擎零 diff）
> 整合后总体验收（FR-014 / NFR-001 / NFR-002 / NFR-004）

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-007 / TASK-008 / TASK-009（及传递依赖全部任务） |
| **执行波次** | 6 |
| **对应 FR** | FR-014 |

**描述**: 全 Feature 终态验收，覆盖 spec FR-014 四判据：
1. **全仓测试**: `npm run test --workspaces` 全绿
2. **9 类型守恒**: 9 id × 9 type 一一映射，类型集合 = {arch, datastream, er, gantt, flowchart, mindmap, sequence, state, uml-class} 不变（9 类）
3. **四面一致**: examples.ts / 镜像（examples-sources.ts）/ 磁盘（examples/）/ golden（manifest+svg）四面对齐 9 集；双向无孤儿、无缺漏
4. **测试守恒（NFR-004）**: git diff 逐一对应 FR-009~FR-013 清单——允许 = 计数 11→9、login-flow 3 处断言语义等价迁移、er typed 适配；禁止 = 断言静默删除/弱化/清单外测试改动
5. **引擎零 diff（NFR-001）**: 引擎 4 包（lgdl-core/lgdl-layout/lgdl-render/lgdl-router）src 业务文件零 diff；dist 与改动前一致（hash 比对）；README/docs/op-cli 文档串零 diff（scope.out）

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| KEEP | 全仓验收（零代码写入） |

**验收标准**:
- [ ] `npm run test --workspaces` 全仓绿（含 lgdl-render snapshot 9 双校验 / matrix-a 9 条 / kind-coverage 迁移后 / matrix-b 对照组 / lgdl-router 等全部包）
- [ ] 四面脚本比对：examples.ts ↔ 镜像 9/9 逐字一致、examples.ts ↔ 磁盘 .lgdl 9/9 逐字一致、golden manifest ids = 镜像 id 集（顺序同）
- [ ] 9 例 type 集合恰为上述 9 类（无新增/无缺失类型）
- [ ] `git status --short` + `git diff --stat` 审阅：变更文件 ⊆ {examples.ts, examples-sources.ts, kind-coverage.test.ts, snapshot.test.ts, gen-examples.mjs, render-one.mjs, examples/(9 组×3), golden/(9 svg+manifest)}；引擎 4 包 src 业务文件、README/docs/op-cli 零 diff
- [ ] 无 scope.out 越界（无任何图类型定义 / types.ts / 引擎 src 改动）

**验证命令**:
```bash
npm run test --workspaces
git status --short
git diff --stat
# 四面一致脚本比对 + type 映射核验（组合 TASK-003 比对脚本与 examples/ 文件集检查）
```

## 3. 任务汇总
> 任务数量、复杂度和波次的统计总览

| 统计项 | 数值 |
|--------|:--:|
| 总任务数 | 10 |
| S 级 (简单) | 3（TASK-002 / TASK-005 / TASK-006） |
| M 级 (中等) | 6（TASK-003 / TASK-004 / TASK-007 / TASK-008 / TASK-009 / TASK-010） |
| L 级 (复杂) | 1（TASK-001） |
| 执行波次 | 6 |

## 4. 执行策略
> 各波次的执行说明

| 波次 | 任务 | 策略 |
|:--:|------|------|
| 1 | TASK-001, TASK-002 | 并行执行（内容面与脚本修复互不依赖） |
| 2 | TASK-003 | 串行（镜像必须等 examples.ts 终态——逐字同步基准） |
| 3 | TASK-004, TASK-005, TASK-006 | 并行执行（三测试文件互不冲突，均以镜像 9 集为运行对象；005 仅静态验收，运行时留 Wave 5） |
| 4 | TASK-007 | 磁盘清理（无硬依赖；置于测试联动之后遵循 plan 六步序；与 Wave 5 的 TASK-008 保证先删后生成） |
| 5 | TASK-008, TASK-009 | 并行执行（磁盘三件套与 golden 资产目录不相交；均须在测试联动/内容终态后） |
| 6 | TASK-010 | 串行收口（全仓验收，依赖全部前序任务终态） |

**执行注意**:
- 主链（001→003→004/005/006→009→010）为关键路径，任一红则后续波次阻塞；侧链（002→008、007→008）不阻塞主链
- TASK-001 三例改写参照 plan §2.3.2~§2.3.4 完整终态 DSL（勿自行发挥）；quantity: int 与 doc/retro 节点分别经 spec D-003 / ADR-001（PROPOSED，spec D-004 表已含 test→doc、test→retro 边）背书
- TASK-009 是 ADR-003 纪律核心：golden 仅经 LGDL_UPDATE_SNAPSHOTS=1 显式重建一次，diff 审阅五判据须逐条记录（build 产物中可追溯）
- 若 TASK-006/TASK-009 中 matrix-a 出现真实几何违例（EC-001：n:m 双多 / 新基数边 / 嵌套组边路由）→ 先最小化调整内容（D-003/D-004 覆盖语义不降级）→ 仍红走 EC-001 记录上报，不修引擎、不放宽审计

## 修订记录
> 记录本文档的版本变更历史

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建 — plan 6 步迁移分解为 10 原子任务 6 波次（含依赖图、关键路径、每任务验收标准与验证命令） | 2026-09-03 | SDDU Tasks Agent |

---

## 5. 构建执行记录（build 阶段回填）
> sddu-build 2026-09 执行回填：逐任务状态 + 执行摘要 + 偏差记录（build.md 同步）

| 任务 | 波次 | 状态 | 执行摘要 |
|:--:|:--:|:--:|------|
| TASK-001 | 1 | ✅ completed | examples.ts 11→9：删 microservices/login-flow；er（5 实体 typed + amount-note 混 kind + 6 边基数五值 1/0..1/0..*/1..*/n:m，edges[0]=user→order 守序）/ gantt（launch duration=0 + doc/retro 新增 + 6 边依赖三型，节点序 research/design/develop/doc/test/retro/launch）/ ecommerce-flow（platform 外组，见偏差-1）改写；保留 6 例逐字零 diff；9/9 parseLgdl valid + id 序验证通过 |
| TASK-002 | 1 | ✅ completed | gen-examples.mjs 4 处 + render-one.mjs 3 处旧包路径 → lgdl-* 现路径；全仓 grep 无残留；/tmp 冒烟渲染 er.lgdl 成功产出 svg（仓库产物零触碰） |
| TASK-003 | 2 | ✅ completed | examples-sources.ts 11→9 逐字同步（含 3 例增强内容）；头注释 11 source→9 source；保留 6 条原始行零改写（git diff 0 保留行）；build:test 编译通过；比对脚本 9/9 逐字一致 + 序一致 |
| TASK-004 | 3 | ✅ completed | kind-coverage.test.ts：核对表 4 行 + start/end（browse）/decision（validate）/er typed 行文本（`>id: bigint</text>` 等）/嵌套组（platform⊃shopping，rect 3→5）全部迁移；gantt milestone 菱形与 datastream/mindmap 断言未动；文件无 login-flow/microservices 残留；11 tests 全绿 |
| TASK-005 | 3 | ✅ completed | snapshot.test.ts :4/:8/:10-11/:41/:69/:73 计数与文案 11→9；无 11 残留；build:test 编译通过（运行时绿在 TASK-009 重建后达成） |
| TASK-006 | 3 | ✅ completed | matrix-a / matrix-b **零文件改动**复核：matrix-a 9 条全绿（audit 0 违例 + er edges[0]/uml-class edges[1] 专项）+ matrix-b 全绿；git status 两文件无改动（ecommerce-flow 经偏差-1/-2 后 0 违例） |
| TASK-007 | 4 | ✅ completed | examples/ 删 12 组三件套 36 文件（10 孤儿 + microservices/login-flow）；ls .lgdl/.svg/.png 各恰 9；无残留 |
| TASK-008 | 5 | ✅ completed | npm run build --workspaces 全绿 → gen-examples.mjs 重生成 9 组三件套（含 PNG，@resvg/resvg-js 以 --no-save 临时安装，跟踪文件零改动）；磁盘 9 .lgdl ↔ examples.ts 逐字一致 9/9（0 diff）；examples/ 与 EXAMPLES id 集完全相等；非增强 6 组 .svg/.png 字节变化属修正历史磁盘漂移（FR-008 口径，见偏差-4） |
| TASK-009 | 5 | ✅ completed | 删 golden login-flow.svg/microservices.svg → LGDL_UPDATE_SNAPSHOTS=1 显式重建 9 svg + manifest → 普通模式复跑全绿（manifest 9 ids + 9 条字节+sha 双校验）；git diff 五判据审阅通过（判据 4 ecommerce 项按偏差-1 调整；六 svg 0 diff 自证） |
| TASK-010 | 6 | ✅ completed | 全仓 npm run test --workspaces 全绿（core 267 / render 95 / router 79 等，0 fail）；四面一致（examples.ts↔镜像↔磁盘 .lgdl↔golden manifest ids 9/9 对齐）；9 id×9 type 一一映射类型集不变；测试守恒（git diff 逐一对应 FR-009~FR-013 清单）；变更集 ⊆ 影响表 + 偏差-2 引擎例外；README/docs/op-cli/App.tsx 零 diff |

### 5.1 偏差记录（EC-001 作者裁决，详情见 build.md §5）

| # | 偏差 | 裁决 |
|:--:|------|------|
| 1 | D-002「platform contains 4 域」→ **`contains: [shopping]`**：4 域全包触发矩阵-a 真实违例（聚合边 G2 斜线 fallback / label G4 压框 / G5 越界），引擎聚合边路由把祖先组框当障碍（登录流程旧载体因 fallback 直线恰正交不受影响） | 作者 2026-09 裁决「platform 仅包 shopping」：保留 5 组 + platform⊃shopping 2 层嵌套载体；kind-coverage/FR-002 验收锚点不变 |
| 2 | **引擎微修复（NFR-001「引擎 4 包零 diff」例外）**：`packages/lgdl-layout/src/index.ts` layoutGrouped 新增嵌套组框顶 keep-on-canvas（renderer 同构递归求 deficit → 整体下移补足，仅含嵌套组且越界时生效，其余图 0 影响） | 作者裁决「引擎微修复（解除零 diff）」；v_shopping 下 platform 框顶 -10 → 0 |
| 3 | 9 图 3 例增强内容（er 全 16 typed 成员 / gantt 7 任务 6 依赖 / ecommerce platform）较 plan 终态无内容出入；判据 4 ecommerce 审阅项按偏差-1 调整为「platform 完整含 shopping 内框，trade/fulfillment/after-sale 平铺不入框」 | — |
| 4 | 磁盘非增强 6 组 .svg/.png 重生成后字节变化（architecture/datastream/mindmap/sequence/state/uml-class）= 修正 render-gate D-002 记录的历史磁盘漂移；验收以「磁盘 .lgdl↔examples.ts 逐字一致 + .svg 为当前引擎渲染字节」为口径（FR-008）；golden 六 svg 0 diff 自证不受影响 | — |
| 5 | PNG 重生成依赖 @resvg/resvg-js：以 `npm i --no-save` 临时安装（node_modules 级，package.json/package-lock 零改动）；脚本对 PNG 缺失的容错逻辑未动 | — |

## 修订记录
> 记录本文档的版本变更历史

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建 — plan 6 步迁移分解为 10 原子任务 6 波次（含依赖图、关键路径、每任务验收标准与验证命令） | 2026-09-03 | SDDU Tasks Agent |
| v1.1 | build 回填 — 10 任务完成状态 + 执行摘要 + 偏差记录（EC-001 作者裁决两项：D-002 contains 4 域→[shopping]、lgdl-layout 引擎微修复例外） | 2026-09-04 | SDDU Build Agent |
