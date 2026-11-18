import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { WartaRecord } from '../types';
import { getAllWartas, getWartaById, getPengaturan, getJadwalTetap } from '../lib/wartaStorage';
import { useAuth } from '../context/AuthContext';
import {
  Archive,
  Search,
  Calendar,
  Printer,
  BookOpen,
  ArrowLeft,
  Filter,
  CheckCircle2,
  Download,
  Loader2,
  Share2,
  X,
  Home,
  ShieldCheck
} from 'lucide-react';
import { formatTanggalIndo, formatTanggalLengkap, BULAN_INDONESIA } from '../lib/dateUtils';
import { exportWartaToPdf } from '../lib/pdfExport';
import { buildWartaShareMessage, buildWartaShareUrl, executeWebShare } from '../lib/shareUtils';
import { HkbpCrossLogo } from '../components/logos/HkbpCrossLogo';
import { HkbpTransformasiLogo } from '../components/logos/HkbpTransformasiLogo';

export const ArsipWartaPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentRole } = useAuth();

  const [wartasList, setWartasList] = useState<WartaRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [isLoading, setIsLoading] = useState(true);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [archiveToast, setArchiveToast] = useState<string | null>(null);

  // If public, only fetch published; if staff, fetch all
  const isStaff = currentRole !== 'publik';

  useEffect(() => {
    setIsLoading(true);
    getAllWartas(!isStaff)
      .then((list) => {
        setWartasList(list);
      })
      .catch((err) => {
        console.warn('Gagal memuat arsip warta:', err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [isStaff]);

  // Extract available years from records
  const years = Array.from(
    new Set(wartasList.map((w) => w.tanggal_minggu.split('-')[0]))
  ).sort((a, b) => b.localeCompare(a));

  const filtered = wartasList
    .filter((w) => {
      const [year, month] = w.tanggal_minggu.split('-');

      const matchYear = selectedYear === 'all' || year === selectedYear;
      const matchMonth = selectedMonth === 'all' || parseInt(month, 10).toString() === selectedMonth;

      const matchSearch =
        w.goar_minggu.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (w.topik_minggu && w.topik_minggu.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (w.ayat_teks && w.ayat_teks.toLowerCase().includes(searchTerm.toLowerCase())) ||
        w.tanggal_minggu.includes(searchTerm);

      return matchYear && matchMonth && matchSearch;
    })
    .sort((a, b) => {
      if (sortOrder === 'desc') {
        return b.tanggal_minggu.localeCompare(a.tanggal_minggu);
      }
      return a.tanggal_minggu.localeCompare(b.tanggal_minggu);
    });

  const activeFilterCount =
    (selectedYear !== 'all' ? 1 : 0) +
    (selectedMonth !== 'all' ? 1 : 0) +
    (sortOrder !== 'desc' ? 1 : 0);

  const showToastMsg = (msg: string) => {
    setArchiveToast(msg);
    setTimeout(() => setArchiveToast(null), 3500);
  };

  const handleMobileDownloadPdf = async (wartaId: string) => {
    if (downloadingId) return;
    setDownloadingId(wartaId);
    try {
      const [full, pengs, jadwals] = await Promise.all([
        getWartaById(wartaId),
        getPengaturan(),
        getJadwalTetap()
      ]);
      if (!full) {
        showToastMsg('Data warta tidak ditemukan.');
        return;
      }
      const fileName = await exportWartaToPdf({
        data: full,
        pengaturan: pengs,
        jadwalTetap: jadwals,
        selectedPage: 'all'
      });
      showToastMsg(`PDF berhasil diunduh: ${fileName}`);
    } catch (err: any) {
      showToastMsg(err?.message || 'Gagal mengunduh PDF.');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleMobileShare = async (w: WartaRecord) => {
    const url = buildWartaShareUrl({ wartaId: w.id, view: 'baca', sec: 'liturgi' });
    const text = buildWartaShareMessage({ warta: w, url });
    const res = await executeWebShare({
      title: `Warta Jemaat Minggu ${w.goar_minggu}`,
      text,
      url
    });
    if (res === 'copied') {
      showToastMsg('Tautan arsip warta berhasil disalin.');
    }
  };

  return (
    <>
      {archiveToast && (
        <div className="fixed top-16 left-4 right-4 lg:left-auto lg:right-4 z-50 bg-stone-900 text-white px-4 py-2.5 rounded-xl shadow-2xl border border-stone-700 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{archiveToast}</span>
        </div>
      )}

      {/* DEDICATED MOBILE & TABLET ARCHIVE EXPERIENCE (< 1024px) */}
      <div className="lg:hidden min-h-screen bg-[#F7F5F0] text-stone-900 pb-24">
        <header className="sticky top-0 z-40 h-[52px] bg-[#0B2545] text-white border-b border-amber-500/20 px-3 flex items-center justify-between gap-2 pt-safe">
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              onClick={() => navigate('/')}
              aria-label="Kembali ke Beranda"
              className="min-w-[44px] min-h-[44px] rounded-xl text-stone-200 hover:bg-white/10 flex items-center justify-center cursor-pointer shrink-0"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <h1 className="text-sm font-bold text-white truncate">Arsip Warta Jemaat</h1>
              <p className="text-[10.5px] text-amber-200/90 truncate">
                {filtered.length} edisi tersedia
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setFilterSheetOpen(true)}
            className="min-h-[40px] px-3 py-1.5 rounded-xl bg-white/12 hover:bg-white/20 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            <Filter className="w-4 h-4 text-amber-400" />
            <span>Filter{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}</span>
          </button>
        </header>

        {/* Sticky Search Bar */}
        <div className="sticky top-[52px] z-30 bg-[#F7F5F0]/95 backdrop-blur-md px-3.5 py-2.5 border-b border-stone-200">
          <div className="max-w-3xl mx-auto relative">
            <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-3.5" />
            <input
              type="text"
              placeholder="Cari goar ni minggu, topik, atau tanggal..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full min-h-[44px] pl-10 pr-3 py-2 text-sm border border-stone-300 rounded-2xl bg-white focus:outline-none focus:ring-2 focus:ring-[#0B2545]"
            />
          </div>
        </div>

        <main className="max-w-3xl mx-auto px-3.5 pt-4 space-y-3">
          {activeFilterCount > 0 && (
            <div className="flex items-center justify-between text-xs text-stone-600 px-1">
              <span>
                Filter aktif:{' '}
                <strong className="text-[#0B2545]">
                  {selectedYear !== 'all' ? selectedYear : 'Semua Tahun'} ·{' '}
                  {selectedMonth !== 'all'
                    ? BULAN_INDONESIA[parseInt(selectedMonth, 10) - 1]
                    : 'Semua Bulan'}
                </strong>
              </span>
              <button
                type="button"
                onClick={() => {
                  setSelectedYear('all');
                  setSelectedMonth('all');
                  setSortOrder('desc');
                }}
                className="font-bold text-rose-700 cursor-pointer"
              >
                Reset
              </button>
            </div>
          )}

          {isLoading ? (
            <div className="py-16 bg-white rounded-2xl border border-stone-200 text-center space-y-2">
              <Loader2 className="w-7 h-7 animate-spin text-[#0B2545] mx-auto" />
              <p className="text-xs text-stone-500">Memuat berkas arsip warta...</p>
            </div>
          ) : filtered.length > 0 ? (
            <div className="space-y-3">
              {filtered.map((w) => {
                const totalRuas = (w.ruas_sm || 0) + (w.ruas_pagi || 0) + (w.ruas_siang || 0);
                const isExportingThis = downloadingId === w.id;
                return (
                  <article
                    key={w.id}
                    className="bg-white rounded-2xl border border-stone-200 p-4 space-y-3 shadow-2xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-[#0B2545] uppercase">
                          MINGGU {w.goar_minggu}
                          {w.status !== 'published' && ` · ${w.status.toUpperCase()}`}
                        </div>
                        <div className="text-xs text-stone-500 flex items-center gap-1.5 mt-0.5">
                          <Calendar className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                          <span>{formatTanggalLengkap(w.tanggal_minggu)}</span>
                        </div>
                      </div>
                      <span className="text-xs font-mono-num font-bold text-stone-600 shrink-0">
                        {totalRuas > 0 ? `${totalRuas} Ruas` : ''}
                      </span>
                    </div>

                    <h2 className="text-base font-bold text-stone-900 leading-snug">
                      {w.topik_minggu || `Warta Jemaat Minggu ${w.goar_minggu}`}
                    </h2>

                    {w.ayat_teks && (
                      <p className="text-xs sm:text-sm text-stone-600 italic font-serif-body line-clamp-2 leading-relaxed bg-stone-50 rounded-xl p-3">
                        "{w.ayat_teks}"
                      </p>
                    )}

                    <div className="grid grid-cols-3 gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => navigate(`/?id=${w.id}&view=baca`)}
                        className="min-h-[44px] px-2.5 py-2 rounded-xl bg-[#0B2545] text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <BookOpen className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span>Baca</span>
                      </button>

                      <button
                        type="button"
                        disabled={Boolean(downloadingId)}
                        onClick={() => handleMobileDownloadPdf(w.id)}
                        className="min-h-[44px] px-2.5 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
                      >
                        {isExportingThis ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                        ) : (
                          <Download className="w-3.5 h-3.5 shrink-0" />
                        )}
                        <span>{isExportingThis ? 'PDF...' : 'PDF'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleMobileShare(w)}
                        className="min-h-[44px] px-2.5 py-2 rounded-xl bg-stone-100 text-stone-800 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Share2 className="w-3.5 h-3.5 shrink-0" />
                        <span>Bagikan</span>
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="py-12 px-5 bg-white rounded-2xl border border-stone-200 text-center space-y-3">
              <Archive className="w-10 h-10 text-stone-300 mx-auto" />
              <h3 className="text-sm font-bold text-stone-800">Tidak ada warta yang cocok</h3>
              <p className="text-xs text-stone-500">
                Ubah kata kunci pencarian atau reset filter tahun &amp; bulan.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setSelectedYear('all');
                  setSelectedMonth('all');
                }}
                className="min-h-[44px] px-4 py-2 rounded-xl bg-[#0B2545] text-white text-xs font-bold cursor-pointer"
              >
                Tampilkan Semua Warta
              </button>
            </div>
          )}
        </main>

        {/* Filter Bottom Sheet Drawer */}
        {filterSheetOpen && (
          <div
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-end justify-center"
            onClick={() => setFilterSheetOpen(false)}
            role="dialog"
            aria-modal="true"
            aria-label="Filter Arsip Warta"
          >
            <div
              className="w-full max-w-2xl bg-white rounded-t-3xl border-t border-stone-200 p-5 pb-safe space-y-4 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-10 h-1.5 bg-stone-300 rounded-full mx-auto" />

              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-[#0B2545]">Filter Arsip Warta</h3>
                <button
                  type="button"
                  onClick={() => setFilterSheetOpen(false)}
                  className="min-w-[44px] min-h-[44px] rounded-xl text-stone-500 hover:bg-stone-100 flex items-center justify-center cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3 text-sm">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Tahun</label>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value)}
                    className="w-full min-h-[44px] px-3 py-2 border border-stone-300 rounded-xl bg-white"
                  >
                    <option value="all">Semua Tahun</option>
                    {years.map((y) => (
                      <option key={y} value={y}>
                        Tahun {y}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Bulan</label>
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="w-full min-h-[44px] px-3 py-2 border border-stone-300 rounded-xl bg-white"
                  >
                    <option value="all">Semua Bulan</option>
                    {BULAN_INDONESIA.map((b, idx) => (
                      <option key={idx} value={(idx + 1).toString()}>
                        {b}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Urutan</label>
                  <select
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value as 'desc' | 'asc')}
                    className="w-full min-h-[44px] px-3 py-2 border border-stone-300 rounded-xl bg-white"
                  >
                    <option value="desc">Terbaru Dahulu</option>
                    <option value="asc">Terlama Dahulu</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedYear('all');
                    setSelectedMonth('all');
                    setSortOrder('desc');
                  }}
                  className="min-h-[46px] rounded-xl border border-stone-300 text-stone-700 text-xs font-bold cursor-pointer"
                >
                  Reset Filter
                </button>
                <button
                  type="button"
                  onClick={() => setFilterSheetOpen(false)}
                  className="min-h-[46px] rounded-xl bg-[#0B2545] text-white text-xs font-bold cursor-pointer"
                >
                  Terapkan ({filtered.length})
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Mobile Bottom Thumb Bar */}
        <nav
          aria-label="Navigasi Arsip Mobile"
          className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-stone-200 pb-safe shadow-[0_-8px_24px_rgba(11,37,69,0.08)]"
        >
          <div className="grid grid-cols-4 items-center h-[58px] max-w-2xl mx-auto px-1">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="flex flex-col items-center justify-center min-h-[44px] text-stone-600 text-[10.5px] font-medium cursor-pointer"
            >
              <Home className="w-[21px] h-[21px]" />
              <span className="mt-0.5">Beranda</span>
            </button>
            <button
              type="button"
              onClick={() => navigate('/?view=baca')}
              className="flex flex-col items-center justify-center min-h-[44px] text-stone-600 text-[10.5px] font-medium cursor-pointer"
            >
              <BookOpen className="w-[21px] h-[21px]" />
              <span className="mt-0.5">Warta</span>
            </button>
            <button
              type="button"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="relative flex flex-col items-center justify-center min-h-[44px] text-[#0B2545] text-[10.5px] font-bold cursor-pointer"
            >
              <span className="absolute top-0.5 w-6 h-0.5 rounded-full bg-[#C59B27]" />
              <Archive className="w-[21px] h-[21px]" />
              <span className="mt-0.5">Arsip</span>
            </button>
            <button
              type="button"
              onClick={() => navigate(isStaff ? '/admin' : '/login')}
              className="flex flex-col items-center justify-center min-h-[44px] text-stone-600 text-[10.5px] font-medium cursor-pointer"
            >
              <ShieldCheck className="w-[21px] h-[21px]" />
              <span className="mt-0.5">{isStaff ? 'Dasbor' : 'Masuk'}</span>
            </button>
          </div>
        </nav>
      </div>

      {/* PRESERVED DESKTOP ARCHIVE EXPERIENCE (>= 1024px) */}
      <div className="hidden lg:flex min-h-screen bg-[#F7F5F0] text-stone-900 pb-16 flex-col justify-between">
      {/* Top Header */}
      <header className="bg-[#0B2545] text-white shadow-md border-b border-amber-500/20 px-3 sm:px-6 py-2.5 sm:py-3 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <button
              onClick={() => navigate('/')}
              className="inline-flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold text-stone-200 hover:text-white hover:bg-white/10 transition cursor-pointer min-h-[40px] shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden xs:inline">Beranda</span>
            </button>
            <div className="h-4 w-px bg-stone-700 hidden sm:block shrink-0" />
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="inline-flex items-center gap-1.5 bg-white rounded-xl px-2 py-1 shadow-xs shrink-0">
                <HkbpCrossLogo className="w-7 h-7 sm:w-8 sm:h-8" />
                <div className="h-5 w-px bg-stone-200 hidden sm:block" />
                <HkbpTransformasiLogo className="w-8 h-8 sm:w-9 sm:h-9 hidden sm:inline-block" />
              </div>
              <div className="min-w-0">
                <h1 className="text-xs sm:text-base font-bold text-white tracking-tight truncate">
                  Arsip Warta Jemaat HKBP
                </h1>
                <p className="text-[10px] sm:text-[11px] text-amber-200/80 truncate">
                  Ressort Hutaraja · Distrik VI Dairi
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isStaff ? (
              <button
                onClick={() => navigate('/admin')}
                className="inline-flex items-center gap-1.5 px-3 sm:px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 rounded-xl text-xs font-bold shadow-md transition cursor-pointer min-h-[40px] whitespace-nowrap"
              >
                Dashboard
              </button>
            ) : (
              <button
                onClick={() => navigate('/login')}
                className="inline-flex items-center gap-1.5 px-3 sm:px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-xl border border-white/20 transition cursor-pointer min-h-[40px] whitespace-nowrap"
              >
                Masuk
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6 md:py-8 flex-1 w-full space-y-6">
        {/* Banner Section */}
        <div className="bg-white rounded-2xl border border-stone-200/80 shadow-xs p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0B2545] bg-blue-50 px-2.5 py-1 rounded-md border border-blue-100">
              <Archive className="w-3.5 h-3.5 text-blue-800" />
              <span>Pusat Arsip Warta Jemaat Digital</span>
            </div>
            <h2 className="text-xl md:text-2xl font-display font-extrabold text-stone-900 tracking-tight">
              Koleksi Warta Jemaat Terbitan
            </h2>
            <p className="text-xs md:text-sm text-stone-600 max-w-2xl leading-relaxed">
              Setiap warta jemaat yang telah diterbitkan tersimpan secara permanen dalam arsip ini dan dapat dibuka kembali dalam mode interaktif atau dicetak ke ukuran kertas A4 kapan pun diperlukan.
            </p>
          </div>

          <div className="text-left md:text-right bg-stone-50 p-3.5 rounded-xl border border-stone-200/70 sm:self-start md:self-auto shrink-0">
            <span className="text-2xl sm:text-3xl font-extrabold text-[#0B2545] block font-mono-num">
              {filtered.length}
            </span>
            <span className="text-xs text-stone-500 font-medium">Dokumen Warta Ditemukan</span>
          </div>
        </div>

        {/* Filter & Search Bar with touch friendly inputs */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-stone-200/80 shadow-xs space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-3">
            {/* Search Input */}
            <div className="sm:col-span-2 md:col-span-5 relative">
              <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-3.5" />
              <input
                type="text"
                placeholder="Cari goar ni minggu, ayat firman, atau topik..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-3 py-2.5 text-xs border border-stone-300 rounded-xl focus:ring-2 focus:ring-[#0B2545] focus:outline-none min-h-[44px]"
              />
            </div>

            {/* Year Filter */}
            <div className="md:col-span-2">
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="w-full px-3 py-2.5 text-xs border border-stone-300 rounded-xl font-medium text-stone-800 bg-white min-h-[44px]"
              >
                <option value="all">Semua Tahun</option>
                {years.map((y) => (
                  <option key={y} value={y}>
                    Tahun {y}
                  </option>
                ))}
              </select>
            </div>

            {/* Month Filter */}
            <div className="md:col-span-3">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full px-3 py-2.5 text-xs border border-stone-300 rounded-xl font-medium text-stone-800 bg-white min-h-[44px]"
              >
                <option value="all">Semua Bulan</option>
                {BULAN_INDONESIA.map((b, idx) => (
                  <option key={idx} value={(idx + 1).toString()}>
                    {b}
                  </option>
                ))}
              </select>
            </div>

            {/* Sort Order */}
            <div className="md:col-span-2">
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as any)}
                className="w-full px-3 py-2.5 text-xs border border-stone-300 rounded-xl font-medium text-stone-800 bg-white min-h-[44px]"
              >
                <option value="desc">Terbaru Dahulu</option>
                <option value="asc">Terlama Dahulu</option>
              </select>
            </div>
          </div>
        </div>

        {/* Warta Archive Grid */}
        {isLoading ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-stone-200">
            <div className="animate-spin w-8 h-8 border-4 border-[#0B2545] border-t-amber-500 rounded-full mx-auto mb-3" />
            <p className="text-xs text-stone-500 font-medium">Memuat berkas arsip warta...</p>
          </div>
        ) : filtered.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {filtered.map((w) => {
              const totalRuas = (w.ruas_sm || 0) + (w.ruas_pagi || 0) + (w.ruas_siang || 0);
              return (
                <div
                  key={w.id}
                  className="bg-white rounded-2xl border border-stone-200/80 hover:border-amber-400 hover:shadow-md transition-all flex flex-col justify-between overflow-hidden group"
                >
                  <div className="p-5 space-y-3">
                    <div className="flex items-center justify-between gap-2 border-b border-stone-100 pb-2.5">
                      <span className="text-[11px] font-bold text-[#0B2545] bg-blue-50 px-2.5 py-0.5 rounded uppercase tracking-wider">
                        MINGGU {w.goar_minggu}
                      </span>
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                          w.status === 'published'
                            ? 'bg-emerald-50 text-emerald-800'
                            : 'bg-amber-50 text-amber-800'
                        }`}
                      >
                        {w.status}
                      </span>
                    </div>

                    <div>
                      <div className="text-xs font-semibold text-stone-500 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-stone-400" />
                        <span>{formatTanggalLengkap(w.tanggal_minggu)}</span>
                      </div>
                      <h3 className="text-base font-bold text-stone-900 mt-1 line-clamp-2">
                        {w.topik_minggu || `Warta Jemaat Minggu ${w.goar_minggu}`}
                      </h3>
                    </div>

                    {w.ayat_teks && (
                      <p className="text-xs text-stone-600 italic bg-stone-50 p-3 rounded-xl border border-stone-100 line-clamp-3 leading-relaxed">
                        "{w.ayat_teks}"
                        {w.ayat_ref && (
                          <span className="block font-sans font-bold text-[11px] not-italic text-stone-800 mt-1">
                            — {w.ayat_ref}
                          </span>
                        )}
                      </p>
                    )}

                    <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-[11px] text-stone-500">
                      <span>Kehadiran Minggu Lalu:</span>
                      <span className="font-bold text-stone-800 font-mono-num">
                        {totalRuas > 0 ? `${totalRuas} Halak` : '-'}
                      </span>
                    </div>
                  </div>

                  {/* Action Footer with >= 40px touch buttons */}
                  <div className="p-3.5 bg-stone-50 border-t border-stone-100 flex items-center justify-between gap-2">
                    <button
                      onClick={() => navigate(`/?id=${w.id}`)}
                      className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-white hover:bg-stone-100 text-stone-800 rounded-xl border border-stone-200 text-xs font-bold transition cursor-pointer min-h-[40px] flex-1"
                    >
                      <BookOpen className="w-3.5 h-3.5 text-[#0B2545]" /> Baca Warta
                    </button>

                    <button
                      onClick={() => navigate(`/warta/${w.id}/print`)}
                      className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-[#0B2545] hover:bg-[#123561] text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer min-h-[40px] flex-1"
                    >
                      <Printer className="w-3.5 h-3.5 text-amber-400" /> Cetak A4
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-16 bg-white rounded-2xl border border-stone-200 p-8 space-y-2">
            <Archive className="w-10 h-10 text-stone-300 mx-auto mb-2" />
            <h3 className="text-sm font-bold text-stone-800">Tidak ada warta yang cocok</h3>
            <p className="text-xs text-stone-500 max-w-md mx-auto">
              Cobalah mengubah kata kunci pencarian atau memilih tahun dan bulan yang berbeda.
            </p>
          </div>
        )}
      </main>

      {/* Floating Bottom Navigation Bar for Mobile */}
      <nav className="fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-md border-t border-stone-200/80 py-2 px-3 z-40 md:hidden shadow-lg flex items-center justify-around">
        <button
          onClick={() => navigate('/')}
          className="flex flex-col items-center gap-0.5 text-stone-500 hover:text-[#0B2545] transition min-w-[56px] min-h-[44px] justify-center cursor-pointer"
        >
          <BookOpen className="w-5 h-5" />
          <span className="text-[10px] font-semibold">Beranda</span>
        </button>

        <button
          onClick={() => navigate('/')}
          className="flex flex-col items-center gap-0.5 text-stone-500 hover:text-[#0B2545] transition min-w-[56px] min-h-[44px] justify-center cursor-pointer"
        >
          <Calendar className="w-5 h-5" />
          <span className="text-[10px] font-semibold">Warta</span>
        </button>

        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="flex flex-col items-center gap-0.5 text-[#0B2545] font-bold transition min-w-[56px] min-h-[44px] justify-center cursor-pointer"
        >
          <Archive className="w-5 h-5 text-amber-600" />
          <span className="text-[10px]">Arsip</span>
        </button>

        <button
          onClick={() => navigate(isStaff ? '/admin' : '/login')}
          className="flex flex-col items-center gap-0.5 text-stone-500 hover:text-[#0B2545] transition min-w-[56px] min-h-[44px] justify-center cursor-pointer"
        >
          <CheckCircle2 className="w-5 h-5" />
          <span className="text-[10px] font-semibold">{isStaff ? 'Dasbor' : 'Masuk'}</span>
        </button>
      </nav>

      {/* Footer */}
      <footer className="bg-[#0B2545] text-stone-300 text-xs py-6 mt-12 border-t border-amber-500/20">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-3 text-center md:text-left">
          <div>
            <div className="text-white font-bold text-sm">
              HKBP Ressort Hutaraja · Distrik VI Dairi
            </div>
            <div className="text-[11px] text-amber-300/80">
              Sistem Informasi & Arsip Warta Jemaat Digital
            </div>
          </div>
          <div className="text-[11px] text-stone-400">
            Halaman Arsip Terbuka untuk Seluruh Jemaat
          </div>
        </div>
      </footer>
      </div>
    </>
  );
};
