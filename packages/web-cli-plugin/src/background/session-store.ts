/**
 * Multi-session store (author decision ② / FR-048 / ADR-013).
 *
 * Default model: **one session per origin** — every tab of the same origin
 * shares one session (one conversation history), different origins stay
 * isolated. A user may explicitly merge several origins into a **session group**
 * so they share a single conversation; grouping never implies authorization
 * (per-origin authorization in `OriginStore` is unchanged and still authoritative).
 *
 * Persistence: `chrome.storage.local` via the injected `PluginKv` (node-testable,
 * no chrome API here). `sessionId` derivation is pure:
 *   - origin not in any group → `sessionId = origin`
 *   - origin in group G        → `sessionId = `group:<G.groupId>``
 *
 * Bounded: at most `MAX_SESSIONS` live sessions; exceeding the cap evicts the
 * least-recently-active sessions and returns their ids readably (never silent
 * data loss). Histories are bounded by the shared `boundHistory` (40 turns,
 * starts at a `user` turn).
 */
import type { ChatTurn } from '@lgdl/web-cli-base';
import type { PluginKv } from '../security/origin-store.js';
import { boundHistory } from './chat-session.js';

/** Storage key for the whole multi-session state. */
export const SESSION_STORE_KEY = 'session-store';

/** Upper bound on live sessions (LRU-evicted beyond this). */
export const MAX_SESSIONS = 20;

export interface SessionGroup {
  groupId: string;
  name: string;
  /** Normalized origins merged into this group. */
  origins: string[];
  createdAt: number;
}

export interface StoredSession {
  sessionId: string;
  /** Origins that resolve to this session (group members, or the single origin). */
  origins: string[];
  history: ChatTurn[];
  createdAt: number;
  lastActiveAt: number;
  /** Group display name when this is a group session. */
  title?: string;
}

export interface SessionStoreState {
  groups: SessionGroup[];
  sessions: StoredSession[];
}

/** Normalize an origin for session keys (lowercase, drop trailing slash). */
export function normalizeSessionOrigin(origin: string): string {
  return origin.trim().replace(/\/+$/, '').toLowerCase();
}

/**
 * Derive the session id for an origin from the current group configuration.
 * Pure — the single source of the "同域名共享 / 不同域名独立" rule.
 */
export function sessionIdForOrigin(origin: string, groups: readonly SessionGroup[]): string {
  const norm = normalizeSessionOrigin(origin);
  const group = groups.find((g) => g.origins.includes(norm));
  return group ? `group:${group.groupId}` : norm;
}

/** Human-readable session label (group name + member count, or the origin). */
export function sessionLabel(session: StoredSession): string {
  if (session.title) return `${session.title}（${session.origins.length} 个域名）`;
  return session.origins[0] ?? session.sessionId;
}

/** Project a retained `ChatTurn[]` into the side-panel entry shape (FR-017). */
export function projectHistory(turns: readonly ChatTurn[]): Array<{ role: string; text: string }> {
  return turns
    .filter((t) => t.role === 'user' || t.role === 'assistant' || t.role === 'tool' || t.role === 'system')
    .map((t) => ({ role: t.role, text: typeof t.content === 'string' ? t.content : '' }))
    .filter((t) => t.text.length > 0);
}

export interface ActivateResult {
  session: StoredSession;
  /** Session ids evicted by the LRU cap (readable, never silent). */
  evicted: string[];
}

export interface SessionStore {
  /** (Re)read the persisted state. Idempotent — external writes become visible. */
  load(): Promise<void>;
  state(): SessionStoreState;
  /** Visible sessions, most-recently-active first (orphan sessions filtered out). */
  list(): StoredSession[];
  groups(): SessionGroup[];
  find(sessionId: string): StoredSession | undefined;
  sessionIdForOrigin(origin: string): string;
  /** Resolve + touch (create when missing) the session for an origin. */
  activate(origin: string): Promise<ActivateResult>;
  touch(sessionId: string): Promise<void>;
  createGroup(name: string): Promise<SessionGroup>;
  addOriginToGroup(groupId: string, origin: string): Promise<ActivateResult & { group: SessionGroup }>;
  /** Remove an origin from whatever group it belongs to (no-op when standalone). */
  removeOrigin(origin: string): Promise<{ removedFrom?: string }>;
  deleteGroup(groupId: string): Promise<{ removedOrigins: string[] }>;
  setHistory(sessionId: string, turns: ChatTurn[]): Promise<void>;
  historyOf(sessionId: string): ChatTurn[];
  clearHistory(sessionId: string): Promise<void>;
}

function copyTurn(t: ChatTurn): ChatTurn {
  return { ...t, ...(t.toolCalls ? { toolCalls: t.toolCalls.map((c) => ({ ...c })) } : {}) };
}

function sanitizeGroupName(name: string): string {
  const trimmed = name.trim();
  return trimmed.length > 0 ? trimmed.slice(0, 40) : '未命名分组';
}

