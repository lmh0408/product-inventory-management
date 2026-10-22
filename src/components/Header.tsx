import React, { useState } from 'react';
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
  FileDown,
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
  const isBusy = isSaving || isLoading || sheetConfig.isSyncing;
  const sheetUrl = sheetConfig.sheetId ? toSheetUrl(sheetConfig.sheetId) : '';

  const flashToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 3000);
  };

  const handleSave = async () => {
    if (isBusy) return;
    setIsSaving(true);
    try {
      if (await onSaveToSheet()) flashToast('앱 데이터를 원장 시트에 저장했습니다.');
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

  const [isDownloadingSource, setIsDownloadingSource] = useState(false);

  const handleDownloadSource = async () => {
    if (isDownloadingSource) return;
    setIsDownloadingSource(true);
    try {
      const response = await fetch('/api/download-source');
      if (!response.ok) {
        throw new Error('소스 코드 다운로드에 실패했습니다.');
      }
      const blob = await response.blob();
      const disposition = response.headers.get('Content-Disposition');
      let filename = 'product-inventory-management-source.zip';
      if (disposition) {
        const match = disposition.match(/filename="?([^"]+)"?/);
        if (match?.[1]) filename = match[1];
      }
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
      flashToast('소스 코드(.zip) 다운로드를 완료했습니다.');
    } catch (error) {
      flashToast(
        error instanceof Error ? error.message : '소스 다운로드 중 오류가 발생했습니다.'
      );
    } finally {
      setIsDownloadingSource(false);
    }
  };

  const actionClass =
    'flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors disabled:opacity-60 disabled:cursor-not-allowed';

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

        <div className="flex items-center justify-end gap-1 sm:gap-1.5 shrink-0 overflow-x-auto">
          <button
            id="btn-save-to-sheet"
            type="button"
            onClick={() => void handleSave()}
            disabled={isBusy}
            title="앱의 재고·입출고 내역을 원장 시트에 저장"
            className={`${actionClass} text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200`}
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            <span>저장</span>
            {typeof sheetConfig.lastSavedAtMs === 'number' && (
              <ElapsedTime
                since={sheetConfig.lastSavedAtMs}
                className="hidden sm:inline ml-1 pl-2 border-l border-blue-200 font-medium text-blue-600 tabular-nums"
              />
            )}
          </button>
          <button
            id="btn-load-from-sheet"
            type="button"
            onClick={() => void handleLoad()}
            disabled={isBusy}
            title="원장 시트의 최신 데이터를 앱으로 불러오기"
            className={`${actionClass} text-slate-700 bg-white hover:bg-slate-50 border border-slate-200`}
          >
            {isLoading || sheetConfig.isSyncing ? (
              <Loader2 className="w-4 h-4 animate-spin text-slate-500" />
            ) : (
              <Download className="w-4 h-4 text-slate-500" />
            )}
            <span>불러오기</span>
            {typeof sheetConfig.lastSyncedAtMs === 'number' && (
              <ElapsedTime
                since={sheetConfig.lastSyncedAtMs}
                className="hidden sm:inline ml-1 pl-2 border-l border-slate-200 font-medium text-slate-400 tabular-nums"
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
              className={`${actionClass} text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200`}
            >
              <ExternalLink className="w-4 h-4" />
              <span>시트 열기</span>
            </a>
          ) : (
            <button
              id="btn-open-google-sheet"
              type="button"
              disabled
              title="연결된 시트가 없습니다"
              className={`${actionClass} text-emerald-700 bg-emerald-50 border border-emerald-200`}
            >
              <ExternalLink className="w-4 h-4" />
              <span>시트 열기</span>
            </button>
          )}
          <button
            id="btn-download-source"
            type="button"
            onClick={() => void handleDownloadSource()}
            disabled={isDownloadingSource}
            title="현재 앱의 소스 코드를 zip 파일로 다운로드"
            className={`${actionClass} text-slate-700 bg-white hover:bg-slate-50 border border-slate-200`}
          >
            {isDownloadingSource ? (
              <Loader2 className="w-4 h-4 animate-spin text-slate-500" />
            ) : (
              <FileDown className="w-4 h-4 text-slate-600" />
            )}
            <span>소스 받기</span>
          </button>
          <button
            id="nav-link-sheet-settings"
            type="button"
            onClick={onOpenSheetSyncModal}
            title="설정"
            className={`${actionClass} text-slate-600 bg-slate-100 hover:bg-slate-200 border border-slate-200`}
          >
            <Settings className="w-4 h-4" />
            <span>설정</span>
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
