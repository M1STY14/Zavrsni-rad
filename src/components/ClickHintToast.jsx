import React from 'react';

export default function ClickHintToast({ message }) {
  if (!message) return null;
  return <div className="click-hint-toast">{message}</div>;
}
