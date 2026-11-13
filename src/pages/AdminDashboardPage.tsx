import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { WartaRecord, PengaturanHuria, StatistikWijk, CalonSidi } from '../types';
import {
  getAllWartas,
  createNewWarta,
  deleteWarta,
  updateWartaStatus,
  getPengaturan,
  savePengaturan
} from '../lib/wartaStorage';
import { getStatistikWijk, getCalonSidi } from '../lib/jemaatApi';
import { isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import {
  Plus,
  Printer,
  FileEdit,
  Trash2,
  Globe,
  Settings,
  Calendar,
  Layers,
  Users,
  Search,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Archive,
  Image,
  DollarSign,
  UserCheck,
  LayoutDashboard,
  LogOut,
  ChevronRight,
  Sparkles,
  BookOpen,
  BarChart3,
  GraduationCap,
  Filter,
  AlertCircle,
  MapPin
} from 'lucide-react';
import { formatTanggalIndo, formatTanggalLengkap, getNextSunday } from '../lib/dateUtils';
import { HkbpCrossLogo } from '../components/logos/HkbpCrossLogo';
import { HkbpTransformasiLogo } from '../components/logos/HkbpTransformasiLogo';
import { UserManagement } from '../components/admin/UserManagement';
import { KopLogoEditor } from '../components/admin/KopLogoEditor';
import { MingguLiturgiDropdown, getLiturgiColorBadge } from '../components/common/MingguLiturgiDropdown';
import { MingguLiturgi } from '../types';
import { GrafikPendapatanMingguan } from '../components/dashboard/GrafikPendapatanMingguan';

export const AdminDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    currentRole,
    currentUser,
    isLoading: isAuthLoading,
    signInAsDemo,
    canPublish,
    canManageSettings,
    canManageUsers,
    canDeleteWarta,
    signOut
  } = useAuth();

  const [activeMenu, setActiveMenu] = useState<
    'warta' | 'tren_keuangan' | 'ringkasan' | 'arsip' | 'users' | 'kop'
  >('warta');

  const [wartasList, setWartasList] = useState<WartaRecord[]>([]);
  const [pengaturan, setPengaturan] = useState<PengaturanHuria | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Statistik & Calon Sidi State
  const [statistikWijkList, setStatistikWijkList] = useState<StatistikWijk[]>([]);
  const [calonSidiList, setCalonSidiList] = useState<CalonSidi[]>([]);
  const [calonSidiSearch, setCalonSidiSearch] = useState('');
  const [calonSidiWijkFilter, setCalonSidiWijkFilter] = useState('all');

  // New warta form state
  const [newTanggal, setNewTanggal] = useState(getNextSunday());
  const [newGoar, setNewGoar] = useState('REMINISCERE');
  const [newTopik, setNewTopik] = useState('Marpanghiramon tu Jahowa');
  const [selectedMingguInfo, setSelectedMingguInfo] = useState<MingguLiturgi | null>(null);

  const loadData = async () => {
    try {
      const [list, pengs, stWijkRes, sidiRes] = await Promise.all([
        getAllWartas(false),
        getPengaturan(),
        getStatistikWijk(),
        getCalonSidi()
      ]);
      setWartasList(list);
      setPengaturan(pengs);
      setStatistikWijkList(stWijkRes.data);
      setCalonSidiList(sidiRes.data);
    } catch (err) {
      console.warn('Gagal memuat data dashboard:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateNew = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTanggal) return;
    setIsCreating(true);
    try {
      const created = await createNewWarta(newTanggal, newGoar, newTopik);
      setIsModalOpen(false);
      await loadData();
      navigate(`/admin/warta/${created.warta.id}/edit`);
    } catch (err: any) {
      alert(err?.message || 'Gagal membuat warta baru.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!canDeleteWarta) {
      alert('Hanya akun Admin yang memiliki wewenang untuk menghapus warta jemaat.');
      return;
    }
    if (!confirm(`Hapus warta MINGGU ${name}? Tindakan ini permanen.`)) return;
    try {
      await deleteWarta(id);
      await loadData();
    } catch (err: any) {
      alert(err?.message || 'Gagal menghapus warta.');
    }
  };

  const handleToggleStatus = async (warta: WartaRecord) => {
    if (!canPublish) {
      alert('Anda tidak memiliki wewenang untuk mempublikasikan warta.');
      return;
    }
    try {
      const nextStatus = warta.status === 'published' ? 'draft' : 'published';
      await updateWartaStatus(warta.id, nextStatus);
      await loadData();
    } catch (err: any) {
      alert(err?.message || 'Gagal mengubah status publikasi.');
    }
  };

  const handleSaveKop = async (updated: PengaturanHuria) => {
    try {
      await savePengaturan(updated);
      setPengaturan(updated);
    } catch (err: any) {
      alert(err?.message || 'Gagal menyimpan pengaturan kop & logo.');
    }
  };

  const filteredWartas = wartasList.filter((w) => {
    const matchSearch =
      w.goar_minggu.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (w.topik_minggu && w.topik_minggu.toLowerCase().includes(searchTerm.toLowerCase())) ||
      w.tanggal_minggu.includes(searchTerm);
    const matchStatus = statusFilter === 'all' || w.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="min-h-screen bg-[#F7F5F0] text-stone-900 pb-16 flex flex-col justify-between">
      {/* Top Bar with Brand & Fast Role Switcher */}
      <header className="bg-[#0B2545] text-white shadow-lg border-b border-amber-500/20 px-3 sm:px-6 py-2.5 sm:py-3 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="inline-flex items-center gap-1.5 bg-white rounded-xl px-2 py-1 shadow-xs shrink-0">
              <HkbpCrossLogo className="w-7 h-7 sm:w-8 sm:h-8" />
              <div className="h-5 w-px bg-stone-200 hidden xs:block" />
              <HkbpTransformasiLogo className="w-8 h-8 sm:w-9 sm:h-9 hidden xs:inline-block" />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm sm:text-base font-bold text-white tracking-tight truncate">
                Panel Pengurus HKBP Hutaraja
              </h1>
              <p className="text-[11px] text-stone-300 truncate">
                Masuk sebagai: <strong className="text-amber-300 capitalize">{currentRole}</strong>{' '}
                {currentUser?.nama ? `(${currentUser.nama})` : ''}
              </p>
            </div>
          </div>

          {/* Quick Role Switcher (Demo) / Supabase Auth Status */}
          <div className="flex items-center justify-between sm:justify-end gap-2 overflow-x-auto scrollbar-none py-0.5">
            {!isSupabaseConfigured ? (
              <div className="flex items-center gap-1 bg-[#061527] p-1 rounded-lg border border-amber-500/20 text-xs shrink-0">
                <span className="text-[11px] text-amber-300/80 px-2 hidden md:inline">Peran:</span>
                <button
                  onClick={() => signInAsDemo('admin')}
                  className={`px-2.5 py-1.5 rounded text-xs font-semibold transition cursor-pointer whitespace-nowrap min-h-[34px] ${
                    currentRole === 'admin'
                      ? 'bg-amber-500 text-stone-950 font-bold shadow-xs'
                      : 'text-stone-300 hover:text-white'
                  }`}
                  title="Akses Penuh CRUD, Kop & Pengguna"
                >
                  Admin
                </button>
                <button
                  onClick={() => signInAsDemo('sekretaris')}
                  className={`px-2.5 py-1.5 rounded text-xs font-semibold transition cursor-pointer whitespace-nowrap min-h-[34px] ${
                    currentRole === 'sekretaris'
                      ? 'bg-amber-500 text-stone-950 font-bold shadow-xs'
                      : 'text-stone-300 hover:text-white'
                  }`}
                  title="Input Liturgi, Tingting & Keuangan"
                >
                  Sekretaris
                </button>
                <button
                  onClick={() => signInAsDemo('bendahara')}
                  className={`px-2.5 py-1.5 rounded text-xs font-semibold transition cursor-pointer whitespace-nowrap min-h-[34px] ${
                    currentRole === 'bendahara'
                      ? 'bg-amber-500 text-stone-950 font-bold shadow-xs'
                      : 'text-stone-300 hover:text-white'
                  }`}
                  title="Input Keuangan"
                >
                  Bendahara
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 shrink-0">
                <span className="hidden sm:inline-flex items-center px-2.5 py-1.5 bg-emerald-500/20 border border-emerald-400/30 text-emerald-200 rounded-lg text-xs font-semibold whitespace-nowrap">
                  Supabase Terhubung
                </span>
                {currentUser ? (
                  <button
                    onClick={async () => {
                      await signOut();
                      navigate('/login');
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-100 rounded-lg text-xs font-semibold transition border border-red-400/30 cursor-pointer min-h-[38px] whitespace-nowrap"
                  >
                    <LogOut className="w-3.5 h-3.5" /> Keluar
                  </button>
                ) : (
                  <button
                    onClick={() => navigate('/login')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-stone-950 rounded-lg text-xs font-bold transition cursor-pointer min-h-[38px] whitespace-nowrap"
                  >
                    Masuk Pengurus
                  </button>
                )}
              </div>
            )}

            <button
              onClick={() => navigate('/')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-semibold transition border border-white/20 cursor-pointer min-h-[38px] whitespace-nowrap shrink-0"
            >
              <Globe className="w-3.5 h-3.5 text-amber-400" /> Beranda
            </button>
          </div>
        </div>
      </header>

      {/* Mode Demo Banner */}
      {!isSupabaseConfigured && (
        <div className="bg-amber-500 text-stone-950 px-4 py-2 border-b border-amber-600 font-semibold text-xs flex items-center justify-between">
          <div className="max-w-7xl mx-auto w-full flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-stone-950 shrink-0" />
            <span>
              <strong>Mode Demo:</strong> Kredensial Supabase belum terkonfigurasi. Data disimpan di penyimpanan lokal browser.
            </span>
          </div>
        </div>
      )}

      {/* Prompt Login ketika Supabase aktif tetapi user belum login */}
      {isSupabaseConfigured && !isAuthLoading && currentRole === 'publik' && (
        <div className="bg-red-50 border-b border-red-200 px-4 py-3 text-xs text-red-900">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 font-semibold">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>
                Anda belum login dengan akun Pengurus Supabase. Perubahan dari dashboard hanya tersimpan ke database jika Anda sudah masuk sebagai Admin, Sekretaris, atau Bendahara.
              </span>
            </div>
            <button
              onClick={() => navigate('/login')}
              className="px-4 py-1.5 bg-[#0B2545] hover:bg-[#123561] text-white rounded-lg font-bold transition cursor-pointer shrink-0"
            >
              Masuk Sekarang
            </button>
          </div>
        </div>
      )}

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 mt-6 flex-1 w-full space-y-6">
        {/* Navigation Tabs Bar */}
        <div className="bg-white rounded-xl border border-stone-200 shadow-xs p-1.5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5">
            <button
              onClick={() => setActiveMenu('warta')}
              className={`px-3.5 py-2.5 rounded-lg text-xs md:text-sm font-bold transition flex items-center gap-2 cursor-pointer shrink-0 whitespace-nowrap min-h-[44px] ${
                activeMenu === 'warta'
                  ? 'bg-[#0B2545] text-white shadow-xs'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
              }`}
            >
              <Layers className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Manajemen Warta</span>
            </button>

            <button
              onClick={() => setActiveMenu('tren_keuangan')}
              className={`px-3.5 py-2.5 rounded-lg text-xs md:text-sm font-bold transition flex items-center gap-2 cursor-pointer shrink-0 whitespace-nowrap min-h-[44px] ${
                activeMenu === 'tren_keuangan'
                  ? 'bg-[#0B2545] text-white shadow-xs'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
              }`}
            >
              <DollarSign className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Grafik Keuangan (Tingting)</span>
            </button>

            <button
              onClick={() => setActiveMenu('ringkasan')}
              className={`px-3.5 py-2.5 rounded-lg text-xs md:text-sm font-bold transition flex items-center gap-2 cursor-pointer shrink-0 whitespace-nowrap min-h-[44px] ${
                activeMenu === 'ringkasan'
                  ? 'bg-[#0B2545] text-white shadow-xs'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
              }`}
            >
              <BarChart3 className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Statistik & Calon Sidi</span>
            </button>

            <button
              onClick={() => setActiveMenu('arsip')}
              className={`px-3.5 py-2.5 rounded-lg text-xs md:text-sm font-bold transition flex items-center gap-2 cursor-pointer shrink-0 whitespace-nowrap min-h-[44px] ${
                activeMenu === 'arsip'
                  ? 'bg-[#0B2545] text-white shadow-xs'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
              }`}
            >
              <Archive className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Arsip Warta</span>
            </button>

            {/* Admin-only Modules */}
            {canManageUsers && (
              <button
                onClick={() => setActiveMenu('users')}
                className={`px-3.5 py-2.5 rounded-lg text-xs md:text-sm font-bold transition flex items-center gap-2 cursor-pointer shrink-0 whitespace-nowrap min-h-[44px] ${
                  activeMenu === 'users'
                    ? 'bg-[#0B2545] text-white shadow-xs'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
                }`}
              >
                <Users className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Pengguna & Role</span>
              </button>
            )}

            {canManageSettings && (
              <button
                onClick={() => setActiveMenu('kop')}
                className={`px-3.5 py-2.5 rounded-lg text-xs md:text-sm font-bold transition flex items-center gap-2 cursor-pointer shrink-0 whitespace-nowrap min-h-[44px] ${
                  activeMenu === 'kop'
                    ? 'bg-[#0B2545] text-white shadow-xs'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
                }`}
              >
                <Image className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Kop & Logo</span>
              </button>
            )}

            <button
              onClick={() => navigate('/admin/master')}
              className="px-3.5 py-2.5 rounded-lg text-xs md:text-sm font-bold text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition flex items-center gap-2 cursor-pointer shrink-0 whitespace-nowrap min-h-[44px]"
            >
              <Settings className="w-4 h-4 text-stone-500 shrink-0" />
              <span>Master Data</span>
            </button>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-stone-950 rounded-lg text-xs font-extrabold shadow-md transition cursor-pointer shrink-0 min-h-[44px]"
          >
            <Plus className="w-4 h-4 text-stone-950" />
            <span>Susun Warta Baru</span>
          </button>
        </div>

        {/* 1. TAB: MANAJEMEN WARTA */}
        {activeMenu === 'warta' && (
          <div className="space-y-6">
            {/* KPI Cards - Responsive 2 columns on mobile, 4 on desktop */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-stone-200 shadow-xs flex items-center gap-3">
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-blue-50 text-blue-800 flex items-center justify-center shrink-0">
                  <Layers className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-xl sm:text-2xl font-extrabold text-stone-900 font-mono-num">
                    {wartasList.length}
                  </div>
                  <div className="text-[11px] sm:text-xs text-stone-500 truncate">Total Warta</div>
                </div>
              </div>

              <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-stone-200 shadow-xs flex items-center gap-3">
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-xl sm:text-2xl font-extrabold text-emerald-700 font-mono-num">
                    {wartasList.filter((w) => w.status === 'published').length}
                  </div>
                  <div className="text-[11px] sm:text-xs text-stone-500 truncate">Published (Aktif)</div>
                </div>
              </div>

              <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-stone-200 shadow-xs flex items-center gap-3">
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
                  <Clock className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-xl sm:text-2xl font-extrabold text-amber-700 font-mono-num">
                    {wartasList.filter((w) => w.status === 'draft').length}
                  </div>
                  <div className="text-[11px] sm:text-xs text-stone-500 truncate">Draft Penyusunan</div>
                </div>
              </div>

              <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-stone-200 shadow-xs flex items-center justify-between col-span-2 sm:col-span-1">
                <div className="min-w-0">
                  <div className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">Akses Anda</div>
                  <div className="text-base sm:text-lg font-extrabold text-blue-900 uppercase truncate">
                    {currentRole}
                  </div>
                  <div className="text-[10px] text-stone-500 truncate">
                    {currentRole === 'admin'
                      ? 'CRUD Penuh & Kop'
                      : currentRole === 'sekretaris'
                      ? 'Liturgi & Keuangan'
                      : 'Keuangan Huria'}
                  </div>
                </div>
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center font-bold shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
              </div>
            </div>

            {/* Quick Banner: Analitik Tren Keuangan Recharts */}
            <div className="bg-gradient-to-r from-[#0B2545] to-[#133E6D] text-white p-4 sm:p-5 rounded-2xl shadow-xs border border-amber-500/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-400 text-stone-950 text-[10px] font-extrabold uppercase tracking-wide">
                  <BarChart3 className="w-3 h-3 text-stone-950" />
                  <span>Komponen Dashboard Recharts</span>
                </div>
                <h4 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  Visualisasi Tren Pendapatan & Sentralisasi 55%
                </h4>
                <p className="text-xs text-stone-300 max-w-2xl">
                  Lihat grafik interaktif penerimaan mingguan Tingting Parhepengon, perbandingan Kas Huria (45%) vs Sentralisasi (55%), serta akumulasi pos dana gereja.
                </p>
              </div>
              <button
                onClick={() => setActiveMenu('tren_keuangan')}
                className="inline-flex items-center gap-2 px-4 py-2 bg-amber-400 hover:bg-amber-300 text-stone-950 font-bold rounded-xl text-xs transition cursor-pointer shrink-0 shadow-xs"
              >
                <span>Buka Grafik Keuangan</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* List & Controls */}
            <div className="bg-white p-4 sm:p-5 rounded-xl border border-stone-200 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold text-stone-900">
                    Daftar Dokumen Warta Jemaat
                  </h3>
                  <p className="text-xs text-stone-500">
                    Pilih warta untuk mengedit Tata Ibadah, Tingting Namarragam, atau Keuangan.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <div className="relative w-full sm:w-64">
                    <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="Cari goar, topik, tanggal..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs border border-stone-300 rounded-lg focus:ring-1 focus:ring-blue-600 focus:outline-none min-h-[38px]"
                    />
                  </div>

                  <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-lg text-xs justify-center">
                    <button
                      onClick={() => setStatusFilter('all')}
                      className={`px-3 py-1.5 rounded transition cursor-pointer min-h-[32px] ${
                        statusFilter === 'all'
                          ? 'bg-white font-bold text-stone-900 shadow-xs'
                          : 'text-stone-600 hover:text-stone-900'
                      }`}
                    >
                      Semua
                    </button>
                    <button
                      onClick={() => setStatusFilter('published')}
                      className={`px-3 py-1.5 rounded transition cursor-pointer min-h-[32px] ${
                        statusFilter === 'published'
                          ? 'bg-white font-bold text-emerald-800 shadow-xs'
                          : 'text-stone-600 hover:text-stone-900'
                      }`}
                    >
                      Published
                    </button>
                    <button
                      onClick={() => setStatusFilter('draft')}
                      className={`px-3 py-1.5 rounded transition cursor-pointer min-h-[32px] ${
                        statusFilter === 'draft'
                          ? 'bg-white font-bold text-amber-800 shadow-xs'
                          : 'text-stone-600 hover:text-stone-900'
                      }`}
                    >
                      Draft
                    </button>
                  </div>
                </div>
              </div>

              {/* Mobile Card View (< md) */}
              <div className="block md:hidden space-y-3">
                {filteredWartas.length > 0 ? (
                  filteredWartas.map((w) => {
                    const totalRuas = (w.ruas_sm || 0) + (w.ruas_pagi || 0) + (w.ruas_siang || 0);
                    return (
                      <div
                        key={w.id}
                        className="p-4 rounded-xl border border-stone-200 bg-stone-50/50 hover:bg-white transition space-y-3"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="text-[11px] font-bold text-blue-900 bg-blue-100/70 px-2 py-0.5 rounded uppercase">
                              MINGGU {w.goar_minggu}
                            </span>
                            <div className="text-xs font-semibold text-stone-500 mt-1">
                              {formatTanggalIndo(w.tanggal_minggu)}
                            </div>
                          </div>
                          <button
                            onClick={() => handleToggleStatus(w)}
                            className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase transition cursor-pointer ${
                              w.status === 'published'
                                ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                                : 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                            }`}
                            title="Klik untuk beralih Draft/Published"
                          >
                            {w.status}
                          </button>
                        </div>

                        {w.topik_minggu && (
                          <div className="text-xs text-stone-700 italic bg-white p-2 rounded border border-stone-100">
                            "{w.topik_minggu}"
                          </div>
                        )}

                        <div className="flex items-center justify-between text-xs text-stone-500 pt-1 border-t border-stone-200/60">
                          <span>Kehadiran: <strong className="text-stone-800">{totalRuas > 0 ? `${totalRuas} Ruas` : '-'}</strong></span>
                          
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => navigate(`/admin/warta/${w.id}/edit`)}
                              className="px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-bold transition flex items-center gap-1 min-h-[36px]"
                            >
                              <FileEdit className="w-3.5 h-3.5" /> Edit
                            </button>
                            <button
                              onClick={() => navigate(`/warta/${w.id}/print`)}
                              className="px-2.5 py-1.5 bg-stone-200 text-stone-800 hover:bg-stone-300 rounded-lg text-xs font-semibold transition min-h-[36px]"
                              title="Cetak A4"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>
                            {canDeleteWarta && (
                              <button
                                onClick={() => handleDelete(w.id, w.goar_minggu)}
                                className="p-2 text-stone-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition min-h-[36px] min-w-[36px] flex items-center justify-center"
                                title="Hapus"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="py-8 text-center text-stone-400 italic bg-stone-50 rounded-xl">
                    Tidak ada warta jemaat yang cocok dengan pencarian.
                  </div>
                )}
              </div>

              {/* Desktop Table View (>= md) */}
              <div className="hidden md:block overflow-x-auto border border-stone-200 rounded-lg">
                <table className="w-full text-xs">
                  <thead className="bg-stone-50 text-stone-700 border-b border-stone-200 font-semibold">
                    <tr>
                      <th className="py-2.5 px-3 text-left w-36">Tanggal Minggu</th>
                      <th className="py-2.5 px-3 text-left">Goar & Topik ni Minggu</th>
                      <th className="py-2.5 px-3 text-center w-28">Status</th>
                      <th className="py-2.5 px-3 text-center w-28">Kehadiran Ruas</th>
                      <th className="py-2.5 px-3 text-right w-52">Aksi Pengurus</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {filteredWartas.length > 0 ? (
                      filteredWartas.map((w) => {
                        const totalRuas = (w.ruas_sm || 0) + (w.ruas_pagi || 0) + (w.ruas_siang || 0);
                        return (
                          <tr key={w.id} className="hover:bg-stone-50">
                            <td className="py-3 px-3 font-semibold text-stone-900">
                              {formatTanggalIndo(w.tanggal_minggu)}
                            </td>
                            <td className="py-3 px-3">
                              <div className="font-bold text-stone-900 text-sm">
                                MINGGU {w.goar_minggu}
                              </div>
                              {w.topik_minggu && (
                                <div className="text-stone-600 italic text-[11px] truncate max-w-md">
                                  "{w.topik_minggu}"
                                </div>
                              )}
                            </td>
                            <td className="py-3 px-3 text-center">
                              <button
                                onClick={() => handleToggleStatus(w)}
                                className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-bold uppercase cursor-pointer transition ${
                                  w.status === 'published'
                                    ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                                    : 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                                }`}
                                title="Klik untuk beralih Draft/Published"
                              >
                                {w.status}
                              </button>
                            </td>
                            <td className="py-3 px-3 text-center font-mono-num text-stone-700">
                              {totalRuas > 0 ? `${totalRuas} Halak` : '-'}
                            </td>
                            <td className="py-3 px-3 text-right space-x-1.5">
                              <button
                                onClick={() => navigate(`/admin/warta/${w.id}/edit`)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded font-semibold transition cursor-pointer"
                                title="Edit isi warta"
                              >
                                <FileEdit className="w-3.5 h-3.5" /> Edit
                              </button>

                              <button
                                onClick={() => navigate(`/warta/${w.id}/print`)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 bg-stone-100 text-stone-700 hover:bg-stone-200 rounded font-semibold transition cursor-pointer"
                                title="Cetak format A4"
                              >
                                <Printer className="w-3.5 h-3.5" /> Cetak
                              </button>

                              {canDeleteWarta && (
                                <button
                                  onClick={() => handleDelete(w.id, w.goar_minggu)}
                                  className="inline-flex items-center p-1 text-stone-400 hover:text-red-600 rounded hover:bg-red-50 transition cursor-pointer"
                                  title="Hapus warta (Admin)"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-stone-400 italic">
                          Tidak ada warta jemaat yang cocok dengan pencarian.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB: TREN KEUANGAN & GRAFIK RECHARTS */}
        {activeMenu === 'tren_keuangan' && (
          <div className="space-y-6 animate-in fade-in">
            <GrafikPendapatanMingguan />
          </div>
        )}

        {/* TAB: STATISTIK WIJK & CALON SIDI */}
        {activeMenu === 'ringkasan' && (
          <div className="space-y-6 animate-in fade-in">
            {/* KPI Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-800 flex items-center justify-center shrink-0">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-2xl font-extrabold text-stone-900 font-mono-num">
                    {statistikWijkList.length}
                  </div>
                  <div className="text-xs text-stone-500">Lingkungan / Wijk</div>
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-2xl font-extrabold text-indigo-800 font-mono-num">
                    {statistikWijkList.reduce((acc, c) => acc + (c.jumlah_keluarga || 0), 0)}
                  </div>
                  <div className="text-xs text-stone-500">Total Kepala Keluarga</div>
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-2xl font-extrabold text-emerald-800 font-mono-num">
                    {statistikWijkList.reduce((acc, c) => acc + (c.jumlah_anggota || 0), 0)}
                  </div>
                  <div className="text-xs text-stone-500">Total Jiwa Terdata</div>
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-800 flex items-center justify-center shrink-0">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-2xl font-extrabold text-amber-800 font-mono-num">
                    {calonSidiList.length}
                  </div>
                  <div className="text-xs text-stone-500">Calon Sidi (Marguru)</div>
                </div>
              </div>
            </div>

            {/* 1. View: v_statistik_wijk */}
            <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-xs space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 pb-3">
                <div>
                  <h3 className="font-bold text-stone-900 text-sm md:text-base flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-blue-700" />
                    Statistik Jemaat per Lingkungan
                    <span className="text-xs font-mono font-medium text-stone-500 bg-stone-100 px-2 py-0.5 rounded">
                      view: v_statistik_wijk
                    </span>
                  </h3>
                  <p className="text-xs text-stone-500">
                    Rekapitulasi jumlah keluarga, jiwa, gender, dan status sidi per wijk di HKBP Ressort Hutaraja.
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto border border-stone-200 rounded-lg">
                <table className="w-full text-xs">
                  <thead className="bg-stone-100 font-bold text-stone-800 border-b border-stone-200">
                    <tr>
                      <th className="py-2.5 px-3 text-left">Lingkungan / Wijk</th>
                      <th className="py-2.5 px-3 text-center">Jml KK</th>
                      <th className="py-2.5 px-3 text-center">Total Jiwa</th>
                      <th className="py-2.5 px-3 text-center">Laki-laki</th>
                      <th className="py-2.5 px-3 text-center">Perempuan</th>
                      <th className="py-2.5 px-3 text-center">Sudah Sidi</th>
                      <th className="py-2.5 px-3 text-center">Belum Sidi (Baptis)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {statistikWijkList.map((st, i) => (
                      <tr key={i} className="hover:bg-stone-50 transition">
                        <td className="py-2 px-3 font-bold text-stone-900">{st.wijk}</td>
                        <td className="py-2 px-3 text-center font-mono-num font-semibold text-blue-900">
                          {st.jumlah_keluarga ?? st.total_keluarga ?? 0}
                        </td>
                        <td className="py-2 px-3 text-center font-mono-num font-bold text-stone-900">
                          {st.jumlah_anggota ?? st.total_anggota ?? 0}
                        </td>
                        <td className="py-2 px-3 text-center font-mono-num text-stone-700">
                          {st.laki_laki ?? 0}
                        </td>
                        <td className="py-2 px-3 text-center font-mono-num text-stone-700">
                          {st.perempuan ?? 0}
                        </td>
                        <td className="py-2 px-3 text-center font-mono-num font-semibold text-emerald-700">
                          {st.sudah_sidi ?? 0}
                        </td>
                        <td className="py-2 px-3 text-center font-mono-num text-amber-700">
                          {st.belum_sidi ?? 0}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-stone-100 font-bold text-stone-900 border-t-2 border-stone-300">
                    <tr>
                      <td className="py-2.5 px-3">Total Seluruh Wijk</td>
                      <td className="py-2.5 px-3 text-center font-mono-num">
                        {statistikWijkList.reduce((a, c) => a + (c.jumlah_keluarga ?? c.total_keluarga ?? 0), 0)}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono-num">
                        {statistikWijkList.reduce((a, c) => a + (c.jumlah_anggota ?? c.total_anggota ?? 0), 0)}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono-num">
                        {statistikWijkList.reduce((a, c) => a + (c.laki_laki ?? 0), 0)}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono-num">
                        {statistikWijkList.reduce((a, c) => a + (c.perempuan ?? 0), 0)}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono-num text-emerald-800">
                        {statistikWijkList.reduce((a, c) => a + (c.sudah_sidi ?? 0), 0)}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono-num text-amber-800">
                        {statistikWijkList.reduce((a, c) => a + (c.belum_sidi ?? 0), 0)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* 2. View: v_calon_sidi */}
            <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-xs space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 pb-3">
                <div>
                  <h3 className="font-bold text-stone-900 text-sm md:text-base flex items-center gap-2">
                    <GraduationCap className="w-5 h-5 text-amber-700" />
                    Daftar Calon Sidi (Remaja Usia 14 - 20 Tahun Belum Sidi)
                    <span className="text-xs font-mono font-medium text-stone-500 bg-stone-100 px-2 py-0.5 rounded">
                      view: v_calon_sidi
                    </span>
                  </h3>
                  <p className="text-xs text-stone-500">
                    Otomatis dihitung dari tabel anggota: jemaat aktif yang sudah dibaptis namun belum naik sidi (tgl_sidi NULL).
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                  <div className="relative flex-1 sm:min-w-[200px]">
                    <Search className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      placeholder="Cari nama calon sidi..."
                      value={calonSidiSearch}
                      onChange={(e) => setCalonSidiSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs border border-stone-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-600 min-h-[40px]"
                    />
                  </div>

                  <select
                    value={calonSidiWijkFilter}
                    onChange={(e) => setCalonSidiWijkFilter(e.target.value)}
                    className="px-3 py-2 border border-stone-300 rounded-lg bg-white text-xs font-medium min-h-[40px]"
                  >
                    <option value="all">Semua Wijk</option>
                    {statistikWijkList.map((st, i) => (
                      <option key={i} value={st.wijk}>
                        {st.wijk}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="overflow-x-auto border border-stone-200 rounded-lg">
                <table className="w-full text-xs">
                  <thead className="bg-stone-100 font-bold text-stone-800 border-b border-stone-200">
                    <tr>
                      <th className="py-2.5 px-2 text-center w-8">No</th>
                      <th className="py-2.5 px-3 text-left w-24">Registrasi</th>
                      <th className="py-2.5 px-3 text-left">Nama Calon Sidi</th>
                      <th className="py-2.5 px-2 text-center w-12">L/P</th>
                      <th className="py-2.5 px-3 text-center w-24">Tgl Lahir</th>
                      <th className="py-2.5 px-2 text-center w-16">Usia</th>
                      <th className="py-2.5 px-3 text-left w-36">Wijk</th>
                      <th className="py-2.5 px-3 text-center w-24">Tgl Baptis</th>
                      <th className="py-2.5 px-3 text-left w-28">Hub. Keluarga</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {calonSidiList
                      .filter((cs) => {
                        const matchQ =
                          cs.nama.toLowerCase().includes(calonSidiSearch.toLowerCase()) ||
                          (cs.registrasi || '').includes(calonSidiSearch);
                        const matchWijk =
                          calonSidiWijkFilter === 'all' || cs.wijk === calonSidiWijkFilter;
                        return matchQ && matchWijk;
                      })
                      .map((cs, idx) => (
                        <tr key={cs.id || idx} className="hover:bg-stone-50 transition">
                          <td className="py-2 px-2 text-center text-stone-500">{idx + 1}.</td>
                          <td className="py-2 px-3 font-mono font-bold text-blue-900">
                            {cs.registrasi}
                          </td>
                          <td className="py-2 px-3 font-bold text-stone-900">{cs.nama}</td>
                          <td className="py-2 px-2 text-center">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                cs.jenis_kelamin === 'L'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-pink-100 text-pink-800'
                              }`}
                            >
                              {cs.jenis_kelamin}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-center font-mono-num text-stone-700">
                            {cs.tgl_lahir || '-'}
                          </td>
                          <td className="py-2 px-2 text-center font-bold text-amber-900">
                            {cs.usia} Thn
                          </td>
                          <td className="py-2 px-3 text-stone-700">{cs.wijk}</td>
                          <td className="py-2 px-3 text-center font-mono-num text-stone-600">
                            {cs.tgl_baptis || '-'}
                          </td>
                          <td className="py-2 px-3 text-stone-600">{cs.hub_keluarga || 'Anak'}</td>
                        </tr>
                      ))}
                    {calonSidiList.length === 0 && (
                      <tr>
                        <td colSpan={9} className="py-6 text-center text-stone-400 italic">
                          Tidak ada calon sidi yang terdaftar dalam kriteria usia 14-20 tahun.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* 2. TAB: ARSIP WARTA */}
        {activeMenu === 'arsip' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-stone-200">
              <div>
                <h3 className="font-bold text-stone-900 text-base">Arsip Warta Jemaat Lengkap</h3>
                <p className="text-xs text-stone-500">
                  Setiap warta yang diterbitkan tersimpan permanen dan dapat dicetak sewaktu-waktu.
                </p>
              </div>
              <button
                onClick={() => navigate('/arsip')}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-bold transition cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Buka Tampilan Arsip Publik
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {wartasList.map((w) => (
                <div
                  key={w.id}
                  className="bg-white p-4 rounded-xl border border-stone-200 space-y-2 hover:border-blue-400 transition"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-blue-900 uppercase">
                      MINGGU {w.goar_minggu}
                    </span>
                    <span
                      className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
                        w.status === 'published'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {w.status}
                    </span>
                  </div>
                  <div className="text-xs font-semibold text-stone-700">
                    {formatTanggalIndo(w.tanggal_minggu)}
                  </div>
                  <div className="text-xs text-stone-600 line-clamp-1">{w.topik_minggu || '-'}</div>

                  <div className="pt-2 border-t border-stone-100 flex items-center justify-between">
                    <button
                      onClick={() => navigate(`/?id=${w.id}`)}
                      className="text-xs font-semibold text-blue-700 hover:underline"
                    >
                      Lihat Isi
                    </button>
                    <button
                      onClick={() => navigate(`/warta/${w.id}/print`)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded text-xs font-bold transition"
                    >
                      <Printer className="w-3.5 h-3.5 text-stone-600" /> Cetak A4
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 3. TAB: PENGGUNA & ROLE (ADMIN ONLY) */}
        {activeMenu === 'users' && canManageUsers && <UserManagement />}

        {/* 4. TAB: UBAH LOGO & KOP SURAT (ADMIN ONLY) */}
        {activeMenu === 'kop' && canManageSettings && pengaturan && (
          <KopLogoEditor pengaturan={pengaturan} onSave={handleSaveKop} />
        )}
      </main>

      {/* Modal Buat Warta Baru */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 border border-stone-200 animate-in fade-in">
            <h3 className="text-base font-bold text-stone-900 mb-1">Susun Warta Minggu Baru</h3>
            <p className="text-xs text-stone-500 mb-4">
              Sistem akan otomatis mengalirkan saldo akhir minggu sebelumnya sebagai saldo awal baru dan menyaring ulang tahun jemaat.
            </p>

            <form onSubmit={handleCreateNew} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Tanggal Hari Minggu
                </label>
                <input
                  type="date"
                  required
                  value={newTanggal}
                  onChange={(e) => setNewTanggal(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-stone-300 rounded font-semibold focus:ring-1 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-stone-800">
                    Goar ni Minggu (Kalender Liturgi HKBP):
                  </label>
                  <span className="text-[10px] bg-blue-50 text-blue-900 font-bold px-1.5 py-0.2 rounded border border-blue-200">
                    Pilih dari 63 Minggu
                  </span>
                </div>
                <MingguLiturgiDropdown
                  value={newGoar}
                  onChange={(nama, item) => {
                    setNewGoar(nama);
                    if (item) {
                      setSelectedMingguInfo(item);
                      if (item.topik_default) {
                        setNewTopik(item.topik_default);
                      }
                    }
                  }}
                />
              </div>

              {selectedMingguInfo && (
                <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 text-xs space-y-1.5 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-stone-800">Liturgi HKBP:</span>
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border ${
                        getLiturgiColorBadge(selectedMingguInfo.warna_liturgi).bg
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          getLiturgiColorBadge(selectedMingguInfo.warna_liturgi).dot
                        }`}
                      />
                      <span>Warna Langgatan: {selectedMingguInfo.warna_liturgi || 'Hijau'}</span>
                    </span>
                  </div>
                  {selectedMingguInfo.arti_batak && selectedMingguInfo.arti_batak !== '-' && (
                    <div className="text-stone-700 italic font-serif-body">
                      "{selectedMingguInfo.arti_batak}"
                    </div>
                  )}
                  {selectedMingguInfo.arti_indonesia && selectedMingguInfo.arti_indonesia !== '-' && (
                    <div className="text-[11px] text-stone-500">
                      {selectedMingguInfo.arti_indonesia}
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Topik ni Minggu
                </label>
                <input
                  type="text"
                  value={newTopik}
                  onChange={(e) => setNewTopik(e.target.value)}
                  placeholder="e.g. Marpanghiramon tu Jahowa di Tingki Hagogotan"
                  className="w-full px-3 py-2 text-xs border border-stone-300 rounded focus:ring-1 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-100 rounded transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold rounded shadow transition cursor-pointer disabled:opacity-50"
                >
                  {isCreating ? 'Menyusun...' : 'Buat Warta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
