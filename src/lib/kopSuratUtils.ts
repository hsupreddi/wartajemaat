import { KopSuratLine, PengaturanHuria } from '../types';

const KOP_BARIS_PAYLOAD_PREFIX = 'KOP_V1:';

export function createKopLineId(seed?: number): string {
  const rand = Math.random().toString(36).slice(2, 7);
  return `kop-${seed ?? Date.now()}-${rand}`;
}

/**
 * Splits a long SK Pengakuan line cleanly near the middle or on explicit newlines/slashes
 * so words like "Tahun 1988" never hang alone on a wrapped line.
 */
function splitSkIntoBalancedLines(rawSk: string): string[] {
  const trimmed = String(rawSk || '').trim();
  if (!trimmed) return [];

  if (trimmed.includes('\n')) {
    return trimmed
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean);
  }

  if (trimmed.length <= 72) {
    return [trimmed];
  }

  // Prefer splitting on " / " if present
  if (trimmed.includes(' / ')) {
    const parts = trimmed
      .split(' / ')
      .map((s) => s.trim())
      .filter(Boolean);
    if (parts.length >= 2) {
      return parts;
    }
  }

  // Otherwise split near a comma/semicolon closest to the midpoint
  const mid = Math.floor(trimmed.length / 2);
  let bestIdx = -1;
  let bestDist = Infinity;
  for (let i = 0; i < trimmed.length; i++) {
    if (trimmed[i] === ',' || trimmed[i] === ';') {
      const dist = Math.abs(i - mid);
      if (dist < bestDist) {
        bestDist = dist;
        bestIdx = i;
      }
    }
  }

  if (bestIdx > 15 && bestIdx < trimmed.length - 12) {
    const first = trimmed.slice(0, bestIdx + 1).trim();
    const second = trimmed.slice(bestIdx + 1).trim();
    if (first && second) return [first, second];
  }

  return [trimmed];
}

/**
 * Generates editable line-by-line kop surat items from legacy PengaturanHuria fields.
 */
export function buildDefaultKopBaris(pengaturan?: Partial<PengaturanHuria>): KopSuratLine[] {
  const lines: KopSuratLine[] = [];

  lines.push({
    id: 'kop-1',
    teks: pengaturan?.nama_huria || 'HURIA KRISTEN BATAK PROTESTAN (HKBP)',
    font: 'display',
    ukuran: 'xl',
    tebal: true,
    miring: false,
    kapital: true,
    jarak_bawah: '0',
    warna: 'hitam'
  });

  const skRaw =
    pengaturan?.sk_pengakuan ||
    'Pengakuan Pemerintah 11 Juni 1931 No. 48, Staatsblad Thn. 1932 No. 360, jo. No. Dp/P/DAK/d/13568, jo. No. 33 Tahun 1988';

  const skParts = skRaw.includes('\n')
    ? skRaw
        .split(/\r?\n/)
        .map((s) => s.trim())
        .filter(Boolean)
    : [skRaw.trim()];

  skParts.forEach((part, idx) => {
    lines.push({
      id: `kop-sk-${idx + 1}`,
      teks: part,
      font: 'sans',
      ukuran: 'xs',
      tebal: false,
      miring: false,
      kapital: false,
      jarak_bawah: idx === skParts.length - 1 ? '1' : '0',
      warna: 'gelap'
    });
  });

  lines.push({
    id: 'kop-distrik',
    teks: pengaturan?.distrik || 'DISTRIK VI DAIRI – RESSORT HUTARAJA',
    font: 'sans',
    ukuran: 'lg',
    tebal: true,
    miring: false,
    kapital: true,
    jarak_bawah: '0',
    warna: 'hitam'
  });

  const alamatText = `${pengaturan?.alamat || 'Jl. Persada No. 205 Desa Hutarakyat, Kec. Sidikalang'}${
    pengaturan?.telepon ? ` · Telp: ${pengaturan.telepon}` : ''
  }`;

  lines.push({
    id: 'kop-alamat',
    teks: alamatText,
    font: 'sans',
    ukuran: 'sm',
    tebal: false,
    miring: false,
    kapital: false,
    jarak_bawah: '0',
    warna: 'abu'
  });

  return lines;
}

