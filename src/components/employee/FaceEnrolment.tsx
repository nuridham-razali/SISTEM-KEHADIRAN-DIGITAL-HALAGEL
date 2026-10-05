import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { extractBiometricVector } from '../../utils/faceBiometrics';
import { ScanFace, ArrowLeft, CheckCircle, Shield, Camera, Sparkles, RefreshCw, AlertCircle } from 'lucide-react';

interface FaceEnrolmentProps {
  onBack: () => void;
  onSuccess: () => void;
}

export const FaceEnrolment: React.FC<FaceEnrolmentProps> = ({ onBack, onSuccess }) => {
  const { user, refreshUser } = useAuth();
  const [consentChecked, setConsentChecked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [enrolledPhoto, setEnrolledPhoto] = useState<string | null>(null);
  const [scanStepText, setScanStepText] = useState('Posisikan wajah anda dalam bingkai bujur');
  const [error, setError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startCam = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraActive(true);
      }
    } catch (err) {
      console.warn('Akses kamera tidak dibenarkan atau peranti tiada kamera');
      setCameraActive(false);
      setError('Kamera tidak aktif. Sila benarkan akses kamera pelayar untuk pendaftaran wajah sebenar.');
    }
  };

  useEffect(() => {
    startCam();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const handleEnrol = async () => {
    if (!consentChecked) {
      setError('Sila tandakan persetujuan biometrik PDPA terlebih dahulu.');
      return;
    }
    if (!cameraActive || !videoRef.current) {
      setError('Sila aktifkan kamera peranti anda terlebih dahulu.');
      return;
    }

    setError(null);
    setLoading(true);
    setScanStepText('Mengesan kehadiran & titik kontur wajah sebenar (128 landmark)...');

    // Run real computer vision feature extraction on the current video frame
    const detection = extractBiometricVector(videoRef.current);
    if (!detection.detected || !detection.vector) {
      setLoading(false);
      setError(detection.message || 'Wajah tidak dapat dikesan. Sila pastikan pencahayaan cukup dan wajah anda menghadap kamera.');
      return;
    }

    // Capture photo snapshot
    let capturedDataUrl: string | undefined = undefined;
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth || 480;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        capturedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
        setEnrolledPhoto(capturedDataUrl);
      }
    }

    setTimeout(async () => {
      setScanStepText('Menyimpan templat biometrik wajah berketepatan tinggi...');
      setTimeout(async () => {
        try {
          await api.enrolFace({
            employeeId: user?.employeeId || 'EMP',
            biometricVector: detection.vector!,
            consentVersion: 'v2026.1_MY_PDPA',
            photoDataUrl: capturedDataUrl,
          });

          await refreshUser();
          setLoading(false);
          setSuccess(true);
        } catch (err: any) {
          setLoading(false);
          setError(err.message || 'Pendaftaran gagal. Sila cuba lagi.');
        }
      }, 700);
    }, 700);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col p-4 sm:p-6 max-w-xl mx-auto font-sans">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={onBack}
          className="p-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-xs transition cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl font-black text-slate-900">Pendaftaran Wajah Biometrik</h1>
          <p className="text-xs text-slate-500">Halagel (M) Sdn Bhd • Pengecaman Wajah Kehadiran</p>
        </div>
      </div>

      {/* Hidden Canvas for Frame Capture */}
      <canvas ref={canvasRef} className="hidden" />

      {success ? (
        <div className="bg-white border border-emerald-200 rounded-3xl p-8 text-center space-y-5 shadow-xl animate-in fade-in zoom-in-95 duration-200">
          <div className="relative w-24 h-24 mx-auto">
            {enrolledPhoto ? (
              <img
                src={enrolledPhoto}
                alt="Wajah Berdaftar"
                className="w-24 h-24 rounded-full object-cover border-4 border-emerald-500 shadow-lg shadow-emerald-500/25"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-emerald-50 border-2 border-emerald-500 flex items-center justify-center text-emerald-600">
                <CheckCircle className="w-12 h-12" />
              </div>
            )}
            <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center border-2 border-white shadow-xs">
              <CheckCircle className="w-5 h-5" />
            </div>
          </div>

          <div>
            <h3 className="text-xl font-black text-slate-900">Wajah Anda Berjaya Didaftarkan!</h3>
            <p className="text-xs text-emerald-700 font-bold mt-1">
              Profil Biometrik: {user?.name} ({user?.employeeId})
            </p>
            <p className="text-xs text-slate-600 max-w-sm mx-auto mt-2 leading-relaxed">
              Mulai sekarang, anda boleh menggunakan <strong>Pengecaman Wajah</strong> secara automatik semasa merakam jam masuk dan keluar kerja.
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-1.5 text-left">
            <div className="flex justify-between">
              <span className="text-slate-500">Status Pendaftaran:</span>
              <span className="text-emerald-700 font-bold">✓ Aktif & Disahkan</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Pematuhan:</span>
              <span className="text-slate-800 font-medium">PDPA 2010 (Vektor 128-bit Disulitkan)</span>
            </div>
          </div>

          <button
            onClick={onSuccess}
            className="w-full py-3.5 px-4 rounded-xl bg-[#5b7e22] hover:bg-[#4d6b1d] text-white font-bold text-sm shadow-md shadow-[#5b7e22]/25 transition cursor-pointer"
          >
            Selesai & Ke Papan Pemuka
          </button>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 space-y-4 shadow-xl">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
              {error}
            </div>
          )}

          {/* Live Camera Box with Biometric HUD */}
          <div className="relative w-full h-72 bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 flex items-center justify-center">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover ${cameraActive ? 'block' : 'hidden'}`}
            />

            {!cameraActive && (
              <div className="flex flex-col items-center text-slate-400 p-4 text-center">
                <div className="w-16 h-16 rounded-full bg-emerald-500/10 border-2 border-dashed border-emerald-500/40 flex items-center justify-center mb-2">
                  <Camera className="w-8 h-8 text-emerald-400" />
                </div>
                <p className="text-xs text-white font-medium">Kamera Belum Diaktifkan</p>
                <p className="text-[11px] text-slate-400 mt-1 mb-3">Sila hidupkan kamera untuk mengimbas wajah sebenar</p>
                <button
                  type="button"
                  onClick={startCam}
                  className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Aktifkan Kamera</span>
                </button>
              </div>
            )}

            {/* Biometric Face Scanner Oval & HUD */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="relative w-44 h-56 border-2 border-emerald-400 rounded-[50%] border-dashed shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                {/* Scanning laser beam animation */}
                <div className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_10px_#10B981] animate-bounce opacity-80" />
              </div>
            </div>

            {/* Live Instruction Pill */}
            <div className="absolute bottom-3 left-3 right-3 bg-slate-950/85 backdrop-blur-md px-3 py-2 rounded-xl text-center text-xs text-white border border-slate-700/80 shadow-lg">
              <div className="flex items-center justify-center gap-1.5 font-medium text-emerald-300">
                <Sparkles className="w-3.5 h-3.5" />
                <span>{scanStepText}</span>
              </div>
            </div>
          </div>

          {/* Privacy Consent Box */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-start gap-3">
            <input
              type="checkbox"
              id="consent"
              checked={consentChecked}
              onChange={(e) => setConsentChecked(e.target.checked)}
              className="mt-1 w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer accent-emerald-600"
            />
            <label htmlFor="consent" className="text-xs text-slate-700 leading-relaxed cursor-pointer select-none">
              Saya bersetuju memberi kebenaran kepada <strong>Halagel (M) Sdn Bhd</strong> untuk memproses templat matematik wajah saya semata-mata bagi tujuan rekod kehadiran kerja, mematuhi Akta Perlindungan Data Peribadi (PDPA 2010).
            </label>
          </div>

          <button
            onClick={handleEnrol}
            disabled={loading || !consentChecked}
            className="w-full py-3.5 px-4 rounded-xl bg-[#5b7e22] hover:bg-[#4d6b1d] text-white font-extrabold text-sm flex items-center justify-center gap-2 transition disabled:opacity-50 cursor-pointer shadow-md shadow-[#5b7e22]/25"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Menjana Templat Biometrik...</span>
              </>
            ) : (
              <>
                <ScanFace className="w-5 h-5" />
                <span>Daftar Wajah Sekarang</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};
