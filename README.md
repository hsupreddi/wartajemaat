# Warta Jemaat HKBP Ressort Hutaraja (Distrik VI Dairi)

Sistem Digital Penyusunan, Manajemen, Pratinjau, Cetak A4, dan Portal Publik Warta Jemaat HKBP Ressort Hutaraja, Distrik VI Dairi (Jl. Persada No. 205 Desa Hutarakyat, Kec. Sidikalang).

Aplikasi ini mendigitalkan alur mingguan manual gereja (Word/PDF) menjadi format digital terstruktur dengan pembagian tugas hierarkis, otomasi pembagian keuangan huria & sentralisasi (45%/55%), penarikan otomatis ulang tahun jemaat, dan pratinjau cetak A4 3-halaman persis standar Huria Kristen Batak Protestan.

---

## Fitur Utama

### 1. Halaman 1: Tata Ibadah & Panghobasion
- **Kop Surat Huria Resmi**: Dilengkapi logo Salib HKBP & logo Transformasi HKBP 2024-2028 (Roma 12:2), SK Pengakuan Pemerintah, dan identitas Ressort Hutaraja.
- **Sidebar Panghobasion ni Huria**: Jadwal tetap Ibadah Minggu, Partangiangan Wijk, Punguan Kategorial (Ina, Ama, Lansia, Naposo), dan Kemajelisan.
- **Acara Ibadah Minggu & Partangiangan Dinamis**: Tambah, hapus, urutkan butir liturgi (Marende BE/BN, Votum, Patik, Manopoti Dosa, Epistel, Manghatindanghon Haporseaon, Koor, Jamita, Tangiang, Offerium) dengan keterangan liturgis (Jongjong, Pel 1a/1b/2).
- **Parhobas Minggu (6 Baris × 3 Sesi)**: Jamita, Agenda, Tinting, Pelean, Organis, Harentaon untuk Sekolah Minggu, Sesi 1 (Pagi 08.30 WIB), dan Sesi 2 (Siang 10.30 WIB).
- **Statistik Ruas na Ro Marminggu**: Jumlah jemaat hadir Sekolah Minggu, Pagi, dan Siang.
- **Na Markoor Sadari On & Daftar Pemakai Sopo Godang**.

### 2. Halaman 2: Tinting Namarragam
- **Goar ni Minggu & Topik**: Penamaan minggu liturgi (misal: *Invocavit*, *Reminiscere*, *Okuli*, *Laetare*, *Judika*, *Palmarum*, *Paska*, *Trinitatis*).
- **Penarikan Otomatis Ulang Tahun Jemaat**: Menghitung otomatis usia dan menyaring anggota gereja yang berulang tahun pada periode Senin–Minggu warta terkait dari database ruas. Dilengkapi teks berkat Jesayas 40:31.
- **Jadwal Koor Minggu Depan & Jadwal Partangiangan Wijk**: Tabel lingkungan, hari, pukul, dan keluarga tuan rumah (*inganan partangiangan*).
- **Pengumuman Dinamis & Template**: Tingting Nasorang (Kelahiran), Ruas na Tamba (Jemaat Baru), Tardidi, Naek Sidi, Pamasumasuon (Pernikahan), Ulaon Na Badia, Tukar Mimbar Distrik, dan Diakonia Sosial.

### 3. Halaman 3: Tinting Parhepengon (Laporan Keuangan)
- **Tabel 28 Baris Master Penerimaan**: Alokasi otomatis:
  - `split_45_55`: 45% Kas Huria, 55% Sentralisasi Hatopan (dibulatkan)
  - `pembangunan`: 100% Pembangunan Huria (misal: Pel 1b)
  - `sosial`: 100% Kas Sosial Huria
  - `huria`: 100% Huria
  - `transitori`: 100% Transitori
- **Daftar Pelean Taon**: Rincian nama keluarga, wijk, nominal, dan langsung terhubung mengisi baris Pelean Taon di tabel utama.
- **Daftar Hamauliateon (Ucapan Syukur)**: Rincian nama, doa syukur, dan nominal.
- **Laporan Pengeluaran**: Pencatatan rincian belanja Huria, Sosial, Pembangunan, dan Transitori.
- **Rekapitulasi Saldo 5 Kolom Dana**:
  - Huria, Sosial, Pembangunan, Sentralisasi 55%, Transitori.
  - Saldo Awal ditarik otomatis dari Saldo Akhir warta minggu sebelumnya.
  - Validasi otomatis keseimbangan debet/kredit dengan indikator balance.
  - Teks penutup resmi Batak Toba sesuai tata laksana huria.

### 4. Cetak Presisi A4 & Publikasi
- **Mode Cetak A4**: Layout 3 halaman proporsional dengan CSS `@media print` presisi tanpa terpotong.
- **Akses Publik**: Jemaat dapat membaca warta berstatus `published` dari smartphone atau komputer tanpa perlu login.

---

## Pengguna & Hak Akses (Role-Based Access Control)

| Role | Hak Akses |
|---|---|
| **Admin** | Akses penuh: kelola akun pengurus, master jadwal tetap, master lingkungan, master kategori, pengaturan kop surat & logo. |
| **Sekretaris** | Mengelola Warta, Tata Ibadah, Parhobas, Tinting Namarragam, Jadwal Partangiangan, Pengumuman, dan data Ruas. |
| **Bendahara** | Mengelola Tinting Parhepengon (Penerimaan, Pelean Taon, Hamauliateon, Pengeluaran, Rekapitulasi). |
| **Publik (Anonim)** | Hanya dapat membaca dan mencetak warta yang berstatus **Published**. |

---

## Petunjuk Instalasi & Menghubungkan Supabase

### 1. Buat Project di Supabase
1. Buka [Supabase](https://supabase.com/) dan buat project baru.
2. Buka menu **SQL Editor**, buka file `supabase/schema.sql` dari repositori ini, lalu jalankan query untuk membuat seluruh tabel, enum, RLS policy, trigger, dan master data.

### 2. Konfigurasi Environment Variables
Salin `.env.example` menjadi `.env.local`:
```bash
cp .env.example .env.local
```
Isi variabel dengan kredensial dari dashboard Supabase (**Project Settings > API**):
```env
VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUz...
```

*Catatan: Aplikasi ini juga menyediakan **Demo Mode / Local Offline Store** otomatis dengan data autentik HKBP Ressort Hutaraja, sehingga siap diuji coba langsung bahkan sebelum URL Supabase dipasang.*

### 3. Menjalankan Server Lokal
```bash
npm install
npm run dev
```
Buka browser di `http://localhost:3000`.

---

## Deployment ke Vercel

Proyek ini telah dilengkapi dengan `vercel.json` untuk SPA routing:
1. Hubungkan repository GitHub ke Vercel.
2. Tambahkan Environment Variables `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY` di project settings Vercel.
3. Klik **Deploy**.
