/**
 * V4.5-1 W3 TASK-V45-112 (ADR-V45-008) — the settings「帮助」section.
 *
 * ── Why it exists ────────────────────────────────────────────────────────────
 *
 * The six-gesture table used to be an L1 content panel inside the stream
 * (`#l1-gestures`). Retiring the four fixed-position hosts means it needs a确定归属,
 * and「管理 / 静态说明入视图」+ the v3 precedent（`SETTINGS_SECTION_IDS` 单源、计数派生、
 * 两处门禁三方同源）give the natural answer: a **read-only settings section**.
 *
 * ── Hard rules ───────────────────────────────────────────────────────────────
 *
 *   · **Read-only, zero clickables.** The section renders a table and nothing else —
 *     no `button` / `a` / `input`. Help text is not an action surface (法一: a one-shot
 *     interaction must not live outside the stream).
 *   · **ONE row source.** The rows come from `view-model.ts#gestureRows()` (the same
 *     `L1_GESTURE_LABELS` + `GESTURE_EFFECTS` the retired table used), so the row count
 *     and the copy can never drift.
 *   · **No second count.** The section is registered in `SETTINGS_SECTION_IDS`; its count
 *     is derived by `settingsSectionCount()` / `deriveCounts()`, never hard-coded.
 *
 * @module ui/settings/help
 */
import { gestureRows } from '../sidepanel/view-model.js';

/**
 * The section's id — the SINGLE exported literal (`sections.ts` registers the same
 * value, and the DOM builder below uses the literal so a「注册表 ↔ 渲染面」text scan
 * can locate both halves).
 */
export const HELP_SECTION_ID = 'settings-help';

/**
 * Build the「帮助」section. `h` is the panel's element helper (kept as a parameter so this
 * module has no dependency on the panel's private DOM builder).
 */
export function buildHelpSection(
  doc: Document,
  h: <K extends keyof HTMLElementTagNameMap>(
    doc: Document,
    tag: K,
    props?: { id?: string; class?: string; text?: string },
    children?: Array<Node | string>,
  ) => HTMLElementTagNameMap[K],
): HTMLElement {
  const section = h(doc, 'section', { id: 'settings-help', class: 'wc-section' });
  section.appendChild(h(doc, 'h3', { class: 'wc-section-title', text: '帮助' }));
  section.appendChild(
    h(doc, 'p', {
      class: 'wc-note',
      text: '页面手势说明（只读）：下列动作都在页面侧生效，不发送命令、不改变授权集合。',
    }),
  );

  // `#l1-gestures` keeps the legacy container id / table structure (the retired L1
  // panel's `data-l1-panel` face moved here verbatim) — the rows are the ONE list's.
  const host = h(doc, 'div', { id: 'l1-gestures' });
  host.setAttribute('data-l1-panel', 'l1-gestures');
  const table = h(doc, 'table', { class: 'wc-gestures' });
  const thead = h(doc, 'thead');
  const headRow = h(doc, 'tr');
  headRow.append(h(doc, 'th', { text: '手势' }), h(doc, 'th', { text: '作用' }));
  thead.appendChild(headRow);
  const tbody = h(doc, 'tbody', { id: 'l1-gestures-rows' });
  for (const row of gestureRows()) {
    const tr = h(doc, 'tr');
    tr.append(h(doc, 'td', { text: row.label }), h(doc, 'td', { text: row.effect }));
    tbody.appendChild(tr);
  }
  table.append(thead, tbody);
  host.appendChild(table);
  section.appendChild(host);
  return section;
}
