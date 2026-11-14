import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Papa from 'papaparse';
import {
  Anggota,
  Keluarga,
  JadwalTetapItem,
  LingkunganItem,
  PengaturanHuria
} from '../types';
import {
  getJadwalTetap,
  saveJadwalTetap,
  getLingkungan,
  saveLingkungan,
  getPengaturan,
  savePengaturan
} from '../lib/wartaStorage';
import {
  listAnggota,
  listKeluarga,
  listAllKeluargaLookup,
  KeluargaLookupItem,
  upsertAnggota,
  deleteAnggota,
  upsertKeluarga,
  deleteKeluarga,
  batchUpsertKeluarga,
  batchUpsertAnggota,
  setJemaatNotificationHandler
} from '../lib/jemaatApi';
import {
  buildKeluargaTemplateCsv,
  buildAnggotaTemplateCsv,
  downloadCsvFile,
  normalizeCsvHeader,
  cleanRegistrasiValue,
  normalizeDateValue
} from '../lib/jemaatTemplates';
import { isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import {
  Users,
  Clock,
  MapPin,
  Settings,
  Plus,
  Trash2,
  Save,
  ArrowLeft,
  CheckCircle,
  UploadCloud,
  FileSpreadsheet,
  AlertTriangle,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Edit2,
  X,
  Info,
  Home,
  AlertCircle,
  Calendar,
  DollarSign,
  Download
} from 'lucide-react';
import { KopLogoEditor } from '../components/admin/KopLogoEditor';
import { MingguLiturgiManager } from '../components/admin/MingguLiturgiManager';
import { MasterKeuanganManager } from '../components/admin/MasterKeuanganManager';

export const MasterDataPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { currentRole, canManageSettings } = useAuth();

  const initialTab = searchParams.get('tab');
  const validTabs = ['anggota', 'keluarga', 'minggu', 'keuangan', 'impor', 'jadwal', 'lingkungan', 'pengaturan'] as const;
  const [activeTab, setActiveTab] = useState<
    'anggota' | 'keluarga' | 'minggu' | 'keuangan' | 'impor' | 'jadwal' | 'lingkungan' | 'pengaturan'
  >(validTabs.includes(initialTab as any) ? (initialTab as any) : 'anggota');

  // Supabase / Demo Jemaat State
  const [anggotaList, setAnggotaList] = useState<Anggota[]>([]);
  const [anggotaTotal, setAnggotaTotal] = useState(0);
  const [anggotaPage, setAnggotaPage] = useState(1);
  const [anggotaSearch, setAnggotaSearch] = useState('');
  const [anggotaWijkFilter, setAnggotaWijkFilter] = useState('all');
  const [isAnggotaLoading, setIsAnggotaLoading] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(!isSupabaseConfigured);

  // Keluarga State
  const [keluargaList, setKeluargaList] = useState<Keluarga[]>([]);
  const [keluargaTotal, setKeluargaTotal] = useState(0);
  const [keluargaPage, setKeluargaPage] = useState(1);
  const [keluargaSearch, setKeluargaSearch] = useState('');
  const [keluargaWijkFilter, setKeluargaWijkFilter] = useState('all');
  const [isKeluargaLoading, setIsKeluargaLoading] = useState(false);

  // Lookup all Keluarga for Anggota modal & cross-checking
  const [keluargaLookup, setKeluargaLookup] = useState<KeluargaLookupItem[]>([]);

  // Other Master Data
  const [jadwalList, setJadwalList] = useState<JadwalTetapItem[]>([]);
  const [lingkunganList, setLingkunganList] = useState<LingkunganItem[]>([]);
  const [pengaturan, setPengaturan] = useState<PengaturanHuria | null>(null);

  // Modals
  const [editingAnggota, setEditingAnggota] = useState<Partial<Anggota> | null>(null);
  const [isNewAnggotaModal, setIsNewAnggotaModal] = useState<boolean>(false);
  const [autoNamaKK, setAutoNamaKK] = useState<string>('');
  const [editingKeluarga, setEditingKeluarga] = useState<Partial<Keluarga> | null>(null);
  const [originalKeluargaRegistrasi, setOriginalKeluargaRegistrasi] = useState<string | null>(null);
  const [isSavingEntity, setIsSavingEntity] = useState(false);

  // CSV Import State
  const [keluargaCsvFile, setKeluargaCsvFile] = useState<File | null>(null);
  const [keluargaParsed, setKeluargaParsed] = useState<Keluarga[]>([]);
  const [anggotaCsvFile, setAnggotaCsvFile] = useState<File | null>(null);
  const [anggotaParsed, setAnggotaParsed] = useState<Anggota[]>([]);
  const [csvWarnings, setCsvWarnings] = useState<string[]>([]);
  const [importProgress, setImportProgress] = useState<{
    stage: string;
    percent: number;
    currentBatch: number;
    totalBatches: number;
  } | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  // Toast
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'warning' | 'info'; message: string } | null>(null);

  const showToast = (type: 'success' | 'error' | 'warning' | 'info', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    setJemaatNotificationHandler((type, msg) => {
      showToast(type, msg);
    });
    return () => setJemaatNotificationHandler(null);
  }, []);

  // Fetch Anggota
  const fetchAnggota = async () => {
    setIsAnggotaLoading(true);
    try {
      const res = await listAnggota({
        page: anggotaPage,
        limit: 50,
        q: anggotaSearch,
        wijk: anggotaWijkFilter
      });
      setAnggotaList(res.data);
      setAnggotaTotal(res.totalCount);
      setIsDemoMode(res.isDemo);
    } catch (err: any) {
      showToast('error', `Gagal memuat daftar anggota: ${err.message}`);
    } finally {
      setIsAnggotaLoading(false);
    }
  };

  // Fetch Keluarga
  const fetchKeluarga = async () => {
    setIsKeluargaLoading(true);
    try {
      const res = await listKeluarga({
        page: keluargaPage,
        limit: 50,
        q: keluargaSearch,
        wijk: keluargaWijkFilter
      });
      setKeluargaList(res.data);
      setKeluargaTotal(res.totalCount);
      setIsDemoMode(res.isDemo);
    } catch (err: any) {
      showToast('error', `Gagal memuat data keluarga: ${err.message}`);
    } finally {
      setIsKeluargaLoading(false);
    }
  };

  // Fetch Keluarga Lookup
  const fetchKeluargaLookup = async () => {
    try {
      const items = await listAllKeluargaLookup();
      setKeluargaLookup(items);
    } catch {
      // Non-fatal
    }
  };

  useEffect(() => {
    fetchAnggota();
  }, [anggotaPage, anggotaWijkFilter]);

  useEffect(() => {
    fetchKeluarga();
  }, [keluargaPage, keluargaWijkFilter]);

  // Load other master data & keluarga lookup on mount
  useEffect(() => {
    fetchKeluargaLookup();
    Promise.all([getJadwalTetap(), getLingkungan(), getPengaturan()])
      .then(([jadwals, lings, pengs]) => {
        setJadwalList(jadwals);
        setLingkunganList(lings);
        setPengaturan(pengs);
      })
      .catch((err) => {
        console.warn('Gagal memuat master data:', err);
      });
  }, []);

  // Debounced search for Anggota
  useEffect(() => {
    const timer = setTimeout(() => {
      setAnggotaPage(1);
      fetchAnggota();
    }, 350);
    return () => clearTimeout(timer);
  }, [anggotaSearch]);

  // Debounced search for Keluarga
  useEffect(() => {
    const timer = setTimeout(() => {
      setKeluargaPage(1);
      fetchKeluarga();
    }, 350);
    return () => clearTimeout(timer);
  }, [keluargaSearch]);

  // Anggota Save / Upsert
  const handleSaveAnggota = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAnggota?.nama?.trim() || !editingAnggota?.registrasi?.trim()) {
      showToast('error', 'Nama Lengkap dan No. Registrasi KK wajib diisi.');
      return;
    }
    setIsSavingEntity(true);
    try {
      const entityToSave: Partial<Anggota> & { nama: string; registrasi: string } = {
        id: editingAnggota.id,
        registrasi: String(editingAnggota.registrasi).trim(),
        nama: editingAnggota.nama.trim(),
        jenis_kelamin: editingAnggota.jenis_kelamin || 'L',
        tgl_lahir: editingAnggota.tgl_lahir ? editingAnggota.tgl_lahir.trim() : null,
        tgl_baptis: editingAnggota.tgl_baptis ? editingAnggota.tgl_baptis.trim() : null,
        tgl_sidi: editingAnggota.tgl_sidi ? editingAnggota.tgl_sidi.trim() : null,
        hub_keluarga: editingAnggota.hub_keluarga || 'Anggota',
        wijk: editingAnggota.wijk || lingkunganList[0]?.nama || 'Lingkungan Letare',
        aktif: editingAnggota.aktif !== false
      };

      await upsertAnggota(entityToSave, {
        autoCreateKeluargaNamaKK: autoNamaKK.trim() || undefined
      });
      setEditingAnggota(null);
      setAutoNamaKK('');
      await Promise.all([fetchAnggota(), fetchKeluarga(), fetchKeluargaLookup()]);
      showToast('success', 'Data anggota jemaat berhasil disimpan.');
    } catch (err: any) {
      showToast('error', err?.message || 'Gagal menyimpan data anggota.');
    } finally {
      setIsSavingEntity(false);
    }
  };

  // Anggota Delete
  const handleDeleteAnggota = async (id: string, nama: string) => {
    if (!confirm(`Hapus anggota jemaat "${nama}"?`)) return;
    try {
      await deleteAnggota(id);
      await Promise.all([fetchAnggota(), fetchKeluarga(), fetchKeluargaLookup()]);
      showToast('success', `Data anggota "${nama}" berhasil dihapus.`);
    } catch (err: any) {
      showToast('error', err?.message || 'Gagal menghapus anggota.');
    }
  };

  // Keluarga Save / Upsert
  const handleSaveKeluarga = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingKeluarga?.registrasi?.trim() || !editingKeluarga?.nama_kk?.trim()) {
      showToast('error', 'No. Registrasi KK dan Nama Kepala Keluarga wajib diisi.');
      return;
    }
    setIsSavingEntity(true);
    try {
      const entityToSave: Keluarga = {
        registrasi: String(editingKeluarga.registrasi).trim(),
        nama_kk: editingKeluarga.nama_kk.trim(),
        kk_wafat: Boolean(editingKeluarga.kk_wafat),
        wijk: editingKeluarga.wijk || lingkunganList[0]?.nama || 'Lingkungan Letare',
        jalan: editingKeluarga.jalan || '',
        hp: editingKeluarga.hp || '',
        jumlah_anggota: Math.max(0, Number(editingKeluarga.jumlah_anggota) || 0)
      };

      await upsertKeluarga(entityToSave, {
        originalRegistrasi: originalKeluargaRegistrasi || undefined
      });
      setEditingKeluarga(null);
      setOriginalKeluargaRegistrasi(null);
      await Promise.all([fetchKeluarga(), fetchAnggota(), fetchKeluargaLookup()]);
      showToast('success', 'Data keluarga berhasil disimpan.');
    } catch (err: any) {
      showToast('error', err?.message || 'Gagal menyimpan data keluarga.');
    } finally {
      setIsSavingEntity(false);
    }
  };

  // Keluarga Delete
  const handleDeleteKeluarga = async (registrasi: string, nama_kk: string) => {
    if (!confirm(`Hapus keluarga "${nama_kk}" (${registrasi})? Seluruh anggota dengan nomor registrasi ini juga akan terhapus.`)) return;
    try {
      await deleteKeluarga(registrasi);
      await Promise.all([fetchKeluarga(), fetchAnggota(), fetchKeluargaLookup()]);
      showToast('success', `Keluarga "${nama_kk}" berhasil dihapus.`);
    } catch (err: any) {
      showToast('error', err?.message || 'Gagal menghapus keluarga.');
    }
  };

  // Download CSV Template Handlers
  const handleDownloadKeluargaTemplate = (delimiter: ',' | ';' = ',') => {
    downloadCsvFile(
      delimiter === ';' ? 'template_keluarga_excel_id.csv' : 'template_keluarga.csv',
      buildKeluargaTemplateCsv(delimiter)
    );
    showToast('success', 'Template CSV Data Keluarga berhasil diunduh.');
  };

  const handleDownloadAnggotaTemplate = (delimiter: ',' | ';' = ',') => {
    downloadCsvFile(
      delimiter === ';' ? 'template_anggota_excel_id.csv' : 'template_anggota.csv',
      buildAnggotaTemplateCsv(delimiter)
    );
    showToast('success', 'Template CSV Data Anggota Jemaat berhasil diunduh.');
  };

  // CSV Parsing
  const handleParseKeluargaCsv = (file: File) => {
    setKeluargaCsvFile(file);
    Papa.parse<any>(file, {
      header: true,
      delimiter: '',
      skipEmptyLines: true,
      transformHeader: (header) => normalizeCsvHeader(header),
      transform: (value, field) => {
        if (field === 'registrasi') return cleanRegistrasiValue(value);
        return value;
      },
      complete: (results) => {
        const rows = results.data;
        const validKeluarga: Keluarga[] = [];
        const warnings: string[] = [];

        rows.forEach((r, idx) => {
          const reg = cleanRegistrasiValue(r.registrasi);
          const nama = String(r.nama_kk || '').trim();
          if (!reg || !nama) {
            warnings.push(`[keluarga.csv] Baris #${idx + 2} dilewati: 'registrasi' atau 'nama_kk' kosong.`);
            return;
          }
          const wafatRaw = String(r.kk_wafat || '').trim().toLowerCase();
          const isWafat = ['true', '1', 'ya', 'yes', 'wafat', 'almarhum'].includes(wafatRaw);

          validKeluarga.push({
            registrasi: reg,
            wijk: String(r.wijk || '').trim() || lingkunganList[0]?.nama || 'Lingkungan Letare',
            nama_kk: nama,
            kk_wafat: isWafat,
            jalan: String(r.jalan || '').trim(),
            hp: String(r.hp || '').trim(),
            jumlah_anggota: Math.max(0, parseInt(r.jumlah_anggota, 10) || 0)
          });
        });

        setKeluargaParsed(validKeluarga);
        setCsvWarnings((prev) => [
          ...prev.filter((w) => !w.startsWith('[keluarga.csv]')),
          ...warnings
        ]);
        showToast('info', `File keluarga terbaca: ${validKeluarga.length} baris valid.`);
      },
      error: (error) => {
        showToast('error', `Gagal membaca CSV Keluarga: ${error.message}`);
      }
    });
  };

  const handleParseAnggotaCsv = (file: File) => {
    setAnggotaCsvFile(file);
    Papa.parse<any>(file, {
      header: true,
      delimiter: '',
      skipEmptyLines: true,
      transformHeader: (header) => normalizeCsvHeader(header),
      transform: (value, field) => {
        if (field === 'registrasi') return cleanRegistrasiValue(value);
        return value;
      },
      complete: (results) => {
        const rows = results.data;
        const validAnggota: Anggota[] = [];
        const warnings: string[] = [];
        let emptyBirthdays = 0;

        const existingLookupRegs = new Set(keluargaLookup.map((k) => k.registrasi));
        const parsedKeluargaRegSet = new Set(keluargaParsed.map((k) => k.registrasi));
        let autoCreateCount = 0;

        rows.forEach((r, idx) => {
          const reg = cleanRegistrasiValue(r.registrasi);
          const nama = String(r.nama || '').trim();
          if (!reg || !nama) {
            warnings.push(`[anggota.csv] Baris #${idx + 2} dilewati: 'registrasi' atau 'nama' kosong.`);
            return;
          }

          const tglLahir = normalizeDateValue(r.tgl_lahir);
          if (!tglLahir) {
            emptyBirthdays += 1;
          }

          if (!parsedKeluargaRegSet.has(reg) && !existingLookupRegs.has(reg)) {
            autoCreateCount += 1;
          }

          const jkRaw = String(r.jenis_kelamin || 'L').trim().toUpperCase();
          const jk: 'L' | 'P' = jkRaw.startsWith('P') || jkRaw === 'W' || jkRaw === 'PR' ? 'P' : 'L';

          const aktifRaw = String(r.aktif ?? 'true').trim().toLowerCase();
          const isAktif = !['false', '0', 'tidak', 'non-aktif', 'nonaktif'].includes(aktifRaw);

          validAnggota.push({
            id: r.id ? String(r.id).trim() : `ang-imp-${Date.now()}-${idx}`,
            registrasi: reg,
            nama,
            jenis_kelamin: jk,
            tgl_lahir: tglLahir,
            tgl_baptis: normalizeDateValue(r.tgl_baptis),
            tgl_sidi: normalizeDateValue(r.tgl_sidi),
            hub_keluarga: String(r.hub_keluarga || 'Anggota').trim() || 'Anggota',
            wijk: String(r.wijk || '').trim() || lingkunganList[0]?.nama || 'Lingkungan Letare',
            aktif: isAktif
          });
        });

        if (emptyBirthdays > 0) {
          warnings.push(`[anggota.csv] Info: Terdapat ${emptyBirthdays} anggota dengan tanggal lahir kosong (NULL). Anggota ini tidak masuk daftar ulang tahun otomatis.`);
        }
        if (autoCreateCount > 0) {
          warnings.push(`[anggota.csv] Info: ${autoCreateCount} anggota memiliki No. Registrasi yang belum ada di data keluarga; sistem akan membuatkan data KK otomatis saat impor.`);
        }

        setAnggotaParsed(validAnggota);
        setCsvWarnings((prev) => [
          ...prev.filter((w) => !w.startsWith('[anggota.csv]')),
          ...warnings
        ]);
        showToast('info', `File anggota terbaca: ${validAnggota.length} baris valid.`);
      },
      error: (error) => {
        showToast('error', `Gagal membaca CSV Anggota: ${error.message}`);
      }
    });
  };

  // Run Batch Import
  const handleExecuteImport = async () => {
    if (keluargaParsed.length === 0 && anggotaParsed.length === 0) {
      showToast('error', 'Silakan pilih dan periksa file CSV keluarga atau anggota terlebih dahulu.');
      return;
    }

    setIsImporting(true);
    setImportProgress({ stage: 'Memulai impor...', percent: 0, currentBatch: 0, totalBatches: 0 });

    try {
      // 1. Impor Keluarga terlebih dahulu (karena foreign key anggota -> keluarga.registrasi)
      if (keluargaParsed.length > 0) {
        await batchUpsertKeluarga(keluargaParsed, (processed: number, total: number) => {
          const percent = total > 0 ? Math.round((processed / total) * 100) : 100;
          const currentBatch = Math.ceil(processed / 500);
          const totalBatches = Math.ceil(total / 500);
          setImportProgress({
            stage: `Mengimpor Keluarga ke Supabase... (${currentBatch}/${totalBatches} batch)`,
            percent: Math.round(percent * (anggotaParsed.length > 0 ? 0.4 : 1)),
            currentBatch,
            totalBatches
          });
        });
      }

      // 2. Impor Anggota
      if (anggotaParsed.length > 0) {
        await batchUpsertAnggota(anggotaParsed, (processed: number, total: number) => {
          const percent = total > 0 ? Math.round((processed / total) * 100) : 100;
          const currentBatch = Math.ceil(processed / 500);
          const totalBatches = Math.ceil(total / 500);
          const base = keluargaParsed.length > 0 ? 40 : 0;
          const factor = keluargaParsed.length > 0 ? 0.6 : 1;
          setImportProgress({
            stage: `Mengimpor Anggota Jemaat ke Supabase... (${currentBatch}/${totalBatches} batch)`,
            percent: Math.round(base + percent * factor),
            currentBatch,
            totalBatches
          });
        });
      }

      showToast('success', `Impor selesai! Berhasil menyimpan ${keluargaParsed.length} keluarga dan ${anggotaParsed.length} anggota.`);
      setKeluargaCsvFile(null);
      setKeluargaParsed([]);
      setAnggotaCsvFile(null);
      setAnggotaParsed([]);
      setCsvWarnings([]);
      await Promise.all([fetchAnggota(), fetchKeluarga(), fetchKeluargaLookup()]);
      setActiveTab('anggota');
    } catch (err: any) {
      showToast('error', `Gagal menjalankan batch impor: ${err?.message || 'Terjadi kesalahan.'}`);
    } finally {
      setIsImporting(false);
      setImportProgress(null);
    }
  };

  // Jadwal Tetap handlers
  const handleAddJadwal = async () => {
    const newItem: JadwalTetapItem = {
      id: `jt-${Date.now()}`,
      kelompok: 'kategorial',
      label: 'Nama Kegiatan / Punguan',
      hari: 'Sabtu',
      jam: '19.00 WIB',
      keterangan: 'Sopo Godang',
      urutan: jadwalList.length + 1
    };
    const updated = [...jadwalList, newItem];
    setJadwalList(updated);
    try {
      await saveJadwalTetap(updated);
      showToast('success', 'Jadwal tetap ditambahkan.');
    } catch (err: any) {
      showToast('error', err?.message || 'Gagal menyimpan jadwal tetap.');
    }
  };

  const handleUpdateJadwal = async (id: string, field: keyof JadwalTetapItem, val: any) => {
    const updated = jadwalList.map((j) => (j.id === id ? { ...j, [field]: val } : j));
    setJadwalList(updated);
    try {
      await saveJadwalTetap(updated);
    } catch (err: any) {
      showToast('error', err?.message || 'Gagal memperbarui jadwal tetap.');
    }
  };

  const handleDeleteJadwal = async (id: string) => {
    const updated = jadwalList.filter((j) => j.id !== id);
    setJadwalList(updated);
    try {
      await saveJadwalTetap(updated);
      showToast('info', 'Jadwal tetap dihapus.');
    } catch (err: any) {
      showToast('error', err?.message || 'Gagal menghapus jadwal tetap.');
    }
  };

  // Lingkungan handlers
  const handleAddLingkungan = async () => {
    const newItem: LingkunganItem = {
      id: `ling-${Date.now()}`,
      nama: `Lingkungan Baru ${lingkunganList.length + 1}`,
      hari_default: 'Rabu',
      jam_default: '20.00 WIB',
      urutan: lingkunganList.length + 1
    };
    const updated = [...lingkunganList, newItem];
    setLingkunganList(updated);
    try {
      await saveLingkungan(updated);
      showToast('success', 'Lingkungan baru ditambahkan.');
    } catch (err: any) {
      showToast('error', err?.message || 'Gagal menyimpan lingkungan.');
    }
  };

  const handleUpdateLingkungan = async (id: string, field: keyof LingkunganItem, val: any) => {
    const updated = lingkunganList.map((l) => (l.id === id ? { ...l, [field]: val } : l));
    setLingkunganList(updated);
    try {
      await saveLingkungan(updated);
    } catch (err: any) {
      showToast('error', err?.message || 'Gagal memperbarui lingkungan.');
    }
  };

  const handleDeleteLingkungan = async (id: string) => {
    const updated = lingkunganList.filter((l) => l.id !== id);
    setLingkunganList(updated);
    try {
      await saveLingkungan(updated);
      showToast('info', 'Lingkungan dihapus.');
    } catch (err: any) {
      showToast('error', err?.message || 'Gagal menghapus lingkungan.');
    }
  };

  // Pengaturan Save
  const handleSavePengaturan = async () => {
    if (!pengaturan) return;
    try {
      await savePengaturan(pengaturan);
      showToast('success', 'Pengaturan huria & kop surat berhasil disimpan.');
    } catch (err: any) {
      showToast('error', err?.message || 'Gagal menyimpan pengaturan huria.');
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F5F0] text-stone-900 pb-16">
      {/* Top Header */}
      <header className="bg-[#0B2545] text-white shadow-md border-b border-amber-500/20 px-3 sm:px-6 py-2.5 sm:py-3 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <button
              onClick={() => navigate('/admin')}
              className="inline-flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold text-stone-200 hover:text-white hover:bg-white/10 transition cursor-pointer min-h-[40px] shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden xs:inline">Dasbor</span>
            </button>
            <div className="h-4 w-px bg-stone-700 hidden sm:block shrink-0" />
            <div className="min-w-0">
              <h1 className="text-sm sm:text-base font-bold text-white tracking-tight truncate">
                Master Data &amp; Pengaturan Huria
              </h1>
              <p className="text-[11px] text-stone-300 truncate">
                HKBP Ressort Hutaraja · Distrik VI Dairi
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Mode Demo Banner */}
      {isDemoMode && (
        <div className="bg-amber-500 text-stone-950 px-4 py-2 border-b border-amber-600 font-semibold text-xs flex items-center justify-between">
          <div className="max-w-7xl mx-auto w-full flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-stone-950 shrink-0" />
            <span>
              <strong>Mode Demo Aktif:</strong> Kredensial Supabase produksi belum terkonfigurasi pada berkas lingkungan.
              Aplikasi menggunakan dataset anonim contoh di memori lokal. Jangan menyertakan data jemaat asli sebelum menyambungkan Supabase.
            </span>
          </div>
        </div>
      )}

      {/* Floating Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-5 right-5 z-50 px-4 py-3 rounded-xl shadow-2xl border flex items-center gap-3 text-xs font-semibold animate-in fade-in slide-in-from-bottom-2 ${
            toast.type === 'success'
              ? 'bg-emerald-950 text-emerald-100 border-emerald-700'
              : toast.type === 'error'
              ? 'bg-rose-950 text-rose-100 border-rose-700'
              : toast.type === 'warning'
              ? 'bg-amber-950 text-amber-100 border-amber-700'
              : 'bg-stone-900 text-stone-100 border-stone-700'
          }`}
        >
          {toast.type === 'success' && <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />}
          {toast.type === 'error' && <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />}
          {toast.type === 'warning' && <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />}
          {toast.type === 'info' && <Info className="w-4 h-4 text-blue-400 shrink-0" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 mt-6">
        {/* Navigation Tabs Bar */}
        <div className="bg-white rounded-xl border border-stone-200 shadow-xs p-1.5 flex items-center mb-6 overflow-x-auto scrollbar-none gap-1.5">
          <button
            onClick={() => setActiveTab('anggota')}
            className={`px-3.5 py-2.5 rounded-lg text-xs md:text-sm font-bold transition whitespace-nowrap shrink-0 flex items-center gap-2 cursor-pointer min-h-[44px] ${
              activeTab === 'anggota'
                ? 'bg-[#0B2545] text-white shadow-xs'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
            }`}
          >
            <Users className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Anggota Jemaat ({anggotaTotal})</span>
          </button>

          <button
            onClick={() => setActiveTab('keluarga')}
            className={`px-3.5 py-2.5 rounded-lg text-xs md:text-sm font-bold transition whitespace-nowrap shrink-0 flex items-center gap-2 cursor-pointer min-h-[44px] ${
              activeTab === 'keluarga'
                ? 'bg-[#0B2545] text-white shadow-xs'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
            }`}
          >
            <Home className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Data Keluarga ({keluargaTotal})</span>
          </button>

          <button
            onClick={() => setActiveTab('minggu')}
            className={`px-3.5 py-2.5 rounded-lg text-xs md:text-sm font-bold transition whitespace-nowrap shrink-0 flex items-center gap-2 cursor-pointer min-h-[44px] ${
              activeTab === 'minggu'
                ? 'bg-[#0B2545] text-white shadow-xs'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
            }`}
          >
            <Calendar className="w-4 h-4 text-amber-400 shrink-0" />
            <span>63 Minggu Liturgi</span>
          </button>

          <button
            onClick={() => setActiveTab('keuangan')}
            className={`px-3.5 py-2.5 rounded-lg text-xs md:text-sm font-bold transition whitespace-nowrap shrink-0 flex items-center gap-2 cursor-pointer min-h-[44px] ${
              activeTab === 'keuangan'
                ? 'bg-[#0B2545] text-white shadow-xs'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
            }`}
          >
            <DollarSign className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Pos Penerimaan & Pengeluaran</span>
          </button>

          {(currentRole === 'admin' || currentRole === 'sekretaris') && (
            <button
              onClick={() => setActiveTab('impor')}
              className={`px-3.5 py-2.5 rounded-lg text-xs md:text-sm font-bold transition whitespace-nowrap shrink-0 flex items-center gap-2 cursor-pointer min-h-[44px] ${
                activeTab === 'impor'
                  ? 'bg-[#0B2545] text-white shadow-xs'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
              }`}
            >
              <UploadCloud className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Impor & Template CSV</span>
            </button>
          )}

          <button
            onClick={() => setActiveTab('jadwal')}
            className={`px-3.5 py-2.5 rounded-lg text-xs md:text-sm font-bold transition whitespace-nowrap shrink-0 flex items-center gap-2 cursor-pointer min-h-[44px] ${
              activeTab === 'jadwal'
                ? 'bg-[#0B2545] text-white shadow-xs'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
            }`}
          >
            <Clock className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Jadwal Tetap</span>
          </button>

          <button
            onClick={() => setActiveTab('lingkungan')}
            className={`px-3.5 py-2.5 rounded-lg text-xs md:text-sm font-bold transition whitespace-nowrap shrink-0 flex items-center gap-2 cursor-pointer min-h-[44px] ${
              activeTab === 'lingkungan'
                ? 'bg-[#0B2545] text-white shadow-xs'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
            }`}
          >
            <MapPin className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Lingkungan / Wijk</span>
          </button>

          <button
            onClick={() => setActiveTab('pengaturan')}
            className={`px-3.5 py-2.5 rounded-lg text-xs md:text-sm font-bold transition whitespace-nowrap shrink-0 flex items-center gap-2 cursor-pointer min-h-[44px] ${
              activeTab === 'pengaturan'
                ? 'bg-[#0B2545] text-white shadow-xs'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
            }`}
          >
            <Settings className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Kop & Pengaturan</span>
          </button>
        </div>

        {/* ========================================================= */}
        {/* TAB 1: ANGGOTA JEMAAT */}
        {/* ========================================================= */}
        {activeTab === 'anggota' && (
          <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 pb-4">
              <div>
                <h3 className="font-bold text-stone-900 text-sm md:text-base flex items-center gap-2">
                  Database Anggota Jemaat (Ruas)
                  <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-900 rounded font-semibold">
                    {anggotaTotal} Total Ruas
                  </span>
                </h3>
                <p className="text-xs text-stone-500">
                  Data ini tersimpan di tabel <code className="font-mono text-stone-700 bg-stone-100 px-1 rounded">anggota</code> Supabase.
                  Hanya role Admin dan Sekretaris yang dapat mengakses. Tanggal lahir boleh kosong.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleDownloadAnggotaTemplate(',')}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-lg text-xs font-bold transition cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" /> Template CSV
                </button>
                {(currentRole === 'admin' || currentRole === 'sekretaris') && (
                  <button
                    type="button"
                    onClick={() => setActiveTab('impor')}
                    className="inline-flex items-center gap-1.5 px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 border border-stone-300 rounded-lg text-xs font-bold transition cursor-pointer"
                  >
                    <UploadCloud className="w-3.5 h-3.5" /> Impor CSV
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setIsNewAnggotaModal(true);
                    setAutoNamaKK('');
                    setEditingAnggota({
                      registrasi: '',
                      nama: '',
                      jenis_kelamin: 'L',
                      tgl_lahir: '',
                      hub_keluarga: 'Kepala Keluarga',
                      wijk: lingkunganList[0]?.nama || 'Lingkungan Letare',
                      aktif: true
                    });
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-bold shadow transition cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> Tambah Anggota
                </button>
              </div>
            </div>

            {/* Filters Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-stone-50 p-3 rounded-lg border border-stone-200">
              <div className="flex items-center gap-2 flex-1 min-w-[240px]">
                <div className="relative w-full max-w-sm">
                  <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Cari nama atau no. registrasi..."
                    value={anggotaSearch}
                    onChange={(e) => setAnggotaSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 text-xs border border-stone-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-blue-600"
                  />
                </div>

                <div className="flex items-center gap-1.5 text-xs text-stone-600 shrink-0">
                  <Filter className="w-3.5 h-3.5 text-stone-400" />
                  <span>Wijk:</span>
                  <select
                    value={anggotaWijkFilter}
                    onChange={(e) => {
                      setAnggotaWijkFilter(e.target.value);
                      setAnggotaPage(1);
                    }}
                    className="px-2.5 py-1.5 border border-stone-300 rounded-lg bg-white text-xs font-medium"
                  >
                    <option value="all">Semua Wijk / Lingkungan</option>
                    {lingkunganList.map((l) => (
                      <option key={l.id} value={l.nama}>
                        {l.nama}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="text-xs text-stone-500 font-medium">
                Menampilkan {(anggotaPage - 1) * 50 + 1} -{' '}
                {Math.min(anggotaPage * 50, anggotaTotal)} dari {anggotaTotal} anggota
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto border border-stone-200 rounded-lg">
              <table className="w-full text-xs">
                <thead className="bg-stone-100 text-stone-800 border-b border-stone-200 font-bold">
                  <tr>
                    <th className="py-2.5 px-3 text-left w-24">Registrasi</th>
                    <th className="py-2.5 px-3 text-left">Nama Lengkap</th>
                    <th className="py-2.5 px-2 text-center w-12">L/P</th>
                    <th className="py-2.5 px-3 text-left w-28">Tgl Lahir</th>
                    <th className="py-2.5 px-3 text-left w-28">Hub. Keluarga</th>
                    <th className="py-2.5 px-3 text-left w-36">Wijk</th>
                    <th className="py-2.5 px-2 text-center w-20">Baptis/Sidi</th>
                    <th className="py-2.5 px-2 text-center w-20">Status</th>
                    <th className="py-2.5 px-3 text-right w-24">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {isAnggotaLoading ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-stone-500">
                        <div className="animate-spin w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-2" />
                        Memuat data anggota jemaat...
                      </td>
                    </tr>
                  ) : anggotaList.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-stone-500">
                        Tidak ada data anggota yang cocok dengan pencarian / filter.
                      </td>
                    </tr>
                  ) : (
                    anggotaList.map((ang) => (
                      <tr key={ang.id} className="hover:bg-stone-50/80 transition">
                        <td className="py-2 px-3 font-mono text-stone-600 font-semibold">
                          {ang.registrasi}
                        </td>
                        <td className="py-2 px-3 font-bold text-stone-900">{ang.nama}</td>
                        <td className="py-2 px-2 text-center">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              ang.jenis_kelamin === 'L'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-pink-100 text-pink-800'
                            }`}
                          >
                            {ang.jenis_kelamin}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-stone-700">
                          {ang.tgl_lahir ? (
                            <span className="font-mono-num">{ang.tgl_lahir}</span>
                          ) : (
                            <span className="text-stone-400 italic">(kosong)</span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-stone-600">{ang.hub_keluarga || '-'}</td>
                        <td className="py-2 px-3 text-stone-800 font-medium">{ang.wijk}</td>
                        <td className="py-2 px-2 text-center text-[10px]">
                          {ang.tgl_sidi ? (
                            <span className="text-emerald-700 font-bold bg-emerald-50 px-1 py-0.5 rounded">
                              Sidi
                            </span>
                          ) : ang.tgl_baptis ? (
                            <span className="text-blue-700 bg-blue-50 px-1 py-0.5 rounded">
                              Baptis
                            </span>
                          ) : (
                            <span className="text-stone-400">-</span>
                          )}
                        </td>
                        <td className="py-2 px-2 text-center">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              ang.aktif !== false
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-stone-200 text-stone-600'
                            }`}
                          >
                            {ang.aktif !== false ? 'Aktif' : 'Non-Aktif'}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setIsNewAnggotaModal(false);
                                setAutoNamaKK('');
                                setEditingAnggota(ang);
                              }}
                              className="p-1 text-stone-500 hover:text-blue-700 hover:bg-stone-100 rounded transition cursor-pointer"
                              title="Edit"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteAnggota(ang.id, ang.nama)}
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

            {/* Pagination Controls (50 rows per page) */}
            <div className="flex items-center justify-between pt-2">
              <button
                onClick={() => setAnggotaPage((p) => Math.max(1, p - 1))}
                disabled={anggotaPage === 1}
                className="inline-flex items-center gap-1 px-3 py-1.5 border border-stone-300 rounded text-xs font-semibold text-stone-700 hover:bg-stone-50 disabled:opacity-40 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" /> Sebelumnya
              </button>
              <span className="text-xs text-stone-600 font-medium">
                Halaman {anggotaPage} dari {Math.max(1, Math.ceil(anggotaTotal / 50))} (Maks 50 baris per halaman)
              </span>
              <button
                onClick={() =>
                  setAnggotaPage((p) =>
                    p < Math.ceil(anggotaTotal / 50) ? p + 1 : p
                  )
                }
                disabled={anggotaPage >= Math.ceil(anggotaTotal / 50)}
                className="inline-flex items-center gap-1 px-3 py-1.5 border border-stone-300 rounded text-xs font-semibold text-stone-700 hover:bg-stone-50 disabled:opacity-40 cursor-pointer"
              >
                Selanjutnya <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 2: DATA KELUARGA */}
        {/* ========================================================= */}
        {activeTab === 'keluarga' && (
          <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 pb-4">
              <div>
                <h3 className="font-bold text-stone-900 text-sm md:text-base flex items-center gap-2">
                  Database Kepala Keluarga (KK)
                  <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-900 rounded font-semibold">
                    {keluargaTotal} Kepala Keluarga
                  </span>
                </h3>
                <p className="text-xs text-stone-500">
                  Data tersimpan di tabel <code className="font-mono text-stone-700 bg-stone-100 px-1 rounded">keluarga</code>.
                  Kolom <code className="font-mono text-stone-700 bg-stone-100 px-1 rounded">registrasi</code> adalah primary key teks (misal: "0101").
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleDownloadKeluargaTemplate(',')}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-lg text-xs font-bold transition cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" /> Template CSV
                </button>
                {(currentRole === 'admin' || currentRole === 'sekretaris') && (
                  <button
                    type="button"
                    onClick={() => setActiveTab('impor')}
                    className="inline-flex items-center gap-1.5 px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 border border-stone-300 rounded-lg text-xs font-bold transition cursor-pointer"
                  >
                    <UploadCloud className="w-3.5 h-3.5" /> Impor CSV
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setOriginalKeluargaRegistrasi(null);
                    setEditingKeluarga({
                      registrasi: '',
                      nama_kk: '',
                      kk_wafat: false,
                      wijk: lingkunganList[0]?.nama || 'Lingkungan Letare',
                      jalan: '',
                      hp: '',
                      jumlah_anggota: 1
                    });
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-bold shadow transition cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> Tambah Keluarga
                </button>
              </div>
            </div>

            {/* Filters Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-stone-50 p-3 rounded-lg border border-stone-200">
              <div className="flex items-center gap-2 flex-1 min-w-[240px]">
                <div className="relative w-full max-w-sm">
                  <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Cari kepala keluarga, registrasi, atau jalan..."
                    value={keluargaSearch}
                    onChange={(e) => setKeluargaSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 text-xs border border-stone-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-blue-600"
                  />
                </div>

                <div className="flex items-center gap-1.5 text-xs text-stone-600 shrink-0">
                  <Filter className="w-3.5 h-3.5 text-stone-400" />
                  <span>Wijk:</span>
                  <select
                    value={keluargaWijkFilter}
                    onChange={(e) => {
                      setKeluargaWijkFilter(e.target.value);
                      setKeluargaPage(1);
                    }}
                    className="px-2.5 py-1.5 border border-stone-300 rounded-lg bg-white text-xs font-medium"
                  >
                    <option value="all">Semua Wijk / Lingkungan</option>
                    {lingkunganList.map((l) => (
                      <option key={l.id} value={l.nama}>
                        {l.nama}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="text-xs text-stone-500 font-medium">
                Menampilkan {(keluargaPage - 1) * 50 + 1} -{' '}
                {Math.min(keluargaPage * 50, keluargaTotal)} dari {keluargaTotal} keluarga
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto border border-stone-200 rounded-lg">
              <table className="w-full text-xs">
                <thead className="bg-stone-100 text-stone-800 border-b border-stone-200 font-bold">
                  <tr>
                    <th className="py-2.5 px-3 text-left w-24">No. Registrasi</th>
                    <th className="py-2.5 px-3 text-left">Nama Kepala Keluarga</th>
                    <th className="py-2.5 px-2 text-center w-24">Status KK</th>
                    <th className="py-2.5 px-3 text-left w-36">Wijk</th>
                    <th className="py-2.5 px-3 text-left">Alamat / Jalan</th>
                    <th className="py-2.5 px-3 text-left w-32">No. HP</th>
                    <th className="py-2.5 px-2 text-center w-20">Jml Jiwa</th>
                    <th className="py-2.5 px-3 text-right w-24">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {isKeluargaLoading ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-stone-500">
                        <div className="animate-spin w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-2" />
                        Memuat data keluarga...
                      </td>
                    </tr>
                  ) : keluargaList.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-stone-500">
                        Tidak ada data keluarga yang sesuai.
                      </td>
                    </tr>
                  ) : (
                    keluargaList.map((kel) => (
                      <tr key={kel.registrasi} className="hover:bg-stone-50/80 transition">
                        <td className="py-2 px-3 font-mono font-bold text-blue-900">
                          {kel.registrasi}
                        </td>
                        <td className="py-2 px-3 font-bold text-stone-900">{kel.nama_kk}</td>
                        <td className="py-2 px-2 text-center">
                          {kel.kk_wafat ? (
                            <span className="text-[10px] font-bold text-stone-600 bg-stone-200 px-1.5 py-0.5 rounded">
                              Almarhum
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded">
                              Hidup
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-stone-800 font-medium">{kel.wijk}</td>
                        <td className="py-2 px-3 text-stone-600">{kel.jalan || '-'}</td>
                        <td className="py-2 px-3 text-stone-600 font-mono-num">{kel.hp || '-'}</td>
                        <td className="py-2 px-2 text-center font-bold text-stone-800 font-mono-num">
                          {kel.jumlah_anggota || 0}
                        </td>
                        <td className="py-2 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setOriginalKeluargaRegistrasi(kel.registrasi);
                                setEditingKeluarga(kel);
                              }}
                              className="p-1 text-stone-500 hover:text-blue-700 hover:bg-stone-100 rounded transition cursor-pointer"
                              title="Edit"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteKeluarga(kel.registrasi, kel.nama_kk)}
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

            {/* Pagination Controls */}
            <div className="flex items-center justify-between pt-2">
              <button
                onClick={() => setKeluargaPage((p) => Math.max(1, p - 1))}
                disabled={keluargaPage === 1}
                className="inline-flex items-center gap-1 px-3 py-1.5 border border-stone-300 rounded text-xs font-semibold text-stone-700 hover:bg-stone-50 disabled:opacity-40 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" /> Sebelumnya
              </button>
              <span className="text-xs text-stone-600 font-medium">
                Halaman {keluargaPage} dari {Math.max(1, Math.ceil(keluargaTotal / 50))} (Maks 50 baris per halaman)
              </span>
              <button
                onClick={() =>
                  setKeluargaPage((p) =>
                    p < Math.ceil(keluargaTotal / 50) ? p + 1 : p
                  )
                }
                disabled={keluargaPage >= Math.ceil(keluargaTotal / 50)}
                className="inline-flex items-center gap-1 px-3 py-1.5 border border-stone-300 rounded text-xs font-semibold text-stone-700 hover:bg-stone-50 disabled:opacity-40 cursor-pointer"
              >
                Selanjutnya <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB: KALENDER MINGGU LITURGI (63 MINGGU HKBP) */}
        {/* ========================================================= */}
        {activeTab === 'minggu' && (
          <MingguLiturgiManager onNotify={showToast} />
        )}

        {/* ========================================================= */}
        {/* TAB: MASTER POS PENERIMAAN & PENGELUARAN */}
        {/* ========================================================= */}
        {activeTab === 'keuangan' && (
          <MasterKeuanganManager onNotify={showToast} />
        )}

        {/* ========================================================= */}
        {/* TAB 3: IMPOR CSV (ADMIN & SEKRETARIS) */}
        {/* ========================================================= */}
        {activeTab === 'impor' && (currentRole === 'admin' || currentRole === 'sekretaris') && (
          <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-xs space-y-6">
            <div className="border-b border-stone-200 pb-4 flex flex-wrap items-start justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-stone-900 flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-emerald-700" />
                  Template &amp; Impor Data Massal Jemaat via CSV
                </h3>
                <p className="text-xs text-stone-600 mt-1">
                  Unduh template resmi terlebih dahulu, isi data pada Excel / Google Sheets (jaga agar angka nol di depan No. Registrasi tidak hilang dengan format kolom Teks),
                  lalu unggah <code className="bg-stone-100 px-1 py-0.5 rounded text-stone-800 font-mono">keluarga.csv</code> dan/atau <code className="bg-stone-100 px-1 py-0.5 rounded text-stone-800 font-mono">anggota.csv</code>.
                  Sistem akan meng-upsert per <strong>500 baris</strong>.
                </p>
              </div>
            </div>

            {/* Template Download Banner */}
            <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-xs font-bold text-emerald-950 flex items-center gap-2">
                  <Download className="w-4 h-4 text-emerald-700" />
                  <span>Unduh Template CSV Resmi (Data Keluarga &amp; Data Anggota Jemaat)</span>
                </div>
                <span className="text-[11px] text-emerald-800 font-medium">
                  Mendukung pemisah koma (,) maupun titik koma (;) dari Excel Indonesia
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="bg-white border border-emerald-200 rounded-lg p-3 space-y-2">
                  <div className="font-bold text-stone-900">1. Template Data Keluarga (KK)</div>
                  <p className="text-[11px] text-stone-600">
                    Kolom: <code className="font-mono text-stone-800">registrasi, wijk, nama_kk, kk_wafat, jalan, hp, jumlah_anggota</code>
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleDownloadKeluargaTemplate(',')}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-[11px] font-bold transition cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" /> template_keluarga.csv (,)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDownloadKeluargaTemplate(';')}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-emerald-50 text-emerald-900 border border-emerald-300 rounded-lg text-[11px] font-semibold transition cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" /> Versi Excel Indonesia (;)
                    </button>
                  </div>
                </div>

                <div className="bg-white border border-emerald-200 rounded-lg p-3 space-y-2">
                  <div className="font-bold text-stone-900">2. Template Data Anggota Jemaat (Ruas)</div>
                  <p className="text-[11px] text-stone-600">
                    Kolom: <code className="font-mono text-stone-800">registrasi, nama, jenis_kelamin, tgl_lahir, tgl_baptis, tgl_sidi, hub_keluarga, wijk, aktif</code>
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleDownloadAnggotaTemplate(',')}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-[11px] font-bold transition cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" /> template_anggota.csv (,)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDownloadAnggotaTemplate(';')}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-blue-50 text-blue-900 border border-blue-300 rounded-lg text-[11px] font-semibold transition cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" /> Versi Excel Indonesia (;)
                    </button>
                  </div>
                </div>
              </div>

              <div className="text-[11px] text-stone-700 bg-white/80 rounded-lg px-3 py-2 border border-emerald-100">
                <strong>Format yang didukung:</strong> Tanggal mendukung <code className="font-mono">YYYY-MM-DD</code> (cth: <code className="font-mono">1990-08-17</code>) atau <code className="font-mono">DD/MM/YYYY</code> (<code className="font-mono">17/08/1990</code>), boleh kosong.
                Jenis kelamin: <code className="font-mono">L</code> atau <code className="font-mono">P</code>. Jika ada nomor registrasi di <code className="font-mono">anggota.csv</code> yang belum terdaftar di tabel keluarga, sistem otomatis membuatkan data keluarga dasarnya.
              </div>
            </div>

            {/* Two Upload Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Card 1: keluarga.csv */}
              <div className="p-4 border-2 border-dashed border-stone-300 rounded-xl bg-stone-50 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-xs text-stone-900 flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-blue-700 text-white text-[11px] flex items-center justify-center font-bold">
                      1
                    </span>
                    <span>Unggah File keluarga.csv</span>
                  </div>
                  {keluargaParsed.length > 0 && (
                    <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                      {keluargaParsed.length} baris siap
                    </span>
                  )}
                </div>

                <p className="text-[11px] text-stone-500">
                  Kolom wajib: <code className="font-mono text-stone-700">registrasi, wijk, nama_kk, kk_wafat, jalan, hp, jumlah_anggota</code>.
                  Registrasi dibaca sebagai teks (misal: &quot;0101&quot;).
                </p>

                <input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleParseKeluargaCsv(f);
                  }}
                  className="block w-full text-xs text-stone-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer"
                />

                {keluargaCsvFile && (
                  <div className="text-[11px] text-stone-600 bg-white p-2 rounded border border-stone-200">
                    File terpilih: <strong>{keluargaCsvFile.name}</strong> ({(keluargaCsvFile.size / 1024).toFixed(1)} KB)
                  </div>
                )}
              </div>

              {/* Card 2: anggota.csv */}
              <div className="p-4 border-2 border-dashed border-stone-300 rounded-xl bg-stone-50 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-xs text-stone-900 flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-blue-700 text-white text-[11px] flex items-center justify-center font-bold">
                      2
                    </span>
                    <span>Unggah File anggota.csv</span>
                  </div>
                  {anggotaParsed.length > 0 && (
                    <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                      {anggotaParsed.length} baris siap
                    </span>
                  )}
                </div>

                <p className="text-[11px] text-stone-500">
                  Kolom: <code className="font-mono text-stone-700">registrasi, nama, jenis_kelamin, tgl_lahir, tgl_baptis, tgl_sidi, hub_keluarga, wijk, aktif</code>.
                  <span className="text-amber-800 font-semibold block mt-0.5">
                    * tgl_lahir boleh kosong (NULL).
                  </span>
                </p>

                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleParseAnggotaCsv(f);
                  }}
                  className="block w-full text-xs text-stone-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer"
                />

                {anggotaCsvFile && (
                  <div className="text-[11px] text-stone-600 bg-white p-2 rounded border border-stone-200">
                    File terpilih: <strong>{anggotaCsvFile.name}</strong> ({(anggotaCsvFile.size / 1024).toFixed(1)} KB)
                  </div>
                )}
              </div>
            </div>

            {/* Warnings Container */}
            {csvWarnings.length > 0 && (
              <div className="bg-amber-50 border border-amber-300 rounded-xl p-3.5 space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                  <AlertTriangle className="w-4 h-4 text-amber-700" />
                  <span>Peringatan Validasi CSV:</span>
                </div>
                <ul className="list-disc list-inside text-[11px] text-amber-800 space-y-0.5">
                  {csvWarnings.slice(0, 5).map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                  {csvWarnings.length > 5 && (
                    <li className="font-semibold text-amber-900">... dan {csvWarnings.length - 5} peringatan lainnya.</li>
                  )}
                </ul>
              </div>
            )}

            {/* Previews (First 10 rows) */}
            {keluargaParsed.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-stone-900">
                    Pratinjau 10 Baris Pertama: Data Keluarga ({keluargaParsed.length} baris total)
                  </h4>
                  <span className="text-[10px] text-stone-500 font-mono">keluarga.csv</span>
                </div>
                <div className="overflow-x-auto border border-stone-200 rounded-lg">
                  <table className="w-full text-[11px]">
                    <thead className="bg-stone-100 font-bold text-stone-800 border-b border-stone-200">
                      <tr>
                        <th className="py-1 px-2 text-left">Registrasi</th>
                        <th className="py-1 px-2 text-left">Nama Kepala Keluarga</th>
                        <th className="py-1 px-2 text-left">Wijk</th>
                        <th className="py-1 px-2 text-left">Alamat</th>
                        <th className="py-1 px-2 text-left">No. HP</th>
                        <th className="py-1 px-2 text-center">Jml Jiwa</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {keluargaParsed.slice(0, 10).map((k, i) => (
                        <tr key={i} className="hover:bg-stone-50">
                          <td className="py-1 px-2 font-mono text-blue-900 font-semibold">{k.registrasi}</td>
                          <td className="py-1 px-2 font-medium">{k.nama_kk}</td>
                          <td className="py-1 px-2 text-stone-600">{k.wijk}</td>
                          <td className="py-1 px-2 text-stone-600">{k.jalan}</td>
                          <td className="py-1 px-2 text-stone-600">{k.hp}</td>
                          <td className="py-1 px-2 text-center font-bold">{k.jumlah_anggota}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {anggotaParsed.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-stone-900">
                    Pratinjau 10 Baris Pertama: Data Anggota ({anggotaParsed.length} baris total)
                  </h4>
                  <span className="text-[10px] text-stone-500 font-mono">anggota.csv</span>
                </div>
                <div className="overflow-x-auto border border-stone-200 rounded-lg">
                  <table className="w-full text-[11px]">
                    <thead className="bg-stone-100 font-bold text-stone-800 border-b border-stone-200">
                      <tr>
                        <th className="py-1 px-2 text-left">Registrasi</th>
                        <th className="py-1 px-2 text-left">Nama Lengkap</th>
                        <th className="py-1 px-2 text-center">L/P</th>
                        <th className="py-1 px-2 text-left">Tgl Lahir</th>
                        <th className="py-1 px-2 text-left">Hub. Keluarga</th>
                        <th className="py-1 px-2 text-left">Wijk</th>
                        <th className="py-1 px-2 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {anggotaParsed.slice(0, 10).map((a, i) => (
                        <tr key={i} className="hover:bg-stone-50">
                          <td className="py-1 px-2 font-mono text-stone-600">{a.registrasi}</td>
                          <td className="py-1 px-2 font-bold">{a.nama}</td>
                          <td className="py-1 px-2 text-center font-bold">{a.jenis_kelamin}</td>
                          <td className="py-1 px-2 font-mono text-stone-700">
                            {a.tgl_lahir || <span className="text-stone-400 italic">(kosong)</span>}
                          </td>
                          <td className="py-1 px-2 text-stone-600">{a.hub_keluarga}</td>
                          <td className="py-1 px-2 text-stone-600">{a.wijk}</td>
                          <td className="py-1 px-2 text-center">
                            {a.aktif ? (
                              <span className="text-emerald-700 font-bold">Aktif</span>
                            ) : (
                              <span className="text-stone-400">Non-Aktif</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Import Progress Bar */}
            {importProgress && (
              <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl space-y-2 animate-in fade-in">
                <div className="flex items-center justify-between text-xs font-bold text-blue-900">
                  <span>{importProgress.stage}</span>
                  <span>{importProgress.percent}%</span>
                </div>
                <div className="w-full bg-blue-200 h-2.5 rounded-full overflow-hidden">
                  <div
                    className="bg-blue-700 h-full transition-all duration-300"
                    style={{ width: `${importProgress.percent}%` }}
                  />
                </div>
              </div>
            )}

            {/* Action Button */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-200">
              <button
                onClick={() => {
                  setKeluargaCsvFile(null);
                  setKeluargaParsed([]);
                  setAnggotaCsvFile(null);
                  setAnggotaParsed([]);
                  setCsvWarnings([]);
                }}
                disabled={isImporting || (keluargaParsed.length === 0 && anggotaParsed.length === 0)}
                className="px-4 py-2 border border-stone-300 rounded-lg text-xs font-semibold text-stone-700 hover:bg-stone-50 disabled:opacity-40 cursor-pointer"
              >
                Batal / Bersihkan
              </button>

              <button
                onClick={handleExecuteImport}
                disabled={isImporting || (keluargaParsed.length === 0 && anggotaParsed.length === 0)}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white rounded-lg text-xs font-extrabold shadow-md transition cursor-pointer"
              >
                <UploadCloud className="w-4 h-4" />
                <span>
                  {isImporting
                    ? 'Sedang Memproses Batch Impor...'
                    : `Mulai Impor ke Supabase (${keluargaParsed.length} KK + ${anggotaParsed.length} Ruas)`}
                </span>
              </button>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 4: JADWAL TETAP (SIDEBAR HALAMAN 1) */}
        {/* ========================================================= */}
        {activeTab === 'jadwal' && (
          <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 pb-3">
              <div>
                <h3 className="font-bold text-stone-900 text-sm md:text-base">
                  Jadwal Panghobasion ni Huria (Sidebar Kiri Halaman 1)
                </h3>
                <p className="text-xs text-stone-500">
                  Jadwal ibadah minggu, partangiangan lingkungan, kategorial & kemajelisan tetap yang otomatis tercetak di warta.
                </p>
              </div>
              <button
                onClick={handleAddJadwal}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold shadow transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Tambah Jadwal
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-stone-50 text-stone-700 border-b border-stone-200">
                  <tr>
                    <th className="py-2 px-2 text-left w-36">Kategori</th>
                    <th className="py-2 px-2 text-left">Nama Kegiatan / Punguan</th>
                    <th className="py-2 px-2 text-left w-24">Hari</th>
                    <th className="py-2 px-2 text-left w-24">Pukul</th>
                    <th className="py-2 px-2 text-left w-48">Keterangan / Tempat</th>
                    <th className="py-2 px-2 text-center w-12">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {jadwalList.map((item) => (
                    <tr key={item.id} className="hover:bg-stone-50">
                      <td className="py-1.5 px-2">
                        <select
                          value={item.kelompok}
                          onChange={(e) =>
                            handleUpdateJadwal(item.id, 'kelompok', e.target.value as any)
                          }
                          className="px-2 py-1 border border-stone-200 rounded text-xs w-full bg-stone-50"
                        >
                          <option value="minggu">Ibadah Minggu</option>
                          <option value="partangiangan">Partangiangan</option>
                          <option value="kategorial">Kategorial / Punguan</option>
                          <option value="kemajelisan">Kemajelisan / Parhalado</option>
                        </select>
                      </td>
                      <td className="py-1.5 px-2">
                        <input
                          type="text"
                          value={item.label}
                          onChange={(e) => handleUpdateJadwal(item.id, 'label', e.target.value)}
                          className="w-full px-2 py-1 border border-stone-200 rounded text-xs font-medium"
                        />
                      </td>
                      <td className="py-1.5 px-2">
                        <input
                          type="text"
                          value={item.hari}
                          onChange={(e) => handleUpdateJadwal(item.id, 'hari', e.target.value)}
                          className="w-full px-2 py-1 border border-stone-200 rounded text-xs"
                        />
                      </td>
                      <td className="py-1.5 px-2">
                        <input
                          type="text"
                          value={item.jam}
                          onChange={(e) => handleUpdateJadwal(item.id, 'jam', e.target.value)}
                          className="w-full px-2 py-1 border border-stone-200 rounded text-xs"
                        />
                      </td>
                      <td className="py-1.5 px-2">
                        <input
                          type="text"
                          value={item.keterangan || ''}
                          onChange={(e) =>
                            handleUpdateJadwal(item.id, 'keterangan', e.target.value)
                          }
                          className="w-full px-2 py-1 border border-stone-200 rounded text-xs"
                        />
                      </td>
                      <td className="py-1.5 px-2 text-center">
                        <button
                          onClick={() => handleDeleteJadwal(item.id)}
                          className="text-stone-400 hover:text-red-600 p-1 rounded transition cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 5: LINGKUNGAN / WIJK */}
        {/* ========================================================= */}
        {activeTab === 'lingkungan' && (
          <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 pb-3">
              <div>
                <h3 className="font-bold text-stone-900 text-sm md:text-base">
                  Daftar Lingkungan (Wijk) HKBP Ressort Hutaraja
                </h3>
                <p className="text-xs text-stone-500">
                  Data wijk dipakai untuk jadwal partangiangan lingkungan, pencatatan persembahan taon, dan statistik jemaat.
                </p>
              </div>
              <button
                onClick={handleAddLingkungan}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold shadow transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Tambah Lingkungan
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-stone-50 text-stone-700 border-b border-stone-200">
                  <tr>
                    <th className="py-2 px-2 text-center w-12">Urutan</th>
                    <th className="py-2 px-2 text-left">Nama Lingkungan / Wijk</th>
                    <th className="py-2 px-2 text-left w-36">Hari Standar</th>
                    <th className="py-2 px-2 text-left w-36">Jam Standar</th>
                    <th className="py-2 px-2 text-center w-12">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {lingkunganList.map((ling, idx) => (
                    <tr key={ling.id} className="hover:bg-stone-50">
                      <td className="py-1.5 px-2 text-center font-bold text-stone-500">{idx + 1}</td>
                      <td className="py-1.5 px-2">
                        <input
                          type="text"
                          value={ling.nama}
                          onChange={(e) => handleUpdateLingkungan(ling.id, 'nama', e.target.value)}
                          className="w-full px-2 py-1 border border-stone-200 rounded text-xs font-bold text-stone-800"
                        />
                      </td>
                      <td className="py-1.5 px-2">
                        <input
                          type="text"
                          value={ling.hari_default}
                          onChange={(e) =>
                            handleUpdateLingkungan(ling.id, 'hari_default', e.target.value)
                          }
                          className="w-full px-2 py-1 border border-stone-200 rounded text-xs"
                        />
                      </td>
                      <td className="py-1.5 px-2">
                        <input
                          type="text"
                          value={ling.jam_default}
                          onChange={(e) =>
                            handleUpdateLingkungan(ling.id, 'jam_default', e.target.value)
                          }
                          className="w-full px-2 py-1 border border-stone-200 rounded text-xs"
                        />
                      </td>
                      <td className="py-1.5 px-2 text-center">
                        <button
                          onClick={() => handleDeleteLingkungan(ling.id)}
                          className="text-stone-400 hover:text-red-600 p-1 rounded transition cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 6: PENGATURAN HURIA & KOP SURAT */}
        {/* ========================================================= */}
        {activeTab === 'pengaturan' && pengaturan && (
          <div className="space-y-6">
            <KopLogoEditor
              pengaturan={pengaturan}
              onSave={async (updated) => {
                setPengaturan(updated);
                try {
                  await savePengaturan(updated);
                  showToast('success', 'Kop surat dan logo warta berhasil disimpan.');
                } catch (err: any) {
                  showToast('error', err?.message || 'Gagal menyimpan kop surat ke Supabase.');
                }
              }}
            />

            <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                <h3 className="font-bold text-stone-900 text-sm md:text-base">
                  Teks Tetap Liturgi & Dokumen Warta
                </h3>
                <button
                  onClick={handleSavePengaturan}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-bold shadow transition cursor-pointer"
                >
                  <Save className="w-4 h-4" /> Simpan Pengaturan
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Ayat Tetap Default (Kotak Ayat Halaman 1)
                  </label>
                  <textarea
                    rows={3}
                    value={pengaturan.ayat_tetap_default}
                    onChange={(e) =>
                      setPengaturan({ ...pengaturan, ayat_tetap_default: e.target.value })
                    }
                    className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Referensi Ayat Tetap Default
                  </label>
                  <input
                    type="text"
                    value={pengaturan.ayat_ref_default}
                    onChange={(e) =>
                      setPengaturan({ ...pengaturan, ayat_ref_default: e.target.value })
                    }
                    className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg focus:outline-none"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Teks Ucapan Ulang Tahun (Halaman 2 - Jesayas 40:31)
                  </label>
                  <textarea
                    rows={2}
                    value={pengaturan.teks_ucapan_ulang_tahun}
                    onChange={(e) =>
                      setPengaturan({ ...pengaturan, teks_ucapan_ulang_tahun: e.target.value })
                    }
                    className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg focus:outline-none"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Teks Doa / Penutup Keuangan (Halaman 3)
                  </label>
                  <textarea
                    rows={2}
                    value={pengaturan.teks_penutup_keuangan}
                    onChange={(e) =>
                      setPengaturan({ ...pengaturan, teks_penutup_keuangan: e.target.value })
                    }
                    className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ========================================================= */}
      {/* MODAL: EDIT / TAMBAH ANGGOTA JEMAAT */}
      {/* ========================================================= */}
      {editingAnggota && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-stone-300 max-w-lg w-full max-h-[92vh] overflow-y-auto animate-in fade-in zoom-in-95">
            <div className="bg-[#0B2545] text-white p-4 flex items-center justify-between sticky top-0 z-10">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Users className="w-4 h-4 text-amber-400" />
                {isNewAnggotaModal ? 'Tambah Anggota Jemaat Baru' : 'Edit Anggota Jemaat'}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setEditingAnggota(null);
                  setAutoNamaKK('');
                }}
                className="text-stone-300 hover:text-white p-1 rounded cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveAnggota} className="p-5 space-y-4 text-xs">
              {keluargaLookup.length > 0 && (
                <div>
                  <label className="block font-bold text-stone-700 mb-1">
                    Pilih Kepala Keluarga Terdaftar (Opsional / Isi Cepat)
                  </label>
                  <select
                    value={
                      keluargaLookup.some((k) => k.registrasi === (editingAnggota.registrasi || '').trim())
                        ? (editingAnggota.registrasi || '').trim()
                        : ''
                    }
                    onChange={(e) => {
                      const reg = e.target.value;
                      if (!reg) return;
                      const found = keluargaLookup.find((k) => k.registrasi === reg);
                      setEditingAnggota({
                        ...editingAnggota,
                        registrasi: reg,
                        wijk: found?.wijk || editingAnggota.wijk
                      });
                    }}
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg bg-white text-stone-800"
                  >
                    <option value="">-- Pilih dari {keluargaLookup.length} KK terdaftar atau ketik manual di bawah --</option>
                    {keluargaLookup.map((k) => (
                      <option key={k.registrasi} value={k.registrasi}>
                        {k.registrasi} — {k.nama_kk} ({k.wijk})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-1">
                  <label className="block font-bold text-stone-700 mb-1">
                    No. Registrasi KK <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="misal: 0101"
                    value={editingAnggota.registrasi || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      const matched = keluargaLookup.find((k) => k.registrasi === val.trim());
                      setEditingAnggota({
                        ...editingAnggota,
                        registrasi: val,
                        ...(matched ? { wijk: matched.wijk } : {})
                      });
                    }}
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg font-mono font-bold text-blue-900 bg-stone-50"
                  />
                  {(() => {
                    const regTrim = (editingAnggota.registrasi || '').trim();
                    if (!regTrim) {
                      return <span className="text-[10px] text-stone-500">Kunci relasi ke kepala keluarga.</span>;
                    }
                    const matched = keluargaLookup.find((k) => k.registrasi === regTrim);
                    if (matched) {
                      return (
                        <span className="text-[10px] text-emerald-700 font-semibold block mt-0.5">
                          Terhubung ke KK: {matched.nama_kk}
                        </span>
                      );
                    }
                    return (
                      <span className="text-[10px] text-amber-700 font-semibold block mt-0.5">
                        Belum terdaftar di Data Keluarga (akan dibuat otomatis).
                      </span>
                    );
                  })()}
                </div>

                <div className="col-span-1">
                  <label className="block font-bold text-stone-700 mb-1">
                    Jenis Kelamin <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={editingAnggota.jenis_kelamin || 'L'}
                    onChange={(e) =>
                      setEditingAnggota({ ...editingAnggota, jenis_kelamin: e.target.value as any })
                    }
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg bg-white"
                  >
                    <option value="L">Laki-laki (L)</option>
                    <option value="P">Perempuan (P)</option>
                  </select>
                </div>
              </div>

              {(editingAnggota.registrasi || '').trim() !== '' &&
                !keluargaLookup.some((k) => k.registrasi === (editingAnggota.registrasi || '').trim()) && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-1.5">
                    <div className="text-[11px] font-bold text-amber-900">
                      No. Registrasi &quot;{editingAnggota.registrasi?.trim()}&quot; belum ada di Data Keluarga
                    </div>
                    <p className="text-[10px] text-amber-800">
                      Agar penyimpanan berhasil tanpa error relasi, sistem akan otomatis mendaftarkan Data Keluarga baru untuk nomor registrasi ini.
                    </p>
                    <div>
                      <label className="block text-[11px] font-bold text-amber-950 mb-1">
                        Nama Kepala Keluarga (Opsional)
                      </label>
                      <input
                        type="text"
                        placeholder={
                          editingAnggota.hub_keluarga === 'Kepala Keluarga'
                            ? editingAnggota.nama || 'Otomatis menggunakan nama anggota'
                            : `Otomatis: Kel. ${editingAnggota.nama || '...'}`
                        }
                        value={autoNamaKK}
                        onChange={(e) => setAutoNamaKK(e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-amber-300 rounded bg-white text-xs"
                      />
                    </div>
                  </div>
                )}

              <div>
                <label className="block font-bold text-stone-700 mb-1">
                  Nama Lengkap Anggota <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Nama jemaat..."
                  value={editingAnggota.nama || ''}
                  onChange={(e) => setEditingAnggota({ ...editingAnggota, nama: e.target.value })}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">
                    Tanggal Lahir <span className="text-stone-400 font-normal">(Boleh Kosong)</span>
                  </label>
                  <input
                    type="date"
                    value={editingAnggota.tgl_lahir || ''}
                    onChange={(e) =>
                      setEditingAnggota({ ...editingAnggota, tgl_lahir: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">
                    Hubungan Keluarga
                  </label>
                  <select
                    value={editingAnggota.hub_keluarga || 'Kepala Keluarga'}
                    onChange={(e) =>
                      setEditingAnggota({ ...editingAnggota, hub_keluarga: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg bg-white"
                  >
                    <option value="Kepala Keluarga">Kepala Keluarga</option>
                    <option value="Istri">Istri</option>
                    <option value="Anak">Anak</option>
                    <option value="Orang Tua">Orang Tua</option>
                    <option value="Famili Lain">Famili Lain</option>
                    <option value="Anggota">Anggota</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Tanggal Baptis</label>
                  <input
                    type="date"
                    value={editingAnggota.tgl_baptis || ''}
                    onChange={(e) =>
                      setEditingAnggota({ ...editingAnggota, tgl_baptis: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">Tanggal Sidi</label>
                  <input
                    type="date"
                    value={editingAnggota.tgl_sidi || ''}
                    onChange={(e) =>
                      setEditingAnggota({ ...editingAnggota, tgl_sidi: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">Wijk / Lingkungan</label>
                <select
                  value={editingAnggota.wijk || lingkunganList[0]?.nama || 'Lingkungan Letare'}
                  onChange={(e) =>
                    setEditingAnggota({ ...editingAnggota, wijk: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg bg-white"
                >
                  {lingkunganList.map((l) => (
                    <option key={l.id} value={l.nama}>
                      {l.nama}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="chkAktif"
                  checked={editingAnggota.aktif !== false}
                  onChange={(e) =>
                    setEditingAnggota({ ...editingAnggota, aktif: e.target.checked })
                  }
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <label htmlFor="chkAktif" className="font-semibold text-stone-800">
                  Status Anggota Aktif (Berhak tercatat di warta)
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => {
                    setEditingAnggota(null);
                    setAutoNamaKK('');
                  }}
                  className="px-4 py-2 border border-stone-300 rounded-lg font-semibold text-stone-600 hover:bg-stone-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSavingEntity}
                  className="px-5 py-2 bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white rounded-lg font-bold shadow transition cursor-pointer"
                >
                  {isSavingEntity ? 'Menyimpan...' : 'Simpan Anggota'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: EDIT / TAMBAH KELUARGA */}
      {/* ========================================================= */}
      {editingKeluarga && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-stone-300 max-w-lg w-full max-h-[92vh] overflow-y-auto animate-in fade-in zoom-in-95">
            <div className="bg-[#0B2545] text-white p-4 flex items-center justify-between sticky top-0 z-10">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Home className="w-4 h-4 text-amber-400" />
                {originalKeluargaRegistrasi ? 'Edit Data Keluarga' : 'Tambah Kepala Keluarga Baru'}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setEditingKeluarga(null);
                  setOriginalKeluargaRegistrasi(null);
                }}
                className="text-stone-300 hover:text-white p-1 rounded cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveKeluarga} className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">
                    No. Registrasi (PK Teks) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="misal: 0101"
                    value={editingKeluarga.registrasi || ''}
                    onChange={(e) =>
                      setEditingKeluarga({ ...editingKeluarga, registrasi: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg font-mono font-bold text-blue-900 bg-stone-50"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">Wijk / Lingkungan</label>
                  <select
                    value={editingKeluarga.wijk || lingkunganList[0]?.nama || 'Lingkungan Letare'}
                    onChange={(e) =>
                      setEditingKeluarga({ ...editingKeluarga, wijk: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg bg-white"
                  >
                    {lingkunganList.map((l) => (
                      <option key={l.id} value={l.nama}>
                        {l.nama}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">
                  Nama Kepala Keluarga <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Nama KK..."
                  value={editingKeluarga.nama_kk || ''}
                  onChange={(e) =>
                    setEditingKeluarga({ ...editingKeluarga, nama_kk: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">No. HP / WhatsApp</label>
                  <input
                    type="text"
                    placeholder="0812-xxxx-xxxx"
                    value={editingKeluarga.hp || ''}
                    onChange={(e) =>
                      setEditingKeluarga({ ...editingKeluarga, hp: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">Jumlah Jiwa Anggota</label>
                  <input
                    type="number"
                    min="0"
                    value={editingKeluarga.jumlah_anggota ?? 1}
                    onChange={(e) =>
                      setEditingKeluarga({
                        ...editingKeluarga,
                        jumlah_anggota: Math.max(0, parseInt(e.target.value, 10) || 0)
                      })
                    }
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">Alamat Rumah / Jalan</label>
                <input
                  type="text"
                  placeholder="Jl. Persada No..."
                  value={editingKeluarga.jalan || ''}
                  onChange={(e) =>
                    setEditingKeluarga({ ...editingKeluarga, jalan: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="chkKkWafat"
                  checked={Boolean(editingKeluarga.kk_wafat)}
                  onChange={(e) =>
                    setEditingKeluarga({ ...editingKeluarga, kk_wafat: e.target.checked })
                  }
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <label htmlFor="chkKkWafat" className="font-semibold text-stone-800">
                  Kepala Keluarga Telah Wafat (Almarhum)
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => {
                    setEditingKeluarga(null);
                    setOriginalKeluargaRegistrasi(null);
                  }}
                  className="px-4 py-2 border border-stone-300 rounded-lg font-semibold text-stone-600 hover:bg-stone-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSavingEntity}
                  className="px-5 py-2 bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white rounded-lg font-bold shadow transition cursor-pointer"
                >
                  {isSavingEntity ? 'Menyimpan...' : 'Simpan Data Keluarga'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
