import {
  AcaraIbadahItem,
  AnggotaJemaat,
  FullWartaData,
  HamauliateonItem,
  JadwalPartangianganItem,
  JadwalTetapItem,
  KategoriPenerimaanMaster,
  KategoriPengeluaranMaster,
  LingkunganItem,
  ParhobasItem,
  PeleanTaonItem,
  PenerimaanRow,
  PengaturanHuria,
  PengeluaranItem,
  PengumumanItem,
  SopoGodangItem,
  WartaRecord,
  MingguLiturgi,
  PetugasMaster,
  PeranParhobasMaster,
  KelompokKoorMaster
} from '../types';
import { calculateRekapitulasi, calculateRowAlokasi, calculateHamauliateonTotals } from './financialMath';
import { getUlangTahunMingguIni } from './dateUtils';

export const DEFAULT_PENGATURAN: PengaturanHuria = {
  id: 'pengaturan-hutaraja',
  nama_huria: 'HURIA KRISTEN BATAK PROTESTAN (HKBP)',
  sk_pengakuan:
    'Pengakuan Pemerintah 11 Juni 1931 No. 48, Staatsblad Thn. 1932 No. 360 / jo. No. Dp/P/DAK/d/13568, jo. No. 33 Tahun 1988 / Pengakuan Ulang Pemerintah RI Tgl. 2 April 1968, Dp/P/DAK/d/135/68',
  distrik: 'DISTRIK VI DAIRI – RESSORT HUTARAJA',
  alamat: 'Jl. Persada No. 205 Desa Hutarakyat, Kec. Sidikalang',
  logo_salib_url: '/assets/aistudio/Logo-HKBP_02090ed7.png',
  logo_transformasi_url: '/assets/aistudio/Logo-Tahun-Transformasi-HKBP-2025-Fulcolor_247b231a.png',
  ayat_tetap_default: 'Alai anggo ahu dohot donganku sajabu, ingkon Jahowa do oloannami.',
  ayat_ref_default: 'Josua 24:15b',
  teks_ucapan_ulang_tahun:
    'Alai angka na marhaposan tu Jahowa dapotan gogo imbaru, manangkup angka habong songon pidoli, marlojong nasida ndang marnaloja, mardalan nasida ndang marnatep. (Jesayas 40:31)',
  teks_penutup_keuangan:
    'Molo adong na hurang di tingting on, tapaboa ma tu Uluan ni Huria, manang tu Sintua Lingkunganta, asa boi tapasingkop tu tingting Minggu na naeng ro.'
};

export const DEFAULT_LINGKUNGAN: LingkunganItem[] = [
  { id: 'l1', nama: 'Lingkungan Letare', hari_default: 'Rabu', jam_default: '20.00 WIB', urutan: 1 },
  { id: 'l2', nama: 'Lingkungan Galatia', hari_default: 'Rabu', jam_default: '20.00 WIB', urutan: 2 },
  { id: 'l3', nama: 'Lingkungan Efesus', hari_default: 'Rabu', jam_default: '20.00 WIB', urutan: 3 },
  { id: 'l4', nama: 'Lingkungan Exaudi', hari_default: 'Kamis', jam_default: '20.00 WIB', urutan: 4 },
  { id: 'l5', nama: 'Lingkungan Judika', hari_default: 'Kamis', jam_default: '20.00 WIB', urutan: 5 },
  { id: 'l6', nama: 'Lingkungan Jeremia', hari_default: 'Kamis', jam_default: '20.00 WIB', urutan: 6 }
];

export const DEFAULT_JADWAL_TETAP: JadwalTetapItem[] = [
  { id: 'jt1', kelompok: 'ibadah', label: 'Sekolah Minggu', hari: 'Minggu', jam: '07.00 WIB', keterangan: 'Gedung Sekolah Minggu', urutan: 1 },
  { id: 'jt2', kelompok: 'ibadah', label: 'Ibadah Pagi (Sesi 1)', hari: 'Minggu', jam: '08.30 WIB', keterangan: 'Gereja Utama', urutan: 2 },
  { id: 'jt3', kelompok: 'ibadah', label: 'Ibadah Siang (Sesi 2)', hari: 'Minggu', jam: '10.30 WIB', keterangan: 'Gereja Utama', urutan: 3 },
  { id: 'jt4', kelompok: 'partangiangan', label: 'Partangiangan Sektor A', hari: 'Rabu', jam: '20.00 WIB', keterangan: 'Lingk. Letare, Galatia, Efesus', urutan: 4 },
  { id: 'jt5', kelompok: 'partangiangan', label: 'Partangiangan Sektor B', hari: 'Kamis', jam: '20.00 WIB', keterangan: 'Lingk. Exaudi, Judika, Jeremia', urutan: 5 },
  { id: 'jt6', kelompok: 'kategorial', label: 'Punguan Ina Ester', hari: 'Selasa', jam: '16.00 WIB', keterangan: 'Sopo Godang', urutan: 6 },
  { id: 'jt7', kelompok: 'kategorial', label: 'Punguan Lansia', hari: 'Rabu', jam: '15.00 WIB', keterangan: 'Gereja Utama', urutan: 7 },
  { id: 'jt8', kelompok: 'kategorial', label: 'Punguan Ina Sion', hari: 'Rabu', jam: '16.00 WIB', keterangan: 'Sopo Godang', urutan: 8 },
  { id: 'jt9', kelompok: 'kategorial', label: 'Punguan Ina Kamis', hari: 'Kamis', jam: '16.00 WIB', keterangan: 'Sopo Godang', urutan: 9 },
  { id: 'jt10', kelompok: 'kategorial', label: 'Ama Immanuel & Estomihi', hari: 'Sabtu', jam: '20.00 WIB', keterangan: 'Gereja & Konsistori', urutan: 10 },
  { id: 'jt11', kelompok: 'kategorial', label: 'Remaja Naposobulung (RND)', hari: 'Sabtu', jam: '19.00 WIB', keterangan: 'Sopo Godang', urutan: 11 },
  { id: 'jt12', kelompok: 'kemajelisan', label: 'Sermon GSM', hari: 'Jumat', jam: '17.00 WIB', keterangan: 'Ruang Guru SKM', urutan: 12 },
  { id: 'jt13', kelompok: 'kemajelisan', label: 'Sermon Parhalado', hari: 'Jumat', jam: '19.00 WIB', keterangan: 'Ruang Konsistori', urutan: 13 },
  { id: 'jt14', kelompok: 'kemajelisan', label: 'Marguru / Naek Sidi', hari: 'Minggu', jam: '12.30 WIB', keterangan: 'Gereja Utama', urutan: 14 }
];

