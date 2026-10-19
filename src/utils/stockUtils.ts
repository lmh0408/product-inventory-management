import {
  LocationStock,
  LocationId,
  ProductId,
  StockMovement,
  ThresholdRule,
  StockAlert,
  PurchaseOrder,
  MovementItem,
} from '../types';
import { PRODUCTS, LOCATIONS } from '../data/initialData';

// 추가 조립 필요 대상 품목 목록: 모든 보관함 상단, 옥외보관함, 이동형 보관함
export const ASSEMBLY_TARGET_PRODUCT_IDS: ProductId[] = [
  'smart_top',
  'smart_top_eng',
  'std_top',
  'std_top_samsung',
  'outdoor',
  'mobile',
];

export function isAssemblyTarget(productId: ProductId): boolean {
  return ASSEMBLY_TARGET_PRODUCT_IDS.includes(productId);
}

// 조립 작업 수행 (미조립 -> 완제품 전환 및 전장보드 소모 옵션)
export function performAssemblyConversion(
  currentStocks: LocationStock[],
  locationId: LocationId,
  productId: ProductId,
  quantity: number,
  consumeTerminalBoard?: boolean,
  notes?: string
): { updatedStocks: LocationStock[]; createdMovement: StockMovement } {
  const newStocks = JSON.parse(JSON.stringify(currentStocks)) as LocationStock[];
  const targetLoc = newStocks.find((s) => s.locationId === locationId) || newStocks[0];

  if (!targetLoc.unassembledQuantities) targetLoc.unassembledQuantities = {} as Record<ProductId, number>;
  if (!targetLoc.quantities) targetLoc.quantities = {} as Record<ProductId, number>;

  const currentUnassembled = targetLoc.unassembledQuantities[productId] || 0;
  const actualQty = Math.min(currentUnassembled, quantity);

  // 1. 미조립 차감
  targetLoc.unassembledQuantities[productId] = Math.max(0, currentUnassembled - actualQty);

  // 2. 완제 가산
  targetLoc.quantities[productId] = (targetLoc.quantities[productId] || 0) + actualQty;

  // 3. 단말기보드(IoT PCB) 동시 소모 처리
  let terminalBoardDeducted = 0;
  if (consumeTerminalBoard) {
    const currentTB = targetLoc.quantities['terminal_board'] || 0;
    terminalBoardDeducted = Math.min(currentTB, actualQty);
    targetLoc.quantities['terminal_board'] = Math.max(0, currentTB - terminalBoardDeducted);
  }

  const product = PRODUCTS.find((p) => p.id === productId);
  const prodName = product ? product.name : productId;
  const locInfo = LOCATIONS.find((l) => l.id === locationId);
  const locName = locInfo ? locInfo.shortName : locationId;

  const movementDesc = `[조립 완료] ${locName} ${prodName} ${actualQty} 조립 완료 (미조립 ➔ 완제품 전환${
    terminalBoardDeducted > 0 ? `, 단말기보드 ${terminalBoardDeducted}EA 결합` : ''
  })${notes ? ` - ${notes}` : ''}`;

  const createdMovement: StockMovement = {
    id: `asm-${Date.now()}`,
    date: new Date().toISOString().split('T')[0],
    time: new Date().toTimeString().split(' ')[0].substring(0, 5),
    type: 'IN',
    locationId,
    items: [
      {
        productId,
        quantity: actualQty,
        isUnassembled: false,
        notes: '추가 조립 공정 완료',
      },
    ],
    description: movementDesc,
    registeredBy: '생산/조립 관리자 (루씨엠)',
    sheetSynced: true,
  };

  return { updatedStocks: newStocks, createdMovement };
}

// 완제 재고 합계 계산
export function calculateProductTotals(stocks: LocationStock[]): Record<ProductId, number> {
  const totals: Partial<Record<ProductId, number>> = {};
  for (const product of PRODUCTS) {
    totals[product.id] = 0;
  }

  for (const stock of stocks) {
    for (const [pId, qty] of Object.entries(stock.quantities)) {
      const productId = pId as ProductId;
      totals[productId] = (totals[productId] || 0) + (qty || 0);
    }
  }

  return totals as Record<ProductId, number>;
}

