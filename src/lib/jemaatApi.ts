import { isSupabaseConfigured, supabase } from './supabase';
import {
  Keluarga,
  Anggota,
  CalonSidi,
  StatistikWijk,
  UlangTahunItem,
  UlangTahunRpcResult
} from '../types';

export type NotificationType = 'success' | 'error' | 'info' | 'warning';
export type NotificationHandler = (type: NotificationType, message: string) => void;

let globalNotificationHandler: NotificationHandler | null = null;

export function setJemaatNotificationHandler(handler: NotificationHandler | null) {
  globalNotificationHandler = handler;
}

export function notify(type: NotificationType, message: string) {
  if (globalNotificationHandler) {
    globalNotificationHandler(type, message);
  } else {
    // Fallback console log with readable prefix
    if (type === 'error') {
      console.error(`[Jemaat API Error]: ${message}`);
    } else {
      console.log(`[Jemaat API ${type}]: ${message}`);
    }
  }
}

/**
 * Storage keys for Demo / Local Mode persistence
 */
const JEMAAT_STORAGE_KEYS = {
  KELUARGA: 'hkbp_jemaat_keluarga_v2',
  ANGGOTA: 'hkbp_jemaat_anggota_v2'
};

/**
 * Anonymous Demo Dataset (Digunakan hanya jika Supabase belum terkonfigurasi)
 * Tanpa data jemaat asli.
 */
const INITIAL_DEMO_KELUARGA: Keluarga[] = [
  { registrasi: '0101', wijk: 'Lingkungan Letare', nama_kk: 'Keluarga Contoh A', kk_wafat: false, jalan: 'Jl. Persada No. 10', hp: '0812-0000-0001', jumlah_anggota: 4 },
  { registrasi: '0102', wijk: 'Lingkungan Letare', nama_kk: 'Keluarga Contoh B', kk_wafat: false, jalan: 'Jl. Persada No. 14', hp: '0812-0000-0002', jumlah_anggota: 3 },
  { registrasi: '0201', wijk: 'Lingkungan Galatia', nama_kk: 'Keluarga Contoh C', kk_wafat: false, jalan: 'Desa Hutarakyat No. 5', hp: '0812-0000-0003', jumlah_anggota: 5 },
  { registrasi: '0202', wijk: 'Lingkungan Galatia', nama_kk: 'Keluarga Contoh D', kk_wafat: false, jalan: 'Desa Hutarakyat No. 8', hp: '0812-0000-0004', jumlah_anggota: 2 },
  { registrasi: '0301', wijk: 'Lingkungan Efesus', nama_kk: 'Keluarga Contoh E', kk_wafat: false, jalan: 'Jl. FL. Tobing No. 22', hp: '0812-0000-0005', jumlah_anggota: 4 },
  { registrasi: '0401', wijk: 'Lingkungan Exaudi', nama_kk: 'Keluarga Contoh F', kk_wafat: false, jalan: 'Gg. Damai No. 3', hp: '0812-0000-0006', jumlah_anggota: 3 },
  { registrasi: '0501', wijk: 'Lingkungan Judika', nama_kk: 'Keluarga Contoh G', kk_wafat: false, jalan: 'Kompleks Asri No. 1', hp: '0812-0000-0007', jumlah_anggota: 4 },
  { registrasi: '0601', wijk: 'Lingkungan Jeremia', nama_kk: 'Keluarga Contoh H', kk_wafat: false, jalan: 'Jl. Sidikalang No. 88', hp: '0812-0000-0008', jumlah_anggota: 3 }
];

