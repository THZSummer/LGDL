/**
 * V4-1 review 修复轮 **I5** — pure-node unit tests for the new theme module
 * (`src/ui/sidepanel/theme.ts`), with the EC-CHAT-014 failure path covered.
 *
 * Why this file exists: the v4-1 review found the module had **zero** node tests and
 * that EC-CHAT-014 (`storage` read/write failure ⇒ degrade to `auto` without blocking
 * the UI) had **no** executable coverage — the runtime l0 gate only drives the happy
 * three-state cycle. This file supplies the missing fast feedback channel: it runs in
 * the existing `npm test` pipeline with no new dependency, using a ~40 line DOM stub
 * that implements exactly the `ThemeDoc` / `ThemeElement` / `ThemeStorage` surfaces
 * the module declares (no jsdom, no Chromium).
 *
 * Coverage:
 *   · `isThemeState` / `nextTheme` boundaries (unknown input degrades to `auto`);
 *   · `applyTheme` three states (auto removes `data-theme`, light/dark write it) and
 *     the three read-back channels on the button (`data-theme-state` / `aria-pressed` /
 *     visible label) — NFR-CHAT-004 「不只靠颜色」;
 *   · `mountTheme` happy path (`load` / `set` / `cycle`) and persistence key;
 *   · **EC-CHAT-014**: `load()` with a throwing reader ⇒ resolves `auto` (never rejects);
 *     `set()` with a throwing writer ⇒ keeps the state, never rejects / throws;
 *     a click cannot take the panel down even when persistence fails.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  THEME_CYCLE,
  THEME_LABELS,
  THEME_STORAGE_FULL_KEY,
  THEME_STORAGE_KEY,
  applyTheme,
  chromeThemeStorage,
  isThemeState,
  mountTheme,
  nextTheme,
  type ThemeDoc,
  type ThemeElement,
  type ThemeState,
  type ThemeStorage,
} from '../src/ui/sidepanel/theme.js';

/** Minimal element stub (implements exactly the `ThemeElement` surface). */
class StubElement implements ThemeElement {
  textContent: string | null = null;
  hidden?: boolean;
  readonly attrs = new Map<string, string>();
  private readonly listeners: Array<() => void> = [];

  setAttribute(name: string, value: string): void {
    this.attrs.set(name, value);
  }
  getAttribute(name: string): string | null {
    return this.attrs.get(name) ?? null;
  }
  removeAttribute(name: string): void {
    this.attrs.delete(name);
  }
  addEventListener(_type: string, listener: () => void): void {
    this.listeners.push(listener);
  }
  click(): void {
    for (const listener of this.listeners) listener();
  }
}

function makeDoc(): { doc: ThemeDoc; root: StubElement; btn: StubElement } {
  const root = new StubElement();
  const btn = new StubElement();
  btn.textContent = '主题';
  const doc: ThemeDoc = {
    documentElement: root,
    getElementById: (id: string) => (id === 'theme-toggle' ? btn : null),
  };
  return { doc, root, btn };
}

/** Storage stub with switchable read/write failure (EC-CHAT-014 driver). */
function makeStorage(
  initial: unknown,
  opts: { getFails?: boolean; setFails?: boolean } = {},
): { storage: ThemeStorage; writes: Array<{ key: string; value: string }> } {
  const writes: Array<{ key: string; value: string }> = [];
  const storage: ThemeStorage = {
    async get(key: string) {
      if (opts.getFails) throw new Error(`storage read failed for ${key}`);
      return initial;
    },
    async set(key: string, value: string) {
      if (opts.setFails) throw new Error('storage write failed');
      writes.push({ key, value });
    },
  };
  return { storage, writes };
}

// ── pure helpers ─────────────────────────────────────────────────────────────

test('theme: the cycle order is verbatim auto → light → dark (FR-CHAT-011)', () => {
  assert.deepEqual([...THEME_CYCLE], ['auto', 'light', 'dark']);
  assert.ok(THEME_LABELS.auto.length > 0 && THEME_LABELS.light.length > 0 && THEME_LABELS.dark.length > 0);
});

test('theme: the storage keys are namespaced under the panel key (existing `storage` permission)', () => {
  assert.equal(THEME_STORAGE_KEY, 'theme');
  assert.equal(THEME_STORAGE_FULL_KEY, 'web-cli:theme');
});

