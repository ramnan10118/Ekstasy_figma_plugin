import React from 'react';

export const EmptyState: React.FC = () => {
  return (
    <div className="empty-state">
      <div style={{ fontSize: '24px', marginBottom: '8px' }}>🎉</div>
      <div style={{ fontWeight: '600', marginBottom: '4px' }}>
        All text looks great!
      </div>
      <div style={{ fontSize: '11px', color: '#999' }}>
        No grammar or spelling issues found
      </div>
    </div>
  );
};