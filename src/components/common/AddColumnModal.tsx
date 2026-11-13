import React, { useState } from 'react';
import { DynamicTableColumn } from '../../types';
import { Columns, Plus, X } from 'lucide-react';

interface AddColumnModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddColumn: (column: DynamicTableColumn) => void;
  tableName: string;
  suggestedLabels?: string[];
}

export const AddColumnModal: React.FC<AddColumnModalProps> = ({
  isOpen,
  onClose,
  onAddColumn,
  tableName,
  suggestedLabels = []
}) => {
  const [columnLabel, setColumnLabel] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = columnLabel.trim();
    if (!trimmed) {
      setError('Nama kolom wajib diisi');
      return;
    }

    // Generate unique key
    const cleanKey = 'col_' + trimmed.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 15) + '_' + Date.now().toString().slice(-4);
    
    onAddColumn({
      key: cleanKey,
      label: trimmed,
      removable: true
    });

    setColumnLabel('');
    setError('');
    onClose();
  };

  const handleSelectSuggestion = (suggested: string) => {
    setColumnLabel(suggested);
    setError('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-stone-200 overflow-hidden">
        {/* Header */}
        <div className="bg-stone-900 text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Columns className="w-5 h-5 text-amber-400" />
            <h3 className="font-bold text-sm sm:text-base">
              Tambah Kolom Baru
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-stone-400 hover:text-white rounded-lg hover:bg-stone-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="text-xs text-stone-600">
            Tambahkan kolom baru untuk tabel <span className="font-bold text-stone-900">{tableName}</span>. Kolom ini akan muncul di formulir input dan langsung tercetak pada dokumen warta.
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-800 mb-1">
              Nama / Judul Kolom:
            </label>
            <input
              type="text"
              autoFocus
              value={columnLabel}
              onChange={(e) => {
                setColumnLabel(e.target.value);
                if (error) setError('');
              }}
              placeholder="Contoh: Sesi 3 (17.00), Catatan, Petugas, dll."
              className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:bg-white"
            />
            {error && <p className="text-xs text-rose-600 mt-1">{error}</p>}
          </div>

          {/* Saran Cepat */}
          {suggestedLabels.length > 0 && (
            <div>
              <div className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider mb-1.5">
                Pilihan Cepat:
              </div>
              <div className="flex flex-wrap gap-1.5">
                {suggestedLabels.map((sug) => (
                  <button
                    key={sug}
                    type="button"
                    onClick={() => handleSelectSuggestion(sug)}
                    className="px-2.5 py-1 text-xs bg-stone-100 hover:bg-blue-50 hover:text-blue-900 hover:border-blue-300 border border-stone-200 rounded-lg text-stone-700 transition cursor-pointer"
                  >
                    + {sug}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="pt-3 border-t border-stone-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-semibold text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm flex items-center gap-1.5 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Tambah Kolom
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