const INITIAL_DEMO_ANGGOTA: Anggota[] = [
  // Letare (with birthdays in 2-8 Nov 2026 week)
  { id: 'ang-d-1', registrasi: '0101', nama: 'St. Ramses Sitohang', jenis_kelamin: 'L', tgl_lahir: '1970-11-02', tgl_baptis: '1970-12-25', tgl_sidi: '1987-04-12', hub_keluarga: 'Kepala Keluarga', wijk: 'Lingkungan Letare', aktif: true },
  { id: 'ang-d-2', registrasi: '0101', nama: 'Ny. Sitohang br. Sinaga', jenis_kelamin: 'P', tgl_lahir: '1974-11-03', tgl_baptis: '1975-01-01', tgl_sidi: '1990-04-10', hub_keluarga: 'Istri', wijk: 'Lingkungan Letare', aktif: true },
  { id: 'ang-d-3', registrasi: '0101', nama: 'Daniel Kevin Sitohang', jenis_kelamin: 'L', tgl_lahir: '2004-11-04', tgl_baptis: '2005-01-09', tgl_sidi: '2021-05-23', hub_keluarga: 'Anak', wijk: 'Lingkungan Letare', aktif: true },
  { id: 'ang-d-4', registrasi: '0101', nama: 'Grace Maria Sitohang', jenis_kelamin: 'P', tgl_lahir: '2010-09-15', tgl_baptis: '2010-11-20', tgl_sidi: null, hub_keluarga: 'Anak', wijk: 'Lingkungan Letare', aktif: true },

  // Galatia
  { id: 'ang-d-5', registrasi: '0201', nama: 'Bona Tua Silalahi', jenis_kelamin: 'L', tgl_lahir: '1982-11-05', tgl_baptis: '1983-01-01', tgl_sidi: '1998-05-15', hub_keluarga: 'Kepala Keluarga', wijk: 'Lingkungan Galatia', aktif: true },
  { id: 'ang-d-6', registrasi: '0201', nama: 'Ny. Silalahi br. Manalu', jenis_kelamin: 'P', tgl_lahir: '1985-11-05', tgl_baptis: '1986-02-02', tgl_sidi: '2001-04-18', hub_keluarga: 'Istri', wijk: 'Lingkungan Galatia', aktif: true },
  { id: 'ang-d-7', registrasi: '0201', nama: 'Yosua Pratama Silalahi', jenis_kelamin: 'L', tgl_lahir: '2010-04-10', tgl_baptis: '2010-06-12', tgl_sidi: null, hub_keluarga: 'Anak', wijk: 'Lingkungan Galatia', aktif: true },
  { id: 'ang-d-8', registrasi: '0202', nama: 'Jonathan Silalahi', jenis_kelamin: 'L', tgl_lahir: '2009-08-20', tgl_baptis: '2009-10-10', tgl_sidi: null, hub_keluarga: 'Anak', wijk: 'Lingkungan Galatia', aktif: true }, // Calon Sidi

  // Efesus
  { id: 'ang-d-9', registrasi: '0301', nama: 'St. Marudut Simarmata', jenis_kelamin: 'L', tgl_lahir: '1965-11-06', tgl_baptis: '1966-01-10', tgl_sidi: '1982-04-04', hub_keluarga: 'Kepala Keluarga', wijk: 'Lingkungan Efesus', aktif: true },
  { id: 'ang-d-10', registrasi: '0301', nama: 'Ruth Yohana br. Simarmata', jenis_kelamin: 'P', tgl_lahir: '2001-11-07', tgl_baptis: '2002-01-05', tgl_sidi: '2018-05-20', hub_keluarga: 'Anak', wijk: 'Lingkungan Efesus', aktif: true },
  { id: 'ang-d-11', registrasi: '0301', nama: 'Gabriel Simarmata', jenis_kelamin: 'L', tgl_lahir: '2010-01-12', tgl_baptis: '2010-03-14', tgl_sidi: null, hub_keluarga: 'Anak', wijk: 'Lingkungan Efesus', aktif: true }, // Calon Sidi

  // Exaudi
  { id: 'ang-d-12', registrasi: '0401', nama: 'CSt. Parlindungan Sihombing', jenis_kelamin: 'L', tgl_lahir: '1978-11-08', tgl_baptis: '1979-01-01', tgl_sidi: '1995-04-20', hub_keluarga: 'Kepala Keluarga', wijk: 'Lingkungan Exaudi', aktif: true },
  { id: 'ang-d-13', registrasi: '0401', nama: 'Debora Gloria Sihombing', jenis_kelamin: 'P', tgl_lahir: '2012-11-08', tgl_baptis: '2013-02-10', tgl_sidi: null, hub_keluarga: 'Anak', wijk: 'Lingkungan Exaudi', aktif: true },
  { id: 'ang-d-14', registrasi: '0401', nama: 'Samuel Sihombing', jenis_kelamin: 'L', tgl_lahir: '2009-11-15', tgl_baptis: '2010-01-01', tgl_sidi: null, hub_keluarga: 'Anak', wijk: 'Lingkungan Exaudi', aktif: true }, // Calon Sidi

  // Judika
  { id: 'ang-d-15', registrasi: '0501', nama: 'St. Jansen Nababan', jenis_kelamin: 'L', tgl_lahir: '1968-11-02', tgl_baptis: '1969-01-01', tgl_sidi: '1985-04-14', hub_keluarga: 'Kepala Keluarga', wijk: 'Lingkungan Judika', aktif: true },
  { id: 'ang-d-16', registrasi: '0501', nama: 'Ny. Nababan br. Lumbantobing', jenis_kelamin: 'P', tgl_lahir: '1972-11-07', tgl_baptis: '1973-02-02', tgl_sidi: '1989-04-10', hub_keluarga: 'Istri', wijk: 'Lingkungan Judika', aktif: true },
  { id: 'ang-d-17', registrasi: '0501', nama: 'Lydia br. Nababan', jenis_kelamin: 'P', tgl_lahir: null, tgl_baptis: '2015-05-10', tgl_sidi: null, hub_keluarga: 'Anak', wijk: 'Lingkungan Judika', aktif: true }, // Example of nullable tgl_lahir

  // Jeremia
  { id: 'ang-d-18', registrasi: '0601', nama: 'Samuel Andrew Simanjuntak', jenis_kelamin: 'L', tgl_lahir: '2008-11-04', tgl_baptis: '2009-01-01', tgl_sidi: '2024-05-19', hub_keluarga: 'Anak', wijk: 'Lingkungan Jeremia', aktif: true }
];

