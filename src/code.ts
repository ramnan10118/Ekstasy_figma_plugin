import { TextLayer, PluginMessage } from './types';

// Show the plugin UI
figma.showUI(__html__, { 
  width: 400, 
  height: 600,
  themeColors: true 
});

// Note: Removed auto-rescan on selection change to preserve issue list when jumping to layers
// Users can manually rescan using the "Check Layers" button if needed

// API key is now embedded at build time

// Function to extract text layers from frames (or selected frame)
function extractTextLayers(): TextLayer[] {
  const textLayers: TextLayer[] = [];
  
  function traverse(node: SceneNode, parentFrameName?: string) {
    if (node.type === 'TEXT') {
      textLayers.push({
        id: node.id,
        name: node.name,
        text: node.characters,
        issues: [],
        frameName: parentFrameName || 'No Frame'
      });
    }
    
    if ('children' in node) {
      const frameName = node.type === 'FRAME' ? node.name : parentFrameName;
      node.children.forEach(child => traverse(child, frameName));
    }
  }
  
  // Always scan all frames on the page for consistent behavior
  // This ensures "Check Layers" button always finds all issues regardless of selection
  figma.currentPage.children.forEach(node => {
    if (node.type === 'FRAME') {
      traverse(node, node.name);
    }
  });
  
  return textLayers;
}

// Simple and reliable text replacement function
function applyTextFix(layerId: string, suggestion: string, issueText: string) {
  const node = figma.getNodeById(layerId);
  if (node && node.type === 'TEXT') {
    // Load the font before changing text
    figma.loadFontAsync(node.fontName as FontName).then(() => {
      const currentText = (node as TextNode).characters;
      
      console.log('Applying text fix:', {
        currentText: currentText,
        issueText: issueText,
        suggestion: suggestion
      });
      
      // Simple direct replacement - find exact issue text and replace with suggestion
      if (currentText.includes(issueText)) {
        const newText = currentText.replace(issueText, suggestion);
        console.log('Replacement successful:', {
          original: currentText,
          new: newText
        });
        (node as TextNode).characters = newText;
      } else {
        console.error('Issue text not found in current text:', {
          issueText,
          currentText
        });
      }
    }).catch(err => {
      console.error('Failed to load font:', err);
    });
  }
}

// Function to jump to a specific layer
function jumpToLayer(layerId: string) {
  const node = figma.getNodeById(layerId);
  if (node) {
    figma.currentPage.selection = [node as SceneNode];
    figma.viewport.scrollAndZoomIntoView([node as SceneNode]);
  }
}

// Main scanning function - sends text to UI for AI processing
function scanTextLayers() {
  console.log('scanTextLayers called');
  
  figma.ui.postMessage({
    type: 'scan-started'
  });

  const textLayers = extractTextLayers();
  
  console.log('Found text layers:', textLayers);
  console.log('Selection:', figma.currentPage.selection);
  console.log('Page children count:', figma.currentPage.children.length);
  
  // Test message first
  console.log('Sending test message to UI...');
  figma.ui.postMessage({
    type: 'test-message',
    data: { test: 'hello from main thread' }
  });
  
  // Send text layers to UI for AI processing
  console.log('Sending process-text-layers message to UI...');
  figma.ui.postMessage({
    type: 'process-text-layers',
    data: { layers: textLayers }
  });
}

// Handle messages from the UI
figma.ui.onmessage = (message: PluginMessage) => {
  console.log('Main: Received message from UI:', message.type);
  
  switch (message.type) {
    case 'ui-ready':
      console.log('Main: UI is ready, starting initial scan');
      scanTextLayers();
      break;
    case 'scan-layers':
      scanTextLayers();
      break;
      
    case 'jump-to-layer':
      jumpToLayer(message.data.layerId);
      break;
      
    case 'apply-fix':
      applyTextFix(message.data.layerId, message.data.suggestion, message.data.issueText);
      break;
      
    case 'apply-bulk-fix':
      for (const fix of message.data.fixes) {
        applyTextFix(fix.layerId, fix.suggestion, fix.issueText);
      }
      figma.ui.postMessage({
        type: 'bulk-fix-complete'
      });
      break;
      
    case 'close':
      figma.closePlugin();
      break;
  }
};