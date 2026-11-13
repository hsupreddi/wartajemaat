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
  UlangTahunItem,
  WartaRecord,
  WartaStatus
} from '../types';
import {
  DEFAULT_ACARA_MINGGU_TEMPLATE,
  DEFAULT_ACARA_PARTANGIANGAN_TEMPLATE,
  DEFAULT_JADWAL_TETAP,
  DEFAULT_LINGKUNGAN,
  DEFAULT_PENGATURAN,
  INITIAL_PARHOBAS,
  INITIAL_WARTA_RECORD,
  MASTER_KATEGORI_PENERIMAAN,
  MASTER_KATEGORI_PENGELUARAN,
  SAMPLE_ANGGOTA,
  createDefaultPenerimaanRows,
  getInitialFullWarta
} from './mockData';
import { calculateRekapitulasi } from './financialMath';
import { getSeninMingguRange, getUlangTahunMingguIni } from './dateUtils';
import { isSupabaseConfigured, supabase } from './supabase';
import { getUlangTahun } from './jemaatApi';

const STORAGE_KEYS = {
  WARTAS: 'hkbp_wartas_list',
  FULL_WARTA_PREFIX: 'hkbp_full_warta_',
  PENGATURAN: 'hkbp_pengaturan',
  JADWAL_TETAP: 'hkbp_jadwal_tetap',
  LINGKUNGAN: 'hkbp_lingkungan',
  ANGGOTA: 'hkbp_anggota',
  MASTER_PENERIMAAN: 'hkbp_master_kategori_penerimaan',
  MASTER_PENGELUARAN: 'hkbp_master_kategori_pengeluaran'
};

// Initialize local storage if empty (Demo mode or network fallback cache)
function initializeLocalStorage(forceSeed = false) {
  if (isSupabaseConfigured && !forceSeed) return;
  if (typeof window === 'undefined') return;

  const existingPeng = localStorage.getItem(STORAGE_KEYS.PENGATURAN);
  if (!existingPeng) {
    localStorage.setItem(STORAGE_KEYS.PENGATURAN, JSON.stringify(DEFAULT_PENGATURAN));
  } else {
    try {
      const parsed = JSON.parse(existingPeng);
      let updated = false;
      if (!parsed.logo_salib_url) {
        parsed.logo_salib_url = '/assets/aistudio/Logo-HKBP_02090ed7.png';
        updated = true;
      }
      if (!parsed.logo_transformasi_url) {
        parsed.logo_transformasi_url = '/assets/aistudio/Logo-Tahun-Transformasi-HKBP-2025-Fulcolor_247b231a.png';
        updated = true;
      }
      if (updated) {
        localStorage.setItem(STORAGE_KEYS.PENGATURAN, JSON.stringify(parsed));
      }
    } catch {}
  }
  if (!localStorage.getItem(STORAGE_KEYS.JADWAL_TETAP)) {
    localStorage.setItem(STORAGE_KEYS.JADWAL_TETAP, JSON.stringify(DEFAULT_JADWAL_TETAP));
  }
  if (!localStorage.getItem(STORAGE_KEYS.LINGKUNGAN)) {
    localStorage.setItem(STORAGE_KEYS.LINGKUNGAN, JSON.stringify(DEFAULT_LINGKUNGAN));
  }
  if (!localStorage.getItem(STORAGE_KEYS.ANGGOTA)) {
    localStorage.setItem(STORAGE_KEYS.ANGGOTA, JSON.stringify(SAMPLE_ANGGOTA));
  }
  if (!localStorage.getItem(STORAGE_KEYS.MASTER_PENERIMAAN)) {
    localStorage.setItem(STORAGE_KEYS.MASTER_PENERIMAAN, JSON.stringify(MASTER_KATEGORI_PENERIMAAN));
  }
  if (!localStorage.getItem(STORAGE_KEYS.MASTER_PENGELUARAN)) {
    localStorage.setItem(STORAGE_KEYS.MASTER_PENGELUARAN, JSON.stringify(MASTER_KATEGORI_PENGELUARAN));
  }

  const existingWartas = localStorage.getItem(STORAGE_KEYS.WARTAS);
  if (!existingWartas) {
    const initial = getInitialFullWarta();
    localStorage.setItem(STORAGE_KEYS.WARTAS, JSON.stringify([initial.warta]));
    localStorage.setItem(
      `${STORAGE_KEYS.FULL_WARTA_PREFIX}${initial.warta.id}`,
      JSON.stringify(initial)
    );
  }
}

if (typeof window !== 'undefined') {
  initializeLocalStorage();
}

// Helper: extract dynamic extra columns from a row
function splitExtraCols<T extends Record<string, any>>(
  row: T,
  baseKeys: string[]
): { base: Record<string, any>; extra_cols: Record<string, any> } {
  const base: Record<string, any> = {};
  const extra_cols: Record<string, any> = {};
  for (const [k, v] of Object.entries(row)) {
    if (k === 'extra_cols') continue;
    if (baseKeys.includes(k)) {
      base[k] = v;
    } else if (v !== undefined) {
      extra_cols[k] = v;
    }
  }
  return { base, extra_cols };
}

function hydrateExtraCols<T extends Record<string, any>>(row: any): T {
  const { extra_cols, ...rest } = row;
  if (extra_cols && typeof extra_cols === 'object') {
    return { ...rest, ...extra_cols } as T;
  }
  return rest as T;
}

