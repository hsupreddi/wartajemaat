/**
 * Types for Warta Jemaat HKBP Ressort Hutaraja (Distrik VI Dairi)
 */

export type UserRole = 'admin' | 'sekretaris' | 'bendahara' | 'publik';

export interface UserProfile {
  id: string;
  email: string;
  nama: string;
  role: UserRole;
  jabatan?: string;
  created_at?: string;
}

export interface ManagedUser {
  id: string;
  nama: string;
  email: string;
  role: UserRole;
  jabatan: string;
  aktif: boolean;
  tanggal_dibuat: string;
}

export interface KopSuratLine {
  id: string;
  teks: string;
  font?: 'display' | 'sans' | 'serif';
  ukuran?: 'xl' | 'lg' | 'md' | 'sm' | 'xs';
  tebal?: boolean;
  miring?: boolean;
  kapital?: boolean;
  jarak_bawah?: '0' | '1' | '2';
  warna?: 'hitam' | 'gelap' | 'abu';
}

export interface PengaturanHuria {
  id: string;
  nama_huria: string;
  sk_pengakuan: string;
  distrik: string;
  alamat: string;
  telepon?: string;
  email_gereja?: string;
  logo_salib_url?: string;
  logo_transformasi_url?: string;
  tema_warna_aksen?: string;
  font_kop?: string;
  kop_baris?: KopSuratLine[];
  ayat_tetap_default: string;
  ayat_ref_default: string;
  teks_ucapan_ulang_tahun: string;
  teks_penutup_keuangan: string;
  updated_at?: string;
}

export type KelompokJadwal = 'ibadah' | 'partangiangan' | 'kategorial' | 'kemajelisan';

export interface JadwalTetapItem {
  id: string;
  kelompok: KelompokJadwal;
  label: string;
  hari: string;
  jam: string;
  keterangan?: string;
  urutan: number;
}

export interface LingkunganItem {
  id: string;
  nama: string;
  hari_default: string;
  jam_default: string;
  urutan: number;
}

export interface MingguLiturgi {
  id: string;
  no_urut?: number;
  nama_minggu: string; // e.g. "Advent I", "Invocavit", "Reminiscere"
  arti_indonesia?: string;
  arti_batak?: string;
  warna_liturgi?: string; // "Ungu" | "Putih" | "Hijau" | "Merah" | "Hitam"
  topik_default?: string;
  ayat_default?: string;
  ayat_ref_default?: string;
  keterangan?: string;
}

export interface PetugasMaster {
  id: string;
  nama: string;
  jabatan: string; // e.g. "Pendeta Ressort", "Guru Huria", "Bibelvrouw", "Sintua"
  peran_default?: string;
  lingkungan?: string;
  aktif: boolean;
  urutan?: number;
}

export interface PeranParhobasMaster {
  id: string;
  nama_peran: string; // Jamita, Agenda, Tingting, Pelean, Organis, Harentaon
  default_skm: string; // usually "GR SKM" or specific GSM
  urutan: number;
}

export interface TemplateAcaraMaster {
  id: string;
  jenis: 'minggu' | 'partangiangan';
  urutan: number;
  uraian: string;
  keterangan?: string;
}

export interface KelompokKoorMaster {
  id: string;
  nama: string;
  jadwal_latihan?: string;
}

export interface AnggotaJemaat {
  id: string;
  nama: string;
  jenis_kelamin: 'L' | 'P';
  tanggal_lahir?: string | null; // YYYY-MM-DD (nullable)
  wijk: string;
  aktif: boolean;
}

export interface Keluarga {
  registrasi: string; // text PK, preserve leading zeros
  wijk: string;
  nama_kk: string;
  kk_wafat?: boolean;
  jalan?: string;
  hp?: string;
  jumlah_anggota?: number;
}

