import React, { useState } from 'react';
import { LocationStock, ThresholdRule, StockAlert, ProductId } from '../types';
import { PRODUCTS } from '../data/initialData';
import {
  calculateProductTotals,
} from '../utils/stockUtils';
import {
  Boxes,
  Plus,
  Edit2,
  Package,
  StickyNote,
  Check,
} from 'lucide-react';

interface InventoryViewProps {
  stocks: LocationStock[];
  thresholds: ThresholdRule[];
  alerts: StockAlert[];
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  onOpenMovementModal: () => void;
  onOpenAssemblyModal?: (locationId?: any, productId?: any) => void;
  onOpenAutomation: () => void;
  onUpdateStock: (locationId: string, productId: string, newQty: number) => void;
  onUpdateUnassembledStock?: (locationId: string, productId: string, newQty: number) => void;
  onUpdateExceptionNote?: (locationId: string, productId: string, note: string) => void;
}

export const InventoryView: React.FC<InventoryViewProps> = ({
  stocks,
  searchTerm,
  onOpenMovementModal,
  onUpdateStock,
  onUpdateExceptionNote,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  
  // Inline edit state for stock quantities
  const [editingKey, setEditingKey] = useState<string | null>(null); // e.g. "lucciem-smart_top"
  const [tempQty, setTempQty] = useState<string>('0');

  // Inline edit state for notes
  const [editingNoteKey, setEditingNoteKey] = useState<string | null>(null); // e.g. "lucciem-smart_top"
  const [tempNote, setTempNote] = useState<string>('');

  const totals = calculateProductTotals(stocks);

  const filteredProducts = PRODUCTS.filter((p) => {
    if (selectedCategory !== 'ALL' && p.category !== selectedCategory) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        p.name.toLowerCase().includes(term) ||
        p.category.toLowerCase().includes(term) ||
        p.description.toLowerCase().includes(term) ||
        p.id.toLowerCase().includes(term)
      );
    }
    return true;
  });

  const getLocStock = (locId: string, prodId: string) => {
    const loc = stocks.find((s) => s.locationId === locId);
    return loc ? loc.quantities[prodId as ProductId] || 0 : 0;
  };

  const getLocExceptionNote = (locId: string, prodId: string) => {
    const loc = stocks.find((s) => s.locationId === locId);
    return loc?.exceptionNotes ? loc.exceptionNotes[prodId as ProductId] || '' : '';
  };

  const handleStartEditQty = (locId: string, prodId: string, currentVal: number) => {
    setEditingKey(`${locId}-${prodId}`);
    setTempQty(String(currentVal));
  };

  const handleSaveEditQty = (locId: string, prodId: string) => {
    const parsed = Number.parseInt(tempQty, 10);
    onUpdateStock(locId, prodId, Number.isFinite(parsed) ? Math.max(0, parsed) : 0);
    setEditingKey(null);
  };

  const handleStartEditNote = (locId: string, prodId: string, currentNote: string) => {
    setEditingNoteKey(`${locId}-${prodId}`);
    setTempNote(currentNote);
  };

  const handleSaveEditNote = (locId: string, prodId: string) => {
    if (onUpdateExceptionNote) {
      onUpdateExceptionNote(locId, prodId, tempNote);
    }
    setEditingNoteKey(null);
  };

  return (
    <div id="inventory-view-container" className="px-8 pb-8 space-y-6 flex-1 overflow-y-auto">
      {/* Top Guidance & Filter and Controls Bar */}
      <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
              <Boxes className="w-5 h-5 text-blue-600" />
              <span>품목별 재고 현황</span>
            </h2>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={onOpenMovementModal}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xs font-bold transition-all shadow-md shadow-blue-600/20"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>입출고 / 이동</span>
            </button>
          </div>
        </div>

        {/* Filters Row */}
        <div className="flex items-center justify-between flex-wrap gap-3 pt-3 border-t border-slate-100 text-xs">
          {/* Category Filter */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl">
            {['ALL', 'Smart AED', '일반보관함', '옥외/이동/특수', '전장부품'].map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                  selectedCategory === cat
                    ? 'bg-white text-blue-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {cat === 'ALL' ? '전체 품목' : cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Product Inventory Cards / Table */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-100">
                <th className="px-5 py-4 min-w-[180px]">품목명</th>
                <th className="px-3 py-4">카테고리</th>
                <th className="px-4 py-4 text-center bg-blue-50/40 text-blue-900 min-w-[130px]">
                  루씨엠 (본사)
                </th>
                <th className="px-4 py-4 text-center bg-indigo-50/40 text-indigo-900 min-w-[130px]">
                  세일정밀
                </th>
                <th className="px-3 py-4 text-center">아이진</th>
                <th className="px-3 py-4 text-center">ETC</th>
                <th className="px-4 py-4 text-center font-extrabold text-slate-900 bg-slate-100/70 min-w-[120px]">
                  총 재고
                </th>
                <th className="px-4 py-4 min-w-[220px]">특이사항 메모</th>
                <th className="px-4 py-4 text-right">작업</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredProducts.map((product) => {
                const totalStock = totals[product.id] || 0;

                // Location-specific stock
                const lucciemStock = getLocStock('lucciem', product.id);
                const lucciemNote = getLocExceptionNote('lucciem', product.id);

                const seilStock = getLocStock('seil', product.id);
                const seilNote = getLocExceptionNote('seil', product.id);

                const ijinStock = getLocStock('ijin', product.id);
                const etcStock = getLocStock('etc', product.id);

                // Combined note representation
                const allNotes = [
                  lucciemNote ? `[루씨엠] ${lucciemNote}` : '',
                  seilNote ? `[세일정밀] ${seilNote}` : '',
                ]
                  .filter(Boolean)
                  .join(' / ');

                return (
                  <tr key={product.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* Product info */}
                    <td className="px-5 py-4">
                      <div className="flex flex-col">
                        <span className="font-extrabold text-slate-900 text-sm">{product.name}</span>
                      </div>
                    </td>

                    {/* Category */}
                    <td className="px-3 py-4">
                      <span className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-bold">
                        {product.category}
                      </span>
                    </td>

                    {/* 루씨엠 Stock */}
                    <td className="px-4 py-4 text-center bg-blue-50/20">
                      <div className="flex items-center justify-center gap-1">
                        {editingKey === `lucciem-${product.id}` ? (
                          <div className="flex items-center justify-center gap-1">
                            <input
                              type="text"
                              inputMode="numeric"
                              value={tempQty}
                              onChange={(e) => setTempQty(e.target.value.replace(/[^\d]/g, ''))}
                              className="w-14 px-1 py-0.5 text-center font-mono border border-blue-500 rounded-lg bg-white text-xs font-bold select-text"
                            />
                            <button
                              onClick={() => handleSaveEditQty('lucciem', product.id)}
                              className="p-1 bg-blue-600 text-white rounded-lg text-xs"
                            >
                              <Check className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <div
                            onClick={() => handleStartEditQty('lucciem', product.id, lucciemStock)}
                            className="font-mono font-bold text-slate-900 cursor-pointer hover:text-blue-600 group flex items-center justify-center gap-1 text-sm"
                            title="수량 수정 (클릭)"
                          >
                            <Package className="w-3.5 h-3.5 text-slate-400" />
                            <span>{lucciemStock}</span>
                            <Edit2 className="w-2.5 h-2.5 text-slate-300 opacity-0 group-hover:opacity-100" />
                          </div>
                        )}
                      </div>
                    </td>

                    {/* 세일정밀 Stock */}
                    <td className="px-4 py-4 text-center bg-indigo-50/20">
                      <div className="flex items-center justify-center gap-1">
                        {editingKey === `seil-${product.id}` ? (
                          <div className="flex items-center justify-center gap-1">
                            <input
                              type="text"
                              inputMode="numeric"
                              value={tempQty}
                              onChange={(e) => setTempQty(e.target.value.replace(/[^\d]/g, ''))}
                              className="w-14 px-1 py-0.5 text-center font-mono border border-indigo-500 rounded-lg bg-white text-xs font-bold select-text"
                            />
                            <button
                              onClick={() => handleSaveEditQty('seil', product.id)}
                              className="p-1 bg-indigo-600 text-white rounded-lg text-xs"
                            >
                              <Check className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <div
                            onClick={() => handleStartEditQty('seil', product.id, seilStock)}
                            className="font-mono font-bold text-slate-900 cursor-pointer hover:text-indigo-600 group flex items-center justify-center gap-1 text-sm"
                            title="수량 수정 (클릭)"
                          >
                            <Package className="w-3.5 h-3.5 text-slate-400" />
                            <span>{seilStock}</span>
                            <Edit2 className="w-2.5 h-2.5 text-slate-300 opacity-0 group-hover:opacity-100" />
                          </div>
                        )}
                      </div>
                    </td>

                    {/* 아이진 */}
                    <td className="px-3 py-4 text-center font-mono text-slate-600 font-bold text-xs">{ijinStock}</td>

                    {/* ETC */}
                    <td className="px-3 py-4 text-center font-mono text-slate-600 font-bold text-xs">{etcStock}</td>

                    {/* Total Stock */}
                    <td className="px-4 py-4 text-center bg-slate-100/60 font-mono">
                      <div className="font-extrabold text-base text-slate-900">
                        <span>{totalStock}</span>
                        {product.unit ? <span className="text-xs font-bold text-slate-400 ml-1">{product.unit}</span> : null}
                      </div>
                    </td>

                    {/* Exception Notes Cell (B-grade, Sample, Scratch) */}
                    <td className="px-4 py-4 max-w-xs">
                      {editingNoteKey === `lucciem-${product.id}` ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            value={tempNote}
                            placeholder="예: B급 2, 역설계 Sample 1 등"
                            onChange={(e) => setTempNote(e.target.value)}
                            className="w-full px-2 py-1 text-xs border border-blue-500 rounded-lg bg-white"
                          />
                          <button
                            onClick={() => handleSaveEditNote('lucciem', product.id)}
                            className="p-1 bg-blue-600 text-white rounded-lg"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div
                          onClick={() => handleStartEditNote('lucciem', product.id, lucciemNote || seilNote)}
                          className="group cursor-pointer flex items-center gap-1.5 p-1.5 rounded-xl hover:bg-slate-100 transition-colors"
                          title="클릭하여 특이사항 메모 수정"
                        >
                          <StickyNote className="w-3.5 h-3.5 text-slate-400 shrink-0 group-hover:text-blue-600" />
                          <span className="text-xs text-slate-600 truncate">
                            {allNotes || <span className="text-slate-300 italic">특이사항 없음 (클릭하여 입력)</span>}
                          </span>
                          <Edit2 className="w-2.5 h-2.5 text-slate-300 opacity-0 group-hover:opacity-100 shrink-0 ml-auto" />
                        </div>
                      )}
                    </td>

                    {/* Row Action Buttons */}
                    <td className="px-4 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={onOpenMovementModal}
                          className="px-2.5 py-1 text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors"
                        >
                          이동
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
