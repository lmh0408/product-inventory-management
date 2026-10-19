import {
  CategoryMaster,
  LocationId,
  LocationMaster,
  LocationStock,
  MasterData,
  ProductCategory,
  ProductId,
  ProductMaster,
} from '../types';
import { LOCATIONS, PRODUCTS } from './initialData';

export const MASTER_TEXT_MAX_LENGTH = 50;
export const MASTER_SUPPLIER_MAX_COUNT = 100;
export const MASTER_PRODUCT_MAX_COUNT = 40;
export const MASTER_LOCATION_MAX_COUNT = 20;
export const MASTER_CATEGORY_MAX_COUNT = 20;
export const MASTER_UNIT_COST_MAX = 1_000_000_000;
export const MASTER_ID_PATTERN = /^[a-z][a-z0-9_]{0,39}$/;
const CATEGORY_ID_PATTERN = /^[^\u0000-\u001f]{1,50}$/;

export const BUILTIN_LEDGER_SHEET_NAMES: Record<string, string> = {
  lucciem: '루씨엠-오름차순',
  seil: '세일정밀공업-오름차순',
  ijin: '아이진-오름차순',
  etc: 'etc-오름차순',
};

const BUILTIN_PRODUCT_MATCH: Record<string, string[]> = {
  smart_top: ['Smart 상단', 'smart상단', '스마트상단'],
  smart_bottom: ['Smart 하단', 'smart하단', '스마트하단'],
  smart_top_eng: ['Smart 상단(영문)', 'smart상단영문', '영문상단'],
  std_top: ['일반 상단', '일반상단'],
  std_bottom: ['일반 하단', '일반하단'],
  std_top_samsung: ['일반 상단(삼성)', '일반상단삼성', '삼성상단'],
  std_bottom_samsung: ['일반 하단(삼성)', '일반하단삼성', '삼성하단'],
  outdoor: ['옥외', '옥외형'],
  mobile: ['이동', '이동형'],
  forklift_bag: ['지게가방'],
  semi_outdoor: ['세미아웃도어', '준옥외'],
  terminal_board: ['단말기보드', '단말기', '전장보드'],
};

const BUILTIN_LOCATION_MATCH: Record<string, string[]> = {
  lucciem: ['루씨엠', '사무실', 'lucciem'],
  seil: ['세일정밀', 'seil'],
  ijin: ['아이진', 'ijin'],
  etc: ['etc', '기타'],
};

const LOCATION_COLORS = ['emerald', 'indigo', 'amber', 'blue', 'rose', 'violet', 'cyan', 'orange'];

export const PRODUCT_CATEGORIES: ProductCategory[] = [
  'Smart AED',
  '일반보관함',
  '옥외/이동/특수',
  '전장부품',
];

const DEFAULT_CATEGORY_LABELS: Record<ProductCategory, string> = {
  'Smart AED': 'Smart AED',
  일반보관함: '일반보관함',
  '옥외/이동/특수': '옥외 / 이동 / 특수',
  전장부품: '전장부품',
};

const DEFAULT_PRODUCTS: ProductMaster[] = PRODUCTS.map((product) => ({
  id: product.id,
  name: product.name,
  unit: product.unit,
  unitCostEstimate: product.unitCostEstimate,
  category: product.category,
}));

const DEFAULT_LOCATIONS: LocationMaster[] = LOCATIONS.map((location) => ({
  id: location.id,
  name: location.name,
  shortName: location.shortName,
  description: location.description,
  sheetName: BUILTIN_LEDGER_SHEET_NAMES[location.id] || `${location.shortName}-오름차순`,
}));

export const DEFAULT_MASTER_DATA: MasterData = {
  products: DEFAULT_PRODUCTS,
  locations: DEFAULT_LOCATIONS,
  categories: PRODUCT_CATEGORIES.map((id) => ({ id, label: DEFAULT_CATEGORY_LABELS[id] })),
  suppliers: ['세일정밀공업', '아이진', 'SMT'],
};

export function cloneMasterData(data: MasterData): MasterData {
  return {
    products: data.products.map((item) => ({ ...item })),
    locations: data.locations.map((item) => ({ ...item })),
    categories: data.categories.map((item) => ({ ...item })),
    suppliers: [...data.suppliers],
  };
}

export function sanitizeMasterText(value: unknown, fallback: string): string {
  const text = String(value ?? '')
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .trim()
    .slice(0, MASTER_TEXT_MAX_LENGTH);
  return text || fallback;
}

function sanitizeUnitCost(value: unknown, fallback: number): number {
  const parsed = typeof value === 'number' ? value : Number(String(value ?? '').replace(/,/g, ''));
  if (!Number.isFinite(parsed) || parsed < 0) return fallback;
  return Math.min(Math.round(parsed), MASTER_UNIT_COST_MAX);
}

