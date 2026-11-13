import React from 'react';

interface LogoProps {
  className?: string;
  size?: number;
  withLightFrame?: boolean;
}

export const OFFICIAL_HKBP_CROSS_LOGO_URL = '/assets/aistudio/Logo-HKBP_02090ed7.png';

/**
 * Official HKBP Cross Crest (Huria Kristen Batak Protestan)
 */
export const HkbpCrossLogo: React.FC<LogoProps> = ({
  className = 'w-14 h-14',
  size,
  withLightFrame = false
}) => {
  const imgElement = (
    <img
      src={OFFICIAL_HKBP_CROSS_LOGO_URL}
      alt="Logo Huria Kristen Batak Protestan (HKBP)"
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
