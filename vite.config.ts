import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import type {IncomingMessage, ServerResponse} from 'http';
import path from 'path';
import {defineConfig, type Plugin} from 'vite';
import {
  exportErrorResult,
  handleGoogleSheetExport,
  handleGoogleSheetSave,
  saveErrorResult,
  type BinaryHttpResult,
  type JsonHttpResult,
} from './server/googleSheetProxy';

function readJsonBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    req.on('end', () => {
      try {
        const raw = Buffer.concat(chunks).toString('utf8');
        resolve(raw ? (JSON.parse(raw) as Record<string, unknown>) : {});
      } catch (error) {
        reject(error);
      }
    });
    req.on('error', reject);
  });
}

function writeJson(res: ServerResponse, result: JsonHttpResult) {
  res.statusCode = result.status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(result.json));
}

function writeProxyResult(res: ServerResponse, result: JsonHttpResult | BinaryHttpResult) {
  if ('buffer' in result) {
    res.statusCode = result.status;
    res.setHeader('Content-Type', result.contentType);
    res.end(result.buffer);
    return;
  }
  writeJson(res, result);
}

function googleSheetProxy(): Plugin {
  return {
    name: 'google-sheet-proxy',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const pathName = req.url?.split('?')[0] || '';

        if (pathName === '/api/google-sheet-save' && req.method === 'POST') {
          void (async () => {
            const body = await readJsonBody(req);
            try {
              writeJson(res, await handleGoogleSheetSave(body));
            } catch (error) {
              writeJson(res, saveErrorResult(error));
            }
          })();
          return;
        }

        if (!req.url?.startsWith('/api/google-sheet/')) {
          next();
          return;
        }

        void (async () => {
          const sheetId = decodeURIComponent(
            req.url!.replace('/api/google-sheet/', '').split('?')[0] || '',
          );
          try {
            writeProxyResult(res, await handleGoogleSheetExport(sheetId));
          } catch (error) {
            writeJson(res, exportErrorResult(error));
          }
        })();
      });
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), googleSheetProxy()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
