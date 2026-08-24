/**
 * Render a single .lgdl file to .svg and .png (bitmap).
 * Used to reproduce/verify layout & render bugs on individual examples.
 *
 * Usage: node scripts/render-one.mjs path/to/file.lgdl
 *   - writes path/to/file.svg  (renderSvg)
 *   - writes path/to/file.png  (if @resvg/resvg-js installed; width 1600)
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseLgdl } from '../packages/core/dist/index.js';
import { layoutDocument } from '../packages/layout/dist/index.js';
import { renderSvg } from '../packages/render/dist/index.js';

const file = process.argv[2];
if (!file) {
  console.error('usage: node scripts/render-one.mjs <file.lgdl>');
  process.exit(1);
}
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const abs = file.startsWith('/') ? file : join(root, file);

const source = readFileSync(abs, 'utf8');
const { document, valid, issues } = parseLgdl(source);
if (!valid) {
  console.error(`✗ ${file}: 解析失败 — ${issues.map((i) => i.message).join('; ')}`);
  process.exit(1);
}

const svg = renderSvg(document, layoutDocument(document));
const svgFile = abs.replace(/\.lgdl$/, '.svg');
writeFileSync(svgFile, svg);
const dim = svg.match(/width="([\d.]+)" height="([\d.]+)"/);
console.log(`✓ ${svgFile} (${dim?.[1]}x${dim?.[2]})`);

try {
  const { Resvg } = await import('@resvg/resvg-js');
  const svgW = parseFloat(svg.match(/viewBox="0 0 ([\d.]+) /)?.[1] ?? '800');
  const targetW = Math.max(800, Math.ceil(svgW));
  const png = new Resvg(svg, { fitTo: { mode: 'width', value: targetW } }).render().asPng();
  const pngFile = abs.replace(/\.lgdl$/, '.png');
  writeFileSync(pngFile, png);
  console.log(`✓ ${pngFile} (${png.length} bytes, ${targetW}px)`);
} catch (e) {
  console.log(`- png 跳过（未安装 @resvg/resvg-js）: ${e.message}`);
}
