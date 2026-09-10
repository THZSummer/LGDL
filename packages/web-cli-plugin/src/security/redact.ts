/**
 * Redaction helpers (FR-028 / EC-015 / NFR-001).
 *
 * Zero-fork reuse: the upstream `sensitive.ts` model is imported and re-exported
 * (never copied). All plugin log/audit/context paths must go through here so that
 * plaintext secrets never leave the extension.
 */
import { maskTextPayload, maskValue } from '@lgdl/web-cli-base';

export {
  maskValue,
  redactUrlQuery,
  isSensitiveHeader,
  maskHeaderValue,
  maskTextPayload,
  maskByMode,
  SENSITIVE_READ_NOTE,
  SENSITIVE_WRITE_NOTE,
} from '@lgdl/web-cli-base';

const SENSITIVE_KEY_RE = /(key|token|secret|password|passwd|pwd|authorization|auth|cookie|otp|card|credential|session)/i;

/** Mask a single argument value when its key looks sensitive. */
export function maskArgValue(key: string, value: string): string {
  if (SENSITIVE_KEY_RE.test(key)) return maskValue(value, key);
  return value;
}

/**
 * Build a readable, masked argument summary for confirmations/audit.
 * Values of sensitive-looking keys are masked; length is bounded.
 */
export function summarizeArgs(args: Record<string, string> | undefined, maxLen = 240): string {
  if (!args) return '';
  const parts = Object.entries(args).map(([k, v]) => `${k}=${maskArgValue(k, v)}`);
  const joined = parts.join(', ');
  return joined.length > maxLen ? `${joined.slice(0, maxLen)}…` : joined;
}

/** Mask free text before it enters logs/audit (default mask policy). */
export function redactText(text: string): string {
  return maskTextPayload(text);
}

/** Minimal shape carrying a raw `args` bag that may contain secrets. */
export interface RedactableRecord {
  args?: Record<string, string>;
  argsSummary?: string;
  [k: string]: unknown;
}

/** Return a copy of a record with `args` dropped and replaced by a masked summary. */
export function redactRecord<T extends RedactableRecord>(record: T): Omit<T, 'args'> & { argsSummary?: string } {
  const { args, ...rest } = record;
  return { ...rest, ...(args ? { argsSummary: summarizeArgs(args) } : {}) };
}