export interface Anggota {
  id: string; // uuid
  registrasi: string; // text FK to keluarga.registrasi
  nama: string;
  jenis_kelamin: 'L' | 'P';
  tgl_lahir: string | null; // date NULLABLE
  tgl_baptis?: string | null;
  tgl_sidi?: string | null;
  hub_keluarga?: string;
  wijk: string;
  aktif: boolean;
}

export interface CalonSidi {
  id?: string;
  registrasi?: string;
  nama: string;
  jenis_kelamin?: 'L' | 'P';
  tgl_lahir?: string | null;
  usia?: number;
  wijk?: string;
  nama_kk?: string;
  tgl_baptis?: string | null;
  hub_keluarga?: string;
}

export interface StatistikWijk {
  wijk: string;
  jumlah_keluarga?: number;
  total_keluarga?: number;
  jumlah_anggota?: number;
  total_anggota?: number;
  laki_laki?: number;
  perempuan?: number;
  sudah_sidi?: number;
  belum_sidi?: number;
}

export interface UlangTahunRpcResult {
  nama: string;
  jenis_kelamin: 'L' | 'P';
  tgl_lahir: string | null;
  usia: number;
  wijk: string;
}

export interface UlangTahunItem {
  no: number;
  nama: string;
  jenis_kelamin: 'L' | 'P';
  tanggal_lahir: string;
  hari_bulan: string; // DD/MM
  usia: number;
  wijk: string;
}

export type WartaStatus = 'draft' | 'published';

