import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  LocationStock,
  StockMovement,
  ThresholdRule,
  PurchaseOrder,
  SheetConfig,
  LocationId,
  ProductId,
  MasterData,
} from './types';
import {
  INITIAL_LOCATION_STOCKS,
  INITIAL_MOVEMENTS,
  INITIAL_THRESHOLD_RULES,
  INITIAL_PURCHASE_ORDERS,
  INITIAL_SHEET_CONFIG,
  PREVIOUS_DEFAULT_SHEET_IDS,
  PREVIOUS_DEFAULT_WEBHOOK_URLS,
  PRODUCTS,
} from './data/initialData';
import {
  calculateProductTotals,
  calculateUnassembledTotals,
  detectStockAlerts,
  applyMovementToStocks,
  generateAutoPurchaseOrder,
  exportStocksToCSV,
  performAssemblyConversion,
} from './utils/stockUtils';
import { importGoogleSheet, matchLocation, toSheetUrl } from './utils/googleSheetSync';
import {
  deleteMovementsFromSheet,
  normalizeAppsScriptWebhook,
  saveAppDataToSheet,
  saveDashboardRemark,
  saveMasterDataToSheet,
  saveMovementToSheet,
} from './utils/googleSheetWrite';
import {
  DEFAULT_MASTER_DATA,
  alignStocksWithMaster,
  applyMasterData,
  normalizeMasterData,
} from './data/masterData';

import { Header, NavTab } from './components/Header';
import { DashboardView } from './components/DashboardView';
import { MovementHistoryView } from './components/MovementHistoryView';
import { AutomationRulesView } from './components/AutomationRulesView';
import { MovementModal } from './components/MovementModal';
import { AssemblyModal } from './components/AssemblyModal';
import { GoogleSheetSyncModal } from './components/GoogleSheetSyncModal';
import { PurchaseOrderModal } from './components/PurchaseOrderModal';
import { NotificationDrawer } from './components/NotificationDrawer';

const MASTER_DATA_STORAGE_KEY = 'lucm_master_data_v1';

function sortMovementsAscending(items: StockMovement[]): StockMovement[] {
  return [...items].sort((a, b) =>
    `${a.date} ${a.time || ''} ${a.id}`.localeCompare(`${b.date} ${b.time || ''} ${b.id}`)
  );
}

function movementItemsKey(movement: StockMovement): string {
  return movement.items
    .map((item) => `${item.productId}:${Number(item.quantity || 0)}`)
    .sort()
    .join('|');
}

function editableMovement(clicked: StockMovement, allMovements: StockMovement[]): StockMovement {
  if (
    clicked.sourceMovementIds?.length ||
    clicked.type === 'TRANSFER' ||
    clicked.type === 'ADJUSTMENT'
  ) {
    return {
      ...clicked,
      sourceMovementIds: clicked.sourceMovementIds || [clicked.id],
    };
  }

  const oppositeType = clicked.type === 'OUT' ? 'IN' : 'OUT';
  const baseId = clicked.id.replace(/-(OUT|IN)$/, '');
  const idPair = allMovements.find(
    (movement) =>
      movement.id !== clicked.id &&
      movement.type === oppositeType &&
      movement.id.replace(/-(OUT|IN)$/, '') === baseId
  );
  const candidates = allMovements.filter((movement) => {
    if (movement.id === clicked.id || movement.type !== oppositeType) return false;
    const clickedLocation = clicked.locationId || clicked.fromLocation || clicked.toLocation;
    const otherLocation =
      movement.locationId || movement.fromLocation || movement.toLocation;
    return (
      Boolean(clickedLocation && otherLocation && clickedLocation !== otherLocation) &&
      movement.date === clicked.date &&
      movementItemsKey(movement) === movementItemsKey(clicked) &&
      movement.description.trim() === clicked.description.trim()
    );
  });
  const pair = idPair || (candidates.length === 1 ? candidates[0] : undefined);
  if (!pair) return { ...clicked, sourceMovementIds: [clicked.id] };

  const outgoing = clicked.type === 'OUT' ? clicked : pair;
  const incoming = clicked.type === 'IN' ? clicked : pair;
  return {
    ...outgoing,
    id: `EDIT-TRANSFER-${outgoing.id}-${incoming.id}`,
    type: 'TRANSFER',
    locationId: undefined,
    fromLocation: outgoing.locationId || outgoing.fromLocation,
    toLocation: incoming.locationId || incoming.toLocation,
    time: outgoing.time || incoming.time,
    registeredBy: outgoing.registeredBy || incoming.registeredBy,
    partnerOrRecipient:
      outgoing.partnerOrRecipient || incoming.partnerOrRecipient,
    sheetRows: [...(outgoing.sheetRows || []), ...(incoming.sheetRows || [])],
    sourceMovementIds: [outgoing.id, incoming.id],
  };
}

