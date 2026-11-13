-- ====================================================================
-- WARTA JEMAAT HKBP RESSORT HUTARAJA (DISTRIK VI DAIRI)
-- Database Schema & Row Level Security (RLS) for Supabase PostgreSQL
-- ====================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. ENUMS & DOMAINS
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('admin', 'sekretaris', 'bendahara');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE warta_status AS ENUM ('draft', 'published');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. PROFILES TABLE (Linked with Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    nama TEXT NOT NULL,
    role user_role NOT NULL DEFAULT 'sekretaris',
    jabatan TEXT DEFAULT 'Parhalado',
    aktif BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 4. PENGATURAN (MASTER KOP & TEKS RESMI)
CREATE TABLE IF NOT EXISTS public.pengaturan (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nama_huria TEXT NOT NULL DEFAULT 'HURIA KRISTEN BATAK PROTESTAN (HKBP)',
    sk_pengakuan TEXT NOT NULL DEFAULT 'Pengakuan Pemerintah 11 Juni 1931 No. 48, Staatsblad Thn. 1932 No. 360 / jo. No. Dp/P/DAK/d/13568, jo. No. 33 Tahun 1988 / Pengakuan Ulang Pemerintah RI Tgl. 2 April 1968, Dp/P/DAK/d/135/68',
    distrik TEXT NOT NULL DEFAULT 'DISTRIK VI DAIRI – RESSORT HUTARAJA',
    alamat TEXT NOT NULL DEFAULT 'Jl. Persada No. 205 Desa Hutarakyat, Kec. Sidikalang',
    logo_salib_url TEXT,
    logo_transformasi_url TEXT,
    ayat_tetap_default TEXT DEFAULT 'Marpanghiramon tu Jahowa ma ho sian nasa roham, jala unang marpangunsandean tu roham sandiri.',
    ayat_ref_default TEXT DEFAULT 'Poda 3:5',
    teks_ucapan_ulang_tahun TEXT NOT NULL DEFAULT 'Alai angka na marhaposan tu Jahowa dapotan gogo imbaru, manangkup angka habong songon pidoli, marlojong nasida ndang marnaloja, mardalan nasida ndang marnatep. (Jesayas 40:31)',
    teks_penutup_keuangan TEXT NOT NULL DEFAULT 'Molo adong na hurang di tingting on, tapaboa ma tu Uluan ni Huria, manang tu Sintua Lingkunganta, asa boi tapasingkop tu tingting Minggu na naeng ro.',
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. JADWAL TETAP (PANGHOBASION NI HURIA SIDEBAR)
CREATE TABLE IF NOT EXISTS public.jadwal_tetap (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kelompok TEXT NOT NULL CHECK (kelompok IN ('ibadah', 'partangiangan', 'kategorial', 'kemajelisan')),
    label TEXT NOT NULL,
    hari TEXT NOT NULL,
    jam TEXT NOT NULL,
    keterangan TEXT,
    urutan INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. LINGKUNGAN / WIJK MASTER
CREATE TABLE IF NOT EXISTS public.lingkungan (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nama TEXT NOT NULL UNIQUE,
    hari_default TEXT DEFAULT 'Rabu',
    jam_default TEXT DEFAULT '20.00 WIB',
    urutan INT DEFAULT 0
);

-- 7. ANGGOTA (DATA RUAS & ULANG TAHUN)
CREATE TABLE IF NOT EXISTS public.anggota (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nama TEXT NOT NULL,
    jenis_kelamin CHAR(1) NOT NULL CHECK (jenis_kelamin IN ('L', 'P')),
    tanggal_lahir DATE NOT NULL,
    wijk TEXT NOT NULL,
    aktif BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. WARTA TABLE
CREATE TABLE IF NOT EXISTS public.warta (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tanggal_minggu DATE NOT NULL UNIQUE,
    status warta_status NOT NULL DEFAULT 'draft',
    goar_minggu TEXT NOT NULL,
    topik_minggu TEXT,
    ayat_teks TEXT,
    ayat_ref TEXT,
    ruas_sm INT DEFAULT 0,
    ruas_pagi INT DEFAULT 0,
    ruas_siang INT DEFAULT 0,
    markoor_1 TEXT,
    markoor_2 TEXT,
    jadwal_koor_tanggal DATE,
    koor_pagi TEXT,
    koor_siang TEXT,
    periode_keuangan_mulai DATE,
    periode_keuangan_akhir DATE,
    saldo_awal_huria BIGINT DEFAULT 0,
    saldo_awal_sosial BIGINT DEFAULT 0,
    saldo_awal_pembangunan BIGINT DEFAULT 0,
    saldo_awal_transitori BIGINT DEFAULT 0,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER update_warta_updated_at
BEFORE UPDATE ON public.warta
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 9. ACARA IBADAH (MINGGU & PARTANGIANGAN)
CREATE TABLE IF NOT EXISTS public.acara_ibadah (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    warta_id UUID NOT NULL REFERENCES public.warta(id) ON DELETE CASCADE,
    jenis TEXT NOT NULL CHECK (jenis IN ('minggu', 'partangiangan')),
    urutan INT NOT NULL,
    uraian TEXT NOT NULL,
    keterangan TEXT
);

-- 10. PARHOBAS MINGGU (PELAYAN IBADAH)
CREATE TABLE IF NOT EXISTS public.parhobas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    warta_id UUID NOT NULL REFERENCES public.warta(id) ON DELETE CASCADE,
    peran TEXT NOT NULL,
    skm TEXT,
    sesi1 TEXT,
    sesi2 TEXT,
    urutan INT NOT NULL
);

-- 11. SOPO GODANG (DAFTAR PEMAKAI GEDUNG)
CREATE TABLE IF NOT EXISTS public.sopo_godang (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    warta_id UUID NOT NULL REFERENCES public.warta(id) ON DELETE CASCADE,
    nama TEXT NOT NULL,
    tanggal TEXT NOT NULL,
    urutan INT NOT NULL
);

-- 12. JADWAL PARTANGIANGAN LINGKUNGAN MINGGU INI
CREATE TABLE IF NOT EXISTS public.jadwal_partangiangan (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    warta_id UUID NOT NULL REFERENCES public.warta(id) ON DELETE CASCADE,
    hari TEXT NOT NULL,
    lingkungan TEXT NOT NULL,
    pukul TEXT NOT NULL,
    inganan TEXT NOT NULL,
    urutan INT NOT NULL DEFAULT 0
);

-- 13. PENGUMUMAN DINAMIS (TINTING NAMARRAGAM)
CREATE TABLE IF NOT EXISTS public.pengumuman (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    warta_id UUID NOT NULL REFERENCES public.warta(id) ON DELETE CASCADE,
    urutan INT NOT NULL,
    judul TEXT NOT NULL,
    isi TEXT NOT NULL
);

-- 14. KATEGORI PENERIMAAN MASTER (28 BARIS STANDAR HKBP)
CREATE TABLE IF NOT EXISTS public.kategori_penerimaan (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kode TEXT UNIQUE,
    urutan INT NOT NULL,
    uraian TEXT NOT NULL,
    aturan_alokasi TEXT NOT NULL CHECK (aturan_alokasi IN ('split_45_55', 'sosial', 'pembangunan', 'transitori', 'huria', 'manual')),
    dialihkan_ke_pembangunan BOOLEAN DEFAULT false
);

-- 15. PENERIMAAN WARTA (TRANSAKSI KEUANGAN MASUK)
CREATE TABLE IF NOT EXISTS public.penerimaan (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    warta_id UUID NOT NULL REFERENCES public.warta(id) ON DELETE CASCADE,
    kategori_id UUID NOT NULL REFERENCES public.kategori_penerimaan(id),
    jumlah BIGINT NOT NULL DEFAULT 0,
    override_alokasi JSONB
);

-- 16. PELEAN TAON (RINCIAN BULANAN)
CREATE TABLE IF NOT EXISTS public.pelean_taon (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    warta_id UUID NOT NULL REFERENCES public.warta(id) ON DELETE CASCADE,
    nama TEXT NOT NULL,
    lingkungan TEXT NOT NULL,
    jumlah BIGINT NOT NULL DEFAULT 0,
    urutan INT NOT NULL DEFAULT 0
);

-- 17. HAMAULIATEON / UCAPAN SYUKUR
CREATE TABLE IF NOT EXISTS public.hamauliateon (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    warta_id UUID NOT NULL REFERENCES public.warta(id) ON DELETE CASCADE,
    nama TEXT NOT NULL,
    rincian TEXT,
    jumlah BIGINT NOT NULL DEFAULT 0,
    urutan INT NOT NULL DEFAULT 0
);

-- 18. PENGELUARAN WARTA (TRANSAKSI KELUAR)
CREATE TABLE IF NOT EXISTS public.pengeluaran (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    warta_id UUID NOT NULL REFERENCES public.warta(id) ON DELETE CASCADE,
    urutan INT NOT NULL,
    uraian TEXT NOT NULL,
    huria BIGINT NOT NULL DEFAULT 0,
    sosial BIGINT NOT NULL DEFAULT 0,
    pembangunan BIGINT NOT NULL DEFAULT 0,
    transitori BIGINT NOT NULL DEFAULT 0
);

-- ====================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ====================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pengaturan ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jadwal_tetap ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lingkungan ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.anggota ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warta ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.acara_ibadah ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parhobas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sopo_godang ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jadwal_partangiangan ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pengumuman ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kategori_penerimaan ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.penerimaan ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pelean_taon ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hamauliateon ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pengeluaran ENABLE ROW LEVEL SECURITY;

-- Helper functions to check role
CREATE OR REPLACE FUNCTION public.get_current_role()
RETURNS user_role AS $$
    SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Profiles: Authenticated read; Admin or owner update
CREATE POLICY "Profiles readable by authenticated users"
ON public.profiles FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admin can manage profiles"
ON public.profiles FOR ALL
TO authenticated
USING (public.get_current_role() = 'admin');

-- Pengaturan: Everyone can read; Admin can manage
CREATE POLICY "Public can read settings"
ON public.pengaturan FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Admin can update settings"
ON public.pengaturan FOR ALL
TO authenticated
USING (public.get_current_role() = 'admin');

-- Master tables (jadwal_tetap, lingkungan, anggota, kategori_penerimaan):
CREATE POLICY "Public can read master tables"
ON public.jadwal_tetap FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Sekretaris and Admin manage jadwal_tetap"
ON public.jadwal_tetap FOR ALL TO authenticated
USING (public.get_current_role() IN ('admin', 'sekretaris'));

CREATE POLICY "Public read lingkungan"
ON public.lingkungan FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Sekretaris and Admin manage lingkungan"
ON public.lingkungan FOR ALL TO authenticated
USING (public.get_current_role() IN ('admin', 'sekretaris'));

CREATE POLICY "Public read anggota"
ON public.anggota FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Sekretaris and Admin manage anggota"
ON public.anggota FOR ALL TO authenticated
USING (public.get_current_role() IN ('admin', 'sekretaris'));

CREATE POLICY "Public read kategori_penerimaan"
ON public.kategori_penerimaan FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Bendahara and Admin manage kategori_penerimaan"
ON public.kategori_penerimaan FOR ALL TO authenticated
USING (public.get_current_role() IN ('admin', 'bendahara'));

-- Warta policies:
-- Public can only view published warta
CREATE POLICY "Public can view published warta"
ON public.warta FOR SELECT
TO anon
USING (status = 'published');

CREATE POLICY "Authenticated users can view all warta"
ON public.warta FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Sekretaris and Admin can insert/update/delete warta"
ON public.warta FOR ALL
TO authenticated
USING (public.get_current_role() IN ('admin', 'sekretaris', 'bendahara'));

-- Child tables linked to warta:
-- Public can view children if parent warta is published
CREATE POLICY "Public view acara_ibadah" ON public.acara_ibadah FOR SELECT TO anon
USING (EXISTS (SELECT 1 FROM public.warta w WHERE w.id = acara_ibadah.warta_id AND w.status = 'published'));
CREATE POLICY "Staff manage acara_ibadah" ON public.acara_ibadah FOR ALL TO authenticated
USING (public.get_current_role() IN ('admin', 'sekretaris'));

CREATE POLICY "Public view parhobas" ON public.parhobas FOR SELECT TO anon
USING (EXISTS (SELECT 1 FROM public.warta w WHERE w.id = parhobas.warta_id AND w.status = 'published'));
CREATE POLICY "Staff manage parhobas" ON public.parhobas FOR ALL TO authenticated
USING (public.get_current_role() IN ('admin', 'sekretaris'));

CREATE POLICY "Public view sopo_godang" ON public.sopo_godang FOR SELECT TO anon
USING (EXISTS (SELECT 1 FROM public.warta w WHERE w.id = sopo_godang.warta_id AND w.status = 'published'));
CREATE POLICY "Staff manage sopo_godang" ON public.sopo_godang FOR ALL TO authenticated
USING (public.get_current_role() IN ('admin', 'sekretaris'));

CREATE POLICY "Public view jadwal_partangiangan" ON public.jadwal_partangiangan FOR SELECT TO anon
USING (EXISTS (SELECT 1 FROM public.warta w WHERE w.id = jadwal_partangiangan.warta_id AND w.status = 'published'));
CREATE POLICY "Staff manage jadwal_partangiangan" ON public.jadwal_partangiangan FOR ALL TO authenticated
USING (public.get_current_role() IN ('admin', 'sekretaris'));

CREATE POLICY "Public view pengumuman" ON public.pengumuman FOR SELECT TO anon
USING (EXISTS (SELECT 1 FROM public.warta w WHERE w.id = pengumuman.warta_id AND w.status = 'published'));
CREATE POLICY "Staff manage pengumuman" ON public.pengumuman FOR ALL TO authenticated
USING (public.get_current_role() IN ('admin', 'sekretaris'));

-- Financial tables (Bendahara, Sekretaris & Admin):
CREATE POLICY "Public view penerimaan" ON public.penerimaan FOR SELECT TO anon
USING (EXISTS (SELECT 1 FROM public.warta w WHERE w.id = penerimaan.warta_id AND w.status = 'published'));
CREATE POLICY "Staff manage penerimaan" ON public.penerimaan FOR ALL TO authenticated
USING (public.get_current_role() IN ('admin', 'sekretaris', 'bendahara'));

CREATE POLICY "Public view pelean_taon" ON public.pelean_taon FOR SELECT TO anon
USING (EXISTS (SELECT 1 FROM public.warta w WHERE w.id = pelean_taon.warta_id AND w.status = 'published'));
CREATE POLICY "Staff manage pelean_taon" ON public.pelean_taon FOR ALL TO authenticated
USING (public.get_current_role() IN ('admin', 'sekretaris', 'bendahara'));

CREATE POLICY "Public view hamauliateon" ON public.hamauliateon FOR SELECT TO anon
USING (EXISTS (SELECT 1 FROM public.warta w WHERE w.id = hamauliateon.warta_id AND w.status = 'published'));
CREATE POLICY "Staff manage hamauliateon" ON public.hamauliateon FOR ALL TO authenticated
USING (public.get_current_role() IN ('admin', 'sekretaris', 'bendahara'));

CREATE POLICY "Public view pengeluaran" ON public.pengeluaran FOR SELECT TO anon
USING (EXISTS (SELECT 1 FROM public.warta w WHERE w.id = pengeluaran.warta_id AND w.status = 'published'));
CREATE POLICY "Staff manage pengeluaran" ON public.pengeluaran FOR ALL TO authenticated
USING (public.get_current_role() IN ('admin', 'sekretaris', 'bendahara'));

-- ====================================================================
-- SEED DATA (HKBP RESSORT HUTARAJA - DISTRIK VI DAIRI)
-- ====================================================================

-- 1. Pengaturan Default
INSERT INTO public.pengaturan (
    nama_huria, sk_pengakuan, distrik, alamat,
    ayat_tetap_default, ayat_ref_default, teks_ucapan_ulang_tahun, teks_penutup_keuangan
) VALUES (
    'HURIA KRISTEN BATAK PROTESTAN (HKBP)',
    'Pengakuan Pemerintah 11 Juni 1931 No. 48, Staatsblad Thn. 1932 No. 360 / jo. No. Dp/P/DAK/d/13568, jo. No. 33 Tahun 1988 / Pengakuan Ulang Pemerintah RI Tgl. 2 April 1968, Dp/P/DAK/d/135/68',
    'DISTRIK VI DAIRI – RESSORT HUTARAJA',
    'Jl. Persada No. 205 Desa Hutarakyat, Kec. Sidikalang',
    'Alai anggo ahu dohot donganku sajabu, ingkon Jahowa do oloannami.',
    'Josua 24:15b',
    'Alai angka na marhaposan tu Jahowa dapotan gogo imbaru, manangkup angka habong songon pidoli, marlojong nasida ndang marnaloja, mardalan nasida ndang marnatep. (Jesayas 40:31)',
    'Molo adong na hurang di tingting on, tapaboa ma tu Uluan ni Huria, manang tu Sintua Lingkunganta, asa boi tapasingkop tu tingting Minggu na naeng ro.'
) ON CONFLICT DO NOTHING;

-- 2. Lingkungan / Wijk
INSERT INTO public.lingkungan (nama, hari_default, jam_default, urutan) VALUES
('Lingkungan Letare', 'Rabu', '20.00 WIB', 1),
('Lingkungan Galatia', 'Rabu', '20.00 WIB', 2),
('Lingkungan Efesus', 'Rabu', '20.00 WIB', 3),
('Lingkungan Exaudi', 'Kamis', '20.00 WIB', 4),
('Lingkungan Judika', 'Kamis', '20.00 WIB', 5),
('Lingkungan Jeremia', 'Kamis', '20.00 WIB', 6)
ON CONFLICT (nama) DO NOTHING;

-- 3. Jadwal Tetap (Panghobasion ni Huria)
INSERT INTO public.jadwal_tetap (kelompok, label, hari, jam, keterangan, urutan) VALUES
('ibadah', 'Sekolah Minggu', 'Minggu', '07.00 WIB', 'Gedung Sekolah Minggu', 1),
('ibadah', 'Ibadah Pagi (Sesi 1)', 'Minggu', '08.30 WIB', 'Gereja Utama', 2),
('ibadah', 'Ibadah Siang (Sesi 2)', 'Minggu', '10.30 WIB', 'Gereja Utama', 3),
('partangiangan', 'Partangiangan Sektor A', 'Rabu', '20.00 WIB', 'Lingk. Letare, Galatia, Efesus', 4),
('partangiangan', 'Partangiangan Sektor B', 'Kamis', '20.00 WIB', 'Lingk. Exaudi, Judika, Jeremia', 5),
('kategorial', 'Punguan Ina Ester', 'Selasa', '16.00 WIB', 'Sopo Godang', 6),
('kategorial', 'Punguan Lansia', 'Rabu', '15.00 WIB', 'Gereja Utama', 7),
('kategorial', 'Punguan Ina Sion', 'Rabu', '16.00 WIB', 'Sopo Godang', 8),
('kategorial', 'Punguan Ina Kamis', 'Kamis', '16.00 WIB', 'Sopo Godang', 9),
('kategorial', 'Ama Immanuel & Estomihi', 'Sabtu', '20.00 WIB', 'Gereja & Konsistori', 10),
('kategorial', 'Remaja Naposobulung (RND)', 'Sabtu', '19.00 WIB', 'Sopo Godang', 11),
('kemajelisan', 'Sermon GSM (Guru Sikola Minggu)', 'Jumat', '17.00 WIB', 'Ruang Rapat', 12),
('kemajelisan', 'Sermon Parhalado', 'Jumat', '19.00 WIB', 'Ruang Konsistori', 13),
('kemajelisan', 'Marguru / Naek Sidi', 'Minggu', '12.30 WIB', 'Gereja Utama', 14)
ON CONFLICT DO NOTHING;

-- 4. Kategori Penerimaan Master (28 baris standar HKBP dengan alokasi otomatis)
INSERT INTO public.kategori_penerimaan (kode, urutan, uraian, aturan_alokasi, dialihkan_ke_pembangunan) VALUES
('PEL_SKM', 1, 'Pelean Sikkola Minggu', 'split_45_55', false),
('PEL_1A_SESI1', 2, 'Pelean 1a Sesi 1 (Pagi)', 'split_45_55', false),
('PEL_1B_SESI1', 3, 'Pelean 1b Sesi 1 (Pagi)', 'pembangunan', true),
('PEL_2_SESI1', 4, 'Pelean II Sesi 1 (Pagi)', 'split_45_55', false),
('PEL_1A_SESI2', 5, 'Pelean 1a Sesi 2 (Siang)', 'split_45_55', false),
('PEL_1B_SESI2', 6, 'Pelean 1b Sesi 2 (Siang)', 'pembangunan', true),
('PEL_2_SESI2', 7, 'Pelean II Sesi 2 (Siang)', 'split_45_55', false),
('PEL_PART_LETARE', 8, 'Pelean Part. Lingkungan Letare', 'split_45_55', false),
('PEL_PART_EXAUDI', 9, 'Pelean Part. Lingkungan Exaudi', 'split_45_55', false),
('PEL_PART_JUDIKA', 10, 'Pelean Part. Lingkungan Judika', 'split_45_55', false),
('PEL_PART_GALATIA', 11, 'Pelean Part. Lingkungan Galatia', 'split_45_55', false),
('PEL_PART_EFESUS', 12, 'Pelean Part. Lingkungan Efesus', 'split_45_55', false),
('PEL_PART_JEREMIA', 13, 'Pelean Part. Lingkungan Jeremia', 'split_45_55', false),
('PEL_PHD_AMA_IMMANUEL', 14, 'Pelean PHD Ama Immanuel', 'split_45_55', false),
('PEL_PHD_AMA_ESTOMIHI', 15, 'Pelean PHD Ama Estomihi', 'split_45_55', false),
('PEL_PHD_INA_KAMIS', 16, 'Pelean PHD Ina Kamis', 'split_45_55', false),
('PEL_PHD_INA_ESTER', 17, 'Pelean PHD Ina Ester', 'split_45_55', false),
('PEL_PHD_INA_SION', 18, 'Pelean PHD Ina Sion', 'split_45_55', false),
('PEL_PHD_LANSIA', 19, 'Pelean PHD Punguan Lansia', 'split_45_55', false),
('PEL_PHD_RENA', 20, 'Pelean PHD Remaja & Naposobulung', 'split_45_55', false),
('PEL_PART_KELUARGA', 21, 'Pelean Partangiangan Keluarga', 'split_45_55', false),
('PEL_TAON', 22, 'Pelean Taon (Rincian B)', 'split_45_55', false),
('HAM_HURIA', 23, 'Hamauliateon tu Huria', 'huria', false),
('HAM_SOSIAL', 24, 'Hamauliateon tu Kas Sosial Huria', 'sosial', false),
('HAM_PEMB', 25, 'Hamauliateon tu Pembangunan Huria', 'pembangunan', false),
('KAS_SOS_SESI1', 26, 'Kas Sosial Huria Sesi 1 (Pagi)', 'sosial', false),
('KAS_SOS_SESI2', 27, 'Kas Sosial Huria Sesi 2 (Siang)', 'sosial', false),
('HAM_LAIN', 28, 'Hamauliateon / Lain-lain (Rincian C)', 'huria', false)
ON CONFLICT (kode) DO NOTHING;
