console.log('[Main] Starting imports...');

import { app, BrowserWindow, ipcMain } from 'electron';

console.log('[Main] Electron imported');

import { FastMCP } from 'fastmcp';

console.log('[Main] FastMCP imported');

import * as path from 'path';
import { fileURLToPath } from 'url';
import { promises as fs } from 'fs';
import { JSONStorage } from './lib/storage.js';
import { registerTools } from './mcp-server/tools.js';

console.log('[Main] All imports complete');

// Helper for file logging to debug console output issues
const logFile = '/tmp/screenplay-debug.log';
async function debugLog(message: string) {
  const timestamp = new Date().toISOString();
  const logMessage = `${timestamp} - ${message}\n`;
  console.log(message); // Also log to console
  try {
    await fs.appendFile(logFile, logMessage);
  } catch (e) {
    // Ignore file errors
  }
}

// ES Module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow: BrowserWindow | null = null;
let storage: JSONStorage;
let server: FastMCP;
let serverPort: number;

async function findAvailablePort(startPort: number): Promise<number> {
  // For Phase 1, we'll just use the start port
  // In production, you'd want to check if port is available
  return startPort;
}

async function createWindow(): Promise<void> {
  mainWindow = new BrowserWindow({
    width: 1920,
    height: 1080,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Load the renderer
  const htmlPath = path.join(__dirname, '../renderer/index.html');
  console.log(`[Main] Loading HTML from: ${htmlPath}`);

  try {
    await mainWindow.loadFile(htmlPath);
    console.log('[Main] HTML loaded successfully');
  } catch (error) {
    console.error('[Main] Failed to load HTML:', error);
    throw error;
  }

  // Open DevTools to debug (always open for now)
  mainWindow.webContents.openDevTools();

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

async function initializeApp() {
  await debugLog('[Main] ============ INITIALIZING APP ============');
  console.log('[Main] Initializing application...');
  try {
    // Initialize storage
    const dataPath = path.join(app.getPath('userData'), '.screenplay');
    await debugLog(`[Main] Storage path: ${dataPath}`);
    console.log(`[Main] Storage path: ${dataPath}`);
    storage = new JSONStorage(dataPath);
    await debugLog('[Main] JSONStorage created, initializing...');
    console.log('[Main] JSONStorage created, initializing...');
    await storage.initialize();
    await debugLog('[Main] Storage initialized');
    console.log('[Main] Storage initialized');

    // Register IPC handlers (must be after storage initialization)
    await debugLog('[Main] Registering IPC handlers...');
    console.log('[Main] Registering IPC handlers...');
    ipcMain.handle('get-model', async () => {
      try {
        const actors = await storage.getAll('actor');
        const goals = await storage.getAll('goal');
        const tasks = await storage.getAll('task');
        const interactions = await storage.getAll('interaction');
        const questions = await storage.getAll('question');
        const journeys = await storage.getAll('journey');

        return {
          actors,
          goals,
          tasks,
          interactions,
          questions,
          journeys,
        };
      } catch (error) {
        console.error('[Main] Failed to get model:', error);
        throw error;
      }
    });

    ipcMain.handle('clear-model', async () => {
      try {
        console.log('[Main] Clearing all model data...');
        await storage.clear();
        console.log('[Main] Model cleared successfully');
      } catch (error) {
        console.error('[Main] Failed to clear model:', error);
        throw error;
      }
    });
    console.log('[Main] IPC handlers registered');

    // Start MCP server
    console.log('[Main] Creating MCP server...');
    server = new FastMCP({
      name: 'screenplay-server',
      version: '1.0.0',
    });
    console.log('[Main] MCP server created');

    console.log('[Main] Registering tools...');
    registerTools(server, storage);
    console.log('[Main] Tools registered');

    serverPort = await findAvailablePort(3000);
    console.log(`[Main] Starting server on port ${serverPort}...`);
    const httpStreamConfig: any = {
      endpoint: '/mcp',
      port: serverPort,
      stateless: true, // Enable stateless mode for testing
    };
    await server.start({
      transportType: 'httpStream',
      httpStream: httpStreamConfig,
    });
    console.log(`[Main] MCP Server started on port ${serverPort} (stateless mode)`);

    // Create window
    console.log('[Main] Creating window...');
    await createWindow();
    console.log('[Main] Window created');

    // Forward storage events to renderer
    storage.on('change', (event) => {
      console.log('[Main] Storage change event:', event);
      if (mainWindow && !mainWindow.isDestroyed()) {
        console.log('[Main] Forwarding to renderer via IPC');
        mainWindow.webContents.send('model-updated', event);
      } else {
        console.log('[Main] Window not available, event not forwarded');
      }
    });

    // Send server URL to renderer (window just finished loading)
    if (mainWindow && !mainWindow.isDestroyed()) {
      console.log(`[Main] Sending server URL to renderer: http://localhost:${serverPort}/mcp`);
      mainWindow.webContents.send('server-started', `http://localhost:${serverPort}/mcp`);
    }

    console.log('[Main] Application ready');
  } catch (error) {
    console.error('[Main] Failed to start application:', error);
    console.error(error);
    app.quit();
  }
}

// Handle both cases: app already ready or waiting for ready event
if (app.isReady()) {
  console.log('[Main] App already ready, initializing immediately');
  initializeApp();
} else {
  console.log('[Main] Registering ready event handler');
  app.on('ready', initializeApp);
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', async () => {
  if (mainWindow === null) {
    await createWindow();
  }
});

// Graceful shutdown
app.on('before-quit', async () => {
  if (server) {
    await server.stop();
  }
});
