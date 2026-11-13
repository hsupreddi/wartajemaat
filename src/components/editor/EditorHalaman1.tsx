import React from 'react';
import { FullWartaData, MingguLiturgi } from '../../types';
import { Plus, Trash2, ArrowUp, ArrowDown, Calendar, Users, Music } from 'lucide-react';
import { MingguLiturgiDropdown } from '../common/MingguLiturgiDropdown';

interface EditorHalaman1Props {
  data: FullWartaData;
  onChange: (updated: FullWartaData) => void;
  disabled?: boolean;
}

export const EditorHalaman1: React.FC<EditorHalaman1Props> = ({ data, onChange, disabled }) => {
  const { warta, acara_minggu, acara_partangiangan, parhobas, sopo_godang } = data;

  const updateWartaField = (field: string, val: any) => {
    onChange({
      ...data,
      warta: {
        ...data.warta,
        [field]: val
      }
    });
  };

  // Acara Minggu list handlers
  const handleAddAcaraMinggu = () => {
    const newItem = {
      id: `am-${Date.now()}`,
      warta_id: warta.id,
      jenis: 'minggu' as const,
      urutan: acara_minggu.length + 1,
      uraian: '',
      keterangan: ''
    };
    onChange({
      ...data,
      acara_minggu: [...acara_minggu, newItem]
    });
  };

  const handleUpdateAcaraMinggu = (index: number, field: 'uraian' | 'keterangan', val: string) => {
    const updated = [...acara_minggu];
    updated[index] = { ...updated[index], [field]: val };
    onChange({ ...data, acara_minggu: updated });
  };

  const handleDeleteAcaraMinggu = (index: number) => {
    const updated = acara_minggu
      .filter((_, idx) => idx !== index)
      .map((it, idx) => ({ ...it, urutan: idx + 1 }));
    onChange({ ...data, acara_minggu: updated });
  };

  const handleMoveAcaraMinggu = (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === acara_minggu.length - 1)
    )
      return;
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    const updated = [...acara_minggu];
    const temp = updated[index];
    updated[index] = updated[targetIdx];
    updated[targetIdx] = temp;
    onChange({
      ...data,
      acara_minggu: updated.map((it, idx) => ({ ...it, urutan: idx + 1 }))
    });
  };

  // Acara Partangiangan handlers
  const handleAddAcaraPart = () => {
    const newItem = {
      id: `ap-${Date.now()}`,
      warta_id: warta.id,
      jenis: 'partangiangan' as const,
      urutan: acara_partangiangan.length + 1,
      uraian: '',
      keterangan: ''
    };
    onChange({
      ...data,
      acara_partangiangan: [...acara_partangiangan, newItem]
    });
  };

  const handleUpdateAcaraPart = (index: number, field: 'uraian' | 'keterangan', val: string) => {
    const updated = [...acara_partangiangan];
    updated[index] = { ...updated[index], [field]: val };
    onChange({ ...data, acara_partangiangan: updated });
  };

  const handleDeleteAcaraPart = (index: number) => {
    const updated = acara_partangiangan
      .filter((_, idx) => idx !== index)
      .map((it, idx) => ({ ...it, urutan: idx + 1 }));
    onChange({ ...data, acara_partangiangan: updated });
  };

  // Parhobas handler
  const handleUpdateParhobas = (index: number, field: 'skm' | 'sesi1' | 'sesi2', val: string) => {
    const updated = [...parhobas];
    updated[index] = { ...updated[index], [field]: val };
    onChange({ ...data, parhobas: updated });
  };

  // Sopo Godang handler
  const handleUpdateSopoGodang = (index: number, field: 'nama' | 'tanggal', val: string) => {
    const updated = [...sopo_godang];
    updated[index] = { ...updated[index], [field]: val };
    onChange({ ...data, sopo_godang: updated });
  };

  return (
    <div className="space-y-6">
      {/* 1. INFORMASI MINGGU & LITURGI UTAMA */}
      <div className="bg-white p-5 rounded-lg border border-stone-200 shadow-sm space-y-4">
        <div className="flex items-center gap-2 border-b border-stone-100 pb-2">
          <Calendar className="w-4 h-4 text-blue-700" />
          <h3 className="font-bold text-stone-900 text-sm md:text-base">
            Informasi Minggu & Ayat Firman
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Tanggal Hari Minggu
            </label>
            <input
              type="date"
              disabled={disabled}
              value={warta.tanggal_minggu}
              onChange={(e) => updateWartaField('tanggal_minggu', e.target.value)}
              className="w-full px-3 py-2 text-xs border border-stone-300 rounded focus:ring-1 focus:ring-blue-600 focus:outline-none"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-stone-700">
                Goar ni Minggu (Kalender Liturgi HKBP)
              </label>
              <span className="text-[10px] bg-blue-50 text-blue-900 font-bold px-1.5 py-0.2 rounded border border-blue-200">
                63 Minggu HKBP
              </span>
            </div>
            <MingguLiturgiDropdown
              value={warta.goar_minggu}
              onChange={(nama, item) => {
                if (item) {
                  onChange({
                    ...data,
                    warta: {
                      ...data.warta,
                      goar_minggu: item.nama_minggu.toUpperCase(),
                      topik_minggu: item.topik_default || data.warta.topik_minggu,
                      ayat_teks: item.ayat_default || data.warta.ayat_teks,
                      ayat_ref: item.ayat_ref_default || data.warta.ayat_ref
                    }
                  });
                } else {
                  updateWartaField('goar_minggu', nama.toUpperCase());
                }
              }}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Topik ni Minggu
            </label>
            <input
              type="text"
              disabled={disabled}
              value={warta.topik_minggu || ''}
              onChange={(e) => updateWartaField('topik_minggu', e.target.value)}
              placeholder="e.g. Marpangunsandean tu Debata di Tingki Hagogotan"
              className="w-full px-3 py-2 text-xs border border-stone-300 rounded focus:ring-1 focus:ring-blue-600 focus:outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2">
          <div className="md:col-span-3">
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Ayat Minggu (Teks Firman Batak/Indonesia)
            </label>
            <textarea
              rows={2}
              disabled={disabled}
              value={warta.ayat_teks || ''}
              onChange={(e) => updateWartaField('ayat_teks', e.target.value)}
              placeholder="Alai angka na marhaposan tu Jahowa dapotan gogo imbaru..."
              className="w-full px-3 py-2 text-xs border border-stone-300 rounded focus:ring-1 focus:ring-blue-600 focus:outline-none font-serif-body"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Referensi Ayat (Contoh: Jeremia 17:7)
            </label>
            <input
              type="text"
              disabled={disabled}
              value={warta.ayat_ref || ''}
              onChange={(e) => updateWartaField('ayat_ref', e.target.value)}
              placeholder="e.g. Jesayas 40:31"
              className="w-full px-3 py-2 text-xs border border-stone-300 rounded focus:ring-1 focus:ring-blue-600 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* 2. STATISTIK RUAS & KOOR */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Ruas na ro */}
        <div className="bg-white p-4 rounded-lg border border-stone-200 shadow-sm space-y-3">
          <div className="flex items-center gap-2 border-b border-stone-100 pb-1.5">
            <Users className="w-4 h-4 text-blue-700" />
            <h4 className="font-bold text-stone-900 text-xs uppercase">
              Ruas na Ro Marminggu (Kehadiran)
            </h4>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-[11px] text-stone-600 mb-0.5">Sekolah Minggu</label>
              <input
                type="number"
                disabled={disabled}
                value={warta.ruas_sm || ''}
                onChange={(e) => updateWartaField('ruas_sm', parseInt(e.target.value, 10) || 0)}
                className="w-full px-2 py-1.5 text-xs border border-stone-300 rounded text-center font-bold"
              />
            </div>
            <div>
              <label className="block text-[11px] text-stone-600 mb-0.5">Sesi 1 (Pagi)</label>
              <input
                type="number"
                disabled={disabled}
                value={warta.ruas_pagi || ''}
                onChange={(e) => updateWartaField('ruas_pagi', parseInt(e.target.value, 10) || 0)}
                className="w-full px-2 py-1.5 text-xs border border-stone-300 rounded text-center font-bold"
              />
            </div>
            <div>
              <label className="block text-[11px] text-stone-600 mb-0.5">Sesi 2 (Siang)</label>
              <input
                type="number"
                disabled={disabled}
                value={warta.ruas_siang || ''}
                onChange={(e) => updateWartaField('ruas_siang', parseInt(e.target.value, 10) || 0)}
                className="w-full px-2 py-1.5 text-xs border border-stone-300 rounded text-center font-bold"
              />
            </div>
          </div>
        </div>

        {/* Na markoor */}
        <div className="bg-white p-4 rounded-lg border border-stone-200 shadow-sm space-y-3">
          <div className="flex items-center gap-2 border-b border-stone-100 pb-1.5">
            <Music className="w-4 h-4 text-blue-700" />
            <h4 className="font-bold text-stone-900 text-xs uppercase">
              Na Markoor Sadari On (Hari Ini)
            </h4>
          </div>
          <div className="space-y-2">
            <div>
              <label className="block text-[11px] text-stone-600 mb-0.5">Koor Sesi 1 (Pagi)</label>
              <input
                type="text"
                disabled={disabled}
                value={warta.markoor_1 || ''}
                onChange={(e) => updateWartaField('markoor_1', e.target.value)}
                placeholder="e.g. Ina Ester, Ama Immanuel"
                className="w-full px-2.5 py-1.5 text-xs border border-stone-300 rounded"
              />
            </div>
            <div>
              <label className="block text-[11px] text-stone-600 mb-0.5">Koor Sesi 2 (Siang)</label>
              <input
                type="text"
                disabled={disabled}
                value={warta.markoor_2 || ''}
                onChange={(e) => updateWartaField('markoor_2', e.target.value)}
                placeholder="e.g. Ina Kamis, Remaja Naposo"
                className="w-full px-2.5 py-1.5 text-xs border border-stone-300 rounded"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 3. ACARA MINGGU (DAFTAR DINAMIS) */}
      <div className="bg-white p-5 rounded-lg border border-stone-200 shadow-sm space-y-3">
        <div className="flex items-center justify-between border-b border-stone-100 pb-2">
          <div>
            <h3 className="font-bold text-stone-900 text-sm md:text-base">
              Acara Minggu (Daftar Liturgi Dinamis)
            </h3>
            <p className="text-xs text-stone-500">
              Ubah teks lagu BE/BN, ayat patik/epistel, atau keterangan (Jongjong, Pel 1a, 1b, Pelean II).
            </p>
          </div>
          {!disabled && (
            <button
              onClick={handleAddAcaraMinggu}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded text-xs font-semibold transition"
            >
              <Plus className="w-3.5 h-3.5" /> Tambah Butir Acara
            </button>
          )}
        </div>

        <div className="space-y-1.5 max-h-[420px] overflow-y-auto pr-1">
          {acara_minggu.map((item, idx) => (
            <div
              key={item.id || idx}
              className="flex items-center gap-2 p-1.5 bg-stone-50 rounded border border-stone-200 hover:border-stone-300"
            >
              <span className="w-6 text-center text-xs font-bold text-stone-500">{idx + 1}.</span>
              <input
                type="text"
                disabled={disabled}
                value={item.uraian}
                onChange={(e) => handleUpdateAcaraMinggu(idx, 'uraian', e.target.value)}
                placeholder="Uraian Tata Ibadah"
                className="flex-1 px-2 py-1 text-xs bg-white border border-stone-300 rounded focus:ring-1 focus:ring-blue-600 focus:outline-none"
              />
              <input
                type="text"
                disabled={disabled}
                value={item.keterangan || ''}
                onChange={(e) => handleUpdateAcaraMinggu(idx, 'keterangan', e.target.value)}
                placeholder="Keterangan (Jongjong, Pel 1a/1b)"
                className="w-36 px-2 py-1 text-xs bg-white border border-stone-300 rounded focus:ring-1 focus:ring-blue-600 focus:outline-none text-right font-medium text-stone-700"
              />
              {!disabled && (
                <div className="flex items-center gap-0.5">
                  <button
                    onClick={() => handleMoveAcaraMinggu(idx, 'up')}
                    disabled={idx === 0}
                    className="p-1 text-stone-400 hover:text-stone-700 disabled:opacity-20"
                    title="Pindah ke atas"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleMoveAcaraMinggu(idx, 'down')}
                    disabled={idx === acara_minggu.length - 1}
                    className="p-1 text-stone-400 hover:text-stone-700 disabled:opacity-20"
                    title="Pindah ke bawah"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeleteAcaraMinggu(idx)}
                    className="p-1 text-red-500 hover:text-red-700"
                    title="Hapus baris"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 4. ACARA PARTANGIANGAN */}
      <div className="bg-white p-5 rounded-lg border border-stone-200 shadow-sm space-y-3">
        <div className="flex items-center justify-between border-b border-stone-100 pb-2">
          <div>
            <h3 className="font-bold text-stone-900 text-sm md:text-base">
              Acara Partangiangan (Daftar Dinamis)
            </h3>
            <p className="text-xs text-stone-500">
              Tata ibadah partangiangan lingkungan (9 butir liturgis).
            </p>
          </div>
          {!disabled && (
            <button
              onClick={handleAddAcaraPart}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded text-xs font-semibold transition"
            >
              <Plus className="w-3.5 h-3.5" /> Tambah Butir
            </button>
          )}
        </div>

        <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-1">
          {acara_partangiangan.map((item, idx) => (
            <div
              key={item.id || idx}
              className="flex items-center gap-2 p-1.5 bg-stone-50 rounded border border-stone-200"
            >
              <span className="w-6 text-center text-xs font-bold text-stone-500">{idx + 1}.</span>
              <input
                type="text"
                disabled={disabled}
                value={item.uraian}
                onChange={(e) => handleUpdateAcaraPart(idx, 'uraian', e.target.value)}
                placeholder="Uraian Partangiangan"
                className="flex-1 px-2 py-1 text-xs bg-white border border-stone-300 rounded focus:outline-none"
              />
              <input
                type="text"
                disabled={disabled}
                value={item.keterangan || ''}
                onChange={(e) => handleUpdateAcaraPart(idx, 'keterangan', e.target.value)}
                placeholder="Keterangan"
                className="w-32 px-2 py-1 text-xs bg-white border border-stone-300 rounded text-right"
              />
              {!disabled && (
                <button
                  onClick={() => handleDeleteAcaraPart(idx)}
                  className="p-1 text-red-500 hover:text-red-700"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 5. PARHOBAS MINGGU (6 Baris x 3 Sesi) */}
      <div className="bg-white p-5 rounded-lg border border-stone-200 shadow-sm space-y-3">
        <div className="border-b border-stone-100 pb-2">
          <h3 className="font-bold text-stone-900 text-sm md:text-base">
            Parhobas Minggu (Pelayan Ibadah)
          </h3>
          <p className="text-xs text-stone-500">
            Daftar pelayan firman, agenda, warta, persembahan, organis, dan harentaon.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-stone-100 text-stone-800 border-b border-stone-300">
                <th className="py-2 px-2 text-left font-bold w-24">Peran / Ulaon</th>
                <th className="py-2 px-2 text-left font-bold">Sekolah Minggu</th>
                <th className="py-2 px-2 text-left font-bold">Minggu Sesi 1 (Pagi 08.30)</th>
                <th className="py-2 px-2 text-left font-bold">Minggu Sesi 2 (Siang 10.30)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200">
              {parhobas.map((p, idx) => (
                <tr key={p.id || idx}>
                  <td className="py-1.5 px-2 font-bold text-stone-900 bg-stone-50">{p.peran}</td>
                  <td className="py-1.5 px-2">
                    <input
                      type="text"
                      disabled={disabled}
                      value={p.skm || ''}
                      onChange={(e) => handleUpdateParhobas(idx, 'skm', e.target.value)}
                      className="w-full px-2 py-1 border border-stone-300 rounded text-xs"
                    />
                  </td>
                  <td className="py-1.5 px-2">
                    <input
                      type="text"
                      disabled={disabled}
                      value={p.sesi1 || ''}
                      onChange={(e) => handleUpdateParhobas(idx, 'sesi1', e.target.value)}
                      className="w-full px-2 py-1 border border-stone-300 rounded text-xs"
                    />
                  </td>
                  <td className="py-1.5 px-2">
                    <input
                      type="text"
                      disabled={disabled}
                      value={p.sesi2 || ''}
                      onChange={(e) => handleUpdateParhobas(idx, 'sesi2', e.target.value)}
                      className="w-full px-2 py-1 border border-stone-300 rounded text-xs"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 6. DAFTAR PEMAKAI SOPO GODANG (Ditempatkan di Hal 3 setelah Rekapitulasi Keuangan) */}
      <div className="bg-white p-5 rounded-lg border border-stone-200 shadow-sm space-y-3">
        <div className="border-b border-stone-100 pb-2 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="font-bold text-stone-900 text-sm md:text-base">
              Daftar Pemakai Sopo Godang
            </h3>
            <p className="text-xs text-stone-500">
              Jadwal pemakaian gedung serbaguna (kini tercetak di Halaman 3 setelah Rekapitulasi Keuangan).
            </p>
          </div>
          <span className="text-[11px] font-semibold text-blue-800 bg-blue-50 px-2.5 py-0.5 rounded border border-blue-200">
            Dicetak di Halaman 3
          </span>
        </div>

        <div className="space-y-2">
          {sopo_godang.slice(0, 5).map((sg, idx) => (
            <div key={sg.id || idx} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center">
              <span className="w-6 text-xs font-bold text-stone-500 md:col-span-1">{idx + 1}.</span>
              <div className="md:col-span-7">
                <input
                  type="text"
                  disabled={disabled}
                  value={sg.nama}
                  onChange={(e) => handleUpdateSopoGodang(idx, 'nama', e.target.value)}
                  placeholder="Nama Keluarga / Kegiatan / Alamat"
                  className="w-full px-2.5 py-1.5 text-xs border border-stone-300 rounded"
                />
              </div>
              <div className="md:col-span-4">
                <input
                  type="text"
                  disabled={disabled}
                  value={sg.tanggal}
                  onChange={(e) => handleUpdateSopoGodang(idx, 'tanggal', e.target.value)}
                  placeholder="Hari, Tanggal (e.g. Selasa, 11 Maret 2025)"
                  className="w-full px-2.5 py-1.5 text-xs border border-stone-300 rounded"
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
