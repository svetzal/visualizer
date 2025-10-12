const { contextBridge, ipcRenderer } = require('electron');

console.log('[Preload] Loading...');

// Expose screenplay API to renderer
contextBridge.exposeInMainWorld('screenplay', {
  // Listen for server start event
  onServerStarted: (callback: (url: string) => void) => {
    console.log('[Preload] onServerStarted handler registered');
    ipcRenderer.on('server-started', (_: any, url: string) => callback(url));
  },

  // Listen for model updates
  onModelUpdate: (callback: (event: any) => void) => {
    console.log('[Preload] onModelUpdate handler registered');
    ipcRenderer.on('model-updated', (_: any, event: any) => {
      console.log('[Preload] model-updated event received:', event);
      callback(event);
    });
  },

  // Get full model from storage
  getModel: () => {
    console.log('[Preload] getModel called');
    return ipcRenderer.invoke('get-model');
  },

  // Clear all model data
  clearModel: () => {
    console.log('[Preload] clearModel called');
    return ipcRenderer.invoke('clear-model');
  },
});

console.log('[Preload] screenplay API exposed to renderer');

// Type declarations for TypeScript
declare global {
  interface Window {
    screenplay: {
      onServerStarted: (callback: (url: string) => void) => void;
      onModelUpdate: (callback: (event: any) => void) => void;
      getModel: () => Promise<{
        actors: any[];
        goals: any[];
        tasks: any[];
        interactions: any[];
        questions: any[];
        journeys: any[];
      }>;
      clearModel: () => Promise<void>;
    };
  }
}

export {};
