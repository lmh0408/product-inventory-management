import fs from 'node:fs';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ZipArchive } from 'archiver';
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

function getProjectRootDir(): string {
  const candidates = [
    process.cwd(),
    path.resolve(__dirname),
    path.resolve(__dirname, '..'),
  ];
  for (const dir of candidates) {
    if (fs.existsSync(path.join(dir, 'package.json'))) {
      return dir;
    }
  }
  return process.cwd();
}

function getDistPath(): string {
  const candidates = [
    path.resolve(process.cwd(), 'dist'),
    path.resolve(__dirname, 'dist'),
    path.resolve(__dirname, '..', 'dist'),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate) && fs.existsSync(path.join(candidate, 'index.html'))) {
      return candidate;
    }
  }
  return fs.existsSync(path.resolve(__dirname, 'dist'))
    ? path.resolve(__dirname, 'dist')
    : path.resolve(process.cwd(), 'dist');
}

export async function createServer() {
  const isProduction = process.env.NODE_ENV === 'production';
  const port = Number(process.env.PORT) || 3000;
  const host = '0.0.0.0';

  const app = express();
  app.use(express.json({ limit: '15mb' }));

  // Health check endpoint
  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, timestamp: Date.now() });
  });

  // Source Code Zip Download API
  app.get('/api/download-source', async (_req, res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    try {
      const projectRoot = getProjectRootDir();
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const filename = `product-inventory-management-src-${dateStr}.zip`;

      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

      const archive = new ZipArchive({
        zlib: { level: 9 },
      });

      archive.on('error', (err: unknown) => {
        console.error('[Download Source] Archive error:', err);
        if (!res.headersSent) {
          res.status(500).json({ error: '소스 코드 압축 중 오류가 발생했습니다.' });
        }
      });

      archive.pipe(res);

      archive.glob('**/*', {
        cwd: projectRoot,
        ignore: [
          'node_modules/**',
          'dist/**',
          '.git/**',
          '.aistudio/**',
          'server.prod.mjs',
          '**/*.log',
          '.DS_Store',
        ],
        dot: true,
      });

      await archive.finalize();
    } catch (error) {
      console.error('[Download Source] Fatal error:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: '소스 코드 다운로드 생성에 실패했습니다.' });
      }
    }
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
  const distPath = getDistPath();
  const isDev = !isProduction && process.env.npm_lifecycle_event === 'dev';

  if (isDev) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true, host, port },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    console.log(`[Server] Production mode: serving static files from ${distPath}`);
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      const indexPath = path.resolve(distPath, 'index.html');
      res.sendFile(indexPath, (err) => {
        if (err && !res.headersSent) {
          console.error('[Server] Failed to send index.html from path:', indexPath, err);
          res.status(500).send('Application Error: unable to serve static index.html');
        }
      });
    });
  }

  return { app, port, host };
}

export async function startServer() {
  const { app, port, host } = await createServer();
  const isProduction = process.env.NODE_ENV === 'production';
  return new Promise((resolve) => {
    app.listen(port, host, () => {
      console.log(`[Server] Running on http://${host}:${port} (mode: ${isProduction ? 'production' : 'development'})`);
      resolve(app);
    });
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

