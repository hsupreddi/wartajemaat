import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { FullWartaData, WartaRecord, PengaturanHuria, JadwalTetapItem } from '../types';
import { getAllWartas, getWartaById, getPengaturan, getJadwalTetap } from '../lib/wartaStorage';
import { WartaDocument } from '../components/warta/WartaDocument';
import { WartaMobileInteractive } from '../components/warta/WartaMobileInteractive';
import { HkbpCrossLogo } from '../components/logos/HkbpCrossLogo';
import {
  Printer,
  Calendar,
  BookOpen,
  DollarSign,
  Sparkles,
  Archive,
  Search,
  ExternalLink,
  ShieldCheck,
  Share2,
  FileText,
  Clock,
  MapPin,
  ChevronRight,
  Sun,
  Users,
  HeartHandshake,
  CheckCircle2,
  Eye,
  Smartphone,
  Menu,
  X,
  Home,
  ZoomIn,
  ZoomOut
} from 'lucide-react';
import { formatTanggalIndo, formatTanggalLengkap } from '../lib/dateUtils';
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
  const [shareToast, setShareToast] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    Promise.all([getAllWartas(true), getPengaturan(), getJadwalTetap()]).then(
      async ([published, setts, jadwals]) => {
        setWartasList(published);
        setPengaturan(setts);
        setJadwalTetap(jadwals);

        const wartaIdParam = searchParams.get('id');
        const targetId = wartaIdParam || published[0]?.id;

        if (targetId) {
          const full = await getWartaById(targetId);
          setSelectedWarta(full);
        }
        setIsLoading(false);
      }
    );
  }, []);

  const handleSelectWarta = async (id: string) => {
    setIsLoading(true);
    setSearchParams({ id });
    const full = await getWartaById(id);
    setSelectedWarta(full);
    setIsLoading(false);
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

  return (
    <div className="min-h-screen bg-[#F8F6F0] text-stone-900 flex flex-col justify-between selection:bg-amber-800 selection:text-white pb-16 lg:pb-0">
      {/* 1. MODERN TOP NAVIGATION BAR */}
      <header className="sticky top-0 z-40 bg-[#0B2545]/95 backdrop-blur-md text-white shadow-lg border-b border-amber-500/20 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Brand */}
          <div
            onClick={() => navigate('/')}
            className="flex items-center gap-3 cursor-pointer group shrink-0"
          >
            <div className="shrink-0 transition transform group-hover:scale-105">
              <HkbpCrossLogo size={38} className="w-9 h-9 sm:w-10 sm:h-10" />
            </div>
            <div>
              <div className="text-[9px] sm:text-[10px] uppercase tracking-widest text-amber-400 font-bold">
                DISTRIK VI DAIRI · RESSORT HUTARAJA
              </div>
              <h1 className="text-sm sm:text-base font-display font-bold tracking-wide uppercase text-white leading-tight">
                HKBP Ressort Hutaraja
              </h1>
            </div>
          </div>

          {/* Desktop Nav Links */}
          <nav className="hidden lg:flex items-center gap-6 text-xs font-semibold text-stone-200">
            <a href="#beranda" className="hover:text-amber-300 transition">
              Beranda
            </a>
            <a href="#warta-terkini" className="hover:text-amber-300 transition">
              Warta Minggu Ini
            </a>
            <button
              onClick={() => navigate('/arsip')}
              className="hover:text-amber-300 transition flex items-center gap-1 cursor-pointer"
            >
              <Archive className="w-3.5 h-3.5" /> Arsip Warta
            </button>
            <a href="#jadwal-ibadah" className="hover:text-amber-300 transition">
              Jadwal Ibadah
            </a>
          </nav>

          {/* Action Buttons: Desktop & Mobile Hamburger */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/arsip')}
              className="hidden sm:inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-amber-300 hover:text-white hover:bg-white/10 transition border border-amber-500/30 cursor-pointer min-h-[38px]"
            >
              <Archive className="w-3.5 h-3.5" /> Arsip
            </button>

            {currentRole !== 'publik' ? (
              <button
                onClick={() => navigate('/admin')}
                className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-lg text-xs shadow-md transition cursor-pointer min-h-[38px]"
              >
                <ShieldCheck className="w-4 h-4 text-stone-950" />
                <span>Dashboard ({currentRole})</span>
              </button>
            ) : (
              <button
                onClick={() => navigate('/login')}
                className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-800 hover:bg-blue-700 text-white font-semibold rounded-lg text-xs shadow-md transition border border-blue-600/50 cursor-pointer min-h-[38px]"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                <span>Masuk Pengurus</span>
              </button>
            )}

            {/* Mobile Menu Trigger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Buka Menu"
              className="lg:hidden p-2 rounded-lg text-stone-200 hover:text-white hover:bg-white/10 min-w-[44px] min-h-[44px] flex items-center justify-center cursor-pointer"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden mt-3 pt-3 border-t border-white/10 space-y-2 animate-in fade-in">
            <div className="grid grid-cols-2 gap-2 text-xs font-semibold">
              <a
                href="#beranda"
                onClick={() => setMobileMenuOpen(false)}
                className="p-2.5 bg-white/10 rounded-lg text-stone-100 flex items-center gap-2"
              >
                <Home className="w-4 h-4 text-amber-400" /> Beranda
              </a>
              <a
                href="#warta-terkini"
                onClick={() => setMobileMenuOpen(false)}
                className="p-2.5 bg-white/10 rounded-lg text-stone-100 flex items-center gap-2"
              >
                <BookOpen className="w-4 h-4 text-amber-400" /> Warta Terkini
              </a>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  navigate('/arsip');
                }}
                className="p-2.5 bg-white/10 rounded-lg text-stone-100 flex items-center gap-2 text-left"
              >
                <Archive className="w-4 h-4 text-amber-400" /> Arsip Lengkap
              </button>
              <a
                href="#jadwal-ibadah"
                onClick={() => setMobileMenuOpen(false)}
                className="p-2.5 bg-white/10 rounded-lg text-stone-100 flex items-center gap-2"
              >
                <Clock className="w-4 h-4 text-amber-400" /> Jadwal Ibadah
              </a>
            </div>

            <div className="pt-2 border-t border-white/10 flex items-center justify-between">
              {currentRole !== 'publik' ? (
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    navigate('/admin');
                  }}
                  className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-lg text-xs flex items-center justify-center gap-2"
                >
                  <ShieldCheck className="w-4 h-4 text-stone-950" />
                  <span>Buka Dasbor ({currentRole})</span>
                </button>
              ) : (
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    navigate('/login');
                  }}
                  className="w-full py-2.5 bg-blue-800 hover:bg-blue-700 text-white font-bold rounded-lg text-xs flex items-center justify-center gap-2"
                >
                  <ShieldCheck className="w-4 h-4 text-amber-400" />
                  <span>Masuk Portal Pengurus</span>
                </button>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Share Toast */}
      {shareToast && (
        <div className="fixed top-20 right-4 z-50 bg-stone-900 text-white px-4 py-2.5 rounded-xl shadow-2xl border border-stone-700 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{shareToast}</span>
        </div>
      )}

      {/* 2. GRAND HERO BANNER - MODERN CHURCH ARCHITECTURE */}
      <section id="beranda" className="relative bg-[#0B2545] text-white overflow-hidden">
        {/* Architectural church photo backdrop */}
        <div className="absolute inset-0 z-0">
          <img
            src="/src/assets/images/hkbp_hutaraja_church_1794043812545.jpg"
            alt="Gereja HKBP Ressort Hutaraja"
            className="w-full h-full object-cover object-center scale-105 filter brightness-75"
            referrerPolicy="no-referrer"
          />
          {/* Measured multi-stop gradient scrim */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#0B2545]/95 via-[#0B2545]/85 to-[#0B2545]/90" />
          <div className="absolute inset-0 bg-radial at-center from-transparent via-transparent to-[#07172C]/60" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 py-10 sm:py-16 md:py-20 lg:py-24">
          <div className="max-w-3xl space-y-4 sm:space-y-5">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-400/20 backdrop-blur-xs border border-amber-400/30 rounded-full text-xs font-bold text-amber-300">
              <Sun className="w-3.5 h-3.5" />
              <span>Sistem Warta Digital & Transparansi Huria</span>
            </div>

            <h1 className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-display font-extrabold tracking-tight uppercase leading-tight text-white drop-shadow-sm">
              Warta Jemaat <br />
              <span className="text-amber-400 font-light italic">HKBP Ressort Hutaraja</span>
            </h1>

            <p className="text-xs sm:text-sm md:text-base text-stone-200 leading-relaxed font-sans max-w-2xl font-normal">
              Informasi resmi liturgi ibadah minggu, warta pengumuman huria (*Tingting Namarragam*), dan akuntabilitas keuangan (*Tingting Parhepengon*) Huria Kristen Batak Protestan Ressort Hutaraja, Distrik VI Dairi.
            </p>

            {/* Quick Actions (Mobile Touch Friendly >= 44px) */}
            <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 pt-2">
              {selectedWarta && (
                <a
                  href="#warta-terkini"
                  className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl text-xs sm:text-sm shadow-xl transition transform active:scale-95 cursor-pointer min-h-[44px]"
                >
                  <BookOpen className="w-4 h-4" />
                  <span>Baca Warta Minggu Ini</span>
                </a>
              )}

              {selectedWarta && (
                <button
                  onClick={() => navigate(`/warta/${selectedWarta.warta.id}/print`)}
                  className="inline-flex items-center justify-center gap-2 px-4 sm:px-5 py-3 bg-white/10 hover:bg-white/20 backdrop-blur-xs text-white border border-white/20 font-bold rounded-xl text-xs sm:text-sm transition cursor-pointer min-h-[44px]"
                >
                  <Printer className="w-4 h-4 text-amber-400" />
                  <span>Cetak / PDF A4</span>
                </button>
              )}

              <button
                onClick={() => navigate('/arsip')}
                className="inline-flex items-center justify-center gap-2 px-4 py-3 bg-stone-900/60 hover:bg-stone-900 text-stone-300 hover:text-white rounded-xl text-xs sm:text-sm transition cursor-pointer min-h-[44px]"
              >
                <Archive className="w-4 h-4" />
                <span>Koleksi Arsip</span>
              </button>
            </div>
          </div>

          {/* Operational Strip: Jadwal Ibadah Minggu */}
          <div id="jadwal-ibadah" className="mt-8 sm:mt-12 md:mt-14 pt-6 border-t border-white/15 grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 text-stone-200 text-xs">
            <div className="p-3 bg-white/5 rounded-xl border border-white/10 space-y-1">
              <span className="text-amber-400 text-[10px] uppercase font-bold tracking-wider block">
                Sekolah Minggu
              </span>
              <div className="font-bold text-white text-xs sm:text-sm">Pukul 07.00 WIB</div>
              <div className="text-stone-300 text-[10px] sm:text-[11px]">Gedung Sekolah Minggu</div>
            </div>

            <div className="p-3 bg-white/5 rounded-xl border border-white/10 space-y-1">
              <span className="text-amber-400 text-[10px] uppercase font-bold tracking-wider block">
                Ibadah Pagi (Sesi 1)
              </span>
              <div className="font-bold text-white text-xs sm:text-sm">Pukul 08.30 WIB</div>
              <div className="text-stone-300 text-[10px] sm:text-[11px]">Gereja Utama HKBP Hutaraja</div>
            </div>

            <div className="p-3 bg-white/5 rounded-xl border border-white/10 space-y-1">
              <span className="text-amber-400 text-[10px] uppercase font-bold tracking-wider block">
                Ibadah Siang (Sesi 2)
              </span>
              <div className="font-bold text-white text-xs sm:text-sm">Pukul 10.30 WIB</div>
              <div className="text-stone-300 text-[10px] sm:text-[11px]">Gereja Utama HKBP Hutaraja</div>
            </div>

            <div className="p-3 bg-white/5 rounded-xl border border-white/10 space-y-1">
              <span className="text-amber-400 text-[10px] uppercase font-bold tracking-wider block">
                Partangiangan Wijk
              </span>
              <div className="font-bold text-white text-xs sm:text-sm">Rabu & Kamis 20.00 WIB</div>
              <div className="text-stone-300 text-[10px] sm:text-[11px]">Di Rumah Ruas Lingkungan</div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. SECTION WARTA JEMAAT MINGGU INI (RESPONSIVE READER) */}
      <section id="warta-terkini" ref={readerSectionRef} className="max-w-7xl mx-auto px-3 sm:px-4 py-8 sm:py-10 w-full space-y-6">
        {selectedWarta ? (
          <div className="bg-white rounded-3xl border border-stone-200 shadow-xl overflow-hidden">
            {/* Header of Active Warta */}
            <div className="bg-[#0B2545] text-white p-4 sm:p-6 md:p-7 flex flex-wrap items-center justify-between gap-4 border-b-2 border-amber-500">
              <div className="space-y-1 min-w-0">
                <div className="inline-flex items-center gap-2 px-2.5 py-0.5 bg-amber-400/20 text-amber-300 rounded text-[10px] sm:text-[11px] font-bold uppercase tracking-wider">
                  <span>Warta Jemaat Edisi Resmi</span>
                  <span>·</span>
                  <span>HKBP Ressort Hutaraja</span>
                </div>
                <h2 className="text-xl sm:text-2xl md:text-3xl font-display font-extrabold text-white uppercase tracking-wide truncate">
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
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handleShare}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-semibold transition cursor-pointer min-h-[40px]"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Bagikan</span>
                </button>

                <button
                  onClick={() => navigate(`/warta/${selectedWarta.warta.id}/print`)}
                  className="inline-flex items-center gap-1.5 px-3.5 sm:px-4 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl text-xs shadow-md transition cursor-pointer min-h-[40px]"
                >
                  <Printer className="w-4 h-4" />
                  <span>Cetak / PDF A4</span>
                </button>
              </div>
            </div>

            {/* View Mode Switcher Pill */}
            <div className="p-3 sm:p-4 bg-stone-50 border-b border-stone-200 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-1 p-1 bg-stone-200/80 rounded-xl border border-stone-300/80">
                <button
                  onClick={() => setViewMode('interactive')}
                  className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs font-bold transition min-h-[40px] cursor-pointer ${
                    viewMode === 'interactive'
                      ? 'bg-[#0B2545] text-white shadow-xs'
                      : 'text-stone-700 hover:text-stone-950 hover:bg-white/50'
                  }`}
                >
                  <Smartphone className="w-4 h-4 text-amber-400" />
                  <span>Mode Interaktif Mobile</span>
                </button>

                <button
                  onClick={() => setViewMode('printA4')}
                  className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs font-bold transition min-h-[40px] cursor-pointer ${
                    viewMode === 'printA4'
                      ? 'bg-[#0B2545] text-white shadow-xs'
                      : 'text-stone-700 hover:text-stone-950 hover:bg-white/50'
                  }`}
                >
                  <FileText className="w-4 h-4 text-amber-400" />
                  <span>Format Cetak A4 Asli</span>
                </button>
              </div>

              {/* A4 Page Sub-Tabs (Only visible in A4 print mode) */}
              {viewMode === 'printA4' && (
                <div className="flex items-center gap-1 bg-stone-200/80 p-1 rounded-xl text-xs overflow-x-auto">
                  <button
                    onClick={() => setActiveTab('hal1')}
                    className={`px-2.5 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
                      activeTab === 'hal1'
                        ? 'bg-white text-blue-900 font-bold shadow-xs'
                        : 'text-stone-700 hover:text-stone-900'
                    }`}
                  >
                    Hal 1
                  </button>
                  <button
                    onClick={() => setActiveTab('hal2')}
                    className={`px-2.5 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
                      activeTab === 'hal2'
                        ? 'bg-white text-blue-900 font-bold shadow-xs'
                        : 'text-stone-700 hover:text-stone-900'
                    }`}
                  >
                    Hal 2
                  </button>
                  <button
                    onClick={() => setActiveTab('hal3')}
                    className={`px-2.5 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
                      activeTab === 'hal3'
                        ? 'bg-white text-blue-900 font-bold shadow-xs'
                        : 'text-stone-700 hover:text-stone-900'
                    }`}
                  >
                    Hal 3
                  </button>
                  <button
                    onClick={() => setActiveTab('all')}
                    className={`px-2.5 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
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
              /* MODERN MOBILE-FIRST INTERACTIVE CARDS */
              <div className="p-3 sm:p-6 md:p-8 bg-[#F7F5F0]">
                <WartaMobileInteractive
                  data={selectedWarta}
                  pengaturan={pengaturan}
                  jadwalTetap={jadwalTetap}
                />
              </div>
            ) : (
              /* AUTHENTIC 1:1 A4 PRINT VIEW WITH HORIZONTAL SCROLL SAFEGUARD */
              <div className="p-3 sm:p-6 md:p-8 bg-stone-200/70 overflow-x-auto flex justify-center">
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
      <section className="bg-stone-200/60 py-12 border-t border-stone-300">
        <div className="max-w-7xl mx-auto px-4 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-900 bg-blue-100 px-2.5 py-0.5 rounded-full">
                <Archive className="w-3.5 h-3.5" />
                <span>Koleksi Warta Mingguan</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-display font-bold text-stone-900 mt-1">
                Edisi Warta Jemaat Sebelumnya
              </h3>
              <p className="text-xs text-stone-600">
                Akses kembali arsip liturgi dan laporan keuangan minggu-minggu sebelumnya.
              </p>
            </div>

            <button
              onClick={() => navigate('/arsip')}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold transition cursor-pointer min-h-[44px]"
            >
              <span>Buka Seluruh Arsip</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {wartasList.slice(0, 3).map((w) => (
              <div
                key={w.id}
                onClick={() => handleSelectWarta(w.id)}
                className="bg-white p-5 rounded-2xl border border-stone-300 hover:border-blue-600 hover:shadow-md transition cursor-pointer space-y-2.5 group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-blue-900 uppercase">
                    MINGGU {w.goar_minggu}
                  </span>
                  <span className="text-[10px] text-stone-500 font-mono-num">
                    {formatTanggalIndo(w.tanggal_minggu)}
                  </span>
                </div>
                <h4 className="font-bold text-stone-900 text-sm group-hover:text-blue-900 transition line-clamp-1">
                  {w.topik_minggu || `Warta Jemaat Minggu ${w.goar_minggu}`}
                </h4>
                {w.ayat_teks && (
                  <p className="text-xs text-stone-600 italic font-serif-body line-clamp-2">
                    "{w.ayat_teks}"
                  </p>
                )}
                <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-xs text-blue-700 font-semibold">
                  <span>Buka Warta Ini</span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. FOOTER */}
      <footer className="bg-[#071A2F] text-stone-300 py-10 border-t border-amber-500/20 text-xs">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
          <div className="flex items-center gap-3">
            <HkbpCrossLogo size={36} />
            <div>
              <div className="font-bold text-white uppercase text-sm">
                HKBP Ressort Hutaraja · Distrik VI Dairi
              </div>
              <div className="text-stone-400 text-[11px]">
                Jl. Persada No. 205 Desa Hutarakyat, Kec. Sidikalang, Kab. Dairi, Sumatera Utara
              </div>
            </div>
          </div>

          <div className="text-[11px] text-stone-400">
            © {new Date().getFullYear()} Warta Jemaat HKBP Ressort Hutaraja. Dokumen Digital Resmi & Akuntabel.
          </div>
        </div>
      </footer>

      {/* 6. MOBILE FLOATING BOTTOM NAVIGATION BAR (Thumb Zone Pattern) */}
      <nav
        aria-label="Navigasi Cepat Mobile"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-stone-200 py-1 px-2 flex items-center justify-around shadow-2xl safe-area-bottom"
      >
        <button
          onClick={() => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className="flex flex-col items-center justify-center min-w-[56px] min-h-[44px] text-stone-600 hover:text-[#0B2545] text-[10px] font-semibold cursor-pointer active:scale-95 transition"
        >
          <Home className="w-4 h-4 text-stone-700 mb-0.5" />
          <span>Beranda</span>
        </button>

        <button
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
          onClick={() => navigate('/arsip')}
          className="flex flex-col items-center justify-center min-w-[56px] min-h-[44px] text-stone-600 hover:text-[#0B2545] text-[10px] font-semibold cursor-pointer active:scale-95 transition"
        >
          <Archive className="w-4 h-4 text-amber-600 mb-0.5" />
          <span>Arsip</span>
        </button>

        {selectedWarta && (
          <button
            onClick={() => navigate(`/warta/${selectedWarta.warta.id}/print`)}
            className="flex flex-col items-center justify-center min-w-[56px] min-h-[44px] text-emerald-800 text-[10px] font-bold cursor-pointer active:scale-95 transition"
          >
            <Printer className="w-4 h-4 text-emerald-700 mb-0.5" />
            <span>Cetak A4</span>
          </button>
        )}

        <button
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
