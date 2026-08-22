import type { Command } from 'commander';
import type { LgdlCommand } from '../registry.js';
import { mutate, parseAttrs, collect } from '../shared.js';
import { addEdge } from '@lgdl/core';

export const addEdgeCommand: LgdlCommand = {
  name: 'add-edge',
  description: 'add an edge',
  register(program: Command) {
    program
      .command('add-edge')
      .description('add an edge')
      .requiredOption('--file <file>', 'path to .lgdl file')
      .requiredOption('--from <id>', 'source node id')
      .requiredOption('--to <id>', 'target node id')
      .option('--label <label>', 'relationship name (business semantics only)')
      .option('--cardinality-from <v>', 'multiplicity at the source end (e.g. "1", "*", "0..1")')
      .option('--cardinality-to <v>', 'multiplicity at the target end (e.g. "1", "*", "0..*")')
      .option('--attrs <key=value>', 'extension attribute (repeatable)', collect)
      .action((opts: { file: string; from: string; to: string; label?: string; cardinalityFrom?: string; cardinalityTo?: string; attrs?: string[] }) => {
        mutate(opts.file, (doc) =>
          addEdge(doc, { from: opts.from, to: opts.to, label: opts.label, cardinalityFrom: opts.cardinalityFrom, cardinalityTo: opts.cardinalityTo, attrs: parseAttrs(opts.attrs) }),
        );
      });
  },
};