// Helper: safely sync child table rows for a given warta_id (upsert current + delete removed IDs)
async function syncWartaChildTable(
  table: string,
  wartaId: string,
  rows: Record<string, any>[]
): Promise<void> {
  if (!supabase) return;

  if (rows.length > 0) {
    const { error: upsertErr } = await supabase
      .from(table)
      .upsert(rows, { onConflict: 'id' });
    if (upsertErr) {
      throw new Error(`Gagal menyimpan tabel ${table}: ${upsertErr.message}`);
    }
  }

  const { data: existing, error: fetchErr } = await supabase
    .from(table)
    .select('id')
    .eq('warta_id', wartaId);
  if (fetchErr) {
    throw new Error(`Gagal memeriksa data lama tabel ${table}: ${fetchErr.message}`);
  }

  const keepIds = new Set(rows.map((r) => r.id));
  const deleteIds = (existing || [])
    .map((r: any) => r.id as string)
    .filter((id) => !keepIds.has(id));

  if (deleteIds.length > 0) {
    const { error: delErr } = await supabase.from(table).delete().in('id', deleteIds);
    if (delErr) {
      throw new Error(`Gagal menghapus baris lama tabel ${table}: ${delErr.message}`);
    }
  }
}

// Helper: safely sync global master list tables (upsert current + delete removed IDs)
async function syncMasterTable(
  table: string,
  rows: Record<string, any>[]
): Promise<void> {
  if (!supabase) return;

  if (rows.length > 0) {
    const { error: upsertErr } = await supabase
      .from(table)
      .upsert(rows, { onConflict: 'id' });
    if (upsertErr) {
      throw new Error(`Gagal menyimpan tabel ${table}: ${upsertErr.message}`);
    }
  }

  const { data: existing, error: fetchErr } = await supabase.from(table).select('id');
  if (fetchErr) {
    throw new Error(`Gagal memeriksa data lama tabel ${table}: ${fetchErr.message}`);
  }

  const keepIds = new Set(rows.map((r) => r.id));
  const deleteIds = (existing || [])
    .map((r: any) => r.id as string)
    .filter((id) => !keepIds.has(id));

  if (deleteIds.length > 0) {
    const { error: delErr } = await supabase.from(table).delete().in('id', deleteIds);
    if (delErr) {
      throw new Error(`Gagal menghapus baris lama tabel ${table}: ${delErr.message}`);
    }
  }
}

function normalizeWartaRecord(raw: any): WartaRecord {
  return {
    id: raw.id,
    tanggal_minggu: raw.tanggal_minggu,
    status: raw.status || 'draft',
    goar_minggu: raw.goar_minggu || '',
    topik_minggu: raw.topik_minggu || '',
    ayat_teks: raw.ayat_teks || '',
    ayat_ref: raw.ayat_ref || '',
    ruas_sm: Number(raw.ruas_sm || 0),
    ruas_pagi: Number(raw.ruas_pagi || 0),
    ruas_siang: Number(raw.ruas_siang || 0),
    markoor_1: raw.markoor_1 || '',
    markoor_2: raw.markoor_2 || '',
    jadwal_koor_tanggal: raw.jadwal_koor_tanggal || '',
    koor_pagi: raw.koor_pagi || '',
    koor_siang: raw.koor_siang || '',
    periode_keuangan_mulai: raw.periode_keuangan_mulai || raw.tanggal_minggu,
    periode_keuangan_akhir: raw.periode_keuangan_akhir || raw.tanggal_minggu,
    saldo_awal_huria: Number(raw.saldo_awal_huria || 0),
    saldo_awal_sosial: Number(raw.saldo_awal_sosial || 0),
    saldo_awal_pembangunan: Number(raw.saldo_awal_pembangunan || 0),
    saldo_awal_sentralisasi: Number(raw.saldo_awal_sentralisasi || 0),
    saldo_awal_transitori: Number(raw.saldo_awal_transitori || 0),
    ulang_tahun_snapshot: Array.isArray(raw.ulang_tahun_snapshot)
      ? raw.ulang_tahun_snapshot
      : [],
    created_by: raw.created_by,
    created_at: raw.created_at,
    updated_at: raw.updated_at
  };
}

/**
 * Fetch all warta records
 */
export async function getAllWartas(publishedOnly = false): Promise<WartaRecord[]> {
  if (isSupabaseConfigured && supabase) {
    try {
      let query = supabase.from('warta').select('*').order('tanggal_minggu', { ascending: false });
      if (publishedOnly) {
        query = query.eq('status', 'published');
      }
      const { data, error } = await query;
      if (!error) {
        return (data || []).map(normalizeWartaRecord);
      }
      console.warn('[Supabase] Gagal memuat daftar warta, menggunakan fallback lokal:', error.message);
    } catch (err: any) {
      console.warn('[Supabase] Koneksi daftar warta gagal, menggunakan fallback lokal:', err?.message || err);
    }
  }

  try {
    initializeLocalStorage(true);
    const raw = localStorage.getItem(STORAGE_KEYS.WARTAS);
    if (!raw) return [];
    let list: WartaRecord[] = JSON.parse(raw);
    if (publishedOnly) {
      list = list.filter((w) => w.status === 'published');
    }
    return list.sort((a, b) => b.tanggal_minggu.localeCompare(a.tanggal_minggu));
  } catch {
    return [];
  }
}

/**
 * Get full warta details by ID
 */
