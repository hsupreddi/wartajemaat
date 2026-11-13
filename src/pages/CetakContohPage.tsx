import React, { useState } from 'react';
import { getInitialFullWarta, DEFAULT_PENGATURAN, DEFAULT_JADWAL_TETAP } from '../lib/mockData';
import { WartaDocument } from '../components/warta/WartaDocument';
import { Printer, Download, ArrowLeft, CheckCircle2, Info, Eye } from 'lucide-react';
import { Link } from 'react-router-dom';

/**
 * CetakContohPage (/dev/cetak-contoh)
 * Audit page specifically displaying the 8 Nopember 2026 (Minggu XXIII Dung Trinitatis)
 * seed warta for visual comparison with the original physical document.
 */
export const CetakContohPage: React.FC = () => {
  const [data] = useState(() => getInitialFullWarta());
  const [selectedPage, setSelectedPage] = useState<'all' | '1' | '2' | '3'>('all');
  const [showChecklist, setShowChecklist] = useState(true);

  const handlePrint = () => {
    const targetFileName = `Warta_HKBP_Hutaraja_${data.warta.tanggal_minggu}`;
    const originalTitle = document.title;
    document.title = targetFileName;
    window.print();
    setTimeout(() => {
      document.title = originalTitle;
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-stone-200 print:bg-white text-stone-900">
      {/* Dev Header Toolbar (Hidden in Print) */}
      <header className="no-print sticky top-0 z-40 bg-stone-900 text-stone-100 shadow-lg px-4 py-3 border-b border-stone-800">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium text-stone-300 hover:text-white hover:bg-stone-800 transition"
            >
              <ArrowLeft className="w-4 h-4" /> Beranda
            </Link>
            <div className="h-4 w-px bg-stone-700" />
            <div>
              <div className="flex items-center gap-2">
                <span className="bg-amber-500 text-black text-[10px] font-black uppercase px-1.5 py-0.5 rounded tracking-wide">
                  AUDIT CETAK CONTOH
                </span>
                <h1 className="text-sm font-bold text-white">
                  Warta 8 Nopember 2026 (XXIII Dung Trinitatis)
                </h1>
              </div>
              <p className="text-[11px] text-stone-400">
                Verifikasi visual perbandingan tata letak A4 dengan dokumen fisik asli HKBP Hutaraja
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Filter Halaman */}
            <div className="flex items-center bg-stone-800 p-1 rounded text-xs gap-1">
              <button
                onClick={() => setSelectedPage('all')}
                className={`px-2.5 py-1 rounded cursor-pointer transition ${
                  selectedPage === 'all' ? 'bg-blue-600 text-white font-bold' : 'text-stone-300'
                }`}
              >
                Semua Halaman
              </button>
              <button
                onClick={() => setSelectedPage('1')}
                className={`px-2 py-1 rounded cursor-pointer transition ${
                  selectedPage === '1' ? 'bg-blue-600 text-white font-bold' : 'text-stone-300'
                }`}
              >
                Hal 1
              </button>
              <button
                onClick={() => setSelectedPage('2')}
                className={`px-2 py-1 rounded cursor-pointer transition ${
                  selectedPage === '2' ? 'bg-blue-600 text-white font-bold' : 'text-stone-300'
                }`}
              >
                Hal 2
              </button>
              <button
                onClick={() => setSelectedPage('3')}
                className={`px-2 py-1 rounded cursor-pointer transition ${
                  selectedPage === '3' ? 'bg-blue-600 text-white font-bold' : 'text-stone-300'
                }`}
              >
                Hal 3
              </button>
            </div>

            <button
              onClick={() => setShowChecklist(!showChecklist)}
              className="px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded text-xs font-medium cursor-pointer"
            >
              {showChecklist ? 'Sembunyikan Checklist' : 'Lihat Checklist'}
            </button>

            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-bold shadow transition cursor-pointer"
            >
              <Download className="w-4 h-4" /> Cetak / Simpan PDF
            </button>
          </div>
        </div>
      </header>

      {/* Checklist Audit Banner (Hidden in Print) */}
      {showChecklist && (
        <section className="no-print max-w-5xl mx-auto mt-4 px-4">
          <div className="bg-white border border-stone-300 rounded-lg p-3.5 shadow-sm text-xs text-stone-800 space-y-2">
            <div className="flex items-center gap-2 font-bold text-stone-900 border-b border-stone-200 pb-1.5">
              <Info className="w-4 h-4 text-blue-600" />
              <span>Daftar Verifikasi Kesesuaian Tata Letak Fisik (A4 Portrait - Margin 10mm):</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-1">
                <div className="font-semibold text-stone-900 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Halaman 1 (Tata Ibadah)
                </div>
                <ul className="text-[11px] text-stone-600 space-y-0.5 list-disc pl-4">
                  <li>Kop surat: Logo Salib (kiri) & Transformasi 2024-2028 (kanan)</li>
                  <li>Judul: MINGGU, 8 NOPEMBER 2026 · XXIII DUNG TRINITATIS</li>
                  <li>Sidebar kiri 22% lebar bergaris tebal hitam (Panghobasion)</li>
                  <li>Acara Minggu & Acara Partangiangan sejajar berdampingan (grey header)</li>
                  <li>Kotak Ayat tengah (Jesayas 40:31)</li>
                  <li>Parhobas 6 baris × 4 kolom, Ruas na ro, Markoor, Sopo Godang</li>
                </ul>
              </div>

              <div className="space-y-1">
                <div className="font-semibold text-stone-900 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Halaman 2 (Tingting Namarragam)
                </div>
                <ul className="text-[11px] text-stone-600 space-y-0.5 list-disc pl-4">
                  <li>Header Tingting Namarragam HKBP Ressort Hutaraja</li>
                  <li>Tabel Ulang Tahun strictly 2 kolom berdampingan</li>
                  <li>Teks ucapan ulang tahun Jesayas 40:31</li>
                  <li>Jadwal Koor Minggu depan (15 Nopember 2026)</li>
                  <li>Jadwal Partangiangan 6 Lingkungan</li>
                  <li>Pengumuman bernomor dinamis (5, 6, 7, 8)</li>
                </ul>
              </div>

              <div className="space-y-1">
                <div className="font-semibold text-stone-900 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Halaman 3 (Keuangan)
                </div>
                <ul className="text-[11px] text-stone-600 space-y-0.5 list-disc pl-4">
                  <li>Tabel A: Pos penerimaan standar HKBP Hutaraja (Kebaktian Umum, Lainnya & Transitori)</li>
                  <li>Sub-tabel B Pelean Taon & C Hamauliateon</li>
                  <li>Tabel D Pengeluaran belanja huria</li>
                  <li>Tabel E Rekapitulasi 5 pos dana saldo awal s/d akhir</li>
                  <li>Teks penutup resmi Batak Toba Uluan ni Huria</li>
                </ul>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Main Single Document Render */}
      <main className="max-w-[210mm] mx-auto my-6 print:my-0">
        <WartaDocument
          data={data}
          pengaturan={DEFAULT_PENGATURAN}
          jadwalTetap={DEFAULT_JADWAL_TETAP}
          selectedPage={selectedPage}
        />
      </main>
    </div>
  );
};