// 미조립 재고 합계 계산 (독립 카운트)
export function calculateUnassembledTotals(stocks: LocationStock[]): Record<ProductId, number> {
  const totals: Partial<Record<ProductId, number>> = {};
  for (const product of PRODUCTS) {
    totals[product.id] = 0;
  }

  for (const stock of stocks) {
    if (stock.unassembledQuantities) {
      for (const [pId, qty] of Object.entries(stock.unassembledQuantities)) {
        const productId = pId as ProductId;
        totals[productId] = (totals[productId] || 0) + (qty || 0);
      }
    }
  }

  return totals as Record<ProductId, number>;
}

// 완제 + 미조립 총 보유재고 합계 계산
export function calculateCombinedProductTotals(stocks: LocationStock[]): Record<ProductId, number> {
  const assembled = calculateProductTotals(stocks);
  const unassembled = calculateUnassembledTotals(stocks);
  const combined: Partial<Record<ProductId, number>> = {};

  for (const product of PRODUCTS) {
    combined[product.id] = (assembled[product.id] || 0) + (unassembled[product.id] || 0);
  }

  return combined as Record<ProductId, number>;
}

export function calculateLocationTotals(stocks: LocationStock[]): {
  assembled: Record<string, number>;
  unassembled: Record<string, number>;
  total: Record<string, number>;
} {
  const assembled: Record<string, number> = {};
  const unassembled: Record<string, number> = {};
  const total: Record<string, number> = {};

  for (const stock of stocks) {
    let sumAssembled = 0;
    for (const qty of Object.values(stock.quantities)) {
      sumAssembled += qty || 0;
    }
    let sumUnassembled = 0;
    if (stock.unassembledQuantities) {
      for (const qty of Object.values(stock.unassembledQuantities)) {
        sumUnassembled += qty || 0;
      }
    }

    assembled[stock.locationId] = sumAssembled;
    unassembled[stock.locationId] = sumUnassembled;
    total[stock.locationId] = sumAssembled + sumUnassembled;
  }

  return { assembled, unassembled, total };
}

export function calculateCategoryTotals(stocks: LocationStock[]): {
  smartAED: { lucciem: number; seil: number; ijin: number; etc: number; total: number; unassembled: number };
  standard: { lucciem: number; seil: number; ijin: number; etc: number; total: number; unassembled: number };
  special: { lucciem: number; seil: number; ijin: number; etc: number; total: number; unassembled: number };
  grandTotal: number;
  grandUnassembledTotal: number;
  terminalBoard: number;
} {
  const getQty = (locId: string, pIds: ProductId[], isUnassembled = false) => {
    const loc = stocks.find((s) => s.locationId === locId);
    if (!loc) return 0;
    const targetMap = isUnassembled ? loc.unassembledQuantities : loc.quantities;
    if (!targetMap) return 0;
    return pIds.reduce((sum, id) => sum + (targetMap[id] || 0), 0);
  };

  const idsOf = (category: string) =>
    PRODUCTS.filter((product) => product.category === category && product.id !== 'terminal_board').map(
      (product) => product.id
    );
  const smartPIds = idsOf('Smart AED');
  const stdPIds = idsOf('일반보관함');
  const specialPIds = idsOf('옥외/이동/특수');

  const smartAED = {
    lucciem: getQty('lucciem', smartPIds),
    seil: getQty('seil', smartPIds),
    ijin: getQty('ijin', smartPIds),
    etc: getQty('etc', smartPIds),
    total: 0,
    unassembled:
      getQty('lucciem', smartPIds, true) +
      getQty('seil', smartPIds, true) +
      getQty('ijin', smartPIds, true) +
      getQty('etc', smartPIds, true),
  };
  smartAED.total = stocks.reduce((sum, stock) => sum + getQty(stock.locationId, smartPIds), 0);

  const standard = {
    lucciem: getQty('lucciem', stdPIds),
    seil: getQty('seil', stdPIds),
    ijin: getQty('ijin', stdPIds),
    etc: getQty('etc', stdPIds),
    total: 0,
    unassembled:
      getQty('lucciem', stdPIds, true) +
      getQty('seil', stdPIds, true) +
      getQty('ijin', stdPIds, true) +
      getQty('etc', stdPIds, true),
  };
  standard.total = stocks.reduce((sum, stock) => sum + getQty(stock.locationId, stdPIds), 0);

  const special = {
    lucciem: getQty('lucciem', specialPIds),
    seil: getQty('seil', specialPIds),
    ijin: getQty('ijin', specialPIds),
    etc: getQty('etc', specialPIds),
    total: 0,
    unassembled:
      getQty('lucciem', specialPIds, true) +
      getQty('seil', specialPIds, true) +
      getQty('ijin', specialPIds, true) +
      getQty('etc', specialPIds, true),
  };
  special.total = stocks.reduce((sum, stock) => sum + getQty(stock.locationId, specialPIds), 0);

  const grandTotal = smartAED.total + standard.total + special.total;
  const grandUnassembledTotal = smartAED.unassembled + standard.unassembled + special.unassembled;
  const terminalBoard =
    getQty('lucciem', ['terminal_board']) +
    getQty('seil', ['terminal_board']) +
    getQty('ijin', ['terminal_board']) +
    getQty('etc', ['terminal_board']);

  return { smartAED, standard, special, grandTotal, grandUnassembledTotal, terminalBoard };
}

