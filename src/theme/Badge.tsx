import React from 'react';

interface BadgeProps {
  type?: 'note' | 'tip' | 'info' | 'warning' | 'danger';
  text: string;
}

const typeColors: Record<string, string> = {
  note: '#4a90d9',
  tip: '#42b983',
  info: '#2196f3',
  warning: '#e6a700',
  danger: '#e74c3c',
};

export default function Badge({ type = 'info', text }: BadgeProps): JSX.Element {
  const color = typeColors[type] || typeColors.info;
  return (
    <span
      style={{
        backgroundColor: color,
        color: '#fff',
        borderRadius: '3px',
        padding: '2px 6px',
        fontSize: '0.85em',
        fontWeight: 500,
        verticalAlign: 'middle',
        marginLeft: '4px',
      }}
    >
      {text}
    </span>
  );
}
