import React, { useEffect, useState } from 'react';
import {
  BookOpen,
  Bell,
  Cake,
  DollarSign,
  Clock,
  Calendar,
  Download,
  Loader2,
  Printer,
  Share2,
  MessageCircle,
  ArrowLeft,
  Eye,
  Users,
  Music,
  MapPin,
  Search,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Building
} from 'lucide-react';
import { FullWartaData, JadwalTetapItem, PengaturanHuria } from '../../types';
import { formatTanggalLengkap } from '../../lib/dateUtils';
import { formatRupiah } from '../../lib/format';
import {
  getPrintablePenerimaanRows,
  getPrintablePengeluaranRows,
  getHamauliateonTransitoriList
} from '../../lib/financialMath';
import { OFFICIAL_HKBP_MINGGU_LITURGI } from '../../lib/masterMingguData';
import { getLiturgiColorBadge } from '../common/MingguLiturgiDropdown';
import {
  MobileReaderSection,
  buildWartaShareMessage,
  buildWartaShareUrl,
  buildWhatsAppShareUrl,
  executeWebShare
} from '../../lib/shareUtils';

interface MobileWartaReaderProps {
  data: FullWartaData;
  pengaturan?: PengaturanHuria;
  jadwalTetap?: JadwalTetapItem[];
  activeSection: MobileReaderSection;
  onChangeSection: (section: MobileReaderSection) => void;
  onBackToBeranda: () => void;
  onOpenArchive: () => void;
  onOpenPrintA4: () => void;
  onDownloadPdf: () => void;
  isExportingPdf: boolean;
  onNotify: (msg: string) => void;
}

type FontScale = 'normal' | 'nyaman' | 'besar';

const FONT_SCALE_CONFIG: Record<
  FontScale,
  { bodyClass: string; headingClass: string; label: string }
> = {
  normal: { bodyClass: 'text-[15px] leading-[1.6]', headingClass: 'text-base', label: '15px' },
  nyaman: { bodyClass: 'text-[17px] leading-[1.65]', headingClass: 'text-[17px]', label: '17px' },
  besar: { bodyClass: 'text-[19px] leading-[1.7]', headingClass: 'text-lg', label: '19px' }
};