// Helper to get demo keluarga from local storage
function getLocalDemoKeluarga(): Keluarga[] {
  try {
    const raw = localStorage.getItem(JEMAAT_STORAGE_KEYS.KELUARGA);
    if (!raw) {
      localStorage.setItem(JEMAAT_STORAGE_KEYS.KELUARGA, JSON.stringify(INITIAL_DEMO_KELUARGA));
      return INITIAL_DEMO_KELUARGA;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_DEMO_KELUARGA;
  }
}

function saveLocalDemoKeluarga(list: Keluarga[]) {
  try {
    localStorage.setItem(JEMAAT_STORAGE_KEYS.KELUARGA, JSON.stringify(list));
  } catch (err) {
    console.error('Error saving local demo keluarga', err);
  }
}

// Helper to get demo anggota from local storage
function getLocalDemoAnggota(): Anggota[] {
  try {
    const raw = localStorage.getItem(JEMAAT_STORAGE_KEYS.ANGGOTA);
    if (!raw) {
      localStorage.setItem(JEMAAT_STORAGE_KEYS.ANGGOTA, JSON.stringify(INITIAL_DEMO_ANGGOTA));
      return INITIAL_DEMO_ANGGOTA;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_DEMO_ANGGOTA;
  }
}

function saveLocalDemoAnggota(list: Anggota[]) {
  try {
    localStorage.setItem(JEMAAT_STORAGE_KEYS.ANGGOTA, JSON.stringify(list));
  } catch (err) {
    console.error('Error saving local demo anggota', err);
  }
}

export function computeUlangTahunFromAnggotaList(
  anggotaList: Pick<Anggota, 'nama' | 'jenis_kelamin' | 'tgl_lahir' | 'wijk' | 'aktif'>[],
  mulaiDateStr: string,
  akhirDateStr: string
): UlangTahunItem[] {
  const dStart = new Date(mulaiDateStr + 'T00:00:00');
  const dEnd = new Date(akhirDateStr + 'T00:00:00');
  if (isNaN(dStart.getTime()) || isNaN(dEnd.getTime())) return [];

  const refYear = dEnd.getFullYear();

  const matchedDates: { month: number; day: number; order: number }[] = [];
  const cur = new Date(dStart);
  let seq = 0;
  while (cur <= dEnd && seq < 40) {
    matchedDates.push({ month: cur.getMonth() + 1, day: cur.getDate(), order: seq++ });
    cur.setDate(cur.getDate() + 1);
  }

  const results: {
    nama: string;
    jenis_kelamin: 'L' | 'P';
    tanggal_lahir: string;
    dayOrder: number;
    dayMonthStr: string;
    usia: number;
    wijk: string;
  }[] = [];

  for (const m of anggotaList) {
    if (m.aktif === false || !m.tgl_lahir) continue;
    const parts = String(m.tgl_lahir).split('-').map(Number);
    if (parts.length < 3 || isNaN(parts[0]) || isNaN(parts[1]) || isNaN(parts[2])) continue;
    const [bYear, bMonth, bDay] = parts;

    const match = matchedDates.find((md) => md.month === bMonth && md.day === bDay);
    if (match) {
      let usia = refYear - bYear;
      const hadBirthday =
        dEnd.getMonth() + 1 > bMonth || (dEnd.getMonth() + 1 === bMonth && dEnd.getDate() >= bDay);
      if (!hadBirthday) usia -= 1;

      results.push({
        nama: m.nama,
        jenis_kelamin: m.jenis_kelamin === 'P' ? 'P' : 'L',
        tanggal_lahir: m.tgl_lahir,
        dayOrder: match.order,
        dayMonthStr: `${String(bDay).padStart(2, '0')}/${String(bMonth).padStart(2, '0')}`,
        usia: Math.max(1, usia),
        wijk: m.wijk || '-'
      });
    }
  }

  results.sort((a, b) => a.dayOrder - b.dayOrder || a.nama.localeCompare(b.nama));

  return results.map((r, idx) => ({
    no: idx + 1,
    nama: r.nama,
    jenis_kelamin: r.jenis_kelamin,
    tanggal_lahir: r.tanggal_lahir,
    hari_bulan: r.dayMonthStr,
    usia: r.usia,
    wijk: r.wijk
  }));
}

/**
 * 1. GET ULANG TAHUN PERIODE
 * Memanggil Supabase RPC 'ulang_tahun_periode(p_mulai, p_akhir)', atau membaca tabel 'anggota'
 * secara langsung jika RPC belum terpasang di Supabase. Fallback demo jika belum terkonfigurasi.
 */
export async function getUlangTahun(mulaiDateStr: string, akhirDateStr: string): Promise<UlangTahunItem[]> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase.rpc('ulang_tahun_periode', {
        p_mulai: mulaiDateStr,
        p_akhir: akhirDateStr
      });

      if (!error && data && Array.isArray(data)) {
        return (data as UlangTahunRpcResult[]).map((r, idx) => {
          let dayMonthStr = '-';
          if (r.tgl_lahir) {
            const parts = r.tgl_lahir.split('-');
            if (parts.length >= 3) {
              dayMonthStr = `${parts[2]}/${parts[1]}`;
            }
          }
          return {
            no: idx + 1,
            nama: r.nama,
            jenis_kelamin: r.jenis_kelamin,
            tanggal_lahir: r.tgl_lahir || '',
            hari_bulan: dayMonthStr,
            usia: r.usia || 0,
            wijk: r.wijk
          };
        });
      }

      // Fallback langsung ke query tabel anggota Supabase jika RPC error / belum dipasang
      const { data: anggotaRows, error: tblErr } = await supabase
        .from('anggota')
        .select('nama, jenis_kelamin, tgl_lahir, wijk, aktif')
        .eq('aktif', true)
        .not('tgl_lahir', 'is', null);

      if (!tblErr && Array.isArray(anggotaRows)) {
        return computeUlangTahunFromAnggotaList(
          anggotaRows as Pick<Anggota, 'nama' | 'jenis_kelamin' | 'tgl_lahir' | 'wijk' | 'aktif'>[],
          mulaiDateStr,
          akhirDateStr
        );
      }

      if (error) {
        notify('error', `Gagal memuat ulang tahun dari database: ${error.message}`);
        throw error;
      }
    } catch (err: any) {
      notify('warning', `Beralih ke mode demo untuk tabel ulang tahun: ${err?.message || 'Koneksi gagal'}`);
    }
  }

  // Fallback demo calculation
  return computeUlangTahunFromAnggotaList(getLocalDemoAnggota(), mulaiDateStr, akhirDateStr);
}

