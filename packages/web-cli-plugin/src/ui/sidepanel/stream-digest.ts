/**
 * V4-2 TASK-605 / TASK-606 (leaf `specs-tree-v4-2-chat-stream-model`) — the
 * **stream digest**: the panel-side, zero-plaintext summary persisted under
 * `chrome.storage.local` (父 ADR-V4-002 decision 5 / ADR-V4-003 / ADR-V4-028).
 *
 * ── Why a digest and not the events ──────────────────────────────────────────
 *
 * The event log is the in-memory truth (append-only, `bound`-capped). Persisting
 * it would (a) be a plaintext risk (bodies, command argument bodies, URL query
 * strings), (b) duplicate the SW's own `session-store`, and (c) require a new
 * message kind — which is exactly what the `content.js` no-tolerance red line
 * forbids. So persistence here is a **whitelist projection**: the facts that make
 * a reopened panel still honest (which card existed, when, how it ended, which
 * tool, how long, which reference/ask) without a single byte of body text.
 *
 * ── The zero-plaintext guarantee is structural ───────────────────────────────
 *
 *  · {@link DigestEntry} has **no自由文本 field**. `label` is the only string the
 *    caller may hand in, it is truncated to {@link DIGEST_LABEL_MAX} and it is
 *    **never derived from `payload.text`** — a row without an explicit, already
 *    constructed label persists *no* text at all.
 *  · {@link assertDigestSafe} refuses anything outside {@link DIGEST_FIELDS}, then
 *    runs {@link assertNoPlaintext} over every string value: URL query strings,
 *    command argument bodies, API keys / bearer tokens and raw markup all THROW
 *    (fail-closed — the reverse cases in `test/stream-persistence.test.ts`).
 *  · The storage key is `web-cli/stream-digest:<sessionId>` with an LRU of
 *    {@link MAX_DIGEST_SESSIONS} (aligned with the SW's `MAX_SESSIONS = 20`).
 *
 * The module is DOM-free and clock-free (`updatedAt` is injected); the only
 * out-of-module dependency is the small {@link DigestStore} facade, so node tests
 * drive the whole persistence path with an in-memory store.
 *
 * @module ui/sidepanel/stream-digest
 */
import type { StreamEvent, StreamEventKind, StreamPayload, StreamTerminal } from './stream-model.js';

/** Storage key prefix (面板侧，`storage` 权限已在 manifest 静态声明). */
export const DIGEST_PREFIX = 'web-cli/stream-digest:';

/** LRU size — deliberately the same value as the SW session store's `MAX_SESSIONS`. */
export const MAX_DIGEST_SESSIONS = 20;

/** `label` truncation bound (characters). */
export const DIGEST_LABEL_MAX = 80;

/** The body placeholder used by the degraded (panel-reopen) rebuild. */
export const DIGEST_DEGRADED_BODY = '（历史摘要）';

/**
 * The **closed** whitelist. A digest entry may contain these fields and nothing
 * else; `test/stream-persistence.test.ts` asserts the set both ways (extra field
 * ⇒ FAIL, missing whitelist field ⇒ FAIL).
 */
export const DIGEST_FIELDS: readonly string[] = Object.freeze([
  'seq',
  'ts',
  'kind',
  'cardId',
  'terminal',
  'label',
  'tool',
  'ok',
  'ms',
  'refNum',
  'askRequestId',
]);

/** One persisted card fact. No free-text field exists by construction. */
export interface DigestEntry {
  readonly seq: number;
  readonly ts: number;
  readonly kind: StreamEventKind;
  readonly cardId: string;
  readonly terminal?: StreamTerminal;
  /** Short, caller-constructed, already-sanitised label (≤ {@link DIGEST_LABEL_MAX}). */
  readonly label?: string;
  readonly tool?: string;
  readonly ok?: boolean;
  readonly ms?: number;
  readonly refNum?: number;
  readonly askRequestId?: string;
}

/** The stored envelope (an LRU clock plus the whitelisted entries). */
export interface DigestEnvelope {
  readonly v: 1;
  readonly updatedAt: number;
  readonly entries: readonly DigestEntry[];
}

/* ────────────────────────────────────────────────────────────────────────────
 * 1. Zero-plaintext guard
 * ──────────────────────────────────────────────────────────────────────────── */

