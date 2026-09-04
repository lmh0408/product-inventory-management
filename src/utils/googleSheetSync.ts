import * as XLSX from 'xlsx';
import {
  LocationId,
  LocationStock,
  MovementItem,
  MovementType,
  ProductId,
  StockMovement,
} from '../types';
import { LOCATIONS, PRODUCTS } from '../data/initialData';

export const ACTIVE_LEDGER_SHEET_NAMES: Record<LocationId, string> = {
  lucciem: '루씨엠-오름차순',
  seil: '세일정밀공업-오름차순',
  ijin: '아이진-오름차순',
  etc: 'etc-오름차순',
};

export function activeLedgerLocation(sheetName: string): LocationId | null {
  const entry = (Object.entries(ACTIVE_LEDGER_SHEET_NAMES) as [LocationId, string][]).find(
    ([, expectedName]) => expectedName === sheetName
  );
  return entry?.[0] || null;
}

export interface GoogleSheetImportResult {
  stocks: LocationStock[];
  movements: StockMovement[];
  tabNames: string[];
  dashboardSheetName: string | null;
}

export function extractSheetId(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const fromUrl = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/i);
  if (fromUrl?.[1]) return fromUrl[1];
  if (/^[a-zA-Z0-9-_]{20,}$/.test(trimmed)) return trimmed;
  return null;
}

export function toSheetUrl(sheetId: string): string {
  return `https://docs.google.com/spreadsheets/d/${sheetId}/edit`;
}

function normalize(text: string): string {
  return String(text)
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[()[\]{}]/g, '')
    .replace(/보관함/g, '');
}

function emptyQuantities(): Record<ProductId, number> {
  return PRODUCTS.reduce((acc, product) => {
    acc[product.id] = 0;
    return acc;
  }, {} as Record<ProductId, number>);
}

function createEmptyStocks(): LocationStock[] {
  return LOCATIONS.map((loc) => ({
    locationId: loc.id,
    quantities: emptyQuantities(),
    unassembledQuantities: emptyQuantities(),
    exceptionNotes: {},
    remarks: '',
  }));
}

export function matchProduct(cell: string): ProductId | null {
  const n = normalize(cell);
  if (!n) return null;

  const aliases: Record<ProductId, string[]> = {
    smart_top: ['smart상단', 'smartaed상단', '스마트상단', 'smart_top'],
    smart_bottom: ['smart하단', 'smartaed하단', '스마트하단', 'smart_bottom'],
    smart_top_eng: ['smart상단영문', '영문상단', 'smart_top_eng'],
    std_top: ['일반상단', '실내일반상단', 'std_top'],
    std_bottom: ['일반하단', '실내일반하단', 'std_bottom'],
    std_top_samsung: ['일반상단삼성', '삼성상단', 'std_top_samsung'],
    std_bottom_samsung: ['일반하단삼성', '삼성하단', 'std_bottom_samsung'],
    outdoor: ['옥외', '옥외형', 'outdoor'],
    mobile: ['이동', '이동형', 'mobile'],
    forklift_bag: ['지게가방', 'forklift'],
    semi_outdoor: ['세미아웃도어', '준옥외', 'semioutdoor'],
    terminal_board: ['단말기보드', '단말기', '전장보드', 'terminal'],
  };

  for (const product of PRODUCTS) {
    if (n === normalize(product.name) || n === product.id) return product.id;
  }

  const rankedAliases = (Object.entries(aliases) as [ProductId, string[]][])
    .flatMap(([id, list]) => list.map((alias) => ({ id, alias })))
    .sort((a, b) => b.alias.length - a.alias.length);

  for (const { id, alias } of rankedAliases) {
    if (n === alias || n.includes(alias)) return id;
  }

  return null;
}

export function matchLocation(cell: string): LocationId | null {
  const n = normalize(cell);
  if (!n) return null;
  if (n.includes('루씨엠') || n === 'lucciem' || n === '사무실') return 'lucciem';
  if (n.includes('세일정밀') || n === 'seil') return 'seil';
  if (n.includes('아이진') || n === 'ijin') return 'ijin';
  if (n === 'etc' || n.startsWith('etc') || n.includes('기타')) return 'etc';
  return null;
}

