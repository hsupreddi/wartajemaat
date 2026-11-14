import { isSupabaseConfigured, supabase } from './supabase';
import { MASTER_PETUGAS } from './mockData';
import { PetugasMaster } from '../types';

const STORAGE_KEY_PETUGAS = 'hkbp_master_petugas_v1';

export const SUPABASE_MASTER_PETUGAS_SQL = `-- Tabel Master Sintua, Pelayan & Pengurus (Parhobas)
CREATE TABLE IF NOT EXISTS public.master_petugas (
  id TEXT PRIMARY KEY,
  nama TEXT NOT NULL,
  jabatan TEXT NOT NULL DEFAULT 'Sintua',
  peran_default TEXT DEFAULT '',
  lingkungan TEXT DEFAULT '',
  aktif BOOLEAN NOT NULL DEFAULT true,
  urutan INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_master_petugas_aktif ON public.master_petugas (aktif, urutan, nama);
ALTER TABLE public.master_petugas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Master petugas dapat dibaca publik" ON public.master_petugas;
CREATE POLICY "Master petugas dapat dibaca publik"
  ON public.master_petugas FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admin dan sekretaris dapat mengelola master petugas" ON public.master_petugas;
CREATE POLICY "Admin dan sekretaris dapat mengelola master petugas"
  ON public.master_petugas FOR ALL
  TO authenticated
  USING (public.has_pengurus_role(ARRAY['admin', 'sekretaris']))
  WITH CHECK (public.has_pengurus_role(ARRAY['admin', 'sekretaris']));`;

export const JABATAN_PETUGAS_OPTIONS = [
  'Sintua',
  'Calon Sintua',
  'Pendeta Ressort',
  'Pendeta Fungsional',
  'Bibelvrouw',
  'Guru Huria',
  'Diakones',
  'Guru Sekolah Minggu',
  'Organis Huria',
  'Song Leader / Pemusik',
  'Pengurus / Tim'
];

export const PERAN_PARHOBAS_OPTIONS = [
  'Jamita',
  'Agenda',
  'Tingting',
  'Pelean',
  'Organis',
  'Harentaon'
];

function getLocalPetugas(): PetugasMaster[] {
  if (typeof window === 'undefined') return [...MASTER_PETUGAS];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PETUGAS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_PETUGAS, JSON.stringify(MASTER_PETUGAS));
      return [...MASTER_PETUGAS];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [...MASTER_PETUGAS];
  } catch {
    return [...MASTER_PETUGAS];
  }
}

function saveLocalPetugas(list: PetugasMaster[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_PETUGAS, JSON.stringify(list));
  } catch (err) {
    console.error('Gagal menyimpan master_petugas ke localStorage:', err);
  }
}

function normalizePetugasRow(r: any, idx = 0): PetugasMaster {
  return {
    id: String(r.id),
    nama: String(r.nama || '').trim(),
    jabatan: String(r.jabatan || 'Sintua').trim(),
    peran_default: r.peran_default ? String(r.peran_default).trim() : '',
    lingkungan: r.lingkungan ? String(r.lingkungan).trim() : '',
    aktif: r.aktif !== false,
    urutan: Number(r.urutan || idx + 1)
  };
}

function isTableMissingError(err: any): boolean {
  const msg = String(err?.message || err || '').toLowerCase();
  return (
    msg.includes('does not exist') ||
    msg.includes('could not find the table') ||
    err?.code === '42P01' ||
    err?.code === 'PGRST205'
  );
}

/**
 * Mengambil daftar Sintua, Pelayan & Pengurus dari database Supabase (atau localStorage di Mode Demo).
 */
export async function listMasterPetugas(options?: {
  activeOnly?: boolean;
}): Promise<{ data: PetugasMaster[]; isDemo: boolean; tableMissing?: boolean }> {
  const filterRows = (list: PetugasMaster[]) =>
    options?.activeOnly ? list.filter((p) => p.aktif !== false) : list;

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('master_petugas')
        .select('*')
        .order('urutan', { ascending: true })
        .order('nama', { ascending: true });

      if (error) {
        if (isTableMissingError(error)) {
          return {
            data: filterRows(getLocalPetugas()),
            isDemo: true,
            tableMissing: true
          };
        }
        throw new Error(error.message);
      }

      const normalized = (data || []).map((r: any, idx: number) => normalizePetugasRow(r, idx));
      if (normalized.length > 0) {
        saveLocalPetugas(normalized);
        return { data: filterRows(normalized), isDemo: false, tableMissing: false };
      }

      // Tabel tersedia tetapi belum ada isi: kembalikan array kosong agar admin bisa sinkronkan seed atau tambah manual
      return { data: [], isDemo: false, tableMissing: false };
    } catch (err: any) {
      if (isTableMissingError(err)) {
        return {
          data: filterRows(getLocalPetugas()),
          isDemo: true,
          tableMissing: true
        };
      }
      console.warn('[Master Petugas] Gagal memuat dari Supabase, gunakan cache lokal:', err?.message || err);
    }
  }

  return {
    data: filterRows(getLocalPetugas()),
    isDemo: true,
    tableMissing: false
  };
}

