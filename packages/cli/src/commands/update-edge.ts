import type { Command } from 'commander';
import type { LgdlCommand } from '../registry.js';
import { mutate, collect } from '../shared.js';
import { applyOperation, buildOperation } from '@lgdl/core';

export const updateEdgeCommand: LgdlCommand = {
  name: 'update-edge',
  description: 'update an edge label/attrs',
  register(program: Command) {
    program
      .command('update-edge')
      .description('update an edge label/attrs')
      .requiredOption('--file <file>', 'path to .lgdl file')
      .requiredOption('--from <id>', 'source node id')
      .requiredOption('--to <id>', 'target node id')
      .option('--edge-label <label>', 'locate a specific parallel edge by its current label (required when several edges share from/to)')
      .option('--new-from <id>', 'rewrite the source endpoint (label/cardinality/attrs are preserved)')
      .option('--new-to <id>', 'rewrite the target endpoint (label/cardinality/attrs are preserved)')
      .option('--label <label>', 'new relationship name')
      .option('--cardinality-from <v>', 'new multiplicity at the source end')
      .option('--cardinality-to <v>', 'new multiplicity at the target end')
      .option('--attrs <key=value>', 'extension attribute (repeatable, merged)', collect)
      .action((opts: { file: string; from: string; to: string; edgeLabel?: string; newFrom?: string; newTo?: string; label?: string; cardinalityFrom?: string; cardinalityTo?: string; attrs?: string[] }) => {
        mutate(opts.file, (doc) => {
          const op = buildOperation('update-edge', {
            from: opts.from,
            to: opts.to,
            'edge-label': opts.edgeLabel,
            'new-from': opts.newFrom,
            'new-to': opts.newTo,
            label: opts.label,
            'cardinality-from': opts.cardinalityFrom,
            'cardinality-to': opts.cardinalityTo,
            attrs: opts.attrs?.join(','),
          });
          return applyOperation(doc, op);
        });
      });
  },
};
