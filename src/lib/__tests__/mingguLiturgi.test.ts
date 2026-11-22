import { describe, it, expect, beforeEach } from 'vitest';
import { OFFICIAL_HKBP_MINGGU_LITURGI } from '../masterMingguData';
import {
  listMingguLiturgi,
  findCachedMingguByName,
  upsertMingguLiturgi,
  deleteMingguLiturgi,
  resetMingguLiturgiToDefault,
  SUPABASE_MINGGU_LITURGI_SQL
} from '../mingguLiturgiApi';

describe('63 Minggu Liturgi HKBP (masterMingguData.ts)', () => {
  it('contains exactly 63 official HKBP Sundays/Feasts as defined in the CSV', () => {
    expect(OFFICIAL_HKBP_MINGGU_LITURGI).toHaveLength(63);
  });

  it('has ordered sequence from 1 to 63', () => {
    OFFICIAL_HKBP_MINGGU_LITURGI.forEach((item, idx) => {
      expect(item.no_urut).toBe(idx + 1);
      expect(item.nama_minggu).toBeTruthy();
      expect(item.arti_indonesia).toBeTruthy();
      expect(item.arti_batak).toBeTruthy();
      expect(['Ungu', 'Putih', 'Hijau', 'Merah', 'Hitam']).toContain(item.warna_liturgi);
    });
  });

  it('matches authentic HKBP liturgical colors for major holy days', () => {
    const findSunday = (name: string) =>
      OFFICIAL_HKBP_MINGGU_LITURGI.find((m) => m.nama_minggu.toLowerCase().includes(name.toLowerCase()));

    // Advent is Ungu
    const advent1 = findSunday('Advent I');
    expect(advent1?.warna_liturgi).toBe('Ungu');

    // Natal is Putih
    const natal1 = findSunday('Natal I');
    expect(natal1?.warna_liturgi).toBe('Putih');

    // Jumat Agung is Hitam
    const jumatAgung = findSunday('Jumat Agung');
    expect(jumatAgung?.warna_liturgi).toBe('Hitam');

    // Paskah is Putih
    const paskah = findSunday('Paskah I');
    expect(paskah?.warna_liturgi).toBe('Putih');

    // Pentakosta is Merah
    const pentakosta = findSunday('Pentakosta I');
    expect(pentakosta?.warna_liturgi).toBe('Merah');

    // Minggu Setelah Trinitatis are Hijau
    const trin1 = findSunday('I Setelah Trinitatis');
    expect(trin1?.warna_liturgi).toBe('Hijau');

    // Ujung Taon Parhuriaon is Hitam in the HKBP CSV
    const ujungTaon = findSunday('Ujung Taon Parhuriaon');
    expect(ujungTaon?.warna_liturgi).toBe('Hitam');
  });

  it('includes proper SQL script with table definition and RLS policies', () => {
    expect(SUPABASE_MINGGU_LITURGI_SQL).toContain('CREATE TABLE IF NOT EXISTS minggu_liturgi');
    expect(SUPABASE_MINGGU_LITURGI_SQL).toContain('ENABLE ROW LEVEL SECURITY');
    expect(SUPABASE_MINGGU_LITURGI_SQL).toContain('warna_liturgi');
  });
});

describe('Minggu Liturgi API and Local Storage CRUD (mingguLiturgiApi.ts)', () => {
  beforeEach(async () => {
    await resetMingguLiturgiToDefault();
  });

  it('lists default 63 Sundays when initialized', async () => {
    const list = await listMingguLiturgi();
    expect(list.length).toBe(63);
    expect(list[0].nama_minggu).toBe('Advent I');
  });

  it('allows upserting an updated Sunday into storage', async () => {
    const list = await listMingguLiturgi();
    const target = { ...list[0], arti_indonesia: 'Kedatangan Tuhan Yesus yang Pertama' };
    await upsertMingguLiturgi(target);

    const reloaded = await listMingguLiturgi();
    const updated = reloaded.find((m) => m.id === target.id);
    expect(updated?.arti_indonesia).toBe('Kedatangan Tuhan Yesus yang Pertama');
  });

  it('allows deleting a custom Sunday from local storage', async () => {
    const list = await listMingguLiturgi();
    const countBefore = list.length;
    await deleteMingguLiturgi(list[0].id);

    const reloaded = await listMingguLiturgi();
    expect(reloaded.length).toBe(countBefore - 1);
  });

  it('resets back to official 63 Sundays when requested', async () => {
    const list = await listMingguLiturgi();
    await deleteMingguLiturgi(list[0].id);
    expect((await listMingguLiturgi()).length).toBe(62);

    await resetMingguLiturgiToDefault();
    const resetList = await listMingguLiturgi();
    expect(resetList.length).toBe(63);
  });

  it('adds a custom Goar ni Minggu manually without overwriting existing entries even on duplicate no_urut', async () => {
    const created = await upsertMingguLiturgi({
      id: '',
      no_urut: 1, // deliberately collides with Advent I to ensure ID-only matching
      nama_minggu: 'Minggu Olahraga & Pemuda',
      arti_indonesia: 'Minggu Pelayanan Naposo Bulung',
      arti_batak: 'Minggu Parhobason Naposo',
      warna_liturgi: 'Merah',
      topik_default: 'Naposo na Marsihohot'
    });

    expect(created.id).toBeTruthy();
    const list = await listMingguLiturgi();
    expect(list.length).toBe(64);
    expect(list.some((m) => m.nama_minggu === 'Advent I')).toBe(true);
    expect(list.some((m) => m.id === created.id && m.nama_minggu === 'Minggu Olahraga & Pemuda')).toBe(true);

    const foundDirect = findCachedMingguByName('Minggu Olahraga & Pemuda');
    expect(foundDirect?.warna_liturgi).toBe('Merah');
    expect(foundDirect?.arti_batak).toBe('Minggu Parhobason Naposo');
  });

  it('auto-assigns max no_urut + 1 when adding a custom Sunday with no_urut = 0 after earlier deletion', async () => {
    const initial = await listMingguLiturgi();
    await deleteMingguLiturgi(initial[0].id); // 62 items remain, max no_urut is still 63

    const created = await upsertMingguLiturgi({
      id: '',
      no_urut: 0,
      nama_minggu: 'Pesta Ulang Tahun Huria',
      warna_liturgi: 'Putih'
    });

    expect(created.no_urut).toBe(64);
    const list = await listMingguLiturgi();
    expect(list.length).toBe(63);
    const foundWithPrefix = findCachedMingguByName('MINGGU PESTA ULANG TAHUN HURIA');
    expect(foundWithPrefix?.id).toBe(created.id);
    expect(foundWithPrefix?.warna_liturgi).toBe('Putih');
  });
});
