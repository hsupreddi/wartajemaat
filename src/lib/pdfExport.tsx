import React from 'react';
import { createRoot } from 'react-dom/client';
import { toCanvas } from 'html-to-image';
import { jsPDF } from 'jspdf';
import { FullWartaData, JadwalTetapItem, PengaturanHuria } from '../types';
import { WartaDocument } from '../components/warta/WartaDocument';

export interface ExportWartaPdfOptions {
  data: FullWartaData;
  pengaturan?: PengaturanHuria;
  jadwalTetap?: JadwalTetapItem[];
  selectedPage?: 'all' | '1' | '2' | '3';
  onProgress?: (message: string) => void;
}

export interface PdfBlockInterval {
  top: number;
  bottom: number;
  isFooter?: boolean;
}

export interface PdfPageSlice {
  startY: number;
  endY: number;
  topMarginMm: number;
  scale: number;
}

const TRANSPARENT_PIXEL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result || ''));
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function prepareImagesForCapture(container: HTMLElement): Promise<void> {
  const images = Array.from(container.querySelectorAll('img'));
  await Promise.all(
    images.map(async (img) => {
      const src = img.getAttribute('src') || '';
      if (!src) return;

      // Convert external or relative URLs to inline data URLs so html-to-image
      // never hits cross-origin canvas tainting.
      if (!src.startsWith('data:')) {
        try {
          const resp = await fetch(src, { mode: 'cors' });
          if (resp.ok) {
            const blob = await resp.blob();
            const dataUrl = await blobToDataUrl(blob);
            if (dataUrl) {
              img.setAttribute('src', dataUrl);
            }
          }
        } catch {
          // Leave local relative URL intact if same-origin; if truly cross-origin,
          // let onload/onerror or imagePlaceholder handle it safely.
        }
      }

      if (!img.complete) {
        await new Promise<void>((resolve) => {
          const timer = window.setTimeout(resolve, 2500);
          const done = () => {
            window.clearTimeout(timer);
            resolve();
          };
          img.addEventListener('load', done, { once: true });
          img.addEventListener('error', done, { once: true });
        });
      }
    })
  );
}

async function waitNextPaint(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve());
    });
  });
}

export function buildWartaPdfFileName(
  tanggalMinggu: string,
  selectedPage: 'all' | '1' | '2' | '3' = 'all'
): string {
  const cleanDate = (tanggalMinggu || 'warta').replace(/[^\w-]/g, '_');
  const suffix = selectedPage !== 'all' ? `_Hal${selectedPage}` : '';
  return `Warta_HKBP_Hutaraja_${cleanDate}${suffix}.pdf`;
}

/**
 * Pure pagination planner: computes clean A4 vertical slices [startY, endY] in CSS pixels
 * without cutting through atomic blocks (table rows, headers+first-row, sections, or footers)
 * and prevents trailing near-empty or footer-only orphan pages.
 */
