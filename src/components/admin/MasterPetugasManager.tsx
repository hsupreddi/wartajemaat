import React, { useState, useEffect } from 'react';
import { Anggota, LingkunganItem, PetugasMaster } from '../../types';
import {
  listMasterPetugas,
  upsertMasterPetugas,
  deleteMasterPetugas,
  batchUpsertMasterPetugas,
  seedDefaultMasterPetugas,
  SUPABASE_MASTER_PETUGAS_SQL,
  JABATAN_PETUGAS_OPTIONS,
  PERAN_PARHOBAS_OPTIONS
} from '../../lib/petugasApi';
import { listAnggota } from '../../lib/jemaatApi';
import { isSupabaseConfigured } from '../../lib/supabase';
import {
  UserCheck,
  Plus,
  Search,
  Edit2,
  Trash2,
  X,
  Save,
  Copy,
  CheckCircle,
  AlertTriangle,
  Users,
  Sparkles,
  Filter
} from 'lucide-react';

interface MasterPetugasManagerProps {
  lingkunganList: LingkunganItem[];
  onNotify?: (type: 'success' | 'error' | 'warning' | 'info', message: string) => void;
}

export const MasterPetugasManager: React.FC<MasterPetugasManagerProps> = ({
  lingkunganList,
  onNotify
}) => {
  const [items, setItems] = useState<PetugasMaster[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [tableMissing, setTableMissing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [jabatanFilter, setJabatanFilter] = useState<string>('all');
  const [peranFilter, setPeranFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'aktif' | 'nonaktif'>('aktif');

  // Edit / Create Modal
  const [editingItem, setEditingItem] = useState<Partial<PetugasMaster> | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Pull from Anggota Modal
  const [isAnggotaModalOpen, setIsAnggotaModalOpen] = useState(false);
  const [anggotaCandidates, setAnggotaCandidates] = useState<Anggota[]>([]);
  const [isLoadingAnggota, setIsLoadingAnggota] = useState(false);
  const [anggotaSearch, setAnggotaSearch] = useState('');
  const [selectedAnggotaIds, setSelectedAnggotaIds] = useState<Set<string>>(new Set());
  const [defaultImportJabatan, setDefaultImportJabatan] = useState('Sintua');
  const [defaultImportPeran, setDefaultImportPeran] = useState('');
  const [isImportingAnggota, setIsImportingAnggota] = useState(false);

  const [copiedSql, setCopiedSql] = useState(false);

  const notify = (type: 'success' | 'error' | 'warning' | 'info', message: string) => {
    if (onNotify) {
      onNotify(type, message);
    }
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      const res = await listMasterPetugas({ activeOnly: false });
      setItems(res.data);
      setTableMissing(Boolean(res.tableMissing));
    } catch (err: any) {
      notify('error', `Gagal memuat daftar sintua & pengurus: ${err?.message || 'Error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredItems = items.filter((p) => {
    const q = searchQuery.trim().toLowerCase();
    const matchSearch =
      !q ||
      p.nama.toLowerCase().includes(q) ||
      (p.jabatan && p.jabatan.toLowerCase().includes(q)) ||
      (p.lingkungan && p.lingkungan.toLowerCase().includes(q)) ||
      (p.peran_default && p.peran_default.toLowerCase().includes(q));

    const matchJabatan =
      jabatanFilter === 'all' ||
      (p.jabatan || '').toLowerCase() === jabatanFilter.toLowerCase();

    const matchPeran =
      peranFilter === 'all' ||
      (p.peran_default || '').toLowerCase() === peranFilter.toLowerCase();

    const matchStatus =
      statusFilter === 'all' ||
      (statusFilter === 'aktif' ? p.aktif !== false : p.aktif === false);

    return matchSearch && matchJabatan && matchPeran && matchStatus;
  });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || !editingItem.nama?.trim()) {
      notify('warning', 'Nama Sintua / Pengurus wajib diisi.');
      return;
    }

    setIsSaving(true);
    try {
      await upsertMasterPetugas({
        ...editingItem,
        nama: editingItem.nama.trim(),
        urutan: editingItem.urutan || items.length + 1
      });
      setEditingItem(null);
      await loadData();
      notify('success', `Data "${editingItem.nama.trim()}" berhasil disimpan ke sistem.`);
    } catch (err: any) {
      notify('error', err?.message || 'Gagal menyimpan data petugas.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleAktif = async (item: PetugasMaster) => {
    try {
      await upsertMasterPetugas({
        ...item,
        aktif: item.aktif === false
      });
      await loadData();
      notify('info', `${item.nama} kini berstatus ${item.aktif === false ? 'Aktif' : 'Non-Aktif'}.`);
    } catch (err: any) {
      notify('error', err?.message || 'Gagal mengubah status.');
    }
  };

  const handleDelete = async (item: PetugasMaster) => {
    if (!confirm(`Hapus "${item.nama}" dari database Sintua & Pengurus?`)) return;
    try {
      await deleteMasterPetugas(item.id);
      await loadData();
      notify('info', `"${item.nama}" telah dihapus.`);
    } catch (err: any) {
      notify('error', err?.message || 'Gagal menghapus data petugas.');
    }
  };

  const handleSeedDefault = async () => {
    try {
      const count = await seedDefaultMasterPetugas();
      await loadData();
      notify('success', `${count} data awal Sintua, Pendeta & Pengurus berhasil disinkronkan.`);
    } catch (err: any) {
      notify('error', err?.message || 'Gagal memuat data awal.');
    }
  };

  const handleCopySql = () => {
    navigator.clipboard?.writeText(SUPABASE_MASTER_PETUGAS_SQL);
    setCopiedSql(true);
    notify('info', 'Skrip SQL tabel master_petugas disalin ke clipboard.');
    setTimeout(() => setCopiedSql(false), 3000);
  };

  const openPullFromAnggota = async () => {
    setIsAnggotaModalOpen(true);
    setIsLoadingAnggota(true);
    setAnggotaSearch('');
    try {
      const res = await listAnggota({ limit: 500, page: 1 });
      const activeMembers = res.data.filter((a) => a.aktif !== false);
      setAnggotaCandidates(activeMembers);

      // Pre-select members whose names have St., CSt., Pdt., Bvr., Gr., GSM and aren't in master_petugas yet
      const existingNames = new Set(items.map((p) => p.nama.trim().toLowerCase()));
      const autoMatched = new Set<string>();
      activeMembers.forEach((a) => {
        const lower = a.nama.trim().toLowerCase();
        const looksLikePelayan = /^(st\.|cst\.|pdt\.|bvr\.|gr\.|gsm\b)/i.test(a.nama.trim());
        if (looksLikePelayan && !existingNames.has(lower)) {
          autoMatched.add(a.id);
        }
      });
      setSelectedAnggotaIds(autoMatched);
    } catch (err: any) {
      notify('error', `Gagal membaca data anggota: ${err?.message || 'Error'}`);
    } finally {
      setIsLoadingAnggota(false);
    }
  };

  const detectJabatanFromName = (nama: string, fallback: string): string => {
    const t = nama.trim();
    if (/^pdt\./i.test(t)) return 'Pendeta Ressort';
    if (/^bvr\./i.test(t)) return 'Bibelvrouw';
    if (/^gr\./i.test(t)) return 'Guru Huria';
    if (/^cst\./i.test(t)) return 'Calon Sintua';
    if (/^st\./i.test(t)) return 'Sintua';
    if (/^gsm\b/i.test(t)) return 'Guru Sekolah Minggu';
    return fallback || 'Sintua';
  };

  const handleConfirmImportFromAnggota = async () => {
    if (selectedAnggotaIds.size === 0) {
      notify('warning', 'Pilih minimal 1 anggota untuk dimasukkan ke daftar Sintua & Pengurus.');
      return;
    }

    setIsImportingAnggota(true);
    try {
      const existingNames = new Set(items.map((p) => p.nama.trim().toLowerCase()));
      const selectedMembers = anggotaCandidates.filter(
        (a) => selectedAnggotaIds.has(a.id) && !existingNames.has(a.nama.trim().toLowerCase())
      );

      if (selectedMembers.length === 0) {
        notify('info', 'Semua anggota yang dipilih sudah terdaftar di database Sintua & Pengurus.');
        setIsAnggotaModalOpen(false);
        return;
      }

      const newItems: PetugasMaster[] = selectedMembers.map((a, idx) => ({
        id: `pet-ang-${a.id}`,
        nama: a.nama.trim(),
        jabatan: detectJabatanFromName(a.nama, defaultImportJabatan),
        peran_default: defaultImportPeran,
        lingkungan: a.wijk || '',
        aktif: true,
        urutan: items.length + idx + 1
      }));

      await batchUpsertMasterPetugas(newItems);
      setIsAnggotaModalOpen(false);
      await loadData();
      notify('success', `${newItems.length} nama berhasil ditambahkan ke database Sintua & Pengurus.`);
    } catch (err: any) {
      notify('error', err?.message || 'Gagal mengimpor dari data anggota.');
    } finally {
      setIsImportingAnggota(false);
    }
  };

  const getJabatanBadgeClass = (jabatan: string) => {
    const j = (jabatan || '').toLowerCase();
    if (j.includes('pendeta')) return 'bg-purple-100 text-purple-900 border-purple-200';
    if (j.includes('bibelvrouw') || j.includes('guru huria') || j.includes('diakones'))
      return 'bg-indigo-100 text-indigo-900 border-indigo-200';
    if (j.includes('calon sintua')) return 'bg-amber-100 text-amber-900 border-amber-200';
    if (j.includes('sintua')) return 'bg-blue-100 text-blue-900 border-blue-200';
    if (j.includes('organis') || j.includes('musik') || j.includes('song'))
      return 'bg-emerald-100 text-emerald-900 border-emerald-200';
    if (j.includes('sekolah minggu') || j.includes('gsm'))
      return 'bg-pink-100 text-pink-900 border-pink-200';
    return 'bg-stone-100 text-stone-800 border-stone-200';
  };

  const activeCount = items.filter((p) => p.aktif !== false).length;

  return (
    <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-xs space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 pb-4">
        <div>
          <h3 className="font-bold text-stone-900 text-sm md:text-base flex items-center gap-2">
            Database Sintua, Pelayan &amp; Pengurus Huria (Parhobas)
            <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-900 rounded font-semibold">
              {activeCount} Aktif / {items.length} Total
            </span>
          </h3>
          <p className="text-xs text-stone-500 mt-0.5">
            Daftar ini muncul otomatis sebagai pilihan dropdown saat mengisi tabel <strong>Parhobas Minggu</strong> di Editor Warta — tinggal klik tanpa mengetik ulang.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={openPullFromAnggota}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-lg text-xs font-bold transition cursor-pointer"
          >
            <Users className="w-3.5 h-3.5" /> Tarik dari Data Anggota
          </button>
          <button
            type="button"
            onClick={handleSeedDefault}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 border border-stone-300 rounded-lg text-xs font-bold transition cursor-pointer"
            title="Muat / sinkronkan daftar contoh awal Pendeta, Sintua, CSt, dan Organis"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-600" /> Sinkronkan Default
          </button>
          <button
            type="button"
            onClick={() =>
              setEditingItem({
                nama: '',
                jabatan: 'Sintua',
                peran_default: 'Pelean',
                lingkungan: lingkunganList[0]?.nama || '',
                aktif: true,
                urutan: items.length + 1
              })
            }
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-bold shadow transition cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Tambah Sintua / Pengurus
          </button>
        </div>
      </div>

      {/* Warning if table is missing on Supabase */}
      {isSupabaseConfigured && tableMissing && (
        <div className="bg-amber-50 border border-amber-300 rounded-lg p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs text-amber-950">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">
                Tabel <code className="bg-amber-100 px-1 rounded">public.master_petugas</code> belum tersedia di Supabase Anda.
              </p>
              <p className="text-amber-800 mt-0.5">
                Saat ini data menggunakan penyimpanan lokal sementara. Salin dan jalankan SQL berikut di Supabase SQL Editor agar tersimpan permanen di cloud.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleCopySql}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition cursor-pointer shrink-0"
          >
            {copiedSql ? <CheckCircle className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedSql ? 'SQL Tersalin' : 'Salin SQL master_petugas'}</span>
          </button>
        </div>
      )}

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-stone-50 p-3 rounded-lg border border-stone-200">
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[240px]">
          <div className="relative w-full max-w-xs">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama sintua / jabatan / wijk..."
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-stone-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-blue-600"
            />
          </div>

          <div className="flex items-center gap-1.5 text-xs text-stone-600">
            <Filter className="w-3.5 h-3.5 text-stone-400" />
            <select
              value={jabatanFilter}
              onChange={(e) => setJabatanFilter(e.target.value)}
              className="px-2.5 py-1.5 border border-stone-300 rounded-lg bg-white text-xs font-medium"
            >
              <option value="all">Semua Jabatan</option>
              {JABATAN_PETUGAS_OPTIONS.map((j) => (
                <option key={j} value={j}>
                  {j}
                </option>
              ))}
            </select>

            <select
              value={peranFilter}
              onChange={(e) => setPeranFilter(e.target.value)}
              className="px-2.5 py-1.5 border border-stone-300 rounded-lg bg-white text-xs font-medium"
            >
              <option value="all">Semua Peran Default</option>
              {PERAN_PARHOBAS_OPTIONS.map((pr) => (
                <option key={pr} value={pr}>
                  Peran: {pr}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-2.5 py-1.5 border border-stone-300 rounded-lg bg-white text-xs font-medium"
            >
              <option value="aktif">Aktif Saja</option>
              <option value="all">Semua Status</option>
              <option value="nonaktif">Non-Aktif</option>
            </select>
          </div>
        </div>

        <div className="text-xs text-stone-500 font-medium">
          Menampilkan {filteredItems.length} dari {items.length} pengurus
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto border border-stone-200 rounded-lg">
        <table className="w-full text-xs">
          <thead className="bg-stone-100 text-stone-800 border-b border-stone-200 font-bold">
            <tr>
              <th className="py-2.5 px-3 text-center w-10">No</th>
              <th className="py-2.5 px-3 text-left">Nama Sintua / Pelayan / Pengurus</th>
              <th className="py-2.5 px-3 text-left w-44">Jabatan</th>
              <th className="py-2.5 px-3 text-left w-36">Peran Utama</th>
              <th className="py-2.5 px-3 text-left w-44">Lingkungan / Wijk</th>
              <th className="py-2.5 px-2 text-center w-24">Status</th>
              <th className="py-2.5 px-3 text-right w-24">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {isLoading ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-stone-500">
                  <div className="animate-spin w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-2" />
                  Memuat database Sintua &amp; Pengurus...
                </td>
              </tr>
            ) : filteredItems.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-stone-500">
                  Belum ada data Sintua / Pengurus yang cocok. Klik <strong>+ Tambah Sintua / Pengurus</strong> atau <strong>Sinkronkan Default</strong>.
                </td>
              </tr>
            ) : (
              filteredItems.map((item, idx) => (
                <tr key={item.id} className="hover:bg-stone-50/80 transition">
                  <td className="py-2 px-3 text-center text-stone-500 font-medium">{idx + 1}.</td>
                  <td className="py-2 px-3 font-bold text-stone-900">{item.nama}</td>
                  <td className="py-2 px-3">
                    <span
                      className={`inline-block px-2 py-0.5 rounded border text-[10px] font-bold ${getJabatanBadgeClass(
                        item.jabatan
                      )}`}
                    >
                      {item.jabatan}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-stone-700 font-medium">
                    {item.peran_default ? (
                      <span className="px-2 py-0.5 rounded bg-stone-100 border border-stone-200 text-[11px] font-semibold">
                        {item.peran_default}
                      </span>
                    ) : (
                      <span className="text-stone-400 italic">Semua Peran</span>
                    )}
                  </td>
                  <td className="py-2 px-3 text-stone-600">{item.lingkungan || '-'}</td>
                  <td className="py-2 px-2 text-center">
                    <button
                      type="button"
                      onClick={() => handleToggleAktif(item)}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer transition ${
                        item.aktif !== false
                          ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                          : 'bg-stone-200 text-stone-600 hover:bg-stone-300'
                      }`}
                      title="Klik untuk aktif/non-aktifkan"
                    >
                      {item.aktif !== false ? 'Aktif' : 'Non-Aktif'}
                    </button>
                  </td>
                  <td className="py-2 px-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => setEditingItem(item)}
                        className="p-1 text-stone-500 hover:text-blue-700 hover:bg-stone-100 rounded transition cursor-pointer"
                        title="Edit"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(item)}
                        className="p-1 text-stone-400 hover:text-rose-600 hover:bg-stone-100 rounded transition cursor-pointer"
                        title="Hapus"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Tambah / Edit Sintua & Pengurus */}
      {editingItem && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-5 shadow-2xl border border-stone-200 space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h4 className="font-bold text-stone-900 text-sm flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-blue-700" />
                <span>{editingItem.id ? 'Edit Data Sintua / Pengurus' : 'Tambah Sintua / Pengurus Baru'}</span>
              </h4>
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="p-1 text-stone-400 hover:text-stone-700 rounded cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-stone-700 mb-1">
                  Nama Lengkap &amp; Gelar <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editingItem.nama || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, nama: e.target.value })}
                  placeholder="Contoh: St. M. Simarmata / Pdt. H. Simanjuntak, S.Th"
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-[10px] text-stone-500 mt-1">
                  Format nama ini yang akan langsung tercetak pada Warta Jemaat (contoh: St., CSt., Pdt., Bvr., Gr., GSM).
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Jabatan</label>
                  <select
                    value={editingItem.jabatan || 'Sintua'}
                    onChange={(e) => setEditingItem({ ...editingItem, jabatan: e.target.value })}
                    className="w-full px-2.5 py-2 border border-stone-300 rounded-lg bg-white"
                  >
                    {JABATAN_PETUGAS_OPTIONS.map((j) => (
                      <option key={j} value={j}>
                        {j}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">Peran Utama (Parhobas)</label>
                  <select
                    value={editingItem.peran_default || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, peran_default: e.target.value })}
                    className="w-full px-2.5 py-2 border border-stone-300 rounded-lg bg-white"
                  >
                    <option value="">-- Fleksibel / Semua --</option>
                    {PERAN_PARHOBAS_OPTIONS.map((pr) => (
                      <option key={pr} value={pr}>
                        {pr}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">Lingkungan / Wijk (Opsional)</label>
                <select
                  value={editingItem.lingkungan || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, lingkungan: e.target.value })}
                  className="w-full px-2.5 py-2 border border-stone-300 rounded-lg bg-white"
                >
                  <option value="">-- Umum / Huria (Semua Lingkungan) --</option>
                  {lingkunganList.map((l) => (
                    <option key={l.id} value={l.nama}>
                      {l.nama}
                    </option>
                  ))}
                </select>
              </div>

              <label className="flex items-center gap-2 pt-1 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={editingItem.aktif !== false}
                  onChange={(e) => setEditingItem({ ...editingItem, aktif: e.target.checked })}
                  className="rounded border-stone-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="font-semibold text-stone-700">
                  Aktif (Tampilkan dalam pilihan dropdown Parhobas)
                </span>
              </label>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-3.5 py-2 border border-stone-300 rounded-lg font-semibold text-stone-700 hover:bg-stone-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg font-bold shadow cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSaving ? 'Menyimpan...' : 'Simpan'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Tarik dari Database Anggota */}
      {isAnggotaModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full p-5 shadow-2xl border border-stone-200 space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div>
                <h4 className="font-bold text-stone-900 text-sm flex items-center gap-2">
                  <Users className="w-4 h-4 text-emerald-700" />
                  <span>Tarik Nama Sintua / Pengurus dari Database Anggota</span>
                </h4>
                <p className="text-[11px] text-stone-500">
                  Pilih jemaat dari tabel anggota untuk langsung dimasukkan ke daftar pilihan Parhobas.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAnggotaModalOpen(false)}
                className="p-1 text-stone-400 hover:text-stone-700 rounded cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
              <div className="relative sm:col-span-1">
                <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  value={anggotaSearch}
                  onChange={(e) => setAnggotaSearch(e.target.value)}
                  placeholder="Cari nama anggota..."
                  className="w-full pl-8 pr-2.5 py-1.5 border border-stone-300 rounded-lg"
                />
              </div>
              <div>
                <select
                  value={defaultImportJabatan}
                  onChange={(e) => setDefaultImportJabatan(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-stone-300 rounded-lg bg-white"
                >
                  {JABATAN_PETUGAS_OPTIONS.map((j) => (
                    <option key={j} value={j}>
                      Jabatan Bawaan: {j}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <select
                  value={defaultImportPeran}
                  onChange={(e) => setDefaultImportPeran(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-stone-300 rounded-lg bg-white"
                >
                  <option value="">Peran: Fleksibel</option>
                  {PERAN_PARHOBAS_OPTIONS.map((pr) => (
                    <option key={pr} value={pr}>
                      Peran Default: {pr}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto border border-stone-200 rounded-lg divide-y divide-stone-100 min-h-[200px]">
              {isLoadingAnggota ? (
                <div className="p-8 text-center text-xs text-stone-500">Memuat daftar anggota...</div>
              ) : (
                anggotaCandidates
                  .filter((a) => {
                    const q = anggotaSearch.trim().toLowerCase();
                    return !q || a.nama.toLowerCase().includes(q) || a.wijk.toLowerCase().includes(q);
                  })
                  .map((a) => {
                    const alreadyAdded = items.some(
                      (p) => p.nama.trim().toLowerCase() === a.nama.trim().toLowerCase()
                    );
                    const checked = selectedAnggotaIds.has(a.id);
                    return (
                      <label
                        key={a.id}
                        className={`flex items-center justify-between gap-2 px-3 py-2 text-xs cursor-pointer hover:bg-stone-50 ${
                          alreadyAdded ? 'opacity-50 bg-stone-50' : ''
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <input
                            type="checkbox"
                            disabled={alreadyAdded}
                            checked={alreadyAdded || checked}
                            onChange={(e) => {
                              const next = new Set(selectedAnggotaIds);
                              if (e.target.checked) next.add(a.id);
                              else next.delete(a.id);
                              setSelectedAnggotaIds(next);
                            }}
                            className="rounded border-stone-300 text-emerald-600"
                          />
                          <div>
                            <div className="font-bold text-stone-900">{a.nama}</div>
                            <div className="text-[10px] text-stone-500">
                              {a.wijk} · Reg {a.registrasi}
                            </div>
                          </div>
                        </div>
                        {alreadyAdded && (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200">
                            Sudah Terdaftar
                          </span>
                        )}
                      </label>
                    );
                  })
              )}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-stone-100 text-xs">
              <span className="text-stone-600 font-medium">
                {selectedAnggotaIds.size} anggota dipilih untuk ditambahkan
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsAnggotaModalOpen(false)}
                  className="px-3.5 py-2 border border-stone-300 rounded-lg font-semibold text-stone-700 hover:bg-stone-50 cursor-pointer"
                >
                  Tutup
                </button>
                <button
                  type="button"
                  disabled={isImportingAnggota || selectedAnggotaIds.size === 0}
                  onClick={handleConfirmImportFromAnggota}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-bold shadow cursor-pointer disabled:opacity-50"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{isImportingAnggota ? 'Menambahkan...' : 'Masukkan ke Daftar Pengurus'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