export async function getWartaById(id: string): Promise<FullWartaData | null> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data: rawWarta, error } = await supabase
        .from('warta')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) {
        console.warn('[Supabase] Gagal memuat warta:', error.message);
      } else if (!rawWarta) {
        return null;
      } else {

    const [
      { data: acaraMingguRaw, error: e1 },
      { data: acaraPartangianganRaw, error: e2 },
      { data: parhobasRaw, error: e3 },
      { data: sopoGodangRaw, error: e4 },
      { data: jadwalPartRaw, error: e5 },
      { data: pengumumanRaw, error: e6 },
      { data: penerimaanRaw, error: e7 },
      { data: peleanTaonRaw, error: e8 },
      { data: hamauliateonRaw, error: e9 },
      { data: pengeluaranRaw, error: e10 }
    ] = await Promise.all([
      supabase.from('acara_ibadah').select('*').eq('warta_id', id).eq('jenis', 'minggu').order('urutan'),
      supabase.from('acara_ibadah').select('*').eq('warta_id', id).eq('jenis', 'partangiangan').order('urutan'),
      supabase.from('parhobas').select('*').eq('warta_id', id).order('urutan'),
      supabase.from('sopo_godang').select('*').eq('warta_id', id).order('urutan'),
      supabase.from('jadwal_partangiangan').select('*').eq('warta_id', id).order('urutan'),
      supabase.from('pengumuman').select('*').eq('warta_id', id).order('urutan'),
      supabase.from('penerimaan').select('*').eq('warta_id', id).order('urutan'),
      supabase.from('pelean_taon').select('*').eq('warta_id', id).order('urutan'),
      supabase.from('hamauliateon').select('*').eq('warta_id', id).order('urutan'),
      supabase.from('pengeluaran').select('*').eq('warta_id', id).order('urutan')
    ]);

    const firstErr = e1 || e2 || e3 || e4 || e5 || e6 || e7 || e8 || e9 || e10;
    if (firstErr) {
      throw new Error(`Gagal memuat detail warta dari Supabase: ${firstErr.message}`);
    }

    const warta = normalizeWartaRecord(rawWarta);
    const tableCols = (rawWarta as any).table_columns || {};

    const pelean_taon: PeleanTaonItem[] = (peleanTaonRaw || []).map((r: any) => ({
      id: r.id,
      warta_id: r.warta_id,
      nama: r.nama || '',
      lingkungan: r.lingkungan || '',
      jumlah: Number(r.jumlah || 0),
      urutan: Number(r.urutan || 1)
    }));

    const hamauliateon: HamauliateonItem[] = (hamauliateonRaw || []).map((r: any) => ({
      id: r.id,
      warta_id: r.warta_id,
      nama: r.nama || '',
      rincian: r.rincian || '',
      jumlah: Number(r.jumlah || 0),
      ke_huria: Number(r.ke_huria || 0),
      ke_sosial: Number(r.ke_sosial || 0),
      ke_pembangunan: Number(r.ke_pembangunan || 0),
      ke_sentralisasi: Number(r.ke_sentralisasi || 0),
      ke_transitori: Number(r.ke_transitori || 0),
      urutan: Number(r.urutan || 1)
    }));

    let penerimaan: PenerimaanRow[] = (penerimaanRaw || []).map((r: any) => ({
      id: r.id,
      kategori_id: r.kategori_id || undefined,
      kode: r.kode,
      kelompok: r.kelompok || '1.1',
      no_tampilan: r.no_tampilan || '',
      urutan: Number(r.urutan || 1),
      uraian: r.uraian || '',
      aturan_alokasi: r.aturan_alokasi || 'split_45_55',
      is_sentralisasi: Boolean(r.is_sentralisasi),
      dialihkan_ke_pembangunan: Boolean(r.dialihkan_ke_pembangunan),
      jumlah: Number(r.jumlah || 0),
      huria_45: Number(r.huria_45 || 0),
      sosial: Number(r.sosial || 0),
      pembangunan: Number(r.pembangunan || 0),
      sentral_55: Number(r.sentral_55 || 0),
      transitori: Number(r.transitori || 0)
    }));

    if (penerimaan.length === 0) {
      const masterPen = await getMasterKategoriPenerimaan();
      const peleanSum = pelean_taon.reduce((acc, c) => acc + (c.jumlah || 0), 0);
      const hamSum = hamauliateon.reduce((acc, c) => acc + (c.jumlah || 0), 0);
      penerimaan = createDefaultPenerimaanRows(peleanSum, hamSum, hamauliateon, masterPen, false);
    }

    const pengeluaran: PengeluaranItem[] = (pengeluaranRaw || []).map((r: any) => ({
      id: r.id,
      warta_id: r.warta_id,
      kode: r.kode || '',
      urutan: Number(r.urutan || 1),
      uraian: r.uraian || '',
      is_sentralisasi: Boolean(r.is_sentralisasi),
      sentralisasi: Number(r.sentralisasi || 0),
      jumlah: Number(r.jumlah || 0),
      huria: Number(r.huria || 0),
      sosial: Number(r.sosial || 0),
      pembangunan: Number(r.pembangunan || 0),
      transitori: Number(r.transitori || 0),
      catatan: r.catatan || ''
    }));

    const ultah: UlangTahunItem[] = warta.ulang_tahun_snapshot || [];
    const rekap = calculateRekapitulasi(warta, penerimaan, pengeluaran);

    return {
      warta,
      acara_minggu: (acaraMingguRaw || []).map((r) => hydrateExtraCols<AcaraIbadahItem>(r)),
      acara_partangiangan: (acaraPartangianganRaw || []).map((r) => hydrateExtraCols<AcaraIbadahItem>(r)),
      parhobas: (parhobasRaw || []).map((r) => hydrateExtraCols<ParhobasItem>(r)),
      sopo_godang: (sopoGodangRaw || []).map((r) => hydrateExtraCols<SopoGodangItem>(r)),
      jadwal_partangiangan: (jadwalPartRaw || []).map((r) => hydrateExtraCols<JadwalPartangianganItem>(r)),
      pengumuman: (pengumumanRaw || []).map((r: any) => ({
        id: r.id,
        warta_id: r.warta_id,
        urutan: Number(r.urutan || 1),
        judul: r.judul || '',
        isi: r.isi || ''
      })) as PengumumanItem[],
      penerimaan,
      pelean_taon,
      hamauliateon,
      pengeluaran,
      ulang_tahun: ultah,
      rekapitulasi: rekap,
      ...(tableCols.parhobas_columns ? { parhobas_columns: tableCols.parhobas_columns } : {}),
      ...(tableCols.acara_minggu_columns ? { acara_minggu_columns: tableCols.acara_minggu_columns } : {}),
      ...(tableCols.acara_partangiangan_columns ? { acara_partangiangan_columns: tableCols.acara_partangiangan_columns } : {}),
      ...(tableCols.sopo_godang_columns ? { sopo_godang_columns: tableCols.sopo_godang_columns } : {}),
      ...(tableCols.jadwal_partangiangan_columns ? { jadwal_partangiangan_columns: tableCols.jadwal_partangiangan_columns } : {})
    };
      }
    } catch (err: any) {
      console.warn('[Supabase] Koneksi detail warta gagal, menggunakan fallback lokal:', err?.message || err);
    }
  }

  try {
    initializeLocalStorage(true);
    const raw = localStorage.getItem(`${STORAGE_KEYS.FULL_WARTA_PREFIX}${id}`);
    if (raw) {
      const data: FullWartaData = JSON.parse(raw);
      if (!data.ulang_tahun || data.ulang_tahun.length === 0) {
        data.ulang_tahun = data.warta.ulang_tahun_snapshot || [];
      }
      data.rekapitulasi = calculateRekapitulasi(
        data.warta,
        data.penerimaan,
        data.pengeluaran
      );
      return data;
    }
  } catch {
    // fallback
  }

  if (id === INITIAL_WARTA_RECORD.id) {
    return getInitialFullWarta();
  }

  return null;
}

