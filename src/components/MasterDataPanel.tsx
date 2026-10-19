import React, { useState } from 'react';
import { Box, Check, MapPin, Pencil, Plus, Tags, Trash2, Truck, X } from 'lucide-react';
import { MasterData } from '../types';
import {
  MASTER_CATEGORY_MAX_COUNT,
  MASTER_LOCATION_MAX_COUNT,
  MASTER_PRODUCT_MAX_COUNT,
  MASTER_SUPPLIER_MAX_COUNT,
  MASTER_TEXT_MAX_LENGTH,
  MASTER_UNIT_COST_MAX,
  createLocationSheetName,
  createMasterId,
} from '../data/masterData';

type MasterSection = 'products' | 'locations' | 'categories' | 'suppliers';

interface MasterDataPanelProps {
  value: MasterData;
  onChange: (next: MasterData) => void;
  disabled?: boolean;
}

type DraftFields = Record<string, string>;

interface FieldSpec {
  key: string;
  label: string;
  required?: boolean;
  numeric?: boolean;
}

const SECTION_FIELDS: Record<MasterSection, FieldSpec[]> = {
  products: [
    { key: 'name', label: '제품명', required: true },
    { key: 'unit', label: '단위' },
    { key: 'unitCostEstimate', label: '추정 단가(원)', numeric: true },
    { key: 'category', label: '분류', required: true },
  ],
  locations: [
    { key: 'name', label: '거점명', required: true },
    { key: 'shortName', label: '약칭', required: true },
    { key: 'description', label: '설명' },
  ],
  categories: [{ key: 'label', label: '분류명', required: true }],
  suppliers: [{ key: 'name', label: '공급사명', required: true }],
};

const inputClass =
  'w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none focus:border-slate-900 disabled:bg-slate-50';

function formatWon(value: number): string {
  return `${value.toLocaleString('ko-KR')}원`;
}

