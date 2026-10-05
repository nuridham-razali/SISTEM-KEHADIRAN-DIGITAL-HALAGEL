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
import { getHalagelBackground } from '../../assets/background';
import { formatWorkedDuration } from '../../utils/workingHours';
import {
  Clock,
  MapPin,
  LogOut,
  History,
  ScanFace,
  CheckCircle2,
  AlertCircle,
  Navigation,
  Car,
  Briefcase,
  Coffee,
  Home,
  ArrowRightLeft,
  Calendar,
  FileText,
  BarChart3,
  LayoutDashboard,
  X,
  Menu,
  ChevronRight,
  ShieldCheck,
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

  // Navigation tabs
  const [activeNav, setActiveNav] = useState<'OVERVIEW' | 'ATTENDANCE' | 'SCHEDULE' | 'LEAVE' | 'REPORT'>('OVERVIEW');
  const [activeScreen, setActiveScreen] = useState<'HOME' | 'HISTORY' | 'ENROL'>('HOME');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Modal dialog states
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);

  // Attendance flow
  const [showFlowModal, setShowFlowModal] = useState(false);
  const [flowPresetEntry, setFlowPresetEntry] = useState<string | undefined>(undefined);
  const [flowPresetExit, setFlowPresetExit] = useState<string | undefined>(undefined);
  const [flowIsOutstation, setFlowIsOutstation] = useState<boolean>(false);
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [bgImage, setBgImage] = useState<string>(getHalagelBackground());

  useEffect(() => {
    setBgImage(getHalagelBackground());
  }, []);

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

  // Dynamic user details
  const fullName = user?.name || 'Idham Razali';
  const firstName = fullName.split(' ')[0] || 'Idham';
  const initials = fullName
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'IR';
  const roleName = user?.role === 'admin' ? 'Pentadbir' : 'Kakitangan';

  // Greeting based on time of day
  const getGreeting = () => {
    const hr = currentDate.getHours();
    if (hr < 12) return 'Selamat pagi';
    if (hr < 14) return 'Selamat tengah hari';
    if (hr < 19) return 'Selamat petang';
    return 'Selamat malam';
  };

  // Full long Malay date matching design: "Isnin, 5 Oktober 2026"
  const formattedLongDate = new Intl.DateTimeFormat('ms-MY', {
    timeZone: 'Asia/Kuala_Lumpur',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(currentDate);

  // Time display (HH:MM:SS)
  const timeString = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kuala_Lumpur',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(currentDate);

  // Clock in / out display times
  const inTimeString = openSession?.clockInTimeKL
    ? openSession.clockInTimeKL.split(',')[1]?.trim() || openSession.clockInTimeKL
    : todayRecords[0]?.clockInTimeKL
    ? todayRecords[0].clockInTimeKL.split(',')[1]?.trim() || todayRecords[0].clockInTimeKL
    : '--:--';

  const outTimeString = todayRecords[0]?.clockOutTimeKL
    ? todayRecords[0].clockOutTimeKL.split(',')[1]?.trim() || todayRecords[0].clockOutTimeKL
    : '--:--';

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
    <div
      style={{
        backgroundImage: `url("${bgImage}")`,
      }}
      className="min-h-screen bg-cover bg-center bg-no-repeat bg-fixed relative flex flex-col lg:flex-row p-3 sm:p-5 lg:p-6 gap-4 sm:gap-6 overflow-x-hidden font-sans"
    >
      {/* Light luminous backdrop overlay for high contrast and crisp legibility */}
      <div className="absolute inset-0 bg-slate-50/75 backdrop-blur-[2px] pointer-events-none" />

      {/* MOBILE TOP BAR (Logo + Drawer trigger + Profile Capsule) */}
      <div className="lg:hidden relative z-20 flex items-center justify-between bg-white/95 backdrop-blur-md px-4 py-3 rounded-2xl border border-slate-200 shadow-md text-slate-800">
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
            title="Menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <img src={HALAGEL_LOGO} alt="Halagel" className="h-8 w-auto object-contain" />
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 bg-slate-100 px-3 py-1 rounded-full text-slate-900 border border-slate-200 shadow-xs">
            <div className="w-6 h-6 rounded-full bg-[#5b7e22] text-white flex items-center justify-center font-bold text-[10px]">
              {initials}
            </div>
            <span className="text-xs font-bold truncate max-w-[100px]">{firstName}</span>
          </div>
          <button
            onClick={logout}
            className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 transition cursor-pointer"
            title="Log Keluar"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* LEFT SIDEBAR (Light theme modern card) */}
      <aside
        className={`${
          mobileMenuOpen ? 'flex' : 'hidden'
        } lg:flex flex-col justify-between w-full lg:w-64 xl:w-72 bg-white/95 backdrop-blur-md rounded-3xl p-5 border border-slate-200/90 shadow-xl text-slate-800 shrink-0 relative z-30 transition-all`}
      >
        <div>
          {/* Halagel Logo container */}
          <div className="flex items-center justify-center pt-2 pb-4">
            <img
              src={HALAGEL_LOGO}
              alt="Halagel Logo"
              className="h-16 w-auto object-contain"
            />
          </div>

          {/* Section Header: MENU UTAMA */}
          <div className="text-[10px] font-black tracking-widest text-slate-400 uppercase mt-4 mb-3 px-3">
            MENU UTAMA
          </div>

          {/* Navigation Pill List */}
          <nav className="space-y-1.5 text-xs font-semibold">
            {/* 1. Overview (Active by default) */}
            <button
              onClick={() => {
                setActiveNav('OVERVIEW');
                setMobileMenuOpen(false);
              }}
              className={`w-full py-3 px-4 rounded-2xl flex items-center gap-3 transition text-left cursor-pointer ${
                activeNav === 'OVERVIEW'
                  ? 'bg-[#5b7e22] text-white font-bold shadow-md shadow-[#5b7e22]/25'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <span className={`w-2.5 h-2.5 rounded-full ${activeNav === 'OVERVIEW' ? 'bg-white' : 'bg-[#5b7e22]'}`} />
              <span className="text-sm">Overview</span>
            </button>

            {/* 2. Kehadiran */}
            <button
              onClick={() => {
                setActiveNav('ATTENDANCE');
                setMobileMenuOpen(false);
              }}
              className={`w-full py-3 px-4 rounded-2xl flex items-center gap-3 transition text-left cursor-pointer ${
                activeNav === 'ATTENDANCE'
                  ? 'bg-[#5b7e22] text-white font-bold shadow-md shadow-[#5b7e22]/25'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <span className={`w-2.5 h-2.5 rounded-full ${activeNav === 'ATTENDANCE' ? 'bg-white' : 'bg-[#5b7e22]'}`} />
              <span className="text-sm">Kehadiran</span>
            </button>

            {/* 3. Jadual Kerja */}
            <button
              onClick={() => {
                setShowScheduleModal(true);
                setMobileMenuOpen(false);
              }}
              className="w-full py-3 px-4 rounded-2xl flex items-center gap-3 text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition text-left cursor-pointer"
            >
              <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
              <span className="text-sm">Jadual Kerja</span>
            </button>

            {/* 4. Permohonan Cuti */}
            <button
              onClick={() => {
                setShowLeaveModal(true);
                setMobileMenuOpen(false);
              }}
              className="w-full py-3 px-4 rounded-2xl flex items-center gap-3 text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition text-left cursor-pointer"
            >
              <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
              <span className="text-sm">Permohonan Cuti</span>
            </button>

            {/* 5. Laporan */}
            <button
              onClick={() => {
                setShowReportModal(true);
                setMobileMenuOpen(false);
              }}
              className="w-full py-3 px-4 rounded-2xl flex items-center gap-3 text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition text-left cursor-pointer"
            >
              <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
              <span className="text-sm">Laporan</span>
            </button>
          </nav>
        </div>

        {/* BOTTOM USER PROFILE CARD IN SIDEBAR */}
        <div className="pt-4 mt-6 border-t border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-900 flex items-center justify-center font-black text-sm shrink-0 border border-slate-200 shadow-xs">
              {user?.facePhotoUrl ? (
                <img src={user.facePhotoUrl} alt="User" className="w-full h-full rounded-full object-cover" />
              ) : (
                <span>{initials}</span>
              )}
            </div>
            <div className="min-w-0">
              <div className="font-bold text-slate-900 text-sm truncate">{fullName}</div>
              <div className="text-[11px] text-slate-500 capitalize">{roleName}</div>
            </div>
          </div>

          <button
            onClick={logout}
            className="p-2 rounded-xl bg-slate-100 hover:bg-red-50 text-slate-500 hover:text-red-600 transition cursor-pointer border border-slate-200"
            title="Log Keluar"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col justify-between relative z-10 min-w-0">
        <div>
          {/* TOP HEADER ROW: Greeting on Left, White Capsule Pill on Right */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-1 sm:pt-2">
            <div>
              <div className="text-xs font-black tracking-widest text-[#4d6b1d] uppercase mb-1">
                LAMAN UTAMA
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight">
                {getGreeting()}, {firstName}
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 font-medium mt-1">
                Semoga hari anda produktif. Rekod kehadiran anda di sini.
              </p>
            </div>

            {/* Top Right Floating Profile Capsule */}
            <div className="hidden lg:flex items-center gap-3 bg-white/95 backdrop-blur-md rounded-full px-4 py-2.5 shadow-md border border-slate-200 text-slate-900">
              <div className="w-9 h-9 rounded-full bg-[#5b7e22] text-white flex items-center justify-center font-bold text-xs shadow-xs">
                {initials}
              </div>
              <div className="text-left pr-2">
                <div className="text-xs font-bold leading-tight">{fullName}</div>
                <div className="text-[10px] text-slate-500 font-medium capitalize">{roleName}</div>
              </div>
              <button
                onClick={logout}
                title="Log Keluar"
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-red-500 transition cursor-pointer ml-1"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* MAIN HERO CARD: KEHADIRAN HARI INI */}
          <div className="bg-white/95 backdrop-blur-md rounded-3xl p-6 sm:p-7 shadow-2xl border border-white/50 max-w-2xl text-slate-900 mt-6 sm:mt-8">
            <div className="text-[11px] font-black tracking-widest text-slate-500 uppercase">
              KEHADIRAN HARI INI
            </div>

            {/* Date matching design: "Isnin, 5 Oktober 2026" */}
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 mt-1 mb-2.5">
              {formattedLongDate}
            </h2>

            {/* Status Badge */}
            <div>
              {openSession ? (
                <div className="bg-amber-100 text-amber-900 font-bold text-xs rounded-full px-3.5 py-1.5 inline-flex items-center gap-2 border border-amber-300 animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  <span>Sedang bertugas ({openSession.entryType || 'Sesi Aktif'})</span>
                </div>
              ) : todayRecords.length > 0 ? (
                <div className="bg-emerald-100 text-emerald-900 font-bold text-xs rounded-full px-3.5 py-1.5 inline-flex items-center gap-2 border border-emerald-300">
                  <span className="w-2 h-2 rounded-full bg-emerald-600" />
                  <span>Selesai bertugas ({totalWorkedHoursToday.toFixed(2)} jam direkod)</span>
                </div>
              ) : (
                <div className="bg-[#edf3e2] text-[#4d6b1d] font-bold text-xs rounded-full px-3.5 py-1.5 inline-flex items-center gap-2 border border-[#d5e4be]">
                  <span className="w-2 h-2 rounded-full bg-[#5b7e22]" />
                  <span>Belum clock in</span>
                </div>
              )}
            </div>

            {/* Horizontal Line Divider */}
            <div className="border-t border-slate-200 my-4 sm:my-5" />

            {/* Times & Action Button Section */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-8 sm:gap-12">
                <div>
                  <div className="text-xs text-slate-500 font-medium">Waktu masuk</div>
                  <div className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-0.5 font-mono">
                    {inTimeString}
                  </div>
                </div>

                <div>
                  <div className="text-xs text-slate-500 font-medium">Waktu keluar</div>
                  <div className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-0.5 font-mono">
                    {outTimeString}
                  </div>
                </div>
              </div>

              {/* Moss green button matching screenshot: #5b7e22 */}
              <button
                type="button"
                onClick={() => handleOpenAttendance()}
                className="bg-[#5b7e22] hover:bg-[#4d6b1d] active:scale-95 text-white font-bold px-7 py-3.5 rounded-2xl shadow-lg shadow-[#5b7e22]/25 transition text-sm flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>{isClockIn ? 'Clock In Sekarang' : 'Clock Out Sekarang'}</span>
              </button>
            </div>
          </div>

          {/* LOWER ROW CARDS: RINGKASAN MINGGU INI & AKTIVITI TERKINI */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5 mt-4 sm:mt-5 max-w-2xl text-slate-900">
            {/* Card 1: RINGKASAN MINGGU INI */}
            <div className="bg-white/95 backdrop-blur-md rounded-3xl p-5 sm:p-6 shadow-xl border border-white/50 flex flex-col justify-between">
              <div>
                <div className="text-[10px] font-black tracking-widest text-slate-500 uppercase">
                  RINGKASAN MINGGU INI
                </div>
                <div className="text-xs text-slate-600 font-medium mt-2">Kehadiran</div>

                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-3xl sm:text-4xl font-black text-slate-900">
                    {todayRecords.length > 0 ? 1 : 0}
                  </span>
                  <span className="text-xs font-semibold text-slate-600">hari direkodkan</span>
                </div>

                {/* Progress bar matching design */}
                <div className="w-full bg-[#edf3e2] h-2.5 rounded-full overflow-hidden mt-3">
                  <div
                    className="bg-[#5b7e22] h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.max(10, hoursProgress))}%` }}
                  />
                </div>
              </div>

              {/* Live Geofence status info */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                <span className="flex items-center gap-1.5">
                  <MapPin className={`w-3.5 h-3.5 ${isInsideRadius ? 'text-emerald-600' : 'text-amber-500'}`} />
                  <span>{assignedOffice?.name || 'Ibu Pejabat Halagel'}</span>
                </span>
                <span className={`font-bold ${isInsideRadius ? 'text-emerald-700' : 'text-amber-600'}`}>
                  {isInsideRadius ? `Dalam Radius (${distanceToOffice ?? 0}m)` : `Luar Radius (${distanceToOffice ?? 0}m)`}
                </span>
              </div>
            </div>

            {/* Card 2: AKTIVITI TERKINI */}
            <div className="bg-white/95 backdrop-blur-md rounded-3xl p-5 sm:p-6 shadow-xl border border-white/50 flex flex-col justify-between">
              <div>
                <div className="text-[10px] font-black tracking-widest text-slate-500 uppercase">
                  AKTIVITI TERKINI
                </div>

                {todayRecords.length === 0 ? (
                  <div className="mt-4 flex items-start gap-3">
                    <div className="w-7 h-7 rounded-full bg-[#edf3e2] text-[#5b7e22] flex items-center justify-center shrink-0 mt-0.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#5b7e22]" />
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 text-sm">Tiada rekod lagi</div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        Rekod masuk anda akan muncul di sini.
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 space-y-2 max-h-36 overflow-y-auto pr-1">
                    {todayRecords.slice(0, 2).map((rec, i) => (
                      <div key={rec.sessionId || i} className="p-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
                        <div className="flex items-center justify-between font-bold text-slate-900">
                          <span>{rec.entryType || 'Sesi Kehadiran'}</span>
                          <span className="text-[10px] text-emerald-700 font-mono">
                            {rec.clockInTimeKL?.split(',')[1]?.trim() || rec.clockInTimeKL}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5 flex justify-between">
                          <span>Keluar: {rec.clockOutTimeKL ? (rec.clockOutTimeKL.split(',')[1]?.trim() || rec.clockOutTimeKL) : 'Belum'}</span>
                          {rec.workedHours ? <span className="font-bold text-[#5b7e22]">{rec.workedHours} jam</span> : null}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Quick links to History & Face enrolment */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <button
                  onClick={() => setActiveScreen('HISTORY')}
                  className="font-bold text-[#5b7e22] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <History className="w-3.5 h-3.5" />
                  <span>Lihat Sejarah</span>
                </button>
                <button
                  onClick={() => setActiveScreen('ENROL')}
                  className="font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1 cursor-pointer"
                >
                  <ScanFace className="w-3.5 h-3.5" />
                  <span>{user?.faceEnrolled ? 'Wajah Didaftar' : 'Daftar Wajah'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* VIEW: FULL ATTENDANCE TAB (When user clicks 'Kehadiran' in sidebar) */}
          {activeNav === 'ATTENDANCE' && (
            <div className="bg-white/95 backdrop-blur-md rounded-3xl p-6 shadow-2xl border border-white/50 max-w-2xl text-slate-900 mt-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div className="flex items-center gap-2">
                  <ArrowRightLeft className="w-5 h-5 text-[#5b7e22]" />
                  <h3 className="font-extrabold text-base text-slate-900">Pilihan Pantas Kehadiran</h3>
                </div>
                <button
                  onClick={() => setActiveNav('OVERVIEW')}
                  className="p-1 rounded-lg hover:bg-slate-100 text-slate-400"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Fast Situational Clock In / Out Launchers */}
              <div className="grid grid-cols-2 gap-2.5">
                {isClockIn ? (
                  <>
                    <button
                      type="button"
                      onClick={() => handleOpenAttendance({ entryType: 'Datang Bekerja (Masuk Pagi / Syif Awal)', isOutstation: false })}
                      className="p-3 rounded-2xl bg-slate-50 border border-slate-200 hover:border-[#5b7e22] text-left transition flex items-center gap-2.5 cursor-pointer"
                    >
                      <div className="p-2 rounded-xl bg-[#edf3e2] text-[#5b7e22]">
                        <Home className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900">Datang Bekerja</div>
                        <div className="text-[10px] text-slate-500">Masuk waktu rasmi</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenAttendance({ entryType: 'Masuk Semula (Selepas Rehat / Makan)', isOutstation: false })}
                      className="p-3 rounded-2xl bg-slate-50 border border-slate-200 hover:border-[#5b7e22] text-left transition flex items-center gap-2.5 cursor-pointer"
                    >
                      <div className="p-2 rounded-xl bg-amber-100 text-amber-800">
                        <Coffee className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900">Masuk Rehat</div>
                        <div className="text-[10px] text-slate-500">Selepas makan tengah hari</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenAttendance({ entryType: 'Masuk Semula (Selepas Urusan Kerja / Pembelian Luar)', isOutstation: false })}
                      className="p-3 rounded-2xl bg-slate-50 border border-slate-200 hover:border-[#5b7e22] text-left transition flex items-center gap-2.5 cursor-pointer"
                    >
                      <div className="p-2 rounded-xl bg-blue-100 text-blue-800">
                        <Briefcase className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900">Masuk Beli Barang</div>
                        <div className="text-[10px] text-slate-500">Selepas urusan luar tapak</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenAttendance({ entryType: 'Daftar Masuk Luar Kawasan (Outstation)', isOutstation: true })}
                      className="p-3 rounded-2xl bg-slate-50 border border-slate-200 hover:border-[#5b7e22] text-left transition flex items-center gap-2.5 cursor-pointer"
                    >
                      <div className="p-2 rounded-xl bg-purple-100 text-purple-800">
                        <Car className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900">Masuk Outstation</div>
                        <div className="text-[10px] text-slate-500">Tugasan luar kawasan</div>
                      </div>
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => handleOpenAttendance({ exitType: 'Balik / Tamat Waktu Bekerja', isOutstation: false })}
                      className="p-3 rounded-2xl bg-slate-50 border border-slate-200 hover:border-[#5b7e22] text-left transition flex items-center gap-2.5 cursor-pointer"
                    >
                      <div className="p-2 rounded-xl bg-[#edf3e2] text-[#5b7e22]">
                        <Home className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900">Balik Tamat Kerja</div>
                        <div className="text-[10px] text-slate-500">Selesai hari bekerja</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenAttendance({ exitType: 'Keluar Rehat / Makan Tengah Hari', isOutstation: false })}
                      className="p-3 rounded-2xl bg-slate-50 border border-slate-200 hover:border-[#5b7e22] text-left transition flex items-center gap-2.5 cursor-pointer"
                    >
                      <div className="p-2 rounded-xl bg-amber-100 text-amber-800">
                        <Coffee className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900">Keluar Rehat</div>
                        <div className="text-[10px] text-slate-500">12:45 PM – 1:45 PM</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenAttendance({ exitType: 'Keluar Kilang (Urusan Kerja / Pembelian Barang)', isOutstation: false })}
                      className="p-3 rounded-2xl bg-slate-50 border border-slate-200 hover:border-[#5b7e22] text-left transition flex items-center gap-2.5 cursor-pointer"
                    >
                      <div className="p-2 rounded-xl bg-blue-100 text-blue-800">
                        <Briefcase className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900">Keluar Beli Barang</div>
                        <div className="text-[10px] text-slate-500">Urusan alat ganti / kilang</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenAttendance({ exitType: 'Daftar Keluar Luar Kawasan (Outstation)', isOutstation: true })}
                      className="p-3 rounded-2xl bg-slate-50 border border-slate-200 hover:border-[#5b7e22] text-left transition flex items-center gap-2.5 cursor-pointer"
                    >
                      <div className="p-2 rounded-xl bg-purple-100 text-purple-800">
                        <Car className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900">Keluar Outstation</div>
                        <div className="text-[10px] text-slate-500">Tugasan luar tapak</div>
                      </div>
                    </button>
                  </>
                )}
              </div>

              {/* Satellite Geofence Map */}
              <div className="pt-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-800 mb-2">
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-[#5b7e22]" />
                    <span>Peta Geofens: {assignedOffice?.name}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setPermissionPromptOpen(true)}
                    className="text-[10px] font-bold text-[#5b7e22] hover:underline"
                  >
                    Semak GPS Tepat
                  </button>
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
            </div>
          )}
        </div>

        {/* FOOTER NOTICE / STATUS INFO */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
          <span>Halagel (M) Sdn Bhd • Sistem Kehadiran Bersepadu</span>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveScreen('HISTORY')}
              className="text-[#4d6b1d] hover:text-[#395015] font-semibold underline cursor-pointer"
            >
              Sejarah Kehadiran
            </button>
            <span>•</span>
            <button
              onClick={() => setActiveScreen('ENROL')}
              className="text-[#4d6b1d] hover:text-[#395015] font-semibold underline cursor-pointer"
            >
              Daftar Wajah
            </button>
          </div>
        </div>
      </main>

      {/* MODAL 1: JADUAL KERJA */}
      {showScheduleModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl text-slate-900 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
              <div className="flex items-center gap-2 text-slate-900 font-extrabold text-base">
                <Clock className="w-5 h-5 text-[#5b7e22]" />
                <span>Dasar Waktu Bekerja Rasmi</span>
              </div>
              <button
                onClick={() => setShowScheduleModal(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs text-slate-700">
              <div className="p-3 rounded-2xl bg-[#edf3e2] border border-[#d5e4be]">
                <div className="font-bold text-[#4d6b1d]">Waktu Bekerja Penuh (Full-Day)</div>
                <ul className="list-disc list-inside mt-1 space-y-0.5 text-slate-800">
                  <li><strong>Ahad – Rabu:</strong> 8:30 AM – 6:00 PM</li>
                  <li><strong>Khamis:</strong> 8:00 AM – 6:00 PM (masuk hingga 8:30 AM tidak lambat)</li>
                  <li><strong>Waktu Rehat Rasmi:</strong> 12:45 PM – 1:45 PM (60 minit)</li>
                  <li><strong>Syarat Minimum:</strong> 8.0 jam bekerja sehari</li>
                </ul>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                <div className="font-bold text-slate-900">Separuh Hari (Half-Day)</div>
                <ul className="list-disc list-inside mt-1 space-y-0.5 text-slate-700">
                  <li><strong>Sesi Pagi:</strong> 8:00 AM – 1:15 PM (5 jam 15 minit)</li>
                  <li><strong>Sesi Petang:</strong> 1:15 PM – 6:00 PM (4 jam 45 minit)</li>
                </ul>
              </div>

              <div className="text-[11px] text-slate-500">
                Hari bekerja rasmi adalah <strong>Ahad hingga Khamis</strong>. Cuti mingguan adalah pada hari Jumaat dan Sabtu.
              </div>
            </div>

            <div className="mt-5">
              <button
                type="button"
                onClick={() => setShowScheduleModal(false)}
                className="w-full py-2.5 rounded-xl bg-[#5b7e22] text-white font-bold text-xs hover:bg-[#4d6b1d]"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: PERMOHONAN CUTI */}
      {showLeaveModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl text-slate-900 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
              <div className="flex items-center gap-2 text-slate-900 font-extrabold text-base">
                <Calendar className="w-5 h-5 text-[#5b7e22]" />
                <span>Permohonan Cuti</span>
              </div>
              <button
                onClick={() => setShowLeaveModal(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-700">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                  <div className="text-xl font-black text-slate-900">14</div>
                  <div className="text-[10px] text-slate-500">Cuti Tahunan</div>
                </div>
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                  <div className="text-xl font-black text-slate-900">14</div>
                  <div className="text-[10px] text-slate-500">Cuti Sakit</div>
                </div>
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                  <div className="text-xl font-black text-slate-900">0</div>
                  <div className="text-[10px] text-slate-500">Cuti Diambil</div>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-blue-50 border border-blue-200 text-blue-900">
                <div className="font-bold">Makluman Pentadbiran HR</div>
                <p className="text-[11px] mt-0.5 text-blue-800">
                  Untuk memohon cuti rasmi, sila hubungi bahagian Sumber Manusia (HR) atau isi borang cuti rasmi syarikat. Rekod kelulusan cuti akan dikemas kini secara automatik.
                </p>
              </div>
            </div>

            <div className="mt-5">
              <button
                type="button"
                onClick={() => setShowLeaveModal(false)}
                className="w-full py-2.5 rounded-xl bg-[#5b7e22] text-white font-bold text-xs hover:bg-[#4d6b1d]"
              >
                Faham & Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: LAPORAN */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl text-slate-900 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
              <div className="flex items-center gap-2 text-slate-900 font-extrabold text-base">
                <BarChart3 className="w-5 h-5 text-[#5b7e22]" />
                <span>Laporan Kehadiran</span>
              </div>
              <button
                onClick={() => setShowReportModal(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-700">
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Jumlah Jam Hari Ini:</span>
                  <span className="font-bold text-slate-900">{totalWorkedHoursToday.toFixed(2)} jam</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Sesi Direkodkan Hari Ini:</span>
                  <span className="font-bold text-slate-900">{todayRecords.length} sesi</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Status Wajah Biometrik:</span>
                  <span className="font-bold text-emerald-700">
                    {user?.faceEnrolled ? '✓ Didaftarkan' : 'Perlu Pendaftaran'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Pangkalan Data Google Sheets:</span>
                  <span className="font-bold text-slate-900">
                    {googleSheetsDb.getSavedSpreadsheetId() ? '✓ Bersambung' : 'Lalai'}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowReportModal(false);
                  setActiveScreen('HISTORY');
                }}
                className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold flex items-center justify-center gap-1.5 transition"
              >
                <History className="w-4 h-4 text-[#5b7e22]" />
                <span>Buka Rekod Sejarah Penuh</span>
              </button>
            </div>

            <div className="mt-4">
              <button
                type="button"
                onClick={() => setShowReportModal(false)}
                className="w-full py-2.5 rounded-xl bg-[#5b7e22] text-white font-bold text-xs hover:bg-[#4d6b1d]"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LOCATION PERMISSION PROMPT MODAL */}
      <LocationPermissionPrompt
        isOpen={permissionPromptOpen}
        onClose={() => setPermissionPromptOpen(false)}
        onLocationObtained={(pos) => setUserCustomLocation(pos)}
        officeName={assignedOffice?.name}
        radiusMeters={assignedOffice?.radiusMeters}
      />

      {/* ATTENDANCE CAMERA FACE SCAN & GEOFENCE MODAL FLOW */}
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
