import React from 'react';
import { usePluginStore } from '../store';

interface HeaderProps {
  issueCount: number;
}

export const Header: React.FC<HeaderProps> = ({ issueCount }) => {
  const { viewMode, setViewMode, layers } = usePluginStore();
  
  const frameCount = new Set(layers.map(layer => layer.frameName).filter(Boolean)).size;
  const hasSelection = layers.some(layer => layer.frameName && layer.frameName !== 'No Frame');

  return (
    <div className="header">
      <div className="header-left">
        <h1 className="plugin-title">GRAMMAR</h1>
        <div style={{ fontSize: '10px', color: '#666' }}>
          {hasSelection ? `Selected: ${frameCount} frame${frameCount !== 1 ? 's' : ''}` : `Scanning ${frameCount} frame${frameCount !== 1 ? 's' : ''}`}
        </div>
        {issueCount > 0 && (
          <span className="issue-count">
            {issueCount} issue{issueCount !== 1 ? 's' : ''}
          </span>
        )}
      </div>
      
      <div className="header-right">
        <div className="view-toggle">
          <button 
            className={`toggle-button ${viewMode === 'by-layer' ? 'active' : ''}`}
            onClick={() => setViewMode('by-layer')}
          >
            Group by layer
          </button>
          <button 
            className={`toggle-button ${viewMode === 'by-text' ? 'active' : ''}`}
            onClick={() => setViewMode('by-text')}
          >
            Group by text
          </button>
        </div>
        
        <button className="settings-button">
          Settings
        </button>
      </div>
    </div>
  );
};