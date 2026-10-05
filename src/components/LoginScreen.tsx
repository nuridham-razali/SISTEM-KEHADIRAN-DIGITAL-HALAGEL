import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { HALAGEL_LOGO } from '../assets/logo';
import { getHalagelBackground } from '../assets/background';
import { Eye, EyeOff, User as UserIcon, Lock, ArrowRight, AlertCircle, Smartphone, Apple, Download } from 'lucide-react';
import { PWAInstallModal } from './common/PWAInstallModal';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const LoginScreen: React.FC = () => {
  const { login, isLoading, error, clearError } = useAuth();
  const { isInstalled, isIOS } = usePWAInstall();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [installTab, setInstallTab] = useState<'android' | 'ios'>(isIOS ? 'ios' : 'android');
  const [bgImage, setBgImage] = useState<string>(getHalagelBackground());

  useEffect(() => {
    setBgImage(getHalagelBackground());
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier || !password) return;
    await login(identifier, password);
  };

  return (
    <div
      className="min-h-screen text-slate-900 flex flex-col justify-center items-center px-4 py-8 relative bg-cover bg-center bg-no-repeat transition-all duration-300"
      style={{
        backgroundImage: `url("${bgImage}")`,
        backgroundColor: '#F8FAFC',
      }}
    >
      {/* Light frosted backdrop overlay to ensure crisp readability */}
      <div className="absolute inset-0 bg-slate-100/60 backdrop-blur-[2px] pointer-events-none" />

      {/* Pure White Login Card as requested */}
      <div className="w-full max-w-md bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-2xl relative z-10 text-slate-900">
        {/* Halagel official logo */}
        <div className="flex flex-col items-center mb-6">
          <img
            src={HALAGEL_LOGO}
            alt="Halagel Logo"
            className="max-h-24 w-auto object-contain mb-3"
          />

          <div className="px-3.5 py-1 rounded-full bg-emerald-50 border border-emerald-500/40 text-emerald-700 text-xs font-bold tracking-wide mb-2">
            Halagel (M) Sdn Bhd
          </div>

          <h1 className="text-2xl font-bold text-slate-900 tracking-tight text-center">
            Sistem Kehadiran Digital
          </h1>
          <p className="text-slate-500 text-xs text-center mt-1">
            GPS Geofens, Pengesahan Wajah & Papan Pemuka Pekerja
          </p>
        </div>

        {/* Error notification */}
        {error && (
          <div className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-300 flex items-center gap-3 text-red-700 text-xs">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              ID Staf
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <UserIcon className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                required
                placeholder="cth: EMP101 atau ADMIN"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 focus:bg-white transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
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
                className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-10 pr-10 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 focus:bg-white transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-700 cursor-pointer"
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

        {/* Install on Android & iOS Native App Card */}
        {!isInstalled && (
          <div className="mt-4 p-3.5 rounded-2xl bg-emerald-50/90 border border-emerald-200/90 text-xs space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-base">📲</span>
                <div>
                  <div className="font-bold text-slate-900 text-xs">Pasang Sebagai Aplikasi Telefon</div>
                  <div className="text-[10px] text-slate-600">Sokongan penuh untuk Android & Apple iOS</div>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setInstallTab('android');
                  setShowInstallModal(true);
                }}
                className="flex-1 py-1.5 px-2.5 rounded-xl bg-[#588517] hover:bg-[#476c12] text-white font-bold text-[11px] flex items-center justify-center gap-1.5 transition shadow-xs cursor-pointer"
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Pasang Android</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setInstallTab('ios');
                  setShowInstallModal(true);
                }}
                className="flex-1 py-1.5 px-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-[11px] flex items-center justify-center gap-1.5 transition shadow-xs cursor-pointer"
              >
                <Apple className="w-3.5 h-3.5" />
                <span>Pasang iOS</span>
              </button>
            </div>
          </div>
        )}

        {/* Developed by */}
        <div className="mt-5 text-center text-xs text-slate-500">
          <div className="text-[11px] font-medium text-slate-500">
            Developed by <span className="font-semibold text-slate-800">Muhammad Nur Idham Bin Razali</span>
          </div>
        </div>
      </div>

      {/* Unified PWA Install Modal (Android & iOS) */}
      {showInstallModal && (
        <PWAInstallModal
          isOpen={showInstallModal}
          onClose={() => setShowInstallModal(false)}
          defaultTab={installTab}
        />
      )}
    </div>
  );
};
