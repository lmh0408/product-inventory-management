import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  handleGoogleSheetExport,
  handleGoogleSheetSave,
  saveErrorResult,
  exportErrorResult,
  type BinaryHttpResult,
  type JsonHttpResult,
} from './googleSheetProxy';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const isProduction = process.env.NODE_ENV === 'production';
const PORT = Number(process.env.PORT) || 3000;
const HOST = '0.0.0.0';

export async function createServer() {
  const app = express();
  app.use(express.json({ limit: '15mb' }));

  // Health check endpoint
  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, timestamp: Date.now() });
  });

  // Google Sheet Save API
  app.post('/api/google-sheet-save', async (req, res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    try {
      const result = await handleGoogleSheetSave(req.body || {});
      res.status(result.status).json(result.json);
    } catch (error) {
      const result = saveErrorResult(error);
      res.status(result.status).json(result.json);
    }
  });

  // Google Sheet Export Proxy API
  app.get('/api/google-sheet/:sheetId', async (req, res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    const rawSheetId = req.params.sheetId || '';
    try {
      const result: JsonHttpResult | BinaryHttpResult = await handleGoogleSheetExport(rawSheetId);
      if ('buffer' in result) {
        res.status(result.status);
        res.setHeader('Content-Type', result.contentType);
        res.end(result.buffer);
        return;
      }
      res.status(result.status).json(result.json);
    } catch (error) {
      const result = exportErrorResult(error);
      res.status(result.status).json(result.json);
    }
  });

  // Frontend Serving
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true, host: HOST, port: PORT },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(rootDir, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  return { app, port: PORT, host: HOST };
}

export async function startServer() {
  const { app, port, host } = await createServer();
  app.listen(port, host, () => {
    console.log(`[Server] Running on http://${host}:${port} (mode: ${isProduction ? 'production' : 'development'})`);
  });
}

// When run directly from CLI
const isDirectCli = process.argv[1] && import.meta.url.endsWith(path.basename(process.argv[1]));
if (isDirectCli) {
  startServer().catch((err) => {
    console.error('[Server] Fatal error starting server:', err);
    process.exit(1);
  });
}

