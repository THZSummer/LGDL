/**
 * function-calling 工具定义（tools schema，F-13 ② 纯化后）。
 *
 * WEB_CLI_TOOL → web-cli 业务包（LGDL 业务工具随业务包）；
 * WEB_FETCH_TOOL 中性化改名 web-fetch 归位本包（ADR-007，平台级能力）。
 */

/** web-fetch function 定义（平台级基础工具，中性名）。 */
export const WEB_FETCH_TOOL: {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
} = {
  type: 'function',
  function: {
    name: 'web-fetch',
    description:
      'Fetch a web resource (same-origin relative path or full URL) and return its raw text. ' +
      'Base platform capability, independent of the diagram CLI tools. ' +
      'The path argument is REQUIRED — there is NO default path; omitting it fails with "missing --path". ' +
      'Example: web-fetch --path lgdl/web/workbench/README-CLI.md (read the workbench skill guide).',
    parameters: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description:
            'URL or same-origin relative path to fetch, e.g. "lgdl/web/workbench/README-CLI.md" or "https://example.com/doc.md".',
        },
      },
      required: ['path'],
    },
  },
};
