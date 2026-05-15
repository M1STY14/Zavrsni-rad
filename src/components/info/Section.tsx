import React, { type ReactNode } from 'react';

interface SectionProps {
  title: ReactNode;
  children: ReactNode;
}

export default function Section({ title, children }: SectionProps) {
  return (
    <div className="info-section">
      <h4>{title}</h4>
      {children}
    </div>
  );
}
