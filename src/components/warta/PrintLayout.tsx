import React, { useState } from 'react';
import { FullWartaData, JadwalTetapItem, PengaturanHuria } from '../../types';
import { WartaDocument } from './WartaDocument';
import { Printer, ArrowLeft, Download, Layers } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface PrintLayoutProps {
  data: FullWartaData;
  pengaturan?: PengaturanHuria;
  jadwalTetap?: JadwalTetapItem[];
  selectedPage?: 'all' | '1' | '2' | '3';
}

export const PrintLayout: React.FC<PrintLayoutProps> = ({
  data,
  pengaturan,
  jadwalTetap,
  selectedPage: initialPage = 'all'
}) => {
  const navigate = useNavigate();
  const [activePage, setActivePage] = useState<'all' | '1' | '2' | '3'>(initialPage);

  const handlePrint = () => {
    // Exact file name formatting for browser Save as PDF
    const targetFileName = `Warta_HKBP_Hutaraja_${data.warta.tanggal_minggu}`;
    const originalTitle = document.title;
    document.title = targetFileName;
    window.print();
    // Restore title after print dialog closes
    setTimeout(() => {
      document.title = originalTitle;
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-stone-200 print:bg-white text-stone-900">
      {/* Floating Toolbar on Screen (Hidden on Print) */}
      <header className="no-print sticky top-0 z-30 bg-stone-900 text-stone-100 shadow-md px-4 py-3 border-b border-stone-800">
        <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium text-stone-200 hover:text-white hover:bg-stone-800 transition cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" /> Kembali
            </button>
            <div className="h-4 w-px bg-stone-700 hidden sm:block" />
            <div>
              <h1 className="text-sm font-bold tracking-tight text-white whitespace-nowrap">
                Warta Jemaat HKBP Hutaraja
              </h1>
              <p className="text-[11px] text-stone-400">
                {data.warta.goar_minggu} · {data.warta.tanggal_minggu}
              </p>
            </div>
          </div>

          {/* Page Selector Filter for Screen Preview */}
          <div className="flex items-center gap-1.5 bg-stone-800 p-1 rounded text-xs">
            <Layers className="w-3.5 h-3.5 text-stone-400 ml-1.5" />
            <button
              onClick={() => setActivePage('all')}
              className={`px-2.5 py-1 rounded cursor-pointer text-xs font-medium transition ${
                activePage === 'all' ? 'bg-blue-600 text-white font-bold' : 'text-stone-300 hover:text-white'
              }`}
            >
              Semua (3 Hal)
            </button>
            <button
              onClick={() => setActivePage('1')}
              className={`px-2 py-1 rounded cursor-pointer text-xs font-medium transition ${
                activePage === '1' ? 'bg-blue-600 text-white font-bold' : 'text-stone-300 hover:text-white'
              }`}
            >
              Hal 1
            </button>
            <button
              onClick={() => setActivePage('2')}
              className={`px-2 py-1 rounded cursor-pointer text-xs font-medium transition ${
                activePage === '2' ? 'bg-blue-600 text-white font-bold' : 'text-stone-300 hover:text-white'
              }`}
            >
              Hal 2
            </button>
            <button
              onClick={() => setActivePage('3')}
              className={`px-2 py-1 rounded cursor-pointer text-xs font-medium transition ${
                activePage === '3' ? 'bg-blue-600 text-white font-bold' : 'text-stone-300 hover:text-white'
              }`}
            >
              Hal 3
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold shadow transition cursor-pointer"
              title={`Simpan sebagai Warta_HKBP_Hutaraja_${data.warta.tanggal_minggu}.pdf`}
            >
              <Download className="w-4 h-4" /> Cetak / Simpan PDF
            </button>
          </div>
        </div>
      </header>

      {/* Main Single-Source Document Container */}
      <main className="max-w-[210mm] mx-auto my-4 md:my-8 print:my-0">
        <WartaDocument
          data={data}
          pengaturan={pengaturan}
          jadwalTetap={jadwalTetap}
          selectedPage={activePage}
        />
      </main>
    </div>
  );
};