/**
 * 2. LIST KELUARGA
 * Filter wijk, pencarian query q (nama_kk, registrasi, jalan), dan pagination
 */
export async function listKeluarga(params?: {
  wijk?: string;
  q?: string;
  page?: number;
  limit?: number;
}): Promise<{ data: Keluarga[]; totalCount: number; isDemo: boolean }> {
  const page = params?.page || 1;
  const limit = params?.limit || 50;
  const offset = (page - 1) * limit;

  if (isSupabaseConfigured && supabase) {
    try {
      let query = supabase.from('keluarga').select('*', { count: 'exact' });

      if (params?.wijk && params.wijk !== 'all') {
        query = query.eq('wijk', params.wijk);
      }
      if (params?.q && params.q.trim()) {
        const term = `%${params.q.trim()}%`;
        query = query.or(`nama_kk.ilike.${term},registrasi.ilike.${term},jalan.ilike.${term}`);
      }

      query = query.order('registrasi', { ascending: true }).range(offset, offset + limit - 1);

      const { data, error, count } = await query;
      if (error) {
        notify('error', `Gagal memuat data keluarga dari Supabase: ${error.message}`);
        throw error;
      }

      return {
        data: (data as Keluarga[]) || [],
        totalCount: count || 0,
        isDemo: false
      };
    } catch (err: any) {
      notify('warning', `Beralih ke mode demo data keluarga: ${err?.message || 'Koneksi gagal'}`);
    }
  }

  // Local demo fallback
  let list = getLocalDemoKeluarga();
  if (params?.wijk && params.wijk !== 'all') {
    list = list.filter((k) => k.wijk === params.wijk);
  }
  if (params?.q && params.q.trim()) {
    const s = params.q.trim().toLowerCase();
    list = list.filter(
      (k) =>
        k.nama_kk.toLowerCase().includes(s) ||
        k.registrasi.toLowerCase().includes(s) ||
        (k.jalan && k.jalan.toLowerCase().includes(s))
    );
  }

  const totalCount = list.length;
  const paginated = list.slice(offset, offset + limit);

  return {
    data: paginated,
    totalCount,
    isDemo: true
  };
}

/**
 * 3. LIST ANGGOTA
 * Filter wijk, pencarian query q (nama, registrasi), dan pagination 50 baris
 */
export async function listAnggota(params?: {
  wijk?: string;
  q?: string;
  page?: number;
  limit?: number;
  registrasi?: string;
}): Promise<{ data: Anggota[]; totalCount: number; isDemo: boolean }> {
  const page = params?.page || 1;
  const limit = params?.limit || 50;
  const offset = (page - 1) * limit;

  if (isSupabaseConfigured && supabase) {
    try {
      let query = supabase.from('anggota').select('*', { count: 'exact' });

      if (params?.registrasi) {
        query = query.eq('registrasi', params.registrasi);
      }
      if (params?.wijk && params.wijk !== 'all') {
        query = query.eq('wijk', params.wijk);
      }
      if (params?.q && params.q.trim()) {
        const term = `%${params.q.trim()}%`;
        query = query.or(`nama.ilike.${term},registrasi.ilike.${term}`);
      }

      query = query.order('registrasi', { ascending: true }).order('nama', { ascending: true }).range(offset, offset + limit - 1);

      const { data, error, count } = await query;
      if (error) {
        notify('error', `Gagal memuat data anggota dari Supabase: ${error.message}`);
        throw error;
      }

      return {
        data: (data as Anggota[]) || [],
        totalCount: count || 0,
        isDemo: false
      };
    } catch (err: any) {
      notify('warning', `Beralih ke mode demo data anggota: ${err?.message || 'Koneksi gagal'}`);
    }
  }

  // Local demo fallback
  let list = getLocalDemoAnggota();
  if (params?.registrasi) {
    list = list.filter((a) => a.registrasi === params.registrasi);
  }
  if (params?.wijk && params.wijk !== 'all') {
    list = list.filter((a) => a.wijk === params.wijk);
  }
  if (params?.q && params.q.trim()) {
    const s = params.q.trim().toLowerCase();
    list = list.filter((a) => a.nama.toLowerCase().includes(s) || a.registrasi.toLowerCase().includes(s));
  }

  const totalCount = list.length;
  const paginated = list.slice(offset, offset + limit);

  return {
    data: paginated,
    totalCount,
    isDemo: true
  };
}

/**
 * 4. GET CALON SIDI
 * Membaca dari view 'v_calon_sidi'
 */
