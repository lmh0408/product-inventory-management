import * as XLSX from 'xlsx';
import { LocationId, LocationStock, ProductId, StockMovement } from '../types';
import {
  ACTIVE_LEDGER_SHEET_NAMES,
  cellText,
  findHeaderRow,
  isHistoricalTab,
  matchLocation,
  matchProduct,
  parseGoogleWorkbook,
  pickDashboardSheetName,
  sheetToRows,
} from './googleSheetSync';

export interface SheetAppend {
  sheetName: string;
  row: number;
  values: Array<string | number>;
  insertBefore?: boolean;
}

export interface SheetCellUpdate {
  sheetName: string;
  row: number;
  col: number;
  value: string | number;
}

export interface SheetWritePlan {
  appends: SheetAppend[];
  updates: SheetCellUpdate[];
}

export interface SheetLedgerReplacement {
  sheetName: string;
  startRow: number;
  clearRowCount: number;
  columnCount: number;
  values: Array<Array<string | number>>;
  movementIds: string[];
  formulaRow?: number;
}

export interface SheetFullWritePlan extends SheetWritePlan {
  replacements: SheetLedgerReplacement[];
}

function locationSheetName(workbook: XLSX.WorkBook, locationId: LocationId): string | null {
  const expectedName = ACTIVE_LEDGER_SHEET_NAMES[locationId];
  return workbook.SheetNames.includes(expectedName) ? expectedName : null;
}

function productColMap(header: string[]): Partial<Record<ProductId, number>> {
  const cols: Partial<Record<ProductId, number>> = {};
  header.forEach((cell, idx) => {
    const productId = matchProduct(cell);
    if (productId && cols[productId] == null) cols[productId] = idx;
  });
  return cols;
}

function planLedgerTotalFormulaUpdates(
  workbook: XLSX.WorkBook,
  sheetName: string,
  lastDataRow: number
): SheetCellUpdate[] {
  const ws = workbook.Sheets[sheetName];
  if (!ws) return [];

  const updates: SheetCellUpdate[] = [];
  for (const address of Object.keys(ws)) {
    if (address.startsWith('!')) continue;
    const cell = ws[address] as XLSX.CellObject;
    const formula = String(cell.f || '').trim();
    const range = formula.match(
      /^SUM\(\s*(\$?([A-Z]+)\$?\d+)\s*:\s*(\$?([A-Z]+)\$?)(\d+)\s*\)$/i
    );
    if (!range || range[2].toUpperCase() !== range[4].toUpperCase()) continue;

    const position = XLSX.utils.decode_cell(address);
    const formulaColumn = XLSX.utils.encode_col(position.c);
    if (formulaColumn.toUpperCase() !== range[2].toUpperCase()) continue;

    const nextFormula = formula.replace(
      /(:\s*\$?[A-Z]+\$?)\d+(\s*\)\s*)$/i,
      `$1${lastDataRow}$2`
    );
    updates.push({
      sheetName,
      row: position.r + 1,
      col: position.c + 1,
      value: `=${nextFormula}`,
    });
  }
  return updates;
}

function lastFilledExcelRow(rows: unknown[][], colIdx: number, startRow0: number): number {
  for (let r = rows.length - 1; r >= startRow0; r--) {
    if (cellText((rows[r] || [])[colIdx])) return r + 1;
  }
  return startRow0 + 1;
}

function buildLedgerRow(
  headerLen: number,
  dateCol: number,
  typeCol: number,
  descCol: number,
  productCols: Partial<Record<ProductId, number>>,
  date: string,
  typeLabel: string,
  desc: string,
  items: Array<{ productId: ProductId; quantity: number; signedQuantity?: number }>,
  sign: number,
  partnerCol?: number,
  partner?: string
): Array<string | number> {
  const values: Array<string | number> = Array.from({ length: Math.max(headerLen, 3) }, () => '');
  values[dateCol] = date;
  values[typeCol] = typeLabel;
  values[descCol] = desc;
  for (const item of items) {
    const col = productCols[item.productId];
    if (col == null) continue;
    values[col] =
      typeof item.signedQuantity === 'number'
        ? item.signedQuantity
        : sign * Number(item.quantity || 0);
  }
  if (partnerCol != null && partnerCol >= 0) values[partnerCol] = partner || '';
  return values;
}

