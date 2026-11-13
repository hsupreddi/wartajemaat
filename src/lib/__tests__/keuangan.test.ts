import { describe, it, expect } from 'vitest';
import {
  calculateRowAlokasi,
  recalculatePenerimaanRows,
  getPrintablePenerimaanRows,
  getPrintablePengeluaranRows,
  calculatePengeluaranTotals,
  calculateRekapitulasi,
  calculateHamauliateonTotals
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

  it('correctly aggregates multi-pos Hamauliateon into respective fund accounts', () => {
    const items = [
      {
        id: 'ham-1',
        urutan: 1,
        nama: 'Kel. Op Gorga / br. Manalu',
        rincian: 'Syukur Ulang Tahun',
        jumlah: 200000,
        ke_huria: 100000,
        ke_sosial: 100000,
        ke_pembangunan: 0,
        ke_sentralisasi: 0,
        ke_transitori: 0
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

    const hamTotals = calculateHamauliateonTotals(items);
    expect(hamTotals.totalJumlah).toBe(500000);
    expect(hamTotals.totalHuria).toBe(100000);
    expect(hamTotals.totalSosial).toBe(100000);
    expect(hamTotals.totalPembangunan).toBe(300000);
    expect(hamTotals.totalSentral).toBe(0);
    expect(hamTotals.totalTransitori).toBe(0);

    // Apply hamTotals to row 28 (HAM_LAIN) as manual allocation
    const defaultWarta = getInitialFullWarta();
    const penerimaanWithHam = defaultWarta.penerimaan.map(r => {
      if (r.kode === 'HAM_LAIN' || r.id === 'pen-HAM_LAIN') {
        return {
          ...r,
          jumlah: hamTotals.totalJumlah,
          aturan_alokasi: 'manual' as const,
          huria_45: hamTotals.totalHuria,
          sosial: hamTotals.totalSosial,
          pembangunan: hamTotals.totalPembangunan,
          sentral_55: hamTotals.totalSentral,
          transitori: hamTotals.totalTransitori
        };
      }
      return r;
    });

    const { updatedRows } = recalculatePenerimaanRows(penerimaanWithHam);
    const hamRow = updatedRows.find(r => r.kode === 'HAM_LAIN' || r.id === 'pen-HAM_LAIN');
    expect(hamRow).toBeDefined();
    expect(hamRow?.jumlah).toBe(500000);
    expect(hamRow?.huria_45).toBe(100000);
    expect(hamRow?.sosial).toBe(100000);
    expect(hamRow?.pembangunan).toBe(300000);
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
