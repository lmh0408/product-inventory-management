import * as XLSX from 'xlsx';
import { MasterData } from '../types';
import { locationMatchTokens, normalizeMasterData, productMatchTokens } from '../data/masterData';

export const MASTER_DATA_SHEET_NAME = '마스터데이터';

export const MASTER_DATA_HEADER = ['구분', 'ID', '이름', '약칭', '단위', '단가', '설명', '분류', '시트탭'] as const;

export interface MasterSheetItem {
  id: string;
  name: string;
  match: string[];
  shortName?: string;
  sheetName?: string;
}

export interface MasterSheetStructure {
  products: MasterSheetItem[];
  locations: MasterSheetItem[];
  removedProducts: MasterSheetItem[];
  removedLocations: MasterSheetItem[];
}

const KIND = {
  product: '제품',
  location: '거점',
  category: '분류',
  supplier: '공급사',
} as const;

export type MasterDataSheetRow = string[];

export function masterDataToSheetRows(data: MasterData): MasterDataSheetRow[] {
  return [
    [...MASTER_DATA_HEADER],
    ...data.products.map((item) => [
      KIND.product,
      item.id,
      item.name,
      '',
      item.unit,
      String(item.unitCostEstimate),
      '',
      item.category,
      '',
    ]),
    ...data.locations.map((item) => [
      KIND.location,
      item.id,
      item.name,
      item.shortName,
      '',
      '',
      item.description,
      '',
      item.sheetName,
    ]),
    ...data.categories.map((item) => [KIND.category, item.id, item.label, '', '', '', '', '', '']),
    ...data.suppliers.map((name, index) => [
      KIND.supplier,
      String(index + 1),
      name,
      '',
      '',
      '',
      '',
      '',
      '',
    ]),
  ];
}

/** Returns null when the workbook has no master data tab yet. */
export function parseMasterDataSheet(workbook: XLSX.WorkBook): MasterData | null {
  const sheet = workbook.Sheets[MASTER_DATA_SHEET_NAME];
  if (!sheet) return null;

  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '', raw: false });
  const cellText = (value: unknown) => String(value ?? '').trim();
  const products: Record<string, unknown>[] = [];
  const locations: Record<string, unknown>[] = [];
  const categories: Record<string, unknown>[] = [];
  const suppliers: string[] = [];

  for (const row of rows.slice(1)) {
    const [kind, id, name, shortName, unit, unitCost, description, category, sheetName] =
      MASTER_DATA_HEADER.map((_, index) => cellText(row[index]));
    if (kind === KIND.product) {
      products.push({ id, name, unit, unitCostEstimate: unitCost, category });
    } else if (kind === KIND.location) {
      locations.push({ id, name, shortName, description, sheetName });
    } else if (kind === KIND.category) {
      categories.push({ id, label: name });
    } else if (kind === KIND.supplier) {
      suppliers.push(name);
    }
  }

  return normalizeMasterData({ products, locations, categories, suppliers });
}

export function buildMasterSheetStructure(previous: MasterData, next: MasterData): MasterSheetStructure {
  const previousProducts = new Map(previous.products.map((item) => [item.id, item]));
  const previousLocations = new Map(previous.locations.map((item) => [item.id, item]));
  return {
    products: next.products.map((item) => ({
      id: item.id,
      name: item.name,
      match: productMatchTokens(item, previousProducts.get(item.id)?.name || ''),
    })),
    locations: next.locations.map((item) => ({
      id: item.id,
      name: item.name,
      shortName: item.shortName,
      sheetName: item.sheetName,
      match: locationMatchTokens(item, previousLocations.get(item.id)),
    })),
    removedProducts: previous.products
      .filter((item) => !next.products.some((nextItem) => nextItem.id === item.id))
      .map((item) => ({ id: item.id, name: item.name, match: productMatchTokens(item) })),
    removedLocations: previous.locations
      .filter((item) => !next.locations.some((nextItem) => nextItem.id === item.id))
      .map((item) => ({
        id: item.id,
        name: item.name,
        shortName: item.shortName,
        sheetName: item.sheetName,
        match: locationMatchTokens(item),
      })),
  };
}