/**
 * Generates a neatly balanced HKBP kop surat layout where long SK text is split cleanly
 * into balanced lines so no trailing orphan words appear.
 */
export function buildStandardHkbpKopBaris(pengaturan?: Partial<PengaturanHuria>): KopSuratLine[] {
  const lines: KopSuratLine[] = [
    {
      id: 'kop-std-1',
      teks: pengaturan?.nama_huria || 'HURIA KRISTEN BATAK PROTESTAN (HKBP)',
      font: 'display',
      ukuran: 'xl',
      tebal: true,
      miring: false,
      kapital: true,
      jarak_bawah: '1',
      warna: 'hitam'
    }
  ];

  const skRaw =
    pengaturan?.sk_pengakuan ||
    'Pengakuan Pemerintah 11 Juni 1931 No. 48, Staatsblad Thn. 1932 No. 360, jo. No. Dp/P/DAK/d/13568, jo. No. 33 Tahun 1988';
  const skLines = splitSkIntoBalancedLines(skRaw);
  skLines.forEach((part, idx) => {
    lines.push({
      id: `kop-std-sk-${idx + 1}`,
      teks: part,
      font: 'sans',
      ukuran: 'xs',
      tebal: false,
      miring: false,
      kapital: false,
      jarak_bawah: idx === skLines.length - 1 ? '1' : '0',
      warna: 'gelap'
    });
  });

  lines.push({
    id: 'kop-std-distrik',
    teks: pengaturan?.distrik || 'DISTRIK VI DAIRI – RESSORT HUTARAJA',
    font: 'sans',
    ukuran: 'lg',
    tebal: true,
    miring: false,
    kapital: true,
    jarak_bawah: '0',
    warna: 'hitam'
  });

  const alamatText = `${pengaturan?.alamat || 'Jl. Persada No. 205 Desa Hutarakyat, Kec. Sidikalang'}${
    pengaturan?.telepon ? ` · Telp: ${pengaturan.telepon}` : ''
  }`;
  lines.push({
    id: 'kop-std-alamat',
    teks: alamatText,
    font: 'sans',
    ukuran: 'sm',
    tebal: false,
    miring: false,
    kapital: false,
    jarak_bawah: '0',
    warna: 'abu'
  });

  return lines;
}

export function parseKopBarisFromFontKop(fontKop?: string | null): KopSuratLine[] | undefined {
  if (!fontKop || typeof fontKop !== 'string') return undefined;
  const trimmed = fontKop.trim();
  let jsonStr = '';

  if (trimmed.startsWith(KOP_BARIS_PAYLOAD_PREFIX)) {
    jsonStr = trimmed.slice(KOP_BARIS_PAYLOAD_PREFIX.length);
  } else if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    jsonStr = trimmed;
  } else {
    return undefined;
  }

  try {
    const parsed = JSON.parse(jsonStr);
    const arr = Array.isArray(parsed) ? parsed : parsed?.lines;
    if (!Array.isArray(arr) || arr.length === 0) return undefined;
    return arr.map((item: any, idx: number) => ({
      id: String(item?.id || `kop-${idx + 1}`),
      teks: String(item?.teks ?? ''),
      font: item?.font === 'display' || item?.font === 'serif' ? item.font : 'sans',
      ukuran:
        item?.ukuran === 'xl' ||
        item?.ukuran === 'lg' ||
        item?.ukuran === 'md' ||
        item?.ukuran === 'sm' ||
        item?.ukuran === 'xs'
          ? item.ukuran
          : 'sm',
      tebal: Boolean(item?.tebal),
      miring: Boolean(item?.miring),
      kapital: Boolean(item?.kapital),
      jarak_bawah:
        item?.jarak_bawah === '0' || item?.jarak_bawah === '1' || item?.jarak_bawah === '2'
          ? item.jarak_bawah
          : '0',
      warna:
        item?.warna === 'hitam' || item?.warna === 'gelap' || item?.warna === 'abu'
          ? item.warna
          : 'hitam'
    }));
  } catch {
    return undefined;
  }
}

export function serializeKopBarisToFontKop(lines?: KopSuratLine[]): string | undefined {
  if (!lines || lines.length === 0) return undefined;
  return `${KOP_BARIS_PAYLOAD_PREFIX}${JSON.stringify({ v: 1, lines })}`;
}
