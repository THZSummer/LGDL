/**
 * lgdl-web-op-cli function 定义（UI 操作工具，F-13 ② 自 web/provider.ts 迁出）。
 *
 * name/description 逐字节保留；parameters.enum 由 OP_SUBCOMMANDS 派生
 * （OP_COMMANDS 定义顺序 = 迁移前 WEB_OP_ENTRIES 顺序 → schema 逐字节不变，
 * ADR-008/R13 兜底）。
 */
import { OP_SUBCOMMANDS } from './ops.js';

/** lgdl-web-op-cli function 定义（UI 操作，与用户手动点击等效）。 */
export const WEB_OP_TOOL: {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
} = {
  type: 'function',
  function: {
    name: 'lgdl-web-op-cli',
    description:
      'Perform a UI operation on the web workbench, equivalent to the user clicking the button manually. ' +
      'Subcommands: copy-source / toggle-editor / collapse-editor / expand-editor / export-svg / export-png / ' +
      'preview-zoom (--factor, or --direction + --delta, --anchorX, --anchorY) / preview-pan (--dx, --dy) / preview-reset / ' +
      'preview-fullscreen (preview immersive mode: --state on to enter / --state off to exit / no arg toggles; hides editor/AI/statusbar; Esc or click ✕ to exit) / ' +
      'page-fullscreen (full-page browser fullscreen via the Fullscreen API: --state on to enter / --state off to exit / no arg toggles; the whole workbench fills the system screen; Esc exits; layout unchanged) / ' +
      'preview-click (--loc, e.g. "nodes[3]") / preview-hover (--loc) / switch-example (--id) / list-examples / list-diagram-types / ' +
      'next-actions (--actions = JSON string array of {label, prompt}; shows clickable suggestion chips in the chat, ' +
      'each chip sends its prompt to the AI when clicked) / help (--topic to show one operation\'s usage). ' +
      'Effects are identical to manual UI interaction (e.g. preview-click jumps to the element in the editor). ' +
      'NOT SURE about an operation or its args? Use subcommand "help" with {"topic":"<op>"}. ' +
      'NOTE: there is NO apply-source command — never write LGDL source directly; edit the diagram via lgdl-web-cli incremental commands only.',
    parameters: {
      type: 'object',
      properties: {
        subcommand: {
          type: 'string',
          enum: OP_SUBCOMMANDS,
        },
        args: {
          type: 'object',
          description:
            'Operation arguments as --key value pairs (keys without leading dashes), e.g. ' +
            'preview-zoom: --factor 1.2 or --direction 1 --delta 200; ' +
            'preview-pan: --dx 100 --dy 0; preview-click: --loc nodes[3]; preview-hover: --loc nodes[3] or --loc none to clear; ' +
            'switch-example: --id ecommerce-flow; preview-fullscreen / page-fullscreen: --state on|off (optional; default no arg = toggle); list-examples / list-diagram-types: no args; ' +
            'next-actions: --actions \'[{"label":"增加配色分组","prompt":"给当前图增加配色分组"}]\' (2-4 suggested next steps).',
          additionalProperties: true,
        },
      },
      required: ['subcommand'],
    },
  },
};
