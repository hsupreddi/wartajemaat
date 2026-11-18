import React, { useState } from 'react';
import {
  Search,
  BookOpen,
  Calendar,
  Megaphone,
  DollarSign,
  Cake,
  Archive,
  Download,
  Loader2,
  Share2,
  MessageCircle,
  Clock,
  MapPin,
  Music,
  ChevronRight,
  X,
  Building
} from 'lucide-react';
import churchHeroImg from '../../assets/images/hkbp_hutaraja_church_1794043812545.jpg';
import { FullWartaData, JadwalTetapItem, PengaturanHuria, UserRole, WartaRecord } from '../../types';
import { formatTanggalIndo, formatTanggalLengkap } from '../../lib/dateUtils';
import { OFFICIAL_HKBP_MINGGU_LITURGI } from '../../lib/masterMingguData';
import { HkbpCrossLogo } from '../logos/HkbpCrossLogo';
import { HkbpTransformasiLogo } from '../logos/HkbpTransformasiLogo';
import { MobileBottomNav } from './MobileBottomNav';
import { MobileWartaReader } from './MobileWartaReader';
import { PWAInstallButton, OfflineIndicator } from './PWAInstallButton';
import {
  MobilePortalView,
  MobileReaderSection,
  buildWartaShareMessage,
  buildWartaShareUrl,
  buildWhatsAppShareUrl,
  executeWebShare
} from '../../lib/shareUtils';

interface MobilePublicPortalProps {
  wartasList: WartaRecord[];
  selectedWarta: FullWartaData | null;
  pengaturan?: PengaturanHuria;
  jadwalTetap: JadwalTetapItem[];
  isLoading: boolean;
  isExportingPdf: boolean;
  activeView: MobilePortalView;
  activeReaderSection: MobileReaderSection;
  currentRole: UserRole;
  onChangeView: (view: MobilePortalView, section?: MobileReaderSection) => void;
  onChangeReaderSection: (section: MobileReaderSection) => void;
  onSelectWarta: (id: string, openReader?: boolean) => void;
  onDownloadPdf: () => void;
  onOpenPrintA4: (wartaId: string) => void;
  onOpenArchive: () => void;
  onOpenAdminOrLogin: () => void;
  onNotify: (message: string) => void;
}

