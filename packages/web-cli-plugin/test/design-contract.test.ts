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
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

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