export const MASTER_KATEGORI_PENERIMAAN: KategoriPenerimaanMaster[] = [
  // 1.1 PERSEMBAHAN KEBAKTIAN UMUM
  { id: 'k1_1_1', kode: 'PEL_SKM', kelompok: '1.1', no_tampilan: '1.1.1', urutan: 1, uraian: 'Pelean Sikkola Minggu', aturan_alokasi: 'split_45_55', is_sentralisasi: true },
  { id: 'k1_1_2', kode: 'PEL_1A_SESI1', kelompok: '1.1', no_tampilan: '1.1.2', urutan: 2, uraian: 'Pelean 1A Minggu Sesi I', aturan_alokasi: 'split_45_55', is_sentralisasi: true },
  { id: 'k1_1_3', kode: 'PEL_1B_SESI1', kelompok: '1.1', no_tampilan: '1.1.3', urutan: 3, uraian: 'Pelean 1B Minggu Sesi I', aturan_alokasi: 'pembangunan', dialihkan_ke_pembangunan: true, is_sentralisasi: false },
  { id: 'k1_1_4', kode: 'PEL_2A_SESI1', kelompok: '1.1', no_tampilan: '1.1.4', urutan: 4, uraian: 'Pelean 2A Minggu Sesi I', aturan_alokasi: 'huria', is_sentralisasi: false },
  { id: 'k1_1_5', kode: 'KAS_SOS_SESI1', kelompok: '1.1', no_tampilan: '1.1.5', urutan: 5, uraian: 'Kas Sosial Huria Minggu Sesi I', aturan_alokasi: 'sosial', is_sentralisasi: false },
  { id: 'k1_1_6', kode: 'PEL_1A_SESI2', kelompok: '1.1', no_tampilan: '1.1.6', urutan: 6, uraian: 'Pelean 1A Minggu Sesi II', aturan_alokasi: 'split_45_55', is_sentralisasi: true },
  { id: 'k1_1_7', kode: 'PEL_1B_SESI2', kelompok: '1.1', no_tampilan: '1.1.7', urutan: 7, uraian: 'Pelean 1B Minggu Sesi II', aturan_alokasi: 'pembangunan', dialihkan_ke_pembangunan: true, is_sentralisasi: false },
  { id: 'k1_1_8', kode: 'PEL_2A_SESI2', kelompok: '1.1', no_tampilan: '1.1.8', urutan: 8, uraian: 'Pelean 2A Minggu Sesi II', aturan_alokasi: 'huria', is_sentralisasi: false },
  { id: 'k1_1_9', kode: 'KAS_SOS_SESI2', kelompok: '1.1', no_tampilan: '1.1.9', urutan: 9, uraian: 'Kas Sosial Huria Minggu Sesi II', aturan_alokasi: 'sosial', is_sentralisasi: false },
  { id: 'k1_1_10', kode: 'PEL_KEB_UMUM_LAIN', kelompok: '1.1', no_tampilan: '1.1.10', urutan: 10, uraian: 'Persembahan Kebaktian Umum Lainnya', aturan_alokasi: 'huria', is_sentralisasi: false },

  // 1.2 PERSEMBAHAN LAINNYA
  { id: 'k1_2_1', kode: 'PEL_PART_LETARE', kelompok: '1.2', no_tampilan: '1.2.1', urutan: 11, uraian: 'Pelean Partangiangan Lingk. Letare', aturan_alokasi: 'split_45_55', is_sentralisasi: true },
  { id: 'k1_2_2', kode: 'PEL_PART_EXAUDI', kelompok: '1.2', no_tampilan: '1.2.2', urutan: 12, uraian: 'Pelean Partangiangan Lingk. Exaudi', aturan_alokasi: 'split_45_55', is_sentralisasi: true },
  { id: 'k1_2_3', kode: 'PEL_PART_JUDIKA', kelompok: '1.2', no_tampilan: '1.2.3', urutan: 13, uraian: 'Pelean Partangiangan Lingk. Judika', aturan_alokasi: 'split_45_55', is_sentralisasi: true },
  { id: 'k1_2_4', kode: 'PEL_PART_GALATIA', kelompok: '1.2', no_tampilan: '1.2.4', urutan: 14, uraian: 'Pelean Partangiangan Lingk. Galatia', aturan_alokasi: 'split_45_55', is_sentralisasi: true },
  { id: 'k1_2_5', kode: 'PEL_PART_EFESUS', kelompok: '1.2', no_tampilan: '1.2.5', urutan: 15, uraian: 'Pelean Partangiangan Lingk. Efesus', aturan_alokasi: 'split_45_55', is_sentralisasi: true },
  { id: 'k1_2_6', kode: 'PEL_PART_JEREMIA', kelompok: '1.2', no_tampilan: '1.2.6', urutan: 16, uraian: 'Pelean Partangiangan Lingk. Jeremia', aturan_alokasi: 'split_45_55', is_sentralisasi: true },
  { id: 'k1_2_7', kode: 'PEL_PHD_AMA_IMMANUEL', kelompok: '1.2', no_tampilan: '1.2.7', urutan: 17, uraian: 'Pelean PHD Ama Immanuel', aturan_alokasi: 'split_45_55', is_sentralisasi: true },
  { id: 'k1_2_8', kode: 'PEL_PHD_AMA_ESTOMIHI', kelompok: '1.2', no_tampilan: '1.2.8', urutan: 18, uraian: 'Pelean PHD Ama Estomihi', aturan_alokasi: 'split_45_55', is_sentralisasi: true },
  { id: 'k1_2_9', kode: 'PEL_PHD_INA_KAMIS', kelompok: '1.2', no_tampilan: '1.2.9', urutan: 19, uraian: 'Pelean PHD Ina Kamis', aturan_alokasi: 'split_45_55', is_sentralisasi: true },
  { id: 'k1_2_10', kode: 'PEL_PHD_INA_ESTER', kelompok: '1.2', no_tampilan: '1.2.10', urutan: 20, uraian: 'Pelean PHD Ina Ester', aturan_alokasi: 'split_45_55', is_sentralisasi: true },
  { id: 'k1_2_11', kode: 'PEL_PHD_INA_SION', kelompok: '1.2', no_tampilan: '1.2.11', urutan: 21, uraian: 'Pelean PHD Ina Sion', aturan_alokasi: 'split_45_55', is_sentralisasi: true },
  { id: 'k1_2_12', kode: 'PEL_PHD_LANSIA', kelompok: '1.2', no_tampilan: '1.2.12', urutan: 22, uraian: 'Pelean PHD Lansia', aturan_alokasi: 'split_45_55', is_sentralisasi: true },
  { id: 'k1_2_13', kode: 'PEL_PHD_RENA', kelompok: '1.2', no_tampilan: '1.2.13', urutan: 23, uraian: 'Pelean PHD Remaja Naposo', aturan_alokasi: 'split_45_55', is_sentralisasi: true },
  { id: 'k1_2_14', kode: 'PEL_PART_KELUARGA', kelompok: '1.2', no_tampilan: '1.2.14', urutan: 24, uraian: 'Pelean Partangiangan Keluarga', aturan_alokasi: 'split_45_55', is_sentralisasi: true },
  { id: 'k1_2_15', kode: 'PEL_TAON', kelompok: '1.2', no_tampilan: '1.2.15', urutan: 25, uraian: 'Pelean Taon', aturan_alokasi: 'split_45_55', is_sentralisasi: true },
  { id: 'k1_2_16', kode: 'PEL_PERPULUHAN', kelompok: '1.2', no_tampilan: '1.2.16', urutan: 26, uraian: 'Perpuluhan', aturan_alokasi: 'huria', is_sentralisasi: false },
  { id: 'k1_2_17', kode: 'HAM_LAIN', kelompok: '1.2', no_tampilan: '1.2.17', urutan: 27, uraian: 'Hamauliateon (Ucapan Syukur)', aturan_alokasi: 'manual', is_sentralisasi: true },

  // 1.3 PENERIMAAN TRANSITORI
  { id: 'k1_3_1', kode: 'TRANS_PENDETA', kelompok: '1.3', no_tampilan: '1.3.1', urutan: 28, uraian: 'Pendeta', aturan_alokasi: 'transitori', is_sentralisasi: false },
  { id: 'k1_3_2', kode: 'TRANS_BIBELVROW', kelompok: '1.3', no_tampilan: '1.3.2', urutan: 29, uraian: 'Bibelvrow', aturan_alokasi: 'transitori', is_sentralisasi: false },
  { id: 'k1_3_3', kode: 'TRANS_PARHALADO', kelompok: '1.3', no_tampilan: '1.3.3', urutan: 30, uraian: 'Parhalado', aturan_alokasi: 'transitori', is_sentralisasi: false },
  { id: 'k1_3_4', kode: 'TRANS_LINGK_LETARE', kelompok: '1.3', no_tampilan: '1.3.4', urutan: 31, uraian: 'Lingkungan Letare', aturan_alokasi: 'transitori', is_sentralisasi: false },
  { id: 'k1_3_5', kode: 'TRANS_LINGK_EXAUDI', kelompok: '1.3', no_tampilan: '1.3.5', urutan: 32, uraian: 'Lingkungan Exaudi', aturan_alokasi: 'transitori', is_sentralisasi: false },
  { id: 'k1_3_6', kode: 'TRANS_LINGK_JUDIKA', kelompok: '1.3', no_tampilan: '1.3.6', urutan: 33, uraian: 'Lingkungan Judika', aturan_alokasi: 'transitori', is_sentralisasi: false },
  { id: 'k1_3_7', kode: 'TRANS_LINGK_GALATIA', kelompok: '1.3', no_tampilan: '1.3.7', urutan: 34, uraian: 'Lingkungan Galatia', aturan_alokasi: 'transitori', is_sentralisasi: false },
  { id: 'k1_3_8', kode: 'TRANS_LINGK_EFESUS', kelompok: '1.3', no_tampilan: '1.3.8', urutan: 35, uraian: 'Lingkungan Efesus', aturan_alokasi: 'transitori', is_sentralisasi: false },
  { id: 'k1_3_9', kode: 'TRANS_LINGK_JEREMIA', kelompok: '1.3', no_tampilan: '1.3.9', urutan: 36, uraian: 'Lingkungan Jeremia', aturan_alokasi: 'transitori', is_sentralisasi: false },
  { id: 'k1_3_10', kode: 'TRANS_AMA_IMMANUEL', kelompok: '1.3', no_tampilan: '1.3.10', urutan: 37, uraian: 'Ama Immanuel', aturan_alokasi: 'transitori', is_sentralisasi: false },
  { id: 'k1_3_11', kode: 'TRANS_AMA_ESTOMIHI', kelompok: '1.3', no_tampilan: '1.3.11', urutan: 38, uraian: 'Ama Estomihi', aturan_alokasi: 'transitori', is_sentralisasi: false },
  { id: 'k1_3_12', kode: 'TRANS_INA_KAMIS', kelompok: '1.3', no_tampilan: '1.3.12', urutan: 39, uraian: 'Ina Kamis', aturan_alokasi: 'transitori', is_sentralisasi: false },
  { id: 'k1_3_13', kode: 'TRANS_INA_ESTER', kelompok: '1.3', no_tampilan: '1.3.13', urutan: 40, uraian: 'PHD Ina Ester', aturan_alokasi: 'transitori', is_sentralisasi: false },
  { id: 'k1_3_14', kode: 'TRANS_INA_SION', kelompok: '1.3', no_tampilan: '1.3.14', urutan: 41, uraian: 'Ina Sion', aturan_alokasi: 'transitori', is_sentralisasi: false },
  { id: 'k1_3_15', kode: 'TRANS_LANSIA', kelompok: '1.3', no_tampilan: '1.3.15', urutan: 42, uraian: 'Lansia', aturan_alokasi: 'transitori', is_sentralisasi: false },
  { id: 'k1_3_16', kode: 'TRANS_REMAJA_NAPOSO', kelompok: '1.3', no_tampilan: '1.3.16', urutan: 43, uraian: 'Remaja Naposo', aturan_alokasi: 'transitori', is_sentralisasi: false },
  { id: 'k1_3_17', kode: 'TRANS_SIKKOLA_MINGGU', kelompok: '1.3', no_tampilan: '1.3.17', urutan: 44, uraian: 'Sikkola Minggu', aturan_alokasi: 'transitori', is_sentralisasi: false },
  { id: 'k1_3_18', kode: 'TRANS_TIM_MUSIK', kelompok: '1.3', no_tampilan: '1.3.18', urutan: 45, uraian: 'Tim Musik', aturan_alokasi: 'transitori', is_sentralisasi: false },
  { id: 'k1_3_19', kode: 'TRANS_SONG_LEADER', kelompok: '1.3', no_tampilan: '1.3.19', urutan: 46, uraian: 'Song Leader', aturan_alokasi: 'transitori', is_sentralisasi: false },
  { id: 'k1_3_20', kode: 'TRANS_GURU_SKM', kelompok: '1.3', no_tampilan: '1.3.20', urutan: 47, uraian: 'Guru SKM', aturan_alokasi: 'transitori', is_sentralisasi: false }
];

