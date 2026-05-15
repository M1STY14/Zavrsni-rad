import React, { useState, type CSSProperties } from 'react';
import { systems } from '../systems/index';
import { useT } from '../i18n/index';
import type { System, SystemInput } from '../types/system';

interface FloatingInputPanelProps {
  visible: boolean;
  activeSystem: System;
  onSystemChange: (system: System) => void;
  inputValues: Record<string, string>;
  onInputChange: (key: string, value: string) => void;
  onSubmit: () => void;
  onClear: () => void;
  loading: boolean;
  error: string | null;
  rootHash: string | null;
}

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
}: FloatingInputPanelProps) {
  const t = useT();
  const [collapsed, setCollapsed] = useState(false);

  const sysLabel = (system: System, key: string) => String(t(`systems.${system.id}.${key}`));
  const inputLabel = (system: System, inputKey: string) =>
    String(t(`systems.${system.id}.inputs.${inputKey}.label`));
  const inputPlaceholder = (system: System, inputKey: string) =>
    String(t(`systems.${system.id}.inputs.${inputKey}.placeholder`));
  const optionLabel = (system: System, inputKey: string, optValue: string) =>
    String(t(`systems.${system.id}.inputs.${inputKey}.options.${optValue}`));

  return (
    <div className={`floating-panel ${visible ? 'floating-panel-visible' : ''} ${collapsed ? 'floating-panel-collapsed' : ''}`}>
      <div className="floating-panel-header">
        <h3 className="floating-panel-title">{String(t('panel.title'))}</h3>
        <button
          className="floating-panel-toggle"
          onClick={() => setCollapsed(!collapsed)}
          title={collapsed ? String(t('panel.expand_title')) : String(t('panel.collapse_title'))}
        >
          {collapsed ? '▲' : '▼'}
        </button>
      </div>

      {!collapsed && (
        <>
          <div className="floating-panel-systems">
            {systems.map(system => (
              <button
                key={system.id}
                className={`floating-system-pill ${activeSystem.id === system.id ? 'floating-system-pill-active' : ''}`}
                onClick={() => onSystemChange(system)}
                style={{
                  ['--pill-color' as keyof CSSProperties]: system.color,
                  borderColor: activeSystem.id === system.id ? system.color : 'transparent',
                } as CSSProperties}
              >
                <span>{system.icon}</span>
                <span>{sysLabel(system, 'name')}</span>
              </button>
            ))}
          </div>

          <div className="floating-panel-hint" style={{ borderColor: `${activeSystem.color}44` }}>
            {sysLabel(activeSystem, 'hint')}
          </div>

          <div className="floating-panel-inputs">
            {activeSystem.inputs.map((input: SystemInput) => (
              <label key={input.key} className="floating-input-label">
                <span className="floating-input-name">{inputLabel(activeSystem, input.key)}</span>
                {input.type === 'select' ? (
                  <select
                    value={inputValues[input.key] || ''}
                    onChange={(e) => onInputChange(input.key, e.target.value)}
                    className="floating-input-field"
                  >
                    {input.options?.map(opt => (
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

          <div className="floating-panel-actions">
            <button
              className="floating-btn floating-btn-primary"
              onClick={onSubmit}
              disabled={loading}
              style={{ background: `linear-gradient(135deg, ${activeSystem.color} 0%, ${activeSystem.color}cc 100%)` }}
            >
              {loading ? String(t('panel.loading')) : String(t('panel.generate'))}
            </button>
            <button
              className="floating-btn floating-btn-secondary"
              onClick={onClear}
            >
              {String(t('panel.clear'))}
            </button>
          </div>

          {error && (
            <div className="floating-panel-error">
              {error}
            </div>
          )}

          {rootHash && (
            <div className="floating-panel-hash" style={{ borderColor: `${activeSystem.color}4d` }}>
              <span className="floating-hash-label" style={{ color: activeSystem.color }}>
                {String(t('panel.root_hash'))}
              </span>
              <code className="floating-hash-value">{rootHash}</code>
            </div>
          )}
        </>
      )}
    </div>
  );
}
