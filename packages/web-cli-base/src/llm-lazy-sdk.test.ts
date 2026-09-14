/**
 * 结构性门禁 — LLM SDK 必须**惰性加载**（2026-09-14 性能修复，作者授权）。
 *
 * ── 为什么需要这条门禁（防回潮）───────────────────────────────────────────────
 *
 * `src/llm.ts` 经 barrel `src/index.ts` re-export。只要它在**顶层**静态
 * `import` 两个重 SDK（`openai` / `@anthropic-ai/sdk`），任何只想从 barrel 拿一个
 * 小工具的消费方都会被**急切**拖入两个 SDK 求值：
 *   - `packages/lgdl-web/src/web-cli-host/bridge.ts`（只要 `createBrowserEventHub`）
 *     → dev 首屏 Vite 中途发现重依赖 → optimizeDeps → reload（「加载不出来」）；
 *   - `packages/web-cli-plugin/src/content/content-script.ts`（只要
 *     `createBrowserDomOps`）→ `dist/content.js` 被撑到 ~1.05 MiB，NFR-007 的
 *     64 KiB 注入体积目标被超 ≈16×（D31）。
 *
 * 修复 = 顶层改为 `import type`（编译后擦除）+ `chat()` 内 `await import(...)`。
 * 本文件把该结构**钉死为可执行断言**（只增不减；反证见文件末尾测试）。
 *
 * 断言层次：
 *   ① 源码 `src/llm.ts`：顶层无静态 SDK import（允许 `import type`），且确有
 *      函数内动态 `await import(...)`；
 *   ② 构建产物 `dist/llm.js`：无顶层静态 SDK import（有 dist 才断言，否则显式 skip）；
 *   ③ 求值模块图：从 `dist/index.js` 出发沿**静态**相对 import 闭包，任一可达模块
 *      都不得静态 import SDK（动态 import 不算——它不参与首次求值）。
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/** 两个重 SDK 的模块名（门禁对象）。 */
const SDK_MODULES = ['openai', '@anthropic-ai/sdk'] as const;
const SDK_ALTERNATION = 'openai|@anthropic-ai\\/sdk';

/**
 * 找出源码文本里的**顶层静态** SDK import/export-from 语句。
 *
 * 规则（`^[ \t]*` + `m`：只认**行首**真实语句，注释行/缩进正文不会被误判；
 * `[^'"]*?`：子句不跨引号，不会把上一条 import 与下一条连读）：
 *   - 命中 `import … from 'openai'` / `import 'openai'` / `export … from 'openai'`；
 *   - **不**命中 `import type … from 'openai'`（类型导入编译后擦除，允许）；
 *   - **不**命中 `await import('openai')`（动态导入不参与首次求值）。
 */
export function findStaticSdkImports(source: string): string[] {
  const patterns = [
    new RegExp(`^[ \\t]*import\\s+(?!type\\s)[^'"]*?from\\s*['"](?:${SDK_ALTERNATION})['"]`, 'gm'),
    new RegExp(`^[ \\t]*import\\s*['"](?:${SDK_ALTERNATION})['"]`, 'gm'),
    new RegExp(`^[ \\t]*export\\s+(?!type\\s)[^'"]*?from\\s*['"](?:${SDK_ALTERNATION})['"]`, 'gm'),
  ];
  const hits: string[] = [];
  for (const re of patterns) {
    for (const m of source.matchAll(re)) hits.push(m[0].trim());
  }
  return hits;
}

/** 找出源码文本里的**动态** import 目标（`await import('x')`）。 */
export function findDynamicImportTargets(source: string): string[] {
  const re = /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
  return [...source.matchAll(re)].map((m) => m[1]);
}

