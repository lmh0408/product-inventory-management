import React, { useState, useEffect } from 'react';
import { LocationId, ProductId, LocationStock } from '../types';
import { LOCATIONS, PRODUCTS } from '../data/initialData';
import { isAssemblyTarget, ASSEMBLY_TARGET_PRODUCT_IDS } from '../utils/stockUtils';
import {
  Wrench,
  X,
  Check,
  Cpu,
  Boxes,
  Info,
  AlertTriangle,
  Sparkles,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';

interface AssemblyModalProps {
  isOpen: boolean;
  onClose: () => void;
  stocks: LocationStock[];
  initialLocationId?: LocationId;
  initialProductId?: ProductId;
  onPerformAssembly: (
    locationId: LocationId,
    productId: ProductId,
    quantity: number,
    consumeTerminalBoard: boolean,
    notes?: string
  ) => Promise<boolean>;
}

export const AssemblyModal: React.FC<AssemblyModalProps> = ({
  isOpen,
  onClose,
  stocks,
  initialLocationId = 'lucciem',
  initialProductId,
  onPerformAssembly,
}) => {
  const [locationId, setLocationId] = useState<LocationId>(initialLocationId);
  const [productId, setProductId] = useState<ProductId>(initialProductId || 'smart_top');
  const [quantityText, setQuantityText] = useState<string>('1');
  const [consumeTerminalBoard, setConsumeTerminalBoard] = useState<boolean>(true);
  const [worker, setWorker] = useState<string>('생산/조립 담당 (루씨엠)');
  const [notes, setNotes] = useState<string>('전장/기구 결합 및 QC 검수 통과');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialLocationId) setLocationId(initialLocationId);
    if (initialProductId) setProductId(initialProductId);
  }, [initialLocationId, initialProductId, isOpen]);

  // Current selected location stock
  const currentLocStock = stocks.find((s) => s.locationId === locationId);
  const unassembledAvailable =
    currentLocStock?.unassembledQuantities?.[productId] || 0;
  const assembledCurrent = currentLocStock?.quantities?.[productId] || 0;

  // Available Terminal Boards at the location (or Lucciem HQ)
  const terminalBoardAvailable =
    currentLocStock?.quantities?.['terminal_board'] ||
    stocks.find((s) => s.locationId === 'lucciem')?.quantities?.['terminal_board'] ||
    0;

  const quantity = Number.parseInt(quantityText, 10);
  const quantityValue = Number.isFinite(quantity) ? quantity : 0;

  const isSmartOrOutdoor =
    productId === 'smart_top' ||
    productId === 'smart_top_eng' ||
    productId === 'outdoor';

  const isTarget = isAssemblyTarget(productId);

  // Auto-adjust quantity if it exceeds available
  useEffect(() => {
    if (unassembledAvailable === 0) {
      setQuantityText('0');
      return;
    }
    if (quantityValue > unassembledAvailable) {
      setQuantityText(String(unassembledAvailable));
    }
  }, [productId, locationId, unassembledAvailable, quantityValue]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (unassembledAvailable <= 0) {
      alert('현재 선택한 거점에 조립 가능한 "조립 전(미조립)" 재고가 없습니다.');
      return;
    }
    if (quantityValue <= 0 || quantityValue > unassembledAvailable) {
      alert(`조립 수량은 1 이상 ${unassembledAvailable} 이하이어야 합니다.`);
      return;
    }

    setIsSubmitting(true);
    try {
      const saved = await onPerformAssembly(
        locationId,
        productId,
        quantityValue,
        isSmartOrOutdoor && consumeTerminalBoard,
        `${worker} | ${notes}`
      );
      if (saved) onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      id="assembly-modal-backdrop"
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200"
    >
      <div
        id="assembly-modal-card"
        className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-xl overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 text-white">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-xs shadow-inner">
              <Wrench className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold">보관함 추가 조립 등록</h3>
                <span className="px-2 py-0.5 bg-blue-400/30 text-white border border-white/20 rounded-full text-[10px] font-bold">
                  완제품 전환
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-blue-100 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1 text-xs">
          {/* Location & Product Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Location */}
            <div>
              <label className="block font-bold text-slate-700 mb-1.5">작업 거점 (Location)</label>
              <select
                value={locationId}
                onChange={(e) => setLocationId(e.target.value as LocationId)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-800 font-bold outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              >
                {LOCATIONS.map((loc) => {
                  const unassembledTotal = Object.values(
                    stocks.find((s) => s.locationId === loc.id)?.unassembledQuantities || {}
                  ).reduce<number>((a, b) => a + (typeof b === 'number' ? b : 0), 0);

                  return (
                    <option key={loc.id} value={loc.id}>
                      {loc.name} (조립전 총 {unassembledTotal})
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Product */}
            <div>
              <label className="block font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                <span>조립 대상 품목 (SKU)</span>
                {isTarget && (
                  <span className="text-[10px] text-blue-600 font-bold bg-blue-50 px-1.5 py-0.5 rounded">
                    ★ 필수 조립 대상
                  </span>
                )}
              </label>
              <select
                value={productId}
                onChange={(e) => setProductId(e.target.value as ProductId)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-800 font-bold outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              >
                <optgroup label="── 추가 조립 필요 대상 (상단/옥외/이동) ──">
                  {PRODUCTS.filter((p) => p.requiresAssembly).map((prod) => {
                    const uQty =
                      currentLocStock?.unassembledQuantities?.[prod.id] || 0;
                    return (
                      <option key={prod.id} value={prod.id}>
                        {prod.name} (조립전 {uQty} 보유)
                      </option>
                    );
                  })}
                </optgroup>
                <optgroup label="── 기타 보관함 및 품목 ──">
                  {PRODUCTS.filter((p) => !p.requiresAssembly).map((prod) => {
                    const uQty =
                      currentLocStock?.unassembledQuantities?.[prod.id] || 0;
                    return (
                      <option key={prod.id} value={prod.id}>
                        {prod.name} (조립전 {uQty} 보유)
                      </option>
                    );
                  })}
                </optgroup>
              </select>
            </div>
          </div>

          {/* Current Stock Status Visual Flow */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <div className="text-[11px] font-bold text-slate-500 mb-2.5">
              현재 [{LOCATIONS.find((l) => l.id === locationId)?.shortName}] 재고 변환 미리보기
            </div>
            <div className="flex items-center justify-between gap-3">
              {/* Before: Unassembled */}
              <div className="flex-1 bg-white p-3 rounded-xl border border-slate-200 text-center">
                <div className="text-[10px] text-slate-400 font-bold">조립 전 (미조립)</div>
                <div className="text-lg font-black font-mono text-blue-600 mt-0.5">
                  {unassembledAvailable}
                </div>
                <div className="text-[10px] text-rose-500 font-bold mt-1">
                  -{quantityValue} 차감
                </div>
              </div>

              <div className="flex flex-col items-center justify-center text-slate-400 shrink-0">
                <ArrowRight className="w-5 h-5 text-blue-600 animate-pulse" />
                <span className="text-[9px] font-bold text-blue-600">조립 공정</span>
              </div>

              {/* After: Assembled */}
              <div className="flex-1 bg-white p-3 rounded-xl border border-slate-200 text-center">
                <div className="text-[10px] text-slate-400 font-bold">조립 완료 (완제품)</div>
                <div className="text-lg font-black font-mono text-emerald-600 mt-0.5">
                  {assembledCurrent}
                </div>
                <div className="text-[10px] text-emerald-600 font-bold mt-1">
                  +{quantityValue} 가용 재고 증가
                </div>
              </div>
            </div>
          </div>

          {/* Assembly Quantity Input */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="font-bold text-slate-700">이번에 조립할 수량</label>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setQuantityText('1')}
                  disabled={unassembledAvailable < 1}
                  className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[10px] font-bold"
                >
                  1
                </button>
                <button
                  type="button"
                  onClick={() => setQuantityText(String(Math.min(unassembledAvailable, 5)))}
                  disabled={unassembledAvailable < 5}
                  className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[10px] font-bold"
                >
                  5
                </button>
                <button
                  type="button"
                  onClick={() => setQuantityText(String(unassembledAvailable))}
                  disabled={unassembledAvailable <= 0}
                  className="px-2 py-0.5 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded text-[10px] font-bold"
                >
                  전량 ({unassembledAvailable})
                </button>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete="off"
                value={quantityText}
                onChange={(e) => setQuantityText(e.target.value.replace(/[^\d]/g, ''))}
                disabled={unassembledAvailable <= 0}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 font-mono font-bold text-base outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 select-text"
                required
              />
            </div>
            {unassembledAvailable <= 0 && (
              <p className="text-rose-500 text-[11px] font-bold mt-1.5 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" /> 현재 선택된 거점에 조립 전 상태 재고가 없습니다.
              </p>
            )}
          </div>

          {/* Terminal Board Option (IoT PCB) for Smart / Outdoor cabinets */}
          {isSmartOrOutdoor && (
            <div className="p-3.5 bg-emerald-50/70 border border-emerald-100 rounded-2xl">
              <label className="flex items-center justify-between cursor-pointer">
                <div className="flex items-center gap-2.5">
                  <Cpu className="w-4 h-4 text-emerald-600" />
                  <div>
                    <div className="font-extrabold text-emerald-950">
                      IoT 단말기 제어보드(메인 PCB) 동시 장착 결합
                    </div>
                    <div className="text-[11px] text-emerald-700 mt-0.5">
                      조립 1개당 단말기보드 1EA를 자동 소모 차감합니다. (현재 가용: {terminalBoardAvailable}EA)
                    </div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={consumeTerminalBoard}
                  onChange={(e) => setConsumeTerminalBoard(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 accent-emerald-600"
                />
              </label>
            </div>
          )}

          {/* Notes & Worker */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block font-bold text-slate-700 mb-1">조립 작업자 / 담당</label>
              <input
                type="text"
                value={worker}
                onChange={(e) => setWorker(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-medium outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">조립 특이사항 / 메모</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="예: 제어보드 장착 및 스크래치 점검 완료"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-medium outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Modal Actions */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-2xl font-bold"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={unassembledAvailable <= 0 || isSubmitting}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed active:scale-95 text-white rounded-2xl font-extrabold transition-all shadow-md shadow-blue-600/20 flex items-center gap-1.5"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>{isSubmitting ? '시트에 저장 중...' : '조립 완료 및 완제품 등록'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
