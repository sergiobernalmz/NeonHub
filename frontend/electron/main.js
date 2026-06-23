const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')
const crypto = require('crypto')
const Store = require('electron-store')

const machineKey = crypto
  .createHash('sha256')
  .update(app.getPath('userData'))
  .digest('hex')
const store = new Store({ encryptionKey: machineKey })

const isDev = process.env.NODE_ENV === 'development'
const BACKEND_URL = process.env.BACKEND_URL || 'https://api.neonhub.es'

let mainWindow = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 640,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webviewTag: true,
    },
    autoHideMenuBar: true,
    icon: app.isPackaged
      ? path.join(process.resourcesPath, 'icon.ico')
      : path.join(__dirname, '../public/icon.ico'),
    title: 'NeonHub Desktop',
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  mainWindow.on('closed', () => { mainWindow = null })
}

// ── IPC: almacén de JWT ─────────────────────────────────────────────────────
ipcMain.handle('store:get', (_, key) => store.get(key))
ipcMain.handle('store:set', (_, key, value) => store.set(key, value))
ipcMain.handle('store:delete', (_, key) => store.delete(key))
ipcMain.handle('store:clear', () => store.clear())

// ── IPC: configuración ──────────────────────────────────────────────────────
ipcMain.handle('config:backendUrl', () => BACKEND_URL)

// ── IPC: versión de la app ──────────────────────────────────────────────────
ipcMain.handle('get-app-version', () => app.getVersion())

// ── Actualizaciones automáticas ─────────────────────────────────────────────
// solo lo cargamos en producción, en dev electron-updater falla
if (!isDev) {
  const { autoUpdater } = require('electron-updater')

  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = true

  let pendingUpdate = null

  autoUpdater.on('update-available', (info) => {
    pendingUpdate = { version: info.version, releaseNotes: info.releaseNotes }
    if (mainWindow) {
      mainWindow.webContents.send('update-available', pendingUpdate)
    }
  })

  ipcMain.handle('get-pending-update', () => pendingUpdate)

  autoUpdater.on('download-progress', (progress) => {
    console.log(`[AutoUpdater] Descargando: ${progress.percent.toFixed(1)}% — ${(progress.bytesPerSecond / 1024 / 1024).toFixed(2)} MB/s`)
    if (mainWindow) {
      mainWindow.webContents.send('download-progress', {
        percent: Math.round(progress.percent),
        bytesPerSecond: progress.bytesPerSecond,
        transferred: progress.transferred,
        total: progress.total,
      })
    }
  })

  autoUpdater.on('update-downloaded', () => {
    if (mainWindow) {
      mainWindow.webContents.send('update-downloaded')
    }
  })

  autoUpdater.on('error', (err) => {
    console.error('[AutoUpdater] Error:', err.message)
    if (mainWindow) {
      mainWindow.webContents.send('update-error', err.message)
    }
  })

  autoUpdater.on('update-not-available', () => {
    console.log('[AutoUpdater] La app está actualizada')
    if (mainWindow) {
      mainWindow.webContents.send('update-not-available')
    }
  })

  ipcMain.on('check-for-updates', () => {
    autoUpdater.checkForUpdates().catch(err =>
      console.error('[AutoUpdater] Manual check failed:', err.message)
    )
  })

  ipcMain.on('download-update', () => autoUpdater.downloadUpdate())
  ipcMain.on('install-update', () => autoUpdater.quitAndInstall(false, true))

  const checkUpdates = () => {
    console.log('[AutoUpdater] Comprobando actualizaciones...')
    autoUpdater.checkForUpdates().catch(err => {
      console.error('[AutoUpdater] checkForUpdates failed:', err.message)
    })
  }

  app.whenReady().then(() => {
    setTimeout(checkUpdates, 3000)
    setInterval(checkUpdates, 60 * 60 * 1000) // comprobamos cada hora
  })
}

// ── Ciclo de vida de la app ─────────────────────────────────────────────────
app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})
