/**
 * V3-3 TASK-301 (FR-V3-046 / FR-V3-049 / FR-V3-051 / FR-V3-050 — ADR-V3-026 /
 * ADR-V3-027) — pure-Node unit tests for the L2 **count derivation** and the two
 * projection-only view models.
 *
 * What this file exists to make impossible:
 *   * a **hard-coded** count (every count must move with its truth input, by the
 *     exact delta — asserted in both directions);
 *   * the `{live, baseline}` pair silently **degrading into one number**
 *     (EC-V3-016: an average / a single value / a merged `cards` total must fail);
 *   * `null` (an unread truth) masquerading as `0`;
 *   * a **second copy** of the `delay` wording (ADR-V3-027 §3): the view must
 *     re-export the very same constant the tree uses;
 *   * an audit row leaking a non-whitelisted field (`argsSummary` / `detail` /
 *     an apiKey / a clipboard body) or an un-stripped URL query.
 *
 * NEW file: nothing existing is deleted or downgraded (NFR-V3-014).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { SnapshotCounts } from '../src/insight/tree-model.js';
import type { ArchiveModel } from '../src/insight/archive-catalog.js';
import {
  L2_VIEW_KEYS,
  baselineCommandCount,
  commandCountText,
  countText,
  deriveCounts,
  l2EntryCount,
  l2EntryLabel,
  l2StatusBarText,
  liveCommandCount,
  treeNodeCount,
} from '../src/ui/sidepanel/l2/counts.js';
import {
  CATALOG_ACTION_WHITELIST,
  buildCatalogView,
} from '../src/ui/sidepanel/l2/command-catalog.js';
import { TREE_NO_ESCALATION_NOTE } from '../src/ui/tree/tree-view.js';
import {
  AUDIT_FIELD_WHITELIST,
  AUDIT_RENDERED_FIELDS,
  buildAuditRows,
  stripUrlParams,
  toAuditRow,
} from '../src/ui/sidepanel/l2/audit.js';
import { SETTINGS_SECTION_IDS, settingsSectionCount } from '../src/ui/settings/sections.js';

const HERE = dirname(fileURLToPath(import.meta.url));

/** Walk up from `dist-test/test/` (compiled) or `test/` (source) to the package root. */
function packageRoot(): string {
  let dir = HERE;
  for (let i = 0; i < 6; i += 1) {
    try {
      if (readFileSync(resolve(dir, 'package.json'), 'utf8').includes('web-cli-plugin')) return dir;
    } catch {
      /* keep walking up */
    }
    dir = resolve(dir, '..');
  }
  throw new Error(`package root not found from ${HERE}`);
}
const PKG = packageRoot();

/** A snapshot-counts truth (`state.insight.counts`), deliberately parameterised. */
function insightCounts(over: Partial<SnapshotCounts> = {}): SnapshotCounts {
  return { sites: 2, capabilities: 3, commands: 4, subcommands: 5, llms: 1, sessions: 1, ...over };
}

const CATALOG_META = { toolCount: 34, subcommandCount: 142 };

// ── 1. the four calibers are derived, and only from their own truth ──────────

test('counts: 四类计数各自唯一真值源，且真值变化量与计数变化量相等（硬编码即 FAIL）', () => {
  const base = deriveCounts({
    insightCounts: insightCounts(),
    catalogMeta: CATALOG_META,
    auditEntries: 7,
    settingsSections: ['a', 'b'],
  });
  assert.equal(base.tree, 2 + 3 + 4 + 5 + 1 + 1);
  assert.equal(base.commands.live, 4 + 5);
  assert.equal(base.commands.baseline, 34 + 142);
  assert.equal(base.audit, 7);
  assert.equal(base.settings, 2);

  // ① tree: change ONE dimension by +3 → the count moves by exactly +3.
  const treeMoved = deriveCounts({
    insightCounts: insightCounts({ sites: 5 }),
    catalogMeta: CATALOG_META,
    auditEntries: 7,
    settingsSections: ['a', 'b'],
  });
  assert.equal((treeMoved.tree ?? 0) - (base.tree ?? 0), 3, 'tree 计数必须随真值同步移动（硬编码则不变）');
  // ② live face: +2 subcommands → +2
  const liveMoved = deriveCounts({
    insightCounts: insightCounts({ subcommands: 7 }),
    catalogMeta: CATALOG_META,
    auditEntries: 7,
    settingsSections: ['a', 'b'],
  });
  assert.equal((liveMoved.commands.live ?? 0) - (base.commands.live ?? 0), 2);
  // ③ baseline: an independently registered parity baseline moves the second number ONLY
  const baselineMoved = deriveCounts({
    insightCounts: insightCounts(),
    catalogMeta: { toolCount: 35, subcommandCount: 142 },
    auditEntries: 7,
    settingsSections: ['a', 'b'],
  });
  assert.equal((baselineMoved.commands.baseline ?? 0) - (base.commands.baseline ?? 0), 1);
  assert.equal(baselineMoved.commands.live, base.commands.live, '基线变化不得污染实时面');
  // ④ audit / ⑤ settings
  assert.equal(
    (deriveCounts({ insightCounts: insightCounts(), catalogMeta: CATALOG_META, auditEntries: 9, settingsSections: ['a', 'b'] }).audit ?? 0) -
      (base.audit ?? 0),
    2,
  );
  assert.equal(
    deriveCounts({ insightCounts: insightCounts(), catalogMeta: CATALOG_META, auditEntries: 7, settingsSections: ['a', 'b', 'c'] }).settings,
    3,
  );
});