function planLedgerAppend(
  workbook: XLSX.WorkBook,
  locationId: LocationId | undefined,
  date: string,
  typeLabel: string,
  desc: string,
  items: Array<{ productId: ProductId; quantity: number; signedQuantity?: number }>,
  sign: number
): SheetAppend | null {
  if (!locationId) return null;
  const sheetName = locationSheetName(workbook, locationId);
  if (!sheetName) return null;
  const ws = workbook.Sheets[sheetName];
  if (!ws) return null;
  const rows = sheetToRows(ws, true);
  const headerIndex = findHeaderRow(rows, 'movement');
  if (headerIndex < 0) return null;
  const header = (rows[headerIndex] || []).map((c) => cellText(c));
  const dateCol = Math.max(0, header.findIndex((c) => /일자|날짜|date/i.test(c)));
  const typeCol = Math.max(
    1,
    header.findIndex((c) => /구분|유형|입출고|type/i.test(c))
  );
  const descHit = header.findIndex((c) => /내역|내용|설명|description/i.test(c));
  const descCol = descHit >= 0 ? descHit : 2;
  const productCols = productColMap(header);
  const appendRow = lastFilledExcelRow(rows, dateCol, headerIndex + 1) + 1;
  return {
    sheetName,
    row: appendRow,
    values: buildLedgerRow(
      header.length,
      dateCol,
      typeCol,
      descCol,
      productCols,
      date,
      typeLabel,
      desc,
      items,
      sign
    ),
  };
}

function planOnHandUpdates(
  workbook: XLSX.WorkBook,
  stocks: LocationStock[]
): SheetCellUpdate[] {
  const updates: SheetCellUpdate[] = [];
  for (const stock of stocks) {
    const sheetName = locationSheetName(workbook, stock.locationId);
    if (!sheetName) continue;
    const ws = workbook.Sheets[sheetName];
    if (!ws) continue;
    const rows = sheetToRows(ws, true);
    let onHandRow0 = -1;
    for (let r = 0; r < Math.min(rows.length, 10); r++) {
      const first = cellText((rows[r] || [])[0]);
      if (/현재\s*재고|현재재고|현\s*재고/.test(first)) onHandRow0 = r;
    }
    const headerIndex = findHeaderRow(rows, 'movement');
    if (onHandRow0 < 0 || headerIndex < 0) continue;
    const header = (rows[headerIndex] || []).map((c) => cellText(c));
    const productCols = productColMap(header);
    for (const [productId, col] of Object.entries(productCols)) {
      if (col == null) continue;
      updates.push({
        sheetName,
        row: onHandRow0 + 1,
        col: col + 1,
        value: Number(stock.quantities[productId as ProductId] || 0),
      });
    }
  }
  return updates;
}

function planDashboardUpdates(
  workbook: XLSX.WorkBook,
  stocks: LocationStock[]
): SheetCellUpdate[] {
  const sheetName = pickDashboardSheetName(
    workbook.SheetNames.filter((n) => !isHistoricalTab(n))
  );
  if (!sheetName) return [];
  const ws = workbook.Sheets[sheetName];
  if (!ws) return [];
  const rows = sheetToRows(ws, true);
  const headerIndex = findHeaderRow(rows, 'dashboard');
  if (headerIndex < 0) return [];
  const header = (rows[headerIndex] || []).map((c) => cellText(c));
  const locCol = Math.max(
    0,
    header.findIndex((c) => /장소|거점|위치/.test(c) || Boolean(matchLocation(c)))
  );
  const productCols = productColMap(header);
  const updates: SheetCellUpdate[] = [];
  const totals: Partial<Record<ProductId, number>> = {};

  for (let r = headerIndex + 1; r < rows.length; r++) {
    const label = cellText((rows[r] || [])[locCol]);
    if (/합계|총계|total/i.test(label)) {
      for (const [productId, col] of Object.entries(productCols)) {
        if (col == null) continue;
        updates.push({
          sheetName,
          row: r + 1,
          col: col + 1,
          value: Number(totals[productId as ProductId] || 0),
        });
      }
      break;
    }
    const locationId = matchLocation(label);
    if (!locationId) continue;
    const stock = stocks.find((s) => s.locationId === locationId);
    if (!stock) continue;
    for (const [productId, col] of Object.entries(productCols)) {
      if (col == null) continue;
      const qty = Number(stock.quantities[productId as ProductId] || 0);
      totals[productId as ProductId] = Number(totals[productId as ProductId] || 0) + qty;
      updates.push({
        sheetName,
        row: r + 1,
        col: col + 1,
        value: qty,
      });
    }
  }
  return updates;
}

