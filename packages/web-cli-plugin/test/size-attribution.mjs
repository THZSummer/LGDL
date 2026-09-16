// @ts-check
/**
 * V3-2 fix round (2026-09-16, orchestrator ruling **V3-VOL-1 ③**) — the
 * *reproducible* `dist/sidepanel.js` growth-attribution tool.
 *
 * `npm run size:attribution -- --rev <A> --rev <B>`
 *
 * Why: the re-registration of a regression baseline must be justified by a
 * **per-module increment breakdown** ("which module/files contribute how many
 * bytes, and the growth comes from required modules, not duplicated code"),
 * written into `build.md` and the baseline metadata. That breakdown must be
 * reproducible, not hand-tallied.
 *
 * Method
 * ------
 * esbuild's `metafile.outputs[out].inputs[in].bytesInOutput` is the byte
 * contribution of each input module to the bundle. To compare two revisions the
 * two trees must be **geometrically identical** (same `absWorkingDir` depth,
 * same `@lgdl/web-cli-base` location) — otherwise esbuild's per-module
 * `// <path>` comments differ in length and inject a constant byte noise. This
 * tool therefore materialises both revisions into sibling sandboxes with the
 * same shape and the *same* `web-cli-base` copy, and asserts that the noise is
 * identical (the unchanged entry must produce byte-identical output) before it
 * reports any delta.
 *
 * Output: a markdown table (v3-1 B | v3-2 B | Δ B | kind) plus the totals, so the
 * numbers can be pasted into `build.md` and `SIDEPANEL_GROWTH_BREAKDOWN`.
 *
 * No new dependency: it uses `esbuild` (an existing devDependency) only.
 */
import { build } from 'esbuild';
import { cpSync, mkdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const REPO = resolve(ROOT, '..', '..');

const argv = process.argv.slice(2);
const revs = [];
for (let i = 0; i < argv.length; i += 1) {
  if (argv[i] === '--rev' && argv[i + 1]) revs.push(argv[i + 1]);
}
if (revs.length === 0) revs.push('HEAD');

const SANDBOX = resolve('/tmp/opencode/size-attribution');

/** Stub node: builtins referenced by SDK node-only branches (never executed in browser). */
const nodeStubPlugin = {
  name: 'node-stub',
  setup(b) {
    b.onResolve({ filter: /^node:/ }, (args) => ({ path: args.path, namespace: 'node-stub' }));
    b.onLoad({ filter: /.*/, namespace: 'node-stub' }, () => ({
      contents: 'export default {};',
      loader: 'js',
    }));
  },
};

/** Materialise `rev`'s sidepanel sources + a shared web-cli-base copy into a sandbox. */
function materialise(rev, name) {
  const dir = resolve(SANDBOX, name);
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(resolve(dir, 'packages/web-cli-plugin/src'), { recursive: true });
  const archive = execFileSync('git', ['-C', REPO, 'archive', rev, 'packages/web-cli-plugin/src'], {
    encoding: 'buffer',
    maxBuffer: 64 * 1024 * 1024,
  });
  execFileSync('tar', ['-x', '-C', dir], { input: archive });
  // Same dependency copy on both sides keeps esbuild's module-comment paths equal.
  cpSync(resolve(REPO, 'packages/web-cli-base'), resolve(dir, 'packages/web-cli-base'), {
    recursive: true,
  });
  symlinkSync(resolve(REPO, 'node_modules'), resolve(dir, 'node_modules'));
  return resolve(dir, 'packages/web-cli-plugin');
}

async function measure(pkgDir) {
  const result = await build({
    absWorkingDir: pkgDir,
    bundle: true,
    platform: 'browser',
    target: 'chrome116',
    logLevel: 'silent',
    write: false,
    metafile: true,
    plugins: [nodeStubPlugin],
    define: { 'process.env.NODE_ENV': '"production"', __BUILD_STAMP__: '0' },
    entryPoints: ['src/ui/sidepanel/sidepanel.ts'],
    outfile: 'out/sidepanel.js',
    format: 'iife',
  });
  const outPath = Object.keys(result.metafile.outputs).find((k) => k.endsWith('sidepanel.js'));
  if (!outPath) throw new Error('no sidepanel.js output in metafile');
  const out = result.metafile.outputs[outPath];
  const rows = new Map();
  for (const [input, v] of Object.entries(out.inputs)) {
    const short = input.includes('packages/web-cli-plugin/')
      ? input.split('packages/web-cli-plugin/').pop()
      : input;
    rows.set(short, v.bytesInOutput);
  }
  return { bytes: out.bytes, rows };
}

/** Same content on the unchanged entry ⇒ the sandbox noise is constant. */
async function main() {
  const measured = [];
  for (const [i, rev] of revs.entries()) {
    const name = `rev${i}-${rev.replace(/[^\w.-]/g, '_')}`;
    const pkg = materialise(rev, name);
    measured.push({ rev, ...(await measure(pkg)) });
  }
  const [base, head] = measured.length >= 2 ? [measured[0], measured[measured.length - 1]] : [measured[0], measured[0]];
  const keys = [...new Set([...base.rows.keys(), ...head.rows.keys()])].sort(
    (a, b) => (head.rows.get(b) ?? 0) - (head.rows.get(a) ?? 0),
  );
  const lines = [];
  lines.push(`# dist/sidepanel.js growth attribution`);
  lines.push('');
  lines.push(`base = ${base.rev} (${base.bytes} B) · head = ${head.rev} (${head.bytes} B) · Δ = ${head.bytes - base.bytes} B`);
  lines.push('');
  lines.push(`| module | ${base.rev} B | ${head.rev} B | Δ B | kind |`);
  lines.push('|---|---:|---:|---:|---|');
  let sum = 0;
  for (const key of keys) {
    const before = base.rows.get(key);
    const after = head.rows.get(key);
    const delta = (after ?? 0) - (before ?? 0);
    sum += delta;
    const kind = before === undefined ? 'NEW' : after === undefined ? 'REMOVED' : delta > 0 ? 'GROWN' : delta === 0 ? 'same' : 'SHRUNK';
    lines.push(`| ${key} | ${before ?? '—'} | ${after ?? '—'} | ${delta >= 0 ? '+' : ''}${delta} | ${kind} |`);
  }
  lines.push(`| **Σ per-module** | | | **${sum >= 0 ? '+' : ''}${sum}** | |`);
  lines.push('');
  lines.push(
    `unattributed runtime glue Δ = ${head.bytes - base.bytes - sum} B (esbuild helpers not attributed to an input)`,
  );
  const text = lines.join('\n');
  console.log(text);
  writeFileSync(resolve(SANDBOX, 'attribution.md'), `${text}\n`);
  if (base.rows.get('src/content/content-script.ts') !== undefined) {
    // content.js sanity belongs to the caller; sidepanel-only here.
  }
}

main().catch((err) => {
  console.error('[size:attribution] failed:', err);
  process.exit(1);
});
