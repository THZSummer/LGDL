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
      .command('export-mermaid')
      .description('export a diagram to Mermaid syntax (stdout or file)')
      .requiredOption('--file <file>', 'path to .lgdl file')
      .option('-o, --output <file>', 'output file (default: stdout)')
      .action((opts: { file: string; output?: string }) => {
        const doc = loadDocument(opts.file);
        const mermaid = exportMermaid(doc);
        if (opts.output) {
          writeFileSync(opts.output, mermaid + '\n', 'utf8');
          console.log(`✓ exported ${opts.file} -> ${opts.output} (${doc.type})`);
        } else {
          console.log(mermaid);
        }
      });
  },
};
