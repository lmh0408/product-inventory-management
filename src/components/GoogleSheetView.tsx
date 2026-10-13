import React, { useState } from 'react';
import { LocationStock, StockMovement, SheetConfig } from '../types';
import { LOCATIONS, PRODUCTS } from '../data/initialData';
import { exportGoogleSpreadsheetXLSX } from '../utils/stockUtils';
import {
  FileSpreadsheet,
  FolderDown,
  Download,
  CheckCircle2,
  Table,
  Trash2,
  AlertTriangle,
  Save,
  ExternalLink,
  X,
  PlusCircle,
} from 'lucide-react';
import { CopyAppsScriptButton } from './CopyAppsScriptButton';
import { isAppsScriptWebhook } from '../utils/googleSheetWrite';

interface GoogleSheetViewProps {
  stocks: LocationStock[];
  movements: StockMovement[];
  sheetConfig: SheetConfig;
  onTriggerSync: () => Promise<boolean> | void;
  onExportCSV?: () => void;
  onImportCSV?: (file: File) => void;
  onPersistToSheet: () => Promise<boolean> | void;
  onUpdateWebhook: (url: string) => void;
  onOpenMovementModal: () => void;
  onDeleteMovements: (
    movementIds: string[]
  ) => Promise<{ ok: boolean; error?: string }>;
  onEditMovement?: (movement: StockMovement) => void;
}

