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
    getPendingIssuesCount 
  } = usePluginStore();
  
  console.log('UI: App component state:', { layers: layers.length, isScanning, isProcessing });

  // OpenAI individual processing (more accurate than batch)
  const processTextLayersAsync = async (textLayers: any[]) => {
    console.log('UI: Starting OpenAI individual processing for', textLayers.length, 'layers');
    setProcessing(true);
    
    try {
      // Handle empty layers case
      if (textLayers.length === 0) {
        console.log('UI: No text layers to process');
        setLayers([]);
        setScanning(false);
        setProcessing(false);
        return;
      }
      
      // Use individual OpenAI processing for better accuracy
      console.log('UI: Calling OpenAI individual processor...');
      const processedLayers = await checkTextLayersWithOpenAI(textLayers);
      
      console.log('UI: OpenAI individual processing complete, processed layers:', processedLayers);
      setLayers(processedLayers);
      setScanning(false);
      setProcessing(false);
      console.log('UI: Set layers and stopped scanning/processing');
      
    } catch (error) {
      console.error('UI: OpenAI batch processing failed:', error);
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
          break;
        case 'process-text-layers':
          console.log('UI: Received process-text-layers message:', message.data);
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
            const { updateIssueStatus } = usePluginStore.getState();
            message.data.successfulFixes.forEach((fix: any) => {
              updateIssueStatus(fix.layerId, fix.issueId, 'accepted');
            });
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
    return <LoadingState message="Scanning text layers..." />;
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
      
      {isProcessing && (
        <div className="processing-overlay">
          <LoadingState message="Analyzing each text individually for better accuracy..." />
        </div>
      )}
    </div>
  );
};