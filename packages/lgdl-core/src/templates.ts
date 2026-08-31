/**
 * 内置文档模板：lgdl-cli 的 init 与 lgdl-web-cli 的 init 共用。
 * init 支持 --type 指定图类型，每种类型给出语义合适的起始骨架。
 */
import { DIAGRAM_TYPES } from './types.js';

/** 默认初始化文档（flowchart + start 节点）。 */
export function initTemplate(): string {
  return `type: flowchart

nodes:
  - id: start
    label: 开始
    kind: start
`;
}

/**
 * 按图类型生成初始文档骨架（含该类型的语义起点，AI 在此基础上增量扩展）。
 * 不支持的 type 返回 null（调用方应报错并提示可用类型）。
 */
export function templateForType(type: string): string | null {
  switch (type) {
    case 'flowchart':
      return initTemplate();
    case 'mindmap':
      return `type: mindmap

nodes:
  - id: root
    label: 主题
    kind: process
`;
    case 'uml-class':
      return `type: uml-class

nodes:
`;
    case 'arch':
      return `type: arch

nodes:
`;
    case 'datastream':
      return `type: datastream

nodes:
`;
    case 'sequence':
      return `type: sequence

nodes:
`;
    case 'er':
      return `type: er

nodes:
`;
    case 'state':
      return `type: state

nodes:
  - id: start
    label: 初始
    kind: start
`;
    case 'gantt':
      return `type: gantt

nodes:
`;
    default:
      return null;
  }
}

/** 支持的图类型（供 init --type 校验）。 */
export function supportedTemplateTypes(): readonly string[] {
  return DIAGRAM_TYPES;
}
