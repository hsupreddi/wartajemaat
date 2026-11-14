-- ============================================================================
-- SKEMA SQL MODUL DATA JEMAAT & KELUARGA (SUPABASE)
-- Aplikasi Warta Jemaat Digital - HKBP Ressort Hutaraja (Distrik VI Dairi)
-- ============================================================================
-- Jalankan seluruh skrip ini di Supabase Dashboard -> SQL Editor -> New Query.
-- Skrip ini 100% idempoten (aman dijalankan ulang tanpa menghapus data yang ada).
-- Mencakup:
--   1. Sinkronisasi tabel profiles & backfill akun auth.users yang sudah ada
--   2. Tabel public.keluarga & public.anggota (beserta FK & indeks)
--   3. Kebijakan RLS (Row Level Security) untuk Admin & Sekretaris
--   4. Trigger otomatis hitung jumlah anggota keluarga & updated_at
--   5. Views (v_calon_sidi, v_statistik_wijk) & RPC ulang_tahun_periode
-- ============================================================================

-- 1. PASTIKAN TABEL PROFILES & HELPER ROLE PENGURUS TERSEDIA
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id TEXT PRIMARY KEY,
  auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  email TEXT UNIQUE NOT NULL,
  nama TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'sekretaris' CHECK (role IN ('admin', 'sekretaris', 'bendahara', 'publik')),
  jabatan TEXT DEFAULT 'Parhalado',
  aktif BOOLEAN NOT NULL DEFAULT true,
  tanggal_dibuat TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION public.has_pengurus_role(allowed_roles TEXT[])
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE (p.auth_user_id = auth.uid() OR p.id = auth.uid()::text)
      AND p.aktif = true
      AND p.role = ANY(allowed_roles)
  );
$$;

-- Backfill & tautkan akun Supabase Auth yang sudah login/terdaftar sebelum skrip dijalankan
UPDATE public.profiles p
SET auth_user_id = u.id,
    updated_at = NOW()
FROM auth.users u
WHERE p.auth_user_id IS NULL
  AND u.email IS NOT NULL
  AND LOWER(p.email) = LOWER(u.email);

INSERT INTO public.profiles (
  id, auth_user_id, email, nama, role, jabatan, aktif, tanggal_dibuat
)
SELECT
  u.id::text,
  u.id,
  LOWER(COALESCE(u.email, u.id::text || '@hkbp.local')),
  COALESCE(NULLIF(u.raw_user_meta_data->>'nama', ''), SPLIT_PART(COALESCE(u.email, 'admin'), '@', 1)),
  CASE
    WHEN NOT EXISTS (SELECT 1 FROM public.profiles WHERE role = 'admin') THEN 'admin'
    ELSE COALESCE(NULLIF(u.raw_user_meta_data->>'role', ''), 'admin')
  END,
  COALESCE(NULLIF(u.raw_user_meta_data->>'jabatan', ''), 'Pengurus Huria'),
  true,
  TO_CHAR(NOW(), 'YYYY-MM-DD')
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles p
  WHERE p.auth_user_id = u.id
     OR p.id = u.id::text
     OR (u.email IS NOT NULL AND LOWER(p.email) = LOWER(u.email))
)
ON CONFLICT (id) DO NOTHING;

-- Trigger otomatis untuk user baru yang mendaftar ke depan
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  existing_profile_id TEXT;
  total_profiles INTEGER;
  assigned_role TEXT;
  display_name TEXT;
