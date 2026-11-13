/**
 * Format utilities for Warta Jemaat HKBP Ressort Hutaraja
 */

export const BULAN_INDONESIA = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember'
];

export const HARI_INDONESIA = [
  'Minggu',
  'Senin',
  'Selasa',
  'Rabu',
  'Kamis',
  'Jumat',
  'Sabtu'
];

/**
 * Format currency to Indonesian standard: 1.500.000
 */
export function formatRupiah(amount: number | null | undefined): string {
  if (amount === undefined || amount === null || isNaN(amount)) return '0';
  return new Intl.NumberFormat('id-ID').format(amount);
}

/**
 * Format currency with Rp prefix: Rp 1.500.000
 */
export function formatCurrencyRp(amount: number | null | undefined): string {
  return `Rp ${formatRupiah(amount)}`;
}

/**
 * Parse input string into integer number
 */
export function parseRupiahInput(value: string | number): number {
  if (typeof value === 'number') return isNaN(value) ? 0 : Math.round(value);
  const clean = value.replace(/[^\d-]/g, '');
  const parsed = parseInt(clean, 10);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Format date string "YYYY-MM-DD" to "8 Nopember 2026"
 */
export function formatTanggalIndo(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-').map(Number);
  if (!year || !month || !day) return dateStr;
  return `${day} ${BULAN_INDONESIA[month - 1]} ${year}`;
}

/**
 * Format full date with day: "Minggu, 8 Nopember 2026"
 */
export function formatTanggalLengkap(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  if (isNaN(d.getTime())) return dateStr;
  const hari = HARI_INDONESIA[d.getDay()];
  const tgl = formatTanggalIndo(dateStr);
  return `${hari}, ${tgl}`;
}

/**
 * Header title in exact HKBP warta format: "MINGGU, 8 NOPEMBER 2026"
 */
export function formatHeaderMinggu(dateStr: string | null | undefined): string {
  if (!dateStr) return 'MINGGU';
  const [year, month, day] = dateStr.split('-').map(Number);
  if (!year || !month || !day) return 'MINGGU';
  const bulan = BULAN_INDONESIA[month - 1]?.toUpperCase() || '';
  return `MINGGU, ${day} ${bulan} ${year}`;
}
