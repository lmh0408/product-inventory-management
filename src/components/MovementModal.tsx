import React, { useEffect, useState } from 'react';
import { LocationId, MovementType, ProductId, StockMovement } from '../types';
import { LOCATIONS, PRODUCTS } from '../data/initialData';
import {
  X,
  ArrowLeftRight,
  ArrowDownRight,
  ArrowUpRight,
  Plus,
  Trash2,
  Building,
  Settings2,
} from 'lucide-react';
import { CopyAppsScriptButton } from './CopyAppsScriptButton';
import { isAppsScriptWebhook } from '../utils/googleSheetWrite';

interface MovementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveMovement: (movement: Omit<StockMovement, 'id' | 'sheetSynced'>) => Promise<boolean> | void;
  initialMovement?: StockMovement | null;
  onUpdateMovement?: (
    sourceMovementIds: string[],
    movement: Omit<StockMovement, 'id' | 'sheetSynced'>
  ) => Promise<boolean>;
  sheetWebhookUrl?: string;
  onUpdateSheetWebhook?: (url: string) => void;
}

interface ItemRow {
  productId: ProductId;
  quantity: string;
}

export const MovementModal: React.FC<MovementModalProps> = ({
  isOpen,
  onClose,
  onSaveMovement,
  initialMovement = null,
  onUpdateMovement,
  sheetWebhookUrl = '',
  onUpdateSheetWebhook,
}) => {
  const [movementType, setMovementType] = useState<MovementType>('TRANSFER');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState<string>(
    new Date().toTimeString().split(' ')[0].substring(0, 5)
  );

  // Locations
  const [fromLocation, setFromLocation] = useState<LocationId>('seil');
  const [toLocation, setToLocation] = useState<LocationId>('lucciem');
  const [singleLocation, setSingleLocation] = useState<LocationId>('lucciem');

  // Items
  const [items, setItems] = useState<ItemRow[]>([
    { productId: 'smart_top', quantity: '10' },
  ]);

  const [description, setDescription] = useState<string>('');
  const [partnerOrRecipient, setPartnerOrRecipient] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [webhookDraft, setWebhookDraft] = useState(sheetWebhookUrl);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setWebhookDraft(sheetWebhookUrl);
      setSaveError(null);
      if (initialMovement) {
        setMovementType(initialMovement.type);
        setDate(initialMovement.date);
        setTime(initialMovement.time || new Date().toTimeString().slice(0, 5));
        setFromLocation(initialMovement.fromLocation || 'seil');
        setToLocation(initialMovement.toLocation || 'lucciem');
        setSingleLocation(
          initialMovement.locationId ||
            initialMovement.toLocation ||
            initialMovement.fromLocation ||
            'lucciem'
        );
        setItems(
          initialMovement.items.map((item) => ({
            productId: item.productId,
            quantity: String(
              typeof item.signedQuantity === 'number'
                ? item.signedQuantity
                : item.quantity
            ),
          }))
        );
        setDescription(initialMovement.description || '');
        setPartnerOrRecipient(initialMovement.partnerOrRecipient || '');
      } else {
        setMovementType('TRANSFER');
        setDate(new Date().toISOString().split('T')[0]);
        setTime(new Date().toTimeString().slice(0, 5));
        setFromLocation('seil');
        setToLocation('lucciem');
        setSingleLocation('lucciem');
        setItems([{ productId: 'smart_top', quantity: '10' }]);
        setDescription('');
        setPartnerOrRecipient('');
      }
    }
  }, [initialMovement, isOpen, sheetWebhookUrl]);

  if (!isOpen) return null;

  const handleAddItem = () => {
    setItems([...items, { productId: 'smart_bottom', quantity: '5' }]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) {
      // 1개만 있을 때는 수량 초기화 또는 첫 품목으로 리셋
      setItems([{ productId: PRODUCTS[0].id, quantity: '1' }]);
      return;
    }
    setItems(items.filter((_, idx) => idx !== index));
  };

  const handleItemChange = (index: number, field: keyof ItemRow, value: any) => {
    const next = [...items];
    next[index] = { ...next[index], [field]: value };
    setItems(next);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const isAdjustment = movementType === 'ADJUSTMENT' || /보정/.test(description);
    const parsedItems = items.map((item) => {
      const enteredQuantity = Number.parseInt(item.quantity, 10);
      return {
        productId: item.productId,
        quantity: Math.abs(enteredQuantity),
        ...(isAdjustment ? { signedQuantity: enteredQuantity } : {}),
      };
    });
    if (
      parsedItems.length === 0 ||
      parsedItems.some(
        (item) =>
          !Number.isFinite(item.quantity) ||
          (isAdjustment ? item.quantity === 0 : item.quantity <= 0)
      )
    ) {
      alert('품목과 1개 이상의 수량을 입력해주세요.');
      return;
    }

    if (movementType === 'TRANSFER' && fromLocation === toLocation) {
      alert('출발 거점과 도착 거점은 서로 달라야 합니다.');
      return;
    }

    let defaultDesc = description;
    if (!defaultDesc) {
      if (movementType === 'TRANSFER') {
        const fromName = LOCATIONS.find((l) => l.id === fromLocation)?.shortName;
        const toName = LOCATIONS.find((l) => l.id === toLocation)?.shortName;
        defaultDesc = `${fromName} -> ${toName} 재고 이동`;
      } else if (movementType === 'IN') {
        const locName = LOCATIONS.find((l) => l.id === singleLocation)?.shortName;
        defaultDesc = `${locName} 입고`;
      } else if (movementType === 'ADJUSTMENT') {
        const locName = LOCATIONS.find((l) => l.id === singleLocation)?.shortName;
        defaultDesc = `${locName} 재고 보정`;
      } else {
        const locName = LOCATIONS.find((l) => l.id === singleLocation)?.shortName;
        defaultDesc = `${locName} 출고`;
      }
    }

    setIsSaving(true);
    setSaveError(null);
    try {
      const webhook = webhookDraft.trim();
      if (!isAppsScriptWebhook(webhook)) {
        setSaveError(
          '시트에도 저장하려면 아래 웹앱 URL을 붙여넣으세요. 시트 소유 계정이 다르면 시트 안 Apps Script가 아니라 script.google.com 새 프로젝트에 코드를 붙여넣고 웹 앱으로 배포하세요.'
        );
        return;
      }
      onUpdateSheetWebhook?.(webhook);

      const movementData: Omit<StockMovement, 'id' | 'sheetSynced'> = {
        date,
        time: initialMovement ? initialMovement.time : time,
        type: movementType,
        fromLocation: movementType === 'TRANSFER' ? fromLocation : undefined,
        toLocation: movementType === 'TRANSFER' ? toLocation : undefined,
        locationId: movementType !== 'TRANSFER' ? singleLocation : undefined,
        items: parsedItems,
        description: defaultDesc,
        partnerOrRecipient:
          movementType === 'OUT'
            ? partnerOrRecipient
            : initialMovement?.partnerOrRecipient || '',
        registeredBy: initialMovement?.registeredBy,
      };
      const sourceMovementIds = initialMovement?.sourceMovementIds || [];
      const ok =
        initialMovement && sourceMovementIds.length > 0 && onUpdateMovement
          ? await onUpdateMovement(sourceMovementIds, movementData)
          : await onSaveMovement(movementData);
      if (ok === false) {
        setSaveError('시트 저장에 실패했습니다. 앱 재고는 바꾸지 않았습니다.');
        return;
      }
      onClose();
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : '저장에 실패했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      id="movement-modal-backdrop"
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200"
    >
      <div
        id="movement-modal-card"
        className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-blue-600 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-xs">
              <ArrowLeftRight className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-base font-extrabold flex items-center gap-2">
                {initialMovement ? '재고 이동 및 입출고 수정' : '재고 이동 및 입출고 등록'}
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-blue-100 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body / Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1 text-xs">
          {/* Movement Type Tabs */}
          <div>
            <label className="block font-bold text-slate-700 mb-2">변동 유형 선택</label>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <button
                type="button"
                onClick={() => setMovementType('TRANSFER')}
                className={`py-3.5 px-3 rounded-2xl border flex flex-col items-center gap-1.5 font-bold transition-all ${
                  movementType === 'TRANSFER'
                    ? 'bg-blue-50 border-blue-500 text-blue-700 ring-2 ring-blue-500/20'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <ArrowLeftRight className="w-4 h-4 text-blue-600" />
                <span className="text-sm">거점 간 이동</span>
                <span className="text-[10px] font-normal text-slate-400">
                  출발지(-) 및 도착지(+) 동시 반영
                </span>
              </button>

              <button
                type="button"
                onClick={() => setMovementType('IN')}
                className={`py-3.5 px-3 rounded-2xl border flex flex-col items-center gap-1.5 font-bold transition-all ${
                  movementType === 'IN'
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-700 ring-2 ring-emerald-500/20'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <ArrowDownRight className="w-4 h-4 text-emerald-600" />
                <span className="text-sm">단일 입고</span>
                <span className="text-[10px] font-normal text-slate-400">제작/보정 입고</span>
              </button>

              <button
                type="button"
                onClick={() => setMovementType('OUT')}
                className={`py-3.5 px-3 rounded-2xl border flex flex-col items-center gap-1.5 font-bold transition-all ${
                  movementType === 'OUT'
                    ? 'bg-rose-50 border-rose-500 text-rose-700 ring-2 ring-rose-500/20'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <ArrowUpRight className="w-4 h-4 text-rose-600" />
                <span className="text-sm">납품 출고</span>
                <span className="text-[10px] font-normal text-slate-400">고객사 납품/판매 출고</span>
              </button>

              <button
                type="button"
                onClick={() => setMovementType('ADJUSTMENT')}
                className={`py-3.5 px-3 rounded-2xl border flex flex-col items-center gap-1.5 font-bold transition-all ${
                  movementType === 'ADJUSTMENT'
                    ? 'bg-amber-50 border-amber-500 text-amber-700 ring-2 ring-amber-500/20'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Settings2 className="w-4 h-4 text-amber-600" />
                <span className="text-sm">재고 보정</span>
                <span className="text-[10px] font-normal text-slate-400">품목별 +/- 직접 입력</span>
              </button>
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">변동 일자</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-bold outline-none focus:border-blue-500"
              required
            />
          </div>

          {/* Location Selector */}
          {movementType === 'TRANSFER' ? (
            <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100 space-y-3">
              <div className="flex items-center gap-2 text-blue-900 font-extrabold text-xs">
                <Building className="w-4 h-4 text-blue-600" />
                <span>거점 간 이동 경로 설정</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-600 mb-1">출발 거점 (출고 -)</label>
                  <select
                    value={fromLocation}
                    onChange={(e) => setFromLocation(e.target.value as LocationId)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-bold outline-none"
                  >
                    {LOCATIONS.map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-600 mb-1">도착 거점 (입고 +)</label>
                  <select
                    value={toLocation}
                    onChange={(e) => setToLocation(e.target.value as LocationId)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-bold outline-none"
                  >
                    {LOCATIONS.map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {movementType === 'IN'
                    ? '입고 대상 거점'
                    : movementType === 'ADJUSTMENT'
                      ? '보정 대상 거점'
                      : '출고 대상 거점'}
                </label>
                <select
                  value={singleLocation}
                  onChange={(e) => setSingleLocation(e.target.value as LocationId)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-bold outline-none"
                >
                  {LOCATIONS.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name}
                    </option>
                  ))}
                </select>
              </div>
              {movementType === 'OUT' && (
                <div className="p-3.5 bg-rose-50/50 rounded-2xl border border-rose-100 space-y-1 animate-in fade-in duration-150">
                  <label className="block font-bold text-slate-700 mb-1">
                    납품처 <span className="text-slate-400 font-normal">(고객사 / 수신처)</span>
                  </label>
                  <input
                    type="text"
                    value={partnerOrRecipient}
                    onChange={(e) => setPartnerOrRecipient(e.target.value)}
                    placeholder="예: 삼성전자(평택), 영덕군청, 여수엑스포, 청양산림항공관리소"
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-800 outline-none focus:border-rose-500"
                  />
                </div>
              )}
            </div>
          )}

          {/* Items List */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="font-bold text-slate-700">이동 품목 및 수량</label>
              <button
                type="button"
                onClick={handleAddItem}
                className="text-blue-600 hover:text-blue-800 font-extrabold flex items-center gap-1 text-xs px-2.5 py-1 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> 품목 추가
              </button>
            </div>

            <div className="space-y-2.5">
              {items.map((item, idx) => {
                return (
                  <div
                    key={idx}
                    className="flex items-center gap-2.5 bg-slate-50 p-3 rounded-2xl border border-slate-100 flex-wrap sm:flex-nowrap"
                  >
                    <div className="flex-1 min-w-[200px]">
                      <select
                        value={item.productId}
                        onChange={(e) => handleItemChange(idx, 'productId', e.target.value as ProductId)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-bold outline-none"
                      >
                        {PRODUCTS.map((prod) => (
                          <option key={prod.id} value={prod.id}>
                            {prod.name} ({prod.category})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="w-28 flex items-center gap-1 shrink-0">
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="-?[0-9]*"
                        autoComplete="off"
                        value={item.quantity}
                        onChange={(e) =>
                          handleItemChange(
                            idx,
                            'quantity',
                            e.target.value
                              .replace(/[^\d-]/g, '')
                              .replace(/(?!^)-/g, '')
                          )
                        }
                        className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-2 text-xs text-center font-mono font-bold text-slate-900 outline-none select-text"
                        required
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveItem(idx)}
                      title="품목 삭제"
                      className="p-2 text-slate-400 hover:text-rose-600 rounded-xl hover:bg-rose-50 transition-colors shrink-0 flex items-center justify-center"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">
              내역
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="예: 세일정밀 스마트 상단 10, 하단 10 입고 이동 / 정기 재고 보정"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 outline-none focus:border-blue-500"
            />
          </div>

          {/* Modal Footer */}
          <div className="pt-4 border-t border-slate-100 space-y-3">
            {(!isAppsScriptWebhook(webhookDraft.trim()) || saveError) && (
              <div className="p-3.5 rounded-2xl border border-amber-200 bg-amber-50 space-y-2">
                <p className="text-[11px] font-bold text-amber-900">시트에도 함께 저장</p>
                {saveError && <p className="text-[11px] text-rose-700 leading-relaxed">{saveError}</p>}
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  1) Apps Script 코드 복사 → 소유 계정이 같으면 시트 확장 프로그램, 다르면 script.google.com 새 프로젝트에 붙여넣기
                  2) 배포 → 웹 앱 (실행: 나, 액세스: 모든 사용자)
                  3) 나온 URL을 아래에 붙여넣고 저장
                </p>
                <CopyAppsScriptButton />
                <input
                  type="url"
                  value={webhookDraft}
                  onChange={(e) => setWebhookDraft(e.target.value)}
                  placeholder="https://script.google.com/macros/s/…/exec"
                  className="w-full bg-white border border-amber-200 rounded-xl px-3 py-2 text-slate-800 font-mono text-[11px] outline-none focus:border-blue-500"
                />
              </div>
            )}
            <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-2xl font-bold"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 active:scale-95 text-white rounded-2xl font-extrabold transition-all shadow-md shadow-blue-600/20 flex items-center gap-1.5"
            >
              <span>{isSaving ? '저장 중...' : initialMovement ? '수정 저장' : '저장'}</span>
            </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
