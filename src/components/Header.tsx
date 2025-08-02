import React from 'react';
import { usePluginStore } from '../store';

interface HeaderProps {
  issueCount: number;
}

export const Header: React.FC<HeaderProps> = ({ issueCount }) => {

  return (
    <div className="header">
      <div className="header-left">
        <h1 className="plugin-title">GRAMMAR</h1>
      </div>
      
      <div className="header-right">
        {issueCount > 0 && (
          <div className="issues-indicator">
            <span className="issues-count-red">{issueCount} issues</span>
          </div>
        )}
        
        <button className="settings-button">
          Settings
        </button>
      </div>
    </div>
  );
};