export function createSessionStore(
  kv: PluginKv,
  opts: { now?: () => number; maxSessions?: number } = {},
): SessionStore {
  const now = opts.now ?? (() => Date.now());
  const maxSessions = opts.maxSessions && opts.maxSessions > 0 ? opts.maxSessions : MAX_SESSIONS;

  let groups: SessionGroup[] = [];
  let sessions: StoredSession[] = [];

  const persist = async (): Promise<void> => {
    await kv.set(SESSION_STORE_KEY, { groups, sessions } satisfies SessionStoreState);
  };

  const nextGroupId = (): string => {
    let max = 0;
    for (const g of groups) {
      const m = /^g(\d+)$/.exec(g.groupId);
      if (m) max = Math.max(max, Number(m[1]));
    }
    return `g${max + 1}`;
  };

  const findGroupForOrigin = (origin: string): SessionGroup | undefined => {
    const norm = normalizeSessionOrigin(origin);
    return groups.find((g) => g.origins.includes(norm));
  };

  /** Enforce the LRU cap; returns evicted session ids readably. */
  const enforceCap = (protect: string): string[] => {
    const evicted: string[] = [];
    while (sessions.length > maxSessions) {
      const candidates = sessions.filter((s) => s.sessionId !== protect).sort((a, b) => a.lastActiveAt - b.lastActiveAt);
      const victim = candidates[0] ?? sessions[0];
      if (!victim) break;
      sessions = sessions.filter((s) => s.sessionId !== victim.sessionId);
      evicted.push(victim.sessionId);
    }
    return evicted;
  };

  const ensureSession = (origin: string): ActivateResult => {
    const norm = normalizeSessionOrigin(origin);
    const group = findGroupForOrigin(norm);
    const sessionId = group ? `group:${group.groupId}` : norm;
    const ts = now();
    let session = sessions.find((s) => s.sessionId === sessionId);
    if (!session) {
      session = {
        sessionId,
        origins: group ? [...group.origins] : [norm],
        history: [],
        createdAt: ts,
        lastActiveAt: ts,
        ...(group ? { title: group.name } : {}),
      };
      sessions.push(session);
    }
    if (!session.origins.includes(norm)) session.origins.push(norm);
    session.lastActiveAt = ts;
    const evicted = enforceCap(sessionId);
    return { session, evicted };
  };

  return {
    async load() {
      const stored = await kv.get<SessionStoreState>(SESSION_STORE_KEY);
      if (stored && typeof stored === 'object') {
        groups = Array.isArray(stored.groups) ? stored.groups.map((g) => ({ ...g, origins: [...(g.origins ?? [])] })) : [];
        sessions = Array.isArray(stored.sessions)
          ? stored.sessions.map((s) => ({
              ...s,
              origins: [...(s.origins ?? [])],
              history: Array.isArray(s.history) ? s.history.map(copyTurn) : [],
            }))
          : [];
      } else {
        groups = [];
        sessions = [];
      }
    },
    state() {
      return { groups: groups.map((g) => ({ ...g, origins: [...g.origins] })), sessions: sessions.map((s) => ({ ...s })) };
    },
    list() {
      const grouped = new Set(groups.flatMap((g) => g.origins));
      return sessions
        .filter((s) => s.sessionId.startsWith('group:') || !grouped.has(s.sessionId))
        .sort((a, b) => b.lastActiveAt - a.lastActiveAt);
    },
    groups: () => groups.map((g) => ({ ...g, origins: [...g.origins] })),
    find: (sessionId) => sessions.find((s) => s.sessionId === sessionId),
    sessionIdForOrigin: (origin) => sessionIdForOrigin(origin, groups),
    async activate(origin) {
      const result = ensureSession(origin);
      await persist();
      return { session: result.session, evicted: result.evicted };
    },
    async touch(sessionId) {
      const session = sessions.find((s) => s.sessionId === sessionId);
      if (!session) return;
      session.lastActiveAt = now();
      await persist();
    },
    async createGroup(name) {
      const group: SessionGroup = {
        groupId: nextGroupId(),
        name: sanitizeGroupName(name),
        origins: [],
        createdAt: now(),
      };
      groups.push(group);
      await persist();
      return { ...group, origins: [] };
    },
    async addOriginToGroup(groupId, origin) {
      const norm = normalizeSessionOrigin(origin);
      const target = groups.find((g) => g.groupId === groupId);
      if (!target) throw new Error(`分组不存在：${groupId}`);
      for (const g of groups) {
        if (g.groupId !== groupId) g.origins = g.origins.filter((o) => o !== norm);
      }
      if (!target.origins.includes(norm)) target.origins.push(norm);
      const result = ensureSession(norm);
      // Keep the group session's member list + title in sync with the group.
      result.session.origins = [...target.origins];
      result.session.title = target.name;
      await persist();
      return { ...result, group: { ...target, origins: [...target.origins] } };
    },
    async removeOrigin(origin) {
      const norm = normalizeSessionOrigin(origin);
      const group = findGroupForOrigin(norm);
      if (!group) return {};
      group.origins = group.origins.filter((o) => o !== norm);
      const groupSessionId = `group:${group.groupId}`;
      const groupSession = sessions.find((s) => s.sessionId === groupSessionId);
      if (groupSession) groupSession.origins = [...group.origins];
      if (group.origins.length === 0) {
        groups = groups.filter((g) => g.groupId !== group.groupId);
        sessions = sessions.filter((s) => s.sessionId !== groupSessionId);
      }
      await persist();
      return { removedFrom: group.groupId };
    },
    async deleteGroup(groupId) {
      const group = groups.find((g) => g.groupId === groupId);
      if (!group) return { removedOrigins: [] };
      const removedOrigins = [...group.origins];
      groups = groups.filter((g) => g.groupId !== groupId);
      sessions = sessions.filter((s) => s.sessionId !== `group:${groupId}`);
      await persist();
      return { removedOrigins };
    },
    async setHistory(sessionId, turns) {
      const session = sessions.find((s) => s.sessionId === sessionId);
      if (!session) return;
      session.history = boundHistory(turns).map(copyTurn);
      await persist();
    },
    historyOf(sessionId) {
      const session = sessions.find((s) => s.sessionId === sessionId);
      return session ? session.history.map(copyTurn) : [];
    },
    async clearHistory(sessionId) {
      const session = sessions.find((s) => s.sessionId === sessionId);
      if (!session) return;
      session.history = [];
      await persist();
    },
  };
}
