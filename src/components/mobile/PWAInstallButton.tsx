import React, { useState } from 'react';
import { Smartphone, Download, Share, MoreVertical, X, CheckCircle2, WifiOff } from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';

interface PWAInstallButtonProps {
  variant?: 'header' | 'banner';
  onInstalled?: () => void;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  variant = 'banner',
  onInstalled,
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuideModal, setShowGuideModal] = useState(false);

  if (isInstalled) {
    return null;
  }

  const handleClick = async () => {
    if (isInstallable) {
      const ok = await install();
      if (ok) {
        onInstalled?.();
      }
      return;
    }
    setShowGuideModal(true);
  };

  return (
    <>
      {variant === 'header' ? (
        <button
          type="button"
          onClick={handleClick}
          aria-label="Pasang Aplikasi ke HP"
          title="Pasang E-Warta ke Layar Utama HP"
          className="min-w-[44px] min-h-[44px] px-2 rounded-xl text-amber-300 hover:bg-white/10 flex items-center justify-center gap-1 cursor-pointer"
        >
          <Smartphone className="w-4.5 h-4.5 shrink-0" />
          <span className="text-[11px] font-bold hidden sm:inline">Pasang</span>
        </button>
      ) : (
        <section className="bg-white rounded-2xl border border-stone-200 p-4 shadow-2xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-[#0B2545] text-amber-300 flex items-center justify-center shrink-0">
              <Smartphone className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-[#0B2545] leading-snug">
                Pasang E-Warta di Layar HP
              </h3>
              <p className="text-xs text-stone-600 leading-snug">
                {isInstallable
                  ? 'Pasang langsung seperti aplikasi Android tanpa lewat Play Store.'
                  : isIOS
                  ? 'Tambahkan ke Layar Utama iPhone untuk akses cepat setiap Minggu.'
                  : 'Buka cepat dari layar utama Android / iPhone tanpa bilah browser.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClick}
            className="min-h-[42px] px-3.5 py-2 rounded-xl bg-[#0B2545] hover:bg-[#133868] text-white text-xs font-bold inline-flex items-center gap-1.5 shrink-0 cursor-pointer shadow-xs"
          >
            <Download className="w-3.5 h-3.5 shrink-0" />
            <span>Pasang</span>
          </button>
        </section>
      )}

      {showGuideModal && (
        <div
          className="fixed inset-0 z-50 bg-black/55 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setShowGuideModal(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Panduan Pasang Aplikasi E-Warta"
        >
          <div
            className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-2xl p-5 sm:p-6 shadow-2xl space-y-4 pb-safe"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-[#0B2545] text-amber-300 flex items-center justify-center shrink-0">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#0B2545]">
                    Pasang E-Warta ke HP
                  </h3>
                  <p className="text-xs text-stone-500">
                    {isIOS ? 'Panduan untuk iPhone / iPad (Safari)' : 'Panduan untuk Android (Chrome)'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                aria-label="Tutup"
                className="min-w-[40px] min-h-[40px] rounded-xl text-stone-400 hover:bg-stone-100 flex items-center justify-center cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {isIOS ? (
              <ol className="space-y-2.5 text-sm text-stone-700">
                <li className="flex items-start gap-2.5">
                  <span className="w-6 h-6 rounded-full bg-[#0B2545] text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                    1
                  </span>
                  <span>
                    Buka halaman ini di browser <strong>Safari</strong>, lalu ketuk ikon{' '}
                    <strong className="inline-flex items-center gap-1">
                      <Share className="w-3.5 h-3.5 inline" /> Bagikan (Share)
                    </strong>{' '}
                    di bagian bawah layar.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="w-6 h-6 rounded-full bg-[#0B2545] text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                    2
                  </span>
                  <span>
                    Gulir ke bawah dan pilih <strong>Tambah ke Layar Utama (Add to Home Screen)</strong>, lalu ketuk <strong>Tambah</strong>.
                  </span>
                </li>
              </ol>
            ) : (
              <ol className="space-y-2.5 text-sm text-stone-700">
                <li className="flex items-start gap-2.5">
                  <span className="w-6 h-6 rounded-full bg-[#0B2545] text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                    1
                  </span>
                  <span>
                    Pastikan membuka tautan ini menggunakan browser <strong>Google Chrome</strong> (jika dari WhatsApp, pilih menu <strong>Buka di Chrome</strong>).
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="w-6 h-6 rounded-full bg-[#0B2545] text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                    2
                  </span>
                  <span>
                    Ketuk ikon menu{' '}
                    <strong className="inline-flex items-center gap-0.5">
                      <MoreVertical className="w-3.5 h-3.5 inline" /> (titik tiga)
                    </strong>{' '}
                    di pojok kanan atas Chrome, lalu pilih <strong>Instal aplikasi</strong> atau{' '}
                    <strong>Tambahkan ke layar utama</strong>.
                  </span>
                </li>
              </ol>
            )}

            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
              <span>
                Setelah terpasang, ikon <strong>E-Warta HKBP</strong> muncul di layar utama HP dan selalu otomatis memuat edisi Warta terbaru setiap hari Minggu.
              </span>
            </div>

            <button
              type="button"
              onClick={() => setShowGuideModal(false)}
              className="w-full min-h-[44px] py-2.5 rounded-xl bg-[#0B2545] text-white text-sm font-bold cursor-pointer"
            >
              Mengerti
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();
  if (isOnline) return null;

  return (
    <div className="lg:hidden fixed bottom-[74px] left-3 right-3 z-30 flex items-center justify-center gap-2 rounded-xl bg-amber-600 px-3 py-2 text-xs font-semibold text-white shadow-lg">
      <WifiOff className="w-4 h-4 shrink-0" />
      <span>Sedang offline — menampilkan data tersimpan.</span>
    </div>
  );
};
