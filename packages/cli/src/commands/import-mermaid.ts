import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import type { Command } from 'commander';
import type { LgdlCommand } from '../registry.js';
import { importMermaid, serializeLgdl } from '@lgdl/core';

export const importMermaidCommand: LgdlCommand = {
  name: 'import-mermaid',
  description: 'import Mermaid syntax into an LGDL file',
  register(program: Command) {
    program
      .command('import-mermaid')
      .description('import Mermaid syntax (.mmd or inline) into an LGDL file')
      .requiredOption('--file <file>', 'path to Mermaid source file')
      .requiredOption('--output <file>', 'output .lgdl file')
      .action((opts: { file: string; output: string }) => {
        if (!existsSync(opts.file)) {
          console.error(`Error: file not found: ${opts.file}`);
          process.exit(1);
        }
        const src = readFileSync(opts.file, 'utf8');
        const result = importMermaid(src);
        for (const issue of result.issues) {
          console.error(`${issue.severity === 'error' ? '✖' : '⚠'} [${issue.location ?? 'doc'}] ${issue.message}`);
        }
        if (!result.valid) {
          console.error(`Error: cannot import "${opts.file}" (${result.issues.filter((i) => i.severity === 'error').length} errors)`);
          process.exit(1);
        }
        writeFileSync(opts.output, serializeLgdl(result.document), 'utf8');
        console.log(`✓ imported ${opts.file} -> ${opts.output} (${result.document.type}, ${result.document.nodes.length} nodes, ${result.document.edges.length} edges)`);
      });
  },
};
