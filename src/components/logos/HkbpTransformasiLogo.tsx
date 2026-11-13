import React from 'react';

interface LogoProps {
  className?: string;
  size?: number;
  withLightFrame?: boolean;
}

export const OFFICIAL_TRANSFORMASI_LOGO_URL =
  '/assets/aistudio/Logo-Tahun-Transformasi-HKBP-2025-Fulcolor_247b231a.png';

/**
 * Official HKBP Theme 2024-2028:
 * "TRANSFORMASI HKBP 2024-2028 · ROMA 12:2"
 */
export const HkbpTransformasiLogo: React.FC<LogoProps> = ({
  className = 'w-16 h-16',
  size,
  withLightFrame = false
}) => {
  const imgElement = (
    <img
      src={OFFICIAL_TRANSFORMASI_LOGO_URL}
      alt="Logo Transformasi HKBP 2024-2028 · Roma 12:2"
      width={size}
      height={size}
      referrerPolicy="no-referrer"
      className={`object-contain inline-block shrink-0 ${withLightFrame ? 'w-full h-full' : className}`}
      style={!withLightFrame && size ? { maxWidth: `${size}px`, maxHeight: `${size}px` } : undefined}
    />
  );

  if (withLightFrame) {
    return (
      <div
        className={`bg-white rounded-xl p-1 shadow-sm ring-1 ring-black/5 flex items-center justify-center shrink-0 overflow-hidden ${className}`}
        style={size ? { width: `${size}px`, height: `${size}px` } : undefined}
      >
        {imgElement}
      </div>
    );
  }

  return imgElement;
};
