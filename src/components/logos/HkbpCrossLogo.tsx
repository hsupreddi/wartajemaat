import React from 'react';

interface LogoProps {
  className?: string;
  size?: number;
}

/**
 * Official HKBP Cross Crest (Huria Kristen Batak Protestan)
 */
export const HkbpCrossLogo: React.FC<LogoProps> = ({ className = 'w-14 h-14', size = 56 }) => {
  return (
    <img
      src="/assets/aistudio/Logo-HKBP_02090ed7.png"
      alt="Logo Huria Kristen Batak Protestan (HKBP)"
      width={size}
      height={size}
      className={`object-contain inline-block shrink-0 ${className}`}
      style={{ maxWidth: size ? `${size}px` : undefined, maxHeight: size ? `${size}px` : undefined }}
    />
  );
};
