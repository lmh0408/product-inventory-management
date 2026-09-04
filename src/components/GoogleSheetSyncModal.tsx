import React, { useEffect, useState } from 'react';
import { SheetConfig } from '../types';
import { extractSheetId, toSheetUrl } from '../utils/googleSheetSync';
import { X, FileSpreadsheet, ExternalLink, AlertCircle, CheckCircle2 } from 'lucide-react';
import { CopyAppsScriptButton } from './CopyAppsScriptButton';

interface GoogleSheetSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: SheetConfig;
  onUpdateConfig: (newConfig: Partial<SheetConfig>) => void;
}

export const GoogleSheetSyncModal: React.FC<GoogleSheetSyncModalProps> = ({
  isOpen,
  onClose,
  config,
  onUpdateConfig,
}) => {
  const [draftUrl, setDraftUrl] = useState(config.sheetUrl || config.sheetId || '');

  useEffect(() => {
    if (isOpen) {
      setDraftUrl(config.sheetUrl || config.sheetId || '');
    }
  }, [isOpen, config.sheetUrl, config.sheetId]);

  if (!isOpen) return null;

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
        className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-blue-600 text-white">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-extrabold">시트 설정</h3>
              <p className="text-xs text-blue-100 mt-0.5">연결할 시트와 저장용 웹앱만 등록합니다.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-blue-100 hover:text-white hover:bg-white/10 transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

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
                  시트 URL을 붙여넣고, 공유를 링크가 있는 모든 사용자(뷰어)로 열어 주세요. 다시 맞출 때는 데이터
                  관리의 불러오기를 사용합니다.
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
              {canOpenSheet && (
                <a
                  href={toSheetUrl(parsedId || config.sheetId)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-800"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  시트 열기
                </a>
              )}
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
            <p className="text-[11px] text-slate-500 leading-relaxed">
              주소창 URL을 그대로 붙이면 됩니다. 앱이 이 시트를 읽고 씁니다.
            </p>
            {parsedId && (
              <p className="text-[11px] text-slate-400 font-mono break-all">시트 ID: {parsedId}</p>
            )}
          </section>

          <section className="space-y-2.5 pt-1 border-t border-slate-100">
            <h4 className="font-extrabold text-slate-900 text-sm pt-3">2. 저장 연결</h4>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              앱에서 저장이 시트에 남으려면 웹앱을 한 번 배포해야 합니다. 시트 소유 계정이 다르면 시트 안의
              [확장 프로그램 → Apps Script]는 “파일을 열 수 없습니다”가 납니다. 그때는
              script.google.com 에서 새 프로젝트를 만들고 코드를 붙여넣으세요. 배포 → 웹 앱(실행: 나,
              액세스: 모든 사용자)에서 나온 URL을 넣습니다.
            </p>
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

          <section className="space-y-2.5 pt-1 border-t border-slate-100">
            <h4 className="font-extrabold text-slate-900 text-sm pt-3">3. 자동 불러오기</h4>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              평소에는 꺼 두는 것이 안전합니다. 켜면 시트를 기준으로 앱을 주기적으로 덮어씁니다.
            </p>
            <label className="sr-only" htmlFor="select-auto-sync-interval">
              자동 불러오기 주기
            </label>
            <select
              id="select-auto-sync-interval"
              value={config.autoSyncIntervalMinutes}
              onChange={(e) =>
                onUpdateConfig({ autoSyncIntervalMinutes: Number(e.target.value) })
              }
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-2.5 text-slate-800 font-bold outline-none focus:border-blue-500"
            >
              <option value={0}>사용 안 함 (권장)</option>
              <option value={1}>1분마다</option>
              <option value={5}>5분마다</option>
              <option value={15}>15분마다</option>
            </select>
          </section>
        </div>

        <div className="p-4 border-t border-slate-100 flex items-center justify-end bg-slate-50">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold shadow-md shadow-blue-600/20"
          >
            확인
          </button>
        </div>
      </div>
    </div>
  );
};