export async function getCalonSidi(): Promise<{ data: CalonSidi[]; isDemo: boolean }> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase.from('v_calon_sidi').select('*');
      if (error) {
        notify('error', `Gagal memuat view calon sidi: ${error.message}`);
        throw error;
      }
      return { data: (data as CalonSidi[]) || [], isDemo: false };
    } catch (err: any) {
      notify('warning', `Beralih ke mode demo calon sidi: ${err?.message || 'Koneksi gagal'}`);
    }
  }

  // Demo calculation: Anggota usia 14 s/d 18 tahun yang belum sidi
  const anggota = getLocalDemoAnggota();
  const currentYear = new Date().getFullYear();
  const calon: CalonSidi[] = [];

  for (const a of anggota) {
    if (!a.aktif || a.tgl_sidi) continue;
    let usia = 0;
    if (a.tgl_lahir) {
      const bYear = parseInt(a.tgl_lahir.split('-')[0], 10);
      if (!isNaN(bYear)) {
        usia = currentYear - bYear;
      }
    }
    // Syarat marguru sidi: usia 14-19 tahun atau belum sidi
    if (usia >= 14 && usia <= 20) {
      calon.push({
        id: a.id,
        registrasi: a.registrasi,
        nama: a.nama,
        jenis_kelamin: a.jenis_kelamin,
        tgl_lahir: a.tgl_lahir,
        usia,
        wijk: a.wijk,
        tgl_baptis: a.tgl_baptis,
        hub_keluarga: a.hub_keluarga
      });
    }
  }

  return { data: calon, isDemo: true };
}

/**
 * 5. GET STATISTIK WIJK
 * Membaca dari view 'v_statistik_wijk'
 */
export async function getStatistikWijk(): Promise<{ data: StatistikWijk[]; isDemo: boolean }> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase.from('v_statistik_wijk').select('*');
      if (error) {
        notify('error', `Gagal memuat statistik wijk: ${error.message}`);
        throw error;
      }
      return { data: (data as StatistikWijk[]) || [], isDemo: false };
    } catch (err: any) {
      notify('warning', `Beralih ke mode demo statistik wijk: ${err?.message || 'Koneksi gagal'}`);
    }
  }

  // Demo calculation from local dataset
  const keluargaList = getLocalDemoKeluarga();
  const anggotaList = getLocalDemoAnggota();

  const wijkSet = new Set<string>();
  keluargaList.forEach((k) => k.wijk && wijkSet.add(k.wijk));
  anggotaList.forEach((a) => a.wijk && wijkSet.add(a.wijk));

  const stats: StatistikWijk[] = Array.from(wijkSet).map((wijk) => {
    const wKeluarga = keluargaList.filter((k) => k.wijk === wijk);
    const wAnggota = anggotaList.filter((a) => a.wijk === wijk && a.aktif);
    const laki = wAnggota.filter((a) => a.jenis_kelamin === 'L').length;
    const peremp = wAnggota.filter((a) => a.jenis_kelamin === 'P').length;
    const sidi = wAnggota.filter((a) => Boolean(a.tgl_sidi)).length;

    return {
      wijk,
      jumlah_keluarga: wKeluarga.length,
      total_keluarga: wKeluarga.length,
      jumlah_anggota: wAnggota.length,
      total_anggota: wAnggota.length,
      laki_laki: laki,
      perempuan: peremp,
      sudah_sidi: sidi,
      belum_sidi: wAnggota.length - sidi
    };
  });

  return { data: stats, isDemo: true };
}

function generateEntityUuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // RFC 4122 v4 fallback
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function normalizeDateField(val?: string | null): string | null {
  if (!val) return null;
  const s = String(val).trim();
  if (!s || s === '-' || s.toLowerCase() === 'null') return null;
  const iso = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (iso) {
    return `${iso[1]}-${iso[2].padStart(2, '0')}-${iso[3].padStart(2, '0')}`;
  }
  const dmy = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (dmy) {
    return `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`;
  }
  return s;
}

function formatSupabaseJemaatError(err: any, fallbackPrefix: string): Error {
  const msg = String(err?.message || err || '');
  const lower = msg.toLowerCase();

  if (lower.includes('row-level security')) {
    return new Error(
      `${fallbackPrefix}: Akses ditolak oleh kebijakan RLS Supabase. Pastikan akun Anda masuk dengan role 'admin' atau 'sekretaris' di tabel profiles (jalankan skrip supabase_jemaat.sql di SQL Editor Supabase).`
    );
  }
  if (lower.includes('anggota_registrasi_fkey') || lower.includes('foreign key constraint')) {
    return new Error(
      `${fallbackPrefix}: No. Registrasi KK belum terdaftar di tabel keluarga. Silakan buat data keluarga terlebih dahulu atau aktifkan pembuatan KK otomatis.`
    );
  }
  if (lower.includes('does not exist') && lower.includes('relation')) {
    return new Error(
      `${fallbackPrefix}: Tabel database jemaat belum tersedia di Supabase. Jalankan file supabase_jemaat.sql di Supabase SQL Editor terlebih dahulu.`
    );
  }
  if (lower.includes('invalid input syntax for type date')) {
    return new Error(
      `${fallbackPrefix}: Format tanggal tidak valid. Gunakan format YYYY-MM-DD (contoh: 1995-08-17).`
    );
  }
  return new Error(`${fallbackPrefix}: ${msg || 'Terjadi kesalahan pada database.'}`);
}

export interface KeluargaLookupItem {
  registrasi: string;
  nama_kk: string;
  wijk: string;
}

