/**
 * V4-1 TASK-514 (leaf `specs-tree-v4-1-zone-shell-density`) — the **design-contract
 * gate** (AC-CHAT-025 / FR-CHAT-036 / 父 plan ADR-V4-011 第 5 条 · R4-20).
 *
 * What it freezes, and what it deliberately does NOT:
 *
 *   1. **设计稿实跑** — `node design/ui-redesign/option-f-shim.mjs` must exit 0 and
 *      print `60 passed` / `0 failed`. The shim is the design draft's own Node DOM
 *      pad (zero build, zero Chromium, zero side effects); running it from the gate
 *      is what turns「设计契约」from a claim into a machine fact.
 *   2. **设计契约冻结** — the shim file's sha256 must equal the registered constant.
 *      A design-contract change is then **impossible to smuggle**: it must be
 *      registered (change the constant + the count + the mapping table), never
 *      silently done (FR-CHAT-036「禁静默改断言」).
 *   3. **计数口径显式** — exactly 60 assertion **call sites** (`check('…'`), plus
 *      exactly 1 `function check(` **declaration**. Note the honest accounting: the
 *      substring `check(` occurs **61** times in the shim, 60 of which are calls. The
 *      gate asserts both numbers separately and their relation (`total == calls + 1`)
 *      so the "60" in the plan is not a rounded-up claim.
 *   4. **逐条映射表** — a 60-row table mapping every assertion id (`A1`~`I1`) to its
 *      contract clause and the FR/AC it carries (spec §14 附录 A). The table's id set
 *      must equal the ids **extracted from the shim itself** (a mapping row for an
 *      assertion that no longer exists — or a shim assertion with no row — is a
 *      rubber stamp).
 *   5. **卡分类学** — `CARD_TYPES` (7 主类, `ai/user/nextstep/askuser/auth/system/ref`)
 *      is extracted from the shim and asserted verbatim (order included) against the
 *      spec taxonomy; the design draft must really carry a sample of each type.
 *
 * **It only judges the DESIGN DRAFT.** The real product's equivalent assertions live
 * in the Chromium gates (`test/ui/{journey,l0,l1,l2,density,insight,binding}.mjs`) and
 * the numbers of the two sides are registered **separately**
 * (`docs/v4-density-baseline.json#designCaliber`) — mixing them is exactly the R4-20
 * drift this split exists to prevent.
 *
 * Caliber registration (`npm test` inclusion): the file compiles with the rest of
 * `test/*.test.ts`, so `node --test dist-test/test/*.test.js` **does** execute it; it
 * is additionally exposed as the standalone `npm run test:design-contract` step of the
 * serial closeout chain (ADR-V4-023 第 1 条).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
// V5-1（TASK-V5-118 / 119）：G 反证的 temp 副本读写（**追加**导入，F 既有导入行逐字不动）。
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  G_ASSERTION_GROUPS,
  G_ASSERTION_MAP,
  G_DRAFT_SHA256,
  G_SHIM_CHECK_CALLS,
  G_SHIM_CHECK_DECLARATIONS,
  G_SHIM_SHA256,
} from './g-design-map.js';

const HERE = dirname(fileURLToPath(import.meta.url));

function packageRoot(): string {
  let dir = HERE;
  for (let i = 0; i < 6; i += 1) {
    if (existsSync(resolve(dir, 'package.json')) && existsSync(resolve(dir, 'src', 'ui', 'sidepanel'))) return dir;
    dir = resolve(dir, '..');
  }
  throw new Error(`package root not found from ${HERE}`);
}

const PKG = packageRoot();
const SHIM = resolve(PKG, 'design/ui-redesign/option-f-shim.mjs');
const DRAFT = resolve(PKG, 'design/ui-redesign/option-f-chat-stream.html');

/**
 * ── 设计契约冻结常量（改动 = 契约变更，必须走登记）────────────────────────────
 *
 * 登记方式（FR-CHAT-036 / ADR-V4-011 第 5 条）：① 改 shim / 设计稿；② 更新本常量与
 * `SHIM_CHECK_CALLS`；③ 更新 `ASSERTION_MAP`（60 → N 行）；④ 在 v4 台账登记
 * `designContractChanges[]`。**禁止**只改断言不改常量。
 */
const SHIM_SHA256 = '8ca5db6f7a152c2890814cff2fe58dc11345338890b26de62b3355837f591ed4';
const DRAFT_SHA256 = '49ce27fc1daba083cc361639d3d0a1ad991b961f0fa0f45fc016815e0fe2e526';
/** 断言**调用点**数（`check('…'`）；`check(` 的**全部**出现次数 = 本值 + 1（1 处函数声明）。 */
const SHIM_CHECK_CALLS = 60;
const SHIM_CHECK_DECLARATIONS = 1;

/** The 7 主类 (`FR-CHAT-021` / `FR-CHAT-036`), verbatim and order-significant. */
const SPEC_CARD_TYPES = ['ai', 'user', 'nextstep', 'askuser', 'auth', 'system', 'ref'] as const;

/**
 * 60 条断言 → 契约条款 → 承载 FR/AC（spec §14 附录 A 的逐条展开；`A1`~`I1` 全覆盖）。
 *
 * The rows are a **contract**, not documentation: `assertion-map` below recomputes the
 * id set from the shim and every row's clause/owner must be non-empty, so a row can
 * neither be dropped nor fabricated.
 */
