/**
 * Shared utilities for LGDL CLI commands.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import {
  parseLgdl,
  validate,
  serializeLgdl,
  type LgdlDocument,
  type LgdlMember,
  type MutationResult,
} from '@lgdl/core';

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
  const doc = loadDocument(file);
  try {
    const { document, summary } = fn(doc);
    const res = validate(document);
    if (!res.valid) {
      console.error(`✖ mutation rejected: ${res.issues.map((i) => i.message).join('; ')}`);
      process.exit(1);
    }
    writeFileSync(file, serializeLgdl(document), 'utf8');
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

/**
 * Parse repeated --attrs key=value options into an attrs object.
 * Supports: --attrs start=0 --attrs duration=3 --attrs done=true --attrs name="a b"
 */
export function parseAttrs(values: string[] | undefined): Record<string, unknown> | undefined {
  if (!values || values.length === 0) return undefined;
  const attrs: Record<string, unknown> = {};
  for (const raw of values) {
    const eq = raw.indexOf('=');
    if (eq === -1) {
      console.error(`✖ invalid --attrs "${raw}" (expected key=value)`);
      process.exit(1);
    }
    const key = raw.slice(0, eq).trim();
    let value: unknown = raw.slice(eq + 1).trim();
    if (value === 'true') value = true;
    else if (value === 'false') value = false;
    else if (/^-?\d+$/.test(String(value))) value = parseInt(String(value), 10);
    else if (/^-?\d+\.\d+$/.test(String(value))) value = parseFloat(String(value));
    else if ((value as string).startsWith('"') && (value as string).endsWith('"')) {
      value = (value as string).slice(1, -1);
    }
    attrs[key] = value;
  }
  return attrs;
}

/** Split a comma-separated id list (for --contains). */
export function parseIdList(value: string | undefined): string[] | undefined {
  if (!value) return undefined;
  return value.split(',').map((s) => s.trim()).filter(Boolean);
}

/**
 * Parse one --member spec into a structured LgdlMember.
 * Fields are explicit key=value pairs; commas inside quotes are preserved:
 *   --member kind=attribute,name=items,type=list,visibility=private
 *   --member kind=method,name=checkout,params="(items: list)",visibility=public
 */
export function parseMember(raw: string): LgdlMember {
  const fields: Record<string, string> = {};
  let current = '';
  let inQuote = false;
  for (const ch of raw) {
    if (ch === '"') inQuote = !inQuote;
    if (ch === ',' && !inQuote) {
      const part = current.trim();
      if (part) {
        const eq = part.indexOf('=');
        if (eq === -1) {
          console.error(`✖ invalid member field "${part}" (expected key=value)`);
          process.exit(1);
        }
        fields[part.slice(0, eq).trim()] = part.slice(eq + 1).trim().replace(/^"(.*)"$/, '$1');
      }
      current = '';
    } else {
      current += ch;
    }
  }
  if (current.trim()) {
    const part = current.trim();
    const eq = part.indexOf('=');
    if (eq === -1) {
      console.error(`✖ invalid member field "${part}" (expected key=value)`);
      process.exit(1);
    }
    fields[part.slice(0, eq).trim()] = part.slice(eq + 1).trim().replace(/^"(.*)"$/, '$1');
  }

  if (!fields.kind || !fields.name) {
    console.error(`✖ member requires at least kind=... and name=... (got "${raw}")`);
    process.exit(1);
  }
  const member: LgdlMember = { kind: fields.kind as LgdlMember['kind'], name: fields.name };
  if (fields.visibility) member.visibility = fields.visibility as LgdlMember['visibility'];
  if (fields.type !== undefined) member.type = fields.type;
  if (fields.params !== undefined) member.params = fields.params;
  return member;
}
