import { writeFileSync } from 'node:fs';
import type { Command } from 'commander';
import type { LgdlCommand } from '../registry.js';
import { loadDocument } from '../shared.js';
import { layoutDocument } from '@lgdl/layout';
import { renderSvg } from '@lgdl/render';

export const renderCommand: LgdlCommand = {
  name: 'render',
  description: 'render a diagram to SVG (auto layout)',
  register(program: Command) {
    program
      .command('render <file>')
      .description('render a diagram to SVG (auto layout)')
      .option('-o, --output <file>', 'output file', 'out.svg')
      .action((file: string, opts: { output: string }) => {
        const doc = loadDocument(file);
        const layout = layoutDocument(doc);
        const svg = renderSvg(doc, layout);
        writeFileSync(opts.output, svg, 'utf8');
        console.log(`✓ rendered ${file} -> ${opts.output} (${layout.width}x${layout.height}, ${doc.nodes.length} nodes, ${doc.edges.length} edges)`);
      });
  },
};
