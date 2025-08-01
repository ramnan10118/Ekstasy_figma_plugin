import React, { useEffect } from 'react';
import { usePluginStore } from '../store';
import { Header } from './Header';
import { IssuesList } from './IssuesList';
import { LoadingState } from './LoadingState';
import { EmptyState } from './EmptyState';
import { BulkActions } from './BulkActions';
import { checkTextWithLanguageTool } from '../ai-service';
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

  // Simple individual processing function for LanguageTool
  const processTextLayersAsync = async (textLayers: any[]) => {
    console.log('UI: Starting LanguageTool processing for', textLayers.length, 'layers');
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
      
      // Initialize all layers with empty issues
      textLayers.forEach(layer => {
        layer.issues = [];
      });
      
      // Process each text layer individually (LanguageTool is fast enough!)
      for (const layer of textLayers) {
        if (layer.text && layer.text.trim()) {
          console.log('UI: Processing layer with LanguageTool:', layer.name, 'Text:', layer.text.substring(0, 50) + '...');
          try {
            const issues = await checkTextWithLanguageTool(layer.text);
            console.log('UI: LanguageTool returned issues for layer:', layer.name, issues);
            
            // Convert issues to TextIssue format
            layer.issues = issues.map(issue => ({
              ...issue,
              layerId: layer.id,
              layerName: layer.name,
              status: 'pending' as const
            }));
            
            console.log('UI: Added LanguageTool issues to layer:', layer.name, layer.issues.length);
          } catch (error) {
            console.error('UI: LanguageTool processing failed for layer:', layer.name, error);
            // Keep empty issues array on error
            layer.issues = [];
          }
        } else {
          console.log('UI: Skipping layer with no text:', layer.name);
        }
      }
      
      console.log('UI: All layers processed, final layers:', textLayers);
      setLayers(textLayers);
      setScanning(false);
      setProcessing(false);
      console.log('UI: Set layers and stopped scanning/processing');
      
    } catch (error) {
      console.error('UI: Overall LanguageTool processing failed:', error);
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
          setProcessing(false);
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
          <LoadingState message="Checking grammar and spelling..." />
        </div>
      )}
    </div>
  );
};