export const GoogleSheetView: React.FC<GoogleSheetViewProps> = ({
  stocks,
  movements,
  sheetConfig,
  onTriggerSync,
  onExportCSV,
  onImportCSV,
  onPersistToSheet,
  onUpdateWebhook,
  onOpenMovementModal,
  onDeleteMovements,
  onEditMovement,
}) => {
  const [activeTabName, setActiveTabName] = useState<string>('보관함 Dashboard');
  const [selectedMovementIds, setSelectedMovementIds] = useState<string[]>([]);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [showToast, setShowToast] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleTabChange = (tabName: string) => {
    setActiveTabName(tabName);
    setSelectedMovementIds([]);
  };

  const handleDownloadGoogleSheet = () => {
    exportGoogleSpreadsheetXLSX(stocks, movements);
  };

  const selectedLoc = LOCATIONS.find(
    (l) => l.name.includes(activeTabName) || l.shortName.includes(activeTabName)
  );

  const locMovements = movements
    .filter((m) => {
      if (!selectedLoc) return true;
      return (
        m.locationId === selectedLoc.id ||
        m.fromLocation === selectedLoc.id ||
        m.toLocation === selectedLoc.id
      );
    })
    .sort((a, b) =>
      `${b.date} ${b.time || ''} ${b.id}`.localeCompare(
        `${a.date} ${a.time || ''} ${a.id}`
      )
    );

  const handleToggleSelectAll = () => {
    if (selectedMovementIds.length === locMovements.length && locMovements.length > 0) {
      setSelectedMovementIds([]);
    } else {
      setSelectedMovementIds(locMovements.map((m) => m.id));
    }
  };

  const handleToggleSelectRow = (id: string) => {
    setSelectedMovementIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleConfirmDelete = async () => {
    if (selectedMovementIds.length === 0) return;
    const count = selectedMovementIds.length;
    setDeleteError(null);
    setIsDeleting(true);
    try {
      const result = await onDeleteMovements(selectedMovementIds);
      if (result.ok) {
        setSelectedMovementIds([]);
        setIsDeleteModalOpen(false);
        setShowToast(`${count}건의 내역을 시트에서 삭제했습니다.`);
        setTimeout(() => setShowToast(null), 3000);
      } else {
        setDeleteError(result.error || '시트에서 내역을 삭제하지 못했습니다.');
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const isAllSelected =
    locMovements.length > 0 && selectedMovementIds.length === locMovements.length;

  return (
    <div id="google-sheet-view-container" className="px-8 pb-8 space-y-6 flex-1 overflow-y-auto relative">
      {/* Toast Notification */}
      {showToast && (
        <div className="fixed top-20 right-8 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2.5 text-xs font-bold animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{showToast}</span>
        </div>
      )}

      {/* Top Controls Header */}
      <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-bold text-lg shadow-md shadow-emerald-600/20">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-extrabold text-slate-900 text-base">
                데이터 관리
              </h2>
            {sheetConfig.lastSavedAt ? (
              <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 text-[11px] font-bold rounded-full border border-emerald-200 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> 저장됨
              </span>
            ) : sheetConfig.isConnected ? (
              <span className="px-2.5 py-0.5 bg-slate-50 text-slate-600 text-[11px] font-bold rounded-full border border-slate-200">
                연결됨 · 아직 저장 없음
              </span>
            ) : (
              <span className="px-2.5 py-0.5 bg-amber-50 text-amber-700 text-[11px] font-bold rounded-full border border-amber-200 flex items-center gap-1">
                시트 미연결
              </span>
            )}
            </div>
            {sheetConfig.lastSavedAt && (
              <p className="text-xs text-slate-500 mt-0.5">
                마지막 저장 {sheetConfig.lastSavedAt}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            id="btn-data-management-movement"
            type="button"
            onClick={onOpenMovementModal}
            className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 border border-blue-600 rounded-2xl transition-colors shadow-xs"
          >
            <PlusCircle className="w-4 h-4" />
            <span>재고 이동 / 입출고 등록</span>
          </button>
          <button
            id="btn-download-google-sheet"
            type="button"
            onClick={handleDownloadGoogleSheet}
            className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/80 rounded-2xl transition-colors shadow-xs"
          >
            <Download className="w-4 h-4 text-emerald-600" />
            <span>구글 시트 다운로드</span>
          </button>

          <div
            className="flex items-center rounded-2xl border border-slate-200 bg-slate-50 p-0.5"
            role="group"
            aria-label="저장과 불러오기"
          >
            <button
              type="button"
              disabled={isSaving}
              onClick={async () => {
                setIsSaving(true);
                try {
                  const ok = await onPersistToSheet();
                  if (ok) {
                    setShowToast('앱의 입출고 내역을 4개 원장 시트에 반영했습니다.');
                    setTimeout(() => setShowToast(null), 3000);
                  }
                } finally {
                  setIsSaving(false);
                }
              }}
              className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-xl"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? '저장 중...' : '저장'}</span>
            </button>
            <button
              type="button"
              onClick={async () => {
                const ok = await onTriggerSync();
                if (ok) {
                  setShowToast('시트에서 최신 재고를 불러왔습니다.');
                  setTimeout(() => setShowToast(null), 3000);
                }
              }}
              disabled={sheetConfig.isSyncing}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold rounded-xl transition-all ${
                sheetConfig.isSyncing
                  ? 'text-blue-700 cursor-not-allowed'
                  : 'text-slate-600 hover:bg-white hover:text-blue-700'
              }`}
            >
              <FolderDown className="w-4 h-4" />
              <span>{sheetConfig.isSyncing ? '불러오는 중...' : '불러오기'}</span>
            </button>
          </div>
        </div>
      </div>

      {(sheetConfig.lastError || !isAppsScriptWebhook(sheetConfig.webhookUrl || '')) && (
        <div className="bg-rose-50 border border-rose-200 rounded-3xl p-5 space-y-3">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="text-xs font-extrabold text-rose-900">
                {isAppsScriptWebhook(sheetConfig.webhookUrl || '')
                  ? '최근 시트 저장에 실패했습니다'
                  : '시트 저장 연결이 필요합니다'}
              </p>
              <p className="text-xs text-rose-800 mt-1 leading-relaxed">
                {sheetConfig.lastError ||
                  '저장용 웹앱 URL이 없거나 /exec 주소가 아닙니다. 배포 화면의 웹 앱 URL을 그대로 붙여넣으세요.'}
              </p>
            </div>
          </div>
          {!isAppsScriptWebhook(sheetConfig.webhookUrl || '') && (
            <>
              <ol className="text-[11px] text-rose-900/90 leading-relaxed list-decimal pl-5 space-y-1">
                <li>코드를 복사한 뒤, 시트 소유 계정과 같으면 시트 → 확장 프로그램 → Apps Script에 붙여넣습니다.</li>
                <li>
                  소유 계정이 다르면 시트 메뉴가 아니라 script.google.com 에서 새 프로젝트를 만들어 붙여넣습니다.
                </li>
                <li>배포 → 새 배포 → 웹 앱 / 실행: 나 / 액세스: 모든 사용자.</li>
                <li>나온 URL(/exec로 끝남)을 아래에 넣고, 그 URL을 브라우저에서 한 번 열어 권한을 허용합니다.</li>
                <li>다시 저장을 누릅니다.</li>
              </ol>
              <CopyAppsScriptButton />
            </>
          )}
          {isAppsScriptWebhook(sheetConfig.webhookUrl || '') && (
            <div className="flex items-center gap-3 flex-wrap">
              <a
                href={sheetConfig.webhookUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 hover:text-blue-900"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                웹앱 열어 권한 허용
              </a>
              <CopyAppsScriptButton />
            </div>
          )}
          <input
            type="url"
            value={sheetConfig.webhookUrl || ''}
            onChange={(e) => onUpdateWebhook(e.target.value)}
            placeholder="https://script.google.com/macros/s/…/exec"
            className="w-full bg-white border border-rose-200 rounded-2xl px-4 py-2.5 text-slate-800 font-mono text-xs outline-none focus:border-rose-500"
          />
        </div>
      )}

      {/* Spreadsheet Tabs Selector matching Google Sheets style */}
      <div className="bg-slate-200/80 p-1.5 rounded-2xl flex items-center gap-1 overflow-x-auto text-xs">
        {[
          '보관함 Dashboard',
          '루씨엠',
          '세일정밀공업',
          '아이진',
          'ETC',
        ].map((tab) => (
          <button
            key={tab}
            onClick={() => handleTabChange(tab)}
            className={`px-4 py-2 rounded-xl font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTabName === tab
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-slate-600 hover:bg-slate-300/60'
            }`}
          >
            <Table className="w-3.5 h-3.5" />
            <span>{tab}</span>
          </button>
        ))}
      </div>

      {/* Sheet Content View */}
      {activeTabName === '보관함 Dashboard' ? (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-slate-900 text-sm">
              [보관함 Dashboard] 탭 - 전체 거점 통합 실시간 현황표
            </h3>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-100">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white">
                  <th className="p-3.5 whitespace-nowrap">장소</th>
                  <th className="p-3.5 text-center whitespace-nowrap">Smart 상단</th>
                  <th className="p-3.5 text-center whitespace-nowrap">Smart 하단</th>
                  <th className="p-3.5 text-center whitespace-nowrap">Smart 상단(영문)</th>
                  <th className="p-3.5 text-center whitespace-nowrap">일반 상단</th>
                  <th className="p-3.5 text-center whitespace-nowrap">일반 하단</th>
                  <th className="p-3.5 text-center whitespace-nowrap">일반 상단(삼성)</th>
                  <th className="p-3.5 text-center whitespace-nowrap">일반 하단(삼성)</th>
                  <th className="p-3.5 text-center whitespace-nowrap">옥외</th>
                  <th className="p-3.5 text-center whitespace-nowrap">이동</th>
                  <th className="p-3.5 text-center whitespace-nowrap">지게가방</th>
                  <th className="p-3.5 text-center whitespace-nowrap">세미아웃도어</th>
                  <th className="p-3.5 text-center whitespace-nowrap">단말기보드</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {stocks.map((s) => {
                  const loc = LOCATIONS.find((l) => l.id === s.locationId);
                  return (
                    <tr key={s.locationId} className="hover:bg-slate-50/80">
                      <td className="p-3.5 font-bold text-slate-900 whitespace-nowrap">{loc?.name}</td>
                      <td className="p-3.5 text-center font-mono font-bold">{s.quantities.smart_top}</td>
                      <td className="p-3.5 text-center font-mono font-bold">{s.quantities.smart_bottom}</td>
                      <td className="p-3.5 text-center font-mono font-bold">{s.quantities.smart_top_eng}</td>
                      <td className="p-3.5 text-center font-mono font-bold">{s.quantities.std_top}</td>
                      <td className="p-3.5 text-center font-mono font-bold">{s.quantities.std_bottom}</td>
                      <td className="p-3.5 text-center font-mono font-bold">{s.quantities.std_top_samsung}</td>
                      <td className="p-3.5 text-center font-mono font-bold">{s.quantities.std_bottom_samsung}</td>
                      <td className="p-3.5 text-center font-mono font-bold">{s.quantities.outdoor}</td>
                      <td className="p-3.5 text-center font-mono font-bold">{s.quantities.mobile}</td>
                      <td className="p-3.5 text-center font-mono font-bold">{s.quantities.forklift_bag}</td>
                      <td className="p-3.5 text-center font-mono font-bold">{s.quantities.semi_outdoor}</td>
                      <td className="p-3.5 text-center font-mono font-bold">{s.quantities.terminal_board}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm">
                [{activeTabName}] 탭 원장 - 입/출고 및 재고 이동 트랜잭션 기록
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                구글 시트의 해당 거점 시트와 자동 연동된 입출고 이력입니다.
              </p>
            </div>

            {/* 내역 삭제 button (enabled only when checked) */}
            <button
              id={`btn-delete-${activeTabName}-movements`}
              onClick={() => {
                setDeleteError(null);
                setIsDeleteModalOpen(true);
              }}
              disabled={selectedMovementIds.length === 0}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all ${
                selectedMovementIds.length > 0
                  ? 'bg-rose-600 hover:bg-rose-700 active:scale-95 text-white shadow-md shadow-rose-600/20 cursor-pointer'
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
              }`}
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>
                내역 삭제
                {selectedMovementIds.length > 0 ? ` (${selectedMovementIds.length}건)` : ''}
              </span>
            </button>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-100">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  {/* Leftmost Checkbox Column */}
                  <th className="p-3.5 w-12 text-center">
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      onChange={handleToggleSelectAll}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
                      title="전체 선택 / 해제"
                    />
                  </th>
                  <th className="p-3.5 whitespace-nowrap min-w-[90px]">일자</th>
                  <th className="p-3.5 whitespace-nowrap min-w-[80px]">구분</th>
                  <th className="p-3.5 whitespace-nowrap min-w-[180px]">품목 및 수량</th>
                  <th className="p-3.5 min-w-[160px]">내역</th>
                  <th className="p-3.5 whitespace-nowrap min-w-[100px]">납품처</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {locMovements.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-10 text-center text-slate-400 font-medium">
                      해당 거점의 기록된 내역이 없습니다.
                    </td>
                  </tr>
                ) : (
                  locMovements.map((m) => {
                    const isSelected = selectedMovementIds.includes(m.id);
                    return (
                      <tr
                        key={m.id}
                        tabIndex={0}
                        onClick={() => onEditMovement?.(m)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            onEditMovement?.(m);
                          }
                        }}
                        className={`transition-colors ${
                          isSelected ? 'bg-blue-50/60' : 'hover:bg-blue-50/70'
                        } cursor-pointer focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500`}
                        title="클릭하여 내역 수정"
                      >
                        {/* Checkbox */}
                        <td className="p-3.5 w-12 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onClick={(event) => event.stopPropagation()}
                            onChange={() => handleToggleSelectRow(m.id)}
                            className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
                          />
                        </td>

                        {/* Date */}
                        <td className="p-3.5 font-mono font-bold text-slate-800 whitespace-nowrap">
                          {m.date}
                        </td>

                        {/* Type Badge - Always single line */}
                        <td className="p-3.5 whitespace-nowrap">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-bold inline-flex items-center justify-center whitespace-nowrap ${
                              m.type === 'IN'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : m.type === 'OUT'
                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                : m.type === 'ADJUSTMENT'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-blue-50 text-blue-700 border border-blue-200'
                            }`}
                          >
                            {m.type === 'IN'
                              ? '입고'
                              : m.type === 'OUT'
                                ? '출고'
                                : m.type === 'ADJUSTMENT'
                                  ? '보정'
                                  : '이동'}
                          </span>
                        </td>

                        {/* Product & Qty */}
                        <td className="p-3.5 font-bold text-slate-800">
                          {m.items
                            .map((i) => {
                              const prodName =
                                PRODUCTS.find((p) => p.id === i.productId)?.name || i.productId;
                              if (typeof i.signedQuantity === 'number') {
                                const signed =
                                  i.signedQuantity > 0
                                    ? `+${i.signedQuantity}`
                                    : String(i.signedQuantity);
                                return `${prodName} (${signed})`;
                              }
                              const sign =
                                m.type === 'TRANSFER'
                                  ? selectedLoc?.id === m.fromLocation
                                    ? '-'
                                    : selectedLoc?.id === m.toLocation
                                      ? '+'
                                      : ''
                                  : m.type === 'OUT'
                                    ? '-'
                                    : '+';
                              return `${prodName} (${sign}${i.quantity})`;
                            })
                            .join(', ')}
                        </td>

                        {/* Description */}
                        <td className="p-3.5 text-slate-700 font-medium">{m.description}</td>

                        {/* Partner */}
                        <td className="p-3.5 text-slate-500 whitespace-nowrap">
                          {m.partnerOrRecipient || '-'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* In-App Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <div
          id="delete-confirm-modal-backdrop"
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150"
        >
          <div
            id="delete-confirm-modal-card"
            className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-md overflow-hidden p-6 space-y-5"
          >
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-1.5">
              <h3 className="text-base font-extrabold text-slate-900">
                선택한 내역을 삭제하시겠습니까?
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                현재 선택된 <span className="font-bold text-rose-600">{selectedMovementIds.length}건</span>의 입출고 및 이동 트랜잭션 기록이 영구적으로 삭제됩니다.
              </p>
            </div>

            {deleteError && (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-xs font-medium leading-relaxed text-rose-800">
                {deleteError}
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-5 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-2xl transition-colors"
              >
                취소
              </button>
              <button
                id="btn-confirm-delete-action"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-5 py-2.5 text-xs font-bold bg-rose-600 hover:bg-rose-700 disabled:bg-rose-300 active:scale-95 text-white rounded-2xl transition-all shadow-md shadow-rose-600/20"
              >
                {isDeleting ? '시트에서 삭제 중...' : '삭제 확정'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
