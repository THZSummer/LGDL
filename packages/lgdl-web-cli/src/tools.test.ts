import { test } from 'node:test';
import assert from 'node:assert/strict';
import { WEB_CLI_TOOL } from './tools.js';

test('WEB_CLI_TOOL: exposes lgdl-web-cli function schema', () => {
  assert.equal(WEB_CLI_TOOL.function.name, 'lgdl-web-cli');
  const props = WEB_CLI_TOOL.function.parameters.properties as Record<string, unknown>;
  assert.ok(props.subcommand);
  assert.ok(props.args);
  // fetch-doc 已从 lgdl-web-cli 移除（web 获取是独立基础工具 web-fetch）
  const enumList = (props.subcommand as { enum: string[] }).enum;
  assert.ok(!enumList.includes('fetch-doc'));
  assert.ok(enumList.includes('list-diagram-types'));
  assert.ok(enumList.includes('help'));
});