function byId<T extends { id: string }>(items: unknown): Map<string, Partial<T>> {
  const map = new Map<string, Partial<T>>();
  if (!Array.isArray(items)) return map;
  for (const item of items) {
    if (item && typeof item === 'object' && typeof (item as { id?: unknown }).id === 'string') {
      map.set((item as { id: string }).id, item as Partial<T>);
    }
  }
  return map;
}

function defaultProduct(id: string): ProductMaster | undefined {
  return DEFAULT_MASTER_DATA.products.find((item) => item.id === id);
}

function defaultLocation(id: string): LocationMaster | undefined {
  return DEFAULT_MASTER_DATA.locations.find((item) => item.id === id);
}

function uniqueTexts(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const text = value.trim();
    if (!text || seen.has(text)) continue;
    seen.add(text);
    result.push(text);
  }
  return result;
}

export function productMatchTokens(product: ProductMaster, previousName = ''): string[] {
  return uniqueTexts([
    product.name,
    previousName,
    product.id,
    ...(BUILTIN_PRODUCT_MATCH[product.id] || []),
  ]);
}

export function locationMatchTokens(location: LocationMaster, previous?: Partial<LocationMaster>): string[] {
  return uniqueTexts([
    location.name,
    location.shortName,
    location.sheetName,
    location.id,
    previous?.name || '',
    previous?.shortName || '',
    previous?.sheetName || '',
    ...(BUILTIN_LOCATION_MATCH[location.id] || []),
  ]);
}

export function createMasterId(prefix: 'p' | 'l' | 'c', used: string[]): string {
  let id = '';
  do {
    id = `${prefix}_${Math.random().toString(36).slice(2, 8)}`;
  } while (used.includes(id) || !MASTER_ID_PATTERN.test(id));
  return id;
}

export function createLocationSheetName(shortName: string, id: string, used: string[]): string {
  const cleaned = shortName.replace(/[\\/?*[\]:]/g, '').trim() || id;
  const base = `${cleaned}-오름차순`.slice(0, 80);
  let name = base;
  let suffix = 2;
  while (used.includes(name)) {
    name = `${base.slice(0, 70)}_${suffix}-오름차순`;
    suffix += 1;
  }
  return name;
}

/**
 * Keeps whatever IDs are present. Missing built-in IDs stay deleted.
 * An empty or unreadable product list falls back to the defaults.
 */
export function normalizeMasterData(raw: unknown): MasterData {
  const source = (raw && typeof raw === 'object' ? raw : {}) as Partial<Record<keyof MasterData, unknown>>;
  const productRows = byId<ProductMaster>(source.products);
  const locationRows = byId<LocationMaster>(source.locations);
  const categoryRows = byId<CategoryMaster>(source.categories);
  const explicitProducts = Array.isArray(source.products) && source.products.length > 0;
  const explicitLocations = Array.isArray(source.locations) && source.locations.length > 0;
  const explicitCategories = Array.isArray(source.categories) && source.categories.length > 0;

  const categories: CategoryMaster[] = [];
  const categorySource = explicitCategories ? categoryRows : byId<CategoryMaster>(DEFAULT_MASTER_DATA.categories);
  for (const [id, item] of categorySource) {
    if (!CATEGORY_ID_PATTERN.test(id) || categories.some((category) => category.id === id)) continue;
    const fallback = DEFAULT_MASTER_DATA.categories.find((category) => category.id === id);
    categories.push({
      id,
      label: sanitizeMasterText(item.label, fallback?.label || id),
    });
    if (categories.length >= MASTER_CATEGORY_MAX_COUNT) break;
  }
  if (categories.length === 0) {
    categories.push(...DEFAULT_MASTER_DATA.categories.map((item) => ({ ...item })));
  }

  const products: ProductMaster[] = [];
  const productSource = explicitProducts ? productRows : byId<ProductMaster>(DEFAULT_MASTER_DATA.products);
  for (const [id, item] of productSource) {
    if (!MASTER_ID_PATTERN.test(id) || products.some((product) => product.id === id)) continue;
    const fallback = defaultProduct(id);
    const category = String(item.category || fallback?.category || categories[0].id);
    products.push({
      id,
      name: sanitizeMasterText(item.name, fallback?.name || id),
      unit: item.unit === undefined ? fallback?.unit || '' : sanitizeMasterText(item.unit, ''),
      unitCostEstimate: sanitizeUnitCost(item.unitCostEstimate, fallback?.unitCostEstimate || 0),
      category: categories.some((entry) => entry.id === category) ? category : categories[0].id,
    });
    if (products.length >= MASTER_PRODUCT_MAX_COUNT) break;
  }
  if (products.length === 0) {
    return cloneMasterData(DEFAULT_MASTER_DATA);
  }

  const locations: LocationMaster[] = [];
  const usedSheetNames = new Set<string>();
  const locationSource = explicitLocations ? locationRows : byId<LocationMaster>(DEFAULT_MASTER_DATA.locations);
  for (const [id, item] of locationSource) {
    if (!MASTER_ID_PATTERN.test(id) || locations.some((location) => location.id === id)) continue;
    const fallback = defaultLocation(id);
    const shortName = sanitizeMasterText(item.shortName, fallback?.shortName || id);
    const requestedSheet = sanitizeMasterText(item.sheetName, fallback?.sheetName || '');
    const sheetName = usedSheetNames.has(requestedSheet)
      ? createLocationSheetName(shortName, id, [...usedSheetNames])
      : requestedSheet || createLocationSheetName(shortName, id, [...usedSheetNames]);
    usedSheetNames.add(sheetName);
    locations.push({
      id,
      name: sanitizeMasterText(item.name, fallback?.name || shortName),
      shortName,
      description:
        item.description === undefined
          ? fallback?.description || ''
          : sanitizeMasterText(item.description, ''),
      sheetName,
    });
    if (locations.length >= MASTER_LOCATION_MAX_COUNT) break;
  }
  if (locations.length === 0) {
    return cloneMasterData(DEFAULT_MASTER_DATA);
  }

  const suppliers: string[] = [];
  if (Array.isArray(source.suppliers)) {
    for (const value of source.suppliers) {
      const name = sanitizeMasterText(value, '');
      if (name && !suppliers.includes(name)) suppliers.push(name);
      if (suppliers.length >= MASTER_SUPPLIER_MAX_COUNT) break;
    }
  }

  return {
    products,
    locations,
    categories,
    suppliers: Array.isArray(source.suppliers) ? suppliers : [...DEFAULT_MASTER_DATA.suppliers],
  };
}

