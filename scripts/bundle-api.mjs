import * as esbuild from 'esbuild';
import path from 'path';
import {fileURLToPath} from 'url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

await esbuild.build({
  absWorkingDir: projectRoot,
  entryPoints: {
    'google-sheet-save': 'api-src/google-sheet-save.ts',
    'google-sheet/[sheetId]': 'api-src/google-sheet/[sheetId].ts',
  },
  outdir: path.join(projectRoot, 'api'),
  outExtension: {'.js': '.ts'},
  allowOverwrite: true,
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'esm',
  logLevel: 'info',
});
