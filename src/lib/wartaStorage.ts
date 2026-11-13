import {
  AnggotaJemaat,
  FullWartaData,
  JadwalTetapItem,
  KategoriPenerimaanMaster,
  KategoriPengeluaranMaster,
  LingkunganItem,
  PengaturanHuria,
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

// Initialize local storage if empty
function initializeLocalStorage() {
  const existingPeng = localStorage.getItem(STORAGE_KEYS.PENGATURAN);
  if (!existingPeng) {
    localStorage.setItem(STORAGE_KEYS.PENGATURAN, JSON.stringify(DEFAULT_PENGATURAN));
  } else {
    try {
      const parsed = JSON.parse(existingPeng);
      if (!parsed.logo_salib_url) {
        parsed.logo_salib_url = '/assets/aistudio/Logo-HKBP_02090ed7.png';
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

// Run initial local storage setup
if (typeof window !== 'undefined') {
  initializeLocalStorage();
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
      if (!error && data && data.length > 0) {
        return data as WartaRecord[];
      }
    } catch {
      // fallback to local storage
    }
  }

  try {
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
      const { data: warta, error } = await supabase.from('warta').select('*').eq('id', id).single();
      if (!error && warta) {
        const [
          { data: acara_minggu },
          { data: acara_partangiangan },
          { data: parhobas },
          { data: sopo_godang },
          { data: jadwal_partangiangan },
          { data: pengumuman },
          { data: pelean_taon },
          { data: hamauliateon },
          { data: pengeluaran }
        ] = await Promise.all([
          supabase.from('acara_ibadah').select('*').eq('warta_id', id).eq('jenis', 'minggu').order('urutan'),
          supabase.from('acara_ibadah').select('*').eq('warta_id', id).eq('jenis', 'partangiangan').order('urutan'),
          supabase.from('parhobas').select('*').eq('warta_id', id).order('urutan'),
          supabase.from('sopo_godang').select('*').eq('warta_id', id).order('urutan'),
          supabase.from('jadwal_partangiangan').select('*').eq('warta_id', id).order('urutan'),
          supabase.from('pengumuman').select('*').eq('warta_id', id).order('urutan'),
          supabase.from('pelean_taon').select('*').eq('warta_id', id).order('urutan'),
          supabase.from('hamauliateon').select('*').eq('warta_id', id).order('urutan'),
          supabase.from('pengeluaran').select('*').eq('warta_id', id).order('urutan')
        ]);

        const peleanSum = (pelean_taon || []).reduce((acc, c) => acc + (c.jumlah || 0), 0);
        const hamSum = (hamauliateon || []).reduce((acc, c) => acc + (c.jumlah || 0), 0);
        const penerimaan = createDefaultPenerimaanRows(peleanSum, hamSum, (hamauliateon || []) as any);

        // Read snapshot from saved warta data so public users never touch the protected anggota table
        const ultah = (warta as any).ulang_tahun_snapshot || (warta as any).ulang_tahun || [];

        const rekap = calculateRekapitulasi(
          warta as WartaRecord,
          penerimaan,
          pengeluaran || []
        );

        return {
          warta: warta as WartaRecord,
          acara_minggu: (acara_minggu || []) as any,
          acara_partangiangan: (acara_partangiangan || []) as any,
          parhobas: (parhobas || []) as any,
          sopo_godang: (sopo_godang || []) as any,
          jadwal_partangiangan: (jadwal_partangiangan || []) as any,
          pengumuman: (pengumuman || []) as any,
          penerimaan,
          pelean_taon: (pelean_taon || []) as any,
          hamauliateon: (hamauliateon || []) as any,
          pengeluaran: (pengeluaran || []) as any,
          ulang_tahun: ultah,
          rekapitulasi: rekap
        };
      }
    } catch {
      // fallback
    }
  }

  try {
    const raw = localStorage.getItem(`${STORAGE_KEYS.FULL_WARTA_PREFIX}${id}`);
    if (raw) {
      const data: FullWartaData = JSON.parse(raw);
      // Read saved snapshot, do not query anggota table
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

  // If ID matches initial
  if (id === INITIAL_WARTA_RECORD.id) {
    return getInitialFullWarta();
  }

  return null;
}

/**
 * Save warta data
 */
export async function saveWarta(data: FullWartaData): Promise<void> {
  data.warta.updated_at = new Date().toISOString();

  // Snapshot ulang tahun ke record warta sehingga pembaca publik tidak mengakses tabel anggota
  data.warta.ulang_tahun_snapshot = data.ulang_tahun || [];

  // Recalculate rekapitulasi
  data.rekapitulasi = calculateRekapitulasi(
    data.warta,
    data.penerimaan,
    data.pengeluaran
  );

  // 1. Try Supabase
  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.from('warta').upsert(data.warta);
      // Synchronize child tables in background
    } catch {
      // silently proceed to local storage
    }
  }

  // 2. Save in LocalStorage
  localStorage.setItem(
    `${STORAGE_KEYS.FULL_WARTA_PREFIX}${data.warta.id}`,
    JSON.stringify(data)
  );

  const rawList = localStorage.getItem(STORAGE_KEYS.WARTAS);
  let list: WartaRecord[] = rawList ? JSON.parse(rawList) : [];
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
    try {
      await supabase.from('warta').delete().eq('id', id);
    } catch {
      //
    }
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
  // Find latest warta to inherit ending balances
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

  const newId = `warta-${tanggalMinggu}`;

  const warta: WartaRecord = {
    id: newId,
    tanggal_minggu: tanggalMinggu,
    status: 'draft',
    goar_minggu: goarMinggu || 'MINGGU',
    topik_minggu: topikMinggu || '',
    ayat_teks: DEFAULT_PENGATURAN.ayat_tetap_default,
    ayat_ref: DEFAULT_PENGATURAN.ayat_ref_default,
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
    id: `am-${idx + 1}-${Date.now()}`,
    warta_id: newId,
    jenis: 'minggu' as const,
    urutan: idx + 1,
    uraian: it.uraian,
    keterangan: it.keterangan || ''
  }));

  const acara_partangiangan = DEFAULT_ACARA_PARTANGIANGAN_TEMPLATE.map((it, idx) => ({
    id: `ap-${idx + 1}-${Date.now()}`,
    warta_id: newId,
    jenis: 'partangiangan' as const,
    urutan: idx + 1,
    uraian: it.uraian,
    keterangan: it.keterangan || ''
  }));

  const parhobas = INITIAL_PARHOBAS.map((p) => ({
    ...p,
    id: `ph-${p.peran}-${Date.now()}`,
    warta_id: newId
  }));

  const sopo_godang = [
    { id: `sg-1-${Date.now()}`, warta_id: newId, urutan: 1, nama: '-', tanggal: '-' },
    { id: `sg-2-${Date.now()}`, warta_id: newId, urutan: 2, nama: '-', tanggal: '-' },
    { id: `sg-3-${Date.now()}`, warta_id: newId, urutan: 3, nama: '-', tanggal: '-' },
    { id: `sg-4-${Date.now()}`, warta_id: newId, urutan: 4, nama: '-', tanggal: '-' },
    { id: `sg-5-${Date.now()}`, warta_id: newId, urutan: 5, nama: '-', tanggal: '-' }
  ];

  const jadwal_partangiangan = DEFAULT_LINGKUNGAN.map((l, idx) => ({
    id: `jp-${l.id}-${Date.now()}`,
    warta_id: newId,
    hari: `${l.hari_default}`,
    lingkungan: l.nama,
    pukul: l.jam_default,
    inganan: 'Kel. ',
    urutan: idx + 1
  }));

  const pengumuman = [
    {
      id: `peng-1-${Date.now()}`,
      warta_id: newId,
      urutan: 1,
      judul: 'Tingting Parguruan / Jadwal Pelayanan',
      isi: 'Dipangido tu sude Parhalado dohot ruas asa marroan tu partangiangan lingkungan.'
    }
  ];

  const masterPenerimaan = await getMasterKategoriPenerimaan();
  const penerimaan = createDefaultPenerimaanRows(0, 0, [], masterPenerimaan, false);
  const pelean_taon: any[] = [];
  const hamauliateon: any[] = [];
  const pengeluaran: any[] = [];

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

// Master settings functions
export async function getPengaturan(): Promise<PengaturanHuria> {
  const raw = localStorage.getItem(STORAGE_KEYS.PENGATURAN);
  const data: PengaturanHuria = raw ? JSON.parse(raw) : { ...DEFAULT_PENGATURAN };
  if (!data.logo_salib_url) {
    data.logo_salib_url = '/assets/aistudio/Logo-HKBP_02090ed7.png';
  }
  return data;
}

export async function savePengaturan(data: PengaturanHuria): Promise<void> {
  localStorage.setItem(STORAGE_KEYS.PENGATURAN, JSON.stringify(data));
}

export async function getJadwalTetap(): Promise<JadwalTetapItem[]> {
  const raw = localStorage.getItem(STORAGE_KEYS.JADWAL_TETAP);
  return raw ? JSON.parse(raw) : DEFAULT_JADWAL_TETAP;
}

export async function saveJadwalTetap(items: JadwalTetapItem[]): Promise<void> {
  localStorage.setItem(STORAGE_KEYS.JADWAL_TETAP, JSON.stringify(items));
}

export async function getLingkungan(): Promise<LingkunganItem[]> {
  const raw = localStorage.getItem(STORAGE_KEYS.LINGKUNGAN);
  return raw ? JSON.parse(raw) : DEFAULT_LINGKUNGAN;
}

export async function saveLingkungan(items: LingkunganItem[]): Promise<void> {
  localStorage.setItem(STORAGE_KEYS.LINGKUNGAN, JSON.stringify(items));
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
  return getMasterKategoriPenerimaanSync();
}

export async function saveMasterKategoriPenerimaan(
  items: KategoriPenerimaanMaster[]
): Promise<void> {
  if (typeof window === 'undefined') return;
  const normalized = items.map((it, idx) => ({ ...it, urutan: idx + 1 }));
  localStorage.setItem(STORAGE_KEYS.MASTER_PENERIMAAN, JSON.stringify(normalized));
}

export async function resetMasterKategoriPenerimaan(): Promise<KategoriPenerimaanMaster[]> {
  if (typeof window !== 'undefined') {
    localStorage.setItem(
      STORAGE_KEYS.MASTER_PENERIMAAN,
      JSON.stringify(MASTER_KATEGORI_PENERIMAAN)
    );
  }
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
  return getMasterKategoriPengeluaranSync();
}

export async function saveMasterKategoriPengeluaran(
  items: KategoriPengeluaranMaster[]
): Promise<void> {
  if (typeof window === 'undefined') return;
  const normalized = items.map((it, idx) => ({ ...it, urutan: idx + 1 }));
  localStorage.setItem(STORAGE_KEYS.MASTER_PENGELUARAN, JSON.stringify(normalized));
}

export async function resetMasterKategoriPengeluaran(): Promise<KategoriPengeluaranMaster[]> {
  if (typeof window !== 'undefined') {
    localStorage.setItem(
      STORAGE_KEYS.MASTER_PENGELUARAN,
      JSON.stringify(MASTER_KATEGORI_PENGELUARAN)
    );
  }
  return MASTER_KATEGORI_PENGELUARAN;
}
