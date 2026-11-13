import React, { useState } from 'react';
import { FullWartaData } from '../../types';
import { Plus, Trash2, ArrowUp, ArrowDown, Cake, Music, Home, FileText, Sparkles, RefreshCw } from 'lucide-react';
import { TemplateSelectorModal } from './TemplateSelectorModal';
import { getSeninMingguRange } from '../../lib/dateUtils';
import { getUlangTahun, notify } from '../../lib/jemaatApi';

interface EditorHalaman2Props {
  data: FullWartaData;
  onChange: (updated: FullWartaData) => void;
  disabled?: boolean;
}

export const EditorHalaman2: React.FC<EditorHalaman2Props> = ({ data, onChange, disabled }) => {
  const { warta, ulang_tahun, jadwal_partangiangan, pengumuman } = data;
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [isSyncingUltah, setIsSyncingUltah] = useState(false);
  const { seninStr, mingguStr, labelPeriode } = getSeninMingguRange(warta.tanggal_minggu);

  const handleSyncUlangTahun = async () => {
    setIsSyncingUltah(true);
    try {
      const res = await getUlangTahun(seninStr, mingguStr);
      onChange({
        ...data,
        ulang_tahun: res,
        warta: {
          ...data.warta,
          ulang_tahun_snapshot: res
        }
      });
      notify('success', `Berhasil menyinkronkan ${res.length} jemaat berulang tahun dari database.`);
    } catch (err: any) {
      notify('error', `Gagal menarik data ulang tahun: ${err.message || 'Error tidak diketahui'}`);
    } finally {
      setIsSyncingUltah(false);
    }
  };

  const updateWartaField = (field: string, val: any) => {
    onChange({
      ...data,
      warta: {
        ...data.warta,
        [field]: val
      }
    });
  };

  // Jadwal Partangiangan Handlers
  const handleAddPartangiangan = () => {
    const newItem = {
      id: `jp-${Date.now()}`,
      warta_id: warta.id,
      hari: 'Rabu',
      lingkungan: 'Lingkungan ',
      pukul: '20.00 WIB',
      inganan: 'Kel. ',
      urutan: jadwal_partangiangan.length + 1
    };
    onChange({
      ...data,
      jadwal_partangiangan: [...jadwal_partangiangan, newItem]
    });
  };

  const handleUpdatePartangiangan = (index: number, field: string, val: string) => {
    const updated = [...jadwal_partangiangan];
    updated[index] = { ...updated[index], [field]: val };
    onChange({ ...data, jadwal_partangiangan: updated });
  };

  const handleDeletePartangiangan = (index: number) => {
    const updated = jadwal_partangiangan.filter((_, idx) => idx !== index);
    onChange({ ...data, jadwal_partangiangan: updated });
  };

  // Pengumuman Dinamis Handlers
  const handleAddPengumuman = (judul = '', isi = '') => {
    const newItem = {
      id: `peng-${Date.now()}`,
      warta_id: warta.id,
      urutan: pengumuman.length + 1,
      judul: judul || 'Judul Pengumuman Baru',
      isi: isi || ''
    };
    onChange({
      ...data,
      pengumuman: [...pengumuman, newItem]
    });
  };

  const handleUpdatePengumuman = (index: number, field: 'judul' | 'isi', val: string) => {
    const updated = [...pengumuman];
    updated[index] = { ...updated[index], [field]: val };
    onChange({ ...data, pengumuman: updated });
  };

  const handleDeletePengumuman = (index: number) => {
    const updated = pengumuman
      .filter((_, idx) => idx !== index)
      .map((it, idx) => ({ ...it, urutan: idx + 1 }));
    onChange({ ...data, pengumuman: updated });
  };

  const handleMovePengumuman = (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === pengumuman.length - 1)
    )
      return;
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    const updated = [...pengumuman];
    const temp = updated[index];
    updated[index] = updated[targetIdx];
    updated[targetIdx] = temp;
    onChange({
      ...data,
      pengumuman: updated.map((it, idx) => ({ ...it, urutan: idx + 1 }))
    });
  };

  return (
    <div className="space-y-6">
      {/* 1. INFORMASI ULANG TAHUN RUAS (OTOMATIS DARI DATABASE) */}
      <div className="bg-white p-5 rounded-lg border border-stone-200 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 pb-2">
          <div className="flex items-center gap-2">
            <Cake className="w-5 h-5 text-pink-600" />
            <div>
              <h3 className="font-bold text-stone-900 text-sm md:text-base">
                2. Daftar Ulang Tahun Ruas (Penarikan Otomatis)
              </h3>
              <p className="text-xs text-stone-500">
                Otomatis disaring dari master data jemaat untuk periode: <span className="font-semibold text-stone-800">{labelPeriode}</span>.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSyncUlangTahun}
              disabled={disabled || isSyncingUltah}
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-pink-50 hover:bg-pink-100 disabled:opacity-50 text-pink-700 border border-pink-200 rounded text-xs font-semibold transition cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncingUltah ? 'animate-spin' : ''}`} />
              <span>{isSyncingUltah ? 'Menyinkronkan...' : 'Sinkronkan dari Supabase (RPC)'}</span>
            </button>
            <span className="text-xs px-2.5 py-1 bg-stone-100 text-stone-700 rounded-md font-medium">
              {ulang_tahun?.length || 0} Jemaat Berulang Tahun
            </span>
          </div>
        </div>

        {ulang_tahun && ulang_tahun.length > 0 ? (
          <div className="overflow-x-auto border border-stone-200 rounded">
            <table className="w-full text-xs">
              <thead className="bg-stone-50 text-stone-700 border-b border-stone-200">
                <tr>
                  <th className="py-1.5 px-2 text-center w-8">No</th>
                  <th className="py-1.5 px-2 text-left">Nama Anggota</th>
                  <th className="py-1.5 px-2 text-center w-12">L/P</th>
                  <th className="py-1.5 px-2 text-center w-20">Tgl/Bln</th>
                  <th className="py-1.5 px-2 text-center w-16">Usia</th>
                  <th className="py-1.5 px-2 text-left">Wijk / Lingkungan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {ulang_tahun.map((u, idx) => (
                  <tr key={idx} className="hover:bg-stone-50">
                    <td className="py-1 px-2 text-center text-stone-500">{idx + 1}.</td>
                    <td className="py-1 px-2 font-semibold text-stone-900">{u.nama}</td>
                    <td className="py-1 px-2 text-center text-stone-600">{u.jenis_kelamin}</td>
                    <td className="py-1 px-2 text-center font-mono-num">{u.hari_bulan}</td>
                    <td className="py-1 px-2 text-center font-bold text-stone-800">{u.usia} Thn</td>
                    <td className="py-1 px-2 text-stone-600">{u.wijk}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-4 text-center text-xs text-stone-500 bg-stone-50 rounded border border-dashed border-stone-200">
            Tidak ada anggota jemaat yang berulang tahun pada periode {labelPeriode}. Anda dapat menambah anggota jemaat baru di menu Master Data Anggota.
          </div>
        )}
      </div>

      {/* 2. JADWAL KOOR MINGGU DEPAN */}
      <div className="bg-white p-5 rounded-lg border border-stone-200 shadow-sm space-y-3">
        <div className="flex items-center gap-2 border-b border-stone-100 pb-2">
          <Music className="w-4 h-4 text-blue-700" />
          <h3 className="font-bold text-stone-900 text-sm md:text-base">
            3. Jadwal Koor Minggu na Naeng Ro (Minggu Depan)
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Tanggal Minggu Depan
            </label>
            <input
              type="date"
              disabled={disabled}
              value={warta.jadwal_koor_tanggal || ''}
              onChange={(e) => updateWartaField('jadwal_koor_tanggal', e.target.value)}
              className="w-full px-3 py-2 text-xs border border-stone-300 rounded"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Koor Sesi 1 (Pagi 08.30 WIB)
            </label>
            <input
              type="text"
              disabled={disabled}
              value={warta.koor_pagi || ''}
              onChange={(e) => updateWartaField('koor_pagi', e.target.value)}
              placeholder="e.g. Ina Sion, Ama Estomihi"
              className="w-full px-3 py-2 text-xs border border-stone-300 rounded"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Koor Sesi 2 (Siang 10.30 WIB)
            </label>
            <input
              type="text"
              disabled={disabled}
              value={warta.koor_siang || ''}
              onChange={(e) => updateWartaField('koor_siang', e.target.value)}
              placeholder="e.g. Lansia, Koor Gabungan"
              className="w-full px-3 py-2 text-xs border border-stone-300 rounded"
            />
          </div>
        </div>
      </div>

      {/* 3. JADWAL PARTANGIANGAN LINGKUNGAN */}
      <div className="bg-white p-5 rounded-lg border border-stone-200 shadow-sm space-y-3">
        <div className="flex items-center justify-between border-b border-stone-100 pb-2">
          <div className="flex items-center gap-2">
            <Home className="w-4 h-4 text-blue-700" />
            <h3 className="font-bold text-stone-900 text-sm md:text-base">
              4. Jadwal Partangiangan Lingkungan di Minggu On
            </h3>
          </div>
          {!disabled && (
            <button
              onClick={handleAddPartangiangan}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded text-xs font-semibold transition"
            >
              <Plus className="w-3.5 h-3.5" /> Tambah Jadwal Lingkungan
            </button>
          )}
        </div>

        <div className="space-y-2">
          {jadwal_partangiangan.map((jp, idx) => (
            <div
              key={jp.id || idx}
              className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center p-2 bg-stone-50 rounded border border-stone-200"
            >
              <div className="md:col-span-2">
                <input
                  type="text"
                  disabled={disabled}
                  value={jp.hari}
                  onChange={(e) => handleUpdatePartangiangan(idx, 'hari', e.target.value)}
                  placeholder="Hari / Tgl"
                  className="w-full px-2 py-1 text-xs border border-stone-300 rounded"
                />
              </div>
              <div className="md:col-span-3">
                <input
                  type="text"
                  disabled={disabled}
                  value={jp.lingkungan}
                  onChange={(e) => handleUpdatePartangiangan(idx, 'lingkungan', e.target.value)}
                  placeholder="Nama Lingkungan"
                  className="w-full px-2 py-1 text-xs border border-stone-300 rounded font-semibold"
                />
              </div>
              <div className="md:col-span-2">
                <input
                  type="text"
                  disabled={disabled}
                  value={jp.pukul}
                  onChange={(e) => handleUpdatePartangiangan(idx, 'pukul', e.target.value)}
                  placeholder="Pukul"
                  className="w-full px-2 py-1 text-xs border border-stone-300 rounded text-center"
                />
              </div>
              <div className="md:col-span-4">
                <input
                  type="text"
                  disabled={disabled}
                  value={jp.inganan}
                  onChange={(e) => handleUpdatePartangiangan(idx, 'inganan', e.target.value)}
                  placeholder="Inganan / Keluarga Tuan Rumah"
                  className="w-full px-2 py-1 text-xs border border-stone-300 rounded"
                />
              </div>
              {!disabled && (
                <div className="md:col-span-1 flex justify-end">
                  <button
                    onClick={() => handleDeletePartangiangan(idx)}
                    className="p-1 text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 4. PENGUMUMAN DINAMIS (TINGTING NAMARRAGAM) */}
      <div className="bg-white p-5 rounded-lg border border-stone-200 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 pb-2">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-700" />
            <div>
              <h3 className="font-bold text-stone-900 text-sm md:text-base">
                5+. Daftar Pengumuman Dinamis (Tingting Namarragam)
              </h3>
              <p className="text-xs text-stone-500">
                Pengumuman bernomor otomatis: Jemaat Baru, Kelahiran, Tukar Mimbar, Kalender, dsb.
              </p>
            </div>
          </div>
          {!disabled && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsTemplateModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200 rounded text-xs font-semibold transition"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-600" /> Template Pengumuman
              </button>
              <button
                onClick={() => handleAddPengumuman()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold transition"
              >
                <Plus className="w-3.5 h-3.5" /> Tambah Baru
              </button>
            </div>
          )}
        </div>

        <div className="space-y-3">
          {pengumuman.map((item, idx) => {
            const noNumber = idx + 5;
            return (
              <div
                key={item.id || idx}
                className="p-3.5 bg-stone-50 rounded-lg border border-stone-200 space-y-2 hover:border-stone-300 transition"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-1">
                    <span className="w-6 text-xs font-bold text-stone-600">{noNumber}.</span>
                    <input
                      type="text"
                      disabled={disabled}
                      value={item.judul}
                      onChange={(e) => handleUpdatePengumuman(idx, 'judul', e.target.value)}
                      placeholder="Judul Pengumuman"
                      className="flex-1 px-2.5 py-1 text-xs font-bold bg-white border border-stone-300 rounded focus:ring-1 focus:ring-blue-600 focus:outline-none uppercase text-stone-900"
                    />
                  </div>

                  {!disabled && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleMovePengumuman(idx, 'up')}
                        disabled={idx === 0}
                        className="p-1 text-stone-400 hover:text-stone-700 disabled:opacity-20"
                        title="Pindah ke atas"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleMovePengumuman(idx, 'down')}
                        disabled={idx === pengumuman.length - 1}
                        className="p-1 text-stone-400 hover:text-stone-700 disabled:opacity-20"
                        title="Pindah ke bawah"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeletePengumuman(idx)}
                        className="p-1 text-red-500 hover:text-red-700"
                        title="Hapus pengumuman"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                <textarea
                  rows={3}
                  disabled={disabled}
                  value={item.isi}
                  onChange={(e) => handleUpdatePengumuman(idx, 'isi', e.target.value)}
                  placeholder="Isi pengumuman lengkap..."
                  className="w-full px-3 py-1.5 text-xs bg-white border border-stone-300 rounded focus:ring-1 focus:ring-blue-600 focus:outline-none"
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal Template */}
      <TemplateSelectorModal
        isOpen={isTemplateModalOpen}
        onClose={() => setIsTemplateModalOpen(false)}
        onSelect={(tmpl) => handleAddPengumuman(tmpl.judul, tmpl.isi)}
      />
    </div>
  );
};
