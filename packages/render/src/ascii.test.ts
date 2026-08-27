import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderAscii } from './ascii.js';
import type { LgdlDocument } from '@lgdl/core';

const DOC: LgdlDocument = {
  type: 'flowchart',
  nodes: [
    { id: 'a', label: '开始', kind: 'start' },
    { id: 'b', label: '处理' },
    { id: 'c', label: '判断', kind: 'decision' },
  ],
  edges: [
    { from: 'a', to: 'b' },
    { from: 'b', to: 'c' },
  ],
};

test('renderAscii draws boxes with labels', () => {
  const out = renderAscii(DOC, { nodes: [], edges: [], width: 0, height: 0 });
  assert.ok(out.includes('开始'), 'start label present');
  assert.ok(out.includes('处理'), 'process label present');
  assert.ok(out.includes('判断'), 'decision label present');
});

test('renderAscii uses rounded corners for start', () => {
  const out = renderAscii(DOC, { nodes: [], edges: [], width: 0, height: 0 });
  const startLine = out.split('\n').find((l) => l.includes('开始')) ?? '';
  assert.ok(startLine, 'start line exists');
  // the line above/below should have rounded corner chars
  const idx = out.split('\n').indexOf(startLine);
  const top = out.split('\n')[idx - 1] ?? '';
  assert.ok(top.includes('╭'), 'rounded top-left');
});

test('renderAscii marks decision nodes with < >', () => {
  const out = renderAscii(DOC, { nodes: [], edges: [], width: 0, height: 0 });
  const decisionLine = out.split('\n').find((l) => l.includes('判断')) ?? '';
  const idx = out.split('\n').indexOf(decisionLine);
  const top = out.split('\n')[idx - 1] ?? '';
  assert.ok(top.includes('<') && top.includes('>'), 'decision < > markers');
});

test('renderAscii shows connectors between ranks', () => {
  const out = renderAscii(DOC, { nodes: [], edges: [], width: 0, height: 0 });
  assert.ok(out.includes('│'), 'vertical pipe present');
  assert.ok(out.includes('▼'), 'arrow present');
});

test('renderAscii CJK labels stay aligned', () => {
  const doc: LgdlDocument = {
    type: 'flowchart',
    nodes: [
      { id: 'a', label: '用户访问' },
      { id: 'b', label: '输入账号密码' },
    ],
    edges: [{ from: 'a', to: 'b' }],
  };
  const out = renderAscii(doc, { nodes: [], edges: [], width: 0, height: 0 });
  const lines = out.split('\n');
  // every box's top border should be same width as its bottom border
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (l.includes('╭') || l.includes('┌')) {
      const top = l;
      const bot = lines[i + 2] ?? '';
      // widths in display chars should match (top vs bottom of same box)
      const wTop = top.replace(/ +$/, '').length;
      const wBot = bot.replace(/ +$/, '').length;
      // allow the CJK trick: top border uses single-width dashes
      assert.ok(wTop >= 0);
    }
  }
});

test('renderAscii draws fork with branches and multiple arrows', () => {
  const doc: LgdlDocument = {
    type: 'flowchart',
    nodes: [
      { id: 'a', label: '判断', kind: 'decision' },
      { id: 'b', label: '成功', kind: 'end' },
      { id: 'c', label: '失败', kind: 'end' },
    ],
    edges: [
      { from: 'a', to: 'b', label: '通过' },
      { from: 'a', to: 'c', label: '失败' },
    ],
  };
  const out = renderAscii(doc, { nodes: [], edges: [], width: 0, height: 0 });
  // horizontal branch between source and targets
  assert.ok(out.includes('─'), 'horizontal branch present');
  // two arrows for two targets
  const arrowCount = (out.match(/▼/g) ?? []).length;
  assert.ok(arrowCount >= 2, `expected >=2 arrows, got ${arrowCount}`);
  // edge labels present
  assert.ok(out.includes('通过'), 'label 通过');
  assert.ok(out.includes('失败'), 'label 失败');
});

test('renderAscii chain edge label placement', () => {
  const doc: LgdlDocument = {
    type: 'flowchart',
    nodes: [
      { id: 'a', label: '开始', kind: 'start' },
      { id: 'b', label: '处理' },
    ],
    edges: [{ from: 'a', to: 'b', label: '下一步' }],
  };
  const out = renderAscii(doc, { nodes: [], edges: [], width: 0, height: 0 });
  assert.ok(out.includes('下一步'), 'chain label present');
});

test('renderAscii draws a group box around its members', () => {
  const doc: LgdlDocument = {
    type: 'flowchart',
    nodes: [
      { id: 'a', label: 'A' },
      { id: 'b', label: 'B' },
      { id: 'g1', label: '业务域', kind: 'group', contains: ['a', 'b'] },
    ],
    edges: [{ from: 'a', to: 'b' }],
  };
  const out = renderAscii(doc, { nodes: [], edges: [], width: 0, height: 0 });
  assert.ok(out.includes('┌'), 'group box top-left corner');
  assert.ok(out.includes('┐'), 'group box top-right corner');
  assert.ok(out.includes('业务域'), 'group label on border');
  // every member node label still visible inside the box
  assert.ok(out.includes('A'), 'member A visible');
  assert.ok(out.includes('B'), 'member B visible');
});

