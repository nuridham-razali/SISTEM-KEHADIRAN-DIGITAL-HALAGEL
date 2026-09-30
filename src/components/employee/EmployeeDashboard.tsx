import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useAttendance } from '../../context/AttendanceContext';
import { AttendanceFlow } from './AttendanceFlow';
import { AttendanceHistory } from './AttendanceHistory';
import { FaceEnrolment } from './FaceEnrolment';
import { GeofenceMap } from '../common/GeofenceMap';
import { LocationPermissionPrompt } from '../common/LocationPermissionPrompt';
import { googleSheetsDb } from '../../services/googleSheetsDb';
import { HALAGEL_LOGO } from '../../assets/logo';
import {
  Fingerprint,
  Clock,
  MapPin,
  Timer,
  LogOut,
  ChevronRight,
  History,
  Building2,
  ScanFace,
  CheckCircle2,
  AlertCircle,
  Navigation,
  Car,
  Briefcase,
  Coffee,
  Home,
  ArrowRightLeft,
  Sparkles,
  Info,
} from 'lucide-react';

export const EmployeeDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const {
    dashboard,
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
  const [flowPresetEntry, setFlowPresetEntry] = useState<string | undefined>(undefined);
  const [flowPresetExit, setFlowPresetExit] = useState<string | undefined>(undefined);
  const [flowIsOutstation, setFlowIsOutstation] = useState<boolean>(false);
  const [currentDate, setCurrentDate] = useState<Date>(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDate(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const openSession = dashboard?.openSession;
  const isClockIn = openSession == null;
  const todayRecords = dashboard?.todayRecords || [];

  // Calculate today's cumulative worked hours
  const totalWorkedHoursToday = todayRecords.reduce((acc, r) => acc + (r.workedHours || 0), 0);
  const hoursProgress = Math.min(100, Math.round((totalWorkedHoursToday / 8.0) * 100));

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

  // Helper to open attendance modal with preselected presets
  const handleOpenAttendance = (options?: {
    entryType?: string;
    exitType?: string;
    isOutstation?: boolean;
  }) => {
    setFlowPresetEntry(options?.entryType);
    setFlowPresetExit(options?.exitType);
    setFlowIsOutstation(options?.isOutstation ?? false);
    setShowFlowModal(true);
  };

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
            <div className="px-2.5 py-1 rounded-xl bg-white border border-emerald-500/30 shadow-sm flex items-center justify-center">
              <img
                src={HALAGEL_LOGO}
                alt="Halagel Logo"
                className="h-6 w-auto object-contain"
              />
            </div>
            {Boolean(googleSheetsDb.getSavedSpreadsheetId() || googleSheetsDb.getSavedWebhookUrl()) && (
              <span className="hidden sm:flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                Sheets Live
              </span>
            )}
            <button
              onClick={logout}
              title="Log Keluar"
              className="p-2 rounded-xl bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition cursor-pointer"
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

        {/* ACTIVE SESSION STATUS BADGE */}
        {openSession ? (
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/40 shadow-lg text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 font-bold text-amber-300">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
                Sesi Bertugas Sedang Berjalan
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                {openSession.isOutstation ? 'Luar Kawasan (Outstation)' : 'Dalam Premis Kilang'}
              </span>
            </div>
            <div className="text-slate-200">
              Masuk: <strong className="text-white">{openSession.clockInTimeKL?.split(',')[1] || openSession.clockInTimeKL}</strong>
              {openSession.entryType && (
                <span className="text-slate-400"> • Tujuan: <strong className="text-amber-200">{openSession.entryType}</strong></span>
              )}
            </div>
            {openSession.clockInRemarks && (
              <div className="text-[11px] text-slate-300 bg-slate-900/60 p-2 rounded-xl border border-amber-500/20">
                Catatan Masuk: <em>"{openSession.clockInRemarks}"</em>
              </div>
            )}
            {openSession.isOutstation && openSession.outstationLocation && (
              <div className="text-[11px] text-blue-300 bg-blue-500/10 p-2 rounded-xl border border-blue-500/20 flex items-center gap-1.5">
                <Car className="w-3.5 h-3.5 shrink-0" />
                <span>Lokasi Outstation: <strong>{openSession.outstationLocation}</strong></span>
              </div>
            )}
          </div>
        ) : (
          <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-300">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              <span>Status Semasa: <strong className="text-white">Tiada Sesi Aktif (Sedia Rakam Masuk)</strong></span>
            </div>
            <span className="text-[11px] text-emerald-400 font-semibold">
              {todayRecords.length} rekod hari ini
            </span>
          </div>
        )}

        {/* Cumulative Worked Hours Card */}
        <div className="p-4 rounded-2xl bg-[#182234] border border-slate-700/80 shadow-md space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-white flex items-center gap-1.5">
              <Timer className="w-4 h-4 text-emerald-400" />
              <span>Jumlah Jam Bekerja Terkumpul Hari Ini</span>
            </span>
            <span className="font-extrabold text-emerald-400 font-mono text-sm">
              {totalWorkedHoursToday.toFixed(2)} / 8.0 jam
            </span>
          </div>

          <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800">
            <div
              className={`h-full transition-all duration-500 ${
                totalWorkedHoursToday >= 8.0
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                  : 'bg-gradient-to-r from-blue-500 to-emerald-400'
              }`}
              style={{ width: `${hoursProgress}%` }}
            />
          </div>

          <div className="flex justify-between text-[10px] text-slate-400">
            <span>{hoursProgress}% daripada 8 jam harian</span>
            <span>{totalWorkedHoursToday >= 8.0 ? '✓ Sasaran 8 Jam Dicapai' : `Baki ${(Math.max(0, 8.0 - totalWorkedHoursToday)).toFixed(1)} jam`}</span>
          </div>
        </div>

        {/* MAIN BIG ACTION BUTTON (Clock In or Clock Out) */}
        <div className="pt-1">
          <button
            onClick={() => handleOpenAttendance()}
            className={`w-full py-4 px-6 rounded-2xl flex items-center justify-between shadow-xl transition cursor-pointer ${
              isClockIn
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-bold hover:from-emerald-400 hover:to-teal-400 shadow-emerald-500/20 active:scale-[0.98]'
                : 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-bold hover:from-amber-400 hover:to-orange-400 shadow-amber-500/20 active:scale-[0.98]'
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
                  {isClockIn
                    ? 'Pilih tujuan: Masuk Kerja / Beli Barang / Rehat'
                    : 'Pilih tujuan: Balik / Keluar Beli Barang / Rehat'}
                </div>
              </div>
            </div>
            <ChevronRight className="w-6 h-6 text-slate-950/70" />
          </button>
        </div>

        {/* QUICK SHORTCUT BUTTONS (FAST SITUATIONAL LAUNCHERS) */}
        <div className="space-y-1.5">
          <div className="text-[11px] font-bold text-slate-400 px-1 flex items-center justify-between">
            <span>Pilihan Pantas Situasi Anda:</span>
            <span className="text-[10px] text-slate-500">1-Klik Buka Rakam</span>
          </div>

          {isClockIn ? (
            /* Fast Clock In Options */
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleOpenAttendance({ entryType: 'Datang Bekerja (Masuk Pagi / Syif Awal)', isOutstation: false })}
                className="p-2.5 rounded-xl bg-[#182234] border border-slate-800 hover:border-emerald-500/50 text-left transition flex items-center gap-2 cursor-pointer"
              >
                <div className="p-1.5 rounded-lg bg-emerald-500/15 text-emerald-400">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white">Datang Bekerja</div>
                  <div className="text-[9px] text-slate-400">Masuk pagi / syif biasa</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleOpenAttendance({ entryType: 'Masuk Semula (Selepas Urusan Kerja / Pembelian Luar)', isOutstation: false })}
                className="p-2.5 rounded-xl bg-[#182234] border border-slate-800 hover:border-blue-500/50 text-left transition flex items-center gap-2 cursor-pointer"
              >
                <div className="p-1.5 rounded-lg bg-blue-500/15 text-blue-400">
                  <Briefcase className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white">Masuk Balik Beli Barang</div>
                  <div className="text-[9px] text-slate-400">Selepas urusan luar kilang</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleOpenAttendance({ entryType: 'Masuk Semula (Selepas Rehat / Makan)', isOutstation: false })}
                className="p-2.5 rounded-xl bg-[#182234] border border-slate-800 hover:border-amber-500/50 text-left transition flex items-center gap-2 cursor-pointer"
              >
                <div className="p-1.5 rounded-lg bg-amber-500/15 text-amber-400">
                  <Coffee className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white">Masuk Lepas Rehat</div>
                  <div className="text-[9px] text-slate-400">Selepas makan tengah hari</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleOpenAttendance({ entryType: 'Daftar Masuk Luar Kawasan (Outstation)', isOutstation: true })}
                className="p-2.5 rounded-xl bg-[#182234] border border-slate-800 hover:border-purple-500/50 text-left transition flex items-center gap-2 cursor-pointer"
              >
                <div className="p-1.5 rounded-lg bg-purple-500/15 text-purple-400">
                  <Car className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-purple-300">Masuk Outstation</div>
                  <div className="text-[9px] text-slate-400">Kerja luar kawasan tapak</div>
                </div>
              </button>
            </div>
          ) : (
            /* Fast Clock Out Options */
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleOpenAttendance({ exitType: 'Balik / Tamat Waktu Bekerja', isOutstation: false })}
                className="p-2.5 rounded-xl bg-[#182234] border border-slate-800 hover:border-emerald-500/50 text-left transition flex items-center gap-2 cursor-pointer"
              >
                <div className="p-1.5 rounded-lg bg-emerald-500/15 text-emerald-400">
                  <Home className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white">Balik / Tamat Kerja</div>
                  <div className="text-[9px] text-slate-400">Habis waktu bekerja</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleOpenAttendance({ exitType: 'Keluar Kilang (Urusan Kerja / Pembelian Barang)', isOutstation: false })}
                className="p-2.5 rounded-xl bg-[#182234] border border-slate-800 hover:border-blue-500/50 text-left transition flex items-center gap-2 cursor-pointer"
              >
                <div className="p-1.5 rounded-lg bg-blue-500/15 text-blue-400">
                  <Briefcase className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white">Keluar Beli Barang</div>
                  <div className="text-[9px] text-slate-400">Urusan alat ganti / kerja</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleOpenAttendance({ exitType: 'Keluar Rehat / Makan Tengah Hari', isOutstation: false })}
                className="p-2.5 rounded-xl bg-[#182234] border border-slate-800 hover:border-amber-500/50 text-left transition flex items-center gap-2 cursor-pointer"
              >
                <div className="p-1.5 rounded-lg bg-amber-500/15 text-amber-400">
                  <Coffee className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white">Keluar Rehat / Makan</div>
                  <div className="text-[9px] text-slate-400">12:45 PM – 1:45 PM</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleOpenAttendance({ exitType: 'Daftar Keluar Luar Kawasan (Outstation)', isOutstation: true })}
                className="p-2.5 rounded-xl bg-[#182234] border border-slate-800 hover:border-purple-500/50 text-left transition flex items-center gap-2 cursor-pointer"
              >
                <div className="p-1.5 rounded-lg bg-purple-500/15 text-purple-400">
                  <Car className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-purple-300">Keluar Outstation</div>
                  <div className="text-[9px] text-slate-400">Tugasan luar kawasan</div>
                </div>
              </button>
            </div>
          )}
        </div>

        {/* TODAY'S TIMELINE / MOVEMENT LOG (LOG KELUAR MASUK HARI INI) */}
        <div className="p-4 rounded-3xl bg-[#182234] border border-slate-700/80 shadow-xl space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center gap-2 text-xs font-bold text-white">
              <ArrowRightLeft className="w-4 h-4 text-emerald-400" />
              <span>Log Pergerakan Keluar Masuk Hari Ini</span>
            </div>
            <span className="text-[10px] text-slate-400 font-semibold bg-slate-800 px-2 py-0.5 rounded-full">
              {todayRecords.length} Sesi Direkodkan
            </span>
          </div>

          {todayRecords.length === 0 ? (
            <div className="text-center py-6 text-slate-400 text-xs">
              <Clock className="w-7 h-7 text-slate-600 mx-auto mb-1.5" />
              <p>Belum ada rekod kehadiran untuk hari ini.</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Sila tekan butang hijau di atas untuk daftar masuk sesi pertama.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {todayRecords.map((rec, idx) => (
                <div
                  key={rec.sessionId}
                  className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800 text-xs space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-[11px] flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] flex items-center justify-center font-bold">
                        {idx + 1}
                      </span>
                      <span>Sesi Kehadiran #{idx + 1}</span>
                    </span>

                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        rec.attendanceStatus === 'COMPLETED'
                          ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                          : rec.attendanceStatus === 'IN_PROGRESS'
                          ? 'bg-blue-500/15 text-blue-400 border-blue-500/30 animate-pulse'
                          : rec.attendanceStatus === 'URUSAN_LUAR'
                          ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                          : rec.attendanceStatus === 'REHAT'
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                          : rec.attendanceStatus === 'OUTSTATION'
                          ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                          : 'bg-slate-800 text-slate-300 border-slate-700'
                      }`}
                    >
                      {rec.attendanceStatus === 'COMPLETED'
                        ? 'Selesai'
                        : rec.attendanceStatus === 'IN_PROGRESS'
                        ? 'Sedang Bertugas'
                        : rec.attendanceStatus === 'URUSAN_LUAR'
                        ? 'Urusan Luar / Beli Barang'
                        : rec.attendanceStatus === 'REHAT'
                        ? 'Keluar Rehat'
                        : rec.attendanceStatus === 'OUTSTATION'
                        ? 'Outstation'
                        : rec.attendanceStatus}
                    </span>
                  </div>

                  {/* Times Grid */}
                  <div className="grid grid-cols-2 gap-2 text-[11px] pt-0.5">
                    <div className="bg-slate-800/60 p-2 rounded-xl border border-slate-800">
                      <div className="text-[10px] text-slate-400 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                        <span>Waktu Masuk:</span>
                      </div>
                      <div className="font-bold text-white text-xs mt-0.5">
                        {rec.clockInTimeKL?.split(',')[1] || rec.clockInTimeKL}
                      </div>
                      <div className="text-[10px] text-emerald-300/90 truncate mt-0.5">
                        {rec.entryType || 'Datang Bekerja'}
                      </div>
                      {rec.clockInRemarks && (
                        <div className="text-[9px] text-slate-400 italic truncate mt-0.5">
                          "{rec.clockInRemarks}"
                        </div>
                      )}
                    </div>

                    <div className="bg-slate-800/60 p-2 rounded-xl border border-slate-800">
                      <div className="text-[10px] text-slate-400 flex items-center gap-1">
                        <span className={`w-1.5 h-1.5 rounded-full ${rec.clockOutTimeKL ? 'bg-amber-400' : 'bg-blue-400 animate-ping'}`}></span>
                        <span>Waktu Keluar:</span>
                      </div>
                      <div className="font-bold text-white text-xs mt-0.5">
                        {rec.clockOutTimeKL ? (rec.clockOutTimeKL.split(',')[1] || rec.clockOutTimeKL) : (
                          <span className="text-blue-400 font-semibold animate-pulse">Sedang Bertugas</span>
                        )}
                      </div>
                      <div className="text-[10px] text-amber-300/90 truncate mt-0.5">
                        {rec.clockOutTimeKL ? (rec.exitType || 'Keluar') : 'Belum Keluar'}
                      </div>
                      {rec.clockOutRemarks && (
                        <div className="text-[9px] text-slate-400 italic truncate mt-0.5">
                          "{rec.clockOutRemarks}"
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Outstation Info if present */}
                  {rec.isOutstation && rec.outstationLocation && (
                    <div className="text-[10px] text-purple-300 bg-purple-500/10 px-2.5 py-1 rounded-lg border border-purple-500/30 flex items-center gap-1.5">
                      <Car className="w-3 h-3 text-purple-400 shrink-0" />
                      <span>Lokasi Luar Kawasan: <strong>{rec.outstationLocation}</strong></span>
                    </div>
                  )}

                  {/* Footer details: duration & geofence */}
                  <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-800/60">
                    <span>Geofens: <strong className="text-slate-300">{rec.isOutstation ? 'Outstation' : `${rec.clockInDistanceMeters ?? 0}m`}</strong></span>
                    <span>Wajah: <strong className="text-emerald-400">✓ Disahkan</strong></span>
                    <span>Tempoh: <strong className="text-emerald-300">{rec.workedHours ? `${rec.workedHours} jam` : '-'}</strong></span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Live Satellite Map Card */}
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

        {/* Quick Menu Tiles */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          <button
            onClick={() => setActiveScreen('HISTORY')}
            className="p-4 rounded-2xl bg-[#182234] border border-slate-800 hover:border-slate-700 text-left transition flex flex-col justify-between h-28 cursor-pointer"
          >
            <div className="w-9 h-9 rounded-xl bg-blue-500/15 text-blue-400 flex items-center justify-center">
              <History className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-white">Sejarah Kehadiran</div>
              <div className="text-[11px] text-slate-400">Semua log masuk & keluar</div>
            </div>
          </button>

          <button
            onClick={() => setActiveScreen('ENROL')}
            className="p-4 rounded-2xl bg-[#182234] border border-slate-800 hover:border-slate-700 text-left transition flex flex-col justify-between h-28 cursor-pointer"
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

        {/* Location Permission Prompt Modal */}
        <LocationPermissionPrompt
          isOpen={permissionPromptOpen}
          onClose={() => setPermissionPromptOpen(false)}
          onLocationObtained={(pos) => setUserCustomLocation(pos)}
          officeName={assignedOffice?.name}
          radiusMeters={assignedOffice?.radiusMeters}
        />
      </div>

      {/* Attendance Modal Flow */}
      {showFlowModal && (
        <AttendanceFlow
          isClockIn={isClockIn}
          initialEntryType={flowPresetEntry}
          initialExitType={flowPresetExit}
          initialIsOutstation={flowIsOutstation}
          onClose={() => {
            setShowFlowModal(false);
            setFlowPresetEntry(undefined);
            setFlowPresetExit(undefined);
            setFlowIsOutstation(false);
          }}
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
