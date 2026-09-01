/**
 * function-calling 工具定义（tools schema）。
 *
 * （自 @lgdl/web-cli-base tools.ts 迁入，WEB_CLI_TOOL 逐字节零改动——
 * name/description/parameters 与迁移前一致，FR-004/AC-007。）
 */

/** lgdl-web-cli function 定义（图内容操作命令工具）。 */
export const WEB_CLI_TOOL: {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
} = {
  type: 'function',
  function: {
    name: 'lgdl-web-cli',
    description:
      'Execute an lgdl-web-cli command on the current editor document. ' +
      'Subcommands: status / validate / init / convert / add-node / remove-node / update-node / add-edge / remove-edge / update-edge / doc-info / get-node / get-edge / find-node / list-node-kinds / list-diagram-types / help. ' +
      'Groups are nodes (kind=group): create a group with add-node --kind group --contains a,b; remove with remove-node; add/remove members with update-node --contains-add / --contains-remove. ' +
      '--doc is implied (always the current document). Args use --key value style, e.g. lgdl-web-cli add-node --id user --label 用户 ' +
      '(JSON: {"subcommand":"add-node","args":{"id":"user","label":"用户"}}). ' +
      'NOT SURE about a command or its args? Use subcommand "help" with {"topic":"<cmd>"} — e.g. {"subcommand":"help","args":{"topic":"add-node"}} ' +
      '(CLI equivalent: lgdl-web-cli add-node --help; top-level: lgdl-web-cli --help). Do not guess.',
    parameters: {
      type: 'object',
      properties: {
        subcommand: {
          type: 'string',
          enum: [
            'status', 'validate', 'init', 'convert',
            'add-node', 'remove-node', 'update-node',
            'add-edge', 'remove-edge', 'update-edge',
            'doc-info', 'get-node', 'get-edge', 'find-node',
            'list-node-kinds', 'list-diagram-types',
            'help',
          ],
        },
        args: {
          type: 'object',
          description: 'Command arguments as --key value pairs (keys without the leading dashes, e.g. --id x --label 用户); help subcommand takes {"topic":"<cmd>"} to show a single command\'s usage.',
          additionalProperties: true,
        },
      },
      required: ['subcommand'],
    },
  },
};
