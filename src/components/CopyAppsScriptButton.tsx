import React, { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { SHEET_DB_APPS_SCRIPT } from '../utils/sheetDbAppsScript';

interface CopyAppsScriptButtonProps {
  className?: string;
}

export const CopyAppsScriptButton: React.FC<CopyAppsScriptButtonProps> = ({ className = '' }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(SHEET_DB_APPS_SCRIPT);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = SHEET_DB_APPS_SCRIPT;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      type="button"
      onClick={() => void handleCopy()}
      aria-live="polite"
      className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-bold transition-colors ${
        copied
          ? 'bg-emerald-600 text-white ring-2 ring-emerald-200'
          : 'bg-slate-900 text-white hover:bg-slate-800 active:scale-[0.98]'
      } ${className}`}
    >
      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
      {copied ? '복사됨' : 'Apps Script 코드 복사'}
    </button>
  );
};