/**
 * Save warta data (100% persisted to Supabase when configured, otherwise localStorage)
 */
export async function saveWarta(data: FullWartaData): Promise<void> {
  const nowIso = new Date().toISOString();
  data.warta.updated_at = nowIso;

  // Snapshot ulang tahun ke record warta sehingga pembaca publik tidak mengakses tabel anggota
  data.warta.ulang_tahun_snapshot = data.ulang_tahun || [];

  // Recalculate rekapitulasi
  data.rekapitulasi = calculateRekapitulasi(
    data.warta,
    data.penerimaan,
    data.pengeluaran
  );

  // 1. Save to Supabase when configured
  if (isSupabaseConfigured && supabase) {
    const wartaId = data.warta.id;
    const tableColumnsPayload: Record<string, any> = {};
    if (data.parhobas_columns) tableColumnsPayload.parhobas_columns = data.parhobas_columns;
    if (data.acara_minggu_columns) tableColumnsPayload.acara_minggu_columns = data.acara_minggu_columns;
    if (data.acara_partangiangan_columns) tableColumnsPayload.acara_partangiangan_columns = data.acara_partangiangan_columns;
    if (data.sopo_godang_columns) tableColumnsPayload.sopo_godang_columns = data.sopo_godang_columns;
    if (data.jadwal_partangiangan_columns) tableColumnsPayload.jadwal_partangiangan_columns = data.jadwal_partangiangan_columns;

    const wartaPayload = {
      id: wartaId,
      tanggal_minggu: data.warta.tanggal_minggu,
      status: data.warta.status,
      goar_minggu: data.warta.goar_minggu,
      topik_minggu: data.warta.topik_minggu || '',
      ayat_teks: data.warta.ayat_teks || '',
      ayat_ref: data.warta.ayat_ref || '',
      ruas_sm: Number(data.warta.ruas_sm || 0),
      ruas_pagi: Number(data.warta.ruas_pagi || 0),
      ruas_siang: Number(data.warta.ruas_siang || 0),
      markoor_1: data.warta.markoor_1 || '',
      markoor_2: data.warta.markoor_2 || '',
      jadwal_koor_tanggal: data.warta.jadwal_koor_tanggal || '',
      koor_pagi: data.warta.koor_pagi || '',
      koor_siang: data.warta.koor_siang || '',
      periode_keuangan_mulai: data.warta.periode_keuangan_mulai || data.warta.tanggal_minggu,
      periode_keuangan_akhir: data.warta.periode_keuangan_akhir || data.warta.tanggal_minggu,
      saldo_awal_huria: Number(data.warta.saldo_awal_huria || 0),
      saldo_awal_sosial: Number(data.warta.saldo_awal_sosial || 0),
      saldo_awal_pembangunan: Number(data.warta.saldo_awal_pembangunan || 0),
      saldo_awal_sentralisasi: Number(data.warta.saldo_awal_sentralisasi || 0),
      saldo_awal_transitori: Number(data.warta.saldo_awal_transitori || 0),
      ulang_tahun_snapshot: data.warta.ulang_tahun_snapshot || [],
      table_columns: tableColumnsPayload,
      created_by: data.warta.created_by || null,
      created_at: data.warta.created_at || nowIso,
      updated_at: nowIso
    };

    const { error: wartaErr } = await supabase
      .from('warta')
      .upsert(wartaPayload, { onConflict: 'id' });

    if (wartaErr) {
      throw new Error(`Gagal menyimpan data warta ke Supabase: ${wartaErr.message}`);
    }

    // Prepare child table rows cleanly
    const acaraRows = [
      ...(data.acara_minggu || []).map((it, idx) => {
        const { base, extra_cols } = splitExtraCols(it, ['id', 'warta_id', 'jenis', 'urutan', 'uraian', 'keterangan']);
        return {
          id: base.id,
          warta_id: wartaId,
          jenis: 'minggu',
          urutan: Number(base.urutan ?? idx + 1),
          uraian: base.uraian || '',
          keterangan: base.keterangan || '',
          extra_cols
        };
      }),
      ...(data.acara_partangiangan || []).map((it, idx) => {
        const { base, extra_cols } = splitExtraCols(it, ['id', 'warta_id', 'jenis', 'urutan', 'uraian', 'keterangan']);
        return {
          id: base.id,
          warta_id: wartaId,
          jenis: 'partangiangan',
          urutan: Number(base.urutan ?? idx + 1),
          uraian: base.uraian || '',
          keterangan: base.keterangan || '',
          extra_cols
        };
      })
    ];

    const parhobasRows = (data.parhobas || []).map((it, idx) => {
      const { base, extra_cols } = splitExtraCols(it, ['id', 'warta_id', 'peran', 'skm', 'sesi1', 'sesi2', 'urutan']);
      return {
        id: base.id,
        warta_id: wartaId,
        peran: base.peran || '',
        skm: base.skm || '',
        sesi1: base.sesi1 || '',
        sesi2: base.sesi2 || '',
        urutan: Number(base.urutan ?? idx + 1),
        extra_cols
      };
    });

    const sopoRows = (data.sopo_godang || []).map((it, idx) => {
      const { base, extra_cols } = splitExtraCols(it, ['id', 'warta_id', 'nama', 'tanggal', 'urutan']);
      return {
        id: base.id,
        warta_id: wartaId,
        nama: base.nama || '-',
        tanggal: base.tanggal || '-',
        urutan: Number(base.urutan ?? idx + 1),
        extra_cols
      };
    });

    const jadwalPartRows = (data.jadwal_partangiangan || []).map((it, idx) => {
      const { base, extra_cols } = splitExtraCols(it, ['id', 'warta_id', 'hari', 'lingkungan', 'pukul', 'inganan', 'urutan']);
      return {
        id: base.id,
        warta_id: wartaId,
        hari: base.hari || '',
        lingkungan: base.lingkungan || '',
        pukul: base.pukul || '',
        inganan: base.inganan || '',
        urutan: Number(base.urutan ?? idx + 1),
        extra_cols
      };
    });

    const pengumumanRows = (data.pengumuman || []).map((it, idx) => ({
      id: it.id,
      warta_id: wartaId,
      urutan: Number(it.urutan ?? idx + 1),
      judul: it.judul || '',
      isi: it.isi || ''
    }));

    const penerimaanRows = (data.penerimaan || []).map((it, idx) => ({
      id: it.id,
      warta_id: wartaId,
      kategori_id: it.kategori_id || null,
      kode: it.kode,
      kelompok: it.kelompok || '1.1',
      no_tampilan: it.no_tampilan || '',
      urutan: Number(it.urutan ?? idx + 1),
      uraian: it.uraian || '',
      aturan_alokasi: it.aturan_alokasi || 'split_45_55',
      is_sentralisasi: Boolean(it.is_sentralisasi),
      dialihkan_ke_pembangunan: Boolean(it.dialihkan_ke_pembangunan),
      jumlah: Number(it.jumlah || 0),
      huria_45: Number(it.huria_45 || 0),
      sosial: Number(it.sosial || 0),
      pembangunan: Number(it.pembangunan || 0),
      sentral_55: Number(it.sentral_55 || 0),
      transitori: Number(it.transitori || 0)
    }));

    const peleanTaonRows = (data.pelean_taon || []).map((it, idx) => ({
      id: it.id,
      warta_id: wartaId,
      nama: it.nama || '',
      lingkungan: it.lingkungan || '',
      jumlah: Number(it.jumlah || 0),
      urutan: Number(it.urutan ?? idx + 1)
    }));

    const hamauliateonRows = (data.hamauliateon || []).map((it, idx) => ({
      id: it.id,
      warta_id: wartaId,
      nama: it.nama || '',
      rincian: it.rincian || '',
      jumlah: Number(it.jumlah || 0),
      ke_huria: Number(it.ke_huria || 0),
      ke_sosial: Number(it.ke_sosial || 0),
      ke_pembangunan: Number(it.ke_pembangunan || 0),
      ke_sentralisasi: Number(it.ke_sentralisasi || 0),
      ke_transitori: Number(it.ke_transitori || 0),
      urutan: Number(it.urutan ?? idx + 1)
    }));

    const pengeluaranRows = (data.pengeluaran || []).map((it, idx) => ({
      id: it.id,
      warta_id: wartaId,
      kode: it.kode || '',
      urutan: Number(it.urutan ?? idx + 1),
      uraian: it.uraian || '',
      is_sentralisasi: Boolean(it.is_sentralisasi),
      sentralisasi: Number(it.sentralisasi || 0),
      jumlah: Number(it.jumlah || 0),
      huria: Number(it.huria || 0),
      sosial: Number(it.sosial || 0),
      pembangunan: Number(it.pembangunan || 0),
      transitori: Number(it.transitori || 0),
      catatan: it.catatan || ''
    }));

    await Promise.all([
      syncWartaChildTable('acara_ibadah', wartaId, acaraRows),
      syncWartaChildTable('parhobas', wartaId, parhobasRows),
      syncWartaChildTable('sopo_godang', wartaId, sopoRows),
      syncWartaChildTable('jadwal_partangiangan', wartaId, jadwalPartRows),
      syncWartaChildTable('pengumuman', wartaId, pengumumanRows),
      syncWartaChildTable('penerimaan', wartaId, penerimaanRows),
      syncWartaChildTable('pelean_taon', wartaId, peleanTaonRows),
      syncWartaChildTable('hamauliateon', wartaId, hamauliateonRows),
      syncWartaChildTable('pengeluaran', wartaId, pengeluaranRows)
    ]);

    return;
  }

  // 2. Demo Mode: Save in LocalStorage
  localStorage.setItem(
    `${STORAGE_KEYS.FULL_WARTA_PREFIX}${data.warta.id}`,
    JSON.stringify(data)
  );

  const rawList = localStorage.getItem(STORAGE_KEYS.WARTAS);
  const list: WartaRecord[] = rawList ? JSON.parse(rawList) : [];
  const idx = list.findIndex((w) => w.id === data.warta.id);
  if (idx >= 0) {
    list[idx] = data.warta;
  } else {
    list.unshift(data.warta);
  }
  localStorage.setItem(STORAGE_KEYS.WARTAS, JSON.stringify(list));
}

