import { DynamicTableColumn } from '../types';

export const DEFAULT_PARHOBAS_COLUMNS: DynamicTableColumn[] = [
  { key: 'peran', label: 'Ulaon', removable: false },
  { key: 'skm', label: 'Sekolah Minggu', removable: true },
  { key: 'sesi1', label: 'Minggu Sesi 1 (08.30)', removable: true },
  { key: 'sesi2', label: 'Minggu Sesi 2 (10.30)', removable: true }
];

export const DEFAULT_ACARA_MINGGU_COLUMNS: DynamicTableColumn[] = [
  { key: 'uraian', label: 'Tata Ibadah', removable: false },
  { key: 'keterangan', label: 'Keterangan', removable: true }
];

export const DEFAULT_ACARA_PARTANGIANGAN_COLUMNS: DynamicTableColumn[] = [
  { key: 'uraian', label: 'Tata Ibadah', removable: false },
  { key: 'keterangan', label: 'Keterangan', removable: true }
];

export const DEFAULT_PARTANGIANGAN_COLUMNS: DynamicTableColumn[] = [
  { key: 'hari', label: 'Hari / Tanggal', removable: false },
  { key: 'lingkungan', label: 'Lingkungan', removable: false },
  { key: 'pukul', label: 'Pukul', removable: true },
  { key: 'inganan', label: 'Inganan / Tuan Rumah', removable: false }
];

export const DEFAULT_SOPO_GODANG_COLUMNS: DynamicTableColumn[] = [
  { key: 'nama', label: 'Goar ni Keluarga / Punguan', removable: false },
  { key: 'tanggal', label: 'Ari / Tanggal Pemakaian', removable: false }
];
