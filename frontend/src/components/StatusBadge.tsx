import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatusBadgeProps {
  label: string;
  tone: 'success' | 'danger' | 'warning' | 'info' | 'neutral';
  icon?: LucideIcon;
}

const toneClass: Record<StatusBadgeProps['tone'], string> = {
  success: 'badge-success',
  danger: 'badge-danger',
  warning: 'badge-warning',
  info: 'badge-info',
  neutral: 'badge-neutral',
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ label, tone, icon: Icon }) => (
  <span className={toneClass[tone]}>
    {Icon && <Icon className="w-3 h-3" />}
    {label}
  </span>
);
