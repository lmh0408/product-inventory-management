import type {IncomingMessage, ServerResponse} from 'http';
import {exportErrorResult, handleGoogleSheetExport} from '../../server/googleSheetProxy';

export default async function handler(
  req: IncomingMessage & {query?: {sheetId?: string | string[]}},
  res: ServerResponse
) {
  try {
    if (!res.headersSent) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }

    let sheetId = '';
    const raw = req.query?.sheetId;
    if (Array.isArray(raw)) {
      sheetId = raw[0] || '';
    } else if (typeof raw === 'string') {
      sheetId = raw;
    }

    if (!sheetId && req.url) {
      try {
        const parsed = new URL(req.url, 'http://localhost');
        sheetId = parsed.searchParams.get('sheetId') || '';
        if (!sheetId) {
          const segments = parsed.pathname.split('/').filter(Boolean);
          const last = segments.pop() || '';
          if (last && last !== '[sheetId]' && last !== 'google-sheet') {
            sheetId = last;
          }
        }
      } catch {
        const segments = (req.url || '').split('?')[0].split('/').filter(Boolean);
        const last = segments.pop() || '';
        if (last && last !== '[sheetId]' && last !== 'google-sheet') {
          sheetId = last;
        }
      }
    }

    sheetId = decodeURIComponent(sheetId || '').trim();
    if (!sheetId) {
      sheetId = '1cenXoa-RZoU_P_CYXkgPJ5N5E9QGeDMCyBRXDa4Jp00';
    }

    const result = await handleGoogleSheetExport(sheetId);
    if ('buffer' in result) {
      res.statusCode = result.status;
      res.setHeader('Content-Type', result.contentType);
      res.end(result.buffer);
      return;
    }
    res.statusCode = result.status;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify(result.json));
  } catch (error) {
    const result = exportErrorResult(error);
    if (!res.headersSent) {
      res.statusCode = result.status;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify(result.json));
    }
  }
}
