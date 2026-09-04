import * as XLSX from 'xlsx';
import {
  planDashboardRemarkUpdate,
  planFullPersist,
  planSheetWrites,
  planStockPersist,
  quoteA1SheetName,
  type SheetLedgerReplacement,
} from '../src/utils/googleSheetMutate';

export const SHEET_ID_PATTERN = /^[a-zA-Z0-9-_]{20,}$/;

export type JsonHttpResult = {
  status: number;
  json: Record<string, unknown>;
};

export type BinaryHttpResult = {
  status: number;
  buffer: Buffer;
  contentType: string;
};

export function isAllowedWebhook(url: string): boolean {
  try {
    const parsed = new URL(url);
    return (
      parsed.protocol === 'https:' &&
      parsed.hostname === 'script.google.com' &&
      /\/macros\/s\/[^/]+\/exec$/i.test(parsed.pathname)
    );
  } catch {
    return false;
  }
}

function explainAppsScriptResponse(text: string): string {
  if (/Authorization is required|권한이 필요|승인해야/i.test(text)) {
    return '웹앱 권한 허용이 필요합니다. 배포한 구글 계정으로 웹앱 URL을 브라우저에서 한 번 열고 권한을 허용한 뒤 다시 저장하세요.';
  }
  if (/Sign in|로그인|accounts\.google/i.test(text)) {
    return '웹앱 액세스가 잠겨 있습니다. 배포 시 실행 계정은 "나", 액세스는 "모든 사용자"로 다시 배포하세요.';
  }
  if (/You do not have permission|권한이 없/i.test(text)) {
    return '웹앱을 실행하는 계정에 시트 편집 권한이 없습니다. 시트 공유(편집자)를 확인하세요.';
  }
  if (/<html/i.test(text)) {
    return '웹앱이 HTML을 반환했습니다. URL이 /exec로 끝나는 배포 주소인지, 최신 배포인지 확인하세요.';
  }
  return text.slice(0, 280);
}

