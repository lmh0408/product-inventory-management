import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const prodBundle = path.resolve(__dirname, 'server.prod.mjs');

const isDevScript = process.env.npm_lifecycle_event === 'dev';

if (fs.existsSync(prodBundle) && !isDevScript) {
  process.env.NODE_ENV = 'production';
  const prodModule = await import(`file://${prodBundle}`);
  await prodModule.startServer();
} else {
  const devAppPath = './server/app.ts';
  const { startServer } = await import(devAppPath);
  await startServer();
}
