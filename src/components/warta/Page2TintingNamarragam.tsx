import React from 'react';
import { FullWartaData, PengaturanHuria, UlangTahunItem } from '../../types';
import { formatTanggalIndo } from '../../lib/format';
import { getSeninMingguRange } from '../../lib/dateUtils';
import { DEFAULT_PARTANGIANGAN_COLUMNS } from '../../lib/tableColumnDefaults';

interface Page2Props {
  data: FullWartaData;
  pengaturan?: PengaturanHuria;
}

export const Page2TintingNamarragam: React.FC<Page2Props> = ({ data, pengaturan }) => {
  const { warta, ulang_tahun = [], jadwal_partangiangan = [], pengumuman = [] } = data;
  const { labelPeriode } = getSeninMingguRange(warta.tanggal_minggu);

  // Split ulang tahun into 2 equal columns for side-by-side display
  const midPoint = Math.ceil(ulang_tahun.length / 2);
  const col1UlangTahun = ulang_tahun.slice(0, midPoint);
  const col2UlangTahun = ulang_tahun.slice(midPoint);

  const renderSubTableUlangTahun = (items: UlangTahunItem[]) => (
    <table className="w-full border-collapse border border-stone-400 text-[6.8pt]">
      <thead>
        <tr className="bg-stone-100 text-stone-900 border-b border-stone-400 font-bold">
          <th className="w-5 py-0.5 px-0.5 text-center border-r border-stone-300">No</th>
          <th className="py-0.5 px-1 text-left border-r border-stone-300">Goar ni Ruas</th>
          <th className="w-6 py-0.5 px-0.5 text-center border-r border-stone-300">L/P</th>
          <th className="w-10 py-0.5 px-0.5 text-center border-r border-stone-300">Tgl</th>
          <th className="w-8 py-0.5 px-0.5 text-center border-r border-stone-300">Usia</th>
          <th className="w-20 py-0.5 px-1 text-left">Wijk</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-stone-200">
        {items.map((u) => (
          <tr key={u.no} className="hover:bg-stone-50">
            <td className="py-0.5 px-0.5 text-center text-stone-600 font-medium border-r border-stone-200">
              {u.no}.
            </td>
            <td className="py-0.5 px-1 font-semibold text-stone-900 break-words leading-tight border-r border-stone-200">
              {u.nama}
            </td>
            <td className="py-0.5 px-0.5 text-center text-stone-700 border-r border-stone-200">
              {u.jenis_kelamin}
            </td>
            <td className="py-0.5 px-0.5 text-center font-mono-num text-stone-800 border-r border-stone-200">
              {u.hari_bulan}
            </td>
            <td className="py-0.5 px-0.5 text-center font-bold text-stone-900 border-r border-stone-200">
              {u.usia}
            </td>
            <td className="py-0.5 px-1 text-stone-700 break-words leading-tight">
              {u.wijk.replace('Lingkungan ', 'Lingk. ')}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  return (
    <div className="a4-page bg-white text-stone-900 p-4 md:p-6 print:p-0 flex flex-col justify-between min-h-[280mm] print:min-h-0 print:h-auto box-border">
      <div className="space-y-2">
        {/* Header Tingting Namarragam */}
        <div className="border-b-2 border-stone-900 pb-1 text-center">
          <h2 className="font-display font-extrabold text-stone-900 text-sm md:text-base tracking-wider uppercase leading-tight">
            Tingting Namarragam (Warta Jemaat)
          </h2>
          <div className="flex items-center justify-center gap-1.5 text-[7.5pt] font-semibold text-stone-700 uppercase">
            <span>HKBP Ressort Hutaraja</span>
            <span>·</span>
            <span>Distrik VI Dairi</span>
            <span>·</span>
            <span>Minggu, {formatTanggalIndo(warta.tanggal_minggu)}</span>
          </div>
        </div>

        {/* 1. GOAR & TOPIK NI MINGGU */}
        <div className="avoid-break border border-stone-800 bg-stone-50 p-1.5 rounded-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-1 text-[7.8pt]">
            <div>
              <span className="font-bold text-stone-900">1. Goar ni Minggu: </span>
              <span className="font-extrabold text-blue-900 uppercase">
                MINGGU {warta.goar_minggu || '-'}
              </span>
            </div>
            {warta.topik_minggu && (
              <div>
                <span className="font-bold text-stone-900">Topik ni Minggu: </span>
                <span className="italic font-medium text-stone-800">"{warta.topik_minggu}"</span>
              </div>
            )}
          </div>
        </div>

        {/* 2. DAFTAR ULANG TAHUN RUAS (Strictly 2-Column Side-by-Side Layout) */}
        <div className="avoid-break space-y-1">
          <div className="flex items-center justify-between border-b border-stone-800 pb-0.5">
            <h3 className="font-bold text-stone-900 text-[8pt] uppercase">
              2. Ruas na Marulang Tahun di Minggu on (Periode: {labelPeriode})
            </h3>
            <span className="text-[7pt] text-stone-500 font-medium">
              Jumlah: {ulang_tahun.length} Halak
            </span>
          </div>

          {ulang_tahun.length > 0 ? (
            <div className="grid grid-cols-2 gap-2">
              <div>{renderSubTableUlangTahun(col1UlangTahun)}</div>
              <div>{col2UlangTahun.length > 0 ? renderSubTableUlangTahun(col2UlangTahun) : null}</div>
            </div>
          ) : (
            <div className="text-center py-1.5 text-stone-500 italic text-[7.2pt] border border-stone-200 bg-stone-50">
              Ndang adong ruas na marulang tahun di rentang tanggal on.
            </div>
          )}

          {/* Teks Ucapan Ulang Tahun Tetap (Jesayas 40:31) */}
          <div className="text-[7pt] italic text-stone-700 bg-stone-50 p-1 border border-stone-300 text-center font-serif-body">
            "{pengaturan?.teks_ucapan_ulang_tahun ||
              'Alai angka na marhaposan tu Jahowa dapotan gogo imbaru, manangkup angka habong songon pidoli, marlojong nasida ndang marnaloja, mardalan nasida ndang marnatep. (Jesayas 40:31)'}"
          </div>
        </div>

        {/* 3. JADWAL KOOR MINGGU DEPAN */}
        <div className="avoid-break border border-stone-300 p-1.5 text-[7.5pt] bg-stone-50">
          <div className="font-bold text-stone-900 uppercase border-b border-stone-300 pb-0.5 mb-1 text-[7.5pt]">
            3. Jadwal na Markoor di Minggu na naeng ro{' '}
            {warta.jadwal_koor_tanggal && `(${formatTanggalIndo(warta.jadwal_koor_tanggal)})`}:
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="font-bold text-stone-900">• Sesi I (Pagi 08.30 WIB): </span>
              <span className="text-stone-800 font-medium">{warta.koor_pagi || '-'}</span>
            </div>
            <div>
              <span className="font-bold text-stone-900">• Sesi II (Siang 10.30 WIB): </span>
              <span className="text-stone-800 font-medium">{warta.koor_siang || '-'}</span>
            </div>
          </div>
        </div>

        {/* 4. JADWAL PARTANGIANGAN DI LINGKUNGAN (Dynamic Columns) */}
        <div className="avoid-break space-y-0.5">
          <h3 className="font-bold text-stone-900 text-[8pt] uppercase border-b border-stone-800 pb-0.5">
            4. Jadwal Partangiangan Lingkungan di Minggu on
          </h3>
          {(() => {
            const cols = data.jadwal_partangiangan_columns && data.jadwal_partangiangan_columns.length > 0
              ? data.jadwal_partangiangan_columns
              : DEFAULT_PARTANGIANGAN_COLUMNS;
            return (
              <table className="w-full border-collapse border border-stone-400 text-[7.2pt]">
                <thead>
                  <tr className="bg-stone-100 text-stone-900 border-b border-stone-400 font-bold">
                    <th className="w-5 py-0.5 px-0.5 text-center border-r border-stone-300">No</th>
                    {cols.map((c, ci) => (
                      <th
                        key={c.key}
                        className={`py-0.5 px-1 ${c.key === 'pukul' ? 'w-16 text-center' : 'text-left'} ${ci < cols.length - 1 ? 'border-r border-stone-300' : ''}`}
                      >
                        {c.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200">
                  {jadwal_partangiangan.map((jp, idx) => (
                    <tr key={jp.id || idx} className="hover:bg-stone-50">
                      <td className="py-0.5 px-0.5 text-center text-stone-600 font-medium border-r border-stone-200">
                        {idx + 1}.
                      </td>
                      {cols.map((c, ci) => (
                        <td
                          key={c.key}
                          className={`py-0.5 px-1 ${c.key === 'pukul' ? 'text-center' : ''} ${c.key === 'lingkungan' ? 'font-semibold text-stone-900' : 'text-stone-800'} ${ci < cols.length - 1 ? 'border-r border-stone-200' : ''}`}
                        >
                          {jp[c.key] || '-'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            );
          })()}
        </div>

        {/* 5+. DAFTAR PENGUMUMAN DINAMIS */}
        <div className="space-y-1.5 pt-0.5">
          {pengumuman.map((peng, idx) => {
            const noNumber = idx + 5;
            return (
              <div key={peng.id || idx} className="avoid-break text-[7.5pt] leading-snug">
                <h4 className="font-bold text-stone-900 uppercase tracking-wide">
                  {noNumber}. {peng.judul}
                </h4>
                <p className="text-stone-800 text-justify mt-0.5 pl-3">
                  {peng.isi}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer Halaman 2 */}
      <div className="mt-2 pt-1 border-t border-stone-300 flex justify-between items-center text-[7pt] text-stone-500">
        <span>Warta Jemaat HKBP Ressort Hutaraja · Distrik VI Dairi</span>
        <span>Halaman 2 dari 3</span>
      </div>
    </div>
  );
};
