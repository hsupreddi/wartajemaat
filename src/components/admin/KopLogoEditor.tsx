import React, { useState } from 'react';
import { PengaturanHuria } from '../../types';
import { KopSurat } from '../warta/KopSurat';
import { HkbpCrossLogo, OFFICIAL_HKBP_CROSS_LOGO_URL } from '../logos/HkbpCrossLogo';
import {
  HkbpTransformasiLogo,
  OFFICIAL_TRANSFORMASI_LOGO_URL
} from '../logos/HkbpTransformasiLogo';
import { Save, RotateCcw, CheckCircle, Sparkles } from 'lucide-react';

interface KopLogoEditorProps {
  pengaturan: PengaturanHuria;
  onSave: (updated: PengaturanHuria) => void;
}

export const KopLogoEditor: React.FC<KopLogoEditorProps> = ({ pengaturan, onSave }) => {
  const [form, setForm] = useState<PengaturanHuria>({ ...pengaturan });
  const [toast, setToast] = useState<string | null>(null);

  const handleChange = (field: keyof PengaturanHuria, val: any) => {
    setForm((prev) => ({ ...prev, [field]: val }));
  };

  const handleFileUpload = (
    field: 'logo_salib_url' | 'logo_transformasi_url',
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        handleChange(field, reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleResetLogo = (field: 'logo_salib_url' | 'logo_transformasi_url') => {
    handleChange(
      field,
      field === 'logo_salib_url' ? OFFICIAL_HKBP_CROSS_LOGO_URL : OFFICIAL_TRANSFORMASI_LOGO_URL
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(form);
    setToast('Kop surat dan logo warta jemaat berhasil diperbarui!');
    setTimeout(() => setToast(null), 3500);
  };

  const isCustomSalib =
    Boolean(form.logo_salib_url) && form.logo_salib_url !== OFFICIAL_HKBP_CROSS_LOGO_URL;
  const isCustomTransformasi =
    Boolean(form.logo_transformasi_url) &&
    form.logo_transformasi_url !== OFFICIAL_TRANSFORMASI_LOGO_URL;

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toast && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{toast}</span>
        </div>
      )}

      {/* Live Preview Box */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-stone-200 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-stone-100 pb-2.5">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
            <h3 className="font-bold text-stone-900 text-sm md:text-base">
              Pratinjau Kop Surat Resmi (A4 Live Preview)
            </h3>
          </div>
          <span className="text-[11px] text-stone-500">
            Kop surat ini otomatis dicetak di atas Halaman 1 Tata Ibadah
          </span>
        </div>

        <div className="p-3 sm:p-4 bg-stone-50 rounded-xl border border-dashed border-stone-300 overflow-x-auto">
          <KopSurat pengaturan={form} />
        </div>
      </div>

      {/* Editor Form */}
      <form
        onSubmit={handleSubmit}
        className="bg-white p-4 sm:p-5 rounded-2xl border border-stone-200 shadow-xs space-y-6"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-3">
          <div>
            <h3 className="font-bold text-stone-900 text-base">
              Pengaturan Teks & Logo Kop Surat
            </h3>
            <p className="text-xs text-stone-500">
              Ubah identitas gereja, nomor SK pengakuan, logo salib, dan logo Transformasi HKBP 2024–2028.
            </p>
          </div>

          <button
            type="submit"
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer min-h-[42px] shrink-0"
          >
            <Save className="w-4 h-4" /> Simpan Perubahan Kop
          </button>
        </div>

        {/* Section 1: Logo Management */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {/* Logo Salib HKBP (Kiri) */}
          <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="font-bold text-stone-900 text-xs">1. Logo Salib HKBP (Kiri)</span>
              {isCustomSalib ? (
                <button
                  type="button"
                  onClick={() => handleResetLogo('logo_salib_url')}
                  className="text-[11px] text-blue-700 hover:text-blue-900 font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" /> Gunakan Logo Resmi
                </button>
              ) : (
                <span className="text-[11px] text-blue-800 font-semibold">Logo Resmi Aktif</span>
              )}
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="w-20 h-20 bg-white rounded-xl border border-stone-300 flex items-center justify-center p-2 shrink-0 overflow-hidden mx-auto sm:mx-0">
                {form.logo_salib_url ? (
                  <img
                    src={form.logo_salib_url}
                    alt="Logo Salib"
                    className="w-full h-full object-contain"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <HkbpCrossLogo className="w-14 h-14" />
                )}
              </div>

              <div className="space-y-2 flex-1 min-w-0">
                <div>
                  <label className="block text-[11px] text-stone-600 mb-1">
                    Unggah Berkas Gambar (PNG/JPG/SVG)
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileUpload('logo_salib_url', e)}
                    className="block w-full text-xs text-stone-500 file:mr-2 file:py-1.5 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-stone-600 mb-0.5">
                    Atau Masukkan URL Gambar:
                  </label>
                  <input
                    type="text"
                    value={form.logo_salib_url || ''}
                    onChange={(e) => handleChange('logo_salib_url', e.target.value)}
                    placeholder="https://.../logo-hkbp.png"
                    className="w-full px-2.5 py-1.5 text-xs border border-stone-300 rounded-lg bg-white min-h-[38px]"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Logo Transformasi HKBP (Kanan) */}
          <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="font-bold text-stone-900 text-xs">
                2. Logo Transformasi HKBP 2024–2028 (Kanan)
              </span>
              {isCustomTransformasi ? (
                <button
                  type="button"
                  onClick={() => handleResetLogo('logo_transformasi_url')}
                  className="text-[11px] text-indigo-700 hover:text-indigo-900 font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" /> Gunakan Logo Resmi
                </button>
              ) : (
                <span className="text-[11px] text-indigo-800 font-semibold">Logo Resmi Aktif</span>
              )}
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="w-20 h-20 bg-white rounded-xl border border-stone-300 flex items-center justify-center p-1.5 shrink-0 overflow-hidden mx-auto sm:mx-0">
                {form.logo_transformasi_url ? (
                  <img
                    src={form.logo_transformasi_url}
                    alt="Logo Transformasi"
                    className="w-full h-full object-contain"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <HkbpTransformasiLogo className="w-16 h-16" />
                )}
              </div>

              <div className="space-y-2 flex-1 min-w-0">
                <div>
                  <label className="block text-[11px] text-stone-600 mb-1">
                    Unggah Berkas Gambar (PNG/JPG/SVG)
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileUpload('logo_transformasi_url', e)}
                    className="block w-full text-xs text-stone-500 file:mr-2 file:py-1.5 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-stone-600 mb-0.5">
                    Atau Masukkan URL Gambar:
                  </label>
                  <input
                    type="text"
                    value={form.logo_transformasi_url || ''}
                    onChange={(e) => handleChange('logo_transformasi_url', e.target.value)}
                    placeholder="https://.../logo-transformasi.png"
                    className="w-full px-2.5 py-1.5 text-xs border border-stone-300 rounded-lg bg-white min-h-[38px]"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Church identity texts */}
        <div className="space-y-4 pt-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Nama Huria (Teks Utama Baris 1)
              </label>
              <input
                type="text"
                required
                value={form.nama_huria}
                onChange={(e) => handleChange('nama_huria', e.target.value)}
                className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg font-bold uppercase min-h-[42px]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Distrik & Ressort (Baris 3)
              </label>
              <input
                type="text"
                required
                value={form.distrik}
                onChange={(e) => handleChange('distrik', e.target.value)}
                className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg font-bold uppercase min-h-[42px]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Nomor SK Pengakuan Pemerintah Republik Indonesia (Teks Baris 2)
            </label>
            <textarea
              rows={2}
              required
              value={form.sk_pengakuan}
              onChange={(e) => handleChange('sk_pengakuan', e.target.value)}
              className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg leading-relaxed"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Alamat Lengkap Gereja (Baris 4)
              </label>
              <input
                type="text"
                required
                value={form.alamat}
                onChange={(e) => handleChange('alamat', e.target.value)}
                className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg min-h-[42px]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Kontak / Nomor Telepon / Email (Opsional)
              </label>
              <input
                type="text"
                value={form.telepon || ''}
                onChange={(e) => handleChange('telepon', e.target.value)}
                placeholder="Telepon / WA Pastori"
                className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg min-h-[42px]"
              />
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};