test('theme: `isThemeState` accepts exactly the three legal states', () => {
  for (const state of ['auto', 'light', 'dark']) assert.equal(isThemeState(state), true, state);
  for (const bad of ['Auto', 'system', '', null, undefined, 0, {}, []]) {
    assert.equal(isThemeState(bad), false, JSON.stringify(bad));
  }
});

test('theme: `nextTheme` cycles and degrades an unknown input to `auto`', () => {
  assert.equal(nextTheme('auto'), 'light');
  assert.equal(nextTheme('light'), 'dark');
  assert.equal(nextTheme('dark'), 'auto');
  // unknown input is first normalised to `auto`, so the next state is `light`
  // (it never becomes a fourth state).
  assert.equal(nextTheme('nope'), 'light');
  assert.equal(nextTheme(undefined), 'light');
});

// ── applyTheme ───────────────────────────────────────────────────────────────

test('theme: `applyTheme(auto)` REMOVES `data-theme` (the media query decides)', () => {
  const { doc, root, btn } = makeDoc();
  root.setAttribute('data-theme', 'dark');
  applyTheme(doc, 'auto');
  assert.equal(root.getAttribute('data-theme'), null);
  assert.equal(root.attrs.has('data-theme'), false);
  assert.equal(btn.getAttribute('data-theme-state'), 'auto');
  assert.equal(btn.getAttribute('aria-pressed'), 'false');
  assert.equal(btn.textContent, THEME_LABELS.auto);
});

test('theme: `applyTheme(light|dark)` writes `data-theme` and all three read-back channels', () => {
  for (const state of ['light', 'dark'] as ThemeState[]) {
    const { doc, root, btn } = makeDoc();
    applyTheme(doc, state);
    assert.equal(root.getAttribute('data-theme'), state);
    assert.equal(btn.getAttribute('data-theme-state'), state);
    assert.equal(btn.getAttribute('aria-pressed'), 'true');
    assert.equal(btn.textContent, THEME_LABELS[state]);
    assert.ok((btn.getAttribute('aria-label') ?? '').length > 0, 'aria-label 必须给出当前态');
  }
});

test('theme: `applyTheme` does not throw when the button is absent', () => {
  const root = new StubElement();
  const doc: ThemeDoc = { documentElement: root, getElementById: () => null };
  assert.doesNotThrow(() => applyTheme(doc, 'dark'));
  assert.equal(root.getAttribute('data-theme'), 'dark');
});

// ── mountTheme happy path ────────────────────────────────────────────────────

test('theme: `mountTheme` starts at auto with a clean document + button channels', () => {
  const { doc, root, btn } = makeDoc();
  const { storage } = makeStorage(undefined);
  const handle = mountTheme(doc, storage);
  assert.equal(handle.state, 'auto');
  assert.equal(root.getAttribute('data-theme'), null);
  assert.equal(btn.getAttribute('data-theme-state'), 'auto');
  assert.equal(btn.getAttribute('aria-pressed'), 'false');
});

test('theme: `set` persists to the full key and repaints the document', async () => {
  const { doc, root } = makeDoc();
  const { storage, writes } = makeStorage(undefined);
  const handle = mountTheme(doc, storage);
  assert.equal(handle.set('dark'), 'dark');
  await new Promise((r) => setTimeout(r, 0));
  assert.equal(root.getAttribute('data-theme'), 'dark');
  assert.deepEqual(writes, [{ key: THEME_STORAGE_FULL_KEY, value: 'dark' }]);
});

test('theme: `set` with an illegal value degrades to auto (never a fourth state)', async () => {
  const { doc, root } = makeDoc();
  const { storage, writes } = makeStorage(undefined);
  const handle = mountTheme(doc, storage);
  assert.equal(handle.set('sepia' as unknown as ThemeState), 'auto');
  await new Promise((r) => setTimeout(r, 0));
  assert.equal(root.getAttribute('data-theme'), null);
  assert.deepEqual(writes, [{ key: THEME_STORAGE_FULL_KEY, value: 'auto' }]);
});

test('theme: `cycle` walks auto → light → dark → auto and persists each step', async () => {
  const { doc, root } = makeDoc();
  const { storage, writes } = makeStorage(undefined);
  const handle = mountTheme(doc, storage);
  assert.equal(handle.cycle(), 'light');
  assert.equal(handle.cycle(), 'dark');
  assert.equal(handle.cycle(), 'auto');
  assert.equal(handle.state, 'auto');
  await new Promise((r) => setTimeout(r, 0));
  assert.deepEqual(
    writes.map((w) => w.value),
    ['light', 'dark', 'auto'],
  );
  assert.equal(root.getAttribute('data-theme'), null);
});

