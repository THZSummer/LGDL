/**
 * function-calling 工具定义（tools schema，F-13 ② 纯化后）。
 *
 * 本文件仅含 3 个 base 内建中性工具 schema：
 *   - WEB_FETCH_TOOL（web-fetch：平台级 web 获取，中性名 ADR-007）
 *   - SLEEP_TOOL（sleep：通用时序等待，与 web-fetch 同级中性平台工具）
 *   - WEB_CLI_HELP_TOOL（web-cli-help：顶层工具发现，一览/详情由 CommandRouter 派生）
 * （lgdl-web-cli / lgdl-web-op-cli 业务工具 schema 随各自业务包，见其 tools.ts/tool.ts。）
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
      'Arguments go in the args object; args.path is REQUIRED — there is NO default path; ' +
      'omitting it fails with "missing --path". ' +
      'Example: {"args":{"path":"guide.md"}} (read a local guide file).',
    parameters: {
      type: 'object',
      properties: {
        args: {
          type: 'object',
          description: 'Arguments to the fetch. --path is REQUIRED — no default path.',
          properties: {
            path: {
              type: 'string',
              description:
                'URL or same-origin relative path to fetch, e.g. "guide.md" or "https://example.com/doc.md".',
            },
          },
          required: ['path'],
        },
      },
      required: ['args'],
    },
  },
};

/** sleep function 定义（通用时序原语，中性名，平台级能力）。 */
export const SLEEP_TOOL: {
  type: 'function';
  function: { name: string; description: string; parameters: Record<string, unknown> };
} = {
  type: 'function',
  function: {
    name: 'sleep',
    description:
      'Wait for a given duration before continuing — a generic timing primitive, independent of any CLI. ' +
      'Use it to introduce a delay between operations (e.g. page-fullscreen on → sleep → page-fullscreen off). ' +
      'Arguments go in the args object; exactly one of args.ms or args.seconds is REQUIRED; omitting both fails. ' +
      'Example: {"args":{"ms":"5000"}}',
    parameters: {
      type: 'object',
      properties: {
        args: {
          type: 'object',
          description: 'Arguments. Exactly one of ms or seconds is REQUIRED (omitting both errors).',
          properties: {
            ms: { type: 'string', description: 'Duration to wait in milliseconds, e.g. "5000".' },
            seconds: { type: 'string', description: 'Alternative: duration to wait in seconds.' },
          },
        },
      },
      required: ['args'],
    },
  },
};

/** web-cli-help function 定义（顶层工具发现，中性名）。 */
export const WEB_CLI_HELP_TOOL: {
  type: 'function';
  function: { name: string; description: string; parameters: Record<string, unknown> };
} = {
  type: 'function',
  function: {
    name: 'web-cli-help',
    description:
      'Discover the full set of CLI tools and their top-level commands (the tool "catalog"). ' +
      'Call with NO argument to list every available tool (name + one-line purpose); ' +
      "call with an args object {\"tool\":\"<name>\"} to see that tool's detail/help. " +
      'Example: {"args":{}} → list all tools; {"args":{"tool":"my-cli"}} → that tool\'s subcommands.',
    parameters: {
      type: 'object',
      properties: {
        args: {
          type: 'object',
          description:
            'Optional arguments. Omit to list ALL tools; provide {tool} to see one tool\'s detail.',
          properties: {
            tool: { type: 'string', description: 'Show detail/help for this specific tool name.' },
          },
        },
      },
    },
  },
};
