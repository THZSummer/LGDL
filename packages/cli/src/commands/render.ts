import { writeFileSync } from 'node:fs';
import { Command, Option } from 'commander';
import type { LgdlCommand } from '../registry.js';
import { loadDocument } from '../shared.js';
import { layoutDocument } from '@lgdl/layout';
import { renderSvg, renderAscii } from '@lgdl/render';

export const renderCommand: LgdlCommand = {
  name: 'render',
  description: 'render a diagram to SVG or ASCII',
  register(program: Command) {
    program
      .command('render')
      .description('render a diagram to SVG (auto layout) or ASCII (--format ascii)')
      .requiredOption('--file <file>', 'path to .lgdl file')
      .option('-o, --output <file>', 'output file (default: out.svg)')
      .addOption(new Option('--format <format>', 'output format').choices(['svg', 'ascii']).default('svg'))
      .action((opts: { file: string; output?: string; format: string }) => {
        const doc = loadDocument(opts.file);
        if (opts.format === 'ascii') {
          // ascii ignores layout pixels; rank layout is internal
          const layout = layoutDocument(doc);
          const ascii = renderAscii(doc, layout);
          if (opts.output) {
            writeFileSync(opts.output, ascii + '\n', 'utf8');
            console.log(`✓ rendered ${opts.file} -> ${opts.output} (ascii, ${doc.nodes.length} nodes, ${doc.edges.length} edges)`);
          } else {
            console.log(ascii);
          }
          return;
        }
        const layout = layoutDocument(doc);
        const svg = renderSvg(doc, layout);
        const out = opts.output ?? 'out.svg';
        writeFileSync(out, svg, 'utf8');
        console.log(`✓ rendered ${opts.file} -> ${out} (${layout.width}x${layout.height}, ${doc.nodes.length} nodes, ${doc.edges.length} edges)`);
      });
  },
};