function parseSignedQuantity(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const matched = String(value ?? '').replace(/,/g, '').match(/-?\d+(\.\d+)?/);
  if (!matched) return 0;
  const parsed = Number(matched[0]);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseQuantity(value: unknown): number {
  return Math.max(0, parseSignedQuantity(value));
}

function formatSheetDate(value: Date): string {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
}

function excelSerialToDate(serial: number): string | null {
  const milliseconds = Date.UTC(1899, 11, 30) + Math.floor(serial) * 86_400_000;
  const date = new Date(milliseconds);
  if (Number.isNaN(date.getTime())) return null;
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
}

export function cellText(value: unknown): string {
  if (value == null) return '';
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return formatSheetDate(value);
  }
  return String(value).trim();
}

function cellToDate(value: unknown): string | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return formatSheetDate(value);
  }
  const s = cellText(value);
  if (!s || /갱신일|현재/.test(s)) return null;
  const compact = s.replace(/\s+/g, '');
  if (/^\d{4}$/.test(compact)) return compact;
  const iso = compact.match(/(\d{4})[./-](\d{1,2})[./-](\d{1,2})/);
  if (iso) {
    return `${iso[1]}-${iso[2].padStart(2, '0')}-${iso[3].padStart(2, '0')}`;
  }
  const mdY = compact.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (mdY) {
    const year = Number(mdY[3]) < 100 ? 2000 + Number(mdY[3]) : Number(mdY[3]);
    return `${year}-${mdY[1].padStart(2, '0')}-${mdY[2].padStart(2, '0')}`;
  }
  const serial = Number(s);
  if (serial > 20000 && serial < 80000) {
    return excelSerialToDate(serial);
  }
  return null;
}

export function sheetToRows(ws: XLSX.WorkSheet, keepBlankRows = false): unknown[][] {
  return XLSX.utils.sheet_to_json<unknown[]>(ws, {
    header: 1,
    defval: '',
    raw: true,
    blankrows: keepBlankRows,
  });
}

export function findHeaderRow(rows: unknown[][], kind: 'dashboard' | 'movement'): number {
  const limit = Math.min(rows.length, 20);
  for (let i = 0; i < limit; i++) {
    const cells = (rows[i] || []).map((c) => cellText(c));
    if (kind === 'dashboard') {
      const locHit = cells.some((c) => /장소|거점|위치/.test(c));
      const productHits = cells.filter((c) => matchProduct(c)).length;
      const locationHits = cells.filter((c) => matchLocation(c)).length;
      if (locHit && productHits >= 2) return i;
      if (productHits >= 4) return i;
      if (locationHits >= 2 && productHits < 2) return i;
    } else {
      const dateHit = cells.some((c) => /일자|날짜|date/i.test(c));
      const typeHit = cells.some((c) => /구분|유형|입출고|type/i.test(c));
      if (dateHit && typeHit) return i;
    }
  }
  return -1;
}

function parseMovementType(value: string): MovementType | null {
  const n = normalize(value);
  if (!n) return null;
  if (n.includes('입고') || n === 'in') return 'IN';
  if (n.includes('출고') || n === 'out') return 'OUT';
  if (n.includes('보정') || n === 'adjustment') return 'ADJUSTMENT';
  if (n.includes('이동') || n.includes('이관') || n === 'transfer') return 'TRANSFER';
  return null;
}

export function isHistoricalTab(name: string): boolean {
  const n = name.trim();
  return /^\d{4}/.test(n) || /\.org$/i.test(n) || /\.\d{4}$/i.test(n);
}

export function pickDashboardSheetName(names: string[]): string | null {
  const exact = names.find((n) => {
    const t = n.trim().toLowerCase();
    return t === 'dashboard' || t === '보관함 dashboard';
  });
  if (exact) return exact;
  return names.find((n) => /dashboard|대시보드|보관함/i.test(n) && !isHistoricalTab(n)) ?? names[0] ?? null;
}

