import React, { useState, useEffect } from 'react';
import {
  AturanAlokasi,
  KategoriPenerimaanMaster,
  KategoriPengeluaranMaster,
  PosPengeluaranDefault
} from '../../types';
import {
  getMasterKategoriPenerimaan,
  saveMasterKategoriPenerimaan,
  resetMasterKategoriPenerimaan,
  getMasterKategoriPengeluaran,
  saveMasterKategoriPengeluaran,
  resetMasterKategoriPengeluaran
} from '../../lib/wartaStorage';
import {
  Plus,
  Trash2,
  RotateCcw,
  Search,
  DollarSign,
  ArrowUpRight,
  ArrowDownLeft,
  Info
} from 'lucide-react';

interface MasterKeuanganManagerProps {
  onNotify?: (type: 'success' | 'error' | 'warning' | 'info', message: string) => void;
}

export const MasterKeuanganManager: React.FC<MasterKeuanganManagerProps> = ({ onNotify }) => {
  const [subTab, setSubTab] = useState<'penerimaan' | 'pengeluaran'>('penerimaan');
  const [penerimaanList, setPenerimaanList] = useState<KategoriPenerimaanMaster[]>([]);
  const [pengeluaranList, setPengeluaranList] = useState<KategoriPengeluaranMaster[]>([]);
  const [searchPen, setSearchPen] = useState('');
  const [filterKelompok, setFilterKelompok] = useState<'all' | '1.1' | '1.2' | '1.3'>('all');
  const [searchPeng, setSearchPeng] = useState('');

  // Form state: Tambah Penerimaan
  const [newPenKelompok, setNewPenKelompok] = useState<'1.1' | '1.2' | '1.3'>('1.1');
  const [newPenNo, setNewPenNo] = useState('');
  const [newPenUraian, setNewPenUraian] = useState('');
  const [newPenAturan, setNewPenAturan] = useState<AturanAlokasi>('split_45_55');
  const [newPenSentral, setNewPenSentral] = useState(true);
  const [newPenPemb, setNewPenPemb] = useState(false);

  // Form state: Tambah Pengeluaran
  const [newPengUraian, setNewPengUraian] = useState('');
  const [newPengPos, setNewPengPos] = useState<PosPengeluaranDefault>('huria');
  const [newPengSentral, setNewPengSentral] = useState(false);

  useEffect(() => {
    Promise.all([getMasterKategoriPenerimaan(), getMasterKategoriPengeluaran()]).then(
      ([pen, peng]) => {
        setPenerimaanList(pen);
        setPengeluaranList(peng);
      }
    );
  }, []);

  const suggestNextNo = (kelompok: string, list: KategoriPenerimaanMaster[]) => {
    const count = list.filter(
      (it) => it.kelompok === kelompok || (it.no_tampilan || '').startsWith(kelompok)
    ).length;
    return `${kelompok}.${count + 1}`;
  };

  // Handlers Penerimaan
  const handleAddPenerimaan = async (e: React.FormEvent) => {
    e.preventDefault();
    const uraian = newPenUraian.trim();
    if (!uraian) {
      onNotify?.('error', 'Uraian jenis penerimaan wajib diisi.');
      return;
    }

    const noTampilan = newPenNo.trim() || suggestNextNo(newPenKelompok, penerimaanList);
    const newItem: KategoriPenerimaanMaster = {
      id: `k_custom_${Date.now()}`,
      kode: `CUSTOM_PEN_${Date.now()}`,
      kelompok: newPenKelompok,
      no_tampilan: noTampilan,
      urutan: penerimaanList.length + 1,
      uraian,
      aturan_alokasi: newPenAturan,
      is_sentralisasi: newPenSentral,
      dialihkan_ke_pembangunan: newPenPemb
    };

    const updated = [...penerimaanList, newItem];
    setPenerimaanList(updated);
    await saveMasterKategoriPenerimaan(updated);
    setNewPenUraian('');
    setNewPenNo('');
    onNotify?.('success', `Jenis penerimaan "${uraian}" ditambahkan ke Master Pos.`);
  };

  const handleUpdatePenerimaan = async (
    id: string,
    patch: Partial<KategoriPenerimaanMaster>
  ) => {
    const updated = penerimaanList.map((it) => (it.id === id ? { ...it, ...patch } : it));
    setPenerimaanList(updated);
    await saveMasterKategoriPenerimaan(updated);
  };

  const handleDeletePenerimaan = async (id: string, uraian: string) => {
    if (!confirm(`Hapus jenis penerimaan "${uraian}" dari daftar master?`)) return;
    const updated = penerimaanList.filter((it) => it.id !== id);
    setPenerimaanList(updated);
    await saveMasterKategoriPenerimaan(updated);
    onNotify?.('info', `Jenis penerimaan "${uraian}" dihapus dari master.`);
  };

  const handleResetPenerimaan = async () => {
    if (!confirm('Kembalikan daftar Master Jenis Penerimaan ke standar HKBP Hutaraja (47 pos)?')) {
      return;
    }
    const defaults = await resetMasterKategoriPenerimaan();
    setPenerimaanList(defaults);
    onNotify?.('info', 'Master Jenis Penerimaan dikembalikan ke standar HKBP Hutaraja.');
  };

  // Handlers Pengeluaran
  const handleAddPengeluaran = async (e: React.FormEvent) => {
    e.preventDefault();
    const uraian = newPengUraian.trim();
    if (!uraian) {
      onNotify?.('error', 'Uraian jenis pengeluaran wajib diisi.');
      return;
    }

    const newItem: KategoriPengeluaranMaster = {
      id: `kp_custom_${Date.now()}`,
      kode: `CUSTOM_PENG_${Date.now()}`,
      urutan: pengeluaranList.length + 1,
      uraian,
      pos_default: newPengPos,
      is_sentralisasi: newPengSentral
    };

    const updated = [...pengeluaranList, newItem];
    setPengeluaranList(updated);
    await saveMasterKategoriPengeluaran(updated);
    setNewPengUraian('');
    onNotify?.('success', `Jenis pengeluaran "${uraian}" ditambahkan ke Master Pos.`);
  };

  const handleUpdatePengeluaran = async (
    id: string,
    patch: Partial<KategoriPengeluaranMaster>
  ) => {
    const updated = pengeluaranList.map((it) => (it.id === id ? { ...it, ...patch } : it));
    setPengeluaranList(updated);
    await saveMasterKategoriPengeluaran(updated);
  };

  const handleDeletePengeluaran = async (id: string, uraian: string) => {
    if (!confirm(`Hapus jenis pengeluaran "${uraian}" dari daftar master?`)) return;
    const updated = pengeluaranList.filter((it) => it.id !== id);
    setPengeluaranList(updated);
    await saveMasterKategoriPengeluaran(updated);
    onNotify?.('info', `Jenis pengeluaran "${uraian}" dihapus dari master.`);
  };

  const handleResetPengeluaran = async () => {
    if (!confirm('Kembalikan daftar Master Jenis Pengeluaran ke standar default?')) {
      return;
    }
    const defaults = await resetMasterKategoriPengeluaran();
    setPengeluaranList(defaults);
    onNotify?.('info', 'Master Jenis Pengeluaran dikembalikan ke daftar default.');
  };

  const filteredPenerimaan = penerimaanList.filter((item) => {
    const matchKelompok =
      filterKelompok === 'all' ||
      item.kelompok === filterKelompok ||
      (item.no_tampilan || '').startsWith(filterKelompok);
    const q = searchPen.trim().toLowerCase();
    const matchSearch =
      !q ||
      item.uraian.toLowerCase().includes(q) ||
      (item.no_tampilan || '').toLowerCase().includes(q);
    return matchKelompok && matchSearch;
  });

  const filteredPengeluaran = pengeluaranList.filter((item) => {
    const q = searchPeng.trim().toLowerCase();
    return !q || item.uraian.toLowerCase().includes(q);
  });

  return (
    <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-xs space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 pb-4">
        <div>
          <h3 className="font-bold text-stone-900 text-sm md:text-base flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-emerald-700" />
            <span>Master Pos Penerimaan & Pengeluaran (Fleksibel)</span>
          </h3>
          <p className="text-xs text-stone-500 mt-0.5">
            Admin dapat menambah, mengubah, atau menghapus item jenis penerimaan dan pengeluaran kapan saja.
            Warta baru otomatis mewarisi daftar ini, dan pos penerimaan bernilai Rp 0 otomatis disembunyikan saat cetak warta.
          </p>
        </div>

        <div className="flex items-center gap-1.5 bg-stone-100 p-1 rounded-lg border border-stone-200">
          <button
            type="button"
            onClick={() => setSubTab('penerimaan')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
              subTab === 'penerimaan'
                ? 'bg-emerald-800 text-white shadow-xs'
                : 'text-stone-700 hover:bg-stone-200/70'
            }`}
          >
            <ArrowDownLeft className="w-3.5 h-3.5" />
            <span>Jenis Penerimaan ({penerimaanList.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setSubTab('pengeluaran')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
              subTab === 'pengeluaran'
                ? 'bg-rose-800 text-white shadow-xs'
                : 'text-stone-700 hover:bg-stone-200/70'
            }`}
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>Jenis Pengeluaran ({pengeluaranList.length})</span>
          </button>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50/70 border border-blue-200 rounded-lg px-3.5 py-2.5 flex items-start gap-2.5 text-xs text-blue-950">
        <Info className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
        <div>
          Perubahan di sini berlaku sebagai template utama untuk pembuatan warta baru. Untuk warta yang sudah dibuat,
          Anda juga dapat langsung menambah atau memilih item master terbaru langsung di Editor Keuangan (Halaman 3).
        </div>
      </div>

      {/* ========================================================= */}
      {/* SUB-TAB 1: MASTER JENIS PENERIMAAN */}
      {/* ========================================================= */}
      {subTab === 'penerimaan' && (
        <div className="space-y-4">
          {/* Form Tambah Item Jenis Penerimaan */}
          <form
            onSubmit={handleAddPenerimaan}
            className="p-4 bg-emerald-50/50 border border-emerald-200 rounded-xl space-y-3"
          >
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-emerald-950 uppercase tracking-wide flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-emerald-700" />
                <span>Tambah Item Jenis Penerimaan Baru</span>
              </h4>
              <button
                type="button"
                onClick={handleResetPenerimaan}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-stone-600 hover:text-stone-900 px-2 py-1 rounded border border-stone-300 bg-white cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" /> Reset Standar Hutaraja
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-2.5 text-xs items-end">
              <div className="lg:col-span-2">
                <label className="block text-[11px] font-bold text-stone-700 mb-1">Kelompok</label>
                <select
                  value={newPenKelompok}
                  onChange={(e) => {
                    const k = e.target.value as '1.1' | '1.2' | '1.3';
                    setNewPenKelompok(k);
                    if (k === '1.3') {
                      setNewPenAturan('transitori');
                      setNewPenSentral(false);
                    }
                  }}
                  className="w-full px-2.5 py-1.5 border border-stone-300 rounded-lg bg-white font-medium"
                >
                  <option value="1.1">1.1 Kebaktian Umum</option>
                  <option value="1.2">1.2 Persembahan Lainnya</option>
                  <option value="1.3">1.3 Transitori</option>
                </select>
              </div>

              <div className="lg:col-span-1">
                <label className="block text-[11px] font-bold text-stone-700 mb-1">No. Pos</label>
                <input
                  type="text"
                  value={newPenNo}
                  onChange={(e) => setNewPenNo(e.target.value)}
                  placeholder={suggestNextNo(newPenKelompok, penerimaanList)}
                  className="w-full px-2 py-1.5 border border-stone-300 rounded-lg bg-white font-mono text-center"
                />
              </div>

              <div className="lg:col-span-4">
                <label className="block text-[11px] font-bold text-stone-700 mb-1">
                  Uraian / Nama Jenis Penerimaan <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  value={newPenUraian}
                  onChange={(e) => setNewPenUraian(e.target.value)}
                  placeholder="Contoh: Pelean Partangiangan Khusus / Kas Diakonia..."
                  className="w-full px-2.5 py-1.5 border border-stone-300 rounded-lg bg-white"
                />
              </div>

              <div className="lg:col-span-2">
                <label className="block text-[11px] font-bold text-stone-700 mb-1">Pos Kas Tujuan</label>
                <select
                  value={newPenAturan}
                  onChange={(e) => setNewPenAturan(e.target.value as AturanAlokasi)}
                  className="w-full px-2 py-1.5 border border-stone-300 rounded-lg bg-white"
                >
                  <option value="split_45_55">Kas Huria (Rutin)</option>
                  <option value="huria">Kas Huria (100%)</option>
                  <option value="sosial">Sosial Huria</option>
                  <option value="pembangunan">Pembangunan</option>
                  <option value="transitori">Transitori</option>
                </select>
              </div>

              <div className="lg:col-span-2">
                <label className="block text-[11px] font-bold text-stone-700 mb-1">Sentralisasi?</label>
                <select
                  value={newPenSentral ? 'ya' : 'tidak'}
                  onChange={(e) => setNewPenSentral(e.target.value === 'ya')}
                  className={`w-full px-2 py-1.5 border rounded-lg font-bold ${
                    newPenSentral
                      ? 'bg-amber-100 text-amber-900 border-amber-300'
                      : 'bg-white text-stone-700 border-stone-300'
                  }`}
                >
                  <option value="ya">Ya (Setor 55%)</option>
                  <option value="tidak">Tidak (0%)</option>
                </select>
              </div>

              <div className="lg:col-span-1">
                <button
                  type="submit"
                  className="w-full px-3 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-lg font-bold inline-flex items-center justify-center gap-1 shadow-xs cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Tambah
                </button>
              </div>
            </div>

            <label className="inline-flex items-center gap-2 text-[11px] text-stone-700 cursor-pointer">
              <input
                type="checkbox"
                checked={newPenPemb}
                onChange={(e) => setNewPenPemb(e.target.checked)}
                className="rounded border-stone-300 text-emerald-700"
              />
              <span>Alihkan porsi lokal (45% / 100%) ke Kas Pembangunan (misal Pelean 1B)</span>
            </label>
          </form>

          {/* Filter & Search Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 bg-stone-50 p-2.5 rounded-lg border border-stone-200">
            <div className="flex flex-wrap gap-1.5">
              {(['all', '1.1', '1.2', '1.3'] as const).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setFilterKelompok(k)}
                  className={`px-2.5 py-1 rounded text-xs font-semibold transition cursor-pointer ${
                    filterKelompok === k
                      ? 'bg-[#0B2545] text-white'
                      : 'bg-white text-stone-700 border border-stone-200 hover:bg-stone-100'
                  }`}
                >
                  {k === 'all'
                    ? `Semua (${penerimaanList.length})`
                    : k === '1.1'
                    ? '1.1 Kebaktian'
                    : k === '1.2'
                    ? '1.2 Persembahan Lain'
                    : '1.3 Transitori'}
                </button>
              ))}
            </div>

            <div className="relative min-w-[200px]">
              <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-2" />
              <input
                type="text"
                placeholder="Cari uraian atau nomor pos..."
                value={searchPen}
                onChange={(e) => setSearchPen(e.target.value)}
                className="w-full pl-8 pr-3 py-1 text-xs border border-stone-300 rounded-lg bg-white"
              />
            </div>
          </div>

          {/* Table Master Penerimaan */}
          <div className="overflow-x-auto border border-stone-200 rounded-lg max-h-[480px] overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="bg-stone-100 text-stone-800 border-b border-stone-200 font-bold sticky top-0 z-10">
                <tr>
                  <th className="py-2 px-2 text-center w-20">No. Pos</th>
                  <th className="py-2 px-2 text-left w-28">Kelompok</th>
                  <th className="py-2 px-2 text-left">Uraian Jenis Penerimaan</th>
                  <th className="py-2 px-2 text-left w-36">Pos Kas Tujuan</th>
                  <th className="py-2 px-2 text-center w-28">Sentralisasi?</th>
                  <th className="py-2 px-2 text-center w-24">Ke Pemb?</th>
                  <th className="py-2 px-2 text-center w-16">Hapus</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredPenerimaan.map((item) => {
                  const isAutoLocked = item.kode === 'PEL_TAON' || item.kode === 'HAM_LAIN';
                  const isSentral =
                    item.is_sentralisasi !== undefined
                      ? item.is_sentralisasi
                      : item.aturan_alokasi === 'split_45_55';
                  return (
                    <tr key={item.id} className="hover:bg-stone-50">
                      <td className="py-1.5 px-2">
                        <input
                          type="text"
                          value={item.no_tampilan || ''}
                          onChange={(e) =>
                            handleUpdatePenerimaan(item.id, { no_tampilan: e.target.value })
                          }
                          className="w-full px-1.5 py-1 border border-stone-200 rounded text-center font-mono text-[11px]"
                        />
                      </td>
                      <td className="py-1.5 px-2">
                        <select
                          value={item.kelompok || '1.1'}
                          onChange={(e) =>
                            handleUpdatePenerimaan(item.id, { kelompok: e.target.value })
                          }
                          className="w-full px-1.5 py-1 border border-stone-200 rounded bg-white text-[11px]"
                        >
                          <option value="1.1">1.1 Kebaktian</option>
                          <option value="1.2">1.2 Lainnya</option>
                          <option value="1.3">1.3 Transitori</option>
                        </select>
                      </td>
                      <td className="py-1.5 px-2">
                        <input
                          type="text"
                          value={item.uraian}
                          onChange={(e) =>
                            handleUpdatePenerimaan(item.id, { uraian: e.target.value })
                          }
                          className="w-full px-2 py-1 border border-stone-200 rounded font-medium text-stone-900"
                        />
                      </td>
                      <td className="py-1.5 px-2">
                        <select
                          disabled={isAutoLocked && item.kode === 'HAM_LAIN'}
                          value={item.aturan_alokasi}
                          onChange={(e) =>
                            handleUpdatePenerimaan(item.id, {
                              aturan_alokasi: e.target.value as AturanAlokasi
                            })
                          }
                          className="w-full px-1.5 py-1 border border-stone-200 rounded bg-white text-[11px]"
                        >
                          <option value="split_45_55">Kas Huria (Rutin)</option>
                          <option value="huria">Kas Huria (100%)</option>
                          <option value="sosial">Sosial Huria</option>
                          <option value="pembangunan">Pembangunan</option>
                          <option value="transitori">Transitori</option>
                          <option value="manual">Manual Multi-Pos</option>
                        </select>
                      </td>
                      <td className="py-1.5 px-2 text-center">
                        <select
                          disabled={item.aturan_alokasi === 'manual'}
                          value={isSentral ? 'ya' : 'tidak'}
                          onChange={(e) =>
                            handleUpdatePenerimaan(item.id, {
                              is_sentralisasi: e.target.value === 'ya'
                            })
                          }
                          className={`px-2 py-1 rounded border text-[11px] font-bold cursor-pointer ${
                            isSentral
                              ? 'bg-amber-100 text-amber-900 border-amber-300'
                              : 'bg-stone-100 text-stone-700 border-stone-200'
                          }`}
                        >
                          <option value="ya">Ya (55%)</option>
                          <option value="tidak">Tidak</option>
                        </select>
                      </td>
                      <td className="py-1.5 px-2 text-center">
                        <button
                          type="button"
                          onClick={() =>
                            handleUpdatePenerimaan(item.id, {
                              dialihkan_ke_pembangunan: !item.dialihkan_ke_pembangunan
                            })
                          }
                          className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer ${
                            item.dialihkan_ke_pembangunan
                              ? 'bg-amber-600 text-white'
                              : 'bg-stone-100 text-stone-500 hover:bg-stone-200'
                          }`}
                        >
                          {item.dialihkan_ke_pembangunan ? 'Ke Pemb' : 'Normal'}
                        </button>
                      </td>
                      <td className="py-1.5 px-2 text-center">
                        <button
                          type="button"
                          disabled={isAutoLocked}
                          onClick={() => handleDeletePenerimaan(item.id, item.uraian)}
                          className={`p-1 rounded transition ${
                            isAutoLocked
                              ? 'text-stone-300 cursor-not-allowed'
                              : 'text-stone-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer'
                          }`}
                          title={
                            isAutoLocked
                              ? 'Pos terhubung ke Rincian B/C'
                              : 'Hapus item penerimaan ini'
                          }
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* SUB-TAB 2: MASTER JENIS PENGELUARAN */}
      {/* ========================================================= */}
      {subTab === 'pengeluaran' && (
        <div className="space-y-4">
          {/* Form Tambah Item Jenis Pengeluaran */}
          <form
            onSubmit={handleAddPengeluaran}
            className="p-4 bg-rose-50/50 border border-rose-200 rounded-xl space-y-3"
          >
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-rose-950 uppercase tracking-wide flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-rose-700" />
                <span>Tambah Item Jenis Pengeluaran Baru</span>
              </h4>
              <button
                type="button"
                onClick={handleResetPengeluaran}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-stone-600 hover:text-stone-900 px-2 py-1 rounded border border-stone-300 bg-white cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" /> Reset Default
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 text-xs items-end">
              <div className="sm:col-span-6">
                <label className="block text-[11px] font-bold text-stone-700 mb-1">
                  Uraian / Nama Jenis Pengeluaran <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  value={newPengUraian}
                  onChange={(e) => setNewPengUraian(e.target.value)}
                  placeholder="Contoh: Belanja Sound System / Bantuan Sosial Pendidikan..."
                  className="w-full px-2.5 py-1.5 border border-stone-300 rounded-lg bg-white"
                />
              </div>

              <div className="sm:col-span-3">
                <label className="block text-[11px] font-bold text-stone-700 mb-1">Pos Dana Default</label>
                <select
                  value={newPengPos}
                  onChange={(e) => setNewPengPos(e.target.value as PosPengeluaranDefault)}
                  className="w-full px-2.5 py-1.5 border border-stone-300 rounded-lg bg-white"
                >
                  <option value="huria">Kas Huria</option>
                  <option value="sosial">Sosial Huria</option>
                  <option value="pembangunan">Pembangunan</option>
                  <option value="transitori">Transitori</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-stone-700 mb-1">Sentralisasi?</label>
                <select
                  value={newPengSentral ? 'ya' : 'tidak'}
                  onChange={(e) => setNewPengSentral(e.target.value === 'ya')}
                  className={`w-full px-2 py-1.5 border rounded-lg font-bold ${
                    newPengSentral
                      ? 'bg-amber-100 text-amber-900 border-amber-300'
                      : 'bg-white text-stone-700 border-stone-300'
                  }`}
                >
                  <option value="tidak">Tidak</option>
                  <option value="ya">Ya (55%)</option>
                </select>
              </div>

              <div className="sm:col-span-1">
                <button
                  type="submit"
                  className="w-full px-3 py-1.5 bg-rose-800 hover:bg-rose-900 text-white rounded-lg font-bold inline-flex items-center justify-center gap-1 shadow-xs cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Tambah
                </button>
              </div>
            </div>
          </form>

          {/* Search Bar */}
          <div className="flex items-center justify-between gap-2 bg-stone-50 p-2.5 rounded-lg border border-stone-200">
            <span className="text-xs font-semibold text-stone-600">
              Menampilkan {filteredPengeluaran.length} jenis pengeluaran terdaftar
            </span>
            <div className="relative min-w-[200px]">
              <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-2" />
              <input
                type="text"
                placeholder="Cari uraian pengeluaran..."
                value={searchPeng}
                onChange={(e) => setSearchPeng(e.target.value)}
                className="w-full pl-8 pr-3 py-1 text-xs border border-stone-300 rounded-lg bg-white"
              />
            </div>
          </div>

          {/* Table Master Pengeluaran */}
          <div className="overflow-x-auto border border-stone-200 rounded-lg">
            <table className="w-full text-xs">
              <thead className="bg-stone-100 text-stone-800 border-b border-stone-200 font-bold">
                <tr>
                  <th className="py-2 px-2 text-center w-12">No</th>
                  <th className="py-2 px-2 text-left">Uraian Jenis Pengeluaran</th>
                  <th className="py-2 px-2 text-left w-40">Pos Dana Default</th>
                  <th className="py-2 px-2 text-center w-32">Sentralisasi?</th>
                  <th className="py-2 px-2 text-center w-16">Hapus</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredPengeluaran.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-stone-50">
                    <td className="py-1.5 px-2 text-center text-stone-500 font-medium">{idx + 1}.</td>
                    <td className="py-1.5 px-2">
                      <input
                        type="text"
                        value={item.uraian}
                        onChange={(e) =>
                          handleUpdatePengeluaran(item.id, { uraian: e.target.value })
                        }
                        className="w-full px-2 py-1 border border-stone-200 rounded font-medium text-stone-900"
                      />
                    </td>
                    <td className="py-1.5 px-2">
                      <select
                        value={item.pos_default}
                        onChange={(e) =>
                          handleUpdatePengeluaran(item.id, {
                            pos_default: e.target.value as PosPengeluaranDefault
                          })
                        }
                        className="w-full px-2 py-1 border border-stone-200 rounded bg-white"
                      >
                        <option value="huria">Kas Huria</option>
                        <option value="sosial">Sosial Huria</option>
                        <option value="pembangunan">Pembangunan</option>
                        <option value="transitori">Transitori</option>
                      </select>
                    </td>
                    <td className="py-1.5 px-2 text-center">
                      <select
                        value={item.is_sentralisasi ? 'ya' : 'tidak'}
                        onChange={(e) =>
                          handleUpdatePengeluaran(item.id, {
                            is_sentralisasi: e.target.value === 'ya'
                          })
                        }
                        className={`px-2 py-1 rounded border text-[11px] font-bold cursor-pointer ${
                          item.is_sentralisasi
                            ? 'bg-amber-100 text-amber-900 border-amber-300'
                            : 'bg-stone-100 text-stone-700 border-stone-200'
                        }`}
                      >
                        <option value="tidak">Tidak</option>
                        <option value="ya">Ya (55%)</option>
                      </select>
                    </td>
                    <td className="py-1.5 px-2 text-center">
                      <button
                        type="button"
                        onClick={() => handleDeletePengeluaran(item.id, item.uraian)}
                        className="p-1 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded transition cursor-pointer"
                        title="Hapus item pengeluaran"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
