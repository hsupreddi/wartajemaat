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

/**
 * Format date string "YYYY-MM-DD" to "16 Maret 2025"
 */
export function formatTanggalIndo(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-').map(Number);
  if (!year || !month || !day) return dateStr;
  return `${day} ${BULAN_INDONESIA[month - 1]} ${year}`;
}

/**
 * Format date with day of week: "Minggu, 16 Maret 2025"
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
 * Header title in Batak/Indo format: "MINGGU, 16 MARET 2025"
 */
export function formatHeaderMinggu(dateStr: string | null | undefined): string {
  if (!dateStr) return 'MINGGU';
  const [year, month, day] = dateStr.split('-').map(Number);
  if (!year || !month || !day) return 'MINGGU';
  const bulan = BULAN_INDONESIA[month - 1]?.toUpperCase() || '';
  return `MINGGU, ${day} ${bulan} ${year}`;
}

/**
 * Calculate the week range (Senin s/d Minggu) for a given Sunday date
 */
export function getSeninMingguRange(sundayDateStr: string): {
  seninStr: string;
  mingguStr: string;
  labelPeriode: string;
} {
  const sunday = new Date(sundayDateStr + 'T00:00:00');
  const monday = new Date(sunday);
  monday.setDate(sunday.getDate() - 6);

  const formatShort = (d: Date) =>
    `${d.getDate()} ${BULAN_INDONESIA[d.getMonth()]} ${d.getFullYear()}`;

  const seninStr = monday.toISOString().split('T')[0];
  const mingguStr = sunday.toISOString().split('T')[0];

  let labelPeriode = '';
  if (monday.getMonth() === sunday.getMonth() && monday.getFullYear() === sunday.getFullYear()) {
    labelPeriode = `${monday.getDate()} s/d ${sunday.getDate()} ${BULAN_INDONESIA[sunday.getMonth()]} ${sunday.getFullYear()}`;
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

  const sunday = new Date(sundayDateStr + 'T00:00:00');
  const monday = new Date(sunday);
  monday.setDate(sunday.getDate() - 6);

  // List of active members
  const activeMembers = anggotaList.filter((m) => m.aktif !== false);

  const results: {
    nama: string;
    jenis_kelamin: 'L' | 'P';
    tanggal_lahir: string;
    dayMonthVal: number;
    dayMonthStr: string;
    usia: number;
    wijk: string;
  }[] = [];

  // Generate list of 7 dates in the week
  const weekDates: { month: number; day: number }[] = [];
  for (let i = 0; i < 7; i++) {
    const cur = new Date(monday);
    cur.setDate(monday.getDate() + i);
    weekDates.push({
      month: cur.getMonth() + 1, // 1-12
      day: cur.getDate()
    });
  }

  for (const m of activeMembers) {
    if (!m.tanggal_lahir) continue;
    const [bYear, bMonth, bDay] = m.tanggal_lahir.split('-').map(Number);
    if (!bYear || !bMonth || !bDay) continue;

    // Check if matches any of the 7 days
    const match = weekDates.find((wd) => wd.month === bMonth && wd.day === bDay);
    if (match) {
      // Calculate age on warta date
      let usia = sunday.getFullYear() - bYear;
      const hadBirthdayThisYear =
        sunday.getMonth() + 1 > bMonth ||
        (sunday.getMonth() + 1 === bMonth && sunday.getDate() >= bDay);
      if (!hadBirthdayThisYear) {
        usia -= 1;
      }

      results.push({
        nama: m.nama,
        jenis_kelamin: m.jenis_kelamin,
        tanggal_lahir: m.tanggal_lahir,
        dayMonthVal: bMonth * 100 + bDay,
        dayMonthStr: `${String(bDay).padStart(2, '0')}/${String(bMonth).padStart(2, '0')}`,
        usia: Math.max(1, usia),
        wijk: m.wijk
      });
    }
  }

  // Sort by month-day
  results.sort((a, b) => a.dayMonthVal - b.dayMonthVal);

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
 * Returns ISO string "YYYY-MM-DD" of next Sunday
 */
export function getNextSunday(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = (7 - day) % 7;
  const next = new Date(now);
  next.setDate(now.getDate() + (diff === 0 ? 7 : diff));
  return next.toISOString().split('T')[0];
}
