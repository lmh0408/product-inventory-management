import type {IncomingMessage, ServerResponse} from 'http';
import {exportErrorResult, handleGoogleSheetExport} from '../../server/googleSheetProxy';

export default async function handler(
  req: IncomingMessage & {query?: {sheetId?: string | string[]}},
  res: ServerResponse
) {
  const raw = req.query?.sheetId;
  const fromQuery = Array.isArray(raw) ? raw[0] || '' : raw || '';
  const fromPath = (req.url || '').split('?')[0].split('/').filter(Boolean).pop() || '';
  const sheetId = decodeURIComponent(fromQuery || fromPath);

  try {
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
    res.statusCode = result.status;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify(result.json));
  }
}
