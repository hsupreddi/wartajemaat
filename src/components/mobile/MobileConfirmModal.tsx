import React from 'react';
import { AlertTriangle, Info, X } from 'lucide-react';

interface MobileConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'danger' | 'primary';
  hideCancel?: boolean;
  isProcessing?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const MobileConfirmModal: React.FC<MobileConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Ya, Lanjutkan',
  cancelLabel = 'Batal',
  tone = 'primary',
  hideCancel = false,
  isProcessing = false,
  onConfirm,
  onCancel
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/55 backdrop-blur-xs p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="mobile-confirm-title"
    >
      <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl border border-stone-200 shadow-2xl p-5 pb-safe space-y-4 animate-in fade-in slide-in-from-bottom-4">
        <div className="w-10 h-1.5 bg-stone-300 rounded-full mx-auto sm:hidden" />

        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                tone === 'danger'
                  ? 'bg-rose-50 text-rose-700'
                  : 'bg-blue-50 text-[#0B2545]'
              }`}
            >
              {tone === 'danger' ? (
                <AlertTriangle className="w-5 h-5" />
              ) : (
                <Info className="w-5 h-5" />
              )}
            </div>
            <div className="space-y-1">
              <h3
                id="mobile-confirm-title"
                className="text-base font-bold text-stone-900 leading-snug"
              >
                {title}
              </h3>
              <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">{message}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onCancel}
            aria-label="Tutup dialog"
            className="min-w-[44px] min-h-[44px] -mt-1 -mr-1 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100 flex items-center justify-center cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-2 border-t border-stone-100">
          {!hideCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={isProcessing}
              className="min-h-[44px] px-4 py-2.5 rounded-xl border border-stone-300 text-stone-700 hover:bg-stone-50 text-xs sm:text-sm font-semibold cursor-pointer disabled:opacity-50"
            >
              {cancelLabel}
            </button>
          )}
          <button
            type="button"
            onClick={onConfirm}
            disabled={isProcessing}
            className={`min-h-[44px] px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold shadow-sm transition cursor-pointer disabled:opacity-50 ${
              tone === 'danger'
                ? 'bg-rose-600 hover:bg-rose-700 text-white'
                : 'bg-[#0B2545] hover:bg-[#133c55] text-white'
            }`}
          >
            {isProcessing ? 'Memproses...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
