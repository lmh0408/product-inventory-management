import React, { useState } from 'react';
import { PurchaseOrder, LocationId, ProductId } from '../types';
import { formatCurrencyKRW } from '../utils/stockUtils';
import { LOCATIONS, PRODUCTS } from '../data/initialData';
import {
  X,
  Printer,
  Copy,
  Check,
  Send,
  Building,
  Calendar,
  FileCheck2,
  Package,
  Wrench,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';

interface PurchaseOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  purchaseOrder: PurchaseOrder | null;
  onUpdatePOStatus: (poId: string, status: PurchaseOrder['status']) => void;
}

export const PurchaseOrderModal: React.FC<PurchaseOrderModalProps> = ({
  isOpen,
  onClose,
  purchaseOrder,
  onUpdatePOStatus,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !purchaseOrder) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleCopyText = () => {
    const lines = [
      `[공식 제품 발주서] ${purchaseOrder.id}`,
      `발주일자: ${purchaseOrder.orderDate}`,
      `발주처: (주)루씨엠`,
      `수신처(협력 제조사): ${purchaseOrder.supplier}`,
      `입고 예정 거점: ${LOCATIONS.find((l) => l.id === purchaseOrder.targetLocation)?.name || '세일정밀공업'}`,
      `납기예정일: ${purchaseOrder.expectedDeliveryDate || '발주일로부터 14일 이내'}`,
      `----------------------------------------`,
      ...purchaseOrder.items.map(
        (item, idx) =>
          `${idx + 1}. ${item.productName} | 수량: ${item.quantity} | 단가: ${formatCurrencyKRW(
            item.unitPrice
          )} | 합계: ${formatCurrencyKRW(item.totalAmount)} (${item.reason || '안전재고 확보'})`
      ),
      `----------------------------------------`,
      `총 발주금액: ${formatCurrencyKRW(purchaseOrder.totalAmount)} (VAT 별도)`,
      `특기사항: ${purchaseOrder.notes || '안전재고 미달분 자동 발주'}`,
    ];

    navigator.clipboard.writeText(lines.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const statusSteps: Array<{ key: PurchaseOrder['status']; label: string; desc: string }> = [
    { key: 'DRAFT', label: '1. 발주서 작성', desc: '품목/수량 검토' },
    { key: 'ORDERED', label: '2. 발주 완료', desc: '협력사 전송' },
    { key: 'PRODUCING', label: '3. 가공/제작 중', desc: '공정 진행' },
    { key: 'IN_TRANSIT', label: '4. 배송/운송 중', desc: '입고 이동' },
    { key: 'COMPLETED', label: '5. 입고 완료', desc: '재고 자동 합산' },
  ];

  const currentStepIndex = statusSteps.findIndex((s) => s.key === purchaseOrder.status);

  return (
    <div
      id="po-modal-backdrop"
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200"
    >
      <div
        id="po-modal-card"
        className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-4xl overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-blue-600 text-white">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-white/20 text-white flex items-center justify-center font-bold text-sm shadow-sm backdrop-blur-xs">
              <FileCheck2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold flex items-center gap-2">
                표준 제품 발주서 (Purchase Order)
              </h3>
              <p className="text-xs text-blue-100">
                문서번호: <span className="font-mono font-bold text-white">{purchaseOrder.id}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-blue-100 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 5-Step PO Lifecycle Pipeline Bar (Requirement 3.4) */}
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-100">
          <div className="flex items-center justify-between gap-2 max-w-3xl mx-auto">
            {statusSteps.map((step, idx) => {
              const isPastOrCurrent = idx <= currentStepIndex;
              const isCurrent = step.key === purchaseOrder.status;

              return (
                <div
                  key={step.key}
                  onClick={() => onUpdatePOStatus(purchaseOrder.id, step.key)}
                  className={`flex-1 flex items-center gap-2 cursor-pointer p-2 rounded-xl transition-all ${
                    isCurrent
                      ? 'bg-blue-600 text-white shadow-sm'
                      : isPastOrCurrent
                      ? 'bg-blue-50 text-blue-800'
                      : 'bg-white text-slate-400 border border-slate-200/60'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      isCurrent
                        ? 'bg-white text-blue-600'
                        : isPastOrCurrent
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {idx + 1}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold leading-none truncate">{step.label}</div>
                    <div className={`text-[10px] mt-0.5 truncate ${isCurrent ? 'text-blue-100' : 'text-slate-400'}`}>
                      {step.desc}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Printable PO Sheet Area */}
        <div className="p-8 space-y-6 overflow-y-auto flex-1 text-xs bg-slate-50/50 print:p-0 print:bg-white">
          {/* PO Info Cards */}
          <div className="grid grid-cols-2 gap-6 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
            <div>
              <h4 className="font-extrabold text-sm text-slate-900 mb-3 flex items-center gap-1.5">
                <Building className="w-4 h-4 text-blue-600" />
                발주처 (루씨엠 본사)
              </h4>
              <table className="w-full text-slate-600 text-xs leading-relaxed">
                <tbody>
                  <tr>
                    <td className="py-1 font-bold text-slate-400 w-24">발주 기업</td>
                    <td className="font-bold text-slate-900">(주)루씨엠 (LUC M)</td>
                  </tr>
                  <tr>
                    <td className="py-1 font-bold text-slate-400">담당 부서</td>
                    <td>재고/자재 공급관리팀 (mhlee.lucm@gmail.com)</td>
                  </tr>
                  <tr>
                    <td className="py-1 font-bold text-slate-400">발주일자</td>
                    <td className="font-mono font-bold text-slate-900">{purchaseOrder.orderDate}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div>
              <h4 className="font-extrabold text-sm text-slate-900 mb-3 flex items-center gap-1.5">
                <Package className="w-4 h-4 text-blue-600" />
                수신처 (협력 제조사)
              </h4>
              <table className="w-full text-slate-600 text-xs leading-relaxed">
                <tbody>
                  <tr>
                    <td className="py-1 font-bold text-slate-400 w-24">협력사명</td>
                    <td className="font-bold text-blue-600">{purchaseOrder.supplier}</td>
                  </tr>
                  <tr>
                    <td className="py-1 font-bold text-slate-400">입고 대상 거점</td>
                    <td className="font-bold text-slate-900">
                      {LOCATIONS.find((l) => l.id === purchaseOrder.targetLocation)?.name || '세일정밀공업 (경기 화성)'}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-1 font-bold text-slate-400">납기 예정일</td>
                    <td className="font-mono font-bold text-slate-900">
                      {purchaseOrder.expectedDeliveryDate || '발주일로부터 14일 이내'}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Items Table */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white font-bold">
                  <th className="px-4 py-3.5 text-center w-12">No</th>
                  <th className="px-4 py-3.5">품목명 및 사양</th>
                  <th className="px-4 py-3.5 text-center">발주 구분</th>
                  <th className="px-4 py-3.5 text-center">발주수량</th>
                  <th className="px-4 py-3.5 text-right">예상단가</th>
                  <th className="px-4 py-3.5 text-right">공급가액</th>
                  <th className="px-4 py-3.5">발주 사유 / 비고</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {purchaseOrder.items.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3.5 text-center font-mono text-slate-400">{idx + 1}</td>
                    <td className="px-4 py-3.5">
                      <div className="font-bold text-slate-900">{item.productName}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{item.productId}</div>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full text-[11px] font-bold inline-flex items-center gap-1">
                        <Package className="w-3 h-3" /> 일반 발주
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-center font-mono font-bold text-blue-600 text-sm">
                      {item.quantity}
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono text-slate-600">
                      {formatCurrencyKRW(item.unitPrice)}
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono font-bold text-slate-900">
                      {formatCurrencyKRW(item.totalAmount)}
                    </td>
                    <td className="px-4 py-3.5 text-slate-500 text-[11px]">{item.reason}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-900 text-white font-bold text-sm">
                  <td colSpan={5} className="px-4 py-4 text-right">
                    총 발주 공급가액 합계 (VAT 별도):
                  </td>
                  <td className="px-4 py-4 text-right font-mono text-blue-300 text-base">
                    {formatCurrencyKRW(purchaseOrder.totalAmount)}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Notes */}
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm text-xs">
            <h5 className="font-bold text-slate-800 mb-1.5">비고 및 납품 준수사항</h5>
            <p className="text-slate-600 leading-relaxed">
              {purchaseOrder.notes ||
                '1. 납품 시 외관 흠집/스크래치가 없도록 완충 포장 후 입고할 것. 2. 검수 불합격 또는 B급 발생 시 비고 메모로 즉시 통보할 것.'}
            </p>
          </div>
        </div>

        {/* Modal Footer Controls */}
        <div className="p-5 border-t border-slate-100 flex items-center justify-between bg-white">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-slate-700">진행 상태 변경:</span>
            <select
              value={purchaseOrder.status}
              onChange={(e) => onUpdatePOStatus(purchaseOrder.id, e.target.value as any)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-bold outline-none focus:border-blue-500"
            >
              <option value="DRAFT">1. 임시저장 (DRAFT)</option>
              <option value="ORDERED">2. 발주완료 (ORDERED)</option>
              <option value="PRODUCING">3. 제작중 (PRODUCING)</option>
              <option value="IN_TRANSIT">4. 운송중 (IN_TRANSIT)</option>
              <option value="COMPLETED">5. 입고완료 및 재고반영 (COMPLETED)</option>
            </select>
            {purchaseOrder.status === 'COMPLETED' && (
              <span className="text-xs text-emerald-600 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" /> 재고 자동 반영 완료
              </span>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handleCopyText}
              className="px-4 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-2xl text-xs font-bold transition-colors flex items-center gap-1.5 border border-slate-200"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? '복사 완료' : '텍스트 복사 (이메일/슬랙)'}</span>
            </button>

            <button
              onClick={handlePrint}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-md shadow-blue-600/20"
            >
              <Printer className="w-4 h-4" />
              <span>발주서 인쇄 / PDF 출력</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