const ASSERTION_MAP: ReadonlyArray<{ id: string; clause: string; owner: string }> = [
  { id: 'A1', clause: '三区结构存在（工具栏 / 聊天流 / 状态栏）', owner: 'FR-CHAT-010 / AC-CHAT-001' },
  { id: 'A2', clause: '三区顺序正确（工具栏 → 聊天流 → 状态栏）', owner: 'FR-CHAT-010 / AC-CHAT-001' },
  { id: 'A3', clause: '工具栏语义 `header[role=toolbar]`', owner: 'FR-CHAT-010 / AC-CHAT-001' },
  { id: 'A4', clause: '聊天流语义：`main` 含 `ol[role=log]`', owner: 'FR-CHAT-010 / AC-CHAT-001' },
  { id: 'A5', clause: '状态栏语义 `footer[role=contentinfo]`', owner: 'FR-CHAT-010 / AC-CHAT-001' },
  { id: 'A6', clause: '消息流本体是 `ol[role=log]`（正序、追加）', owner: 'FR-CHAT-010 / FR-CHAT-030' },
  { id: 'B1', clause: '7 类消息卡样例全部存在', owner: 'FR-CHAT-021 / FR-CHAT-030 / AC-CHAT-002' },
  { id: 'B2', clause: '每类卡都挂在流 `#stream` 的 `li` 上', owner: 'FR-CHAT-030' },
  { id: 'B3', clause: 'AI 答复卡支持富文本（编号列表 / 代码 / 表格摘要）', owner: 'FR-CHAT-031' },
  { id: 'B4', clause: '推荐卡含可点 chips（chips 即指令）', owner: 'FR-CHAT-034 / FR-CHAT-061 / AC-CHAT-013' },
  { id: 'C1', clause: 'ask-user text 型卡含卡内输入框（输入按需出现）', owner: 'FR-CHAT-014 / FR-CHAT-040 / AC-CHAT-007' },
  { id: 'C2', clause: 'ask-user choice 型卡含选项按钮组（≥3 项）', owner: 'FR-CHAT-040' },
  { id: 'C3', clause: 'ask-user 卡含「取消」入口与「不代填默认值」说明', owner: 'FR-CHAT-042' },
  { id: 'C4', clause: 'choice 末项「其他…（我来描述）」且兜底输入默认收起', owner: 'FR-CHAT-014 / FR-CHAT-044 / AC-CHAT-007' },
  { id: 'C5', clause: '操作前：ask 未答，表单可见、固化区隐藏', owner: 'FR-CHAT-041 / AC-CHAT-003' },
  { id: 'C6', clause: '回答后固化：`data-answered=true`、表单收起、固化区显示', owner: 'FR-CHAT-041 / FR-CHAT-022' },
  { id: 'C7', clause: '固化文案含「已答：+ 回答内容」', owner: 'FR-CHAT-041' },
  { id: 'C8', clause: '固化带时间戳（`HH:MM:SS`）', owner: 'FR-CHAT-022 / FR-CHAT-041' },
  { id: 'C9', clause: '已固化卡不可二次回答（只固化不撤销）', owner: 'FR-CHAT-042 / AC-CHAT-005' },
  { id: 'C10', clause: '取消也留痕：「已取消（不代填默认值）」', owner: 'FR-CHAT-042 / AC-CHAT-005' },
  { id: 'C11', clause: '场景 S3：AI 编号提问 → 已答固化 → 追问 链条都在流中', owner: 'FR-CHAT-040 / FR-CHAT-043' },
  { id: 'D1', clause: '授权卡含批准/拒绝按钮 + 范围与后果预演', owner: 'FR-CHAT-045 / FR-CHAT-046' },
  { id: 'D2', clause: '操作前：auth 待批，操作按钮可见、固化区隐藏', owner: 'FR-CHAT-045 / AC-CHAT-003' },
  { id: 'D3', clause: '批准后固化：`data-decision=approved`，操作按钮收起', owner: 'FR-CHAT-045' },
  { id: 'D4', clause: '批准固化文案含「已批准」+ 时间戳 + 审计入口', owner: 'FR-CHAT-046' },
  { id: 'D5', clause: '拒绝也固化：已拒绝（不执行）', owner: 'FR-CHAT-045' },
  { id: 'D6', clause: '已决策授权卡不可重复决策', owner: 'FR-CHAT-046 / AC-CHAT-005' },
  { id: 'D7', clause: '授权两态对比：已批准旧卡保留固化区（旧卡不消失）', owner: 'FR-CHAT-046' },
  { id: 'E1', clause: '系统事件行带时间戳且 ≥3 条', owner: 'FR-CHAT-032 / FR-CHAT-053' },
  { id: 'E2', clause: '引用失效有系统事件行说明（目标元素已不存在）', owner: 'FR-CHAT-050 / AC-CHAT-012' },
  { id: 'E3', clause: '失效引用卡含失效原因 + 「重新拾取」+「改用描述」', owner: 'FR-CHAT-052' },
  { id: 'E4', clause: '「改用描述」兜底输入默认收起（点开才出现）', owner: 'FR-CHAT-052 / FR-CHAT-014' },
  { id: 'E5', clause: '失效旧卡保留 + 重拾后新引用序号递增为 ②', owner: 'FR-CHAT-033 / FR-CHAT-050' },
  { id: 'F1', clause: '默认屏工具栏可点 ≤5', owner: 'FR-CHAT-011 / AC-CHAT-008' },
  { id: 'F2', clause: '默认屏工具栏 + 状态栏可点合计 ≤7（法五）', owner: 'FR-CHAT-011 / AC-CHAT-008' },
  { id: 'F3', clause: '无风险时状态栏收缩为一行（0 个可点 chip）', owner: 'FR-CHAT-013' },
  { id: 'F4', clause: '工具栏 4 个视图入口带计数徽标', owner: 'FR-CHAT-011 / FR-CHAT-046' },
  { id: 'F5', clause: '站点摘要只读（非 button/a/input），不计入可点预算', owner: 'FR-CHAT-011 / AC-CHAT-008' },
  { id: 'F6', clause: '法一：工具栏与状态栏内不存在一次性交互卡', owner: 'FR-CHAT-012 / AC-CHAT-004' },
  { id: 'F7', clause: '法四：默认屏面板内无可见常驻输入框', owner: 'FR-CHAT-014 / AC-CHAT-007' },
  { id: 'G1', clause: '三宽度切换器存在（320 / 400 / 520）', owner: 'NFR-CHAT-002' },
  { id: 'G2', clause: '宽度切到 320：`panel[data-width=320]` 且 `--panel-w=320px`', owner: 'NFR-CHAT-002' },
  { id: 'G3', clause: '宽度切到 520：`panel[data-width=520]`', owner: 'NFR-CHAT-002' },
  { id: 'G4', clause: '主题切换器存在（跟随系统 / 浅色 / 深色）', owner: 'NFR-CHAT-008 / AC-CHAT-022' },
  { id: 'G5', clause: '工具栏有一个主题切换按钮（计入 ≤5 预算）', owner: 'FR-CHAT-011 / NFR-CHAT-008' },
  { id: 'G6', clause: '主题切到深色：`html[data-theme=dark]` 真实生效', owner: 'NFR-CHAT-008 / AC-CHAT-022' },
  { id: 'G7', clause: '主题切回跟随系统：移除 `data-theme`', owner: 'NFR-CHAT-008 / AC-CHAT-022' },
  { id: 'H1', clause: '场景切换器存在 7 个场景（S1~S7）', owner: 'FR-CHAT-010（设计契约场景面）' },
  { id: 'H2', clause: '切到 S2：引用卡 + AI 确认 + 推荐卡可见，S3 消息隐藏', owner: 'FR-CHAT-033 / FR-CHAT-061' },
  { id: 'H3', clause: '切到 S5：系统事件行 + 失效卡 + 重拾后新引用同时可见', owner: 'FR-CHAT-050 / FR-CHAT-053' },
  { id: 'H4', clause: 'S6 风险稳态：状态栏 2 个风险 chip 且合计仍 ≤7', owner: 'FR-CHAT-013 / FR-CHAT-017' },
  { id: 'H5', clause: '风险 chip 永不折叠：状态栏本体无 hidden、chip 容器可见', owner: 'FR-CHAT-013 / FR-CHAT-017 / AC-CHAT-007' },
  { id: 'H6', clause: '风险详情默认收起（不占默认密度）', owner: 'FR-CHAT-017' },
  { id: 'H7', clause: '点风险 chip → 详情展开且含「本阶段不发命令、不改授权」披露语', owner: 'FR-CHAT-017' },
  { id: 'H8', clause: 'S6 有风险时状态栏可见（不被任何展开收起影响）', owner: 'FR-CHAT-013 / FR-CHAT-017' },
  { id: 'H9', clause: 'L2 按需视图：打开审计 → 视图层可见、流隐藏、标题正确', owner: 'FR-CHAT-015' },
  { id: 'H10', clause: '返回聊天流：视图层收起、流恢复', owner: 'FR-CHAT-015' },
  { id: 'H11', clause: 'S7 全卡型总览：7 类卡在同屏同时可见', owner: 'FR-CHAT-021 / FR-CHAT-030' },
  { id: 'H12', clause: 'S7 状态栏：声明无效 chip 与引用失效 chip 并存', owner: 'FR-CHAT-017 / FR-CHAT-050' },
  { id: 'I1', clause: '收尾：切回 S1 后默认屏密度仍 ≤7 且场景脏数据已复位', owner: 'AC-CHAT-009 / AC-CHAT-025' },
];

