import React, { useEffect, useState } from 'react';
import { MasterData, SheetConfig } from '../types';
import { extractSheetId, toSheetUrl } from '../utils/googleSheetSync';
import {
  X,
  FileSpreadsheet,
  ExternalLink,
  AlertCircle,
  CheckCircle2,
  SlidersHorizontal,
  Database,
  RotateCcw,
  Check,
  Loader2,
} from 'lucide-react';
import { CopyAppsScriptButton } from './CopyAppsScriptButton';
import { MasterDataPanel } from './MasterDataPanel';
import { DEFAULT_MASTER_DATA, cloneMasterData, isSameMasterData } from '../data/masterData';

type SettingsTab = 'master' | 'sheet';

interface GoogleSheetSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: SheetConfig;
  onUpdateConfig: (newConfig: Partial<SheetConfig>) => void;
  masterData: MasterData;
  onSaveMasterData: (next: MasterData) => Promise<{ ok: boolean; error?: string }>;
}

export const GoogleSheetSyncModal: React.FC<GoogleSheetSyncModalProps> = ({
  isOpen,
  onClose,
  config,
  onUpdateConfig,
  masterData,
  onSaveMasterData,
}) => {
  const [draftUrl, setDraftUrl] = useState(config.sheetUrl || config.sheetId || '');
  const [activeTab, setActiveTab] = useState<SettingsTab>('master');
  const [masterDraft, setMasterDraft] = useState<MasterData>(() => cloneMasterData(masterData));
  const [isSavingMaster, setIsSavingMaster] = useState(false);
  const [masterError, setMasterError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setDraftUrl(config.sheetUrl || config.sheetId || '');
    }
  }, [isOpen, config.sheetUrl, config.sheetId]);

  useEffect(() => {
    if (isOpen) {
      setActiveTab('master');
      setMasterDraft(cloneMasterData(masterData));
      setMasterError(null);
    }
    // Reset the draft only when the modal opens, not on every master data refresh.
  }, [isOpen]);

  if (!isOpen) return null;

  const hasMasterChanges = !isSameMasterData(masterDraft, masterData);

  const handleClose = () => {
    if (isSavingMaster) return;
    if (hasMasterChanges && !window.confirm('저장하지 않은 마스터 데이터 변경 내용이 있습니다. 닫을까요?')) {
      return;
    }
    onClose();
  };

  const handleRestoreDefaults = () => {
    if (!window.confirm('마스터 데이터를 기본값으로 되돌릴까요? 완료 및 닫기를 눌러야 시트에 반영됩니다.')) {
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

  const displayUrl = draftUrl || config.sheetUrl || config.sheetId || '';
  const parsedId = extractSheetId(displayUrl);
  const canOpenSheet = Boolean(parsedId || config.sheetId);

  const handleUrlChange = (raw: string) => {
    setDraftUrl(raw);
    const id = extractSheetId(raw);
    onUpdateConfig({
      sheetUrl: raw.trim(),
      sheetId: id || '',
      isConnected: false,
      lastError: null,
    });
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
              {activeTab === 'master' ? (
                <SlidersHorizontal className="w-5 h-5" />
              ) : (
                <FileSpreadsheet className="w-5 h-5" />
              )}
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-extrabold text-slate-900">
                {activeTab === 'master' ? '마스터 데이터 관리' : '구글 시트 연동 설정'}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {activeTab === 'master'
                  ? '제품, 거점, 제품 분류, 공급사 기준 정보를 통합 관리합니다.'
                  : '연결할 시트와 저장용 웹앱만 등록합니다.'}
              </p>
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

        <div className="px-5 border-b border-slate-200 flex items-end gap-1" role="tablist">
          {(
            [
              { id: 'master', label: '마스터 데이터 관리', icon: <SlidersHorizontal className="w-4 h-4" /> },
              { id: 'sheet', label: '구글 시트 연동 설정', icon: <Database className="w-4 h-4" /> },
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
                className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 -mb-px transition-colors ${
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

        {activeTab === 'master' ? (
          <div className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
            {masterError && (
              <div className="bg-rose-50 border border-rose-200 p-3.5 rounded-2xl text-rose-800 font-medium leading-relaxed">
                {masterError}
              </div>
            )}
            <MasterDataPanel value={masterDraft} onChange={setMasterDraft} disabled={isSavingMaster} />
          </div>
        ) : (
        <div className="p-5 space-y-5 overflow-y-auto flex-1 text-xs">
          {config.isConnected ? (
            <div className="bg-emerald-50 border border-emerald-200 p-3.5 rounded-2xl flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <div className="min-w-0">
                <p className="font-extrabold text-emerald-900 text-sm">시트 연결됨</p>
                <p className="text-emerald-700 mt-0.5 truncate">
                  {config.lastSavedAt ? `마지막 저장 ${config.lastSavedAt}` : '아직 시트에 저장한 적 없음'}
                  {config.lastSyncedAt ? ` · 마지막 불러오기 ${config.lastSyncedAt}` : ''}
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-2xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-extrabold text-amber-900 text-sm">시트가 아직 연결되지 않았습니다</p>
                <p className="text-amber-800 mt-0.5 leading-relaxed">
                  시트 URL을 붙여넣고, 공유를 링크가 있는 모든 사용자(뷰어)로 열어 주세요.
                </p>
              </div>
            </div>
          )}

          {config.lastError && (
            <div className="bg-rose-50 border border-rose-200 p-3.5 rounded-2xl text-rose-800 font-medium leading-relaxed">
              {config.lastError}
            </div>
          )}

          <section className="space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <h4 className="font-extrabold text-slate-900 text-sm">1. 시트 연결</h4>
            </div>
            <label className="block font-bold text-slate-700" htmlFor="input-sheet-url-or-id">
              구글 스프레드시트 URL
            </label>
            <input
              id="input-sheet-url-or-id"
              type="url"
              value={displayUrl}
              onChange={(e) => handleUrlChange(e.target.value)}
              placeholder="https://docs.google.com/spreadsheets/d/……/edit"
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-slate-800 font-medium font-mono outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </section>

          <section className="space-y-2.5 pt-1 border-t border-slate-100">
            <h4 className="font-extrabold text-slate-900 text-sm pt-3">2. 저장 연결</h4>
            <CopyAppsScriptButton />
            <label className="block font-bold text-slate-700" htmlFor="input-sheet-webhook-url">
              저장용 웹앱 URL
            </label>
            <input
              id="input-sheet-webhook-url"
              type="url"
              value={config.webhookUrl || ''}
              onChange={(e) => onUpdateConfig({ webhookUrl: e.target.value })}
              placeholder="https://script.google.com/macros/s/…/exec"
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-slate-800 font-medium font-mono outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </section>
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
        ) : (
          <div className="p-4 border-t border-slate-100 flex items-center justify-end bg-slate-50">
            <button
              type="button"
              onClick={handleClose}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold shadow-md shadow-blue-600/20"
            >
              확인
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
