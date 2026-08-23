import { writeFileSync, existsSync } from 'node:fs';
import type { Command } from 'commander';
import type { LgdlCommand } from '../registry.js';

export const initCommand: LgdlCommand = {
  name: 'init',
  description: 'initialize a diagram file (with a default start node)',
  register(program: Command) {
    program
      .command('init')
      .description('initialize a diagram file (with a default start node)')
      .requiredOption('--file <file>', 'path to .lgdl file')
      .action((opts: { file: string }) => {
        if (existsSync(opts.file)) {
          console.error(`Error: file already exists: ${opts.file}`);
          process.exit(1);
        }
        const template = `type: flowchart

nodes:
  - id: start
    label: 开始
    kind: start
`;
        writeFileSync(opts.file, template, 'utf8');
        console.log(`✓ initialized ${opts.file} (flowchart with a default start node)`);
      });
  },
};
