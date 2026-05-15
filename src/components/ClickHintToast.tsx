import React from 'react';

interface ClickHintToastProps {
  message: string | null;
}

export default function ClickHintToast({ message }: ClickHintToastProps) {
  if (!message) return null;
  return <div className="click-hint-toast">{message}</div>;
}