export const MASTER_KATEGORI_PENGELUARAN: KategoriPengeluaranMaster[] = [
  { id: 'kp_1', kode: 'BEL_TRANSPORT', urutan: 1, uraian: 'Transport Parjamita & Organis Sesi 1 & 2', pos_default: 'huria', is_sentralisasi: false },
  { id: 'kp_2', kode: 'BEL_UTILITAS', urutan: 2, uraian: 'Listrik, Air & Kebersihan Gedung Gereja / Pastori', pos_default: 'huria', is_sentralisasi: false },
  { id: 'kp_3', kode: 'BEL_ATK_WARTA', urutan: 3, uraian: 'Fotocopy, Kertas Warta Jemaat & ATK Kantor', pos_default: 'huria', is_sentralisasi: false },
  { id: 'kp_4', kode: 'BEL_SERMON_RAPAT', urutan: 4, uraian: 'Konsumsi Rapat Parhalado & Sermon', pos_default: 'huria', is_sentralisasi: false },
  { id: 'kp_5', kode: 'BEL_HONOR_PELAYAN', urutan: 5, uraian: 'Honorarium / Tunjangan Pelayan Fulltimer', pos_default: 'huria', is_sentralisasi: false },
  { id: 'kp_6', kode: 'BEL_SOSIAL_DIAKONIA', urutan: 6, uraian: 'Tali Asih / Bantuan Diakonia Sosial Ruas', pos_default: 'sosial', is_sentralisasi: false },
  { id: 'kp_7', kode: 'BEL_PEMBANGUNAN', urutan: 7, uraian: 'Belanja Material & Pemeliharaan Gedung / Inventaris', pos_default: 'pembangunan', is_sentralisasi: false },
  { id: 'kp_8', kode: 'BEL_TRANSITORI', urutan: 8, uraian: 'Penyaluran Dana Transitori / Titipan', pos_default: 'transitori', is_sentralisasi: false }
];