export async function listAllKeluargaLookup(): Promise<KeluargaLookupItem[]> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('keluarga')
        .select('registrasi, nama_kk, wijk')
        .order('registrasi', { ascending: true })
        .limit(2000);
      if (!error && data) {
        return data as KeluargaLookupItem[];
      }
    } catch {
      // Fallback below if network fails
    }
  }
  return getLocalDemoKeluarga()
    .map((k) => ({ registrasi: k.registrasi, nama_kk: k.nama_kk, wijk: k.wijk }))
    .sort((a, b) => a.registrasi.localeCompare(b.registrasi));
}

function syncLocalDemoKeluargaCount(registrasi: string) {
  const anggota = getLocalDemoAnggota();
  const count = anggota.filter((a) => a.registrasi === registrasi && a.aktif !== false).length;
  const keluargaList = getLocalDemoKeluarga();
  const idx = keluargaList.findIndex((k) => k.registrasi === registrasi);
  if (idx >= 0) {
    keluargaList[idx] = { ...keluargaList[idx], jumlah_anggota: count };
    saveLocalDemoKeluarga(keluargaList);
  }
}

/**
 * 6. CRUD KELUARGA
 */
export async function upsertKeluarga(
  keluarga: Keluarga,
  options?: { originalRegistrasi?: string }
): Promise<void> {
  const cleanKeluarga: Keluarga = {
    registrasi: String(keluarga.registrasi || '').trim(),
    nama_kk: String(keluarga.nama_kk || '').trim(),
    kk_wafat: Boolean(keluarga.kk_wafat),
    wijk: String(keluarga.wijk || 'Lingkungan Letare').trim() || 'Lingkungan Letare',
    jalan: String(keluarga.jalan || '').trim(),
    hp: String(keluarga.hp || '').trim(),
    jumlah_anggota: Math.max(0, Number(keluarga.jumlah_anggota) || 0)
  };

  if (!cleanKeluarga.registrasi || !cleanKeluarga.nama_kk) {
    throw new Error('No. Registrasi dan Nama Kepala Keluarga wajib diisi.');
  }

  const originalReg = options?.originalRegistrasi?.trim();

  if (isSupabaseConfigured && supabase) {
    if (originalReg && originalReg !== cleanKeluarga.registrasi) {
      const { error } = await supabase
        .from('keluarga')
        .update(cleanKeluarga)
        .eq('registrasi', originalReg);
      if (error) {
        const formatted = formatSupabaseJemaatError(error, 'Gagal memperbarui data keluarga');
        notify('error', formatted.message);
        throw formatted;
      }
    } else {
      const { error } = await supabase
        .from('keluarga')
        .upsert(cleanKeluarga, { onConflict: 'registrasi' });
      if (error) {
        const formatted = formatSupabaseJemaatError(error, 'Gagal menyimpan data keluarga');
        notify('error', formatted.message);
        throw formatted;
      }
    }
    notify('success', `Keluarga ${cleanKeluarga.nama_kk} (${cleanKeluarga.registrasi}) berhasil disimpan.`);
    return;
  }

  // Local demo fallback
  const list = getLocalDemoKeluarga();
  const lookupKey = originalReg || cleanKeluarga.registrasi;
  const idx = list.findIndex((k) => k.registrasi === lookupKey);
  if (idx >= 0) {
    list[idx] = { ...list[idx], ...cleanKeluarga };
    if (originalReg && originalReg !== cleanKeluarga.registrasi) {
      const anggota = getLocalDemoAnggota().map((a) =>
        a.registrasi === originalReg ? { ...a, registrasi: cleanKeluarga.registrasi } : a
      );
      saveLocalDemoAnggota(anggota);
    }
  } else {
    list.push(cleanKeluarga);
  }
  saveLocalDemoKeluarga(list);
  notify('success', `[Demo] Keluarga ${cleanKeluarga.nama_kk} tersimpan.`);
}

export async function deleteKeluarga(registrasi: string): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.from('keluarga').delete().eq('registrasi', registrasi);
    if (error) {
      const formatted = formatSupabaseJemaatError(error, 'Gagal menghapus keluarga');
      notify('error', formatted.message);
      throw formatted;
    }
    notify('success', `Keluarga ${registrasi} berhasil dihapus.`);
    return;
  }

  // Local demo fallback
  const list = getLocalDemoKeluarga().filter((k) => k.registrasi !== registrasi);
  saveLocalDemoKeluarga(list);
  const anggota = getLocalDemoAnggota().filter((a) => a.registrasi !== registrasi);
  saveLocalDemoAnggota(anggota);
  notify('success', `[Demo] Keluarga ${registrasi} dihapus.`);
}

/**
 * 7. CRUD ANGGOTA
 */
