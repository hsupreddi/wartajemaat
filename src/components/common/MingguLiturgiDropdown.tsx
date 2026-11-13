import React, { useState, useEffect, useRef } from 'react';
import { MingguLiturgi } from '../../types';
import { listMingguLiturgi } from '../../lib/mingguLiturgiApi';
import { Search, ChevronDown, Check, Sparkles, X } from 'lucide-react';

interface MingguLiturgiDropdownProps {
  value: string; // nama_minggu e.g. "REMINISCERE" or "Advent I"
  onChange: (namaMinggu: string, item?: MingguLiturgi) => void;
  className?: string;
  placeholder?: string;
  autoFillTopic?: boolean;
}

export const getLiturgiColorBadge = (warna?: string) => {
  const w = (warna || '').toLowerCase();
  switch (w) {
    case 'ungu':
      return {
        bg: 'bg-purple-100 text-purple-900 border-purple-300',
        dot: 'bg-purple-600',
        label: 'Ungu'
      };
    case 'putih':
      return {
        bg: 'bg-stone-100 text-stone-800 border-stone-300',
        dot: 'bg-white border border-stone-400',
        label: 'Putih'
      };
    case 'merah':
      return {
        bg: 'bg-red-100 text-red-900 border-red-300',
        dot: 'bg-red-600',
        label: 'Merah'
      };
    case 'hitam':
      return {
        bg: 'bg-stone-900 text-white border-stone-950',
        dot: 'bg-stone-950',
        label: 'Hitam'
      };
    case 'hijau':
    default:
      return {
        bg: 'bg-emerald-100 text-emerald-900 border-emerald-300',
        dot: 'bg-emerald-600',
        label: 'Hijau'
      };
  }
};

