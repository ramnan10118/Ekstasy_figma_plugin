import React from 'react';
import { usePluginStore } from '../store';
import { TextIssue } from '../types';

interface IssueCardProps {
  issue: TextIssue;
  layerName: string;
  frameName?: string;
}

export const IssueCard: React.FC<IssueCardProps> = ({ issue, layerName, frameName }) => {
  const { 
    selectedIssues, 
    toggleIssueSelection, 
    updateIssueStatus 
  } = usePluginStore();

  const handleJumpToLayer = () => {
    parent.postMessage({
      pluginMessage: {
        type: 'jump-to-layer',
        data: { layerId: issue.layerId }
      }
    }, '*');
  };

  const handleApplyFix = () => {
    updateIssueStatus(issue.layerId, issue.id, 'accepted');
    
    parent.postMessage({
      pluginMessage: {
        type: 'apply-fix',
        data: {
          layerId: issue.layerId,
          issueId: issue.id,
          newText: issue.suggestion
        }
      }
    }, '*');
  };

  const handleDismiss = () => {
    updateIssueStatus(issue.layerId, issue.id, 'dismissed');
  };

  const isSelected = selectedIssues.includes(issue.id);
  const isPending = issue.status === 'pending';

  return (
    <div className="issue-card">
      <div className="issue-header">
        {isPending && (
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => toggleIssueSelection(issue.id)}
            style={{ marginTop: '2px' }}
          />
        )}
        
        <div className={`issue-status ${issue.status === 'accepted' ? 'correct' : 'warning'}`} />
        
        <div className="issue-content">
          <div className={`issue-type ${issue.status === 'accepted' ? 'correct' : ''}`}>
            {issue.status === 'accepted' ? 'Correct' : 'Confirm?'}
          </div>
          
          <div className="issue-text">
            {issue.originalText}
          </div>
          
          {frameName && (
            <div style={{ fontSize: '10px', color: '#999', marginTop: '4px' }}>
              Frame: {frameName} • Layer: {layerName}
            </div>
          )}
          
          {issue.status === 'pending' && issue.suggestion && (
            <div className="suggestion-bubble">
              <div className="suggestion-label">Replace with below sentence:</div>
              <div className="suggestion-text">{issue.suggestion}</div>
            </div>
          )}
        </div>
        
        <div className="issue-actions">
          <a className="jump-link" onClick={handleJumpToLayer}>
            jump to layer
          </a>
        </div>
      </div>
      
      {isPending && (
        <div style={{ marginTop: '8px', display: 'flex', gap: '8px' }}>
          <button 
            className="bulk-button primary"
            onClick={handleApplyFix}
            style={{ fontSize: '10px', padding: '4px 8px' }}
          >
            Apply Fix
          </button>
          <button 
            className="bulk-button"
            onClick={handleDismiss}
            style={{ fontSize: '10px', padding: '4px 8px' }}
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
};