/**
 * Tambah atau perbarui data Sintua / Pengurus.
 */
export async function upsertMasterPetugas(
  petugas: Partial<PetugasMaster> & { nama: string }
): Promise<PetugasMaster> {
  const cleanNama = String(petugas.nama || '').trim();
  if (!cleanNama) {
    throw new Error('Nama Sintua / Pengurus wajib diisi.');
  }

  const item: PetugasMaster = {
    id: petugas.id && String(petugas.id).trim() ? String(petugas.id).trim() : `pet-${Date.now()}`,
    nama: cleanNama,
    jabatan: String(petugas.jabatan || 'Sintua').trim() || 'Sintua',
    peran_default: String(petugas.peran_default || '').trim(),
    lingkungan: String(petugas.lingkungan || '').trim(),
    aktif: petugas.aktif !== undefined ? Boolean(petugas.aktif) : true,
    urutan: Number(petugas.urutan || 99)
  };

  if (isSupabaseConfigured && supabase) {
    const payload = {
      ...item,
      updated_at: new Date().toISOString()
    };
    const { data, error } = await supabase
      .from('master_petugas')
      .upsert(payload, { onConflict: 'id' })
      .select()
      .single();

    if (error) {
      if (isTableMissingError(error)) {
        throw new Error(
          'Tabel master_petugas belum tersedia di Supabase. Silakan salin dan jalankan skrip SQL master_petugas di SQL Editor Supabase terlebih dahulu.'
        );
      }
      throw new Error(`Gagal menyimpan data petugas ke Supabase: ${error.message}`);
    }

    const saved = data ? normalizePetugasRow(data) : item;
    // Update local cache
    const current = getLocalPetugas();
    const idx = current.findIndex((p) => p.id === saved.id);
    if (idx >= 0) current[idx] = saved;
    else current.push(saved);
    saveLocalPetugas(current);
    return saved;
  }

  // Demo mode / localStorage
  const current = getLocalPetugas();
  const idx = current.findIndex((p) => p.id === item.id);
  if (idx >= 0) {
    current[idx] = item;
  } else {
    current.push(item);
  }
  saveLocalPetugas(current);
  return item;
}

/**
 * Hapus data Sintua / Pengurus.
 */
export async function deleteMasterPetugas(id: string): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.from('master_petugas').delete().eq('id', id);
    if (error) {
      throw new Error(`Gagal menghapus data petugas: ${error.message}`);
    }
  }

  const next = getLocalPetugas().filter((p) => p.id !== id);
  saveLocalPetugas(next);
}

/**
 * Batch upsert Sintua / Pengurus (berguna untuk tarik massal dari data anggota atau seed default).
 */
export async function batchUpsertMasterPetugas(items: PetugasMaster[]): Promise<number> {
  if (items.length === 0) return 0;

  const normalized = items.map((it, idx) => normalizePetugasRow(it, idx));

  if (isSupabaseConfigured && supabase) {
    const payload = normalized.map((it) => ({
      ...it,
      updated_at: new Date().toISOString()
    }));
    const { error } = await supabase
      .from('master_petugas')
      .upsert(payload, { onConflict: 'id' });
    if (error) {
      if (isTableMissingError(error)) {
        throw new Error(
          'Tabel master_petugas belum tersedia di Supabase. Jalankan skrip SQL terlebih dahulu.'
        );
      }
      throw new Error(`Gagal menyinkronkan data petugas ke Supabase: ${error.message}`);
    }
  }

  const current = getLocalPetugas();
  const map = new Map<string, PetugasMaster>(current.map((p) => [p.id, p]));
  normalized.forEach((p) => map.set(p.id, p));
  saveLocalPetugas(Array.from(map.values()));
  return normalized.length;
}

/**
 * Sinkronkan daftar default Sintua & Pelayan ke database Supabase / lokal.
 */
export async function seedDefaultMasterPetugas(): Promise<number> {
  return batchUpsertMasterPetugas(MASTER_PETUGAS);
}