BEGIN
  SELECT id INTO existing_profile_id
  FROM public.profiles
  WHERE LOWER(email) = LOWER(NEW.email)
  LIMIT 1;

  IF existing_profile_id IS NOT NULL THEN
    UPDATE public.profiles
    SET auth_user_id = NEW.id,
        updated_at = NOW()
    WHERE id = existing_profile_id;
    RETURN NEW;
  END IF;

  SELECT COUNT(*) INTO total_profiles FROM public.profiles;

  IF total_profiles = 0 THEN
    assigned_role := 'admin';
  ELSE
    assigned_role := COALESCE(NEW.raw_user_meta_data->>'role', 'sekretaris');
    IF assigned_role NOT IN ('admin', 'sekretaris', 'bendahara', 'publik') THEN
      assigned_role := 'sekretaris';
    END IF;
  END IF;

  display_name := COALESCE(
    NULLIF(NEW.raw_user_meta_data->>'nama', ''),
    SPLIT_PART(NEW.email, '@', 1)
  );

  INSERT INTO public.profiles (
    id, auth_user_id, email, nama, role, jabatan, aktif, tanggal_dibuat
  ) VALUES (
    NEW.id::text,
    NEW.id,
    NEW.email,
    display_name,
    assigned_role,
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'jabatan', ''), CASE WHEN assigned_role = 'admin' THEN 'Uluan / Admin Huria' ELSE 'Pengurus Huria' END),
    true,
    TO_CHAR(NOW(), 'YYYY-MM-DD')
  )
  ON CONFLICT (id) DO UPDATE SET
    auth_user_id = EXCLUDED.auth_user_id,
    updated_at = NOW();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_auth_user();

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Pengurus dapat membaca daftar profil" ON public.profiles;
CREATE POLICY "Pengurus dapat membaca daftar profil"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    auth_user_id = auth.uid()
    OR id = auth.uid()::text
    OR public.has_pengurus_role(ARRAY['admin', 'sekretaris', 'bendahara'])
  );

DROP POLICY IF EXISTS "Hanya admin yang dapat mengelola profil" ON public.profiles;
CREATE POLICY "Hanya admin yang dapat mengelola profil"
  ON public.profiles FOR ALL
  TO authenticated
  USING (public.has_pengurus_role(ARRAY['admin']))
  WITH CHECK (public.has_pengurus_role(ARRAY['admin']));


