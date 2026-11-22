import { MingguLiturgi } from '../types';
import { supabase, isSupabaseConfigured } from './supabase';
import { OFFICIAL_HKBP_MINGGU_LITURGI } from './masterMingguData';

const LOCAL_STORAGE_KEY = 'hkbp_minggu_liturgi';

/**
 * SQL Schema definition for Supabase Migration
 */
export const SUPABASE_MINGGU_LITURGI_SQL = `-- SKRIP PEMBUATAN TABEL MINGGU LITURGI HKBP (63 MINGGU GEREJAWI)
CREATE TABLE IF NOT EXISTS minggu_liturgi (
  id TEXT PRIMARY KEY,
  no_urut INTEGER NOT NULL,
  nama_minggu TEXT NOT NULL,
  arti_indonesia TEXT,
  arti_batak TEXT,
  warna_liturgi TEXT NOT NULL DEFAULT 'Hijau',
  topik_default TEXT,
  ayat_default TEXT,
  ayat_ref_default TEXT,
  keterangan TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- AKTIFKAN ROW LEVEL SECURITY (RLS)
ALTER TABLE minggu_liturgi ENABLE ROW LEVEL SECURITY;

-- SEMUA PENGGUNA DAPAT MEMBACA
CREATE POLICY "Minggu liturgi dapat dibaca semua pengguna"
  ON minggu_liturgi FOR SELECT
  USING (true);

-- HANYA ADMIN & SEKRETARIS YANG DAPAT MENGUBAH / MENGHAPUS
CREATE POLICY "Pengurus dapat mengelola minggu liturgi"
  ON minggu_liturgi FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'sekretaris')
    )
  );

-- INDEKS PENCARIAN & URUTAN
CREATE INDEX IF NOT EXISTS idx_minggu_liturgi_no ON minggu_liturgi (no_urut ASC);
CREATE INDEX IF NOT EXISTS idx_minggu_liturgi_nama ON minggu_liturgi (nama_minggu);
`;

// In-memory fallback if localStorage is not present (SSR/test runner)
let memoryStore: Record<string, string> = {};

function getStorageItem(key: string): string | null {
  if (typeof localStorage !== 'undefined') {
    return localStorage.getItem(key);
  }
  return memoryStore[key] ?? null;
}

function setStorageItem(key: string, value: string): void {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(key, value);
  } else {
    memoryStore[key] = value;
  }
}

/**
 * Helper to get local data from localStorage or seed
 */
function getLocalList(): MingguLiturgi[] {
  try {
    const raw = getStorageItem(LOCAL_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.sort((a, b) => (a.no_urut || 0) - (b.no_urut || 0));
      }
    }
  } catch (err) {
    console.warn('Gagal membaca minggu_liturgi dari localStorage:', err);
  }
  // Default seed
  setLocalList(OFFICIAL_HKBP_MINGGU_LITURGI);
  return OFFICIAL_HKBP_MINGGU_LITURGI;
}

/**
 * Helper to save local data
 */
function setLocalList(list: MingguLiturgi[]): void {
  try {
    const sorted = [...list].sort((a, b) => (a.no_urut || 0) - (b.no_urut || 0));
    setStorageItem(LOCAL_STORAGE_KEY, JSON.stringify(sorted));
  } catch (err) {
    console.warn('Gagal menyimpan minggu_liturgi ke localStorage:', err);
  }
}

/**
 * Get full list of 63 Minggu Liturgi HKBP
 */
export async function listMingguLiturgi(): Promise<MingguLiturgi[]> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('minggu_liturgi')
        .select('*')
        .order('no_urut', { ascending: true });

      if (!error && data && data.length > 0) {
        setLocalList(data);
        return data;
      }
      if (error && error.code !== 'PGRST116') {
        console.warn('Supabase query minggu_liturgi error, fallback ke lokal:', error.message);
      }
    } catch (err) {
      console.warn('Supabase fetch failed, using local seed:', err);
    }
  }

  return getLocalList();
}

/**
 * Synchronous cached list helper for immediate display lookup (falls back to official 63 seed)
 */
export function getCachedMingguLiturgiList(): MingguLiturgi[] {
  return getLocalList();
}

/**
 * Synchronous cached lookup by name (supports custom added Goar ni Minggu)
 */
export function findCachedMingguByName(nama: string): MingguLiturgi | undefined {
  const clean = (nama || '').trim().toUpperCase();
  if (!clean) return undefined;
  return getLocalList().find(
    (m) =>
      m.nama_minggu.toUpperCase() === clean ||
      `MINGGU ${m.nama_minggu.toUpperCase()}` === clean ||
      clean === `MINGGU ${m.nama_minggu.toUpperCase()}`
  );
}

/**
 * Find single liturgical Sunday by name (case-insensitive)
 */
export async function findMingguByName(nama: string): Promise<MingguLiturgi | undefined> {
  const list = await listMingguLiturgi();
  const clean = nama.trim().toLowerCase();
  return list.find(
    (m) =>
      m.nama_minggu.toLowerCase() === clean ||
      m.nama_minggu.toLowerCase().replace(/^(minggu\s+)/, '') === clean
  );
}

