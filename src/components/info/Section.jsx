import React from 'react';

export default function Section({ title, children }) {
  return (
    <div className="info-section">
      <h4>{title}</h4>
      {children}
    </div>
  );
}
