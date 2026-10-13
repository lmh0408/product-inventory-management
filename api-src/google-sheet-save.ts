import type {IncomingMessage, ServerResponse} from 'http';
import {handleGoogleSheetSave, saveErrorResult} from '../server/googleSheetProxy';

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

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  try {
    if (!res.headersSent) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }

    if (req.method !== 'POST') {
      res.statusCode = 405;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify({ok: false, error: 'POST만 지원합니다.'}));
      return;
    }

    const body =
      typeof (req as IncomingMessage & {body?: unknown}).body === 'object' &&
      (req as IncomingMessage & {body?: unknown}).body !== null &&
      !Buffer.isBuffer((req as IncomingMessage & {body?: unknown}).body)
        ? ((req as IncomingMessage & {body: Record<string, unknown>}).body as Record<
            string,
            unknown
          >)
        : await readJsonBody(req);
    const result = await handleGoogleSheetSave(body);
    if (!res.headersSent) {
      res.statusCode = result.status;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify(result.json));
    }
  } catch (error) {
    const result = saveErrorResult(error);
    if (!res.headersSent) {
      res.statusCode = result.status;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify(result.json));
    }
  }
}
