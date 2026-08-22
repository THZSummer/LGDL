/**
 * Generate examples/ artifacts from the single source of truth:
 * packages/web/src/examples.ts
 *
 * Produces: examples/<id>.lgdl (source), examples/<id>.svg (rendered),
 * examples/<id>.png (bitmap, requires @resvg/resvg-js).
 *
 * Usage:  node scripts/gen-examples.mjs
 * (PNG conversion needs `npm i @resvg/resvg-js --no-save` first; without
 * it the script still writes .lgdl and .svg files.)
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseLgdl } from '../packages/core/dist/index.js';
import { layoutDocument } from '../packages/layout/dist/index.js';
import { renderSvg } from '../packages/render/dist/index.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const ts = readFileSync(join(root, 'packages/web/src/examples.ts'), 'utf8');
const outDir = join(root, 'examples');
mkdirSync(outDir, { recursive: true });

// parse EXAMPLES entries: id / label / source (escaped string)
const re = /id: "([^"]+)",\s*label: "([^"]*)",\s*source: "((?:[^"\\]|\\.)*)"/g;
let m;
let count = 0;
while ((m = re.exec(ts))) {
  const [, id, , srcEsc] = m;
  const source = JSON.parse('"' + srcEsc + '"');
  const lgdlFile = join(outDir, `${id}.lgdl`);
  writeFileSync(lgdlFile, source);
  console.log(`✓ ${id}.lgdl`);

  const { document, valid, issues } = parseLgdl(source);
  if (!valid) {
    console.error(`  ✗ ${id}: 解析失败 — ${issues.map((i) => i.message).join('; ')}`);
    continue;
  }
  const svg = renderSvg(document, layoutDocument(document));
  writeFileSync(join(outDir, `${id}.svg`), svg);
  console.log(`  ✓ ${id}.svg (${svg.match(/width="([\d.]+)" height="([\d.]+)"/)?.[1]}x${svg.match(/height="([\d.]+)"/)?.[1]})`);

  // optional PNG
  try {
    const { Resvg } = await import('@resvg/resvg-js');
    const png = new Resvg(svg, { fitTo: { mode: 'width', value: 800 } }).render().asPng();
    writeFileSync(join(outDir, `${id}.png`), png);
    console.log(`  ✓ ${id}.png (${png.length} bytes)`);
  } catch {
    console.log(`  - ${id}.png 跳过（未安装 @resvg/resvg-js）`);
  }
  count++;
}
console.log(`\n完成：${count} 个示例从 examples.ts 生成`);
