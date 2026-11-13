import React from 'react';

interface LogoProps {
  className?: string;
  size?: number;
}

/**
 * Official HKBP Theme 2024-2028:
 * "TRANSFORMASI HKBP 2024-2028 · ROMA 12:2"
 */
export const HkbpTransformasiLogo: React.FC<LogoProps> = ({ className = 'w-14 h-14', size = 56 }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Logo Transformasi HKBP 2024-2028"
    >
      {/* Dynamic circular crest with gear/flame transform motif */}
      <circle cx="50" cy="50" r="47" fill="#ffffff" stroke="#047857" strokeWidth="2" />
      <circle cx="50" cy="50" r="43" fill="#ecfdf5" stroke="#10b981" strokeWidth="1" strokeDasharray="3,1.5" />

      {/* Flame of the Holy Spirit / Metamorphosis leaf motif */}
      <path
        d="M50 18 C38 28 35 44 44 54 C40 50 42 42 48 38 C48 46 54 50 56 56 C62 48 64 36 50 18 Z"
        fill="#059669"
      />
      <path
        d="M50 25 C45 32 44 42 50 49 C53 43 54 35 50 25 Z"
        fill="#34d399"
      />

      {/* Cross in center */}
      <rect x="48" y="44" width="4" height="24" rx="1" fill="#065f46" />
      <rect x="41" y="50" width="18" height="4" rx="1" fill="#065f46" />

      {/* Banner / Arc Typography */}
      <rect x="15" y="72" width="70" height="13" rx="3" fill="#065f46" />
      <text
        x="50"
        y="81"
        textAnchor="middle"
        fontSize="5.8"
        fontWeight="800"
        fill="#ffffff"
        fontFamily="sans-serif"
        letterSpacing="0.4"
      >
        TRANSFORMASI
      </text>

      {/* Years & Verse citation */}
      <text
        x="50"
        y="93"
        textAnchor="middle"
        fontSize="5.5"
        fontWeight="bold"
        fill="#047857"
        fontFamily="sans-serif"
      >
        2024-2028 · RM 12:2
      </text>
    </svg>
  );
};
