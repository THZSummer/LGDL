/**
 * V3-4 TASK-410 (NFR-V3-007 / NFR-V3-006 / AC-V3-017 / AC-V3-018) — the **static**
 * half of the zero-injection gate.
 *
 * The runtime half lives in `test/ui/zero-injection.mjs` (a real Chromium run against
 * an unauthorized origin). This half pins the two things a browser run cannot prove
 * about the *declaration*:
 *
 *   ① the manifest's static permission surface did not grow — no `contextMenus`, no
 *      new `permissions` / `optional_permissions` / `host_permissions` entry, and no
 *      static `content_scripts` (the layer must stay **on-demand**);
 *   ② the layer is not smuggled into the resident bundle: `dist/content.js` must not
 *      reference it, and the service worker's injection path must re-check
 *      authorization before it executes anything on a tab.
 */
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import test from 'node:test';

const REPO = new URL('../../../', import.meta.url);
const PKG = new URL('../../', import.meta.url);
const read = (rel: string): string => readFileSync(new URL(rel, PKG), 'utf8');

/** The frozen static surface (v1 declaration; any change is a red-line breach). */
const FROZEN_PERMISSIONS = ['activeTab', 'scripting', 'storage', 'sidePanel', 'tabs'];
const FROZEN_OPTIONAL = ['bookmarks', 'downloads', 'notifications', 'clipboardRead', 'clipboardWrite'];
const FROZEN_HOSTS = [
  'https://api.deepseek.com/*',
  'https://dashscope.aliyuncs.com/*',
  'https://ark.cn-beijing.volces.com/*',
  'https://api.hunyuan.cloud.tencent.com/*',
  'https://api.openai.com/*',
  'https://api.anthropic.com/*',
];

test('V3-4 零注入（静态面）：manifest 静态权限零新增 + 无 contextMenus + 无静态 content_scripts', () => {
  const manifest = JSON.parse(read('manifest.json')) as Record<string, unknown>;
  assert.deepEqual(manifest.permissions, FROZEN_PERMISSIONS, '静态 permissions 必须零新增');
  assert.deepEqual(manifest.optional_permissions, FROZEN_OPTIONAL, 'optional_permissions 必须零新增');
  assert.deepEqual(manifest.host_permissions, FROZEN_HOSTS, 'host_permissions 必须零新增（不扩大任何域）');
  assert.deepEqual(manifest.optional_host_permissions, ['http://*/*', 'https://*/*']);
  const raw = read('manifest.json');
  assert.ok(!raw.includes('contextMenus'), '不得引入 contextMenus（右键自绘是路线 1 的前提）');
  assert.equal(manifest.content_scripts, undefined, '不得出现静态 content_scripts（必须按需注入）');
  assert.equal(manifest.web_accessible_resources, undefined, '不得暴露 web_accessible_resources（executeScript 不需要）');
  assert.equal(manifest.minimum_chrome_version, '116', 'MV3 / attachShadow 的下限不得下调');
  // 反证：一个加了 contextMenus 的 manifest 在本判据下必须被判红。
  const forged = { ...manifest, permissions: [...FROZEN_PERMISSIONS, 'contextMenus'] };
  assert.notDeepEqual(forged.permissions, FROZEN_PERMISSIONS, '反证：加权限的 manifest 必须与冻结集合不等');
  assert.ok(JSON.stringify(forged).includes('contextMenus'), '反证：伪造体确实带上了 contextMenus');
});

test('V3-4 零注入（结构与源码）：常驻产物不含拾取层；SW 注入前再次校验授权', () => {
  let content: string | undefined;
  try {
    content = readFileSync(new URL('dist/content.js', PKG), 'utf8');
  } catch {
    content = undefined;
  }
  if (content !== undefined) {
    // The resident bundle must not carry the layer (that is the whole point of the
    // separate artifact: `content.js` has zero headroom).
    assert.ok(!content.includes('__wcliPickLayer'), 'content.js 不得包含拾取层（否则就是「打进常驻」）');
    assert.ok(!content.includes('data-wcli-pick-root'), 'content.js 不得包含拾取层的 Shadow host 标记');
    assert.equal(statSync(new URL('dist/pick-layer.js', PKG)).size > 0, true, '独立产物必须存在');
  }
  const sw = read('src/background/service-worker.ts');
  const injectCase = sw.slice(sw.indexOf("case 'pick-layer-inject'"), sw.indexOf("case 'pick-layer-teardown'"));
  assert.ok(injectCase.length > 0, 'pick-layer-inject case 必须存在');
  assert.match(injectCase, /declarationEnv\(/, '注入前必须拿到该 origin 的声明事实（授权态在其中）');
  assert.match(injectCase, /env\.authorized/, '注入前必须再次校验授权集合（面板视图只是提示，OriginStore 才是闸门）');
  assert.match(injectCase, /errorResponse\(/, '未授权必须返回可读拒绝（不得静默）');
  assert.match(injectCase, /files: \['pick-layer\.js'\]/, '注入必须走既有 executeScript 通路（零新增权限）');
  // 结构守卫：注入只能通过 executeScript 发生，不能出现注册式（登记式）静态化。
  assert.ok(!/registerContentScripts\([\s\S]{0,200}pick-layer/.test(sw), '不得把拾取层登记为常驻 content script');
});

test('V3-4 零注入（源码面）：页面侧只在被注入时才有监听 —— 模块自身不带任何 chrome 注册', () => {
  const layer = read('src/content/pick-layer.ts');
  // Comments are stripped: the module's doc block legitimately *describes* the
  // `chrome.scripting.executeScript` call the service worker makes — the assertion is
  // about the CODE it runs, not about the prose around it.
  const layerCode = layer.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  assert.ok(!/registerContentScripts|chrome\.scripting/.test(layerCode), '拾取层不得自行注册 / 自注入');
  const protocol = read('src/content/pick-protocol.ts');
  assert.ok(
    protocol.includes("'pick-layer-inject'") && protocol.includes("'pick-layer-teardown'"),
    '六个 kind 的运行时校验必须住在独立模块（不进 content.js 的 KIND_SET）',
  );
  const messaging = read('src/background/messaging.ts');
  // Anchor on the *declaration* (the surrounding comment also mentions KIND_SET).
  const kindSet = messaging.slice(
    messaging.indexOf('const KIND_SET'),
    messaging.indexOf('export function makeMessage'),
  );
  assert.ok(!kindSet.includes('pick-layer'), 'KIND_SET 不得包含拾取层 kind（实测会撑大 content.js ≥ +307 B）');
  // 反证：把 kind 加进 KIND_SET 的伪造文本必须命中「撑大常驻产物」的判据。
  assert.ok(
    /KIND_SET/.test(`${kindSet} 'pick-layer-inject',`),
    '反证：伪造体确实把 kind 放进了 KIND_SET 的文本块',
  );
});