/** 静态相对依赖（`from './x.js'` / `import './x.js'`，不含动态 import）。 */
export function findStaticRelativeImports(source: string): string[] {
  const patterns = [
    /^[ \t]*import\s+(?!type\s)[^'"]*?from\s*['"](\.[^'"]+)['"]/gm,
    /^[ \t]*import\s*['"](\.[^'"]+)['"]/gm,
    /^[ \t]*export\s+(?!type\s)[^'"]*?from\s*['"](\.[^'"]+)['"]/gm,
  ];
  const out = new Set<string>();
  for (const re of patterns) {
    for (const m of source.matchAll(re)) out.add(m[1]);
  }
  return [...out];
}

export interface GraphViolation {
  /** 违规文件（绝对路径）。 */
  file: string;
  /** 违规语句原文。 */
  statement: string;
}

/**
 * 从 `entry` 出发沿静态相对 import 递归，收集所有**静态** SDK import 违规。
 *
 * 只走静态边：动态 `import()` 是惰性的、不参与首次求值（正是本门禁要保护的语义）。
 * `read` 可注入，便于反证测试喂合成模块（不触碰真实文件系统）。
 */
export function collectStaticSdkViolations(
  entry: string,
  read: (path: string) => string = (p) => readFileSync(p, 'utf8'),
): GraphViolation[] {
  const violations: GraphViolation[] = [];
  const seen = new Set<string>();
  const queue = [entry];
  while (queue.length > 0) {
    const file = queue.pop()!;
    if (seen.has(file)) continue;
    seen.add(file);
    let source: string;
    try {
      source = read(file);
    } catch (err) {
      if ((err as NodeJS.ErrnoException | undefined)?.code === 'ENOENT') continue;
      throw err;
    }
    for (const statement of findStaticSdkImports(source)) {
      violations.push({ file, statement });
    }
    for (const rel of findStaticRelativeImports(source)) {
      queue.push(resolve(dirname(file), rel));
    }
  }
  return violations;
}

const here = dirname(fileURLToPath(import.meta.url));
const srcDir = resolve(here, '..', 'src');
const distDir = resolve(here, '..', 'dist');

// ---------------------------------------------------------------------------
// ① 源码层：顶层无静态 SDK import（允许 import type）+ 确有函数内动态 import
// ---------------------------------------------------------------------------

test('lazy-sdk ①: src/llm.ts has NO top-level static SDK import', () => {
  const source = readFileSync(resolve(srcDir, 'llm.ts'), 'utf8');
  const staticHits = findStaticSdkImports(source);
  assert.deepEqual(
    staticHits,
    [],
    `src/llm.ts 顶层不得静态 import 重 SDK（会让 barrel 消费者急切加载）；命中：${staticHits.join(' | ')}`,
  );
});

test('lazy-sdk ①: src/llm.ts keeps type-only imports (erased) for the SDKs', () => {
  const source = readFileSync(resolve(srcDir, 'llm.ts'), 'utf8');
  for (const mod of SDK_MODULES) {
    assert.match(
      source,
      new RegExp(`import\\s+type\\s+\\w+\\s+from\\s+['"]${mod.replace('/', '\\/')}['"]`),
      `src/llm.ts 应保留 \`import type … from '${mod}'\`（类型擦除，零运行时求值）`,
    );
  }
});

test('lazy-sdk ①: src/llm.ts loads both SDKs via dynamic import inside functions', () => {
  const source = readFileSync(resolve(srcDir, 'llm.ts'), 'utf8');
  const targets = findDynamicImportTargets(source);
  for (const mod of SDK_MODULES) {
    assert.ok(
      targets.includes(mod),
      `src/llm.ts 必须通过 \`await import('${mod}')\` 按需加载；当前动态 import 目标：${targets.join(', ')}`,
    );
  }
});

test('lazy-sdk ① REVERSE PROOF: a synthetic static import IS detected', () => {
  assert.deepEqual(findStaticSdkImports(`import OpenAI from 'openai';`), [`import OpenAI from 'openai'`]);
  assert.deepEqual(findStaticSdkImports(`import Anthropic from '@anthropic-ai/sdk';`), [
    `import Anthropic from '@anthropic-ai/sdk'`,
  ]);
  assert.deepEqual(findStaticSdkImports(`import 'openai';`), [`import 'openai'`]);
  assert.deepEqual(findStaticSdkImports(`export { default } from 'openai';`), [
    `export { default } from 'openai'`,
  ]);
  // 允许形态：type-only 与动态 import 都不得被误报。
  assert.deepEqual(findStaticSdkImports(`import type OpenAI from 'openai';`), []);
  assert.deepEqual(findStaticSdkImports(`const m = await import('openai');`), []);
  assert.deepEqual(findStaticSdkImports(`import type Anthropic from '@anthropic-ai/sdk';`), []);
});

