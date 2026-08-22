import type { Command } from 'commander';
import type { LgdlCommand } from '../registry.js';
import { mutate, parseAttrs, collect } from '../shared.js';
import { updateNode } from '@lgdl/core';

export const updateNodeCommand: LgdlCommand = {
  name: 'update-node',
  description: 'update a node label/kind/attrs',
  register(program: Command) {
    program
      .command('update-node <file>')
      .description('update a node label/kind/attrs')
      .requiredOption('--id <id>', 'node id')
      .option('--label <label>', 'new label')
      .option('--kind <kind>', 'new kind')
      .option('--attrs <key=value>', 'extension attribute (repeatable, merged)', collect)
      .action((file: string, opts: { id: string; label?: string; kind?: string; attrs?: string[] }) => {
        mutate(file, (doc) =>
          updateNode(doc, { id: opts.id, label: opts.label, kind: opts.kind as never, attrs: parseAttrs(opts.attrs) }),
        );
      });
  },
};