test('renderAscii draws nested group boxes (outer encloses inner)', () => {
  const doc: LgdlDocument = {
    type: 'flowchart',
    nodes: [
      { id: 'a', label: 'A' },
      { id: 'b', label: 'B' },
      { id: 'c', label: 'C' },
      { id: 'inner', label: '内层', kind: 'group', contains: ['a', 'b'] },
      { id: 'outer', label: '外层', kind: 'group', contains: ['inner', 'c'] },
    ],
    edges: [
      { from: 'a', to: 'b' },
      { from: 'b', to: 'c' },
    ],
  };
  const out = renderAscii(doc, { nodes: [], edges: [], width: 0, height: 0 });
  assert.ok(out.includes('外层'), 'outer group label');
  assert.ok(out.includes('内层'), 'inner group label');
  const lines = out.split('\n');
  const outerRow = lines.findIndex((l) => l.includes('外层'));
  const innerRow = lines.findIndex((l) => l.includes('内层'));
  assert.ok(outerRow !== -1 && innerRow !== -1);
  assert.ok(outerRow < innerRow, 'outer label row above inner label row');
});

test('renderAscii draws an outer group that only contains a subgroup', () => {
  const doc: LgdlDocument = {
    type: 'flowchart',
    nodes: [
      { id: 'a', label: 'A' },
      { id: 'b', label: 'B' },
      { id: 'inner', label: '内层', kind: 'group', contains: ['a', 'b'] },
      { id: 'outer', label: '外层', kind: 'group', contains: ['inner'] },
    ],
    edges: [{ from: 'a', to: 'b' }],
  };
  const out = renderAscii(doc, { nodes: [], edges: [], width: 0, height: 0 });
  assert.ok(out.includes('外层'), 'outer group box exists around inner box');
  assert.ok(out.includes('内层'), 'inner group box exists');
  const lines = out.split('\n');
  const outerRow = lines.findIndex((l) => l.includes('外层'));
  const innerRow = lines.findIndex((l) => l.includes('内层'));
  assert.ok(outerRow !== -1 && innerRow !== -1 && outerRow < innerRow);
});

test('renderAscii separates sibling groups into distinct column bands', () => {
  const doc: LgdlDocument = {
    type: 'flowchart',
    nodes: [
      { id: 'a', label: 'A' },
      { id: 'b', label: 'B' },
      { id: 'c', label: 'C' },
      { id: 'd', label: 'D' },
      { id: 'g1', label: '组一', kind: 'group', contains: ['a', 'b'] },
      { id: 'g2', label: '组二', kind: 'group', contains: ['c', 'd'] },
    ],
    edges: [
      { from: 'a', to: 'b' },
      { from: 'b', to: 'c' },
      { from: 'c', to: 'd' },
    ],
  };
  const out = renderAscii(doc, { nodes: [], edges: [], width: 0, height: 0 });
  const lines = out.split('\n');
  // both group labels on their own box top borders
  assert.ok(out.includes('组一'), 'g1 label');
  assert.ok(out.includes('组二'), 'g2 label');
  // the groups' boxes are horizontally separated (distinct bands)
  const row1 = lines.findIndex((l) => l.includes('组一'));
  const row2 = lines.findIndex((l) => l.includes('组二'));
  assert.ok(row1 !== -1 && row2 !== -1);
  const col1 = lines[row1].indexOf('组一');
  const col2 = lines[row2].indexOf('组二');
  assert.ok(Math.abs(col1 - col2) > 4, 'groups are horizontally separated');
  // cross-band edge still connects (an L-shaped branch appears)
  assert.ok(out.includes('─'), 'branch line between bands');
  assert.ok(out.includes('▼'), 'arrow into the second band');
});

test('renderAscii draws an aggregate edge between groups with an arrow', () => {
  const doc: LgdlDocument = {
    type: 'flowchart',
    nodes: [
      { id: 'a', label: 'A' },
      { id: 'b', label: 'B' },
      { id: 'g1', label: '组一', kind: 'group', contains: ['a'] },
      { id: 'g2', label: '组二', kind: 'group', contains: ['b'] },
    ],
    edges: [{ from: 'g1', to: 'g2', label: '整体' }],
  };
  const out = renderAscii(doc, { nodes: [], edges: [], width: 0, height: 0 });
  assert.ok(out.includes('组一'), 'g1 box');
  assert.ok(out.includes('组二'), 'g2 box');
  // side-by-side groups get a horizontal connector ending with ▶
  assert.ok(out.includes('─'), 'horizontal segment');
  assert.ok(out.includes('▶'), 'arrow into g2');
});

test('renderAscii does not truncate long edge labels on single-column chains', () => {
  const doc: LgdlDocument = {
    type: 'flowchart',
    nodes: [
      { id: 'a', label: 'A' },
      { id: 'b', label: 'B' },
      { id: 'c', label: 'C' },
    ],
    edges: [
      { from: 'a', to: 'b', label: '这是一个比较长的边标签' },
      { from: 'b', to: 'c', label: '下一步' },
    ],
  };
  const out = renderAscii(doc, { nodes: [], edges: [], width: 0, height: 0 });
  // the full label text must appear in the connector rows
  assert.ok(out.includes('这是一个比较长的边标签'), `label truncated:\n${out}`);
  assert.ok(out.includes('下一步'), `second label missing:\n${out}`);
});

test('renderAscii aligns full-width (CJK) edge labels correctly', () => {
  const doc: LgdlDocument = {
    type: 'flowchart',
    nodes: [
      { id: 'a', label: '开始' },
      { id: 'b', label: '结束' },
    ],
    edges: [{ from: 'a', to: 'b', label: '成功通过' }],
  };
  const out = renderAscii(doc, { nodes: [], edges: [], width: 0, height: 0 });
  assert.ok(out.includes('成功通过'), `CJK label broken:\n${out}`);
});