function undoMovementFromStocks(
  currentStocks: LocationStock[],
  movement: StockMovement
): LocationStock[] {
  const next = JSON.parse(JSON.stringify(currentStocks)) as LocationStock[];
  const adjust = (locationId: LocationId | undefined, productId: ProductId, delta: number) => {
    const stock = next.find((item) => item.locationId === locationId);
    if (!stock) return;
    stock.quantities[productId] = Math.max(
      0,
      Number(stock.quantities[productId] || 0) + delta
    );
  };
  for (const item of movement.items) {
    if (typeof item.signedQuantity === 'number' && movement.type !== 'TRANSFER') {
      adjust(
        movement.locationId ||
          (movement.type === 'IN' ? movement.toLocation : movement.fromLocation),
        item.productId,
        -item.signedQuantity
      );
    } else if (movement.type === 'ADJUSTMENT') {
      adjust(movement.locationId, item.productId, -item.quantity);
    } else if (movement.type === 'IN') {
      adjust(movement.locationId || movement.toLocation, item.productId, -item.quantity);
    } else if (movement.type === 'OUT') {
      adjust(movement.locationId || movement.fromLocation, item.productId, item.quantity);
    } else {
      adjust(movement.fromLocation, item.productId, item.quantity);
      adjust(movement.toLocation, item.productId, -item.quantity);
    }
  }
  return next;
}

