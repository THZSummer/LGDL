/**
 * Extension-page clipboard worker (FR-055 / TASK-039).
 *
 * The service worker cannot read or write the clipboard: MV3 exposes no host
 * clipboard API and `navigator.clipboard` is undefined there (verified
 * 2026-09-13). The `clipboard` tool therefore forwards `clipboard-op` to an
 * **extension page** (the side panel, or the options page when it is the open
 * extension surface), which performs the op under the granted `clipboardRead` /
 * `clipboardWrite` permissions and answers via `sendResponse`.
 *
 * The preferred path is the async Clipboard API (prompt-free with the
 * permissions granted); a failing/absent API falls back to
 * `document.execCommand`, which also works in extension pages. The returned
 * `path` is reported honestly in the tool output. Clipboard content is returned
 * to the caller only — it is never logged and the caller audits lengths only.
 */
import type { PluginMessage, PluginResponse } from '../background/messaging.js';

/** Result of one extension-page clipboard operation. */
export interface ClipboardOpResult {
  ok: boolean;
  text?: string;
  chars?: number;
  path?: string;
  error?: string;
}

/** Payload of a forwarded `clipboard-op` message. */
export interface ClipboardOpPayload {
  op: 'read' | 'write';
  text?: string;
}

/** Fields a `clipboard-op` message carries (narrowed from `PluginMessage`). */
export function clipboardOpOf(raw: unknown): ClipboardOpPayload | undefined {
  if (typeof raw !== 'object' || raw === null) return undefined;
  const msg = raw as PluginMessage;
  if (msg.kind !== 'clipboard-op') return undefined;
  return { op: msg.op === 'write' ? 'write' : 'read', ...(typeof msg.text === 'string' ? { text: msg.text } : {}) };
}

/**
 * Legacy `document.execCommand` fallback — still valid in extension pages
 * holding `clipboardRead`/`clipboardWrite` when the async Clipboard API is
 * unavailable or rejects (e.g. the document is not focused).
 */
export function execCommandClipboard(op: 'read' | 'write', text: string): ClipboardOpResult {
  try {
    const ta = document.createElement('textarea');
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    if (op === 'write') ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    const ok = op === 'write' ? document.execCommand('copy') : document.execCommand('paste');
    const value = ta.value;
    document.body.removeChild(ta);
    if (!ok) {
      return { ok: false, error: `document.execCommand('${op === 'write' ? 'copy' : 'paste'}') 返回 false` };
    }
    return op === 'write'
      ? { ok: true, chars: text.length, path: 'document.execCommand(copy)' }
      : { ok: true, text: value, chars: value.length, path: 'document.execCommand(paste)' };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Perform ONE clipboard text op in the current extension page. See the module
 * docblock for the path policy; the returned `path` is reported honestly.
 */
export async function performClipboardOp(op: 'read' | 'write', text: string): Promise<ClipboardOpResult> {
  const nav = navigator as Navigator & {
    clipboard?: { readText?(): Promise<string>; writeText?(t: string): Promise<void> };
  };
  const clip = nav.clipboard;
  if (clip) {
    try {
      if (op === 'write') {
        if (typeof clip.writeText !== 'function') throw new Error('navigator.clipboard.writeText 不可用');
        await clip.writeText(text);
        return { ok: true, chars: text.length, path: 'navigator.clipboard' };
      }
      if (typeof clip.readText !== 'function') throw new Error('navigator.clipboard.readText 不可用');
      const value = await clip.readText();
      return { ok: true, text: value, chars: value.length, path: 'navigator.clipboard' };
    } catch (err) {
      const viaExec = execCommandClipboard(op, text);
      if (viaExec.ok) return viaExec;
      const first = err instanceof Error ? err.message : String(err);
      return { ok: false, error: `${first}；回退 document.execCommand 亦失败：${viaExec.error ?? '未知原因'}` };
    }
  }
  return execCommandClipboard(op, text);
}

/**
 * Shared `onMessage` handler for forwarded `clipboard-op` requests. Returns
 * `true` (keeps the channel open) only for that kind; every other message is
 * ignored so the page's other listeners behave unchanged.
 */
export function handleClipboardOpMessage(
  raw: unknown,
  sendResponse: (response: PluginResponse<ClipboardOpResult>) => void,
): boolean {
  const payload = clipboardOpOf(raw);
  if (!payload) return false;
  void performClipboardOp(payload.op, payload.text ?? '').then((data) => {
    try {
      sendResponse({ ok: true, data });
    } catch {
      /* channel already closed — nothing to do (never throws into the loop) */
    }
  });
  return true;
}
