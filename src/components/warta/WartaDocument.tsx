import React from 'react';
import { FullWartaData, JadwalTetapItem, PengaturanHuria } from '../../types';
import { Page1TataIbadah } from './Page1TataIbadah';
import { Page2TintingNamarragam } from './Page2TintingNamarragam';
import { Page3TintingParhepengon } from './Page3TintingParhepengon';

export interface WartaDocumentProps {
  data: FullWartaData;
  pengaturan?: PengaturanHuria;
  jadwalTetap?: JadwalTetapItem[];
  selectedPage?: 'all' | '1' | '2' | '3';
  className?: string;
}

/**
 * WartaDocument - The single authoritative component representing the authentic
 * 3-page A4 print layout of Warta Jemaat HKBP Ressort Hutaraja.
 *
 * "Satu sumber data, dua tampilan: komponen WartaDocument yang sama dipakai untuk
 * pratinjau, halaman publik, dan cetak PDF."
 */
export const WartaDocument: React.FC<WartaDocumentProps> = ({
  data,
  pengaturan,
  jadwalTetap,
  selectedPage = 'all',
  className = ''
}) => {
  return (
    <div className={`warta-document-root ${className}`}>
      {/* HALAMAN 1: TATA IBADAH & PANGHOBASION */}
      {(selectedPage === 'all' || selectedPage === '1') && (
        <div className="a4-sheet-preview bg-white shadow-xl border border-stone-300 print:border-none print:shadow-none mx-auto overflow-hidden page-break mb-8 print:mb-0">
          <Page1TataIbadah data={data} pengaturan={pengaturan} jadwalTetap={jadwalTetap} />
        </div>
      )}

      {/* HALAMAN 2: TINGTING NAMARRAGAM & ULANG TAHUN */}
      {(selectedPage === 'all' || selectedPage === '2') && (
        <div className="a4-sheet-preview bg-white shadow-xl border border-stone-300 print:border-none print:shadow-none mx-auto overflow-hidden page-break mb-8 print:mb-0">
          <Page2TintingNamarragam data={data} pengaturan={pengaturan} />
        </div>
      )}

      {/* HALAMAN 3: TINGTING PARHEPENGON & REKAPITULASI */}
      {(selectedPage === 'all' || selectedPage === '3') && (
        <div className="a4-sheet-preview bg-white shadow-xl border border-stone-300 print:border-none print:shadow-none mx-auto overflow-hidden">
          <Page3TintingParhepengon data={data} pengaturan={pengaturan} />
        </div>
      )}
    </div>
  );
};
