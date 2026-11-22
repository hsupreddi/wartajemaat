import React, { useState, useEffect } from 'react';
import {
  AturanAlokasi,
  KategoriPenerimaanMaster,
  KategoriPengeluaranMaster,
  PenerimaanRow,
  PengeluaranItem,
  PosPengeluaranDefault
} from '../../types';
import {
  getMasterKategoriPenerimaan,
  saveMasterKategoriPenerimaan,
  getMasterKategoriPengeluaran,
  saveMasterKategoriPengeluaran
} from '../../lib/wartaStorage';
import { formatRupiah, parseRupiahInput, getNextNoTampilanForKelompok } from '../../lib/financialMath';
import { Plus, X, CheckCircle2, BookmarkPlus, Layers } from 'lucide-react';

interface TambahPenerimaanModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingRows: PenerimaanRow[];
  onAddRow: (newRow: PenerimaanRow) => void;
  onSyncFromMaster: (missingRows: PenerimaanRow[]) => void;
}

export const TambahPenerimaanModal: React.FC<TambahPenerimaanModalProps> = ({
  isOpen,
  onClose,
  existingRows,
  onAddRow,
  onSyncFromMaster
}) => {
  const [mode, setMode] = useState<'custom' | 'master'>('custom');
  const [kelompok, setKelompok] = useState<'1.1' | '1.2' | '1.3'>('1.1');
  const [noTampilan, setNoTampilan] = useState('');
  const [uraian, setUraian] = useState('');
  const [aturan, setAturan] = useState<AturanAlokasi>('split_45_55');
  const [isSentral, setIsSentral] = useState(true);
  const [kePemb, setKePemb] = useState(false);
  const [saveToMaster, setSaveToMaster] = useState(true);
  const [masterList, setMasterList] = useState<KategoriPenerimaanMaster[]>([]);

  useEffect(() => {
    if (isOpen) {
      getMasterKategoriPenerimaan().then(setMasterList);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const suggestNo = (kel: '1.1' | '1.2' | '1.3') => {
    return getNextNoTampilanForKelompok(existingRows, kel);
  };

  const existingCodes = new Set(existingRows.map((r) => r.kode));
  const missingMasterItems = masterList.filter((m) => !existingCodes.has(m.kode));

  const handleSubmitCustom = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUraian = uraian.trim();
    if (!cleanUraian) return;

    const finalNo = noTampilan.trim() || suggestNo(kelompok);
    const customKode = `CUSTOM_PEN_${Date.now()}`;

    const newRow: PenerimaanRow = {
      id: `pen-${customKode}`,
      kode: customKode,
      kelompok,
      no_tampilan: finalNo,
      urutan: existingRows.length + 1,
      uraian: cleanUraian,
      aturan_alokasi: aturan,
      is_sentralisasi: isSentral,
      dialihkan_ke_pembangunan: kePemb,
      jumlah: 0,
      huria_45: 0,
      sosial: 0,
      pembangunan: 0,
      sentral_55: 0,
      transitori: 0
    };

    if (saveToMaster) {
      const updatedMaster: KategoriPenerimaanMaster[] = [
        ...masterList,
        {
          id: `k_${Date.now()}`,
          kode: customKode,
          kelompok,
          no_tampilan: finalNo,
          urutan: masterList.length + 1,
          uraian: cleanUraian,
          aturan_alokasi: aturan,
          is_sentralisasi: isSentral,
          dialihkan_ke_pembangunan: kePemb
        }
      ];
      await saveMasterKategoriPenerimaan(updatedMaster);
    }

    onAddRow(newRow);
    setUraian('');
    setNoTampilan('');
    onClose();
  };

  const handlePickMasterItem = (m: KategoriPenerimaanMaster) => {
    const isSentralVal =
      m.is_sentralisasi !== undefined ? m.is_sentralisasi : m.aturan_alokasi === 'split_45_55';
    const newRow: PenerimaanRow = {
      id: `pen-${m.kode}-${Date.now()}`,
      kategori_id: m.id,
      kode: m.kode,
      kelompok: m.kelompok,
      no_tampilan: m.no_tampilan,
      urutan: existingRows.length + 1,
      uraian: m.uraian,
      aturan_alokasi: m.aturan_alokasi,
      is_sentralisasi: isSentralVal,
      dialihkan_ke_pembangunan: m.dialihkan_ke_pembangunan,
      jumlah: 0,
      huria_45: 0,
      sosial: 0,
      pembangunan: 0,
      sentral_55: 0,
      transitori: 0
    };
    onAddRow(newRow);
    onClose();
  };

  const handleAddAllMissing = () => {
    const missingRows: PenerimaanRow[] = missingMasterItems.map((m, i) => {
      const isSentralVal =
        m.is_sentralisasi !== undefined ? m.is_sentralisasi : m.aturan_alokasi === 'split_45_55';
      return {
        id: `pen-${m.kode}-${Date.now()}-${i}`,
        kategori_id: m.id,
        kode: m.kode,
        kelompok: m.kelompok,
        no_tampilan: m.no_tampilan,
        urutan: existingRows.length + i + 1,
        uraian: m.uraian,
        aturan_alokasi: m.aturan_alokasi,
        is_sentralisasi: isSentralVal,
        dialihkan_ke_pembangunan: m.dialihkan_ke_pembangunan,
        jumlah: 0,
        huria_45: 0,
        sosial: 0,
        pembangunan: 0,
        sentral_55: 0,
        transitori: 0
      };
    });
    if (missingRows.length > 0) {
      onSyncFromMaster(missingRows);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/55 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-stone-200 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95">
        <div className="bg-[#0B2545] text-white px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-sm">
            <Plus className="w-4 h-4 text-emerald-400" />
            <span>Tambah Item Jenis Penerimaan</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-stone-300 hover:text-white p-1 rounded cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mode Switcher */}
        <div className="px-4 pt-3 flex gap-2 border-b border-stone-100 pb-2.5 bg-stone-50">
          <button
            type="button"
            onClick={() => setMode('custom')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              mode === 'custom'
                ? 'bg-emerald-800 text-white shadow-xs'
                : 'bg-white text-stone-700 border border-stone-200 hover:bg-stone-100'
            }`}
          >
            + Buat Item Baru
          </button>
          <button
            type="button"
            onClick={() => setMode('master')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              mode === 'master'
                ? 'bg-emerald-800 text-white shadow-xs'
                : 'bg-white text-stone-700 border border-stone-200 hover:bg-stone-100'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Pilih / Sinkron Master Pos ({masterList.length})</span>
          </button>
        </div>

        {mode === 'custom' ? (
          <form onSubmit={handleSubmitCustom} className="p-4 space-y-3 text-xs">
            <div className="grid grid-cols-3 gap-2.5">
              <div className="col-span-2">
                <label className="block font-bold text-stone-700 mb-1">Kelompok</label>
                <select
                  value={kelompok}
                  onChange={(e) => {
                    const k = e.target.value as '1.1' | '1.2' | '1.3';
                    setKelompok(k);
                    if (k === '1.3') {
                      setAturan('transitori');
                      setIsSentral(false);
                    }
                  }}
                  className="w-full px-2.5 py-2 border border-stone-300 rounded-lg bg-white"
                >
                  <option value="1.1">1.1 Persembahan Kebaktian Umum</option>
                  <option value="1.2">1.2 Persembahan Lainnya</option>
                  <option value="1.3">1.3 Penerimaan Transitori</option>
                </select>
              </div>
              <div>
                <label className="block font-bold text-stone-700 mb-1">No. Pos</label>
                <input
                  type="text"
                  value={noTampilan}
                  onChange={(e) => setNoTampilan(e.target.value)}
                  placeholder={suggestNo(kelompok)}
                  className="w-full px-2.5 py-2 border border-stone-300 rounded-lg font-mono text-center"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-stone-700 mb-1">
                Uraian Jenis Penerimaan <span className="text-rose-600">*</span>
              </label>
              <input
                type="text"
                required
                value={uraian}
                onChange={(e) => setUraian(e.target.value)}
                placeholder="Contoh: Pelean Ibadah Sore / Sumbangan Diakonia..."
                className="w-full px-2.5 py-2 border border-stone-300 rounded-lg"
              />
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block font-bold text-stone-700 mb-1">Pos Kas Tujuan</label>
                <select
                  value={aturan}
                  onChange={(e) => setAturan(e.target.value as AturanAlokasi)}
                  className="w-full px-2.5 py-2 border border-stone-300 rounded-lg bg-white"
                >
                  <option value="split_45_55">Kas Huria (Rutin)</option>
                  <option value="huria">Kas Huria (100%)</option>
                  <option value="sosial">Sosial Huria</option>
                  <option value="pembangunan">Pembangunan</option>
                  <option value="transitori">Transitori</option>
                </select>
              </div>
              <div>
                <label className="block font-bold text-stone-700 mb-1">Sentralisasi? (55%)</label>
                <select
                  value={isSentral ? 'ya' : 'tidak'}
                  onChange={(e) => setIsSentral(e.target.value === 'ya')}
                  className={`w-full px-2.5 py-2 border rounded-lg font-bold ${
                    isSentral
                      ? 'bg-amber-100 text-amber-900 border-amber-300'
                      : 'bg-stone-50 text-stone-700 border-stone-300'
                  }`}
                >
                  <option value="ya">Ya (Setor 55%)</option>
                  <option value="tidak">Tidak (0%)</option>
                </select>
              </div>
            </div>

            <div className="space-y-2 pt-1">
              <label className="flex items-center gap-2 text-stone-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={kePemb}
                  onChange={(e) => setKePemb(e.target.checked)}
                  className="rounded border-stone-300 text-emerald-700"
                />
                <span>Alihkan porsi lokal ke Kas Pembangunan</span>
              </label>
              <label className="flex items-center gap-2 text-blue-900 font-semibold cursor-pointer">
                <input
                  type="checkbox"
                  checked={saveToMaster}
                  onChange={(e) => setSaveToMaster(e.target.checked)}
                  className="rounded border-blue-400 text-blue-700"
                />
                <BookmarkPlus className="w-3.5 h-3.5 text-blue-700 shrink-0" />
                <span>Simpan juga ke Master Data (otomatis ada di warta berikutnya)</span>
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-stone-200">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-stone-300 rounded-lg font-semibold text-stone-600 hover:bg-stone-50 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-lg font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5" /> Tambahkan ke Warta
              </button>
            </div>
          </form>
        ) : (
          <div className="p-4 space-y-3 text-xs">
            {missingMasterItems.length > 0 && (
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center justify-between gap-2">
                <span className="text-emerald-950 font-medium">
                  Ada <strong>{missingMasterItems.length} pos</strong> di Master Data yang belum ada di warta ini.
                </span>
                <button
                  type="button"
                  onClick={handleAddAllMissing}
                  className="px-2.5 py-1 bg-emerald-800 text-white rounded font-bold text-[11px] hover:bg-emerald-900 shrink-0 cursor-pointer"
                >
                  + Muat Semua ({missingMasterItems.length})
                </button>
              </div>
            )}

            <div className="max-h-64 overflow-y-auto divide-y divide-stone-100 border border-stone-200 rounded-lg">
              {masterList.map((m) => {
                const alreadyExists = existingCodes.has(m.kode);
                return (
                  <div
                    key={m.id}
                    className="px-3 py-2 flex items-center justify-between gap-2 hover:bg-stone-50"
                  >
                    <div className="min-w-0">
                      <span className="font-mono font-bold text-stone-500 mr-1.5">
                        {m.no_tampilan}
                      </span>
                      <span className="font-semibold text-stone-900">{m.uraian}</span>
                      {alreadyExists && (
                        <span className="ml-1.5 text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded">
                          Sudah ada
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handlePickMasterItem(m)}
                      className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-800 rounded font-bold text-[11px] shrink-0 cursor-pointer"
                    >
                      + Tambah
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

interface TambahPengeluaranModalProps {
  isOpen: boolean;
  onClose: () => void;
  wartaId?: string;
  nextUrutan: number;
  onAddItem: (item: PengeluaranItem) => void;
}

export const TambahPengeluaranModal: React.FC<TambahPengeluaranModalProps> = ({
  isOpen,
  onClose,
  wartaId,
  nextUrutan,
  onAddItem
}) => {
  const [mode, setMode] = useState<'custom' | 'master'>('custom');
  const [uraian, setUraian] = useState('');
  const [posDefault, setPosDefault] = useState<PosPengeluaranDefault>('huria');
  const [nominalStr, setNominalStr] = useState('0');
  const [isSentral, setIsSentral] = useState(false);
  const [saveToMaster, setSaveToMaster] = useState(true);
  const [masterList, setMasterList] = useState<KategoriPengeluaranMaster[]>([]);

  useEffect(() => {
    if (isOpen) {
      getMasterKategoriPengeluaran().then(setMasterList);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const buildItemWithAmount = (
    itemUraian: string,
    pos: PosPengeluaranDefault,
    amount: number,
    sentralFlag: boolean,
    kode?: string
  ): PengeluaranItem => {
    let huria = 0;
    let sosial = 0;
    let pembangunan = 0;
    let transitori = 0;
    let sentralisasi = 0;

    if (sentralFlag && pos === 'huria') {
      sentralisasi = Math.round(amount * 0.55);
      huria = amount - sentralisasi;
    } else if (pos === 'huria') {
      huria = amount;
    } else if (pos === 'sosial') {
      sosial = amount;
    } else if (pos === 'pembangunan') {
      pembangunan = amount;
    } else if (pos === 'transitori') {
      transitori = amount;
    }

    return {
      id: `pengel-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      warta_id: wartaId,
      kode,
      urutan: nextUrutan,
      uraian: itemUraian,
      is_sentralisasi: sentralFlag,
      sentralisasi,
      huria,
      sosial,
      pembangunan,
      transitori
    };
  };

  const handleSubmitCustom = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUraian = uraian.trim();
    if (!cleanUraian) return;

    const amount = parseRupiahInput(nominalStr);
    const customKode = `CUSTOM_PENG_${Date.now()}`;

    if (saveToMaster) {
      const updatedMaster: KategoriPengeluaranMaster[] = [
        ...masterList,
        {
          id: `kp_${Date.now()}`,
          kode: customKode,
          urutan: masterList.length + 1,
          uraian: cleanUraian,
          pos_default: posDefault,
          is_sentralisasi: isSentral
        }
      ];
      await saveMasterKategoriPengeluaran(updatedMaster);
    }

    onAddItem(buildItemWithAmount(cleanUraian, posDefault, amount, isSentral, customKode));
    setUraian('');
    setNominalStr('0');
    onClose();
  };

  const handlePickMaster = (m: KategoriPengeluaranMaster) => {
    onAddItem(
      buildItemWithAmount(m.uraian, m.pos_default, 0, Boolean(m.is_sentralisasi), m.kode)
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/55 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-stone-200 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95">
        <div className="bg-[#0B2545] text-white px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-sm">
            <Plus className="w-4 h-4 text-rose-400" />
            <span>Tambah Item Jenis Pengeluaran</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-stone-300 hover:text-white p-1 rounded cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mode Switcher */}
        <div className="px-4 pt-3 flex gap-2 border-b border-stone-100 pb-2.5 bg-stone-50">
          <button
            type="button"
            onClick={() => setMode('custom')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              mode === 'custom'
                ? 'bg-rose-800 text-white shadow-xs'
                : 'bg-white text-stone-700 border border-stone-200 hover:bg-stone-100'
            }`}
          >
            + Buat Item Pengeluaran Baru
          </button>
          <button
            type="button"
            onClick={() => setMode('master')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              mode === 'master'
                ? 'bg-rose-800 text-white shadow-xs'
                : 'bg-white text-stone-700 border border-stone-200 hover:bg-stone-100'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Pilih dari Master ({masterList.length})</span>
          </button>
        </div>

        {mode === 'custom' ? (
          <form onSubmit={handleSubmitCustom} className="p-4 space-y-3 text-xs">
            <div>
              <label className="block font-bold text-stone-700 mb-1">
                Uraian Jenis Pengeluaran <span className="text-rose-600">*</span>
              </label>
              <input
                type="text"
                required
                value={uraian}
                onChange={(e) => setUraian(e.target.value)}
                placeholder="Contoh: Belanja Perlengkapan Ibadah / Tali Asih..."
                className="w-full px-2.5 py-2 border border-stone-300 rounded-lg"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div>
                <label className="block font-bold text-stone-700 mb-1">Pos Kas</label>
                <select
                  value={posDefault}
                  onChange={(e) => setPosDefault(e.target.value as PosPengeluaranDefault)}
                  className="w-full px-2.5 py-2 border border-stone-300 rounded-lg bg-white"
                >
                  <option value="huria">Kas Huria</option>
                  <option value="sosial">Sosial Huria</option>
                  <option value="pembangunan">Pembangunan</option>
                  <option value="transitori">Transitori</option>
                </select>
              </div>
              <div>
                <label className="block font-bold text-stone-700 mb-1">Sentralisasi?</label>
                <select
                  value={isSentral ? 'ya' : 'tidak'}
                  onChange={(e) => setIsSentral(e.target.value === 'ya')}
                  className={`w-full px-2.5 py-2 border rounded-lg font-bold ${
                    isSentral
                      ? 'bg-amber-100 text-amber-900 border-amber-300'
                      : 'bg-stone-50 text-stone-700 border-stone-300'
                  }`}
                >
                  <option value="tidak">Tidak</option>
                  <option value="ya">Ya (55%)</option>
                </select>
              </div>
              <div>
                <label className="block font-bold text-stone-700 mb-1">Nominal Awal (Rp)</label>
                <input
                  type="text"
                  value={formatRupiah(parseRupiahInput(nominalStr))}
                  onChange={(e) => setNominalStr(e.target.value)}
                  className="w-full px-2.5 py-2 border border-stone-300 rounded-lg font-mono-num text-right font-semibold"
                />
              </div>
            </div>

            <label className="flex items-center gap-2 text-blue-900 font-semibold cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={saveToMaster}
                onChange={(e) => setSaveToMaster(e.target.checked)}
                className="rounded border-blue-400 text-blue-700"
              />
              <BookmarkPlus className="w-3.5 h-3.5 text-blue-700 shrink-0" />
              <span>Simpan juga ke Master Data Pengeluaran</span>
            </label>

            <div className="flex justify-end gap-2 pt-3 border-t border-stone-200">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-stone-300 rounded-lg font-semibold text-stone-600 hover:bg-stone-50 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-rose-800 hover:bg-rose-900 text-white rounded-lg font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5" /> Tambahkan ke Warta
              </button>
            </div>
          </form>
        ) : (
          <div className="p-4 space-y-2 text-xs">
            <p className="text-[11px] text-stone-500">
              Pilih item pengeluaran dari daftar master untuk ditambahkan ke warta ini:
            </p>
            <div className="max-h-64 overflow-y-auto divide-y divide-stone-100 border border-stone-200 rounded-lg">
              {masterList.map((m, idx) => (
                <div
                  key={m.id}
                  className="px-3 py-2 flex items-center justify-between gap-2 hover:bg-stone-50"
                >
                  <div className="min-w-0">
                    <span className="text-stone-400 font-bold mr-1.5">{idx + 1}.</span>
                    <span className="font-semibold text-stone-900">{m.uraian}</span>
                    <span className="ml-2 text-[10px] uppercase font-bold px-1.5 py-0.2 rounded bg-stone-100 text-stone-600">
                      {m.pos_default}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handlePickMaster(m)}
                    className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-800 rounded font-bold text-[11px] shrink-0 cursor-pointer"
                  >
                    + Pakai
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
