import React from 'react';
import { StockAlert } from '../types';
import {
  X,
  Bell,
  AlertTriangle,
  AlertCircle,
  Sparkles,
  ArrowLeftRight,
  Send,
  CheckCircle2,
} from 'lucide-react';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  alerts: StockAlert[];
  onOpenPOForProduct: () => void;
  onOpenMovementForProduct: () => void;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({
  isOpen,
  onClose,
  alerts,
  onOpenPOForProduct,
  onOpenMovementForProduct,
}) => {
  if (!isOpen) return null;

  return (
    <div
      id="notification-drawer-backdrop"
      className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex justify-end animate-in fade-in duration-200"
    >
      <div
        id="notification-drawer"
        className="w-full max-w-md bg-white h-full shadow-2xl border-l border-slate-100 flex flex-col animate-in slide-in-from-right duration-200"
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-blue-600 text-white">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-white/20 text-white flex items-center justify-center font-bold text-xs backdrop-blur-xs">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm">실시간 안전재고 경고 알림</h3>
              <p className="text-[11px] text-blue-100">
                설정치 미달 품목 {alerts.length}건 감지됨
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

        {/* Alerts List */}
        <div className="p-5 space-y-4 flex-1 overflow-y-auto text-xs">
          {alerts.length === 0 ? (
            <div className="text-center py-20 space-y-3">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
              <p className="font-extrabold text-slate-800 text-sm">모든 품목 재고가 정상입니다!</p>
              <p className="text-slate-400 text-xs">
                현재 안전재고 기준치 이하로 부족한 품목이 없습니다.
              </p>
            </div>
          ) : (
            alerts.map((alert) => {
              const isCritical = alert.severity === 'CRITICAL';

              return (
                <div
                  key={alert.id}
                  className={`p-4 rounded-2xl border transition-all ${
                    isCritical
                      ? 'bg-rose-50/60 border-rose-200'
                      : 'bg-amber-50/60 border-amber-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {isCritical ? (
                        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                      )}
                      <h4 className="font-extrabold text-slate-900 text-xs">{alert.productName}</h4>
                    </div>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                        isCritical
                          ? 'bg-rose-600 text-white'
                          : 'bg-amber-600 text-white'
                      }`}
                    >
                      {isCritical ? '긴급 부족 (CRITICAL)' : '주의 (LOW)'}
                    </span>
                  </div>

                  <p className="text-slate-700 mt-2 font-medium leading-relaxed">{alert.message}</p>

                  <div className="mt-3 pt-2.5 border-t border-slate-200/60 flex items-center justify-between text-[11px]">
                    <div className="space-x-2 text-slate-600 font-mono font-bold">
                      <span>현재고: <b className="text-slate-900">{alert.currentStock}</b></span>
                      <span>기준: <b>{alert.minThreshold}</b></span>
                      <span className="text-rose-600 font-extrabold">부족: -{alert.deficit}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => {
                          onClose();
                          onOpenMovementForProduct();
                        }}
                        className="px-2 py-1 bg-white hover:bg-slate-100 rounded-xl text-slate-700 font-bold text-[11px] border border-slate-200 flex items-center gap-1"
                        title="거점 이동 등록"
                      >
                        <ArrowLeftRight className="w-3 h-3 text-blue-600" />
                        이동
                      </button>

                      <button
                        onClick={() => {
                          onClose();
                          onOpenPOForProduct();
                        }}
                        className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-[11px] flex items-center gap-1 shadow-sm"
                      >
                        <Send className="w-3 h-3" />
                        발주
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        {alerts.length > 0 && (
          <div className="p-4 border-t border-slate-100 bg-slate-50">
            <button
              onClick={() => {
                onClose();
                onOpenPOForProduct();
              }}
              className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xs font-extrabold transition-all flex items-center justify-center gap-2 shadow-md shadow-blue-600/20"
            >
              <Sparkles className="w-4 h-4" />
              <span>부족 품목 전체 발주서 일괄 생성</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
