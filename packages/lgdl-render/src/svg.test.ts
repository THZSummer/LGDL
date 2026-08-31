import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderSvg } from './index.js';
import type { LgdlDocument } from '@lgdl/lgdl-core';
import type { LayoutResult } from '@lgdl/lgdl-layout';

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
      { id: 'auth', label: '认证模块', kind: 'group', contains: ['login'] },
      { id: 'frontend', label: '前端层', kind: 'group', contains: ['start', 'auth'] },
      { id: 'backend', label: '后端层', kind: 'group', contains: ['verify'] },
    ],
    edges: [
      { from: 'start', to: 'login' },
      { from: 'login', to: 'verify' },
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
      { id: 'g1', label: '组一', kind: 'group', contains: ['a'] },
      { id: 'g2', label: '组二', kind: 'group', contains: ['b'] },
    ],
    edges: [{ from: 'g1', to: 'g2', label: '整体调用' }],
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
  // aggregate edges now route as a rectilinear <path> (no bare straight <line>
  // that can hug a group border). Anchored on the group box boundaries.
  const m = svg.match(/<path d="M ([\d.]+),([\d.]+)((?: L [\d.]+,[\d.]+)+)"/);
  assert.ok(m, 'rectilinear path present');
  const y1 = parseFloat(m[2]);
  // last coordinate pair of the polyline
  const last = m[3].match(/([\d.]+),([\d.]+)$/)!;
  const yLast = parseFloat(last[2]);
  // group boxes pad=20 (+30 header above the top). g1 box: y in [10, 128],
  // g2 box: y in [250, 388]. Source anchors on g1 BOTTOM border (128); target
  // anchors on g2 TOP border (250) — anchors, not pushed into the box.
  assert.ok(Math.abs(y1 - 128) < 5, `src on g1 bottom border, got ${y1}`);
  assert.ok(Math.abs(yLast - 250) < 5, `dst on g2 top border anchor, got ${yLast}`);
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

test('renderSvg er mode: relation name at midpoint, multiplicities at endpoints', () => {
  const doc: LgdlDocument = {
    type: 'er',
    nodes: [
      { id: 'user', label: '用户' },
      { id: 'order', label: '订单' },
    ],
    edges: [{ from: 'user', to: 'order', label: '拥有', cardinalityFrom: '1', cardinalityTo: '*' }],
  };
  const layout: LayoutResult = {
    nodes: [
      { id: 'user', x: 40, y: 100, width: 140, height: 60 },
      { id: 'order', x: 420, y: 100, width: 140, height: 60 },
    ],
    edges: [{ from: 'user', to: 'order', points: [{ x: 110, y: 130 }, { x: 490, y: 130 }] }],
    width: 600,
    height: 260,
  };
  const svg = renderSvg(doc, layout);
  // relation name at midpoint, multiplicities near each endpoint
  assert.ok(svg.includes('>拥有</text>'), 'relation name at midpoint');
  assert.ok(svg.includes('>1</text>'), 'source multiplicity rendered');
  assert.ok(svg.includes('>*</text>'), 'target multiplicity rendered');
  // no regex-split residue: the label must not contain "1..*" anymore
  assert.ok(!svg.includes('拥有 1..*'), 'label stays the pure relation name');
});

test('renderSvg uml-class mode renders explicit multiplicities at endpoints', () => {
  const doc: LgdlDocument = {
    type: 'uml-class',
    nodes: [
      { id: 'user', label: 'User', kind: 'entity' },
      { id: 'order', label: 'Order', kind: 'entity' },
    ],
    edges: [{ from: 'user', to: 'order', label: '拥有', cardinalityFrom: '1', cardinalityTo: '*' }],
  };
  const layout: LayoutResult = {
    nodes: [
      { id: 'user', x: 40, y: 100, width: 140, height: 60 },
      { id: 'order', x: 420, y: 100, width: 140, height: 60 },
    ],
    edges: [{ from: 'user', to: 'order', points: [{ x: 110, y: 130 }, { x: 490, y: 130 }] }],
    width: 600,
    height: 260,
  };
  const svg = renderSvg(doc, layout);
  assert.ok(svg.includes('>拥有</text>'), 'relation name at midpoint');
  assert.ok(svg.includes('>1</text>'), 'source multiplicity');
  assert.ok(svg.includes('>*</text>'), 'target multiplicity');
});

test('renderSvg emits data-lgdl-loc source mappings on nodes, edges and groups', () => {
  const doc: LgdlDocument = {
    type: 'flowchart',
    nodes: [
      { id: 'a', label: 'A' },
      { id: 'b', label: 'B' },
      { id: 'g1', label: '组一', kind: 'group', contains: ['a'] },
    ],
    edges: [{ from: 'a', to: 'b', label: '去' }],
  };
  const layout: LayoutResult = {
    nodes: [
      { id: 'a', x: 60, y: 60, width: 120, height: 48 },
      { id: 'b', x: 300, y: 60, width: 120, height: 48 },
    ],
    edges: [{ from: 'a', to: 'b', points: [{ x: 120, y: 84 }, { x: 300, y: 84 }] }],
    width: 480,
    height: 200,
  };
  const svg = renderSvg(doc, layout);
  // document-order indexes, usable by the web workbench's source lookup
  assert.ok(svg.includes('data-lgdl-loc="nodes[0]"'), 'node a mapped');
  assert.ok(svg.includes('data-lgdl-loc="nodes[1]"'), 'node b mapped');
  assert.ok(svg.includes('data-lgdl-loc="edges[0]"'), 'edge mapped');
  assert.ok(svg.includes('data-lgdl-loc="groups[0]"'), 'group mapped');
  const locs = [...svg.matchAll(/data-lgdl-loc="([^"]+)"/g)].map((m) => m[1]);
  assert.ok(locs.length >= 4, `loc count: ${locs.length}`);
});

test('renderSvg uml-class member rows carry nodes[i].members[j] mappings', () => {
  const doc: LgdlDocument = {
    type: 'uml-class',
    nodes: [
      {
        id: 'cart',
        label: 'Cart',
        kind: 'entity',
        members: [
          { kind: 'attribute', name: 'items', type: 'list' },
          { kind: 'method', name: 'addItem', type: 'void', params: '(item)' },
        ],
      },
    ],
    edges: [],
  };
  const layout: LayoutResult = {
    nodes: [{ id: 'cart', x: 40, y: 40, width: 220, height: 84 }],
    edges: [],
    width: 300,
    height: 200,
  };
  const svg = renderSvg(doc, layout);
  assert.ok(svg.includes('data-lgdl-loc="nodes[0].members[0]"'), 'attribute row mapped');
  assert.ok(svg.includes('data-lgdl-loc="nodes[0].members[1]"'), 'method row mapped');
  assert.ok(svg.includes('data-lgdl-loc="nodes[0]"'), 'card maps to the node');
});
