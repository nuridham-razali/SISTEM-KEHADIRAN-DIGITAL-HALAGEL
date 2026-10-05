import React, { useState } from 'react';
import { Download, Smartphone, Apple } from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { PWAInstallModal } from './PWAInstallModal';

interface PWAInstallButtonProps {
  variant?: 'compact' | 'full' | 'pill';
  className?: string;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  variant = 'compact',
  className = '',
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showModal, setShowModal] = useState(false);
  const [defaultTab, setDefaultTab] = useState<'android' | 'ios'>(isIOS ? 'ios' : 'android');

  // If already running inside installed standalone PWA app, hide button
  if (isInstalled) {
    return null;
  }

  const handleClick = async () => {
    // If Android Chrome prompt is ready, trigger it directly or open modal
    if (isInstallable) {
      const installed = await install();
      if (!installed) {
        setDefaultTab('android');
        setShowModal(true);
      }
    } else {
      setDefaultTab(isIOS ? 'ios' : 'android');
      setShowModal(true);
    }
  };

  if (variant === 'pill') {
    return (
      <>
        <button
          type="button"
          onClick={handleClick}
          title="Pasang Aplikasi Kehadiran di Telefon Android / iPhone (APK & Native App)"
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold transition shadow-xs cursor-pointer ${className}`}
        >
          <Download className="w-3.5 h-3.5 text-emerald-700" />
          <span>Pasang App (APK / iOS)</span>
        </button>

        {showModal && (
          <PWAInstallModal
            isOpen={showModal}
            onClose={() => setShowModal(false)}
            defaultTab={defaultTab}
          />
        )}
      </>
    );
  }

  if (variant === 'full') {
    return (
      <>
        <div className={`p-3.5 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3 ${className}`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 shrink-0">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                <span>Pasang Aplikasi Pada Telefon</span>
                <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                  Android & iOS
                </span>
              </div>
              <div className="text-[11px] text-slate-500">
                Gunakan seperti aplikasi natif tanpa bar pelayar web & akses pantas dari Skrin Utama.
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => {
                setDefaultTab('android');
                setShowModal(true);
              }}
              className="flex-1 sm:flex-initial px-3 py-2 rounded-xl bg-[#588517] hover:bg-[#476c12] text-white text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Android</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setDefaultTab('ios');
                setShowModal(true);
              }}
              className="flex-1 sm:flex-initial px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Apple className="w-3.5 h-3.5" />
              <span>iPhone/iOS</span>
            </button>
          </div>
        </div>

        {showModal && (
          <PWAInstallModal
            isOpen={showModal}
            onClose={() => setShowModal(false)}
            defaultTab={defaultTab}
          />
        )}
      </>
    );
  }

  // Compact variant
  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className={`px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] transition cursor-pointer flex items-center gap-1 shadow-xs ${className}`}
      >
        <Download className="w-3 h-3" />
        <span>Pasang App</span>
      </button>

      {showModal && (
        <PWAInstallModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          defaultTab={defaultTab}
        />
      )}
    </>
  );
};