import { OFFICIAL_HKBP_MINGGU_LITURGI } from './masterMingguData';

export const MASTER_MINGGU_LITURGI: MingguLiturgi[] = OFFICIAL_HKBP_MINGGU_LITURGI;

export const MASTER_PETUGAS: PetugasMaster[] = [
  { id: 'pet-1', nama: 'Pdt. H. Simanjuntak, S.Th', jabatan: 'Pendeta Ressort', peran_default: 'Jamita', aktif: true },
  { id: 'pet-2', nama: 'Pdt. R. Siregar, M.Th', jabatan: 'Pendeta Fungsional', peran_default: 'Jamita', aktif: true },
  { id: 'pet-3', nama: 'Bvr. S. br. Tinambunan', jabatan: 'Bibelvrouw', peran_default: 'Agenda', aktif: true },
  { id: 'pet-4', nama: 'Gr. T. Situmorang', jabatan: 'Guru Huria', peran_default: 'Agenda', aktif: true },
  { id: 'pet-5', nama: 'St. Ramses Sitohang', jabatan: 'Sintua', peran_default: 'Agenda', lingkungan: 'Lingkungan Letare', aktif: true },
  { id: 'pet-6', nama: 'St. Marudut Simarmata', jabatan: 'Sintua', peran_default: 'Tingting', lingkungan: 'Lingkungan Efesus', aktif: true },
  { id: 'pet-7', nama: 'St. Jansen Nababan', jabatan: 'Sintua', peran_default: 'Pelean', lingkungan: 'Lingkungan Judika', aktif: true },
  { id: 'pet-8', nama: 'St. Parlindungan Sihombing', jabatan: 'Sintua', peran_default: 'Tingting', lingkungan: 'Lingkungan Exaudi', aktif: true },
  { id: 'pet-9', nama: 'St. Daniel Nainggolan', jabatan: 'Sintua', peran_default: 'Pelean', lingkungan: 'Lingkungan Galatia', aktif: true },
  { id: 'pet-10', nama: 'St. Toga Pane', jabatan: 'Sintua', peran_default: 'Harentaon', lingkungan: 'Lingkungan Jeremia', aktif: true },
  { id: 'pet-11', nama: 'St. K. Purba', jabatan: 'Sintua', peran_default: 'Pelean', lingkungan: 'Lingkungan Letare', aktif: true },
  { id: 'pet-12', nama: 'CSt. L. Gultom', jabatan: 'Calon Sintua', peran_default: 'Pelean', lingkungan: 'Lingkungan Exaudi', aktif: true },
  { id: 'pet-13', nama: 'GSM Dina br. Bakkara', jabatan: 'Guru Sekolah Minggu', peran_default: 'Agenda', aktif: true },
  { id: 'pet-14', nama: 'GSM Rina br. Manalu', jabatan: 'Guru Sekolah Minggu', peran_default: 'Pelean', aktif: true },
  { id: 'pet-15', nama: 'Yosua Sitohang', jabatan: 'Organis Huria', peran_default: 'Organis', aktif: true },
  { id: 'pet-16', nama: 'Ester br. Silalahi', jabatan: 'Organis Huria', peran_default: 'Organis', aktif: true },
  { id: 'pet-17', nama: 'David Simarmata', jabatan: 'Organis Huria', peran_default: 'Organis', aktif: true }
];

export const MASTER_PERAN_PARHOBAS: PeranParhobasMaster[] = [
  { id: 'r1', nama_peran: 'Jamita', default_skm: 'St. R. Sitohang', urutan: 1 },
  { id: 'r2', nama_peran: 'Agenda', default_skm: 'GR SKM', urutan: 2 },
  { id: 'r3', nama_peran: 'Tingting', default_skm: '-', urutan: 3 },
  { id: 'r4', nama_peran: 'Pelean', default_skm: 'GR SKM', urutan: 4 },
  { id: 'r5', nama_peran: 'Organis', default_skm: 'Yosua Sitohang', urutan: 5 },
  { id: 'r6', nama_peran: 'Harentaon', default_skm: 'GSM Team', urutan: 6 }
];

