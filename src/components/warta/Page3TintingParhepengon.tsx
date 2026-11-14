import React from 'react';
import { FullWartaData, PengaturanHuria } from '../../types';
import {
  formatRupiah,
  recalculatePenerimaanRows,
  getPrintablePenerimaanRows,
  getPrintablePengeluaranRows,
  calculatePengeluaranTotals,
  calculateSumbanganNatalBreakdown,
  getHamauliateonTransitoriList
} from '../../lib/financialMath';
import { formatTanggalIndo } from '../../lib/dateUtils';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { DEFAULT_SOPO_GODANG_COLUMNS } from '../../lib/tableColumnDefaults';

interface Page3Props {
  data: FullWartaData;
  pengaturan?: PengaturanHuria;
}

export const Page3TintingParhepengon: React.FC<Page3Props> = ({ data, pengaturan }) => {
  const { warta, penerimaan, pelean_taon, hamauliateon, sumbangan_natal = [], pengeluaran, rekapitulasi, sopo_godang = [] } = data;

  const penerimaanTotals = recalculatePenerimaanRows(penerimaan);
  const nonEmptyPenerimaan = getPrintablePenerimaanRows(penerimaanTotals.updatedRows);
  const pengeluaranTotals = calculatePengeluaranTotals(pengeluaran);
  const nonEmptyPengeluaran = getPrintablePengeluaranRows(pengeluaran);

  const peleanTaonTotal = pelean_taon.reduce((acc, c) => acc + (c.jumlah || 0), 0);
  const hamauliateonTotal = hamauliateon.reduce((acc, c) => acc + (c.jumlah || 0), 0);
  const showSumbanganNatal = warta.tampilkan_sumbangan_natal !== false && sumbangan_natal.length > 0;
  const {
    subTotal: sumbanganNatalSubTotal,
    dariMingguLalu: sumbanganNatalMingguLalu,
    mingguIni: sumbanganNatalMingguIni
  } = calculateSumbanganNatalBreakdown(sumbangan_natal);

  // Pad sopo godang to 5 rows for authentic balanced printed look
  const sopoGodangList = [...sopo_godang];
  while (sopoGodangList.length < 5) {
    sopoGodangList.push({
      id: `sg-pad-${sopoGodangList.length + 1}`,
      nama: '-',
      tanggal: '-',
      urutan: sopoGodangList.length + 1
    });
  }

  return (
    <div className="a4-page bg-white text-stone-900 p-4 md:p-[6.5mm_9.5mm] print:p-0 flex flex-col justify-between min-h-[297mm] print:min-h-[274mm] print:h-auto box-border">
      <div className="flex-1 flex flex-col justify-between gap-2">
        {/* Header Tingting Parhepengon */}
        <div data-pdf-block="true" className="border-b-2 border-stone-900 pb-1 text-center">
          <h2 className="font-display font-extrabold text-stone-900 text-sm md:text-base tracking-wider uppercase">
            Tingting Parhepengon (Laporan Keuangan)
          </h2>
          <div className="flex items-center justify-center gap-1.5 text-[7.8pt] font-semibold text-stone-700 uppercase mt-0.5">
            <span>HKBP Ressort Hutaraja</span>
            <span>·</span>
            <span>
              Periode: {formatTanggalIndo(warta.periode_keuangan_mulai)} s/d{' '}
              {formatTanggalIndo(warta.periode_keuangan_akhir)}
            </span>
          </div>
        </div>

        {/* A. TABEL PENERIMAAN (28 Baris Master) */}
        <section className="space-y-1">
          <div data-pdf-section-header="true" className="flex items-center justify-between border-b border-stone-700 pb-0.5">
            <h3 className="font-bold text-stone-900 text-[8.2pt] uppercase">
              A. Penerimaan (Uang Masuk)
            </h3>
            <span className="text-[7.2pt] text-stone-500">
              *Sentralisasi 55% disetor langsung tu Hatopan / Kantor Pusat HKBP
            </span>
          </div>

          <table className="w-full border-collapse border border-stone-400 text-[6.8pt] font-mono-num">
            <thead>
              <tr className="bg-stone-100 text-stone-900 border-b border-stone-400 text-center font-sans font-bold">
                <th className="w-8 py-1 px-0.5 border-r border-stone-300">NO</th>
                <th className="py-1 px-1.5 text-left border-r border-stone-300">URAIAN</th>
                <th className="w-17 py-1 px-1 text-right border-r border-stone-300">JUMLAH (Rp)</th>
                <th className="w-15 py-1 px-1 text-right border-r border-stone-300">HURIA</th>
                <th className="w-15 py-1 px-1 text-right border-r border-stone-300">SOSIAL HURIA</th>
                <th className="w-15 py-1 px-1 text-right border-r border-stone-300">PEMBANGUNAN</th>
                <th className="w-16 py-1 px-1 text-right border-r border-stone-300">SENTRALISASI (55%)</th>
                <th className="w-15 py-1 px-1 text-right">TRANSITORIS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200">
              {(() => {
                if (nonEmptyPenerimaan.length === 0) {
                  return (
                    <tr>
                      <td colSpan={8} className="text-center italic text-stone-400 py-2 font-sans">
                        Ndang adong transaksi penerimaan di periode on
                      </td>
                    </tr>
                  );
                }

                let currentKelompok = '';
                const rendered: React.ReactNode[] = [];

                nonEmptyPenerimaan.forEach((row, idx) => {
                  const kel =
                    row.kelompok ||
                    (row.no_tampilan ? row.no_tampilan.substring(0, 3) : '1.1');

                  if (kel !== currentKelompok) {
                    currentKelompok = kel;
                    let title = '';
                    if (kel === '1.1') title = '1.1 PERSEMBAHAN KEBAKTIAN UMUM';
                    else if (kel === '1.2') title = '1.2 PERSEMBAHAN LAINNYA';
                    else if (kel === '1.3') title = '1.3 PENERIMAAN TRANSITORI';
                    else title = `${kel} LAIN-LAIN`;

                    rendered.push(
                      <tr key={`sec-${kel}`} className="bg-stone-200 text-stone-900 font-bold border-y border-stone-400">
                        <td colSpan={8} className="py-0.5 px-1.5 font-sans uppercase tracking-wide text-[6.5pt] bg-stone-200">
                          {title}
                        </td>
                      </tr>
                    );
                  }

                  rendered.push(
                    <tr key={row.id || idx} className="hover:bg-stone-50 break-inside-avoid">
                      <td className="py-0.5 px-0.5 text-center text-stone-600 border-r border-stone-200 font-sans font-medium whitespace-nowrap">
                        {row.no_tampilan || `${idx + 1}.`}
                      </td>
                      <td className="py-0.5 px-1 font-sans text-stone-900 border-r border-stone-200 break-words leading-tight">
                        {row.uraian}
                        {row.dialihkan_ke_pembangunan && (
                          <span className="text-[5.8pt] text-stone-500 ml-1">(Ke Pemb)</span>
                        )}
                      </td>
                      <td className="py-0.5 px-1 text-right font-semibold text-stone-900 border-r border-stone-200 whitespace-nowrap">
                        {formatRupiah(row.jumlah)}
                      </td>
                      <td className="py-0.5 px-1 text-right text-stone-700 border-r border-stone-200 whitespace-nowrap">
                        {row.huria_45 > 0 ? formatRupiah(row.huria_45) : '-'}
                      </td>
                      <td className="py-0.5 px-1 text-right text-stone-700 border-r border-stone-200 whitespace-nowrap">
                        {row.sosial > 0 ? formatRupiah(row.sosial) : '-'}
                      </td>
                      <td className="py-0.5 px-1 text-right text-stone-700 border-r border-stone-200 whitespace-nowrap">
                        {row.pembangunan > 0 ? formatRupiah(row.pembangunan) : '-'}
                      </td>
                      <td className="py-0.5 px-1 text-right text-stone-700 border-r border-stone-200 whitespace-nowrap">
                        {row.sentral_55 > 0 ? formatRupiah(row.sentral_55) : '-'}
                      </td>
                      <td className="py-0.5 px-1 text-right text-stone-700 whitespace-nowrap">
                        {row.transitori > 0 ? formatRupiah(row.transitori) : '-'}
                      </td>
                    </tr>
                  );
                });

                return rendered;
              })()}
              {/* TOTAL ROW */}
              <tr className="bg-stone-200 font-bold text-stone-900 border-t-2 border-stone-500">
                <td colSpan={2} className="py-1 px-1.5 text-right font-sans uppercase border-r border-stone-400">
                  Jumlah Penerimaan (A):
                </td>
                <td className="py-1 px-1 text-right border-r border-stone-400">
                  {formatRupiah(penerimaanTotals.totalJumlah)}
                </td>
                <td className="py-1 px-1 text-right border-r border-stone-400">
                  {formatRupiah(penerimaanTotals.totalHuria)}
                </td>
                <td className="py-1 px-1 text-right border-r border-stone-400">
                  {formatRupiah(penerimaanTotals.totalSosial)}
                </td>
                <td className="py-1 px-1 text-right border-r border-stone-400">
                  {formatRupiah(penerimaanTotals.totalPembangunan)}
                </td>
                <td className="py-1 px-1 text-right border-r border-stone-400">
                  {formatRupiah(penerimaanTotals.totalSentral)}
                </td>
                <td className="py-1 px-1 text-right">
                  {formatRupiah(penerimaanTotals.totalTransitori)}
                </td>
              </tr>
            </tbody>
          </table>
        </section>

        {/* 2 KOLOM SUB-TABEL: B. PELEAN TAON & C. HAMAULIATEON */}
        <div className="grid grid-cols-1 md:grid-cols-2 print:grid-cols-2 gap-2 text-[7.3pt]">
          {/* B. DAFTAR PELEAN TAON */}
          <section className="border border-stone-400 p-1.5 bg-stone-50">
            <div data-pdf-section-header="true" className="font-bold text-stone-900 border-b border-stone-300 pb-0.5 mb-1 flex justify-between">
              <span>B. Rincian Pelean Taon</span>
              <span className="font-mono-num font-semibold">Total: Rp {formatRupiah(peleanTaonTotal)}</span>
            </div>
            <table className="w-full text-[7pt]">
              <thead>
                <tr className="border-b border-stone-300 text-left font-bold text-stone-700">
                  <th className="w-5 py-0.5">No</th>
                  <th className="py-0.5">Keluarga / Ruas</th>
                  <th className="w-14 py-0.5">Wijk</th>
                  <th className="w-16 py-0.5 text-right">Jumlah (Rp)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200">
                {pelean_taon.length > 0 ? (
                  pelean_taon.map((pt, idx) => (
                    <tr key={pt.id || idx}>
                      <td className="py-0.5 text-stone-500">{idx + 1}.</td>
                      <td className="py-0.5 font-medium text-stone-900">{pt.nama}</td>
                      <td className="py-0.5 text-stone-600">{pt.lingkungan}</td>
                      <td className="py-0.5 text-right font-mono-num">{formatRupiah(pt.jumlah)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="text-center italic text-stone-400 py-2">
                      Ndang adong pelean taon di periode on
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </section>

          {/* C. DAFTAR HAMAULIATEON */}
          <section className="border border-stone-400 p-1.5 bg-stone-50">
            <div data-pdf-section-header="true" className="font-bold text-stone-900 border-b border-stone-300 pb-0.5 mb-1 flex justify-between">
              <span>C. Rincian Hamauliateon (Ucapan Syukur)</span>
              <span className="font-mono-num font-semibold">Total: Rp {formatRupiah(hamauliateonTotal)}</span>
            </div>
            <table className="w-full text-[7pt]">
              <thead>
                <tr className="border-b border-stone-300 text-left font-bold text-stone-700">
                  <th className="w-5 py-0.5 text-center">No</th>
                  <th className="py-0.5 px-1 text-left">Goar ni na pasahathon</th>
                  <th className="py-0.5 px-1 text-left">Keterangan &amp; Rincian Pos</th>
                  <th className="py-0.5 text-right whitespace-nowrap">Jumlah (Rp)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200">
                {hamauliateon.length > 0 ? (
                  hamauliateon.map((h, idx) => {
                    const posList: { label: string; amount: number; color: string }[] = [];
                    if (h.ke_huria && h.ke_huria > 0) {
                      posList.push({
                        label: 'Ke Huria',
                        amount: h.ke_huria,
                        color: 'bg-emerald-50 text-emerald-900 border-emerald-200'
                      });
                    }
                    if (h.ke_sosial && h.ke_sosial > 0) {
                      posList.push({ label: 'Ke Sosial', amount: h.ke_sosial, color: 'bg-sky-50 text-sky-900 border-sky-200' });
                    }
                    if (h.ke_pembangunan && h.ke_pembangunan > 0) {
                      posList.push({ label: 'Ke Bangunan', amount: h.ke_pembangunan, color: 'bg-amber-50 text-amber-900 border-amber-200' });
                    }
                    if (h.ke_sentralisasi && h.ke_sentralisasi > 0) {
                      posList.push({ label: 'Ke Sentral 55%', amount: h.ke_sentralisasi, color: 'bg-purple-50 text-purple-900 border-purple-200' });
                    }
                    const transEntries = getHamauliateonTransitoriList(h).filter((t) => t.jumlah > 0);
                    for (const t of transEntries) {
                      const transLabel = t.uraian
                        ? `Ke Transitori (${t.uraian})`
                        : 'Ke Transitori';
                      posList.push({ label: transLabel, amount: t.jumlah, color: 'bg-rose-50 text-rose-900 border-rose-200' });
                    }

                    return (
                      <tr key={h.id || idx} className="align-top hover:bg-stone-100/70">
                        <td className="py-0.5 text-center text-stone-500 w-4">{idx + 1}.</td>
                        <td className="py-0.5 px-1 font-medium text-stone-900 break-words leading-tight">
                          <div>{h.nama}</div>
                          {h.wijk && <div className="text-[5.8pt] text-stone-500">Wijk {h.wijk}</div>}
                        </td>
                        <td className="py-0.5 px-1 text-stone-700 break-words leading-tight">
                          {h.rincian && <div className="text-stone-900 font-medium">{h.rincian}</div>}
                          {posList.length > 0 && (
                            <div className="flex flex-wrap gap-x-1 gap-y-0.5 mt-0.5 text-[5.8pt] font-mono-num">
                              {posList.map((p, pIdx) => (
                                <span key={pIdx} className={`px-1 py-0.2 rounded border ${p.color}`}>
                                  {p.label}: Rp {formatRupiah(p.amount)}
                                </span>
                              ))}
                            </div>
                          )}
                          {!h.rincian && posList.length === 0 && <span className="text-stone-400">-</span>}
                        </td>
                        <td className="py-0.5 text-right font-mono-num font-semibold text-stone-900 whitespace-nowrap">
                          {formatRupiah(h.jumlah)}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={4} className="text-center italic text-stone-400 py-1">
                      Ndang adong hamauliateon di periode on
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </section>
        </div>

        {/* SUB-TABEL SEMENTARA: SUMBANGAN NATAL DIAKONI SOSIAL (MASUK KE KAS SOSIAL HURIA) */}
        {showSumbanganNatal && (
          <section className="border border-stone-400 p-1.5 bg-stone-50">
            <div data-pdf-section-header="true" className="font-bold text-stone-900 border-b border-stone-300 pb-0.5 mb-1 flex items-center justify-between text-[7.5pt]">
              <span>Sumbangan Natal Diakoni Sosial</span>
              <span className="text-[6.8pt] font-semibold text-stone-600 italic">
                Masuk ke Kas Sosial Huria
              </span>
            </div>
            <table className="w-full border-collapse text-[7pt]">
              <thead>
                <tr className="border-b border-stone-300 text-left font-bold text-stone-700 bg-stone-100">
                  <th className="w-7 py-0.5 px-1 text-center">No</th>
                  <th className="py-0.5 px-1.5 text-left">Nama Penyumbang</th>
                  <th className="w-28 py-0.5 px-1.5 text-left">Lingkungan</th>
                  <th className="w-24 py-0.5 px-1 text-right">Jumlah Sumbangan (Rp)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200">
                {sumbangan_natal.map((sn, idx) => (
                  <tr key={sn.id || idx}>
                    <td className="py-0.5 px-1 text-center text-stone-500">{idx + 1}.</td>
                    <td className="py-0.5 px-1.5 font-medium text-stone-900">{sn.nama || '-'}</td>
                    <td className="py-0.5 px-1.5 text-stone-700">{sn.lingkungan || '-'}</td>
                    <td className="py-0.5 px-1 text-right font-mono-num font-semibold text-stone-900">
                      {formatRupiah(sn.jumlah)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-stone-400 bg-stone-200/70 font-bold text-stone-900">
                  <td colSpan={3} className="py-0.5 px-1.5 text-right uppercase text-[6.8pt]">
                    Sub Total (Masuk Kas Sosial Huria):
                  </td>
                  <td className="py-0.5 px-1 text-right font-mono-num">
                    Rp {formatRupiah(sumbanganNatalSubTotal)}
                  </td>
                </tr>
                {sumbanganNatalMingguLalu > 0 && (
                  <tr className="border-t border-stone-300 bg-stone-100/80 text-[6.3pt] text-stone-600">
                    <td colSpan={4} className="py-0.5 px-1.5 text-right">
                      Sudah dibukukan minggu lalu: <span className="font-mono-num font-semibold">Rp {formatRupiah(sumbanganNatalMingguLalu)}</span>
                      {' · '}
                      Penerimaan minggu ini: <span className="font-mono-num font-semibold text-stone-900">Rp {formatRupiah(sumbanganNatalMingguIni)}</span>
                    </td>
                  </tr>
                )}
              </tfoot>
            </table>
          </section>
        )}

        {/* D. LAPORAN PENGELUARAN */}
        <section className="space-y-1">
          <div data-pdf-section-header="true" className="border-b border-stone-700 pb-0.5">
            <h3 className="font-bold text-stone-900 text-[8.2pt] uppercase">
              D. Pengeluaran (Uang Keluar)
            </h3>
          </div>
          <table className="w-full border-collapse border border-stone-400 text-[7.2pt] font-mono-num">
            <thead>
              <tr className="bg-stone-100 text-stone-900 border-b border-stone-400 text-center font-sans font-bold">
                <th className="w-6 py-1 px-0.5 border-r border-stone-300">No</th>
                <th className="py-1 px-1.5 text-left border-r border-stone-300">Uraian Belanja / Pengeluaran</th>
                <th className="w-19 py-1 px-1 text-right border-r border-stone-300">Kas Huria (Rp)</th>
                <th className="w-19 py-1 px-1 text-right border-r border-stone-300">Sosial Huria (Rp)</th>
                <th className="w-19 py-1 px-1 text-right border-r border-stone-300">Pembangunan (Rp)</th>
                <th className="w-19 py-1 px-1 text-right">Transitori (Rp)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200">
              {nonEmptyPengeluaran.length > 0 ? (
                nonEmptyPengeluaran.map((p, idx) => (
                  <tr key={p.id || idx} className="hover:bg-stone-50">
                    <td className="py-0.5 px-0.5 text-center text-stone-600 border-r border-stone-200 font-sans">
                      {idx + 1}.
                    </td>
                    <td className="py-0.5 px-1.5 font-sans text-stone-900 border-r border-stone-200">
                      {p.uraian}
                      {p.is_sentralisasi && (
                        <span className="text-[6.2pt] font-semibold text-amber-900 ml-1 bg-amber-50 px-1 py-0.2 rounded border border-amber-200">
                          (Sentral 55%: Rp {formatRupiah(p.sentralisasi || 0)})
                        </span>
                      )}
                    </td>
                    <td className="py-0.5 px-1 text-right border-r border-stone-200">
                      {p.huria > 0 ? formatRupiah(p.huria) : '-'}
                    </td>
                    <td className="py-0.5 px-1 text-right border-r border-stone-200">
                      {p.sosial > 0 ? formatRupiah(p.sosial) : '-'}
                    </td>
                    <td className="py-0.5 px-1 text-right border-r border-stone-200">
                      {p.pembangunan > 0 ? formatRupiah(p.pembangunan) : '-'}
                    </td>
                    <td className="py-0.5 px-1 text-right">
                      {p.transitori > 0 ? formatRupiah(p.transitori) : '-'}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="text-center italic text-stone-400 py-2 font-sans">
                    Ndang adong pengeluaran di periode on
                  </td>
                </tr>
              )}
              <tr className="bg-stone-200 font-bold text-stone-900 border-t-2 border-stone-500">
                <td colSpan={2} className="py-0.5 px-1.5 text-right font-sans uppercase border-r border-stone-400">
                  Jumlah Pengeluaran (D):
                </td>
                <td className="py-0.5 px-1 text-right border-r border-stone-400">
                  {formatRupiah(pengeluaranTotals.totalHuria)}
                </td>
                <td className="py-0.5 px-1 text-right border-r border-stone-400">
                  {formatRupiah(pengeluaranTotals.totalSosial)}
                </td>
                <td className="py-0.5 px-1 text-right border-r border-stone-400">
                  {formatRupiah(pengeluaranTotals.totalPembangunan)}
                </td>
                <td className="py-0.5 px-1 text-right">
                  {formatRupiah(pengeluaranTotals.totalTransitori)}
                </td>
              </tr>
            </tbody>
          </table>
        </section>

        {/* E. REKAPITULASI 5 POS DANA */}
        <section data-pdf-atomic="true" className="avoid-break space-y-1">
          <div className="flex items-center justify-between border-b border-stone-800 pb-0.5">
            <h3 className="font-bold text-stone-900 text-[8.2pt] uppercase">
              E. Rekapitulasi Kas &amp; Saldo Akhir
            </h3>
            {rekapitulasi.is_balanced ? (
              <span className="flex items-center gap-1 text-[7.2pt] text-emerald-700 font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" /> Alokasi Seimbang (Balance)
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[7.2pt] text-red-600 font-bold bg-red-50 px-1 rounded">
                <AlertCircle className="w-3.5 h-3.5" /> Peringatan: Selisih Rp {formatRupiah(rekapitulasi.selisih)}
              </span>
            )}
          </div>

          <table className="w-full border-collapse border border-stone-400 text-[7.5pt] font-mono-num">
            <thead>
              <tr className="bg-stone-800 text-white border-b border-stone-800 text-center font-sans font-bold">
                <th className="py-1 px-1.5 text-left">Pos Dana Huria</th>
                <th className="w-24 py-1 px-1 text-right">Saldo Awal (Rp)</th>
                <th className="w-24 py-1 px-1 text-right">Penerimaan (Rp)</th>
                <th className="w-24 py-1 px-1 text-right">Pengeluaran (Rp)</th>
                <th className="w-28 py-1 px-1.5 text-right">Saldo Akhir (Rp)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-300">
              {/* 1. Kas Huria */}
              <tr className="hover:bg-stone-50">
                <td className="py-0.5 px-1.5 font-sans font-medium text-stone-900">
                  1. Kas Huria (45%)
                </td>
                <td className="py-0.5 px-1 text-right text-stone-700">
                  {formatRupiah(rekapitulasi.huria.saldo_awal)}
                </td>
                <td className="py-0.5 px-1 text-right text-emerald-800 font-medium">
                  {formatRupiah(rekapitulasi.huria.masuk)}
                </td>
                <td className="py-0.5 px-1 text-right text-rose-800 font-medium">
                  {formatRupiah(rekapitulasi.huria.keluar)}
                </td>
                <td className="py-0.5 px-1.5 text-right font-bold text-stone-900 bg-stone-50">
                  {formatRupiah(rekapitulasi.huria.saldo_akhir)}
                </td>
              </tr>

              {/* 2. Sosial Huria */}
              <tr className="hover:bg-stone-50">
                <td className="py-0.5 px-1.5 font-sans font-medium text-stone-900">
                  2. Kas Sosial Huria
                </td>
                <td className="py-0.5 px-1 text-right text-stone-700">
                  {formatRupiah(rekapitulasi.sosial.saldo_awal)}
                </td>
                <td className="py-0.5 px-1 text-right text-emerald-800 font-medium">
                  {formatRupiah(rekapitulasi.sosial.masuk)}
                </td>
                <td className="py-0.5 px-1 text-right text-rose-800 font-medium">
                  {formatRupiah(rekapitulasi.sosial.keluar)}
                </td>
                <td className="py-0.5 px-1.5 text-right font-bold text-stone-900 bg-stone-50">
                  {formatRupiah(rekapitulasi.sosial.saldo_akhir)}
                </td>
              </tr>

              {/* 3. Pembangunan Huria */}
              <tr className="hover:bg-stone-50">
                <td className="py-0.5 px-1.5 font-sans font-medium text-stone-900">
                  3. Kas Pembangunan Huria
                </td>
                <td className="py-0.5 px-1 text-right text-stone-700">
                  {formatRupiah(rekapitulasi.pembangunan.saldo_awal)}
                </td>
                <td className="py-0.5 px-1 text-right text-emerald-800 font-medium">
                  {formatRupiah(rekapitulasi.pembangunan.masuk)}
                </td>
                <td className="py-0.5 px-1 text-right text-rose-800 font-medium">
                  {formatRupiah(rekapitulasi.pembangunan.keluar)}
                </td>
                <td className="py-0.5 px-1.5 text-right font-bold text-stone-900 bg-stone-50">
                  {formatRupiah(rekapitulasi.pembangunan.saldo_akhir)}
                </td>
              </tr>

              {/* 4. Sentralisasi 55% */}
              <tr className="hover:bg-stone-50 bg-amber-50/40">
                <td className="py-0.5 px-1.5 font-sans font-medium text-stone-900">
                  4. Sentralisasi Keuangan (55% Disetor ke Pusat)
                </td>
                <td className="py-0.5 px-1 text-right text-stone-700">
                  {formatRupiah(rekapitulasi.sentralisasi.saldo_awal)}
                </td>
                <td className="py-0.5 px-1 text-right text-emerald-800 font-medium">
                  {formatRupiah(rekapitulasi.sentralisasi.masuk)}
                </td>
                <td className="py-0.5 px-1 text-right text-rose-800 font-medium">
                  {formatRupiah(rekapitulasi.sentralisasi.keluar)}
                </td>
                <td className="py-0.5 px-1.5 text-right font-bold text-stone-900 bg-stone-50">
                  {formatRupiah(rekapitulasi.sentralisasi.saldo_akhir)}
                </td>
              </tr>

              {/* 5. Transitori */}
              <tr className="hover:bg-stone-50">
                <td className="py-0.5 px-1.5 font-sans font-medium text-stone-900">
                  5. Kas Transitori / Titipan
                </td>
                <td className="py-0.5 px-1 text-right text-stone-700">
                  {formatRupiah(rekapitulasi.transitori.saldo_awal)}
                </td>
                <td className="py-0.5 px-1 text-right text-emerald-800 font-medium">
                  {formatRupiah(rekapitulasi.transitori.masuk)}
                </td>
                <td className="py-0.5 px-1 text-right text-rose-800 font-medium">
                  {formatRupiah(rekapitulasi.transitori.keluar)}
                </td>
                <td className="py-0.5 px-1.5 text-right font-bold text-stone-900 bg-stone-50">
                  {formatRupiah(rekapitulasi.transitori.saldo_akhir)}
                </td>
              </tr>

              {/* JUMLAH REKAPITULASI */}
              <tr className="bg-stone-200 font-bold text-stone-900 border-t-2 border-stone-600">
                <td className="py-1 px-1.5 font-sans uppercase">JUMLAH KAS GEREJA:</td>
                <td className="py-1 px-1 text-right">
                  {formatRupiah(
                    rekapitulasi.total_saldo_awal ??
                      (warta.saldo_awal_huria +
                        warta.saldo_awal_sosial +
                        warta.saldo_awal_pembangunan +
                        (warta.saldo_awal_sentralisasi || 0) +
                        warta.saldo_awal_transitori)
                  )}
                </td>
                <td className="py-1 px-1 text-right text-emerald-900">
                  {formatRupiah(rekapitulasi.total_masuk)}
                </td>
                <td className="py-1 px-1 text-right text-rose-900">
                  {formatRupiah(rekapitulasi.total_keluar)}
                </td>
                <td className="py-1 px-1.5 text-right font-extrabold text-blue-950 bg-stone-300">
                  {formatRupiah(rekapitulasi.total_saldo_akhir)}
                </td>
              </tr>
            </tbody>
          </table>
        </section>

        {/* F. DAFTAR PEMAKAI SOPO GODANG (Setelah Rekapitulasi Keuangan) */}
        <section data-pdf-atomic="true" className="avoid-break space-y-1">
          <div className="flex items-center justify-between border-b border-stone-800 pb-0.5">
            <h3 className="font-bold text-stone-900 text-[8.2pt] uppercase">
              F. Daftar Pemakai Sopo Godang (Jadwal Gedung Serbaguna Huria)
            </h3>
            <span className="text-[7pt] text-stone-500 italic">
              *Konfirmasi pamangkeon tu Kantor Huria / Sintua Parhepengon
            </span>
          </div>

          {(() => {
            const cols = data.sopo_godang_columns && data.sopo_godang_columns.length > 0
              ? data.sopo_godang_columns
              : DEFAULT_SOPO_GODANG_COLUMNS;
            return (
              <table className="w-full border-collapse border border-stone-400 text-[7.2pt]">
                <thead>
                  <tr className="bg-stone-100 text-stone-900 border-b border-stone-400 font-bold">
                    <th className="w-6 py-1 px-1 text-center border-r border-stone-300">No</th>
                    {cols.map((c, ci) => (
                      <th
                        key={c.key}
                        className={`py-1 px-1.5 ${c.key === 'tanggal' ? 'w-48 text-right' : 'text-left'} ${ci < cols.length - 1 ? 'border-r border-stone-300' : ''}`}
                      >
                        {c.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200">
                  {sopoGodangList.map((sg, idx) => (
                    <tr key={sg.id || idx} className="hover:bg-stone-50">
                      <td className="py-0.5 px-1 text-center text-stone-600 font-medium border-r border-stone-200">
                        {idx + 1}.
                      </td>
                      {cols.map((c, ci) => (
                        <td
                          key={c.key}
                          className={`py-0.5 px-1.5 ${c.key === 'tanggal' ? 'text-right text-stone-700 whitespace-nowrap' : 'text-stone-900 font-medium break-words leading-tight'} ${ci < cols.length - 1 ? 'border-r border-stone-200' : ''}`}
                        >
                          {sg[c.key] || '-'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            );
          })()}
        </section>

      </div>

      {/* Penutup & Footer Halaman 3 */}
      <div data-pdf-footer="true" data-pdf-atomic="true" className="avoid-break mt-1.5 space-y-1.5">
        <div className="text-[7.6pt] italic text-stone-800 border-y border-stone-400 py-1.5 px-3 text-center bg-stone-50 font-serif-body">
          &quot;{pengaturan?.teks_penutup_keuangan ||
            'Molo adong na hurang di tingting on, tapaboa ma tu Uluan ni Huria, manang tu Sintua Lingkunganta, asa boi tapasingkop tu tingting Minggu na naeng ro.'}&quot;
        </div>
        <div className="pt-1 border-t border-stone-300 flex justify-between items-center text-[7.3pt] text-stone-500">
          <span>Warta Jemaat HKBP Ressort Hutaraja · Distrik VI Dairi</span>
          <span>Halaman 3 dari 3</span>
        </div>
      </div>
    </div>
  );
};