export function detectStockAlerts(
  stocks: LocationStock[],
  thresholds: ThresholdRule[]
): StockAlert[] {
  const assembledTotals = calculateProductTotals(stocks);
  const unassembledTotals = calculateUnassembledTotals(stocks);
  const alerts: StockAlert[] = [];

  for (const rule of thresholds) {
    const assembled = assembledTotals[rule.productId] || 0;
    const unassembled = unassembledTotals[rule.productId] || 0;
    const combined = assembled + unassembled;

    // We trigger alert when assembled stock is below minimum threshold
    if (assembled <= rule.minThreshold) {
      const product = PRODUCTS.find((p) => p.id === rule.productId);
      const isCritical = assembled <= Math.floor(rule.minThreshold * 0.4);
      alerts.push({
        id: `alert-${rule.productId}`,
        productId: rule.productId,
        productName: product ? product.name : rule.productId,
        locationId: 'ALL',
        locationName: '전체 거점 합계',
        currentStock: combined,
        assembledStock: assembled,
        unassembledStock: unassembled,
        threshold: rule.minThreshold,
        shortage: Math.max(0, rule.minThreshold - assembled),
        createdAt: new Date().toISOString(),
        severity: isCritical ? 'CRITICAL' : 'WARNING',
      });
    }
  }

  return alerts.sort((a, b) => (b.severity === 'CRITICAL' ? 1 : -1));
}

export function calculateTotalStockValue(stocks: LocationStock[]): number {
  const totals = calculateProductTotals(stocks);
  const unassembled = calculateUnassembledTotals(stocks);
  let totalValue = 0;
  for (const product of PRODUCTS) {
    const qty = (totals[product.id] || 0) + (unassembled[product.id] || 0) * 0.85; // unassembled valued at 85%
    totalValue += qty * product.unitCostEstimate;
  }
  return totalValue;
}

export const calculateTotalEstimatedValue = calculateTotalStockValue;

export function applyMovementToStocks(
  currentStocks: LocationStock[],
  movement: StockMovement
): LocationStock[] {
  const newStocks = JSON.parse(JSON.stringify(currentStocks)) as LocationStock[];

  const findLoc = (id?: string) => newStocks.find((s) => s.locationId === id);

  for (const item of movement.items) {
    const isTarget = isAssemblyTarget(item.productId);
    if (typeof item.signedQuantity === 'number' && movement.type !== 'TRANSFER') {
      const target = findLoc(
        movement.locationId ||
          (movement.type === 'IN' ? movement.toLocation : movement.fromLocation)
      );
      if (target) {
        if (!target.quantities) target.quantities = {} as Record<ProductId, number>;
        target.quantities[item.productId] = Math.max(
          0,
          (target.quantities[item.productId] || 0) + item.signedQuantity
        );
      }
      continue;
    }

    if (movement.type === 'ADJUSTMENT') {
      const target = findLoc(movement.locationId);
      if (target) {
        target.quantities[item.productId] =
          (target.quantities[item.productId] || 0) + item.quantity;
      }
    } else if (movement.type === 'IN') {
      const target = findLoc(movement.locationId || movement.toLocation);
      if (target) {
        if (!target.quantities) target.quantities = {} as Record<ProductId, number>;
        target.quantities[item.productId] =
          (target.quantities[item.productId] || 0) + item.quantity;
      }
    } else if (movement.type === 'OUT') {
      const target = findLoc(movement.locationId || movement.fromLocation);
      if (target) {
        if (!target.quantities) target.quantities = {} as Record<ProductId, number>;
        target.quantities[item.productId] = Math.max(
          0,
          (target.quantities[item.productId] || 0) - item.quantity
        );
      }
    } else if (movement.type === 'TRANSFER') {
      const fromLoc = findLoc(movement.fromLocation);
      const toLoc = findLoc(movement.toLocation);

      if (fromLoc && toLoc) {
        if (!fromLoc.quantities) fromLoc.quantities = {} as Record<ProductId, number>;
        fromLoc.quantities[item.productId] = Math.max(
          0,
          (fromLoc.quantities[item.productId] || 0) - item.quantity
        );

        if (!toLoc.quantities) toLoc.quantities = {} as Record<ProductId, number>;
        toLoc.quantities[item.productId] =
          (toLoc.quantities[item.productId] || 0) + item.quantity;
      }
    }
  }

  return newStocks;
}