export const MASTER_KELOMPOK_KOOR: KelompokKoorMaster[] = [
  { id: 'kr1', nama: 'Punguan Ina Ester', jadwal_latihan: 'Selasa 16.00 WIB' },
  { id: 'kr2', nama: 'Punguan Ina Kamis', jadwal_latihan: 'Kamis 16.00 WIB' },
  { id: 'kr3', nama: 'Punguan Ina Sion', jadwal_latihan: 'Rabu 16.00 WIB' },
  { id: 'kr4', nama: 'Punguan Lansia Naomi', jadwal_latihan: 'Rabu 15.00 WIB' },
  { id: 'kr5', nama: 'Punguan Ama Immanuel', jadwal_latihan: 'Sabtu 20.00 WIB' },
  { id: 'kr6', nama: 'Punguan Ama Estomihi', jadwal_latihan: 'Sabtu 20.00 WIB' },
  { id: 'kr7', nama: 'Remaja & Naposobulung (RND)', jadwal_latihan: 'Sabtu 19.00 WIB' },
  { id: 'kr8', nama: 'Koor Gabungan Parhalado', jadwal_latihan: 'Jumat 20.30 WIB' }
];

export const SAMPLE_ANGGOTA: AnggotaJemaat[] = [
  { id: 'ang-1', nama: 'St. Ramses Sitohang', jenis_kelamin: 'L', tanggal_lahir: '1970-11-02', wijk: 'Lingkungan Letare', aktif: true },
  { id: 'ang-2', nama: 'Ny. Sitohang br. Sinaga', jenis_kelamin: 'P', tanggal_lahir: '1974-11-03', wijk: 'Lingkungan Letare', aktif: true },
  { id: 'ang-3', nama: 'Daniel Kevin Sitohang', jenis_kelamin: 'L', tanggal_lahir: '2004-11-04', wijk: 'Lingkungan Letare', aktif: true },
  { id: 'ang-4', nama: 'Bona Tua Silalahi', jenis_kelamin: 'L', tanggal_lahir: '1982-11-05', wijk: 'Lingkungan Galatia', aktif: true },
  { id: 'ang-5', nama: 'Ny. Silalahi br. Manalu', jenis_kelamin: 'P', tanggal_lahir: '1985-11-05', wijk: 'Lingkungan Galatia', aktif: true },
  { id: 'ang-6', nama: 'St. Marudut Simarmata', jenis_kelamin: 'L', tanggal_lahir: '1965-11-06', wijk: 'Lingkungan Efesus', aktif: true },
  { id: 'ang-7', nama: 'Ruth Yohana br. Simarmata', jenis_kelamin: 'P', tanggal_lahir: '2001-11-07', wijk: 'Lingkungan Efesus', aktif: true },
  { id: 'ang-8', nama: 'CSt. Parlindungan Sihombing', jenis_kelamin: 'L', tanggal_lahir: '1978-11-08', wijk: 'Lingkungan Exaudi', aktif: true },
  { id: 'ang-9', nama: 'Debora Gloria Sihombing', jenis_kelamin: 'P', tanggal_lahir: '2012-11-08', wijk: 'Lingkungan Exaudi', aktif: true },
  { id: 'ang-10', nama: 'St. Jansen Nababan', jenis_kelamin: 'L', tanggal_lahir: '1968-11-02', wijk: 'Lingkungan Judika', aktif: true },
  { id: 'ang-11', nama: 'Ny. Nababan br. Lumbantobing', jenis_kelamin: 'P', tanggal_lahir: '1972-11-07', wijk: 'Lingkungan Judika', aktif: true },
  { id: 'ang-12', nama: 'Samuel Andrew Simanjuntak', jenis_kelamin: 'L', tanggal_lahir: '2008-11-04', wijk: 'Lingkungan Jeremia', aktif: true }
];

export const DEFAULT_ACARA_MINGGU_TEMPLATE: { uraian: string; keterangan?: string }[] = [
  { uraian: 'Marende BE/BN. No. 589 : 1 - 3', keterangan: 'Jongjong' },
  { uraian: 'Votum - Introitus - Tangiang' },
  { uraian: 'Marende BE/BN. No. 171 : 1 + 3' },
  { uraian: 'Patik: Patik I - X' },
  { uraian: 'Marende BE/BN. No. 681 : 1 - 2', keterangan: 'Jongjong' },
  { uraian: 'Manopoti Dosa - Bagabaga ni Debata' },
  { uraian: 'Marende BE/BN. No. 435 : 1 + 4' },
  { uraian: 'Epistel: Rom 12 : 1 - 2' },
  { uraian: 'Marende BE/BN. No. 178 : 1 - 2', keterangan: 'Jongjong' },
  { uraian: 'Manghatindanghon Haporseaon' },
  { uraian: 'Koor: Ina Ester / Ama Estomihi' },
  { uraian: 'Tingting / Warta Jemaat' },
  { uraian: 'Koor: Ina Kamis / Remaja Naposo' },
  { uraian: 'Marende BE/BN. No. 753 : 1 ...', keterangan: 'Pel 1a, 1b' },
  { uraian: 'Jamita: Jeremia 17 : 5 - 8' },
  { uraian: 'Marende BE/BN. No. 792 : 1 ...', keterangan: 'Pelean II' },
  { uraian: 'Tangiang Pelean - Ale Amanami - Pasupasu' }
];

export const DEFAULT_ACARA_PARTANGIANGAN_TEMPLATE: { uraian: string; keterangan?: string }[] = [
  { uraian: 'Marende BE. No. 10 : 1 - 2' },
  { uraian: 'Votum - Tangiang Pamuhai' },
  { uraian: 'Marende BE. No. 720 : 1 + 3' },
  { uraian: 'Epistel' },
  { uraian: 'Marende BE. No. 227 : 1' },
  { uraian: 'Jamita / Khotbah' },
  { uraian: 'Marende BE. No. 760 : 1 ... (Pelean)' },
  { uraian: 'Tangiang sian na ro / Tuan Rumah' },
  { uraian: 'Tangiang Pelean - Ale Amanami - Pasupasu' }
];

