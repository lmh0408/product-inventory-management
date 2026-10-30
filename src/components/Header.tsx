import React, { useRef, useState } from 'react';
import {
  LayoutDashboard,
  ArrowLeftRight,
  ClipboardList,
  Settings,
  Upload,
  Download,
  ExternalLink,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import { SheetConfig } from '../types';
import { toSheetUrl } from '../utils/googleSheetSync';
import { ElapsedTime } from './ElapsedTime';

export type NavTab = 'dashboard' | 'movements' | 'automation';

interface HeaderProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  sheetConfig: SheetConfig;
  onOpenSheetSyncModal: () => void;
  onSaveToSheet: () => Promise<boolean>;
  onLoadFromSheet: () => Promise<boolean>;
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
  sheetConfig,
  onOpenSheetSyncModal,
  onSaveToSheet,
  onLoadFromSheet,
}) => {
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimerRef = useRef<number | null>(null);
  const isBusy = isSaving || isLoading || sheetConfig.isSyncing;
  const sheetUrl = sheetConfig.sheetId ? toSheetUrl(sheetConfig.sheetId) : '';

  const flashToast = (message: string) => {
    setToast(message);
    if (toastTimerRef.current != null) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToast(null), 3000);
  };

  const handleSave = async () => {
    if (isBusy) return;
    setIsSaving(true);
    flashToast('시트에 저장하는 중입니다.');
    try {
      const saved = await onSaveToSheet();
      flashToast(
        saved ? '앱 데이터를 원장 시트에 저장했습니다.' : '시트 저장에 실패했습니다.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleLoad = async () => {
    if (isBusy) return;
    setIsLoading(true);
    try {
      if (await onLoadFromSheet()) flashToast('원장 시트에서 최신 데이터를 불러왔습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const actionClass =
    'flex items-center justify-center gap-1.5 min-h-10 min-w-10 px-2.5 lg:min-h-0 lg:min-w-0 lg:px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors disabled:opacity-60 disabled:cursor-not-allowed';

  return (
    <header
      id="app-main-header"
      className="bg-white border-b border-slate-200 shrink-0 z-20 select-none"
    >
      <div className="flex flex-wrap items-center gap-x-2 gap-y-2 px-3 py-2 sm:px-6 lg:h-14 lg:flex-nowrap lg:gap-3 lg:py-0">
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center text-white font-black text-base shadow-sm shadow-blue-500/20">
            S
          </div>
          <div className="hidden sm:flex sm:items-baseline sm:gap-1.5 leading-tight">
            <h1 className="text-sm font-bold tracking-tight text-slate-900">SheetStock</h1>
            <span className="text-[10px] font-semibold text-slate-400 tabular-nums">v1.2</span>
          </div>
        </div>

        <nav
          className="order-last basis-full min-w-0 lg:order-none lg:basis-auto lg:flex-1 lg:flex lg:justify-center"
          aria-label="주요 메뉴"
        >
          <div className="flex w-full items-center gap-0.5 bg-slate-100 p-1 rounded-2xl lg:w-auto lg:max-w-full">
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
                  className={`flex flex-1 lg:flex-none items-center justify-center gap-1.5 px-2 lg:px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/20'
                      : 'text-slate-600 hover:bg-white hover:text-blue-600'
                  }`}
                >
                  <span className={isActive ? 'text-white' : 'text-slate-400'}>{item.icon}</span>
                  <span className="hidden lg:inline">{item.label}</span>
                  <span className="lg:hidden">{item.shortLabel}</span>
                  {item.badge && (
                    <span
                      className={`hidden xl:inline px-1.5 py-0.5 text-[9px] font-bold rounded-md ${
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

        <div className="ml-auto flex items-center justify-end gap-1 shrink-0 lg:order-3 lg:ml-0 lg:gap-1.5">
          <button
            id="btn-save-to-sheet"
            type="button"
            onClick={() => void handleSave()}
            disabled={isBusy}
            title="앱의 재고·입출고 내역을 원장 시트에 저장"
            aria-label="저장"
            className={`${actionClass} text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200`}
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            <span className="hidden lg:inline">저장</span>
            {typeof sheetConfig.lastSavedAtMs === 'number' && (
              <ElapsedTime
                since={sheetConfig.lastSavedAtMs}
                className="hidden lg:inline ml-1 pl-2 border-l border-blue-200 font-medium text-blue-600 tabular-nums"
              />
            )}
          </button>
          <button
            id="btn-load-from-sheet"
            type="button"
            onClick={() => void handleLoad()}
            disabled={isBusy}
            title="원장 시트의 최신 데이터를 앱으로 불러오기"
            aria-label="불러오기"
            className={`${actionClass} text-slate-700 bg-white hover:bg-slate-50 border border-slate-200`}
          >
            {isLoading || sheetConfig.isSyncing ? (
              <Loader2 className="w-4 h-4 animate-spin text-slate-500" />
            ) : (
              <Download className="w-4 h-4 text-slate-500" />
            )}
            <span className="hidden lg:inline">불러오기</span>
            {typeof sheetConfig.lastSyncedAtMs === 'number' && (
              <ElapsedTime
                since={sheetConfig.lastSyncedAtMs}
                className="hidden lg:inline ml-1 pl-2 border-l border-slate-200 font-medium text-slate-400 tabular-nums"
              />
            )}
          </button>
          {sheetUrl ? (
            <a
              id="btn-open-google-sheet"
              href={sheetUrl}
              target="_blank"
              rel="noreferrer"
              title="원장 구글 시트 열기"
              aria-label="시트 열기"
              className={`${actionClass} text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200`}
            >
              <ExternalLink className="w-4 h-4" />
              <span className="hidden lg:inline">시트 열기</span>
            </a>
          ) : (
            <button
              id="btn-open-google-sheet"
              type="button"
              disabled
              title="연결된 시트가 없습니다"
              aria-label="시트 열기"
              className={`${actionClass} text-emerald-700 bg-emerald-50 border border-emerald-200`}
            >
              <ExternalLink className="w-4 h-4" />
              <span className="hidden lg:inline">시트 열기</span>
            </button>
          )}
          <button
            id="nav-link-sheet-settings"
            type="button"
            onClick={onOpenSheetSyncModal}
            title="설정"
            aria-label="설정"
            className={`${actionClass} text-slate-600 bg-slate-100 hover:bg-slate-200 border border-slate-200`}
          >
            <Settings className="w-4 h-4" />
            <span className="hidden lg:inline">설정</span>
          </button>
        </div>
      </div>
      {toast && (
        <div className="fixed top-16 right-4 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2.5 text-xs font-bold">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toast}</span>
        </div>
      )}
    </header>
  );
};
