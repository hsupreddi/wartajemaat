import React from 'react';
import { createRoot } from 'react-dom/client';
import { toPng } from 'html-to-image';
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
    const pageHeightMm = 297;

    for (let i = 0; i < pageNodes.length; i++) {
      onProgress?.(`Membuat halaman ${i + 1} dari ${pageNodes.length}...`);
      const node = pageNodes[i];

      let imgDataUrl: string;
      try {
        imgDataUrl = await toPng(node, {
          pixelRatio: 2,
          backgroundColor: '#ffffff',
          cacheBust: false,
          imagePlaceholder: TRANSPARENT_PIXEL
        });
      } catch {
        // Fallback when external stylesheet blocks cssRules access for webfont embedding
        imgDataUrl = await toPng(node, {
          pixelRatio: 2,
          backgroundColor: '#ffffff',
          cacheBust: false,
          skipFonts: true,
          imagePlaceholder: TRANSPARENT_PIXEL
        });
      }

      const nodeWidth = node.offsetWidth || 794;
      const nodeHeight = node.offsetHeight || 1123;
      const imgHeightMm = (nodeHeight * pageWidthMm) / nodeWidth;

      if (i > 0) {
        pdf.addPage();
      }

      // Fit cleanly on single A4 page if within minor overflow tolerance (<= ~6%),
      // otherwise paginate cleanly across multiple A4 sheets.
      if (imgHeightMm <= pageHeightMm + 18) {
        const scale = imgHeightMm > pageHeightMm ? pageHeightMm / imgHeightMm : 1;
        const renderWidthMm = pageWidthMm * scale;
        const renderHeightMm = imgHeightMm * scale;
        const offsetX = (pageWidthMm - renderWidthMm) / 2;
        pdf.addImage(imgDataUrl, 'PNG', offsetX, 0, renderWidthMm, renderHeightMm, undefined, 'FAST');
      } else {
        let heightLeft = imgHeightMm;
        let yPosition = 0;
        pdf.addImage(imgDataUrl, 'PNG', 0, yPosition, pageWidthMm, imgHeightMm, undefined, 'FAST');
        heightLeft -= pageHeightMm;

        while (heightLeft > 2) {
          yPosition -= pageHeightMm;
          pdf.addPage();
          pdf.addImage(imgDataUrl, 'PNG', 0, yPosition, pageWidthMm, imgHeightMm, undefined, 'FAST');
          heightLeft -= pageHeightMm;
        }
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
