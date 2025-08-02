import React from 'react';
import { usePluginStore } from '../store';

export const BulkActions: React.FC = () => {
  const { 
    selectedIssues, 
    selectAllIssues, 
    clearSelection, 
    getSelectedIssues,
    getPendingIssuesCount,
    setProcessing 
  } = usePluginStore();

  const pendingCount = getPendingIssuesCount();
  const selectedCount = selectedIssues.length;

  const handleSelectAll = () => {
    if (selectedCount === pendingCount) {
      clearSelection();
    } else {
      selectAllIssues();
    }
  };

  const handleAutoFixAll = () => {
    const issuesToFix = getSelectedIssues();
    if (issuesToFix.length === 0) return;

    setProcessing(true);
    
    const fixes = issuesToFix.map(issue => ({
      layerId: issue.layerId,
      issueId: issue.id,
      suggestion: issue.suggestion,
      position: issue.position,
      originalText: issue.originalText
    }));

    parent.postMessage({
      pluginMessage: {
        type: 'apply-bulk-fix',
        data: { fixes }
      }
    }, '*');
  };

  const handleCheckLayers = () => {
    parent.postMessage({
      pluginMessage: { type: 'scan-layers' }
    }, '*');
  };

  return (
    <div className="bulk-actions">
      <button 
        className="bulk-button"
        onClick={handleSelectAll}
      >
        {selectedCount === pendingCount ? 'Deselect all' : 'Select all'}
      </button>
      
      <button 
        className="bulk-button"
        onClick={handleCheckLayers}
      >
        Check Layers
      </button>
      
      <button 
        className="bulk-button primary"
        onClick={handleAutoFixAll}
        disabled={selectedCount === 0}
      >
        Auto fix {selectedCount > 0 ? `${selectedCount}` : 'all'}
      </button>
      
      <div style={{ marginLeft: 'auto', fontSize: '11px', color: '#666' }}>
        {selectedCount} of {pendingCount} selected
      </div>
    </div>
  );
};