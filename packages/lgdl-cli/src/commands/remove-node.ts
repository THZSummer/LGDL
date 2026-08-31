import type { Command } from 'commander';
import type { LgdlCommand } from '../registry.js';
import { mutate } from '../shared.js';
import { applyOperation, buildOperation } from '@lgdl/lgdl-web-cli';

export const removeNodeCommand: LgdlCommand = {
  name: 'remove-node',
  description: 'remove a node (auto-cleans attached edges)',
  examples: ['remove-node --file flow.lgdl --id user'],
  register(program: Command) {
    program
      .command('remove-node')
      .description('remove a node (auto-cleans attached edges)')
      .requiredOption('--file <file>', 'path to .lgdl file')
      .requiredOption('--id <id>', 'node id')
      .action((opts: { file: string; id: string }) => {
        mutate(opts.file, (doc) => { const op = buildOperation('remove-node', { id: opts.id }); return applyOperation(doc, op); });
      });
  },
};