export function planDashboardRemarkUpdate(
  workbook: XLSX.WorkBook,
  locationId: LocationId,
  remarks: string
): SheetWritePlan {
  const sheetName = pickDashboardSheetName(
    workbook.SheetNames.filter((name) => !isHistoricalTab(name))
  );
  if (!sheetName) throw new Error('Dashboard 탭을 찾지 못했습니다.');
  const ws = workbook.Sheets[sheetName];
  if (!ws) throw new Error('Dashboard 탭을 읽지 못했습니다.');

  const rows = sheetToRows(ws, true);
  const headerIndex = findHeaderRow(rows, 'dashboard');
  if (headerIndex < 0) throw new Error('Dashboard 헤더를 찾지 못했습니다.');
  const header = (rows[headerIndex] || []).map((cell) => cellText(cell));
  const locationCol = Math.max(
    0,
    header.findIndex((cell) => /장소|거점|위치/.test(cell) || Boolean(matchLocation(cell)))
  );
  const remarksCol = header.findIndex((cell) => /비고|메모|remarks/i.test(cell));
  if (remarksCol < 0) throw new Error('Dashboard 비고 열을 찾지 못했습니다.');

  for (let rowIndex = headerIndex + 1; rowIndex < rows.length; rowIndex++) {
    if (matchLocation(cellText((rows[rowIndex] || [])[locationCol])) === locationId) {
      return {
        appends: [],
        updates: [
          {
            sheetName,
            row: rowIndex + 1,
            col: remarksCol + 1,
            value: remarks,
          },
        ],
      };
    }
  }
  throw new Error('Dashboard에서 선택한 거점 행을 찾지 못했습니다.');
}

export function planStockPersist(workbook: XLSX.WorkBook, stocks: LocationStock[]): SheetWritePlan {
  const updates = [...planOnHandUpdates(workbook, stocks), ...planDashboardUpdates(workbook, stocks)];
  return { appends: [], updates };
}

export function planFullPersist(
  workbook: XLSX.WorkBook,
  stocks: LocationStock[],
  movements: StockMovement[]
): SheetFullWritePlan {
  const currentSheetMovements = parseGoogleWorkbook(workbook).movements;
  const ledgerRows: Record<
    LocationId,
    Array<{ movementId: string; movement: StockMovement; typeLabel: string; sign: number }>
  > = { lucciem: [], seil: [], ijin: [], etc: [] };

  for (const movement of movements) {
    if (movement.type === 'TRANSFER') {
      if (movement.fromLocation) {
        ledgerRows[movement.fromLocation].push({
          movementId: movement.id,
          movement,
          typeLabel: '출고',
          sign: -1,
        });
      }
      if (movement.toLocation) {
        ledgerRows[movement.toLocation].push({
          movementId: movement.id,
          movement,
          typeLabel: '입고',
          sign: 1,
        });
      }
    } else {
      const locationId = movement.locationId || movement.toLocation || movement.fromLocation;
      if (!locationId) continue;
      ledgerRows[locationId].push({
        movementId: movement.id,
        movement,
        typeLabel:
          movement.type === 'IN'
            ? '입고'
            : movement.type === 'ADJUSTMENT'
              ? '보정'
              : '출고',
        sign: movement.type === 'OUT' ? -1 : 1,
      });
    }
  }

  const replacements: SheetLedgerReplacement[] = [];
  for (const locationId of Object.keys(ledgerRows) as LocationId[]) {
    const sheetName = locationSheetName(workbook, locationId);
    if (!sheetName) {
      if (ledgerRows[locationId].length > 0) {
        throw new Error(`원장 탭을 찾지 못했습니다: ${locationId}`);
      }
      continue;
    }
    const ws = workbook.Sheets[sheetName];
    const rows = sheetToRows(ws, true);
    const headerIndex = findHeaderRow(rows, 'movement');
    if (headerIndex < 0) {
      if (ledgerRows[locationId].length > 0) {
        throw new Error(`입출고 헤더를 찾지 못했습니다: ${sheetName}`);
      }
      continue;
    }
    const header = (rows[headerIndex] || []).map((cell) => cellText(cell));
    const dateCol = Math.max(
      0,
      header.findIndex((cell) => /일자|날짜|date/i.test(cell))
    );
    const typeCol = Math.max(
      1,
      header.findIndex((cell) => /구분|유형|입출고|type/i.test(cell))
    );
    const descHit = header.findIndex((cell) => /내역|내용|설명|description/i.test(cell));
    const descCol = descHit >= 0 ? descHit : 2;
    const partnerCol = header.findIndex((cell) => /납품|거래|상대|partner/i.test(cell));
    const productCols = productColMap(header);
    const startRow = headerIndex + 2;
    const formulaRows = new Set<number>();
    for (const address of Object.keys(ws)) {
      if (address.startsWith('!')) continue;
      const cell = ws[address] as XLSX.CellObject;
      if (cell.f && /SUM/i.test(cell.f)) {
        formulaRows.add(XLSX.utils.decode_cell(address).r + 1);
      }
    }
    const formulaRow = [...formulaRows]
      .filter((row) => row >= startRow)
      .sort((a, b) => a - b)[0];
    let lastDataRow = startRow - 1;
    for (let rowIndex = headerIndex + 1; rowIndex < rows.length; rowIndex++) {
      if (formulaRow && rowIndex + 1 >= formulaRow) break;
      if (cellText((rows[rowIndex] || [])[dateCol])) lastDataRow = rowIndex + 1;
    }
    const plannedRows = ledgerRows[locationId];
    const managedSourceRows = new Set(
      currentSheetMovements.flatMap((movement) =>
        (movement.sheetRows || [])
          .filter((ref) => ref.sheetName === sheetName)
          .map((ref) => ref.row)
      )
    );
    const unmanagedValues: Array<Array<string | number>> = [];
    for (let row = startRow; row <= lastDataRow; row++) {
      if (managedSourceRows.has(row)) continue;
      const existing = rows[row - 1] || [];
      unmanagedValues.push(
        Array.from({ length: Math.max(header.length, 3) }, (_, column) => {
          const value = existing[column];
          return typeof value === 'number' ? value : cellText(value);
        })
      );
    }
    const managedValues = plannedRows.map(({ movement, typeLabel, sign }) =>
      buildLedgerRow(
        header.length,
        dateCol,
        typeCol,
        descCol,
        productCols,
        movement.date,
        typeLabel,
        movement.description || '',
        movement.items,
        sign,
        partnerCol,
        movement.partnerOrRecipient
      )
    );
    const values = [...managedValues, ...unmanagedValues];
    replacements.push({
      sheetName,
      startRow,
      clearRowCount: Math.max(0, lastDataRow - startRow + 1),
      columnCount: Math.max(header.length, 3),
      values,
      movementIds: plannedRows.map(({ movementId }) => movementId),
      formulaRow,
    });
  }

  const updates = replacements.flatMap((replacement) =>
    planLedgerTotalFormulaUpdates(
      workbook,
      replacement.sheetName,
      Math.max(
        replacement.startRow,
        replacement.startRow + replacement.values.length - 1
      )
    )
  );
  if (replacements.length === 0) {
    throw new Error('동기화할 원장 탭을 찾지 못했습니다.');
  }
  return { appends: [], updates, replacements };
}