export async function handleGoogleSheetSave(
  body: Record<string, unknown>
): Promise<JsonHttpResult> {
  const webhookUrl = String(body.webhookUrl || '').trim();
  const accessToken = String(body.accessToken || '').trim();
  const sheetId = String(body.sheetId || '').trim();
  const action = String(body.action || '');
  const deletes = Array.isArray(body.deletes) ? body.deletes : [];
  const remark = body.remark as
    | { locationId?: Parameters<typeof planDashboardRemarkUpdate>[1]; value?: unknown }
    | undefined;

  if (!accessToken && !isAllowedWebhook(webhookUrl)) {
    return {
      status: 400,
      json: {
        ok: false,
        error: '시트에 저장하려면 설정에서 Apps Script 웹앱 URL을 등록해 주세요.',
      },
    };
  }

  let appends: unknown[] = [];
  let updates: unknown[] = [];
  let replacements: SheetLedgerReplacement[] = [];
  let planningError = '';
  if (
    SHEET_ID_PATTERN.test(sheetId) &&
    (Array.isArray(body.stocks) || action === 'UPDATE_DASHBOARD_REMARK')
  ) {
    try {
      const exportUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=xlsx`;
      const xlsxRes = await fetch(exportUrl, {
        redirect: 'follow',
        headers: { 'User-Agent': 'Mozilla/5.0 SheetStockSync/1.0' },
      });
      if (xlsxRes.ok) {
        const buffer = Buffer.from(await xlsxRes.arrayBuffer());
        const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: false });
        const stocks = Array.isArray(body.stocks)
          ? (body.stocks as Parameters<typeof planStockPersist>[1])
          : [];
        const plan =
          action === 'UPDATE_DASHBOARD_REMARK' && remark?.locationId
            ? planDashboardRemarkUpdate(
                workbook,
                remark.locationId,
                String(remark.value || '')
              )
            : action === 'SYNC_APP_DATA'
              ? planFullPersist(
                  workbook,
                  stocks,
                  Array.isArray(body.movements)
                    ? (body.movements as Parameters<typeof planFullPersist>[2])
                    : []
                )
              : body.movement
                ? planSheetWrites(
                    workbook,
                    body.movement as Parameters<typeof planSheetWrites>[1],
                    stocks
                  )
                : planStockPersist(workbook, stocks);
        appends = plan.appends;
        updates = plan.updates;
        replacements =
          'replacements' in plan ? (plan.replacements as SheetLedgerReplacement[]) : [];
      }
    } catch (error) {
      appends = [];
      updates = [];
      replacements = [];
      planningError =
        error instanceof Error ? error.message : '시트 구조를 분석하지 못했습니다.';
    }
  }

  if (action === 'DELETE_MOVEMENTS' && deletes.length === 0) {
    return { status: 400, json: { ok: false, error: '삭제할 시트 행 정보가 없습니다.' } };
  }
  if (action === 'SAVE_MOVEMENT' && appends.length === 0) {
    return {
      status: 422,
      json: {
        ok: false,
        error: '시트에서 입출고 내역을 추가할 탭이나 열을 찾지 못했습니다.',
      },
    };
  }
  if (action === 'UPDATE_DASHBOARD_REMARK' && updates.length !== 1) {
    return {
      status: 422,
      json: {
        ok: false,
        error: planningError || 'Dashboard에서 수정할 비고 셀을 찾지 못했습니다.',
      },
    };
  }
  if (action === 'SYNC_APP_DATA' && replacements.length === 0) {
    return {
      status: 422,
      json: {
        ok: false,
        error:
          planningError ||
          '시트에서 동기화할 원장 또는 재고 표를 찾지 못했습니다. 탭과 헤더를 확인해 주세요.',
      },
    };
  }
  if (accessToken && (action === 'DELETE_MOVEMENTS' || action === 'SYNC_APP_DATA')) {
    return {
      status: 400,
      json: {
        ok: false,
        error: '원장 전체 동기화와 행 삭제는 Apps Script 웹앱 연결에서만 지원됩니다.',
      },
    };
  }

  if (accessToken && SHEET_ID_PATTERN.test(sheetId) && (appends.length || updates.length)) {
    const data = [
      ...(appends as Array<{ sheetName: string; row: number; values: Array<string | number> }>).map(
        (item) => ({
          range: `${quoteA1SheetName(item.sheetName)}!A${item.row}`,
          values: [item.values],
        })
      ),
      ...(
        updates as Array<{ sheetName: string; row: number; col: number; value: string | number }>
      ).map((item) => ({
        range: `${quoteA1SheetName(item.sheetName)}!${XLSX.utils.encode_cell({
          r: item.row - 1,
          c: item.col - 1,
        })}`,
        values: [[item.value]],
      })),
    ];
    const apiRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values:batchUpdate`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ valueInputOption: 'USER_ENTERED', data }),
      }
    );
    const apiText = await apiRes.text();
    if (!apiRes.ok) {
      throw new Error(`Google Sheets API 저장 실패: ${apiText.slice(0, 300)}`);
    }
    return {
      status: 200,
      json: {
        ok: true,
        appendedCount: appends.length,
        updatedCount: updates.length,
        deletedCount: 0,
        appends: (appends as Array<{ sheetName: string; row: number }>).map(
          ({ sheetName, row }) => ({ sheetName, row })
        ),
      },
    };
  }

  const movementRows: Record<string, Array<{ sheetName: string; row: number }>> = {};
  for (const replacement of replacements) {
    replacement.movementIds.forEach((movementId, index) => {
      if (!movementRows[movementId]) movementRows[movementId] = [];
      movementRows[movementId].push({
        sheetName: replacement.sheetName,
        row: replacement.startRow + index,
      });
    });
  }

  const response = await fetch(webhookUrl, {
    method: 'POST',
    redirect: 'follow',
    signal: AbortSignal.timeout(50_000),
    headers: {
      'Content-Type': 'text/plain;charset=utf-8',
      'User-Agent': 'Mozilla/5.0 SheetStockSync/1.0',
    },
    body: JSON.stringify({
      action,
      sheetId,
      movement: body.movement,
      stocks: body.stocks,
      appends,
      updates,
      deletes,
      replacements,
    }),
  });

  const text = await response.text();
  try {
    const parsed = JSON.parse(text) as {
      ok?: boolean;
      error?: string;
      version?: number;
      appendedCount?: number;
      updatedCount?: number;
      deletedCount?: number;
    };
    if (parsed.ok === false) {
      return {
        status: 502,
        json: {
          ok: false,
          error: parsed.error || 'Apps Script에서 시트 저장에 실패했습니다.',
        },
      };
    }
    if (
      typeof parsed.version !== 'number' ||
      parsed.version < 6 ||
      typeof parsed.appendedCount !== 'number' ||
      typeof parsed.updatedCount !== 'number' ||
      typeof parsed.deletedCount !== 'number'
    ) {
      return {
        status: 502,
        json: {
          ok: false,
          error:
            'Apps Script가 이전 버전입니다. 시트 설정에서 최신 코드를 복사해 웹 앱을 새 버전으로 재배포하세요.',
        },
      };
    }
    const expectedAppends =
      appends.length +
      replacements.reduce((count, replacement) => count + replacement.values.length, 0);
    const expectedUpdates = updates.length;
    const expectedDeletes =
      deletes.length +
      replacements.reduce((count, replacement) => count + replacement.clearRowCount, 0);
    if (
      parsed.appendedCount !== expectedAppends ||
      parsed.updatedCount !== expectedUpdates ||
      parsed.deletedCount !== expectedDeletes
    ) {
      return {
        status: 502,
        json: {
          ok: false,
          error: `시트 반영 건수가 일치하지 않습니다. 추가 ${parsed.appendedCount}/${expectedAppends}, 수정 ${parsed.updatedCount}/${expectedUpdates}, 삭제 ${parsed.deletedCount}/${expectedDeletes}`,
        },
      };
    }
    return {
      status: 200,
      json: {
        ...parsed,
        appends: (appends as Array<{ sheetName: string; row: number }>).map(
          ({ sheetName, row }) => ({ sheetName, row })
        ),
        movementRows,
      },
    };
  } catch {
    return {
      status: 502,
      json: {
        ok: false,
        error: explainAppsScriptResponse(text),
      },
    };
  }
}

