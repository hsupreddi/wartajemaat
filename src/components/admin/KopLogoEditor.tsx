import React, { useEffect, useState } from 'react';
import { KopSuratLine, PengaturanHuria } from '../../types';
import { KopSurat } from '../warta/KopSurat';
import { HkbpCrossLogo, OFFICIAL_HKBP_CROSS_LOGO_URL } from '../logos/HkbpCrossLogo';
import {
  HkbpTransformasiLogo,
  OFFICIAL_TRANSFORMASI_LOGO_URL
} from '../logos/HkbpTransformasiLogo';
import {
  buildDefaultKopBaris,
  buildStandardHkbpKopBaris,
  createKopLineId,
  parseKopBarisFromFontKop,
  serializeKopBarisToFontKop
} from '../../lib/kopSuratUtils';
import {
  Save,
  RotateCcw,
  CheckCircle,
  Sparkles,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Scissors,
  Wand2
} from 'lucide-react';

interface KopLogoEditorProps {
  pengaturan: PengaturanHuria;
  onSave: (updated: PengaturanHuria) => void | Promise<void>;
}

function getInitialKopLines(pengaturan: PengaturanHuria): KopSuratLine[] {
  if (pengaturan.kop_baris && pengaturan.kop_baris.length > 0) {
    return pengaturan.kop_baris;
  }
  const parsed = parseKopBarisFromFontKop(pengaturan.font_kop);
  if (parsed && parsed.length > 0) {
    return parsed;
  }
  return buildDefaultKopBaris(pengaturan);
}

