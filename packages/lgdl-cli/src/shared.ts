/**
 * Shared utilities for LGDL CLI commands.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import {
  parseLgdl,
  validate,
  serializeLgdl,
  type LgdlDocument,
  type MutationResult,
} from '@lgdl/lgdl-core';

/** Load + parse + validate a document file; exits on error. */
export function loadDocument(file: string): LgdlDocument {
  if (!existsSync(file)) {
    console.error(`Error: file not found: ${file}`);
    process.exit(1);
  }
  const src = readFileSync(file, 'utf8');
  const result = parseLgdl(src);
  for (const issue of result.issues) {
    console.error(`${issue.severity === 'error' ? '✖' : '⚠'} [${issue.location ?? 'doc'}] ${issue.message}`);
  }
  if (!result.valid) {
    console.error(`Error: "${file}" is invalid (${result.issues.filter((i) => i.severity === 'error').length} errors)`);
    process.exit(1);
  }
  return result.document;
}

/**
 * Common incremental-edit pattern: load -> mutate -> re-validate -> save.
 * Used by every add-node / remove-node / update-node command.
 */
export function mutate(
  file: string,
  fn: (doc: LgdlDocument) => MutationResult,
): void {
  if (!existsSync(file)) {
    console.error(`✖ file not found: ${file} (run "lgdl-cli init --file ${file}" first)`);
    process.exit(1);
  }
  const src = readFileSync(file, 'utf8');
  const commentsBefore = (src.match(/^[ \t]*#.*$/gm) ?? []).length;
  const doc = loadDocument(file);
  try {
    const { document, summary } = fn(doc);
    const res = validate(document);
    if (!res.valid) {
      console.error(`✖ mutation rejected: ${res.issues.map((i) => i.message).join('; ')}`);
      process.exit(1);
    }
    const text = serializeLgdl(document);
    const commentsAfter = (text.match(/^[ \t]*#.*$/gm) ?? []).length;
    if (commentsAfter < commentsBefore) {
      console.error(`⚠ ${commentsBefore - commentsAfter} comment line(s) were dropped (the serializer rewrites the file)`);
    }
    writeFileSync(file, text, 'utf8');
    console.log(`✓ ${summary}`);
    console.log(`  (saved ${file})`);
  } catch (err) {
    console.error(`✖ ${(err as Error).message}`);
    process.exit(1);
  }
}

/** commander option collector: accumulate repeated --attrs into an array */
export function collect(value: string, previous: string[]): string[] {
  return [...(previous ?? []), value];
}
