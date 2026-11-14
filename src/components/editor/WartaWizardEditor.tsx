import React, { useState, useEffect, useRef } from 'react';
import {
  FullWartaData,
  PengaturanHuria,
  JadwalTetapItem,
  MingguLiturgi,
  PetugasMaster,
  WartaRecord
} from '../../types';
import {
  MASTER_MINGGU_LITURGI,
  MASTER_PETUGAS,
  MASTER_PERAN_PARHOBAS,
  MASTER_KELOMPOK_KOOR,
  MASTER_KATEGORI_PENERIMAAN,
  DEFAULT_ACARA_MINGGU_TEMPLATE,
  DEFAULT_ACARA_PARTANGIANGAN_TEMPLATE,
  SAMPLE_ANGGOTA
} from '../../lib/mockData';
import { WartaDocument } from '../warta/WartaDocument';
import { formatTanggalIndo, formatHeaderMinggu, formatRupiah, parseRupiahInput } from '../../lib/format';
import {
  recalculatePenerimaanRows,
  calculatePengeluaranTotals,
  calculateRekapitulasi,
  calculateHamauliateonTotals,
  getHamauliateonTransitoriList,
  calculateHamauliateonTransitoriSum,
  calculateHuriaSentralSplit,
  SUMBANGAN_NATAL_KODE,
  calculateSumbanganNatalBreakdown,
  syncSumbanganNatalToPenerimaanRows
} from '../../lib/keuangan';
import { getPreviousWeekSumbanganNatal } from '../../lib/wartaStorage';
import { getUlangTahunMingguIni, getSeninMingguRange } from '../../lib/dateUtils';
import { getUlangTahun, notify } from '../../lib/jemaatApi';
import { listMasterPetugas } from '../../lib/petugasApi';
import { PetugasSelectCell } from './PetugasSelectCell';
import { MingguLiturgiDropdown, getLiturgiColorBadge } from '../common/MingguLiturgiDropdown';
import {
  Calendar,
  BookOpen,
  Users,
  Bell,
  DollarSign,
  Printer,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  Sparkles,
  Plus,
  Trash2,
  Lock,
  Download,
  Eye,
  EyeOff,
  Info,
  RotateCcw,
  AlertCircle,
  Columns,
  Search,
  ChevronDown,
  Layers,
  UserCheck,
  Database,
  RefreshCw,
  History
} from 'lucide-react';
import { AddColumnModal } from '../common/AddColumnModal';
import { TambahPenerimaanModal, TambahPengeluaranModal } from './TambahPosKeuanganModal';
import {
  DEFAULT_PARHOBAS_COLUMNS,
  DEFAULT_ACARA_MINGGU_COLUMNS,
  DEFAULT_ACARA_PARTANGIANGAN_COLUMNS,
  DEFAULT_PARTANGIANGAN_COLUMNS,
  DEFAULT_SOPO_GODANG_COLUMNS
} from '../../lib/tableColumnDefaults';
import {
  DynamicTableColumn,
  AcaraIbadahItem,
  ParhobasItem,
  SopoGodangItem,
  JadwalPartangianganItem,
  PengeluaranItem,
  HamauliateonItem,
  HamauliateonTransitoriItem,
  SumbanganNatalItem,
  PenerimaanRow,
  AturanAlokasi
} from '../../types';

interface WartaWizardEditorProps {
  data: FullWartaData;
  onChange: (updated: FullWartaData) => void;
  pengaturan?: PengaturanHuria;
  jadwalTetap?: JadwalTetapItem[];
  canEditLiturgi: boolean;
  canEditKeuangan: boolean;
  canPublish: boolean;
  onSave: () => void;
  isSaving: boolean;
}

