import { test } from 'node:test';
import assert from 'node:assert/strict';
import { WEB_OP_TOOL } from './tool.js';

test('WEB_OP_TOOL: exposes lgdl-web-op-cli with next-actions and help', () => {
  const props = (WEB_OP_TOOL.function.parameters.properties as Record<string, unknown>).subcommand as { enum: string[] };
  assert.ok(props.enum.includes('preview-zoom'));
  assert.ok(props.enum.includes('next-actions'));
  assert.ok(props.enum.includes('help'));
});
