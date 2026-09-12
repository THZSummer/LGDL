// @ts-check
/**
 * Baseline tool-catalog extractor (FR-051 / TASK-029, phase 1).
 *
 * WHY THIS EXISTS (root cause of the 2026-09 "工具清单严重缺失" defect):
 *   `docs/capability-matrix.md` was a HAND-WRITTEN table with no executable
 *   consumer. Nothing in `npm test` ever compared the plugin's real LLM tool
 *   surface against the original built-in assistant's registration matrix, so
 *   the matrix silently drifted ("dom / chrome screenshot ... 全丢了").
 *
 * This script machine-enumerates the original assistant's tool catalog from the
 * `main` branch so `test/parity.test.ts` can enforce coverage. It is NOT run by
 * `npm test` (it needs a baseline clone); it is the provenance generator for the
 * committed fixture `test/parity/baseline-catalog.json`.
 *
 * HOW TO REPRODUCE (read-only — never touches `main`):
 *   TS=$(date +%s)
 *   git clone --branch main --single-branch <repo> /tmp/lgdl-baseline-$TS
 *   node packages/web-cli-plugin/test/parity/extract-baseline-catalog.mjs \
 *     --baseline /tmp/lgdl-baseline-$TS \
 *     --out packages/web-cli-plugin/test/parity/baseline-catalog.json
 *
 * The enumeration is:
 *   1. read `<baseline>/packages/lgdl-web/src/ai/session.ts` (the registration
 *      matrix) and `git rev-parse HEAD` (provenance);
 *   2. scan that file for every tool-factory identifier and assert each one is
 *      handled below — a NEW factory in session.ts fails extraction loudly
 *      instead of silently under-reporting (anti-drift guard);
 *   3. build each entry through the SAME package factories, capturing the real
 *      `name` + `subcommand` enum + `risk` + `group` + enabled state from the
 *      runtime schema (no hand-maintained subcommand lists);
 *   4. resolve each tool to a source `file:line` inside the baseline tree.
 *
 * `packages/web-cli-base` is byte-identical between `main` and this branch
 * (verified by `diff -rq`), so importing the local compiled factories yields the
 * baseline entry shapes faithfully; only the session.ts factory *sequence* and
 * the git SHA come from the baseline checkout.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
// @ts-ignore — resolved via the workspace @lgdl symlinks
import * as B from '@lgdl/web-cli-base';
// @ts-ignore
import { createLgdlWebCliTool } from '@lgdl/lgdl-web-cli';
// @ts-ignore
import { createOpCliToolEntry } from '@lgdl/lgdl-web-op-cli';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '..', '..', '..', '..');

function arg(name) {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

const baseline = arg('--baseline');
if (!baseline) {
  console.error('✖ 缺少 --baseline <dir>。复现步骤见本文件头部注释（git clone --branch main）。');
  process.exit(2);
}
if (!existsSync(join(baseline, 'packages', 'lgdl-web', 'src', 'ai', 'session.ts'))) {
  console.error(`✖ ${baseline} 不是包含 main 基线的 LGDL 检出（缺 packages/lgdl-web/src/ai/session.ts）。`);
  process.exit(2);
}
const outPath = arg('--out') ?? join(here, 'baseline-catalog.json');

const sessionPath = join(baseline, 'packages', 'lgdl-web', 'src', 'ai', 'session.ts');
const sessionSrc = readFileSync(sessionPath, 'utf8');
const commit = execFileSync('git', ['-C', baseline, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();

// ── 1. anti-drift guard: every tool factory in session.ts must be handled ────
// Identifiers that look like tool-entry factories (not plain helpers like
// createCommandRouter / createAgentRunner / createMemoryStorage / …).
const FACTORY_RE = /\b(create[A-Za-z0-9]*?(?:ToolEntry|ToolEntries|Tools)|createP0DomainTools|createLgdlWebCliTool|createOpCliToolEntry|createCollectToolEntries|createCollectBuffer)\b/g;
const foundFactories = new Set([...sessionSrc.matchAll(FACTORY_RE)].map((m) => m[1]));
const HANDLED = new Set([
  'createLgdlWebCliTool',
  'createOpCliToolEntry',
  'createP0DomainTools',
  'createSearchTools',
  'createDomToolEntry',
  'createAskUserToolEntry',
  'createTodoToolEntry',
  'createGoalToolEntry',
  'createJobsToolEntry',
  'createEvalJsToolEntry',
  'createSubagentToolEntry',
  'createWaitToolEntry',
  'createCollectBuffer',
  'createCollectToolEntries',
  'createPageEvalToolEntry',
  'createChromeToolEntry',
  'createSaveFileToolEntry',
  'createNotifyToolEntry',
  'createClipboardToolEntry',
  'createEventsToolEntry',
  'createCookieToolEntry',
  'createDialogToolEntry',
  'createNetToolEntry',
]);
const unhandled = [...foundFactories].filter((f) => !HANDLED.has(f));
if (unhandled.length) {
  console.error(
    `✖ session.ts 出现未登记的工厂：${unhandled.join(', ')}\n` +
      '  请更新 test/parity/extract-baseline-catalog.mjs 的 HANDLED 表与注册序列后再生成基线目录。',
  );
  process.exit(3);
}

// ── 2. build the baseline entry set through the real factories ──────────────
const env = B.nodeEnv();
const mem = B.createMemoryStorage();
// Default router auto-registers the three base builtins (web-fetch/sleep/
// web-cli-help) exactly like `createAiSession` does; the rest mirror the
// session.ts registration sequence below.
const router = B.createCommandRouter();
const register = (entry) => {
  try {
    router.register(entry);
  } catch (err) {
    // duplicate tool name between families would be a real baseline defect
    throw new Error(`baseline factory produced a duplicate entry "${entry?.name}": ${err.message}`);
  }
};

// business tools
register(createLgdlWebCliTool());
register(createOpCliToolEntry({}));
// P0 matrix
for (const e of B.createP0DomainTools({ env, backend: mem, sessionStore: B.createSessionStore(mem) })) register(e);
// P1
for (const e of B.createSearchTools()) register(e);
register(B.createDomToolEntry(env));
register(B.createAskUserToolEntry(env));
register(B.createTodoToolEntry({ store: B.createSessionStore(mem), sessionId: () => 'baseline' }));
register(B.createGoalToolEntry({ store: B.createGoalStore(mem) }));
register(B.createJobsToolEntry({ store: new B.JobStore(mem) }));
register({ ...B.createEvalJsToolEntry({ create() { throw new Error('baseline: worker unavailable'); } }), enabled: false });
register({ ...B.createSubagentToolEntry({ router, chat: async () => '' }), enabled: false });
// v3
register(B.createWaitToolEntry(env));
const buffer = B.createCollectBuffer();
const collect = B.createCollectToolEntries(env, buffer);
register(collect.extract);
register(collect.export);
register({ ...B.createPageEvalToolEntry(env), enabled: false });
// v3 P2
register(B.createChromeToolEntry(env));
register(B.createSaveFileToolEntry(env));
register(B.createNotifyToolEntry(env));
register(B.createClipboardToolEntry(env));
// v4
register(B.createEventsToolEntry(env));
register({ ...B.createCookieToolEntry(env), enabled: false });
register({ ...B.createDialogToolEntry(env), enabled: false });
register({ ...B.createNetToolEntry(env), enabled: false });

// ── 3. resolve source file:line in the baseline tree ────────────────────────
const searchRoots = [
  join(baseline, 'packages', 'web-cli-base', 'src'),
  join(baseline, 'packages', 'lgdl-web-cli', 'src'),
  join(baseline, 'packages', 'lgdl-web-op-cli', 'src'),
];
const sourceIndex = [];
function walk(dir) {
  if (!existsSync(dir)) return;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p);
    else if (/\.ts$/.test(name) && !/\.test\.ts$/.test(name)) sourceIndex.push(p);
  }
}
for (const r of searchRoots) walk(r);

function sourceOf(toolName) {
  // Prefer an exact `name: '<tool>'` occurrence (the factory site), else a help
  // string, so every tool resolves to a provenance pointer.
  for (const file of sourceIndex) {
    const lines = readFileSync(file, 'utf8').split('\n');
    for (let i = 0; i < lines.length; i += 1) {
      if (lines[i].includes(`name: '${toolName}'`) || lines[i].includes(`name: "${toolName}"`)) {
        return `${file.slice(baseline.length + 1)}:${i + 1}`;
      }
    }
  }
  for (const file of sourceIndex) {
    const lines = readFileSync(file, 'utf8').split('\n');
    for (let i = 0; i < lines.length; i += 1) {
      if (lines[i].includes(`'${toolName}'`)) return `${file.slice(baseline.length + 1)}:${i + 1}`;
    }
  }
  return null;
}

const tools = router.names().map((name) => {
  const entry = router.query({ name })[0];
  const sub = entry?.schema?.parameters?.properties?.subcommand;
  const subcommands = Array.isArray(sub?.enum) ? [...sub.enum] : [];
  return {
    name,
    subcommands,
    risk: entry?.risk ?? null,
    group: entry?.group ?? entry?.namespace ?? 'general',
    enabled: router.isEnabled(name),
    source: sourceOf(name),
  };
});

const fixture = {
  provenance: {
    branch: 'main',
    commit,
    sessionMatrix: 'packages/lgdl-web/src/ai/session.ts',
    extractedAt: new Date().toISOString(),
    extractor: 'packages/web-cli-plugin/test/parity/extract-baseline-catalog.mjs',
    note:
      'ORIGINAL built-in assistant tool catalog (pre-FR-038 teardown). Machine-enumerated from the ' +
      'session.ts registration matrix + real factory schemas. Enforced by test/parity.test.ts.',
  },
  toolCount: tools.length,
  tools,
};

writeFileSync(outPath, `${JSON.stringify(fixture, null, 2)}\n`, 'utf8');
console.log(`✓ baseline catalog written: ${outPath}`);
console.log(`  main@${commit.slice(0, 12)} · ${tools.length} tools · ${tools.reduce((n, t) => n + t.subcommands.length, 0)} subcommands`);
for (const t of tools) {
  console.log(`  - ${t.name}${t.subcommands.length ? ` [${t.subcommands.length} sub: ${t.subcommands.join('/')}]` : ''}${t.enabled ? '' : ' (disabled)'}`);
}