export const MasterDataPanel: React.FC<MasterDataPanelProps> = ({ value, onChange, disabled }) => {
  const [section, setSection] = useState<MasterSection>('products');
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [draft, setDraft] = useState<DraftFields>({});
  const [newSupplier, setNewSupplier] = useState('');
  const [newItem, setNewItem] = useState<DraftFields>({});
  const [error, setError] = useState<string | null>(null);

  const sections: { id: MasterSection; label: string; icon: React.ReactNode; count: number }[] = [
    { id: 'products', label: '제품 목록', icon: <Box className="w-4 h-4" />, count: value.products.length },
    { id: 'locations', label: '거점 목록', icon: <MapPin className="w-4 h-4" />, count: value.locations.length },
    { id: 'categories', label: '제품 분류', icon: <Tags className="w-4 h-4" />, count: value.categories.length },
    { id: 'suppliers', label: '공급사 목록', icon: <Truck className="w-4 h-4" />, count: value.suppliers.length },
  ];

  const rows: { key: string; title: string; detail: string; fields: DraftFields }[] =
    section === 'products'
      ? value.products.map((item) => ({
          key: item.id,
          title: item.name,
          detail: [
            value.categories.find((category) => category.id === item.category)?.label || item.category,
            item.unit && `단위 ${item.unit}`,
            `단가 ${formatWon(item.unitCostEstimate)}`,
          ]
            .filter(Boolean)
            .join(' · '),
          fields: {
            name: item.name,
            unit: item.unit,
            unitCostEstimate: String(item.unitCostEstimate),
            category: item.category,
          },
        }))
      : section === 'locations'
        ? value.locations.map((item) => ({
            key: item.id,
            title: item.name,
            detail: [`약칭 ${item.shortName}`, item.description].filter(Boolean).join(' · '),
            fields: { name: item.name, shortName: item.shortName, description: item.description },
          }))
        : section === 'categories'
          ? value.categories.map((item) => ({
              key: item.id,
              title: item.label,
              detail: item.label === item.id ? '' : `기준 분류 ${item.id}`,
              fields: { label: item.label },
            }))
          : value.suppliers.map((name, index) => ({
              key: String(index),
              title: name,
              detail: '',
              fields: { name },
            }));

  const resetEditing = () => {
    setEditingKey(null);
    setDraft({});
    setError(null);
  };

  const selectSection = (next: MasterSection) => {
    setSection(next);
    resetEditing();
    setNewSupplier('');
    setNewItem(next === 'products' ? { category: value.categories[0]?.id || '' } : {});
  };

  const validate = (fields: DraftFields): string | null => {
    for (const spec of SECTION_FIELDS[section]) {
      const text = (fields[spec.key] ?? '').trim();
      if (spec.required && !text) return `${spec.label}을(를) 입력해 주세요.`;
      if (text.length > MASTER_TEXT_MAX_LENGTH) {
        return `${spec.label}은(는) ${MASTER_TEXT_MAX_LENGTH}자 이하로 입력해 주세요.`;
      }
      if (spec.numeric) {
        const amount = Number(text.replace(/,/g, ''));
        if (!/^[\d,]+$/.test(text) || !Number.isFinite(amount) || amount > MASTER_UNIT_COST_MAX) {
          return `${spec.label}은(는) 0 이상의 숫자로 입력해 주세요.`;
        }
      }
    }
    return null;
  };

  const isDuplicateSupplier = (name: string, exceptIndex?: number) =>
    value.suppliers.some((item, index) => index !== exceptIndex && item === name);

  const handleConfirmEdit = (key: string) => {
    const message = validate(draft);
    if (message) {
      setError(message);
      return;
    }
    const text = (field: string) => (draft[field] ?? '').trim();
    const nameKey = section === 'categories' ? 'label' : 'name';
    if (section !== 'suppliers' && duplicateName(text(nameKey), key)) {
      setError('이미 같은 이름의 항목이 있습니다.');
      return;
    }
    if (section === 'products') {
      onChange({
        ...value,
        products: value.products.map((item) =>
          item.id === key
            ? {
                ...item,
                name: text('name'),
                unit: text('unit'),
                unitCostEstimate: Number(text('unitCostEstimate').replace(/,/g, '')),
                category: text('category') || item.category,
              }
            : item
        ),
      });
    } else if (section === 'locations') {
      onChange({
        ...value,
        locations: value.locations.map((item) =>
          item.id === key
            ? { ...item, name: text('name'), shortName: text('shortName'), description: text('description') }
            : item
        ),
      });
    } else if (section === 'categories') {
      onChange({
        ...value,
        categories: value.categories.map((item) =>
          item.id === key ? { ...item, label: text('label') } : item
        ),
      });
    } else {
      const index = Number(key);
      if (isDuplicateSupplier(text('name'), index)) {
        setError('이미 등록된 공급사입니다.');
        return;
      }
      onChange({
        ...value,
        suppliers: value.suppliers.map((item, i) => (i === index ? text('name') : item)),
      });
    }
    resetEditing();
  };

  const handleAddSupplier = () => {
    const name = newSupplier.trim();
    if (!name) return;
    if (name.length > MASTER_TEXT_MAX_LENGTH) {
      setError(`공급사명은 ${MASTER_TEXT_MAX_LENGTH}자 이하로 입력해 주세요.`);
      return;
    }
    if (isDuplicateSupplier(name)) {
      setError('이미 등록된 공급사입니다.');
      return;
    }
    if (value.suppliers.length >= MASTER_SUPPLIER_MAX_COUNT) {
      setError(`공급사는 최대 ${MASTER_SUPPLIER_MAX_COUNT}개까지 등록할 수 있습니다.`);
      return;
    }
    onChange({ ...value, suppliers: [...value.suppliers, name] });
    setNewSupplier('');
    setError(null);
  };

  const duplicateName = (name: string, exceptKey?: string) => {
    if (section === 'products') {
      return value.products.some((item) => item.id !== exceptKey && item.name === name);
    }
    if (section === 'locations') {
      return value.locations.some((item) => item.id !== exceptKey && (item.name === name || item.shortName === name));
    }
    if (section === 'categories') {
      return value.categories.some((item) => item.id !== exceptKey && item.label === name);
    }
    return false;
  };

  const handleAddItem = () => {
    const fields = {
      ...newItem,
      category: newItem.category || value.categories[0]?.id || '',
      unitCostEstimate: newItem.unitCostEstimate || '0',
    };
    const message = validate(fields);
    if (message) {
      setError(message);
      return;
    }
    const text = (field: string) => (fields[field] ?? '').trim();
    if (section === 'products') {
      if (value.products.length >= MASTER_PRODUCT_MAX_COUNT) {
        setError(`제품은 최대 ${MASTER_PRODUCT_MAX_COUNT}개까지 등록할 수 있습니다.`);
        return;
      }
      if (duplicateName(text('name'))) {
        setError('이미 같은 이름의 제품이 있습니다.');
        return;
      }
      onChange({
        ...value,
        products: [
          ...value.products,
          {
            id: createMasterId('p', value.products.map((item) => item.id)),
            name: text('name'),
            unit: text('unit'),
            unitCostEstimate: Number(text('unitCostEstimate').replace(/,/g, '') || 0),
            category: text('category'),
          },
        ],
      });
    } else if (section === 'locations') {
      if (value.locations.length >= MASTER_LOCATION_MAX_COUNT) {
        setError(`거점은 최대 ${MASTER_LOCATION_MAX_COUNT}개까지 등록할 수 있습니다.`);
        return;
      }
      if (duplicateName(text('name')) || value.locations.some((item) => item.shortName === text('shortName'))) {
        setError('이미 같은 이름 또는 약칭의 거점이 있습니다.');
        return;
      }
      const id = createMasterId('l', value.locations.map((item) => item.id));
      onChange({
        ...value,
        locations: [
          ...value.locations,
          {
            id,
            name: text('name'),
            shortName: text('shortName'),
            description: text('description'),
            sheetName: createLocationSheetName(
              text('shortName'),
              id,
              value.locations.map((item) => item.sheetName)
            ),
          },
        ],
      });
    } else if (section === 'categories') {
      if (value.categories.length >= MASTER_CATEGORY_MAX_COUNT) {
        setError(`분류는 최대 ${MASTER_CATEGORY_MAX_COUNT}개까지 등록할 수 있습니다.`);
        return;
      }
      if (duplicateName(text('label'))) {
        setError('이미 같은 이름의 분류가 있습니다.');
        return;
      }
      onChange({
        ...value,
        categories: [
          ...value.categories,
          { id: createMasterId('c', value.categories.map((item) => item.id)), label: text('label') },
        ],
      });
    }
    setNewItem(section === 'products' ? { category: value.categories[0]?.id || '' } : {});
    setError(null);
  };

  const handleDeleteSupplier = (index: number) => {
    if (!window.confirm(`'${value.suppliers[index]}' 공급사를 목록에서 삭제할까요?`)) return;
    onChange({ ...value, suppliers: value.suppliers.filter((_, i) => i !== index) });
    resetEditing();
  };

  const handleDeleteRow = (key: string) => {
    if (section === 'products') {
      if (value.products.length <= 1) {
        setError('마지막 제품은 삭제할 수 없습니다.');
        return;
      }
      const item = value.products.find((product) => product.id === key);
      if (!item || !window.confirm(`'${item.name}' 제품을 삭제할까요?\n저장하면 원장 시트의 해당 열을 지우기 전에 백업 탭을 남깁니다.`)) {
        return;
      }
      onChange({ ...value, products: value.products.filter((product) => product.id !== key) });
    } else if (section === 'locations') {
      if (value.locations.length <= 1) {
        setError('마지막 거점은 삭제할 수 없습니다.');
        return;
      }
      const item = value.locations.find((location) => location.id === key);
      if (
        !item ||
        !window.confirm(
          `'${item.name}' 거점을 삭제할까요?\n저장하면 '${item.sheetName}' 탭을 백업 탭으로 남긴 뒤 원본 탭을 삭제합니다.`
        )
      ) {
        return;
      }
      onChange({ ...value, locations: value.locations.filter((location) => location.id !== key) });
    } else if (section === 'categories') {
      if (value.categories.length <= 1) {
        setError('마지막 분류는 삭제할 수 없습니다.');
        return;
      }
      if (value.products.some((product) => product.category === key)) {
        setError('이 분류를 사용하는 제품이 있어 삭제할 수 없습니다. 제품의 분류를 먼저 바꿔 주세요.');
        return;
      }
      const item = value.categories.find((category) => category.id === key);
      if (!item || !window.confirm(`'${item.label}' 분류를 삭제할까요?`)) return;
      onChange({ ...value, categories: value.categories.filter((category) => category.id !== key) });
    }
    resetEditing();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {sections.map((item) => {
          const isActive = section === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => selectSection(item.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl border text-xs font-bold whitespace-nowrap transition-colors ${
                isActive
                  ? 'bg-slate-900 border-slate-900 text-white'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
              <span
                className={`px-2 py-0.5 rounded-lg text-[11px] ${
                  isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                }`}
              >
                {item.count}
              </span>
            </button>
          );
        })}
      </div>

      {section === 'suppliers' ? (
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={newSupplier}
            maxLength={MASTER_TEXT_MAX_LENGTH}
            disabled={disabled}
            onChange={(e) => setNewSupplier(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                e.preventDefault();
                handleAddSupplier();
              }
            }}
            placeholder="새 공급사 이름 추가..."
            className={`${inputClass} py-2.5`}
          />
          <button
            type="button"
            onClick={handleAddSupplier}
            disabled={disabled || !newSupplier.trim()}
            className="flex items-center gap-1 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold whitespace-nowrap disabled:bg-slate-300"
          >
            <Plus className="w-4 h-4" />
            추가
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
            {SECTION_FIELDS[section].map((spec) => (
              <label key={spec.key} className="block space-y-1">
                <span className="text-[11px] font-bold text-slate-500">
                  {spec.label}
                  {spec.required && <span className="text-rose-500"> *</span>}
                </span>
                {spec.key === 'category' ? (
                  <select
                    value={newItem.category || value.categories[0]?.id || ''}
                    disabled={disabled}
                    onChange={(e) => setNewItem((prev) => ({ ...prev, category: e.target.value }))}
                    className={inputClass}
                  >
                    {value.categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    inputMode={spec.numeric ? 'numeric' : undefined}
                    maxLength={MASTER_TEXT_MAX_LENGTH}
                    disabled={disabled}
                    value={newItem[spec.key] ?? ''}
                    onChange={(e) =>
                      setNewItem((prev) => ({
                        ...prev,
                        [spec.key]: spec.numeric ? e.target.value.replace(/[^\d,]/g, '') : e.target.value,
                      }))
                    }
                    className={inputClass}
                  />
                )}
              </label>
            ))}
            <div className="flex items-end">
              <button
                type="button"
                onClick={handleAddItem}
                disabled={disabled}
                className="flex items-center gap-1 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold whitespace-nowrap disabled:bg-slate-300"
              >
                <Plus className="w-4 h-4" />
                추가
              </button>
            </div>
          </div>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            저장하면 원장 시트에 반영됩니다. 거점 탭이나 제품 열을 삭제할 때는 백업 탭을 남긴 뒤 원본을 지웁니다.
          </p>
        </div>
      )}

      {error && (
        <p className="px-3.5 py-2.5 rounded-xl bg-rose-50 border border-rose-200 text-[11px] font-bold text-rose-700">
          {error}
        </p>
      )}

      <div className="border border-slate-200 rounded-2xl divide-y divide-slate-100 overflow-hidden">
        {rows.length === 0 && (
          <p className="px-5 py-8 text-center text-xs text-slate-400">등록된 항목이 없습니다.</p>
        )}
        {rows.map((row, index) => {
          const isEditing = editingKey === row.key;
          return (
            <div key={`${section}-${row.key}`} className="px-4 py-3">
              {isEditing ? (
                <div className="space-y-2.5">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {SECTION_FIELDS[section].map((spec) => (
                      <label key={spec.key} className="block space-y-1">
                        <span className="text-[11px] font-bold text-slate-500">
                          {spec.label}
                          {spec.required && <span className="text-rose-500"> *</span>}
                        </span>
                        {spec.key === 'category' ? (
                          <select
                            value={draft.category || ''}
                            onChange={(e) => setDraft((prev) => ({ ...prev, category: e.target.value }))}
                            className={inputClass}
                          >
                            {value.categories.map((category) => (
                              <option key={category.id} value={category.id}>
                                {category.label}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type="text"
                            inputMode={spec.numeric ? 'numeric' : undefined}
                            maxLength={MASTER_TEXT_MAX_LENGTH}
                            value={draft[spec.key] ?? ''}
                            onChange={(e) =>
                              setDraft((prev) => ({
                                ...prev,
                                [spec.key]: spec.numeric
                                  ? e.target.value.replace(/[^\d,]/g, '')
                                  : e.target.value,
                              }))
                            }
                            className={inputClass}
                          />
                        )}
                      </label>
                    ))}
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={resetEditing}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                    >
                      <X className="w-3.5 h-3.5" />
                      취소
                    </button>
                    <button
                      type="button"
                      onClick={() => handleConfirmEdit(row.key)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-bold"
                    >
                      <Check className="w-3.5 h-3.5" />
                      적용
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-4">
                  <span className="w-5 text-xs text-slate-400 tabular-nums">{index + 1}</span>
                  <div className="min-w-0 flex-1 flex items-center gap-3 flex-wrap">
                    <span className="px-3 py-1 rounded-lg border border-slate-900 text-xs font-bold text-slate-900">
                      {row.title}
                    </span>
                    {row.detail && <span className="text-[11px] text-slate-400 truncate">{row.detail}</span>}
                  </div>
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => {
                      setEditingKey(row.key);
                      setDraft(row.fields);
                      setError(null);
                    }}
                    title="수정"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 disabled:opacity-40"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() =>
                      section === 'suppliers' ? handleDeleteSupplier(index) : handleDeleteRow(row.key)
                    }
                    title="삭제"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 disabled:opacity-40"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
