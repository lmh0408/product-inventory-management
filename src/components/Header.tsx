import React from 'react';
import {
  LayoutDashboard,
  ArrowLeftRight,
  ClipboardList,
  FileSpreadsheet,
  Settings,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { SheetConfig } from '../types';

export type NavTab = 'dashboard' | 'movements' | 'automation';

interface HeaderProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  onOpenSheetSyncModal: () => void;
  sheetConfig?: SheetConfig;
  onTriggerSync?: () => void;
}

const NAV_ITEMS: {
  id: NavTab;
  label: string;
  shortLabel: string;
  icon: React.ReactNode;
  badge?: string;
}[] = [
  {
    id: 'dashboard',
    label: '대시보드',
    shortLabel: '대시보드',
    icon: <LayoutDashboard className="w-4 h-4" />,
  },
  {
    id: 'movements',
    label: '입출고·이동',
    shortLabel: '입출고',
    icon: <ArrowLeftRight className="w-4 h-4" />,
  },
  {
    id: 'automation',
    label: '발주 파이프라인',
    shortLabel: '발주',
    icon: <ClipboardList className="w-4 h-4" />,
    badge: '예정',
  },
];

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  onOpenSheetSyncModal,
  sheetConfig,
  onTriggerSync,
}) => {
  return (
    <header
      id="app-main-header"
      className="bg-white border-b border-slate-200 shrink-0 z-20 select-none"
    >
      <div className="h-14 grid grid-cols-[auto_1fr_auto] lg:grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-3 px-3 sm:px-6">
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center text-white font-black text-base shadow-sm shadow-blue-500/20">
            S
          </div>
          <div className="hidden sm:block leading-tight">
            <h1 className="text-sm font-bold tracking-tight text-slate-900">SheetStock</h1>
            <span className="text-[10px] font-semibold text-blue-600">보관함 재고관리</span>
          </div>
        </div>

        <nav
          className="min-w-0 flex items-center justify-center"
          aria-label="주요 메뉴"
        >
          <div className="flex items-center gap-0.5 sm:gap-1 bg-slate-100 p-1 rounded-2xl overflow-x-auto max-w-full">
            {NAV_ITEMS.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  id={`nav-link-${item.id}`}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  aria-current={isActive ? 'page' : undefined}
                  title={item.label}
                  className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/20'
                      : 'text-slate-600 hover:bg-white hover:text-blue-600'
                  }`}
                >
                  <span className={isActive ? 'text-white' : 'text-slate-400'}>{item.icon}</span>
                  <span className="hidden md:inline">{item.label}</span>
                  <span className="md:hidden">{item.shortLabel}</span>
                  {item.badge && (
                    <span
                      className={`hidden lg:inline px-1.5 py-0.5 text-[9px] font-bold rounded-md ${
                        isActive
                          ? 'bg-white/25 text-white'
                          : 'bg-amber-50 text-amber-600 border border-amber-200/60'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </nav>

        <div className="flex items-center justify-end gap-1.5 shrink-0">
          {sheetConfig && (
            <div className="hidden lg:flex items-center gap-1.5">
              {sheetConfig.lastError ? (
                <button
                  type="button"
                  onClick={onTriggerSync}
                  title={`동기화 오류: ${sheetConfig.lastError}\n클릭하여 다시 조회`}
                  className="w-[220px] flex items-center justify-center gap-1.5 px-2.5 py-1 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-[11px] font-bold tabular-nums whitespace-nowrap hover:bg-rose-100 transition-colors"
                >
                  <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                  <span className="truncate">
                    조회 오류
                    {sheetConfig.lastSyncedAt ? ` · ${sheetConfig.lastSyncedAt}` : ''}
                  </span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onTriggerSync}
                  disabled={sheetConfig.isSyncing}
                  title="클릭하여 최신 시트 데이터 즉시 조회"
                  className="w-[220px] flex items-center justify-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 text-[11px] font-semibold tabular-nums whitespace-nowrap hover:bg-slate-100 transition-colors disabled:opacity-70"
                >
                  {sheetConfig.isSyncing ? (
                    <RefreshCw className="w-3.5 h-3.5 text-blue-600 animate-spin shrink-0" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  )}
                  <span className="truncate">
                    {sheetConfig.isSyncing
                      ? '동기화 중...'
                      : sheetConfig.lastSyncedAt
                        ? `최근 갱신 ${sheetConfig.lastSyncedAt}`
                        : '시트 대기 중'}
                  </span>
                </button>
              )}
            </div>
          )}

          <button
            id="nav-link-sheet-settings"
            type="button"
            onClick={onOpenSheetSyncModal}
            title="시트 설정"
            className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

    </header>
  );
};
