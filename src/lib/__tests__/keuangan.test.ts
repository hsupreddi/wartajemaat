import { describe, it, expect } from 'vitest';
import {
  calculateRowAlokasi,
  recalculatePenerimaanRows,
  getPrintablePenerimaanRows,
  getPrintablePengeluaranRows,
  calculatePengeluaranTotals,
  calculateRekapitulasi,
  calculateHamauliateonTotals,
  getHamauliateonTransitoriList,
  syncHamauliateonToPenerimaanRows,
  SUMBANGAN_NATAL_KODE,
  calculateSumbanganNatalTotal,
  calculateSumbanganNatalBreakdown,
  syncSumbanganNatalToPenerimaanRows,
  getNextNoTampilanForKelompok,
  insertPenerimaanItemByKelompok,
  insertManyPenerimaanItemsByKelompok,
  movePenerimaanItem,
  sortPenerimaanItemsByKelompok
} from '../keuangan';
import {
  formatRupiah,
  parseRupiahInput,
  formatTanggalIndo,
  formatHeaderMinggu
} from '../format';
import {
  getInitialFullWarta,
  INITIAL_WARTA_RECORD,
  MASTER_KATEGORI_PENERIMAAN,
  createDefaultPenerimaanRows
} from '../mockData';

describe('HKBP Financial Calculations (keuangan.ts)', () => {
  it('correctly splits 45/55 without penny drift', () => {
    // Test with Rp 1.000.000
    const alloc1 = calculateRowAlokasi(1000000, 'split_45_55', false);
    expect(alloc1.sentral_55).toBe(550000);
    expect(alloc1.huria_45).toBe(450000);
    expect(alloc1.sentral_55 + alloc1.huria_45).toBe(1000000);

    // Test with odd amount Rp 123.456 (checks integer rounding preservation)
    const alloc2 = calculateRowAlokasi(123456, 'split_45_55', false);
    expect(alloc2.sentral_55 + alloc2.huria_45).toBe(123456);
  });

  it('correctly directs 45% to Pembangunan when dialihkanKePembangunan is true (e.g. Pel 1b)', () => {
    const alloc = calculateRowAlokasi(850000, 'split_45_55', true);
    expect(alloc.sentral_55).toBe(467500);
    expect(alloc.huria_45).toBe(0);
    expect(alloc.pembangunan).toBe(382500);
    expect(alloc.sentral_55 + alloc.pembangunan).toBe(850000);
  });

  it('allocates 100% to specific funds for non-split categories', () => {
    const allocSos = calculateRowAlokasi(500000, 'sosial');
    expect(allocSos.sosial).toBe(500000);
    expect(allocSos.huria_45).toBe(0);

    const allocPemb = calculateRowAlokasi(750000, 'pembangunan');
    expect(allocPemb.pembangunan).toBe(750000);

    const allocTrans = calculateRowAlokasi(250000, 'transitori');
    expect(allocTrans.transitori).toBe(250000);

    const allocHuria = calculateRowAlokasi(300000, 'huria');
    expect(allocHuria.huria_45).toBe(300000);
  });

  it('respects user choice for Sentralisasi? Ya/Tidak', () => {
    // User chooses "Tidak" on a row with split_45_55
    const allocTidak = calculateRowAlokasi(1000000, 'split_45_55', false, false);
    expect(allocTidak.sentral_55).toBe(0);
    expect(allocTidak.huria_45).toBe(1000000);

    // User chooses "Ya" on a row with huria
    const allocYa = calculateRowAlokasi(1000000, 'huria', false, true);
    expect(allocYa.sentral_55).toBe(550000);
    expect(allocYa.huria_45).toBe(450000);

    // User chooses "Ya" with dialihkan ke pembangunan
    const allocYaPemb = calculateRowAlokasi(1000000, 'pembangunan', true, true);
    expect(allocYaPemb.sentral_55).toBe(550000);
    expect(allocYaPemb.pembangunan).toBe(450000);
    expect(allocYaPemb.huria_45).toBe(0);
  });

  it('tracks Pengeluaran with Sentralisasi? Ya in Rekapitulasi', () => {
    const pengeluaranItems = [
      {
        id: 'p-1',
        urutan: 1,
        uraian: 'Setoran Sentralisasi Tambahan',
        is_sentralisasi: true,
        sentralisasi: 550000,
        huria: 450000,
        sosial: 0,
        pembangunan: 0,
        transitori: 0
      }
    ];
    const totals = calculatePengeluaranTotals(pengeluaranItems);
    expect(totals.totalSentral).toBe(550000);
    expect(totals.totalHuria).toBe(450000);
    expect(totals.totalPengeluaran).toBe(1000000);
  });

  it('verifies 8 Nov 2026 seed warta rekapitulasi is 100% balanced', () => {
    const sample = getInitialFullWarta();
    const rekap = sample.rekapitulasi;

    // Check balance
    expect(rekap.is_balanced).toBe(true);
    expect(rekap.selisih).toBe(0);

    // Check total masuk equals all sub-fund receipts
    const totalPosMasuk =
      rekap.huria.masuk +
      rekap.sosial.masuk +
      rekap.pembangunan.masuk +
      rekap.sentralisasi.masuk +
      rekap.transitori.masuk;
    expect(rekap.total_masuk).toBe(totalPosMasuk);

    // Check Sentralisasi 55% is fully remitted to Hatopan (saldo akhir = 0)
    expect(rekap.sentralisasi.saldo_akhir).toBe(0);
    expect(rekap.sentralisasi.keluar).toBe(rekap.sentralisasi.masuk);

    // Check Kas Huria arithmetic
    expect(rekap.huria.saldo_akhir).toBe(
      rekap.huria.saldo_awal + rekap.huria.masuk - rekap.huria.keluar
    );
  });

  it('correctly incorporates saldo_awal_sentralisasi into rekapitulasi and total_saldo_awal', () => {
    const customWarta = {
      ...INITIAL_WARTA_RECORD,
      saldo_awal_huria: 10000000,
      saldo_awal_sosial: 3000000,
      saldo_awal_pembangunan: 25000000,
      saldo_awal_transitori: 1000000,
      saldo_awal_sentralisasi: 2500000
    };

    const rekap = calculateRekapitulasi(customWarta, [], []);
    expect(rekap.sentralisasi.saldo_awal).toBe(2500000);
    expect(rekap.sentralisasi.saldo_akhir).toBe(2500000);
    expect(rekap.total_saldo_awal).toBe(
      10000000 + 3000000 + 25000000 + 1000000 + 2500000
    );
    expect(rekap.total_saldo_akhir).toBe(rekap.total_saldo_awal);
  });

  it('correctly aggregates multi-pos Hamauliateon with 55%/45% Sentralisasi on Ke Kas Huria and detailed Transitori', () => {
    const items = [
      {
        id: 'ham-1',
        urutan: 1,
        nama: 'Kel. Op Gorga / br. Manalu',
        rincian: 'Syukur Ulang Tahun',
        jumlah: 350000,
        ke_huria: 100000,
        ke_sosial: 100000,
        ke_pembangunan: 0,
        ke_sentralisasi: 0,
        ke_transitori: 150000,
        transitori_kode: 'TRANS_PENDETA',
        transitori_uraian: 'Pendeta'
      },
      {
        id: 'ham-2',
        urutan: 2,
        nama: 'Kel. St. R. Sihombing',
        rincian: 'Pamasumasuon',
        jumlah: 300000,
        ke_huria: 0,
        ke_sosial: 0,
        ke_pembangunan: 300000,
        ke_sentralisasi: 0,
        ke_transitori: 0
      }
    ];

    // Default: Ke Kas Huria dikenakan aturan sentralisasi 55% sentral / 45% kas huria
    const hamTotalsSentral = calculateHamauliateonTotals(items, true);
    expect(hamTotalsSentral.totalJumlah).toBe(650000);
    expect(hamTotalsSentral.totalHuria).toBe(45000);
    expect(hamTotalsSentral.totalSentral).toBe(55000);
    expect(hamTotalsSentral.totalSosial).toBe(100000);
    expect(hamTotalsSentral.totalPembangunan).toBe(300000);
    expect(hamTotalsSentral.totalTransitori).toBe(150000);

    // Override: Jika user memilih Sentralisasi = Tidak pada baris HAM_LAIN
    const hamTotalsNonSentral = calculateHamauliateonTotals(items, false);
    expect(hamTotalsNonSentral.totalJumlah).toBe(650000);
    expect(hamTotalsNonSentral.totalHuria).toBe(100000);
    expect(hamTotalsNonSentral.totalSentral).toBe(0);
    expect(hamTotalsNonSentral.totalSosial).toBe(100000);
    expect(hamTotalsNonSentral.totalPembangunan).toBe(300000);
    expect(hamTotalsNonSentral.totalTransitori).toBe(150000);

    // Apply hamTotalsSentral to row 1.2.17 (HAM_LAIN) and verify full balance
    const defaultWarta = getInitialFullWarta();
    const penerimaanWithHam = defaultWarta.penerimaan.map(r => {
      if (r.kode === 'HAM_LAIN' || r.id === 'pen-HAM_LAIN') {
        return {
          ...r,
          jumlah: hamTotalsSentral.totalJumlah,
          aturan_alokasi: 'manual' as const,
          is_sentralisasi: true,
          huria_45: hamTotalsSentral.totalHuria,
          sosial: hamTotalsSentral.totalSosial,
          pembangunan: hamTotalsSentral.totalPembangunan,
          sentral_55: hamTotalsSentral.totalSentral,
          transitori: hamTotalsSentral.totalTransitori
        };
      }
      return r;
    });

    const { updatedRows } = recalculatePenerimaanRows(penerimaanWithHam);
    const hamRow = updatedRows.find(r => r.kode === 'HAM_LAIN' || r.id === 'pen-HAM_LAIN');
    expect(hamRow).toBeDefined();
    expect(hamRow?.jumlah).toBe(650000);
    expect(hamRow?.huria_45).toBe(45000);
    expect(hamRow?.sentral_55).toBe(55000);
    expect(hamRow?.sosial).toBe(100000);
    expect(hamRow?.pembangunan).toBe(300000);
    expect(hamRow?.transitori).toBe(150000);

    const rekap = calculateRekapitulasi(defaultWarta.warta, updatedRows, defaultWarta.pengeluaran);
    expect(rekap.is_balanced).toBe(true);
    expect(rekap.selisih).toBe(0);

    // Legacy saved row with is_sentralisasi: false must automatically enforce 45%/55% via syncHamauliateonToPenerimaanRows
    const legacyRows = defaultWarta.penerimaan.map((r) =>
      r.kode === 'HAM_LAIN' ? { ...r, is_sentralisasi: false, huria_45: 100000, sentral_55: 0 } : r
    );
    const syncedRows = syncHamauliateonToPenerimaanRows(legacyRows, items);
    const syncedHam = syncedRows.find((r) => r.kode === 'HAM_LAIN');
    expect(syncedHam?.is_sentralisasi).toBe(true);
    expect(syncedHam?.huria_45).toBe(45000);
    expect(syncedHam?.sentral_55).toBe(55000);
  });

  it('follows HKBP Hutaraja standard categories (1.1, 1.2, 1.3) and allows user Sentralisasi overrides', () => {
    const defaultWarta = getInitialFullWarta();
    const rows = defaultWarta.penerimaan;

    // Verify 3 groups exist: 1.1 (10 items), 1.2 (17 items), 1.3 (20 items)
    const g11 = rows.filter(r => r.kelompok === '1.1');
    const g12 = rows.filter(r => r.kelompok === '1.2');
    const g13 = rows.filter(r => r.kelompok === '1.3');
    expect(g11.length).toBe(10);
    expect(g12.length).toBe(17);
    expect(g13.length).toBe(20);

    // 1.1.1 Pelean Sikkola Minggu & 1.1.2 Pelean 1A Minggu Sesi I default to Sentralisasi = YA
    const sm = rows.find(r => r.no_tampilan === '1.1.1');
    const p1a = rows.find(r => r.no_tampilan === '1.1.2');
    expect(sm?.uraian).toBe('Pelean Sikkola Minggu');
    expect(sm?.is_sentralisasi).toBe(true);
    expect(p1a?.uraian).toBe('Pelean 1A Minggu Sesi I');
    expect(p1a?.is_sentralisasi).toBe(true);

    // 1.3.1 Pendeta is Transitori and defaults to Sentralisasi = TIDAK
    const pendeta = rows.find(r => r.no_tampilan === '1.3.1');
    expect(pendeta?.uraian).toBe('Pendeta');
    expect(pendeta?.is_sentralisasi).toBe(false);
    expect(pendeta?.transitori).toBe(200000);

    // User toggles Sentralisasi = YA on 1.1.4 Pelean 2A Minggu Sesi I
    const modifiedRows = rows.map(r =>
      r.no_tampilan === '1.1.4' ? { ...r, jumlah: 1000000, is_sentralisasi: true } : r
    );
    const { updatedRows: recalc } = recalculatePenerimaanRows(modifiedRows);
    const p2a = recalc.find(r => r.no_tampilan === '1.1.4');
    expect(p2a?.sentral_55).toBe(550000);
    expect(p2a?.huria_45).toBe(450000);
  });

  it('omits empty (Rp 0) penerimaan and pengeluaran rows for printed warta output', () => {
    const defaultWarta = getInitialFullWarta();
    // Initial sample has 17 empty rows (1.3.4 to 1.3.20) with jumlah = 0
    const printablePen = getPrintablePenerimaanRows(defaultWarta.penerimaan);
    expect(printablePen.length).toBeLessThan(defaultWarta.penerimaan.length);
    expect(printablePen.every((r) => r.jumlah > 0)).toBe(true);
    expect(printablePen.some((r) => r.no_tampilan === '1.3.4')).toBe(false);

    // Pengeluaran with zero row omitted
    const printablePeng = getPrintablePengeluaranRows([
      ...defaultWarta.pengeluaran,
      { id: 'empty-peng', urutan: 99, uraian: 'Kosong', huria: 0, sosial: 0, pembangunan: 0, transitori: 0 }
    ]);
    expect(printablePeng.some((p) => p.id === 'empty-peng')).toBe(false);
    expect(printablePeng.length).toBe(defaultWarta.pengeluaran.length);
  });

  it('supports flexible custom master categories and clean zero-amount initialization for new wartas', () => {
    const customMaster = [
      ...MASTER_KATEGORI_PENERIMAAN,
      {
        id: 'k_custom_test',
        kode: 'CUSTOM_TEST',
        kelompok: '1.2',
        no_tampilan: '1.2.18',
        urutan: 48,
        uraian: 'Persembahan Ibadah Pemuda Khusus',
        aturan_alokasi: 'split_45_55' as const,
        is_sentralisasi: true
      }
    ];

    const blankRows = createDefaultPenerimaanRows(0, 0, [], customMaster, false);
    expect(blankRows.length).toBe(48);
    expect(blankRows.every((r) => r.jumlah === 0)).toBe(true);
    const added = blankRows.find((r) => r.kode === 'CUSTOM_TEST');
    expect(added).toBeDefined();
    expect(added?.uraian).toBe('Persembahan Ibadah Pemuda Khusus');
    expect(added?.is_sentralisasi).toBe(true);
  });

  it('allocates Sumbangan Natal Diakoni Sosial 100% to Kas Sosial Huria and zeroes out when hidden', () => {
    const defaultWarta = getInitialFullWarta();
    const baseSosialMasuk = defaultWarta.rekapitulasi.sosial.masuk;

    const sumbanganItems = [
      { id: 'sn-1', urutan: 1, nama: 'Kel. St. R. Sitohang', lingkungan: 'Letare', jumlah: 250000 },
      { id: 'sn-2', urutan: 2, nama: 'Kel. M. Silalahi', lingkungan: 'Galatia', jumlah: 150000 }
    ];

    expect(calculateSumbanganNatalTotal(sumbanganItems)).toBe(400000);

    // Active (Tampilkan) -> 100% masuk ke Kas Sosial Huria
    const syncedActive = syncSumbanganNatalToPenerimaanRows(
      defaultWarta.penerimaan,
      sumbanganItems,
      true,
      defaultWarta.warta.id
    );
    const { updatedRows: recalcActive } = recalculatePenerimaanRows(syncedActive);
    const sumbRow = recalcActive.find((r) => r.kode === SUMBANGAN_NATAL_KODE);
    expect(sumbRow).toBeDefined();
    expect(sumbRow?.jumlah).toBe(400000);
    expect(sumbRow?.sosial).toBe(400000);
    expect(sumbRow?.huria_45).toBe(0);
    expect(sumbRow?.sentral_55).toBe(0);

    const rekapActive = calculateRekapitulasi(
      defaultWarta.warta,
      recalcActive,
      defaultWarta.pengeluaran
    );
    expect(rekapActive.is_balanced).toBe(true);
    expect(rekapActive.sosial.masuk).toBe(baseSosialMasuk + 400000);

    // Hidden (Hilangkan) -> jumlah = 0, tidak dicetak, tidak masuk Kas Sosial Huria
    const syncedHidden = syncSumbanganNatalToPenerimaanRows(
      recalcActive,
      sumbanganItems,
      false,
      defaultWarta.warta.id
    );
    const { updatedRows: recalcHidden } = recalculatePenerimaanRows(syncedHidden);
    const hiddenRow = recalcHidden.find((r) => r.kode === SUMBANGAN_NATAL_KODE);
    expect(hiddenRow?.jumlah).toBe(0);
    expect(hiddenRow?.sosial).toBe(0);

    const printableHidden = getPrintablePenerimaanRows(recalcHidden);
    expect(printableHidden.some((r) => r.kode === SUMBANGAN_NATAL_KODE)).toBe(false);

    const rekapHidden = calculateRekapitulasi(
      defaultWarta.warta,
      recalcHidden,
      defaultWarta.pengeluaran
    );
    expect(rekapHidden.is_balanced).toBe(true);
    expect(rekapHidden.sosial.masuk).toBe(baseSosialMasuk);
  });

  it('prevents double-counting carried-over Sumbangan Natal rows from previous weeks into Kas Sosial Huria', () => {
    const defaultWarta = getInitialFullWarta();
    const baseSosialMasuk = defaultWarta.rekapitulasi.sosial.masuk;

    const cumulativeItems = [
      { id: 'sn-prev-1', urutan: 1, nama: 'Kel. A. Manurung', lingkungan: 'Letare', jumlah: 500000, dari_minggu_lalu: true },
      { id: 'sn-new-2', urutan: 2, nama: 'Kel. B. Simanjuntak', lingkungan: 'Exaudi', jumlah: 100000, dari_minggu_lalu: false }
    ];

    const breakdown = calculateSumbanganNatalBreakdown(cumulativeItems);
    expect(breakdown.subTotal).toBe(600000);
    expect(breakdown.dariMingguLalu).toBe(500000);
    expect(breakdown.mingguIni).toBe(100000);

    const synced = syncSumbanganNatalToPenerimaanRows(
      defaultWarta.penerimaan,
      cumulativeItems,
      true,
      defaultWarta.warta.id
    );
    const { updatedRows } = recalculatePenerimaanRows(synced);
    const sumbRow = updatedRows.find((r) => r.kode === SUMBANGAN_NATAL_KODE);
    expect(sumbRow?.jumlah).toBe(100000);
    expect(sumbRow?.sosial).toBe(100000);

    const rekap = calculateRekapitulasi(defaultWarta.warta, updatedRows, defaultWarta.pengeluaran);
    expect(rekap.is_balanced).toBe(true);
    expect(rekap.sosial.masuk).toBe(baseSosialMasuk + 100000);
  });

  it('aggregates multiple transitori recipients (e.g. Pendeta, Bibelvrow, Lingkungan) within a single Hamauliateon item', () => {
    const defaultWarta = getInitialFullWarta();
    const multiTransHam = [
      {
        id: 'ham-multi-tr',
        urutan: 1,
        nama: 'Kel. Pomparan Op. Teko',
        rincian: 'Siala denggan adat parsaoran',
        jumlah: 750000,
        ke_huria: 250000,
        ke_sosial: 200000,
        ke_pembangunan: 0,
        ke_transitori: 300000,
        transitori_items: [
          { id: 'tr-1', kode: 'TRANS_PENDETA', uraian: 'Pendeta', jumlah: 100000 },
          { id: 'tr-2', kode: 'TRANS_BIBELVROW', uraian: 'Bibelvrow', jumlah: 100000 },
          { id: 'tr-3', kode: 'TRANS_WIJK_JEREMIA', uraian: 'Lingkungan Jeremia', jumlah: 100000 }
        ]
      }
    ];

    const list = getHamauliateonTransitoriList(multiTransHam[0]);
    expect(list).toHaveLength(3);

    const totals = calculateHamauliateonTotals(multiTransHam, true);
    expect(totals.totalTransitori).toBe(300000);
    expect(totals.totalHuria).toBe(112500);
    expect(totals.totalSentral).toBe(137500);
    expect(totals.totalSosial).toBe(200000);
    expect(totals.totalJumlah).toBe(750000);

    const synced = syncHamauliateonToPenerimaanRows(defaultWarta.penerimaan, multiTransHam);
    const { updatedRows } = recalculatePenerimaanRows(synced);
    const hamRow = updatedRows.find((r) => r.kode === 'HAM_LAIN');
    expect(hamRow?.transitori).toBe(300000);
    expect(hamRow?.jumlah).toBe(750000);

    const rekap = calculateRekapitulasi(defaultWarta.warta, updatedRows, defaultWarta.pengeluaran);
    expect(rekap.is_balanced).toBe(true);
  });

  it('inserts new Penerimaan rows at the end of their matching kelompok (1.1, 1.2, 1.3) with sequential urutan and next number', () => {
    const defaultWarta = getInitialFullWarta();
    const baseRows = defaultWarta.penerimaan;

    const nextNo11 = getNextNoTampilanForKelompok(baseRows, '1.1');
    expect(nextNo11).toBe('1.1.11');

    const withNew11 = insertPenerimaanItemByKelompok(baseRows, {
      ...baseRows[0],
      id: 'new-11-partangiangan',
      kode: 'NEW_11_PART',
      kelompok: '1.1',
      no_tampilan: nextNo11,
      uraian: 'Pelean Partangiangan Rekreasi',
      jumlah: 410000
    });

    // Must sit right after 1.1.10 and right before 1.2.1 (never appended after 1.3.20)
    const idx1110 = withNew11.findIndex((r) => r.no_tampilan === '1.1.10');
    const idxNew11 = withNew11.findIndex((r) => r.id === 'new-11-partangiangan');
    const idx121 = withNew11.findIndex((r) => r.no_tampilan === '1.2.1');
    expect(idxNew11).toBe(idx1110 + 1);
    expect(idx121).toBe(idxNew11 + 1);
    expect(withNew11.every((r, idx) => r.urutan === idx + 1)).toBe(true);

    // Batch insert multiple rows across different groups
    const nextNo12 = getNextNoTampilanForKelompok(withNew11, '1.2');
    expect(nextNo12).toBe('1.2.18');
    const withBatch = insertManyPenerimaanItemsByKelompok(withNew11, [
      {
        ...baseRows[0],
        id: 'new-11-kas-sos',
        kode: 'NEW_11_SOS',
        kelompok: '1.1',
        no_tampilan: getNextNoTampilanForKelompok(withNew11, '1.1'),
        uraian: 'Kas Sosial Huria Partangiangan',
        jumlah: 400000
      },
      {
        ...baseRows[0],
        id: 'new-12-syukur',
        kode: 'NEW_12_SYUKUR',
        kelompok: '1.2',
        no_tampilan: nextNo12,
        uraian: 'Persembahan Khusus Akhir Tahun',
        jumlah: 250000
      }
    ]);
    const idx1112 = withBatch.findIndex((r) => r.id === 'new-11-kas-sos');
    const idx121Updated = withBatch.findIndex((r) => r.no_tampilan === '1.2.1');
    const idx1218 = withBatch.findIndex((r) => r.id === 'new-12-syukur');
    const idx131 = withBatch.findIndex((r) => r.no_tampilan === '1.3.1');
    expect(idx1112).toBe(idx121Updated - 1);
    expect(idx1218).toBe(idx131 - 1);

    // Empty group canonical placement: inserting 1.2 when only 1.1 and 1.3 exist places 1.2 in between
    const only11And13 = [
      { kelompok: '1.1', no_tampilan: '1.1.1', urutan: 1, label: 'a' },
      { kelompok: '1.3', no_tampilan: '1.3.1', urutan: 2, label: 'c' }
    ];
    const withMiddle12 = insertPenerimaanItemByKelompok(only11And13, {
      kelompok: '1.2',
      no_tampilan: '1.2.1',
      urutan: 99,
      label: 'b'
    });
    expect(withMiddle12.map((r) => r.label)).toEqual(['a', 'b', 'c']);
    expect(withMiddle12.map((r) => r.urutan)).toEqual([1, 2, 3]);
  });

  it('supports unconstrained row moving and repairs misordered groups via sortPenerimaanItemsByKelompok', () => {
    const rows = [
      { id: 'r1', kelompok: '1.1', no_tampilan: '1.1.1', urutan: 1 },
      { id: 'r2', kelompok: '1.2', no_tampilan: '1.2.1', urutan: 2 },
      { id: 'r3', kelompok: '1.3', no_tampilan: '1.3.20', urutan: 3 },
      { id: 'r4', kelompok: '1.1', no_tampilan: '1.1.11', urutan: 4 },
      { id: 'r5', kelompok: '1.1', no_tampilan: '1.1.12', urutan: 5 }
    ];

    // Free reordering allows moving any row anywhere and keeps sequential urutan
    const moved = movePenerimaanItem(rows, 4, 1);
    expect(moved.map((r) => r.id)).toEqual(['r1', 'r5', 'r2', 'r3', 'r4']);
    expect(moved.map((r) => r.urutan)).toEqual([1, 2, 3, 4, 5]);

    // No-op when bounds invalid
    expect(movePenerimaanItem(rows, -1, 2)).toEqual(rows);
    expect(movePenerimaanItem(rows, 2, 2)).toEqual(rows);

    // Rapikan Grup repairs misplaced 1.1.11 & 1.1.12 back into 1.1 while preserving intra-group order
    const sorted = sortPenerimaanItemsByKelompok(rows);
    expect(sorted.map((r) => r.no_tampilan)).toEqual(['1.1.1', '1.1.11', '1.1.12', '1.2.1', '1.3.20']);
    expect(sorted.map((r) => r.urutan)).toEqual([1, 2, 3, 4, 5]);
  });
});

describe('Format Utilities (format.ts)', () => {
  it('formats Indonesian Rupiah properly', () => {
    expect(formatRupiah(12450000)).toBe('12.450.000');
    expect(formatRupiah(0)).toBe('0');
    expect(formatRupiah(undefined)).toBe('0');
  });

  it('parses Rupiah formatted strings to integer numbers', () => {
    expect(parseRupiahInput('Rp 12.450.000')).toBe(12450000);
    expect(parseRupiahInput('450.000')).toBe(450000);
    expect(parseRupiahInput('')).toBe(0);
  });

  it('formats Indonesian dates and official HKBP header for 8 Nov 2026', () => {
    expect(formatTanggalIndo('2026-11-08')).toBe('8 November 2026');
    expect(formatHeaderMinggu('2026-11-08')).toBe('MINGGU, 8 NOVEMBER 2026');
  });
});
