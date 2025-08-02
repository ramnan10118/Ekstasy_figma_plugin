import React from 'react';
import { usePluginStore } from '../store';
import { IssueCard } from './IssueCard';

export const IssuesList: React.FC = () => {
  const { layers } = usePluginStore();

  return (
    <div className="issues-list">
      {layers.map(layer => (
        <div key={layer.id}>
          {layer.issues.map(issue => (
            <IssueCard 
              key={issue.id} 
              issue={issue}
            />
          ))}
        </div>
      ))}
    </div>
  );
};