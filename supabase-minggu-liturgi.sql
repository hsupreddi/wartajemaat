-- ====================================================================
-- SKEMA SUPABASE: TABEL MINGGU LITURGI HKBP (63 MINGGU GEREJAWI)
-- Huria Kristen Batak Protestan (HKBP) Ressort Hutaraja - Distrik VI Dairi
-- ====================================================================

-- 1. Buat Tabel minggu_liturgi
CREATE TABLE IF NOT EXISTS public.minggu_liturgi (
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

-- 2. Aktifkan Row Level Security (RLS)
ALTER TABLE public.minggu_liturgi ENABLE ROW LEVEL SECURITY;

-- 3. Kebijakan Keamanan (RLS Policies)
-- Pengunjung publik dan jemaat dapat membaca daftar minggu liturgi
DROP POLICY IF EXISTS "Minggu liturgi dapat dibaca semua pengguna" ON public.minggu_liturgi;
CREATE POLICY "Minggu liturgi dapat dibaca semua pengguna"
  ON public.minggu_liturgi FOR SELECT
  USING (true);

-- Pengurus (Admin dan Sekretaris) memiliki hak penuh mengelola data
DROP POLICY IF EXISTS "Pengurus dapat mengelola minggu liturgi" ON public.minggu_liturgi;
CREATE POLICY "Pengurus dapat mengelola minggu liturgi"
  ON public.minggu_liturgi FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE public.profiles.id = auth.uid()
      AND public.profiles.role IN ('admin', 'sekretaris')
    )
  );

-- 4. Indeks Kinerja
CREATE INDEX IF NOT EXISTS idx_minggu_liturgi_no ON public.minggu_liturgi (no_urut ASC);
CREATE INDEX IF NOT EXISTS idx_minggu_liturgi_nama ON public.minggu_liturgi (nama_minggu);
