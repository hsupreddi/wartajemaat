import { describe, it, expect } from 'vitest';
import {
  buildWartaPdfFileName,
  calculatePdfPageSlices,
  PdfBlockInterval
} from '../pdfExport';

describe('PDF Export utilities (pdfExport.tsx)', () => {
  const pxPerMm = 794 / 210; // ~3.781 px per mm (standard 96 DPI A4 width)
  const a4HeightPx = 297 * pxPerMm;

  it('builds consistent A4 PDF filenames for full document and single-page exports', () => {
    expect(buildWartaPdfFileName('2026-11-08', 'all')).toBe('Warta_HKBP_Hutaraja_2026-11-08.pdf');
    expect(buildWartaPdfFileName('2026-11-08', '1')).toBe('Warta_HKBP_Hutaraja_2026-11-08_Hal1.pdf');
    expect(buildWartaPdfFileName('2026-11-08', '3')).toBe('Warta_HKBP_Hutaraja_2026-11-08_Hal3.pdf');
  });

  it('fits a slightly overflowing page (<= ~5.5%) onto a single A4 page without creating an orphan page', () => {
    const blocks: PdfBlockInterval[] = [
      { top: 24, bottom: 200 },
      { top: 210, bottom: 1100 },
      { top: 1110, bottom: 1165, isFooter: true }
    ];
    // Total ~310mm (13mm over 297mm)
    const slices = calculatePdfPageSlices(blocks, 310 * pxPerMm, pxPerMm);
    expect(slices).toHaveLength(1);
    expect(slices[0].startY).toBe(0);
    expect(slices[0].scale).toBeLessThan(1);
    expect(slices[0].scale).toBeGreaterThan(0.94);
  });

  it('breaks multi-page content cleanly above a straddling section header+row block', () => {
    // Reproduces Page 3 scenario: Section A & B+C finish at ~275mm,
    // Sumbangan Natal (header+thead+row1) runs 282mm..312mm (straddling 291mm cut),
    // followed by D/E/F + Footer up to 440mm.
    const blocks: PdfBlockInterval[] = [
      { top: 20 * pxPerMm, bottom: 150 * pxPerMm },
      { top: 155 * pxPerMm, bottom: 275 * pxPerMm },
      { top: 282 * pxPerMm, bottom: 312 * pxPerMm }, // Sumbangan Natal header + row1
      { top: 314 * pxPerMm, bottom: 380 * pxPerMm },
      { top: 385 * pxPerMm, bottom: 430 * pxPerMm, isFooter: true }
    ];

    const slices = calculatePdfPageSlices(blocks, 440 * pxPerMm, pxPerMm);
    expect(slices).toHaveLength(2);
    // Cut must happen strictly BEFORE Sumbangan Natal (between 275mm and 282mm)
    expect(slices[0].endY).toBeGreaterThanOrEqual(275 * pxPerMm);
    expect(slices[0].endY).toBeLessThanOrEqual(282 * pxPerMm);
    // Second slice continues cleanly from that cut with 7mm top margin
    expect(slices[1].startY).toBe(slices[0].endY);
    expect(slices[1].topMarginMm).toBe(7);
  });

  it('prevents stranding an orphan footer alone on a trailing empty page', () => {
    // Long multi-page content (360mm) where blocks end around 340mm and footer is 342..356mm,
    // wait: test a 2-page split where if we cut right after last content (288mm), only footer (320..335mm) remains
    const blocks: PdfBlockInterval[] = [
      { top: 20 * pxPerMm, bottom: 180 * pxPerMm },
      { top: 185 * pxPerMm, bottom: 265 * pxPerMm },
      { top: 270 * pxPerMm, bottom: 325 * pxPerMm }, // content that extends past 1 page
      { top: 332 * pxPerMm, bottom: 348 * pxPerMm, isFooter: true }
    ];

    const slices = calculatePdfPageSlices(blocks, 355 * pxPerMm, pxPerMm);
    expect(slices).toHaveLength(2);
    // Page 2 must NOT contain only the footer (startY must be <= 270mm so content accompanies the footer)
    expect(slices[1].startY).toBeLessThanOrEqual(270 * pxPerMm);
  });

  it('ignores excess CSS container padding when all visible blocks fit within A4', () => {
    const blocks: PdfBlockInterval[] = [
      { top: 24, bottom: 400 },
      { top: 410, bottom: 980 },
      { top: 1020, bottom: 1080, isFooter: true }
    ];
    // Container height artificially taller (e.g. 320mm) even though last block ends at ~286mm
    const slices = calculatePdfPageSlices(blocks, 320 * pxPerMm, pxPerMm);
    expect(slices).toHaveLength(1);
    expect(slices[0].endY).toBeLessThanOrEqual(a4HeightPx * 1.01);
  });
});

