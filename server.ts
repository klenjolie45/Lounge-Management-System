import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { applySyncOperation, INITIAL_CLOUD_STATE } from './src/data/initialData.ts';
import { CloudSystemState, SyncOperation } from './src/types/lounge.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_FILE = path.join(__dirname, 'cloud-db.json');

function loadCloudState(): CloudSystemState {
  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(raw) as CloudSystemState;
      let modified = false;
      if (!parsed.settings) {
        parsed.settings = JSON.parse(JSON.stringify(INITIAL_CLOUD_STATE.settings));
        modified = true;
      }
      if (!parsed.users || parsed.users.length === 0) {
        parsed.users = JSON.parse(JSON.stringify(INITIAL_CLOUD_STATE.users));
        modified = true;
      }
      if (!parsed.activeUserId) {
        parsed.activeUserId = INITIAL_CLOUD_STATE.activeUserId;
        modified = true;
      }
      if (!parsed.suppliers || parsed.suppliers.length === 0) {
        parsed.suppliers = JSON.parse(JSON.stringify(INITIAL_CLOUD_STATE.suppliers));
        modified = true;
      }
      if (!parsed.purchaseOrders || parsed.purchaseOrders.length === 0) {
        parsed.purchaseOrders = JSON.parse(JSON.stringify(INITIAL_CLOUD_STATE.purchaseOrders));
        modified = true;
      }
      if (modified) {
        saveCloudState(parsed);
      }
      return parsed;
    }
  } catch (err) {
    console.error('Failed to read cloud-db.json, initializing fresh state:', err);
  }
  const initial = JSON.parse(JSON.stringify(INITIAL_CLOUD_STATE)) as CloudSystemState;
  saveCloudState(initial);
  return initial;
}

function saveCloudState(state: CloudSystemState): void {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(state, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to persist cloud-db.json:', err);
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '5mb' }));

  let cloudState: CloudSystemState = loadCloudState();

  // GET /api/state - Retrieve authoritative cloud state
  app.get('/api/state', (_req, res) => {
    res.json({
      state: cloudState,
      serverTimestamp: new Date().toISOString(),
    });
  });

  // POST /api/sync - Reconcile offline / client operations with the cloud database
  app.post('/api/sync', (req, res) => {
    const { deviceId = 'Terminal-POS-01', operations = [] } = req.body as {
      deviceId?: string;
      operations?: SyncOperation[];
    };

    if (!Array.isArray(operations)) {
      res.status(400).json({ error: 'operations must be an array' });
      return;
    }

    let appliedCount = 0;
    const descriptions: string[] = [];

    for (const op of operations) {
      if (!cloudState.appliedOperationIds.includes(op.id)) {
        cloudState = applySyncOperation(cloudState, op);
        appliedCount += 1;
        if (op.description) {
          descriptions.push(op.description);
        }
      }
    }

    if (appliedCount > 0) {
      cloudState.syncLog.unshift({
        id: `sync-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        syncedAt: new Date().toISOString(),
        deviceId,
        operationsCount: appliedCount,
        summary:
          descriptions.length === 1
            ? descriptions[0]
            : `Synchronized ${appliedCount} queued operations (${descriptions.slice(0, 2).join('; ')})`,
      });
      cloudState.syncLog = cloudState.syncLog.slice(0, 40);
      saveCloudState(cloudState);
    }

    res.json({
      state: cloudState,
      appliedCount,
      serverTimestamp: new Date().toISOString(),
    });
  });

  // POST /api/reset-demo - Reset cloud state to initial lounge & bistro dataset
  app.post('/api/reset-demo', (_req, res) => {
    cloudState = JSON.parse(JSON.stringify(INITIAL_CLOUD_STATE));
    cloudState.lastUpdated = new Date().toISOString();
    saveCloudState(cloudState);
    res.json({
      state: cloudState,
      serverTimestamp: new Date().toISOString(),
    });
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Lounge Management system server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
