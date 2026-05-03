import React, { useState } from 'react';
import { systems } from '../systems/index.js';
import { useT } from '../i18n/index.jsx';

export default function FloatingInputPanel({
  visible,
  activeSystem,
  onSystemChange,
  inputValues,
  onInputChange,
  onSubmit,
  onClear,
  loading,
  error,
  rootHash,
}) {
  const t = useT();
  const [collapsed, setCollapsed] = useState(false);

  const sysLabel = (system, key) =>
    t(`systems.${system.id}.${key}`);
  const inputLabel = (system, inputKey) =>
    t(`systems.${system.id}.inputs.${inputKey}.label`);
  const inputPlaceholder = (system, inputKey) =>
    t(`systems.${system.id}.inputs.${inputKey}.placeholder`);
  const optionLabel = (system, inputKey, optValue) =>
    t(`systems.${system.id}.inputs.${inputKey}.options.${optValue}`);

  return (
    <div className={`floating-panel ${visible ? 'floating-panel-visible' : ''} ${collapsed ? 'floating-panel-collapsed' : ''}`}>
      {/* Header with collapse toggle */}
      <div className="floating-panel-header">
        <h3 className="floating-panel-title">{t('panel.title')}</h3>
        <button
          className="floating-panel-toggle"
          onClick={() => setCollapsed(!collapsed)}
          title={collapsed ? t('panel.expand_title') : t('panel.collapse_title')}
        >
          {collapsed ? '▲' : '▼'}
        </button>
      </div>

      {!collapsed && (
        <>
          {/* System selector pills */}
          <div className="floating-panel-systems">
            {systems.map(system => (
              <button
                key={system.id}
                className={`floating-system-pill ${activeSystem.id === system.id ? 'floating-system-pill-active' : ''}`}
                onClick={() => onSystemChange(system)}
                style={{
                  '--pill-color': system.color,
                  borderColor: activeSystem.id === system.id ? system.color : 'transparent',
                }}
              >
                <span>{system.icon}</span>
                <span>{sysLabel(system, 'name')}</span>
              </button>
            ))}
          </div>

          {/* Hint */}
          <div className="floating-panel-hint" style={{ borderColor: `${activeSystem.color}44` }}>
            {sysLabel(activeSystem, 'hint')}
          </div>

          {/* Input fields */}
          <div className="floating-panel-inputs">
            {activeSystem.inputs.map(input => (
              <label key={input.key} className="floating-input-label">
                <span className="floating-input-name">{inputLabel(activeSystem, input.key)}</span>
                {input.type === 'select' ? (
                  <select
                    value={inputValues[input.key] || ''}
                    onChange={(e) => onInputChange(input.key, e.target.value)}
                    className="floating-input-field"
                  >
                    {input.options.map(opt => (
                      <option key={opt.value} value={opt.value}>
                        {optionLabel(activeSystem, input.key, opt.value)}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type={input.type}
                    value={inputValues[input.key] || ''}
                    onChange={(e) => onInputChange(input.key, e.target.value)}
                    placeholder={inputPlaceholder(activeSystem, input.key)}
                    className="floating-input-field"
                  />
                )}
              </label>
            ))}
          </div>

          {/* Action buttons */}
          <div className="floating-panel-actions">
            <button
              className="floating-btn floating-btn-primary"
              onClick={onSubmit}
              disabled={loading}
              style={{ background: `linear-gradient(135deg, ${activeSystem.color} 0%, ${activeSystem.color}cc 100%)` }}
            >
              {loading ? t('panel.loading') : t('panel.generate')}
            </button>
            <button
              className="floating-btn floating-btn-secondary"
              onClick={onClear}
            >
              {t('panel.clear')}
            </button>
          </div>

          {/* Error */}
          {error && (
            <div className="floating-panel-error">
              {error}
            </div>
          )}

          {/* Root hash */}
          {rootHash && (
            <div className="floating-panel-hash" style={{ borderColor: `${activeSystem.color}4d` }}>
              <span className="floating-hash-label" style={{ color: activeSystem.color }}>{t('panel.root_hash')}</span>
              <code className="floating-hash-value">{rootHash}</code>
            </div>
          )}
        </>
      )}
    </div>
  );
}
