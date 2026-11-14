import { AnggotaJemaat, UlangTahunItem } from '../types';

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

function parseYmdParts(
  dateStr: string | null | undefined
): { year: number; month: number; day: number } | null {
  if (!dateStr) return null;
  const clean = String(dateStr).trim().split('T')[0];
  const parts = clean.split('-').map(Number);
  if (parts.length !== 3 || parts.some((n) => !Number.isInteger(n))) return null;
  const [year, month, day] = parts;
  if (!year || month < 1 || month > 12 || day < 1 || day > 31) return null;
  return { year, month, day };
}

function formatYmdUtc(d: Date): string {
  const y = String(d.getUTCFullYear()).padStart(4, '0');
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Format date string "YYYY-MM-DD" to "16 Maret 2025"
 */
export function formatTanggalIndo(dateStr: string | null | undefined): string {
  const parts = parseYmdParts(dateStr);
  if (!parts) return dateStr || '';
  return `${parts.day} ${BULAN_INDONESIA[parts.month - 1]} ${parts.year}`;
}

/**
 * Format date with day of week: "Minggu, 16 Maret 2025"
 */
export function formatTanggalLengkap(dateStr: string | null | undefined): string {
  const parts = parseYmdParts(dateStr);
  if (!parts) return dateStr || '';
  const d = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
  if (isNaN(d.getTime())) return dateStr || '';
  const hari = HARI_INDONESIA[d.getUTCDay()];
  const tgl = `${parts.day} ${BULAN_INDONESIA[parts.month - 1]} ${parts.year}`;
  return `${hari}, ${tgl}`;
}

/**
 * Header title in Batak/Indo format: "MINGGU, 16 MARET 2025"
 */
export function formatHeaderMinggu(dateStr: string | null | undefined): string {
  const parts = parseYmdParts(dateStr);
  if (!parts) return 'MINGGU';
  const bulan = BULAN_INDONESIA[parts.month - 1]?.toUpperCase() || '';
  return `MINGGU, ${parts.day} ${bulan} ${parts.year}`;
}

/**
 * Calculate the week range (Senin s/d Minggu) for a given Sunday date.
 * Uses pure UTC calendar arithmetic so browser timezones (e.g. WIB UTC+7)
 * never shift YYYY-MM-DD backward by 1 day.
 */
export function getSeninMingguRange(sundayDateStr: string): {
  seninStr: string;
  mingguStr: string;
  labelPeriode: string;
} {
  const parts = parseYmdParts(sundayDateStr);
  if (!parts) {
    return {
      seninStr: sundayDateStr || '',
      mingguStr: sundayDateStr || '',
      labelPeriode: sundayDateStr || ''
    };
  }

  const sunday = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
  const monday = new Date(sunday);
  monday.setUTCDate(sunday.getUTCDate() - 6);

  const formatShort = (d: Date) =>
    `${d.getUTCDate()} ${BULAN_INDONESIA[d.getUTCMonth()]} ${d.getUTCFullYear()}`;

  const seninStr = formatYmdUtc(monday);
  const mingguStr = formatYmdUtc(sunday);

  let labelPeriode = '';
  if (
    monday.getUTCMonth() === sunday.getUTCMonth() &&
    monday.getUTCFullYear() === sunday.getUTCFullYear()
  ) {
    labelPeriode = `${monday.getUTCDate()} s/d ${sunday.getUTCDate()} ${BULAN_INDONESIA[sunday.getUTCMonth()]} ${sunday.getUTCFullYear()}`;
  } else {
    labelPeriode = `${formatShort(monday)} s/d ${formatShort(sunday)}`;
  }

  return { seninStr, mingguStr, labelPeriode };
}

/**
 * Filter congregation members celebrating birthday in the warta week
 * (Senin to Minggu) regardless of birth year, and compute their age.
 */
export function getUlangTahunMingguIni(
  anggotaList: AnggotaJemaat[],
  sundayDateStr: string
): UlangTahunItem[] {
  if (!sundayDateStr || !anggotaList?.length) return [];

  const parts = parseYmdParts(sundayDateStr);
  if (!parts) return [];

  const sunday = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
  const monday = new Date(sunday);
  monday.setUTCDate(sunday.getUTCDate() - 6);

  // List of active members
  const activeMembers = anggotaList.filter((m) => m.aktif !== false);

  const results: {
    nama: string;
    jenis_kelamin: 'L' | 'P';
    tanggal_lahir: string;
    dayOrder: number;
    dayMonthStr: string;
    usia: number;
    wijk: string;
  }[] = [];

  // Generate list of 7 dates in the week (Senin .. Minggu)
  const weekDates: { month: number; day: number; order: number }[] = [];
  for (let i = 0; i < 7; i++) {
    const cur = new Date(monday);
    cur.setUTCDate(monday.getUTCDate() + i);
    weekDates.push({
      month: cur.getUTCMonth() + 1, // 1-12
      day: cur.getUTCDate(),
      order: i
    });
  }

  for (const m of activeMembers) {
    const bParts = parseYmdParts(m.tanggal_lahir);
    if (!bParts) continue;
    const { year: bYear, month: bMonth, day: bDay } = bParts;

    // Check if matches any of the 7 days
    const match = weekDates.find((wd) => wd.month === bMonth && wd.day === bDay);
    if (match) {
      // Calculate age on warta date
      let usia = sunday.getUTCFullYear() - bYear;
      const hadBirthdayThisYear =
        sunday.getUTCMonth() + 1 > bMonth ||
        (sunday.getUTCMonth() + 1 === bMonth && sunday.getUTCDate() >= bDay);
      if (!hadBirthdayThisYear) {
        usia -= 1;
      }

      results.push({
        nama: m.nama,
        jenis_kelamin: m.jenis_kelamin,
        tanggal_lahir: String(m.tanggal_lahir || '').trim().split('T')[0],
        dayOrder: match.order,
        dayMonthStr: `${String(bDay).padStart(2, '0')}/${String(bMonth).padStart(2, '0')}`,
        usia: Math.max(1, usia),
        wijk: m.wijk
      });
    }
  }

  // Sort chronologically within the week (Senin -> Minggu), then by name
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
 * Returns ISO string "YYYY-MM-DD" of next Sunday in local calendar time
 */
export function getNextSunday(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = (7 - day) % 7;
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + (diff === 0 ? 7 : diff));
  const y = String(next.getFullYear()).padStart(4, '0');
  const m = String(next.getMonth() + 1).padStart(2, '0');
  const d = String(next.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
