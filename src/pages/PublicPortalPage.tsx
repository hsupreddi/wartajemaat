import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { FullWartaData, WartaRecord, PengaturanHuria, JadwalTetapItem } from '../types';
import { getAllWartas, getWartaById, getPengaturan, getJadwalTetap } from '../lib/wartaStorage';
import { WartaDocument } from '../components/warta/WartaDocument';
import { WartaMobileInteractive } from '../components/warta/WartaMobileInteractive';
import { HkbpCrossLogo } from '../components/logos/HkbpCrossLogo';
import { HkbpTransformasiLogo } from '../components/logos/HkbpTransformasiLogo';
import {
  Printer,
  Download,
  Loader2,
  Calendar,
  BookOpen,
  Archive,
  ShieldCheck,
  Share2,
  FileText,
  Clock,
  ChevronRight,
  CheckCircle2,
  Smartphone,
  Menu,
  X,
  Home
} from 'lucide-react';
import { formatTanggalIndo, formatTanggalLengkap } from '../lib/dateUtils';
import { exportWartaToPdf } from '../lib/pdfExport';
import { useAuth } from '../context/AuthContext';

export const PublicPortalPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { currentRole } = useAuth();
  const readerSectionRef = useRef<HTMLDivElement>(null);

  const [wartasList, setWartasList] = useState<WartaRecord[]>([]);
  const [selectedWarta, setSelectedWarta] = useState<FullWartaData | null>(null);
  const [pengaturan, setPengaturan] = useState<PengaturanHuria>();
  const [jadwalTetap, setJadwalTetap] = useState<JadwalTetapItem[]>([]);
  const [activeTab, setActiveTab] = useState<'hal1' | 'hal2' | 'hal3' | 'all'>('hal1');
  const [viewMode, setViewMode] = useState<'interactive' | 'printA4'>('interactive');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [shareToast, setShareToast] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    Promise.all([getAllWartas(true), getPengaturan(), getJadwalTetap()])
      .then(async ([published, setts, jadwals]) => {
        setWartasList(published);
        setPengaturan(setts);
        setJadwalTetap(jadwals);

        const wartaIdParam = searchParams.get('id');
        const targetId = wartaIdParam || published[0]?.id;

        if (targetId) {
          const full = await getWartaById(targetId);
          setSelectedWarta(full);
        }
      })
      .catch((err) => {
        console.warn('Gagal memuat portal warta:', err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const handleSelectWarta = async (id: string) => {
    setIsLoading(true);
    setSearchParams({ id });
    try {
      const full = await getWartaById(id);
      setSelectedWarta(full);
    } catch (err) {
      console.warn('Gagal memuat warta:', err);
    } finally {
      setIsLoading(false);
    }
    readerSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `Warta Jemaat HKBP Ressort Hutaraja - MINGGU ${selectedWarta?.warta.goar_minggu}`,
        url: window.location.href
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      setShareToast('Tautan warta berhasil disalin ke papan klip!');
      setTimeout(() => setShareToast(null), 3000);
    }
  };

  const totalRuasAktif = selectedWarta
    ? (selectedWarta.warta.ruas_sm || 0) +
      (selectedWarta.warta.ruas_pagi || 0) +
      (selectedWarta.warta.ruas_siang || 0)
    : 0;

  return (
    <div className="min-h-screen bg-[#F8F6F0] text-stone-900 flex flex-col justify-between selection:bg-amber-800 selection:text-white pb-16 lg:pb-0">
      {/* 1. COMPACT TOP NAVIGATION BAR (3-Zone Contract) */}
      <header className="sticky top-0 z-40 bg-[#0B2545]/95 backdrop-blur-md text-white shadow-lg border-b border-amber-500/20 px-3 sm:px-6 py-2.5 sm:py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 lg:gap-8">
          {/* Zone 1: Brand Lockup */}
          <button
            type="button"
            onClick={() => navigate('/')}
            className="flex items-center gap-2.5 sm:gap-3 cursor-pointer group shrink-0 text-left min-w-0"
          >
            <div className="shrink-0 transition-transform duration-200 group-hover:scale-105">
              <HkbpCrossLogo className="w-9 h-9 sm:w-10 sm:h-10" />
            </div>
            <span className="text-sm sm:text-base font-display font-bold tracking-wide uppercase text-white whitespace-nowrap truncate">
              HKBP Ressort Hutaraja
            </span>
          </button>

          {/* Zone 2: Clean Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-6 text-xs font-semibold text-stone-200">
            <a
              href="#beranda"
              className="hover:text-amber-300 transition whitespace-nowrap shrink-0 py-1 border-b-2 border-transparent hover:border-amber-400"
            >
              Beranda
            </a>
            <a
              href="#warta-terkini"
              className="hover:text-amber-300 transition whitespace-nowrap shrink-0 py-1 border-b-2 border-transparent hover:border-amber-400"
            >
              Warta Minggu
            </a>
            <button
              type="button"
              onClick={() => navigate('/arsip')}
              className="hover:text-amber-300 transition whitespace-nowrap shrink-0 py-1 border-b-2 border-transparent hover:border-amber-400 cursor-pointer"
            >
              Arsip Warta
            </button>
            <a
              href="#jadwal-ibadah"
              className="hover:text-amber-300 transition whitespace-nowrap shrink-0 py-1 border-b-2 border-transparent hover:border-amber-400"
            >
              Jadwal Ibadah
            </a>
          </nav>

          {/* Zone 3: Primary Action & Mobile Drawer Trigger */}
          <div className="flex items-center gap-2 shrink-0">
            {currentRole !== 'publik' ? (
              <button
                type="button"
                onClick={() => navigate('/admin')}
                className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl text-xs shadow-md transition cursor-pointer min-h-[40px] whitespace-nowrap shrink-0"
              >
                <ShieldCheck className="w-4 h-4 text-stone-950" />
                <span>Dashboard ({currentRole})</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl text-xs shadow-md transition cursor-pointer min-h-[40px] whitespace-nowrap shrink-0"
              >
                <ShieldCheck className="w-4 h-4 text-stone-950" />
                <span>Masuk Pengurus</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Buka Menu"
              className="lg:hidden p-2 rounded-xl text-stone-200 hover:text-white hover:bg-white/10 min-w-[44px] min-h-[44px] flex items-center justify-center cursor-pointer"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden mt-2.5 pt-3 border-t border-white/10 space-y-2.5">
            <div className="grid grid-cols-2 gap-2 text-xs font-semibold">
              <a
                href="#beranda"
                onClick={() => setMobileMenuOpen(false)}
                className="p-3 bg-white/10 rounded-xl text-stone-100 flex items-center gap-2 min-h-[44px]"
              >
                <Home className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Beranda</span>
              </a>
              <a
                href="#warta-terkini"
                onClick={() => setMobileMenuOpen(false)}
                className="p-3 bg-white/10 rounded-xl text-stone-100 flex items-center gap-2 min-h-[44px]"
              >
                <BookOpen className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Warta Minggu</span>
              </a>
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  navigate('/arsip');
                }}
                className="p-3 bg-white/10 rounded-xl text-stone-100 flex items-center gap-2 text-left min-h-[44px]"
              >
                <Archive className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Arsip Warta</span>
              </button>
              <a
                href="#jadwal-ibadah"
                onClick={() => setMobileMenuOpen(false)}
                className="p-3 bg-white/10 rounded-xl text-stone-100 flex items-center gap-2 min-h-[44px]"
              >
                <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Jadwal Ibadah</span>
              </a>
            </div>

            <div className="pt-2 border-t border-white/10">
              {currentRole !== 'publik' ? (
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    navigate('/admin');
                  }}
                  className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl text-xs flex items-center justify-center gap-2 min-h-[44px]"
                >
                  <ShieldCheck className="w-4 h-4 text-stone-950" />
                  <span>Buka Dasbor ({currentRole})</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    navigate('/login');
                  }}
                  className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl text-xs flex items-center justify-center gap-2 min-h-[44px]"
                >
                  <ShieldCheck className="w-4 h-4 text-stone-950" />
                  <span>Masuk Portal Pengurus</span>
                </button>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Share Toast */}
      {shareToast && (
        <div className="fixed top-20 right-4 z-50 bg-stone-900 text-white px-4 py-2.5 rounded-xl shadow-2xl border border-stone-700 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{shareToast}</span>
        </div>
      )}

      {/* 2. EYE-CATCHING RESPONSIVE 2-COLUMN HERO BANNER */}
      <section id="beranda" className="relative bg-[#0B2545] text-white overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img
            src="/src/assets/images/hkbp_hutaraja_church_1794043812545.jpg"
            alt="Gereja HKBP Ressort Hutaraja"
            className="w-full h-full object-cover object-center scale-105 filter brightness-75"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#07172C]/95 via-[#0B2545]/88 to-[#07172C]/92" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12 md:py-16 lg:py-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 lg:gap-10 items-center">
            {/* Left Column: Main Editorial Headline & Primary Actions */}
            <div className="lg:col-span-7 space-y-4 sm:space-y-5">
              <div className="text-[11px] sm:text-xs font-semibold tracking-widest uppercase text-amber-300">
                Distrik VI Dairi · Ressort Hutaraja · Tahun Transformasi 2024–2028
              </div>

              <h1
                className="text-3xl sm:text-4xl md:text-5xl font-display font-extrabold tracking-tight uppercase leading-[1.12] text-white drop-shadow-sm"
                style={{ textWrap: 'balance' }}
              >
                Warta Jemaat{' '}
                <span className="block text-amber-400 font-light italic mt-1">
                  HKBP Ressort Hutaraja
                </span>
              </h1>

              <p className="text-sm sm:text-base text-stone-200 leading-relaxed font-sans max-w-2xl">
                Informasi resmi liturgi ibadah minggu, warta pengumuman huria (Tingting
                Namarragam), dan laporan transparansi keuangan (Tingting Parhepengon) Huria Kristen
                Batak Protestan Ressort Hutaraja.
              </p>

              {/* Touch-friendly Actions */}
              <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 pt-1">
                {selectedWarta && (
                  <a
                    href="#warta-terkini"
                    className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl text-xs sm:text-sm shadow-xl transition active:scale-[0.98] cursor-pointer min-h-[44px] whitespace-nowrap"
                  >
                    <BookOpen className="w-4 h-4 shrink-0" />
                    <span>Baca Warta Minggu Ini</span>
                  </a>
                )}

                {selectedWarta && (
                  <button
                    type="button"
                    onClick={async () => {
                      if (isExportingPdf) return;
                      setIsExportingPdf(true);
                      try {
                        const fileName = await exportWartaToPdf({
                          data: selectedWarta,
                          pengaturan,
                          jadwalTetap,
                          selectedPage: 'all'
                        });
                        setShareToast(`PDF berhasil diunduh: ${fileName}`);
                        setTimeout(() => setShareToast(null), 3500);
                      } catch (err: any) {
                        setShareToast(err?.message || 'Gagal mengunduh PDF.');
                        setTimeout(() => setShareToast(null), 3500);
                      } finally {
                        setIsExportingPdf(false);
                      }
                    }}
                    disabled={isExportingPdf}
                    className="inline-flex items-center justify-center gap-2 px-4 sm:px-5 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-bold rounded-xl text-xs sm:text-sm shadow-lg transition cursor-pointer min-h-[44px] whitespace-nowrap"
                  >
                    {isExportingPdf ? (
                      <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                    ) : (
                      <Download className="w-4 h-4 shrink-0" />
                    )}
                    <span>{isExportingPdf ? 'Membuat PDF...' : 'Unduh PDF'}</span>
                  </button>
                )}

                {selectedWarta && (
                  <button
                    type="button"
                    onClick={() => navigate(`/warta/${selectedWarta.warta.id}/print`)}
                    className="inline-flex items-center justify-center gap-2 px-4 sm:px-5 py-3 bg-white/10 hover:bg-white/20 backdrop-blur-xs text-white border border-white/25 font-bold rounded-xl text-xs sm:text-sm transition cursor-pointer min-h-[44px] whitespace-nowrap"
                  >
                    <Printer className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>Cetak A4</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => navigate('/arsip')}
                  className="inline-flex items-center justify-center gap-2 px-4 py-3 bg-stone-900/60 hover:bg-stone-900 text-stone-200 hover:text-white rounded-xl text-xs sm:text-sm transition cursor-pointer min-h-[44px] whitespace-nowrap border border-white/10"
                >
                  <Archive className="w-4 h-4 shrink-0" />
                  <span>Koleksi Arsip</span>
                </button>
              </div>
            </div>

            {/* Right Column: Eye-Catching Official Logos & Active Sunday Spotlight Card */}
            <div className="lg:col-span-5">
              <div className="bg-white text-stone-900 rounded-2xl shadow-2xl border border-amber-300/60 p-4 sm:p-6 space-y-4">
                {/* Dual Official Emblem Showcase (Crisp Light Surface for Maximum Legibility) */}
                <div className="flex items-center justify-between gap-3 pb-3.5 border-b border-stone-200">
                  <div className="flex items-center gap-3">
                    <HkbpCrossLogo className="w-12 h-12 sm:w-14 sm:h-14" />
                    <div className="h-10 w-px bg-stone-200" />
                    <HkbpTransformasiLogo className="w-14 h-14 sm:w-[70px] sm:h-[70px]" />
                  </div>
                  <div className="text-right min-w-0">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-[#2E1065]">
                      Transformasi HKBP
                    </div>
                    <div className="text-xs font-semibold text-stone-600">
                      2024–2028 · Roma 12:2
                    </div>
                  </div>
                </div>

                {/* Active Warta Summary */}
                {selectedWarta ? (
                  <div className="space-y-3">
                    <div>
                      <div className="text-[11px] font-semibold text-stone-500 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span>{formatTanggalLengkap(selectedWarta.warta.tanggal_minggu)}</span>
                      </div>
                      <h2 className="text-lg sm:text-xl font-display font-extrabold text-[#0B2545] uppercase tracking-wide mt-0.5 leading-snug">
                        MINGGU {selectedWarta.warta.goar_minggu}
                      </h2>
                      {selectedWarta.warta.topik_minggu && (
                        <p className="text-xs text-stone-600 italic font-serif-body mt-1 line-clamp-2">
                          "{selectedWarta.warta.topik_minggu}"
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                      <div className="bg-stone-50 p-2.5 rounded-xl border border-stone-200/80">
                        <div className="text-[10px] text-stone-500 font-medium">Hadir Minggu Lalu</div>
                        <div className="text-sm font-extrabold text-[#0B2545] font-mono-num">
                          {totalRuasAktif}
                        </div>
                      </div>
                      <div className="bg-stone-50 p-2.5 rounded-xl border border-stone-200/80">
                        <div className="text-[10px] text-stone-500 font-medium">Ulang Tahun</div>
                        <div className="text-sm font-extrabold text-rose-700 font-mono-num">
                          {selectedWarta.ulang_tahun.length}
                        </div>
                      </div>
                      <div className="bg-stone-50 p-2.5 rounded-xl border border-stone-200/80">
                        <div className="text-[10px] text-stone-500 font-medium">Wijk / Lingk</div>
                        <div className="text-sm font-extrabold text-amber-700 font-mono-num">
                          {selectedWarta.warta.tampilkan_partangiangan === false
                            ? 'Libur'
                            : selectedWarta.jadwal_partangiangan.length}
                        </div>
                      </div>
                    </div>

                    <a
                      href="#warta-terkini"
                      className="w-full py-2.5 px-4 bg-[#0B2545] hover:bg-[#123561] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition min-h-[42px]"
                    >
                      <span>Buka Tata Ibadah & Keuangan</span>
                      <ChevronRight className="w-4 h-4 text-amber-400" />
                    </a>
                  </div>
                ) : (
                  <div className="py-4 text-center text-xs text-stone-500">
                    Memuat ringkasan warta minggu ini...
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Operational Strip: Jadwal Ibadah Minggu (Responsive 2-col mobile, 4-col desktop) */}
          <div
            id="jadwal-ibadah"
            className="mt-8 sm:mt-12 pt-6 border-t border-white/15 grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 text-stone-200 text-xs"
          >
            <div className="p-3.5 bg-white/5 rounded-xl border border-white/10 space-y-1">
              <span className="text-amber-400 text-[10px] uppercase font-bold tracking-wider block">
                Sekolah Minggu
              </span>
              <div className="font-bold text-white text-xs sm:text-sm">Pukul 07.00 WIB</div>
              <div className="text-stone-300 text-[11px]">Gedung Sekolah Minggu</div>
            </div>

            <div className="p-3.5 bg-white/5 rounded-xl border border-white/10 space-y-1">
              <span className="text-amber-400 text-[10px] uppercase font-bold tracking-wider block">
                Ibadah Pagi (Sesi 1)
              </span>
              <div className="font-bold text-white text-xs sm:text-sm">Pukul 08.30 WIB</div>
              <div className="text-stone-300 text-[11px]">Gereja Utama HKBP Hutaraja</div>
            </div>

            <div className="p-3.5 bg-white/5 rounded-xl border border-white/10 space-y-1">
              <span className="text-amber-400 text-[10px] uppercase font-bold tracking-wider block">
                Ibadah Siang (Sesi 2)
              </span>
              <div className="font-bold text-white text-xs sm:text-sm">Pukul 10.30 WIB</div>
              <div className="text-stone-300 text-[11px]">Gereja Utama HKBP Hutaraja</div>
            </div>

            <div className="p-3.5 bg-white/5 rounded-xl border border-white/10 space-y-1">
              <span className="text-amber-400 text-[10px] uppercase font-bold tracking-wider block">
                Partangiangan Wijk
              </span>
              <div className="font-bold text-white text-xs sm:text-sm">Rabu & Kamis 20.00</div>
              <div className="text-stone-300 text-[11px]">Di Rumah Ruas Lingkungan</div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. SECTION WARTA JEMAAT MINGGU INI (RESPONSIVE READER) */}
      <section
        id="warta-terkini"
        ref={readerSectionRef}
        className="max-w-7xl mx-auto px-3 sm:px-6 py-7 sm:py-10 w-full space-y-6"
      >
        {isLoading && !selectedWarta ? (
          <div className="text-center py-16 bg-white rounded-3xl border border-stone-200 p-8 space-y-3">
            <div className="animate-spin w-8 h-8 border-4 border-[#0B2545] border-t-amber-500 rounded-full mx-auto" />
            <p className="text-xs font-medium text-stone-600">Memuat warta jemaat resmi...</p>
          </div>
        ) : selectedWarta ? (
          <div className="bg-white rounded-2xl sm:rounded-3xl border border-stone-200 shadow-xl overflow-hidden">
            {/* Header of Active Warta */}
            <div className="bg-[#0B2545] text-white p-4 sm:p-6 md:p-7 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b-2 border-amber-500">
              <div className="space-y-1.5 min-w-0">
                <div className="text-[11px] font-semibold text-amber-300 tracking-wider uppercase">
                  Warta Jemaat Edisi Resmi · HKBP Ressort Hutaraja
                </div>
                <h2
                  className="text-xl sm:text-2xl md:text-3xl font-display font-extrabold text-white uppercase tracking-wide leading-tight"
                  style={{ textWrap: 'balance' }}
                >
                  MINGGU {selectedWarta.warta.goar_minggu}
                </h2>
                <div className="text-xs sm:text-sm font-medium text-stone-300 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>{formatTanggalLengkap(selectedWarta.warta.tanggal_minggu)}</span>
                </div>
                {selectedWarta.warta.topik_minggu && (
                  <p className="text-xs sm:text-sm text-amber-100 italic font-serif-body pt-0.5">
                    "{selectedWarta.warta.topik_minggu}"
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleShare}
                  className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-semibold transition cursor-pointer min-h-[44px]"
                >
                  <Share2 className="w-4 h-4" />
                  <span>Bagikan</span>
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    if (!selectedWarta || isExportingPdf) return;
                    setIsExportingPdf(true);
                    try {
                      const fileName = await exportWartaToPdf({
                        data: selectedWarta,
                        pengaturan,
                        jadwalTetap,
                        selectedPage: 'all'
                      });
                      setShareToast(`PDF berhasil diunduh: ${fileName}`);
                      setTimeout(() => setShareToast(null), 3500);
                    } catch (err: any) {
                      setShareToast(err?.message || 'Gagal mengunduh PDF.');
                      setTimeout(() => setShareToast(null), 3500);
                    } finally {
                      setIsExportingPdf(false);
                    }
                  }}
                  disabled={isExportingPdf}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 text-white font-bold rounded-xl text-xs shadow-md transition cursor-pointer min-h-[44px]"
                >
                  {isExportingPdf ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  <span>{isExportingPdf ? 'Membuat PDF...' : 'Unduh PDF'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => navigate(`/warta/${selectedWarta.warta.id}/print`)}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl text-xs shadow-md transition cursor-pointer min-h-[44px]"
                >
                  <Printer className="w-4 h-4" />
                  <span>Cetak A4</span>
                </button>
              </div>
            </div>

            {/* View Mode Switcher */}
            <div className="p-3 sm:p-4 bg-stone-50 border-b border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="grid grid-cols-2 sm:inline-flex items-center gap-1 p-1 bg-stone-200/80 rounded-xl border border-stone-300/80 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setViewMode('interactive')}
                  className={`flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2 rounded-lg text-xs font-bold transition min-h-[42px] cursor-pointer whitespace-nowrap ${
                    viewMode === 'interactive'
                      ? 'bg-[#0B2545] text-white shadow-xs'
                      : 'text-stone-700 hover:text-stone-950 hover:bg-white/50'
                  }`}
                >
                  <Smartphone className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Mode Mobile</span>
                </button>

                <button
                  type="button"
                  onClick={() => setViewMode('printA4')}
                  className={`flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2 rounded-lg text-xs font-bold transition min-h-[42px] cursor-pointer whitespace-nowrap ${
                    viewMode === 'printA4'
                      ? 'bg-[#0B2545] text-white shadow-xs'
                      : 'text-stone-700 hover:text-stone-950 hover:bg-white/50'
                  }`}
                >
                  <FileText className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Format Cetak A4</span>
                </button>
              </div>

              {/* A4 Page Sub-Tabs (Only visible in A4 print mode) */}
              {viewMode === 'printA4' && (
                <div className="grid grid-cols-4 sm:inline-flex items-center gap-1 bg-stone-200/80 p-1 rounded-xl text-xs w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => setActiveTab('hal1')}
                    className={`px-3 py-2 rounded-lg font-semibold transition cursor-pointer min-h-[38px] ${
                      activeTab === 'hal1'
                        ? 'bg-white text-blue-900 font-bold shadow-xs'
                        : 'text-stone-700 hover:text-stone-900'
                    }`}
                  >
                    Hal 1
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('hal2')}
                    className={`px-3 py-2 rounded-lg font-semibold transition cursor-pointer min-h-[38px] ${
                      activeTab === 'hal2'
                        ? 'bg-white text-blue-900 font-bold shadow-xs'
                        : 'text-stone-700 hover:text-stone-900'
                    }`}
                  >
                    Hal 2
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('hal3')}
                    className={`px-3 py-2 rounded-lg font-semibold transition cursor-pointer min-h-[38px] ${
                      activeTab === 'hal3'
                        ? 'bg-white text-blue-900 font-bold shadow-xs'
                        : 'text-stone-700 hover:text-stone-900'
                    }`}
                  >
                    Hal 3
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('all')}
                    className={`px-3 py-2 rounded-lg font-semibold transition cursor-pointer min-h-[38px] ${
                      activeTab === 'all'
                        ? 'bg-stone-900 text-white font-bold shadow-xs'
                        : 'text-stone-700 hover:text-stone-900'
                    }`}
                  >
                    Semua
                  </button>
                </div>
              )}
            </div>

            {/* Content Container */}
            {viewMode === 'interactive' ? (
              <div className="p-3 sm:p-6 md:p-8 bg-[#F7F5F0]">
                <WartaMobileInteractive
                  data={selectedWarta}
                  pengaturan={pengaturan}
                  jadwalTetap={jadwalTetap}
                />
              </div>
            ) : (
              <div className="p-2.5 sm:p-6 md:p-8 bg-stone-200/70 space-y-2">
                <div className="md:hidden text-center text-[11px] font-medium text-stone-600 bg-white/80 py-1.5 px-3 rounded-lg border border-stone-300">
                  Geser mendatar untuk melihat tata letak penuh kertas A4, atau pilih Mode Mobile untuk pembacaan nyaman di ponsel.
                </div>
                <div className="overflow-x-auto flex justify-start md:justify-center pb-2">
                  <div className="min-w-[794px] max-w-full">
                    <WartaDocument
                      data={selectedWarta}
                      pengaturan={pengaturan}
                      jadwalTetap={jadwalTetap}
                      selectedPage={
                        activeTab === 'hal1'
                          ? '1'
                          : activeTab === 'hal2'
                          ? '2'
                          : activeTab === 'hal3'
                          ? '3'
                          : 'all'
                      }
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-16 bg-white rounded-3xl border border-stone-200 p-8 space-y-3">
            <BookOpen className="w-12 h-12 text-stone-300 mx-auto" />
            <h3 className="text-base font-bold text-stone-800">Belum Ada Warta yang Diterbitkan</h3>
            <p className="text-xs text-stone-500 max-w-md mx-auto">
              Silakan login ke portal pengurus gereja untuk menyusun dan mempublikasikan warta jemaat mingguan.
            </p>
          </div>
        )}
      </section>

      {/* 4. SECTION ARSIP CEPAT & DAFTAR EDISI LAIN */}
      <section className="bg-stone-200/60 py-10 sm:py-12 border-t border-stone-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-xs font-semibold text-blue-900">
                Koleksi Warta Mingguan · Arsip Digital
              </div>
              <h3 className="text-xl sm:text-2xl font-display font-bold text-stone-900 mt-1">
                Edisi Warta Jemaat Sebelumnya
              </h3>
              <p className="text-xs text-stone-600">
                Akses kembali arsip liturgi dan laporan keuangan minggu-minggu sebelumnya.
              </p>
            </div>

            <button
              type="button"
              onClick={() => navigate('/arsip')}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold transition cursor-pointer min-h-[44px]"
            >
              <span>Buka Seluruh Arsip</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {wartasList.slice(0, 3).map((w) => (
              <button
                type="button"
                key={w.id}
                onClick={() => handleSelectWarta(w.id)}
                className="text-left bg-white p-5 rounded-2xl border border-stone-300 hover:border-blue-600 hover:shadow-md transition cursor-pointer space-y-2.5 group flex flex-col justify-between"
              >
                <div className="space-y-2 w-full">
                  <div className="flex items-center justify-between gap-2 text-xs text-stone-500">
                    <span className="font-bold text-blue-900 uppercase">
                      MINGGU {w.goar_minggu}
                    </span>
                    <span className="font-mono-num">{formatTanggalIndo(w.tanggal_minggu)}</span>
                  </div>
                  <h4 className="font-bold text-stone-900 text-sm group-hover:text-blue-900 transition line-clamp-1">
                    {w.topik_minggu || `Warta Jemaat Minggu ${w.goar_minggu}`}
                  </h4>
                  {w.ayat_teks && (
                    <p className="text-xs text-stone-600 italic font-serif-body line-clamp-2">
                      "{w.ayat_teks}"
                    </p>
                  )}
                </div>
                <div className="pt-2.5 border-t border-stone-100 flex items-center justify-between text-xs text-blue-700 font-semibold w-full">
                  <span>Buka Warta Ini</span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition" />
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* 5. FOOTER */}
      <footer className="bg-[#071A2F] text-stone-300 py-8 sm:py-10 border-t border-amber-500/20 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
          <div className="flex flex-col sm:flex-row items-center gap-3.5">
            <div className="inline-flex items-center gap-2.5 bg-white rounded-xl px-2.5 py-1.5 shadow-sm shrink-0">
              <HkbpCrossLogo className="w-9 h-9" />
              <div className="h-6 w-px bg-stone-200" />
              <HkbpTransformasiLogo className="w-10 h-10" />
            </div>
            <div>
              <div className="font-bold text-white uppercase text-sm">
                HKBP Ressort Hutaraja · Distrik VI Dairi
              </div>
              <div className="text-stone-400 text-[11px] mt-0.5">
                Jl. Persada No. 205 Desa Hutarakyat, Kec. Sidikalang, Kab. Dairi, Sumatera Utara
              </div>
            </div>
          </div>

          <div className="text-[11px] text-stone-400">
            © {new Date().getFullYear()} Warta Jemaat HKBP Ressort Hutaraja. Dokumen Digital Resmi &
            Akuntabel.
          </div>
        </div>
      </footer>

      {/* 6. MOBILE FLOATING BOTTOM NAVIGATION BAR (Thumb Zone Pattern <= 15% cap with top bar) */}
      <nav
        aria-label="Navigasi Cepat Mobile"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-stone-200 py-1 px-2 flex items-center justify-around shadow-2xl"
      >
        <button
          type="button"
          onClick={() => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className="flex flex-col items-center justify-center min-w-[56px] min-h-[44px] text-stone-600 hover:text-[#0B2545] text-[10px] font-semibold cursor-pointer active:scale-95 transition"
        >
          <Home className="w-4 h-4 text-stone-700 mb-0.5" />
          <span>Beranda</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setViewMode('interactive');
            readerSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
          }}
          className="flex flex-col items-center justify-center min-w-[56px] min-h-[44px] text-blue-900 font-bold text-[10px] cursor-pointer active:scale-95 transition"
        >
          <BookOpen className="w-4 h-4 text-blue-800 mb-0.5" />
          <span>Warta</span>
        </button>

        <button
          type="button"
          onClick={() => navigate('/arsip')}
          className="flex flex-col items-center justify-center min-w-[56px] min-h-[44px] text-stone-600 hover:text-[#0B2545] text-[10px] font-semibold cursor-pointer active:scale-95 transition"
        >
          <Archive className="w-4 h-4 text-amber-600 mb-0.5" />
          <span>Arsip</span>
        </button>

        {selectedWarta && (
          <button
            type="button"
            disabled={isExportingPdf}
            onClick={async () => {
              if (isExportingPdf) return;
              setIsExportingPdf(true);
              try {
                const fileName = await exportWartaToPdf({
                  data: selectedWarta,
                  pengaturan,
                  jadwalTetap,
                  selectedPage: 'all'
                });
                setShareToast(`PDF berhasil diunduh: ${fileName}`);
                setTimeout(() => setShareToast(null), 3500);
              } catch (err: any) {
                setShareToast(err?.message || 'Gagal mengunduh PDF.');
                setTimeout(() => setShareToast(null), 3500);
              } finally {
                setIsExportingPdf(false);
              }
            }}
            className="flex flex-col items-center justify-center min-w-[56px] min-h-[44px] text-emerald-800 text-[10px] font-bold cursor-pointer active:scale-95 transition disabled:opacity-60"
          >
            {isExportingPdf ? (
              <Loader2 className="w-4 h-4 text-emerald-700 mb-0.5 animate-spin" />
            ) : (
              <Download className="w-4 h-4 text-emerald-700 mb-0.5" />
            )}
            <span>{isExportingPdf ? 'Proses...' : 'Unduh PDF'}</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => navigate(currentRole !== 'publik' ? '/admin' : '/login')}
          className="flex flex-col items-center justify-center min-w-[56px] min-h-[44px] text-stone-600 hover:text-[#0B2545] text-[10px] font-semibold cursor-pointer active:scale-95 transition"
        >
          <ShieldCheck className="w-4 h-4 text-[#0B2545] mb-0.5" />
          <span>{currentRole !== 'publik' ? 'Admin' : 'Login'}</span>
        </button>
      </nav>
    </div>
  );
};
