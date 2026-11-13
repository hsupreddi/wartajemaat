-- ============================================================================
-- SKEMA DATABASE SUPABASE LENGKAP
-- Aplikasi Warta Jemaat Digital - HKBP Ressort Hutaraja (Distrik VI Dairi)
-- ============================================================================
-- Jalankan seluruh skrip ini di Supabase Dashboard -> SQL Editor -> New Query.
-- Skrip bersifat idempoten (aman dijalankan ulang tanpa menghapus data yang ada).
-- ============================================================================

-- 1. FUNGSI HELPER & PROFIL PENGGUNA (AUTH + RBAC)
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

-- Helper Security Definer untuk memeriksa role pengguna login tanpa rekursi RLS
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

-- Trigger otomatis saat user baru mendaftar / dibuat di Supabase Auth:
-- 1) Jika email sudah didaftarkan admin di tabel profiles, tautkan auth_user_id-nya.
-- 2) Jika belum ada profil sama sekali di sistem, akun pertama otomatis menjadi 'admin'.
-- 3) Selain itu, default role diambil dari metadata atau 'sekretaris'.
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


-- 2. MASTER PENGATURAN HURIA, JADWAL TETAP & LINGKUNGAN
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.pengaturan_huria (
  id TEXT PRIMARY KEY DEFAULT 'pengaturan-hutaraja',
  nama_huria TEXT NOT NULL,
  sk_pengakuan TEXT,
  distrik TEXT,
  alamat TEXT,
  telepon TEXT,
  email_gereja TEXT,
  logo_salib_url TEXT,
  logo_transformasi_url TEXT,
  tema_warna_aksen TEXT,
  font_kop TEXT,
  ayat_tetap_default TEXT,
  ayat_ref_default TEXT,
  teks_ucapan_ulang_tahun TEXT,
  teks_penutup_keuangan TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.pengaturan_huria ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Pengaturan huria dapat dibaca publik" ON public.pengaturan_huria;
CREATE POLICY "Pengaturan huria dapat dibaca publik"
  ON public.pengaturan_huria FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admin dapat mengelola pengaturan huria" ON public.pengaturan_huria;
CREATE POLICY "Admin dapat mengelola pengaturan huria"
  ON public.pengaturan_huria FOR ALL
  TO authenticated
  USING (public.has_pengurus_role(ARRAY['admin']))
  WITH CHECK (public.has_pengurus_role(ARRAY['admin']));

CREATE TABLE IF NOT EXISTS public.jadwal_tetap (
  id TEXT PRIMARY KEY,
  kelompok TEXT NOT NULL,
  label TEXT NOT NULL,
  hari TEXT NOT NULL,
  jam TEXT NOT NULL,
  keterangan TEXT,
  urutan INTEGER NOT NULL DEFAULT 1
);

ALTER TABLE public.jadwal_tetap ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Jadwal tetap dapat dibaca publik" ON public.jadwal_tetap;
CREATE POLICY "Jadwal tetap dapat dibaca publik"
  ON public.jadwal_tetap FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admin dan sekretaris dapat mengelola jadwal tetap" ON public.jadwal_tetap;
CREATE POLICY "Admin dan sekretaris dapat mengelola jadwal tetap"
  ON public.jadwal_tetap FOR ALL
  TO authenticated
  USING (public.has_pengurus_role(ARRAY['admin', 'sekretaris']))
  WITH CHECK (public.has_pengurus_role(ARRAY['admin', 'sekretaris']));

CREATE TABLE IF NOT EXISTS public.lingkungan (
  id TEXT PRIMARY KEY,
  nama TEXT NOT NULL,
  hari_default TEXT NOT NULL DEFAULT 'Rabu',
  jam_default TEXT NOT NULL DEFAULT '20.00 WIB',
  urutan INTEGER NOT NULL DEFAULT 1
);

ALTER TABLE public.lingkungan ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lingkungan dapat dibaca publik" ON public.lingkungan;
CREATE POLICY "Lingkungan dapat dibaca publik"
  ON public.lingkungan FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admin dan sekretaris dapat mengelola lingkungan" ON public.lingkungan;
CREATE POLICY "Admin dan sekretaris dapat mengelola lingkungan"
  ON public.lingkungan FOR ALL
  TO authenticated
  USING (public.has_pengurus_role(ARRAY['admin', 'sekretaris']))
  WITH CHECK (public.has_pengurus_role(ARRAY['admin', 'sekretaris']));


-- 3. MASTER 63 MINGGU LITURGI HKBP
-- ============================================================================

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
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_minggu_liturgi_no ON public.minggu_liturgi (no_urut ASC);
CREATE INDEX IF NOT EXISTS idx_minggu_liturgi_nama ON public.minggu_liturgi (nama_minggu);

ALTER TABLE public.minggu_liturgi ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Minggu liturgi dapat dibaca semua pengguna" ON public.minggu_liturgi;
CREATE POLICY "Minggu liturgi dapat dibaca semua pengguna"
  ON public.minggu_liturgi FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Pengurus dapat mengelola minggu liturgi" ON public.minggu_liturgi;
CREATE POLICY "Pengurus dapat mengelola minggu liturgi"
  ON public.minggu_liturgi FOR ALL
  TO authenticated
  USING (public.has_pengurus_role(ARRAY['admin', 'sekretaris']))
  WITH CHECK (public.has_pengurus_role(ARRAY['admin', 'sekretaris']));


-- 4. MASTER POS KEUANGAN FLEKSIBEL (PENERIMAAN & PENGELUARAN)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.master_kategori_penerimaan (
  id TEXT PRIMARY KEY,
  kode TEXT NOT NULL,
  kelompok TEXT NOT NULL DEFAULT '1.1',
  no_tampilan TEXT NOT NULL DEFAULT '',
  urutan INTEGER NOT NULL DEFAULT 1,
  uraian TEXT NOT NULL,
  aturan_alokasi TEXT NOT NULL DEFAULT 'split_45_55',
  is_sentralisasi BOOLEAN NOT NULL DEFAULT true,
  dialihkan_ke_pembangunan BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.master_kategori_penerimaan ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Master penerimaan dapat dibaca publik" ON public.master_kategori_penerimaan;
CREATE POLICY "Master penerimaan dapat dibaca publik"
  ON public.master_kategori_penerimaan FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Pengurus dapat mengelola master penerimaan" ON public.master_kategori_penerimaan;
CREATE POLICY "Pengurus dapat mengelola master penerimaan"
  ON public.master_kategori_penerimaan FOR ALL
  TO authenticated
  USING (public.has_pengurus_role(ARRAY['admin', 'sekretaris', 'bendahara']))
  WITH CHECK (public.has_pengurus_role(ARRAY['admin', 'sekretaris', 'bendahara']));

CREATE TABLE IF NOT EXISTS public.master_kategori_pengeluaran (
  id TEXT PRIMARY KEY,
  kode TEXT NOT NULL,
  urutan INTEGER NOT NULL DEFAULT 1,
  uraian TEXT NOT NULL,
  pos_default TEXT NOT NULL DEFAULT 'huria',
  is_sentralisasi BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.master_kategori_pengeluaran ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Master pengeluaran dapat dibaca publik" ON public.master_kategori_pengeluaran;
CREATE POLICY "Master pengeluaran dapat dibaca publik"
  ON public.master_kategori_pengeluaran FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Pengurus dapat mengelola master pengeluaran" ON public.master_kategori_pengeluaran;
CREATE POLICY "Pengurus dapat mengelola master pengeluaran"
  ON public.master_kategori_pengeluaran FOR ALL
  TO authenticated
  USING (public.has_pengurus_role(ARRAY['admin', 'sekretaris', 'bendahara']))
  WITH CHECK (public.has_pengurus_role(ARRAY['admin', 'sekretaris', 'bendahara']));


-- 5. DATABASE JEMAAT (KELUARGA & ANGGOTA) + VIEWS + RPC ULANG TAHUN
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.keluarga (
  registrasi TEXT PRIMARY KEY,
  wijk TEXT NOT NULL,
  nama_kk TEXT NOT NULL,
  kk_wafat BOOLEAN NOT NULL DEFAULT false,
  jalan TEXT,
  hp TEXT,
  jumlah_anggota INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_keluarga_wijk ON public.keluarga (wijk);

ALTER TABLE public.keluarga ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Hanya pengurus dapat mengakses data keluarga" ON public.keluarga;
CREATE POLICY "Hanya pengurus dapat mengakses data keluarga"
  ON public.keluarga FOR ALL
  TO authenticated
  USING (public.has_pengurus_role(ARRAY['admin', 'sekretaris', 'bendahara']))
  WITH CHECK (public.has_pengurus_role(ARRAY['admin', 'sekretaris']));

CREATE TABLE IF NOT EXISTS public.anggota (
  id TEXT PRIMARY KEY,
  registrasi TEXT NOT NULL REFERENCES public.keluarga(registrasi) ON DELETE CASCADE ON UPDATE CASCADE,
  nama TEXT NOT NULL,
  jenis_kelamin TEXT NOT NULL CHECK (jenis_kelamin IN ('L', 'P')),
  tgl_lahir DATE,
  tgl_baptis DATE,
  tgl_sidi DATE,
  hub_keluarga TEXT DEFAULT 'Anggota',
  wijk TEXT NOT NULL,
  aktif BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_anggota_registrasi ON public.anggota (registrasi);
CREATE INDEX IF NOT EXISTS idx_anggota_wijk ON public.anggota (wijk);

ALTER TABLE public.anggota ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Hanya pengurus dapat mengakses data anggota" ON public.anggota;
CREATE POLICY "Hanya pengurus dapat mengakses data anggota"
  ON public.anggota FOR ALL
  TO authenticated
  USING (public.has_pengurus_role(ARRAY['admin', 'sekretaris', 'bendahara']))
  WITH CHECK (public.has_pengurus_role(ARRAY['admin', 'sekretaris']));

-- View Calon Sidi (Anggota aktif belum sidi usia 14 s/d 20 tahun)
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

-- View Statistik per Wijk / Lingkungan
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

-- RPC Ulang Tahun Periode (Menangani rentang tanggal lintas tahun dengan akurat)
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


-- 6. TABEL UTAMA WARTA JEMAAT & TABEL ANAK (CASCADE DELETE)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.warta (
  id TEXT PRIMARY KEY,
  tanggal_minggu DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  goar_minggu TEXT NOT NULL,
  topik_minggu TEXT DEFAULT '',
  ayat_teks TEXT DEFAULT '',
  ayat_ref TEXT DEFAULT '',
  ruas_sm INTEGER NOT NULL DEFAULT 0,
  ruas_pagi INTEGER NOT NULL DEFAULT 0,
  ruas_siang INTEGER NOT NULL DEFAULT 0,
  markoor_1 TEXT DEFAULT '',
  markoor_2 TEXT DEFAULT '',
  jadwal_koor_tanggal TEXT DEFAULT '',
  koor_pagi TEXT DEFAULT '',
  koor_siang TEXT DEFAULT '',
  periode_keuangan_mulai DATE,
  periode_keuangan_akhir DATE,
  saldo_awal_huria NUMERIC NOT NULL DEFAULT 0,
  saldo_awal_sosial NUMERIC NOT NULL DEFAULT 0,
  saldo_awal_pembangunan NUMERIC NOT NULL DEFAULT 0,
  saldo_awal_sentralisasi NUMERIC NOT NULL DEFAULT 0,
  saldo_awal_transitori NUMERIC NOT NULL DEFAULT 0,
  ulang_tahun_snapshot JSONB NOT NULL DEFAULT '[]'::jsonb,
  table_columns JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_warta_tanggal ON public.warta (tanggal_minggu DESC);
CREATE INDEX IF NOT EXISTS idx_warta_status ON public.warta (status);

ALTER TABLE public.warta ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Publik membaca warta published dan pengurus membaca semua" ON public.warta;
CREATE POLICY "Publik membaca warta published dan pengurus membaca semua"
  ON public.warta FOR SELECT
  USING (
    status = 'published'
    OR public.has_pengurus_role(ARRAY['admin', 'sekretaris', 'bendahara'])
  );

DROP POLICY IF EXISTS "Pengurus dapat menambah dan mengubah warta" ON public.warta;
CREATE POLICY "Pengurus dapat menambah dan mengubah warta"
  ON public.warta FOR INSERT
  TO authenticated
  WITH CHECK (public.has_pengurus_role(ARRAY['admin', 'sekretaris', 'bendahara']));

DROP POLICY IF EXISTS "Pengurus dapat memperbarui warta" ON public.warta;
CREATE POLICY "Pengurus dapat memperbarui warta"
  ON public.warta FOR UPDATE
  TO authenticated
  USING (public.has_pengurus_role(ARRAY['admin', 'sekretaris', 'bendahara']))
  WITH CHECK (public.has_pengurus_role(ARRAY['admin', 'sekretaris', 'bendahara']));

DROP POLICY IF EXISTS "Hanya admin dapat menghapus warta" ON public.warta;
CREATE POLICY "Hanya admin dapat menghapus warta"
  ON public.warta FOR DELETE
  TO authenticated
  USING (public.has_pengurus_role(ARRAY['admin']));

-- Helper policy function for child tables of warta
CREATE OR REPLACE FUNCTION public.can_read_warta_child(p_warta_id TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.warta w
    WHERE w.id = p_warta_id
      AND (w.status = 'published' OR public.has_pengurus_role(ARRAY['admin', 'sekretaris', 'bendahara']))
  );
$$;

-- 6a. Acara Ibadah (Minggu & Partangiangan)
CREATE TABLE IF NOT EXISTS public.acara_ibadah (
  id TEXT PRIMARY KEY,
  warta_id TEXT NOT NULL REFERENCES public.warta(id) ON DELETE CASCADE,
  jenis TEXT NOT NULL CHECK (jenis IN ('minggu', 'partangiangan')),
  urutan INTEGER NOT NULL DEFAULT 1,
  uraian TEXT NOT NULL,
  keterangan TEXT DEFAULT '',
  extra_cols JSONB DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS idx_acara_ibadah_warta ON public.acara_ibadah (warta_id, jenis, urutan);
ALTER TABLE public.acara_ibadah ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Baca acara ibadah sesuai akses warta" ON public.acara_ibadah;
CREATE POLICY "Baca acara ibadah sesuai akses warta" ON public.acara_ibadah FOR SELECT
  USING (public.can_read_warta_child(warta_id));

DROP POLICY IF EXISTS "Kelola acara ibadah" ON public.acara_ibadah;
CREATE POLICY "Kelola acara ibadah" ON public.acara_ibadah FOR ALL TO authenticated
  USING (public.has_pengurus_role(ARRAY['admin', 'sekretaris']))
  WITH CHECK (public.has_pengurus_role(ARRAY['admin', 'sekretaris']));

-- 6b. Parhobas (Pelayan Ibadah)
CREATE TABLE IF NOT EXISTS public.parhobas (
  id TEXT PRIMARY KEY,
  warta_id TEXT NOT NULL REFERENCES public.warta(id) ON DELETE CASCADE,
  peran TEXT NOT NULL,
  skm TEXT DEFAULT '',
  sesi1 TEXT DEFAULT '',
  sesi2 TEXT DEFAULT '',
  urutan INTEGER NOT NULL DEFAULT 1,
  extra_cols JSONB DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS idx_parhobas_warta ON public.parhobas (warta_id, urutan);
ALTER TABLE public.parhobas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Baca parhobas sesuai akses warta" ON public.parhobas;
CREATE POLICY "Baca parhobas sesuai akses warta" ON public.parhobas FOR SELECT
  USING (public.can_read_warta_child(warta_id));

DROP POLICY IF EXISTS "Kelola parhobas" ON public.parhobas;
CREATE POLICY "Kelola parhobas" ON public.parhobas FOR ALL TO authenticated
  USING (public.has_pengurus_role(ARRAY['admin', 'sekretaris']))
  WITH CHECK (public.has_pengurus_role(ARRAY['admin', 'sekretaris']));

-- 6c. Sopo Godang
CREATE TABLE IF NOT EXISTS public.sopo_godang (
  id TEXT PRIMARY KEY,
  warta_id TEXT NOT NULL REFERENCES public.warta(id) ON DELETE CASCADE,
  nama TEXT DEFAULT '-',
  tanggal TEXT DEFAULT '-',
  urutan INTEGER NOT NULL DEFAULT 1,
  extra_cols JSONB DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS idx_sopo_godang_warta ON public.sopo_godang (warta_id, urutan);
ALTER TABLE public.sopo_godang ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Baca sopo godang sesuai akses warta" ON public.sopo_godang;
CREATE POLICY "Baca sopo godang sesuai akses warta" ON public.sopo_godang FOR SELECT
  USING (public.can_read_warta_child(warta_id));

DROP POLICY IF EXISTS "Kelola sopo godang" ON public.sopo_godang;
CREATE POLICY "Kelola sopo godang" ON public.sopo_godang FOR ALL TO authenticated
  USING (public.has_pengurus_role(ARRAY['admin', 'sekretaris', 'bendahara']))
  WITH CHECK (public.has_pengurus_role(ARRAY['admin', 'sekretaris', 'bendahara']));

-- 6d. Jadwal Partangiangan
CREATE TABLE IF NOT EXISTS public.jadwal_partangiangan (
  id TEXT PRIMARY KEY,
  warta_id TEXT NOT NULL REFERENCES public.warta(id) ON DELETE CASCADE,
  hari TEXT DEFAULT '',
  lingkungan TEXT DEFAULT '',
  pukul TEXT DEFAULT '',
  inganan TEXT DEFAULT '',
  urutan INTEGER NOT NULL DEFAULT 1,
  extra_cols JSONB DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS idx_jadwal_partangiangan_warta ON public.jadwal_partangiangan (warta_id, urutan);
ALTER TABLE public.jadwal_partangiangan ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Baca jadwal partangiangan sesuai akses warta" ON public.jadwal_partangiangan;
CREATE POLICY "Baca jadwal partangiangan sesuai akses warta" ON public.jadwal_partangiangan FOR SELECT
  USING (public.can_read_warta_child(warta_id));

DROP POLICY IF EXISTS "Kelola jadwal partangiangan" ON public.jadwal_partangiangan;
CREATE POLICY "Kelola jadwal partangiangan" ON public.jadwal_partangiangan FOR ALL TO authenticated
  USING (public.has_pengurus_role(ARRAY['admin', 'sekretaris']))
  WITH CHECK (public.has_pengurus_role(ARRAY['admin', 'sekretaris']));

-- 6e. Pengumuman Dinamis (Tingting Namarragam)
CREATE TABLE IF NOT EXISTS public.pengumuman (
  id TEXT PRIMARY KEY,
  warta_id TEXT NOT NULL REFERENCES public.warta(id) ON DELETE CASCADE,
  urutan INTEGER NOT NULL DEFAULT 1,
  judul TEXT NOT NULL,
  isi TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_pengumuman_warta ON public.pengumuman (warta_id, urutan);
ALTER TABLE public.pengumuman ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Baca pengumuman sesuai akses warta" ON public.pengumuman;
CREATE POLICY "Baca pengumuman sesuai akses warta" ON public.pengumuman FOR SELECT
  USING (public.can_read_warta_child(warta_id));

DROP POLICY IF EXISTS "Kelola pengumuman" ON public.pengumuman;
CREATE POLICY "Kelola pengumuman" ON public.pengumuman FOR ALL TO authenticated
  USING (public.has_pengurus_role(ARRAY['admin', 'sekretaris']))
  WITH CHECK (public.has_pengurus_role(ARRAY['admin', 'sekretaris']));

-- 6f. Penerimaan Keuangan (Tabel A)
CREATE TABLE IF NOT EXISTS public.penerimaan (
  id TEXT PRIMARY KEY,
  warta_id TEXT NOT NULL REFERENCES public.warta(id) ON DELETE CASCADE,
  kategori_id TEXT,
  kode TEXT NOT NULL,
  kelompok TEXT DEFAULT '1.1',
  no_tampilan TEXT DEFAULT '',
  urutan INTEGER NOT NULL DEFAULT 1,
  uraian TEXT NOT NULL,
  aturan_alokasi TEXT NOT NULL DEFAULT 'split_45_55',
  is_sentralisasi BOOLEAN NOT NULL DEFAULT false,
  dialihkan_ke_pembangunan BOOLEAN NOT NULL DEFAULT false,
  jumlah NUMERIC NOT NULL DEFAULT 0,
  huria_45 NUMERIC NOT NULL DEFAULT 0,
  sosial NUMERIC NOT NULL DEFAULT 0,
  pembangunan NUMERIC NOT NULL DEFAULT 0,
  sentral_55 NUMERIC NOT NULL DEFAULT 0,
  transitori NUMERIC NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_penerimaan_warta ON public.penerimaan (warta_id, urutan);
ALTER TABLE public.penerimaan ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Baca penerimaan sesuai akses warta" ON public.penerimaan;
CREATE POLICY "Baca penerimaan sesuai akses warta" ON public.penerimaan FOR SELECT
  USING (public.can_read_warta_child(warta_id));

DROP POLICY IF EXISTS "Kelola penerimaan" ON public.penerimaan;
CREATE POLICY "Kelola penerimaan" ON public.penerimaan FOR ALL TO authenticated
  USING (public.has_pengurus_role(ARRAY['admin', 'sekretaris', 'bendahara']))
  WITH CHECK (public.has_pengurus_role(ARRAY['admin', 'sekretaris', 'bendahara']));

-- 6g. Pelean Taon (Tabel B)
CREATE TABLE IF NOT EXISTS public.pelean_taon (
  id TEXT PRIMARY KEY,
  warta_id TEXT NOT NULL REFERENCES public.warta(id) ON DELETE CASCADE,
  nama TEXT NOT NULL,
  lingkungan TEXT DEFAULT '',
  jumlah NUMERIC NOT NULL DEFAULT 0,
  urutan INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS idx_pelean_taon_warta ON public.pelean_taon (warta_id, urutan);
ALTER TABLE public.pelean_taon ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Baca pelean taon sesuai akses warta" ON public.pelean_taon;
CREATE POLICY "Baca pelean taon sesuai akses warta" ON public.pelean_taon FOR SELECT
  USING (public.can_read_warta_child(warta_id));

DROP POLICY IF EXISTS "Kelola pelean taon" ON public.pelean_taon;
CREATE POLICY "Kelola pelean taon" ON public.pelean_taon FOR ALL TO authenticated
  USING (public.has_pengurus_role(ARRAY['admin', 'sekretaris', 'bendahara']))
  WITH CHECK (public.has_pengurus_role(ARRAY['admin', 'sekretaris', 'bendahara']));

-- 6h. Hamauliateon / Ucapan Syukur (Tabel C)
CREATE TABLE IF NOT EXISTS public.hamauliateon (
  id TEXT PRIMARY KEY,
  warta_id TEXT NOT NULL REFERENCES public.warta(id) ON DELETE CASCADE,
  nama TEXT NOT NULL,
  rincian TEXT DEFAULT '',
  jumlah NUMERIC NOT NULL DEFAULT 0,
  ke_huria NUMERIC DEFAULT 0,
  ke_sosial NUMERIC DEFAULT 0,
  ke_pembangunan NUMERIC DEFAULT 0,
  ke_sentralisasi NUMERIC DEFAULT 0,
  ke_transitori NUMERIC DEFAULT 0,
  urutan INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS idx_hamauliateon_warta ON public.hamauliateon (warta_id, urutan);
ALTER TABLE public.hamauliateon ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Baca hamauliateon sesuai akses warta" ON public.hamauliateon;
CREATE POLICY "Baca hamauliateon sesuai akses warta" ON public.hamauliateon FOR SELECT
  USING (public.can_read_warta_child(warta_id));

DROP POLICY IF EXISTS "Kelola hamauliateon" ON public.hamauliateon;
CREATE POLICY "Kelola hamauliateon" ON public.hamauliateon FOR ALL TO authenticated
  USING (public.has_pengurus_role(ARRAY['admin', 'sekretaris', 'bendahara']))
  WITH CHECK (public.has_pengurus_role(ARRAY['admin', 'sekretaris', 'bendahara']));

-- 6i. Pengeluaran / Belanja (Tabel D)
CREATE TABLE IF NOT EXISTS public.pengeluaran (
  id TEXT PRIMARY KEY,
  warta_id TEXT NOT NULL REFERENCES public.warta(id) ON DELETE CASCADE,
  kode TEXT DEFAULT '',
  urutan INTEGER NOT NULL DEFAULT 1,
  uraian TEXT NOT NULL,
  is_sentralisasi BOOLEAN NOT NULL DEFAULT false,
  sentralisasi NUMERIC DEFAULT 0,
  jumlah NUMERIC DEFAULT 0,
  huria NUMERIC NOT NULL DEFAULT 0,
  sosial NUMERIC NOT NULL DEFAULT 0,
  pembangunan NUMERIC NOT NULL DEFAULT 0,
  transitori NUMERIC NOT NULL DEFAULT 0,
  catatan TEXT DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_pengeluaran_warta ON public.pengeluaran (warta_id, urutan);
ALTER TABLE public.pengeluaran ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Baca pengeluaran sesuai akses warta" ON public.pengeluaran;
CREATE POLICY "Baca pengeluaran sesuai akses warta" ON public.pengeluaran FOR SELECT
  USING (public.can_read_warta_child(warta_id));

DROP POLICY IF EXISTS "Kelola pengeluaran" ON public.pengeluaran;
CREATE POLICY "Kelola pengeluaran" ON public.pengeluaran FOR ALL TO authenticated
  USING (public.has_pengurus_role(ARRAY['admin', 'sekretaris', 'bendahara']))
  WITH CHECK (public.has_pengurus_role(ARRAY['admin', 'sekretaris', 'bendahara']));


-- 7. DATA AWAL (SEED DEFAULT HURIA, LINGKUNGAN, JADWAL TETAP)
-- ============================================================================

INSERT INTO public.pengaturan_huria (
  id, nama_huria, sk_pengakuan, distrik, alamat, logo_salib_url, logo_transformasi_url,
  ayat_tetap_default, ayat_ref_default, teks_ucapan_ulang_tahun, teks_penutup_keuangan
) VALUES (
  'pengaturan-hutaraja',
  'HURIA KRISTEN BATAK PROTESTAN (HKBP)',
  'Pengakuan Pemerintah 11 Juni 1931 No. 48, Staatsblad Thn. 1932 No. 360 / jo. No. Dp/P/DAK/d/13568, jo. No. 33 Tahun 1988 / Pengakuan Ulang Pemerintah RI Tgl. 2 April 1968, Dp/P/DAK/d/135/68',
  'DISTRIK VI DAIRI – RESSORT HUTARAJA',
  'Jl. Persada No. 205 Desa Hutarakyat, Kec. Sidikalang',
  '/assets/aistudio/Logo-HKBP_02090ed7.png',
  '/assets/aistudio/Logo-Tahun-Transformasi-HKBP-2025-Fulcolor_247b231a.png',
  'Alai anggo ahu dohot donganku sajabu, ingkon Jahowa do oloannami.',
  'Josua 24:15b',
  'Alai angka na marhaposan tu Jahowa dapotan gogo imbaru, manangkup angka habong songon pidoli, marlojong nasida ndang marnaloja, mardalan nasida ndang marnatep. (Jesayas 40:31)',
  'Molo adong na hurang di tingting on, tapaboa ma tu Uluan ni Huria, manang tu Sintua Lingkunganta, asa boi tapasingkop tu tingting Minggu na naeng ro.'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.lingkungan (id, nama, hari_default, jam_default, urutan) VALUES
  ('l1', 'Lingkungan Letare', 'Rabu', '20.00 WIB', 1),
  ('l2', 'Lingkungan Galatia', 'Rabu', '20.00 WIB', 2),
  ('l3', 'Lingkungan Efesus', 'Rabu', '20.00 WIB', 3),
  ('l4', 'Lingkungan Exaudi', 'Kamis', '20.00 WIB', 4),
  ('l5', 'Lingkungan Judika', 'Kamis', '20.00 WIB', 5),
  ('l6', 'Lingkungan Jeremia', 'Kamis', '20.00 WIB', 6)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.jadwal_tetap (id, kelompok, label, hari, jam, keterangan, urutan) VALUES
  ('jt1', 'ibadah', 'Sekolah Minggu', 'Minggu', '07.00 WIB', 'Gedung Sekolah Minggu', 1),
  ('jt2', 'ibadah', 'Ibadah Pagi (Sesi 1)', 'Minggu', '08.30 WIB', 'Gereja Utama', 2),
  ('jt3', 'ibadah', 'Ibadah Siang (Sesi 2)', 'Minggu', '10.30 WIB', 'Gereja Utama', 3),
  ('jt4', 'partangiangan', 'Partangiangan Sektor A', 'Rabu', '20.00 WIB', 'Lingk. Letare, Galatia, Efesus', 4),
  ('jt5', 'partangiangan', 'Partangiangan Sektor B', 'Kamis', '20.00 WIB', 'Lingk. Exaudi, Judika, Jeremia', 5),
  ('jt6', 'kategorial', 'Punguan Ina Ester', 'Selasa', '16.00 WIB', 'Sopo Godang', 6),
  ('jt7', 'kategorial', 'Punguan Lansia', 'Rabu', '15.00 WIB', 'Gereja Utama', 7),
  ('jt8', 'kategorial', 'Punguan Ina Sion', 'Rabu', '16.00 WIB', 'Sopo Godang', 8),
  ('jt9', 'kategorial', 'Punguan Ina Kamis', 'Kamis', '16.00 WIB', 'Sopo Godang', 9),
  ('jt10', 'kategorial', 'Ama Immanuel & Estomihi', 'Sabtu', '20.00 WIB', 'Gereja & Konsistori', 10),
  ('jt11', 'kategorial', 'Remaja Naposobulung (RND)', 'Sabtu', '19.00 WIB', 'Sopo Godang', 11),
  ('jt12', 'kemajelisan', 'Sermon GSM', 'Jumat', '17.00 WIB', 'Ruang Guru SKM', 12),
  ('jt13', 'kemajelisan', 'Sermon Parhalado', 'Jumat', '19.00 WIB', 'Ruang Konsistori', 13),
  ('jt14', 'kemajelisan', 'Marguru / Naek Sidi', 'Minggu', '12.30 WIB', 'Gereja Utama', 14)
ON CONFLICT (id) DO NOTHING;
