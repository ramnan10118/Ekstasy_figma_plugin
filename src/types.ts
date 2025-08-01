export interface TextIssue {
  id: string;
  layerId: string;
  layerName: string;
  originalText: string;
  issueText: string;
  suggestion: string;
  type: 'grammar' | 'spelling' | 'style';
  confidence: number;
  position: {
    start: number;
    end: number;
  };
  status: 'pending' | 'accepted' | 'dismissed';
}

export interface TextLayer {
  id: string;
  name: string;
  text: string;
  issues: TextIssue[];
  frameName?: string;
}

export interface PluginMessage {
  type: string;
  data?: any;
}

export interface ScanLayersMessage extends PluginMessage {
  type: 'scan-layers';
}

export interface JumpToLayerMessage extends PluginMessage {
  type: 'jump-to-layer';
  data: {
    layerId: string;
  };
}

export interface ApplyFixMessage extends PluginMessage {
  type: 'apply-fix';
  data: {
    layerId: string;
    issueId: string;
    newText: string;
  };
}

export interface ApplyBulkFixMessage extends PluginMessage {
  type: 'apply-bulk-fix';
  data: {
    fixes: Array<{
      layerId: string;
      issueId: string;
      newText: string;
    }>;
  };
}

export interface ProcessTextLayersMessage extends PluginMessage {
  type: 'process-text-layers';
  data: {
    layers: TextLayer[];
  };
}

export interface ScanCompleteMessage extends PluginMessage {
  type: 'scan-complete';
  data: {
    layers: TextLayer[];
  };
}

export interface PluginState {
  layers: TextLayer[];
  isScanning: boolean;
  isProcessing: boolean;
  viewMode: 'by-layer' | 'by-text';
  selectedIssues: string[];
}