// PO 5단계 입고 완료 시 자동으로 재고 가산 및 입고 이력 생성
export function applyPurchaseOrderCompletion(
  currentStocks: LocationStock[],
  po: PurchaseOrder
): { updatedStocks: LocationStock[]; createdMovement: StockMovement } {
  const newStocks = JSON.parse(JSON.stringify(currentStocks)) as LocationStock[];
  const targetLocation = newStocks.find((s) => s.locationId === po.targetLocationId) || newStocks[0];

  const movementItems: MovementItem[] = [];

  for (const item of po.items) {
    const isUnassembled = !!item.isUnassembledOrder;
    const targetMapKey = isUnassembled ? 'unassembledQuantities' : 'quantities';
    if (!targetLocation[targetMapKey]) {
      targetLocation[targetMapKey] = {} as Record<ProductId, number>;
    }
    targetLocation[targetMapKey][item.productId] =
      (targetLocation[targetMapKey][item.productId] || 0) + item.quantity;

    movementItems.push({
      productId: item.productId,
      quantity: item.quantity,
      isUnassembled,
      notes: `발주서(${po.id}) 입고 검수 완료`,
    });
  }

  const createdMovement: StockMovement = {
    id: `mov-po-${Date.now().toString().slice(-6)}`,
    date: new Date().toISOString().split('T')[0],
    time: new Date().toTimeString().slice(0, 5),
    type: 'IN',
    locationId: po.targetLocationId,
    items: movementItems,
    description: `발주서 [${po.id}] 협력사(${po.supplier}) 제작 완료 건 정식 입고 반영`,
    partnerOrRecipient: po.supplier,
    registeredBy: '시스템 (발주완료 자동입고)',
    sheetSynced: true,
  };

  return { updatedStocks: newStocks, createdMovement };
}

export function formatCurrencyKRW(amount: number): string {
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'KRW',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function generateAutoPurchaseOrder(
  alerts: StockAlert[],
  thresholds: ThresholdRule[],
  defaultSupplier = '세일정밀공업 (외 협력사)'
): PurchaseOrder {
  const items = alerts.map((alert) => {
    const rule = thresholds.find((r) => r.productId === alert.productId);
    const product = PRODUCTS.find((p) => p.id === alert.productId);
    const reorderQty = rule ? rule.reorderQuantity : 20;
    const unitPrice = product ? product.unitCostEstimate : 100000;

    return {
      productId: alert.productId,
      productName: alert.productName,
      quantity: reorderQty,
      unitPrice,
      totalAmount: reorderQty * unitPrice,
      reason: `현재 완제재고 ${alert.assembledStock}으로 안전재고(${alert.threshold}) 미달`,
      isUnassembledOrder: false,
    };
  });

  const totalAmount = items.reduce((acc, curr) => acc + curr.totalAmount, 0);

  const today = new Date().toISOString().split('T')[0];
  const expectedDelivery = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0];

  return {
    id: `AUTO-PO-${Date.now().toString().slice(-6)}`,
    orderDate: today,
    supplier: defaultSupplier,
    targetLocationId: 'lucciem',
    status: 'DRAFT',
    items,
    totalAmount,
    notes: '안전재고 임계치 이하 도달 품목 시스템 자동 산출 발주서',
    expectedDeliveryDate: expectedDelivery,
    isAutoStockApplied: false,
  };
}