export function alignStocksWithMaster(stocks: LocationStock[], data: MasterData): LocationStock[] {
  const productIds = data.products.map((product) => product.id);
  const byLocation = new Map(stocks.map((stock) => [stock.locationId, stock]));
  return data.locations.map((location) => {
    const current = byLocation.get(location.id);
    const quantities = {} as Record<ProductId, number>;
    const unassembledQuantities = {} as Record<ProductId, number>;
    for (const productId of productIds) {
      quantities[productId] = Number(current?.quantities?.[productId] || 0);
      unassembledQuantities[productId] = Number(current?.unassembledQuantities?.[productId] || 0);
    }
    return {
      locationId: location.id,
      quantities,
      unassembledQuantities,
      exceptionNotes: current?.exceptionNotes,
      remarks: current?.remarks || '',
    };
  });
}

export function isSameMasterData(a: MasterData, b: MasterData): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

let activeCategoryLabels: Record<string, string> = { ...DEFAULT_CATEGORY_LABELS };
let activeSuppliers: string[] = [...DEFAULT_MASTER_DATA.suppliers];
let activeLedgerNames: Record<string, string> = { ...BUILTIN_LEDGER_SHEET_NAMES };

// PRODUCTS and LOCATIONS are imported directly across the app, so the catalog is updated in place.
export function applyMasterData(data: MasterData): void {
  const existingProducts = new Map(PRODUCTS.map((product) => [product.id, product]));
  const nextProducts = data.products.map((master) => {
    const existing = existingProducts.get(master.id);
    if (existing) {
      existing.name = master.name;
      existing.unit = master.unit;
      existing.unitCostEstimate = master.unitCostEstimate;
      existing.category = master.category;
      return existing;
    }
    return {
      id: master.id,
      name: master.name,
      category: master.category,
      unit: master.unit,
      defaultSupplier: 'smt' as LocationId | 'smt',
      defaultMinThreshold: 0,
      moq: 0,
      unitCostEstimate: master.unitCostEstimate,
      description: '',
      requiresAssembly: false,
    };
  });
  PRODUCTS.splice(0, PRODUCTS.length, ...nextProducts);

  const existingLocations = new Map(LOCATIONS.map((location) => [location.id, location]));
  const nextLocations = data.locations.map((master, index) => {
    const existing = existingLocations.get(master.id);
    if (existing) {
      existing.name = master.name;
      existing.shortName = master.shortName;
      existing.description = master.description;
      return existing;
    }
    return {
      id: master.id,
      name: master.name,
      shortName: master.shortName,
      type: 'partner' as const,
      description: master.description,
      color: LOCATION_COLORS[index % LOCATION_COLORS.length],
    };
  });
  LOCATIONS.splice(0, LOCATIONS.length, ...nextLocations);

  activeCategoryLabels = {};
  for (const category of data.categories) activeCategoryLabels[category.id] = category.label;
  activeSuppliers = [...data.suppliers];
  activeLedgerNames = {};
  for (const location of data.locations) activeLedgerNames[location.id] = location.sheetName;
}

export function getLocationSheetName(locationId: LocationId): string | null {
  return activeLedgerNames[locationId] || null;
}

export function findLocationIdBySheetName(sheetName: string): LocationId | null {
  const found = Object.entries(activeLedgerNames).find(([, name]) => name === sheetName);
  return found?.[0] || null;
}

export function getCategoryLabel(category: ProductCategory): string {
  return activeCategoryLabels[category] || category;
}

export function getSuppliers(): string[] {
  return [...activeSuppliers];
}
