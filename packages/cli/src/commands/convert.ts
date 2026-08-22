import { writeFileSync } from 'node:fs';
import { Command, Option } from 'commander';
import type { LgdlCommand } from '../registry.js';
import { loadDocument } from '../shared.js';
import { convert, listFormats } from '@lgdl/core';

export const convertCommand: LgdlCommand = {
  name: 'convert',
  description: 'convert a diagram to another format (mermaid, ...)',
  register(program: Command) {
    const formats = listFormats();
    program
      .command('convert')
      .description(`convert a diagram to another format (available: ${formats.join(', ')})`)
      .requiredOption('--file <file>', 'path to .lgdl file')
      .addOption(new Option('--as <format>', 'output format').choices(formats).makeOptionMandatory())
      .option('-o, --output <file>', 'output file (default: stdout)')
      .action((opts: { file: string; as: string; output?: string }) => {
        const doc = loadDocument(opts.file);
        const out = convert(doc, opts.as);
        if (opts.output) {
          writeFileSync(opts.output, out + '\n', 'utf8');
          console.log(`✓ converted ${opts.file} -> ${opts.output} (${opts.as})`);
        } else {
          console.log(out);
        }
      });
  },
};
