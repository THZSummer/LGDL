// API Provider 设置面板：两步完成 —— 1. 选服务商，2. 填 API Key。
// 模型与 Base URL 折叠为「高级选项」，默认用服务商预设值。
import React, { useState } from 'react';
import {
  PROVIDERS,
  defaultModelFor,
  loadProviderSettings,
  saveProviderInputs as saveProviderInputsFn,
  testConnection,
  type ProviderId,
  type ProviderSettings,
} from './provider';

export function SettingsPanel({
  settings,
  onSave,
  onClose,
}: {
  settings: ProviderSettings;
  onSave: (s: ProviderSettings) => void;
  onClose: () => void;
}) {
  const [providerId, setProviderId] = useState<ProviderId>(settings.providerId);
  const [apiKey, setApiKey] = useState(settings.apiKey);
  const [model, setModel] = useState(settings.model);
  const [baseURL, setBaseURL] = useState(settings.baseURL ?? '');
  const [maxRounds, setMaxRounds] = useState(settings.maxRounds ?? 1000);
  const [showKey, setShowKey] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  const provider = PROVIDERS.find((p) => p.id === providerId) ?? PROVIDERS[0];

  const switchProvider = (id: ProviderId) => {
    // 先把当前 provider 的输入即时保存（不切换 active，仅存 key/模型）
    if (providerId !== id) {
      saveProviderInputs(providerId);
    }
    // 回填该 provider 自己保存的 key/模型/URL（各自独立，互不覆盖）
    const saved = loadProviderSettings(id);
    setProviderId(id);
    setApiKey(saved.apiKey);
    setModel(saved.model);
    setBaseURL(saved.baseURL ?? '');
    setTestResult(null);
  };

  /** 把当前输入保存到指定 provider（不动 active 指针）。 */
  const saveProviderInputs = (pid: ProviderId) => {
    saveProviderInputsFn(pid, {
      apiKey: apiKey.trim(),
      model: model.trim() || defaultModelFor(pid),
      baseURL: baseURL.trim() || undefined,
    });
  };

  const save = () => {
    onSave({
      providerId,
      apiKey: apiKey.trim(),
      model: model.trim() || defaultModelFor(providerId),
      baseURL: baseURL.trim() || (provider.baseURL ?? undefined),
      maxRounds: Math.max(1, Math.round(maxRounds) || 1000),
    });
    setSaved(true);
    setTimeout(onClose, 600);
  };

  const runTest = async () => {
    setTesting(true);
    setTestResult(null);
    const r = await testConnection({
      providerId,
      apiKey: apiKey.trim(),
      model: model.trim() || defaultModelFor(providerId),
      baseURL: baseURL.trim() || (provider.baseURL ?? undefined),
    });
    setTestResult({ ok: r.ok, message: r.message });
    setTesting(false);
  };
  return (
    <div className="ai-settings-mask" onClick={onClose}>
      <div className="ai-settings" onClick={(e) => e.stopPropagation()}>
        <div className="ai-settings-title">
          <span>⚙ API 设置</span>
          <button className="ai-settings-close" onClick={onClose} aria-label="关闭">
            ✕
          </button>
        </div>
        <p className="ai-settings-note">
          Key 仅保存在<b>本机浏览器</b>（localStorage），不上传任何服务器。
        </p>

        <label className="ai-settings-field">
          <span className="ai-settings-label">① API 服务商</span>
          <select value={providerId} onChange={(e) => switchProvider(e.target.value as ProviderId)}>
            {PROVIDERS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <span className="ai-settings-hint">{provider.hint} · 默认模型 {provider.defaultModel}</span>
          {!provider.browserDirect && (
            <span className="ai-settings-warn">
              ⚠ 该服务商不允许浏览器直连（CORS 受限），当前版本无法使用——请换用
              DeepSeek / Qwen / OpenAI 等可直连服务商；本地代理（lgdl serve）将在 v0.6 提供。
            </span>
          )}
        </label>

        <label className="ai-settings-field">
          <span className="ai-settings-label">② API Key</span>
          <div className="ai-settings-keyrow">
            <input
              type={showKey ? 'text' : 'password'}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={`粘贴 ${provider.name} API Key`}
              autoComplete="off"
              spellCheck={false}
            />
            <button
              type="button"
              className="ai-settings-eye"
              onClick={() => setShowKey(!showKey)}
              title={showKey ? '隐藏' : '显示'}
            >
              {showKey ? '🙈' : '👁'}
            </button>
          </div>
        </label>

        <button type="button" className="ai-settings-advanced-toggle" onClick={() => setShowAdvanced(!showAdvanced)}>
          {showAdvanced ? '▾ 收起高级选项' : '▸ 高级选项（模型 / Base URL / 执行轮数）'}
        </button>
        {showAdvanced && (
          <>
            <label className="ai-settings-field">
              <span className="ai-settings-label">模型</span>
              <input
                type="text"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder={provider.defaultModel}
                spellCheck={false}
              />
              <span className="ai-settings-hint">留空使用默认 {provider.defaultModel}</span>
            </label>

            {provider.baseURL && (
              <label className="ai-settings-field">
                <span className="ai-settings-label">API Base URL</span>
                <input
                  type="text"
                  value={baseURL}
                  onChange={(e) => setBaseURL(e.target.value)}
                  placeholder={provider.baseURL}
                  spellCheck={false}
                />
                <span className="ai-settings-hint">默认 {provider.baseURL}（一般无需修改）</span>
              </label>
            )}

            <label className="ai-settings-field">
              <span className="ai-settings-label">最大执行轮数</span>
              <input
                type="number"
                min={1}
                value={maxRounds}
                onChange={(e) => setMaxRounds(parseInt(e.target.value, 10) || 1000)}
              />
              <span className="ai-settings-hint">
                agent 循环每轮执行 1~3 条命令后反馈 AI 继续；默认 1000（正常任务不会触达），
                若出现死循环可调小
              </span>
            </label>
          </>
        )}

        {testResult && (
          <div className={`ai-settings-test ${testResult.ok ? 'ok' : 'fail'}`}>{testResult.message}</div>
        )}

        <div className="ai-settings-actions">
          <button
            className="ai-settings-btn ai-settings-test-btn"
            onClick={runTest}
            disabled={testing || !apiKey.trim() || !provider.browserDirect}
            title={
              provider.browserDirect
                ? '用当前配置发一个最小请求，验证 key / 端点 / CORS 可用性'
                : '该服务商浏览器直连受限（CORS），无法测试'
            }
          >
            {testing ? '测试中…' : '测试连接'}
          </button>
          <button className="ai-settings-btn" onClick={save}>
            {saved ? '✓ 已保存' : '保存'}
          </button>
        </div>
      </div>
    </div>
  );
}
