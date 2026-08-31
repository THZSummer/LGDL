/**
 * Option value hints for friendly error messages.
 *
 * Commands register their choice-style options here so that a missing or
 * invalid value can be reported WITH the valid choices — no need to run
 * --help again. Hints can be a static array or a function returning
 * dynamic choices (e.g. converter formats from the registry).
 */
import { listFormats } from '@lgdl/lgdl-core';

type Hint = string[] | (() => string[]);

const optionHints: Record<string, Hint> = {
  '--format': ['svg', 'ascii'],
  '--as': () => listFormats(), // converter formats (mermaid, plantuml, json, ...)
  '--from': ['mermaid'],
  '--kind': [
    'start', 'end', 'process', 'decision',
    'entity', 'note', 'state', 'milestone',
  ],
};

/** Look up valid choices for an option flag (e.g. "--format"). */
export function hintFor(flag: string): string[] | undefined {
  // flag may come as "--format <format>" or "--format"; normalize
  const name = flag.split(/\s/)[0];
  const hint = optionHints[name];
  if (!hint) return undefined;
  return typeof hint === 'function' ? hint() : hint;
}
