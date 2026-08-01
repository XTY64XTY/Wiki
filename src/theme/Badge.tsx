import React from 'react';

interface BadgeProps {
  type?: 'note' | 'tip' | 'info' | 'warning' | 'danger';
  text: string;
}

// 严重性 → CSS 类名,样式由 custom.css 第 8 节(.badge)提供
// 颜色核对自 microsoft-ui-xaml InfoBadge_themeresources.xaml + Common_themeresources_any.xaml
const typeClass: Record<string, string> = {
  note: 'badge--info',
  tip: 'badge--tip',
  info: 'badge--info',
  warning: 'badge--warning',
  danger: 'badge--danger',
};

export default function Badge({ type = 'info', text }: BadgeProps): JSX.Element {
  return (
    <span className={`badge ${typeClass[type] || typeClass.info}`}>{text}</span>
  );
}
