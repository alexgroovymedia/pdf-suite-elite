const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  openFileDialog(filters) {
    return ipcRenderer.invoke('open-file-dialog', filters);
  },
  openFolderDialog() {
    return ipcRenderer.invoke('open-folder-dialog');
  },
  readFileBytes(filePath) {
    return ipcRenderer.invoke('read-file-bytes', filePath);
  },
  convertToPdf(job) {
    return ipcRenderer.invoke('convert-to-pdf', job);
  },
  convertFromPdf(job) {
    return ipcRenderer.invoke('convert-from-pdf', job);
  },
  savePngBytes(filename, bytes) {
    return ipcRenderer.invoke('save-png-bytes', filename, bytes);
  },
  openPathInExplorer(dirPath) {
    return ipcRenderer.invoke('open-path-in-explorer', dirPath);
  },
  getSettings() {
    return ipcRenderer.invoke('get-settings');
  },
  setSettings(settings) {
    return ipcRenderer.invoke('set-settings', settings);
  },
  getAppVersion() {
    return ipcRenderer.invoke('get-app-version');
  },
  getThirdPartyNoticesText() {
    return ipcRenderer.invoke('get-third-party-notices-text');
  },
});