export interface WartaRecord {
  id: string;
  tanggal_minggu: string; // YYYY-MM-DD
  status: WartaStatus;
  goar_minggu: string;
  topik_minggu: string;
  ayat_teks: string;
  ayat_ref: string;
  ruas_sm: number;
  ruas_pagi: number;
  ruas_siang: number;
  markoor_1: string;
  markoor_2: string;
  jadwal_koor_tanggal?: string;
  koor_pagi: string;
  koor_siang: string;
  periode_keuangan_mulai: string;
  periode_keuangan_akhir: string;
  saldo_awal_huria: number;
  saldo_awal_sosial: number;
  saldo_awal_pembangunan: number;
  saldo_awal_sentralisasi?: number;
  saldo_awal_transitori: number;
  ulang_tahun_snapshot?: UlangTahunItem[];
  teks_ucapan_ulang_tahun?: string;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

export interface DynamicTableColumn {
  key: string;
  label: string;
  removable?: boolean;
}

export interface AcaraIbadahItem {
  id: string;
  warta_id?: string;
  jenis: 'minggu' | 'partangiangan';
  urutan: number;
  uraian: string;
  keterangan?: string; // e.g. "Jongjong", "Pel 1a, 1b", "Pelean II"
  [key: string]: any;
}

export interface ParhobasItem {
  id: string;
  warta_id?: string;
  peran: string; // Jamita, Agenda, Tingting, Pelean, Organis, Harentaon
  skm: string;
  sesi1: string;
  sesi2: string;
  urutan: number;
  [key: string]: any;
}

export interface SopoGodangItem {
  id: string;
  warta_id?: string;
  nama: string;
  tanggal: string;
  urutan: number;
  [key: string]: any;
}

export interface JadwalPartangianganItem {
  id: string;
  warta_id?: string;
  hari: string;
  lingkungan: string;
  pukul: string;
  inganan: string;
  urutan: number;
  [key: string]: any;
}

export interface PengumumanItem {
  id: string;
  warta_id?: string;
  urutan: number;
  judul: string;
  isi: string;
}

export type AturanAlokasi = 'split_45_55' | 'sosial' | 'pembangunan' | 'transitori' | 'huria' | 'manual';

export interface KategoriPenerimaanMaster {
  id: string;
  kode: string;
  kelompok: '1.1' | '1.2' | '1.3' | string;
  no_tampilan: string; // misal '1.1.1', '1.2.1', '1.3.1'
  urutan: number;
  uraian: string;
  aturan_alokasi: AturanAlokasi;
  is_sentralisasi?: boolean; // Default Sentralisasi? Ya/Tidak dari master
  dialihkan_ke_pembangunan?: boolean; // misal baris Pel 1b alokasi ke pemb
}

export interface PenerimaanRow {
  id: string;
  kategori_id?: string;
  kode: string;
  kelompok?: '1.1' | '1.2' | '1.3' | string;
  no_tampilan?: string; // misal '1.1.1', '1.2.1', '1.3.1'
  urutan: number;
  uraian: string;
  aturan_alokasi: AturanAlokasi;
  is_sentralisasi?: boolean; // Pilihan pengguna: Sentralisasi? Ya (true) / Tidak (false)
  dialihkan_ke_pembangunan?: boolean;
  jumlah: number;
  // Calculated distribution
  huria_45: number;
  sosial: number;
  pembangunan: number;
  sentral_55: number;
  transitori: number;
  [key: string]: any;
}

export interface PeleanTaonItem {
  id: string;
  warta_id?: string;
  nama: string;
  lingkungan: string;
  jumlah: number;
  urutan: number;
}

export interface HamauliateonItem {
  id: string;
  warta_id?: string;
  nama: string;
  rincian?: string;
  jumlah: number;
  ke_huria?: number;
  ke_sosial?: number;
  ke_pembangunan?: number;
  ke_sentralisasi?: number; // Legacy field; sentralisasi now auto-calculated 55% from ke_huria when active
  ke_transitori?: number;
  transitori_kode?: string;
  transitori_uraian?: string;
  urutan: number;
  [key: string]: any;
}

export type PosPengeluaranDefault = 'huria' | 'sosial' | 'pembangunan' | 'transitori';

export interface KategoriPengeluaranMaster {
  id: string;
  kode: string;
  urutan: number;
  uraian: string;
  pos_default: PosPengeluaranDefault;
  is_sentralisasi?: boolean;
}

export interface PengeluaranItem {
  id: string;
  warta_id?: string;
  kode?: string;
  urutan: number;
  uraian: string;
  is_sentralisasi?: boolean; // Pilihan pengguna: Sentralisasi? Ya (true) / Tidak (false)
  sentralisasi?: number; // Porsi 55% bila dikenakan sentralisasi
  jumlah?: number; // Total belanja baris ini
  huria: number;
  sosial: number;
  pembangunan: number;
  transitori: number;
  catatan?: string;
}

export interface RekapDanaRow {
  pos: string;
  saldo_awal: number;
  masuk: number;
  keluar: number;
  saldo_akhir: number;
}

export interface RekapitulasiKeuangan {
  huria: RekapDanaRow;
  sosial: RekapDanaRow;
  pembangunan: RekapDanaRow;
  sentralisasi: RekapDanaRow;
  transitori: RekapDanaRow;
  total_saldo_awal?: number;
  total_masuk: number;
  total_keluar: number;
  total_saldo_akhir: number;
  is_balanced: boolean;
  selisih: number;
}

export interface FullWartaData {
  warta: WartaRecord;
  acara_minggu: AcaraIbadahItem[];
  acara_partangiangan: AcaraIbadahItem[];
  parhobas: ParhobasItem[];
  sopo_godang: SopoGodangItem[];
  jadwal_partangiangan: JadwalPartangianganItem[];
  pengumuman: PengumumanItem[];
  penerimaan: PenerimaanRow[];
  pelean_taon: PeleanTaonItem[];
  hamauliateon: HamauliateonItem[];
  pengeluaran: PengeluaranItem[];
  ulang_tahun: UlangTahunItem[];
  rekapitulasi: RekapitulasiKeuangan;
  // Flexible dynamic table columns
  parhobas_columns?: DynamicTableColumn[];
  acara_minggu_columns?: DynamicTableColumn[];
  acara_partangiangan_columns?: DynamicTableColumn[];
  sopo_godang_columns?: DynamicTableColumn[];
  jadwal_partangiangan_columns?: DynamicTableColumn[];
}