export const WartaWizardEditor: React.FC<WartaWizardEditorProps> = ({
  data,
  onChange,
  pengaturan,
  jadwalTetap,
  canEditLiturgi,
  canEditKeuangan,
  canPublish,
  onSave,
  isSaving
}) => {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [showLivePreview, setShowLivePreview] = useState<boolean>(true);
  const [penerimaanTab, setPenerimaanTab] = useState<'all' | '1.1' | '1.2' | '1.3'>('all');
  const [penerimaanSearch, setPenerimaanSearch] = useState<string>('');
  const [showOnlyNonZero, setShowOnlyNonZero] = useState<boolean>(false);
  const [showPenerimaanNoteCol, setShowPenerimaanNoteCol] = useState<boolean>(false);
  const [showPenerimaanAddMenu, setShowPenerimaanAddMenu] = useState<boolean>(false);
  const [isAddPenModalOpen, setIsAddPenModalOpen] = useState<boolean>(false);
  const [isAddPengModalOpen, setIsAddPengModalOpen] = useState<boolean>(false);
  const [masterPetugas, setMasterPetugas] = useState<PetugasMaster[]>(MASTER_PETUGAS);
  const [isSyncingUltah, setIsSyncingUltah] = useState<boolean>(false);
  const [isPullingPrevSumbangan, setIsPullingPrevSumbangan] = useState<boolean>(false);
  const lastAutoUltahKeyRef = useRef<string>('');
  const latestDataRef = useRef<FullWartaData>(data);
  latestDataRef.current = data;

  const { warta, acara_minggu, acara_partangiangan, parhobas, sopo_godang, jadwal_partangiangan, pengumuman, penerimaan, pelean_taon, hamauliateon, sumbangan_natal = [], pengeluaran, ulang_tahun, rekapitulasi } = data;

  // Muat daftar Sintua & Pengurus dari database Supabase / lokal
  useEffect(() => {
    listMasterPetugas({ activeOnly: true })
      .then((res) => {
        if (res.data.length > 0) {
          setMasterPetugas(res.data);
        }
      })
      .catch(() => {});
  }, []);

  const pullUlangTahunFromDb = async (targetDate: string, showToastMsg = false) => {
    if (!targetDate) return;
    setIsSyncingUltah(true);
    try {
      const { seninStr, mingguStr } = getSeninMingguRange(targetDate);
      const updated = await getUlangTahun(seninStr, mingguStr);
      if (latestDataRef.current.warta.tanggal_minggu === targetDate) {
        onChange({
          ...latestDataRef.current,
          ulang_tahun: updated,
          warta: {
            ...latestDataRef.current.warta,
            ulang_tahun_snapshot: updated
          }
        });
      }
      if (showToastMsg) {
        notify('success', `Berhasil menarik ${updated.length} jemaat berulang tahun dari database.`);
      }
    } catch (err: any) {
      if (showToastMsg) {
        notify('error', `Gagal menarik ulang tahun: ${err?.message || 'Error tidak diketahui'}`);
      }
    } finally {
      setIsSyncingUltah(false);
    }
  };

  // Otomatis tarik ulang tahun dari database saat membuka editor (untuk draft) atau masuk ke Langkah 4
  useEffect(() => {
    if (!warta.tanggal_minggu) return;
    const syncKey = `${warta.id}:${warta.tanggal_minggu}`;
    const shouldAutoSync =
      (warta.status === 'draft' || !ulang_tahun || ulang_tahun.length === 0) &&
      lastAutoUltahKeyRef.current !== syncKey;
    if (shouldAutoSync || (currentStep === 4 && lastAutoUltahKeyRef.current !== syncKey)) {
      lastAutoUltahKeyRef.current = syncKey;
      pullUlangTahunFromDb(warta.tanggal_minggu, false);
    }
  }, [warta.id, warta.tanggal_minggu, warta.status, currentStep]);

  // Step names
  const steps = [
    { num: 1, title: 'Info Minggu', icon: Calendar, desc: 'Tanggal, Goar ni Minggu, Ayat & Ruas' },
    { num: 2, title: 'Acara Ibadah', icon: BookOpen, desc: 'Acara Minggu & Partangiangan' },
    { num: 3, title: 'Parhobas & Parminggu', icon: Users, desc: 'Petugas Parhobas & Parminggu Minggu Nasalpu' },
    { num: 4, title: 'Tingting Namarragam', icon: Bell, desc: 'Ulang Tahun, Jadwal Koor & Warta' },
    { num: 5, title: 'Keuangan', icon: DollarSign, desc: 'Penerimaan, Rekapitulasi & Sopo Godang' },
    { num: 6, title: 'Pratinjau & Cetak', icon: Printer, desc: 'Verifikasi Akhir & Cetak PDF A4' }
  ];

  // Helper to update warta fields
  const updateWarta = (fields: Partial<WartaRecord>) => {
    const updatedWarta = { ...warta, ...fields };
    // Recalculate rekapitulasi when saldo awal changes
    const updatedRekap = calculateRekapitulasi(updatedWarta, penerimaan, pengeluaran);
    onChange({
      ...data,
      warta: updatedWarta,
      rekapitulasi: updatedRekap
    });
  };

  const handleTanggalMingguChange = (newDate: string) => {
    updateWarta({ tanggal_minggu: newDate });
    if (newDate) {
      lastAutoUltahKeyRef.current = `${warta.id}:${newDate}`;
      pullUlangTahunFromDb(newDate, false);
    }
  };

  // Auto-fill Liturgical Sunday
  const handleSelectMingguLiturgi = (nama: string, item?: MingguLiturgi) => {
    if (item) {
      updateWarta({
        goar_minggu: item.nama_minggu.toUpperCase(),
        topik_minggu: item.topik_default || warta.topik_minggu,
        ayat_teks: item.ayat_default || warta.ayat_teks,
        ayat_ref: item.ayat_ref_default || warta.ayat_ref
      });
    } else {
      const found = MASTER_MINGGU_LITURGI.find(
        (m) => m.nama_minggu.toUpperCase() === nama.toUpperCase()
      );
      if (found) {
        updateWarta({
          goar_minggu: found.nama_minggu.toUpperCase(),
          topik_minggu: found.topik_default || warta.topik_minggu,
          ayat_teks: found.ayat_default || warta.ayat_teks,
          ayat_ref: found.ayat_ref_default || warta.ayat_ref
        });
      } else {
        updateWarta({ goar_minggu: nama.toUpperCase() });
      }
    }
  };

  // Sync birthdays from Supabase RPC / Database
  const handleSyncUlangTahun = async () => {
    lastAutoUltahKeyRef.current = `${warta.id}:${warta.tanggal_minggu}`;
    await pullUlangTahunFromDb(warta.tanggal_minggu, true);
  };

  // Dynamic Column Modal State
  const [columnModal, setColumnModal] = useState<{
    isOpen: boolean;
    targetTable: 'parhobas' | 'acara_minggu' | 'acara_partangiangan' | 'sopo_godang' | 'jadwal_partangiangan';
    tableName: string;
    suggestions: string[];
  }>({
    isOpen: false,
    targetTable: 'parhobas',
    tableName: '',
    suggestions: []
  });

  const openAddColumn = (
    targetTable: 'parhobas' | 'acara_minggu' | 'acara_partangiangan' | 'sopo_godang' | 'jadwal_partangiangan',
    tableName: string,
    suggestions: string[] = []
  ) => {
    setColumnModal({
      isOpen: true,
      targetTable,
      tableName,
      suggestions
    });
  };

  const handleAddColumn = (column: DynamicTableColumn) => {
    switch (columnModal.targetTable) {
      case 'parhobas': {
        const current = data.parhobas_columns && data.parhobas_columns.length > 0
          ? data.parhobas_columns
          : DEFAULT_PARHOBAS_COLUMNS;
        onChange({ ...data, parhobas_columns: [...current, column] });
        break;
      }
      case 'acara_minggu': {
        const current = data.acara_minggu_columns && data.acara_minggu_columns.length > 0
          ? data.acara_minggu_columns
          : DEFAULT_ACARA_MINGGU_COLUMNS;
        onChange({ ...data, acara_minggu_columns: [...current, column] });
        break;
      }
      case 'acara_partangiangan': {
        const current = data.acara_partangiangan_columns && data.acara_partangiangan_columns.length > 0
          ? data.acara_partangiangan_columns
          : DEFAULT_ACARA_PARTANGIANGAN_COLUMNS;
        onChange({ ...data, acara_partangiangan_columns: [...current, column] });
        break;
      }
      case 'jadwal_partangiangan': {
        const current = data.jadwal_partangiangan_columns && data.jadwal_partangiangan_columns.length > 0
          ? data.jadwal_partangiangan_columns
          : DEFAULT_PARTANGIANGAN_COLUMNS;
        onChange({ ...data, jadwal_partangiangan_columns: [...current, column] });
        break;
      }
      case 'sopo_godang': {
        const current = data.sopo_godang_columns && data.sopo_godang_columns.length > 0
          ? data.sopo_godang_columns
          : DEFAULT_SOPO_GODANG_COLUMNS;
        onChange({ ...data, sopo_godang_columns: [...current, column] });
        break;
      }
    }
  };

  const handleDeleteColumn = (
    table: 'parhobas' | 'acara_minggu' | 'acara_partangiangan' | 'sopo_godang' | 'jadwal_partangiangan',
    columnKey: string
  ) => {
    if (!confirm('Yakin ingin menghapus kolom ini dari tabel?')) return;
    switch (table) {
      case 'parhobas': {
        const current = data.parhobas_columns && data.parhobas_columns.length > 0
          ? data.parhobas_columns
          : DEFAULT_PARHOBAS_COLUMNS;
        onChange({ ...data, parhobas_columns: current.filter((c) => c.key !== columnKey) });
        break;
      }
      case 'acara_minggu': {
        const current = data.acara_minggu_columns && data.acara_minggu_columns.length > 0
          ? data.acara_minggu_columns
          : DEFAULT_ACARA_MINGGU_COLUMNS;
        onChange({ ...data, acara_minggu_columns: current.filter((c) => c.key !== columnKey) });
        break;
      }
      case 'acara_partangiangan': {
        const current = data.acara_partangiangan_columns && data.acara_partangiangan_columns.length > 0
          ? data.acara_partangiangan_columns
          : DEFAULT_ACARA_PARTANGIANGAN_COLUMNS;
        onChange({ ...data, acara_partangiangan_columns: current.filter((c) => c.key !== columnKey) });
        break;
      }
      case 'jadwal_partangiangan': {
        const current = data.jadwal_partangiangan_columns && data.jadwal_partangiangan_columns.length > 0
          ? data.jadwal_partangiangan_columns
          : DEFAULT_PARTANGIANGAN_COLUMNS;
        onChange({ ...data, jadwal_partangiangan_columns: current.filter((c) => c.key !== columnKey) });
        break;
      }
      case 'sopo_godang': {
        const current = data.sopo_godang_columns && data.sopo_godang_columns.length > 0
          ? data.sopo_godang_columns
          : DEFAULT_SOPO_GODANG_COLUMNS;
        onChange({ ...data, sopo_godang_columns: current.filter((c) => c.key !== columnKey) });
        break;
      }
    }
  };

  // Acara Minggu handlers (Row & Cell)
  const handleAcaraMingguCellChange = (index: number, field: string, value: string) => {
    const updated = [...acara_minggu];
    updated[index] = { ...updated[index], [field]: value };
    onChange({ ...data, acara_minggu: updated });
  };

  const handleAddAcaraMingguRow = () => {
    const newItem: AcaraIbadahItem = {
      id: `am-${Date.now()}`,
      warta_id: warta.id,
      jenis: 'minggu',
      urutan: acara_minggu.length + 1,
      uraian: '',
      keterangan: ''
    };
    onChange({ ...data, acara_minggu: [...acara_minggu, newItem] });
  };

  const handleDeleteAcaraMingguRow = (index: number) => {
    const updated = acara_minggu
      .filter((_, idx) => idx !== index)
      .map((it, idx) => ({ ...it, urutan: idx + 1 }));
    onChange({ ...data, acara_minggu: updated });
  };

  const handleResetAcaraMinggu = () => {
    if (confirm('Kembalikan susunan Acara Minggu ke template standar liturgi HKBP?')) {
      const resetItems = DEFAULT_ACARA_MINGGU_TEMPLATE.map((it, idx) => ({
        id: `am-reset-${idx + 1}`,
        warta_id: warta.id,
        jenis: 'minggu' as const,
        urutan: idx + 1,
        uraian: it.uraian,
        keterangan: it.keterangan || ''
      }));
      onChange({
        ...data,
        acara_minggu: resetItems,
        acara_minggu_columns: DEFAULT_ACARA_MINGGU_COLUMNS
      });
    }
  };

  // Acara Partangiangan handlers (Row & Cell)
  const handleAcaraPartangianganCellChange = (index: number, field: string, value: string) => {
    const updated = [...acara_partangiangan];
    updated[index] = { ...updated[index], [field]: value };
    onChange({ ...data, acara_partangiangan: updated });
  };

  const handleAddAcaraPartangianganRow = () => {
    const newItem: AcaraIbadahItem = {
      id: `ap-${Date.now()}`,
      warta_id: warta.id,
      jenis: 'partangiangan',
      urutan: acara_partangiangan.length + 1,
      uraian: '',
      keterangan: ''
    };
    onChange({ ...data, acara_partangiangan: [...acara_partangiangan, newItem] });
  };

  const handleDeleteAcaraPartangianganRow = (index: number) => {
    const updated = acara_partangiangan
      .filter((_, idx) => idx !== index)
      .map((it, idx) => ({ ...it, urutan: idx + 1 }));
    onChange({ ...data, acara_partangiangan: updated });
  };

  const handleResetAcaraPartangiangan = () => {
    if (confirm('Kembalikan susunan Acara Partangiangan ke template standar?')) {
      const resetItems = DEFAULT_ACARA_PARTANGIANGAN_TEMPLATE.map((it, idx) => ({
        id: `ap-reset-${idx + 1}`,
        warta_id: warta.id,
        jenis: 'partangiangan' as const,
        urutan: idx + 1,
        uraian: it.uraian,
        keterangan: it.keterangan || ''
      }));
      onChange({
        ...data,
        acara_partangiangan: resetItems,
        acara_partangiangan_columns: DEFAULT_ACARA_PARTANGIANGAN_COLUMNS
      });
    }
  };

  // Parhobas handlers (Row & Cell)
  const handleParhobasCellChange = (index: number, field: string, value: string) => {
    const updated = [...parhobas];
    updated[index] = { ...updated[index], [field]: value };
    onChange({ ...data, parhobas: updated });
  };

  const handleAddParhobasRow = () => {
    const newItem: ParhobasItem = {
      id: `p-${Date.now()}`,
      warta_id: warta.id,
      peran: 'Petugas / Ulaon Baru',
      skm: '',
      sesi1: '',
      sesi2: '',
      urutan: parhobas.length + 1
    };
    onChange({ ...data, parhobas: [...parhobas, newItem] });
  };

  const handleDeleteParhobasRow = (index: number) => {
    const updated = parhobas
      .filter((_, idx) => idx !== index)
      .map((it, idx) => ({ ...it, urutan: idx + 1 }));
    onChange({ ...data, parhobas: updated });
  };

  // Sopo Godang handlers (Row & Cell)
  const handleSopoGodangCellChange = (index: number, field: string, value: string) => {
    const updated = [...sopo_godang];
    updated[index] = { ...updated[index], [field]: value };
    onChange({ ...data, sopo_godang: updated });
  };

  const handleAddSopoGodangRow = () => {
    const newItem: SopoGodangItem = {
      id: `sg-${Date.now()}`,
      warta_id: warta.id,
      nama: '',
      tanggal: '',
      urutan: sopo_godang.length + 1
    };
    onChange({ ...data, sopo_godang: [...sopo_godang, newItem] });
  };

  const handleDeleteSopoGodangRow = (index: number) => {
    const updated = sopo_godang
      .filter((_, idx) => idx !== index)
      .map((it, idx) => ({ ...it, urutan: idx + 1 }));
    onChange({ ...data, sopo_godang: updated });
  };

  // Jadwal Partangiangan Lingkungan handlers (Row & Cell)
  const handleJadwalPartangianganCellChange = (index: number, field: string, value: string) => {
    const updated = [...jadwal_partangiangan];
    updated[index] = { ...updated[index], [field]: value };
    onChange({ ...data, jadwal_partangiangan: updated });
  };

  const handleAddPartangianganRow = () => {
    const newItem: JadwalPartangianganItem = {
      id: `jp-${Date.now()}`,
      warta_id: warta.id,
      hari: 'Rabu',
      lingkungan: 'Lingk. Letare',
      pukul: '20.00 WIB',
      inganan: '',
      urutan: jadwal_partangiangan.length + 1
    };
    onChange({ ...data, jadwal_partangiangan: [...jadwal_partangiangan, newItem] });
  };

  const handleDeletePartangianganRow = (index: number) => {
    const updated = jadwal_partangiangan
      .filter((_, idx) => idx !== index)
      .map((it, idx) => ({ ...it, urutan: idx + 1 }));
    onChange({ ...data, jadwal_partangiangan: updated });
  };

  // Pengumuman handlers
  const handleAddPengumuman = () => {
    const newItem = {
      id: `peng-${Date.now()}`,
      warta_id: warta.id,
      urutan: pengumuman.length + 1,
      judul: '',
      isi: ''
    };
    onChange({ ...data, pengumuman: [...pengumuman, newItem] });
  };

  const handlePengumumanChange = (index: number, field: 'judul' | 'isi', value: string) => {
    const updated = [...pengumuman];
    updated[index] = { ...updated[index], [field]: value };
    onChange({ ...data, pengumuman: updated });
  };

  const handleDeletePengumuman = (index: number) => {
    const updated = pengumuman
      .filter((_, idx) => idx !== index)
      .map((p, idx) => ({ ...p, urutan: idx + 1 }));
    onChange({ ...data, pengumuman: updated });
  };

  // Keuangan: Penerimaan row change
  const handlePenerimaanAmountChange = (index: number, rawVal: string) => {
    const amount = parseRupiahInput(rawVal);
    const updatedRows = [...penerimaan];
    updatedRows[index] = {
      ...updatedRows[index],
      jumlah: amount
    };
    const { updatedRows: recalculated } = recalculatePenerimaanRows(updatedRows);
    const rekap = calculateRekapitulasi(warta, recalculated, pengeluaran);
    onChange({
      ...data,
      penerimaan: recalculated,
      rekapitulasi: rekap
    });
  };

  // Hamauliateon yang ditujukan ke Kas Huria selalu dikenakan 55% Sentralisasi / 45% Kas Huria
  const isHamSentral = true;

  const transitoriOptions = React.useMemo(() => {
    const rows13 = (penerimaan || []).filter(
      (r) =>
        r.kelompok === '1.3' ||
        (r.no_tampilan && r.no_tampilan.startsWith('1.3')) ||
        r.aturan_alokasi === 'transitori'
    );
    const source =
      rows13.length > 0
        ? rows13
        : MASTER_KATEGORI_PENERIMAAN.filter((k) => k.kelompok === '1.3');
    return source.map((r) => ({
      kode: r.kode,
      no_tampilan: r.no_tampilan || '',
      uraian: r.uraian
    }));
  }, [penerimaan]);

  const handlePenerimaanSentralisasiChange = (index: number, isSentral: boolean) => {
    const updatedRows = [...penerimaan];
    const target = updatedRows[index];
    if (target.kode === 'HAM_LAIN' || target.no_tampilan === '1.2.17') {
      const hamTotals = calculateHamauliateonTotals(hamauliateon, isSentral);
      updatedRows[index] = {
        ...target,
        is_sentralisasi: isSentral,
        aturan_alokasi: 'manual' as const,
        jumlah: hamTotals.totalJumlah,
        huria_45: hamTotals.totalHuria,
        sosial: hamTotals.totalSosial,
        pembangunan: hamTotals.totalPembangunan,
        sentral_55: hamTotals.totalSentral,
        transitori: hamTotals.totalTransitori
      };
    } else {
      updatedRows[index] = {
        ...target,
        is_sentralisasi: isSentral
      };
    }
    const { updatedRows: recalculated } = recalculatePenerimaanRows(updatedRows);
    const rekap = calculateRekapitulasi(warta, recalculated, pengeluaran);
    onChange({
      ...data,
      penerimaan: recalculated,
      rekapitulasi: rekap
    });
  };

  const handlePenerimaanUraianChange = (index: number, newUraian: string) => {
    const updatedRows = [...penerimaan];
    updatedRows[index] = {
      ...updatedRows[index],
      uraian: newUraian
    };
    onChange({
      ...data,
      penerimaan: updatedRows
    });
  };

  const handlePenerimaanCatatanChange = (index: number, newCatatan: string) => {
    const updatedRows = [...penerimaan];
    updatedRows[index] = {
      ...updatedRows[index],
      catatan: newCatatan
    };
    onChange({
      ...data,
      penerimaan: updatedRows
    });
  };

  const handlePenerimaanDialihkanChange = (index: number) => {
    const updatedRows = [...penerimaan];
    updatedRows[index] = {
      ...updatedRows[index],
      dialihkan_ke_pembangunan: !updatedRows[index].dialihkan_ke_pembangunan
    };
    const { updatedRows: recalculated } = recalculatePenerimaanRows(updatedRows);
    const rekap = calculateRekapitulasi(warta, recalculated, pengeluaran);
    onChange({
      ...data,
      penerimaan: recalculated,
      rekapitulasi: rekap
    });
  };

  const handlePenerimaanAturanChange = (index: number, newAturan: AturanAlokasi) => {
    const updatedRows = [...penerimaan];
    updatedRows[index] = {
      ...updatedRows[index],
      aturan_alokasi: newAturan
    };
    const { updatedRows: recalculated } = recalculatePenerimaanRows(updatedRows);
    const rekap = calculateRekapitulasi(warta, recalculated, pengeluaran);
    onChange({
      ...data,
      penerimaan: recalculated,
      rekapitulasi: rekap
    });
  };

  const handleAddPenerimaanRow = (kelompok: '1.1' | '1.2' | '1.3') => {
    const existingInGroup = penerimaan.filter(
      p => p.kelompok === kelompok || (p.no_tampilan && p.no_tampilan.startsWith(kelompok))
    );
    const nextSubNo = existingInGroup.length + 1;
    const noTampilan = `${kelompok}.${nextSubNo}`;

    let defaultUraian = 'Persembahan Baru';
    let defaultAturan: AturanAlokasi = 'split_45_55';
    let defaultSentral = true;
    if (kelompok === '1.3') {
      defaultUraian = 'Penerimaan Transitori Baru';
      defaultAturan = 'transitori';
      defaultSentral = false;
    } else if (kelompok === '1.1') {
      defaultUraian = 'Persembahan Kebaktian Tambahan';
    }

    const newRow: PenerimaanRow = {
      id: `pen-custom-${Date.now()}`,
      kode: `CUSTOM_${Date.now()}`,
      kelompok,
      no_tampilan: noTampilan,
      urutan: penerimaan.length + 1,
      uraian: defaultUraian,
      aturan_alokasi: defaultAturan,
      is_sentralisasi: defaultSentral,
      dialihkan_ke_pembangunan: false,
      jumlah: 0,
      huria_45: 0,
      sosial: 0,
      pembangunan: 0,
      sentral_55: 0,
      transitori: 0
    };

    const updatedRows = [...penerimaan, newRow];
    const { updatedRows: recalculated } = recalculatePenerimaanRows(updatedRows);
    const rekap = calculateRekapitulasi(warta, recalculated, pengeluaran);
    setShowPenerimaanAddMenu(false);
    onChange({
      ...data,
      penerimaan: recalculated,
      rekapitulasi: rekap
    });
  };

  const handleDeletePenerimaanRow = (index: number) => {
    const updatedRows = penerimaan.filter((_, idx) => idx !== index);
    const { updatedRows: recalculated } = recalculatePenerimaanRows(updatedRows);
    const rekap = calculateRekapitulasi(warta, recalculated, pengeluaran);
    onChange({
      ...data,
      penerimaan: recalculated,
      rekapitulasi: rekap
    });
  };

  // Keuangan: Pelean Taon change & auto sum to Pelean Taon (1.2.15)
  const handlePeleanTaonChange = (index: number, field: 'nama' | 'lingkungan' | 'jumlah', val: any) => {
    const updated = [...pelean_taon];
    updated[index] = { ...updated[index], [field]: field === 'jumlah' ? parseRupiahInput(val) : val };
    const sumPeleanTaon = updated.reduce((acc, c) => acc + (c.jumlah || 0), 0);

    // Auto-update baris Pelean Taon (PEL_TAON / 1.2.15)
    const updatedPen = penerimaan.map((r) =>
      r.kode === 'PEL_TAON' || r.no_tampilan === '1.2.15' ? { ...r, jumlah: sumPeleanTaon } : r
    );
    const { updatedRows: recalculated } = recalculatePenerimaanRows(updatedPen);
    const rekap = calculateRekapitulasi(warta, recalculated, pengeluaran);

    onChange({
      ...data,
      pelean_taon: updated,
      penerimaan: recalculated,
      rekapitulasi: rekap
    });
  };

  // Keuangan: Hamauliateon change with multi-pos breakdown & auto sum to 1.2.17
  const syncHamauliateonWizard = (updatedHam: HamauliateonItem[]) => {
    const hamTotals = calculateHamauliateonTotals(updatedHam, isHamSentral);
    const updatedPen = penerimaan.map((r) =>
      r.kode === 'HAM_LAIN' || r.no_tampilan === '1.2.17'
        ? {
            ...r,
            jumlah: hamTotals.totalJumlah,
            aturan_alokasi: 'manual' as const,
            is_sentralisasi: isHamSentral,
            huria_45: hamTotals.totalHuria,
            sosial: hamTotals.totalSosial,
            pembangunan: hamTotals.totalPembangunan,
            sentral_55: hamTotals.totalSentral,
            transitori: hamTotals.totalTransitori
          }
        : r
    );
    const { updatedRows: recalculated } = recalculatePenerimaanRows(updatedPen);
    const rekap = calculateRekapitulasi(warta, recalculated, pengeluaran);

    onChange({
      ...data,
      hamauliateon: updatedHam,
      penerimaan: recalculated,
      rekapitulasi: rekap
    });
  };

  const handleHamauliateonChange = (index: number, field: string, val: any) => {
    const updated = [...hamauliateon];
    const isNumField = [
      'jumlah',
      'ke_huria',
      'ke_sosial',
      'ke_pembangunan',
      'ke_transitori'
    ].includes(field);

    const parsedVal = isNumField ? parseRupiahInput(val) : val;
    const item: HamauliateonItem = { ...updated[index], [field]: parsedVal };

    if (
      ['ke_huria', 'ke_sosial', 'ke_pembangunan', 'ke_transitori'].includes(
        field
      )
    ) {
      item.ke_sentralisasi = 0;
      const transSum =
        field === 'ke_transitori'
          ? parsedVal
          : calculateHamauliateonTransitoriSum(item);
      const sum =
        (item.ke_huria || 0) +
        (item.ke_sosial || 0) +
        (item.ke_pembangunan || 0) +
        transSum;
      item.jumlah = sum;
    } else if (field === 'jumlah') {
      const sumPos =
        (item.ke_huria || 0) +
        (item.ke_sosial || 0) +
        (item.ke_pembangunan || 0) +
        calculateHamauliateonTransitoriSum(item);
      if (sumPos === 0 || sumPos === updated[index].jumlah) {
        item.ke_huria = parsedVal;
      }
      item.ke_sentralisasi = 0;
    }

    updated[index] = item;
    syncHamauliateonWizard(updated);
  };

  const applyHamauliateonTransitoriEntries = (
    item: HamauliateonItem,
    entries: HamauliateonTransitoriItem[]
  ): HamauliateonItem => {
    const cleaned = entries.map((t, tIdx) => ({
      id: t.id || `tr-${item.id || 'ham'}-${tIdx + 1}`,
      kode: t.kode || '',
      uraian: t.uraian || '',
      jumlah: Math.max(0, Math.round(t.jumlah || 0))
    }));
    const transSum = cleaned.reduce((acc, cur) => acc + cur.jumlah, 0);
    const firstKode = cleaned.find((t) => t.kode)?.kode || '';
    const joinedUraian =
      cleaned
        .filter((t) => t.jumlah > 0 && t.uraian)
        .map((t) => t.uraian)
        .join(', ') ||
      cleaned.find((t) => t.uraian)?.uraian ||
      '';
    const sum =
      (item.ke_huria || 0) +
      (item.ke_sosial || 0) +
      (item.ke_pembangunan || 0) +
      transSum;

    return {
      ...item,
      transitori_items: cleaned,
      ke_transitori: transSum,
      transitori_kode: firstKode,
      transitori_uraian: joinedUraian,
      ke_sentralisasi: 0,
      jumlah: sum
    };
  };

  const handleAddHamauliateonTransitoriEntry = (hamIdx: number) => {
    const updated = [...hamauliateon];
    const current = updated[hamIdx];
    const existing = getHamauliateonTransitoriList(current);
    const baseList: HamauliateonTransitoriItem[] =
      existing.length > 0
        ? existing
        : [{ id: `tr-${current.id || hamIdx}-1`, kode: '', uraian: '', jumlah: 0 }];
    const nextList: HamauliateonTransitoriItem[] = [
      ...baseList,
      { id: `tr-${Date.now()}-${baseList.length + 1}`, kode: '', uraian: '', jumlah: 0 }
    ];
    updated[hamIdx] = applyHamauliateonTransitoriEntries(current, nextList);
    syncHamauliateonWizard(updated);
  };

  const handleUpdateHamauliateonTransitoriEntry = (
    hamIdx: number,
    transIdx: number,
    field: 'kode' | 'jumlah',
    val: any
  ) => {
    const updated = [...hamauliateon];
    const current = updated[hamIdx];
    const existing = getHamauliateonTransitoriList(current);
    const list: HamauliateonTransitoriItem[] =
      existing.length > 0
        ? [...existing]
        : [{ id: `tr-${current.id || hamIdx}-1`, kode: '', uraian: '', jumlah: 0 }];

    const target = { ...list[transIdx] };
    if (field === 'kode') {
      const matched = transitoriOptions.find((opt) => opt.kode === val);
      target.kode = val;
      target.uraian = matched ? matched.uraian : '';
    } else {
      target.jumlah = parseRupiahInput(val);
    }
    list[transIdx] = target;

    updated[hamIdx] = applyHamauliateonTransitoriEntries(current, list);
    syncHamauliateonWizard(updated);
  };

  const handleDeleteHamauliateonTransitoriEntry = (hamIdx: number, transIdx: number) => {
    const updated = [...hamauliateon];
    const current = updated[hamIdx];
    const existing = getHamauliateonTransitoriList(current);
    const remaining = existing.filter((_, idx) => idx !== transIdx);
    updated[hamIdx] = applyHamauliateonTransitoriEntries(current, remaining);
    syncHamauliateonWizard(updated);
  };

  const handleAddHamauliateonRow = () => {
    const newItem: HamauliateonItem = {
      id: `ham-${Date.now()}`,
      warta_id: warta.id,
      nama: 'Kel. ',
      rincian: 'Hamauliateon',
      jumlah: 0,
      ke_huria: 0,
      ke_sosial: 0,
      ke_pembangunan: 0,
      ke_sentralisasi: 0,
      ke_transitori: 0,
      transitori_kode: '',
      transitori_uraian: '',
      transitori_items: [],
      urutan: hamauliateon.length + 1
    };
    syncHamauliateonWizard([...hamauliateon, newItem]);
  };

  const handleDeleteHamauliateonRow = (index: number) => {
    const updated = hamauliateon.filter((_, idx) => idx !== index);
    syncHamauliateonWizard(updated);
  };

  // Keuangan: Sumbangan Natal Diakoni Sosial (sementara/opsional) -> masuk ke Kas Sosial Huria
  const syncSumbanganNatalWizard = (
    updatedList: SumbanganNatalItem[],
    nextVisible = warta.tampilkan_sumbangan_natal !== false
  ) => {
    const updatedWarta = { ...warta, tampilkan_sumbangan_natal: nextVisible };
    const syncedPen = syncSumbanganNatalToPenerimaanRows(
      penerimaan,
      updatedList,
      nextVisible,
      warta.id
    );
    const { updatedRows: recalculated } = recalculatePenerimaanRows(syncedPen);
    const rekap = calculateRekapitulasi(updatedWarta, recalculated, pengeluaran);

    onChange({
      ...data,
      warta: updatedWarta,
      sumbangan_natal: updatedList,
      penerimaan: recalculated,
      rekapitulasi: rekap
    });
  };

  const handleSumbanganNatalChange = (
    index: number,
    field: 'nama' | 'lingkungan' | 'jumlah',
    val: any
  ) => {
    const updated = [...sumbangan_natal];
    updated[index] = {
      ...updated[index],
      [field]: field === 'jumlah' ? parseRupiahInput(val) : val
    };
    syncSumbanganNatalWizard(updated);
  };

  const handleAddSumbanganNatalRow = () => {
    const newItem: SumbanganNatalItem = {
      id: `sn-${Date.now()}`,
      warta_id: warta.id,
      nama: '',
      lingkungan: '',
      jumlah: 0,
      urutan: sumbangan_natal.length + 1
    };
    syncSumbanganNatalWizard([...sumbangan_natal, newItem], true);
  };

  const handleDeleteSumbanganNatalRow = (index: number) => {
    const updated = sumbangan_natal
      .filter((_, idx) => idx !== index)
      .map((item, idx) => ({ ...item, urutan: idx + 1 }));
    syncSumbanganNatalWizard(updated);
  };

  const handleToggleSumbanganNatalVisibility = (visible: boolean) => {
    syncSumbanganNatalWizard(sumbangan_natal, visible);
  };

  const handleToggleSumbanganNatalPeriod = (index: number) => {
    const updated = [...sumbangan_natal];
    updated[index] = {
      ...updated[index],
      dari_minggu_lalu: !updated[index].dari_minggu_lalu
    };
    syncSumbanganNatalWizard(updated);
  };

  const handlePullPrevSumbanganNatal = async () => {
    setIsPullingPrevSumbangan(true);
    try {
      const prevRes = await getPreviousWeekSumbanganNatal(warta.tanggal_minggu, warta.id);
      if (!prevRes || prevRes.items.length === 0) {
        notify('info', 'Belum ada data Sumbangan Natal Diakoni Sosial di warta minggu sebelumnya.');
        return;
      }
      const ts = Date.now();
      const carriedRows: SumbanganNatalItem[] = prevRes.items.map((item, idx) => ({
        ...item,
        id: `sn-prev-${ts}-${idx + 1}`,
        warta_id: warta.id,
        dari_minggu_lalu: true,
        urutan: idx + 1
      }));
      const currentWeekRows = sumbangan_natal.filter((item) => !item.dari_minggu_lalu);
      const merged = [...carriedRows, ...currentWeekRows].map((item, idx) => ({
        ...item,
        urutan: idx + 1
      }));
      syncSumbanganNatalWizard(merged, true);
      notify(
        'success',
        `Berhasil mengambil ${carriedRows.length} data penyumbang dari warta ${formatTanggalIndo(prevRes.sourceWarta.tanggal_minggu)}.`
      );
    } catch (err: any) {
      notify('error', err?.message || 'Gagal mengambil data minggu sebelumnya.');
    } finally {
      setIsPullingPrevSumbangan(false);
    }
  };

  // Keuangan: Pengeluaran change
  const handlePengeluaranChange = (index: number, field: 'uraian', val: string) => {
    const updated = [...pengeluaran];
    updated[index] = {
      ...updated[index],
      [field]: val
    };
    onChange({
      ...data,
      pengeluaran: updated
    });
  };

  const handlePengeluaranAmountChange = (
    index: number,
    field: 'huria' | 'sentralisasi' | 'sosial' | 'pembangunan' | 'transitori',
    rawVal: string
  ) => {
    const val = parseRupiahInput(rawVal);
    const updated = [...pengeluaran];
    updated[index] = {
      ...updated[index],
      [field]: val
    };
    const rekap = calculateRekapitulasi(warta, penerimaan, updated);
    onChange({
      ...data,
      pengeluaran: updated,
      rekapitulasi: rekap
    });
  };

  const handlePengeluaranSentralisasiChange = (index: number, isSentral: boolean) => {
    const updated = [...pengeluaran];
    const item = updated[index];
    if (isSentral) {
      const currentTotal = (item.huria || 0) + (item.sentralisasi || 0);
      const totalToSplit = currentTotal > 0 ? currentTotal : 100000;
      const sentral55 = Math.round(totalToSplit * 0.55);
      const huria45 = totalToSplit - sentral55;
      updated[index] = {
        ...item,
        is_sentralisasi: true,
        sentralisasi: sentral55,
        huria: huria45
      };
    } else {
      const restored = (item.huria || 0) + (item.sentralisasi || 0);
      updated[index] = {
        ...item,
        is_sentralisasi: false,
        sentralisasi: 0,
        huria: restored
      };
    }
    const rekap = calculateRekapitulasi(warta, penerimaan, updated);
    onChange({
      ...data,
      pengeluaran: updated,
      rekapitulasi: rekap
    });
  };

  const handleAddPengeluaranRow = () => {
    const newItem: PengeluaranItem = {
      id: `pengel-${Date.now()}`,
      warta_id: warta.id,
      urutan: pengeluaran.length + 1,
      uraian: 'Belanja / Pengeluaran Baru',
      is_sentralisasi: false,
      huria: 0,
      sosial: 0,
      pembangunan: 0,
      transitori: 0,
      sentralisasi: 0
    };
    const updated = [...pengeluaran, newItem];
    const rekap = calculateRekapitulasi(warta, penerimaan, updated);
    onChange({
      ...data,
      pengeluaran: updated,
      rekapitulasi: rekap
    });
  };

  const handleDeletePengeluaranRow = (index: number) => {
    const updated = pengeluaran
      .filter((_, idx) => idx !== index)
      .map((it, idx) => ({ ...it, urutan: idx + 1 }));
    const rekap = calculateRekapitulasi(warta, penerimaan, updated);
    onChange({
      ...data,
      pengeluaran: updated,
      rekapitulasi: rekap
    });
  };

  const handlePrint = () => {
    const targetFileName = `Warta_HKBP_Hutaraja_${warta.tanggal_minggu}`;
    const originalTitle = document.title;
    document.title = targetFileName;
    window.print();
    setTimeout(() => {
      document.title = originalTitle;
    }, 1500);
  };

  return (
    <div className="space-y-6">
      {/* 1. WIZARD STEPPER HEADER */}
      <div className="bg-white rounded-xl border border-stone-200 shadow-xs p-3 md:p-4">
        <div className="flex items-center justify-between border-b border-stone-100 pb-3 mb-3">
          <div className="flex items-center gap-2">
            <span className="bg-blue-600 text-white text-xs font-bold px-2 py-0.5 rounded">
              Wizard Pengisian Warta
            </span>
            <span className="text-xs text-stone-500 font-medium hidden sm:inline">
              Langkah {currentStep} dari 6
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowLivePreview(!showLivePreview)}
              className="hidden lg:inline-flex items-center gap-1.5 px-3 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg text-xs font-semibold cursor-pointer transition"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>{showLivePreview ? 'Tutup Pratinjau Kanan' : 'Buka Pratinjau Kanan'}</span>
            </button>
            <button
              onClick={onSave}
              disabled={isSaving}
              className="inline-flex items-center gap-1.5 px-3.5 py-1 bg-amber-500 hover:bg-amber-400 text-stone-950 rounded-lg text-xs font-bold cursor-pointer transition shadow-xs disabled:opacity-50"
            >
              {isSaving ? 'Menyimpan...' : 'Simpan Draf'}
            </button>
          </div>
        </div>

        {/* Stepper Navigation Pills */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {steps.map((st) => {
            const Icon = st.icon;
            const isActive = currentStep === st.num;
            const isCompleted = currentStep > st.num;

            return (
              <button
                key={st.num}
                onClick={() => setCurrentStep(st.num)}
                className={`p-2.5 rounded-lg border text-left transition flex items-start gap-2.5 cursor-pointer ${
                  isActive
                    ? 'border-blue-600 bg-blue-50/70 shadow-xs ring-1 ring-blue-600'
                    : isCompleted
                    ? 'border-stone-200 bg-emerald-50/40 hover:bg-emerald-50'
                    : 'border-stone-200 bg-stone-50/50 hover:bg-stone-100'
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                    isActive
                      ? 'bg-blue-600 text-white'
                      : isCompleted
                      ? 'bg-emerald-600 text-white'
                      : 'bg-stone-300 text-stone-700'
                  }`}
                >
                  {isCompleted ? <CheckCircle2 className="w-3.5 h-3.5" /> : st.num}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-stone-900 truncate">{st.title}</div>
                  <div className="text-[10px] text-stone-500 truncate hidden md:block">{st.desc}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. MAIN WIZARD BODY (Two-Column Layout: Form Input on Left, Live Preview on Right) */}
      <div className={`grid grid-cols-1 ${showLivePreview && currentStep !== 6 ? 'lg:grid-cols-12 gap-6' : ''}`}>
        {/* Left Column: Form Inputs */}
        <div className={showLivePreview && currentStep !== 6 ? 'lg:col-span-7' : 'max-w-4xl mx-auto w-full'}>
          {/* STEP 1: INFO MINGGU */}
          {currentStep === 1 && (
            <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-4 md:p-6 space-y-5">
              <div className="border-b border-stone-200 pb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-stone-900">Langkah 1: Info & Kalender Minggu</h3>
                  <p className="text-xs text-stone-500">
                    Tentukan tanggal minggu, topik khotbah, ayat nas, dan data kehadiran ruas.
                  </p>
                </div>
                <span className="bg-blue-100 text-blue-900 text-xs font-bold px-2.5 py-0.5 rounded-full">
                  Langkah 1 / 6
                </span>
              </div>

              {/* Tanggal & Judul Header */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-stone-800 mb-1">
                    Tanggal Minggu:
                  </label>
                  <input
                    type="date"
                    value={warta.tanggal_minggu}
                    onChange={(e) => handleTanggalMingguChange(e.target.value)}
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm bg-stone-50 focus:bg-white focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="text-[11px] text-stone-500 mt-1 flex items-center gap-1">
                    <span className="font-semibold text-stone-700">Format Judul Otomatis:</span>{' '}
                    <span className="text-blue-900 font-bold">{formatHeaderMinggu(warta.tanggal_minggu)}</span>
                  </div>
                </div>

                {/* Dropdown Nama Minggu Liturgi */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-stone-800">
                      Goar ni Minggu (Kalender Liturgi HKBP):
                    </label>
                    <span className="text-[10px] bg-blue-50 text-blue-900 font-bold px-1.5 py-0.2 rounded border border-blue-200">
                      Pilih dari 63 Minggu
                    </span>
                  </div>
                  <MingguLiturgiDropdown
                    value={warta.goar_minggu}
                    onChange={(nama, item) => handleSelectMingguLiturgi(nama, item)}
                  />
                  <p className="text-[11px] text-stone-500 mt-1">
                    Memilih dari daftar otomatis menyelaraskan Topik, Ayat Nas, dan Warna Tutup Langgatan.
                  </p>
                </div>
              </div>

              {/* Topik Minggu & Ayat */}
              <div className="space-y-3 pt-2 border-t border-stone-100">
                <div>
                  <label className="block text-xs font-bold text-stone-800 mb-1">
                    Topik ni Minggu:
                  </label>
                  <input
                    type="text"
                    value={warta.topik_minggu || ''}
                    onChange={(e) => updateWarta({ topik_minggu: e.target.value })}
                    placeholder="Contoh: Marpangunsandean tu Debata di Tingki Hagogotan"
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm bg-stone-50 focus:bg-white"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-stone-800 mb-1">
                      Ayat Nas / Kotak Ayat:
                    </label>
                    <textarea
                      rows={2}
                      value={warta.ayat_teks || ''}
                      onChange={(e) => updateWarta({ ayat_teks: e.target.value })}
                      placeholder="Isi ayat Alkitab dalam bahasa Batak..."
                      className="w-full px-3 py-1.5 border border-stone-300 rounded-lg text-xs bg-stone-50 focus:bg-white font-serif-body"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-stone-800 mb-1">
                      Referensi Ayat:
                    </label>
                    <input
                      type="text"
                      value={warta.ayat_ref || ''}
                      onChange={(e) => updateWarta({ ayat_ref: e.target.value })}
                      placeholder="Jesayas 40:31"
                      className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm bg-stone-50 focus:bg-white font-medium"
                    />
                  </div>
                </div>
              </div>

              {/* Torop ni Parminggu di Minggu Nasalpu */}
              <div className="pt-2 border-t border-stone-100">
                <label className="block text-xs font-bold text-stone-800 mb-2">
                  Torop ni Parminggu di Minggu Nasalpu (Kehadiran Jemaat Minggu Lalu):
                </label>
                <div className="grid grid-cols-3 gap-3 bg-stone-50 p-3 rounded-lg border border-stone-200">
                  <div>
                    <label className="block text-[11px] font-semibold text-stone-600 mb-1">
                      Sekolah Minggu:
                    </label>
                    <input
                      type="number"
                      value={warta.ruas_sm || 0}
                      onChange={(e) => updateWarta({ ruas_sm: parseInt(e.target.value) || 0 })}
                      className="w-full px-2 py-1.5 border border-stone-300 rounded text-center font-bold text-sm bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-stone-600 mb-1">
                      Ibadah Pagi (08.30):
                    </label>
                    <input
                      type="number"
                      value={warta.ruas_pagi || 0}
                      onChange={(e) => updateWarta({ ruas_pagi: parseInt(e.target.value) || 0 })}
                      className="w-full px-2 py-1.5 border border-stone-300 rounded text-center font-bold text-sm bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-stone-600 mb-1">
                      Ibadah Siang (10.30):
                    </label>
                    <input
                      type="number"
                      value={warta.ruas_siang || 0}
                      onChange={(e) => updateWarta({ ruas_siang: parseInt(e.target.value) || 0 })}
                      className="w-full px-2 py-1.5 border border-stone-300 rounded text-center font-bold text-sm bg-white"
                    />
                  </div>
                </div>
                <div className="text-right text-xs font-bold text-stone-800 mt-1">
                  Total Ruas: {(warta.ruas_sm || 0) + (warta.ruas_pagi || 0) + (warta.ruas_siang || 0)} Halak
                </div>
              </div>

              {/* Na Markoor Sadari On */}
              <div className="pt-2 border-t border-stone-100">
                <label className="block text-xs font-bold text-stone-800 mb-2">
                  Na Markoor Sadari On:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-stone-600 mb-1">
                      Koor Sesi 1 (Pagi 08.30):
                    </label>
                    <input
                      type="text"
                      value={warta.markoor_1 || ''}
                      onChange={(e) => updateWarta({ markoor_1: e.target.value })}
                      placeholder="Punguan Ina Ester, Punguan Ama Immanuel"
                      className="w-full px-3 py-1.5 border border-stone-300 rounded text-xs bg-stone-50 focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-stone-600 mb-1">
                      Koor Sesi 2 (Siang 10.30):
                    </label>
                    <input
                      type="text"
                      value={warta.markoor_2 || ''}
                      onChange={(e) => updateWarta({ markoor_2: e.target.value })}
                      placeholder="Punguan Ina Kamis, Remaja Naposo (RND)"
                      className="w-full px-3 py-1.5 border border-stone-300 rounded text-xs bg-stone-50 focus:bg-white"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: ACARA IBADAH */}
          {currentStep === 2 && (
            <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-4 md:p-6 space-y-5">
              <div className="border-b border-stone-200 pb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-stone-900">Langkah 2: Susunan Acara Ibadah</h3>
                  <p className="text-xs text-stone-500">
                    Atur urutan dan keterangan liturgi Acara Minggu dan Acara Partangiangan.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleResetAcaraMinggu}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs text-stone-600 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 rounded cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Reset Template
                  </button>
                  <span className="bg-blue-100 text-blue-900 text-xs font-bold px-2.5 py-0.5 rounded-full">
                    Langkah 2 / 6
                  </span>
                </div>
              </div>

              {/* Acara Minggu */}
              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wide">
                      Tabel Acara Minggu (Liturgi Gereja)
                    </h4>
                    <span className="text-[11px] text-stone-500">{acara_minggu.length} Baris Terdaftar</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handleAddAcaraMingguRow}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200 rounded-md font-semibold transition cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" /> Tambah Baris
                    </button>
                    <button
                      type="button"
                      onClick={() => openAddColumn('acara_minggu', 'Acara Minggu', ['Ayat / BN', 'Pelayan', 'Catatan'])}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs bg-blue-50 text-blue-900 hover:bg-blue-100 border border-blue-200 rounded-md font-semibold transition cursor-pointer"
                    >
                      <Columns className="w-3.5 h-3.5" /> Tambah Kolom
                    </button>
                  </div>
                </div>

                {(() => {
                  const cols = data.acara_minggu_columns && data.acara_minggu_columns.length > 0
                    ? data.acara_minggu_columns
                    : DEFAULT_ACARA_MINGGU_COLUMNS;
                  return (
                    <div className="border border-stone-300 rounded-lg overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead className="bg-stone-100 border-b border-stone-300 text-stone-800">
                          <tr>
                            <th className="w-8 py-1.5 px-2 text-center">No</th>
                            {cols.map((col) => (
                              <th key={col.key} className="py-1.5 px-2 text-left font-bold">
                                <div className="flex items-center justify-between gap-1">
                                  <span>{col.label}</span>
                                  {col.removable && (
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteColumn('acara_minggu', col.key)}
                                      title={`Hapus Kolom ${col.label}`}
                                      className="text-stone-400 hover:text-rose-600 p-0.5 rounded cursor-pointer"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  )}
                                </div>
                              </th>
                            ))}
                            <th className="w-10 py-1.5 px-2 text-center">Aksi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-200">
                          {acara_minggu.map((item, idx) => (
                            <tr key={item.id || idx} className="hover:bg-stone-50">
                              <td className="py-1 px-2 text-center text-stone-500 font-medium font-mono-num">
                                {idx + 1}.
                              </td>
                              {cols.map((col) => (
                                <td key={col.key} className="py-1 px-2">
                                  <input
                                    type="text"
                                    value={item[col.key] || ''}
                                    onChange={(e) => handleAcaraMingguCellChange(idx, col.key, e.target.value)}
                                    placeholder={col.key === 'keterangan' ? 'Jongjong / Pel' : `Isi ${col.label}...`}
                                    className="w-full px-2 py-1 border border-stone-200 rounded text-xs focus:bg-white"
                                  />
                                </td>
                              ))}
                              <td className="py-1 px-2 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleDeleteAcaraMingguRow(idx)}
                                  title="Hapus Baris ini"
                                  className="text-stone-400 hover:text-rose-600 p-1 rounded transition cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  );
                })()}
              </div>

              {/* Acara Partangiangan */}
              <div className="space-y-2 pt-3 border-t border-stone-200">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wide">
                      Tabel Acara Partangiangan Lingkungan
                    </h4>
                    <span className="text-[11px] text-stone-500">{acara_partangiangan.length} Baris Terdaftar</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handleAddAcaraPartangianganRow}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200 rounded-md font-semibold transition cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" /> Tambah Baris
                    </button>
                    <button
                      type="button"
                      onClick={() => openAddColumn('acara_partangiangan', 'Acara Partangiangan', ['Ayat / BN', 'Keterangan Khusus'])}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs bg-blue-50 text-blue-900 hover:bg-blue-100 border border-blue-200 rounded-md font-semibold transition cursor-pointer"
                    >
                      <Columns className="w-3.5 h-3.5" /> Tambah Kolom
                    </button>
                    <button
                      type="button"
                      onClick={handleResetAcaraPartangiangan}
                      className="inline-flex items-center gap-1 px-2 py-1 text-xs text-stone-600 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 rounded cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" /> Reset
                    </button>
                  </div>
                </div>

                {(() => {
                  const cols = data.acara_partangiangan_columns && data.acara_partangiangan_columns.length > 0
                    ? data.acara_partangiangan_columns
                    : DEFAULT_ACARA_PARTANGIANGAN_COLUMNS;
                  return (
                    <div className="border border-stone-300 rounded-lg overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead className="bg-stone-100 border-b border-stone-300 text-stone-800">
                          <tr>
                            <th className="w-8 py-1.5 px-2 text-center">No</th>
                            {cols.map((col) => (
                              <th key={col.key} className="py-1.5 px-2 text-left font-bold">
                                <div className="flex items-center justify-between gap-1">
                                  <span>{col.label}</span>
                                  {col.removable && (
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteColumn('acara_partangiangan', col.key)}
                                      title={`Hapus Kolom ${col.label}`}
                                      className="text-stone-400 hover:text-rose-600 p-0.5 rounded cursor-pointer"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  )}
                                </div>
                              </th>
                            ))}
                            <th className="w-10 py-1.5 px-2 text-center">Aksi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-200">
                          {acara_partangiangan.map((item, idx) => (
                            <tr key={item.id || idx} className="hover:bg-stone-50">
                              <td className="py-1 px-2 text-center text-stone-500 font-medium font-mono-num">
                                {idx + 1}.
                              </td>
                              {cols.map((col) => (
                                <td key={col.key} className="py-1 px-2">
                                  <input
                                    type="text"
                                    value={item[col.key] || ''}
                                    onChange={(e) => handleAcaraPartangianganCellChange(idx, col.key, e.target.value)}
                                    placeholder={col.key === 'keterangan' ? 'Keterangan' : `Isi ${col.label}...`}
                                    className="w-full px-2 py-1 border border-stone-200 rounded text-xs focus:bg-white"
                                  />
                                </td>
                              ))}
                              <td className="py-1 px-2 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleDeleteAcaraPartangianganRow(idx)}
                                  title="Hapus Baris ini"
                                  className="text-stone-400 hover:text-rose-600 p-1 rounded transition cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {/* STEP 3: PARHOBAS & RUAS */}
          {currentStep === 3 && (
            <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-4 md:p-6 space-y-5">
              <div className="border-b border-stone-200 pb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-stone-900">Langkah 3: Parhobas & Sopo Godang</h3>
                  <p className="text-xs text-stone-500">
                    Tugaskan pelayan ibadah (Jamita, Agenda, Tingting, Pelean, Organis, Harentaon).
                  </p>
                </div>
                <span className="bg-blue-100 text-blue-900 text-xs font-bold px-2.5 py-0.5 rounded-full">
                  Langkah 3 / 6
                </span>
              </div>

              {/* Parhobas Table */}
              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h4 className="text-xs font-bold text-stone-900 uppercase flex items-center gap-2">
                      <span>Parhobas Minggu (Petugas Ibadah)</span>
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold normal-case bg-blue-50 text-blue-800 border border-blue-200 px-2 py-0.5 rounded-full">
                        <UserCheck className="w-3 h-3" /> {masterPetugas.length} Sintua &amp; Pengurus siap pilih
                      </span>
                    </h4>
                    <span className="text-[11px] text-stone-500">
                      {parhobas.length} Baris · Klik ikon panah di tiap kolom untuk memilih dari database (mendukung multi-petugas)
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handleAddParhobasRow}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200 rounded-md font-semibold transition cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" /> Tambah Petugas (Baris)
                    </button>
                    <button
                      type="button"
                      onClick={() => openAddColumn('parhobas', 'Parhobas Minggu', ['Sesi 3 (17.00)', 'Ibadah Sore', 'Parmingguon Bodari', 'Catatan'])}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs bg-blue-50 text-blue-900 hover:bg-blue-100 border border-blue-200 rounded-md font-semibold transition cursor-pointer"
                    >
                      <Columns className="w-3.5 h-3.5" /> Tambah Sesi (Kolom)
                    </button>
                  </div>
                </div>

                <datalist id="parhobas-peran-suggestions">
                  <option value="Jamita" />
                  <option value="Agenda" />
                  <option value="Tingting" />
                  <option value="Pelean" />
                  <option value="Organis" />
                  <option value="Harentaon" />
                  <option value="Pemusik" />
                  <option value="Song Leader" />
                </datalist>

                {(() => {
                  const cols = data.parhobas_columns && data.parhobas_columns.length > 0
                    ? data.parhobas_columns
                    : DEFAULT_PARHOBAS_COLUMNS;
                  return (
                    <div className="border border-stone-300 rounded-lg overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead className="bg-stone-800 text-white font-bold">
                          <tr>
                            {cols.map((col) => (
                              <th key={col.key} className="py-1.5 px-2 text-left">
                                <div className="flex items-center justify-between gap-1">
                                  <span>{col.label}</span>
                                  {col.removable && (
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteColumn('parhobas', col.key)}
                                      title={`Hapus Sesi/Kolom ${col.label}`}
                                      className="text-stone-300 hover:text-rose-400 p-0.5 rounded cursor-pointer"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  )}
                                </div>
                              </th>
                            ))}
                            <th className="w-10 py-1.5 px-2 text-center">Aksi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-200">
                          {parhobas.map((p, idx) => (
                            <tr key={p.id || idx} className="hover:bg-stone-50">
                              {cols.map((col) => (
                                <td key={col.key} className="py-1 px-2">
                                  {col.key === 'peran' ? (
                                    <input
                                      type="text"
                                      list="parhobas-peran-suggestions"
                                      value={p[col.key] || ''}
                                      onChange={(e) => handleParhobasCellChange(idx, col.key, e.target.value)}
                                      placeholder="Nama Ulaon (e.g. Jamita)"
                                      className="w-full px-2 py-1 border border-stone-200 rounded text-xs focus:bg-white font-bold text-stone-900 bg-stone-100"
                                    />
                                  ) : (
                                    <PetugasSelectCell
                                      value={p[col.key] || ''}
                                      onChange={(val) => handleParhobasCellChange(idx, col.key, val)}
                                      petugasList={masterPetugas}
                                      peranRow={p.peran}
                                      placeholder="Pilih Sintua / Pengurus..."
                                    />
                                  )}
                                </td>
                              ))}
                              <td className="py-1 px-2 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleDeleteParhobasRow(idx)}
                                  title="Hapus Petugas ini"
                                  className="text-stone-400 hover:text-rose-600 p-1 rounded transition cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  );
                })()}
              </div>

              {/* Notice Sopo Godang moved to Step 5 */}
              <div className="pt-3 border-t border-stone-200">
                <div className="bg-blue-50/70 border border-blue-200 rounded-lg p-3 flex items-start gap-2.5 text-xs text-blue-900">
                  <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Daftar Pemakai Sopo Godang:</span> Telah dipindahkan ke{' '}
                    <span className="font-bold underline">Langkah 5: Keuangan</span> (tepat di bagian akhir setelah Rekapitulasi Kas & Saldo Akhir) sesuai format warta jemaat terkini.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: TINGTING NAMARRAGAM */}
          {currentStep === 4 && (
            <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-4 md:p-6 space-y-5">
              <div className="border-b border-stone-200 pb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-stone-900">Langkah 4: Tingting Namarragam</h3>
                  <p className="text-xs text-stone-500">
                    Ulang tahun ruas (otomatis dari database), jadwal koor minggu depan, partangiangan lingkungan, dan warta dinamis.
                  </p>
                </div>
                <span className="bg-blue-100 text-blue-900 text-xs font-bold px-2.5 py-0.5 rounded-full">
                  Langkah 4 / 6
                </span>
              </div>

              {/* Ulang Tahun Ruas (Otomatis ditarik dari Database) */}
              <div className="space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="text-xs font-bold text-stone-900 uppercase">
                      Ruas na Marulang Tahun di Minggu on
                    </h4>
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5 rounded-full">
                      {ulang_tahun.length} Halak
                    </span>
                    <span className="inline-flex items-center gap-1 text-[10px] bg-blue-50 text-blue-800 border border-blue-200 font-semibold px-2 py-0.5 rounded-full">
                      <Database className="w-3 h-3" /> Ditarik Otomatis dari Database
                    </span>
                  </div>
                  <button
                    type="button"
                    disabled={isSyncingUltah}
                    onClick={handleSyncUlangTahun}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 rounded border border-blue-200 cursor-pointer font-medium disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 text-blue-600 ${isSyncingUltah ? 'animate-spin' : ''}`} />
                    <span>{isSyncingUltah ? 'Menarik Data...' : 'Tarik Ulang dari Database'}</span>
                  </button>
                </div>
                {(() => {
                  const range = getSeninMingguRange(warta.tanggal_minggu);
                  return (
                    <p className="text-[11px] text-stone-500">
                      Periode ulang tahun otomatis: <strong className="text-stone-700">{range.labelPeriode}</strong> (disaring langsung dari database anggota aktif &amp; dicetak 2 kolom berdampingan).
                    </p>
                  );
                })()}

                {ulang_tahun && ulang_tahun.length > 0 ? (
                  <div className="overflow-x-auto border border-stone-200 rounded-lg max-h-56 overflow-y-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-stone-100 text-stone-700 border-b border-stone-200 sticky top-0">
                        <tr>
                          <th className="py-1.5 px-2 text-center w-9">No</th>
                          <th className="py-1.5 px-2 text-left">Nama Jemaat</th>
                          <th className="py-1.5 px-2 text-center w-10">L/P</th>
                          <th className="py-1.5 px-2 text-center w-16">Tgl/Bln</th>
                          <th className="py-1.5 px-2 text-center w-16">Usia</th>
                          <th className="py-1.5 px-2 text-left">Lingkungan / Wijk</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100">
                        {ulang_tahun.map((u, idx) => (
                          <tr key={idx} className="hover:bg-stone-50">
                            <td className="py-1 px-2 text-center text-stone-500">{idx + 1}.</td>
                            <td className="py-1 px-2 font-semibold text-stone-900">{u.nama}</td>
                            <td className="py-1 px-2 text-center text-stone-600">{u.jenis_kelamin}</td>
                            <td className="py-1 px-2 text-center font-mono-num">{u.hari_bulan}</td>
                            <td className="py-1 px-2 text-center font-bold text-stone-800">{u.usia} Thn</td>
                            <td className="py-1 px-2 text-stone-600">{u.wijk}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-3 text-center text-[11px] text-stone-500 bg-stone-50 rounded-lg border border-dashed border-stone-200">
                    Tidak ada anggota jemaat yang berulang tahun pada periode minggu ini. Data akan otomatis muncul bila tanggal lahir anggota tersedia di Master Data Anggota.
                  </div>
                )}

                {/* Teks Ucapan / Ayat Ulang Tahun (Dinamis per Warta) */}
                <div className="bg-pink-50/50 border border-pink-200 rounded-lg p-3 space-y-1.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <label className="block text-[11px] font-bold text-stone-800">
                      Teks Ucapan / Ayat Ulang Tahun (Halaman 2 — Dinamis per Minggu):
                    </label>
                    {pengaturan?.teks_ucapan_ulang_tahun && (
                      <button
                        type="button"
                        onClick={() =>
                          updateWarta({
                            teks_ucapan_ulang_tahun: pengaturan.teks_ucapan_ulang_tahun
                          })
                        }
                        className="text-[10px] font-semibold text-pink-700 hover:text-pink-900 bg-white border border-pink-200 px-2 py-0.5 rounded cursor-pointer"
                      >
                        Isi dari Default Huria
                      </button>
                    )}
                  </div>
                  <textarea
                    rows={2}
                    value={
                      warta.teks_ucapan_ulang_tahun !== undefined
                        ? warta.teks_ucapan_ulang_tahun
                        : (pengaturan?.teks_ucapan_ulang_tahun || '')
                    }
                    onChange={(e) => updateWarta({ teks_ucapan_ulang_tahun: e.target.value })}
                    placeholder="Masukkan ucapan atau ayat ulang tahun untuk minggu ini..."
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-pink-200 rounded focus:outline-none focus:ring-2 focus:ring-pink-400"
                  />
                  <p className="text-[10px] text-stone-500">
                    Teks ini langsung dicetak di bawah daftar jemaat ulang tahun pada Halaman 2 dan dapat diubah setiap minggu sesuai kebutuhan.
                  </p>
                </div>
              </div>

              {/* Jadwal Koor Minggu Depan */}
              <div className="space-y-2 pt-2 border-t border-stone-100">
                <h4 className="text-xs font-bold text-stone-900 uppercase">
                  Jadwal na Markoor di Minggu na naeng ro:
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-stone-600 mb-1">
                      Tanggal Minggu Depan:
                    </label>
                    <input
                      type="date"
                      value={warta.jadwal_koor_tanggal || ''}
                      onChange={(e) => updateWarta({ jadwal_koor_tanggal: e.target.value })}
                      className="w-full px-2 py-1.5 border border-stone-300 rounded text-xs bg-stone-50"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-stone-600 mb-1">
                      Sesi I (Pagi 08.30 WIB):
                    </label>
                    <input
                      type="text"
                      value={warta.koor_pagi || ''}
                      onChange={(e) => updateWarta({ koor_pagi: e.target.value })}
                      placeholder="Punguan Ina Sion, Ama Estomihi"
                      className="w-full px-2 py-1.5 border border-stone-300 rounded text-xs bg-stone-50"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-stone-600 mb-1">
                      Sesi II (Siang 10.30 WIB):
                    </label>
                    <input
                      type="text"
                      value={warta.koor_siang || ''}
                      onChange={(e) => updateWarta({ koor_siang: e.target.value })}
                      placeholder="Punguan Lansia, Koor Gabungan"
                      className="w-full px-2 py-1.5 border border-stone-300 rounded text-xs bg-stone-50"
                    />
                  </div>
                </div>
              </div>

              {/* Jadwal Partangiangan Lingkungan */}
              {(() => {
                const showPartangiangan = warta.tampilkan_partangiangan !== false;
                const partangianganCols =
                  data.jadwal_partangiangan_columns && data.jadwal_partangiangan_columns.length > 0
                    ? data.jadwal_partangiangan_columns
                    : DEFAULT_PARTANGIANGAN_COLUMNS;

                return (
                  <div className="space-y-2 pt-2 border-t border-stone-100">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold text-stone-900 uppercase">
                            Jadwal Partangiangan Lingkungan di Minggu on
                          </h4>
                          {!showPartangiangan && (
                            <span className="px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide bg-amber-100 text-amber-800 border border-amber-300 rounded">
                              Disembunyikan dari Warta
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-stone-500">
                          Kelola jadwal partangiangan lingkungan. Anda dapat menambah/menghapus baris dan kolom sesuai kebutuhan.
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <button
                          type="button"
                          onClick={handleAddPartangianganRow}
                          disabled={!showPartangiangan}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded cursor-pointer transition shadow-2xs disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Plus className="w-3.5 h-3.5" /> Tambah Baris
                        </button>
                        <button
                          type="button"
                          onClick={() => openAddColumn('jadwal_partangiangan', 'Jadwal Partangiangan')}
                          disabled={!showPartangiangan}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded cursor-pointer transition shadow-2xs disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Columns className="w-3.5 h-3.5" /> Tambah Kolom
                        </button>
                        <div
                          className="inline-flex items-center rounded border border-stone-300 bg-stone-100 p-0.5 shadow-2xs"
                          role="group"
                          aria-label="Tampilkan atau sembunyikan Jadwal Partangiangan Lingkungan di warta"
                        >
                          <button
                            type="button"
                            onClick={() => updateWarta({ tampilkan_partangiangan: true })}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded transition cursor-pointer ${
                              showPartangiangan
                                ? 'bg-emerald-600 text-white shadow-2xs'
                                : 'text-stone-600 hover:text-stone-900'
                            }`}
                          >
                            <Eye className="w-3.5 h-3.5" /> Tampilkan
                          </button>
                          <button
                            type="button"
                            onClick={() => updateWarta({ tampilkan_partangiangan: false })}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded transition cursor-pointer ${
                              !showPartangiangan
                                ? 'bg-amber-600 text-white shadow-2xs'
                                : 'text-stone-600 hover:text-stone-900'
                            }`}
                          >
                            <EyeOff className="w-3.5 h-3.5" /> Tidak Tampilkan
                          </button>
                        </div>
                      </div>
                    </div>

                    {!showPartangiangan && (
                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-start gap-2">
                          <EyeOff className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                          <span>
                            Bagian <strong>Jadwal Partangiangan Lingkungan</strong> sedang <strong>tidak ditampilkan</strong> pada halaman cetak warta maupun portal jemaat (misalnya saat kegiatan partangiangan sedang libur). Data tabel di bawah tetap tersimpan aman apabila sewaktu-waktu diaktifkan kembali.
                          </span>
                        </div>
                      </div>
                    )}

                    <div className={`border border-stone-300 rounded-lg overflow-x-auto transition-opacity ${!showPartangiangan ? 'opacity-55' : ''}`}>
                      <table className="w-full text-xs">
                        <thead className="bg-stone-100 text-stone-800 font-bold border-b border-stone-300">
                          <tr>
                            <th className="w-8 py-1.5 px-1.5 text-center">No</th>
                            {partangianganCols.map((col) => (
                              <th key={col.key} className="py-1.5 px-2 text-left">
                                <div className="flex items-center justify-between gap-1">
                                  <span>{col.label}</span>
                                  {col.removable && (
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteColumn('jadwal_partangiangan', col.key)}
                                      className="text-stone-400 hover:text-rose-600 p-0.5 rounded cursor-pointer transition"
                                      title={`Hapus kolom ${col.label}`}
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  )}
                                </div>
                              </th>
                            ))}
                            <th className="w-10 py-1.5 px-2 text-center">Aksi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-200">
                          {jadwal_partangiangan.map((jp, idx) => (
                            <tr key={jp.id || idx} className="hover:bg-stone-50/50">
                              <td className="py-1 px-1.5 text-center text-stone-500 font-medium">
                                {idx + 1}.
                              </td>
                              {partangianganCols.map((col) => {
                                const val = (jp as Record<string, any>)[col.key] ?? '';
                                return (
                                  <td key={col.key} className="py-1 px-2">
                                    <input
                                      type="text"
                                      value={val}
                                      onChange={(e) =>
                                        handleJadwalPartangianganCellChange(idx, col.key, e.target.value)
                                      }
                                      placeholder={`Isi ${col.label}...`}
                                      className="w-full px-2 py-1 border border-stone-200 rounded text-xs bg-stone-50 focus:bg-white"
                                    />
                                  </td>
                                );
                              })}
                              <td className="py-1 px-2 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleDeletePartangianganRow(idx)}
                                  className="text-stone-400 hover:text-rose-600 p-1 rounded cursor-pointer transition"
                                  title="Hapus baris ini"
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
                );
              })()}

              {/* Pengumuman Dinamis */}
              <div className="space-y-3 pt-2 border-t border-stone-100">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-stone-900 uppercase">
                    Daftar Pengumuman Warta Jemaat (Mulai No. {warta.tampilkan_partangiangan !== false ? 5 : 4})
                  </h4>
                  <button
                    onClick={handleAddPengumuman}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs text-blue-700 bg-blue-50 hover:bg-blue-100 rounded border border-blue-200 cursor-pointer font-medium"
                  >
                    <Plus className="w-3.5 h-3.5" /> Tambah Pengumuman
                  </button>
                </div>

                <div className="space-y-3">
                  {pengumuman.map((peng, idx) => (
                    <div key={peng.id || idx} className="p-3 border border-stone-200 rounded-lg bg-stone-50/50 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-stone-800">
                          {idx + (warta.tampilkan_partangiangan !== false ? 5 : 4)}. Judul Pengumuman:
                        </span>
                        <button
                          onClick={() => handleDeletePengumuman(idx)}
                          className="text-rose-600 hover:text-rose-800 text-xs flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Hapus
                        </button>
                      </div>
                      <input
                        type="text"
                        value={peng.judul}
                        onChange={(e) => handlePengumumanChange(idx, 'judul', e.target.value)}
                        placeholder="Contoh: Tingting Nasorang (Kelahiran)"
                        className="w-full px-2.5 py-1.5 border border-stone-300 rounded text-xs bg-white font-medium"
                      />
                      <textarea
                        rows={2}
                        value={peng.isi}
                        onChange={(e) => handlePengumumanChange(idx, 'isi', e.target.value)}
                        placeholder="Uraian isi warta jemaat..."
                        className="w-full px-2.5 py-1.5 border border-stone-300 rounded text-xs bg-white"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 5: KEUANGAN (TINGTING PARHEPENGON) */}
          {currentStep === 5 && (
            <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-4 md:p-6 space-y-5">
              <div className="border-b border-stone-200 pb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-stone-900">Langkah 5: Tingting Parhepengon (Keuangan)</h3>
                  <p className="text-xs text-stone-500">
                    Input pos penerimaan standar HKBP Hutaraja (Kebaktian Umum, Persembahan Lainnya & Transitori), rincian B & C, serta pengeluaran.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {rekapitulasi.is_balanced ? (
                    <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Balance
                    </span>
                  ) : (
                    <span className="bg-rose-100 text-rose-800 text-xs font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" /> Selisih Rp {formatRupiah(rekapitulasi.selisih)}
                    </span>
                  )}
                  <span className="bg-blue-100 text-blue-900 text-xs font-bold px-2.5 py-0.5 rounded-full">
                    Langkah 5 / 6
                  </span>
                </div>
              </div>

              {/* Saldo Awal 4 Pos Dana */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-stone-900 uppercase">
                    Saldo Awal Kas Gereja (Diteruskan dari Warta Sebelumnya)
                  </h4>
                  <span className="text-[11px] text-stone-500">Input nominal angka</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 bg-stone-50 p-2.5 rounded-lg border border-stone-200 text-xs">
                  <div>
                    <label className="block text-[11px] font-semibold text-stone-600 mb-1">
                      Kas Huria:
                    </label>
                    <input
                      type="text"
                      value={formatRupiah(warta.saldo_awal_huria)}
                      onChange={(e) => updateWarta({ saldo_awal_huria: parseRupiahInput(e.target.value) })}
                      className="w-full px-2 py-1 border border-stone-300 rounded font-mono-num text-right font-semibold bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-stone-600 mb-1">
                      Sosial Huria:
                    </label>
                    <input
                      type="text"
                      value={formatRupiah(warta.saldo_awal_sosial)}
                      onChange={(e) => updateWarta({ saldo_awal_sosial: parseRupiahInput(e.target.value) })}
                      className="w-full px-2 py-1 border border-stone-300 rounded font-mono-num text-right font-semibold bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-stone-600 mb-1">
                      Pembangunan:
                    </label>
                    <input
                      type="text"
                      value={formatRupiah(warta.saldo_awal_pembangunan)}
                      onChange={(e) => updateWarta({ saldo_awal_pembangunan: parseRupiahInput(e.target.value) })}
                      className="w-full px-2 py-1 border border-stone-300 rounded font-mono-num text-right font-semibold bg-white"
                    />
                  </div>
                  <div className="bg-amber-50/70 p-1 rounded border border-amber-200">
                    <label className="block text-[11px] font-semibold text-amber-900 mb-1">
                      Sentralisasi (55%):
                    </label>
                    <input
                      type="text"
                      value={formatRupiah(warta.saldo_awal_sentralisasi)}
                      onChange={(e) => updateWarta({ saldo_awal_sentralisasi: parseRupiahInput(e.target.value) })}
                      className="w-full px-2 py-1 border border-amber-300 rounded font-mono-num text-right font-semibold bg-white text-amber-900"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-stone-600 mb-1">
                      Transitori:
                    </label>
                    <input
                      type="text"
                      value={formatRupiah(warta.saldo_awal_transitori)}
                      onChange={(e) => updateWarta({ saldo_awal_transitori: parseRupiahInput(e.target.value) })}
                      className="w-full px-2 py-1 border border-stone-300 rounded font-mono-num text-right font-semibold bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Step 5 Description update */}
              {/* Pos Penerimaan Standar HKBP Hutaraja */}
              <div className="space-y-3 pt-2 border-t border-stone-100">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h4 className="text-xs font-bold text-stone-900 uppercase flex items-center gap-1.5">
                      <span>A. Penerimaan Kas (Standar HKBP Hutaraja)</span>
                      <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-900 text-[9px] font-bold">
                        {penerimaan.length} Pos
                      </span>
                    </h4>
                    <p className="text-[11px] text-stone-500">
                      Pilih <strong>Sentralisasi? Ya / Tidak</strong> untuk mengatur setoran 55% pada tiap uraian.
                    </p>
                  </div>
                  <span className="text-xs text-emerald-900 font-bold font-mono-num">
                    Total: Rp {formatRupiah(rekapitulasi.total_masuk)}
                  </span>
                </div>

                {/* Filter & Dynamic Action Bar */}
                <div className="flex flex-wrap items-center justify-between gap-2 bg-stone-50 p-2 rounded-lg border border-stone-200">
                  <div className="flex flex-wrap gap-1">
                    {(['all', '1.1', '1.2', '1.3'] as const).map((tabKey) => {
                      const label =
                        tabKey === 'all'
                          ? 'Semua'
                          : tabKey === '1.1'
                          ? '1.1 Kebaktian'
                          : tabKey === '1.2'
                          ? '1.2 Lainnya'
                          : '1.3 Transitori';
                      return (
                        <button
                          key={tabKey}
                          type="button"
                          onClick={() => setPenerimaanTab(tabKey)}
                          className={`px-2 py-1 text-[11px] rounded font-medium transition ${
                            penerimaanTab === tabKey
                              ? 'bg-blue-900 text-white font-bold shadow-xs'
                              : 'bg-white text-stone-700 hover:bg-stone-100 border border-stone-200'
                          }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    <div className="relative">
                      <Search className="w-3 h-3 text-stone-400 absolute left-2 top-2" />
                      <input
                        type="text"
                        placeholder="Cari uraian..."
                        value={penerimaanSearch}
                        onChange={(e) => setPenerimaanSearch(e.target.value)}
                        className="pl-6 pr-2 py-1 text-[11px] border border-stone-300 rounded bg-white w-32 sm:w-40"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowOnlyNonZero(!showOnlyNonZero)}
                      className={`px-2 py-1 text-[11px] rounded border flex items-center gap-1 transition cursor-pointer ${
                        showOnlyNonZero
                          ? 'bg-emerald-100 text-emerald-900 border-emerald-300 font-bold'
                          : 'bg-white text-stone-700 hover:bg-stone-100 border-stone-300'
                      }`}
                    >
                      <Eye className="w-3 h-3" />
                      <span>{showOnlyNonZero ? 'Semua' : '> Rp 0'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowPenerimaanNoteCol(!showPenerimaanNoteCol)}
                      className={`px-2 py-1 text-[11px] rounded border flex items-center gap-1 transition cursor-pointer ${
                        showPenerimaanNoteCol
                          ? 'bg-amber-100 text-amber-900 border-amber-300 font-bold'
                          : 'bg-white text-stone-700 hover:bg-stone-100 border-stone-300'
                      }`}
                    >
                      <Columns className="w-3 h-3" />
                      <span>{showPenerimaanNoteCol ? '- Kolom' : '+ Kolom'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsAddPenModalOpen(true)}
                      className="px-2 py-1 text-[11px] bg-blue-700 text-white hover:bg-blue-800 rounded font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Layers className="w-3 h-3" />
                      <span>+ Jenis Baru</span>
                    </button>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setShowPenerimaanAddMenu(!showPenerimaanAddMenu)}
                        className="px-2 py-1 text-[11px] bg-emerald-800 text-white hover:bg-emerald-900 rounded font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                        <span>+ Baris</span>
                        <ChevronDown className="w-3 h-3" />
                      </button>
                      {showPenerimaanAddMenu && (
                        <div className="absolute right-0 mt-1 w-52 bg-white rounded-lg shadow-lg border border-stone-200 py-1 z-20 text-[11px]">
                          <button
                            type="button"
                            onClick={() => handleAddPenerimaanRow('1.1')}
                            className="w-full text-left px-3 py-1.5 hover:bg-stone-100 text-stone-800 cursor-pointer"
                          >
                            + Baris 1.1 Kebaktian Umum
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAddPenerimaanRow('1.2')}
                            className="w-full text-left px-3 py-1.5 hover:bg-stone-100 text-stone-800 cursor-pointer"
                          >
                            + Baris 1.2 Persembahan Lainnya
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAddPenerimaanRow('1.3')}
                            className="w-full text-left px-3 py-1.5 hover:bg-stone-100 text-stone-800 cursor-pointer"
                          >
                            + Baris 1.3 Transitori
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="text-[11px] text-emerald-900 bg-emerald-50/70 border border-emerald-200 rounded px-3 py-1.5 flex items-center justify-between gap-2">
                  <span>
                    Info Cetak: Pos penerimaan bernilai <strong>Rp 0</strong> otomatis disembunyikan saat mencetak warta.
                  </span>
                  <span className="font-mono-num font-bold shrink-0">
                    {penerimaan.filter((r) => (r.jumlah || 0) > 0).length} / {penerimaan.length} terisi
                  </span>
                </div>

                <div className="border border-stone-300 rounded-lg overflow-x-auto max-h-[480px] overflow-y-auto">
                  <table className="w-full text-[11px]">
                    <thead className="bg-stone-100 sticky top-0 z-10 border-b border-stone-300 font-bold text-stone-800">
                      <tr>
                        <th className="w-11 py-1 px-1 text-center">No</th>
                        <th className="py-1 px-2 text-left min-w-[160px]">Uraian Penerimaan</th>
                        <th className="w-28 py-1 px-1 text-center">Sentralisasi?</th>
                        <th className="w-28 py-1 px-1.5 text-right">Jumlah (Rp)</th>
                        <th className="w-20 py-1 px-1.5 text-right">Huria</th>
                        <th className="w-20 py-1 px-1.5 text-right">Sosial</th>
                        <th className="w-20 py-1 px-1.5 text-right">Pemb</th>
                        <th className="w-22 py-1 px-1.5 text-right">Sentral 55%</th>
                        <th className="w-20 py-1 px-1.5 text-right">Transitoris</th>
                        {showPenerimaanNoteCol && (
                          <th className="w-28 py-1 px-1.5 text-left">Catatan</th>
                        )}
                        <th className="w-16 py-1 px-1 text-center">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-200">
                      {(() => {
                        const filtered = penerimaan
                          .map((r, originalIndex) => ({ r, originalIndex }))
                          .filter(({ r, originalIndex }) => {
                            if (penerimaanTab === '1.1') {
                              if (!(r.kelompok === '1.1' || r.no_tampilan?.startsWith('1.1') || (!r.kelompok && originalIndex < 10))) return false;
                            } else if (penerimaanTab === '1.2') {
                              if (!(r.kelompok === '1.2' || r.no_tampilan?.startsWith('1.2') || (!r.kelompok && originalIndex >= 10 && originalIndex < 27))) return false;
                            } else if (penerimaanTab === '1.3') {
                              if (!(r.kelompok === '1.3' || r.no_tampilan?.startsWith('1.3') || (!r.kelompok && originalIndex >= 27))) return false;
                            }
                            if (showOnlyNonZero && (r.jumlah || 0) <= 0) {
                              return false;
                            }
                            if (penerimaanSearch.trim()) {
                              const q = penerimaanSearch.toLowerCase();
                              if (!(r.uraian || '').toLowerCase().includes(q) && !(r.no_tampilan || '').toLowerCase().includes(q)) {
                                return false;
                              }
                            }
                            return true;
                          });

                        if (filtered.length === 0) {
                          return (
                            <tr>
                              <td colSpan={showPenerimaanNoteCol ? 11 : 10} className="py-6 text-center text-stone-400 italic">
                                Tidak ada pos penerimaan yang sesuai.
                              </td>
                            </tr>
                          );
                        }

                        let lastGroup = '';

                        return filtered.map(({ r, originalIndex }) => {
                          const isAutoSource =
                            r.kode === 'PEL_TAON' ||
                            r.kode === 'HAM_LAIN' ||
                            r.kode === SUMBANGAN_NATAL_KODE ||
                            r.no_tampilan === '1.2.15' ||
                            r.no_tampilan === '1.2.17';
                          const isSentral =
                            r.is_sentralisasi !== false &&
                            (r.is_sentralisasi === true || r.aturan_alokasi === 'split_45_55');

                          const groupKey = r.kelompok || (r.no_tampilan ? r.no_tampilan.substring(0, 3) : originalIndex < 10 ? '1.1' : originalIndex < 27 ? '1.2' : '1.3');
                          const showHeader = penerimaanTab === 'all' && !penerimaanSearch.trim() && groupKey !== lastGroup;
                          if (showHeader) lastGroup = groupKey;

                          const headerTitle =
                            groupKey === '1.1'
                              ? '1.1 PERSEMBAHAN KEBAKTIAN UMUM'
                              : groupKey === '1.2'
                              ? '1.2 PERSEMBAHAN LAINNYA'
                              : '1.3 PENERIMAAN TRANSITORI';

                          return (
                            <React.Fragment key={r.id || originalIndex}>
                              {showHeader && (
                                <tr className="bg-stone-200/80 font-bold text-stone-900 border-y border-stone-300">
                                  <td colSpan={showPenerimaanNoteCol ? 11 : 10} className="py-1 px-2 text-[10px] uppercase tracking-wider">
                                    {headerTitle}
                                  </td>
                                </tr>
                              )}
                              <tr className="hover:bg-stone-50">
                                <td className="py-1 px-1 text-center text-stone-500 font-medium whitespace-nowrap">
                                  {r.no_tampilan || `${originalIndex + 1}.`}
                                </td>
                                <td className="py-1 px-2 font-medium text-stone-900">
                                  <input
                                    type="text"
                                    value={r.uraian}
                                    onChange={(e) => handlePenerimaanUraianChange(originalIndex, e.target.value)}
                                    className="w-full px-1.5 py-0.5 border border-stone-200 rounded text-xs bg-white text-stone-900 focus:bg-stone-50"
                                  />
                                  {r.dialihkan_ke_pembangunan && (
                                    <span className="text-[10px] text-blue-700 font-semibold ml-0.5">(Ke Pembangunan)</span>
                                  )}
                                  {isAutoSource && (
                                    <span className="text-[9.5px] text-blue-700 bg-blue-50 px-1 py-0.2 rounded ml-1 font-semibold">
                                      Auto{' '}
                                      {r.kode === 'PEL_TAON' || r.no_tampilan === '1.2.15'
                                        ? 'Rincian B'
                                        : r.kode === SUMBANGAN_NATAL_KODE
                                        ? 'Sumb. Natal'
                                        : 'Rincian C'}
                                    </span>
                                  )}
                                </td>
                                <td className="py-1 px-1 text-center">
                                  {r.kode === 'HAM_LAIN' || r.no_tampilan === '1.2.17' ? (
                                    <span
                                      className="inline-block text-[10px] px-1.5 py-0.5 rounded border font-bold bg-amber-100 text-amber-900 border-amber-300"
                                      title="Pos Ke Kas Huria di Rincian C otomatis dikenakan 55% Sentralisasi / 45% Kas Huria"
                                    >
                                      Ya (55% Kas Huria)
                                    </span>
                                  ) : r.kode === SUMBANGAN_NATAL_KODE ? (
                                    <span
                                      className="inline-block text-[10px] px-1.5 py-0.5 rounded border font-bold bg-rose-50 text-rose-800 border-rose-200"
                                      title="100% masuk ke Kas Sosial Huria"
                                    >
                                      Tidak (100% Sosial)
                                    </span>
                                  ) : (
                                    <select
                                      value={isSentral ? 'ya' : 'tidak'}
                                      onChange={(e) => handlePenerimaanSentralisasiChange(originalIndex, e.target.value === 'ya')}
                                      className={`text-[10px] px-1.5 py-0.5 rounded border font-bold cursor-pointer transition ${
                                        isSentral
                                          ? 'bg-amber-100 text-amber-900 border-amber-300'
                                          : 'bg-stone-100 text-stone-600 border-stone-300'
                                      }`}
                                    >
                                      <option value="ya">Ya (55%)</option>
                                      <option value="tidak">Tidak (0%)</option>
                                    </select>
                                  )}
                                </td>
                                <td className="py-1 px-1.5 text-right">
                                  <input
                                    type="text"
                                    disabled={isAutoSource}
                                    value={formatRupiah(r.jumlah)}
                                    onChange={(e) => handlePenerimaanAmountChange(originalIndex, e.target.value)}
                                    className={`w-full px-1.5 py-0.5 border border-stone-200 rounded text-right font-mono-num font-semibold text-xs ${
                                      isAutoSource ? 'bg-stone-100 text-stone-500 cursor-not-allowed' : 'bg-white'
                                    }`}
                                  />
                                </td>
                                <td className="py-1 px-1.5 text-right font-mono-num text-stone-700">
                                  {r.huria_45 > 0 ? formatRupiah(r.huria_45) : '-'}
                                </td>
                                <td className="py-1 px-1.5 text-right font-mono-num text-stone-700">
                                  {r.sosial > 0 ? formatRupiah(r.sosial) : '-'}
                                </td>
                                <td className="py-1 px-1.5 text-right font-mono-num text-stone-700">
                                  {r.pembangunan > 0 ? formatRupiah(r.pembangunan) : '-'}
                                </td>
                                <td className="py-1 px-1.5 text-right font-mono-num text-stone-700 font-medium">
                                  {r.sentral_55 > 0 ? formatRupiah(r.sentral_55) : '-'}
                                </td>
                                <td className="py-1 px-1.5 text-right font-mono-num text-rose-800 font-medium">
                                  {r.transitori > 0 ? formatRupiah(r.transitori) : '-'}
                                </td>
                                {showPenerimaanNoteCol && (
                                  <td className="py-1 px-1.5">
                                    <input
                                      type="text"
                                      placeholder="Catatan..."
                                      value={r.catatan || ''}
                                      onChange={(e) => handlePenerimaanCatatanChange(originalIndex, e.target.value)}
                                      className="w-full px-1.5 py-0.5 border border-stone-200 rounded text-xs"
                                    />
                                  </td>
                                )}
                                <td className="py-1 px-1 text-center">
                                  <div className="flex items-center justify-center gap-0.5">
                                    {r.aturan_alokasi !== 'manual' && (
                                      <select
                                        value={r.aturan_alokasi}
                                        onChange={(e) =>
                                          handlePenerimaanAturanChange(originalIndex, e.target.value as AturanAlokasi)
                                        }
                                        className="text-[9px] px-1 py-0.5 border border-stone-200 rounded bg-white text-stone-700 cursor-pointer"
                                        title="Pos Kas Tujuan"
                                      >
                                        <option value="split_45_55">Huria</option>
                                        <option value="huria">Huria 100%</option>
                                        <option value="sosial">Sosial</option>
                                        <option value="pembangunan">Pemb</option>
                                        <option value="transitori">Trans</option>
                                      </select>
                                    )}
                                    {(r.aturan_alokasi === 'split_45_55' || r.aturan_alokasi === 'pembangunan') && (
                                      <button
                                        type="button"
                                        onClick={() => handlePenerimaanDialihkanChange(originalIndex)}
                                        className={`text-[9px] px-1 py-0.5 rounded font-bold ${
                                          r.dialihkan_ke_pembangunan
                                            ? 'bg-amber-600 text-white'
                                            : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                                        }`}
                                        title="Alihkan ke Pembangunan"
                                      >
                                        {r.dialihkan_ke_pembangunan ? 'Pemb' : 'Std'}
                                      </button>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => handleDeletePenerimaanRow(originalIndex)}
                                      className="p-0.5 text-stone-400 hover:text-rose-600 rounded"
                                      title="Hapus baris"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            </React.Fragment>
                          );
                        });
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Sub-tabel B & C */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-stone-100">
                {/* B. Pelean Taon */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <h5 className="text-xs font-bold text-stone-900 uppercase">
                      B. Rincian Pelean Taon
                    </h5>
                    <span className="text-[10px] font-bold text-blue-900">
                      Total: Rp {formatRupiah(pelean_taon.reduce((a, c) => a + c.jumlah, 0))}
                    </span>
                  </div>
                  <div className="border border-stone-200 rounded p-2 bg-stone-50 space-y-1.5 max-h-[160px] overflow-y-auto">
                    {pelean_taon.map((pt, idx) => (
                      <div key={pt.id || idx} className="grid grid-cols-12 gap-1 text-[11px]">
                        <input
                          type="text"
                          value={pt.nama}
                          onChange={(e) => handlePeleanTaonChange(idx, 'nama', e.target.value)}
                          placeholder="Nama keluarga..."
                          className="col-span-5 px-1 py-0.5 border border-stone-300 rounded bg-white"
                        />
                        <input
                          type="text"
                          value={pt.lingkungan}
                          onChange={(e) => handlePeleanTaonChange(idx, 'lingkungan', e.target.value)}
                          placeholder="Wijk"
                          className="col-span-3 px-1 py-0.5 border border-stone-300 rounded bg-white text-center"
                        />
                        <input
                          type="text"
                          value={formatRupiah(pt.jumlah)}
                          onChange={(e) => handlePeleanTaonChange(idx, 'jumlah', e.target.value)}
                          placeholder="Rp"
                          className="col-span-4 px-1 py-0.5 border border-stone-300 rounded bg-white text-right font-mono-num"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* C. Hamauliateon */}
                <div className="space-y-2 md:col-span-2 pt-2 border-t border-stone-200">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h5 className="text-xs font-bold text-stone-900 uppercase flex items-center gap-1.5 flex-wrap">
                        <span>C. Rincian Hamauliateon (Ucapan Syukur)</span>
                        <span className="text-[10px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                          Multi-Pos Kas
                        </span>
                        {isHamSentral && (
                          <span className="text-[10px] font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                            Kas Huria: 45% Huria / 55% Sentral
                          </span>
                        )}
                      </h5>
                      <span className="text-[11px] text-stone-500">
                        Bagi rincian persembahan ke Kas Huria (otomatis 45% Huria & 55% Sentralisasi), Sosial Huria, Pembangunan, atau Transitori.
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-blue-900 font-mono-num">
                        Total: Rp {formatRupiah(hamauliateon.reduce((a, c) => a + c.jumlah, 0))}
                      </span>
                      <button
                        type="button"
                        onClick={handleAddHamauliateonRow}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded text-xs font-semibold cursor-pointer transition"
                      >
                        <Plus className="w-3.5 h-3.5" /> Tambah Hamauliateon
                      </button>
                    </div>
                  </div>

                  {/* Quick Pos Summary Banner */}
                  {(() => {
                    const hamSummary = calculateHamauliateonTotals(hamauliateon, isHamSentral);
                    return (
                      <div className="bg-stone-50 px-3 py-2 rounded-lg border border-stone-200 text-[11px] flex flex-wrap items-center justify-between gap-2 font-mono-num">
                        <span className="font-bold text-stone-800 font-sans">Akumulasi Pos Kas:</span>
                        <div className="flex flex-wrap gap-2 text-stone-600">
                          <span className="text-blue-900 font-semibold">
                            {isHamSentral ? 'Huria (45%)' : 'Huria'}: Rp {formatRupiah(hamSummary.totalHuria)}
                          </span>
                          {hamSummary.totalSentral > 0 && (
                            <>
                              <span>·</span>
                              <span className="text-amber-900 font-semibold">
                                Sentral (55%): Rp {formatRupiah(hamSummary.totalSentral)}
                              </span>
                            </>
                          )}
                          <span>·</span>
                          <span className="text-rose-900 font-semibold">
                            Sosial: Rp {formatRupiah(hamSummary.totalSosial)}
                          </span>
                          <span>·</span>
                          <span className="text-emerald-900 font-semibold">
                            Pemb: Rp {formatRupiah(hamSummary.totalPembangunan)}
                          </span>
                          {hamSummary.totalTransitori > 0 && (
                            <>
                              <span>·</span>
                              <span className="text-indigo-900 font-semibold">
                                Transitoris: Rp {formatRupiah(hamSummary.totalTransitori)}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  <div className="border border-stone-200 rounded-lg p-2.5 bg-stone-50 space-y-2.5 max-h-[380px] overflow-y-auto">
                    {hamauliateon.map((ham, idx) => {
                      const huriaSplit = calculateHuriaSentralSplit(ham.ke_huria || 0, isHamSentral);
                      const rawTransList = getHamauliateonTransitoriList(ham);
                      const transEntries =
                        rawTransList.length > 0
                          ? rawTransList
                          : [{ id: `tr-${ham.id || idx}-1`, kode: '', uraian: '', jumlah: 0 }];
                      const transSum = calculateHamauliateonTransitoriSum(ham);
                      const needsTransJenis = transEntries.some(
                        (t) => (t.jumlah || 0) > 0 && !t.kode
                      );
                      return (
                        <div
                          key={ham.id || idx}
                          className="bg-white p-2.5 rounded-lg border border-stone-200 space-y-2 text-xs"
                        >
                          {/* Baris 1: Nama, Rincian, Total, Hapus */}
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-stone-400 font-bold w-4">{idx + 1}.</span>
                            <input
                              type="text"
                              value={ham.nama}
                              onChange={(e) => handleHamauliateonChange(idx, 'nama', e.target.value)}
                              placeholder="Nama Keluarga (contoh: Kel. Op. Gorga)"
                              className="flex-1 min-w-[140px] px-2 py-1 border border-stone-300 rounded font-medium"
                            />
                            <input
                              type="text"
                              value={ham.rincian || ''}
                              onChange={(e) => handleHamauliateonChange(idx, 'rincian', e.target.value)}
                              placeholder="Keterangan ucapan syukur..."
                              className="flex-1 min-w-[160px] px-2 py-1 border border-stone-300 rounded text-stone-700"
                            />
                            <div className="flex items-center gap-1 bg-stone-100 px-2 py-1 rounded border border-stone-200">
                              <span className="text-[10px] uppercase font-bold text-stone-500">Total:</span>
                              <span className="font-mono-num font-bold text-stone-900 text-xs">
                                Rp {formatRupiah(ham.jumlah)}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleDeleteHamauliateonRow(idx)}
                              className="p-1 text-stone-400 hover:text-red-600 rounded transition cursor-pointer"
                              title="Hapus baris ini"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* Baris 2: Pos Kas Breakdown (4 Pos: Kas Huria, Sosial, Pembangunan, Transitori) */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-[10px] pt-1.5 border-t border-stone-100">
                            <div className="bg-blue-50/50 p-1.5 rounded border border-blue-100 flex flex-col justify-between">
                              <div>
                                <span className="block font-bold text-blue-900 mb-0.5">Ke Kas Huria:</span>
                                <input
                                  type="text"
                                  value={formatRupiah(ham.ke_huria)}
                                  onChange={(e) => handleHamauliateonChange(idx, 'ke_huria', e.target.value)}
                                  placeholder="0"
                                  className="w-full px-1.5 py-0.5 border border-stone-200 rounded text-right font-mono-num font-semibold bg-white text-blue-950 text-xs"
                                />
                              </div>
                              {(ham.ke_huria || 0) > 0 && (
                                <div className="mt-1 text-[9.5px] font-mono-num leading-tight text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                                  {isHamSentral
                                    ? `45% Huria: ${formatRupiah(huriaSplit.huria45)} · 55% Sentral: ${formatRupiah(huriaSplit.sentral55)}`
                                    : '100% Kas Huria (Non-Sentral)'}
                                </div>
                              )}
                            </div>

                            <div className="bg-rose-50/50 p-1.5 rounded border border-rose-100">
                              <span className="block font-bold text-rose-900 mb-0.5">Ke Sosial:</span>
                              <input
                                type="text"
                                value={formatRupiah(ham.ke_sosial)}
                                onChange={(e) => handleHamauliateonChange(idx, 'ke_sosial', e.target.value)}
                                placeholder="0"
                                className="w-full px-1.5 py-0.5 border border-stone-200 rounded text-right font-mono-num font-semibold bg-white text-rose-950 text-xs"
                              />
                            </div>

                            <div className="bg-emerald-50/50 p-1.5 rounded border border-emerald-100">
                              <span className="block font-bold text-emerald-900 mb-0.5">Ke Pembangunan:</span>
                              <input
                                type="text"
                                value={formatRupiah(ham.ke_pembangunan)}
                                onChange={(e) => handleHamauliateonChange(idx, 'ke_pembangunan', e.target.value)}
                                placeholder="0"
                                className="w-full px-1.5 py-0.5 border border-stone-200 rounded text-right font-mono-num font-semibold bg-white text-emerald-950 text-xs"
                              />
                            </div>

                            <div className={`bg-indigo-50/40 p-1.5 rounded border ${needsTransJenis ? 'border-amber-400 ring-1 ring-amber-200' : 'border-indigo-200'}`}>
                              <div className="flex items-center justify-between gap-1 mb-1">
                                <span className="font-bold text-indigo-950">Ke Transitoris:</span>
                                <button
                                  type="button"
                                  onClick={() => handleAddHamauliateonTransitoriEntry(idx)}
                                  className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-indigo-100 hover:bg-indigo-200 text-indigo-900 text-[9.5px] font-bold cursor-pointer transition"
                                  title="Tambah tujuan transitoris lain (mis. Pendeta, Bibelvrow, Lingkungan)"
                                >
                                  <Plus className="w-2.5 h-2.5" /> Tambah
                                </button>
                              </div>
                              <div className="space-y-1.5">
                                {transEntries.map((tEntry, tIdx) => {
                                  const rowMissingKode = (tEntry.jumlah || 0) > 0 && !tEntry.kode;
                                  const showDelete =
                                    transEntries.length > 1 ||
                                    (tEntry.jumlah || 0) > 0 ||
                                    Boolean(tEntry.kode);
                                  return (
                                    <div
                                      key={tEntry.id || tIdx}
                                      className={`p-1 rounded bg-white/85 border space-y-1 ${
                                        rowMissingKode ? 'border-amber-400' : 'border-indigo-100'
                                      }`}
                                    >
                                      <div className="flex items-center gap-1">
                                        <select
                                          value={tEntry.kode || ''}
                                          onChange={(e) =>
                                            handleUpdateHamauliateonTransitoriEntry(
                                              idx,
                                              tIdx,
                                              'kode',
                                              e.target.value
                                            )
                                          }
                                          className="flex-1 min-w-0 px-1 py-0.5 border border-stone-200 rounded bg-white text-stone-800 font-medium text-[10px] cursor-pointer"
                                          title="Pilih jenis penerimaan transitoris"
                                        >
                                          <option value="">-- Pilih Transitoris --</option>
                                          {transitoriOptions.map((opt) => (
                                            <option key={opt.kode} value={opt.kode}>
                                              {opt.no_tampilan ? `${opt.no_tampilan} ` : ''}{opt.uraian}
                                            </option>
                                          ))}
                                        </select>
                                        {showDelete && (
                                          <button
                                            type="button"
                                            onClick={() =>
                                              handleDeleteHamauliateonTransitoriEntry(idx, tIdx)
                                            }
                                            className="p-0.5 text-stone-400 hover:text-rose-600 rounded cursor-pointer transition shrink-0"
                                            title="Hapus item transitoris ini"
                                          >
                                            <Trash2 className="w-3 h-3" />
                                          </button>
                                        )}
                                      </div>
                                      <input
                                        type="text"
                                        value={formatRupiah(tEntry.jumlah)}
                                        onChange={(e) =>
                                          handleUpdateHamauliateonTransitoriEntry(
                                            idx,
                                            tIdx,
                                            'jumlah',
                                            e.target.value
                                          )
                                        }
                                        placeholder="0"
                                        className="w-full px-1.5 py-0.5 border border-stone-200 rounded text-right font-mono-num font-semibold bg-white text-stone-900 text-xs"
                                      />
                                      {rowMissingKode && (
                                        <span className="block text-[9px] text-amber-700 font-semibold">
                                          Pilih tujuan transitoris
                                        </span>
                                      )}
                                    </div>
                                  );
                                })}
                                {transEntries.length > 1 && (
                                  <div className="pt-0.5 text-right font-mono-num text-[10px] font-bold text-indigo-900">
                                    Total Transitoris: Rp {formatRupiah(transSum)}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Sumbangan Natal Diakoni Sosial (Sementara / Opsional -> Kas Sosial Huria) */}
              {(() => {
                const showSumbanganNatal = warta.tampilkan_sumbangan_natal !== false;
                const {
                  subTotal: subTotalSumbanganNatal,
                  dariMingguLalu,
                  mingguIni
                } = calculateSumbanganNatalBreakdown(sumbangan_natal);

                return (
                  <div className="space-y-2.5 pt-3 border-t border-stone-200">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <h5 className="text-xs font-bold text-stone-900 uppercase flex items-center gap-1.5 flex-wrap">
                          <span>Sumbangan Natal Diakoni Sosial</span>
                          <span className="text-[10px] font-semibold text-rose-800 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                            Masuk ke Kas Sosial Huria
                          </span>
                          {!showSumbanganNatal && (
                            <span className="text-[10px] font-bold uppercase tracking-wide bg-amber-100 text-amber-800 border border-amber-300 px-1.5 py-0.5 rounded">
                              Dihilangkan dari Warta
                            </span>
                          )}
                        </h5>
                        <p className="text-[11px] text-stone-500">
                          Tabel kumulatif s.d. Natal. Baris <strong>Minggu Ini</strong> otomatis masuk ke Penerimaan <strong>Kas Sosial Huria</strong>; baris <strong>Minggu Lalu</strong> tetap tampil tanpa double hitung.
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <button
                          type="button"
                          onClick={handlePullPrevSumbanganNatal}
                          disabled={isPullingPrevSumbangan}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-200 rounded text-xs font-semibold cursor-pointer transition disabled:opacity-50"
                          title="Ambil data penyumbang dari warta minggu sebelumnya (otomatis ditandai Minggu Lalu agar tidak double hitung)"
                        >
                          <History className={`w-3.5 h-3.5 ${isPullingPrevSumbangan ? 'animate-spin' : ''}`} />
                          {isPullingPrevSumbangan ? 'Mengambil...' : 'Ambil Minggu Sebelumnya'}
                        </button>
                        <button
                          type="button"
                          onClick={handleAddSumbanganNatalRow}
                          disabled={!showSumbanganNatal}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded text-xs font-semibold cursor-pointer transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Plus className="w-3.5 h-3.5" /> Tambah Penyumbang
                        </button>
                        <div
                          className="inline-flex items-center rounded border border-stone-300 bg-stone-100 p-0.5 shadow-2xs"
                          role="group"
                          aria-label="Tampilkan atau hilangkan tabel Sumbangan Natal Diakoni Sosial"
                        >
                          <button
                            type="button"
                            onClick={() => handleToggleSumbanganNatalVisibility(true)}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded transition cursor-pointer ${
                              showSumbanganNatal
                                ? 'bg-emerald-600 text-white shadow-2xs'
                                : 'text-stone-600 hover:text-stone-900'
                            }`}
                          >
                            <Eye className="w-3.5 h-3.5" /> Tampilkan
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleSumbanganNatalVisibility(false)}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded transition cursor-pointer ${
                              !showSumbanganNatal
                                ? 'bg-amber-600 text-white shadow-2xs'
                                : 'text-stone-600 hover:text-stone-900'
                            }`}
                          >
                            <EyeOff className="w-3.5 h-3.5" /> Hilangkan
                          </button>
                        </div>
                      </div>
                    </div>

                    {!showSumbanganNatal && (
                      <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-start gap-2">
                        <EyeOff className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                        <span>
                          Tabel <strong>Sumbangan Natal Diakoni Sosial</strong> sedang <strong>dihilangkan / disembunyikan</strong> dari halaman cetak warta dan tidak dihitung ke Kas Sosial Huria. Data baris tetap tersimpan jika sewaktu-waktu ditampilkan kembali.
                        </span>
                      </div>
                    )}

                    <datalist id="lingkungan-sumbangan-options">
                      <option value="Letare" />
                      <option value="Exaudi" />
                      <option value="Judika" />
                      <option value="Galatia" />
                      <option value="Efesus" />
                      <option value="Jeremia" />
                    </datalist>

                    <div className={`border border-stone-300 rounded-lg overflow-x-auto bg-white transition-opacity ${!showSumbanganNatal ? 'opacity-55' : ''}`}>
                      <table className="w-full text-xs">
                        <thead className="bg-stone-100 text-stone-800 font-bold border-b border-stone-300">
                          <tr>
                            <th className="w-10 py-1.5 px-2 text-center">No</th>
                            <th className="py-1.5 px-2 text-left">Nama Penyumbang</th>
                            <th className="w-32 py-1.5 px-2 text-left">Lingkungan</th>
                            <th className="w-28 py-1.5 px-2 text-center">Periode Kas</th>
                            <th className="w-36 py-1.5 px-2 text-right">Jumlah Sumbangan (Rp)</th>
                            <th className="w-12 py-1.5 px-2 text-center">Aksi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-200">
                          {sumbangan_natal.length > 0 ? (
                            sumbangan_natal.map((item, idx) => (
                              <tr
                                key={item.id || idx}
                                className={item.dari_minggu_lalu ? 'bg-amber-50/35 hover:bg-amber-50/60' : 'hover:bg-stone-50/70'}
                              >
                                <td className="py-1 px-2 text-center text-stone-500 font-medium">
                                  {idx + 1}.
                                </td>
                                <td className="py-1 px-2">
                                  <input
                                    type="text"
                                    value={item.nama}
                                    onChange={(e) => handleSumbanganNatalChange(idx, 'nama', e.target.value)}
                                    placeholder="Nama penyumbang / keluarga..."
                                    className="w-full px-2 py-1 border border-stone-200 rounded text-xs bg-stone-50 focus:bg-white"
                                  />
                                </td>
                                <td className="py-1 px-2">
                                  <input
                                    type="text"
                                    list="lingkungan-sumbangan-options"
                                    value={item.lingkungan}
                                    onChange={(e) => handleSumbanganNatalChange(idx, 'lingkungan', e.target.value)}
                                    placeholder="Lingkungan / Wijk"
                                    className="w-full px-2 py-1 border border-stone-200 rounded text-xs bg-stone-50 focus:bg-white"
                                  />
                                </td>
                                <td className="py-1 px-2 text-center">
                                  <button
                                    type="button"
                                    onClick={() => handleToggleSumbanganNatalPeriod(idx)}
                                    title={
                                      item.dari_minggu_lalu
                                        ? 'Sudah dibukukan minggu sebelumnya (klik untuk ubah ke Minggu Ini)'
                                        : 'Masuk Kas Sosial minggu ini (klik untuk ubah ke Minggu Lalu)'
                                    }
                                    className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border cursor-pointer transition ${
                                      item.dari_minggu_lalu
                                        ? 'bg-amber-100 text-amber-800 border-amber-300 hover:bg-amber-200'
                                        : 'bg-emerald-100 text-emerald-800 border-emerald-300 hover:bg-emerald-200'
                                    }`}
                                  >
                                    {item.dari_minggu_lalu ? 'Minggu Lalu' : 'Minggu Ini'}
                                  </button>
                                </td>
                                <td className="py-1 px-2">
                                  <input
                                    type="text"
                                    value={formatRupiah(item.jumlah)}
                                    onChange={(e) => handleSumbanganNatalChange(idx, 'jumlah', e.target.value)}
                                    placeholder="0"
                                    className="w-full px-2 py-1 border border-stone-200 rounded text-xs text-right font-mono-num font-semibold bg-stone-50 focus:bg-white"
                                  />
                                </td>
                                <td className="py-1 px-2 text-center">
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteSumbanganNatalRow(idx)}
                                    className="text-stone-400 hover:text-rose-600 p-1 rounded cursor-pointer transition"
                                    title="Hapus baris ini"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={6} className="py-3 px-3 text-center text-stone-400 italic text-xs">
                                Belum ada data penyumbang. Klik <strong>Ambil Minggu Sebelumnya</strong> atau <strong>+ Tambah Penyumbang</strong>.
                              </td>
                            </tr>
                          )}
                        </tbody>
                        <tfoot className="bg-stone-100 border-t-2 border-stone-300 font-bold text-stone-900">
                          <tr>
                            <td colSpan={4} className="py-1.5 px-2 text-right uppercase text-[11px]">
                              Sub Total (Kumulatif Sumbangan Natal):
                            </td>
                            <td className="py-1.5 px-2 text-right font-mono-num text-rose-900">
                              Rp {formatRupiah(showSumbanganNatal ? subTotalSumbanganNatal : 0)}
                            </td>
                            <td />
                          </tr>
                          {showSumbanganNatal && dariMingguLalu > 0 && (
                            <tr className="bg-stone-50 border-t border-stone-200 text-[11px] font-medium text-stone-600">
                              <td colSpan={6} className="py-1 px-2 text-right">
                                Sudah masuk kas minggu lalu: <strong className="font-mono-num text-stone-800">Rp {formatRupiah(dariMingguLalu)}</strong>
                                {' · '}
                                Tambahan Kas Sosial minggu ini: <strong className="font-mono-num text-emerald-800">Rp {formatRupiah(mingguIni)}</strong>
                              </td>
                            </tr>
                          )}
                        </tfoot>
                      </table>
                    </div>
                  </div>
                );
              })()}

              {/* D. Pengeluaran */}
              <div className="space-y-2 pt-2 border-t border-stone-100">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h4 className="text-xs font-bold text-stone-900 uppercase">
                      D. Pengeluaran (Belanja Huria)
                    </h4>
                    <p className="text-[11px] text-stone-500">
                      Tentukan pos dana belanja dan apakah pengeluaran dikenakan aturan setoran 55% ke sentralisasi.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[11px] text-stone-600 font-bold">
                      Total: Rp {formatRupiah(rekapitulasi.total_keluar)}
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsAddPengModalOpen(true)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded cursor-pointer transition shadow-2xs"
                    >
                      <Layers className="w-3.5 h-3.5" /> + Jenis / Master
                    </button>
                    <button
                      type="button"
                      onClick={handleAddPengeluaranRow}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded cursor-pointer transition shadow-2xs"
                    >
                      <Plus className="w-3.5 h-3.5" /> Baris Kosong
                    </button>
                  </div>
                </div>

                <div className="border border-stone-200 rounded-lg p-2 bg-stone-50 space-y-2.5 max-h-[340px] overflow-y-auto">
                  {pengeluaran.map((p, idx) => (
                    <div key={p.id || idx} className="p-2.5 bg-white rounded-lg border border-stone-200 shadow-2xs space-y-2 text-xs">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 justify-between">
                        <div className="flex-1 flex items-center gap-2 min-w-0">
                          <span className="text-stone-400 font-bold text-xs shrink-0">{idx + 1}.</span>
                          <input
                            type="text"
                            value={p.uraian}
                            onChange={(e) => handlePengeluaranChange(idx, 'uraian', e.target.value)}
                            placeholder="Uraian belanja / pengeluaran..."
                            className="flex-1 px-2.5 py-1 border border-stone-300 rounded text-xs bg-white font-medium"
                          />
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <div className="flex items-center gap-1 bg-stone-50 px-2 py-0.5 rounded border border-stone-200">
                            <label className="text-[11px] font-bold text-stone-700 whitespace-nowrap">Sentralisasi?</label>
                            <select
                              value={p.is_sentralisasi ? 'ya' : 'tidak'}
                              onChange={(e) => handlePengeluaranSentralisasiChange(idx, e.target.value === 'ya')}
                              className={`text-[11px] px-1.5 py-0.5 rounded border font-bold cursor-pointer transition ${
                                p.is_sentralisasi
                                  ? 'bg-amber-100 text-amber-900 border-amber-400 ring-1 ring-amber-300'
                                  : 'bg-white text-stone-700 border-stone-300'
                              }`}
                            >
                              <option value="tidak">Tidak</option>
                              <option value="ya">Ya (55%)</option>
                            </select>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDeletePengeluaranRow(idx)}
                            className="text-stone-400 hover:text-rose-600 p-1 cursor-pointer transition"
                            title="Hapus baris pengeluaran"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Baris Nominal Pengeluaran */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1.5 border-t border-stone-100">
                        <div>
                          <label className="block text-[10px] font-semibold text-stone-600 mb-0.5">
                            {p.is_sentralisasi ? 'Porsi Huria (45%):' : 'Kas Huria:'}
                          </label>
                          <input
                            type="text"
                            value={formatRupiah(p.huria)}
                            onChange={(e) => handlePengeluaranAmountChange(idx, 'huria', e.target.value)}
                            placeholder="Kas Huria"
                            className="w-full px-2 py-1 border border-stone-300 rounded text-right font-mono-num text-xs bg-stone-50 focus:bg-white"
                          />
                        </div>
                        {p.is_sentralisasi ? (
                          <div>
                            <label className="block text-[10px] font-semibold text-amber-800 mb-0.5">
                              Porsi Sentralisasi (55%):
                            </label>
                            <input
                              type="text"
                              value={formatRupiah(p.sentralisasi)}
                              onChange={(e) => handlePengeluaranAmountChange(idx, 'sentralisasi', e.target.value)}
                              placeholder="Sentral 55%"
                              className="w-full px-2 py-1 border border-amber-300 bg-amber-50/70 rounded text-right font-mono-num text-xs font-semibold text-amber-900"
                            />
                          </div>
                        ) : (
                          <div>
                            <label className="block text-[10px] font-semibold text-stone-600 mb-0.5">
                              Sosial Huria:
                            </label>
                            <input
                              type="text"
                              value={formatRupiah(p.sosial)}
                              onChange={(e) => handlePengeluaranAmountChange(idx, 'sosial', e.target.value)}
                              placeholder="Sosial"
                              className="w-full px-2 py-1 border border-stone-300 rounded text-right font-mono-num text-xs bg-stone-50 focus:bg-white"
                            />
                          </div>
                        )}
                        <div>
                          <label className="block text-[10px] font-semibold text-stone-600 mb-0.5">
                            Pembangunan:
                          </label>
                          <input
                            type="text"
                            value={formatRupiah(p.pembangunan)}
                            onChange={(e) => handlePengeluaranAmountChange(idx, 'pembangunan', e.target.value)}
                            placeholder="Pembangunan"
                            className="w-full px-2 py-1 border border-stone-300 rounded text-right font-mono-num text-xs bg-stone-50 focus:bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-stone-600 mb-0.5">
                            Transitori:
                          </label>
                          <input
                            type="text"
                            value={formatRupiah(p.transitori)}
                            onChange={(e) => handlePengeluaranAmountChange(idx, 'transitori', e.target.value)}
                            placeholder="Transitori"
                            className="w-full px-2 py-1 border border-stone-300 rounded text-right font-mono-num text-xs bg-stone-50 focus:bg-white"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* F. DAFTAR PEMAKAI SOPO GODANG (Setelah Rekapitulasi Keuangan) */}
              <div className="space-y-2 pt-3 border-t border-stone-200">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h4 className="text-xs font-bold text-stone-900 uppercase">
                      F. Daftar Pemakai Sopo Godang
                    </h4>
                    <p className="text-[11px] text-stone-500">
                      Jadwal pemakaian gedung serbaguna Sopo Godang (ditempatkan di bagian akhir setelah rekapitulasi keuangan).
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handleAddSopoGodangRow}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded cursor-pointer transition shadow-2xs"
                    >
                      <Plus className="w-3.5 h-3.5" /> Tambah Baris
                    </button>
                    <button
                      type="button"
                      onClick={() => openAddColumn('sopo_godang', 'Daftar Pemakai Sopo Godang')}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded cursor-pointer transition shadow-2xs"
                    >
                      <Columns className="w-3.5 h-3.5" /> Tambah Kolom
                    </button>
                  </div>
                </div>

                {(() => {
                  const sopoCols =
                    data.sopo_godang_columns && data.sopo_godang_columns.length > 0
                      ? data.sopo_godang_columns
                      : DEFAULT_SOPO_GODANG_COLUMNS;

                  return (
                    <div className="border border-stone-300 rounded-lg overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead className="bg-stone-100 border-b border-stone-300 text-stone-800 font-bold">
                          <tr>
                            <th className="w-8 py-1.5 px-2 text-center">No</th>
                            {sopoCols.map((col) => (
                              <th key={col.key} className="py-1.5 px-2 text-left">
                                <div className="flex items-center justify-between gap-1">
                                  <span>{col.label}</span>
                                  {col.removable && (
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteColumn('sopo_godang', col.key)}
                                      className="text-stone-400 hover:text-rose-600 p-0.5 rounded cursor-pointer transition"
                                      title={`Hapus kolom ${col.label}`}
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  )}
                                </div>
                              </th>
                            ))}
                            <th className="w-10 py-1.5 px-2 text-center">Aksi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-200">
                          {sopo_godang.map((sg, idx) => (
                            <tr key={sg.id || idx} className="hover:bg-stone-50/50">
                              <td className="py-1 px-2 text-center text-stone-500 font-medium">
                                {idx + 1}.
                              </td>
                              {sopoCols.map((col) => {
                                const val = (sg as Record<string, any>)[col.key] ?? '';
                                return (
                                  <td key={col.key} className="py-1 px-2">
                                    <input
                                      type="text"
                                      value={val}
                                      onChange={(e) =>
                                        handleSopoGodangCellChange(idx, col.key, e.target.value)
                                      }
                                      placeholder={`Isi ${col.label}...`}
                                      className="w-full px-2 py-1 border border-stone-200 rounded text-xs bg-stone-50 focus:bg-white"
                                    />
                                  </td>
                                );
                              })}
                              <td className="py-1 px-2 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleDeleteSopoGodangRow(idx)}
                                  className="text-stone-400 hover:text-rose-600 p-1 rounded cursor-pointer transition"
                                  title="Hapus baris ini"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {/* STEP 6: PRATINJAU & CETAK */}
          {currentStep === 6 && (
            <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-4 md:p-6 space-y-6">
              <div className="border-b border-stone-200 pb-3 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold text-stone-900">Langkah 6: Pratinjau & Cetak Dokumen A4</h3>
                  <p className="text-xs text-stone-500">
                    Periksa keseluruhan warta sebelum dicetak atau dipublikasikan.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handlePrint}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow transition cursor-pointer"
                  >
                    <Download className="w-4 h-4" /> Cetak / Simpan PDF
                  </button>
                </div>
              </div>

              {/* Checklist Validasi */}
              <div className="bg-stone-50 p-3.5 rounded-lg border border-stone-200 text-xs space-y-2">
                <div className="font-bold text-stone-900 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Status Kelengkapan Warta:
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-stone-700">
                  <div>✓ Halaman 1: Acara Minggu & Parhobas lengkap</div>
                  <div>✓ Halaman 2: {ulang_tahun.length} Ruas Ulang Tahun</div>
                  <div>
                    ✓ Halaman 3:{' '}
                    {rekapitulasi.is_balanced ? (
                      <span className="text-emerald-700 font-bold">Keuangan Seimbang (Balance)</span>
                    ) : (
                      <span className="text-rose-700 font-bold">Ada Selisih Rp {formatRupiah(rekapitulasi.selisih)}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Full Document Preview */}
              <div className="bg-stone-200 p-4 rounded-xl border border-stone-300">
                <WartaDocument
                  data={data}
                  pengaturan={pengaturan}
                  jadwalTetap={jadwalTetap}
                  selectedPage="all"
                />
              </div>
            </div>
          )}

          {/* Stepper Navigation Buttons */}
          <div className="flex items-center justify-between pt-4">
            <button
              onClick={() => setCurrentStep((prev) => Math.max(1, prev - 1))}
              disabled={currentStep === 1}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-stone-200 hover:bg-stone-300 disabled:opacity-40 text-stone-800 rounded-lg text-xs font-bold transition cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" /> Langkah Sebelumnya
            </button>

            <span className="text-xs text-stone-500 font-medium">
              Langkah {currentStep} dari 6
            </span>

            {currentStep < 6 ? (
              <button
                onClick={() => setCurrentStep((prev) => Math.min(6, prev + 1))}
                className="inline-flex items-center gap-1.5 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition cursor-pointer shadow-xs"
              >
                <span>Langkah Selanjutnya</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handlePrint}
                className="inline-flex items-center gap-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition cursor-pointer shadow-sm"
              >
                <Printer className="w-4 h-4" /> Cetak / Unduh PDF A4
              </button>
            )}
          </div>
        </div>

        {/* Right Column: Real-Time Live Preview with WartaDocument */}
        {showLivePreview && currentStep !== 6 && (
          <aside className="lg:col-span-5 space-y-3">
            <div className="sticky top-20">
              <div className="bg-stone-900 text-white px-3 py-2 rounded-t-xl flex items-center justify-between text-xs font-bold">
                <div className="flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-amber-400" />
                  <span>Pratinjau Langsung (Live A4)</span>
                </div>
                <span className="text-[10px] text-stone-400 font-normal">
                  Satu Sumber Data · Real-time
                </span>
              </div>
              <div className="bg-stone-300 p-2 rounded-b-xl border border-stone-300 max-h-[82vh] overflow-y-auto">
                <div className="transform origin-top scale-[0.68] sm:scale-[0.75] md:scale-[0.8] mb-[-25%]">
                  <WartaDocument
                    data={data}
                    pengaturan={pengaturan}
                    jadwalTetap={jadwalTetap}
                    selectedPage={
                      currentStep === 1 || currentStep === 2 || currentStep === 3
                        ? '1'
                        : currentStep === 4
                        ? '2'
                        : currentStep === 5
                        ? '3'
                        : 'all'
                    }
                  />
                </div>
              </div>
            </div>
          </aside>
        )}
      </div>

      {/* MODAL TAMBAH KOLOM DINAMIS */}
      <AddColumnModal
        isOpen={columnModal.isOpen}
        tableName={columnModal.tableName}
        suggestedLabels={columnModal.suggestions}
        onClose={() => setColumnModal((prev) => ({ ...prev, isOpen: false }))}
        onAddColumn={handleAddColumn}
      />

      {/* MODAL TAMBAH JENIS PENERIMAAN & PENGELUARAN */}
      <TambahPenerimaanModal
        isOpen={isAddPenModalOpen}
        onClose={() => setIsAddPenModalOpen(false)}
        existingRows={penerimaan}
        onAddRow={(newRow) => {
          const updatedRows = [...penerimaan, newRow];
          const { updatedRows: recalculated } = recalculatePenerimaanRows(updatedRows);
          const rekap = calculateRekapitulasi(warta, recalculated, pengeluaran);
          onChange({ ...data, penerimaan: recalculated, rekapitulasi: rekap });
        }}
        onSyncFromMaster={(missingRows) => {
          const updatedRows = [...penerimaan, ...missingRows];
          const { updatedRows: recalculated } = recalculatePenerimaanRows(updatedRows);
          const rekap = calculateRekapitulasi(warta, recalculated, pengeluaran);
          onChange({ ...data, penerimaan: recalculated, rekapitulasi: rekap });
        }}
      />
      <TambahPengeluaranModal
        isOpen={isAddPengModalOpen}
        onClose={() => setIsAddPengModalOpen(false)}
        wartaId={warta.id}
        nextUrutan={pengeluaran.length + 1}
        onAddItem={(item) => {
          const updated = [...pengeluaran, item];
          const rekap = calculateRekapitulasi(warta, penerimaan, updated);
          onChange({ ...data, pengeluaran: updated, rekapitulasi: rekap });
        }}
      />
    </div>
  );
};
