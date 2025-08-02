import React from 'react';
import { usePluginStore } from '../store';
import { FlickeringGrid } from './FlickeringGrid';

interface LoadingStateProps {
  message?: string;
  type?: 'scanning' | 'processing' | 'generic';
}

export const LoadingState: React.FC<LoadingStateProps> = ({ 
  message = 'Loading...',
  type = 'generic'
}) => {
  const { scanProgress, processingProgress } = usePluginStore();
  
  const getDisplayMessage = () => {
    if (type === 'scanning') {
      if (scanProgress.textCount > 0 || scanProgress.frameCount > 0) {
        return `Scanning... Found ${scanProgress.textCount} text layers in ${scanProgress.frameCount} frames`;
      }
      return 'Scanning text layers...';
    }
    
    if (type === 'processing') {
      if (processingProgress.total > 0) {
        const percentage = Math.round((processingProgress.completed / processingProgress.total) * 100);
        return `Processing Text Layers (${processingProgress.completed}/${processingProgress.total} complete - ${percentage}%)`;
      }
      return 'Processing with OpenAI...';
    }
    
    return message;
  };
  
  return (
    <div className="loading-state">
      <FlickeringGrid 
        squareSize={type === 'processing' ? 2 : 3}
        gridGap={type === 'processing' ? 3 : 4}
        flickerChance={type === 'processing' ? 0.15 : 0.1}
        color="rgb(59, 130, 246)"
        maxOpacity={type === 'processing' ? 0.3 : 0.25}
      />
      <div className="loading-text">{getDisplayMessage()}</div>
      {type === 'processing' && processingProgress.total > 0 && (
        <div style={{ 
          position: 'relative',
          zIndex: 10,
          width: 'calc(100% - 40px)', 
          maxWidth: '400px',
          marginTop: '24px',
          padding: '0'
        }}>
          <div style={{ 
            width: '100%', 
            height: '12px', 
            backgroundColor: '#e5e7eb', 
            borderRadius: '6px',
            overflow: 'hidden',
            border: '2px solid #d1d5db',
            boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.1)'
          }}>
            <div style={{
              width: `${(processingProgress.completed / processingProgress.total) * 100}%`,
              height: '100%',
              backgroundColor: '#3b82f6',
              transition: 'width 0.5s ease',
              minWidth: processingProgress.completed > 0 ? '6px' : '0px',
              borderRadius: '4px',
              boxShadow: '0 1px 2px rgba(59, 130, 246, 0.3)'
            }} />
          </div>
        </div>
      )}
    </div>
  );
};