test('lazy-sdk ① REVERSE PROOF: the graph walker flags a reachable static SDK import', () => {
  const fake: Record<string, string> = {
    '/a/index.js': `export * from './llm.js';`,
    '/a/llm.js': `import OpenAI from 'openai';\nexport async function chat() { const m = await import('openai'); }`,
  };
  const violations = collectStaticSdkViolations('/a/index.js', (p) => {
    const text = fake[p];
    if (text === undefined) throw Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
    return text;
  });
  assert.equal(violations.length, 1, '沿静态边可达的 SDK 静态 import 必须被记为违规');
  assert.equal(violations[0].file, '/a/llm.js');
  assert.match(violations[0].statement, /from 'openai'/);

  // 反证：把同一模块改成惰性（type + 动态 import）后，违规必须消失。
  const lazy: Record<string, string> = {
    '/a/index.js': `export * from './llm.js';`,
    '/a/llm.js': `import type OpenAI from 'openai';\nexport async function chat() { const { default: O } = await import('openai'); return new O({}); }`,
  };
  assert.deepEqual(
    collectStaticSdkViolations('/a/index.js', (p) => {
      const text = lazy[p];
      if (text === undefined) throw Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
      return text;
    }),
    [],
    '惰性形态（type-only + 动态 import）不得被误报',
  );
});

// ---------------------------------------------------------------------------
// ② 构建产物层：dist/llm.js 无顶层静态 SDK import
// ---------------------------------------------------------------------------

test('lazy-sdk ②: dist/llm.js has NO top-level static SDK import (when built)', (t) => {
  let source: string;
  try {
    source = readFileSync(resolve(distDir, 'llm.js'), 'utf8');
  } catch (err) {
    if ((err as NodeJS.ErrnoException | undefined)?.code === 'ENOENT') {
      t.skip('dist/llm.js not present — run `npm run build` to assert the build artifact');
      return;
    }
    throw err;
  }
  const staticHits = findStaticSdkImports(source);
  assert.deepEqual(
    staticHits,
    [],
    `dist/llm.js 顶层不得静态 import 重 SDK（barrel 急切拉入的根因）；命中：${staticHits.join(' | ')}`,
  );
  // 正面证据：构建产物确实保留了惰性加载。
  const targets = findDynamicImportTargets(source);
  for (const mod of SDK_MODULES) {
    assert.ok(targets.includes(mod), `dist/llm.js 应保留 \`import('${mod}')\` 动态加载；实际：${targets.join(', ')}`);
  }
});

// ---------------------------------------------------------------------------
// ③ 求值模块图：dist/index.js 的静态闭包不得触达 SDK
// ---------------------------------------------------------------------------

test('lazy-sdk ③: dist/index.js static module graph does NOT eagerly reach the SDKs (when built)', (t) => {
  const entry = resolve(distDir, 'index.js');
  try {
    readFileSync(entry, 'utf8');
  } catch (err) {
    if ((err as NodeJS.ErrnoException | undefined)?.code === 'ENOENT') {
      t.skip('dist/index.js not present — run `npm run build` to assert the evaluation graph');
      return;
    }
    throw err;
  }
  const violations = collectStaticSdkViolations(entry);
  assert.deepEqual(
    violations,
    [],
    `从 dist/index.js 沿静态 import 可达的模块不得静态 import 重 SDK（否则 barrel 消费者被急切拖入）；` +
      `违规：${violations.map((v) => `${v.file} → ${v.statement}`).join(' | ')}`,
  );
});
