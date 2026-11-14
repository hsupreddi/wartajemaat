import React from 'react';
import { KopSuratLine, PengaturanHuria } from '../../types';
import { HkbpCrossLogo, OFFICIAL_HKBP_CROSS_LOGO_URL } from '../logos/HkbpCrossLogo';
import {
  HkbpTransformasiLogo,
  OFFICIAL_TRANSFORMASI_LOGO_URL
} from '../logos/HkbpTransformasiLogo';
import { buildDefaultKopBaris, parseKopBarisFromFontKop } from '../../lib/kopSuratUtils';

interface KopSuratProps {
  pengaturan?: PengaturanHuria;
  compact?: boolean;
}

function getLineFontClass(font?: KopSuratLine['font']): string {
  if (font === 'display') return 'font-display tracking-wider';
  if (font === 'serif') return 'font-serif-body';
  return 'font-sans tracking-wide';
}

function getLineSizeClass(ukuran: KopSuratLine['ukuran'], compact: boolean): string {
  if (compact) {
    switch (ukuran) {
      case 'xl':
        return 'text-[11pt] sm:text-[13.5pt] md:text-[14.5pt] leading-tight';
      case 'lg':
        return 'text-[8.5pt] sm:text-[10pt] md:text-[10.5pt] leading-tight';
      case 'md':
        return 'text-[7.8pt] sm:text-[9pt] leading-tight';
      case 'sm':
        return 'text-[6.8pt] sm:text-[7.8pt] leading-tight';
      case 'xs':
      default:
        return 'text-[6.2pt] sm:text-[7pt] leading-tight';
    }
  }
  switch (ukuran) {
    case 'xl':
      return 'text-xs sm:text-base md:text-lg leading-tight';
    case 'lg':
      return 'text-[10px] sm:text-xs md:text-sm leading-tight';
    case 'md':
      return 'text-[9px] sm:text-[11px] md:text-xs leading-tight';
    case 'sm':
      return 'text-[7pt] sm:text-[8pt] leading-tight';
    case 'xs':
    default:
      return 'text-[6.4pt] sm:text-[7.4pt] md:text-[7.8pt] leading-tight';
  }
}

function getLineColorClass(warna?: KopSuratLine['warna']): string {
  if (warna === 'abu') return 'text-stone-600';
  if (warna === 'gelap') return 'text-stone-700';
  return 'text-stone-900';
}

function getLineBottomClass(jarak?: KopSuratLine['jarak_bawah']): string {
  if (jarak === '2') return 'mb-1.5';
  if (jarak === '1') return 'mb-0.5';
  return 'mb-0';
}

export const KopSurat: React.FC<KopSuratProps> = ({ pengaturan, compact = false }) => {
  const lines: KopSuratLine[] =
    pengaturan?.kop_baris && pengaturan.kop_baris.length > 0
      ? pengaturan.kop_baris
      : parseKopBarisFromFontKop(pengaturan?.font_kop) || buildDefaultKopBaris(pengaturan);

  return (
    <div className="w-full border-b-2 border-stone-900 pb-2.5 mb-3">
      <div className="flex items-center justify-between gap-2 sm:gap-3">
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

        {/* Kop Surat Center: Line by Line */}
        <div className="flex-1 text-center min-w-0 px-0.5">
          {lines.map((line) => (
            <div
              key={line.id}
              className={[
                getLineFontClass(line.font),
                getLineSizeClass(line.ukuran, compact),
                getLineColorClass(line.warna),
                getLineBottomClass(line.jarak_bawah),
                line.tebal ? 'font-bold' : 'font-normal',
                line.miring ? 'italic' : '',
                line.kapital ? 'uppercase' : ''
              ]
                .filter(Boolean)
                .join(' ')}
            >
              {line.teks || '\u00A0'}
            </div>
          ))}
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
