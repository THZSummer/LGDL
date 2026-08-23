import type { Command } from 'commander';
import type { LgdlCommand } from '../registry.js';
import { loadDocument } from '../shared.js';
import { queryStatus, listNodeKinds, queryDocInfo, queryNode, queryEdge, findNodes } from '@lgdl/core';

/**
 * 只读查询命令（读多写少）：doc-info / list-node-kinds / get-node /
 * get-edge / find-node。业务逻辑全部复用 core/queries.ts——
 * 与 lgdl-web-cli 的读命令共享同一实现。
 */
export const docInfoCommand: LgdlCommand = {
  name: 'doc-info',
  description: 'print document overview (type/size/kind distribution)',
  examples: ['doc-info --file flow.lgdl'],
  register(program: Command) {
    program
      .command('doc-info')
      .description('print document overview (type/size/kind distribution)')
      .requiredOption('--file <file>', 'path to .lgdl file')
      .action((opts: { file: string }) => {
        const doc = loadDocument(opts.file);
        for (const line of queryDocInfo(doc)) console.log(line);
      });
  },
};

export const listNodeKindsCommand: LgdlCommand = {
  name: 'list-node-kinds',
  description: 'list all node kinds (AI-readable)',
  examples: ['list-node-kinds'],
  register(program: Command) {
    program
      .command('list-node-kinds')
      .description('list all node kinds (AI-readable)')
      .action(() => {
        console.log(listNodeKinds());
      });
  },
};

export const getNodeCommand: LgdlCommand = {
  name: 'get-node',
  description: 'print one node detail (members/attrs/groups)',
  examples: ['get-node --file flow.lgdl --id user'],
  register(program: Command) {
    program
      .command('get-node')
      .description('print one node detail (members/attrs/groups)')
      .requiredOption('--file <file>', 'path to .lgdl file')
      .requiredOption('--id <id>', 'node id')
      .action((opts: { file: string; id: string }) => {
        const doc = loadDocument(opts.file);
        const detail = queryNode(doc, opts.id);
        if (!detail) {
          console.error(`✖ node not found: ${opts.id} (use lgdl-cli status to list nodes)`);
          process.exit(1);
        }
        for (const line of detail) console.log(line);
      });
  },
};

export const getEdgeCommand: LgdlCommand = {
  name: 'get-edge',
  description: 'print edge(s) between from/to (optionally by label)',
  examples: ['get-edge --file flow.lgdl --from a --to b'],
  register(program: Command) {
    program
      .command('get-edge')
      .description('print edge(s) between from/to (optionally by label)')
      .requiredOption('--file <file>', 'path to .lgdl file')
      .option('--from <id>', 'source node/group id')
      .option('--to <id>', 'target node/group id')
      .option('--label <label>', 'filter by edge label')
      .action((opts: { file: string; from?: string; to?: string; label?: string }) => {
        const doc = loadDocument(opts.file);
        const detail = queryEdge(doc, opts.from, opts.to, opts.label);
        if (!detail) {
          console.error(`✖ edge not found: ${opts.from ?? '?'} -> ${opts.to ?? '?'}${opts.label ? ` [${opts.label}]` : ''}`);
          process.exit(1);
        }
        for (const line of detail) console.log(line);
      });
  },
};

export const findNodeCommand: LgdlCommand = {
  name: 'find-node',
  description: 'search nodes by label/id substring',
  examples: ['find-node --file flow.lgdl --label 用户'],
  register(program: Command) {
    program
      .command('find-node')
      .description('search nodes by label/id substring')
      .requiredOption('--file <file>', 'path to .lgdl file')
      .option('--label <text>', 'search label')
      .option('--q <text>', 'search query (alias for --label)')
      .action((opts: { file: string; label?: string; q?: string }) => {
        const q = opts.label ?? opts.q;
        if (!q) {
          console.error('✖ find-node needs --label or --q');
          process.exit(1);
        }
        const doc = loadDocument(opts.file);
        for (const line of findNodes(doc, q)) console.log(line);
      });
  },
};

/** status 重构为复用 core/queryStatus（此前内联格式化重复实现）。 */
export const statusCommand: LgdlCommand = {
  name: 'status',
  description: 'print the textual graph structure (AI-readable)',
  examples: ['status --file flow.lgdl'],
  register(program: Command) {
    program
      .command('status')
      .description('print the textual graph structure (AI-readable)')
      .requiredOption('--file <file>', 'path to .lgdl file')
      .action((opts: { file: string }) => {
        const doc = loadDocument(opts.file);
        console.log(queryStatus(doc));
      });
  },
};
