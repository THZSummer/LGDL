import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderSvg } from './index.js';
import type { LgdlDocument } from '@lgdl/core';
import type { LayoutResult } from '@lgdl/layout';

function svgGroups(svg: string): string[] {
  // labels of lgdl-group elements in document (draw) order
  const re = /class="lgdl-group"[^>]*>.*?<text[^>]*>([^<]+)<\/text><\/g>/g;
  return [...svg.matchAll(re)].map((m) => m[1]);
}

test('renderSvg draws outer group boxes before inner ones (nested visible)', () => {
  const doc: LgdlDocument = {
    type: 'flowchart',
    nodes: [
      { id: 'start', label: '开始' },
      { id: 'login', label: '登录' },
      { id: 'verify', label: '校验' },
    ],
    edges: [
      { from: 'start', to: 'login' },
      { from: 'login', to: 'verify' },
    ],
    groups: [
      { id: 'auth', label: '认证模块', contains: ['login'] },
      { id: 'frontend', label: '前端层', contains: ['start', 'auth'] },
      { id: 'backend', label: '后端层', contains: ['verify'] },
    ],
  };
  const layout: LayoutResult = {
    nodes: [
      { id: 'start', x: 60, y: 40, width: 120, height: 48 },
      { id: 'login', x: 80, y: 180, width: 120, height: 56 },
      { id: 'verify', x: 90, y: 380, width: 140, height: 80 },
    ],
    edges: [],
    width: 400,
    height: 500,
  };
  const svg = renderSvg(doc, layout);
  const order = svgGroups(svg);
  // outer groups must be drawn first (bottom layer), inner group on top
  assert.ok(order.indexOf('前端层') < order.indexOf('认证模块'), `outer before inner: ${order.join(' -> ')}`);
  assert.equal(order.length, 3);
});