export function exportMatrixToCSV(stocks: LocationStock[]): string {
  const headers = [
    '장소',
    '구분',
    ...PRODUCTS.map((p) => p.name),
    '비고 (B급/샘플/외관상처 등 예외메모)',
  ];
  const rows: string[][] = [headers];

  for (const loc of LOCATIONS) {
    const stock = stocks.find((s) => s.locationId === loc.id);

    // 1. Assembled Row
    const assembledRow = [
      loc.shortName,
      '완제품/정상',
      ...PRODUCTS.map((p) => (stock ? String(stock.quantities[p.id] || 0) : '0')),
      stock?.remarks || '',
    ];
    rows.push(assembledRow);

    // 2. Unassembled Row (분리 카운트)
    const hasUnassembled =
      stock?.unassembledQuantities &&
      Object.values(stock.unassembledQuantities).some((q) => (q || 0) > 0);
    if (hasUnassembled) {
      const unassembledRow = [
        loc.shortName,
        '미조립',
        ...PRODUCTS.map((p) =>
          stock?.unassembledQuantities ? String(stock.unassembledQuantities[p.id] || 0) : '0'
        ),
        '미조립 부품 분리 보관',
      ];
      rows.push(unassembledRow);
    }
  }

  // Totals row
  const totals = calculateProductTotals(stocks);
  const unassembledTotals = calculateUnassembledTotals(stocks);

  const totalRow = [
    '합계 (완제품)',
    '완제품 총계',
    ...PRODUCTS.map((p) => String(totals[p.id] || 0)),
    '완제 총합',
  ];
  rows.push(totalRow);

  const totalUnassembledRow = [
    '합계 (미조립)',
    '미조립 총계',
    ...PRODUCTS.map((p) => String(unassembledTotals[p.id] || 0)),
    '미조립 총합',
  ];
  rows.push(totalUnassembledRow);

  return rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(',')).join('\n');
}

export const exportStocksToCSV = exportMatrixToCSV;

import * as XLSX from 'xlsx';

export function exportGoogleSpreadsheetXLSX(
  stocks: LocationStock[],
  movements: StockMovement[]
): void {
  const wb = XLSX.utils.book_new();

  // 1. Sheet: 보관함 Dashboard
  const totals = calculateProductTotals(stocks);
  const dashboardHeaders = ['장소', ...PRODUCTS.map((p) => p.name), '비고'];
  const dashboardRows = LOCATIONS.map((loc) => {
    const s = stocks.find((st) => st.locationId === loc.id);
    const remarks = s?.remarks || '';
    return [
      loc.name,
      ...PRODUCTS.map((p) => (s ? s.quantities[p.id] || 0 : 0)),
      remarks,
    ];
  });
  
  // Total row
  const totalRow = [
    '총계 (보유 재고)',
    ...PRODUCTS.map((p) => totals[p.id] || 0),
    '',
  ];

  const wsDashboard = XLSX.utils.aoa_to_sheet([
    dashboardHeaders,
    ...dashboardRows,
    totalRow,
  ]);
  XLSX.utils.book_append_sheet(wb, wsDashboard, '보관함 Dashboard');

  // 2. Sheets for each location: 루씨엠, 세일정밀공업, 아이진, ETC
  const locationTabs = [
    { name: '루씨엠', locId: 'lucciem' },
    { name: '세일정밀공업', locId: 'seil' },
    { name: '아이진', locId: 'ijin' },
    { name: 'ETC', locId: 'etc' },
  ];

  locationTabs.forEach((tab) => {
    const locMovements = movements.filter(
      (m) =>
        m.locationId === tab.locId ||
        m.fromLocation === tab.locId ||
        m.toLocation === tab.locId
    );

    const locHeaders = ['일자', '구분', '품목 및 수량', '내역', '납품처'];
    const locRows = locMovements.map((m) => {
      const itemsStr = m.items
        .map((i) => {
          const prodName = PRODUCTS.find((p) => p.id === i.productId)?.name || i.productId;
          const signed =
            typeof i.signedQuantity === 'number'
              ? i.signedQuantity
              : m.type === 'OUT'
                ? -i.quantity
                : m.type === 'IN'
                  ? i.quantity
                  : i.quantity;
          const sign = signed > 0 ? '+' : '';
          return `${prodName} (${sign}${signed})`;
        })
        .join(', ');
      const typeLabel =
        m.type === 'IN'
          ? '입고'
          : m.type === 'OUT'
            ? '출고'
            : m.type === 'ADJUSTMENT'
              ? '보정'
              : '이동';
      return [m.date, typeLabel, itemsStr, m.description, m.partnerOrRecipient || '-'];
    });

    const wsLoc = XLSX.utils.aoa_to_sheet([locHeaders, ...locRows]);
    XLSX.utils.book_append_sheet(wb, wsLoc, tab.name);
  });

  const today = new Date().toISOString().split('T')[0];
  XLSX.writeFile(wb, `보관함_재고관리_구글시트_${today}.xlsx`);
}


