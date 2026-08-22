import { writeFileSync, existsSync } from 'node:fs';
import type { Command } from 'commander';
import type { LgdlCommand } from '../registry.js';

export const initCommand: LgdlCommand = {
  name: 'init',
  description: 'initialize an empty diagram file',
  register(program: Command) {
    program
      .command('init')
      .description('initialize an empty diagram file')
      .requiredOption('--file <file>', 'path to .lgdl file')
      .action((opts: { file: string }) => {
        if (existsSync(opts.file)) {
          console.error(`Error: file already exists: ${opts.file}`);
          process.exit(1);
        }
        const template = `# LGDL diagram
type: flowchart

nodes:
  - id: start
    label: 开始
    kind: start
`;
        writeFileSync(opts.file, template, 'utf8');
        console.log(`✓ initialized ${opts.file}`);
      });
  },
};
