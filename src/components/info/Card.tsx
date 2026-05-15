import React, { type ReactNode } from 'react';

interface CardProps {
  accent?: string;
  title: ReactNode;
  children: ReactNode;
}

export default function Card({ accent, title, children }: CardProps) {
  return (
    <div className="info-card" style={accent ? { borderColor: `${accent}40` } : undefined}>
      <h3
        style={{
          color: accent || '#00d4ff',
          fontSize: '1.25rem',
          marginBottom: '0.7rem',
        }}
      >
        {title}
      </h3>
      {children}
    </div>
  );
}
