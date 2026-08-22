/**
 * Option value hints for friendly error messages.
 *
 * Commands register their choice-style options here so that a missing or
 * invalid value can be reported WITH the valid choices — no need to run
 * --help again.
 */
export const optionHints: Record<string, string[]> = {
  '--format': ['svg', 'ascii'],
  '--kind': [
    'start', 'end', 'process', 'decision',
    'entity', 'note', 'state', 'milestone',
  ],
};

/** Look up valid choices for an option flag (e.g. "--format"). */
export function hintFor(flag: string): string[] | undefined {
  // flag may come as "--format <format>" or "--format"; normalize
  const name = flag.split(/\s/)[0];
  return optionHints[name];
}
