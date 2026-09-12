/**
 * Options page (FR-033 / FR-035 / FR-036).
 *
 * Independent LLM configuration (chrome.storage.local), manual re-configuration
 * guidance (no auto migration from the built-in assistant), compliance entry.
 * The API key is written but never echoed in plaintext.
 */
import { createChromeAsyncKv } from '../../platform/extension-env.js';
import { createKeyStore } from '../../llm/key-store.js';
import { PROVIDERS, providerById, DEFAULT_MAX_ROUNDS } from '../../llm/providers.js';

const $ = <T extends HTMLElement>(id: string): T => {
  const el = document.getElementById(id);
  if (!el) throw new Error(`missing element #${id}`);
  return el as T;
};

const store = createKeyStore(createChromeAsyncKv('web-cli'));

function fillProviders(selected: string): void {
  const select = $('provider') as HTMLSelectElement;
  select.textContent = '';
  for (const p of PROVIDERS) {
    const opt = document.createElement('option');
    opt.value = p.id;
    opt.textContent = `${p.name}${p.browserDirect ? '' : '（需 G-KEY 验证直连）'}`;
    if (p.id === selected) opt.selected = true;
    select.appendChild(opt);
  }
}

function setKeyWarning(configured: boolean): void {
  const box = $('key-warning');
  box.textContent = configured
    ? ''
    : '⚠ 尚未配置 API Key：插件无法调用 LLM。请在下方选择厂商、填入 API Key 并保存。';
  box.classList.toggle('show', !configured);
}

async function refresh(): Promise<void> {
  const cfg = await store.load();
  fillProviders(cfg.providerId);
  ($('model') as HTMLInputElement).value = cfg.model;
  ($('baseURL') as HTMLInputElement).value = cfg.baseURL ?? '';
  ($('maxRounds') as HTMLInputElement).value = String(cfg.maxRounds ?? DEFAULT_MAX_ROUNDS);
  ($('apiKey') as HTMLInputElement).value = '';
  const provider = providerById(cfg.providerId);
  $('hint').textContent = `${provider.hint}${provider.browserDirect ? '' : '；⚠ 该厂商浏览器直连受限，若不可用请使用本地代理（首版未实现，将给出可读转译）'}`;
  $('saved').textContent = cfg.apiKey ? '已保存 Key（掩码显示，不回显明文）' : '未配置 Key';
  setKeyWarning(cfg.apiKey.length > 0);
}

function wire(): void {
  $('provider').addEventListener('change', () => {
    const id = ($('provider') as HTMLSelectElement).value;
    const provider = providerById(id);
    ($('model') as HTMLInputElement).value = provider.defaultModel;
    $('hint').textContent = provider.hint;
  });

  $('form').addEventListener('submit', (e) => {
    e.preventDefault();
    void (async () => {
      const providerId = ($('provider') as HTMLSelectElement).value;
      const existing = await store.loadProvider(providerById(providerId).id);
      const typed = ($('apiKey') as HTMLInputElement).value;
      await store.save({
        providerId: providerById(providerId).id,
        apiKey: typed || existing.apiKey,
        model: ($('model') as HTMLInputElement).value,
        baseURL: ($('baseURL') as HTMLInputElement).value,
        maxRounds: Number(($('maxRounds') as HTMLInputElement).value) || DEFAULT_MAX_ROUNDS,
      });
      // F-8: never leave the typed secret in the DOM after a successful save.
      ($('apiKey') as HTMLInputElement).value = '';
      $('saved').textContent = '✓ 已保存到扩展存储（chrome.storage.local，页面脚本不可读）';
      setKeyWarning(typed.length > 0 || existing.apiKey.length > 0);
    })();
  });

  $('clear').addEventListener('click', () => {
    void store.clear().then(() => refresh());
  });
}

wire();
void refresh();
