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

test('renderSvg draws aggregate edges between groups', () => {
  const doc: LgdlDocument = {
    type: 'flowchart',
    nodes: [
      { id: 'a', label: 'A' },
      { id: 'b', label: 'B' },
    ],
    edges: [{ from: 'g1', to: 'g2', label: '整体调用' }],
    groups: [
      { id: 'g1', label: '组一', contains: ['a'] },
      { id: 'g2', label: '组二', contains: ['b'] },
    ],
  };
  const layout: LayoutResult = {
    nodes: [
      { id: 'a', x: 60, y: 60, width: 120, height: 48 },
      { id: 'b', x: 80, y: 300, width: 120, height: 48 },
    ],
    edges: [],
    width: 400,
    height: 420,
  };
  const svg = renderSvg(doc, layout);
  assert.ok(svg.includes('lgdl-aggregate-edge'), 'aggregate edge element');
  assert.ok(svg.includes('整体调用'), 'aggregate edge label');
  // anchored on the group box boundaries (y between the two boxes, not inside)
  const m = svg.match(/<line x1="([\d.]+)" y1="([\d.]+)" x2="([\d.]+)" y2="([\d.]+)"/);
  assert.ok(m, 'line present');
  const y1 = parseFloat(m[2]);
  const y2 = parseFloat(m[4]);
  // source y ≈ bottom of g1 box (60+48+14=122); target end is pushed 8px
  // INTO the g2 box past its top border (300-14-24=262) so the arrowhead shows
  assert.ok(Math.abs(y1 - 122) < 5, `src on g1 bottom border, got ${y1}`);
  assert.ok(Math.abs(y2 - 270) < 5, `dst just inside g2 top border, got ${y2}`);
});

test('renderSvg renders uml-class cards from structured members', () => {
  const doc: LgdlDocument = {
    type: 'uml-class',
    nodes: [
      {
        id: 'cart',
        label: 'Cart',
        kind: 'entity',
        members: [
          { kind: 'attribute', name: 'items', type: 'list', visibility: 'private' },
          { kind: 'method', name: 'addItem', type: 'void', params: '(item)', visibility: 'public' },
        ],
      },
    ],
    edges: [],
    groups: [],
  };
  const layout: LayoutResult = {
    nodes: [{ id: 'cart', x: 40, y: 40, width: 220, height: 84 }],
    edges: [],
    width: 300,
    height: 200,
  };
  const svg = renderSvg(doc, layout);
  // header (bold class name) + explicit member rows — no text parsing involved
  assert.ok(svg.includes('>Cart</text>'), 'class name in header');
  assert.ok(svg.includes('- items: list'), 'private attribute row');
  assert.ok(svg.includes('+ addItem(item): void'), 'public method row');
  // the old label-newline content must NOT be re-invented when members exist
  assert.ok(!svg.includes('\\n'), 'no raw newline escapes leak into the card');
});