export function calculatePdfPageSlices(
  blocks: PdfBlockInterval[],
  totalHeightPx: number,
  pxPerMm: number
): PdfPageSlice[] {
  const pageWidthMm = 210;
  const pageHeightMm = 297;
  const safePxPerMm = pxPerMm > 0 ? pxPerMm : 794 / pageWidthMm;
  const a4HeightPx = pageHeightMm * safePxPerMm;

  const validBlocks = blocks
    .filter((b) => Number.isFinite(b.top) && Number.isFinite(b.bottom) && b.bottom - b.top > 1)
    .sort((a, b) => a.top - b.top || a.bottom - b.bottom);

  const maxBlockBottom = validBlocks.reduce((max, b) => Math.max(max, b.bottom), 0);
  const contentHeightPx = Math.max(maxBlockBottom > 0 ? maxBlockBottom + 4 * safePxPerMm : 0, 1);
  // Ignore trailing empty padding caused solely by CSS min-height when content itself is shorter or near A4
  const effectiveTotalPx =
    totalHeightPx > contentHeightPx && contentHeightPx <= a4HeightPx * 1.055
      ? Math.min(totalHeightPx, Math.max(a4HeightPx, contentHeightPx))
      : Math.max(totalHeightPx, maxBlockBottom);

  // Fits on 1 single A4 page (allowing up to ~5.5% gentle auto-fit scaling to avoid orphan spillovers)
  if (effectiveTotalPx <= a4HeightPx * 1.055) {
    const scale = effectiveTotalPx > a4HeightPx ? a4HeightPx / effectiveTotalPx : 1;
    return [
      {
        startY: 0,
        endY: effectiveTotalPx,
        topMarginMm: 0,
        scale
      }
    ];
  }

  const slices: PdfPageSlice[] = [];
  let startY = 0;

  const countStraddling = (y: number) =>
    validBlocks.filter((b) => b.top < y - 0.5 && b.bottom > y + 0.5).length;

  const isOrphanFooterOnlyAfter = (y: number) => {
    const hasFooterAfter = validBlocks.some((b) => b.isFooter && b.bottom > y + 2);
    if (!hasFooterAfter) return false;
    const hasNonFooterContentAfter = validBlocks.some(
      (b) => !b.isFooter && b.bottom > y + 4
    );
    return !hasNonFooterContentAfter;
  };

  while (startY < effectiveTotalPx - 4) {
    const isFirst = slices.length === 0;
    const topMarginMm = isFirst ? 0 : 7;
    const bottomMarginMm = 6;
    const fullPageAvailableMm = pageHeightMm - topMarginMm;
    const fullPageAvailablePx = fullPageAvailableMm * safePxPerMm;
    const maxContentPx = (pageHeightMm - topMarginMm - bottomMarginMm) * safePxPerMm;

    const remainingPx = effectiveTotalPx - startY;
    // Remaining content fits cleanly on one final page (with gentle <= 4% tolerance)
    if (remainingPx <= fullPageAvailablePx * 1.04) {
      const scale = remainingPx > fullPageAvailablePx ? fullPageAvailablePx / remainingPx : 1;
      slices.push({
        startY,
        endY: effectiveTotalPx,
        topMarginMm,
        scale
      });
      break;
    }

    const maxEndY = startY + maxContentPx;
    const minAdvanceY = startY + Math.max(40, maxContentPx * 0.18);

    // Gather candidate break positions in (minAdvanceY, maxEndY]
    const candidateSet = new Set<number>();
    for (const b of validBlocks) {
      const topGap = b.top - 1;
      const bottomGap = b.bottom + 1;
      if (topGap > minAdvanceY && topGap <= maxEndY) {
        candidateSet.add(Math.round(topGap * 10) / 10);
      }
      if (bottomGap > minAdvanceY && bottomGap <= maxEndY) {
        candidateSet.add(Math.round(bottomGap * 10) / 10);
      }
    }

    // Add midpoints between consecutive non-overlapping bands for cleaner borders
    const sortedEdges = Array.from(candidateSet).sort((a, b) => a - b);
    for (let k = 0; k < sortedEdges.length - 1; k++) {
      const mid = (sortedEdges[k] + sortedEdges[k + 1]) / 2;
      if (mid > minAdvanceY && mid <= maxEndY && countStraddling(mid) === 0) {
        candidateSet.add(Math.round(mid * 10) / 10);
      }
    }

    const candidatesDesc = Array.from(candidateSet).sort((a, b) => b - a);
    const zeroStraddle = candidatesDesc.filter((y) => countStraddling(y) === 0);

    // Prefer a zero-straddle cut that doesn't strand only the footer onto the next page
    let chosenY: number | undefined = zeroStraddle.find((y) => !isOrphanFooterOnlyAfter(y));
    if (chosenY === undefined) {
      chosenY = zeroStraddle[0];
    }

    // Fallback if an extra-tall staggered multi-column block spans the whole window
    if (chosenY === undefined && candidatesDesc.length > 0) {
      let bestScore = Number.POSITIVE_INFINITY;
      for (const y of candidatesDesc) {
        const straddle = countStraddling(y);
        if (straddle < bestScore) {
          bestScore = straddle;
          chosenY = y;
        }
      }
    }

    if (chosenY === undefined || chosenY <= startY + 12) {
      chosenY = Math.min(maxEndY, effectiveTotalPx);
    }

    slices.push({
      startY,
      endY: chosenY,
      topMarginMm,
      scale: 1
    });

    startY = chosenY;

    // Guard against trailing blank margin after the last visible block
    if (maxBlockBottom > 0 && startY >= maxBlockBottom - 2) {
      break;
    }
  }

  return slices;
}