export const MobileWartaReader: React.FC<MobileWartaReaderProps> = ({
  data,
  pengaturan,
  jadwalTetap = [],
  activeSection,
  onChangeSection,
  onBackToBeranda,
  onOpenArchive,
  onOpenPrintA4,
  onDownloadPdf,
  isExportingPdf,
  onNotify
}) => {
  const {
    warta,
    acara_minggu,
    acara_partangiangan,
    parhobas,
    sopo_godang,
    jadwal_partangiangan,
    pengumuman,
    penerimaan,
    pelean_taon,
    hamauliateon,
    sumbangan_natal = [],
    pengeluaran,
    ulang_tahun,
    rekapitulasi
  } = data;

  const [fontScale, setFontScale] = useState<FontScale>(() => {
    try {
      const saved = localStorage.getItem('ewarta_mobile_font_size');
      if (saved === 'normal' || saved === 'nyaman' || saved === 'besar') return saved;
    } catch {
      // Ignore storage access errors
    }
    return 'nyaman';
  });

  const [focusMode, setFocusMode] = useState<boolean>(false);
  const [scrollProgress, setScrollProgress] = useState<number>(0);
  const [showPartangianganLiturgi, setShowPartangianganLiturgi] = useState<boolean>(false);
  const [ultahSearch, setUltahSearch] = useState<string>('');
  const [ultahWijkFilter, setUltahWijkFilter] = useState<string>('all');
  const [keuanganSearch, setKeuanganSearch] = useState<string>('');
  const [showZeroPenerimaan, setShowZeroPenerimaan] = useState<boolean>(false);

  useEffect(() => {
    try {
      localStorage.setItem('ewarta_mobile_font_size', fontScale);
    } catch {
      // Ignore
    }
  }, [fontScale]);

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY || document.documentElement.scrollTop || 0;
      const docHeight =
        document.documentElement.scrollHeight - document.documentElement.clientHeight;
      if (docHeight <= 0) {
        setScrollProgress(0);
        return;
      }
      setScrollProgress(Math.min(100, Math.max(0, Math.round((scrollTop / docHeight) * 100))));
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [activeSection, warta.id]);

  const cycleFontScale = (dir: -1 | 1) => {
    const order: FontScale[] = ['normal', 'nyaman', 'besar'];
    const idx = order.indexOf(fontScale);
    const next = order[Math.min(order.length - 1, Math.max(0, idx + dir))];
    setFontScale(next);
  };

  const scale = FONT_SCALE_CONFIG[fontScale];

  const cleanGoar = (warta.goar_minggu || '').trim().toUpperCase();
  const infoLiturgi = OFFICIAL_HKBP_MINGGU_LITURGI.find(
    (m) =>
      m.nama_minggu.toUpperCase() === cleanGoar ||
      `MINGGU ${m.nama_minggu.toUpperCase()}` === cleanGoar
  );
  const badge = getLiturgiColorBadge(infoLiturgi?.warna_liturgi);

  const sectionTabs: {
    id: MobileReaderSection;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }[] = [
    { id: 'liturgi', label: 'Ibadah', icon: BookOpen },
    { id: 'warta', label: 'Tingting', icon: Bell },
    { id: 'ultah', label: 'Ulang Tahun', icon: Cake },
    { id: 'keuangan', label: 'Keuangan', icon: DollarSign },
    { id: 'jadwal', label: 'Jadwal', icon: Clock }
  ];

  const sectionShareLabels: Record<MobileReaderSection, string> = {
    liturgi: 'Tata Ibadah & Parhobas',
    warta: 'Tingting Namarragam & Partangiangan',
    ultah: 'Ruas na Marulang Tahun',
    keuangan: 'Tingting Parhepengon (Keuangan)',
    jadwal: 'Jadwal Panghobasion Huria'
  };

  const handleShareSection = async (viaWhatsApp = false) => {
    const url = buildWartaShareUrl({
      wartaId: warta.id,
      view: 'baca',
      sec: activeSection
    });
    const text = buildWartaShareMessage({
      warta,
      pengaturan,
      url,
      sectionLabel: sectionShareLabels[activeSection]
    });

    if (viaWhatsApp) {
      window.location.href = buildWhatsAppShareUrl(text);
      return;
    }

    const res = await executeWebShare({
      title: `Warta Minggu ${warta.goar_minggu}`,
      text,
      url
    });
    if (res === 'copied') {
      onNotify('Tautan bagian warta berhasil disalin ke papan klip.');
    }
  };

  const handleShareAnnouncement = async (judul: string, isi: string) => {
    const url = buildWartaShareUrl({
      wartaId: warta.id,
      view: 'baca',
      sec: 'warta'
    });
    const text = buildWartaShareMessage({
      warta,
      pengaturan,
      url,
      highlightTitle: judul,
      highlightBody: isi
    });

    const res = await executeWebShare({
      title: judul,
      text,
      url
    });
    if (res === 'copied') {
      onNotify(`Pengumuman "${judul}" disalin untuk dibagikan.`);
    }
  };

  const filteredUltah = ulang_tahun.filter((u) => {
    const matchName = u.nama.toLowerCase().includes(ultahSearch.toLowerCase());
    const matchWijk = ultahWijkFilter === 'all' || u.wijk === ultahWijkFilter;
    return matchName && matchWijk;
  });

  const basePenerimaan = showZeroPenerimaan
    ? penerimaan
    : getPrintablePenerimaanRows(penerimaan);
  const filteredPenerimaan = basePenerimaan.filter(
    (p) =>
      p.uraian.toLowerCase().includes(keuanganSearch.toLowerCase()) ||
      (p.no_tampilan || '').toLowerCase().includes(keuanganSearch.toLowerCase())
  );
  const printablePengeluaran = getPrintablePengeluaranRows(pengeluaran);

  const totalRuas = (warta.ruas_sm || 0) + (warta.ruas_pagi || 0) + (warta.ruas_siang || 0);
  const sumbanganTotal = sumbangan_natal.reduce((acc, item) => acc + (item.jumlah || 0), 0);

  return (
    <div
      className={`min-h-screen transition-colors duration-200 pb-24 ${
        focusMode ? 'bg-[#FBF8F1]' : 'bg-[#F7F5F0]'
      }`}
    >
      {/* Top Reading Progress Bar + Compact Sticky Section Bar */}
      <div className="sticky top-[52px] z-30 bg-white/95 backdrop-blur-md border-b border-stone-200 shadow-xs">
        {/* Progress Indicator */}
        <div className="w-full h-[2.5px] bg-stone-100">
          <div
            className="h-full bg-[#C59B27] transition-[width] duration-150"
            style={{ width: `${scrollProgress}%` }}
          />
        </div>

        {/* Row 1: Reading Controls (Font size, Focus mode, PDF, Share) */}
        <div className="max-w-3xl mx-auto px-3 py-1.5 flex items-center justify-between gap-2 border-b border-stone-100">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onBackToBeranda}
              aria-label="Kembali ke Beranda"
              className="min-h-[38px] px-2.5 rounded-lg text-xs font-semibold text-stone-700 hover:bg-stone-100 inline-flex items-center gap-1 cursor-pointer whitespace-nowrap"
            >
              <ArrowLeft className="w-4 h-4 shrink-0" />
              <span>Beranda</span>
            </button>

            <button
              type="button"
              onClick={onOpenArchive}
              className="min-h-[38px] px-2.5 rounded-lg text-xs font-semibold text-stone-600 hover:bg-stone-100 inline-flex items-center cursor-pointer whitespace-nowrap"
            >
              Arsip
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Font size A- / A+ */}
            <div
              className="inline-flex items-center bg-stone-100 rounded-lg border border-stone-200 p-0.5"
              role="group"
              aria-label="Ukuran Huruf"
            >
              <button
                type="button"
                onClick={() => cycleFontScale(-1)}
                disabled={fontScale === 'normal'}
                aria-label="Perkecil Teks"
                className="min-w-[34px] min-h-[34px] px-2 rounded-md text-xs font-bold text-stone-700 hover:bg-white disabled:opacity-40 cursor-pointer"
              >
                A-
              </button>
              <span className="px-1.5 text-[11px] font-semibold text-stone-600 font-mono-num">
                {scale.label}
              </span>
              <button
                type="button"
                onClick={() => cycleFontScale(1)}
                disabled={fontScale === 'besar'}
                aria-label="Perbesar Teks"
                className="min-w-[34px] min-h-[34px] px-2 rounded-md text-xs font-bold text-stone-700 hover:bg-white disabled:opacity-40 cursor-pointer"
              >
                A+
              </button>
            </div>

            {/* Focus Mode Button */}
            <button
              type="button"
              onClick={() => setFocusMode((v) => !v)}
              aria-pressed={focusMode}
              title="Mode Baca Fokus"
              className={`min-h-[36px] px-2.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1 transition cursor-pointer whitespace-nowrap border ${
                focusMode
                  ? 'bg-[#0B2545] text-white border-[#0B2545]'
                  : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50'
              }`}
            >
              <Eye className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden xs:inline">Fokus</span>
            </button>
          </div>
        </div>

        {/* Row 2: Horizontal Section Tabs */}
        <div
          className="max-w-3xl mx-auto px-2.5 py-1.5 flex items-center gap-1.5 overflow-x-auto scrollbar-none"
          role="tablist"
          aria-label="Bagian Warta Jemaat"
        >
          {sectionTabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeSection === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => {
                  onChangeSection(tab.id);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className={`min-h-[40px] px-3.5 py-1.5 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shrink-0 whitespace-nowrap transition cursor-pointer ${
                  active
                    ? 'bg-[#0B2545] text-white shadow-xs'
                    : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 shrink-0 ${active ? 'text-amber-400' : 'text-stone-500'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Reader Body */}
      <div className="max-w-3xl mx-auto px-3.5 sm:px-6 pt-4 space-y-5">
        {/* Edition Summary Header (Hidden in Mode Fokus for clean reading) */}
        {!focusMode && (
          <section className="bg-[#0B2545] text-white rounded-2xl p-4 sm:p-5 shadow-md space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-amber-300 font-semibold uppercase tracking-wider">
              <span>HKBP Ressort Hutaraja · Distrik VI Dairi</span>
              {infoLiturgi?.warna_liturgi && (
                <span className="inline-flex items-center gap-1.5 text-stone-200 normal-case tracking-normal font-medium">
                  <span className={`w-2 h-2 rounded-full ${badge.dot}`} />
                  Langgatan {infoLiturgi.warna_liturgi}
                </span>
              )}
            </div>

            <div>
              <h1
                className="text-xl sm:text-2xl font-display font-extrabold uppercase tracking-wide text-white leading-snug"
                style={{ textWrap: 'balance' }}
              >
                MINGGU {warta.goar_minggu}
              </h1>
              {infoLiturgi?.arti_batak && infoLiturgi.arti_batak !== '-' && (
                <p className="text-xs sm:text-sm text-amber-200/90 italic font-serif-body mt-0.5">
                  "{infoLiturgi.arti_batak}"
                </p>
              )}
              <div className="text-xs sm:text-sm text-stone-300 flex items-center gap-1.5 mt-1.5">
                <Calendar className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>{formatTanggalLengkap(warta.tanggal_minggu)}</span>
              </div>
            </div>

            {warta.topik_minggu && (
              <p className="text-sm text-amber-100 font-serif-body italic leading-relaxed border-t border-white/15 pt-2.5">
                Topik: "{warta.topik_minggu}"
              </p>
            )}

            {warta.ayat_teks && (
              <div className="bg-black/20 rounded-xl p-3 border border-white/10 space-y-1">
                <p className="text-xs sm:text-sm text-stone-100 font-serif-body italic leading-relaxed">
                  "{warta.ayat_teks}"
                </p>
                {warta.ayat_ref && (
                  <div className="text-right text-[11px] font-bold text-amber-300">
                    — {warta.ayat_ref}
                  </div>
                )}
              </div>
            )}

            {/* Quick PDF / Share / A4 Strip */}
            <div className="grid grid-cols-3 gap-2 pt-1">
              <button
                type="button"
                disabled={isExportingPdf}
                onClick={onDownloadPdf}
                className="min-h-[44px] px-2.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                {isExportingPdf ? (
                  <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                ) : (
                  <Download className="w-4 h-4 shrink-0" />
                )}
                <span>{isExportingPdf ? 'Proses...' : 'Buka PDF'}</span>
              </button>

              <button
                type="button"
                onClick={() => handleShareSection(true)}
                className="min-h-[44px] px-2.5 py-2 rounded-xl bg-white/12 hover:bg-white/20 text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <MessageCircle className="w-4 h-4 text-emerald-300 shrink-0" />
                <span>WhatsApp</span>
              </button>

              <button
                type="button"
                onClick={onOpenPrintA4}
                className="min-h-[44px] px-2.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <Printer className="w-4 h-4 shrink-0" />
                <span>Cetak A4</span>
              </button>
            </div>
          </section>
        )}

        {/* Compact inline title when Mode Fokus active */}
        {focusMode && (
          <div className="pb-2 border-b border-stone-200 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <h1 className="text-base font-display font-bold text-[#0B2545] uppercase truncate">
                MINGGU {warta.goar_minggu}
              </h1>
              <p className="text-xs text-stone-500">{formatTanggalLengkap(warta.tanggal_minggu)}</p>
            </div>
            <button
              type="button"
              onClick={() => handleShareSection(false)}
              aria-label="Bagikan"
              className="min-w-[44px] min-h-[44px] rounded-xl bg-white border border-stone-200 text-stone-700 flex items-center justify-center cursor-pointer shrink-0"
            >
              <Share2 className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ========================================================= */}
        {/* SECTION: IBADAH (PARHOBAS + TATA IBADAH) */}
        {/* ========================================================= */}
        {activeSection === 'liturgi' && (
          <div className="space-y-4">
            {/* Susunan Tata Ibadah Minggu */}
            <article className="bg-white rounded-2xl border border-stone-200/90 shadow-xs p-4 sm:p-6 space-y-4">
              <div className="flex items-start justify-between gap-3 border-b border-stone-100 pb-3">
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-[#0B2545]">
                    Susunan Tata Ibadah Minggu
                  </h2>
                  <p className="text-xs text-stone-500 mt-0.5">
                    {acara_minggu.length} susunan acara · Liturgi Resmi HKBP
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleShareSection(false)}
                  aria-label="Bagikan Tata Ibadah"
                  className="min-w-[44px] min-h-[44px] rounded-xl text-stone-600 hover:bg-stone-100 flex items-center justify-center cursor-pointer shrink-0"
                >
                  <Share2 className="w-4 h-4" />
                </button>
              </div>

              <ol className="divide-y divide-stone-100">
                {acara_minggu.map((item, idx) => (
                  <li key={item.id || idx} className="py-3 flex items-start gap-3">
                    <span className="w-6 text-right font-mono-num text-xs font-bold text-stone-400 pt-1 shrink-0">
                      {idx + 1}.
                    </span>
                    <div className="flex-1 min-w-0 space-y-1">
                      <p className={`${scale.bodyClass} font-medium text-stone-900 break-words`}>
                        {item.uraian}
                      </p>
                      {item.keterangan && (
                        <div className="text-xs font-semibold text-amber-800">
                          {item.keterangan}
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            </article>

            {/* Parhobas Ibadah */}
            <section className="bg-white rounded-2xl border border-stone-200/90 shadow-xs p-4 sm:p-6 space-y-3">
              <div className="flex items-center justify-between border-b border-stone-100 pb-2.5">
                <h2 className="text-base font-bold text-[#0B2545] flex items-center gap-2">
                  <Users className="w-4 h-4 text-[#0B2545] shrink-0" />
                  <span>Parhobas Ibadah Minggu</span>
                </h2>
                <span className="text-xs text-stone-500">Hadir lalu: {totalRuas} jiwa</span>
              </div>

              <div className="divide-y divide-stone-100">
                {parhobas.map((p, idx) => (
                  <div key={p.id || idx} className="py-3 space-y-1.5">
                    <div className="text-xs font-bold uppercase tracking-wide text-[#0B2545]">
                      {p.peran}
                    </div>
                    <div className={`grid grid-cols-1 xs:grid-cols-3 gap-2 ${scale.bodyClass}`}>
                      <div className="bg-stone-50 rounded-xl px-3 py-2">
                        <div className="text-[11px] font-semibold text-stone-500">SKM (07.00)</div>
                        <div className="text-sm font-semibold text-stone-900 break-words">
                          {p.skm || '-'}
                        </div>
                      </div>
                      <div className="bg-stone-50 rounded-xl px-3 py-2">
                        <div className="text-[11px] font-semibold text-stone-500">Pagi (08.30)</div>
                        <div className="text-sm font-semibold text-stone-900 break-words">
                          {p.sesi1 || '-'}
                        </div>
                      </div>
                      <div className="bg-stone-50 rounded-xl px-3 py-2">
                        <div className="text-[11px] font-semibold text-stone-500">Siang (10.30)</div>
                        <div className="text-sm font-semibold text-stone-900 break-words">
                          {p.sesi2 || '-'}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {(warta.markoor_1 || warta.markoor_2) && (
                <div className="pt-3 border-t border-stone-100 space-y-2">
                  <div className="text-xs font-bold text-[#0B2545] flex items-center gap-1.5">
                    <Music className="w-4 h-4 shrink-0" />
                    <span>Koor Ibadah Hari Ini</span>
                  </div>
                  <div className="space-y-1.5 text-sm text-stone-800">
                    {warta.markoor_1 && (
                      <p>
                        <strong className="text-[#0B2545]">Sesi 1 (Pagi):</strong> {warta.markoor_1}
                      </p>
                    )}
                    {warta.markoor_2 && (
                      <p>
                        <strong className="text-[#0B2545]">Sesi 2 (Siang):</strong> {warta.markoor_2}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </section>

            {/* Acara Partangiangan Accordion */}
            <section className="bg-white rounded-2xl border border-stone-200/90 shadow-xs overflow-hidden">
              <button
                type="button"
                onClick={() => setShowPartangianganLiturgi(!showPartangianganLiturgi)}
                className="w-full min-h-[56px] p-4 flex items-center justify-between gap-3 text-left hover:bg-stone-50 cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <Building className="w-4 h-4 text-[#0B2545] shrink-0" />
                  <div>
                    <div className="text-sm font-bold text-stone-900">
                      Acara Partangiangan Lingkungan
                    </div>
                    <div className="text-xs text-stone-500">
                      {acara_partangiangan.length} bagian ibadah keluarga wijk
                    </div>
                  </div>
                </div>
                {showPartangianganLiturgi ? (
                  <ChevronUp className="w-5 h-5 text-stone-500 shrink-0" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-stone-500 shrink-0" />
                )}
              </button>

              {showPartangianganLiturgi && (
                <ol className="px-4 pb-4 divide-y divide-stone-100 border-t border-stone-100">
                  {acara_partangiangan.map((ap, idx) => (
                    <li key={ap.id || idx} className="py-2.5 flex items-start gap-2.5">
                      <span className="text-xs font-mono-num font-bold text-stone-400 pt-1 shrink-0">
                        {idx + 1}.
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className={`${scale.bodyClass} text-stone-800`}>{ap.uraian}</p>
                        {ap.keterangan && (
                          <span className="text-xs font-semibold text-amber-800">
                            {ap.keterangan}
                          </span>
                        )}
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </section>
          </div>
        )}

        {/* ========================================================= */}
        {/* SECTION: TINGTING NAMARRAGAM & PARTANGIANGAN */}
        {/* ========================================================= */}
        {activeSection === 'warta' && (
          <div className="space-y-4">
            <article className="bg-white rounded-2xl border border-stone-200/90 shadow-xs p-4 sm:p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-[#0B2545]">
                    Tingting Namarragam (Pengumuman)
                  </h2>
                  <p className="text-xs text-stone-500">
                    {pengumuman.length} pengumuman gereja minggu ini
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleShareSection(false)}
                  aria-label="Bagikan Pengumuman"
                  className="min-w-[44px] min-h-[44px] rounded-xl text-stone-600 hover:bg-stone-100 flex items-center justify-center cursor-pointer"
                >
                  <Share2 className="w-4 h-4" />
                </button>
              </div>

              {pengumuman.length > 0 ? (
                <div className="divide-y divide-stone-100">
                  {pengumuman.map((p, idx) => (
                    <div key={p.id || idx} className="py-4 first:pt-1 last:pb-1 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className={`${scale.headingClass} font-bold text-stone-900 leading-snug`}>
                          {idx + 1}. {p.judul}
                        </h3>
                        <button
                          type="button"
                          onClick={() => handleShareAnnouncement(p.judul, p.isi)}
                          aria-label={`Bagikan ${p.judul}`}
                          className="min-w-[40px] min-h-[40px] -mt-1 rounded-xl text-stone-500 hover:text-[#0B2545] hover:bg-stone-100 flex items-center justify-center cursor-pointer shrink-0"
                        >
                          <Share2 className="w-4 h-4" />
                        </button>
                      </div>
                      <p className={`${scale.bodyClass} text-stone-700 whitespace-pre-line break-words`}>
                        {p.isi}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-stone-500 py-4 text-center">
                  Belum ada pengumuman tambahan pada minggu ini.
                </p>
              )}
            </article>

            {(warta.koor_pagi || warta.koor_siang) && (
              <section className="bg-white rounded-2xl border border-stone-200/90 shadow-xs p-4 sm:p-5 space-y-3">
                <h3 className="text-sm font-bold text-[#0B2545] flex items-center gap-2">
                  <Music className="w-4 h-4 shrink-0" />
                  <span>Jadwal na Markoor Minggu na Naeng Ro</span>
                </h3>
                <div className="space-y-2 text-sm text-stone-800">
                  {warta.koor_pagi && (
                    <div className="p-3 bg-stone-50 rounded-xl">
                      <div className="text-xs font-bold text-[#0B2545]">Ibadah Pagi (08.30 WIB)</div>
                      <p className={`${scale.bodyClass} mt-0.5`}>{warta.koor_pagi}</p>
                    </div>
                  )}
                  {warta.koor_siang && (
                    <div className="p-3 bg-stone-50 rounded-xl">
                      <div className="text-xs font-bold text-[#0B2545]">Ibadah Siang (10.30 WIB)</div>
                      <p className={`${scale.bodyClass} mt-0.5`}>{warta.koor_siang}</p>
                    </div>
                  )}
                </div>
              </section>
            )}

            {warta.tampilkan_partangiangan !== false && (
              <section className="bg-white rounded-2xl border border-stone-200/90 shadow-xs p-4 sm:p-5 space-y-3">
                <h3 className="text-sm font-bold text-[#0B2545] flex items-center gap-2">
                  <MapPin className="w-4 h-4 shrink-0" />
                  <span>Jadwal Partangiangan Lingkungan</span>
                </h3>
                <div className="divide-y divide-stone-100">
                  {jadwal_partangiangan.map((jp, idx) => (
                    <div key={jp.id || idx} className="py-3 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-bold text-stone-900">{jp.lingkungan}</span>
                        <span className="text-xs font-semibold text-[#0B2545]">
                          {jp.hari} · {jp.pukul}
                        </span>
                      </div>
                      <p className="text-sm text-stone-600">
                        Inganan: <span className="font-medium text-stone-900">{jp.inganan}</span>
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* SECTION: ULANG TAHUN */}
        {/* ========================================================= */}
        {activeSection === 'ultah' && (
          <section className="bg-white rounded-2xl border border-stone-200/90 shadow-xs p-4 sm:p-6 space-y-4">
            <div className="border-b border-stone-100 pb-3 space-y-1">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-base sm:text-lg font-bold text-[#0B2545] flex items-center gap-2">
                  <Cake className="w-5 h-5 text-rose-600 shrink-0" />
                  <span>Ruas na Marulang Tahun</span>
                </h2>
                <span className="text-xs font-bold text-rose-800 font-mono-num">
                  {ulang_tahun.length} Jemaat
                </span>
              </div>
              <p className="text-xs text-stone-500">
                Warga jemaat yang berulang tahun pada minggu ini
              </p>
            </div>

            {(() => {
              const ucapanText =
                warta.teks_ucapan_ulang_tahun !== undefined
                  ? warta.teks_ucapan_ulang_tahun.trim()
                  : (pengaturan?.teks_ucapan_ulang_tahun || '').trim();
              if (!ucapanText) return null;
              return (
                <blockquote className="p-3.5 bg-rose-50/60 border border-rose-200/70 rounded-xl text-sm text-rose-950 font-serif-body italic leading-relaxed">
                  "{ucapanText}"
                </blockquote>
              );
            })()}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="relative">
                <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  placeholder="Cari nama jemaat..."
                  value={ultahSearch}
                  onChange={(e) => setUltahSearch(e.target.value)}
                  className="w-full min-h-[44px] pl-10 pr-3 py-2 text-sm border border-stone-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#0B2545]"
                />
              </div>

              <select
                value={ultahWijkFilter}
                onChange={(e) => setUltahWijkFilter(e.target.value)}
                aria-label="Filter Lingkungan"
                className="min-h-[44px] px-3 py-2 text-sm border border-stone-300 rounded-xl bg-white text-stone-800"
              >
                <option value="all">Semua Lingkungan / Wijk</option>
                {Array.from(new Set(ulang_tahun.map((u) => u.wijk))).map((w) => (
                  <option key={w} value={w}>
                    {w}
                  </option>
                ))}
              </select>
            </div>

            {filteredUltah.length > 0 ? (
              <div className="divide-y divide-stone-100">
                {filteredUltah.map((u, idx) => (
                  <div
                    key={idx}
                    className="py-3 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className={`${scale.bodyClass} font-bold text-stone-900 break-words`}>
                        {u.nama}
                      </div>
                      <div className="text-xs text-stone-600 mt-0.5">
                        {u.wijk} · <span className="font-mono-num font-semibold">{u.hari_bulan}</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-sm font-extrabold text-rose-800 font-mono-num">
                        {u.usia} Thn
                      </div>
                      <div className="text-[11px] text-stone-500">
                        {u.jenis_kelamin === 'L' ? 'Laki-laki' : 'Perempuan'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-6 text-center text-sm text-stone-500">
                Tidak ada data ulang tahun yang cocok dengan pencarian.
              </p>
            )}
          </section>
        )}

        {/* ========================================================= */}
        {/* SECTION: KEUANGAN (TINGTING PARHEPENGON) */}
        {/* ========================================================= */}
        {activeSection === 'keuangan' && (
          <div className="space-y-4">
            {/* Rekapitulasi Saldo */}
            <section className="bg-white rounded-2xl border border-stone-200/90 shadow-xs p-4 sm:p-5 space-y-4">
              <div className="flex items-start justify-between gap-2 border-b border-stone-100 pb-3">
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-[#0B2545]">
                    Tingting Parhepengon
                  </h2>
                  <p className="text-xs text-stone-500 flex items-center gap-1 mt-0.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Laporan Seimbang · Masuk &amp; Keluar Terverifikasi</span>
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-[11px] font-semibold text-stone-500 uppercase">
                    Saldo Akhir Total
                  </div>
                  <div className="text-base sm:text-lg font-extrabold text-emerald-800 font-mono-num">
                    Rp {formatRupiah(rekapitulasi.total_saldo_akhir)}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5 text-xs">
                <div className="p-3 rounded-xl bg-stone-50 border border-stone-200/70">
                  <div className="text-[11px] font-bold text-[#0B2545] uppercase">Kas Huria</div>
                  <div className="text-sm sm:text-base font-extrabold text-stone-900 font-mono-num mt-0.5">
                    Rp {formatRupiah(rekapitulasi.huria.saldo_akhir)}
                  </div>
                  <div className="text-[11px] text-stone-500 font-mono-num">
                    Awal: Rp {formatRupiah(rekapitulasi.huria.saldo_awal)}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-stone-50 border border-stone-200/70">
                  <div className="text-[11px] font-bold text-rose-800 uppercase">Kas Sosial</div>
                  <div className="text-sm sm:text-base font-extrabold text-stone-900 font-mono-num mt-0.5">
                    Rp {formatRupiah(rekapitulasi.sosial.saldo_akhir)}
                  </div>
                  <div className="text-[11px] text-stone-500 font-mono-num">
                    Awal: Rp {formatRupiah(rekapitulasi.sosial.saldo_awal)}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-stone-50 border border-stone-200/70">
                  <div className="text-[11px] font-bold text-emerald-800 uppercase">
                    Pembangunan
                  </div>
                  <div className="text-sm sm:text-base font-extrabold text-stone-900 font-mono-num mt-0.5">
                    Rp {formatRupiah(rekapitulasi.pembangunan.saldo_akhir)}
                  </div>
                  <div className="text-[11px] text-stone-500 font-mono-num">
                    Awal: Rp {formatRupiah(rekapitulasi.pembangunan.saldo_awal)}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200/80">
                  <div className="text-[11px] font-bold text-amber-900 uppercase">
                    Sentralisasi 55%
                  </div>
                  <div className="text-sm sm:text-base font-extrabold text-amber-950 font-mono-num mt-0.5">
                    Rp {formatRupiah(rekapitulasi.sentralisasi.saldo_akhir)}
                  </div>
                  <div className="text-[11px] text-amber-800 font-mono-num">
                    Awal: Rp {formatRupiah(rekapitulasi.sentralisasi.saldo_awal)}
                  </div>
                </div>

                <div className="col-span-2 p-3 rounded-xl bg-stone-50 border border-stone-200/70 flex items-center justify-between gap-2">
                  <div>
                    <div className="text-[11px] font-bold text-indigo-800 uppercase">Transitori</div>
                    <div className="text-[11px] text-stone-500 font-mono-num">
                      Awal: Rp {formatRupiah(rekapitulasi.transitori.saldo_awal)}
                    </div>
                  </div>
                  <div className="text-sm sm:text-base font-extrabold text-stone-900 font-mono-num">
                    Rp {formatRupiah(rekapitulasi.transitori.saldo_akhir)}
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-stone-100 flex flex-wrap items-center justify-between gap-2 text-xs text-stone-600 font-mono-num">
                <span>Penerimaan: Rp {formatRupiah(rekapitulasi.total_masuk)}</span>
                <span>Pengeluaran: Rp {formatRupiah(rekapitulasi.total_keluar)}</span>
              </div>
            </section>

            {/* Rincian Penerimaan */}
            <section className="bg-white rounded-2xl border border-stone-200/90 shadow-xs p-4 sm:p-5 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 pb-3">
                <h3 className="text-base font-bold text-[#0B2545]">Rincian Penerimaan</h3>
                <button
                  type="button"
                  onClick={() => setShowZeroPenerimaan((v) => !v)}
                  className="min-h-[38px] px-3 py-1.5 rounded-xl border border-stone-300 bg-stone-50 text-xs font-semibold text-stone-700 cursor-pointer"
                >
                  {showZeroPenerimaan ? 'Sembunyikan Rp 0' : 'Tampilkan Pos Rp 0'}
                </button>
              </div>

              <div className="relative">
                <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  placeholder="Cari pos penerimaan..."
                  value={keuanganSearch}
                  onChange={(e) => setKeuanganSearch(e.target.value)}
                  className="w-full min-h-[44px] pl-10 pr-3 py-2 text-sm border border-stone-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#0B2545]"
                />
              </div>

              <div className="divide-y divide-stone-100">
                {filteredPenerimaan.length === 0 ? (
                  <p className="py-6 text-center text-sm text-stone-500">
                    Tidak ada pos penerimaan yang sesuai.
                  </p>
                ) : (
                  filteredPenerimaan.map((p, idx) => {
                    const splits: string[] = [];
                    if (p.huria_45 > 0) splits.push(`Huria Rp ${formatRupiah(p.huria_45)}`);
                    if (p.sosial > 0) splits.push(`Sosial Rp ${formatRupiah(p.sosial)}`);
                    if (p.pembangunan > 0) splits.push(`Pemb Rp ${formatRupiah(p.pembangunan)}`);
                    if (p.sentral_55 > 0) splits.push(`Sentral 55% Rp ${formatRupiah(p.sentral_55)}`);
                    if (p.transitori > 0) splits.push(`Transitori Rp ${formatRupiah(p.transitori)}`);

                    return (
                      <div key={p.id || idx} className="py-3 space-y-1">
                        <div className="flex items-start justify-between gap-3">
                          <span className="text-sm font-semibold text-stone-900 break-words leading-snug">
                            {p.no_tampilan || `${idx + 1}.`} {p.uraian}
                          </span>
                          <span className="text-sm font-bold text-[#0B2545] font-mono-num whitespace-nowrap shrink-0">
                            Rp {formatRupiah(p.jumlah)}
                          </span>
                        </div>
                        {splits.length > 0 && (
                          <div className="text-xs text-stone-500 font-mono-num">
                            {splits.join(' · ')}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </section>

            {/* Pelean Taon */}
            {pelean_taon.length > 0 && (
              <section className="bg-white rounded-2xl border border-stone-200/90 shadow-xs p-4 sm:p-5 space-y-3">
                <div className="flex items-center justify-between gap-2 flex-wrap border-b border-stone-100 pb-2.5">
                  <h3 className="text-base font-bold text-[#0B2545]">B. Rincian Pelean Taon</h3>
                  <span className="text-sm font-bold text-[#0B2545] font-mono-num shrink-0">
                    Rp {formatRupiah(pelean_taon.reduce((a, c) => a + c.jumlah, 0))}
                  </span>
                </div>
                <div className="divide-y divide-stone-100">
                  {pelean_taon.map((pt, idx) => (
                    <div key={pt.id || idx} className="py-2.5 flex items-center justify-between gap-2 text-sm">
                      <span className="text-stone-800 break-words">
                        {pt.nama} <span className="text-stone-500 text-xs">({pt.lingkungan})</span>
                      </span>
                      <span className="font-mono-num font-bold text-stone-900 shrink-0">
                        Rp {formatRupiah(pt.jumlah)}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Hamauliateon */}
            {hamauliateon.length > 0 && (
              <section className="bg-white rounded-2xl border border-stone-200/90 shadow-xs p-4 sm:p-5 space-y-3">
                <div className="flex items-center justify-between gap-2 flex-wrap border-b border-stone-100 pb-2.5">
                  <h3 className="text-base font-bold text-[#0B2545]">C. Rincian Hamauliateon</h3>
                  <span className="text-sm font-bold text-[#0B2545] font-mono-num shrink-0">
                    Rp {formatRupiah(hamauliateon.reduce((a, c) => a + c.jumlah, 0))}
                  </span>
                </div>
                <div className="divide-y divide-stone-100">
                  {hamauliateon.map((ham, idx) => {
                    const alokasi: string[] = [];
                    if (ham.ke_huria) alokasi.push(`Huria Rp ${formatRupiah(ham.ke_huria)}`);
                    if (ham.ke_sosial) alokasi.push(`Sosial Rp ${formatRupiah(ham.ke_sosial)}`);
                    if (ham.ke_pembangunan) alokasi.push(`Bangunan Rp ${formatRupiah(ham.ke_pembangunan)}`);
                    if (ham.ke_sentralisasi) alokasi.push(`Sentral 55% Rp ${formatRupiah(ham.ke_sentralisasi)}`);

                    const transList = getHamauliateonTransitoriList(ham).filter((t) => t.jumlah > 0);
                    for (const t of transList) {
                      alokasi.push(
                        `${t.uraian ? `Transitori ${t.uraian}` : 'Transitori'} Rp ${formatRupiah(t.jumlah)}`
                      );
                    }

                    return (
                      <div key={ham.id || idx} className="py-3 space-y-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="text-sm font-bold text-stone-900 break-words">
                            {ham.nama}
                            {ham.wijk && (
                              <span className="text-xs font-normal text-stone-500 ml-1">
                                (Wijk {ham.wijk})
                              </span>
                            )}
                          </div>
                          <span className="text-sm font-bold text-[#0B2545] font-mono-num whitespace-nowrap shrink-0">
                            Rp {formatRupiah(ham.jumlah)}
                          </span>
                        </div>
                        {ham.rincian && (
                          <p className="text-xs text-stone-600 break-words">{ham.rincian}</p>
                        )}
                        {alokasi.length > 0 && (
                          <p className="text-xs text-stone-500 font-mono-num">{alokasi.join(' · ')}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Sumbangan Natal Diakoni Sosial */}
            {warta.tampilkan_sumbangan_natal !== false && sumbangan_natal.length > 0 && (
              <section className="bg-white rounded-2xl border border-stone-200/90 shadow-xs p-4 sm:p-5 space-y-3">
                <div className="flex items-center justify-between gap-2 flex-wrap border-b border-stone-100 pb-2.5">
                  <div>
                    <h3 className="text-base font-bold text-[#0B2545]">
                      Sumbangan Natal Diakoni Sosial
                    </h3>
                    <p className="text-xs text-stone-500">Masuk ke Kas Sosial Huria</p>
                  </div>
                  <span className="text-sm font-bold text-rose-800 font-mono-num shrink-0">
                    Rp {formatRupiah(sumbanganTotal)}
                  </span>
                </div>
                <div className="divide-y divide-stone-100">
                  {sumbangan_natal.map((sn, idx) => (
                    <div key={sn.id || idx} className="py-2.5 flex items-center justify-between gap-2 text-sm">
                      <span className="text-stone-800 break-words">
                        {idx + 1}. {sn.nama || '-'}
                        {sn.lingkungan && (
                          <span className="text-xs text-stone-500 ml-1">({sn.lingkungan})</span>
                        )}
                      </span>
                      <span className="font-mono-num font-bold text-stone-900 shrink-0">
                        Rp {formatRupiah(sn.jumlah)}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Pengeluaran */}
            {printablePengeluaran.length > 0 && (
              <section className="bg-white rounded-2xl border border-stone-200/90 shadow-xs p-4 sm:p-5 space-y-3">
                <div className="flex items-center justify-between gap-2 flex-wrap border-b border-stone-100 pb-2.5">
                  <h3 className="text-base font-bold text-rose-900">Rincian Pengeluaran</h3>
                  <span className="text-sm font-bold text-rose-800 font-mono-num shrink-0">
                    Rp {formatRupiah(rekapitulasi.total_keluar)}
                  </span>
                </div>
                <div className="divide-y divide-stone-100">
                  {printablePengeluaran.map((pg, idx) => {
                    const totalPg =
                      (pg.huria || 0) +
                      (pg.sosial || 0) +
                      (pg.pembangunan || 0) +
                      (pg.transitori || 0) +
                      (pg.sentralisasi || 0);
                    const posList: string[] = [];
                    if (pg.huria) posList.push(`Huria Rp ${formatRupiah(pg.huria)}`);
                    if (pg.sentralisasi) posList.push(`Sentral 55% Rp ${formatRupiah(pg.sentralisasi)}`);
                    if (pg.pembangunan) posList.push(`Pemb Rp ${formatRupiah(pg.pembangunan)}`);
                    if (pg.sosial) posList.push(`Sosial Rp ${formatRupiah(pg.sosial)}`);
                    if (pg.transitori) posList.push(`Transitori Rp ${formatRupiah(pg.transitori)}`);
                    return (
                      <div key={pg.id || idx} className="py-2.5 space-y-1">
                        <div className="flex items-start justify-between gap-2 text-sm">
                          <span className="font-semibold text-stone-900 break-words">
                            {idx + 1}. {pg.uraian}
                          </span>
                          <span className="font-mono-num font-bold text-rose-900 shrink-0">
                            Rp {formatRupiah(totalPg)}
                          </span>
                        </div>
                        {posList.length > 0 && (
                          <div className="text-xs text-stone-500 font-mono-num">
                            {posList.join(' · ')}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {pengaturan?.teks_penutup_keuangan && (
              <p className="p-4 bg-white rounded-2xl border border-stone-200 text-sm text-stone-600 font-serif-body italic text-center">
                "{pengaturan.teks_penutup_keuangan}"
              </p>
            )}

            {/* Pemakai Sopo Godang */}
            <section className="bg-white rounded-2xl border border-stone-200/90 shadow-xs p-4 sm:p-5 space-y-3">
              <div className="flex items-center justify-between gap-2 flex-wrap border-b border-stone-100 pb-2.5">
                <h3 className="text-base font-bold text-[#0B2545]">Daftar Pemakai Sopo Godang</h3>
                <span className="text-xs font-semibold text-stone-500 shrink-0">
                  {sopo_godang.filter((s) => s.nama && s.nama !== '-').length} Jadwal
                </span>
              </div>
              {sopo_godang.length > 0 ? (
                <div className="divide-y divide-stone-100">
                  {sopo_godang.map((sg, idx) => (
                    <div key={sg.id || idx} className="py-2.5 space-y-0.5">
                      <div className="text-sm font-semibold text-stone-900">
                        {idx + 1}. {sg.nama || '-'}
                      </div>
                      <div className="text-xs text-stone-500">{sg.tanggal || '-'}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-stone-500 py-3 text-center">
                  Ndang adong jadwal pemakaian Sopo Godang di periode on.
                </p>
              )}
            </section>
          </div>
        )}

        {/* ========================================================= */}
        {/* SECTION: JADWAL TETAP HURIA */}
        {/* ========================================================= */}
        {activeSection === 'jadwal' && (
          <section className="bg-white rounded-2xl border border-stone-200/90 shadow-xs p-4 sm:p-6 space-y-3">
            <div className="border-b border-stone-100 pb-3">
              <h2 className="text-base sm:text-lg font-bold text-[#0B2545] flex items-center gap-2">
                <Clock className="w-5 h-5 shrink-0" />
                <span>Jadwal Panghobasion Tetap</span>
              </h2>
              <p className="text-xs text-stone-500 mt-0.5">
                Jadwal rutin ibadah minggu, partangiangan, dan kategorial HKBP Hutaraja
              </p>
            </div>

            <div className="divide-y divide-stone-100">
              {jadwalTetap.map((jt) => (
                <div key={jt.id} className="py-3 space-y-1">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-sm font-bold text-stone-900">{jt.label}</span>
                    <span className="text-[11px] font-semibold uppercase text-[#0B2545] shrink-0">
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
        )}
      </div>
    </div>
  );
};
