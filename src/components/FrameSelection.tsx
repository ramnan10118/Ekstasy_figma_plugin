import React from 'react';

interface SelectedFrame {
  id: string;
  name: string;
}

interface FrameSelectionProps {
  selectedFrames: SelectedFrame[];
  onScanFrames: () => void;
  onBackToSelection: () => void;
}

export const FrameSelection: React.FC<FrameSelectionProps> = ({
  selectedFrames,
  onScanFrames,
  onBackToSelection
}) => {
  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
          <button
            onClick={onBackToSelection}
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
          <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#1f2937', margin: '0' }}>
            Frame Selection
          </h2>
        </div>
        <p style={{ fontSize: '14px', color: '#6b7280', margin: '0' }}>
          Select frames in Figma using your mouse. Selected frames will appear below.
        </p>
      </div>

      {/* Selected Frames Display */}
      <div style={{ 
        background: '#f9fafb', 
        border: '1px solid #e5e7eb', 
        borderRadius: '8px', 
        padding: '16px',
        marginBottom: '20px',
        minHeight: '100px'
      }}>
        <div style={{ fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
          Selected Frames ({selectedFrames.length})
        </div>
        
        {selectedFrames.length === 0 ? (
          <div style={{ 
            color: '#9ca3af', 
            fontSize: '14px', 
            fontStyle: 'italic',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '60px'
          }}>
            Click frames in Figma to select them
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {selectedFrames.map((frame) => (
              <div
                key={frame.id}
                style={{
                  background: '#ffffff',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  padding: '8px 12px',
                  fontSize: '14px',
                  color: '#374151',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <span style={{ marginRight: '8px' }}>🖼️</span>
                {frame.name}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Scan Button */}
      <button
        onClick={onScanFrames}
        disabled={selectedFrames.length === 0}
        style={{
          width: '100%',
          padding: '16px',
          background: selectedFrames.length > 0 ? '#3b82f6' : '#d1d5db',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          cursor: selectedFrames.length > 0 ? 'pointer' : 'not-allowed',
          fontSize: '16px',
          fontWeight: '500',
          transition: 'all 0.2s'
        }}
        onMouseEnter={(e) => {
          if (selectedFrames.length > 0) {
            e.currentTarget.style.background = '#2563eb';
          }
        }}
        onMouseLeave={(e) => {
          if (selectedFrames.length > 0) {
            e.currentTarget.style.background = '#3b82f6';
          }
        }}
      >
        {selectedFrames.length === 0 
          ? 'Select frames to scan'
          : `Scan ${selectedFrames.length} Selected Frame${selectedFrames.length > 1 ? 's' : ''}`
        }
      </button>
    </div>
  );
};