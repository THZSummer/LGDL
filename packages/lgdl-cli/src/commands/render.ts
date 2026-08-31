import { writeFileSync, existsSync } from 'node:fs';
import { dirname } from 'node:path';
import { Command, Option } from 'commander';
import type { LgdlCommand } from '../registry.js';
import { loadDocument } from '../shared.js';
import { layoutDocument } from '@lgdl/lgdl-layout';
import { renderSvg, renderAscii } from '@lgdl/lgdl-render';

export const renderCommand: LgdlCommand = {
  name: 'render',
  description: 'render a diagram to SVG or ASCII',
  examples: ['render --file flow.lgdl -o flow.svg', 'render --file flow.lgdl --format ascii'],
  register(program: Command) {
    program
      .command('render')
      .description('render a diagram to SVG (auto layout) or ASCII (--format ascii)')
      .requiredOption('--file <file>', 'path to .lgdl file')
      .option('-o, --output <file>', 'output file (default: out.svg)')
      .addOption(new Option('--format <format>', 'output format').choices(['svg', 'ascii']).default('svg'))
      .action(async (opts: { file: string; output?: string; format: string }) => {
        const doc = loadDocument(opts.file);
        if (opts.format === 'ascii') {
          if (doc.type === 'sequence') {
            console.error(`⚠ ascii output does not render sequence messages — use SVG or status`);
          } else if (['gantt', 'uml-class', 'er'].includes(doc.type)) {
            console.error(`⚠ ascii output shows topology only — members/start/duration are not rendered for ${doc.type}`);
          }
          // ascii ignores layout pixels; rank layout is internal
          const layout = await layoutDocument(doc);
          const ascii = renderAscii(doc, layout);
          if (opts.output) {
            const outDir = dirname(opts.output);
            if (outDir && !existsSync(outDir)) {
              console.error(`✖ output directory not found: ${outDir}`);
              process.exit(1);
            }
            if (existsSync(opts.output)) console.error(`⚠ overwriting existing file: ${opts.output}`);
            writeFileSync(opts.output, ascii + '\n', 'utf8');
            console.log(`✓ rendered ${opts.file} -> ${opts.output} (ascii, ${doc.nodes.length} nodes, ${doc.edges.length} edges)`);
          } else {
            console.log(ascii);
          }
          return;
        }
        if (doc.type === 'gantt') {
          for (const n of doc.nodes) {
            if (typeof n.attrs?.start !== 'number' || typeof n.attrs?.duration !== 'number') {
              console.error(`⚠ gantt node "${n.id}" lacks start/duration — rendered as a placeholder at day 0/1d`);
            }
          }
        }
        const layout = await layoutDocument(doc);
        const svg = renderSvg(doc, layout);
        const out = opts.output ?? 'out.svg';
        const outDir = dirname(out);
        if (outDir && !existsSync(outDir)) {
          console.error(`✖ output directory not found: ${outDir}`);
          process.exit(1);
        }
        if (existsSync(out)) console.error(`⚠ overwriting existing file: ${out}`);
        writeFileSync(out, svg, 'utf8');
        console.log(`✓ rendered ${opts.file} -> ${out} (${layout.width}x${layout.height}, ${doc.nodes.length} nodes, ${doc.edges.length} edges)`);
      });
  },
};
