import React, { useState } from 'react';
import {
  X,
  Smartphone,
  Apple,
  Download,
  CheckCircle2,
  Share,
  PlusSquare,
  ExternalLink,
  Code,
  Package,
  Layers,
  Sparkles,
} from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';

interface PWAInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'android' | 'ios' | 'native';
}

export const PWAInstallModal: React.FC<PWAInstallModalProps> = ({
  isOpen,
  onClose,
  defaultTab,
}) => {
  const { isInstallable, isInstalled, isIOS, isAndroid, install } = usePWAInstall();
  const [activeTab, setActiveTab] = useState<'android' | 'ios' | 'native'>(
    defaultTab || (isIOS ? 'ios' : 'android')
  );
  const [installing, setInstalling] = useState(false);

  if (!isOpen) return null;

  const handleNativeInstall = async () => {
    setInstalling(true);
    const success = await install();
    setInstalling(false);
    if (success) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 max-w-lg w-full shadow-2xl relative space-y-4 text-slate-900 animate-in fade-in zoom-in-95 duration-150 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 shrink-0">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-extrabold text-slate-900">
                Pemasangan Aplikasi Natif (Android & iOS)
              </h3>
              <p className="text-[11px] text-slate-500">
                Halagel Kehadiran • Pakej APK, IPA & Pasang Terus
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-100 text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Platform Selector Tabs */}
        <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-2xl text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('android')}
            className={`py-2 px-2.5 rounded-xl font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
              activeTab === 'android'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
            <span>Android (APK)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('ios')}
            className={`py-2 px-2.5 rounded-xl font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
              activeTab === 'ios'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Apple className="w-3.5 h-3.5 text-slate-900" />
            <span>iPhone (iOS)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('native')}
            className={`py-2 px-2.5 rounded-xl font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
              activeTab === 'native'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Code className="w-3.5 h-3.5 text-blue-600" />
            <span>Capacitor CLI</span>
          </button>
        </div>

        {/* Status: Already Installed Notification */}
        {isInstalled && (
          <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center gap-2.5 text-xs text-emerald-800 font-semibold">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Aplikasi sedang aktif berjalan sebagai aplikasi skrin penuh (Standalone App)!</span>
          </div>
        )}

        {/* TAB 1: ANDROID (.APK & DIRECT INSTALL) */}
        {activeTab === 'android' && (
          <div className="space-y-3.5">
            {/* Direct One-Click Install Button if supported by Chromium */}
            {isInstallable && (
              <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-300 text-center space-y-2">
                <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-emerald-950">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  <span>Sedia Untuk Pasang Ke Telefon Android</span>
                </div>
                <button
                  type="button"
                  onClick={handleNativeInstall}
                  disabled={installing}
                  className="w-full py-2.5 px-4 rounded-xl bg-[#588517] hover:bg-[#476c12] text-white font-extrabold text-xs shadow-md transition active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>{installing ? 'Memasang Aplikasi...' : 'Pasang Terus (1-Klik APK WebAPK)'}</span>
                </button>
              </div>
            )}

            {/* Option A: Quick Standalone Install on Chrome */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-[10px]">
                  A
                </span>
                <strong className="text-xs text-slate-900">
                  Pasang Terus Pada Android (Google Chrome):
                </strong>
              </div>
              <ol className="list-decimal list-inside text-xs text-slate-600 space-y-1 pl-1">
                <li>Buka pautan ini di aplikasi <strong>Google Chrome</strong> telefon Android anda.</li>
                <li>Tekan menu tiga titik <strong>(⋮)</strong> di bahagian atas kanan skrin.</li>
                <li>Pilih <strong>"Pasang Aplikasi" (*Install App*)</strong>.</li>
                <li>Ikon Halagel akan dipasang terus seperti fail APK biasa.</li>
              </ol>
            </div>

            {/* Option B: Download Standalone .APK via PWABuilder */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-[10px]">
                    B
                  </span>
                  <strong className="text-xs text-slate-900">
                    Jana Fail .APK Pakej Sendiri (PWABuilder / TWA):
                  </strong>
                </div>
              </div>
              <p className="text-xs text-slate-600">
                Anda boleh menjana fail <code>.apk</code> yang boleh dimuat turun terus oleh staf atau dimuat naik ke Google Play Store menggunakan alat rasmi percuma Microsoft PWABuilder:
              </p>
              <a
                href="https://www.pwabuilder.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3 py-1.5 rounded-xl transition"
              >
                <span>Buka PWABuilder (Jana Fail .APK)</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        )}

        {/* TAB 2: IOS (IPHONE / IPAD & IPA) */}
        {activeTab === 'ios' && (
          <div className="space-y-3.5">
            <div className="p-3 rounded-2xl bg-blue-50 border border-blue-200 text-xs text-blue-900 space-y-1">
              <strong className="block font-bold">Pemasangan di Apple iPhone & iPad (iOS)</strong>
              <p className="text-[11px] text-blue-800 leading-relaxed">
                Di peranti Apple iOS, aplikasi boleh dipasang tanpa Safari bar melalui ciri <em>Add to Home Screen</em> atau dibina sebagai fail <code>.ipa</code> untuk diedarkan melalui Apple TestFlight.
              </p>
            </div>

            {/* Option A: Safari Add to Home Screen (Official Apple WebApp) */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-slate-900 text-white font-bold flex items-center justify-center text-[10px]">
                  A
                </span>
                <strong className="text-xs text-slate-900">
                  Pasang Terus Pada iPhone (Pelayar Safari):
                </strong>
              </div>
              <div className="space-y-2 text-xs text-slate-600 pl-1">
                <div className="flex items-start gap-2">
                  <span className="font-bold text-slate-900">1.</span>
                  <span>Buka pautan aplikasi di pelayar <strong>Safari</strong> rasmi.</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-bold text-slate-900">2.</span>
                  <span>Tekan butang <strong className="text-blue-600">Kongsi (Share ⎋)</strong> di bahagian bawah skrin.</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-bold text-slate-900">3.</span>
                  <span>Skrol dan pilih <strong className="text-slate-900">"Add to Home Screen" (Tambah ke Skrin Utama ⊞)</strong>.</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-bold text-slate-900">4.</span>
                  <span>Tekan <strong className="text-slate-900">"Add"</strong>. Ikon Halagel Kehadiran kini berada di skrin utama seperti app App Store!</span>
                </div>
              </div>
            </div>

            {/* Option B: Xcode & TestFlight (.IPA) */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-[10px]">
                  B
                </span>
                <strong className="text-xs text-slate-900">
                  Pakej Natif Xcode (.IPA) untuk TestFlight & App Store:
                </strong>
              </div>
              <p className="text-xs text-slate-600">
                Projek natif Xcode telah dijana di direktori <code>ios/App/App.xcodeproj</code> lengkap dengan kebenaran kamera dan GPS di <code>Info.plist</code> untuk dibina menjadi fail <code>.ipa</code> melalui Mac Xcode.
              </p>
            </div>
          </div>
        )}

        {/* TAB 3: CAPACITOR CLI & SOURCE CODE */}
        {activeTab === 'native' && (
          <div className="space-y-3">
            <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 space-y-1">
              <strong className="block font-bold">Projek Natif Penuh Telah Disediakan</strong>
              <p className="text-[11px] text-emerald-800 leading-relaxed">
                Aplikasi ini telah dipautkan dengan enjin natif <strong>Capacitor</strong> rasmi. Kod sumber kini mempunyai folder natif:
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-slate-900">
                  <Smartphone className="w-4 h-4 text-emerald-600" />
                  <span>Folder <code>android/</code></span>
                </div>
                <p className="text-[11px] text-slate-600">
                  Projek Android Studio lengkap dengan Gradle, <code>AndroidManifest.xml</code> (Kamera & GPS), serta aset natif.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-slate-900">
                  <Apple className="w-4 h-4 text-slate-800" />
                  <span>Folder <code>ios/</code></span>
                </div>
                <p className="text-[11px] text-slate-600">
                  Projek Apple Xcode lengkap dengan <code>App.xcodeproj</code>, <code>Info.plist</code>, dan Swift bridging.
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-900 text-slate-100 space-y-2 font-mono text-[11px]">
              <div className="text-slate-400 font-sans text-xs font-bold">Perintah Membina Aplikasi Natif:</div>
              <div className="text-emerald-400"># 1. Bina kod web & segerakkan ke Android/iOS</div>
              <div className="bg-slate-800 p-2 rounded-lg text-white">npm run cap:build:android</div>
              <div className="bg-slate-800 p-2 rounded-lg text-white">npm run cap:build:ios</div>
              <div className="text-emerald-400 pt-1"># 2. Buka terus di Android Studio / Xcode</div>
              <div className="bg-slate-800 p-2 rounded-lg text-white">npm run cap:open:android</div>
              <div className="bg-slate-800 p-2 rounded-lg text-white">npm run cap:open:ios</div>
            </div>
          </div>
        )}

        {/* Action Button */}
        <button
          type="button"
          onClick={onClose}
          className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer"
        >
          Tutup
        </button>
      </div>
    </div>
  );
};