const sha256 = (buffer: Buffer | string) => createHash('sha256').update(buffer).digest('hex');
const readShim = () => readFileSync(SHIM, 'utf8');

/** shim 内的断言 id（`check('A1 …'`）——判据的对照物必须来自被测文件本身。 */
function shimAssertionIds(): string[] {
  const text = readShim();
  return [...text.matchAll(/^check\('([A-Z]\d+)\s/gm)].map((m) => m[1]);
}

test('design-contract: shim 实跑 60/60（退出码 0 ∧ 输出含 `60 passed` / `0 failed`）', () => {
  assert.ok(existsSync(SHIM), `设计契约载体不存在：${SHIM}`);
  let out = '';
  let code = 0;
  try {
    out = execFileSync('node', [SHIM], { cwd: PKG, encoding: 'utf8' });
  } catch (err) {
    const e = err as { status?: number; stdout?: string; stderr?: string };
    code = e.status ?? 1;
    out = `${e.stdout ?? ''}${e.stderr ?? ''}`;
  }
  assert.equal(code, 0, `shim 退出码必须为 0（实测 ${code}）：\n${out}`);
  assert.match(out, new RegExp(`${SHIM_CHECK_CALLS} passed`), `shim 输出必须含「${SHIM_CHECK_CALLS} passed」：\n${out}`);
  assert.match(out, /0 failed/, `shim 输出必须含「0 failed」：\n${out}`);
  console.log(`  ℹ 设计契约：option-f-shim.mjs 实跑 ${SHIM_CHECK_CALLS}/${SHIM_CHECK_CALLS}（退出码 0）`);
});

test('design-contract: shim 文件 sha256 == 冻结常量（设计契约变更必须走登记）', () => {
  assert.ok(existsSync(SHIM), `shim 不存在：${SHIM}`);
  assert.equal(
    sha256(readFileSync(SHIM)),
    SHIM_SHA256,
    'option-f-shim.mjs 已变 —— 设计契约变更必须：① 更新 SHIM_SHA256；② 更新 SHIM_CHECK_CALLS；③ 更新 ASSERTION_MAP；④ 在 v4 台账登记 designContractChanges（FR-CHAT-036 禁静默改断言）',
  );
  console.log(`  ℹ 设计契约冻结：shim sha256 ${SHIM_SHA256.slice(0, 16)}… 逐字节命中`);
});

test('design-contract: 设计稿 option-f-chat-stream.html sha256 == 冻结常量', () => {
  assert.ok(existsSync(DRAFT), `设计稿不存在：${DRAFT}`);
  assert.equal(
    sha256(readFileSync(DRAFT)),
    DRAFT_SHA256,
    'option-f-chat-stream.html 已变 —— shim 与设计稿是**同一个契约的两面**，改稿必须同时满足 shim 60/60 并更新本常量与台账',
  );
  console.log(`  ℹ 设计稿冻结：option-f-chat-stream.html sha256 ${DRAFT_SHA256.slice(0, 16)}… 逐字节命中`);
});

test('design-contract: 计数口径显式（60 个调用点 + 1 处函数声明；`check(` 总出现 61 次）', () => {
  const text = readShim();
  const callSites = [...text.matchAll(/^check\('/gm)].length;
  const declarations = [...text.matchAll(/function check\(/g)].length;
  const occurrences = [...text.matchAll(/check\(/g)].length;
  assert.equal(declarations, SHIM_CHECK_DECLARATIONS, `check 函数声明必须恰好 ${SHIM_CHECK_DECLARATIONS} 处（实测 ${declarations}）`);
  assert.equal(callSites, SHIM_CHECK_CALLS, `check 调用点必须恰好 ${SHIM_CHECK_CALLS} 处（实测 ${callSites}）`);
  // 口径诚实性：`check(` 的**子串**出现次数 = 调用点 + 声明（不是 60 也不是 61 的含糊说法）。
  assert.equal(
    occurrences,
    SHIM_CHECK_CALLS + SHIM_CHECK_DECLARATIONS,
    `\`check(\` 子串总出现 ${occurrences} 次 ≠ 调用点 ${SHIM_CHECK_CALLS} + 声明 ${SHIM_CHECK_DECLARATIONS}`,
  );
  console.log(`  ℹ 计数口径：${callSites} 调用点 + ${declarations} 声明 = ${occurrences} 次 \`check(\` 子串`);
});

test('design-contract: 60 行映射表逐条对应（id 集合 == shim 实测集合，A1~I1 全覆盖）', () => {
  const fromShim = shimAssertionIds();
  const fromTable = ASSERTION_MAP.map((r) => r.id);
  assert.equal(fromShim.length, SHIM_CHECK_CALLS, `从 shim 抽出的断言 id 数必须为 ${SHIM_CHECK_CALLS}（实测 ${fromShim.length}）`);
  assert.equal(fromTable.length, SHIM_CHECK_CALLS, `映射表必须恰好 ${SHIM_CHECK_CALLS} 行（实测 ${fromTable.length}）`);
  assert.equal(new Set(fromShim).size, fromShim.length, `shim 断言 id 必须唯一：${fromShim.join(', ')}`);
  assert.deepEqual(fromTable, fromShim, '映射表的 id 序列必须与 shim 实测序列逐条一致（少一行/多一行/错序都 FAIL）');
  const emptyOwner = ASSERTION_MAP.filter((r) => r.owner.trim().length === 0 || r.clause.trim().length === 0);
  assert.deepEqual(emptyOwner, [], `映射行的「契约条款 / 承载 FR·AC」不得为空：${emptyOwner.map((r) => r.id).join(', ')}`);
  // A1~I1 全覆盖：9 组（A/B/C/D/E/F/G/H/I）都必须出现。
  const groups = [...new Set(fromTable.map((id) => id[0]))].sort();
  assert.deepEqual(groups, ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'], `映射表必须覆盖 A~I 九组（实测 ${groups.join(',')}）`);
  console.log(`  ℹ 映射表：${fromTable.length} 行逐条对应 shim 实测 id；覆盖 ${groups.join('/')} 九组`);
});

test('design-contract: CARD_TYPES == 7 主类（顺序敏感）且设计稿每类都有样例', () => {
  const shim = readShim();
  const m = /const CARD_TYPES = \[([^\]]*)\]/.exec(shim);
  assert.ok(m, 'shim 中必须能定位 `const CARD_TYPES = [...]`');
  const types = m[1]
    .split(',')
    .map((s) => s.trim().replace(/^['"]|['"]$/g, ''))
    .filter((s) => s.length > 0);
  assert.deepEqual(types, [...SPEC_CARD_TYPES], 'CARD_TYPES 必须与 spec 的 7 主类逐字（含顺序）一致（FR-CHAT-021 / FR-CHAT-036）');
  const draft = readFileSync(DRAFT, 'utf8');
  for (const type of SPEC_CARD_TYPES) {
    assert.ok(
      draft.includes(`data-msg-type="${type}"`),
      `设计稿必须带 ${type} 类卡的样例（data-msg-type="${type}"）`,
    );
  }
  console.log(`  ℹ 卡分类学：CARD_TYPES = ${types.join('/')}（7 主类，顺序与 spec 逐字一致）`);
});

/* ══════════════════════════════════════════════════════════════════════════════
 * V5-1（TASK-V5-118 / 119 · ADR-V5-008 · FR-ALLN-100~103 · AC-ALLN-016 / 017 · X4）
 *
 * ── 双契约：F **冻结不替换** + G **新增并存** ────────────────────────────────
 *
 * 上面 6 个 `test(...)`、4 个 F 常量与 60 行 `ASSERTION_MAP` 是 F 契约，**逐字不动**
 * （N21 / FR-ALLN-100）。本节只做**追加**：
 *
 *   ① 抽共享 helper `draftContractProblems()`（纯函数）—— F 与 G **各调用一次**，
 *      两侧各自读自己的 shim / 各自算自己的计数（**禁止「F 绿或 G 绿则绿」**）。
 *   ② G 侧四条常量 + 127 行映射（`test/g-design-map.ts`，行序 == shim 实测序）+ 6 个
 *      新 test 块（实跑 / sha / 计数口径 / 映射 / 卡分类学 / 混池防御）。
 *   ③ 反证（每条都实跑）：G shim 改 1 byte ⇒ 必红；G 映射表删一行 / 错序 ⇒ 必红；
 *      把 F 的常量塞给 G（或反之）⇒ 必红；两个计数池互不遮蔽（注入一侧 ⇒ 另一侧仍绿）。
 *
 * **口径（SG-1 结论，TASK-V5-106）**：G 的 id 抽取用 `check\('([A-Z]\d+)`——**不带
 * `\s` 尾锚**。ADR-V5-008 草案里的带尾锚正则会漏掉 10 条无尾空白调用（只得 117），
 * 与 `127 passed` 的自检口径对不上。F 侧沿用其原有锚定正则（逐字保留）。
 * ══════════════════════════════════════════════════════════════════════════════ */

const G_SHIM = resolve(PKG, 'design/ui-redesign/option-g-shim.mjs');
const G_DRAFT = resolve(PKG, 'design/ui-redesign/option-g-all-in-next.html');

/** G 契约的**十二**种卡（7 主类在前、顺序敏感；后 5 类是既有过程卡）。 */
const G_CARD_TYPES_ALL = [...SPEC_CARD_TYPES, 'tool', 'command', 'thinking', 'error', 'notice'] as const;

/** `expectFailPattern` of every judgement declared by the dual-contract half. */
export interface DualContractJudgement {
  readonly id: string;
  readonly expectFailPattern: string;
}
export const JUDGEMENTS: readonly DualContractJudgement[] = [
  { id: 'DC-1-counters', expectFailPattern: '计数口径判据失败：' },
  { id: 'DC-2-sha-frozen', expectFailPattern: '设计契约 sha 冻结判据失败：' },
  { id: 'DC-3-map-rows', expectFailPattern: '映射表逐条对应判据失败：' },
  { id: 'DC-4-card-types', expectFailPattern: '卡分类学判据失败：' },
  { id: 'DC-5-shim-selfrun', expectFailPattern: 'shim 自检实跑判据失败：' },
  { id: 'DC-6-pool-isolation', expectFailPattern: '混池防御判据失败：' },
];

/** One draft's contract (the shared helper's input; F and G each instantiate one). */
export interface DraftContract {
  readonly name: string;
  readonly shim: string;
  readonly draft: string;
  readonly shimSha256: string;
  readonly draftSha256: string;
  readonly calls: number;
  readonly declarations: number;
  readonly map: readonly { readonly id: string; readonly clause: string; readonly owner: string }[];
  /** The group letters the map must cover (order-insensitive comparison). */
  readonly groups: readonly string[];
  /** The card types the shim must declare (order-significant). */
  readonly cardTypes: readonly string[];
  /** The id extractor — per-side, because F and G really do differ (see the caliber note). */
  readonly idSource: string;
  readonly idFlags: string;
}

/**
 * The shared judge: same function for both drafts, **no shared state** — every number
 * it compares comes from the contract it was handed and the files *that* contract
 * names, so an injected failure on one side cannot be absorbed by the other.
 */
export function draftContractProblems(c: DraftContract, opts: { readonly runShim?: boolean } = {}): string[] {
  const problems: string[] = [];
  if (!existsSync(c.shim)) return [`${c.name}：shim 不存在（${c.shim}）`];
  if (!existsSync(c.draft)) return [`${c.name}：设计稿不存在（${c.draft}）`];
  const shimText = readFileSync(c.shim, 'utf8');
  const draftText = readFileSync(c.draft, 'utf8');

  // ① sha 双冻结 —— 设计契约变更必须走常量 + 计数 + 映射表 + 台账登记。
  if (sha256(readFileSync(c.shim)) !== c.shimSha256) {
    problems.push(`设计契约 sha 冻结判据失败：${c.name} shim sha256 ≠ 冻结常量（改动必须走 designContractChanges 登记）`);
  }
  if (sha256(readFileSync(c.draft)) !== c.draftSha256) {
    problems.push(`设计契约 sha 冻结判据失败：${c.name} 设计稿 sha256 ≠ 冻结常量`);
  }

  // ② 计数口径显式（调用点 + 声明 = `check(` 子串总出现次数）。
  const declarations = (shimText.match(/function check\(/g) ?? []).length;
  const callSites = (shimText.match(/^check\('/gm) ?? []).length;
  const occurrences = (shimText.match(/check\(/g) ?? []).length;
  if (declarations !== c.declarations) {
    problems.push(`计数口径判据失败：${c.name} check 声明数 ${declarations} ≠ ${c.declarations}`);
  }
  if (callSites !== c.calls) {
    problems.push(`计数口径判据失败：${c.name} check 调用点 ${callSites} ≠ ${c.calls}`);
  }
  if (occurrences !== c.calls + c.declarations) {
    problems.push(`计数口径判据失败：${c.name} \`check(\` 子串 ${occurrences} ≠ ${c.calls} + ${c.declarations}`);
  }

  // ③ 映射表逐条对应（id 序列 == 实测序列；clause / owner 逐行非空；覆盖声明的组）。
  const fromShim = [...shimText.matchAll(new RegExp(c.idSource, c.idFlags))].map((m) => m[1]);
  if (fromShim.length !== c.calls) {
    problems.push(`映射表逐条对应判据失败：${c.name} 从 shim 抽出 ${fromShim.length} 条 ≠ ${c.calls}`);
  }
  if (c.map.length !== c.calls) {
    problems.push(`映射表逐条对应判据失败：${c.name} 映射表 ${c.map.length} 行 ≠ ${c.calls}`);
  }
  for (let i = 0; i < Math.min(fromShim.length, c.map.length); i += 1) {
    if (fromShim[i] !== c.map[i].id) {
      problems.push(`映射表逐条对应判据失败：${c.name} 第 ${i + 1} 行 id ${c.map[i].id} ≠ shim 实测 ${fromShim[i]}`);
      break;
    }
  }
  for (const row of c.map) {
    if (row.clause.trim().length === 0 || row.owner.trim().length === 0) {
      problems.push(`映射表逐条对应判据失败：${c.name} ${row.id} 的 clause / owner 不得为空`);
    }
  }
  const groups = [...new Set(c.map.map((r) => r.id[0]))].sort();
  if (groups.join('') !== [...c.groups].sort().join('')) {
    problems.push(`映射表逐条对应判据失败：${c.name} 覆盖组 ${groups.join('')} ≠ ${[...c.groups].sort().join('')}`);
  }

  // ④ 卡分类学（顺序敏感）+ 设计稿每类都有样例。
  const m = /const CARD_TYPES = \[([^\]]*)\]/.exec(shimText);
  if (!m) {
    problems.push(`卡分类学判据失败：${c.name} 定位不到 \`const CARD_TYPES = [...]\``);
  } else {
    const types = m[1]
      .split(',')
      .map((s) => s.trim().replace(/^['"]|['"]$/g, ''))
      .filter((s) => s.length > 0);
    if (types.join(',') !== [...c.cardTypes].join(',')) {
      problems.push(`卡分类学判据失败：${c.name} CARD_TYPES ${types.join('/')} ≠ ${[...c.cardTypes].join('/')}`);
    }
    for (const t of c.cardTypes) {
      if (!draftText.includes(`data-msg-type="${t}"`)) {
        problems.push(`卡分类学判据失败：${c.name} 设计稿缺 ${t} 类卡样例（data-msg-type="${t}"）`);
      }
    }
  }

  // ⑤ shim 自检实跑（可选：只有 G 侧新块实跑一次，F 侧既有块已实跑）。
  if (opts.runShim === true) {
    let out = '';
    let code = 0;
    try {
      out = execFileSync('node', [c.shim], { cwd: PKG, encoding: 'utf8' });
    } catch (err) {
      const e = err as { status?: number; stdout?: string; stderr?: string };
      code = e.status ?? 1;
      out = `${e.stdout ?? ''}${e.stderr ?? ''}`;
    }
    if (code !== 0) problems.push(`shim 自检实跑判据失败：${c.name} 退出码 ${code} ≠ 0`);
    if (!new RegExp(`${c.calls} passed`).test(out)) problems.push(`shim 自检实跑判据失败：${c.name} 输出缺「${c.calls} passed」`);
    if (!/0 failed/.test(out)) problems.push(`shim 自检实跑判据失败：${c.name} 输出缺「0 failed」`);
  }
  return problems;
}

/** F 契约（**逐字**复用上面已冻结的常量与映射表 —— F 侧零改）。 */
export const F_CONTRACT: DraftContract = {
  name: 'F',
  shim: SHIM,
  draft: DRAFT,
  shimSha256: SHIM_SHA256,
  draftSha256: DRAFT_SHA256,
  calls: SHIM_CHECK_CALLS,
  declarations: SHIM_CHECK_DECLARATIONS,
  map: ASSERTION_MAP,
  groups: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'],
  cardTypes: [...SPEC_CARD_TYPES],
  idSource: "^check\\('([A-Z]\\d+)\\s",
  idFlags: 'gm',
};

/** G 契约（新增；四条常量 + 127 行映射 + 十二卡分类学）。 */
export const G_CONTRACT: DraftContract = {
  name: 'G',
  shim: G_SHIM,
  draft: G_DRAFT,
  shimSha256: G_SHIM_SHA256,
  draftSha256: G_DRAFT_SHA256,
  calls: G_SHIM_CHECK_CALLS,
  declarations: G_SHIM_CHECK_DECLARATIONS,
  map: G_ASSERTION_MAP,
  groups: G_ASSERTION_GROUPS,
  cardTypes: [...G_CARD_TYPES_ALL],
  idSource: "check\\('([A-Z]\\d+)",
  idFlags: 'g',
};

test('双契约 F：共享 helper 驱动 F（4 常量 + 60 行 + 9 组；F 侧零改）', () => {
  const problems = draftContractProblems(F_CONTRACT);
  assert.deepEqual(problems, [], `F 契约（冻结面）不得被本次追加改动影响：${problems.join(' | ')}`);
  assert.equal(F_CONTRACT.map, ASSERTION_MAP, 'F 契约必须复用同一 60 行映射表对象（不得复制）');
});

test('双契约 G：共享 helper 驱动 G（4 常量 + 127 行 + 14 组 + 12 卡分类学）', () => {
  const problems = draftContractProblems(G_CONTRACT);
  assert.deepEqual(problems, [], `${problems.join(' | ')}`);
  assert.equal(G_ASSERTION_MAP.length, 127, 'G 映射表必须恰 127 行');
  assert.equal(new Set(G_ASSERTION_MAP.map((r) => r.id)).size, 118, 'G 的 118 个唯一 id（I2×8 / M17×2 / M20×2 的同名重复属 shim 事实，不得「清理」）');
});

test('双契约 G：shim 自检实跑 127/127（退出码 0 ∧ 输出含 `127 passed` / `0 failed`）', () => {
  const problems = draftContractProblems(G_CONTRACT, { runShim: true });
  assert.deepEqual(problems.filter((p) => p.includes(JUDGEMENTS[4].expectFailPattern)), [], 'G shim 自检必须实跑全绿');
  console.log(`  ℹ 双契约：option-g-shim.mjs 实跑 ${G_SHIM_CHECK_CALLS}/${G_SHIM_CHECK_CALLS}（退出码 0）`);
});

test('双契约 G：计数口径（127 调用点 + 1 声明 = 128 次 `check(` 子串；无尾锚抽取 == 127）', () => {
  const text = readFileSync(G_SHIM, 'utf8');
  assert.equal((text.match(/function check\(/g) ?? []).length, G_SHIM_CHECK_DECLARATIONS);
  assert.equal((text.match(/^check\('/gm) ?? []).length, G_SHIM_CHECK_CALLS);
  assert.equal((text.match(/check\(/g) ?? []).length, G_SHIM_CHECK_CALLS + G_SHIM_CHECK_DECLARATIONS);
  // SG-1: 带 `\s` 尾锚的草案正则只得 117（漏 10 条无尾空白调用）——本判据把该事实钉住，
  // 防止后人「顺手」把抽取正则改回草案形态。
  const anchored = [...text.matchAll(/check\('([A-Z]\d+)\s/g)].length;
  assert.equal(anchored, 117, 'ADR-V5-008 草案的带尾锚正则必须仍然只得 117（口径偏差登记在案）');
});

test('双契约 G：127 行映射逐条对应（行序 == shim 实测序；clause / owner 逐行非空；A~N 十四组）', () => {
  const fromShim = [...readFileSync(G_SHIM, 'utf8').matchAll(/check\('([A-Z]\d+)/g)].map((m) => m[1]);
  assert.deepEqual(G_ASSERTION_MAP.map((r) => r.id), fromShim, '映射表 id 序列必须与 shim 实测序列逐条一致（少一行/多一行/错序都 FAIL）');
  const empty = G_ASSERTION_MAP.filter((r) => r.owner.trim().length === 0 || r.clause.trim().length === 0);
  assert.deepEqual(empty, [], `映射行的 clause / owner 不得为空：${empty.map((r) => r.id).join(', ')}`);
  assert.deepEqual([...new Set(G_ASSERTION_MAP.map((r) => r.id[0]))].sort(), [...G_ASSERTION_GROUPS].sort(), '映射表必须覆盖 A~N 十四组');
});

test('双契约 G：CARD_TYPES 7 主类（顺序敏感）且 G 稿十二类都有样例', () => {
  assert.deepEqual([...G_CARD_TYPES_ALL.slice(0, SPEC_CARD_TYPES.length)], [...SPEC_CARD_TYPES], 'G 的 7 主类必须与 F / spec 逐字（含顺序）一致');
  const draft = readFileSync(G_DRAFT, 'utf8');
  for (const type of G_CARD_TYPES_ALL) {
    assert.ok(draft.includes(`data-msg-type="${type}"`), `G 稿必须带 ${type} 类卡样例`);
  }
});

test('双契约混池防御：F / G **各自独立计数**（id 集非空交集 51 ⇒ 不得依赖互斥）', () => {
  const fIds = new Set(F_CONTRACT.map.map((r) => r.id));
  const gIds = new Set(G_CONTRACT.map.map((r) => r.id));
  const inter = [...fIds].filter((id) => gIds.has(id));
  assert.equal(inter.length, 51, 'SG-1：F ∩ G = 51（非空）——混池防御不得建立在「id 集互斥」上');
  // 两侧各自读自己的 shim / 各自算自己的计数：注入一侧 ⇒ 另一侧仍绿。
  const forgedG = { ...G_CONTRACT, calls: G_CONTRACT.calls - 1 };
  assert.ok(draftContractProblems(forgedG).some((p) => p.includes(JUDGEMENTS[0].expectFailPattern)), 'G 侧计数注入必须只红 G');
  assert.deepEqual(draftContractProblems(F_CONTRACT), [], 'G 侧注入不得污染 F 侧（计数池隔离）');
  const forgedF = { ...F_CONTRACT, calls: F_CONTRACT.calls + 1 };
  assert.ok(draftContractProblems(forgedF).some((p) => p.includes(JUDGEMENTS[0].expectFailPattern)), 'F 侧计数注入必须只红 F');
  assert.deepEqual(draftContractProblems(G_CONTRACT), [], 'F 侧注入不得污染 G 侧');
});

test('双契约 G 反证：G shim 改 1 byte ⇒ sha 判据必红（逐字节还原 ⇒ PASS）', () => {
  const before = sha256(readFileSync(G_SHIM));
  const tmp = mkdtempSync(resolve(tmpdir(), 'sdc-g-shim-'));
  const forgedShim = resolve(tmp, 'option-g-shim.mjs');
  writeFileSync(forgedShim, `${readFileSync(G_SHIM, 'utf8')}\n`, 'utf8');
  const problems = draftContractProblems({ ...G_CONTRACT, shim: forgedShim });
  assert.ok(problems.some((p) => p.includes(JUDGEMENTS[1].expectFailPattern)), `G shim 改 1 byte 必须必红：${problems.join(' | ')}`);
  assert.equal(sha256(readFileSync(G_SHIM)), before, '注入只发生在 temp 副本，仓库 shim 逐字节不变');
  assert.deepEqual(draftContractProblems(G_CONTRACT), [], '还原后（真源）必须 PASS');
});

test('双契约 反证：把 F / G 的常量互换 ⇒ 两侧各自必红（冻结面不可静默替换）', () => {
  const fWithG = draftContractProblems({ ...F_CONTRACT, shimSha256: G_SHIM_SHA256, draftSha256: G_DRAFT_SHA256, calls: G_SHIM_CHECK_CALLS });
  assert.ok(fWithG.some((p) => p.includes(JUDGEMENTS[1].expectFailPattern)), `F 用 G 常量必须必红：${fWithG.join(' | ')}`);
  const gWithF = draftContractProblems({ ...G_CONTRACT, shimSha256: SHIM_SHA256, calls: SHIM_CHECK_CALLS });
  assert.ok(gWithF.some((p) => p.includes(JUDGEMENTS[1].expectFailPattern)), `G 用 F 常量必须必红：${gWithF.join(' | ')}`);
  // F 的冻结常量逐字不动（本次追加零改）。
  assert.equal(F_CONTRACT.shimSha256, '8ca5db6f7a152c2890814cff2fe58dc11345338890b26de62b3355837f591ed4');
  assert.equal(F_CONTRACT.calls, 60);
});

test('双契约 G 反证：G 映射表删一行 / 调序 ⇒ 逐条对应判据必红', () => {
  const dropped = draftContractProblems({ ...G_CONTRACT, map: G_ASSERTION_MAP.slice(0, 126) });
  assert.ok(dropped.some((p) => p.includes(JUDGEMENTS[2].expectFailPattern)), '删一行必须必红');
  const swapped = [...G_ASSERTION_MAP];
  [swapped[0], swapped[1]] = [swapped[1], swapped[0]];
  const reordered = draftContractProblems({ ...G_CONTRACT, map: swapped });
  assert.ok(reordered.some((p) => p.includes(JUDGEMENTS[2].expectFailPattern)), '调序必须必红');
  const blankOwner = draftContractProblems({ ...G_CONTRACT, map: G_ASSERTION_MAP.map((r, i) => (i === 5 ? { ...r, owner: '  ' } : r)) });
  assert.ok(blankOwner.some((p) => p.includes(JUDGEMENTS[2].expectFailPattern)), 'owner 留空必须必红');
});

test('双契约 元判据：每条 judgement 都声明非占位 expectFailPattern', () => {
  assert.ok(JUDGEMENTS.length >= 6, '判据表必须覆盖六条判据');
  for (const j of JUDGEMENTS) {
    assert.ok(j.expectFailPattern.trim().length >= 8, `${j.id}: expectFailPattern 不得为空/占位`);
    assert.ok(!j.expectFailPattern.includes('TODO'), `${j.id}: expectFailPattern 不得是 TODO`);
  }
});

/* ── V5-1（TASK-V5-119 / FR-ALLN-102 · AC-ALLN-017 · X4）台账登记机核 ──────────
 *
 * G 稿入册这一**契约变更**必须落在 `docs/v4-supersession-ledger.json` 的
 * `designContract.designContractChanges[]`（空数组 → 含 G 条目），且条目**五要素齐备**：
 * 对象 / 前后 sha / 断言数 / 日期 / 理由。五要素缺一 ⇒ FAIL（反证实跑）。
 */
export interface DesignContractChange {
  readonly object: string;
  readonly before: readonly unknown[] | null;
  readonly after: {
    readonly draftSha: string;
    readonly shimSha: string;
    readonly assertions: number;
    readonly groups: number;
  } | null;
  readonly date: string;
  readonly reason: string;
  readonly leaf: string;
}

/** The five-element judge (pure — the reverse proof drives a forged entry through it). */
export function changeProblems(entries: readonly DesignContractChange[]): string[] {
  const problems: string[] = [];
  if (entries.length !== 1) problems.push(`designContractChanges 必须恰 1 条（G 入册；实测 ${entries.length}）`);
  for (const e of entries) {
    if (e.object.trim().length === 0) problems.push('designContractChanges 五要素缺一：object');
    if (e.before !== null) problems.push('designContractChanges 五要素缺一：before 必须为 null（G 是**新增**，不替换 F）');
    if (e.after === null) problems.push('designContractChanges 五要素缺一：after');
    else {
      if (e.after.draftSha.length !== 64) problems.push('designContractChanges 五要素缺一：after.draftSha');
      if (e.after.shimSha.length !== 64) problems.push('designContractChanges 五要素缺一：after.shimSha');
      if (e.after.assertions !== G_SHIM_CHECK_CALLS) problems.push('designContractChanges 五要素缺一：after.assertions');
      if (e.after.groups !== 14) problems.push('designContractChanges 五要素缺一：after.groups');
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(e.date)) problems.push('designContractChanges 五要素缺一：date');
    if (e.reason.trim().length < 40) problems.push('designContractChanges 五要素缺一：reason（≥40 字符）');
    if (e.leaf.trim().length === 0) problems.push('designContractChanges 五要素缺一：leaf');
  }
  return problems;
}

const LEDGER = resolve(PKG, '..', '..', 'packages/web-cli-plugin/docs/v4-supersession-ledger.json');

test('双契约 G 入册：designContractChanges 恰 1 条且五要素齐备（AC-ALLN-017）', () => {
  const ledger = JSON.parse(readFileSync(LEDGER, 'utf8')) as {
    designContract: { designContractChanges: DesignContractChange[]; assertions: number; mappingRows: number };
  };
  const changes = ledger.designContract.designContractChanges;
  assert.deepEqual(changeProblems(changes), []);
  assert.equal(changes[0].after?.shimSha, G_SHIM_SHA256, '登记的 shim sha 必须与门禁常量同源');
  assert.equal(changes[0].after?.draftSha, G_DRAFT_SHA256, '登记的 draft sha 必须与门禁常量同源');
  // F 侧登记（60 行 / 60 断言）仍逐字不动 —— 新增不替换。
  assert.equal(ledger.designContract.assertions, 60, 'F 的 assertions 常量不得被 G 覆盖');
  assert.equal(ledger.designContract.mappingRows, 60, 'F 的 mappingRows 常量不得被 G 覆盖');
});

test('双契约 G 入册反证：五要素缺一 / before 非 null / 多一条 ⇒ 判据必红', () => {
  const ledger = JSON.parse(readFileSync(LEDGER, 'utf8')) as {
    designContract: { designContractChanges: DesignContractChange[] };
  };
  const [good] = ledger.designContract.designContractChanges;
  assert.ok(good, '前置：登记条目必须存在');
  assert.ok(changeProblems([{ ...good, object: '  ' }]).some((p) => p.includes('object')), '缺 object 必须判红');
  assert.ok(changeProblems([{ ...good, after: null }]).some((p) => p.includes('after')), '缺 after 必须判红');
  assert.ok(changeProblems([{ ...good, date: '2026/09/22' }]).some((p) => p.includes('date')), '日期格式非法必须判红');
  assert.ok(changeProblems([{ ...good, reason: '太短' }]).some((p) => p.includes('reason')), '理由 <40 字符必须判红');
  assert.ok(
    changeProblems([{ ...good, before: [] as unknown[] }]).some((p) => p.includes('before')),
    'before 非 null（伪称替换 F）必须判红',
  );
  assert.ok(changeProblems([good, good]).some((p) => p.includes('恰 1 条')), '多一条必须判红');
  assert.ok(
    changeProblems([{ ...good, after: { ...good.after!, assertions: 60 } }]).some((p) => p.includes('assertions')),
    '断言数与门禁常量脱钩必须判红',
  );
  assert.deepEqual(changeProblems(ledger.designContract.designContractChanges), [], '真台账必须干净（判据非恒真）');
});
