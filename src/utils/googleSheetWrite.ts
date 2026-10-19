import { LocationStock, MasterData, SheetRowReference, StockMovement } from '../types';
import { buildMasterSheetStructure, masterDataToSheetRows } from './masterDataSheet';

export interface SheetSaveResult {
  appendedCount: number;
  updatedCount: number;
  deletedCount: number;
  appends?: SheetRowReference[];
  movementRows?: Record<string, SheetRowReference[]>;
  stocks?: LocationStock[];
  movements?: StockMovement[];
}

export function normalizeAppsScriptWebhook(raw: string): string {
  const trimmed = raw.trim().replace(/^['"]+|['"]+$/g, '');
  const exec = trimmed.match(/https:\/\/script\.google\.com\/macros\/s\/[a-zA-Z0-9_-]+\/exec/i);
  if (exec) return exec[0];
  return trimmed.replace(/\/dev\/?(\?.*)?$/i, '/exec');
}

export function isAppsScriptWebhook(url: string): boolean {
  try {
    const parsed = new URL(normalizeAppsScriptWebhook(url));
    return (
      parsed.protocol === 'https:' &&
      parsed.hostname === 'script.google.com' &&
      /\/macros\/s\/[^/]+\/exec$/i.test(parsed.pathname)
    );
  } catch {
    return false;
  }
}

async function postSheetSave(body: Record<string, unknown>): Promise<SheetSaveResult> {
  const webhookUrl = normalizeAppsScriptWebhook(String(body.webhookUrl || ''));
  if (!webhookUrl) {
    throw new Error(
      '시트(DB) 저장용 웹앱 URL이 없습니다. 상단 시트 설정에서 Apps Script를 배포하고 URL을 등록해 주세요.'
    );
  }
  if (!isAppsScriptWebhook(webhookUrl)) {
    throw new Error('웹앱 URL은 https://script.google.com/macros/s/…/exec 형식이어야 합니다.');
  }

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 60_000);
  let response: Response;
  try {
    response = await fetch(`/api/google-sheet-save?_t=${Date.now()}`, {
      method: 'POST',
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
      },
      body: JSON.stringify({ ...body, webhookUrl }),
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error(
        '시트 응답 시간이 초과되었습니다. Apps Script 최신 버전을 배포한 뒤 다시 시도해 주세요.'
      );
    }
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }

  const contentType = response.headers.get('content-type') || '';
  const parsed = contentType.includes('application/json')
    ? ((await response.json()) as {
        ok?: boolean;
        error?: string;
        appendedCount?: number;
        updatedCount?: number;
        deletedCount?: number;
        appends?: SheetRowReference[];
        movementRows?: Record<string, SheetRowReference[]>;
        stocks?: LocationStock[];
        movements?: StockMovement[];
      })
    : { ok: false, error: await response.text() };

  if (!response.ok || parsed.ok === false) {
    throw new Error(parsed.error || '시트 저장에 실패했습니다.');
  }
  return {
    appendedCount: Number(parsed.appendedCount || 0),
    updatedCount: Number(parsed.updatedCount || 0),
    deletedCount: Number(parsed.deletedCount || 0),
    appends: parsed.appends,
    movementRows: parsed.movementRows,
    stocks: parsed.stocks,
    movements: parsed.movements,
  };
}

function stockPayload(stocks: LocationStock[]) {
  return stocks.map((stock) => ({
    locationId: stock.locationId,
    quantities: stock.quantities,
    remarks: stock.remarks || '',
  }));
}

export async function saveAppDataToSheet(params: {
  webhookUrl: string;
  sheetId: string;
  stocks: LocationStock[];
  movements: StockMovement[];
  sourceMovementIds?: string[];
  originalMovements?: StockMovement[];
  replacementMovements?: StockMovement[];
}): Promise<SheetSaveResult> {
  return postSheetSave({
    action: 'SYNC_APP_DATA',
    webhookUrl: params.webhookUrl.trim(),
    sheetId: params.sheetId,
    stocks: stockPayload(params.stocks),
    movements: params.movements,
    sourceMovementIds: params.sourceMovementIds,
    originalMovements: params.originalMovements,
    replacementMovements: params.replacementMovements,
  });
}

export async function saveMovementToSheet(params: {
  webhookUrl: string;
  sheetId: string;
  movement: StockMovement;
  stocks: LocationStock[];
}): Promise<SheetSaveResult> {
  return postSheetSave({
    action: 'SAVE_MOVEMENT',
    webhookUrl: params.webhookUrl.trim(),
    sheetId: params.sheetId,
    movement: {
      date: params.movement.date,
      type: params.movement.type,
      locationId: params.movement.locationId,
      fromLocation: params.movement.fromLocation,
      toLocation: params.movement.toLocation,
      description: params.movement.description,
      partnerOrRecipient: params.movement.partnerOrRecipient,
      items: params.movement.items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        signedQuantity: item.signedQuantity,
      })),
    },
    stocks: stockPayload(params.stocks),
  });
}

export async function saveDashboardRemark(params: {
  webhookUrl: string;
  sheetId: string;
  locationId: LocationStock['locationId'];
  value: string;
}): Promise<SheetSaveResult> {
  return postSheetSave({
    action: 'UPDATE_DASHBOARD_REMARK',
    webhookUrl: params.webhookUrl.trim(),
    sheetId: params.sheetId,
    remark: {
      locationId: params.locationId,
      value: params.value,
    },
  });
}

export async function saveMasterDataToSheet(params: {
  webhookUrl: string;
  sheetId: string;
  masterData: MasterData;
  previous?: MasterData;
}): Promise<SheetSaveResult> {
  return postSheetSave({
    action: 'SAVE_MASTER_DATA',
    webhookUrl: params.webhookUrl.trim(),
    sheetId: params.sheetId,
    rows: masterDataToSheetRows(params.masterData),
    structure: buildMasterSheetStructure(params.previous || params.masterData, params.masterData),
  });
}

export async function deleteMovementsFromSheet(params: {
  webhookUrl: string;
  sheetId: string;
  movements: StockMovement[];
}): Promise<SheetSaveResult> {
  const deletes = params.movements.flatMap((movement) =>
    (movement.sheetRows || []).map((ref, index) => ({
      sheetName: ref.sheetName,
      row: ref.row,
      date: movement.date,
      description: ref.expectedDescription ?? movement.description ?? '',
      typeLabel:
        movement.type === 'TRANSFER'
          ? index === 0
            ? '출고'
            : '입고'
          : movement.type === 'IN'
            ? '입고'
                    : movement.type === 'ADJUSTMENT'
                      ? '보정'
                      : '출고',
      items: movement.items.map((item) => ({
        productId: item.productId,
        quantity: Number(item.quantity || 0),
      })),
    }))
  );
  if (deletes.length === 0) {
    throw new Error(
      '선택한 내역의 시트 행 정보를 찾지 못했습니다. 시트를 다시 불러온 후 삭제해 주세요.'
    );
  }
  return postSheetSave({
    action: 'DELETE_MOVEMENTS',
    webhookUrl: params.webhookUrl.trim(),
    sheetId: params.sheetId,
    deletes,
  });
}