-- 2. TABEL DATA KELUARGA (KEPALA KELUARGA / KK)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.keluarga (
  registrasi TEXT PRIMARY KEY,
  wijk TEXT NOT NULL DEFAULT 'Lingkungan Letare',
  nama_kk TEXT NOT NULL,
  kk_wafat BOOLEAN NOT NULL DEFAULT false,
  jalan TEXT DEFAULT '',
  hp TEXT DEFAULT '',
  jumlah_anggota INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Pastikan semua kolom tersedia jika tabel keluarga sudah dibuat sebelumnya
ALTER TABLE public.keluarga ADD COLUMN IF NOT EXISTS wijk TEXT NOT NULL DEFAULT 'Lingkungan Letare';
ALTER TABLE public.keluarga ADD COLUMN IF NOT EXISTS nama_kk TEXT NOT NULL DEFAULT '';
ALTER TABLE public.keluarga ADD COLUMN IF NOT EXISTS kk_wafat BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.keluarga ADD COLUMN IF NOT EXISTS jalan TEXT DEFAULT '';
ALTER TABLE public.keluarga ADD COLUMN IF NOT EXISTS hp TEXT DEFAULT '';
ALTER TABLE public.keluarga ADD COLUMN IF NOT EXISTS jumlah_anggota INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.keluarga ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE public.keluarga ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_keluarga_wijk ON public.keluarga (wijk);
CREATE INDEX IF NOT EXISTS idx_keluarga_nama_kk ON public.keluarga (nama_kk);

ALTER TABLE public.keluarga ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Hanya pengurus dapat mengakses data keluarga" ON public.keluarga;
DROP POLICY IF EXISTS "Pengurus dapat membaca data keluarga" ON public.keluarga;
DROP POLICY IF EXISTS "Admin dan sekretaris dapat mengelola data keluarga" ON public.keluarga;

CREATE POLICY "Pengurus dapat membaca data keluarga"
  ON public.keluarga FOR SELECT
  TO authenticated
  USING (public.has_pengurus_role(ARRAY['admin', 'sekretaris', 'bendahara']));

CREATE POLICY "Admin dan sekretaris dapat mengelola data keluarga"
  ON public.keluarga FOR ALL
  TO authenticated
  USING (public.has_pengurus_role(ARRAY['admin', 'sekretaris']))
  WITH CHECK (public.has_pengurus_role(ARRAY['admin', 'sekretaris']));


-- 3. TABEL DATA ANGGOTA JEMAAT (RUAS)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.anggota (
  id TEXT PRIMARY KEY,
  registrasi TEXT NOT NULL REFERENCES public.keluarga(registrasi) ON DELETE CASCADE ON UPDATE CASCADE,
  nama TEXT NOT NULL,
  jenis_kelamin TEXT NOT NULL DEFAULT 'L' CHECK (jenis_kelamin IN ('L', 'P')),
  tgl_lahir DATE,
  tgl_baptis DATE,
  tgl_sidi DATE,
  hub_keluarga TEXT DEFAULT 'Anggota',
  wijk TEXT NOT NULL DEFAULT 'Lingkungan Letare',
  aktif BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Pastikan semua kolom tersedia jika tabel anggota sudah ada sebelumnya
ALTER TABLE public.anggota ADD COLUMN IF NOT EXISTS tgl_lahir DATE;
ALTER TABLE public.anggota ADD COLUMN IF NOT EXISTS tgl_baptis DATE;
ALTER TABLE public.anggota ADD COLUMN IF NOT EXISTS tgl_sidi DATE;
ALTER TABLE public.anggota ADD COLUMN IF NOT EXISTS hub_keluarga TEXT DEFAULT 'Anggota';
ALTER TABLE public.anggota ADD COLUMN IF NOT EXISTS wijk TEXT NOT NULL DEFAULT 'Lingkungan Letare';
ALTER TABLE public.anggota ADD COLUMN IF NOT EXISTS aktif BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE public.anggota ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE public.anggota ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_anggota_registrasi ON public.anggota (registrasi);
CREATE INDEX IF NOT EXISTS idx_anggota_wijk ON public.anggota (wijk);
CREATE INDEX IF NOT EXISTS idx_anggota_nama ON public.anggota (nama);
CREATE INDEX IF NOT EXISTS idx_anggota_aktif ON public.anggota (aktif);

ALTER TABLE public.anggota ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Hanya pengurus dapat mengakses data anggota" ON public.anggota;
DROP POLICY IF EXISTS "Pengurus dapat membaca data anggota" ON public.anggota;
DROP POLICY IF EXISTS "Admin dan sekretaris dapat mengelola data anggota" ON public.anggota;

CREATE POLICY "Pengurus dapat membaca data anggota"
  ON public.anggota FOR SELECT
  TO authenticated
  USING (public.has_pengurus_role(ARRAY['admin', 'sekretaris', 'bendahara']));

CREATE POLICY "Admin dan sekretaris dapat mengelola data anggota"
  ON public.anggota FOR ALL
  TO authenticated
  USING (public.has_pengurus_role(ARRAY['admin', 'sekretaris']))
  WITH CHECK (public.has_pengurus_role(ARRAY['admin', 'sekretaris']));


-- 4. TRIGGER OTOMATIS: UPDATE TIMESTAMP & SINKRONISASI JUMLAH ANGGOTA KELUARGA
-- ============================================================================

CREATE OR REPLACE FUNCTION public.set_row_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_keluarga_updated_at ON public.keluarga;
CREATE TRIGGER trg_keluarga_updated_at
  BEFORE UPDATE ON public.keluarga
  FOR EACH ROW
  EXECUTE FUNCTION public.set_row_updated_at();

DROP TRIGGER IF EXISTS trg_anggota_updated_at ON public.anggota;
CREATE TRIGGER trg_anggota_updated_at
  BEFORE UPDATE ON public.anggota
  FOR EACH ROW
  EXECUTE FUNCTION public.set_row_updated_at();

CREATE OR REPLACE FUNCTION public.sync_keluarga_jumlah_anggota()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' OR TG_OP = 'UPDATE' THEN
    UPDATE public.keluarga k
    SET jumlah_anggota = (
      SELECT COUNT(*)::int
      FROM public.anggota a
      WHERE a.registrasi = OLD.registrasi
        AND a.aktif = true
    ),
    updated_at = NOW()
    WHERE k.registrasi = OLD.registrasi;
  END IF;

  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE public.keluarga k
    SET jumlah_anggota = (
      SELECT COUNT(*)::int
      FROM public.anggota a
      WHERE a.registrasi = NEW.registrasi
        AND a.aktif = true
    ),
    updated_at = NOW()
    WHERE k.registrasi = NEW.registrasi;
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_keluarga_jumlah_anggota ON public.anggota;
CREATE TRIGGER trg_sync_keluarga_jumlah_anggota
  AFTER INSERT OR UPDATE OR DELETE ON public.anggota
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_keluarga_jumlah_anggota();


-- 5. VIEWS STATISTIK, CALON SIDI & RPC ULANG TAHUN PERIODE
-- ============================================================================

CREATE OR REPLACE VIEW public.v_calon_sidi
WITH (security_invoker = true) AS
SELECT
  a.id,
  a.registrasi,
  a.nama,
  a.jenis_kelamin,
  a.tgl_lahir::text AS tgl_lahir,
  EXTRACT(YEAR FROM AGE(CURRENT_DATE, a.tgl_lahir))::int AS usia,
  a.wijk,
  k.nama_kk,
  a.tgl_baptis::text AS tgl_baptis,
  a.hub_keluarga
FROM public.anggota a
LEFT JOIN public.keluarga k ON k.registrasi = a.registrasi
WHERE a.aktif = true
  AND a.tgl_sidi IS NULL
  AND a.tgl_lahir IS NOT NULL
  AND EXTRACT(YEAR FROM AGE(CURRENT_DATE, a.tgl_lahir)) BETWEEN 14 AND 20
ORDER BY a.wijk, usia DESC, a.nama;

CREATE OR REPLACE VIEW public.v_statistik_wijk
WITH (security_invoker = true) AS
SELECT
  COALESCE(k_stats.wijk, a_stats.wijk) AS wijk,
  COALESCE(k_stats.jumlah_keluarga, 0)::int AS jumlah_keluarga,
  COALESCE(k_stats.jumlah_keluarga, 0)::int AS total_keluarga,
  COALESCE(a_stats.jumlah_anggota, 0)::int AS jumlah_anggota,
  COALESCE(a_stats.jumlah_anggota, 0)::int AS total_anggota,
  COALESCE(a_stats.laki_laki, 0)::int AS laki_laki,
  COALESCE(a_stats.perempuan, 0)::int AS perempuan,
  COALESCE(a_stats.sudah_sidi, 0)::int AS sudah_sidi,
  COALESCE(a_stats.belum_sidi, 0)::int AS belum_sidi
FROM (
  SELECT wijk, COUNT(*) AS jumlah_keluarga
  FROM public.keluarga
  GROUP BY wijk
) k_stats
FULL OUTER JOIN (
  SELECT
    wijk,
    COUNT(*) FILTER (WHERE aktif = true) AS jumlah_anggota,
    COUNT(*) FILTER (WHERE aktif = true AND jenis_kelamin = 'L') AS laki_laki,
    COUNT(*) FILTER (WHERE aktif = true AND jenis_kelamin = 'P') AS perempuan,
    COUNT(*) FILTER (WHERE aktif = true AND tgl_sidi IS NOT NULL) AS sudah_sidi,
    COUNT(*) FILTER (WHERE aktif = true AND tgl_sidi IS NULL) AS belum_sidi
  FROM public.anggota
  GROUP BY wijk
) a_stats ON k_stats.wijk = a_stats.wijk
ORDER BY wijk;

CREATE OR REPLACE FUNCTION public.ulang_tahun_periode(
  p_mulai DATE,
  p_akhir DATE
)
RETURNS TABLE (
  nama TEXT,
  jenis_kelamin TEXT,
  tgl_lahir TEXT,
  usia INTEGER,
  wijk TEXT
)
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  SELECT
    a.nama,
    a.jenis_kelamin,
    a.tgl_lahir::text AS tgl_lahir,
    GREATEST(1, EXTRACT(YEAR FROM AGE(m.ulang_date, a.tgl_lahir))::int) AS usia,
    a.wijk
  FROM public.anggota a
  JOIN LATERAL (
    SELECT d::date AS ulang_date
    FROM generate_series(p_mulai, p_akhir, interval '1 day') AS d
    WHERE EXTRACT(MONTH FROM d) = EXTRACT(MONTH FROM a.tgl_lahir)
      AND EXTRACT(DAY FROM d) = EXTRACT(DAY FROM a.tgl_lahir)
    LIMIT 1
  ) m ON true
  WHERE a.aktif = true
    AND a.tgl_lahir IS NOT NULL
  ORDER BY m.ulang_date ASC, a.nama ASC;
$$;

GRANT SELECT ON public.v_calon_sidi TO authenticated;
GRANT SELECT ON public.v_statistik_wijk TO authenticated;
GRANT EXECUTE ON FUNCTION public.ulang_tahun_periode(DATE, DATE) TO authenticated;