export const INITIAL_WARTA_RECORD: WartaRecord = {
  id: 'warta-2026-11-08',
  tanggal_minggu: '2026-11-08',
  status: 'published',
  goar_minggu: 'XXIII DUNG TRINITATIS',
  topik_minggu: 'Marpangunsandean tu Debata di Tingki Hagogotan',
  ayat_teks: 'Alai angka na marhaposan tu Jahowa dapotan gogo imbaru, manangkup angka habong songon pidoli, marlojong nasida ndang marnaloja, mardalan nasida ndang marnatep.',
  ayat_ref: 'Jesayas 40:31',
  ruas_sm: 84,
  ruas_pagi: 165,
  ruas_siang: 218,
  markoor_1: 'Punguan Ina Ester, Punguan Ama Immanuel',
  markoor_2: 'Punguan Ina Kamis, Remaja Naposobulung (RND)',
  jadwal_koor_tanggal: '2026-11-15',
  koor_pagi: 'Punguan Ina Sion, Ama Estomihi',
  koor_siang: 'Punguan Lansia, Koor Gabungan',
  periode_keuangan_mulai: '2026-11-01',
  periode_keuangan_akhir: '2026-11-07',
  saldo_awal_huria: 12450000,
  saldo_awal_sosial: 4120000,
  saldo_awal_pembangunan: 38750000,
  saldo_awal_sentralisasi: 0,
  saldo_awal_transitori: 1500000,
  created_at: '2026-11-08T06:00:00.000Z',
  updated_at: '2026-11-08T06:00:00.000Z'
};

export const INITIAL_PARHOBAS: ParhobasItem[] = [
  { id: 'p1', peran: 'Jamita', skm: 'St. R. Sitohang', sesi1: 'Pdt. H. Simanjuntak, S.Th', sesi2: 'Pdt. R. Siregar, M.Th', urutan: 1 },
  { id: 'p2', peran: 'Agenda', skm: 'GR SKM', sesi1: 'St. M. Simarmata', sesi2: 'St. J. Nababan', urutan: 2 },
  { id: 'p3', peran: 'Tingting', skm: '-', sesi1: 'St. P. Sihombing', sesi2: 'St. E. Hutasoit', urutan: 3 },
  { id: 'p4', peran: 'Pelean', skm: 'GR SKM', sesi1: 'St. K. Purba, CSt. L. Gultom', sesi2: 'St. D. Nainggolan, St. T. Pane', urutan: 4 },
  { id: 'p5', peran: 'Organis', skm: 'Yosua Sitohang', sesi1: 'Ester br. Silalahi', sesi2: 'David Simarmata', urutan: 5 },
  { id: 'p6', peran: 'Harentaon', skm: 'GSM Team', sesi1: 'CSt. B. Silalahi', sesi2: 'St. A. Pakpahan', urutan: 6 }
];

export const INITIAL_SOPO_GODANG: SopoGodangItem[] = [
  { id: 'sg1', nama: 'Kel. B. Silalahi / br. Manalu (Lingk. Galatia)', tanggal: 'Selasa, 10 Nopember 2026', urutan: 1 },
  { id: 'sg2', nama: 'Kel. St. R. Sitohang / br. Sinaga (Lingk. Letare)', tanggal: 'Kamis, 12 Nopember 2026', urutan: 2 },
  { id: 'sg3', nama: 'Partangiangan Remaja Naposo HKBP', tanggal: 'Sabtu, 14 Nopember 2026', urutan: 3 },
  { id: 'sg4', nama: 'Sermon GSM Distrik VI Dairi', tanggal: 'Senin, 16 Nopember 2026', urutan: 4 },
  { id: 'sg5', nama: 'Kel. P. Siregar / br. Tambunan (Lingk. Exaudi)', tanggal: 'Kamis, 19 Nopember 2026', urutan: 5 }
];

export const INITIAL_JADWAL_PARTANGIANGAN: JadwalPartangianganItem[] = [
  { id: 'jp1', hari: 'Rabu, 11 Nopember', lingkungan: 'Lingk. Letare', pukul: '20.00 WIB', inganan: 'Kel. A. Situmorang / br. Nainggolan (Jl. Persada)', urutan: 1 },
  { id: 'jp2', hari: 'Rabu, 11 Nopember', lingkungan: 'Lingk. Galatia', pukul: '20.00 WIB', inganan: 'Kel. M. Silalahi / br. Sinambela (Desa Hutarakyat)', urutan: 2 },
  { id: 'jp3', hari: 'Rabu, 11 Nopember', lingkungan: 'Lingk. Efesus', pukul: '20.00 WIB', inganan: 'Kel. St. M. Simarmata / br. Sitorus (Jl. FL. Tobing)', urutan: 3 },
  { id: 'jp4', hari: 'Kamis, 12 Nopember', lingkungan: 'Lingk. Exaudi', pukul: '20.00 WIB', inganan: 'Kel. J. Sihombing / br. Pasaribu (Gg. Damai)', urutan: 4 },
  { id: 'jp5', hari: 'Kamis, 12 Nopember', lingkungan: 'Lingk. Judika', pukul: '20.00 WIB', inganan: 'Kel. St. J. Nababan / br. Tobing (Komp. Asri)', urutan: 5 },
  { id: 'jp6', hari: 'Kamis, 12 Nopember', lingkungan: 'Lingk. Jeremia', pukul: '20.00 WIB', inganan: 'Kel. T. Simanjuntak / br. Hutapea (Jl. Sidikalang)', urutan: 6 }
];

export const INITIAL_PENGUMUMAN: PengumumanItem[] = [
  {
    id: 'peng1',
    urutan: 1,
    judul: 'Ruas na Tamba (Jemaat Baru)',
    isi: 'Nunga ro jala manolopi gabe ruas ni hurianta: Kel. B. Silalahi / br. Manalu ro sian HKBP Balige Ressort Balige, nuaeng maringanan di Jl. Persada No. 12 Desa Hutarakyat, masuk tu Lingkungan Galatia. Tapasahat ma tabe parhahamaranggihon.'
  },
  {
    id: 'peng2',
    urutan: 2,
    judul: 'Tingting Nasorang (Kelahiran)',
    isi: 'Nunga tubu sada anak di Kel. St. P. Sihombing / br. Pasaribu di ari Kamis 29 Oktober 2026 di RSUD Sidikalang. Dakdanak dohot inana hipas. Tapasahat ma hamauliateon tu Debata.'
  },
  {
    id: 'peng3',
    urutan: 3,
    judul: 'Tukar Mimbar Pelayan Se-Distrik VI Dairi',
    isi: 'Di ari Minggu na naeng ro (15 Nopember 2026), masa do program Tukar Mimbar Parhalado Se-Distrik VI Dairi. Amang Pendeta Ressort hutaraja marjamita tu HKBP Sidikalang I, jala na marjamita di hurianta ima Amang Pdt. K. Bakkara, S.Th sian HKBP Sumbul.'
  },
  {
    id: 'peng4',
    urutan: 4,
    judul: 'Gotong Royong Kebersihan Kompleks Gereja',
    isi: 'Dipotonghon tu sude Parhalado dohot Punguan Ama / Remaja asa rap marroan gotong royong paturehon pekarangan ni garejanta di ari Sabtu 14 Nopember 2026 pukul 07.30 WIB.'
  }
];

