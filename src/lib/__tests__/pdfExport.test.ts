import { describe, it, expect } from 'vitest';
import { buildWartaPdfFileName } from '../pdfExport';

describe('PDF Export utilities (pdfExport.tsx)', () => {
  it('builds consistent A4 PDF filenames for full document and single-page exports', () => {
    expect(buildWartaPdfFileName('2026-11-08', 'all')).toBe('Warta_HKBP_Hutaraja_2026-11-08.pdf');
    expect(buildWartaPdfFileName('2026-11-08', '1')).toBe('Warta_HKBP_Hutaraja_2026-11-08_Hal1.pdf');
    expect(buildWartaPdfFileName('2026-11-08', '3')).toBe('Warta_HKBP_Hutaraja_2026-11-08_Hal3.pdf');
  });
});
