/**
 * V3-3 TASK-304 (FR-V3-050 / NFR-V3-016 / AC-V3-019 — ADR-V3-026) — the **审计（L2）**
 * view: a strict-whitelist, zero-plaintext projection of the existing audit channel.
 *
 * The channel is the v1 one (`audit-export` → the `PluginAuditSink` ring buffer); the
 * export entry point stays `admin_audit-export` (the tree receipt's ③ already points
 * there), reused rather than duplicated.
 *
 * **Zero-plaintext discipline** (the reason this module is a whitelist and not a
 * formatter):
 *   * only six fields are ever rendered — 命令名 / 动作 id / 结果 / 耗时 / 时间 /
 *     审计 id — plus a URL **de-parameterised** site column. Everything else the raw
 *     event may carry (`argsSummary`, `detail`, `reason`, `trust`, args bags, …) is
 *     dropped by construction: the row builder *picks* fields, it never spreads;
 *   * any URL-ish value is reduced to `scheme://host/path` (query + fragment are
 *     thrown away) before it can reach the DOM;
 *   * the rendered row set is generated from the sanitized rows, so a leaked field
 *     cannot appear in `textContent` / `outerHTML`.
 *
 * @module l2/audit
 */

/** The ONLY fields the audit view is allowed to read from an event. */
export const AUDIT_FIELD_WHITELIST = Object.freeze([
  'tool',
  'subcommand',
  'type',
  'decision',
  'ok',
  'durationMs',
  'ts',
  'origin',
] as const);

/** Registered field set of the rendered row (what the gate scans for). */
export const AUDIT_RENDERED_FIELDS = Object.freeze([
  'id',
  'command',
  'action',
  'result',
  'ms',
  'time',
  'origin',
] as const);

export const AUDIT_ZERO_PLAINTEXT_NOTE =
  '零明文：仅渲染 {命令名, 动作 id, 结果, 耗时, 时间, 审计 id} 六列 + 去参站点列；' +
  '参数摘要 / 原因 / 剪贴板与通知正文等一律不进入本视图（URL 已去参）。';

/** One rendered audit row — every value already sanitized. */
export interface AuditRow {
  /** Stable, per-render id (`ev-<n>`) — not derived from any event content. */
  id: string;
  command: string;
  action: string;
  result: string;
  ms: string;
  time: string;
  origin: string;
}

/**
 * Strip query + fragment from a URL-ish string (FR-V3-050「URL 去参」).
 *
 * Non-URL values (or unparsable ones) are returned as an empty string: the audit
 * view must not become a back door for arbitrary text.
 */
export function stripUrlParams(value: unknown): string {
  if (typeof value !== 'string' || value.length === 0) return '';
  try {
    const url = new URL(value);
    return `${url.protocol}//${url.host}${url.pathname}`;
  } catch {
    // Not an absolute URL: keep only a scheme-less `host/path`-ish prefix, never
    // anything that could carry a query/fragment/credential.
    const cut = value.split(/[?#]/)[0];
    return /^[\w.@:/~%+-]+$/.test(cut) ? cut : '';
  }
}

function readable(value: unknown): string {
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value);
  return '';
}

function resultText(event: Record<string, unknown>): string {
  const decision = readable(event.decision);
  if (decision) return decision;
  if (typeof event.ok === 'boolean') return event.ok ? '成功' : '失败';
  return '—';
}

function timeText(ts: unknown): string {
  if (typeof ts !== 'number' || !Number.isFinite(ts)) return '—';
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return '—';
  const pad = (n: number): string => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(
    d.getSeconds(),
  )}`;
}

/**
 * Build ONE row from an arbitrary event object.
 *
 * The function **picks** its eight inputs and drops everything else, so an event
 * carrying `argsSummary: 'apiKey=SECRET'` (or a clipboard body) contributes nothing.
 */
export function toAuditRow(event: unknown, index: number): AuditRow {
  const ev = (typeof event === 'object' && event !== null ? event : {}) as Record<string, unknown>;
  const tool = readable(ev.tool);
  const sub = readable(ev.subcommand);
  const command = sub ? `${tool} ${sub}` : tool || '（未标注命令）';
  return {
    id: `ev-${index}`,
    command,
    action: readable(ev.type) || '—',
    result: resultText(ev),
    ms: typeof ev.durationMs === 'number' && Number.isFinite(ev.durationMs) ? `${Math.round(ev.durationMs)}ms` : '—',
    time: timeText(ev.ts),
    origin: stripUrlParams(ev.origin),
  };
}

/** Pure: raw channel reply → sanitized rows (whitelist enforced per row). */
export function buildAuditRows(events: readonly unknown[]): AuditRow[] {
  return events.map((event, index) => toAuditRow(event, index));
}

/** Render the view into `host`. Read-only: no form control is ever created. */
export function renderAudit(doc: Document, host: HTMLElement, rows: readonly AuditRow[]): void {
  host.replaceChildren();

  const note = doc.createElement('p');
  note.className = 'l2-hint l2-note-zero-plaintext';
  note.textContent = AUDIT_ZERO_PLAINTEXT_NOTE;
  host.appendChild(note);

  const list = doc.createElement('div');
  list.className = 'l2-audit-list';
  list.setAttribute('role', 'list');
  list.dataset.count = String(rows.length);

  if (rows.length === 0) {
    const empty = doc.createElement('p');
    empty.className = 'l2-empty';
    empty.textContent = '暂无审计记录：授权 / 撤销 / 覆盖等动作发生后，这里会按时间列出（零明文）。';
    list.appendChild(empty);
  }

  for (const row of rows) {
    const item = doc.createElement('div');
    item.className = 'l2-audit-row';
    item.setAttribute('role', 'listitem');
    item.setAttribute('data-audit-id', row.id);
    for (const [field, value] of [
      ['id', row.id],
      ['command', row.command],
      ['action', row.action],
      ['result', row.result],
      ['ms', row.ms],
      ['time', row.time],
      ['origin', row.origin],
    ] as const) {
      if (!value) continue;
      const cell = doc.createElement('span');
      cell.className = `l2-audit-cell l2-audit-${field}`;
      cell.setAttribute('data-field', field);
      cell.textContent = value;
      item.appendChild(cell);
    }
    list.appendChild(item);
  }
  host.appendChild(list);
}