function parseDashboardSheet(ws: XLSX.WorkSheet): LocationStock[] {
  const rows = sheetToRows(ws);
  if (rows.length === 0) return createEmptyStocks();

  const headerIndex = findHeaderRow(rows, 'dashboard');
  if (headerIndex < 0) return createEmptyStocks();
  const header = (rows[headerIndex] || []).map((c) => cellText(c));
  const productCols = header.map((cell, idx) => ({ idx, productId: matchProduct(cell) }));
  const locationCols = header.map((cell, idx) => ({ idx, locationId: matchLocation(cell) }));
  const remarksIdx = header.findIndex((c) => /비고|메모|remarks/i.test(c));
  const locationColIdx = header.findIndex((c) => /장소|거점|위치/.test(c) || matchLocation(c));

  const stocks = createEmptyStocks();
  const transposed =
    locationCols.filter((c) => c.locationId).length >= 2 &&
    productCols.filter((c) => c.productId).length < 2;

  if (transposed) {
    for (let r = headerIndex + 1; r < rows.length; r++) {
      const row = rows[r] || [];
      const productId = matchProduct(cellText(row[0]));
      if (!productId) continue;
      for (const col of locationCols) {
        if (!col.locationId) continue;
        const stock = stocks.find((s) => s.locationId === col.locationId);
        if (stock) stock.quantities[productId] = parseQuantity(row[col.idx]);
      }
    }
    return stocks;
  }

  for (let r = headerIndex + 1; r < rows.length; r++) {
    const row = rows[r] || [];
    const locLabel = cellText(locationColIdx >= 0 ? row[locationColIdx] : row[0]);
    if (/총계|합계|total|제품군/i.test(locLabel)) continue;
    const locationId = matchLocation(locLabel);
    if (!locationId) continue;
    const stock = stocks.find((s) => s.locationId === locationId);
    if (!stock) continue;
    for (const col of productCols) {
      if (!col.productId) continue;
      stock.quantities[col.productId] = parseQuantity(row[col.idx]);
    }
    if (remarksIdx >= 0) {
      stock.remarks = cellText(row[remarksIdx]);
    }
  }

  return stocks;
}

function applyActiveLedgerStocks(
  workbook: XLSX.WorkBook,
  dashboardSheetName: string | null,
  dashboardStocks: LocationStock[]
): LocationStock[] {
  const stocks = JSON.parse(JSON.stringify(dashboardStocks)) as LocationStock[];

  for (const sheetName of workbook.SheetNames) {
    if (sheetName === dashboardSheetName || isHistoricalTab(sheetName)) continue;
    const locationId = activeLedgerLocation(sheetName);
    if (!locationId) continue;
    const ws = workbook.Sheets[sheetName];
    if (!ws) continue;

    const rows = sheetToRows(ws, true);
    const headerIndex = findHeaderRow(rows, 'movement');
    if (headerIndex < 0) continue;
    const onHandRowIndex = rows
      .slice(0, headerIndex)
      .findIndex((row) =>
        row.some((cell) => /현\s*재고|현재\s*재고/.test(cellText(cell)))
      );
    if (onHandRowIndex < 0) continue;

    const stock = stocks.find((item) => item.locationId === locationId);
    if (!stock) continue;
    const header = (rows[headerIndex] || []).map((cell) => cellText(cell));
    header.forEach((cell, columnIndex) => {
      const productId = matchProduct(cell);
      if (!productId) return;
      const rawValue = (rows[onHandRowIndex] || [])[columnIndex];
      if (cellText(rawValue) === '') return;
      stock.quantities[productId] = parseSignedQuantity(rawValue);
    });
  }
  return stocks;
}

