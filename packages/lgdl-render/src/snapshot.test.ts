/**
 * snapshot.test.ts — examples golden 快照字节回归（FR-008/009/010，ADR-003）。
 *
 * 对象集 = EXAMPLES_SOURCES 11 源（受管镜像，ADR-002）；基线 = 当前引擎重渲染
 * 字节（D-002，不采用漂移 7/11 的磁盘 .svg）。双校验：
 *   1. 渲染串 === test-assets/golden/{id}.svg 文件字节
 *   2. sha256(渲染串) === manifest.files[id]（node:crypto）
 * manifest 完整性：ids 长度 11 / files 键集齐无多余 / version === 1 / 无时间戳字段。
 *
 * 更新门（FR-009/ADR-003）：仅 LGDL_UPDATE_SNAPSHOTS=1 时执行写路径（重写 11 svg
 * + manifest 后立即由下方 11 条断言自证一致——写坏即红）；普通模式代码不存在任何
 * 写盘分支 → CI/日常 `npm test` 不可能静默更新基线。
 * 资产读取路径 new URL('../test-assets/golden/', import.meta.url)——编译产物位于
 * 包根 dist-test/，'..' 回到包根（不依赖 cwd）。
 */
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { renderDoc } from './test-support/render-harness.js';
import { EXAMPLES_SOURCES } from './test-support/examples-sources.js';

const GOLDEN_DIR = fileURLToPath(new URL('../test-assets/golden/', import.meta.url));
const MANIFEST_PATH = GOLDEN_DIR + 'manifest.json';

interface Manifest {
  version: number;
  ids: string[];
  files: Record<string, string>;
}

function sha256hex(s: string): string {
  return createHash('sha256').update(s, 'utf8').digest('hex');
}

function readManifest(): Manifest {
  return JSON.parse(readFileSync(MANIFEST_PATH, 'utf8')) as Manifest;
}

/** 渲染 11 例 → {id → svg}（快照与矩阵共用模块级缓存，同 id 只渲一次） */
async function renderAll(): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  for (const ex of EXAMPLES_SOURCES) {
    const { svg } = await renderDoc(ex.source, ex.id);
    out.set(ex.id, svg);
  }
  return out;
}

const UPDATE = process.env.LGDL_UPDATE_SNAPSHOTS === '1';

before(async () => {
  // 更新门：显式 env 才写资产（首建 / 基线重建）；写后由各 test() 立即自断言
  if (UPDATE) {
    mkdirSync(GOLDEN_DIR, { recursive: true });
    const svgs = await renderAll();
    const files: Record<string, string> = {};
    for (const ex of EXAMPLES_SOURCES) {
      const svg = svgs.get(ex.id)!;
      writeFileSync(`${GOLDEN_DIR}${ex.id}.svg`, svg, 'utf8');
      files[ex.id] = sha256hex(svg);
    }
    const manifest: Manifest = { version: 1, ids: EXAMPLES_SOURCES.map((e) => e.id), files };
    writeFileSync(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  }
});

test('snapshot manifest 完整性: 11 ids / files 键集齐无多余 / version=1 / 无时间戳', () => {
  assert.ok(existsSync(MANIFEST_PATH), 'manifest.json 存在（缺失 → 先 LGDL_UPDATE_SNAPSHOTS=1 建档）');
  const manifest = readManifest();
  assert.equal(manifest.version, 1);
  assert.equal(manifest.ids.length, 11, `ids 长度 11，实际 ${manifest.ids.length}`);
  assert.deepEqual(
    [...manifest.ids].sort(),
    EXAMPLES_SOURCES.map((e) => e.id).sort(),
    'ids 集合与镜像一致',
  );
  const keys = Object.keys(manifest.files).sort();
  assert.deepEqual(keys, manifest.ids.slice().sort(), 'files 键集齐且无多余');
  for (const id of manifest.ids) {
    assert.match(manifest.files[id], /^[0-9a-f]{64}$/, `files[${id}] 为 sha256 hex`);
    assert.ok(existsSync(`${GOLDEN_DIR}${id}.svg`), `${id}.svg 资产存在`);
  }
  const raw = readFileSync(MANIFEST_PATH, 'utf8');
  assert.ok(!/timestamp|createdAt|env/i.test(raw), 'manifest 无时间戳/环境信息（确定性可 diff）');
});

for (const ex of EXAMPLES_SOURCES) {
  test(`snapshot ${ex.id}: 字节+sha 双校验`, async () => {
    assert.ok(existsSync(`${GOLDEN_DIR}${ex.id}.svg`), `${ex.id}.svg 缺失 → 先 LGDL_UPDATE_SNAPSHOTS=1 建档`);
    const manifest = readManifest();
    const { svg } = await renderDoc(ex.source, ex.id);
    const goldenBytes = readFileSync(`${GOLDEN_DIR}${ex.id}.svg`, 'utf8');
    assert.equal(svg, goldenBytes, `${ex.id}: 渲染串与 golden 文件逐字节一致`);
    assert.equal(sha256hex(svg), manifest.files[ex.id], `${ex.id}: sha256 与 manifest 一致`);
  });
}
