import React, { useState } from 'react';
import {
  LocationStock,
  StockMovement,
  ThresholdRule,
  StockAlert,
  LocationId,
  ProductId,
} from '../types';
import { LOCATIONS, PRODUCTS } from '../data/initialData';
import {
  calculateProductTotals,
  calculateCategoryTotals,
} from '../utils/stockUtils';
import {
  FileSpreadsheet,
  StickyNote,
  Building2,
  ChevronDown,
  Layers,
} from 'lucide-react';

interface DashboardViewProps {
  stocks: LocationStock[];
  movements: StockMovement[];
  thresholds: ThresholdRule[];
  alerts: StockAlert[];
  searchTerm?: string;
  onOpenMovementModal?: () => void;
  onOpenAssemblyModal?: (locationId?: LocationId, productId?: ProductId) => void;
  onOpenAutomation?: () => void;
  onOpenPOModal?: () => void;
  onQuickTransfer?: (from: LocationId, to: LocationId, productId: ProductId) => void;
  onUpdateRemarks?: (locationId: LocationId, remarks: string) => Promise<boolean>;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  stocks,
  onUpdateRemarks,
}) => {
  const [mobileSelectedLocId, setMobileSelectedLocId] = useState<LocationId>('lucciem');
  const [editingRemarkLocation, setEditingRemarkLocation] = useState<LocationId | null>(null);
  const [remarkDraft, setRemarkDraft] = useState('');
  const [isSavingRemark, setIsSavingRemark] = useState(false);
  const [remarkError, setRemarkError] = useState<string | null>(null);
  const totals = calculateProductTotals(stocks);
  const categoryTotals = calculateCategoryTotals(stocks);

  const getProductStock = (locId: string, prodId: ProductId) => {
    const loc = stocks.find((s) => s.locationId === locId);
    return loc ? loc.quantities[prodId] || 0 : 0;
  };

  const getLocationRemarks = (locId: string) => {
    const loc = stocks.find((s) => s.locationId === locId);
    return loc?.remarks || '-';
  };

  const beginRemarkEdit = (locationId: LocationId) => {
    setEditingRemarkLocation(locationId);
    setRemarkDraft(stocks.find((stock) => stock.locationId === locationId)?.remarks || '');
    setRemarkError(null);
  };

  const saveRemark = async () => {
    if (!editingRemarkLocation || !onUpdateRemarks) return;
    setIsSavingRemark(true);
    setRemarkError(null);
    try {
      const ok = await onUpdateRemarks(editingRemarkLocation, remarkDraft.trim());
      if (!ok) {
        setRemarkError('비고를 시트에 저장하지 못했습니다.');
        return;
      }
      setEditingRemarkLocation(null);
    } finally {
      setIsSavingRemark(false);
    }
  };

  return (
    <div id="dashboard-view-container" className="px-4 sm:px-8 pb-8 space-y-6 flex-1 overflow-y-auto">
      {/* 1. 제품군별 통합 요약 Cards (최상단 배치) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-600">Smart AED</span>
            <span className="px-2.5 py-0.5 bg-blue-50 text-blue-600 text-xs font-bold rounded-full">
              보유: {categoryTotals.smartAED.total}
            </span>
          </div>
          <div className="text-xs text-slate-600 mt-3 space-y-1.5">
            <div className="flex justify-between">
              <span className="text-slate-400">사무실 (루씨엠):</span>
              <span className="font-bold text-slate-800">{categoryTotals.smartAED.lucciem}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">세일정밀공업:</span>
              <span className="font-bold text-slate-800">{categoryTotals.smartAED.seil}</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-600">일반보관함</span>
            <span className="px-2.5 py-0.5 bg-blue-50 text-blue-600 text-xs font-bold rounded-full">
              보유: {categoryTotals.standard.total}
            </span>
          </div>
          <div className="text-xs text-slate-600 mt-3 space-y-1.5">
            <div className="flex justify-between">
              <span className="text-slate-400">사무실 (루씨엠):</span>
              <span className="font-bold text-slate-800">{categoryTotals.standard.lucciem}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">세일정밀:</span>
              <span className="font-bold text-slate-800">{categoryTotals.standard.seil}</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-600">옥외 / 이동 / 특수</span>
            <span className="px-2.5 py-0.5 bg-blue-50 text-blue-600 text-xs font-bold rounded-full">
              보유: {categoryTotals.special.total}
            </span>
          </div>
          <div className="text-xs text-slate-600 mt-3 space-y-1.5">
            <div className="flex justify-between">
              <span className="text-slate-400">사무실 (루씨엠):</span>
              <span className="font-bold text-slate-800">{categoryTotals.special.lucciem}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">세일정밀공업:</span>
              <span className="font-bold text-slate-800">{categoryTotals.special.seil}</span>
            </div>
          </div>
        </div>

        <div className="bg-blue-600 text-white p-5 rounded-3xl shadow-md shadow-blue-600/20 flex flex-col justify-between">
          <div>
            <span className="text-xs font-bold text-blue-100 uppercase tracking-wider">보관함 전체 보유 총계</span>
            <h4 className="text-3xl font-black text-white mt-1">
              {categoryTotals.grandTotal}{' '}
              <span className="text-sm font-semibold text-blue-100">대</span>
            </h4>
          </div>
          <div className="text-[11px] text-blue-100 pt-2 border-t border-blue-500/60 flex items-center justify-between">
            <span>실시간 연동 재고</span>
            <span className="font-bold">단말기보드 {categoryTotals.terminalBoard}EA</span>
          </div>
        </div>
      </div>

      {/* 2. Primary Sheet Matrix Grid: "보관함 Dashboard" */}
      <div
        id="sheet-matrix-section"
        className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden"
      >
        <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between flex-wrap gap-4 bg-gradient-to-r from-blue-50/50 via-white to-slate-50">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-md shadow-blue-500/20">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="font-extrabold text-slate-900 text-base">거점별 실시간 재고 현황</h2>
                <span className="px-2.5 py-0.5 bg-blue-50 text-blue-600 border border-blue-100 rounded-full text-xs font-bold">
                  실시간 연동
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                구글 스프레드시트 활성 원장 4개의 [현 재고] 값을 우선 반영한 매트릭스
              </p>
            </div>
          </div>
        </div>

        {/* Mobile Accordion / Tab Selector View (Visible on Mobile Only) */}
        <div className="block md:hidden p-4 bg-slate-50 border-b border-slate-100">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            {LOCATIONS.map((loc) => (
              <button
                key={loc.id}
                onClick={() => setMobileSelectedLocId(loc.id)}
                className={`px-3.5 py-2 rounded-xl font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  mobileSelectedLocId === loc.id
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/20'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>{loc.shortName}</span>
              </button>
            ))}
          </div>

          {/* Mobile Selected Location Stock Card */}
          {(() => {
            const loc = LOCATIONS.find((l) => l.id === mobileSelectedLocId);
            const stock = stocks.find((s) => s.locationId === mobileSelectedLocId);
            if (!loc) return null;

            return (
              <div className="mt-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
                    <span className="font-bold text-slate-900 text-sm">{loc.name}</span>
                  </div>
                  <span className="text-[11px] font-semibold text-slate-400">{loc.description}</span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  {PRODUCTS.map((prod) => {
                    const qty = stock ? stock.quantities[prod.id] || 0 : 0;
                    return (
                      <div
                        key={prod.id}
                        className={`p-2.5 rounded-xl border flex items-center justify-between ${
                          qty > 0 ? 'bg-blue-50/40 border-blue-100' : 'bg-slate-50/60 border-slate-100'
                        }`}
                      >
                        <span className="font-medium text-slate-700 truncate pr-1">{prod.name}</span>
                        <span className={`font-mono font-bold shrink-0 ${qty > 0 ? 'text-blue-700 text-sm' : 'text-slate-300'}`}>
                          {qty}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {stock?.remarks && (
                  <div className="pt-2 border-t border-slate-100 flex items-start gap-1.5 text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl">
                    <StickyNote className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
                    <span>{stock.remarks}</span>
                  </div>
                )}
              </div>
            );
          })()}
        </div>

        {/* Desktop / Tablet Matrix Table */}
        <div className="hidden md:block overflow-x-auto">
          <table id="google-sheet-stock-matrix" className="w-full text-left text-xs border-collapse min-w-[1100px]">
            <thead>
              <tr className="bg-slate-900 text-white font-semibold divide-x divide-slate-800">
                <th className="px-4 py-3.5 sticky left-0 z-10 bg-slate-900 w-36">거점 (장소)</th>
                <th className="px-3 py-3.5 text-center bg-blue-900 text-blue-100">Smart 상단</th>
                <th className="px-3 py-3.5 text-center bg-blue-900 text-blue-100">Smart 하단</th>
                <th className="px-3 py-3.5 text-center bg-blue-950 text-blue-100">Smart 상단(영문)</th>
                <th className="px-3 py-3.5 text-center bg-sky-900 text-sky-100">일반 상단</th>
                <th className="px-3 py-3.5 text-center bg-sky-900 text-sky-100">일반 하단</th>
                <th className="px-3 py-3.5 text-center bg-indigo-900 text-indigo-100">일반 상단(삼성)</th>
                <th className="px-3 py-3.5 text-center bg-indigo-900 text-indigo-100">일반 하단(삼성)</th>
                <th className="px-3 py-3.5 text-center bg-slate-800 text-slate-100">옥외</th>
                <th className="px-3 py-3.5 text-center bg-slate-800 text-slate-100">이동</th>
                <th className="px-3 py-3.5 text-center bg-slate-800 text-slate-100">지게가방</th>
                <th className="px-3 py-3.5 text-center bg-slate-800 text-slate-100">세미아웃도어</th>
                <th className="px-3 py-3.5 text-center bg-emerald-900 text-emerald-100">단말기보드</th>
                <th className="px-4 py-3.5 bg-slate-950 text-slate-300 min-w-[280px]">
                  비고 (B급, 샘플, 외관상처 등 예외메모)
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {LOCATIONS.map((loc) => {
                const isLucciem = loc.id === 'lucciem';
                const isSeil = loc.id === 'seil';

                return (
                  <tr
                    key={loc.id}
                    className={`hover:bg-blue-50/30 transition-colors divide-x divide-slate-100 ${
                      isLucciem
                        ? 'bg-blue-50/20'
                        : isSeil
                        ? 'bg-slate-50/50'
                        : 'bg-white'
                    }`}
                  >
                    <td className="px-4 py-4 sticky left-0 z-10 bg-inherit font-bold text-slate-900 flex items-center gap-2">
                      <span
                        className={`w-2.5 h-2.5 rounded-full ${
                          loc.id === 'lucciem'
                            ? 'bg-blue-600'
                            : loc.id === 'seil'
                            ? 'bg-indigo-600'
                            : 'bg-slate-400'
                        }`}
                      ></span>
                      <div>
                        <div>{loc.shortName}</div>
                        <div className="text-[10px] text-slate-400 font-normal">{loc.name}</div>
                      </div>
                    </td>

                    {/* Product Stock Columns */}
                    {PRODUCTS.map((prod) => {
                      const qty = getProductStock(loc.id, prod.id);

                      return (
                        <td key={prod.id} className="px-3 py-4 text-center">
                          <span className={`font-mono font-bold ${qty > 0 ? 'text-slate-900 text-sm' : 'text-slate-300'}`}>
                            {qty}
                          </span>
                        </td>
                      );
                    })}

                    {/* Exception Notes Cell */}
                    <td className="px-4 py-4 text-xs bg-slate-50/40">
                      {editingRemarkLocation === loc.id ? (
                        <div className="space-y-2 min-w-64">
                          <textarea
                            autoFocus
                            value={remarkDraft}
                            onChange={(event) => setRemarkDraft(event.target.value)}
                            onKeyDown={(event) => {
                              if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
                                event.preventDefault();
                                void saveRemark();
                              }
                            }}
                            rows={4}
                            className="w-full resize-y rounded-xl border border-blue-300 bg-white px-3 py-2 text-xs text-slate-800 outline-none focus:ring-2 focus:ring-blue-500/20"
                          />
                          {remarkError && <p className="text-[11px] text-rose-600">{remarkError}</p>}
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              disabled={isSavingRemark}
                              onClick={() => setEditingRemarkLocation(null)}
                              className="rounded-lg px-3 py-1.5 font-bold text-slate-500 hover:bg-slate-100"
                            >
                              취소
                            </button>
                            <button
                              type="button"
                              disabled={isSavingRemark}
                              onClick={() => void saveRemark()}
                              className="rounded-lg bg-blue-600 px-3 py-1.5 font-bold text-white disabled:bg-blue-300"
                            >
                              {isSavingRemark ? '저장 중...' : '저장'}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => beginRemarkEdit(loc.id)}
                          className="flex w-full items-start gap-1.5 rounded-xl p-2 text-left text-slate-600 hover:bg-blue-50 hover:text-blue-800"
                          title="비고 편집"
                        >
                          <StickyNote className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
                          <span className="leading-relaxed">{getLocationRemarks(loc.id)}</span>
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}

              {/* Total Row matching the Google Sheet */}
              <tr className="bg-slate-900 text-white font-bold divide-x divide-slate-800 border-t-2 border-slate-950">
                <td className="px-4 py-4 sticky left-0 z-10 bg-slate-900 text-sm">
                  총계 (보유 재고)
                </td>
                <td className="px-3 py-4 text-center font-mono text-sm">{totals.smart_top}</td>
                <td className="px-3 py-4 text-center font-mono text-sm">{totals.smart_bottom}</td>
                <td className="px-3 py-4 text-center font-mono text-sm">{totals.smart_top_eng}</td>
                <td className="px-3 py-4 text-center font-mono text-sm">{totals.std_top}</td>
                <td className="px-3 py-4 text-center font-mono text-sm">{totals.std_bottom}</td>
                <td className="px-3 py-4 text-center font-mono text-sm">{totals.std_top_samsung}</td>
                <td className="px-3 py-4 text-center font-mono text-sm">{totals.std_bottom_samsung}</td>
                <td className="px-3 py-4 text-center font-mono text-sm">{totals.outdoor}</td>
                <td className="px-3 py-4 text-center font-mono text-sm">{totals.mobile}</td>
                <td className="px-3 py-4 text-center font-mono text-sm">{totals.forklift_bag}</td>
                <td className="px-3 py-4 text-center font-mono text-sm">{totals.semi_outdoor}</td>
                <td className="px-3 py-4 text-center font-mono text-sm">{totals.terminal_board}</td>
                <td className="px-4 py-4 text-xs bg-slate-950 text-slate-300">
                  보유 총합:{' '}
                  <span className="text-white font-bold">
                    {categoryTotals.grandTotal}
                    <span className="text-slate-400 font-semibold">
                      (단말기보드 {categoryTotals.terminalBoard}EA)
                    </span>
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
