import React, { useState } from 'react';
import { systems } from '../systems/index.js';

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
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className={`floating-panel ${visible ? 'floating-panel-visible' : ''} ${collapsed ? 'floating-panel-collapsed' : ''}`}>
      {/* Header with collapse toggle */}
      <div className="floating-panel-header">
        <h3 className="floating-panel-title">Merkle Tree</h3>
        <button
          className="floating-panel-toggle"
          onClick={() => setCollapsed(!collapsed)}
          title={collapsed ? 'Expand' : 'Collapse'}
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
                <span>{system.name}</span>
              </button>
            ))}
          </div>

          {/* Hint */}
          <div className="floating-panel-hint" style={{ borderColor: `${activeSystem.color}44` }}>
            {activeSystem.hint}
          </div>

          {/* Input fields */}
          <div className="floating-panel-inputs">
            {activeSystem.inputs.map(input => (
              <label key={input.key} className="floating-input-label">
                <span className="floating-input-name">{input.label}</span>
                {input.type === 'select' ? (
                  <select
                    value={inputValues[input.key] || ''}
                    onChange={(e) => onInputChange(input.key, e.target.value)}
                    className="floating-input-field"
                  >
                    {input.options.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type={input.type}
                    value={inputValues[input.key] || ''}
                    onChange={(e) => onInputChange(input.key, e.target.value)}
                    placeholder={input.placeholder}
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
              {loading ? 'Loading...' : 'Generate'}
            </button>
            <button
              className="floating-btn floating-btn-secondary"
              onClick={onClear}
            >
              Clear
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
              <span className="floating-hash-label" style={{ color: activeSystem.color }}>Root Hash</span>
              <code className="floating-hash-value">{rootHash}</code>
            </div>
          )}
        </>
      )}
    </div>
  );
}
