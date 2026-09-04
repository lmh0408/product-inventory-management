import React from 'react';
import { Package, Boxes, ClipboardCheck } from 'lucide-react';

interface StatCardsProps {
  totalUnits?: number;
  activeSkuCount?: number;
  activeOrdersCount?: number;
  onOpenAutomation: () => void;
}

export const StatCards: React.FC<StatCardsProps> = ({
  totalUnits = 0,
  activeSkuCount = 12,
  activeOrdersCount = 0,
  onOpenAutomation,
}) => {
  return (
    <section id="dashboard-stat-cards" className="p-8 pb-4 grid grid-cols-1 sm:grid-cols-3 gap-6 shrink-0">
      {/* Card 1: Total Units */}
      <div
        id="stat-card-total-inventory"
        className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100/90 hover:shadow-md transition-all flex flex-col justify-between relative overflow-hidden group"
      >
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            전체 보유 재고
          </span>
          <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 group-hover:scale-105 transition-transform">
            <Package className="w-4 h-4" />
          </div>
        </div>
        <div>
          <div className="flex items-baseline gap-1.5">
            <h3 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              {totalUnits.toLocaleString()}
            </h3>
            <span className="text-sm font-semibold text-slate-500">대</span>
          </div>
        </div>
      </div>

      {/* Card 2: Managed Products Count */}
      <div
        id="stat-card-managed-products"
        className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100/90 hover:shadow-md transition-all flex flex-col justify-between relative overflow-hidden group"
      >
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            관리 품목 수
          </span>
          <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 group-hover:scale-105 transition-transform">
            <Boxes className="w-4 h-4" />
          </div>
        </div>
        <div>
          <div className="flex items-baseline gap-1.5">
            <h3 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              {activeSkuCount}
            </h3>
            <span className="text-sm font-semibold text-slate-500">개 품목</span>
          </div>
        </div>
      </div>

      {/* Card 3: Purchase Order Pipeline (Inactive / Future Integration) */}
      <div
        id="stat-card-auto-orders"
        onClick={onOpenAutomation}
        className="bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-800 hover:border-slate-700 transition-all cursor-pointer flex flex-col justify-between group relative overflow-hidden text-white"
      >
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider bg-slate-800 px-2.5 py-0.5 rounded-full">
                발주 파이프라인
              </span>
            </div>
            <p className="text-[11px] font-medium text-slate-400 mt-1 pl-1">
              (추후 연동)
            </p>
          </div>
          <div className="w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400 group-hover:scale-105 transition-transform">
            <ClipboardCheck className="w-4 h-4" />
          </div>
        </div>
        <div>
          <div className="flex items-baseline gap-1.5">
            <h3 className="text-3xl font-extrabold text-slate-200 tracking-tight">
              {activeOrdersCount}
            </h3>
            <span className="text-sm font-semibold text-slate-400">건 진행 중</span>
          </div>
        </div>
      </div>
    </section>
  );
};

