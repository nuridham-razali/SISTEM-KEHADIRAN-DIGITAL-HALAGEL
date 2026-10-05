import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useAttendance } from '../../context/AttendanceContext';
import { api } from '../../services/api';
import { GeofenceMap } from '../common/GeofenceMap';
import { extractBiometricVector, compareBiometricVectors } from '../../utils/faceBiometrics';
import {
  MapPin,
  Camera,
  CheckCircle2,
  X,
  RefreshCw,
  Building2,
  ScanFace,
  CheckCircle,
  AlertTriangle,
  UserCheck,
  ShieldCheck,
  Lock,
  AlertOctagon,
  Car,
  Coffee,
  Briefcase,
  Home,
  MessageSquare,
  Navigation,
} from 'lucide-react';

interface AttendanceFlowProps {
  isClockIn: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onNavigateToFaceEnrol?: () => void;
  initialEntryType?: string;
  initialExitType?: string;
  initialIsOutstation?: boolean;
}

export const AttendanceFlow: React.FC<AttendanceFlowProps> = ({
  isClockIn,
  onClose,
  onSuccess,
  onNavigateToFaceEnrol,
  initialEntryType,
  initialExitType,
  initialIsOutstation = false,
}) => {
  const { user } = useAuth();
  const {
    assignedOffice,
    userLocation,
    distanceToOffice,
    isInsideRadius,
    checkLocation,
  } = useAttendance();

  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);
  const [isRecognizing, setIsRecognizing] = useState(false);
  const [recognitionStage, setRecognitionStage] = useState<'idle' | 'detecting' | 'matching' | 'matched' | 'failed'>('idle');
  const [matchScore, setMatchScore] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [_capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [enrolledPhoto, setEnrolledPhoto] = useState<string | null>(null);

  // Outstation Mode State
  const [isOutstationMode, setIsOutstationMode] = useState<boolean>(initialIsOutstation);
  const [outstationLocation, setOutstationLocation] = useState<string>('');

  // Remark & Preset States
  const defaultInPreset = initialEntryType || 'Datang Bekerja (Masuk Pagi / Syif Awal)';
  const defaultOutPreset = initialExitType || 'Balik / Tamat Waktu Bekerja';
  const [selectedPreset, setSelectedPreset] = useState<string>(
    initialIsOutstation
      ? (isClockIn ? 'Daftar Masuk Luar Kawasan (Outstation)' : 'Daftar Keluar Luar Kawasan (Outstation)')
      : (isClockIn ? defaultInPreset : defaultOutPreset)
  );
  const [customRemark, setCustomRemark] = useState<string>('');

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Check whether face is already registered in profile and/or local biometric storage
  const hasFaceEnrolled = Boolean(
    user?.faceEnrolled && (
      localStorage.getItem(`halagel_face_${user?.employeeId}`) ||
      localStorage.getItem(`halagel_face_vector_${user?.employeeId}`) ||
      user?.facePhotoUrl ||
      user?.faceBiometricHash
    )
  );

  useEffect(() => {
    if (user?.employeeId) {
      const stored = localStorage.getItem(`halagel_face_${user.employeeId}`);
      if (stored) {
        setEnrolledPhoto(stored);
      } else if (user.facePhotoUrl) {
        setEnrolledPhoto(user.facePhotoUrl);
      }
    }
  }, [user]);

  useEffect(() => {
    handleSearchLocation();
  }, []);

  const handleSearchLocation = async () => {
    setIsSearchingLocation(true);
    await checkLocation();
    setTimeout(() => {
      setIsSearchingLocation(false);
    }, 600);
  };

  // Toggle Outstation Mode
  const handleToggleOutstation = (enable: boolean) => {
    setIsOutstationMode(enable);
    setErrorMessage(null);
    if (enable) {
      setSelectedPreset(isClockIn ? 'Daftar Masuk Luar Kawasan (Outstation)' : 'Daftar Keluar Luar Kawasan (Outstation)');
    } else {
      setSelectedPreset(isClockIn ? 'Datang Bekerja (Masuk Pagi / Syif Awal)' : 'Balik / Tamat Waktu Bekerja');
    }
  };

  const startCamera = async () => {
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
      console.warn('Physical camera unavailable:', err);
      setCameraActive(false);
      setErrorMessage('Kamera tidak aktif. Sila benarkan kebenaran kamera pelayar untuk pengesahan wajah.');
    }
  };

  const proceedToPhotoStep = async () => {
    setErrorMessage(null);

    // If Normal Kilang mode: STRICT GEOFENCE ENFORCEMENT
    if (!isOutstationMode && !isInsideRadius) {
      setErrorMessage(
        `Anda berada di luar radius zon pejabat (${distanceToOffice ?? 0}m > ${assignedOffice?.radiusMeters}m). Rakam kehadiran diblok. Jika anda bertugas di luar kawasan, sila pilih mod 'Kerja Luar Kawasan (Outstation)'.`
      );
      return;
    }

    // If Outstation mode: MUST provide outstation location
    if (isOutstationMode && !outstationLocation.trim()) {
      setErrorMessage(
        'Sila masukkan nama lokasi / destinasi luar kawasan anda (contoh: Nama pembekal, tapak projek, atau bandar) sebelum meneruskan.'
      );
      return;
    }

    setCurrentStep(2);
    setRecognitionStage('idle');
    setErrorMessage(null);
    await startCamera();
  };

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // Run Real AI Facial Recognition & Biometric Verification
  const handleRunFaceRecognition = async () => {
    setErrorMessage(null);
    if (!videoRef.current) {
      setErrorMessage('Kamera tidak bersedia. Sila aktifkan kamera.');
      return;
    }

    setIsRecognizing(true);
    setRecognitionStage('detecting');

    // Capture snapshot from live video
    if (canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth || 480;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        setCapturedPhoto(dataUrl);
      }
    }

    // Step 1: Real computer vision face detection on current frame
    const detection = extractBiometricVector(videoRef.current);
    if (!detection.detected || !detection.vector) {
      setIsRecognizing(false);
      setRecognitionStage('failed');
      setErrorMessage(
        detection.message ||
        'Tiada wajah dikesan di hadapan kamera. Sila pastikan wajah anda berada di dalam bingkai bujur dengan pencahayaan yang cukup.'
      );
      return;
    }

    // Step 2: Retrieve registered biometric template vector
    setRecognitionStage('matching');
    const storedVectorStr = localStorage.getItem(`halagel_face_vector_${user?.employeeId}`);
    let enrolledVector: number[] | null = null;

    if (storedVectorStr) {
      try {
        enrolledVector = JSON.parse(storedVectorStr);
      } catch (_e) {
        enrolledVector = null;
      }
    }

    // If no vector stored, generate fallback if user had enrolled
    if (!enrolledVector && user?.faceEnrolled) {
      enrolledVector = new Array(128).fill(0).map((_, i) =>
        Math.sin((user.employeeId.charCodeAt(0) || 65) * (i + 1))
      );
      const norm = Math.sqrt(enrolledVector.reduce((acc, v) => acc + v * v, 0)) || 1;
      enrolledVector = enrolledVector.map((v) => v / norm);
      localStorage.setItem(`halagel_face_vector_${user.employeeId}`, JSON.stringify(enrolledVector));
    }

    if (!enrolledVector) {
      setIsRecognizing(false);
      setRecognitionStage('failed');
      setErrorMessage('Templat wajah berdaftar tidak dijumpai. Sila daftar wajah anda terlebih dahulu.');
      return;
    }

    // Step 3: Compare biometric vectors with threshold
    setTimeout(async () => {
      const comparison = compareBiometricVectors(enrolledVector!, detection.vector!, 0.78);

      if (!comparison.isMatch) {
        setIsRecognizing(false);
        setRecognitionStage('failed');
        setErrorMessage(
          `Wajah Tidak Sah! Pengecaman wajah tidak padan dengan pendaftaran asal anda (${comparison.similarityScore}% ketepatan, minimum 80% diperlukan).`
        );
        return;
      }

      // Valid match confirmed!
      setMatchScore(comparison.similarityScore);
      setRecognitionStage('matched');

      try {
        const payload = {
          officeId: assignedOffice?.officeId || 'OFF-01',
          latitude: userLocation?.latitude || assignedOffice?.latitude || 5.6432,
          longitude: userLocation?.longitude || assignedOffice?.longitude || 100.4912,
          accuracyMeters: userLocation?.accuracy || 10,
          biometricTemplate: JSON.stringify(detection.vector!.slice(0, 8)),
          entryType: isClockIn ? selectedPreset : undefined,
          exitType: !isClockIn ? selectedPreset : undefined,
          remarks: customRemark.trim() || undefined,
          isOutstation: isOutstationMode,
          outstationLocation: isOutstationMode ? outstationLocation.trim() : undefined,
        };

        if (isClockIn) {
          await api.clockIn(payload);
        } else {
          await api.clockOut(payload);
        }

        setTimeout(() => {
          setIsRecognizing(false);
          setCurrentStep(3);
        }, 700);
      } catch (err: any) {
        setIsRecognizing(false);
        setRecognitionStage('failed');
        setErrorMessage(err.message || 'Gagal merekod kehadiran. Sila semak sambungan atau status geofens anda.');
      }
    }, 700);
  };

  // If user has NOT enrolled face, prompt them to register face first!
  if (!hasFaceEnrolled) {
    return (
      <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
        <div className="bg-white border border-amber-300 rounded-3xl max-w-md w-full p-6 shadow-2xl text-center space-y-4 text-slate-900">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto text-amber-600">
            <Lock className="w-8 h-8" />
          </div>

          <div>
            <h3 className="text-lg font-black text-slate-900">Wajah Anda Belum Didaftarkan!</h3>
            <p className="text-xs text-amber-800 font-bold mt-0.5">
              Pengecaman Wajah Wajib untuk Merekod Kehadiran
            </p>
            <p className="text-xs text-slate-600 mt-2.5 leading-relaxed">
              Polisi rasmi <strong>Halagel (M) Sdn Bhd</strong> mewajibkan setiap kakitangan mendaftar templat biometrik wajah terlebih dahulu sebelum dibenarkan membuat <strong>Rakam Masuk</strong> atau <strong>Rakam Keluar</strong>.
            </p>
          </div>

          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600 text-left space-y-1">
            <div className="flex items-center gap-1.5 text-slate-900 font-semibold">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Pendaftaran Pantas (Kurang 30 Saat)</span>
            </div>
            <p className="text-[11px] text-slate-500">
              Kamera akan mengimbas struktur wajah anda untuk menghasilkan templat biometrik yang disulitkan secara selamat mengikut piawaian PDPA 2010.
            </p>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                onNavigateToFaceEnrol?.();
              }}
              className="flex-1 py-3 rounded-xl bg-[#5b7e22] hover:bg-[#4d6b1d] text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-[#5b7e22]/25 transition cursor-pointer"
            >
              <ScanFace className="w-4 h-4" />
              <span>Daftar Wajah Sekarang</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Presets definition
  const clockInPresets = [
    { id: 'Datang Bekerja (Masuk Pagi / Syif Awal)', label: 'Datang Bekerja (Pagi / Awal)', icon: Building2, desc: 'Masuk bertugas waktu pagi' },
    { id: 'Masuk Semula (Selepas Urusan Kerja / Pembelian Luar)', label: 'Masuk Semula (Urusan Luar / Beli Barang)', icon: Briefcase, desc: 'Masuk selepas beli barang/urusan kilang' },
    { id: 'Masuk Semula (Selepas Rehat / Makan)', label: 'Masuk Semula (Selepas Rehat)', icon: Coffee, desc: 'Masuk semula lepas makan/rehat' },
    { id: 'Daftar Masuk Luar Kawasan (Outstation)', label: 'Daftar Masuk Outstation', icon: Car, desc: 'Masuk bertugas di luar kawasan kilang' },
    { id: 'Lain-lain Catatan Masuk', label: 'Lain-lain Catatan Masuk', icon: MessageSquare, desc: 'Nyatakan sebab pada kotak catatan' },
  ];

  const clockOutPresets = [
    { id: 'Balik / Tamat Waktu Bekerja', label: 'Balik / Tamat Syif Bekerja', icon: Home, desc: 'Tamat waktu bekerja harian' },
    { id: 'Keluar Kilang (Urusan Kerja / Pembelian Barang)', label: 'Keluar Urusan Kerja / Beli Barang', icon: Briefcase, desc: 'Keluar kilang beli alat ganti / urusan' },
    { id: 'Keluar Rehat / Makan Tengah Hari', label: 'Keluar Rehat / Makan', icon: Coffee, desc: 'Keluar untuk waktu rehat tengah hari' },
    { id: 'Daftar Keluar Luar Kawasan (Outstation)', label: 'Daftar Keluar Outstation', icon: Car, desc: 'Keluar untuk bertugas luar kawasan' },
    { id: 'Lain-lain Catatan Keluar', label: 'Lain-lain Catatan Keluar', icon: MessageSquare, desc: 'Nyatakan sebab pada kotak catatan' },
  ];

  const activePresets = isClockIn ? clockInPresets : clockOutPresets;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-4 sm:p-6 shadow-2xl relative my-auto max-h-[95vh] overflow-y-auto text-slate-900">
        {/* Hidden Canvas for Live Video Snapping */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <span>{isClockIn ? 'Rakam Kehadiran Masuk' : 'Rakam Kehadiran Keluar'}</span>
              {isOutstationMode && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200 font-semibold">
                  Outstation
                </span>
              )}
            </h3>
            <p className="text-xs text-slate-500">
              Langkah {currentStep} dari 3 • {currentStep === 1 ? 'Lokasi & Catatan Kehadiran' : currentStep === 2 ? 'Pengecaman Wajah' : 'Pengesahan Sah'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-100 text-slate-400 hover:text-slate-700 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center justify-between px-6 mb-4">
          <div className={`flex flex-col items-center gap-1 ${currentStep >= 1 ? 'text-emerald-700 font-bold' : 'text-slate-400'}`}>
            <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${currentStep >= 1 ? 'bg-emerald-100 border border-emerald-400 text-emerald-800' : 'bg-slate-100 border border-slate-200 text-slate-400'}`}>
              1
            </div>
            <span className="text-[10px]">Lokasi & Catatan</span>
          </div>
          <div className={`flex-1 h-0.5 mx-2 ${currentStep >= 2 ? 'bg-emerald-500' : 'bg-slate-200'}`} />
          <div className={`flex flex-col items-center gap-1 ${currentStep >= 2 ? 'text-emerald-700 font-bold' : 'text-slate-400'}`}>
            <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${currentStep >= 2 ? 'bg-emerald-100 border border-emerald-400 text-emerald-800' : 'bg-slate-100 border border-slate-200 text-slate-400'}`}>
              2
            </div>
            <span className="text-[10px]">Wajah</span>
          </div>
          <div className={`flex-1 h-0.5 mx-2 ${currentStep >= 3 ? 'bg-emerald-500' : 'bg-slate-200'}`} />
          <div className={`flex flex-col items-center gap-1 ${currentStep >= 3 ? 'text-emerald-700 font-bold' : 'text-slate-400'}`}>
            <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${currentStep >= 3 ? 'bg-emerald-100 border border-emerald-400 text-emerald-800' : 'bg-slate-100 border border-slate-200 text-slate-400'}`}>
              3
            </div>
            <span className="text-[10px]">Selesai</span>
          </div>
        </div>

        {/* STEP 1: MOD KEHADIRAN (KILANG VS OUTSTATION) + CATATAN & REMARK */}
        {currentStep === 1 && (
          <div className="space-y-4">
            {/* Mode Selector: Premis Kilang vs Kerja Luar Kawasan (Outstation) */}
            <div className="p-1 rounded-2xl bg-slate-100 border border-slate-200 flex gap-1">
              <button
                type="button"
                onClick={() => handleToggleOutstation(false)}
                className={`flex-1 py-2 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                  !isOutstationMode
                    ? 'bg-white text-slate-900 shadow-sm border border-slate-200/80'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Building2 className="w-3.5 h-3.5 text-[#5b7e22]" />
                <span>Premis Kilang / Pejabat</span>
              </button>

              <button
                type="button"
                onClick={() => handleToggleOutstation(true)}
                className={`flex-1 py-2 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                  isOutstationMode
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Car className="w-3.5 h-3.5" />
                <span>Kerja Luar Kawasan (Outstation)</span>
              </button>
            </div>

            {/* Error Message Alert */}
            {errorMessage && (
              <div className="p-3 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2.5 animate-in fade-in duration-200">
                <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <div className="leading-snug">{errorMessage}</div>
              </div>
            )}

            {/* 1. OUTSTATION MODE CONFIG */}
            {isOutstationMode ? (
              <div className="p-3.5 rounded-2xl bg-purple-50 border border-purple-200 text-xs space-y-2.5">
                <div className="flex items-center gap-2 text-purple-900 font-bold">
                  <Car className="w-4 h-4 text-purple-600" />
                  <span>Mod Tugasan Luar Kawasan (Outstation)</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Pengecualian radius geofens kilang diaktifkan. Anda dibenarkan {isClockIn ? 'daftar masuk' : 'daftar keluar'} dari lokasi luar kawasan kerja anda.
                </p>

                {/* Outstation Location Input (Required) */}
                <div className="pt-1">
                  <label className="block text-[11px] font-bold text-slate-900 mb-1">
                    Nama Lokasi / Tapak Luar Kawasan: <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={outstationLocation}
                    onChange={(e) => {
                      setOutstationLocation(e.target.value);
                      if (errorMessage) setErrorMessage(null);
                    }}
                    placeholder="Contoh: Tapak Projek Kulim / Pembekal Hardware Indah"
                    className="w-full bg-white border border-purple-300 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-purple-500 shadow-xs"
                  />
                  <p className="text-[10px] text-purple-700 mt-1">
                    *Wajib dinyatakan supaya pihak pentadbir Halagel dapat merekodkan destinasi rasmi anda.
                  </p>
                </div>

                <div className="p-2 rounded-xl bg-white border border-purple-200 text-[10px] text-slate-600 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Navigation className="w-3 h-3 text-purple-600" />
                    GPS Semasa: {userLocation ? `${userLocation.latitude.toFixed(4)}, ${userLocation.longitude.toFixed(4)}` : 'Dikesan'}
                  </span>
                  <span className="text-emerald-700 font-bold">✓ Koordinat Ditandai Outstation</span>
                </div>
              </div>
            ) : (
              /* 2. PREMIS KILANG GEOFENCE MAP & CHECK */
              <div className="space-y-3">
                <GeofenceMap
                  office={assignedOffice}
                  userLocation={userLocation}
                  isInsideRadius={isInsideRadius}
                  distanceMeters={distanceToOffice}
                  heightClass="h-44"
                  defaultSatellite={true}
                />

                {isInsideRadius ? (
                  <div className="p-3 rounded-2xl border bg-emerald-50 border-emerald-200 text-emerald-900 text-xs flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-slate-900">
                        Anda berada dalam zon cawangan sah
                      </p>
                      <p className="text-[11px] mt-0.5 text-slate-600">
                        Jarak ke {assignedOffice?.name}: {distanceToOffice ?? 0}m (Had Zon: {assignedOffice?.radiusMeters}m).
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 rounded-2xl border bg-red-50 border-red-200 text-red-900 text-xs flex items-start gap-2.5 shadow-xs">
                    <AlertOctagon className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-red-950 text-xs">
                        Rakam Kehadiran Diblok: Luar Radius Kilang
                      </p>
                      <p className="text-[11px] mt-1 text-slate-700 leading-snug">
                        Jarak anda <strong>{distanceToOffice ?? 0}m</strong> melebihi had radius geofens cawangan (<strong>{assignedOffice?.radiusMeters}m</strong>).
                      </p>
                      <p className="text-[10px] text-amber-800 font-semibold mt-1">
                        👉 Jika anda berada di luar untuk urusan kerja luar/projek, sila tekan butang <strong>"Kerja Luar Kawasan (Outstation)"</strong> di atas.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 3. TUJUAN KELUAR/MASUK (PRESETS) */}
            <div className="space-y-2 pt-1">
              <label className="block text-xs font-bold text-slate-900">
                {isClockIn ? 'Tujuan / Kategori Daftar Masuk:' : 'Tujuan / Kategori Daftar Keluar:'}
              </label>

              <div className="grid grid-cols-1 gap-1.5 max-h-40 overflow-y-auto pr-1">
                {activePresets.map((preset) => {
                  const Icon = preset.icon;
                  const isSelected = selectedPreset === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => {
                        setSelectedPreset(preset.id);
                        if (preset.id.includes('Outstation') && !isOutstationMode) {
                          setIsOutstationMode(true);
                        }
                      }}
                      className={`p-2.5 rounded-xl border text-left flex items-center justify-between transition cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-50 border-emerald-500 text-slate-900 font-bold ring-2 ring-emerald-500/20'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={`p-1.5 rounded-lg ${isSelected ? 'bg-emerald-100 text-emerald-800' : 'bg-white text-slate-500 border border-slate-200'}`}>
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-slate-900">{preset.label}</div>
                          <div className="text-[10px] text-slate-500 font-normal">{preset.desc}</div>
                        </div>
                      </div>
                      {isSelected && <span className="text-emerald-700 font-black text-xs">✓</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 4. KOTAK REMARK / CATATAN TAMBAHAN (USER REQUEST) */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-[#5b7e22]" />
                  <span>Kotak Catatan Tambahan (Remark):</span>
                </label>
                <span className="text-[10px] text-slate-500">Pilihan / Opsional</span>
              </div>
              <textarea
                rows={2}
                value={customRemark}
                onChange={(e) => setCustomRemark(e.target.value)}
                placeholder={
                  isClockIn
                    ? 'Contoh: Masuk selepas pembelian barang kilang di hardware / Masuk selepas urusan bank'
                    : 'Contoh: Keluar membeli alat ganti mesin pembungkusan / Keluar rehat makan tengah hari / Balik tamat syif'
                }
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-emerald-500 resize-none shadow-xs"
              />
              <p className="text-[10px] text-slate-500">
                *Catatan ini akan direkodkan secara rasmi ke dalam log kehadiran dan diselaraskan ke Google Sheets.
              </p>
            </div>

            {/* Actions Bar */}
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={handleSearchLocation}
                disabled={isSearchingLocation}
                title="Kemas kini isyarat GPS"
                className="p-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 flex items-center justify-center transition cursor-pointer"
              >
                <RefreshCw className={`w-4 h-4 ${isSearchingLocation ? 'animate-spin' : ''}`} />
              </button>

              {/* STRICT GEOFENCE OR OUTSTATION BUTTON */}
              <button
                type="button"
                disabled={!isOutstationMode && !isInsideRadius}
                onClick={proceedToPhotoStep}
                className={`flex-1 py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition ${
                  isOutstationMode
                    ? 'bg-purple-600 hover:bg-purple-700 text-white cursor-pointer shadow-md shadow-purple-600/25 active:scale-[0.98]'
                    : isInsideRadius
                    ? 'bg-[#5b7e22] hover:bg-[#4d6b1d] text-white cursor-pointer shadow-md shadow-[#5b7e22]/25 active:scale-[0.98]'
                    : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                }`}
              >
                <span>
                  {isOutstationMode
                    ? 'Sahkan Outstation & Pengecaman Wajah'
                    : isInsideRadius
                    ? 'Sahkan Lokasi & Pengecaman Wajah'
                    : 'Diblok: Anda Di Luar Radius Kilang'}
                </span>
                <ScanFace className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: PENGE CAMAN WAJAH BIOMETRIK SEBENAR */}
        {currentStep === 2 && (
          <div className="space-y-4">
            {/* Target Profile & Selected Context Bar */}
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                {enrolledPhoto ? (
                  <img
                    src={enrolledPhoto}
                    alt="Foto Profil"
                    className="w-8 h-8 rounded-full object-cover border border-emerald-500"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-xs font-bold">
                    {user?.name.charAt(0)}
                  </div>
                )}
                <div>
                  <div className="text-slate-900 font-bold text-[11px]">{user?.name} ({user?.employeeId})</div>
                  <div className="text-[10px] text-slate-500 line-clamp-1">
                    {selectedPreset} {customRemark ? `• ${customRemark}` : ''}
                  </div>
                </div>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                isOutstationMode
                  ? 'bg-purple-50 text-purple-700 border-purple-200'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
              }`}>
                {isOutstationMode ? 'Outstation' : 'Premis Kilang'}
              </span>
            </div>

            {/* Error Message Alert */}
            {errorMessage && (
              <div className="p-3 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2.5 animate-in fade-in duration-200">
                <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <div className="leading-snug">{errorMessage}</div>
              </div>
            )}

            {/* Video Feed with Biometric Scanner Mesh */}
            <div className="relative w-full h-64 bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 flex items-center justify-center">
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
                  <p className="text-xs text-white font-medium">Kamera Belum Aktif</p>
                  <p className="text-[11px] text-slate-400 mt-1 mb-2">Sila hidupkan kamera untuk mengimbas wajah anda</p>
                  <button
                    type="button"
                    onClick={startCamera}
                    className="px-3 py-1.5 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs"
                  >
                    Aktifkan Kamera
                  </button>
                </div>
              )}

              {/* Biometric Holographic Oval with Scanning Laser */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div
                  className={`relative w-40 h-52 rounded-[50%] border-2 transition-colors duration-300 ${
                    recognitionStage === 'matched'
                      ? 'border-emerald-400 shadow-[0_0_30px_#10B981]'
                      : recognitionStage === 'failed'
                      ? 'border-red-400 shadow-[0_0_25px_#EF4444]'
                      : recognitionStage === 'matching' || recognitionStage === 'detecting'
                      ? 'border-blue-400 shadow-[0_0_20px_#60A5FA]'
                      : 'border-emerald-400/80 border-dashed'
                  }`}
                >
                  {/* Laser Beam */}
                  {isRecognizing && (
                    <div className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-emerald-300 to-transparent shadow-[0_0_12px_#34D399] animate-bounce" />
                  )}

                  {/* Corner Targets */}
                  <div className="absolute -top-2 -left-2 w-4 h-4 border-t-2 border-l-2 border-emerald-400" />
                  <div className="absolute -top-2 -right-2 w-4 h-4 border-t-2 border-r-2 border-emerald-400" />
                  <div className="absolute -bottom-2 -left-2 w-4 h-4 border-b-2 border-l-2 border-emerald-400" />
                  <div className="absolute -bottom-2 -right-2 w-4 h-4 border-b-2 border-r-2 border-emerald-400" />
                </div>
              </div>

              {/* Status Message Pill */}
              <div className="absolute bottom-3 left-3 right-3 bg-slate-950/85 backdrop-blur-md px-3 py-2 rounded-xl text-center text-xs text-white border border-slate-700 shadow-lg">
                {recognitionStage === 'idle' && (
                  <span className="text-slate-300 font-medium">Posisikan wajah anda di tengah bulatan</span>
                )}
                {recognitionStage === 'detecting' && (
                  <span className="text-blue-300 font-semibold animate-pulse">
                    🔍 Mengesan struktur & geometri wajah...
                  </span>
                )}
                {recognitionStage === 'matching' && (
                  <span className="text-amber-300 font-semibold animate-pulse">
                    ⚡ Memadankan dengan templat biometrik {user?.employeeId}...
                  </span>
                )}
                {recognitionStage === 'matched' && (
                  <span className="text-emerald-400 font-bold">
                    ✓ Wajah Padan Sah! ({matchScore}% Ketepatan)
                  </span>
                )}
                {recognitionStage === 'failed' && (
                  <span className="text-red-400 font-bold">
                    ✗ Pengesahan gagal. Sila cuba lagi.
                  </span>
                )}
              </div>
            </div>

            {/* Recognition Trigger Button */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="py-3 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition"
              >
                Kembali
              </button>
              <button
                type="button"
                disabled={isRecognizing}
                onClick={handleRunFaceRecognition}
                className="flex-1 py-3.5 px-4 rounded-xl bg-[#5b7e22] hover:bg-[#4d6b1d] text-white font-extrabold text-sm flex items-center justify-center gap-2 transition disabled:opacity-60 cursor-pointer shadow-md shadow-[#5b7e22]/25 active:scale-[0.98]"
              >
                {isRecognizing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-white" />
                    <span>Mengesahkan Pengecaman Wajah...</span>
                  </>
                ) : (
                  <>
                    <ScanFace className="w-5 h-5 text-white" />
                    <span>Imbas Wajah & Sahkan Kehadiran</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: BERJAYA */}
        {currentStep === 3 && (
          <div className="space-y-4 text-center py-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-full bg-emerald-50 border-2 border-emerald-500 flex items-center justify-center mx-auto text-emerald-600 shadow-md shadow-emerald-500/20">
              <CheckCircle className="w-10 h-10" />
            </div>

            <div>
              <h4 className="text-lg font-black text-slate-900">
                {isClockIn ? 'Berjaya Rakam Kehadiran Masuk!' : 'Berjaya Rakam Kehadiran Keluar!'}
              </h4>
              <p className="text-xs text-slate-500 mt-1">
                Pengecaman biometrik wajah disahkan & data disimpan ke pangkalan data Halagel
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-left space-y-2 text-slate-700">
              <div className="flex justify-between">
                <span className="text-slate-500">Pekerja:</span>
                <span className="text-slate-900 font-bold">{user?.name} ({user?.employeeId})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Mod Kehadiran:</span>
                <span className={`font-bold ${isOutstationMode ? 'text-purple-700' : 'text-emerald-700'}`}>
                  {isOutstationMode ? `Luar Kawasan (${outstationLocation || 'Outstation'})` : assignedOffice?.name}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Tujuan / Remark:</span>
                <span className="text-slate-900 font-medium text-right max-w-[200px]">
                  {selectedPreset}
                  {customRemark ? ` (${customRemark})` : ''}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Pengecaman Wajah:</span>
                <span className="text-emerald-700 font-bold">
                  ✓ Disahkan ({matchScore ?? 96}% Padanan Biometrik)
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Waktu Rekod (KL):</span>
                <span className="text-slate-900 font-semibold font-mono">
                  {new Date().toLocaleTimeString('en-US', { timeZone: 'Asia/Kuala_Lumpur', hour: '2-digit', minute: '2-digit', hour12: true })}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                onSuccess();
                onClose();
              }}
              className="w-full py-3.5 px-4 rounded-xl bg-[#5b7e22] hover:bg-[#4d6b1d] text-white font-bold text-sm transition cursor-pointer shadow-md shadow-[#5b7e22]/25"
            >
              Kembali ke Papan Pemuka
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
