import React from 'react';
import { PengaturanHuria } from '../../types';
import { HkbpCrossLogo, OFFICIAL_HKBP_CROSS_LOGO_URL } from '../logos/HkbpCrossLogo';
import {
  HkbpTransformasiLogo,
  OFFICIAL_TRANSFORMASI_LOGO_URL
} from '../logos/HkbpTransformasiLogo';

interface KopSuratProps {
  pengaturan?: PengaturanHuria;
  compact?: boolean;
}

export const KopSurat: React.FC<KopSuratProps> = ({ pengaturan, compact = false }) => {
  return (
    <div className="w-full border-b-2 border-stone-900 pb-2.5 mb-3">
      <div className="flex items-center justify-between gap-2 sm:gap-4">
        {/* Logo Kiri: Salib HKBP */}
        <div className="shrink-0 flex items-center justify-center">
          {pengaturan?.logo_salib_url ? (
            <img
              src={pengaturan.logo_salib_url}
              alt="Logo Salib HKBP"
              className={
                compact
                  ? 'w-11 h-11 sm:w-14 sm:h-14 object-contain'
                  : 'w-12 h-12 sm:w-16 sm:h-16 object-contain'
              }
              referrerPolicy="no-referrer"
              onError={(e) => {
                const img = e.currentTarget;
                if (img.src !== window.location.origin + OFFICIAL_HKBP_CROSS_LOGO_URL) {
                  img.src = OFFICIAL_HKBP_CROSS_LOGO_URL;
                }
              }}
            />
          ) : (
            <HkbpCrossLogo
              className={compact ? 'w-11 h-11 sm:w-14 sm:h-14' : 'w-12 h-12 sm:w-16 sm:h-16'}
            />
          )}
        </div>

        {/* Kop Surat Center */}
        <div className="flex-1 text-center min-w-0">
          <h1 className="font-display font-bold text-stone-900 tracking-wider text-xs sm:text-base md:text-lg leading-tight uppercase">
            {pengaturan?.nama_huria || 'HURIA KRISTEN BATAK PROTESTAN (HKBP)'}
          </h1>

          <p className="text-[6.5pt] sm:text-[7.5pt] md:text-[8pt] text-stone-700 leading-tight my-0.5 max-w-2xl mx-auto px-1 sm:px-2">
            {pengaturan?.sk_pengakuan ||
              'Pengakuan Pemerintah 11 Juni 1931 No. 48, Staatsblad Thn. 1932 No. 360 / jo. No. Dp/P/DAK/d/13568, jo. No. 33 Tahun 1988 / Pengakuan Ulang Pemerintah RI Tgl. 2 April 1968, Dp/P/DAK/d/135/68'}
          </p>

          <h2 className="font-sans font-bold text-stone-900 tracking-wide text-[10px] sm:text-xs md:text-sm uppercase leading-tight">
            {pengaturan?.distrik || 'DISTRIK VI DAIRI – RESSORT HUTARAJA'}
          </h2>

          <p className="text-[7pt] sm:text-[8pt] text-stone-600 leading-tight">
            {pengaturan?.alamat || 'Jl. Persada No. 205 Desa Hutarakyat, Kec. Sidikalang'}
            {pengaturan?.telepon ? ` · Telp: ${pengaturan.telepon}` : ''}
          </p>
        </div>

        {/* Logo Kanan: Transformasi HKBP 2024-2028 */}
        <div className="shrink-0 flex items-center justify-center">
          {pengaturan?.logo_transformasi_url ? (
            <img
              src={pengaturan.logo_transformasi_url}
              alt="Logo Transformasi HKBP 2024-2028 · Roma 12:2"
              className={
                compact
                  ? 'w-13 h-13 sm:w-16 sm:h-16 object-contain'
                  : 'w-14 h-14 sm:w-[74px] sm:h-[74px] object-contain'
              }
              referrerPolicy="no-referrer"
              onError={(e) => {
                const img = e.currentTarget;
                if (img.src !== window.location.origin + OFFICIAL_TRANSFORMASI_LOGO_URL) {
                  img.src = OFFICIAL_TRANSFORMASI_LOGO_URL;
                }
              }}
            />
          ) : (
            <HkbpTransformasiLogo
              className={
                compact ? 'w-13 h-13 sm:w-16 sm:h-16' : 'w-14 h-14 sm:w-[74px] sm:h-[74px]'
              }
            />
          )}
        </div>
      </div>
    </div>
  );
};
