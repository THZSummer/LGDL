import type { Command } from 'commander';
import type { LgdlCommand } from '../registry.js';
import { mutate, parseAttrs, collect } from '../shared.js';
import { addNode } from '@lgdl/core';

export const addNodeCommand: LgdlCommand = {
  name: 'add-node',
  description: 'add a node',
  register(program: Command) {
    program
      .command('add-node <file>')
      .description('add a node')
      .requiredOption('--id <id>', 'node id')
      .option('--label <label>', 'display label')
      .option('--kind <kind>', 'node kind (start|end|process|decision|entity|note|state|milestone)', 'process')
      .option('--group <group>', 'group id to place the node into')
      .option('--attrs <key=value>', 'extension attribute (repeatable, e.g. --attrs start=0 --attrs duration=3)', collect)
      .action((file: string, opts: { id: string; label?: string; kind: string; group?: string; attrs?: string[] }) => {
        mutate(file, (doc) =>
          addNode(doc, { id: opts.id, label: opts.label, kind: opts.kind as never, group: opts.group, attrs: parseAttrs(opts.attrs) }),
        );
      });
  },
};
