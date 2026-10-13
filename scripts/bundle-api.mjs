import * as esbuild from 'esbuild';
import path from 'path';
import {fileURLToPath} from 'url';

const root = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(root, '..');

await esbuild.build({
  absWorkingDir: projectRoot,
  entryPoints: {
    'google-sheet-save': path.join(projectRoot, 'api-src/google-sheet-save.ts'),
    'google-sheet/[sheetId]': path.join(projectRoot, 'api-src/google-sheet/[sheetId].ts'),
  },
  outdir: path.join(projectRoot, 'api'),
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'cjs',
  footer: {
    js: '\nconst _h = module.exports.default || module.exports;\nmodule.exports = _h;\nmodule.exports.default = _h;',
  },
  logLevel: 'info',
});