/** URL query string (`?a=b` / `&a=b`) — the classic leak in a "short summary". */
const URL_QUERY = /[?&][A-Za-z0-9_.~%-]+=/;
/** Secrets / tokens that must never be persisted, even truncated. */
const SECRET = /(?:sk|pk|ghp|xox[baprs])-[A-Za-z0-9_-]{8,}|api[-_]?key\s*[:=]|bearer\s+\S+/i;
/** A CLI flag with an argument (`--doc main` / `-H "..."`) = a command argument body. */
const CMD_ARG_BODY = /(?:^|\s)--?[A-Za-z][\w-]*[=\s]\S/;
/** Raw markup / template syntax: a digest is not a render surface. */
const RAW_MARKUP = /[<>`]/;

/**
 * Fail-closed plaintext scan over every string a digest may carry.
 *
 * Reuses the `l1/receipt.ts#assertNoPlaintext` caliber (URL must be de-queryied,
 * secrets never appear) and adds the two shapes a *stream* leak would take: a
 * command argument body and raw markup. Throws — never returns `false`.
 */
export function assertNoPlaintext(texts: readonly string[]): void {
  for (const text of texts) {
    if (URL_QUERY.test(text)) {
      throw new Error('流摘要出现 URL query：零明文纪律要求摘要不含 URL 参数（去参后只保留长度 / 路径 / basename）');
    }
    if (SECRET.test(text)) {
      throw new Error('流摘要出现疑似密钥 / 令牌：摘要字段白名单不含任何凭证');
    }
    if (CMD_ARG_BODY.test(text)) {
      throw new Error('流摘要出现命令参数体：零明文纪律要求摘要不含命令参数（只允许命令名 / 动作 id / 结果 / 耗时）');
    }
    if (RAW_MARKUP.test(text)) {
      throw new Error('流摘要出现原始标记（< > `）：摘要不是渲染面，禁存任何标记文本');
    }
  }
}

/** Truncate to {@link DIGEST_LABEL_MAX} then scan (injection ⇒ THROW, never silent strip). */
export function sanitizeLabel(raw: string): string {
  const firstLine = raw.split('\n').map((l) => l.trim()).find((l) => l.length > 0) ?? '';
  const truncated = firstLine.slice(0, DIGEST_LABEL_MAX);
  assertNoPlaintext([truncated]);
  return truncated;
}

/** Assert the entry is whitelist-pure AND plaintext-free. */
export function assertDigestSafe(entry: DigestEntry): void {
  const unknown = Object.keys(entry).filter((k) => !DIGEST_FIELDS.includes(k));
  if (unknown.length > 0) {
    throw new Error(`流摘要出现白名单外字段：${unknown.join(', ')}（零明文白名单 ${DIGEST_FIELDS.join('/')}）`);
  }
  const strings: string[] = [];
  for (const value of Object.values(entry)) {
    if (typeof value === 'string') strings.push(value);
  }
  assertNoPlaintext(strings);
}

/* ────────────────────────────────────────────────────────────────────────────
 * 2. Projection: CardView → DigestEntry
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * The projection subset a digest is built from (structurally a `CardView`).
 *
 * `payload` is the FULL {@link StreamPayload} on purpose: `digestEntryOf` proves at
 * runtime that it reads nothing but the whitelisted fields — the body (`text`) is
 * accepted as input and deliberately ignored.
 */
export interface DigestViewInput {
  readonly cardId: string;
  readonly kind: StreamEventKind;
  readonly ts: number;
  readonly firstSeq: number;
  readonly terminal?: StreamTerminal;
  readonly payload: StreamPayload;
}

/**
 * Project one card into its persisted fact.
 *
 * NOTE the deliberate absence of any `payload.text` read: a card without an
 * explicit `label`/`tool`/`refLabel` persists **no** text. That is the structural
 * half of the zero-plaintext guarantee.
 */
export function digestEntryOf(view: DigestViewInput): DigestEntry {
  const p = view.payload;
  const entry: DigestEntry = Object.freeze({
    seq: view.firstSeq,
    ts: view.ts,
    kind: view.kind,
    cardId: view.cardId,
    ...(view.terminal !== undefined ? { terminal: view.terminal } : {}),
    ...(p.label !== undefined ? { label: sanitizeLabel(p.label) } : {}),
    ...(p.tool !== undefined ? { tool: sanitizeLabel(p.tool) } : {}),
    ...(p.ok !== undefined ? { ok: p.ok } : {}),
    ...(p.ms !== undefined ? { ms: p.ms } : {}),
    ...(p.refNum !== undefined ? { refNum: p.refNum } : {}),
    ...(p.requestId !== undefined ? { askRequestId: p.requestId } : {}),
  });
  assertDigestSafe(entry);
  return entry;
}

/** Project a whole (usually session-scoped) projection. */
export function digestForViews(views: readonly DigestViewInput[]): DigestEntry[] {
  return views.map((v) => digestEntryOf(v));
}

/* ────────────────────────────────────────────────────────────────────────────
 * 3. Storage facade (injectable ⇒ node-testable)
 * ──────────────────────────────────────────────────────────────────────────── */

export interface DigestStore {
  get(key: string): Promise<unknown>;
  set(key: string, value: unknown): Promise<void>;
  remove(key: string): Promise<void>;
  keys(): Promise<string[]>;
}

