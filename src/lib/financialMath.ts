import {
  AturanAlokasi,
  HamauliateonItem,
  HamauliateonTransitoriItem,
  PenerimaanRow,
  PengeluaranItem,
  RekapitulasiKeuangan,
  SumbanganNatalItem,
  WartaRecord
} from '../types';

/**
 * Format number to Indonesian Rupiah representation
 * e.g. 1500000 -> "1.500.000"
 */
export function formatRupiah(amount: number | null | undefined): string {
  if (amount === undefined || amount === null || isNaN(amount)) return '0';
  return new Intl.NumberFormat('id-ID').format(amount);
}

/**
 * Format currency with optional "Rp" prefix
 */
export function formatCurrencyRp(amount: number | null | undefined): string {
  return `Rp ${formatRupiah(amount)}`;
}

/**
 * Parse string into integer number (removes dots, non-digits)
 */
export function parseRupiahInput(value: string | number): number {
  if (typeof value === 'number') return isNaN(value) ? 0 : Math.round(value);
  const clean = value.replace(/[^\d-]/g, '');
  const parsed = parseInt(clean, 10);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Split Kas Huria amount into 45% Kas Huria and 55% Sentralisasi (when centralized)
 */
export function calculateHuriaSentralSplit(
  amount: number,
  applySentralisasi = true
): { huria45: number; sentral55: number } {
  const val = Math.max(0, Math.round(amount || 0));
  if (!applySentralisasi || val === 0) {
    return { huria45: val, sentral55: 0 };
  }
  const sentral55 = Math.round(val * 0.55);
  const huria45 = val - sentral55;
  return { huria45, sentral55 };
}

/**
 * Return normalized list of transitori allocations on a HamauliateonItem,
 * falling back seamlessly to legacy single transitori_kode/ke_transitori fields.
 */
export function getHamauliateonTransitoriList(
  h: HamauliateonItem
): HamauliateonTransitoriItem[] {
  if (Array.isArray(h.transitori_items) && h.transitori_items.length > 0) {
    return h.transitori_items.map((t, idx) => ({
      id: t.id || `tr-${h.id || 'ham'}-${idx + 1}`,
      kode: t.kode || '',
      uraian: t.uraian || '',
      jumlah: Math.max(0, Math.round(t.jumlah || 0))
    }));
  }
  const legacyAmt = Math.max(0, Math.round(h.ke_transitori || 0));
  if (legacyAmt > 0 || h.transitori_kode || h.transitori_uraian) {
    return [
      {
        id: `tr-${h.id || 'ham'}-1`,
        kode: h.transitori_kode || '',
        uraian: h.transitori_uraian || '',
        jumlah: legacyAmt
      }
    ];
  }
  return [];
}

/**
 * Sum all transitori allocations for a single HamauliateonItem
 */
export function calculateHamauliateonTransitoriSum(h: HamauliateonItem): number {
  if (Array.isArray(h.transitori_items) && h.transitori_items.length > 0) {
    return h.transitori_items.reduce(
      (acc, cur) => acc + Math.max(0, Math.round(cur.jumlah || 0)),
      0
    );
  }
  return Math.max(0, Math.round(h.ke_transitori || 0));
}

/**
 * Calculate multi-pos breakdown totals for Hamauliateon (Ucapan Syukur)
 * Allocates across Kas Huria (with 55% Sentralisasi / 45% Huria when active), Sosial Huria, Pembangunan, and Transitori.
 */
export function calculateHamauliateonTotals(
  items: HamauliateonItem[],
  applyHuriaSentralisasi = true
): {
  totalJumlah: number;
  totalHuria: number;
  totalSosial: number;
  totalPembangunan: number;
  totalSentral: number;
  totalTransitori: number;
  totalRawHuria: number;
} {
  let totalJumlah = 0;
  let totalHuria = 0;
  let totalSosial = 0;
  let totalPembangunan = 0;
  let totalSentral = 0;
  let totalTransitori = 0;
  let totalRawHuria = 0;

  for (const h of items || []) {
    const huriaInput = Math.max(0, Math.round(h.ke_huria || 0));
    const sosial = Math.max(0, Math.round(h.ke_sosial || 0));
    const pemb = Math.max(0, Math.round(h.ke_pembangunan || 0));
    const legacySentral = Math.max(0, Math.round(h.ke_sentralisasi || 0));
    const trans = calculateHamauliateonTransitoriSum(h);
    const sumPos = huriaInput + sosial + pemb + legacySentral + trans;

    if (sumPos > 0) {
      const { huria45, sentral55 } = calculateHuriaSentralSplit(huriaInput, applyHuriaSentralisasi);
      totalRawHuria += huriaInput;
      totalHuria += huria45;
      totalSosial += sosial;
      totalPembangunan += pemb;
      totalSentral += sentral55 + legacySentral;
      totalTransitori += trans;
      totalJumlah += sumPos;
    } else {
      // Default: If no individual pos breakdown is given, allocate to Kas Huria
      const j = Math.max(0, Math.round(h.jumlah || 0));
      const { huria45, sentral55 } = calculateHuriaSentralSplit(j, applyHuriaSentralisasi);
      totalRawHuria += j;
      totalHuria += huria45;
      totalSentral += sentral55;
      totalJumlah += j;
    }
  }

  return {
    totalJumlah,
    totalHuria,
    totalSosial,
    totalPembangunan,
    totalSentral,
    totalTransitori,
    totalRawHuria
  };
}

/**
 * Sync Hamauliateon items into the HAM_LAIN (1.2.17) row of Penerimaan.
 * Ke Kas Huria on Hamauliateon is always subject to the 55% Sentralisasi / 45% Kas Huria rule,
 * while Sosial, Pembangunan, and Transitori remain 100% in their respective pos.
 */
export function syncHamauliateonToPenerimaanRows(
  penerimaanRows: PenerimaanRow[],
  hamauliateonItems: HamauliateonItem[]
): PenerimaanRow[] {
  const hamTotals = calculateHamauliateonTotals(hamauliateonItems || [], true);
  return (penerimaanRows || []).map((r) => {
    if (r.kode === 'HAM_LAIN' || r.no_tampilan === '1.2.17') {
      return {
        ...r,
        jumlah: hamTotals.totalJumlah,
        aturan_alokasi: 'manual' as const,
        is_sentralisasi: true,
        huria_45: hamTotals.totalHuria,
        sosial: hamTotals.totalSosial,
        pembangunan: hamTotals.totalPembangunan,
        sentral_55: hamTotals.totalSentral,
        transitori: hamTotals.totalTransitori
      };
    }
    return r;
  });
}

export const SUMBANGAN_NATAL_KODE = 'SUMB_NATAL_DIAKONI';

/**
 * Calculate subtotal for Sumbangan Natal Diakoni Sosial
 */
export function calculateSumbanganNatalTotal(
  items?: SumbanganNatalItem[]
): number {
  return (items || []).reduce(
    (acc, cur) => acc + Math.max(0, Math.round(cur.jumlah || 0)),
    0
  );
}

/**
 * Break down Sumbangan Natal Diakoni Sosial into total accumulated amount,
 * amount already recorded in previous weeks (dari_minggu_lalu), and new donations this week.
 */
export function calculateSumbanganNatalBreakdown(items?: SumbanganNatalItem[]): {
  subTotal: number;
  dariMingguLalu: number;
  mingguIni: number;
} {
  let subTotal = 0;
  let dariMingguLalu = 0;

  for (const cur of items || []) {
    const amt = Math.max(0, Math.round(cur.jumlah || 0));
    subTotal += amt;
    if (cur.dari_minggu_lalu) {
      dariMingguLalu += amt;
    }
  }

  return {
    subTotal,
    dariMingguLalu,
    mingguIni: Math.max(0, subTotal - dariMingguLalu)
  };
}

export function getPenerimaanRowKelompok(
  item: { kelompok?: string; no_tampilan?: string },
  fallbackIndex?: number
): '1.1' | '1.2' | '1.3' {
  const kel = (item.kelompok || '').trim();
  if (kel === '1.1' || kel === '1.2' || kel === '1.3') return kel;
  const no = (item.no_tampilan || '').trim();
  if (no.startsWith('1.1')) return '1.1';
  if (no.startsWith('1.2')) return '1.2';
  if (no.startsWith('1.3')) return '1.3';
  if (typeof fallbackIndex === 'number') {
    if (fallbackIndex < 10) return '1.1';
    if (fallbackIndex < 27) return '1.2';
    return '1.3';
  }
  return '1.1';
}

export function getNextNoTampilanForKelompok(
  rows: Array<{ kelompok?: string; no_tampilan?: string }>,
  kelompok: '1.1' | '1.2' | '1.3'
): string {
  const inGroup = rows.filter((r, idx) => getPenerimaanRowKelompok(r, idx) === kelompok);
  let maxSuffix = inGroup.length;
  for (const r of inGroup) {
    const no = (r.no_tampilan || '').trim();
    if (no.startsWith(`${kelompok}.`)) {
      const num = parseInt(no.slice(kelompok.length + 1), 10);
      if (!Number.isNaN(num) && num > maxSuffix) {
        maxSuffix = num;
      }
    }
  }
  return `${kelompok}.${maxSuffix + 1}`;
}

/**
 * Insert a new Penerimaan item at the end of its matching kelompok section (1.1, 1.2, or 1.3),
 * keeping canonical group order (1.1 < 1.2 < 1.3) if the target group is currently empty,
 * and re-indexing sequential `urutan` (1..N).
 */
export function insertPenerimaanItemByKelompok<
  T extends { kelompok?: string; no_tampilan?: string; urutan?: number }
>(rows: T[], newItem: T): T[] {
  const targetKel = getPenerimaanRowKelompok(newItem);
  const groupOrder: Record<'1.1' | '1.2' | '1.3', number> = {
    '1.1': 1,
    '1.2': 2,
    '1.3': 3
  };

  let insertIndex = -1;
  for (let i = 0; i < rows.length; i++) {
    if (getPenerimaanRowKelompok(rows[i], i) === targetKel) {
      insertIndex = i + 1;
    }
  }

  if (insertIndex === -1) {
    const targetRank = groupOrder[targetKel];
    const firstLaterIdx = rows.findIndex(
      (r, idx) => groupOrder[getPenerimaanRowKelompok(r, idx)] > targetRank
    );
    insertIndex = firstLaterIdx >= 0 ? firstLaterIdx : rows.length;
  }

  const next = [
    ...rows.slice(0, insertIndex),
    { ...newItem, kelompok: targetKel },
    ...rows.slice(insertIndex)
  ];

  return next.map((r, idx) => ({ ...r, urutan: idx + 1 }));
}

export function insertManyPenerimaanItemsByKelompok<
  T extends { kelompok?: string; no_tampilan?: string; urutan?: number }
>(rows: T[], newItems: T[]): T[] {
  return newItems.reduce((acc, item) => insertPenerimaanItemByKelompok(acc, item), rows);
}

/**
 * Move any Penerimaan row freely from `fromIndex` to `toIndex` and re-index `urutan` (1..N).
 */
export function movePenerimaanItem<T extends { urutan?: number }>(
  rows: T[],
  fromIndex: number,
  toIndex: number
): T[] {
  if (
    fromIndex === toIndex ||
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= rows.length ||
    toIndex >= rows.length
  ) {
    return rows;
  }
  const next = [...rows];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next.map((r, idx) => ({ ...r, urutan: idx + 1 }));
}

/**
 * Group existing Penerimaan rows into canonical order 1.1 -> 1.2 -> 1.3
 * while preserving relative order inside each group.
 */
export function sortPenerimaanItemsByKelompok<
  T extends { kelompok?: string; no_tampilan?: string; urutan?: number }
>(rows: T[]): T[] {
  const g11: T[] = [];
  const g12: T[] = [];
  const g13: T[] = [];
  rows.forEach((r, idx) => {
    const k = getPenerimaanRowKelompok(r, idx);
    const normalized = { ...r, kelompok: k };
    if (k === '1.1') g11.push(normalized);
    else if (k === '1.2') g12.push(normalized);
    else g13.push(normalized);
  });
  return [...g11, ...g12, ...g13].map((r, idx) => ({ ...r, urutan: idx + 1 }));
}

/**
 * Sync Sumbangan Natal Diakoni Sosial into Penerimaan rows (100% allocated to Kas Sosial Huria).
 * Only new donations for the active week (!dari_minggu_lalu) are added to weekly Kas Sosial Huria
 * receipts to avoid double-counting carried-over rows already in Saldo Awal.
 * When hidden (isVisible === false), forces the synced row amount to 0.
 */
export function syncSumbanganNatalToPenerimaanRows(
  penerimaanRows: PenerimaanRow[],
  items: SumbanganNatalItem[] = [],
  isVisible = true,
  wartaId?: string
): PenerimaanRow[] {
  const { mingguIni } = calculateSumbanganNatalBreakdown(items);
  const subTotal = isVisible ? mingguIni : 0;
  const rows = penerimaanRows || [];
  const existingIdx = rows.findIndex((r) => r.kode === SUMBANGAN_NATAL_KODE);

  if (existingIdx >= 0) {
    return rows.map((r, idx) =>
      idx === existingIdx
        ? {
            ...r,
            uraian: r.uraian || 'Sumbangan Natal Diakoni Sosial',
            aturan_alokasi: 'sosial' as const,
            is_sentralisasi: false,
            dialihkan_ke_pembangunan: false,
            jumlah: subTotal,
            huria_45: 0,
            sosial: subTotal,
            pembangunan: 0,
            sentral_55: 0,
            transitori: 0
          }
        : r
    );
  }

  if (subTotal <= 0) {
    return rows;
  }

  const newRow: PenerimaanRow = {
    id: wartaId ? `pen-SUMB_NATAL-${wartaId}` : `pen-SUMB_NATAL-${Date.now()}`,
    kode: SUMBANGAN_NATAL_KODE,
    kelompok: '1.2',
    no_tampilan: '1.2.18',
    urutan: 27,
    uraian: 'Sumbangan Natal Diakoni Sosial',
    aturan_alokasi: 'sosial',
    is_sentralisasi: false,
    dialihkan_ke_pembangunan: false,
    jumlah: subTotal,
    huria_45: 0,
    sosial: subTotal,
    pembangunan: 0,
    sentral_55: 0,
    transitori: 0
  };

  // Insert right after the last 1.2 item so numbering stays grouped cleanly
  let insertAfterIdx = -1;
  rows.forEach((r, idx) => {
    if (r.kelompok === '1.2' || (r.no_tampilan && r.no_tampilan.startsWith('1.2'))) {
      insertAfterIdx = idx;
    }
  });

  if (insertAfterIdx >= 0) {
    return [
      ...rows.slice(0, insertAfterIdx + 1),
      newRow,
      ...rows.slice(insertAfterIdx + 1)
    ];
  }
  return [...rows, newRow];
}

/**
 * Calculate distribution for a single Penerimaan row
 * Supports user-selected Sentralisasi (Ya / Tidak)
 */
export function calculateRowAlokasi(
  jumlah: number,
  aturan: AturanAlokasi,
  dialihkanKePembangunan = false,
  isSentralisasi?: boolean
): {
  huria_45: number;
  sosial: number;
  pembangunan: number;
  sentral_55: number;
  transitori: number;
} {
  const val = Math.max(0, Math.round(jumlah || 0));

  let huria_45 = 0;
  let sosial = 0;
  let pembangunan = 0;
  let sentral_55 = 0;
  let transitori = 0;

  // Cek apakah item dikenakan aturan setoran 55% ke sentralisasi
  const applySentralisasi =
    isSentralisasi !== undefined ? isSentralisasi : aturan === 'split_45_55';

  if (applySentralisasi) {
    // Kena aturan setoran 55% ke sentralisasi
    sentral_55 = Math.round(val * 0.55);
    const remaining_45 = val - sentral_55; // Menghindari selisih 1 rupiah

    if (dialihkanKePembangunan || aturan === 'pembangunan') {
      pembangunan = remaining_45;
    } else if (aturan === 'sosial') {
      sosial = remaining_45;
    } else if (aturan === 'transitori') {
      transitori = remaining_45;
    } else {
      huria_45 = remaining_45;
    }
  } else {
    // Tidak kena sentralisasi: 0% sentralisasi, 100% dialokasikan ke pos huria / pos bersangkutan
    sentral_55 = 0;
    if (dialihkanKePembangunan || aturan === 'pembangunan') {
      pembangunan = val;
    } else if (aturan === 'sosial') {
      sosial = val;
    } else if (aturan === 'transitori') {
      transitori = val;
    } else {
      huria_45 = val;
    }
  }

  return {
    huria_45,
    sosial,
    pembangunan,
    sentral_55,
    transitori
  };
}

/**
 * Recalculate complete Penerimaan rows with sum
 */
export function recalculatePenerimaanRows(rows: PenerimaanRow[]): {
  updatedRows: PenerimaanRow[];
  totalJumlah: number;
  totalHuria: number;
  totalSosial: number;
  totalPembangunan: number;
  totalSentral: number;
  totalTransitori: number;
} {
  let totalJumlah = 0;
  let totalHuria = 0;
  let totalSosial = 0;
  let totalPembangunan = 0;
  let totalSentral = 0;
  let totalTransitori = 0;

  const updatedRows = (rows || []).map((r) => {
    let dist: {
      huria_45: number;
      sosial: number;
      pembangunan: number;
      sentral_55: number;
      transitori: number;
    };

    if (r.aturan_alokasi === 'manual') {
      // Respect multi-pos breakdown directly configured on the row (e.g. from Hamauliateon Rincian C)
      dist = {
        huria_45: r.huria_45 || 0,
        sosial: r.sosial || 0,
        pembangunan: r.pembangunan || 0,
        sentral_55: r.sentral_55 || 0,
        transitori: r.transitori || 0
      };
    } else {
      const isSentral =
        r.is_sentralisasi !== undefined
          ? r.is_sentralisasi
          : r.aturan_alokasi === 'split_45_55';

      dist = calculateRowAlokasi(
        r.jumlah,
        r.aturan_alokasi,
        r.dialihkan_ke_pembangunan,
        isSentral
      );
    }

    totalJumlah += r.jumlah;
    totalHuria += dist.huria_45;
    totalSosial += dist.sosial;
    totalPembangunan += dist.pembangunan;
    totalSentral += dist.sentral_55;
    totalTransitori += dist.transitori;

    return {
      ...r,
      ...dist
    };
  });

  return {
    updatedRows,
    totalJumlah,
    totalHuria,
    totalSosial,
    totalPembangunan,
    totalSentral,
    totalTransitori
  };
}

/**
 * Filter Penerimaan rows for print/public view: omit items with no transactions (jumlah <= 0)
 */
export function getPrintablePenerimaanRows(rows: PenerimaanRow[]): PenerimaanRow[] {
  return (rows || []).filter((r) => (r.jumlah || 0) > 0);
}

/**
 * Filter Pengeluaran items for print/public view: omit items with zero total across all funds
 */
export function getPrintablePengeluaranRows(items: PengeluaranItem[]): PengeluaranItem[] {
  return (items || []).filter((p) => {
    const total =
      (p.huria || 0) +
      (p.sosial || 0) +
      (p.pembangunan || 0) +
      (p.transitori || 0) +
      (p.sentralisasi || 0);
    return total > 0;
  });
}

/**
 * Sum pengeluaran per dana (termasuk porsi sentralisasi jika ada pengeluaran dengan Sentralisasi? Ya)
 */
export function calculatePengeluaranTotals(items: PengeluaranItem[]): {
  totalHuria: number;
  totalSosial: number;
  totalPembangunan: number;
  totalSentral: number;
  totalTransitori: number;
  totalPengeluaran: number;
} {
  let totalHuria = 0;
  let totalSosial = 0;
  let totalPembangunan = 0;
  let totalSentral = 0;
  let totalTransitori = 0;

  for (const item of (items || [])) {
    totalHuria += item.huria || 0;
    totalSosial += item.sosial || 0;
    totalPembangunan += item.pembangunan || 0;
    totalTransitori += item.transitori || 0;
    totalSentral += item.sentralisasi || 0;
  }

  return {
    totalHuria,
    totalSosial,
    totalPembangunan,
    totalSentral,
    totalTransitori,
    totalPengeluaran: totalHuria + totalSosial + totalPembangunan + totalSentral + totalTransitori
  };
}

/**
 * Calculate full Rekapitulasi Keuangan 5 Pos Dana
 */
export function calculateRekapitulasi(
  warta: WartaRecord,
  penerimaanRows: PenerimaanRow[],
  pengeluaranItems: PengeluaranItem[]
): RekapitulasiKeuangan {
  const penerimaanTotals = recalculatePenerimaanRows(penerimaanRows);
  const pengeluaranTotals = calculatePengeluaranTotals(pengeluaranItems);

  // 1. Kas Huria
  const huriaAwal = warta.saldo_awal_huria || 0;
  const huriaMasuk = penerimaanTotals.totalHuria;
  const huriaKeluar = pengeluaranTotals.totalHuria;
  const huriaAkhir = huriaAwal + huriaMasuk - huriaKeluar;

  // 2. Sosial Huria
  const sosAwal = warta.saldo_awal_sosial || 0;
  const sosMasuk = penerimaanTotals.totalSosial;
  const sosKeluar = pengeluaranTotals.totalSosial;
  const sosAkhir = sosAwal + sosMasuk - sosKeluar;

  // 3. Pembangunan Huria
  const pembAwal = warta.saldo_awal_pembangunan || 0;
  const pembMasuk = penerimaanTotals.totalPembangunan;
  const pembKeluar = pengeluaranTotals.totalPembangunan;
  const pembAkhir = pembAwal + pembMasuk - pembKeluar;

  // 4. Sentralisasi 55% (Penyetoran 55% dari penerimaan rutin + pengeluaran sentralisasi langsung bila ada)
  const sentralAwal = warta.saldo_awal_sentralisasi || 0;
  const sentralMasuk = penerimaanTotals.totalSentral;
  const sentralKeluar = sentralMasuk + pengeluaranTotals.totalSentral;
  const sentralAkhir = sentralAwal + sentralMasuk - sentralKeluar;

  // 5. Transitori
  const transAwal = warta.saldo_awal_transitori || 0;
  const transMasuk = penerimaanTotals.totalTransitori;
  const transKeluar = pengeluaranTotals.totalTransitori;
  const transAkhir = transAwal + transMasuk - transKeluar;

  const totalMasuk = penerimaanTotals.totalJumlah;
  const sumAlokasi =
    huriaMasuk + sosMasuk + pembMasuk + sentralMasuk + transMasuk;
  const selisih = totalMasuk - sumAlokasi;
  const isBalanced = Math.abs(selisih) === 0;

  const totalAwal = huriaAwal + sosAwal + pembAwal + sentralAwal + transAwal;
  const totalKeluar =
    huriaKeluar + sosKeluar + pembKeluar + sentralKeluar + transKeluar;
  const totalAkhir = huriaAkhir + sosAkhir + pembAkhir + sentralAkhir + transAkhir;

  return {
    huria: {
      pos: '1. Kas Huria',
      saldo_awal: huriaAwal,
      masuk: huriaMasuk,
      keluar: huriaKeluar,
      saldo_akhir: huriaAkhir
    },
    sosial: {
      pos: '2. Kas Sosial Huria',
      saldo_awal: sosAwal,
      masuk: sosMasuk,
      keluar: sosKeluar,
      saldo_akhir: sosAkhir
    },
    pembangunan: {
      pos: '3. Kas Pembangunan Huria',
      saldo_awal: pembAwal,
      masuk: pembMasuk,
      keluar: pembKeluar,
      saldo_akhir: pembAkhir
    },
    sentralisasi: {
      pos: '4. Sentralisasi Keuangan (55%)',
      saldo_awal: sentralAwal,
      masuk: sentralMasuk,
      keluar: sentralKeluar,
      saldo_akhir: sentralAkhir
    },
    transitori: {
      pos: '5. Dana Transitori',
      saldo_awal: transAwal,
      masuk: transMasuk,
      keluar: transKeluar,
      saldo_akhir: transAkhir
    },
    total_saldo_awal: totalAwal,
    total_masuk: totalMasuk,
    total_keluar: totalKeluar,
    total_saldo_akhir: totalAkhir,
    is_balanced: isBalanced,
    selisih
  };
}