test('counts: 未读到的真值是 null 而非 0（未知不得冒充零）', () => {
  const unread = deriveCounts({ insightCounts: null, catalogMeta: null, auditEntries: null, settingsSections: [] });
  assert.equal(unread.tree, null);
  assert.equal(unread.commands.live, null);
  assert.equal(unread.commands.baseline, null);
  assert.equal(unread.audit, null);
  assert.equal(unread.settings, 0);
  assert.equal(countText(null), '…');
  assert.equal(countText(0), '0');
  assert.equal(treeNodeCount(null), null);
  assert.equal(liveCommandCount(null), null);
  assert.equal(baselineCommandCount(null), null);
});

// ── 2. `{live, baseline}` must stay two numbers (EC-V3-016) ──────────────────

test('counts: commands 必须是 {live, baseline} 对象（退化为单值 / 取平均 / 合并即 FAIL）', () => {
  const counts = deriveCounts({ insightCounts: insightCounts(), catalogMeta: CATALOG_META, auditEntries: 0, settingsSections: [] });
  assert.equal(typeof counts.commands, 'object', 'commands 不得退化为单值');
  assert.ok('live' in counts.commands, '缺少 live 分列面');
  assert.ok('baseline' in counts.commands, '缺少 baseline 分列面');
  assert.equal(Object.keys(counts.commands).sort().join(','), 'baseline,live', '不得新增合并字段（如 total/merged/avg）');
  assert.notEqual(counts.commands.live, counts.commands.baseline, '两个口径不是同一个数字（合并即掩盖差异）');
  const text = commandCountText(counts.commands);
  assert.match(text, /实时 9 卡/);
  assert.match(text, /基线 176 行/);
  for (const banned of ['已全部渲染', '已覆盖全部', '总数', '合计']) {
    assert.equal(text.includes(banned), false, `分列文案不得出现夸大/合并表述：${banned}`);
  }
});

// ── 3. entry label ≡ data-count ≡ status bar (three-way same source) ─────────

test('counts: 入口标签 / data-count / 状态栏摘要三处同源（可复算）', () => {
  const counts = deriveCounts({ insightCounts: insightCounts(), catalogMeta: CATALOG_META, auditEntries: 12, settingsSections: SETTINGS_SECTION_IDS });
  assert.deepEqual([...L2_VIEW_KEYS], ['tree', 'commands', 'audit', 'settings']);
  const summary = l2StatusBarText(counts);
  for (const key of L2_VIEW_KEYS) {
    const label = l2EntryLabel(key, counts);
    const n = l2EntryCount(key, counts);
    assert.notEqual(n, null, `${key} 的计数不得为 null（默认夹具下真值可读）`);
    assert.ok(label.includes(String(n)), `${key} 入口标签必须带同一个计数：${label} vs ${n}`);
  }
  for (const [label, n] of [
    ['树', counts.tree],
    ['命令', counts.commands.live],
    ['审计', counts.audit],
    ['设置', counts.settings],
  ] as const) {
    assert.match(summary, new RegExp(`${label}\\s*${n}(\\D|$)`), `状态栏摘要缺少 ${label} ${n}：${summary}`);
  }
  // the commands entry label carries BOTH calibers (分列可见), the summary too
  assert.match(l2EntryLabel('commands', counts), /实时 9 卡 \/ 基线 176 行/);
  assert.match(summary, /命令 9\/176/);
});

// ── 4. the settings registry is a single source, not a magic number ─────────