/**
 * Upsert (Create or Update) single Minggu Liturgi
 */
export async function upsertMingguLiturgi(item: MingguLiturgi): Promise<MingguLiturgi> {
  const list = getLocalList();
  const trimmedId = item.id?.trim();
  const existingIdx = trimmedId ? list.findIndex((m) => m.id === trimmedId) : -1;
  const maxNoUrut = list.reduce((max, m) => Math.max(max, m.no_urut || 0), 0);

  const resolvedItem: MingguLiturgi = {
    ...item,
    id: trimmedId || `minggu-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    no_urut: Number(item.no_urut) > 0 ? Number(item.no_urut) : maxNoUrut + 1,
    nama_minggu: item.nama_minggu.trim(),
    warna_liturgi: item.warna_liturgi || 'Hijau'
  };

  let updatedList: MingguLiturgi[];
  if (existingIdx >= 0) {
    updatedList = [...list];
    updatedList[existingIdx] = { ...updatedList[existingIdx], ...resolvedItem };
  } else {
    updatedList = [...list, resolvedItem];
  }

  setLocalList(updatedList);

  if (isSupabaseConfigured && supabase) {
    try {
      const payload = {
        id: resolvedItem.id,
        no_urut: resolvedItem.no_urut,
        nama_minggu: resolvedItem.nama_minggu,
        arti_indonesia: resolvedItem.arti_indonesia || null,
        arti_batak: resolvedItem.arti_batak || null,
        warna_liturgi: resolvedItem.warna_liturgi || 'Hijau',
        topik_default: resolvedItem.topik_default || null,
        ayat_default: resolvedItem.ayat_default || null,
        ayat_ref_default: resolvedItem.ayat_ref_default || null,
        keterangan: resolvedItem.keterangan || null,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase.from('minggu_liturgi').upsert(payload, { onConflict: 'id' });
      if (error) {
        console.warn('Gagal upsert ke Supabase:', error.message);
      }
    } catch (err) {
      console.warn('Supabase upsert error:', err);
    }
  }

  return resolvedItem;
}

/**
 * Delete single liturgical Sunday by ID
 */
export async function deleteMingguLiturgi(id: string): Promise<boolean> {
  const list = getLocalList();
  const updated = list.filter((m) => m.id !== id);
  setLocalList(updated);

  if (isSupabaseConfigured && supabase) {
    try {
      const { error } = await supabase.from('minggu_liturgi').delete().eq('id', id);
      if (error) {
        console.warn('Gagal delete di Supabase:', error.message);
      }
    } catch (err) {
      console.warn('Supabase delete error:', err);
    }
  }

  return true;
}

/**
 * Reset whole list back to the official 63 HKBP Sundays from CSV
 */
export async function resetMingguLiturgiToDefault(): Promise<MingguLiturgi[]> {
  setLocalList(OFFICIAL_HKBP_MINGGU_LITURGI);

  if (isSupabaseConfigured && supabase) {
    try {
      // Upsert in batches of 50
      const items = OFFICIAL_HKBP_MINGGU_LITURGI.map((m) => ({
        id: m.id,
        no_urut: m.no_urut,
        nama_minggu: m.nama_minggu,
        arti_indonesia: m.arti_indonesia,
        arti_batak: m.arti_batak,
        warna_liturgi: m.warna_liturgi,
        topik_default: m.topik_default,
        ayat_default: m.ayat_default,
        ayat_ref_default: m.ayat_ref_default,
        updated_at: new Date().toISOString()
      }));

      await supabase.from('minggu_liturgi').upsert(items, { onConflict: 'id' });
    } catch (err) {
      console.warn('Supabase reset batch upsert error:', err);
    }
  }

  return OFFICIAL_HKBP_MINGGU_LITURGI;
}

/**
 * Sync entire local dataset to Supabase table
 */
export async function syncAllMingguToSupabase(): Promise<{ success: boolean; count: number; error?: string }> {
  if (!isSupabaseConfigured || !supabase) {
    return {
      success: false,
      count: 0,
      error: 'Supabase belum dikonfigurasi pada .env (VITE_SUPABASE_URL & VITE_SUPABASE_ANON_KEY)'
    };
  }

  try {
    const list = getLocalList();
    const rows = list.map((m) => ({
      id: m.id,
      no_urut: m.no_urut,
      nama_minggu: m.nama_minggu,
      arti_indonesia: m.arti_indonesia || null,
      arti_batak: m.arti_batak || null,
      warna_liturgi: m.warna_liturgi || 'Hijau',
      topik_default: m.topik_default || null,
      ayat_default: m.ayat_default || null,
      ayat_ref_default: m.ayat_ref_default || null,
      keterangan: m.keterangan || null,
      updated_at: new Date().toISOString()
    }));

    const { error } = await supabase.from('minggu_liturgi').upsert(rows, { onConflict: 'id' });
    if (error) {
      return { success: false, count: 0, error: error.message };
    }

    return { success: true, count: rows.length };
  } catch (err: any) {
    return { success: false, count: 0, error: err.message || 'Gagal sinkronisasi ke Supabase' };
  }
}
