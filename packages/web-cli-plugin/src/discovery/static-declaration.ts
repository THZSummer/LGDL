/**
 * Static declaration parsing (discovery channels ① well-known + ② HTML marker).
 *
 * - ① `GET <origin>/.well-known/web-cli.json`
 * - ② `<link rel="web-cli" href="…">` or `<meta name="web-cli" content="…">`
 *
 * Relative hrefs are resolved to absolute URLs against the page URL so
 * sub-path deployments (a site served under a base path, e.g. project pages)
 * work (FR-010).
 * Pure logic: node-testable, no chrome/DOM/site-private dependency.
 */
export const WELL_KNOWN_PATH = '/.well-known/web-cli.json';
export const HTML_LINK_REL = 'web-cli';
export const HTML_META_NAME = 'web-cli';

/** Absolute URL of the well-known declaration for an origin. */
export function wellKnownUrl(origin: string): string {
  return `${origin.replace(/\/+$/, '')}${WELL_KNOWN_PATH}`;
}

/**
 * Resolve a declaration href to an absolute URL.
 * Relative hrefs resolve against `baseUrl` (page URL); invalid → null.
 */
export function resolveDeclarationHref(href: string, baseUrl: string): string | null {
  const trimmed = href.trim();
  if (!trimmed) return null;
  try {
    return new URL(trimmed, baseUrl).toString();
  } catch {
    return null;
  }
}

function extractAttr(tag: string, attr: string): string | null {
  const re = new RegExp(`${attr}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s"'>]+))`, 'i');
  const m = re.exec(tag);
  if (!m) return null;
  return (m[2] ?? m[3] ?? m[4] ?? '').trim();
}

/**
 * Extract the web-cli declaration URL from HTML markup.
 * Prefers `<link rel="web-cli">`, then `<meta name="web-cli">`.
 * Returns an absolute URL (resolved against `pageUrl`) or null when absent/invalid.
 */
export function parseHtmlDeclaration(html: string, pageUrl: string): string | null {
  // <link rel="web-cli" href="…">
  const linkTags = html.match(/<link\b[^>]*>/gi) ?? [];
  for (const tag of linkTags) {
    const rel = extractAttr(tag, 'rel');
    if (!rel) continue;
    const relTokens = rel.toLowerCase().split(/\s+/);
    if (!relTokens.includes(HTML_LINK_REL)) continue;
    const href = extractAttr(tag, 'href');
    if (href) {
      const resolved = resolveDeclarationHref(href, pageUrl);
      if (resolved) return resolved;
    }
  }
  // <meta name="web-cli" content="…">
  const metaTags = html.match(/<meta\b[^>]*>/gi) ?? [];
  for (const tag of metaTags) {
    const name = extractAttr(tag, 'name');
    if (!name || name.toLowerCase() !== HTML_META_NAME) continue;
    const content = extractAttr(tag, 'content');
    if (content) {
      const resolved = resolveDeclarationHref(content, pageUrl);
      if (resolved) return resolved;
    }
  }
  return null;
}