test('settings/sections: 分区计数来自登记表；每个 id 仍有渲染点（重命名即 FAIL）', () => {
  const panel = readFileSync(resolve(PKG, 'src/ui/settings/panel.ts'), 'utf8');
  const HELP_SOURCE = readFileSync(resolve(PKG, 'src/ui/settings/help.ts'), 'utf8');
  assert.equal(settingsSectionCount(), SETTINGS_SECTION_IDS.length);
  // V4.5-1 W3（TASK-V45-112 / ADR-V45-008 §1）：手势表迁入设置「帮助」分区 ⇒ 7 → 8。
  assert.equal(SETTINGS_SECTION_IDS.length, 8, '顶层分区数（`.wc-section`）必须是 8');
  for (const id of SETTINGS_SECTION_IDS) {
    // The「帮助」section is built by its own module (single source for the gesture table)
    // and mounted by `panel.ts`; every other section is rendered inline in `panel.ts`.
    const renderedInline = new RegExp(`h\\(doc, 'section', \\{ id: '${id}', class: 'wc-section' \\}\\)`).test(panel);
    const renderedByHelpModule =
      id === 'settings-help' && /buildHelpSection\(doc, h\)/.test(panel) && HELP_SOURCE.includes(`id: '${id}'`);
    assert.ok(renderedInline || renderedByHelpModule, `settings/sections.ts 登记了 ${id}，但无渲染点（漂移）`);
  }
  // the count really is the registry's length, not a literal
  assert.equal(
    deriveCounts({ insightCounts: null, catalogMeta: null, auditEntries: null, settingsSections: [...SETTINGS_SECTION_IDS, 'settings-extra'] })
      .settings,
    9,
    '分区计数必须随登记表长度变化（写死则不变）',
  );
  assert.equal(deriveCounts({ insightCounts: null, catalogMeta: null, auditEntries: null }).settings, SETTINGS_SECTION_IDS.length);
});

// ── 5. the command catalog is a read-only projection of the ONE wording source ─

test('command-catalog: delay 措辞取自单一常量（不得另写），动作白名单 9 个且固定序', () => {
  const model = {
    header: {
      title: '命令档案（只读）',
      liveLabel: '实时面 28 条目 / 94 子命令 = 122 卡',
      liveCounts: { tools: 28, subcommands: 94, cards: 122 },
      baselineLabel: '对账基线 34/142（来源 2ddc922）',
      parityLabel: '对账：无缺口（missing / missingSubs / unregistered / extraStale 均为空）',
      readOnlyLabel: '只读',
    },
    coverage: { baseline: { tools: 34, subcommands: 142, provenanceCommit: '2ddc9229' } },
    notes: {
      noEscalationNote: TREE_NO_ESCALATION_NOTE,
      delayMsNote: 'x',
      readOnlyNote: '只读',
      noExaggerationNote: '不得夸大',
    },
    cards: [],
  } as unknown as ArchiveModel;
  const view = buildCatalogView(model);
  assert.equal(view.noEscalationNote, TREE_NO_ESCALATION_NOTE, 'delay 措辞必须是同一个常量（另写一份即 FAIL）');
  assert.ok(view.noEscalationNote.includes('非可配置档位'), 'delay 消歧逐字保留');
  assert.ok(view.noEscalationNote.includes('fail-closed'));
  assert.equal(view.liveCount, 122);
  assert.equal(view.baselineCount, 34 + 142);
  assert.notEqual(view.liveCount, view.baselineCount, '实时面与基线必须分列');
  assert.equal(CATALOG_ACTION_WHITELIST.length, 9, '树内动作白名单固定 9 个');
  assert.deepEqual(
    [...CATALOG_ACTION_WHITELIST],
    [
      'revoke-origin',
      'revoke-capability',
      'set-capability-toggle',
      'set-tabs-toggle',
      'clear-auto-auth',
      'disconnect-llm',
      'dissolve-group',
      'set-command-policy',
      'reset-command-policy',
    ],
    '9 动作必须保持固定序',
  );
});

// ── 6. audit: strict whitelist + URL de-parameterisation ────────────────────

