import React, { useState } from 'react';
import { LocationStock, StockMovement, LocationId, MovementType, SheetConfig } from '../types';
import { LOCATIONS, PRODUCTS } from '../data/initialData';
import {
  ArrowLeftRight,
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  PlusCircle,
  Trash2,
  AlertTriangle,
  ExternalLink,
  X,
  Search,
} from 'lucide-react';
import { CopyAppsScriptButton } from './CopyAppsScriptButton';
import { isAppsScriptWebhook } from '../utils/googleSheetWrite';

interface MovementHistoryViewProps {
  stocks: LocationStock[];
  movements: StockMovement[];
  sheetConfig: SheetConfig;
  onOpenMovementModal?: () => void;
  onEditMovement?: (movement: StockMovement) => void;
  onExportCSV?: () => void;
  onUpdateWebhook: (url: string) => void;
  onDeleteMovements: (
    movementIds: string[]
  ) => Promise<{ ok: boolean; error?: string }>;
}

function movementItemsKey(movement: StockMovement): string {
  return movement.items
    .map((item) => `${item.productId}:${Number(item.quantity || 0)}`)
    .sort()
    .join('|');
}

function groupTransfersForDisplay(movements: StockMovement[]): StockMovement[] {
  const consumed = new Set<number>();
  const grouped: StockMovement[] = [];
  for (let outIndex = 0; outIndex < movements.length; outIndex++) {
    if (consumed.has(outIndex)) continue;
    const outgoing = movements[outIndex];
    if (outgoing.type !== 'OUT') continue;
    const fromLocation = outgoing.locationId || outgoing.fromLocation;
    const candidates = movements
      .map((incoming, index) => ({ incoming, index }))
      .filter(({ incoming, index }) => {
        if (index === outIndex || consumed.has(index) || incoming.type !== 'IN') return false;
        const toLocation = incoming.locationId || incoming.toLocation;
        return (
          Boolean(fromLocation && toLocation && fromLocation !== toLocation) &&
          incoming.date === outgoing.date &&
          movementItemsKey(incoming) === movementItemsKey(outgoing)
        );
      });
    const exactDescription = candidates.filter(
      ({ incoming }) => incoming.description.trim() === outgoing.description.trim()
    );
    const pair =
      exactDescription.length === 1
        ? exactDescription[0]
        : candidates.length === 1
          ? candidates[0]
          : null;
    if (!pair) continue;
    const toLocation = pair.incoming.locationId || pair.incoming.toLocation;
    if (!fromLocation || !toLocation) continue;
    consumed.add(outIndex);
    consumed.add(pair.index);
    grouped.push({
      id: `DISPLAY-TRANSFER-${outgoing.id}-${pair.incoming.id}`,
      date: outgoing.date,
      time: outgoing.time || pair.incoming.time,
      type: 'TRANSFER',
      fromLocation,
      toLocation,
      items: outgoing.items,
      description:
        outgoing.description.trim() === pair.incoming.description.trim()
          ? outgoing.description
          : `${outgoing.description} / ${pair.incoming.description}`,
      partnerOrRecipient:
        outgoing.partnerOrRecipient || pair.incoming.partnerOrRecipient,
      registeredBy: outgoing.registeredBy || pair.incoming.registeredBy,
      sheetSynced: outgoing.sheetSynced && pair.incoming.sheetSynced,
      sheetRows: [
        ...(outgoing.sheetRows || []),
        ...(pair.incoming.sheetRows || []),
      ],
      sourceMovementIds: [outgoing.id, pair.incoming.id],
    });
  }
  movements.forEach((movement, index) => {
    if (!consumed.has(index)) grouped.push(movement);
  });
  return grouped;
}