function parseMovementSheet(
  ws: XLSX.WorkSheet,
  fallbackLocationId: LocationId | null,
  sheetName: string
): StockMovement[] {
  const rows = sheetToRows(ws);
  if (rows.length === 0) return [];
  const headerIndex = findHeaderRow(rows, 'movement');
  if (headerIndex < 0) return [];
  const header = (rows[headerIndex] || []).map((c) => cellText(c));

  const dateIdx = header.findIndex((c) => /일자|날짜|date/i.test(c));
  const typeIdx = header.findIndex((c) => /구분|유형|입출고|type/i.test(c));
  const descIdx = header.findIndex((c) => /내역|내용|설명|description/i.test(c));
  const partnerIdx = header.findIndex((c) => /납품|거래|상대|partner/i.test(c));
  const productCols = header
    .map((cell, idx) => ({ idx, productId: matchProduct(cell) }))
    .filter((col) => col.productId);

  const movements: StockMovement[] = [];
  for (let r = headerIndex + 1; r < rows.length; r++) {
    const row = rows[r] || [];
    const date = dateIdx >= 0 ? cellToDate(row[dateIdx]) : null;
    const type = parseMovementType(typeIdx >= 0 ? cellText(row[typeIdx]) : '');
    const description = descIdx >= 0 ? cellText(row[descIdx]) : '';
    if (!date || !type) continue;
    const isAdjustment = type === 'ADJUSTMENT' || /보정/.test(description);

    const items: MovementItem[] = productCols
      .map((col) => {
        const signedQuantity = parseSignedQuantity(row[col.idx]);
        return {
          productId: col.productId as ProductId,
          quantity: Math.abs(signedQuantity),
          ...(isAdjustment ? { signedQuantity } : {}),
        };
      })
      .filter((item) => item.quantity > 0);

    if (items.length === 0) continue;

    const locationId = fallbackLocationId ?? matchLocation(sheetName) ?? 'lucciem';
    movements.push({
      id: `GS-${locationId}-${date}-${r}`,
      date,
      type,
      locationId: type === 'TRANSFER' ? undefined : locationId,
      fromLocation: type === 'OUT' ? locationId : undefined,
      toLocation: type === 'IN' ? locationId : undefined,
      items,
      description:
        description ||
        (type === 'IN'
          ? '입고'
          : type === 'OUT'
            ? '출고'
            : type === 'ADJUSTMENT'
              ? '보정'
              : '이동'),
      partnerOrRecipient: partnerIdx >= 0 ? cellText(row[partnerIdx]) : description || undefined,
      registeredBy: 'Google Sheet',
      sheetSynced: true,
      sheetRows: [{ sheetName, row: r + 1, expectedDescription: description }],
    });
  }
  return movements;
}

export function parseGoogleWorkbook(workbook: XLSX.WorkBook): GoogleSheetImportResult {
  const tabNames = workbook.SheetNames;
  const dashboardSheetName = pickDashboardSheetName(tabNames);
  const dashboardSheet = dashboardSheetName
    ? workbook.Sheets[dashboardSheetName]
    : workbook.Sheets[tabNames[0]];
  const stocks = applyActiveLedgerStocks(
    workbook,
    dashboardSheetName,
    parseDashboardSheet(dashboardSheet)
  );
  const filledCount = stocks.reduce(
    (sum, loc) => sum + Object.values(loc.quantities).reduce((a, b) => a + b, 0),
    0
  );

  const movements = tabNames.flatMap((name) => {
    if (name === dashboardSheetName || isHistoricalTab(name)) return [];
    const locationId = activeLedgerLocation(name);
    if (!locationId) return [];
    return parseMovementSheet(workbook.Sheets[name], locationId, name);
  });

  if (filledCount === 0 && movements.length === 0) {
    throw new Error(
      `시트는 열렸지만 재고 표 형식을 인식하지 못했습니다. 탭: ${tabNames.join(', ')}.`
    );
  }

  return {
    stocks,
    movements,
    tabNames,
    dashboardSheetName,
  };
}

export async function importGoogleSheet(sheetId: string): Promise<GoogleSheetImportResult> {
  const response = await fetch(`/api/google-sheet/${encodeURIComponent(sheetId)}`);
  if (!response.ok) {
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const body = (await response.json()) as { error?: string };
      throw new Error(body.error || '시트를 불러오지 못했습니다.');
    }
    throw new Error(`시트를 불러오지 못했습니다. (HTTP ${response.status})`);
  }

  const buffer = await response.arrayBuffer();
  if (buffer.byteLength < 64) {
    throw new Error('시트 파일이 비어 있습니다. URL과 공유 설정을 확인해 주세요.');
  }

  const workbook = XLSX.read(buffer, { type: 'array', cellDates: false });
  if (workbook.SheetNames.length === 0) {
    throw new Error('시트에서 탭을 찾지 못했습니다.');
  }

  return parseGoogleWorkbook(workbook);
}
