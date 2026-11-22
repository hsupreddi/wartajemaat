import React, { useState, useEffect, useRef } from 'react';
import { MingguLiturgi } from '../../types';
import { listMingguLiturgi, upsertMingguLiturgi } from '../../lib/mingguLiturgiApi';
import { Search, ChevronDown, Check, Plus, X, Loader2 } from 'lucide-react';

interface MingguLiturgiDropdownProps {
  value: string; // nama_minggu e.g. "REMINISCERE" or "Advent I"
  onChange: (namaMinggu: string, item?: MingguLiturgi) => void;
  className?: string;
  placeholder?: string;
  autoFillTopic?: boolean;
  allowCustom?: boolean;
  disabled?: boolean;
  onAddedMinggu?: (item: MingguLiturgi) => void;
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
  placeholder = 'Pilih atau Tambah Goar ni Minggu HKBP...',
  allowCustom = true,
  disabled = false,
  onAddedMinggu
}) => {
  const [items, setItems] = useState<MingguLiturgi[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [isSavingCustom, setIsSavingCustom] = useState(false);
  const [customNama, setCustomNama] = useState('');
  const [customWarna, setCustomWarna] = useState('Hijau');
  const [customArtiBatak, setCustomArtiBatak] = useState('');
  const [customArtiIndo, setCustomArtiIndo] = useState('');
  const [customTopik, setCustomTopik] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const loadList = async () => {
    const list = await listMingguLiturgi();
    setItems(list);
  };

  useEffect(() => {
    loadList();
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadList();
    } else {
      setShowAddForm(false);
    }
  }, [isOpen]);

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

  const openCustomForm = (prefill?: string) => {
    setCustomNama((prefill ?? searchQuery).trim());
    setCustomWarna('Hijau');
    setCustomArtiBatak('');
    setCustomArtiIndo('');
    setCustomTopik('');
    setShowAddForm(true);
  };

  const handleSaveCustomToKalender = async () => {
    const trimmedName = customNama.trim();
    if (!trimmedName || isSavingCustom) return;
    setIsSavingCustom(true);
    try {
      const maxNo = items.reduce((max, m) => Math.max(max, m.no_urut || 0), 0);
      const saved = await upsertMingguLiturgi({
        id: `minggu-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        no_urut: maxNo + 1,
        nama_minggu: trimmedName,
        warna_liturgi: customWarna || 'Hijau',
        arti_batak: customArtiBatak.trim(),
        arti_indonesia: customArtiIndo.trim(),
        topik_default: customTopik.trim()
      });
      await loadList();
      onAddedMinggu?.(saved);
      onChange(saved.nama_minggu.toUpperCase(), saved);
      setShowAddForm(false);
      setIsOpen(false);
      setSearchQuery('');
    } finally {
      setIsSavingCustom(false);
    }
  };

  const handleUseOneOffCustom = (namaText: string) => {
    const clean = namaText.trim().toUpperCase();
    if (!clean) return;
    onChange(clean);
    setShowAddForm(false);
    setIsOpen(false);
    setSearchQuery('');
  };

  const currentBadge = getLiturgiColorBadge(selectedItem?.warna_liturgi);

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className="w-full min-h-[44px] px-3.5 py-2.5 bg-white border border-stone-300 hover:border-blue-500 disabled:bg-stone-100 disabled:cursor-not-allowed rounded-xl flex items-center justify-between text-left transition shadow-xs focus:ring-2 focus:ring-[#0B2545] focus:outline-none cursor-pointer"
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
          ) : value ? (
            <div className="flex items-center gap-2 min-w-0 truncate">
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 shrink-0">
                Manual
              </span>
              <span className="font-extrabold text-stone-900 text-xs sm:text-sm truncate">
                MINGGU {value}
              </span>
            </div>
          ) : (
            <span className="text-xs text-stone-400 font-medium truncate">
              {placeholder}
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
          {showAddForm ? (
            <div className="p-3.5 space-y-3 bg-stone-50">
              <div className="flex items-center justify-between border-b border-stone-200 pb-2">
                <div>
                  <div className="text-xs font-extrabold text-[#0B2545]">
                    Tambah Goar ni Minggu Manual
                  </div>
                  <div className="text-[10.5px] text-stone-500">
                    Simpan ke Kalender Liturgi agar muncul di daftar pilihan
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="p-1 text-stone-400 hover:text-stone-700 rounded-lg cursor-pointer"
                  aria-label="Tutup form tambah manual"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2.5 text-xs">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">
                    Nama Goar ni Minggu <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={customNama}
                    onChange={(e) => setCustomNama(e.target.value)}
                    placeholder="Contoh: Pesta Gotilon, Natal Remaja..."
                    autoFocus
                    className="w-full px-3 py-2 border border-stone-300 rounded-xl bg-white font-bold text-stone-900 focus:ring-2 focus:ring-[#0B2545] focus:outline-none min-h-[40px]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">
                    Warna Tutup Langgatan
                  </label>
                  <select
                    value={customWarna}
                    onChange={(e) => setCustomWarna(e.target.value)}
                    className="w-full px-3 py-2 border border-stone-300 rounded-xl bg-white font-semibold min-h-[40px]"
                  >
                    <option value="Hijau">Hijau (Trinitatis / Biasa)</option>
                    <option value="Ungu">Ungu (Advent &amp; Prapaskah)</option>
                    <option value="Putih">Putih (Natal, Paskah &amp; Epifani)</option>
                    <option value="Merah">Merah (Pentakosta)</option>
                    <option value="Hitam">Hitam (Jumat Agung &amp; Ujung Taon)</option>
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block font-semibold text-stone-700 mb-1">
                      Arti Batak (Opsional)
                    </label>
                    <input
                      type="text"
                      value={customArtiBatak}
                      onChange={(e) => setCustomArtiBatak(e.target.value)}
                      placeholder="Makna bahasa Batak..."
                      className="w-full px-3 py-2 border border-stone-300 rounded-xl bg-white min-h-[38px]"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-stone-700 mb-1">
                      Arti Indonesia (Opsional)
                    </label>
                    <input
                      type="text"
                      value={customArtiIndo}
                      onChange={(e) => setCustomArtiIndo(e.target.value)}
                      placeholder="Makna bahasa Indonesia..."
                      className="w-full px-3 py-2 border border-stone-300 rounded-xl bg-white min-h-[38px]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-stone-700 mb-1">
                    Topik Default (Opsional)
                  </label>
                  <input
                    type="text"
                    value={customTopik}
                    onChange={(e) => setCustomTopik(e.target.value)}
                    placeholder="Contoh: Hamauliateon tu Jahowa"
                    className="w-full px-3 py-2 border border-stone-300 rounded-xl bg-white min-h-[38px]"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-3 py-2 rounded-xl text-xs font-semibold text-stone-600 hover:bg-stone-200/70 cursor-pointer min-h-[38px]"
                >
                  Kembali
                </button>
                {customNama.trim() && (
                  <button
                    type="button"
                    onClick={() => handleUseOneOffCustom(customNama)}
                    className="px-3 py-2 rounded-xl border border-stone-300 bg-white hover:bg-stone-100 text-stone-800 text-xs font-bold cursor-pointer min-h-[38px]"
                  >
                    Pakai Sekali Saja
                  </button>
                )}
                <button
                  type="button"
                  disabled={!customNama.trim() || isSavingCustom}
                  onClick={handleSaveCustomToKalender}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#0B2545] hover:bg-[#133868] disabled:opacity-50 text-white text-xs font-bold cursor-pointer min-h-[38px]"
                >
                  {isSavingCustom && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Simpan ke Kalender &amp; Pilih</span>
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Search Input Box */}
              <div className="p-3 bg-stone-50 border-b border-stone-200 flex items-center gap-2">
                <Search className="w-4 h-4 text-stone-400 shrink-0" />
                <input
                  type="text"
                  placeholder="Cari atau ketik Goar ni Minggu baru..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus
                  className="w-full bg-transparent text-xs text-stone-900 focus:outline-none placeholder:text-stone-400 font-medium"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="text-stone-400 hover:text-stone-600 p-0.5 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Quick Count & Info Banner */}
              <div className="px-3 py-1.5 bg-amber-50/70 border-b border-amber-100 flex items-center justify-between text-[11px] text-amber-900 font-medium">
                <span>Daftar {items.length} Minggu Liturgi HKBP</span>
                <span className="font-mono-num font-bold">{filteredItems.length} opsi</span>
              </div>

              {/* List of Sundays */}
              <div className="max-h-60 sm:max-h-64 overflow-y-auto divide-y divide-stone-100 p-1">
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
                          <span className="text-[11px] font-mono font-bold text-stone-400 shrink-0 pt-0.5 w-7">
                            #{m.no_urut}
                          </span>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
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
                  <div className="py-5 px-3 text-center space-y-2.5">
                    <p className="text-xs text-stone-500 italic">
                      Tidak ada nama minggu yang cocok dengan "{searchQuery}".
                    </p>
                    {allowCustom && searchQuery.trim() && (
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => openCustomForm(searchQuery)}
                          className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-extrabold cursor-pointer min-h-[38px]"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Simpan "{searchQuery.trim()}" ke Kalender</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUseOneOffCustom(searchQuery)}
                          className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold cursor-pointer min-h-[38px]"
                        >
                          <span>Pakai untuk warta ini</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Sticky Footer: Tambah Manual Button */}
              {allowCustom && (
                <div className="p-2 bg-stone-50 border-t border-stone-200 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => openCustomForm(searchQuery)}
                    className="w-full min-h-[38px] px-3 py-1.5 rounded-xl bg-white hover:bg-amber-50 border border-amber-300 text-[#0B2545] text-xs font-extrabold flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span>
                      {searchQuery.trim()
                        ? `Tambah "${searchQuery.trim()}" Secara Manual`
                        : 'Tambah Goar ni Minggu Manual'}
                    </span>
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};
