import React from 'react';
import { usePluginStore } from '../store';

interface HeaderProps {
  issueCount: number;
}

export const Header: React.FC<HeaderProps> = ({ issueCount }) => {
  const handleRescan = () => {
    parent.postMessage({
      pluginMessage: { type: 'scan-layers' }
    }, '*');
  };

  return (
    <div className="header">
      <div className="header-left">
        <h1 className="plugin-title">EKSTACY</h1>
      </div>
      
      <div className="header-right" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {issueCount > 0 && (
          <span className="issues-count-red">{issueCount} issues</span>
        )}
        
        <button className="bulk-button" onClick={handleRescan}>
          Re-scan
        </button>
      </div>
    </div>
  );
};