/** The production store: the panel's own `chrome.storage.local` (no new permission). */
export function createChromeDigestStore(): DigestStore {
  const local = chrome.storage.local;
  return {
    async get(key) {
      const all = await local.get(key);
      return (all as Record<string, unknown>)[key];
    },
    async set(key, value) {
      await local.set({ [key]: value });
    },
    async remove(key) {
      await local.remove(key);
    },
    async keys() {
      const all = await local.get(null);
      return Object.keys(all as Record<string, unknown>);
    },
  };
}

export const digestKey = (sessionId: string): string => `${DIGEST_PREFIX}${sessionId}`;

function parseEnvelope(raw: unknown): DigestEnvelope | null {
  if (!raw || typeof raw !== 'object') return null;
  const env = raw as { v?: unknown; updatedAt?: unknown; entries?: unknown };
  if (!Array.isArray(env.entries)) return null;
  const entries: DigestEntry[] = [];
  for (const item of env.entries) {
    if (!item || typeof item !== 'object') continue;
    const entry = item as DigestEntry;
    assertDigestSafe(entry);
    entries.push(entry);
  }
  return Object.freeze({
    v: 1,
    updatedAt: typeof env.updatedAt === 'number' ? env.updatedAt : 0,
    entries: Object.freeze(entries),
  });
}

/** Idempotent upsert (a session's digest is replaced, never appended to). */
export async function upsertDigest(
  store: DigestStore,
  sessionId: string,
  entries: readonly DigestEntry[],
  updatedAt: number,
): Promise<void> {
  for (const entry of entries) assertDigestSafe(entry);
  const envelope: DigestEnvelope = Object.freeze({
    v: 1,
    updatedAt,
    entries: Object.freeze([...entries]),
  });
  await store.set(digestKey(sessionId), envelope);
}

/** Read a session's digest (schema + plaintext are re-validated on the way in). */
export async function readDigest(store: DigestStore, sessionId: string): Promise<DigestEntry[]> {
  const raw = await store.get(digestKey(sessionId));
  const env = parseEnvelope(raw);
  return env ? [...env.entries] : [];
}

/** Every persisted digest session key (order: most-recently-updated first). */
export async function digestSessions(store: DigestStore): Promise<Array<{ sessionId: string; updatedAt: number }>> {
  const keys = (await store.keys()).filter((k) => k.startsWith(DIGEST_PREFIX));
  const out: Array<{ sessionId: string; updatedAt: number }> = [];
  for (const key of keys) {
    const env = parseEnvelope(await store.get(key));
    out.push({ sessionId: key.slice(DIGEST_PREFIX.length), updatedAt: env?.updatedAt ?? 0 });
  }
  out.sort((a, b) => b.updatedAt - a.updatedAt);
  return out;
}

/** LRU eviction: keep the `max` most-recently-updated digests (default 20). */
export async function evictDigests(store: DigestStore, max = MAX_DIGEST_SESSIONS): Promise<string[]> {
  const sessions = await digestSessions(store);
  const evicted: string[] = [];
  for (const s of sessions.slice(max)) {
    await store.remove(digestKey(s.sessionId));
    evicted.push(s.sessionId);
  }
  return evicted;
}

/* ────────────────────────────────────────────────────────────────────────────
 * 4. Degraded rebuild (panel reopen) — explicitly registered truncation
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * Rebuild events from a digest. `seq`/`ts`/`kind`/`terminal`/`tool`/`ok`/`ms`/
 * `refNum` are preserved; the **body** is the explicit
 * {@link DIGEST_DEGRADED_BODY} placeholder — the rebuild never invents text.
 *
 * Registered as a truncation rule in `docs/v4-supersession-ledger.json`
 * (`scope: panel-reopen`, `degraded: ['body']`).
 */
export function digestToEvents(entries: readonly DigestEntry[], sessionId: string): StreamEvent[] {
  return entries.map((e) =>
    Object.freeze({
      seq: e.seq,
      ts: e.ts,
      kind: e.kind,
      cardId: e.cardId,
      sessionId,
      payload: Object.freeze({
        text: DIGEST_DEGRADED_BODY,
        ...(e.label !== undefined ? { label: e.label } : {}),
        ...(e.tool !== undefined ? { tool: e.tool } : {}),
        ...(e.ok !== undefined ? { ok: e.ok } : {}),
        ...(e.ms !== undefined ? { ms: e.ms } : {}),
        ...(e.refNum !== undefined ? { refNum: e.refNum } : {}),
        ...(e.askRequestId !== undefined ? { requestId: e.askRequestId } : {}),
      }),
      ...(e.terminal !== undefined ? { terminal: e.terminal } : {}),
    }),
  );
}