test('audit: 字段白名单外零渲染（apiKey / 摘要 / 正文零命中）且 URL 去参', () => {
  assert.deepEqual([...AUDIT_FIELD_WHITELIST], ['tool', 'subcommand', 'type', 'decision', 'ok', 'durationMs', 'ts', 'origin']);
  assert.deepEqual([...AUDIT_RENDERED_FIELDS], ['id', 'command', 'action', 'result', 'ms', 'time', 'origin']);

  const row = toAuditRow(
    {
      type: 'origin-authorize',
      ts: Date.UTC(2026, 8, 16, 3, 4, 5),
      tool: 'admin_origin-authorize',
      durationMs: 12.6,
      decision: 'allow',
      origin: 'https://a.test/path?token=SECRET#frag',
      // the following must never reach the DOM:
      argsSummary: 'apiKey=sk-live-DEADBEEF',
      detail: '剪贴板正文：绝密内容',
      reason: '因为原因',
      trust: 'untrusted',
      args: { clipboard: '正文' },
    },
    3,
  );
  assert.equal(row.id, 'ev-3');
  assert.equal(row.command, 'admin_origin-authorize');
  assert.equal(row.action, 'origin-authorize');
  assert.equal(row.result, 'allow');
  assert.equal(row.ms, '13ms');
  assert.equal(row.origin, 'https://a.test/path', 'URL 必须去参（query + fragment 零残留）');
  const rendered = Object.values(row).join('|');
  for (const leak of ['sk-live-DEADBEEF', '绝密内容', '因为原因', 'apiKey', '剪贴板正文', 'token=', '#frag']) {
    assert.equal(rendered.includes(leak), false, `白名单外内容零命中：${leak}`);
  }

  // 结果/耗时缺省时是显式占位，不是空串（可读性 + 不误读为「无」）
  const bare = toAuditRow({ type: 'tabs', ts: Number.NaN }, 0);
  assert.equal(bare.result, '—');
  assert.equal(bare.ms, '—');
  assert.equal(bare.time, '—');
  assert.equal(bare.origin, '');
  assert.equal(toAuditRow(undefined, 1).command, '（未标注命令）');
  assert.equal(buildAuditRows([{ ts: 0, tool: 'a' }, null]).length, 2);
  assert.equal(buildAuditRows([]).length, 0);
});

test('audit: stripUrlParams 只保留 scheme://host/path，非 URL 一律降级为空', () => {
  assert.equal(stripUrlParams('https://a.test/x/y?k=v&t=1#h'), 'https://a.test/x/y');
  assert.equal(stripUrlParams('chrome-extension://abc/sidepanel.html?x=1'), 'chrome-extension://abc/sidepanel.html');
  assert.equal(stripUrlParams('not a url\nwith newline'), '');
  assert.equal(stripUrlParams(undefined), '');
  assert.equal(stripUrlParams(42), '');
  assert.equal(stripUrlParams(''), '');
});

test('audit: AUDIT_FIELD_WHITELIST 与 toAuditRow 的真实输入面逐项一致（登记常量不得与实际字段漂移）', () => {
  // I-05② (v3-3 fix round): `AUDIT_FIELD_WHITELIST` used to be read **only** by this
  // test file — the implementation picked its fields by hand (`ev.tool`,
  // `ev.subcommand`, …), so the registered "only these fields are read" claim could
  // drift away from `toAuditRow` without anything failing. The guard below makes the
  // constant load-bearing in both directions, derived from the constant itself:
  //   ① every whitelisted key must really change the rendered row (a decorative
  //      entry would be caught);
  //   ② every non-whitelisted key must be **constructively dropped** (mutating it
  //      cannot change any rendered column).
  const BASE: Record<string, unknown> = {
    tool: 'tabs',
    subcommand: 'list',
    type: 'origin-authorize',
    decision: 'allow',
    ok: true,
    durationMs: 12,
    ts: Date.UTC(2026, 8, 16, 3, 4, 5),
    origin: 'https://a.test/path?token=SECRET#frag',
  };
  const PROBE: Record<string, unknown> = {
    tool: 'PROBE-tool',
    subcommand: 'PROBE-sub',
    type: 'PROBE-type',
    decision: 'PROBE-decision',
    ok: false,
    durationMs: 999,
    ts: Date.UTC(2025, 0, 2, 3, 4, 5),
    origin: 'https://PROBE.test/y?secret=1#f',
  };
  const drift: string[] = [];
  for (const key of AUDIT_FIELD_WHITELIST) {
    // `ok` only carries the result when no explicit decision is present (that is the
    // documented precedence), so drop `decision` for that one key.
    const base = key === 'ok' ? { ...BASE, decision: undefined } : BASE;
    const before = toAuditRow(base, 0);
    const after = toAuditRow({ ...base, [key]: PROBE[key] }, 0);
    if (JSON.stringify(before) === JSON.stringify(after)) {
      drift.push(`${key}: 白名单声明该字段被读取，但改动它不改变任何渲染列（常量与实现漂移 / 白名单条目失效）`);
    }
  }
  for (const key of ['argsSummary', 'detail', 'reason', 'trust', 'args', 'clipboard', 'apiKey', 'url']) {
    const base = toAuditRow(BASE, 0);
    const after = toAuditRow({ ...BASE, [key]: 'apiKey=sk-live-SECRET 剪贴板正文' }, 0);
    if (JSON.stringify(base) !== JSON.stringify(after)) {
      drift.push(`${key}: 非白名单字段影响了渲染行（构造性丢弃失效）`);
    }
  }
  assert.deepEqual(drift, [], `审计字段白名单与实现不一致（I-05②）：\n${drift.join('\n')}`);
});
