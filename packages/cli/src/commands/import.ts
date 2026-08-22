import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { Command, Option } from 'commander';
import type { LgdlCommand } from '../registry.js';
import { importMermaid, serializeLgdl } from '@lgdl/core';

export const importCommand: LgdlCommand = {
  name: 'import',
  description: 'import a diagram from another format (mermaid, ...)',
  register(program: Command) {
    program
      .command('import')
      .description('import a diagram from another format into LGDL')
      .requiredOption('--file <file>', 'path to source file')
      .addOption(new Option('--from <format>', 'source format').choices(['mermaid']).makeOptionMandatory())
      .requiredOption('--output <file>', 'output .lgdl file')
      .action((opts: { file: string; from: string; output: string }) => {
        if (!existsSync(opts.file)) {
          console.error(`Error: file not found: ${opts.file}`);
          process.exit(1);
        }
        const src = readFileSync(opts.file, 'utf8');

        let document;
        if (opts.from === 'mermaid') {
          const result = importMermaid(src);
          for (const issue of result.issues) {
            console.error(`${issue.severity === 'error' ? '✖' : '⚠'} [${issue.location ?? 'doc'}] ${issue.message}`);
          }
          if (!result.valid) {
            console.error(`Error: cannot import "${opts.file}" (${result.issues.filter((i) => i.severity === 'error').length} errors)`);
            process.exit(1);
          }
          document = result.document;
        } else {
          console.error(`✖ unsupported import format: "${opts.from}"`);
          process.exit(1);
        }

        writeFileSync(opts.output, serializeLgdl(document), 'utf8');
        console.log(`✓ imported ${opts.file} -> ${opts.output} (${document.type}, ${document.nodes.length} nodes, ${document.edges.length} edges)`);
      });
  },
};
