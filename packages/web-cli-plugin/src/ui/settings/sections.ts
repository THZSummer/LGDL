/**
 * V3-3 TASK-301 (FR-V3-046 / FR-V3-051) — the **settings section registry**.
 *
 * The L2「设置」entry must carry a **derived** count (FR-V3-046: no hard-coded
 * numbers). `#settings-root` is mounted lazily (first open, `sidepanel.ts`:
 * `settingsHandle`), so at L0 render time there is no DOM to count — the
 * registry below is the single source instead of a magic number, and two
 * independent guards keep it honest:
 *
 *   1. `test/l2-counts.test.ts` — `deriveCounts()` must change by exactly the
 *      delta of `SETTINGS_SECTION_IDS` (proves the count is derived, not fixed)
 *      and every id must still appear in `panel.ts` as a rendered section id
 *      (`id: '<id>'` + `class: 'wc-section'`) — a rename cannot drift silently.
 *   2. `test/ui/l2.mjs` — after the real settings view mounts, the rendered
 *      `#settings-root > .wc-section` count must equal this registry's length
 *      and the entry's `data-count` (three-way same-source).
 *
 * Deliberately dependency-free (no DOM, no `chrome.*`) so it can be imported by
 * the pure counting module and by node tests.
 *
 * @module settings/sections
 */

/**
 * The settings top-level sections (in render order). `settings-migration` is a
 * `<details>` nested inside `settings-compliance`, i.e. part of that section's item
 * set — counted by the FR-V3-051 equivalence assertion (which checks the 8 v1 ids), not
 * by the section count.
 *
 * V4.5-1 W3 (TASK-V45-112 / ADR-V45-008 §1) appended `settings-help`: the six-gesture
 * table moved from the retired in-stream L1 panel into a read-only settings section, so
 * **7 → 8**. The count stays DERIVED (`settingsSectionCount()` / `deriveCounts()`) —
 * hard-coding it anywhere is the failure mode the two guards above exist to catch.
 */
export const SETTINGS_SECTION_IDS = Object.freeze([
  'settings-llm',
  'settings-auto-auth',
  'settings-tabs',
  'settings-capabilities',
  'settings-sessions',
  'settings-diagnostics',
  'settings-compliance',
  'settings-help',
] as const);

/** Number of v1 settings sections — always `SETTINGS_SECTION_IDS.length`. */
export function settingsSectionCount(sections: readonly string[] = SETTINGS_SECTION_IDS): number {
  return sections.length;
}