/**
 * Toggle warta publish status
 */
export async function updateWartaStatus(id: string, status: WartaStatus): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase
      .from('warta')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) {
      throw new Error(`Gagal memperbarui status warta di Supabase: ${error.message}`);
    }
    return;
  }

  const full = await getWartaById(id);
  if (full) {
    full.warta.status = status;
    await saveWarta(full);
  }
}

/**
 * Delete warta
 */
export async function deleteWarta(id: string): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.from('warta').delete().eq('id', id);
    if (error) {
      throw new Error(`Gagal menghapus warta di Supabase: ${error.message}`);
    }
    return;
  }

  localStorage.removeItem(`${STORAGE_KEYS.FULL_WARTA_PREFIX}${id}`);
  const rawList = localStorage.getItem(STORAGE_KEYS.WARTAS);
  if (rawList) {
    const list: WartaRecord[] = JSON.parse(rawList);
    const updated = list.filter((w) => w.id !== id);
    localStorage.setItem(STORAGE_KEYS.WARTAS, JSON.stringify(updated));
  }
}

/**
 * Create a new weekly Warta
 * Inherits previous warta's ending balance as starting balance!
 */
export async function createNewWarta(
  tanggalMinggu: string,
  goarMinggu: string,
  topikMinggu: string
): Promise<FullWartaData> {
  const allWartas = await getAllWartas();
  let saldoAwalHuria = 12000000;
  let saldoAwalSosial = 4000000;
  let saldoAwalPembangunan = 38000000;
  let saldoAwalSentralisasi = 0;
  let saldoAwalTransitori = 1000000;

  if (allWartas.length > 0) {
    const prev = await getWartaById(allWartas[0].id);
    if (prev?.rekapitulasi) {
      saldoAwalHuria = prev.rekapitulasi.huria.saldo_akhir;
      saldoAwalSosial = prev.rekapitulasi.sosial.saldo_akhir;
      saldoAwalPembangunan = prev.rekapitulasi.pembangunan.saldo_akhir;
      saldoAwalSentralisasi = prev.rekapitulasi.sentralisasi.saldo_akhir;
      saldoAwalTransitori = prev.rekapitulasi.transitori.saldo_akhir;
    }
  }

  const { seninStr, mingguStr } = getSeninMingguRange(tanggalMinggu);
  let ultah: UlangTahunItem[] = [];
  try {
    ultah = await getUlangTahun(seninStr, mingguStr);
  } catch {
    const anggota = await getAnggota();
    ultah = getUlangTahunMingguIni(anggota, tanggalMinggu);
  }

  const [pengaturan, lingkungans, masterPenerimaan] = await Promise.all([
    getPengaturan(),
    getLingkungan(),
    getMasterKategoriPenerimaan()
  ]);

  const newId = `warta-${tanggalMinggu}`;
  const ts = Date.now();

  const warta: WartaRecord = {
    id: newId,
    tanggal_minggu: tanggalMinggu,
    status: 'draft',
    goar_minggu: goarMinggu || 'MINGGU',
    topik_minggu: topikMinggu || '',
    ayat_teks: pengaturan.ayat_tetap_default || DEFAULT_PENGATURAN.ayat_tetap_default,
    ayat_ref: pengaturan.ayat_ref_default || DEFAULT_PENGATURAN.ayat_ref_default,
    ruas_sm: 0,
    ruas_pagi: 0,
    ruas_siang: 0,
    markoor_1: '',
    markoor_2: '',
    jadwal_koor_tanggal: '',
    koor_pagi: '',
    koor_siang: '',
    periode_keuangan_mulai: seninStr,
    periode_keuangan_akhir: mingguStr,
    saldo_awal_huria: saldoAwalHuria,
    saldo_awal_sosial: saldoAwalSosial,
    saldo_awal_pembangunan: saldoAwalPembangunan,
    saldo_awal_sentralisasi: saldoAwalSentralisasi,
    saldo_awal_transitori: saldoAwalTransitori,
    ulang_tahun_snapshot: ultah,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const acara_minggu = DEFAULT_ACARA_MINGGU_TEMPLATE.map((it, idx) => ({
    id: `am-${idx + 1}-${ts}`,
    warta_id: newId,
    jenis: 'minggu' as const,
    urutan: idx + 1,
    uraian: it.uraian,
    keterangan: it.keterangan || ''
  }));

  const acara_partangiangan = DEFAULT_ACARA_PARTANGIANGAN_TEMPLATE.map((it, idx) => ({
    id: `ap-${idx + 1}-${ts}`,
    warta_id: newId,
    jenis: 'partangiangan' as const,
    urutan: idx + 1,
    uraian: it.uraian,
    keterangan: it.keterangan || ''
  }));

  const parhobas = INITIAL_PARHOBAS.map((p) => ({
    ...p,
    id: `ph-${p.peran}-${ts}`,
    warta_id: newId
  }));

  const sopo_godang = [
    { id: `sg-1-${ts}`, warta_id: newId, urutan: 1, nama: '-', tanggal: '-' },
    { id: `sg-2-${ts}`, warta_id: newId, urutan: 2, nama: '-', tanggal: '-' },
    { id: `sg-3-${ts}`, warta_id: newId, urutan: 3, nama: '-', tanggal: '-' },
    { id: `sg-4-${ts}`, warta_id: newId, urutan: 4, nama: '-', tanggal: '-' },
    { id: `sg-5-${ts}`, warta_id: newId, urutan: 5, nama: '-', tanggal: '-' }
  ];

  const activeLingkungans = lingkungans.length > 0 ? lingkungans : DEFAULT_LINGKUNGAN;
  const jadwal_partangiangan = activeLingkungans.map((l, idx) => ({
    id: `jp-${l.id}-${ts}`,
    warta_id: newId,
    hari: `${l.hari_default}`,
    lingkungan: l.nama,
    pukul: l.jam_default,
    inganan: 'Kel. ',
    urutan: idx + 1
  }));

  const pengumuman = [
    {
      id: `peng-1-${ts}`,
      warta_id: newId,
      urutan: 1,
      judul: 'Tingting Parguruan / Jadwal Pelayanan',
      isi: 'Dipangido tu sude Parhalado dohot ruas asa marroan tu partangiangan lingkungan.'
    }
  ];

  const penerimaan = createDefaultPenerimaanRows(0, 0, [], masterPenerimaan, false);
  const pelean_taon: PeleanTaonItem[] = [];
  const hamauliateon: HamauliateonItem[] = [];
  const pengeluaran: PengeluaranItem[] = [];

  const rekapitulasi = calculateRekapitulasi(warta, penerimaan, pengeluaran);

  const full: FullWartaData = {
    warta,
    acara_minggu,
    acara_partangiangan,
    parhobas,
    sopo_godang,
    jadwal_partangiangan,
    pengumuman,
    penerimaan,
    pelean_taon,
    hamauliateon,
    pengeluaran,
    ulang_tahun: ultah,
    rekapitulasi
  };

  await saveWarta(full);
  return full;
}

// ============================================================================
// MASTER SETTINGS, JADWAL TETAP, LINGKUNGAN & POS KEUANGAN
// ============================================================================

export async function getPengaturan(): Promise<PengaturanHuria> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('pengaturan_huria')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        const merged: PengaturanHuria = { ...DEFAULT_PENGATURAN, ...data };
        if (!merged.logo_salib_url) {
          merged.logo_salib_url = '/assets/aistudio/Logo-HKBP_02090ed7.png';
        }
        if (!merged.logo_transformasi_url) {
          merged.logo_transformasi_url = '/assets/aistudio/Logo-Tahun-Transformasi-HKBP-2025-Fulcolor_247b231a.png';
        }
        return merged;
      }
      if (error) {
        console.warn('[Supabase] Gagal memuat pengaturan_huria:', error.message);
      }
    } catch (err: any) {
      console.warn('[Supabase] Koneksi pengaturan_huria gagal:', err?.message || err);
    }
  }

  initializeLocalStorage(true);
  const raw = localStorage.getItem(STORAGE_KEYS.PENGATURAN);
  const data: PengaturanHuria = raw ? JSON.parse(raw) : { ...DEFAULT_PENGATURAN };
  if (!data.logo_salib_url) {
    data.logo_salib_url = '/assets/aistudio/Logo-HKBP_02090ed7.png';
  }
  if (!data.logo_transformasi_url) {
    data.logo_transformasi_url = '/assets/aistudio/Logo-Tahun-Transformasi-HKBP-2025-Fulcolor_247b231a.png';
  }
  return data;
}