function extractAtomicBlocks(node: HTMLElement): PdfBlockInterval[] {
  const rootRect = node.getBoundingClientRect();
  const rel = (el: Element): PdfBlockInterval => {
    const r = el.getBoundingClientRect();
    return {
      top: r.top - rootRect.top,
      bottom: r.bottom - rootRect.top,
      isFooter: el.hasAttribute('data-pdf-footer')
    };
  };

  const blocks: PdfBlockInterval[] = [];
  const handled = new Set<Element>();

  // 1. Atomic containers (footers, compact summary sections like E & F)
  node.querySelectorAll('[data-pdf-atomic="true"]').forEach((el) => {
    handled.add(el);
    blocks.push(rel(el));
  });

  const isInsideHandled = (el: Element): boolean => {
    let curr: Element | null = el.parentElement;
    while (curr && curr !== node) {
      if (handled.has(curr)) return true;
      curr = curr.parentElement;
    }
    return false;
  };

  // 2. Explicit atomic content blocks (headers, cards, announcements)
  node.querySelectorAll('[data-pdf-block="true"]').forEach((el) => {
    if (isInsideHandled(el)) return;
    handled.add(el);
    blocks.push(rel(el));
  });

  // 3. Tables (group optional section title strip + thead + first tbody row cleanly)
  node.querySelectorAll('table').forEach((table) => {
    if (isInsideHandled(table)) return;

    const parent = table.parentElement;
    const sectionHeader = parent?.querySelector(':scope > [data-pdf-section-header="true"]') ?? null;
    const cardTopEl =
      sectionHeader && parent?.tagName === 'SECTION' && parent.firstElementChild === sectionHeader
        ? parent
        : sectionHeader;

    const thead = table.querySelector(':scope > thead');
    const bodyRows = Array.from(table.querySelectorAll(':scope > tbody > tr'));
    const tfoot = table.querySelector(':scope > tfoot');

    const headerTop = cardTopEl
      ? rel(cardTopEl).top
      : thead
        ? rel(thead).top
        : rel(table).top;

    if (bodyRows.length > 0) {
      const firstRowRect = rel(bodyRows[0]);
      blocks.push({
        top: Math.min(headerTop, firstRowRect.top),
        bottom: firstRowRect.bottom
      });

      for (let idx = 1; idx < bodyRows.length; idx++) {
        blocks.push(rel(bodyRows[idx]));
      }
    } else if (thead || sectionHeader) {
      const bottom = thead ? rel(thead).bottom : rel(sectionHeader!).bottom;
      blocks.push({ top: headerTop, bottom });
    }

    if (tfoot) {
      blocks.push(rel(tfoot));
    }
  });

  // 4. Standalone .avoid-break blocks without tables
  node.querySelectorAll('.avoid-break').forEach((el) => {
    if (handled.has(el) || isInsideHandled(el)) return;
    if (el.querySelector('table')) return;
    blocks.push(rel(el));
  });

  return blocks.filter((b) => b.bottom - b.top > 1);
}

