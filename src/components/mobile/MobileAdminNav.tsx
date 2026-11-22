import React from 'react';
import { Layers, BarChart3, Settings, Globe, Plus } from 'lucide-react';

interface MobileAdminNavProps {
  currentPage: 'dashboard' | 'master';
  activeMenu?: string;
  onSelectDashboardMenu?: (menu: 'warta' | 'kalender' | 'tren_keuangan' | 'ringkasan' | 'arsip' | 'users' | 'kop') => void;
  onCreateWarta?: () => void;
  onGoDashboard: () => void;
  onGoMaster: () => void;
  onGoPortal: () => void;
}

export const MobileAdminNav: React.FC<MobileAdminNavProps> = ({
  currentPage,
  activeMenu,
  onSelectDashboardMenu,
  onCreateWarta,
  onGoDashboard,
  onGoMaster,
  onGoPortal
}) => {
  return (
    <nav
      aria-label="Navigasi Pengurus Mobile"
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-stone-200 pb-safe shadow-[0_-8px_24px_rgba(11,37,69,0.08)]"
    >
      <div className="grid grid-cols-5 items-center h-[58px] max-w-2xl mx-auto px-1">
        <button
          type="button"
          onClick={() => {
            if (currentPage === 'dashboard' && onSelectDashboardMenu) {
              onSelectDashboardMenu('warta');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            } else {
              onGoDashboard();
            }
          }}
          className={`relative flex flex-col items-center justify-center min-h-[44px] text-[10.5px] cursor-pointer ${
            currentPage === 'dashboard' && activeMenu === 'warta'
              ? 'text-[#0B2545] font-bold'
              : 'text-stone-600 font-medium'
          }`}
        >
          {currentPage === 'dashboard' && activeMenu === 'warta' && (
            <span className="absolute top-0.5 w-6 h-0.5 rounded-full bg-[#C59B27]" />
          )}
          <Layers className="w-5 h-5" />
          <span className="mt-0.5">Warta</span>
        </button>

        <button
          type="button"
          onClick={() => {
            if (currentPage === 'dashboard' && onSelectDashboardMenu) {
              onSelectDashboardMenu('ringkasan');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            } else {
              onGoDashboard();
            }
          }}
          className={`relative flex flex-col items-center justify-center min-h-[44px] text-[10.5px] cursor-pointer ${
            currentPage === 'dashboard' &&
            (activeMenu === 'ringkasan' || activeMenu === 'tren_keuangan')
              ? 'text-[#0B2545] font-bold'
              : 'text-stone-600 font-medium'
          }`}
        >
          <BarChart3 className="w-5 h-5" />
          <span className="mt-0.5">Statistik</span>
        </button>

        {onCreateWarta ? (
          <button
            type="button"
            onClick={onCreateWarta}
            aria-label="Buat Warta Baru"
            className="flex flex-col items-center justify-center min-h-[44px] cursor-pointer"
          >
            <span className="w-10 h-10 -mt-3 rounded-2xl bg-amber-500 text-stone-950 shadow-md flex items-center justify-center border-2 border-white">
              <Plus className="w-5 h-5" />
            </span>
            <span className="text-[10px] font-bold text-[#0B2545] mt-0.5">Buat</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={onGoDashboard}
            className="flex flex-col items-center justify-center min-h-[44px] text-stone-600 text-[10.5px] font-medium cursor-pointer"
          >
            <Layers className="w-5 h-5" />
            <span className="mt-0.5">Dasbor</span>
          </button>
        )}

        <button
          type="button"
          onClick={onGoMaster}
          className={`relative flex flex-col items-center justify-center min-h-[44px] text-[10.5px] cursor-pointer ${
            currentPage === 'master' ? 'text-[#0B2545] font-bold' : 'text-stone-600 font-medium'
          }`}
        >
          {currentPage === 'master' && (
            <span className="absolute top-0.5 w-6 h-0.5 rounded-full bg-[#C59B27]" />
          )}
          <Settings className="w-5 h-5" />
          <span className="mt-0.5">Master</span>
        </button>

        <button
          type="button"
          onClick={onGoPortal}
          className="flex flex-col items-center justify-center min-h-[44px] text-stone-600 text-[10.5px] font-medium cursor-pointer"
        >
          <Globe className="w-5 h-5" />
          <span className="mt-0.5">Portal</span>
        </button>
      </div>
    </nav>
  );
};
