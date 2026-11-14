import { describe, it, expect, beforeEach } from 'vitest';
import {
  listMasterPetugas,
  upsertMasterPetugas,
  deleteMasterPetugas,
  seedDefaultMasterPetugas
} from '../petugasApi';
import { computeUlangTahunFromAnggotaList } from '../jemaatApi';

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
});
