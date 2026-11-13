import React from 'react';
import { PengaturanHuria } from '../../types';
import { HkbpCrossLogo } from '../logos/HkbpCrossLogo';
import { HkbpTransformasiLogo } from '../logos/HkbpTransformasiLogo';

interface KopSuratProps {
  pengaturan?: PengaturanHuria;
  compact?: boolean;
}

export const KopSurat: React.FC<KopSuratProps> = ({ pengaturan, compact = false }) => {
  return (
    <div className="w-full border-b-2 border-stone-900 pb-2 mb-3">
      <div className="flex items-center justify-between gap-3">
        {/* Logo Kiri: Salib HKBP */}
        <div className="shrink-0 flex items-center justify-center">
          {pengaturan?.logo_salib_url ? (
            <img
              src={pengaturan.logo_salib_url}
              alt="Logo Salib HKBP"
              className={compact ? 'w-10 h-10 object-contain' : 'w-14 h-14 object-contain'}
              referrerPolicy="no-referrer"
              onError={(e) => {
                // Hide broken image and fallback
                (e.currentTarget as HTMLElement).style.display = 'none';
              }}
            />
          ) : (
            <HkbpCrossLogo size={compact ? 42 : 56} />
          )}
        </div>

        {/* Kop Surat Center */}
        <div className="flex-1 text-center">
          <h1 className="font-display font-bold text-stone-900 tracking-wider text-base md:text-lg leading-tight uppercase">
            {pengaturan?.nama_huria || 'HURIA KRISTEN BATAK PROTESTAN (HKBP)'}
          </h1>

          <p className="text-[7.5pt] md:text-[8pt] text-stone-700 leading-tight my-0.5 max-w-2xl mx-auto px-2">
            {pengaturan?.sk_pengakuan ||
              'Pengakuan Pemerintah 11 Juni 1931 No. 48, Staatsblad Thn. 1932 No. 360 / jo. No. Dp/P/DAK/d/13568, jo. No. 33 Tahun 1988 / Pengakuan Ulang Pemerintah RI Tgl. 2 April 1968, Dp/P/DAK/d/135/68'}
          </p>

          <h2 className="font-sans font-bold text-stone-900 tracking-wide text-xs md:text-sm uppercase leading-tight">
            {pengaturan?.distrik || 'DISTRIK VI DAIRI – RESSORT HUTARAJA'}
          </h2>

          <p className="text-[8pt] text-stone-600 leading-tight">
            {pengaturan?.alamat || 'Jl. Persada No. 205 Desa Hutarakyat, Kec. Sidikalang'}
            {pengaturan?.telepon ? ` · Telp: ${pengaturan.telepon}` : ''}
          </p>
        </div>

        {/* Logo Kanan: Transformasi HKBP 2024-2028 */}
        <div className="shrink-0 flex items-center justify-center">
          {pengaturan?.logo_transformasi_url ? (
            <img
              src={pengaturan.logo_transformasi_url}
              alt="Logo Transformasi HKBP"
              className={compact ? 'w-10 h-10 object-contain' : 'w-14 h-14 object-contain'}
              referrerPolicy="no-referrer"
              onError={(e) => {
                (e.currentTarget as HTMLElement).style.display = 'none';
              }}
            />
          ) : (
            <HkbpTransformasiLogo size={compact ? 42 : 56} />
          )}
        </div>
      </div>
    </div>
  );
};