export const MingguLiturgiDropdown: React.FC<MingguLiturgiDropdownProps> = ({
  value,
  onChange,
  className = '',
  placeholder = 'Pilih Nama Minggu Liturgi HKBP (63 Minggu)...'
}) => {
  const [items, setItems] = useState<MingguLiturgi[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listMingguLiturgi().then((list) => {
      setItems(list);
    });
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Selected item lookup
  const cleanVal = (value || '').trim().toUpperCase();
  const selectedItem = items.find(
    (m) =>
      m.nama_minggu.toUpperCase() === cleanVal ||
      `MINGGU ${m.nama_minggu.toUpperCase()}` === cleanVal ||
      cleanVal === `MINGGU ${m.nama_minggu.toUpperCase()}`
  );

  const filteredItems = items.filter((m) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      m.nama_minggu.toLowerCase().includes(q) ||
      (m.arti_indonesia && m.arti_indonesia.toLowerCase().includes(q)) ||
      (m.arti_batak && m.arti_batak.toLowerCase().includes(q)) ||
      (m.warna_liturgi && m.warna_liturgi.toLowerCase().includes(q)) ||
      (m.no_urut && String(m.no_urut).includes(q))
    );
  });

  const handleSelect = (item: MingguLiturgi) => {
    onChange(item.nama_minggu.toUpperCase(), item);
    setIsOpen(false);
    setSearchQuery('');
  };

  const currentBadge = getLiturgiColorBadge(selectedItem?.warna_liturgi);

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full min-h-[44px] px-3.5 py-2.5 bg-white border border-stone-300 hover:border-blue-500 rounded-xl flex items-center justify-between text-left transition shadow-xs focus:ring-2 focus:ring-[#0B2545] focus:outline-none cursor-pointer"
      >
        <div className="flex items-center gap-2.5 min-w-0 pr-2">
          {selectedItem ? (
            <>
              <span
                className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-bold border shrink-0 ${currentBadge.bg}`}
              >
                <span className={`w-2 h-2 rounded-full shrink-0 ${currentBadge.dot}`} />
                <span>{selectedItem.warna_liturgi || 'Hijau'}</span>
              </span>
              <div className="min-w-0 truncate">
                <span className="font-extrabold text-stone-900 text-xs sm:text-sm">
                  {selectedItem.no_urut ? `${selectedItem.no_urut}. ` : ''}
                  {selectedItem.nama_minggu.toUpperCase()}
                </span>
                {(selectedItem.arti_batak || selectedItem.arti_indonesia) && (
                  <span className="text-[11px] text-stone-500 block truncate">
                    {selectedItem.arti_batak || selectedItem.arti_indonesia}
                  </span>
                )}
              </div>
            </>
          ) : (
            <span className="text-xs text-stone-400 font-medium truncate">
              {value ? `MINGGU ${value}` : placeholder}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0 text-stone-400">
          <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {/* Popover Menu */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1.5 bg-white rounded-2xl shadow-2xl border border-stone-200 z-50 overflow-hidden animate-in fade-in slide-in-from-top-1">
          {/* Search Input Box */}
          <div className="p-3 bg-stone-50 border-b border-stone-200 flex items-center gap-2">
            <Search className="w-4 h-4 text-stone-400 shrink-0" />
            <input
              type="text"
              placeholder="Ketik untuk mencari (contoh: Reminiscere, Advent, Paskah, Ungu)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
              className="w-full bg-transparent text-xs text-stone-900 focus:outline-none placeholder:text-stone-400 font-medium"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="text-stone-400 hover:text-stone-600 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Count & Info Banner */}
          <div className="px-3 py-1.5 bg-amber-50/70 border-b border-amber-100 flex items-center justify-between text-[11px] text-amber-900 font-medium">
            <span>Daftar 63 Minggu Liturgi HKBP Terdaftar</span>
            <span className="font-mono-num font-bold">{filteredItems.length} opsi</span>
          </div>

          {/* List of Sundays */}
          <div className="max-h-64 sm:max-h-72 overflow-y-auto divide-y divide-stone-100 p-1">
            {filteredItems.length > 0 ? (
              filteredItems.map((m) => {
                const isSelected =
                  cleanVal === m.nama_minggu.toUpperCase() ||
                  cleanVal === `MINGGU ${m.nama_minggu.toUpperCase()}`;
                const badge = getLiturgiColorBadge(m.warna_liturgi);

                return (
                  <button
                    key={m.id || m.no_urut}
                    type="button"
                    onClick={() => handleSelect(m)}
                    className={`w-full p-2.5 rounded-xl text-left transition flex items-center justify-between gap-3 cursor-pointer ${
                      isSelected
                        ? 'bg-blue-50/90 text-blue-950 font-bold'
                        : 'hover:bg-stone-50 text-stone-800'
                    }`}
                  >
                    <div className="flex items-start gap-2.5 min-w-0">
                      <span className="text-[11px] font-mono font-bold text-stone-400 shrink-0 pt-0.5 w-6">
                        #{m.no_urut}
                      </span>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs sm:text-sm text-stone-900">
                            {m.nama_minggu}
                          </span>
                          <span
                            className={`inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-bold border ${badge.bg}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                            <span>{m.warna_liturgi}</span>
                          </span>
                        </div>

                        {m.arti_batak && m.arti_batak !== '-' && (
                          <div className="text-[11px] text-stone-600 italic truncate mt-0.5 font-serif-body">
                            "{m.arti_batak}"
                          </div>
                        )}
                        {m.arti_indonesia && m.arti_indonesia !== '-' && (
                          <div className="text-[10px] text-stone-500 truncate">
                            {m.arti_indonesia}
                          </div>
                        )}
                      </div>
                    </div>

                    {isSelected && (
                      <Check className="w-4 h-4 text-blue-700 shrink-0 ml-2" />
                    )}
                  </button>
                );
              })
            ) : (
              <div className="py-6 text-center text-xs text-stone-400 italic">
                Tidak ada nama minggu yang cocok dengan "{searchQuery}".
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