export default function App() {
  // Navigation & UI States
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Modals & Drawers
  const [isMovementModalOpen, setIsMovementModalOpen] = useState(false);
  const [editingMovement, setEditingMovement] = useState<StockMovement | null>(null);
  const [isAssemblyModalOpen, setIsAssemblyModalOpen] = useState(false);
  const [assemblyLocationId, setAssemblyLocationId] = useState<LocationId>('lucciem');
  const [assemblyProductId, setAssemblyProductId] = useState<ProductId | undefined>(undefined);
  const [isSheetSyncModalOpen, setIsSheetSyncModalOpen] = useState(false);
  const [isPOModalOpen, setIsPOModalOpen] = useState(false);
  const [isAlertsDrawerOpen, setIsAlertsDrawerOpen] = useState(false);
  const [isEditingRemark, setIsEditingRemark] = useState(false);
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);

  // Sync & Concurrency Control Refs
  const isSyncInFlightRef = useRef(false);
  const inFlightSyncPromiseRef = useRef<Promise<boolean> | null>(null);
  const isMutatingRef = useRef(false);

  const isAnyInputOpen =
    isMovementModalOpen ||
    isAssemblyModalOpen ||
    isSheetSyncModalOpen ||
    isPOModalOpen ||
    isEditingRemark;
  const isAnyInputOpenRef = useRef(isAnyInputOpen);
  isAnyInputOpenRef.current = isAnyInputOpen;

  // Persistence State
  const [stocks, setStocks] = useState<LocationStock[]>(() => {
    const saved = localStorage.getItem('lucm_stock_matrix');
    if (!saved) return INITIAL_LOCATION_STOCKS;
    return (JSON.parse(saved) as LocationStock[]).map((stock) =>
      String(stock.locationId) === 'smt' ? { ...stock, locationId: 'etc' } : stock
    );
  });

  const [movements, setMovements] = useState<StockMovement[]>(() => {
    const saved = localStorage.getItem('lucm_stock_movements');
    if (!saved) return sortMovementsAscending(INITIAL_MOVEMENTS);
    return sortMovementsAscending(
      (JSON.parse(saved) as StockMovement[]).map((movement) => ({
        ...movement,
        locationId: String(movement.locationId) === 'smt' ? 'etc' : movement.locationId,
        fromLocation: String(movement.fromLocation) === 'smt' ? 'etc' : movement.fromLocation,
        toLocation: String(movement.toLocation) === 'smt' ? 'etc' : movement.toLocation,
      }))
    );
  });

  const [thresholds, setThresholds] = useState<ThresholdRule[]>(() => {
    const saved = localStorage.getItem('lucm_stock_thresholds');
    if (!saved) return INITIAL_THRESHOLD_RULES;
    return (JSON.parse(saved) as ThresholdRule[]).map((rule) =>
      String(rule.locationId) === 'smt' ? { ...rule, locationId: 'etc' } : rule
    );
  });

  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>(() => {
    const saved = localStorage.getItem('lucm_purchase_orders');
    if (!saved) return INITIAL_PURCHASE_ORDERS;
    return (JSON.parse(saved) as PurchaseOrder[]).map((order) => ({
      ...order,
      targetLocationId:
        String(order.targetLocationId) === 'smt' ? 'etc' : order.targetLocationId,
      supplierLocationId:
        String(order.supplierLocationId) === 'smt' ? 'etc' : order.supplierLocationId,
    }));
  });

  const [sheetConfig, setSheetConfig] = useState<SheetConfig>(() => {
    const defaultWebhookUrl = String(INITIAL_SHEET_CONFIG.webhookUrl || '').trim();
    const saved = localStorage.getItem('lucm_sheet_config_v2');
    if (!saved) {
      return {
        ...INITIAL_SHEET_CONFIG,
        webhookUrl: defaultWebhookUrl,
        syncMode: defaultWebhookUrl ? 'TWO_WAY' : INITIAL_SHEET_CONFIG.syncMode,
      };
    }
    const parsed = JSON.parse(saved) as Partial<SheetConfig>;
    const savedWebhookUrl = String(parsed.webhookUrl || '').trim();
    const webhookUrl =
      !savedWebhookUrl || PREVIOUS_DEFAULT_WEBHOOK_URLS.includes(savedWebhookUrl)
        ? defaultWebhookUrl
        : savedWebhookUrl;
    const savedError = parsed.lastError || null;
    const lastError =
      savedError && /이전 버전|새 버전으로 재배포/.test(savedError) ? null : savedError;

    const legacyIds = PREVIOUS_DEFAULT_SHEET_IDS.filter(
      (id) => id !== INITIAL_SHEET_CONFIG.sheetId
    );
    if (
      legacyIds.includes(parsed.sheetId || '') ||
      legacyIds.some((id) => parsed.sheetUrl?.includes(id))
    ) {
      return {
        ...INITIAL_SHEET_CONFIG,
        ...parsed,
        sheetId: INITIAL_SHEET_CONFIG.sheetId,
        sheetUrl: INITIAL_SHEET_CONFIG.sheetUrl,
        webhookUrl,
        syncMode: webhookUrl ? 'TWO_WAY' : parsed.syncMode || INITIAL_SHEET_CONFIG.syncMode,
        isConnected: false,
        lastError: null,
      };
    }
    return {
      ...INITIAL_SHEET_CONFIG,
      ...parsed,
      webhookUrl,
      syncMode: webhookUrl ? 'TWO_WAY' : parsed.syncMode || INITIAL_SHEET_CONFIG.syncMode,
      lastError,
    };
  });
  const sheetConfigRef = useRef(sheetConfig);
  sheetConfigRef.current = sheetConfig;

  const [masterData, setMasterData] = useState<MasterData>(() => {
    const saved = localStorage.getItem(MASTER_DATA_STORAGE_KEY);
    let initial = DEFAULT_MASTER_DATA;
    if (saved) {
      try {
        initial = normalizeMasterData(JSON.parse(saved));
      } catch {
        initial = DEFAULT_MASTER_DATA;
      }
    }
    applyMasterData(initial);
    return initial;
  });

  const commitMasterData = useCallback((next: MasterData) => {
    applyMasterData(next);
    setMasterData(next);
    setStocks((prev) => alignStocksWithMaster(prev, next));
    setThresholds((prev) =>
      prev.filter(
        (rule) =>
          next.products.some((product) => product.id === rule.productId) &&
          (rule.locationId == null ||
            rule.locationId === 'ALL' ||
            next.locations.some((location) => location.id === rule.locationId))
      )
    );
  }, []);

  useEffect(() => {
    localStorage.setItem(MASTER_DATA_STORAGE_KEY, JSON.stringify(masterData));
  }, [masterData]);

  useEffect(() => {
    if (sheetConfig.lastError && /이전 버전|새 버전으로 재배포/.test(sheetConfig.lastError)) {
      setSheetConfig((prev) => ({ ...prev, lastError: null }));
    }
  }, [sheetConfig.lastError]);

  // Save to LocalStorage on updates
  useEffect(() => {
    localStorage.setItem('lucm_stock_matrix', JSON.stringify(stocks));
  }, [stocks]);

  useEffect(() => {
    localStorage.setItem('lucm_stock_movements', JSON.stringify(movements));
  }, [movements]);

  useEffect(() => {
    localStorage.setItem('lucm_stock_thresholds', JSON.stringify(thresholds));
  }, [thresholds]);

  useEffect(() => {
    localStorage.setItem('lucm_purchase_orders', JSON.stringify(purchaseOrders));
  }, [purchaseOrders]);

  useEffect(() => {
    const persisted = { ...sheetConfig, isSyncing: false };
    localStorage.setItem('lucm_sheet_config_v2', JSON.stringify(persisted));
  }, [sheetConfig]);

  // Derived Metrics & Alerts
  const totals = useMemo(() => calculateProductTotals(stocks), [stocks]);
  const totalUnits = useMemo(
    () => Object.values(totals).reduce<number>((sum, q) => sum + (typeof q === 'number' ? q : 0), 0),
    [totals]
  );
  const unassembledTotals = useMemo(() => calculateUnassembledTotals(stocks), [stocks]);
  const totalUnassembledUnits = useMemo(
    () => Object.values(unassembledTotals).reduce<number>((sum, q) => sum + (typeof q === 'number' ? q : 0), 0),
    [unassembledTotals]
  );
  const alerts = useMemo(
    () => detectStockAlerts(stocks, thresholds),
    // masterData changes product names shown in alerts.
    [stocks, thresholds, masterData]
  );
  const activeOrdersCount = useMemo(
    () => purchaseOrders.filter((po) => po.status !== 'COMPLETED' && po.status !== 'CANCELLED').length,
    [purchaseOrders]
  );

  const handleTriggerSync = useCallback(
    async (
      sheetIdOverride?: string,
      options?: { force?: boolean; silent?: boolean }
    ): Promise<boolean> => {
      const sheetId = (
        typeof sheetIdOverride === 'string' && sheetIdOverride.trim()
          ? sheetIdOverride
          : sheetConfigRef.current.sheetId || ''
      ).trim();
      if (!sheetId) {
        if (!options?.silent) {
          setSheetConfig((prev) => ({
            ...prev,
            isSyncing: false,
            isConnected: false,
            lastError: '구글 시트 URL을 먼저 입력해 주세요.',
          }));
          setIsSheetSyncModalOpen(true);
        }
        return false;
      }

      if (isMutatingRef.current && !options?.force) {
        return false;
      }

      if (options?.silent && isAnyInputOpenRef.current && !options?.force) {
        return false;
      }

      if (isSyncInFlightRef.current && inFlightSyncPromiseRef.current) {
        return inFlightSyncPromiseRef.current;
      }

      isSyncInFlightRef.current = true;

      setSheetConfig((prev) => ({
        ...prev,
        sheetId,
        isSyncing: true,
      }));

      const syncPromise = (async (): Promise<boolean> => {
        try {
          const result = await importGoogleSheet(sheetId);
          if (result.masterData) commitMasterData(result.masterData);
          setStocks(result.stocks);
          setMovements(sortMovementsAscending(result.movements));
          const now = new Date();
          setSheetConfig((prev) => ({
            ...prev,
            sheetId,
            sheetUrl: toSheetUrl(sheetId),
            isSyncing: false,
            isConnected: true,
            lastSyncedAt: now.toLocaleString('ko-KR'),
            lastSyncedAtMs: now.getTime(),
            lastError: null,
            importedTabs: result.tabNames,
            sheetName: result.dashboardSheetName || prev.sheetName,
          }));
          return true;
        } catch (error) {
          const message =
            error instanceof Error ? error.message : '시트를 불러오지 못했습니다.';
          setSheetConfig((prev) => ({
            ...prev,
            sheetId,
            isSyncing: false,
            // 기존 데이터를 유지하고 마지막 갱신 시각과 오류 상태만 표시
            isConnected: prev.isConnected ?? false,
            lastError: message,
          }));
          return false;
        } finally {
          isSyncInFlightRef.current = false;
          inFlightSyncPromiseRef.current = null;
        }
      })();

      inFlightSyncPromiseRef.current = syncPromise;
      return syncPromise;
    },
    [commitMasterData]
  );

  const handleSaveMasterData = async (
    next: MasterData
  ): Promise<{ ok: boolean; error?: string }> => {
    if (isMutatingRef.current) {
      return { ok: false, error: '다른 변경 작업이 처리 중입니다. 잠시 후 다시 시도해 주세요.' };
    }
    const webhookUrl = normalizeAppsScriptWebhook(sheetConfigRef.current.webhookUrl || '');
    if (!webhookUrl || !sheetConfigRef.current.sheetId) {
      return {
        ok: false,
        error: '구글 시트 연동 설정에서 시트 URL과 저장용 웹앱 URL을 먼저 등록해 주세요.',
      };
    }
    const normalized = normalizeMasterData(next);
    isMutatingRef.current = true;
    try {
      await saveMasterDataToSheet({
        webhookUrl,
        sheetId: sheetConfigRef.current.sheetId,
        masterData: normalized,
        previous: masterData,
      });
      commitMasterData(normalized);
      setSheetConfig((prev) => ({
        ...prev,
        lastSavedAt: new Date().toLocaleString('ko-KR'),
        lastError: null,
      }));
      return { ok: true };
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : '마스터 데이터를 시트에 저장하지 못했습니다.',
      };
    } finally {
      isMutatingRef.current = false;
    }
  };

  // Handlers
  const handleSaveMovement = async (
    newMovementData: Omit<StockMovement, 'id' | 'sheetSynced'>
  ): Promise<boolean> => {
    if (isMutatingRef.current) {
      throw new Error('다른 변경 작업이 처리 중입니다. 잠시 후 다시 시도해 주세요.');
    }
    const webhookUrl = sheetConfigRef.current.webhookUrl || '';
    if (!webhookUrl) {
      throw new Error(
        '저장용 Apps Script 웹앱 URL이 없습니다. 시트 설정에서 /exec 주소를 등록해 주세요.'
      );
    }

    isMutatingRef.current = true;
    try {
      const newMovement: StockMovement = {
        ...newMovementData,
        id: `MOV-${Date.now().toString().slice(-6)}`,
        sheetSynced: false,
      };

      const optimisticStocks = applyMovementToStocks(stocks, newMovement);
      const result = await saveMovementToSheet({
        webhookUrl,
        sheetId: sheetConfigRef.current.sheetId,
        movement: newMovement,
        stocks: optimisticStocks,
      });
      if (result.appendedCount < 1) {
        throw new Error('입출고 내역이 시트에 추가되지 않았습니다.');
      }
      newMovement.sheetRows = result.appends?.map((ref) => ({
        ...ref,
        expectedDescription: newMovement.description,
      }));

      setStocks(result.stocks || optimisticStocks);
      const syncedMovements: StockMovement[] =
        newMovement.type === 'TRANSFER'
          ? [
              {
                ...newMovement,
                id: `${newMovement.id}-OUT`,
                type: 'OUT',
                locationId: newMovement.fromLocation,
                toLocation: undefined,
                sheetRows: newMovement.sheetRows?.[0] ? [newMovement.sheetRows[0]] : [],
                sheetSynced: true,
              },
              {
                ...newMovement,
                id: `${newMovement.id}-IN`,
                type: 'IN',
                locationId: newMovement.toLocation,
                fromLocation: undefined,
                sheetRows: newMovement.sheetRows?.[1] ? [newMovement.sheetRows[1]] : [],
                sheetSynced: true,
              },
            ]
          : [{ ...newMovement, sheetSynced: true }];
      setMovements((prev) =>
        sortMovementsAscending([...prev, ...syncedMovements])
      );
      setSheetConfig((prev) => ({
        ...prev,
        lastSavedAt: new Date().toLocaleString('ko-KR'),
        lastError: null,
      }));
      void handleTriggerSync(undefined, { force: true, silent: true });
      return true;
    } catch (error) {
      throw error instanceof Error
        ? error
        : new Error('시트 저장에 실패했습니다. 앱 재고는 바꾸지 않았습니다.');
    } finally {
      isMutatingRef.current = false;
    }
  };

  const handleUpdateMovement = async (
    sourceMovementIds: string[],
    movementData: Omit<StockMovement, 'id' | 'sheetSynced'>
  ): Promise<boolean> => {
    if (isMutatingRef.current) {
      throw new Error('다른 변경 작업이 처리 중입니다. 잠시 후 다시 시도해 주세요.');
    }
    const originals = movements.filter((movement) =>
      sourceMovementIds.includes(movement.id)
    );
    if (originals.length !== sourceMovementIds.length) {
      throw new Error('수정할 원본 내역을 찾지 못했습니다. 시트를 다시 불러와 주세요.');
    }

    isMutatingRef.current = true;
    try {
      const rootId =
        originals[0]?.id.replace(/-(OUT|IN)$/, '') ||
        `MOV-${Date.now().toString().slice(-6)}`;
      let revertedStocks = stocks;
      for (const original of originals) {
        revertedStocks = undoMovementFromStocks(revertedStocks, original);
      }
      const logicalMovement: StockMovement = {
        ...movementData,
        id: rootId,
        sheetSynced: false,
      };
      const updatedStocks = applyMovementToStocks(revertedStocks, logicalMovement);

      const replacementMovements: StockMovement[] =
        movementData.type === 'TRANSFER'
          ? [
              {
                ...movementData,
                id:
                  originals.find((movement) => movement.type === 'OUT')?.id ||
                  `${rootId}-OUT`,
                type: 'OUT',
                locationId: movementData.fromLocation,
                toLocation: undefined,
                sheetSynced: false,
                sheetRows: [],
              },
              {
                ...movementData,
                id:
                  originals.find((movement) => movement.type === 'IN')?.id ||
                  `${rootId}-IN`,
                type: 'IN',
                locationId: movementData.toLocation,
                fromLocation: undefined,
                sheetSynced: false,
                sheetRows: [],
              },
            ]
          : [
              {
                ...movementData,
                id:
                  originals.find((movement) => movement.type === movementData.type)?.id ||
                  `${rootId}-${movementData.type}`,
                sheetSynced: false,
                sheetRows: [],
              },
            ];
      const nextMovements = sortMovementsAscending([
        ...movements.filter((movement) => !sourceMovementIds.includes(movement.id)),
        ...replacementMovements,
      ]);

      const result = await saveAppDataToSheet({
        webhookUrl: sheetConfigRef.current.webhookUrl || '',
        sheetId: sheetConfigRef.current.sheetId,
        stocks: updatedStocks,
        movements: nextMovements,
        sourceMovementIds,
        originalMovements: originals,
        replacementMovements,
      });
      const baseMovements = result.movements || nextMovements;
      const syncedMovements = baseMovements.map((movement) => ({
        ...movement,
        sheetSynced: true,
        sheetRows: (result.movementRows?.[movement.id] || movement.sheetRows || []).map(
          (ref) => ({
            ...ref,
            expectedDescription: movement.description,
          })
        ),
      }));
      setStocks(result.stocks || updatedStocks);
      setMovements(syncedMovements);
      setSheetConfig((prev) => ({
        ...prev,
        lastSavedAt: new Date().toLocaleString('ko-KR'),
        lastError: null,
      }));
      void handleTriggerSync(undefined, { force: true, silent: true });
      return true;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : '수정 내역을 시트에 저장하지 못했습니다.';
      setSheetConfig((prev) => ({ ...prev, lastError: message }));
      throw new Error(message);
    } finally {
      isMutatingRef.current = false;
    }
  };

  const handleUpdateRemarks = async (
    locationId: LocationId,
    remarks: string
  ): Promise<boolean> => {
    if (isMutatingRef.current) return false;
    isMutatingRef.current = true;
    try {
      const result = await saveDashboardRemark({
        webhookUrl: sheetConfigRef.current.webhookUrl || '',
        sheetId: sheetConfigRef.current.sheetId,
        locationId,
        value: remarks,
      });
      if (result.updatedCount !== 1) {
        throw new Error('Dashboard 비고 셀이 수정되지 않았습니다.');
      }
      setStocks((prev) =>
        prev.map((stock) =>
          stock.locationId === locationId ? { ...stock, remarks } : stock
        )
      );
      setSheetConfig((prev) => ({
        ...prev,
        lastSavedAt: new Date().toLocaleString('ko-KR'),
        lastError: null,
      }));
      void handleTriggerSync(undefined, { force: true, silent: true });
      return true;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Dashboard 비고 저장에 실패했습니다.';
      setSheetConfig((prev) => ({ ...prev, lastError: message }));
      return false;
    } finally {
      isMutatingRef.current = false;
    }
  };

  const handlePersistAppToSheet = async (): Promise<boolean> => {
    if (isMutatingRef.current) return false;
    const webhookUrl = normalizeAppsScriptWebhook(sheetConfigRef.current.webhookUrl || '');
    sheetConfigRef.current = { ...sheetConfigRef.current, webhookUrl };
    setSheetConfig((prev) => ({ ...prev, webhookUrl }));
    if (!webhookUrl) {
      setSheetConfig((prev) => ({
        ...prev,
        lastError:
          '시트에 쓰려면 저장용 웹앱 URL이 필요합니다. 아래 칸에 붙여넣은 뒤 다시 저장하세요.',
      }));
      return false;
    }
    isMutatingRef.current = true;
    try {
      const result = await saveAppDataToSheet({
        webhookUrl,
        sheetId: sheetConfigRef.current.sheetId,
        stocks,
        movements,
      });
      if (result.movementRows) {
        setMovements((prev) =>
          prev.map((movement) => ({
            ...movement,
            sheetSynced: true,
            sheetRows: (result.movementRows?.[movement.id] || []).map((ref) => ({
              ...ref,
              expectedDescription: movement.description,
            })),
          }))
        );
      }
      setSheetConfig((prev) => ({
        ...prev,
        lastSavedAt: new Date().toLocaleString('ko-KR'),
        lastError: null,
      }));
      void handleTriggerSync(undefined, { force: true, silent: true });
      return true;
    } catch (error) {
      setSheetConfig((prev) => ({
        ...prev,
        lastError: error instanceof Error ? error.message : '시트 저장에 실패했습니다.',
      }));
      return false;
    } finally {
      isMutatingRef.current = false;
    }
  };

  const handleDeleteMovements = async (
    movementIds: string[]
  ): Promise<{ ok: boolean; error?: string }> => {
    if (movementIds.length === 0) return { ok: false, error: '삭제할 내역을 선택해 주세요.' };
    if (isMutatingRef.current) {
      return { ok: false, error: '다른 변경 작업이 처리 중입니다. 잠시 후 다시 시도해 주세요.' };
    }
    const defaultSheetNames: Record<LocationId, string> = {
      lucciem: '루씨엠',
      seil: '세일정밀공업',
      ijin: '아이진',
      etc: 'etc-오름차순',
    };
    const targets = movements
      .filter((movement) => movementIds.includes(movement.id))
      .map((movement) => {
        if (movement.sheetRows?.length) return movement;
        const legacy = movement.id.match(
          /^GS-(lucciem|seil|ijin|etc)-\d{4}-\d{2}-\d{2}-(\d+)$/
        );
        if (!legacy) return movement;
        const locationId = legacy[1] as LocationId;
        const fallbackDescriptions = new Set(['입고', '출고', '이동']);
        const importedSheetName = sheetConfigRef.current.importedTabs?.find(
          (tab) => matchLocation(tab) === locationId
        );
        return {
          ...movement,
          sheetRows: [
            {
              sheetName: importedSheetName || defaultSheetNames[locationId],
              row: Number(legacy[2]) + 1,
              expectedDescription: fallbackDescriptions.has(movement.description)
                ? ''
                : movement.description,
            },
          ],
        };
      });
    isMutatingRef.current = true;
    try {
      const result = await deleteMovementsFromSheet({
        webhookUrl: sheetConfigRef.current.webhookUrl || '',
        sheetId: sheetConfigRef.current.sheetId,
        movements: targets,
      });
      const expectedRows = targets.reduce(
        (count, movement) => count + (movement.sheetRows?.length || 0),
        0
      );
      if (result.deletedCount !== expectedRows) {
        throw new Error(
          `삭제 요청 ${expectedRows}건 중 ${result.deletedCount}건만 시트에 반영되었습니다. 시트를 다시 불러와 확인해 주세요.`
        );
      }
      setMovements((prev) => prev.filter((movement) => !movementIds.includes(movement.id)));
      setSheetConfig((prev) => ({
        ...prev,
        lastSavedAt: new Date().toLocaleString('ko-KR'),
        lastError: null,
      }));
      void handleTriggerSync(undefined, { force: true, silent: true });
      return { ok: true };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : '시트에서 내역을 삭제하지 못했습니다.';
      setSheetConfig((prev) => ({
        ...prev,
        lastError: message,
      }));
      return { ok: false, error: message };
    } finally {
      isMutatingRef.current = false;
    }
  };

  const handlePerformAssembly = async (
    locationId: LocationId,
    productId: ProductId,
    quantity: number,
    consumeTerminalBoard: boolean,
    notes?: string
  ): Promise<boolean> => {
    if (isMutatingRef.current) return false;
    const { updatedStocks, createdMovement } = performAssemblyConversion(
      stocks,
      locationId,
      productId,
      quantity,
      consumeTerminalBoard,
      notes
    );
    isMutatingRef.current = true;
    try {
      const result = await saveMovementToSheet({
        webhookUrl: sheetConfigRef.current.webhookUrl || '',
        sheetId: sheetConfigRef.current.sheetId,
        movement: createdMovement,
        stocks: updatedStocks,
      });
      if (result.appendedCount < 1) {
        throw new Error('조립 내역이 시트에 추가되지 않았습니다.');
      }
      setStocks(result.stocks || updatedStocks);
      setMovements((prev) =>
        sortMovementsAscending([
          ...prev,
          {
            ...createdMovement,
            sheetRows: result.appends?.map((ref) => ({
              ...ref,
              expectedDescription: createdMovement.description,
            })),
            sheetSynced: true,
          },
        ])
      );
      setSheetConfig((prev) => ({
        ...prev,
        lastSavedAt: new Date().toLocaleString('ko-KR'),
        lastError: null,
      }));
      void handleTriggerSync(undefined, { force: true, silent: true });
      return true;
    } catch (error) {
      setSheetConfig((prev) => ({
        ...prev,
        lastError:
          error instanceof Error ? error.message : '조립 내역을 시트에 저장하지 못했습니다.',
      }));
      return false;
    } finally {
      isMutatingRef.current = false;
    }
  };

  const handleOpenAssemblyModal = (locationId?: LocationId, productId?: ProductId) => {
    if (locationId) setAssemblyLocationId(locationId);
    if (productId) setAssemblyProductId(productId);
    setIsAssemblyModalOpen(true);
  };

  const handleUpdateStock = (locationId: string, productId: string, newQty: number) => {
    setStocks((prev) =>
      prev.map((loc) => {
        if (loc.locationId === locationId) {
          return {
            ...loc,
            quantities: {
              ...loc.quantities,
              [productId as ProductId]: Math.max(0, newQty),
            },
          };
        }
        return loc;
      })
    );
  };

  const handleUpdateUnassembledStock = (locationId: string, productId: string, newQty: number) => {
    setStocks((prev) =>
      prev.map((loc) => {
        if (loc.locationId === locationId) {
          return {
            ...loc,
            unassembledQuantities: {
              ...(loc.unassembledQuantities || {}),
              [productId as ProductId]: Math.max(0, newQty),
            },
          };
        }
        return loc;
      })
    );
  };

  const handleUpdateExceptionNote = (locationId: string, productId: string, note: string) => {
    setStocks((prev) =>
      prev.map((loc) => {
        if (loc.locationId === locationId) {
          return {
            ...loc,
            exceptionNotes: {
              ...(loc.exceptionNotes || {}),
              [productId as ProductId]: note,
            },
          };
        }
        return loc;
      })
    );
  };

  const handleUpdateRule = (
    productId: ProductId,
    minThreshold: number,
    reorderQuantity: number,
    targetSupplier: string
  ) => {
    setThresholds((prev) =>
      prev.map((rule) => {
        if (rule.productId === productId) {
          return {
            ...rule,
            minThreshold,
            reorderQuantity,
            targetSupplier,
          };
        }
        return rule;
      })
    );
  };

  const handleUpdatePOStatus = (poId: string, status: PurchaseOrder['status']) => {
    setPurchaseOrders((prev) =>
      prev.map((po) => {
        if (po.id === poId) {
          const updated = { ...po, status };
          if (selectedPO && selectedPO.id === poId) {
            setSelectedPO(updated);
          }
          return updated;
        }
        return po;
      })
    );
  };

  const handleGenerateAutoPO = () => {
    if (alerts.length === 0) {
      alert('현재 안전재고 미달 품목이 없습니다. 모든 재고가 안전 기준치를 충족하고 있습니다.');
      return;
    }

    const newPO = generateAutoPurchaseOrder(alerts, thresholds, '세일정밀공업');
    setPurchaseOrders((prev) => [newPO, ...prev]);
    setSelectedPO(newPO);
    setIsPOModalOpen(true);
  };

  const handleRequestLoadFromSheet = useCallback(
    async (sheetIdOverride?: string): Promise<boolean> => {
      return handleTriggerSync(
        typeof sheetIdOverride === 'string' ? sheetIdOverride : undefined,
        { force: true, silent: false }
      );
    },
    [handleTriggerSync]
  );

  // 초기 시트 연결 및 시트 ID 변경 시 즉시 조회
  useEffect(() => {
    if (!sheetConfig.sheetId) return;
    void handleTriggerSync(sheetConfig.sheetId, { force: true, silent: true });
  }, [handleTriggerSync, sheetConfig.sheetId]);

  const handleSelectTab = useCallback((nextTab: NavTab) => {
    setActiveTab(nextTab);
  }, []);

  const handleExportCSV = () => {
    const csvContent = exportStocksToCSV(stocks);
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `루씨엠_재고현황_${new Date().toISOString().split('T')[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportCSV = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (text) {
        alert('CSV 파일에서 재고 데이터를 정상적으로 읽어와 동기화하였습니다.');
        handleTriggerSync();
      }
    };
    reader.readAsText(file);
  };

  const handleViewPO = (po: PurchaseOrder) => {
    setSelectedPO(po);
    setIsPOModalOpen(true);
  };

  const handleOpenNewPO = () => {
    const emptyPO: PurchaseOrder = {
      id: `PO-${new Date().toISOString().slice(2, 10).replace(/-/g, '')}-${Math.floor(
        Math.random() * 900 + 100
      )}`,
      orderDate: new Date().toISOString().split('T')[0],
      supplier: '세일정밀공업',
      supplierLocationId: 'seil',
      targetLocationId: 'lucciem',
      status: 'DRAFT',
      totalAmount: 1800000,
      notes: '긴급 안전재고 보충 발주',
      items: [
        {
          productId: 'smart_top',
          productName: 'Smart AED 상단보관함',
          quantity: 20,
          unitPrice: 50000,
          totalAmount: 1000000,
          reason: '안전재고 미달분 보충',
        },
        {
          productId: 'smart_bottom',
          productName: 'Smart AED 하단보관함',
          quantity: 20,
          unitPrice: 40000,
          totalAmount: 800000,
          reason: '안전재고 미달분 보충',
        },
      ],
    };
    setPurchaseOrders((prev) => [emptyPO, ...prev]);
    setSelectedPO(emptyPO);
    setIsPOModalOpen(true);
  };

  return (
    <div
      id="app-root-layout"
      className="w-screen h-screen bg-slate-50 flex flex-col font-sans text-slate-800 antialiased overflow-hidden select-none [&_input]:select-text [&_textarea]:select-text"
    >
      <Header
        activeTab={activeTab}
        setActiveTab={handleSelectTab}
        sheetConfig={sheetConfig}
        onOpenSheetSyncModal={() => setIsSheetSyncModalOpen(true)}
        onSaveToSheet={handlePersistAppToSheet}
        onLoadFromSheet={() => handleRequestLoadFromSheet()}
      />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden pt-6">
        {/* Active Tab View */}
        {activeTab === 'dashboard' && (
          <DashboardView
            stocks={stocks}
            movements={movements}
            thresholds={thresholds}
            alerts={alerts}
            searchTerm={searchTerm}
            onOpenMovementModal={() => {
              setEditingMovement(null);
              setIsMovementModalOpen(true);
            }}
            onOpenAssemblyModal={handleOpenAssemblyModal}
            onOpenAutomation={() => handleSelectTab('automation')}
            onOpenPOModal={handleGenerateAutoPO}
            onUpdateRemarks={handleUpdateRemarks}
            onEditingRemarkChange={setIsEditingRemark}
            onQuickTransfer={(from, to, prod) => {
              setEditingMovement(null);
              setIsMovementModalOpen(true);
            }}
          />
        )}

        {activeTab === 'movements' && (
          <MovementHistoryView
            stocks={stocks}
            movements={movements}
            sheetConfig={sheetConfig}
            onOpenMovementModal={() => {
              setEditingMovement(null);
              setIsMovementModalOpen(true);
            }}
            onEditMovement={(movement) => {
              setEditingMovement(editableMovement(movement, movements));
              setIsMovementModalOpen(true);
            }}
            onExportCSV={handleExportCSV}
            onUpdateWebhook={(url) => {
              const webhookUrl = normalizeAppsScriptWebhook(url);
              sheetConfigRef.current = { ...sheetConfigRef.current, webhookUrl };
              setSheetConfig((prev) => ({ ...prev, webhookUrl, lastError: null }));
            }}
            onDeleteMovements={handleDeleteMovements}
          />
        )}

        {activeTab === 'automation' && (
          <AutomationRulesView
            thresholds={thresholds}
            purchaseOrders={purchaseOrders}
            alerts={alerts}
            stocks={stocks}
            onUpdateRule={handleUpdateRule}
            onOpenNewPOModal={handleOpenNewPO}
            onViewPO={handleViewPO}
            onGenerateAutoPO={handleGenerateAutoPO}
            onUpdatePOStatus={handleUpdatePOStatus}
            onOpenMovementModal={() => {
              setEditingMovement(null);
              setIsMovementModalOpen(true);
            }}
            onOpenAssemblyModal={handleOpenAssemblyModal}
          />
        )}
      </div>

      {/* Interactive Modals & Drawers */}
      <MovementModal
        isOpen={isMovementModalOpen}
        onClose={() => {
          setIsMovementModalOpen(false);
          setEditingMovement(null);
        }}
        onSaveMovement={handleSaveMovement}
        initialMovement={editingMovement}
        onUpdateMovement={handleUpdateMovement}
        sheetWebhookUrl={sheetConfig.webhookUrl || ''}
        onUpdateSheetWebhook={(url) => {
          sheetConfigRef.current = { ...sheetConfigRef.current, webhookUrl: url };
          setSheetConfig((prev) => ({ ...prev, webhookUrl: url }));
        }}
      />

      <AssemblyModal
        isOpen={isAssemblyModalOpen}
        onClose={() => setIsAssemblyModalOpen(false)}
        stocks={stocks}
        initialLocationId={assemblyLocationId}
        initialProductId={assemblyProductId}
        onPerformAssembly={handlePerformAssembly}
      />

      <GoogleSheetSyncModal
        isOpen={isSheetSyncModalOpen}
        onClose={() => setIsSheetSyncModalOpen(false)}
        config={sheetConfig}
        onUpdateConfig={(cfg) => setSheetConfig((prev) => ({ ...prev, ...cfg }))}
        masterData={masterData}
        onSaveMasterData={handleSaveMasterData}
      />

      <PurchaseOrderModal
        isOpen={isPOModalOpen}
        onClose={() => setIsPOModalOpen(false)}
        purchaseOrder={selectedPO}
        onUpdatePOStatus={handleUpdatePOStatus}
      />

      <NotificationDrawer
        isOpen={isAlertsDrawerOpen}
        onClose={() => setIsAlertsDrawerOpen(false)}
        alerts={alerts}
        onOpenPOForProduct={handleGenerateAutoPO}
        onOpenMovementForProduct={() => {
          setEditingMovement(null);
          setIsMovementModalOpen(true);
        }}
      />
    </div>
  );
}
