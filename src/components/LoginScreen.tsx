import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { HalagelLogo } from './common/HalagelLogo';
import { Eye, EyeOff, Mail, Lock, ArrowRight, AlertCircle, X, Smartphone, CheckCircle2, ShieldCheck, MapPin } from 'lucide-react';

export const LoginScreen: React.FC = () => {
  const { login, isLoading, error, clearError } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showInstallGuide, setShowInstallGuide] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier || !password) return;
    await login(identifier, password);
  };

  const handleQuickLogin = (user: string, pass: string) => {
    setIdentifier(user);
    setPassword(pass);
    clearError();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-[#f8fafc] to-emerald-50/50 text-slate-800 flex flex-col justify-center items-center px-4 py-8 relative">
      {/* Background Metallic Light Effect */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-72 bg-gradient-to-b from-emerald-100/50 via-slate-100/20 to-transparent blur-3xl pointer-events-none -z-10" />

      <div className="w-full max-w-md bg-white/95 backdrop-blur-xl border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-slate-300/60 relative">
        {/* Halagel Logo Centerpiece */}
        <div className="flex flex-col items-center mb-6">
          <div className="p-3 mb-2 transition-transform hover:scale-105 duration-300">
            <HalagelLogo size="lg" />
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200/80 text-[#588517] text-xs font-bold tracking-wide mb-2 shadow-xs">
            <span className="w-2 h-2 rounded-full bg-[#588517] animate-pulse" />
            <span>Sistem Kehadiran Digital</span>
          </div>

          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight text-center">
            Log Masuk Kakitangan
          </h1>
          <p className="text-slate-500 text-xs text-center mt-1">
            GPS Geofens, Pengesahan Wajah & Papan Pemuka Pekerja
          </p>
        </div>

        {/* Error notification */}
        {error && (
          <div className="mb-5 p-3.5 rounded-2xl bg-red-50 border border-red-200 flex items-center gap-3 text-red-700 text-xs shadow-xs">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span className="font-medium">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Alamat Emel / ID Staf
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Mail className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                required
                placeholder="cth: EMP101 atau ADMIN"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#588517] focus:ring-2 focus:ring-[#588517]/20 focus:bg-white transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Kata Laluan
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-10 pr-10 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#588517] focus:ring-2 focus:ring-[#588517]/20 focus:bg-white transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="metallic-button w-full py-3 px-4 rounded-xl text-white font-black text-sm flex items-center justify-center gap-2 transition disabled:opacity-50 cursor-pointer shadow-lg shadow-emerald-700/25 active:scale-[0.99]"
          >
            {isLoading ? (
              <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>Log Masuk Kehadiran</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Quick Demo Login Fill Buttons */}
        <div className="mt-4 pt-3 border-t border-slate-200">
          <div className="text-[11px] font-semibold text-slate-400 text-center mb-2">Akses Pantas Demo:</div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              type="button"
              onClick={() => handleQuickLogin('EMP101', 'password123')}
              className="p-2 rounded-xl bg-slate-50 hover:bg-emerald-50/70 border border-slate-200 hover:border-emerald-300 text-slate-700 text-center transition cursor-pointer"
            >
              <div className="font-bold text-[11px] text-slate-900">Kakitangan</div>
              <div className="text-[10px] text-slate-500">EMP101</div>
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin('ADMIN', 'admin123')}
              className="p-2 rounded-xl bg-slate-50 hover:bg-emerald-50/70 border border-slate-200 hover:border-emerald-300 text-slate-700 text-center transition cursor-pointer"
            >
              <div className="font-bold text-[11px] text-[#588517]">Pentadbir HR</div>
              <div className="text-[10px] text-slate-500">ADMIN</div>
            </button>
          </div>
        </div>

        {/* Install on Android Phone Card */}
        <div className="mt-4 p-3 rounded-2xl bg-gradient-to-r from-emerald-50/80 via-white to-emerald-50/40 border border-emerald-200/90 flex items-center justify-between text-xs shadow-xs">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">📱</span>
            <div>
              <div className="font-black text-[#4E7812] text-[11px]">Pasang Pada Telefon Android</div>
              <div className="text-[10px] text-slate-500">Buka di Chrome & pilih 'Pasang Aplikasi'</div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowInstallGuide(true)}
            className="px-3 py-1.5 rounded-xl bg-[#588517] hover:bg-[#4E7812] text-white font-bold text-[10px] transition cursor-pointer shadow-xs"
          >
            Panduan
          </button>
        </div>
      </div>

      {/* Android Install Guide Modal */}
      {showInstallGuide && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-sm w-full shadow-2xl relative space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                <Smartphone className="w-4 h-4 text-[#588517]" />
                <span>Panduan Pasang di Android</span>
              </div>
              <button
                onClick={() => setShowInstallGuide(false)}
                className="p-1 rounded-lg bg-slate-100 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-600">
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-emerald-100 text-[#588517] font-bold flex items-center justify-center shrink-0 text-[11px]">
                  1
                </span>
                <p>Buka pautan aplikasi di pelayar <strong>Google Chrome</strong> telefon anda.</p>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-emerald-100 text-[#588517] font-bold flex items-center justify-center shrink-0 text-[11px]">
                  2
                </span>
                <p>Tekan butang menu tiga titik <strong>(⋮)</strong> di bahagian atas kanan skrin Chrome.</p>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-emerald-100 text-[#588517] font-bold flex items-center justify-center shrink-0 text-[11px]">
                  3
                </span>
                <p>Pilih <strong>"Pasang Aplikasi"</strong> (Install App) atau <strong>"Tambah ke Skrin Utama"</strong>.</p>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-emerald-100 text-[#588517] font-bold flex items-center justify-center shrink-0 text-[11px]">
                  4
                </span>
                <p>Ikon <strong>Halagel Kehadiran</strong> akan terpapar di skrin telefon anda seperti aplikasi natif.</p>
              </div>
            </div>

            <button
              onClick={() => setShowInstallGuide(false)}
              className="w-full py-2.5 rounded-xl bg-[#588517] hover:bg-[#4E7812] text-white font-bold text-xs transition cursor-pointer"
            >
              Faham, Tutup Panduan
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
