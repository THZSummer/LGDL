#!/usr/bin/env node
/**
 * One-off vision review of a rendered PNG via doubao-seed-2-0-lite.
 * Reads the Ark API key from ~/.dsh/settings.yaml at runtime — the key is
 * NEVER stored in this repo. Usage: node scripts/vision-review.mjs <png> <prompt>
 */
import { readFileSync } from 'node:fs';

const [, , pngPath, promptArg] = process.argv;
if (!pngPath) {
  console.error('usage: node scripts/vision-review.mjs <png> [prompt]');
  process.exit(1);
}

const candidates = [
  `${process.env.HOME}/.dsh/settings.yaml`,
  `${process.env.HOME}/.config/opencode/opencode.json`,
];
let key = null;
for (const f of candidates) {
  try {
    const m = readFileSync(f, 'utf8').match(/ark-[A-Za-z0-9-]+/);
    if (m) {
      key = m[0];
      break;
    }
  } catch {
    /* file may not exist */
  }
}
if (!key) {
  console.error('no ark key in ~/.dsh/settings.yaml or ~/.config/opencode/opencode.json');
  process.exit(1);
}

const b64 = readFileSync(pngPath).toString('base64');
const prompt =
  promptArg ??
  '你是资深图表评审。请评审这张UML类图渲染图，逐项指出问题（只报真实可见的问题，不臆测）：' +
    '1) 每个类卡片是否清晰分成 名称/属性/方法 三个区块；2) 属性行与方法行的可见性符号(+/-)和文字是否清晰可读、无截断；' +
    '3) 卡片高度是否容纳全部成员（无溢出/被裁切）；4) 边标签与箭头是否清晰；5) 整体排版是否整齐。' +
    '用中文回答，格式：逐条「问题描述 -> 具体位置/证据」；若某方面没问题则写「无」。';

const res = await fetch('https://ark.cn-beijing.volces.com/api/plan/v3/chat/completions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${key}`,
  },
  body: JSON.stringify({
    model: 'doubao-seed-2-0-lite-260215',
    messages: [
      {
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: `data:image/png;base64,${b64}` } },
          { type: 'text', text: prompt },
        ],
      },
    ],
  }),
});

const json = await res.json();
const text = json?.choices?.[0]?.message?.content ?? JSON.stringify(json).slice(0, 2000);
console.log(text);
