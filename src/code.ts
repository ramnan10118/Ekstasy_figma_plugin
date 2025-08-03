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

// Function to extract ALL text layers from the entire page
function extractTextLayers(): TextLayer[] {
  const textLayers: TextLayer[] = [];
  let scannedNodeCounts: Record<string, number> = {
    FRAME: 0,
    GROUP: 0,
    COMPONENT: 0,
    INSTANCE: 0,
    SECTION: 0,
    TEXT: 0,
    BOOLEAN_OPERATION: 0,
    VECTOR: 0,
    STAR: 0,
    LINE: 0,
    ELLIPSE: 0,
    POLYGON: 0,
    RECTANGLE: 0,
    SLICE: 0,
    OTHER: 0
  };
  
  function getContainerName(node: SceneNode): string {
    // Determine the best name to use for this container
    if (node.type === 'FRAME') return node.name;
    if (node.type === 'GROUP') return `Group: ${node.name}`;
    if (node.type === 'COMPONENT') return `Component: ${node.name}`;
    if (node.type === 'INSTANCE') return `Instance: ${node.name}`;
    if (node.type === 'SECTION') return `Section: ${node.name}`;
    return node.name || 'Unnamed Container';
  }
  
  function traverse(node: SceneNode, parentContainerName?: string, depth: number = 0) {
    const indent = '  '.repeat(depth);
    console.log(`${indent}Scanning ${node.type}: "${node.name}" (id: ${node.id})`);
    
    // Count what types of nodes we're scanning
    if (node.type in scannedNodeCounts) {
      scannedNodeCounts[node.type]++;
    } else {
      scannedNodeCounts.OTHER++;
      console.log(`${indent}  ⚠️ Unknown node type: ${node.type}`);
    }
    
    // Found a text layer - add it to our collection
    if (node.type === 'TEXT') {
      const textContent = (node as TextNode).characters;
      console.log(`${indent}  ✓ Found TEXT: "${textContent}" in container: ${parentContainerName}`);
      textLayers.push({
        id: node.id,
        name: node.name,
        text: textContent,
        issues: [],
        frameName: parentContainerName || 'Page Root'
      });
      
      // Send progress update to UI
      figma.ui.postMessage({
        type: 'scan-progress',
        data: {
          textCount: textLayers.length,
          frameCount: scannedNodeCounts.FRAME
        }
      });
      
      return; // Text nodes don't have children, so we can return early
    }
    
    // Special handling for component instances
    if (node.type === 'INSTANCE') {
      console.log(`${indent}  🔍 Special INSTANCE handling for: "${node.name}"`);
      const instanceNode = node as InstanceNode;
      
      // Try to access children directly
      if (instanceNode.children && instanceNode.children.length > 0) {
        const containerName = getContainerName(node);
        console.log(`${indent}  → Traversing ${instanceNode.children.length} children in INSTANCE: "${node.name}"`);
        
        instanceNode.children.forEach((child: SceneNode) => {
          try {
            traverse(child, containerName, depth + 1);
          } catch (error) {
            console.error(`${indent}  ✗ Error traversing INSTANCE child ${child.id}:`, error);
          }
        });
      } else {
        console.log(`${indent}  ○ INSTANCE has no accessible children: "${node.name}"`);
      }
      return; // Important: return after handling instance
    }
    
    // Recursively traverse any other node that can contain children
    const isContainer = node.type === 'FRAME' || 
                       node.type === 'GROUP' || 
                       node.type === 'COMPONENT' || 
                       node.type === 'SECTION' ||
                       node.type === 'BOOLEAN_OPERATION';
    
    if (isContainer && 'children' in node) {
      const children = (node as any).children;
      if (children && children.length > 0) {
        const containerName = getContainerName(node);
        console.log(`${indent}  → Traversing ${children.length} children of ${node.type}: "${node.name}"`);
        
        // Handle both array and readonly array types
        const childrenArray = Array.isArray(children) ? children : Array.from(children);
        childrenArray.forEach((child: SceneNode) => {
          try {
            traverse(child, containerName, depth + 1);
          } catch (error) {
            console.error(`${indent}  ✗ Error traversing child ${child.id}:`, error);
          }
        });
      } else {
        console.log(`${indent}  ○ No children in ${node.type}: "${node.name}"`);
      }
    } else if ('children' in node) {
      console.log(`${indent}  ○ Node has children property but is not a recognized container: ${node.type}`);
    } else {
      console.log(`${indent}  ○ Node type ${node.type} cannot have children`);
    }
  }
  
  // Scan ALL children on the current page, regardless of type
  // This includes frames, groups, components, sections, and loose text layers
  console.log('Starting comprehensive page scan...');
  figma.currentPage.children.forEach(node => {
    traverse(node);
  });
  
  // Log what we found for debugging
  console.log('=== SCAN COMPLETE ===');
  console.log('Node counts:', scannedNodeCounts);
  console.log(`Found ${textLayers.length} text layers total`);
  
  if (textLayers.length > 0) {
    console.log('Text layers found:');
    textLayers.forEach((layer, index) => {
      console.log(`  ${index + 1}. "${layer.text}" (${layer.name}) in ${layer.frameName}`);
    });
  } else {
    console.log('⚠️ No text layers found! This might indicate a scanning issue.');
  }
  
  return textLayers;
}

