import { describe, it, expect, beforeEach } from 'vitest';
import {
  buildKeluargaTemplateCsv,
  buildAnggotaTemplateCsv,
  normalizeCsvHeader,
  cleanRegistrasiValue,
  normalizeDateValue
} from '../jemaatTemplates';
import { upsertAnggota, upsertKeluarga, listAnggota, listKeluarga } from '../jemaatApi';

describe('jemaatTemplates & CSV normalization', () => {
  it('builds UTF-8 BOM CSV templates preserving leading zeros', () => {
    const kelCsv = buildKeluargaTemplateCsv(',');
    expect(kelCsv.startsWith('\uFEFF')).toBe(true);
    expect(kelCsv).toContain('registrasi,wijk,nama_kk,kk_wafat,jalan,hp,jumlah_anggota');
    expect(kelCsv).toContain('0101,Lingkungan Letare,St. Ramses Sitohang');

    const angCsvSemi = buildAnggotaTemplateCsv(';');
    expect(angCsvSemi.startsWith('\uFEFF')).toBe(true);
    expect(angCsvSemi).toContain('registrasi;nama;jenis_kelamin;tgl_lahir;tgl_baptis;tgl_sidi;hub_keluarga;wijk;aktif');
    expect(angCsvSemi).toContain('0102;Bona Tua Silalahi;L;;1983-01-01');
  });

  it('normalizes Indonesian Excel headers & BOM cleanly', () => {
    expect(normalizeCsvHeader('\uFEFFNo. Registrasi')).toBe('registrasi');
    expect(normalizeCsvHeader('Nama Kepala Keluarga')).toBe('nama_kk');
    expect(normalizeCsvHeader('Tanggal Lahir')).toBe('tgl_lahir');
    expect(normalizeCsvHeader('L/P')).toBe('jenis_kelamin');
    expect(normalizeCsvHeader('Hubungan Keluarga')).toBe('hub_keluarga');
  });

  it('cleans registrasi values while preserving leading zeros', () => {
    expect(cleanRegistrasiValue('0101')).toBe('0101');
    expect(cleanRegistrasiValue('="0101"')).toBe('0101');
    expect(cleanRegistrasiValue("'0205")).toBe('0205');
  });

  it('normalizes YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY, and empty dates', () => {
    expect(normalizeDateValue('1990-08-17')).toBe('1990-08-17');
    expect(normalizeDateValue('17/08/1990')).toBe('1990-08-17');
    expect(normalizeDateValue('5-3-2001')).toBe('2001-03-05');
    expect(normalizeDateValue('')).toBeNull();
    expect(normalizeDateValue('-')).toBeNull();
  });
});

describe('jemaatApi Demo CRUD & FK safety', () => {
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

  it('auto-creates parent keluarga when saving an anggota with unregistered registrasi', async () => {
    await upsertAnggota(
      {
        registrasi: '0999',
        nama: 'Togar Simamora',
        jenis_kelamin: 'L',
        hub_keluarga: 'Kepala Keluarga',
        wijk: 'Lingkungan Judika',
        tgl_lahir: null
      },
      { autoCreateKeluargaNamaKK: 'Kel. Togar Simamora' }
    );

    const kkRes = await listKeluarga({ q: '0999' });
    expect(kkRes.data.some((k) => k.registrasi === '0999' && k.nama_kk === 'Kel. Togar Simamora')).toBe(true);

    const angRes = await listAnggota({ registrasi: '0999' });
    expect(angRes.data.some((a) => a.nama === 'Togar Simamora')).toBe(true);
  });

  it('cascades registrasi update from keluarga to anggota', async () => {
    await upsertKeluarga({
      registrasi: '0888',
      wijk: 'Lingkungan Efesus',
      nama_kk: 'Kel. Lama',
      kk_wafat: false,
      jalan: 'Jl. Merdeka',
      hp: '0812',
      jumlah_anggota: 1
    });
    await upsertAnggota({
      registrasi: '0888',
      nama: 'Anggota Uji',
      jenis_kelamin: 'P',
      wijk: 'Lingkungan Efesus'
    });

    await upsertKeluarga(
      {
        registrasi: '0889',
        wijk: 'Lingkungan Efesus',
        nama_kk: 'Kel. Baru',
        kk_wafat: false,
        jalan: 'Jl. Merdeka',
        hp: '0812',
        jumlah_anggota: 1
      },
      { originalRegistrasi: '0888' }
    );

    const angRes = await listAnggota({ registrasi: '0889' });
    expect(angRes.data.some((a) => a.nama === 'Anggota Uji')).toBe(true);
  });
});