export async function upsertAnggota(
  anggota: Partial<Anggota> & { nama: string; registrasi: string },
  options?: { autoCreateKeluargaNamaKK?: string; jalan?: string; hp?: string }
): Promise<Anggota> {
  const cleanReg = String(anggota.registrasi || '').trim();
  const cleanNama = String(anggota.nama || '').trim();
  const cleanWijk = String(anggota.wijk || 'Lingkungan Letare').trim() || 'Lingkungan Letare';

  if (!cleanReg || !cleanNama) {
    throw new Error('No. Registrasi KK dan Nama Lengkap Anggota wajib diisi.');
  }

  const item: Anggota = {
    id: anggota.id && !String(anggota.id).startsWith('ang-tmp-')
      ? String(anggota.id)
      : generateEntityUuid(),
    registrasi: cleanReg,
    nama: cleanNama,
    jenis_kelamin: anggota.jenis_kelamin === 'P' ? 'P' : 'L',
    tgl_lahir: normalizeDateField(anggota.tgl_lahir),
    tgl_baptis: normalizeDateField(anggota.tgl_baptis),
    tgl_sidi: normalizeDateField(anggota.tgl_sidi),
    hub_keluarga: String(anggota.hub_keluarga || 'Anggota').trim() || 'Anggota',
    wijk: cleanWijk,
    aktif: anggota.aktif !== undefined ? Boolean(anggota.aktif) : true
  };

  const fallbackNamaKK =
    options?.autoCreateKeluargaNamaKK?.trim() ||
    (item.hub_keluarga === 'Kepala Keluarga' ? item.nama : `Kel. ${item.nama}`);

  if (isSupabaseConfigured && supabase) {
    // Pastikan parent keluarga dengan registrasi ini sudah ada agar tidak melanggar FK anggota_registrasi_fkey
    const { data: existingKk, error: checkErr } = await supabase
      .from('keluarga')
      .select('registrasi')
      .eq('registrasi', item.registrasi)
      .maybeSingle();

    if (checkErr) {
      const formatted = formatSupabaseJemaatError(checkErr, 'Gagal memeriksa data keluarga');
      notify('error', formatted.message);
      throw formatted;
    }

    if (!existingKk) {
      const newParentKeluarga: Keluarga = {
        registrasi: item.registrasi,
        wijk: item.wijk,
        nama_kk: fallbackNamaKK,
        kk_wafat: false,
        jalan: options?.jalan?.trim() || '',
        hp: options?.hp?.trim() || '',
        jumlah_anggota: 1
      };
      const { error: kkInsertErr } = await supabase
        .from('keluarga')
        .upsert(newParentKeluarga, { onConflict: 'registrasi' });
      if (kkInsertErr) {
        const formatted = formatSupabaseJemaatError(kkInsertErr, 'Gagal membuat data keluarga otomatis');
        notify('error', formatted.message);
        throw formatted;
      }
    }

    const { data, error } = await supabase
      .from('anggota')
      .upsert(item, { onConflict: 'id' })
      .select()
      .single();

    if (error) {
      const formatted = formatSupabaseJemaatError(error, 'Gagal menyimpan data anggota');
      notify('error', formatted.message);
      throw formatted;
    }

    notify('success', `Anggota ${item.nama} berhasil disimpan.`);
    return (data as Anggota) || item;
  }

  // Local demo fallback
  const keluargaList = getLocalDemoKeluarga();
  if (!keluargaList.some((k) => k.registrasi === item.registrasi)) {
    keluargaList.push({
      registrasi: item.registrasi,
      wijk: item.wijk,
      nama_kk: fallbackNamaKK,
      kk_wafat: false,
      jalan: options?.jalan?.trim() || '',
      hp: options?.hp?.trim() || '',
      jumlah_anggota: 1
    });
    saveLocalDemoKeluarga(keluargaList);
  }

  const list = getLocalDemoAnggota();
  const idx = list.findIndex((a) => a.id === item.id);
  if (idx >= 0) {
    list[idx] = item;
  } else {
    list.unshift(item);
  }
  saveLocalDemoAnggota(list);
  syncLocalDemoKeluargaCount(item.registrasi);
  notify('success', `[Demo] Anggota ${item.nama} tersimpan.`);
  return item;
}

export async function deleteAnggota(id: string): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.from('anggota').delete().eq('id', id);
    if (error) {
      const formatted = formatSupabaseJemaatError(error, 'Gagal menghapus anggota');
      notify('error', formatted.message);
      throw formatted;
    }
    notify('success', `Data anggota berhasil dihapus.`);
    return;
  }

  // Local demo fallback
  const existing = getLocalDemoAnggota();
  const target = existing.find((a) => a.id === id);
  const list = existing.filter((a) => a.id !== id);
  saveLocalDemoAnggota(list);
  if (target?.registrasi) {
    syncLocalDemoKeluargaCount(target.registrasi);
  }
  notify('success', `[Demo] Data anggota dihapus.`);
}

/**
 * 8. BATCH IMPORT CSV (Upsert 500 rows per batch)
 * Keluarga dulu, baru Anggota.
 * Registrasi WAJIB string murni untuk menjaga leading zero.
 */
export async function batchUpsertKeluarga(
  rows: Keluarga[],
  onProgress?: (processed: number, total: number) => void
): Promise<{ successCount: number; errors: string[] }> {
  const batchSize = 500;
  let successCount = 0;
  const errors: string[] = [];

  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize).map((r) => ({
      ...r,
      registrasi: String(r.registrasi).trim(),
      nama_kk: String(r.nama_kk).trim(),
      wijk: String(r.wijk || 'Lingkungan Letare').trim() || 'Lingkungan Letare',
      jalan: String(r.jalan || '').trim(),
      hp: String(r.hp || '').trim(),
      jumlah_anggota: Math.max(0, Number(r.jumlah_anggota) || 0)
    }));

    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.from('keluarga').upsert(batch, { onConflict: 'registrasi' });
      if (error) {
        const formatted = formatSupabaseJemaatError(error, `Batch Keluarga ${Math.floor(i / batchSize) + 1}`);
        errors.push(formatted.message);
        notify('error', formatted.message);
        throw formatted;
      } else {
        successCount += batch.length;
      }
    } else {
      // Demo Mode batch
      const current = getLocalDemoKeluarga();
      const map = new Map<string, Keluarga>(current.map((k) => [k.registrasi, k]));
      batch.forEach((k) => map.set(k.registrasi, k));
      saveLocalDemoKeluarga(Array.from(map.values()));
      successCount += batch.length;
    }
    onProgress?.(Math.min(i + batchSize, rows.length), rows.length);
  }

  return { successCount, errors };
}

