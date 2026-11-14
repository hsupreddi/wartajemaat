import { describe, it, expect, beforeEach } from 'vitest';
import {
  buildDefaultKopBaris,
  buildStandardHkbpKopBaris,
  parseKopBarisFromFontKop,
  serializeKopBarisToFontKop
} from '../kopSuratUtils';
import { DEFAULT_PENGATURAN } from '../mockData';
import { KopSuratLine } from '../../types';

describe('kopSuratUtils line-by-line settings', () => {
  beforeEach(() => {
    const store: Record<string, string> = {};
    (globalThis as any).localStorage = {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => {
        store[k] = String(v);
      },
      removeItem: (k: string) => {
        delete store[k];
      },
      clear: () => {
        Object.keys(store).forEach((k) => delete store[k]);
      }
    };
  });

  it('builds balanced standard HKBP lines without orphan trailing year in SK text', () => {
    const lines = buildStandardHkbpKopBaris({
      nama_huria: 'HURIA KRISTEN BATAK PROTESTAN (HKBP)',
      sk_pengakuan:
        'Pengakuan Pemerintah 11 Juni 1931 No. 48, Staatsblad Thn. 1932 No. 360, jo. No. Dp/P/DAK/d/13568, jo. No. 33 Tahun 1988',
      distrik: 'DISTRIK VI DAIRI – RESSORT HUTARAJA',
      alamat: 'Jl. Persada No. 205 Desa Hutarakyat, Kec. Sidikalang'
    });

    expect(lines.length).toBeGreaterThanOrEqual(5);
    expect(lines[0].teks).toBe('HURIA KRISTEN BATAK PROTESTAN (HKBP)');
    expect(lines[0].font).toBe('display');
    expect(lines[1].teks).toContain('Pengakuan Pemerintah');
    expect(lines[2].teks).toContain('Tahun 1988');
    // Second SK line should contain a substantial clause rather than a single orphan "Tahun 1988"
    expect(lines[2].teks.length).toBeGreaterThan(20);
    expect(lines[lines.length - 1].teks).toContain('Jl. Persada No. 205');
  });

  it('serializes and parses line-by-line KopSuratLine array via font_kop safely', () => {
    const customLines: KopSuratLine[] = [
      {
        id: 'b1',
        teks: 'HURIA KRISTEN BATAK PROTESTAN (HKBP)',
        font: 'display',
        ukuran: 'xl',
        tebal: true,
        miring: false,
        kapital: true,
        jarak_bawah: '1',
        warna: 'hitam'
      },
      {
        id: 'b2',
        teks: 'SK Pengakuan Pemerintah RI',
        font: 'serif',
        ukuran: 'xs',
        tebal: false,
        miring: true,
        kapital: false,
        jarak_bawah: '2',
        warna: 'abu'
      }
    ];

    const encoded = serializeKopBarisToFontKop(customLines);
    expect(encoded).toBeDefined();
    expect(parseKopBarisFromFontKop(encoded)).toEqual(customLines);
    expect(parseKopBarisFromFontKop('plain-font-name')).toBeUndefined();
    expect(parseKopBarisFromFontKop(null)).toBeUndefined();
  });

  it('falls back cleanly to default lines from DEFAULT_PENGATURAN', () => {
    const lines = buildDefaultKopBaris(DEFAULT_PENGATURAN);
    expect(lines.length).toBeGreaterThanOrEqual(4);
    expect(lines[0].teks).toBe(DEFAULT_PENGATURAN.nama_huria);
  });
});
