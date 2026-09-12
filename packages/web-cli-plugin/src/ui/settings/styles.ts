/**
 * Shared settings stylesheet (TASK-033).
 *
 * Injected into the host document once by the settings renderer so the side
 * panel and the fallback `options.html` page share **one** stylesheet (no CSS
 * forks). Uses the side panel's design tokens when present and falls back to
 * neutral light/dark values on the options page.
 */
export const SETTINGS_CSS = `
.wc-settings { --wc-border: var(--border, #e5e9f0); --wc-border-strong: var(--border-strong, #cbd5e1);
  --wc-text: var(--text, #1e293b); --wc-muted: var(--text-muted, #64748b);
  --wc-bg: var(--bg, #ffffff); --wc-bg-subtle: var(--bg-subtle, #f6f8fb);
  --wc-accent: var(--accent, #4f46e5); --wc-accent-text: var(--accent-text, #4338ca);
  --wc-ok: var(--ok, #15803d); --wc-warn: var(--warn-text, #92400e); --wc-err: #b91c1c;
  color: var(--wc-text); }
.wc-settings *, .wc-settings *::before, .wc-settings *::after { box-sizing: border-box; }
.wc-settings section { border-top: 1px solid var(--wc-border); margin-top: 16px; padding-top: 10px; }
.wc-settings section:first-of-type { border-top: none; margin-top: 0; padding-top: 0; }
.wc-settings h2 { font-size: 13px; margin: 0 0 6px; }
.wc-settings label { display: block; margin-top: 10px; font-weight: 600; font-size: 12px; }
.wc-settings input[type="text"], .wc-settings input[type="password"], .wc-settings input[type="number"], .wc-settings select {
  width: 100%; padding: 6px 8px; font: inherit; color: var(--wc-text); background: var(--wc-bg);
  border: 1px solid var(--wc-border-strong); border-radius: 8px; }
.wc-settings .wc-row { display: flex; gap: 6px; margin-top: 10px; flex-wrap: wrap; align-items: center; }
.wc-settings .wc-row.wc-stack { flex-direction: column; align-items: stretch; }
.wc-settings .wc-muted { color: var(--wc-muted); font-size: 11.5px; }
.wc-settings .wc-note { margin: 4px 0; color: var(--wc-muted); font-size: 11.5px; line-height: 1.55; }
.wc-settings .wc-inline { display: flex; align-items: center; gap: 6px; font-weight: 600; font-size: 12px; margin-top: 6px; }
.wc-settings .wc-inline input { width: auto; }
.wc-settings button { font: inherit; font-size: 12px; color: var(--wc-text); background: var(--wc-bg);
  border: 1px solid var(--wc-border-strong); border-radius: 8px; padding: 5px 10px; cursor: pointer; max-width: 100%; }
.wc-settings button:disabled { opacity: 0.5; cursor: not-allowed; }
.wc-settings button.wc-primary { background: var(--wc-accent); border-color: var(--wc-accent); color: #fff; font-weight: 600; }
.wc-settings .wc-key-state { font-weight: 600; margin-top: 4px; font-size: 12px; }
.wc-settings .wc-key-state.ok { color: var(--wc-ok); }
.wc-settings .wc-key-state.warn { color: var(--wc-warn); }
.wc-settings .wc-warning { border: 1px solid var(--wc-warn); background: rgba(146, 64, 14, 0.08);
  color: var(--wc-warn); border-radius: 8px; padding: 8px; margin: 10px 0; display: none; }
.wc-settings .wc-warning.show { display: block; }
.wc-settings .wc-env-guard { border: 2px solid #dc2626; background: rgba(220, 38, 38, 0.08); color: #991b1b;
  border-radius: 8px; padding: 8px; margin: 10px 0; font-weight: 600; display: none; }
.wc-settings .wc-env-guard.show { display: block; }
.wc-settings .wc-env-note { color: #b91c1c; font-size: 11.5px; margin: 6px 0; display: none; }
.wc-settings .wc-env-note.show { display: block; }
.wc-settings .wc-msg { margin-top: 6px; font-size: 12px; }
.wc-settings .wc-msg.ok { color: var(--wc-ok); font-weight: 600; }
.wc-settings .wc-msg.warn { color: var(--wc-warn); }
.wc-settings .wc-msg.err { color: var(--wc-err); }
.wc-settings .wc-auto-row { border: 1px solid var(--wc-border); border-radius: 8px; padding: 8px; margin: 8px 0;
  display: flex; flex-direction: column; gap: 6px; }
.wc-settings .wc-auto-row .wc-row { margin-top: 0; }
.wc-settings .wc-diag-output { margin: 8px 0; padding: 8px; border: 1px solid var(--wc-border); border-radius: 8px;
  background: var(--wc-bg-subtle); font-size: 11.5px; white-space: pre-wrap; max-height: 320px; overflow: auto; }
.wc-settings .wc-diag-row { margin: 2px 0; }
.wc-settings .wc-diag-ok { color: var(--wc-ok); }
.wc-settings .wc-diag-warn { color: var(--wc-warn); }
.wc-settings .wc-diag-fail { color: var(--wc-err); font-weight: 600; }
.wc-settings .wc-diag-summary { margin-top: 6px; font-weight: 600; }
.wc-settings details > summary { cursor: pointer; font-weight: 600; font-size: 12px; }
.wc-settings details p { margin: 6px 0; }
.wc-settings code { overflow-wrap: anywhere; }
.wc-settings .wc-session-item { width: 100%; text-align: left; white-space: normal; overflow-wrap: anywhere; }
.wc-settings .wc-session-item.current { border-color: var(--wc-accent); color: var(--wc-accent-text); font-weight: 600; }
`;

const STYLE_ID = 'wc-settings-styles';

/** Inject the shared stylesheet once per document (idempotent). */
export function ensureSettingsStyles(doc: Document): void {
  if (doc.getElementById(STYLE_ID)) return;
  const style = doc.createElement('style');
  style.id = STYLE_ID;
  style.textContent = SETTINGS_CSS;
  (doc.head ?? doc.documentElement).appendChild(style);
}
