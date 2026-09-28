import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Fingerprint, Eye, EyeOff, Mail, Lock, ArrowRight, AlertCircle, Building2, X, Smartphone, CheckCircle2 } from 'lucide-react';

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

  return (
    <div className="min-h-screen bg-[#0F172A] text-slate-100 flex flex-col justify-center items-center px-4 py-8 relative">
      <div className="w-full max-w-md bg-[#182234] border border-slate-700/80 rounded-3xl p-6 sm:p-8 shadow-2xl relative backdrop-blur-sm">
        {/* Halagel biometric logo */}
        <div className="flex flex-col items-center mb-6">
          <div className="w-18 h-18 rounded-full bg-emerald-500/15 border-2 border-emerald-500/40 flex items-center justify-center shadow-[0_0_25px_rgba(16,185,129,0.3)] mb-3">
            <Fingerprint className="w-10 h-10 text-emerald-400" />
          </div>

          <div className="px-3.5 py-1 rounded-full bg-slate-800 border border-emerald-500/30 text-emerald-400 text-xs font-bold tracking-wide mb-2">
            Halagel (M) Sdn Bhd
          </div>

          <h1 className="text-2xl font-bold text-white tracking-tight text-center">
            Sistem Kehadiran Digital
          </h1>
          <p className="text-slate-400 text-xs text-center mt-1">
            GPS Geofens, Pengesahan Wajah & Papan Pemuka Pekerja
          </p>
        </div>

        {/* Error notification */}
        {error && (
          <div className="mb-5 p-3.5 rounded-xl bg-red-500/15 border border-red-500/60 flex items-center gap-3 text-red-200 text-xs">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
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
                className="w-full bg-[#0F172A] border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
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
                className="w-full bg-[#0F172A] border border-slate-700 rounded-xl pl-10 pr-10 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-white"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 transition disabled:opacity-50 cursor-pointer shadow-lg shadow-emerald-500/20"
          >
            {isLoading ? (
              <span className="inline-block w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>Log Masuk Kehadiran</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Install on Android Phone Card */}
        <div className="mt-4 p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="text-base">📱</span>
            <div>
              <div className="font-bold text-emerald-300 text-[11px]">Pasang Pada Telefon Android</div>
              <div className="text-[10px] text-slate-400">Buka di Chrome & pilih 'Pasang Aplikasi'</div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowInstallGuide(true)}
            className="px-2.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-[10px] transition cursor-pointer"
          >
            Panduan Pasang
          </button>
        </div>
      </div>

      {/* Android Install Guide Modal */}
      {showInstallGuide && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#182234] border border-slate-700 rounded-3xl p-6 max-w-sm w-full shadow-2xl relative space-y-4">
            <div className="flex items-center justify-between border-b border-slate-700/80 pb-3">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <Smartphone className="w-4 h-4 text-emerald-400" />
                <span>Panduan Pasang di Android</span>
              </div>
              <button
                onClick={() => setShowInstallGuide(false)}
                className="p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-300">
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center shrink-0 text-[11px]">
                  1
                </span>
                <p>Buka pautan aplikasi di pelayar <strong>Google Chrome</strong> telefon anda.</p>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center shrink-0 text-[11px]">
                  2
                </span>
                <p>Tekan butang menu tiga titik <strong>(⋮)</strong> di bahagian atas kanan skrin Chrome.</p>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center shrink-0 text-[11px]">
                  3
                </span>
                <p>Pilih <strong>"Pasang Aplikasi"</strong> (Install App) atau <strong>"Tambah ke Skrin Utama"</strong> (Add to Home screen).</p>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center shrink-0 text-[11px]">
                  4
                </span>
                <p>Ikon <strong>Halagel Kehadiran</strong> akan terpapar di skrin telefon anda seperti aplikasi natif.</p>
              </div>
            </div>

            <button
              onClick={() => setShowInstallGuide(false)}
              className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs transition"
            >
              Faham, Tutup Panduan
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
