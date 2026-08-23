/**
 * 内置文档模板：lgdl-cli 的 init 与 lgdl-web-cli 的 init 共用。
 */

/** 默认初始化文档（flowchart + start 节点）。 */
export function initTemplate(): string {
  return `type: flowchart

nodes:
  - id: start
    label: 开始
    kind: start
`;
}

/** 按图类型生成空文档骨架（未来扩展用）。 */
export function emptyDocumentTemplate(type = 'flowchart'): string {
  return `type: ${type}

nodes:
`;
}
