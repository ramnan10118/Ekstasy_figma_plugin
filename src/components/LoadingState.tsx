import React from 'react';
import { usePluginStore } from '../store';
import { FlickeringGrid } from './FlickeringGrid';

// Ekstacy logo SVG (based on your provided sunglasses design)
const ekstacyLogo = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(`
<svg width="80" height="80" viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg">
  <!-- Light rays above sunglasses -->
  <g stroke="#1f2937" stroke-width="2" stroke-linecap="round">
    <line x1="20" y1="15" x2="24" y2="25" />
    <line x1="30" y1="12" x2="32" y2="22" />
    <line x1="40" y1="10" x2="40" y2="20" />
    <line x1="50" y1="12" x2="48" y2="22" />
    <line x1="60" y1="15" x2="56" y2="25" />
  </g>
  
  <!-- Sunglasses frame -->
  <g fill="#1f2937">
    <!-- Left lens -->
    <circle cx="25" cy="45" r="18" />
    <!-- Right lens -->
    <circle cx="55" cy="45" r="18" />
    <!-- Bridge -->
    <rect x="35" y="42" width="10" height="6" rx="3" />
    <!-- Left temple -->
    <rect x="7" y="42" width="8" height="4" rx="2" />
    <!-- Right temple -->
    <rect x="65" y="42" width="8" height="4" rx="2" />
  </g>
</svg>
`);

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
        return `Analysing Text Layers\n(${processingProgress.completed}/${processingProgress.total} complete - ${percentage}%)`;
      }
      return 'Analysing Text Layers';
    }
    
    return message;
  };
  
  return (
    <div className="loading-state" style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
      {/* Background Layer */}
      <FlickeringGrid 
        squareSize={type === 'processing' ? 2 : 3}
        gridGap={type === 'processing' ? 3 : 4}
        flickerChance={type === 'processing' ? 0.05 : 0.03}
        color="rgb(0, 0, 0)"
        maxOpacity={type === 'processing' ? 0.15 : 0.12}
      />
      
      {/* Centered Content */}
      <div style={{ 
        position: 'relative',
        zIndex: 10,
        textAlign: 'center',
        maxWidth: '400px',
        width: '100%'
      }}>
        
        {/* Logo */}
        <div style={{
          marginBottom: '24px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <img 
            src={ekstacyLogo}
            alt="Ekstacy Logo"
            style={{
              width: '80px',
              height: '80px'
            }}
          />
        </div>
        
        {/* Brand Name */}
        <div style={{ 
          fontSize: '28px',
          color: '#1f2937',
          fontWeight: '700',
          marginBottom: '24px',
          letterSpacing: '0.5px'
        }}>
          Ekstacy
        </div>
        
        {/* Progress Section */}
        {type === 'processing' && processingProgress.total > 0 && (
          <>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '12px',
              fontSize: '14px',
              color: '#6b7280',
              fontWeight: '500'
            }}>
              <span>Analysing text layers ({processingProgress.completed}/{processingProgress.total})</span>
              <span>{Math.round((processingProgress.completed / processingProgress.total) * 100)}%</span>
            </div>
            <div style={{ 
              width: '100%', 
              height: '8px', 
              backgroundColor: '#e5e7eb', 
              borderRadius: '4px',
              overflow: 'hidden'
            }}>
              <div style={{
                width: `${(processingProgress.completed / processingProgress.total) * 100}%`,
                height: '100%',
                backgroundColor: '#3b82f6',
                transition: 'width 0.5s ease',
                borderRadius: '4px'
              }} />
            </div>
          </>
        )}
        
        {type === 'scanning' && (scanProgress.textCount > 0 || scanProgress.frameCount > 0) && (
          <div style={{
            fontSize: '14px',
            color: '#6b7280',
            marginTop: '16px'
          }}>
            Found {scanProgress.textCount} text layers in {scanProgress.frameCount} frames
          </div>
        )}
      </div>
    </div>
  );
};