// Single fix handler
async function handleSingleFix(layerId: string, issueId: string, suggestion: string, issueText: string) {
  console.log('Main: Starting single fix for issue:', issueId, 'on layer:', layerId);
  
  try {
    const success = await applyTextFixAsync(layerId, suggestion, issueText);
    
    if (success) {
      console.log('Single fix successful for issue:', issueId);
      figma.ui.postMessage({
        type: 'fix-complete',
        data: { 
          success: true,
          layerId,
          issueId
        }
      });
    } else {
      console.log('Single fix failed for issue:', issueId);
      figma.ui.postMessage({
        type: 'fix-complete',
        data: { 
          success: false,
          layerId,
          issueId
        }
      });
    }
  } catch (error) {
    console.error('Single fix error for issue:', issueId, error);
    figma.ui.postMessage({
      type: 'fix-complete',
      data: { 
        success: false,
        layerId,
        issueId
      }
    });
  }
}

// Async bulk fix handler
async function handleBulkFix(fixes: any[]) {
  console.log('Main: Starting bulk fix for', fixes.length, 'issues');
  console.log('Main: Fixes data:', fixes);
  
  let successCount = 0;
  let failCount = 0;
  const successfulFixes = [];
  
  for (const fix of fixes) {
    try {
      const success = await applyTextFixAsync(fix.layerId, fix.suggestion, fix.issueText);
      if (success) {
        successCount++;
        successfulFixes.push({
          layerId: fix.layerId,
          issueId: fix.issueId
        });
      } else {
        failCount++;
      }
    } catch (error) {
      console.error('Bulk fix error for', fix.layerId, error);
      failCount++;
    }
  }
  
  console.log('Bulk fix complete:', { successCount, failCount, successfulFixes });
  
  figma.ui.postMessage({
    type: 'bulk-fix-complete',
    data: { 
      successCount, 
      failCount, 
      total: fixes.length,
      successfulFixes 
    }
  });
}

// Undo fix handler
async function handleUndoFix(layerId: string, issueId: string, originalText: string, suggestion: string, issueText: string) {
  try {
    // To undo: replace the suggestion back with the original issue text
    const success = await applyTextFixAsync(layerId, issueText, suggestion);
    
    figma.ui.postMessage({
      type: 'undo-complete',
      data: { 
        success,
        layerId,
        issueId
      }
    });
  } catch (error) {
    figma.ui.postMessage({
      type: 'undo-complete',
      data: { 
        success: false,
        layerId,
        issueId
      }
    });
  }
}

// Async version of text replacement function
async function applyTextFixAsync(layerId: string, suggestion: string, issueText: string): Promise<boolean> {
  const node = figma.getNodeById(layerId);
  if (!node || node.type !== 'TEXT') {
    console.error('Node not found or not text:', layerId);
    return false;
  }

  try {
    const textNode = node as TextNode;
    const currentText = textNode.characters;
    
    // Handle font loading more robustly
    try {
      console.log('Loading font for node:', textNode.fontName);
      
      // For mixed fonts, we need to get all unique fonts used in the text
      if (typeof textNode.fontName === 'symbol') {
        console.log('Mixed font detected, loading all fonts in text range');
        
        // Get all unique fonts in the text
        const fonts = new Set<FontName>();
        for (let i = 0; i < currentText.length; i++) {
          const font = textNode.getRangeFontName(i, i + 1) as FontName;
          if (typeof font !== 'symbol') {
            fonts.add(font);
          }
        }
        
        // Load all unique fonts
        for (const font of fonts) {
          await figma.loadFontAsync(font);
        }
      } else {
        // Single font, load it directly
        await figma.loadFontAsync(textNode.fontName as FontName);
      }
    } catch (fontError) {
      console.warn('Font loading failed, trying with default font:', fontError);
      // Try loading a default font
      try {
        await figma.loadFontAsync({ family: "Inter", style: "Regular" });
      } catch (defaultFontError) {
        console.error('Even default font failed:', defaultFontError);
        // Continue anyway, sometimes text can still be modified
      }
    }
    
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
      return true;
    } else {
      console.error('Issue text not found in current text:', {
        issueText,
        currentText
      });
      return false;
    }
  } catch (err) {
    console.error('Failed to load font or apply fix:', err);
    return false;
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
      if (message.data && message.data.layerId) {
        jumpToLayer(message.data.layerId);
      }
      break;
      
    case 'apply-fix':
      if (message.data && message.data.layerId && message.data.issueId) {
        handleSingleFix(message.data.layerId, message.data.issueId, message.data.suggestion, message.data.issueText);
      }
      break;
      
    case 'apply-bulk-fix':
      if (message.data && message.data.fixes) {
        handleBulkFix(message.data.fixes);
      }
      break;
      
    case 'undo-fix':
      if (message.data && message.data.layerId && message.data.issueId) {
        handleUndoFix(message.data.layerId, message.data.issueId, message.data.originalText, message.data.suggestion, message.data.issueText);
      }
      break;
      
    case 'close':
      figma.closePlugin();
      break;
  }
};