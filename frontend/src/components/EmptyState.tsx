import React from 'react';
import { LucideIcon, Inbox } from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon = Inbox,
  title,
  description,
  action,
}) => (
  <div className="flex flex-col items-center justify-center text-center py-14 px-4">
    <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center mb-4">
      <Icon className="w-6 h-6 text-muted dark:text-gray-400" />
    </div>
    <p className="text-body font-semibold">{title}</p>
    {description && <p className="text-caption mt-1 max-w-xs">{description}</p>}
    {action && <div className="mt-4">{action}</div>}
  </div>
);
