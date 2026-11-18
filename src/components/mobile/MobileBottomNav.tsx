import React, { useState } from 'react';
import {
  Home,
  BookOpen,
  Calendar,
  Megaphone,
  Menu,
  Archive,
  Download,
  Printer,
  Share2,
  MessageCircle,
  ShieldCheck,
  X,
  Loader2,
  ChevronRight
} from 'lucide-react';
import { MobilePortalView } from '../../lib/shareUtils';
import { UserRole } from '../../types';

interface MobileBottomNavProps {
  activeView: MobilePortalView;
  onChangeView: (view: MobilePortalView) => void;
  hasActiveWarta: boolean;
  isExportingPdf: boolean;
  onDownloadPdf: () => void;
  onOpenPrintA4: () => void;
  onOpenArchive: () => void;
  onShareDevice: () => void;
  onShareWhatsApp: () => void;
  onOpenAdminOrLogin: () => void;
  currentRole: UserRole;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeView,
  onChangeView,
  hasActiveWarta,
  isExportingPdf,
  onDownloadPdf,
  onOpenPrintA4,
  onOpenArchive,
  onShareDevice,
  onShareWhatsApp,
  onOpenAdminOrLogin,
  currentRole
}) => {
  const [moreOpen, setMoreOpen] = useState(false);

  const navItems: {
    id: MobilePortalView;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }[] = [
    { id: 'beranda', label: 'Beranda', icon: Home },
    { id: 'baca', label: 'Warta', icon: BookOpen },
    { id: 'kegiatan', label: 'Kegiatan', icon: Calendar },
    { id: 'pengumuman', label: 'Tingting', icon: Megaphone }
  ];

  return (
    <>
      <nav
        aria-label="Navigasi Utama Mobile"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-stone-200 pb-safe shadow-[0_-8px_24px_rgba(11,37,69,0.08)]"
      >
        <div className="grid grid-cols-5 items-center h-[58px] max-w-3xl mx-auto px-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setMoreOpen(false);
                  onChangeView(item.id);
                }}
                aria-current={isActive ? 'page' : undefined}
                className={`relative flex flex-col items-center justify-center min-h-[44px] py-1 rounded-xl transition active:scale-95 cursor-pointer ${
                  isActive ? 'text-[#0B2545]' : 'text-stone-500 hover:text-stone-800'
                }`}
              >
                {isActive && (
                  <span
                    aria-hidden="true"
                    className="absolute top-0.5 w-6 h-0.5 rounded-full bg-[#C59B27]"
                  />
                )}
                <Icon
                  className={`w-[21px] h-[21px] transition-transform ${
                    isActive ? 'text-[#0B2545] scale-105' : 'text-stone-500'
                  }`}
                />
                <span
                  className={`text-[10.5px] mt-0.5 tracking-tight whitespace-nowrap ${
                    isActive ? 'font-bold text-[#0B2545]' : 'font-medium text-stone-600'
                  }`}
                >
                  {item.label}
                </span>
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            aria-expanded={moreOpen}
            aria-label="Menu Lainnya"
            className={`relative flex flex-col items-center justify-center min-h-[44px] py-1 rounded-xl transition active:scale-95 cursor-pointer ${
              moreOpen ? 'text-[#0B2545]' : 'text-stone-500 hover:text-stone-800'
            }`}
          >
            <Menu className="w-[21px] h-[21px]" />
            <span className="text-[10.5px] font-medium mt-0.5 tracking-tight whitespace-nowrap">
              Lainnya
            </span>
          </button>
        </div>
      </nav>

      {/* Action Bottom Sheet ("Lainnya") */}
      {moreOpen && (
        <div
          className="lg:hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-end justify-center"
          onClick={() => setMoreOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Menu Tambahan E-Warta"
        >
          <div
            className="w-full max-w-2xl bg-white rounded-t-3xl border-t border-stone-200 shadow-2xl pb-safe animate-in slide-in-from-bottom-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1.5 bg-stone-300 rounded-full mx-auto my-3" />

            <div className="px-5 pb-3 border-b border-stone-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-[#0B2545]">Menu &amp; Aksi Cepat</h3>
                <p className="text-xs text-stone-500">Arsip, PDF, Bagikan &amp; Portal Pengurus</p>
              </div>
              <button
                type="button"
                onClick={() => setMoreOpen(false)}
                aria-label="Tutup Menu"
                className="min-w-[44px] min-h-[44px] rounded-xl text-stone-500 hover:bg-stone-100 flex items-center justify-center cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-1.5 max-h-[70vh] overflow-y-auto">
              <button
                type="button"
                onClick={() => {
                  setMoreOpen(false);
                  onOpenArchive();
                }}
                className="w-full min-h-[54px] px-3.5 py-2.5 rounded-2xl hover:bg-stone-50 active:bg-stone-100 flex items-center justify-between gap-3 text-left transition cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <span className="w-9 h-9 rounded-xl bg-amber-50 text-amber-800 flex items-center justify-center shrink-0">
                    <Archive className="w-4.5 h-4.5" />
                  </span>
                  <div>
                    <div className="text-sm font-bold text-stone-900">Arsip Warta Jemaat</div>
                    <div className="text-xs text-stone-500">Cari edisi minggu-minggu sebelumnya</div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-stone-400 shrink-0" />
              </button>

              {hasActiveWarta && (
                <>
                  <button
                    type="button"
                    disabled={isExportingPdf}
                    onClick={() => {
                      setMoreOpen(false);
                      onDownloadPdf();
                    }}
                    className="w-full min-h-[54px] px-3.5 py-2.5 rounded-2xl hover:bg-emerald-50/70 active:bg-emerald-100/70 flex items-center justify-between gap-3 text-left transition cursor-pointer disabled:opacity-60"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                        {isExportingPdf ? (
                          <Loader2 className="w-4.5 h-4.5 animate-spin" />
                        ) : (
                          <Download className="w-4.5 h-4.5" />
                        )}
                      </span>
                      <div>
                        <div className="text-sm font-bold text-stone-900">
                          {isExportingPdf ? 'Menyiapkan PDF...' : 'Unduh Dokumen PDF'}
                        </div>
                        <div className="text-xs text-stone-500">Simpan salinan warta resmi ke HP</div>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-stone-400 shrink-0" />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setMoreOpen(false);
                      onOpenPrintA4();
                    }}
                    className="w-full min-h-[54px] px-3.5 py-2.5 rounded-2xl hover:bg-stone-50 active:bg-stone-100 flex items-center justify-between gap-3 text-left transition cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-9 h-9 rounded-xl bg-blue-50 text-[#0B2545] flex items-center justify-center shrink-0">
                        <Printer className="w-4.5 h-4.5" />
                      </span>
                      <div>
                        <div className="text-sm font-bold text-stone-900">Tampilan Kertas Cetak A4</div>
                        <div className="text-xs text-stone-500">Lihat tata letak cetak resmi 3 halaman</div>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-stone-400 shrink-0" />
                  </button>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setMoreOpen(false);
                        onShareWhatsApp();
                      }}
                      className="min-h-[48px] px-3 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] transition"
                    >
                      <MessageCircle className="w-4 h-4 shrink-0" />
                      <span>Kirim WhatsApp</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMoreOpen(false);
                        onShareDevice();
                      }}
                      className="min-h-[48px] px-3 py-2.5 rounded-2xl bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] transition"
                    >
                      <Share2 className="w-4 h-4 shrink-0" />
                      <span>Bagikan Link</span>
                    </button>
                  </div>
                </>
              )}

              <div className="pt-2 border-t border-stone-100 mt-2">
                <button
                  type="button"
                  onClick={() => {
                    setMoreOpen(false);
                    onOpenAdminOrLogin();
                  }}
                  className="w-full min-h-[52px] px-4 py-2.5 rounded-2xl bg-[#0B2545] text-white flex items-center justify-between gap-3 text-left transition cursor-pointer active:scale-[0.99]"
                >
                  <div className="flex items-center gap-3">
                    <ShieldCheck className="w-5 h-5 text-amber-400 shrink-0" />
                    <div>
                      <div className="text-sm font-bold">
                        {currentRole !== 'publik'
                          ? `Dashboard Pengurus (${currentRole})`
                          : 'Masuk Portal Pengurus'}
                      </div>
                      <div className="text-[11px] text-amber-200/90">
                        Kelola warta, keuangan &amp; data jemaat
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-amber-400 shrink-0" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
