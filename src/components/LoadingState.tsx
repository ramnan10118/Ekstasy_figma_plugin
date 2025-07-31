import React from 'react';

interface LoadingStateProps {
  message?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({ 
  message = 'Loading...' 
}) => {
  return (
    <div className="loading-state">
      <div className="loading-spinner" />
      <div>{message}</div>
    </div>
  );
};