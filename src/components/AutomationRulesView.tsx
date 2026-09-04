import React, { useState } from 'react';
import {
  ThresholdRule,
  PurchaseOrder,
  StockAlert,
  LocationStock,
  ProductId,
} from '../types';
import { PRODUCTS } from '../data/initialData';
import { calculateProductTotals, formatCurrencyKRW } from '../utils/stockUtils';
import {
  Sliders,
  Plus,
  FileCheck,
  Send,
  Printer,
  CheckCircle2,
  Clock,
  Truck,
  Building,
  Package,
} from 'lucide-react';

interface AutomationRulesViewProps {
  thresholds: ThresholdRule[];
  purchaseOrders: PurchaseOrder[];
  alerts: StockAlert[];
  stocks: LocationStock[];
  onUpdateRule: (productId: ProductId, minThreshold: number, reorderQuantity: number, supplier: string) => void;
  onOpenNewPOModal: () => void;
  onViewPO: (po: PurchaseOrder) => void;
  onGenerateAutoPO: () => void;
  onUpdatePOStatus: (poId: string, status: PurchaseOrder['status']) => void;
  onOpenMovementModal?: () => void;
  onOpenAssemblyModal?: (locationId?: any, productId?: any) => void;
}

export const AutomationRulesView: React.FC<AutomationRulesViewProps> = ({
  thresholds,
  purchaseOrders,
  stocks,
  onUpdateRule,
  onOpenNewPOModal,
  onViewPO,
  onUpdatePOStatus,
  onOpenMovementModal,
}) => {
  const [editingRuleProductId, setEditingRuleProductId] = useState<ProductId | null>(null);
  const [tempMin, setTempMin] = useState<number>(0);
  const [tempReorder, setTempReorder] = useState<string>('0');
  const [tempSupplier, setTempSupplier] = useState<string>('세일정밀공업');
  const [poFilter, setPoFilter] = useState<'ALL' | 'ACTIVE' | 'COMPLETED'>('ALL');

  const totals = calculateProductTotals(stocks);

  const handleStartEdit = (rule: ThresholdRule) => {
    setEditingRuleProductId(rule.productId);
    setTempMin(rule.minThreshold);
    setTempReorder(String(rule.reorderQuantity));
    setTempSupplier(rule.targetSupplier);
  };

  const handleSaveEdit = (productId: ProductId) => {
    const reorder = Number.parseInt(tempReorder, 10);
    onUpdateRule(productId, tempMin, Number.isFinite(reorder) ? Math.max(0, reorder) : 0, tempSupplier);
    setEditingRuleProductId(null);
  };

  const filteredPOs = purchaseOrders.filter((po) => {
    if (poFilter === 'ACTIVE') return po.status !== 'COMPLETED';
    if (poFilter === 'COMPLETED') return po.status === 'COMPLETED';
    return true;
  });

  return (
    <div id="automation-rules-container" className="px-8 pb-8 space-y-6 flex-1 overflow-y-auto">
      {/* Header Banner - Dark Theme with Future Integration Notice */}
      <div className="bg-slate-900 rounded-3xl p-6 text-white border border-slate-800 shadow-sm flex items-center justify-between flex-wrap gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-slate-800 text-slate-300 text-xs font-bold rounded-full border border-slate-700">
              발주 파이프라인
            </span>
            <span className="px-2.5 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[11px] font-bold rounded-full">
              추후 연동 예정 (현재 비활성)
            </span>
          </div>
          <h2 className="text-xl font-extrabold tracking-tight text-slate-100">
            협력사 발주 및 공급 관리
          </h2>
          <p className="text-xs text-slate-400">
            ※ 본 화면은 향후 협력사 발주 및 공정 자동화 연동 시 활성화될 예정입니다.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onOpenNewPOModal}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 text-slate-200 hover:bg-slate-700 rounded-2xl text-xs font-extrabold transition-all border border-slate-700 shadow-xs"
          >
            <Plus className="w-4 h-4 text-slate-400" />
            <span>신규 발주서 작성 (예비)</span>
          </button>
        </div>
      </div>

      {/* Standard Operating Rule Engine: Movement & Delivery Pipeline - Dark Theme */}
      <div className="bg-slate-900 rounded-3xl p-6 border border-slate-800 shadow-xs space-y-4 text-slate-200">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-slate-100">
                  거점별 이동 및 납품 연동 기준
                </h3>
                <span className="px-2.5 py-0.5 bg-slate-800 text-slate-400 rounded-full text-[10px] font-extrabold border border-slate-700">
                  추후 연동
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                협력사 생산 출고 ➔ 본사 입고 ➔ 고객사 납품 단계별 자동 재고 가감 로직
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onOpenMovementModal && (
              <button
                onClick={onOpenMovementModal}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border border-slate-700"
              >
                <Truck className="w-3.5 h-3.5" />
                <span>세일 ➔ 루씨엠 이동</span>
              </button>
            )}
          </div>
        </div>

        {/* 3-Step Visual Flow Diagram - Dark Theme */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
          {/* Step 1 */}
          <div className="p-4 rounded-2xl bg-slate-850 border border-slate-750 relative">
            <div className="flex items-center justify-between mb-2">
              <span className="px-2 py-0.5 bg-slate-800 text-slate-300 border border-slate-700 rounded-md text-[10px] font-extrabold">
                1단계: 세일 출고
              </span>
              <Building className="w-4 h-4 text-slate-500" />
            </div>
            <h4 className="font-extrabold text-xs text-slate-200">협력사 생산 출고</h4>
            <div className="mt-3 font-mono text-[11px] font-bold text-rose-400 bg-rose-950/30 px-2 py-1 rounded-lg border border-rose-900/50">
              세일정밀 재고 (-N)
            </div>
          </div>

          {/* Step 2 */}
          <div className="p-4 rounded-2xl bg-slate-850 border border-slate-750 relative">
            <div className="flex items-center justify-between mb-2">
              <span className="px-2 py-0.5 bg-slate-800 text-slate-300 border border-slate-700 rounded-md text-[10px] font-extrabold">
                2단계: 루씨엠 입고
              </span>
              <Truck className="w-4 h-4 text-slate-400" />
            </div>
            <h4 className="font-extrabold text-xs text-slate-200">본사 보관 입고</h4>
            <div className="mt-3 font-mono text-[11px] font-bold text-indigo-300 bg-indigo-950/30 px-2 py-1 rounded-lg border border-indigo-900/50">
              루씨엠 재고 (+N)
            </div>
          </div>

          {/* Step 3 */}
          <div className="p-4 rounded-2xl bg-slate-850 border border-slate-750 relative">
            <div className="flex items-center justify-between mb-2">
              <span className="px-2 py-0.5 bg-slate-800 text-slate-300 border border-slate-700 rounded-md text-[10px] font-extrabold">
                3단계: 고객사 납품
              </span>
              <CheckCircle2 className="w-4 h-4 text-slate-400" />
            </div>
            <h4 className="font-extrabold text-xs text-slate-200">고객사 납품 출고</h4>
            <div className="mt-3 font-mono text-[11px] font-bold text-emerald-300 bg-emerald-950/30 px-2 py-1 rounded-lg border border-emerald-900/50">
              루씨엠 재고 (-N)
            </div>
          </div>
        </div>
      </div>

      {/* 2-Section Grid: Left = PO Settings, Right = Purchase Orders (Dark Theme) */}
      <div className="grid grid-cols-12 gap-6">
        {/* Left Column (6/12): Reorder & Supplier Settings */}
        <div className="col-span-12 lg:col-span-6 bg-slate-900 rounded-3xl shadow-sm border border-slate-800 overflow-hidden text-slate-200">
          <div className="p-5 border-b border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-slate-100 text-sm flex items-center gap-2">
                <Sliders className="w-4 h-4 text-slate-400" />
                품목별 기본 발주량 및 협력사 설정
              </h3>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-850 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-800">
                  <th className="px-4 py-3.5">품목명</th>
                  <th className="px-3 py-3.5 text-center">현재고</th>
                  <th className="px-3 py-3.5 text-center">기본 발주량</th>
                  <th className="px-3 py-3.5">지정 협력사</th>
                  <th className="px-3 py-3.5 text-right">설정</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-xs">
                {PRODUCTS.map((prod) => {
                  const rule = thresholds.find((r) => r.productId === prod.id);
                  const currentStock = totals[prod.id] || 0;

                  const reorderQty = rule ? rule.reorderQuantity : prod.moq;
                  const supplier = rule ? rule.targetSupplier : '세일정밀공업';
                  const isEditing = editingRuleProductId === prod.id;

                  return (
                    <tr
                      key={prod.id}
                      className="hover:bg-slate-800/60 transition-colors"
                    >
                      <td className="px-4 py-3.5 font-bold text-slate-200">
                        {prod.name}
                      </td>
                      <td className="px-3 py-3.5 text-center font-mono font-bold">
                        <span className="text-slate-200 font-extrabold">
                          {currentStock}{prod.unit ? ` ${prod.unit}` : ''}
                        </span>
                      </td>

                      {/* Reorder Quantity */}
                      <td className="px-3 py-3.5 text-center font-mono">
                        {isEditing ? (
                          <input
                            type="text"
                            inputMode="numeric"
                            value={tempReorder}
                            onChange={(e) => setTempReorder(e.target.value.replace(/[^\d]/g, ''))}
                            className="w-14 px-1 py-0.5 bg-slate-800 border border-slate-600 rounded-lg text-center font-bold text-white select-text"
                          />
                        ) : (
                          <span className="text-slate-300 font-bold">+{reorderQty}{prod.unit ? ` ${prod.unit}` : ''}</span>
                        )}
                      </td>

                      {/* Supplier */}
                      <td className="px-3 py-3.5">
                        {isEditing ? (
                          <select
                            value={tempSupplier}
                            onChange={(e) => setTempSupplier(e.target.value)}
                            className="bg-slate-800 border border-slate-600 rounded-lg px-2 py-0.5 text-xs font-bold text-white"
                          >
                            <option value="세일정밀공업">세일정밀공업</option>
                            <option value="아이진">아이진</option>
                            <option value="SMT">SMT</option>
                          </select>
                        ) : (
                          <span className="text-slate-300 font-semibold">{supplier}</span>
                        )}
                      </td>

                      {/* Action */}
                      <td className="px-3 py-3.5 text-right">
                        {isEditing ? (
                          <button
                            onClick={() => handleSaveEdit(prod.id)}
                            className="px-2.5 py-1 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-[11px] font-bold shadow-xs border border-slate-600"
                          >
                            저장
                          </button>
                        ) : (
                          <button
                            onClick={() => handleStartEdit(rule || {
                              productId: prod.id,
                              minThreshold: prod.defaultMinThreshold,
                              reorderQuantity: prod.moq,
                              targetSupplier: '세일정밀공업',
                              autoOrderEnabled: true,
                            })}
                            className="text-xs text-slate-400 hover:text-slate-200 font-bold"
                          >
                            수정
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column (6/12): Generated Purchase Orders */}
        <div className="col-span-12 lg:col-span-6 bg-slate-900 rounded-3xl shadow-sm border border-slate-800 flex flex-col text-slate-200">
          <div className="p-5 border-b border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-slate-100 text-sm flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-slate-400" />
                협력사 발주서 관리
              </h3>
            </div>
            {/* Filter */}
            <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-xl text-xs border border-slate-700">
              <button
                onClick={() => setPoFilter('ALL')}
                className={`px-2 py-0.5 rounded-lg font-bold text-[11px] ${
                  poFilter === 'ALL' ? 'bg-slate-700 text-white shadow-xs' : 'text-slate-400'
                }`}
              >
                전체
              </button>
              <button
                onClick={() => setPoFilter('ACTIVE')}
                className={`px-2 py-0.5 rounded-lg font-bold text-[11px] ${
                  poFilter === 'ACTIVE' ? 'bg-slate-700 text-white shadow-xs' : 'text-slate-400'
                }`}
              >
                진행중
              </button>
              <button
                onClick={() => setPoFilter('COMPLETED')}
                className={`px-2 py-0.5 rounded-lg font-bold text-[11px] ${
                  poFilter === 'COMPLETED' ? 'bg-slate-700 text-white shadow-xs' : 'text-slate-400'
                }`}
              >
                입고완료
              </button>
            </div>
          </div>

          <div className="p-4 space-y-3 flex-1 overflow-y-auto max-h-[580px]">
            {filteredPOs.map((po) => {
              let statusBadge = (
                <span className="px-2 py-0.5 bg-slate-800 text-slate-400 rounded-full text-[11px] font-bold border border-slate-700">
                  1. 임시저장
                </span>
              );

              if (po.status === 'ORDERED') {
                statusBadge = (
                  <span className="px-2.5 py-0.5 bg-blue-950/40 text-blue-300 border border-blue-800/60 rounded-full text-[11px] font-bold flex items-center gap-1">
                    <Send className="w-3 h-3" /> 2. 발주접수
                  </span>
                );
              } else if (po.status === 'PRODUCING') {
                statusBadge = (
                  <span className="px-2.5 py-0.5 bg-amber-950/40 text-amber-300 border border-amber-800/60 rounded-full text-[11px] font-bold flex items-center gap-1">
                    <Clock className="w-3 h-3" /> 3. 제작중
                  </span>
                );
              } else if (po.status === 'IN_TRANSIT') {
                statusBadge = (
                  <span className="px-2.5 py-0.5 bg-sky-950/40 text-sky-300 border border-sky-800/60 rounded-full text-[11px] font-bold flex items-center gap-1">
                    <Truck className="w-3 h-3" /> 4. 배송중
                  </span>
                );
              } else if (po.status === 'COMPLETED') {
                statusBadge = (
                  <span className="px-2.5 py-0.5 bg-emerald-950/40 text-emerald-300 border border-emerald-800/60 rounded-full text-[11px] font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> 5. 입고완료
                  </span>
                );
              }

              return (
                <div
                  key={po.id}
                  className="p-4 rounded-2xl border border-slate-800 hover:border-slate-700 transition-all bg-slate-850 flex flex-col justify-between space-y-3 shadow-xs text-slate-200"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-slate-200 text-xs font-mono">{po.id}</span>
                        {statusBadge}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        발주일자: {po.orderDate} • 납기예정: {po.expectedDeliveryDate || '발주일로부터 14일'}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-extrabold text-slate-200 font-mono">
                        {formatCurrencyKRW(po.totalAmount)}
                      </div>
                      <div className="text-[10px] text-slate-400 flex items-center gap-1 justify-end font-semibold">
                        <Building className="w-3 h-3 text-slate-500" />
                        {po.supplier}
                      </div>
                    </div>
                  </div>

                  {/* Items summary */}
                  <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 text-xs space-y-1">
                    {po.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between text-slate-400">
                        <span className="flex items-center gap-1 text-slate-300">
                          <Package className="w-3 h-3 text-slate-400" />
                          {item.productName}
                        </span>
                        <span className="font-mono font-bold text-slate-200">
                          {item.quantity} ({formatCurrencyKRW(item.totalAmount)})
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* PO Status change & View button */}
                  <div className="flex items-center justify-between pt-1 border-t border-slate-800">
                    <select
                      value={po.status}
                      onChange={(e) => onUpdatePOStatus(po.id, e.target.value as any)}
                      className="text-[11px] bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-1 text-slate-200 font-bold outline-none focus:border-slate-500"
                    >
                      <option value="DRAFT">1. 임시저장</option>
                      <option value="ORDERED">2. 발주완료</option>
                      <option value="PRODUCING">3. 제작중</option>
                      <option value="IN_TRANSIT">4. 운송중</option>
                      <option value="COMPLETED">5. 입고완료 및 재고반영</option>
                    </select>

                    <button
                      onClick={() => onViewPO(po)}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-colors flex items-center gap-1 border border-slate-700"
                    >
                      <Printer className="w-3.5 h-3.5 text-slate-400" />
                      <span>발주서 상세/인쇄</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
