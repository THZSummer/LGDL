// @ts-check
/**
 * web-cli-plugin build (ADR-009): esbuild bundle + static asset copy.
 *
 * - background service worker → ESM (MV3 "type":"module")
 * - content script → IIFE (MV3 content scripts cannot use ESM)
 * - side panel / options → IIFE (extension pages, loaded from HTML <script>)
 *
 * `node:*` dynamic imports pulled in transitively by the LLM SDKs are stubbed:
 * they live on non-executed browser paths and must not break the bundle.
 */
import { build } from 'esbuild';
import { mkdir, copyFile, rm } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const dist = resolve(root, 'dist');

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

/** Build stamp (TASK-019): one timestamp per build, injected into every bundle
 *  so the diagnostics panel can prove which build a context is actually running. */
const BUILD_STAMP = new Date().toISOString();

const common = {
  bundle: true,
  platform: 'browser',
  target: 'chrome114',
  logLevel: 'info',
  plugins: [nodeStubPlugin],
  define: { 'process.env.NODE_ENV': '"production"', __BUILD_STAMP__: JSON.stringify(BUILD_STAMP) },
};

async function main() {
  await rm(dist, { recursive: true, force: true });
  await mkdir(dist, { recursive: true });

  await build({
    ...common,
    entryPoints: [resolve(root, 'src/background/service-worker.ts')],
    outfile: resolve(dist, 'background.js'),
    format: 'esm',
  });

  await build({
    ...common,
    entryPoints: [resolve(root, 'src/content/content-script.ts')],
    outfile: resolve(dist, 'content.js'),
    format: 'iife',
  });

  await build({
    ...common,
    entryPoints: [resolve(root, 'src/ui/sidepanel/sidepanel.ts')],
    outfile: resolve(dist, 'sidepanel.js'),
    format: 'iife',
  });

  await build({
    ...common,
    entryPoints: [resolve(root, 'src/ui/options/options.ts')],
    outfile: resolve(dist, 'options.js'),
    format: 'iife',
  });

  await copyFile(resolve(root, 'manifest.json'), resolve(dist, 'manifest.json'));
  await copyFile(resolve(root, 'src/ui/sidepanel/index.html'), resolve(dist, 'sidepanel.html'));
  await copyFile(resolve(root, 'src/ui/options/index.html'), resolve(dist, 'options.html'));

  console.log(`[web-cli-plugin] build complete → dist/ (build stamp ${BUILD_STAMP})`);
}

main().catch((err) => {
  console.error('[web-cli-plugin] build failed:', err);
  process.exit(1);
});