export async function savePengaturan(data: PengaturanHuria): Promise<void> {
  const payload: PengaturanHuria = {
    ...data,
    id: data.id || DEFAULT_PENGATURAN.id,
    updated_at: new Date().toISOString()
  };

  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase
      .from('pengaturan_huria')
      .upsert(payload, { onConflict: 'id' });
    if (error) {
      throw new Error(`Gagal menyimpan pengaturan huria ke Supabase: ${error.message}`);
    }
    return;
  }

  localStorage.setItem(STORAGE_KEYS.PENGATURAN, JSON.stringify(payload));
}

export async function getJadwalTetap(): Promise<JadwalTetapItem[]> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('jadwal_tetap')
        .select('*')
        .order('urutan', { ascending: true });
      if (!error && data && data.length > 0) {
        return data as JadwalTetapItem[];
      }
      if (error) {
        console.warn('[Supabase] Gagal memuat jadwal_tetap:', error.message);
      }
    } catch (err: any) {
      console.warn('[Supabase] Koneksi jadwal_tetap gagal:', err?.message || err);
    }
  }

  initializeLocalStorage(true);
  const raw = localStorage.getItem(STORAGE_KEYS.JADWAL_TETAP);
  return raw ? JSON.parse(raw) : DEFAULT_JADWAL_TETAP;
}

