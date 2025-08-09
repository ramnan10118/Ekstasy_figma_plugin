import React from 'react';

interface ScanTypeSelectionProps {
  onSelectFullDocument: () => void;
  onSelectFrameSelection: () => void;
}

export const ScanTypeSelection: React.FC<ScanTypeSelectionProps> = ({
  onSelectFullDocument,
  onSelectFrameSelection
}) => {
  return (
    <div style={{ padding: '24px', textAlign: 'center' }}>
      <div style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#1f2937', margin: '0 0 12px 0' }}>
          Choose Scan Type
        </h2>
        <p style={{ fontSize: '14px', color: '#6b7280', margin: '0' }}>
          Select how you want to scan your document for grammar issues
        </p>
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Full Document Scan Option */}
        <button
          onClick={onSelectFullDocument}
          style={{
            padding: '20px',
            background: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: '500',
            textAlign: 'left',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#2563eb';
            e.currentTarget.style.transform = 'translateY(-2px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#3b82f6';
            e.currentTarget.style.transform = 'translateY(0px)';
          }}
        >
          <div style={{ marginBottom: '8px', fontSize: '18px', fontWeight: '600' }}>
            📄 Full Document Scan
          </div>
          <div style={{ fontSize: '14px', opacity: '0.9' }}>
            Scans all text layers in your entire document. May take longer for large files.
          </div>
        </button>

        {/* Frame Selection Option */}
        <button
          onClick={onSelectFrameSelection}
          style={{
            padding: '20px',
            background: '#10b981',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: '500',
            textAlign: 'left',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#059669';
            e.currentTarget.style.transform = 'translateY(-2px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#10b981';
            e.currentTarget.style.transform = 'translateY(0px)';
          }}
        >
          <div style={{ marginBottom: '8px', fontSize: '18px', fontWeight: '600' }}>
            🎯 Frame Selection
          </div>
          <div style={{ fontSize: '14px', opacity: '0.9' }}>
            Select specific frames in Figma to scan. Faster and more targeted.
          </div>
        </button>
      </div>
    </div>
  );
};