import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';
import { HkbpCrossLogo } from '../components/logos/HkbpCrossLogo';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { Shield, UserCheck, ArrowRight, Lock, Mail, Key } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { signInAsDemo } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleRealLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSupabaseConfigured || !supabase) {
      setErrorMsg('Supabase belum dikonfigurasi. Silakan gunakan tombol Masuk Cepat (Demo Mode).');
      return;
    }
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      if (error) {
        setErrorMsg(error.message);
      } else if (data.user) {
        navigate('/admin');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal masuk.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDemoLogin = (role: UserRole) => {
    signInAsDemo(role);
    if (role === 'publik') {
      navigate('/');
    } else {
      navigate('/admin');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0B2545]/15 via-[#F7F5F0] to-[#F7F5F0] flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-stone-200/80 overflow-hidden">
        {/* Header */}
        <div className="bg-[#0B2545] text-white p-6 sm:p-7 text-center space-y-2 border-b-2 border-amber-500">
          <div className="flex justify-center mb-1">
            <HkbpCrossLogo size={56} />
          </div>
          <h2 className="font-display font-bold text-base sm:text-lg tracking-wider uppercase text-white">
            Warta Jemaat HKBP Ressort Hutaraja
          </h2>
          <p className="text-xs text-amber-300 font-medium">
            Distrik VI Dairi · Masuk ke Sistem Manajemen Warta
          </p>
        </div>

        <div className="p-5 sm:p-6 space-y-5">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-medium">
              {errorMsg}
            </div>
          )}

          {/* Quick 1-Click Demo Login Roles */}
          <div className="space-y-2.5">
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wide">
              Masuk Cepat Menurut Hak Akses (Demo):
            </label>
            <div className="grid grid-cols-1 gap-2">
              <button
                type="button"
                onClick={() => handleDemoLogin('admin')}
                className="w-full flex items-center justify-between p-3 rounded-xl border border-blue-200 bg-blue-50/70 hover:bg-blue-100 text-blue-950 text-xs font-semibold transition text-left cursor-pointer min-h-[48px]"
              >
                <div>
                  <div className="font-bold flex items-center gap-1.5 text-blue-900">
                    <Shield className="w-4 h-4 text-blue-700 shrink-0" />
                    Admin (Akses Penuh CRUD, Kop & Pengguna)
                  </div>
                  <div className="text-[11px] text-blue-800/80 font-normal">
                    Pdt. H. Simanjuntak, S.Th (Uluan Ressort)
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-blue-600 shrink-0 ml-2" />
              </button>

              <button
                type="button"
                onClick={() => handleDemoLogin('sekretaris')}
                className="w-full flex items-center justify-between p-3 rounded-xl border border-purple-200 bg-purple-50/70 hover:bg-purple-100 text-purple-950 text-xs font-semibold transition text-left cursor-pointer min-h-[48px]"
              >
                <div>
                  <div className="font-bold flex items-center gap-1.5 text-purple-900">
                    <UserCheck className="w-4 h-4 text-purple-700 shrink-0" />
                    Sekretaris (Tata Ibadah, Tingting & Keuangan)
                  </div>
                  <div className="text-[11px] text-purple-800/80 font-normal">
                    St. Ramses Sitohang (Sekretaris Huria)
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-purple-600 shrink-0 ml-2" />
              </button>

              <button
                type="button"
                onClick={() => handleDemoLogin('bendahara')}
                className="w-full flex items-center justify-between p-3 rounded-xl border border-amber-200 bg-amber-50/70 hover:bg-amber-100 text-amber-950 text-xs font-semibold transition text-left cursor-pointer min-h-[48px]"
              >
                <div>
                  <div className="font-bold flex items-center gap-1.5 text-amber-900">
                    <Key className="w-4 h-4 text-amber-700 shrink-0" />
                    Bendahara (Input Data Keuangan Saja)
                  </div>
                  <div className="text-[11px] text-amber-800/80 font-normal">
                    St. M. Simarmata (Bendahara Huria)
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-amber-600 shrink-0 ml-2" />
              </button>

              <button
                type="button"
                onClick={() => handleDemoLogin('publik')}
                className="w-full flex items-center justify-between p-3 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 text-xs font-semibold transition text-left cursor-pointer min-h-[44px]"
              >
                <span>Akses Publik (Jemaat Tanpa Login)</span>
                <ArrowRight className="w-4 h-4 text-stone-400 shrink-0" />
              </button>
            </div>
          </div>

          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-stone-200" />
            <span className="flex-shrink mx-3 text-stone-400 text-[10px] uppercase font-bold tracking-wider">
              Atau Masuk dengan Akun Supabase
            </span>
            <div className="flex-grow border-t border-stone-200" />
          </div>

          {/* Real Supabase Login Form */}
          <form onSubmit={handleRealLogin} className="space-y-3.5">
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">Email</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-stone-400 absolute left-3.5 top-3.5" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nama@hkbp-hutaraja.org"
                  className="w-full pl-10 pr-3 py-2.5 text-xs border border-stone-300 rounded-xl focus:ring-2 focus:ring-[#0B2545] focus:outline-none min-h-[44px]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-stone-400 absolute left-3.5 top-3.5" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-3 py-2.5 text-xs border border-stone-300 rounded-xl focus:ring-2 focus:ring-[#0B2545] focus:outline-none min-h-[44px]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 px-4 bg-[#0B2545] hover:bg-[#123561] text-white rounded-xl text-xs font-bold shadow-md transition cursor-pointer disabled:opacity-50 min-h-[44px]"
            >
              {isSubmitting ? 'Memeriksa Kredensial...' : 'Masuk via Supabase'}
            </button>
          </form>
        </div>
      </div>

      <div className="mt-4 text-center">
        <button
          onClick={() => navigate('/')}
          className="text-xs text-stone-500 hover:text-[#0B2545] transition font-semibold"
        >
          ← Kembali ke Beranda Warta Jemaat
        </button>
      </div>
    </div>
  );
};
