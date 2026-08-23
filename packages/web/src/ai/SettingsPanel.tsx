// API Provider 设置面板：选择厂商、填 Key、选模型
import React, { useState } from 'react';
import {
  PROVIDERS,
  defaultModelFor,
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
  const [showKey, setShowKey] = useState(false);
  const [saved, setSaved] = useState(false);

  const provider = PROVIDERS.find((p) => p.id === providerId) ?? PROVIDERS[0];

  const switchProvider = (id: ProviderId) => {
    setProviderId(id);
    setModel(defaultModelFor(id));
    setBaseURL(PROVIDERS.find((p) => p.id === id)?.baseURL ?? '');
  };

  const save = () => {
    onSave({
      providerId,
      apiKey: apiKey.trim(),
      model: model.trim() || defaultModelFor(providerId),
      baseURL: baseURL.trim() || (provider.baseURL ?? undefined),
    });
    setSaved(true);
    setTimeout(onClose, 600);
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
          <span className="ai-settings-label">API 服务商</span>
          <select
            value={providerId}
            onChange={(e) => switchProvider(e.target.value as ProviderId)}
          >
            {PROVIDERS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <span className="ai-settings-hint">{provider.hint}</span>
        </label>

        <label className="ai-settings-field">
          <span className="ai-settings-label">API Key</span>
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
            <span className="ai-settings-hint">
              默认 {provider.baseURL}；火山 coding/plan 端点可改为 .../api/coding/v3 等
            </span>
          </label>
        )}

        <div className="ai-settings-actions">
          <button className="ai-settings-btn" onClick={save}>
            {saved ? '✓ 已保存' : '保存'}
          </button>
        </div>
      </div>
    </div>
  );
}
