import React from 'react';
import { usePluginStore } from '../store';
import { IssueCard } from './IssueCard';

export const IssuesList: React.FC = () => {
  const { layers, viewMode } = usePluginStore();

  if (viewMode === 'by-layer') {
    return (
      <div className="issues-list">
        {layers.map(layer => (
          <div key={layer.id}>
            {layer.issues.map(issue => (
              <IssueCard 
                key={issue.id} 
                issue={issue} 
                layerName={layer.name}
                frameName={layer.frameName}
              />
            ))}
          </div>
        ))}
      </div>
    );
  }

  // Group by text - flatten all issues
  const allIssues = layers.flatMap(layer => 
    layer.issues.map(issue => ({
      ...issue,
      layerName: layer.name
    }))
  );

  return (
    <div className="issues-list">
      {allIssues.map(issue => (
        <IssueCard 
          key={issue.id} 
          issue={issue} 
          layerName={issue.layerName}
          frameName={(issue as any).frameName}
        />
      ))}
    </div>
  );
};