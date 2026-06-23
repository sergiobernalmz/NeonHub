const { contextBridge, ipcRenderer, shell } = require('electron')

contextBridge.exposeInMainWorld('electron', {
  isElectron: true,
  backendUrl: process.env.BACKEND_URL || 'https://api.neonhub.es',
  store: {
    get: (key) => ipcRenderer.invoke('store:get', key),
    set: (key, value) => ipcRenderer.invoke('store:set', key, value),
    delete: (key) => ipcRenderer.invoke('store:delete', key),
    clear: () => ipcRenderer.invoke('store:clear'),
  },
  config: {
    getBackendUrl: () => ipcRenderer.invoke('config:backendUrl'),
  },
  openExternal: (url) => shell.openExternal(url),
  // Auto-updater
  getPendingUpdate: () => ipcRenderer.invoke('get-pending-update'),
  onUpdateAvailable: (callback) => {
    const handler = (_, data) => callback(data)
    ipcRenderer.on('update-available', handler)
    return () => ipcRenderer.removeListener('update-available', handler)
  },
  onDownloadProgress: (callback) =>
    ipcRenderer.on('download-progress', (_, data) => callback(data)),
  onUpdateDownloaded: (callback) =>
    ipcRenderer.on('update-downloaded', () => callback()),
  downloadUpdate: () => ipcRenderer.send('download-update'),
  installUpdate: () => ipcRenderer.send('install-update'),
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  checkForUpdates: () => ipcRenderer.send('check-for-updates'),
  onUpdateNotAvailable: (callback) => {
    const handler = () => callback()
    ipcRenderer.on('update-not-available', handler)
    return () => ipcRenderer.removeListener('update-not-available', handler)
  },
  onUpdateError: (callback) => {
    const handler = (_, msg) => callback(msg)
    ipcRenderer.on('update-error', handler)
    return () => ipcRenderer.removeListener('update-error', handler)
  },
})