export async function batchUpsertAnggota(
  rows: Anggota[],
  onProgress?: (processed: number, total: number) => void
): Promise<{ successCount: number; errors: string[] }> {
  const batchSize = 500;
  let successCount = 0;
  const errors: string[] = [];

  const sanitizedRows: Anggota[] = rows.map((r) => ({
    ...r,
    id: r.id && !String(r.id).startsWith('ang-imp-') ? String(r.id) : generateEntityUuid(),
    registrasi: String(r.registrasi).trim(),
    nama: String(r.nama).trim(),
    jenis_kelamin: r.jenis_kelamin === 'P' ? 'P' : 'L',
    tgl_lahir: normalizeDateField(r.tgl_lahir),
    tgl_baptis: normalizeDateField(r.tgl_baptis),
    tgl_sidi: normalizeDateField(r.tgl_sidi),
    hub_keluarga: String(r.hub_keluarga || 'Anggota').trim() || 'Anggota',
    wijk: String(r.wijk || 'Lingkungan Letare').trim() || 'Lingkungan Letare',
    aktif: r.aktif !== false
  }));

  // Pastikan setiap registrasi yang muncul di batch anggota sudah ada di tabel keluarga
  if (sanitizedRows.length > 0) {
    const uniqueRegs = Array.from(new Set(sanitizedRows.map((r) => r.registrasi)));

    if (isSupabaseConfigured && supabase) {
      const existingRegs = new Set<string>();
      for (let i = 0; i < uniqueRegs.length; i += 500) {
        const regSlice = uniqueRegs.slice(i, i + 500);
        const { data, error } = await supabase
          .from('keluarga')
          .select('registrasi')
          .in('registrasi', regSlice);
        if (error) {
          const formatted = formatSupabaseJemaatError(error, 'Gagal memverifikasi nomor registrasi keluarga');
          notify('error', formatted.message);
          throw formatted;
        }
        (data || []).forEach((row: { registrasi: string }) => existingRegs.add(row.registrasi));
      }

      const missingRegs = uniqueRegs.filter((reg) => !existingRegs.has(reg));
      if (missingRegs.length > 0) {
        const missingKeluargaRows: Keluarga[] = missingRegs.map((reg) => {
          const members = sanitizedRows.filter((r) => r.registrasi === reg);
          const kkMember =
            members.find((m) => (m.hub_keluarga || '').toLowerCase().includes('kepala')) || members[0];
          const isKk = (kkMember?.hub_keluarga || '').toLowerCase().includes('kepala');
          return {
            registrasi: reg,
            wijk: kkMember?.wijk || 'Lingkungan Letare',
            nama_kk: isKk
              ? kkMember.nama
              : `Kel. ${kkMember?.nama || reg}`,
            kk_wafat: false,
            jalan: '',
            hp: '',
            jumlah_anggota: members.filter((m) => m.aktif !== false).length
          };
        });
        await batchUpsertKeluarga(missingKeluargaRows);
      }
    } else {
      const currentKk = getLocalDemoKeluarga();
      const existingSet = new Set(currentKk.map((k) => k.registrasi));
      const additions: Keluarga[] = [];
      uniqueRegs.forEach((reg) => {
        if (!existingSet.has(reg)) {
          const members = sanitizedRows.filter((r) => r.registrasi === reg);
          const kkMember =
            members.find((m) => (m.hub_keluarga || '').toLowerCase().includes('kepala')) || members[0];
          const isKk = (kkMember?.hub_keluarga || '').toLowerCase().includes('kepala');
          additions.push({
            registrasi: reg,
            wijk: kkMember?.wijk || 'Lingkungan Letare',
            nama_kk: isKk
              ? kkMember.nama
              : `Kel. ${kkMember?.nama || reg}`,
            kk_wafat: false,
            jalan: '',
            hp: '',
            jumlah_anggota: members.filter((m) => m.aktif !== false).length
          });
        }
      });
      if (additions.length > 0) {
        saveLocalDemoKeluarga([...currentKk, ...additions]);
      }
    }
  }

  for (let i = 0; i < sanitizedRows.length; i += batchSize) {
    const batch = sanitizedRows.slice(i, i + batchSize);
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.from('anggota').upsert(batch, { onConflict: 'id' });
      if (error) {
        const formatted = formatSupabaseJemaatError(error, `Batch Anggota ${Math.floor(i / batchSize) + 1}`);
        errors.push(formatted.message);
        notify('error', formatted.message);
        throw formatted;
      } else {
        successCount += batch.length;
      }
    } else {
      // Demo Mode batch
      const current = getLocalDemoAnggota();
      const map = new Map<string, Anggota>(current.map((a) => [a.id, a]));
      batch.forEach((a) => map.set(a.id, a));
      saveLocalDemoAnggota(Array.from(map.values()));
      successCount += batch.length;
    }
    onProgress?.(Math.min(i + batchSize, sanitizedRows.length), sanitizedRows.length);
  }

  return { successCount, errors };
}
