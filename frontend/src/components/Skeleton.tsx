import React from 'react';

export const SkeletonLine: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`skeleton h-4 ${className}`} />
);

export const SkeletonCard: React.FC = () => (
  <div className="stat-card">
    <div className="space-y-2 flex-1">
      <SkeletonLine className="w-24" />
      <div className="skeleton h-8 w-20" />
    </div>
    <div className="skeleton w-10 h-10 rounded-xl" />
  </div>
);

export const SkeletonTableRows: React.FC<{ rows?: number; cols?: number }> = ({ rows = 5, cols = 4 }) => (
  <>
    {Array.from({ length: rows }).map((_, r) => (
      <tr key={r} className="table-row">
        {Array.from({ length: cols }).map((__, c) => (
          <td key={c} className="py-3 px-4">
            <SkeletonLine className={c === 0 ? 'w-32' : 'w-16'} />
          </td>
        ))}
      </tr>
    ))}
  </>
);
