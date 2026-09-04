import React, { useState } from 'react';
import { StockMovement, LocationId, MovementType } from '../types';
import { LOCATIONS, PRODUCTS } from '../data/initialData';
import {
  ArrowLeftRight,
  ArrowDownRight,
  ArrowUpRight,
  Calendar,
  CheckCircle2,
  Package,
} from 'lucide-react';

interface MovementHistoryViewProps {
  movements: StockMovement[];
  onOpenMovementModal?: () => void;
  onEditMovement?: (movement: StockMovement) => void;
  onExportCSV?: () => void;
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
  movements,
  onOpenMovementModal,
  onEditMovement,
  onExportCSV,
}) => {
  const [filterType, setFilterType] = useState<MovementType | 'ALL'>('ALL');
  const [filterLocation, setFilterLocation] = useState<LocationId | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filteredMovements = groupTransfersForDisplay(movements)
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

  return (
    <div id="movement-history-container" className="px-8 pb-8 space-y-6 flex-1 overflow-y-auto">
      {/* Header */}
      <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
            <ArrowLeftRight className="w-5 h-5 text-blue-600" />
            입출고 및 이동 현황 원장 (Movement Ledger)
          </h2>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100 flex items-center justify-start flex-wrap gap-3">
        {/* Movement Type Filter */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl text-xs">
          <button
            onClick={() => setFilterType('ALL')}
            className={`px-3.5 py-1.5 rounded-xl font-bold transition-colors ${
              filterType === 'ALL'
                ? 'bg-white text-blue-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            전체 유형
          </button>
          <button
            onClick={() => setFilterType('IN')}
            className={`px-3.5 py-1.5 rounded-xl font-bold transition-colors ${
              filterType === 'IN'
                ? 'bg-emerald-500 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            입고 (Stock In)
          </button>
          <button
            onClick={() => setFilterType('OUT')}
            className={`px-3.5 py-1.5 rounded-xl font-bold transition-colors ${
              filterType === 'OUT'
                ? 'bg-rose-500 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            출고 (Stock Out)
          </button>
          <button
            onClick={() => setFilterType('TRANSFER')}
            className={`px-3.5 py-1.5 rounded-xl font-bold transition-colors ${
              filterType === 'TRANSFER'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            거점 이동 (Transfer)
          </button>
          <button
            onClick={() => setFilterType('ADJUSTMENT')}
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
          onChange={(e) => setFilterLocation(e.target.value as any)}
          className="text-xs bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-2 text-slate-700 font-bold outline-none focus:border-blue-500"
        >
          <option value="ALL">모든 거점</option>
          {LOCATIONS.map((loc) => (
            <option key={loc.id} value={loc.id}>
              {loc.name}
            </option>
          ))}
        </select>
      </div>

      {/* Movement Ledger Table */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-100">
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
                  <td colSpan={6} className="px-5 py-14 text-center text-slate-400 font-medium">
                    조건에 해당하는 이동 내역이 없습니다.
                  </td>
                </tr>
              ) : (
                filteredMovements.map((mov) => {
                  const isIn = mov.type === 'IN';
                  const isOut = mov.type === 'OUT';
                  const isTransfer = mov.type === 'TRANSFER';
                  const isAdjustment = mov.type === 'ADJUSTMENT';

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
                      className="hover:bg-blue-50/70 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
                      title="클릭하여 내역 수정"
                    >
                      {/* Date */}
                      <td className="px-5 py-4 font-mono text-xs text-slate-700">
                        <div className="font-bold text-slate-900">{mov.date}</div>
                        {mov.time && <div className="text-slate-400 text-[11px] font-semibold">{mov.time}</div>}
                      </td>

                      {/* Type Badge */}
                      <td className="px-4 py-4">
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
                      <td className="px-4 py-4 text-xs font-medium text-slate-700">
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
                      <td className="px-4 py-4 text-xs text-slate-600">
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
    </div>
  );
};
