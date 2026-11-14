import { describe, it, expect, beforeEach } from 'vitest';
import {
  listMasterPetugas,
  upsertMasterPetugas,
  deleteMasterPetugas,
  seedDefaultMasterPetugas
} from '../petugasApi';
import { computeUlangTahunFromAnggotaList } from '../jemaatApi';
import { getSeninMingguRange, getUlangTahunMingguIni } from '../dateUtils';

describe('petugasApi & birthday database helper', () => {
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
    (globalThis as any).window = globalThis;
  });

  it('seeds, lists, upserts, filters active, and deletes master petugas in demo mode', async () => {
    const seeded = await seedDefaultMasterPetugas();
    expect(seeded).toBeGreaterThanOrEqual(15);

    const created = await upsertMasterPetugas({
      nama: 'St. Budi Manalu',
      jabatan: 'Sintua',
      peran_default: 'Agenda',
      lingkungan: 'Lingkungan Galatia',
      aktif: true
    });
    expect(created.nama).toBe('St. Budi Manalu');

    const allRes = await listMasterPetugas({ activeOnly: false });
    expect(allRes.data.some((p) => p.id === created.id)).toBe(true);

    // Deactivate & verify activeOnly filter
    await upsertMasterPetugas({ ...created, aktif: false });
    const activeRes = await listMasterPetugas({ activeOnly: true });
    expect(activeRes.data.some((p) => p.id === created.id)).toBe(false);

    // Delete & confirm removal
    await deleteMasterPetugas(created.id);
    const afterDelete = await listMasterPetugas({ activeOnly: false });
    expect(afterDelete.data.some((p) => p.id === created.id)).toBe(false);
  });

  it('computes birthday list accurately across year boundaries and ignores inactive/null tgl_lahir', () => {
    const members = [
      { nama: 'St. Awal Tahun', jenis_kelamin: 'L' as const, tgl_lahir: '1970-01-02', wijk: 'Lingkungan Letare', aktif: true },
      { nama: 'Ny. Akhir Tahun', jenis_kelamin: 'P' as const, tgl_lahir: '1980-12-30', wijk: 'Lingkungan Efesus', aktif: true },
      { nama: 'Non Aktif', jenis_kelamin: 'L' as const, tgl_lahir: '1990-12-31', wijk: 'Lingkungan Judika', aktif: false },
      { nama: 'Tanpa Tgl Lahir', jenis_kelamin: 'P' as const, tgl_lahir: null, wijk: 'Lingkungan Exaudi', aktif: true }
    ];

    const list = computeUlangTahunFromAnggotaList(members, '2026-12-28', '2027-01-03');
    expect(list.map((u) => u.nama)).toEqual(['Ny. Akhir Tahun', 'St. Awal Tahun']);
    expect(list[0].hari_bulan).toBe('30/12');
    expect(list[1].hari_bulan).toBe('02/01');
  });

  it('strictly returns Monday to Sunday (e.g. 9 s/d 15 Nov 2026) without timezone day-shift', () => {
    const range = getSeninMingguRange('2026-11-15');
    expect(range.seninStr).toBe('2026-11-09');
    expect(range.mingguStr).toBe('2026-11-15');
    expect(range.labelPeriode).toBe('9 s/d 15 November 2026');

    const members = [
      { nama: 'Minggu Lalu', jenis_kelamin: 'P' as const, tgl_lahir: '2001-11-08', wijk: 'LETARE', aktif: true },
      { nama: 'Senin Awal', jenis_kelamin: 'L' as const, tgl_lahir: '2016-11-09', wijk: 'EXAUDI', aktif: true },
      { nama: 'Minggu Aktif', jenis_kelamin: 'P' as const, tgl_lahir: '1999-11-15', wijk: 'JUDIKA', aktif: true },
      { nama: 'Senin Depan', jenis_kelamin: 'L' as const, tgl_lahir: '1995-11-16', wijk: 'EFESUS', aktif: true }
    ];

    const list = computeUlangTahunFromAnggotaList(members, range.seninStr, range.mingguStr);
    expect(list.map((u) => `${u.nama}:${u.hari_bulan}`)).toEqual([
      'Senin Awal:09/11',
      'Minggu Aktif:15/11'
    ]);

    const legacyList = getUlangTahunMingguIni(
      members.map((m, idx) => ({
        id: String(idx + 1),
        no_registrasi: `010${idx + 1}`,
        nama: m.nama,
        jenis_kelamin: m.jenis_kelamin,
        tanggal_lahir: m.tgl_lahir,
        wijk: m.wijk,
        hubungan_keluarga: 'Anggota',
        aktif: m.aktif
      })),
      '2026-11-15'
    );
    expect(legacyList.map((u) => `${u.nama}:${u.hari_bulan}`)).toEqual([
      'Senin Awal:09/11',
      'Minggu Aktif:15/11'
    ]);
  });
});
