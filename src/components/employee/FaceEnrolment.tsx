import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import {
  extractBiometricVector,
  detectHeadPose,
  HeadPose,
  saveMultiAngleProfile,
} from '../../utils/faceBiometrics';
import {
  ScanFace,
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  Shield,
  Camera,
  Sparkles,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';

interface FaceEnrolmentProps {
  onBack: () => void;
  onSuccess: () => void;
}

export const FaceEnrolment: React.FC<FaceEnrolmentProps> = ({ onBack, onSuccess }) => {
  const { user, refreshUser } = useAuth();
  const [consentChecked, setConsentChecked] = useState(true);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [enrolledPhoto, setEnrolledPhoto] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Multi-Angle Registration States
  const [enrolAngle, setEnrolAngle] = useState<'CENTER' | 'LEFT' | 'RIGHT' | 'SAVING'>('CENTER');
  const [centerVector, setCenterVector] = useState<number[] | null>(null);
  const [leftVector, setLeftVector] = useState<number[] | null>(null);
  const [rightVector, setRightVector] = useState<number[] | null>(null);
  const [angleProgress, setAngleProgress] = useState<number>(0);
  const [_currentPose, setCurrentPose] = useState<HeadPose>('CENTER');
  const [_currentYaw, setCurrentYaw] = useState<number>(0);

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
      console.warn('Akses kamera tidak dibenarkan atau peranti tiada kamera:', err);
      setCameraActive(false);
      setError('Kamera tidak aktif. Sila benarkan akses kamera pelayar untuk pendaftaran wajah.');
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

  // Continuous auto-tracking for 3 angles (Center -> Left -> Right)
  useEffect(() => {
    if (!cameraActive || loading || success) return;

    const interval = setInterval(() => {
      if (!videoRef.current || videoRef.current.readyState < 2) return;

      const pose = detectHeadPose(videoRef.current);
      setCurrentPose(pose.headPose);
      setCurrentYaw(pose.yawOffset);

      if (!pose.detected) {
        setAngleProgress((prev) => Math.max(0, prev - 10));
        return;
      }

      if (enrolAngle === 'CENTER') {
        if (pose.headPose === 'CENTER') {
          setAngleProgress((prev) => {
            const next = prev + 34;
            if (next >= 100) {
              const vecRes = extractBiometricVector(videoRef.current!);
              if (vecRes.vector) {
                setCenterVector(vecRes.vector);
                // Capture snapshot photo
                if (canvasRef.current && videoRef.current) {
                  const cvs = canvasRef.current;
                  const vid = videoRef.current;
                  cvs.width = vid.videoWidth || 480;
                  cvs.height = vid.videoHeight || 480;
                  const ctx = cvs.getContext('2d');
                  if (ctx) {
                    ctx.drawImage(vid, 0, 0, cvs.width, cvs.height);
                    setEnrolledPhoto(cvs.toDataURL('image/jpeg', 0.85));
                  }
                }
                setEnrolAngle('LEFT');
                return 0;
              }
            }
            return next;
          });
        } else {
          setAngleProgress((prev) => Math.max(0, prev - 10));
        }
      } else if (enrolAngle === 'LEFT') {
        if (pose.headPose === 'LOOK_LEFT' || pose.yawOffset < -0.065) {
          setAngleProgress((prev) => {
            const next = prev + 34;
            if (next >= 100) {
              const vecRes = extractBiometricVector(videoRef.current!);
              if (vecRes.vector) {
                setLeftVector(vecRes.vector);
                setEnrolAngle('RIGHT');
                return 0;
              }
            }
            return next;
          });
        } else {
          setAngleProgress((prev) => Math.max(0, prev - 10));
        }
      } else if (enrolAngle === 'RIGHT') {
        if (pose.headPose === 'LOOK_RIGHT' || pose.yawOffset > 0.065) {
          setAngleProgress((prev) => {
            const next = prev + 34;
            if (next >= 100) {
              const vecRes = extractBiometricVector(videoRef.current!);
              if (vecRes.vector) {
                setRightVector(vecRes.vector);
                setEnrolAngle('SAVING');
                finishEnrolment(centerVector, leftVector, vecRes.vector);
                return 100;
              }
            }
            return next;
          });
        } else {
          setAngleProgress((prev) => Math.max(0, prev - 10));
        }
      }
    }, 110);

    return () => clearInterval(interval);
  }, [cameraActive, enrolAngle, centerVector, leftVector, loading, success]);

  // Manual angle confirmation button
  const handleManualAngleCapture = () => {
    if (!videoRef.current) return;
    const vecRes = extractBiometricVector(videoRef.current);
    if (!vecRes.detected || !vecRes.vector) {
      setError(vecRes.message || 'Wajah tidak dikesan. Sila pastikan pencahayaan cukup.');
      return;
    }
    setError(null);

    if (enrolAngle === 'CENTER') {
      setCenterVector(vecRes.vector);
      if (canvasRef.current && videoRef.current) {
        const cvs = canvasRef.current;
        const vid = videoRef.current;
        cvs.width = vid.videoWidth || 480;
        cvs.height = vid.videoHeight || 480;
        const ctx = cvs.getContext('2d');
        if (ctx) {
          ctx.drawImage(vid, 0, 0, cvs.width, cvs.height);
          setEnrolledPhoto(cvs.toDataURL('image/jpeg', 0.85));
        }
      }
      setEnrolAngle('LEFT');
      setAngleProgress(0);
    } else if (enrolAngle === 'LEFT') {
      setLeftVector(vecRes.vector);
      setEnrolAngle('RIGHT');
      setAngleProgress(0);
    } else if (enrolAngle === 'RIGHT') {
      setRightVector(vecRes.vector);
      setEnrolAngle('SAVING');
      finishEnrolment(centerVector, leftVector, vecRes.vector);
    }
  };

  const handleResetEnrol = () => {
    setEnrolAngle('CENTER');
    setCenterVector(null);
    setLeftVector(null);
    setRightVector(null);
    setAngleProgress(0);
    setError(null);
    setLoading(false);
  };

  // Finalize multi-angle enrolment
  const finishEnrolment = async (
    cVec: number[] | null,
    lVec: number[] | null,
    rVec: number[] | null
  ) => {
    if (!consentChecked) {
      setError('Sila tandakan persetujuan biometrik PDPA terlebih dahulu.');
      setEnrolAngle('CENTER');
      return;
    }

    const effectiveCenter = cVec || (videoRef.current ? extractBiometricVector(videoRef.current).vector : null);
    if (!effectiveCenter) {
      setError('Gagal mengekstrak templat wajah. Sila tekan Mula Semula.');
      setEnrolAngle('CENTER');
      return;
    }

    setLoading(true);
    setError(null);

    let photoUrl = enrolledPhoto;
    if (!photoUrl && canvasRef.current && videoRef.current) {
      const cvs = canvasRef.current;
      const vid = videoRef.current;
      cvs.width = vid.videoWidth || 480;
      cvs.height = vid.videoHeight || 480;
      const ctx = cvs.getContext('2d');
      if (ctx) {
        ctx.drawImage(vid, 0, 0, cvs.width, cvs.height);
        photoUrl = cvs.toDataURL('image/jpeg', 0.85);
        setEnrolledPhoto(photoUrl);
      }
    }

    try {
      const empId = user?.employeeId || 'EMP';

      // 1. Save rich multi-angle biometric profile locally
      saveMultiAngleProfile(empId, {
        center: effectiveCenter,
        left: lVec || undefined,
        right: rVec || undefined,
        enrolledAt: new Date().toISOString(),
        photoDataUrl: photoUrl || undefined,
      });

      // 2. Persist to API & Google Sheets
      await api.enrolFace({
        employeeId: empId,
        biometricVector: effectiveCenter,
        consentVersion: 'v2026.1_MY_PDPA',
        photoDataUrl: photoUrl || undefined,
      });

      await refreshUser();
      setLoading(false);
      setSuccess(true);
    } catch (err: any) {
      setLoading(false);
      setEnrolAngle('CENTER');
      setError(err.message || 'Pendaftaran gagal. Sila cuba lagi.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col p-4 sm:p-6 max-w-xl mx-auto font-sans">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <button
          onClick={onBack}
          className="p-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-xs transition cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl font-black text-slate-900">Pendaftaran Wajah Biometrik</h1>
          <p className="text-xs text-slate-500">Halagel (M) Sdn Bhd • Pengecaman 3-Sudut (Depan, Kiri, Kanan)</p>
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
              Profil Biometrik Multi-Sudut: {user?.name} ({user?.employeeId})
            </p>
            <p className="text-xs text-slate-600 max-w-sm mx-auto mt-2 leading-relaxed">
              Mulai sekarang, anda boleh menggunakan <strong>Pengecaman Wajah 3-Sudut</strong> secara automatik semasa merakam jam masuk dan keluar kerja.
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-1.5 text-left">
            <div className="flex justify-between">
              <span className="text-slate-500">Status Pendaftaran:</span>
              <span className="text-emerald-700 font-bold">✓ 3 Sudut Aktif (Hadapan, Kiri, Kanan)</span>
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
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* 3-Step Multi Angle Indicators */}
          <div className="grid grid-cols-3 gap-1.5 p-1.5 rounded-2xl bg-slate-100 border border-slate-200 text-xs">
            <div
              className={`py-1.5 px-2 rounded-xl text-center font-bold text-[11px] flex items-center justify-center gap-1 transition ${
                enrolAngle === 'CENTER'
                  ? 'bg-[#5b7e22] text-white shadow-xs'
                  : centerVector
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-white text-slate-500'
              }`}
            >
              <span>{centerVector ? '✓' : '1.'}</span>
              <span>Hadapan</span>
            </div>

            <div
              className={`py-1.5 px-2 rounded-xl text-center font-bold text-[11px] flex items-center justify-center gap-1 transition ${
                enrolAngle === 'LEFT'
                  ? 'bg-[#5b7e22] text-white shadow-xs'
                  : leftVector
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-white text-slate-500'
              }`}
            >
              <span>{leftVector ? '✓' : '2.'}</span>
              <span>Pandang Kiri</span>
            </div>

            <div
              className={`py-1.5 px-2 rounded-xl text-center font-bold text-[11px] flex items-center justify-center gap-1 transition ${
                enrolAngle === 'RIGHT'
                  ? 'bg-[#5b7e22] text-white shadow-xs'
                  : rightVector
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-white text-slate-500'
              }`}
            >
              <span>{rightVector ? '✓' : '3.'}</span>
              <span>Pandang Kanan</span>
            </div>
          </div>

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

            {/* Directional Prompt Overlays */}
            {enrolAngle === 'LEFT' && (
              <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-1.5 bg-slate-950/80 backdrop-blur-md px-3 py-2 rounded-2xl border border-emerald-400 text-emerald-300 font-black text-xs animate-pulse pointer-events-none shadow-xl">
                <ArrowLeft className="w-5 h-5 text-emerald-400" />
                <span>Pusing KIRI ⬅️</span>
              </div>
            )}

            {enrolAngle === 'RIGHT' && (
              <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1.5 bg-slate-950/80 backdrop-blur-md px-3 py-2 rounded-2xl border border-emerald-400 text-emerald-300 font-black text-xs animate-pulse pointer-events-none shadow-xl">
                <span>Pusing KANAN ➡️</span>
                <ArrowRight className="w-5 h-5 text-emerald-400" />
              </div>
            )}

            {/* Progress Bar for Current Angle */}
            <div className="absolute top-3 left-4 right-4">
              <div className="w-full bg-slate-950/70 backdrop-blur-md rounded-full h-2 p-0.5 border border-slate-700/80 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-emerald-500 via-emerald-400 to-teal-300 h-full rounded-full transition-all duration-150"
                  style={{ width: `${Math.min(100, angleProgress)}%` }}
                />
              </div>
            </div>

            {/* Live Instruction Pill */}
            <div className="absolute bottom-3 left-3 right-3 bg-slate-950/85 backdrop-blur-md px-3 py-2 rounded-xl text-center text-xs text-white border border-slate-700/80 shadow-lg">
              {enrolAngle === 'CENTER' && (
                <div className="flex items-center justify-center gap-1.5 font-bold text-emerald-300">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Langkah 1/3: Pandang Lurus ke Kamera</span>
                </div>
              )}
              {enrolAngle === 'LEFT' && (
                <div className="flex items-center justify-center gap-1.5 font-bold text-amber-300 animate-pulse">
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Langkah 2/3: Paling / Pandang Kepala ke KIRI</span>
                </div>
              )}
              {enrolAngle === 'RIGHT' && (
                <div className="flex items-center justify-center gap-1.5 font-bold text-amber-300 animate-pulse">
                  <ArrowRight className="w-3.5 h-3.5" />
                  <span>Langkah 3/3: Paling / Pandang Kepala ke KANAN</span>
                </div>
              )}
              {enrolAngle === 'SAVING' && (
                <div className="flex items-center justify-center gap-1.5 font-bold text-blue-300 animate-pulse">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Menyimpan Templat Biometrik 3-Sudut...</span>
                </div>
              )}
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

          {/* Action Buttons */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleResetEnrol}
              title="Mula Semula Pendaftaran 3-Sudut"
              className="py-3 px-3.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center justify-center cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            <button
              onClick={handleManualAngleCapture}
              disabled={loading || !consentChecked || enrolAngle === 'SAVING'}
              className="flex-1 py-3.5 px-4 rounded-xl bg-[#5b7e22] hover:bg-[#4d6b1d] text-white font-extrabold text-sm flex items-center justify-center gap-2 transition disabled:opacity-50 cursor-pointer shadow-md shadow-[#5b7e22]/25"
            >
              {loading || enrolAngle === 'SAVING' ? (
                <>
                  <RefreshCw className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Menyimpan Profil Biometrik...</span>
                </>
              ) : enrolAngle === 'CENTER' ? (
                <>
                  <ScanFace className="w-5 h-5" />
                  <span>Sahkan Hadapan (Atau Pandang Terus)</span>
                </>
              ) : enrolAngle === 'LEFT' ? (
                <>
                  <ArrowLeft className="w-5 h-5" />
                  <span>Sahkan Kiri (Atau Pandang Kiri)</span>
                </>
              ) : (
                <>
                  <ArrowRight className="w-5 h-5" />
                  <span>Sahkan Kanan & Lengkapkan</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