export const MovementHistoryView: React.FC<MovementHistoryViewProps> = ({
  stocks,
  movements,
  sheetConfig,
  onOpenMovementModal,
  onEditMovement,
  onUpdateWebhook,
  onDeleteMovements,
}) => {
  const [filterType, setFilterType] = useState<MovementType | 'ALL'>('ALL');
  const [filterLocation, setFilterLocation] = useState<LocationId | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [showToast, setShowToast] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const groupedMovements = groupTransfersForDisplay(movements);

  const filteredMovements = groupedMovements
    .filter((mov) => {
      if (filterType !== 'ALL' && mov.type !== filterType) return false;
      if (filterLocation !== 'ALL') {
        const matchLoc =
          mov.locationId === filterLocation ||
          mov.fromLocation === filterLocation ||
          mov.toLocation === filterLocation;
        if (!matchLoc) return false;
      }
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchDesc = mov.description.toLowerCase().includes(q);
        const matchPartner = (mov.partnerOrRecipient || '').toLowerCase().includes(q);
        const matchItem = mov.items.some((i) => {
          const prod = PRODUCTS.find((p) => p.id === i.productId);
          return prod?.name.toLowerCase().includes(q);
        });
        return matchDesc || matchPartner || matchItem;
      }
      return true;
    })
    .sort((a, b) =>
      `${b.date} ${b.time || ''} ${b.id}`.localeCompare(
        `${a.date} ${a.time || ''} ${a.id}`
      )
    );

  const getLocName = (id?: string) => {
    if (!id) return '-';
    const loc = LOCATIONS.find((l) => l.id === id);
    return loc ? loc.shortName : id;
  };

  const getProductName = (id: string) => {
    const prod = PRODUCTS.find((p) => p.id === id);
    return prod ? prod.name : id;
  };

  const isAllSelected =
    filteredMovements.length > 0 &&
    filteredMovements.every((m) => selectedRowIds.includes(m.id));

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      const visibleSet = new Set(filteredMovements.map((m) => m.id));
      setSelectedRowIds((prev) => prev.filter((id) => !visibleSet.has(id)));
    } else {
      const visibleIds = filteredMovements.map((m) => m.id);
      setSelectedRowIds((prev) => Array.from(new Set([...prev, ...visibleIds])));
    }
  };

  const handleToggleSelectRow = (id: string) => {
    setSelectedRowIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleConfirmDelete = async () => {
    if (selectedRowIds.length === 0) return;
    // 선택된 행(단일 또는 묶음 이동)에서 실제 원장 movement ID 목록 추출
    const targetMovementIds = Array.from(
      new Set(
        groupedMovements
          .filter((m) => selectedRowIds.includes(m.id))
          .flatMap((m) => (m.sourceMovementIds?.length ? m.sourceMovementIds : [m.id]))
      )
    );
    if (targetMovementIds.length === 0) return;

    const count = selectedRowIds.length;
    setDeleteError(null);
    setIsDeleting(true);
    try {
      const result = await onDeleteMovements(targetMovementIds);
      if (result.ok) {
        setSelectedRowIds([]);
        setIsDeleteModalOpen(false);
        setShowToast(`${count}건의 내역을 시트에서 삭제했습니다.`);
        setTimeout(() => setShowToast(null), 3000);
      } else {
        setDeleteError(result.error || '시트에서 내역을 삭제하지 못했습니다.');
      }
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div id="movement-history-container" className="px-4 sm:px-8 pb-8 space-y-6 flex-1 overflow-y-auto relative">
      {/* Toast Notification */}
      {showToast && (
        <div className="fixed top-20 right-8 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2.5 text-xs font-bold animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{showToast}</span>
        </div>
      )}

      {/* Header & Sheet Actions */}
      <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-bold text-lg shadow-md shadow-blue-600/20">
            <ArrowLeftRight className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-extrabold text-slate-900 text-base">
                입출고 및 이동 현황 원장
              </h2>
              {sheetConfig.lastSavedAt ? (
                <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 text-[11px] font-bold rounded-full border border-emerald-200 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> 저장됨
                </span>
              ) : sheetConfig.isConnected ? (
                <span className="px-2.5 py-0.5 bg-slate-50 text-slate-600 text-[11px] font-bold rounded-full border border-slate-200">
                  연결됨
                </span>
              ) : (
                <span className="px-2.5 py-0.5 bg-amber-50 text-amber-700 text-[11px] font-bold rounded-full border border-amber-200 flex items-center gap-1">
                  시트 미연결
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {onOpenMovementModal && (
            <button
              id="btn-data-management-movement"
              type="button"
              onClick={onOpenMovementModal}
              className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 border border-blue-600 rounded-2xl transition-colors shadow-xs"
            >
              <PlusCircle className="w-4 h-4" />
              <span>재고 이동 / 입출고 등록</span>
            </button>
          )}
        </div>
      </div>

      {/* Webhook / Save Error Guide Banner */}
      {(sheetConfig.lastError || !isAppsScriptWebhook(sheetConfig.webhookUrl || '')) && (
        <div className="bg-rose-50 border border-rose-200 rounded-3xl p-5 space-y-3">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="text-xs font-extrabold text-rose-900">
                {isAppsScriptWebhook(sheetConfig.webhookUrl || '')
                  ? '최근 시트 연동 오류'
                  : '시트 저장 연결이 필요합니다'}
              </p>
              <p className="text-xs text-rose-800 mt-1 leading-relaxed">
                {sheetConfig.lastError ||
                  '저장용 웹앱 URL이 없거나 /exec 주소가 아닙니다. 배포 화면의 웹 앱 URL을 그대로 붙여넣으세요.'}
              </p>
            </div>
          </div>
          {!isAppsScriptWebhook(sheetConfig.webhookUrl || '') && (
            <CopyAppsScriptButton />
          )}
          {isAppsScriptWebhook(sheetConfig.webhookUrl || '') && (
            <div className="flex items-center gap-3 flex-wrap">
              <a
                href={sheetConfig.webhookUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 hover:text-blue-900"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                웹앱 열어 권한 허용
              </a>
              <CopyAppsScriptButton />
            </div>
          )}
          <input
            type="url"
            value={sheetConfig.webhookUrl || ''}
            onChange={(e) => onUpdateWebhook(e.target.value)}
            placeholder="https://script.google.com/macros/s/…/exec"
            className="w-full bg-white border border-rose-200 rounded-2xl px-4 py-2.5 text-slate-800 font-mono text-xs outline-none focus:border-rose-500"
          />
        </div>
      )}

      {/* Filter & Bulk Action Bar */}
      <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center flex-wrap gap-3">
          {/* Movement Type Filter */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl text-xs">
            <button
              onClick={() => {
                setFilterType('ALL');
                setSelectedRowIds([]);
              }}
              className={`px-3.5 py-1.5 rounded-xl font-bold transition-colors ${
                filterType === 'ALL'
                  ? 'bg-white text-blue-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              전체 유형
            </button>
            <button
              onClick={() => {
                setFilterType('IN');
                setSelectedRowIds([]);
              }}
              className={`px-3.5 py-1.5 rounded-xl font-bold transition-colors ${
                filterType === 'IN'
                  ? 'bg-emerald-500 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              입고 (Stock In)
            </button>
            <button
              onClick={() => {
                setFilterType('OUT');
                setSelectedRowIds([]);
              }}
              className={`px-3.5 py-1.5 rounded-xl font-bold transition-colors ${
                filterType === 'OUT'
                  ? 'bg-rose-500 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              출고 (Stock Out)
            </button>
            <button
              onClick={() => {
                setFilterType('TRANSFER');
                setSelectedRowIds([]);
              }}
              className={`px-3.5 py-1.5 rounded-xl font-bold transition-colors ${
                filterType === 'TRANSFER'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              거점 이동 (Transfer)
            </button>
            <button
              onClick={() => {
                setFilterType('ADJUSTMENT');
                setSelectedRowIds([]);
              }}
              className={`px-3.5 py-1.5 rounded-xl font-bold transition-colors ${
                filterType === 'ADJUSTMENT'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              보정
            </button>
          </div>

          {/* Location Filter */}
          <select
            value={filterLocation}
            onChange={(e) => {
              setFilterLocation(e.target.value as any);
              setSelectedRowIds([]);
            }}
            className="text-xs bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-2 text-slate-700 font-bold outline-none focus:border-blue-500"
          >
            <option value="ALL">모든 거점</option>
            {LOCATIONS.map((loc) => (
              <option key={loc.id} value={loc.id}>
                {loc.name}
              </option>
            ))}
          </select>

          {/* Search Input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="품목·내역·납품처 검색"
              className="text-xs bg-slate-50 border border-slate-200 rounded-2xl pl-8 pr-3.5 py-2 text-slate-700 font-medium outline-none focus:border-blue-500 w-48"
            />
          </div>
        </div>

        {/* Delete Selected Button */}
        <button
          id="btn-delete-selected-movements"
          type="button"
          onClick={() => {
            setDeleteError(null);
            setIsDeleteModalOpen(true);
          }}
          disabled={selectedRowIds.length === 0}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-2xl text-xs font-bold transition-all ${
            selectedRowIds.length > 0
              ? 'bg-rose-600 hover:bg-rose-700 active:scale-95 text-white shadow-md shadow-rose-600/20 cursor-pointer'
              : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
          }`}
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>
            내역 삭제
            {selectedRowIds.length > 0 ? ` (${selectedRowIds.length}건)` : ''}
          </span>
        </button>
      </div>

      {/* Movement Ledger Table */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-100">
                <th className="px-4 py-4 w-12 text-center">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={handleToggleSelectAll}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
                    title="전체 선택 / 해제"
                  />
                </th>
                <th className="px-5 py-4">일자 / 시각</th>
                <th className="px-4 py-4">구분</th>
                <th className="px-4 py-4">거점 경로 (출발 ➔ 도착)</th>
                <th className="px-4 py-4">변동 품목 및 수량</th>
                <th className="px-4 py-4">내역</th>
                <th className="px-4 py-4">납품처</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredMovements.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-14 text-center text-slate-400 font-medium">
                    조건에 해당하는 이동 내역이 없습니다.
                  </td>
                </tr>
              ) : (
                filteredMovements.map((mov) => {
                  const isIn = mov.type === 'IN';
                  const isOut = mov.type === 'OUT';
                  const isTransfer = mov.type === 'TRANSFER';
                  const isAdjustment = mov.type === 'ADJUSTMENT';
                  const isSelected = selectedRowIds.includes(mov.id);

                  return (
                    <tr
                      key={mov.id}
                      tabIndex={0}
                      onClick={() => onEditMovement?.(mov)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          onEditMovement?.(mov);
                        }
                      }}
                      className={`transition-colors ${
                        isSelected ? 'bg-blue-50/60' : 'hover:bg-blue-50/70'
                      } cursor-pointer focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500`}
                      title="클릭하여 내역 수정"
                    >
                      {/* Checkbox */}
                      <td
                        className="px-4 py-4 w-12 text-center"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelectRow(mov.id)}
                          className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
                        />
                      </td>

                      {/* Date */}
                      <td className="px-5 py-4 font-mono text-xs text-slate-700 whitespace-nowrap">
                        <div className="font-bold text-slate-900">{mov.date}</div>
                        {mov.time && <div className="text-slate-400 text-[11px] font-semibold">{mov.time}</div>}
                      </td>

                      {/* Type Badge */}
                      <td className="px-4 py-4 whitespace-nowrap">
                        {isIn && (
                          <span className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-bold inline-flex items-center gap-1">
                            <ArrowDownRight className="w-3.5 h-3.5" /> 입고
                          </span>
                        )}
                        {isOut && (
                          <span className="px-3 py-1 bg-rose-50 text-rose-700 border border-rose-200 rounded-full text-xs font-bold inline-flex items-center gap-1">
                            <ArrowUpRight className="w-3.5 h-3.5" /> 출고
                          </span>
                        )}
                        {isTransfer && (
                          <span className="px-3 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-full text-xs font-bold inline-flex items-center gap-1">
                            <ArrowLeftRight className="w-3.5 h-3.5" /> 이동
                          </span>
                        )}
                        {isAdjustment && (
                          <span className="px-3 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-xs font-bold inline-flex items-center gap-1">
                            보정
                          </span>
                        )}
                      </td>

                      {/* Location Path */}
                      <td className="px-4 py-4 text-xs font-medium text-slate-700 whitespace-nowrap">
                        {isTransfer ? (
                          <div className="flex items-center gap-1.5">
                            <span className="px-2.5 py-1 bg-slate-100 rounded-lg text-slate-800 font-bold">
                              {getLocName(mov.fromLocation)}
                            </span>
                            <span className="text-blue-500 font-extrabold">➔</span>
                            <span className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg font-bold">
                              {getLocName(mov.toLocation)}
                            </span>
                          </div>
                        ) : (
                          <span className="px-2.5 py-1 bg-slate-100 rounded-lg text-slate-800 font-bold">
                            {getLocName(mov.locationId || mov.toLocation || mov.fromLocation)}
                          </span>
                        )}
                      </td>

                      {/* Items & Quantities */}
                      <td className="px-4 py-4">
                        <div className="space-y-1">
                          {mov.items.map((item, idx) => (
                            <div
                              key={idx}
                              className="text-xs flex items-center justify-between gap-3 bg-slate-50 px-2.5 py-1 rounded-lg"
                            >
                              <span className="text-slate-800 font-bold">
                                {getProductName(item.productId)}
                              </span>
                              <span
                                className={`font-mono font-extrabold ${
                                  isTransfer
                                    ? 'text-blue-600'
                                    : isAdjustment
                                      ? 'text-amber-700'
                                    : isOut
                                      ? 'text-rose-600'
                                      : 'text-emerald-600'
                                }`}
                              >
                                {typeof item.signedQuantity === 'number'
                                  ? `${item.signedQuantity > 0 ? '+' : ''}${item.signedQuantity}`
                                  : isTransfer
                                    ? `${item.quantity}`
                                    : isOut
                                      ? `-${item.quantity}`
                                      : `+${item.quantity}`}
                              </span>
                            </div>
                          ))}
                        </div>
                      </td>

                      {/* Description */}
                      <td className="px-4 py-4 text-xs text-slate-800 font-medium">
                        {mov.description}
                      </td>

                      {/* Partner / Recipient */}
                      <td className="px-4 py-4 text-xs text-slate-600 whitespace-nowrap">
                        <span className="px-2.5 py-1 bg-slate-100 rounded-lg font-semibold">
                          {mov.partnerOrRecipient || '-'}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* In-App Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <div
          id="delete-confirm-modal-backdrop"
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150"
        >
          <div
            id="delete-confirm-modal-card"
            className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-md overflow-hidden p-6 space-y-5"
          >
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-1.5">
              <h3 className="text-base font-extrabold text-slate-900">
                선택한 내역을 삭제하시겠습니까?
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                현재 선택된 <span className="font-bold text-rose-600">{selectedRowIds.length}건</span>의 입출고 및 이동 트랜잭션 기록이 시트에서 영구적으로 삭제됩니다.
              </p>
            </div>

            {deleteError && (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-xs font-medium leading-relaxed text-rose-800">
                {deleteError}
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-5 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-2xl transition-colors"
              >
                취소
              </button>
              <button
                id="btn-confirm-delete-action"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-5 py-2.5 text-xs font-bold bg-rose-600 hover:bg-rose-700 disabled:bg-rose-300 active:scale-95 text-white rounded-2xl transition-all shadow-md shadow-rose-600/20"
              >
                {isDeleting ? '시트에서 삭제 중...' : '삭제 확정'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