export const KopLogoEditor: React.FC<KopLogoEditorProps> = ({ pengaturan, onSave }) => {
  const [form, setForm] = useState<PengaturanHuria>(() => {
    const initialLines = getInitialKopLines(pengaturan);
    return {
      ...pengaturan,
      kop_baris: initialLines
    };
  });
  const [previewCompact, setPreviewCompact] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    const initialLines = getInitialKopLines(pengaturan);
    setForm({
      ...pengaturan,
      kop_baris: initialLines
    });
  }, [pengaturan.id]);

  const lines: KopSuratLine[] =
    form.kop_baris && form.kop_baris.length > 0
      ? form.kop_baris
      : buildDefaultKopBaris(form);

  const updateLines = (nextLines: KopSuratLine[]) => {
    setForm((prev) => ({
      ...prev,
      kop_baris: nextLines,
      font_kop: serializeKopBarisToFontKop(nextLines),
      nama_huria: nextLines[0]?.teks?.trim() ? nextLines[0].teks.trim() : prev.nama_huria
    }));
  };

  const handleLineChange = <K extends keyof KopSuratLine>(
    index: number,
    field: K,
    value: KopSuratLine[K]
  ) => {
    const updated = [...lines];
    updated[index] = { ...updated[index], [field]: value };
    updateLines(updated);
  };

  const handleAddLine = () => {
    const newLine: KopSuratLine = {
      id: createKopLineId(lines.length + 1),
      teks: '',
      font: 'sans',
      ukuran: 'sm',
      tebal: false,
      miring: false,
      kapital: false,
      jarak_bawah: '0',
      warna: 'gelap'
    };
    updateLines([...lines, newLine]);
  };

  const handleMoveLine = (index: number, direction: 'up' | 'down') => {
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= lines.length) return;
    const updated = [...lines];
    const [item] = updated.splice(index, 1);
    updated.splice(target, 0, item);
    updateLines(updated);
  };

  const handleSplitLine = (index: number) => {
    const target = lines[index];
    const teks = (target.teks || '').trim();
    if (!teks) return;

    let first = teks;
    let second = '';

    if (teks.includes('/')) {
      const slashIdx = teks.indexOf('/', Math.floor(teks.length * 0.25));
      const idx = slashIdx >= 0 ? slashIdx : teks.indexOf('/');
      first = teks.slice(0, idx).trim();
      second = teks.slice(idx + 1).trim();
    } else {
      const mid = Math.floor(teks.length / 2);
      let splitAt = -1;
      let bestDist = Infinity;
      for (let i = 0; i < teks.length; i++) {
        if (teks[i] === ',' || teks[i] === ' ') {
          const d = Math.abs(i - mid);
          if (d < bestDist) {
            bestDist = d;
            splitAt = i;
          }
        }
      }
      if (splitAt > 0) {
        const keepDelimiter = teks[splitAt] === ',' ? 1 : 0;
        first = teks.slice(0, splitAt + keepDelimiter).trim();
        second = teks.slice(splitAt + 1).trim();
      }
    }

    if (!second) return;

    const updated = [...lines];
    updated[index] = { ...target, teks: first, jarak_bawah: '0' };
    updated.splice(index + 1, 0, {
      ...target,
      id: createKopLineId(index + 2),
      teks: second
    });
    updateLines(updated);
  };

  const handleDeleteLine = (index: number) => {
    if (lines.length <= 1) return;
    updateLines(lines.filter((_, i) => i !== index));
  };

  const handleApplyStandardPreset = () => {
    const standard = buildStandardHkbpKopBaris(form);
    updateLines(standard);
    setToast('Susunan kop surat dirapikan otomatis. Klik "Simpan Perubahan Kop" untuk menerapkan.');
    setTimeout(() => setToast(null), 4000);
  };

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const payload: PengaturanHuria = {
        ...pengaturan,
        nama_huria: form.nama_huria,
        logo_salib_url: form.logo_salib_url,
        logo_transformasi_url: form.logo_transformasi_url,
        kop_baris: lines,
        font_kop: serializeKopBarisToFontKop(lines)
      };
      await onSave(payload);
      setToast('Kop surat (baris per baris) dan logo warta jemaat berhasil disimpan!');
      setTimeout(() => setToast(null), 3500);
    } finally {
      setIsSaving(false);
    }
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-100 pb-2.5">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
            <h3 className="font-bold text-stone-900 text-sm md:text-base">
              Pratinjau Langsung Kop Surat Resmi
            </h3>
          </div>
          <div className="flex items-center gap-1.5 bg-stone-100 p-1 rounded-lg self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setPreviewCompact(true)}
              className={`px-2.5 py-1 rounded text-[11px] font-semibold transition cursor-pointer ${
                previewCompact
                  ? 'bg-white text-stone-900 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Ukuran Cetak A4
            </button>
            <button
              type="button"
              onClick={() => setPreviewCompact(false)}
              className={`px-2.5 py-1 rounded text-[11px] font-semibold transition cursor-pointer ${
                !previewCompact
                  ? 'bg-white text-stone-900 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Ukuran Portal
            </button>
          </div>
        </div>

        <div className="p-3 sm:p-4 bg-stone-50 rounded-xl border border-dashed border-stone-300 overflow-x-auto">
          <div className={previewCompact ? 'max-w-[190mm] mx-auto bg-white p-3 rounded border border-stone-200 shadow-xs' : 'bg-white p-3 rounded border border-stone-200 shadow-xs'}>
            <KopSurat pengaturan={{ ...form, kop_baris: lines }} compact={previewCompact} />
          </div>
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
              Pengaturan Teks Baris per Baris &amp; Logo Kop Surat
            </h3>
            <p className="text-xs text-stone-500">
              Atur isi teks, urutan baris, font, ukuran huruf, tebal/kapital, dan jarak tiap baris pada kop surat cetak A4 &amp; portal.
            </p>
          </div>

          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer min-h-[42px] shrink-0 disabled:opacity-60"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Menyimpan...' : 'Simpan Perubahan Kop'}</span>
          </button>
        </div>

        {/* Section 1: Line-by-Line Kop Surat Builder */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h4 className="font-bold text-stone-900 text-sm">
                Susunan Baris Teks Kop Surat ({lines.length} Baris)
              </h4>
              <p className="text-[11px] text-stone-500">
                Gunakan tombol panah untuk menggeser urutan baris, atau tombol gunting untuk memecah kalimat panjang (seperti nomor SK) agar rapi di versi cetak.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleApplyStandardPreset}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg text-xs font-semibold transition cursor-pointer"
                title="Susun ulang baris SK panjang agar seimbang tanpa kata yatim"
              >
                <Wand2 className="w-3.5 h-3.5" /> Rapikan Otomatis (Standar HKBP)
              </button>
              <button
                type="button"
                onClick={handleAddLine}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Tambah Baris
              </button>
            </div>
          </div>

          <div className="space-y-2.5">
            {lines.map((line, index) => (
              <div
                key={line.id}
                className="p-3 bg-stone-50 rounded-xl border border-stone-200 space-y-2.5"
              >
                {/* Header & Move/Split/Delete Controls */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center justify-center px-2 py-0.5 bg-[#0B2545] text-white text-[10px] font-bold rounded">
                      Baris {index + 1}
                    </span>
                    <span className="text-[11px] text-stone-500 font-medium">
                      {line.tebal ? 'Tebal' : 'Normal'} · Ukuran {(line.ukuran || 'sm').toUpperCase()}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => handleMoveLine(index, 'up')}
                      title="Geser ke Atas"
                      className="p-1.5 text-stone-600 hover:text-stone-900 hover:bg-white rounded border border-transparent hover:border-stone-200 disabled:opacity-30 cursor-pointer"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={index === lines.length - 1}
                      onClick={() => handleMoveLine(index, 'down')}
                      title="Geser ke Bawah"
                      className="p-1.5 text-stone-600 hover:text-stone-900 hover:bg-white rounded border border-transparent hover:border-stone-200 disabled:opacity-30 cursor-pointer"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    {line.teks && line.teks.trim().length > 25 && (
                      <button
                        type="button"
                        onClick={() => handleSplitLine(index)}
                        title="Pecah baris ini menjadi 2 baris"
                        className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-blue-700 hover:bg-blue-50 bg-white border border-blue-200 rounded cursor-pointer"
                      >
                        <Scissors className="w-3 h-3" /> Pecah 2 Baris
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={lines.length <= 1}
                      onClick={() => handleDeleteLine(index)}
                      title="Hapus Baris"
                      className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded disabled:opacity-30 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Line Text Input */}
                <input
                  type="text"
                  value={line.teks}
                  onChange={(e) => handleLineChange(index, 'teks', e.target.value)}
                  placeholder={`Isi teks kop baris ke-${index + 1}...`}
                  className={`w-full px-3 py-2 text-xs bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    line.tebal ? 'font-bold' : 'font-normal'
                  } ${line.miring ? 'italic' : ''} ${line.kapital ? 'uppercase' : ''}`}
                />

                {/* Per-Line Styling Bar */}
                <div className="flex flex-wrap items-center gap-2 text-[11px]">
                  <div className="flex items-center gap-1">
                    <span className="text-stone-500">Font:</span>
                    <select
                      value={line.font || 'sans'}
                      onChange={(e) =>
                        handleLineChange(index, 'font', e.target.value as KopSuratLine['font'])
                      }
                      className="px-2 py-1 bg-white border border-stone-300 rounded text-[11px] font-medium"
                    >
                      <option value="display">Klasik (Cinzel)</option>
                      <option value="sans">Modern (Sans)</option>
                      <option value="serif">Serif (Lora)</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-1">
                    <span className="text-stone-500">Ukuran:</span>
                    <select
                      value={line.ukuran || 'sm'}
                      onChange={(e) =>
                        handleLineChange(index, 'ukuran', e.target.value as KopSuratLine['ukuran'])
                      }
                      className="px-2 py-1 bg-white border border-stone-300 rounded text-[11px] font-medium"
                    >
                      <option value="xl">XL (Judul Utama)</option>
                      <option value="lg">L (Distrik / Sub-Judul)</option>
                      <option value="md">M (Sedang)</option>
                      <option value="sm">S (Alamat / Kontak)</option>
                      <option value="xs">XS (SK / Teks Kecil)</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-1">
                    <span className="text-stone-500">Warna:</span>
                    <select
                      value={line.warna || 'hitam'}
                      onChange={(e) =>
                        handleLineChange(index, 'warna', e.target.value as KopSuratLine['warna'])
                      }
                      className="px-2 py-1 bg-white border border-stone-300 rounded text-[11px] font-medium"
                    >
                      <option value="hitam">Hitam Pekat</option>
                      <option value="gelap">Abu Gelap</option>
                      <option value="abu">Abu Sedang</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-1">
                    <span className="text-stone-500">Jarak Bawah:</span>
                    <select
                      value={line.jarak_bawah || '0'}
                      onChange={(e) =>
                        handleLineChange(
                          index,
                          'jarak_bawah',
                          e.target.value as KopSuratLine['jarak_bawah']
                        )
                      }
                      className="px-2 py-1 bg-white border border-stone-300 rounded text-[11px] font-medium"
                    >
                      <option value="0">Rapat</option>
                      <option value="1">Normal</option>
                      <option value="2">Longgar</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-1 ml-auto">
                    <button
                      type="button"
                      onClick={() => handleLineChange(index, 'tebal', !line.tebal)}
                      className={`px-2 py-1 rounded border text-[11px] font-bold cursor-pointer transition ${
                        line.tebal
                          ? 'bg-stone-900 text-white border-stone-900'
                          : 'bg-white text-stone-600 border-stone-300 hover:bg-stone-100'
                      }`}
                      title="Cetak Tebal (Bold)"
                    >
                      B
                    </button>
                    <button
                      type="button"
                      onClick={() => handleLineChange(index, 'miring', !line.miring)}
                      className={`px-2 py-1 rounded border text-[11px] italic font-semibold cursor-pointer transition ${
                        line.miring
                          ? 'bg-stone-900 text-white border-stone-900'
                          : 'bg-white text-stone-600 border-stone-300 hover:bg-stone-100'
                      }`}
                      title="Cetak Miring (Italic)"
                    >
                      I
                    </button>
                    <button
                      type="button"
                      onClick={() => handleLineChange(index, 'kapital', !line.kapital)}
                      className={`px-2 py-1 rounded border text-[11px] font-semibold cursor-pointer transition ${
                        line.kapital
                          ? 'bg-stone-900 text-white border-stone-900'
                          : 'bg-white text-stone-600 border-stone-300 hover:bg-stone-100'
                      }`}
                      title="HURUF KAPITAL SEMUA"
                    >
                      AA
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Section 2: Logo Management */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 pt-2 border-t border-stone-100">
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
      </form>
    </div>
  );
};
