import React, { useState } from 'react';
import { FullWartaData, PeleanTaonItem, HamauliateonItem, PengeluaranItem, PenerimaanRow, AturanAlokasi } from '../../types';
import {
  formatRupiah,
  parseRupiahInput,
  calculateRowAlokasi,
  calculateHamauliateonTotals,
  recalculatePenerimaanRows,
  calculatePengeluaranTotals,
  calculateRekapitulasi
} from '../../lib/financialMath';
import { Plus, Trash2, CheckCircle2, AlertCircle, DollarSign, ArrowRight, Search, Filter, Columns, ChevronDown, Eye, Layers } from 'lucide-react';
import { TambahPenerimaanModal, TambahPengeluaranModal } from './TambahPosKeuanganModal';

interface EditorHalaman3Props {
  data: FullWartaData;
  onChange: (updated: FullWartaData) => void;
  disabled?: boolean;
}

export const EditorHalaman3: React.FC<EditorHalaman3Props> = ({ data, onChange, disabled }) => {
  const { warta, penerimaan, pelean_taon, hamauliateon, pengeluaran, rekapitulasi, sopo_godang = [] } = data;

  const [penerimaanTab, setPenerimaanTab] = useState<'all' | '1.1' | '1.2' | '1.3'>('all');
  const [penerimaanSearch, setPenerimaanSearch] = useState<string>('');
  const [showOnlyNonZero, setShowOnlyNonZero] = useState<boolean>(false);
  const [showExtraNoteCol, setShowExtraNoteCol] = useState<boolean>(false);
  const [showAddMenu, setShowAddMenu] = useState<boolean>(false);
  const [isAddPenModalOpen, setIsAddPenModalOpen] = useState<boolean>(false);
  const [isAddPengModalOpen, setIsAddPengModalOpen] = useState<boolean>(false);

  const handleUpdateSopoGodang = (index: number, field: 'nama' | 'tanggal', val: string) => {
    const updated = [...(data.sopo_godang || [])];
    while (updated.length <= index) {
      updated.push({
        id: `sg-${updated.length + 1}`,
        nama: '',
        tanggal: '',
        urutan: updated.length + 1
      });
    }
    updated[index] = { ...updated[index], [field]: val };
    onChange({ ...data, sopo_godang: updated });
  };

  const handleAddSopoGodang = () => {
    const updated = [...(data.sopo_godang || [])];
    updated.push({
      id: `sg-${Date.now()}`,
      nama: '',
      tanggal: '',
      urutan: updated.length + 1
    });
    onChange({ ...data, sopo_godang: updated });
  };

  const handleDeleteSopoGodang = (index: number) => {
    const updated = (data.sopo_godang || [])
      .filter((_, idx) => idx !== index)
      .map((it, idx) => ({ ...it, urutan: idx + 1 }));
    onChange({ ...data, sopo_godang: updated });
  };

  const updateWartaField = (field: string, val: any) => {
    const updatedWarta = { ...data.warta, [field]: val };
    const rekap = calculateRekapitulasi(updatedWarta, data.penerimaan, data.pengeluaran);
    onChange({
      ...data,
      warta: updatedWarta,
      rekapitulasi: rekap
    });
  };

  // Recalculate everything and propagate
  const updatePenerimaanAndRecalc = (
    newPenerimaan: typeof penerimaan,
    newPelean = pelean_taon,
    newHam = hamauliateon,
    newPengel = pengeluaran
  ) => {
    const rekap = calculateRekapitulasi(data.warta, newPenerimaan, newPengel);
    onChange({
      ...data,
      penerimaan: newPenerimaan,
      pelean_taon: newPelean,
      hamauliateon: newHam,
      pengeluaran: newPengel,
      rekapitulasi: rekap
    });
  };

  // A. Penerimaan handler
  const handlePenerimaanAmountChange = (index: number, valStr: string) => {
    const parsed = parseRupiahInput(valStr);
    const updated = [...penerimaan];
    const item = updated[index];
    const isSentral =
      item.is_sentralisasi !== false &&
      (item.is_sentralisasi === true || item.aturan_alokasi === 'split_45_55');
    const dist = calculateRowAlokasi(parsed, item.aturan_alokasi, item.dialihkan_ke_pembangunan, isSentral);
    updated[index] = {
      ...item,
      jumlah: parsed,
      ...dist
    };
    updatePenerimaanAndRecalc(updated);
  };

  const handleToggleSentralisasi = (index: number, isSentral: boolean) => {
    const updated = [...penerimaan];
    const item = updated[index];
    const dist = calculateRowAlokasi(item.jumlah, item.aturan_alokasi, item.dialihkan_ke_pembangunan, isSentral);
    updated[index] = {
      ...item,
      is_sentralisasi: isSentral,
      ...dist
    };
    updatePenerimaanAndRecalc(updated);
  };

  const handleUpdatePenerimaanUraian = (index: number, val: string) => {
    const updated = [...penerimaan];
    updated[index] = { ...updated[index], uraian: val };
    updatePenerimaanAndRecalc(updated);
  };

  const handleUpdatePenerimaanCatatan = (index: number, val: string) => {
    const updated = [...penerimaan];
    updated[index] = { ...updated[index], catatan: val };
    updatePenerimaanAndRecalc(updated);
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

    setShowAddMenu(false);
    updatePenerimaanAndRecalc([...penerimaan, newRow]);
  };

  const handleDeletePenerimaanRow = (index: number) => {
    const target = penerimaan[index];
    const updated = penerimaan.filter((_, idx) => idx !== index);
    updatePenerimaanAndRecalc(updated);
  };

  const handleToggleDialihkanPemb = (index: number) => {
    const updated = [...penerimaan];
    const item = updated[index];
    const nextVal = !item.dialihkan_ke_pembangunan;
    const isSentral =
      item.is_sentralisasi !== false &&
      (item.is_sentralisasi === true || item.aturan_alokasi === 'split_45_55');
    const dist = calculateRowAlokasi(item.jumlah, item.aturan_alokasi, nextVal, isSentral);
    updated[index] = {
      ...item,
      dialihkan_ke_pembangunan: nextVal,
      ...dist
    };
    updatePenerimaanAndRecalc(updated);
  };

  const handleChangeAturanPenerimaan = (index: number, newAturan: AturanAlokasi) => {
    const updated = [...penerimaan];
    const item = updated[index];
    const isSentral =
      item.is_sentralisasi !== false &&
      (item.is_sentralisasi === true || newAturan === 'split_45_55');
    const dist = calculateRowAlokasi(item.jumlah, newAturan, item.dialihkan_ke_pembangunan, isSentral);
    updated[index] = {
      ...item,
      aturan_alokasi: newAturan,
      ...dist
    };
    updatePenerimaanAndRecalc(updated);
  };

  // B. Pelean Taon handlers - Synchronizes with row Pelean Taon (1.2.15)
  const syncPeleanTaonTotalToPenerimaan = (newPeleanList: PeleanTaonItem[]) => {
    const totalPelean = newPeleanList.reduce((acc, c) => acc + (c.jumlah || 0), 0);
    const updatedPenerimaan = penerimaan.map((p) => {
      if (p.kode === 'PEL_TAON' || p.no_tampilan === '1.2.15') {
        const isSentral = p.is_sentralisasi !== undefined ? p.is_sentralisasi : true;
        const dist = calculateRowAlokasi(totalPelean, p.aturan_alokasi, p.dialihkan_ke_pembangunan, isSentral);
        return {
          ...p,
          jumlah: totalPelean,
          ...dist
        };
      }
      return p;
    });
    updatePenerimaanAndRecalc(updatedPenerimaan, newPeleanList);
  };

  const handleAddPeleanTaon = () => {
    const newItem: PeleanTaonItem = {
      id: `pt-${Date.now()}`,
      warta_id: warta.id,
      nama: 'Kel. ',
      lingkungan: 'Letare',
      jumlah: 0,
      urutan: pelean_taon.length + 1
    };
    syncPeleanTaonTotalToPenerimaan([...pelean_taon, newItem]);
  };

  const handleUpdatePeleanTaon = (index: number, field: keyof PeleanTaonItem, val: any) => {
    const updated = [...pelean_taon];
    updated[index] = { ...updated[index], [field]: val };
    syncPeleanTaonTotalToPenerimaan(updated);
  };

  const handleDeletePeleanTaon = (index: number) => {
    const updated = pelean_taon.filter((_, idx) => idx !== index);
    syncPeleanTaonTotalToPenerimaan(updated);
  };

  // C. Hamauliateon handlers - Synchronizes with row 28 (distributes to Kas Huria, Sosial, Pemb, Sentral, Transitori)
  const syncHamauliateonTotalToPenerimaan = (newHamList: HamauliateonItem[]) => {
    const hamTotals = calculateHamauliateonTotals(newHamList);
    const updatedPenerimaan = penerimaan.map((p) => {
      if (p.kode === 'HAM_LAIN' || p.no_tampilan === '1.2.17') {
        return {
          ...p,
          jumlah: hamTotals.totalJumlah,
          aturan_alokasi: 'manual' as const,
          huria_45: hamTotals.totalHuria,
          sosial: hamTotals.totalSosial,
          pembangunan: hamTotals.totalPembangunan,
          sentral_55: hamTotals.totalSentral,
          transitori: hamTotals.totalTransitori
        };
      }
      return p;
    });
    updatePenerimaanAndRecalc(updatedPenerimaan, pelean_taon, newHamList);
  };

  const handleAddHamauliateon = () => {
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
      urutan: hamauliateon.length + 1
    };
    syncHamauliateonTotalToPenerimaan([...hamauliateon, newItem]);
  };

  const handleUpdateHamauliateon = (index: number, field: keyof HamauliateonItem, val: any) => {
    const updated = [...hamauliateon];
    const isNumField = [
      'jumlah',
      'ke_huria',
      'ke_sosial',
      'ke_pembangunan',
      'ke_sentralisasi',
      'ke_transitori'
    ].includes(field as string);

    const parsedVal = isNumField ? parseRupiahInput(val) : val;
    const item = { ...updated[index], [field]: parsedVal };

    if (
      ['ke_huria', 'ke_sosial', 'ke_pembangunan', 'ke_sentralisasi', 'ke_transitori'].includes(
        field as string
      )
    ) {
      const sum =
        (item.ke_huria || 0) +
        (item.ke_sosial || 0) +
        (item.ke_pembangunan || 0) +
        (item.ke_sentralisasi || 0) +
        (item.ke_transitori || 0);
      item.jumlah = sum;
    } else if (field === 'jumlah') {
      const sumPos =
        (item.ke_huria || 0) +
        (item.ke_sosial || 0) +
        (item.ke_pembangunan || 0) +
        (item.ke_sentralisasi || 0) +
        (item.ke_transitori || 0);
      if (sumPos === 0 || sumPos === updated[index].jumlah) {
        item.ke_huria = parsedVal;
      }
    }

    updated[index] = item;
    syncHamauliateonTotalToPenerimaan(updated);
  };

  const handleDeleteHamauliateon = (index: number) => {
    const updated = hamauliateon.filter((_, idx) => idx !== index);
    syncHamauliateonTotalToPenerimaan(updated);
  };

  // D. Pengeluaran handlers
  const handleAddPengeluaran = () => {
    const newItem: PengeluaranItem = {
      id: `pengel-${Date.now()}`,
      warta_id: warta.id,
      urutan: pengeluaran.length + 1,
      uraian: 'Belanja / Kegiatan ',
      huria: 0,
      sosial: 0,
      pembangunan: 0,
      transitori: 0
    };
    updatePenerimaanAndRecalc(penerimaan, pelean_taon, hamauliateon, [...pengeluaran, newItem]);
  };

  const handleUpdatePengeluaran = (index: number, field: keyof PengeluaranItem, val: any) => {
    const updated = [...pengeluaran];
    updated[index] = { ...updated[index], [field]: val };
    updatePenerimaanAndRecalc(penerimaan, pelean_taon, hamauliateon, updated);
  };

  const handleDeletePengeluaran = (index: number) => {
    const updated = pengeluaran.filter((_, idx) => idx !== index);
    updatePenerimaanAndRecalc(penerimaan, pelean_taon, hamauliateon, updated);
  };

  const handleTogglePengeluaranSentralisasi = (index: number, isSentral: boolean) => {
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
    updatePenerimaanAndRecalc(penerimaan, pelean_taon, hamauliateon, updated);
  };

  const totals = recalculatePenerimaanRows(penerimaan);
  const pengelTotals = calculatePengeluaranTotals(pengeluaran);

  return (
    <div className="space-y-6">
      {/* 1. PERIODE LAPORAN KEUANGAN & SALDO AWAL */}
      <div className="bg-white p-5 rounded-lg border border-stone-200 shadow-sm space-y-4">
        <div className="flex items-center gap-2 border-b border-stone-100 pb-2">
          <DollarSign className="w-5 h-5 text-emerald-700" />
          <div>
            <h3 className="font-bold text-stone-900 text-sm md:text-base">
              Periode Keuangan & Saldo Awal (Dari Minggu Sebelumnya)
            </h3>
            <p className="text-xs text-stone-500">
              Saldo awal terisi otomatis dari saldo akhir warta sebelumnya. Anda dapat menyesuaikannya bila diperlukan.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Tanggal Mulai Periode
            </label>
            <input
              type="date"
              disabled={disabled}
              value={warta.periode_keuangan_mulai || ''}
              onChange={(e) => updateWartaField('periode_keuangan_mulai', e.target.value)}
              className="w-full px-3 py-2 text-xs border border-stone-300 rounded"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Tanggal Akhir Periode
            </label>
            <input
              type="date"
              disabled={disabled}
              value={warta.periode_keuangan_akhir || ''}
              onChange={(e) => updateWartaField('periode_keuangan_akhir', e.target.value)}
              className="w-full px-3 py-2 text-xs border border-stone-300 rounded"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 pt-2">
          <div className="p-2.5 bg-stone-50 rounded border border-stone-200">
            <label className="block text-[11px] font-semibold text-stone-600 mb-1">
              Saldo Awal Kas Huria (Rp)
            </label>
            <input
              type="text"
              disabled={disabled}
              value={formatRupiah(warta.saldo_awal_huria)}
              onChange={(e) => updateWartaField('saldo_awal_huria', parseRupiahInput(e.target.value))}
              className="w-full px-2 py-1 text-xs border border-stone-300 rounded font-mono-num font-bold text-right"
            />
          </div>
          <div className="p-2.5 bg-stone-50 rounded border border-stone-200">
            <label className="block text-[11px] font-semibold text-stone-600 mb-1">
              Saldo Awal Sosial Huria (Rp)
            </label>
            <input
              type="text"
              disabled={disabled}
              value={formatRupiah(warta.saldo_awal_sosial)}
              onChange={(e) => updateWartaField('saldo_awal_sosial', parseRupiahInput(e.target.value))}
              className="w-full px-2 py-1 text-xs border border-stone-300 rounded font-mono-num font-bold text-right"
            />
          </div>
          <div className="p-2.5 bg-stone-50 rounded border border-stone-200">
            <label className="block text-[11px] font-semibold text-stone-600 mb-1">
              Saldo Awal Pembangunan (Rp)
            </label>
            <input
              type="text"
              disabled={disabled}
              value={formatRupiah(warta.saldo_awal_pembangunan)}
              onChange={(e) =>
                updateWartaField('saldo_awal_pembangunan', parseRupiahInput(e.target.value))
              }
              className="w-full px-2 py-1 text-xs border border-stone-300 rounded font-mono-num font-bold text-right"
            />
          </div>
          <div className="p-2.5 bg-amber-50/70 rounded border border-amber-200">
            <label className="block text-[11px] font-semibold text-amber-900 mb-1">
              Saldo Awal Sentralisasi (Rp)
            </label>
            <input
              type="text"
              disabled={disabled}
              value={formatRupiah(warta.saldo_awal_sentralisasi)}
              onChange={(e) =>
                updateWartaField('saldo_awal_sentralisasi', parseRupiahInput(e.target.value))
              }
              className="w-full px-2 py-1 text-xs border border-amber-300 rounded font-mono-num font-bold text-right bg-white text-amber-900"
            />
          </div>
          <div className="p-2.5 bg-stone-50 rounded border border-stone-200">
            <label className="block text-[11px] font-semibold text-stone-600 mb-1">
              Saldo Awal Transitori (Rp)
            </label>
            <input
              type="text"
              disabled={disabled}
              value={formatRupiah(warta.saldo_awal_transitori)}
              onChange={(e) =>
                updateWartaField('saldo_awal_transitori', parseRupiahInput(e.target.value))
              }
              className="w-full px-2 py-1 text-xs border border-stone-300 rounded font-mono-num font-bold text-right"
            />
          </div>
        </div>
      </div>

      {/* 2. TABEL A: PENERIMAAN (STANDAR HKBP HUTARAJA) */}
      <div className="bg-white p-5 rounded-lg border border-stone-200 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 text-[10px] font-bold uppercase tracking-wider">
                HKBP Hutaraja Standard
              </span>
              <h3 className="font-bold text-stone-900 text-sm md:text-base">
                A. Pos Penerimaan Kas (Kebaktian Umum, Persembahan Lainnya & Transitori)
              </h3>
            </div>
            <p className="text-xs text-stone-500 mt-0.5">
              Tentukan status <strong>Sentralisasi (Ya / Tidak)</strong> pada tiap pos. Kas Huria, Sosial, Pembangunan, Sentralisasi 55%, dan Transitoris dialokasikan otomatis.
            </p>
          </div>
          <div className="flex items-center gap-4 text-right">
            <div>
              <span className="text-[11px] text-stone-500 block">Total Penerimaan (A):</span>
              <span className="text-base font-extrabold text-emerald-800 font-mono-num">
                Rp {formatRupiah(totals.totalJumlah)}
              </span>
            </div>
          </div>
        </div>

        {/* Toolbar: Filter Tabs, Search, Tambah Baris, Tambah/Hapus Kolom */}
        <div className="flex flex-wrap items-center justify-between gap-2 bg-stone-50 p-2 rounded border border-stone-200">
          {/* Tabs */}
          <div className="flex flex-wrap gap-1">
            <button
              type="button"
              onClick={() => setPenerimaanTab('all')}
              className={`px-2.5 py-1 text-xs rounded font-medium transition ${
                penerimaanTab === 'all'
                  ? 'bg-blue-900 text-white shadow-xs font-bold'
                  : 'bg-white text-stone-700 hover:bg-stone-100 border border-stone-200'
              }`}
            >
              Semua Pos ({penerimaan.length})
            </button>
            <button
              type="button"
              onClick={() => setPenerimaanTab('1.1')}
              className={`px-2.5 py-1 text-xs rounded font-medium transition ${
                penerimaanTab === '1.1'
                  ? 'bg-blue-900 text-white shadow-xs font-bold'
                  : 'bg-white text-stone-700 hover:bg-stone-100 border border-stone-200'
              }`}
            >
              1.1 Kebaktian Umum ({penerimaan.filter(p => p.kelompok === '1.1' || p.no_tampilan?.startsWith('1.1')).length})
            </button>
            <button
              type="button"
              onClick={() => setPenerimaanTab('1.2')}
              className={`px-2.5 py-1 text-xs rounded font-medium transition ${
                penerimaanTab === '1.2'
                  ? 'bg-blue-900 text-white shadow-xs font-bold'
                  : 'bg-white text-stone-700 hover:bg-stone-100 border border-stone-200'
              }`}
            >
              1.2 Persembahan Lainnya ({penerimaan.filter(p => p.kelompok === '1.2' || p.no_tampilan?.startsWith('1.2')).length})
            </button>
            <button
              type="button"
              onClick={() => setPenerimaanTab('1.3')}
              className={`px-2.5 py-1 text-xs rounded font-medium transition ${
                penerimaanTab === '1.3'
                  ? 'bg-blue-900 text-white shadow-xs font-bold'
                  : 'bg-white text-stone-700 hover:bg-stone-100 border border-stone-200'
              }`}
            >
              1.3 Transitori ({penerimaan.filter(p => p.kelompok === '1.3' || p.no_tampilan?.startsWith('1.3')).length})
            </button>
          </div>

          {/* Search & Actions */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2 top-2" />
              <input
                type="text"
                placeholder="Cari uraian pos..."
                value={penerimaanSearch}
                onChange={(e) => setPenerimaanSearch(e.target.value)}
                className="pl-7 pr-2 py-1 text-xs border border-stone-300 rounded bg-white w-40 sm:w-48"
              />
            </div>

            {/* Toggle Hanya Terisi (> Rp 0) */}
            <button
              type="button"
              onClick={() => setShowOnlyNonZero(!showOnlyNonZero)}
              className={`px-2 py-1 text-xs rounded border flex items-center gap-1 transition cursor-pointer ${
                showOnlyNonZero
                  ? 'bg-emerald-100 text-emerald-900 border-emerald-300 font-bold'
                  : 'bg-white text-stone-700 hover:bg-stone-100 border-stone-300'
              }`}
              title="Filter tampilkan hanya pos penerimaan yang sudah ada transaksi (> Rp 0)"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>{showOnlyNonZero ? 'Semua Pos' : 'Terisi > Rp 0'}</span>
            </button>

            {/* Tambah/Hapus Kolom Toggle */}
            <button
              type="button"
              onClick={() => setShowExtraNoteCol(!showExtraNoteCol)}
              className={`px-2 py-1 text-xs rounded border flex items-center gap-1 transition cursor-pointer ${
                showExtraNoteCol
                  ? 'bg-amber-100 text-amber-900 border-amber-300 font-bold'
                  : 'bg-white text-stone-700 hover:bg-stone-100 border-stone-300'
              }`}
              title="Tambah / Sembunyikan kolom catatan fleksibel"
            >
              <Columns className="w-3.5 h-3.5" />
              <span>{showExtraNoteCol ? 'Hapus Kolom Catatan' : '+ Kolom Catatan'}</span>
            </button>

            {/* Tambah Baris Dropdown & Modal */}
            {!disabled && (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setIsAddPenModalOpen(true)}
                  className="px-2.5 py-1 text-xs bg-blue-700 text-white hover:bg-blue-800 rounded font-bold flex items-center gap-1 shadow-xs cursor-pointer"
                  title="Buat item jenis penerimaan baru (bisa disimpan ke Master) atau pilih dari Master Data"
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>+ Jenis Penerimaan</span>
                </button>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowAddMenu(!showAddMenu)}
                    className="px-2.5 py-1 text-xs bg-emerald-800 text-white hover:bg-emerald-900 rounded font-bold flex items-center gap-1 shadow-xs cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Baris Cepat</span>
                    <ChevronDown className="w-3 h-3" />
                  </button>

                  {showAddMenu && (
                    <div className="absolute right-0 mt-1 w-60 bg-white rounded-lg shadow-lg border border-stone-200 py-1 z-20 text-xs">
                      <button
                        type="button"
                        onClick={() => handleAddPenerimaanRow('1.1')}
                        className="w-full text-left px-3 py-1.5 hover:bg-stone-100 text-stone-800 font-medium cursor-pointer"
                      >
                        + Baris 1.1 Kebaktian Umum
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAddPenerimaanRow('1.2')}
                        className="w-full text-left px-3 py-1.5 hover:bg-stone-100 text-stone-800 font-medium cursor-pointer"
                      >
                        + Baris 1.2 Persembahan Lainnya
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAddPenerimaanRow('1.3')}
                        className="w-full text-left px-3 py-1.5 hover:bg-stone-100 text-stone-800 font-medium cursor-pointer"
                      >
                        + Baris 1.3 Penerimaan Transitori
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="text-[11px] text-emerald-900 bg-emerald-50/70 border border-emerald-200 rounded px-3 py-1.5 flex items-center justify-between gap-2">
          <span>
            Info Cetak: Item jenis penerimaan yang kosong (<strong>Rp 0</strong>) otomatis disembunyikan saat mencetak warta.
          </span>
          <span className="font-mono-num font-bold shrink-0">
            {penerimaan.filter((r) => (r.jumlah || 0) > 0).length} / {penerimaan.length} pos terisi
          </span>
        </div>

        {/* Tabel Penerimaan */}
        <div className="overflow-x-auto border border-stone-300 rounded max-h-[550px] overflow-y-auto">
          <table className="w-full text-xs font-mono-num">
            <thead className="bg-stone-100 text-stone-800 border-b border-stone-300 sticky top-0 z-10 font-sans">
              <tr>
                <th className="py-1.5 px-2 text-center w-12">No</th>
                <th className="py-1.5 px-2 text-left">Uraian Penerimaan</th>
                <th className="py-1.5 px-2 text-center w-28">Sentralisasi?</th>
                <th className="py-1.5 px-2 text-right w-32">Jumlah (Rp)</th>
                <th className="py-1.5 px-2 text-right w-24">Huria</th>
                <th className="py-1.5 px-2 text-right w-20">Sosial</th>
                <th className="py-1.5 px-2 text-right w-20">Pemb</th>
                <th className="py-1.5 px-2 text-right w-24">Sentral (55%)</th>
                <th className="py-1.5 px-2 text-right w-24">Transitoris</th>
                {showExtraNoteCol && (
                  <th className="py-1.5 px-2 text-left w-32">Catatan Tambahan</th>
                )}
                <th className="py-1.5 px-2 text-center w-24">Opsi / Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200">
              {(() => {
                const filteredRows = penerimaan
                  .map((row, originalIndex) => ({ row, originalIndex }))
                  .filter(({ row, originalIndex }) => {
                    // Filter tab
                    if (penerimaanTab === '1.1') {
                      const match11 = row.kelompok === '1.1' || row.no_tampilan?.startsWith('1.1') || (!row.kelompok && originalIndex < 10);
                      if (!match11) return false;
                    } else if (penerimaanTab === '1.2') {
                      const match12 = row.kelompok === '1.2' || row.no_tampilan?.startsWith('1.2') || (!row.kelompok && originalIndex >= 10 && originalIndex < 27);
                      if (!match12) return false;
                    } else if (penerimaanTab === '1.3') {
                      const match13 = row.kelompok === '1.3' || row.no_tampilan?.startsWith('1.3') || (!row.kelompok && originalIndex >= 27);
                      if (!match13) return false;
                    }

                    // Filter non-zero
                    if (showOnlyNonZero && (row.jumlah || 0) <= 0) {
                      return false;
                    }

                    // Filter search
                    if (penerimaanSearch.trim()) {
                      const query = penerimaanSearch.toLowerCase();
                      const matchText = (row.uraian || '').toLowerCase().includes(query) ||
                        (row.no_tampilan || '').toLowerCase().includes(query);
                      if (!matchText) return false;
                    }
                    return true;
                  });

                if (filteredRows.length === 0) {
                  return (
                    <tr>
                      <td colSpan={showExtraNoteCol ? 11 : 10} className="py-8 text-center text-stone-400 italic">
                        Tidak ada pos penerimaan yang cocok dengan filter.
                      </td>
                    </tr>
                  );
                }

                let lastGroup = '';

                return filteredRows.map(({ row, originalIndex }) => {
                  const isAutoSource = row.kode === 'PEL_TAON' || row.kode === 'HAM_LAIN';
                  const isSentral =
                    row.is_sentralisasi !== false &&
                    (row.is_sentralisasi === true || row.aturan_alokasi === 'split_45_55');

                  const groupKey = row.kelompok || (row.no_tampilan ? row.no_tampilan.substring(0, 3) : originalIndex < 10 ? '1.1' : originalIndex < 27 ? '1.2' : '1.3');
                  const showHeader = penerimaanTab === 'all' && !penerimaanSearch.trim() && groupKey !== lastGroup;
                  if (showHeader) {
                    lastGroup = groupKey;
                  }

                  let headerTitle = '';
                  if (groupKey === '1.1') headerTitle = '1.1 PERSEMBAHAN KEBAKTIAN UMUM';
                  else if (groupKey === '1.2') headerTitle = '1.2 PERSEMBAHAN LAINNYA';
                  else if (groupKey === '1.3') headerTitle = '1.3 PENERIMAAN TRANSITORI';

                  return (
                    <React.Fragment key={row.id || originalIndex}>
                      {showHeader && (
                        <tr className="bg-stone-200/90 font-bold text-stone-900 border-y border-stone-300">
                          <td colSpan={showExtraNoteCol ? 11 : 10} className="py-1 px-3 text-[11px] font-sans uppercase tracking-wider text-stone-800">
                            {headerTitle}
                          </td>
                        </tr>
                      )}
                      <tr className="hover:bg-stone-50 transition">
                        <td className="py-1.5 px-2 text-center text-stone-600 font-sans font-medium whitespace-nowrap">
                          {row.no_tampilan || `${originalIndex + 1}.`}
                        </td>
                        <td className="py-1.5 px-2 font-sans font-medium text-stone-900">
                          <input
                            type="text"
                            disabled={disabled}
                            value={row.uraian}
                            onChange={(e) => handleUpdatePenerimaanUraian(originalIndex, e.target.value)}
                            className="w-full bg-transparent border-0 hover:border-b hover:border-stone-300 focus:border-b focus:border-blue-600 focus:outline-hidden py-0.5 text-xs text-stone-900 font-medium"
                          />
                          {isAutoSource && (
                            <span className="text-[10px] text-blue-700 bg-blue-50 px-1 py-0.2 rounded ml-1 font-sans font-semibold">
                              Otomatis dari Rincian {row.kode === 'PEL_TAON' ? 'B' : 'C'}
                            </span>
                          )}
                        </td>
                        <td className="py-1.5 px-2 text-center">
                          <select
                            disabled={disabled}
                            value={isSentral ? 'ya' : 'tidak'}
                            onChange={(e) => handleToggleSentralisasi(originalIndex, e.target.value === 'ya')}
                            className={`text-[10px] px-2 py-0.5 rounded border font-bold cursor-pointer transition ${
                              isSentral
                                ? 'bg-amber-100 text-amber-900 border-amber-300'
                                : 'bg-stone-100 text-stone-600 border-stone-300'
                            }`}
                          >
                            <option value="ya">Ya (55%)</option>
                            <option value="tidak">Tidak</option>
                          </select>
                        </td>
                        <td className="py-1.5 px-2 text-right">
                          <input
                            type="text"
                            disabled={disabled || isAutoSource}
                            value={formatRupiah(row.jumlah)}
                            onChange={(e) => handlePenerimaanAmountChange(originalIndex, e.target.value)}
                            className={`w-full px-2 py-0.5 text-xs text-right border border-stone-300 rounded font-bold ${
                              isAutoSource ? 'bg-stone-100 text-stone-500 cursor-not-allowed' : 'bg-white'
                            }`}
                          />
                        </td>
                        <td className="py-1.5 px-2 text-right text-stone-700 font-mono-num">
                          {row.huria_45 > 0 ? formatRupiah(row.huria_45) : '-'}
                        </td>
                        <td className="py-1.5 px-2 text-right text-stone-700 font-mono-num">
                          {row.sosial > 0 ? formatRupiah(row.sosial) : '-'}
                        </td>
                        <td className="py-1.5 px-2 text-right text-stone-700 font-mono-num">
                          {row.pembangunan > 0 ? formatRupiah(row.pembangunan) : '-'}
                        </td>
                        <td className="py-1.5 px-2 text-right text-stone-700 font-semibold font-mono-num">
                          {row.sentral_55 > 0 ? formatRupiah(row.sentral_55) : '-'}
                        </td>
                        <td className="py-1.5 px-2 text-right text-stone-700 font-mono-num">
                          {row.transitori > 0 ? (
                            <span className="text-rose-800 font-semibold">{formatRupiah(row.transitori)}</span>
                          ) : (
                            '-'
                          )}
                        </td>
                        {showExtraNoteCol && (
                          <td className="py-1.5 px-2">
                            <input
                              type="text"
                              disabled={disabled}
                              placeholder="Keterangan..."
                              value={row.catatan || ''}
                              onChange={(e) => handleUpdatePenerimaanCatatan(originalIndex, e.target.value)}
                              className="w-full px-1.5 py-0.5 text-xs border border-stone-300 rounded bg-white"
                            />
                          </td>
                        )}
                        <td className="py-1.5 px-2 text-center">
                          <div className="flex items-center justify-center gap-1">
                            {row.aturan_alokasi !== 'manual' && (
                              <select
                                disabled={disabled}
                                value={row.aturan_alokasi}
                                onChange={(e) =>
                                  handleChangeAturanPenerimaan(originalIndex, e.target.value as AturanAlokasi)
                                }
                                className="text-[10px] px-1 py-0.5 border border-stone-200 rounded bg-white text-stone-700 font-sans cursor-pointer"
                                title="Pilih Pos Kas Tujuan"
                              >
                                <option value="split_45_55">Huria</option>
                                <option value="huria">Huria 100%</option>
                                <option value="sosial">Sosial</option>
                                <option value="pembangunan">Pemb</option>
                                <option value="transitori">Trans</option>
                              </select>
                            )}
                            {row.aturan_alokasi === 'split_45_55' || row.aturan_alokasi === 'pembangunan' ? (
                              <button
                                type="button"
                                disabled={disabled}
                                onClick={() => handleToggleDialihkanPemb(originalIndex)}
                                className={`text-[10px] px-1.5 py-0.5 rounded font-sans transition ${
                                  row.dialihkan_ke_pembangunan
                                    ? 'bg-amber-600 text-white font-bold'
                                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                                }`}
                                title="Alihkan bagian 45% ke kas Pembangunan"
                              >
                                {row.dialihkan_ke_pembangunan ? 'Ke Pemb' : 'Std'}
                              </button>
                            ) : null}
                            {!disabled && (
                              <button
                                type="button"
                                onClick={() => handleDeletePenerimaanRow(originalIndex)}
                                className="p-1 text-stone-400 hover:text-rose-600 rounded transition"
                                title="Hapus baris ini"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
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

      {/* 3. RINCIAN B (PELEAN TAON) & C (HAMAULIATEON) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* B. PELEAN TAON */}
        <div className="bg-white p-4 rounded-lg border border-stone-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-stone-100 pb-2">
            <div>
              <h4 className="font-bold text-stone-900 text-xs uppercase">
                B. Rincian Pelean Taon
              </h4>
              <p className="text-[11px] text-stone-500">
                Total langsung mengisi baris Pelean Taon di Bagian A.
              </p>
            </div>
            {!disabled && (
              <button
                onClick={handleAddPeleanTaon}
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded text-xs font-semibold"
              >
                <Plus className="w-3.5 h-3.5" /> Tambah
              </button>
            )}
          </div>

          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {pelean_taon.map((pt, idx) => (
              <div key={pt.id || idx} className="flex items-center gap-2 text-xs">
                <input
                  type="text"
                  disabled={disabled}
                  value={pt.nama}
                  onChange={(e) => handleUpdatePeleanTaon(idx, 'nama', e.target.value)}
                  placeholder="Keluarga / Nama"
                  className="flex-1 px-2 py-1 border border-stone-300 rounded"
                />
                <input
                  type="text"
                  disabled={disabled}
                  value={pt.lingkungan}
                  onChange={(e) => handleUpdatePeleanTaon(idx, 'lingkungan', e.target.value)}
                  placeholder="Wijk"
                  className="w-24 px-2 py-1 border border-stone-300 rounded"
                />
                <input
                  type="text"
                  disabled={disabled}
                  value={formatRupiah(pt.jumlah)}
                  onChange={(e) =>
                    handleUpdatePeleanTaon(idx, 'jumlah', parseRupiahInput(e.target.value))
                  }
                  placeholder="Rp"
                  className="w-28 px-2 py-1 border border-stone-300 rounded font-mono-num text-right font-semibold"
                />
                {!disabled && (
                  <button
                    onClick={() => handleDeletePeleanTaon(idx)}
                    className="p-1 text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* C. HAMAULIATEON (UCAPAN SYUKUR DENGAN PEMBAGIAN POS KAS) */}
        <div className="bg-white p-4 rounded-lg border border-stone-200 shadow-sm space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 pb-2">
            <div>
              <h4 className="font-bold text-stone-900 text-xs uppercase flex items-center gap-1.5">
                <span>C. Rincian Hamauliateon (Ucapan Syukur)</span>
                <span className="text-[10px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                  Multi-Pos Kas
                </span>
              </h4>
              <p className="text-[11px] text-stone-500">
                Nominal rincian dapat dibagi ke masing-masing pos (Kas Huria, Sosial Huria, Pembangunan, Sentralisasi, Transitori) dan otomatis diakumulasi.
              </p>
            </div>
            {!disabled && (
              <button
                type="button"
                onClick={handleAddHamauliateon}
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded text-xs font-semibold cursor-pointer transition"
              >
                <Plus className="w-3.5 h-3.5" /> Tambah Hamauliateon
              </button>
            )}
          </div>

          {/* Quick Pos Summary Banner */}
          {(() => {
            const totals = calculateHamauliateonTotals(hamauliateon);
            return (
              <div className="bg-stone-50 p-2.5 rounded-lg border border-stone-200 text-xs flex flex-wrap items-center justify-between gap-2">
                <span className="font-bold text-stone-900 font-mono-num">
                  Total Hamauliateon: Rp {formatRupiah(totals.totalJumlah)}
                </span>
                <div className="flex flex-wrap gap-2 text-[11px] font-mono-num text-stone-600">
                  <span className="text-blue-900 font-medium">Huria: Rp {formatRupiah(totals.totalHuria)}</span>
                  <span>·</span>
                  <span className="text-rose-900 font-medium">Sosial: Rp {formatRupiah(totals.totalSosial)}</span>
                  <span>·</span>
                  <span className="text-emerald-900 font-medium">Pemb: Rp {formatRupiah(totals.totalPembangunan)}</span>
                  {totals.totalSentral > 0 && (
                    <>
                      <span>·</span>
                      <span className="text-amber-900 font-medium">Sentral: Rp {formatRupiah(totals.totalSentral)}</span>
                    </>
                  )}
                  {totals.totalTransitori > 0 && (
                    <>
                      <span>·</span>
                      <span className="text-indigo-900 font-medium">Trans: Rp {formatRupiah(totals.totalTransitori)}</span>
                    </>
                  )}
                </div>
              </div>
            );
          })()}

          <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
            {hamauliateon.map((h, idx) => (
              <div
                key={h.id || idx}
                className="p-3 bg-stone-50/80 rounded-lg border border-stone-200 text-xs space-y-2 hover:border-blue-300 transition"
              >
                {/* Row 1: Nama, Keterangan, Total, Delete */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-stone-500 font-bold w-5">{idx + 1}.</span>
                  <input
                    type="text"
                    disabled={disabled}
                    value={h.nama}
                    onChange={(e) => handleUpdateHamauliateon(idx, 'nama', e.target.value)}
                    placeholder="Nama Keluarga (contoh: Kel. Op. Gorga)"
                    className="flex-1 min-w-[140px] px-2.5 py-1.5 border border-stone-300 rounded bg-white font-medium"
                  />
                  <input
                    type="text"
                    disabled={disabled}
                    value={h.rincian || ''}
                    onChange={(e) => handleUpdateHamauliateon(idx, 'rincian', e.target.value)}
                    placeholder="Keterangan ucapan syukur..."
                    className="flex-1 min-w-[160px] px-2.5 py-1.5 border border-stone-300 rounded bg-white text-stone-700"
                  />
                  <div className="flex items-center gap-1.5 shrink-0 bg-white px-2.5 py-1 rounded border border-stone-300">
                    <span className="text-[10px] uppercase font-bold text-stone-500">Total:</span>
                    <span className="font-mono-num font-bold text-stone-900 text-xs">
                      Rp {formatRupiah(h.jumlah)}
                    </span>
                  </div>
                  {!disabled && (
                    <button
                      type="button"
                      onClick={() => handleDeleteHamauliateon(idx)}
                      className="p-1.5 text-stone-400 hover:text-red-600 rounded transition cursor-pointer"
                      title="Hapus baris ini"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Row 2: Pembagian Pos Kas (Ke Huria, Sosial, Pembangunan, Sentralisasi, Transitori) */}
                <div className="pt-2 border-t border-stone-200/60 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 text-[11px]">
                  <div className="bg-white p-1.5 rounded border border-blue-200">
                    <label className="block text-[10px] font-bold text-blue-900 mb-0.5">
                      Ke Kas Huria (Rp):
                    </label>
                    <input
                      type="text"
                      disabled={disabled}
                      value={formatRupiah(h.ke_huria)}
                      onChange={(e) => handleUpdateHamauliateon(idx, 'ke_huria', e.target.value)}
                      placeholder="0"
                      className="w-full px-1.5 py-0.5 text-xs border border-stone-200 rounded font-mono-num text-right font-semibold text-blue-950"
                    />
                  </div>

                  <div className="bg-white p-1.5 rounded border border-rose-200">
                    <label className="block text-[10px] font-bold text-rose-900 mb-0.5">
                      Ke Sosial Huria (Rp):
                    </label>
                    <input
                      type="text"
                      disabled={disabled}
                      value={formatRupiah(h.ke_sosial)}
                      onChange={(e) => handleUpdateHamauliateon(idx, 'ke_sosial', e.target.value)}
                      placeholder="0"
                      className="w-full px-1.5 py-0.5 text-xs border border-stone-200 rounded font-mono-num text-right font-semibold text-rose-950"
                    />
                  </div>

                  <div className="bg-white p-1.5 rounded border border-emerald-200">
                    <label className="block text-[10px] font-bold text-emerald-900 mb-0.5">
                      Ke Pembangunan (Rp):
                    </label>
                    <input
                      type="text"
                      disabled={disabled}
                      value={formatRupiah(h.ke_pembangunan)}
                      onChange={(e) => handleUpdateHamauliateon(idx, 'ke_pembangunan', e.target.value)}
                      placeholder="0"
                      className="w-full px-1.5 py-0.5 text-xs border border-stone-200 rounded font-mono-num text-right font-semibold text-emerald-950"
                    />
                  </div>

                  <div className="bg-white p-1.5 rounded border border-amber-200">
                    <label className="block text-[10px] font-bold text-amber-900 mb-0.5">
                      Ke Sentralisasi (Rp):
                    </label>
                    <input
                      type="text"
                      disabled={disabled}
                      value={formatRupiah(h.ke_sentralisasi)}
                      onChange={(e) => handleUpdateHamauliateon(idx, 'ke_sentralisasi', e.target.value)}
                      placeholder="0"
                      className="w-full px-1.5 py-0.5 text-xs border border-stone-200 rounded font-mono-num text-right font-semibold text-amber-950"
                    />
                  </div>

                  <div className="bg-white p-1.5 rounded border border-stone-200 col-span-2 sm:col-span-1">
                    <label className="block text-[10px] font-bold text-stone-700 mb-0.5">
                      Ke Transitori (Rp):
                    </label>
                    <input
                      type="text"
                      disabled={disabled}
                      value={formatRupiah(h.ke_transitori)}
                      onChange={(e) => handleUpdateHamauliateon(idx, 'ke_transitori', e.target.value)}
                      placeholder="0"
                      className="w-full px-1.5 py-0.5 text-xs border border-stone-200 rounded font-mono-num text-right font-semibold text-stone-900"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 4. D. LAPORAN PENGELUARAN */}
      <div className="bg-white p-5 rounded-lg border border-stone-200 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 pb-2">
          <div>
            <h3 className="font-bold text-stone-900 text-sm md:text-base">
              D. Pengeluaran (Uang Belanja / Operasional)
            </h3>
            <p className="text-xs text-stone-500">
              Isi nominal pada pos dana yang bersangkutan (Kas Huria, Sosial, Pembangunan, atau Transitori).
            </p>
          </div>
          {!disabled && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsAddPengModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-700 hover:bg-rose-800 text-white rounded text-xs font-semibold cursor-pointer"
              >
                <Layers className="w-3.5 h-3.5" /> + Jenis Pengeluaran / Master
              </button>
              <button
                type="button"
                onClick={handleAddPengeluaran}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Baris Kosong
              </button>
            </div>
          )}
        </div>

        <div className="space-y-2">
          {pengeluaran.map((p, idx) => (
            <div
              key={p.id || idx}
              className="p-3 bg-stone-50 rounded-lg border border-stone-200 space-y-2 text-xs"
            >
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 justify-between">
                <div className="flex-1 flex items-center gap-2 min-w-0">
                  <span className="text-stone-400 font-bold text-xs shrink-0">{idx + 1}.</span>
                  <input
                    type="text"
                    disabled={disabled}
                    value={p.uraian}
                    onChange={(e) => handleUpdatePengeluaran(idx, 'uraian', e.target.value)}
                    placeholder="Uraian Pengeluaran"
                    className="flex-1 px-2.5 py-1 text-xs border border-stone-300 rounded bg-white font-medium"
                  />
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <div className="flex items-center gap-1 bg-white px-2 py-0.5 rounded border border-stone-200">
                    <label className="text-[11px] font-bold text-stone-700 whitespace-nowrap">Sentralisasi?</label>
                    <select
                      disabled={disabled}
                      value={p.is_sentralisasi ? 'ya' : 'tidak'}
                      onChange={(e) => handleTogglePengeluaranSentralisasi(idx, e.target.value === 'ya')}
                      className={`text-[11px] px-1.5 py-0.5 rounded border font-bold cursor-pointer transition ${
                        p.is_sentralisasi
                          ? 'bg-amber-100 text-amber-900 border-amber-400 ring-1 ring-amber-300'
                          : 'bg-stone-50 text-stone-700 border-stone-300'
                      }`}
                    >
                      <option value="tidak">Tidak</option>
                      <option value="ya">Ya (55%)</option>
                    </select>
                  </div>
                  {!disabled && (
                    <button
                      type="button"
                      onClick={() => handleDeletePengeluaran(idx)}
                      className="p-1 text-red-500 hover:text-red-700 cursor-pointer transition"
                      title="Hapus baris pengeluaran"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Baris Nominal Dana */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-1 border-t border-stone-200">
                <div>
                  <span className="block text-[10px] text-stone-600 font-semibold mb-0.5">
                    {p.is_sentralisasi ? 'Porsi Huria (45%):' : 'Kas Huria:'}
                  </span>
                  <input
                    type="text"
                    disabled={disabled}
                    value={formatRupiah(p.huria)}
                    onChange={(e) =>
                      handleUpdatePengeluaran(idx, 'huria', parseRupiahInput(e.target.value))
                    }
                    className="w-full px-2 py-1 text-xs border border-stone-300 rounded text-right font-mono-num bg-white"
                  />
                </div>
                {p.is_sentralisasi ? (
                  <div>
                    <span className="block text-[10px] text-amber-800 font-semibold mb-0.5">
                      Porsi Sentralisasi (55%):
                    </span>
                    <input
                      type="text"
                      disabled={disabled}
                      value={formatRupiah(p.sentralisasi)}
                      onChange={(e) =>
                        handleUpdatePengeluaran(idx, 'sentralisasi', parseRupiahInput(e.target.value))
                      }
                      className="w-full px-2 py-1 text-xs border border-amber-300 bg-amber-50/70 rounded text-right font-mono-num font-semibold text-amber-900"
                    />
                  </div>
                ) : (
                  <div>
                    <span className="block text-[10px] text-stone-600 font-semibold mb-0.5">
                      Sosial Huria:
                    </span>
                    <input
                      type="text"
                      disabled={disabled}
                      value={formatRupiah(p.sosial)}
                      onChange={(e) =>
                        handleUpdatePengeluaran(idx, 'sosial', parseRupiahInput(e.target.value))
                      }
                      className="w-full px-2 py-1 text-xs border border-stone-300 rounded text-right font-mono-num bg-white"
                    />
                  </div>
                )}
                <div>
                  <span className="block text-[10px] text-stone-600 font-semibold mb-0.5">
                    Pembangunan:
                  </span>
                  <input
                    type="text"
                    disabled={disabled}
                    value={formatRupiah(p.pembangunan)}
                    onChange={(e) =>
                      handleUpdatePengeluaran(idx, 'pembangunan', parseRupiahInput(e.target.value))
                    }
                    className="w-full px-2 py-1 text-xs border border-stone-300 rounded text-right font-mono-num bg-white"
                  />
                </div>
                <div>
                  <span className="block text-[10px] text-stone-600 font-semibold mb-0.5">
                    Transitori:
                  </span>
                  <input
                    type="text"
                    disabled={disabled}
                    value={formatRupiah(p.transitori)}
                    onChange={(e) =>
                      handleUpdatePengeluaran(idx, 'transitori', parseRupiahInput(e.target.value))
                    }
                    className="w-full px-2 py-1 text-xs border border-stone-300 rounded text-right font-mono-num bg-white"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 5. E. LIVE REKAPITULASI & VALIDASI BALANCE */}
      <div className="bg-white p-5 rounded-lg border-2 border-stone-800 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-200 pb-2">
          <div>
            <h3 className="font-bold text-stone-900 text-sm md:text-base">
              E. Rekapitulasi Kas & Saldo Akhir (Real-Time)
            </h3>
            <p className="text-xs text-stone-500">
              Saldo Akhir = Saldo Awal + Masuk − Keluar. Sentralisasi: Masuk = Keluar (disetor penuh).
            </p>
          </div>
          {rekapitulasi.is_balanced ? (
            <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-md text-xs font-bold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Validasi: Total Alokasi Seimbang</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1 bg-red-50 text-red-700 border border-red-200 rounded-md text-xs font-bold">
              <AlertCircle className="w-4 h-4 text-red-600" />
              <span>Peringatan: Selisih Rp {formatRupiah(rekapitulasi.selisih)}</span>
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono-num">
            <thead className="bg-stone-800 text-white font-sans font-bold">
              <tr>
                <th className="py-2 px-2 text-left">Pos Dana Huria</th>
                <th className="py-2 px-2 text-right">Saldo Awal (Rp)</th>
                <th className="py-2 px-2 text-right">Penerimaan (Rp)</th>
                <th className="py-2 px-2 text-right">Pengeluaran (Rp)</th>
                <th className="py-2 px-2 text-right">Saldo Akhir (Rp)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200">
              <tr className="hover:bg-stone-50">
                <td className="py-1.5 px-2 font-sans font-semibold text-stone-900">1. Kas Huria (45%)</td>
                <td className="py-1.5 px-2 text-right">{formatRupiah(rekapitulasi.huria.saldo_awal)}</td>
                <td className="py-1.5 px-2 text-right text-emerald-700">{formatRupiah(rekapitulasi.huria.masuk)}</td>
                <td className="py-1.5 px-2 text-right text-rose-700">{formatRupiah(rekapitulasi.huria.keluar)}</td>
                <td className="py-1.5 px-2 text-right font-bold bg-stone-50">{formatRupiah(rekapitulasi.huria.saldo_akhir)}</td>
              </tr>
              <tr className="hover:bg-stone-50">
                <td className="py-1.5 px-2 font-sans font-semibold text-stone-900">2. Kas Sosial Huria</td>
                <td className="py-1.5 px-2 text-right">{formatRupiah(rekapitulasi.sosial.saldo_awal)}</td>
                <td className="py-1.5 px-2 text-right text-emerald-700">{formatRupiah(rekapitulasi.sosial.masuk)}</td>
                <td className="py-1.5 px-2 text-right text-rose-700">{formatRupiah(rekapitulasi.sosial.keluar)}</td>
                <td className="py-1.5 px-2 text-right font-bold bg-stone-50">{formatRupiah(rekapitulasi.sosial.saldo_akhir)}</td>
              </tr>
              <tr className="hover:bg-stone-50">
                <td className="py-1.5 px-2 font-sans font-semibold text-stone-900">3. Kas Pembangunan Huria</td>
                <td className="py-1.5 px-2 text-right">{formatRupiah(rekapitulasi.pembangunan.saldo_awal)}</td>
                <td className="py-1.5 px-2 text-right text-emerald-700">{formatRupiah(rekapitulasi.pembangunan.masuk)}</td>
                <td className="py-1.5 px-2 text-right text-rose-700">{formatRupiah(rekapitulasi.pembangunan.keluar)}</td>
                <td className="py-1.5 px-2 text-right font-bold bg-stone-50">{formatRupiah(rekapitulasi.pembangunan.saldo_akhir)}</td>
              </tr>
              <tr className="hover:bg-stone-50 bg-amber-50/40">
                <td className="py-1.5 px-2 font-sans font-semibold text-stone-900">4. Sentralisasi Keuangan (55%)</td>
                <td className="py-1.5 px-2 text-right">{formatRupiah(rekapitulasi.sentralisasi.saldo_awal)}</td>
                <td className="py-1.5 px-2 text-right text-emerald-700">{formatRupiah(rekapitulasi.sentralisasi.masuk)}</td>
                <td className="py-1.5 px-2 text-right text-rose-700">{formatRupiah(rekapitulasi.sentralisasi.keluar)}</td>
                <td className="py-1.5 px-2 text-right font-bold bg-stone-50">{formatRupiah(rekapitulasi.sentralisasi.saldo_akhir)}</td>
              </tr>
              <tr className="hover:bg-stone-50">
                <td className="py-1.5 px-2 font-sans font-semibold text-stone-900">5. Dana Transitori</td>
                <td className="py-1.5 px-2 text-right">{formatRupiah(rekapitulasi.transitori.saldo_awal)}</td>
                <td className="py-1.5 px-2 text-right text-emerald-700">{formatRupiah(rekapitulasi.transitori.masuk)}</td>
                <td className="py-1.5 px-2 text-right text-rose-700">{formatRupiah(rekapitulasi.transitori.keluar)}</td>
                <td className="py-1.5 px-2 text-right font-bold bg-stone-50">{formatRupiah(rekapitulasi.transitori.saldo_akhir)}</td>
              </tr>
              <tr className="bg-stone-200 font-bold text-stone-900 border-t-2 border-stone-800">
                <td className="py-2 px-2 font-sans uppercase">Total Saldo Kas Gereja:</td>
                <td className="py-2 px-2 text-right">
                  {formatRupiah(
                    rekapitulasi.total_saldo_awal ??
                      (warta.saldo_awal_huria +
                        warta.saldo_awal_sosial +
                        warta.saldo_awal_pembangunan +
                        (warta.saldo_awal_sentralisasi || 0) +
                        warta.saldo_awal_transitori)
                  )}
                </td>
                <td className="py-2 px-2 text-right text-emerald-800">{formatRupiah(rekapitulasi.total_masuk)}</td>
                <td className="py-2 px-2 text-right text-rose-800">{formatRupiah(rekapitulasi.total_keluar)}</td>
                <td className="py-2 px-2 text-right font-extrabold text-blue-950 bg-stone-300">
                  Rp {formatRupiah(rekapitulasi.total_saldo_akhir)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* F. DAFTAR PEMAKAI SOPO GODANG (Setelah Rekapitulasi) */}
        <div className="bg-white p-5 rounded-lg border border-stone-200 shadow-sm space-y-3">
          <div className="border-b border-stone-100 pb-2 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="font-bold text-stone-900 text-sm md:text-base">
                F. Daftar Pemakai Sopo Godang
              </h3>
              <p className="text-xs text-stone-500">
                Jadwal sewa / pemakaian gedung serbaguna Sopo Godang HKBP Hutaraja (terletak di bagian akhir setelah rekapitulasi keuangan).
              </p>
            </div>
            {!disabled && (
              <button
                type="button"
                onClick={handleAddSopoGodang}
                className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded text-xs font-semibold transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Tambah Baris Pemakai
              </button>
            )}
          </div>

          <div className="space-y-2">
            {sopo_godang.map((sg, idx) => (
              <div key={sg.id || idx} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center">
                <span className="w-6 text-xs font-bold text-stone-500 md:col-span-1">{idx + 1}.</span>
                <div className="md:col-span-6">
                  <input
                    type="text"
                    disabled={disabled}
                    value={sg.nama}
                    onChange={(e) => handleUpdateSopoGodang(idx, 'nama', e.target.value)}
                    placeholder="Nama Keluarga / Kegiatan / Alamat"
                    className="w-full px-2.5 py-1.5 text-xs border border-stone-300 rounded"
                  />
                </div>
                <div className="md:col-span-4">
                  <input
                    type="text"
                    disabled={disabled}
                    value={sg.tanggal}
                    onChange={(e) => handleUpdateSopoGodang(idx, 'tanggal', e.target.value)}
                    placeholder="Hari, Tanggal (e.g. Selasa, 10 Nopember 2026)"
                    className="w-full px-2.5 py-1.5 text-xs border border-stone-300 rounded"
                  />
                </div>
                <div className="md:col-span-1 flex justify-center">
                  {!disabled && (
                    <button
                      type="button"
                      onClick={() => handleDeleteSopoGodang(idx)}
                      className="text-stone-400 hover:text-rose-600 p-1 rounded cursor-pointer transition"
                      title="Hapus baris"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modals Tambah Jenis Penerimaan & Pengeluaran */}
      <TambahPenerimaanModal
        isOpen={isAddPenModalOpen}
        onClose={() => setIsAddPenModalOpen(false)}
        existingRows={penerimaan}
        onAddRow={(newRow) => updatePenerimaanAndRecalc([...penerimaan, newRow])}
        onSyncFromMaster={(missingRows) =>
          updatePenerimaanAndRecalc([...penerimaan, ...missingRows])
        }
      />
      <TambahPengeluaranModal
        isOpen={isAddPengModalOpen}
        onClose={() => setIsAddPengModalOpen(false)}
        wartaId={warta.id}
        nextUrutan={pengeluaran.length + 1}
        onAddItem={(item) =>
          updatePenerimaanAndRecalc(penerimaan, pelean_taon, hamauliateon, [...pengeluaran, item])
        }
      />
    </div>
  );
};