test('theme: clicking the button cycles the theme through the product path', async () => {
  const { doc, btn } = makeDoc();
  const { storage, writes } = makeStorage(undefined);
  const handle = mountTheme(doc, storage);
  btn.click();
  btn.click();
  await new Promise((r) => setTimeout(r, 0));
  assert.equal(handle.state, 'dark');
  assert.deepEqual(
    writes.map((w) => w.value),
    ['light', 'dark'],
  );
});

test('theme: `load` reads a legal persisted value and applies it', async () => {
  const { doc, root } = makeDoc();
  const { storage } = makeStorage('dark');
  const handle = mountTheme(doc, storage);
  assert.equal(await handle.load(), 'dark');
  assert.equal(root.getAttribute('data-theme'), 'dark');
});

test('theme: `load` with an illegal persisted value degrades to auto', async () => {
  const { doc, root } = makeDoc();
  const { storage } = makeStorage('sepia');
  const handle = mountTheme(doc, storage);
  assert.equal(await handle.load(), 'auto');
  assert.equal(root.getAttribute('data-theme'), null);
});

// ── EC-CHAT-014: storage failure ⇒ degrade to auto, never block ──────────────

test('theme(EC-CHAT-014): `load` with a THROWING reader resolves to auto (never rejects)', async () => {
  const { doc, root, btn } = makeDoc();
  const { storage } = makeStorage(undefined, { getFails: true });
  const handle = mountTheme(doc, storage);
  handle.set('dark');
  const state = await handle.load();
  assert.equal(state, 'auto', '读失败必须降级为 auto');
  assert.equal(handle.state, 'auto');
  assert.equal(root.getAttribute('data-theme'), null);
  assert.equal(btn.getAttribute('data-theme-state'), 'auto');
  assert.equal(btn.getAttribute('aria-pressed'), 'false');
});

test('theme(EC-CHAT-014): `set` with a THROWING writer keeps the state and never rejects', async () => {
  const { doc, root } = makeDoc();
  const { storage } = makeStorage(undefined, { setFails: true });
  const handle = mountTheme(doc, storage);
  assert.equal(handle.set('light'), 'light', '持久化失败不得阻断状态切换');
  assert.equal(root.getAttribute('data-theme'), 'light');
  // the rejected write promise must be swallowed (no unhandled rejection).
  await new Promise((r) => setTimeout(r, 0));
  assert.equal(handle.state, 'light');
});

test('theme(EC-CHAT-014): a click cannot take the panel down when persistence fails', async () => {
  const { doc, btn } = makeDoc();
  const { storage } = makeStorage(undefined, { setFails: true });
  const handle = mountTheme(doc, storage);
  assert.doesNotThrow(() => btn.click());
  assert.doesNotThrow(() => btn.click());
  await new Promise((r) => setTimeout(r, 0));
  assert.equal(handle.state, 'dark');
});

// ── chromeThemeStorage adapter ───────────────────────────────────────────────

test('theme: `chromeThemeStorage` fails closed when `chrome.storage.local` is unavailable', async () => {
  const g = globalThis as { chrome?: unknown };
  const prev = g.chrome;
  g.chrome = undefined;
  try {
    const storage = chromeThemeStorage();
    await assert.rejects(() => storage.get(THEME_STORAGE_FULL_KEY), /unavailable/);
    await assert.rejects(() => storage.set(THEME_STORAGE_FULL_KEY, 'dark'), /unavailable/);
  } finally {
    if (prev === undefined) delete g.chrome;
    else g.chrome = prev;
  }
});

test('theme: `chromeThemeStorage` reads and writes the existing local area (no new permission)', async () => {
  const g = globalThis as { chrome?: unknown };
  const prev = g.chrome;
  const written: Array<Record<string, unknown>> = [];
  g.chrome = {
    storage: {
      local: {
        get: async (key: string) => ({ [key]: 'dark' }),
        set: async (items: Record<string, unknown>) => {
          written.push(items);
        },
      },
    },
  };
  try {
    const storage = chromeThemeStorage();
    assert.equal(await storage.get(THEME_STORAGE_FULL_KEY), 'dark');
    await storage.set(THEME_STORAGE_FULL_KEY, 'light');
    assert.deepEqual(written, [{ [THEME_STORAGE_FULL_KEY]: 'light' }]);
  } finally {
    if (prev === undefined) delete g.chrome;
    else g.chrome = prev;
  }
});