export const INITIAL_PELEAN_TAON: PeleanTaonItem[] = [
  { id: 'pt1', nama: 'Kel. St. R. Sitohang / br. Sinaga', lingkungan: 'Letare', jumlah: 300000, urutan: 1 },
  { id: 'pt2', nama: 'Kel. M. Silalahi / br. Sinambela', lingkungan: 'Galatia', jumlah: 350000, urutan: 2 },
  { id: 'pt3', nama: 'Kel. St. M. Simarmata / br. Sitorus', lingkungan: 'Efesus', jumlah: 400000, urutan: 3 },
  { id: 'pt4', nama: 'Kel. CSt. P. Sihombing / br. Pasaribu', lingkungan: 'Exaudi', jumlah: 300000, urutan: 4 },
  { id: 'pt5', nama: 'Kel. St. J. Nababan / br. Tobing', lingkungan: 'Judika', jumlah: 350000, urutan: 5 }
];

export const INITIAL_HAMAULIATEON: HamauliateonItem[] = [
  {
    id: 'ham1',
    nama: 'Kel. Op. Gorga / br. Manalu',
    rincian: 'Hamauliateon ala masuk gabe ruas di hurianta',
    jumlah: 200000,
    ke_huria: 100000,
    ke_sosial: 100000,
    ke_pembangunan: 0,
    ke_sentralisasi: 0,
    ke_transitori: 0,
    urutan: 1
  },
  {
    id: 'ham2',
    nama: 'Kel. St. P. Sihombing / br. Pasaribu',
    rincian: 'Hamauliateon ala hipas dakdanak na tubu',
    jumlah: 500000,
    ke_huria: 250000,
    ke_sosial: 100000,
    ke_pembangunan: 150000,
    ke_sentralisasi: 0,
    ke_transitori: 0,
    urutan: 2
  },
  {
    id: 'ham3',
    nama: 'NN (Ruas Lingk. Letare)',
    rincian: 'Hamauliateon ala malum sian sahit',
    jumlah: 300000,
    ke_huria: 150000,
    ke_sosial: 150000,
    ke_pembangunan: 0,
    ke_sentralisasi: 0,
    ke_transitori: 0,
    urutan: 3
  },
  {
    id: 'ham4',
    nama: 'Kel. Daniel Kevin Sitohang',
    rincian: 'Hamauliateon dapot karejo di Medan',
    jumlah: 250000,
    ke_huria: 150000,
    ke_sosial: 0,
    ke_pembangunan: 100000,
    ke_sentralisasi: 0,
    ke_transitori: 0,
    urutan: 4
  }
];

export const INITIAL_PENGELUARAN: PengeluaranItem[] = [
  { id: 'pengel1', urutan: 1, uraian: 'Transport Parjamita & Organis Sesi 1 & 2', huria: 600000, sosial: 0, pembangunan: 0, transitori: 0 },
  { id: 'pengel2', urutan: 2, uraian: 'Listrik & PDAM Gedung Gereja & Pastori', huria: 485000, sosial: 0, pembangunan: 0, transitori: 0 },
  { id: 'pengel3', urutan: 3, uraian: 'Fotocopy & Kertas Warta Jemaat (A4)', huria: 140000, sosial: 0, pembangunan: 0, transitori: 0 },
  { id: 'pengel4', urutan: 4, uraian: 'Konsumsi Rapat Parhalado & Sermon', huria: 220000, sosial: 0, pembangunan: 0, transitori: 0 },
  { id: 'pengel5', urutan: 5, uraian: 'Tali Asih tu Ruas na Marsahit di RSUD', huria: 0, sosial: 500000, pembangunan: 0, transitori: 0 },
  { id: 'pengel6', urutan: 6, uraian: 'Belanja Semen & Cat Pemugaran Pagar Gereja', huria: 0, sosial: 0, pembangunan: 1250000, pembangunan_huria: 1250000 } as any,
  { id: 'pengel7', urutan: 7, uraian: 'Distribusi Paket Kasih Bencana Alam (Transitori)', huria: 0, sosial: 0, pembangunan: 0, transitori: 500000 }
];

