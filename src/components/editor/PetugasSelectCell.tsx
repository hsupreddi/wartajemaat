import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { PetugasMaster } from '../../types';
import { ChevronDown, Search, Plus, Check, X, UserCheck } from 'lucide-react';

interface PetugasSelectCellProps {
  value: string;
  onChange: (newValue: string) => void;
  petugasList: PetugasMaster[];
  peranRow?: string;
  placeholder?: string;
  disabled?: boolean;
  compact?: boolean;
}

function splitSelectedNames(val: string): string[] {
  return (val || '')
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && s !== '-');
}

export const PetugasSelectCell: React.FC<PetugasSelectCellProps> = ({
  value,
  onChange,
  petugasList,
  peranRow,
  placeholder = 'Pilih / ketik petugas...',
  disabled = false,
  compact = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'peran' | 'sintua' | 'fulltimer' | 'organis'>('all');
  const [coords, setCoords] = useState<{ top: number; left: number; width: number; openUpward: boolean }>({
    top: 0,
    left: 0,
    width: 280,
    openUpward: false
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectedTokens = useMemo(() => splitSelectedNames(value), [value]);

  const updatePosition = () => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUpward = spaceBelow < 320 && rect.top > 320;
    const desiredWidth = Math.max(290, rect.width);
    const maxLeft = Math.max(8, window.innerWidth - desiredWidth - 12);
    setCoords({
      top: openUpward ? rect.top - 4 : rect.bottom + 4,
      left: Math.min(rect.left, maxLeft),
      width: desiredWidth,
      openUpward
    });
  };

  useEffect(() => {
    if (!isOpen) return;
    updatePosition();
    const timer = setTimeout(() => searchInputRef.current?.focus(), 20);

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        containerRef.current?.contains(target) ||
        popoverRef.current?.contains(target)
      ) {
        return;
      }
      setIsOpen(false);
    };

    const handleScrollOrResize = () => updatePosition();
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const normalizedPeran = (peranRow || '').trim().toLowerCase();

  const filteredList = useMemo(() => {
    const q = search.trim().toLowerCase();
    return petugasList.filter((p) => {
      if (p.aktif === false) return false;
      const matchQuery =
        !q ||
        p.nama.toLowerCase().includes(q) ||
        (p.jabatan && p.jabatan.toLowerCase().includes(q)) ||
        (p.lingkungan && p.lingkungan.toLowerCase().includes(q)) ||
        (p.peran_default && p.peran_default.toLowerCase().includes(q));
      if (!matchQuery) return false;

      if (filterMode === 'peran' && normalizedPeran) {
        return (p.peran_default || '').toLowerCase() === normalizedPeran;
      }
      if (filterMode === 'sintua') {
        const j = (p.jabatan || '').toLowerCase();
        return j.includes('sintua');
      }
      if (filterMode === 'fulltimer') {
        const j = (p.jabatan || '').toLowerCase();
        return j.includes('pendeta') || j.includes('bibelvrouw') || j.includes('guru huria') || j.includes('diakones');
      }
      if (filterMode === 'organis') {
        const j = (p.jabatan || '').toLowerCase();
        return j.includes('organis') || j.includes('musik') || j.includes('gsm') || j.includes('sekolah minggu');
      }
      return true;
    });
  }, [petugasList, search, filterMode, normalizedPeran]);

  const recommendedItems = useMemo(() => {
    if (!normalizedPeran) return [];
    return filteredList.filter((p) => (p.peran_default || '').toLowerCase() === normalizedPeran);
  }, [filteredList, normalizedPeran]);

  const otherItems = useMemo(() => {
    if (!normalizedPeran) return filteredList;
    return filteredList.filter((p) => (p.peran_default || '').toLowerCase() !== normalizedPeran);
  }, [filteredList, normalizedPeran]);

  const handleSelectSingle = (nama: string) => {
    onChange(nama);
    setIsOpen(false);
    setSearch('');
  };

  const handleToggleAppend = (nama: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const exists = selectedTokens.some((t) => t.toLowerCase() === nama.toLowerCase());
    if (exists) {
      const next = selectedTokens.filter((t) => t.toLowerCase() !== nama.toLowerCase());
      onChange(next.join(', '));
    } else {
      const next = [...selectedTokens, nama];
      onChange(next.join(', '));
    }
  };

  const renderPetugasRow = (p: PetugasMaster) => {
    const isSelected = selectedTokens.some((t) => t.toLowerCase() === p.nama.toLowerCase());
    return (
      <div
        key={p.id}
        onClick={() => handleSelectSingle(p.nama)}
        className={`flex items-center justify-between gap-2 px-2.5 py-1.5 text-xs cursor-pointer transition rounded-md ${
          isSelected
            ? 'bg-blue-50 text-blue-950 border border-blue-200'
            : 'hover:bg-stone-100 text-stone-800'
        }`}
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            {isSelected && <Check className="w-3.5 h-3.5 text-blue-700 shrink-0" />}
            <span className="font-bold truncate">{p.nama}</span>
          </div>
          <div className="text-[10px] text-stone-500 truncate flex items-center gap-1.5">
            <span>{p.jabatan}</span>
            {p.lingkungan && (
              <>
                <span>·</span>
                <span>{p.lingkungan}</span>
              </>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={(e) => handleToggleAppend(p.nama, e)}
          title={isSelected ? 'Hapus dari pilihan multi-petugas' : 'Tambahkan (lebih dari 1 petugas)'}
          className={`px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0 border transition cursor-pointer ${
            isSelected
              ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
              : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
          }`}
        >
          {isSelected ? 'Hapus' : '+ Tambah'}
        </button>
      </div>
    );
  };

  return (
    <div ref={containerRef} className="relative flex items-center w-full">
      <input
        type="text"
        disabled={disabled}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full pr-7 border border-stone-200 rounded text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 ${
          compact ? 'px-2 py-1' : 'px-2 py-1 bg-stone-50'
        }`}
      />
      {!disabled && (
        <button
          type="button"
          onClick={() => {
            setFilterMode('all');
            setSearch('');
            setIsOpen((prev) => !prev);
          }}
          title="Pilih Sintua / Pengurus dari database"
          className={`absolute right-1 top-1/2 -translate-y-1/2 p-1 rounded text-stone-500 hover:text-blue-700 hover:bg-blue-50 transition cursor-pointer ${
            isOpen ? 'text-blue-700 bg-blue-50' : ''
          }`}
        >
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
      )}

      {isOpen &&
        createPortal(
          <div
            ref={popoverRef}
            style={{
              position: 'fixed',
              top: coords.openUpward ? undefined : coords.top,
              bottom: coords.openUpward ? window.innerHeight - coords.top : undefined,
              left: coords.left,
              width: coords.width,
              zIndex: 9999
            }}
            className="bg-white rounded-xl border border-stone-300 shadow-2xl flex flex-col overflow-hidden text-xs"
          >
            {/* Header Search */}
            <div className="p-2 bg-stone-50 border-b border-stone-200 space-y-1.5">
              <div className="flex items-center justify-between text-[10px] font-bold text-stone-600 uppercase">
                <span className="flex items-center gap-1">
                  <UserCheck className="w-3 h-3 text-blue-700" />
                  Pilih Sintua / Pengurus {peranRow ? `(${peranRow})` : ''}
                </span>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="text-stone-400 hover:text-stone-700 p-0.5 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-2" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cari nama sintua, pendeta, organis..."
                  className="w-full pl-8 pr-2 py-1.5 text-xs bg-white border border-stone-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Filter Chips */}
              <div className="flex flex-wrap gap-1">
                {[
                  { key: 'all', label: 'Semua' },
                  ...(normalizedPeran ? [{ key: 'peran', label: peranRow! }] : []),
                  { key: 'sintua', label: 'Sintua/CSt' },
                  { key: 'fulltimer', label: 'Pendeta/Bvr/Gr' },
                  { key: 'organis', label: 'Organis/GSM' }
                ].map((chip) => (
                  <button
                    key={chip.key}
                    type="button"
                    onClick={() => setFilterMode(chip.key as any)}
                    className={`px-2 py-0.5 rounded text-[10px] font-semibold cursor-pointer transition ${
                      filterMode === chip.key
                        ? 'bg-blue-700 text-white'
                        : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-100'
                    }`}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            </div>

            {/* List */}
            <div className="max-h-60 overflow-y-auto p-1.5 space-y-1">
              {filteredList.length === 0 ? (
                <div className="py-5 text-center text-[11px] text-stone-500">
                  Tidak ditemukan nama yang cocok. Anda tetap dapat mengetik langsung di kolom tabel.
                </div>
              ) : (
                <>
                  {recommendedItems.length > 0 && (
                    <div className="space-y-0.5">
                      <div className="px-2 py-0.5 text-[10px] font-bold text-blue-800 uppercase bg-blue-50/70 rounded">
                        Rekomendasi Peran {peranRow}
                      </div>
                      {recommendedItems.map(renderPetugasRow)}
                    </div>
                  )}
                  {otherItems.length > 0 && (
                    <div className="space-y-0.5 pt-1">
                      {recommendedItems.length > 0 && (
                        <div className="px-2 py-0.5 text-[10px] font-bold text-stone-500 uppercase bg-stone-100 rounded">
                          Sintua &amp; Pengurus Lainnya
                        </div>
                      )}
                      {otherItems.map(renderPetugasRow)}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Footer Quick Chips */}
            <div className="p-1.5 bg-stone-50 border-t border-stone-200 flex flex-wrap items-center justify-between gap-1">
              <div className="flex flex-wrap items-center gap-1">
                {['GR SKM', 'GSM Team', '-'].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => handleSelectSingle(preset)}
                    className="px-2 py-0.5 bg-white hover:bg-stone-100 border border-stone-300 rounded text-[10px] font-semibold text-stone-700 cursor-pointer"
                  >
                    {preset}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => handleSelectSingle('')}
                  className="px-2 py-0.5 bg-white hover:bg-rose-50 border border-stone-300 rounded text-[10px] font-semibold text-rose-700 cursor-pointer"
                >
                  Kosongkan
                </button>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-stone-800 hover:bg-stone-900 text-white rounded text-[10px] font-bold cursor-pointer"
              >
                <Plus className="w-3 h-3 rotate-45" /> Selesai
              </button>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};
