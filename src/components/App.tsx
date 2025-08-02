import React, { useEffect } from 'react';
import { usePluginStore } from '../store';
import { Header } from './Header';
import { IssuesList } from './IssuesList';
import { LoadingState } from './LoadingState';
import { EmptyState } from './EmptyState';
import { BulkActions } from './BulkActions';
import { checkTextLayersWithOpenAI } from '../ai-service';
import './App.css';

export const App: React.FC = () => {
  console.log('UI: App component rendering...');
  
  const { 
    layers, 
    isScanning, 
    isProcessing, 
    setLayers, 
    setScanning,
    setProcessing,
    setScanProgress,
    setProcessingProgress,
    getPendingIssuesCount
  } = usePluginStore();
  
  console.log('UI: App component state:', { layers: layers.length, isScanning, isProcessing });

  // AI parallel processing (fast + accurate)
  const processTextLayersAsync = async (textLayers: any[]) => {
    console.log('UI: Starting OpenAI parallel processing for', textLayers.length, 'layers');
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
      
      // Use parallel AI processing for speed + accuracy with progress tracking
      console.log('UI: Calling OpenAI parallel processor...');
      const processedLayers = await checkTextLayersWithOpenAI(textLayers, (completed, total) => {
        setProcessingProgress({ completed, total });
      });
      
      console.log('UI: OpenAI parallel processing complete, processed layers:', processedLayers);
      setLayers(processedLayers);
      setScanning(false);
      setProcessing(false);
      console.log('UI: Set layers and stopped scanning/processing');
      
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

  if (isScanning) {
    return <LoadingState type="scanning" />;
  }

  if (isProcessing) {
    return <LoadingState type="processing" />;
  }

  if (layers.length === 0) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <div style={{ marginBottom: '16px' }}>
          <h3>No text layers found</h3>
          <p style={{ fontSize: '12px', color: '#666' }}>
            Make sure you have:
          </p>
          <ul style={{ fontSize: '11px', color: '#666', textAlign: 'left' }}>
            <li>Frames in your Figma file</li>
            <li>Text layers inside those frames</li>
            <li>Try selecting a frame with text</li>
          </ul>
        </div>
        <button 
          onClick={() => {
            console.log('UI: Manual rescan button clicked');
            parent.postMessage({
              pluginMessage: { type: 'scan-layers' }
            }, '*');
          }}
          style={{
            padding: '8px 16px',
            background: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            marginRight: '8px'
          }}
        >
          Rescan
        </button>
        <button 
          onClick={() => {
            console.log('UI: Test button clicked - adding mock data');
            setLayers([{
              id: 'test-1',
              name: 'Test Layer',
              text: 'Test text with errors',
              frameName: 'Test Frame',
              issues: [{
                id: 'test-issue-1',
                originalText: 'Test text with errors',
                issueText: 'errors',
                suggestion: 'mistakes',
                type: 'grammar' as const,
                confidence: 0.9,
                position: { start: 0, end: 5 },
                layerId: 'test-1',
                layerName: 'Test Layer',
                status: 'pending' as const
              }]
            }]);
          }}
          style={{
            padding: '8px 16px',
            background: '#f59e0b',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Test UI
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