export function planSheetWrites(
  workbook: XLSX.WorkBook,
  movement: Pick<
    StockMovement,
    'date' | 'type' | 'locationId' | 'fromLocation' | 'toLocation' | 'description' | 'items'
  >,
  stocks: LocationStock[]
): SheetWritePlan {
  const items = movement.items.map((item) => ({
    productId: item.productId,
    quantity: item.quantity,
    signedQuantity: item.signedQuantity,
  }));
  const desc = movement.description || '';
  const date = movement.date || '';
  const appends: SheetAppend[] = [];

  if (movement.type === 'TRANSFER') {
    const outRow = planLedgerAppend(
      workbook,
      movement.fromLocation,
      date,
      '출고',
      desc,
      items,
      -1
    );
    const inRow = planLedgerAppend(workbook, movement.toLocation, date, '입고', desc, items, 1);
    if (outRow) appends.push(outRow);
    if (inRow) appends.push(inRow);
  } else {
    const locationId = movement.locationId || movement.toLocation || movement.fromLocation;
    const append = planLedgerAppend(
      workbook,
      locationId,
      date,
      movement.type === 'IN'
        ? '입고'
        : movement.type === 'ADJUSTMENT'
          ? '보정'
          : '출고',
      desc,
      items,
      movement.type === 'OUT' ? -1 : 1
    );
    if (append) appends.push(append);
  }

  const lastRowsBySheet = new Map<string, number>();
  for (const append of appends) {
    lastRowsBySheet.set(
      append.sheetName,
      Math.max(lastRowsBySheet.get(append.sheetName) || 0, append.row)
    );
  }
  const updates = [...lastRowsBySheet.entries()].flatMap(([sheetName, lastDataRow]) =>
    planLedgerTotalFormulaUpdates(workbook, sheetName, lastDataRow)
  );
  if (appends.length === 0) {
    throw new Error('시트에서 입출고를 남길 탭/열을 찾지 못했습니다. Dashboard와 거점 탭 이름을 확인해 주세요.');
  }
  return { appends, updates };
}

export function quoteA1SheetName(name: string): string {
  return `'${name.replace(/'/g, "''")}'`;
}