export async function saveJadwalTetap(items: JadwalTetapItem[]): Promise<void> {
  const normalized = items.map((it, idx) => ({
    id: it.id,
    kelompok: it.kelompok,
    label: it.label,
    hari: it.hari,
    jam: it.jam,
    keterangan: it.keterangan || '',
    urutan: idx + 1
  }));

  if (isSupabaseConfigured && supabase) {
    await syncMasterTable('jadwal_tetap', normalized);
    return;
  }

  localStorage.setItem(STORAGE_KEYS.JADWAL_TETAP, JSON.stringify(normalized));
}

export async function getLingkungan(): Promise<LingkunganItem[]> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('lingkungan')
        .select('*')
        .order('urutan', { ascending: true });
      if (!error && data && data.length > 0) {
        return data as LingkunganItem[];
      }
      if (error) {
        console.warn('[Supabase] Gagal memuat lingkungan:', error.message);
      }
    } catch (err: any) {
      console.warn('[Supabase] Koneksi lingkungan gagal:', err?.message || err);
    }
  }

  initializeLocalStorage(true);
  const raw = localStorage.getItem(STORAGE_KEYS.LINGKUNGAN);
  return raw ? JSON.parse(raw) : DEFAULT_LINGKUNGAN;
}

export async function saveLingkungan(items: LingkunganItem[]): Promise<void> {
  const normalized = items.map((it, idx) => ({
    id: it.id,
    nama: it.nama,
    hari_default: it.hari_default || 'Rabu',
    jam_default: it.jam_default || '20.00 WIB',
    urutan: idx + 1
  }));

  if (isSupabaseConfigured && supabase) {
    await syncMasterTable('lingkungan', normalized);
    return;
  }

  localStorage.setItem(STORAGE_KEYS.LINGKUNGAN, JSON.stringify(normalized));
}

