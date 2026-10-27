import React, { useEffect, useState } from 'react';
import { MasterData, SheetConfig } from '../types';
import { extractSheetId } from '../utils/googleSheetSync';
import {
  X,
  FileSpreadsheet,
  SlidersHorizontal,
  Database,
  RotateCcw,
  Check,
  Loader2,
  FileDown,
} from 'lucide-react';
import { CopyAppsScriptButton } from './CopyAppsScriptButton';
import { MasterDataPanel } from './MasterDataPanel';
import { DEFAULT_MASTER_DATA, cloneMasterData, isSameMasterData } from '../data/masterData';

type SettingsTab = 'master' | 'sheet' | 'source';

interface GoogleSheetSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: SheetConfig;
  onUpdateConfig: (newConfig: Partial<SheetConfig>) => void;
  masterData: MasterData;
  onSaveMasterData: (next: MasterData) => Promise<{ ok: boolean; error?: string }>;
}

const inputClass =
  'w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm text-slate-800 font-medium font-mono outline-none focus:border-slate-400';

export const GoogleSheetSyncModal: React.FC<GoogleSheetSyncModalProps> = ({
  isOpen,
  onClose,
  config,
  onUpdateConfig,
  masterData,
  onSaveMasterData,
}) => {
  const [draftUrl, setDraftUrl] = useState(config.sheetUrl || config.sheetId || '');
  const [draftWebhook, setDraftWebhook] = useState(config.webhookUrl || '');
  const [activeTab, setActiveTab] = useState<SettingsTab>('master');
  const [masterDraft, setMasterDraft] = useState<MasterData>(() => cloneMasterData(masterData));
  const [isSavingMaster, setIsSavingMaster] = useState(false);
  const [masterError, setMasterError] = useState<string | null>(null);
  const [isDownloadingSource, setIsDownloadingSource] = useState(false);
  const [sourceMessage, setSourceMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setDraftUrl(config.sheetUrl || config.sheetId || '');
      setDraftWebhook(config.webhookUrl || '');
    }
  }, [isOpen, config.sheetUrl, config.sheetId, config.webhookUrl]);

  useEffect(() => {
    if (isOpen) {
      setActiveTab('master');
      setMasterDraft(cloneMasterData(masterData));
      setMasterError(null);
      setSourceMessage(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const hasMasterChanges = !isSameMasterData(masterDraft, masterData);

  const handleClose = () => {
    if (isSavingMaster || isDownloadingSource) return;
    if (hasMasterChanges && !window.confirm('저장하지 않은 마스터 데이터 변경 내용이 있습니다. 닫을까요?')) {
      return;
    }
    onClose();
  };

  const handleRestoreDefaults = () => {
    if (!window.confirm('마스터 데이터를 기본값으로 되돌릴까요? 저장을 눌러야 시트에 반영됩니다.')) {
      return;
    }
    setMasterDraft(cloneMasterData(DEFAULT_MASTER_DATA));
    setMasterError(null);
  };

  const handleCompleteMaster = async () => {
    if (!hasMasterChanges) {
      onClose();
      return;
    }
    setIsSavingMaster(true);
    setMasterError(null);
    try {
      const result = await onSaveMasterData(masterDraft);
      if (result.ok) {
        onClose();
      } else {
        setMasterError(result.error || '마스터 데이터를 저장하지 못했습니다.');
      }
    } finally {
      setIsSavingMaster(false);
    }
  };

  const handleSaveSheet = () => {
    const sheetUrl = draftUrl.trim();
    const webhookUrl = draftWebhook.trim();
    const id = extractSheetId(sheetUrl);
    onUpdateConfig({
      sheetUrl,
      sheetId: id || '',
      webhookUrl,
      ...(id !== config.sheetId ? { isConnected: false, lastError: null } : {}),
    });
    onClose();
  };

  const handleDownloadSource = async () => {
    if (isDownloadingSource) return;
    setIsDownloadingSource(true);
    setSourceMessage(null);
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
      setSourceMessage('소스 코드(.zip) 다운로드를 완료했습니다.');
    } catch (error) {
      setSourceMessage(error instanceof Error ? error.message : '소스 다운로드 중 오류가 발생했습니다.');
    } finally {
      setIsDownloadingSource(false);
    }
  };

  const tabMeta: Record<SettingsTab, { title: string; description: string; icon: React.ReactNode }> = {
    master: {
      title: '마스터 데이터 관리',
      description: '제품, 거점, 제품 분류, 공급사 기준 정보를 통합 관리합니다.',
      icon: <SlidersHorizontal className="w-5 h-5" />,
    },
    sheet: {
      title: '구글 시트 연동 설정',
      description: '연결할 시트와 저장용 웹앱만 등록합니다.',
      icon: <FileSpreadsheet className="w-5 h-5" />,
    },
    source: {
      title: '소스 받기',
      description: '현재 앱의 소스 코드를 zip 파일로 받습니다.',
      icon: <FileDown className="w-5 h-5" />,
    },
  };

  return (
    <div
      id="sheet-sync-modal-backdrop"
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200"
    >
      <div
        id="sheet-sync-modal-card"
        className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
              {tabMeta[activeTab].icon}
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-extrabold text-slate-900">{tabMeta[activeTab].title}</h3>
              <p className="text-xs text-slate-500 mt-0.5">{tabMeta[activeTab].description}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 border-b border-slate-200 flex items-end gap-1 overflow-x-auto" role="tablist">
          {(
            [
              { id: 'master', label: '마스터 데이터 관리', icon: <SlidersHorizontal className="w-4 h-4" /> },
              { id: 'sheet', label: '구글 시트 연동 설정', icon: <Database className="w-4 h-4" /> },
              { id: 'source', label: '소스 받기', icon: <FileDown className="w-4 h-4" /> },
            ] as { id: SettingsTab; label: string; icon: React.ReactNode }[]
          ).map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 -mb-px whitespace-nowrap transition-colors ${
                  isActive
                    ? 'border-slate-900 text-slate-900'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            );
          })}
        </div>

        {activeTab === 'master' && (
          <div className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
            {masterError && (
              <div className="bg-rose-50 border border-rose-200 p-3.5 rounded-2xl text-rose-800 font-medium leading-relaxed">
                {masterError}
              </div>
            )}
            <MasterDataPanel value={masterDraft} onChange={setMasterDraft} disabled={isSavingMaster} />
          </div>
        )}

        {activeTab === 'sheet' && (
          <div className="p-6 sm:p-8 space-y-8 overflow-y-auto flex-1">
            <section className="space-y-3">
              <h4 className="text-base font-extrabold text-slate-900">1. 시트 연결</h4>
              <label className="block text-sm font-semibold text-slate-700" htmlFor="input-sheet-url-or-id">
                구글 스프레드시트 URL
              </label>
              <input
                id="input-sheet-url-or-id"
                type="url"
                value={draftUrl}
                onChange={(e) => setDraftUrl(e.target.value)}
                placeholder="https://docs.google.com/spreadsheets/d/……/edit"
                className={inputClass}
              />
            </section>

            <div className="border-t border-slate-200" />

            <section className="space-y-3">
              <h4 className="text-base font-extrabold text-slate-900">2. 저장 연결</h4>
              <CopyAppsScriptButton className="rounded-full px-5 py-2.5 text-xs" />
              <label className="block text-sm font-semibold text-slate-700 pt-2" htmlFor="input-sheet-webhook-url">
                저장용 웹앱 URL
              </label>
              <input
                id="input-sheet-webhook-url"
                type="url"
                value={draftWebhook}
                onChange={(e) => setDraftWebhook(e.target.value)}
                placeholder="https://script.google.com/macros/s/…/exec"
                className={inputClass}
              />
            </section>
          </div>
        )}

        {activeTab === 'source' && (
          <div className="p-6 sm:p-8 space-y-5 overflow-y-auto flex-1">
            <p className="text-sm text-slate-600 leading-relaxed">
              현재 실행 중인 앱의 소스 코드를 zip 파일로 이 컴퓨터에 저장합니다.
            </p>
            {sourceMessage && (
              <p className="text-sm font-semibold text-slate-700">{sourceMessage}</p>
            )}
            <button
              id="btn-download-source"
              type="button"
              onClick={() => void handleDownloadSource()}
              disabled={isDownloadingSource}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-slate-900 text-white text-xs font-bold disabled:opacity-60"
            >
              {isDownloadingSource ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
              {isDownloadingSource ? '준비 중...' : '소스 받기'}
            </button>
          </div>
        )}

        {activeTab === 'master' ? (
          <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50">
            <button
              type="button"
              onClick={handleRestoreDefaults}
              disabled={isSavingMaster}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-50"
            >
              <RotateCcw className="w-4 h-4" />
              기본값 복원
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleClose}
                disabled={isSavingMaster}
                className="px-4 py-2.5 rounded-2xl text-xs font-bold text-slate-600 hover:bg-slate-200 disabled:opacity-50"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleCompleteMaster}
                disabled={isSavingMaster}
                className="flex items-center gap-1.5 px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-xs font-bold disabled:opacity-70"
              >
                {isSavingMaster ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                {isSavingMaster ? '시트에 저장 중...' : '저장'}
              </button>
            </div>
          </div>
        ) : activeTab === 'sheet' ? (
          <div className="p-4 sm:px-8 flex items-center justify-end gap-4">
            <button
              type="button"
              onClick={handleClose}
              className="text-sm font-semibold text-slate-500 hover:text-slate-800"
            >
              취소
            </button>
            <button
              type="button"
              onClick={handleSaveSheet}
              className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold"
            >
              저장
            </button>
          </div>
        ) : (
          <div className="p-4 border-t border-slate-100 flex items-center justify-end bg-slate-50">
            <button
              type="button"
              onClick={handleClose}
              className="px-5 py-2.5 rounded-2xl text-xs font-bold text-slate-600 hover:bg-slate-200"
            >
              닫기
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
