const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  checkHealth: () => ipcRenderer.invoke('check-health'),
  loadModel: () => ipcRenderer.invoke('load-model'),
  generate: (data) => ipcRenderer.invoke('generate', data),
});