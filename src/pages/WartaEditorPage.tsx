import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FullWartaData, PengaturanHuria, JadwalTetapItem } from '../types';
import { getWartaById, saveWarta, getPengaturan, getJadwalTetap } from '../lib/wartaStorage';
import { useAuth } from '../context/AuthContext';
import { EditorHalaman1 } from '../components/editor/EditorHalaman1';
import { EditorHalaman2 } from '../components/editor/EditorHalaman2';
import { EditorHalaman3 } from '../components/editor/EditorHalaman3';
import { WartaWizardEditor } from '../components/editor/WartaWizardEditor';
import { PrintLayout } from '../components/warta/PrintLayout';
import {
  Save,
  Printer,
  Eye,
  CheckCircle,
  ArrowLeft,
  Calendar,
  Lock,
  Globe,
  FileEdit,
  Sparkles,
  Compass
} from 'lucide-react';
import { formatTanggalIndo } from '../lib/dateUtils';

export const WartaEditorPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentRole, canEditLiturgi, canEditKeuangan, canPublish } = useAuth();

  const [data, setData] = useState<FullWartaData | null>(null);
  const [pengaturan, setPengaturan] = useState<PengaturanHuria>();
  const [jadwalTetap, setJadwalTetap] = useState<JadwalTetapItem[]>([]);
  const [activeTab, setActiveTab] = useState<'hal1' | 'hal2' | 'hal3' | 'preview'>('hal1');
  const [editorMode, setEditorMode] = useState<'wizard' | 'tabs'>('wizard');
  const [isSaving, setIsSaving] = useState(false);
  const [saveToast, setSaveToast] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    Promise.all([getWartaById(id), getPengaturan(), getJadwalTetap()]).then(
      ([wartaData, setts, jadwals]) => {
        if (wartaData) {
          setData(wartaData);
        }
        setPengaturan(setts);
        setJadwalTetap(jadwals);
      }
    );
  }, [id]);

  // Adjust default tab based on user role
  useEffect(() => {
    if (currentRole === 'bendahara' && activeTab !== 'preview') {
      setActiveTab('hal3');
    }
  }, [currentRole]);

  const handleSave = async (showToast = true) => {
    if (!data) return;
    setIsSaving(true);
    try {
      await saveWarta(data);
      if (showToast) {
        setSaveToast('Perubahan warta jemaat berhasil disimpan.');
        setTimeout(() => setSaveToast(null), 3000);
      }
    } catch (err) {
      alert('Gagal menyimpan data warta.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTogglePublish = async () => {
    if (!data) return;
    const nextStatus: import('../types').WartaStatus =
      data.warta.status === 'published' ? 'draft' : 'published';
    const updated: FullWartaData = {
      ...data,
      warta: {
        ...data.warta,
        status: nextStatus
      }
    };
    setData(updated);
    await saveWarta(updated);
    setSaveToast(
      nextStatus === 'published'
        ? 'Warta telah DIPUBLIKASIKAN dan dapat dibaca oleh seluruh jemaat.'
        : 'Status warta dikembalikan menjadi DRAFT.'
    );
    setTimeout(() => setSaveToast(null), 3500);
  };

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-100">
        <div className="text-center p-6 bg-white rounded-lg shadow-sm border border-stone-200">
          <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-3" />
          <p className="text-sm font-semibold text-stone-700">Memuat data Warta Jemaat...</p>
        </div>
      </div>
    );
  }

  const isLiturgiDisabled = !canEditLiturgi;
  const isKeuanganDisabled = !canEditKeuangan;

  return (
    <div className="min-h-screen bg-stone-100 text-stone-900 pb-16">
      {/* Top Action Bar */}
      <header className="sticky top-0 z-30 bg-[#0B2545] text-white shadow-md border-b border-amber-500/20 px-3 sm:px-4 py-2.5 sm:py-3">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          <div className="flex items-center justify-between sm:justify-start gap-2.5">
            <button
              onClick={() => navigate('/admin')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-stone-300 hover:text-white hover:bg-white/10 transition cursor-pointer min-h-[38px]"
            >
              <ArrowLeft className="w-4 h-4" /> Daftar Warta
            </button>
            <div className="h-4 w-px bg-stone-700 hidden sm:block" />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-xs sm:text-base font-bold text-white tracking-tight truncate">
                  Edit: MINGGU {data.warta.goar_minggu}
                </h1>
                <span
                  className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded shrink-0 ${
                    data.warta.status === 'published'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-amber-500 text-stone-950 font-extrabold'
                  }`}
                >
                  {data.warta.status}
                </span>
              </div>
              <p className="text-[11px] text-amber-200/80 truncate">
                {formatTanggalIndo(data.warta.tanggal_minggu)} · HKBP Hutaraja
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-1.5 overflow-x-auto scrollbar-none py-0.5">
            {/* Mode Toggle Button */}
            <div className="flex items-center bg-white/10 p-0.5 rounded-lg border border-white/20 text-xs shrink-0">
              <button
                onClick={() => setEditorMode('wizard')}
                className={`px-2.5 py-1.5 rounded-md text-xs font-bold transition flex items-center gap-1 cursor-pointer min-h-[34px] ${
                  editorMode === 'wizard' ? 'bg-amber-400 text-stone-950' : 'text-stone-200 hover:text-white'
                }`}
              >
                <Compass className="w-3.5 h-3.5" /> <span className="hidden xs:inline">Wizard</span> 6 Langkah
              </button>
              <button
                onClick={() => setEditorMode('tabs')}
                className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition flex items-center gap-1 cursor-pointer min-h-[34px] ${
                  editorMode === 'tabs' ? 'bg-amber-400 text-stone-950' : 'text-stone-200 hover:text-white'
                }`}
              >
                <FileEdit className="w-3.5 h-3.5" /> Halaman
              </button>
            </div>

            {/* Publish Toggle Button */}
            {canPublish && (
              <button
                onClick={handleTogglePublish}
                className={`inline-flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold shadow transition cursor-pointer shrink-0 min-h-[38px] ${
                  data.warta.status === 'published'
                    ? 'bg-stone-800 hover:bg-stone-700 text-stone-200'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white font-bold'
                }`}
              >
                <Globe className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{data.warta.status === 'published' ? 'Kembalikan Draft' : 'Publikasikan'}</span>
                <span className="sm:hidden">{data.warta.status === 'published' ? 'Draft' : 'Publish'}</span>
              </button>
            )}

            {/* Print Button */}
            <button
              onClick={() => navigate(`/warta/${data.warta.id}/print`)}
              className="inline-flex items-center gap-1 px-2.5 sm:px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-medium border border-white/20 transition cursor-pointer shrink-0 min-h-[38px]"
              title="Cetak format kertas A4"
            >
              <Printer className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Cetak A4</span>
            </button>

            {/* Save Button */}
            <button
              onClick={() => handleSave(true)}
              disabled={isSaving}
              className="inline-flex items-center gap-1.5 px-3.5 sm:px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-stone-950 rounded-lg text-xs font-extrabold shadow-md transition cursor-pointer disabled:opacity-50 shrink-0 min-h-[38px]"
            >
              <Save className="w-4 h-4 text-stone-950" />
              <span>{isSaving ? 'Menyimpan...' : 'Simpan'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Save Toast */}
      {saveToast && (
        <div className="fixed bottom-5 right-5 z-50 bg-stone-900 text-white px-4 py-2.5 rounded-lg shadow-xl border border-stone-700 flex items-center gap-2 text-xs font-medium animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          <span>{saveToast}</span>
        </div>
      )}

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 mt-6">
        {editorMode === 'wizard' ? (
          <WartaWizardEditor
            data={data}
            onChange={setData}
            pengaturan={pengaturan}
            jadwalTetap={jadwalTetap}
            canEditLiturgi={canEditLiturgi}
            canEditKeuangan={canEditKeuangan}
            canPublish={canPublish}
            onSave={() => handleSave(true)}
            isSaving={isSaving}
          />
        ) : (
          <>
            {/* Navigation Tabs */}
            <div className="flex items-center justify-between border-b border-stone-200 mb-6 overflow-x-auto gap-2">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setActiveTab('hal1')}
                  className={`px-4 py-2.5 text-xs md:text-sm font-semibold border-b-2 transition whitespace-nowrap flex items-center gap-1.5 ${
                    activeTab === 'hal1'
                      ? 'border-blue-600 text-blue-700 bg-white shadow-xs rounded-t'
                      : 'border-transparent text-stone-600 hover:text-stone-900'
                  }`}
                >
                  <FileEdit className="w-4 h-4" />
                  <span>Halaman 1: Tata Ibadah</span>
                  {isLiturgiDisabled && <Lock className="w-3 h-3 text-stone-400" />}
                </button>

                <button
                  onClick={() => setActiveTab('hal2')}
                  className={`px-4 py-2.5 text-xs md:text-sm font-semibold border-b-2 transition whitespace-nowrap flex items-center gap-1.5 ${
                    activeTab === 'hal2'
                      ? 'border-blue-600 text-blue-700 bg-white shadow-xs rounded-t'
                      : 'border-transparent text-stone-600 hover:text-stone-900'
                  }`}
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Halaman 2: Tingting Namarragam</span>
                  {isLiturgiDisabled && <Lock className="w-3 h-3 text-stone-400" />}
                </button>

                <button
                  onClick={() => setActiveTab('hal3')}
                  className={`px-4 py-2.5 text-xs md:text-sm font-semibold border-b-2 transition whitespace-nowrap flex items-center gap-1.5 ${
                    activeTab === 'hal3'
                      ? 'border-blue-600 text-blue-700 bg-white shadow-xs rounded-t'
                      : 'border-transparent text-stone-600 hover:text-stone-900'
                  }`}
                >
                  <Calendar className="w-4 h-4" />
                  <span>Halaman 3: Tingting Parhepengon</span>
                  {isKeuanganDisabled && <Lock className="w-3 h-3 text-stone-400" />}
                </button>
              </div>

              <button
                onClick={() => setActiveTab('preview')}
                className={`px-4 py-2 text-xs md:text-sm font-bold rounded-md transition flex items-center gap-1.5 shrink-0 ${
                  activeTab === 'preview'
                    ? 'bg-blue-600 text-white shadow'
                    : 'bg-stone-200 text-stone-700 hover:bg-stone-300'
                }`}
              >
                <Eye className="w-4 h-4" />
                <span>Pratinjau Lembar A4</span>
              </button>
            </div>

            {/* Role permission info banner */}
            {(isLiturgiDisabled && (activeTab === 'hal1' || activeTab === 'hal2')) ||
            (isKeuanganDisabled && activeTab === 'hal3') ? (
              <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-md flex items-center justify-between text-xs text-amber-800">
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    Anda sedang masuk sebagai <strong>{currentRole}</strong> (Mode Hanya Lihat untuk
                    halaman ini).
                  </span>
                </div>
                <span className="text-[11px] text-amber-700">
                  Gunakan pemilih peran di pojok atas untuk berganti hak akses.
                </span>
              </div>
            ) : null}

            {/* Active Tab Content */}
            {activeTab === 'hal1' && (
              <EditorHalaman1 data={data} onChange={setData} disabled={isLiturgiDisabled} />
            )}

            {activeTab === 'hal2' && (
              <EditorHalaman2 data={data} onChange={setData} disabled={isLiturgiDisabled} />
            )}

            {activeTab === 'hal3' && (
              <EditorHalaman3 data={data} onChange={setData} disabled={isKeuanganDisabled} />
            )}

            {activeTab === 'preview' && (
              <div className="bg-stone-200 p-4 rounded-xl border border-stone-300">
                <PrintLayout
                  data={data}
                  pengaturan={pengaturan}
                  jadwalTetap={jadwalTetap}
                  selectedPage="all"
                />
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};