export function saveErrorResult(error: unknown): JsonHttpResult {
  return {
    status: 502,
    json: {
      ok: false,
      error:
        error instanceof Error && error.name === 'TimeoutError'
          ? 'Apps Script 응답 시간이 초과되었습니다. 최신 코드를 재배포한 뒤 다시 시도해 주세요.'
          : error instanceof Error
            ? `시트 저장 중 오류가 발생했습니다: ${error.message}`
            : '시트 저장 중 오류가 발생했습니다.',
    },
  };
}

export async function handleGoogleSheetExport(
  sheetId: string
): Promise<JsonHttpResult | BinaryHttpResult> {
  if (!SHEET_ID_PATTERN.test(sheetId)) {
    return {
      status: 400,
      json: { error: '올바른 구글 시트 URL 또는 ID가 아닙니다.' },
    };
  }

  const exportUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=xlsx`;
  const response = await fetch(exportUrl, {
    redirect: 'follow',
    headers: {
      'User-Agent': 'Mozilla/5.0 SheetStockSync/1.0',
    },
  });

  const contentType = response.headers.get('content-type') || '';
  if (!response.ok || contentType.includes('text/html')) {
    return {
      status: response.status === 404 ? 404 : 403,
      json: {
        error:
          '시트에 접근할 수 없습니다. 구글 시트 [공유]에서 "링크가 있는 모든 사용자"를 뷰어 이상으로 설정한 뒤 다시 시도해 주세요.',
      },
    };
  }

  return {
    status: 200,
    buffer: Buffer.from(await response.arrayBuffer()),
    contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  };
}

export function exportErrorResult(error: unknown): JsonHttpResult {
  return {
    status: 502,
    json: {
      error:
        error instanceof Error
          ? `시트를 가져오는 중 오류가 발생했습니다: ${error.message}`
          : '시트를 가져오는 중 오류가 발생했습니다.',
    },
  };
}