export const MobilePublicPortal: React.FC<MobilePublicPortalProps> = ({
  wartasList,
  selectedWarta,
  pengaturan,
  jadwalTetap,
  isLoading,
  isExportingPdf,
  activeView,
  activeReaderSection,
  currentRole,
  onChangeView,
  onChangeReaderSection,
  onSelectWarta,
  onDownloadPdf,
  onOpenPrintA4,
  onOpenArchive,
  onOpenAdminOrLogin,
  onNotify
}) => {
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [pengumumanQuery, setPengumumanQuery] = useState('');

  const handleShareActiveWarta = async (viaWhatsApp = false) => {
    if (!selectedWarta) return;
    const url = buildWartaShareUrl({
      wartaId: selectedWarta.warta.id,
      view: activeView === 'beranda' ? 'baca' : activeView,
      sec: activeView === 'baca' ? activeReaderSection : undefined
    });
    const text = buildWartaShareMessage({
      warta: selectedWarta.warta,
      pengaturan,
      url
    });
    if (viaWhatsApp) {
      window.location.href = buildWhatsAppShareUrl(text);
      return;
    }
    const res = await executeWebShare({
      title: `Warta Jemaat Minggu ${selectedWarta.warta.goar_minggu}`,
      text,
      url
    });
    if (res === 'copied') {
      onNotify('Tautan warta berhasil disalin.');
    }
  };

  const handleShareAnnouncement = async (judul: string, isi: string, viaWa = false) => {
    if (!selectedWarta) return;
    const url = buildWartaShareUrl({
      wartaId: selectedWarta.warta.id,
      view: 'baca',
      sec: 'warta'
    });
    const text = buildWartaShareMessage({
      warta: selectedWarta.warta,
      pengaturan,
      url,
      highlightTitle: judul,
      highlightBody: isi
    });
    if (viaWa) {
      window.location.href = buildWhatsAppShareUrl(text);
      return;
    }
    const res = await executeWebShare({ title: judul, text, url });
    if (res === 'copied') {
      onNotify(`Pengumuman "${judul}" disalin.`);
    }
  };

  const cleanGoar = (selectedWarta?.warta.goar_minggu || '').trim().toUpperCase();
  const infoLiturgi = OFFICIAL_HKBP_MINGGU_LITURGI.find(
    (m) =>
      m.nama_minggu.toUpperCase() === cleanGoar ||
      `MINGGU ${m.nama_minggu.toUpperCase()}` === cleanGoar
  );

  const totalRuasAktif = selectedWarta
    ? (selectedWarta.warta.ruas_sm || 0) +
      (selectedWarta.warta.ruas_pagi || 0) +
      (selectedWarta.warta.ruas_siang || 0)
    : 0;

  // Compute search results across active warta + archive
  const q = searchQuery.trim().toLowerCase();
  const matchedAnnouncements = q && selectedWarta
    ? selectedWarta.pengumuman.filter(
        (p) => p.judul.toLowerCase().includes(q) || p.isi.toLowerCase().includes(q)
      )
    : [];
  const matchedBirthdays = q && selectedWarta
    ? selectedWarta.ulang_tahun.filter(
        (u) => u.nama.toLowerCase().includes(q) || u.wijk.toLowerCase().includes(q)
      )
    : [];
  const matchedWartas = q
    ? wartasList.filter(
        (w) =>
          w.goar_minggu.toLowerCase().includes(q) ||
          (w.topik_minggu || '').toLowerCase().includes(q) ||
          w.tanggal_minggu.includes(q)
      )
    : [];

  return (
    <div className="lg:hidden min-h-screen bg-[#F7F5F0] text-stone-900 pb-24">
      {/* Compact Mobile Top App Bar (52px) */}
      <header className="sticky top-0 z-40 h-[52px] bg-[#0B2545]/95 backdrop-blur-md text-white border-b border-amber-500/20 px-3 flex items-center justify-between gap-2 pt-safe">
        <button
          type="button"
          onClick={() => {
            onChangeView('beranda');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className="flex items-center gap-2.5 min-w-0 text-left cursor-pointer"
        >
          <HkbpCrossLogo className="w-8 h-8 shrink-0" />
          <div className="min-w-0">
            <div className="text-xs font-display font-bold tracking-wide uppercase text-white truncate">
              E-Warta HKBP Hutaraja
            </div>
            <div className="text-[10px] text-amber-200/90 truncate">
              Distrik VI Dairi · Ressort Hutaraja
            </div>
          </div>
        </button>

        <div className="flex items-center gap-1 shrink-0">
          <PWAInstallButton
            variant="header"
            onInstalled={() => onNotify('Aplikasi E-Warta HKBP berhasil dipasang di HP.')}
          />
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            aria-label="Cari Warta atau Pengumuman"
            className="min-w-[44px] min-h-[44px] rounded-xl text-stone-200 hover:text-white hover:bg-white/10 flex items-center justify-center cursor-pointer"
          >
            <Search className="w-5 h-5" />
          </button>

          {selectedWarta && (
            <button
              type="button"
              disabled={isExportingPdf}
              onClick={onDownloadPdf}
              aria-label="Unduh PDF Warta"
              className="min-w-[44px] min-h-[44px] rounded-xl text-emerald-300 hover:bg-white/10 flex items-center justify-center cursor-pointer disabled:opacity-50"
            >
              {isExportingPdf ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Download className="w-5 h-5" />
              )}
            </button>
          )}
        </div>
      </header>

      {/* ========================================================= */}
      {/* VIEW 1: MOBILE BERANDA (HOMEPAGE) */}
      {/* ========================================================= */}
      {activeView === 'beranda' && (
        <main className="max-w-3xl mx-auto px-3.5 sm:px-6 pt-4 space-y-6">
          {/* HERO SECTION */}
          <section className="relative rounded-3xl overflow-hidden bg-[#0B2545] text-white shadow-xl border border-amber-500/25">
            <img
              src={churchHeroImg}
              alt="Gereja HKBP Ressort Hutaraja"
              className="absolute inset-0 w-full h-full object-cover object-center opacity-35"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-[#07172C]/75 via-[#0B2545]/88 to-[#07172C]/96" />

            <div className="relative z-10 p-5 sm:p-6 space-y-4">
              {/* Dual Logo + Label */}
              <div className="flex items-center justify-between gap-2">
                <div className="inline-flex items-center gap-2 bg-white/95 rounded-xl px-2.5 py-1 shadow-xs">
                  <HkbpCrossLogo className="w-7 h-7" />
                  <div className="h-5 w-px bg-stone-200" />
                  <HkbpTransformasiLogo className="w-8 h-8" />
                </div>
                <span className="text-[11px] font-semibold text-amber-300 uppercase tracking-wider">
                  Edisi Terbaru
                </span>
              </div>

              {isLoading && !selectedWarta ? (
                <div className="py-8 flex flex-col items-center gap-2 text-xs text-stone-300">
                  <Loader2 className="w-7 h-7 animate-spin text-amber-400" />
                  <span>Memuat warta jemaat resmi...</span>
                </div>
              ) : selectedWarta ? (
                <>
                  <div className="space-y-1">
                    <div className="text-xs text-stone-300 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>{formatTanggalLengkap(selectedWarta.warta.tanggal_minggu)}</span>
                    </div>
                    <h1
                      className="text-2xl sm:text-3xl font-display font-extrabold uppercase tracking-wide text-white leading-tight"
                      style={{ textWrap: 'balance' }}
                    >
                      MINGGU {selectedWarta.warta.goar_minggu}
                    </h1>
                    {infoLiturgi?.arti_batak && infoLiturgi.arti_batak !== '-' && (
                      <p className="text-xs sm:text-sm text-amber-200/90 italic font-serif-body">
                        "{infoLiturgi.arti_batak}"
                      </p>
                    )}
                    {selectedWarta.warta.topik_minggu && (
                      <p className="text-sm text-stone-200 font-serif-body italic pt-1 leading-relaxed">
                        Topik: "{selectedWarta.warta.topik_minggu}"
                      </p>
                    )}
                  </div>

                  {/* Quick Stats */}
                  <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                    <div className="bg-white/10 backdrop-blur-xs rounded-xl py-2 px-1.5">
                      <div className="text-[10.5px] text-stone-300">Hadir Lalu</div>
                      <div className="text-sm font-bold text-white font-mono-num">
                        {totalRuasAktif}
                      </div>
                    </div>
                    <div className="bg-white/10 backdrop-blur-xs rounded-xl py-2 px-1.5">
                      <div className="text-[10.5px] text-stone-300">Ulang Tahun</div>
                      <div className="text-sm font-bold text-amber-300 font-mono-num">
                        {selectedWarta.ulang_tahun.length}
                      </div>
                    </div>
                    <div className="bg-white/10 backdrop-blur-xs rounded-xl py-2 px-1.5">
                      <div className="text-[10.5px] text-stone-300">Partangiangan</div>
                      <div className="text-sm font-bold text-white font-mono-num">
                        {selectedWarta.warta.tampilkan_partangiangan === false
                          ? 'Libur'
                          : `${selectedWarta.jadwal_partangiangan.length} Wijk`}
                      </div>
                    </div>
                  </div>

                  {/* Primary CTA + Secondary actions */}
                  <div className="space-y-2.5 pt-1">
                    <button
                      type="button"
                      onClick={() => onChangeView('baca', 'liturgi')}
                      className="w-full min-h-[48px] px-4 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 active:scale-[0.99] text-stone-950 font-extrabold text-sm shadow-lg flex items-center justify-center gap-2 transition cursor-pointer"
                    >
                      <BookOpen className="w-4.5 h-4.5 shrink-0" />
                      <span>Baca Warta Minggu Ini</span>
                    </button>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        disabled={isExportingPdf}
                        onClick={onDownloadPdf}
                        className="min-h-[44px] px-3 py-2 rounded-xl bg-emerald-600/90 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
                      >
                        {isExportingPdf ? (
                          <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                        ) : (
                          <Download className="w-4 h-4 shrink-0" />
                        )}
                        <span>{isExportingPdf ? 'Membuat PDF...' : 'Unduh PDF'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleShareActiveWarta(true)}
                        className="min-h-[44px] px-3 py-2 rounded-xl bg-white/12 hover:bg-white/20 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <MessageCircle className="w-4 h-4 text-emerald-300 shrink-0" />
                        <span>Bagikan WA</span>
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="py-6 text-center text-sm text-stone-200">
                  Belum ada edisi warta yang diterbitkan saat ini.
                </div>
              )}
            </div>
          </section>

          {/* MENU CEPAT (6 Grounded Shortcuts) */}
          <section className="space-y-2.5">
            <h2 className="text-sm font-bold uppercase tracking-wider text-stone-500 px-1">
              Menu Cepat Jemaat
            </h2>
            <div className="grid grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => onChangeView('baca', 'liturgi')}
                className="min-h-[82px] bg-white rounded-2xl border border-stone-200 p-3 flex flex-col items-center justify-center gap-2 text-center shadow-2xs active:scale-95 transition cursor-pointer"
              >
                <span className="w-10 h-10 rounded-xl bg-blue-50 text-[#0B2545] flex items-center justify-center">
                  <BookOpen className="w-5 h-5" />
                </span>
                <span className="text-xs font-bold text-stone-800 leading-tight">Tata Ibadah</span>
              </button>

              <button
                type="button"
                onClick={() => onChangeView('kegiatan')}
                className="min-h-[82px] bg-white rounded-2xl border border-stone-200 p-3 flex flex-col items-center justify-center gap-2 text-center shadow-2xs active:scale-95 transition cursor-pointer"
              >
                <span className="w-10 h-10 rounded-xl bg-amber-50 text-amber-800 flex items-center justify-center">
                  <Calendar className="w-5 h-5" />
                </span>
                <span className="text-xs font-bold text-stone-800 leading-tight">Jadwal</span>
              </button>

              <button
                type="button"
                onClick={() => onChangeView('pengumuman')}
                className="min-h-[82px] bg-white rounded-2xl border border-stone-200 p-3 flex flex-col items-center justify-center gap-2 text-center shadow-2xs active:scale-95 transition cursor-pointer"
              >
                <span className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-800 flex items-center justify-center">
                  <Megaphone className="w-5 h-5" />
                </span>
                <span className="text-xs font-bold text-stone-800 leading-tight">Pengumuman</span>
              </button>

              <button
                type="button"
                onClick={() => onChangeView('baca', 'keuangan')}
                className="min-h-[82px] bg-white rounded-2xl border border-stone-200 p-3 flex flex-col items-center justify-center gap-2 text-center shadow-2xs active:scale-95 transition cursor-pointer"
              >
                <span className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center">
                  <DollarSign className="w-5 h-5" />
                </span>
                <span className="text-xs font-bold text-stone-800 leading-tight">Keuangan</span>
              </button>

              <button
                type="button"
                onClick={() => onChangeView('baca', 'ultah')}
                className="min-h-[82px] bg-white rounded-2xl border border-stone-200 p-3 flex flex-col items-center justify-center gap-2 text-center shadow-2xs active:scale-95 transition cursor-pointer"
              >
                <span className="w-10 h-10 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center">
                  <Cake className="w-5 h-5" />
                </span>
                <span className="text-xs font-bold text-stone-800 leading-tight">Ulang Tahun</span>
              </button>

              <button
                type="button"
                onClick={onOpenArchive}
                className="min-h-[82px] bg-white rounded-2xl border border-stone-200 p-3 flex flex-col items-center justify-center gap-2 text-center shadow-2xs active:scale-95 transition cursor-pointer"
              >
                <span className="w-10 h-10 rounded-xl bg-stone-100 text-stone-800 flex items-center justify-center">
                  <Archive className="w-5 h-5" />
                </span>
                <span className="text-xs font-bold text-stone-800 leading-tight">Arsip Warta</span>
              </button>
            </div>
          </section>

          {/* AYAT MINGGU */}
          {selectedWarta?.warta.ayat_teks && (
            <section className="bg-white rounded-2xl border border-stone-200 p-4 sm:p-5 space-y-1.5 shadow-2xs">
              <div className="text-xs font-bold uppercase tracking-wider text-amber-800">
                Ayat Pegangan Minggu Ini
              </div>
              <p className="text-base font-serif-body italic text-stone-800 leading-relaxed">
                "{selectedWarta.warta.ayat_teks}"
              </p>
              {selectedWarta.warta.ayat_ref && (
                <div className="text-right text-xs font-bold text-[#0B2545]">
                  — {selectedWarta.warta.ayat_ref}
                </div>
              )}
            </section>
          )}

          {/* INFORMASI & PENGUMUMAN PENTING TERBARU */}
          {selectedWarta && selectedWarta.pengumuman.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <h2 className="text-sm font-bold uppercase tracking-wider text-stone-500">
                  Informasi &amp; Pengumuman Terbaru
                </h2>
                <button
                  type="button"
                  onClick={() => onChangeView('pengumuman')}
                  className="text-xs font-bold text-[#0B2545] min-h-[36px] px-2 flex items-center gap-0.5 cursor-pointer"
                >
                  <span>Lihat Semua</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2.5">
                {selectedWarta.pengumuman.slice(0, 3).map((p, idx) => (
                  <div
                    key={p.id || idx}
                    className="bg-white rounded-2xl border border-stone-200 p-4 space-y-2 shadow-2xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-[15px] font-bold text-stone-900 leading-snug">
                        {idx + 1}. {p.judul}
                      </h3>
                      <button
                        type="button"
                        onClick={() => handleShareAnnouncement(p.judul, p.isi)}
                        aria-label={`Bagikan ${p.judul}`}
                        className="min-w-[40px] min-h-[40px] -mt-1 -mr-1 rounded-xl text-stone-500 hover:bg-stone-100 flex items-center justify-center shrink-0 cursor-pointer"
                      >
                        <Share2 className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="text-sm text-stone-700 leading-relaxed line-clamp-3 whitespace-pre-line">
                      {p.isi}
                    </p>
                    <button
                      type="button"
                      onClick={() => onChangeView('baca', 'warta')}
                      className="text-xs font-bold text-[#0B2545] inline-flex items-center gap-1 pt-0.5 cursor-pointer"
                    >
                      <span>Baca selengkapnya di Warta</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* JADWAL IBADAH RINGKAS */}
          <section className="bg-white rounded-2xl border border-stone-200 p-4 sm:p-5 space-y-3 shadow-2xs">
            <div className="flex items-center justify-between border-b border-stone-100 pb-2.5">
              <h2 className="text-base font-bold text-[#0B2545] flex items-center gap-2">
                <Clock className="w-4 h-4 shrink-0" />
                <span>Jadwal Ibadah Mingguan</span>
              </h2>
              <button
                type="button"
                onClick={() => onChangeView('kegiatan')}
                className="text-xs font-bold text-[#0B2545] cursor-pointer"
              >
                Detail
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5 text-xs">
              <div className="p-3 bg-stone-50 rounded-xl">
                <div className="text-[11px] font-bold text-amber-800 uppercase">Sekolah Minggu</div>
                <div className="text-sm font-bold text-stone-900 mt-0.5">07.00 WIB</div>
                <div className="text-[11px] text-stone-500">Gedung SM</div>
              </div>
              <div className="p-3 bg-stone-50 rounded-xl">
                <div className="text-[11px] font-bold text-amber-800 uppercase">Ibadah Pagi</div>
                <div className="text-sm font-bold text-stone-900 mt-0.5">08.30 WIB</div>
                <div className="text-[11px] text-stone-500">Gereja Utama</div>
              </div>
              <div className="p-3 bg-stone-50 rounded-xl">
                <div className="text-[11px] font-bold text-amber-800 uppercase">Ibadah Siang</div>
                <div className="text-sm font-bold text-stone-900 mt-0.5">10.30 WIB</div>
                <div className="text-[11px] text-stone-500">Gereja Utama</div>
              </div>
              <div className="p-3 bg-stone-50 rounded-xl">
                <div className="text-[11px] font-bold text-amber-800 uppercase">Partangiangan</div>
                <div className="text-sm font-bold text-stone-900 mt-0.5">20.00 WIB</div>
                <div className="text-[11px] text-stone-500">Rabu &amp; Kamis</div>
              </div>
            </div>
          </section>

          {/* EDISI WARTA SEBELUMNYA */}
          {wartasList.length > 0 && (
            <section className="space-y-3 pb-4">
              <div className="flex items-center justify-between px-1">
                <h2 className="text-sm font-bold uppercase tracking-wider text-stone-500">
                  Edisi Sebelumnya
                </h2>
                <button
                  type="button"
                  onClick={onOpenArchive}
                  className="text-xs font-bold text-[#0B2545] min-h-[36px] px-2 flex items-center gap-0.5 cursor-pointer"
                >
                  <span>Semua Arsip</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2.5">
                {wartasList.slice(0, 3).map((w) => (
                  <button
                    key={w.id}
                    type="button"
                    onClick={() => onSelectWarta(w.id, true)}
                    className="w-full text-left bg-white rounded-2xl border border-stone-200 p-4 flex items-center justify-between gap-3 active:scale-[0.99] transition cursor-pointer"
                  >
                    <div className="min-w-0 space-y-0.5">
                      <div className="text-xs font-bold text-[#0B2545] uppercase">
                        MINGGU {w.goar_minggu} ·{' '}
                        <span className="font-mono-num text-stone-500 font-semibold">
                          {formatTanggalIndo(w.tanggal_minggu)}
                        </span>
                      </div>
                      <div className="text-sm font-semibold text-stone-900 truncate">
                        {w.topik_minggu || `Warta Jemaat Minggu ${w.goar_minggu}`}
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-stone-400 shrink-0" />
                  </button>
                ))}
              </div>
            </section>
          )}
          {/* PASANG APLIKASI KE HP (PWA / WebAPK) */}
          <PWAInstallButton
            variant="banner"
            onInstalled={() => onNotify('Aplikasi E-Warta HKBP berhasil dipasang di HP.')}
          />
        </main>
      )}

      {/* ========================================================= */}
      {/* VIEW 2: MOBILE WARTA READER */}
      {/* ========================================================= */}
      {activeView === 'baca' && selectedWarta && (
        <MobileWartaReader
          data={selectedWarta}
          pengaturan={pengaturan}
          jadwalTetap={jadwalTetap}
          activeSection={activeReaderSection}
          onChangeSection={onChangeReaderSection}
          onBackToBeranda={() => onChangeView('beranda')}
          onOpenArchive={onOpenArchive}
          onOpenPrintA4={() => onOpenPrintA4(selectedWarta.warta.id)}
          onDownloadPdf={onDownloadPdf}
          isExportingPdf={isExportingPdf}
          onNotify={onNotify}
        />
      )}

      {activeView === 'baca' && !selectedWarta && (
        <div className="max-w-3xl mx-auto px-4 py-12 text-center space-y-3">
          <BookOpen className="w-10 h-10 text-stone-300 mx-auto" />
          <p className="text-sm font-semibold text-stone-700">
            {isLoading ? 'Memuat warta jemaat...' : 'Belum ada warta yang tersedia untuk dibaca.'}
          </p>
        </div>
      )}

      {/* ========================================================= */}
      {/* VIEW 3: MOBILE KEGIATAN & JADWAL IBADAH */}
      {/* ========================================================= */}
      {activeView === 'kegiatan' && (
        <main className="max-w-3xl mx-auto px-3.5 sm:px-6 pt-4 space-y-4">
          <div className="bg-[#0B2545] text-white rounded-2xl p-4 sm:p-5 space-y-1">
            <h1 className="text-lg font-display font-bold uppercase tracking-wide">
              Kegiatan &amp; Jadwal Huria
            </h1>
            <p className="text-xs text-stone-300">
              {selectedWarta
                ? `Periode Minggu ${selectedWarta.warta.goar_minggu} (${formatTanggalLengkap(
                    selectedWarta.warta.tanggal_minggu
                  )})`
                : 'HKBP Ressort Hutaraja · Distrik VI Dairi'}
            </p>
          </div>

          {/* Partangiangan Lingkungan */}
          {selectedWarta && (
            <section className="bg-white rounded-2xl border border-stone-200 p-4 sm:p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-stone-100 pb-2.5">
                <h2 className="text-base font-bold text-[#0B2545] flex items-center gap-2">
                  <MapPin className="w-4 h-4 shrink-0" />
                  <span>Partangiangan Lingkungan</span>
                </h2>
                <span className="text-xs font-semibold text-stone-500">
                  {selectedWarta.warta.tampilkan_partangiangan === false
                    ? 'Tidak Aktif'
                    : `${selectedWarta.jadwal_partangiangan.length} Wijk`}
                </span>
              </div>

              {selectedWarta.warta.tampilkan_partangiangan === false ? (
                <p className="text-sm text-stone-600 bg-stone-50 rounded-xl p-3.5">
                  Partangiangan lingkungan tidak dilaksanakan pada periode minggu ini.
                </p>
              ) : (
                <div className="divide-y divide-stone-100">
                  {selectedWarta.jadwal_partangiangan.map((jp, idx) => (
                    <div key={jp.id || idx} className="py-3 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-bold text-stone-900">{jp.lingkungan}</span>
                        <span className="text-xs font-semibold text-[#0B2545]">
                          {jp.hari} · {jp.pukul}
                        </span>
                      </div>
                      <p className="text-sm text-stone-600">
                        Inganan: <strong className="text-stone-900">{jp.inganan}</strong>
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* Koor Minggu */}
          {selectedWarta && (selectedWarta.warta.koor_pagi || selectedWarta.warta.koor_siang) && (
            <section className="bg-white rounded-2xl border border-stone-200 p-4 sm:p-5 space-y-3">
              <h2 className="text-base font-bold text-[#0B2545] flex items-center gap-2 border-b border-stone-100 pb-2.5">
                <Music className="w-4 h-4 shrink-0" />
                <span>Jadwal Koor Minggu na Naeng Ro</span>
              </h2>
              <div className="space-y-2 text-sm text-stone-800">
                {selectedWarta.warta.koor_pagi && (
                  <p className="p-3 bg-stone-50 rounded-xl">
                    <strong className="block text-xs text-[#0B2545] uppercase mb-0.5">
                      Ibadah Pagi (08.30 WIB)
                    </strong>
                    {selectedWarta.warta.koor_pagi}
                  </p>
                )}
                {selectedWarta.warta.koor_siang && (
                  <p className="p-3 bg-stone-50 rounded-xl">
                    <strong className="block text-xs text-[#0B2545] uppercase mb-0.5">
                      Ibadah Siang (10.30 WIB)
                    </strong>
                    {selectedWarta.warta.koor_siang}
                  </p>
                )}
              </div>
            </section>
          )}

          {/* Jadwal Panghobasion Tetap */}
          <section className="bg-white rounded-2xl border border-stone-200 p-4 sm:p-5 space-y-3">
            <h2 className="text-base font-bold text-[#0B2545] flex items-center gap-2 border-b border-stone-100 pb-2.5">
              <Clock className="w-4 h-4 shrink-0" />
              <span>Jadwal Tetap Mingguan</span>
            </h2>
            <div className="divide-y divide-stone-100">
              {jadwalTetap.map((jt) => (
                <div key={jt.id} className="py-3 space-y-1">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-sm font-bold text-stone-900">{jt.label}</span>
                    <span className="text-[11px] font-semibold uppercase text-stone-500">
                      {jt.kelompok}
                    </span>
                  </div>
                  <div className="text-xs text-stone-600">
                    {jt.hari}, {jt.jam} · {jt.keterangan || 'Gereja HKBP Hutaraja'}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Sopo Godang */}
          {selectedWarta && selectedWarta.sopo_godang.length > 0 && (
            <section className="bg-white rounded-2xl border border-stone-200 p-4 sm:p-5 space-y-3">
              <h2 className="text-base font-bold text-[#0B2545] flex items-center gap-2 border-b border-stone-100 pb-2.5">
                <Building className="w-4 h-4 shrink-0" />
                <span>Pemakaian Sopo Godang</span>
              </h2>
              <div className="divide-y divide-stone-100">
                {selectedWarta.sopo_godang.map((sg, idx) => (
                  <div key={sg.id || idx} className="py-2.5 space-y-0.5">
                    <div className="text-sm font-semibold text-stone-900">
                      {idx + 1}. {sg.nama || '-'}
                    </div>
                    <div className="text-xs text-stone-500">{sg.tanggal || '-'}</div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </main>
      )}

      {/* ========================================================= */}
      {/* VIEW 4: MOBILE PENGUMUMAN & ULANG TAHUN */}
      {/* ========================================================= */}
      {activeView === 'pengumuman' && (
        <main className="max-w-3xl mx-auto px-3.5 sm:px-6 pt-4 space-y-4">
          <div className="bg-[#0B2545] text-white rounded-2xl p-4 sm:p-5 space-y-1">
            <h1 className="text-lg font-display font-bold uppercase tracking-wide">
              Tingting &amp; Pengumuman Huria
            </h1>
            <p className="text-xs text-stone-300">
              {selectedWarta
                ? `Minggu ${selectedWarta.warta.goar_minggu} · ${formatTanggalLengkap(
                    selectedWarta.warta.tanggal_minggu
                  )}`
                : 'HKBP Ressort Hutaraja'}
            </p>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-3.5" />
            <input
              type="text"
              placeholder="Cari pengumuman gereja..."
              value={pengumumanQuery}
              onChange={(e) => setPengumumanQuery(e.target.value)}
              className="w-full min-h-[44px] pl-10 pr-3 py-2 text-sm border border-stone-300 rounded-2xl bg-white focus:outline-none focus:ring-2 focus:ring-[#0B2545]"
            />
          </div>

          {selectedWarta ? (
            <div className="space-y-3">
              {selectedWarta.pengumuman
                .filter(
                  (p) =>
                    !pengumumanQuery.trim() ||
                    p.judul.toLowerCase().includes(pengumumanQuery.toLowerCase()) ||
                    p.isi.toLowerCase().includes(pengumumanQuery.toLowerCase())
                )
                .map((p, idx) => (
                  <article
                    key={p.id || idx}
                    className="bg-white rounded-2xl border border-stone-200 p-4 sm:p-5 space-y-2.5 shadow-2xs"
                  >
                    <h2 className="text-base font-bold text-[#0B2545] leading-snug">
                      {idx + 1}. {p.judul}
                    </h2>
                    <p className="text-[15px] leading-[1.65] text-stone-800 whitespace-pre-line break-words">
                      {p.isi}
                    </p>
                    <div className="pt-2 border-t border-stone-100 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleShareAnnouncement(p.judul, p.isi, true)}
                        className="min-h-[40px] px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>Kirim WA</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleShareAnnouncement(p.judul, p.isi, false)}
                        className="min-h-[40px] px-3 py-1.5 rounded-xl bg-stone-100 text-stone-700 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                        <span>Bagikan</span>
                      </button>
                    </div>
                  </article>
                ))}
            </div>
          ) : (
            <p className="text-center text-sm text-stone-500 py-8">
              Belum ada pengumuman tersedia.
            </p>
          )}
        </main>
      )}

      {/* Search Overlay Sheet */}
      {searchOpen && (
        <div
          className="lg:hidden fixed inset-0 z-50 bg-black/55 backdrop-blur-xs flex items-end sm:items-center justify-center"
          onClick={() => setSearchOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Pencarian Cepat E-Warta"
        >
          <div
            className="w-full max-w-2xl bg-white rounded-t-3xl sm:rounded-2xl max-h-[85vh] flex flex-col overflow-hidden shadow-2xl pb-safe"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-stone-200 flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  autoFocus
                  placeholder="Cari pengumuman, jemaat ultah, atau edisi..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full min-h-[44px] pl-10 pr-3 py-2 text-sm border border-stone-300 rounded-xl bg-stone-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0B2545]"
                />
              </div>
              <button
                type="button"
                onClick={() => setSearchOpen(false)}
                aria-label="Tutup Pencarian"
                className="min-w-[44px] min-h-[44px] rounded-xl text-stone-500 hover:bg-stone-100 flex items-center justify-center cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-4">
              {!q ? (
                <p className="text-sm text-stone-500 text-center py-6">
                  Ketik kata kunci untuk mencari pengumuman, nama jemaat berulang tahun, atau edisi warta terdahulu.
                </p>
              ) : (
                <>
                  {matchedAnnouncements.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-xs font-bold uppercase text-stone-500">
                        Pengumuman ({matchedAnnouncements.length})
                      </div>
                      {matchedAnnouncements.map((p, i) => (
                        <button
                          key={p.id || i}
                          type="button"
                          onClick={() => {
                            setSearchOpen(false);
                            onChangeView('baca', 'warta');
                          }}
                          className="w-full text-left p-3 rounded-xl bg-stone-50 hover:bg-stone-100 space-y-0.5 cursor-pointer"
                        >
                          <div className="text-sm font-bold text-[#0B2545]">{p.judul}</div>
                          <div className="text-xs text-stone-600 line-clamp-2">{p.isi}</div>
                        </button>
                      ))}
                    </div>
                  )}

                  {matchedBirthdays.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-xs font-bold uppercase text-stone-500">
                        Ulang Tahun ({matchedBirthdays.length})
                      </div>
                      {matchedBirthdays.map((u, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => {
                            setSearchOpen(false);
                            onChangeView('baca', 'ultah');
                          }}
                          className="w-full text-left p-3 rounded-xl bg-stone-50 hover:bg-stone-100 flex items-center justify-between cursor-pointer"
                        >
                          <div>
                            <div className="text-sm font-bold text-stone-900">{u.nama}</div>
                            <div className="text-xs text-stone-500">
                              {u.wijk} · {u.hari_bulan}
                            </div>
                          </div>
                          <span className="text-xs font-bold text-rose-800 font-mono-num">
                            {u.usia} Thn
                          </span>
                        </button>
                      ))}
                    </div>
                  )}

                  {matchedWartas.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-xs font-bold uppercase text-stone-500">
                        Edisi Warta ({matchedWartas.length})
                      </div>
                      {matchedWartas.map((w) => (
                        <button
                          key={w.id}
                          type="button"
                          onClick={() => {
                            setSearchOpen(false);
                            onSelectWarta(w.id, true);
                          }}
                          className="w-full text-left p-3 rounded-xl bg-stone-50 hover:bg-stone-100 cursor-pointer"
                        >
                          <div className="text-xs font-bold text-[#0B2545] uppercase">
                            MINGGU {w.goar_minggu} · {formatTanggalIndo(w.tanggal_minggu)}
                          </div>
                          <div className="text-sm font-semibold text-stone-800">
                            {w.topik_minggu || '-'}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {matchedAnnouncements.length === 0 &&
                    matchedBirthdays.length === 0 &&
                    matchedWartas.length === 0 && (
                      <p className="text-sm text-stone-500 text-center py-6">
                        Tidak ditemukan hasil untuk "{searchQuery}".
                      </p>
                    )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <OfflineIndicator />

      {/* Fixed Bottom Thumb Navigation Bar */}
      <MobileBottomNav
        activeView={activeView}
        onChangeView={(v) => {
          onChangeView(v);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        hasActiveWarta={Boolean(selectedWarta)}
        isExportingPdf={isExportingPdf}
        onDownloadPdf={onDownloadPdf}
        onOpenPrintA4={() => selectedWarta && onOpenPrintA4(selectedWarta.warta.id)}
        onOpenArchive={onOpenArchive}
        onShareDevice={() => handleShareActiveWarta(false)}
        onShareWhatsApp={() => handleShareActiveWarta(true)}
        onOpenAdminOrLogin={onOpenAdminOrLogin}
        currentRole={currentRole}
      />
    </div>
  );
};
