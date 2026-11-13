import React, { useState } from 'react';
import { PengaturanHuria } from '../../types';
import { KopSurat } from '../warta/KopSurat';
import { HkbpCrossLogo } from '../logos/HkbpCrossLogo';
import { HkbpTransformasiLogo } from '../logos/HkbpTransformasiLogo';
import { Save, Upload, RotateCcw, CheckCircle, Image, Sparkles } from 'lucide-react';

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

  const handleFileUpload = (field: 'logo_salib_url' | 'logo_transformasi_url', e: React.ChangeEvent<HTMLInputElement>) => {
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
    handleChange(field, '');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(form);
    setToast('Kop surat dan logo warta jemaat berhasil diperbarui!');
    setTimeout(() => setToast(null), 3500);
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toast && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-md text-xs font-semibold flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-600" />
          <span>{toast}</span>
        </div>
      )}

      {/* Live Preview Box */}
      <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b border-stone-100 pb-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-600" />
            <h3 className="font-bold text-stone-900 text-sm md:text-base">
              Pratinjau Kop Surat Resmi (A4 Live Preview)
            </h3>
          </div>
          <span className="text-[11px] text-stone-500">
            Kop surat ini otomatis dicetak di atas Halaman 1 Tata Ibadah
          </span>
        </div>

        <div className="p-4 bg-stone-50 rounded-lg border border-dashed border-stone-300">
          <KopSurat pengaturan={form} />
        </div>
      </div>

      {/* Editor Form */}
      <form onSubmit={handleSubmit} className="bg-white p-5 rounded-xl border border-stone-200 shadow-xs space-y-6">
        <div className="flex items-center justify-between border-b border-stone-100 pb-3">
          <div>
            <h3 className="font-bold text-stone-900 text-base">
              Pengaturan Teks & Logo Kop Surat
            </h3>
            <p className="text-xs text-stone-500">
              Ubah identitas gereja, nomor SK pengakuan, logo salib, dan logo tema transformasi.
            </p>
          </div>

          <button
            type="submit"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-bold shadow-xs transition cursor-pointer"
          >
            <Save className="w-4 h-4" /> Simpan Perubahan Kop
          </button>
        </div>

        {/* Section 1: Logo Management */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Logo Salib HKBP (Kiri) */}
          <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-stone-900 text-xs">1. Logo Salib HKBP (Kiri)</span>
              {form.logo_salib_url ? (
                <button
                  type="button"
                  onClick={() => handleResetLogo('logo_salib_url')}
                  className="text-[11px] text-stone-500 hover:text-stone-800 flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" /> Gunakan Logo Vektor
                </button>
              ) : (
                <span className="text-[10px] text-blue-700 font-semibold bg-blue-50 px-2 py-0.5 rounded">
                  Logo Vektor Aktif
                </span>
              )}
            </div>

            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white rounded-lg border border-stone-300 flex items-center justify-center p-1 shrink-0 overflow-hidden">
                {form.logo_salib_url ? (
                  <img src={form.logo_salib_url} alt="Logo Salib" className="w-full h-full object-contain" />
                ) : (
                  <HkbpCrossLogo size={48} />
                )}
              </div>

              <div className="space-y-2 flex-1">
                <div>
                  <label className="block text-[11px] text-stone-600 mb-1">
                    Unggah Berkas Gambar (PNG/JPG/SVG)
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileUpload('logo_salib_url', e)}
                    className="block w-full text-xs text-stone-500 file:mr-2 file:py-1 file:px-2.5 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-stone-600 mb-0.5">Atau Masukkan URL Gambar:</label>
                  <input
                    type="text"
                    value={form.logo_salib_url || ''}
                    onChange={(e) => handleChange('logo_salib_url', e.target.value)}
                    placeholder="https://.../logo-hkbp.png"
                    className="w-full px-2 py-1 text-xs border border-stone-300 rounded bg-white"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Logo Transformasi HKBP (Kanan) */}
          <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-stone-900 text-xs">
                2. Logo Transformasi HKBP 2024-2028 (Kanan)
              </span>
              {form.logo_transformasi_url ? (
                <button
                  type="button"
                  onClick={() => handleResetLogo('logo_transformasi_url')}
                  className="text-[11px] text-stone-500 hover:text-stone-800 flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" /> Gunakan Logo Vektor
                </button>
              ) : (
                <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded">
                  Logo Vektor Aktif
                </span>
              )}
            </div>

            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white rounded-lg border border-stone-300 flex items-center justify-center p-1 shrink-0 overflow-hidden">
                {form.logo_transformasi_url ? (
                  <img src={form.logo_transformasi_url} alt="Logo Transformasi" className="w-full h-full object-contain" />
                ) : (
                  <HkbpTransformasiLogo size={48} />
                )}
              </div>

              <div className="space-y-2 flex-1">
                <div>
                  <label className="block text-[11px] text-stone-600 mb-1">
                    Unggah Berkas Gambar (PNG/JPG/SVG)
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileUpload('logo_transformasi_url', e)}
                    className="block w-full text-xs text-stone-500 file:mr-2 file:py-1 file:px-2.5 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-stone-600 mb-0.5">Atau Masukkan URL Gambar:</label>
                  <input
                    type="text"
                    value={form.logo_transformasi_url || ''}
                    onChange={(e) => handleChange('logo_transformasi_url', e.target.value)}
                    placeholder="https://.../logo-transformasi.png"
                    className="w-full px-2 py-1 text-xs border border-stone-300 rounded bg-white"
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
                className="w-full px-3 py-2 text-xs border border-stone-300 rounded font-bold uppercase"
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
                className="w-full px-3 py-2 text-xs border border-stone-300 rounded font-bold uppercase"
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
              className="w-full px-3 py-2 text-xs border border-stone-300 rounded leading-relaxed"
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
                className="w-full px-3 py-2 text-xs border border-stone-300 rounded"
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
                className="w-full px-3 py-2 text-xs border border-stone-300 rounded"
              />
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};