function canvasHasInk(canvas: HTMLCanvasElement): boolean {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return true;
  const { width, height } = canvas;
  if (width === 0 || height === 0) return false;
  const pixels = ctx.getImageData(0, 0, width, height).data;
  for (let y = 0; y < height; y += 4) {
    for (let x = 0; x < width; x += 8) {
      const idx = (y * width + x) * 4;
      const r = pixels[idx];
      const g = pixels[idx + 1];
      const b = pixels[idx + 2];
      const a = pixels[idx + 3];
      if (a > 10 && (r < 248 || g < 248 || b < 248)) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Generates and downloads an authentic A4 PDF file directly from WartaDocument
 * without relying on the browser's window.print() dialog.
 */
export async function exportWartaToPdf({
  data,
  pengaturan,
  jadwalTetap,
  selectedPage = 'all',
  onProgress
}: ExportWartaPdfOptions): Promise<string> {
  const host = document.createElement('div');
  host.className = 'pdf-export-host';
  host.style.position = 'fixed';
  host.style.left = '-12000px';
  host.style.top = '0';
  host.style.width = '210mm';
  host.style.backgroundColor = '#ffffff';
  host.style.color = '#000000';
  host.style.zIndex = '-1';
  host.style.pointerEvents = 'none';
  host.style.overflow = 'visible';

  document.body.appendChild(host);
  const root = createRoot(host);

  try {
    onProgress?.('Menyiapkan tata letak A4...');
    root.render(
      <WartaDocument
        data={data}
        pengaturan={pengaturan}
        jadwalTetap={jadwalTetap}
        selectedPage={selectedPage}
      />
    );

    await waitNextPaint();
    if (document.fonts?.ready) {
      await document.fonts.ready;
    }
    await prepareImagesForCapture(host);
    await waitNextPaint();

    const pageNodes = Array.from(
      host.querySelectorAll('.a4-sheet-preview')
    ) as HTMLElement[];

    if (pageNodes.length === 0) {
      throw new Error('Halaman dokumen warta tidak ditemukan untuk diekspor.');
    }

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true
    });

    const pageWidthMm = 210;
    let pdfPageAddedCount = 0;

    for (let i = 0; i < pageNodes.length; i++) {
      onProgress?.(`Membuat halaman ${i + 1} dari ${pageNodes.length}...`);
      const node = pageNodes[i];

      const nodeWidth = node.offsetWidth || 794;
      const nodeHeight = node.offsetHeight || 1123;
      const pxPerMm = nodeWidth / pageWidthMm;
      const blocks = extractAtomicBlocks(node);
      const slices = calculatePdfPageSlices(blocks, nodeHeight, pxPerMm);

      let sourceCanvas: HTMLCanvasElement;
      try {
        sourceCanvas = await toCanvas(node, {
          pixelRatio: 2,
          backgroundColor: '#ffffff',
          cacheBust: false,
          imagePlaceholder: TRANSPARENT_PIXEL
        });
      } catch {
        // Fallback when external stylesheet blocks cssRules access for webfont embedding
        sourceCanvas = await toCanvas(node, {
          pixelRatio: 2,
          backgroundColor: '#ffffff',
          cacheBust: false,
          skipFonts: true,
          imagePlaceholder: TRANSPARENT_PIXEL
        });
      }

      const scaleFactor = sourceCanvas.width / nodeWidth;

      for (const slice of slices) {
        const sy = Math.max(0, Math.round(slice.startY * scaleFactor));
        const maxAvailableH = sourceCanvas.height - sy;
        const sh = Math.min(maxAvailableH, Math.max(1, Math.round((slice.endY - slice.startY) * scaleFactor)));
        if (sh <= 2) continue;

        const sliceCanvas = document.createElement('canvas');
        sliceCanvas.width = sourceCanvas.width;
        sliceCanvas.height = sh;
        const ctx = sliceCanvas.getContext('2d');
        if (!ctx) continue;

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
        ctx.drawImage(
          sourceCanvas,
          0,
          sy,
          sourceCanvas.width,
          sh,
          0,
          0,
          sliceCanvas.width,
          sliceCanvas.height
        );

        // Never append an empty white page
        if (pdfPageAddedCount > 0 && !canvasHasInk(sliceCanvas)) {
          continue;
        }

        if (pdfPageAddedCount > 0) {
          pdf.addPage();
        }
        pdfPageAddedCount++;

        const sliceHeightMm = (slice.endY - slice.startY) / pxPerMm;
        const renderWidthMm = pageWidthMm * slice.scale;
        const renderHeightMm = sliceHeightMm * slice.scale;
        const offsetX = (pageWidthMm - renderWidthMm) / 2;
        const sliceDataUrl = sliceCanvas.toDataURL('image/png');

        pdf.addImage(
          sliceDataUrl,
          'PNG',
          offsetX,
          slice.topMarginMm,
          renderWidthMm,
          renderHeightMm,
          undefined,
          'FAST'
        );
      }
    }

    const fileName = buildWartaPdfFileName(data.warta.tanggal_minggu, selectedPage);
    pdf.save(fileName);
    return fileName;
  } finally {
    root.unmount();
    host.remove();
  }
}

