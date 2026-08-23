import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname } from 'node:path';
import { Command, Option } from 'commander';
import type { LgdlCommand } from '../registry.js';
import { importMermaid, serializeLgdl, validate } from '@lgdl/core';

export const importCommand: LgdlCommand = {
  name: 'import',
  description: 'import a diagram from another format (mermaid, ...)',
  examples: ['import --file flow.mmd --from mermaid --output flow.lgdl'],
  register(program: Command) {
    program
      .command('import')
      .description('import a diagram from another format into LGDL')
      .requiredOption('--file <file>', 'path to source file')
      .addOption(new Option('--from <format>', 'source format').choices(['mermaid', 'json']).makeOptionMandatory())
      .requiredOption('--output <file>', 'output .lgdl file')
      .option('--force', 'overwrite an existing output file')
      .action((opts: { file: string; from: string; output: string; force?: boolean }) => {
        if (!existsSync(opts.file)) {
          console.error(`Error: file not found: ${opts.file}`);
          process.exit(1);
        }
        // never silently overwrite an existing file (same guard as init)
        if (existsSync(opts.output) && !opts.force) {
          console.error(`✖ output file already exists: ${opts.output} (refusing to overwrite; pass --force to replace it)`);
          process.exit(1);
        }
        const outDir = dirname(opts.output);
        if (outDir && !existsSync(outDir)) {
          console.error(`✖ output directory not found: ${outDir}`);
          process.exit(1);
        }
        const src = readFileSync(opts.file, 'utf8');

        let document;
        if (opts.from === 'json') {
          // LGDL's JSON form is a direct serialization of the document
          try {
            document = JSON.parse(src);
          } catch (err) {
            console.error(`✖ invalid JSON in ${opts.file}: ${(err as Error).message}`);
            process.exit(1);
          }
          if (typeof document !== 'object' || document === null) {
            console.error(`✖ invalid JSON document: expected an object`);
            process.exit(1);
          }
          if (typeof document.type !== 'string') {
            console.error(`✖ invalid JSON document: missing required field "type" (e.g. "flowchart")`);
            process.exit(1);
          }
          // optional keys default like the YAML parser does
          document.nodes ??= [];
          document.edges ??= [];
          document.groups ??= [];
          // explicit "kind: process" is the default and the serializer omits
          // it — tell the AI so a strict diff does not look like data loss
          const explicitDefault = (document.nodes ?? []).filter((n: { kind?: string }) => n?.kind === 'process').length;
          if (explicitDefault > 0) {
            console.error(`⚠ ${explicitDefault} node(s) carry explicit kind "process" — the serializer omits the default kind, the written file will not repeat it`);
          }
        } else if (opts.from === 'mermaid') {
          const result = importMermaid(src);
          for (const issue of result.issues) {
            console.error(`${issue.severity === 'error' ? '✖' : '⚠'} [${issue.location ?? 'doc'}] ${issue.message}`);
          }
          if (!result.valid) {
            console.error(`Error: cannot import "${opts.file}" (${result.issues.filter((i) => i.severity === 'error').length} errors)`);
            process.exit(1);
          }
          document = result.document;
        } else {
          console.error(`✖ unsupported import format: "${opts.from}"`);
          process.exit(1);
        }

        // validate the imported document before writing it out — an import
        // must never produce a .lgdl file that its own validator rejects
        const check = validate(document);
        if (!check.valid) {
          for (const issue of check.issues) {
            console.error(`${issue.severity === 'error' ? '✖' : '⚠'} [${issue.location ?? 'doc'}] ${issue.message}`);
          }
          console.error(`Error: imported document is invalid (${check.issues.filter((i) => i.severity === 'error').length} errors)`);
          process.exit(1);
        }

        writeFileSync(opts.output, serializeLgdl(document), 'utf8');
        console.log(`✓ imported ${opts.file} -> ${opts.output} (${document.type}, ${document.nodes.length} nodes, ${document.edges.length} edges)`);
      });
  },
};
