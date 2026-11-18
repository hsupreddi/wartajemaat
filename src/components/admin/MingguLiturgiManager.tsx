import React, { useState, useEffect } from 'react';
import { MingguLiturgi } from '../../types';
import {
  listMingguLiturgi,
  upsertMingguLiturgi,
  deleteMingguLiturgi,
  resetMingguLiturgiToDefault,
  syncAllMingguToSupabase,
  SUPABASE_MINGGU_LITURGI_SQL
} from '../../lib/mingguLiturgiApi';
import { isSupabaseConfigured } from '../../lib/supabase';
import { getLiturgiColorBadge } from '../common/MingguLiturgiDropdown';
import { MobileConfirmModal } from '../mobile/MobileConfirmModal';
import {
  Calendar,
  Search,
  Filter,
  Plus,
  Edit2,
  Trash2,
  RotateCcw,
  CloudUpload,
  Copy,
  CheckCircle,
  AlertTriangle,
  X,
  Database,
  Sparkles,
  Info
} from 'lucide-react';

interface MingguLiturgiManagerProps {
  onNotify?: (type: 'success' | 'error' | 'warning' | 'info', message: string) => void;
}

export const MingguLiturgiManager: React.FC<MingguLiturgiManagerProps> = ({ onNotify }) => {
  const [items, setItems] = useState<MingguLiturgi[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [colorFilter, setColorFilter] = useState<string>('all');
  const [editingItem, setEditingItem] = useState<Partial<MingguLiturgi> | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);
  const [toast, setToast] = useState<{ type: string; message: string } | null>(null);
  const [confirmState, setConfirmState] = useState<{
    title: string;
    message: string;
    confirmLabel: string;
    tone: 'danger' | 'primary';
    onConfirm: () => Promise<void> | void;
  } | null>(null);

  const notify = (type: 'success' | 'error' | 'warning' | 'info', message: string) => {
    if (onNotify) {
      onNotify(type, message);
    } else {
      setToast({ type, message });
      setTimeout(() => setToast(null), 3500);
    }
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await listMingguLiturgi();
      setItems(data);
    } catch (err: any) {
      notify('error', `Gagal memuat data minggu liturgi: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredItems = items.filter((m) => {
    const matchQuery =
      !searchQuery.trim() ||
      m.nama_minggu.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.arti_indonesia && m.arti_indonesia.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (m.arti_batak && m.arti_batak.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (m.no_urut && String(m.no_urut).includes(searchQuery.trim()));

    const matchColor =
      colorFilter === 'all' ||
      (m.warna_liturgi || '').toLowerCase() === colorFilter.toLowerCase();

    return matchQuery && matchColor;
  });

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || !editingItem.nama_minggu?.trim()) {
      notify('warning', 'Nama Minggu wajib diisi.');
      return;
    }

    setIsSaving(true);
    try {
      const payload: MingguLiturgi = {
        id: editingItem.id || `minggu-${Date.now()}`,
        no_urut: Number(editingItem.no_urut) || items.length + 1,
        nama_minggu: editingItem.nama_minggu.trim(),
        warna_liturgi: editingItem.warna_liturgi || 'Hijau',
        arti_indonesia: editingItem.arti_indonesia || '',
        arti_batak: editingItem.arti_batak || '',
        topik_default: editingItem.topik_default || '',
        ayat_default: editingItem.ayat_default || '',
        ayat_ref_default: editingItem.ayat_ref_default || '',
        keterangan: editingItem.keterangan || ''
      };

      await upsertMingguLiturgi(payload);
      await loadData();
      setEditingItem(null);
      notify('success', `Berhasil menyimpan data Minggu ${payload.nama_minggu}.`);
    } catch (err: any) {
      notify('error', `Gagal menyimpan data: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteItem = (item: MingguLiturgi) => {
    setConfirmState({
      title: 'Hapus Minggu Liturgi',
      message: `Hapus minggu liturgi "${item.nama_minggu}" (No. ${item.no_urut})?`,
      confirmLabel: 'Ya, Hapus',
      tone: 'danger',
      onConfirm: async () => {
        setConfirmState(null);
        try {
          await deleteMingguLiturgi(item.id);
          await loadData();
          notify('info', `Minggu "${item.nama_minggu}" berhasil dihapus.`);
        } catch (err: any) {
          notify('error', `Gagal menghapus: ${err.message}`);
        }
      }
    });
  };

  const handleResetToDefault = () => {
    setConfirmState({
      title: 'Reset Kalender 63 Minggu HKBP',
      message:
        'Kembalikan seluruh daftar kalender ke standar 63 Minggu Liturgi HKBP resmi? Data kustom akan diganti dengan data resmi dari dokumen gereja.',
      confirmLabel: 'Ya, Reset Standar',
      tone: 'danger',
      onConfirm: async () => {
        setConfirmState(null);
        try {
          await resetMingguLiturgiToDefault();
          await loadData();
          notify('success', 'Kalender minggu liturgi berhasil di-reset ke 63 nama minggu resmi HKBP.');
        } catch (err: any) {
          notify('error', `Gagal reset: ${err.message}`);
        }
      }
    });
  };

  const handleSyncToSupabase = async () => {
    setIsSyncing(true);
    try {
      const res = await syncAllMingguToSupabase();
      if (res.success) {
        notify('success', `Berhasil menyinkronkan ${res.count} data minggu liturgi ke database Supabase!`);
      } else {
        notify('error', `Gagal sinkronisasi: ${res.error}`);
      }
    } catch (err: any) {
      notify('error', `Kesalahan sinkronisasi: ${err.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_MINGGU_LITURGI_SQL);
    setCopiedSql(true);
    notify('info', 'Skrip SQL Supabase berhasil disalin ke papan klip! Buka Supabase SQL Editor untuk menjalankannya.');
    setTimeout(() => setCopiedSql(false), 3000);
  };

  // Color count breakdown
  const colorCounts = items.reduce((acc, m) => {
    const w = (m.warna_liturgi || 'Hijau').toLowerCase();
    acc[w] = (acc[w] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6">
      {/* Toast Notification if standalone */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 bg-[#0B2545] text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-2 text-xs font-semibold animate-in fade-in border border-amber-500/40">
          <CheckCircle className="w-4 h-4 text-amber-400" />
          <span>{toast.message}</span>
        </div>
      )}

      {/* Top Banner & Statistics */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-stone-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0B2545] bg-blue-50 px-2.5 py-1 rounded-md border border-blue-100 mb-1.5">
            <Calendar className="w-3.5 h-3.5 text-blue-800" />
            <span>Kalender Liturgi HKBP (63 Minggu Gerejawi)</span>
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-stone-900 tracking-tight">
            Database Nama-Nama Minggu HKBP
          </h2>
          <p className="text-xs text-stone-600 max-w-2xl mt-1 leading-relaxed">
            Data ini menjadi sumber otomatis menu dropdown saat menyusun warta baru maupun mengedit liturgi ibadah.
            Admin dapat mengedit arti bahasa Batak, bahasa Indonesia, dan warna tutup langgatan secara penuh.
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleCopySql}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-bold transition cursor-pointer border border-stone-300 min-h-[40px]"
            title="Salin skrip SQL CREATE TABLE untuk Supabase"
          >
            <Copy className="w-3.5 h-3.5 text-stone-600" />
            <span>{copiedSql ? 'Tersalin!' : 'Skrip SQL'}</span>
          </button>

          {isSupabaseConfigured && (
            <button
              onClick={handleSyncToSupabase}
              disabled={isSyncing}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-xs disabled:opacity-50 min-h-[40px]"
              title="Sinkronkan seluruh 63 minggu ke tabel Supabase"
            >
              <CloudUpload className="w-3.5 h-3.5 text-white" />
              <span>{isSyncing ? 'Menyinkronkan...' : 'Sinkron Supabase'}</span>
            </button>
          )}

          <button
            onClick={handleResetToDefault}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-semibold transition cursor-pointer border border-stone-200 min-h-[40px]"
            title="Kembalikan ke data 63 minggu standar dari dokumen HKBP"
          >
            <RotateCcw className="w-3.5 h-3.5 text-stone-500" />
            <span>Reset Standar</span>
          </button>

          <button
            onClick={() =>
              setEditingItem({
                no_urut: items.length + 1,
                nama_minggu: '',
                warna_liturgi: 'Hijau',
                arti_indonesia: '',
                arti_batak: '',
                topik_default: '',
                ayat_default: '',
                ayat_ref_default: ''
              })
            }
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 rounded-xl text-xs font-extrabold shadow-md transition cursor-pointer min-h-[40px]"
          >
            <Plus className="w-4 h-4 text-stone-950" />
            <span>Tambah Minggu</span>
          </button>
        </div>
      </div>

      {/* Liturgical Colors KPI Pill Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
        <button
          onClick={() => setColorFilter('all')}
          className={`p-3 rounded-xl border text-left transition cursor-pointer ${
            colorFilter === 'all'
              ? 'bg-[#0B2545] text-white border-[#0B2545] shadow-xs'
              : 'bg-white hover:bg-stone-50 text-stone-800 border-stone-200'
          }`}
        >
          <div className="text-[10px] uppercase font-bold tracking-wider opacity-80">Total Minggu</div>
          <div className="text-xl font-extrabold font-mono-num mt-0.5">{items.length}</div>
          <div className="text-[10px] opacity-70">Semua Warna</div>
        </button>

        <button
          onClick={() => setColorFilter('ungu')}
          className={`p-3 rounded-xl border text-left transition cursor-pointer ${
            colorFilter === 'ungu'
              ? 'bg-purple-900 text-white border-purple-950 shadow-xs ring-2 ring-purple-600'
              : 'bg-purple-50/70 hover:bg-purple-100/70 text-purple-950 border-purple-200'
          }`}
        >
          <div className="text-[10px] uppercase font-bold tracking-wider text-purple-700 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-purple-600" /> Ungu
          </div>
          <div className="text-xl font-extrabold font-mono-num mt-0.5 text-purple-950">
            {colorCounts['ungu'] || 0}
          </div>
          <div className="text-[10px] text-purple-700">Advent & Prapaskah</div>
        </button>

        <button
          onClick={() => setColorFilter('putih')}
          className={`p-3 rounded-xl border text-left transition cursor-pointer ${
            colorFilter === 'putih'
              ? 'bg-stone-800 text-white border-stone-900 shadow-xs ring-2 ring-stone-500'
              : 'bg-stone-50 hover:bg-stone-100 text-stone-900 border-stone-300'
          }`}
        >
          <div className="text-[10px] uppercase font-bold tracking-wider text-stone-700 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-white border border-stone-400" /> Putih
          </div>
          <div className="text-xl font-extrabold font-mono-num mt-0.5 text-stone-900">
            {colorCounts['putih'] || 0}
          </div>
          <div className="text-[10px] text-stone-600">Natal, Paskah & Epifani</div>
        </button>

        <button
          onClick={() => setColorFilter('hijau')}
          className={`p-3 rounded-xl border text-left transition cursor-pointer ${
            colorFilter === 'hijau'
              ? 'bg-emerald-900 text-white border-emerald-950 shadow-xs ring-2 ring-emerald-600'
              : 'bg-emerald-50/70 hover:bg-emerald-100/70 text-emerald-950 border-emerald-200'
          }`}
        >
          <div className="text-[10px] uppercase font-bold tracking-wider text-emerald-700 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-600" /> Hijau
          </div>
          <div className="text-xl font-extrabold font-mono-num mt-0.5 text-emerald-950">
            {colorCounts['hijau'] || 0}
          </div>
          <div className="text-[10px] text-emerald-700">Trinitatis (Biasa)</div>
        </button>

        <button
          onClick={() => setColorFilter('merah')}
          className={`p-3 rounded-xl border text-left transition cursor-pointer ${
            colorFilter === 'merah'
              ? 'bg-red-900 text-white border-red-950 shadow-xs ring-2 ring-red-600'
              : 'bg-red-50/70 hover:bg-red-100/70 text-red-950 border-red-200'
          }`}
        >
          <div className="text-[10px] uppercase font-bold tracking-wider text-red-700 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-red-600" /> Merah
          </div>
          <div className="text-xl font-extrabold font-mono-num mt-0.5 text-red-950">
            {colorCounts['merah'] || 0}
          </div>
          <div className="text-[10px] text-red-700">Pentakosta I & II</div>
        </button>

        <button
          onClick={() => setColorFilter('hitam')}
          className={`p-3 rounded-xl border text-left transition cursor-pointer ${
            colorFilter === 'hitam'
              ? 'bg-stone-950 text-white border-black shadow-xs ring-2 ring-stone-700'
              : 'bg-stone-100 hover:bg-stone-200 text-stone-900 border-stone-300'
          }`}
        >
          <div className="text-[10px] uppercase font-bold tracking-wider text-stone-800 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-stone-950" /> Hitam
          </div>
          <div className="text-xl font-extrabold font-mono-num mt-0.5 text-stone-950">
            {colorCounts['hitam'] || 0}
          </div>
          <div className="text-[10px] text-stone-600">Jumat Agung & Ujung Taon</div>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-stone-200/80 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Cari nama minggu (contoh: Advent, Reminiscere, Trinitatis, Maz. 25)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-3 py-2 text-xs border border-stone-300 rounded-xl focus:ring-2 focus:ring-[#0B2545] focus:outline-none min-h-[40px]"
            />
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-xs text-stone-600">
              <Filter className="w-3.5 h-3.5 text-stone-400 shrink-0" />
              <span>Filter:</span>
              <select
                value={colorFilter}
                onChange={(e) => setColorFilter(e.target.value)}
                className="px-3 py-2 text-xs border border-stone-300 rounded-xl bg-white font-medium min-h-[40px]"
              >
                <option value="all">Semua Warna Langgatan</option>
                <option value="ungu">Ungu</option>
                <option value="putih">Putih</option>
                <option value="hijau">Hijau</option>
                <option value="merah">Merah</option>
                <option value="hitam">Hitam</option>
              </select>
            </div>
          </div>
        </div>

        <div className="text-xs text-stone-500 font-medium flex items-center justify-between pt-1">
          <span>
            Menampilkan <strong>{filteredItems.length}</strong> dari {items.length} Minggu Liturgi
          </span>
          {colorFilter !== 'all' && (
            <button
              onClick={() => setColorFilter('all')}
              className="text-blue-700 hover:underline cursor-pointer"
            >
              Hapus filter warna
            </button>
          )}
        </div>
      </div>

      {/* Mobile Card View (< md) */}
      <div className="block md:hidden space-y-3">
        {isLoading ? (
          <div className="p-8 text-center bg-white rounded-2xl border border-stone-200">
            <div className="animate-spin w-7 h-7 border-3 border-blue-700 border-t-transparent rounded-full mx-auto mb-2" />
            <p className="text-xs text-stone-500">Memuat data minggu liturgi...</p>
          </div>
        ) : filteredItems.length > 0 ? (
          filteredItems.map((m) => {
            const badge = getLiturgiColorBadge(m.warna_liturgi);
            return (
              <div
                key={m.id}
                className="p-4 rounded-2xl border border-stone-200/80 bg-white shadow-xs space-y-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-lg bg-stone-100 flex items-center justify-center font-mono text-xs font-bold text-stone-700 shrink-0">
                      #{m.no_urut}
                    </span>
                    <div>
                      <h4 className="text-sm font-extrabold text-stone-900">{m.nama_minggu}</h4>
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border mt-0.5 ${badge.bg}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                        <span>{m.warna_liturgi || 'Hijau'}</span>
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setEditingItem(m)}
                      className="p-2 text-blue-700 hover:bg-blue-50 rounded-lg transition min-h-[36px] min-w-[36px] flex items-center justify-center cursor-pointer"
                      title="Edit Minggu Liturgi"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteItem(m)}
                      className="p-2 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition min-h-[36px] min-w-[36px] flex items-center justify-center cursor-pointer"
                      title="Hapus"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {m.arti_batak && m.arti_batak !== '-' && (
                  <div className="text-xs text-stone-700 italic bg-stone-50 p-2.5 rounded-xl border border-stone-100 font-serif-body">
                    "{m.arti_batak}"
                  </div>
                )}

                {m.arti_indonesia && m.arti_indonesia !== '-' && (
                  <div className="text-xs text-stone-600">
                    <span className="font-semibold text-stone-700">Arti (ID):</span> {m.arti_indonesia}
                  </div>
                )}

                {m.ayat_default && (
                  <div className="text-[11px] text-stone-500 pt-1 border-t border-stone-100">
                    <span className="font-semibold text-stone-600">Nas:</span> {m.ayat_ref_default || '-'}
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="p-8 text-center text-xs text-stone-400 bg-white rounded-2xl border border-stone-200">
            Tidak ada nama minggu liturgi yang cocok dengan pencarian.
          </div>
        )}
      </div>

      {/* Desktop Table View (>= md) */}
      <div className="hidden md:block bg-white rounded-2xl border border-stone-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-[#0B2545] text-white border-b border-amber-500/20 font-bold">
              <tr>
                <th className="py-3 px-3.5 text-center w-16">No</th>
                <th className="py-3 px-3.5 text-left w-52">Nama Minggu HKBP</th>
                <th className="py-3 px-3 text-center w-32">Warna Langgatan</th>
                <th className="py-3 px-3.5 text-left">Arti / Makna (Batak & Indonesia)</th>
                <th className="py-3 px-3 text-left w-48">Topik & Ayat Nas</th>
                <th className="py-3 px-3.5 text-right w-24">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-stone-400">
                    <div className="animate-spin w-7 h-7 border-3 border-blue-700 border-t-transparent rounded-full mx-auto mb-2" />
                    Memuat data minggu liturgi HKBP...
                  </td>
                </tr>
              ) : filteredItems.length > 0 ? (
                filteredItems.map((m) => {
                  const badge = getLiturgiColorBadge(m.warna_liturgi);
                  return (
                    <tr key={m.id} className="hover:bg-stone-50/70 transition">
                      <td className="py-3 px-3.5 text-center font-mono font-bold text-stone-500">
                        {m.no_urut}
                      </td>
                      <td className="py-3 px-3.5">
                        <div className="font-extrabold text-stone-900 text-sm">{m.nama_minggu}</div>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold border ${badge.bg}`}
                        >
                          <span className={`w-2 h-2 rounded-full ${badge.dot}`} />
                          <span>{m.warna_liturgi || 'Hijau'}</span>
                        </span>
                      </td>
                      <td className="py-3 px-3.5">
                        {m.arti_batak && m.arti_batak !== '-' && (
                          <div className="font-semibold text-stone-800 italic font-serif-body">
                            "{m.arti_batak}"
                          </div>
                        )}
                        {m.arti_indonesia && m.arti_indonesia !== '-' && (
                          <div className="text-[11px] text-stone-600 mt-0.5">
                            {m.arti_indonesia}
                          </div>
                        )}
                        {(!m.arti_batak || m.arti_batak === '-') &&
                          (!m.arti_indonesia || m.arti_indonesia === '-') && (
                            <span className="text-stone-400 italic">-</span>
                          )}
                      </td>
                      <td className="py-3 px-3 text-stone-700">
                        {m.topik_default ? (
                          <div className="font-medium text-[11px] line-clamp-1">{m.topik_default}</div>
                        ) : null}
                        {m.ayat_ref_default ? (
                          <span className="text-[10px] text-stone-500 font-bold block">
                            Ref: {m.ayat_ref_default}
                          </span>
                        ) : null}
                        {!m.topik_default && !m.ayat_ref_default && (
                          <span className="text-stone-400 italic">-</span>
                        )}
                      </td>
                      <td className="py-3 px-3.5 text-right space-x-1">
                        <button
                          onClick={() => setEditingItem(m)}
                          className="p-1.5 text-blue-700 hover:bg-blue-100 rounded-lg transition inline-flex items-center cursor-pointer"
                          title="Edit"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteItem(m)}
                          className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition inline-flex items-center cursor-pointer"
                          title="Hapus"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-stone-400 italic">
                    Tidak ada nama minggu liturgi yang cocok dengan pencarian.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Edit / Tambah Minggu Liturgi */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-5 sm:p-6 border border-stone-200 animate-in fade-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3 mb-4">
              <div>
                <h3 className="text-base font-bold text-stone-900">
                  {editingItem.id ? `Edit Minggu: ${editingItem.nama_minggu}` : 'Tambah Minggu Liturgi Baru'}
                </h3>
                <p className="text-xs text-stone-500">
                  Perubahan akan tersimpan di database dan langsung muncul pada menu dropdown warta.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="p-1 text-stone-400 hover:text-stone-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveItem} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                <div className="sm:col-span-4">
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    No. Urut (1-63)
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={100}
                    value={editingItem.no_urut || ''}
                    onChange={(e) =>
                      setEditingItem({ ...editingItem, no_urut: parseInt(e.target.value, 10) })
                    }
                    className="w-full px-3 py-2 text-xs border border-stone-300 rounded-xl font-mono font-bold focus:ring-2 focus:ring-[#0B2545] focus:outline-none min-h-[40px]"
                  />
                </div>

                <div className="sm:col-span-8">
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Nama Minggu HKBP <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editingItem.nama_minggu || ''}
                    onChange={(e) =>
                      setEditingItem({ ...editingItem, nama_minggu: e.target.value })
                    }
                    placeholder="Contoh: Reminiscere, Advent I, Trinitatis"
                    className="w-full px-3 py-2 text-xs border border-stone-300 rounded-xl font-bold focus:ring-2 focus:ring-[#0B2545] focus:outline-none min-h-[40px]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Warna Tutup Langgatan (Altar Cloth)
                </label>
                <select
                  value={editingItem.warna_liturgi || 'Hijau'}
                  onChange={(e) =>
                    setEditingItem({ ...editingItem, warna_liturgi: e.target.value })
                  }
                  className="w-full px-3 py-2 text-xs border border-stone-300 rounded-xl font-semibold bg-white focus:ring-2 focus:ring-[#0B2545] focus:outline-none min-h-[40px]"
                >
                  <option value="Ungu">Ungu (Advent & Prapaskah)</option>
                  <option value="Putih">Putih (Natal, Paskah & Epifani)</option>
                  <option value="Hijau">Hijau (Trinitatis / Masa Biasa)</option>
                  <option value="Merah">Merah (Pentakosta I & II)</option>
                  <option value="Hitam">Hitam (Jumat Agung & Ujung Taon Parhuriaon)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Arti / Makna dalam Bahasa Batak
                </label>
                <textarea
                  rows={2}
                  value={editingItem.arti_batak || ''}
                  onChange={(e) =>
                    setEditingItem({ ...editingItem, arti_batak: e.target.value })
                  }
                  placeholder='Contoh: "Sai Ingot ma angka denggan ni basaM (Psalm. 25:6)"'
                  className="w-full px-3 py-2 text-xs border border-stone-300 rounded-xl focus:ring-2 focus:ring-[#0B2545] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Arti / Makna dalam Bahasa Indonesia
                </label>
                <textarea
                  rows={2}
                  value={editingItem.arti_indonesia || ''}
                  onChange={(e) =>
                    setEditingItem({ ...editingItem, arti_indonesia: e.target.value })
                  }
                  placeholder='Contoh: "Ingatlah segala rahmat-Mu dan kasih setia-Mu ya Tuhan (Maz. 25:6)"'
                  className="w-full px-3 py-2 text-xs border border-stone-300 rounded-xl focus:ring-2 focus:ring-[#0B2545] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Topik Khotbah Standar (Opsional)
                  </label>
                  <input
                    type="text"
                    value={editingItem.topik_default || ''}
                    onChange={(e) =>
                      setEditingItem({ ...editingItem, topik_default: e.target.value })
                    }
                    placeholder="Contoh: Marpanghiramon tu Jahowa"
                    className="w-full px-3 py-2 text-xs border border-stone-300 rounded-xl focus:ring-2 focus:ring-[#0B2545] focus:outline-none min-h-[40px]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Referensi Ayat Nas (Opsional)
                  </label>
                  <input
                    type="text"
                    value={editingItem.ayat_ref_default || ''}
                    onChange={(e) =>
                      setEditingItem({ ...editingItem, ayat_ref_default: e.target.value })
                    }
                    placeholder="Contoh: Psalmen 25:6"
                    className="w-full px-3 py-2 text-xs border border-stone-300 rounded-xl focus:ring-2 focus:ring-[#0B2545] focus:outline-none min-h-[40px]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-4 py-2.5 text-xs font-semibold text-stone-700 hover:bg-stone-100 rounded-xl transition min-h-[40px]"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2.5 bg-[#0B2545] hover:bg-[#123561] text-white rounded-xl text-xs font-extrabold shadow-md transition cursor-pointer disabled:opacity-50 min-h-[40px]"
                >
                  {isSaving ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <MobileConfirmModal
        isOpen={Boolean(confirmState)}
        title={confirmState?.title || ''}
        message={confirmState?.message || ''}
        confirmLabel={confirmState?.confirmLabel}
        tone={confirmState?.tone || 'danger'}
        onConfirm={() => confirmState?.onConfirm()}
        onCancel={() => setConfirmState(null)}
      />
    </div>
  );
};
