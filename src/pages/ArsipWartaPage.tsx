import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { WartaRecord } from '../types';
import { getAllWartas } from '../lib/wartaStorage';
import { useAuth } from '../context/AuthContext';
import {
  Archive,
  Search,
  Calendar,
  Printer,
  BookOpen,
  ArrowLeft,
  FileText,
  Filter,
  CheckCircle2,
  Clock,
  ExternalLink
} from 'lucide-react';
import { formatTanggalIndo, formatTanggalLengkap, BULAN_INDONESIA } from '../lib/dateUtils';
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

  return (
    <div className="min-h-screen bg-[#F7F5F0] text-stone-900 pb-24 md:pb-16 flex flex-col justify-between">
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
                      <span>Kehadiran Ruas:</span>
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
  );
};
