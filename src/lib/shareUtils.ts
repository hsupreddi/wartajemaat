import { PengaturanHuria, WartaRecord } from '../types';
import { formatTanggalLengkap } from './dateUtils';

export type MobilePortalView = 'beranda' | 'baca' | 'kegiatan' | 'pengumuman';
export type MobileReaderSection = 'liturgi' | 'warta' | 'ultah' | 'keuangan' | 'jadwal';

export interface BuildWartaShareUrlOptions {
  wartaId?: string;
  view?: MobilePortalView;
  sec?: MobileReaderSection;
  origin?: string;
}

export function buildWartaShareUrl({
  wartaId,
  view,
  sec,
  origin
}: BuildWartaShareUrlOptions): string {
  const baseOrigin =
    origin !== undefined
      ? origin
      : typeof window !== 'undefined'
      ? window.location.origin
      : 'https://ewarta-hkbp.local';

  const params = new URLSearchParams();
  if (wartaId) params.set('id', wartaId);
  if (view && view !== 'beranda') params.set('view', view);
  if (sec) params.set('sec', sec);

  const query = params.toString();
  return query ? `${baseOrigin}/?${query}` : `${baseOrigin}/`;
}

export function buildWartaShareMessage({
  warta,
  pengaturan,
  url,
  sectionLabel,
  highlightTitle,
  highlightBody
}: {
  warta?: Pick<WartaRecord, 'goar_minggu' | 'tanggal_minggu' | 'topik_minggu'>;
  pengaturan?: Pick<PengaturanHuria, 'nama_huria'>;
  url: string;
  sectionLabel?: string;
  highlightTitle?: string;
  highlightBody?: string;
}): string {
  const gereja = pengaturan?.nama_huria?.trim() || 'HKBP Ressort Hutaraja';
  const lines: string[] = [];

  if (highlightTitle) {
    lines.push(`*${highlightTitle}*`);
    if (highlightBody) {
      const trimmedBody = highlightBody.trim();
      lines.push(trimmedBody.length > 260 ? `${trimmedBody.slice(0, 257)}...` : trimmedBody);
    }
    if (warta) {
      lines.push(
        `Warta Minggu ${warta.goar_minggu} (${formatTanggalLengkap(warta.tanggal_minggu)}) · ${gereja}`
      );
    }
  } else if (warta) {
    lines.push(`*Warta Jemaat ${gereja}*`);
    lines.push(`MINGGU ${warta.goar_minggu} — ${formatTanggalLengkap(warta.tanggal_minggu)}`);
    if (warta.topik_minggu) {
      lines.push(`Topik: "${warta.topik_minggu}"`);
    }
    if (sectionLabel) {
      lines.push(`Bagian: ${sectionLabel}`);
    }
  } else {
    lines.push(`*Warta Jemaat Digital ${gereja}*`);
  }

  lines.push(`Baca selengkapnya: ${url}`);
  return lines.join('\n');
}

export function buildWhatsAppShareUrl(message: string): string {
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}

export async function executeWebShare({
  title,
  text,
  url
}: {
  title: string;
  text: string;
  url: string;
}): Promise<'shared' | 'copied' | 'cancelled'> {
  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      await navigator.share({ title, text, url });
      return 'shared';
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        return 'cancelled';
      }
    }
  }

  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(`${text}`);
    return 'copied';
  }

  return 'cancelled';
}
