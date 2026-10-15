export type LocationId = 'lucciem' | 'seil' | 'ijin' | 'etc';

export interface LocationInfo {
  id: LocationId;
  name: string;
  shortName: string;
  type: 'headquarter' | 'manufacturing' | 'partner';
  description: string;
  color: string;
}

export type ProductId =
  | 'smart_top'
  | 'smart_bottom'
  | 'smart_top_eng'
  | 'std_top'
  | 'std_bottom'
  | 'std_top_samsung'
  | 'std_bottom_samsung'
  | 'outdoor'
  | 'mobile'
  | 'forklift_bag'
  | 'semi_outdoor'
  | 'terminal_board';

export type ProductCategory = 'Smart AED' | '일반보관함' | '옥외/이동/특수' | '전장부품';

export interface ProductInfo {
  id: ProductId;
  name: string;
  category: ProductCategory;
  unit: string;
  defaultSupplier: LocationId | 'smt';
  defaultMinThreshold: number;
  moq: number; // Minimum Order Quantity
  unitCostEstimate: number; // in KRW
  description: string;
  requiresAssembly?: boolean; // 추가 조립 필요 대상 여부 (모든 보관함 상단, 옥외보관함, 이동형 보관함)
}

export type MovementType = 'IN' | 'OUT' | 'TRANSFER' | 'ADJUSTMENT';

export interface MovementItem {
  productId: ProductId;
  quantity: number;
  signedQuantity?: number; // 보정 행에서 원장에 기록된 품목별 부호 보존
  isUnassembled?: boolean; // 미조립 여부 구분
  notes?: string; // 특이사항 (B급, 스크래치, 샘플 등)
}

export interface SheetRowReference {
  sheetName: string;
  row: number; // Google Sheets 1-based row number
  expectedDescription?: string;
}

export interface StockMovement {
  id: string;
  date: string; // YYYY-MM-DD
  time?: string;
  type: MovementType;
  fromLocation?: LocationId; // For TRANSFER or OUT
  toLocation?: LocationId; // For TRANSFER or IN
  locationId?: LocationId; // For simple IN/OUT
  items: MovementItem[];
  description: string;
  partnerOrRecipient?: string;
  registeredBy?: string;
  sheetSynced?: boolean;
  sheetRows?: SheetRowReference[];
  sourceMovementIds?: string[]; // 화면에서 묶은 이동 내역의 원본 ID
}

export interface LocationStock {
  locationId: LocationId;
  // 완제품 / 정상 가용 재고 수량
  quantities: Record<ProductId, number>;
  // 미조립 상태 재고 수량 (독립 분리 카운트)
  unassembledQuantities: Record<ProductId, number>;
  // B급, 역설계 Sample, 외관 상처/납품 불가 등 자유 서술형 비고 메모
  exceptionNotes?: Partial<Record<ProductId, string>>;
  // 거점 종합 비고
  remarks?: string;
}

export interface ThresholdRule {
  productId: ProductId;
  locationId?: LocationId | 'ALL';
  minThreshold: number;
  reorderQuantity: number;
  targetSupplier: string;
  autoOrderEnabled: boolean;
}

export type PurchaseOrderStatus =
  | 'DRAFT' // 1단계: 안전재고 미달 자동 추천 및 발주 검토
  | 'ORDERED' // 2단계: 협력사(세일정밀/SMT) 발주 완료 및 전송
  | 'PRODUCING' // 3단계: 가공/제작/조립 중
  | 'IN_TRANSIT' // 4단계: 출하 및 배송 중
  | 'COMPLETED'; // 5단계: 입고 검수 완료 및 재고 자동 합산 반영

export interface PurchaseOrderItem {
  productId: ProductId;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  reason: string;
  isUnassembledOrder?: boolean;
}

export interface PurchaseOrder {
  id: string;
  orderDate: string;
  supplier: string;
  supplierLocationId?: LocationId;
  targetLocationId: LocationId; // 입고 대상 거점 (예: 루씨엠, 세일정밀)
  status: PurchaseOrderStatus;
  items: PurchaseOrderItem[];
  totalAmount: number;
  notes: string;
  expectedDeliveryDate?: string;
  completedAt?: string;
  isAutoStockApplied?: boolean; // 입고 시 재고 자동 가산 여부
}

export interface SheetConfig {
  sheetId: string;
  sheetUrl?: string;
  sheetName: string;
  apiKey?: string;
  webhookUrl?: string;
  lastSyncedAt: string | null;
  lastSyncedAtMs?: number;
  lastSavedAt: string | null;
  isSyncing: boolean;
  syncMode: 'TWO_WAY' | 'PULL_ONLY' | 'PUSH_ONLY';
  lastError?: string | null;
  isConnected?: boolean;
  importedTabs?: string[];
}

export interface StockAlert {
  id: string;
  productId: ProductId;
  productName: string;
  locationId: LocationId | 'ALL';
  locationName: string;
  currentStock: number; // 완제품 + 미조립 총합 또는 완제품
  assembledStock?: number;
  unassembledStock?: number;
  threshold?: number;
  minThreshold?: number;
  shortage?: number;
  deficit?: number;
  message?: string;
  createdAt: string;
  severity: 'CRITICAL' | 'WARNING';
}

