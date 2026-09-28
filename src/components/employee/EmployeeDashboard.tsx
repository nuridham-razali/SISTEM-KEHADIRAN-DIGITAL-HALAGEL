import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useAttendance } from '../../context/AttendanceContext';
import { AttendanceFlow } from './AttendanceFlow';
import { AttendanceHistory } from './AttendanceHistory';
import { FaceEnrolment } from './FaceEnrolment';
import { GeofenceMap } from '../common/GeofenceMap';
import { LocationPermissionPrompt } from '../common/LocationPermissionPrompt';
import {
  Fingerprint,
  Calendar,
  Clock,
  MapPin,
  ShieldCheck,
  Timer,
  User as UserIcon,
  LogOut,
  ChevronRight,
  History,
  Building2,
  ScanFace,
  CheckCircle,
  AlertCircle,
  Navigation,
} from 'lucide-react';

export const EmployeeDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const {
    dashboard,
    loading,
    refreshDashboard,
    assignedOffice,
    userLocation,
    isInsideRadius,
    distanceToOffice,
    permissionPromptOpen,
    setPermissionPromptOpen,
    isPreciseGps,
    setUserCustomLocation,
  } = useAttendance();

  const [activeScreen, setActiveScreen] = useState<'HOME' | 'HISTORY' | 'ENROL'>('HOME');
  const [showFlowModal, setShowFlowModal] = useState(false);
  const [currentDate, setCurrentDate] = useState<Date>(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDate(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const openSession = dashboard?.openSession;
  const isClockIn = openSession == null;

  const timeString = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kuala_Lumpur',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(currentDate);

  const dateString = new Intl.DateTimeFormat('ms-MY', {
    timeZone: 'Asia/Kuala_Lumpur',
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(currentDate);

  if (activeScreen === 'HISTORY') {
    return <AttendanceHistory onBack={() => setActiveScreen('HOME')} />;
  }

  if (activeScreen === 'ENROL') {
    return (
      <FaceEnrolment
        onBack={() => setActiveScreen('HOME')}
        onSuccess={() => {
          setActiveScreen('HOME');
          refreshDashboard();
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#0F172A] text-slate-100 flex flex-col justify-between max-w-lg mx-auto border-x border-slate-800/80 shadow-2xl relative">
      <div className="p-4 sm:p-5 space-y-4 pb-24 overflow-y-auto">
        {/* Header bar: User & Halagel badge */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-base shadow-sm">
              {user?.name?.[0] || 'H'}
            </div>
            <div>
              <p className="text-[11px] text-slate-400">Selamat Datang,</p>
              <h2 className="text-base font-bold text-white tracking-tight leading-tight">
                {user?.name || 'Kakitangan Halagel'}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="px-3 py-1 rounded-full bg-slate-800/90 border border-emerald-500/30 text-emerald-400 text-xs font-bold tracking-wide flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Halagel (M)
            </div>
            {localStorage.getItem('halagel_google_spreadsheet_id_v1') && (
              <span className="hidden sm:flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                Sheets Live
              </span>
            )}
            <button
              onClick={logout}
              title="Log Keluar"
              className="p-2 rounded-xl bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Real-time Clock Card */}
        <div className="bg-[#182234] border border-slate-700/80 rounded-3xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
          <div className="relative z-10 flex flex-col items-center text-center">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700 text-slate-300 text-xs mb-3">
              <Clock className="w-3.5 h-3.5 text-emerald-400" />
              <span>Waktu Standard Malaysia (MYT)</span>
            </div>

            <div className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight font-mono py-1">
              {timeString}
            </div>

            <div className="text-xs text-slate-400 font-medium mt-1">
              {dateString}
            </div>

            {/* Geofence Status Pill & GPS Precision Prompt Trigger */}
            <div className="mt-4 flex flex-col sm:flex-row items-center gap-2">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-700/80 text-xs">
                <MapPin className={`w-3.5 h-3.5 ${isInsideRadius ? 'text-emerald-400' : 'text-amber-400'}`} />
                <span className="text-slate-300">
                  {assignedOffice?.name || 'Ibu Pejabat Halagel'}:
                </span>
                <strong className={isInsideRadius ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
                  {isInsideRadius ? 'Dalam Radius' : 'Luar Radius'} ({distanceToOffice ?? 0}m)
                </strong>
              </div>

              <button
                type="button"
                onClick={() => setPermissionPromptOpen(true)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[11px] font-bold transition active:scale-95 cursor-pointer ${
                  isPreciseGps
                    ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/25'
                    : 'bg-amber-500/20 border-amber-500/50 text-amber-300 hover:bg-amber-500/30 animate-pulse'
                }`}
              >
                <Navigation className="w-3.5 h-3.5" />
                <span>{isPreciseGps ? `GPS Tepat Aktif (±${userLocation?.accuracy || 10}m)` : 'Semak & Minta GPS Tepat'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Working Hours Policy Badge */}
        <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-700/80 text-xs space-y-2 shadow-md">
          <div className="flex items-center justify-between">
            <span className="font-bold text-white flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              Jadual Waktu Bekerja Rasmi Halagel
            </span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-bold text-[10px] border border-emerald-500/20">
              Syarat 8 Jam / Half-Day
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-300">
            <div className="bg-slate-800/80 p-2 rounded-xl border border-slate-700/60">
              <div className="text-slate-400 text-[10px]">Ahad – Rabu (Hari Penuh):</div>
              <div className="text-emerald-400 font-bold">8:30 AM – 6:00 PM</div>
              <div className="text-slate-400 text-[9px] mt-0.5">Rehat: 12:45 PM – 1:45 PM</div>
            </div>
            <div className="bg-slate-800/80 p-2 rounded-xl border border-slate-700/60">
              <div className="text-amber-400 font-bold text-[10px]">Hari Khamis (Fleksi Pagi):</div>
              <div className="text-white font-bold">8:00 AM – 6:00 PM</div>
              <div className="text-emerald-400 text-[9px] font-semibold mt-0.5">✓ Masuk hingga 8:30 AM tidak dikira lambat</div>
            </div>
          </div>

          {/* Half-Day Options */}
          <div className="p-2 rounded-xl bg-slate-800/50 border border-slate-700/50 text-[11px] space-y-1">
            <div className="text-[10px] font-bold text-purple-300 flex items-center gap-1">
              <span>⏱ Waktu Separuh Hari (Half-Day):</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-300">
              <div>
                <span className="text-slate-400">Sesi Pagi: </span>
                <strong className="text-emerald-300">8:00 AM – 1:15 PM</strong>
              </div>
              <div>
                <span className="text-slate-400">Sesi Petang: </span>
                <strong className="text-emerald-300">1:15 PM – 6:00 PM</strong>
              </div>
            </div>
          </div>

          <p className="text-[10px] text-slate-400 pt-0.5 leading-snug">
            *Kakitangan yang masuk lewat atau keluar awal dikira <span className="text-amber-400 font-semibold">Lambat</span> kecuali mencukupi <span className="text-emerald-400 font-semibold">8 jam bekerja</span> atau lengkapkan <span className="text-purple-300 font-semibold">Separuh Hari</span>.
          </p>
        </div>

        {/* Location Permission Prompt Modal */}
        <LocationPermissionPrompt
          isOpen={permissionPromptOpen}
          onClose={() => setPermissionPromptOpen(false)}
          onLocationObtained={(pos) => setUserCustomLocation(pos)}
          officeName={assignedOffice?.name}
          radiusMeters={assignedOffice?.radiusMeters}
        />

        {/* Live Interactive Map Card */}
        <div className="bg-[#182234] border border-slate-700/80 rounded-3xl p-3.5 sm:p-4 shadow-xl space-y-2.5">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2 text-xs font-bold text-white">
              <MapPin className="w-4 h-4 text-emerald-400" />
              <span>Peta Satelit & Zon Kehadiran Geofens</span>
            </div>
            <span className="text-[10px] text-slate-400 font-medium">Boleh seret & zum</span>
          </div>
          <GeofenceMap
            office={assignedOffice}
            userLocation={userLocation}
            isInsideRadius={isInsideRadius}
            distanceMeters={distanceToOffice}
            heightClass="h-44"
            defaultSatellite={true}
          />
        </div>

        {/* Big Action Button (Clock In / Clock Out) */}
        <div className="pt-2">
          <button
            onClick={() => setShowFlowModal(true)}
            className={`w-full py-4 px-6 rounded-2xl flex items-center justify-between shadow-xl transition cursor-pointer ${
              isClockIn
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-bold hover:from-emerald-400 hover:to-teal-400 shadow-emerald-500/20'
                : 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-bold hover:from-amber-400 hover:to-orange-400 shadow-amber-500/20'
            }`}
          >
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-slate-950/15 flex items-center justify-center">
                <Fingerprint className="w-6 h-6 text-slate-950" />
              </div>
              <div className="text-left">
                <div className="text-base font-extrabold leading-tight">
                  {isClockIn ? 'Rakam Kehadiran Masuk' : 'Rakam Kehadiran Keluar'}
                </div>
                <div className="text-xs text-slate-900/80 font-medium">
                  {isClockIn ? 'Imbas lokasi & pengesahan wajah' : `Sedang bertugas sejak ${openSession?.clockInTimeKL?.split(',')[1] || ''}`}
                </div>
              </div>
            </div>
            <ChevronRight className="w-6 h-6 text-slate-950/70" />
          </button>
        </div>

        {/* Quick Menu Tiles */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <button
            onClick={() => setActiveScreen('HISTORY')}
            className="p-4 rounded-2xl bg-[#182234] border border-slate-800 hover:border-slate-700 text-left transition flex flex-col justify-between h-28"
          >
            <div className="w-9 h-9 rounded-xl bg-blue-500/15 text-blue-400 flex items-center justify-center">
              <History className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-white">Sejarah Kehadiran</div>
              <div className="text-[11px] text-slate-400">Lihat log & jam kerja</div>
            </div>
          </button>

          <button
            onClick={() => setActiveScreen('ENROL')}
            className="p-4 rounded-2xl bg-[#182234] border border-slate-800 hover:border-slate-700 text-left transition flex flex-col justify-between h-28"
          >
            <div className="w-9 h-9 rounded-xl bg-purple-500/15 text-purple-400 flex items-center justify-center">
              <ScanFace className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-white">Daftar Wajah</div>
              <div className="text-[11px] text-slate-400">
                {user?.faceEnrolled ? '✓ Wajah didaftarkan' : 'Perlu pendaftaran'}
              </div>
            </div>
          </button>
        </div>

        {/* Profile Card */}
        <div className="p-4 rounded-2xl bg-[#182234] border border-slate-800/80 text-xs space-y-2">
          <div className="text-slate-400 font-semibold mb-1">Maklumat Penempatan Kerja:</div>
          <div className="flex justify-between py-1 border-b border-slate-800">
            <span className="text-slate-400">ID Kakitangan:</span>
            <span className="text-white font-medium">{user?.employeeId}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-slate-800">
            <span className="text-slate-400">Jabatan:</span>
            <span className="text-white font-medium">{user?.department}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-slate-800">
            <span className="text-slate-400">Cawangan Rasmi:</span>
            <span className="text-white font-medium">{assignedOffice?.name}</span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-slate-400">Alamat:</span>
            <span className="text-white font-medium text-right max-w-[200px] truncate">{assignedOffice?.address}</span>
          </div>
        </div>
      </div>

      {/* Attendance Modal */}
      {showFlowModal && (
        <AttendanceFlow
          isClockIn={isClockIn}
          onClose={() => setShowFlowModal(false)}
          onSuccess={() => {
            refreshDashboard();
          }}
          onNavigateToFaceEnrol={() => {
            setActiveScreen('ENROL');
          }}
        />
      )}
    </div>
  );
};
