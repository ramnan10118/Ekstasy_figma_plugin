import React from 'react';
import { usePluginStore } from '../store';
import { TextIssue } from '../types';

interface IssueCardProps {
  issue: TextIssue;
}

export const IssueCard: React.FC<IssueCardProps> = ({ issue }) => {
  const { 
    selectedIssues, 
    toggleIssueSelection, 
    updateIssueStatus,
    undoCorrection
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
    parent.postMessage({
      pluginMessage: {
        type: 'apply-fix',
        data: {
          layerId: issue.layerId,
          issueId: issue.id,
          suggestion: issue.suggestion,
          issueText: issue.issueText
        }
      }
    }, '*');
  };

  const handleUndo = () => {
    const undoneIssue = undoCorrection(issue.layerId, issue.id);
    if (undoneIssue) {
      parent.postMessage({
        pluginMessage: {
          type: 'undo-fix',
          data: {
            layerId: issue.layerId,
            issueId: issue.id,
            originalText: undoneIssue.originalText,
            suggestion: undoneIssue.suggestion,
            issueText: undoneIssue.issueText
          }
        }
      }, '*');
    }
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
        
        <div className="issue-content">
          <div className={`issue-type ${issue.status === 'accepted' ? 'correct' : ''}`}>
            {issue.status === 'accepted' ? 'Correct' : issue.type.charAt(0).toUpperCase() + issue.type.slice(1)}
          </div>
          
          <div className="issue-text">
            {issue.originalText}
          </div>
          
          {issue.status === 'pending' && issue.suggestion && (
            <div className="suggestion-bubble">
              <div className="suggestion-label">Replace with below sentence:</div>
              <div className="suggestion-text">{issue.suggestion}</div>
            </div>
          )}
        </div>
        
        <div className="issue-actions">
          {/* Moved jump to layer button to bottom with other actions */}
        </div>
      </div>
      
      {isPending && (
        <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
              className="bulk-button primary"
              onClick={handleApplyFix}
              style={{ fontSize: '12px', padding: '8px 16px' }}
            >
              Apply Fix
            </button>
          </div>
          <button 
            className="bulk-button"
            onClick={handleJumpToLayer}
            style={{ fontSize: '12px', padding: '8px 16px' }}
          >
            Locate Layer
          </button>
        </div>
      )}

      {issue.status === 'accepted' && (
        <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
              className="bulk-button"
              onClick={handleUndo}
              style={{ fontSize: '12px', padding: '8px 16px', background: '#f59e0b', color: 'white', border: 'none' }}
            >
              Undo
            </button>
          </div>
          <button 
            className="bulk-button"
            onClick={handleJumpToLayer}
            style={{ fontSize: '12px', padding: '8px 16px' }}
          >
            Locate Layer
          </button>
        </div>
      )}
    </div>
  );
};