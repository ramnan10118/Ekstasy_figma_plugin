import { create } from 'zustand';
import { TextLayer, TextIssue, PluginState, ScanProgress, ProcessingProgress } from './types';

interface PluginStore extends PluginState {
  setLayers: (layers: TextLayer[]) => void;
  setScanning: (isScanning: boolean) => void;
  setProcessing: (isProcessing: boolean) => void;
  setViewMode: (mode: 'by-layer' | 'by-text') => void;
  setScanProgress: (progress: ScanProgress) => void;
  setProcessingProgress: (progress: ProcessingProgress) => void;
  addIssuesForLayer: (layerId: string, issues: TextIssue[]) => void;
  initializeLayersForStreaming: (layers: TextLayer[]) => void;
  toggleIssueSelection: (issueId: string) => void;
  selectAllIssues: () => void;
  clearSelection: () => void;
  updateIssueStatus: (layerId: string, issueId: string, status: 'pending' | 'accepted' | 'dismissed') => void;
  undoCorrection: (layerId: string, issueId: string) => TextIssue | null;
  getSelectedIssues: () => TextIssue[];
  getPendingIssuesCount: () => number;
  getAcceptedIssuesCount: () => number;
}

export const usePluginStore = create<PluginStore>((set, get) => ({
  layers: [],
  isScanning: false,
  isProcessing: false,
  viewMode: 'by-layer',
  selectedIssues: [],
  scanProgress: { textCount: 0, frameCount: 0 },
  processingProgress: { completed: 0, total: 0 },

  setLayers: (layers) => set({ layers }),
  
  setScanning: (isScanning) => set({ isScanning }),
  
  setProcessing: (isProcessing) => set({ isProcessing }),
  
  setViewMode: (viewMode) => set({ viewMode }),
  
  setScanProgress: (scanProgress) => set({ scanProgress }),
  
  setProcessingProgress: (processingProgress) => set({ processingProgress }),
  
  initializeLayersForStreaming: (layers) => set({
    layers: layers.map(layer => ({ ...layer, issues: [] }))
  }),
  
  addIssuesForLayer: (layerId, issues) => set((state) => ({
    layers: state.layers.map(layer => 
      layer.id === layerId 
        ? { ...layer, issues: [...layer.issues, ...issues] }
        : layer
    )
  })),
  
  toggleIssueSelection: (issueId) => set((state) => ({
    selectedIssues: state.selectedIssues.includes(issueId)
      ? state.selectedIssues.filter(id => id !== issueId)
      : [...state.selectedIssues, issueId]
  })),
  
  selectAllIssues: () => set((state) => {
    const allIssueIds = state.layers.flatMap(layer => 
      layer.issues.filter(issue => issue.status === 'pending').map(issue => issue.id)
    );
    return { selectedIssues: allIssueIds };
  }),
  
  clearSelection: () => set({ selectedIssues: [] }),
  
  updateIssueStatus: (layerId, issueId, status) => set((state) => ({
    layers: state.layers.map(layer => 
      layer.id === layerId 
        ? {
            ...layer,
            issues: layer.issues.map(issue =>
              issue.id === issueId ? { ...issue, status } : issue
            )
          }
        : layer
    )
  })),
  
  undoCorrection: (layerId, issueId) => {
    const state = get();
    const layer = state.layers.find(l => l.id === layerId);
    const issue = layer?.issues.find(i => i.id === issueId && i.status === 'accepted');
    
    if (issue) {
      // Change status back to pending
      set((state) => ({
        layers: state.layers.map(layer => 
          layer.id === layerId 
            ? {
                ...layer,
                issues: layer.issues.map(i =>
                  i.id === issueId ? { ...i, status: 'pending' as const } : i
                )
              }
            : layer
        )
      }));
      return issue;
    }
    return null;
  },
  
  getSelectedIssues: () => {
    const state = get();
    return state.layers.flatMap(layer => 
      layer.issues.filter(issue => state.selectedIssues.includes(issue.id))
    );
  },
  
  getPendingIssuesCount: () => {
    const state = get();
    return state.layers.reduce((count, layer) => 
      count + layer.issues.filter(issue => issue.status === 'pending').length, 0
    );
  },
  
  getAcceptedIssuesCount: () => {
    const state = get();
    return state.layers.reduce((count, layer) => 
      count + layer.issues.filter(issue => issue.status === 'accepted').length, 0
    );
  }
}));