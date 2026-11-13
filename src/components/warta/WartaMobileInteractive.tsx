import React, { useState } from 'react';
import { FullWartaData, PengaturanHuria, JadwalTetapItem } from '../../types';
import { formatRupiah } from '../../lib/format';
import { getPrintablePenerimaanRows, getPrintablePengeluaranRows } from '../../lib/financialMath';
import { formatTanggalIndo, formatTanggalLengkap } from '../../lib/dateUtils';
import { OFFICIAL_HKBP_MINGGU_LITURGI } from '../../lib/masterMingguData';
import { getLiturgiColorBadge } from '../common/MingguLiturgiDropdown';
import {
  BookOpen,
  Bell,
  DollarSign,
  Calendar,
  Users,
  Cake,
  Music,
  MapPin,
  Clock,
  Search,
  Filter,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Share2,
  FileText,
  Sparkles,
  HeartHandshake,
  ShieldCheck,
  Building
} from 'lucide-react';

interface WartaMobileInteractiveProps {
  data: FullWartaData;
  pengaturan?: PengaturanHuria;
  jadwalTetap?: JadwalTetapItem[];
}

export const WartaMobileInteractive: React.FC<WartaMobileInteractiveProps> = ({
  data,
  pengaturan,
  jadwalTetap = []
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
    pengeluaran,
    ulang_tahun,
    rekapitulasi
  } = data;

  const [activeSection, setActiveSection] = useState<'liturgi' | 'warta' | 'keuangan' | 'jadwal'>('liturgi');
  const [ultahSearch, setUltahSearch] = useState('');
  const [ultahWijkFilter, setUltahWijkFilter] = useState('all');
  const [keuanganSearch, setKeuanganSearch] = useState('');
  const [showZeroPenerimaan, setShowZeroPenerimaan] = useState(false);
  const [showPartangianganLiturgi, setShowPartangianganLiturgi] = useState(false);
  const [showSopoGodang, setShowSopoGodang] = useState(false);

  // Filtered birthdays
  const filteredUltah = ulang_tahun.filter((u) => {
    const matchName = u.nama.toLowerCase().includes(ultahSearch.toLowerCase());
    const matchWijk = ultahWijkFilter === 'all' || u.wijk === ultahWijkFilter;
    return matchName && matchWijk;
  });

  // Filtered Penerimaan (hide Rp 0 by default so public sees only active transactions)
  const basePenerimaan = showZeroPenerimaan ? penerimaan : getPrintablePenerimaanRows(penerimaan);
  const filteredPenerimaan = basePenerimaan.filter((p) =>
    p.uraian.toLowerCase().includes(keuanganSearch.toLowerCase()) ||
    (p.no_tampilan || '').toLowerCase().includes(keuanganSearch.toLowerCase())
  );
  const printablePengeluaran = getPrintablePengeluaranRows(pengeluaran);

  return (
    <div className="w-full space-y-5 animate-in fade-in">
      {/* 1. HERO CARD: THEME MODERN NAVY & GOLD */}
      <div className="bg-gradient-to-br from-[#0B2545] via-[#10335C] to-[#071A2F] text-white p-5 sm:p-6 rounded-2xl shadow-lg border border-amber-500/30 relative overflow-hidden">
        {/* Subtle decorative glow */}
        <div className="absolute -right-12 -top-12 w-44 h-44 bg-amber-400/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 space-y-3">
          {(() => {
            const cleanGoar = (warta.goar_minggu || '').trim().toUpperCase();
            const infoLiturgi = OFFICIAL_HKBP_MINGGU_LITURGI.find(
              (m) =>
                m.nama_minggu.toUpperCase() === cleanGoar ||
                `MINGGU ${m.nama_minggu.toUpperCase()}` === cleanGoar ||
                cleanGoar === `MINGGU ${m.nama_minggu.toUpperCase()}`
            );
            const badge = getLiturgiColorBadge(infoLiturgi?.warna_liturgi);

            return (
              <>
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-amber-300">
                  <span className="font-bold tracking-wider uppercase text-[11px]">
                    HKBP RESSORT HUTARAJA · DISTRIK VI DAIRI
                  </span>
                  <div className="flex items-center gap-1.5">
                    {infoLiturgi?.warna_liturgi && (
                      <span className="px-2 py-0.5 rounded-full bg-white/20 text-white text-[10px] font-bold flex items-center gap-1 border border-white/25">
                        <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                        <span>Langgatan: {infoLiturgi.warna_liturgi}</span>
                      </span>
                    )}
                    <span className="px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 text-[10px] font-semibold">
                      Warta Resmi
                    </span>
                  </div>
                </div>

                <div>
                  <h2 className="text-2xl sm:text-3xl font-display font-extrabold uppercase text-white tracking-wide">
                    MINGGU {warta.goar_minggu}
                  </h2>
                  {infoLiturgi?.arti_batak && infoLiturgi.arti_batak !== '-' && (
                    <div className="text-xs text-amber-200/90 italic font-serif-body mt-0.5">
                      "{infoLiturgi.arti_batak}"
                    </div>
                  )}
                  <div className="text-xs sm:text-sm text-stone-300 flex items-center gap-1.5 mt-1">
                    <Calendar className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>{formatTanggalLengkap(warta.tanggal_minggu)}</span>
                  </div>
                </div>
              </>
            );
          })()}

          {warta.topik_minggu && (
            <div className="p-3 bg-white/10 backdrop-blur-xs rounded-xl border border-white/15">
              <div className="text-[10px] uppercase font-bold text-amber-300 mb-0.5">Topik Minggu:</div>
              <p className="text-xs sm:text-sm text-amber-100 font-serif-body italic leading-snug">
                "{warta.topik_minggu}"
              </p>
            </div>
          )}

          {/* Ayat Teks Mingguan */}
          {warta.ayat_teks && (
            <div className="p-3.5 bg-black/25 backdrop-blur-xs rounded-xl border border-white/10 text-xs space-y-1">
              <div className="text-[10px] uppercase font-bold text-stone-300">Ayat Pegangan:</div>
              <p className="text-stone-100 font-serif-body italic leading-relaxed">
                "{warta.ayat_teks}"
              </p>
              {warta.ayat_ref && (
                <div className="text-right text-[11px] font-bold text-amber-300">
                  — {warta.ayat_ref}
                </div>
              )}
            </div>
          )}

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-3 gap-2 pt-1 text-center">
            <div className="bg-white/10 backdrop-blur-xs p-2 rounded-xl border border-white/10">
              <div className="text-[10px] text-stone-300">Ruas Hadir</div>
              <div className="text-sm font-bold text-white font-mono-num">
                {(warta.ruas_sm || 0) + (warta.ruas_pagi || 0) + (warta.ruas_siang || 0)} Jiwa
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur-xs p-2 rounded-xl border border-white/10">
              <div className="text-[10px] text-stone-300">Ulang Tahun</div>
              <div className="text-sm font-bold text-pink-300 font-mono-num">
                {ulang_tahun.length} Ruas
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur-xs p-2 rounded-xl border border-white/10">
              <div className="text-[10px] text-stone-300">Partangiangan</div>
              <div className="text-sm font-bold text-amber-300 font-mono-num">
                {jadwal_partangiangan.length} Wijk
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. MODERN SEGMENTED SECTION NAVIGATION */}
      <div className="sticky top-[56px] sm:top-[62px] z-20 bg-stone-100/95 backdrop-blur-md py-2 -mx-1 px-1">
        <div className="grid grid-cols-4 gap-1 p-1 bg-white rounded-xl border border-stone-200 shadow-xs">
          <button
            onClick={() => setActiveSection('liturgi')}
            className={`flex flex-col sm:flex-row items-center justify-center gap-1 py-2 px-1 rounded-lg text-[11px] sm:text-xs font-bold transition cursor-pointer min-h-[44px] ${
              activeSection === 'liturgi'
                ? 'bg-[#0B2545] text-white shadow-xs'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-50'
            }`}
          >
            <BookOpen className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="truncate max-w-full">Ibadah</span>
          </button>

          <button
            onClick={() => setActiveSection('warta')}
            className={`flex flex-col sm:flex-row items-center justify-center gap-1 py-2 px-1 rounded-lg text-[11px] sm:text-xs font-bold transition cursor-pointer min-h-[44px] ${
              activeSection === 'warta'
                ? 'bg-[#0B2545] text-white shadow-xs'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-50'
            }`}
          >
            <Bell className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="truncate max-w-full">Tingting</span>
          </button>

          <button
            onClick={() => setActiveSection('keuangan')}
            className={`flex flex-col sm:flex-row items-center justify-center gap-1 py-2 px-1 rounded-lg text-[11px] sm:text-xs font-bold transition cursor-pointer min-h-[44px] ${
              activeSection === 'keuangan'
                ? 'bg-[#0B2545] text-white shadow-xs'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-50'
            }`}
          >
            <DollarSign className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="truncate max-w-full">Keuangan</span>
          </button>

          <button
            onClick={() => setActiveSection('jadwal')}
            className={`flex flex-col sm:flex-row items-center justify-center gap-1 py-2 px-1 rounded-lg text-[11px] sm:text-xs font-bold transition cursor-pointer min-h-[44px] ${
              activeSection === 'jadwal'
                ? 'bg-[#0B2545] text-white shadow-xs'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-50'
            }`}
          >
            <Clock className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="truncate max-w-full">Jadwal</span>
          </button>
        </div>
      </div>

      {/* ============================================================= */}
      {/* SECTION 1: TATA IBADAH & PARHOBAS */}
      {/* ============================================================= */}
      {activeSection === 'liturgi' && (
        <div className="space-y-5">
          {/* Parhobas Cards */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-stone-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-stone-100 pb-2.5">
              <h3 className="font-bold text-stone-900 text-sm flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-800" />
                Parhobas Ibadah Minggu
              </h3>
              <span className="text-[11px] text-stone-500 font-medium">SKM & Sesi I - II</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
              {parhobas.map((p, idx) => (
                <div
                  key={p.id || idx}
                  className="p-2.5 bg-stone-50 hover:bg-blue-50/50 rounded-xl border border-stone-200/80 transition space-y-1"
                >
                  <div className="font-bold text-blue-900 uppercase text-[11px] tracking-wide">
                    {p.peran}
                  </div>
                  <div className="grid grid-cols-3 gap-1 text-[11px] text-stone-700">
                    <div>
                      <span className="text-stone-400 block text-[9px] uppercase font-bold">SKM</span>
                      <span className="font-semibold text-stone-800 truncate block">{p.skm || '-'}</span>
                    </div>
                    <div>
                      <span className="text-stone-400 block text-[9px] uppercase font-bold">Sesi 1 (08.30)</span>
                      <span className="font-semibold text-stone-800 truncate block">{p.sesi1 || '-'}</span>
                    </div>
                    <div>
                      <span className="text-stone-400 block text-[9px] uppercase font-bold">Sesi 2 (10.30)</span>
                      <span className="font-semibold text-stone-800 truncate block">{p.sesi2 || '-'}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Koor Group Hari Ini */}
            {(warta.markoor_1 || warta.markoor_2) && (
              <div className="pt-2 border-t border-stone-100 text-xs text-stone-700 space-y-1">
                <div className="font-bold text-stone-900 text-[11px] flex items-center gap-1.5">
                  <Music className="w-3.5 h-3.5 text-blue-700" /> Koor Ibadah Hari Ini:
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                  {warta.markoor_1 && (
                    <div className="p-2 bg-blue-50/70 rounded-lg border border-blue-200 text-blue-900 font-medium">
                      <strong>Sesi 1 (Pagi):</strong> {warta.markoor_1}
                    </div>
                  )}
                  {warta.markoor_2 && (
                    <div className="p-2 bg-blue-50/70 rounded-lg border border-blue-200 text-blue-900 font-medium">
                      <strong>Sesi 2 (Siang):</strong> {warta.markoor_2}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Susunan Acara Ibadah Minggu */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-stone-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-stone-100 pb-2.5">
              <div>
                <h3 className="font-bold text-stone-900 text-sm flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-blue-800" />
                  Susunan Tata Ibadah Minggu
                </h3>
                <p className="text-[11px] text-stone-500">
                  Liturgi resmi Huria Kristen Batak Protestan (HKBP)
                </p>
              </div>
              <span className="text-[10px] px-2 py-0.5 bg-blue-100 text-blue-900 font-bold rounded-full">
                {acara_minggu.length} Acara
              </span>
            </div>

            <div className="divide-y divide-stone-100">
              {acara_minggu.map((item, idx) => (
                <div
                  key={item.id || idx}
                  className="py-2.5 flex items-start justify-between gap-3 hover:bg-stone-50/80 px-1 rounded-lg transition"
                >
                  <div className="flex items-start gap-2.5 flex-1 min-w-0">
                    <span className="w-5 h-5 rounded-full bg-blue-50 text-blue-900 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5 font-mono-num">
                      {idx + 1}
                    </span>
                    <span className="text-xs sm:text-sm font-semibold text-stone-900 leading-snug">
                      {item.uraian}
                    </span>
                  </div>

                  {item.keterangan && (
                    <span
                      className={`text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded shrink-0 whitespace-nowrap ${
                        item.keterangan.toLowerCase().includes('jongjong')
                          ? 'bg-amber-100 text-amber-900 border border-amber-300'
                          : item.keterangan.toLowerCase().includes('pel')
                          ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                          : 'bg-stone-100 text-stone-700'
                      }`}
                    >
                      {item.keterangan}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Acara Partangiangan Accordion */}
          <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
            <button
              onClick={() => setShowPartangianganLiturgi(!showPartangianganLiturgi)}
              className="w-full p-4 flex items-center justify-between text-left hover:bg-stone-50 transition cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Building className="w-4 h-4 text-stone-700" />
                <div>
                  <h4 className="font-bold text-xs sm:text-sm text-stone-900">
                    Susunan Acara Partangiangan Lingkungan
                  </h4>
                  <p className="text-[11px] text-stone-500">
                    Tata ibadah persekutuan keluarga di wijk ({acara_partangiangan.length} baris)
                  </p>
                </div>
              </div>
              {showPartangianganLiturgi ? (
                <ChevronUp className="w-4 h-4 text-stone-500" />
              ) : (
                <ChevronDown className="w-4 h-4 text-stone-500" />
              )}
            </button>

            {showPartangianganLiturgi && (
              <div className="p-4 pt-0 border-t border-stone-100 divide-y divide-stone-100">
                {acara_partangiangan.map((ap, idx) => (
                  <div key={ap.id || idx} className="py-2 flex items-center justify-between text-xs gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-stone-400 font-mono-num w-5 text-right">{idx + 1}.</span>
                      <span className="font-medium text-stone-800">{ap.uraian}</span>
                    </div>
                    {ap.keterangan && (
                      <span className="text-[10px] text-stone-500 font-semibold px-2 py-0.5 bg-stone-100 rounded">
                        {ap.keterangan}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* SECTION 2: TINGTING NAMARRAGAM & ULANG TAHUN */}
      {/* ============================================================= */}
      {activeSection === 'warta' && (
        <div className="space-y-5">
          {/* 1. Ulang Tahun Ruas Card */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-stone-200 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-pink-50 text-pink-700 flex items-center justify-center shrink-0">
                  <Cake className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-stone-900 text-sm sm:text-base">
                    Ruas na Marulang Tahun di Minggu On
                  </h3>
                  <p className="text-[11px] text-stone-500">
                    Warga jemaat yang berulang tahun pada periode warta minggu ini
                  </p>
                </div>
              </div>
              <span className="text-xs font-bold px-2.5 py-1 bg-pink-100 text-pink-800 rounded-full font-mono-num">
                {ulang_tahun.length} Jemaat
              </span>
            </div>

            {/* Biblical Blessing Jesayas 40:31 */}
            {pengaturan?.teks_ucapan_ulang_tahun && (
              <div className="p-3 bg-pink-50/70 border border-pink-200/80 rounded-xl text-xs text-pink-950 font-serif-body italic leading-relaxed">
                "{pengaturan.teks_ucapan_ulang_tahun}"
              </div>
            )}

            {/* Filter & Search */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="relative">
                <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Cari nama jemaat..."
                  value={ultahSearch}
                  onChange={(e) => setUltahSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs border border-stone-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-600 bg-white"
                />
              </div>
              <select
                value={ultahWijkFilter}
                onChange={(e) => setUltahWijkFilter(e.target.value)}
                className="px-2.5 py-1.5 text-xs border border-stone-300 rounded-lg bg-white"
              >
                <option value="all">Semua Wijk / Lingkungan</option>
                {Array.from(new Set(ulang_tahun.map((u) => u.wijk))).map((w) => (
                  <option key={w} value={w}>
                    {w}
                  </option>
                ))}
              </select>
            </div>

            {/* Birthdays Grid / Cards */}
            {filteredUltah.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {filteredUltah.map((u, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-stone-50 hover:bg-pink-50/40 rounded-xl border border-stone-200/80 transition flex items-center justify-between gap-3"
                  >
                    <div className="space-y-0.5 min-w-0">
                      <div className="font-bold text-stone-900 text-xs sm:text-sm truncate">
                        {u.nama}
                      </div>
                      <div className="text-[11px] text-stone-500 flex items-center gap-2">
                        <span className="font-semibold text-blue-900">{u.wijk}</span>
                        <span>·</span>
                        <span className="font-bold text-stone-700 font-mono-num">{u.hari_bulan}</span>
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <span className="inline-block px-2 py-0.5 bg-pink-100 text-pink-900 text-xs font-extrabold rounded-md font-mono-num">
                        {u.usia} Thn
                      </span>
                      <span className="text-[10px] text-stone-400 block mt-0.5">
                        {u.jenis_kelamin === 'L' ? 'Laki-laki' : 'Perempuan'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center text-xs text-stone-400 italic bg-stone-50 rounded-xl border border-dashed border-stone-200">
                Tidak ada data jemaat yang berulang tahun sesuai pencarian.
              </div>
            )}
          </div>

          {/* 2. Jadwal Koor Minggu na Naeng Ro */}
          {(warta.koor_pagi || warta.koor_siang) && (
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-stone-200 shadow-xs space-y-3">
              <div className="flex items-center gap-2 border-b border-stone-100 pb-2.5">
                <Music className="w-4 h-4 text-blue-700" />
                <h3 className="font-bold text-stone-900 text-sm">
                  Jadwal na Markoor di Minggu na Naeng Ro
                </h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {warta.koor_pagi && (
                  <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-200 text-blue-950 space-y-1">
                    <span className="text-[10px] font-bold uppercase text-blue-800 tracking-wider block">
                      Ibadah Pagi (08.30 WIB)
                    </span>
                    <p className="font-semibold">{warta.koor_pagi}</p>
                  </div>
                )}
                {warta.koor_siang && (
                  <div className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-200 text-indigo-950 space-y-1">
                    <span className="text-[10px] font-bold uppercase text-indigo-800 tracking-wider block">
                      Ibadah Siang (10.30 WIB)
                    </span>
                    <p className="font-semibold">{warta.koor_siang}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 3. Jadwal Partangiangan Lingkungan */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-stone-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-stone-100 pb-2.5">
              <h3 className="font-bold text-stone-900 text-sm flex items-center gap-2">
                <MapPin className="w-4 h-4 text-blue-800" />
                Jadwal Partangiangan Lingkungan (Wijk)
              </h3>
              <span className="text-[10px] text-stone-500 font-medium">Minggu Ini</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
              {jadwal_partangiangan.map((jp, idx) => (
                <div
                  key={jp.id || idx}
                  className="p-3 bg-stone-50 rounded-xl border border-stone-200 space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-stone-900 text-xs sm:text-sm">
                      {jp.lingkungan}
                    </span>
                    <span className="text-[11px] font-semibold text-blue-800 bg-blue-50 px-2 py-0.5 rounded">
                      {jp.hari}, {jp.pukul}
                    </span>
                  </div>
                  <div className="text-[11px] text-stone-600 flex items-center gap-1.5 pt-0.5">
                    <span className="font-semibold text-stone-800">Inganan:</span>
                    <span className="font-medium text-stone-900">{jp.inganan}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 4. Pengumuman / Warta Huria */}
          {pengumuman && pengumuman.length > 0 && (
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-stone-200 shadow-xs space-y-3">
              <div className="flex items-center gap-2 border-b border-stone-100 pb-2.5">
                <FileText className="w-4 h-4 text-blue-800" />
                <h3 className="font-bold text-stone-900 text-sm">
                  Warta & Tingting na Marragam
                </h3>
              </div>
              <div className="space-y-2.5">
                {pengumuman.map((p, idx) => (
                  <div
                    key={p.id || idx}
                    className="p-3.5 bg-stone-50 rounded-xl border border-stone-200 space-y-1"
                  >
                    <div className="font-bold text-stone-900 text-xs sm:text-sm">
                      {idx + 1}. {p.judul}
                    </div>
                    <p className="text-xs text-stone-700 whitespace-pre-line leading-relaxed">
                      {p.isi}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================================= */}
      {/* SECTION 3: TINGTING PARHEPENGON (KEUANGAN) */}
      {/* ============================================================= */}
      {activeSection === 'keuangan' && (
        <div className="space-y-5">
          {/* Kas Rekapitulasi Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
            <div className="bg-white p-3.5 rounded-2xl border border-stone-200 shadow-xs text-center space-y-1">
              <span className="text-[10px] uppercase font-bold text-blue-800 block">
                Kas Huria
              </span>
              <div className="text-sm sm:text-base font-extrabold text-stone-900 font-mono-num">
                Rp {formatRupiah(rekapitulasi.huria.saldo_akhir)}
              </div>
              <div className="text-[10px] text-stone-500">
                Awal: Rp {formatRupiah(rekapitulasi.huria.saldo_awal)}
              </div>
            </div>

            <div className="bg-white p-3.5 rounded-2xl border border-stone-200 shadow-xs text-center space-y-1">
              <span className="text-[10px] uppercase font-bold text-rose-800 block">
                Kas Sosial
              </span>
              <div className="text-sm sm:text-base font-extrabold text-stone-900 font-mono-num">
                Rp {formatRupiah(rekapitulasi.sosial.saldo_akhir)}
              </div>
              <div className="text-[10px] text-stone-500">
                Awal: Rp {formatRupiah(rekapitulasi.sosial.saldo_awal)}
              </div>
            </div>

            <div className="bg-white p-3.5 rounded-2xl border border-stone-200 shadow-xs text-center space-y-1">
              <span className="text-[10px] uppercase font-bold text-emerald-800 block">
                Pembangunan
              </span>
              <div className="text-sm sm:text-base font-extrabold text-stone-900 font-mono-num">
                Rp {formatRupiah(rekapitulasi.pembangunan.saldo_akhir)}
              </div>
              <div className="text-[10px] text-stone-500">
                Awal: Rp {formatRupiah(rekapitulasi.pembangunan.saldo_awal)}
              </div>
            </div>

            <div className="bg-white p-3.5 rounded-2xl border border-amber-200 bg-amber-50/40 shadow-xs text-center space-y-1">
              <span className="text-[10px] uppercase font-bold text-amber-800 block">
                Sentralisasi (55%)
              </span>
              <div className="text-sm sm:text-base font-extrabold text-amber-950 font-mono-num">
                Rp {formatRupiah(rekapitulasi.sentralisasi.saldo_akhir)}
              </div>
              <div className="text-[10px] text-amber-700/80">
                Awal: Rp {formatRupiah(rekapitulasi.sentralisasi.saldo_awal)}
              </div>
            </div>

            <div className="bg-white p-3.5 rounded-2xl border border-stone-200 shadow-xs text-center space-y-1 col-span-2 sm:col-span-1">
              <span className="text-[10px] uppercase font-bold text-indigo-800 block">
                Transitori
              </span>
              <div className="text-sm sm:text-base font-extrabold text-stone-900 font-mono-num">
                Rp {formatRupiah(rekapitulasi.transitori.saldo_akhir)}
              </div>
              <div className="text-[10px] text-stone-500">
                Awal: Rp {formatRupiah(rekapitulasi.transitori.saldo_awal)}
              </div>
            </div>
          </div>

          {/* Grand Balance Banner */}
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0" />
              <div>
                <span className="font-bold text-emerald-950 block">Status Laporan Keuangan: SEIMBANG</span>
                <span className="text-[11px] text-emerald-800">
                  Total Penerimaan: Rp {formatRupiah(rekapitulasi.total_masuk)} · Total Pengeluaran: Rp {formatRupiah(rekapitulasi.total_keluar)}
                </span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-stone-500 uppercase block font-semibold">Total Saldo Kas Akhir</span>
              <span className="text-base font-extrabold text-emerald-900 font-mono-num">
                Rp {formatRupiah(rekapitulasi.total_saldo_akhir)}
              </span>
            </div>
          </div>

          {/* Penerimaan List */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-stone-200 shadow-xs space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 pb-2.5">
              <h3 className="font-bold text-stone-900 text-sm flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-700" />
                Rincian Penerimaan (Standar HKBP Hutaraja)
              </h3>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowZeroPenerimaan(!showZeroPenerimaan)}
                  className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg border transition cursor-pointer ${
                    showZeroPenerimaan
                      ? 'bg-blue-50 text-blue-800 border-blue-200'
                      : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100'
                  }`}
                >
                  {showZeroPenerimaan ? 'Sembunyikan Rp 0' : 'Tampilkan Pos Rp 0'}
                </button>
                <div className="relative min-w-[180px]">
                  <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-2" />
                  <input
                    type="text"
                    placeholder="Cari pos penerimaan..."
                    value={keuanganSearch}
                    onChange={(e) => setKeuanganSearch(e.target.value)}
                    className="w-full pl-8 pr-2.5 py-1 text-xs border border-stone-300 rounded-lg bg-stone-50 focus:bg-white"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              {filteredPenerimaan.length === 0 ? (
                <div className="text-center py-6 text-xs text-stone-400 italic">
                  Tidak ada pos penerimaan yang cocok atau memiliki transaksi.
                </div>
              ) : filteredPenerimaan.map((p, idx) => {
                const isSentral =
                  p.is_sentralisasi !== false &&
                  (p.is_sentralisasi === true || p.aturan_alokasi === 'split_45_55');
                const badges: string[] = [];
                if (p.huria_45 > 0) badges.push(`Huria: Rp ${formatRupiah(p.huria_45)}`);
                if (p.sosial > 0) badges.push(`Sosial: Rp ${formatRupiah(p.sosial)}`);
                if (p.pembangunan > 0) badges.push(`Pemb: Rp ${formatRupiah(p.pembangunan)}`);
                if (p.sentral_55 > 0) badges.push(`Sentral 55%: Rp ${formatRupiah(p.sentral_55)}`);
                if (p.transitori > 0) badges.push(`Transitori: Rp ${formatRupiah(p.transitori)}`);

                return (
                  <div
                    key={p.id || idx}
                    className="p-2.5 bg-stone-50 rounded-xl border border-stone-200/80 flex items-center justify-between gap-2 text-xs"
                  >
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-semibold text-stone-900 break-words">
                          {p.no_tampilan || `${idx + 1}.`} {p.uraian}
                        </span>
                        {isSentral && (
                          <span className="text-[9.5px] font-bold text-amber-900 bg-amber-100 px-1.5 py-0.2 rounded border border-amber-300">
                            Sentralisasi 55%
                          </span>
                        )}
                      </div>
                      {badges.length > 0 && (
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-stone-600">
                          {badges.map((b, bIdx) => (
                            <span key={bIdx}>{b}</span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="text-right font-mono-num font-bold text-stone-900 text-xs sm:text-sm shrink-0">
                      Rp {formatRupiah(p.jumlah)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Sub-tabel Pelean Taon & Hamauliateon */}
          {(pelean_taon.length > 0 || hamauliateon.length > 0) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {pelean_taon.length > 0 && (
                <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs space-y-2.5 text-xs">
                  <div className="flex items-center justify-between border-b border-stone-100 pb-2">
                    <span className="font-bold text-stone-900">B. Rincian Pelean Taon</span>
                    <span className="text-[11px] font-bold text-blue-900 font-mono-num">
                      Rp {formatRupiah(pelean_taon.reduce((a, c) => a + c.jumlah, 0))}
                    </span>
                  </div>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {pelean_taon.map((pt, idx) => (
                      <div key={pt.id || idx} className="flex items-center justify-between text-[11px] py-1 border-b border-stone-50">
                        <span className="font-medium text-stone-800">{pt.nama} ({pt.lingkungan})</span>
                        <span className="font-mono-num font-bold text-stone-900">Rp {formatRupiah(pt.jumlah)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {hamauliateon.length > 0 && (
                <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs space-y-2.5 text-xs">
                  <div className="flex items-center justify-between border-b border-stone-100 pb-2">
                    <span className="font-bold text-stone-900">C. Rincian Hamauliateon</span>
                    <span className="text-[11px] font-bold text-blue-900 font-mono-num">
                      Rp {formatRupiah(hamauliateon.reduce((a, c) => a + c.jumlah, 0))}
                    </span>
                  </div>
                  <div className="space-y-1 max-h-64 overflow-y-auto">
                    {hamauliateon.map((ham, idx) => {
                      const isHamSentral = true;
                      const posList: { label: string; amount: number; color: string }[] = [];
                      if (ham.ke_huria && ham.ke_huria > 0) {
                        const sentralPart = isHamSentral ? Math.round(ham.ke_huria * 0.55) : 0;
                        const huriaPart = ham.ke_huria - sentralPart;
                        const label = isHamSentral
                          ? `Ke Huria (45%: Rp ${formatRupiah(huriaPart)} · Sentral 55%: Rp ${formatRupiah(sentralPart)})`
                          : 'Ke Huria';
                        posList.push({ label, amount: ham.ke_huria, color: 'bg-emerald-50 text-emerald-800 border-emerald-200' });
                      }
                      if (ham.ke_sosial && ham.ke_sosial > 0) {
                        posList.push({ label: 'Ke Sosial', amount: ham.ke_sosial, color: 'bg-sky-50 text-sky-800 border-sky-200' });
                      }
                      if (ham.ke_pembangunan && ham.ke_pembangunan > 0) {
                        posList.push({ label: 'Ke Bangunan', amount: ham.ke_pembangunan, color: 'bg-amber-50 text-amber-800 border-amber-200' });
                      }
                      if (ham.ke_sentralisasi && ham.ke_sentralisasi > 0) {
                        posList.push({ label: 'Ke Sentral 55%', amount: ham.ke_sentralisasi, color: 'bg-purple-50 text-purple-800 border-purple-200' });
                      }
                      if (ham.ke_transitori && ham.ke_transitori > 0) {
                        const transLabel = ham.transitori_uraian
                          ? `Ke Transitori (${ham.transitori_uraian})`
                          : 'Ke Transitori';
                        posList.push({ label: transLabel, amount: ham.ke_transitori, color: 'bg-rose-50 text-rose-800 border-rose-200' });
                      }

                      return (
                        <div key={ham.id || idx} className="py-2 border-b border-stone-100 last:border-b-0 space-y-1">
                          <div className="flex items-start justify-between gap-2 text-xs">
                            <div className="font-semibold text-stone-900 break-words leading-snug">
                              {ham.nama}
                              {ham.wijk && <span className="text-[10px] text-stone-500 font-normal ml-1">(Wijk {ham.wijk})</span>}
                            </div>
                            <span className="font-mono-num font-bold text-blue-900 whitespace-nowrap">
                              Rp {formatRupiah(ham.jumlah)}
                            </span>
                          </div>
                          {ham.rincian && (
                            <p className="text-[11px] text-stone-600 break-words leading-tight">{ham.rincian}</p>
                          )}
                          {posList.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1 text-[10px] font-mono-num">
                              {posList.map((p, pIdx) => (
                                <span key={pIdx} className={`px-1.5 py-0.5 rounded border text-[9.5px] font-medium ${p.color}`}>
                                  {p.label}: Rp {formatRupiah(p.amount)}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Pengeluaran List */}
          {printablePengeluaran && printablePengeluaran.length > 0 && (
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-stone-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-stone-100 pb-2.5">
                <h3 className="font-bold text-stone-900 text-sm flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-rose-700" />
                  Rincian Pengeluaran Kas
                </h3>
                <span className="text-xs font-bold text-rose-800 font-mono-num">
                  Total: Rp {formatRupiah(rekapitulasi.total_keluar)}
                </span>
              </div>
              <div className="space-y-2 text-xs">
                {printablePengeluaran.map((pg, idx) => {
                  const totalPg = (pg.huria || 0) + (pg.sosial || 0) + (pg.pembangunan || 0) + (pg.transitori || 0) + (pg.sentralisasi || 0);
                  const posList: string[] = [];
                  if (pg.huria) posList.push(`Huria: Rp ${formatRupiah(pg.huria)}`);
                  if (pg.sentralisasi) posList.push(`Sentral 55%: Rp ${formatRupiah(pg.sentralisasi)}`);
                  if (pg.pembangunan) posList.push(`Pembangunan: Rp ${formatRupiah(pg.pembangunan)}`);
                  if (pg.sosial) posList.push(`Sosial: Rp ${formatRupiah(pg.sosial)}`);
                  if (pg.transitori) posList.push(`Transitori: Rp ${formatRupiah(pg.transitori)}`);
                  return (
                    <div
                      key={pg.id || idx}
                      className="p-2.5 bg-stone-50 rounded-xl border border-stone-200 flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <span className="font-semibold text-stone-900 block truncate">{idx + 1}. {pg.uraian}</span>
                        <span className="text-[10px] text-stone-500 block truncate">
                          {posList.join(' · ') || 'Pengeluaran Huria'}
                        </span>
                      </div>
                      <span className="font-mono-num font-bold text-rose-900 text-xs sm:text-sm shrink-0">
                        Rp {formatRupiah(totalPg)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Doa / Penutup Keuangan */}
          {pengaturan?.teks_penutup_keuangan && (
            <div className="p-3.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-600 font-serif-body italic text-center">
              "{pengaturan.teks_penutup_keuangan}"
            </div>
          )}

          {/* F. DAFTAR PEMAKAI SOPO GODANG (Setelah Rekapitulasi Keuangan) */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-stone-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-stone-100 pb-2.5">
              <div className="flex items-center gap-2">
                <Building className="w-4 h-4 text-amber-700" />
                <div>
                  <h3 className="font-bold text-stone-900 text-sm flex items-center gap-2">
                    Daftar Pemakai Sopo Godang
                  </h3>
                  <p className="text-[11px] text-stone-500">
                    Jadwal pemakaian gedung serbaguna huria (setelah rekapitulasi keuangan)
                  </p>
                </div>
              </div>
              <span className="text-[11px] font-bold text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                {sopo_godang.filter((s) => s.nama && s.nama !== '-').length} Jadwal Terdaftar
              </span>
            </div>

            <div className="space-y-2 text-xs">
              {sopo_godang.length > 0 ? (
                sopo_godang.map((sg, idx) => (
                  <div
                    key={sg.id || idx}
                    className="p-3 bg-stone-50 rounded-xl border border-stone-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 hover:bg-stone-100/70 transition"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-stone-200 text-stone-700 flex items-center justify-center font-bold text-[10px] shrink-0 font-mono-num">
                        {idx + 1}
                      </span>
                      <span className="font-semibold text-stone-900">
                        {sg.nama || '-'}
                      </span>
                    </div>
                    <div className="text-stone-600 font-medium text-[11px] flex items-center gap-1.5 pl-7 sm:pl-0">
                      <Calendar className="w-3.5 h-3.5 text-stone-400" />
                      <span>{sg.tanggal || '-'}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-4 text-stone-400 italic text-xs">
                  Ndang adong jadwal pemakaian Sopo Godang di periode on.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* SECTION 4: JADWAL TETAP HURIA */}
      {/* ============================================================= */}
      {activeSection === 'jadwal' && (
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-stone-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-stone-100 pb-2.5">
            <Clock className="w-4 h-4 text-blue-800" />
            <div>
              <h3 className="font-bold text-stone-900 text-sm sm:text-base">
                Jadwal Panghobasion ni Huria Tetap
              </h3>
              <p className="text-[11px] text-stone-500">
                Jadwal rutin ibadah minggu, partangiangan, dan punguan kategorial di HKBP Ressort Hutaraja
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {jadwalTetap.map((jt) => (
              <div
                key={jt.id}
                className="p-3.5 bg-stone-50 rounded-xl border border-stone-200 space-y-1.5 hover:border-blue-300 transition"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-stone-900 text-xs sm:text-sm">{jt.label}</span>
                  <span className="text-[10px] font-bold text-blue-900 bg-blue-100 px-2 py-0.5 rounded uppercase">
                    {jt.kelompok}
                  </span>
                </div>
                <div className="text-[11px] text-stone-600 flex items-center justify-between pt-1">
                  <span className="font-semibold text-stone-800">{jt.hari}, {jt.jam}</span>
                  <span className="text-stone-500">{jt.keterangan || 'Gereja'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
