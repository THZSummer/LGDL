/**
 * Documentation presence + reference integrity (R9-10 / AC-011 reachable part).
 *
 * The P0/P1 docs must exist and be cross-referenced so a reader can reach the
 * protocol / migration / gate / dev surfaces from the shipped HTML and the
 * capability matrix. A missing file or a dangling reference fails here.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const docs = ['protocol.md', 'gate-d.md', 'migration.md', 'dev.md', 'smoke-checklist.md', 'capability-matrix.md', 'compliance.md'];

const read = (rel: string): string => readFileSync(new URL(rel, import.meta.url), 'utf8');

test('docs: all shipped plugin docs exist', () => {
  for (const d of docs) {
    assert.equal(existsSync(new URL(`../../docs/${d}`, import.meta.url)), true, `missing docs/${d}`);
  }
});

test('docs: options page references existing user-facing docs (no dangling links)', () => {
  const html = read('../../src/ui/options/index.html');
  for (const ref of ['docs/compliance.md', 'docs/protocol.md', 'docs/migration.md']) {
    assert.match(html, new RegExp(ref.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), `options must reference ${ref}`);
    assert.equal(existsSync(new URL(`../../${ref}`, import.meta.url)), true, `${ref} referenced but missing`);
  }
});

test('docs: smoke checklist + capability matrix cross-reference the doc set', () => {
  const smoke = read('../../docs/smoke-checklist.md');
  const matrix = read('../../docs/capability-matrix.md');
  for (const ref of ['docs/dev.md', 'docs/protocol.md', 'docs/migration.md']) {
    assert.match(smoke, new RegExp(ref.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), `smoke-checklist must reference ${ref}`);
  }
  for (const ref of ['docs/gate-d.md', 'docs/protocol.md', 'docs/migration.md', 'docs/dev.md']) {
    assert.match(matrix, new RegExp(ref.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), `capability-matrix must reference ${ref}`);
  }
});
