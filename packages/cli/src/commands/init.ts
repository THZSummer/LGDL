import { writeFileSync, existsSync } from 'node:fs';
import type { Command } from 'commander';
import type { LgdlCommand } from '../registry.js';
import { templateForType, supportedTemplateTypes } from '@lgdl/core';

export const initCommand: LgdlCommand = {
  name: 'init',
  description: 'initialize a diagram file with a typed skeleton',
  examples: ['init --file flow.lgdl --type er', 'init --file flow.lgdl'],
  register(program: Command) {
    program
      .command('init')
      .description('initialize a diagram file with a typed skeleton')
      .requiredOption('--file <file>', 'path to .lgdl file')
      .option('--type <type>', `diagram type (${supportedTemplateTypes().join('|')}; default flowchart)`)
      .action((opts: { file: string; type?: string }) => {
        if (existsSync(opts.file)) {
          console.error(`Error: file already exists: ${opts.file}`);
          process.exit(1);
        }
        const type = opts.type ?? 'flowchart';
        const tpl = templateForType(type);
        if (!tpl) {
          console.error(`✖ unsupported type "${type}" (supported: ${supportedTemplateTypes().join(', ')})`);
          process.exit(1);
        }
        writeFileSync(opts.file, tpl, 'utf8');
        console.log(`✓ initialized ${opts.file} (${type} skeleton)`);
      });
  },
};
