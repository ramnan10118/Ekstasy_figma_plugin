import React from 'react';
import { usePluginStore } from '../store';

interface HeaderProps {
  issueCount: number;
}

export const Header: React.FC<HeaderProps> = ({ issueCount }) => {
  const { 
    setScanMode, 
    setSelectedFrames, 
    setLayers, 
    previousRoute,
    setPreviousRoute 
  } = usePluginStore();

  const handleBack = () => {
    console.log('Header: Contextual back navigation, previousRoute:', previousRoute);
    
    if (previousRoute === 'frame-selection') {
      // Go back to frame selection screen
      setScanMode('frame-selection');
      setLayers([]);
    } else {
      // Go back to scan mode selection
      setScanMode('none');
      setSelectedFrames([]);
      setLayers([]);
      setPreviousRoute(null);
    }
    
    // Notify plugin to exit frame selection mode
    parent.postMessage({
      pluginMessage: { type: 'exit-frame-selection' }
    }, '*');
  };

  const handleRescan = () => {
    console.log('Header: Starting new scan');
    setScanMode('none');
    setSelectedFrames([]);
    setLayers([]);
    setPreviousRoute(null);
    
    // Also notify plugin to exit frame selection mode
    parent.postMessage({
      pluginMessage: { type: 'exit-frame-selection' }
    }, '*');
  };

  return (
    <div className="header">
      <div className="header-left" style={{ display: 'flex', alignItems: 'center' }}>
        <button
          onClick={handleBack}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: '18px',
            color: '#6b7280',
            padding: '0',
            marginRight: '8px',
            display: 'flex',
            alignItems: 'center'
          }}
        >
          ←
        </button>
        <h1 className="plugin-title" style={{ fontSize: '18px', fontWeight: '600', color: '#1f2937', margin: '0' }}>
          Results
        </h1>
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