export async function getAnggota(): Promise<AnggotaJemaat[]> {
  const raw = localStorage.getItem(STORAGE_KEYS.ANGGOTA);
  return raw ? JSON.parse(raw) : SAMPLE_ANGGOTA;
}

export async function saveAnggota(items: AnggotaJemaat[]): Promise<void> {
  localStorage.setItem(STORAGE_KEYS.ANGGOTA, JSON.stringify(items));
}

// Master Kategori Penerimaan & Pengeluaran (Fleksibel dapat ditambah sewaktu-waktu oleh Admin)
export function getMasterKategoriPenerimaanSync(): KategoriPenerimaanMaster[] {
  if (typeof window === 'undefined') return MASTER_KATEGORI_PENERIMAAN;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.MASTER_PENERIMAAN);
    if (!raw) return MASTER_KATEGORI_PENERIMAAN;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : MASTER_KATEGORI_PENERIMAAN;
  } catch {
    return MASTER_KATEGORI_PENERIMAAN;
  }
}

export async function getMasterKategoriPenerimaan(): Promise<KategoriPenerimaanMaster[]> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('master_kategori_penerimaan')
        .select('*')
        .order('urutan', { ascending: true });

      if (!error && data && data.length > 0) {
        const normalized = data.map((r: any) => ({
          id: r.id,
          kode: r.kode,
          kelompok: r.kelompok,
          no_tampilan: r.no_tampilan,
          urutan: Number(r.urutan || 1),
          uraian: r.uraian,
          aturan_alokasi: r.aturan_alokasi,
          is_sentralisasi: Boolean(r.is_sentralisasi),
          dialihkan_ke_pembangunan: Boolean(r.dialihkan_ke_pembangunan)
        })) as KategoriPenerimaanMaster[];

        if (typeof window !== 'undefined') {
          localStorage.setItem(STORAGE_KEYS.MASTER_PENERIMAAN, JSON.stringify(normalized));
        }
        return normalized;
      }
      if (error) {
        console.warn('[Supabase] Gagal memuat master_kategori_penerimaan:', error.message);
      }
    } catch (err: any) {
      console.warn('[Supabase] Koneksi master_kategori_penerimaan gagal:', err?.message || err);
    }
  }

  return getMasterKategoriPenerimaanSync();
}

export async function saveMasterKategoriPenerimaan(
  items: KategoriPenerimaanMaster[]
): Promise<void> {
  const normalized = items.map((it, idx) => ({
    id: it.id,
    kode: it.kode,
    kelompok: it.kelompok || '1.1',
    no_tampilan: it.no_tampilan || '',
    urutan: idx + 1,
    uraian: it.uraian,
    aturan_alokasi: it.aturan_alokasi,
    is_sentralisasi: Boolean(it.is_sentralisasi),
    dialihkan_ke_pembangunan: Boolean(it.dialihkan_ke_pembangunan)
  }));

  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEYS.MASTER_PENERIMAAN, JSON.stringify(normalized));
  }

  if (isSupabaseConfigured && supabase) {
    await syncMasterTable(
      'master_kategori_penerimaan',
      normalized.map((it) => ({ ...it, updated_at: new Date().toISOString() }))
    );
  }
}

export async function resetMasterKategoriPenerimaan(): Promise<KategoriPenerimaanMaster[]> {
  await saveMasterKategoriPenerimaan(MASTER_KATEGORI_PENERIMAAN);
  return MASTER_KATEGORI_PENERIMAAN;
}

export function getMasterKategoriPengeluaranSync(): KategoriPengeluaranMaster[] {
  if (typeof window === 'undefined') return MASTER_KATEGORI_PENGELUARAN;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.MASTER_PENGELUARAN);
    if (!raw) return MASTER_KATEGORI_PENGELUARAN;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : MASTER_KATEGORI_PENGELUARAN;
  } catch {
    return MASTER_KATEGORI_PENGELUARAN;
  }
}

export async function getMasterKategoriPengeluaran(): Promise<KategoriPengeluaranMaster[]> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('master_kategori_pengeluaran')
        .select('*')
        .order('urutan', { ascending: true });

      if (!error && data && data.length > 0) {
        const normalized = data.map((r: any) => ({
          id: r.id,
          kode: r.kode,
          urutan: Number(r.urutan || 1),
          uraian: r.uraian,
          pos_default: r.pos_default,
          is_sentralisasi: Boolean(r.is_sentralisasi)
        })) as KategoriPengeluaranMaster[];

        if (typeof window !== 'undefined') {
          localStorage.setItem(STORAGE_KEYS.MASTER_PENGELUARAN, JSON.stringify(normalized));
        }
        return normalized;
      }
      if (error) {
        console.warn('[Supabase] Gagal memuat master_kategori_pengeluaran:', error.message);
      }
    } catch (err: any) {
      console.warn('[Supabase] Koneksi master_kategori_pengeluaran gagal:', err?.message || err);
    }
  }

  return getMasterKategoriPengeluaranSync();
}

export async function saveMasterKategoriPengeluaran(
  items: KategoriPengeluaranMaster[]
): Promise<void> {
  const normalized = items.map((it, idx) => ({
    id: it.id,
    kode: it.kode,
    urutan: idx + 1,
    uraian: it.uraian,
    pos_default: it.pos_default,
    is_sentralisasi: Boolean(it.is_sentralisasi)
  }));

  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEYS.MASTER_PENGELUARAN, JSON.stringify(normalized));
  }

  if (isSupabaseConfigured && supabase) {
    await syncMasterTable(
      'master_kategori_pengeluaran',
      normalized.map((it) => ({ ...it, updated_at: new Date().toISOString() }))
    );
  }
}

export async function resetMasterKategoriPengeluaran(): Promise<KategoriPengeluaranMaster[]> {
  await saveMasterKategoriPengeluaran(MASTER_KATEGORI_PENGELUARAN);
  return MASTER_KATEGORI_PENGELUARAN;
}