// Build Penerimaan rows from Master Kategori Penerimaan (customizable by admin)
export function createDefaultPenerimaanRows(
  peleanTaonTotal = 1700000,
  hamauliateonTotal = 1250000,
  hamauliateonItems?: HamauliateonItem[],
  customMaster?: KategoriPenerimaanMaster[],
  useSampleAmounts = true
): PenerimaanRow[] {
  const masterList =
    customMaster && customMaster.length > 0 ? customMaster : MASTER_KATEGORI_PENERIMAAN;
  const hamList = hamauliateonItems !== undefined ? hamauliateonItems : useSampleAmounts ? INITIAL_HAMAULIATEON : [];
  const hamTotals = calculateHamauliateonTotals(hamList);

  const sampleAmounts: Record<string, number> = {
    // 1.1 PERSEMBAHAN KEBAKTIAN UMUM
    PEL_SKM: 420000,
    PEL_1A_SESI1: 1150000,
    PEL_1B_SESI1: 850000,
    PEL_2A_SESI1: 940000,
    KAS_SOS_SESI1: 320000,
    PEL_1A_SESI2: 1320000,
    PEL_1B_SESI2: 980000,
    PEL_2A_SESI2: 1080000,
    KAS_SOS_SESI2: 380000,
    PEL_KEB_UMUM_LAIN: 150000,

    // 1.2 PERSEMBAHAN LAINNYA
    PEL_PART_LETARE: 285000,
    PEL_PART_EXAUDI: 270000,
    PEL_PART_JUDIKA: 310000,
    PEL_PART_GALATIA: 295000,
    PEL_PART_EFESUS: 260000,
    PEL_PART_JEREMIA: 240000,
    PEL_PHD_AMA_IMMANUEL: 180000,
    PEL_PHD_AMA_ESTOMIHI: 165000,
    PEL_PHD_INA_KAMIS: 210000,
    PEL_PHD_INA_ESTER: 195000,
    PEL_PHD_INA_SION: 185000,
    PEL_PHD_LANSIA: 150000,
    PEL_PHD_RENA: 175000,
    PEL_PART_KELUARGA: 350000,
    PEL_TAON: peleanTaonTotal,
    PEL_PERPULUHAN: 500000,
    HAM_LAIN: hamTotals.totalJumlah || hamauliateonTotal,

    // 1.3 PENERIMAAN TRANSITORI
    TRANS_PENDETA: 200000,
    TRANS_BIBELVROW: 150000,
    TRANS_PARHALADO: 100000,
    TRANS_LINGK_LETARE: 0,
    TRANS_LINGK_EXAUDI: 0,
    TRANS_LINGK_JUDIKA: 0,
    TRANS_LINGK_GALATIA: 0,
    TRANS_LINGK_EFESUS: 0,
    TRANS_LINGK_JEREMIA: 0,
    TRANS_AMA_IMMANUEL: 0,
    TRANS_AMA_ESTOMIHI: 0,
    TRANS_INA_KAMIS: 0,
    TRANS_INA_ESTER: 0,
    TRANS_INA_SION: 0,
    TRANS_LANSIA: 0,
    TRANS_REMAJA_NAPOSO: 0,
    TRANS_SIKKOLA_MINGGU: 0,
    TRANS_TIM_MUSIK: 0,
    TRANS_SONG_LEADER: 0,
    TRANS_GURU_SKM: 0
  };

  return [...masterList]
    .sort((a, b) => (a.urutan || 0) - (b.urutan || 0))
    .map((k, idx) => {
      if (k.kode === 'HAM_LAIN' || k.no_tampilan === '1.2.17') {
        const isHamSentral = k.is_sentralisasi !== undefined ? k.is_sentralisasi : true;
        const hamRowTotals = calculateHamauliateonTotals(hamList, isHamSentral);
        return {
          id: `pen-${k.kode}`,
          kategori_id: k.id,
          kode: k.kode,
          kelompok: k.kelompok,
          no_tampilan: k.no_tampilan,
          urutan: k.urutan ?? idx + 1,
          uraian: k.uraian,
          aturan_alokasi: 'manual',
          is_sentralisasi: isHamSentral,
          dialihkan_ke_pembangunan: false,
          jumlah: useSampleAmounts ? hamRowTotals.totalJumlah : hamauliateonTotal || hamRowTotals.totalJumlah,
          huria_45: hamRowTotals.totalHuria,
          sosial: hamRowTotals.totalSosial,
          pembangunan: hamRowTotals.totalPembangunan,
          sentral_55: hamRowTotals.totalSentral,
          transitori: hamRowTotals.totalTransitori
        };
      }

      let jumlah = 0;
      if (k.kode === 'PEL_TAON' || k.no_tampilan === '1.2.15') {
        jumlah = useSampleAmounts ? peleanTaonTotal : peleanTaonTotal || 0;
      } else if (useSampleAmounts) {
        jumlah = sampleAmounts[k.kode] ?? 0;
      }

      const isSentral =
        k.is_sentralisasi !== undefined ? k.is_sentralisasi : k.aturan_alokasi === 'split_45_55';
      const dist = calculateRowAlokasi(jumlah, k.aturan_alokasi, k.dialihkan_ke_pembangunan, isSentral);
      return {
        id: `pen-${k.kode}`,
        kategori_id: k.id,
        kode: k.kode,
        kelompok: k.kelompok,
        no_tampilan: k.no_tampilan,
        urutan: k.urutan ?? idx + 1,
        uraian: k.uraian,
        aturan_alokasi: k.aturan_alokasi,
        is_sentralisasi: isSentral,
        dialihkan_ke_pembangunan: k.dialihkan_ke_pembangunan,
        jumlah,
        ...dist
      };
    });
}

export function buildPengeluaranItemFromMaster(
  item: KategoriPengeluaranMaster,
  urutan: number,
  wartaId?: string
): PengeluaranItem {
  return {
    id: `pengel-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    warta_id: wartaId,
    kode: item.kode,
    urutan,
    uraian: item.uraian,
    is_sentralisasi: Boolean(item.is_sentralisasi),
    sentralisasi: 0,
    huria: 0,
    sosial: 0,
    pembangunan: 0,
    transitori: 0
  };
}

/**
 * Generate full sample warta with complete 3 pages
 */
export function getInitialFullWarta(): FullWartaData {
  const peleanTaonSum = INITIAL_PELEAN_TAON.reduce((acc, cur) => acc + cur.jumlah, 0);
  const hamauliateonSum = INITIAL_HAMAULIATEON.reduce((acc, cur) => acc + cur.jumlah, 0);

  const penerimaan = createDefaultPenerimaanRows(peleanTaonSum, hamauliateonSum, INITIAL_HAMAULIATEON);
  const acara_minggu: AcaraIbadahItem[] = DEFAULT_ACARA_MINGGU_TEMPLATE.map((it, idx) => ({
    id: `am-${idx + 1}`,
    jenis: 'minggu',
    urutan: idx + 1,
    uraian: it.uraian,
    keterangan: it.keterangan
  }));

  const acara_partangiangan: AcaraIbadahItem[] = DEFAULT_ACARA_PARTANGIANGAN_TEMPLATE.map((it, idx) => ({
    id: `ap-${idx + 1}`,
    jenis: 'partangiangan',
    urutan: idx + 1,
    uraian: it.uraian,
    keterangan: it.keterangan
  }));

  const cleanPengeluaran: PengeluaranItem[] = INITIAL_PENGELUARAN.map((p, idx) => ({
    id: p.id,
    urutan: idx + 1,
    uraian: p.uraian,
    huria: p.huria || 0,
    sosial: p.sosial || 0,
    pembangunan: (p as any).pembangunan_huria || p.pembangunan || 0,
    transitori: p.transitori || 0
  }));

  const ulangTahun = getUlangTahunMingguIni(SAMPLE_ANGGOTA, INITIAL_WARTA_RECORD.tanggal_minggu);
  const rekapitulasi = calculateRekapitulasi(INITIAL_WARTA_RECORD, penerimaan, cleanPengeluaran);

  return {
    warta: INITIAL_WARTA_RECORD,
    acara_minggu,
    acara_partangiangan,
    parhobas: INITIAL_PARHOBAS,
    sopo_godang: INITIAL_SOPO_GODANG,
    jadwal_partangiangan: INITIAL_JADWAL_PARTANGIANGAN,
    pengumuman: INITIAL_PENGUMUMAN,
    penerimaan,
    pelean_taon: INITIAL_PELEAN_TAON,
    hamauliateon: INITIAL_HAMAULIATEON,
    pengeluaran: cleanPengeluaran,
    ulang_tahun: ulangTahun,
    rekapitulasi
  };
}
