import { writeFileSync } from 'node:fs';
import type { Command } from 'commander';
import type { LgdlCommand } from '../registry.js';
import { loadDocument } from '../shared.js';
import { layoutDocument } from '@lgdl/layout';
import { renderSvg, renderAscii } from '@lgdl/render';

export const renderCommand: LgdlCommand = {
  name: 'render',
  description: 'render a diagram to SVG or ASCII',
  register(program: Command) {
    program
      .command('render <file>')
      .description('render a diagram to SVG (auto layout) or ASCII (--format ascii)')
      .option('-o, --output <file>', 'output file (default: out.svg)')
      .option('--format <format>', 'output format: svg | ascii', 'svg')
      .action((file: string, opts: { output?: string; format: string }) => {
        const doc = loadDocument(file);
        if (opts.format === 'ascii') {
          // ascii ignores layout pixels; rank layout is internal
          const layout = layoutDocument(doc);
          const ascii = renderAscii(doc, layout);
          if (opts.output) {
            writeFileSync(opts.output, ascii + '\n', 'utf8');
            console.log(`✓ rendered ${file} -> ${opts.output} (ascii, ${doc.nodes.length} nodes, ${doc.edges.length} edges)`);
          } else {
            console.log(ascii);
          }
          return;
        }
        const layout = layoutDocument(doc);
        const svg = renderSvg(doc, layout);
        const out = opts.output ?? 'out.svg';
        writeFileSync(out, svg, 'utf8');
        console.log(`✓ rendered ${file} -> ${out} (${layout.width}x${layout.height}, ${doc.nodes.length} nodes, ${doc.edges.length} edges)`);
      });
  },
};
