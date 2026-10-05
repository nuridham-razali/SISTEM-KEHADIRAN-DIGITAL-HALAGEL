import React, { useState } from 'react';
import { MapPin, Navigation, ShieldCheck, AlertCircle, CheckCircle2, Sparkles, RefreshCw } from 'lucide-react';

interface LocationPermissionPromptProps {
  isOpen: boolean;
  onClose: () => void;
  onLocationObtained: (pos: { latitude: number; longitude: number; accuracy: number }) => void;
  officeName?: string;
  radiusMeters?: number;
}

export const LocationPermissionPrompt: React.FC<LocationPermissionPromptProps> = ({
  isOpen,
  onClose,
  onLocationObtained,
  officeName = 'Ibu Pejabat & Kilang Halagel',
  radiusMeters = 100,
}) => {
  const [requesting, setRequesting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleRequestPreciseLocation = () => {
    setRequesting(true);
    setErrorMsg(null);

    if (!('geolocation' in navigator)) {
      setErrorMsg('Pelayar ini tidak menyokong fungsi Geolocation GPS.');
      setRequesting(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setRequesting(false);
        const coords = {
          latitude: parseFloat(position.coords.latitude.toFixed(6)),
          longitude: parseFloat(position.coords.longitude.toFixed(6)),
          accuracy: Math.round(position.coords.accuracy || 10),
        };
        onLocationObtained(coords);
        onClose();
      },
      (error) => {
        setRequesting(false);
        if (error.code === error.PERMISSION_DENIED) {
          setErrorMsg(
            'Kebenaran lokasi telah ditolak. Sila benarkan akses lokasi pada tetapan pelayar anda (ikon mangga/kunci di bar alamat).'
          );
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          setErrorMsg('Isyarat GPS tidak dapat dikesan. Sila hidupkan GPS/Lokasi peranti anda.');
        } else if (error.code === error.TIMEOUT) {
          setErrorMsg('Masa pengesanan GPS tamat. Sila cuba sekali lagi di kawasan lapang.');
        } else {
          setErrorMsg('Ralat semasa mengesan lokasi tepat: ' + error.message);
        }
      },
      {
        enableHighAccuracy: true, // WAJIB untuk lokasi tepat (Precise Location)
        timeout: 12000,
        maximumAge: 0,
      }
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-md w-full shadow-2xl relative overflow-hidden text-slate-900">
        {/* Soft ambient background accent */}
        <div className="absolute -top-16 -right-16 w-36 h-36 bg-emerald-100 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-36 h-36 bg-blue-100 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center text-center">
          {/* Animated Pulsing Location Icon */}
          <div className="relative mb-4">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shadow-sm">
              <Navigation className="w-8 h-8 animate-pulse" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold border-2 border-white shadow-xs">
              GPS
            </div>
          </div>

          <h3 className="text-lg font-black text-slate-900 tracking-tight">
            Kebenaran Lokasi Tepat Diperlukan
          </h3>
          <p className="text-xs text-emerald-700 font-bold mt-0.5">
            Precise Location Verification • Geofens Kehadiran
          </p>

          <p className="text-xs text-slate-600 mt-3 leading-relaxed">
            Untuk mengesahkan kehadiran anda di <strong>{officeName}</strong> (Zon radius {radiusMeters}m), sistem memerlukan kebenaran akses <strong>Lokasi Tepat (GPS Berketepatan Tinggi)</strong>.
          </p>

          {/* Privacy Guarantee Box */}
          <div className="w-full my-4 p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-left flex items-start gap-2.5 text-xs">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="text-[11px] font-bold text-slate-900">Jaminan Privasi Staf</div>
              <div className="text-[10px] text-slate-500 leading-snug">
                Lokasi GPS hanya disemak semasa anda merakam jam masuk dan jam keluar sahaja. Tiada penjejakan latar belakang berterusan.
              </div>
            </div>
          </div>

          {/* Error Message if Denied */}
          {errorMsg && (
            <div className="w-full mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-left flex items-start gap-2 text-xs text-red-700">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div className="text-[11px] leading-snug">{errorMsg}</div>
            </div>
          )}

          {/* Primary Action Button */}
          <button
            type="button"
            onClick={handleRequestPreciseLocation}
            disabled={requesting}
            className="w-full py-3.5 px-4 rounded-xl bg-[#588517] hover:bg-[#4c7512] text-white font-extrabold text-xs shadow-md transition active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
          >
            {requesting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-white" />
                <span>Menghubungi Satelit GPS...</span>
              </>
            ) : (
              <>
                <MapPin className="w-4 h-4 text-white" />
                <span>Benarkan & Aktifkan Lokasi Tepat</span>
              </>
            )}
          </button>

          {/* Close button */}
          <div className="mt-3 pt-3 border-t border-slate-100 w-full flex items-center justify-end">
            <button
              type="button"
              onClick={onClose}
              className="text-xs text-slate-500 hover:text-slate-800 transition px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 cursor-pointer font-semibold"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
