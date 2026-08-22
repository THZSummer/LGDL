import { writeFileSync } from 'node:fs';
import type { Command } from 'commander';
import type { LgdlCommand } from '../registry.js';
import { loadDocument } from '../shared.js';
import { exportMermaid } from '@lgdl/core';

export const exportMermaidCommand: LgdlCommand = {
  name: 'export-mermaid',
  description: 'export a diagram to Mermaid syntax',
  register(program: Command) {
    program
      .command('export-mermaid <file>')
      .description('export a diagram to Mermaid syntax (stdout or file)')
      .option('-o, --output <file>', 'output file (default: stdout)')
      .action((file: string, opts: { output?: string }) => {
        const doc = loadDocument(file);
        const mermaid = exportMermaid(doc);
        if (opts.output) {
          writeFileSync(opts.output, mermaid + '\n', 'utf8');
          console.log(`✓ exported ${file} -> ${opts.output} (${doc.type})`);
        } else {
          console.log(mermaid);
        }
      });
  },
};
