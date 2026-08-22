import { writeFileSync, existsSync } from 'node:fs';
import type { Command } from 'commander';
import type { LgdlCommand } from '../registry.js';

export const initCommand: LgdlCommand = {
  name: 'init',
  description: 'initialize an empty diagram file',
  register(program: Command) {
    program
      .command('init <file>')
      .description('initialize an empty diagram file')
      .action((file: string) => {
        if (existsSync(file)) {
          console.error(`Error: file already exists: ${file}`);
          process.exit(1);
        }
        const template = `# LGDL diagram
type: flowchart

nodes:
  - id: start
    label: 开始
    kind: start
`;
        writeFileSync(file, template, 'utf8');
        console.log(`✓ initialized ${file}`);
      });
  },
};
