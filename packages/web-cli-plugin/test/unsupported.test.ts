import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ATTRIBUTION_MAP,
  attributionHelpLines,
  unsupportedAttribution,
} from '@lgdl/web-cli-base';
import { capabilityFailure } from '../src/platform/unsupported.js';

test('unsupported: capabilityFailure translates an unreachable capability readably (FR-008)', () => {
  const err = new Error('permission denied');
  err.name = 'NotAllowedError';
  const t = capabilityFailure(err, '站点工具调用');
  assert.match(t.output, /不可用/);
  assert.match(t.output, /授权被拒绝/);
  assert.match(t.error, /站点工具调用/);

  const generic = capabilityFailure(new Error('network down'), '站点声明读取');
  assert.match(generic.output, /不可用/);
});

test('unsupported: upstream capability attribution is wired and queryable (FR-008 / FR-025)', () => {
  assert.equal(Object.prototype.hasOwnProperty.call(ATTRIBUTION_MAP, 'multi-tab-window'), true);
  assert.equal(Object.prototype.hasOwnProperty.call(ATTRIBUTION_MAP, 'not-a-capability'), false);
  assert.equal(Object.keys(ATTRIBUTION_MAP).length > 0, true);

  const u = unsupportedAttribution('multi-tab-window');
  assert.match(u.output, /不支持/);
  assert.match(u.output, /F-14/);
  assert.match(u.error, /multi-tab-window/);

  const lines = attributionHelpLines();
  assert.equal(lines.some((l) => l.includes('multi-tab-window')), true);
});
