import React, { useEffect } from 'react';
import { usePluginStore } from '../store';
import { Header } from './Header';
import { IssuesList } from './IssuesList';
import { LoadingState } from './LoadingState';
import { BulkActions } from './BulkActions';
import { ScanTypeSelection } from './ScanTypeSelection';
import { FrameSelection } from './FrameSelection';
import { checkTextLayersWithOpenAI } from '../ai-service';
import './App.css';

export const App: React.FC = () => {
  console.log('UI: App component rendering...');
  
  const { 
    layers, 
    isScanning, 
    isProcessing, 
    scanMode,
    selectedFrames,
    setLayers, 
    setScanning,
    setProcessing,
    setScanProgress,
    setProcessingProgress,
    setScanMode,
    setSelectedFrames,
    setPreviousRoute,
    getPendingIssuesCount
  } = usePluginStore();
  
  console.log('UI: App component state:', { layers: layers.length, isScanning, isProcessing });

  // AI parallel processing
  const processTextLayersAsync = async (textLayers: any[]) => {
    console.log('UI: Starting OpenAI processing for', textLayers.length, 'layers');
    setProcessing(true);
    setProcessingProgress({ completed: 0, total: textLayers.length });
    
    try {
      // Handle empty layers case
      if (textLayers.length === 0) {
        console.log('UI: No text layers to process');
        setLayers([]);
        setScanning(false);
        setProcessing(false);
        return;
      }
      
      // Use parallel AI processing
      console.log('UI: Calling OpenAI processor...');
      const processedLayers = await checkTextLayersWithOpenAI(
        textLayers, 
        // Progress callback
        (completed, total) => {
          setProcessingProgress({ completed, total });
        }
      );
      
      console.log('UI: OpenAI processing complete');
      
      // Set all results
      setLayers(processedLayers);
      setScanning(false);
      setProcessing(false);
      console.log('UI: Processing complete');
      
    } catch (error) {
      console.error('UI: OpenAI processing failed:', error);
      setScanning(false);
      setProcessing(false);
    }
  };

  useEffect(() => {
    console.log('UI: Setting up message listener with addEventListener');
    
    // Use addEventListener instead of window.onmessage for React compatibility
    const handleMessage = async (event: MessageEvent) => {
      console.log('UI: Received window message:', event);
      console.log('UI: Plugin message:', event.data.pluginMessage);
      
      const message = event.data.pluginMessage;
      
      if (!message) {
        console.log('UI: No pluginMessage found in event data');
        return;
      }
      
      console.log('UI: Processing message type:', message.type);
      
      switch (message.type) {
        case 'scan-started':
          console.log('UI: Setting scanning to true');
          setScanning(true);
          setScanProgress({ textCount: 0, frameCount: 0 });
          break;
        case 'scan-progress':
          console.log('UI: Scan progress update:', message.data);
          setScanProgress(message.data);
          break;
        case 'process-text-layers':
          console.log('UI: Received process-text-layers message:', message.data);
          // Transition from scanning to processing
          setScanning(false);
          
          // Process text layers with AI in UI thread
          const textLayers = message.data.layers;
          console.log('UI: Processing layers:', textLayers.length);
          
          // Process AI analysis asynchronously without blocking
          processTextLayersAsync(textLayers);
          break;
        case 'bulk-fix-complete':
          console.log('UI: Bulk fix completed:', message.data);
          setProcessing(false);
          
          // Update status for successful fixes
          if (message.data && message.data.successfulFixes) {
            const { updateIssueStatus, clearSelection } = usePluginStore.getState();
            message.data.successfulFixes.forEach((fix: any) => {
              updateIssueStatus(fix.layerId, fix.issueId, 'accepted');
            });
            // Clear selection since these issues are no longer pending
            clearSelection();
          }
          
          // Show feedback to user
          if (message.data) {
            const { successCount, failCount, total } = message.data;
            if (failCount > 0) {
              console.warn(`UI: Bulk fix completed with ${failCount} failures out of ${total} total fixes`);
            } else {
              console.log(`UI: All ${successCount} fixes applied successfully`);
            }
          }
          break;
        case 'fix-complete':
          console.log('UI: Single fix completed:', message.data);
          
          // Update status for successful or failed fix
          if (message.data) {
            const { updateIssueStatus, clearSelection } = usePluginStore.getState();
            const status = message.data.success ? 'accepted' : 'pending';
            updateIssueStatus(message.data.layerId, message.data.issueId, status);
            
            if (message.data.success) {
              console.log('UI: Single fix applied successfully for issue:', message.data.issueId);
              // Clear selection since this issue is no longer pending
              clearSelection();
            } else {
              console.log('UI: Single fix failed for issue:', message.data.issueId);
            }
          }
          break;
        case 'undo-complete':
          console.log('UI: Undo completed:', message.data);
          
          if (message.data) {
            const { updateIssueStatus, clearSelection } = usePluginStore.getState();
            if (message.data.success) {
              // Issue is already set back to pending by the store undo function
              console.log('UI: Undo applied successfully for issue:', message.data.issueId);
              clearSelection();
            } else {
              // If undo failed, set status back to accepted
              updateIssueStatus(message.data.layerId, message.data.issueId, 'accepted');
              console.log('UI: Undo failed for issue:', message.data.issueId);
            }
          }
          break;
        case 'selection-update':
          console.log('UI: Frame selection update:', message.data);
          if (message.data && message.data.frames) {
            setSelectedFrames(message.data.frames);
          }
          break;
        case 'test-message':
          console.log('UI: Received test message:', message.data);
          break;
        default:
          console.log('UI: Unknown message type:', message.type);
          break;
      }
    };

    // Add the event listener
    window.addEventListener('message', handleMessage);
    console.log('UI: Added message event listener');

    // Notify plugin that UI is ready, then start scan
    console.log('UI: Notifying plugin UI is ready');
    
    // Small delay to ensure everything is ready
    setTimeout(() => {
      console.log('UI: Sending ui-ready message');
      parent.postMessage({
        pluginMessage: { type: 'ui-ready' }
      }, '*');
    }, 100);

    // Cleanup function to remove event listener
    return () => {
      console.log('UI: Removing message event listener');
      window.removeEventListener('message', handleMessage);
    };

  }, [setLayers, setScanning, setProcessing]);

  const pendingCount = getPendingIssuesCount();

  // Debug information
  console.log('App render - layers:', layers);
  console.log('App render - isScanning:', isScanning);
  console.log('App render - isProcessing:', isProcessing);

  // Handle scan mode selection screen
  if (scanMode === 'none') {
    return (
      <ScanTypeSelection
        onSelectFullDocument={() => {
          console.log('UI: Selected full document scan');
          setScanMode('full-document');
          setPreviousRoute('full-document');
          parent.postMessage({
            pluginMessage: { type: 'start-full-scan' }
          }, '*');
        }}
        onSelectFrameSelection={() => {
          console.log('UI: Selected frame selection mode');
          setScanMode('frame-selection');
          setPreviousRoute('frame-selection');
          parent.postMessage({
            pluginMessage: { type: 'enter-frame-selection' }
          }, '*');
        }}
      />
    );
  }

  // Handle frame selection screen
  if (scanMode === 'frame-selection') {
    return (
      <FrameSelection
        selectedFrames={selectedFrames}
        onScanFrames={() => {
          console.log('UI: Scanning selected frames:', selectedFrames);
          setScanMode('full-document'); // Transition to scanning mode
          parent.postMessage({
            pluginMessage: { 
              type: 'scan-selected-frames',
              data: { frameIds: selectedFrames.map(f => f.id) }
            }
          }, '*');
        }}
        onBackToSelection={() => {
          console.log('UI: Back to scan type selection');
          setScanMode('none');
          setSelectedFrames([]);
        }}
      />
    );
  }

  if (isScanning) {
    return <LoadingState type="scanning" />;
  }

  if (isProcessing) {
    return <LoadingState type="processing" />;
  }

  if (layers.length === 0) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <div style={{ marginBottom: '20px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#1f2937', margin: '0 0 12px 0' }}>No text layers found</h3>
          <p style={{ fontSize: '14px', color: '#6b7280', margin: '0 0 16px 0' }}>
            Make sure you have text layers in your Figma file
          </p>
        </div>
        <button 
          onClick={() => {
            console.log('UI: Manual rescan - back to selection');
            setScanMode('none');
            setLayers([]);
          }}
          style={{
            padding: '12px 24px',
            background: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500'
          }}
        >
          Back to Scan Selection
        </button>
      </div>
    );
  }

  return (
    <div className="app">
      <Header issueCount={pendingCount} />
      
      {pendingCount > 0 && (
        <BulkActions />
      )}
      
      <div className="content">
        <IssuesList />
      </div>
    </div>
  );
};