export const KELUARGA_CSV_HEADERS = [
  'registrasi',
  'wijk',
  'nama_kk',
  'kk_wafat',
  'jalan',
  'hp',
  'jumlah_anggota'
] as const;

export const ANGGOTA_CSV_HEADERS = [
  'registrasi',
  'nama',
  'jenis_kelamin',
  'tgl_lahir',
  'tgl_baptis',
  'tgl_sidi',
  'hub_keluarga',
  'wijk',
  'aktif'
] as const;

export const SAMPLE_KELUARGA_ROWS = [
  ['0101', 'Lingkungan Letare', 'St. Ramses Sitohang', 'false', 'Jl. Persada No. 10', '081200000001', '4'],
  ['0102', 'Lingkungan Letare', 'Bona Tua Silalahi', 'false', 'Jl. Persada No. 14', '081200000002', '3'],
  ['0201', 'Lingkungan Galatia', 'Ny. Sinaga br. Manalu', 'true', 'Desa Hutarakyat No. 5', '081200000003', '2']
];

export const SAMPLE_ANGGOTA_ROWS = [
  ['0101', 'St. Ramses Sitohang', 'L', '1970-11-02', '1970-12-25', '1987-04-12', 'Kepala Keluarga', 'Lingkungan Letare', 'true'],
  ['0101', 'Ny. Sitohang br. Sinaga', 'P', '1974-11-03', '1975-01-01', '1990-04-10', 'Istri', 'Lingkungan Letare', 'true'],
  ['0101', 'Grace Maria Sitohang', 'P', '2010-09-15', '2010-11-20', '', 'Anak', 'Lingkungan Letare', 'true'],
  ['0102', 'Bona Tua Silalahi', 'L', '', '1983-01-01', '1998-05-15', 'Kepala Keluarga', 'Lingkungan Letare', 'true']
];

function escapeCsvCell(value: string, delimiter: ',' | ';'): string {
  if (value.includes('"') || value.includes(delimiter) || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function buildKeluargaTemplateCsv(delimiter: ',' | ';' = ','): string {
  const lines = [
    KELUARGA_CSV_HEADERS.join(delimiter),
    ...SAMPLE_KELUARGA_ROWS.map((row) =>
      row.map((cell) => escapeCsvCell(cell, delimiter)).join(delimiter)
    )
  ];
  return `\uFEFF${lines.join('\r\n')}\r\n`;
}

export function buildAnggotaTemplateCsv(delimiter: ',' | ';' = ','): string {
  const lines = [
    ANGGOTA_CSV_HEADERS.join(delimiter),
    ...SAMPLE_ANGGOTA_ROWS.map((row) =>
      row.map((cell) => escapeCsvCell(cell, delimiter)).join(delimiter)
    )
  ];
  return `\uFEFF${lines.join('\r\n')}\r\n`;
}

export function downloadCsvFile(filename: string, csvContent: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

const HEADER_ALIASES: Record<string, string> = {
  registrasi: 'registrasi',
  no_registrasi: 'registrasi',
  nomor_registrasi: 'registrasi',
  no_reg: 'registrasi',
  kode_kk: 'registrasi',
  no_kk: 'registrasi',
  wijk: 'wijk',
  lingkungan: 'wijk',
  nama_wijk: 'wijk',
  nama_kk: 'nama_kk',
  kepala_keluarga: 'nama_kk',
  nama_kepala_keluarga: 'nama_kk',
  kk_wafat: 'kk_wafat',
  wafat: 'kk_wafat',
  status_kk: 'kk_wafat',
  jalan: 'jalan',
  alamat: 'jalan',
  alamat_jalan: 'jalan',
  hp: 'hp',
  no_hp: 'hp',
  telepon: 'hp',
  whatsapp: 'hp',
  jumlah_anggota: 'jumlah_anggota',
  jml_anggota: 'jumlah_anggota',
  jml_jiwa: 'jumlah_anggota',
  jumlah_jiwa: 'jumlah_anggota',
  id: 'id',
  nama: 'nama',
  nama_lengkap: 'nama',
  goar: 'nama',
  jenis_kelamin: 'jenis_kelamin',
  jk: 'jenis_kelamin',
  l_p: 'jenis_kelamin',
  kelamin: 'jenis_kelamin',
  gender: 'jenis_kelamin',
  tgl_lahir: 'tgl_lahir',
  tanggal_lahir: 'tgl_lahir',
  lahir: 'tgl_lahir',
  tgl_baptis: 'tgl_baptis',
  tanggal_baptis: 'tgl_baptis',
  baptis: 'tgl_baptis',
  tgl_sidi: 'tgl_sidi',
  tanggal_sidi: 'tgl_sidi',
  sidi: 'tgl_sidi',
  hub_keluarga: 'hub_keluarga',
  hubungan_keluarga: 'hub_keluarga',
  hubungan: 'hub_keluarga',
  aktif: 'aktif',
  status: 'aktif',
  status_aktif: 'aktif'
};

export function normalizeCsvHeader(rawHeader: string): string {
  const cleaned = String(rawHeader || '')
    .replace(/^\uFEFF/, '')
    .trim()
    .toLowerCase()
    .replace(/[./\s-]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
  return HEADER_ALIASES[cleaned] || cleaned;
}

export function cleanRegistrasiValue(raw: unknown): string {
  let s = String(raw ?? '').trim();
  // Support Excel text-preservation wrappers: ="0101" or '0101
  const excelFormulaMatch = s.match(/^=\s*"([^"]*)"$/);
  if (excelFormulaMatch) {
    s = excelFormulaMatch[1].trim();
  }
  if (s.startsWith("'")) {
    s = s.slice(1).trim();
  }
  return s;
}

export function normalizeDateValue(raw: unknown): string | null {
  const s = String(raw ?? '').trim();
  if (!s || s === '-' || s.toLowerCase() === 'null' || s.toLowerCase() === 'kosong') {
    return null;
  }

  // YYYY-MM-DD or YYYY/MM/DD
  const isoMatch = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (isoMatch) {
    const [, y, m, d] = isoMatch;
    const mm = m.padStart(2, '0');
    const dd = d.padStart(2, '0');
    return `${y}-${mm}-${dd}`;
  }

  // DD-MM-YYYY or DD/MM/YYYY
  const dmyMatch = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (dmyMatch) {
    const [, d, m, y] = dmyMatch;
    const mm = m.padStart(2, '0');
    const dd = d.padStart(2, '0');
    return `${y}-${mm}-${dd}`;
  }

  return null;
}
