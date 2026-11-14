import React from 'react';
import { FullWartaData, JadwalTetapItem, PengaturanHuria } from '../../types';
import { KopSurat } from './KopSurat';
import { formatHeaderMinggu } from '../../lib/format';
import {
  DEFAULT_PARHOBAS_COLUMNS,
  DEFAULT_ACARA_MINGGU_COLUMNS,
  DEFAULT_ACARA_PARTANGIANGAN_COLUMNS
} from '../../lib/tableColumnDefaults';

interface Page1TataIbadahProps {
  data: FullWartaData;
  pengaturan?: PengaturanHuria;
  jadwalTetap?: JadwalTetapItem[];
}

export const Page1TataIbadah: React.FC<Page1TataIbadahProps> = ({
  data,
  pengaturan,
  jadwalTetap = []
}) => {
  const { warta, acara_minggu, acara_partangiangan, parhobas } = data;

  // Filter jadwal tetap by category
  const ibadahItems = jadwalTetap.filter((j) => j.kelompok === 'ibadah');
  const partangianganItems = jadwalTetap.filter((j) => j.kelompok === 'partangiangan');
  const kategorialItems = jadwalTetap.filter((j) => j.kelompok === 'kategorial');
  const kemajelisanItems = jadwalTetap.filter((j) => j.kelompok === 'kemajelisan');

  const totalRuas = (warta.ruas_sm || 0) + (warta.ruas_pagi || 0) + (warta.ruas_siang || 0);

  return (
    <div className="a4-page bg-white text-stone-900 p-4 md:p-[8mm_10mm] print:p-0 flex flex-col justify-between min-h-[297mm] print:min-h-[274mm] print:h-auto box-border">
      <div className="flex-1 flex flex-col gap-2.5">
        {/* Kop Surat Huria Resmi */}
        <KopSurat pengaturan={pengaturan} compact={true} />

        {/* Title Bar: MINGGU, 8 NOPEMBER 2026 */}
        <div className="text-center border-b-2 border-stone-900 pb-1.5">
          <h2 className="font-display font-extrabold text-stone-900 tracking-wider text-sm md:text-base uppercase leading-tight">
            {formatHeaderMinggu(warta.tanggal_minggu)}
          </h2>
          {warta.goar_minggu && (
            <p className="text-[9pt] font-bold text-stone-800 uppercase tracking-widest mt-0.5">
              MINGGU {warta.goar_minggu}
            </p>
          )}
        </div>

        {/* 2 Kolom Layout Utama: Sidebar 23% & Kolom Kanan 77% (Sejajar Penuh) */}
        <div className="flex-1 flex flex-row gap-2.5 items-stretch">
          {/* SIDEBAR KIRI: PANGHOBASION NI HURIA */}
          <aside className="w-[23%] shrink-0 border-2 border-black p-2 text-[7.4pt] leading-snug bg-stone-50/60 flex flex-col justify-between gap-2.5">
            <div className="space-y-2.5">
              <div className="bg-stone-900 text-white p-1.5 text-center font-bold uppercase tracking-wider text-[7.8pt]">
                Panghobasion ni Huria
              </div>

              {/* 1. Ibadah Minggu */}
              <div>
                <div className="font-bold text-stone-900 uppercase border-b border-stone-400 pb-0.5 mb-1 text-[7.5pt]">
                  I. Ibadah Minggu
                </div>
                <ul className="space-y-1 text-stone-800">
                  {ibadahItems.length > 0 ? (
                    ibadahItems.map((it) => (
                      <li key={it.id} className="flex flex-col">
                        <span className="font-medium">• {it.label}:</span>
                        <span className="font-bold text-stone-950 pl-2">{it.jam}</span>
                      </li>
                    ))
                  ) : (
                    <>
                      <li className="flex flex-col">
                        <span className="font-medium">• Sekolah Minggu:</span>
                        <span className="font-bold text-stone-950 pl-2">07.00 WIB</span>
                      </li>
                      <li className="flex flex-col">
                        <span className="font-medium">• Ibadah Pagi:</span>
                        <span className="font-bold text-stone-950 pl-2">08.30 WIB</span>
                      </li>
                      <li className="flex flex-col">
                        <span className="font-medium">• Ibadah Siang:</span>
                        <span className="font-bold text-stone-950 pl-2">10.30 WIB</span>
                      </li>
                    </>
                  )}
                </ul>
              </div>

              {/* 2. Partangiangan */}
              <div>
                <div className="font-bold text-stone-900 uppercase border-b border-stone-400 pb-0.5 mb-1 text-[7.5pt]">
                  II. Partangiangan
                </div>
                <ul className="space-y-1.5 text-stone-800">
                  {partangianganItems.length > 0 ? (
                    partangianganItems.map((it) => (
                      <li key={it.id}>
                        <span className="font-medium text-stone-900">• {it.hari} {it.jam}:</span>
                        <div className="text-[7pt] text-stone-700 pl-2">{it.keterangan || it.label}</div>
                      </li>
                    ))
                  ) : (
                    <>
                      <li>
                        <span className="font-medium text-stone-900">• Rabu 20.00 WIB:</span>
                        <div className="text-[7pt] text-stone-700 pl-2">Lingk. Letare, Galatia, Efesus</div>
                      </li>
                      <li>
                        <span className="font-medium text-stone-900">• Kamis 20.00 WIB:</span>
                        <div className="text-[7pt] text-stone-700 pl-2">Lingk. Exaudi, Judika, Jeremia</div>
                      </li>
                    </>
                  )}
                </ul>
              </div>

              {/* 3. Kategorial */}
              <div>
                <div className="font-bold text-stone-900 uppercase border-b border-stone-400 pb-0.5 mb-1 text-[7.5pt]">
                  III. Kategorial
                </div>
                <ul className="space-y-1 text-stone-800 text-[7.2pt]">
                  {kategorialItems.length > 0 ? (
                    kategorialItems.map((it) => (
                      <li key={it.id}>
                        <span className="font-semibold text-stone-900">• {it.hari} {it.jam}:</span>{' '}
                        <span>{it.label}</span>
                      </li>
                    ))
                  ) : (
                    <>
                      <li>• Selasa 16.00: Ina Ester</li>
                      <li>• Rabu 15.00: Lansia</li>
                      <li>• Rabu 16.00: Ina Sion</li>
                      <li>• Kamis 16.00: Ina Kamis</li>
                      <li>• Sabtu 20.00: Ama Immanuel &amp; Estomihi</li>
                      <li>• Sabtu 19.00: Remaja Naposo</li>
                    </>
                  )}
                </ul>
              </div>

              {/* 4. Kemajelisan & Sidi */}
              <div>
                <div className="font-bold text-stone-900 uppercase border-b border-stone-400 pb-0.5 mb-1 text-[7.5pt]">
                  IV. Kemajelisan &amp; Sidi
                </div>
                <ul className="space-y-1 text-stone-800 text-[7.2pt]">
                  {kemajelisanItems.length > 0 ? (
                    kemajelisanItems.map((it) => (
                      <li key={it.id}>
                        • {it.label} ({it.hari} {it.jam})
                      </li>
                    ))
                  ) : (
                    <>
                      <li>• Sermon Parhalado: Jumat 19.00</li>
                      <li>• Sermon GSM: Jumat 17.00</li>
                      <li>• Marguru Angkat Sidi: Minggu 12.30</li>
                    </>
                  )}
                </ul>
              </div>
            </div>

            <div className="pt-2 border-t border-stone-300 text-center text-[6.8pt] text-stone-600 italic font-serif-body">
              "Tuhanta ma na mangaramoti sude panghobasionta."
            </div>
          </aside>

          {/* KOLOM KANAN: 77% Width */}
          <main className="w-[77%] flex flex-col justify-between gap-2.5">
            {/* Top Section: Acara Minggu & Acara Partangiangan SIDE-BY-SIDE */}
            <div className="grid grid-cols-2 gap-2 avoid-break">
              {/* ACARA MINGGU (Col 1) */}
              <div className="border border-stone-400">
                <div className="bg-stone-200 text-stone-900 font-bold px-2 py-1 text-center uppercase tracking-wider text-[8pt] border-b border-stone-400">
                  Acara Minggu
                </div>
                {(() => {
                  const cols = data.acara_minggu_columns && data.acara_minggu_columns.length > 0
                    ? data.acara_minggu_columns
                    : DEFAULT_ACARA_MINGGU_COLUMNS;
                  return (
                    <table className="w-full table-fixed border-collapse text-[7.1pt] leading-tight">
                      <colgroup>
                        <col className="w-[20px]" />
                        {cols.map((c, ci) => (
                          <col
                            key={c.key}
                            className={
                              c.key === 'keterangan'
                                ? 'w-[48px]'
                                : c.key === 'uraian' || c.key === 'tata_ibadah' || ci === 0
                                  ? ''
                                  : 'w-[56px]'
                            }
                          />
                        ))}
                      </colgroup>
                      <thead>
                        <tr className="bg-stone-100 text-stone-800 border-b border-stone-300">
                          <th className="py-1 px-0.5 text-center font-bold border-r border-stone-300">No</th>
                          {cols.map((c, ci) => (
                            <th
                              key={c.key}
                              className={`py-1 font-bold ${ci < cols.length - 1 ? 'border-r border-stone-300' : ''} ${
                                c.key === 'keterangan'
                                  ? 'px-0.5 text-center text-[6.2pt] tracking-tight'
                                  : 'px-1.5 text-left'
                              }`}
                            >
                              {c.label}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-200">
                        {acara_minggu.map((item, idx) => (
                          <tr key={item.id || idx} className="hover:bg-stone-50">
                            <td className="py-0.5 px-0.5 text-center font-medium text-stone-600 border-r border-stone-200 align-top">
                              {item.urutan || idx + 1}.
                            </td>
                            {cols.map((c, ci) => (
                              <td
                                key={c.key}
                                className={`py-0.5 align-top ${ci < cols.length - 1 ? 'border-r border-stone-200' : ''} ${
                                  c.key === 'keterangan'
                                    ? 'px-1 text-right font-semibold text-stone-700 text-[6.5pt] leading-tight break-words'
                                    : 'px-1.5 text-stone-900 font-medium leading-[1.25]'
                                }`}
                              >
                                {item[c.key] || ''}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  );
                })()}
              </div>

              {/* ACARA PARTANGIANGAN (Col 2) */}
              <div className="border border-stone-400">
                <div className="bg-stone-200 text-stone-900 font-bold px-2 py-1 text-center uppercase tracking-wider text-[8pt] border-b border-stone-400">
                  Acara Partangiangan
                </div>
                {(() => {
                  const cols = data.acara_partangiangan_columns && data.acara_partangiangan_columns.length > 0
                    ? data.acara_partangiangan_columns
                    : DEFAULT_ACARA_PARTANGIANGAN_COLUMNS;
                  return (
                    <table className="w-full table-fixed border-collapse text-[7.1pt] leading-tight">
                      <colgroup>
                        <col className="w-[20px]" />
                        {cols.map((c, ci) => (
                          <col
                            key={c.key}
                            className={
                              c.key === 'keterangan'
                                ? 'w-[48px]'
                                : c.key === 'uraian' || c.key === 'tata_ibadah' || ci === 0
                                  ? ''
                                  : 'w-[56px]'
                            }
                          />
                        ))}
                      </colgroup>
                      <thead>
                        <tr className="bg-stone-100 text-stone-800 border-b border-stone-300">
                          <th className="py-1 px-0.5 text-center font-bold border-r border-stone-300">No</th>
                          {cols.map((c, ci) => (
                            <th
                              key={c.key}
                              className={`py-1 font-bold ${ci < cols.length - 1 ? 'border-r border-stone-300' : ''} ${
                                c.key === 'keterangan'
                                  ? 'px-0.5 text-center text-[6.2pt] tracking-tight'
                                  : 'px-1.5 text-left'
                              }`}
                            >
                              {c.label}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-200">
                        {acara_partangiangan.map((item, idx) => (
                          <tr key={item.id || idx} className="hover:bg-stone-50">
                            <td className="py-0.5 px-0.5 text-center font-medium text-stone-600 border-r border-stone-200 align-top">
                              {item.urutan || idx + 1}.
                            </td>
                            {cols.map((c, ci) => (
                              <td
                                key={c.key}
                                className={`py-0.5 align-top ${ci < cols.length - 1 ? 'border-r border-stone-200' : ''} ${
                                  c.key === 'keterangan'
                                    ? 'px-1 text-right font-semibold text-stone-700 text-[6.5pt] leading-tight break-words'
                                    : 'px-1.5 text-stone-900 font-medium leading-[1.25]'
                                }`}
                              >
                                {item[c.key] || ''}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  );
                })()}
              </div>
            </div>

            {/* KOTAK AYAT MINGGU (Centered scripture box) */}
            <div className="avoid-break border-2 border-stone-800 bg-stone-50 p-2 text-center rounded-sm">
              <div className="text-[7.2pt] uppercase font-bold text-stone-700 tracking-widest mb-0.5">
                Ayat Minggu / Topik Hurianta
              </div>
              <p className="font-serif-body italic text-stone-900 text-[8.6pt] leading-snug">
                &quot;{warta.ayat_teks || 'Alai angka na marhaposan tu Jahowa dapotan gogo imbaru, manangkup angka habong songon pidoli...'}&quot;
              </p>
              <div className="font-bold text-stone-900 text-[8pt] mt-0.5">
                ({warta.ayat_ref || 'Jesayas 40:31'})
              </div>
            </div>

            {/* PARHOBAS MINGGU (Dark Grey Header, Dynamic Columns) */}
            <div className="avoid-break border border-stone-400">
              <div className="bg-stone-800 text-white font-bold px-2 py-1 text-center uppercase tracking-wider text-[8pt]">
                Parhobas Minggu
              </div>
              {(() => {
                const cols = data.parhobas_columns && data.parhobas_columns.length > 0
                  ? data.parhobas_columns
                  : DEFAULT_PARHOBAS_COLUMNS;
                return (
                  <table className="w-full border-collapse text-[7.6pt]">
                    <thead>
                      <tr className="bg-stone-100 text-stone-900 border-b border-stone-400 font-bold">
                        {cols.map((c, ci) => (
                          <th
                            key={c.key}
                            className={`py-1 px-1.5 text-left ${c.key === 'peran' ? 'w-20' : ''} ${ci < cols.length - 1 ? 'border-r border-stone-300' : ''}`}
                          >
                            {c.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-200">
                      {parhobas.map((p) => (
                        <tr key={p.id} className="hover:bg-stone-50">
                          {cols.map((c, ci) => (
                            <td
                              key={c.key}
                              className={`py-1 px-1.5 ${c.key === 'peran' ? 'font-bold text-stone-900' : 'text-stone-800'} ${ci < cols.length - 1 ? 'border-r border-stone-200' : ''}`}
                            >
                              {p[c.key] || '-'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                );
              })()}
            </div>

            {/* BOTTOM SECTION: 2 Balanced Columns (Torop ni Parminggu di Minggu Nasalpu & Na Markoor Sadari On) */}
            <div className="grid grid-cols-2 gap-2.5 avoid-break items-stretch">
              {/* Torop ni Parminggu di Minggu Nasalpu */}
              <div className="border border-stone-400 p-2 bg-stone-50/70 text-[7.5pt] flex flex-col justify-between">
                <div className="font-bold text-stone-900 uppercase text-center border-b border-stone-300 pb-0.5 mb-1.5 text-[7pt] tracking-wide">
                  Torop ni Parminggu di Minggu Nasalpu
                </div>
                <div className="grid grid-cols-3 gap-1.5 text-center text-[7.4pt]">
                  <div className="bg-white p-1.5 border border-stone-200 rounded-xs">
                    <div className="text-stone-500 font-medium text-[6.8pt]">Sek. Minggu</div>
                    <div className="font-bold text-stone-900 text-[8.5pt] font-mono-num">{warta.ruas_sm || 0}</div>
                  </div>
                  <div className="bg-white p-1.5 border border-stone-200 rounded-xs">
                    <div className="text-stone-500 font-medium text-[6.8pt]">Ibadah Pagi</div>
                    <div className="font-bold text-stone-900 text-[8.5pt] font-mono-num">{warta.ruas_pagi || 0}</div>
                  </div>
                  <div className="bg-white p-1.5 border border-stone-200 rounded-xs">
                    <div className="text-stone-500 font-medium text-[6.8pt]">Ibadah Siang</div>
                    <div className="font-bold text-stone-900 text-[8.5pt] font-mono-num">{warta.ruas_siang || 0}</div>
                  </div>
                </div>
                <div className="text-center font-bold text-stone-950 text-[7.8pt] mt-1.5 pt-1 border-t border-stone-300 flex items-center justify-center gap-1.5">
                  <span className="text-stone-600 font-medium">Toropna / Total:</span>
                  <span className="font-mono-num text-[8.5pt] text-blue-950">{totalRuas} Halak</span>
                </div>
              </div>

              {/* Na Markoor Sadari On */}
              <div className="border border-stone-400 p-2 text-[7.5pt] bg-stone-50/70 flex flex-col justify-between">
                <div>
                  <div className="font-bold text-stone-900 uppercase text-center border-b border-stone-300 pb-0.5 mb-1.5 text-[7.6pt] tracking-wider">
                    Na Markoor Sadari On
                  </div>
                  <div className="space-y-1.5 text-[7.5pt]">
                    <div className="flex items-start gap-1">
                      <span className="font-bold text-stone-900 shrink-0">• Pagi (08.30): </span>
                      <span className="text-stone-800 font-medium">{warta.markoor_1 || '-'}</span>
                    </div>
                    <div className="flex items-start gap-1">
                      <span className="font-bold text-stone-900 shrink-0">• Siang (10.30): </span>
                      <span className="text-stone-800 font-medium">{warta.markoor_2 || '-'}</span>
                    </div>
                  </div>
                </div>
                <div className="text-[6.8pt] text-stone-500 italic border-t border-stone-200 pt-1 mt-1.5 text-center">
                  *Koor kategorial / punguan gereja HKBP Ressort Hutaraja
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>

      {/* Footer Halaman 1 */}
      <div className="mt-2 pt-1.5 border-t border-stone-300 flex justify-between items-center text-[7.5pt] text-stone-500">
        <span>Warta Jemaat HKBP Ressort Hutaraja · Distrik VI Dairi</span>
        <span>Halaman 1 dari 3</span>
      </div>
    </div>
  );
};
